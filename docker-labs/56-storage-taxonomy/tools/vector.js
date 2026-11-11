'use strict';
// ex5-vector: REAL. "Find the 10 dishes most similar to this one" over embeddings (128 numbers each, seeded, in 200 clumps).
//   exact: compare with every vector (JS, and the same scan inside SQLite with a user-defined function)
//   IVF:   an approximate index — group vectors around 256 centres (k-means), search only the nearest few groups
const { DatabaseSync } = require('node:sqlite');
const { percentile } = require('../lib/stats');
const { D, data, topk, kmeans } = require('../lib/vector');
const ms = f => { const t = process.hrtime.bigint(); const v = f(); return [Number(process.hrtime.bigint() - t) / 1e6, v]; };
console.log(`REAL RUN: Node ${process.version}; ${D}-number unit vectors in 200 clumps (noise per number 0.06); 100 held-out queries; top 10 by dot product`);
console.log('');
for (const n of [10_000, 100_000]) {
  const both = data(n + 100, 56), X = both.subarray(0, n * D), Q = both.subarray(n * D);   // queries: 100 held-out vectors, same clumps
  const all = Array.from({ length: n }, (_, i) => i);
  const qv = i => Q.subarray(i * D, i * D + D);
  const exact = [], te = [];
  for (let i = 0; i < 100; i++) { const [t, ids] = ms(() => topk(X, all, qv(i), 10)); te.push(t); exact.push(ids); }
  const db = new DatabaseSync(':memory:');
  db.function('dot', { deterministic: true }, (a, b) => { const x = new Float32Array(a.buffer, a.byteOffset, D), y = new Float32Array(b.buffer, b.byteOffset, D); let s = 0; for (let j = 0; j < D; j++) s += x[j] * y[j]; return s; });
  db.exec('CREATE TABLE dishes (id INTEGER PRIMARY KEY, vec BLOB NOT NULL) STRICT');
  const ins = db.prepare('INSERT INTO dishes VALUES (?, ?)'); db.exec('BEGIN');
  for (let i = 0; i < n; i++) ins.run(i, new Uint8Array(X.slice(i * D, (i + 1) * D).buffer));
  db.exec('COMMIT');
  const sq = db.prepare('SELECT id FROM dishes ORDER BY dot(vec, ?) DESC LIMIT 10'), ts = [];
  for (let i = 0; i < 10; i++) { const [t, rows] = ms(() => sq.all(new Uint8Array(Q.slice(i * D, (i + 1) * D).buffer)).map(x => x.id)); ts.push(t); if (rows.join() !== exact[i].join()) throw new Error('SQL and JS disagree'); }
  db.close();
  console.log(`== ${n.toLocaleString('en-IN')} vectors ==`);
  console.log(`exact, JS scan of all ${n.toLocaleString('en-IN').padEnd(8)}  ${percentile(te, 50).toFixed(2).padStart(7)} ms per query   recall 100%`);
  console.log(`exact, same scan in SQLite (in memory) ${percentile(ts, 50).toFixed(2).padStart(7)} ms per query   recall 100% (same answers)`);
  const [buildMs, ivf] = ms(() => kmeans(X, n, 256, 6, 58));
  for (const probe of [1, 4, 16]) {
    const tq = []; let hit = 0, scanned = 0;
    for (let i = 0; i < 100; i++) {
      const [t, ids] = ms(() => {
        const q = qv(i), cs = topk(ivf.C, Array.from({ length: 256 }, (_, c) => c), q, probe), cand = [];
        for (const c of cs) for (const id of ivf.lists[c]) cand.push(id);
        scanned += cand.length; return topk(X, cand, q, 10);
      });
      tq.push(t); hit += ids.filter(id => exact[i].includes(id)).length;
    }
    console.log(`IVF, look in ${String(probe).padStart(2)} of 256 groups    ${percentile(tq, 50).toFixed(2).padStart(7)} ms per query   recall ${(hit / 10).toFixed(0)}%   (256 centres + ~${Math.round(scanned / 100).toLocaleString('en-IN')} candidates = ~${Math.round(256 + scanned / 100).toLocaleString('en-IN')} dot products)`);
  }
  console.log(`(building the IVF groups took ${(buildMs / 1000).toFixed(1)} s)`);
  console.log('');
}
console.log('Both exact baselines here compare the query with every vector (no filter). IVF compares far fewer candidates and');
console.log('returns approximate results. HNSW (in many vector stores and in pgvector) is another approximate index; not built here.');
