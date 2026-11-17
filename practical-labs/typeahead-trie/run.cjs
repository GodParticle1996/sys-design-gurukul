'use strict';
// Deterministic models for "Design Search Autocomplete" (pyxsGki1epE). In-memory only: no servers, cache, router or broker.
const assert = require('node:assert/strict');
const cases = {};

// ---- compressed (radix) trie: node only where a query ends or the path splits ----
function radix() {
  const root = { kids: new Map(), end: false };
  function insert(word) {
    let node = root, rest = word;
    while (rest) {
      const edge = node.kids.get(rest[0]);
      if (!edge) { node.kids.set(rest[0], { label: rest, node: { kids: new Map(), end: true } }); return; }
      let i = 0; while (i < edge.label.length && i < rest.length && edge.label[i] === rest[i]) i++;
      if (i === edge.label.length) { node = edge.node; rest = rest.slice(i); continue; }
      const split = { kids: new Map(), end: false }; // cut the edge at i
      split.kids.set(edge.label[i], { label: edge.label.slice(i), node: edge.node });
      node.kids.set(rest[0], { label: edge.label.slice(0, i), node: split });
      if (i === rest.length) split.end = true; else split.kids.set(rest[i], { label: rest.slice(i), node: { kids: new Map(), end: true } });
      return;
    }
    node.end = true;
  }
  function count(n = root) { let c = 0; for (const { node } of n.kids.values()) c += 1 + count(node); return c; }
  function find(prefix) { // returns the path of edge labels to the node whose list answers prefix
    let node = root, rest = prefix, path = '';
    while (rest) {
      const edge = node.kids.get(rest[0]); if (!edge) return null;
      const n = Math.min(edge.label.length, rest.length);
      if (edge.label.slice(0, n) !== rest.slice(0, n)) return null;
      path += edge.label; node = edge.node; rest = rest.slice(n);
    }
    return path || '(root)';
  }
  return { insert, count, find, root };
}
function plainCount(words) { const s = new Set(); for (const w of words) for (let i = 1; i <= w.length; i++) s.add(w.slice(0, i)); return s.size; }

cases.compress = () => {
  const words = ['car', 'cart', 'cardigan', 'cardigans'], t = radix();
  words.forEach(t.insert);
  assert.equal(plainCount(words), 10); assert.equal(t.count(), 4);
  console.log(`plain trie: ${plainCount(words)} nodes under root; compressed: ${t.count()} (car, cart, cardigan, cardigans)`);
  assert.equal(t.find('car'), 'car'); assert.equal(t.find('card'), 'cardigan');
  console.log(`lookup "car" -> list at node "${t.find('car')}"; lookup "card" ends inside edge "digan" -> list at node "${t.find('card')}"`);
  t.insert('cardboard');
  assert.equal(t.count(), 6); assert.equal(t.find('card'), 'card');
  console.log(`insert "cardboard": edge "digan" is cut after "d" -> new split node "card"; nodes now ${t.count()}; "card" -> list at "${t.find('card')}"`);
};

cases.bound = () => {
  // Seeded synthetic corpus (no dictionary on this machine). Bound check, not a reproduction of the source's dictionary run.
  let s = 7; const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32;
  const syl = ['ka', 'ra', 'ma', 'sa', 'ta', 'ri', 'li', 'na', 'do', 'go', 'be', 'ce', 'st', 'tr', 'pl', 'on', 'er', 'an', 'in', 'us'];
  const words = new Set(); while (words.size < 50_000) { let w = ''; const k = 1 + Math.floor(rnd() * 5); for (let i = 0; i < k; i++) w += syl[Math.floor(rnd() * syl.length)]; words.add(w); }
  const list = [...words], t = radix(); list.forEach(t.insert);
  const plain = plainCount(list), comp = t.count(), letters = list.reduce((a, w) => a + w.length, 0);
  assert(comp <= 2 * list.length, 'compressed trie has at most 2 nodes per query');
  console.log(`${list.length} synthetic queries, ${letters} letters: plain ${plain} nodes (${(plain / list.length).toFixed(2)}/query), compressed ${comp} (${(comp / list.length).toFixed(2)}/query) <= 2N`);
  console.log('Source dictionary run (234K words): plain 760K, compressed 315K (~1.3/word). Not reproduced here.');
};

cases.bottomup = () => {
  let s = 11; const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32;
  const letters = 'abcdef', words = new Set();
  while (words.size < 3000) { let w = ''; const k = 1 + Math.floor(rnd() * 6); for (let i = 0; i < k; i++) w += letters[Math.floor(rnd() * letters.length)]; words.add(w); }
  const score = new Map([...words].map(w => [w, Math.floor(rnd() * 1e6)]));
  const K = 10, top = list => list.sort((a, b) => score.get(b) - score.get(a) || (a < b ? -1 : 1)).slice(0, K);
  // plain trie keyed by prefix; fill bottom-up from children lists + the prefix itself
  const prefixes = [...new Set([...words].flatMap(w => Array.from({ length: w.length }, (_, i) => w.slice(0, i + 1))))].sort((a, b) => b.length - a.length);
  const lists = new Map();
  for (const p of prefixes) {
    const pile = words.has(p) ? [p] : [];
    for (const c of letters) if (lists.has(p + c)) pile.push(...lists.get(p + c));
    lists.set(p, top(pile));
  }
  let checked = 0;
  for (const p of prefixes) { assert.deepEqual(lists.get(p), top([...words].filter(w => w.startsWith(p)))); checked++; }
  console.log(`${words.size} queries, ${checked} prefixes: bottom-up top-${K} (own query + children's top-${K}) equals brute force at every prefix`);
};

cases.decay = () => {
  const score = (perDay, days, halfLife = 1) => days.reduce((a, d) => a + perDay * 0.5 ** (d / halfLife), 0);
  const fadDays = [7, 8, 9, 10, 11, 12, 13], riserDays = [0, 1, 2];
  const fad = score(50_000, fadDays), riser = score(2_000, riserDays);
  assert.equal(Math.round(fad * 100) / 100, 775.15); assert.equal(riser, 3500);
  console.log(`half-life 1 day: weights today 1000, yesterday 500, 3 days ago 125; fad 350,000 searches (7-13 days ago) -> ${fad.toFixed(2)}; riser 6,000 (last 3 days) -> ${riser}`);
  const fad7 = score(50_000, fadDays, 7), riser7 = score(2_000, riserDays, 7);
  assert(fad7 > riser7);
  console.log(`half-life 7 days: fad ${Math.round(fad7)}, riser ${Math.round(riser7)} -> fad ranks first. The half-life decides what "trending" means.`);
};

cases.ranges = () => {
  const slide = [['a', 'h', 1], ['i', 'r', 2], ['sa', 'sm', 3], ['sn', 'sz', 4], ['w', 'z', 5]];
  const route = (table, q) => { for (const [lo, hi, m] of table) { const k = q.slice(0, lo.length); if (k >= lo && k <= hi) return m; } return null; };
  const firstLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const uncovered = firstLetters.filter(c => ![...'aeimou'].some(v => route(slide, c + v)));
  assert.deepEqual(uncovered, ['t', 'u', 'v']);
  assert.equal(route(slide, 'tesla'), null);
  console.log(`slide table a-h, i-r, sa-sm, sn-sz, w-z: no shard for first letters ${uncovered.join(', ')} ("tesla" -> ${route(slide, 'tesla')})`);
  const fixed = [['a', 'h', 1], ['i', 'r', 2], ['sa', 'sm', 3], ['sn', 'sz', 4], ['t', 'z', 5]];
  assert(firstLetters.every(c => route(fixed, c + 'a')));
  console.log('fixed table a-h, i-r, sa-sm, sn-sz, t-z covers a-z. Digits, space and other scripts still need ranges.');
};

cases.merge = () => {
  let s = 3; const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32;
  const words = Array.from({ length: 5000 }, (_, i) => 's' + 'abcdefghijklmnopqrstuvwxyz'[Math.floor(rnd() * 26)] + i.toString(36));
  const score = new Map(words.map(w => [w, rnd()]));
  const top = l => [...l].sort((a, b) => score.get(b) - score.get(a)).slice(0, 10);
  const shard3 = words.filter(w => w[1] <= 'm'), shard4 = words.filter(w => w[1] >= 'n');
  const merged = top([...top(shard3), ...top(shard4)]), global = top(words);
  assert.deepEqual(merged, global);
  const from3 = merged.filter(w => w[1] <= 'm').length;
  console.log(`prefix "s" split over sa-sm and sn-sz: merge of two top-10 lists = global top-10 (${from3} from sa-sm, ${10 - from3} from sn-sz). Needs comparable scores.`);
};

cases.memory = () => {
  const nodes = 200e6, k = 10;
  const lists = nodes * k * 8, ids = nodes * k * 4, scores = nodes * k * 4, text = 100e6 * 20, plain = 100e6 * 20 * k * 8;
  assert.equal(lists, 16e9); assert.equal(text, 2e9); assert.equal(plain, 160e9);
  console.log(`lists: 200M nodes x 10 x 8 B = ${lists / 1e9} GB (${(lists / 2 ** 30).toFixed(1)} GiB); text 100M x 20 B = ${text / 1e9} GB; plain worst case 2B nodes x 80 B = ${plain / 1e9} GB`);
  console.log(`4-byte query ids (100M < 2^32): ${ids / 1e9} GB; adding a 4-byte score per entry: +${scores / 1e9} GB. Child pointers and edge labels still excluded.`);
  console.log('Source estimation widget used 100M nodes x 120 B = 12 GB: a different assumption, same order of magnitude.');
};

cases.down = () => {
  const cache = new Set(['c', 'ca', 's', 'sa']); // 1-2 letter lists live in the short-prefix cache
  const shardOf = p => (p[0] <= 'h' ? 'a-h' : p[0] <= 'r' ? 'i-r' : p[0] === 's' ? (p.length < 2 ? 's*' : p[1] <= 'm' ? 'sa-sm' : 'sn-sz') : 't-z');
  const down = new Set(['a-h']);
  const answer = p => cache.has(p) ? 'cache list' : down.has(shardOf(p)) ? 'empty (owning shard down)' : 'normal';
  const res = ['c', 'ca', 'car', 'card', 'sap'].map(p => `${p}: ${answer(p)}`);
  assert.equal(answer('car'), 'empty (owning shard down)');
  console.log('all copies of a-h down -> ' + res.join('; '));
  console.log('Range sharding keeps every completion of "car" on one shard. Other shards cannot fill in; replicas are the protection.');
};

cases.replicas = () => {
  const perCopy = 50_000, toShards = 300_000, share = { 'a-h': 0.25, 'i-r': 0.2, 'sa-sm': 0.3, 'sn-sz': 0.15, 't-z': 0.1 };
  let total = 0; const rows = [];
  for (const [shard, f] of Object.entries(share)) { const load = toShards * f, copies = Math.ceil(load / perCopy) + 1; total += copies; rows.push(`${shard} ${load / 1000}k/s -> ${copies}`); }
  assert.equal(rows.find(r => r.startsWith('sa-sm')), 'sa-sm 90k/s -> 3');
  console.log(`chosen shares of 300k/s after cache, 50k/s per copy, +1 spare per shard: ${rows.join('; ')}; total ${total} copies (not 300k/50k = 6)`);
};

cases.debounce = () => {
  function sent(text, gapMs, waitMs) { // request goes out when the user pauses >= waitMs after a key (last key always flushes)
    const out = []; for (let i = 1; i <= text.length; i++) { const pause = i === text.length ? Infinity : gapMs; if (pause >= waitMs) out.push(text.slice(0, i)); } return out;
  }
  const fast = sent('car rental', 80, 150), slow = sent('car rental', 250, 150);
  const short = l => l.filter(p => p.length <= 2).length;
  assert.equal(fast.length, 1); assert.equal(slow.length, 10);
  console.log(`debounce 150 ms, "car rental": fast typist (80 ms/key) sends ${fast.length} (${fast.join(', ')}); slow typist (250 ms/key) sends ${slow.length}, of which ${short(slow)} are 1-2 letters`);
  console.log('Source assumes ~5 calls per search. Real typing mixes speeds; measure how many 1-2 letter requests reach the cache.');
};

const name = process.argv[2];
const run = name ? [name] : Object.keys(cases);
for (const n of run) { if (!cases[n]) { console.error(`unknown case ${n}; use: ${Object.keys(cases).join(' ')}`); process.exit(2); } console.log(`\n# ${n}`); cases[n](); }
console.log(`\nPASS ${run.length} experiment(s). In-memory models only: no servers, cache, router, broker or real query log.`);
