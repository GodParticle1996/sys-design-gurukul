'use strict';
// ex1-fsync: REAL. How much does "safe on disk" cost on this machine, and how do databases get around it?
//   A. one writer: write() only, fsync after every record, after every 10, after every 100
//   B. many clients each waiting for "done" (lib/commit.js): every commit does its own fsync, vs group commit.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encode, HEADER } = require('../lib/wal');
const { runClients } = require('../lib/commit');
const { writeAllSync } = require('../lib/disk');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab55-fsync-'));
const rec = encode(JSON.stringify({ order: 42, amount: 250, note: 'x'.repeat(60) }));

function single(label, n, every) {
  const file = path.join(dir, 'a.log'), fd = fs.openSync(file, 'w');
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) { writeAllSync(fs, fd, rec); if (every && (i + 1) % every === 0) fs.fsyncSync(fd); }
  if (every) fs.fsyncSync(fd);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  fs.closeSync(fd);
  const perSec = Math.round(n / ms * 1000);
  console.log(`${label.padEnd(30)} ${n.toLocaleString('en-IN').padStart(7)} records  ${ms.toFixed(0).padStart(6)} ms  ${perSec.toLocaleString('en-IN').padStart(10)} records/s`);
}

(async () => {
  try {
    console.log(`REAL RUN: Node ${process.version}, ${os.platform()} ${os.release()}; temp folder ${os.tmpdir()}`);
    console.log(`record = ${rec.length} bytes (${HEADER}-byte header + JSON order). Numbers are for THIS machine and disk; they change run to run.`);
    console.log('');
    console.log('== A. one writer ==');
    single('write() only, no fsync', 20000, 0);
    single('fsync after every record', 2000, 1);
    single('fsync after every 10', 20000, 10);
    single('fsync after every 100', 20000, 100);
    console.log('');
    console.log('== B. clients waiting for "done" (each client: 100 commits, one after another) ==');
    console.log('mode                    clients   commits/s    p50 wait    p99 wait   fsyncs   records per fsync');
    for (const n of [1, 8, 64]) for (const mode of ['each', 'group']) {
      const r = await runClients(path.join(dir, `b-${mode}-${n}.log`), mode, n, 100, rec);
      const name = mode === 'each' ? 'own fsync per commit' : 'group commit';
      console.log(`${name.padEnd(22)} ${String(n).padStart(8)}  ${r.perSec.toLocaleString('en-IN').padStart(10)}  ${(r.p50.toFixed(1) + ' ms').padStart(10)}  ${(r.p99.toFixed(1) + ' ms').padStart(10)}  ${String(r.fsyncs).padStart(7)}  ${r.avgBatch.toFixed(1).padStart(18)}`);
    }
    console.log('');
    console.log('fsync waits for the device to say "stored". write() alone only reached the OS page cache (RAM).');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
