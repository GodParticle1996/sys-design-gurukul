'use strict';
// A tiny key-value store built the way real databases protect writes:
//   put()        — append the change to the write-ahead log (wal.log); with sync 'commit', fsync before saying "done"
//   checkpoint() — write the whole table to table.snap (temp file + fsync + rename), then empty the log
//   open()       — load table.snap, then replay wal.log on top; a last record with missing bytes is cut off before new
//                  appends; a checksum mismatch anywhere stops recovery instead
const { encode, decodeAll } = require('./wal');

class KV {
  constructor(disk, { sync = 'commit' } = {}) {
    if (!['commit', 'none'].includes(sync)) throw new Error('sync must be commit or none');
    this.disk = disk; this.sync = sync; this.map = new Map(); this.wal = null;
  }
  open() {
    this.map = new Map();
    const snap = this.disk.read('table.snap');
    let fromSnapshot = 0;
    if (snap) {
      const s = decodeAll(snap);
      if (s.records.length !== 1 || s.stop) throw new Error('table.snap is damaged: ' + (s.stop || 'wrong record count'));
      for (const [k, v] of JSON.parse(s.records[0])) this.map.set(k, v);
      fromSnapshot = this.map.size;
    }
    const log = this.disk.read('wal.log') || Buffer.alloc(0);
    const r = decodeAll(log);
    // A crash mid-append leaves the LAST record with fewer bytes than its header promises: that tail was never
    // acknowledged, so it is cut (or later records would hide behind it). A checksum mismatch — even in the last
    // record — may be bit rot in a record that WAS acknowledged: stop, and leave the log untouched for repair.
    const tail = r.stop === 'torn header' || r.stop === 'torn record';
    if (r.stop && !tail) throw new Error(`wal.log is damaged at byte ${r.at} (${r.stop}); log left unchanged — repair from a backup or replica`);
    for (const rec of r.records) { const { k, v } = JSON.parse(rec); this.map.set(k, v); }
    this.wal = this.disk.open('wal.log');
    if (r.stop) this.disk.truncate(this.wal, r.at);
    return { fromSnapshot, replayed: r.records.length, stop: r.stop, cutAt: r.stop ? r.at : null };
  }
  put(k, v) {
    this.disk.append(this.wal, encode(JSON.stringify({ k, v })));
    if (this.sync === 'commit') this.disk.sync(this.wal);
    this.map.set(k, v);
  }
  get(k) { return this.map.get(k); }
  checkpoint() {
    this.disk.writeFileDurable('table.snap', encode(JSON.stringify([...this.map])));
    this.disk.truncate(this.wal, 0);
  }
  close() { if (this.wal !== null) this.disk.close(this.wal); this.wal = null; }
}

module.exports = { KV };
