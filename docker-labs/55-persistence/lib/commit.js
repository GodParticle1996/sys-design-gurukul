'use strict';
// Clients that each wait for "done" (durable) before their next commit. Two ways to make commits durable:
//   'each'  — every commit writes and fsyncs on its own, one commit at a time
//   'group' — group commit: commits that arrive while an fsync is running wait, then share the next write + fsync
// Fail-stop: after the first write/fsync error the log may hold a partial batch, so nothing more is acknowledged.
const fs = require('node:fs');
const { percentile } = require('./stats');

async function writeAll(fh, buf) {           // FileHandle.write may write only part of the buffer
  let off = 0;
  while (off < buf.length) {
    const { bytesWritten } = await fh.write(buf, off, buf.length - off);
    if (!(bytesWritten > 0)) throw new Error(`write made no progress at byte ${off} of ${buf.length}`);
    off += bytesWritten;
  }
}

async function runClients(file, mode, nClients, perClient, rec, open = fs.promises.open) {
  if (!['each', 'group'].includes(mode)) throw new Error('mode must be each or group');
  const fh = await open(file, 'w');
  const lat = [], batches = [];
  let pending = [], flushing = null, failed = null, lock = Promise.resolve();
  async function flusher() {
    while (pending.length) {
      const batch = pending; pending = [];
      try { await writeAll(fh, Buffer.concat(batch.map(x => x.buf))); await fh.sync(); }
      catch (e) { failed = e; for (const x of [...batch, ...pending]) x.fail(e); pending = []; break; }
      batches.push(batch.length); for (const x of batch) x.done();
    }
    flushing = null;
  }
  const commitGroup = buf => new Promise((done, fail) => {
    if (failed) return fail(failed);           // store has failed: no new commits
    pending.push({ buf, done, fail });
    if (!flushing) flushing = flusher();
  });
  const commitEach = buf => {
    const run = lock.then(async () => {
      if (failed) throw failed;
      try { await writeAll(fh, buf); await fh.sync(); } catch (e) { failed = e; throw e; }
      batches.push(1);
    });
    lock = run.catch(() => {}); return run;
  };
  const commit = mode === 'group' ? commitGroup : commitEach;
  const t0 = process.hrtime.bigint();
  const clients = await Promise.allSettled(Array.from({ length: nClients }, async () => {
    for (let i = 0; i < perClient; i++) {
      const s = process.hrtime.bigint(); await commit(rec); lat.push(Number(process.hrtime.bigint() - s) / 1e6);
    }
  }));
  await flushing; await lock;                  // no write or fsync is still running when the file closes
  await fh.close();
  const bad = clients.find(c => c.status === 'rejected');
  if (bad) throw bad.reason;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, total = nClients * perClient;
  return { mode, nClients, total, perSec: Math.round(total / ms * 1000), p50: percentile(lat, 50), p99: percentile(lat, 99),
    fsyncs: batches.length, avgBatch: total / batches.length, written: batches.reduce((a, b) => a + b, 0) };
}
module.exports = { runClients, writeAll };
