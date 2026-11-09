'use strict';
// Seeded random numbers + percentile helpers. Same seed → same output, every run.

function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Exponential sample with the given mean (ms).
function exp(rand, mean) {
  return -Math.log(1 - rand()) * mean;
}

// Nearest-rank percentile: the value that p% of samples are at or below.
function percentile(sorted, p) {
  if (!sorted.length) throw new Error('percentile: empty list');
  if (!(p > 0 && p <= 100)) throw new Error('percentile: p must be in (0, 100]');
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[rank - 1];
}

function summary(values) {
  if (!values.length) throw new Error('summary: empty list');
  const sorted = Float64Array.from(values).sort();
  let sum = 0;
  for (const v of sorted) sum += v;
  return {
    n: sorted.length,
    mean: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    p999: percentile(sorted, 99.9),
    max: sorted[sorted.length - 1],
  };
}

function ms(v) {
  if (v >= 10000) return `${(v / 1000).toFixed(1)} s`;
  if (v >= 100) return `${Math.round(v)} ms`;
  return `${v.toFixed(1)} ms`;
}

// Indian digit grouping, e.g. 1,00,000.
function inr(n) {
  return Math.round(n).toLocaleString('en-IN');
}

module.exports = { rng, exp, percentile, summary, ms, inr };
