#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const EXERCISES = { 'ex1-ring': [5121, 5122, 5123, 5124, 5125, 5126, 5127].map(p => ({ file: 'services/node.js', env: { PORT: String(p) } })) };
const ex = process.argv[2];
if (!ex || !EXERCISES[ex]) { console.log('\nUsage: npm start ex1-ring   → node tools/rehash.js\n'); process.exit(ex ? 1 : 0); }
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
