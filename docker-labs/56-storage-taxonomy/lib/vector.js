'use strict';
// Seeded embeddings in clumps, exact top-k by dot product, and an IVF index (k-means groups).
const { rng } = require('./rng');
const D = 128;
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }
function unit(v) { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s); for (let i = 0; i < v.length; i++) v[i] /= s; return v; }
function data(n, seed) {
  const r = rng(seed), centres = Array.from({ length: 200 }, () => unit(Float32Array.from({ length: D }, () => gauss(r))));
  const X = new Float32Array(n * D);
  for (let i = 0; i < n; i++) { const c = centres[Math.floor(r() * 200)]; const v = new Float32Array(D); for (let j = 0; j < D; j++) v[j] = c[j] + 0.06 * gauss(r); unit(v); X.set(v, i * D); }
  return X;
}
const dot = (X, i, q) => { let s = 0; const o = i * D; for (let j = 0; j < D; j++) s += X[o + j] * q[j]; return s; };
function topk(X, ids, q, k) { const best = []; for (const i of ids) { const s = dot(X, i, q); if (best.length < k || s > best[best.length - 1][0]) { best.push([s, i]); best.sort((a, b) => b[0] - a[0]); if (best.length > k) best.pop(); } } return best.map(b => b[1]); }
function kmeans(X, n, k, iters, seed) {
  const r = rng(seed), C = new Float32Array(k * D);
  const pick = () => { const i = Math.floor(r() * n); return X.subarray(i * D, i * D + D); };
  for (let c = 0; c < k; c++) C.set(pick(), c * D);
  const assign = new Int32Array(n);
  const assignAll = () => { for (let i = 0; i < n; i++) { let b = 0, bs = -Infinity; for (let c = 0; c < k; c++) { let s = 0; for (let j = 0; j < D; j++) s += X[i * D + j] * C[c * D + j]; if (s > bs) { bs = s; b = c; } } assign[i] = b; } };
  for (let it = 0; it < iters; it++) {
    assignAll();
    C.fill(0); const cnt = new Int32Array(k);
    for (let i = 0; i < n; i++) { cnt[assign[i]]++; for (let j = 0; j < D; j++) C[assign[i] * D + j] += X[i * D + j]; }
    for (let c = 0; c < k; c++) if (cnt[c]) unit(C.subarray(c * D, c * D + D)); else C.set(pick(), c * D);
  }
  assignAll();                                 // lists must match the FINAL centres that search ranks
  const lists = Array.from({ length: k }, () => []); for (let i = 0; i < n; i++) lists[assign[i]].push(i);
  return { C, lists };
}
module.exports = { D, data, dot, topk, kmeans, unit };
