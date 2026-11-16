'use strict';
// Kafka's default key partitioner: toPositive(murmur2(keyBytes)) % numPartitions (same constants as the Java client).
function murmur2(buf) {
  const m = 0x5bd1e995, len = buf.length;
  let h = (0x9747b28c ^ len) | 0;
  const n4 = len >> 2;
  for (let i = 0; i < n4; i++) {
    const j = i * 4;
    let k = buf[j] | (buf[j + 1] << 8) | (buf[j + 2] << 16) | (buf[j + 3] << 24);
    k = Math.imul(k, m); k ^= k >>> 24; k = Math.imul(k, m);
    h = Math.imul(h, m); h ^= k;
  }
  const t = len & ~3;
  switch (len & 3) {
    case 3: h ^= buf[t + 2] << 16; // falls through
    case 2: h ^= buf[t + 1] << 8;  // falls through
    case 1: h ^= buf[t]; h = Math.imul(h, m);
  }
  h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
  return h | 0;
}
const partitionFor = (key, n) => (murmur2(Buffer.from(String(key))) & 0x7fffffff) % n;
const { rng } = require('./rng');
// MODEL (seeded): 1,000 users × 10 events; consumers run at different speeds. Returns users whose events finished out of order.
function ordering(keyed, seed = 11) {
  const r = rng(seed), P = 6, parts = Array.from({ length: P }, () => []);
  let rr = 0;
  for (let e = 0; e < 10; e++) for (let u = 0; u < 1000; u++) parts[keyed ? partitionFor('user-' + u, P) : rr++ % P].push({ u, e });
  const done = new Map();
  for (const p of parts) { const slow = 1 + r() * 3; let t = 0; for (const ev of p) { t += (1 + r() * 8) * slow; (done.get(ev.u) || done.set(ev.u, []).get(ev.u)).push([ev.e, t]); } }
  let bad = 0;
  for (const evs of done.values()) { evs.sort((a, b) => a[0] - b[0]); if (evs.some((x, i) => i && x[1] < evs[i - 1][1])) bad++; }
  return bad;
}
module.exports = { murmur2, partitionFor, ordering };
