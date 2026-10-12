/* Lock server (Redis `SET key owner NX PX ttl` jaisa) + har acquire par ek badhta number: FENCING TOKEN.
   POST /acquire {key, owner, ttlMs} → {ok, token}      POST /release {key, owner}
   POST /wait {key, style}  → long-poll: lock khaali hone par jagao.  style=all (sabko jagao) | queue (sirf line mein agla) */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5151;
const locks = new Map(); let token = 0, wakeups = 0; const waiters = new Map();
const held = k => { const l = locks.get(k); return l && l.until > Date.now() ? l : null; };
function freed(key) {
  const q = waiters.get(key) || [];
  if (!q.length) return;
  if (q[0].style === 'queue') { const w = q.shift(); wakeups++; w.res({ woke: true }); }
  else { waiters.set(key, []); q.forEach(w => { wakeups++; w.res({ woke: true }); }); }   // sab ek saath daudte hain
}
serve(PORT, {
  'POST /acquire': (req, res, url, p, b) => {
    if (held(b.key)) return { ok: false };
    locks.set(b.key, { owner: b.owner, until: Date.now() + b.ttlMs }); token++;
    const t = locks.get(b.key); setTimeout(() => { if (locks.get(b.key) === t) { locks.delete(b.key); freed(b.key); } }, b.ttlMs + 5);   // TTL khatam = khud chhoot gaya
    return { ok: true, token };
  },
  'POST /release': (req, res, url, p, b) => { const l = held(b.key); if (l && l.owner === b.owner) { locks.delete(b.key); freed(b.key); return { ok: true }; } return { ok: false }; },
  'POST /wait': (req, res, url, p, b) => new Promise(r => {
    if (!held(b.key)) { wakeups++; return r({ woke: true }); }         // beech mein hi chhoot gaya tha — turant jagao (lost wake-up nahi)
    if (!waiters.has(b.key)) waiters.set(b.key, []); waiters.get(b.key).push({ style: b.style, res: r });
  }),
  'GET /stats': () => ({ token, wakeups }),
  'POST /reset': () => { locks.clear(); wakeups = 0; waiters.clear(); return { ok: true }; },
}, () => console.log(`[lockd] :${PORT}`));
