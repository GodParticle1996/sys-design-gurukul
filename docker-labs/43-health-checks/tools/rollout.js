/* ex4 · Rolling restart (naya version deploy) — 3 pods, maxSurge 1, maxUnavailable 0. 100 req/s /home.
   Purane pod ko SIGTERM milta hai, par Service / load balancer ko khabar ~1 s der se pahunchti hai.
     turant  — app SIGTERM par turant exit (GRACEFUL=0)
     graceful— SIGTERM par readiness 503, 2 s tak jo aaye serve karo, phir exit (GRACEFUL=1)
   node tools/rollout.js [--app turant|graceful] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const C = `http://${host('cluster')}:5221`;
const RATE = 100;
const probes = { liveness: { path: '/livez', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 3, initialDelaySeconds: 3 },
                 readiness: { path: '/readyz', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 1 } };

async function run(graceful) {
  await post(C + '/reset');
  await post(C + '/deploy', { replicas: 3, env: { STARTUP_MS: '1000', LIVE: 'shallow', READY: 'shallow', GRACEFUL: graceful ? '1' : '0' }, probes });
  for (let i = 0; i < 100 && (await get(C + '/stats')).ready < 3; i++) await sleep(100);
  let stop = false, sent = 0, failed = 0;
  const load = (async () => {
    const jobs = [];
    const t0 = Date.now();
    for (let i = 0; !stop; i++) {
      sent++; jobs.push(fetch(C + '/svc/home').then(r => { if (!r.ok) failed++; }).catch(() => { failed++; }));
      await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
    }
    await Promise.all(jobs);
  })();
  await sleep(1000);
  const r = await post(C + '/rollout');
  await sleep(3000);                                                      // aakhri purane pod ko poora jaane do
  stop = true; await load;
  return { sent, failed, ms: r.ms };
}

(async () => {
  const modes = args.app ? [args.app] : ['turant', 'graceful'];
  console.log(`3 pods · rolling restart (maxSurge 1) · ${RATE} req/s /home · Service ko khabar ~1 s der se\n`);
  console.log('SIGTERM par app kya karta hai                 requests   fail   rollout mein laga');
  const names = { turant: 'turant exit', graceful: 'readiness 503 + 2 s drain, phir exit' };
  for (const m of modes) {
    const r = await run(m === 'graceful');
    console.log(`${names[m].padEnd(44)} ${String(r.sent).padStart(7)}   ${String(r.failed).padStart(4)}     ${(r.ms / 1000).toFixed(1)} s`);
  }
})();
