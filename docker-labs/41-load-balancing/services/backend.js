/* Ek backend server: WORKERS ek saath, baaki line mein. Har request ka kaam "heavy tail" wala:
   90% requests 10 ms, 10% requests 200 ms (jaise kuch search/report requests bhaari). SLOW = kaam × SLOW.
   GET /work   GET /load   POST /config {slow}   GET /stats   POST /reset
   GET /load "load average" deta hai: (andar + line mein) ka pichhle ~1/4 second ka ausat — jaise asli servers CPU % ya
   load average bhejte hain. Yeh dashamlav wali sankhya hai (1.37), isliye do servers ka load shayad hi kabhi bilkul barabar ho. */
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5202, WORKERS = 4;
let SLOW = +(process.env.SLOW || 1), busy = 0, queue = [], served = 0, maxQueue = 0, avg = 0;
setInterval(() => { avg = avg * 0.8 + (busy + queue.length) * 0.2; }, 50);        // load average: har 50 ms par thoda naya, zyada purana
const acquire = () => (busy < WORKERS ? (busy++, Promise.resolve()) : new Promise(r => { queue.push(r); maxQueue = Math.max(maxQueue, queue.length); }));
const release = () => { const w = queue.shift(); if (w) w(); else busy--; };
serve(PORT, {
  'GET /work': async () => {
    await acquire();
    try { await sleep((Math.random() < 0.1 ? 200 : 10) * SLOW); served++; return { ok: true, port: PORT }; }
    finally { release(); }
  },
  'GET /load': () => ({ load: avg }),
  'POST /config': (req, res, url, p, b) => { if (b.slow != null) SLOW = +b.slow; return { SLOW }; },
  'GET /stats': () => ({ served, maxQueue }),
  'POST /reset': () => { served = 0; maxQueue = 0; SLOW = 1; avg = 0; return { ok: true }; },
}, () => console.log(`[backend] :${PORT}`));
