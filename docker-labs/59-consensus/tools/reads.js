'use strict';
// ex5-reads — MODEL: purana leader 1 (node 2 ke saath) t = 1000 par kata; badi taraf t = 1300 par naya leader, har 50 ms
// naya version. Purane leader ke paas wala client t = 1000–3000 har 10 ms padhta hai (200 reads).
const { run, LEASE } = require('../lib/reads');
console.log('padhne ka niyam                                  jawab diye   purana version   mana');
for (const [rule, name] of [['local', 'local read (apni copy se)'], ['readindex', 'ReadIndex (pehle majority se pucho)'], ['lease', `lease ${LEASE} ms (election 300 ms se chhota)`], ['lease-slow-clock', 'lease, par purane leader ki ghadi 2× dheemi']]) {
  const s = run(rule);
  console.log(`${name.padEnd(46)}  ${String(s.served).padStart(5)}        ${String(s.stale).padStart(5)}          ${String(s.refused).padStart(4)}`);
}
console.log(`
local read: purana leader jaanta hi nahi ki naya leader aa gaya → 170 reads mein purana version (Raft log sahi hai, read galat).
ReadIndex: har read se pehle majority se heartbeat ka jawab chahiye → chhoti taraf mana karti hai; sehatmand leader par
  har read ki keemat ek round trip.
Lease: majority ka aakhri ack + ${LEASE} ms tak bina pooche padho; naya leader 300 ms se pehle nahi ban sakta → safe, BASHARTE
  ghadiyon ka farq seema mein ho. Ghadi 2× dheemi → lease 400 ms tak "valid" lagi → naye leader ke baad bhi purana jawab.`);
