/* ex1 — TENANCY=shared (ek table + tenant_id) vs perdb (har tenant ka apna store).
   Ek endpoint mein jaan-boojh kar tenant filter chhoda gaya hai. */
const { serve, sleep, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4301);
const TENANCY = process.env.TENANCY || 'shared';
const CAP = +(process.env.CAP || 0);                 /* per-tenant connection cap (0 = koi cap nahi) */
const POOL = +(process.env.POOL || 40);              /* host ke total "connections" */

const TENANTS = ['acme', 'globex', 'initech', 'monster'];
const shared = [];                                   /* { tenant, text } */
const perdb = {};
TENANTS.forEach(t => (perdb[t] = []));
TENANTS.forEach(t => {
  for (let i = 0; i < 300; i++) {
    const row = { tenant: t, text: (i % 6 === 0 ? 'salary review ' : 'ticket ') + t + '-' + i };
    shared.push(row); perdb[t].push(row);
  }
});

let inUse = 0; const perTenant = {};
async function withConn(tenant, fn) {
  while (inUse >= POOL || (CAP && (perTenant[tenant] || 0) >= CAP)) await sleep(2);
  inUse++; perTenant[tenant] = (perTenant[tenant] || 0) + 1;
  try { return await fn(); } finally { inUse--; perTenant[tenant]--; }
}

let maxConnsByTenant = {};
serve(PORT, {
  /* BUG: shared mode mein tenant filter lagana bhoola gaya hai */
  'GET /search': async (req, res, url) => {
    const tenant = url.searchParams.get('tenant') || 'acme';
    const q = url.searchParams.get('q') || '';
    return await withConn(tenant, async () => {
      maxConnsByTenant[tenant] = Math.max(maxConnsByTenant[tenant] || 0, perTenant[tenant]);
      burn(0.2);
      await sleep(5);            /* chhoti query: pool ko thodi der rokti hai */
      const rows = TENANCY === 'shared'
        ? shared.filter(r => r.text.includes(q))                       /* ← tenant filter missing */
        : (perdb[tenant] || []).filter(r => r.text.includes(q));       /* alag store = leak mumkin hi nahi */
      const leaked = rows.filter(r => r.tenant !== tenant).length;
      return { tenant, rows: rows.length, leaked };
    });
  },
  'GET /report': async (req, res, url) => {
    const tenant = url.searchParams.get('tenant') || 'acme';
    return await withConn(tenant, async () => {
      maxConnsByTenant[tenant] = Math.max(maxConnsByTenant[tenant] || 0, perTenant[tenant]);
      burn(0.4);                                                        /* bhaari report: I/O par ruki rehti hai */
      await sleep(60);
      return { tenant, ok: true };
    });
  },
  'GET /stats': () => ({ tenancy: TENANCY, cap: CAP, pool: POOL, maxConnsByTenant }),
  'POST /reset': () => { maxConnsByTenant = {}; return { ok: true }; },
}, () => console.log(`  api → http://localhost:${PORT}  (TENANCY=${TENANCY}${CAP ? ' CAP=' + CAP : ''} · pool ${POOL})`));
