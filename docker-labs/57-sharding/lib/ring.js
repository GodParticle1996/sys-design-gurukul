'use strict';
// Routers: key → shard number.
// modulo(n)      → h32(key) % n
// ring(n, per)   → every shard at `per` points on a 32-bit ring; a key goes to the first point clockwise
const { h32 } = require('./hash');
const modulo = n => key => h32(key) % n;
function ring(n, per = 150) {
  const points = [];
  for (let s = 0; s < n; s++) for (let v = 0; v < per; v++) points.push([h32(`shard${s}#${v}`), s]);
  points.sort((a, b) => a[0] - b[0]);
  const pos = Uint32Array.from(points, p => p[0]), owner = Int32Array.from(points, p => p[1]);
  const at = h => {                                                      // h = the key's hash, already computed
    let lo = 0, hi = pos.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pos[m] < h) lo = m + 1; else hi = m; }
    return owner[lo % pos.length];                                       // past the last point: wrap to the first
  };
  const route = key => at(h32(key));
  route.at = at;
  return route;
}
module.exports = { modulo, ring };
