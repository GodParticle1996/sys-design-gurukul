/* =====================================================================
   🛡️ Playlist · 1 Resilience — Noisy Neighbour · level 3: CODE
   Baari-baari wali line (lib/fair-queue.js) aur token wali baalti (lib/token-bucket.js), line by line.
   Code ke tukde ASLI files se hain (docker-labs/39-noisy-neighbor) — validate.js unhe byte-for-byte milata hai.
   Dono dry run `node tools/mini.js` ke asli output ke saath chalte hain.
   ===================================================================== */
(function () {

const HERO = [
  { id: 'push', icon: '📥', label: 'push(tenant)', x: 135, y: 105 },
  { id: 'q', icon: '🔁', label: 'FairQueue', x: 455, y: 105 },
  { id: 'next', icon: '🚪', label: 'next()', x: 760, y: 105 },
];
const line = (t, ids) => (ids.length ? ids.map(i => (t === 'A' ? 'busy:A#' : 'wait:B#') + i) : 'khaali');

VISUALS['nn-code'] = {
  t: 'push() kaam ko tenant ki apni line mein rakhta hai; next() baari ke kram se agla kaam nikaalta hai',
  html: SD.viz.svg(HERO, [{ from: 'push', to: 'q' }, { from: 'q', to: 'next' }], {
    nodes: { push: { tone: 'acc', badge: 'A ki line · B ki line' }, q: { tone: 'ok', badge: 'turn: [B, A]' }, next: { tone: 'ok', badge: 'B#1 — baari B ki' } },
    flows: [{ from: 'push', to: 'q', label: 'kaam', tone: 'acc' }, { from: 'q', to: 'next', label: 'B#1', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'nn-code',
  icon: '💻',
  group: '🔊 Noisy Neighbour',
  title: 'Noisy Neighbour 3 · Code — baari aur baalti, do chhoti files',
  badge: 'Baari Lohaar',
  objectives: [
    'Baari-baari wali line code mein kya-kya yaad rakhti hai?',
    'Kaunsi do line "baari" banati hain — aur khaali line wale tenant ko code kaise chhodta hai?',
    'Token wali baalti mein tokens "tapakte" kaise hain, jabki code mein koi timer nahi hai?',
    'Bade plan wale tenant ko do baari kaise dete hain?',
  ],
  lesson: [
    `<h3>💻 Ek line badli thi. Woh line kaunsi hai?</h3>
     <p>Pichhle level mein partner-api ka ek hi sawaal badla tha: <b>"agla kaam kiska?"</b> Is level mein woh jawab code mein dekhoge.</p>
     <p>Do asli files. Lab ki service, slow motion wala tool aur sabse chhota program — teeno yahi do files chalate hain:</p>
     <pre>docker-labs/39-noisy-neighbor/lib/fair-queue.js     ← baari-baari wali line (33 line)
docker-labs/39-noisy-neighbor/lib/token-bucket.js   ← token wali baalti (18 line)</pre>
     <p>Dono ke saath wahi chhota program chalega jo lab mein hai (<code>tools/mini.js</code>). Uska output yeh hai:</p>
     <pre>aane ka kram:     A#1  A#2  A#3  A#4  A#5  B#1  B#2
uthane ka kram:   A#1  B#1  A#2  B#2  A#3  A#4  A#5</pre>
     <p class="tip">👉 B#1 chhathe number par aaya aur doosre number par utha. Agle screen par dekho ki kaunsi line ne yeh kiya.</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/fair-queue.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/fair-queue.js — ek-ek line, ek-ek click',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Pehle saat kaam andar jaayenge (<code>push</code>), phir ek-ek karke bahar aayenge (<code>next</code>). Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/39-noisy-neighbor/lib/fair-queue.js',
        file: 'docker-labs/39-noisy-neighbor/lib/fair-queue.js',
        from: 4,
        text: "class FairQueue {\n  constructor({ perTenant = Infinity } = {}) {\n    this.perTenant = perTenant;   // ek tenant ki line mein kitni jagah\n    this.lines = new Map();       // tenant → us tenant ki line\n    this.turn = [];               // baari ka kram\n  }\n\n  /* Naya kaam, apne tenant ki line mein. false = us tenant ki line bhari hai (baaki tenants par koi asar nahi) */\n  push(tenant, job) {\n    if (!this.lines.has(tenant)) { this.lines.set(tenant, []); this.turn.push(tenant); }\n    const line = this.lines.get(tenant);\n    if (line.length >= this.perTenant) return false;\n    line.push(job);\n    return true;\n  }\n\n  /* Agla kaam kiska? Baari ke kram mein chalo; jiski line khaali hai use chhod do */\n  next() {\n    for (let i = 0; i < this.turn.length; i++) {\n      const tenant = this.turn.shift();\n      this.turn.push(tenant);                 // baari ho gayi → kram mein sabse peeche\n      const line = this.lines.get(tenant);\n      if (line.length) return line.shift();\n    }\n    return null;                              // sab lines khaali\n  }\n\n  get waiting() {\n    let n = 0;\n    for (const line of this.lines.values()) n += line.length;\n    return n;\n  }\n}",
      },
      vars: [
        { id: 'turn', label: '<code>this.turn</code> (baari ka kram)' },
        { id: 'la', label: 'A ki line' },
        { id: 'lb', label: 'B ki line' },
        { id: 'ret', label: '<code>next()</code> ne lautaya' },
        { id: 'out', label: 'Ab tak uthe kaam' },
      ],
      steps: [
        {
          clock: 'file ke hisse',
          line: [5, 12, 21],
          say: `Class mein teen cheezein kaam ki hain:<br><br>
            <b>Line 5–9, constructor:</b> line kya yaad rakhti hai. <code>lines</code> = har tenant ki apni line. <code>turn</code> = baari ka kram.<br>
            <b>Line 12–18, <code>push()</code>:</b> naya kaam, apne tenant ki line mein.<br>
            <b>Line 21–29, <code>next()</code>:</b> agla kaam kiska.`,
          vars: { turn: '[ ]', la: 'khaali', lb: 'khaali', ret: '—', out: '—' },
        },
        {
          clock: 'push(\'A\', \'A#1\') … A#5',
          line: [13, 14, 16, 17],
          say: `Line 13: A pehli baar aaya hai. A ki line banti hai, aur A ka naam baari ke kram mein jud jaata hai: <code>turn</code> = [A].<br>
            Line 14–16: A#1 A ki line mein. Line 17: <code>return true</code>.<br><br>
            A#2 se A#5 tak: line 13 ki shart ab jhoothi hai (A ki line pehle se hai). Kaam seedha A ki line mein.`,
          vars: { turn: '[ A ]', la: line('A', [1, 2, 3, 4, 5]) },
        },
        {
          clock: 'push(\'B\', \'B#1\') · B#2',
          line: [13, 15, 16],
          say: `B pehli baar aaya. Line 13: B ki line bani; <code>turn</code> = [A, B].<br>
            B#1 aur B#2 <b>B ki apni line</b> mein gaye. A ki line ko kisi ne chhua nahi.<br><br>
            Line 15 par dhyaan do: ek tenant ki line mein jagah ki hadd (<code>perTenant</code>). Line bhari ho toh <code>return false</code> — sirf <b>us tenant</b> ko "na". Lab ki service mein yeh hadd 100 hai.`,
          vars: { turn: '[ A, B ]', lb: line('B', [1, 2]) },
        },
        {
          clock: 'next() — pehli baar',
          line: [22, 23, 24, 25, 26],
          say: `Line 23: <code>turn.shift()</code> — kram ka pehla naam nikla: <b>A</b>.<br>
            Line 24: <code>turn.push(A)</code> — A ki baari ho gayi, A kram mein sabse peeche. <code>turn</code> = [B, A].<br>
            Line 25–26: A ki line mein kuch hai → A ki line ka pehla kaam, <b>A#1</b>, lautao.`,
          vars: { turn: '[ B, A ]', la: line('A', [2, 3, 4, 5]), ret: '<b>A#1</b>', out: 'A#1' },
          ask: {
            q: '<code>turn</code> ab [B, A] hai. A ki line mein 4 kaam hain, B ki line mein 2. A ke chaaron kaam B ke kaam se pehle aaye the. Agla <code>next()</code> kya lautayega?',
            choices: [
              '<b>B#1</b> — line 23 kram ka pehla naam (B) uthati hai. Line ki lambai ya aane ka samay code mein kahin dekha hi nahi jaata',
              'A#2 — A ke kaam pehle aaye the',
              'A#2 — A ki line lambi hai',
              'null — B ki baari abhi nahi aayi',
            ],
            answer: 0,
            hint: 'Line 23 kya uthati hai: sabse purana kaam, sabse lambi line, ya <code>turn</code> ka pehla naam?',
            explain: '<code>next()</code> mein "kaun pehle aaya" ka koi hisaab nahi hai. Woh hisaab sirf line 26 mein hai (<code>line.shift()</code>) — yaani ek tenant ki <b>apni</b> line ke andar.',
          },
        },
        {
          clock: 'next() — doosri, teesri, chauthi baar',
          line: [23, 24, 26],
          say: `Doosri baar: B nikla, peeche gaya → <b>B#1</b>. <code>turn</code> = [A, B].<br>
            Teesri baar: A → <b>A#2</b>. <code>turn</code> = [B, A].<br>
            Chauthi baar: B → <b>B#2</b>. <code>turn</code> = [A, B]. B ki line ab khaali.`,
          vars: { turn: '[ A, B ]', la: line('A', [3, 4, 5]), lb: 'khaali', ret: '<b>B#2</b>', out: 'A#1 · B#1 · A#2 · B#2' },
        },
        {
          clock: 'next() — paanchvi baar',
          line: [23, 24, 26],
          say: 'A → <b>A#3</b>. <code>turn</code> = [B, A]. Ab kram mein pehla naam B hai — aur B ki line khaali hai.',
          vars: { turn: '[ B, A ]', la: line('A', [4, 5]), ret: '<b>A#3</b>', out: 'A#1 · B#1 · A#2 · B#2 · A#3' },
          ask: {
            q: '<code>turn</code> = [B, A], aur B ki line khaali hai. Agla <code>next()</code> kya karega?',
            choices: [
              'B ko kram mein peeche bhej ke aage badhega, aur <b>A#4</b> lautayega — line 22 ka loop agle naam ko dekh leta hai',
              '<code>null</code> lautayega, kyunki baari B ki hai aur B ke paas kuch nahi',
              'Tab tak rukega jab tak B ka kaam na aaye',
              'Error phenkega',
            ],
            answer: 0,
            hint: 'Line 26 ki shart jhoothi ho toh <code>return</code> nahi chalta. Uske baad loop kahan jaata hai?',
            explain: 'Line 26: B ki line khaali → <code>return</code> nahi. Loop (line 22) dobara: ab A nikla → A#4. Khaali baari apne aap agle tenant ko mil gayi.',
          },
        },
        {
          clock: 'next() — chhathi, saatvi baar',
          line: [22, 23, 24, 26],
          say: `Chhathi baar: B nikla (khaali) → peeche. A nikla → <b>A#4</b>.<br>
            Saatvi baar: wahi → <b>A#5</b>.<br><br>
            Jab tak B ke paas kuch nahi, A lagataar chalta hai. Koi baari bekaar nahi gayi.`,
          vars: { turn: '[ B, A ]', la: 'khaali', ret: '<b>A#5</b>', out: 'A#1 · B#1 · A#2 · B#2 · A#3 · A#4 · A#5' },
        },
        {
          clock: 'next() — aathvi baar',
          line: [22, 28],
          say: 'Dono lines khaali. Loop poore kram se ghoom aaya; kisi ke paas kuch nahi. Line 28: <code>return null</code>.',
          vars: { ret: 'null — sab lines khaali' },
        },
        {
          clock: 'poori baat, do line mein',
          line: [23, 24],
          say: `<pre>aane ka kram:     A#1  A#2  A#3  A#4  A#5  B#1  B#2
uthane ka kram:   A#1  B#1  A#2  B#2  A#3  A#4  A#5</pre>
            Baari-baari ka poora mechanism <b>line 23 aur 24</b> hai: "kram ka pehla naam uthao, us naam ko peeche bhej do." Baaki sab hisaab-kitaab hai.<br><br>
            Lab ki service mein yahi do jagah lagta hai: nayi request aaye toh <code>push(tenant, kaam)</code>; khidki khaali ho toh <code>next()</code>.`,
          vars: { turn: '[ B, A ]' },
        },
        {
          clock: 'bade plan wale ko do baari?',
          line: [13, 24],
          say: `Is code mein har tenant ko <b>barabar</b> baari milti hai. Par maan lo Annapurna ne bada plan khareeda hai aur use Bholu Dhaba se dugna milna chahiye.<br><br>
            Tareeka seedha hai: baari ke kram mein Annapurna ka naam <b>do baar</b> daal do. Lab ka output (<code>turn</code> = [A, B, A]):
            <pre>A#1  B#1  A#2  A#3  B#2  A#4  A#5  B#3  A#6</pre>
            Pehle chakkar ke baad: A ke do, B ka ek, A ke do, B ka ek.`,
          vars: { turn: '[ A, B, A ] — A do baar', la: 'A#1 … A#6', lb: 'B#1 … B#3', ret: '—', out: 'A#1 · B#1 · A#2 · A#3 · B#2 · A#4 · A#5 · B#3 · A#6' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> baari-baari mein teen cheezein hain: har tenant ki <b>apni line</b>, ek <b>baari ka kram</b>, aur "jiski baari ho gayi woh peeche". Khaali line wale tenant ko loop chhod deta hai.<br>Baari mein wazan dena ho (kisi ko do baari) toh us tareeke ko <b>weighted round robin</b> kehte hain.',
    },

    /* ---------------- 2. lib/token-bucket.js ---------------- */
    {
      type: 'dryrun',
      title: '🪣 lib/token-bucket.js — tokens tapakte kaise hain?',
      goal: 'Pichhle level ki baalti, ab code mein. Wahi teen pal: 5 requests ek saath, 0.6 second baad 2, aur 5 second baad 4. Dekho ki code mein <b>timer kahan hai</b>.',
      code: {
        title: 'docker-labs/39-noisy-neighbor/lib/token-bucket.js',
        file: 'docker-labs/39-noisy-neighbor/lib/token-bucket.js',
        from: 4,
        text: "class TokenBucket {\n  constructor({ rate, burst = rate, now = Date.now }) {\n    this.rate = rate;            // har second kitne naye tokens\n    this.burst = burst;          // baalti mein zyada se zyada kitne\n    this.tokens = burst;         // shuru mein baalti bhari\n    this.now = now;\n    this.at = now();             // pichhli baar kab dekha tha\n  }\n\n  take() {\n    const t = this.now();\n    this.tokens = Math.min(this.burst, this.tokens + (t - this.at) / 1000 * this.rate);   // jitna samay beeta, utne tokens wapas\n    this.at = t;\n    if (this.tokens < 1) return false;   // baalti khaali → mana\n    this.tokens -= 1;                    // ek token kharch\n    return true;\n  }\n}",
      },
      vars: [
        { id: 'cfg', label: 'Baalti kaise bani' },
        { id: 'tokens', label: '<code>this.tokens</code>' },
        { id: 'at', label: '<code>this.at</code> (pichhli baar kab dekha)' },
        { id: 'ret', label: '<code>take()</code> ne lautaya' },
      ],
      steps: [
        {
          clock: 'baalti banti hai',
          line: '5-10',
          say: `<code>new TokenBucket({ rate: 2 })</code><br><br>
            Line 6: <code>rate</code> = 2 — har second 2 naye tokens.<br>
            Line 7: <code>burst</code> — baalti kitni badi. Nahi diya, toh line 5 <code>burst</code> ko <code>rate</code> jitna maan leti hai: 2.<br>
            Line 8: shuru mein baalti bhari: <code>tokens</code> = 2.<br>
            Line 10: <code>at</code> = abhi ka samay.`,
          vars: { cfg: 'rate 2 · burst 2', tokens: '2', at: '0.0 s', ret: '—' },
        },
        {
          clock: 'take() — 0.0 s, pehli do baar',
          line: [14, 15, 17, 18, 19],
          say: `Line 15: pichhli baar se ab tak kitne tokens wapas aaye? Samay nahi beeta → 0. <code>tokens</code> = 2.<br>
            Line 17: 2 &lt; 1? Nahi.<br>
            Line 18: ek token kharch → 1. Line 19: <code>return true</code>.<br><br>
            Doosri baar: 1 → 0. <code>true</code>.`,
          vars: { tokens: '0', ret: 'true · true' },
        },
        {
          clock: 'take() — 0.0 s, teesri baar',
          line: [15, 17],
          say: 'Line 15: <code>tokens</code> = 0. Line 17: 0 &lt; 1 → <code>return false</code>. Chauthi aur paanchvi baar bhi yahi.<br><br>Lab ka output: <code>true  true  false  false  false</code>',
          vars: { ret: 'false · false · false' },
        },
        {
          clock: 'take() — 0.6 s baad',
          line: 15,
          say: '0.6 second beet gaye. Is beech koi <code>take()</code> nahi chala — toh code ki koi line nahi chali. Ab ek request aayi.',
          vars: { at: '0.0 s (0.6 s pehle)' },
          ask: {
            q: 'Line 15: <code>Math.min(this.burst, this.tokens + (t - this.at) / 1000 * this.rate)</code>. Abhi <code>tokens</code> 0 hai, 0.6 second beete hain, <code>rate</code> 2 hai, <code>burst</code> 2. Line 15 ke baad <code>tokens</code> kitna hoga?',
            choices: [
              '1.2 — 0 + 0.6 × 2 = 1.2, aur 1.2 baalti (2) se chhota hai',
              '2 — baalti hamesha poori bhar jaati hai',
              '0 — beech mein code chala hi nahi, toh tokens bane hi nahi',
              '0.6 — jitne second beete',
            ],
            answer: 0,
            hint: 'Beeta samay (second mein) × rate. Phir us jod ko baalti ki hadd se milao.',
            explain: 'Tokens sach mein "tapakte" nahi. Jab koi <code>take()</code> bulata hai, <b>tab</b> line 15 hisaab lagati hai ki pichhli baar se ab tak kitne tapakne chahiye the.',
          },
        },
        {
          clock: 'take() — 0.6 s, do baar',
          line: [15, 16, 17, 18],
          say: `Pehli baar: line 15 → 1.2. Line 16: <code>at</code> = 0.6 s. Line 18 → 0.2. <code>true</code>.<br>
            Doosri baar: line 15 → 0.2 (samay nahi beeta). Line 17: 0.2 &lt; 1 → <code>false</code>.<br><br>
            Lab ka output: <code>true  false</code>`,
          vars: { tokens: '0.2', at: '0.6 s', ret: 'true · false' },
        },
        {
          clock: 'take() — 5 s aur ruk ke',
          line: 15,
          say: '5 second tak koi request nahi. Phir 4 requests ek saath.<br><br>Line 15: 0.2 + 5 × 2 = <b>10.2</b>. Par <code>Math.min(this.burst, …)</code>: baalti 2 ki hai → <code>tokens</code> = <b>2</b>.<br><br>Lab ka output: <code>true  true  false  false</code>',
          vars: { tokens: '2 → 0', at: '5.6 s', ret: 'true · true · false · false' },
          ask: {
            q: 'Line 15 se <code>Math.min(this.burst, …)</code> hata do. Tab 5 second shaant rehne ke baad tenant ek saath kitni requests andar bhej paata?',
            choices: [
              '10 — tokens jama hote rehte. Ghanta bhar shaant rehne wala tenant ek saath 7,200 bhej deta',
              '2 — burst hatane se kuch nahi badalta',
              '4 — jitni requests aayi',
              '0 — baalti toot jaati',
            ],
            answer: 0,
            hint: 'Line 15 ka jod kitna aaya tha, <code>Math.min</code> lagne se pehle?',
            explain: '<code>burst</code> hi woh cheez hai jo "ek saath kitna" ko rokti hai. <code>burst</code> ke bina hadd sirf ausat par lagti — aur shor karne wala tenant ausat theek rakh ke bhi ek pal mein sab kuch bhej sakta hai.',
          },
        },
        {
          clock: 'timer kahan hai?',
          line: [15, 16],
          say: `Is file mein koi timer nahi hai. Koi cheez har second nahi chalti.<br><br>
            Poori baalti <b>do number</b> hai: <code>tokens</code> aur <code>at</code>. Jab request aati hai, tab line 15 purana hisaab chukta karti hai aur line 16 samay note kar leti hai.<br><br>
            Isiliye lakhon tenants ki lakhon baaltiyan sasti padti hain: jo tenant kuch nahi bhej raha, uski baalti par koi kaam hi nahi hota.<br><br>
            Lab ki service mein har tenant ki apni baalti hai. <code>take()</code> ne <code>false</code> diya → <code>429</code>.`,
          vars: { cfg: 'do number: tokens · at' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> token wali baalti = do number aur ek formula. <b>rate</b> lambe samay ki raftaar tay karta hai, <b>burst</b> ek saath ki chhoot. Tokens tab gine jaate hain jab request aati hai — beech mein kuch nahi chalta.',
    },
  ],
  interview: {
    title: 'Interview Round — code mein dikhao',
    instructions: 'Interviewer jaanna chahta hai ki tum mechanism likh sakte ho, sirf naam nahi. 🎤',
    questions: [
      {
        q: '"Per-tenant fair queue kaise banaoge? Do line mein samjhao."',
        choices: [
          'Har tenant ki apni line, aur tenants ke naamon ka ek baari-kram. Agla kaam: kram ka pehla naam uthao, us naam ko peeche bhejo, us tenant ki line se ek kaam do; line khaali ho toh agle naam par jao. Ek tenant ki line par hadd bhi — bhari ho toh sirf usi tenant ko "na"',
          'Ek hi line rakho aur use tenant ke naam se sort karte raho',
          'Har request par random tenant chuno',
          'Sabse chhoti line wale tenant ko hamesha pehle karo',
        ],
        answer: 0,
        explain: 'Lab ka mini program: aane ka kram A#1…A#5, B#1, B#2. Uthane ka kram A#1, B#1, A#2, B#2, A#3, A#4, A#5. Kram mein A ka naam do baar daalne par: A#1, B#1, A#2, A#3, B#2, A#4, A#5, B#3, A#6.',
      },
      {
        q: '"10 lakh users par per-user rate limit lagani hai. Har user ke liye ek timer chalaoge jo har second tokens bhare?"',
        choices: [
          'Nahi. Har user ke do number rakhunga: tokens aur pichhli baar ka samay. Request aane par hisaab: beeta samay × rate, baalti ki hadd tak. Jo user kuch nahi bhej raha, us par koi kaam nahi hota',
          'Haan — 10 lakh timers theek hain',
          'Har second saare users ki ginti zero kar dunga',
          'Rate limit sirf top 100 users par lagaunga',
        ],
        answer: 0,
        explain: 'Lab ki token-bucket.js mein koi timer nahi: line 15 beeta samay × rate jodti hai aur baalti ki hadd par kaat deti hai. 5 second shaant rehne par bhi 2 hi tokens (baalti 2).',
      },
    ],
  },
  success: [
    'Baari-baari ki do line (uthao, peeche bhejo) code mein dikha sakte ho',
    'Samjha sakte ho ki khaali line wale tenant ki baari kaise aage badhti hai',
    'Token wali baalti ko do number aur ek formula mein likh sakte ho — bina timer ke',
  ],
  cards: [
    { front: 'Fair queue code mein kya yaad rakhti hai?', back: '<code>lines</code>: har tenant ki apni line. <code>turn</code>: baari ka kram. <code>perTenant</code>: ek tenant ki line ki hadd (bhari → sirf usi tenant ko "na").' },
    { front: 'Baari kaunsi do line banati hain?', back: '<code>const tenant = this.turn.shift(); this.turn.push(tenant);</code> — pehla naam uthao, us naam ko peeche bhejo. Us tenant ki line khaali ho toh loop agle naam par jaata hai.' },
    { front: 'Token bucket mein timer kahan hai?', back: 'Kahin nahi. Request aane par: <code>tokens = min(burst, tokens + beeta samay × rate)</code>. Baalti = do number (tokens, pichhla samay).' },
    { front: 'burst na ho toh?', back: 'Shaant tenant ke tokens jama hote rehte aur shaant tenant ek pal mein sab bhej deta. Lab: 5 s shaant, phir 4 requests → sirf 2 andar (baalti 2).' },
    { front: 'Bade plan wale tenant ko dugna hissa?', back: 'Baari ke kram mein us tenant ka naam do baar (weighted round robin). Lab: A#1 B#1 A#2 A#3 B#2 A#4 A#5 B#3 A#6.' },
  ],
},
]);

})();
