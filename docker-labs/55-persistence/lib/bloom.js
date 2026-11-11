'use strict';
// Bloom filter: a bit array plus k hash functions. "No" is always right; "maybe" is sometimes wrong (a false positive).
function mix(x, seed) {                    // 32-bit integer hash (murmur3 finaliser) of a number key
  let h = (x ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
class Bloom {
  constructor(n, bitsPerKey) {
    this.m = Math.max(64, Math.ceil(n * bitsPerKey));
    this.k = Math.max(1, Math.round(bitsPerKey * Math.LN2));
    this.bits = new Uint8Array(Math.ceil(this.m / 8));
  }
  idx(key, i) { const h1 = mix(key, 0x9747b28c), h2 = mix(key, 0x5bd1e995) | 1; return (h1 + Math.imul(i, h2) >>> 0) % this.m; }
  add(key) { for (let i = 0; i < this.k; i++) { const b = this.idx(key, i); this.bits[b >> 3] |= 1 << (b & 7); } }
  mayHave(key) { for (let i = 0; i < this.k; i++) { const b = this.idx(key, i); if (!(this.bits[b >> 3] & (1 << (b & 7)))) return false; } return true; }
}
module.exports = { Bloom };
