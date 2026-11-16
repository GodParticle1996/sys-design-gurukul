'use strict';
// A tiny store run as a child process. through: one write at a time (write, fsync, ack). group: 256 writes, one fsync.
// back/os: writes arrive at a fixed 1,00,000/sec, because they are acked from memory and would otherwise flood RAM.
// It tells the parent how many writes it has acked ("ho gaya") every 20 ms. The parent kills it with SIGKILL.
const fs = require('node:fs');
const [, , mode, file, flushMs = '1000'] = process.argv;
const C = 256, REC = 16, RATE = 100000;   // group size; 16-byte record ("seq\n" padded); back/os: 1,000 writes every 10 ms
const path = require('node:path');
const fd = fs.openSync(file, 'w');
fs.fsyncSync(fd);                                                   // make the new (empty) file and its directory entry durable
const dfd = fs.openSync(path.dirname(file), 'r'); fs.fsyncSync(dfd); fs.closeSync(dfd);
let seq = 0, acked = 0;
const rec = n => String(n).padStart(REC - 1, '0') + '\n';
const writeAll = str => {                                           // write() may write fewer bytes than asked: loop
  const b = Buffer.from(str);
  for (let off = 0; off < b.length;) off += fs.writeSync(fd, b, off, b.length - off);
};
const report = () => process.send({ acked });
setInterval(report, 20);

if (mode === 'through') {                                         // write, fsync, ack — one at a time
  const step = () => { for (let i = 0; i < 20; i++) { writeAll(rec(++seq)); fs.fsyncSync(fd); acked = seq; } setImmediate(step); };
  step();
} else if (mode === 'group') {                                    // all pending writes, ONE fsync, then ack all
  const step = () => { let s = ''; for (let i = 0; i < C; i++) s += rec(++seq); writeAll(s); fs.fsyncSync(fd); acked = seq; setImmediate(step); };
  step();
} else if (mode === 'back') {                                     // ack from memory; flush dirty writes every flushMs
  const dirty = [];
  setInterval(() => { if (!dirty.length) return; writeAll(dirty.join('')); fs.fsyncSync(fd); dirty.length = 0; }, Number(flushMs));
  setInterval(() => { for (let i = 0; i < RATE / 100; i++) { dirty.push(rec(++seq)); acked = seq; } }, 10);
} else if (mode === 'os') {                                       // write() into the OS page cache, ack, never fsync
  setInterval(() => { let s = ''; for (let i = 0; i < RATE / 100; i++) s += rec(++seq); writeAll(s); acked = seq; }, 10);
} else { console.error('mode?'); process.exit(2); }
