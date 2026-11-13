'use strict';
// ex4 core — MODEL (deterministic timeline, ms): 5 nodes, old leader 1 is cut off with node 2 at t = 1000 ({1,2} | {3,4,5}).
// The big side elects a new leader at t = 1300 (election timeout ≥ 300 ms) and commits a new version every 50 ms.
// A client next to the old leader reads every 10 ms from t = 1000 to 3000. Which reads return an old version?
const PART = 1000, NEW_LEADER = 1300, END = 3000, WRITE_EVERY = 50, READ_EVERY = 10, LEASE = 200;
const truthAt = t => (t < NEW_LEADER ? 0 : Math.floor((t - NEW_LEADER) / WRITE_EVERY) + 1);   // newest committed version
// rule: 'local' | 'readindex' | 'lease' | 'lease-slow-clock'
function run(rule, { slow = 2 } = {}) {
  const s = { reads: 0, served: 0, stale: 0, refused: 0 };
  for (let t = PART; t < END; t += READ_EVERY) {
    s.reads++;
    let serve;
    if (rule === 'local') serve = true;                                 // old leader answers from its own copy
    else if (rule === 'readindex') serve = false;                       // must hear from a majority first: {1,2} cannot
    else if (rule === 'lease') serve = t < PART + LEASE;                // lease from the last majority ack, shorter than any election
    else serve = t < PART + LEASE * slow;                               // old leader's clock runs `slow` times too slow
    if (!serve) { s.refused++; continue; }
    s.served++;
    if (0 < truthAt(t)) s.stale++;                                      // old leader still has version 0
  }
  return s;
}
module.exports = { run, PART, NEW_LEADER, LEASE };
