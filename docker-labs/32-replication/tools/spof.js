/* Request chain: LB → app → DB. 8 sec tak 100 requests/sec. t=2 sec par ek cheez maaro.
   node tools/spof.js          (Docker compose ke saath: DOCKER=1 node tools/spof.js) */
const http = require('http');
const { post, sleep, host } = require('../lib/util');
const PORTS = { lb: 5101, app1: 5102, app2: 5103, db1: 5104, db2: 5105 };
const A = n => `${process.env.DOCKER ? n : host(n)}:${PORTS[n]}`;        // tiers ek dusre ko is naam se dhoondhenge
const url = n => `http://${host(n)}:${PORTS[n]}`;                        // tool khud tiers tak aise pahunchta hai
const one = () => new Promise(res => { const rq = http.get(`${url('lb')}/req`, { timeout: 1000 }, r => { r.resume(); r.on('end', () => res(r.statusCode === 200)); }); rq.on('timeout', () => rq.destroy()); rq.on('error', () => res(false)); });
async function scenario(name, cfg, kill) {
  for (const n of ['lb', 'app1', 'app2', 'db1', 'db2']) await post(url(n) + '/revive');
  for (const [n, c] of Object.entries(cfg)) await post(url(n) + '/config', c);
  await sleep(300);
  let ok = 0, fail = 0, firstFail = null, lastFail = null; const t0 = Date.now();
  const tick = setInterval(() => { one().then(good => { const t = Date.now() - t0; if (good) ok++; else { fail++; if (firstFail == null) firstFail = t; lastFail = t; } }); }, 10);
  await sleep(2000); await post(url(kill) + '/kill');
  await sleep(6000); clearInterval(tick); await sleep(1200);
  const down = firstFail == null ? '0 s' : ((lastFail - firstFail) / 1000).toFixed(1) + ' s';
  console.log(`${name.padEnd(44)} ${kill.padEnd(5)} maara → ${String(fail).padStart(4)} fail / ${ok + fail}  (${(100 * ok / (ok + fail)).toFixed(1)}% available)  errors ki khidki: ${down}`);
}
(async () => {
  const lb = n => ({ next: n.map(A), mode: n.length > 1 ? 'active-active' : 'single' });
  console.log('setup                                        kya mara   nateeja');
  await scenario('1 app, 1 DB (koi replica nahi)', { lb: lb(['app1']), app1: { next: [A('db1')], mode: 'single' } }, 'app1');
  await scenario('2 apps (active-active), 1 DB', { lb: lb(['app1', 'app2']), app1: { next: [A('db1')] }, app2: { next: [A('db1')] } }, 'app1');
  await scenario('2 apps, 1 DB — DB mara', { lb: lb(['app1', 'app2']), app1: { next: [A('db1')] }, app2: { next: [A('db1')] } }, 'db1');
  const ap = { next: [A('db1'), A('db2')], mode: 'active-passive' };
  await scenario('2 apps, DB active-passive (3 health checks)', { lb: lb(['app1', 'app2']), app1: ap, app2: ap }, 'db1');
  const aa = { next: [A('db1'), A('db2')], mode: 'active-active' };
  await scenario('2 apps, DB active-active (retry)', { lb: lb(['app1', 'app2']), app1: aa, app2: aa }, 'db1');
  await scenario('sab replicated — par LB sirf EK', { lb: lb(['app1', 'app2']), app1: aa, app2: aa }, 'lb');
  console.log('\nJo cheez sirf EK hai, wahi poora system hai. Replica tab kaam aata hai jab switch karne wala bhi hai (health check / retry).');
  console.log('Active-passive: takeover tak (3 × 500 ms) errors. Active-active: retry turant — par dono ko hamesha zinda aur sync rakhna padta hai.');
})();
