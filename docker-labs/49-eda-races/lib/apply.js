/* Teen race conditions ka asli kaam. db = node:sqlite connection; sab ek hi DB file par. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
function setStatus(db, e, who) {                       // ex1: "order ki haalat = X" wala event
  db.prepare('INSERT OR REPLACE INTO orders VALUES (?, ?, ?)').run(e.order, e.status, e.seq);
  db.prepare('INSERT INTO applied (id, seq, who) VALUES (?, ?, ?)').run(e.order, e.seq, who);
}
function inOrder(db, e, who) {                         // ex1 fix: agla seq hi likho, aage wale buffer
  db.exec('BEGIN IMMEDIATE');
  try {
    const last = db.prepare('SELECT seq FROM orders WHERE id = ?').get(e.order)?.seq || 0;
    if (e.seq <= last) { db.exec('COMMIT'); return 'duplicate'; }   // pehle likha ja chuka: buffer mein mat rakho
    if (e.seq > last + 1) {                            // beech ka seq abhi nahi aaya
      db.prepare('INSERT OR IGNORE INTO buffer VALUES (?, ?, ?)').run(e.order, e.seq, e.status);
      db.exec('COMMIT');
      return 'buffered';
    }
    setStatus(db, e, who);
    for (let s = e.seq + 1; ; s++) {
      const next = db.prepare('SELECT status FROM buffer WHERE id = ? AND seq = ?').get(e.order, s);
      if (!next) break;
      setStatus(db, { order: e.order, seq: s, status: next.status }, who);
      db.prepare('DELETE FROM buffer WHERE id = ? AND seq = ?').run(e.order, s);
    }
    db.exec('COMMIT');
    return 'applied';
  } catch (err) { rollback(db); throw err; }            // SQL error: adhura kaam wapas, connection saaf
}
async function addUnsafe(db, id, delta, gapMs) {       // ex2: padho, ruko, likho
  const { balance } = db.prepare('SELECT balance FROM account WHERE id = ?').get(id);
  await sleep(gapMs);
  db.prepare('UPDATE account SET balance = ? WHERE id = ?').run(balance + delta, id);
  return 1;
}
async function addCas(db, id, delta, gapMs) {          // ex2 fix: version wahi ho tabhi likho
  for (let tries = 1; ; tries++) {
    const { balance, version } = db.prepare('SELECT balance, version FROM account WHERE id = ?').get(id);
    await sleep(gapMs);
    const r = db.prepare('UPDATE account SET balance = ?, version = version + 1 WHERE id = ? AND version = ?')
      .run(balance + delta, id, version);
    if (r.changes === 1) return tries;
  }
}
function addAtomic(db, id, delta) {                    // ex2 fix: DB khud jode
  db.prepare('UPDATE account SET balance = balance + ? WHERE id = ?').run(delta, id);
  return 1;
}
function charge(db, p, keyMode) {                      // ex3: payment, duplicate se bachav ke saath
  const key = { none: null, userAmount: `${p.user}:${p.amount}`,
    arrival: `${p.user}:${Date.now()}`, paymentId: p.id }[keyMode];
  db.exec('BEGIN IMMEDIATE');
  try {
    if (key && db.prepare('INSERT OR IGNORE INTO processed VALUES (?)').run(key).changes === 0) {
      db.exec('COMMIT');
      return 'duplicate';
    }
    db.prepare('INSERT INTO charges (payment, user, amount) VALUES (?, ?, ?)').run(p.id, p.user, p.amount);
    db.exec('COMMIT');
    return 'charged';
  } catch (err) { rollback(db); throw err; }            // SQL error: adhura kaam wapas, connection saaf
}
function rollback(db) {                                // process zinda hai, toh adhura transaction khud band karna hoga
  if (db.isTransaction) db.exec('ROLLBACK');
}
module.exports = { setStatus, inOrder, addUnsafe, addCas, addAtomic, charge };
