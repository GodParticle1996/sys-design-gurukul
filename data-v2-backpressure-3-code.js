/* =====================================================================
   🛡️ Playlist · 1 Resilience — Backpressure · level 3: CODE
   Hadd wali line ka poora code (lib/bounded-queue.js), phir sabse chhota program jo use chalata hai (tools/mini.js).
   Code ke tukde ASLI files se hain (docker-labs/15-backpressure) — validate.js unhe byte-for-byte milata hai.
   Har number us folder ke asli run se hai. (Asli library agle level mein: data-v2-backpressure-4-library.js.)
   ===================================================================== */
(function () {

const HERO = [
  { id: 'snd', icon: '📤', label: 'sender()', x: 125, y: 105 },
  { id: 'q', icon: '📥', label: 'BoundedQueue', x: 445, y: 105 },
  { id: 'wrk', icon: '🧭', label: 'worker()', x: 765, y: 105 },
];
const cells = (ids, cap) => Array.from({ length: cap }, (_, i) => (i < ids.length ? 'wait:#' + ids[i] : 'free'));
const seq = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

VISUALS['bp-code'] = {
  t: 'Bhejne wala put() par rukta hai; kaam karne wala take() se use chhodta hai',
  html: SD.viz.svg(HERO, [{ from: 'snd', to: 'q' }, { from: 'q', to: 'wrk' }], {
    nodes: { snd: { tone: 'busy', badge: 'await put() par ruka' }, q: { tone: 'slow', badge: 'bhari: 3/3' }, wrk: { tone: 'ok', badge: 'take() → wake()' } },
    flows: [{ from: 'snd', to: 'q', label: 'put()', tone: 'slow', stuck: true }, { from: 'q', to: 'wrk', label: 'take()', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'bp-code',
  icon: '💻',
  group: '🌊 Backpressure',
  title: 'Backpressure 3 · Code — hadd wali line, 37 line mein',
  badge: 'Line Lohaar',
  objectives: [
    'Bhari line ke chaaron jawab code mein kahan hain?',
    '"Chupchaap girana" aur "na bolna" mein code ka farak kitna hai?',
    'Code mein "ruk ja" hota kya hai — bhejne wala rukta kaise hai, aur use jagata kaun hai?',
    'Apne loop ko line ki raftaar par kaise chalate hain?',
  ],
  lesson: [
    `<h3>💻 Ek line ka code, aur uska bill</h3>
     <p>Line banana ek line ka kaam hai:</p>
     <pre>const line = [];
line.push(order);        // jo aaye, le lo</pre>
     <p>Level 1 ka crash inhi do line se chala tha. Slow motion mein in do line ka bill: <b>26 "confirm", 22 orders gayab</b>.</p>
     <p>Hadd wali line mein teen faisle aur likhne padte hain: <b>kitni jagah</b>, <b>bhari ho toh kya</b>, aur <b>ruke hue ko kaun jagayega</b>.</p>
     <p>Is level mein do file padhoge. Dono asli file hain, copy nahi. Slow motion ke saaton tareeke aur lab ka asli-raftaar wala tool isi class se chalte hain:</p>
     <pre>docker-labs/15-backpressure/lib/bounded-queue.js   ← hadd wali line (37 line)
docker-labs/15-backpressure/tools/mini.js          ← sabse chhota program jo use chalata hai (19 line)</pre>
     <p class="tip">👉 Pehle <code>bounded-queue.js</code>, wahi order #11 jo bhari line par aaya tha. Is baar dekhoge ki <b>kaunsi line</b> ne uska faisla kiya.</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/bounded-queue.js, line by line ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/bounded-queue.js — ek-ek line, ek-ek click',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Wahi order #11, bhari line par — chaaron jawab ke saath. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/15-backpressure/lib/bounded-queue.js',
        file: 'docker-labs/15-backpressure/lib/bounded-queue.js',
        from: 8,
        text: "class BoundedQueue {\n  constructor({ cap = Infinity, policy = 'block' } = {}) {\n    this.cap = cap;            // line mein kitni jagah\n    this.policy = policy;      // bhar gayi toh kya\n    this.items = [];           // line\n    this.dropped = 0;          // kitne kaam chupchaap gire\n    this.refused = 0;          // kitni baar bhejne wale ko \"na\" bola\n    this.waiting = [];         // ruke hue bhejne wale (unhe jagane wale functions)\n  }\n\n  get full() { return this.items.length >= this.cap; }\n\n  /* Bhejne wale ka darwaza — bina ruke. true = \"le liya\" · false = \"nahi liya\" */\n  offer(item) {\n    if (!this.full) { this.items.push(item); return true; }             // jagah hai → line mein\n    if (this.policy === 'drop-new') { this.dropped++; return true; }    // naya gira — par jawab \"le liya\"\n    if (this.policy === 'drop-oldest') {\n      this.items.shift(); this.dropped++;                               // sabse purana gira\n      this.items.push(item); return true;                               // naya andar — jawab \"le liya\"\n    }\n    this.refused++; return false;                                       // 'error' / 'block': sach bolo\n  }\n\n  /* Bhejne wale ka darwaza — ruk ke. Line bhari hai → yahin ruko jab tak jagah na bane */\n  async put(item) {\n    while (this.full) await new Promise(wake => this.waiting.push(wake));\n    this.items.push(item);\n  }\n\n  /* Kaam karne wale ka darwaza. Ek kaam nikla = ek jagah bani → ek ruke hue ko jagao */\n  take() {\n    const item = this.items.shift();\n    const wake = this.waiting.shift();\n    if (wake) wake();\n    return item;\n  }\n}",
      },
      vars: [
        { id: 'cfg', label: 'Line kaise bani' },
        { id: 'items', label: '<code>this.items</code> (line)' },
        { id: 'full', label: '<code>full</code>' },
        { id: 'ans', label: 'Bhejne wale ko jawab' },
        { id: 'count', label: '<code>dropped</code> · <code>refused</code>' },
        { id: 'waiting', label: '<code>this.waiting</code> (ruke hue)' },
      ],
      steps: [
        {
          clock: 'file ke hisse',
          line: [9, 18, 21, 32, 38],
          say: `Class mein paanch cheezein hain:<br><br>
            <b>Line 9–16, constructor:</b> line kya-kya yaad rakhti hai.<br>
            <b>Line 18, <code>full</code>:</b> "bhari hoon ya nahi".<br>
            <b>Line 21–29, <code>offer()</code>:</b> bhejne wale ka darwaza — bina ruke.<br>
            <b>Line 32–35, <code>put()</code>:</b> bhejne wale ka darwaza — ruk ke.<br>
            <b>Line 38–43, <code>take()</code>:</b> kaam karne wale ka darwaza.`,
          vars: { cfg: '—', items: cells([], 8), full: '—', ans: '—', count: '—', waiting: '—' },
        },
        {
          clock: 'line banti hai',
          line: '9-16',
          say: `<code>new BoundedQueue({ cap: 8, policy: 'error' })</code><br><br>
            Line 10: jagah <b>8</b>. Line 11: bhari ho toh <b>"na" bolo</b>. Line 12: line khaali.<br>
            Line 13–14: do ginti. <code>dropped</code> = kitne kaam chupchaap gire. <code>refused</code> = kitni baar bhejne wale ko "na" bola.<br>
            Line 15: ruke hue bhejne wale. Abhi koi nahi.`,
          vars: { cfg: 'cap 8 · policy \'error\'', items: cells([], 8), full: 'false (0 ≥ 8? nahi)', ans: '—', count: 'dropped 0 · refused 0', waiting: '[ ] khaali' },
        },
        {
          clock: 'offer(#1) … offer(#10)',
          line: [22, 18],
          say: `order-service <code>offer(#1)</code> bulati hai. Line 22 poochhti hai: <code>full</code>? Jawab line 18 deti hai: kya line mein <code>cap</code> jitne ya usse zyada orders hain? 0 ≥ 8 — nahi. Order line mein, <code>return true</code>.<br><br>
            #2 se #10 tak yahi hota hai. (Beech mein dispatch-service #1 aur #2 utha chuki hai.) #10 ke baad line mein <b>8</b>: ab <code>full</code> true hai.`,
          vars: { items: cells(seq(3, 10), 8), full: '<b>true</b> (8 ≥ 8)', ans: 'true — "le liya" (10 baar)' },
        },
        {
          clock: 'offer(#11) · policy \'error\'',
          line: [22, 23, 24, 28],
          say: `#11 aaya. Line 22: <code>full</code> hai → andar nahi jaate.<br>
            Line 23: policy <code>'drop-new'</code>? Nahi.<br>
            Line 24: policy <code>'drop-oldest'</code>? Nahi.<br>
            Line 28: <code>refused++</code>, aur <code>return false</code>.<br><br>
            order-service ko <b>false</b> mila. order-service customer ko bolti hai: "abhi nahi".`,
          vars: { ans: '<b>false</b> — "nahi liya"', count: 'dropped 0 · refused <b>1</b>' },
          ask: {
            q: 'Wahi <code>offer(#11)</code>, par policy <code>\'drop-new\'</code> hoti. Kaunsi line chalti, aur order-service ko kya milta?',
            choices: [
              'Line 23: <code>dropped++</code> aur <code>return true</code> — order-service ko "le liya" milta, jabki #11 gir chuka hota',
              'Line 28: <code>return false</code> — order-service ko pata chal jaata',
              'Line 22: #11 line mein chala jaata',
              'Line 25: line ka sabse purana order girta',
            ],
            answer: 0,
            hint: 'Line 23 ki shart dekho. Phir dekho ki wahi line kya lautati hai.',
            explain: 'Line 23 <code>true</code> lautati hai. Bhejne wale ko "le liya" aur "gira diya" mein koi farak nahi dikhta. "Chupchaap" ka matlab code mein yahi ek shabd hai: <code>true</code>.',
          },
        },
        {
          clock: 'offer(#11) · policy \'drop-new\'',
          line: 23,
          say: `Line 23: <code>dropped++</code>, <code>return true</code>. #11 kahin nahi gaya; order-service ko "le liya" mila.<br><br>
            Poore system mein is nuksaan ka <b>sirf ek nishaan</b> hai: <code>this.dropped</code>. Isliye jahan bhi kaam chupchaap girta ho, yeh ginti dashboard par honi hi chahiye.<br><br>
            Slow motion mein yeh ginti 16 tak gayi. Lab mein, 30 second mein: <b>2,16,740</b>.`,
          vars: { cfg: 'cap 8 · policy \'drop-new\'', ans: 'true — "le liya" (par #11 gir gaya)', count: 'dropped <b>1</b> · refused 0' },
        },
        {
          clock: 'offer(#11) · policy \'drop-oldest\'',
          line: '24-27',
          say: `Line 25: <code>items.shift()</code> — line ka sabse aage wala order (#3) nikal ke phenk diya. <code>dropped++</code>.<br>
            Line 26: #11 line ke peeche jud gaya. <code>return true</code>.<br><br>
            Line phir 8 ki hai: #4 se #11. Sabse purana gaya, sabse naya aaya.`,
          vars: { cfg: 'cap 8 · policy \'drop-oldest\'', items: cells(seq(4, 11), 8), ans: 'true — "le liya" (#3 gir gaya)', count: 'dropped <b>1</b> · refused 0' },
        },
        {
          clock: 'put(#11) · policy \'block\'',
          line: [32, 33],
          say: `Ab doosra darwaza. Bhejne wala likhta hai: <code>await line.put(#11)</code>.<br><br>
            Line 33: <code>full</code>? Haan. Toh ek naya <code>Promise</code> banta hai. Us Promise ko poora karne wala function — <code>wake</code> — <code>this.waiting</code> mein rakh diya jaata hai.<br><br>
            <code>await</code> par <code>put()</code> yahin ruk jaata hai. <code>put()</code> ke saath bhejne wala bhi ruk jaata hai, kyunki bhejne wale ne <code>put()</code> ko <code>await</code> kiya hai.`,
          vars: { cfg: 'cap 8 · policy \'block\'', items: cells(seq(3, 10), 8), ans: 'abhi koi jawab nahi — <b>ruka hua</b>', count: 'dropped 0 · refused 0', waiting: '[ wake ] — #11 ka' },
          ask: {
            q: '<code>put(#11)</code> line 33 ke <code>await</code> par ruka hai. Ise aage kaun badhayega?',
            choices: [
              '<code>take()</code> — jab kaam karne wala ek order nikaalega, line 40–41 <code>wake()</code> bula dengi',
              'Ek timer — 1 second baad apne aap',
              'Bhejne wala khud, dobara <code>put()</code> bula ke',
              'Koi nahi — yeh hamesha ruka rahega',
            ],
            answer: 0,
            hint: '<code>wake</code> function kahan rakha gaya hai? Us array ko class mein aur kaun padhta hai?',
            explain: '<code>this.waiting</code> ko sirf <code>take()</code> padhta hai (line 40). Jo jagah banata hai, wahi jagata hai.',
          },
        },
        {
          clock: 'take()',
          line: '38-42',
          say: `dispatch-service <code>take()</code> bulati hai.<br>
            Line 39: #3 line se nikla. Line mein ab 7.<br>
            Line 40: <code>waiting</code> se pehla <code>wake</code> nikla.<br>
            Line 41: <code>wake()</code> — #11 wala Promise poora ho gaya.<br>
            Line 42: #3 dispatch-service ko mila.`,
          vars: { items: cells(seq(4, 10), 8), full: 'false (7 ≥ 8? nahi)', waiting: '[ ] khaali — #11 jaag gaya' },
        },
        {
          clock: 'put(#11) jaagta hai',
          line: [33, 34],
          say: `<code>put(#11)</code> line 33 par wapas. <code>while</code> phir poochhta hai: <code>full</code>? Ab nahi.<br>
            Line 34: #11 line mein. <code>put()</code> poora, bhejne wale ka <code>await</code> khul gaya.<br><br>
            <b><code>while</code> kyun, <code>if</code> kyun nahi?</b> Jaagne aur chalne ke beech koi doosra bhejne wala wahi jagah le sakta hai. Isliye jaag ke dobara dekhna zaroori hai.`,
          vars: { items: cells(seq(4, 11), 8), full: '<b>true</b> (8 ≥ 8)', ans: '<code>put()</code> poora — bhejne wala aage badha' },
        },
        {
          clock: 'poori baat, ek line mein',
          line: 33,
          say: `Backpressure ka poora mechanism <b>line 33</b> hai.<br><br>
            "Ruk ja" koi message nahi hai. "Ruk ja" ek <b>Promise hai jo abhi poora nahi hua</b>. Bhejne wala <code>await</code> par khada hai; kaam karne wala <code>take()</code> se use chhodta hai.<br><br>
            Level 2 ki "16 ruke hue orders" wali samasya bhi isi line mein dikhti hai: <code>this.waiting</code> ek saadha array hai. <b>Us par koi hadd nahi.</b> 16 customers = <code>waiting</code> mein 16 function.`,
          vars: { waiting: 'slow motion: 16 tak gaya — is array par hadd nahi' },
        },
        {
          clock: 'cap na do toh?',
          line: [9, 18, 22],
          say: `Aakhri baat. <code>cap</code> na do toh line 9 use <code>Infinity</code> maan leti hai.<br><br>
            Tab line 18 ka <code>full</code> kabhi true nahi hota. Line 22 hamesha chalti hai. Line 23 se 28 kabhi nahi chalti.<br><br>
            Bina hadd ki line koi alag cheez nahi hai. Yahi class hai — bas <code>cap</code> ke bina. Level 1 ka crash isi se chala tha.`,
          vars: { cfg: 'cap <b>Infinity</b>', full: 'hamesha false', ans: 'hamesha true — "le liya"', count: 'dropped 0 · refused 0 — hamesha', waiting: '[ ] hamesha khaali' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> chaaron jawab ek hi jagah tay hote hain — jab line bhari ho aur naya kaam aaye. <b>Chupchaap girana</b> = <code>return true</code>. <b>"Na" bolna</b> = <code>return false</code>. <b>Rokna</b> = ek Promise jise <code>take()</code> poora karta hai.<br>Aur har jagah jahan kuch jama hota hai (<code>items</code>, <code>waiting</code>), poochho: is par hadd kya hai?',
    },

    /* ---------------- 2. tools/mini.js ---------------- */
    {
      type: 'dryrun',
      title: '🔧 tools/mini.js — apne loop ko line ki raftaar par chalana',
      goal: 'Sabse chhota chalta program: ek bhejne wala, ek kaam karne wala, beech mein 3 ki line. Dekho ki bhejne wala dheema <b>kaise</b> hota hai — jabki bhejne wale ke code mein kahin "dheere chalo" nahi likha.',
      code: {
        title: 'docker-labs/15-backpressure/tools/mini.js',
        file: 'docker-labs/15-backpressure/tools/mini.js',
        from: 7,
        text: "const line = new BoundedQueue({ cap: 3, policy: 'block' });\n\nasync function sender() {                    // bhejne wala: 8 kaam, jitni jaldi ho sake\n  for (let k = 1; k <= 8; k++) {\n    if (line.full) say(`#${k} dena hai · line bhari → RUKA`);\n    await line.put('#' + k);                 // line bhari ho toh yahin rukta hai — yahi backpressure hai\n    say(`#${k} line mein`);\n  }\n}\n\nasync function worker() {                    // kaam karne wala: ek kaam = 400 ms\n  await sleep(100);\n  for (let done = 0; done < 8; done++) {\n    while (!line.items.length) await sleep(10);\n    const job = line.take();                 // ek jagah bani → ruka hua bhejne wala jaagta hai\n    say(`${job} uthaya`);\n    await sleep(400);\n  }\n}",
      },
      vars: [
        { id: 'line', label: '<code>line.items</code> (jagah 3)' },
        { id: 'snd', label: '<code>sender()</code>' },
        { id: 'wrk', label: '<code>worker()</code>' },
      ],
      steps: [
        {
          clock: 'teen hisse',
          line: [7, 9, 17],
          say: `<b>Line 7:</b> line mein 3 ki jagah; bhari ho toh roko.<br>
            <b>Line 9–15, <code>sender()</code>:</b> 8 kaam, jitni jaldi ho sake.<br>
            <b>Line 17–25, <code>worker()</code>:</b> ek kaam uthao, 400 ms kaam karo, agla uthao.<br><br>
            Dhyaan do: <code>sender()</code> ke code mein kahin <code>sleep</code> nahi hai.`,
          vars: { line: cells([], 3), snd: 'shuru nahi hua', wrk: 'shuru nahi hua' },
        },
        {
          clock: '0.0 s',
          line: [10, 12, 13],
          say: '<code>sender()</code>: k = 1, 2, 3. Teeno baar line 12 ka <code>put()</code> turant laut-ta hai — line mein jagah hai. Line: <b>[#1 #2 #3]</b>. Bhari.',
          vars: { line: cells([1, 2, 3], 3), snd: '#1, #2, #3 de chuka' },
          ask: {
            q: 'Line ki teeno jagah bhar gayi. <code>sender()</code> ab k = 4 ke saath line 12 par pahunchega. Kya hoga?',
            choices: [
              '<code>put()</code> lautega hi nahi — <code>sender()</code> line 12 par khada rahega jab tak <code>worker()</code> ek kaam na uthaye',
              '<code>put()</code> error phenkega',
              '#4 chupchaap gir jaayega',
              '#4 line mein chala jaayega aur line 4 ki ho jaayegi',
            ],
            answer: 0,
            hint: 'Line 7 mein policy kya hai? Pichhle stage mein <code>put()</code> bhari line par kya karta tha?',
            explain: 'Policy <code>\'block\'</code> hai aur darwaza <code>put()</code> hai. Bhari line par <code>put()</code> ek adhoora Promise lautata hai; <code>await</code> wahin ruk jaata hai.',
          },
        },
        {
          clock: '0.0 s',
          line: [11, 12],
          say: 'k = 4. Line 11: line bhari hai → "RUKA" chhapta hai. Line 12: <code>await line.put(\'#4\')</code> — lautata nahi. <code>sender()</code> yahin khada hai, #4 haath mein liye.',
          vars: { snd: 'line 12 par <b>RUKA</b> (#4 haath mein)' },
        },
        {
          clock: '0.1 s',
          line: [21, 22, 12],
          say: '<code>worker()</code>: line 21 <code>take()</code> → #1 utha. Isi <code>take()</code> ne <code>sender()</code> ko jagaya: #4 line mein → <b>[#2 #3 #4]</b>.<br><br><code>sender()</code> turant k = 5 par: line phir bhari → <b>phir ruka</b>.',
          vars: { line: cells([2, 3, 4], 3), snd: 'line 12 par <b>RUKA</b> (#5 haath mein)', wrk: '#1 par kaam (400 ms)' },
        },
        {
          clock: '0.5 · 0.9 · 1.3 · 1.7 s',
          line: [23, 21, 12],
          say: '<code>worker()</code> line 23 par 400 ms kaam karta hai, phir line 21 par agla uthata hai. Har <code>take()</code> par <code>sender()</code> ka <b>ek</b> kaam andar jaata hai:<br><br>0.5 s par #5 · 0.9 s par #6 · 1.3 s par #7 · 1.7 s par #8.',
          vars: { line: cells([6, 7, 8], 3), snd: 'aathon de chuka (1.7 s par)', wrk: '#5 par kaam' },
          ask: {
            q: '<code>sender()</code> ke code mein kahin <code>sleep</code> nahi hai. Phir <code>sender()</code> har 400 ms par ek hi kaam kyun de paaya?',
            choices: [
              'Kyunki <code>await line.put()</code> tabhi laut-ta hai jab <code>worker()</code> ek kaam uthata hai — <code>worker()</code> ki raftaar <code>sender()</code> ki raftaar ban gayi',
              'Kyunki Node har loop ke beech 400 ms rukta hai',
              'Kyunki line ki hadd 3 hai, aur 3 kaam 400 ms mein hi aate hain',
              'Kyunki chhapne (<code>say</code>) mein 400 ms lagte hain',
            ],
            answer: 0,
            hint: 'Line 12 kab laut-ti hai? Uske lautne ke liye line 21 par kya hona zaroori hai?',
            explain: 'Raftaar <code>sender()</code> mein likhi nahi hai. Raftaar <code>worker()</code> se <code>await</code> ke raaste <code>sender()</code> tak pahunchti hai. Yahi backpressure hai.',
          },
        },
        {
          clock: '2.9 s',
          line: [19, 24],
          say: '<code>worker()</code> ne aathvan kaam 2.9 s par uthaya. Poore run mein line kabhi 3 se upar nahi gayi. Gire: <b>0</b>. "Na" bola: <b>0</b>.',
          vars: { line: cells([], 3), snd: 'poora', wrk: 'aathon utha liye' },
        },
        {
          clock: 'apne code mein',
          line: 12,
          say: `Apne code mein yahi dhoondo: koi loop jo kaam bana ke <b>kahin daalta hai</b> — array mein, queue mein, file mein, doosri service ko. Do sawaal poochho:
            <ol>
              <li>Us "kahin" par hadd hai?</li>
              <li>Daalne wali line <code>await</code> ke peeche hai?</li>
            </ol>
            Line 12 se <code>await</code> hata do toh loop rukega nahi: aathon <code>put()</code> ek saath chalenge, aur ruke hue <code>put()</code> <code>this.waiting</code> mein jama honge. Level 2 mein yahi hua tha jab har customer ka apna code ruka: 16 ruke hue.`,
          vars: { snd: '<code>await</code> ke bina: sab ek saath, <code>waiting</code> mein dher' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> code mein backpressure ka sabse chhota roop hai <code>await</code> — us cheez par jo tabhi poori hoti hai jab aage jagah bane. Loop ko dheema karna nahi padta; loop khud utna hi chalta hai jitna aage wala le sakta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — code mein dikhao',
    instructions: 'Interviewer jaanna chahta hai ki tumne yeh kabhi khud likha hai ya nahi. 🎤',
    questions: [
      {
        q: '"Async code mein producer ko consumer ki raftaar par kaise chalaoge — bina sleep ke?"',
        choices: [
          'Producer ka "daalna" ek Promise lautaye jo tabhi poora ho jab line mein jagah bane; producer use await kare. Jagah consumer ke "nikaalne" se banti hai, toh consumer ki raftaar await ke raaste producer tak pahunchti hai',
          'Producer mein setTimeout laga ke andaze se dheema karo',
          'Consumer ko zyada threads de do',
          'Line ko itna bada kar do ki kabhi na bhare',
        ],
        answer: 0,
        explain: 'Lab ka mini program: line 3 ki, worker 400 ms/kaam. Sender ne pehle 3 kaam ek saath diye, phir har 400 ms par ek — jabki sender mein koi sleep nahi. Line kabhi 3 se upar nahi gayi.',
      },
      {
        q: '"Tumhari bounded queue bhari hone par kaam gira deti hai. Tumhe kaise pata chalega ki kitna gir raha hai?"',
        choices: [
          'Girane wali line par ek ginti (dropped) badhao aur use metric / alert mein dikhao — chupchaap girane mein bhejne wale ko "le liya" hi milta hai, toh yeh ginti hi akela nishaan hai',
          'Pata chal hi jaayega — bhejne wale ko error milega',
          'Logs mein har gire hue kaam ki poori details likho',
          'Girne do, ginne ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Lab ke code mein drop-new wali line <code>dropped++</code> ke baad <code>return true</code> karti hai. Asli raftaar par 30 second mein 2,16,740 kaam gire — aur bhejne wale ko ek baar bhi pata nahi chala.',
      },
    ],
  },
  success: [
    'Bhari line ke chaaron jawab code ki line par ungli rakh ke dikha sakte ho',
    'Samjha sakte ho ki "ruk ja" code mein ek adhoora Promise hai, aur use take() poora karta hai',
    'Apne loop mein dhoondh sakte ho: kahan jama ho raha hai, us par hadd hai ya nahi, aur await hai ya nahi',
  ],
  cards: [
    { front: 'Code mein "chupchaap girana" aur "na bolna" ka farak?', back: 'Ek shabd. Chupchaap: <code>dropped++; return true</code> — bhejne wale ko "le liya". "Na": <code>refused++; return false</code>. Isliye chupchaap girane wali jagah par ginti (metric) zaroori hai.' },
    { front: 'Code mein "ruk ja" kya hai?', back: 'Ek Promise jo abhi poora nahi hua: <code>while (full) await new Promise(wake =&gt; waiting.push(wake))</code>. Kaam karne wale ka <code>take()</code> <code>wake()</code> bula ke use poora karta hai.' },
    { front: 'put() mein while kyun, if kyun nahi?', back: 'Jaagne aur chalne ke beech koi doosra bhejne wala wahi jagah le sakta hai. Jaag ke dobara dekhna zaroori hai.' },
    { front: 'Apne loop mein do sawaal?', back: '(1) Loop jahan kaam daalta hai, us par hadd hai? (2) Daalna <code>await</code> ke peeche hai? <code>await</code> ke bina ruke hue kaam <code>waiting</code> mein jama hote hain — us array par koi hadd nahi (slow motion: 16).' },
  ],
},
]);

})();
