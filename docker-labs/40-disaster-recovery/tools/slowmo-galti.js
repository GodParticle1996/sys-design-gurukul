/* ex0 · SLOW MOTION 4 — galti bhi copy ho jaati hai: replica backup nahi hai.
   Region A bilkul theek hai, poora waqt. Har 0.5 s par ek order. 7.75 s par kisi se galti ho gayi: A par
   "saare orders mita do" (DELETE) chal gaya. Copy lib/replicator.js karta hai — aur use nahi pata ki badlav galti hai ya sahi:
   DELETE bhi ek "badlav" hai, order jaisa. Woh bhi B tak jaata hai.
     replica   B ek replica hai: A se copy har 1 s. Dekho: DELETE B tak pahunchte hi B bhi khaali.
     backup    replica ke saath S3 mein snapshot bhi: har 3 s, ek ke baad ek jama (purane snapshot kabhi overwrite nahi hote).
               Galti 10.25 s par pakdi gayi → S3 se galti SE PEHLE ka aakhri snapshot wapas.
   S3 mein snapshot = us pal ka poora haal (koi log nahi) — isliye snapshot ke baad likhe orders wapas nahi aate.
   Ek hi pal par kram: copy / snapshot ki ghadi → order → (galti, restore). Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-galti.js [--mode replica|backup] [--fast] */
const { createReplicator } = require('../lib/replicator');
const { createSim, s2, ids } = require('./sim');
const args = require('./args')();

const GAP = 500, REPL = 1000, SNAP = 3000, MISTAKE = 7750, NOTICED = 10250, RUN = 11000;
const TICK = 0, ORDER = 1, WORLD = 2;                                  // ek hi pal par kaun pehle
const SETUPS = {
  replica: { name: 'replica — B ko har 1 s par copy · koi backup nahi', backup: false },
  backup:  { name: 'replica + backup — B ko har 1 s par copy, S3 mein har 3 s par snapshot (jama hote jaate hain)', backup: true },
};
/* ek batch ko line mein: kram wahi jo A mein likha gaya; lagataar numbers "#1–#12" ban jate hain, DELETE alag dikhta hai */
function label(batch) {
  const out = [];
  let run = [];
  const flush = () => { if (run.length) out.push(ids(run)); run = []; };
  batch.forEach(c => {
    if (c.type === 'delete-all') { flush(); out.push('🗑️ DELETE'); return; }
    if (run.length && c.id !== run[run.length - 1] + 1) flush();
    run.push(c.id);
  });
  flush();
  return out.join(', ');
}

async function run(mode) {
  const cfg = SETUPS[mode];
  const { at, say, go, now } = createSim({ fast: args.fast, run: RUN });
  console.log(`\n=== ${cfg.name} ===`);

  const snaps = [];                                                    // S3: {at, ids} — ek ke baad ek, koi overwrite nahi
  let before = [], restored = [], lost = [], bDeleted = null;

  /* ---- A → B copy ---- */
  async function shipB(batch) {
    const had = B.orders.size;
    batch.forEach(B.apply);
    say(`📦 copy: A → B   ${label(batch)} (${batch.length} badlav)`);
    if (batch.some(c => c.type === 'delete-all')) {
      bDeleted = now();
      say(`☠️ DELETE B tak bhi pahunch gayi: B ke saare orders gaye (${had} → ${B.orders.size}) — B ne galti ko bhi sahi badlav maana`);
    }
  }
  /* ---- A → S3: pichhla snapshot + naye badlav = naya snapshot (purane waise hi rakhe rehte hain) ---- */
  async function shipS3(batch) {
    batch.forEach(view.apply);
    snaps.push({ at: now(), ids: [...view.orders.keys()] });
    const late = now() > MISTAKE ? ' — galti ke BAAD ka haal' : '';
    say(`📸 snapshot #${snaps.length}: A → S3   ${view.orders.size} order (${ids(snaps[snaps.length - 1].ids)})${late}`);
  }
  const A = createReplicator({ ship: shipB, everyMs: REPL });          // A ka DB
  const B = createReplicator({ ship: async () => {} });                // B ka DB
  const A2 = cfg.backup ? createReplicator({ ship: shipS3, everyMs: SNAP }) : null;   // wahi niyam, 3 s ki ghadi
  const view = createReplicator({ ship: async () => {} });             // S3 ke aakhri snapshot ka haal
  for (let t = REPL; t <= RUN; t += REPL) at(t, TICK, () => A.tick());
  if (A2) for (let t = SNAP; t <= RUN; t += SNAP) at(t, TICK, () => A2.tick());
  const write = async change => { await A.write(change); if (A2) await A2.write(change); };
  const where = () => `A mein: ${A.orders.size} · B mein: ${B.orders.size} · raaste mein: ${A.pending()}`;

  /* ---- orders ---- */
  for (let id = 1, t = 0; t <= RUN; id++, t += GAP) at(t, ORDER, async () => {
    await write({ id });
    say(`#${String(id).padEnd(2)} → A ✓   ${where()}`);
  });

  /* ---- galti, phir galti pakdi gayi ---- */
  at(MISTAKE, WORLD, async () => {
    before = [...A.orders.keys()];
    const inB = B.orders.size;
    await write({ type: 'delete-all' });
    say(`🗑️ GALTI: kisi ne A par "saare orders mita do" (DELETE) chala diya → A mein: 0 (pehle ${before.length} the) · B mein abhi ${inB}; DELETE copy ke intezaar mein hai`);
  });
  at(NOTICED, WORLD, async () => {
    if (!cfg.backup) {
      say('🔎 galti pakdi gayi — par wapas laane ko kuch nahi hai: purane orders na A mein, na B mein, aur koi snapshot nahi');
      return;
    }
    const list = snaps.map(s => `${s2(s.at)} (${s.ids.length} order)`).join(' · ');
    say(`🔎 galti pakdi gayi. S3 mein ${snaps.length} snapshot hain: ${list}`);
    const good = snaps.filter(s => s.at < MISTAKE).pop();              // galti se PEHLE ka aakhri
    for (const id of good.ids) await write({ id });                    // restore bhi ek naya likhna hai: B tak copy apne aap jaayegi
    restored = good.ids;
    lost = before.filter(id => !restored.includes(id));
    say(`🛟 restore: sabse naya snapshot (${s2(snaps[snaps.length - 1].at)}) galti ke BAAD ka hai, wapas nahi chalega. Galti se pehle ka aakhri: ${s2(good.at)} wala → ${restored.length} order wapas (${ids(restored)})`);
    say(`   nahi mil sakte: ${ids(lost)} (${lost.length} order) — ${s2(good.at)} ke baad likhe gaye the, kisi snapshot mein gaye hi nahi`);
  });

  await go();

  console.log(`   nateeja → galti (${s2(MISTAKE)}) se pehle ${before.length} orders · galti ke turant baad A mein 0 · B mein bhi 0 (${s2(bDeleted)} par DELETE B tak pahunchi)`);
  if (cfg.backup) console.log(`             S3 se wapas aaye: ${restored.length} order · nahi mil sake: ${ids(lost)} (${lost.length} order) · ${s2(RUN)} par A mein ${A.orders.size}, B mein ${B.orders.size} (restore + naye orders)`);
  else console.log(`             wapas laane ka koi tareeka nahi: ${before.length} orders gaye · ${s2(RUN)} par A mein ${A.orders.size}, B mein ${B.orders.size} (sirf galti ke baad ke naye orders)`);
}

(async () => {
  console.log(`galti bhi copy ho jaati hai · har ${GAP / 1000} s par ek order · A poora waqt theek · ${s2(MISTAKE)} par A par "saare orders mita do" · replica ko copy har ${REPL / 1000} s`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
