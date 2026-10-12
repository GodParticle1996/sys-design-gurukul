/* ex2 · Har chot alag kami dikhati hai: instance 2 par ek fault, 100 req/s, asli services par.
   Fault 3 s se 7 s tak (4 s); kul run 10 s. Teen fault × teen setup (9 row):
     fault   crash   instance ke connection turant toot-te hain
             slow    /work 2 s leta hai (load balancer ka timeout 0.5 s); /health tez
             zombie  /health 200 deta hai, /work 500
     setup   hc      sirf health check (har 300 ms, 2 baar fail → bahar)
             retry   health check + retry (fail request ek baar agle instance par)
             eject   health check + retry + passive ejection (2 request lagataar fail → 2 s ke liye bahar)
   Table ke saare number fault ke 4 s ke dauraan SHURU hui requests ke hain (poore run ke nahi).
     median / p99    ek request ko kitna waqt laga (safal ho ya fail)
     dheemi          kitni requests 200 ms se zyada ki
     kharab tak      fault ke dauraan kitni /work requests kharab instance tak pahunchi (instance ki apni ginti)
   node tools/faults.js [--fault crash|slow|zombie] [--setup hc|retry|eject] */
const { get, post, sleep, host, pct } = require('../lib/util');
const args = require('./args')();
const LB = `http://${host('lb')}:5211`;
const APPS = [5212, 5213, 5214].map((p, i) => `http://${host('app' + (i + 1))}:${p}`);
const RATE = 100, SECS = 10, FAULT_AT = 3000, FAULT_MS = 4000, SLOW_MS = 200, EJECT_N = 2;
const FAULTS = { crash: 'kill', slow: 'slow', zombie: 'zombie' };            // naam → /fault ka type
const SETUPS = {
  hc:    ['health check hi', { instances: 3, health: true, retry: false, eject: 0 }],
  retry: ['health check + retry', { instances: 3, health: true, retry: true, eject: 0 }],
  eject: ['health check + retry + passive ejection', { instances: 3, health: true, retry: true, eject: EJECT_N }],
};

/* ek request, aur usne kitna waqt liya */
async function one() {
  const t = performance.now();
  try { const r = await fetch(LB + '/work'); await r.arrayBuffer(); return { ok: r.ok, ms: performance.now() - t }; }
  catch (e) { return { ok: false, ms: performance.now() - t }; }
}

async function run(fault, cfg) {
  for (const a of APPS) await post(a + '/reset');
  await post(LB + '/config', cfg);
  await sleep(400);
  const t0 = Date.now(), jobs = [];
  let injectedAt = null;
  setTimeout(() => post(APPS[1] + '/fault', { type: FAULTS[fault], ms: FAULT_MS }).then(() => { injectedAt = Date.now() - t0; }), FAULT_AT);
  for (let i = 0; Date.now() - t0 < SECS * 1000; i++) {
    const at = Date.now() - t0;
    jobs.push(one().then(r => ({ at, ok: r.ok, ms: r.ms })));
    await sleep(Math.max(0, t0 + (i + 1) * (1000 / RATE) - Date.now()));
  }
  const all = await Promise.all(jobs);
  const win = all.filter(r => r.at >= injectedAt && r.at < injectedAt + FAULT_MS);   // fault ke 4 s mein shuru hui
  const ms = win.map(r => r.ms), ok = win.filter(r => r.ok).length;
  const hits = (await get(APPS[1] + '/stats')).faultHits;
  return { n: win.length, ok, failed: win.length - ok, median: pct(ms, 50), p99: pct(ms, 99), slow: ms.filter(x => x > SLOW_MS).length, hits };
}

(async () => {
  const faults = args.fault ? [args.fault] : Object.keys(FAULTS);
  const setups = args.setup ? [args.setup] : Object.keys(SETUPS);
  for (const f of faults) if (!FAULTS[f]) { console.log(`--fault ${f}? Yeh chalte hain: ${Object.keys(FAULTS).join(' | ')}`); process.exit(1); }
  for (const s of setups) if (!SETUPS[s]) { console.log(`--setup ${s}? Yeh chalte hain: ${Object.keys(SETUPS).join(' | ')}`); process.exit(1); }
  console.log(`💥 instance 2 par fault ${FAULT_AT / 1000} s se ${(FAULT_AT + FAULT_MS) / 1000} s tak · ${RATE} req/s · ${SECS} s · number fault ke ${FAULT_MS / 1000} s mein shuru hui requests ke\n`);
  console.log('fault   setup                                     safal      fail   median      p99   dheemi   kharab tak');
  for (const f of faults) {
    for (const s of setups) {
      const [name, cfg] = SETUPS[s];
      const r = await run(f, cfg);
      console.log(`${f.padEnd(7)} ${name.padEnd(40)} ${(100 * r.ok / r.n).toFixed(2).padStart(6)}%  ${String(r.failed).padStart(6)}  ${String(r.median + ' ms').padStart(7)}  ${String(r.p99 + ' ms').padStart(7)}  ${String(r.slow).padStart(7)}   ${String(r.hits).padStart(9)}`);
      await sleep(700);
    }
  }
})();
