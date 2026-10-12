#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-blocks': [{ file: 'services/blocks.js', env: { PORT: '5091' } }],
  'ex2-lake': [
    { file: 'services/db.js', env: { PORT: '5092', ROLE: 'primary' } },
    { file: 'services/db.js', env: { PORT: '5093', ROLE: 'lake' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex1-blocks → node tools/pageload.js');
  console.log('       npm start ex2-lake   → node tools/lake.js\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
