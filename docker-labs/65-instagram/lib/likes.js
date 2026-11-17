'use strict';
// ex2 — the like button. A 1 ms time-step model of one viral photo, a retry model, and real counter-merge code.
const { rng } = require('./rng');

// One viral photo for `seconds`: likes arrive at likesPerS, other app traffic (feeds) at feedsPerS needing feedMs of a worker.
// Each like holds an app worker until it finishes or times out. The store finishes `perMs` likes every millisecond:
//   1 hot row → 1/ms (row lock held ~1 ms) · R counter rows with C DB connections → min(R, C)/ms · in-memory counter → perMs given.
// admit: who gets a free worker first within a millisecond — 'likes-first', 'feeds-first' or 'interleaved' (mixed in proportion).
// Every like ends in exactly one bucket: ok + noWorker + timedOut + waiting = total.
function viral({ perMs, seconds = 10, likesPerS = 10000, feedsPerS = 20000, feedMs = 20, workers = 2000, timeoutMs = 5000, admit = 'likes-first' } = {}) {
  const queue = [];                    // arrival ms of waiting likes (FIFO)
  let head = 0, ok = 0, timedOut = 0, noWorker = 0, maxWait = 0, feedOk = 0, feedFail = 0, firstFeedFail = null, total = 0;
  const feedBusy = new Int32Array(seconds * 1000 + feedMs + 1);  // feed workers that free up at each ms
  let feedsActive = 0, likeCarry = 0, feedCarry = 0;
  const free = () => queue.length - head + feedsActive < workers;
  const like = t => { total++; if (free()) queue.push(t); else noWorker++; };      // no worker free: the like fails at once
  const feed = t => { if (free()) { feedsActive++; feedBusy[t + feedMs]++; feedOk++; } else { feedFail++; if (firstFeedFail === null) firstFeedFail = t; } };
  for (let t = 0; t < seconds * 1000; t++) {
    feedsActive -= feedBusy[t];
    while (head < queue.length && t - queue[head] >= timeoutMs) { head++; timedOut++; }
    for (let k = 0; k < perMs && head < queue.length; k++) { maxWait = Math.max(maxWait, t - queue[head]); head++; ok++; }
    likeCarry += likesPerS / 1000; feedCarry += feedsPerS / 1000;
    const L = Math.floor(likeCarry), F = Math.floor(feedCarry); likeCarry -= L; feedCarry -= F;
    if (admit === 'likes-first') { for (let i = 0; i < L; i++) like(t); for (let i = 0; i < F; i++) feed(t); }
    else if (admit === 'feeds-first') { for (let i = 0; i < F; i++) feed(t); for (let i = 0; i < L; i++) like(t); }
    else for (let l = 0, f = 0; l < L || f < F;) { if (f >= F || (l < L && l * F <= f * L)) { like(t); l++; } else { feed(t); f++; } }
  }
  return { total, ok, timedOut, noWorker, waiting: queue.length - head, maxWaitMs: maxWait, feedOk, feedFail, firstFeedFailMs: firstFeedFail };
}

// Retries: each like request is applied, but its reply is lost with lostP, so the phone sends it again once.
function retries({ likes = 1000000, lostP = 0.02, seed = 5 } = {}) {
  const r = rng(seed); let counter = 0; const set = new Set();
  for (let user = 0; user < likes; user++) {
    const sends = r() < lostP ? 2 : 1;
    for (let s = 0; s < sends; s++) { counter++; set.add(user); }
  }
  return { truth: likes, counter, set: set.size };
}

// Three regions count likes for one photo and gossip snapshots of their state. A message is a copy of the sender's state
// when it was SENT; it waits in a queue and is delivered later, in random order, sometimes twice. At the end every queued
// message is delivered (eventual delivery). Each like is counted in exactly one region (unique, grow-only increments).
const REGIONS = ['tokyo', 'frankfurt', 'virginia'];
function regions({ local = { tokyo: 5000, frankfurt: 3000, virginia: 1000 }, steps = 120, seed = 9 } = {}) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
  const lww = {}, naive = {}, gc = {}, have = Object.fromEntries(REGIONS.map(g => [g, 0])), inbox = [];
  for (const g of REGIONS) {
    lww[g] = { value: 0, ts: 0 }; naive[g] = 0; gc[g] = Object.fromEntries(REGIONS.map(x => [x, 0]));
  }
  const deliver = m => {
    if (m.lww.ts > lww[m.to].ts) lww[m.to] = { ...m.lww };                          // last write wins: replace the whole value
    naive[m.to] += m.delta;                                                          // add the sender's new likes on every delivery
    for (const x of REGIONS) gc[m.to][x] = Math.max(gc[m.to][x], m.gc[x]);           // merge = max per slot
  };
  for (let i = 0; i < steps; i++) {
    const g = pick(REGIONS);
    if (have[g] < local[g] && r() < 0.5) {                                           // a burst of local likes in region g
      const add = Math.min(local[g] - have[g], 500 + Math.floor(r() * 1000));
      have[g] += add; gc[g][g] += add; naive[g] += add; lww[g] = { value: lww[g].value + add, ts: i + r() };
      inbox.push(...REGIONS.filter(x => x !== g).map(to => ({ to, delta: add, lww: { ...lww[g] }, gc: { ...gc[g] } })));
    } else if (inbox.length) {                                                       // deliver an old snapshot, maybe twice
      const k = Math.floor(r() * inbox.length), m = inbox[k];
      deliver(m); if (r() < 0.3) deliver(m); else inbox.splice(k, 1);
    }
  }
  for (const g of REGIONS) if (have[g] < local[g]) {                                 // any likes not yet counted
    const add = local[g] - have[g]; have[g] = local[g]; gc[g][g] += add; naive[g] += add; lww[g] = { value: lww[g].value + add, ts: steps + 1 };
    inbox.push(...REGIONS.filter(x => x !== g).map(to => ({ to, delta: add, lww: { ...lww[g] }, gc: { ...gc[g] } })));
  }
  while (inbox.length) deliver(inbox.splice(Math.floor(r() * inbox.length), 1)[0]);   // eventual delivery, random order
  const truth = Object.values(local).reduce((a, b) => a + b, 0);
  const view = f => Object.fromEntries(REGIONS.map(g => [g, f(g)]));
  return { truth, lww: view(g => lww[g].value), naive: view(g => naive[g]), gcounter: view(g => Object.values(gc[g]).reduce((a, b) => a + b, 0)) };
}
// One user's like lands in Tokyo; the retry lands in Frankfurt. A counter counts two; a set of user ids (merged by union)
// counts one. Unlike needs more than a grow-only counter or set (e.g. an OR-Set — lab 58).
function crossRegionRetry() {
  const gc = { tokyo: 1, frankfurt: 1, virginia: 0 }, sets = { tokyo: new Set(['u1']), frankfurt: new Set(['u1']), virginia: new Set() };
  return { counter: Object.values(gc).reduce((a, b) => a + b, 0), set: new Set([...sets.tokyo, ...sets.frankfurt, ...sets.virginia]).size };
}
module.exports = { viral, retries, regions, crossRegionRetry, REGIONS };
