/* Ek monster tenant + kai chhote tenants — kiska p99 kya rehta hai */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const MONSTER = +(a.monster || 8), OTHERS = +(a.others || 10), SECONDS = +(a.for || 4);
const base = 'http://localhost:' + (process.env.PORT || 4301);

(async () => {
  await post(base + '/reset', {});
  const mon = [], oth = [];
  const end = Date.now() + SECONDS * 1000;
  const jobs = [];
  let i = 0;
  while (Date.now() < end) {
    for (let k = 0; k < MONSTER; k++) jobs.push((async () => { const t = Date.now(); try { await get(base + '/report?tenant=monster'); } catch (e) {} mon.push(Date.now() - t); })());
    for (let k = 0; k < OTHERS; k++) jobs.push((async () => { const t = Date.now(); try { await get(base + '/search?tenant=' + ['acme', 'globex', 'initech'][k % 3] + '&q=ticket'); } catch (e) {} oth.push(Date.now() - t); })());
    i++;
    await sleep(40);
  }
  await Promise.all(jobs);
  const s = await get(base + '/stats');
  console.log(`TENANCY=${String(s.tenancy).padEnd(7)}${s.cap ? ' CAP=' + s.cap : '        '}  others p99: ${pct(oth, 99)} ms   monster p99: ${pct(mon, 99)} ms   monster ne max ${s.maxConnsByTenant.monster || 0}/${s.pool} connections liye`);
})();
