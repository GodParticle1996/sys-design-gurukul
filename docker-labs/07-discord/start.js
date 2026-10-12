#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const EXERCISES = {
  'ex1-partition-key': [{ file: 'services/store.js', env: { PORT: '4701' } }],
  'ex2-coalescing': [
    { file: 'services/partition.js', env: { PORT: '4714' } },
    { file: 'services/data-service.js', env: { PORT: '4711' } },
    { file: 'services/data-service.js', env: { PORT: '4712' } },
    { file: 'services/data-service.js', env: { PORT: '4713' } },
  ],
  'ex3-live-migration': [
    { file: 'services/msg-store.js', env: { PORT: '4721', NAME: 'old-store', SEED: '400000' } },
    { file: 'services/msg-store.js', env: { PORT: '4722', NAME: 'new-store' } },
    { file: 'services/writer.js', env: { RATE: '500' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('');
  process.exit(ex ? 1 : 0);
}
if (ex === 'ex3-live-migration') { try { fs.unlinkSync(path.join(__dirname, 'data', 'ckpt.json')); } catch (e) {} }
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
