#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = { 'ex1-snapshots': [{ file: 'services/workspace.js', env: { PORT: '5071' } }] };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex1-snapshots   → node tools/snapshots.js\n');
  console.log('  (ex2, ex3 sirf tools hain: node tools/agent.js | node tools/forkdb.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
