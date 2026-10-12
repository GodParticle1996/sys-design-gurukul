#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const EXERCISES = {
  'ex1-boot-payload': [{ file: 'services/workspace.js', env: { PORT: '4601' } }],
  'ex2-fanout-presence': [
    { file: 'services/edge-sim.js', env: { PORT: '4604' } },
    { file: 'services/channel-server.js', env: { PORT: '4603' } },
  ],
  'ex3-hot-shard': [{ file: 'services/shard-router.js', env: { PORT: '4607' } }],
  'ex4-queue-jam': [{ file: 'services/job-queue.js', env: { PORT: '4608' } }],
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
