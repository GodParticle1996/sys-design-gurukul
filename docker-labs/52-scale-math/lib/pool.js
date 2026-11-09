'use strict';
// Worker pool for ex4-amdahl: n worker threads sharing one lock cell.
const path = require('node:path');
const { Worker } = require('node:worker_threads');

function pool(n) {
  const lockBuffer = new SharedArrayBuffer(4);
  const workers = Array.from({ length: n }, () =>
    new Worker(path.join(__dirname, '../services/worker.js'), { workerData: { lockBuffer } }));
  // contiguous global numbering: worker i gets units start … start+share−1
  const run = (units, lockEvery = 0) => {
    let start = 0;
    return Promise.all(workers.map((w, i) => new Promise((resolve, reject) => {
      const share = Math.floor(units / n) + (i < units % n ? 1 : 0);
      w.once('message', resolve);
      w.once('error', reject);
      w.postMessage({ units: share, lockEvery, start });
      start += share;
    }))).then(parts => parts.reduce((a, p) => ({ locked: a.locked + p.locked, holdMs: a.holdMs + p.holdMs, waitMs: a.waitMs + p.waitMs }),
      { locked: 0, holdMs: 0, waitMs: 0 }));
  };
  return { run, close: () => Promise.all(workers.map(w => w.terminate())) };
}

module.exports = { pool };
