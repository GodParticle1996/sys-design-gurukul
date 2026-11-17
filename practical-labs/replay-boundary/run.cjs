'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const M=require('./model.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sds-replay-'));
const db=M.open(path.join(dir,'events.sqlite'));
let checks=0;
function check(name,fn) { fn(); console.log('PASS '+name); checks++; }
try {
  M.append(db,0,{type:'TopUpRecorded',amount:100});
  M.append(db,1,{type:'FeeCharged',amount:10});
  const original=M.read(db);
  check('two events -> balance 90; both timestamps equal, versions ordered',()=>{
    assert.deepEqual(M.fold(original),{balance:90,version:2});
    assert.equal(original[0].recorded_at,original[1].recorded_at);
  });
  const unsafeNotifications=[];
  const unsafeSink=e=>unsafeNotifications.push(e.version);
  M.rebuildAndNotify(original,unsafeSink); // model first live delivery
  M.rebuildAndNotify(original,unsafeSink); // broken rebuild repeats delivery
  check('broken rebuild: notification attempts 2 -> 4',()=>assert.deepEqual(unsafeNotifications,[1,2,1,2]));
  const safeNotifications=original.map(e=>e.version); // model already completed live delivery
  check('pure rebuild twice: balance 90, notification attempts stay 2',()=>{
    assert.deepEqual(M.fold(original),{balance:90,version:2});
    assert.deepEqual(M.fold(original),{balance:90,version:2});
    assert.deepEqual(safeNotifications,[1,2]);
  });
  check('append fee reversal: balance 100; original two records unchanged',()=>{
    M.reverseFee(db,2,2);
    const corrected=M.read(db);
    assert.deepEqual(corrected.slice(0,2),original);
    assert.deepEqual(M.fold(corrected),{balance:100,version:3});
    assert.deepEqual(M.fold(corrected.slice(0,2)),{balance:90,version:2});
    safeNotifications.push(corrected[2].version); // model one new live event
    assert.deepEqual(safeNotifications,[1,2,3]);
  });
  check('repeat reversal rejected; no fourth record or extra credit',()=>{
    assert.throws(()=>M.reverseFee(db,2,3),/already reversed/);
    assert.equal(M.read(db).length,3); assert.equal(M.fold(M.read(db)).balance,100);
  });
  check('stale expected version rejects append',()=>{
    assert.throws(()=>M.append(db,2,{type:'TopUpRecorded',amount:20}),/version conflict/);
    assert.equal(M.read(db).length,3);
  });
  check('unknown event or missing prefix fails visibly',()=>{
    assert.throws(()=>M.fold([...M.read(db),{version:4,type:'BonusAddedV2',amount:5}]),/unsupported event/);
    assert.throws(()=>M.fold(original.slice(1)),/gap or duplicate/);
  });
  console.log(`${checks} checks passed. SQLite is real; notification attempts are an in-memory sink. No email or payment was sent.`);
} finally {db.close();fs.rmSync(dir,{recursive:true,force:true});}
