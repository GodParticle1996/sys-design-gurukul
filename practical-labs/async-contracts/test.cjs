'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Shortener, Analytics, createLink } = require('./store.cjs');
const url = 'https://example.com/menu';
if (process.argv[2] === 'crash') {
  const store = new Shortener(process.argv[4]);
  if (process.argv[3] === 'worker') store.work('async', () => process.exit(91));
  else store.relay(new Analytics(process.argv[5]), () => process.exit(92));
  throw Error('Crash injection did not run');
}
for (const mode of ['early','sync','pending']) {
  const store = new Shortener();
  try {
    const response = createLink(store, mode, 'abc', url);
    assert.equal(response.status, mode === 'pending' ? 202 : 201);
    assert.equal(response.location, mode === 'pending' ? '/jobs/abc' : '/s/abc');
    assert.equal(store.redirect('abc').status, mode === 'sync' ? 302 : 404);
    if (mode !== 'sync') {
      assert.equal(store.status('abc'),'pending');
      assert.throws(() => store.work('abc', () => { throw Error('injected'); }), /injected/);
      assert.equal(store.redirect('abc').status,404);
      assert.equal(store.pendingEvents(),0);
      assert.equal(store.status('abc'),'pending');
      store.work('abc'); assert.equal(store.status('abc'),'done');
      assert.equal(store.work('abc'),'already-done');
    }
    assert.deepEqual(store.redirect('abc'),{status:302,location:url});
    assert.throws(() => store.createNow('abc','https://example.com/other'));
    assert.deepEqual(store.redirect('abc'),{status:302,location:url},'Collision must not overwrite an existing mapping');
  } finally { store.close(); }
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'gurukul-contracts-'));
const appFile = path.join(directory,'app.sqlite'), consumerFile = path.join(directory,'consumer.sqlite');
let store, consumer;
try {
  store = new Shortener(appFile);
  createLink(store,'pending','async',url); store.close(); store=null;
  let child = spawnSync(process.execPath,[__filename,'crash','worker',appFile],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,91,child.error?.message || child.stderr);
  store = new Shortener(appFile);
  assert.equal(store.status('async'),'pending');
  assert.equal(store.redirect('async').status,404);
  assert.equal(store.pendingEvents(),0,'Uncommitted mapping and intent both roll back after abrupt exit');
  store.work('async'); store.close(); store=null;
  child = spawnSync(process.execPath,[__filename,'crash','relay',appFile,consumerFile],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,92,child.error?.message || child.stderr);
  store = new Shortener(appFile); consumer = new Analytics(consumerFile);
  assert.equal(store.redirect('async').status,302);
  assert.equal(store.status('async'),'done');
  assert.equal(store.pendingEvents(),1);
  assert.equal(consumer.count('async'),1);
  assert.equal(store.relay(consumer),1);
  assert.equal(consumer.count('async'),1,'Duplicate event must not increment twice');
  assert.equal(store.pendingEvents(),0);
  assert.equal(store.relay(consumer),0);
  console.log('PASS: early-success counterexample, synchronous creation, pending status, rollback, duplicate job, code collision, abrupt worker/relay exit and idempotent local consumer. Not a power-loss or broker test.');
} finally {
  if(store)store.close(); if(consumer)consumer.close();
  fs.rmSync(directory,{recursive:true,force:true});
}
