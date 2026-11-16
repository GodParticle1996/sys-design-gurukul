'use strict';
const { run, amplification } = require('../lib/metastable');
const n = x => Math.round(x).toLocaleString('en-IN');
console.log('A. MODEL (1 s ke kadam): server 1,000 kaam/sec karta hai. 1,000 se zyada aayein toh har request shuru hoti hai, par timeout');
console.log('   wali requests ka kaam bekaar — kaam ki raftaar girti hai (maana hua: useful = 1,000 × 1,000 / load). Naye requests 800/sec;');
console.log('   t = 10–20 s par spike 1,500/sec. Ek request kul 4 koshish tak. 120 s dekha. "Wapas" = bojh lagaataar 10 s ≤ 1,000.\n');
const P = [
  ['none', {}, 'retry nahi'],
  ['immediate', {}, 'turant retry'],
  ['backoff', { backoffS: 1 }, 'backoff + full jitter, windows 2 / 4 / 8 s'],
  ['backoff', { backoffS: 16 }, 'backoff + full jitter, windows 32 / 64 / 128 s'],
  ['budget', {}, 'retry token bucket: har naya request 0.1 token'],
];
console.log('tareeka                                          serve hui   calls ÷ naye   spike ke baad wapas   t = 80 s par bojh');
for (const [p, o, label] of P) {
  const r = run({ policy: p, ...o }), late = r.timeline.find(x => x.t === 80);
  const back = r.recoveredAt === null ? '120 s mein nahi' : r.recoveredAt + ' s baad';
  console.log(`${label.padEnd(48)} ${(r.ok / r.fresh * 100).toFixed(1).padStart(6)}%   ${r.amp.toFixed(2).padStart(8)}×      ${back.padEnd(18)} ${n(late.load).padStart(7)}/sec`);
}
console.log('\n→ Spike 10 s ka tha, par turant retry ke saath bojh ~2,500/sec par atka (naye sirf 800/sec): har fail request retries laati');
console.log('  hai, overload mein kaam ki raftaar girti hai, aur zyada fail. Is loop ko metastable failure kehte hain — trigger gaya,');
console.log('  girawat rahi (Bronson et al., HotOS 2021; Amazon Builders\' Library bhi kehti hai ki retries recovery ko der karwa sakte hain).');
console.log('→ Chhote backoff windows (2 / 4 / 8 s) is run mein loop nahi todte. Bade windows (32 / 64 / 128 s) todte hain aur aakhir mein zyada');
console.log('  requests serve hoti hain — par user ko jawab minuton baad. Token bucket retries ko naye traffic ke 10% tak baandhta hai:');
console.log('  turant wapas, par kuch requests retry ke bina fail. Backoff samay phailaata hai; bucket ginti baandhta hai — dono alag auzaar.\n');
console.log('B. MODEL: naye requests kitne hon toh system 120 s ke andar wapas aaye?\n');
console.log('naye/sec   turant retry      backoff 2/4/8 s     token bucket');
for (const b of [500, 600, 700, 800, 900]) {
  const f = (p, o = {}) => { const r = run({ policy: p, base: b, ...o }); return r.recoveredAt === null ? '120 s mein nahi' : r.recoveredAt + ' s'; };
  console.log(`${String(b).padStart(7)}   ${f('immediate').padStart(15)}   ${f('backoff').padStart(15)}   ${f('budget').padStart(14)}`);
}
console.log('\n→ Jitna kam khaali margin, utna bada khatra. Kaam ki raftaar ka curve model ka maana hua hai; asli system ka margin naapo.\n');
console.log('C. Arithmetic: har koshish f hissa fail ho (alag-alag), toh 4 koshishon tak bojh = 1 + f + f² + f³ (ek layer).\n');
for (const f of [0.1, 0.5, 0.9, 1]) console.log(`f = ${String(f).padEnd(4)} → ${amplification(f, 4).toFixed(2)}×`);
console.log('→ Video: "10% fail → seconds mein 100% outage". Sirf 10% par bojh 1.11× hai; khatra tab jab overload se f khud badhe (A).');
console.log('  Kai layers retry karein toh guna hota hai: 3 layers × 3 koshish = 27× (lab 37 ex3).');
