/* Teen workloads ek saath: bhaari ETL, dashboards (BI), aur data science */
const { get, pct, sleep } = require('../lib/util');
const a = require('./args')();
const SECONDS = +(a.for || 5);
const base = 'http://localhost:' + (process.env.PORT || 4401);
(async () => {
  const bi = [], ds = [], etl = [];
  const end = Date.now() + SECONDS * 1000;
  const jobs = [];
  while (Date.now() < end) {
    jobs.push((async () => { const t = Date.now(); try { await get(base + '/q/etl'); } catch (e) {} etl.push(Date.now() - t); })());
    for (let i = 0; i < 6; i++) jobs.push((async () => { const t = Date.now(); try { await get(base + '/q/bi'); } catch (e) {} bi.push(Date.now() - t); })());
    jobs.push((async () => { const t = Date.now(); try { await get(base + '/q/ds'); } catch (e) {} ds.push(Date.now() - t); })());
    await sleep(50);
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  console.log(`MODE=${String(s.mode).padEnd(5)} bi p99: ${pct(bi, 99)} ms   bi p50: ${pct(bi, 50)} ms   ds p99: ${pct(ds, 99)} ms   etl queries: ${etl.length}   (bi ${bi.length} queries)`);
})();
