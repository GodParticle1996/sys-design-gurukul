/* =====================================================================
   🛡️ Playlist · 1 Resilience — Circuit Breaker · level 2: KAISE
   Wahi 16 calls, par nazar breaker ke ANDAR: window, hadd, timer, trial.
   Har step docker-labs/38-circuit-breaker ke `node tools/mini.js` ke asli run se hai.
   ===================================================================== */
(function () {

const NODES = [
  { id: 'api', icon: '🧩', label: 'app-api', x: 115, y: 105 },
  { id: 'brk', icon: '🔌', label: 'breaker', x: 440, y: 105 },
  { id: 'recs', icon: '🎯', label: 'recs-service', x: 760, y: 105 },
];
const EDGES = [{ from: 'api', to: 'brk' }, { from: 'brk', to: 'recs' }];
const VIZ = { w: 890, h: 215 };
const GO = [{ from: 'api', to: 'brk', label: 'call', tone: 'ok' }, { from: 'brk', to: 'recs', label: '/recs', tone: 'ok' }];
const HANG = [{ from: 'api', to: 'brk', label: 'call', tone: 'acc' }, { from: 'brk', to: 'recs', label: '/recs', tone: 'slow', stuck: true }];
const BLOCKED = [{ from: 'api', to: 'brk', label: 'call', tone: 'acc' }, { from: 'brk', to: 'api', label: 'cache', tone: 'ok', back: true }];
const TRIAL_HANG = [{ from: 'api', to: 'brk', label: 'call', tone: 'acc' }, { from: 'brk', to: 'recs', label: 'trial', tone: 'slow', stuck: true }];
const TRIAL_OK = [{ from: 'api', to: 'brk', label: 'call', tone: 'ok' }, { from: 'brk', to: 'recs', label: 'trial', tone: 'ok' }];

VISUALS['cb-kaise'] = {
  t: 'Breaker beech mein khada hai: har call se pehle "jaane doon?", har call ke baad "kaisa raha?"',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { api: { tone: 'ok', badge: 'workers khaali' }, brk: { tone: 'bad', badge: 'OPEN · 1.8 s baaki' }, recs: { tone: 'bad', badge: 'latki hai' } },
    flows: BLOCKED,
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'cb-kaise',
  icon: '🔬',
  group: '🔌 Circuit Breaker',
  title: 'Breaker 2 · Kaise — breaker ke andar har call par kya badalta hai',
  badge: 'Window Vaigyanik',
  objectives: [
    'Breaker ko kaise <b>pata chalta hai</b> ki service bimaar hai?',
    'Do calls fail hui — breaker abhi kyun nahi khula?',
    'OPEN ke dauraan aayi request ka kya hota hai, aur kitni der mein?',
    'Service theek ho gayi — breaker ko yeh khabar kaun deta hai?',
  ],
  lesson: [
    `<h3>🔬 Idea mil gaya. Ab andar jhaanko.</h3>
     <p>Pichhle level ka idea: bimaar service ko poochhna band karo, thodi der baad ek baar poochh ke dekho.</p>
     <p>Par breaker koi insaan nahi hai. Breaker ko <b>number</b> chahiye: kitni failures par girna hai? Kitni der gira rehna hai? Wapas kaise uthna hai?</p>
     <p>Is level mein wahi 16 <code>/home</code> calls dobara chalengi. Is baar nazar app-api ke workers par nahi — breaker ke <b>andar</b> rahegi.</p>
     <p class="tip">⚙️ <b>Is level ke breaker ki 4 settings</b> (chhoti rakhi hain taaki har call dikhe):<br>
       pichhli <b>6</b> calls yaad rakhta hai · <b>50%</b> ya zyada fail → OPEN · OPEN <b>2 second</b> · phir <b>2 trial calls</b></p>`,
  ],
  stages: [
    /* ---------------- 1. andar ka dry run ---------------- */
    {
      type: 'dryrun',
      title: '👣 Dry run — 16 calls, breaker ke andar se',
      goal: 'Har click = <b>ek ghatna</b> (ek call, ya timer). Us ghatna se breaker ke andar jo-jo badla, woh peele rang mein chamkega. Teen jagah pehle tumse poochha jaayega: "ab kya hoga?"',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'win', label: 'Window: pichhli 6 calls' },
        { id: 'rate', label: 'Kitni fail?' },
        { id: 'state', label: 'Breaker ka haal' },
        { id: 'timer', label: 'OPEN kab tak' },
        { id: 'trials', label: 'Trial calls' },
        { id: 'sent', label: 'Latki recs-service tak pahunchi calls' },
      ],
      steps: [
        {
          clock: '0.6 s',
          say: '<b>#1 se #4</b>: charon calls breaker se hokar recs-service tak gayi. Charon ka jawab ~24 ms mein aaya.<br><br>Breaker har call ka nateeja apne paas ek dabbe mein likh leta hai: <b>✓</b> = theek, <b>✗</b> = fail. In dabbon ki line ka naam <b>window</b> hai.',
          flows: GO,
          nodes: { brk: { tone: 'ok', badge: 'CLOSED' }, recs: { tone: 'ok', badge: 'theek' } },
          vars: { win: ['ok', 'ok', 'ok', 'ok'], rate: '4 mein se 0', state: 'CLOSED — calls ja rahi hain', timer: 'lagu nahi', trials: 'lagu nahi', sent: '0' },
        },
        {
          clock: '0.8 s',
          say: 'recs-service <b>latak</b> gayi (har call 5 s). Breaker ke andar kuch nahi badla.<br><br>Breaker recs-service ke andar nahi dekh sakta. Breaker sirf <b>nateeje</b> dekhta hai — aur abhi koi naya nateeja aaya nahi.',
          nodes: { recs: { tone: 'bad', badge: 'har call 5 s' } },
        },
        {
          clock: '1.3 s',
          say: '<b>#5</b> jaati hai. 300 ms mein jawab nahi → timeout → breaker likhta hai <b>✗</b>.<br><br>Window mein abhi 5 hi nateeje hain. Niyam: <b>6 nateeje hone se pehle koi faisla nahi.</b>',
          flows: HANG,
          vars: { win: ['ok', 'ok', 'ok', 'ok', 'bad'], rate: '5 mein se 1 — abhi faisla nahi (6 se kam nateeje)', sent: '1' },
        },
        {
          clock: '1.8 s',
          say: '<b>#6</b> bhi timeout. Window bhar gayi: 6 nateeje, 2 fail = <b>33%</b>.',
          flows: HANG,
          vars: { win: ['ok', 'ok', 'ok', 'ok', 'bad', 'bad'], rate: '6 mein se 2 = 33%', sent: '2' },
          ask: {
            q: 'Hadd 50% hai. Do calls lagataar fail hui hain. Breaker ab kya karega?',
            choices: [
              'Kuch nahi badlega — 33% hadd se kam hai, breaker CLOSED rahega',
              'OPEN ho jaayega — do baar lagataar fail ho gaya',
              'HALF-OPEN ho jaayega',
              'recs-service ko restart kar dega',
            ],
            answer: 0,
            hint: '"Kitni fail?" wali line dekho aur 50% se milao.',
            explain: 'Yeh breaker <b>lagataar</b> failures nahi ginta — window mein fail ka <b>hissa</b> ginta hai. 6 mein se 2 = 33% &lt; 50%. Ek-do blip par breaker nahi girna chahiye.',
          },
        },
        {
          clock: '2.3 s',
          say: '<b>#7</b> bhi timeout. Window mein 6 hi jagah hain: sabse purana ✓ bahar, naya ✗ andar.<br><br>6 mein se 3 fail = <b>50%</b>. Hadd chhu li → breaker <b>OPEN</b>. 2 second ka timer shuru: 4.3 s tak.',
          flows: HANG,
          nodes: { brk: { tone: 'bad', badge: 'OPEN' } },
          vars: { win: ['ok', 'ok', 'ok', 'bad', 'bad', 'bad'], rate: '6 mein se 3 = 50% → hadd chhu li', state: 'OPEN — calls ruki hain', timer: '4.3 s tak', sent: '3' },
        },
        {
          clock: '2.5 s',
          say: '<b>#8</b> aati hai. Breaker OPEN hai. (OPEN hote hi breaker ne window saaf kar di — purane nateeje ab kaam ke nahi.)',
          flows: [{ from: 'api', to: 'brk', label: 'call', tone: 'acc' }],
          vars: { win: 'khaali (OPEN hote hi saaf)', rate: 'lagu nahi' },
          ask: {
            q: '#8 ka kya hoga?',
            choices: [
              'recs-service tak jaayegi hi nahi — breaker turant mana karega aur user ko cache se jawab milega',
              'recs-service tak jaayegi aur 300 ms baad timeout hoga',
              'User ko error dikhega',
              'Line mein khadi rahegi jab tak breaker CLOSED na ho',
            ],
            answer: 0,
            hint: 'OPEN = taar kata hua. Kate hue taar mein current jaata hai?',
            explain: 'OPEN = <b>poochho hi mat</b>. Asli run mein #8 ko jawab <b>0 ms</b> mein mila (timeout wale raaste par 302 ms lagte). recs-service par koi naya bojh nahi.',
          },
        },
        {
          clock: '4.0 s',
          say: '<b>#9 aur #10</b> bhi roki gayi — dono ko 0 ms mein cache.<br><br>In 2 second mein recs-service par <b>ek bhi nayi call nahi</b> aayi. Bimaar service ko saans lene ka waqt mila. Timer mein 0.3 s baaki.',
          flows: BLOCKED,
          vars: { timer: '4.3 s tak (0.3 s baaki)' },
        },
        {
          clock: '4.5 s',
          say: 'Timer poora. <b>#11</b> aati hai. Breaker #11 ko rokta nahi — #11 ko <b>trial call</b> bana ke bhejta hai. Naya haal: <b>HALF-OPEN</b>.',
          flows: TRIAL_HANG,
          nodes: { brk: { tone: 'slow', badge: 'HALF-OPEN' } },
          vars: { state: 'HALF-OPEN — sirf trial calls', timer: 'poora', trials: '2 mein se 0 safal', sent: '4' },
          ask: {
            q: 'recs-service abhi bhi latki hai: #11 par 300 ms mein jawab nahi aaya. Ab?',
            choices: [
              'Breaker phir OPEN, aur 2 second ka timer dobara shuru',
              'Breaker CLOSED — ek trial toh bhej di',
              'Breaker HALF-OPEN hi rahega aur agli 5 calls bhi bhejega',
              'Breaker hamesha ke liye OPEN ho jaayega',
            ],
            answer: 0,
            hint: 'MCB uthaya, geyser abhi bhi kharab. MCB kya karta hai?',
            explain: 'Ek bhi trial fail → phir OPEN. Is jaanch ki keemat: sirf <b>ek</b> call ne 303 ms khoye — poora traffic nahi.',
          },
        },
        {
          clock: '4.8 s',
          say: 'Trial fail → breaker <b>phir OPEN</b>, ab 6.8 s tak. (5.0 s par #12 aayi: roki gayi, 0 ms mein cache.)',
          flows: BLOCKED,
          nodes: { brk: { tone: 'bad', badge: 'OPEN' } },
          vars: { state: 'OPEN — calls ruki hain', timer: '6.8 s tak', trials: 'lagu nahi' },
        },
        {
          clock: '5.6 s',
          say: 'recs-service <b>theek ho gayi</b>. Breaker ko yeh khabar nahi mili.<br><br>Breaker OPEN hai, isliye koi call ja hi nahi rahi — aur khabar sirf call ke nateeje se aati hai.',
          nodes: { recs: { tone: 'ok', badge: 'theek' } },
        },
        {
          clock: '6.2 s',
          say: '<b>#13</b> aati hai. recs-service theek hai — phir bhi #13 <b>roki gayi</b> (timer mein 0.6 s baaki). User ko purana cache mila.<br><br>Yeh breaker ki <b>keemat</b> hai: service theek hone ke baad bhi OPEN ka bacha hua waqt users ko purana jawab milta hai. Isiliye OPEN ka waqt bahut lamba nahi rakhte.',
          flows: BLOCKED,
          vars: { timer: '6.8 s tak (0.6 s baaki)' },
        },
        {
          clock: '7.0 s',
          say: 'Timer poora. <b>#14</b> trial call ban ke jaati hai → 23 ms mein jawab ✓. Ek trial safal.<br><br>Breaker abhi bhi HALF-OPEN hai: is breaker ko <b>2</b> safal trials chahiye.',
          flows: TRIAL_OK,
          nodes: { brk: { tone: 'slow', badge: 'HALF-OPEN' } },
          vars: { state: 'HALF-OPEN — sirf trial calls', timer: 'poora', trials: '2 mein se 1 safal' },
        },
        {
          clock: '7.2 s',
          say: '<b>#15</b>: doosri trial bhi ✓ → 2 mein se 2 safal → breaker <b>CLOSED</b>. Window khaali se dobara shuru hoti hai.',
          flows: TRIAL_OK,
          nodes: { brk: { tone: 'ok', badge: 'CLOSED' } },
          vars: { state: 'CLOSED — calls ja rahi hain', timer: 'lagu nahi', trials: 'lagu nahi', win: 'khaali (naye sire se)', rate: 'lagu nahi' },
        },
        {
          clock: '7.5 s',
          say: '<b>#16</b>: normal call ✓. Sab wapas pehle jaisa.<br><br><b>Ginti:</b> latki recs-service tak sirf <b>4 calls</b> pahunchi (#5, #6, #7 aur trial #11). <b>5 calls</b> breaker ne rok li (#8, #9, #10, #12, #13). Sirf timeout hota toh 8 pahunchti.',
          flows: GO,
          vars: { win: ['ok'], rate: '1 mein se 0' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> breaker sirf do kaam karta hai. Call se <b>pehle</b> ek sawaal: "jaane doon?" Call ke <b>baad</b> ek note: "kaisa raha?"<br>Window, hadd, timer, trial — sab inhi do kaamon ka hisaab-kitaab hai. Agle level mein yahi do kaam code ke do function hain.',
    },

    /* ---------------- 2. kram pakka karo ---------------- */
    {
      type: 'order',
      title: 'Ek bimaar service ka poora safar',
      instructions: 'Abhi jo dekha, use sahi kram mein lagao.',
      steps: [
        { text: 'CLOSED: calls ja rahi hain, breaker har nateeja window mein likh raha hai', explain: 'Normal haal. Breaker beech mein khada hai par kisi ko rokta nahi.' },
        { text: 'Window mein fail ka hissa hadd tak pahunchta hai (aur kam se kam N nateeje ho chuke hain)', explain: 'Lab: ✓✓✓✗✗✗ = 3/6 = 50%. Isse pehle 2/6 = 33% par breaker nahi gira tha.' },
        { text: 'OPEN: calls dependency tak jaati hi nahi; user ko turant fallback', explain: 'Lab: roki gayi calls ko 0 ms mein cache mila. Bimaar service par koi naya bojh nahi.' },
        { text: 'OPEN ka timer poora hota hai', explain: 'Lab mein 2 second. Is dauraan dependency ko saans lene ka waqt milta hai.' },
        { text: 'HALF-OPEN: sirf kuch trial calls jaati hain, baaki ruki rehti hain', explain: 'MCB ko ek baar utha ke dekhna. Poora traffic nahi — sirf jaanch.' },
        { text: 'Saari trials safal → CLOSED · ek bhi trial fail → phir OPEN, timer dobara', explain: 'Lab: #11 trial fail → phir OPEN. #14 aur #15 safal → CLOSED.' },
      ],
    },

    /* ---------------- 3. asli services par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — wahi 16 calls, asli services par',
      project: '38-circuit-breaker',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao. <code>mini.js</code> breaker ke andar ka haal chhapta hai; <code>slowmo.js</code> teeno tareekon mein app-api ke workers ka.',
      why: '<code>lib/breaker.js</code> = poora breaker (ek chhoti class). <code>tools/mini.js</code> = usi class ke saath ek <code>getRecs()</code>. <code>services/b.js</code> = recs-service, jo latak sakti hai. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Dono services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex0-slowmo', expect: 'ex0-slowmo\n[B] :5172\n[A] :5171 → B http://localhost:5172' },
        { text: 'Doosre terminal mein: breaker ke andar ka haal, har call ke baad. Dry run ke har step se milao.', cmd: 'node tools/mini.js', expect: `breaker: pichhli 6 calls · kam se kam 6 calls · ≥ 50% fail → OPEN 2 s → 2 trial calls

  #   kab     nateeja                         der      breaker ke andar (is call ke baad)
  1   0.0 s  ✅ live                           23 ms   CLOSED · ✓ = 0/1 fail (6 calls se pehle faisla nahi)
  2   0.2 s  ✅ live                           24 ms   CLOSED · ✓✓ = 0/2 fail (6 calls se pehle faisla nahi)
  3   0.4 s  ✅ live                           26 ms   CLOSED · ✓✓✓ = 0/3 fail (6 calls se pehle faisla nahi)
  4   0.6 s  ✅ live                           24 ms   CLOSED · ✓✓✓✓ = 0/4 fail (6 calls se pehle faisla nahi)
       0.8 s  ⚠️  recs-service LATAK gayi (har /recs call 5 s)
  5   1.0 s  🟡 cache · recs ka jawab nahi   302 ms   CLOSED · ✓✓✓✓✗ = 1/5 fail (6 calls se pehle faisla nahi)
  6   1.5 s  🟡 cache · recs ka jawab nahi   302 ms   CLOSED · ✓✓✓✓✗✗ = 2/6 fail
  7   2.0 s  🟡 cache · recs ka jawab nahi   302 ms   OPEN ← ✓✓✓✗✗✗ = 3/6 fail (hadd 50%) · 2.0 s calls band
  8   2.5 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.8 s baaki
  9   3.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.3 s baaki
 10   4.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 0.3 s baaki
 11   4.5 s  🟡 cache · recs ka jawab nahi   303 ms   OPEN ← trial call fail · phir 2.0 s calls band
 12   5.0 s  🟡 cache · breaker ne roki        0 ms   OPEN · 1.8 s baaki
       5.6 s  ✅ recs-service theek ho gayi
 13   6.2 s  🟡 cache · breaker ne roki        0 ms   OPEN · 0.6 s baaki
 14   7.0 s  ✅ live                           23 ms   HALF_OPEN · trial 1/2 safal
 15   7.2 s  ✅ live                           30 ms   CLOSED ← 2/2 trial safal · window khaali
 16   7.5 s  ✅ live                           25 ms   CLOSED · ✓ = 0/1 fail (6 calls se pehle faisla nahi)` },
        { text: 'Ab teeno tareeke slow motion mein (kul ~40 s). Har tareeke ke ant ki "nateeja" lines dekho.', cmd: 'node tools/slowmo.js', expect: `A: 4 workers · recs-service (B) t=0.8 s se t=5.6 s tak latki (har /recs call 5 s) · breaker: pichhli 6 calls, ≥ 50% fail → OPEN 2 s → 2 trial calls

=== koi bachav nahi ===
   nateeja → Asha ka /profile (5 ms ka kaam): ❌ error (2000 ms intezaar ke baad)  phir  ✅ 9 ms
             /home: live 16 · cache 0 · error 0 · sabse lamba intezaar 5006 ms
             latki recs-service ko bheji calls: 4 · recs-service par ek saath latki (max): 4

=== sirf timeout (300 ms) ===
   nateeja → Asha ka /profile (5 ms ka kaam): ✅ 9 ms  phir  ✅ 8 ms
             /home: live 8 · cache 8 · error 0 · sabse lamba intezaar 305 ms
             latki recs-service ko bheji calls: 8 · recs-service par ek saath latki (max): 8

=== timeout + circuit breaker ===
   nateeja → Asha ka /profile (5 ms ka kaam): ✅ 7 ms  phir  ✅ 9 ms
             /home: live 7 · cache 9 · error 0 · sabse lamba intezaar 304 ms
             latki recs-service ko bheji calls: 4 · recs-service par ek saath latki (max): 4 · breaker ne roki: 5 · breaker khula: 2 baar` },
      ],
      observe: {
        q: 'mini.js mein #13 ke waqt (6.2 s) recs-service theek ho chuki thi. Phir bhi #13 ko cache kyun mila?',
        choices: [
          'Breaker OPEN tha aur timer mein 0.6 s baaki the. OPEN mein breaker koi call bhejta hi nahi, isliye breaker ko service ke theek hone ka pata hi nahi chala',
          'recs-service ne #13 ko reject kar diya',
          'Timeout 300 ms se kam tha',
          'Cache hamesha live se tez hota hai, isliye app-api cache hi deta hai',
        ],
        answer: 0,
        explain: 'OPEN ka waqt bimaar service ke liye aaraam hai, par theek ho chuki service ke liye bekaar ki deri. 7.0 s par trial call ne khabar laayi.',
      },
      lesson: 'Slow motion ki ginti: latki recs-service ko <b>4 calls</b> (breaker) banam <b>8</b> (sirf timeout). Asli raftaar par (ex1): <b>30</b> banam <b>300</b>.',
    },
  ],
  interview: {
    title: 'Interview Round — andar ka kaam',
    instructions: 'Yahan mechanism bolna hai: window, hadd, timer, trial. 🎤',
    questions: [
      {
        q: '"Breaker ko kaise pata chalta hai ki dependency bimaar hai?"',
        choices: [
          'Breaker har call ka nateeja ek window mein rakhta hai (pichhli N calls ya pichhle N second). Fail ka hissa hadd se upar gaya aur kam se kam M nateeje ho chuke hain → OPEN',
          'Dependency khud breaker ko message bhejti hai',
          'Breaker dependency ka CPU aur memory dekhta hai',
          'Breaker har second dependency ka health-check endpoint call karta hai',
        ],
        answer: 0,
        explain: 'Breaker sirf apni calls ke <b>nateeje</b> dekhta hai. Lab: 2/6 = 33% par CLOSED raha, 3/6 = 50% par OPEN hua.',
      },
      {
        q: '"Breaker OPEN hai aur dependency theek ho gayi. Users ko live data kab milega?"',
        choices: [
          'OPEN ka timer poora hone ke baad, jab trial calls safal ho jaayein. Tab tak fallback. Isiliye OPEN ka waqt chhota rakhte hain',
          'Turant — breaker ko dependency ke theek hone ka pata chal jaata hai',
          'Jab koi engineer breaker ko haath se reset kare',
          'Service restart ke baad hi',
        ],
        answer: 0,
        explain: 'Lab: service 5.6 s par theek hui, pehla live jawab 7.0 s par (pehli trial). 6.2 s wali request ko purana cache mila.',
      },
    ],
  },
  success: [
    'Window, hadd, timer aur trial — charon ka kaam bata sakte ho',
    'Kisi bhi call par bata sakte ho: jaayegi, rukegi, ya trial banegi',
    'Lab chala ke dry run ke har step ko asli output se mila sakte ho',
  ],
  cards: [
    { front: 'Breaker kis cheez par OPEN hota hai?', back: 'Window (pichhli N calls) mein fail ka <b>hissa</b> hadd tak pahunche, aur kam se kam M nateeje ho chuke hon. Lab: 2/6 = 33% → CLOSED; 3/6 = 50% → OPEN.' },
    { front: 'OPEN mein aayi request ka kya hota hai?', back: 'Dependency tak jaati hi nahi. Turant fallback. Lab: 0 ms (timeout wale raaste par 302 ms).' },
    { front: 'HALF-OPEN mein kya hota hai?', back: 'Sirf kuch trial calls jaati hain. Ek bhi fail → phir OPEN, timer dobara. Sab safal → CLOSED, window khaali se shuru.' },
    { front: 'Breaker ki keemat kya hai?', back: 'Dependency theek hone ke baad bhi OPEN ka bacha waqt users ko fallback milta hai. Lab: 5.6 s par theek, 7.0 s par pehla live jawab. OPEN ka waqt chhota rakho.' },
  ],
},
]);

})();
