'use strict';
// REAL disk: write the same bytes in order (append, like a Kafka segment) or at random 4 KB offsets.
const fs = require('node:fs');
const { shuffled } = require('./rng');
const BLOCK = 4096;
function prepare(file, mb) {                              // preallocate with real blocks, so random writes overwrite in place
  const b = Buffer.alloc(1 << 20, 1), fd = fs.openSync(file, 'w');
  for (let i = 0; i < mb; i++) fs.writeSync(fd, b);
  fs.fsyncSync(fd); fs.closeSync(fd);
}
// mode: 'seq' | 'rand'; direct: O_DIRECT (no page cache) or page cache + one fsync at the end; size = bytes per write
function run(file, { mb = 64, mode = 'seq', direct = true, size = BLOCK, seed = 5 } = {}) {
  const n = (mb << 20) / size, order = mode === 'rand' ? shuffled(n, seed) : null;
  const buf = Buffer.allocUnsafeSlow(size); buf.fill(7);
  const flags = fs.constants.O_WRONLY | (direct ? fs.constants.O_DIRECT : 0);
  const fd = fs.openSync(file, flags);
  const t = process.hrtime.bigint();
  for (let i = 0; i < n; i++) fs.writeSync(fd, buf, 0, size, (order ? order[i] : i) * size);
  fs.fsyncSync(fd);
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  fs.closeSync(fd);
  return { ms, mbps: mb / (ms / 1000), perWriteUs: ms * 1000 / n };
}
module.exports = { prepare, run, BLOCK };
