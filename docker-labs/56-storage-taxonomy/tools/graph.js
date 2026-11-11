'use strict';
// ex3-graph: REAL SQLite + a JS adjacency list. "Friends of my friends" for one user, 20 friends each,
// at 10,000 / 1 lakh / 10 lakh users: SQL self-join with an index, SQL without, and walking an adjacency list
// (how a graph database stores edges: each node points straight at its neighbours).
const { build, tempDb } = require('../lib/build');
const { percentile } = require('../lib/stats');
const { FOF, adjacency, walk } = require('../lib/graph');
const us = f => { const t = process.hrtime.bigint(); const v = f(); return [Number(process.hrtime.bigint() - t) / 1000, v]; };
const fmt = x => x >= 1000 ? (x / 1000).toFixed(1) + ' ms' : x.toFixed(1) + ' µs';
console.log(`REAL RUN: Node ${process.version}; 20 random friends per user; friend-of-friend = distinct endpoints of 2-edge walks (what the SQL counts)`);
console.log('');
console.log('users        friend rows   answer   SQL + index      SQL, no index (1 query)   adjacency walk');
for (const n of [10_000, 100_000, 1_000_000]) {
  const t = tempDb('graph');
  try {
    build(t.db, { users: n, ordersPerUser: 0, docs: false, indexes: false });
    const ids = Array.from({ length: 200 }, (_, i) => 1 + ((i * 7919) % n));
    const q = t.db.prepare(FOF);
    const [noIdx, a0] = us(() => q.get(ids[0]).n);                  // one query: it reads the whole table twice over
    t.db.exec('CREATE INDEX friends_src ON friends(src)'); t.db.exec('ANALYZE');
    const q2 = t.db.prepare(FOF);
    const xs = [], ys = [], g = adjacency(t.db, n);
    for (const id of ids) { const [a, x] = us(() => q2.get(id).n); const [b, y] = us(() => walk(g, n, id, 2)); xs.push(a); ys.push(b); }
    // check the walk and SQL agree on the same users
    for (const id of ids.slice(0, 20)) if (q2.get(id).n !== walk(g, n, id, 2)) throw new Error('answers differ for ' + id);
    console.log(`${n.toLocaleString('en-IN').padEnd(11)}  ${(n * 20).toLocaleString('en-IN').padStart(11)}   ${String(a0).padStart(6)}   ${fmt(percentile(xs, 50)).padStart(11)}   ${fmt(noIdx).padStart(23)}   ${fmt(percentile(ys, 50)).padStart(16)}`);
  } finally { t.close(); }
}
console.log('');
const t = tempDb('deep');
try {
  const n = 100_000; build(t.db, { users: n, ordersPerUser: 0, docs: false });
  const g = adjacency(t.db, n);
  console.log(`== deeper: 1 lakh users, how far does one user reach? (adjacency walk) ==`);
  for (const d of [1, 2, 3, 4]) { walk(g, n, 4242, d); const [x, c] = us(() => walk(g, n, 4242, d)); console.log(`${d} hop${d > 1 ? 's' : ' '}: ${c.toLocaleString('en-IN').padStart(7)} people   ${fmt(x).padStart(9)}`); }
  console.log('The work follows how many people you reach. Medians: SQL + index and the walk over 200 users each.');
} finally { t.close(); }
