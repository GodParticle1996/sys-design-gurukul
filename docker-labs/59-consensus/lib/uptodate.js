'use strict';
// ex3 core — seeded MODEL of Raft's election restriction (paper §5.4.1). 5 nodes. Entry X was written by leader 1 and
// two followers (a majority), committed and acknowledged to the client. Then leader 1 crashes. Of nodes 2–5, two hold X.
// Timers fire in random order; the first node to fire asks for votes (needs 3). A voter grants a vote only if it has not
// voted in this term AND (when the rule is on) the candidate's log is at least as up to date as the voter's.
// If the winner lacks X, it makes followers copy its log: X — a committed write — disappears.
const { rng } = require('./rng');
function shuffle(a, r) {                            // Fisher–Yates
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function trial(rule, r) {
  const nodes = [2, 3, 4, 5], has = new Set();
  const holders = shuffle(nodes, r);
  has.add(holders[0]); has.add(holders[1]);         // 2 of nodes 2–5 hold the committed entry X
  const order = shuffle(nodes, r);                   // whose timer fires first, second, …
  let rounds = 0;
  for (const cand of order) {
    rounds++;
    let votes = 1;                                   // a candidate votes for itself
    for (const v of nodes) {
      if (v === cand) continue;
      const upToDate = has.has(cand) || !has.has(v); // candidate's log at least as new as mine?
      if (!rule || upToDate) votes++;
    }
    if (votes >= 3) return { lost: !has.has(cand), rounds };
  }
  return { lost: false, rounds, none: true };
}
function run(rule, trials = 10000, seed = 54) {
  const r = rng(seed); let lost = 0, extra = 0, none = 0;
  for (let i = 0; i < trials; i++) { const t = trial(rule, r); if (t.lost) lost++; extra += t.rounds - 1; if (t.none) none++; }
  return { trials, lost, extraRounds: extra, none };
}
module.exports = { trial, run };
