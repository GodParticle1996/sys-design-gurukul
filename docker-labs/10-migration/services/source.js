/* "Oracle" — purana DB. Har write ek append-only LOG mein bhi jaata hai (redo log / WAL jaisa). */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 5001);
const SEED = +(process.env.SEED || 50000);
const rows = new Map();
const log = [];                                          /* { lsn, id, balance, ver } */
for (let i = 0; i < SEED; i++) rows.set(i, { id: i, balance: 1000, ver: 1 });
serve(PORT, {
  'POST /write': (req, res, url, p, b) => {
    const r = rows.get(b.id) || { id: b.id, balance: 0, ver: 0 };
    r.balance += b.delta; r.ver++;
    rows.set(b.id, r);
    log.push({ lsn: log.length + 1, id: r.id, balance: r.balance, ver: r.ver, delta: b.delta });   /* state bhi, delta bhi */
    return { ok: true, lsn: log.length };
  },
  'GET /lsn': () => ({ lsn: log.length }),
  'GET /log/:from': (req, res, url, p) => ({ entries: log.slice(+p.from, +p.from + 2000), head: log.length }),
  'GET /snapshot/:from/:to': (req, res, url, p) => {
    const out = [];
    for (let i = +p.from; i < +p.to; i++) { const r = rows.get(i); if (r) out.push({ ...r }); }
    return { rows: out };
  },
  'GET /count': () => ({ rows: rows.size, lsn: log.length }),
  'GET /all': () => ({ rows: [...rows.values()] }),
  'GET /balance/:id': (req, res, url, p) => { const r = rows.get(+p.id); return { id: +p.id, balance: r ? r.balance : null, from: 'source' }; },
}, () => console.log(`  source → http://localhost:${PORT}  (${SEED.toLocaleString('en-IN')} rows · append-only log)`));
