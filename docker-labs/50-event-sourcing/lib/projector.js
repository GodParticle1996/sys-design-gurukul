/* Read model (balances table) events se banta hai. Catch-up projector: store ko pos ke kram mein padho, apply karo,
   checkpoint aage badhao. together = apply + checkpoint ek transaction mein; split = do alag transactions. */
const { readAll } = require('./events');
const { upcast } = require('./account');
function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { fn(); db.exec('COMMIT'); } catch (err) { if (db.isTransaction) db.exec('ROLLBACK'); throw err; }
}
function applyToReadModel(db, raw) {
  const e = upcast(raw);
  if (e.type === 'Opened') db.prepare('INSERT OR IGNORE INTO balances VALUES (?, 0, 0)').run(e.stream);
  const delta = e.type === 'Deposited' ? e.data.amount : e.type === 'Withdrawn' ? -e.data.amount : 0;
  db.prepare('UPDATE balances SET balance = balance + ?, version = ? WHERE account = ?').run(delta, e.version, e.stream);
}
const getCheckpoint = (db, name) => db.prepare('SELECT pos FROM checkpoint WHERE name = ?').get(name)?.pos || 0;
const saveCheckpoint = (db, name, pos) => db.prepare('INSERT OR REPLACE INTO checkpoint VALUES (?, ?)').run(name, pos);
function catchUp(db, name, { mode = 'together', batch = 100, afterApply = () => {} } = {}) {
  const events = readAll(db, getCheckpoint(db, name), batch);
  for (const e of events) {
    if (mode === 'together') tx(db, () => { applyToReadModel(db, e); afterApply(e); saveCheckpoint(db, name, e.pos); });
    else { tx(db, () => applyToReadModel(db, e)); afterApply(e); tx(db, () => saveCheckpoint(db, name, e.pos)); }
  }
  return events.length;
}
module.exports = { tx, applyToReadModel, catchUp, getCheckpoint };
