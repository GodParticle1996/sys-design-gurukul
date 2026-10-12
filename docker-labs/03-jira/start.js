#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-tenant-isolation': [{ file: 'services/api.js', env: { PORT: '4301' } }],
  'ex2-index-reconcile': [{ file: 'services/index-api.js', env: { PORT: '4310' } }],
  'ex3-permission-search': [{ file: 'services/search.js', env: { PORT: '4320' } }],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
