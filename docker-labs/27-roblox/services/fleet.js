/* Fleet: instance processes chalata hai (ports 5040+). POST /spawn → naya instance, POST /kill {port} → process khatam (crash). */
const { fork } = require('child_process');
const path = require('path');
const { serve, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 5033;
const kids = new Map(); let next = 5040;
serve(PORT, {
  'POST /spawn': async () => { const port = next++; const k = fork(path.join(__dirname, 'instance.js'), [], { env: Object.assign({}, process.env, { PORT: String(port) }) }); kids.set(port, k); await sleep(250); return { port }; },
  'POST /kill': (req, res, url, p, b) => { const k = kids.get(+b.port); if (k) { k.kill('SIGKILL'); kids.delete(+b.port); } return { killed: +b.port }; },
  'POST /reset': () => { for (const k of kids.values()) k.kill(); kids.clear(); next = 5040; return { ok: true }; },
  'GET /stats': () => ({ instances: [...kids.keys()] }),
}, () => console.log(`[fleet] :${PORT}`));
const bye = () => { for (const k of kids.values()) k.kill(); process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
