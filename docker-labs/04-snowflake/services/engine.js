/* ex1 — ek query engine jo "object storage" (in-memory files) se padhta hai.
   MODE=one   : saare workloads ek hi worker pool par (shared-nothing cluster jaisa)
   MODE=split : har workload ka apna pool (virtual warehouses jaisa) */
const { serve, sleep, burn, get } = require('../lib/util');
const PORT = +(process.env.PORT || 4401);
const MODE = process.env.MODE || 'one';
const POOL = +(process.env.POOL || 4);               /* har pool mein kitne workers */
const ROWS = +(process.env.ROWS || 5000000);

const STORAGE = 'http://localhost:' + (process.env.STORAGE_PORT || 4400);   /* data yahan hai, engine ke paas nahi */
const pools = {};
function poolFor(wl) {
  const key = MODE === 'one' ? 'shared' : wl;
  if (!pools[key]) pools[key] = { busy: 0, queued: 0, done: 0 };
  return pools[key];
}
async function run(wl, costMs) {
  const p = poolFor(wl);
  p.queued++;
  while (p.busy >= POOL) await sleep(2);
  p.queued--; p.busy++;
  try { burn(costMs * 0.2); await sleep(costMs * 0.8); p.done++; return { wl, costMs }; }
  finally { p.busy--; }
}

serve(PORT, {
  'GET /q/:workload': async (req, res, url, p) => {
    const cost = p.workload === 'etl' ? 120 : p.workload === 'ds' ? 60 : 12;
    const t = Date.now();
    await run(p.workload, cost);
    return { ok: true, workload: p.workload, ms: Date.now() - t };
  },
  'GET /stats': () => ({ mode: MODE, pool: POOL, pools }),
  'POST /admin/crash': (req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"bye":true}'); setTimeout(() => process.exit(137), 20); },
}, () => console.log(`  engine → http://localhost:${PORT}  (MODE=${MODE} · pool ${POOL} workers · ${ROWS.toLocaleString('en-IN')} rows storage mein)`));
