'use strict';
const assert=require('node:assert/strict');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function asyncRace(){
  let seats=1;const arrived=deferred(),release=deferred();let reads=0;
  async function buy(){const available=seats>0;if(++reads===2)arrived.resolve();await release.promise;if(available){seats--;return true;}return false;}
  const a=buy(),b=buy();await arrived.promise;assert.equal(seats,1);release.resolve();
  assert.deepEqual(await Promise.all([a,b]),[true,true]);assert.equal(seats,-1);
  console.log('One JS event loop: both read availability before await resumes → two confirmations, seats=-1.');
  seats=1;
  // This tiny synchronous RAM mutation has no await. It is NOT a distributed DB transaction.
  function claim(){if(seats<=0)return false;seats--;return true;}
  const results=await Promise.all([Promise.resolve().then(claim),Promise.resolve().then(claim)]);
  assert.deepEqual(results,[true,false]);assert.equal(seats,0);
  console.log('Synchronous same-loop RAM claim → one success, seats=0. Cross-process state needs shared protection.');
}
async function ownerQueue(){
  async function execute(serial){
    let active=0,peak=0,seats=1;const barrier=deferred();let started=0;
    async function handler(){active++;peak=Math.max(peak,active);const available=seats>0;
      if(serial)await Promise.resolve();else{if(++started===2)barrier.resolve();await barrier.promise;}
      if(available)seats--;active--;return available;}
    let outcomes;
    if(serial){outcomes=[];for(const job of [1,2])outcomes.push(await handler(job));}
    else outcomes=await Promise.all([handler(),handler()]);
    return {peak,seats,outcomes};
  }
  assert.deepEqual(await execute(false),{peak:2,seats:-1,outcomes:[true,true]});
  assert.deepEqual(await execute(true),{peak:1,seats:0,outcomes:[true,false]});
  console.log('One consumer that launches handlers concurrently still races. Await each whole handler → peak=1, one reservation.');
}
async function fence(){
  function resource(){let highest=32,events=[];return {write(token,event){if(token<highest)return false;highest=token;events.push(event);return true;},state:()=>({highest,events})};}
  const r=resource();assert(r.write(34,'B'));assert.equal(r.write(33,'late A'),false);
  assert.deepEqual(r.state(),{highest:34,events:['B']});
  console.log('Resource has accepted token34; delayed token33 rejected. Comparison plus mutation is one synchronous model operation.');
  const gap=resource();const issuedButNotPropagated=34;assert.equal(issuedButNotPropagated,34);
  assert(gap.write(33,'A before resource saw34'));assert(gap.write(34,'B'));
  assert(gap.write(34,'B retry'));assert.equal(gap.state().events.length,3);
  console.log('Before resource sees34, old33 can pass. Same-token retry also passes: fencing alone is not operation deduplication.');
}
const exercises={async:asyncRace,owner:ownerQueue,fence};
(async()=>{const name=process.argv[2]||'all';if(name!=='all'&&!exercises[name])throw Error('Choose all, async, owner or fence');for(const [key,fn]of Object.entries(exercises))if(name==='all'||name===key){await fn();console.log('PASS '+key);}})().catch(e=>{console.error(e);process.exitCode=1;});
