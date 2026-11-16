'use strict';
const { run, theoryTouched } = require('../lib/fanout');
console.log('MODEL (seeded, 1 lakh requests): har service call 1–3 ms, par 1% calls ko 50 ms ka jhatka (GC, packet dobara bhejna).');
console.log('Ek user request ko kitni services se jawab chahiye — ek ke baad ek (sequential) ya saath-saath (parallel fan-out)?\n');
console.log('services   sequential p50 / p99      parallel p50 / p99     kitni requests ko kam se kam ek jhatka (theory)');
for (const n of [1, 3, 10, 30]) {
  const s = run({ calls: n, mode: 'sequential' }), p = run({ calls: n, mode: 'parallel' });
  console.log(`${String(n).padStart(8)}   ${s.p50.toFixed(1).padStart(6)} / ${s.p99.toFixed(1).padStart(6)} ms       ${p.p50.toFixed(1).padStart(5)} / ${p.p99.toFixed(1).padStart(5)} ms        ${(s.touched * 100).toFixed(1).padStart(5)}%  (${(theoryTouched(n) * 100).toFixed(1)}%)`);
}
const sh = run({ calls: 10, mode: 'parallel', shared: true });
console.log(`\nSaanjha jhatka (ek hi pause, jaise caller ka GC, saari 10 calls par): ${(sh.touched * 100).toFixed(1)}% requests — 9.6% nahi.`);
console.log('\nMaanyatayein: jhatke alag-alag (independent), har jawab zaroori, koi bheed nahi, jhatka theek 50 ms.');
console.log('\n→ Video: "10 services × 2 ms = 20 ms network tax". Tab sahi jab calls ek ke baad ek hon; parallel mein median sabse dheemi');
console.log('  call jitna. Fan-out se kisi dheemi call se takraane ka chance badhta hai: alag-alag jhatke hon toh 10 calls par ~9.6%');
console.log('  (1 − 0.99^10). Is model mein jhatka 50 ms par ruk jaata hai, isliye parallel ka p99 50 ms hi rehta hai — badhta hai');
console.log('  dheemi requests ka hissa. Jhatke saanjhe hon toh exposure kam. Bada pattern: Dean & Barroso, "The Tail at Scale" (2013).');
