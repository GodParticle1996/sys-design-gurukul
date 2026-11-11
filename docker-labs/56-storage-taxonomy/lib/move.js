'use strict';
// A user moves house while the address is copied into documents: the user doc and one invoice doc per pending order.
// moveAddress() rewrites every copy one by one; crashAfter = n throws before the (n+1)th write, like an app crash.
function addInvoices(db, id) {
  db.exec('CREATE TABLE IF NOT EXISTS invoice_docs (order_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, doc TEXT NOT NULL) STRICT; CREATE INDEX IF NOT EXISTS inv_user ON invoice_docs(user_id);');
  const addr = JSON.parse(db.prepare('SELECT doc FROM user_docs WHERE id = ?').get(id).doc).address;
  const ins = db.prepare('INSERT INTO invoice_docs VALUES (?, ?, ?)');
  for (const o of db.prepare('SELECT id, dish, amount FROM orders WHERE user_id = ?').all(id)) ins.run(o.id, id, JSON.stringify({ order: o.id, dish: o.dish, amount: o.amount, shipTo: addr }));
  return addr;
}
function copies(db, id) {
  return [JSON.parse(db.prepare('SELECT doc FROM user_docs WHERE id = ?').get(id).doc).address,
    ...db.prepare('SELECT doc FROM invoice_docs WHERE user_id = ? ORDER BY order_id').all(id).map(r => JSON.parse(r.doc).shipTo)];
}
function moveAddress(db, id, addr, { crashAfter = -1, inTransaction = false } = {}) {
  const pending = db.prepare('SELECT order_id FROM invoice_docs WHERE user_id = ? ORDER BY order_id').all(id);
  const targets = [['user_docs', 'id', id], ...pending.map(r => ['invoice_docs', 'order_id', r.order_id])];
  if (inTransaction) db.exec('BEGIN');
  try {
    targets.forEach(([table, key, rowId], i) => {
      if (i === crashAfter) throw new Error('app crashed');
      const d = JSON.parse(db.prepare(`SELECT doc FROM ${table} WHERE ${key} = ?`).get(rowId).doc);
      if (table === 'user_docs') d.address = addr; else d.shipTo = addr;
      db.prepare(`UPDATE ${table} SET doc = ? WHERE ${key} = ?`).run(JSON.stringify(d), rowId);
    });
    if (inTransaction) db.exec('COMMIT');
    return { crashed: false };
  } catch (e) {
    if (inTransaction) db.exec('ROLLBACK');
    if (e.message !== 'app crashed') throw e;
    return { crashed: true };
  }
}
module.exports = { addInvoices, copies, moveAddress };
