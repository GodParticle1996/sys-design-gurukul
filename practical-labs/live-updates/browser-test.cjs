'use strict';
// Actual Chromium EventSource + the lab's HTTP server. No external network.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { EventStore } = require('./store.cjs');
const { createLab } = require('./server.cjs');
const npx = path.join(os.homedir(), '.npm/_npx');
const installed = fs.readdirSync(npx).map(d => path.join(npx, d, 'node_modules/playwright')).find(p => fs.existsSync(p));
if (!installed) throw Error('Use an existing Playwright installation; this test does not install packages.');
const { chromium } = require(installed);
const cache = path.join(os.homedir(), '.cache/ms-playwright');
const executablePath = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
  .map(d => path.join(cache, d, 'chrome-linux64/chrome')).find(p => fs.existsSync(p));

(async () => {
  const store = new EventStore();
  const lab = createLab(store), requests = [], errors = [];
  let browser;
  lab.server.prependListener('request', req => {
    if (req.url === '/events') requests.push(req.headers['last-event-id'] ?? null);
  });
  try {
    await new Promise((resolve, reject) => { lab.server.once('error', reject); lab.server.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${lab.server.address().port}`;
    browser = await chromium.launch({ headless:true, executablePath, args:['--disable-dev-shm-usage'] });
    const context = await browser.newContext();
    await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    const a = await context.newPage(), b = await context.newPage();
    for (const page of [a,b]) page.on('pageerror', e => errors.push(e.message));
    const wait = (page, text) => page.waitForFunction(text => document.getElementById('log').textContent.includes(text), text, {timeout:10000});
    const post = async route => {
      const response = await fetch(base + route, {method:'POST',headers:{'X-Lab':'1'},signal:AbortSignal.timeout(3000)});
      assert(response.ok); await response.text();
    };
    await a.goto(base); await b.goto(base);
    await wait(a,'snapshot: seq=0'); await wait(b,'snapshot: seq=0');
    await a.locator('#advance').click();
    await wait(a,'update: seq=1'); await wait(b,'update: seq=1');
    assert.deepEqual(requests,[null,null]);

    await post('/disconnect');
    // Disconnected clients cannot receive these writes live. The next native
    // EventSource reconnect must retrieve them from retained SQLite history.
    store.append('order-41','ready'); store.append('order-41','delivered');
    await wait(a,'update: seq=3'); await wait(b,'update: seq=3');
    for (const page of [a,b]) {
      const log = await page.locator('#log').textContent();
      assert(log.indexOf('update: seq=2') < log.indexOf('update: seq=3'));
      assert.equal((log.match(/snapshot:/g)||[]).length,1);
    }
    assert.deepEqual(requests.slice(2),['1','1'],'Native reconnect sends Last-Event-ID');

    await post('/disconnect');
    for (let i=0;i<4;i++) store.append('order-41','ready');
    await wait(a,'reset: seq=7'); await wait(b,'reset: seq=7');
    assert.deepEqual(requests.slice(4),['3','3']);
    assert.equal(await a.locator('#state').textContent(),'ready · sequence 7');
    assert(!(await a.locator('#log').textContent()).includes('update: seq=4'),'Expired history becomes a reset, not partial replay');

    await a.locator('#pause').click();
    store.append('order-41','delivered');
    const before = requests.length;
    await a.locator('#resume').click(); await wait(a,'snapshot: seq=8');
    assert.equal(requests.length,before+1);
    assert.equal(requests.at(-1),null,'A newly created EventSource does not inherit the closed instance cursor');
    assert.deepEqual(errors,[]);
    console.log('PASS: Chromium two-tab live delivery, native Last-Event-ID reconnect, ordered retained replay, expired-history reset and new-instance snapshot. No external services tested.');
  } finally {
    if (browser) await browser.close();
    lab.stop(); lab.server.closeAllConnections(); store.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
