/* ex0 · SLOW MOTION 3 — "prayog, aur band karne ka button". lib/experiment.js ek nakli ghadi par.
   Wahi system: 3 instances, baari-baari, har 0.2 s par ek request, health check har 0.3 s par (niyam: lib/rotation.js).
   Prayog 2.00 s par shuru hota hai:
     1. steady state naapo: pichhle 1 s ki requests mein safal %      (measure)
     2. hypothesis: fault ke dauraan kam se kam 90% safal              (hypothesis)
     3. instance 2 ko 'zombie' banao: /health ✓, /work 500             (inject)
     4. har 1 s par dobara naapo, 4 s tak                              (watchMs, everyMs)
     5. abort rule: 70% se neeche gaye toh turant roko                 (abortIf)
     6. fault hatao                                                    (rollback)  → faisla (verdict)
   Modes:
     abort     sirf health check · abort rule laga hai          (hypothesis toot-ti hai, prayog jaldi ruk jaata hai)
     no-abort  sirf health check · abort rule nahi              (wahi, par fault poore 4 s chalta hai)
     holds     health check + retry · abort rule laga hai       (hypothesis tikti hai)
     refuse    sirf health check · instance 3 PEHLE SE zombie   (steady state hi kharab → prayog shuru hi nahi hota)
   "Blast radius" = prayog ki wajah se fail hui requests (fault lagne se rollback tak).
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-experiment.js [--mode abort|no-abort|holds|refuse] [--fast] */
const R = require('../lib/rotation');
const { runExperiment } = require('../lib/experiment');
const { sleep } = require('../lib/util');
const args = require('./args')();

const GAP = 200, FIRST = 250, HC_EVERY = 300, HC_FIRST = 200, OK_MS = 10, MAX_RUN = 12000, TAIL = 1000;
const START = 2000, WINDOW = 1000, EVERY = 1000, WATCH = 4000, HYPOTHESIS = 90, ABORT_BELOW = 70;
const SETUPS = {
  'abort':    { name: 'sirf health check · abort rule laga hai', retry: false, abort: true, pre: -1 },
  'no-abort': { name: 'sirf health check · abort rule nahi', retry: false, abort: false, pre: -1 },
  'holds':    { name: 'health check + retry · abort rule laga hai', retry: true, abort: true, pre: -1 },
  'refuse':   { name: 'sirf health check · instance 3 pehle se zombie', retry: false, abort: true, pre: 2 },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';

async function run(mode) {
  const cfg = SETUPS[mode];
  /* ---- tay ghadi ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0, end = MAX_RUN;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: ek hi pal par pehle kya (0 = duniya / prayog, 1 = health check, 2 = request)
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  /* ---- 3 instances; zombie[i] = true → /health ✓ par /work 500 ---- */
  const N = 3, rot = R.newRotation(N), zombie = [false, false, false];
  if (cfg.pre >= 0) zombie[cfg.pre] = true;
  const name = i => 'instance ' + (i + 1);
  const log = [];                                                            // har request: { start, ok }  (poori 10 ms baad hoti hai)
  let injectedAt = null, rolledAt = null;

  /* ---- health check: zombie ko bhi ✓ milta hai ---- */
  function checkRound() {
    zombie.forEach((z, i) => R.onHealth(rot, i, true));
    say(`🩺 health: ${zombie.map((z, i) => `${i + 1} ✓`).join(' · ')}`);
  }

  /* ---- ek request ---- */
  let sent = 0;
  function request() {
    const k = ++sent, tries = R.choose(rot, clock, cfg.retry), parts = [];
    let ok = false;
    for (const i of tries) {
      ok = !zombie[i];
      parts.push(`${name(i)} ${ok ? '✓' : '✗ jawab 500'}`);
      if (ok) break;
    }
    log.push({ start: clock, done: clock + OK_MS * parts.length, ok, retried: parts.length > 1 && ok });
    say(`${('#' + k).padEnd(3)} → ${parts.join(' → dobara ')}`);
  }

  /* ---- prayog ke haath: measure / inject / rollback ---- */
  const measure = async () => {
    const w = log.filter(x => x.done <= clock && x.done > clock - WINDOW), good = w.filter(x => x.ok).length;
    const pct = w.length ? (100 * good) / w.length : 0;
    say(`📏 naap: pichhle ${WINDOW / 1000} s mein ${w.length} requests, ${good} safal = ${pct}%`);
    return pct;
  };
  const inject = async () => { zombie[1] = true; injectedAt = clock; say(`💥 inject: ${name(1)} zombie bana (/health ✓, /work 500)`); };
  const rollback = async () => { zombie[1] = false; rolledAt = clock; say(`↩️ rollback: ${name(1)} theek kiya`); };
  const abortIf = m => {
    const hit = m < ABORT_BELOW;
    if (hit) say(`🛑 ${m}% < ${ABORT_BELOW}% — abort rule lagi`);
    return hit;
  };

  /* ---- ghatnayein ---- */
  if (cfg.pre >= 0) at(0, 0, () => say(`⚠️ ${name(cfg.pre)} pehle se zombie hai — kisi ne dekha nahi`));
  let result = null;
  at(START, 0, () => {
    say(`🔬 prayog shuru — pehle naapo, hypothesis: kam se kam ${HYPOTHESIS}% safal`);
    runExperiment({
      measure, inject, rollback,
      hypothesis: m => m >= HYPOTHESIS,
      abortIf: cfg.abort ? abortIf : undefined,
      watchMs: WATCH, everyMs: EVERY,
      sleep: ms => new Promise(resolve => at(clock + ms, 0, resolve)),       // nakli sleep: ghadi ke is waqt tak ruko
    }).then(r => {
      result = r; end = clock + TAIL;
      say(`📋 faisla: ${r.verdict}`);
    });
  });
  for (let t = HC_FIRST; t <= MAX_RUN; t += HC_EVERY) at(t, 1, checkRound);
  for (let t = FIRST; t <= MAX_RUN; t += GAP) at(t, 2, request);

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > end) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
    await new Promise(resolve => setImmediate(resolve));                     // prayog ka async code is pal ka kaam poora kar le
  }

  console.log(`\n=== ${cfg.name} ===`);
  lines.forEach(l => console.log(l));
  const blast = injectedAt == null ? 0 : log.filter(x => !x.ok && x.start >= injectedAt && x.start < rolledAt).length;
  const live = injectedAt == null ? 0 : rolledAt - injectedAt;
  const when = result.abortedAt == null ? '' : ` (roka: ${s2(result.abortedAt)} par)`;
  console.log(`   nateeja → faisla: ${result.verdict}${when} · fault ${injectedAt == null ? 'kabhi nahi lagaya' : s2(live) + ' chala'} · fail hui requests (blast radius): ${blast}`);
  const saved = log.filter(x => x.retried).length;
  console.log(`             steady state ${result.steady}% · sabse kharab naap ${result.samples.length ? result.worst + '%' : '—'} · naap liye: ${result.samples.length} · retry se bachi: ${saved}`);
}

(async () => {
  console.log(`3 instances, baari-baari, har ${GAP / 1000} s par ek request · prayog ${s2(START)} par · hypothesis ≥ ${HYPOTHESIS}% safal · abort rule < ${ABORT_BELOW}% · fault ${WATCH / 1000} s tak dekhna`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
