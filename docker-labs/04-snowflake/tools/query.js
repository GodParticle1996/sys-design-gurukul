const { get } = require('../lib/util');
const a = require('./args')();
const base = 'http://localhost:' + (process.env.PORT || 4402);
(async () => {
  const n = +(a.repeat || 2);
  for (let i = 0; i < n; i++) {
    const r = await get(base + '/query');
    console.log(`run ${i + 1} ${i === 0 ? '(cold)' : '(warm)'}: ${r.ms} ms   remote reads: ${r.remoteReads}   local reads: ${r.localReads}   cache hit: ${r.cacheHit}%`);
  }
})();
