'use strict';
// MODEL: an LSM-tree. Writes go to the log and an in-memory table (memtable). A full memtable is written out as one
// sorted, never-changed file (SSTable) with its own bloom filter. Size-tiered compaction: when a tier has `fanout`
// files, they are merged (newest value wins) into one file of the next tier. Bytes are counted, not timed.
const { Bloom } = require('./bloom');

class LSM {
  constructor({ memtableEntries, bitsPerKey = 10, fanout = 4, entryBytes = 100 }) {
    Object.assign(this, { memtableEntries, bitsPerKey, fanout, entryBytes });
    this.mem = new Map(); this.tiers = [];
    this.bytes = { user: 0, wal: 0, flush: 0, compaction: 0 };
    this.lookups = { tablesChecked: 0, bloomSkips: 0, blockReads: 0, wastedReads: 0, falsePositives: 0 };
  }
  put(k, v) {
    this.bytes.user += this.entryBytes; this.bytes.wal += this.entryBytes;
    this.mem.set(k, v);
    if (this.mem.size >= this.memtableEntries) this.flush();
  }
  table(entries) {
    const keys = entries.map(e => e[0]), vals = entries.map(e => e[1]);
    const bloom = this.bitsPerKey > 0 ? new Bloom(keys.length, this.bitsPerKey) : null;   // 0 = no filter
    if (bloom) for (const k of keys) bloom.add(k);
    return { keys, vals, bloom };
  }
  flush() {
    if (!this.mem.size) return;
    const entries = [...this.mem].sort((a, b) => a[0] - b[0]);
    this.mem = new Map();
    this.bytes.flush += entries.length * this.entryBytes;
    (this.tiers[0] = this.tiers[0] || []).push(this.table(entries));
    this.compact(0);
  }
  compact(t) {
    const tier = this.tiers[t];
    if (!tier || tier.length < this.fanout) return;
    const merged = new Map();
    for (const tab of tier) for (let i = 0; i < tab.keys.length; i++) merged.set(tab.keys[i], tab.vals[i]);  // later = newer
    const entries = [...merged].sort((a, b) => a[0] - b[0]);
    this.bytes.compaction += entries.length * this.entryBytes;
    this.tiers[t] = [];
    (this.tiers[t + 1] = this.tiers[t + 1] || []).push(this.table(entries));
    this.compact(t + 1);
  }
  get(k) {
    if (this.mem.has(k)) return this.mem.get(k);
    for (const tier of this.tiers) {                         // lower tier = newer data
      if (!tier) continue;
      for (let j = tier.length - 1; j >= 0; j--) {           // within a tier, later file = newer
        const tab = tier[j];
        this.lookups.tablesChecked++;
        if (tab.bloom && !tab.bloom.mayHave(k)) { this.lookups.bloomSkips++; continue; }
        this.lookups.blockReads++;                           // one 4 KB block read (index of block starts kept in RAM)
        let lo = 0, hi = tab.keys.length - 1;
        while (lo <= hi) { const m = (lo + hi) >> 1; if (tab.keys[m] === k) return tab.vals[m]; if (tab.keys[m] < k) lo = m + 1; else hi = m - 1; }
        this.lookups.wastedReads++;                         // read a block, key not there
        if (tab.bloom) this.lookups.falsePositives++;       // ...although the filter said "maybe"
      }
    }
    return undefined;
  }
  files() { return this.tiers.reduce((n, t) => n + (t ? t.length : 0), 0); }
  writeAmp() { const b = this.bytes; return (b.wal + b.flush + b.compaction) / b.user; }
}
module.exports = { LSM };
