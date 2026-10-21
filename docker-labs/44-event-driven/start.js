const { spawn } = require('node:child_process');
const path = require('node:path');
const ex = process.argv[2];
if (['ex0-slowmo', 'ex2-limits', 'ex3-crash'].includes(ex)) {
  const tools = {
    'ex0-slowmo': 'node tools/slowmo.js [--mode direct|events] [--fast]',
    'ex2-limits': 'node tools/limits.js',
    'ex3-crash': 'node tools/crash.js',
  };
  console.log(tools[ex]);
} else if (ex === 'ex1-compare') {
  const specs = [
    ['broker', { PORT: '5400' }], ['orders', { PORT: '5401' }],
    ['worker', { PORT: '5402', NAME: 'kitchen' }],
    ['worker', { PORT: '5403', NAME: 'notify' }],
  ];
  const kids = specs.map(([name, env]) => spawn(process.execPath,
    [path.join(__dirname, 'services', name + '.js')],
    { stdio: 'inherit', env: { ...process.env, ...env } }));
  console.log('Doosre terminal mein: node tools/compare.js');
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    kids.forEach(k => k.kill());
    setTimeout(() => process.exit(code), 100);
  };
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  kids.forEach(k => {
    k.on('error', e => { console.error(e.message); stop(1); });
    k.on('exit', code => { if (!stopping) stop(code || 1); });
  });
} else {
  console.log('npm start ex0-slowmo | ex1-compare | ex2-limits | ex3-crash');
  if (ex) process.exitCode = 1;
}
