/* App server: L1 (apni process ki memory) → shared cache → DB.
   config: ttlMs (cache TTL), l1Ms (L1 TTL), l1Pubsub (invalidation events sun ke L1 saaf karo),
           stampede: none | mutex | swr | xfetch   (hot key expire hone par kya karein) */
const { serve, get, post, host, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5113, NAME = process.env.NAME || 'app' + PORT;
const DB = `http://${host('db')}:5111`, C = `http://${host('cache')}:5112`;
let cfg = { ttlMs: 5000, l1Ms: 5000, l1Pubsub: false, stampede: 'none', useL1: true };
const l1 = new Map(), inflight = new Map(); let evSince = 0;
setInterval(async () => {                                            // pub/sub: shared cache ke invalidation events
  if (!cfg.l1Pubsub) return;
  try { const { events } = await get(C + '/events?since=' + evSince); for (const e of events) { evSince = e.seq; l1.delete(e.k); } } catch (e) {}
}, 50);
async function fromDb(k) { const r = await get(DB + '/get/' + k); await post(C + '/set', { k, v: r.v, ttlMs: cfg.ttlMs }); return r.v; }
async function load(k) {
  if (cfg.useL1) { const e = l1.get(k); if (e && Date.now() - e.at < cfg.l1Ms) return { v: e.v, from: 'L1' }; }
  const c = await get(C + '/get/' + k);
  let v, from;
  if (c.hit && !c.expired) {
    v = c.v; from = 'cache';
    if (cfg.stampede === 'xfetch') {                                   // probabilistic early refresh: expiry ke paas, kabhi-kabhi pehle hi refresh
      const left = c.ttl - c.ageMs;
      if (!inflight.has(k) && Math.random() < Math.exp(-left / 150)) inflight.set(k, fromDb(k).finally(() => inflight.delete(k)));   // ek hi early refresh
    }
  } else if (c.hit && c.expired && cfg.stampede === 'swr') {          // stale-while-revalidate: purana do, peeche ek refresh
    v = c.v; from = 'stale';
    if (!inflight.has(k)) { const p = fromDb(k).finally(() => inflight.delete(k)); inflight.set(k, p); }
  } else if (cfg.stampede === 'mutex' || cfg.stampede === 'swr' || cfg.stampede === 'xfetch') {   // single-flight: ek jaaye, baaki intezaar
    if (!inflight.has(k)) inflight.set(k, fromDb(k).finally(() => inflight.delete(k)));
    v = await inflight.get(k); from = 'db-shared';
  } else { v = await fromDb(k); from = 'db'; }
  if (cfg.useL1) l1.set(k, { v, at: Date.now() });
  return { v, from };
}
serve(PORT, {
  'GET /price/:k': async (req, res, url, p) => Object.assign({ app: NAME }, await load(p.k)),
  'POST /config': (req, res, url, p, b) => { Object.assign(cfg, b); l1.clear(); return cfg; },
}, () => console.log(`[${NAME}] :${PORT}`));
