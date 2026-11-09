'use strict';
// Nearest-rank percentile (same rule as lab 52): sort, rank = ceil(p% × N), that sample.
function percentile(xs, p) {
  if (!xs.length) throw new Error('percentile of an empty list');
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(1, Math.ceil(p / 100 * s.length)) - 1];
}
const median = xs => percentile(xs, 50);
module.exports = { percentile, median };
