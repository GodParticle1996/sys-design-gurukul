'use strict';
// MODEL: one hot key, cache-aside. Readers: cache get → on miss, DB read → (sometimes a pause) → cache set.
// Writers: DB write → cache delete. Measures reads served from cache with an old version.
const { heap } = require('./heap');
const { rng } = require('./rng');

function simulate({ ttl = Infinity, lease = false, lostDelete = 0, seconds = 3600, readsPerSec = 500, writesPerSec = 2, pauseP = 0.01, pauseMs = 100, seed = 1 } = {}) {
  const r = rng(seed), q = heap();
  let db = 1, now = 0;                                    // DB holds a version number
  let cache = null;                                       // { v, until }
  let leaseId = 0, leaseHolder = null;                    // lease: token handed out on a miss; delete cancels it
  let reads = 0, stale = 0, staleSince = null, longest = 0, staleWindows = 0, longWindows = 0;
  const exp = rate => -Math.log(1 - r()) / rate * 1000;   // ms between Poisson events
  const checkStale = () => {
    const bad = cache && now < cache.until && cache.v !== db;
    if (bad && staleSince === null) { staleSince = now; staleWindows++; }
    if (!bad && staleSince !== null) { longest = Math.max(longest, now - staleSince); if (now - staleSince > 5) longWindows++; staleSince = null; }
  };
  const read = () => {
    reads++;
    if (cache && now < cache.until) { if (cache.v !== db) stale++; return; }
    const token = lease ? (leaseHolder === null ? (leaseHolder = ++leaseId) : null) : 0;   // only one filler per lease
    if (lease && token === null) return;                  // another reader is filling: this one waits / reads DB (not counted stale)
    q.push(now + 2, () => {                               // DB read 2 ms
      const v = db;
      const delay = r() < pauseP ? pauseMs : 0.1;         // GC pause or slow network before the set
      q.push(now + delay, () => {
        if (lease && leaseHolder !== token) return;       // a delete cancelled this lease: drop the old value
        if (lease) leaseHolder = null;
        cache = { v, until: now + ttl }; checkStale();
      });
    });
  };
  const write = () => {
    q.push(now + 3, () => {                               // DB write 3 ms
      db++; checkStale();
      q.push(now + 0.2, () => {
        if (r() < lostDelete) return;                     // delete message lost
        cache = null; leaseHolder = null; checkStale();
      });
    });
  };
  const end = seconds * 1000;
  const sched = (rate, fn) => { const go = () => { fn(); const t = now + exp(rate); if (t < end) q.push(t, go); }; q.push(exp(rate), go); };
  sched(readsPerSec, read); sched(writesPerSec, write);
  while (q.size) { const [t, , fn] = q.pop(); now = t; if (cache && now >= cache.until) cache = null; fn(); checkStale(); }
  if (staleSince !== null) { longest = Math.max(longest, end - staleSince); if (end - staleSince > 5) longWindows++; }
  return { reads, stale, staleWindows, longWindows, longestMs: longest };
}

// Scripted race (the classic one). Returns what readers see at later times.
// t=0 cache empty, DB = v1. t=1 reader R misses, reads v1 from DB, then pauses (GC).
// t=5 writer W: DB = v2. t=6 W deletes the cache key (nothing there yet). t=105 R wakes, sets cache = v1.
function scripted({ ttl = Infinity, lease = false }) {
  let db = 'v1', cache = null, leaseHolder = null, leaseId = 0;
  const log = [];
  const get = t => (cache && t < cache.until ? cache.v : null);
  // t=1: R misses
  const token = lease ? (leaseHolder = ++leaseId) : 0;
  const seen = db;                                      // R read v1
  db = 'v2';                                            // t=5 W writes
  cache = null; leaseHolder = null;                     // t=6 W deletes (and cancels any lease)
  if (!lease || leaseHolder === token) cache = { v: seen, until: 105 + ttl };   // t=105 R sets
  else log.push('t=105 ms: R ka set thukraya (lease cancel ho chuki) → cache khaali');
  for (const t of [1000, 10000, 60000, 600000]) {
    let v = get(t);
    if (v === null) { v = db; cache = { v: db, until: t + ttl }; }   // miss → fresh fill
    log.push({ t, v, stale: v !== db });
  }
  return log;
}
module.exports = { simulate, scripted };
