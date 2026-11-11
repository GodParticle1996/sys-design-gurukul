'use strict';
// Friend-of-friend two ways: a SQL self-join, and walking a compressed adjacency list (each user's friends side by side).
const FOF = 'SELECT count(DISTINCT f2.dst) n FROM friends f1 JOIN friends f2 ON f2.src = f1.dst WHERE f1.src = ?';
function adjacency(db, n) {                  // compressed adjacency list, built by streaming rows (2 crore at 10 lakh users)
  const start = new Int32Array(n + 2);
  let m = 0;
  for (const r of db.prepare('SELECT src FROM friends').iterate()) { start[r.src + 1]++; m++; }
  for (let i = 1; i < start.length; i++) start[i] += start[i - 1];
  const next = new Int32Array(m), fill = start.slice();
  for (const r of db.prepare('SELECT src, dst FROM friends').iterate()) next[fill[r.src]++] = r.dst;
  return { start, next };
}
// Distinct endpoints of walks of exactly `depth` edges — the same question the SQL self-join (and a recursive CTE) answers.
// Each layer is deduplicated on its own, with a generation-stamped marker array made once per graph, so a query does not
// allocate or clear memory in proportion to the total number of users.
function walk(g, n, from, depth) {
  if (!g.mark) { g.mark = new Int32Array(n + 1); g.gen = 0; }
  let frontier = [from];
  for (let d = 0; d < depth; d++) {
    if (g.gen >= 0x7fffffff) { g.mark.fill(0); g.gen = 0; }   // stamps must fit the Int32Array: clear once, start again
    const gen = ++g.gen, out = [];
    for (const u of frontier) for (let i = g.start[u]; i < g.start[u + 1]; i++) { const v = g.next[i]; if (g.mark[v] !== gen) { g.mark[v] = gen; out.push(v); } }
    frontier = out;
  }
  return frontier.length;
}
// The same count in SQL for any depth (used by the tests to check walk()).
const EXACT = 'WITH RECURSIVE w(node, d) AS (SELECT ?, 0 UNION SELECT f.dst, w.d + 1 FROM w JOIN friends f ON f.src = w.node WHERE w.d < ?) SELECT count(DISTINCT node) n FROM w WHERE d = ?';
module.exports = { FOF, EXACT, adjacency, walk };
