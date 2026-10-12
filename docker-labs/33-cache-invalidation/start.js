#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-invalidation': [
    { file: 'services/db.js', env: { PORT: '5111' } },
    { file: 'services/cache.js', env: { PORT: '5112' } },
    { file: 'services/app.js', env: { PORT: '5113', NAME: 'app1' } },
    { file: 'services/app.js', env: { PORT: '5114', NAME: 'app2' } },
    { file: 'services/invalidator.js', env: { PORT: '5115' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start ex1-invalidation   → node tools/staleness.js | node tools/stampede.js\n');
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
