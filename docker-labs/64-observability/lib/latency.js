'use strict';
// ex0 — what an average, a percentile and a merged dashboard number really say.
const { rng } = require('./rng');
const { percentile, percentileLinear, mean } = require('./stats');

// The video's example: 99 requests at 10 ms and 1 request at 10 s.
function videoCase({ n = 100, slow = 1, fastMs = 10, slowMs = 10000 } = {}) {
  const xs = [...Array(n - slow).fill(fastMs), ...Array(slow).fill(slowMs)];
  return { mean: mean(xs), p50: percentile(xs, 50), p90: percentile(xs, 90), p99: percentile(xs, 99),
    p99lin: percentileLinear(xs, 99), max: Math.max(...xs) };
}

// One user makes k requests; each request is slow with probability p, independently (an assumption).
const userSees = (p, k) => 1 - (1 - p) ** k;

// Fixed buckets, like a Prometheus histogram (upper bounds in ms; the last one is +Inf). Counts here are per bucket;
// Prometheus classic `_bucket` series are cumulative (le = "less or equal"), the same information summed.
const BOUNDS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, Infinity];
function histogram(xs) { const c = new Array(BOUNDS.length).fill(0); for (const x of xs) c[BOUNDS.findIndex(b => x <= b)]++; return c; }
const mergeHist = hs => hs[0].map((_, i) => hs.reduce((a, h) => a + h[i], 0));
// Same idea as Prometheus histogram_quantile: find the bucket, assume values spread evenly inside it.
// Edge cases follow Prometheus: no observations or a NaN quantile → NaN; below 0 → −Inf; above 100 → +Inf.
// If the answer falls in the +Inf bucket, the largest finite bound is returned — a cap, not an estimate.
function histQuantile(counts, p) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total || Number.isNaN(p)) return NaN;
  if (p < 0) return -Infinity;
  if (p > 100) return Infinity;
  const rank = p / 100 * total;
  let cum = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0 && cum + counts[i] >= rank) {
      const lo = i ? BOUNDS[i - 1] : 0, hi = BOUNDS[i];
      return hi === Infinity ? lo : lo + (hi - lo) * (rank - cum) / counts[i];
    }
    cum += counts[i];
  }
  return BOUNDS[BOUNDS.length - 2];
}

// Seeded latencies: a log-normal "healthy" body around medianMs, and a share of slow requests near slowMs.
function samples(n, { seed, medianMs = 12, sigma = 0.3, slowP = 0, slowMs = 300 }) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const base = medianMs * Math.exp(sigma * z);
    out.push(r() < slowP ? slowMs * (0.9 + 0.2 * r()) : base);
  }
  return out;
}

// Three hosts behind one load balancer. Each host reports its own p99; a dashboard averages them.
const HOST_CASES = {
  'chhota-host-bimar': [{ name: 'A', n: 9000, seed: 1 }, { name: 'B', n: 900, seed: 2 }, { name: 'C', n: 100, seed: 3, slowP: 0.5, slowMs: 800 }],
  'bada-host-bimar': [{ name: 'A', n: 9000, seed: 4, slowP: 0.02, slowMs: 300 }, { name: 'B', n: 900, seed: 5 }, { name: 'C', n: 100, seed: 6 }],
};
function hosts(caseName) {
  const rows = HOST_CASES[caseName].map(h => { const xs = samples(h.n, h); return { name: h.name, n: h.n, xs, p99: percentile(xs, 99), hist: histogram(xs) }; });
  const all = rows.flatMap(h => h.xs);
  return { rows: rows.map(({ name, n, p99 }) => ({ name, n, p99 })), avgOfP99: mean(rows.map(h => h.p99)),
    trueP99: percentile(all, 99), mergedHistP99: histQuantile(mergeHist(rows.map(h => h.hist)), 99) };
}

module.exports = { videoCase, userSees, BOUNDS, histogram, mergeHist, histQuantile, samples, hosts, HOST_CASES };
