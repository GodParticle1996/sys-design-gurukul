'use strict';
const { consumers, crashPoints, interleavings, producers, producerOutcomes } = require('../lib/crash');
console.log('A. ASLI ginti (lib/crash.js): ek message = ₹100 charge. Har step ke baad crash (ack se pehle) → message wapas');
console.log('   aata hai (at-least-once) aur poora flow dobara chalta hai. Saath mein: do workers ko ek hi message ek saath mila —');
console.log('   dono workers ke steps ke har mumkin kram mein kitni baar ₹200 kata?\n');
console.log('tareeka                                          har crash point par charges   do workers: double charge');
for (const [name, steps] of Object.entries(consumers)) {
  const cp = crashPoints(steps), il = interleavings(steps), dbl = il.filter(x => x > 1).length;
  console.log(`${name.padEnd(48)} ${cp.map(x => '₹' + x * 100).join(', ').padEnd(28)}  ${dbl} of ${il.length} kram`);
}
console.log('\n→ Video ka "check karo, kaam karo, phir id likho": charge ke baad aur id likhne se pehle crash = ₹200.');
console.log('  Do workers ek saath check karein toh dono ko "nahi kiya" milta hai: 20 mein se 18 kram mein ₹200.');
console.log('→ Ilaaj: id ka record aur kaam EK transaction mein (UNIQUE constraint), ya bahar ki API ko idempotency key do');
console.log('  (Stripe: Idempotency-Key header). Asli processes + SQLite par same race: lab 49.');
console.log('\nB. ASLI ginti: signup = user save + "user signed up" event. Har step ke baad crash, aur ek case jahan DB write fail.\n');
console.log('tareeka                                                                  cases   theek   event khoya   bina user event   event 2 baar');
for (const [name, steps] of Object.entries(producers)) {
  const r = producerOutcomes(steps);
  console.log(`${name.padEnd(72)} ${String(r.cases).padStart(5)}   ${String(r.ok).padStart(5)}   ${String(r.lost).padStart(11)}   ${String(r.phantom).padStart(15)}   ${String(r.duplicate).padStart(12)}`);
}
console.log('\n→ Dono dual-write kram kisi crash par galat. Outbox mein user aur event ek transaction mein; relay baad mein bhejta hai.');
console.log('→ Video: "outbox dual write ko poori tarah khatam karta hai". Haan, par relay at-least-once hai: publish ke baad aur');
console.log('  "sent" likhne se pehle crash = event 2 baar. Consumer ko phir bhi idempotent hona padega. Asli processes par: lab 44.');
