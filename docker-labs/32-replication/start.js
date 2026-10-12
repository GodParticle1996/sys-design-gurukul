#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-chain': [
    { file: 'services/tier.js', env: { PORT: '5101', NAME: 'lb' } },
    { file: 'services/tier.js', env: { PORT: '5102', NAME: 'app1' } },
    { file: 'services/tier.js', env: { PORT: '5103', NAME: 'app2' } },
    { file: 'services/tier.js', env: { PORT: '5104', NAME: 'db1' } },
    { file: 'services/tier.js', env: { PORT: '5105', NAME: 'db2' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex1-chain   → node tools/spof.js\n');
  console.log('  (ex2 sirf tool hai: node tools/badwrite.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
