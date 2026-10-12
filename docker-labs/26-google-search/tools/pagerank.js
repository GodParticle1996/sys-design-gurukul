/* PageRank: "random surfer" link par click karta rehta hai; kabhi-kabhi (1 - d) bore hoke kisi bhi random page par chala jaata hai.
   10,000 asli pages (popular pages ko zyada links milte hain) + ek LINK FARM: 300 spam pages jo sirf ek dusre ko
   aur "cheap-pills.biz" ko link karte hain — bahar koi link nahi. Asli web ke 3 pages ne galti se farm ko link kiya.
   node tools/pagerank.js */
let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const REAL = 10000, FARM = 300, N = REAL + FARM + 1, TARGET = REAL + FARM;       // TARGET = cheap-pills.biz
const out = Array.from({ length: N }, () => []);
const indeg = new Array(N).fill(1);
for (let p = 0; p < REAL; p++) {                                       // preferential attachment
  const k = 3 + Math.floor(rnd() * 8);
  for (let j = 0; j < k; j++) { const t = rnd() < 0.7 && p > 10 ? pickPopular(p) : Math.floor(rnd() * REAL); if (t !== p) { out[p].push(t); indeg[t]++; } }
}
function pickPopular(limit) { for (;;) { const t = Math.floor(Math.pow(rnd(), 2) * REAL); if (t !== limit) return t; } }
for (let f = REAL; f < REAL + FARM; f++) { out[f].push(TARGET); for (let j = 0; j < 5; j++) out[f].push(REAL + Math.floor(rnd() * FARM)); }
out[TARGET] = Array.from({ length: 20 }, () => REAL + Math.floor(rnd() * FARM));   // target bhi farm ko hi link karta hai
[5, 900, 4000].forEach(p => out[p].push(REAL + Math.floor(rnd() * FARM)));          // asli web se 3 galti ke links

function pagerank(d, teleport) {
  let r = new Float64Array(N).fill(1 / N);
  for (let it = 0; it < 500; it++) {
    const nr = new Float64Array(N); let dangling = 0;
    for (let p = 0; p < N; p++) { if (!out[p].length) { dangling += r[p]; continue; } const share = d * r[p] / out[p].length; for (const t of out[p]) nr[t] += share; }
    for (let p = 0; p < N; p++) nr[p] += (1 - d) * teleport[p] + d * dangling * teleport[p];
    r = nr;
  }
  return r;
}
const uniform = new Float64Array(N).fill(1 / N);
const trusted = new Float64Array(N); [0, 1, 2, 3, 4].forEach(p => (trusted[p] = 1 / 5));   // TrustRank: sirf 5 bharosemand seeds par teleport
const rankOf = (r, p) => 1 + [...r].filter(x => x > r[p]).length;
const farmShare = r => { let x = 0; for (let p = REAL; p < N; p++) x += r[p]; return x; };
console.log(`${REAL} asli pages + ${FARM} spam farm + 1 target ("cheap-pills.biz")\n`);
console.log('tareeka                               farm ke paas kul rank   target ki position   sabse popular asli page');
for (const [name, d, tp] of [['d = 0.99 (lagbhag koi teleport nahi)', 0.99, uniform], ['d = 0.85 (Google paper wala)', 0.85, uniform], ['d = 0.85 + TrustRank seeds', 0.85, trusted]]) {
  const r = pagerank(d, tp);
  let best = 0; for (let p = 0; p < REAL; p++) if (r[p] > r[best]) best = p;
  console.log(`${name.padEnd(38)}${(100 * farmShare(r)).toFixed(1).padStart(8)} %            #${String(rankOf(r, TARGET)).padEnd(6)}             page ${best} (#${rankOf(r, best)})`);
}
console.log('\nFarm ek jaal hai: surfer andar aaya toh bahar ka koi link nahi → rank wahin ghoomti rehti hai, sab target par.');
console.log('Teleport (1 - d) jaal ko chhota karta hai (5.2% → 3.0%), par 300 nakli pages ne phir bhi junk page ko top 2 mein pahuncha diya.');
console.log('Fix: teleport sirf bharosemand pages par (TrustRank) → farm tak rank pahunchti hi bahut kam hai → target #1600+.');
