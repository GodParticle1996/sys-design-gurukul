/* ex1 · Chaos monkey: har 4 second par ek RANDOM instance maaro (2 s mein wapas aata hai). 100 req/s, 16 s.
   Chaar setup — har ek mein monkey wahi karta hai. Dekho kaunsi kami pakdi jaati hai.
   Monkey ka dimaag lib/monkey.js hai. --seed N do toh har setup mein wahi instance wahi tarteeb se marte hain
   (run dohraya ja sakta hai); bina --seed ke victim har baar random.
   16 s mein monkey 3 baar maarta hai (4 s, 8 s, 12 s) — bilkul aakhir mein chauthi baar nahi.
   node tools/monkey.js [--setup one|three|health|retry] [--seed N] */
const { get, post, sleep, host } = require('../lib/util');
const { createMonkey } = require('../lib/monkey');
const seeded = require('./seeded');
const args = require('./args')();
const LB = `http://${host('lb')}:5211`;
const APPS = [5212, 5213, 5214].map((p, i) => `http://${host('app' + (i + 1))}:${p}`);
const RATE = 100, SECS = 16, EVERY = 4000, DOWN = 2000;
const SETUPS = {
  one:    ['1 instance', { instances: 1, health: false, retry: false }],
  three:  ['3 instances, health check nahi', { instances: 3, health: false, retry: false }],
  health: ['3 + health check', { instances: 3, health: true, retry: false }],
  retry:  ['3 + health check + retry', { instances: 3, health: true, retry: true }],
};

async function run(cfg) {
  for (const a of APPS) await post(a + '/reset');
  await post(LB + '/config', cfg);
  await sleep(400);
  const t0 = Date.now(), jobs = [], kills = [];
  const monkey = createMonkey({                                           // 🐒 random instance maaro
    targets: APPS.slice(0, cfg.instances),
    kill: url => { kills.push(APPS.indexOf(url) + 1); post(url + '/kill', { ms: DOWN }).catch(() => {}); },
    random: args.seed ? seeded(+args.seed) : Math.random,
    everyMs: EVERY,
  });
  monkey.start();
  setTimeout(() => monkey.stop(), SECS * 1000 - 100);
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    const at = Date.now() - t0;
    jobs.push(fetch(LB + '/work').then(r => ({ ok: r.ok, at })).catch(() => ({ ok: false, at })));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
  }
  monkey.stop();
  const rs = (await Promise.all(jobs)).sort((x, y) => x.at - y.at);
  let worst = 0, start = null;                                             // sabse lamba lagatar error ka daur
  for (const r of rs) { if (!r.ok) { if (start == null) start = r.at; worst = Math.max(worst, r.at - start); } else start = null; }
  const ok = rs.filter(r => r.ok).length;
  return { ok, n: rs.length, failed: rs.length - ok, worst, kills };
}

(async () => {
  const keys = args.setup ? [args.setup] : Object.keys(SETUPS);
  for (const k of keys) if (!SETUPS[k]) { console.log(`--setup ${k}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}`); process.exit(1); }
  console.log(`🐒 har ${EVERY / 1000} s ek random instance maara (${DOWN / 1000} s mein wapas) · ${RATE} req/s · ${SECS} s · beej: ${args.seed || 'nahi (victim random)'}\n`);
  console.log('setup                              safal          fail   sabse lamba error ka daur   monkey ne maara');
  for (const k of keys) {
    const [name, cfg] = SETUPS[k];
    const r = await run(cfg);
    console.log(`${name.padEnd(33)} ${(100 * r.ok / r.n).toFixed(2).padStart(6)}%   ${String(r.failed).padStart(6)}         ${String(r.worst + ' ms').padStart(8)}             ${r.kills.map(x => '#' + x).join(' ')}`);
    await sleep(500);
  }
})();
