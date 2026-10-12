/* Config service band karke dekho ki edge chalta hai ya nahi */
const { post, get, sleep } = require('../lib/util');
(async () => {
  await post('http://localhost:4210/admin/stop', {});
  await sleep(300);
  let ok = 0, fail = 0;
  for (let i = 0; i < 60; i++) {
    try { const r = await get(`http://localhost:4211/page/site-${i}`); if (r && r.ok) ok++; else fail++; } catch (e) { fail++; }
  }
  const s = await get('http://localhost:4211/stats');
  console.log(`config service DOWN → CONFIG=${s.mode}: ok ${ok}/60, fail ${fail}/60`);
  await post('http://localhost:4210/admin/start', {});
})();
