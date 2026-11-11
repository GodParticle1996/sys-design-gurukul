'use strict';
// MODEL: an SSD's flash translation layer (FTL). Flash pages (4 KB) can be written once; only a whole block
// (here 256 pages = 1 MB) can be erased. So an overwrite goes to a FRESH page and the old page is marked stale.
// When free blocks run low, garbage collection picks the block with the fewest live pages, copies those live pages
// to the write frontier, and erases the block. Copies are extra writes: write amplification = flash writes / host writes.
const { rng } = require('./rng');

function simulate({ blocks = 512, pagesPerBlock = 256, fill, hostWritesPerPage = 4, pattern = 'random', seed = 55, reserve = 2 }) {
  const P = pagesPerBlock, logical = Math.floor(blocks * P * fill);
  const map = new Int32Array(logical).fill(-1), owner = new Int32Array(blocks * P).fill(-1);
  const valid = new Int32Array(blocks), full = new Uint8Array(blocks);
  const free = []; for (let b = blocks - 1; b >= 0; b--) free.push(b);
  let frontier = free.pop(), fp = 0, flashWrites = 0, gcWrites = 0, erases = 0;
  function program(lpn) {
    if (fp === P) { full[frontier] = 1; frontier = free.pop(); if (frontier === undefined) throw new Error('out of blocks'); fp = 0; }
    const ppn = frontier * P + fp++;
    const old = map[lpn];
    if (old >= 0) { owner[old] = -1; valid[Math.floor(old / P)]--; }
    owner[ppn] = lpn; valid[frontier]++; map[lpn] = ppn; flashWrites++;
  }
  function gcOnce() {
    let victim = -1, best = Infinity;
    for (let b = 0; b < blocks; b++) if (full[b] && b !== frontier && valid[b] < best) { best = valid[b]; victim = b; }
    if (victim < 0 || best === P) throw new Error('no block worth collecting');
    for (let i = 0; i < P; i++) { const lpn = owner[victim * P + i]; if (lpn >= 0) { program(lpn); gcWrites++; } }
    full[victim] = 0; valid[victim] = 0; erases++; free.push(victim);
  }
  for (let l = 0; l < logical; l++) program(l);               // fill the drive once (not counted below)
  flashWrites = 0;
  const r = rng(seed), host = logical * hostWritesPerPage;
  let seq = 0;
  for (let i = 0; i < host; i++) {
    while (free.length < reserve) gcOnce();
    program(pattern === 'random' ? Math.floor(r() * logical) : seq++ % logical);
  }
  return { fill, pattern, hostWrites: host, flashWrites, gcWrites, erases, writeAmp: flashWrites / host };
}
module.exports = { simulate };
