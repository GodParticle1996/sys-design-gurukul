'use strict';
// Slow motion: three tiny hand-sized examples, every number printed. Used by the dry runs.
const { percentile } = require('../lib/stats');

const part = process.argv[2] || 'all';

if (part === 'all' || part === 'tail') {
  const times = [16, 12, 25, 15, 900, 14, 19, 15, 21, 18];
  const sorted = [...times].sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  console.log('== tail: 10 requests (ms) ==');
  console.log(`as they came : ${times.join(', ')}`);
  console.log(`sorted       : ${sorted.join(', ')}`);
  console.log(`mean         : ${times.reduce((a, b) => a + b, 0)} ÷ 10 = ${mean.toFixed(1)} ms`);
  console.log(`p50 (rank 5) : ${percentile(sorted, 50)} ms`);
  console.log(`p90 (rank 9) : ${percentile(sorted, 90)} ms`);
  console.log(`p100 (max)   : ${percentile(sorted, 100)} ms`);
  console.log(`within ±20% of the mean (${(mean * 0.8).toFixed(0)}–${(mean * 1.2).toFixed(0)} ms): ${times.filter(t => Math.abs(t - mean) <= 0.2 * mean).length} requests`);
  console.log('');
}

if (part === 'all' || part === 'fanout') {
  const pages = [
    { page: 'A', calls: [12, 14, 11] },
    { page: 'B', calls: [13, 1000, 12] },
    { page: 'C', calls: [11, 15, 14] },
  ];
  console.log('== fanout: each page calls 3 services in parallel and waits for all (ms) ==');
  for (const p of pages) console.log(`page ${p.page}: calls ${p.calls.join(', ')} → page time ${Math.max(...p.calls)} ms`);
  console.log('chance a page has no slow call, 1% slow per call:');
  for (const n of [1, 3, 10, 100]) console.log(`  ${String(n).padStart(3)} calls: 0.99^${n} = ${(0.99 ** n).toFixed(3)} → slow pages ${((1 - 0.99 ** n) * 100).toFixed(1)}%`);
  console.log('');
}

if (part === 'all' || part === 'queue') {
  // fixed 10 ms of work each; all 60 ms of work happens inside 0–75 ms = 80% busy, but the arrivals are bunched
  const arrivals = [0, 3, 6, 9, 40, 65];
  console.log('== queue: one worker, 10 ms per request; 6 × 10 = 60 ms of work, all inside 0–75 ms → busy 80% of that window ==');
  let freeAt = 0, waits = 0;
  for (const [i, at] of arrivals.entries()) {
    const start = Math.max(at, freeAt);
    freeAt = start + 10;
    waits += start - at;
    console.log(`#${i + 1}: arrives ${String(at).padStart(2)}  starts ${String(start).padStart(2)}  ends ${String(freeAt).padStart(2)}  waited ${String(start - at).padStart(2)} ms`);
  }
  console.log(`total wait: ${waits} ms; evenly spread (every 12.5 ms) no request would wait`);
}
