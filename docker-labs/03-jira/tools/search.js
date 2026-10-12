/* Search chalao aur checks/scan/shards ke numbers dekho */
const { get } = require('../lib/util');
const a = require('./args')();
const base = 'http://localhost:' + (process.env.PORT || 4320);
(async () => {
  const q = new URLSearchParams();
  q.set('user', a.user || 'analyst');
  if (a.project) q.set('project', a.project);
  q.set('page', a.page || '1');
  const t = Date.now();
  const r = await get(base + '/search?' + q.toString());
  const s = await get(base + '/stats');
  console.log(`PERM=${String(s.perm).padEnd(6)} matched: ${r.matched.toLocaleString('en-IN')}   permission checks: ${r.permissionChecks.toLocaleString('en-IN')}   ` +
    `scanned: ${r.scanned.toLocaleString('en-IN')}   shards touched: ${r.shardsTouched}/${r.totalShards}   time: ${Date.now() - t} ms   returned: ${r.returned}`);
})();
