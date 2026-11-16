'use strict';
// MODEL (counters, no real DB): requests for ids that do not exist. Users 1 … N exist in the DB.
// Requests arrive at `perSec`; request i happens at time i / perSec seconds.
// Count DB queries for: nothing, negative cache ("not found" cached `negTtl` s), Bloom filter, Bloom + negative cache.
// The Bloom filter itself is a real data structure (lib/bloom.js).
const { bloom } = require('./bloom');
function scenario(ids, { N, b, newIds = new Set(), perSec = 1000, negTtl = 60 }) {
  const exists = id => (id >= 1 && id <= N) || newIds.has(id);
  const out = {};
  for (const name of ['none', 'negative', 'bloom', 'bloom+negative']) {
    const neg = new Map(); let db = 0, wrongNo = 0, i = 0;
    for (const id of ids) {
      const now = i++ / perSec;
      if (name.startsWith('bloom') && !b.has(id)) { if (exists(id)) wrongNo++; continue; }   // filter says "no": rejected
      if (name.endsWith('negative') && neg.get(id) > now) continue;                          // cached "not found", not expired
      db++;
      if (!exists(id) && name.endsWith('negative')) neg.set(id, now + negTtl);
    }
    out[name] = { db, wrongNo };
  }
  return out;
}
module.exports = { scenario, bloom };
