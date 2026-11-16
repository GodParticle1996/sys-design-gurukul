'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { measure, sweep } = require('../lib/ladder');
const { zipf } = require('../lib/zipf');
const { lru } = require('../lib/lru');
const { human } = require('../lib/human');
const { rng } = require('../lib/rng');
const { avgMs, dbQps } = require('../lib/amat');
const { run: runWrites } = require('../lib/writes');
const { simulate, scripted } = require('../lib/invalidation');
const { run: runHerd } = require('../lib/herd');
const { scenario, bloom } = require('../lib/penetration');

test('ladder: a big random ring is far slower than an L1-sized one; random order is slower than sequential', () => {
  const small = measure(32 * 1024, 3e6), big = measure(256 << 20, 1e6);
  assert.ok(big > 5 * small, `L1 ${small} ns vs RAM ${big} ns`);
  assert.ok(sweep(1 << 23, true) > 2 * sweep(1 << 23, false));
});

test('zipf + LRU: uniform gives top 10% = 10%; more skew, more hits; bigger cache, more hits; LRU keeps its size', () => {
  assert.ok(Math.abs(zipf(1000, 0, rng(1)).topShare(0.1) - 0.1) < 1e-9);
  assert.ok(zipf(100000, 0.99, rng(1)).topShare(0.1) < 0.85);           // not 90/10 even at s ≈ 1
  const hit = (s, f) => { const z = zipf(20000, s, rng(2)), c = lru(20000 * f); for (let i = 0; i < 200000; i++) { const k = z.next(); if (c.get(k) === undefined) c.set(k, 1); } assert.ok(c.size() <= 20000 * f); return c.stats().rate; };
  assert.ok(hit(0.99, 0.1) > hit(0.6, 0.1));
  assert.ok(hit(0.99, 0.1) > hit(0.99, 0.01));
  assert.ok(Math.abs(dbQps(0.95, 10000) - 500) < 1e-9);
  assert.ok(Math.abs(dbQps(0.99, 10000) - 100) < 1e-9);
  assert.ok(Math.abs(avgMs(0.95, 0.5, 10) - 1.0) < 1e-9);
});

test('writes: after SIGKILL, write-back loses acked writes; through, group commit and the OS page cache lose none', async () => {
  for (const m of ['through', 'group', 'os']) assert.strictEqual((await runWrites(m, 600)).lost, 0, m);
  const back = await runWrites('back', 1600, 1000);
  assert.ok(back.lost > 10000, `back lost ${back.lost}`);
  const g = await runWrites('group', 600), t = await runWrites('through', 600);
  assert.ok(g.perSec > 20 * t.perSec, `group ${g.perSec} vs through ${t.perSec}`);
});

test('invalidation: the delete race leaves old data forever without TTL, until TTL with it, and never with a lease', () => {
  const at = (o, t) => scripted(o).find(x => x.t === t);
  assert.strictEqual(at({}, 600000).stale, true);
  assert.strictEqual(at({ ttl: 30000 }, 10000).stale, true);
  assert.strictEqual(at({ ttl: 30000 }, 60000).stale, false);
  assert.strictEqual(at({ ttl: 30000, lease: true }, 1000).stale, false);
  const cfg = { writesPerSec: 0.2, readsPerSec: 1000, pauseMs: 200, seconds: 1200 };
  const racy = { ...cfg, pauseP: 0.2, pauseMs: 300 };               // many slow readers: races become common
  assert.ok(simulate({ ...racy, ttl: 30000 }).longWindows > 0, 'delete + TTL races');
  assert.strictEqual(simulate({ ...racy, ttl: 30000, lease: true }).longWindows, 0);
  const lost = simulate({ ...cfg, ttl: 30000, lease: true, lostDelete: 0.05 });
  assert.ok(lost.longWindows > 0 && lost.longestMs <= 30000 + 300, `lost-delete windows ${lost.longWindows}, longest ${lost.longestMs}`);
  // TTL counts from when a value is SET, not from when the DB changed: a slow refill can stay stale longer than the TTL.
  const slow = simulate({ ttl: 30000, pauseP: 1, pauseMs: 60000, seconds: 180, readsPerSec: 100, writesPerSec: 0.05, seed: 1 });
  assert.ok(slow.longestMs > 30000, `slow fill longest ${slow.longestMs}`);
  // lease: readers without a token wait and ask again (no reader is silently dropped)
  assert.ok(simulate({ ...cfg, ttl: 30000, lease: true }).retries > 0);
});

test('LRU recency and the human scale', () => {
  const c = lru(2); c.set('a', 1); c.set('b', 1); c.get('a'); c.set('c', 1);
  assert.strictEqual(c.get('b'), undefined, 'b was least recently used');
  assert.strictEqual(c.get('a'), 1, 'a was touched, so it stays');
  assert.strictEqual(human(150e6, 3.26), '16 saal');               // 150 ms × 3.26 GHz = 4.9 crore s ≈ 15.5 years
  assert.strictEqual(human(1, 1), '1.0 second');
  assert.strictEqual(human(60, 1), '1.0 minute');
});

test('herd + penetration: a limiter keeps the DB alive; Bloom has no false negatives and blocks unique-id attacks', () => {
  const none = runHerd({ strategy: 'none', coldRestart: true, seconds: 150 }), limit = runHerd({ strategy: 'limit', seconds: 150 });
  assert.ok(none.crashes >= 2, `none crashes ${none.crashes}`);
  assert.strictEqual(limit.crashes, 0);
  assert.ok(limit.served > none.served);
  const N = 200000, b = bloom(N, 10);
  for (let i = 1; i <= N; i++) b.add(i);
  for (let i = 1; i <= N; i++) assert.ok(b.has(i));
  let fp = 0; for (let i = 0; i < 200000; i++) if (b.has(1e7 + i * 3)) fp++;
  assert.ok(fp / 200000 > 0.004 && fp / 200000 < 0.013, `fp ${fp / 200000}`);
  const attack = []; for (let i = 0; i < 100000; i++) attack.push(1e6 + i * 11);
  const a = scenario(attack, { N, b });
  assert.strictEqual(a.negative.db, 100000);
  assert.ok(a.bloom.db < 2000);
  const newIds = new Set([N + 1, N + 2]);
  assert.ok(scenario([N + 1, N + 2], { N, b, newIds }).bloom.wrongNo >= 1);
  // negative cache expires: the same 10 missing ids, 1 request/sec each for 300 s, 60 s TTL → each id asked ~5 times
  const rep = []; for (let i = 0; i < 3000; i++) rep.push(5e6 + (i % 10));
  assert.strictEqual(scenario(rep, { N, b, perSec: 10, negTtl: 60 }).negative.db, 50);
  // coalesced callers keep their own deadline: coalescing alone stops the crash loop in this model
  assert.strictEqual(runHerd({ strategy: 'coalesce', seconds: 150 }).crashes, 0);
});
