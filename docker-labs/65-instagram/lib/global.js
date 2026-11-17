'use strict';
// ex4 — going global: hedged requests (seeded model), what a Spanner-style write waits for (arithmetic), and
// conflict handling across regions (real merge code on tiny records).
const { rng } = require('./rng');
const { percentile } = require('./stats');

// One shard read: log-normal body (median 10 ms, so p95 ≈ 19 ms) and a 1% chance of a 200 ms stall (GC, disk queue).
function shardLatency(r, { slowP = 0.01, slowMs = 200 } = {}) {
  const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const base = 10 * Math.exp(0.4 * z);
  return { ms: r() < slowP ? slowMs + base : base, slow: false };
}
// A page waits for all `shards`. hedgeAfterMs: if the primary has not answered, ask a replica too and take the first answer.
// correlated: chance that a slow primary's cause also slows its replica (same hot partition, same bad query).
function page({ shards = 100, pages = 20000, hedgeAfterMs = null, correlated = 0, seed = 21 } = {}) {
  const r = rng(seed), out = []; let sent = 0;
  for (let p = 0; p < pages; p++) {
    let worst = 0;
    for (let s = 0; s < shards; s++) {
      const prim = shardLatency(r).ms; let t = prim; sent++;
      if (hedgeAfterMs !== null && prim > hedgeAfterMs) {
        sent++;
        let rep = shardLatency(r).ms;
        if (prim > 100 && r() < correlated) rep = Math.max(rep, prim);       // the replica shares the slow cause
        t = Math.min(prim, hedgeAfterMs + rep);
      }
      worst = Math.max(worst, t);
    }
    out.push(worst);
  }
  return { p50: percentile(out, 50), p99: percentile(out, 99), slowPages: out.filter(x => x > 100).length / pages, extraLoad: sent / (shards * pages) - 1 };
}

// A Spanner-style write (one Paxos group, leader-local; disk, CPU and multi-group commits ignored) commits after a majority
// of voting replicas log it, plus commit wait. TrueTime returns [now − ε, now + ε]; the commit timestamp is taken at the upper
// end and the leader waits until the lower end passes it — about 2ε with a fixed ±ε clock. The wait overlaps Paxos.
// rtt: round-trip ms from the leader to each other voter (maana hua). Majority of n voters = leader + ⌊n/2⌋ nearest acks.
function quorumWriteMs(rtt, epsilonMs = 7) {
  const acks = [...rtt].sort((a, b) => a - b), need = Math.floor((rtt.length + 1) / 2);
  return Math.max(acks[need - 1], 2 * epsilonMs);
}

// Conflicts: one profile, two regions edit at almost the same moment. Wall clocks may be skewed.
// Every replica must pick the same winner whatever the arrival order, so a timestamp tie is broken by the writer id
// (this lab's rule; Cassandra breaks ties between equal-timestamp cells by comparing values).
const later = (x, y) => (x.ts !== y.ts ? x.ts > y.ts : String(x.w) > String(y.w));
function lwwRow(a, b) { return later({ ts: a.ts, w: a.region }, { ts: b.ts, w: b.region }) ? a : b; }   // whole row
function lwwCell(a, b) {                                                        // per column (Cassandra resolves per cell)
  const out = {};
  for (const k of new Set([...Object.keys(a.cells), ...Object.keys(b.cells)])) {
    const x = a.cells[k], y = b.cells[k];
    out[k] = !x ? y : !y ? x : (later(x, y) ? x : y);
  }
  return out;
}
// Vector clocks: compare per region; neither ≥ the other in every slot → concurrent → keep both for the app to merge.
function compareVC(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aBig = false, bBig = false;
  for (const k of keys) { const x = a[k] || 0, y = b[k] || 0; if (x > y) aBig = true; if (y > x) bBig = true; }
  return aBig && bBig ? 'concurrent' : aBig ? 'a-newer' : bBig ? 'b-newer' : 'equal';
}
module.exports = { shardLatency, page, quorumWriteMs, lwwRow, lwwCell, compareVC };
