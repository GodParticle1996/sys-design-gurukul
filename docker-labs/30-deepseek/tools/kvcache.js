/* KV cache: model har pichhle token ke keys + values yaad rakhta hai, har layer mein. Lambi baat = zyada memory, har user ke liye.
   DeepSeek-V3 jaisa shape: 61 layers, 128 attention heads, head dim 128, BF16 (2 bytes).
   MHA  = har head ka apna K aur V.
   GQA  = 8 heads ek K/V share karte hain (16 KV groups) — sasta, par heads ki "apni nazar" kam.
   MLA  = K/V ko ek chhote LATENT vector (512 + 64 RoPE = 576 numbers per layer) mein compress karo, zaroorat par wapas kholo.
   GPU: 80 GB, jisme ~40 GB KV cache ke liye bacha maana (baaki weights/activations) — ASSUMPTION.
   node tools/kvcache.js */
const L = 61, H = 128, D = 128, BYTES = 2, KV_BUDGET_GB = 40;
const perToken = {
  'MHA (poora)': 2 * L * H * D * BYTES,
  'GQA (16 groups)': 2 * L * 16 * D * BYTES,
  'MLA (latent 576)': L * 576 * BYTES,
};
const gb = b => b / 1073741824;
console.log('tareeka              per token        4k context        32k context        128k context      users per GPU (32k, 40 GB)');
for (const [name, b] of Object.entries(perToken)) {
  const row = [4096, 32768, 131072].map(c => (gb(b * c) >= 1 ? gb(b * c).toFixed(1) + ' GB' : (b * c / 1048576).toFixed(0) + ' MB').padStart(10));
  const users = Math.floor(KV_BUDGET_GB / gb(b * 32768));
  console.log(`${name.padEnd(20)} ${(b / 1024).toFixed(0).padStart(6)} KB      ${row.join('        ')}        ${users < 1 ? '0 (ek user bhi fit nahi)' : users}`);
}
const ratio = perToken['MHA (poora)'] / perToken['MLA (latent 576)'];
console.log(`\nMLA ka KV cache MHA se ${ratio.toFixed(0)}x chhota. Training ek baar hoti hai; serving har request par, hamesha —`);
console.log('isliye KV cache ka har byte "forever bill" hai. MoE training ka bill ghatata hai, MLA serving ka.');
