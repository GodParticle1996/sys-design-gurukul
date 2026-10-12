#!/usr/bin/env node
/* Ek chhota launcher: `npm start <exercise>` — Docker ke bina bhi sab chalta hai. */
const { spawn } = require('child_process');
const path = require('path');

const EXERCISES = {
  'ex1-facts-answers': [
    { file: 'services/vote-service.js', env: { PORT: '4101' } },
  ],
  'ex2-hot-rank': [
    { file: 'services/rank-service.js', env: { PORT: '4102' } },
  ],
  'ex3-cache-layers': [
    { file: 'services/listing-service.js', env: { PORT: '4103' } },
  ],
  'ex4-strangler': [
    { file: 'services/monolith.js', env: { PORT: '4105' } },
    { file: 'services/new-service.js', env: { PORT: '4106' } },
    { file: 'services/gateway.js', env: { PORT: '4104' } },
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
const kids = EXERCISES[ex].map(s => {
  const child = spawn(process.execPath, [path.join(__dirname, s.file)], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, s.env),
  });
  return child;
});
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye);
process.on('SIGTERM', bye);
