/* N tenants load karke memory aur cold start naapta hai */
const { get } = require('../lib/util');
const a = require('./args')();
const N = +(a.tenants || 500);
const base = 'http://localhost:' + (process.env.PORT || 4230);
(async () => {
  const before = await get(base + '/stats');
  for (let i = 0; i < N; i++) await get(`${base}/run/tenant-${i}`);
  const s = await get(base + '/stats');
  console.log(`SANDBOX=${s.sandbox.padEnd(5)} → ${s.tenants} tenants: rss ${s.rssMB} MB (shuru mein ${before.rssMB} MB)   cold start p50: ${s.coldStartP50} ms`);
})();
