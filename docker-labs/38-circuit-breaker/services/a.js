/* Service A — users ki taraf. Uske paas ek chhota WORKER POOL hai (POOL ek saath, baaki line mein; line QMAX se lambi
   → 503), jaise Java/Spring ke threads. Teen endpoints:
     GET /home      → B /recs. Fail ho toh fallback: pichhla accha jawab (cache) → nahi toh default list
     GET /price?v=  → B /price (v = app version)
     GET /profile   → B se koi lena-dena nahi (5 ms apna kaam) — par pool WAHI
   B ko kaise call kare (POST /config):
     protect:  none (koi timeout nahi) | timeout (300 ms) | breaker (300 ms timeout + circuit breaker)
     count4xx: 4xx ko bhi failure gino?          perEndpoint: har endpoint ka alag breaker, ya poore B ka ek?
     halfOpen: naive (timer khatam → seedha closed) | trials (3 trial calls) | slowstart (trials + 3 s ramp)
     pool:     worker pool ka size
     win / minCalls / openMs / trials: breaker ki settings (POST /reset inhe default par lautata hai)
   Breaker (lib/breaker.js): pichhli 20 calls mein ≥ 50% fail (kam se kam 10 calls) → OPEN 2 s → 3 trial calls.
   Andar jhaankne ke liye:  GET /pool (workers, line)   GET /breaker (state, window, timer) */
const { serve, sleep, json } = require('../lib/util');
const { Breaker } = require('../lib/breaker');
const PORT = +process.env.PORT || 5171, B = process.env.B_URL || 'http://localhost:5172';
const QMAX = 200, TIMEOUT = 300, RAMP_MS = 3000;
const TUNING = { win: 20, minCalls: 10, openMs: 2000, trials: 3 };
let cfg = Object.assign({ protect: 'none', count4xx: false, perEndpoint: true, halfOpen: 'trials', pool: 20 }, TUNING);

/* lib/breaker.js ka Breaker + is lab ke do extra niyam: "naive" (timer khatam → seedha CLOSED) aur slow start */
class LabBreaker extends Breaker {
  constructor() { super(); this.opens = 0; this.rampFrom = 0; }
  reset() { this.state = 'CLOSED'; this.window = []; this.openUntil = 0; this.trialsSent = 0; this.trialsOk = 0; this.opens = 0; this.rampFrom = 0; }
  allow() {
    Object.assign(this, { windowSize: cfg.win, minCalls: cfg.minCalls, openMs: cfg.openMs, trials: cfg.trials });
    if (cfg.halfOpen === 'naive' && this.state === 'OPEN' && this.now() >= this.openUntil) { this.close(); return true; }   // seedha poora traffic
    if (!super.allow()) return false;
    if (this.state === 'CLOSED' && this.rampFrom) {                      // slow start: 10% se 100% tak, RAMP_MS mein
      const f = (this.now() - this.rampFrom) / RAMP_MS;
      if (f >= 1) this.rampFrom = 0;
      else if (Math.random() > Math.max(0.1, f)) return false;
    }
    return true;
  }
  open() { super.open(); this.opens++; this.rampFrom = 0; }
  close() {
    const afterTrials = this.state === 'HALF_OPEN';
    super.close();
    this.rampFrom = afterTrials && cfg.halfOpen === 'slowstart' ? this.now() : 0;
  }
}
const breakers = { recs: new LabBreaker(), price: new LabBreaker(), all: new LabBreaker() };
const peek = b => ({
  state: b.state, window: b.window.map(ok => (ok ? 1 : 0)), openForMs: b.state === 'OPEN' ? Math.max(0, b.openUntil - Date.now()) : 0,
  trialsSent: b.trialsSent, trialsOk: b.trialsOk, trials: cfg.trials, opens: b.opens,
});
const brk = ep => (cfg.perEndpoint ? breakers[ep] : breakers.all);

/* worker pool (semaphore) */
let busy = 0, maxBusy = 0, maxQueue = 0; let waiting = [];
function acquire() {
  if (busy < cfg.pool) { busy++; maxBusy = Math.max(maxBusy, busy); return Promise.resolve(); }
  return new Promise(r => { waiting.push(r); maxQueue = Math.max(maxQueue, waiting.length); });
}
function release() { const w = waiting.shift(); if (w) w(); else busy--; }
const full = () => busy >= cfg.pool && waiting.length >= QMAX;

let lastGood = null, stats;
const fresh = () => ({ sent: { recs: 0, price: 0 }, blocked: { recs: 0, price: 0 }, home: { live: 0, cache: 0, default: 0 }, poolReject: 0 });
stats = fresh();

async function callB(ep, path) {
  const br = brk(ep);
  if (cfg.protect === 'breaker' && !br.allow()) { stats.blocked[ep]++; return { ok: false, blocked: true, status: 0 }; }
  stats.sent[ep]++;
  let r;
  try {
    const resp = await fetch(B + path, cfg.protect === 'none' ? {} : { signal: AbortSignal.timeout(TIMEOUT) });
    let body = null; try { body = await resp.json(); } catch (e) {}
    r = { ok: resp.ok, status: resp.status, body };
  } catch (e) { r = { ok: false, status: 0 }; }                        // timeout ya connection toota
  if (cfg.protect === 'breaker') {
    const failure = !r.ok && (r.status === 0 || r.status >= 500 || (cfg.count4xx && r.status >= 400));
    br.record(!failure);
  }
  return r;
}

serve(PORT, {
  'GET /home': async (req, res) => {
    if (full()) { stats.poolReject++; return json(res, 503, { error: 'A ka pool bhara' }); }
    await acquire();
    try {
      const r = await callB('recs', '/recs');
      if (r.ok) { lastGood = r.body.recs; stats.home.live++; return { recs: r.body.recs, source: 'live' }; }
      if (lastGood) { stats.home.cache++; return { recs: lastGood, source: 'cache', blocked: !!r.blocked }; }
      stats.home.default++; return { recs: ['popular-1', 'popular-2'], source: 'default', blocked: !!r.blocked };
    } finally { release(); }
  },
  'GET /price': async (req, res, url) => {
    if (full()) { stats.poolReject++; return json(res, 503, { error: 'A ka pool bhara' }); }
    await acquire();
    try {
      const r = await callB('price', '/price?v=' + (url.searchParams.get('v') || 'new'));
      if (r.ok) return { price: r.body.price };
      if (r.blocked) return json(res, 503, { error: 'breaker open' });
      return json(res, r.status || 503, { error: 'B se jawab nahi' });
    } finally { release(); }
  },
  'GET /profile': async (req, res) => {
    if (full()) { stats.poolReject++; return json(res, 503, { error: 'A ka pool bhara' }); }
    await acquire();
    try { await sleep(5); return { name: 'Asha' }; } finally { release(); }
  },
  'POST /config': (req, res, url, p, b) => { cfg = Object.assign(cfg, b || {}); return cfg; },
  'GET /stats': () => Object.assign({}, stats, { maxBusy, maxQueue, opens: breakers.recs.opens + breakers.price.opens + breakers.all.opens }),
  'GET /pool': () => ({ size: cfg.pool, busy, waiting: waiting.length }),
  'GET /breaker': () => ({ recs: peek(breakers.recs), price: peek(breakers.price), all: peek(breakers.all) }),
  'POST /reset': () => {
    Object.assign(cfg, TUNING);
    Object.values(breakers).forEach(x => x.reset()); stats = fresh(); lastGood = null; maxBusy = busy; maxQueue = waiting.length;
    return { ok: true };                                                 // pool ko nahi chhoote — tool pichhli requests khatam hone deta hai
  },
}, () => console.log(`[A] :${PORT} → B ${B}`));
