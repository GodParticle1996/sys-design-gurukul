'use strict';
// Original deterministic models. No Redis server, identity provider or network.
const assert = require('node:assert/strict');

function quality(rows, limitMs) {
  assert(rows.length > 0);
  const correct = rows.filter(r => r.correct);
  const timely = correct.filter(r => r.ms <= limitMs);
  const sorted = correct.map(r => r.ms).sort((a,b) => a-b);
  return {total:rows.length, correct:correct.length, timely:timely.length,
    successPercent:100*correct.length/rows.length,
    goodPercent:100*timely.length/rows.length,
    successfulP95:sorted.length ? sorted[Math.ceil(sorted.length*.95)-1] : null};
}
function metricsCase() {
  // One chosen measurement window: 100 eligible public redirect requests.
  const rows=[...Array.from({length:98},()=>({correct:true,ms:100})),
    {correct:true,ms:400},{correct:false,ms:2000}];
  assert.deepEqual(quality(rows,200),{total:100,correct:99,timely:98,
    successPercent:99,goodPercent:98,successfulP95:100});
  // A timeout becoming a fast wrong redirect must still count as bad.
  rows[99]={correct:false,ms:10};
  assert.equal(quality(rows,200).goodPercent,98);
  assert.equal(quality([{correct:false,ms:10}],200).successfulP95,null);
  console.log('PASS1 metrics: success=99%; correct within200ms=98%; successful p95=100ms. Fast wrong result stays bad.');
}

const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function base62(n) {
  assert(typeof n==='bigint' && n>=0n);
  let out='';do {out=alphabet[Number(n%62n)]+out;n/=62n;}while(n);
  return out;
}
class Counters {
  constructor(){this.values=new Map();}
  next(key){const n=(this.values.get(key)||0n)+1n;this.values.set(key,n);return n;}
}
function countersCase() {
  const counters=new Counters();
  const a=counters.next('A'),b=counters.next('B');
  assert.equal(base62(a),base62(b)); // Both independent counters return1.
  assert.equal(base62(62n),'10');
  assert.equal(base62(3844n),'100');
  assert.equal(new Set(Array.from({length:1000},(_,i)=>base62(BigInt(i)))).size,1000);
  const namespaced=[`A:${base62(a)}`,`B:${base62(b)}`];
  assert.equal(new Set(namespaced).size,2);
  console.log('PASS2 counters: A=1 and B=1 collide; base62 preserves that collision; A:1 and B:1 differ.');
}
class LinkRegistry {
  constructor(){this.rows=new Map();}
  create(id,destination){
    if(this.rows.has(id))return {error:'collision'};
    this.rows.set(id,destination);return {created:id};
  }
}
function restartCase() {
  const rows=new LinkRegistry();
  let generator=new Counters();
  const id=`A:${base62(generator.next('A'))}`;
  rows.create(id,'first-menu');
  generator=new Counters(); // Deliberate loss of generator state only.
  const reused=`A:${base62(generator.next('A'))}`;
  assert.equal(reused,id);
  assert.deepEqual(rows.create(reused,'second-menu'),{error:'collision'});
  assert.equal(rows.rows.get(id),'first-menu');
  // Assume an exclusive allocator supplies a never-reused incarnation7.
  const newId=`A:7:${base62(generator.next('A'))}`;
  assert.deepEqual(rows.create(newId,'second-menu'),{created:newId});
  // Deleting the registry guard permits an old external link to be reassigned.
  rows.rows.delete(id);
  rows.create(id,'third-menu');
  assert.equal(rows.rows.get(id),'third-menu');
  console.log('PASS3 restart: A:1 repeats; retained guard protects old destination. Deleted guard permits reuse.');
}

class RegisterPair {
  constructor(){this.a=0;this.b=0;this.connected=true;}
  disconnect(){this.connected=false;}
  writeAtA(value){this.a=value;if(this.connected)this.b=value;return {ack:true};}
  staleReadAtB(){return {value:this.b};}
  strictReadAtB(){return this.connected?{value:this.a}:{error:'cannot_confirm_latest'};}
  heal(){this.connected=true;this.b=this.a;} // One writer; no conflict resolution model.
}
function partitionCase() {
  const changed=new RegisterPair(),unchanged=new RegisterPair();
  changed.disconnect();unchanged.disconnect();
  assert.deepEqual(changed.writeAtA(1),{ack:true});
  assert.deepEqual(changed.staleReadAtB(),unchanged.staleReadAtB());
  assert.notEqual(changed.staleReadAtB().value,changed.a);
  assert.deepEqual(changed.strictReadAtB(),{error:'cannot_confirm_latest'});
  changed.heal();assert.deepEqual(changed.strictReadAtB(),{value:1});
  console.log('PASS4 partition: A acked1; B still reads0. Strict read refuses; after heal B reads1.');
}

function canReadPrivateSubmission(principal, submission) {
  // principal comes from a trusted verifier. A raw request object is NOT a principal.
  return Boolean(principal && principal.kind==='user' &&
    principal.tenant===submission.tenant &&
    principal.subject===submission.owner && principal.scopes.includes('submissions:read'));
}
function permissionCase() {
  const alice={kind:'user',subject:'alice',tenant:'school1',scopes:['submissions:read']};
  const own={owner:'alice',tenant:'school1'};
  assert(canReadPrivateSubmission(alice,own));
  assert(!canReadPrivateSubmission(alice,{owner:'bob',tenant:'school1'}));
  assert(!canReadPrivateSubmission(alice,{owner:'alice',tenant:'school2'}));
  assert(!canReadPrivateSubmission({...alice,scopes:[]},own));
  assert(!canReadPrivateSubmission({...alice,kind:'application'},own));
  assert(!canReadPrivateSubmission(null,own));
  console.log('PASS5 permission: own+tenant+scope passes; other owner/tenant, missing scope, application-only and anonymous fail.');
}

const cases={metrics:metricsCase,counters:countersCase,restart:restartCase,partition:partitionCase,permission:permissionCase};
const selected=process.argv[2];
if(selected && !Object.hasOwn(cases,selected))throw new Error(`Choose ${Object.keys(cases).join(', ')} or omit for all.`);
for(const fn of selected?[cases[selected]]:Object.values(cases))fn();
