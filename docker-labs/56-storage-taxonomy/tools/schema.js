'use strict';
// ex4-schema: REAL SQLite. Schema on write (the table refuses bad rows) vs schema on read (JSON documents written by
// three app versions over the years; every reader has to know every shape).
const { DatabaseSync } = require('node:sqlite');
const { tempDb } = require('../lib/build');
const { rng } = require('../lib/rng');
const { CUSTOMERS, READERS, MIGRATE } = require('../lib/schema');

console.log(`REAL RUN: Node ${process.version}, SQLite ${new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v}`);
console.log('');
console.log('== A. schema on write: a STRICT table with rules ==');
const w = new DatabaseSync(':memory:');
w.exec(CUSTOMERS);
for (const [label, row] of [['good row', [1, 'Asha', '411004']], ['pincode 4110 (too short)', [2, 'Ravi', '4110']], ['no pincode', [3, 'Meera', null]], ['pincode 41100X (not digits)', [4, 'Dev', '41100X']]]) {
  try { w.prepare('INSERT INTO customers VALUES (?, ?, ?)').run(...row); console.log(`${label.padEnd(26)} → saved`); }
  catch (e) { console.log(`${label.padEnd(26)} → refused: ${e.message}`); }
}
console.log('');

const N = 100_000, r = rng(56);
const t = tempDb('schema');
try {
  const db = t.db;
  db.exec('CREATE TABLE customer_docs (id INTEGER PRIMARY KEY, doc TEXT NOT NULL) STRICT');
  const ins = db.prepare('INSERT INTO customer_docs VALUES (?, ?)');
  const count = { v1: 0, v2: 0, v3: 0 }; let truePune = 0;
  db.exec('BEGIN');
  for (let i = 1; i <= N; i++) {
    const pin = String((r() < 0.15 ? 411000 : 400000) + Math.floor(r() * 999)), x = r();
    let doc;
    if (x < 0.5) { doc = { name: `C${i}`, zip: pin }; count.v1++; }                          // app v1 (2020): "zip"
    else if (x < 0.8) { doc = { name: `C${i}`, postal_code: pin }; count.v2++; }             // app v2 (2022): renamed
    else { doc = { name: `C${i}`, address: { pin, city: 'x' } }; count.v3++; }               // app v3 (2024): nested
    if (pin.startsWith('411')) truePune++;
    ins.run(i, JSON.stringify(doc));
  }
  db.exec('COMMIT');
  console.log(`== B. schema on read: ${N.toLocaleString('en-IN')} customer documents from three app versions ==`);
  console.log(`v1 {zip}: ${count.v1.toLocaleString('en-IN')}   v2 {postal_code}: ${count.v2.toLocaleString('en-IN')}   v3 {address:{pin}}: ${count.v3.toLocaleString('en-IN')}   — the database accepted all three`);
  console.log(`Question: how many customers are in Pune (pincode 411xxx)? True answer: ${truePune.toLocaleString('en-IN')}`);
  for (const [label, expr] of READERS) {
    const n = db.prepare(`SELECT count(*) n FROM customer_docs WHERE ${expr} LIKE '411%'`).get().n;
    console.log(`${label.padEnd(28)} → ${n.toLocaleString('en-IN').padStart(6)}  (${(100 * n / truePune).toFixed(0)}% of the truth, no error shown)`);
  }
  const t0 = Date.now();
  const changed = db.prepare(MIGRATE).run().changes;
  const after = db.prepare("SELECT count(*) n FROM customer_docs WHERE json_extract(doc, '$.address.pin') LIKE '411%'").get().n;
  if (after !== truePune) throw new Error(`migration lost data: ${after} of ${truePune}`);
  console.log(`migration: ${changed.toLocaleString('en-IN')} documents rewritten to v3 in ${Date.now() - t0} ms → the v3-only reader now finds ${after.toLocaleString('en-IN')} (${(100 * after / truePune).toFixed(0)}%)`);
  console.log('The schema exists either way: in the table, or in every reader and every migration.');
} finally { t.close(); }
