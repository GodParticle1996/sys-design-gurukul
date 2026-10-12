/* Botnet + asli users, ek sthir RATE par.
   MODE=single : sab traffic ek hi sheher par
   MODE=anycast: har client apne nazdeeki sheher par (routing ne baant diya) */
const http = require('http');
const { get, post, sleep } = require('../lib/util');
const a = require('./args')();
const RPS = +(a.rps || 6000), SECONDS = +(a.for || 3), USER_SHARE = +(a.users || 5);  /* users = % of traffic */
const MODE = process.env.MODE || 'single';
const CITIES = +(process.env.CITIES || 6);
const ports = Array.from({ length: CITIES }, (_, i) => 4201 + i);
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });

function hit(port, real) {
  return new Promise(resolve => {
    const req = http.get({ host: 'localhost', port, path: '/req' + (real ? '?real=1' : ''), agent }, res => {
      res.resume(); res.on('end', resolve);
    });
    req.on('error', resolve);
  });
}

(async () => {
  for (const p of ports) await post(`http://localhost:${p}/reset`, {});
  const pick = i => (MODE === 'anycast' ? ports[i % CITIES] : ports[0]);
  const perTick = Math.max(1, Math.round(RPS / 200));       /* har 5 ms mein itni requests */
  const ticks = SECONDS * 200;
  let i = 0;
  const inflight = [];
  const t0 = Date.now();
  for (let t = 0; t < ticks; t++) {
    for (let j = 0; j < perTick; j++, i++) inflight.push(hit(pick(i), i % 100 < USER_SHARE));
    await sleep(5);
  }
  await Promise.all(inflight);
  const elapsed = (Date.now() - t0) / 1000;
  const stats = [];
  for (const p of ports) stats.push(await get(`http://localhost:${p}/stats`));
  const tot = stats.reduce((x, s) => ({ served: x.served + s.served, dropped: x.dropped + s.dropped, realServed: x.realServed + s.realServed, realDropped: x.realDropped + s.realDropped }), { served: 0, dropped: 0, realServed: 0, realDropped: 0 });
  const per = stats.map(s => `${s.city}: ${Math.round((s.served + s.dropped) / elapsed)}/s`).join('  ');
  const realPct = Math.round((tot.realServed / Math.max(1, tot.realServed + tot.realDropped)) * 100);
  console.log(`MODE=${MODE.padEnd(8)} ${per}`);
  console.log(`MODE=${MODE.padEnd(8)} bheji gayi: ${i} requests in ${elapsed.toFixed(1)}s = ${Math.round(i / elapsed)}/s`);
  console.log(`MODE=${MODE.padEnd(8)} dropped: ${Math.round((tot.dropped / Math.max(1, tot.served + tot.dropped)) * 100)}%   asli users serve hue: ${realPct}%`);
})();
