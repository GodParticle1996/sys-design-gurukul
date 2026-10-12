/* Mixture of Experts router: 64 experts, har token top-2 experts ko jaata hai.
   Tokens ki "pasand" skewed hai — kuch experts naturally popular (jaise ek expert jo code samajhta hai).
   free      → sirf pasand se chuno (sabse accha jawab, par popular experts par bheed)
   aux-loss  → training mein penalty jo router ki pasand ko hi flat kar deti hai (balance aata hai, par pasand bigadti hai)
   bias      → DeepSeek-V3: har expert ka ek bias sirf CHUNNE ke liye; overloaded → bias neeche, khaali → upar. Pasand wahi rehti hai.
   Quality proxy = chune gaye experts ki ASLI pasand ka average (free = 100%).
   node tools/router.js */
let s = 17; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const E = 64, K = 2, TOK = 4096, BATCHES = 60;
const pop = Array.from({ length: E }, (_, e) => 1.2 * Math.exp(-e / 10));   // expert 0 sabse popular, 63 sabse kam
const tokenAff = () => Array.from({ length: E }, (_, e) => pop[e] + 0.5 * gauss());
function topk(scores) { return scores.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, K).map(x => x[1]); }
function run(mode, alpha) {
  const bias = new Float64Array(E); let q = 0, qFree = 0, maxRatio = 0, idle = 0, lastLoad = null;
  for (let b = 0; b < BATCHES; b++) {
    const load = new Float64Array(E);
    for (let t = 0; t < TOK; t++) {
      const aff = tokenAff();
      const free = topk(aff); qFree += aff[free[0]] + aff[free[1]];
      let chosen;
      if (mode === 'free') chosen = free;
      else if (mode === 'aux-loss') chosen = topk(aff.map((v, e) => v - alpha * pop[e]));   // penalty ne router ki pasand hi badal di
      else chosen = topk(aff.map((v, e) => v + bias[e]));
      chosen.forEach(e => load[e]++); q += aff[chosen[0]] + aff[chosen[1]];
    }
    if (mode === 'bias') { const mean = TOK * K / E; for (let e = 0; e < E; e++) bias[e] += 0.02 * Math.sign(mean - load[e]); }   // sirf routing ka bias
    lastLoad = load;
  }
  const mean = TOK * K / E; maxRatio = Math.max(...lastLoad) / mean; idle = [...lastLoad].filter(x => x < mean * 0.25).length;
  return { maxRatio, idle, quality: 100 * q / qFree };
}
console.log(`${E} experts, top-${K}, ${TOK} tokens per batch, ${BATCHES} batches (aakhri batch ka load dekha)\n`);
console.log('routing      sabse busy expert (average ka kitna guna)   lagbhag khaali experts   quality proxy');
for (const [name, m, a] of [['free', 'free'], ['aux (halka)', 'aux-loss', 0.65], ['aux (tez)', 'aux-loss', 1.0], ['bias', 'bias']]) {
  const x = run(m, a);
  console.log(`${name.padEnd(12)} ${x.maxRatio.toFixed(1).padStart(8)}x                                ${String(x.idle).padStart(3)} / ${E}              ${x.quality.toFixed(1)}%`);
}
console.log('\nFree: ek expert average se kai guna busy — us GPU ki line mein sab ruk jaate hain, baaki GPUs khaali.');
console.log('Aux-loss: halka → bheed abhi bhi; tez → balance aaya par router ki "pasand" hi badal di (quality gira).');
console.log('Bias (loss-free): sirf overloaded/khaali experts ko halka dhakka → tez aux jitna balance, par zyada pasand bachi.');
console.log('(Toy proxy hai. Asli training mein aux-loss ka nuksaan gradient ke through hota hai — DeepSeek-V3 paper ka claim yahi hai.)');
