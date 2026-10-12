/* ex2 — ek hot partition: ek saath sirf 8 queries, har query 80 ms */
const { serve, sleep } = require('../lib/util');
const PORT = +(process.env.PORT || 4714);
let busy = 0, queries = 0, maxQueue = 0, waiting = 0;
serve(PORT, {
  'GET /read/:channel': async () => {
    queries++; waiting++; maxQueue = Math.max(maxQueue, waiting);
    while (busy >= 8) await sleep(2);
    waiting--; busy++;
    try { await sleep(80); return { ok: true }; } finally { busy--; }
  },
  'GET /stats': () => ({ queries, maxQueue }),
  'POST /reset': () => { queries = 0; maxQueue = 0; return { ok: true }; },
}, () => console.log(`  partition → http://localhost:${PORT}  (8 concurrent · 80 ms per query)`));
