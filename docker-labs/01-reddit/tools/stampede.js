/* Cache expire karke N requests ek saath bhejta hai */
const { get, post, pct } = require('../lib/util');
const a = require('./args')();
const N = +(a.concurrency || 2000);
const base = 'http://localhost:' + (process.env.PORT || 4103);

(async () => {
  await post(base + '/seed', {});                 /* cache warm + counters reset */
  await post(base + '/expire', {});               /* ab woh expire ho gayi */
  const times = [], froms = {};
  const jobs = [];
  for (let i = 0; i < N; i++) {
    jobs.push((async () => {
      const t = Date.now();
      try { const r = await get(base + '/listing'); froms[r.from] = (froms[r.from] || 0) + 1; } catch (e) { froms.error = (froms.error || 0) + 1; }
      times.push(Date.now() - t);
    })());
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  console.log(`LOCK=${s.lock ? 1 : 0} STALE=${s.stale ? 1 : 0}   rebuilds: ${s.rebuilds}   p50: ${pct(times, 50)} ms   p99: ${pct(times, 99)} ms   ` +
    `db busy: ${(s.dbBusyMs / 1000).toFixed(1)} s   served: ${JSON.stringify(froms)}`);
})();
