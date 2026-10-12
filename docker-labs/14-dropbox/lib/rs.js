/* Reed-Solomon erasure coding — GF(2^8), systematic Cauchy matrix. Koi dependency nahi.
   encode(data, K, M) → K data chunks + M parity chunks (sab barabar size)
   decode(chunks, K, M) → koi bhi K chunks bache hon toh original data wapas
   GF(256) mein "jod" = XOR, "guna" = log/exp tables se (primitive polynomial 0x11d). */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
const inv = a => EXP[255 - LOG[a]];

/* (K+M) × K encoding matrix: upar K rows identity (data chunks jaise ke taise), neeche M rows Cauchy: 1 / (x_i xor y_j) */
function matrix(K, M) {
  const m = [];
  for (let i = 0; i < K; i++) { const r = new Uint8Array(K); r[i] = 1; m.push(r); }
  for (let i = 0; i < M; i++) { const r = new Uint8Array(K); for (let j = 0; j < K; j++) r[j] = inv((K + i) ^ j); m.push(r); }
  return m;
}

function invert(a) {                        // K×K matrix ka inverse, Gauss-Jordan over GF(256)
  const n = a.length, m = a.map((r, i) => { const x = new Uint8Array(2 * n); x.set(r); x[n + i] = 1; return x; });
  for (let c = 0; c < n; c++) {
    let p = c; while (p < n && !m[p][c]) p++;
    if (p === n) throw new Error('singular');
    [m[c], m[p]] = [m[p], m[c]];
    const f = inv(m[c][c]); for (let j = 0; j < 2 * n; j++) m[c][j] = mul(m[c][j], f);
    for (let r = 0; r < n; r++) if (r !== c && m[r][c]) { const g = m[r][c]; for (let j = 0; j < 2 * n; j++) m[r][j] ^= mul(g, m[c][j]); }
  }
  return m.map(r => r.slice(n));
}

function encode(data, K, M) {
  const size = Math.ceil(data.length / K);
  const chunks = [];
  for (let i = 0; i < K; i++) { const c = new Uint8Array(size); c.set(data.subarray(i * size, Math.min(data.length, (i + 1) * size))); chunks.push(c); }
  const E = matrix(K, M);
  for (let p = 0; p < M; p++) {
    const out = new Uint8Array(size), row = E[K + p];
    for (let j = 0; j < K; j++) { const coef = row[j], src = chunks[j]; if (!coef) continue; const lc = LOG[coef];
      for (let b = 0; b < size; b++) { const s = src[b]; if (s) out[b] ^= EXP[lc + LOG[s]]; } }
    chunks.push(out);
  }
  return { chunks, size, length: data.length };
}

/* chunks: array of length K+M, gum hue chunks = null */
function decode(chunks, K, M, length) {
  const have = []; chunks.forEach((c, i) => { if (c && have.length < K) have.push(i); });
  if (have.length < K) throw new Error(`sirf ${chunks.filter(Boolean).length} chunks bache, ${K} chahiye — data GAYA`);
  const size = chunks[have[0]].length, E = matrix(K, M);
  const D = invert(have.map(i => E[i]));
  const out = new Uint8Array(K * size);
  for (let r = 0; r < K; r++) {
    if (have[r] === r && have.every((h, i) => h === i)) { out.set(chunks[r], r * size); continue; }   // saare data chunks zinda — decode ki zaroorat nahi
    const dst = out.subarray(r * size, (r + 1) * size);
    for (let j = 0; j < K; j++) { const coef = D[r][j], src = chunks[have[j]]; if (!coef) continue; const lc = LOG[coef];
      for (let b = 0; b < size; b++) { const s = src[b]; if (s) dst[b] ^= EXP[lc + LOG[s]]; } }
  }
  return out.subarray(0, length);
}

module.exports = { encode, decode };
