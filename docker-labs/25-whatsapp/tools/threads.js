/* "Har connection ka apna thread" kitna mehenga hai? Asli worker_threads bana ke naapo.
   node tools/threads.js [--threads 200] */
const { Worker } = require('worker_threads');
const args = require('./args')();
const N = +(args.threads || 200);
const code = `const { parentPort } = require('worker_threads'); parentPort.on('message', () => {}); setInterval(() => {}, 10000);`;
(async () => {
  const base = process.memoryUsage().rss;
  const before = await mem();
  const ws = [];
  for (let i = 0; i < N; i++) ws.push(new Worker(code, { eval: true }));
  await new Promise(r => setTimeout(r, 1500));
  const after = await mem();
  console.log(`${N} threads (har "connection" ka apna thread):`);
  console.log(`  poore system ka RSS ${before} MB → ${after} MB = ${(((after - before) * 1024) / N).toFixed(0)} KB per thread`);
  console.log(`  20,000 connections ke liye extrapolate: ${(((after - before) / N) * 20000 / 1024).toFixed(1)} GB`);
  ws.forEach(w => w.terminate());
  process.exit(0);
})();
async function mem() {                                                // is process + uske threads ka RSS
  const fs = require('fs');
  try { const st = fs.readFileSync('/proc/self/status', 'utf8').match(/VmRSS:\s+(\d+) kB/); return Math.round(+st[1] / 1024); }
  catch (e) { return Math.round(process.memoryUsage().rss / 1048576); }
}
