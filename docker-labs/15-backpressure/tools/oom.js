/* ex1 ka doosra hissa · ASLI crash, asli raftaar par.
   Wahi tools/queue.js (producer 10,000/s, consumer 2,000/s) ek alag process mein, par us process ki memory par hadd
   (V8 heap: node --max-old-space-size=<MB>). Do baar:
     1. line ki koi hadd nahi      → memory bharti hai → process mar jaata hai → line ke saare events gaye
     2. line ki hadd 20,000, block → wahi memory hadd, wahi load → chalta rehta hai
   node tools/oom.js [--heap 100] [--secs 40] */
const { spawn } = require('child_process');
const path = require('path');
const args = require('./args')();
const HEAP = +(args.heap || 100), SECS = +(args.secs || 40), GIVE_UP = 180;

function run(extra, secs) {
  return new Promise(done => {
    const t0 = Date.now(), lines = [];
    let err = '', left = '';
    const kid = spawn(process.execPath, [`--max-old-space-size=${HEAP}`, path.join(__dirname, 'queue.js'), '--every', '1', '--secs', String(secs), ...extra]);
    kid.stdout.on('data', d => {
      const parts = (left + d).split('\n'); left = parts.pop();
      parts.forEach(l => { const m = /^t=\s*(\d+)s\s+queue=\s*(\d+)\s+rss=\s*(\d+) MB\s+consumed=(\d+)/.exec(l); if (m) lines.push({ at: (Date.now() - t0) / 1000, t: +m[1], queue: +m[2], rss: +m[3], consumed: +m[4], text: l }); });
    });
    kid.stderr.on('data', d => (err += d));
    kid.on('exit', (code, signal) => done({ code, signal, secs: (Date.now() - t0) / 1000, lines, fatal: (/FATAL ERROR: [^\n]*/.exec(err) || [''])[0] }));
  });
}
const show = lines => lines.filter((l, i) => l.t % 5 === 0 || i === lines.length - 1).forEach(l => console.log('   ' + l.text));
const n = x => x.toLocaleString('en-IN');

(async () => {
  console.log(`tools/queue.js alag process mein · producer 10,000/s, consumer 2,000/s · process ki memory hadd: ${HEAP} MB (V8 heap)`);

  console.log('\n=== line ki koi hadd nahi ===');
  const a = await run(['--policy', 'unbounded'], GIVE_UP);
  show(a.lines);
  const last = a.lines[a.lines.length - 1];
  if (a.code === 0) console.log(`   ${GIVE_UP} s mein nahi mara — --heap chhota karke dekho`);
  else {
    console.log(`   💥 ${a.secs.toFixed(1)} s par process mar gaya: "${a.fatal}"`);
    console.log(`      marne se pehle ${(a.secs - last.at).toFixed(1)} s process ne kuch nahi chhapa — memory khaali karne (garbage collection) mein atka raha`);
    console.log(`      aakhri baar line mein ${n(last.queue)} events dikhe — sab gaye · consumer sirf ${n(last.consumed)} kar paya`);
  }

  console.log(`\n=== line ki hadd 20,000 · bhari ho toh producer ruke (block) · wahi memory hadd · ${SECS} s ===`);
  const b = await run(['--policy', 'block', '--cap', '20000'], SECS);
  show(b.lines);
  const end = b.lines[b.lines.length - 1];
  console.log(b.code === 0
    ? `   ✅ ${SECS} s baad bhi zinda · line ${n(end.queue)} par ruki hui · memory ${end.rss} MB · consumer ne ${n(end.consumed)} kiye · gira: 0`
    : `   ❌ yeh bhi mar gaya (${b.fatal || 'exit ' + b.code}) — --heap bahut chhota hai`);
})();
