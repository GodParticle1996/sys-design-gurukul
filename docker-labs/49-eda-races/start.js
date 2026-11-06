const { spawn } = require('node:child_process');
const path = require('node:path');
const tools = { 'ex0-slowmo': 'slowmo', 'ex1-order': 'order', 'ex2-conflict': 'conflict', 'ex3-phantom': 'phantom' };
const name = tools[process.argv[2]];
if (!name) {
  console.log('npm start -- ' + Object.keys(tools).join(' | '));
  if (process.argv[2]) process.exitCode = 1;
} else {
  const child = spawn(process.execPath, [path.join(__dirname, 'tools', `${name}.js`), ...process.argv.slice(3)],
    { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', e => { console.error(e.message); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : code; });
}
