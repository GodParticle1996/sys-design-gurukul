/* =====================================================================
   🛡️ Playlist · 1 Resilience — Retries · level 4: LIBRARY
   Wahi retry, par npm ki asli library (p-retry) se: settings ke asli naam, library kahan alag chalti hai,
   aur default settings ka bill. Code ka tukda ASLI file se hai (docker-labs/37-retries/tools/p-retry.js).
   Asli run: us folder ka README. Library ke naam aur defaults: p-retry 8.0.1 ka source;
   AWS SDK, gRPC aur Kafka ke naam unke official docs se (is lab mein chalaye nahi gaye).
   ===================================================================== */
(function () {

const HERO = [
  { id: 'fn', icon: '🧩', label: 'placeOrder()', x: 135, y: 105 },
  { id: 'lib', icon: '📦', label: 'p-retry', x: 455, y: 105 },
  { id: 'pay', icon: '💳', label: 'payment-service', x: 745, y: 105 },
];

VISUALS['rt-lib'] = {
  t: 'Library tumhari call ko lapet leti hai — par chaaron faisle ab options ke roop mein tumhe hi dene hain',
  html: SD.viz.svg(HERO, [{ from: 'fn', to: 'lib' }, { from: 'lib', to: 'pay' }], {
    nodes: { fn: { tone: 'ok', badge: 'ek call' }, lib: { tone: 'acc', badge: 'default: 10 retries, 1 s se shuru' }, pay: { tone: 'idle', badge: 'POST /work' } },
    flows: [{ from: 'fn', to: 'lib', label: 'pRetry()', tone: 'acc' }, { from: 'lib', to: 'pay', label: 'call', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

const PRETRY_CODE = {
  title: 'docker-labs/37-retries/tools/p-retry.js',
  file: 'docker-labs/37-retries/tools/p-retry.js',
  from: 10,
  text: "async function placeOrder() {                             // wahi function jo mini.js mein hai\n  let res = null;\n  try { res = await fetch(SVC + '/work', { method: 'POST', signal: AbortSignal.timeout(2000) }); } catch (e) {}\n  const after = res && res.headers.get('retry-after');\n  return { ok: !!res && res.ok, status: res ? res.status : 0, retryAfter: after ? +after : null };\n}\n\n/* p-retry ko \"fail\" ka matlab hai: function ne error PHENKA. Isliye { ok: false } ko error mein badalna padta hai. */\nfunction orderOrThrow(AbortError) {\n  return async () => {\n    const r = await placeOrder();\n    if (r.ok) return r;\n    const err = Object.assign(new Error('HTTP ' + r.status), { status: r.status });\n    if (!worthRetrying(r)) throw new AbortError(err);     // AbortError = \"is error par dobara mat bhejo\" (jaise 400, 404)\n    throw err;\n  };\n}\n\nconst OURS = {\n  retries: 4,                // 4 RETRIES = kul 5 koshish (hamare lib/retry.js mein `attempts: 5`)\n  minTimeout: 300,           // pehla intezaar (hamara `base`)\n  maxTimeout: 2400,          // intezaar ki hadd (hamara `cap`)\n  factor: 2,                 // har baar dugna\n  randomize: true,           // intezaar × (1 se 2 ke beech random) — 0 se shuru NAHI hota\n};\nconst DEFAULTS = {};         // kuch nahi diya = library ke default: retries 10 · minTimeout 1000 · factor 2 · maxTimeout Infinity · randomize false",
};

SD.registerLevels('sdd-resil', [
{
  id: 'rt-lib',
  icon: '📦',
  group: '🔁 Retries',
  title: 'Retries 4 · Library — asli project mein setup (p-retry)',
  badge: 'Default Jasoos',
  objectives: [
    'Library ke liye "fail" ka matlab kya hai — aur hamari call usme kaise baithti hai?',
    'Hamari chaar settings library mein <b>kis naam se</b> milti hain?',
    'Library ka "random" hamare random se kahan alag hai?',
    'Library ke <b>default</b> ke saath Asha ka order kab laga — aur der tak chalta toh kahan tak jaata?',
  ],
  lesson: [
    `<h3>📦 Ek line ka retry, aur uska bill</h3>
     <p>KhanaKart ki team ne socha: retry khud kyun likhein? npm par library hai — <b>p-retry</b>. Ek line, koi option nahi:</p>
     <pre>await pRetry(placeOrder);</pre>
     <p>Phir wahi kahani chalayi: payment-service 1.00 s par crash, 2.40 s par wapas, Asha 1.30 s par "Order place" dabati hai.</p>
     <pre>haath ka retry (hamari settings):   order 3.15 s par
p-retry, koi option nahi:           order 4.61 s par   ← payment-service 2.40 s se theek thi</pre>
     <p>Library ne Asha ko 2 second se zyada <b>bekaar</b> intezaar karaya. Aur payment-service der tak band rehti toh yeh intezaar minutes tak jaata.</p>
     <p class="tip">👉 Library galat nahi hai. Library ke <b>default</b> tumhari service ke liye nahi likhe gaye. Is level mein: library ka code ek-ek line, hamari settings ke asli naam, aur default ka poora bill.</p>`,
  ],
  stages: [
    /* ---------------- 1. library ka code + asli run ---------------- */
    {
      type: 'dryrun',
      title: '📦 Wahi retry, asli library se — tools/p-retry.js',
      goal: 'Har click par ek hissa chamkega, aur table mein hamari setting ke saamne library ka naam bharega. Teen jagah pehle tumse poochha jaayega.',
      code: PRETRY_CODE,
      vars: [
        { id: 'fail', label: '"Fail" ka matlab' },
        { id: 'count', label: 'Kitni baar' },
        { id: 'base', label: 'Pehla intezaar' },
        { id: 'cap', label: 'Intezaar ki chhat' },
        { id: 'rand', label: 'Random' },
        { id: 'which', label: 'Kis failure par dobara' },
      ],
      steps: [
        {
          clock: 'library ko "fail" kaise batayein',
          line: [18, 19, 20, 21, 22, 24],
          say: `p-retry ke liye "fail" ka ek hi matlab hai: <b>function ne error phenka</b>.<br><br>
            Hamara <code>placeOrder()</code> (line 10–15, wahi jo mini.js mein tha) error nahi phenkta — <code>{ ok: false, … }</code> lautata hai. Isliye line 18–26 ka chhota lapet:<br>
            Line 21: kaam hua → nateeja lautao.<br>
            Line 22, 24: kaam nahi hua → error banao (status ke saath) aur <b>phenko</b>.`,
          vars: {
            fail: 'hamara: <code>{ ok: false }</code> lautana → p-retry: <b>error phenkna</b>',
            count: 'hamara: <code>attempts: 5</code> → p-retry: ?',
            base: 'hamara: <code>base: 300</code> → p-retry: ?',
            cap: 'hamara: <code>cap: 2400</code> → p-retry: ?',
            rand: 'hamara: <code>wait: \'full\'</code> (0 se hadd) → p-retry: ?',
            which: 'hamara: <code>worthRetrying</code> → p-retry: ?',
          },
        },
        {
          clock: 'kis failure par dobara',
          line: 23,
          say: `Line 23: <code>throw new AbortError(err)</code>. p-retry mein <code>AbortError</code> ka matlab hai: <b>"is error par dobara mat bhejo."</b><br><br>
            Yeh line zaroori hai, kyunki p-retry ka default yeh hai: <b>har phenke gaye error par dobara bhejo.</b> Hamne wahi <code>worthRetrying</code> lagaya jo lib/retry.js mein tha.`,
          vars: { which: 'hamara: <code>worthRetrying</code> → p-retry: default <b>har error par</b>; rokne ke liye <code>AbortError</code> phenko' },
          ask: {
            q: 'Maan lo line 23 hata di. payment-service kehti hai <code>404</code>: "aisa order hai hi nahi". p-retry kya karega?',
            choices: [
              '404 ka error bhi baaki errors jaisa hi phenka jaayega → p-retry use dobara-dobara bhejega, retries khatam hone tak',
              '404 dekh ke p-retry khud ruk jaayega',
              'p-retry crash ho jaayega',
              'p-retry 404 ko success maan lega',
            ],
            answer: 0,
            hint: 'p-retry status nahi dekhta. p-retry sirf yeh dekhta hai ki error phenka gaya ya nahi.',
            explain: 'Library ko pata hi nahi ki 404 aur 503 mein farq hai — dono bas "error" hain. <b>Kis par dobara bhejna hai</b>, yeh faisla library tumse chahti hai (<code>AbortError</code>, ya <code>shouldRetry</code> option). Default mein yeh faisla "sab par" hai.',
          },
        },
        {
          clock: 'kitni baar',
          line: 29,
          say: `Line 29: <code>retries: 4</code>.<br><br>
            Dhyaan se: p-retry <b>retries</b> ginta hai, koshishein nahi. Pehli call retry nahi hai. Isliye <code>retries: 4</code> = 1 + 4 = <b>kul 5 koshish</b> — wahi jo hamara <code>attempts: 5</code> tha.`,
          vars: { count: 'hamara: <code>attempts: 5</code> → p-retry: <b>retries: 4</b> (kul koshish = retries + 1)' },
        },
        {
          clock: 'kitna rukna',
          line: [30, 31, 32],
          say: `Line 30: <code>minTimeout: 300</code> — pehla intezaar. Hamara <code>base</code>.<br>
            Line 31: <code>maxTimeout: 2400</code> — intezaar ki chhat. Hamara <code>cap</code>.<br>
            Line 32: <code>factor: 2</code> — har baar dugna. (Hamari file mein yeh 2 seedha likha tha: <code>2 ** n</code>.)`,
          vars: { base: 'hamara: <code>base: 300</code> → p-retry: <b>minTimeout: 300</b>', cap: 'hamara: <code>cap: 2400</code> → p-retry: <b>maxTimeout: 2400</b>' },
        },
        {
          clock: 'random — yahan farq hai',
          line: 33,
          say: `Line 33: <code>randomize: true</code>.<br><br>
            Hamara random: <b>0 se hadd tak</b> kuch bhi (pehli fail ke baad 0–300 ms).<br>
            p-retry ka random: intezaar ko <b>1 se 2 ke beech</b> ki kisi sankhya se guna karta hai (pehli fail ke baad 300–600 ms).<br><br>
            Yaani p-retry kabhi base se kam nahi rukta. Phones bikharte hain, par ek chhote daayre mein.`,
          vars: { rand: 'hamara: 0 se hadd tak → p-retry: <b>randomize: true</b> = intezaar × (1 se 2)' },
          ask: {
            q: '<code>minTimeout: 300</code>, <code>factor: 2</code>, <code>randomize: true</code>. Doosri fail ke baad p-retry kitna rukega?',
            choices: [
              '600 se 1200 ms ke beech — pehle 300 × 2 = 600, phir use 1 se 2 ke beech ki sankhya se guna',
              '0 se 600 ms ke beech',
              'Theek 600 ms',
              '300 se 600 ms ke beech',
            ],
            answer: 0,
            hint: 'Pehle bina random ka intezaar nikalo (300 × 2). Phir use 1 se 2 ke beech ki sankhya se guna karo.',
            explain: 'Asli run mein p-retry doosri fail ke baad <b>1150 ms</b> ruka — 600 aur 1200 ke beech. Hamara retry usi jagah 0 se 600 ke beech chunta (Asha: 550 ms).',
          },
        },
        {
          clock: 'asli run — hamari settings',
          line: '28-34',
          say: `Wahi kahani, p-retry ke saath, in settings par:
            <pre>  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → 451 ms ruk ke phir · bachi retries: 4
  1.76 s  koshish 2 fail → 1150 ms ruk ke phir · bachi retries: 3
  2.40 s  🟢 payment-service wapas aayi
  3.22 s  ✅ order lag gaya</pre>
            <b>3 koshish</b>, order 3.22 s par. Hamare haath ke retry ne 4 koshish ki thi (151, 550, 830 ms ruk ke) aur order 3.15 s par laga tha.<br><br>
            Lagbhag barabar. Farq random ke tareeke ka hai: p-retry lamba ruka, isliye ek koshish kam lagi.`,
        },
        {
          clock: 'asli run — library ke default',
          line: 35,
          say: `Line 35: <code>DEFAULTS = {}</code> — koi option nahi. Tab p-retry apne default leta hai: <code>retries: 10</code> · <code>minTimeout: 1000</code> · <code>maxTimeout: Infinity</code> · <code>randomize: false</code>.
            <pre>  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.30 s  koshish 1 fail → 1000 ms ruk ke phir · bachi retries: 10
  2.31 s  koshish 2 fail → 2000 ms ruk ke phir · bachi retries: 9
  2.40 s  🟢 payment-service wapas aayi
  4.61 s  ✅ order lag gaya</pre>
            Doosri koshish 2.31 s par gayi — payment-service 2.40 s par uthi. Bas 0.1 second se chook. Phir poore <b>2000 ms</b> ka intezaar. Order <b>4.61 s</b> par.`,
          ask: {
            q: 'Default mein intezaar 1 s se shuru hota hai, har baar dugna, koi chhat nahi, aur 10 retries. payment-service der tak band rahe toh ek request kul kitni der tak retry karti rahegi?',
            choices: [
              '1 + 2 + 4 + … + 512 = 1023 second (~17 minute) — aur bina random ke, yaani sab clients ek saath',
              '10 second',
              '20 second',
              '1 minute',
            ],
            answer: 0,
            hint: 'Dus intezaar hain: 1, 2, 4, 8 … har baar dugna. Aakhri wala 512 second ka hai.',
            explain: '17 minute tak koi user nahi rukta — par us request ke peeche ka worker, connection aur memory ruke rehte hain. Aur <code>randomize: false</code> ka matlab: sab clients ek hi pal par lautte hain (level 1 wali dikkat).',
          },
        },
        {
          clock: 'wahi sawaal, chaar jagah',
          say: `Har retry library ya SDK inhi sawaalon ka jawab maangta hai. Naam badalte hain:
            <div class="dr-scroll"><table>
              <tr><th>Sawaal</th><th>lib/retry.js (lab)</th><th>p-retry (default)</th><th>AWS SDK (standard mode)</th><th>gRPC retryPolicy</th></tr>
              <tr><td>Kitni baar?</td><td><code>attempts</code> (3)</td><td><code>retries</code> (10, yaani kul 11)</td><td><code>max_attempts</code> (3, pehli koshish milaakar)</td><td><code>maxAttempts</code></td></tr>
              <tr><td>Pehla intezaar?</td><td><code>base</code> (100 ms)</td><td><code>minTimeout</code> (1000 ms)</td><td>SDK ke andar tay</td><td><code>initialBackoff</code></td></tr>
              <tr><td>Chhat?</td><td><code>cap</code> (2000 ms)</td><td><code>maxTimeout</code> (Infinity)</td><td>SDK ke andar tay</td><td><code>maxBackoff</code></td></tr>
              <tr><td>Random?</td><td><code>wait: 'full'</code> (0 se hadd)</td><td><code>randomize</code> (false; true = × 1 se 2)</td><td>hamesha jitter ke saath</td><td>± 20%</td></tr>
              <tr><td>Kis par dobara?</td><td><code>worthRetrying</code></td><td>har error; rokne ko <code>AbortError</code> / <code>shouldRetry</code></td><td>sirf transient aur throttling errors</td><td><code>retryableStatusCodes</code></td></tr>
            </table></div>
            AWS SDK, gRPC ke naam unke official docs se hain — is lab mein chalaye nahi gaye. gRPC mein koi default policy nahi hoti: likhni padti hai. Kafka ke clients bhi yahi karte hain: <code>retry.backoff.ms</code> (100) se <code>retry.backoff.max.ms</code> (1000) tak dugna, ± 20% random.`,
        },
        {
          clock: 'toh main kya karun?',
          say: `Koi bhi retry library lagane se pehle chaar cheezein apne haath se likho:
            <ul>
              <li><b>Kitni baar:</b> utni hi, jitni der user sach mein ruk sakta hai. Saare intezaar jod ke dekho: kul kitne second bante hain?</li>
              <li><b>Chhat:</b> <code>Infinity</code> kabhi nahi.</li>
              <li><b>Random:</b> on. Aur library ka random kya karta hai, yeh padh lo (0 se hadd, ya × 1–2, ya ± 20%).</li>
              <li><b>Kis par dobara:</b> "har error par" mat chhodo. 400 / 401 / 403 / 404 par rok do.</li>
            </ul>`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> library retry ka loop likh deti hai, faisle nahi leti. <b>Kitni baar · kitna rukna · random · kis par dobara</b> — yeh chaaron ab options hain, aur inke default tumhari service ko nahi jaante.<br>p-retry ke default ke saath Asha ka order 4.61 s par laga; hamari settings ke saath 3.22 s par.',
    },

    /* ---------------- 2. naam jodo ---------------- */
    {
      type: 'match',
      title: 'Hamari setting ↔ library ka naam',
      instructions: 'Baayein hamara sawaal, daayein p-retry ka option.',
      pairs: [
        { left: 'Kul 5 koshish chahiye', right: 'retries: 4', explain: 'p-retry retries ginta hai. Kul koshish = retries + 1. (Default retries: 10 → kul 11.)' },
        { left: 'Pehla intezaar 300 ms', right: 'minTimeout: 300', explain: 'Hamara base. Default 1000 ms — isi ne Asha ke order ko 4.61 s tak kheencha.' },
        { left: 'Intezaar 2400 ms se upar na jaaye', right: 'maxTimeout: 2400', explain: 'Hamara cap. Default Infinity: intezaar 512 second tak dugna hota jaata hai.' },
        { left: 'Sab clients ek saath na lautein', right: 'randomize: true', explain: 'Intezaar × (1 se 2). Default false: bina random, sab ek saath.' },
        { left: '404 par dobara mat bhejo', right: 'throw new AbortError(err)', explain: 'Default mein har error par retry hota hai. AbortError (ya shouldRetry option) se rokna padta hai.' },
      ],
    },

    /* ---------------- 3. bonus: khud chalao ---------------- */
    {
      type: 'docker',
      bonus: true,
      title: '🐳 Bonus — p-retry apne laptop par chalao',
      project: '37-retries',
      exercise: 'ex0-slowmo',
      goal: 'Wahi kahani do baar: pehle hamari settings ke saath, phir library ke default ke saath. Dono mein order lagne ka waqt dekho.',
      why: '<code>tools/p-retry.js</code> wahi file hai jo abhi padhi. Chalane ke liye ek <code>npm install p-retry</code> chahiye (Node 22 ya naya). Demo ne library ke random ka beej tay kar diya hai, isliye tumhara output yahi aayega. Docker image mein p-retry install nahi hota — is tool ko seedha Node se chalao.',
      steps: [
        { text: 'payment-service chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/37-retries && npm start ex0-slowmo', expect: 'ex0-slowmo\n[fragile] :5165 crash > 40 ek saath · down 2000 ms · thanda 3000 ms' },
        { text: 'Doosre terminal mein, usi folder mein library install karo (ek baar). p-retry 8 ko <b>Node 22 ya naya</b> chahiye: <code>node --version</code> se dekh lo.', cmd: 'cd docker-labs/37-retries && npm install p-retry' },
        { text: 'Ab dono kahaniyan (kul ~9 s).', cmd: 'node tools/p-retry.js', expect: `=== (1) hamari settings: retries 4 · minTimeout 300 · maxTimeout 2400 · randomize true ===
  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → 451 ms ruk ke phir · bachi retries: 4
  1.76 s  koshish 2 fail → 1150 ms ruk ke phir · bachi retries: 3
  2.40 s  🟢 payment-service wapas aayi
  3.22 s  ✅ order lag gaya

=== (2) library ke DEFAULT: retries 10 · minTimeout 1000 · maxTimeout Infinity · randomize false ===
  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.30 s  koshish 1 fail → 1000 ms ruk ke phir · bachi retries: 10
  2.31 s  koshish 2 fail → 2000 ms ruk ke phir · bachi retries: 9
  2.40 s  🟢 payment-service wapas aayi
  4.61 s  ✅ order lag gaya` },
      ],
      observe: {
        q: 'Default wale hisse (2) mein doosri koshish 2.31 s par fail hui, aur payment-service 2.40 s par uth gayi. Phir bhi order 4.61 s par kyun laga?',
        choices: [
          'Default mein doosri fail ke baad intezaar poore 2000 ms ka hai (1000 × 2), bina random aur bina chhat ke. Phone 4.31 s tak soya raha',
          'payment-service 4.31 s tak band thi',
          'p-retry ne order bhejna bhool gaya',
          'Network dheema tha',
        ],
        answer: 0,
        explain: 'Bada base (1000 ms) + dugna + koi chhat nahi = chhoti si chook ki badi keemat. Hamari settings mein usi jagah intezaar 1150 ms tha aur order 3.22 s par lag gaya.',
      },
      lesson: 'Library wahi kaam karti hai, par uske default tumhari service ke nahi hain. Chaar options hamesha khud likho.',
    },
  ],
  interview: {
    title: 'Interview Round — library aur settings',
    instructions: 'Yahan "kaunsi setting, kyun" bolna hai. 🎤',
    questions: [
      {
        q: '"Humne retry library default settings ke saath laga di. Kya galat ho sakta hai?"',
        choices: [
          'Default tumhari service ko nahi jaante: bahut zyada koshishein, lamba ya bina chhat ka intezaar, random band, aur har error par retry (4xx par bhi). Chaaron cheezein khud likhni chahiye',
          'Kuch nahi — library ke default production ke liye bane hain',
          'Default hamesha bahut kam retry karte hain',
          'Library default ke saath chalti hi nahi',
        ],
        answer: 0,
        explain: 'p-retry 8 ke default: retries 10, minTimeout 1000 ms, maxTimeout Infinity, randomize false, har error par retry. Lab: default ke saath order 4.61 s par (service 2.40 s se theek); intezaar kul 1023 second tak ja sakta hai.',
      },
      {
        q: '"Library mein randomize: true kar diya. Kya ab hamare paas full jitter hai?"',
        choices: [
          'Zaroori nahi — har library ka random alag hai. p-retry intezaar ko 1 se 2 ke beech guna karta hai (kabhi base se kam nahi); full jitter 0 se hadd tak chunta hai; gRPC ± 20% lagata hai. Library ka formula padhna padta hai',
          'Haan, randomize ka matlab hamesha full jitter hota hai',
          'Nahi, randomize kuch karta hi nahi',
          'Haan, par sirf pehli retry par',
        ],
        answer: 0,
        explain: 'Lab: base 300 par pehli fail ke baad p-retry 451 ms ruka (300–600 ke beech), hamara full jitter 151 ms (0–300 ke beech).',
      },
    ],
  },
  success: [
    'p-retry ke options ko apne chaar faislon se mila sakte ho (aur retries + 1 = kul koshish yaad hai)',
    'Bata sakte ho ki library ka random hamare random se kahan alag hai',
    'Default settings ka bill number ke saath bata sakte ho, aur chaar cheezein khud likhte ho',
  ],
  cards: [
    { front: 'p-retry mein retries: 4 ka matlab?', back: '4 <b>retries</b> = pehli call + 4 = <b>kul 5 koshish</b>. Default retries: 10 → kul 11.' },
    { front: 'p-retry ka randomize: true kya karta hai?', back: 'Intezaar × (1 se 2 ke beech random). Kabhi base se kam nahi. Lab: 451 ms (300–600), phir 1150 ms (600–1200). Full jitter 0 se hadd tak chunta hai.' },
    { front: 'p-retry default mein kis error par dobara bhejta hai?', back: '<b>Har</b> phenke gaye error par — 404 par bhi. Rokne ke liye <code>AbortError</code> phenko ya <code>shouldRetry</code> do.' },
    { front: 'p-retry ke default ka bill?', back: 'retries 10 · minTimeout 1000 ms · maxTimeout Infinity · randomize false. Lab: order 4.61 s par (hamari settings: 3.22 s). Der tak chale toh 1 + 2 + … + 512 = 1023 second.' },
  ],
},
]);

})();
