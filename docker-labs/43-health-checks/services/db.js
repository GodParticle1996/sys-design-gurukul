/* Shared database. GET /query (5 ms) — band ho toh 503, dheema ho toh SLOW ms.
   POST /config {down, slowMs}   GET /stats {queries}   POST /reset */
const { serve, sleep, json } = require('../lib/util');
const PORT = +process.env.PORT || 5222;
let down = false, slowMs = 0, queries = 0;
serve(PORT, {
  'GET /query': async (req, res) => { queries++; if (down) return json(res, 503, { error: 'db down' }); await sleep(slowMs || 5); return { rows: 1 }; },
  'POST /config': (req, res, url, p, b) => { if (b.down != null) down = !!b.down; if (b.slowMs != null) slowMs = +b.slowMs; return { down, slowMs }; },
  'GET /stats': () => ({ queries }),
  'POST /reset': () => { down = false; slowMs = 0; queries = 0; return { ok: true }; },
}, () => console.log(`[db] :${PORT}`));
