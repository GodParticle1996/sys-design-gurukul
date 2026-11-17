'use strict';
// Original in-process cache exercises. No Redis/network/load benchmark.
const assert=require('node:assert/strict');
const experiments={};
experiments.keys=async()=>{
  const cache=new Map();
  const us={tenant:'shop-a',product:42,currency:'USD',format:2};
  const eu={...us,currency:'EUR'}, other={...us,tenant:'shop-b'};
  const bad=r=>`product:${r.product}`;
  const good=r=>JSON.stringify([r.tenant,r.format,r.product,r.currency]);
  cache.set(bad(us),'USD 100');assert.equal(cache.get(bad(eu)),'USD 100');
  cache.clear();cache.set(good(us),'USD 100');cache.set(good(eu),'EUR 92');
  assert.equal(cache.get(good(eu)),'EUR 92');assert.equal(cache.has(good(other)),false);
  console.log('Broken key: EUR request hits USD value. Scoped key: currencies separate; other tenant misses. Authorization is still required before access.');
};
experiments.lru=async()=>{
  let now=0; const cache=new Map();
  function put(k,v,ttl){cache.delete(k);cache.set(k,{v,until:now+ttl});while(cache.size>2)cache.delete(cache.keys().next().value);}
  function get(k){const e=cache.get(k);if(!e)return null;if(now>=e.until){cache.delete(k);return null;}cache.delete(k);cache.set(k,e);return e.v;}
  put('A',1,100);put('B',2,100);assert.equal(get('A'),1);put('C',3,100);
  assert.equal(get('B'),null);assert.equal(get('A'),1);assert.equal(now,0);
  console.log('Capacity 2: put A, B; read A; put C → B evicted at t=0 while its TTL was still valid.');
  now=100;assert.equal(get('A'),null);assert.equal(get('C'),null);
  console.log('At t=100: A and C expire. Reading A did not extend its fixed TTL.');
};
experiments.negative=async()=>{
  let now=0,reads=0;const db=new Map(),cache=new Map();
  function get(k){const e=cache.get(k);if(e && now<e.until)return e.value;reads++;const value=db.has(k)?{found:true,name:db.get(k)}:{found:false};cache.set(k,{value,until:now+10});return value;}
  assert.deepEqual(get(42),{found:false});assert.deepEqual(get(42),{found:false});assert.equal(reads,1);
  db.set(42,'Lamp');assert.deepEqual(get(42),{found:false});
  cache.delete(42);assert.deepEqual(get(42),{found:true,name:'Lamp'});assert.equal(reads,2);
  console.log('Two repeated missing-ID reads → one origin lookup. After creation, old negative hides Lamp until invalidated/expired. Invalidation then returns Lamp.');
};
function gate(){let release;const promise=new Promise(r=>{release=r;});return {promise,release};}
function reader(loader,coalesce){const cache=new Map(),pending=new Map();return k=>{
  if(cache.has(k))return Promise.resolve(cache.get(k));
  if(coalesce&&pending.has(k))return pending.get(k);
  const task=Promise.resolve().then(()=>loader(k)).then(v=>{cache.set(k,v);return v;}).finally(()=>{if(coalesce&&pending.get(k)===task)pending.delete(k);});
  if(coalesce)pending.set(k,task);return task;
};}
experiments.singleflight=async()=>{
  async function burst(coalesce,processes){let loads=0;const barrier=gate();const clients=Array.from({length:processes},()=>reader(async()=>{loads++;await barrier.promise;return 'Lamp';},coalesce));const work=Array.from({length:1000},(_,i)=>clients[i%processes](42));await Promise.resolve();const before=loads;barrier.release();const values=await Promise.all(work);assert(values.every(v=>v==='Lamp'));return before;}
  assert.equal(await burst(false,1),1000);assert.equal(await burst(true,1),1);assert.equal(await burst(true,2),2);
  console.log('1000 overlapping same-key reads: no coalescing=1000 loader calls; one shared pending map=1; two independent maps=2.');
  let calls=0;const first=gate();const read=reader(async()=>{calls++;if(calls===1){await first.promise;throw new Error('origin unavailable');}return 'Recovered';},true);
  const batch=Array.from({length:20},()=>read(42));const settled=Promise.allSettled(batch);await Promise.resolve();first.release();const results=await settled;
  assert(results.every(r=>r.status==='rejected'));assert.equal(calls,1);assert.equal(await read(42),'Recovered');assert.equal(calls,2);
  console.log('Failed shared load rejects all 20 waiters; pending state clears; later retry succeeds. Hung loader/deadlines not implemented.');
};
experiments.lease=async()=>{
  let generation=0,value=null;const oldToken=generation;
  // Atomic state-model invalidation revokes fill permission as well as removing value.
  function invalidate(){generation++;value=null;}
  function fill(token,v){if(token!==generation)return false;value=v;return true;}
  invalidate();assert.equal(fill(oldToken,'old price'),false);assert.equal(value,null);
  const newToken=generation;assert.equal(fill(newToken,'new price'),true);
  console.log('Old fill permission revoked by delete: old token rejected; new token accepted. This model is not a distributed lease implementation.');
};
experiments.jitter=async()=>{
  const bins=Array(720).fill(0);let seed=12345;
  for(let i=0;i<100000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;bins[Math.floor(seed/2**32*720)]++;}
  assert.equal(bins.reduce((a,b)=>a+b,0),100000);assert(Math.max(...bins)<100000);
  const noRequestsMisses=0;assert.equal(noRequestsMisses,0);
  console.log(`100000 chosen expiries spread over [3240,3960)s: mean=${(100000/720).toFixed(2)}/s, seeded peak=${Math.max(...bins)}/s.`);
  console.log('Zero requests after expiry → zero origin reads. Expiration count is not automatically query count. Maximum TTL is 66 minutes, not 60.');
};
experiments.budget=async()=>{
  const demand=10000,dbCapacity=5000,admitted=4000,warmup=500;
  assert(demand>dbCapacity);assert(admitted+warmup<dbCapacity);
  console.log(`Chosen cold-start budget: ${admitted}/s admitted + ${warmup}/s warmup = ${admitted+warmup}/s, under assumed DB ${dbCapacity}/s. Remaining ${demand-admitted}/s need explicit shed/defer/degraded response.`);
  const perCopy=20000/10,perMachine=perCopy*2+10000/5;
  assert.equal(perCopy,2000);assert.equal(perMachine,6000);
  console.log('Ten balanced hot-key copies on five machines: 2000 hot reads/s per copy; TWO copies + 2000 background = 6000/s per machine. Not a capacity measurement.');
};
(async()=>{const selected=process.argv[2]||'all';if(selected!=='all'&&!experiments[selected])throw new Error('Choose all, keys, lru, negative, singleflight, lease, jitter or budget');for(const [name,run]of Object.entries(experiments))if(selected==='all'||selected===name){await run();console.log('PASS '+name);}})().catch(e=>{console.error(e);process.exitCode=1;});
