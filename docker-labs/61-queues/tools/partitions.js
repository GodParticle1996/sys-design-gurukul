'use strict';
const { partitionFor, ordering } = require('../lib/partition');
const { rng } = require('../lib/rng');
const n = x => x.toLocaleString('en-IN');

console.log('A. MODEL (seeded): 1,000 users × 10 events (created → paid → shipped …). 6 partitions, 6 consumers.');
console.log('   Har consumer apni partition kram se padhta hai. Consumers ki raftaar alag (1–4×, jaise GC ya lag); har event 1–9 ms × raftaar.');
console.log('   Model maanta hai: har consumer apni partition ka ek event poora karke hi agla leta hai (serial).');
console.log('   Kya har user ke events usi kram mein khatam hue jismein bane?\n');
console.log(`key = user id (hash se partition):   ${ordering(true)} of 1,000 users ke events ulte kram mein`);
console.log(`koi key nahi (round-robin chuna):     ${ordering(false)} of 1,000 users ke events ulte kram mein`);
console.log('→ Kafka kram sirf EK partition ke andar deta hai. Ek user ke saare events ek partition = key do. Key kram ka mauka deti hai;');
console.log('  partition ke andar parallel handlers, retries ya rebalance ke baad ka purana kaam kram phir tod sakte hain.');
console.log('  (Kafka Java producer bina key ke round-robin nahi, "sticky" batching karta hai; yahan round-robin sirf tulna ke liye.)');

console.log('\nB. Arithmetic: 6 partitions, ek consumer group. Har consumer 100 events/sec.\n');
for (const c of [3, 6, 12]) console.log(`${String(c).padStart(2)} consumers → ${Math.min(c, 6)} kaam par, ${Math.max(0, c - 6)} khaali baithe → ${Math.min(c, 6) * 100} events/sec`);
console.log('→ Ek group mein partition se zyada consumers bekaar. Parallelism ki chhat = partitions ki ginti.');

console.log('\nC. ASLI hash, seeded traffic: 10,000 users, popularity Zipf (s = 1.2). Key = user id. 6 partitions, 10 lakh events.\n');
{
  const r = rng(3), N = 10000, s = 1.2, w = []; let tot = 0;
  for (let k = 1; k <= N; k++) { tot += 1 / Math.pow(k, s); w.push(tot); }
  const load = new Array(6).fill(0), pick = () => { const x = r() * tot; let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (w[m] < x) lo = m + 1; else hi = m; } return lo; };
  for (let i = 0; i < 1e6; i++) load[partitionFor('user-' + pick(), 6)]++;
  const max = Math.max(...load);
  console.log(`partition load: ${load.map(x => (x / 1e4).toFixed(1) + '%').join('  ')}`);
  console.log(`sabse bhari partition = barabar hisse (16.7%) ka ${(max / (1e6 / 6)).toFixed(2)}×. Top user akela: ${(1 / w[N - 1] * 100).toFixed(1)}% events.`);
  console.log('→ Ek garam key ek hi partition par jaati hai; partitions badhane se garam key nahi bant-ti.');
}

console.log('\nD. ASLI ginti: partitions 6 → 8. Kitni keys nayi partition mein chali gayi? (1 lakh user ids, Kafka murmur2)\n');
{
  let moved = 0;
  for (let i = 0; i < 1e5; i++) if (partitionFor('user-' + i, 6) !== partitionFor('user-' + i, 8)) moved++;
  console.log(`${n(moved)} of 1,00,000 keys (${(moved / 1e3).toFixed(1)}%) ki partition badli.`);
  console.log('→ Purani partition mein us user ke bina padhe events + nayi partition mein naye events = badlaav ke waqt kram toot sakta hai.');
  console.log('  Isliye partitions shuru mein soch kar rakho (ya badlaav se pehle producers rok kar purane events khatam karo).');
}
