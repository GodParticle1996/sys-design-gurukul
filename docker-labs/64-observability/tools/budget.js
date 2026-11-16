'use strict';
// ex4 — error budget arithmetic, and two alert styles on five incidents (minute-by-minute model, 30-day month).
const B = require('../lib/budget');
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);

console.log('ex4 — error budget aur alert (hisaab + ek mahine ka minute-dar-minute model; traffic barabar maana)\n');
console.log('1) Budget, 30 din ka mahina:');
console.log('   (budget = poora band rehne ke minute, ya utne hi "poore fail minute" ke barabar errors)');
for (const s of [0.999, 0.9995, 0.9999]) console.log(`   SLO ${(s * 100).toFixed(2)}% → ${f2(B.budgetMinutes(s))} min`);
const b = B.budgetMinutes(0.999);
console.log(`   Video: 5 min kharch → ${f1(b - 5)} min bache (hari jhandi). 2 hafte mein 40 min → ${f1(b - 40)} min bache (deploy rok).`);
console.log('   Requests mein bhi gin sakte ho: 10 crore requests/mahina, 99.9% → 1,00,000 fail ho sakti hain.\n');

console.log('2) Paanch incidents, SLO 99.9%. "Kab" = incident shuru hone ke kitne minute baad, (us waqt tak budget kitna jala):');
const rules = B.rules(0.999);
const tags = ['V', 'A', 'B', 'C', 'D'];
const notes = ['', '  (SRE Workbook approach 1)', '', '', ''];
rules.forEach((r, i) => console.log(`   ${tags[i]} = ${r.kind === 'page' ? 'PAGE' : 'TICKET'}: ${r.label}${notes[i]}`));
console.log('   (V aur A: pichhle 10 min ka chalta average; B–D: SRE Workbook Table 5-8, lambi aur chhoti window dono upar hon)');
console.log(('   incident                    poora jala   ' + tags.map(t => t.padEnd(16)).join('')).trimEnd());
for (const inc of B.INCIDENTS) {
  const r = B.run(inc);
  const cells = rules.map(x => { const a = r.alerts[x.id]; return a ? `${a.afterMin} min (${f2(a.budgetUsedPct)}%)` : '—'; });
  console.log(`   ${inc.label.padEnd(26)}  ${(f2(r.budgetPct) + '%').padStart(8)}     ${cells.map(c => c.padEnd(16)).join('')}`.trimEnd());
}
const out = B.run(B.INCIDENTS[0]).alerts;
console.log(`
   Outage khatam hone ke baad alert kitni der bajta raha (reset time): ${rules.map((x, i) => `${tags[i]} ${out[x.id].resetMin} min`).join(' · ')}
   (chhoti window ki wajah se B 4 min mein chup; D ki chhoti window 6 ghante ki hai)

   → Video ka 1% rule (V): 0.3% × 7 din (budget ka 70%) aur 0.2% kabhi nahi pakadta — par 5 min ke 5% jhatke par 2 min
     mein jagata hai. Seedha threshold A (SLO ki seema) har incident 5 min ke andar pakadta hai, par 0.58% aur 0.05% budget
     wale jhatkon par bhi raat 3 baje jagata hai. Aise page baar-baar aayein toh log alerts ko nazarandaaz karne lagte hain.
   → Burn-rate alerts (B, C, D) sirf tab page karte hain jab budget sach mein khatre mein ho. Keemat: 2% wale 6 ghante ke
     incident par page 44 min baad (tab tak 2% budget jal chuka). Dheemi jalan (0.3%, 7 din) par page nahi, ticket —
     ~1 din baad, 10% budget par. Rule ka chunaav precision, recall, detection time aur reset time ka tradeoff hai;
     Workbook ke numbers shuruaati maan hain, apne SLO aur traffic par tune karo.`);
