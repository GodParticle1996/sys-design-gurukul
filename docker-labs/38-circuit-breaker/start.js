#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const BOTH = [
  { file: 'services/a.js', env: { PORT: '5171', B_URL: 'http://localhost:5172' } },
  { file: 'services/b.js', env: { PORT: '5172' } },
];
const EXERCISES = { 'ex0-slowmo': BOTH, 'ex1-cascade': BOTH, 'ex2-counting': BOTH, 'ex3-half-open': BOTH };
const HELP = { 'ex0-slowmo': 'node tools/slowmo.js   (phir: node tools/mini.js)', 'ex1-cascade': 'node tools/cascade.js', 'ex2-counting': 'node tools/counting.js', 'ex3-half-open': 'node tools/halfopen.js' };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(14)} → ${HELP[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
