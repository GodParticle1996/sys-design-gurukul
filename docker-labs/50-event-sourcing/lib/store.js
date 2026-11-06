/* Asli SQLite file (node:sqlite, Node 24+). Event store, snapshots aur read model — sab ek file mein, alag tables. */
const { DatabaseSync } = require('node:sqlite');
function open(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000');            // lock mile toh 5 s tak ruko
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS events (pos INTEGER PRIMARY KEY AUTOINCREMENT, stream TEXT, version INT,
      type TEXT, schema INT, data TEXT, UNIQUE (stream, version));
    CREATE TABLE IF NOT EXISTS snapshots (stream TEXT PRIMARY KEY, version INT, state TEXT);
    CREATE TABLE IF NOT EXISTS balances (account TEXT PRIMARY KEY, balance INT, version INT);
    CREATE TABLE IF NOT EXISTS checkpoint (name TEXT PRIMARY KEY, pos INT);
    CREATE TABLE IF NOT EXISTS barrier (account TEXT, who TEXT);   -- sirf ex1 ka lab barrier`);
  return db;
}
module.exports = { open };
