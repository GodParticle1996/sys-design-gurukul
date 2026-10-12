#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex2-propagation': [
    { file: 'services/c.js', env: { PORT: '4853' } },
    { file: 'services/b.js', env: { PORT: '4852' } },
  ],
};
const HELP = { 'ex2-propagation': 'node tools/client.js   (phir: node tools/hint.js)' };
/* in exercises mein koi service nahi chalani — sirf ek tool */
const TOOLS = {
  'ex0-slowmo': 'node tools/slowmo.js   (phir: node tools/mini.js)',
  'ex1-bounded-queue': 'node tools/queue.js --policy unbounded|block|drop-new|drop-oldest|error [--cap 20000]   (asli crash: node tools/oom.js)',
  'ex3-streams': 'node tools/streams-slowmo.js   (asli raftaar: node tools/streams.js)',
  'ex4-chat': 'node tools/chat.js',
};
const ex = process.argv[2];
if (TOOLS[ex]) { console.log(`\n${ex}: koi service nahi chalani. Seedha chalao:\n  ${TOOLS[ex]}\n`); process.exit(0); }
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(18)} → ${HELP[k]}`));
  console.log('\nSirf tools (koi service nahi):');
  Object.keys(TOOLS).forEach(k => console.log(`  ${k.padEnd(18)} → ${TOOLS[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
