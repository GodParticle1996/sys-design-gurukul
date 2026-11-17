#!/usr/bin/env node
'use strict';
// Original deterministic models. No cloud, Redis, sockets or payment provider.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

function backlog(){
  function simulate(ready){
    const queue=[]; let waiting=0, peak=0; const at={};
    for(let t=0;t<240;t++){
      const arrivals=t<60?100:20, capacity=t<ready?20:100;
      queue.push({entered:t,n:arrivals}); waiting+=arrivals;
      let slots=capacity;
      while(slots && queue.length){
        const take=Math.min(slots,queue[0].n);
        slots-=take; queue[0].n-=take; waiting-=take;
        if(queue[0].n===0) queue.shift();
      }
      peak=Math.max(peak,waiting);
      at[t+1]={waiting,oldestAge:queue.length?t+1-queue[0].entered:0};
    }
    return {at,peak,drainedAt:Object.keys(at).map(Number).find(t=>t>=ready && at[t].waiting===0)};
  }
  const base=simulate(90), slow=simulate(120);
  assert.deepEqual(base.at[60],{waiting:4800,oldestAge:48});
  assert.deepEqual(base.at[90],{waiting:4800,oldestAge:72});
  assert.equal(base.drainedAt,150); assert.equal(slow.drainedAt,180);
  assert.equal(Math.ceil(667*3/8),251); assert.equal(Math.ceil(60*3/8),23);
  console.log('PASS backlog: queue60=4800 queue90=4800 oldestAge90=72s; drains at150s; boot120 drains at180s.');
  console.log('New FIFO job at90: about48s to start with100 starts/s. Execution time is additional. Exact667/s ×3s /8 =>251 machines before headroom.');
}

function upload(){
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  const objects=new Map([['V7/version1',hash('old audio')],['V7/version2',hash('fixed audio')]]);
  const current={generation:2,key:'V7/version2',checksum:hash('fixed audio'),done:new Set(),manifest:false};
  const required=['480p','1080p'];
  function record(e){
    if(!e.authorized || e.generation!==current.generation || e.key!==current.key ||
       e.checksum!==current.checksum || objects.get(e.key)!==e.checksum) return false;
    if(e.quality) current.done.add(e.quality);
    if(e.manifestStored) current.manifest=true;
    return true;
  }
  const ready=()=>current.manifest && required.every(q=>current.done.has(q));
  const event={authorized:true,generation:2,key:current.key,checksum:current.checksum};
  assert.equal(record({...event,generation:1,key:'V7/version1',quality:'1080p'}),false);
  assert.equal(record({...event,authorized:false,quality:'1080p'}),false);
  assert.equal(record({...event,checksum:hash('wrong'),quality:'1080p'}),false);
  record({...event,quality:'480p'}); assert.equal(ready(),false);
  record({...event,quality:'1080p'}); assert.equal(ready(),false);
  record({...event,manifestStored:true}); assert.equal(ready(),true);
  record({...event,quality:'480p'}); assert.equal(current.done.size,2);
  console.log('PASS upload: old/unauthorized/wrong-checksum callbacks rejected;480p=false;both qualities=false;manifest=true;duplicate harmless.');
}

function search(){
  const index=new Map();
  function apply(e){
    const key=JSON.stringify([e.tenant,e.id]), old=index.get(key);
    if(old && old.revision>=e.revision) return false;
    // Retain deleted revision so a late full-state edit cannot resurrect it.
    index.set(key,{...e}); return true;
  }
  const deleted={tenant:'teamA',id:17,revision:3,deleted:true};
  assert(apply(deleted));
  assert.equal(apply({...deleted,revision:2,deleted:false,text:'system design'}),false);
  assert.equal(apply(deleted),false);
  assert(apply({...deleted,tenant:'teamB',revision:1,deleted:false,text:'private'}));
  assert.equal(index.get(JSON.stringify(['teamA',17])).deleted,true);
  // Current permissions are checked independently from a stale result cache.
  const cached=[17,18], current=new Map([[17,{deleted:true,readers:['bob']}],[18,{deleted:false,readers:['alice']}]]);
  const visible=cached.filter(id=>{const p=current.get(id);return p && !p.deleted && p.readers.includes('bob');});
  assert.deepEqual(visible,[]);
  console.log('PASS search: delete3 survives edit2 and duplicate3; tenantB revision1 remains independent; stale cached results fail current visibility checks.');
}

function chat(){
  function scenario(safe){
    const db=[1,2,3,4,5], seen=new Set([1,2,3]); let cursor=3, subscribed=false; const buffer=[];
    function write(seq,drop=false){db.push(seq);if(subscribed && !drop) buffer.push(seq);}
    function receive(seq){seen.add(seq);while(seen.has(cursor+1))cursor++;}
    if(!safe){
      db.filter(n=>n>3).forEach(receive); write(6); subscribed=true;
      return {cursor,db};
    }
    subscribed=true; // Models an acknowledged subscription before the snapshot.
    const highWater=db.at(-1);
    write(6); // Between snapshot and replay; must stay in the live buffer.
    db.filter(n=>n>cursor && n<=highWater).forEach(receive);
    buffer.push(6); buffer.forEach(receive); assert.equal(cursor,6);
    write(7,true); assert.equal(cursor,6); // Notification loss needs durable catch-up.
    db.filter(n=>n>cursor).forEach(receive); assert.equal(cursor,7);
    return {cursor,db};
  }
  assert.equal(scenario(false).cursor,5); assert.equal(scenario(true).cursor,7);
  let cursor=3; const received=new Set();
  const add=n=>{received.add(n);while(received.has(cursor+1))cursor++;};
  add(5); assert.equal(cursor,3); add(4); assert.equal(cursor,5);
  console.log('PASS chat: naive reconnect misses6; subscribe/buffer/replay gets6 once; DB catch-up recovers dropped7; receiving5 before4 keeps cursor3.');
}

function admission(){
  // Fixed key is only a local fixture. Production secrets and replay state need owners.
  const secret='local-exercise-only', used=new Set();
  const sign=body=>crypto.createHmac('sha256',secret).update(body).digest('hex');
  const body=JSON.stringify({concert:'C7',user:'bob',session:'s2',expires:900,nonce:'n1'});
  function enter(token,request){
    const expected=Buffer.from(sign(token.body),'hex'), supplied=Buffer.from(token.signature,'hex');
    if(expected.length!==supplied.length || !crypto.timingSafeEqual(expected,supplied))return false;
    const claim=JSON.parse(token.body);
    if(claim.concert!==request.concert || claim.user!==request.user || claim.session!==request.session || request.now>=claim.expires || used.has(claim.nonce))return false;
    used.add(claim.nonce);return true;
  }
  const token={body,signature:sign(body)}, req={concert:'C7',user:'bob',session:'s2',now:700};
  for(const bad of [{concert:'C8'},{user:'alice'},{session:'s3'},{now:900}])assert.equal(enter(token,{...req,...bad}),false);
  assert.equal(enter({...token,body:body.replace('C7','C8')},req),false);
  assert.equal(enter(token,req),true); assert.equal(enter(token,req),false);
  const seat={owner:'alice'}; assert.notEqual(seat.owner,req.user);
  console.log('PASS admission: wrong concert/user/session, expiry, tamper and reuse rejected; Bob admitted once but still does not own Alice’s seat.');
}

function feed(){
  const posts=new Map([
    ['P1',{id:'P1',createdAt:100,readers:['bob']}],
    ['P2',{id:'P2',createdAt:100,readers:['bob']}],
    ['P3',{id:'P3',createdAt:110,readers:['alice']}],
    ['P4',{id:'P4',createdAt:90,readers:['bob'],deleted:true}],
    ['P5',{id:'P5',createdAt:80,readers:['bob']}]
  ]);
  const compare=(a,b)=>b.createdAt-a.createdAt || (a.id>b.id?-1:a.id<b.id?1:0);
  const merge=(viewer,after=null)=>[...new Set(['P1','P2','P4','P2','P3','P5'])]
    .map(id=>posts.get(id)).filter(p=>p && !p.deleted && p.readers.includes(viewer))
    .sort(compare).filter(p=>!after || compare(p,after)>0);
  const first=merge('bob')[0]; assert.equal(first.id,'P2');
  assert.deepEqual(merge('bob',first).map(p=>p.id),['P1','P5']);
  assert.deepEqual(merge('alice').map(p=>p.id),['P3']);
  // Illustrative weighted work, not latency or a production crossover point.
  const work=(postsPerDay,followers,activeReadsPerDay)=>({push:postsPerDay*followers,pull:activeReadsPerDay*5});
  assert.deepEqual(work(24,100000,1000),{push:2400000,pull:5000});
  assert.deepEqual(work(1,100000,1000000),{push:100000,pull:5000000});
  console.log('PASS feed: Bob P2,P1,P5; next page afterP2 keeps tiedP1; Alice onlyP3; duplicates/private/deleted posts removed.');
  console.log('Assumed work/day: caseA push2400000 pull5000; caseB push100000 pull5000000. Same follower count, different costs.');
}

const experiments={backlog,upload,search,chat,admission,feed};
const selected=process.argv[2] || 'all';
if(selected!=='all' && !experiments[selected]){console.error('Choose all, '+Object.keys(experiments).join(', '));process.exit(2);}
for(const [name,run] of Object.entries(experiments))if(selected==='all'||selected===name)run();
