'use strict';
// ex4 — going global: hedged requests (seeded model), what a quorum write waits for (arithmetic, assumed RTTs),
// and conflicts across regions (real merge code on tiny records).
const G = require('../lib/global');
const f1 = x => x.toFixed(1);
const VC = { concurrent: 'saath-saath hue (concurrent)', 'a-newer': 'pehla naya (doosre ko dekh chuka)', 'b-newer': 'doosra naya', equal: 'barabar' };

console.log('ex4 — duniya bhar mein (hedging: seeded model; RTT maane hue; conflicts: asli merge code)\n');
console.log('1) Ek page = 100 shards se jawab (sab chahiye). Har shard: median 10 ms, p95 ~20 ms, 1% chance 200 ms ka jhatka. 20,000 pages:');
console.log('   tareeka                                          page p50    page p99    100 ms se dheeme pages    extra requests');
for (const [label, o] of [['hedge nahi', {}], ['20 ms baad replica se bhi poochho (jhatke aazaad)', { hedgeAfterMs: 20 }],
  ['  … par aadhe jhatkon ka kaaran replica par bhi', { hedgeAfterMs: 20, correlated: 0.5 }], ['  … har jhatka replica par bhi', { hedgeAfterMs: 20, correlated: 1 }]]) {
  const p = G.page(o);
  console.log(`   ${label.padEnd(48)} ${(f1(p.p50) + ' ms').padStart(9)}   ${(f1(p.p99) + ' ms').padStart(9)}   ${((p.slowPages * 100).toFixed(2) + '%').padStart(22)}    ${((p.extraLoad * 100).toFixed(1) + '%').padStart(12)}`);
}
console.log(`   Video: (1%)² → "0.001 ya 0.01%" — sahi 0.0001 = 0.01%; 100 shards par 1 − 0.9999¹⁰⁰ = ${((1 - 0.9999 ** 100) * 100).toFixed(3)}% — model se mel.
   → Hedge ~5% extra requests mein 200 ms ke jhatke kaat deta hai — par tabhi jab replica ka jhatka alag ho. Saath hi page ka p50
     ~30 ms ho jaata hai: 100 shards mein lagbhag hamesha koi na koi 20 ms paar karta hai, aur hedge 20 ms ke baad hi jaata hai.
     Replica thoda purana data de sakta hai (replication lag); jo request dobara chalna safe nahi, use hedge mat karo.\n`);

console.log('2) Strongly consistent write (Spanner jaisa, ek Paxos group): majority ka "haan" + commit wait (~2ε, Paxos ke saath-saath).');
console.log('   TrueTime [now − ε, now + ε] deta hai; ε = 7 ms maano toh commit wait ~14 ms — ε khud nahi, interval ki poori chaudai.');
console.log('   Maane hue round trips: Tokyo↔Virginia ~150 ms, Tokyo↔Frankfurt ~230 ms. Leader Tokyo, 3 voting regions:');
console.log(`   write ≈ ${G.quorumWriteMs([150, 230])} ms (sabse paas wale doosre region ka round trip) — video ka "sirf 7 ms" nahi.`);
console.log(`   Regions paas-paas (round trip 2–3 ms): write ≈ ${G.quorumWriteMs([2, 3])} ms — tab commit wait (2ε) hi bada hissa.`);
console.log('   (Disk, CPU aur kai Paxos groups wale transaction ka kharcha is hisaab mein nahi.)');
console.log('   Async replication (video ka AP raasta): local commit ~5 ms, baaki regions baad mein.');
console.log('   → Spanner ka synchronous Paxos cross-region round trip deta hai; TrueTime ka commit wait us ke saath-saath chalta hai. Isliye asli setups');
console.log('     voting replicas ek-do paas ke regions mein rakhte hain. Lock-free snapshot reads local ho sakte hain jab replica utna up-to-date ho.\n');

console.log('3) Ek business profile, do regions, lagbhag ek saath (Tokyo ki ghadi 5 ms aage — maana):');
const tokyo = { region: 'tokyo', ts: 1005, cells: { bio: { v: 'hello Asia', ts: 1005, w: 'tokyo' } } };       // asli samay 1000, ghadi +5
const paris = { region: 'paris', ts: 1003, cells: { phone: { v: '+33 222', ts: 1003, w: 'paris' } } };         // asli samay 1003
const base = { bio: { v: 'purana bio', ts: 0, w: 'seed' }, phone: { v: '+33 111', ts: 0, w: 'seed' } };
const row = G.lwwRow({ ...tokyo, cells: { ...base, ...tokyo.cells } }, { ...paris, cells: { ...base, ...paris.cells } });
console.log(`   alag field — bio (Tokyo), phone (Paris):`);
console.log(`     poori row, LWW (video ka model): bio "${row.cells.bio.v}", phone "${row.cells.phone.v}" → Paris ka phone gaya`);
const cell = G.lwwCell({ cells: { ...base, ...tokyo.cells } }, { cells: { ...base, ...paris.cells } });
console.log(`     har column ka LWW (Cassandra aise karta hai): bio "${cell.bio.v}", phone "${cell.phone.v}" → dono bache`);
const sameT = { bio: { v: 'hello Asia', ts: 1005, w: 'tokyo' } }, sameP = { bio: { v: 'bonjour', ts: 1003, w: 'paris' } };
console.log(`   same field — Tokyo "hello Asia" (asli 1000), Paris "bonjour" (asli 1003, yaani baad mein):`);
console.log(`     LWW: "${G.lwwCell({ cells: sameT }, { cells: sameP }).bio.v}" jeeta — ghadi 5 ms aage thi, isliye pehle wala jeet gaya`);
console.log(`     vector clock: Tokyo {tokyo:1} vs Paris {paris:1} → ${VC[G.compareVC({ tokyo: 1 }, { paris: 1 })]} → dono rakho, app ya user tay kare`);
console.log(`     baad ka edit jisne pehla dekha tha: {tokyo:1, paris:1} vs {tokyo:1} → ${VC[G.compareVC({ tokyo: 1, paris: 1 }, { tokyo: 1 })]}`);
const tieA = { bio: { v: 'A', ts: 1000, w: 'tokyo' } }, tieB = { bio: { v: 'B', ts: 1000, w: 'paris' } };
console.log(`   barabar timestamp (1000 = 1000): A pehle aaye toh "${G.lwwCell({ cells: tieA }, { cells: tieB }).bio.v}", B pehle aaye toh "${G.lwwCell({ cells: tieB }, { cells: tieA }).bio.v}" — writer id se tay, har replica par same`);
console.log('   → LWW ka nuksaan poori row par lagao toh zyada; Cassandra column-level hai. Ghadi ka farq jeet tay kar deta hai,');
console.log('     aur barabar timestamp par ek pakka niyam chahiye (lab: writer id; Cassandra: value ki tulna) — warna replicas alag rahenge.');
console.log('     Vector clock "saath-saath hua" pakad leta hai; merge phir bhi kisi ko likhna padta hai (likes jaise counter ke liye G-Counter, ex2).');
