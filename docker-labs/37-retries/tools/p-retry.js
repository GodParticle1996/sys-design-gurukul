/* Wahi kahani (Asha ka order, payment-service 1.0 s par crash, 2.4 s par wapas) — par retry haath ka nahi,
   npm ki library "p-retry" ka. Do baar chalta hai: (1) hamari settings ke saath, (2) library ke DEFAULT ke saath.
   Pehle (ek baar, isi folder mein):  npm install p-retry        (p-retry 8 ko Node 22+ chahiye)
   Phir:                              node tools/p-retry.js      (payment-service chalni chahiye: npm start ex0-slowmo) */
const { post, sleep, host } = require('../lib/util');
const { worthRetrying } = require('../lib/retry');
const seeded = require('./seeded');
const SVC = `http://${host('fragile')}:5165`;

async function placeOrder() {                             // wahi function jo mini.js mein hai
  let res = null;
  try { res = await fetch(SVC + '/work', { method: 'POST', signal: AbortSignal.timeout(2000) }); } catch (e) {}
  const after = res && res.headers.get('retry-after');
  return { ok: !!res && res.ok, status: res ? res.status : 0, retryAfter: after ? +after : null };
}

/* p-retry ko "fail" ka matlab hai: function ne error PHENKA. Isliye { ok: false } ko error mein badalna padta hai. */
function orderOrThrow(AbortError) {
  return async () => {
    const r = await placeOrder();
    if (r.ok) return r;
    const err = Object.assign(new Error('HTTP ' + r.status), { status: r.status });
    if (!worthRetrying(r)) throw new AbortError(err);     // AbortError = "is error par dobara mat bhejo" (jaise 400, 404)
    throw err;
  };
}

const OURS = {
  retries: 4,                // 4 RETRIES = kul 5 koshish (hamare lib/retry.js mein `attempts: 5`)
  minTimeout: 300,           // pehla intezaar (hamara `base`)
  maxTimeout: 2400,          // intezaar ki hadd (hamara `cap`)
  factor: 2,                 // har baar dugna
  randomize: true,           // intezaar × (1 se 2 ke beech random) — 0 se shuru NAHI hota
};
const DEFAULTS = {};         // kuch nahi diya = library ke default: retries 10 · minTimeout 1000 · factor 2 · maxTimeout Infinity · randomize false

/* ---- neeche sirf kahani aur chhapai hai ---- */
let t0 = 0;
const say = text => console.log(`${((Date.now() - t0) / 1000).toFixed(2).padStart(6)} s  ${text}`);

async function story(pRetry, AbortError, title, options) {
  console.log('\n=== ' + title + ' ===');
  await post(SVC + '/reset'); t0 = Date.now();
  await post(SVC + '/config', { shed: false, crashAt: 5, work: 300, warmWork: 300, downMs: 1400, warmMs: 0 });
  setTimeout(() => post(SVC + '/crash').then(() => say('💥 payment-service CRASH · 1.4 s band')), 1000);
  setTimeout(() => say('🟢 payment-service wapas aayi'), 2400);
  await sleep(1300);
  say('Asha ne "Order place" dabaya');
  try {
    await pRetry(orderOrThrow(AbortError), Object.assign({}, options, {
      onFailedAttempt: ({ attemptNumber, retryDelay, retriesLeft }) => say(`koshish ${attemptNumber} fail → ${retryDelay} ms ruk ke phir · bachi retries: ${retriesLeft}`),
    }));
    say('✅ order lag gaya');
  } catch (e) { say('❌ haar maan li: ' + e.message); }
  await sleep(300);
}

(async () => {
  let pRetry, AbortError;
  try { ({ default: pRetry, AbortError } = await import(require('url').pathToFileURL(require.resolve('p-retry')).href)); }
  catch (e) { console.log('p-retry nahi mila. Isi folder mein chalao:  npm install p-retry   (Node 22+)'); process.exit(1); }
  Math.random = seeded(10);  // sirf is demo ke liye: p-retry andar Math.random use karta hai; beej tay kar diya taaki har run mein wahi dikhe
  await story(pRetry, AbortError, '(1) hamari settings: retries 4 · minTimeout 300 · maxTimeout 2400 · randomize true', OURS);
  await story(pRetry, AbortError, '(2) library ke DEFAULT: retries 10 · minTimeout 1000 · maxTimeout Infinity · randomize false', DEFAULTS);
  process.exit(0);
})();
