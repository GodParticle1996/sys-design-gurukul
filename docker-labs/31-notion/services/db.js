/* Ek Postgres jaisa DB process. Live reads (page kholna) ~1 ms. Analytics scan = poori table padhna (CPU bhaari, tukdon mein).
   Same process mein chalega toh live reads ko CPU ke liye line mein lagna padega. ROLE=primary ya lake (CDC se bani copy). */
const { serve, burn, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5092, ROLE = process.env.ROLE || 'primary';
let scanning = false;
serve(PORT, {
  'GET /read': () => { burn(1); return { ok: true, role: ROLE }; },
  'POST /scan': async () => {                                          // "pichhle mahine kitne blocks bane, workspace wise" — 3 sec CPU
    scanning = true; const t = Date.now();
    for (let i = 0; i < 300; i++) { burn(10); await new Promise(r => setImmediate(r)); }   // 10 ms ke tukde, beech mein dusron ko mauka
    scanning = false; return { role: ROLE, scanMs: Date.now() - t };
  },
  'GET /stats': () => ({ role: ROLE, scanning }),
}, () => console.log(`[db ${ROLE}] :${PORT}`));
