/* Asli SQLite file (node:sqlite, Node 24+). Kai processes ek hi file kholte hain. */
const { DatabaseSync } = require('node:sqlite');
function open(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000');            // pehle: lock mile toh 5 s tak ruko
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, status TEXT, seq INT);
    CREATE TABLE IF NOT EXISTS applied (n INTEGER PRIMARY KEY, id TEXT, seq INT, who TEXT);
    CREATE TABLE IF NOT EXISTS buffer (id TEXT, seq INT, status TEXT, PRIMARY KEY (id, seq));
    CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY, balance INT, version INT);
    CREATE TABLE IF NOT EXISTS charges (n INTEGER PRIMARY KEY, payment TEXT, user TEXT, amount INT);
    CREATE TABLE IF NOT EXISTS processed (key TEXT PRIMARY KEY);`);
  return db;
}
module.exports = { open };
