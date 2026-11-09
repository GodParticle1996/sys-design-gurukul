'use strict';
// Worker thread for ex4-amdahl. Does units start … start+units−1 (global numbering).
// With lockEvery = k, every unit whose global number is a multiple of k runs while holding the shared lock,
// so the locked share is the same at every worker count. Reports time spent holding and waiting for the lock.
const { parentPort, workerData } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const { unit, lock, unlock } = require('../lib/work');

const cell = new Int32Array(workerData.lockBuffer);
parentPort.on('message', ({ units, lockEvery, start }) => {
  let acc = 0, locked = 0, holdMs = 0, waitMs = 0;
  for (let i = 0; i < units; i++) {
    const g = start + i;
    if (lockEvery && g % lockEvery === 0) {
      const t0 = performance.now();
      lock(cell);
      const t1 = performance.now();
      let held = 0;
      try { acc ^= unit(g); } finally { held = performance.now() - t1; unlock(cell); }   // read the clock before releasing
      holdMs += held;
      waitMs += t1 - t0;
      locked++;
    } else {
      acc ^= unit(g);
    }
  }
  parentPort.postMessage({ acc, locked, holdMs, waitMs });
});
