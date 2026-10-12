/* ex0 · SLOW MOTION 2 — "har chot alag kami dikhati hai". Wahi system: 3 instances, baari-baari, har 0.2 s par ek request.
   Instance 2 par 1.00 s se 3.00 s tak ek fault (teeno ke liye wahi 2 s). Har request ke saath uska lagne wala samay (ms) bhi.
   Load balancer ka timeout 0.5 s. Health check har 0.3 s par (2 baar fail → bahar). Niyam: lib/rotation.js (asli services/lb.js bhi wahi).
   Teen fault:
     crash   instance ka connection turant toot-ta hai                  (/health bhi fail)
     slow    /work 2 s leta hai — timeout se bahut zyada                (/health tez, ✓)
     zombie  /work turant 500 deta hai                                  (/health phir bhi ✓)
   Modes (kam se kam setup jisme kami dikhe):
     crash       health check + retry
     slow-hc     slow · sirf health check
     slow        slow · health check + retry
     zombie-hc   zombie · sirf health check
     zombie      zombie · health check + retry
     eject       slow · health check + retry + passive ejection (2 request lagataar fail → 2 s ke liye bahar)
   (--fault zombie ke saath `eject` mode zombie par chalta hai.)
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-faults.js [--mode crash|slow-hc|slow|zombie-hc|zombie|eject] [--fault crash|slow|zombie] [--fast] */
const R = require('../lib/rotation');
const { sleep } = require('../lib/util');
const args = require('./args')();

const GAP = 200, FIRST = 250, RUN = 5100, ON = 1000, OFF = 3000, HC_EVERY = 300, HC_FIRST = 200;
const OK_MS = 10, CRASH_MS = 1, TIMEOUT = 500, EJECT_N = 2, EJECT_MS = 2000;
const SETUPS = {
  'crash':     { fault: 'crash',  retry: true,  eject: 0 },
  'slow-hc':   { fault: 'slow',   retry: false, eject: 0 },
  'slow':      { fault: 'slow',   retry: true,  eject: 0 },
  'zombie-hc': { fault: 'zombie', retry: false, eject: 0 },
  'zombie':    { fault: 'zombie', retry: true,  eject: 0 },
  'eject':     { fault: 'slow',   retry: true,  eject: EJECT_N },
};
const FAULTS = {
  crash:  { name: 'crash — connection turant toot-ta hai', why: 'connection toota', ms: CRASH_MS, hcFails: true },
  slow:   { name: 'slow — /work 2 s leta hai, /health tez', why: 'timeout', ms: TIMEOUT, hcFails: false },
  zombie: { name: 'zombie — /health ✓, /work 500', why: 'jawab 500', ms: OK_MS, hcFails: false },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const setupName = cfg => (cfg.retry ? 'health check + retry' : 'sirf health check') + (cfg.eject ? ` + passive ejection (${cfg.eject} lagataar fail → ${s2(EJECT_MS)} bahar)` : '');

async function run(mode) {
  const cfg = SETUPS[mode], fault = FAULTS[args.fault && mode === 'eject' ? args.fault : cfg.fault];
  /* ---- tay ghadi ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: ek hi pal par pehle kya (0 = nateeja/duniya, 1 = health check, 2 = request)
  const lines = [];
  const say = (text, t = clock) => lines.push(`   ${s2(t).padStart(7)}  ${text}`);

  /* ---- 3 instances; instance 2 (sick = 1) par fault ---- */
  const N = 3, sick = 1, rot = R.newRotation(N);
  const name = i => 'instance ' + (i + 1);
  const faulty = t => t >= ON && t < OFF;                                    // fault abhi chalu hai?
  /* ek koshish: instance i ko, waqt t par bheji. Lautata hai { ok, ms, why } */
  const attempt = (i, t) => (i === sick && faulty(t) ? { ok: false, ms: fault.ms, why: fault.why } : { ok: true, ms: OK_MS });
  let hcLeft = null, ejLeft = null;

  /* ---- health check: /health sirf crash mein fail ---- */
  function checkRound() {
    const marks = [], notes = [];
    for (let i = 0; i < N; i++) {
      const ok = !(i === sick && faulty(clock) && fault.hcFails), wasOut = rot.out[i], act = R.onHealth(rot, i, ok);
      marks.push(ok ? `${i + 1} ✓` : wasOut ? `${i + 1} ✗` : `${i + 1} ✗ (${rot.fails[i]}/${R.HEALTH_FAILS})`);
      if (act === 'out') { if (hcLeft == null) hcLeft = clock; notes.push(`→ ${name(i)}: rotation se BAHAR (health check ne)`); }
      if (act === 'in') notes.push(`→ ${name(i)}: rotation mein WAPAS`);
    }
    say(`🩺 health: ${marks.join(' · ')}`);
    notes.forEach(n => say(`   ${n}`));
  }

  /* ---- ek request: har koshish ka nateeja uske poora hone ke waqt load balancer ko pata chalta hai (passive ejection ke liye) ---- */
  let sent = 0, failed = 0, saved = 0, slowest = 0, reached = 0;
  function request() {
    const k = ++sent, tries = R.choose(rot, clock, cfg.retry), parts = [];
    let t = clock, ok = false;
    for (const i of tries) {
      const a = attempt(i, t);
      if (i === sick && faulty(t)) reached++;
      parts.push(`${name(i)} ${a.ok ? '✓' : '✗ ' + a.why}`);
      const done = t + a.ms;
      at(done, 0, () => {                                                    // load balancer ko nateeja ab pata chala
        if (R.onRequest(rot, i, a.ok, done, cfg.eject, EJECT_MS) === 'ejected') {
          if (ejLeft == null) ejLeft = done;
          say(`⏏️ ${name(i)}: ${cfg.eject} request lagataar fail → ${s2(EJECT_MS)} ke liye BAHAR (passive ejection)`, done);
          at(done + EJECT_MS, 0, () => say(`⏏️ ${name(i)}: ${s2(EJECT_MS)} poore → rotation mein WAPAS (phir se try hoga)`, done + EJECT_MS));
        }
      });
      t = done; ok = a.ok;
      if (ok) break;
    }
    const total = t - clock;
    if (parts.length > 1 && ok) saved++;
    if (!ok) failed++;
    slowest = Math.max(slowest, total);
    say(`${(('#' + k).padEnd(3) + ' → ' + parts.join(' → dobara ')).padEnd(60)} ${String(total).padStart(4)} ms`);
  }

  /* ---- ghatnayein ---- */
  at(ON, 0, () => say(`💥 ${name(sick)} par ${fault.name.split(' —')[0]} fault shuru`));
  at(OFF, 0, () => say(`✅ ${name(sick)} theek`));
  for (let t = HC_FIRST; t <= RUN; t += HC_EVERY) at(t, 1, checkRound);
  for (let t = FIRST; t <= RUN; t += GAP) at(t, 2, request);

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${fault.name} · ${setupName(cfg)} ===`);
  lines.forEach(l => console.log(l));
  console.log(`   nateeja → ${sent} requests · ${failed} fail · retry se bachi: ${saved} · sabse dheemi request: ${slowest} ms · kharab instance tak pahunchi: ${reached}`);
  console.log(`             health check ne ${name(sick)} ko bahar kiya: ${hcLeft == null ? 'kabhi nahi' : s2(hcLeft) + ' par'} · passive ejection ne: ${ejLeft == null ? 'kabhi nahi' : s2(ejLeft) + ' par'}`);
}

(async () => {
  console.log(`3 instances · har ${GAP / 1000} s par ek request, baari-baari · ${s2(ON)} se ${s2(OFF)} tak instance 2 par fault · timeout ${TIMEOUT / 1000} s · health check har ${HC_EVERY / 1000} s par`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fault ${Object.keys(FAULTS).join('|')}, --fast)`); process.exit(1); }
    if (args.fault && !FAULTS[args.fault]) { console.log(`\n--fault ${args.fault}? Yeh chalte hain: ${Object.keys(FAULTS).join(' | ')}`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
