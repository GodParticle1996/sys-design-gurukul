'use strict';
// One local SQLite database models the application and durable job table.
// It is not an external message broker or a distributed database.
const { DatabaseSync } = require('node:sqlite');
class Shortener {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS links(code TEXT PRIMARY KEY, url TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(code TEXT PRIMARY KEY, url TEXT NOT NULL, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, code TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0);`);
  }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  validate(code, url) {
    if (!/^[a-zA-Z0-9]{1,20}$/.test(code)) throw Error('Use a 1–20 character alphanumeric demo code');
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw Error('Only HTTP(S) URLs');
  }
  insertLink(code, url, afterMapping = () => {}) {
    this.db.prepare('INSERT INTO links VALUES (?, ?)').run(code, url);
    afterMapping(); // A test can exit the process inside this uncommitted transaction.
    this.db.prepare('INSERT INTO outbox(id, code) VALUES (?, ?)').run('created:' + code, code);
  }
  createNow(code, url) {
    this.validate(code, url);
    this.transaction(() => this.insertLink(code, url));
  }
  enqueue(code, url) {
    this.validate(code, url);
    this.db.prepare("INSERT INTO jobs VALUES (?, ?, 'pending')").run(code, url);
  }
  status(code) { return this.db.prepare('SELECT state FROM jobs WHERE code=?').get(code)?.state ?? 'unknown'; }
  work(code, afterMapping) {
    return this.transaction(() => {
      const job = this.db.prepare('SELECT * FROM jobs WHERE code=?').get(code);
      if (!job) throw Error('Unknown job');
      if (job.state === 'done') return 'already-done';
      this.insertLink(code, job.url, afterMapping);
      this.db.prepare("UPDATE jobs SET state='done' WHERE code=?").run(code);
      return 'committed';
    });
  }
  redirect(code) {
    const row = this.db.prepare('SELECT url FROM links WHERE code=?').get(code);
    return row ? {status:302, location:row.url} : {status:404};
  }
  relay(consumer, afterDelivery = () => {}) {
    const rows = this.db.prepare('SELECT id, code FROM outbox WHERE sent=0 ORDER BY id').all();
    for (const row of rows) {
      consumer.receive(row);
      afterDelivery(); // The consumer committed; the sender may still lose its acknowledgement.
      this.db.prepare('UPDATE outbox SET sent=1 WHERE id=?').run(row.id);
    }
    return rows.length;
  }
  pendingEvents() { return this.db.prepare('SELECT count(*) AS n FROM outbox WHERE sent=0').get().n; }
  close() { this.db.close(); }
}

// Separate SQLite database and transaction: a local stand-in for an analytics
// consumer. No transaction spans the Shortener and Analytics databases.
class Analytics {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS seen(id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS counts(code TEXT PRIMARY KEY, n INTEGER NOT NULL);`);
  }
  receive(event) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const first = this.db.prepare('INSERT OR IGNORE INTO seen VALUES (?)').run(event.id).changes;
      if (first) this.db.prepare('INSERT INTO counts VALUES (?, 1) ON CONFLICT(code) DO UPDATE SET n=n+1').run(event.code);
      this.db.exec('COMMIT');
      return Boolean(first);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  count(code) { return this.db.prepare('SELECT n FROM counts WHERE code=?').get(code)?.n ?? 0; }
  close() { this.db.close(); }
}

// HTTP-style return objects for a deterministic experiment, not an HTTP server.
function createLink(store, mode, code, url) {
  if (mode === 'sync') {
    store.createNow(code, url);
    return {status:201, location:'/s/' + code, state:'created'};
  }
  if (!['early', 'pending'].includes(mode)) throw Error('Unknown mode');
  store.enqueue(code, url);
  if (mode === 'early') return {status:201, location:'/s/' + code, state:'created'}; // Intentional bug.
  return {status:202, location:'/jobs/' + code, state:'pending'};
}
module.exports = {Shortener, Analytics, createLink};
