'use strict';
// MODEL: 10 ms ticks. Traffic 10,000 reads/sec over 1,00,000 keys (Zipf s = 1.2). Cache = LRU, 10,000 keys.
// DB does 1,000 reads/sec. Misses wait in the DB's queue. A user gives up after 1 s, but the DB still does that
// work (it does not know). Queue > 3 s of work → DB runs out of connections/memory and crashes; back in 30 s.
const { zipf } = require('./zipf');
const { lru } = require('./lru');
const { rng } = require('./rng');
const KEYS = 100000, PER_TICK = 100, CACHE = 10000, CAP = 1000, CAP_TICK = CAP / 100;
const TIMEOUT = 100, CRASH_QUEUE = 3 * CAP, DOWN = 3000, LIMIT_QUEUE = CAP / 2;   // ticks / entries

function run({ strategy = 'none', seconds = 300, cacheCrashAt = 30, seed = 1, coldRestart = false } = {}) {
  const r = rng(seed), z = zipf(KEYS, 1.2, r);
  const coalesce = strategy.includes('coalesce'), limit = strategy.includes('limit'), warm = strategy.includes('warm');
  let cache = lru(CACHE), queue = [], inQueue = new Map(), head = 0;
  let downUntil = -1, crashes = 0, ok = 0, failed = 0, wasted = 0, gate = false, warmed = 0, backAt = null;
  let secHits = 0, secReqs = 0;
  const perSec = [];
  for (let i = 0; i < 300000; i++) { const k = z.next(); if (cache.get(k) === undefined) cache.set(k, 1); }   // steady state before t = 0
  const coldStart = () => { cache = lru(CACHE); if (warm) { gate = true; warmed = 0; } };
  for (let tick = 0; tick < seconds * 100; tick++) {
    if (tick === cacheCrashAt * 100) coldStart();
    if (tick === downUntil && coldRestart) coldStart();          // option: the whole stack restarts with the DB (cache cold again)
    if (tick === downUntil && warm) { gate = true; warmed = 0; }   // DB back: warm first (cache keeps what it had)
    const dbUp = tick >= downUntil;
    if (gate) {                                                   // warming: load hottest keys at 90% of DB speed, users wait
      if (dbUp) for (let i = 0; i < CAP_TICK * 0.9 && warmed < CACHE; i++) cache.set(warmed++, 1);
      if (warmed >= CACHE) gate = false;
      failed += PER_TICK; secReqs += PER_TICK;
    } else {
      for (let i = 0; i < PER_TICK; i++) {
        const k = z.next(); secReqs++;
        if (cache.get(k) !== undefined) { ok++; secHits++; continue; }
        if (!dbUp) { failed++; continue; }
        if (coalesce && inQueue.has(k)) { inQueue.get(k).waiters++; continue; }   // ride on the read already queued
        if (limit && queue.length - head >= LIMIT_QUEUE) { failed++; continue; } // fast "try later" instead of queueing
        const e = { k, t: tick, waiters: 1 }; queue.push(e); if (coalesce) inQueue.set(k, e);
      }
    }
    if (dbUp) {
      for (let i = 0; i < CAP_TICK && head < queue.length; i++) {
        const e = queue[head++]; inQueue.delete(e.k);
        if (tick - e.t <= TIMEOUT) { cache.set(e.k, 1); ok += e.waiters; } else { wasted++; failed += e.waiters; }
      }
      if (head > 50000) { queue = queue.slice(head); head = 0; }
      if (queue.length - head > CRASH_QUEUE) {                   // crash: everyone waiting fails
        for (let i = head; i < queue.length; i++) failed += queue[i].waiters;
        queue = []; head = 0; inQueue.clear(); crashes++; downUntil = tick + DOWN;
      }
    }
    if (tick % 100 === 99) {
      const now = (tick + 1) / 100, hit = secHits / Math.max(1, secReqs);
      perSec.push({ now, hit, queue: queue.length - head, up: dbUp });
      if (backAt === null && now > cacheCrashAt && dbUp && !gate && hit >= 0.85 && queue.length - head < CAP) backAt = now - cacheCrashAt;
      secHits = secReqs = 0;
    }
  }
  return { crashes, served: ok / (ok + failed), wasted, backAt, perSec };
}
module.exports = { run, KEYS, CACHE, CAP };
