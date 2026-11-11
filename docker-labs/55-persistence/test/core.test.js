'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { crc32 } = require('../lib/crc32');
const { encode, decodeAll, HEADER } = require('../lib/wal');
const { KV } = require('../lib/kv');
const { RealDisk, ModelDisk } = require('../lib/disk');
const { BPlusTree } = require('../lib/btree');
const { LSM } = require('../lib/lsm');
const { Bloom } = require('../lib/bloom');
const { simulate } = require('../lib/ftl');
const { runClients } = require('../lib/commit');
const { shuffled } = require('../lib/rng');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lab55-test-'));

test('crc32 matches the standard check value, and catches every single-bit flip in the payload', () => {
  assert.strictEqual(crc32(Buffer.from('123456789')), 0xcbf43926);
  const rec = encode('Andrew Fernandes');
  for (let bit = 0; bit < (rec.length - HEADER) * 8; bit++) {
    const b = Buffer.from(rec); b[HEADER + (bit >> 3)] ^= 1 << (bit & 7);
    assert.strictEqual(decodeAll(b).stop, 'checksum mismatch', `bit ${bit}`);
  }
});

test('WAL reader trusts records up to a torn tail or a damaged header, and nothing after', () => {
  const b = Buffer.concat(['a', 'bb', 'ccc'].map(encode));
  assert.deepStrictEqual(decodeAll(b), { records: ['a', 'bb', 'ccc'], stop: null, at: b.length });
  assert.deepStrictEqual(decodeAll(b.subarray(0, b.length - 1)).records, ['a', 'bb']);
  assert.strictEqual(decodeAll(b.subarray(0, b.length - 1)).stop, 'torn record');
  assert.strictEqual(decodeAll(Buffer.concat([b, Buffer.from([1, 2, 3])])).stop, 'torn header');
  const bad = Buffer.from(b); bad.writeUInt32LE(0xffffffff, 0);
  assert.strictEqual(decodeAll(bad).stop, 'header checksum mismatch');
  for (let bit = 0; bit < 64; bit++) {                                  // every bit of length + header crc
    const h = Buffer.from(b); h[bit >> 3] ^= 1 << (bit & 7);
    assert.strictEqual(decodeAll(h).stop, 'header checksum mismatch', `header bit ${bit}`);
  }
});

test('a flipped length bit in an acknowledged record stops recovery and changes no byte', () => {
  const d = new ModelDisk(); let kv = new KV(d); kv.open();
  kv.put('k1', 1); kv.put('k2', 2); kv.put('k3', 3); kv.close();
  const raw = d.read('wal.log'), second = encode('{"k":"k1","v":1}').length;
  const bad = Buffer.from(raw); bad[second + 1] ^= 0x80;                // length 16 -> 32,784: points past the end
  d.writeFileDurable('wal.log', bad);
  assert.throws(() => new KV(d).open(), /damaged at byte \d+ \(header checksum mismatch\)/);
  assert.ok(d.read('wal.log').equals(bad), 'log unchanged');
});

test('only sync=none + power cut loses acknowledged puts (model disk)', () => {
  for (const sync of ['commit', 'none']) for (const ev of ['appCrash', 'powerCut']) {
    const d = new ModelDisk(), kv = new KV(d, { sync }); kv.open();
    for (let i = 0; i < 100; i++) kv.put('k' + i, i);
    kv.checkpoint();
    for (let i = 100; i < 150; i++) kv.put('k' + i, i);
    d[ev]();
    const back = new KV(d, { sync }); back.open();
    const expect = sync === 'none' && ev === 'powerCut' ? 100 : 150;
    assert.strictEqual(back.map.size, expect, `${sync} ${ev}`);
  }
});

test('open() cuts a torn tail, so records appended later can be read', () => {
  const dir = tmp();
  try {
    const disk = new RealDisk(dir);
    let kv = new KV(disk); kv.open(); kv.put('a', 1); kv.close();
    fs.appendFileSync(path.join(dir, 'wal.log'), encode('{"k":"b","v":2}').subarray(0, HEADER + 3));
    kv = new KV(disk); const r = kv.open();
    assert.strictEqual(r.stop, 'torn record');
    assert.strictEqual(kv.get('a'), 1);
    const good = encode('{"k":"a","v":1}').length;
    assert.strictEqual(fs.statSync(path.join(dir, 'wal.log')).size, good);   // only the torn bytes were removed
    kv.put('c', 3); kv.close();
    kv = new KV(disk); kv.open();
    assert.deepStrictEqual([...kv.map], [['a', 1], ['c', 3]]); kv.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('checkpoint + replay: the table and the log together give every key back (real files)', () => {
  const dir = tmp();
  try {
    const disk = new RealDisk(dir);
    let kv = new KV(disk); kv.open();
    for (let i = 0; i < 50; i++) kv.put('k' + i, i);
    kv.checkpoint();
    for (let i = 50; i < 80; i++) kv.put('k' + i, i);
    kv.put('k0', 'new'); kv.close();
    kv = new KV(disk); const r = kv.open();
    assert.deepStrictEqual([r.fromSnapshot, r.replayed], [50, 31]);
    assert.strictEqual(kv.map.size, 80); assert.strictEqual(kv.get('k0'), 'new'); kv.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('SIGKILL of the writing process loses no acknowledged put, even without fsync (real process)', async () => {
  const dir = tmp();
  try {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'crash-child.js'), dir, 'none'], { stdio: ['ignore', 'pipe', 'inherit'] });
    let last = 0, buf = '', killed = false;
    const signal = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('no 500 acks in 30 s')); }, 30000);
      child.stdout.on('data', d => {
        buf += d; let i;
        while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.startsWith('ack ')) last = Number(l.slice(4)); }
        if (!killed && last >= 500) killed = child.kill('SIGKILL');
      });
      child.on('error', reject);
      child.on('close', (code, sig) => { clearTimeout(timer); resolve(sig); });   // close: stdout fully read
    });
    assert.ok(killed, 'kill was sent'); assert.strictEqual(signal, 'SIGKILL'); assert.ok(last >= 500, `acks ${last}`);
    const kv = new KV(new RealDisk(dir), { sync: 'none' }); kv.open();
    for (let n = 1; n <= last; n++) assert.strictEqual(kv.get('order-' + n), n * 10, `order-${n}`);
    kv.close();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('group commit shares fsyncs between waiting clients; every commit is written once (real file)', async () => {
  const dir = tmp();
  try {
    const rec = encode('x'.repeat(40));
    const g = await runClients(path.join(dir, 'g.log'), 'group', 16, 10, rec);
    const e = await runClients(path.join(dir, 'e.log'), 'each', 4, 5, rec);
    assert.strictEqual(g.written, 160); assert.ok(g.fsyncs < 160, `fsyncs ${g.fsyncs}`);
    assert.strictEqual(fs.statSync(path.join(dir, 'g.log')).size, 160 * rec.length);
    assert.strictEqual(e.fsyncs, 20); assert.strictEqual(fs.statSync(path.join(dir, 'e.log')).size, 20 * rec.length);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('B+tree finds every key at any page size; a cold lookup reads one page per level, or one with inner pages pinned', () => {
  for (const [leafCap, innerCap] of [[4, 4], [81, 512]]) {
    const t = new BPlusTree({ leafCap, innerCap, poolPages: 1e9 });
    for (const k of shuffled(20000, 3)) t.put(k, -k);
    for (let i = 0; i < 20000; i++) assert.strictEqual(t.get(i), -i);
    assert.strictEqual(t.get(20000), undefined);
    const h = t.shape().height;
    t.coldPool([], 1); t.stats.reads = 0; t.get(1234); assert.strictEqual(t.stats.reads, h);
    t.coldPool(t.innerIds(), 1); t.stats.reads = 0;
    for (let i = 0; i < 200; i++) t.get(i * 97);
    assert.strictEqual(t.stats.reads, 200);
  }
});

test('LSM: newest value wins across flushes and compactions; bloom filters never hide a key', () => {
  const l = new LSM({ memtableEntries: 100, bitsPerKey: 10 });
  for (let round = 0; round < 5; round++) for (const k of shuffled(2000, round)) l.put(k, round * 10000 + k);
  for (let k = 0; k < 2000; k++) assert.strictEqual(l.get(k), 40000 + k);
  assert.strictEqual(l.get(5000), undefined);
  const same = new LSM({ memtableEntries: 100, bitsPerKey: 10 });          // every flush holds the same 100 keys
  for (let round = 0; round < 16; round++) for (let k = 0; k < 100; k++) same.put(k, round);
  assert.strictEqual(same.files(), 1);
  for (let k = 0; k < 100; k++) assert.strictEqual(same.get(k), 15);
  const f = new Bloom(10000, 10); for (let i = 0; i < 10000; i++) f.add(i);
  for (let i = 0; i < 10000; i++) assert.ok(f.mayHave(i));
  let fp = 0; for (let i = 10000; i < 110000; i++) if (f.mayHave(i)) fp++;
  assert.ok(fp > 400 && fp < 1300, `false positives ${fp} of 100,000`);
});

test('SSD model: sequential overwrites copy nothing; random overwrites copy more as the drive fills', () => {
  assert.strictEqual(simulate({ fill: 0.9, pattern: 'sequential', blocks: 64, pagesPerBlock: 64 }).gcWrites, 0);
  const wa = [0.5, 0.75, 0.9].map(fill => simulate({ fill, blocks: 64, pagesPerBlock: 64 }).writeAmp);
  assert.ok(wa[0] < wa[1] && wa[1] < wa[2], wa.join(' < '));
});

test('recovery stops on a checksum mismatch anywhere, even in the last record, and leaves the file untouched', () => {
  const dir = tmp();
  try {
    const disk = new RealDisk(dir);
    let kv = new KV(disk); kv.open(); kv.put('k1', 1); kv.put('k2', 2); kv.put('k3', 3); kv.close();
    const file = path.join(dir, 'wal.log'), raw = fs.readFileSync(file);
    const bad = Buffer.from(raw); bad[raw.length - 30] ^= 1;                    // inside record 2 of 3
    fs.writeFileSync(file, bad);
    assert.throws(() => new KV(disk).open(), /damaged at byte \d+ \(checksum mismatch\)/);
    assert.ok(fs.readFileSync(file).equals(bad), 'log unchanged');
    const lastBad = Buffer.from(raw); lastBad[raw.length - 2] ^= 1;               // inside the last (acknowledged) record
    fs.writeFileSync(file, lastBad);
    assert.throws(() => new KV(disk).open(), /checksum mismatch/);
    assert.ok(fs.readFileSync(file).equals(lastBad), 'log unchanged');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('short writes: every byte is written before fsync and "done"; no progress is an error; a new log name is made durable', async () => {
  const dir = tmp();
  try {
    const calls = [];
    const halfFs = Object.assign(Object.create(fs), {                 // writes at most half of what it is asked
      writeSync: (fd, b, off = 0, len = b.length - off) => fs.writeSync(fd, b, off, Math.max(1, Math.floor(len / 2))),
      fsyncSync: fd => { calls.push(['fsync', fd]); return fs.fsyncSync(fd); },
      openSync: (p, f) => { const fd = fs.openSync(p, f); calls.push(['open', p, f, fd]); return fd; },
    });
    const disk = new RealDisk(path.join(dir, 'store'), halfFs);
    let kv = new KV(disk); kv.open();
    const dirOpen = calls.findIndex(c => c[0] === 'open' && c[1] === path.join(dir, 'store') && c[2] === 'r');
    assert.ok(dirOpen >= 0, 'folder opened after creating wal.log');
    const dfd = calls[dirOpen][3], next = calls.slice(dirOpen + 1);
    const reopen = next.findIndex(c => c[0] === 'open' && c[3] === dfd);
    assert.ok(next.slice(0, reopen < 0 ? next.length : reopen).some(c => c[0] === 'fsync' && c[1] === dfd), 'folder fd fsynced');
    for (let i = 0; i < 20; i++) kv.put('k' + i, 'v'.repeat(50));
    kv.checkpoint(); kv.put('after', 1); kv.close();
    kv = new KV(new RealDisk(path.join(dir, 'store'))); kv.open();
    assert.strictEqual(kv.map.size, 21); assert.strictEqual(kv.get('k19'), 'v'.repeat(50)); kv.close();
    const stuck = Object.assign(Object.create(fs), { writeSync: () => 0 });
    const d2 = new RealDisk(path.join(dir, 's2'), stuck); const k2 = new KV(d2); k2.open();
    assert.throws(() => k2.put('x', 1), /no progress/);
    k2.close();
    const half = async (file, flags) => {                              // FileHandle that writes half of each request
      const fh = await fs.promises.open(file, flags);
      return { write: (b, off, len) => fh.write(b, off, Math.max(1, Math.floor(len / 2))), sync: () => fh.sync(), close: () => fh.close() };
    };
    const rec = encode('y'.repeat(40));
    for (const mode of ['group', 'each']) {
      const f = path.join(dir, mode + '.log');
      const r = await runClients(f, mode, 4, 5, rec, half);
      assert.strictEqual(fs.statSync(f).size, 20 * rec.length, mode);
      assert.strictEqual(decodeAll(fs.readFileSync(f)).records.length, 20, mode);
      assert.strictEqual(r.written, 20);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('fail-stop: after a write error no later commit is acknowledged, and the file closes after I/O settles', async () => {
  for (const mode of ['group', 'each']) {
    const events = []; let writes = 0;
    const flaky = async () => ({
      write: async (b, off, len) => {
        writes++;
        if (writes === 2) { events.push('write-4'); return { bytesWritten: Math.min(4, len) }; }
        if (writes === 3) { events.push('EIO'); throw Object.assign(new Error('EIO'), { code: 'EIO' }); }
        await new Promise(r => setTimeout(r, 2)); events.push('write'); return { bytesWritten: len };
      },
      sync: async () => { await new Promise(r => setTimeout(r, 2)); events.push('sync'); },
      close: async () => { events.push('close'); },
    });
    const rec = encode('z'.repeat(40));
    await assert.rejects(runClients('unused', mode, 8, 5, rec, flaky), /EIO/, mode);
    const err = events.indexOf('EIO');
    assert.ok(err > 0, mode + ' error injected');
    assert.deepStrictEqual(events.slice(err + 1), ['close'], `${mode}: nothing after the error but close: ${events.slice(err).join(',')}`);
  }
});
