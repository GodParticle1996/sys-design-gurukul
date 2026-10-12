/* Skewed traffic: ek "hot" channel ko HOT% requests, baaki 10,000 channels mein bikhre */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const HOT = +(a['hot-share'] || 45), N = +(a.requests || 6000);
const base = 'http://localhost:' + (process.env.PORT || 4701);
(async () => {
  await post(base + '/reset', {});
  const times = []; let parts = 0;
  const jobs = [];
  for (let i = 0; i < N; i++) {
    const ch = (i % 100) < HOT ? 7 : 1000 + Math.floor(Math.random() * 9000);
    jobs.push((async () => { const t = Date.now(); const r = await get(`${base}/channel/${ch}/latest`).catch(() => ({ partitions: 0 })); parts += r.partitions; times.push(Date.now() - t); })());
    if (i % 60 === 0) await sleep(10);
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  const tot = s.load.reduce((x, y) => x + y, 0);
  console.log(`KEY=${String(s.key).padEnd(13)} hottest node: ${((Math.max(...s.load) / tot) * 100).toFixed(1)}% of load   p99: ${pct(times, 99)} ms   partitions per read: ${(parts / N).toFixed(0)}`);
})();
