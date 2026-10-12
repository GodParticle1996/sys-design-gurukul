/* ex3 · Prayog (lib/experiment.js) asli services par. Peeche 100 req/s load chalta rehta hai.
   Prayog:
     naap        pichhle 500 ms mein poori hui requests ka safal %  (monitoring jaisa)
     hypothesis  fault ke dauraan kam se kam 95% safal
     inject      instance 2 par fault (--fault zombie | slow | crash; default zombie)
     dekhna      har 500 ms par naapo, 6 s tak
     abort rule  80% se neeche → turant rollback (har row do baar: abort rule ke saath aur bina)
     rollback    fault hatao
   Teen setup × (abort rule laga / nahi) = 6 row, aur ek 7vaan: instance 3 PEHLE SE zombie hai (kisi ne dekha nahi)
   → steady state hi kharab → prayog shuru hi nahi hona chahiye.
   Table:
     steady     shuru ka naap · kharab = fault ke dauraan sabse kharab naap
     fault chala  inject se rollback tak asli seconds
     fail       is dauraan SHURU hui requests mein se fail (blast radius)
   node tools/experiment.js [--fault zombie|slow|crash] */
const { runExperiment } = require('../lib/experiment');
const { post, sleep, host } = require('../lib/util');
const args = require('./args')();
const LB = `http://${host('lb')}:5211`;
const APPS = [5212, 5213, 5214].map((p, i) => `http://${host('app' + (i + 1))}:${p}`);
const RATE = 100, WARM = 1500, WINDOW = 500, EVERY = 500, WATCH = 6000, TAIL = 1000, HYPOTHESIS = 95, ABORT_BELOW = 80, EJECT_N = 2;
const FAULTS = { crash: 'kill', slow: 'slow', zombie: 'zombie' };            // naam → /fault ka type
const SETUPS = {
  hc:    ['health check hi', { instances: 3, health: true, retry: false, eject: 0 }],
  retry: ['health check + retry', { instances: 3, health: true, retry: true, eject: 0 }],
  eject: ['health check + retry + passive ejection', { instances: 3, health: true, retry: true, eject: EJECT_N }],
};

async function one() {
  try { const r = await fetch(LB + '/work'); await r.arrayBuffer(); return r.ok; } catch (e) { return false; }
}

/* peeche chalta load: har request ka { shuru, poori hui, safal } */
function startLoad() {
  const log = [], jobs = [], t0 = Date.now();
  let on = true;
  (async () => {
    for (let i = 0; on; i++) {
      const at = Date.now();
      jobs.push(one().then(ok => log.push({ at, done: Date.now(), ok })));
      await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
    }
  })();
  return { log, stop: async () => { on = false; await Promise.all(jobs); } };
}

async function row(fault, setup, abort, pre) {
  for (const a of APPS) await post(a + '/reset');
  await post(LB + '/config', SETUPS[setup][1]);
  if (pre) await post(APPS[2] + '/fault', { type: 'zombie' });               // chhupa hua purana fault
  await sleep(400);
  const load = startLoad();
  await sleep(WARM);
  let injectedAt = null, rolledAt = null;
  const measure = async () => {                                              // pichhle WINDOW ms mein poori hui requests ka safal %
    const w = load.log.filter(x => x.done > Date.now() - WINDOW);
    return w.length ? (100 * w.filter(x => x.ok).length) / w.length : 0;
  };
  const r = await runExperiment({
    measure,
    hypothesis: m => m >= HYPOTHESIS,
    inject: async () => { await post(APPS[1] + '/fault', { type: FAULTS[fault] }); injectedAt = Date.now(); },
    rollback: async () => { await post(APPS[1] + '/fault', { type: 'none' }); rolledAt = Date.now(); },
    abortIf: abort ? m => m < ABORT_BELOW : undefined,
    watchMs: WATCH, everyMs: EVERY, sleep,
  });
  await sleep(TAIL);
  await load.stop();
  const blast = injectedAt == null ? 0 : load.log.filter(x => !x.ok && x.at >= injectedAt && x.at < rolledAt).length;
  return { r, live: injectedAt == null ? 0 : (rolledAt - injectedAt) / 1000, blast };
}

(async () => {
  const fault = args.fault || 'zombie';
  if (!FAULTS[fault]) { console.log(`--fault ${fault}? Yeh chalte hain: ${Object.keys(FAULTS).join(' | ')}`); process.exit(1); }
  console.log(`🔬 fault: ${fault} (instance 2) · ${RATE} req/s · hypothesis ≥ ${HYPOTHESIS}% safal · abort rule < ${ABORT_BELOW}% · har ${EVERY} ms par naap, ${WATCH / 1000} s tak\n`);
  console.log('setup                                         abort rule   faisla                        steady   kharab   fault chala   fail');
  const rows = [];
  for (const s of Object.keys(SETUPS)) for (const abort of [true, false]) rows.push([SETUPS[s][0], s, abort, false]);
  rows.push(['health check hi · instance 3 pehle se zombie', 'hc', true, true]);
  for (const [name, setup, abort, pre] of rows) {
    const { r, live, blast } = await row(fault, setup, abort, pre);
    const verdict = r.abortedAt == null ? r.verdict : `${r.verdict} (${(r.abortedAt / 1000).toFixed(1)} s par)`;
    const worst = r.samples.length ? Math.round(r.worst) + '%' : '—';
    console.log(`${name.padEnd(45)} ${(abort ? 'laga hai' : 'nahi').padEnd(11)}  ${verdict.padEnd(28)} ${(Math.round(r.steady) + '%').padStart(6)}  ${worst.padStart(7)}   ${(live.toFixed(1) + ' s').padStart(11)}   ${String(blast).padStart(4)}`);
    await sleep(500);
  }
})();
