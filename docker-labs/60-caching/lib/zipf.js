'use strict';
// Zipf popularity: key k (1 = most popular) is asked with weight 1 / k^s. s = 0 is uniform.
function zipf(n, s, r) {
  const cdf = new Float64Array(n);
  let sum = 0;
  for (let k = 1; k <= n; k++) { sum += 1 / Math.pow(k, s); cdf[k - 1] = sum; }
  for (let i = 0; i < n; i++) cdf[i] /= sum;
  const next = () => {                                     // binary search the CDF
    const u = r(); let lo = 0, hi = n - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; }
    return lo;
  };
  const topShare = frac => cdf[Math.max(0, Math.round(n * frac) - 1)];   // exact share of the top fraction
  return { next, topShare };
}
module.exports = { zipf };
