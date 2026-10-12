#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-constant-work': [
    { file: 'services/checks.js', env: { PORT: '4921' } },
    { file: 'services/dns.js', env: { PORT: '4922' } },
    { file: 'services/dns.js', env: { PORT: '4923' } },
    { file: 'services/dns.js', env: { PORT: '4924' } },
  ],
  'ex2-shuffle-shard': [
    { file: 'services/fleet.js', env: { PORT: '4931' } },
    { file: 'services/router.js', env: { PORT: '4932' } },
  ],
  'ex4-tiny-dbs': [
    { file: 'services/meta.js', env: { PORT: '4951' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log('  ' + k));
  console.log('\n  (ex3 sirf tool hai: node tools/srd.js)\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
