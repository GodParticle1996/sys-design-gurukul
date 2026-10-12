/* =====================================================================
   🛡️ Playlist · 1 Resilience — Circuit Breaker · level 3: CODE
   Level 2 mein dekha: breaker ke do kaam. Yahan wahi do kaam code ki ek-ek line ke roop mein,
   phir apni fetch ke aaspaas. (Asli library agle level mein: data-v2-breaker-4-library.js.)
   Code ke tukde ASLI files se hain (docker-labs/38-circuit-breaker) — validate.js unhe byte-for-byte milata hai.
   Har number us folder ke README / asli run se hai.
   ===================================================================== */
(function () {

/* hero: getRecs() pehle breaker se poochhta hai, phir recs-service ko call karta hai */
const HERO_NODES = [
  { id: 'mini', icon: '🧪', label: 'mini.js', x: 120, y: 105 },
  { id: 'brk', icon: '🔌', label: 'breaker.js', x: 440, y: 105 },
  { id: 'recs', icon: '🎯', label: 'recs-service', x: 760, y: 105 },
];
const HERO_EDGES = [{ from: 'mini', to: 'brk' }, { from: 'brk', to: 'recs' }];

VISUALS['cb-code'] = {
  t: 'Do file, jo lab sach mein chalata hai: mini.js pehle breaker.js se poochhta hai, phir recs-service ko call karta hai',
  html: SD.viz.svg(HERO_NODES, HERO_EDGES, {
    nodes: {
      mini: { tone: 'ok', badge: 'getRecs(): 9 line' },
      brk: { tone: 'acc', badge: 'allow() · record(ok)' },
      recs: { tone: 'idle', badge: '/recs' },
    },
    flows: [{ from: 'mini', to: 'brk', label: 'allow()?', tone: 'acc' }, { from: 'brk', to: 'recs', label: '/recs', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'cb-code',
  icon: '💻',
  group: '🔌 Circuit Breaker',
  title: 'Breaker 3 · Code — wahi breaker, 29 line ke code mein',
  badge: 'Line Pakadu',
  objectives: [
    'Breaker ke do kaam code mein kaise dikhte hain — <code>allow()</code> aur <code>record(ok)</code>?',
    'Apni fetch call ke aaspaas breaker <b>kahan</b> lagta hai?',
    'Breaker ke liye "fail" kya hai: timeout, 5xx, ya 404?',
  ],
  lesson: [
    `<h3>💻 Do kaam = do function</h3>
     <p>Pichhle level ka nichod: breaker sirf do kaam karta hai. Call se <b>pehle</b> poochhta hai: <i>"jaane doon?"</i> Call ke <b>baad</b> likhta hai: <i>"kaisa raha?"</i></p>
     <p>Code mein bhi wahi do kaam hain, aur wahi do <b>function</b> hain: <code>allow()</code> aur <code>record(ok)</code>. Window, hadd, timer, trial: sab inhi do ke andar hai.</p>
     <p>Is level mein do file padhoge. Dono asli file hain, copy nahi. Lab yahi do file chalata hai:</p>
     <pre>docker-labs/38-circuit-breaker/lib/breaker.js     ← breaker ka dimaag (29 line)
docker-labs/38-circuit-breaker/tools/mini.js      ← apni fetch ke aaspaas breaker (12 line)</pre>
     <p class="tip">👉 Pehle <code>breaker.js</code>, ek-ek line, ek-ek click. Wahi calls, wahi badlaav jo pichhle level mein dekhe. Ab dekhoge ki <b>kaunsi line</b> ne har badlaav kiya.</p>`,
  ],
  stages: [
    /* ---------------- 1. breaker.js, line by line ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/breaker.js — ek-ek line, ek-ek click',
      goal: 'Pichhle level mein breaker ke andar ke badlaav dekhe. Ab dekho code ki <b>kaunsi line</b> har badlaav karti hai. Har click par sirf wahi lines chamkengi jo chali. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/38-circuit-breaker/lib/breaker.js',
        file: 'docker-labs/38-circuit-breaker/lib/breaker.js',
        from: 14,
        text: `  allow() {
    if (this.state === 'OPEN') {
      if (this.now() < this.openUntil) return false;       // thanda hone ka waqt baaki hai: call roko
      this.state = 'HALF_OPEN';                            // waqt poora: ab trial calls
      this.trialsSent = 0; this.trialsOk = 0;
    }
    if (this.state === 'HALF_OPEN') {
      if (this.trialsSent >= this.trials) return false;    // trial calls ja chuki: baaki calls roko
      this.trialsSent++;
    }
    return true;                                           // CLOSED hai, ya trial call hai: jaane do
  }

  record(ok) {
    if (this.state === 'HALF_OPEN') {
      if (!ok) return this.open();                         // ek bhi trial fail → phir OPEN
      if (++this.trialsOk >= this.trials) this.close();    // saari trial calls safal → CLOSED
      return;
    }
    if (this.state === 'OPEN') return;                     // OPEN hone se pehle nikli purani call: mat gino
    this.window.push(ok);
    if (this.window.length > this.windowSize) this.window.shift();     // sirf pichhli N calls yaad rakho
    const fails = this.window.filter(x => !x).length;
    const enough = this.window.length >= this.minCalls;                // 2 mein se 1 fail bhi "50%" hai, par data nahi
    if (enough && fails / this.window.length >= this.failRate) this.open();
  }

  open()  { this.state = 'OPEN'; this.openUntil = this.now() + this.openMs; this.window = []; }
  close() { this.state = 'CLOSED'; this.window = []; }`,
      },
      vars: [
        { id: 'cfg', label: 'Settings (constructor se, kabhi nahi badalti)' },
        { id: 'state', label: '<code>this.state</code>' },
        { id: 'win', label: '<code>this.window</code>' },
        { id: 'calc', label: '<code>fails</code> aur <code>enough</code> (line 36–37)' },
        { id: 'until', label: '<code>this.openUntil</code>' },
        { id: 'trials', label: '<code>trialsSent</code> / <code>trialsOk</code>' },
        { id: 'ret', label: '<code>allow()</code> ne aakhri baar kya diya' },
      ],
      steps: [
        {
          clock: '#1–#4 ho chuki · 0.6 s',
          say: `Neeche jo 29 line hain, wahi breaker ka dimaag hai. Do kaam: <code>allow()</code> call se <b>pehle</b>, <code>record(ok)</code> call ke <b>baad</b>. <code>open()</code> aur <code>close()</code> sirf in dono ke madadgaar hain.<br><br>
            Upar ka constructor settings aur 5 khaane banata hai (table dekho). Settings wahi jo pichhle level mein thi: window 6, kam se kam 6, 50%, 2 second, 2 trials.<br><br>
            Call #1 se #4 ho chuki hain, chaaron ✓. Ab call <b>#5</b>. Line number asli file ke hain.`,
          vars: {
            cfg: 'windowSize 6 · minCalls 6 · failRate 0.5 · openMs 2000 · trials 2',
            state: 'CLOSED',
            win: ['ok', 'ok', 'ok', 'ok'],
            calc: 'abhi hisaab nahi hua',
            until: '0 (abhi lagu nahi)',
            trials: '0 / 0',
            ret: 'abhi allow() chali hi nahi',
          },
        },
        {
          clock: '#5 · 1.0 s · bhejne se pehle',
          line: [14, 15, 20, 24],
          say: `Call <b>#5</b> bhejne se pehle app-api poochhta hai: <code>breaker.allow()</code>.<br><br>
            Line 15: state OPEN hai? Nahi, CLOSED hai. Pehli <code>if</code> skip.<br>
            Line 20: state HALF_OPEN hai? Nahi. Doosri <code>if</code> bhi skip.<br>
            Line 24: <code>return true</code>.<br><br>
            CLOSED mein <code>allow()</code> kuch badalta nahi. Sirf "haan, jaane do" bolta hai.`,
          vars: { ret: 'true — call jaane do' },
        },
        {
          clock: '#5 · 1.3 s · 300 ms poore, jawab nahi',
          line: [27, 28, 33, 34, 35, 36, 37, 38],
          say: `Call #5 ka jawab 300 ms mein nahi aaya. app-api bolta hai: <code>breaker.record(false)</code>. Yaani <code>ok</code> = false.<br><br>
            Line 28, 33: state na HALF_OPEN, na OPEN. Dono skip.<br>
            Line 34: ✗ window mein push. Window mein ab 5 nateeje.<br>
            Line 35: 5 &gt; 6? Nahi. Kuch bahar nahi nikla.<br>
            Line 36: <code>fails</code> = 1.<br>
            Line 37: <code>enough</code> = 5 ≥ 6 = <b>false</b>.<br>
            Line 38: <code>enough &amp;&amp; …</code> false hai, isliye aage ka hisaab hua hi nahi. Koi faisla nahi.`,
          vars: {
            win: ['ok', 'ok', 'ok', 'ok', 'bad'],
            calc: 'fails = 1 · enough = false (5 nateeje, 6 chahiye)',
          },
          ask: {
            q: 'Maan lo line 37 delete ho gayi, aur line 38 se <code>enough &amp;&amp;</code> hat gaya. Breaker abhi shuru hua hai, window khaali hai, aur pehli hi call fail ho gayi. Kya hoga?',
            choices: [
              'Window mein ek hi nateeja ✗ hai: 1/1 = 100%, hadd 50% se upar. Breaker ek hi fail par OPEN ho jaayega',
              'Kuch nahi hoga — ek call se breaker kabhi nahi khulta',
              'Breaker 6 nateeje aane tak apne aap ruk jaayega',
              'Code crash ho jaayega — <code>enough</code> ke bina line 38 chalti hi nahi',
            ],
            answer: 0,
            hint: 'Line 36 aur 38 ka hisaab khud karo. Window mein 1 nateeja, 1 fail. fails / window.length kitna hua?',
            explain: '<code>enough</code> ka kaam hai: kam data par faisla mat karo. Uske bina 1/1 = 100% ≥ 50% → breaker ek akeli fail call par OPEN. Shuru mein aur CLOSED hone ke baad (window khaali) yahi hota. Isliye ek-do blip par breaker nahi girna chahiye.',
          },
        },
        {
          clock: '#6 · 1.8 s · phir timeout',
          line: [27, 28, 33, 34, 35, 36, 37, 38],
          say: `Call <b>#6</b> bhi timeout. <code>allow()</code> ne phir <code>true</code> diya (wahi raasta jo #5 par). Phir <code>record(false)</code>.<br><br>
            Window ab 6 nateeje: ✓✓✓✓✗✗. Line 36: <code>fails</code> = 2.<br>
            Line 37: <code>enough</code> = 6 ≥ 6 = <b>true</b>. Pehli baar faisla ho sakta hai.<br>
            Line 38: 2/6 = 0.33. 0.33, 0.5 se kam hai → <code>open()</code> nahi.`,
          vars: {
            win: ['ok', 'ok', 'ok', 'ok', 'bad', 'bad'],
            calc: 'fails = 2 · enough = true · 2/6 = 0.33, 0.5 se kam',
          },
        },
        {
          clock: '#7 · 2.3 s · teesri timeout',
          line: [27, 28, 33, 34, 35, 36, 37],
          say: `Call <b>#7</b> bhi timeout. <code>record(false)</code> chalta hai.<br><br>
            Line 34: ✗ push → window mein 7 nateeje.<br>
            Line 35: 7 &gt; 6 → <b>haan</b>. <code>shift()</code> sabse purana ✓ bahar nikalta hai. Window phir 6: ✓✓✓✗✗✗.<br>
            Line 36: <code>fails</code> = 3.<br>
            Line 37: <code>enough</code> = 6 ≥ 6 = true.<br><br>
            Ab line 38 chalne wali hai. Chalne se pehle batao.`,
          vars: {
            win: ['ok', 'ok', 'ok', 'bad', 'bad', 'bad'],
            calc: 'fails = 3 · enough = true · 3/6 = 0.5',
          },
          ask: {
            q: 'Line 38: <code>enough &amp;&amp; fails / this.window.length &gt;= this.failRate</code>. Yahan <code>fails</code> = 3, window.length = 6, <code>failRate</code> = 0.5. Line 38 kya karegi?',
            choices: [
              '3/6 = 0.5, aur 0.5 &gt;= 0.5 sach hai (<code>&gt;=</code> barabar par bhi sach hota hai) → <code>this.open()</code> chalegi, breaker OPEN',
              'Kuch nahi karegi — 0.5 hadd se zyada nahi, barabar hai',
              'Breaker HALF_OPEN ho jaayega',
              'Window saaf hogi par breaker CLOSED rahega',
            ],
            answer: 0,
            hint: 'Line 38 mein <code>&gt;=</code> hai, <code>&gt;</code> nahi. 0.5 aur 0.5 barabar hain. Barabar par kya hota hai?',
            explain: 'Hamari class mein <code>&gt;=</code> hai: hadd <b>chhute hi</b> OPEN. (Aage dekhoge: asli library mein yahi jagah <code>&gt;</code> ho sakta hai, aur tab wahi 50% OPEN nahi karta.)',
          },
        },
        {
          clock: '#7 · 2.3 s · line 38 chali',
          line: [38, 41],
          say: `Line 38 sach nikli → <code>this.open()</code>. Ab line 41:<br><br>
            <code>state</code> = OPEN.<br>
            <code>openUntil</code> = abhi + <code>openMs</code> = 2.3 s + 2000 ms = <b>4.3 s</b>. (<code>this.now()</code> = abhi ka waqt.)<br>
            <code>window</code> = [] — purane nateeje ab kaam ke nahi.<br><br>
            Call #7 ke saath breaker gir gaya.`,
          vars: {
            state: 'OPEN',
            win: 'khaali (line 41 ne saaf ki)',
            calc: 'lagu nahi',
            until: '4.3 s (= abhi 2.3 s + openMs 2000)',
          },
        },
        {
          clock: '#8 · 2.5 s · bhejne se pehle',
          line: [14, 15, 16],
          say: `Call <b>#8</b> aati hai. app-api phir poochhta hai: <code>allow()</code>.<br><br>
            Line 15: state OPEN hai? <b>Haan</b> → if ke andar.<br>
            Line 16: <code>now()</code> = 2.5 s, <code>openUntil</code> = 4.3 s. 2.5 &lt; 4.3 sach → <code>return false</code>.<br><br>
            <code>false</code> = "mat jaane do". Line 17 se 24 chale hi nahi. Call #8 recs-service tak gayi hi nahi. User ko cache 0 ms mein mila.<br>
            Call hui hi nahi, toh <code>record()</code> bhi nahi bulaya jaayega.`,
          vars: { ret: 'false — call roko' },
        },
        {
          clock: '#11 · 4.5 s · bhejne se pehle',
          line: [14, 15, 16, 17, 18, 20, 21, 22, 24],
          say: `#9 aur #10 bhi line 16 par ruk gayi thi. Ab <b>#11</b>, 4.5 s par. Timer poora.<br><br>
            Line 15: OPEN hai → andar.<br>
            Line 16: 4.5 &lt; 4.3? <b>Nahi</b> → <code>return false</code> skip.<br>
            Line 17: state = <b>HALF_OPEN</b>.<br>
            Line 18: <code>trialsSent</code> = 0, <code>trialsOk</code> = 0.<br>
            Line 20: HALF_OPEN hai → andar. Line 21: 0 ≥ 2? Nahi → skip.<br>
            Line 22: <code>trialsSent</code> = 1. Line 24: <code>return true</code>.<br><br>
            Call #11 <b>trial call</b> ban gayi. Line 21 ka kaam: HALF_OPEN mein sirf 2 calls (<code>trials</code>) ko jaane do, baaki roko.`,
          vars: { state: 'HALF_OPEN', trials: '1 / 0', ret: 'true — trial call' },
        },
        {
          clock: '#11 · 4.8 s · trial bhi timeout',
          line: [27, 28, 29, 41],
          say: `Trial call #11 ka bhi 300 ms mein jawab nahi aaya. <code>record(false)</code> chalta hai.<br><br>
            Line 28: HALF_OPEN hai → andar.<br>
            Line 29: <code>!ok</code> sach → <code>return this.open()</code>. Line 41 phir chalti hai.<br><br>
            <code>state</code> = OPEN. <code>openUntil</code> = 4.8 s + 2000 ms = <b>6.8 s</b>. <code>window</code> = [].<br><br>
            Ek bhi trial fail → phir OPEN. Baaki trial ka intezaar nahi.`,
          vars: {
            state: 'OPEN',
            until: '6.8 s (= abhi 4.8 s + openMs 2000)',
          },
        },
        {
          clock: '#14 · 7.0 s · trial safal',
          line: [27, 28, 29, 30, 31],
          say: `Beech mein #12 aur #13 roki gayi (#8 jaisa raasta). recs-service 5.6 s par theek ho gayi. 7.0 s par <b>#14</b> aayi: <code>allow()</code> ne OPEN → HALF_OPEN kiya (jaise #11 par) aur <code>trialsSent</code> = 1 gina.<br><br>
            #14 ka jawab 23 ms mein ✓. <code>record(true)</code>:<br>
            Line 28: HALF_OPEN → andar.<br>
            Line 29: <code>!ok</code> false → skip.<br>
            Line 30: <code>++this.trialsOk</code> = 1. 1 ≥ 2? Nahi → <code>close()</code> nahi.<br>
            Line 31: <code>return</code>.<br><br>
            Breaker abhi HALF_OPEN: 2 mein se 1 trial safal.`,
          vars: { state: 'HALF_OPEN', trials: '1 / 1' },
        },
        {
          clock: '#15 · 7.2 s · doosri trial safal',
          line: [27, 28, 29, 30, 42, 31],
          say: `Call <b>#15</b>: <code>allow()</code> ne doosri trial ginti (<code>trialsSent</code> = 2) aur <code>true</code> diya. Jawab 30 ms mein ✓. <code>record(true)</code>:<br><br>
            Line 30: <code>++this.trialsOk</code> = 2. 2 ≥ 2 sach → <code>this.close()</code>.<br>
            Line 42: <code>state</code> = CLOSED, <code>window</code> = [].<br><br>
            Breaker wapas CLOSED. Window khaali se shuru. Ab line 37 ka <code>enough</code> phir kaam aayega: pehle 6 nateeje, tab faisla.<br>
            (<code>openUntil</code> mein 6.8 s ab bhi likha hai. CLOSED mein koi use padhta nahi.)`,
          vars: {
            state: 'CLOSED',
            win: 'khaali (line 42 ne saaf ki)',
            trials: '2 / 2',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> breaker ke andar sirf do function chalte hain. <code>allow()</code> call se pehle poochhta hai: "jaane doon?" <code>record(ok)</code> call ke baad likhta hai: "kaisa raha?" Window, hadd, timer, trial: sab inhi ke andar, 29 line mein hai. Level 2 ke har badlaav ke peechhe ek line thi.<br><br>Ek line ka kaam in 16 calls mein dikha hi nahi: line 33 ka <code>return</code> (breaker OPEN ho aur kisi purani call ka nateeja aaye, toh use gino mat). Line 33 tab kaam aati hai jab ek saath kai calls chal rahi hon (jaise lab ki service A ke 20 workers) aur breaker beech mein OPEN ho jaaye.',
    },

    /* ---------------- 2. apni fetch ke aaspaas (mini.js) ---------------- */
    {
      type: 'dryrun',
      title: '🥪 Apni fetch ke aaspaas — tools/mini.js',
      goal: 'Breaker class tum padh chuke ho. Ab sawaal: apni <b>fetch</b> call ko breaker se kaise ghera jaaye? Sirf 12 line. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/38-circuit-breaker/tools/mini.js',
        file: 'docker-labs/38-circuit-breaker/tools/mini.js',
        from: 7,
        text: `const breaker = new Breaker({ windowSize: 6, minCalls: 6, failRate: 0.5, openMs: 2000, trials: 2 });
let lastGood = ['popular-1', 'popular-2'];              // fallback: pichhla accha jawab

async function getRecs() {
  if (!breaker.allow()) return { recs: lastGood, from: 'cache · breaker ne roki' };            // recs-service ko chhua bhi nahi
  let res = null;
  try { res = await fetch(B + '/recs', { signal: AbortSignal.timeout(300) }); } catch (e) {}   // timeout / connection toota → res = null
  const sick = !res || res.status >= 500;               // bimaari = jawab nahi aaya, ya 5xx. 4xx bimaari NAHI (galti client ki)
  breaker.record(!sick);
  if (res && res.ok) { lastGood = (await res.json()).recs; return { recs: lastGood, from: 'live' }; }
  return { recs: lastGood, from: 'cache · recs ka jawab nahi' };
}`,
      },
      vars: [
        { id: 'allow', label: '<code>breaker.allow()</code> (line 11)' },
        { id: 'res', label: '<code>res</code> (line 13)' },
        { id: 'sick', label: '<code>sick</code> (line 14)' },
        { id: 'rec', label: '<code>breaker.record(…)</code> ko mila (line 15)' },
        { id: 'out', label: '<code>getRecs()</code> ne lautaya' },
        { id: 'good', label: '<code>lastGood</code> (line 8)' },
      ],
      steps: [
        {
          clock: 'function ke bahar',
          line: [7, 8],
          say: `Function ke <b>bahar</b>, ek baar, do cheezein.<br><br>
            <b>Line 7:</b> breaker banta hai, level 2 ki settings ke saath (window 6, kam se kam 6, 50%, 2 second, 2 trials). Breaker function ke bahar isliye ki breaker ko calls ke beech <b>yaad rakhna</b> hai. Function ke andar banta, toh har call par naya khaali breaker banta.<br><br>
            <b>Line 8:</b> fallback. <code>lastGood</code> = pichhla accha jawab. Shuru mein 2 popular items.`,
          vars: {
            allow: 'abhi call nahi aayi',
            res: '—',
            sick: '—',
            rec: '—',
            out: '—',
            good: 'popular-1, popular-2',
          },
        },
        {
          clock: '#8 · 2.5 s · breaker OPEN',
          line: 11,
          say: `Call <b>#8</b>. <code>getRecs()</code> chalta hai. Pehli kaam ki line: <code>breaker.allow()</code>.<br><br>
            Breaker OPEN hai → <code>allow()</code> = false → <code>!false</code> = true → <code>return</code>.<br><br>
            Fallback turant mil gaya: <code>lastGood</code>. Line 12 se aage kuch chala hi nahi. <b>recs-service ko chhua bhi nahi.</b> 0 ms.`,
          vars: {
            allow: 'false (OPEN)',
            res: 'chala hi nahi',
            sick: 'chala hi nahi',
            rec: 'chala hi nahi — record() bulaya hi nahi',
            out: '<code>lastGood</code> · "cache · breaker ne roki" · 0 ms',
          },
          ask: {
            q: 'Maan lo line 11 delete ho gayi. Baaki code wahi. Breaker OPEN hai. Call #8 par kya hoga?',
            choices: [
              'Call recs-service tak jaayegi aur 300 ms intezaar karegi. Breaker sirf ginta rahega, rokega nahi — hum phir "sirf timeout" wali dikkat par',
              'Breaker call ko phir bhi rok dega, line 15 ki wajah se',
              'Code compile nahi hoga',
              'Call 0 ms mein cache se aa jaayegi, bas record nahi hoga',
            ],
            answer: 0,
            hint: '<code>allow()</code> ka jawab kaun padhta hai? Sirf line 11. Line 11 gayi toh jawab ka kya fayda?',
            explain: '<code>allow()</code> sirf jawab deta hai: true ya false. Roke kaun? Line 11, jo <code>allow()</code> ke jawab ko padh ke <code>return</code> karti hai. Line 11 ke bina breaker sirf gina karta hai, rokta nahi. Har call recs-service tak jaati hai aur 300 ms khoti hai. Level 1 ki "sirf timeout" wali dikkat wapas.',
          },
        },
        {
          clock: '#5 · 1.0 s · breaker CLOSED',
          line: [11, 12, 13],
          say: `Ab call <b>#5</b>, breaker CLOSED. Line 11: <code>allow()</code> = true → <code>return</code> skip.<br><br>
            Line 12: <code>res</code> = null. Abhi koi jawab nahi.<br>
            Line 13: asli <code>fetch</code>, sirf <b>300 ms</b> ke time limit ke saath (<code>AbortSignal.timeout(300)</code>). recs-service latki hai. 300 ms mein jawab nahi → fetch error phenkta hai → <code>catch</code> error ko pakad ke chhod deta hai → <code>res</code> null hi rehta hai.<br><br>
            Yaani <code>res</code> = null ka matlab: <b>timeout, ya connection toota</b>.`,
          vars: {
            allow: 'true (CLOSED)',
            res: 'null — 300 ms mein jawab nahi aaya',
            sick: '—',
            rec: '—',
            out: '—',
          },
        },
        {
          clock: '#5 · 1.3 s · "bimaar" kya hai?',
          line: 14,
          say: `Line 14 tay karti hai ki breaker ke liye <b>bimaar</b> kya hai:<br>
            <code>sick = !res || res.status &gt;= 500</code><br><br>
            • <code>!res</code> → jawab hi nahi aaya (timeout / connection toota).<br>
            • <code>res.status &gt;= 500</code> → recs-service ne 5xx error diya.<br><br>
            Call #5 mein <code>res</code> null → <code>sick</code> = true. (<code>!res</code> pehle likha hai. Null par <code>.status</code> padhte toh code hi crash ho jaata.)<br><br>
            4xx (jaise 404) bimaari <b>nahi</b> hai. 4xx ka matlab: maangne wale ne galat cheez maangi. recs-service theek hai.`,
          vars: { sick: 'true — res null hai' },
        },
        {
          clock: '#5 · 1.3 s · nateeja breaker ko batao',
          line: 15,
          say: `Line 15: <code>breaker.record(!sick)</code>.<br><br>
            <code>record</code> ko <b>ok</b> chahiye (theek = true), <code>sick</code> nahi. Isliye ulta: <code>!sick</code>.<br><br>
            Call #5 mein <code>sick</code> = true → <code>!sick</code> = false → <code>record(false)</code>. Breaker window mein ✗ likhta hai. Pichhle stage mein call #5 par yahi <code>record(false)</code> dekha tha.<br><br>
            Call se pehle <code>allow()</code>, call ke baad <code>record()</code>. Beech mein tumhari apni <code>fetch</code>.`,
          vars: { rec: 'false  (!sick = !true)' },
          ask: {
            q: 'Ab maan lo recs-service ne jawab diya, par status 404 (<code>res.status</code> = 404). Line 14 ke baad line 15 mein <code>breaker.record</code> ko kya milega?',
            choices: [
              '<code>true</code>. 404 par <code>sick</code> false hai (jawab aaya, aur 404 &lt; 500), toh <code>!sick</code> = true. Breaker ke liye recs-service theek hai',
              '<code>false</code> — koi bhi error status failure hai',
              'Kuch nahi — 404 par <code>record</code> bulaya hi nahi jaata',
              'Exception — 404 par code crash ho jaata hai',
            ],
            answer: 0,
            hint: 'Pehle line 14 chalao: jawab aaya toh <code>!res</code> kya hai? Aur 404 &gt;= 500?',
            explain: '<code>!res</code> = false (jawab aaya) aur 404 &gt;= 500 = false → <code>sick</code> = false → <code>record(true)</code>. 404 client ki galti hai, recs-service theek hai. Lab ex2: purane app ki 4xx requests ko failure ginne par naye app ki 90 theek requests mein se sirf 3 chali, 87 roki gayi, breaker 3 baar khula. Sirf 5xx + timeout ginne par 90/90 chali.',
          },
        },
        {
          clock: '#5 · 1.3 s · user ko kya mila',
          line: [16, 17],
          say: `Line 16: <code>res &amp;&amp; res.ok</code> — jawab aaya aur theek (200–299) hai? Call #5 mein <code>res</code> null → nahi → skip.<br><br>
            Line 17: fallback. User ko <code>lastGood</code> mila, "cache · recs ka jawab nahi". Call 302 ms mein khatam (300 ms intezaar + thoda).`,
          vars: { out: '<code>lastGood</code> · "cache · recs ka jawab nahi" · 302 ms' },
        },
        {
          clock: '#14 · 7.0 s · recs-service theek',
          line: [11, 12, 13, 14, 15, 16],
          say: `Doosri taraf: call <b>#14</b>. Breaker ne trial call ke roop mein jaane di (<code>allow()</code> = true). recs-service theek hai, 23 ms mein jawab aaya.<br><br>
            Line 14: <code>res</code> hai, status 200 → <code>sick</code> = false.<br>
            Line 15: <code>record(true)</code>.<br>
            Line 16: <code>res.ok</code> sach → <code>lastGood</code> = naye recs (<code>await res.json()</code>), aur user ko "live" jawab.<br><br>
            Yaani <code>lastGood</code> har live jawab ke saath <b>taaza</b> hota hai. Jitni der recs-service zinda hai, fallback taaza rehta hai.`,
          vars: {
            allow: 'true (trial call)',
            res: 'jawab aaya · status 200',
            sick: 'false',
            rec: 'true  (!sick = !false)',
            out: 'live · naye recs · 23 ms',
            good: 'naye recs (live jawab se)',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> apni <code>fetch</code> ko breaker se aise gheroge: <b>pehle</b> <code>allow()</code> (line 11) — false ho toh fallback aur bahar. <b>Phir</b> apni fetch (line 13). <b>Phir</b> tay karo bimaar kya hai (line 14) aur <code>record(!sick)</code> (line 15).<br>Teen cheezein tumhari zimmedari hain: kya bimaari ginni hai, time limit kitna, fallback kya. Breaker class ko in teeno ka pata nahi.',
    },

  ],
  interview: {
    title: 'Interview Round — code',
    instructions: 'Yahan "kaunsi line kya karti hai" aur "kya ginna hai" bolna hai. 🎤',
    questions: [
      {
        q: '"Humare breaker mein 404 failure hai kya?"',
        choices: [
          'Nahi. 404 ka matlab maangne wale ne galat cheez maangi, dependency theek hai. Breaker sirf dependency ki bimaari gine: timeout, connection toota, 5xx. 4xx ginne se theek requests bhi ruk jaati hain',
          'Haan, har error status failure hai',
          'Haan, 404 matlab service gir gayi',
          'Breaker status code dekhta hi nahi, sirf latency dekhta hai',
        ],
        answer: 0,
        explain: 'Lab ex2: purane app ki kharab (4xx) requests ko failure ginne par naye app ki 90 theek requests mein se 87 roki gayi, breaker 3 baar khula. Sirf 5xx + timeout ginne par 90/90 chali.',
      },
      {
        q: '"Breaker ka object request handler ke andar banayein, ya bahar?"',
        choices: [
          'Bahar, ek baar. Breaker ko calls ke beech yaad rakhna hai (window, state, timer). Handler ke andar banaya toh har request par naya khaali breaker banega — jo kabhi OPEN hi nahi hoga',
          'Andar — har request ka apna breaker hona chahiye',
          'Koi farq nahi padta',
          'Andar, warna memory leak hota hai',
        ],
        answer: 0,
        explain: 'Lab ki <code>tools/mini.js</code> mein breaker line 7 par banta hai, <code>getRecs()</code> ke bahar. Window mein pichhli calls ke nateeje tabhi jama hote hain jab wahi ek object har call par chale.',
      },
    ],
  },
  success: [
    '<code>allow()</code> aur <code>record(ok)</code> ko line-by-line padh ke bata sakte ho ki kaunsi call par kaunsi line chalegi',
    'Apni fetch ke aaspaas breaker kahan lagta hai, aur "bimaar" kise ginte hain (timeout, 5xx — 4xx nahi), bata sakte ho',
    'Bata sakte ho ki breaker ka object function ke bahar kyun banta hai, aur <code>allow()</code> ka jawab kaun padhta hai',
  ],
  cards: [
    { front: 'Breaker ke do kaam code mein kaise dikhte hain?', back: '<code>allow()</code> call se <b>pehle</b>: true ya false. <code>record(ok)</code> call ke <b>baad</b>: nateeja window mein, zaroorat ho toh <code>open()</code> / <code>close()</code>. Lab: lib/breaker.js ki 29 line.' },
    { front: 'Apni fetch ke aaspaas breaker kahan lagta hai?', back: 'Pehle <code>if (!breaker.allow()) return fallback</code>. Phir apni fetch (time limit ke saath). Phir <code>breaker.record(!sick)</code>. Lab: tools/mini.js, line 11 se 17.' },
    { front: 'Breaker ke liye "fail" kya hai?', back: 'Jawab nahi aaya (timeout / connection toota) ya 5xx. 4xx (jaise 404) nahi: 4xx client ki galti hai. Lab ex2: 4xx ginne par 90 mein se 87 theek requests roki gayi.' },
    { front: 'Breaker ka object kahan banta hai — function ke andar ya bahar?', back: 'Bahar, ek baar (mini.js line 7). Breaker ko calls ke beech window, state aur timer yaad rakhne hain. Andar banaya toh har call par naya khaali breaker — kabhi OPEN nahi hoga.' },
  ],
},
]);

})();
