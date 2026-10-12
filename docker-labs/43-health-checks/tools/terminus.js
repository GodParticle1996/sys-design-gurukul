/* Wahi timeline jo mini.js mein hai — par health aur shutdown haath ke nahi, npm ki library "@godaddy/terminus" ke.
   Pehle (ek baar, isi folder mein):  npm install @godaddy/terminus
   Phir:                              node tools/terminus.js              (band hone se pehle 2 s rukta hai)
                                      node tools/terminus.js --no-delay   (library ki default settings: koi rukna nahi) */
let createTerminus;
try { ({ createTerminus } = require('@godaddy/terminus')); }
catch (e) { console.log('@godaddy/terminus nahi mila. Isi folder mein chalao:  npm install @godaddy/terminus'); process.exit(1); }
const http = require('http');
const args = require('./args')();
const NO_DELAY = !!args['no-delay'];

const PORT = 5229;
let dbUp = true;          // nakli DB: bas ek variable
let dbSeen = true;        // DB ka yaad rakha jawab
// terminus khud yaad nahi rakhta: yeh kaam tumhara
setInterval(() => { dbSeen = dbUp; }, 1000);

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end('{"page":"home"}');
});

const wait = ms => new Promise(r => setTimeout(r, ms));

createTerminus(server, {
  healthChecks: {
    '/livez': async () => {},   // kuch throw nahi → 200
    '/readyz': async () => {
      if (!dbSeen) throw new Error('db');   // throw → 503
    },
  },
  // band karne se pehle 2 s ruko (default: bilkul nahi)
  beforeShutdown: NO_DELAY ? undefined : () => wait(2000),
  onShutdown: async () => say(now(), '', 'app band'),
  useExit0: true,
});
server.listen(PORT);

/* ------------------------------------------------------------------ sirf dikhane ke liye ------------------------------------------------------------------ */
const T0 = Date.now();
function now() { return Math.round((Date.now() - T0) / 250) * 250; }      // sabse paas ka 0.25 s
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
function say(t, cols, note) { console.log(`  ${s2(t).padStart(7)}   ${cols.padEnd(30)}${note ? ' ' + note : ''}`.trimEnd()); }
/* har baar naya connection (asli checker / load balancer ki tarah) — warna keep-alive connection band server ko zinda dikha sakta hai */
const status = path => new Promise(resolve => {
  const req = http.get({ port: PORT, path, agent: false }, res => { res.resume(); resolve(res.statusCode); });
  req.on('error', () => resolve('band'));
});

(async () => {
  console.log(`app :${PORT} · @godaddy/terminus${NO_DELAY ? ' · default settings (beforeShutdown nahi)' : ' · beforeShutdown: 2 s'}\n`);
  console.log('    samay   /livez   /readyz   /home      kya hua');
  const until = t => wait(Math.max(0, T0 + t - Date.now()));
  const events = { 1500: () => { dbUp = false; return '💥 DB band'; }, 4500: () => { dbUp = true; return '✅ DB wapas'; },
    6500: () => { process.kill(process.pid, 'SIGTERM'); return '🛑 SIGTERM — band hone ka signal'; } };
  for (let t = 250; t <= 8250; t += 250) {
    await until(t);
    if (events[t]) { say(t, '', events[t]()); continue; }
    if (t % 500 !== 250) continue;
    const [l, r, h] = await Promise.all(['/livez', '/readyz', '/home'].map(status));
    say(t, `${String(l).padEnd(8)} ${String(r).padEnd(9)} ${h}`);
  }
})();
