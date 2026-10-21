const { spawn } = require('node:child_process');
const path = require('node:path');
const args = {
  'ex0-slowmo': ['tools/slowmo.js'],
  'ex1-http': ['services/cache.js'],
  'ex2-math': ['tools/math.js'],
  'ex3-queue': ['tools/queue.js'],
  'ex4-io': ['tools/io.js'],
};
const spec=args[process.argv[2]];
if (!spec) {
  console.log('npm start '+Object.keys(args).join(' | '));
  if (process.argv[2]) process.exitCode=1;
} else {
  const child=spawn(process.execPath,
    [path.join(__dirname,spec[0]),...process.argv.slice(3)],
    {stdio:'inherit'});
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
  child.on('error',e=>{console.error(e);process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?0:1);});
}
