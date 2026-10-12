/* EBS jaisa control-plane metadata DB. "Kaunsa volume, uske replicas kahan hain" — har query yahan.
   MODE=shared → poore region ke liye EK DB: 12 queries ek saath (slots), har query 10 ms, line max 120.
   MODE=cells  → 12 chhote DBs (Physalia jaisa), har ek 1 slot, line max 10. Har AZ ke volumes apne AZ ke 4 cells mein.
   Kul capacity DONO mein same (12 slots). Line bhari → turant 503. Line mein 500 ms se zyada → timeout 503.
   kind=remirror → "naye replica ke liye jagah do": har AZ mein sirf 30 nayi jagah/sec banti hai (network change ke baad
   capacity kam). Jagah nahi → {placed:false} — par DB query toh ho chuki (kaam hua, fayda nahi). */
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 4951, QUERY_MS = 10;
let MODE = process.env.MODE || 'shared';
function makeDb(slots, qmax) { return { slots, qmax, busy: 0, line: [] }; }
let dbs = [];
const space = { 0: 30, 1: 30, 2: 30 };
setInterval(() => { for (const k of [0, 1, 2]) space[k] = 30; }, 1000);
function setup() { dbs = MODE === 'shared' ? [makeDb(12, 120)] : Array.from({ length: 12 }, () => makeDb(1, 10)); }
setup();
const dbOf = (vol) => { if (MODE === 'shared') return dbs[0]; const az = vol % 3; return dbs[az * 4 + (Math.floor(vol / 3) % 4)]; };   // volume ka cell uske AZ mein
function acquire(db) {
  if (db.busy < db.slots) { db.busy++; return Promise.resolve(true); }
  if (db.line.length >= db.qmax) return Promise.resolve(false);
  return new Promise(resolve => {
    const w = { resolve, t: setTimeout(() => { db.line.splice(db.line.indexOf(w), 1); resolve(false); }, 500) };
    db.line.push(w);
  });
}
function release(db) { const w = db.line.shift(); if (w) { clearTimeout(w.t); w.resolve(true); } else db.busy--; }
serve(PORT, {
  'GET /q': async (req, res, url) => {
    const db = dbOf(+url.searchParams.get('vol'));
    if (!(await acquire(db))) { res.writeHead(503); return res.end('{"ok":false}'); }
    await sleep(QUERY_MS); release(db);
    if (url.searchParams.get('kind') === 'remirror') { const az = +url.searchParams.get('vol') % 3; if (space[az] > 0) { space[az]--; return { ok: true, placed: true }; } return { ok: true, placed: false }; }
    return { ok: true };
  },
  'POST /mode': (req, res, url, p, b) => { MODE = b.mode; setup(); return { MODE }; },
}, () => console.log(`[meta] :${PORT} MODE=${MODE}`));
