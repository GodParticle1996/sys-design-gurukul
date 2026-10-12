#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-rules': [
    { file: 'services/kernel.js', env: { PORT: '4991' } },
    { file: 'services/cilium.js', env: { PORT: '4992' } },
    { file: 'services/networkd.js', env: { PORT: '4993' } },
  ],
  'ex3-recovery': [
    { file: 'services/controlplane.js', env: { PORT: '4994' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex2 sirf tool hai: node tools/fleet.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
