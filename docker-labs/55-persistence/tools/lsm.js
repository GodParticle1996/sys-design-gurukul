'use strict';
// ex5-lsm: MODEL. The same 10 lakh random 100-byte rows into an LSM-tree: bytes written, files, and point lookups
// with and without bloom filters. Then bloom filter false positives against bits per key (measured, not formula).
const { LSM } = require('../lib/lsm');
const { Bloom } = require('../lib/bloom');
const { shuffled } = require('../lib/rng');

const N = 1_000_000, inr = n => n.toLocaleString('en-IN');
const keys = shuffled(N, 55);
console.log(`== ${inr(N)} random inserts; memtable 10,000 rows (1 MB); size-tiered compaction, 4 files per tier ==`);
const runs = {};
for (const bits of [10, 0]) {
  const l = new LSM({ memtableEntries: 10_000, bitsPerKey: bits });
  for (const k of keys) l.put(k, k);
  l.flush();
  runs[bits] = l;
}
const l = runs[10], b = l.bytes, mb = x => (x / 1e6).toFixed(0) + ' MB';
console.log(`user rows ${mb(b.user)} → WAL ${mb(b.wal)} + memtable flushes ${mb(b.flush)} + compaction ${mb(b.compaction)} = ${l.writeAmp().toFixed(1)}× written`);
console.log(`files now: ${l.files()} (tiers: ${l.tiers.map((t, i) => `T${i}:${t ? t.length : 0}`).join(' ')})`);
console.log('');
console.log('lookups (10,000 each)         files checked   bloom said "no"   4 KB block reads   wasted reads (key not in file)');
for (const bits of [10, 0]) {
  const t = runs[bits];
  for (const [label, from] of [['key exists', 0], ['key missing', N]]) {
    t.lookups = { tablesChecked: 0, bloomSkips: 0, blockReads: 0, wastedReads: 0, falsePositives: 0 };
    const order = shuffled(N, 9);
    for (let i = 0; i < 10_000; i++) t.get(from + order[i]);
    const x = t.lookups, per = v => (v / 10_000).toFixed(2);
    console.log(`${(bits ? 'bloom 10 bits/key' : 'no bloom').padEnd(18)} ${label.padEnd(11)} ${per(x.tablesChecked).padStart(6)}   ${per(x.bloomSkips).padStart(15)}   ${per(x.blockReads).padStart(16)}   ${per(x.wastedReads).padStart(30)}`);
  }
}
console.log('');
console.log('== bloom filter: false positives measured on 1 lakh keys, 2 lakh absent keys ==');
for (const bits of [5, 10, 15]) {
  const f = new Bloom(100_000, bits); for (let i = 0; i < 100_000; i++) f.add(i);
  let fp = 0; for (let i = 100_000; i < 300_000; i++) if (f.mayHave(i)) fp++;
  console.log(`${String(bits).padStart(2)} bits per key (${f.k} hashes): ${(fp / 2000).toFixed(2)}% "maybe" for keys that are not there; never "no" for a key that is`);
}
console.log('A full-key bloom filter cannot skip files for an arbitrary range scan; a prefix bloom filter can help scans within one prefix.');
