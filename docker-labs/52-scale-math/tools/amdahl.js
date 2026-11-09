'use strict';
// ex4-amdahl: real worker threads on this machine. 5% of the work cannot run in parallel. How fast can it get?
const os = require('node:os');
const { pool } = require('../lib/pool');
const { unit } = require('../lib/work');
const { amdahl } = require('../lib/sim');

const UNITS = Number(process.env.UNITS || 2000);
const SERIAL = 0.05;
const cores = os.availableParallelism();
const counts = [1, 2, 4, 8, 12].filter(n => n <= cores);

function mainThread(units) {
  let acc = 0;
  for (let i = 0; i < units; i++) acc ^= unit(i);
  return acc;
}

async function timeIt(fn) {
  const t0 = process.hrtime.bigint();
  const stats = await fn();
  return { ms: Number(process.hrtime.bigint() - t0) / 1e6, stats };
}

const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const medianRun = runs => [...runs].sort((x, y) => x.ms - y.ms)[Math.floor(runs.length / 2)];

(async () => {
  console.log(`REAL RUN: Node ${process.version}, ${cores} logical CPUs, worker_threads; ${UNITS} CPU work units; timings change run to run`);
  console.log('phase = 5% of units run alone first on the main thread (the "foundation"), then 95% split across workers');
  console.log('lock 5%  = all units split across workers; every 20th unit runs while holding one shared lock');
  console.log('lock 20% = same, but every 5th unit runs under the lock');
  console.log('each time = median of 3 runs; workers are started and warmed up before timing');
  console.log('');
  mainThread(50);
  const alone = median([(await timeIt(async () => mainThread(UNITS))).ms, (await timeIt(async () => mainThread(UNITS))).ms, (await timeIt(async () => mainThread(UNITS))).ms]);
  console.log(`main thread alone, all ${UNITS} units: ${alone.toFixed(0)} ms`);
  console.log('');
  console.log('workers  amdahl 5%  phase 5%          lock 5%           amdahl 20%  lock 20%');
  const lockRows = [];
  for (const n of counts) {
    const p = pool(n);
    await p.run(n * 20);
    const serialUnits = Math.round(UNITS * SERIAL);
    const phase = [], locked = [], locked20 = [];
    for (let k = 0; k < 3; k++) {
      phase.push(await timeIt(async () => { mainThread(serialUnits); await p.run(UNITS - serialUnits); }));
      locked.push(await timeIt(() => p.run(UNITS, 20)));
      locked20.push(await timeIt(() => p.run(UNITS, 5)));
    }
    await p.close();
    const cell = t => `${(t.toFixed(0) + ' ms').padStart(6)} ${(alone / t).toFixed(2).padStart(5)}×`;
    const ph = medianRun(phase).ms, r5 = medianRun(locked), r20 = medianRun(locked20), lk = r5.ms, lk20 = r20.ms;
    lockRows.push({ n, r5, r20 });
    console.log(`${String(n).padStart(7)}  ${amdahl(SERIAL, n).toFixed(2).padStart(8)}×  ${cell(ph).padEnd(16)}  ${cell(lk).padEnd(16)}  ` +
      `${amdahl(0.2, n).toFixed(2).padStart(9)}×  ${cell(lk20)}`);
  }
  console.log('');
  console.log('lock detail (median run): locked units, lock held ÷ wall time, average wait per lock');
  console.log('workers  lock 5%: units  held    wait/lock   lock 20%: units  held    wait/lock');
  for (const { n, r5, r20 } of lockRows) {
    const d = r => `${String(r.stats.locked).padStart(5)}  ${(r.stats.holdMs / r.ms * 100).toFixed(0).padStart(4)}%  ${(r.stats.waitMs / r.stats.locked).toFixed(2).padStart(6)} ms`;
    console.log(`${String(n).padStart(7)}  ${' '.repeat(9)}${d(r5)}  ${' '.repeat(10)}${d(r20)}`);
  }
  console.log('');
  console.log('MODEL: Amdahl speed-up = 1 ÷ (s + (1 − s) ÷ n), s = serial share');
  console.log('n          s = 1%    s = 5%    s = 20%');
  for (const n of [2, 4, 8, 16, 64, 1024]) {
    console.log(`${String(n).padEnd(9)}  ${amdahl(0.01, n).toFixed(1).padStart(6)}×  ${amdahl(0.05, n).toFixed(1).padStart(6)}×  ${amdahl(0.2, n).toFixed(1).padStart(7)}×`);
  }
  console.log(`${'infinite'.padEnd(9)}  ${'100.0'.padStart(6)}×  ${'20.0'.padStart(6)}×  ${'5.0'.padStart(7)}×`);
})().catch(e => { console.error(e); process.exitCode = 1; });
