/* N viewers + W writes/second — server ka kaam aur bheja gaya data naapo */
const { get, post, pct, sleep } = require('../lib/util');
const a = require('./args')();
const VIEWERS = +(a.viewers || 40), WPS = +(a.wps || 20), FOR = +(a.for || 5);
const base = 'http://localhost:' + (process.env.PORT || 4502);
(async () => {
  await post(base + '/reset', {});
  for (let i = 0; i < VIEWERS; i++) await post(base + '/view/v' + i, { status: i % 2 ? 'open' : 'done', mod: (i % 5) + 2 });
  const times = [];
  const end = Date.now() + FOR * 1000;
  while (Date.now() < end) {
    const t = Date.now();
    await post(base + '/write', {});
    times.push(Date.now() - t);
    await sleep(Math.max(1, Math.round(1000 / WPS)));
  }
  const s = await get(base + '/stats');
  console.log(`VIEWS=${String(s.views).padEnd(5)} viewers: ${s.viewers}   view queries run: ${s.queriesRun.toLocaleString('en-IN')}   ` +
    `rows sent: ${s.rowsSent.toLocaleString('en-IN')}   diffs sent: ${s.diffsSent.toLocaleString('en-IN')}   write p99: ${pct(times, 99)} ms`);
})();
