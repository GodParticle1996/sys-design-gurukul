/* ex1 · 200 clients (jaise 200 AI agents) EK HI PAL mein charge bhejte hain. Gateway ek waqt mein sirf 10 le sakta hai.
   Har client zyada se zyada 8 koshish karta hai, phir haar maan leta hai ("payment API at capacity").
   Chhe retry tareeke, same gateway, same clients.
   node tools/jitter.js [--clients 200] [--attempts 8] */
const { postRaw, get, post, sleep, host } = require('../lib/util');
const { WAITS } = require('../lib/retry');                          // intezaar ke formule: lib/retry.js
const args = require('./args')();
const GW = `http://${host('gateway')}:5161`;
const CLIENTS = +(args.clients || 200), ATTEMPTS = +(args.attempts || 8), BASE = 50, CAPMS = 2000;
const O = { base: BASE, cap: CAPMS };                                  // n = kitni baar fail hua (0, 1, 2 …)

const STRATS = [
  ['turant (bina ruke)',       () => 0],
  ['exp backoff, bina jitter', n => WAITS.backoff(n, O)],
  ['exp ±20% (Kafka jaisa)',   n => WAITS.backoff(n, O) * (0.8 + Math.random() * 0.4)],
  ['full jitter',              n => WAITS.full(n, O, Math.random)],
  ['equal jitter',             n => WAITS.equal(n, O, Math.random)],
  ['decorrelated jitter',      (n, prev) => Math.min(CAPMS, BASE + Math.random() * (prev * 3 - BASE))],
];

async function client(delayFn) {
  let prev = BASE;
  for (let n = 0; n < ATTEMPTS; n++) {
    const r = await postRaw(GW + '/charge', {});
    if (r.ok) return true;
    if (n === ATTEMPTS - 1) break;
    const d = delayFn(n, prev); prev = Math.max(BASE, d);
    await sleep(d);
  }
  return false;                                                         // haar maan li
}

(async () => {
  console.log(`${CLIENTS} clients ek saath · gateway ek waqt mein 10 charges (50 ms har ek) · har client max ${ATTEMPTS} koshish · base ${BASE} ms, cap ${CAPMS} ms\n`);
  console.log('tareeka                     gateway par calls   503 mile   charge ho gaye   haar maani   aakhri charge (ms)');
  for (const [name, fn] of STRATS) {
    await post(GW + '/reset');
    const t0 = Date.now();
    let last = 0;
    const res = await Promise.all(Array.from({ length: CLIENTS }, () => client(fn).then(ok => { if (ok) last = Date.now() - t0; return ok; })));
    const s = await get(GW + '/stats');
    const done = res.filter(Boolean).length;
    console.log(`${name.padEnd(26)} ${String(s.calls).padStart(10)}   ${String(s.rejected).padStart(10)}   ${String(done).padStart(10)}/${CLIENTS}   ${String(CLIENTS - done).padStart(8)}   ${String(last).padStart(12)}`);
    await sleep(300);
  }
  console.log('\nGateway ki chhat: 10 × (1000 ms / 50 ms) = 200 charges/second — yaani 200 clients ko kam se kam ~1 second lagega.');
})();
