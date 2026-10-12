/* Payment gateway jaisa: ek waqt mein sirf CAP charges chal sakte hain (har charge WORK ms).
   Bhara hua → 503 turant ("at capacity"). Har aane wali call ginte hain.
   POST /charge   GET /stats   POST /reset */
const { serve, sleep, json } = require('../lib/util');
const PORT = +process.env.PORT || 5161, CAP = +(process.env.CAP || 10), WORK = +(process.env.WORK || 50);
let inflight = 0, peak = 0, calls = 0, ok = 0, rejected = 0;

serve(PORT, {
  'POST /charge': async (req, res) => {
    calls++;
    if (inflight >= CAP) { rejected++; return json(res, 503, { error: 'at capacity' }); }
    inflight++; peak = Math.max(peak, inflight);
    await sleep(WORK);
    inflight--; ok++;
    return { ok: true };
  },
  'GET /stats': () => ({ calls, ok, rejected, peak }),
  'POST /reset': () => { inflight = 0; peak = 0; calls = 0; ok = 0; rejected = 0; return { ok: true }; },
}, () => console.log(`[gateway] :${PORT} CAP=${CAP} WORK=${WORK}ms`));
