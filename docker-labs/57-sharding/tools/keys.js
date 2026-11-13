'use strict';
// ex1-shard-key — ASLI: 4 shards (4 worker threads, har ek ki apni SQLite file). Wahi log events do layouts mein:
//   range → shard = mahina (Jan, Feb, Mar, Apr)      hash → shard = mix32(id) % 4
// Naapte hain: aaj (12 April) ke live writes ki raftaar, ek ghante ki range query, aur id se ek event.
const { Cluster } = require('../lib/cluster');
const { mix32 } = require('../lib/hash');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const S = 4, HISTORY = 300000, LIVE = 200000, BATCH = 2000, WINDOW = 8, ROUNDS = 3, QUERIES = 300;
const M = [Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 1), Date.UTC(2026, 2, 1), Date.UTC(2026, 3, 1), Date.UTC(2026, 4, 1)];
const HOUR = 3600e3, KINDS = ['login', 'order', 'search', 'pay', 'logout'];
const month = ts => { for (let i = 0; i < S; i++) if (ts < M[i + 1]) return i; throw new Error('ts after April'); };
const route = { range: r => month(r[1]), hash: r => mix32(r[0]) % S };
const TABLE = { range: 'er', hash: 'eh' };
const r = rng(57);
let nextId = 1;
const row = ts => [nextId++, ts, Math.floor(r() * 1e5), KINDS[Math.floor(r() * 5)], 'x'.repeat(40 + Math.floor(r() * 40))];

async function write(c, layout, rows) {                                  // router: group a batch by shard; up to WINDOW batches in flight
  const sql = `INSERT INTO ${TABLE[layout]} VALUES (?, ?, ?, ?, ?)`, flying = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const groups = Array.from({ length: S }, () => []);
    for (const x of rows.slice(i, i + BATCH)) groups[route[layout](x)].push(x);
    flying.push(Promise.all(groups.map((g, s) => g.length ? c.call(s, 'run', sql, g) : 0)));
    if (flying.length >= WINDOW) await flying.shift();
  }
  await Promise.all(flying);
  return rows.length;
}
const range = (a, b) => `${a}–${b}`;
const us = ms => (ms * 1000).toFixed(0);

(async () => {
  const c = new Cluster(S, 'keys');
  try {
    for (const t of Object.values(TABLE)) await c.each('exec', `CREATE TABLE ${t} (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, user INTEGER NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL) STRICT; CREATE INDEX ${t}_ts ON ${t}(ts); CREATE INDEX ${t}_user ON ${t}(user, ts); CREATE INDEX ${t}_kind ON ${t}(kind, ts)`);
    await c.each('exec', 'PRAGMA synchronous = OFF');                    // A–C: commit disk ka intezaar nahi karta → shard ki seema = CPU
    const span = M[3] - M[0], hist = [];
    for (let i = 0; i < HISTORY; i++) hist.push(row(M[0] + Math.floor(i * span / HISTORY)));
    for (const layout of ['range', 'hash']) await write(c, layout, hist);
    const counts = async t => (await c.each('get', `SELECT count(*) n FROM ${t}`)).map(x => x.n);
    console.log(`Itihaas: ${HISTORY.toLocaleString('en-IN')} events, 1 Jan – 31 Mar 2026 (dono layouts mein same rows)`);
    console.log(`  range: rows per shard [${(await counts('er')).join(', ')}]   (shard 3 = April, abhi khaali)`);
    console.log(`  hash:  rows per shard [${(await counts('eh')).join(', ')}]\n`);

    // A. live writes: aaj 12 April, har round 2 lakh naye events
    const tput = { range: [], hash: [] }, router = { range: [], hash: [] }, share = {};
    const cpu = () => { const u = process.threadCpuUsage(); return (u.user + u.system) / 1000; };
    const day = Date.UTC(2026, 3, 12);
    for (let k = 0; k < ROUNDS; k++) for (const layout of k % 2 ? ['hash', 'range'] : ['range', 'hash']) {
      const live = []; for (let i = 0; i < LIVE; i++) live.push(row(day + Math.floor(i * 86400e3 / LIVE)));
      const before = await counts(TABLE[layout]);
      await c.busy();
      const t0 = performance.now(), c0 = cpu(); await write(c, layout, live); const ms = performance.now() - t0;
      router[layout].push(Math.round(100 * (cpu() - c0) / ms));
      const busy = await c.busy(), after = await counts(TABLE[layout]);
      tput[layout].push(Math.round(LIVE / ms * 1000));
      share[layout] = { rows: after.map((x, i) => x - before[i]), busy: busy.map(b => Math.round(100 * b / ms)) };
    }
    console.log(`A. Live writes — 12 April, ${LIVE.toLocaleString('en-IN')} events per round, ${ROUNDS} round, router ${BATCH} ke batch bhejta hai, ${WINDOW} batch tak ek saath hawa mein`);
    console.log('   router CPU = main thread ka CPU / samay (~100% = rukawat router). shard op-samay = worker ke andar SQL + loop ka samay.');
    for (const layout of ['range', 'hash']) {
      const t = tput[layout].sort((a, b) => a - b), rc = router[layout].sort((a, b) => a - b);
      console.log(`  ${layout.padEnd(5)}  ${range(t[0].toLocaleString('en-IN'), t.at(-1).toLocaleString('en-IN')).padEnd(17)} writes/sec   router CPU ${range(rc[0], rc.at(-1))}%   aakhri round: rows per shard [${share[layout].rows.join(', ')}]   shard op-samay % [${share[layout].busy.join(', ')}]`);
    }

    // B. range query: Feb ka koi ek ghanta; C. point lookup by id
    const lat = { range: { q: [], id: [] }, hash: { q: [], id: [] } }, rowsOut = { range: 0, hash: 0 }, calls = {}, work = {};
    const sum = a => a.reduce((x, y) => x + y, 0);
    const pick = rng(7);
    const hours = Array.from({ length: QUERIES }, () => M[1] + Math.floor(pick() * 27 * 24) * HOUR);
    const ids = Array.from({ length: QUERIES }, () => 1 + Math.floor(pick() * HISTORY));
    for (const layout of ['range', 'hash']) {
      const t = TABLE[layout];
      const q = `SELECT id, ts, kind FROM ${t} WHERE ts >= ? AND ts < ?`, byId = `SELECT id, ts, kind FROM ${t} WHERE id = ?`;
      for (let warm = 0; warm < 20; warm++) await c.each('all', q, [hours[warm], hours[warm] + HOUR]);
      await c.busy();
      let n0 = c.calls;
      for (const h of hours) {
        const t0 = performance.now();
        const parts = layout === 'range' ? [await c.call(month(h), 'all', q, [h, h + HOUR])] : await c.each('all', q, [h, h + HOUR]);
        const out = parts.flat().sort((a, b) => a.ts - b.ts);
        lat[layout].q.push(performance.now() - t0); rowsOut[layout] += out.length;
      }
      calls[layout] = { q: (c.calls - n0) / QUERIES };
      work[layout] = { q: sum(await c.busy()) / QUERIES };
      n0 = c.calls;
      for (const id of ids) {
        const t0 = performance.now();
        const parts = layout === 'hash' ? [await c.call(mix32(id) % S, 'all', byId, [id])] : await c.each('all', byId, [id]);
        if (parts.flat().length !== 1) throw new Error(`id ${id} not found once`);
        lat[layout].id.push(performance.now() - t0);
      }
      calls[layout].id = (c.calls - n0) / QUERIES;
      work[layout].id = sum(await c.busy()) / QUERIES;
    }
    console.log(`\nB. Range query — "Feb ke ek ghante ke saare events", ${QUERIES} alag ghante`);
    for (const l of ['range', 'hash']) console.log(`  ${l.padEnd(5)}  shards poochhe ${calls[l].q}   rows ${(rowsOut[l] / QUERIES).toFixed(0)} per query   shards ka op-samay ${us(work[l].q).padStart(3)} µs   median ${us(percentile(lat[l].q, 50))} µs   p99 ${us(percentile(lat[l].q, 99))} µs`);
    console.log(`\nC. Ek event, event ke id se — ${QUERIES} ids`);
    for (const l of ['range', 'hash']) console.log(`  ${l.padEnd(5)}  shards poochhe ${calls[l].id}   shards ka op-samay ${us(work[l].id).padStart(3)} µs   median ${us(percentile(lat[l].id, 50))} µs   p99 ${us(percentile(lat[l].id, 99))} µs`);
    console.log('\nrange layout ko id se mahina pata nahi, isliye chaaron shards se poochta hai. hash layout ko ghante se shard pata nahi.');

    // D. durable commits (synchronous = FULL, har event ka alag commit + fsync): 1 shard vs 4 shards, sab ek hi disk par
    await c.each('exec', 'PRAGMA synchronous = FULL; CREATE TABLE d (id INTEGER PRIMARY KEY, body TEXT NOT NULL) STRICT');
    const D = 1000, rowsD = from => Array.from({ length: D }, (_, i) => [from + i, 'x'.repeat(60)]);
    const res = { 1: [], 4: [] };
    for (let k = 0; k < ROUNDS; k++) for (const n of k % 2 ? [4, 1] : [1, 4]) {
      const t0 = performance.now();
      await Promise.all(Array.from({ length: n }, (_, s) => c.call(s, 'each', 'INSERT INTO d VALUES (?, ?)', rowsD((k * 10 + n) * 1e6))));
      res[n].push(Math.round(n * D / (performance.now() - t0) * 1000));
    }
    console.log(`\nD. Durable commits (har event ka alag commit + fsync), ${D} per shard, ${ROUNDS} round, saare shards is laptop ki EK disk par`);
    for (const n of [1, 4]) { const r = res[n].sort((a, b) => a - b); console.log(`  ${n} shard${n > 1 ? 's' : ' '}  ${range(r[0].toLocaleString('en-IN'), r.at(-1).toLocaleString('en-IN'))} commits/sec kul`); }
  } finally { await c.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
