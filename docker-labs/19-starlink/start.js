#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-handover': [
    { file: 'services/server.js', env: { PORT: '4891' } },
    { file: 'services/sky.js', env: { PORT: '4892' } },
    { file: 'services/pop.js', env: { PORT: '4894' } },
    { file: 'services/dish.js', env: { PORT: '4893' }, delay: 300 },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: DISH_MODE=direct|reactive|scheduled npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex2 sirf tool hai: node tools/latency.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = [];
EXERCISES[ex].forEach(s => setTimeout(() => kids.push(spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) })), s.delay || 0));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
