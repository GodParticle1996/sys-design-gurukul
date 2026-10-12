/* Shared cache (Redis jaisa): get/set with TTL, del, aur ek invalidation channel (pub/sub ki nakal: events ki list + since). */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5112;
const kv = new Map(); const events = [];
serve(PORT, {
  'GET /get/:k': (req, res, url, p) => { const e = kv.get(p.k); if (!e) return { hit: false }; const age = Date.now() - e.at; return { hit: true, v: e.v, expired: e.ttl && age > e.ttl, ageMs: age, ttl: e.ttl }; },
  'POST /set': (req, res, url, p, b) => { kv.set(b.k, { v: b.v, at: Date.now(), ttl: b.ttlMs || 0 }); return { ok: true }; },
  'POST /del': (req, res, url, p, b) => { kv.delete(b.k); return { ok: true }; },
  'POST /publish': (req, res, url, p, b) => { events.push({ seq: events.length + 1, k: b.k }); return { ok: true }; },
  'GET /events': (req, res, url) => ({ events: events.filter(e => e.seq > +(url.searchParams.get('since') || 0)) }),
  'POST /flush': () => { kv.clear(); return { ok: true }; },
}, () => console.log(`[cache] :${PORT}`));
