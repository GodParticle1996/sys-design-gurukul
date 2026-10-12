/* ex4 — tenant runtime: SANDBOX=heavy (har tenant ka apna bada sandbox) vs light (ek process, chhote isolates) */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4230);
const SANDBOX = process.env.SANDBOX || 'light';
const HEAVY_MB = +(process.env.HEAVY_MB || 2);       /* har heavy sandbox kitni memory leta hai */
const LIGHT_KB = +(process.env.LIGHT_KB || 120);     /* light isolate ka kharcha */

const tenants = new Map();
let coldStarts = [];

function load(id) {
  const t0 = process.hrtime.bigint();
  const size = SANDBOX === 'heavy' ? HEAVY_MB * 1024 * 1024 : LIGHT_KB * 1024;
  const buf = Buffer.alloc(size, 1);                 /* sandbox ki memory */
  if (SANDBOX === 'heavy') { const end = Date.now() + 8; while (Date.now() < end); }   /* bhaari start */
  tenants.set(id, buf);
  coldStarts.push(Number(process.hrtime.bigint() - t0) / 1e6);
}

serve(PORT, {
  'GET /run/:tenant': (req, res, url, p) => {
    if (!tenants.has(p.tenant)) load(p.tenant);
    return { ok: true, tenant: p.tenant, sandbox: SANDBOX };
  },
  'GET /stats': () => {
    const a = coldStarts.slice().sort((x, y) => x - y);
    const p50 = a.length ? +a[Math.floor(a.length / 2)].toFixed(1) : 0;
    return { sandbox: SANDBOX, tenants: tenants.size, rssMB: Math.round(process.memoryUsage().rss / 1e6), coldStartP50: p50 };
  },
  'POST /reset': () => { tenants.clear(); coldStarts = []; if (global.gc) global.gc(); return { ok: true }; },
}, () => console.log(`  runtime         → http://localhost:${PORT}  (SANDBOX=${SANDBOX})`));
