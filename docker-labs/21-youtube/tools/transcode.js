/* 2 ghante ki movie (7,200 units = 7,200 sec). Chunks = 10 min (600 units) → 12 chunks, alag machines (asli processes) par.
   node tools/transcode.js
   Dekho: wall-clock time, seam par kharab units, overlap ka extra kharcha, aur codec (H.264 vs VP9 ~5x CPU). */
const { fork } = require('child_process');
const path = require('path');
const LEN = 7200, CHUNK = 600;
async function run(workers, chunkLen, overlap, mult) {
  const kids = Array.from({ length: workers }, () => fork(path.join(__dirname, '../lib/encode-worker.js')));
  const jobs = []; for (let s = 0, c = 0; s < LEN; s += chunkLen, c++) jobs.push({ chunk: c, start: s, end: Math.min(LEN, s + chunkLen), overlap, mult });
  const results = new Array(jobs.length); const t0 = Date.now(); let cpu = 0, units = 0;
  await new Promise(resolve => {
    let next = 0, done = 0;
    const give = k => { if (next < jobs.length) k.send(jobs[next++]); };
    kids.forEach(k => { k.on('message', m => { results[m.chunk] = m.frames; cpu += m.cpuMs; units += m.units; if (++done === jobs.length) resolve(); else give(k); }); give(k); });
  });
  const wall = Date.now() - t0; kids.forEach(k => k.kill());
  const all = [].concat(...results);                                   // stitch — order mein jodo
  return { wall, bad: all.filter(q => q === 'low').length, total: all.length, cpu, extra: units - LEN };
}
(async () => {
  console.log('encoder        machines  chunks   overlap   wall time   CPU kul    kharab units (seams)   extra encode');
  const rows = [
    ['H.264', 1, LEN, 0, 1], ['H.264', 4, CHUNK, 0, 1], ['H.264', 12, CHUNK, 0, 1], ['H.264', 12, CHUNK, 5, 1],
    ['VP9 (~5x CPU)', 1, LEN, 0, 5], ['VP9 (~5x CPU)', 12, CHUNK, 5, 5],
  ];
  for (const [name, w, cl, ov, mult] of rows) {
    const r = await run(w, cl, ov, mult);
    console.log(`${name.padEnd(15)}${String(w).padStart(5)}    ${String(Math.ceil(LEN / cl)).padStart(4)}     ${String(ov).padStart(4)}      ${(r.wall / 1000).toFixed(2).padStart(6)} s   ${(r.cpu / 1000).toFixed(2).padStart(6)} s   ${String(r.bad).padStart(6)} / ${r.total}          +${r.extra} units`);
  }
  console.log('\n1 unit = 1 sec video, 0.3 ms CPU (H.264, toy). Asli encoder isse hazaron guna mehenga — ratio dekho, number nahi.');
})();
