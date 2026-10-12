/* Ek "region": app + orders ka DB. Do copies chalti hain — region A (primary) aur region B (DR).
   Copy karne ka niyam lib/replicator.js ka hai (A ke orders doosre region tak kaise pahunchte hain):
     async — order pehle rakho, "ho gaya" (201) turant; copy `everyMs` baad, jama orders ek saath
     sync  — PEHLE doosre region ka jawab, phir apne yahan rakho, phir "ho gaya"; copy fail → 503 aur A mein kuch nahi bacha
   Region B mein kya chal raha hai, woh STRATEGY tay karti hai (POST /config {strategy, mode?, everyMs?, rttMs?}):
     backup  — B mein kuch nahi chalta. A har SNAP_MS (3 s) par jama orders S3 (doosre region) mein daalta hai.
               Failover: infra banao (PROVISION_MS) + S3 se sab restore.
     pilot   — B ka DB chalta hai (A se async replication, REPL_MS ka lag), app band. Failover: app boot (BOOT_MS).
     warm    — B ka DB + ek chhota app chalta hai (25% capacity). Failover: turant serve, scale-up SCALE_MS mein.
     active  — B bhi poora chalta hai aur aadha traffic leta hai; dono taraf replication.
   Sirf ex2 ke liye: rttMs = nakli cross-region round trip (copy ke raaste mein sleep) · POST /blackout {ms} = B ka DB
   itni der "unreachable": B ke /replicate ko jawab hi nahi milta (A ka ship timeout par fail hota hai).
   POST /order  GET /orders  POST /replicate  POST /activate  POST /kill  POST /config  POST /blackout  GET /health  GET /stats */
const { serve, json, get, sleep } = require('../lib/util');
const { createReplicator } = require('../lib/replicator');
const PORT = +process.env.PORT || 5191, NAME = process.env.NAME || 'A';
const PEER = process.env.PEER_URL || 'http://localhost:5192', S3 = process.env.S3_URL || 'http://localhost:5193';
const SNAP_MS = 3000, REPL_MS = 300, PROVISION_MS = 15000, BOOT_MS = 5000, SCALE_MS = 3000, FULL_RPS = 100, SHIP_TIMEOUT_MS = 500;
let strategy = 'backup', alive = true, appUp = NAME === 'A', dbUp = NAME === 'A', capacity = 1;
let rep = null, mode = 'async', everyMs = REPL_MS, rttMs = 0, blackUntil = 0, maxWaiting = 0;
let served = 0, activatedAt = 0, window = { at: 0, n: 0 };

function capOk() {                                                        // capacity: FULL_RPS × capacity requests/second
  const now = Date.now();
  if (now - window.at >= 1000) window = { at: now, n: 0 };
  return ++window.n <= FULL_RPS * capacity;
}
/* lib/replicator.js ka `ship`: jama badlav doosre region tak. HTTP status bhi dekhta hai (503 = nahi pahuncha → throw).
   Model (slowmo-sync.js jaisa): copy tab "pahunchi" maani jaati hai jab doosre region ka jawab A tak aa jaye. rttMs = ek chakkar
   (jaana + aana); us beech A gaya toh copy bhi gayi — isliye "kho gaye orders" = A ki waiting list, ek-ek order. */
async function ship(batch) {
  if (rttMs) await sleep(rttMs);                                          // cross-region ek chakkar (nakli)
  if (!alive) throw new Error(`${NAME}: region gaya`);                    // mara hua region kuch nahi bhejta
  const url = strategy === 'backup' ? S3 + '/batch' : PEER + '/replicate';
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ changes: batch }), signal: AbortSignal.timeout(SHIP_TIMEOUT_MS) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
}
function configure(s, o = {}) {
  if (rep) rep.stop();
  strategy = s; alive = true; served = 0; activatedAt = 0; maxWaiting = 0; blackUntil = 0;
  mode = o.mode || 'async'; rttMs = o.rttMs || 0; everyMs = o.everyMs || (s === 'backup' ? SNAP_MS : REPL_MS);
  if (NAME === 'A') { appUp = true; dbUp = true; capacity = 1; }
  else {
    dbUp = s !== 'backup';
    appUp = s === 'warm' || s === 'active';
    capacity = s === 'warm' ? 0.25 : 1;
  }
  rep = createReplicator({ ship, mode, everyMs });
  const replicates = NAME === 'A' || s === 'active';                      // B sirf active mein A ko bhejta hai
  if (replicates && mode === 'async') rep.start();                        // async: har everyMs par jama orders ka tick
}
configure('backup');

serve(PORT, {
  'POST /order': async (req, res, url, p, b) => {
    if (!alive) { req.socket.destroy(); return; }
    if (!appUp) return json(res, 503, { error: `${NAME}: app chal hi nahi raha` });
    if (!capOk()) return json(res, 503, { error: `${NAME}: capacity bhari` });
    let copied = true;
    try { await rep.write(b); } catch (e) { copied = false; }             // sync mein yahin intezaar hota hai
    if (!alive) { req.socket.destroy(); return; }                         // mara hua region jawab nahi deta
    if (!copied) return json(res, 503, { error: `${NAME}: doosre region tak copy nahi hui` });
    served++; maxWaiting = Math.max(maxWaiting, rep.pending());
    return json(res, 201, { ok: true, region: NAME });
  },
  'GET /orders': () => ({ ids: [...rep.orders.keys()] }),
  'POST /replicate': async (req, res, url, p, b) => {
    if (!alive || !dbUp) return json(res, 503, {});
    if (Date.now() < blackUntil) { await new Promise(r => res.on('close', r)); return; }   // unreachable: jawab hi nahi
    (b.changes || []).forEach(c => rep.apply(c));
    return { ok: true };
  },
  /* router ne failover kiya: B ko chalu karo — kitna waqt lagega, strategy par nirbhar */
  'POST /activate': async () => {
    if (activatedAt) return { ok: true };
    activatedAt = Date.now();
    if (strategy === 'backup') {
      await sleep(PROVISION_MS);                                          // naye machines, DB, network banao
      const all = await get(S3 + '/restore').catch(() => null);           // S3 mein jama sab badlav
      ((all && all.changes) || []).forEach(c => rep.apply(c));
      dbUp = true; appUp = true;
    } else if (strategy === 'pilot') {
      await sleep(BOOT_MS); appUp = true;                                 // DB pehle se garam, app boot karo
    } else if (strategy === 'warm') {
      setTimeout(() => { capacity = 1; }, SCALE_MS);                      // chal raha hai, bas bada karo
    }
    return { ok: true };
  },
  'POST /kill': () => { alive = false; rep.stop(); return { ok: true }; },
  'POST /config': (req, res, url, p, b) => { configure(b.strategy, b); return { strategy, mode, everyMs, rttMs, appUp, dbUp, capacity }; },
  'POST /blackout': (req, res, url, p, b) => { blackUntil = Date.now() + (b.ms || 0); return { until: blackUntil }; },
  'GET /health': (req, res) => { if (!alive) { req.socket.destroy(); return; } return appUp ? { ok: true } : json(res, 503, { ok: false }); },
  'GET /stats': () => ({ NAME, strategy, mode, alive, appUp, dbUp, capacity, orders: rep.orders.size, served, waiting: rep.pending(), maxWaiting }),
}, () => console.log(`[region ${NAME}] :${PORT}`));
