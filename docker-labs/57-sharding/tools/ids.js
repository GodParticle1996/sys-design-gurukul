'use strict';
// ex3-ids — A. ASLI: 10 lakh rows, 6 tarah ki primary key, SQLite file (OS temp folder). Insert ka samay, file ka size,
// leaf pages kitne bhare. B. ASLI: Snowflake generator — duplicates, clock peeche, sequence khatam, machines ke beech order.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { snowflake, decode, uuid4, uuid7, text } = require('../lib/ids');
const { rng } = require('../lib/rng');
const N = Number(process.argv[2] || 1e6), BATCH = 10000, START = Date.UTC(2026, 3, 12), PER_MS = 10;   // 10 rows per ms = 10,000/sec
const fmt = n => n.toLocaleString('en-IN');

const LAYOUTS = [
  ['auto-increment INTEGER', 'CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)', 'INSERT INTO t (id, body) VALUES (?, ?)', () => { let i = 0; return () => ++i; }],
  ['Snowflake INTEGER', 'CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT NOT NULL)', 'INSERT INTO t (id, body) VALUES (?, ?)',
    () => { let i = 0; const g = snowflake({ machine: 1, clock: () => START + Math.floor(i++ / PER_MS) }); return g; }],
  ['UUIDv7 BLOB', 'CREATE TABLE t (id BLOB PRIMARY KEY, body TEXT NOT NULL) WITHOUT ROWID', 'INSERT INTO t (id, body) VALUES (?, ?)',
    () => { let i = 0; const r = rng(7); return () => uuid7(START + Math.floor(i++ / PER_MS), r); }],
  ['UUIDv4 BLOB', 'CREATE TABLE t (id BLOB PRIMARY KEY, body TEXT NOT NULL) WITHOUT ROWID', 'INSERT INTO t (id, body) VALUES (?, ?)', () => { const r = rng(4); return () => uuid4(r); }],
  ['UUIDv4 TEXT (36 chars)', 'CREATE TABLE t (id TEXT PRIMARY KEY, body TEXT NOT NULL) WITHOUT ROWID', 'INSERT INTO t (id, body) VALUES (?, ?)', () => { const r = rng(4); return () => text(uuid4(r)); }],
  ['UUIDv4 BLOB, rowid + index', 'CREATE TABLE t (rid INTEGER PRIMARY KEY, id BLOB NOT NULL UNIQUE, body TEXT NOT NULL)', 'INSERT INTO t (id, body) VALUES (?, ?)', () => { const r = rng(4); return () => uuid4(r); }],
];

function insert(make, ddl, sql, cacheKiB, rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab57-ids-')), file = path.join(dir, 'ids.db');
  const db = new DatabaseSync(file);
  try {
    db.exec(`PRAGMA journal_mode = WAL; PRAGMA synchronous = OFF; PRAGMA cache_size = -${cacheKiB}; ${ddl}`);
    const st = db.prepare(sql), next = make(), ids = Array.from({ length: rows.length }, next);
    const t0 = performance.now();
    for (let i = 0; i < rows.length; i += BATCH) {
      db.exec('BEGIN');
      for (let j = i; j < Math.min(rows.length, i + BATCH); j++) st.run(ids[j], rows[j]);
      db.exec('COMMIT');
    }
    const ms = performance.now() - t0;
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const leaf = db.prepare("SELECT name, count(*) pages, sum(pgsize - unused) * 100.0 / sum(pgsize) fill FROM dbstat WHERE pagetype = 'leaf' GROUP BY name ORDER BY name").all();
    const bytes = db.prepare('PRAGMA page_count').get().page_count * db.prepare('PRAGMA page_size').get().page_size;
    return { ms, bytes, leaf: leaf.filter(x => x.name !== 'sqlite_schema') };
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

function partA() {
  const r = rng(100), rows = Array.from({ length: N }, () => 'x'.repeat(80 + Math.floor(r() * 40)));
  console.log(`A. ${fmt(N)} rows (body 80–119 chars), ${fmt(BATCH)} rows per transaction, synchronous = OFF\n`);
  console.log('primary key                   cache 2 MB    cache 512 MB    file      leaf pages (kitne % bhare)');
  for (const [name, ddl, sql, make] of LAYOUTS) {
    const small = insert(make, ddl, sql, 2000, rows), big = insert(make, ddl, sql, 524288, rows);
    const leaves = small.leaf.map(l => `${l.name.startsWith('sqlite_autoindex') ? 'index' : 'table'} ${fmt(l.pages)} (${l.fill.toFixed(0)}%)`).join(' + ');
    console.log(`${name.padEnd(28)}  ${(small.ms / 1000).toFixed(2).padStart(6)} s     ${(big.ms / 1000).toFixed(2).padStart(6)} s     ${(small.bytes / 1048576).toFixed(0).padStart(4)} MB   ${leaves}`);
  }
  console.log('\n2 MB = SQLite ka default cache: B-tree RAM mein nahi samaata. 512 MB: poora B-tree RAM mein.');
  console.log('"rowid + index" = rows integer rowid ki B-tree mein aakhir mein judti hain, UUID ek alag index mein.');
  console.log('(Postgres se milta-julta sirf itna: table ka data aur primary key ka index alag. Postgres heap B-tree nahi hai.)');
  console.log(`UUIDv7: har ms ke ${PER_MS} IDs ka random hissa alag hai, toh ek ms ke andar kram random; ms ke beech badhta hai.`);
}

function partB() {
  console.log('\nB. Snowflake: 1 bit khaali | 41 bit ms (custom epoch 2020-01-01) | 10 bit machine | 12 bit sequence');
  console.log(`  41 bit ms = ${fmt(2 ** 41)} ms = ${(2 ** 41 / (1000 * 86400 * 365.2425)).toFixed(1)} saal   10 bit = ${fmt(2 ** 10)} machine ids   12 bit = ${fmt(2 ** 12)} IDs per ms per machine`);
  const id = snowflake({ machine: 37, clock: () => START })(), d = decode(id);
  console.log(`  ek ID: ${id}  →  ${new Date(d.ms).toISOString()}  machine ${d.machine}  seq ${d.seq}`);
  const dupes = arr => arr.length - new Set(arr).size;
  const fake = (start) => { let t = start; const f = () => t; f.set = x => { t = x; }; return f; };

  // 1. two machines, different ids, same clock
  const K = 200000, run = (gens, clocks) => {                             // each ms every generator makes PER_MS IDs
    const out = []; for (let i = 0; i < K; i++) { const ms = START + Math.floor(i / PER_MS); for (let g = 0; g < gens.length; g++) { clocks[g].set(ms); out.push(gens[g]()); } } return out;
  };
  let c1 = fake(START), c2 = fake(START);
  const ok = run([snowflake({ machine: 1, clock: c1 }), snowflake({ machine: 2, clock: c2 })], [c1, c2]);
  c1 = fake(START); c2 = fake(START);
  const same = run([snowflake({ machine: 1, clock: c1 }), snowflake({ machine: 1, clock: c2 })], [c1, c2]);
  console.log(`\n  1. Do machines, ${fmt(2 * K)} IDs: machine ids 1 aur 2 → duplicates ${fmt(dupes(ok))};  galti se dono ko id 1 → duplicates ${fmt(dupes(same))}`);

  // 2. clock moves back 5 ms (NTP fix) in the middle
  const back = guard => {
    let t = START, i = 0, refused = 0; const g = snowflake({ machine: 3, clock: () => t, guard }), out = [];
    for (; i < 20000; i++) { t = START + Math.floor(i / PER_MS) - (i >= 10000 ? 5 : 0); try { out.push(g()); } catch { refused++; } }
    return { d: dupes(out), refused };
  };
  const off = back(false), on = back(true);
  console.log(`  2. Clock 5 ms peeche (20,000 IDs, beech mein): guard band → duplicates ${off.d};  guard chalu (Twitter jaisa: mana karo) → duplicates ${on.d}, ${on.refused} requests mana`);

  // 3. sequence runs out: real clock, as fast as the CPU can
  const g = snowflake({ machine: 4 }), t0 = performance.now(); let n = 0;
  while (performance.now() - t0 < 500) { g(); n++; }
  const secs = (performance.now() - t0) / 1000;
  console.log(`  3. Asli clock, 0.5 s tak jitni tez ho sake: ${fmt(Math.round(n / secs))} IDs/sec; ${fmt(g.stats.waits)} baar 4096 khatam → agle ms ka intezaar (seema 40,96,000/sec)`);

  // 4. order across machines: machine B's clock is 30 ms behind
  const ca = fake(START), cb = fake(START), A = snowflake({ machine: 1, clock: ca }), B = snowflake({ machine: 2, clock: cb }), ev = [];
  for (let i = 0; i < 100000; i++) { const ms = START + Math.floor(i / PER_MS); ca.set(ms); cb.set(ms - 30); ev.push(i % 2 ? B() : A()); }
  let inv = 0, lag = 0, latest = -Infinity;
  for (let i = 1; i < ev.length; i++) if (ev[i] < ev[i - 1]) inv++;
  const order = ev.map((id, i) => [id, i]).sort((x, y) => (x[0] < y[0] ? -1 : 1));
  for (const [, i] of order) { const real = Math.floor(i / PER_MS); latest = Math.max(latest, real); lag = Math.max(lag, latest - real); }
  console.log(`  4. Machine B ki ghadi 30 ms peeche, A aur B baari baari (1 lakh events): ${fmt(inv)} jagah agla event chhota ID paata hai;`);
  console.log(`     ID ke order mein kuch events un events ke peeche aate hain jo asal mein ${lag} ms BAAD hue the`);
  console.log('     → Snowflake "lagbhag" time-order (k-sorted) hai; ek chalte generator ke andar pakka badhta hai.');

  // 5. restart: the generator forgets `last` and `seq`; same machine id, same ms
  const t5 = START + 5000, g1 = snowflake({ machine: 9, clock: () => t5 }), before = Array.from({ length: 10 }, () => g1());
  const g2 = snowflake({ machine: 9, clock: () => t5 }), after = Array.from({ length: 10 }, () => g2());   // process restarted
  console.log(`  5. Generator restart (same machine id 9, same ms): pehle 10 IDs, restart ke baad 10 → duplicates ${dupes([...before, ...after])}`);
  console.log('     → guard sirf EK chalte generator ko bachata hai. Restart par aakhri ms yaad rakho (disk par) ya us ms ke guzarne tak ruko.');
}

module.exports = { partA, partB };
if (require.main === module) { if (process.argv[3] !== 'b') partA(); partB(); }
