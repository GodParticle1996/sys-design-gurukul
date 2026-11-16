'use strict';
// Cache penetration: requests for ids that do not exist. Users 1 … N exist in the DB.
// Count DB queries for: nothing, negative cache ("not found" cached 60 s), Bloom filter, Bloom + negative cache.
const { bloom } = require('./bloom');
function scenario(ids, { N, b, newIds = new Set() }) {
  const exists = id => (id >= 1 && id <= N) || newIds.has(id);
  const out = {};
  for (const name of ['none', 'negative', 'bloom', 'bloom+negative']) {
    const neg = new Set(); let db = 0, wrongNo = 0;
    for (const id of ids) {
      if (name.startsWith('bloom') && !b.has(id)) { if (exists(id)) wrongNo++; continue; }   // filter says "no": rejected
      if (name.endsWith('negative') && neg.has(id)) continue;                                // cached "not found"
      db++;
      if (!exists(id) && name.endsWith('negative')) neg.add(id);
    }
    out[name] = { db, wrongNo };
  }
  return out;
}
module.exports = { scenario, bloom };
