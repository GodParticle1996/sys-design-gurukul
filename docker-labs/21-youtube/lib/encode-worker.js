/* Ek transcode machine (toy encoder). 1 "unit" = video ka 1 second. Har unit ka CPU = UNIT_MS × codec multiplier (asli CPU burn).
   Encoder shuru hote hi pehle WARMUP units kharab quality ke (rate-control/lookahead ko pichhle frames chahiye — abhi hain nahi).
   overlap > 0 → chunk se pehle ke `overlap` units bhi encode karo (warm-up unpe kharcha ho jaaye), phir unhe kaat do. */
const { burn } = require('./util');
const UNIT_MS = 0.3, WARMUP = 5;
process.on('message', job => {
  const from = Math.max(0, job.start - job.overlap), out = [];
  let spent = 0;
  for (let u = from; u < job.end; u++) {
    const t = process.hrtime.bigint(); burn(UNIT_MS * job.mult); spent += Number(process.hrtime.bigint() - t) / 1e6;
    const q = (u - from) < WARMUP ? 'low' : 'good';
    if (u >= job.start) out.push(q);                                   // overlap wale units kaat do
  }
  process.send({ chunk: job.chunk, frames: out, cpuMs: spent, units: job.end - from });
});
