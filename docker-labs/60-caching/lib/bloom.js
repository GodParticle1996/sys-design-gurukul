'use strict';
// Bloom filter on integer ids: m bits, k probes (double hashing). "No" is certain; "maybe" can be wrong.
const mix = x => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };
function bloom(n, bitsPerKey = 10) {
  const m = n * bitsPerKey, k = Math.max(1, Math.round(bitsPerKey * Math.LN2)), bits = new Uint8Array(Math.ceil(m / 8));
  const probe = (id, fn) => { const h1 = mix(id), h2 = mix(id ^ 0x9e3779b9) | 1; for (let i = 0; i < k; i++) if (fn(((h1 + Math.imul(i, h2)) >>> 0) % m) === false) return false; return true; };
  return {
    add: id => probe(id, b => { bits[b >> 3] |= 1 << (b & 7); }),
    has: id => probe(id, b => (bits[b >> 3] & (1 << (b & 7))) !== 0),
    k, m, bytes: bits.length,
    theory: () => Math.pow(1 - Math.exp(-k * n / m), k),
  };
}
module.exports = { bloom };
