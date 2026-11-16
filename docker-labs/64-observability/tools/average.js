'use strict';
// ex0 — average, percentiles, users and dashboards (arithmetic + a seeded model; nothing timed).
const L = require('../lib/latency');
const ms = x => x >= 1000 ? (x / 1000).toFixed(x % 1000 ? 2 : 0) + ' s' : (Number.isInteger(x) ? String(x) : x.toFixed(1)) + ' ms';

console.log('ex0 — average kya chhupata hai (hisaab + seeded model; kuch time nahi kiya)\n');
console.log('1) Video ka misaal: 100 requests — 99 × 10 ms, 1 × 10 s');
for (const slow of [1, 2]) {
  const v = L.videoCase({ slow });
  console.log(`   ${slow} dheema: average ${ms(v.mean)} · p50 ${ms(v.p50)} · p90 ${ms(v.p90)} · p99 (nearest-rank) ${ms(v.p99)} · p99 (linear) ${ms(v.p99lin)} · max ${ms(v.max)}`);
}
console.log('   → 1 dheema request par nearest-rank p99 = 10 ms: dheema request p99 se UPAR baitha hai. p99 "sabse bure 1%" ki');
console.log('     seema hai, unka haal nahi. Tool ki percentile definition bhi number badal deti hai (10 ms vs 109.9 ms).');
console.log('     Isliye max (ya p99.9) aur dheeme requests ki ginti bhi dekho.\n');

console.log('2) Ek user, kai requests (har request 1% chance se dheemi, ek-doosre se aazaad — maana hua)');
console.log('   requests/user   kam se kam ek dheemi');
for (const k of [1, 5, 20, 50, 100]) console.log(`   ${String(k).padStart(13)}   ${(L.userSees(0.01, k) * 100).toFixed(1)}%`);
console.log('   → percentile requests ka hai, users ka nahi. 100 requests wale session mein 63.4% users kam se kam ek dheemi request dekhte hain.\n');

console.log('3) Teen hosts, ek dashboard: "har host ka p99, phir unka average" vs asli p99 (seeded model, 10,000 requests)');
const ratios = [];
for (const c of Object.keys(L.HOST_CASES)) {
  const h = L.hosts(c);
  ratios.push(h.avgOfP99 / h.trueP99);
  const b = L.BOUNDS.findIndex(x => h.mergedHistP99 <= x);
  console.log(`   ${c}: ${h.rows.map(r => `${r.name} (${r.n.toLocaleString('en-IN')} req) p99 ${ms(r.p99)}`).join(' · ')}`);
  console.log(`      p99 ka average ${ms(h.avgOfP99)} · asli p99 (saare requests) ${ms(h.trueP99)} · histogram jod kar ${ms(h.mergedHistP99)} (bucket ${b ? L.BOUNDS[b - 1] : 0}–${L.BOUNDS[b]} ms)`);
}
console.log(`   → p99 ka average koi percentile nahi: ek case mein ${ratios[0].toFixed(1)}× zyada bataya, doosre mein ${(1 / ratios[1]).toFixed(1)}× kam.`);
console.log('     Histogram ke buckets jod sakte ho (ginti judti hai), phir p99 nikaalo — jawab bucket ki chaudai jitna sahi,');
console.log('     jab tak jawab kisi finite bucket mein ho. Sabse upar (+Inf, is lab mein 10 s se upar) gira toh sirf 10 s ki seema milti hai:');
console.log(`     teen 20 s ki requests ka histogram p99 = ${L.histQuantile(L.histogram([20000, 20000, 20000]), 99) / 1000} s. Badi latency ke liye bada aakhri bucket rakho.`);
