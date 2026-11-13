'use strict';
// Quorum arithmetic for a cluster of n voters.
const majority = n => Math.floor(n / 2) + 1;
const tolerates = n => n - majority(n);    // voters that may be down while a majority still exists

const size = m => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c; };
// every subset of {0..n-1} with at least q members, as bit masks
function quorums(n, q) {
  const out = [];
  for (let m = 0; m < 1 << n; m++) if (size(m) >= q) out.push(m);
  return out;
}
// do two quorums of size >= q always share a voter?
function alwaysOverlap(n, q) {
  const qs = quorums(n, q);
  for (const a of qs) for (const b of qs) if ((a & b) === 0) return false;
  return true;
}
// chance that at least q of n voters are up; each is up on its own with probability 1 - p
function choose(a, b) { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return r; }
function chanceUp(n, q, p) {
  let s = 0;
  for (let up = q; up <= n; up++) s += choose(n, up) * (1 - p) ** up * p ** (n - up);
  return s;
}
module.exports = { majority, tolerates, quorums, alwaysOverlap, chanceUp };
