'use strict';
// Real SQLite event records. Wallet and notification delivery are teaching models.
const { DatabaseSync } = require('node:sqlite');
function open(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE events (
    version INTEGER PRIMARY KEY, type TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0),
    ref INTEGER REFERENCES events(version), recorded_at TEXT NOT NULL
  )`);
  db.exec('PRAGMA foreign_keys=ON');
  return db;
}
const read = db => db.prepare('SELECT * FROM events ORDER BY version').all();
function append(db, expected, event) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const version = db.prepare('SELECT coalesce(max(version),0) AS v FROM events').get().v;
    if (version !== expected) throw new Error('version conflict');
    db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?)').run(version+1, event.type, event.amount,
      event.ref ?? null, event.recorded_at ?? '2026-01-01T10:00:00Z');
    db.exec('COMMIT');
    return version+1;
  } catch (err) { if (db.isTransaction) db.exec('ROLLBACK'); throw err; }
}
function fold(events) {
  let balance=0, version=0;
  const fees = new Map(), reversed = new Set();
  for (const e of events) {
    if (e.version !== version+1) throw new Error('gap or duplicate version');
    if (!Number.isSafeInteger(e.amount) || e.amount <= 0) throw new Error('invalid amount');
    if (e.type === 'TopUpRecorded') balance += e.amount;
    else if (e.type === 'FeeCharged') { balance -= e.amount; fees.set(e.version,e.amount); }
    else if (e.type === 'FeeReversed') {
      if (fees.get(e.ref) !== e.amount || reversed.has(e.ref)) throw new Error('invalid fee reversal');
      reversed.add(e.ref); balance += e.amount;
    } else throw new Error('unsupported event: '+e.type);
    version=e.version;
  }
  return {balance,version};
}
function reverseFee(db, feeVersion, expected) {
  // Validate against the stream we read. append's expected version rejects intervening writers.
  const events=read(db); fold(events);
  if ((events.at(-1)?.version ?? 0) !== expected) throw new Error('version conflict');
  const fee=events.find(e=>e.version===feeVersion && e.type==='FeeCharged');
  if (!fee) throw new Error('fee not found');
  if (events.some(e=>e.type==='FeeReversed' && e.ref===feeVersion)) throw new Error('fee already reversed');
  return append(db,expected,{type:'FeeReversed',amount:fee.amount,ref:feeVersion});
}
// Intentionally unsafe coupling: replaying history invokes the notification sink again.
function rebuildAndNotify(events, notify) {
  const state=fold(events);
  for (const e of events) notify(e);
  return state;
}
module.exports={open,read,append,fold,reverseFee,rebuildAndNotify};
