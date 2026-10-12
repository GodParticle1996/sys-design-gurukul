/* ex0 · SLOW MOTION — ex1 wali hi kahani, par A ke paas sirf 4 workers aur requests ek-ek karke, taaki har badlaav dikhe.
   recs-service (B) ka /recs t=0.8 s se t=5.6 s tak LATAK jaata hai (har call 5 s).
   Breaker chhota rakha hai: pichhli 6 calls mein ≥ 50% fail → OPEN 2 s → 2 trial calls.
   Teeno tareekon ke liye EK hi schedule: 16 /home (recs chahiye) + 2 /profile (recs se koi matlab nahi, 5 ms ka kaam).
   node tools/slowmo.js [--protect none|timeout|breaker] */
const { get, post, sleep, host } = require('../lib/util');
const args = require('./args')();
const A = `http://${host('a')}:5171`, B = `http://${host('b')}:5172`;
const PHONE_MS = 2000;                                  // Asha ka phone /profile par itna hi intezaar karta hai
const NAMES = { none: 'koi bachav nahi', timeout: 'sirf timeout (300 ms)', breaker: 'timeout + circuit breaker' };
const PLAN = [
  [0, 'home'], [200, 'home'], [400, 'home'], [600, 'home'],
  [800, 'HANG'],
  [1000, 'home'], [1500, 'home'], [2000, 'home'], [2500, 'home'], [3000, 'home'],
  [3500, 'profile'],
  [4000, 'home'], [4500, 'home'], [5000, 'home'],
  [5600, 'FIX'],
  [6200, 'home'], [7000, 'home'], [7200, 'home'], [7500, 'home'],
  [8000, 'profile'],
];

function showBreaker(r) {
  if (r.state === 'OPEN') return `OPEN (${(r.openForMs / 1000).toFixed(1)} s baaki)`;
  if (r.state === 'HALF_OPEN') return `HALF_OPEN (trial ${r.trialsOk}/${r.trials} safal)`;
  const fails = r.window.filter(x => !x).length;
  return 'CLOSED ' + (r.window.length ? `${r.window.map(x => (x ? '✓' : '✗')).join('')} (${fails}/${r.window.length} fail)` : '(window khaali)');
}

function verdict(kind, r) {
  if (r.gaveUp) return `❌ phone ne ${PHONE_MS} ms baad haar maan li`;
  if (r.status !== 200) return `❌ ${r.status}, ${r.ms} ms`;
  if (kind === 'profile') return `✅ profile mila, ${r.ms} ms`;
  if (r.body.source === 'live') return `✅ live recs, ${r.ms} ms`;
  return `🟡 ${r.body.source} se, ${r.ms} ms` + (r.body.blocked ? ' (breaker ne roki)' : ' (recs ka jawab nahi aaya)');
}

async function run(protect) {
  await post(B + '/reset'); await post(A + '/reset');
  await post(A + '/config', { protect, pool: 4, perEndpoint: true, count4xx: false, halfOpen: 'trials', win: 6, minCalls: 6, openMs: 2000, trials: 2 });
  const jobs = [], profile = [], home = { live: 0, cache: 0, default: 0, error: 0 };
  let homeNo = 0, longest = 0, atHang = 0, atFix = 0;
  console.log(`\n=== ${NAMES[protect]} ===`);
  console.log(' kab     kaun          kya hua                                          us pal ka haal');
  const t0 = Date.now();
  const say = (ms, who, text, state) => console.log(`${(ms / 1000).toFixed(1).padStart(4)} s  ${who.padEnd(13)} ${text.padEnd(48)} ${state || ''}`.trimEnd());

  async function look() {
    const [pool, b, br] = await Promise.all([get(A + '/pool'), get(B + '/stats'), get(A + '/breaker')]);
    return { text: `workers ${pool.busy}/${pool.size} busy · line ${pool.waiting} · B par latki ${b.inflight}`, breaker: showBreaker(br.recs) };
  }
  const haal = s => s.text + (protect === 'breaker' ? ' · breaker ' + s.breaker : '');

  async function fire(kind) {
    const who = kind === 'home' ? `#${++homeNo} /home` : 'Asha /profile';
    const start = Date.now(), sentAt = start - t0;
    let res = null;
    const p = fetch(A + '/' + kind, kind === 'profile' ? { signal: AbortSignal.timeout(PHONE_MS) } : {})
      .then(async r => ({ status: r.status, body: await r.json().catch(() => null) }), () => ({ gaveUp: true }))
      .then(r => { res = Object.assign(r, { ms: Date.now() - start }); });
    await sleep(80);
    const during = await look();                        // us pal ka haal: request andar hai, ya abhi-abhi nikli
    if (res) say(sentAt, who, '→ ' + verdict(kind, res), haal(during));          // turant jawab → ek hi line
    else {
      say(sentAt, who, 'bheji … jawab abhi nahi aaya', haal(during));
      await p; await sleep(15);
      say(sentAt + res.ms, who, '→ ' + verdict(kind, res), haal(await look()));
    }
    if (kind === 'profile') profile.push(res.gaveUp ? `❌ error (${PHONE_MS} ms intezaar ke baad)` : `✅ ${res.ms} ms`);
    else { home[res.status === 200 ? res.body.source : 'error']++; longest = Math.max(longest, res.ms); }
  }

  for (const [ms, what] of PLAN) {
    await sleep(Math.max(0, t0 + ms - Date.now()));
    if (what === 'HANG') { atHang = (await get(B + '/stats')).recsCalls; await post(B + '/config', { recs: 'slow' }); say(ms, 'recs-service', '⚠️  LATAK gayi: ab har /recs call 5 s legi'); }
    else if (what === 'FIX') { await post(B + '/config', { recs: 'ok' }); atFix = (await get(B + '/stats')).recsCalls; say(ms, 'recs-service', '✅ theek ho gayi: nayi /recs calls phir 20 ms'); }
    else jobs.push(fire(what));
  }
  await Promise.all(jobs); await sleep(150);
  const a = await get(A + '/stats'), b = await get(B + '/stats');
  console.log(`   nateeja → Asha ka /profile (5 ms ka kaam): ${profile.join('  phir  ')}`);
  console.log(`             /home: live ${home.live} · cache ${home.cache} · error ${home.error} · sabse lamba intezaar ${longest} ms`);
  console.log(`             latki recs-service ko bheji calls: ${atFix - atHang} · recs-service par ek saath latki (max): ${b.maxInflight}` +
    (protect === 'breaker' ? ` · breaker ne roki: ${a.blocked.recs} · breaker khula: ${a.opens} baar` : ''));
}

(async () => {
  const modes = args.protect ? [args.protect] : ['none', 'timeout', 'breaker'];
  console.log(`A: 4 workers · recs-service (B) t=0.8 s se t=5.6 s tak latki (har /recs call 5 s) · breaker: pichhli 6 calls, ≥ 50% fail → OPEN 2 s → 2 trial calls`);
  for (let i = 0; i < modes.length; i++) {
    await run(modes[i]);
    if (i < modes.length - 1) await sleep(5200);                  // agle tareeke se pehle B par latki purani calls khatam hone do
  }
  process.exit(0);
})();
