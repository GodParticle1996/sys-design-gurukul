/* Sabse chhota chalta program: ek app + lib/health.js. Koi service nahi chalani.
   Upar ka hissa (line 9–31) wahi hai jo tum apne app mein likhoge. Neeche ka hissa bas dikhane ke liye hai:
   DB (yahan ek variable) 1.5 s par band, 4.5 s par wapas, 6.5 s par app ko SIGTERM — aur har 0.5 s par teeno
   raaston se poochha jaata hai. Doosre terminal se khud bhi poochh sakte ho:  curl -i localhost:5229/readyz
   node tools/mini.js */
const { serve, json, sleep } = require('../lib/util');
const { createHealth } = require('../lib/health');

const PORT = 5229;
let dbUp = true;          // nakli DB: bas ek variable

const health = createHealth({
  check: async () => dbUp,   // asli app mein: SELECT 1
  everyMs: 1000,
});

function readyz(req, res) {
  if (health.ready()) return { ready: true };
  return json(res, 503, { ready: false });
}

const server = serve(PORT, {
  'GET /livez': () => ({ live: health.live() }),
  'GET /readyz': readyz,
  'GET /home': () => ({ page: 'home' }),
}, () => health.start());

process.on('SIGTERM', () => {
  health.stop();           // 1. /readyz ab 503
  setTimeout(bye, 2000);   // 2. 2 s tak jawab dete raho
});

/* ------------------------------------------------------------------ sirf dikhane ke liye ------------------------------------------------------------------ */
const T0 = Date.now();
function bye() {
  say(Math.round((Date.now() - T0) / 250) * 250, '', 'app band');
  server.close();
  process.exit(0);
}
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const say = (t, cols, note) => console.log(`  ${s2(t).padStart(7)}   ${cols.padEnd(30)}${note ? ' ' + note : ''}`.trimEnd());
const status = path => fetch(`http://localhost:${PORT}${path}`).then(r => r.status).catch(() => 'band');

(async () => {
  console.log(`app :${PORT} · lib/health.js · DB ka check har 1 s par, jawab yaad se\n`);
  console.log('    samay   /livez   /readyz   /home      kya hua');
  const until = t => sleep(Math.max(0, T0 + t - Date.now()));
  const notes = {
    1750: '← app ko abhi pata nahi: yaad 1.00 s ki hai',
    2250: '← 2.00 s par app ne DB se poochha',
    4750: '← yaad 4.00 s ki hai',
    5250: '← 5.00 s par app ne DB se poochha',
    6750: '← traffic rukwaya; par jo request aayi, uska jawab diya',
  };
  const events = { 1500: () => { dbUp = false; return '💥 DB band'; }, 4500: () => { dbUp = true; return '✅ DB wapas'; },
    6500: () => { process.kill(process.pid, 'SIGTERM'); return '🛑 SIGTERM — band hone ka signal'; } };
  for (let t = 250; t <= 8250; t += 250) {
    await until(t);
    if (events[t]) { say(t, '', events[t]()); continue; }
    if (t % 500 !== 250) continue;
    const [l, r, h] = await Promise.all(['/livez', '/readyz', '/home'].map(status));
    say(t, `${String(l).padEnd(8)} ${String(r).padEnd(9)} ${h}`, notes[t]);
  }
})();
