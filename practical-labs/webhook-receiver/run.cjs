'use strict';
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {sign,verify}=require('./signature.cjs');
// A fresh test secret stays in memory and is never printed or loaded from .env.
const secret=randomBytes(32), now=1800000000;
const raw=Buffer.from('{ "id": "evt-1", "amount": 100 }');
const header=sign(raw,secret,now);
const cases=[
  ['Original bytes, fresh timestamp',raw,header,now,true],
  ['Same JSON values, different whitespace',Buffer.from(JSON.stringify(JSON.parse(raw))),header,now,false],
  ['Amount changed after signing',Buffer.from(raw.toString().replace('100','999')),header,now,false],
  ['Same signed delivery 301 seconds later',raw,header,now+301,false],
  ['Same event, sender signs a fresh retry',raw,sign(raw,secret,now+301),now+301,true],
  ['Same delivery twice inside freshness window',raw,header,now+1,true],
  ['Timestamp from far future',raw,sign(raw,secret,now+1000),now,false],
  ['Malformed header',raw,'t=bad,v1=00',now,false]
];
for(const [label,body,sig,time,expected] of cases){
  const actual=verify(body,sig,secret,time);
  assert.equal(actual,expected,label);
  console.log(`${actual?'ACCEPT':'REJECT'} · ${label}`);
}
assert.equal(verify(raw,header,randomBytes(32),now),false);
assert.equal(verify(raw,header,secret,now,0),false);
assert.equal(verify(Buffer.alloc(65537),header,secret,now),false);
console.log('PASS: actual HMAC checks. A fresh valid signature does not prove that evt-1 has not already been processed.');
