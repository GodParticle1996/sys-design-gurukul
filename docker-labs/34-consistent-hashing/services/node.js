/* Ek cache node (Memcached jaisa) — sirf key → value. Batch APIs taaki 1 lakh keys jaldi chalein. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT;
const kv = new Map();
serve(PORT, {
  'POST /mset': (req, res, url, p, b) => { for (const [k, v] of b.pairs) kv.set(k, v); return { ok: true, size: kv.size }; },
  'POST /mget': (req, res, url, p, b) => { let hit = 0; for (const k of b.keys) if (kv.has(k)) hit++; return { hit, miss: b.keys.length - hit }; },
  'POST /flush': () => { kv.clear(); return { ok: true }; },
  'GET /stats': () => ({ port: PORT, keys: kv.size }),
}, () => console.log(`[cache-node] :${PORT}`));
