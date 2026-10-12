const { get, post } = require('../lib/util');
const a = require('./args')();
const base = 'http://localhost:' + (process.env.PORT || 4402);
(async () => {
  await get(base + '/query'); await get(base + '/query');           /* cache warm */
  const t0 = Date.now();
  const r = await post(base + `/resize/${a.to || 8}/${a.mode || 'lazy'}`, {});
  const resizeMs = Date.now() - t0;
  const q1 = await get(base + '/query');
  const q2 = await get(base + '/query');
  const q3 = await get(base + '/query');
  console.log(`${r.mode} resize ${r.from} → ${r.to}: upfront moved ${r.movedUpfront} blocks, resize time ${resizeMs} ms`);
  console.log(`   resize ke baad queries: ${q1.ms} ms (hit ${q1.cacheHit}%) → ${q2.ms} ms (hit ${q2.cacheHit}%) → ${q3.ms} ms (hit ${q3.cacheHit}%)`);
})();
