/* ex2 · Retry storm. 50 clients, har client har 100 ms par ek user action (≈500 requests/second).
   t = 2 s par service crash (kharab deploy). Service 2 s mein wapas aati hai, phir 3 s thandi.
   Chaar tarah ke clients — dekho kaun service ko dobara-dobara girata hai.
   node tools/storm.js [--mode immediate|backoff|retryafter|budget] [--secs 12] */
const { postRaw, get, post, sleep, host } = require('../lib/util');
const { WAITS } = require('../lib/retry');                          // intezaar ke formule: lib/retry.js
const args = require('./args')();
const SVC = `http://${host('fragile')}:5165`;
const CLIENTS = 50, TICK = 100, SECS = +(args.secs || 12), CRASH_AT_S = 2;

const MODES = {
  immediate:  { name: 'turant retry, koi limit nahi', shed: false },
  backoff:    { name: 'exp backoff + jitter, 3 koshish', shed: false },
  retryafter: { name: 'turant retry, par Retry-After maano', shed: true },   // server bhara ho toh crash nahi, 503 + Retry-After
  budget:     { name: 'retry budget (10%), turant', shed: false },
};

async function run(mode) {
  await post(SVC + '/reset');
  await post(SVC + '/config', { shed: MODES[mode].shed });
  const t0 = Date.now(), end = t0 + SECS * 1000;
  const bucket = { tokens: 10 };                                   // budget mode: saare clients ka saajha retry budget
  let actions = 0, okActions = 0, failed = 0;
  setTimeout(() => post(SVC + '/crash'), CRASH_AT_S * 1000);

  async function action() {
    actions++;
    bucket.tokens = Math.min(20, bucket.tokens + 0.1);             // har asli request budget mein 0.1 retry jodti hai
    for (let n = 0; Date.now() < end; n++) {
      const r = await postRaw(SVC + '/work', {});
      if (r.ok) { okActions++; return; }
      if (mode === 'immediate') { await sleep(20); continue; }
      if (mode === 'retryafter') {                                 // naive client — bas server ka Retry-After maanta hai
        await sleep(r.retryAfter ? r.retryAfter * 1000 * (0.5 + Math.random()) : 20);
        continue;
      }
      if (mode === 'budget') {
        if (bucket.tokens >= 1) { bucket.tokens -= 1; await sleep(20); continue; }
        failed++; return;                                          // budget khatam → user ko error, retry nahi
      }
      if (n >= 2) { failed++; return; }                            // 3 koshish ke baad user ko error
      await sleep(WAITS.full(n, { base: 100, cap: Infinity }, Math.random));   // full jitter
    }
  }
  await Promise.all(Array.from({ length: CLIENTS }, async (_, i) => {
    await sleep(Math.random() * TICK);
    while (Date.now() < end) {
      const start = Date.now();
      await action();
      await sleep(Math.max(0, TICK - (Date.now() - start)));
    }
  }));
  const s = await get(SVC + '/stats');
  return { s, actions, okActions, failed };
}

(async () => {
  const modes = args.mode ? [args.mode] : Object.keys(MODES);
  console.log(`${CLIENTS} clients × har ${TICK} ms ek action · t=${CRASH_AT_S}s par crash · ${SECS} s ka run · crash ki hadd: 40 requests ek saath\n`);
  console.log('clients ka tareeka                   crash (pehla forced)   theek hua (s)   server par calls   503 (shed)   actions safal   user ko error   calls / action');
  for (const m of modes) {
    const { s, actions, okActions, failed } = await run(m);
    const stable = s.crashes ? (s.stableAtMs / 1000).toFixed(1) : '-';
    console.log(`${MODES[m].name.padEnd(35)} ${String(s.crashes).padStart(8)}              ${String(stable).padStart(6)}      ${String(s.calls).padStart(10)}   ${String(s.shed503).padStart(8)}      ${String(okActions).padStart(6)}/${String(actions).padEnd(6)}   ${String(failed).padStart(6)}        ${(s.calls / actions).toFixed(1)}`);
    await sleep(500);
  }
  console.log(`\nAkela forced crash ho toh service t=${CRASH_AT_S + 5}.0 s par theek (2 s down + 3 s thandi). Usse zyada = retries ne dobara giraya.`);
})();
