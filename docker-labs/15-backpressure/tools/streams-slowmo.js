/* ex3 ka slow motion · Node ke streams mein wahi signal, ek-ek tukda.
   Asli Node streams (Readable, Writable, pipeline) — sirf raftaar chhoti:
     reader  har 100 ms par source se ek tukda padhta hai (jab Node maange)     · kul 12 tukde
     writer  ek tukda 300 ms mein likhta hai · highWaterMark 4 tukde            (reader se 3 guna dheema)
   Teen tareeke:
     ignore    write() ka jawab (true/false) nazarandaaz
     drain     write() false de toh reader.pause(); writer 'drain' kare toh reader.resume()
     pipeline  stream.pipeline(reader, writer) — yahi sab khud
   Aakhir mein: writer beech mein fail ho jaaye toh reader.pipe(writer) aur pipeline() mein kya farq hai.
   node tools/streams-slowmo.js [--mode ignore|drain|pipeline|error] */
const { Readable, Writable, pipeline } = require('stream');
const { sleep } = require('../lib/util');
const args = require('./args')();

const TICK = 50;            // ghadi: 50 ms. Reader sam (even) tick par padhta hai, writer visham (odd) tick par likhna poora karta hai
const CHUNKS = 12, HWM = 4, WRITE_TICKS = 6;                     // 6 tick = 300 ms
const NAMES = {
  ignore: 'write() ka jawab nazarandaaz',
  drain: 'write() false → reader.pause() · \'drain\' → reader.resume()',
  pipeline: 'stream.pipeline(reader, writer)',
};

/* ek chhoti duniya: reader + writer + ghadi. failAt: writer is tukde par error deta hai (sirf error wale demo mein) */
function world({ failAt = 0 } = {}) {
  const w = { tick: 0, next: 1, wanted: false, inflight: null, peak: 0, lastRead: 0, written: 0, lines: [], stopped: false, paused: false, held: new Set() };
  const at = () => ((w.tick * TICK) / 1000).toFixed(2).padStart(5) + ' s';
  w.say = text => w.lines.push(`   ${at()}  ${text}`);
  w.reader = new Readable({ objectMode: true, highWaterMark: 1, read() { w.wanted = true; } });
  w.writer = new Writable({
    objectMode: true, highWaterMark: HWM,
    write(chunk, enc, cb) { w.inflight = { chunk, cb, due: w.tick + WRITE_TICKS + (w.tick % 2 === 0 ? 1 : 0) }; },
  });
  const fill = () => `writer ke andar ${w.writer.writableLength}/${HWM}`;
  /* har write() ko chhapo — jawab Node ka apna hai */
  const write0 = w.writer.write.bind(w.writer);
  w.writer.write = (chunk, ...rest) => {
    const ok = write0(chunk, ...rest);
    w.peak = Math.max(w.peak, w.writer.writableLength);
    w.wrote = true;
    const from = w.held.delete(chunk) ? 'reader ke andar se nikla' : 'source se padha';
    w.say(`${chunk}: ${from} → write() → ${ok ? 'true ' : 'false'} · ${fill()}${ok ? '' : w.writer.writableLength === HWM ? '   ← "ruk ja"' : '   ← hadd ke upar'}`);
    return ok;
  };
  const pause0 = w.reader.pause.bind(w.reader);
  w.reader.pause = () => {
    if (!w.paused && !w.reader.readableEnded && !w.writer.destroyed) { w.paused = true; w.say('         reader.pause() — reader ruka'); }
    return pause0();
  };
  w.writer.on('drain', () => { w.paused = false; w.say(`         writer khaali (${fill()}) → 'drain' → reader phir chalu`); });

  w.loop = async () => {
    const t0 = Date.now();
    for (w.tick = 1; !w.stopped; w.tick++) {
      await sleep(Math.max(0, t0 + w.tick * TICK - Date.now()));
      step();
      await new Promise(setImmediate);                                     // Node ke apne kaam (drain, resume…) isi tick mein ho jaayein
    }
  };
  function step() {
    if (w.tick % 2 === 1) {                                                // writer: ek tukda likhna poora?
      const f = w.inflight;
      if (!f || f.due > w.tick) return;
      w.inflight = null;
      if (failAt && f.chunk === '#' + failAt) { w.say(`         writer: ${f.chunk} likhte hue ERROR (disk bhar gayi)`); f.cb(new Error('disk bhar gayi')); return; }
      w.written++;
      f.cb();
      if (w.paused && w.writer.writableLength) w.say(`         writer ne ${f.chunk} likh diya · ${fill()}`);
    } else if (w.wanted && w.next <= CHUNKS) {                             // reader: Node ne maanga hai → source se ek tukda
      w.wanted = false; w.wrote = false;
      const k = w.next++;
      w.lastRead = w.tick;
      w.reader.push('#' + k);
      if (!w.wrote) { w.held.add('#' + k); w.say(`#${k}: source se padha → reader ke andar ruka hua (write nahi hua)`); }
      if (w.next > CHUNKS) w.reader.push(null);
    }
  }
  return w;
}

async function run(mode) {
  const w = world();
  const finished = new Promise(done => {
    if (mode === 'pipeline') return pipeline(w.reader, w.writer, done);
    w.reader.on('data', chunk => {
      const ok = w.writer.write(chunk);
      if (!ok && mode === 'drain') { w.reader.pause(); w.writer.once('drain', () => w.reader.resume()); }
    });
    w.reader.on('end', () => w.writer.end());
    w.writer.on('finish', done);
  });
  finished.then(() => { w.endTick = w.tick; w.stopped = true; });
  await w.loop();
  console.log(`\n=== ${NAMES[mode]} ===`);
  w.lines.forEach(l => console.log(l));
  console.log(`   nateeja → writer ke andar sabse zyada: ${w.peak} (hadd ${HWM}) · source se aakhri tukda ${((w.lastRead * TICK) / 1000).toFixed(2)} s par padha · sab likhne mein ${((w.endTick * TICK) / 1000).toFixed(2)} s`);
}

/* writer #3 par fail hota hai: pipe() vs pipeline() */
async function errorDemo(how) {
  const w = world({ failAt: 3 });
  let got = null;
  const settled = new Promise(done => {
    if (how === 'pipeline') return pipeline(w.reader, w.writer, err => { got = err; done(); });
    w.writer.on('error', err => { got = err; done(); });             // pipe() mein yeh listener na ho toh process hi gir jaata hai
    w.reader.pipe(w.writer);
  });
  settled.then(async () => { await sleep(600); w.stopped = true; });  // error ke baad 0.6 s aur dekho: reader kya karta hai
  await w.loop();
  console.log(`   ${(how === 'pipeline' ? 'pipeline(reader, writer)' : 'reader.pipe(writer)').padEnd(24)} → error mila: "${got && got.message}" · writer.destroyed = ${w.writer.destroyed} · reader.destroyed = ${String(w.reader.destroyed).padEnd(5)} ${w.reader.destroyed ? '← dono band' : '← reader khula reh gaya (file / DB cursor / socket ka leak)'}`);
}

(async () => {
  const modes = args.mode ? [args.mode] : ['ignore', 'drain', 'pipeline', 'error'];
  console.log(`asli Node streams, slow motion · reader: har 100 ms par ek tukda (kul ${CHUNKS}) · writer: ek tukda 300 ms, highWaterMark ${HWM} tukde`);
  const def = require('stream').getDefaultHighWaterMark;                // Node 18.17+ / 19.9+
  if (def) console.log(`Node ${process.version} · highWaterMark na do toh default: ${def(false)} bytes · object mode mein ${def(true)} objects`);
  for (const m of modes) {
    if (m === 'error') {
      console.log('\n=== writer #3 likhte hue fail ho jaaye — reader ka kya hota hai? ===');
      await errorDemo('pipe');
      await errorDemo('pipeline');
    } else if (NAMES[m]) await run(m);
    else { console.log(`\n--mode ${m}? Yeh chalte hain: ignore | drain | pipeline | error`); process.exit(1); }
  }
  process.exit(0);
})();
