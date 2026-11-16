'use strict';
// ex1 (MODEL, seeded): is the "90/10 rule" real? Zipf popularity, an LRU cache, and what hit rate buys.
const { zipf } = require('../lib/zipf');
const { lru } = require('../lib/lru');
const { rng } = require('../lib/rng');
const { avgMs, dbQps } = require('../lib/amat');

const N = 100000, WARM = 300000, RUN = 1000000;
const skews = [[0, '0 (barabar)'], [0.6, '0.6'], [0.8, '0.8'], [0.99, '0.99'], [1.2, '1.2']];
const sizes = [0.001, 0.01, 0.1];
console.log(`A. MODEL: ${N.toLocaleString('en-IN')} keys, popularity Zipf (key k ka weight 1/k^s). LRU cache, ${(WARM / 1e5).toFixed(0)} lakh requests warm-up, phir ${(RUN / 1e5).toFixed(0)} lakh gine.\n`);
console.log('s             top 10% keys ki       LRU hit rate, cache = keys ka');
console.log('              requests              0.1%      1%       10%');
for (const [s, note] of skews) {
  const z = zipf(N, s, rng(1)), rates = [];
  for (const f of sizes) {
    const c = lru(N * f);
    for (let i = 0; i < WARM; i++) { const k = z.next(); if (c.get(k) === undefined) c.set(k, 1); }
    c.reset();
    for (let i = 0; i < RUN; i++) { const k = z.next(); if (c.get(k) === undefined) c.set(k, 1); }
    rates.push(c.stats().rate);
  }
  console.log(`${note.padEnd(12)}  ${(z.topShare(0.1) * 100).toFixed(1).padStart(6)}%             ${rates.map(r => (r * 100).toFixed(1).padStart(5) + '%').join('   ')}`);
}
console.log('\n→ "90% requests 10% data par" ek kanoon nahi: s = 0.99 par bhi top 10% ko 80%, s = 0.6 par 39%. Sab barabar ho toh');
console.log('  10% cache = 10% hits. LRU ka 10% cache poore top 10% (jo hamesha rakha jaaye) se thoda kam pakadta hai, kyunki');
console.log('  kam-popular keys bhi aakar jagah gherti hain. Apne asli logs se skew naapo, phir cache ka size chuno.');

console.log('\nB. Hit rate ka hisaab: 10,000 reads/sec. Hit = 0.5 ms (cache). Miss = 0.5 ms + 10 ms (DB). (arithmetic)\n');
console.log('hit rate    DB par reads/sec    ausat read');
for (const r of [0.8, 0.9, 0.95, 0.99, 0.999]) console.log(`${(r * 100).toFixed(1).padStart(6)}%      ${dbQps(r, 10000).toFixed(0).padStart(8)}         ${avgMs(r, 0.5, 10).toFixed(2)} ms`);
console.log('\n→ 95% se 99%: hit rate sirf 4 point badha, par DB ka load 5 guna gira (500 → 100). Miss hi sab kuch tay karta hai.');
