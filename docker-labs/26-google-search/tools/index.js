/* Inverted index: har shabd → un documents ki list jinmein wo hai (posting list).
   1) Posting list ko kaise rakhein? raw 4-byte ints vs delta + varint (Google/Lucene jaisa).
   2) "cheap AND flights" jaisi AND query: dono lists ka intersection — bina skip pointers vs skip pointers ke saath.
   node tools/index.js [--docs 200000] */
const args = require('./args')();
const D = +(args.docs || 200000);
let s = 99; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const VOCAB = 5000;
const zipf = () => Math.min(VOCAB - 1, Math.floor(Math.pow(rnd(), 3) * VOCAB));  // chhote id wale shabd bahut common
const postings = Array.from({ length: VOCAB }, () => []);
const t0 = Date.now();
for (let d = 0; d < D; d++) {
  const words = new Set(); const len = 30 + Math.floor(rnd() * 120);
  for (let i = 0; i < len; i++) words.add(zipf());
  for (const w of words) postings[w].push(d);                       // doc ids hamesha badhte order mein aate hain
}
let raw = 0, packed = 0, entries = 0;
function varint(n, out) { while (n >= 128) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); }
for (const p of postings) {
  raw += p.length * 4; entries += p.length;
  const out = []; let prev = 0; for (const d of p) { varint(d - prev, out); prev = d; } packed += out.length;
}
console.log(`${D.toLocaleString('en-US')} documents, ${VOCAB} shabd, ${entries.toLocaleString('en-US')} postings (index banane mein ${Date.now() - t0} ms)\n`);
console.log(`posting lists: raw 4-byte ints ${(raw / 1048576).toFixed(1)} MB  →  delta + varint ${(packed / 1048576).toFixed(1)} MB  (${(raw / packed).toFixed(1)}x chhota)`);
console.log('  (doc ids sorted hain → sirf "pichhle se kitna aage" likho → chhote numbers → zyadatar 1 byte)\n');

function intersect(a, b) {                                           // seedha merge: har element ek-ek karke
  let i = 0, j = 0, cmp = 0; const out = [];
  while (i < a.length && j < b.length) { cmp++; if (a[i] === b[j]) { out.push(a[i]); i++; j++; } else if (a[i] < b[j]) i++; else j++; }
  return { out, cmp };
}
function intersectSkip(a, b) {                                       // lambi list mein har √n par ek "skip pointer"
  if (a.length > b.length) [a, b] = [b, a];
  const step = Math.max(1, Math.floor(Math.sqrt(b.length)));
  let j = 0, cmp = 0; const out = [];
  for (const x of a) {
    while (j + step < b.length && b[j + step] <= x) { j += step; cmp++; }   // bade chhalaang
    let lo = j, hi = Math.min(b.length, j + step + 1);                     // phir us block ke andar binary search
    while (lo < hi) { const m = (lo + hi) >> 1; cmp++; if (b[m] < x) lo = m + 1; else hi = m; }
    j = lo; if (j < b.length && b[j] === x) out.push(x);
  }
  return { out, cmp };
}
const pairs = [[2, 3, 'bahut common + bahut common'], [1, 3000, 'common + rare'], [4000, 4500, 'rare + rare']];
console.log('AND query                        list sizes             bina skip: comparisons    skip pointers: comparisons   results');
for (const [x, y, name] of pairs) {
  const a = intersect(postings[x], postings[y]), b = intersectSkip(postings[x], postings[y]);
  console.log(`${name.padEnd(32)} ${String(postings[x].length).padStart(7)} × ${String(postings[y].length).padEnd(8)}  ${String(a.cmp).padStart(12)}              ${String(b.cmp).padStart(10)}          ${a.out.length === b.out.length ? a.out.length : 'MISMATCH'}`);
}
console.log('\nChhoti list ke har doc ke liye lambi list mein chhalaang + chhota binary search → kaam CHHOTI list ke size jitna.');
console.log("Dono lists badi hon toh seedha merge hi best hai — skip pointers wahan kuch nahi bachate (upar dekho).");
