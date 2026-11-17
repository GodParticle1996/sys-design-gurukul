'use strict';
// Deterministic arithmetic for "0 to 1,000,000 - How to Scale Systems Efficiently" (FdU9CgjNWXU).
// Chosen workloads, not benchmarks. No database, Lambda, queue or CDN runs here.
const assert = require('node:assert/strict');
const cases = {};

cases.units = () => {
  // Source slide: "47.7M MPS = upwards of 40M QPS". AWS reported SQS messages/s, not database queries or web requests.
  const messagesPerSec = 47.7e6;
  for (const queriesPerMessage of [0, 0.5, 2]) console.log(`if each message caused ${queriesPerMessage} DB queries -> ${(messagesPerSec * queriesPerMessage / 1e6).toFixed(1)}M queries/s`);
  console.log('The same 47.7M messages/s fits 0, 23.9M or 95.4M queries/s depending on an unknown ratio. "= 40M QPS" is not derivable.');
};

cases.cost = () => {
  // Utilization law: busy cores = arrival rate x service time per query (CPU-bound, chosen numbers).
  const cores = 16, qps = 500;
  const kinds = { 'indexed lookup (2 ms CPU)': 0.002, 'unindexed scan (200 ms CPU)': 0.2 };
  for (const [name, s] of Object.entries(kinds)) {
    const busy = qps * s, capacity = cores / s;
    console.log(`${name}: 500 QPS keeps ${busy} cores busy of ${cores} (${(100 * busy / cores).toFixed(0)}%); ceiling ~${capacity} QPS`);
  }
  assert.equal(500 * 0.2, 100); assert.equal(16 / 0.002, 8000);
  console.log('Same "medium" band: one workload uses 6% of the box, the other needs 100 cores. Name the query cost, not only the band.');
};

cases.bytes = () => {
  const viewers = 1000, segmentSeconds = 4, segmentMB = 2.5;
  const rps = viewers / segmentSeconds, MBps = rps * segmentMB, Gbps = MBps * 8 / 1000;
  assert.equal(rps, 250); assert.equal(Gbps, 5);
  console.log(`${viewers} viewers, one ${segmentMB} MB segment every ${segmentSeconds} s: ${rps} requests/s ("medium" band) but ${MBps} MB/s = ${Gbps} Gbps`);
  console.log('Bandwidth, not QPS, sets the design: CDN/edge caching and origin egress.');
};

cases.lambda = () => {
  const maxConnections = 100; // PostgreSQL default max_connections
  const run = (rps, seconds) => rps * seconds; // Little's law: concurrency = arrival rate x time in system
  const normal = run(200, 0.2), sale = run(4000, 0.2);
  assert.equal(normal, 40); assert.equal(sale, 800);
  console.log(`normal 200 req/s x 0.2 s = ${normal} concurrent executions -> ${normal} DB connections (limit ${maxConnections}) OK`);
  console.log(`sale 4000 req/s x 0.2 s = ${sale} concurrent executions -> ${sale} DB connections if each opens one: ${sale - maxConnections} refused`);
  const dbSeconds = 0.02, dbBusy = run(4000, dbSeconds), pool = 90;
  assert.equal(dbBusy, 80);
  console.log(`with a shared pool/proxy: requests hold a DB connection only for ${dbSeconds * 1000} ms -> ${dbBusy} connections busy on average (pool ${pool}) OK`);
  const capped = 300, served = capped / 0.2;
  console.log(`reserved concurrency ${capped}: at most ${served} req/s run; the rest throttle or wait in a queue. Average only; bursts need headroom.`);
};

cases.retries = () => {
  // Refused requests retried 3 times by clients multiply load on the struggling dependency.
  const incoming = 4000, failShare = (800 - 100) / 800, retries = 3;
  let offered = incoming, failing = incoming * failShare;
  for (let i = 0; i < retries; i++) { offered += failing; failing *= failShare; }
  console.log(`fail share ${(failShare * 100).toFixed(1)}%: with ${retries} client retries, offered load ~${Math.round(offered)} req/s for ${incoming} real req/s (if failure share stays the same)`);
  assert(offered > 2.5 * incoming);
};

const name = process.argv[2];
const run = name ? [name] : Object.keys(cases);
for (const n of run) { if (!cases[n]) { console.error(`unknown case ${n}; use: ${Object.keys(cases).join(' ')}`); process.exit(2); } console.log(`\n# ${n}`); cases[n](); }
console.log(`\nPASS ${run.length} experiment(s). Arithmetic models only; numbers are chosen, not measured.`);
