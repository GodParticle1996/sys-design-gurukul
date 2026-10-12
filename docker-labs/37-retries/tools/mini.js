/* Sabse chhota chalta program: lib/retry.js + ek fetch. Sirf ek phone (Asha), wahi kahani jo slowmo.js mein hai:
   payment-service 1.0 s par crash hoti hai, 2.4 s par wapas aati hai. Asha 1.3 s par "Order place" dabati hai.
   node tools/mini.js */
const { retry } = require('../lib/retry');
const { post, sleep, host } = require('../lib/util');
const seeded = require('./seeded');
const SVC = `http://${host('fragile')}:5165`;

async function placeOrder() {
  let res = null;
  try { res = await fetch(SVC + '/work', { method: 'POST', signal: AbortSignal.timeout(2000) }); } catch (e) {}   // jawab hi nahi aaya → res = null
  const after = res && res.headers.get('retry-after');             // server ne bataya ho ki kab aana hai
  return { ok: !!res && res.ok, status: res ? res.status : 0, retryAfter: after ? +after : null };
}

const order = () => retry(placeOrder, {
  attempts: 5,           // kul 5 koshish, phir user ko error
  base: 300,             // pehla intezaar 0–300 ms ke beech
  cap: 2400,             // intezaar ki hadd 2400 ms se upar nahi jaati
  wait: 'full',          // har baar dugni hadd ke andar random (full jitter)
  random: seeded(10),    // sirf is demo ke liye: tay-beej wala random, taaki har run mein wahi dikhe
  onWait: (n, ms) => say(`koshish ${n + 1} fail → random(0–${Math.min(2400, 300 * 2 ** n)}) = ${Math.round(ms)} ms ruk ke phir`),
});

/* ---- neeche sirf kahani aur chhapai hai ---- */
let t0 = 0;
const say = text => console.log(`${((Date.now() - t0) / 1000).toFixed(2).padStart(6)} s  ${text}`);

(async () => {
  await post(SVC + '/reset'); t0 = Date.now();
  await post(SVC + '/config', { shed: false, crashAt: 5, work: 300, warmWork: 300, downMs: 1400, warmMs: 0 });
  console.log('retry: 5 koshish · intezaar random(0 … 300 × 2ⁿ ms), hadd 2400 ms\n');
  setTimeout(() => post(SVC + '/crash').then(() => say('💥 payment-service CRASH · 1.4 s band')), 1000);
  setTimeout(() => say('🟢 payment-service wapas aayi'), 2400);
  await sleep(1300);
  say('Asha ne "Order place" dabaya');
  const r = await order();
  say(r.ok ? '✅ order lag gaya' : `❌ haar maan li (status ${r.status})`);
  process.exit(0);
})();
