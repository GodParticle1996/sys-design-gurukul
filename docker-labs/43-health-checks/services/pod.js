/* Ek pod (container) — cluster.js ise chalata hai. Asli app jaisa:
   - Boot mein STARTUP_MS lagte hain (framework shuru ho raha hai) — tab tak port khula hi nahi (connection refused).
   - GET /livez   : LIVE=shallow → lib/health.js ka live() · LIVE=deep → DB se poochho (500 ms timeout), DB gaya toh 500   [galat design — naapne ke liye]
   - GET /readyz  : READY=shallow → sirf "band toh nahi ho raha?" · cached → lib/health.js: har 2 s ek DB check, jawab yaad se
                    deep → har probe par DB query [galat design — naapne ke liye] · SIGTERM ke baad hamesha 503
   - GET /home    : DB nahi chahiye (static / cache se)       GET /orders : DB query chahiye
   - SIGTERM: GRACEFUL=1 → health.stop() (readiness 503), 2 s tak chalte kaam poore karo aur naye bhi lo, phir exit · GRACEFUL=0 → turant exit */
const { serve, json } = require('../lib/util');
const { createHealth } = require('../lib/health');
const PORT = +process.env.PORT, DB = process.env.DB_URL || 'http://localhost:5222';
const STARTUP_MS = +(process.env.STARTUP_MS || 0), LIVE = process.env.LIVE || 'shallow', READY = process.env.READY || 'shallow';
const GRACEFUL = process.env.GRACEFUL === '1';

async function dbOk() {
  try { return (await fetch(DB + '/query', { signal: AbortSignal.timeout(500) })).ok; } catch (e) { return false; }
}
const health = createHealth(READY === 'cached' ? { check: dbOk, everyMs: 2000 } : {});

setTimeout(() => {
  health.start();
  serve(PORT, {
    'GET /livez': async (req, res) => {
      const ok = LIVE === 'deep' ? await dbOk() : health.live();
      return ok ? { live: true } : json(res, 500, { live: false });
    },
    'GET /readyz': async (req, res) => {
      const ok = health.ready() && (READY === 'deep' ? await dbOk() : true);
      return ok ? { ready: true } : json(res, 503, { ready: false });
    },
    'GET /home': () => ({ page: 'home', pod: PORT }),
    'GET /orders': async (req, res) => ((await dbOk()) ? { orders: [1, 2, 3] } : json(res, 503, { error: 'db nahi mila' })),
  });
}, STARTUP_MS);

process.on('SIGTERM', () => {
  if (!GRACEFUL) process.exit(0);
  health.stop();                                                           // readiness ab 503: naya traffic mat bhejo
  setTimeout(() => process.exit(0), 2000);                                 // drain: 2 s tak jo aaye use serve karo
});
