'use strict';
// ex6-newsql: MODEL (arithmetic). "A write in a distributed SQL database is always slower than single-node Postgres."
// What a commit waits for, by WHERE the durable copies live. Local fsync 1.3 ms is assumed (lab 55's fast run; its runs
// ranged 1.2–4.8 ms). Round trips are
// ASSUMED typical values, not measured: other zone in the region 1.0 ms, Mumbai–Singapore 60 ms,
// Mumbai–Frankfurt 120 ms. Leader/primary fsync and "send to replica, replica fsyncs" run at the same time.
const { serial, parallel } = require('../lib/latency');
const F = 1.3, AZ = 1.0, SG = 60, FR = 120;
// PostgreSQL synchronous replication (synchronous_commit = on, one synchronous standby): the docs say the commit record is
// written to disk on the primary, THEN sent to the standby, which flushes it and replies — a serial schedule.
// Raft: the leader's own log write and sending to followers are ASSUMED to run in parallel (Raft allows it; not every
// implementation does). Commit needs a majority: the leader plus the nearest follower.
const rows = [
  ['Postgres, one machine', 'local fsync', F, 'process crash, power cut', 'disk or machine dies: acknowledged data gone until a backup is restored'],
  ['Postgres + async replica (other zone)', 'local fsync (replica later)', F, 'machine dies (replica takes over)', 'the last few commits may not have reached the replica'],
  ['Postgres + sync replica (other zone)', 'fsync, then RTT + standby fsync', serial(F, AZ, F), 'a whole zone goes down', 'failover is a separate step; if the standby is down, commits wait'],
  ['Raft, 3 replicas in 3 zones', 'max(fsync, RTT + follower fsync)', parallel(F, serial(AZ, F)), 'a whole zone goes down', 'nothing acknowledged; the majority keeps serving'],
  ['Postgres + sync replica (Singapore)', 'fsync, then RTT + standby fsync', serial(F, SG, F), 'the Mumbai region goes down', 'failover is a separate step; if the standby is down, commits wait'],
  ['Raft, 3 regions (Mumbai, Singapore, Frankfurt)', 'max(fsync, RTT to nearer follower + fsync)', parallel(F, serial(Math.min(SG, FR), F)), 'a whole region goes down', 'nothing acknowledged; majority keeps serving'],
];
console.log('MODEL: commit latency = what the commit waits for (assumed RTTs; assumed fsync 1.3 ms, the fast run in lab 55)');
console.log('');
console.log('setup                                              waits for                                     commit    survives');
for (const [name, waits, ms, survives] of rows) console.log(`${name.padEnd(50)} ${waits.padEnd(44)} ${(ms.toFixed(1) + ' ms').padStart(8)}    ${survives}`);
console.log('');
console.log('what can still be lost:');
for (const [name, , , , lost] of rows) console.log(`  ${name.padEnd(50)} ${lost}`);
console.log('');
console.log('The wait is set by the distance to the copies a commit must wait for, and by the order of the steps (serial vs');
console.log('parallel). Product names do not set it: the same placement gives waits within one fsync of each other here.');
console.log('Not modeled: the hop from the SQL gateway to the range leader, transactions that touch several ranges (extra');
console.log('coordination round trips), and clock-uncertainty waits (Spanner commit wait, which can partly overlap replication).');
console.log('Those can add time in distributed SQL, so a real multi-range write there is often slower than this table.');
console.log('Measure your own transactions.');
