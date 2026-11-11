'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DatabaseSync } = require('node:sqlite');
const { build, tempDb, plan, Q1, assemble } = require('../lib/build');
const { FOF, EXACT, adjacency, walk } = require('../lib/graph');
const { D, data, topk, kmeans } = require('../lib/vector');
const { addInvoices, copies, moveAddress } = require('../lib/move');

test('the three shapes give the same answers (user + orders; Pune biryani count)', () => {
  const t = tempDb('t1');
  try {
    const { kv } = build(t.db, { users: 2000 });
    const q1 = t.db.prepare(Q1);
    for (const id of [1, 777, 2000]) {                                 // the whole response, not just the dishes
      const rel = assemble(q1.all(id));
      assert.deepStrictEqual(JSON.parse(t.db.prepare('SELECT doc FROM user_docs WHERE id = ?').get(id).doc), rel);
      assert.deepStrictEqual(JSON.parse(kv.get(`user:${id}`)), rel);
      assert.deepStrictEqual(rel.orders.map(o => o.ts), [...rel.orders.map(o => o.ts)].sort((x, y) => y - x));
    }
    const a = t.db.prepare("SELECT count(DISTINCT u.id) n FROM users u JOIN orders o ON o.user_id = u.id WHERE u.city = 'Pune' AND o.dish = 'biryani'").get().n;
    const b = t.db.prepare("SELECT count(*) n FROM user_docs WHERE json_extract(doc, '$.city') = 'Pune' AND EXISTS (SELECT 1 FROM json_each(doc, '$.orders') WHERE json_extract(value, '$.dish') = 'biryani')").get().n;
    let c = 0; for (const v of kv.values()) { const d = JSON.parse(v); if (d.city === 'Pune' && d.orders.some(o => o.dish === 'biryani')) c++; }
    assert.ok(a > 0); assert.strictEqual(b, a); assert.strictEqual(c, a);
  } finally { t.close(); }
});

test('the join uses the index when it exists and scans orders when it does not', () => {
  const sql = 'SELECT o.dish FROM users u JOIN orders o ON o.user_id = u.id WHERE u.id = ?';
  for (const indexes of [true, false]) {
    const t = tempDb('t2');
    try {
      build(t.db, { users: 500, friendsPerUser: 0, docs: false, indexes });
      const p = plan(t.db, sql, 1).join(' | ');
      if (indexes) assert.match(p, /SEARCH o USING INDEX orders_user/); else assert.match(p, /SCAN o/);
    } finally { t.close(); }
  }
});

test('friend-of-friend: SQL self-join and the adjacency walk agree', () => {
  const t = tempDb('t3');
  try {
    build(t.db, { users: 3000, ordersPerUser: 0, docs: false });
    const g = adjacency(t.db, 3000), q = t.db.prepare(FOF);
    for (const id of [1, 42, 1500, 3000]) assert.strictEqual(walk(g, 3000, id, 2), q.get(id).n, `user ${id}`);
    assert.strictEqual(walk(g, 3000, 42, 1), t.db.prepare('SELECT count(DISTINCT dst) n FROM friends WHERE src = 42').get().n);
  } finally { t.close(); }
});

test('walk() matches a recursive SQL count at depths 1–4, with cycles, self-loops and duplicate edges; no per-query allocation', () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE friends (src INTEGER NOT NULL, dst INTEGER NOT NULL) STRICT');
  const ins = db.prepare('INSERT INTO friends VALUES (?, ?)');
  for (const [a, b] of [[1, 2], [2, 2], [2, 3], [3, 4], [4, 1], [1, 3], [1, 3], [3, 2], [5, 6]]) ins.run(a, b);
  const g = adjacency(db, 6), q = db.prepare(EXACT);
  for (const from of [1, 2, 5]) for (let d = 1; d <= 4; d++) assert.strictEqual(walk(g, 6, from, d), q.get(from, d, d).n, `small graph from ${from} depth ${d}`);
  assert.strictEqual(walk(g, 6, 1, 3), 4);                              // depth 1 {2,3} → 2 {2,3,4} → 3 {1,2,3,4}
  const t = tempDb('t3b');
  try {
    build(t.db, { users: 2000, ordersPerUser: 0, docs: false });
    const g2 = adjacency(t.db, 2000), q2 = t.db.prepare(EXACT);
    for (const id of [7, 999]) for (let d = 1; d <= 4; d++) assert.strictEqual(walk(g2, 2000, id, d), q2.get(id, d, d).n, `user ${id} depth ${d}`);
    const mark = g2.mark; walk(g2, 2000, 7, 2); assert.strictEqual(g2.mark, mark, 'marker array reused');
    g2.gen = 0x7fffffff - 2;                                              // cross the stamp limit
    for (let k = 0; k < 4; k++) for (const id of [7, 999]) assert.strictEqual(walk(g2, 2000, id, 3), q2.get(id, 3, 3).n, `after wrap, user ${id}`);
    assert.ok(g2.gen > 0 && g2.gen < 100, 'generation restarted');
  } finally { t.close(); }
});

test('schema on write: the ex4 table refuses bad rows; schema on read: readers and the migration (real ex4 SQL)', () => {
  const { CUSTOMERS, READERS, MIGRATE } = require('../lib/schema');
  const w = new DatabaseSync(':memory:'); w.exec(CUSTOMERS);
  const put = (id, pin) => w.prepare('INSERT INTO customers VALUES (?, ?, ?)').run(id, 'x', pin);
  put(1, '411004');
  for (const [i, bad] of [[2, '4110'], [3, '41100X'], [4, '011004'], [5, '4110041']]) assert.throws(() => put(i, bad), /CHECK constraint failed/, bad);
  assert.throws(() => put(6, null), /NOT NULL constraint failed/);
  w.exec('CREATE TABLE customer_docs (id INTEGER PRIMARY KEY, doc TEXT NOT NULL) STRICT');
  const docs = [{ name: 'A', zip: '411001' }, { name: 'B', postal_code: '411002' }, { name: 'C', address: { pin: '411003', city: 'Pune' } }, { name: 'D', zip: '560001' }];
  docs.forEach((d, i) => w.prepare('INSERT INTO customer_docs VALUES (?, ?)').run(i, JSON.stringify(d)));
  const count = expr => w.prepare(`SELECT count(*) n FROM customer_docs WHERE ${expr} LIKE '411%'`).get().n;
  assert.deepStrictEqual(READERS.map(([, e]) => count(e)), [1, 2, 3]);
  assert.strictEqual(w.prepare(MIGRATE).run().changes, 3);
  const after = w.prepare('SELECT doc FROM customer_docs ORDER BY id').all().map(r => JSON.parse(r.doc));
  assert.deepStrictEqual(after, [
    { name: 'A', address: { pin: '411001', city: 'x' } }, { name: 'B', address: { pin: '411002', city: 'x' } },
    { name: 'C', address: { pin: '411003', city: 'Pune' } }, { name: 'D', address: { pin: '560001', city: 'x' } }]);
  assert.strictEqual(count(READERS[0][1]), 3);                          // the v3-only reader now finds every Pune customer
  assert.strictEqual(w.prepare(MIGRATE).run().changes, 0);              // running it again changes nothing
});

test('moving house: a crash without a transaction leaves mixed copies; inside one transaction it leaves none changed', () => {
  const t = tempDb('t5');
  try {
    build(t.db, { users: 50, friendsPerUser: 0 });
    const old = addInvoices(t.db, 7), neu = { line: 'x', pincode: '411038' };
    const pins = () => copies(t.db, 7).map(a => a.pincode);
    assert.deepStrictEqual(moveAddress(t.db, 7, neu, { crashAfter: 3 }), { crashed: true });
    assert.deepStrictEqual(pins(), ['411038', '411038', '411038', old.pincode, old.pincode, old.pincode]);
    moveAddress(t.db, 7, old);
    moveAddress(t.db, 7, neu, { crashAfter: 3, inTransaction: true });
    assert.ok(pins().every(p => p === old.pincode));
    moveAddress(t.db, 7, neu, { inTransaction: true });
    assert.ok(pins().every(p => p === '411038'));
  } finally { t.close(); }
});

test('vectors: the SQL scan and the JS scan return the same top 10; IVF finds them when the data has clumps', () => {
  const n = 3000, both = data(n + 20, 9), X = both.subarray(0, n * D), Q = both.subarray(n * D), ids = Array.from({ length: n }, (_, i) => i);
  const db = new DatabaseSync(':memory:');
  db.function('dot', { deterministic: true }, (a, b) => { const x = new Float32Array(a.buffer, a.byteOffset, D), y = new Float32Array(b.buffer, b.byteOffset, D); let s = 0; for (let j = 0; j < D; j++) s += x[j] * y[j]; return s; });
  db.exec('CREATE TABLE v (id INTEGER PRIMARY KEY, vec BLOB NOT NULL) STRICT');
  for (let i = 0; i < n; i++) db.prepare('INSERT INTO v VALUES (?, ?)').run(i, new Uint8Array(X.slice(i * D, (i + 1) * D).buffer));
  const ivf = kmeans(X, n, 64, 5, 3);
  const seen = new Uint8Array(n);                                       // every vector in exactly one list: its nearest final centre
  ivf.lists.forEach((list, c) => { for (const id of list) {
    assert.strictEqual(seen[id], 0, `vector ${id} twice`); seen[id] = 1;
    assert.strictEqual(topk(ivf.C, Array.from({ length: 64 }, (_, k) => k), X.subarray(id * D, id * D + D), 1)[0], c, `vector ${id} not in its nearest group`);
  } });
  assert.ok(seen.every(x => x === 1), 'every vector listed');
  let hit = 0;
  for (let i = 0; i < 20; i++) {
    const q = Q.subarray(i * D, (i + 1) * D), exact = topk(X, ids, q, 10);
    assert.deepStrictEqual(db.prepare('SELECT id FROM v ORDER BY dot(vec, ?) DESC LIMIT 10').all(new Uint8Array(Q.slice(i * D, (i + 1) * D).buffer)).map(r => r.id), exact);
    const cand = []; for (const c of topk(ivf.C, Array.from({ length: 64 }, (_, c) => c), q, 4)) cand.push(...ivf.lists[c]);
    hit += topk(X, cand, q, 10).filter(id => exact.includes(id)).length;
  }
  assert.ok(hit / 200 >= 0.9, `recall ${hit / 200}`);
});

test('commit-latency arithmetic: serial steps add, parallel steps take the slowest (ex6 model)', () => {
  const { serial, parallel } = require('../lib/latency');
  assert.strictEqual(serial(1.3, 1.0, 1.3).toFixed(1), '3.6');           // Postgres sync standby: fsync, then RTT + standby fsync
  assert.strictEqual(parallel(1.3, serial(1.0, 1.3)).toFixed(1), '2.3');  // Raft: leader fsync while the follower round trip runs
  assert.strictEqual(parallel(1.3, serial(60, 1.3)).toFixed(1), '61.3');
});

