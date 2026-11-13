'use strict';
// ex4 core — seeded: two replicas (A, B) cut apart for 60 s, both keep accepting writes, then they reconnect and merge.
const { rng } = require('./rng');
const c = require('./crdt');

// (a) a like counter: 1,000 likes before; 300 on A, 200 on B during the split
function likes() {
  const lww = (() => { const a = { v: 1300, ts: 59000 }, b = { v: 1200, ts: 59500 }; return (a.ts > b.ts ? a : b).v; })();   // each side stored the COUNT
  let A = c.gInc(c.gcounter(), 'base', 1000), B = { ...A };
  for (let i = 0; i < 300; i++) c.gInc(A, 'A'); for (let i = 0; i < 200; i++) c.gInc(B, 'B');
  return { truth: 1500, lww, crdt: c.gValue(c.gMerge(A, B)) };
}
// (b) one name per user written on both sides at random real times; B's clock runs `skew` ms behind
function names(users = 1000, skew = 5000, seed = 41) {
  const r = rng(seed); let wrong = 0, conflicts = 0;
  for (let u = 0; u < users; u++) {
    const ta = r() * 60000, tb = r() * 60000;                           // real times of the two writes
    const lwwPicksA = ta > tb - skew;                                   // B stamps its write with (tb − skew)
    const reallyLaterA = ta > tb;
    if (lwwPicksA !== reallyLaterA) wrong++;
    const va = c.vvBump({ base: 1 }, 'A'), vb = c.vvBump({ base: 1 }, 'B');
    if (c.vvCompare(va, vb) === 'concurrent') conflicts++;
  }
  return { users, lwwDropped: users, wrong, conflicts };
}
// (c) carts {apple, bread}; during the split A removes apple and adds chai, B adds dal. Intent: {bread, chai, dal}
function carts(n = 500, seed = 42) {
  const r = rng(seed), intent = ['bread', 'chai', 'dal'], out = { lww: { lostAdd: 0, back: 0 }, union: { lostAdd: 0, back: 0 }, orset: { lostAdd: 0, back: 0 } };
  const score = (key, items) => { if (!items.includes('chai') || !items.includes('dal')) out[key].lostAdd++; if (items.includes('apple')) out[key].back++; };
  for (let i = 0; i < n; i++) {
    const cartA = ['bread', 'chai'], cartB = ['apple', 'bread', 'dal'];
    score('lww', r() < 0.5 ? cartA : cartB);                            // the cart with the later timestamp wins whole
    score('union', [...new Set([...cartA, ...cartB])].sort());          // Dynamo-style: keep both versions, merge = union
    let base = c.orset(); c.orAdd(base, 'apple', 'X'); c.orAdd(base, 'bread', 'X');
    const A = c.orMerge(base, c.orset()), B = c.orMerge(base, c.orset());
    c.orRemove(A, 'apple'); c.orAdd(A, 'chai', 'A'); c.orAdd(B, 'dal', 'B');
    const merged = c.orValue(c.orMerge(A, B));
    if (JSON.stringify(merged) !== JSON.stringify(intent)) throw new Error(`OR-Set gave ${merged}`);
    score('orset', merged);
  }
  return { n, ...out };
}
module.exports = { likes, names, carts };
