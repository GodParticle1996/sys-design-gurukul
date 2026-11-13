'use strict';
const test = require('node:test');
const assert = require('node:assert');
const q = require('../lib/quorum');
const { elect } = require('../lib/election');
const { rng } = require('../lib/rng');
const up = require('../lib/uptodate');
const reads = require('../lib/reads');
const price = require('../lib/price');

test('quorum: majorities always overlap; N/2 groups can be disjoint; odd N beats the next even N', () => {
  for (const n of [3, 4, 5, 6, 7]) {
    assert.strictEqual(q.alwaysOverlap(n, q.majority(n)), true, `n=${n}`);
    assert.strictEqual(q.alwaysOverlap(n, Math.floor(n / 2)), false, `half of ${n}`);
  }
  assert.deepStrictEqual([3, 4, 5, 6, 7].map(q.tolerates), [1, 1, 2, 2, 3]);
  for (const p of [0.01, 0.05, 0.1]) {
    assert.ok(q.chanceUp(4, 3, p) < q.chanceUp(3, 2, p), `4 < 3 at p=${p}`);
    assert.ok(q.chanceUp(6, 4, p) < q.chanceUp(5, 3, p), `6 < 5 at p=${p}`);
  }
  assert.ok(Math.abs(q.chanceUp(3, 2, 0.05) - (1 - (3 * 0.05 ** 2 * 0.95 + 0.05 ** 3))) < 1e-12);
});

test('elections: identical timeouts never elect; a 150–300 ms range rarely splits', () => {
  const r = rng(1);
  for (let i = 0; i < 50; i++) assert.strictEqual(elect({ lo: 150, hi: 150, r }).ms, Infinity);
  let split = 0; for (let i = 0; i < 2000; i++) if (elect({ lo: 150, hi: 300, r }).split) split++;
  assert.ok(split / 2000 < 0.06, `${split}`);
  const e = elect({ lo: 150, hi: 300, r: rng(2) });
  assert.ok(e.ms >= 150 && e.ms < 400, `${e.ms}`);
});

test('election restriction: without it a committed entry is lost about half the time; with it never', () => {
  const off = up.run(false, 4000, 9), on = up.run(true, 4000, 9);
  assert.ok(off.lost / 4000 > 0.4 && off.lost / 4000 < 0.6, `${off.lost}`);
  assert.strictEqual(on.lost, 0); assert.strictEqual(on.none, 0);
  // a voter holding X never votes for a candidate without X: the lacking side tops out at 2 votes
  for (let i = 0; i < 500; i++) { const t = up.trial(true, rng(100 + i)); assert.strictEqual(t.lost, false); }
});

test('reads: a cut-off leader serving locally returns old data; ReadIndex refuses; a lease is safe only while clocks behave', () => {
  const local = reads.run('local'), ri = reads.run('readindex'), lease = reads.run('lease'), slow = reads.run('lease-slow-clock');
  assert.ok(local.stale > 0); assert.strictEqual(ri.served, 0); assert.strictEqual(ri.stale, 0);
  assert.strictEqual(lease.stale, 0); assert.ok(lease.served > 0);
  assert.ok(reads.PART + reads.LEASE < reads.NEW_LEADER, 'the lease must end before any new leader can exist');
  assert.ok(slow.stale > 0);
});

test('price: a commit waits for the leader fsync AND the faster follower (RTT + fsync)', () => {
  assert.strictEqual(price.commit(1, [1, 5], 0.5), 1.5);               // follower 1: 0.5 + 1
  assert.strictEqual(price.commit(3, [1, 1], 0.5), 3);                 // leader disk is the slow part
  assert.strictEqual(price.commit(1, [1, 1], 60), 61);                 // regions: the round trip dominates
});
