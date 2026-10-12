const { get, post, sleep } = require('../lib/util');
(async () => {
  const r = await post('http://localhost:4721/admin/dual/on', {});
  const since = (await get('http://localhost:4721/count')).maxId + 1;
  await sleep(+(require('./args')().wait || 3000));
  const o = await get('http://localhost:4721/recent/' + since), n = await get('http://localhost:4722/recent/' + since);
  const have = new Set(n.ids);
  const missing = o.ids.filter(i => !have.has(i)).length;
  console.log(JSON.stringify(r));
  console.log(`recent window: old ${o.ids.length} msgs · new ${n.ids.length} msgs · missing ${missing}  ${missing ? '❌' : '✅ "abhi" sambhal gaya'}`);
})();
