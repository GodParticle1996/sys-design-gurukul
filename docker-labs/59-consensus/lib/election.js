'use strict';
// ex1 core — seeded MODEL of Raft elections after the leader dies (paper §5.2): n live voters, each with a random
// election timeout in [lo, hi] ms. A node whose timer fires becomes a candidate (new term, votes for itself) and asks
// everyone; a request takes 1–5 ms one way. A follower votes for the first candidate whose request reaches it, unless
// its own timer fired earlier (then it is a candidate itself). Majority = leader; otherwise a split vote and a new round.
const { rng } = require('./rng');

function elect({ n = 4, lo, hi, r, majority = 3 }) {
  let t = 0, rounds = 0;
  for (;;) {
    rounds++;
    const fire = Array.from({ length: n }, () => t + lo + r() * (hi - lo));
    const d = () => 1 + r() * 4;
    const order = fire.map((f, i) => i).sort((a, b) => fire[a] - fire[b]);
    const cands = [], reach = Array.from({ length: n }, () => Infinity);   // first request arrival per node
    const arrive = Array.from({ length: n }, () => Array(n).fill(Infinity));
    for (const i of order) {
      if (fire[i] < reach[i]) {                                        // timer fired before any request arrived: candidate
        cands.push(i);
        for (let j = 0; j < n; j++) if (j !== i) { arrive[i][j] = fire[i] + d(); reach[j] = Math.min(reach[j], arrive[i][j]); }
      }
    }
    const votes = new Map(cands.map(c => [c, [fire[c]]]));            // vote times (own vote at fire time)
    for (let j = 0; j < n; j++) {
      if (cands.includes(j)) continue;
      let best = null; for (const c of cands) if (best === null || arrive[c][j] < arrive[best][j]) best = c;
      votes.get(best).push(arrive[best][j] + d());                     // reply travels back
    }
    let winner = null, at = Infinity;
    for (const [c, v] of votes) if (v.length >= majority) { const w = v.sort((a, b) => a - b)[majority - 1]; if (w < at) { at = w; winner = c; } }
    if (winner !== null) return { rounds, ms: at, split: rounds - 1 };
    t = Math.max(...fire) + 10;                                       // nobody won: everyone waits for a new random timeout
    if (rounds > 1000) return { rounds, ms: Infinity, split: rounds - 1 };
  }
}
module.exports = { elect };
