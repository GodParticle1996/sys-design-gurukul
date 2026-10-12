/* Ek scheduler node. Leader banne ki koshish karta hai; leader ho toh har window ek billing job fire karta hai.
   TTL_MS lock ka TTL, RENEW_MS renew interval, WINDOW_MS har job window.
   STOP_ON_LOSS=1: renewal fail hote hi scheduling band (sahi). 0: purana leader apne bharose chalta rehta hai (bug). */
const { serve, post } = require('../lib/util');
const NAME = process.env.NAME || 'a';
const PORT = +(process.env.PORT || 4811);
const TTL = +(process.env.TTL_MS || 6000), RENEW = +(process.env.RENEW_MS || 2000), WINDOW = +(process.env.WINDOW_MS || 1000);
const STOP_ON_LOSS = process.env.STOP_ON_LOSS !== '0';
const LOCK = 'http://localhost:' + (process.env.LOCK_PORT || 4801);
const BILL = 'http://localhost:' + (process.env.BILL_PORT || 4802);
let leader = false, pausedUntil = 0, fired = 0, lastWindow = -1;

async function tick() {
  if (Date.now() < pausedUntil) return;                          /* "GC pause" — kuch nahi hota */
  try {
    if (leader) {
      const r = await post(`${LOCK}/renew/${NAME}/${TTL}`, {});
      if (!r.ok) {
        if (STOP_ON_LOSS) { leader = false; console.log(`  [${NAME}] renew fail → scheduling BAND`); }
        /* bug: STOP_ON_LOSS=0 → abhi bhi khud ko leader maanta hai */
      }
    } else {
      const r = await post(`${LOCK}/acquire/${NAME}/${TTL}`, {});
      if (r.ok) { leader = true; console.log(`  [${NAME}] LEADER bana (term ${r.term})`); }
    }
  } catch (e) {}
}
async function fire() {
  if (!leader || Date.now() < pausedUntil) return;
  const w = Math.floor(Date.now() / WINDOW);
  if (w === lastWindow) return;
  lastWindow = w;
  fired++;
  await post(BILL + '/charge', { job: 'billing', window: w, by: NAME }).catch(() => {});
}
setInterval(tick, RENEW);
setInterval(fire, 100);
tick();

serve(PORT, {
  'GET /status': () => ({ name: NAME, leader, fired, paused: Date.now() < pausedUntil }),
  'POST /admin/crash': (req, res) => { res.end('{"bye":true}'); setTimeout(() => process.exit(1), 10); },
  'POST /admin/pause/:ms': (req, res, url, p) => { pausedUntil = Date.now() + +p.ms; return { pausedMs: +p.ms }; },
}, () => console.log(`  scheduler-${NAME} → http://localhost:${PORT}  (TTL ${TTL} ms · renew ${RENEW} ms · STOP_ON_LOSS=${STOP_ON_LOSS ? 1 : 0})`));
