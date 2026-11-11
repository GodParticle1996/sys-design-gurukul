'use strict';
// ex0-slowmo: MODEL. One KV store on a model machine, step by step: what is only in the OS page cache (RAM),
// what is on the disk, and what each kind of crash leaves behind. Same KV code as the real runs (lib/kv.js).
const { KV } = require('../lib/kv');
const { ModelDisk } = require('../lib/disk');
const { decodeAll } = require('../lib/wal');

function view(d) {
  const f = d.files.get('wal.log'), s = d.files.get('table.snap');
  const durable = f ? decodeAll(f.durable).records.length : 0, cached = f ? f.pending.length : 0;
  const snap = s ? JSON.parse(decodeAll(s.durable).records[0]).length : 0;
  return `wal.log: ${durable} on disk + ${cached} only in page cache │ table.snap: ${snap} rows`;
}

for (const sync of ['commit', 'none']) {
  console.log(`== MODEL: sync=${sync} ${sync === 'commit' ? '(fsync before saying "done")' : '(say "done" right after write())'} ==`);
  const d = new ModelDisk(), kv = new KV(d, { sync }); kv.open();
  kv.put('order-41', 250); console.log(`put order-41=250            → done │ ${view(d)}`);
  kv.put('order-42', 180); console.log(`put order-42=180            → done │ ${view(d)}`);
  kv.checkpoint();         console.log(`checkpoint (table + empty log)     │ ${view(d)}`);
  kv.put('order-43', 320); console.log(`put order-43=320            → done │ ${view(d)}`);
  kv.put('order-44', 90);  console.log(`put order-44=90             → done │ ${view(d)}`);
  for (const ev of ['appCrash', 'powerCut']) {
    const copy = new ModelDisk();
    for (const [name, f] of d.files) copy.files.set(name, { durable: Buffer.from(f.durable), pending: f.pending.map(b => Buffer.from(b)) });
    copy[ev]();
    const back = new KV(copy, { sync }); const r = back.open();
    const lost = ['order-41', 'order-42', 'order-43', 'order-44'].filter(k => back.get(k) === undefined);
    console.log(`  ${ev === 'appCrash' ? 'app crash (kill -9)' : 'power cut          '} → restart: ${r.fromSnapshot} rows from table.snap + ${r.replayed} replayed from log │ lost: ${lost.length ? lost.join(', ') + ' (both said "done")' : 'nothing'}`);
  }
  console.log('');
}
console.log('MODEL timings on this machine (ex1): write() ~1 µs (RAM); fsync ~1–5 ms (the device). The "done" in sync=none is ~1,000× faster');
console.log('— and that speed is exactly the page cache, which a power cut erases.');
