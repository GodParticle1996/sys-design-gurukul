#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-boundary-tax': [
    { file: 'services/store.js', env: { PORT: '4861' } },
    { file: 'services/orchestrator.js', env: { PORT: '4862' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex2-replicate sirf tool hai: node tools/replicas.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
