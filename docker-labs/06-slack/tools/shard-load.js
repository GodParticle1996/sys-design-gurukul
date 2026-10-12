/* 200 chhote workspaces + 1 monster (bahut saara traffic). Kaunsa shard garam hai, kiska p99 kya hai. */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const FOR = +(a.for || 4);
const base = 'http://localhost:' + (process.env.PORT || 4607);
(async () => {
  await post(base + '/reset', {});
  const mon = [], oth = [];
  const end = Date.now() + FOR * 1000;
  const jobs = [];
  let i = 0;
  while (Date.now() < end) {
    for (let k = 0; k < 8; k++) { const ch = Math.floor(Math.random() * 100); jobs.push((async () => { const t = Date.now(); await get(`${base}/q/monster/${ch}`).catch(() => {}); mon.push(Date.now() - t); })()); }
    for (let k = 0; k < 6; k++) { const ws = 'ws-' + ((i * 6 + k) % 200); jobs.push((async () => { const t = Date.now(); await get(`${base}/q/${ws}/1`).catch(() => {}); oth.push(Date.now() - t); })()); }
    i++;
    await sleep(10);
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  const tot = s.perShard.reduce((x, y) => x + y, 0);
  const hottest = Math.max(...s.perShard);
  console.log(`ROUTING=${String(s.routing).padEnd(5)} hottest shard: ${Math.round((hottest / tot) * 100)}% of load   monster p99: ${pct(mon, 99)} ms   others p99: ${pct(oth, 99)} ms`);
  console.log(`   per-shard queries: ${s.perShard.join(' · ')}`);
})();
