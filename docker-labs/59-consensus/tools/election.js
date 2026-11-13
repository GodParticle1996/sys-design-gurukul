'use strict';
// ex2-election — MODEL (seeded): 5-node cluster, leader mara; baaki 4 nodes naya leader chunte hain (majority 3).
// Har setting par 10,000 elections. Timeout range = Raft paper ka example 150–300 ms aur kuch aur.
const { elect } = require('../lib/election');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const RUNS = 10000;
console.log('timeout range        split vote (≥1 baar)   naya leader: median     p99        sabse lamba');
for (const [lo, hi] of [[150, 150], [150, 155], [150, 200], [150, 300], [150, 1500]]) {
  const r = rng(lo * 7 + hi), ms = []; let split = 0;
  for (let i = 0; i < RUNS; i++) { const e = elect({ lo, hi, r }); ms.push(e.ms); if (e.split) split++; }
  const fin = ms.filter(Number.isFinite), stuck = RUNS - fin.length;
  const label = (lo + '–' + hi + ' ms').padEnd(19), sp = (100 * split / RUNS).toFixed(1).padStart(5);
  if (!fin.length) { console.log(`${label}  ${sp}%                 kabhi nahi — ${RUNS.toLocaleString('en-IN')} mein se ek bhi election 1,000 rounds mein nahi jeeta`); continue; }
  console.log(`${label}  ${sp}%                 ${percentile(fin, 50).toFixed(0).padStart(5)} ms   ${percentile(fin, 99).toFixed(0).padStart(6)} ms   ${Math.max(...fin).toFixed(0).padStart(6)} ms${stuck ? `   ${stuck} kabhi nahi` : ''}`);
}
console.log('\nSab ka bilkul same timeout (150–150): har round mein chaaron ek saath candidate, sab khud ko vote → hamesha split. Asli');
console.log('processes mein bhi yahi hota hai: lab 09 ka SAME_TIMEOUT run 10 s mein koi leader nahi chun paaya (105 elections).');
console.log('Range chaudi = kam split votes, par range ka upar wala hissa bhi intezaar badhaata hai (150–1500: p99 lamba).');
console.log('Model: sirf 1–5 ms ka network, koi packet loss nahi, koi disk nahi. Lab 09 asli 5 processes par election dikhata hai.');
