'use strict';
// ex4: A (MODEL) cache crash → herd on the DB; B (ASLI Bloom filter, counted) cache penetration.
const { run, KEYS, CACHE, CAP } = require('../lib/herd');
const { scenario, bloom } = require('../lib/penetration');
const n = x => Math.round(x).toLocaleString('en-IN');

console.log(`A. MODEL (10 ms ticks): 10,000 reads/sec, ${n(KEYS)} keys (Zipf s = 1.2), LRU cache ${n(CACHE)} keys (~92% hits).`);
console.log(`   DB: ${n(CAP)} reads/sec. User 1 s baad haar maanta hai, par DB woh kaam karta rehta hai. Queue > 3 s ka kaam → DB crash,`);
console.log('   30 s mein wapas. t = 30 s par cache server crash, khaali wapas aaya. 300 s dekha.\n');
const S = [
  ['none', 'kuch nahi'],
  ['none-cold', 'kuch nahi, aur har DB restart par cache bhi khaali'],
  ['coalesce', 'request coalescing (ek key = ek DB read)'],
  ['limit', 'DB ke aage limiter (queue bhari → turant "baad mein")'],
  ['limit+coalesce', 'limiter + coalescing'],
  ['warm', 'warming: users ko roko, hot keys pehle bharo'],
];
console.log('tareeka                                                DB crash   requests serve hui   bekaar DB kaam   wapas ≥85% hits');
const runs = {};
for (const [s, label] of S) {
  const x = runs[s] = run(s === 'none-cold' ? { strategy: 'none', coldRestart: true } : { strategy: s });
  console.log(`${label.padEnd(54)} ${String(x.crashes).padStart(5)}      ${(x.served * 100).toFixed(1).padStart(6)}%            ${n(x.wasted).padStart(7)}        ${x.backAt === null ? 'kabhi nahi' : x.backAt.toFixed(0) + ' s baad'}`);
}
console.log('\nTimeline (har 5 s): hit rate %, D = DB band');
for (const s of ['none', 'none-cold', 'limit', 'warm']) console.log(`${s.padEnd(9)} ${runs[s].perSec.slice(25, 115).filter((p, i) => i % 5 === 4).map(p => (p.up ? '' : 'D') + (p.hit * 100).toFixed(0)).join(' ')}`);
console.log('\n→ Cache gaya toh misses ~8% se lagbhag 100%; DB ki queue badhi, 1 s se purane jawab bekaar (user ja chuka), DB gira. DB band = cache');
console.log('  bhar nahi sakta = DB lautte hi phir wahi bojh. Cache ne jo bhara woh rakha toh loop do crash baad toota; har restart par');
console.log('  cache bhi khaali ho toh loop chalta hi raha (video ka scenario).');
console.log('→ Limiter (load shedding) asli dhaal hai: kuch users ko turant "baad mein", par DB zinda, cache bharta rehta hai.');
console.log('  Coalescing akele kaafi nahi (alag-alag keys ke misses phir bhi bahut). Warming: crash ke baad users ko rokna padta hai');
console.log('  (yahan 13 s); deploy jaise planned restart mein naya cache purane ke chalte-chalte bharo — wahan warming sabse sasta.');

console.log('\nB. ASLI Bloom filter: users 1 … 10,00,000 DB mein. Filter: 10 bits/key, 7 probes. Cache penetration = na-maujood ids.\n');
const N = 1e6, b = bloom(N, 10);
for (let i = 1; i <= N; i++) b.add(i);
let fp = 0; const t0 = process.hrtime.bigint();
for (let i = 0; i < 1e6; i++) if (b.has(3e7 + i * 7)) fp++;
const ns = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`Filter: ${(b.bytes / 1e6).toFixed(2)} MB. 10 lakh na-maujood ids mein "shayad hai": ${(fp / 1e4).toFixed(2)}% (theory ${(b.theory() * 100).toFixed(2)}%). Ek lookup ~${ns.toFixed(0)} ns.\n`);
const attack = [], bug = [];
for (let i = 0; i < 1e6; i++) attack.push(2e6 + i * 13);                 // every id new
for (let i = 0; i < 1e6; i++) bug.push(5e6 + (i % 1000) * 7919);         // same 1,000 missing ids, again and again
const a = scenario(attack, { N, b }), g = scenario(bug, { N, b });
console.log('DB tak kitni queries (10 lakh requests)        attack: har id nayi     bug: wahi 1,000 ids baar-baar');
for (const [k, label] of [['none', 'kuch nahi'], ['negative', 'negative cache ("nahi mila" 60 s)'], ['bloom', 'Bloom filter'], ['bloom+negative', 'Bloom + negative cache']])
  console.log(`${label.padEnd(44)} ${n(a[k].db).padStart(12)}             ${n(g[k].db).padStart(12)}`);
const newIds = new Set(), fresh = [];
for (let i = 1; i <= 1000; i++) newIds.add(N + i);
for (let i = 0; i < 1e5; i++) fresh.push(N + 1 + (i % 1000));
const stale = scenario(fresh, { N, b, newIds }).bloom.wrongNo;
const b2 = bloom(N + 1000, 10); for (let i = 1; i <= N + 1000; i++) b2.add(i);
const upd = scenario(fresh, { N, b: b2, newIds }).bloom.wrongNo;
console.log(`\nNaye 1,000 users signup (1 lakh requests): filter update nahi kiya → ${n(stale)} asli requests galti se "nahi hai"; signup par add kiya → ${n(upd)}.`);
console.log('\n→ Har baar nayi id (attack): negative cache bekaar, Bloom filter ~99% rokta hai. Wahi ids baar-baar: negative cache kaafi.');
console.log('→ Bloom ka "shayad" wala hissa DB tak jaata hai; Bloom + negative cache dono kamzoriyan dhakte hain.');
console.log('→ Bloom ko har insert par update karna zaroori; delete support nahi (uske liye counting Bloom ya rebuild).');
