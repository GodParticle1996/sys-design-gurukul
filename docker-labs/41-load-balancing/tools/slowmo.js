/* ex0 · SLOW MOTION — "yeh request kis server par jaaye?", chhote paimaane par, taaki har faisla dikhe.
   KhanaKart ka load balancer (LB) aur menu-service ke 3 servers: S1, S2, S3. Har server ek waqt mein ek request karta hai
   (600 ms); baaki us server ki line mein. Requests har 250 ms par aati hain (kul 24, 6 second).
   Shuru mein S1 par 2 kaam hain, S2 par 1, S3 khaali.
   Tareeke (lib/pick.js) — aur har tareeke ke saath: LB ko load ki jaankari kahan se milti hai:
     stale     sabse kam load wala · jaankari servers har 1 s par bhejte hain (beech mein purani)
     rr        baari-baari · koi jaankari nahi
     random    koi bhi ek · koi jaankari nahi
     two       do mein se behtar · wahi purani jaankari
     live      sabse kam load wala · LB ki apni taaza ginti (kitni requests bheji, kitni lauti)
     two-live  do mein se behtar · LB ki apni taaza ginti
   --slow      S3 teen guna dheema (1800 ms har request)
   Random ka beej tay hai aur ghadi tay hai, isliye har run mein wahi output.
   node tools/slowmo.js [--mode stale|rr|random|two|live|two-live] [--slow] */
const { roundRobin, anyOne, leastLoaded, bestOfTwo } = require('../lib/pick');
const seeded = require('./seeded');
const { sleep } = require('../lib/util');
const args = require('./args')();

const N = 3, WORK = 600, GAP = 250, REQUESTS = 24, REPORT_EVERY = 1000, RUN = 8000, SEED = 7;
const NAMES = {
  stale: 'sabse kam load wala · jaankari har 1 s par aati hai (beech mein purani)',
  rr: 'baari-baari (round robin) · koi jaankari nahi',
  random: 'koi bhi ek (random) · koi jaankari nahi',
  two: 'do mein se behtar · wahi purani jaankari (har 1 s)',
  live: 'sabse kam load wala · LB ki apni taaza ginti',
  'two-live': 'do mein se behtar · LB ki apni taaza ginti',
};
const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const S = i => 'S' + (i + 1);
const show = a => a.map((x, i) => `${S(i)} ${x}`).join(' · ');

async function run(mode, slow) {
  /* ---- tay ghadi ---- */
  const t0 = Date.now(), events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });       // order: ek hi pal par pehle kya (0 = server ka kaam poora, 1 = jaankari, 2 = nayi request)
  const lines = [];
  const say = text => lines.push(`   ${s2(clock).padStart(7)}  ${text}`);

  /* ---- teen servers ---- */
  const work = [WORK, WORK, slow ? WORK * 3 : WORK];
  const queue = [[], [], []], busy = [null, null, null];                        // har server: line + abhi chalta kaam
  const load = () => queue.map((q, i) => q.length + (busy[i] ? 1 : 0));         // asal mein kitna kaam
  const got = [0, 0, 0], times = [];
  let maxLine = 0, unfinished = 0;
  function startNext(i) {
    if (busy[i] || !queue[i].length) return;
    busy[i] = queue[i].shift();
    at(clock + work[i], 0, () => { const j = busy[i]; busy[i] = null; if (j.id) times.push({ id: j.id, ms: clock - j.at, server: i }); startNext(i); });
  }
  function give(i, job) { queue[i].push(job); startNext(i); maxLine = Math.max(maxLine, queue[i].length); }

  /* ---- load balancer ---- */
  const random = seeded(SEED), state = { next: 0 };
  let reported = [0, 0, 0];                                                     // servers ki bheji hui (purani) jaankari
  const usesReports = mode === 'stale' || mode === 'two';
  function choose() {
    if (mode === 'rr') return { i: roundRobin(state, N), why: 'baari' };
    if (mode === 'random') return { i: anyOne(N, random), why: 'sikka' };
    const view = usesReports ? reported.slice() : load();
    const seen = `LB ko dikha: ${show(view)}`;
    if (mode === 'stale' || mode === 'live') return { i: leastLoaded(view, random), why: seen };
    /* do mein se behtar: dikhane ke liye wahi do sikke yahan bhi nikaalte hain jo bestOfTwo nikaalta hai */
    const calls = [], spy = () => { const x = random(); calls.push(x); return x; };
    const i = bestOfTwo(view, spy);
    const a = Math.floor(calls[0] * N), b = Math.floor(calls[calls.length - 1] * N);
    return { i, why: `do sikke: ${S(a)}, ${S(b)} · ${seen}` };
  }

  /* shuruaat: S1 par 2 kaam, S2 par 1 */
  give(0, { at: 0 }); give(0, { at: 0 }); give(1, { at: 0 });
  for (let r = 0; r * REPORT_EVERY < RUN; r++) if (usesReports) at(r * REPORT_EVERY, 1, () => { reported = load(); say(`📋 servers ne apna haal bheja: ${show(reported)}`); });
  for (let k = 0; k < REQUESTS; k++) at(k * GAP, 2, () => {
    const c = choose(); got[c.i]++;
    give(c.i, { id: k + 1, at: clock });
    say(`#${String(k + 1).padEnd(2)} → ${S(c.i)}   (${c.why})   asal mein ab: ${show(load())}`);
  });

  while (events.length) {
    events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
    const e = events.shift();
    if (e.t > RUN) { unfinished = REQUESTS - times.length; break; }
    await sleep(Math.max(0, t0 + e.t - Date.now()));
    clock = e.t; e.fn();
  }

  console.log(`\n=== ${NAMES[mode]}${slow ? ' · S3 teen guna dheema' : ''} ===`);
  lines.forEach(l => console.log(l));
  const ms = times.map(x => x.ms), avg = ms.reduce((a, b) => a + b, 0) / (ms.length || 1);
  const worst = times.slice().sort((a, b) => b.ms - a.ms)[0];
  console.log(`   nateeja → requests: ${show(got)} · ek request ka ausat samay ${s2(avg)} · sabse lamba ${s2(worst.ms)} (#${worst.id}, ${S(worst.server)}) · sabse lambi line ${maxLine}` +
    (unfinished ? ` · ${s2(RUN)} par adhoori requests: ${unfinished}` : ''));
}

(async () => {
  console.log('3 servers, har ek ek waqt mein 1 request (600 ms) · requests har 250 ms par (kul 24) · shuru mein S1 par 2 kaam, S2 par 1, S3 khaali');
  const plan = args.mode ? [[args.mode, !!args.slow]] : [['stale', false], ['rr', false], ['random', false], ['two', false], ['live', false], ['rr', true], ['live', true], ['two-live', true]];
  for (const [m, slow] of plan) {
    if (!NAMES[m]) { console.log(`\n--mode ${m}? Yeh chalte hain: ${Object.keys(NAMES).join(' | ')}   (aur --slow)`); process.exit(1); }
    await run(m, slow);
  }
  process.exit(0);
})();
