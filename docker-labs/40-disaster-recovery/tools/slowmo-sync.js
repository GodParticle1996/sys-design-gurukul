/* ex0 · SLOW MOTION 2 — pehle "ho gaya" ya pehle copy? Ek line ka fark: RPO ya time-per-order.
   Region A orders leta hai, region B ka DB chalu hai (pilot-jaisa). Har 0.5 s par ek order.
   Copy lib/replicator.js karta hai. A se B tak ek chakkar (jaana + aana) 0.2 s lagta hai (nakli).
     async         order rakho, TURANT "ho gaya"; jama orders har 1 s par B ko jaate hain
     sync          PEHLE B ka jawab (0.2 s), phir A mein rakho, PHIR "ho gaya"
   Aur agar B tak pahunchna band ho jaye (B ka DB / beech ka raasta):
     async-b-down  B 2.00 s se 4.00 s tak unreachable · A theek · orders aate rahe
     sync-b-down   wahi — par har order B ka jawab 0.4 s dekhta hai, phir fail
   async / sync mein A 3.10 s par gaya (sync ka ek order tab B ke jawab ka intezaar kar raha hai).
   Model: copy tab "pahunchi" maani jaati hai jab B ka jawab A tak aa jaye; us se pehle A gaya toh copy bhi gayi.
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-sync.js [--mode async|sync|async-b-down|sync-b-down] [--fast] */
const { createReplicator } = require('../lib/replicator');
const { createSim, s2, ids } = require('./sim');
const args = require('./args')();

const GAP = 500, RTT = 200, REPL = 1000, TIMEOUT = 400, DOWN_FROM = 2000, DOWN_TO = 4000, A_DIES = 3100;
const WORLD = 0, COPY = 1, ORDER = 2, DIES = 3;                        // ek hi pal par kaun pehle
const SETUPS = {
  'async':        { name: 'async — pehle "ho gaya", copy baad mein (har 1 s)', sync: false, run: 3500, dies: true },
  'sync':         { name: 'sync — pehle B ka jawab (0.2 s), phir "ho gaya"', sync: true, run: 3500, dies: true },
  'async-b-down': { name: 'async — B 2 s ke liye unreachable', sync: false, run: 6200, down: true },
  'sync-b-down':  { name: 'sync — B 2 s ke liye unreachable', sync: true, run: 6200, down: true },
};

async function run(mode) {
  const cfg = SETUPS[mode];
  const { at, say, go, now } = createSim({ fast: args.fast, run: cfg.run });
  console.log(`\n=== ${cfg.name} ===`);

  let aAlive = true, maxWaiting = 0, sending = [];                      // sending: jo copy abhi raaste mein hai
  const acked = [], failed = [], times = [], inflight = new Set();
  const bReachable = () => !(cfg.down && now() >= DOWN_FROM && now() < DOWN_TO);

  /* ---- A → B ka raasta: 0.2 s lagta hai; B unreachable ho toh TIMEOUT tak ruk ke fail ---- */
  function ship(batch) {
    const sentAt = now(), list = ids(batch.map(c => c.id));
    if (!cfg.sync) { sending = batch.map(c => c.id); say(`📦 copy shuru: A → B   ${list}`); }
    return new Promise((resolve, reject) => {
      if (!bReachable()) {
        at(sentAt + TIMEOUT, WORLD, () => {
          if (!cfg.sync) { sending = []; say(`⚠️ copy fail: B ka jawab nahi aaya (${s2(TIMEOUT)} ruke) — ${list} list mein hi hain, agle tick par phir`); }
          reject(new Error('B se jawab nahi'));
        });
        return;
      }
      at(sentAt + RTT, WORLD, () => {
        if (!aAlive) return reject(new Error('A gaya'));               // mara hua A jawab nahi leta
        batch.forEach(c => B.apply(c));
        if (!cfg.sync) { sending = []; say(`📬 B ne rakh liye: ${list}   (B mein ab ${B.orders.size})`); }
        resolve();
      });
    });
  }
  const A = createReplicator({ ship, mode: cfg.sync ? 'sync' : 'async', everyMs: REPL });
  const B = createReplicator({ ship: async () => {} });                 // B ka DB (copy sirf lene wala)
  const where = () => `A mein: ${A.orders.size} · B mein: ${B.orders.size} · raaste mein: ${A.pending()}`;

  if (!cfg.sync) for (let t = REPL; t <= cfg.run; t += REPL) at(t, COPY, () => { if (aAlive) A.tick(); });
  if (cfg.down) {
    at(DOWN_FROM, WORLD, () => say(`💥 B tak pahunchna band (unreachable) — ${s2(DOWN_TO - DOWN_FROM)} ke liye; A bilkul theek hai`));
    at(DOWN_TO, WORLD, () => say('✅ B wapas'));
  }

  /* ---- orders ---- */
  for (let id = 1, t = 0; t <= cfg.run; id++, t += GAP) at(t, ORDER, async () => {
    if (!aAlive) return;                                               // A ke baad ke orders is tool ka vishay nahi
    const t0 = now(), tag = `#${String(id).padEnd(2)}`;
    if (cfg.sync) { inflight.add(id); say(`${tag} aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)`); }
    try {
      await A.write({ id });                                           // async: turant · sync: B ka jawab aane tak
    } catch (e) {
      inflight.delete(id);
      if (!aAlive) return;
      failed.push(id);
      return say(`${tag} → ✗ FAIL (${s2(now() - t0)} baad): B ka jawab nahi aaya · "ho gaya" NAHI bola   ${where()}`);
    }
    if (!aAlive) return;                                               // A mar chuka: jawab gaya hi nahi
    inflight.delete(id); acked.push(id); times.push(now() - t0);
    maxWaiting = Math.max(maxWaiting, A.pending());
    say(cfg.sync ? `${tag} → "ho gaya" ✓ (${s2(now() - t0)} baad)   ${where()}` : `${tag} aaya → "ho gaya" ✓ turant   ${where()}`);
  });

  /* ---- region A gaya (sirf async / sync mein) ---- */
  if (cfg.dies) at(A_DIES, DIES, () => {
    const missing = acked.filter(id => !B.orders.has(id));
    if (missing.length !== (cfg.sync ? 0 : A.pending())) throw new Error(`model galat: kho gaye ${missing.length} ≠ raaste mein ${A.pending()}`);
    aAlive = false;
    if (cfg.sync) say(`💥 region A gaya — ${ids([...inflight])} B ke jawab ka intezaar kar raha tha: customer ko "ho gaya" nahi mila (fail), A mein bhi nahi tha. Jinko "ho gaya" mila, sab B mein hain`);
    else say(`💥 region A gaya — "ho gaya" mil chuka par B tak nahi pahunche: ${ids(missing)} (copy raaste mein thi: ${ids(sending)} · list mein the: ${ids(missing.filter(id => !sending.includes(id)))})`);
  });

  await go();

  const missing = acked.filter(id => !B.orders.has(id)), lo = Math.min(...times), hi = Math.max(...times);
  const speed = lo === hi ? `har baar ${s2(lo)}` : `${s2(lo)} se ${s2(hi)}`;
  const tail = cfg.dies
    ? `A ${s2(A_DIES)} par gaya → "ho gaya" mila par B mein nahi: ${missing.length ? `${ids(missing)} (${missing.length} order)` : 'koi nahi (0 order)'}${inflight.size ? ` · jawab hi nahi mila: ${ids([...inflight])}` : ''}`
    : `A poora waqt theek raha · sabse badi waiting list: ${maxWaiting} order (A usi pal jaata toh itne order jaate) · fail hue: ${failed.length ? `${failed.length} order (${ids(failed)}) — A ne inhe rakha hi nahi` : '0 order'}`;
  console.log(`   nateeja → "ho gaya" mila: ${acked.length} order · ho gaya kehne mein: ${speed}`);
  console.log(`             ${tail}`);
}

(async () => {
  console.log(`pehle "ho gaya" ya pehle copy? · har ${GAP / 1000} s par ek order · A se B tak ek chakkar ${s2(RTT)} (nakli) · async mein copy har ${REPL / 1000} s`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
