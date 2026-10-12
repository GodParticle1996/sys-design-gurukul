const { post } = require('../lib/util');
const a = require('./args')();
(async () => {
  const r = await post(`http://localhost:${process.env.PORT || 4607}/admin/split/${a.tenant || 'monster'}/${a.into || 4}`, {});
  if (r.error) return console.log('❌ ' + r.error);
  console.log(`mapping updated: ${r.after.map(x => `channels ${x.from}-${x.to - 1} → shard-${x.shard}`).join(', ')}`);
  console.log(`rows moved: ${r.rowsMoved.toLocaleString('en-IN')}   app code changed: ${r.appCodeChanged} lines`);
})();
