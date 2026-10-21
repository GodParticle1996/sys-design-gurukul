const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sequential, batched } = require('../lib/lookups');
const { parallel } = require('../lib/parallel');
const { schedule, summarize } = require('../lib/queue');
test('bounded parallel preserves input order under reversed completion', async () => {
  let active=0,peak=0;
  const values=await parallel([1,2,3,4,5],async n=>{
    active++; peak=Math.max(peak,active);
    await new Promise(r=>setTimeout(r,(6-n)*3));
    active--; return n*2;
  },2);
  assert.deepEqual(values,[2,4,6,8,10]); assert.equal(peak,2);
});
test('batch handles final partial batch and never requests empty batches', async () => {
  const calls=[];
  const read=async part=>{calls.push(part);return part.map(n=>n*2);};
  assert.deepEqual(await batched([1,2,3,4,5],read,2),[2,4,6,8,10]);
  assert.deepEqual(calls,[[1,2],[3,4],[5]]);
  assert.deepEqual(await batched([],read,2),[]); assert.equal(calls.length,3);
});
test('failed lookups reject, and invalid concurrency never silently drops work', async () => {
  const fail=async()=>{throw Error('cache down');};
  await assert.rejects(sequential([1],fail),/cache down/);
  await assert.rejects(batched([1],fail,1),/cache down/);
  await assert.rejects(parallel([1],fail,1),/cache down/);
  for (const limit of [0,-1,1.5,NaN,Infinity]) {
    await assert.rejects(parallel([1],async n=>n,limit));
    await assert.rejects(batched([1],async p=>p,limit));
  }
});
test('queue model distinguishes waiting, service and time-average occupancy', () => {
  const rows=schedule([0,50,100,150],100,1);
  assert.deepEqual(rows.map(r=>r.wait),[0,50,100,150]);
  const s=summarize(rows);
  assert.equal(s.peak,3); assert.equal(s.area,700);
  assert.equal(s.meanW,175); assert.equal(s.rate,10); assert.equal(s.meanL,1.75);
  assert.equal(s.rate*s.meanW/1000,s.meanL);
  assert.deepEqual(schedule([0,50,100,150],100,2).map(r=>r.wait),[0,0,0,0]);
});
test('queue rejects unsorted or nonfinite arrivals and invalid capacity', () => {
  assert.throws(()=>schedule([1,0],100)); assert.throws(()=>schedule([NaN],100));
  assert.throws(()=>schedule([0],0)); assert.throws(()=>schedule([0],100,0));
});
