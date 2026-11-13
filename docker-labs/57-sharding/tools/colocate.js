'use strict';
// ex4-colocate — ASLI: 4 shards (worker threads + SQLite). 1 lakh users, har user ke 5 orders, har user ka wallet.
//   layout A: orders user ke shard par (shard = mix32(user_id) % 4) → user + orders ek hi shard par
//   layout B: orders apne order id se (shard = mix32(order_id) % 4) → ek user ke orders chaaron shards par bikhre
const { Cluster } = require('../lib/cluster');
const { mix32 } = require('../lib/hash');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const S = 4, USERS = 100000, PER = 5, QUERIES = 500, TRANSFERS = 2000, CRASH = 0.02, START_PAISE = 10000;
const CITIES = ['Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai'], DISHES = ['biryani', 'dosa', 'thali', 'pizza', 'momos'];
const shardOf = id => mix32(id) % S;
const us = ms => (ms * 1000).toFixed(0), fmt = n => n.toLocaleString('en-IN');
const sum = a => a.reduce((x, y) => x + y, 0);

async function sendGrouped(c, sql, rows, keyOf) {
  const g = Array.from({ length: S }, () => []);
  for (const r of rows) g[keyOf(r)].push(r);
  await Promise.all(g.map((x, s) => x.length ? c.call(s, 'run', sql, x) : 0));
}

(async () => {
  const c = new Cluster(S, 'colo');
  try {
    await c.each('exec', `PRAGMA synchronous = OFF;
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL) STRICT;
      CREATE TABLE orders_a (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, dish TEXT NOT NULL, paise INTEGER NOT NULL) STRICT;
      CREATE TABLE orders_b (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, dish TEXT NOT NULL, paise INTEGER NOT NULL) STRICT;
      CREATE INDEX orders_a_user ON orders_a(user_id); CREATE INDEX orders_b_user ON orders_b(user_id);
      CREATE TABLE wallets (user_id INTEGER PRIMARY KEY, paise INTEGER NOT NULL CHECK (paise >= 0)) STRICT`);
    const r = rng(57), users = [], orders = [];
    for (let id = 1; id <= USERS; id++) {
      users.push([id, `user${id}`, CITIES[Math.floor(r() * 5)]]);
      for (let k = 0; k < PER; k++) orders.push([orders.length + 1, id, DISHES[Math.floor(r() * 5)], 10000 + Math.floor(r() * 40000)]);
    }
    await sendGrouped(c, 'INSERT INTO users VALUES (?, ?, ?)', users, u => shardOf(u[0]));
    await sendGrouped(c, 'INSERT INTO orders_a VALUES (?, ?, ?, ?)', orders, o => shardOf(o[1]));
    await sendGrouped(c, 'INSERT INTO orders_b VALUES (?, ?, ?, ?)', orders, o => shardOf(o[0]));
    await sendGrouped(c, 'INSERT INTO wallets VALUES (?, ?)', users.map(u => [u[0], START_PAISE]), w => shardOf(w[0]));
    console.log(`${fmt(USERS)} users, ${fmt(orders.length)} orders, ${S} shards. Users hamesha mix32(user_id) % 4 par.\n`);

    // Q1: one user's profile + orders
    const pick = rng(9), ids = Array.from({ length: QUERIES }, () => 1 + Math.floor(pick() * USERS));
    const q1 = {
      A: async id => c.call(shardOf(id), 'all', 'SELECT u.name, u.city, o.id, o.dish, o.paise FROM users u JOIN orders_a o ON o.user_id = u.id WHERE u.id = ? ORDER BY o.id', [id]),
      B: async id => {
        const [u, ...parts] = await Promise.all([c.call(shardOf(id), 'get', 'SELECT name, city FROM users WHERE id = ?', [id]),
          ...Array.from({ length: S }, (_, s) => c.call(s, 'all', 'SELECT id, dish, paise FROM orders_b WHERE user_id = ?', [id]))]);
        return parts.flat().sort((x, y) => x.id - y.id).map(o => ({ name: u.name, city: u.city, ...o }));   // the join, in the app
      },
    };
    console.log(`Q1. Ek user + user ke ${PER} orders, ${QUERIES} users`);
    for (const L of ['A', 'B']) {
      for (const id of ids.slice(0, 20)) await q1[L](id);
      await c.busy(); const n0 = c.calls, lat = [];
      for (const id of ids) { const t0 = performance.now(); const rows = await q1[L](id); lat.push(performance.now() - t0); if (rows.length !== PER) throw new Error(`user ${id}: ${rows.length} orders`); }
      const work = sum(await c.busy()) / QUERIES;
      console.log(`  layout ${L}  shard calls ${(c.calls - n0) / QUERIES}   join ${L === 'A' ? 'shard ke andar (SQL)' : 'app mein (JS)       '}   shards ka op-samay ${us(work).padStart(3)} µs   median ${us(percentile(lat, 50))} µs   p99 ${us(percentile(lat, 99))} µs`);
    }
    const same = JSON.stringify((await q1.A(777)).map(x => ({ ...x }))) === JSON.stringify(await q1.B(777));
    console.log(`  user 777: dono layouts ka jawab ek jaisa? ${same ? 'haan' : 'NAHI'}`);

    // Q2: no shard key — Pune users' biryani orders
    console.log('\nQ2. "Pune ke users ke kitne biryani orders?" — shard key sawaal mein nahi, dono layouts chaaron shards se poochte hain');
    await c.busy(); let n0 = c.calls, t0 = performance.now();
    const a = sum((await c.each('get', "SELECT count(*) n FROM users u JOIN orders_a o ON o.user_id = u.id WHERE u.city = 'Pune' AND o.dish = 'biryani'")).map(x => x.n));
    let ms = performance.now() - t0, work = sum(await c.busy());
    console.log(`  layout A  ${a} orders   shard calls ${c.calls - n0}   har shard apne andar join   bheje gaye ids 0        ${ms.toFixed(1)} ms   shards ka op-samay ${work.toFixed(1)} ms`);
    await c.busy(); n0 = c.calls; t0 = performance.now();
    const pune = (await c.each('all', "SELECT id FROM users WHERE city = 'Pune'")).flat().map(x => x.id);   // step 1: Pune ke user ids
    const ph = pune.map(() => '?').join(', ');
    const b = sum((await c.each('get', `SELECT count(*) n FROM orders_b WHERE dish = 'biryani' AND user_id IN (${ph})`, pune)).map(x => x.n));   // step 2: har shard ko poori list
    ms = performance.now() - t0; work = sum(await c.busy());
    console.log(`  layout B  ${b} orders   shard calls ${c.calls - n0}   pehle Pune ids, phir har shard ko list   bheje gaye ids ${fmt(pune.length * S)}   ${ms.toFixed(1)} ms   shards ka op-samay ${work.toFixed(1)} ms`);

    // Transfers: ₹1 (100 paise) between two random users; 2% crash between the two steps
    const t = rng(11); let sameShard = 0, cross = 0, crashSame = 0, crashCross = 0;
    const DEBIT = 'UPDATE wallets SET paise = paise - ? WHERE user_id = ?', CREDIT = 'UPDATE wallets SET paise = paise + ? WHERE user_id = ?';
    const total = async () => sum((await c.each('get', 'SELECT sum(paise) n FROM wallets')).map(x => x.n));
    const before = await total();
    for (let i = 0; i < TRANSFERS; i++) {
      const from = 1 + Math.floor(t() * USERS), to = 1 + Math.floor(t() * USERS), crash = t() < CRASH;
      if (from === to) continue;
      if (shardOf(from) === shardOf(to)) {                                // one shard: one transaction; a crash rolls back both steps
        sameShard++;
        const steps = [[DEBIT, [100, from]], [CREDIT, [100, to]]];
        if (crash) { crashSame++; steps.push(['INSERT INTO wallets VALUES (?, ?)', [from, 0]]); }   // fails (duplicate key) → ROLLBACK, like a crash before COMMIT
        try { await c.call(shardOf(from), 'steps', steps); } catch { /* rolled back */ }
      } else {                                                            // two shards: two separate commits
        cross++;
        await c.call(shardOf(from), 'steps', [[DEBIT, [100, from]]]);
        if (crash) { crashCross++; continue; }                            // app crashed after the first commit
        await c.call(shardOf(to), 'steps', [[CREDIT, [100, to]]]);
      }
    }
    const after = await total();
    console.log(`\nTransfer: ${fmt(TRANSFERS)} baar ₹1 ek user se dusre ko; ${CRASH * 100}% baar app beech mein crash`);
    console.log(`  ek hi shard par: ${sameShard} transfers, ${crashSame} crash → ek transaction, crash par dono steps wapas`);
    console.log(`  do shards par:   ${cross} transfers, ${crashCross} crash → do alag commits, crash ke baad sirf debit hua`);
    console.log(`  kul paisa pehle ₹${fmt(before / 100)}, baad mein ₹${fmt(after / 100)} → ₹${fmt((before - after) / 100)} gayab`);
  } finally { await c.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
