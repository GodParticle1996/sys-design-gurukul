#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-ack': [
    { file: 'services/store.js', env: { PORT: '4981', SITE: 'site-a' } },
    { file: 'services/store.js', env: { PORT: '4982', SITE: 'site-b' } },
    { file: 'services/frontend.js', env: { PORT: '4983' } },
  ],
  'ex2-smtp': [
    { file: 'services/mx.js', env: { PORT: '4984' } },
  ],
  'ex3-attachments': [
    { file: 'services/blobstore.js', env: { PORT: '4985' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex4 sirf tool hai: node tools/labels.js — ex1 ke stores use karta hai)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
