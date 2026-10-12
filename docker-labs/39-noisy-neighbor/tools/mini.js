/* Sabse chhota chalta program: lib/fair-queue.js aur lib/token-bucket.js, seedhe haath mein.
   node tools/mini.js */
const { FairQueue } = require('../lib/fair-queue');
const { TokenBucket } = require('../lib/token-bucket');
const { sleep } = require('../lib/util');

(async () => {
  /* ---- 1. baari-baari wali line ---- */
  const q = new FairQueue();
  for (let i = 1; i <= 5; i++) q.push('A', 'A#' + i);        // A ke paanch kaam pehle aa gaye
  for (let i = 1; i <= 2; i++) q.push('B', 'B#' + i);        // B ke do kaam uske baad

  const order = [];
  for (let job = q.next(); job; job = q.next()) order.push(job);

  console.log('aane ka kram:     A#1  A#2  A#3  A#4  A#5  B#1  B#2');
  console.log('uthane ka kram:   ' + order.join('  '));
  console.log('B#1 doosre number par utha, saatven par nahi — jabki A ke paanchon kaam pehle aaye the.\n');

  /* ---- 2. token wali baalti: har second 2 tokens, baalti mein zyada se zyada 2 ---- */
  const bucket = new TokenBucket({ rate: 2 });
  const five = [];
  for (let i = 0; i < 5; i++) five.push(bucket.take());
  console.log('ek saath 5 requests:   ' + five.join('  '));

  await sleep(600);                                          // 0.6 s × 2 tokens/second = 1.2 tokens wapas
  console.log('0.6 s ruk ke 2 aur:    ' + [bucket.take(), bucket.take()].join('  '));

  await sleep(5000);                                         // 5 s × 2 = 10 tokens? Nahi — baalti mein 2 hi aate hain
  const after = [];
  for (let i = 0; i < 4; i++) after.push(bucket.take());
  console.log('5 s ruk ke 4 aur:      ' + after.join('  ') + '   ← 5 second ruke, phir bhi 2 hi: baalti mein 2 se zyada jama nahi hote');

  /* ---- 3. wazan: bade plan wale tenant ko do baari ---- */
  const w = new FairQueue();
  for (let i = 1; i <= 6; i++) w.push('A', 'A#' + i);
  for (let i = 1; i <= 3; i++) w.push('B', 'B#' + i);
  w.turn.push('A');                                          // baari ke kram mein A ka naam do baar: [A, B, A]
  const weighted = [];
  for (let job = w.next(); job; job = w.next()) weighted.push(job);
  console.log('\nbaari ke kram mein A do baar:   ' + weighted.join('  '));
})();
