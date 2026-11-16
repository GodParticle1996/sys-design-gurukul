'use strict';
// MODEL (seeded): one user request needs answers from `calls` services. Each service call usually takes 1–3 ms,
// but `slowP` of calls hit a hiccup (GC pause, retransmit) and take 50 ms. Sequential: the request waits for the sum.
// Parallel fan-out: the request waits for the slowest call. Assumptions: every answer is required, no contention, a slow
// call is exactly 50 ms. independent = each call has its own hiccup; shared = one hiccup (say a GC on the caller) hits all calls.
const { rng } = require('./rng');
const { percentile } = require('./stats');
function run({ calls = 10, mode = 'sequential', requests = 100000, slowP = 0.01, seed = 7, shared = false } = {}) {
  const r = rng(seed), lat = []; let touched = 0;
  for (let q = 0; q < requests; q++) {
    let sum = 0, max = 0, slow = false;
    const sharedSlow = shared && r() < slowP;
    for (let c = 0; c < calls; c++) {
      const isSlow = shared ? sharedSlow : r() < slowP, x = isSlow ? 50 : 1 + 2 * r();
      if (isSlow) slow = true;
      sum += x; max = Math.max(max, x);
    }
    if (slow) touched++;
    lat.push(mode === 'sequential' ? sum : max);
  }
  return { p50: percentile(lat, 50), p99: percentile(lat, 99), touched: touched / requests };
}
const theoryTouched = (calls, slowP = 0.01) => 1 - Math.pow(1 - slowP, calls);
module.exports = { run, theoryTouched };
