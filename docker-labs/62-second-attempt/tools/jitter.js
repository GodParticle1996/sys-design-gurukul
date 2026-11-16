'use strict';
const { average } = require('../lib/jitter');
const n = x => Math.round(x).toLocaleString('en-IN');
const ms = x => x < 2000 ? `${n(x)} ms` : `${(x / 1000).toFixed(1)} s`;
console.log('MODEL (seeded, 20 runs ka ausat): saral "slot" model — Brooker (AWS, 2015) ke OCC simulation se prerit, uski nakal nahi.');
console.log('Saare clients t = 0 par ek hi row likhte hain. Har 1 ms slot mein kai calls aayein toh EK jeetti hai, baaki fail hokar backoff.');
console.log('Backoff = min(1 s, 10 ms × 2^koshish). Har retry par 0–4 ms ka random network delay bhi.\n');
const S = [['none', 'jitter nahi (sirf exponential)'], ['small', 'chhota jitter: backoff × 0.8–1.2 (video ka "2 s + thoda")'],
  ['equal', 'equal jitter: aadha + random(0, aadha)'], ['full', 'full jitter: random(0, backoff)'], ['decorrelated', 'decorrelated: random(10 ms, pichhla × 3)']];
console.log('tareeka                                                   20 clients: calls / samay     100 clients: calls / samay');
for (const [s, label] of S) {
  const a = average({ strategy: s, clients: 20 }), b = average({ strategy: s, clients: 100 });
  console.log(`${label.padEnd(57)} ${n(a.calls).padStart(6)} / ${ms(a.ms).padStart(8)}        ${n(b.calls).padStart(6)} / ${ms(b.ms).padStart(8)}`);
}
const z = average({ strategy: 'none', clients: 100, netMs: 0 });
console.log(`\nNetwork delay 0 ho toh bina jitter: 100 clients = ${n(z.calls)} calls (N(N+1)/2 — sab har baar bilkul ek saath; model ki banawat).`);
console.log('\n→ Bina jitter sabse bura (video sahi; Brooker ne bhi no-jitter ko "clear loser" kaha): clients ek jaisa rukte, saath lautte.');
console.log('  Network ki thodi variance kuch takkar todti hai, par jitter wali strategies phir bhi kai guna kam calls aur samay lete hain.');
console.log('→ Jitter wali strategies aapas mein kareeb hain; unka kram is model mein slot ki chaudai par tika hai (Brooker ke asli');
console.log('  simulation mein decorrelated ne full se zyada kaam kiya). "random(0, backoff)" — full jitter — ek achha default hai.');
