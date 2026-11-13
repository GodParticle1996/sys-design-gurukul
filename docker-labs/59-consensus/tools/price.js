'use strict';
// ex3-price — ASLI fsync samples (is machine ki disk) + MODEL network. Ek commit ka intezaar:
//   single node      = apna fsync
//   Raft, 3 nodes    = max(leader ka fsync, RTT + ek follower ka fsync)   (leader aur follower saath-saath likhte hain)
// Batching: ek round mein B entries ek saath (ek fsync, ek round trip).
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { rng } = require('../lib/rng');
const { percentile } = require('../lib/stats');
const SAMPLES = Number(process.argv[2] || 400);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab59-')), file = path.join(dir, 'log');
const fd = fs.openSync(file, 'a'), entry = Buffer.alloc(128, 'x'), fsyncMs = [];
try {
  for (let i = 0; i < SAMPLES; i++) { fs.writeSync(fd, entry); const t0 = performance.now(); fs.fsyncSync(fd); fsyncMs.push(performance.now() - t0); }
} finally { fs.closeSync(fd); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(`Asli fsync, ${SAMPLES} baar (128-byte entry): median ${percentile(fsyncMs, 50).toFixed(2)} ms, p99 ${percentile(fsyncMs, 99).toFixed(2)} ms\n`);
const r = rng(3), pick = () => fsyncMs[Math.floor(r() * fsyncMs.length)];
const ROUNDS = 20000;
const { commit: raft } = require('../lib/price');
const commit = rttMs => raft(pick(), [pick(), pick()], rttMs);   // one round, 2 followers, 1 follower ack needed
console.log('setup                         ek commit: median     p99       commits/sec (B = batch)');
const rows = [['single node (sirf fsync)', () => pick()], ['Raft 3 nodes, same AZ (RTT 0.5 ms)', () => commit(0.5)], ['Raft 3 nodes, regions (RTT 60 ms)', () => commit(60)]];
for (const [name, f] of rows) {
  const lat = Array.from({ length: ROUNDS }, f), med = percentile(lat, 50);
  const tput = [1, 16, 128].map(B => `B=${B}: ${Math.round(B * 1000 / med).toLocaleString('en-IN')}`).join('  ');
  console.log(`${name.padEnd(34)}  ${med.toFixed(2).padStart(6)} ms  ${percentile(lat, 99).toFixed(2).padStart(7)} ms   ${tput}`);
}
console.log(`
commits/sec = B ÷ ek round ka median (ek leader, ek ke baad ek round; pipelining aur CPU nahi gina).
Consensus ki keemat: har commit par fsync + kam se kam ek network round trip. Regions mein RTT hi sab kuch.
Batching ek fsync aur ek round trip ko kai entries mein baant'ti hai; Raft implementations (jaise etcd) bhi entries batch karte hain.`);
