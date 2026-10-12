/* ex3 — cache stampede: LOCK=1 se single-flight, STALE=1 se purani copy turant */
const { serve, sleep, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4103);
const LOCK = process.env.LOCK === '1';
const STALE = process.env.STALE === '1';
const REBUILD_MS = +(process.env.REBUILD_MS || 800);
const TTL_MS = +(process.env.TTL_MS || 100000);

let cache = null, cachedAt = 0;
let rebuilding = null;                                   /* single-flight promise */
let rebuilds = 0, staleServed = 0, waits = 0, dbBusyMs = 0;

async function rebuild() {
  rebuilds++;
  const t = Date.now();
  /* asli kaam: thoda CPU + thoda I/O jaisa intezaar */
  burn(8);
  await sleep(REBUILD_MS - 8);
  dbBusyMs += Date.now() - t;
  cache = { items: 25, builtAt: Date.now() };
  cachedAt = Date.now();
  return cache;
}

async function getListing() {
  const fresh = cache && (Date.now() - cachedAt) < TTL_MS;
  if (fresh) return { from: 'cache', ...cache };

  if (!LOCK) return { from: 'rebuild', ...(await rebuild()) };      /* har request khud rebuild karegi */

  if (rebuilding) {                                                  /* koi aur pehle se bana raha hai */
    if (STALE && cache) { staleServed++; return { from: 'stale', ...cache }; }
    waits++;
    return { from: 'waited', ...(await rebuilding) };
  }
  rebuilding = rebuild().finally(() => { rebuilding = null; });
  return { from: 'rebuild', ...(await rebuilding) };
}

serve(PORT, {
  'GET /listing': async () => await getListing(),
  'POST /expire': () => { cachedAt = 0; return { ok: true }; },
  'POST /seed': async () => { await rebuild(); rebuilds = 0; dbBusyMs = 0; return { ok: true }; },
  'GET /stats': () => ({ lock: LOCK, stale: STALE, rebuilds, staleServed, waits, dbBusyMs }),
}, () => console.log(`  listing-service → http://localhost:${PORT}  (LOCK=${LOCK ? 1 : 0} STALE=${STALE ? 1 : 0} · rebuild ${REBUILD_MS} ms)`));
