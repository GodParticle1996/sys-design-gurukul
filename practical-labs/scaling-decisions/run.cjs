'use strict';
// Deterministic models. No servers, Redis, replicas or throughput benchmark.
const assert = require('node:assert/strict');
const cases = {};
cases.traffic = () => {
  const average = 1_000_000 * 30 / 86400;
  const peak = average * 3; // chosen multiplier, not observed traffic
  assert.equal(peak * .9 + peak * .1, peak);
  const chosenReads = 900, warmMisses = chosenReads * (1 - .9), coldMisses = chosenReads;
  assert(Math.abs(warmMisses - 90) < 1e-9);
  assert(Math.abs(coldMisses / warmMisses - 10) < 1e-9);
  console.log(`average=${average.toFixed(2)} actions/s; assumed peak=${peak.toFixed(2)}; reads=${(peak*.9).toFixed(2)}; writes=${(peak*.1).toFixed(2)}`);
  console.log('Separate rounded practice: 1000 requests/s = 900 reads + 100 writes. Warm read misses=90; cold=900. Writes unchanged.');
};
cases.cache = () => {
  let db = {version:1,caption:'Morning'}, cache = null;
  const delayedRead = {...db}; // read A has old result but has not populated cache
  db = {version:2,caption:'Evening'}; cache = null; // B commits and invalidates
  cache = delayedRead; // A finishes AFTER invalidation
  assert.equal(cache.version,1); assert.equal(db.version,2);
  console.log(`Broken: DB=v${db.version}, cache=v${cache.version}. Delete did not cancel the earlier read.`);
  let floor = 1; cache = null;
  // Model boundary: one atomic cache operation retains monotonic floor and evicts old value.
  function advance(version) { floor = Math.max(floor,version); if (cache && cache.version < floor) cache=null; }
  function fill(value) { if (value.version < floor) return false; cache={...value}; return true; }
  advance(2); advance(1); // delayed invalidation cannot lower floor
  assert.equal(fill(delayedRead),false); assert.equal(cache,null);
  assert.equal(fill(db),true); assert.equal(cache.version,2);
  console.log('Guarded model: floor=2; v1 fill rejected; fresh primary v2 accepted.');
};
cases.replica = () => {
  const primary={version:2}, replica={version:1}, now=3, pinUntil=2;
  const timed = now < pinUntil ? primary : replica;
  const required=2;
  const checked = replica.version >= required ? replica : primary;
  assert.equal(timed.version,1); assert.equal(checked.version,2);
  console.log('At t=3s: two-second primary pin expired; lagging replica still v1. Minimum version=2 selects primary v2.');
  console.log('If primary is unavailable and replica is behind: wait within deadline or explicit unavailable/pending; do not label stale v1 fresh.');
};
cases.backlog = () => {
  // One-second buckets; arrivals join before service; fixed rates, no retries/expiry.
  let backlog=0;
  for(let second=0;second<60;second++) backlog=Math.max(0,backlog+2000-500);
  assert.equal(backlog,90000);
  function drain(arrivals) { let remaining=backlog; for(let s=1;s<=600;s++){ remaining=Math.max(0,remaining+arrivals-500); if(!remaining)return s;} return null; }
  assert.equal(drain(0),180); assert.equal(drain(200),300); assert.equal(drain(500),null);
  console.log('Backlog after 60s burst=90000. New arrivals 0/s: drains in 180s; 200/s: 300s; 500/s: never shrinks at fixed rates.');
};
cases.skew = () => {
  function loads(shards) { const values=Array(shards).fill(5000/shards); values[1]+=5000; return values; }
  assert.deepEqual(loads(4),[1250,6250,1250,1250]);
  assert.deepEqual(loads(5),[1000,6000,1000,1000,1000]);
  const changed=Array.from({length:20},(_,h)=>h).filter(h=>h%4!==h%5).length;
  assert.equal(changed,16);
  console.log(`4 shards: ${loads(4)} reads/s; 5 shards: ${loads(5)}. Hot key still contributes 5000/s to ONE shard.`);
  console.log(`Toy hash outputs 0..19: modulo 4→5 changes ${changed}/20 destinations. This is routing arithmetic, not data migration.`);
};
const selected=process.argv[2] || 'all';
if(selected!=='all' && !cases[selected]) {console.error('Use: node run.cjs [all|traffic|cache|replica|backlog|skew]');process.exitCode=2;}
else for(const [name,run] of Object.entries(cases)) if(selected==='all'||name===selected){run();console.log(`PASS ${name}`);}
