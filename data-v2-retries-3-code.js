/* =====================================================================
   🛡️ Playlist · 1 Resilience — Retries · level 3: CODE
   Sahi retry ek chhoti file mein (lib/retry.js), phir apni fetch ke aaspaas (tools/mini.js).
   Code ke tukde ASLI files se hain (docker-labs/37-retries) — validate.js unhe byte-for-byte milata hai.
   Har number us folder ke asli run se hai. (Asli library agle level mein: data-v2-retries-4-library.js.)
   ===================================================================== */
(function () {

const HERO = [
  { id: 'mini', icon: '🧪', label: 'mini.js', x: 120, y: 105 },
  { id: 'lib', icon: '🔁', label: 'retry.js', x: 440, y: 105 },
  { id: 'pay', icon: '💳', label: 'payment-service', x: 745, y: 105 },
];

VISUALS['rt-code'] = {
  t: 'Do file, jo lab sach mein chalata hai: mini.js ka placeOrder() ek call hai; retry.js usse baar-baar, par dimaag se, bhejta hai',
  html: SD.viz.svg(HERO, [{ from: 'mini', to: 'lib' }, { from: 'lib', to: 'pay' }], {
    nodes: { mini: { tone: 'ok', badge: 'placeOrder(): 6 line' }, lib: { tone: 'acc', badge: 'kis par · kitni baar · kitna rukna' }, pay: { tone: 'idle', badge: 'POST /work' } },
    flows: [{ from: 'mini', to: 'lib', label: 'retry()', tone: 'acc' }, { from: 'lib', to: 'pay', label: 'call', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rt-code',
  icon: '💻',
  group: '🔁 Retries',
  title: 'Retries 3 · Code — sahi retry, 26 line mein',
  badge: 'Loop Lohaar',
  objectives: [
    'Retry ke chaar faisle code mein kahan hain: kis par dobara, kitni baar, kitna rukna, server ki baat?',
    'Ek fail hui call ke baad code ki kaunsi line kya tay karti hai?',
    'Apni <code>fetch</code> ko retry ke laayak kaise banate hain — <code>fetch</code> toh 503 par error phenkta hi nahi?',
  ],
  lesson: [
    `<h3>💻 Teen line ka retry, aur uska bill</h3>
     <p>Retry likhna teen line ka kaam lagta hai:</p>
     <pre>while (true) {
  if (await call()) break;      // fail? turant dobara
}</pre>
     <p>Yahi teen line pichhle levels ka "turant retry" thi. Slow motion mein inka bill: <b>132 calls, 5 crash, 6 mein se 0 order</b>.</p>
     <p>Sahi retry mein chaar faisle hote hain: <b>kis failure par</b> dobara bhejna hai, <b>kitni baar</b>, <b>kitna rukna</b> hai, aur <b>server ne kuch bataya</b> toh uska kya.</p>
     <p>Is level mein do file padhoge. Dono asli file hain, copy nahi. Lab yahi do file chalata hai:</p>
     <pre>docker-labs/37-retries/lib/retry.js      ← chaaron faisle (26 line)
docker-labs/37-retries/tools/mini.js     ← apni fetch ko retry ke laayak banana (15 line)</pre>
     <p class="tip">👉 Pehle <code>retry.js</code>, Asha ke phone ki wahi chaar koshishein. Is baar dekhoge ki <b>kaunsi line</b> ne har faisla liya.</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/retry.js, line by line ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/retry.js — ek-ek line, ek-ek click',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Pehle Asha ki chaar koshishein, phir do "agar aisa hota" wale raaste. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/37-retries/lib/retry.js',
        file: 'docker-labs/37-retries/lib/retry.js',
        from: 4,
        text: "/* Kitni der rukna hai?  n = ab tak kitni baar fail hua (0, 1, 2 …)  ·  base, cap = milliseconds */\nconst WAITS = {\n  fixed:   (n, o)         => o.base,                                          // har baar utna hi: 300, 300, 300 …\n  backoff: (n, o)         => Math.min(o.cap, o.base * 2 ** n),                // har baar dugna: 300, 600, 1200 … (cap tak)\n  full:    (n, o, random) => random() * Math.min(o.cap, o.base * 2 ** n),     // 0 se us hadd ke beech, kahin bhi\n  equal:   (n, o, random) => { const d = Math.min(o.cap, o.base * 2 ** n); return d / 2 + random() * d / 2; },   // aadha pakka + aadha random\n};\n\n/* Kis failure par dobara bhejna theek hai?  jawab nahi aaya · 429 \"baad mein aana\" · 5xx (server ki dikkat).\n   Baaki 4xx (400, 401, 403, 404 …) par nahi: wahi request dobara bhejne se jawab nahi badlega. */\nconst worthRetrying = r => r.status === 0 || r.status === 429 || r.status >= 500;\n\nasync function retry(call, { attempts = 3, base = 100, cap = 2000, wait = 'full', random = Math.random,\n                             sleep = ms => new Promise(done => setTimeout(done, ms)), onWait } = {}) {\n  for (let n = 0; ; n++) {\n    const r = await call(n);\n    if (r.ok) return r;                                              // kaam ho gaya\n    if (!worthRetrying(r)) return r;                                 // dobara bhejne ka fayda nahi\n    if (n === attempts - 1) return r;                                // koshishein khatam: haar maan lo, user ko batao\n    const ms = r.retryAfter != null\n      ? r.retryAfter * 1000 + random() * base                        // server ne khud bataya kab aana hai: utna to rukna hi hai (+ thoda random)\n      : WAITS[wait](n, { base, cap }, random);\n    if (onWait) onWait(n, ms, r);\n    await sleep(ms);\n  }\n}",
      },
      vars: [
        { id: 'cfg', label: 'Settings (mini.js se aati hain)' },
        { id: 'n', label: '<code>n</code> (ab tak kitni baar fail hua)' },
        { id: 'r', label: '<code>r</code> (call ka nateeja)' },
        { id: 'worth', label: '<code>worthRetrying(r)</code>' },
        { id: 'ms', label: '<code>ms</code> (kitna rukna hai)' },
        { id: 'out', label: '<code>retry()</code> ne lautaya' },
      ],
      steps: [
        {
          clock: 'file ke teen hisse',
          line: [5, 14, 16],
          say: `File mein teen cheezein hain:<br><br>
            <b>Line 5–10, <code>WAITS</code>:</b> "kitna rukna hai" ke chaar formule.<br>
            <b>Line 14, <code>worthRetrying</code>:</b> "kis failure par dobara bhejna theek hai".<br>
            <b>Line 16–29, <code>retry()</code>:</b> loop, jo in dono se poochh-poochh ke chalta hai.<br><br>
            Ab Asha ka phone. payment-service 1.00 s par crash hui hai, 2.40 s par wapas aayegi.`,
          vars: { cfg: 'attempts 5 · base 300 · cap 2400 · wait \'full\'', n: 'abhi shuru nahi', r: '—', worth: '—', ms: '—', out: '—' },
        },
        {
          clock: 'koshish 1 · 1.30 s',
          line: [18, 19, 20],
          say: `Line 18: loop shuru, <code>n</code> = 0.<br>
            Line 19: <code>call(n)</code> — Asha ka order jaata hai. payment-service band hai, jawab hi nahi aaya: <code>r</code> = <code>{ ok: false, status: 0 }</code>.<br>
            Line 20: <code>r.ok</code>? Nahi → aage.`,
          vars: { n: '0', r: '{ ok: false, status: 0 } — jawab hi nahi aaya' },
        },
        {
          clock: 'koshish 1 · pehla faisla',
          line: [21, 14],
          say: `Line 21 poochhti hai: <b>is failure par dobara bhejna theek hai?</b> Jawab line 14 deti hai.<br><br>
            <code>status === 0</code> → jawab hi nahi aaya → <code>worthRetrying</code> = <b>true</b>. Line 21 ka <code>return</code> nahi chalta. Aage.`,
          vars: { worth: 'true — status 0 (jawab nahi aaya)' },
          ask: {
            q: 'Maan lo yahan <code>r.status</code> 404 hota (payment-service ne kaha: "aisa order hai hi nahi"). Line 21 kya karti?',
            choices: [
              '<code>worthRetrying</code> false deta (404 na 0 hai, na 429, na 500 ya upar) → line 21 turant <code>r</code> lauta deti. Koi retry nahi',
              'Phir bhi 5 koshish hoti, kyunki call fail hui hai',
              '404 par <code>retry()</code> crash ho jaata',
              'Line 21 skip hoti aur seedha line 27 par rukte',
            ],
            answer: 0,
            hint: 'Line 14 mein teen shartein hain. 404 unmein se kisi mein aata hai?',
            explain: 'Line 14: <code>0</code>, <code>429</code>, ya <code>500 aur upar</code>. 404 teeno mein nahi. Wahi request dobara bhejne se "order hai hi nahi" ka jawab nahi badlega — isliye pehla faisla hi rok deta hai.',
          },
        },
        {
          clock: 'koshish 1 · doosra faisla',
          line: 22,
          say: `Line 22 poochhti hai: <b>koshishein khatam?</b><br><br>
            <code>n === attempts - 1</code> → 0 === 4? Nahi. Abhi chaar koshishein baaki hain. Aage.`,
        },
        {
          clock: 'koshish 1 · teesra aur chautha faisla',
          line: [23, 25, 8],
          say: `Line 23 poochhti hai: <b>server ne bataya kab aana hai?</b> <code>r.retryAfter</code> hai hi nahi (jawab hi nahi aaya tha) → line 24 skip.<br><br>
            Line 25: <code>WAITS['full'](0, { base: 300, cap: 2400 }, random)</code> → line 8 chalti hai:<br>
            <code>random() × min(2400, 300 × 2⁰)</code> = random × 300 = <b>151 ms</b>.`,
          vars: { ms: '151  (0 se 300 ke beech)' },
        },
        {
          clock: 'koshish 1 → 2 · 1.30 s → 1.45 s',
          line: [26, 27, 18],
          say: `Line 26: <code>onWait</code> ko khabar (lab isi se "151 ms ruk ke phir" chhapta hai).<br>
            Line 27: <code>sleep(151)</code>.<br>
            Line 18: loop ka agla chakkar, <code>n</code> = 1.`,
          vars: { n: '1', r: '—', worth: '—' },
        },
        {
          clock: 'koshish 2 aur 3 · 1.45 s, 2.00 s',
          line: [19, 21, 22, 25, 8, 27],
          say: `Wahi raasta do baar aur. Sirf line 8 ka hisaab badalta hai, kyunki <code>n</code> badh raha hai:<br><br>
            <b>n = 1:</b> random × min(2400, 300 × 2¹) = random × 600 = <b>550 ms</b><br>
            <b>n = 2:</b> random × min(2400, 300 × 2²) = random × 1200 = <b>830 ms</b><br><br>
            <code>2 ** n</code> hadd ko dugna karta hai. <code>Math.min(o.cap, …)</code> hadd par chhat lagata hai.`,
          vars: { n: '3', ms: '550, phir 830' },
        },
        {
          clock: 'koshish 4 · 2.83 s',
          line: [19, 20],
          say: `Line 19: order jaata hai. payment-service 2.40 s se wapas hai → <code>r</code> = <code>{ ok: true }</code>.<br>
            Line 20: <code>r.ok</code> → <b><code>return r</code></b>.<br><br>
            Asha ka order lag gaya. Loop khatam. Line 21 se 27 chali hi nahi.`,
          vars: { r: '{ ok: true, status: 200 }', out: '{ ok: true } — order lag gaya', ms: 'zaroorat nahi' },
        },
        {
          clock: 'agar payment-service wapas na aati',
          line: [19, 20, 21, 22],
          say: `Ab ek doosra raasta. Maan lo payment-service band hi rehti. Paanchvi koshish: <code>n</code> = 4, call phir fail.<br><br>
            Line 20: ok nahi. Line 21: <code>worthRetrying</code> true hai, isliye yeh line nahi rokti. Ab line 22.`,
          vars: { n: '4', r: '{ ok: false, status: 0 }', worth: 'true', out: '—' },
          ask: {
            q: '<code>n</code> = 4 hai aur <code>attempts</code> = 5. Line 22 kya karegi?',
            choices: [
              '4 === 5 - 1 sach hai → <code>return r</code>. retry() fail hua nateeja lauta deta hai; ab app user ko error dikhaye',
              'Ek aur koshish karegi, kyunki 5 abhi poore nahi hue',
              'Hamesha ke liye ruk jaayegi',
              'Phir se n = 0 se shuru karegi',
            ],
            answer: 0,
            hint: 'n 0 se gina jaata hai. n = 4 kaunsi koshish hai?',
            explain: '<code>n</code> 0 se shuru hota hai, isliye n = 4 <b>paanchvi</b> koshish hai. Line 22 ke bina loop kabhi nahi rukta — yahi "koi limit nahi" wala turant retry tha (132 calls).',
          },
        },
        {
          clock: 'agar server ne "baad mein aana" bola',
          line: [23, 24],
          say: `Aakhri raasta: Farhan ka phone. payment-service bhari thi, usne <code>503</code> ke saath <code>Retry-After: 1</code> bheja. Toh <code>r.retryAfter</code> = 1.<br><br>
            Line 23: <code>retryAfter</code> hai → line 24 chalti hai, line 25 nahi:<br>
            <code>1 × 1000 + random() × 300</code> = <b>1043 ms</b>.<br><br>
            Server ka bataya 1 second to rukna hi hai. Upar se thoda random, taaki jin-jin ko "1 second" mila, sab ek saath na lautein. (Farhan ke phone mein koshish ki limit nahi thi, isliye line 22 ne use nahi roka.)`,
          vars: { n: 'Farhan ka phone (koshish ki limit nahi)', r: '{ ok: false, status: 503, retryAfter: 1 }', worth: 'true — status 503', ms: '1043  (1000 + thoda random)', out: '—' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> sahi retry mein chaar faisle hain, aur har faisle ki apni line hai: <b>kis par</b> (line 21) · <b>kitni baar</b> (line 22) · <b>server ne kya kaha</b> (line 23–24) · <b>kitna rukna</b> (line 25, formula line 8).<br>Teen line ke "turant retry" mein in chaaron mein se ek bhi nahi tha.',
    },

    /* ---------------- 2. apni fetch ko retry ke laayak banana ---------------- */
    {
      type: 'dryrun',
      title: '🧩 Apni fetch ko retry ke laayak banana — tools/mini.js',
      goal: '<code>retry()</code> ko ek aisa function chahiye jo saaf bataye: kaam hua ya nahi, status kya tha, server ne kab aane ko kaha. <code>fetch</code> akela yeh nahi batata. Dekho kaise banate hain.',
      code: {
        title: 'docker-labs/37-retries/tools/mini.js',
        file: 'docker-labs/37-retries/tools/mini.js',
        from: 9,
        text: "async function placeOrder() {\n  let res = null;\n  try { res = await fetch(SVC + '/work', { method: 'POST', signal: AbortSignal.timeout(2000) }); } catch (e) {}   // jawab hi nahi aaya → res = null\n  const after = res && res.headers.get('retry-after');             // server ne bataya ho ki kab aana hai\n  return { ok: !!res && res.ok, status: res ? res.status : 0, retryAfter: after ? +after : null };\n}\n\nconst order = () => retry(placeOrder, {\n  attempts: 5,           // kul 5 koshish, phir user ko error\n  base: 300,             // pehla intezaar 0–300 ms ke beech\n  cap: 2400,             // intezaar ki hadd 2400 ms se upar nahi jaati\n  wait: 'full',          // har baar dugni hadd ke andar random (full jitter)\n  random: seeded(10),    // sirf is demo ke liye: tay-beej wala random, taaki har run mein wahi dikhe\n  onWait: (n, ms) => say(`koshish ${n + 1} fail → random(0–${Math.min(2400, 300 * 2 ** n)}) = ${Math.round(ms)} ms ruk ke phir`),\n});",
      },
      vars: [
        { id: 'res', label: '<code>res</code> (line 11)' },
        { id: 'after', label: '<code>after</code> (line 12)' },
        { id: 'ret', label: '<code>placeOrder()</code> ne lautaya (line 13)' },
      ],
      steps: [
        {
          clock: 'do tarah ki failure',
          line: [9, 10, 11],
          say: `<code>fetch</code> do tarah se "fail" hota hai, aur dono alag dikhte hain:<br><br>
            <b>1. Jawab hi nahi aaya</b> (service band, ya 2000 ms mein kuch nahi) → <code>fetch</code> error <b>phenkta</b> hai.<br>
            <b>2. Jawab aaya, par bura</b> (503, 404) → <code>fetch</code> error <b>nahi</b> phenkta. Ek normal <code>res</code> deta hai jiska status 503 hai.<br><br>
            Line 11 pehli tarah ko pakadti hai: <code>catch</code> error ko chhod deta hai, aur <code>res</code> null reh jaata hai. <code>AbortSignal.timeout(2000)</code> = 2 second se zyada intezaar nahi.`,
          vars: { res: 'null — jawab hi nahi aaya', after: '—', ret: '—' },
        },
        {
          clock: 'Asha ki koshish 1',
          line: [12, 13],
          say: `payment-service band thi → <code>res</code> null.<br><br>
            Line 12: <code>res</code> null hai → <code>after</code> bhi null.<br>
            Line 13: teen cheezein lautao:<br>
            • <code>ok</code>: <code>!!res && res.ok</code> → false<br>
            • <code>status</code>: <code>res</code> nahi hai → <b>0</b><br>
            • <code>retryAfter</code>: null<br><br>
            Yahi <code>status: 0</code> pichhle stage mein line 14 ne padha tha.`,
          vars: { after: 'null', ret: '{ ok: false, status: 0, retryAfter: null }' },
        },
        {
          clock: 'Farhan ki call',
          line: [11, 12],
          say: `Ab doosri tarah. payment-service bhari thi aur usne jawab diya: status <code>503</code>, header <code>Retry-After: 1</code>.<br><br>
            Line 11: jawab aaya → <code>res</code> null nahi hai. <code>fetch</code> ne koi error nahi phenka.<br>
            Line 12: header padha → <code>after</code> = "1".`,
          vars: { res: 'jawab aaya · status 503', after: '"1"', ret: '—' },
          ask: {
            q: 'Line 13 ab kya lautayegi?',
            choices: [
              '<code>{ ok: false, status: 503, retryAfter: 1 }</code>',
              '<code>{ ok: true, status: 503, retryAfter: 1 }</code> — jawab toh aaya hai',
              '<code>{ ok: false, status: 0, retryAfter: null }</code>',
              'Kuch nahi — 503 par line 11 error phenk deti hai',
            ],
            answer: 0,
            hint: '<code>res.ok</code> sirf 200 se 299 ke status par true hota hai.',
            explain: '<code>res.ok</code> 503 par false hai → <code>ok: false</code>. Status jaisa aaya waisa: 503. <code>+after</code> "1" ko sankhya 1 bana deta hai. Isi <code>retryAfter: 1</code> ko retry.js ki line 23 ne padha tha (1043 ms).',
          },
        },
        {
          clock: 'chaar faisle = chaar settings',
          line: [16, 17, 18, 19, 20],
          say: `Line 16: <code>retry(placeOrder, { … })</code>. <code>placeOrder</code> ek call hai; <code>retry</code> usse dimaag se dobara bhejta hai.<br><br>
            <b>Line 17, <code>attempts: 5</code>:</b> kitni baar. Paanchvi fail par user ko error.<br>
            <b>Line 18, <code>base: 300</code>:</b> pehli hadd.<br>
            <b>Line 19, <code>cap: 2400</code>:</b> hadd ki chhat.<br>
            <b>Line 20, <code>wait: 'full'</code>:</b> hadd ke andar random.<br><br>
            "Kis failure par" yahan nahi likha: woh retry.js ki line 14 mein pehle se hai.`,
          vars: { res: '—', after: '—', ret: '—' },
        },
        {
          clock: 'sirf demo ke liye',
          line: [21, 22],
          say: `Line 21: <code>random: seeded(10)</code> sirf is demo ke liye hai. Yeh aisa random hai jo har run mein wahi sankhyaein deta hai — taaki tumhara output dry run se mile. Apne code mein yeh line mat likho; tab <code>Math.random</code> chalega.<br><br>
            Line 22: har intezaar se pehle ek line chhapti hai.`,
        },
        {
          clock: 'asli run',
          line: '16-23',
          say: `Lab mein is file ka asli output:
            <pre>retry: 5 koshish · intezaar random(0 … 300 × 2ⁿ ms), hadd 2400 ms

  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → random(0–300) = 151 ms ruk ke phir
  1.46 s  koshish 2 fail → random(0–600) = 550 ms ruk ke phir
  2.01 s  koshish 3 fail → random(0–1200) = 830 ms ruk ke phir
  2.40 s  🟢 payment-service wapas aayi
  3.15 s  ✅ order lag gaya</pre>
            Chaar koshishein, teen intezaar (151, 550, 830 ms). Asha ko kuch nahi karna pada — order 3.15 s par lag gaya.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> retry tabhi sahi chalega jab tumhari call saaf bataye ki kya hua. Teen cheezein lautao: <b>kaam hua?</b> (<code>ok</code>) · <b>status kya tha?</b> (jawab nahi aaya toh 0) · <b>server ne kab aane ko kaha?</b> (<code>retryAfter</code>).<br><code>fetch</code> 503 par error nahi phenkta — status khud dekhna padta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — code',
    instructions: 'Yahan "kaunsi line kya tay karti hai" bolna hai. 🎤',
    questions: [
      {
        q: '"Tumhara retry wrapper kis failure par dobara bhejta hai, aur kis par nahi?"',
        choices: [
          'Dobara: jawab hi nahi aaya (timeout / connection toota), 429, aur 5xx. Nahi: baaki 4xx jaise 400, 401, 403, 404 — wahi request dobara bhejne se jawab nahi badlega',
          'Har failure par dobara bhejta hai — isi ko retry kehte hain',
          'Sirf 500 par',
          'Sirf jab user dobara button dabaye',
        ],
        answer: 0,
        explain: 'Lab ki <code>lib/retry.js</code> line 14: <code>status === 0 || status === 429 || status >= 500</code>. Yeh faisla loop ke andar sabse pehle hota hai (line 21), ginti aur intezaar se bhi pehle.',
      },
      {
        q: '"<code>fetch</code> 503 par error nahi phenkta. Phir retry wrapper ko kaise pata chalega ki call fail hui?"',
        choices: [
          'Call ko ek aisa function banao jo khud status dekhe aur saaf lautaye: ok, status (jawab na aaye toh 0) aur Retry-After. Wrapper usi nateeje par faisla karta hai',
          'fetch ke aaspaas try/catch laga do — 503 catch mein aa jaayega',
          '503 kabhi aata hi nahi',
          'Retry wrapper ko pata nahi chal sakta',
        ],
        answer: 0,
        explain: 'Lab ki <code>tools/mini.js</code> ka <code>placeOrder()</code>: <code>catch</code> sirf "jawab hi nahi aaya" pakadta hai (status 0). 503 ek normal <code>res</code> hai jiska <code>res.ok</code> false hota hai.',
      },
    ],
  },
  success: [
    'retry.js mein chaaron faislon ki line dikha sakte ho: kis par, kitni baar, server ki baat, kitna rukna',
    'Kisi bhi nateeje (status 0, 404, 503 + Retry-After, ok) par bata sakte ho loop kya karega',
    'Apni fetch ko aisa function bana sakte ho jo ok, status aur retryAfter lautaye',
  ],
  cards: [
    { front: 'Sahi retry ke chaar faisle?', back: '<b>Kis failure par</b> (jawab nahi aaya / 429 / 5xx) · <b>kitni baar</b> (attempts) · <b>server ne kya kaha</b> (Retry-After pehle) · <b>kitna rukna</b> (dugni hadd ke andar random, chhat ke saath). Lab: lib/retry.js line 21, 22, 23–24, 25.' },
    { front: 'worthRetrying kis par true hai?', back: '<code>status === 0</code> (jawab hi nahi aaya) · <code>429</code> · <code>500 aur upar</code>. 400, 401, 403, 404 par false: wahi request dobara bhejne se jawab nahi badlega.' },
    { front: 'fetch 503 par kya karta hai?', back: 'Error <b>nahi</b> phenkta: normal <code>res</code> deta hai jiska <code>res.ok</code> false hai. Error sirf tab, jab jawab hi na aaye. Isliye apni call se <code>{ ok, status, retryAfter }</code> lautao.' },
    { front: 'attempts: 5 mein n kahan tak jaata hai?', back: '<code>n</code> 0 se gina jaata hai: 0, 1, 2, 3, 4. <code>n === attempts - 1</code> par (paanchvi koshish) loop haar maan leta hai. Is line ke bina retry kabhi nahi rukta.' },
  ],
},
]);

})();
