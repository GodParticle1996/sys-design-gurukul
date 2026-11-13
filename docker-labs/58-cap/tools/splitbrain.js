'use strict';
// ex5-split-brain — MODEL (seeded): 5 nodes, purana leader (node 5) chhoti taraf {4,5}. 30 s mein 1,000 writes:
// 60% clients badi taraf {1,2,3}, 40% chhoti taraf. Phir "zombie" leader aur fencing token. Aakhir mein five nines.
const { election, zombie, downtime } = require('../lib/splitbrain');
const f = n => n.toLocaleString('en-IN');
console.log('A. Election ka niyam');
for (const rule of ['no quorum', 'majority quorum']) {
  const s = election(rule);
  console.log(`   ${rule.padEnd(16)} khud ko leader maanne wale ${s.believe}   commit kar sakne wale ${s.canCommit}   "ho gaya" bola ${f(s.acked)}   mana ${f(s.refused).padStart(3)}   jodne par gayab (bola tha "ho gaya") ${f(s.lostOnHeal)}`);
}
console.log('\nB. Zombie leader — GC pause se jaaga, term 1 ke 50 purane writes storage ko bheje (naya leader term 2 par 100 likh chuka)');
for (const fenced of [false, true]) {
  const z = zombie(fenced);
  console.log(`   ${(fenced ? 'fencing token (term) check' : 'bina fencing').padEnd(28)} storage ne mane ${String(z.accepted).padStart(3)}   thukraaye ${String(z.rejected).padStart(2)}   aakhri value ${z.value.padEnd(7)} ${z.staleWins ? '← PURANE leader ki' : ''}`);
}
console.log('\nC. Kitne nines, saal mein kitna downtime (365.25 din)');
const hms = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return `${h ? h + ' h ' : ''}${m} min ${sec.toFixed(1)} s`; };
for (const p of [99, 99.9, 99.99, 99.999]) console.log(`   ${String(p).padEnd(7)}%   ${hms(downtime(p))}`);
