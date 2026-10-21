const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { call } = require('../lib/http');
const url = 'http://localhost:5404';
let child;
async function start() {
  child = spawn(process.execPath, [path.join(__dirname, '../services/broker.js')], {
    env: { ...process.env, PORT: '5404' }, stdio: ['ignore','pipe','pipe'],
  });
  await new Promise((resolve,reject) => {
    let output='';
    const timer=setTimeout(()=>reject(Error('broker startup timed out')),5000);
    child.stdout.on('data',data=>{output+=data;if(output.includes('ready :5404')){clearTimeout(timer);resolve();}});
    child.once('error',e=>{clearTimeout(timer);reject(e);});
    child.once('exit',code=>{clearTimeout(timer);reject(Error('broker exited '+code));});
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const ended=once(child,'exit');child.kill('SIGTERM');await ended;
}
(async()=>{
  await start();
  for(let id=1;id<=4;id++)await call(url,'/publish',{id:'order-'+id,type:'OrderPlaced',data:{id}});
  const before=await call(url,'/state');
  await stop();await start();
  const after=await call(url,'/state');
  console.log(`asli broker process restart: kitchen ${before.kitchen} → ${after.kitchen} · notify ${before.notify} → ${after.notify}`);
  console.log('publish ke HTTP jawab mil chuke the; RAM ki 8 pending copies gayi');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(stop);
