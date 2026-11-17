'use strict';
// Deterministic models for "10 Patterns" (blMWTUVX43U). No Redis, broker, object store or payment provider runs here.
// Each case prints numbers the lessons quote, and asserts the conditions they depend on.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const cases = {};
const h32 = s => crypto.createHash('sha1').update(String(s)).digest().readUInt32BE(0);
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';

cases.shards = () => {
  const N = 100_000, counts = [0, 0, 0, 0];
  let moved = 0;
  for (let i = 0; i < N; i++) { const h = h32('user:' + i); counts[h % 4]++; if (h % 4 !== h % 5) moved++; }
  assert.equal(counts.reduce((a, b) => a + b), N);
  assert(counts.every(c => Math.abs(c - N / 4) < N * 0.01), 'uniform user ids spread evenly over 4 shards');
  assert(Math.abs(moved / N - 0.8) < 0.01);
  console.log(`hash(user_id) mod 4 over ${N} users: ${counts.join(' / ')}`);
  console.log(`mod 4 -> mod 5: ${moved} keys move (${pct(moved, N)}). Same shard only when h mod 20 is 0,1,2 or 3 -> 4/20 stay.`);
  // Date as key: every post written today has the same key, so one shard takes all of today's writes.
  const today = new Set(Array.from({ length: 1000 }, () => h32('2026-11-16') % 4));
  assert.equal(today.size, 1);
  console.log("date key: 1000 of today's posts -> 1 shard (key is identical), other 3 idle for new writes.");
};

cases.ring = () => {
  const keys = Array.from({ length: 20_000 }, (_, i) => h32('post:' + i));
  function owner(points, k) { // first point clockwise
    let lo = 0, hi = points.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (points[m].p < k) lo = m + 1; else hi = m; }
    return points[lo % points.length].s;
  }
  function moveFraction(seed, vnodes) {
    const pts = n => { const a = []; for (let s = 0; s < n; s++) for (let v = 0; v < vnodes; v++) a.push({ p: h32(`${seed}:shard${s}#${v}`), s }); return a.sort((x, y) => x.p - y.p); };
    const four = pts(4), five = pts(5);
    let moved = 0; for (const k of keys) if (owner(four, k) !== owner(five, k)) moved++;
    return moved / keys.length;
  }
  for (const vnodes of [1, 100]) {
    const runs = Array.from({ length: 30 }, (_, seed) => moveFraction(seed, vnodes));
    const mean = runs.reduce((a, b) => a + b) / runs.length, min = Math.min(...runs), max = Math.max(...runs);
    if (vnodes === 100) assert(max - min < 0.08, 'many points per shard narrow the spread');
    console.log(`ring, ${String(vnodes).padStart(3)} point(s)/shard, 30 layouts: moved mean ${(mean * 100).toFixed(1)}%, min ${(min * 100).toFixed(1)}%, max ${(max * 100).toFixed(1)}%`);
  }
  console.log('Only keys taken by the new shard move. One point per shard makes that share depend on where the point lands.');
};

cases.hll = () => {
  // HyperLogLog, m = 2^14 registers (the register count Redis documents). 32-bit mixed hash; n=100,000 is far below 2^32.
  const p = 14, m = 1 << p, alpha = 0.7213 / (1 + 1.079 / m);
  const mix = x => { x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return x >>> 0; };
  function estimate(trial, n) {
    const reg = new Uint8Array(m);
    for (let i = 0; i < n; i++) {
      const x = mix((i * 0x9e3779b1 + trial * 0x7f4a7c15) >>> 0 ^ mix(trial + 1));
      const idx = x >>> (32 - p), rest = (x << p) >>> 0;
      const rank = rest === 0 ? 32 - p + 1 : Math.clz32(rest) + 1;
      if (rank > reg[idx]) reg[idx] = rank;
    }
    let sum = 0, zeros = 0; for (const r of reg) { sum += 2 ** -r; if (!r) zeros++; }
    const raw = alpha * m * m / sum;
    return raw <= 2.5 * m && zeros ? m * Math.log(m / zeros) : raw;
  }
  const n = 100_000, trials = 200, errs = [];
  for (let t = 0; t < trials; t++) errs.push((estimate(t, n) - n) / n);
  const rmse = Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / trials);
  const over1 = errs.filter(e => Math.abs(e) > 0.01).length, worst = Math.max(...errs.map(Math.abs));
  const theory = 1.04 / Math.sqrt(m);
  assert(Math.abs(theory - 0.008125) < 1e-9);
  assert(rmse > 0.005 && rmse < 0.012, 'measured spread should be near the theoretical standard error');
  assert(over1 > 0, 'some estimates exceed 1% error: 0.81% is not a bound');
  console.log(`theory: 1.04 / sqrt(${m}) = ${(theory * 100).toFixed(4)}% standard error; registers ${m} x 6 bits = ${m * 6 / 8} bytes`);
  console.log(`${trials} independent sets of ${n} unique ids: RMS error ${(rmse * 100).toFixed(2)}%, |error| > 1% in ${over1}/${trials}, worst ${(worst * 100).toFixed(2)}%`);
  const A = 1_000_000, B = 1_000_000, both = 10_000, union = A + B - both, sigma = theory * union;
  console.log(`intersection by A+B-union: |A|=|B|=${A}, overlap ${both}; union ${union} has 1 standard error ~ ${Math.round(sigma)} -> larger than the overlap itself`);
};

cases.retry = () => {
  const waits = [1, 2, 4, 8], attempts = waits.length + 1;
  const waiting = waits.reduce((a, b) => a + b);
  assert.equal(attempts, 5); assert.equal(waiting, 15);
  const callSeconds = 3, total = attempts * callSeconds + waiting;
  assert.equal(total, 30);
  console.log(`attempts ${attempts}, retries ${waits.length}, waits ${waits.join('+')} = ${waiting} s; with ${callSeconds} s per attempt the job reaches the dead-letter queue at ${total} s`);
};

cases.bucket = () => {
  function bucket(capacity, perSecond) {
    let tokens = capacity, at = 0;
    return (t, n) => { tokens = Math.min(capacity, tokens + (t - at) * perSecond); at = t; const ok = Math.min(n, Math.floor(tokens)); tokens -= ok; return [ok, n - ok]; };
  }
  const full = bucket(20, 10);
  assert.deepEqual(full(0, 30), [20, 10]);
  assert.deepEqual(full(1, 30), [10, 20]);
  console.log('full bucket (20, +10/s): 30 at t=0 -> 20 pass, 10 rejected; 30 more at t=1 -> 10 pass, 20 rejected');
  const used = bucket(20, 10); used(0, 15);
  assert.deepEqual(used(0.5, 30), [10, 20]);
  console.log('same bucket after 15 requests at t=0: 30 at t=0.5 -> 10 pass, 20 rejected (only 5 left + 5 refilled)');
};

cases.parts = () => {
  const GiB = 2 ** 30, MiB = 2 ** 20;
  const binary = Math.ceil(2 * GiB / (5 * MiB)), last = 2 * GiB - (binary - 1) * 5 * MiB;
  const decimal = Math.ceil(2e9 / 5e6);
  assert.equal(binary, 410); assert.equal(decimal, 400);
  console.log(`2 GiB / 5 MiB = ${(2 * GiB / (5 * MiB)).toFixed(1)} -> ${binary} parts, last part ${(last / MiB).toFixed(1)} MiB; 2 GB / 5 MB = ${decimal} parts`);
  // Resume uses the parts the store confirmed, not a guess about where the connection dropped.
  const confirmed = new Set(Array.from({ length: 299 }, (_, i) => i + 1)); // part 300 was in flight
  const missing = []; for (let i = 1; i <= binary; i++) if (!confirmed.has(i)) missing.push(i);
  assert.equal(missing[0], 300); assert.equal(missing.length, binary - 299);
  console.log(`died while sending part 300: store confirms 1..299 -> resend ${missing.length} parts starting at ${missing[0]}`);
};

cases.copies = () => {
  const total = 400_000, copies = Array.from({ length: 10 }, (_, i) => `post:991#${i}`);
  for (const servers of [4, 10, 40]) {
    const load = new Array(servers).fill(0);
    for (const c of copies) load[h32(c) % servers] += total / copies.length;
    const used = load.filter(Boolean).length, busiest = Math.max(...load);
    if (servers === 4) assert(busiest >= 120_000, 'ten copies on four servers: some server holds at least three');
    console.log(`${String(servers).padStart(2)} cache servers: 10 copies land on ${used} servers; busiest gets ${busiest.toLocaleString('en-US')} reads/s (ideal per copy ${total / 10})`);
  }
  console.log('Copy count is not machine count. Check where the suffixed keys land; every copy also needs updating on writes.');
};

cases.saga = () => {
  // Fake payment provider that honours idempotency keys. One refund timeout: provider did the refund, reply was lost.
  function provider() {
    const done = new Map(); let refunds = 0;
    return { refund(key, amount, { loseReply } = {}) { if (!done.has(key)) { refunds += amount; done.set(key, 'refunded'); } if (loseReply) throw new Error('timeout'); return done.get(key); }, get total() { return refunds; } };
  }
  function run(keyForRetry) {
    const p = provider(), log = ['charged 500', 'promotion failed: post deleted', 'compensating'];
    try { p.refund('S1-refund', 500, { loseReply: true }); } catch { log.push('refund timeout: outcome unknown'); }
    // orchestrator restarts here; it reads the durable log, still "compensating"
    log.push('restart: resume compensating');
    log.push('retry -> ' + p.refund(keyForRetry, 500)); log.push('compensated');
    return { log, refunded: p.total };
  }
  const same = run('S1-refund'), fresh = run('S1-refund-retry-2');
  assert.equal(same.refunded, 500); assert.equal(fresh.refunded, 1000);
  console.log(same.log.join(' | '));
  console.log(`same refund key on retry: refunded ${same.refunded}; new key on retry: refunded ${fresh.refunded} (double refund)`);
};

const name = process.argv[2];
const run = name ? [name] : Object.keys(cases);
for (const n of run) { if (!cases[n]) { console.error(`unknown case ${n}; use: ${Object.keys(cases).join(' ')}`); process.exit(2); } console.log(`\n# ${n}`); cases[n](); }
console.log(`\nPASS ${run.length} experiment(s). Models only: no real Redis, broker, object store or payment provider.`);
