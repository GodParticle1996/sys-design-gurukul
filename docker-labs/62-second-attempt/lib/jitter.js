'use strict';
// MODEL (seeded): a simplified SLOTTED contention illustration, inspired by (not a reproduction of) Marc Brooker's 2015 AWS
// OCC simulation. N clients all write the same row at t = 0. In each 1 ms slot, if several calls arrive, ONE succeeds and the
// rest fail and back off. `netMs`: each retry also gets a random 0 … netMs ms network delay. Count calls and time until done.
const { rng } = require('./rng');
const STRATEGIES = {
  none:         (v, r) => v,                                  // exponential, no jitter
  small:        (v, r) => v * (0.8 + 0.4 * r()),              // video: "2 s, plus some variance" (±20%)
  equal:        (v, r) => v / 2 + r() * v / 2,
  full:         (v, r) => r() * v,
};
function run({ strategy = 'full', clients = 100, base = 10, cap = 1000, seed = 1, netMs = 4 } = {}) {
  const r = rng(seed), due = new Map();                        // ms slot → list of client ids
  const attempt = new Array(clients).fill(0), prev = new Array(clients).fill(base);
  const push = (t, c) => { const k = Math.floor(t); (due.get(k) || due.set(k, []).get(k)).push(c); };
  for (let c = 0; c < clients; c++) push(0, c);
  let calls = 0, done = 0, t = 0, last = 0;
  while (done < clients) {
    const here = due.get(t); due.delete(t);
    if (here) {
      calls += here.length;
      const win = here[Math.floor(r() * here.length)];        // one call wins the slot
      for (const c of here) {
        if (c === win) { done++; last = t; continue; }
        attempt[c]++;
        let sleep;
        if (strategy === 'decorrelated') { sleep = Math.min(cap, base + r() * (prev[c] * 3 - base)); prev[c] = sleep; }
        else sleep = STRATEGIES[strategy](Math.min(cap, base * Math.pow(2, attempt[c])), r);
        push(t + 1 + sleep + r() * netMs, c);
      }
    }
    t++;
  }
  return { calls, ms: last };
}
function average(o, seeds = 20) {
  let calls = 0, ms = 0;
  for (let s = 1; s <= seeds; s++) { const x = run({ ...o, seed: s }); calls += x.calls; ms += x.ms; }
  return { calls: calls / seeds, ms: ms / seeds };
}
module.exports = { run, average, STRATEGIES };
