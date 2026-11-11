'use strict';
// Builds the same KhanaKart data in three shapes inside one real SQLite file (node:sqlite):
//   relational — users, addresses, orders, friends (one fact in one place; ids link them)
//   document   — user_docs: one JSON per user with the address and the last 5 orders inside
//   key-value  — a JS Map "user:<id>" → JSON string (what a Redis-style store holds)
// Everything is seeded, so every run builds the same rows.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { rng } = require('./rng');

const CITIES = ['Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Jaipur'];
const DISHES = ['biryani', 'dosa', 'thali', 'pizza', 'momos', 'paneer tikka', 'idli', 'chole bhature'];

function tempDb(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `lab56-${tag}-`));
  const db = new DatabaseSync(path.join(dir, 'khanakart.db'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');
  return { db, dir, close() { db.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

// users × ordersPerUser orders, friendsPerUser friends each. indexes: false leaves orders.user_id / friends.src unindexed.
function build(db, { users, ordersPerUser = 5, friendsPerUser = 20, indexes = true, docs = true, seed = 56 }) {
  const r = rng(seed);
  db.exec(`
    CREATE TABLE addresses (id INTEGER PRIMARY KEY, line TEXT NOT NULL, pincode TEXT NOT NULL) STRICT;
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, address_id INTEGER NOT NULL REFERENCES addresses(id)) STRICT;
    CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, dish TEXT NOT NULL, amount INTEGER NOT NULL, ts INTEGER NOT NULL) STRICT;
    CREATE TABLE friends (src INTEGER NOT NULL, dst INTEGER NOT NULL) STRICT;
    CREATE TABLE user_docs (id INTEGER PRIMARY KEY, doc TEXT NOT NULL) STRICT;`);
  const insA = db.prepare('INSERT INTO addresses VALUES (?, ?, ?)'), insU = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)');
  const insO = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?)'), insF = db.prepare('INSERT INTO friends VALUES (?, ?)');
  const insD = db.prepare('INSERT INTO user_docs VALUES (?, ?)');
  const kv = new Map();
  let oid = 0;
  db.exec('BEGIN');
  for (let u = 1; u <= users; u++) {
    const city = CITIES[Math.floor(r() * CITIES.length)];
    const address = { line: `${1 + Math.floor(r() * 900)} MG Road, ${city}`, pincode: String(400000 + Math.floor(r() * 99999)) };
    insA.run(u, address.line, address.pincode);
    insU.run(u, `User ${u}`, city, u);
    const orders = [];
    for (let k = 0; k < ordersPerUser; k++) {
      const o = { id: ++oid, dish: DISHES[Math.floor(r() * DISHES.length)], amount: 100 + Math.floor(r() * 400), ts: 1700000000 + oid };
      insO.run(o.id, u, o.dish, o.amount, o.ts); orders.push(o);
    }
    for (let k = 0; k < friendsPerUser; k++) insF.run(u, 1 + Math.floor(r() * users));
    if (docs) {
      const doc = JSON.stringify({ id: u, name: `User ${u}`, city, address, orders: orders.slice(-5).reverse() });   // newest first, like Q1
      insD.run(u, doc); kv.set(`user:${u}`, doc);
    }
  }
  db.exec('COMMIT');
  if (indexes) db.exec('CREATE INDEX orders_user ON orders(user_id); CREATE INDEX friends_src ON friends(src); CREATE INDEX users_city ON users(city); CREATE INDEX orders_dish ON orders(dish);');
  db.exec('ANALYZE');
  return { kv };
}

// Q1 "user + address + last 5 orders" from the tables, assembled into the same object the document stores.
const Q1 = 'SELECT u.id, u.name, u.city, a.line, a.pincode, o.id AS oid, o.dish, o.amount, o.ts FROM users u JOIN addresses a ON a.id = u.address_id JOIN orders o ON o.user_id = u.id WHERE u.id = ? ORDER BY o.ts DESC LIMIT 5';
function assemble(rows) {
  const r = rows[0];
  return { id: r.id, name: r.name, city: r.city, address: { line: r.line, pincode: r.pincode }, orders: rows.map(x => ({ id: x.oid, dish: x.dish, amount: x.amount, ts: x.ts })) };
}

function plan(db, sql, ...args) { return db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...args).map(x => x.detail); }

module.exports = { build, tempDb, plan, Q1, assemble, CITIES, DISHES };
