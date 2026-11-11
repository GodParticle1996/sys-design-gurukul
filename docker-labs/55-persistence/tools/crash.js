'use strict';
// ex2-crash: REAL processes and files. A child process writes orders and prints "ack N" after each put returns.
// The parent kills it with SIGKILL (no cleanup, no goodbye), opens the same files and counts what survived.
// Then a torn tail: half a record at the end of the log, as a power cut in the middle of a write can leave.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { KV } = require('../lib/kv');
const { RealDisk } = require('../lib/disk');
const { encode, decodeAll } = require('../lib/wal');

function crashRun(sync, killAfterAcks) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab55-crash-'));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'crash-child.js'), dir, sync], { stdio: ['ignore', 'pipe', 'inherit'] });
    let lastAck = 0, buf = '', killed = false;
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('child did not reach the ack threshold in 60 s')); }, 60000);
    child.stdout.on('data', d => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (line.startsWith('ack ')) lastAck = Number(line.slice(4));
      }
      if (!killed && lastAck >= killAfterAcks) { killed = child.kill('SIGKILL'); if (!killed) reject(new Error('kill failed')); }
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {      // 'close' = process gone AND its stdout fully read
      clearTimeout(timer);
      if (signal !== 'SIGKILL' || lastAck < killAfterAcks) return reject(new Error(`child ended without the planned SIGKILL (code ${code}, signal ${signal}, acks ${lastAck})`));
      const kv = new KV(new RealDisk(dir), { sync }); const r = kv.open();
      let missing = 0; for (let n = 1; n <= lastAck; n++) if (kv.get('order-' + n) !== n * 10) missing++;
      kv.close(); fs.rmSync(dir, { recursive: true, force: true });
      resolve({ sync, signal, lastAck, onDisk: r.replayed, missing, stop: r.stop });
    });
  });
}

(async () => {
  console.log(`REAL RUN: Node ${process.version}, ${os.platform()}; child process killed with SIGKILL after it reported 5,000 acks`);
  console.log('');
  console.log('sync     killed by   acked to parent   records in wal.log after restart   acked but missing   log end');
  for (const sync of ['none', 'commit']) {
    const r = await crashRun(sync, 5000);
    console.log(`${sync.padEnd(8)} ${String(r.signal).padEnd(11)} ${r.lastAck.toLocaleString('en-IN').padStart(15)}   ${r.onDisk.toLocaleString('en-IN').padStart(32)}   ${String(r.missing).padStart(17)}   ${r.stop || 'clean'}`);
  }
  console.log('kill -9 ends the PROCESS, not the OS: bytes already handed to write() are in the page cache and reach the disk later.');
  console.log('A power cut also ends the OS — see ex0 (model) for what sync=none loses then.');
  console.log('');

  console.log('== torn tail: the last record is cut in half (power failed mid-write) ==');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab55-torn-'));
  try {
    const disk = new RealDisk(dir);
    let kv = new KV(disk, { sync: 'commit' }); kv.open();
    for (let n = 1; n <= 3; n++) kv.put('order-' + n, n * 10);
    kv.close();
    const half = encode(JSON.stringify({ k: 'order-4', v: 40 })).subarray(0, 16);   // full header + 4 payload bytes
    fs.appendFileSync(path.join(dir, 'wal.log'), half);
    const raw = fs.readFileSync(path.join(dir, 'wal.log'));
    const d = decodeAll(raw);
    console.log(`wal.log: ${raw.length} bytes; reader trusts ${d.records.length} records, stops at byte ${d.at}: ${d.stop}`);

    const glued = Buffer.concat([raw, encode(JSON.stringify({ k: 'order-5', v: 50 }))]);
    console.log(`if the torn bytes stay and order-5 is appended after them: reader finds ${decodeAll(glued).records.length} records — order-5 is invisible`);

    kv = new KV(disk, { sync: 'commit' }); const r = kv.open();
    console.log(`KV.open(): replayed ${r.replayed}, cut the log at byte ${r.cutAt} (${r.stop})`);
    kv.put('order-5', 50); kv.close();
    kv = new KV(disk, { sync: 'commit' }); kv.open();
    console.log(`after cutting, order-5 appended, reopened: order-5 = ${kv.get('order-5')}, keys = ${kv.map.size}`);
    kv.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
