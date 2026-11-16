'use strict';
const { run } = require('../lib/deadline');
const s = ms => `${(ms / 1000).toFixed(1)} s`;
console.log('A. Arithmetic: user 10 s rukta hai. Har koshish ka timeout 3 s. Backoff video wala: 2 s, 4 s, 8 s.\n');
let t = 0, k = 0; const rows = [];
for (const wait of [0, 2, 4, 8]) { t += wait; const end = t + 3; rows.push(`koshish ${++k}: ${t}–${end} s ${end <= 10 ? '✓ deadline ke andar' : '✗ user ja chuka (bekaar)'}`); t = end; }
rows.forEach(r => console.log('  ' + r));
console.log('→ 10 s ki deadline mein sirf 2 koshishein fit. Retries ka total samay deadline se bada ho toh baaki retries bekaar kaam hain.\n');
console.log('B. ASLI ginti (ek request ki timeline): user → A → B → C. C ek baar 20 s latak gaya. User 10 s par chala jaata hai.');
console.log('   Har layer 3 koshish, beech mein 100 ms backoff. "Deadline aage" = caller ka intezaar khatam hone ka samay call ke saath jaata hai.');
console.log('   "Cancel" = neeche wala us samay par apna kaam rok deta hai (cooperative cancellation).\n');
const P = [['naive', 'lambe timeouts (30 s)'], ['timeouts', 'chhote timeouts (A→B 3 s, B→C 1 s)'],
  ['no-cancel', 'chhote timeouts + deadline aage, C cancel nahi maanta'], ['deadline', 'chhote timeouts + deadline aage + C cancel maanta']];
console.log('tareeka                                                C par calls   thread-samay A / B / C        C ka bekaar kaam   user ke jaane ke baad');
for (const [p, label] of P) {
  const r = run({ policy: p }), z = r.afterUser.A + r.afterUser.B + r.afterUser.C;
  console.log(`${label.padEnd(54)} ${String(r.calls.C).padStart(6)}       ${s(r.held.A).padStart(6)} / ${s(r.held.B).padStart(6)} / ${s(r.held.C).padStart(7)}    ${s(r.cWasted).padStart(9)}        ${s(z).padStart(7)}`);
}
console.log('\n→ Lambe timeouts: teeno threads 20 s atke, user 10 s par ja chuka (C ka jawab B tak pahuncha, par user tak nahi).');
console.log('→ Chhote timeouts: A aur B jaldi chhodte hain, par timeout sirf caller ka intezaar khatam karta hai — C ko pata nahi. Har retry C par');
console.log('  naya 20 s ka kaam (3 × 3 = 9 calls): ~128 s kaam user ke jaane ke baad (video ka shabd: zombie processing).');
console.log('→ Deadline aage bhejna akele kaafi nahi: C cancel na maane toh utna hi bekaar kaam. C deadline par ruke tabhi bekaar kaam ghata —');
console.log('  is run mein C har call ki 1 s ki deadline par rukta hai. gRPC deadline bhejta hai, par kaam rokna application ki zimmedari.');
