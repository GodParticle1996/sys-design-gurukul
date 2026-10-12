#!/usr/bin/env node
/* SMR (shingled) disk ka khilona. Disk ki tracks chhat ke khaprail (shingles) jaisi ek-doosre par chadhi hain:
   ek track badlo toh uske UPAR chadhi saari tracks (band ke aakhir tak) dobara likhni padti hain.
   Band = 256 tracks. Do workloads, dono 10,000 writes:
     sequential : naya data hamesha band ke aakhir mein (Dropbox: write once, read many)
     random     : kisi bhi purani track ko badlo (database / general purpose)                */
const BAND = 256, WRITES = 10000;
function run(kind) {
  let physical = 0, fill = 0; let s = 42;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let w = 0; w < WRITES; w++) {
    if (kind === 'sequential') { physical += 1; fill = (fill + 1) % BAND; }
    else { const t = Math.floor(rnd() * BAND); physical += BAND - t; }   // track t aur uske baad ki saari tracks dobara
  }
  return physical / WRITES;
}
console.log(`band = ${BAND} tracks, ${WRITES.toLocaleString('en-IN')} writes`);
for (const k of ['sequential', 'random']) console.log(`  ${k.padEnd(10)} → har 1 track ke badlaav par ${run(k).toFixed(1)} tracks disk par likhi gayi (write amplification)`);
console.log('  (normal CMR disk par dono = 1.0 — par SMR mein wahi disk ~20–25% zyada data rakhti hai)');
