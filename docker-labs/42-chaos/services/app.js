/* Ek app instance. Fault lagane ka raasta:
     POST /fault { type, ms, delay }
       type 'kill'   — har connection turant toot-ta hai (process "mar gaya")
       type 'slow'   — /work `delay` ms (default 2000) leta hai: LB ke 500 ms ke timeout se bahut zyada.
                       /health tez hi rehta hai, isliye health check ko kuch pata nahi chalta
       type 'zombie' — /health 200 deta hai ("theek hoon"), par /work 500 deta hai
       type 'none'   — fault hatao (rollback)
       ms            — itni der baad fault khud hat jaata hai (jaise orchestrator ne naya container utha diya);
                       ms na do toh fault tab tak rehta hai jab tak 'none' na bhejo
   POST /kill { ms }  — purana raasta: 'kill' fault, ms na do toh 2000
   GET /work (10 ms kaam)   GET /health   GET /stats   POST /reset
   /stats mein faultHits = fault ke dauraan is instance tak kitni /work requests pahunchi */
const { serve, json, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5212;
const TYPES = ['none', 'kill', 'slow', 'zombie'];
let fault = { type: 'none', until: 0, delay: 2000 };
let served = 0, kills = 0, faultHits = 0;

/* abhi koi fault chal raha hai? (until tak; until 0 = jab tak hatao nahi) */
function current() {
  if (fault.until && Date.now() >= fault.until) return 'none';
  return fault.type;
}

serve(PORT, {
  'GET /work': async (req, res) => {
    const f = current();
    if (f !== 'none') faultHits++;
    if (f === 'kill') { req.socket.destroy(); return; }
    await sleep(f === 'slow' ? fault.delay : 10);
    if (current() === 'kill') { req.socket.destroy(); return; }          // kaam ke beech mein mara
    if (f === 'zombie') return json(res, 500, { error: 'zombie' });
    served++;
    return { ok: true, port: PORT };
  },
  'GET /health': (req) => {
    if (current() === 'kill') { req.socket.destroy(); return; }
    return { ok: true };                                                  // slow aur zombie mein bhi "theek"
  },
  'POST /fault': (req, res, url, p, b) => {
    const { type = 'none', ms = 0, delay = 2000 } = b || {};
    if (!TYPES.includes(type)) return json(res, 400, { error: 'type: ' + TYPES.join(' | ') });
    if (type === 'kill') kills++;
    fault = { type, until: ms ? Date.now() + ms : 0, delay };
    return { ok: true, fault: type };
  },
  'POST /kill': (req, res, url, p, b) => {
    kills++;
    fault = { type: 'kill', until: Date.now() + ((b && b.ms) || 2000), delay: 2000 };
    return { ok: true };
  },
  'GET /stats': () => ({ served, kills, faultHits, fault: current() }),
  'POST /reset': () => {
    fault = { type: 'none', until: 0, delay: 2000 };
    served = 0; kills = 0; faultHits = 0;
    return { ok: true };
  },
}, () => console.log(`[app] :${PORT}`));
