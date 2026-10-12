#!/usr/bin/env node
/* 5 raft nodes (ports 4901–4905). ex1 aur ex2 dono ke liye wahi cluster; tools alag. */
const { spawn } = require('child_process');
const path = require('path');
const cluster = [1, 2, 3, 4, 5].map(id => ({ file: 'services/raft-node.js', env: { ID: String(id) } }));
const EXERCISES = { 'ex1-election': cluster, 'ex2-quorum-partition': cluster };
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
