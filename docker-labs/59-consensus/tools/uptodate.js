'use strict';
// ex4-up-to-date — MODEL (seeded): commit ho chuki entry X, leader mara; naya leader X wala ho ya bina X wala?
const { run } = require('../lib/uptodate');
const f = n => n.toLocaleString('en-IN');
console.log('5 nodes. Entry X leader 1 + 2 followers par (majority) → committed, client ko "ho gaya". Leader 1 mara.');
console.log('Nodes 2–5 mein se 2 ke paas X, 2 ke paas nahi. 10,000 baar, timers ka kram random.\n');
console.log('vote ka niyam                                   committed X kho gaya     extra election rounds');
for (const [rule, name] of [[false, 'koi bhi candidate, pehle aaye ko vote'], [true, 'candidate ka log mere jitna naya ho (§5.4.1)']]) {
  const s = run(rule);
  console.log(`${name.padEnd(46)}  ${f(s.lost).padStart(5)} (${(100 * s.lost / s.trials).toFixed(1)}%)           ${f(s.extraRounds)}`);
}
console.log(`
Bina niyam: pehle timer wala node leader banta hai — aadhe baar bina X wala node. Naya leader followers se apna
log copy karwata hai → X mit jaata hai, jabki client ko "ho gaya" bola ja chuka tha.
Niyam ke saath: X wale nodes bina X wale candidate ko vote nahi dete; bina X wala 3 votes nahi jod sakta (khud + 1).
Kyunki X majority par hai, har jeetne layak majority mein kam se kam ek X wala voter hota hai. Keemat: kuch extra rounds.`);
