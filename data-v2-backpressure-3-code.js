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
    `<h3>💻 Ek line ka code, aur code ka bill</h3>
     <p>Line banana ek line ka kaam hai:</p>
     <pre>const line = [];
line.push(order);        // jo aaye, le lo</pre>
     <p>Level 1 ka crash inhi do line se chala tha. Slow motion mein in do line ka bill: <b>26 "confirm", 22 orders gayab</b>.</p>
     <p>Hadd wali line mein teen faisle aur likhne padte hain: <b>kitni jagah</b>, <b>bhari ho toh kya</b>, aur <b>ruke hue ko kaun jagayega</b>.</p>
     <p>Is level mein do file padhoge. Dono asli file hain, copy nahi. Slow motion ke saaton tareeke aur lab ka asli-raftaar wala tool isi class se chalte hain:</p>
     <pre>docker-labs/15-backpressure/lib/bounded-queue.js   ← hadd wali line (37 line)
docker-labs/15-backpressure/tools/mini.js          ← sabse chhota program jo use chalata hai (19 line)</pre>
     <p class="tip">👉 Pehle <code>bounded-queue.js</code>, wahi order #11 jo bhari line par aaya tha. Is baar dekhoge ki <b>kaunsi line</b> ne girane ka faisla kiya.</p>`,
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
          say: `order-service <code>offer(#1)</code> bulati hai. Line 22 poochhti hai: <code>full</code>? Jawab line 18 deti hai: kya line mein <code>cap</code> jitne ya cap se zyada orders hain? 0 ≥ 8 — nahi. Order line mein, <code>return true</code>.<br><br>
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
              'Line 23: dropped++ aur return true — order-service ko "le liya" milta, jabki #11 gir chuka',
              'Line 28: refused++ aur return false — order-service ko pata chal jaata ki #11 nahi gaya',
              'Line 22: #11 line mein chala jaata — drop-new sirf tab chalti hai jab line khaali ho',
              'Line 25: line ka sabse purana order girta, aur #11 ko line ke aakhir mein jagah milti',
            ],
            answer: 0,
            hint: 'Line 23 ki shart dekho. Phir dekho ki wahi line kya lautati hai.',
            explain: 'Line 23 true lautati hai. Bhejne wale ko "le liya" aur "gira diya" mein koi farak nahi dikhta. Code mein "chupchaap" ka matlab bas ek shabd hai: true.',
            choiceExplanations: [
              'Line 23 true lautati hai. Bhejne wale ko "le liya" aur "gira diya" mein koi farak nahi dikhta. Code mein "chupchaap" ka matlab bas ek shabd hai: true.',
              'Line 28 tak code pahunchta hi nahi — line 23 ki shart sach hai aur return wahin ho jaata hai.',
              'Line 22 ki shart !this.full hai. Line bhari hai, toh #11 andar nahi jaata.',
              'Purana girana line 24–26 ka kaam hai, policy \'drop-oldest\' par. Yahan policy \'drop-new\' hai.',
            ],
          },
        },
        {
          clock: 'offer(#11) · policy \'drop-new\'',
          line: 23,
          say: `Line 23: <code>dropped++</code>, <code>return true</code>. #11 kahin nahi gaya; order-service ko "le liya" mila.<br><br>
            Poore system mein is nuksaan ka <b>sirf ek nishaan</b> hai: <code>this.dropped</code>. Isliye jahan bhi kaam chupchaap girta ho, gire hue kaam ki ginti dashboard par honi hi chahiye.<br><br>
            Slow motion mein gire orders ki ginti 16 tak gayi. Lab mein, 30 second mein: <b>2,16,740</b>.`,
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
            q: 'put(#11) line 33 ke await par ruka hai. Ruke hue put() ko aage kaun badhayega?',
            choices: [
              'take() — kaam karne wala ek order nikaalega, aur line 40–41 rakha hua wake() bula dengi',
              'Ek timer — line 33 ka Promise 1 second baad apne aap poora ho jaayega, put() aage badhega',
              'Bhejne wala khud — dobara put(#11) bulayega, aur naya put() pehle wale ko jaga dega',
              'Koi nahi — await par ruka put() hamesha ke liye ruka rahega, #11 kabhi line mein nahi jaayega',
            ],
            answer: 0,
            hint: '<code>wake</code> function kahan rakha gaya hai? Us array ko class mein aur kaun padhta hai?',
            explain: 'this.waiting ko sirf take() padhta hai (line 40). Jagah banane wala hi jagata hai: ek order nikla, ek jagah bani, ek ruka hua put() jaaga.',
            choiceExplanations: [
              'this.waiting ko sirf take() padhta hai (line 40). Jagah banane wala hi jagata hai: ek order nikla, ek jagah bani, ek ruka hua put() jaaga.',
              'Line 33 mein koi timer nahi. Promise tabhi poora hota hai jab koi wake() bulaye.',
              'Dobara put() bulane se #11 do baar line mein jaayega. Ruke hue put() ko take() jagata hai.',
              'take() har baar this.waiting se ek wake() nikaal ke bulata hai (line 40–41). Ruka put() jaagega.',
            ],
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
            Bina hadd ki line koi alag cheez nahi hai. Yahi class hai — bas <code>cap</code> ke bina. Level 1 ka crash bina hadd ki line se chala tha.`,
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
              'put() ka Promise adhoora rahega — sender() line 12 ke await par rukega, jab tak worker() kaam na uthaye',
              'put() error phenkega — line bhari hai, toh sender() ko catch mein dobara koshish karni hogi',
              'put() turant lautega aur #4 chupchaap gir jaayega — sender() ko pata bhi nahi chalega',
              '#4 line mein chala jaayega aur line 4 ki ho jaayegi — put() bhari line mein bhi jodta hai',
            ],
            answer: 0,
            hint: 'Line 7 mein policy kya hai? Pichhle stage mein <code>put()</code> bhari line par kya karta tha?',
            explain: 'async put() turant ek Promise lautata hai. Line bhari ho toh Promise abhi poora nahi hota, aur sender() await par ruk jaata hai. worker() chalta rehta hai aur take() se jagah banata hai — tab Promise poora hota hai.',
            choiceExplanations: [
              'async put() turant ek Promise lautata hai. Line bhari ho toh Promise abhi poora nahi hota, aur sender() await par ruk jaata hai. worker() chalta rehta hai aur take() se jagah banata hai — tab Promise poora hota hai.',
              'put() mein koi throw nahi. Bhari line par put() ka Promise line 33 ke await par atka rehta hai.',
              'Chupchaap girana offer() ki \'drop-new\' policy hai. put() kuch nahi girata — rukta hai.',
              'Line 33 ka while tab tak chalta hai jab tak line bhari hai. Jagah bane bina push nahi hota.',
            ],
          },
        },
        {
          clock: '0.0 s',
          line: [11, 12],
          say: 'k = 4. Line 11: line bhari hai → "RUKA" chhapta hai. Line 12: <code>await line.put(\'#4\')</code> — put() ka Promise abhi poora nahi hua, toh await yahin rukta hai. <code>sender()</code> yahin khada hai, #4 haath mein liye.',
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
              'put() ka Promise tabhi poora hota jab worker() kaam uthaye — worker() ki raftaar sender() ki bani',
              'Node har for loop ke beech apne aap 400 ms rukta hai, taaki CPU par zyada bojh na pade',
              'Line ki hadd 3 hai — hadd 3 hone par line har 400 ms mein ek hi kaam andar aane deti hai',
              'say() chhapne mein 400 ms lagte hain — har kaam ke baad chhapai sender() ko dheema karti hai',
            ],
            answer: 0,
            hint: 'Line 12 kab laut-ti hai? Line 12 ke lautne ke liye line 21 par kya hona zaroori hai?',
            explain: 'Raftaar sender() mein likhi nahi hai. Raftaar worker() se await ke raaste sender() tak pahunchti hai. Raftaar ka await ke raaste peeche jaana hi backpressure hai.',
            choiceExplanations: [
              'Raftaar sender() mein likhi nahi hai. Raftaar worker() se await ke raaste sender() tak pahunchti hai. Raftaar ka await ke raaste peeche jaana hi backpressure hai.',
              'Node mein aisa koi apne aap ka intezaar nahi. 400 ms worker() ki line 23 mein likha hai.',
              '3 jagah ki ginti hai, waqt nahi. Har 400 ms par jagah isliye banti hai kyunki worker() 400 ms kaam karta hai.',
              'Is demo ka 400 ms intezaar worker() ke sleep(400) se aata hai. say() mein koi timer nahi — say() bas console.log() hai.',
            ],
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
    instructions: 'Interviewer jaanna chahta hai ki tumne bounded queue kabhi khud likhi hai ya nahi. 🎤',
    questions: [
      {
        q: '"Async code mein producer ko consumer ki raftaar par kaise chalaoge — bina sleep ke?"',
        choices: [
          'Producer har kaam await line.put() se daale; put() ka Promise jagah banne par hi poora ho',
          'Producer mein setTimeout laga do — consumer ki raftaar ka andaaza laga ke utna ruko',
          'Consumer ko zyada threads de do — consumer itna tez ho jaaye ki producer ko rokna na pade',
          'Line ko itna bada kar do ki kabhi na bhare — tab producer ko rokne ki zaroorat hi nahi',
        ],
        answer: 0,
        explain: 'Jagah consumer ke "nikaalne" se banti hai, toh consumer ki raftaar await ke raaste producer tak pahunchti hai. Lab ka mini program: line 3 ki, worker 400 ms/kaam. Sender ne pehle 3 kaam ek saath diye, phir har 400 ms par ek — jabki sender mein koi sleep nahi. Line kabhi 3 se upar nahi gayi.',
        choiceExplanations: [
          'Jagah consumer ke "nikaalne" se banti hai, toh consumer ki raftaar await ke raaste producer tak pahunchti hai. Lab ka mini program: line 3 ki, worker 400 ms/kaam. Sender ne pehle 3 kaam ek saath diye, phir har 400 ms par ek — jabki sender mein koi sleep nahi. Line kabhi 3 se upar nahi gayi.',
          'Andaaza consumer ki badalti raftaar ke saath nahi badalta. Consumer dheema hua toh line phir badhegi.',
          'Zyada threads raftaar badha sakte hain, par producer ko koi signal nahi milta. Farak bacha toh line phir badhegi.',
          'Lagataar farak mein har line bharti hai. Badi line sirf crash ko der se laati hai.',
        ],
      },
      {
        q: '"Tumhari bounded queue bhari hone par kaam gira deti hai — 30 second mein 2,16,740. Lagataar aur kam kharche mein kaise pata chalega ki kitna gir raha hai?"',
        choices: [
          'dropped++ ki ginti ko metric aur alert banao — bhejne wale ko toh "le liya" hi milta hai',
          'Bhejne wale ko error milega — gire kaam ki ginti bhejne wale ke error logs se mil jaayegi',
          'Har gire hue kaam ki poori details log mein likho — logs gin ke pata chalega kitne gire',
          'Line ki lambai dekho — lambai ek jagah ruki rahe toh samjho kuch nahi gir raha',
        ],
        answer: 0,
        explain: 'Lab ke code mein drop-new wali line dropped++ ke baad return true karti hai. Asli raftaar par 30 second mein 2,16,740 kaam gire — aur bhejne wale ko ek baar bhi pata nahi chala. Is bade volume mein dropped counter ko metric aur alert banana seedha aur sasta tareeka hai.',
        choiceExplanations: [
          'Lab ke code mein drop-new wali line dropped++ ke baad return true karti hai. Asli raftaar par 30 second mein 2,16,740 kaam gire — aur bhejne wale ko ek baar bhi pata nahi chala. Is bade volume mein dropped counter ko metric aur alert banana seedha aur sasta tareeka hai.',
          'Chupchaap girane mein bhejne wale ko true milta hai — koi error nahi. Error logs khaali rahenge.',
          'Har gire item ka log ginti de sakta hai, par 30 second mein 2,16,740 log lines bhaari hain — aur kaam mein user ka data bhi ho sakta hai. Kam kharche mein counter metric.',
          'Lab mein lambai 19,980 par tiki rahi, par 30 second ke run mein 2,16,740 kaam gire. Tiki hui lambai girna nahi dikhati.',
        ],
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
