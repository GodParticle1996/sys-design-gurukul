'use strict';
// Write-ahead log format: every record is [length u32][header crc32 u32][payload crc32 u32][payload bytes].
// The header crc covers the length field, so a flipped length bit is caught instead of looking like a short record.
// decodeAll() reads from the start and stops at the first record that is cut short (a write the crash interrupted),
// whose header checksum fails, or whose payload checksum fails. Everything before that point is trusted.
const { crc32 } = require('./crc32');
const HEADER = 12, MAX_RECORD = 1 << 20;

function lenSum(b, off) { return crc32(b.subarray(off, off + 4)); }

function encode(payload) {
  const p = Buffer.from(payload);
  if (p.length > MAX_RECORD) throw new Error('record too large');
  const b = Buffer.alloc(HEADER + p.length);
  b.writeUInt32LE(p.length, 0);
  b.writeUInt32LE(lenSum(b, 0), 4);
  b.writeUInt32LE(crc32(p), 8);
  p.copy(b, HEADER);
  return b;
}

function decodeAll(buf) {
  const records = [];
  let off = 0;
  while (off < buf.length) {
    if (buf.length - off < HEADER) return { records, stop: 'torn header', at: off };
    const len = buf.readUInt32LE(off), hsum = buf.readUInt32LE(off + 4), sum = buf.readUInt32LE(off + 8);
    if (lenSum(buf, off) !== hsum) return { records, stop: 'header checksum mismatch', at: off };
    if (len > MAX_RECORD) return { records, stop: 'bad length', at: off };
    if (buf.length - off - HEADER < len) return { records, stop: 'torn record', at: off };
    const p = buf.subarray(off + HEADER, off + HEADER + len);
    if (crc32(p) !== sum) return { records, stop: 'checksum mismatch', at: off };
    records.push(p.toString());
    off += HEADER + len;
  }
  return { records, stop: null, at: off };
}

module.exports = { encode, decodeAll, HEADER };
