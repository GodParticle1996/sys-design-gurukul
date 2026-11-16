'use strict';
const { run, poison } = require('../lib/backpressure');
const n = x => x.toLocaleString('en-IN');
console.log('A. MODEL (1 s steps): signups 200/sec, phir 60 s ke liye 1,000/sec. Queue mein 10,000 messages ki jagah.');
console.log('   Workers 300/sec likhte hain; DB 400 writes/sec sambhalta hai (zyada = timeout, message wapas queue mein).');
console.log('   5 baar fail → DLQ. 600 s dekha. Kul 1,68,000 signups.\n');
const rows = [
  ['drop: queue bhari → "ho gaya" bolkar phenk do', { overflow: 'drop' }],
  ['block: queue bhari → web thread jagah ka intezaar', { overflow: 'block' }],
  ['reject: queue bhari → turant 429 "baad mein"', { overflow: 'reject' }],
  ['reject + workers autoscale 1,000/sec tak', { overflow: 'reject', scale: 'auto' }],
  ['reject + workers sirf DB ki had (400/sec) tak', { overflow: 'reject', scale: 'db' }],
];
console.log('tareeka                                              likhe gaye   "ho gaya" par khoye   user ko error/429   bekaar DB kaam   DLQ mein');
for (const [name, o] of rows) {
  const r = run(o);
  console.log(`${name.padEnd(52)} ${n(r.done).padStart(9)}   ${n(r.ackedLost).padStart(15)}   ${n(r.userErrors + r.rejected).padStart(15)}   ${n(r.wasted).padStart(13)}   ${n(r.dlq).padStart(7)}`);
}
const b = run({ overflow: 'block' });
console.log(`\n→ drop: user ne "ho gaya" dekha, data gaya — logs/metrics ke liye theek, signup ya paise ke liye nahi.`);
console.log(`→ block: ${b.blockedSec} s tak queue bhari, har naya signup thread intezaar mein, phir timeout. Asli server mein same threads`);
console.log('  doosre pages bhi chalate hain — async phir se sync ban gaya.');
console.log('→ reject: utne hi log mana, par har "ho gaya" wala signup pakka. User ko pata hai, baad mein dobara kar sakta hai.');
const a = run({ overflow: 'reject', scale: 'auto' });
console.log(`→ autoscale DB ki had ke paar: kaam KAM hua, DB par ${n(a.wasted)} bekaar koshishein, aur ${n(a.dlq)} theek messages DLQ mein.`);
console.log('  Bottleneck queue se DB par chala gaya (video sahi). Ilaaj DLQ nahi — workers ko DB ki had par roko. (Kitne DLQ mein gaye,');
console.log('  retry ki had par tika hai: maxReceive 500 par autoscale aur DB-had wali rows barabar kaam karti hain.)');
console.log('  Model mein block aur reject ki ginti barabar maani gayi; intezaar karte threads ki deadline alag se simulate nahi ki.');
console.log('\nB. Poison message (aadarsh hisaab: retry turant, polling ka intezaar nahi): ordered (FIFO) group ka ek message har baar fail. Visibility 30 s.');
console.log(`   Bina DLQ: group hamesha ke liye atka. maxReceiveCount 5 ke saath: ~${poison().stuckSec} s baad DLQ, baaki group chal pada —`);
console.log('   par ab group ke baaki events us event ke bina aage badhe: FIFO ka kram toota. Rokna ya skip karna — faisla tumhara.');
console.log('→ DLQ = seemit retries ke baad message ko alag rakhna (quarantine) + alert + jaanch + redrive. Overload ki kshamata DLQ nahi');
console.log('  badhata. Wajah aksar asthaayi bhi hoti hai (DB band tha) — theek karke wapas bhejo.');
