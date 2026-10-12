/* Ek naazuk service (jaise ek bhaari API process):
   - Aam din: har request WORK ms (20). Ek saath CRASH_AT (40) se zyada requests andar → process crash.
   - Crash = DOWN_MS (2000) tak har connection turant toot-ta hai (process mara hua, restart ho raha hai).
     Jo requests crash ke waqt andar thi, woh bhi toot jaati hain.
   - Phir THANDA start: WARM_MS (3000) tak har request WARM_WORK ms (40) — cache khaali, sab thanda. Crash ki hadd wahi.
   - SHED on ho toh: bhara hone par crash hone ke bajaye 503 + "Retry-After: 1" (server khud ko bachata hai).
   POST /work   POST /crash (kharab deploy — bahar se)   GET /stats   POST /reset (settings bhi default par)
   POST /config {shed, work, warmWork, crashAt, downMs, warmMs}  — slow motion (tools/slowmo.js) chhoti sankhyaein rakhta hai */
const { serve, sleep, json } = require('../lib/util');
const PORT = +process.env.PORT || 5165;
const DEFAULTS = { work: 20, warmWork: 40, crashAt: 40, downMs: 2000, warmMs: 3000 };
let cfg = Object.assign({}, DEFAULTS);
let SHED = process.env.SHED === '1';
let downUntil = 0, warmUntil = 0, epoch = 0, crashes = [], inflight = 0, calls = 0, served = 0, shed503 = 0, t0 = Date.now();
const live = new Set();                                              // jin requests par abhi kaam chal raha hai, unke connections

function crash(now) {
  epoch++; inflight = 0;
  live.forEach(sock => sock.destroy()); live.clear();                 // process mara: andar wali saari requests usi pal toot gayi
  crashes.push(now - t0);
  downUntil = now + cfg.downMs; warmUntil = downUntil + cfg.warmMs;
}

serve(PORT, {
  'POST /work': async (req, res) => {
    const now = Date.now(); calls++;
    if (now < downUntil) { req.socket.destroy(); return; }                       // process mara hua: connection toota
    if (inflight >= cfg.crashAt) {
      if (SHED) { shed503++; res.writeHead(503, { 'content-type': 'application/json', 'retry-after': '1' }); return res.end('{"error":"busy"}'); }
      crash(now); req.socket.destroy(); return;                                  // bojh se crash
    }
    const my = epoch; inflight++; live.add(req.socket);
    await sleep(now < warmUntil ? cfg.warmWork : cfg.work);
    if (my !== epoch) { req.socket.destroy(); return; }                          // beech mein crash hua — yeh request bhi gayi
    inflight--; served++; live.delete(req.socket);
    return { ok: true };
  },
  'POST /crash': () => { crash(Date.now()); return { ok: true }; },
  'POST /config': (req, res, url, p, b) => {
    if (b.shed != null) SHED = !!b.shed;
    Object.keys(DEFAULTS).forEach(k => { if (b[k] != null) cfg[k] = +b[k]; });
    return Object.assign({ SHED }, cfg);
  },
  'GET /stats': () => ({ calls, served, shed503, crashes: crashes.length, crashesAtMs: crashes, stableAtMs: crashes.length ? crashes[crashes.length - 1] + cfg.downMs + cfg.warmMs : 0 }),
  'POST /reset': () => { cfg = Object.assign({}, DEFAULTS); downUntil = 0; warmUntil = 0; epoch++; crashes = []; inflight = 0; calls = 0; served = 0; shed503 = 0; t0 = Date.now(); return { ok: true }; },
}, () => console.log(`[fragile] :${PORT} crash > ${cfg.crashAt} ek saath · down ${cfg.downMs} ms · thanda ${cfg.warmMs} ms`));
