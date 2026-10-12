/* ex1 · 5 ek jaise backends (4 workers har ek), requests ka size heavy-tail (90% 10 ms, 10% 200 ms). 300 req/s, 8 s.
   Chhe algorithms. Phir wahi, par backend 5 teen guna dheema (kharab disk / noisy neighbour VM).
   node tools/algos.js [--scenario same|slow] */
const { get, post, pct, sleep, host } = require('../lib/util');
const args = require('./args')();
const LB = `http://${host('lb')}:5201`;
const BACKENDS = [5202, 5203, 5204, 5205, 5206].map((p, i) => `http://${host('backend' + (i + 1))}:${p}`);
const RATE = 300, SECS = 8;
const ALGOS = [['rr', 'round robin'], ['random', 'random'], ['leastconn', 'least connections (LB ki apni ginti)'],
  ['resource', 'resource-based (heartbeat 500 ms)'], ['p2c', 'power of two choices (wahi 500 ms)'], ['p2c-live', 'power of two choices (LB ki apni ginti)']];

async function run(algo, slow) {
  for (const b of BACKENDS) await post(b + '/reset');
  if (slow) await post(BACKENDS[4] + '/config', { slow: 3 });
  await post(LB + '/config', { algo });
  await sleep(600);                                                           // heartbeat ek baar aa jaaye
  const t0 = Date.now(), jobs = [];
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    const at = Date.now();
    jobs.push(fetch(LB + '/work').then(r => ({ ok: r.ok, ms: Date.now() - at })).catch(() => ({ ok: false, ms: Date.now() - at })));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
  }
  const rs = await Promise.all(jobs), ms = rs.filter(r => r.ok).map(r => r.ms);
  const st = await Promise.all(BACKENDS.map(b => get(b + '/stats')));
  const lb = await get(LB + '/stats');
  return { p50: pct(ms, 50), p99: pct(ms, 99), maxQ: Math.max(...st.map(s => s.maxQueue)), sent: lb.sent };
}

(async () => {
  const scen = args.scenario ? [args.scenario] : ['same', 'slow'];
  for (const sc of scen) {
    console.log(sc === 'same' ? `\n=== 5 ek jaise backends · ${RATE} req/s · ${SECS} s ===` : `\n=== backend 5 teen guna dheema · ${RATE} req/s · ${SECS} s ===`);
    console.log('algorithm                                p50       p99      sabse lambi line   requests har backend (1…5)');
    for (const [a, name] of ALGOS) {
      const r = await run(a, sc === 'slow');
      console.log(`${name.padEnd(40)} ${String(r.p50 + ' ms').padStart(7)}  ${String(r.p99 + ' ms').padStart(8)}      ${String(r.maxQ).padStart(5)}           ${r.sent.join(' / ')}`);
      await sleep(300);
    }
  }
})();
