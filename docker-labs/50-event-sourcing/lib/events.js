/* Event store: sirf aakhir mein jodo. Event kabhi badalta ya mitta nahi. Har stream (ek account) ke events 1, 2, 3… version par.
   append(expected): expected = jo version padh ke faisla kiya tha. 'any' = bina jaanch ke aakhir mein jod do. */
class Conflict extends Error {}
function readStream(db, stream, afterVersion = 0) {
  return db.prepare('SELECT version, type, schema, data FROM events WHERE stream = ? AND version > ? ORDER BY version')
    .all(stream, afterVersion).map(r => ({ version: r.version, type: r.type, schema: r.schema, data: JSON.parse(r.data) }));
}
function append(db, stream, expected, events) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const cur = db.prepare('SELECT max(version) v FROM events WHERE stream = ?').get(stream).v || 0;
    if (expected !== 'any' && cur !== expected) throw new Conflict(`expected v${expected}, stream v${cur} par`);
    const ins = db.prepare('INSERT INTO events (stream, version, type, schema, data) VALUES (?, ?, ?, ?, ?)');
    let pos = 0;
    events.forEach((e, i) => { pos = Number(ins.run(stream, cur + 1 + i, e.type, e.schema || 2, JSON.stringify(e.data)).lastInsertRowid); });
    db.exec('COMMIT');
    return { version: cur + events.length, pos };
  } catch (err) { if (db.isTransaction) db.exec('ROLLBACK'); throw err; }
}
function readAll(db, afterPos, limit = 500) {          // projector ke liye: poore store ka kram (pos)
  return db.prepare('SELECT pos, stream, version, type, schema, data FROM events WHERE pos > ? ORDER BY pos LIMIT ?')
    .all(afterPos, limit).map(r => ({ ...r, data: JSON.parse(r.data) }));
}
module.exports = { Conflict, readStream, append, readAll };
