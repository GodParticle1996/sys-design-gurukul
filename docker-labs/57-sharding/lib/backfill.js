'use strict';
// ex5 core: move `profiles` from one old DB into 4 new shards while live traffic keeps coming.
// The app dual-writes (old first, then new, best effort). A backfill worker copies old rows in chunks of ids.
// Between READING a chunk from old and WRITING it to new, live updates and deletes happen — that gap is the race.
// Everything runs in one thread in a seeded order, so every run prints the same counts.
const { DatabaseSync } = require('node:sqlite');
const { mix32 } = require('./hash');
const { rng } = require('./rng');
const S = 4;
const MODES = ['overwrite', 'if-absent', 'version', 'version+tombstone'];

// how the backfill writes one stale row into new
const BACKFILL = {
  'overwrite': 'INSERT OR REPLACE INTO profiles (id, name, version, deleted) VALUES (?, ?, ?, 0)',
  'if-absent': 'INSERT OR IGNORE INTO profiles (id, name, version, deleted) VALUES (?, ?, ?, 0)',
  'version': 'INSERT INTO profiles (id, name, version, deleted) VALUES (?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version WHERE excluded.version > profiles.version',
  'version+tombstone': 'INSERT INTO profiles (id, name, version, deleted) VALUES (?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version, deleted = 0 WHERE excluded.version > profiles.version',
};
// how the app's dual write of an update / delete lands in new
const UPSERT = 'INSERT INTO profiles (id, name, version, deleted) VALUES (?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version, deleted = 0 WHERE excluded.version > profiles.version';
const HARD_DELETE = 'DELETE FROM profiles WHERE id = ?';
const TOMBSTONE = "INSERT INTO profiles (id, name, version, deleted) VALUES (?, '', ?, 1) ON CONFLICT(id) DO UPDATE SET name = '', version = excluded.version, deleted = 1 WHERE excluded.version > profiles.version";

// repair (traffic stopped, the old DB is the truth): version rules also take an EQUAL version, so a same-version row with
// wrong data is fixed too. overwrite and if-absent keep their own rule (if-absent cannot fix a row that is present).
const REPAIR = {
  'overwrite': BACKFILL['overwrite'],
  'if-absent': BACKFILL['if-absent'],
  'version': BACKFILL['version'].replace('excluded.version > profiles.version', 'excluded.version >= profiles.version'),
  'version+tombstone': BACKFILL['version+tombstone'].replace('excluded.version > profiles.version', 'excluded.version >= profiles.version'),
};

// sample check: `ids` = rows from the OLD DB [{id, version, name}], `lookup(id)` = the new copy or undefined.
// Draws with replacement; returns how many draws found a wrong row. A row that exists only in new can never be drawn.
function sampleCheck(ids, lookup, sample, seed) {
  const s = rng(seed); let bad = 0;
  for (let i = 0; i < sample; i++) {
    const x = ids[Math.floor(s() * ids.length)], n = lookup(x.id);
    if (!n || n.deleted || n.version !== x.version || n.name !== x.name) bad++;
  }
  return bad;
}
// chance that `sample` draws with replacement from `total` rows, `bad` of them wrong, find none
const chanceNone = (bad, total, sample) => Math.pow(1 - bad / total, sample);

function run({ mode, rows = 20000, chunk = 500, gapOps = 150, failRate = 0.01, sample = 1000, seed = 57, corruptEvery = 0 }) {
  if (!BACKFILL[mode]) throw new Error(`mode: ${MODES.join(' | ')}`);
  const r = rng(seed);
  const old = new DatabaseSync(':memory:');
  old.exec('CREATE TABLE profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL) STRICT');
  const shards = Array.from({ length: S }, () => {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL, deleted INTEGER NOT NULL) STRICT');
    return db;
  });
  const on = id => shards[mix32(id) % S];
  const ins = old.prepare('INSERT INTO profiles VALUES (?, ?, ?)');
  old.exec('BEGIN'); for (let id = 1; id <= rows; id++) ins.run(id, `name${id}-v1`, 1); old.exec('COMMIT');
  const alive = Array.from({ length: rows }, (_, i) => i + 1);          // ids alive in old (for picking live ops)
  const versionOf = new Map();                                           // last version ever used per id (deletes bump it too)
  let nextId = rows + 1;
  const stat = { updates: 0, deletes: 0, inserts: 0, dualFailed: 0 };

  const dual = (sql, params, id) => {                                    // best effort: a failure is logged and skipped
    if (r() < failRate) { stat.dualFailed++; return; }
    on(id).prepare(sql).run(...params);
  };
  function liveOp() {
    const p = r();
    if (p < 0.1) {                                                        // insert a new profile
      const id = nextId++; ins.run(id, `name${id}-v1`, 1); alive.push(id); versionOf.set(id, 1); stat.inserts++;
      dual(UPSERT, [id, `name${id}-v1`, 1], id); return;
    }
    const k = Math.floor(r() * alive.length), id = alive[k];
    const v = (versionOf.get(id) || 1) + 1; versionOf.set(id, v);
    if (p < 0.8) {                                                        // update
      old.prepare('UPDATE profiles SET name = ?, version = ? WHERE id = ?').run(`name${id}-v${v}`, v, id); stat.updates++;
      dual(UPSERT, [id, `name${id}-v${v}`, v], id);
    } else {                                                              // delete
      old.prepare('DELETE FROM profiles WHERE id = ?').run(id); alive[k] = alive.at(-1); alive.pop(); stat.deletes++;
      if (mode === 'version+tombstone') dual(TOMBSTONE, [id, v], id); else dual(HARD_DELETE, [id], id);
    }
  }
  // corruptEvery (tests only): the backfill writes a wrong name into every k-th copied row, version unchanged
  let copied = 0;
  const copy = (rowsRead, sql = BACKFILL[mode], corrupt = corruptEvery) => { for (const x of rowsRead) {
    const bad = corrupt && ++copied % corrupt === 0;
    on(x.id).prepare(sql).run(x.id, bad ? 'CORRUPTED' : x.name, x.version);
  } };

  // backfill while traffic runs: read a chunk → live ops happen → write the (now stale) chunk
  const readChunk = from => old.prepare('SELECT id, name, version FROM profiles WHERE id >= ? AND id < ? ORDER BY id').all(from, from + chunk);
  const maxId = rows;
  for (let from = 1; from <= maxId; from += chunk) {
    const got = readChunk(from);
    for (let i = 0; i < gapOps; i++) liveOp();
    copy(got);
  }

  function compare() {
    const res = { missing: 0, stale: 0, resurrected: 0 };
    const oldRows = new Map(old.prepare('SELECT id, version, name FROM profiles').all().map(x => [x.id, x]));
    for (const [id, o] of oldRows) {                                    // the whole row: version AND data
      const n = on(id).prepare('SELECT version, name, deleted FROM profiles WHERE id = ?').get(id);
      if (!n || n.deleted) res.missing++; else if (n.version !== o.version || n.name !== o.name) res.stale++;
    }
    for (const db of shards) for (const n of db.prepare('SELECT id FROM profiles WHERE deleted = 0').all()) if (!oldRows.has(n.id)) res.resurrected++;
    return res;
  }
  const lookupNew = id => on(id).prepare('SELECT version, name, deleted FROM profiles WHERE id = ?').get(id);
  const oldIds = old.prepare('SELECT id, version, name FROM profiles').all();
  const after = compare(), sampled = sampleCheck(oldIds, lookupNew, sample, seed + 1), oldCount = oldIds.length;
  // repair, traffic stopped: 1) run the backfill once more  2) reverse sweep: new rows that old does not have
  copy(old.prepare('SELECT id, name, version FROM profiles ORDER BY id').all(), REPAIR[mode], 0);
  const rerun = compare();
  const has = old.prepare('SELECT 1 FROM profiles WHERE id = ?');
  for (const db of shards) for (const n of db.prepare('SELECT id FROM profiles WHERE deleted = 0').all()) if (!has.get(n.id)) db.prepare('DELETE FROM profiles WHERE id = ?').run(n.id);
  const swept = compare();
  old.close(); for (const db of shards) db.close();
  return { mode, stat, after, sampled, sample, oldCount, rerun, swept };
}
module.exports = { run, MODES, sampleCheck, chanceNone };
