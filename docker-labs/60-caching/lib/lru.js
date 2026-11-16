'use strict';
// LRU cache on a Map: Map keeps insertion order, so the first key is the least recently used.
function lru(capacity) {
  const m = new Map();
  let hits = 0, misses = 0;
  return {
    get(k) {
      if (m.has(k)) { const v = m.get(k); m.delete(k); m.set(k, v); hits++; return v; }
      misses++; return undefined;
    },
    set(k, v) {
      if (m.has(k)) m.delete(k);
      else if (m.size >= capacity) m.delete(m.keys().next().value);
      m.set(k, v);
    },
    size: () => m.size,
    stats: () => ({ hits, misses, rate: hits / Math.max(1, hits + misses) }),
    reset() { hits = 0; misses = 0; },
  };
}
module.exports = { lru };
