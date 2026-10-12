#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-fencing': [1, 2, 3, 4, 5].map(i => ({ file: 'services/lockd.js', env: { PORT: String(5150 + i) } })).concat([{ file: 'services/ledger.js', env: { PORT: '5156' } }]),
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) { console.log('\nUsage: npm start ex1-fencing   → node tools/pause.js | node tools/herd.js\n'); process.exit(ex ? 1 : 0); }
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
