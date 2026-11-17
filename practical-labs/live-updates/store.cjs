'use strict';
// Teaching lab: one SQLite writer, scoped streams, retained history and snapshots.
const { DatabaseSync } = require('node:sqlite');

class EventStore {
  constructor(filename = ':memory:', retain = 3) {
    if (!Number.isSafeInteger(retain) || retain < 1) throw new Error('Invalid retention');
    this.retain = retain;
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY, head INTEGER NOT NULL, floor INTEGER NOT NULL,
        state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (
        stream_id TEXT NOT NULL REFERENCES streams(id), seq INTEGER NOT NULL,
        state TEXT NOT NULL, PRIMARY KEY(stream_id, seq));`);
  }
  create(id, state = 'accepted') {
    this.db.prepare('INSERT OR IGNORE INTO streams VALUES (?, 0, 0, ?)').run(id, state);
  }
  head(id) {
    const row = this.db.prepare('SELECT * FROM streams WHERE id=?').get(id);
    if (!row) throw new Error('Unknown stream');
    return row;
  }
  append(id, state) {
    if (!['accepted', 'cooking', 'ready', 'delivered'].includes(state)) throw new Error('Invalid state');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const head = this.head(id);
      const seq = head.head + 1;
      const floor = Math.max(0, seq - this.retain);
      this.db.prepare('INSERT INTO events VALUES (?, ?, ?)').run(id, seq, state);
      this.db.prepare('UPDATE streams SET head=?, floor=?, state=? WHERE id=?').run(seq, floor, state, id);
      this.db.prepare('DELETE FROM events WHERE stream_id=? AND seq<=?').run(id, floor);
      this.db.exec('COMMIT');
      return { stream_id: id, seq, state };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  resume(id, cursor = null) {
    const head = this.head(id);
    if (cursor === null) return { mode: 'snapshot', rows: [{ stream_id: id, seq: head.head, state: head.state }] };
    if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > head.head) throw new Error('Invalid cursor');
    if (cursor < head.floor) return { mode: 'reset', rows: [{ stream_id: id, seq: head.head, state: head.state }] };
    const rows = this.db.prepare('SELECT stream_id, seq, state FROM events WHERE stream_id=? AND seq>? ORDER BY seq').all(id, cursor);
    return { mode: 'replay', rows };
  }
  close() { this.db.close(); }
}

// Snapshot replacement is safe for this current-state UI. Not a payment handler.
function applyUpdate(current, event) {
  if (event.stream_id !== current.stream_id) throw new Error('Wrong stream');
  if (!Number.isSafeInteger(event.seq) || event.seq < 0) throw new Error('Invalid sequence');
  return event.seq <= current.seq ? current : { ...event };
}

module.exports = { EventStore, applyUpdate };
