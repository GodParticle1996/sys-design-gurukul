#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = {
  'ex1-pool': [
    { file: 'services/db.js', env: { PORT: '5131' } },
    { file: 'services/pooler.js', env: { PORT: '5132' } },
  ],
};
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) { console.log('\nUsage: npm start ex1-pool   → node tools/clients.js --via db | --via pooler [--pool N] [--mode session]\n'); process.exit(ex ? 1 : 0); }
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
