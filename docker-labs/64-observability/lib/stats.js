'use strict';
// Two percentile definitions. Tools disagree on small samples, so the lab prints both.
// Nearest-rank: the value at rank ceil(p/100 × n) of the sorted samples (always a real sample).
function percentile(xs, p) { const s = [...xs].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(p / 100 * s.length) - 1)]; }
// Linear interpolation between the two closest ranks (the default in NumPy and many dashboards).
function percentileLinear(xs, p) {
  const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * p / 100, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
module.exports = { percentile, percentileLinear, mean };
