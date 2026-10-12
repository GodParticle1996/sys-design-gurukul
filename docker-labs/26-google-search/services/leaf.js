/* Index ki ek "leaf" machine — kai shards ke replicas isi process mein.
   Latency: aam taur par ~4 ms (lognormal). Par 1% requests "straggler" — GC pause, padosi ka noisy job, disk hiccup: +50..150 ms.
   GET /search?shard=17&replica=0 */
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5021, SLOW = +(process.env.STRAGGLER || 0.01);
let served = 0;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
serve(PORT, {
  'GET /search': async () => {
    served++;
    let ms = 4 * Math.exp(0.4 * gauss());
    if (Math.random() < SLOW) ms += 50 + Math.random() * 100;
    await sleep(ms);
    return { hits: 10 };
  },
  'GET /stats': () => ({ served }),
  'POST /reset': () => { served = 0; return { ok: true }; },
}, () => console.log(`[leaf] :${PORT} straggler=${SLOW * 100}%`));
