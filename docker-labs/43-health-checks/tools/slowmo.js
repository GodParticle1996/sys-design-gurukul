/* ex0 · SLOW MOTION — DB ki 5 second ki gadbad, chhote paimaane par, taaki har sawaal aur har request dikhe.
   KhanaKart ki orders-service ke 3 pods (pod-1, pod-2, pod-3) aur ek shared DB.
   /home ko DB nahi chahiye; /orders ko chahiye. Har 0.5 s par ek /home aur ek /orders (baari-baari READY pods par).
   Health checker (Kubernetes mein kubelet) har 1 s par har pod se do sawaal poochhta hai — niyam lib/checker.js ka:
     "zinda ho?"         (liveness)   lagataar 3 fail → pod RESTART (dobara boot: 6 s)
     "traffic bhejein?"  (readiness)  1 fail → us pod ko traffic band (NOT READY) · pass → traffic wapas
   DB 2.5 s se 7.5 s tak band.
   Setups (app in sawaalon ka jawab kaise deta hai):
     deep-live   ek hi "deep /healthz": dono sawaalon par DB se poochh ke jawab
     deep-ready  "zinda ho?" → seedha haan · "traffic bhejein?" → DB se poochh ke
     cached      deep-ready jaisa, par jawab yaad se: app apni ghadi se har 2 s par ek baar DB se poochhta hai (0.20 s, 2.20 s, …)
     fail-open   deep-ready jaisa, par load balancer "fail open" karta hai: koi pod READY nahi → sab ko bhejo
     shallow     dono sawaal DB ko chhute hi nahi; DB gaya toh /orders khud 503 deta hai
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo.js [--mode deep-live|deep-ready|cached|fail-open|shallow] [--fast] */
const { newChecks, shouldRun, onResult } = require('../lib/checker');
const { sleep } = require('../lib/util');
const args = require('./args')();

const N = 3, BOOT = 6000, PERIOD = 1000, LIVE_FAILS = 3, READY_FAILS = 1, LIVE_DELAY = 8000;
const DB_DOWN = 2500, DB_UP = 7500, GAP = 500, FIRST = 250, RUN = 13000, CACHE_EVERY = 2000, CACHE_FIRST = 200;
const SETUPS = {
  'deep-live':  { name: 'ek hi deep /healthz — "zinda ho?" aur "traffic bhejein?" dono DB se poochh ke', live: 'deep', ready: 'deep' },
  'deep-ready': { name: '"zinda ho?" seedha haan · "traffic bhejein?" DB se poochh ke', live: 'shallow', ready: 'deep' },
  'cached':     { name: '"traffic bhejein?" yaad rakhe jawab se (app har 2 s par DB se poochhta hai)', live: 'shallow', ready: 'cached' },
  'fail-open':  { name: '"traffic bhejein?" DB se poochh ke · load balancer fail open (koi READY nahi → sab ko bhejo)', live: 'shallow', ready: 'deep', failOpen: true },
  'shallow':    { name: 'dono sawaal DB ko chhute hi nahi · DB gaya toh /orders khud 503 deta hai', live: 'shallow', ready: 'shallow' },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const marks = a => a.map(x => (x ? '✓' : '✗')).join(' ');

async function run(mode) {
  const cfg = SETUPS[mode];
  /* ---- tay ghadi ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: ek hi pal par pehle kya (0 = duniya badli, 1 = checker, 2 = request)
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  /* ---- DB aur teen pods ---- */
  let dbUp = true;
  const pods = Array.from({ length: N }, (_, i) => ({
    name: 'pod-' + (i + 1), up: true, startedAt: -60000, restarts: 0, cached: true,
    checks: Object.assign(newChecks(false), { ready: true }),                // shuru mein teeno chal rahe hain aur READY hain
  }));
  const names = list => list.map(p => p.name).join(', ');
  /* app ke jawab (asli app: services/pod.js) */
  const answer = (pod, kind) => {
    if (!pod.up) return false;                                               // boot ho raha hai: port band
    const how = kind === 'liveness' ? cfg.live : cfg.ready;
    return how === 'deep' ? dbUp : how === 'cached' ? pod.cached : true;
  };
  function boot(pod) {
    pod.up = false; pod.startedAt = clock; pod.checks = newChecks(false);
    at(clock + BOOT, 0, () => { pod.up = true; pod.cached = dbUp; });
  }

  /* ---- checker: har 1 s par har pod se dono sawaal. Pehle saare jawab, phir niyam (lib/checker.js), phir karwai ---- */
  function ask() {
    const parts = [], notes = [], toRestart = [];
    const rounds = ['liveness', 'readiness'].map(kind => {
      const asked = pods.filter(p => shouldRun(p.checks, kind) && (kind !== 'liveness' || clock - p.startedAt >= LIVE_DELAY));
      return { kind, asked, oks: asked.map(p => answer(p, kind)), closed: asked.some(p => !p.up) };
    });
    for (const { kind, asked, oks, closed } of rounds) {
      const q = kind === 'liveness' ? 'zinda ho?' : 'traffic bhejein?';
      if (!asked.length) { parts.push(`${q} — (restart ke baad ${LIVE_DELAY / 1000} s tak nahi poochhta)`); continue; }
      const acts = asked.map((p, i) => onResult(p.checks, kind, oks[i], kind === 'liveness' ? LIVE_FAILS : READY_FAILS));
      let extra = '';
      if (kind === 'liveness' && oks.some(ok => !ok)) extra = ` (lagataar fail ${Math.max(...asked.map(p => p.checks.fails.liveness))}/${LIVE_FAILS})`;
      if (kind === 'readiness' && closed) extra = ' (port band: app boot ho raha hai)';
      parts.push(`${q} ${marks(oks)}${extra}`);
      const went = what => asked.filter((p, i) => acts[i] === what);
      if (went('not-ready').length) notes.push(`→ ${names(went('not-ready'))}: traffic band (NOT READY)`);
      if (went('ready').length) notes.push(`→ ${names(went('ready'))}: traffic wapas (READY)`);
      toRestart.push(...went('restart'));
    }
    if (toRestart.length) {
      toRestart.forEach(p => { p.restarts++; boot(p); });
      notes.push(`→ ${names(toRestart)}: RESTART — dobara boot, ${BOOT / 1000} s lagenge`);
    }
    say(`🩺 ${parts.join(' · ')}`);
    notes.forEach(n => say(`   ${n}`));
  }

  /* ---- Service / load balancer: READY pods mein baari-baari ---- */
  let rr = 0;
  const stats = { home: [0, 0], orders: [0, 0] }, homeFail = [];
  let ordersBack = null;                                                     // DB wapas aane ke baad /orders pehli baar kab safal hui
  function send(page) {
    let eps = pods.filter(p => p.checks.ready), open = false;
    if (!eps.length && cfg.failOpen) { eps = pods.slice(); open = true; }   // fail open
    stats[page][1]++;
    if (!eps.length) { if (page === 'home') homeFail.push(clock); return `/${page} ✗ koi READY pod nahi`; }
    const pod = eps[rr++ % eps.length], tag = pod.name + (open ? ', fail open' : '');
    if (!pod.up) { if (page === 'home') homeFail.push(clock); return `/${page} ✗ (${tag}: port band)`; }
    if (page === 'orders' && !dbUp) return `/${page} ✗ (${tag}: DB nahi mila)`;
    stats[page][0]++;
    if (page === 'orders' && clock >= DB_UP && ordersBack == null) ordersBack = clock;
    return `/${page} ✓ (${tag})`;
  }

  /* ---- ghatnayein ---- */
  at(DB_DOWN, 0, () => { dbUp = false; say('💥 DB band'); });
  at(DB_UP, 0, () => { dbUp = true; say('✅ DB wapas'); });
  if (cfg.ready === 'cached') for (let t = CACHE_FIRST; t <= RUN; t += CACHE_EVERY) at(t, 0, () => {
    const before = pods[0].cached;
    pods.forEach(p => { if (p.up) p.cached = dbUp; });
    if (pods[0].cached !== before) say(`🗒️ pods ne DB se poochha (apni ghadi se, har ${CACHE_EVERY / 1000} s) → yaad mein ab: "${dbUp ? 'DB theek' : 'DB band'}"`);
  });
  for (let t = 0; t <= RUN; t += PERIOD) at(t, 1, ask);
  for (let t = FIRST; t <= RUN; t += GAP) at(t, 2, () => say(`${send('home').padEnd(30)} ${send('orders')}`));

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${cfg.name} ===`);
  lines.forEach(l => console.log(l));
  const restarts = pods.reduce((s, p) => s + p.restarts, 0);
  const gap = homeFail.length ? ` (fail: ${s2(homeFail[0])} se ${s2(homeFail[homeFail.length - 1])} tak)` : ' (kabhi fail nahi)';
  console.log(`   nateeja → /home: ${stats.home[1]} mein se ${stats.home[0]} safal${gap} · /orders: ${stats.orders[1]} mein se ${stats.orders[0]} safal · restarts ${restarts}`);
  console.log(`             DB ${s2(DB_UP)} par wapas → /orders phir se safal: ${s2(ordersBack)} par (DB ke ${s2(ordersBack - DB_UP)} baad)`);
}

(async () => {
  console.log(`3 pods (boot ${BOOT / 1000} s) · checker har ${PERIOD / 1000} s par poochhta hai: "zinda ho?" (${LIVE_FAILS} fail → restart) aur "traffic bhejein?" (${READY_FAILS} fail → traffic band)`);
  console.log(`DB ${s2(DB_DOWN)} se ${s2(DB_UP)} tak band · har ${GAP / 1000} s par ek /home (DB nahi chahiye) aur ek /orders (DB chahiye)`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
