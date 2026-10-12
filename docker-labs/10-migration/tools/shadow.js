/* Proxy par reads: shadow compare, phir 1% → 10% → 50% → 100% cutover, phir rollback */
const { get, post, sleep } = require('../lib/util');
const P = 'http://localhost:5000';
async function reads(n) { for (let i = 0; i < n; i++) await get(`${P}/balance/${Math.floor(Math.random() * 50000)}`).catch(() => {}); await sleep(300); return get(P + '/stats'); }
(async () => {
  await sleep(+(require('./args')().settle || 2000));
  for (const pct of [0, 1, 10, 50, 100]) {
    await post(`${P}/admin/shift/${pct}`, {}); await post(P + '/reset', {});
    const s = await reads(1000);
    console.log(`shift ${String(pct).padStart(3)}%   source se: ${s.served.source}   target se: ${s.served.target}   shadow compare: ${s.compared}   mismatch: ${s.mismatch}`);
  }
  const t = Date.now(); await post(`${P}/admin/shift/0`, {});
  console.log(`rollback → shift 0%  (${Date.now() - t} ms, ek flag)`);
})();
