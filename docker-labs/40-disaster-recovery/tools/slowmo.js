/* ex0 · SLOW MOTION 1 — region A gaya, chhote paimaane par, taaki har order aur har copy dikhe.
   KhanaKart ke orders: har 0.5 s par ek order router se. Router har 0.5 s par region A ko poochhta hai ("theek ho?");
   lagataar 3 jawab "nahi" (lib/failover.js) → failover: saara traffic B par. Region A 4.00 s par gaya.
   Orders ki copy lib/replicator.js karta hai — fark sirf yeh ki order kitni der "jama" rehta hai:
     backup   B mein kuch nahi chalta. A har 3 s par jama orders S3 mein daalta hai. Failover ke baad B banana padta hai (6 s).
     pilot    B ka DB chalu: A se copy har 1 s. B ka app band — failover ke baad boot (3 s).
     warm     B ka DB + ek chhota app (1 s mein 1 order le sakta hai). Failover ke baad 2 s mein poora bada hota hai.
     active   router baari-baari A, B ko bhejta hai (#1 A, #2 B …). Dono ek-doosre ko har 1 s par copy bhejte hain.
   ⏱️ Samay chhota kiya hai: 6 s / 3 s / 2 s asli duniya mein ghante / minute hote hain; "har 3 s" asli mein "har ghante".
   Ek hi pal par kram: copy ki ghadi → router ka check → order → (A ka jaana). Yaani 4.00 s wala order A ko mil jaata hai
   (usko "ho gaya" bhi milta hai), phir A jaata hai. Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo.js [--mode backup|pilot|warm|active] [--fast] */
const { createReplicator } = require('../lib/replicator');
const { createDetector } = require('../lib/failover');
const { createSim, s2, ids } = require('./sim');
const args = require('./args')();

const GAP = 500, CHECK = 500, FAILS = 3, A_DIES = 4000, RUN = 13000;
const SNAP = 3000, REPL = 1000, PROVISION = 6000, BOOT = 3000, SCALE = 2000, SMALL_GAP = 1000;
const WORLD = 0, COPY = 1, ASK = 2, ORDER = 3, DIES = 4;               // ek hi pal par kaun pehle
const SETUPS = {
  backup: { name: 'backup & restore — B mein kuch nahi · A har 3 s par S3 mein copy · failover ke baad B banana padta hai (6 s)', every: SNAP,
    normal: 'kuch nahi chalta — sirf S3 mein copy (kharcha: bas storage)' },
  pilot:  { name: 'pilot light — B ka DB chalu (copy har 1 s) · B ka app band, failover ke baad boot (3 s)', every: REPL,
    normal: 'sirf DB chalu (copy leta rehta hai) · app band' },
  warm:   { name: 'warm standby — B ka DB + chhota app (1 s mein 1 order) · failover ke baad 2 s mein bada', every: REPL,
    normal: 'DB + ek chhota app (aadha traffic le sakta hai) — hamesha chalu' },
  active: { name: 'active-active — dono region poore chalu · router baari-baari A, B · dono ek-doosre ko copy (har 1 s)', every: REPL,
    normal: 'poora region, aadha traffic — hamesha' },
};

async function run(mode) {
  const cfg = SETUPS[mode];
  const { at, say, go, now } = createSim({ fast: args.fast, run: RUN });
  console.log(`\n=== ${cfg.name} ===`);

  let aAlive = true, failedOver = false, failedAt = null, saidOk = false;
  const s3 = [];                                                       // S3: batch par batch jama, koi overwrite nahi
  const acked = [], log = [];                                          // acked: jinko "ho gaya" mila · log: har order ka nateeja
  const detector = createDetector({ threshold: FAILS });
  const b = { app: { backup: 'off', pilot: 'off', warm: 'small', active: 'full' }[mode], why: 'B ka app band hai', last: -Infinity };
  const s3n = () => s3.reduce((n, x) => n + x.changes.length, 0);

  /* ---- do regions: har ek ka DB aur copy lib/replicator.js ka ---- */
  async function shipA(batch) {                                        // A → B (backup mein A → S3)
    if (!aAlive) throw new Error('A gaya');
    if (mode === 'backup') {
      s3.push({ at: now(), changes: batch });
      say(`📦 snapshot: A → S3   ${ids(batch.map(c => c.id))} (${batch.length} order)`);
    } else {
      batch.forEach(c => B.apply(c));
      say(`📦 copy: A → B   ${ids(batch.map(c => c.id))} (${batch.length} order)`);
    }
  }
  async function shipB(batch) {                                        // B → A (sirf active mein chalta hai)
    if (!aAlive) throw new Error('A gaya');
    batch.forEach(c => A.apply(c));
    say(`📦 copy: B → A   ${ids(batch.map(c => c.id))} (${batch.length} order)`);
  }
  const A = createReplicator({ ship: shipA, everyMs: cfg.every });
  const B = createReplicator({ ship: shipB, everyMs: REPL });
  const copyTick = (rep, every) => { for (let t = every; t <= RUN; t += every) at(t, COPY, () => { if (aAlive) rep.tick(); }); };
  copyTick(A, cfg.every);
  if (mode === 'active') copyTick(B, REPL);

  /* ---- har line par dono taraf ka haal ---- */
  function counts() {
    if (!aAlive) return `B mein: ${B.orders.size}`;
    if (mode === 'backup') return `A mein: ${A.orders.size} · S3 tak pahunche: ${s3n()} · raaste mein: ${A.pending()}`;
    if (mode === 'active') return `A mein: ${A.orders.size} · B mein: ${B.orders.size} · raaste mein: ${A.pending() + B.pending()}`;
    return `A mein: ${A.orders.size} · B tak pahunche: ${B.orders.size} · raaste mein: ${A.pending()}`;
  }

  /* ---- B kab order leta hai ---- */
  function bRefuses() {
    if (b.app === 'off') return b.why;
    if (b.app === 'small') {
      if (now() - b.last < SMALL_GAP) return 'B ka chhota app: 1 s mein 1 hi order';
      b.last = now();
    }
    return null;
  }
  function activateB() {                                               // router ne B ko "activate" kaha
    if (mode === 'backup') {
      b.why = 'B abhi ban raha hai';
      say(`🏗️ B mein kuch tha hi nahi — machines + DB banane mein ${PROVISION / 1000} s (${s2(now() + PROVISION)} par tayyar)`);
      at(now() + PROVISION, WORLD, () => {
        s3.forEach(x => x.changes.forEach(c => B.apply(c)));
        b.app = 'full';
        say(`🚪 B ban gaya · S3 se restore: ${B.orders.size} order wapas (${ids([...B.orders.keys()])}) · app chalu`);
      });
    } else if (mode === 'pilot') {
      b.why = 'B ka app boot ho raha hai';
      say(`🚀 B ka DB chal raha hai, app band — app boot mein ${BOOT / 1000} s (${s2(now() + BOOT)} par khulega)`);
      at(now() + BOOT, WORLD, () => { b.app = 'full'; say('🚪 B ka app khul gaya'); });
    } else if (mode === 'warm') {
      say(`🚀 B ka chhota app chal raha hai (1 s mein 1 order) — ${SCALE / 1000} s mein bada hoga (${s2(now() + SCALE)} par)`);
      at(now() + SCALE, WORLD, () => { b.app = 'full'; say('📈 B bada ho gaya: ab poori capacity'); });
    } else {
      say('🚀 B pehle se poora chal raha hai — ab A ka hissa bhi B ko');
    }
  }

  /* ---- router: har 0.5 s par A se poochho. Niyam lib/failover.js ka ---- */
  for (let t = CHECK; t <= RUN; t += CHECK) at(t, ASK, () => {
    if (failedOver) return;
    const fired = detector.result(aAlive);
    if (aAlive && !saidOk) { saidOk = true; say(`🩺 router ne A se poochha: theek ✓ (aage har ${CHECK / 1000} s par; sirf badlav dikhega)`); }
    if (!aAlive) say(`🩺 A ✗ (lagataar fail ${detector.fails()}/${FAILS})${fired ? ` → FAILOVER: router ne B ko "activate" kaha, ab saara traffic B par` : ''}`);
    if (fired) { failedOver = true; failedAt = now(); activateB(); }
  });

  /* ---- orders ---- */
  for (let id = 1, t = 0; t <= RUN; id++, t += GAP) at(t, ORDER, async () => {
    const region = failedOver || (mode === 'active' && id % 2 === 0) ? 'B' : 'A';
    const why = region === 'A' ? (aAlive ? null : 'A band hai') : bRefuses();
    const tag = `#${String(id).padEnd(2)} → ${region}`;
    log.push({ id, t, ok: !why });
    if (why) return say(`${tag} ✗ (${why})`);
    await (region === 'A' ? A : B).write({ id });                      // async: "ho gaya" turant, copy baad mein
    acked.push(id);
    say(`${tag} ✓   ${counts()}`);
  });

  /* ---- region A gaya ---- */
  at(A_DIES, DIES, () => {
    const there = id => (mode === 'backup' ? s3.some(x => x.changes.some(c => c.id === id)) : B.orders.has(id));
    const lost = [...A.orders.keys()].filter(id => !there(id));
    if (lost.length !== A.pending()) throw new Error(`model galat: kho gaye ${lost.length} ≠ raaste mein ${A.pending()}`);
    aAlive = false;
    say(`💥 region A gaya — jo orders sirf A mein the (raaste mein), woh ab kabhi nahi pahunchenge: ${ids(lost)}`);
  });

  await go();

  const failed = log.filter(x => !x.ok), lastFail = Math.max(...failed.map(x => x.t));
  const backAt = log.find(x => x.t > lastFail && x.ok).t;
  const missing = acked.filter(id => !B.orders.has(id));
  console.log(`   nateeja → A ${s2(A_DIES)} par gaya · router ko pata ${s2(failedAt)} par · orders phir se safal: ${s2(backAt)} par (A ke ${s2(backAt - A_DIES)} baad)`);
  console.log(`             fail hue: ${failed.length} order (${ids(failed.map(x => x.id))}) · "ho gaya" mila par B mein nahi: ${ids(missing)} (${missing.length} order)`);
  console.log(`             aam din B mein: ${cfg.normal}`);
}

(async () => {
  console.log(`region A gaya · har ${GAP / 1000} s par ek order · router har ${CHECK / 1000} s par A ko poochhta hai, lagataar ${FAILS} "nahi" → B par · A ${s2(A_DIES)} par gaya`);
  console.log(`ghadi nakli aur tay hai · copy: backup mein har ${SNAP / 1000} s, baaki mein har ${REPL / 1000} s · B banane / boot / bada karne mein ${PROVISION / 1000} / ${BOOT / 1000} / ${SCALE / 1000} s`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
