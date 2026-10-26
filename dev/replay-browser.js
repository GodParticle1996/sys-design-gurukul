#!/usr/bin/env node
'use strict';
/* Run the static renderer fixtures in an actual isolated DOM with a virtual
   timer queue. Uses the same action runner as the Node regression suite. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..'), out = process.env.QA_OUT || '/tmp/sys-design-gurukul-browser-replays';
fs.mkdirSync(out, { recursive: true });
const npx = path.join(os.homedir(), '.npm/_npx');
const installed = fs.readdirSync(npx).map(d => path.join(npx, d, 'node_modules/playwright')).find(p => fs.existsSync(p));
if (!installed) throw Error('Existing Playwright required; nothing installed.');
const { chromium } = require(installed);
const cache = path.join(os.homedir(), '.cache/ms-playwright');
const executablePath = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
  .map(d => path.join(cache, d, 'chrome-linux64/chrome')).find(p => fs.existsSync(p));
const records = JSON.parse(fs.readFileSync(path.join(root, 'exercise-solutions.json'), 'utf8')).exercises;
function snapshot() {
  return Object.fromEntries(['index.html', 'exercise-solutions.json', ...fs.readdirSync(root).filter(f => f.endsWith('.js'))]
    .map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex')]));
}
let actions = fs.readFileSync(path.join(root, 'tools/replay-exercises.js'), 'utf8');
actions = actions.slice(actions.indexOf('const need ='), actions.indexOf('function main()'))
  .replace(/\.querySelectorAll\(/g, '.querySelectorAllArray(')
  .replace("node.dispatchEvent({ type: 'keydown', key, bubbles: true })", "node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))")
  .replace("slider.dispatchEvent({ type: 'input' })", "slider.dispatchEvent(new Event('input', { bubbles: true }))");
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const report = { modes: [], errors: [], sourceBefore: snapshot() };
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: theme, reducedMotion: 'reduce' });
      await context.route(/^https?:\/\//, r => r.abort());
      await context.addInitScript(() => {
        const pending = new Map(); let next = 1;
        window.setTimeout = f => { const id = next++; pending.set(id, f); return id; };
        window.clearTimeout = id => pending.delete(id);
        window.setInterval = () => 0; window.clearInterval = () => {};
        window.__timers = { clear() { pending.clear(); }, flush() {
          for (let rounds = 0; pending.size; rounds++) {
            if (rounds > 1000) throw Error('Timer loop');
            const batch = [...pending.values()]; pending.clear(); batch.forEach(f => f());
          }
        } };
      });
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(`${theme}: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error') report.errors.push(`${theme}: ${m.text()}`); });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.addScriptTag({ content: `(function () {
        const assert = (condition, message) => { if (!condition) throw Error(message || 'Assertion failed'); };
        assert.equal = (a, b, message) => assert(a === b, (message || 'Equality failed') + ': ' + a + ' / ' + b);
        Element.prototype.querySelectorAllArray = function (selector) { return Array.from(this.querySelectorAll(selector)); };
        ${actions}
        const terminal = SD.renderers.terminal;
        SD.renderers.terminal = function (...args) { const handle = terminal(...args); SD._testTerminal = handle; return handle; };
        SD.addXP = () => {}; SD.noteMistake = () => {};
        const env = { SD, document, levels: new Map(Object.values(SD.levelSets).flat().map(l => [l.id, l])), clearTimers: __timers.clear, flush: __timers.flush };
        window.__walkExercise = record => {
          let actions = 0;
          for (const negative of [false, true]) {
            const walk = render(env, record);
            record.solution.forEach((action, i) => {
              if (negative) wrongBefore(walk, action);
              perform(walk, action, negative); actions++;
              assert.equal(walk.count(), i === record.solution.length - 1 ? 1 : 0, 'Completion before final action');
            });
            if (!negative) assert.equal(walk.stats().firstTry, walk.stats().total, 'Perfect solution score');
          }
          cheats(env, record); return actions;
        };
      })();` });
      const result = await page.evaluate(records => {
        const failures = []; let pass = 0, actions = 0;
        for (const record of records) try { actions += __walkExercise(record); pass++; }
        catch (e) { failures.push({ level: record.level, stage: record.stage, type: record.type, error: e.message }); }
        return { pass, actions, failures };
      }, records);
      report.modes.push({ theme, ...result });
      console.log(`${theme}: ${result.pass}/${records.length} browser fixtures; ${result.failures.length} failures`);
      await context.close();
    }
    report.sourceAfter = snapshot();
    report.sourceChanged = Object.keys(report.sourceBefore).filter(f => report.sourceBefore[f] !== report.sourceAfter[f]);
    report.pass = !report.errors.length && !report.sourceChanged.length && report.modes.every(m => !m.failures.length);
    fs.writeFileSync(path.join(out, 'REPORT.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ pass: report.pass, errors: report.errors, failures: report.modes.flatMap(m => m.failures).slice(0, 20), out }));
    if (!report.pass) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
