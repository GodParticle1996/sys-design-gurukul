#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
try { fs.unlinkSync(path.join(__dirname, 'data', 'cdc-offset.json')); } catch (e) {}
const EXERCISES = {
  'ex1-dual-write-vs-cdc': [
    { file: 'services/source.js', env: { PORT: '5001' } },
    { file: 'services/target.js', env: { PORT: '5002' } },
  ],
  'ex2-shadow-cutover': [
    { file: 'services/source.js', env: { PORT: '5001' } },
    { file: 'services/target.js', env: { PORT: '5002' } },
    { file: 'services/cdc.js', env: { MODE: 'state', REDELIVER: '0' } },
    { file: 'services/proxy.js', env: { PORT: '5000', SHADOW: '1' } },
    { file: 'services/writer.js', env: { RATE: '200' } },
  ],
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
