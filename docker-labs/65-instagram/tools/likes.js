'use strict';
// ex2 — the like button: hot row vs counter rows vs memory, retries, and counters across regions (models + real merge code).
const L = require('../lib/likes');
const n = x => x.toLocaleString('en-IN');

console.log('ex2 — like button (1 ms ka time-step model; maana: ek viral photo par 10,000 likes/s, saath mein 20,000 feed requests/s,');
console.log('      app ke paas ek saanjha worker pool, timeout 5 s; har like ek worker pakadta hai jab tak store jawab na de)\n');
console.log('1) 10 second, ek viral photo — 1,00,000 likes. Har like ek hi bucket mein: hua / worker na mila / timeout / abhi line mein:');
console.log('   store, workers, kaun pehle worker le          hua      na mila   timeout   line mein   feed fail    pehla feed fail');
const cases = [
  ['1 row, 2,000, likes pehle', { perMs: 1 }],
  ['1 row, 2,000, baari-baari', { perMs: 1, admit: 'interleaved' }],
  ['1 row, 2,000, feed pehle', { perMs: 1, admit: 'feeds-first' }],
  ['1 row, 60,000, likes pehle', { perMs: 1, workers: 60000 }],
  ['100 counter rows, 2,000, likes pehle', { perMs: 100 }],
];
for (const [label, o] of cases) {
  const v = L.viral(o);
  console.log(`   ${label.padEnd(42)} ${n(v.ok).padStart(7)}   ${n(v.noWorker).padStart(7)}   ${n(v.timedOut).padStart(7)}   ${n(v.waiting).padStart(9)}   ${n(v.feedFail).padStart(9)}    ${v.firstFeedFailMs === null ? '—' : v.firstFeedFailMs + ' ms'}`);
}
console.log('   → Garam row har haal mein ~1,000 likes/s (row ka lock ~1 ms). Baaki asar pool ke niyam par: likes ko pehle worker mile');
console.log('     toh 177 ms mein pool bhara aur feed gira; feed ko pehle mile toh feed bacha, likes turant mana; 60,000 workers par');
console.log('     feed bacha par 40,002 likes 5 s baad timeout. Ek saanjha pool ek photo ki dikkat ko poori app mein faila sakta hai —');
console.log('     likes ko alag pool (bulkhead, lab 39) do. Asli ilaaj store ki raftaar: 100 counter rows par sab theek.\n');

console.log('2) Redis jaisa memory counter + har 5 s ek batch write (write coalescing):');
console.log(`   DB par is photo ke writes: 10,000/s → 0.2/s (har 5 s mein ek UPDATE … + delta).`);
console.log(`   Keemat: Redis bina persistence ke gire toh aakhri 5 s ke likes ja sakte (is photo ke ~${n(5 * 10000)}; poore platform par peak par ~${n(Math.round(5 * 173611))}).\n`);

const r = L.retries();
console.log('3) Tunnel: reply kho gaya (2%), phone ne same like dobara bheja (seeded, 10 lakh likes):');
console.log(`   asli likes ${n(r.truth)} · counter +1 ${n(r.counter)} (${((r.counter / r.truth - 1) * 100).toFixed(1)}% zyada) · set mein user id ${n(r.set)}`);
console.log('   → like ek haalat hai (user ne like kiya ya nahi), event nahi. Set mein dobara daalna kuch nahi badalta — idempotent.\n');

const g = L.regions();
console.log('4) Teen regions, ek photo: Tokyo 5,000, Frankfurt 3,000, Virginia 1,000 likes (har like sirf ek region mein gina).');
console.log('   Regions apni state ki copy bhejte hain; copy der se, ulte kram mein, kabhi do baar pahunchti hai; ant mein sab pahunchti hain (seeded):');
for (const [k, label] of [['lww', 'last write wins (poora number)'], ['naive', 'aaye hue naye likes jodte jao'], ['gcounter', 'G-Counter (har region ka slot, merge = max)']])
  console.log(`   ${label.padEnd(44)} ${L.REGIONS.map(x => `${x} ${n(g[k][x])}`).join(' · ')}`);
console.log(`   → sahi jawab ${n(g.truth)}. G-Counter purani copy, ulte kram aur dohraav ke baad bhi har region par sahi jawab tak pahunchta hai.`);
const x = L.crossRegionRetry();
console.log(`   Shart: har like ek hi region mein gina jaaye. Ek user ka like Tokyo mein, retry Frankfurt mein → G-Counter ${x.counter},`);
console.log(`   user id ka set (union se merge) ${x.set}. Unlike ke liye sirf badhne wala counter/set kaafi nahi — OR-Set jaisa CRDT (lab 58).`);
