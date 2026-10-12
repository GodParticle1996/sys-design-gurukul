/* Service B — jis par A nirbhar hai. Do endpoints:
     GET /recs            recommendations   (mode: ok | slow (5 s latak) | down (503))
     GET /price?v=old|new price            purane app version (v=old) ki request kharab hai → 400 (jab badApp on)
   Naazuk (fragile) mode: POST /down {ms} ke baad B band, phir THANDA uthta hai — pehle 3 s mein ek saath kam requests
   jhel paata hai (5 se shuru, 50 tak) aur har request dheemi (200 ms → 20 ms). Hadd se zyada ek saath → phir gir jaata hai.
   POST /config {recs, badApp}   POST /down {ms}   GET /stats (inflight = abhi B par kitni requests chal/latak rahi hain)   POST /reset */
const { serve, sleep, json } = require('../lib/util');
const PORT = +process.env.PORT || 5172;
const WARM_MS = 3000, DOWN_AGAIN_MS = 3000;
let RECS = 'ok', BAD_APP = false;
let downUntil = 0, warmFrom = 0, inflight = 0, maxInflight = 0, recsCalls = 0, priceCalls = 0, crashes = 0, t0 = Date.now(), crashTimes = [];

const warmth = () => { const x = (Date.now() - warmFrom) / WARM_MS; return warmFrom && x < 1 ? Math.max(0, x) : 1; };   // 0 = bilkul thanda, 1 = garam
const cap = () => Math.round(5 + 45 * warmth());
const latency = () => Math.round(200 - 180 * warmth());
function fallOver() { crashes++; crashTimes.push(Date.now() - t0); downUntil = Date.now() + DOWN_AGAIN_MS; warmFrom = downUntil; inflight = 0; }

async function handle(res, fn) {
  if (Date.now() < downUntil) return json(res, 503, { error: 'B down' });
  if (inflight >= cap()) { fallOver(); return json(res, 503, { error: 'B gir gaya (bojh)' }); }
  inflight++; maxInflight = Math.max(maxInflight, inflight);
  try { return await fn(); } finally { inflight = Math.max(0, inflight - 1); }
}

serve(PORT, {
  'GET /recs': (req, res) => { recsCalls++; return handle(res, async () => {
    if (RECS === 'down') return json(res, 503, { error: 'recs down' });
    if (RECS === 'slow') { await sleep(5000); return { recs: ['live-1', 'live-2'] }; }
    await sleep(latency()); return { recs: ['live-1', 'live-2'] };
  }); },
  'GET /price': (req, res, url) => { priceCalls++; return handle(res, async () => {
    if (BAD_APP && url.searchParams.get('v') === 'old') return json(res, 400, { error: 'bad request (purana app version)' });
    await sleep(latency()); return { price: 499 };
  }); },
  'POST /config': (req, res, url, p, b) => { if (b.recs) RECS = b.recs; if (b.badApp != null) BAD_APP = !!b.badApp; return { RECS, BAD_APP }; },
  'POST /down': (req, res, url, p, b) => { downUntil = Date.now() + (b.ms || 3000); warmFrom = downUntil; inflight = 0; return { ok: true }; },
  'GET /stats': () => ({ recsCalls, priceCalls, crashes, crashTimes, inflight, maxInflight }),
  'POST /reset': () => { RECS = 'ok'; BAD_APP = false; downUntil = 0; warmFrom = 0; inflight = 0; maxInflight = 0; recsCalls = 0; priceCalls = 0; crashes = 0; crashTimes = []; t0 = Date.now(); return { ok: true }; },
}, () => console.log(`[B] :${PORT}`));
