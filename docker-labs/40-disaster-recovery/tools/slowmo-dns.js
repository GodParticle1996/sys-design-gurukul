/* ex0 · SLOW MOTION 3 — failover ho gaya, par grahak purane pate par.
   ⚠️ Yeh ek MODEL hai — asli DNS resolver nahi. Sirf ek baat dikhane ke liye: jab koi grahak "khanakart.in kahan hai?"
   ka jawab TTL seconds tak YAAD rakhta hai, toh pata badalne ke baad bhi woh purane pate par jaata rehta hai.
   Teen grahak (grahak-1, 2, 3). Har 0.5 s par teeno ek-ek order bhejte hain, apne yaad kiye hue pate par (A ya B).
   Region A 4.00 s par gaya. Router har 0.5 s par A ko poochhta hai (lib/failover.js: lagataar 3 "nahi" → failover);
   failover par DNS ka pata B par badal jaata hai. B pehle se poora tayyar hai (taaki sirf pate ka asar dikhe).
   Teeno ne pichhli baar alag-alag waqt par poochha tha — yaad ka waqt khatam hone par hi dobara poochhte hain:
   3.00 s par grahak-1 ke yaad ka 1/3 TTL bacha hai, grahak-2 ka 2/3, grahak-3 ka poora TTL.
     lamba    TTL 6 s    (asli duniya mein TTL aksar isse kaafi lamba hota hai; yahan samay chhota kiya hai)
     chhota   TTL 1 s
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-dns.js [--mode lamba|chhota] [--fast] */
const { createDetector } = require('../lib/failover');
const { createSim, s2 } = require('./sim');
const args = require('./args')();

const GAP = 500, START = 3000, A_DIES = 4000, CHECK = 500, FAILS = 3;
const LEFT = [1 / 3, 2 / 3, 1];                                        // 3.00 s par TTL ka kitna hissa yaad mein bacha hai
const WORLD = 0, ASK = 1, ORDER = 2, DIES = 3;                         // ek hi pal par kaun pehle
const SETUPS = {
  lamba:  { name: 'lamba TTL — grahak pata 6 s tak yaad rakhte hain', ttl: 6000, run: 12000 },
  chhota: { name: 'chhota TTL — grahak pata 1 s tak yaad rakhte hain', ttl: 1000, run: 8000 },
};

async function run(mode) {
  const cfg = SETUPS[mode];
  const { at, say, go, now } = createSim({ fast: args.fast, run: cfg.run });
  console.log(`\n=== ${cfg.name} (MODEL) ===`);

  let aAlive = true, record = 'A', flipAt = null;
  const detector = createDetector({ threshold: FAILS });
  const clients = LEFT.map((f, i) => ({ name: `grahak-${i + 1}`, addr: 'A', exp: START + cfg.ttl * f, log: [] }));

  at(START, WORLD, () => say(`yaad kiya hua pata: ${clients.map(c => `${c.name} → A (${s2(c.exp)} tak)`).join(' · ')}`));

  /* ---- router: A ko poochho, 3 "nahi" par DNS ka pata B par ---- */
  for (let t = CHECK; t <= cfg.run; t += CHECK) at(t, ASK, () => {
    if (record === 'B') return;
    const fired = detector.result(aAlive);
    if (!aAlive) say(`🩺 A ✗ (lagataar fail ${detector.fails()}/${FAILS})${fired ? ' → FAILOVER: DNS ka pata ab B' : ''}`);
    if (fired) { record = 'B'; flipAt = now(); }
  });

  /* ---- har 0.5 s par teeno grahak ---- */
  for (let t = START; t <= cfg.run; t += GAP) at(t, ORDER, () => {
    const parts = clients.map(c => {
      if (now() >= c.exp) {                                            // yaad ka waqt khatam: DNS se dobara poochho
        const stale = record === 'A' && !aAlive, switched = c.addr === 'A' && record === 'B';
        c.addr = record; c.exp = now() + cfg.ttl;
        if (stale || switched) {                                       // baaki dobara-poochhna chup-chaap hota hai
          say(`🔎 ${c.name} ne DNS se dobara poochha → ${record}${stale ? ' (pata abhi badla nahi; A band hai)' : ' (naya pata mila)'} · ab ${s2(c.exp)} tak yaad`);
        }
      }
      const ok = c.addr === 'B' || aAlive;
      c.log.push({ t: now(), ok });
      return `${c.name} → ${c.addr} ${ok ? '✓' : '✗'}`;
    });
    say(parts.join('   '));
  });

  /* ---- region A gaya ---- */
  at(A_DIES, DIES, () => { aAlive = false; say('💥 region A gaya'); });

  await go();

  console.log(`   nateeja → DNS ka pata ${s2(flipAt)} par B ho gaya (A ke ${s2(flipAt - A_DIES)} baad) · B pehle se tayyar tha`);
  let total = 0, worst = null;
  clients.forEach(c => {
    const bad = c.log.filter(x => !x.ok), last = bad[bad.length - 1].t;
    const back = c.log.find(x => x.t > last && x.ok).t;
    total += bad.length;
    if (!worst || back > worst.back) worst = { name: c.name, back };
    console.log(`             ${c.name}: ${bad.length} order fail (${s2(bad[0].t)} se ${s2(last)} tak) · phir safal ${s2(back)} se — DNS badalne ke ${s2(back - flipAt)} baad`);
  });
  console.log(`             kul ${total} order fail · sabse der se laga: ${worst.name} (DNS badalne ke ${s2(worst.back - flipAt)} baad)`);
}

(async () => {
  console.log(`failover ho gaya, par grahak purane pate par · MODEL, asli DNS nahi · 3 grahak, har ${GAP / 1000} s par ek-ek order · A ${s2(A_DIES)} par gaya`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
