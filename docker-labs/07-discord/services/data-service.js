/* ex2 — data service instance. COALESCE=1: ek hi channel ki chal rahi query ko share karo */
const { serve, get } = require('../lib/util');
const PORT = +(process.env.PORT || 4711);
const COALESCE = process.env.COALESCE === '1';
const PART = 'http://localhost:' + (process.env.PART_PORT || 4714);
const inflight = new Map();
let served = 0, merged = 0;
serve(PORT, {
  'GET /channel/:id': async (req, res, url, p) => {
    served++;
    if (COALESCE && inflight.has(p.id)) { merged++; return await inflight.get(p.id); }
    const pr = get(PART + '/read/' + p.id).finally(() => inflight.delete(p.id));
    if (COALESCE) inflight.set(p.id, pr);
    return await pr;
  },
  'GET /stats': () => ({ served, merged }),
  'POST /reset': () => { served = 0; merged = 0; return { ok: true }; },
}, () => console.log(`  data-service   → http://localhost:${PORT}  (COALESCE=${COALESCE ? 1 : 0})`));
