#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = { 'ex2-overlap': [{ file: 'services/peer.js', env: { PORT: '5081' } }] };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex2-overlap   → node tools/trainstep.js\n');
  console.log('  (ex1, ex3 sirf tools hain: node tools/router.js | node tools/kvcache.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
