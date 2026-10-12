/* Acche users + attack traffic ek saath. CPU aur acche users ka p99 dono naapte hain. */
const http = require('http');
const { get, sleep } = require('../lib/util');
const a = require('./args')();
const BAD = +(a.bad || 4000), GOOD = +(a.good || 200), SECONDS = +(a.for || 4);
const goodAgent = new http.Agent({ keepAlive: true, maxSockets: 64 });
/* attack traffic har baar nayi connection kholta hai — isi liye socket-level filter usse pakad paata hai */
const badAgent = new http.Agent({ keepAlive: false, maxSockets: 256 });
const PORT = +(process.env.PORT || 4220);   /* edge-filter ka port */
const APP_STATS = +(process.env.APP_STATS || 4321);

function hit(bad) {
  return new Promise(resolve => {
    const req = http.get({ host: 'localhost', port: PORT, path: '/api' + (bad ? '?bad=1' : ''), agent: bad ? badAgent : goodAgent }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve);
  });
}

(async () => {
  await fetch(`http://localhost:${APP_STATS}/reset`).catch(() => {});
  await fetch(`http://localhost:${PORT + 100}/reset`).catch(() => {});
  const cpu0 = process.cpuUsage();
  const t0 = Date.now();
  const inflight = [];
  const badPerTick = Math.max(1, Math.round(BAD / 200)), goodPerTick = Math.max(1, Math.round(GOOD / 200));
  for (let t = 0; t < SECONDS * 200; t++) {
    for (let i = 0; i < badPerTick; i++) inflight.push(hit(true));
    for (let i = 0; i < goodPerTick; i++) inflight.push(hit(false));
    await sleep(5);
  }
  await Promise.all(inflight);
  const elapsed = (Date.now() - t0) / 1000;
  const s = await get(`http://localhost:${APP_STATS}/stats`);
  let edge = { dropped: 0 };
  try { edge = await get(`http://localhost:${PORT + 100}/stats`); } catch (e) {}
  const blockedTotal = s.blocked + (edge.dropped || 0);
  console.log(`DROP=${String(s.drop).padEnd(10)} good served: ${s.good}   blocked: ${blockedTotal} (edge ${edge.dropped || 0} · app ${s.blocked})   ` +
    `app ne poora kaam kiya: ${s.work} requests   good p99: ${s.goodP99} ms   throughput: ${Math.round((s.good + blockedTotal) / elapsed)}/s`);
})();
