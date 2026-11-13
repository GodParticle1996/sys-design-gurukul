'use strict';
// One shard = one worker thread with its own SQLite file. A thread does one thing at a time, like one small server.
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(workerData.file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL');
const cache = new Map();
const prep = sql => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
function tx(fn) { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }
let busy = 0;
const ops = {
  exec: sql => { db.exec(sql); },
  all: (sql, params = []) => prep(sql).all(...params),
  get: (sql, params = []) => prep(sql).get(...params),
  // many rows, one statement, one transaction
  run: (sql, rows) => tx(() => { const s = prep(sql); let n = 0; for (const r of rows) n += Number(s.run(...r).changes); return n; }),
  // many rows, one transaction PER ROW (each commit waits for its own fsync when synchronous = FULL)
  each: (sql, rows) => { const s = prep(sql); let n = 0; for (const r of rows) n += tx(() => Number(s.run(...r).changes)); return n; },
  // ex2 votes, compact: idx[i] picks the sub-key, one vote row + counter +1 per vote, one transaction per batch
  votes: (subs, idx, users, ts) => tx(() => {
    const row = prep('INSERT INTO votes (key, user, ts) VALUES (?, ?, ?)');
    const add = prep('INSERT INTO counters VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1');
    for (let i = 0; i < idx.length; i++) { const k = subs[idx[i]]; row.run(k, users[i], ts[i]); add.run(k); }
    return idx.length;
  }),
  // several statements in one transaction: steps = [[sql, params], ...]
  steps: steps => tx(() => steps.map(([sql, params]) => Number(prep(sql).run(...params).changes))),
};
parentPort.on('message', ({ id, op, args }) => {
  if (op === 'busy') { const b = busy; busy = 0; parentPort.postMessage({ id, result: b }); return; }
  const t = performance.now();
  try { const result = ops[op](...args); busy += performance.now() - t; parentPort.postMessage({ id, result }); }
  catch (e) { busy += performance.now() - t; parentPort.postMessage({ id, error: e.message }); }
});
