'use strict';
const { queue } = require('../lib/queue');
const { log } = require('../lib/log');
const n = x => x.toLocaleString('en-IN');

console.log('A. ASLI code (lib/queue.js, SQS standard jaisa): 1,000 email jobs, 3 workers, visibility timeout 30 s.');
console.log('   Har worker 1 job/sec. Worker B delete 10-10 ke batch mein karta hai, aur 5 jobs poore karke crash (delete se pehle).');
console.log('   Worker A ki ek job (t = 10 s par mili) 45 s leti hai — visibility timeout se lambi.\n');
{
  const q = queue({ visibility: 30 }), done = new Map();
  for (let i = 1; i <= 1000; i++) q.send(i, 0);
  const work = job => done.set(job, (done.get(job) || 0) + 1);
  const pendingB = [];
  let bDead = false, slow = null, slowOk = null;
  for (let t = 0; t < 2000; t++) {
    for (const w of ['A', 'B', 'C']) {
      if (w === 'B' && bDead) continue;
      if (w === 'A' && slow) { if (t >= slow.until) { work(slow.m.body); slowOk = q.delete(slow.m.receipt); slow = null; } continue; }
      const m = q.receive(t); if (!m) continue;
      if (w === 'A' && t >= 10 && slowOk === null) { slow = { m, until: t + 45 }; continue; }
      work(m.body);
      if (w === 'B') { pendingB.push(m.receipt); if (pendingB.length === 5) bDead = true; continue; }
      q.delete(m.receipt);
    }
  }
  const twice = [...done.values()].filter(v => v > 1).length;
  console.log(`unique jobs: ${n(done.size)}   do baar chale: ${twice}   (B ke 5 + 1 lambi job)`);
  console.log(`lambi job ka delete: ${slowOk ? 'chala' : 'kuch nahi mita — receipt purani; job doosre worker ko mil chuki thi (SQS: purani receipt par delete ki guarantee nahi)'}`);
console.log('→ Video: "har image theek ek worker, theek ek baar". Sach: at-least-once. Crash ya timeout se lamba kaam = duplicate.');
}

console.log('\nB. ASLI code: ek signup event, teen services (email, analytics, fraud). 1,000 events.\n');
{
  const q = queue();
  for (let i = 1; i <= 1000; i++) q.send(i, 0);
  const got = { email: 0, analytics: 0, fraud: 0 };
  let m, k = 0;
  while ((m = q.receive(0))) { got[Object.keys(got)[k++ % 3]]++; q.delete(m.receipt); }
  console.log(`ek hi queue, teeno services padhti hain:    email ${got.email}, analytics ${got.analytics}, fraud ${got.fraud}   ← har service ko sirf ek-tihaai`);
  const l = log();
  for (let i = 1; i <= 1000; i++) l.append(i, 0);
  const g = Object.fromEntries(['email', 'analytics', 'fraud'].map(s => [s, l.poll(s).length]));
  console.log(`ek log, har service ka apna offset (group):  email ${g.email}, analytics ${g.analytics}, fraud ${g.fraud}`);
  console.log('→ Queue par fan-out ke liye har service ki alag queue chahiye (jaise SNS → 3 SQS). Log mein har group poora padhta hai.');
}

console.log('\nC. ASLI code: analytics mein bug, 14 din ke counts galat. Aaj (din 21) bug theek, 14 din peeche se replay.');
console.log('   1,000 events/din. Video: "offset 2 hafte peeche le jao, sab wahin hai".\n');
for (const days of [7, 14, 30]) {
  const l = log({ retention: days * 86400 }), now = 21 * 86400;
  for (let d = 0; d < 21; d++) for (let i = 0; i < 1000; i++) l.append(i, d * 86400 + i);
  l.trim(now);
  l.seekToTime('analytics', now - 14 * 86400);
  const back = l.poll('analytics').length;
  console.log(`retention ${String(days).padStart(2)} din${days === 7 ? ' (Kafka default)' : '                '}: replay mein ${n(back).padStart(6)} of 14,000 events   ${back < 14000 ? '← purane din disk se mit chuke' : ''}`);
}
console.log('task queue (delete on ack):            replay mein      0 of 14,000 events');
console.log('→ Replay utna hi jitna retention. Default 7 din par "2 hafte peeche" nahi chalega — retention ya poora archive pehle se chuno.');
console.log('  Compaction har key ki aakhri value rakhta hai, poori history nahi: ginti dobara karne ke kaam nahi aata.');
console.log('  Lab ka naya group shuru se padhta hai; asli Kafka mein naya group default (auto.offset.reset = latest) se naye events hi padhta hai.');
