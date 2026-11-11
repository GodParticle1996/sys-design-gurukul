'use strict';
// ex4-btree: MODEL. A. How tall is a B+tree, really? (arithmetic)  B. 10 lakh inserts through a buffer pool: how many
// 8 KB page writes per 100-byte row?  C. A lookup when the inner pages are already in RAM.
const { BPlusTree } = require('../lib/btree');
const { shuffled } = require('../lib/rng');

const PAGE = 8192, ROW = 100, LEAF = Math.floor(PAGE / ROW), INNER = PAGE / 16;
const gb = b => b >= 2 ** 30 ? (b / 2 ** 30).toFixed(1) + ' GB' : (b / 2 ** 20).toFixed(1) + ' MB';
const inr = n => n.toLocaleString('en-IN');

console.log(`== A. height (MODEL arithmetic): 8 KB pages, 100-byte rows → ${LEAF} rows per leaf; inner entry 16 bytes → ${INNER} children ==`);
console.log('rows                   levels   leaf pages (full)   inner pages   inner pages in RAM   whole table');
for (const n of [1e5, 1e7, 1e9, 6.25e10]) {
  let pages = Math.ceil(n / LEAF), leaves = pages, inner = 0, levels = 1;
  while (pages > 1) { pages = Math.ceil(pages / INNER); inner += pages; levels++; }
  console.log(`${inr(n).padEnd(20)} ${String(levels).padStart(7)}   ${inr(leaves).padStart(17)}   ${inr(inner).padStart(11)}   ${gb(inner * PAGE).padStart(18)}   ${gb(leaves * PAGE).padStart(11)}`);
}
{ let pages = Math.ceil(6.25e10 / INNER), levels = 1; while (pages > 1) { pages = Math.ceil(pages / INNER); levels++; }
  console.log(`Index holding only key + pointer (16 bytes, ${INNER} per leaf): 62,50,00,00,000 keys → ${levels} levels.`); }
console.log('Keep the inner pages in RAM and a lookup reads ONE page from disk (the leaf), not one per level.');
console.log('');

const N = 1_000_000;
console.log(`== B. ${inr(N)} inserts of 100-byte rows (MODEL, LRU buffer pool, dirty pages written on eviction or checkpoint) ==`);
console.log('keys        pool            checkpoint every   page reads   page writes   bytes written ÷ row bytes   height   leaf fill');
const randomKeys = shuffled(N, 55);
function run(order, poolPages, every) {
  const t = new BPlusTree({ leafCap: LEAF, innerCap: INNER, poolPages });
  for (let i = 0; i < N; i++) { const k = order === 'random' ? randomKeys[i] : i; t.put(k, k); if ((i + 1) % every === 0) t.checkpoint(); }
  t.checkpoint();
  const s = t.shape();
  console.log(`${order.padEnd(10)}  ${(inr(poolPages) + ' pages').padEnd(14)}  ${inr(every).padStart(16)}   ${inr(t.stats.reads).padStart(10)}   ${inr(t.stats.writes).padStart(11)}   ${(t.stats.writes * PAGE / (N * ROW)).toFixed(1).padStart(25)}×   ${String(s.height).padStart(6)}   ${(s.leafFill * 100).toFixed(0).padStart(8)}%`);
  return t;
}
run('random', 1_000, 10_000);
run('random', 40_000, 1_000);
run('random', 40_000, 10_000);
const big = run('random', 40_000, 100_000);
run('sequential', 1_000, 10_000);
console.log('Pool 1,000 pages = 8 MB; 40,000 pages = 320 MB (the whole tree fits). Plus the WAL: ~1× more.');
console.log('');

console.log('== C. after a restart: 10,000 random lookups (MODEL; the pool starts empty except pinned pages) ==');
console.log('buffer pool                                   first lookup   average over 10,000');
for (const [label, pin, spare] of [['1 page, nothing pinned', [], 1], ['65 pages, plain LRU', [], 65],
  [`64 inner pages pinned + 1 page for leaves`, big.innerIds(), 1], ['1,000 pages, plain LRU', [], 1000]]) {
  big.coldPool(pin, spare); big.stats.reads = 0;
  const r = shuffled(N, 7);
  big.get(r[0]); const first = big.stats.reads;
  for (let i = 1; i < 10_000; i++) big.get(r[i]);
  console.log(`${label.padEnd(44)}  ${String(first).padStart(12)}   ${(big.stats.reads / 10_000).toFixed(2).padStart(19)} page reads per lookup`);
}
console.log('One page cannot hold the root-to-leaf path. Same 65 pages: pinning the inner pages beats plain LRU.');
