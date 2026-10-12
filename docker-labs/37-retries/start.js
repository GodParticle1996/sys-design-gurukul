#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex0-slowmo': [{ file: 'services/fragile.js', env: { PORT: '5165' } }],
  'ex1-jitter': [{ file: 'services/gateway.js', env: { PORT: '5161' } }],
  'ex2-storm': [{ file: 'services/fragile.js', env: { PORT: '5165' } }],
  'ex3-layers': [
    { file: 'services/hop.js', env: { PORT: '5162', NAME: 'A', NEXT: 'http://localhost:5163' } },
    { file: 'services/hop.js', env: { PORT: '5163', NAME: 'B', NEXT: 'http://localhost:5164' } },
    { file: 'services/hop.js', env: { PORT: '5164', NAME: 'C' } },
  ],
};
const HELP = { 'ex0-slowmo': 'node tools/slowmo.js   (phir: node tools/mini.js)', 'ex1-jitter': 'node tools/jitter.js', 'ex2-storm': 'node tools/storm.js', 'ex3-layers': 'node tools/layers.js' };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(12)} → ${HELP[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
