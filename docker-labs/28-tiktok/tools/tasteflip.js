/* Kal tak user sirf cooking dekhta tha (model ne yahi seekha). Aaj World Cup — pehli video se hi use sirf cricket chahiye.
   nightly batch: model raat ko update hota hai → aaj poore din "cooking wala banda".
   online: har swipe ke baad user ka taste-vector thoda hilao (Monolith jaisa real-time training).
   Model 90% apni pasand wali topic dikhata hai, 10% kuch naya (explore). node tools/tasteflip.js */
let s = 11; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const TOPICS = ['cooking', 'cricket', 'comedy', 'tech', 'music'];
function session(mode, lr) {
  const taste = [1, 0.2, 0.2, 0.2, 0.2];                                // kal raat ka model
  let hits = 0, switchedAt = null;
  for (let t = 1; t <= 20; t++) {
    const top = taste.indexOf(Math.max(...taste));
    if (switchedAt == null && top === 1) switchedAt = t;
    const k = r() < 0.1 ? Math.floor(r() * 5) : top;
    const watched = TOPICS[k] === 'cricket' && r() < 0.9;
    if (watched) hits++;
    if (mode === 'online') { taste[k] = Math.max(0, taste[k] + (watched ? lr : -lr)); }   // dekha → upar, skip → neeche
  }
  return { hits, switchedAt };
}
const runs = 500;
console.log('model              agle 20 videos mein poore dekhe   model kab samjha (cricket top par)   (500 users ka average)');
for (const [name, mode, lr] of [['nightly batch', 'batch', 0], ['online (lr 0.05)', 'online', 0.05], ['online (lr 0.2)', 'online', 0.2]]) {
  let h = 0, sw = 0, swn = 0;
  for (let i = 0; i < runs; i++) { const x = session(mode, lr); h += x.hits; if (x.switchedAt != null) { sw += x.switchedAt; swn++; } }
  console.log(`${name.padEnd(18)} ${(h / runs).toFixed(1).padStart(6)} / 20                     ${swn ? 'video #' + (sw / swn).toFixed(1) + ` (${Math.round(100 * swn / runs)}% users)` : 'aaj kabhi nahi'}`);
}
console.log('\nBatch: poora session purane taste par — 20 mein 0.3 hit (wo bhi sirf explore se). User bore hoke app band.');
console.log('Online: kuch skips ke andar model samajh jaata hai. lr = "kitni jaldi yakeen karein" — chhota lr der se samjha (#17.9),');
console.log('bada lr jaldi (#6.4). (Bada lr noise par bhi jaldi palatta hai — ye yahan test nahi kiya, bas yaad rakhna.)');
