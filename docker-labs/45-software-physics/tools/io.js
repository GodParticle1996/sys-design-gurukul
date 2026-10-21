const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { now } = require('../lib/util');
const blocks=1024, unit=4096;
const sequential=Array.from({length:blocks},(_,i)=>i);
const shuffled=sequential.slice();
let seed=7;
for (let i=blocks-1;i>0;i--) {
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
}
async function scan(file, positions, size) {
  const buffer=Buffer.alloc(size); let ops=0, bytes=0, checksum=0;
  const start=now();
  for (const block of positions) {
    let filled=0;
    while (filled<size) {
      const r=await file.read(buffer,filled,size-filled,block*unit+filled);
      if (!r.bytesRead) throw Error('unexpected EOF');
      filled+=r.bytesRead; ops++;
    }
    bytes+=filled;
    for (let i=0;i<filled;i+=unit) checksum+=buffer[i];
  }
  return {ops,bytes,checksum,ms:now()-start};
}
(async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gurukul-physics-'));
  let file;
  try {
    const data=Buffer.alloc(blocks*unit);
    for (let i=0;i<blocks;i++) data.fill(i%251,i*unit,(i+1)*unit);
    const name=path.join(dir,'data.bin');
    await fs.writeFile(name,data);
    await fs.readFile(name); // Deliberately warm page cache.
    file=await fs.open(name,'r');
    console.log('ASLI file reads; warm page cache; 4 MiB; disk hardware benchmark NAHI');
    const cases=[['seq4k',sequential,unit],['shuffle4k',shuffled,unit],
      ['seq64k',sequential.filter(i=>i%16===0),unit*16]];
    const expected=sequential.reduce((s,i)=>s+i%251,0);
    for (const [label,positions,size] of cases) {
      const r=await scan(file,positions,size);
      assert.equal(r.bytes,data.length); assert.equal(r.checksum,expected);
      console.log(`${label}: reads=${r.ops} bytes=${r.bytes} checksum=${r.checksum} elapsed=${r.ms.toFixed(2)} ms`);
    }
  } finally {
    if (file) await file.close();
    await fs.rm(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
