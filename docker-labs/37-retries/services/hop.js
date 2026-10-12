/* Ek service jo aage (NEXT) call karti hai. Neeche wali fail ho (503) toh ATTEMPTS baar koshish karti hai.
   NEXT nahi hai = yeh aakhri service (C): FAIL_RATE (0 … 1) jitni requests par 503.
   POST /work   POST /config {attempts, failRate}   GET /stats   POST /reset */
const { serve, postRaw, json } = require('../lib/util');
const PORT = +process.env.PORT || 5162, NAME = process.env.NAME || '?', NEXT = process.env.NEXT || '';
let ATTEMPTS = 1, FAIL_RATE = 0, calls = 0;

serve(PORT, {
  'POST /work': async (req, res) => {
    calls++;
    if (!NEXT) return Math.random() < FAIL_RATE ? json(res, 503, { error: `${NAME} down` }) : { ok: true };
    for (let i = 0; i < ATTEMPTS; i++) {
      const r = await postRaw(NEXT + '/work', {});
      if (r.ok) return { ok: true };
    }
    return json(res, 503, { error: 'downstream failed' });
  },
  'POST /config': (req, res, url, p, b) => {
    if (b.attempts != null) ATTEMPTS = +b.attempts;
    if (b.failRate != null) FAIL_RATE = +b.failRate;
    return { NAME, ATTEMPTS, FAIL_RATE };
  },
  'GET /stats': () => ({ calls }),
  'POST /reset': () => { calls = 0; return { ok: true }; },
}, () => console.log(`[${NAME}] :${PORT}${NEXT ? ' → ' + NEXT : ' (aakhri)'}`));
