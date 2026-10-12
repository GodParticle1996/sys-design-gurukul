/* Rush hour. Sadak ki speed waqt ke saath badalti hai. Do tareeke:
   "abhi wali speed" — jo abhi dikh raha hai wahi poore safar ke liye maan lo.
   "time-dependent"  — har sadak par pahunchne ke WAQT ki speed use karo (Maps yahi karta hai).
   node tools/eta.js  → 500 trips, ETA ki galti minute mein. */
const args = require('./args')();
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
/* Speed curve: shaam ko traffic badhta hai, peak ke aas-paas speed ~40% reh jaati hai.
   Maps ke paas SEEKHA HUA curve hota hai (history) — aur aaj ka asli traffic usse thoda alag (peak 9 min late, thoda zyada). */
const learned = t => { const x = (t - 18.25) / 1.6; return 1 - 0.60 * Math.exp(-x * x); };
const actual = t => { const x = (t - 18.40) / 1.65; return 1 - 0.64 * Math.exp(-x * x); };
const SEGMENTS = 30;                                                    // ek trip = 30 sadkein, har ek free-flow mein 1.2 min
function trip(depart, mode) {
  let t = depart, total = 0;
  for (let i = 0; i < SEGMENTS; i++) {
    const f = mode === 'static' ? actual(depart) : learned(t);          // static: nikalte waqt jo speed DIKH rahi hai, wahi poore safar ke liye
    const mins = 1.2 / f; total += mins; t += mins / 60;                // time-dependent: seekhe hue curve se, pahunchne ke waqt ki speed
  }
  return total;
}
function truth(depart) { let t = depart, total = 0; for (let i = 0; i < SEGMENTS; i++) { const mins = 1.2 / actual(t); total += mins; t += mins / 60; } return total; }
const rows = [];
for (let h = 16; h <= 20; h += 0.5) {
  const stat = trip(h, 'static'), td = trip(h, 'td'), real = truth(h);
  rows.push({ h, stat, td, real });
}
const hh = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
console.log('nikalne ka time   "abhi wali speed" ETA   time-dependent ETA   asli safar   static ki galti   TD ki galti');
const sign = x => (x >= 0 ? '+' : '') + x.toFixed(1);
for (const r of rows) console.log(`     ${hh(r.h)}              ${r.stat.toFixed(1).padStart(5)} min          ${r.td.toFixed(1).padStart(5)} min        ${r.real.toFixed(1).padStart(5)} min     ${sign(r.stat - r.real).padStart(6)} min   ${sign(r.td - r.real).padStart(5)} min`);
const worst = rows.reduce((a, b) => Math.abs(b.stat - b.real) > Math.abs(a.stat - a.real) ? b : a);
console.log(`\nSabse buri galti ${hh(worst.h)} par: ${(worst.stat - worst.real).toFixed(1)} min (${Math.round(100 * Math.abs(worst.stat - worst.real) / worst.real)}%).`);
console.log('16:30 par nikalne wale ko "abhi to khaali hai" dikhta hai — par wo 40 minute baad peak ke beech mein hoga.');
const tdWorst = rows.reduce((a, b) => Math.abs(b.td - b.real) > Math.abs(a.td - a.real) ? b : a);
console.log(`Time-dependent ki sabse buri galti: ${(tdWorst.td - tdWorst.real).toFixed(1)} min — aur wo bhi sirf isliye ki aaj ka peak seekhe hue curve se 9 min late tha.`);
console.log('Isi liye Maps pehle se seekhe hue curve (history) se predict karta hai, sirf "abhi" nahi dekhta.');
