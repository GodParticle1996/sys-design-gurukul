'use strict';
// ex0-quorum — ASLI ginti (sab subsets gine) + seeded MODEL (commit latency). N = 3 … 7 voters.
const { majority, tolerates, alwaysOverlap, chanceUp } = require('../lib/quorum');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const pct = x => (100 * x).toFixed(3).padStart(7) + '%';
console.log('A. Quorum = majority. Kya do quorums hamesha kam se kam ek voter share karte hain? (har subset gina)\n');
console.log('N   majority   kitne down sah sakta   majority overlap   "aadha" (N/2) quorum overlap');
for (const n of [3, 4, 5, 6, 7]) {
  const half = Math.floor(n / 2);
  console.log(`${n}      ${majority(n)}              ${tolerates(n)}                 ${alwaysOverlap(n, majority(n)) ? 'haan, hamesha' : 'NAHI'}        ${alwaysOverlap(n, half) ? 'haan' : `NAHI — do alag ${half}-${half} gut, do leader`}`);
}
console.log('\nB. Har node alag-alag p waqt band ho (independent). Majority milne ka chance:\n');
console.log('N    p = 1%      p = 5%      p = 10%');
for (const n of [3, 4, 5, 6, 7]) console.log(`${n}  ${[0.01, 0.05, 0.1].map(p => pct(chanceUp(n, majority(n), p))).join('    ')}`);
console.log('\n→ 4 nodes, 3 se KAM chalte hain (3 ki jagah 3 of 4 chahiye: zyada nodes, zyada cheezein toot sakti hain). 6 bhi 5 se kam.');

console.log('\nC. MODEL: commit kab? Leader + followers; har follower ka ack 0.5 ms + random (ausat 0.3 ms), 2% baar 20 ms ka');
console.log('   jhatka (GC, queue). Leader khud ek vote; commit = majority ke liye zaroori ack aate hi. 1 lakh commits per N.\n');
console.log('N   kitne follower acks chahiye   median     p99');
const r = rng(9);
for (const n of [3, 4, 5, 7]) {
  const need = majority(n) - 1, lat = [];
  for (let i = 0; i < 100000; i++) {
    const acks = Array.from({ length: n - 1 }, () => 0.5 + -Math.log(1 - r()) * 0.3 + (r() < 0.02 ? 20 : 0)).sort((a, b) => a - b);
    lat.push(acks[need - 1]);
  }
  console.log(`${n}   ${need} of ${n - 1}                         ${percentile(lat, 50).toFixed(2)} ms    ${percentile(lat, 99).toFixed(2)} ms`);
}
console.log('\n→ Commit sabse dheeme follower ka nahi, zaroori ginti wale ack ka intezaar karta hai. 4 nodes sabse dheema (2 of 3).');
console.log('  5 aur 7 ka p99 is model mein 3 se kam: zyada followers mein se tez wale mil jaate hain. Model leader ka zyada messages');
console.log('  bhejne ka kaam, bandwidth aur disk nahi ginta — asli cluster mein bade N ki keemat alag se naapo.');
