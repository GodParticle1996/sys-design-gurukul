'use strict';
// ex3-bitrot: REAL files. 1,000 customer names, stored twice: plain text, and in 32-byte slots with a CRC32 each.
// One bit is flipped on disk in both files (the same name). Who notices? Then the checksummed copy repairs the slot
// from a second copy (a replica), which is what checksums plus replication buy.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crc32 } = require('../lib/crc32');

const SLOT = 32, N = 1000, TARGET = 500;
const names = Array.from({ length: N }, (_, i) => i === TARGET ? 'Andrew Fernandes' : `Customer ${String(i).padStart(4, '0')}`);
function slot(name) {
  const p = Buffer.from(name), b = Buffer.alloc(SLOT);
  b.writeUInt32LE(crc32(p), 0); b.writeUInt8(p.length, 4); p.copy(b, 5); return b;
}
function readSlots(buf) {
  const out = [];
  for (let i = 0; i < buf.length / SLOT; i++) {
    const s = buf.subarray(i * SLOT, (i + 1) * SLOT), len = s.readUInt8(4);
    const p = s.subarray(5, 5 + Math.min(len, SLOT - 5));
    out.push({ name: p.toString(), ok: len <= SLOT - 5 && crc32(p) === s.readUInt32LE(0) });
  }
  return out;
}
function flipBit(file, byte, bit) { const fd = fs.openSync(file, 'r+'); const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, byte); b[0] ^= 1 << bit; fs.writeSync(fd, b, 0, 1, byte); fs.fsyncSync(fd); fs.closeSync(fd); }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab55-bitrot-'));
try {
  const plain = path.join(dir, 'names.txt'), sum = path.join(dir, 'names.slots'), replica = path.join(dir, 'replica.slots');
  fs.writeFileSync(plain, names.join('\n') + '\n');
  fs.writeFileSync(sum, Buffer.concat(names.map(slot)));
  fs.copyFileSync(sum, replica);
  console.log(`REAL FILES: ${N} names; "${names[TARGET]}" is name #${TARGET}. Flipping bit 0 of the last letter in both files.`);

  const plainOffset = names.slice(0, TARGET).reduce((n, s) => n + s.length + 1, 0) + names[TARGET].length - 1;
  flipBit(plain, plainOffset, 0);
  flipBit(sum, TARGET * SLOT + 5 + names[TARGET].length - 1, 0);

  const readPlain = fs.readFileSync(plain, 'utf8').split('\n');
  const changed = readPlain.filter((s, i) => i < N && s !== names[i]);
  console.log(`plain text : read ${N} names, no error. Name #${TARGET} is now "${readPlain[TARGET]}". Changed names: ${changed.length} — the reader cannot tell.`);

  const slots = readSlots(fs.readFileSync(sum));
  const bad = slots.map((s, i) => s.ok ? -1 : i).filter(i => i >= 0);
  console.log(`checksummed: ${slots.length - bad.length} slots verify, ${bad.length} fails: #${bad.join(', #')} ("${slots[bad[0]].name}" does not match its CRC32)`);

  const good = fs.readFileSync(replica).subarray(bad[0] * SLOT, (bad[0] + 1) * SLOT);
  const fd = fs.openSync(sum, 'r+'); fs.writeSync(fd, good, 0, SLOT, bad[0] * SLOT); fs.fsyncSync(fd); fs.closeSync(fd);
  const again = readSlots(fs.readFileSync(sum));
  console.log(`repair     : slot #${bad[0]} copied from the replica → ${again.filter(s => s.ok).length}/${N} verify, name #${TARGET} = "${again[TARGET].name}"`);
  console.log('A checksum DETECTS damage; a second copy REPAIRS it. Neither alone does both.');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
