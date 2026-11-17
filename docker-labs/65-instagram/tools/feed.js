'use strict';
// ex3 — pull vs push vs hybrid (a follower-count model calibrated to the video's numbers; nothing is measured).
const F = require('../lib/feed');
const n = (x, d = 0) => x.toLocaleString('en-IN', { maximumFractionDigits: d });

console.log('ex3 — feed: pull, push ya dono (model: 100 crore users, followers ~ r^−α; α ko aise chuna ki sabse bade account ke');
console.log(`      60 crore aur average user ke 300 followers hon → α = ${F.ALPHA.toFixed(3)}. Posts sab users mein barabar baante — maana)\n`);

console.log('1) Pull (padhte waqt jodo): har followed user ka shard poochho, har shard 1% chance se dheema (aazaad):');
console.log(`   300 follow → ${(F.pullSlow(300) * 100).toFixed(1)}% feed loads dheeme · 500 follow → ${(F.pullSlow(500) * 100).toFixed(1)}% (video: 99.3% — sahi)\n`);

console.log('2) Push (likhte waqt baanto) aur hybrid — VIP seema T se upar wale push nahi karte; VIP posts padhte waqt jodo.');
console.log('   Push cluster ki kshamata 10 lakh writes/s (video ka number). Busy = maangi gayi writes ÷ kshamata:');
console.log('   seema T          VIP accounts   push writes/s (peak)   busy      sabse bada ek post (akela)   VIP lists har feed read');
for (const T of [Infinity, 1e6, 1e5, 1e4]) {
  const h = F.hybrid(T);
  const label = T === Infinity ? 'koi nahi (push)' : n(T);
  const big = n(h.maxFanout) + ' (' + (h.maxFanoutSeconds >= 1 ? n(h.maxFanoutSeconds) + ' s' : n(h.maxFanoutSeconds * 1000) + ' ms') + ')';
  console.log(`   ${label.padEnd(15)} ${n(h.vips).padStart(12)}   ${n(h.pushWritesPerS).padStart(20)}   ${((h.utilization * 100).toFixed(1) + '%').padStart(6)}    ${big.padStart(24)}   ${n(h.vipListsPerRead, 1).padStart(10)}`);
}
const push = F.hybrid(Infinity), h = F.hybrid(1e5);
console.log(`
   → Video ke apne numbers par pure push ${(push.utilization * 100).toFixed(1)}% busy: kshamata se zyada kaam, toh push ki line bina kisi
     celebrity ke bhi badhti rehti hai. Hybrid (T = 1 lakh) writes ${((1 - h.pushWritesPerS / push.pushWritesPerS) * 100).toFixed(0)}% ghataata hai → ${(h.utilization * 100).toFixed(1)}% busy: line khaali ho sakti hai.
     Itne bhare system mein 11% bahut bada farq hai (FP14 ka queue ganit).
   → Sabse bada ek post: 60 crore writes = ${n(push.maxFanoutSeconds / 60)} minute ka kaam akela; hybrid mein ~${n(h.maxFanoutSeconds * 1000)} ms. Agar sab posts ek hi
     FIFO line mein hon (maana), toh us beech baaki sabke posts peeche. Keemat: har feed read ~${n(h.vipListsPerRead)} VIP lists jodta hai
     (video: "kuch darjan" — model se mel). T chhota karo toh writes ghatein, reads badhein.\n`);

console.log('3) Inbox ki memory (video ka hisaab): 50 crore users × 500 ids × 8 byte =', `${n(F.inboxBytes() / 1e12)} TB sirf ids.`);
console.log('   Asli Redis mein har key aur list ka apna overhead, aur har shard ki 1–2 copies — kai guna, phir bhi sambhalne layak.');
console.log('   Sirf active users (pichhle 14 din) ko push karo; lautne wale ka feed padhte waqt bana do (video).');
