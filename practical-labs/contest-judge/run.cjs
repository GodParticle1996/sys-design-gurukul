'use strict';
// Original deterministic models and trusted checker code. No user code execution.
const assert = require('node:assert/strict');
const experiments = {};
experiments.backlog = () => {
  const step=(q,arrivals,capacity)=>Math.max(0,q+arrivals-capacity);
  let q=0; for(let s=0;s<10;s++) q=step(q,12,8);
  assert.equal(q,40);
  assert.equal(step(q,12,12),40);
  let seconds=0; while(q>0){q=step(q,12,16);seconds++;}
  assert.equal(seconds,10);
  console.log('Burst: 12 arrivals/s - 8 completions/s for 10s => 40 waiting.');
  console.log('Capacity 12/s: backlog remains 40. Capacity 16/s: drains in 10s.');
  console.log('Assumed fluid rates; not a measured service or worker count.');
};
experiments.fairness = () => {
  // All jobs take 1 tick. Four slots. Running counts are shared in this model.
  const users=['spam','Ana','Ben','Cho'];
  const pending=new Map(users.map(u=>[u,u==='spam'?8:1]));
  let cursor=0;
  function round(cap){
    const running=new Map(users.map(u=>[u,0])), jobs=[];
    while(jobs.length<4){
      let found=false;
      for(let n=0;n<users.length;n++){
        const u=users[cursor++%users.length];
        if(pending.get(u)>0 && running.get(u)<cap){
          pending.set(u,pending.get(u)-1);running.set(u,running.get(u)+1);
          jobs.push(u);found=true;break;
        }
      }
      if(!found) break;
    }
    return jobs;
  }
  const first=round(2);assert.deepEqual(first,['spam','Ana','Ben','Cho']);
  const second=round(2);assert.deepEqual(second,['spam','spam']);
  console.log('FIFO first dispatch: spam, spam, spam, spam. Round-robin:',first.join(', '));
  console.log('Next tick only spam remains: 2 running, 2 idle because per-user cap=2.');
  console.log('Equal job turns do not imply equal CPU time. Jobs here finish at each tick.');
};
function closeNumber(actual,expected,absTol=1e-5,relTol=1e-5){
  if(!Number.isFinite(actual)||!Number.isFinite(expected)) return false;
  return Math.abs(actual-expected)<=Math.max(absTol,relTol*Math.abs(expected));
}
function sameMultiset(a,b){
  if(a.length!==b.length) return false;
  const counts=new Map(); for(const x of a) counts.set(x,(counts.get(x)||0)+1);
  for(const x of b){if(!counts.get(x))return false;counts.set(x,counts.get(x)-1);}
  return true;
}
experiments.checker = () => {
  assert(closeNumber(0.33333,1/3));assert(!closeNumber(0.34,1/3));
  assert(!closeNumber(NaN,1));assert(!closeNumber(Infinity,Infinity));
  assert(sameMultiset([1,2,2],[2,1,2]));assert(!sameMultiset([1,2,2],[1,1,2]));
  const fakeVerdict='AC'; const expected='3',actual='99';
  assert.equal(fakeVerdict==='AC',true);assert.equal(actual===expected,false);
  console.log('Trusted checker: close fraction PASS; 0.34/NaN/Infinity FAIL.');
  console.log('Unordered [1,2,2] vs [1,1,2] FAIL: duplicate counts differ.');
  console.log('User output says AC, but 99 != 3 => wrong answer. Never trust user verdict.');
};
const BASE=1_000_000;
function pack(solved,penalty){
  if(!Number.isSafeInteger(solved)||solved<0||!Number.isSafeInteger(penalty)||penalty<0||penalty>=BASE)
    throw new RangeError('integer solved>=0 and 0<=penalty<BASE required');
  const score=solved*BASE+(BASE-1-penalty);
  if(!Number.isSafeInteger(score))throw new RangeError('score exceeds safe integer range');
  return score;
}
experiments.score = () => {
  const rows=[['Ana',3,2400],['Ben',3,3000],['Cho',4,5000]];
  const board=rows.map(([user,n,p])=>({user,score:pack(n,p)})).sort((a,b)=>b.score-a.score);
  assert.deepEqual(board.map(r=>r.user),['Cho','Ana','Ben']);
  assert.equal(pack(3,2400),3997599);assert.equal(pack(3,3000),3996999);
  assert(pack(4,999999)>pack(3,0));
  for(const args of [[3,1000000],[3,-1],[3,1.5],[Number.MAX_SAFE_INTEGER,0]])assert.throws(()=>pack(...args),RangeError);
  assert.equal(pack(4,1000000-1),4000000);
  // Missing bound breaks solved-first ordering: 4 solved can rank below 3 solved.
  assert(4*BASE+(BASE-1-1000001)<3*BASE+(BASE-1-0));
  console.log('Packed ranking:',board.map((r,i)=>`${i+1}. ${r.user}=${r.score}`).join('; '));
  console.log('Out-of-range/fractional penalties and unsafe scores rejected. Equal scores need a tie policy.');
};
experiments.updates = async () => {
  let solved=3, arrived=0, release;
  const barrier=new Promise(r=>release=r);
  async function broken(){const old=solved;if(++arrived===2)release();await barrier;solved=old+1;}
  await Promise.all([broken(),broken()]);assert.equal(solved,4);
  const seen=new Set();solved=3;
  function apply(event){if(seen.has(event))return;seen.add(event);solved++;}
  apply('contest7:userA:problemX');apply('contest7:userA:problemY');apply('contest7:userA:problemX');
  assert.equal(solved,5);
  console.log('Actual Promise overlap: 3 -> 4 (lost update). Serialized deduped model: 3 -> 5.');
  console.log('RAM model only. No Redis script, crash durability or cross-database transaction proved.');
};
experiments.projection = () => {
  // Complete per-user aggregates from a canonical scoring owner; not partial deltas.
  const view=new Map();
  function apply(event){
    const key=JSON.stringify([event.contest,event.user]),old=view.get(key);
    if(old && event.revision<=old.revision)return false;
    pack(event.solved,event.penalty); // validate before mutation
    view.set(key,{...event});return true;
  }
  const v1={contest:'c7',user:'Ana',revision:1,solved:1,penalty:300};
  const v2={...v1,revision:2,solved:0,penalty:0}; // rejudge reverses accept
  assert(apply(v2));assert(!apply(v1));assert(!apply(v2));
  assert.equal(view.get('["c7","Ana"]').solved,0);
  assert(apply({...v1,contest:'c8'}));assert.equal(view.size,2);
  const before=JSON.stringify([...view]);
  assert.throws(()=>apply({...v2,revision:3,penalty:BASE}));assert.equal(JSON.stringify([...view]),before);
  view.clear();apply(v2);apply({...v1,contest:'c8'});assert.equal(view.size,2);
  console.log('Delivery revision2 -> revision1 -> revision2: c7/Ana stays 0 solved after rejudge.');
  console.log('c8/Ana is independent. Rebuild restores latest full aggregates.');
  console.log('Assumes one durable monotonic revision per contest/user; partial events cannot skip revisions this way.');
};
(async()=>{
  const selected=process.argv[2];
  if(selected && !Object.hasOwn(experiments,selected)) throw new Error('Choose '+Object.keys(experiments).join(', '));
  for(const [name,run] of Object.entries(experiments)) if(!selected||selected===name){await run();console.log('PASS '+name);}
})().catch(e=>{console.error(e);process.exitCode=1;});
