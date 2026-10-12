/* =====================================================================
   🛡️ Playlist · 1 Resilience — Health Checks · level 3: CODE
   App ka health wala hissa (lib/health.js), checker ka niyam (lib/checker.js), aur apne app mein lagana (tools/mini.js).
   Code ke tukde ASLI files se hain (docker-labs/43-health-checks) — validate.js unhe byte-for-byte milata hai.
   Number us folder ke asli run se hain. Kubernetes aur AWS ki default settings unki documentation se hain
   (is lab mein chalayi nahi gayi) — jahan aayi hain, wahan likha hai.
   ===================================================================== */
(function () {

const HERO = [
  { id: 'chk', icon: '🩺', label: 'checker', x: 140, y: 105 },
  { id: 'fn', icon: '⚙️', label: 'ready()', x: 445, y: 105 },
  { id: 'mem', icon: '🗒️', label: 'yaad', x: 750, y: 105 },
];

VISUALS['hc-code'] = {
  t: 'ready() DB se nahi poochhta. ready() sirf do variable padhta hai — DB se poochhne ka kaam alag se, apni ghadi par hota hai',
  html: SD.viz.svg(HERO, [{ from: 'chk', to: 'fn' }, { from: 'fn', to: 'mem' }], {
    nodes: { chk: { tone: 'acc', badge: 'traffic bhejein?' }, fn: { tone: 'ok', badge: '!stopping && depOk' }, mem: { tone: 'slow', badge: 'depOk · stopping' } },
    flows: [{ from: 'chk', to: 'fn', label: '/readyz', tone: 'acc' }, { from: 'fn', to: 'mem', label: 'padho', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'hc-code',
  icon: '💻',
  group: '🩺 Health Checks',
  title: 'Health Checks 3 · Code — app ka jawab, checker ka niyam',
  badge: 'Nabz Lohaar',
  objectives: [
    'App ke health wale hisse mein kitna code hai — aur is hisse mein kitne variable yaad rakhe jaate hain?',
    'live() hamesha true lautata hai. Phir "zinda ho?" ka jawab kabhi "nahi" kaise hota hai?',
    'Checker "lagataar 3 fail" kaise ginta hai, aur ek pass se kya hota hai?',
    'Apne app mein yeh sab kitni lines mein lagta hai?',
  ],
  lesson: [
    `<h3>💻 Do chhoti files: ek app ki, ek checker ki</h3>
     <p>Pichhle do levels mein jo dekha, uska code do files mein hai. Lab ke pods aur lab ka mini cluster yahi files chalate hain:</p>
     <pre>docker-labs/43-health-checks/lib/health.js    ← app ka hissa: do jawab + band hona   (27 line)
docker-labs/43-health-checks/lib/checker.js   ← checker ka niyam: nateeja aaya, ab kya?  (41 line)</pre>
     <p>Pehli file <b>tumhare app</b> mein jaati hai. Doosri file wahi kaam karti hai jo asli duniya mein Kubernetes ya load balancer karta hai — yeh file tumhe likhni nahi padti, par is file ko padhne se checker ki har setting samajh aa jaati hai.</p>
     <p class="tip">👉 Ek cheez dhoondte hue padho: <code>ready()</code> ke andar DB ka naam kahin hai?</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/health.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/health.js — app ke do jawab, line-by-line',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Misaal ke number <code>tools/mini.js</code> ke run se hain: us run mein app har 1 second par DB se poochhta hai. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/43-health-checks/lib/health.js',
        file: 'docker-labs/43-health-checks/lib/health.js',
        from: 9,
        text: "function createHealth({ check, everyMs = 2000 } = {}) {\n  let depOk = true;       // dependency ka aakhri jawab\n  let stopping = false;\n  let timer = null;\n\n  async function refresh() {\n    depOk = await check();\n  }\n\n  return {\n    start() {\n      if (!check) return;\n      refresh();\n      timer = setInterval(refresh, everyMs);\n    },\n    live() {\n      return true;        // kisi aur se nahi poochhta\n    },\n    ready() {\n      return !stopping && depOk;\n    },\n    stop() {\n      stopping = true;\n      clearInterval(timer);\n    },\n  };\n}",
      },
      vars: [
        { id: 'dep', label: '<code>depOk</code> (DB ka yaad rakha jawab)' },
        { id: 'stop', label: '<code>stopping</code>' },
        { id: 'live', label: '<code>live()</code>' },
        { id: 'ready', label: '<code>ready()</code>' },
      ],
      steps: [
        {
          clock: 'teen variable',
          line: [10, 11, 12],
          say: `App ke health ki poori yaad teen variable hain:<br><br>
            <b>Line 10, <code>depOk</code>:</b> dependency (jaise DB) ka aakhri jawab.<br>
            <b>Line 11, <code>stopping</code>:</b> kya band hone ka signal aa chuka hai?<br>
            <b>Line 12, <code>timer</code>:</b> DB se baar-baar poochhne wali ghadi.`,
          vars: { dep: 'true', stop: 'false', live: '—', ready: '—' },
        },
        {
          clock: 'live()',
          line: [24, 25, 26],
          say: '<code>live()</code> ka poora kaam line 25 hai: <code>return true</code>. Yeh function kisi se kuch nahi poochhta.',
          vars: { live: 'true' },
          ask: {
            q: '<code>live()</code> hamesha <code>true</code> lautata hai. Phir "zinda ho?" ka jawab kabhi "nahi" kaise hoga?',
            choices: [
              'Jab app itna atak gaya ho ki yeh function chal hi na paaye. Tab jawab aata hi nahi — aur checker ke liye "jawab nahi aaya" bhi fail hai',
              'Kabhi nahi — isliye yeh function bekaar hai',
              'Jab DB band ho',
              'Jab <code>stopping</code> true ho',
            ],
            answer: 0,
            hint: '"Zinda ho?" asal mein kya jaanna chahta hai? Aur atke hue app se jawab aata hai?',
            explain: 'Jawab ka aana hi saboot hai ki app atka nahi hai. "Zinda ho?" ke liye itna kaafi hai — aur isi wajah se DB ki gadbad kabhi restart nahi karwa sakti.',
          },
        },
        {
          clock: 'start()',
          line: '19-23',
          say: `<b>Line 20:</b> <code>check</code> diya hi nahi gaya? Toh kuch shuru nahi karna.<br>
            <b>Line 21:</b> ek baar abhi poochh lo.<br>
            <b>Line 22:</b> phir har <code>everyMs</code> par dobara poochho.<br><br>
            DB se poochhne ka kaam <b>yahan</b> hota hai — app ki apni ghadi par. Checker ke sawaal ke raaste mein nahi.`,
          vars: { dep: 'true (0.00 s par poochha)' },
        },
        {
          clock: 'refresh()',
          line: [14, 15, 16],
          say: 'Line 15: <code>check()</code> chalao (asli app mein: <code>SELECT 1</code>), aur jawab <code>depOk</code> mein rakh lo.<br><br>Mini run mein DB 1.50 s par band hua. <code>refresh()</code> agli baar 2.00 s par chala → <code>depOk = false</code>.',
          vars: { dep: 'false (2.00 s par poochha)' },
        },
        {
          clock: 'ready()',
          line: [27, 28, 29],
          say: 'Line 28: <code>!stopping &amp;&amp; depOk</code>. Do variable padhe, aur jawab de diya. Is line mein DB ka naam nahi hai.',
          vars: { dep: 'true (1.00 s par poochha)', ready: '?' },
          ask: {
            q: 'Checker ne 1.75 s par <code>/readyz</code> khola. DB 1.50 s par band ho chuka hai. <code>refresh()</code> aakhri baar 1.00 s par chala tha. <code>ready()</code> kya lautayega?',
            choices: [
              '<code>true</code> — <code>depOk</code> abhi bhi true hai: yaad 1.00 s ki hai. 2.00 s par <code>refresh()</code> chalega, tab <code>depOk</code> false hoga',
              '<code>false</code> — DB band hai',
              'Function DB se poochh ke batayega',
              'Error aayega',
            ],
            answer: 0,
            hint: 'Line 28 kya-kya padhti hai? <code>depOk</code> aakhri baar kab badla tha?',
            explain: 'Mini run ki line: <code>1.75 s 200 200 200 ← app ko abhi pata nahi: yaad 1.00 s ki hai</code>, phir <code>2.25 s 200 503 200</code>. Yaad rakhe jawab ki keemat: jawab <code>everyMs</code> tak purana ho sakta hai.',
          },
        },
        {
          clock: 'yaad ka fayda',
          line: 28,
          say: `Yaad rakhne ka fayda: line 28 DB ko chhuti hi nahi. Checker chahe jitni baar poochhe, DB par sawaal utne hi jaate hain: har <code>everyMs</code> par ek.<br><br>
            Lab ne naapa: 5 pods, har pod ka <code>/readyz</code> har second 4 jagah se khulta hai (Kubernetes, load balancer, service mesh, monitoring). App par asli traffic zero.
            <div class="dr-scroll"><table>
              <tr><th>/readyz kaise jawab deta hai</th><th>DB queries/second, sirf health ke sawaalon se</th></tr>
              <tr><td>Har sawaal par DB se poochh ke</td><td>18.5</td></tr>
              <tr><td>Yaad se (har 2 s ek baar DB)</td><td><b>2.5</b></td></tr>
              <tr><td>DB ko chhuta hi nahi</td><td>0</td></tr>
            </table></div>`,
          vars: { ready: 'sirf yaad padhta hai' },
        },
        {
          clock: 'stop()',
          line: '30-33',
          say: '<b>Line 31:</b> <code>stopping = true</code>. Is pal se <code>ready()</code> false hai — <code>depOk</code> kuch bhi ho.<br><b>Line 32:</b> DB se poochhne wali ghadi band.',
          vars: { stop: 'true', ready: 'false' },
          ask: {
            q: '<code>stop()</code> chal chuka hai. Ab <code>live()</code> kya lautayega?',
            choices: [
              '<code>true</code> — band hona atakna nahi hai. App ko traffic nahi chahiye, par restart bhi nahi chahiye',
              '<code>false</code> — app band ho raha hai',
              'Error',
              '<code>stopping</code> ka ulta',
            ],
            answer: 0,
            hint: '<code>live()</code> ki line 25 kaunsa variable padhti hai?',
            explain: 'Mini run: <code>6.75 s 200 503 200 ← traffic rukwaya; par jo request aayi, uska jawab diya</code>. /livez 200, /readyz 503, aur /home abhi bhi 200.',
          },
        },
        {
          clock: 'check mein kya rakhein?',
          line: [9, 20],
          say: `<code>check</code> optional hai (line 9). Na do, toh line 20 par <code>start()</code> laut jaata hai, <code>depOk</code> hamesha true rehta hai, aur <code>ready()</code> ka matlab bas itna: "main band toh nahi ho raha?" Yahi level 2 ka "DB ko chhute hi nahi" wala setup hai.<br><br>
            <code>check</code> mein kuch rakhna ho, toh do sawaal poochho:
            <ul>
              <li>Kya is cheez ke bina app ka <b>koi bhi</b> page nahi chal sakta?</li>
              <li>Kya yeh cheez <b>saare pods ke liye ek hi</b> hai? Agar haan: is cheez ke girte hi saare pods ek saath traffic se bahar honge (level 2: /home 26 mein se 16).</li>
            </ul>`,
          vars: { dep: 'check nahi diya → hamesha true', stop: 'false', ready: '!stopping' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> health ke jawab <b>saste aur seedhe</b> hone chahiye. <code>live()</code> kisi se nahi poochhta. <code>ready()</code> sirf yaad padhta hai. Dependency se poochhna ho, toh alag se, apni ghadi par — sawaal ke raaste mein nahi.',
    },

    /* ---------------- 2. lib/checker.js ---------------- */
    {
      type: 'dryrun',
      title: '🧮 lib/checker.js — checker ka niyam, line-by-line',
      goal: 'Ab doosri taraf: checker ko ek jawab mila — ab checker kya karega? Number level 1 ke pehle slow motion ke hain (ek hi /healthz, DB 2.50 s par band). Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/43-health-checks/lib/checker.js',
        file: 'docker-labs/43-health-checks/lib/checker.js',
        from: 7,
        text: "function newChecks(hasStartupProbe) {\n  return {\n    // startup sawaal hai → uske pass hone tak \"shuru nahi\"\n    started: !hasStartupProbe,\n    ready: false,          // traffic bhejein?\n    fails: { startup: 0, liveness: 0, readiness: 0 },\n  };\n}\n\n/* Yeh sawaal abhi poochhna hai?\n   Startup pass hone tak baaki dono band. */\nfunction shouldRun(c, kind) {\n  return kind === 'startup' ? !c.started : c.started;\n}\n\n/* Lautata hai: null (kuch nahi) | 'started' | 'ready'\n                | 'not-ready' | 'restart' */\nfunction onResult(c, kind, ok, threshold) {\n  if (ok) {\n    c.fails[kind] = 0;     // ek pass → ginti wapas zero\n    if (kind === 'startup' && !c.started) {\n      c.started = true;\n      return 'started';\n    }\n    if (kind === 'readiness' && !c.ready) {\n      c.ready = true;\n      return 'ready';\n    }\n    return null;\n  }\n\n  c.fails[kind]++;\n  // hadd tak nahi pahuncha → abhi kuch nahi\n  if (c.fails[kind] < threshold) return null;\n  if (kind === 'readiness') {\n    if (!c.ready) return null;\n    c.ready = false;\n    return 'not-ready';    // traffic roko\n  }\n  return 'restart';        // app ko dobara chalao\n}",
      },
      vars: [
        { id: 'call', label: 'Call' },
        { id: 'fl', label: '<code>c.fails.liveness</code>' },
        { id: 'rd', label: '<code>c.ready</code>' },
        { id: 'ret', label: 'Lautaya' },
      ],
      steps: [
        {
          clock: 'checker ki yaad',
          line: '7-14',
          say: `Checker har pod ke liye ek chhoti yaad rakhta hai (<code>c</code>):<br><br>
            <b>Line 10, <code>started</code>:</b> kya pod shuru ho chuka hai?<br>
            <b>Line 11, <code>ready</code>:</b> kya is pod ko traffic bhejna hai?<br>
            <b>Line 12, <code>fails</code>:</b> teeno sawaalon ke <b>lagataar</b> fail ki ginti.`,
          vars: { call: 'newChecks(false)', fl: '0', rd: 'false → pehle pass par true', ret: '—' },
        },
        {
          clock: '2.00 s · pass',
          line: [25, 26, 35],
          say: 'DB theek hai. Checker ne pod-1 se poochha "zinda ho?" → haan.<br><br><code>onResult(c, \'liveness\', true, 3)</code><br><br><b>Line 26:</b> ginti zero. <b>Line 35:</b> kuch nahi karna → <code>null</code>.',
          vars: { call: "onResult(c, 'liveness', true, 3)", fl: '0', rd: 'true', ret: 'null' },
        },
        {
          clock: '3.00 s · traffic bhejein? ✗',
          line: [38, 40, 41, 42, 43, 44],
          say: 'DB 2.50 s par band hua. 3.00 s par "traffic bhejein?" ka jawab: nahi. Is sawaal ki hadd 1 hai.<br><br><code>onResult(c, \'readiness\', false, 1)</code><br><br><b>Line 38:</b> ginti 1. <b>Line 40:</b> 1 &lt; 1? Nahi → aage badho. <b>Line 42:</b> pod abhi READY tha → aage. <b>Line 43:</b> <code>c.ready = false</code>. <b>Line 44:</b> <code>\'not-ready\'</code>.',
          vars: { call: "onResult(c, 'readiness', false, 1)", rd: 'false', ret: "'not-ready' → traffic band" },
        },
        {
          clock: '3.00 s · zinda ho? ✗',
          line: [38, 40],
          say: 'Usi pal "zinda ho?" ka jawab bhi: nahi. Is sawaal ki hadd 3 hai.<br><br><code>onResult(c, \'liveness\', false, 3)</code><br><br><b>Line 38:</b> ginti 1.',
          vars: { call: "onResult(c, 'liveness', false, 3)", fl: '1', ret: '?' },
          ask: {
            q: '<code>c.fails.liveness</code> ab 1 hai, hadd 3. Line 40 kya karegi?',
            choices: [
              '<code>null</code> lautayegi — 1 &lt; 3, yaani hadd tak nahi pahuncha. Abhi kuch nahi karna',
              "<code>'restart'</code> lautayegi",
              "<code>'not-ready'</code> lautayegi",
              'Ginti ko zero kar degi',
            ],
            answer: 0,
            hint: 'Line 40: <code>if (c.fails[kind] &lt; threshold) return null;</code> — dono number rakh ke dekho.',
            explain: 'Slow motion: <code>3.00 s 🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 1/3)</code>. Ek "nahi" par restart nahi hota: ek dheema jawab kisi bhi theek app se aa sakta hai.',
          },
        },
        {
          clock: '5.00 s · teesra ✗',
          line: [38, 40, 41, 46],
          say: '4.00 s par ginti 2 hui. 5.00 s par teesra "nahi".<br><br><b>Line 38:</b> ginti 3. <b>Line 40:</b> 3 &lt; 3? Nahi. <b>Line 41:</b> sawaal readiness hai? Nahi. <b>Line 46:</b> <code>\'restart\'</code>.<br><br>Dhyaan do: is function ko <b>nahi pata</b> ki "nahi" ki wajah DB thi. Function ko sirf <code>ok = false</code> mila.',
          vars: { fl: '3', ret: "'restart' → pod dobara chalao" },
        },
        {
          clock: '"lagataar" ka matlab',
          line: 26,
          say: 'Line 26 par laut ke dekho: <b>ek pass ginti ko zero kar deta hai</b>.',
          vars: { call: 'jawab: ✗ ✗ ✓ ✗ ✗ · hadd 3', fl: '1 → 2 → 0 → 1 → 2', ret: '?' },
          ask: {
            q: 'Ek pod ke "zinda ho?" ke paanch jawab aaye: ✗ ✗ ✓ ✗ ✗. Hadd 3 hai. Restart hoga?',
            choices: [
              'Nahi. Teesre jawab (✓) ne ginti zero kar di. Is ✓ ke baad sirf 2 lagataar fail hue: 2 &lt; 3',
              'Haan — kul 4 fail hain, aur 4 hadd se zyada hai',
              'Haan — pehle do fail ke baad hi',
              'Pata nahi — yeh random hai',
            ],
            answer: 0,
            hint: 'Ginti har jawab ke baad likho. Line 26 kab chalti hai?',
            explain: 'Ginti: 1, 2, 0, 1, 2. Hadd "kul kitne fail" nahi, "<b>lagataar</b> kitne fail" hai. Kabhi-kabhi ka ek dheema jawab restart nahi karwata.',
          },
        },
        {
          clock: 'shuruaat ka sawaal',
          line: '16-20',
          say: `<code>shouldRun</code> batata hai ki koi sawaal abhi poochhna hai ya nahi.<br><br>
            <b>Line 19:</b> sawaal <code>'startup'</code> hai → tabhi poochho jab pod <b>shuru nahi hua</b>. Baaki dono sawaal → tabhi jab pod <b>shuru ho chuka</b>.<br><br>
            Level 2 ka dheema boot: "shuru ho gaye?" 12 baar fail hua, hadd 30 thi. Har baar line 40 ne <code>null</code> lautaya — koi restart nahi. 12.00 s par pass → line 28 → <code>started = true</code> → ab baaki dono sawaal chalu.`,
          vars: { call: "shouldRun(c, 'liveness')", fl: '—', rd: '—', ret: 'c.started' },
        },
        {
          clock: 'kitni der mein pata chalta hai?',
          line: 40,
          say: `Line 40 se ek seedha hisaab nikalta hai: checker ko gadbad ka pata chalne mein lagbhag <b>sawaalon ka fasla × hadd</b> jitna samay lagta hai.
            <div class="dr-scroll"><table>
              <tr><th>Kahan</th><th>Fasla</th><th>Hadd</th><th>Pata chalne mein</th></tr>
              <tr><td>Is lab ka "zinda ho?"</td><td>1 s</td><td>3</td><td>~3 s (slow motion: DB 2.50 s par band, restart 5.00 s par)</td></tr>
              <tr><td>Kubernetes ki default settings</td><td>10 s</td><td>3</td><td>~30 s tak</td></tr>
              <tr><td>AWS load balancer ki default settings</td><td>30 s</td><td>2</td><td>~60 s tak</td></tr>
            </table></div>
            Kubernetes aur AWS ke number unki documentation ki default settings se nikala hua hisaab hain — is lab mein naape nahi gaye.<br><br>
            Hadd chhoti rakhoge toh pata jaldi chalega, par ek dheema jawab bhi karwai karwa dega. Badi rakhoge toh ulta.`,
          vars: { call: 'fasla × hadd', fl: '—', rd: '—', ret: '—' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> checker ka poora dimaag ek ginti hai: <b>lagataar kitne "nahi"</b>. Hadd tak pahuncha toh ek hi cheez tay karti hai ki kya hoga: <b>sawaal kaunsa tha</b>. Readiness → traffic band. Liveness ya startup → restart. "Nahi" ki wajah checker ko kabhi nahi dikhti.',
    },

    /* ---------------- 3. apne app mein ---------------- */
    {
      type: 'dryrun',
      title: '🔌 tools/mini.js — apne app mein lagana: 23 line',
      goal: 'Yeh file ek poora chhota app hai, <code>lib/health.js</code> ke saath. Chaar tukde dekho: banana, jawab dena, raaste jodna, band hona.',
      code: {
        title: 'docker-labs/43-health-checks/tools/mini.js',
        file: 'docker-labs/43-health-checks/tools/mini.js',
        from: 9,
        text: "const PORT = 5229;\nlet dbUp = true;          // nakli DB: bas ek variable\n\nconst health = createHealth({\n  check: async () => dbUp,   // asli app mein: SELECT 1\n  everyMs: 1000,\n});\n\nfunction readyz(req, res) {\n  if (health.ready()) return { ready: true };\n  return json(res, 503, { ready: false });\n}\n\nconst server = serve(PORT, {\n  'GET /livez': () => ({ live: health.live() }),\n  'GET /readyz': readyz,\n  'GET /home': () => ({ page: 'home' }),\n}, () => health.start());\n\nprocess.on('SIGTERM', () => {\n  health.stop();           // 1. /readyz ab 503\n  setTimeout(bye, 2000);   // 2. 2 s tak jawab dete raho\n});",
      },
      vars: [
        { id: 'part', label: 'Tukda' },
        { id: 'does', label: 'Kya karta hai' },
      ],
      steps: [
        {
          clock: '1 · banao',
          line: '12-15',
          say: '<b>Line 13:</b> <code>check</code> = dependency se poochhne ka function. Is chhoti file mein DB ek variable hai; asli app mein yahan <code>SELECT 1</code> jaisi sasti query hogi.<br><b>Line 14:</b> har 1000 ms par ek baar poochho.',
          vars: { part: 'createHealth({ check, everyMs })', does: 'health ka object banata hai' },
        },
        {
          clock: '2 · jawab do',
          line: '17-20',
          say: '<b>Line 18:</b> <code>health.ready()</code> true → 200.<br><b>Line 19:</b> warna <b>503</b>.<br><br>Checker ko sirf status code se matlab hai. Kubernetes ki documentation ke mutabiq 200 se 399 tak pass hai; baaki sab fail.',
          vars: { part: 'readyz(req, res)', does: 'ready() → 200 ya 503' },
        },
        {
          clock: '3 · raaste jodo',
          line: '22-26',
          say: '<b>Line 23:</b> <code>/livez</code> → <code>health.live()</code>.<br><b>Line 24:</b> <code>/readyz</code> → upar wala function.<br><b>Line 26:</b> server khulte hi <code>health.start()</code>.<br><br>Do sawaal, do alag raaste — level 1 ka pehla ilaaj yahi tha.',
          vars: { part: 'serve(PORT, { … })', does: '/livez aur /readyz alag-alag' },
        },
        {
          clock: '4 · band hona',
          line: '28-31',
          say: '<b>Line 29:</b> signal aate hi <code>health.stop()</code> → <code>/readyz</code> ab 503.<br><b>Line 30:</b> par app abhi band nahi hota: 2 second tak jawab deta rehta hai, phir band.<br><br>Level 2 ka kram yahi tha: pehle "traffic mat bhejo", phir khabar pahunchne tak jawab, phir band.',
          vars: { part: "process.on('SIGTERM', …)", does: 'stop() → 2 s jawab → band' },
          ask: {
            q: 'Line 30 hata do, aur line 29 ke turant baad app band kar do. Deploy ke waqt kya hoga?',
            choices: [
              'Load balancer ko khabar pahunchne se pehle port band ho jaayega. Us beech jo requests is pod par aayengi, fail hongi',
              'Kuch nahi — /readyz 503 de chuka hai, itna kaafi hai',
              'App band hi nahi hoga',
              'Requests doosre pod par apne aap chali jaayengi',
            ],
            answer: 0,
            hint: 'Level 2 ka teesra slow motion yaad karo: "turant band" mein 14 mein se kitni requests fail hui thi?',
            explain: '503 kehna khabar <b>bhejna</b> hai; khabar ko <b>pahunchne</b> mein waqt lagta hai. Slow motion: turant band → 14 mein se 2 fail; 2 s tak jawab → 0 fail.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> apne app mein chaar cheezein chahiye: health ka object, do alag raaste, 200 ya 503, aur signal par "pehle traffic rukwao, phir thodi der jawab, phir band".',
    },

    /* ---------------- 4. chala ke dekho ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — wahi 23 line, chalti hui',
      project: '43-health-checks',
      exercise: 'ex0-slowmo',
      goal: 'Abhi jo file padhi, wahi chalao. App port 5229 par khulta hai. DB (ek variable) 1.5 s par band hota hai, 4.5 s par wapas aata hai, aur 6.5 s par app ko SIGTERM milta hai.',
      why: '<code>tools/mini.js</code> ka upar ka hissa app hai (<code>lib/health.js</code> ke saath). Neeche ka hissa sirf dikhane ke liye hai: har 0.5 s par teeno raaston se poochhta hai aur status code chhaapta hai. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Chalao (~9 s). /readyz wala khaana dekho: kab 503 hua, kab wapas 200.', cmd: 'cd docker-labs/43-health-checks && node tools/mini.js', expect: "app :5229 · lib/health.js · DB ka check har 1 s par, jawab yaad se\n\n    samay   /livez   /readyz   /home      kya hua\n   0.25 s   200      200       200\n   0.75 s   200      200       200\n   1.25 s   200      200       200\n   1.50 s                                  💥 DB band\n   1.75 s   200      200       200         ← app ko abhi pata nahi: yaad 1.00 s ki hai\n   2.25 s   200      503       200         ← 2.00 s par app ne DB se poochha\n   2.75 s   200      503       200\n   3.25 s   200      503       200\n   3.75 s   200      503       200\n   4.25 s   200      503       200\n   4.50 s                                  ✅ DB wapas\n   4.75 s   200      503       200         ← yaad 4.00 s ki hai\n   5.25 s   200      200       200         ← 5.00 s par app ne DB se poochha\n   5.75 s   200      200       200\n   6.25 s   200      200       200\n   6.50 s                                  🛑 SIGTERM — band hone ka signal\n   6.75 s   200      503       200         ← traffic rukwaya; par jo request aayi, uska jawab diya\n   7.25 s   200      503       200\n   7.75 s   200      503       200\n   8.25 s   200      503       200\n   8.50 s                                  app band" },
        { text: 'Khud poochhna ho toh: dobara chalao, aur doosre terminal se yeh chalao (pehle 6 second ke andar).', cmd: 'curl -i localhost:5229/readyz' },
      ],
      observe: {
        q: 'DB 1.50 s par band hua, par /readyz 2.25 s par 503 hua. Aur 6.50 s par SIGTERM ke baad /livez 200 hi raha. Dono ki wajah?',
        choices: [
          '/readyz yaad se jawab deta hai, aur yaad 2.00 s par badli. /livez kisi variable ko padhta hi nahi: band hona atakna nahi hai, toh restart ki zaroorat nahi',
          'Dono bugs hain',
          'Network dheema tha',
          'Checker ne der se poochha',
        ],
        answer: 0,
        explain: '<code>ready()</code> = <code>!stopping &amp;&amp; depOk</code>: dono variable apni-apni ghadi par badalte hain. <code>live()</code> = <code>true</code>.',
      },
      lesson: 'Health ke raaste chhote rakho. Mehenga kaam (DB se poochhna) raaste ke bahar karo, aur jawab yaad rakho.',
    },
  ],
  interview: {
    title: 'Interview Round — code aur ginti',
    instructions: 'Interviewer dekhna chahta hai ki tum health endpoint ko "sasta aur seedha" rakhte ho. 🎤',
    questions: [
      {
        q: '"Tumhara /readyz har baar database mein SELECT 1 chalata hai. Isme kya dikkat ho sakti hai?"',
        choices: [
          'Health ke sawaal kai jagah se aate hain (Kubernetes, load balancer, service mesh, monitoring) aur har pod par aate hain. Har sawaal par DB query = bina kisi user ke DB par lagataar bojh — aur jab DB pehle se dheema ho, tab yeh bojh DB ko aur dabata hai. Behtar: app apni ghadi par kabhi-kabhi poochhe, jawab yaad rakhe, aur /readyz yaad se jawab de',
          'Koi dikkat nahi — SELECT 1 muft hai',
          'SELECT 1 galat query hai; SELECT 2 chalani chahiye',
          '/readyz ko POST hona chahiye',
        ],
        answer: 0,
        explain: 'Lab: 5 pods, har pod par 4 poochhne wale, har second. Har sawaal par DB → 18.5 queries/second. Yaad se (har 2 s) → 2.5. App par asli traffic zero tha.',
      },
      {
        q: '"failureThreshold ko 1 kyun na rakhein? Gadbad ka pata sabse jaldi chalega."',
        choices: [
          'Liveness ke liye yeh khatarnaak hai: ek dheema jawab (GC pause, bhari machine, network ka jhatka) = restart. Hadd "lagataar fail" ginti hai, aur ek pass ginti ko zero kar deta hai — isliye 3 jaisi hadd kabhi-kabhi ki gadbad ko maaf karti hai. Readiness mein chhoti hadd kam nuksaan karti hai, kyunki wahan fail ka matlab sirf traffic rokna hai',
          'Kyunki 1 valid number nahi hai',
          'Kyunki Kubernetes 1 ko 10 samajhta hai',
          'Koi wajah nahi — 1 hi sabse achha hai',
        ],
        answer: 0,
        explain: 'Lab ke dheeme boot mein "1 fail = restart" tha: delay 5 s, boot 8 s → 4 restart, READY kabhi nahi. Kubernetes ki default hadd 3 hai (documentation).',
      },
    ],
  },
  success: [
    'App ke health ka code teen variable aur chaar chhote functions mein samjha sakte ho',
    'Bata sakte ho ki checker "lagataar fail" kaise ginta hai, aur hadd tak pahunchne par kya tay karta hai ki kya hoga',
    'Apne app mein /livez, /readyz aur SIGTERM ka kram likh sakte ho',
  ],
  cards: [
    { front: 'live() mein kya hona chahiye?', back: '<code>return true</code>. Jawab ka aana hi saboot hai ki app atka nahi. Isme DB ya koi doosri cheez nahi: warna us cheez ki gadbad = restart.' },
    { front: 'ready() kya padhta hai?', back: '<code>!stopping &amp;&amp; depOk</code> — do variable. DB se poochhna alag se, apni ghadi par (<code>refresh()</code>). Lab: har sawaal par DB 18.5 q/s · yaad se 2.5 q/s.' },
    { front: 'Checker "lagataar 3 fail" kaise ginta hai?', back: 'Har fail par ginti +1; ek pass par ginti 0. ✗ ✗ ✓ ✗ ✗ → 1, 2, 0, 1, 2 → restart nahi. Hadd tak pahuncha: readiness → traffic band; liveness / startup → restart.' },
    { front: 'Gadbad ka pata kitni der mein?', back: 'Lagbhag fasla × hadd. Lab: 1 s × 3 = ~3 s. Kubernetes default 10 s × 3 = ~30 s tak; AWS load balancer default 30 s × 2 = ~60 s tak (documentation ki defaults se hisaab).' },
    { front: 'SIGTERM par app kya kare?', back: '1. <code>stop()</code> → /readyz 503. 2. Kuch second jawab dete raho (khabar pahunchne tak). 3. Band. /livez 200 hi rehta hai: band hona atakna nahi hai.' },
  ],
},
]);

})();
