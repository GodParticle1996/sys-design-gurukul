/* ex2 · Probes ka bill. 5 pods. Har pod ka /readyz har second 4 jagah se: kubelet (readinessProbe), load balancer ka
   health check, service mesh (Istio), aur monitoring. Readiness teen tarah ki:
     deep    — har probe par DB mein SELECT 1
     cached  — pod har 2 s mein ek baar DB check karta hai, probe ko variable se jawab
     shallow — DB ko chhoota hi nahi
   10 second mein DB par probes ki wajah se kitni queries? (App ka asli traffic zero rakha hai.)
   node tools/probeload.js [--ready deep|cached|shallow] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const C = `http://${host('cluster')}:5221`, DB = `http://${host('db')}:5222`;
const PODS = 5, SECS = 10;

async function run(ready) {
  await post(DB + '/reset'); await post(C + '/reset');
  await post(C + '/deploy', { replicas: PODS, env: { STARTUP_MS: '500', LIVE: 'shallow', READY: ready },
    probes: { liveness: { path: '/livez', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 3, initialDelaySeconds: 2 },
              readiness: { path: '/readyz', periodSeconds: 1, timeoutSeconds: 1, failureThreshold: 1 } } });
  let st; for (let i = 0; i < 100; i++) { st = await get(C + '/stats'); if (st.ready === PODS) break; await sleep(100); }
  const ports = st.pods.map(p => p.port);
  const pingers = ['lb', 'mesh', 'monitoring'].map(() => setInterval(() => ports.forEach(pt => fetch(`http://localhost:${pt}/readyz`).catch(() => {})), 1000));
  const q0 = (await get(DB + '/stats')).queries;
  await sleep(SECS * 1000);
  const q1 = (await get(DB + '/stats')).queries;
  pingers.forEach(clearInterval);
  return (q1 - q0) / SECS;
}

(async () => {
  const modes = args.ready ? [args.ready] : ['deep', 'cached', 'shallow'];
  console.log(`${PODS} pods · har pod ka /readyz har second 4 baar (kubelet + LB + mesh + monitoring) · ${SECS} s · app traffic 0\n`);
  console.log('readiness                        DB queries/second (sirf probes se)   100 pods par (andaaza)');
  const names = { deep: 'deep — har probe par DB', cached: 'cached — har 2 s ek DB check', shallow: 'shallow — DB nahi' };
  for (const m of modes) {
    const qps = await run(m);
    console.log(`${names[m].padEnd(32)} ${qps.toFixed(1).padStart(10)}                            ${Math.round(qps / PODS * 100)}`);
    await sleep(300);
  }
})();
