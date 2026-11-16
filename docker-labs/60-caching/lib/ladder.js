'use strict';
// Memory ladder, measured: pointer chasing. Each hop reads the next index from a random
// 64-byte line, so the CPU cannot guess the next address and must wait for the real load.
const { rng } = require('./rng');
const LINE = 16;                                    // 16 × 4-byte ints = one 64-byte cache line

function ring(bytes, seed = 7) {                   // one random cycle through every line (Sattolo)
  const lines = Math.max(2, Math.floor(bytes / 64)), a = new Int32Array(lines * LINE), order = new Int32Array(lines);
  for (let i = 0; i < lines; i++) order[i] = i;
  const r = rng(seed);
  for (let i = lines - 1; i > 0; i--) { const j = Math.floor(r() * i); const t = order[i]; order[i] = order[j]; order[j] = t; }
  for (let i = 0; i < lines; i++) a[order[i] * LINE] = order[(i + 1) % lines] * LINE;
  return a;
}

function chase(a, hops) {                          // ns per dependent load
  let p = 0;
  for (let i = 0; i < 2e5; i++) p = a[p];           // warm up (and let the JIT compile the loop)
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < hops; i++) p = a[p];
  const ns = Number(process.hrtime.bigint() - t0);
  if (p < 0) throw new Error('never');              // keep p alive
  return ns / hops;
}

function measure(bytes, hops) { return chase(ring(bytes), hops); }

// Spatial locality: touch the same N ints in sequential order vs a random order.
function sweep(n, random, seed = 3) {
  const a = new Int32Array(n).fill(1);
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  if (random) { const r = rng(seed); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; } }
  let s = 0;
  for (let i = 0; i < n; i++) s += a[idx[i]];       // warm-up pass
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) s += a[idx[i]];
  const ns = Number(process.hrtime.bigint() - t0);
  if (s !== 2 * n) throw new Error('sum');
  return ns / n;
}

module.exports = { ring, chase, measure, sweep, LINE };
