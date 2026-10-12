/* ex0 · SLOW MOTION 1 — "ek instance mara", chhote paimaane par, taaki har request dikhe.
   KhanaKart ka load balancer baari-baari (round robin) requests bhejta hai; har 0.2 s par ek (#1, #2, …).
   Instance 2 (`one` mode mein akela instance 1) 1.00 s par mar jaata hai, 3.00 s par wapas aata hai.
   Mara hua instance connection turant tod deta hai (✗ connection toota).
   Health check (har 0.3 s) aur retry ke niyam lib/rotation.js ke hain — asli services/lb.js bhi wahi chalata hai.
   Setups:
     one     1 instance — wahi mar jaata hai
     three   3 instances, health check nahi
     health  3 instances + health check (2 baar fail → rotation se bahar, 1 baar theek → wapas)
     retry   health check + retry (fail hui request ek baar agle instance par)
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo.js [--mode one|three|health|retry] [--fast] */
const R = require('../lib/rotation');
const { sleep } = require('../lib/util');
const args = require('./args')();

const GAP = 200, FIRST = 250, RUN = 5100, DIE = 1000, BACK = 3000, HC_EVERY = 300, HC_FIRST = 200;
const SETUPS = {
  one:    { name: '1 instance — wahi mar jaata hai', n: 1, health: false, retry: false },
  three:  { name: '3 instances, health check nahi', n: 3, health: false, retry: false },
  health: { name: '3 instances + health check', n: 3, health: true, retry: false },
  retry:  { name: '3 instances + health check + retry', n: 3, health: true, retry: true },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';

async function run(mode) {
  const cfg = SETUPS[mode];
  /* ---- tay ghadi ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: ek hi pal par pehle kya (0 = duniya badli, 1 = health check, 2 = request)
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  /* ---- instances: kaun marta hai? (`one` mein instance 1, warna instance 2) ---- */
  const sick = cfg.n === 1 ? 0 : 1;
  let down = false;
  const alive = i => !(i === sick && down);
  const name = i => 'instance ' + (i + 1);
  const rot = R.newRotation(cfg.n);                                          // rotation ke niyam: lib/rotation.js
  let leftAt = null, backAt = null;

  /* ---- health check: har instance se /health poochho, niyam lib/rotation.js ka ---- */
  function checkRound() {
    const marks = [], notes = [];
    for (let i = 0; i < cfg.n; i++) {
      const ok = alive(i), wasOut = rot.out[i], act = R.onHealth(rot, i, ok);
      marks.push(ok ? `${i + 1} ✓` : wasOut ? `${i + 1} ✗` : `${i + 1} ✗ (${rot.fails[i]}/${R.HEALTH_FAILS})`);
      if (act === 'out') { leftAt = clock; notes.push(`→ ${name(i)}: rotation se BAHAR`); }
      if (act === 'in') { backAt = clock; notes.push(`→ ${name(i)}: rotation mein WAPAS`); }
    }
    say(`🩺 health: ${marks.join(' · ')}`);
    notes.forEach(n => say(`   ${n}`));
  }

  /* ---- ek request: load balancer ne chuna, instance ne jawab diya ya nahi ---- */
  let sent = 0, failed = 0, saved = 0, streak = 0, longest = 0;
  function request() {
    const k = ++sent, tries = R.choose(rot, clock, cfg.retry), parts = [];
    let ok = false;
    for (const i of tries) {
      ok = alive(i);
      parts.push(`${name(i)} ${ok ? '✓' : '✗ (connection toota)'}`);
      if (ok) break;
    }
    if (tries.length > 1 && parts.length > 1 && ok) saved++;
    if (ok) streak = 0; else { failed++; streak++; longest = Math.max(longest, streak); }
    say(`${('#' + k).padEnd(3)} → ${parts.join(' → dobara ')}`);
  }

  /* ---- ghatnayein ---- */
  at(DIE, 0, () => { down = true; say(`💥 ${name(sick)} mar gaya`); });
  at(BACK, 0, () => { down = false; say(`✅ ${name(sick)} wapas chalu`); });
  if (cfg.health) for (let t = HC_FIRST; t <= RUN; t += HC_EVERY) at(t, 1, checkRound);
  for (let t = FIRST; t <= RUN; t += GAP) at(t, 2, request);

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${cfg.name} ===`);
  lines.forEach(l => console.log(l));
  console.log(`   nateeja → ${sent} requests · ${failed} fail · sabse lamba lagataar fail: ${longest} · retry se bachi: ${saved}`);
  const rotation = !cfg.health ? 'health check nahi hai — mara hua bhi rotation mein hi raha'
    : `${name(sick)} rotation se bahar: ${leftAt == null ? 'kabhi nahi' : s2(leftAt) + ' par'} · wapas: ${backAt == null ? 'kabhi nahi' : s2(backAt) + ' par'}`;
  console.log(`             ${rotation}`);
}

(async () => {
  console.log(`har ${GAP / 1000} s par ek request, baari-baari · ${s2(DIE)} par instance 2 mara, ${s2(BACK)} par wapas (jahan sirf ek instance hai, wahi marta hai) · health check har ${HC_EVERY / 1000} s par`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
