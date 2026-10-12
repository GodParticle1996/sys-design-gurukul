#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const CLUSTER = [
  { file: 'services/db.js', env: { PORT: '5222' } },
  { file: 'services/cluster.js', env: { PORT: '5221', DB_URL: 'http://localhost:5222' } },
];
const EXERCISES = { 'ex1-deep-shallow': CLUSTER, 'ex2-probe-load': CLUSTER, 'ex3-startup': CLUSTER, 'ex4-graceful': CLUSTER };
const HELP = { 'ex1-deep-shallow': 'node tools/dbblip.js', 'ex2-probe-load': 'node tools/probeload.js', 'ex3-startup': 'node tools/slowstart.js', 'ex4-graceful': 'node tools/rollout.js' };
/* is exercise mein koi service nahi chalani — sirf tools */
const TOOLS = { 'ex0-slowmo': 'node tools/slowmo.js   (phir: node tools/mini.js)' };
const ex = process.argv[2];
if (TOOLS[ex]) { console.log(`\n${ex}: koi service nahi chalani. Seedha chalao:\n  ${TOOLS[ex]}\n`); process.exit(0); }
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(17)} → ${HELP[k]}`));
  console.log('\nSirf tools (koi service nahi):');
  Object.keys(TOOLS).forEach(k => console.log(`  ${k.padEnd(17)} → ${TOOLS[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill('SIGTERM'); } catch (e) {} }); setTimeout(() => process.exit(0), 300); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
