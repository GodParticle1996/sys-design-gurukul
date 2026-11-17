'use strict';
const { PROTOCOLS, summary, recoveryCrashes } = require('../lib/twodb');
console.log('ASLI ginti (lib/twodb.js): "1 cheez khareedo" (operation id op1) = stock − 1 AUR order banao. Har step ke baad crash,');
console.log('restart aur recovery; recovery khud bhi ek baar crash hokar dobara chalti hai. Har step ke baad ek reader dono databases ki');
console.log('committed haalat padhta hai. Participants operation id ki receipt rakhte hain (dohraaya step dobara asar nahi karta).\n');
console.log('tareeka                            cases   ant mein galat   reader ne beech ki haalat dekhi   crash par locks atke   recovery crash ke saath galat');
for (const k of Object.keys(PROTOCOLS)) {
  const a = summary(k), r = recoveryCrashes(k);
  console.log(`${k.padEnd(34)} ${String(a.cases).padStart(4)}   ${String(a.wrongEnd).padStart(10)}       ${String(a.seenMid).padStart(18)}            ${String(a.blocked).padStart(9)}             ${r.wrongEnd} of ${r.runs}`);
}
const f = summary('2PC (do-phase commit)', { orderFails: true });
console.log(`\n(Order fail ho toh: 2PC coordinator zinda hai toh turant abort — locks sirf ${f.blocked} crash case mein atke.)`);
console.log('\n→ Ek database: ek ACID transaction — reader ko ya purani haalat dikhti hai ya poori nayi; crash par rollback.');
console.log('→ Saga, progress sirf memory mein: stock ghata, order se pehle crash = stock gaya, order nahi, aur kisi ko yaad nahi.');
console.log('→ Saga + durable log + receipts: recovery log padh kar idempotent steps dobara chalati hai — ant mein sahi, recovery khud crash');
console.log('  ho tab bhi. Par har run mein reader ne "stock ghata, order nahi" dekha: saga mein isolation nahi.');
console.log('→ 2PC: video kehta hai "do databases par transaction bilkul nahi". Hota hai (2PC/XA): ant mein kabhi galat nahi. Par (1) commit');
console.log('  dono databases par alag pal mein lagta hai, toh alag-alag padhne wala reader beech ki haalat dekh sakta hai; (2) coordinator');
console.log('  ne COMMIT log kar liya ho tab bhi, jab tak faisla participant tak na pahunche, participant locks pakad kar intezaar karta hai.');
console.log('  Recovery: coordinator lautkar log padhta hai — COMMIT mila toh poora karo, nahi mila toh abort (presumed abort).');
