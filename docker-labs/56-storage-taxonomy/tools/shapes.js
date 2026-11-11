'use strict';
// ex1-shapes: REAL SQLite. The same 1 lakh KhanaKart users stored three ways. Three questions:
//   Q1 "user 4242 with address and last 5 orders"   Q2 "how many Pune users ordered biryani?"
//   Q3 "user 4242 moved house" — one row, or every copy of the address?
const { build, tempDb, plan, Q1, assemble } = require('../lib/build');
const { percentile } = require('../lib/stats');
const { addInvoices, copies, moveAddress } = require('../lib/move');

const N = 100_000, ID = 4242;
const us = f => { const t = process.hrtime.bigint(); const v = f(); return [Number(process.hrtime.bigint() - t) / 1000, v]; };
function median(f, runs) { const xs = []; let v; for (let i = 0; i < runs; i++) { const [t, x] = us(f); xs.push(t); v = x; } return [percentile(xs, 50), v]; }

const t = tempDb('shapes');
try {
  const { kv } = build(t.db, { users: N });
  const db = t.db;
  console.log(`REAL RUN: Node ${process.version}, SQLite ${db.prepare('select sqlite_version() v').get().v}; ${N.toLocaleString('en-IN')} users, 5 orders each, one file`);
  console.log('');

  console.log(`== Q1: user ${ID} with address and last 5 orders, as one object (median of 2,000 runs; all three return the same object) ==`);
  const joinSql = Q1;                                            // every path returns the same object, newest order first
  const q1 = db.prepare(joinSql), d1 = db.prepare('SELECT doc FROM user_docs WHERE id = ?');
  const [tj, rj] = median(() => assemble(q1.all(ID)), 2000);
  const [td, rd] = median(() => JSON.parse(d1.get(ID).doc), 2000);
  const [tk, rk] = median(() => JSON.parse(kv.get(`user:${ID}`)), 2000);
  if (JSON.stringify(rj) !== JSON.stringify(rd) || JSON.stringify(rd) !== JSON.stringify(rk)) throw new Error('Q1 answers differ');
  console.log(`relational: join + assemble  ${tj.toFixed(1).padStart(6)} µs   plan: ${plan(db, joinSql, ID).join(' │ ')}`);
  console.log(`document  : one JSON row      ${td.toFixed(1).padStart(6)} µs   plan: ${plan(db, 'SELECT doc FROM user_docs WHERE id = ?', ID).join(' │ ')}`);
  console.log(`key-value : Map get + parse   ${tk.toFixed(1).padStart(6)} µs   (no database call at all)`);
  console.log('');

  console.log('== Q2: how many Pune users ordered biryani? (median of 5 runs) ==');
  const sqlQ2 = "SELECT count(DISTINCT u.id) n FROM users u JOIN orders o ON o.user_id = u.id WHERE u.city = 'Pune' AND o.dish = 'biryani'";
  const docQ2 = "SELECT count(*) n FROM user_docs WHERE json_extract(doc, '$.city') = 'Pune' AND EXISTS (SELECT 1 FROM json_each(doc, '$.orders') WHERE json_extract(value, '$.dish') = 'biryani')";
  const [ts2, a] = median(() => db.prepare(sqlQ2).get().n, 5);
  const [td2, b] = median(() => db.prepare(docQ2).get().n, 5);
  const [tk2, c] = median(() => { let n = 0; for (const v of kv.values()) { const d = JSON.parse(v); if (d.city === 'Pune' && d.orders.some(o => o.dish === 'biryani')) n++; } return n; }, 5);
  if (a !== b || b !== c) throw new Error(`Q2 answers differ: ${a} ${b} ${c}`);
  console.log(`answer: ${a.toLocaleString('en-IN')} users (all three agree)`);
  console.log(`relational: indexed join      ${(ts2 / 1000).toFixed(1).padStart(7)} ms   plan: ${plan(db, sqlQ2).join(' │ ')}`);
  console.log(`document  : JSON inside SQL   ${(td2 / 1000).toFixed(1).padStart(7)} ms   plan: ${plan(db, docQ2).join(' │ ')}`);
  console.log(`key-value : read every value  ${(tk2 / 1000).toFixed(1).padStart(7)} ms   (a KV store can only get by key; anything else = read all)`);
  console.log('');

  console.log(`== Q3: user ${ID} moves house ==`);
  const old = addInvoices(db, ID);
  const ch = db.prepare("UPDATE addresses SET line = '7 FC Road, Pune', pincode = '411004' WHERE id = ?").run(ID).changes;
  console.log(`relational: ${ch} row changed (addresses.id = ${ID}); every query that joins sees the new address`);
  const n = copies(db, ID).length;
  console.log(`documents : the address is copied into ${n} documents (the user doc + ${n - 1} invoice docs of pending orders) — the app must find and change all ${n}`);
  const newAddr = { line: '7 FC Road, Pune', pincode: '411004' };
  const count = () => copies(db, ID).filter(a => a.pincode === '411004').length;
  const before = copies(db, ID);
  moveAddress(db, ID, newAddr, { crashAfter: 3 });
  const half = count();
  console.log(`app crashes after 3 of ${n} updates, no transaction: ${half} documents say the new 411004, ${n - half} still say the old ${old.pincode} — which one is true?`);
  moveAddress(db, ID, old);                                     // put every copy back to the old address
  moveAddress(db, ID, newAddr, { crashAfter: 3, inTransaction: true });
  console.log(`same crash inside one transaction: ${count()} changed (ROLLBACK) — all old, consistent; the move must be redone`);
  if (JSON.stringify(copies(db, ID)) !== JSON.stringify(before)) throw new Error('rollback did not restore');
  moveAddress(db, ID, newAddr, { inTransaction: true });
  console.log(`no crash: ${count()} of ${n} updated`);
} finally { t.close(); }
