/* Leader dhoondo, usse maaro, aur naya leader banne ka waqt naapo */
const { get, post, sleep } = require('../lib/util');
const ports = { a: 4811, b: 4812, c: 4813 };
(async () => {
  await sleep(1500);
  const h = await get('http://localhost:4801/holder');
  console.log(`leader: scheduler-${h.holder} (term ${h.term})`);
  const t0 = Date.now();
  await post(`http://localhost:${ports[h.holder]}/admin/crash`, {}).catch(() => {});
  let now = h;
  while (!now.holder || now.holder === h.holder) { await sleep(100); now = await get('http://localhost:4801/holder'); if (Date.now() - t0 > 30000) break; }
  console.log(`scheduler-${h.holder} maara → naya leader scheduler-${now.holder} (term ${now.term}) ${((Date.now() - t0) / 1000).toFixed(1)} s mein   (TTL ke aas-paas)`);
  const b = await get('http://localhost:4802/stats');
  console.log(`billing: windows ${b.windows}   double-charged: ${b.doubleCharged}`);
})();
