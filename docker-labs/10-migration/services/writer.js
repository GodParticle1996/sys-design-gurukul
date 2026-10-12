/* Live traffic: source par writes. DUAL=1 → app target par bhi delta likhta hai (FAIL_RATE par fail, RETRY_DUP par dobara) */
const { post, sleep } = require('../lib/util');
const RATE = +(process.env.RATE || 400), SEED = +(process.env.SEED || 50000);
const DUAL = process.env.DUAL === '1';
const FAIL = +(process.env.FAIL_RATE || 0.02), DUP = +(process.env.RETRY_DUP || 0.01);
const SRC = 'http://localhost:5001', TGT = 'http://localhost:5002';
let n = 0, failed = 0, dup = 0;
const DURATION = +(process.env.DURATION || 0) * 1000, T0 = Date.now();
console.log(`  writer → ${RATE} writes/s${DUAL ? ` · DUAL WRITE (fail ${FAIL * 100}%, retry-duplicate ${DUP * 100}%)` : ''}`);
(async () => {
  while (!DURATION || Date.now() - T0 < DURATION) {
    const t = Date.now(); const jobs = [];
    for (let i = 0; i < RATE / 10; i++) {
      const id = Math.floor(Math.random() * SEED), delta = Math.random() < 0.5 ? -10 : 10;
      jobs.push((async () => {
        await post(SRC + '/write', { id, delta }).catch(() => {});
        n++;
        if (DUAL) {
          if (Math.random() < FAIL) { failed++; return; }                   /* target write fail — koi retry nahi */
          await post(TGT + '/apply-delta', { id, delta }).catch(() => {});
          if (Math.random() < DUP) { dup++; await post(TGT + '/apply-delta', { id, delta }).catch(() => {}); }  /* timeout ke baad retry → dobara */
        }
      })());
    }
    await Promise.all(jobs);
    await sleep(Math.max(0, 100 - (Date.now() - t)));
  }
  console.log(`  writer → band: ${n} writes${DUAL ? `, target par fail ${failed}, dobara ${dup}` : ''}`);
  process.exit(0);
})();
process.on('SIGTERM', () => process.exit(0));
