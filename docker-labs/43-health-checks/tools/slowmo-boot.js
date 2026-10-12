/* ex0 · SLOW MOTION 2 — dheema boot: checker app ko khulne se pehle hi maar deta hai.
   1 pod. App ko boot mein 8 s (ya 12 s) lagte hain; tab tak port band rehta hai.
   Checker (niyam: lib/checker.js):
     "zinda ho?"         (liveness)   har 2 s · 1 fail → RESTART · pehla sawaal pod shuru hone ke `delay` second baad
     "traffic bhejein?"  (readiness)  har 1 s · pass → READY
     "shuru ho gaye?"    (startup)    har 1 s · 30 fail tak chhoot · pass hone tak baaki dono sawaal band
   Restart ke beech ka intezaar: 0, 1, 2, 4 s (asli Kubernetes: 10, 20, 40 s … 5 minute tak).
   Setups:
     delay5        "zinda ho?" 5 s baad se · boot 8 s
     delay10       "zinda ho?" 10 s baad se · boot 8 s
     delay10-slow  "zinda ho?" 10 s baad se · aaj boot 12 s (DB migration, thandi cache, bhari machine)
     startup       "shuru ho gaye?" wala sawaal · boot 12 s
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-boot.js [--mode delay5|delay10|delay10-slow|startup] [--fast] */
const { newChecks, shouldRun, onResult } = require('../lib/checker');
const { sleep } = require('../lib/util');
const args = require('./args')();

const RUN = 25000, LIVE_EVERY = 2000, READY_EVERY = 1000, START_EVERY = 1000, START_FAILS = 30;
const BACKOFF = [0, 1000, 2000, 4000, 8000];
const SETUPS = {
  'delay5':       { name: '"zinda ho?" pod shuru hone ke 5 s baad se · boot 8 s', boot: 8000, delay: 5000 },
  'delay10':      { name: '"zinda ho?" 10 s baad se · boot 8 s', boot: 8000, delay: 10000 },
  'delay10-slow': { name: '"zinda ho?" 10 s baad se · aaj boot 12 s', boot: 12000, delay: 10000 },
  'startup':      { name: '"shuru ho gaye?" wala sawaal (har 1 s, 30 fail tak chhoot) · boot 12 s', boot: 12000, delay: 0, startup: true },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';

async function run(mode) {
  const cfg = SETUPS[mode];
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: 0 = app khula / pod shuru, 1 = checker
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  const pod = { up: false, gen: 0, restarts: 0, waiting: false };
  let firstReady = null;

  function start() {
    const gen = ++pod.gen, born = clock;
    pod.up = false; pod.waiting = false; pod.checks = newChecks(!!cfg.startup);
    say(`▶️ pod shuru — boot ${cfg.boot / 1000} s (${s2(born + cfg.boot)} par khulega)`);
    at(born + cfg.boot, 0, () => { if (pod.gen === gen) { pod.up = true; say('🚪 app khul gaya (port chalu)'); } });
    let startFails = 0, liveSaid = false;
    const loop = (kind, every, first) => { for (let t = born + first; t <= RUN; t += every) at(t, 1, () => { if (pod.gen === gen) probe(kind); }); };
    function probe(kind) {
      if (!shouldRun(pod.checks, kind)) return;
      const ok = pod.up, why = ok ? '' : ' (port band)';
      const act = onResult(pod.checks, kind, ok, kind === 'startup' ? START_FAILS : 1);
      if (kind === 'startup') {
        if (!ok) { startFails++; return; }
        return say(`🩺 shuru ho gaye? ✓ — pehle ${startFails} baar ✗ (chhoot ${START_FAILS} tak; koi restart nahi) → ab baaki dono sawaal`);
      }
      if (kind === 'readiness') {
        if (act === 'ready') { if (firstReady == null) firstReady = clock; say('🩺 traffic bhejein? ✓ → READY'); }
        return;
      }
      if (ok) { if (!liveSaid) { liveSaid = true; say(`🩺 zinda ho? ✓ (aage har ${LIVE_EVERY / 1000} s par)`); } return; }
      if (act === 'restart') {
        const wait = BACKOFF[Math.min(pod.restarts, BACKOFF.length - 1)];
        pod.restarts++; pod.gen++; pod.up = false; pod.waiting = true;
        say(`🩺 zinda ho? ✗${why} → RESTART #${pod.restarts}${wait ? ` — ${wait / 1000} s ruk ke` : ''}`);
        at(clock + wait, 0, start);
      }
    }
    if (cfg.startup) loop('startup', START_EVERY, 0);
    loop('liveness', LIVE_EVERY, cfg.delay);
    loop('readiness', READY_EVERY, 0);
  }
  at(0, 0, start);

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${cfg.name} ===`);
  lines.forEach(l => console.log(l));
  const state = pod.checks.ready ? 'chal raha hai, READY' : pod.waiting ? 'restart ka intezaar (CrashLoopBackOff)' : pod.up ? 'chal raha hai, par READY nahi' : 'abhi bhi boot ho raha hai — READY nahi';
  console.log(`   nateeja → pehli baar READY: ${firstReady == null ? 'kabhi nahi' : s2(firstReady)} · restarts ${pod.restarts} · ${s2(RUN)} par: ${state}`);
}

(async () => {
  console.log(`1 pod · "zinda ho?" har ${LIVE_EVERY / 1000} s, 1 fail = restart · restart ke beech intezaar 0, 1, 2, 4 s (asli Kubernetes: 10, 20, 40 s …) · ${RUN / 1000} s dekha`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
