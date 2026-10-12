/* ex3 · Node streams mein backpressure. Tez reader (jitna maango utna, 64 KB ke tukde) → dheema writer (har 64 KB par
   4 ms = ~16 MB/s, jaise dheemi disk ya network). Kul 120 MB. Teen tareeke:
     ignore   — writer.write() ka jawab (true/false) nazarandaaz: sab kuch RAM mein jama
     drain    — write() false de toh reader.pause(), writer 'drain' kare toh reader.resume()
     pipeline — stream.pipeline(reader, writer): yahi sab khud (aur error par dono band)
   node tools/streams.js [--mode ignore|drain|pipeline] [--mb 120] */
const { Readable, Writable, pipeline } = require('stream');
const args = require('./args')();
const MB = +(args.mb || 120), CHUNK = 64 * 1024, TOTAL = MB * 1024 * 1024;

function reader() {
  let sent = 0;
  return new Readable({
    highWaterMark: CHUNK,
    read() {                                                               // jitna maango, turant
      if (sent >= TOTAL) return this.push(null);
      sent += CHUNK; this.push(Buffer.alloc(CHUNK, 1));
    },
  });
}
function writer() {
  return new Writable({
    highWaterMark: 16 * CHUNK,                                             // 1 MB — iske upar write() false dega
    write(chunk, enc, cb) { setTimeout(cb, 4); },                           // dheemi disk: har 64 KB par 4 ms
  });
}

async function run(mode) {
  global.gc && global.gc();
  const base = process.memoryUsage().rss;
  let peak = base, peakBuffered = 0;
  const w = writer(), r = reader(), t0 = Date.now();
  const probe = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); peakBuffered = Math.max(peakBuffered, w.writableLength); }, 50);
  await new Promise(done => {
    if (mode === 'pipeline') return pipeline(r, w, done);
    r.on('data', c => {
      const ok = w.write(c);
      if (!ok && mode === 'drain') { r.pause(); w.once('drain', () => r.resume()); }
    });
    r.on('end', () => w.end());
    w.on('finish', done);
  });
  clearInterval(probe);
  return { ms: Date.now() - t0, peakMB: Math.round((peak - base) / 1048576), bufMB: Math.round(peakBuffered / 1048576) };
}

const names = { ignore: 'write() ka jawab nazarandaaz', drain: 'pause() / drain par resume()', pipeline: 'stream.pipeline()' };
const row = (m, r) => `${names[m].padEnd(37)} ${String(r.bufMB + ' MB').padStart(12)}                  ${String(r.peakMB + ' MB').padStart(8)}                ${(r.ms / 1000).toFixed(1)} s`;

(async () => {
  if (args.row) { console.log(row(args.mode, await run(args.mode))); return; }            // ek mode, ek taaza process
  console.log(`tez reader → dheema writer (~16 MB/s) · ${MB} MB · writer ka highWaterMark 1 MB\n`);
  console.log('tareeka                               writer mein sabse zyada jama   process ki extra memory (peak)   kul samay');
  const { execFileSync } = require('child_process');
  for (const m of args.mode ? [args.mode] : ['ignore', 'drain', 'pipeline']) {
    /* har mode alag process mein — warna pichhle mode ki memory agle ka "base" bigaad deti hai */
    process.stdout.write(execFileSync(process.execPath, ['--expose-gc', __filename, '--mode', m, '--mb', String(MB), '--row'], { encoding: 'utf8' }));
  }
})();
