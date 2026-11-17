'use strict';
const { DatabaseSync } = require('node:sqlite');
const { buildSchema, graphql } = require('graphql');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const schema = buildSchema(readFileSync(join(__dirname, 'schema.graphql'), 'utf8'));

// A deliberately small batch queue for this lab, not a replacement for DataLoader.
// Each API execution owns a new queue. Results must be returned by key, not SQL row order.
function batchAuthors(select) {
  let pending = [];
  return id => new Promise((resolve, reject) => {
    pending.push({ id: String(id), resolve, reject });
    if (pending.length !== 1) return;
    queueMicrotask(() => {
      const group = pending; pending = [];
      const ids = [...new Set(group.map(x => x.id))];
      try {
        const rows = select(`SELECT id, name, email FROM authors WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC`, ...ids);
        const byId = new Map(rows.map(row => [String(row.id), row]));
        group.forEach(x => x.resolve(byId.get(x.id) || null));
      } catch (error) { group.forEach(x => x.reject(error)); }
    });
  });
}

function createLab() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE authors(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL);
    CREATE TABLE posts(id INTEGER PRIMARY KEY, title TEXT NOT NULL, author_id INTEGER NOT NULL);
    INSERT INTO authors VALUES(1, 'Asha', 'asha@example.test'), (2, 'Bilal', 'bilal@example.test');
    INSERT INTO posts VALUES(1, 'Queues', 2), (2, 'Caches', 1), (3, 'Retries', 2);
  `);
  async function execute(source, { batched = false, viewerId = '1' } = {}) {
    const statements = [];
    const select = (sql, ...args) => { statements.push({ sql, args }); return db.prepare(sql).all(...args); };
    const load = batched ? batchAuthors(select) : async id => select('SELECT id, name, email FROM authors WHERE id = ?', id)[0] || null;
    const authorView = row => row && ({
      id: row.id, name: row.name,
      email(_args, context) {
        // Example field policy. Production policy normally lives in the domain layer.
        if (context.viewerId !== String(row.id)) throw new Error('Forbidden email');
        return row.email;
      }
    });
    const rootValue = {
      posts({ first }) {
        if (!Number.isInteger(first) || first < 1 || first > 3) throw new Error('first must be 1..3 in this lab');
        return select('SELECT id, title, author_id FROM posts ORDER BY id LIMIT ?', first).map(row => ({
          id: row.id, title: row.title,
          author: async () => authorView(await load(row.author_id))
        }));
      },
      author: async ({ id }) => authorView(await load(id))
    };
    // viewerId is already-verified context for the local experiment, not a trusted HTTP header.
    const result = await graphql({ schema, source, rootValue, contextValue: { viewerId: String(viewerId) } });
    return { result, statements };
  }
  function restTitleView() {
    // Same selected representation could be served by GET /posts?fields=title.
    // This function runs the handler's query/projection without opening an HTTP socket.
    return db.prepare('SELECT title FROM posts ORDER BY id LIMIT 3').all().map(row => ({ title: row.title }));
  }
  return { execute, restTitleView, close: () => db.close() };
}

module.exports = { createLab };
