/* Sabse chhota chalta program: lib/breaker.js + ek fetch. Service A nahi — yeh file khud recs-service (B) ko call karti hai.
   Wahi 16 calls jo slowmo.js mein hain: recs-service t=0.8 s se t=5.6 s tak latki.            node tools/mini.js */
const { Breaker } = require('../lib/breaker');
const { post, sleep, host } = require('../lib/util');
const B = `http://${host('b')}:5172`;

const breaker = new Breaker({ windowSize: 6, minCalls: 6, failRate: 0.5, openMs: 2000, trials: 2 });
let lastGood = ['popular-1', 'popular-2'];              // fallback: pichhla accha jawab

async function getRecs() {
  if (!breaker.allow()) return { recs: lastGood, from: 'cache · breaker ne roki' };            // recs-service ko chhua bhi nahi
  let res = null;
  try { res = await fetch(B + '/recs', { signal: AbortSignal.timeout(300) }); } catch (e) {}   // timeout / connection toota → res = null
  const sick = !res || res.status >= 500;               // bimaari = jawab nahi aaya, ya 5xx. 4xx bimaari NAHI (galti client ki)
  breaker.record(!sick);
  if (res && res.ok) { lastGood = (await res.json()).recs; return { recs: lastGood, from: 'live' }; }
  return { recs: lastGood, from: 'cache · recs ka jawab nahi' };
}

/* ---- neeche sirf schedule aur chhapai hai ---- */
const PLAN = [0, 200, 400, 600, 'HANG 800', 1000, 1500, 2000, 2500, 3000, 4000, 4500, 5000, 'FIX 5600', 6200, 7000, 7200, 7500];
const marks = w => w.map(ok => (ok ? '✓' : '✗')).join('');
const fails = w => w.filter(ok => !ok).length;

function inside(before, r) {                             // is call ke BAAD breaker ke andar kya hai
  const b = breaker, left = ((b.openUntil - Date.now()) / 1000).toFixed(1);
  if (b.state === 'OPEN') {
    if (r.from.includes('roki')) return `OPEN · ${left} s baaki`;
    if (before.state !== 'CLOSED') return `OPEN ← trial call fail · phir ${left} s calls band`;
    const w = before.window.concat(false).slice(-b.windowSize);
    return `OPEN ← ${marks(w)} = ${fails(w)}/${w.length} fail (hadd 50%) · ${left} s calls band`;
  }
  if (b.state === 'HALF_OPEN') return `HALF_OPEN · trial ${b.trialsOk}/${b.trials} safal`;
  if (before.state !== 'CLOSED') return `CLOSED ← ${b.trials}/${b.trials} trial safal · window khaali`;
  return `CLOSED · ${marks(b.window)} = ${fails(b.window)}/${b.window.length} fail` + (b.window.length < b.minCalls ? ` (${b.minCalls} calls se pehle faisla nahi)` : '');
}

(async () => {
  await post(B + '/reset');
  console.log('breaker: pichhli 6 calls · kam se kam 6 calls · ≥ 50% fail → OPEN 2 s → 2 trial calls\n');
  console.log('  #   kab     nateeja                         der      breaker ke andar (is call ke baad)');
  const t0 = Date.now();
  let n = 0;
  for (const step of PLAN) {
    const ms = typeof step === 'number' ? step : +step.split(' ')[1];
    await sleep(Math.max(0, t0 + ms - Date.now()));
    const kab = (ms / 1000).toFixed(1).padStart(4) + ' s';
    if (typeof step !== 'number') {
      const hang = step.startsWith('HANG');
      await post(B + '/config', { recs: hang ? 'slow' : 'ok' });
      console.log(`      ${kab}  ${hang ? '⚠️  recs-service LATAK gayi (har /recs call 5 s)' : '✅ recs-service theek ho gayi'}`);
      continue;
    }
    const before = { state: breaker.state, window: breaker.window.slice() }, start = Date.now();
    const r = await getRecs();
    console.log(`${String(++n).padStart(3)}  ${kab}  ${((r.from === 'live' ? '✅ ' : '🟡 ') + r.from).padEnd(30)} ${String(Date.now() - start).padStart(4)} ms   ${inside(before, r)}`);
  }
  process.exit(0);
})();
