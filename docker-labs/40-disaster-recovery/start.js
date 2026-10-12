#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const ROUTER = { file: 'services/router.js', env: { PORT: '5190', S3_PORT: '5193', A_URL: 'http://localhost:5191', B_URL: 'http://localhost:5192' } };
const REGION_A = { file: 'services/region.js', env: { PORT: '5191', NAME: 'A', PEER_URL: 'http://localhost:5192', S3_URL: 'http://localhost:5193' } };
const REGION_B = { file: 'services/region.js', env: { PORT: '5192', NAME: 'B', PEER_URL: 'http://localhost:5191', S3_URL: 'http://localhost:5193' } };
const EXERCISES = {
  'ex1-dr-tiers': [ROUTER, REGION_A, REGION_B],           // router 5190 · region A 5191 · region B 5192 · S3 5193 (router ke andar)
  'ex2-sync-async': [REGION_A, REGION_B],                 // sirf do region: router aur S3 nahi chahiye
};
const HELP = {
  'ex1-dr-tiers': 'node tools/dr.js [--strategy backup|pilot|warm|active]',
  'ex2-sync-async': 'node tools/syncrepl.js [--row async|sync|async-b-down|sync-b-down]',
};
/* in exercises mein koi service nahi chalani — sirf tools */
const TOOLS = { 'ex0-slowmo': 'node tools/slowmo.js · slowmo-sync.js · slowmo-dns.js · slowmo-galti.js   (phir: node tools/mini.js [--sync])' };
const ex = process.argv[2];
if (TOOLS[ex]) { console.log(`\n${ex}: koi service nahi chalani. Seedha chalao:\n  ${TOOLS[ex]}\n`); process.exit(0); }
if (!ex || !EXERCISES[ex]) {
  console.log('\nUsage: npm start <exercise>\n');
  Object.keys(EXERCISES).forEach(k => console.log(`  ${k.padEnd(15)} → ${HELP[k]}`));
  console.log('\nSirf tools (koi service nahi):');
  Object.keys(TOOLS).forEach(k => console.log(`  ${k.padEnd(15)} → ${TOOLS[k]}`));
  console.log();
  process.exit(ex ? 1 : 0);
}
console.log('\n' + ex);
const kids = EXERCISES[ex].map(s => spawn(process.execPath, [path.join(__dirname, s.file)], { stdio: 'inherit', env: Object.assign({}, process.env, s.env) }));
const bye = () => { kids.forEach(k => { try { k.kill('SIGTERM'); } catch (e) {} }); setTimeout(() => process.exit(0), 300); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
