/* ex1 · 3 pods. DB t=6s se t=11s tak band (5 second ki "blip"). Traffic: 40/s /home (DB nahi chahiye) + 40/s /orders (DB chahiye).
   Paanch setup:
     deep-live  — livenessProbe DB check karta hai (ek hi "deep /healthz" dono kaam mein)
     deep-ready — liveness shallow, readinessProbe har baar DB check karta hai
     cached     — liveness shallow, readiness yaad se: pod har 2 s par ek baar DB check karta hai
     fail-open  — deep-ready jaisa, par Service "fail open" karta hai: koi ready pod nahi → saare pods ko bhejo
     shallow    — dono shallow; DB gaya toh app khud /orders par 503 deta hai, /home chalta rehta hai
   node tools/dbblip.js [--setup deep-live|deep-ready|cached|fail-open|shallow] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const C = `http://${host('cluster')}:5221`, DB = `http://${host('db')}:5222`;
const SECS = 22, RATE = 40, DOWN_FROM = 6000, DOWN_TO = 11000;
const probe = (path, extra) => Object.assign({ path, periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 3 }, extra || {});
const SETUPS = {
  'deep-live':  ['liveness DB check karta hai', { LIVE: 'deep', READY: 'deep' }],
  'deep-ready': ['sirf readiness DB check karta hai', { LIVE: 'shallow', READY: 'deep' }],
  'cached':     ['readiness yaad se (DB har 2 s)', { LIVE: 'shallow', READY: 'cached' }],
  'fail-open':  ['readiness DB check + LB fail-open', { LIVE: 'shallow', READY: 'deep' }, true],
  'shallow':    ['dono shallow, app khud degrade', { LIVE: 'shallow', READY: 'shallow' }],
};

async function run(env, failOpen) {
  await post(DB + '/reset'); await post(C + '/reset');
  await post(C + '/deploy', { replicas: 3, failOpen: !!failOpen, env: Object.assign({ STARTUP_MS: '6000' }, env),   // JVM / Spring Boot jaisa boot
    probes: { liveness: probe('/livez', { initialDelaySeconds: 8 }), readiness: probe('/readyz', { failureThreshold: 1 }) } });
  for (let i = 0; i < 200 && (await get(C + '/stats')).ready < 3; i++) await sleep(100);
  const t0 = Date.now(), jobs = [];
  setTimeout(() => post(DB + '/config', { down: true }), DOWN_FROM);
  setTimeout(() => post(DB + '/config', { down: false }), DOWN_TO);
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    const at = Date.now() - t0;
    for (const page of ['home', 'orders']) jobs.push(fetch(`${C}/svc/${page}`).then(r => ({ page, at, ok: r.ok })).catch(() => ({ page, at, ok: false })));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
  }
  const rs = await Promise.all(jobs), s = await get(C + '/stats');
  const pctOk = x => (100 * x.filter(r => r.ok).length / x.length).toFixed(1) + '%';
  const home = rs.filter(r => r.page === 'home'), orders = rs.filter(r => r.page === 'orders');
  const homeBlip = home.filter(r => r.at >= DOWN_FROM && r.at < DOWN_TO);
  const lastBad = orders.filter(r => !r.ok && r.at >= DOWN_TO).map(r => r.at).sort((a, b) => b - a)[0];
  return { home: pctOk(home), homeBlip: pctOk(homeBlip), orders: pctOk(orders), restarts: s.restarts, back: lastBad == null ? 0 : (lastBad - DOWN_TO) / 1000 };
}

(async () => {
  const keys = args.setup ? [args.setup] : Object.keys(SETUPS);
  console.log(`3 pods (boot 6 s) · ${RATE}/s /home + ${RATE}/s /orders · ${SECS} s · DB t=${DOWN_FROM / 1000}s–${DOWN_TO / 1000}s band\n`);
  console.log('probe setup                        /home safal   /home (DB band ke dauraan)   /orders safal   pod restarts   DB wapas → /orders theek');
  for (const k of keys) {
    const [name, env, failOpen] = SETUPS[k];
    const r = await run(env, failOpen);
    console.log(`${name.padEnd(34)} ${r.home.padStart(8)}         ${r.homeBlip.padStart(7)}                ${r.orders.padStart(7)}       ${String(r.restarts).padStart(4)}           ${r.back.toFixed(1)} s baad`);
    await sleep(500);
  }
})();
