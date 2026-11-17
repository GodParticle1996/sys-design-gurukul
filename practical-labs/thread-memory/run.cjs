'use strict';
const {Worker,isMainThread,parentPort,workerData,threadId}=require('node:worker_threads');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

if (!isMainThread) {
  const {mode,object,buffer}=workerData;
  const cells=buffer && new Int32Array(buffer);
  if(mode==='clone') {object.value=7;parentPort.postMessage({value:object.value,pid:process.pid,threadId});}
  else if(mode==='share') {Atomics.store(cells,0,7);parentPort.postMessage({value:Atomics.load(cells,0)});}
  else if(mode==='throw') throw new Error('deliberate worker exception');
  else {
    const before=Atomics.load(cells,0);
    // Parent releases both workers only after BOTH have reported this read.
    parentPort.postMessage({ready:true,before});
    parentPort.once('message',()=>{
      if(mode==='race') Atomics.store(cells,0,before+1);
      else if(mode==='atomic') Atomics.add(cells,0,1);
      else throw new Error('unknown mode');
      parentPort.postMessage({finished:true});
    });
  }
} else {
  async function workers(mode,count=1,extra={}) {
    const running=[],messages=[],errors=[];
    let ready=0;
    try {
      const jobs=Array.from({length:count},()=>new Promise((resolve,reject)=>{
        const w=new Worker(__filename,{workerData:{mode,...extra}}); running.push(w);
        const timer=setTimeout(()=>reject(new Error('worker timed out')),10000);
        w.on('message',m=>{
          messages.push(m);
          if(m.ready && ++ready===count) for(const target of running) target.postMessage('go');
        });
        w.on('error',e=>errors.push(e.message));
        w.on('exit',code=>{clearTimeout(timer);resolve(code);});
      }));
      const codes=await Promise.all(jobs);
      return {messages,errors,codes};
    } finally {await Promise.all(running.map(w=>w.terminate()));}
  }
  async function childExit() {
    return new Promise((resolve,reject)=>{
      // Only this fresh child exits. No shared process or service is stopped.
      const child=spawn(process.execPath,['-e','process.exit(7)'],{stdio:'ignore'});
      const timer=setTimeout(()=>{child.kill();reject(new Error('child timed out'));},10000);
      child.on('error',e=>{clearTimeout(timer);reject(e);});
      child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
    });
  }
  async function main() {
    let passed=0;
    async function check(name,fn){await fn();console.log('PASS '+name);passed++;}
    await check('workerData object is copied: parent 0, worker 7; same PID, different thread',async()=>{
      const original={value:0};const r=await workers('clone',1,{object:original});
      assert.deepEqual(r.errors,[]);assert.deepEqual(r.codes,[0]);
      assert.equal(original.value,0);assert.equal(r.messages[0].value,7);
      assert.equal(r.messages[0].pid,process.pid);assert.notEqual(r.messages[0].threadId,threadId);
    });
    await check('SharedArrayBuffer: worker writes 7, parent observes 7',async()=>{
      const buffer=new SharedArrayBuffer(4);const r=await workers('share',1,{buffer});
      assert.deepEqual(r.errors,[]);assert.deepEqual(r.codes,[0]);assert.equal(Atomics.load(new Int32Array(buffer),0),7);
    });
    for(const [mode,expected] of [['race',1],['atomic',2]]) {
      await check(`${mode}: two workers read 0 before release; final count ${expected}`,async()=>{
        const buffer=new SharedArrayBuffer(4);const r=await workers(mode,2,{buffer});
        assert.deepEqual(r.errors,[]);assert.deepEqual(r.codes,[0,0]);
        assert.deepEqual(r.messages.filter(m=>m.ready).map(m=>m.before),[0,0]);
        assert.equal(r.messages.filter(m=>m.finished).length,2);
        assert.equal(Atomics.load(new Int32Array(buffer),0),expected);
      });
    }
    await check('worker JS exception observed; parent continues',async()=>{
      const r=await workers('throw');assert.deepEqual(r.errors,['deliberate worker exception']);assert.deepEqual(r.codes,[1]);
    });
    await check('fresh child exits 7; parent observes exit and continues',async()=>{
      assert.deepEqual(await childExit(),{code:7,signal:null});
    });
    console.log(`${passed} real Node thread/process checks passed. No speedup, native-crash or host-failure guarantee measured.`);
  }
  main().catch(e=>{console.error(e);process.exitCode=1;});
}
