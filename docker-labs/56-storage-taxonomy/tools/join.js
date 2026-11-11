'use strict';
// ex2-join: REAL SQLite. Does a join get slower as the table grows? Same Q1 (user + address + last 5 orders) at
// 10,000 / 1 lakh / 10 lakh users, with and without an index on orders.user_id.
const { build, tempDb, plan } = require('../lib/build');
const { percentile } = require('../lib/stats');
const SQL = 'SELECT u.name, a.pincode, o.dish FROM users u JOIN addresses a ON a.id = u.address_id JOIN orders o ON o.user_id = u.id WHERE u.id = ? ORDER BY o.ts DESC LIMIT 5';
function time(stmt, ids) { const xs = []; for (const id of ids) { const t = process.hrtime.bigint(); if (stmt.all(id).length !== 5) throw new Error('wrong answer'); xs.push(Number(process.hrtime.bigint() - t) / 1000); } return percentile(xs, 50); }
console.log(`REAL RUN: Node ${process.version}; each size built fresh in a temp SQLite file; 5 orders per user`);
console.log('');
console.log('users        orders      with index on orders.user_id   without index           plan without index');
for (const n of [10_000, 100_000, 1_000_000]) {
  const row = [];
  for (const indexes of [true, false]) {
    const t = tempDb('join');
    try {
      build(t.db, { users: n, friendsPerUser: 0, docs: false, indexes });
      const stmt = t.db.prepare(SQL), ids = Array.from({ length: indexes ? 500 : 5 }, (_, i) => 1 + ((i * 7919) % n));
      row.push([time(stmt, ids), plan(t.db, SQL, 1).filter(p => /\bo\b/.test(p)).join(' ')]);
    } finally { t.close(); }
  }
  const fmt = us => us >= 1000 ? (us / 1000).toFixed(1) + ' ms' : us.toFixed(1) + ' µs';
  console.log(`${n.toLocaleString('en-IN').padEnd(11)}  ${(n * 5).toLocaleString('en-IN').padEnd(10)}  ${fmt(row[0][0]).padStart(28)}   ${fmt(row[1][0]).padStart(13)}           ${row[1][1]}`);
}
console.log('With the index, the join walks a few B-tree pages: the time barely moves. Without it, every query reads every order.');
