/* 8 worker processes (ports 4940..4947) chalata hai. Jo crash ho, wo tab tak mara rehta hai jab tak POST /reset na ho.
   GET /status → kaun zinda hai */
const { fork } = require('child_process');
const path = require('path');
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 4931, W = 8, BASE = 4940;
const kids = new Array(W).fill(null);
function up(i) { const k = fork(path.join(__dirname, 'worker.js'), [], { env: Object.assign({}, process.env, { PORT: String(BASE + i) }) }); k.on('exit', () => { if (kids[i] === k) kids[i] = null; }); kids[i] = k; }
for (let i = 0; i < W; i++) up(i);
serve(PORT, {
  'GET /status': () => ({ alive: kids.map((k, i) => k ? BASE + i : null).filter(Boolean), dead: kids.map((k, i) => k ? null : BASE + i).filter(Boolean) }),
  'POST /reset': async () => { for (let i = 0; i < W; i++) if (!kids[i]) up(i); await sleep(400); return { ok: true }; },
}, () => console.log(`[fleet] :${PORT} — ${W} workers :${BASE}..${BASE + W - 1}`));
const bye = () => { kids.forEach(k => k && k.kill()); process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
