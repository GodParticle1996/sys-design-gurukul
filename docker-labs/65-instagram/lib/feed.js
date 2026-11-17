'use strict';
// ex3 — pull vs push vs hybrid feed, on a follower-count model (no graph is built).
// Model: user of popularity rank r has f(r) = FMAX · r^(−α) followers, r = 1 … N. α is solved so the AVERAGE is 300
// followers (the video's normal user) with FMAX = 600 million (the video's Ronaldo). Real graphs are heavy-tailed too,
// but not exactly this curve — every number below is a property of the model.
const N = 1e9, FMAX = 600e6, MEAN = 300;

// S(a, b, α) = Σ_{r=a..b} r^(−α): exact for r ≤ 10^6, Euler–Maclaurin integral for the rest.
function S(a, b, alpha) {
  if (a > b) return 0;                          // empty range
  let sum = 0; const cut = Math.min(b, 1e6);
  for (let r = a; r <= cut; r++) sum += r ** -alpha;
  if (b > cut) {
    const lo = Math.max(a, cut + 1), F = x => x ** (1 - alpha) / (1 - alpha);
    sum += F(b) - F(lo) + (lo ** -alpha + b ** -alpha) / 2;
  }
  return sum;
}
function solveAlpha() {                         // mean followers = FMAX·S(1,N)/N = MEAN
  let lo = 0.5, hi = 0.99;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (FMAX * S(1, N, mid) / N > MEAN) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const ALPHA = solveAlpha();
const followers = r => FMAX * r ** -ALPHA;
const rankAbove = T => Math.min(N, Math.floor((FMAX / T) ** (1 / ALPHA)));      // users with more than T followers (at most N)

// Hybrid with VIP threshold T (T = Infinity → pure push). Posts are spread evenly over users (an assumption).
// writesPerS: the push cluster's capacity (the video's "1 million writes/s"). utilization = offered push writes ÷ capacity.
function hybrid(T, { postsPerS = 3472, following = 300, writesPerS = 1e6 } = {}) {
  if (!(T > 0)) throw new Error('VIP threshold must be a positive number of followers');
  const vips = T === Infinity ? 0 : rankAbove(T), total = S(1, N, ALPHA);
  const vipEdgeShare = vips ? S(1, vips, ALPHA) / total : 0;          // share of all follow edges that point to a VIP
  const pushPerPost = FMAX * S(vips + 1, N, ALPHA) / N;               // average fan-out of one post (VIP posts push 0)
  const maxFanout = vips >= N ? 0 : vips ? followers(vips + 1) : FMAX;
  return { T, vips, vipEdgeShare, pushPerPost, pushWritesPerS: postsPerS * pushPerPost, utilization: postsPerS * pushPerPost / writesPerS,
    maxFanout, maxFanoutSeconds: maxFanout / writesPerS, vipListsPerRead: following * vipEdgeShare };
}
// Pull: a feed read asks every followed user's shard; each answers slowly with p (independent) → page slow chance.
const pullSlow = (follows, p = 0.01) => 1 - (1 - p) ** follows;
// Inbox memory: ids × 8 bytes × users (raw ids only — no key overhead, no replicas).
const inboxBytes = ({ users = 500e6, ids = 500, bytes = 8 } = {}) => users * ids * bytes;
module.exports = { N, FMAX, MEAN, ALPHA, S, followers, rankAbove, hybrid, pullSlow, inboxBytes };
