'use strict';
// CRDTs (Shapiro et al., 2011) + version vectors, small and readable. Merges are commutative,
// associative and idempotent: order and repeats do not change the result.
// Dictionaries have no prototype, so names like "constructor" or "__proto__" are plain keys.
const dict = () => Object.create(null);
const copy = o => Object.assign(dict(), o);

// G-Counter: one slot per replica; a replica bumps only its own slot.
const gcounter = () => dict();
const gInc = (c, node, n = 1) => { c[node] = (c[node] || 0) + n; return c; };
function gMerge(a, b) {                    // merge = the bigger number in each slot
  const out = copy(a);
  for (const k of Object.keys(b)) out[k] = Math.max(out[k] || 0, b[k]);
  return out;
}
const gValue = c => Object.values(c).reduce((s, v) => s + v, 0);

// OR-Set (observed-remove, add wins): every add gets a unique tag;
// a remove deletes only the tags it has SEEN. state = { adds: {item: [tags]}, removed: Set }
const orset = () => ({ adds: dict(), removed: new Set() });
let tagSeq = 0;
function orAdd(s, item, node) {
  (s.adds[item] ||= []).push(`${node}:${++tagSeq}`);
  return s;
}
function orRemove(s, item) {
  for (const t of s.adds[item] || []) s.removed.add(t);
  return s;
}
function orMerge(a, b) {                   // union of tags, union of removed tags
  const out = orset();
  for (const src of [a, b]) for (const item of Object.keys(src.adds)) {
    out.adds[item] = [...new Set([...(out.adds[item] || []), ...src.adds[item]])];
  }
  out.removed = new Set([...a.removed, ...b.removed]);
  return out;
}
const orValue = s => Object.keys(s.adds)
  .filter(item => s.adds[item].some(t => !s.removed.has(t))).sort();

// Version vectors: {node: counter}. compare → same | before | after | concurrent
const vvBump = (v, node) => { const out = copy(v); out[node] = (out[node] || 0) + 1; return out; };
const vvMerge = gMerge;
function vvCompare(a, b) {
  let less = false, more = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] || 0, y = b[k] || 0;
    if (x < y) less = true;
    if (x > y) more = true;
  }
  return less && more ? 'concurrent' : less ? 'before' : more ? 'after' : 'same';
}
module.exports = { gcounter, gInc, gMerge, gValue, orset, orAdd, orRemove, orMerge, orValue, vvBump, vvMerge, vvCompare };
