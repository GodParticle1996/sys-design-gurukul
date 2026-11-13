'use strict';
// ex1-partition — MODEL (seeded): 5 nodes, network {1,2,3} | {4,5}. 1,000 accounts × ₹100. Har account par dono taraf
// ek-ek ATM ek saath ₹10–100 nikaalta hai; saath mein 2,000 balance checks (60% majority taraf). Asli ATM network nahi.
const { run, POLICIES } = require('../lib/bank');
const f = n => n.toLocaleString('en-IN');
console.log('niyam              withdraw OK (maj/min)   mana (maj/min)   balance check error   diya ₹      kitaab mein ₹   kitaab se gayab ₹   minus accounts   ₹100 se zyada diya ₹');
for (const p of POLICIES) {
  const s = run(p);
  console.log(`${p.padEnd(17)}  ${(f(s.served.maj) + ' / ' + f(s.served.min)).padEnd(22)}  ${(f(s.refused.maj) + ' / ' + f(s.refused.min)).padEnd(15)}  ${f(s.readErr.min).padStart(5)} (min taraf)       ${f(s.paid).padEnd(10)}  ${f(s.recorded).padEnd(14)}  ${f(s.unrecorded).padEnd(18)}  ${f(s.overdrawn).padEnd(15)}  ${f(s.beyond)}`);
}
console.log(`
CP: 2 nodes wali taraf quorum (3 of 5) nahi bana sakti → har withdrawal aur balance check mana. Paisa kabhi zyada nahi gaya.
AP + LWW: dono taraf ne apna BALANCE likha; jodne par baad wala balance jeeta → ek withdrawal kitaab se gayab.
AP + ledger: dono withdrawals kitaab mein (CRDT jaisa); account minus mein dikhta hai, bank wasool kar sakta hai.
AP + offline ₹20: chhoti taraf sirf ₹20 tak deti hai → nuksaan ki seema tay. Asli ATM networks mein stand-in policy issuer se
baat na ho tab withdrawals ki seema tay karti hai.`);
