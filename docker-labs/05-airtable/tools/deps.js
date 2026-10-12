/* Ek cell badlo — dependency chain mein kya-kya recompute hua */
const { get, post } = require('../lib/util');
const base = 'http://localhost:' + (process.env.PORT || 4502);
(async () => {
  await post(base + '/reset', {});
  await post(base + '/view/v1', { status: 'open', mod: 2 });
  const before = await get(base + '/stats');
  await post(base + '/write', { id: 4 });
  const after = await get(base + '/stats');
  console.log('changed: rows[4].qty');
  console.log('  → formula line_total      (1 record)');
  console.log('  → rollup  order_total     (1 record)');
  console.log('  → lookup  customer_spend  (1 record)');
  console.log(`recomputed: ${after.recomputed - before.recomputed} records · views touched: ${after.diffsSent - before.diffsSent} · rows sent: ${after.rowsSent - before.rowsSent}`);
})();
