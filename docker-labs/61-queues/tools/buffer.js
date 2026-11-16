'use strict';
const { sync, async, spikeForWait } = require('../lib/buffer');
const n = x => Math.round(x).toLocaleString('en-IN');
const dur = s => s === null ? 'kabhi nahi' : s < 120 ? `${Math.round(s)} s` : s < 7200 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} ghante`;

console.log('A. MODEL: signups 10/sec, phir 60 s ke liye 1,000/sec (video ka "Reddit hug of death").');
console.log('   Sync: har request web thread ko 2 s pakadti hai (image, email, index sab andar). 100 threads.');
console.log('   Async: web thread sirf queue mein daalta hai; email worker 10/sec (video ka number).\n');
const s = sync();
console.log(`sync:  kshamata ${n(s.cap)}/sec → spike ki ${n(s.offered)} mein se ${n(s.served)} serve, ${n(s.rejected)} ko error (${(s.rejected / s.offered * 100).toFixed(0)}%)`);
console.log(`async: ${n(s.offered)} mein se ${n(s.offered)} ko turant "ho gaya" (queue mein); kaam baad mein.\n`);

console.log('B. MODEL: spike ke baad backlog kab khatam? Normal traffic phir 10/sec. (seedha hisaab, 1 s ke kadam)\n');
console.log('worker kshamata   spike ke ant par backlog   sabse lamba intezaar   backlog khaali   7 din baad backlog');
for (const c of [10, 12, 20, 50]) {
  const a = async({ consumer: c });
  console.log(`${String(c + '/sec').padEnd(17)} ${n(a.atSpikeEnd).padStart(12)}             ${dur(a.maxWaitSec).padStart(12)}        ${dur(a.drainedAtSec === null ? null : a.drainedAtSec - 60).padStart(12)}   ${n(a.backlogAfter).padStart(10)}`);
}
console.log(`\n→ Video: "email 10 second ki jagah 10 minute late". 10 minute ka intezaar tab jab spike sirf ~${spikeForWait().toFixed(0)} s chale.`);
console.log('  60 s ke spike par intezaar ~99 minute. Aur worker 10/sec par (normal traffic jitna) backlog KABHI khatam nahi hota:');
console.log('  queue tabhi load ko "barabar" karti hai jab worker ki kshamata ausat traffic se zyada ho.');

console.log('\nC. Retention (arithmetic): worker 5 din band, 10 messages/sec. SQS default retention 4 din (max 14).');
const perDay = 10 * 86400;
console.log(`   5 din mein ${n(5 * perDay)} messages. Pehle din ke ${n(perDay)} worker lautne se pehle expire → gaye.`);
console.log('   "Queue mein ek bhi message nahi khota" tabhi sach jab worker retention ke andar laut aaye.');
