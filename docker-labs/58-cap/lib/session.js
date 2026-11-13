'use strict';
// ex3 core (session guarantees, Terry et al. 1994) — seeded MODEL of replication lag (real counting). A primary and 3 replicas; replica i applies every write
// in order, each after a random lag (0–200 ms, 0–1 s, 0–5 s). A load balancer sends each read to a random replica.
const { rng } = require('./rng');
const MAXLAG = [200, 1000, 5000];

// a shard: writes at given times; returns appliedAt[replica][k] (ms) — in order, never earlier than the previous write
function shard(writeTimes, r) {
  return MAXLAG.map(max => { let prev = 0; return writeTimes.map(t => (prev = Math.max(prev, t + r() * max))); });
}
const versionAt = (applied, at) => { let v = 0; while (v < applied.length && applied[v] <= at) v++; return v; };   // how many writes visible

// (a) read-your-writes: write at t = 0, read the own profile 300 ms later
function ryw(fix, trials, r) {
  let bad = 0, fromPrimary = 0;
  for (let i = 0; i < trials; i++) {
    const ap = shard([0], r), rep = Math.floor(r() * 3);
    if (fix === 'none') { if (versionAt(ap[rep], 300) < 1) bad++; }
    else if (fix === 'sticky') fromPrimary++;                           // 5 s after a write, read the primary
    else { if (versionAt(ap[rep], 300) < 1) fromPrimary++; }            // token: replica must have my version, else primary
  }
  return { bad, fromPrimary };
}
// (b) monotonic reads: score changes every 500 ms; a viewer refreshes 10 times, once a second
function monotonic(fix, trials, r) {
  let bad = 0;
  const times = Array.from({ length: 30 }, (_, k) => k * 500);
  for (let i = 0; i < trials; i++) {
    const ap = shard(times, r); let seen = 0, broke = false, sticky = Math.floor(r() * 3);
    for (let k = 1; k <= 10; k++) {
      const at = k * 1000;
      let v;
      if (fix === 'none') v = versionAt(ap[Math.floor(r() * 3)], at);
      else if (fix === 'sticky') v = versionAt(ap[sticky], at);
      else { const opts = [0, 1, 2].map(j => versionAt(ap[j], at)).filter(x => x >= seen); v = opts.length ? opts[Math.floor(r() * opts.length)] : seen; }   // token: any replica at least as new
      if (v < seen) broke = true;
      seen = Math.max(seen, v);
    }
    if (broke) bad++;
  }
  return { bad };
}
// (c) causal: question on shard Q at t = 0, answer on shard A at t = 2 s; a reader at 2–6 s reads both from random replicas
function causal(fix, trials, r) {
  let bad = 0, hidden = 0;
  for (let i = 0; i < trials; i++) {
    const q = shard([0], r), a = shard([2000], r), at = 2000 + r() * 4000;
    const seesA = versionAt(a[Math.floor(r() * 3)], at) > 0, seesQ = versionAt(q[Math.floor(r() * 3)], at) > 0;
    if (fix === 'none') { if (seesA && !seesQ) bad++; }
    else if (seesA && !seesQ) hidden++;                                 // answer carries "needs question v1": hide it until the question shows
  }
  return { bad, hidden };
}
module.exports = { MAXLAG, shard, versionAt, ryw, monotonic, causal };
