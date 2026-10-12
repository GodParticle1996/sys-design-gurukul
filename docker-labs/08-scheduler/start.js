#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const S = process.env.STOP_ON_LOSS || '1', I = process.env.IDEMP || '0';
const EXERCISES = {
  'ex1-leader-election': [
    { file: 'services/lock-server.js', env: { PORT: '4801' } },
    { file: 'services/billing.js', env: { PORT: '4802', IDEMP: I } },
    { file: 'services/scheduler.js', env: { NAME: 'a', PORT: '4811', STOP_ON_LOSS: S } },
    { file: 'services/scheduler.js', env: { NAME: 'b', PORT: '4812', STOP_ON_LOSS: S } },
    { file: 'services/scheduler.js', env: { NAME: 'c', PORT: '4813', STOP_ON_LOSS: S } },
  ],
  'ex2-heartbeat-watchdog': [
    { file: 'services/jobs-db.js', env: { PORT: '4803' } },
    { file: 'services/worker.js', env: { NAME: 'w1', CRASH_AFTER: '3' } },
    { file: 'services/worker.js', env: { NAME: 'w2' } },
    { file: 'services/worker.js', env: { NAME: 'w3' } },
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
