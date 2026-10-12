/* Strangler proxy: SHADOW=1 → har read ki copy target ko bhi, jawab compare.
   /admin/shift/:pct → user id ke hisaab se pct% users target se serve (1% = id % 100 < 1) */
const { serve, get } = require('../lib/util');
const PORT = +(process.env.PORT || 5000);
let shadow = process.env.SHADOW !== '0', shift = 0;
let served = { source: 0, target: 0 }, compared = 0, mismatch = 0;
serve(PORT, {
  'GET /balance/:id': async (req, res, url, p) => {
    const id = +p.id;
    const useTarget = (id % 100) < shift;
    const primary = await get(`http://localhost:${useTarget ? 5002 : 5001}/balance/${id}`);
    served[useTarget ? 'target' : 'source']++;
    if (shadow && !useTarget) {
      get(`http://localhost:5002/balance/${id}`).then(t => { compared++; if (t.balance !== primary.balance) mismatch++; }).catch(() => {});
    }
    return primary;
  },
  'POST /admin/shift/:pct': (req, res, url, p) => { shift = +p.pct; return { shift }; },
  'GET /stats': () => ({ shift, shadow, served, compared, mismatch }),
  'POST /reset': () => { served = { source: 0, target: 0 }; compared = 0; mismatch = 0; return { ok: true }; },
}, () => console.log(`  proxy  → http://localhost:${PORT}  (SHADOW=${shadow ? 1 : 0} · shift 0%)`));
