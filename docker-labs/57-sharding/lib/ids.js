'use strict';
// ID generators for ex3.
// Snowflake (Twitter, 2010): 64-bit signed integer, top bit 0 | 41 bits ms since a custom epoch | 10 bits machine | 12 bits sequence.
// (Twitter's code splits the 10 machine bits into 5 datacenter + 5 worker bits; here they are one number 0–1023.)
// UUIDv4: 122 random bits. UUIDv7 (RFC 9562, May 2024): 48-bit Unix ms timestamp first, then version, variant and random bits.
const EPOCH = 1577836800000;                                             // 2020-01-01 UTC, our custom epoch
const MAX_SEQ = 4095, MAX_MS = 2 ** 41;                              // 41 bits of ms after the epoch (~69.7 years)

function snowflake({ machine, clock = Date.now, guard = true }) {
  if (!Number.isInteger(machine) || machine < 0 || machine > 1023) {
    throw new RangeError('machine id must be 0–1023');
  }
  let last = -1, seq = 0;
  const stats = { waits: 0 };
  const m = BigInt(machine);
  function next() {
    let t = clock(), s = 0;
    // Twitter's IdWorker also refuses when the clock goes back
    if (t < last && guard) throw new Error(`clock moved backwards by ${last - t} ms`);
    if (t === last) {
      s = (seq + 1) & MAX_SEQ;
      if (s === 0) {                       // 4096 IDs used in this ms
        stats.waits++;
        while ((t = clock()) <= last) { }  // spin until the next ms
      }
    }
    if (!Number.isInteger(t) || t < EPOCH || t - EPOCH >= MAX_MS) {
      throw new RangeError(`time ${t} is outside the 41-bit window`);
    }
    seq = s; last = t;                     // only a good ID changes state
    return (BigInt(t - EPOCH) << 22n) | (m << 12n) | BigInt(seq);
  }
  next.stats = stats;
  return next;
}
const decode = id => ({ ms: Number(id >> 22n) + EPOCH, machine: Number((id >> 12n) & 1023n), seq: Number(id & 4095n) });

function uuid4(r) {                                                       // r = seeded random → reproducible page counts
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(r() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}
function uuid7(ms, r) {
  const b = uuid4(r);
  let t = ms; for (let i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); }   // 48-bit big-endian ms first
  b[6] = (b[6] & 0x0f) | 0x70;
  return b;
}
const text = b => { const h = Buffer.from(b).toString('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
module.exports = { EPOCH, MAX_MS, snowflake, decode, uuid4, uuid7, text };
