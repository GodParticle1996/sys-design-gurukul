'use strict';
// Deterministic local models. No Uber API, sockets, database or GPS device.
const assert = require('node:assert/strict');
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const cell = (p,width) => `${Math.floor(p.x/width)},${Math.floor(p.y/width)}`;
function cover(p,r,width) {
  const keys=new Set();
  for(let x=Math.floor((p.x-r)/width);x<=Math.floor((p.x+r)/width);x++)
    for(let y=Math.floor((p.y-r)/width);y<=Math.floor((p.y+r)/width);y++) keys.add(`${x},${y}`);
  return keys;
}
function nearby(points,p,r,width) {
  const keys=cover(p,r,width);
  return points.filter(d=>keys.has(cell(d,width))).filter(d=>distance(d,p)<=r);
}
const ids = points => points.map(p=>p.id).sort();
function gridCase() {
  const rider={x:99,y:50}, drivers=[{id:'A',x:102,y:50},{id:'B',x:104,y:55}];
  assert.deepEqual(drivers.filter(d=>cell(d,100)===cell(rider,100)),[]);
  assert.deepEqual(ids(nearby(drivers,rider,5,100)),['A']);
  assert.equal(distance(drivers[0],rider),3);
  assert(distance(drivers[1],rider)>5);
  const far={id:'C',x:300,y:50}; //201m away, two columns beyond cell1.
  assert.deepEqual(ids(nearby([far],rider,250,100)),['C']);
  const [cx,cy]=cell(rider,100).split(',').map(Number);
  const nine=new Set();for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)nine.add(`${x},${y}`);
  assert(!nine.has(cell(far,100)));
  console.log('PASS1 grid: same-cell misses A; radius5 returns A only; fixed9 cells miss C at radius250.');
}
const contains=(b,p)=>p.x>=b.x0&&p.x<=b.x1&&p.y>=b.y0&&p.y<=b.y1;
const intersects=(a,b)=>a.x0<=b.x1&&a.x1>=b.x0&&a.y0<=b.y1&&a.y1>=b.y0;
class Quad {
  constructor(box,depth=0){this.box=box;this.depth=depth;this.points=[];this.children=null;}
  insert(p) {
    if(!contains(this.box,p))return false;
    if(this.children)return this.children.some(c=>c.insert(p));
    if(this.points.length<4||this.depth===8){this.points.push(p);return true;}
    const {x0,y0,x1,y1}=this.box,xm=(x0+x1)/2,ym=(y0+y1)/2;
    this.children=[{x0,y0,x1:xm,y1:ym},{x0:xm,y0,x1,y1:ym},{x0,y0:ym,x1:xm,y1},{x0:xm,y0:ym,x1,y1}].map(b=>new Quad(b,this.depth+1));
    for(const old of this.points)assert(this.children.some(c=>c.insert(old)));
    this.points=[];return this.children.some(c=>c.insert(p));
  }
  query(box,out=[]) {
    if(!intersects(this.box,box))return out;
    for(const p of this.points)if(contains(box,p))out.push(p);
    if(this.children)for(const c of this.children)c.query(box,out);
    return out;
  }
  deepest(){return this.children?Math.max(...this.children.map(c=>c.deepest())):this.depth;}
}
function quadCase() {
  const points=Array.from({length:400},(_,id)=>({id:String(id),x:(id*37)%1024,y:(id*79)%1024}));
  for(let i=0;i<30;i++)points.push({id:`same-${i}`,x:512,y:512});
  const build=()=>{const tree=new Quad({x0:0,y0:0,x1:1024,y1:1024});for(const p of points)assert(tree.insert({...p}));return tree;};
  let tree=build();assert.equal(tree.deepest(),8);assert(!tree.insert({id:'outside',x:1025,y:0}));
  const p={x:512,y:512},r=70,box={x0:p.x-r,y0:p.y-r,x1:p.x+r,y1:p.y+r};
  const treeIds=t=>ids(t.query(box).filter(d=>distance(d,p)<=r));
  assert.deepEqual(treeIds(tree),ids(points.filter(d=>distance(d,p)<=r)));
  points[0].x=512;points[0].y=512; //tree still holds an older copy.
  assert(!treeIds(tree).includes('0'));
  tree=build();assert(treeIds(tree).includes('0'));
  assert.equal(new Set(tree.query(box).map(d=>d.id)).size,tree.query(box).length);
  console.log('PASS2 quadtree: full-scan parity, 30 coincident points, depth8 cap, movement needs maintenance.');
}
class AssignmentOwner {
  constructor(){this.drivers=new Map();this.offers=new Map();this.serial=0;}
  offer(driver,ride,id,now,ttl=15) {
    assert(ttl>0&&!this.offers.has(id),'Unique offer attempt and positive TTL required');
    const current=this.drivers.get(driver);
    if(current?.state==='assigned')return null;
    if(current?.state==='offered'&&now<current.expires)return null;
    if(current?.state==='offered')current.state='expired';
    const item={driver,ride,id,state:'offered',expires:now+ttl,result:null};
    this.offers.set(id,item);this.drivers.set(driver,item);return id;
  }
  accept(driver,ride,id,now) {
    const item=this.offers.get(id);
    if(!item||item.driver!==driver||item.ride!==ride)return {error:'identity_mismatch'};
    if(item.state==='assigned')return {...item.result};
    if(this.drivers.get(driver)!==item||item.state!=='offered')return {error:'stale_offer'};
    if(now>=item.expires){item.state='expired';this.drivers.delete(driver);return {error:'expired'};}
    item.state='assigned';item.result={assignment:`A${++this.serial}`,driver,ride};return {...item.result};
  }
  cancel(driver,ride,id) {
    const item=this.drivers.get(driver);
    if(!item||item.id!==id||item.ride!==ride)return false;
    item.state='cancelled';this.drivers.delete(driver);return true;
  }
}
function offerCase() {
  const owner=new AssignmentOwner();
  assert.equal(owner.offer('D','R1','O1',0),'O1');
  assert.equal(owner.offer('D','R2','loser',0),null);
  assert.equal(owner.offer('D','R2','O2',15),'O2');
  assert.equal(owner.accept('D','R1','O1',16).error,'stale_offer');
  assert.equal(owner.cancel('D','R1','O1'),false);
  assert.equal(owner.drivers.get('D').id,'O2');
  const result=owner.accept('D','R2','O2',17);
  assert.deepEqual(result,{assignment:'A1',driver:'D',ride:'R2'});
  assert.deepEqual(owner.accept('D','R2','O2',18),result);
  assert.equal(owner.serial,1);
  assert.equal(owner.accept('D','changed-ride','O2',18).error,'identity_mismatch');
  console.log('PASS3 offers: one owner; late O1 rejected; O2 survives old cleanup; retry returns A1.');
}
function cancelCase() {
  const a=new AssignmentOwner();a.offer('D','R1','O1',0);
  assert(a.cancel('D','R1','O1'));assert.equal(a.accept('D','R1','O1',1).error,'stale_offer');
  const b=new AssignmentOwner();b.offer('D','R1','O1',0);
  assert.equal(b.accept('D','R1','O1',1).assignment,'A1');assert(b.cancel('D','R1','O1'));
  assert.equal(b.offer('D','R2','O2',2),'O2');
  assert.equal(b.cancel('D','R1','O1'),false);assert.equal(b.drivers.get('D').id,'O2');
  const c=new AssignmentOwner();c.offer('D','R1','O1',0);
  assert.equal(c.accept('D','R1','O1',15).error,'expired');
  console.log('PASS4 cancellation: both serialized orders checked; exact expiry rejects; stale cleanup cannot clear O2.');
}
class LocationOwner {
  constructor(){this.generation=0;this.snapshot=null;}
  reconnect(){this.generation++;this.snapshot=null;return this.generation;}
  update(generation,seq,x,now) {
    if(generation!==this.generation||!Number.isInteger(seq)||seq<1||!Number.isFinite(x))return false;
    if(this.snapshot&&seq<=this.snapshot.seq)return false;
    this.snapshot={generation,seq,x,acceptedAt:now};return true;
  }
  fresh(now,ttl=20){return !!this.snapshot&&now>=this.snapshot.acceptedAt&&now-this.snapshot.acceptedAt<ttl;}
}
function locationCase() {
  const loc=new LocationOwner();for(let i=0;i<7;i++)loc.reconnect();
  assert(loc.update(7,12,102,10));assert(!loc.update(7,11,70,11));
  assert(!loc.update(7,12,102,29));assert.equal(loc.snapshot.acceptedAt,10);
  assert(loc.fresh(29));assert(!loc.fresh(30));
  assert.equal(loc.reconnect(),8);assert(!loc.fresh(30));
  assert(loc.update(8,1,105,31));assert(!loc.update(7,99,0,32));
  assert.equal(loc.snapshot.x,105);
  console.log('PASS5 locations: seq12 survives11; duplicates do not refresh20s TTL; new session8 rejects old7.');
}
function capacityCase() {
  const ridesPerDay=10_000_000,activeDrivers=1_000_000,updateInterval=4,bytesPerRide=1000;
  const average=ridesPerDay/86400,updates=activeDrivers/updateInterval,raw=ridesPerDay*365*5*bytesPerRide;
  assert.equal(updates,250000);assert.equal(raw/1e12,18.25);
  console.log(`PASS6 arithmetic: average rides/s=${average.toFixed(2)}; scheduled GPS/s=${updates}; raw ride TB=${raw/1e12}. Peaks/history/replicas extra.`);
}
for(const test of [gridCase,quadCase,offerCase,cancelCase,locationCase,capacityCase])test();
