/* ex0 · SLOW MOTION 3 — deploy: purana pod band ho raha hai, par load balancer ko khabar der se pahunchti hai.
   2 pods: pod-old (hataya ja raha hai) aur pod-new. Load balancer baari-baari bhejta hai; har 0.25 s par ek /home request.
   1.00 s par pod-old ko SIGTERM milta hai. Load balancer ko "pod-old ab nahi hai" ki khabar 1 s baad (2.00 s par) pahunchti hai.
   SIGTERM par app kya karta hai:
     turant   usi pal band
     chhota   0.5 s tak jawab deta hai, phir band     (khabar pahunchne se pehle band)
     poora    2 s tak jawab deta hai, phir band        (khabar pahunchne ke baad band)
   Ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo-stop.js [--mode turant|chhota|poora] [--fast] */
const { sleep } = require('../lib/util');
const args = require('./args')();

const TERM = 1000, LAG = 1000, GAP = 250, FIRST = 100, RUN = 3400;
const SETUPS = {
  turant: { name: 'SIGTERM par turant band', serve: 0 },
  chhota: { name: 'SIGTERM ke baad 0.5 s tak jawab, phir band', serve: 500 },
  poora:  { name: 'SIGTERM ke baad 2 s tak jawab, phir band', serve: 2000 },
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';

async function run(mode) {
  const cfg = SETUPS[mode];
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });   // order: 0 = pod / load balancer badla, 1 = request
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  let oldUp = true, lbHasOld = true, rr = 0, sent = 0, failed = 0;
  at(TERM, 0, () => {
    say(`🛑 pod-old ko SIGTERM${cfg.serve ? ` — app ${cfg.serve / 1000} s tak jawab deta rahega` : ' — app usi pal band'}`);
    if (!cfg.serve) oldUp = false;
    else at(TERM + cfg.serve, 0, () => { oldUp = false; say('🚪 pod-old band (port band)'); });
  });
  at(TERM + LAG, 0, () => { lbHasOld = false; say('📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new'); });
  for (let t = FIRST, k = 1; t <= RUN; t += GAP, k++) at(t, 1, () => {
    const pods = lbHasOld ? ['pod-old', 'pod-new'] : ['pod-new'];
    const pod = pods[rr++ % pods.length], ok = pod === 'pod-new' || oldUp;
    sent++; if (!ok) failed++;
    say(`#${String(k).padEnd(2)} → ${pod} ${ok ? '✓' : '✗ (port band: connection refused)'}`);
  });

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) break;
    if (!args.fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${cfg.name} ===`);
  lines.forEach(l => console.log(l));
  console.log(`   nateeja → ${sent} requests · ${failed} fail`);
}

(async () => {
  console.log(`2 pods · har ${GAP / 1000} s par ek request, baari-baari · ${s2(TERM)} par pod-old ko SIGTERM · load balancer ko khabar ${LAG / 1000} s der se (${s2(TERM + LAG)} par)`);
  const plan = args.mode ? [args.mode] : Object.keys(SETUPS);
  for (const m of plan) {
    if (!SETUPS[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}   (aur --fast)`); process.exit(1); }
    await run(m);
  }
  process.exit(0);
})();
