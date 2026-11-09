'use strict';
// CPU work unit used by ex4-amdahl. Pure arithmetic: no I/O, no allocation in the loop.
const ITER = 200000;

function unit(seed) {
  let x = (seed | 0) || 1;
  for (let i = 0; i < ITER; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  }
  return x | 0;
}

// Simple spin-then-wait lock on a shared Int32Array cell (0 = free, 1 = taken).
function lock(cell) {
  for (;;) {
    if (Atomics.compareExchange(cell, 0, 0, 1) === 0) return;
    Atomics.wait(cell, 0, 1, 1);
  }
}
function unlock(cell) {
  Atomics.store(cell, 0, 0);
  Atomics.notify(cell, 0, 1);
}

module.exports = { unit, lock, unlock };
