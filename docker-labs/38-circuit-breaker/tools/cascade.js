/* ex1 · B ka /recs t=2s se t=8s tak LATAK jaata hai (har call 5 s). A ke paas 20 workers ka pool.
   50 req/s /home (B chahiye) + 50 req/s /profile (B se koi lena-dena nahi), 12 second.
   Teen tareeke: koi bachav nahi · sirf timeout (300 ms) · timeout + circuit breaker.
   node tools/cascade.js [--protect none|timeout|breaker] */
const { get, post, sleep, pct, host } = require('../lib/util');
const args = require('./args')();
const A = `http://${host('a')}:5171`, B = `http://${host('b')}:5172`;
const SECS = 12, RPS = 50, SLOW_FROM = 2000, SLOW_TO = 8000;
const NAMES = { none: 'koi bachav nahi', timeout: 'sirf timeout (300 ms)', breaker: 'timeout + circuit breaker' };

async function timed(url) {
  const t = Date.now();
  try { const r = await fetch(url); const body = await r.json().catch(() => null); return { ok: r.ok, ms: Date.now() - t, body, at: t }; }
  catch (e) { return { ok: false, ms: Date.now() - t, at: t }; }
}

async function run(protect) {
  await post(B + '/reset'); await post(A + '/reset');
  await post(A + '/config', { protect, pool: 20, perEndpoint: true, count4xx: false, halfOpen: 'trials' });
  const t0 = Date.now(), jobs = [];
  let bAtSlow = 0, bAtFix = 0;
  setTimeout(async () => { bAtSlow = (await get(B + '/stats')).recsCalls; await post(B + '/config', { recs: 'slow' }); }, SLOW_FROM);
  setTimeout(async () => { await post(B + '/config', { recs: 'ok' }); bAtFix = (await get(B + '/stats')).recsCalls; }, SLOW_TO);
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    jobs.push(timed(A + '/home').then(r => Object.assign(r, { ep: 'home' })));
    jobs.push(timed(A + '/profile').then(r => Object.assign(r, { ep: 'profile' })));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RPS) - Date.now()));
  }
  const all = await Promise.all(jobs);
  const prof = all.filter(r => r.ep === 'profile'), home = all.filter(r => r.ep === 'home');
  const src = s => home.filter(r => r.body && r.body.source === s).length;
  const liveBack = home.filter(r => r.at >= t0 + SLOW_TO && r.body && r.body.source === 'live').map(r => r.at - t0 - SLOW_TO).sort((x, y) => x - y)[0];
  const a = await get(A + '/stats'), b = await get(B + '/stats');
  return {
    profP50: pct(prof.filter(r => r.ok).map(r => r.ms), 50), profP99: pct(prof.filter(r => r.ok).map(r => r.ms), 99),
    profErr: prof.filter(r => !r.ok).length, profN: prof.length,
    live: src('live'), cache: src('cache'), def: src('default'), homeErr: home.filter(r => !r.ok).length,
    toB: bAtFix - bAtSlow, bFell: b.crashes, back: liveBack, maxQueue: a.maxQueue,
  };
}

(async () => {
  const modes = args.protect ? [args.protect] : ['none', 'timeout', 'breaker'];
  console.log(`A: 20 workers · ${RPS}/s /home + ${RPS}/s /profile · ${SECS} s · B /recs latka: t=${SLOW_FROM / 1000}s se t=${SLOW_TO / 1000}s (har call 5 s)\n`);
  console.log('tareeka                     /profile p50   /profile p99   /profile error   /home: live / cache / error   latke B ko calls   B bojh se gira   B theek → live wapas     A ki line (max)');
  for (const m of modes) {
    const r = await run(m);
    console.log(`${NAMES[m].padEnd(26)} ${String(r.profP50 + ' ms').padStart(10)}   ${String(r.profP99 + ' ms').padStart(10)}   ${String(r.profErr).padStart(8)}/${r.profN}     ${String(r.live).padStart(5)} / ${String(r.cache).padStart(4)} / ${String(r.homeErr).padEnd(5)}   ${String(r.toB).padStart(12)}       ${String(r.bFell).padStart(8)}      ${String(r.back == null ? 'run khatam tak nahi' : r.back + ' ms').padStart(19)}           ${r.maxQueue}`);
    await sleep(500);
  }
})();
