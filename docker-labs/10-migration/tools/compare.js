/* Source vs target — kitni rows gayab, kitno ka balance galat */
const { get, sleep } = require('../lib/util');
(async () => {
  await sleep(+(require('./args')().settle || 1500));
  const s = await get('http://localhost:5001/all'), t = await get('http://localhost:5002/all');
  const tm = new Map(t.rows.map(r => [r.id, r]));
  let missing = 0, wrong = 0;
  for (const r of s.rows) { const x = tm.get(r.id); if (!x) missing++; else if (x.balance !== r.balance) wrong++; }
  console.log(`compare: source ${s.rows.length} rows · target ${t.rows.length} rows · missing ${missing} · galat balance ${wrong}  ${missing + wrong ? '❌ drift' : '✅ match'}`);
})();
