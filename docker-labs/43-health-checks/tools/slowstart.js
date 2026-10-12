/* ex3 · Dheema boot (Spring Boot / thandi JVM jaisa). 1 pod, 25 s dekho. livenessProbe: period 2 s, failureThreshold 1.
     delay5      — initialDelaySeconds 5, boot 8 s
     delay10     — initialDelaySeconds 10 (andaaza), boot 8 s
     delay10-slow— initialDelaySeconds 10, par aaj boot 12 s (DB migration, thandi cache, bhari node)
     startup     — startupProbe (har 1 s, 30 baar tak) + liveness bina delay, boot 12 s
   node tools/slowstart.js [--setup delay5|delay10|delay10-slow|startup] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const C = `http://${host('cluster')}:5221`;
const SECS = 25;
const live = d => ({ path: '/livez', periodSeconds: 2, timeoutSeconds: 1, failureThreshold: 1, initialDelaySeconds: d });
const ready = { path: '/readyz', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 1 };
const SETUPS = {
  'delay5':       ['liveness delay 5 s, boot 8 s', '8000', { liveness: live(5), readiness: ready }],
  'delay10':      ['liveness delay 10 s, boot 8 s', '8000', { liveness: live(10), readiness: ready }],
  'delay10-slow': ['liveness delay 10 s, boot 12 s', '12000', { liveness: live(10), readiness: ready }],
  'startup':      ['startupProbe (1 s × 30), boot 12 s', '12000', { startup: { path: '/livez', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 30 }, liveness: live(0), readiness: ready }],
};

(async () => {
  const keys = args.setup ? [args.setup] : Object.keys(SETUPS);
  console.log(`1 pod · ${SECS} s dekha · liveness har 2 s, ek fail = restart · CrashLoopBackOff 0, 1, 2, 4 s (asli: 10, 20, 40 s …)\n`);
  console.log('setup                                  pehli baar READY   restarts   ' + SECS + ' s par haal');
  for (const k of keys) {
    const [name, boot, probes] = SETUPS[k];
    await post(C + '/reset');
    await post(C + '/deploy', { replicas: 1, env: { STARTUP_MS: boot, LIVE: 'shallow', READY: 'shallow' }, probes });
    const t0 = Date.now(); let firstReady = null, s;
    while (Date.now() - t0 < SECS * 1000) {
      s = await get(C + '/stats');
      if (firstReady == null && s.ready) firstReady = (Date.now() - t0) / 1000;
      await sleep(100);
    }
    const pod = s.pods[0] || {};
    const state = pod.ready ? 'Running, READY' : pod.state === 'CrashLoopBackOff' ? 'CrashLoopBackOff' : 'Running, NOT READY';
    console.log(`${name.padEnd(38)} ${String(firstReady == null ? 'kabhi nahi' : firstReady.toFixed(1) + ' s').padStart(10)}       ${String(s.restarts).padStart(4)}     ${state}`);
  }
})();
