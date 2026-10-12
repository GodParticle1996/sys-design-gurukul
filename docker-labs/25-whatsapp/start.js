#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-connections': [
    { file: 'services/registry.js', env: { PORT: '5013' } },
    { file: 'services/chat.js', env: { PORT: '5011', NAME: 'chat1' } },
  ],
  'ex3-store-forward': [
    { file: 'services/registry.js', env: { PORT: '5013' } },
    { file: 'services/chat.js', env: { PORT: '5011', NAME: 'chat1' } },
    { file: 'services/chat.js', env: { PORT: '5012', NAME: 'chat2' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex2, ex4 sirf tools hain: node tools/contention.js | node tools/groupcrypt.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
