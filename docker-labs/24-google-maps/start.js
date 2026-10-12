#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = { 'ex1-routing': [{ file: 'services/maps.js', env: { PORT: '5001' } }] };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex1-routing\n');
  console.log('  phir: node tools/route.js | node tools/jam.js');
  console.log('  (ex2/ex3 sirf tools hain: node tools/eta.js | node tools/nearby.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
