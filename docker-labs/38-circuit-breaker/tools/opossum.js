/* Wahi 16 calls jo mini.js mein hain — par breaker haath ka nahi, npm ki library "opossum" ka (Node mein sabse chalti).
   Pehle (ek baar, isi folder mein):  npm install opossum        (opossum 10 ko Node 22+ chahiye)
   Phir:                              node tools/opossum.js      (recs-service chalni chahiye: npm start ex0-slowmo) */
let CircuitBreaker;
try { CircuitBreaker = require('opossum'); }
catch (e) { console.log('opossum nahi mila. Isi folder mein chalao:  npm install opossum'); process.exit(1); }
const { post, sleep, host } = require('../lib/util');
const B = `http://${host('b')}:5172`;

let lastGood = ['popular-1', 'popular-2'];

async function fetchRecs() {                            // sirf asli kaam — is function mein breaker ki ek bhi line nahi
  const res = await fetch(B + '/recs');
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return (await res.json()).recs;
}

const breaker = new CircuitBreaker(fetchRecs, {
  timeout: 300,                     // 300 ms mein jawab nahi → failure
  errorThresholdPercentage: 50,     // window mein 50% se ZYADA fail → OPEN
  volumeThreshold: 6,               // window mein kam se kam 6 calls ho, tabhi faisla
  rollingCountTimeout: 10000,       // window = pichhle 10 second (calls ki ginti nahi — WAQT)
  rollingCountBuckets: 10,
  resetTimeout: 2000,               // OPEN ke 2 s baad HALF-OPEN: EK trial call
  errorFilter: err => err.status >= 400 && err.status < 500,     // 4xx = client ki galti: breaker ke liye failure mat gino
});
breaker.fallback(() => lastGood);   // call roki gayi ya fail hui → pichhla accha jawab
breaker.on('success', recs => { lastGood = recs; });

/* ---- neeche sirf schedule aur chhapai hai ---- */
const PLAN = [0, 200, 400, 600, 'HANG 800', 1000, 1500, 2000, 2500, 3000, 4000, 4500, 5000, 'FIX 5600', 6200, 7000, 7200, 7500];
let heard = [];
['success', 'timeout', 'reject', 'open', 'halfOpen', 'close'].forEach(ev => breaker.on(ev, () => heard.push(ev)));
const stamp = ms => (ms / 1000).toFixed(1).padStart(4) + ' s';
const state = () => (breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED');

(async () => {
  await post(B + '/reset');
  console.log('opossum: timeout 300 ms · window 10 s · kam se kam 6 calls · 50% se ZYADA fail → OPEN 2 s → 1 trial call\n');
  console.log('  #   kab     nateeja                         der      opossum ke events        state      window (pichhle 10 s)');
  const t0 = Date.now();
  let n = 0;
  for (const step of PLAN) {
    const ms = typeof step === 'number' ? step : +step.split(' ')[1];
    await sleep(Math.max(0, t0 + ms - Date.now()));
    if (typeof step !== 'number') {
      const hang = step.startsWith('HANG');
      await post(B + '/config', { recs: hang ? 'slow' : 'ok' });
      console.log(`      ${stamp(ms)}  ${hang ? '⚠️  recs-service LATAK gayi (har /recs call 5 s)' : '✅ recs-service theek ho gayi'}`);
      continue;
    }
    const between = heard.filter(ev => ev === 'halfOpen');                    // do calls ke beech timer ne kya kiya
    if (between.length) console.log(`              (timer: resetTimeout 2 s poora → opossum ne khud HALF_OPEN kiya)`);
    heard = [];
    const start = Date.now();
    await breaker.fire();
    const took = Date.now() - start, s = breaker.stats;
    const what = heard.includes('success') ? '✅ live' : heard.includes('reject') ? '🟡 cache · breaker ne roki' : '🟡 cache · recs ka jawab nahi';
    const pct = s.fires ? Math.round((s.failures / s.fires) * 100) : 0;
    console.log(`${String(++n).padStart(3)}  ${stamp(ms)}  ${what.padEnd(30)} ${String(took).padStart(4)} ms   ${heard.join(' → ').padEnd(24)} ${state().padEnd(10)} ${s.fires} calls, ${s.failures} fail = ${pct}%`);
    heard = [];
  }
  process.exit(0);
})();
