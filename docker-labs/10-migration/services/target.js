/* Naya DB (microservice ka). /apply = STATE (idempotent: purana version ignore) · /apply-delta = DELTA (idempotent nahi) */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 5002);
const rows = new Map();
let applied = 0, ignoredOld = 0;
serve(PORT, {
  'POST /apply': (req, res, url, p, b) => {
    for (const r of b.rows) {
      const cur = rows.get(r.id);
      if (cur && cur.ver >= r.ver) { ignoredOld++; continue; }
      rows.set(r.id, { id: r.id, balance: r.balance, ver: r.ver }); applied++;
    }
    return { ok: true };
  },
  'POST /apply-delta': (req, res, url, p, b) => {
    const cur = rows.get(b.id) || { id: b.id, balance: b.base != null ? b.base : 1000, ver: 0 };
    cur.balance += b.delta; cur.ver++; rows.set(b.id, cur); applied++;
    return { ok: true };
  },
  'GET /all': () => ({ rows: [...rows.values()] }),
  'GET /stats': () => ({ rows: rows.size, applied, ignoredOld }),
  'POST /reset': () => { rows.clear(); applied = 0; ignoredOld = 0; return { ok: true }; },
  'GET /balance/:id': (req, res, url, p) => { const r = rows.get(+p.id); return { id: +p.id, balance: r ? r.balance : null, from: 'target' }; },
}, () => console.log(`  target → http://localhost:${PORT}  (khaali)`));
