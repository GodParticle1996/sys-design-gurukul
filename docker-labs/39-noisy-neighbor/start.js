#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const ONE = [{ file: 'services/shared.js', env: { PORT: '5181' } }];
const EXERCISES = { 'ex1-fairness': ONE, 'ex2-autoscale': ONE, 'ex3-batch': ONE };
const HELP = { 'ex1-fairness': 'node tools/tenants.js   (phir: node tools/tenants.js --scenario average)', 'ex2-autoscale': 'node tools/autoscale.js', 'ex3-batch': 'node tools/batch.js' };
/* is exercise mein koi service nahi chalani — sirf tools */
const TOOLS = { 'ex0-slowmo': 'node tools/slowmo.js   (phir: node tools/mini.js · asli library: node tools/express-rate-limit.js)' };
const ex = process.argv[2];
if (TOOLS[ex]) { console.log(`\n${ex}: koi service nahi chalani. Seedha chalao:\n  ${TOOLS[ex]}\n`); process.exit(0); }
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(14)} → ${HELP[k]}`));
  console.log('\nSirf tools (koi service nahi):');
  Object.keys(TOOLS).forEach(k => console.log(`  ${k.padEnd(14)} → ${TOOLS[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
