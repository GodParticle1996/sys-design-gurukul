'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DatabaseSync } = require('node:sqlite');
const { h32 } = require('../lib/hash');
const { ring } = require('../lib/ring');
const { snowflake, decode, uuid4, uuid7, EPOCH, MAX_MS } = require('../lib/ids');
const { rng } = require('../lib/rng');
const { run, sampleCheck, chanceNone } = require('../lib/backfill');
const { Cluster } = require('../lib/cluster');

test('hash % N: over one full period of N(N+1) hash values, adding a shard moves exactly N/(N+1), removing one moves (N-1)/N', () => {
  for (const n of [4, 5, 9]) {
    let add = 0, rem = 0; const period = n * (n + 1), period2 = n * (n - 1);
    for (let h = 0; h < period; h++) if (h % n !== h % (n + 1)) add++;
    for (let h = 0; h < period2; h++) if (h % n !== h % (n - 1)) rem++;
    assert.strictEqual(add / period, n / (n + 1));
    assert.strictEqual(rem / period2, (n - 1) / n);
  }
});

test('ring: adding a shard moves keys only TO the new shard; removing one moves only that shard\'s keys', () => {
  const a = ring(5), b = ring(6), c = ring(4);                          // shard ids 0–4, then 0–5, then 0–3
  let movedAdd = 0, movedRem = 0;
  for (let i = 0; i < 50000; i++) {
    const h = h32(`user:${i}`);
    if (a.at(h) !== b.at(h)) { movedAdd++; assert.strictEqual(b.at(h), 5, `key ${i} moved between old shards`); }
    if (a.at(h) !== c.at(h)) { movedRem++; assert.strictEqual(a.at(h), 4, `key ${i} moved although its shard stayed`); }
    assert.ok(a.at(h) >= 0 && a.at(h) < 5);
  }
  assert.ok(movedAdd > 5000 && movedAdd < 12000, `${movedAdd}`);         // about 1/6 of 50,000
  assert.ok(movedRem > 6000 && movedRem < 14000, `${movedRem}`);         // about 1/5
  assert.strictEqual(a.at(0xffffffff), a.at(0), 'a hash past the last point wraps to the first point');
});

test('snowflake: layout, increasing IDs, clock guard, sequence overflow, machine id range', () => {
  let t = Date.UTC(2026, 3, 12);
  const g = snowflake({ machine: 37, clock: () => t });
  const a = g(), b = g();
  assert.strictEqual(a, (BigInt(t - EPOCH) << 22n) | (37n << 12n));
  assert.deepStrictEqual(decode(b), { ms: t, machine: 37, seq: 1 });
  assert.ok(b > a);
  t -= 3; assert.throws(() => g(), /clock moved backwards/);           // guard on: refuse
  t += 3;
  const loose = snowflake({ machine: 1, clock: () => t, guard: false }), seen = new Set();
  for (let i = 0; i < 5; i++) seen.add(loose());
  t -= 1; loose(); t += 1; const again = loose();                       // went back one ms, then the same ms again
  assert.ok(seen.has(again), 'guard off: the clock going back repeats an ID');
  let calls = 0, ms = Date.UTC(2026, 3, 13);
  const fast = snowflake({ machine: 2, clock: () => (++calls > 4097 ? ms + 1 : ms) });   // clock moves only after 4096 IDs
  const ids = Array.from({ length: 4097 }, () => fast());
  assert.strictEqual(new Set(ids).size, 4097);
  assert.strictEqual(fast.stats.waits, 1);
  assert.deepStrictEqual(decode(ids.at(-1)), { ms: ms + 1, machine: 2, seq: 0 });
  assert.throws(() => snowflake({ machine: 1024 }), RangeError);
  // 41-bit window: the epoch and the last valid ms work, their outside neighbours throw
  assert.strictEqual(snowflake({ machine: 1, clock: () => EPOCH })(), 1n << 12n);
  assert.ok(snowflake({ machine: 1, clock: () => EPOCH + MAX_MS - 1 })() < 2n ** 63n);
  assert.throws(() => snowflake({ machine: 1, clock: () => EPOCH - 1 })(), RangeError);
  assert.throws(() => snowflake({ machine: 1, clock: () => EPOCH + MAX_MS })(), RangeError);
  // a rejected time changes nothing: the next good call continues after the last good ID
  let tt = EPOCH + 1000; const keep = snowflake({ machine: 9, clock: () => tt });
  const good = [keep(), keep(), keep()];
  tt = EPOCH + MAX_MS; assert.throws(() => keep(), RangeError);
  tt = EPOCH + 1000; assert.strictEqual(keep(), good[2] + 1n);
  // the guard protects one running generator only: a restart with the same id in the same ms repeats IDs
  const at = Date.UTC(2026, 3, 14), first = snowflake({ machine: 9, clock: () => at })();
  assert.strictEqual(snowflake({ machine: 9, clock: () => at })(), first, 'restart forgets last/seq');
});

test('UUIDv7 starts with the 48-bit ms timestamp; v4 and v7 carry their version and variant bits', () => {
  const r = rng(1), ms = Date.UTC(2026, 3, 12, 10, 30);
  const v7 = uuid7(ms, r), v4 = uuid4(r);
  assert.strictEqual(Buffer.from(v7.subarray(0, 6)).readUIntBE(0, 6), ms);
  assert.strictEqual(v7[6] >> 4, 7); assert.strictEqual(v4[6] >> 4, 4);
  assert.strictEqual(v7[8] >> 6, 2); assert.strictEqual(v4[8] >> 6, 2);
  const later = uuid7(ms + 1, r);
  assert.ok(Buffer.compare(Buffer.from(later), Buffer.from(v7)) > 0, 'a later ms sorts after');
  const same = Array.from({ length: 200 }, () => Buffer.from(uuid7(ms + 5, r)));   // same ms: the random tail decides the order
  let down = 0; for (let i = 1; i < same.length; i++) if (Buffer.compare(same[i], same[i - 1]) < 0) down++;
  assert.ok(down > 50, `same-ms UUIDv7 values are not increasing (${down} decreases)`);
});

test('backfill race: overwrite brings back old versions and deleted rows; version + tombstone does not; repair + sweep fix the rest', () => {
  const o = run({ mode: 'overwrite', failRate: 0, rows: 5000, chunk: 250 });
  assert.ok(o.after.stale > 0 && o.after.resurrected > 0, JSON.stringify(o.after));
  const v = run({ mode: 'version', failRate: 0, rows: 5000, chunk: 250 });
  assert.strictEqual(v.after.stale, 0); assert.ok(v.after.resurrected > 0, 'a delete before the copy: version alone cannot reject it');
  const t = run({ mode: 'version+tombstone', failRate: 0, rows: 5000, chunk: 250 });
  assert.deepStrictEqual(t.after, { missing: 0, stale: 0, resurrected: 0 });
  const f = run({ mode: 'version+tombstone', failRate: 0.02, rows: 5000, chunk: 250 });
  assert.ok(f.stat.dualFailed > 0 && f.after.missing + f.after.stale > 0, 'failed dual writes leave holes');
  assert.deepStrictEqual(f.swept, { missing: 0, stale: 0, resurrected: 0 });
  const i = run({ mode: 'if-absent', failRate: 0.02, rows: 5000, chunk: 250 });
  assert.ok(i.swept.stale > 0, 'insert-if-absent cannot repair a row that is present but old');
  // same version, wrong data: the compare checks the name too, and the repair (old DB wins) fixes it
  const c = run({ mode: 'version+tombstone', failRate: 0, rows: 5000, chunk: 250, corruptEvery: 7 });
  assert.ok(c.after.stale > 0 && c.sampled > 0, `wrong names found: ${JSON.stringify(c.after)} sample ${c.sampled}`);
  assert.deepStrictEqual(c.swept, { missing: 0, stale: 0, resurrected: 0 });
  assert.deepStrictEqual(run({ mode: 'version', failRate: 0, rows: 5000, chunk: 250, corruptEvery: 7 }).swept, { missing: 0, stale: 0, resurrected: 0 });
});

test('sample check: finds every draw when all rows are wrong, none when all are right, and is blind to rows only in new', () => {
  const ids = Array.from({ length: 50 }, (_, i) => ({ id: i, version: 2, name: `n${i}` }));
  assert.strictEqual(sampleCheck(ids, id => ({ version: 1, name: `n${id}`, deleted: 0 }), 100, 1), 100);
  assert.strictEqual(sampleCheck(ids, id => ({ version: 2, name: `n${id}`, deleted: 0 }), 100, 1), 0);
  assert.strictEqual(sampleCheck(ids, id => ({ version: 2, name: 'x', deleted: 0 }), 10, 1), 10, 'same version, wrong data');
  const extraInNew = new Map(ids.map(x => [x.id, { ...x, deleted: 0 }])); extraInNew.set(999, { version: 1, name: 'ghost', deleted: 0 });
  assert.strictEqual(sampleCheck(ids, id => extraInNew.get(id), 1000, 1), 0, 'a row only in new is never drawn');
  // chance of no hits, with replacement: 4 rows, 1 wrong, 2 draws → count the 16 ordered pairs by hand
  let none = 0; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== 0 && b !== 0) none++;
  assert.strictEqual(chanceNone(1, 4, 2), none / 16);
  assert.ok(Math.abs(chanceNone(27, 19391, 1000) - 0.2482376258) < 1e-9);
});

test('cluster: one shard runs several statements in one transaction; an error rolls all of them back', async () => {
  const c = new Cluster(2, 'test');
  try {
    await c.each('exec', 'CREATE TABLE w (id INTEGER PRIMARY KEY, paise INTEGER NOT NULL) STRICT; INSERT INTO w VALUES (1, 100), (2, 100)');
    await c.call(0, 'steps', [['UPDATE w SET paise = paise - 10 WHERE id = 1', []], ['UPDATE w SET paise = paise + 10 WHERE id = 2', []]]);
    await assert.rejects(c.call(0, 'steps', [['UPDATE w SET paise = paise - 10 WHERE id = 1', []], ['INSERT INTO w VALUES (1, 0)', []]]), /UNIQUE/);
    assert.deepStrictEqual((await c.call(0, 'all', 'SELECT paise FROM w ORDER BY id')).map(x => x.paise), [90, 110]);
    assert.deepStrictEqual((await c.call(1, 'all', 'SELECT paise FROM w ORDER BY id')).map(x => x.paise), [100, 100]);
    assert.strictEqual(await c.call(1, 'run', 'INSERT INTO w VALUES (?, ?)', [[3, 1], [4, 1]]), 2);
  } finally { await c.close(); }
});

test('split counter: the sub-key counts add up to every vote', async () => {
  const c = new Cluster(3, 'test');
  try {
    await c.each('exec', 'CREATE TABLE counters (key TEXT PRIMARY KEY, n INTEGER NOT NULL) STRICT');
    const route = ring(3), r = rng(3), k = 10, subs = Array.from({ length: k }, (_, i) => `A#${i}`), groups = [[], [], []];
    for (let v = 0; v < 5000; v++) { const s = subs[Math.floor(r() * k)]; groups[route(s)].push([s]); }
    await Promise.all(groups.map((g, i) => g.length ? c.call(i, 'run', 'INSERT INTO counters VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1', g) : 0));
    const parts = await Promise.all(subs.map(s => c.call(route(s), 'get', 'SELECT n FROM counters WHERE key = ?', [s])));
    assert.strictEqual(parts.reduce((t, x) => t + (x ? x.n : 0), 0), 5000);
  } finally { await c.close(); }
});

test('B-tree pages (SQLite): increasing integer keys fill leaf pages ~full; UUID keys in a WITHOUT ROWID table do not, increasing or random', () => {
  const fill = (ddl, make) => {
    const db = new DatabaseSync(':memory:');
    db.exec(ddl);
    const st = db.prepare('INSERT INTO t VALUES (?, ?)'), r = rng(5);
    db.exec('BEGIN'); for (let i = 0; i < 30000; i++) st.run(make(i, r), 'x'.repeat(100)); db.exec('COMMIT');
    return db.prepare("SELECT sum(pgsize - unused) * 1.0 / sum(pgsize) f FROM dbstat WHERE name = 't' AND pagetype = 'leaf'").get().f;
  };
  const blob = 'CREATE TABLE t (id BLOB PRIMARY KEY, body TEXT NOT NULL) WITHOUT ROWID';
  const int = fill('CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)', i => i + 1);
  const v7 = fill(blob, (i, r) => uuid7(Date.UTC(2026, 3, 12) + i, r)), v4 = fill(blob, (i, r) => uuid4(r));
  assert.ok(int > 0.97, `integer fill ${int}`);                         // SQLite's append fast path for rowid tables
  for (const [name, f] of [['v7', v7], ['v4', v4]]) assert.ok(f > 0.8 && f < 0.93, `${name} fill ${f}`);
});
