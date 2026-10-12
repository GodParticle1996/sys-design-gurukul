/* Retry — ek fail hui call ko dobara bhejna, par dimaag se. Is lab ke tools (slowmo, mini, jitter, storm) yahi file chalate hain.
   call()  → { ok, status, retryAfter }      status 0 = jawab hi nahi aaya (connection toota / timeout)                 */

/* Kitni der rukna hai?  n = ab tak kitni baar fail hua (0, 1, 2 …)  ·  base, cap = milliseconds */
const WAITS = {
  fixed:   (n, o)         => o.base,                                          // har baar utna hi: 300, 300, 300 …
  backoff: (n, o)         => Math.min(o.cap, o.base * 2 ** n),                // har baar dugna: 300, 600, 1200 … (cap tak)
  full:    (n, o, random) => random() * Math.min(o.cap, o.base * 2 ** n),     // 0 se us hadd ke beech, kahin bhi
  equal:   (n, o, random) => { const d = Math.min(o.cap, o.base * 2 ** n); return d / 2 + random() * d / 2; },   // aadha pakka + aadha random
};

/* Kis failure par dobara bhejna theek hai?  jawab nahi aaya · 429 "baad mein aana" · 5xx (server ki dikkat).
   Baaki 4xx (400, 401, 403, 404 …) par nahi: wahi request dobara bhejne se jawab nahi badlega. */
const worthRetrying = r => r.status === 0 || r.status === 429 || r.status >= 500;

async function retry(call, { attempts = 3, base = 100, cap = 2000, wait = 'full', random = Math.random,
                             sleep = ms => new Promise(done => setTimeout(done, ms)), onWait } = {}) {
  for (let n = 0; ; n++) {
    const r = await call(n);
    if (r.ok) return r;                                              // kaam ho gaya
    if (!worthRetrying(r)) return r;                                 // dobara bhejne ka fayda nahi
    if (n === attempts - 1) return r;                                // koshishein khatam: haar maan lo, user ko batao
    const ms = r.retryAfter != null
      ? r.retryAfter * 1000 + random() * base                        // server ne khud bataya kab aana hai: utna to rukna hi hai (+ thoda random)
      : WAITS[wait](n, { base, cap }, random);
    if (onWait) onWait(n, ms, r);
    await sleep(ms);
  }
}

module.exports = { retry, WAITS, worthRetrying };
