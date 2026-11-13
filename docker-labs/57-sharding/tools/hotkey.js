'use strict';
// ex2-hot-key — ASLI: 8 shards (worker threads + SQLite), ek viral vote "candidate:A". Har vote = ek vote row + counter +1.
// Key ko k sub-keys mein todte hain (candidate:A#0 … #k-1); ring (150 vnodes per shard) har sub-key ka shard chunta hai.
const { Cluster } = require('../lib/cluster');
const { ring } = require('../lib/ring');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const S = 8, VOTES = 300000, BATCH = 4000, WINDOW = 8, ROUNDS = 3, READS = 300, SPLITS = [1, 10, 40];
const route = ring(S);
const us = ms => (ms * 1000).toFixed(0);
const sum = a => a.reduce((x, y) => x + y, 0);
const fmt = n => n.toLocaleString('en-IN');

(async () => {
  const c = new Cluster(S, 'hot');
  try {
    await c.each('exec', 'PRAGMA synchronous = OFF; CREATE TABLE counters (key TEXT PRIMARY KEY, n INTEGER NOT NULL) STRICT; CREATE TABLE votes (id INTEGER PRIMARY KEY, key TEXT NOT NULL, user INTEGER NOT NULL, ts INTEGER NOT NULL) STRICT');
    const r = rng(57), out = {};
    const cpu = () => { const u = process.threadCpuUsage(); return (u.user + u.system) / 1000; };   // router (main thread) CPU ms
    for (const k of SPLITS) {
      const subs = Array.from({ length: k }, (_, i) => `k${k}:candidate:A#${i}`), home = subs.map(route);   // same keys every round
      out[k] = { subs, home, tput: [], router: [], busy: null, hit: new Set(home).size };
    }
    // A. writes
    for (let round = 0; round < ROUNDS; round++) for (const k of round % 2 ? [...SPLITS].reverse() : SPLITS) {
      const { subs, home } = out[k];
      await c.each('exec', `DELETE FROM counters WHERE key LIKE 'k${k}:%'; DELETE FROM votes WHERE key LIKE 'k${k}:%'`);   // untimed reset
      const batches = [];                                                 // votes made before the clock starts: many app servers send them
      for (let v = 0; v < VOTES; v += BATCH) {
        const per = Array.from({ length: S }, () => ({ idx: [], users: [], ts: [] }));
        for (let j = v; j < Math.min(VOTES, v + BATCH); j++) {
          const i = Math.floor(r() * k), g = per[home[i]];                 // random sub-key: the client picks one of k
          g.idx.push(i); g.users.push(Math.floor(r() * 1e7)); g.ts.push(j);
        }
        batches.push(per.map(g => g.idx.length ? [Uint16Array.from(g.idx), Int32Array.from(g.users), Int32Array.from(g.ts)] : null));
      }
      await c.busy();
      const t0 = performance.now(), c0 = cpu(), flying = [];
      for (const groups of batches) {                                     // up to WINDOW batches in flight
        flying.push(Promise.all(groups.map((g, s) => g ? c.call(s, 'votes', subs, ...g) : 0)));
        if (flying.length >= WINDOW) await flying.shift();
      }
      await Promise.all(flying);
      const ms = performance.now() - t0, routerMs = cpu() - c0, busy = await c.busy();
      out[k].tput.push(Math.round(VOTES / ms * 1000));
      out[k].router.push(Math.round(100 * routerMs / ms));
      out[k].busy = busy.map(b => Math.round(100 * b / ms));
    }
    console.log(`A. Writes — ${fmt(VOTES)} votes per round, ${ROUNDS} round, ${S} shards, ${BATCH} votes ke batch, ${WINDOW} batch tak ek saath hawa mein`);
    console.log('split   shards jinhe sub-keys mili   sabse bhara shard   writes/sec            router CPU %   shard op-samay % (aakhri round)');
    for (const k of SPLITS) {
      const o = out[k], counts = Array(S).fill(0); for (const h of o.home) counts[h]++;
      const t = [...o.tput].sort((a, b) => a - b), rc = [...o.router].sort((a, b) => a - b);
      console.log(`${String(k).padStart(5)}   ${String(o.hit).padStart(2)} / ${S}                       ${String(Math.max(...counts)).padStart(2)} sub-keys (${(100 * Math.max(...counts) / k).toFixed(0).padStart(3)}%)    ${(fmt(t[0]) + '–' + fmt(t.at(-1))).padEnd(20)}  ${(rc[0] === rc.at(-1) ? String(rc[0]) : rc[0] + '–' + rc.at(-1)).padEnd(12)}   [${o.busy.join(', ')}]`);
    }
    console.log('router CPU % = main thread ka CPU / samay. ~100% ho toh rukawat router hai, shard nahi.');
    console.log('shard op-samay % = worker ke andar op (SQL + loop) ka samay / kul samay; message kholna-bandh karna shaamil nahi.');

    // B. reading the total: k counters → one number
    console.log(`\nB. Total padhna — ${READS} baar, har baar saare sub-keys ka jod (aakhri round ke counters)`);
    console.log('split   tareeka                          shard calls   shards ka op-samay   median     p99      total sahi?');
    for (const k of SPLITS) {
      const { subs, home } = out[k];
      const one = 'SELECT n FROM counters WHERE key = ?';
      const byShard = new Map(); subs.forEach((s, i) => { if (!byShard.has(home[i])) byShard.set(home[i], []); byShard.get(home[i]).push(s); });
      const ways = {
        'ek ek karke (serial)': async () => { let t = 0; for (let i = 0; i < k; i++) t += (await c.call(home[i], 'get', one, [subs[i]])).n; return t; },
        'sab ek saath (parallel)': async () => sum((await Promise.all(subs.map((s, i) => c.call(home[i], 'get', one, [s])))).map(x => x.n)),
        'shard-wise ek call (parallel)': async () => sum((await Promise.all([...byShard].map(([sh, keys]) =>
          c.call(sh, 'get', `SELECT sum(n) n FROM counters WHERE key IN (${keys.map(() => '?').join(', ')})`, keys)))).map(x => x.n)),
      };
      for (const [name, fn] of Object.entries(ways)) {
        if (k === 1 && name !== 'ek ek karke (serial)') continue;
        for (let w = 0; w < 20; w++) await fn();
        await c.busy(); const n0 = c.calls, lat = []; let ok = true;
        for (let q = 0; q < READS; q++) { const t0 = performance.now(); const t = await fn(); lat.push(performance.now() - t0); if (t !== VOTES) ok = false; }
        const work = sum(await c.busy()) / READS;
        console.log(`${String(k).padStart(5)}   ${(k === 1 ? 'ek key, ek call' : name).padEnd(31)}  ${String((c.calls - n0) / READS).padStart(5)}         ${us(work).padStart(5)} µs          ${us(percentile(lat, 50)).padStart(5)} µs  ${us(percentile(lat, 99)).padStart(5)} µs   ${ok ? `haan (${fmt(VOTES)})` : 'NAHI'}`);
      }
    }
  } finally { await c.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
