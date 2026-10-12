const { get } = require('../lib/util');
(async () => {
  const o = await get('http://localhost:4721/ids'), n = await get('http://localhost:4722/ids');
  const have = new Set(n.ids);
  const missing = o.ids.filter(i => !have.has(i)).length;
  console.log(`full compare: old ${o.ids.length.toLocaleString('en-IN')} · new ${n.ids.length.toLocaleString('en-IN')} · missing in new ${missing}  ${missing ? '❌' : '✅'}`);
})();
