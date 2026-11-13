'use strict';
// Nearest-rank percentile: the value at rank ceil(p/100 × n) of the sorted samples.
function percentile(xs, p) { const s = [...xs].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(p / 100 * s.length) - 1)]; }
module.exports = { percentile };
