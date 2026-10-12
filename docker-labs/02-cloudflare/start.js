#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const CITIES = +(process.env.CITIES || 6);

const EXERCISES = {
  'ex1-anycast-slicing': Array.from({ length: CITIES }, (_, i) => ({ file: 'services/edge-city.js', env: { PORT: String(4201 + i), CITY: 'city-' + (i + 1), CAP: process.env.CAP || '700' } })),
  'ex2-config-push': [
    { file: 'services/config-service.js', env: { PORT: '4210' } },
    { file: 'services/edge.js', env: { PORT: '4211', NAME: 'edge-1' } },
    { file: 'services/edge.js', env: { PORT: '4212', NAME: 'edge-2' } },
    { file: 'services/edge.js', env: { PORT: '4213', NAME: 'edge-3' } },
  ],
  'ex3-early-drop': [
    { file: 'services/guarded-service.js', env: { PORT: '4221', STATS_PORT: '4321', DROP: process.env.DROP || 'app' } },
    { file: 'services/edge-filter.js', env: { PORT: '4220', UPSTREAM: '4221', FILTER: (process.env.DROP === 'edge' ? '1' : '0') } },
  ],
  'ex4-isolates-pool': [
    { file: 'services/origin.js', env: { PORT: '4231' } },
    { file: 'services/runtime.js', env: { PORT: '4230' } },
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
