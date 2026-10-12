#!/usr/bin/env node
/* node tools/run.js --task research|runaway --mode none|contain */
const args = require('./args')();
const { post } = require('../lib/util');
const R = `http://${process.env.RUNNER_HOST || 'localhost'}:4802`;
(async () => {
  const r = await post(R + '/run', { task: args.task || 'research', mode: args.mode || 'none' });
  console.log(`task=${r.task.padEnd(8)} mode=${r.mode.padEnd(7)} planned=${String(r.planned).padStart(2)} executed=${String(r.executed).padStart(2)} ` +
    `allowed=${String(r.allowed).padStart(2)} blocked=${String(r.blocked).padStart(2)} | bahar gaya: ${r.reachedPaste} posts, ${r.leakedBytes} bytes | ` +
    `workspace ke bahar padha: ${r.readOutsideWorkspace} | cpu ${r.cpuMs} ms`);
  if (r.alerts.length) console.log(`   🚨 ALERT at call #${r.alerts[0].at}: ${r.alerts[0].why}  → KILLED at call #${r.killedAt}`);
})().catch(e => { console.error('runner chal raha hai? npm start ex1-containment —', e.message); process.exit(1); });
