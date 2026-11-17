'use strict';
const assert = require('node:assert/strict');

// Deliberately synchronous RAM model. No provider, HTTP client or durable DB.
class Provider {
  constructor() { this.keys = new Map(); this.payments = []; this.reportReady = false; }
  charge(account, key, amount) {
    assert(Number.isSafeInteger(amount) && amount > 0, 'amount uses integer cents');
    const identity = JSON.stringify([account, 'charge', key]);
    const prior = this.keys.get(identity);
    if (prior) {
      if (prior.amount !== amount) throw new Error('same key, changed amount');
      return prior;
    }
    const result = {id: 'pay-' + (this.payments.length + 1), account, key, amount, status: 'captured'};
    this.payments.push(result); this.keys.set(identity, result);
    return result;
  }
  report(account, key) {
    if (!this.reportReady) return null; // A lagging report is not negative proof.
    return this.payments.find(p => p.account === account && p.key === key) || null;
  }
  prune(account, key) { this.keys.delete(JSON.stringify([account, 'charge', key])); }
}

function reconcile(local, report) {
  if (!report) return {...local};
  assert(report.account === local.account && report.key === local.key, 'match operation');
  if (report.status === 'captured') return {...local, state:'captured', paymentId:report.id};
  if (report.status === 'confirmed_failed') return {...local, state:'failed'};
  return {...local}; // pending/ambiguous evidence remains unresolved
}

function identity() {
  const provider = new Provider();
  const first = provider.charge('shop-a', 'order-7', 4999);
  assert.equal(provider.charge('shop-a', 'order-7', 4999).id, first.id);
  assert.throws(() => provider.charge('shop-a', 'order-7', 5999), /changed amount/);
  assert.equal(provider.payments.length, 1);
  provider.charge('shop-a', 'order-8', 4999); // identical body, a different purchase
  provider.charge('shop-b', 'order-7', 4999); // different account
  assert.equal(provider.payments.length, 3);
  const broken = new Provider();
  for (let attempt = 0; attempt < 3; attempt++) broken.charge('shop-a', `new-${attempt}`, 4999);
  assert.equal(broken.payments.length, 3);
  console.log('PASS identity: stable retry = 1; new key each attempt = 3; changed amount rejected; scope preserved');
}

function unknown() {
  const provider = new Provider();
  let local = {account:'shop-a', key:'order-7', state:'pending'};
  provider.charge(local.account, local.key, 4999); // effect happened; discard reply
  local = {...local, state:'in_doubt'};
  local = reconcile(local, provider.report(local.account, local.key));
  assert.equal(local.state, 'in_doubt');
  assert.equal(provider.payments.length, 1);
  // Resetting local state cannot undo the independent remote effect.
  const rolledBack = {...local, state:'pending'};
  assert.equal(rolledBack.state, 'pending'); assert.equal(provider.payments.length, 1);
  provider.reportReady = true;
  local = reconcile(local, provider.report(local.account, local.key));
  assert.equal(local.state, 'captured'); assert.equal(local.paymentId, 'pay-1');
  const failed = reconcile({account:'shop-a', key:'other', state:'in_doubt'},
    {account:'shop-a', key:'other', status:'confirmed_failed'});
  assert.equal(failed.state, 'failed');
  console.log('PASS unknown: missing report stays in_doubt; later matching success -> captured; confirmed failure -> failed');
}

function retention() {
  const provider = new Provider();
  provider.charge('shop-a', 'order-7', 4999);
  provider.prune('shop-a', 'order-7');
  provider.charge('shop-a', 'order-7', 4999);
  assert.equal(provider.payments.length, 2);
  console.log('PASS retention: deleting the key record lets the old key create a second effect');
}

// Fake clock, sequential attempts, always-retryable failure, fixed call duration.
// Real timeout/cancellation must propagate separately to the remote operation.
function schedule({deadlineMs, attemptMs=2000, waits=[1000,2000,4000,8000], retryAfterMs=0}) {
  let now=0; const starts=[], durations=[];
  for(let i=0; i<=waits.length; i++) {
    if(now>=deadlineMs) break;
    starts.push(now);
    const duration=Math.min(attemptMs, deadlineMs-now);
    durations.push(duration); now+=duration;
    if(i===waits.length || now>=deadlineMs) break;
    const delay=Math.max(waits[i], retryAfterMs);
    if(now+delay>=deadlineMs) break;
    now+=delay;
  }
  return {starts,durations,stoppedAt:now};
}
function retryAfter(value, wallNow) {
  if (/^\d+$/.test(value)) return Number(value)*1000;
  const date=Date.parse(value);
  return Number.isFinite(date) ? Math.max(0,date-wallNow) : null;
}
function deadlines() {
  const full=schedule({deadlineMs:30000});
  assert.deepEqual(full.starts,[0,3000,7000,13000,23000]);
  assert.equal(full.stoppedAt,25000); // 15 seconds waits + 10 seconds calls
  const bounded=schedule({deadlineMs:12000});
  assert.deepEqual(bounded.starts,[0,3000,7000]); assert.equal(bounded.stoppedAt,9000);
  const shortened=schedule({deadlineMs:1000});
  assert.deepEqual(shortened.durations,[1000]);
  assert.equal(3**3,27); assert.equal((1+3)**3,64);
  console.log('PASS deadline: 4 retries = 5 attempts; waits 15s + calls 10s = 25s; 12s budget admits starts 0,3,7s');
  console.log('  Three layers: 3 attempts each -> at most 27 leaf attempts; 3 retries each -> at most 64');
}
function serverDelay() {
  const wall=Date.UTC(2026,10,11);
  assert.equal(retryAfter('8',wall),8000);
  assert.equal(retryAfter(new Date(wall+8000).toUTCString(),wall),8000);
  assert.equal(retryAfter('invalid',wall),null);
  assert.deepEqual(schedule({deadlineMs:9000,retryAfterMs:8000}).starts,[0]);
  console.log('PASS Retry-After: seconds/date both 8s; 9s deadline stops retry after 2s call, without shortening server wait');
}
function jitter() {
  let seed=11; const buckets=Array(5).fill(0);
  for(let i=0;i<1000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const delay=500+(seed/2**32)*500; // [500,1000), not the full-jitter formula
    buckets[Math.floor((delay-500)/100)]++;
  }
  assert.equal(buckets.reduce((a,b)=>a+b,0),1000);
  assert(Math.max(...buckets)>200); // expected occupancy is not a ceiling
  console.log('PASS jitter: five 100ms bins = '+buckets.join(', ')+`; sum=1000, max=${Math.max(...buckets)} > average 200`);
}

const experiments={identity,unknown,retention,deadlines,serverDelay,jitter};
const selected=process.argv[2];
if(selected && !experiments[selected]) throw new Error('Choose '+Object.keys(experiments).join(', '));
for(const experiment of selected ? [experiments[selected]] : Object.values(experiments)) experiment();
