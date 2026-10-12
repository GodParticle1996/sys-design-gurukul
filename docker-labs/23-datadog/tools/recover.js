/* 13 ghante baad rules wapas — 2,000 nodes ek saath control plane se judne ki koshish karte hain (thundering herd).
   node tools/recover.js [--nodes 2000] */
const http = require('http');
const args = require('./args')();
const { get, post, sleep, host, pct } = require('../lib/util');
const H = host('control-plane'), N = +(args.nodes || 2000), agent = new http.Agent({ keepAlive: true, maxSockets: 2000 });
function reg(node) {
  return new Promise(resolve => {
    const body = JSON.stringify({ node }), t = Date.now();
    const rq = http.request({ host: H, port: 4994, path: '/register', method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': body.length } },
      r => { r.resume(); r.on('end', () => resolve({ ok: r.statusCode === 200, ms: Date.now() - t })); });
    rq.on('error', () => resolve({ ok: false, ms: Date.now() - t })); rq.end(body);
  });
}
async function node(i, mode) {
  if (mode === 'staged') await sleep(Math.floor(i / 200) * 300);                  // 200 ke waves, 300 ms ke faasle par
  let wait = 100;
  for (let t = 0; t < 60; t++) {
    const r = await reg('n' + i);
    if (r.ok) return { tries: t + 1, at: Date.now() };
    if (mode === 'herd') await sleep(50);                                          // turant phir se — sab ek saath
    else { await sleep(wait * (0.5 + Math.random())); wait = Math.min(wait * 2, 4000); }   // backoff + jitter
  }
  return { tries: 60, at: null };
}
(async () => {
  for (const mode of ['herd', 'backoff', 'staged']) {
    await post(`http://${H}:4994/reset`);
    const t0 = Date.now();
    const rs = await Promise.all(Array.from({ length: N }, (_, i) => node(i, mode)));
    const s = await get(`http://${H}:4994/stats`);
    const done = rs.filter(r => r.at).map(r => r.at - t0);
    console.log(`${mode.padEnd(9)} sab ${s.registered}/${N} nodes wapas aaye ${(Math.max(...done) / 1000).toFixed(1)} s mein  |  attempts ${s.attempts} (bekaar ki koshishein ${s.rejected}), p50 ${(pct(done, 50) / 1000).toFixed(1)} s, control plane ki line peak ${s.peakLine}`);
  }
  console.log('\nHerd: sab ek saath + turant retry. Har reject bhi control plane ka CPU khaata hai → recovery khud slow ho jaati hai.');
  console.log('Backoff + jitter, ya waves: utne hi nodes, par bekaar koshishein kam → fleet jaldi wapas.');
})();
