/* Issues likho aur index ki drift naapo */
const { get, post, sleep } = require('../lib/util');
const a = require('./args')();
const base = 'http://localhost:' + (process.env.PORT || 4310);
(async () => {
  const N = +(a.writes || 0);
  for (let i = 0; i < N; i++) await post(base + '/issue', { id: 'i' + i, text: 'ticket ' + i });
  if (a['wait']) await sleep(+a.wait);
  const d = await get(base + '/drift');
  const bad = d.missing + d.stale;
  console.log(`${N ? 'wrote ' + N + ' issues   ' : ''}db: ${d.db}   index: ${d.index}   drift: ${d.missing} missing / ${d.stale} stale` +
    (bad ? `   ❌ search ${((bad / Math.max(1, d.db)) * 100).toFixed(1)}% issues galat dikha raha hai` : '   ✅') +
    (d.reconcile ? `   (reconcile passes: ${d.passes}, repaired: ${d.repaired})` : ''));
})();
