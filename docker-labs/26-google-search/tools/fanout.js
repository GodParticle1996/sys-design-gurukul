/* Tail at scale: ek machine 1% baar dheemi — par query 100 machines ka intezaar karti hai.
   node tools/fanout.js [--queries 200] */
const args = require('./args')();
const { get, post, host, pct } = require('../lib/util');
const R = `http://${host('root')}:5022`, Q = +(args.queries || 200);
(async () => {
  console.log('shards  mode      query p50    p99      max      leaf requests per query');
  for (const shards of [1, 100]) for (const mode of shards === 1 ? ['single'] : ['single', 'hedged', 'double']) {
    await post(R + '/reset'); const lat = [];
    for (let i = 0; i < Q; i++) lat.push((await get(`${R}/query?mode=${mode}&shards=${shards}`)).ms);
    const st = await get(R + '/stats');
    console.log(`${String(shards).padStart(5)}   ${mode.padEnd(8)} ${pct(lat, 50).toString().padStart(6)} ms ${pct(lat, 99).toString().padStart(6)} ms ${Math.round(Math.max(...lat)).toString().padStart(6)} ms   ${(st.sent / Q).toFixed(1)} (${Math.round(100 * (st.sent / Q / shards - 1))}% extra)`);
  }
  console.log(`\n1 shard: 1% requests dheemi → p50 par dikhta bhi nahi. 100 shards: 1 - 0.99^100 = ${Math.round(100 * (1 - Math.pow(0.99, 100)))}% queries mein kam se kam ek straggler.`);
  console.log('Hedged: ~p95 tak jawab nahi aaya toh dusre replica ko bhi — sirf dheeme walon ke liye → thoda sa extra load, tail gayab.');
})();
