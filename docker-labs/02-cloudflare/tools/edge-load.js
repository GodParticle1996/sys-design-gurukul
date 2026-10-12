/* Edges par load bhejta hai aur p50/p99 + errors dikhata hai */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const RPS = +(a.rps || 300), FOR = +(a.for || 5);
const ports = [4211, 4212, 4213];

(async () => {
  for (const p of ports) await post(`http://localhost:${p}/reset`, {});
  const times = [];
  const gap = Math.max(1, Math.round(1000 / RPS));
  const jobs = [];
  const end = Date.now() + FOR * 1000;
  let i = 0;
  while (Date.now() < end) {
    const port = ports[i % ports.length];
    const site = 'site-' + (i++ % 2000);
    jobs.push((async () => { const t = Date.now(); try { await get(`http://localhost:${port}/page/${site}`); } catch (e) {} times.push(Date.now() - t); })());
    await sleep(gap);
  }
  await Promise.all(jobs);
  let served = 0, errors = 0, remote = 0, mode = '';
  for (const p of ports) { const s = await get(`http://localhost:${p}/stats`); served += s.served; errors += s.errors; remote += s.remoteCalls; mode = s.mode; }
  const errPct = Math.round((errors / Math.max(1, served + errors)) * 100);
  console.log(`CONFIG=${mode.padEnd(8)} p50: ${pct(times, 50)} ms   p99: ${pct(times, 99)} ms   config calls: ${remote}   errors: ${errPct}%`);
})();
