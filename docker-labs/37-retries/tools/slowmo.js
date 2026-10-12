/* ex0 · SLOW MOTION — retry storm, chhote paimaane par, taaki har koshish dikhe.
   payment-service (services/fragile.js) yahan ek saath 5 orders sambhal sakti hai (har order 300 ms); 6vi ek saath aayi → CRASH.
   t = 1.0 s par ek kharab deploy se CRASH: 1.4 s band (2.4 s par wapas). 6 phones 1.3–1.4 s par "Order place" dabate hain.
   Chaar tareeke — wahi 6 phones, wahi service — sirf "fail hone par kya karein" badalta hai:
     turant      har 300 ms par dobara, koi limit nahi                (slow motion ka "turant")
     backoff     har baar dugna ruko: 300, 600, 1200, 2400 ms · 5 koshish
     jitter      usi dugni hadd ke andar RANDOM ruko · 5 koshish     (random ka beej tay hai, taaki har run mein wahi dikhe)
     retryafter  phone "turant" wale hi, par service bhari ho toh crash ke bajaye "503 + Retry-After: 1" bolti hai
   Retry ka code: lib/retry.js.        node tools/slowmo.js [--mode turant|backoff|jitter|retryafter] */
const { retry } = require('../lib/retry');
const seeded = require('./seeded');                              // har phone ka apna tay-beej wala random
const { post, postRaw, get, sleep, host } = require('../lib/util');
const args = require('./args')();
const SVC = `http://${host('fragile')}:5165`;

const PHONES = ['Asha', 'Bilal', 'Chitra', 'Dev', 'Esha', 'Farhan'];
const TAP_AT = [1300, 1320, 1340, 1360, 1380, 1400];             // har phone ne "Order place" kab dabaya (ms)
const SMALL = { crashAt: 5, work: 300, warmWork: 300, downMs: 1400, warmMs: 0 };
const DEPLOY_AT = 1000, RUN_MS = 8000, SEED = 10;
const MODES = {
  turant:     { name: 'turant retry — har 300 ms, koi limit nahi',                         opts: { attempts: Infinity, base: 300, wait: 'fixed' },             shed: false },
  backoff:    { name: 'har baar dugna ruko — 300, 600, 1200, 2400 ms · 5 koshish',         opts: { attempts: 5, base: 300, cap: 2400, wait: 'backoff' },       shed: false },
  jitter:     { name: 'dugni hadd ke andar RANDOM ruko (jitter) · 5 koshish',              opts: { attempts: 5, base: 300, cap: 2400, wait: 'full' },          shed: false },
  retryafter: { name: 'turant retry, par service "503 + Retry-After: 1" bolti hai',        opts: { attempts: Infinity, base: 300, wait: 'fixed' },             shed: true },
};

const snap = ms => Math.round(ms / 20) * 20;
const sec = ms => (ms / 1000).toFixed(2) + ' s';
const at = ms => sec(ms).padStart(13);                           // samay ka khaana hamesha 13 akshar ka
const range = (a, b) => (b - a < 15 ? at(a) : `${(a / 1000).toFixed(2)}–${(b / 1000).toFixed(2)} s`.padStart(13));

async function run(mode) {
  const M = MODES[mode];
  await post(SVC + '/reset');
  const t0 = Date.now(), log = [];                                  // service ki ghadi bhi /reset par shuru hoti hai
  const until = ms => sleep(Math.max(0, t0 + ms - Date.now()));
  await post(SVC + '/config', Object.assign({ shed: M.shed }, SMALL));
  until(DEPLOY_AT - 3).then(() => post(SVC + '/crash')).catch(() => {});

  /* ek aur user ka order, crash se pehle — aam din kaisa dikhta hai */
  const normal = (async () => { await until(200); const s = Date.now(); const r = await postRaw(SVC + '/work', {}); return { ok: r.ok, ms: Date.now() - s }; })();

  async function phone(i) {
    let planned = TAP_AT[i];                                        // is koshish ka tay kiya hua waqt
    const result = await retry(async n => {
      if (planned >= RUN_MS) return { ok: false, status: -1 };      // run khatam (status -1 = dobara mat bhejo)
      await until(planned);
      const sent = Date.now();
      const r = await postRaw(SVC + '/work', {});
      const rec = { who: i, n, planned, ms: Date.now() - sent, endedAt: Date.now() - t0, ok: r.ok, status: r.status, retryAfter: r.retryAfter || 0, wait: null };
      log.push(rec);
      return Object.assign({ rec }, r, { retryAfter: r.retryAfter || null });
    }, Object.assign({}, M.opts, {
      random: seeded(SEED + i * 101),
      onWait: (n, ms, r) => { r.rec.wait = Math.round(ms); },
      /* agli koshish ka waqt = jis pal yeh koshish fail hui + intezaar. (Fail ka pal 20 ms ki jaali par gol kiya jaata hai,
         taaki milliseconds ka farq jud-jud ke badhe nahi; jitter mein koshish ka apna tay waqt hi liya jaata hai.) */
      sleep: async ms => { const last = log.filter(x => x.who === i).pop(); planned = (mode === 'jitter' ? last.planned : snap(last.endedAt)) + Math.round(ms); },
    }));
    return result.ok;
  }
  const placed = await Promise.all(PHONES.map((_, i) => phone(i)));
  const first = await normal;
  await until(RUN_MS);
  const s = await get(SVC + '/stats');
  const crashes = s.crashesAtMs.map((c, k) => (k === 0 ? DEPLOY_AT : Math.floor((c - 2) / 20) * 20)), ups = crashes.map(c => c + SMALL.downMs);   // crash ka pal = jis koshish ne giraya uska tay waqt

  /* ---------- poori kahani, samay ke kram mein ---------- */
  const lines = [];
  const say = (t, text) => lines.push({ t, text });
  say(200, `${at(200)}  ek aur user ka order                     → ${first.ok ? '✅' : '❌'} ${first.ms} ms  (aam din)`);
  crashes.forEach((c, k) => {
    if (k === 0) say(c, `${at(c)}  💥 kharab deploy: payment-service CRASH #1 · ${SMALL.downMs / 1000} s band (${sec(ups[0])} par wapas)`);
    if (ups[k] < RUN_MS) say(ups[k], `${at(ups[k])}  🟢 payment-service wapas aayi`);
  });
  const inside = t => log.filter(x => x.ok && x.planned <= t && t < x.planned + x.ms).length;
  const killedBy = x => crashes.findIndex((c, k) => k > 0 && x.status === 0 && x.planned >= c - 150 && x.planned <= c + 10);
  const waitText = x => (x.wait == null ? 'haar maan li' : mode === 'jitter' ? `random(0–${Math.min(M.opts.cap, M.opts.base * 2 ** x.n)}) = ${x.wait} ms ruk ke phir` : `${x.wait} ms ruk ke phir`);

  if (mode === 'jitter') {
    log.forEach(x => {
      const who = `${at(x.planned)}  ${PHONES[x.who].padEnd(7)} koshish ${x.n + 1}`;
      if (x.ok) say(x.planned, `${who} → ✅ order laga (${x.ms} ms) · us pal service ke andar ${inside(x.planned + 1)}/${SMALL.crashAt}`);
      else say(x.planned, `${who} → ❌ ${killedBy(x) > 0 ? 'crash mein gayi' : 'service band'} · ${waitText(x)}`);
    });
  } else {
    /* ek hi round (koshish number) ke phones ko ek line mein; lagataar ek jaise "sab fail" round ek line mein */
    const rounds = [];
    log.forEach(x => { const r = rounds.find(y => y.n === x.n && Math.abs(y.t0 - x.planned) < 150 && y.kind === kindOf(x)); if (r) { r.items.push(x); r.t1 = Math.max(r.t1, x.planned); } else rounds.push({ n: x.n, kind: kindOf(x), t0: x.planned, t1: x.planned, items: [x] }); });
    function kindOf(x) { return x.ok ? 'ok' : x.status === 503 ? 'shed' : killedBy(x) > 0 ? 'crash' + killedBy(x) : 'down'; }
    rounds.sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i], names = r.items.length === PHONES.length ? '6 phones' : r.items.map(x => PHONES[x.who]).join(', ');
      if (r.kind === 'down') {
        let j = i; while (mode !== 'backoff' && r.n > 0 && rounds[j + 1] && rounds[j + 1].kind === 'down' && rounds[j + 1].items.length === r.items.length) j++;
        const calls = rounds.slice(i, j + 1).reduce((a, y) => a + y.items.length, 0);
        const what = r.n === 0 ? `${names}: "Order place"` : j > i ? `${names}: ${j - i + 1} aur round retry (${calls} calls)` : `${names}: koshish ${r.n + 1}`;
        say(r.t0, `${range(r.t0, rounds[j].t1)}  ${what} → ❌ service band · ${waitText(r.items[0])}`);
        i = j;
      } else if (r.kind.startsWith('crash')) {
        const k = +r.kind.slice(5);
        say(r.t1, `${range(r.t0, r.t1)}  ${names} ek saath laute (koshish ${r.n + 1}) → 5 andar, 6vi par hadd paar → 💥 CRASH #${k + 1} · ${sec(ups[k])} tak band · andar wali 5 bhi gayi · ${waitText(r.items[0])}`);
      } else if (r.kind === 'shed') {
        r.items.forEach(x => say(x.planned, `${at(x.planned)}  ${PHONES[x.who]}: service bhari (5/5) → 🟡 503 "Retry-After: ${x.retryAfter}" — crash nahi · ${x.wait} ms ruk ke phir`));
      } else {
        say(r.t0, `${range(r.t0, r.t1)}  ${names}: koshish ${r.n + 1} → ✅ order laga (${[...new Set([Math.min(...r.items.map(x => x.ms)), Math.max(...r.items.map(x => x.ms))])].join('–')} ms)`);
      }
    }
  }
  console.log(`\n=== ${M.name} ===`);
  lines.sort((a, b) => a.t - b.t).forEach(l => console.log(l.text));
  const ok = placed.filter(Boolean).length, lastUp = ups[ups.length - 1];
  console.log(`   nateeja → order lage: ${ok}/6 · payment-service CRASH: ${crashes.length} baar · payment-service par calls: ${s.calls - 1}` +
    (s.shed503 ? ` · 503 (mana kiya): ${s.shed503}` : '') +
    (crashes.length > 1 ? ` · aakhri baar ${sec(lastUp)} par uthi` : ` · ${sec(lastUp)} se theek`));
}

(async () => {
  const modes = args.mode ? [args.mode] : Object.keys(MODES);
  console.log('payment-service: ek saath 5 orders (har ek 300 ms), 6vi ek saath → CRASH · 1.0 s par deploy se crash, 1.4 s band · 6 phones 1.3–1.4 s par "Order place" · run 8 s');
  for (const m of modes) await run(m);
  process.exit(0);
})();
