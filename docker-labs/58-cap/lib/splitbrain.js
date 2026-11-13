'use strict';
// ex5 core — seeded MODEL: 5 nodes, the old leader (node 5) is on the small side of a split {1,2,3} | {4,5}.
// 1,000 client writes during 30 s; 60% of clients reach the big side, 40% the small side.
const { rng } = require('./rng');

function election(rule, { writes = 1000, seed = 51 } = {}) {
  const r = rng(seed);
  // old leader 5 never hears about term 2, so it still BELIEVES it leads in both rules; only commit power differs
  const s = { believe: 2, canCommit: rule === 'no quorum' ? 2 : 1, acked: 0, refused: 0, lostOnHeal: 0 };
  for (let i = 0; i < writes; i++) {
    const big = r() < 0.6;
    if (big) { s.acked++; continue; }                                   // new leader (term 2) on the big side commits with 3 of 5
    if (rule === 'no quorum') { s.acked++; s.lostOnHeal++; }            // old leader keeps saying "ho gaya"; on heal its branch is thrown away
    else s.refused++;                                                   // quorum: old leader cannot reach 3 nodes → no commit, client gets an error
  }
  return s;
}
// the old leader froze (GC pause) and wakes up after the new leader took over; it still holds 50 queued writes for storage
function zombie(fenced) {
  const storage = { term: 0, value: null, accepted: 0, rejected: 0 };
  const put = (term, v) => { if (fenced && term < storage.term) { storage.rejected++; return; } storage.term = Math.max(storage.term, term); storage.value = v; storage.accepted++; };
  for (let i = 0; i < 100; i++) put(2, `new-${i}`);                     // new leader, term 2
  for (let i = 0; i < 50; i++) put(1, `old-${i}`);                      // woken old leader, term 1
  return { ...storage, staleWins: storage.value.startsWith('old') };
}
// downtime allowed per year for a given availability (365.25-day year)
const downtime = pct => (1 - pct / 100) * 365.25 * 24 * 3600;           // seconds
module.exports = { election, zombie, downtime };
