'use strict';
// "1 CPU cycle = 1 second" scale. ghz = clock speed; ns = real latency.
function human(ns, ghz) {
  let s = ns * ghz;                                         // cycles = seconds on the human scale
  const units = [[365 * 86400, 'saal'], [30 * 86400, 'mahine'], [86400, 'din'], [3600, 'ghante'], [60, 'minute'], [1, 'second']];
  for (const [u, name] of units) if (s >= u) { const v = s / u; return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${name}`; }
  return `${s.toFixed(1)} second`;
}
module.exports = { human };
