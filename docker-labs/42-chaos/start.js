#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const CLUSTER = [{ file: 'services/lb.js', env: { PORT: '5211' } }]
  .concat([5212, 5213, 5214].map(p => ({ file: 'services/app.js', env: { PORT: String(p) } })));
const EXERCISES = { 'ex1-monkey': CLUSTER, 'ex2-faults': CLUSTER, 'ex3-experiment': CLUSTER };
const HELP = {
  'ex1-monkey': 'node tools/monkey.js [--setup one|three|health|retry] [--seed N]',
  'ex2-faults': 'node tools/faults.js [--fault crash|slow|zombie] [--setup hc|retry|eject]',
  'ex3-experiment': 'node tools/experiment.js [--fault zombie|slow|crash]',
};
/* is exercise mein koi service nahi chalani — sirf tools */
const TOOLS = { 'ex0-slowmo': 'node tools/slowmo.js   (phir: slowmo-faults.js, slowmo-experiment.js, mini.js)' };
const ex = process.argv[2];
if (TOOLS[ex]) { console.log(`\n${ex}: koi service nahi chalani. Seedha chalao:\n  ${TOOLS[ex]}\n`); process.exit(0); }
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(15)} → ${HELP[k]}`));
  console.log('\nSirf tools (koi service nahi):');
  Object.keys(TOOLS).forEach(k => console.log(`  ${k.padEnd(15)} → ${TOOLS[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex + '   (phir doosre terminal mein: ' + HELP[ex] + ')');
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill('SIGTERM'); } catch (e) {} }); setTimeout(() => process.exit(0), 300); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
