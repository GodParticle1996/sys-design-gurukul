const { get, pct } = require('../lib/util');
const a = require('./args')();
const N = +(a.queries || 200);
const base = 'http://localhost:' + (process.env.PORT || 4501);
(async () => {
  const times = [];
  for (let i = 0; i < N; i++) { const t = Date.now(); await get(base + '/filter'); times.push(Date.now() - t); }
  const s = await get(base + '/stats');
  console.log(`MODE=${String(s.mode).padEnd(6)} p50: ${pct(times, 50)} ms   p99: ${pct(times, 99)} ms   rss: ${s.rssMB} MB   (${s.records.toLocaleString('en-IN')} records)`);
})();
