/* ex1 — ek "sheher": apni capacity, capacity se zyada aaya toh drop */
const { serve, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4201);
const CITY = process.env.CITY || 'city-1';
const CAP = +(process.env.CAP || 700);             /* requests per second */
/* token bucket: sheher CAP requests/second sambhal sakta hai, usse zyada aaya toh drop */
let tokens = CAP, last = Date.now();
let served = 0, dropped = 0, realServed = 0, realDropped = 0;

serve(PORT, {
  'GET /req': (req, res, url) => {
    const now = Date.now();
    tokens = Math.min(CAP, tokens + ((now - last) / 1000) * CAP);
    last = now;
    const real = url.searchParams.get('real') === '1';
    if (tokens < 1) {
      dropped++; if (real) realDropped++;
      res.writeHead(503, { 'content-type': 'application/json' });
      return res.end('{"ok":false,"why":"over capacity"}');
    }
    tokens -= 1;
    served++; if (real) realServed++;
    burn(0.02);
    return { ok: true, city: CITY };
  },
  'GET /stats': () => ({ city: CITY, cap: CAP, served, dropped, realServed, realDropped }),
  'POST /reset': () => { served = dropped = realServed = realDropped = 0; tokens = CAP; last = Date.now(); return { ok: true }; },
}, () => console.log(`  ${CITY.padEnd(7)} → http://localhost:${PORT}  (capacity ${CAP} rps)`));
