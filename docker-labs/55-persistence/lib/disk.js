'use strict';
// Two disks with the same small interface, so the same KV code runs on both.
//   RealDisk  — the real filesystem (Node fs): write() puts bytes in the OS page cache, fsync() waits for the device.
//   ModelDisk — a MODEL of one machine: bytes written but not yet fsynced sit in a volatile "page cache".
//               appCrash() keeps them (the OS is still running), powerCut() throws them away (the cache was RAM).
// A real power cut cannot be done from a Node process, so that half is a model; ex2 runs the app-crash half for real.
const fs = require('node:fs');
const path = require('node:path');

// write() may store fewer bytes than asked. Keep writing until every byte is in; no progress is an error.
function writeAllSync(fsi, fd, buf) {
  let off = 0;
  while (off < buf.length) {
    const n = fsi.writeSync(fd, buf, off, buf.length - off);
    if (!(n > 0)) throw new Error(`write made no progress at byte ${off} of ${buf.length}`);
    off += n;
  }
}

class RealDisk {
  // fsi defaults to Node's fs; tests pass a wrapper that writes only part of each buffer.
  constructor(dir, fsi = fs) {
    this.dir = dir; this.fsi = fsi;
    if (!fsi.existsSync(dir)) { fsi.mkdirSync(dir, { recursive: true }); this.syncDir(path.dirname(dir)); }
  }
  p(name) { return path.join(this.dir, name); }
  syncDir(dir) { const dfd = this.fsi.openSync(dir, 'r'); try { this.fsi.fsyncSync(dfd); } finally { this.fsi.closeSync(dfd); } }
  open(name) {                                // a NEW file's name is durable only after its folder is fsynced
    const existed = this.fsi.existsSync(this.p(name));
    const fd = this.fsi.openSync(this.p(name), 'a');
    if (!existed) { this.fsi.fsyncSync(fd); this.syncDir(this.dir); }
    return fd;
  }
  append(fd, buf) { writeAllSync(this.fsi, fd, buf); }
  sync(fd) { this.fsi.fsyncSync(fd); }
  truncate(fd, len) { this.fsi.ftruncateSync(fd, len); this.fsi.fsyncSync(fd); }
  read(name) { try { return this.fsi.readFileSync(this.p(name)); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
  writeFileDurable(name, buf) {               // write a temp file in full, fsync it, rename over the old one, fsync the folder
    const tmp = this.p(name + '.tmp');
    const fd = this.fsi.openSync(tmp, 'w');
    try { writeAllSync(this.fsi, fd, buf); this.fsi.fsyncSync(fd); } finally { this.fsi.closeSync(fd); }
    this.fsi.renameSync(tmp, this.p(name));
    this.syncDir(this.dir);
  }
  close(fd) { this.fsi.closeSync(fd); }
}

class ModelDisk {
  constructor() { this.files = new Map(); this.handles = new Map(); this.nextFd = 3; this.stats = { appends: 0, syncs: 0 }; }
  file(name) {
    if (!this.files.has(name)) this.files.set(name, { durable: Buffer.alloc(0), pending: [] });
    return this.files.get(name);
  }
  open(name) { const fd = this.nextFd++; this.handles.set(fd, name); this.file(name); return fd; }
  append(fd, buf) { this.file(this.handles.get(fd)).pending.push(Buffer.from(buf)); this.stats.appends++; }
  sync(fd) {
    const f = this.file(this.handles.get(fd));
    f.durable = Buffer.concat([f.durable, ...f.pending]); f.pending = []; this.stats.syncs++;
  }
  truncate(fd, len) { const f = this.file(this.handles.get(fd)); f.durable = Buffer.concat([f.durable, ...f.pending]).subarray(0, len); f.pending = []; }
  read(name) { if (!this.files.has(name)) return null; const f = this.files.get(name); return Buffer.concat([f.durable, ...f.pending]); }
  writeFileDurable(name, buf) { this.files.set(name, { durable: Buffer.from(buf), pending: [] }); }
  close(fd) { this.handles.delete(fd); }
  appCrash() { this.handles.clear(); }                                    // OS keeps its page cache
  powerCut() { for (const f of this.files.values()) f.pending = []; this.handles.clear(); }   // RAM is gone
  unsyncedBytes() { let n = 0; for (const f of this.files.values()) for (const b of f.pending) n += b.length; return n; }
}

module.exports = { RealDisk, ModelDisk, writeAllSync };
