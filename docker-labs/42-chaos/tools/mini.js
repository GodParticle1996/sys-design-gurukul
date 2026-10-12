/* Sabse chhota chalta prayog: 3 nakli instances + lib/monkey.js + lib/experiment.js. Koi service nahi chalani.
   Upar ka hissa (line 5–53) wahi hai jo tum apne app mein likhoge. Neeche ka hissa bas table chhapne ke liye hai.
   Ghadi aur "random" dono nakli/tay hain (sleep kuch nahi karta, beej 7), isliye har run mein wahi output.
   node tools/mini.js */
const { createMonkey } = require('../lib/monkey');
const { runExperiment } = require('../lib/experiment');
const seeded = require('./seeded');

const instances = [1, 2, 3].map(n => ({ n, dead: false }));

// nakli load balancer: baari-baari, retry ho toh agle par
function makeCaller(retry) {
  let next = 0;
  return function call() {
    const a = instances[next++ % 3];
    if (!a.dead) return true;
    if (!retry) return false;
    return !instances[next % 3].dead;
  };
}

// 20 requests bhejo, safal % lautao
function measure(call) {
  let ok = 0;
  for (let i = 0; i < 20; i++) {
    if (call()) ok++;
  }
  return (ok / 20) * 100;
}

function experiment(retry) {
  const call = makeCaller(retry);
  const monkey = createMonkey({
    targets: instances,
    kill: inst => { inst.dead = true; },
    random: seeded(7),
    everyMs: 1000,
  });
  const out = { victim: null };
  out.done = runExperiment({
    measure: () => measure(call),
    hypothesis: m => m >= 95,
    inject: () => { out.victim = monkey.strike(); },
    rollback: () => {
      instances.forEach(i => { i.dead = false; });
    },
    abortIf: m => m < 80,
    watchMs: 3000,
    everyMs: 1000,
    sleep: async () => {},   // nakli (asli: setTimeout)
  });
  return out;
}

/* ------------------------------------------------------------------ sirf table chhapne ke liye ------------------------------------------------------------------ */
const pct = m => (m == null ? '—' : Math.round(m) + '%');
const col = (v, w) => String(v).padStart(w);

(async () => {
  console.log('3 nakli instances, baari-baari · hypothesis: kam se kam 95% safal · abort rule: 80% se neeche · monkey (beej 7)\n');
  console.log(`${''.padEnd(12)}  steady  ${'fault'.padEnd(16)} ${col('t=1 s', 6)} ${col('t=2 s', 6)} ${col('t=3 s', 6)}   faisla`);
  for (const [name, retry] of [['retry nahi', false], ['retry hai', true]]) {
    const run = experiment(retry), r = await run.done;
    const at = i => col(pct(r.samples[i] && r.samples[i].m), 6);
    const verdict = r.abortedAt == null ? r.verdict : `${r.verdict} (${r.abortedAt} ms par roka)`;
    console.log(`${name.padEnd(12)}  ${col(pct(r.steady), 6)}  ${(run.victim ? 'instance ' + run.victim.n + ' mara' : 'kuch nahi toda').padEnd(16)} ${at(0)} ${at(1)} ${at(2)}   ${verdict}`);
  }
  console.log('\nfaisla: ABORT = abort rule lagi, fault turant hataya · hypothesis tika = fault ke dauraan bhi hypothesis sach');
  console.log('       hypothesis toota = fault poora chala, hypothesis jhooti · shuru hi mat karo = steady state hi kharab tha');
})();
