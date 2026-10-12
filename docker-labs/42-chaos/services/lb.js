/* Load balancer (round robin). POST /config:
     instances — kitne app instances (1 ya 3)
     health    — har 300 ms health check; 2 baar fail → rotation se bahar, 1 baar theek → wapas
     retry     — ek instance fail ho toh request EK baar agle instance par
     eject     — (naya, 0 = band) passive ejection: N request LAGATAAR fail ho jaayein toh us instance ko
                 EJECT_MS (2 s) ke liye rotation se bahar, chahe uska /health theek jawab de raha ho.
                 Health check poochhta hai "kya tum zinda ho?"; eject asli requests ka nateeja dekhta hai —
                 isliye woh slow aur zombie instance bhi pakadta hai jo health check se bach jaate hain.
   Rotation ke niyam (kaun bahar, kaun andar, kis order mein) lib/rotation.js mein hain — slow motion tools bhi wahi chalate hain.
   Request ka timeout: 500 ms.
   GET /work   POST /config   GET /stats */
const { serve, json } = require('../lib/util');
const R = require('../lib/rotation');
const PORT = +process.env.PORT || 5211;
const ALL = (process.env.APPS || '5212,5213,5214').split(',').map(p => (p.startsWith('http') ? p : `http://localhost:${p}`));
const HEALTH_EVERY = 300, HEALTH_TIMEOUT = 200, TIMEOUT = 500, EJECT_MS = 2000;
const DEFAULTS = { instances: 3, health: false, retry: false, eject: 0 };
let cfg = Object.assign({}, DEFAULTS);
let rot = R.newRotation(3);

setInterval(() => {
  if (!cfg.health) return;
  const r = rot;                                                          // /config beech mein aaye toh purane hi ko likho
  ALL.slice(0, cfg.instances).forEach((u, i) => fetch(u + '/health', { signal: AbortSignal.timeout(HEALTH_TIMEOUT) })
    .then(res => res.ok, () => false)
    .then(ok => R.onHealth(r, i, ok)));
}, HEALTH_EVERY);

async function call(i) {
  try {
    const r = await fetch(ALL[i] + '/work', { signal: AbortSignal.timeout(TIMEOUT) });
    await r.arrayBuffer();                                                // body padh lo, connection chhoot jaaye
    return r.ok;
  } catch (e) { return false; }
}

serve(PORT, {
  'GET /work': async (req, res) => {
    const r = rot, tries = R.choose(r, Date.now(), cfg.retry);
    for (let k = 0; k < tries.length; k++) {
      const ok = await call(tries[k]);
      R.onRequest(r, tries[k], ok, Date.now(), cfg.eject, EJECT_MS);
      if (ok) return k === 0 ? { ok: true } : { ok: true, retried: true };
    }
    return json(res, 502, { error: 'instance ne jawab nahi diya' });
  },
  'POST /config': (req, res, url, p, b) => {
    cfg = Object.assign({}, DEFAULTS, b || {});                           // jo nahi bheja woh default par
    rot = R.newRotation(cfg.instances);
    return cfg;
  },
  'GET /stats': () => ({ cfg, out: rot.out, ejected: rot.until.map(u => u > Date.now()) }),
}, () => console.log(`[lb] :${PORT} → ${ALL.length} apps`));
