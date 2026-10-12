/* Gateway par traffic bhejta hai aur monolith/new ka batwara + mismatches dikhata hai */
const { get, post, sleep, pct } = require('../lib/util');
const a = require('./args')();
const RPS = +(a.rps || 200), FOR = +(a.for || 5);
const base = 'http://localhost:' + (process.env.PORT || 4104);

(async () => {
  await post(base + '/admin/reset', {});
  const times = [];
  const gap = Math.round(1000 / RPS);
  const jobs = [];
  const end = Date.now() + FOR * 1000;
  let i = 0;
  while (Date.now() < end) {
    const id = 'p' + (i++ % 500);
    jobs.push((async () => { const t = Date.now(); try { await get(base + '/post/' + id); } catch (e) {} times.push(Date.now() - t); })());
    await sleep(gap);
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  console.log(`SHIFT=${String(s.shift).padStart(3)}%   monolith: ${s.monolith}   new: ${s['new']}   mismatches: ${s.mismatch}   errors: ${s.errors}   p99: ${pct(times, 99)} ms`);
})();
