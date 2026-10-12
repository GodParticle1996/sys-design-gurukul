/* "Mere aas-paas cafe" — 10 lakh jagahein. Do tareeke:
   full scan  → har row ka distance naapo.
   1-D key    → har jagah ko Hilbert curve par ek number do (S2 yahi karta hai, sphere par), sorted rakho,
                aur query ke square ko kuch CONTIGUOUS ranges mein todo → sirf utni rows padho.
   node tools/nearby.js [--pois 1000000] [--radius 2] */
const args = require('./args')();
const ORDER = 16, SIDE = 1 << ORDER;                                   // 65,536 × 65,536 grid — ~1 "unit" = 5 meter
function xy2d(x, y) {                                                  // Hilbert curve: (x,y) → ek number
  let rx, ry, d = 0;
  for (let s = SIDE / 2; s > 0; s /= 2) {
    rx = (x & s) > 0 ? 1 : 0; ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}
const N = +(args.pois || 1000000), R = +(args.radius || 2) * 200;       // radius units (1 unit ≈ 5 m → 2 km = 400 units)
let s = 12345; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const px = new Uint32Array(N), py = new Uint32Array(N), key = new Float64Array(N);
for (let i = 0; i < N; i++) { px[i] = (rnd() * SIDE) | 0; py[i] = (rnd() * SIDE) | 0; key[i] = xy2d(px[i], py[i]); }
const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => key[a] - key[b]);        // "index"
const sortedKey = Float64Array.from(order, i => key[i]);
const qx = 30000, qy = 40000;
function fullScan() {
  let rows = 0, hits = 0;
  for (let i = 0; i < N; i++) { rows++; const dx = px[i] - qx, dy = py[i] - qy; if (dx * dx + dy * dy <= R * R) hits++; }
  return { rows, hits };
}
function rangeScan() {
  const level = Math.max(1, ORDER - Math.ceil(Math.log2(R)) + 1);       // cell ≈ query jitni badi
  const cellSize = SIDE >> level;
  const lo = Math.max(0, qx - R), hi = Math.min(SIDE - 1, qx + R), lo2 = Math.max(0, qy - R), hi2 = Math.min(SIDE - 1, qy + R);
  const ranges = [];
  for (let cy = (lo2 / cellSize | 0) * cellSize; cy <= hi2; cy += cellSize)
    for (let cx = (lo / cellSize | 0) * cellSize; cx <= hi; cx += cellSize) {
      let min = Infinity, max = -Infinity;                              // ek level-cell Hilbert par CONTIGUOUS hota hai
      for (const [ax, ay] of [[cx, cy], [cx + cellSize - 1, cy], [cx, cy + cellSize - 1], [cx + cellSize - 1, cy + cellSize - 1]]) {
        const d = xy2d(ax, ay); min = Math.min(min, d); max = Math.max(max, d);
      }
      ranges.push([Math.min(min, max), cellSize * cellSize]);
      ranges[ranges.length - 1] = [min, min + cellSize * cellSize - 1];
    }
  let rows = 0, hits = 0;
  const lower = k => { let a = 0, b = N; while (a < b) { const m = (a + b) >> 1; if (sortedKey[m] < k) a = m + 1; else b = m; } return a; };
  for (const [a, b] of ranges) {
    for (let i = lower(a); i < N && sortedKey[i] <= b; i++) {
      rows++; const p = order[i]; const dx = px[p] - qx, dy = py[p] - qy; if (dx * dx + dy * dy <= R * R) hits++;
    }
  }
  return { rows, hits, cells: ranges.length, level };
}
const t1 = Date.now(); const a = fullScan(); const ms1 = Date.now() - t1;
const t2 = Date.now(); const b = rangeScan(); const ms2 = Date.now() - t2;
console.log(`${N.toLocaleString('en-US')} jagahein, query: ${(R / 200).toFixed(1)} km ke andar\n`);
console.log('tareeka         rows padhi        mile      time');
console.log(`full scan     ${a.rows.toLocaleString('en-US').padStart(11)}    ${String(a.hits).padStart(6)}    ${ms1} ms`);
console.log(`Hilbert key   ${b.rows.toLocaleString('en-US').padStart(11)}    ${String(b.hits).padStart(6)}    ${ms2} ms   (${b.cells} cells, level ${b.level})`);
console.log(`\nrows ${(a.rows / b.rows).toFixed(0)}x kam, jawab bilkul same (${a.hits} = ${b.hits}).`);
console.log('2-D problem ("aas-paas kya hai") ko 1-D bana diya — ek number, ek sorted index, kuch range scans.');
console.log('S2 yahi karta hai par gol zameen par: sphere → cube ke 6 face → har face par Hilbert curve → ek 64-bit cell id.');
