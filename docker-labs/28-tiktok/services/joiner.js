/* Streaming join — training example = (video dikhate waqt ke features) + (user ne kya kiya).
   Features turant aate hain (impression). Action (poora dekha / like) baad mein — kabhi 1 sec, kabhi 20 sec baad.
   WINDOW_MS tak action ka intezaar: aaya → positive example. Nahi aaya → NEGATIVE ("dekha nahi"). Window ke baad aaya → LATE
   (label galat ja chuka — trainer ko negative bol diya tha, sach mein positive tha). */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5051;
let WINDOW = +(process.env.WINDOW_MS || 3000);
let pending = new Map(), decided = new Map(), stats;
const reset = () => { pending = new Map(); decided = new Map(); stats = { impressions: 0, positive: 0, negative: 0, late: 0, maxPending: 0 }; };
reset();
setInterval(() => {                                                   // window khatam → negative
  const now = Date.now();
  for (const [id, imp] of pending) if (now - imp.at > WINDOW) { pending.delete(id); decided.set(id, 'neg'); stats.negative++; }
}, 50);
serve(PORT, {
  'POST /impression': (req, res, url, p, b) => { stats.impressions++; pending.set(b.id, { at: Date.now(), features: b.features }); stats.maxPending = Math.max(stats.maxPending, pending.size); return { ok: true }; },
  'POST /action': (req, res, url, p, b) => {
    if (pending.has(b.id)) { pending.delete(b.id); decided.set(b.id, 'pos'); stats.positive++; return { joined: true }; }
    if (decided.get(b.id) === 'neg') { stats.late++; return { joined: false, late: true }; }
    return { joined: false };
  },
  'POST /config': (req, res, url, p, b) => { WINDOW = +b.windowMs; reset(); return { WINDOW }; },
  'GET /stats': () => ({ windowMs: WINDOW, pending: pending.size, ...stats }),
}, () => console.log(`[joiner] :${PORT} window=${WINDOW} ms`));
