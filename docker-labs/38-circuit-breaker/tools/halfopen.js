/* ex3 · Breaker khulne (open) ke BAAD kya? B t=1s par 3 second ke liye band. Wapas aata hai toh THANDA:
   pehle 3 s mein ek saath sirf 5 → 50 requests jhel sakta hai, aur har request 200 → 20 ms. Zyada bojh → phir gir jaata hai.
   A par 200 req/s /home. Teen half-open niyam:
     naive     — open ka timer khatam → seedha CLOSED (poora 200 req/s ek saath)
     trials    — HALF-OPEN mein sirf 3 trial calls; teeno safal → closed (phir poora traffic)
     slowstart — trials + closed ke baad 3 s mein 10% → 100% traffic
   node tools/halfopen.js [--policy naive|trials|slowstart] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const A = `http://${host('a')}:5171`, B = `http://${host('b')}:5172`;
const SECS = 14, RPS = 200, DOWN_AT = 1000, DOWN_MS = 3000;
const NAMES = { naive: 'naive: timer → seedha closed', trials: 'half-open: 3 trial calls', slowstart: 'trials + slow start (3 s ramp)' };

async function run(policy) {
  await post(B + '/reset'); await post(A + '/reset');
  await post(A + '/config', { protect: 'breaker', perEndpoint: true, count4xx: false, halfOpen: policy, pool: 400 });
  const t0 = Date.now(), jobs = [];
  setTimeout(() => post(B + '/down', { ms: DOWN_MS }), DOWN_AT);
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    jobs.push(fetch(A + '/home').then(r => r.json()).catch(() => null));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RPS) - Date.now()));
  }
  const rs = await Promise.all(jobs);
  const b = await get(B + '/stats'), a = await get(A + '/stats');
  const stable = b.crashes ? (b.crashTimes[b.crashTimes.length - 1] + 6000) / 1000 : (DOWN_AT + DOWN_MS + 3000) / 1000;
  return { crashes: b.crashes, stable, live: rs.filter(r => r && r.source === 'live').length, cache: rs.filter(r => r && r.source === 'cache').length, n: rs.length, opens: a.opens };
}

(async () => {
  const pols = args.policy ? [args.policy] : ['naive', 'trials', 'slowstart'];
  console.log(`${RPS} req/s /home · ${SECS} s · B t=${DOWN_AT / 1000}s par ${DOWN_MS / 1000} s ke liye band, phir 3 s thanda\n`);
  console.log('half-open niyam                    B phir gira (bojh se)   B poora theek (s)   /home: live / cache   breaker khula (baar)');
  for (const p of pols) {
    const r = await run(p);
    console.log(`${NAMES[p].padEnd(33)} ${String(r.crashes).padStart(10)}              ${String(r.stable.toFixed(1)).padStart(6)}          ${String(r.live).padStart(5)} / ${String(r.cache).padEnd(5)}      ${String(r.opens).padStart(6)}`);
    await sleep(500);
  }
  console.log(`\nSirf ek (forced) outage ho toh B t=${(DOWN_AT + DOWN_MS + 3000) / 1000} s par poora theek (${DOWN_MS / 1000} s band + 3 s thanda).`);
})();
