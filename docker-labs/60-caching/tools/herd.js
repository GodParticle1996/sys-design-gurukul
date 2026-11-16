'use strict';
// ex4: A (MODEL) cache crash → herd on the DB; B (ASLI Bloom filter, counted) cache penetration.
const { run, KEYS, CACHE, CAP } = require('../lib/herd');
const { scenario, bloom } = require('../lib/penetration');
const n = x => Math.round(x).toLocaleString('en-IN');

console.log(`A. MODEL (10 ms ticks): 10,000 reads/sec, ${n(KEYS)} keys (Zipf s = 1.2), LRU cache ${n(CACHE)} keys (~92% hits).`);
console.log(`   DB: ${n(CAP)} reads/sec. Har user 1 s baad haar maanta hai (apni deadline), par DB queue ka kaam karta rehta hai. Queue > 3 s ka`);
console.log('   kaam → DB crash, 30 s mein wapas. t = 30 s par cache server crash, khaali wapas aaya. 300 s dekha. Har tareeke par same requests.');
console.log('   "late fill" = timeout ke baad pahuncha DB jawab bhi cache bharta hai (jab handler cancel nahi hota); "phenka" = jawab bekaar.\n');
const S = [
  ['kuch nahi (late fill)', { strategy: 'none' }],
  ['kuch nahi (late jawab phenka)', { strategy: 'none', lateFill: false }],
  ['kuch nahi + har DB restart par cache bhi khaali*', { strategy: 'none', coldRestart: true }],
  ['request coalescing (late fill)', { strategy: 'coalesce' }],
  ['request coalescing (late jawab phenka)', { strategy: 'coalesce', lateFill: false }],
  ['DB ke aage limiter (queue bhari → turant "baad mein")', { strategy: 'limit' }],
  ['limiter + coalescing', { strategy: 'limit+coalesce' }],
  ['warming: users ko mana, hot keys pehle bharo', { strategy: 'warm' }],
];
console.log('tareeka                                                DB crash   requests serve hui   bekaar DB reads   wapas ≥85% hits');
const runs = {};
for (const [label, o] of S) {
  const x = runs[label] = run(o);
  console.log(`${label.padEnd(54)} ${String(x.crashes).padStart(5)}      ${(x.served * 100).toFixed(1).padStart(6)}%            ${n(x.wasted).padStart(7)}        ${x.backAt === null ? 'kabhi nahi' : x.backAt.toFixed(0) + ' s baad'}`);
}
const W = runs['warming: users ko mana, hot keys pehle bharo'];
console.log(`\n* Video kehta hai cache cold rehta hai; "har restart par khaali" ek alag maana hua scenario hai. Warming: users ${W.gatedSec.toFixed(1)} s tak mana.`);
console.log('"Bekaar DB reads" = DB ne padha, par us waqt koi user intezaar mein nahi tha.');
console.log('\nTimeline (har 5 s): hit rate %, D = DB band');
for (const [k, label] of [['none', 'kuch nahi (late fill)'], ['none-cold', 'kuch nahi + har DB restart par cache bhi khaali*'], ['limit', 'DB ke aage limiter (queue bhari → turant "baad mein")'], ['warm', 'warming: users ko mana, hot keys pehle bharo']])
  console.log(`${k.padEnd(9)} ${runs[label].perSec.slice(25, 115).filter((p, i) => i % 5 === 4).map(p => (p.up ? '' : 'D') + (p.hit * 100).toFixed(0)).join(' ')}`);
console.log('\n→ Cache gaya toh misses ~8% se lagbhag 100%; DB ki queue badhi, 1 s se purane users ja chuke, DB gira. DB band = cache bhar nahi');
console.log('  sakta. Har restart par cache bhi khaali ho toh loop chalta hi raha.');
console.log('→ Limiter (load shedding) sabse tez dhaal: kuch users ko turant "baad mein", DB zinda, 4 s mein wapas — late fill policy');
console.log('  kuch bhi ho. Coalescing bhi is model mein DB ko bachata hai (hot keys ke dohraaye misses ek read), par wapsi late fill');
console.log('  policy par tiki hai (11 s vs 51 s). Warming: crash ke baad users ko mana karna padta hai; deploy jaise planned restart mein');
console.log('  naya cache purane ke chalte-chalte bharo — wahan warming sabse sasta.');

console.log('\nB. ASLI Bloom filter: users 1 … 10,00,000 DB mein. Filter: 10 bits/key, 7 probes. Cache penetration = na-maujood ids.\n');
const N = 1e6, b = bloom(N, 10);
for (let i = 1; i <= N; i++) b.add(i);
let fp = 0; const t0 = process.hrtime.bigint();
for (let i = 0; i < 1e6; i++) if (b.has(3e7 + i * 7)) fp++;
const ns = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`Filter: ${(b.bytes / 1e6).toFixed(2)} MB. 10 lakh na-maujood ids mein se "shayad hai": ${(fp / 1e4).toFixed(2)}% (theory ${(b.theory() * 100).toFixed(2)}%). Ek lookup ~${ns.toFixed(0)} ns.\n`);
const attack = [], bug = [];
for (let i = 0; i < 1e6; i++) attack.push(2e6 + i * 13);                 // every id new
for (let i = 0; i < 1e6; i++) bug.push(5e6 + (i % 1000) * 7919);         // same 1,000 missing ids, again and again
const a = scenario(attack, { N, b }), g = scenario(bug, { N, b });
console.log('MODEL ginti (koi asli DB nahi; 1,000 requests/sec, 10 lakh requests = ~17 minute):');
console.log('DB tak kitni queries                            attack: har id nayi     bug: same 1,000 ids baar-baar');
for (const [k, label] of [['none', 'kuch nahi'], ['negative', 'negative cache ("nahi mila" 60 s)'], ['bloom', 'Bloom filter'], ['bloom+negative', 'Bloom + negative cache']])
  console.log(`${label.padEnd(44)} ${n(a[k].db).padStart(12)}             ${n(g[k].db).padStart(12)}`);
const newIds = new Set(), fresh = [];
for (let i = 1; i <= 1000; i++) newIds.add(N + i);
for (let i = 0; i < 1e5; i++) fresh.push(N + 1 + (i % 1000));
const stale = scenario(fresh, { N, b, newIds }).bloom.wrongNo;
const b2 = bloom(N + 1000, 10); for (let i = 1; i <= N + 1000; i++) b2.add(i);
const upd = scenario(fresh, { N, b: b2, newIds }).bloom.wrongNo;
console.log(`\nNaye 1,000 users signup (1 lakh requests): filter update nahi kiya → ${n(stale)} asli requests galti se "nahi hai"; signup par add kiya → ${n(upd)}.`);
console.log('Negative cache ka khatra: id X "nahi mila" cache hua, phir X ne signup kiya — create par negative entry na mitaayi toh 60 s tak "nahi hai".');
console.log('\n→ Har baar nayi id (attack): negative cache bekaar, Bloom filter ~99% rokta hai. Same ids baar-baar: negative cache har 60 s');
console.log('  mein ek DB query per id. Bloom ka "shayad" wala hissa DB tak jaata hai; dono saath sabse kam.');
console.log('→ Bloom ko har insert par update karna zaroori; delete support nahi (uske liye counting Bloom ya rebuild).');
