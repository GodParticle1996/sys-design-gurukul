/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: HEALTH CHECKS (paanch chhote levels)
     1 Kyun    → samasya pehle: ek hi deep /healthz + DB ki 5 second ki gadbad = saare pods restart (yeh file)
     2 Kaise   → jawab mein kya rakhein (shallow · yaad se · fail open), dheema boot, band hone ka kram
     3 Code    → app ka hissa (lib/health.js) aur checker ka niyam (lib/checker.js), line-by-line
     4 Library → asli setup: Kubernetes ke probes, @godaddy/terminus ka asli run, Spring Boot, load balancers
     5 Kab     → kaunsi cheez kis sawaal mein; naapi hui galtiyan; sach ya galatfehmi
   Har number docker-labs/43-health-checks ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/dbblip.js (ex1).
   Source video (credit): Software Developer Diaries — "The hidden cost of poorly-designed /health endpoints".
   ===================================================================== */
(function () {

/* checker → teen pods → ek shared DB */
const NODES = [
  { id: 'chk', icon: '🩺', label: 'checker', x: 130, y: 180 },
  { id: 'p1', icon: '📦', label: 'pod-1', x: 445, y: 65 },
  { id: 'p2', icon: '📦', label: 'pod-2', x: 445, y: 180 },
  { id: 'p3', icon: '📦', label: 'pod-3', x: 445, y: 295 },
  { id: 'db', icon: '🗄️', label: 'DB', x: 750, y: 180, kind: 'db' },
];
const EDGES = [
  { from: 'chk', to: 'p1' }, { from: 'chk', to: 'p2' }, { from: 'chk', to: 'p3' },
  { from: 'p1', to: 'db' }, { from: 'p2', to: 'db' }, { from: 'p3', to: 'db' },
];
const VIZ = { w: 890, h: 365, focus: ['p1', 'p2', 'p3', 'db'] };   // phone par pods aur DB hamesha dikhein; checker ki baat vars table mein hai
const pods = st => ({ p1: st, p2: st, p3: st });
/* checker ne teeno se poochha; pods ne (deep check mein) DB se poochha */
const asked = (tone, label, deep) => [
  { from: 'chk', to: 'p1', tone }, { from: 'chk', to: 'p2', tone, label }, { from: 'chk', to: 'p3', tone },
].concat(deep ? [{ from: 'p1', to: 'db', tone }, { from: 'p2', to: 'db', tone, label: 'SELECT 1' }, { from: 'p3', to: 'db', tone }] : []);

VISUALS['hc-kyun'] = {
  t: 'DB 5 second ke liye gaya. Checker ne teeno pods se poochha "theek ho?" — teeno ne DB se poochh ke "nahi" kaha',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: Object.assign({ chk: { tone: 'slow', badge: '3 baar "nahi" → restart' }, db: { tone: 'bad', badge: '5 s band' } }, pods({ tone: 'bad', badge: 'restart' })),
    flows: [{ from: 'chk', to: 'p2', label: 'theek ho?', tone: 'bad' }, { from: 'p2', to: 'db', label: 'SELECT 1', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'hc-kyun',
  icon: '🩺',
  group: '🩺 Health Checks',
  title: 'Health Checks 1 · Kyun — 5 second ki gadbad, 8 second ka outage',
  badge: 'Nabz Jasoos',
  objectives: [
    'DB sirf 5 second band tha. Service usse zyada der kyun band rahi — aur /home bhi, jise DB chahiye hi nahi?',
    'Checker ne teeno pods ko restart kyun kiya, jabki pods mein koi kharabi nahi thi?',
    'Restart rok dein toh kya sudharta hai — aur kya phir bhi toota rehta hai?',
    'Liveness, readiness, deep check, shallow check: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🩺 "Sab theek hai?" poochhne wale ne hi sab gira diya</h3>
     <p>KhanaKart ki <b>orders-service</b> ke teen <b>pods</b> chalte hain. (Pod = app ki ek chalti copy.) Teeno pods ek hi <b>DB</b> se baat karte hain.</p>
     <p>Do pages hain: <b>/home</b> (menu aur banners: DB nahi chahiye) aur <b>/orders</b> (DB chahiye).</p>
     <p>Ek <b>health checker</b> har second har pod se poochhta hai: "theek ho?" Team ne socha: "poori tarah check karna achha hai." Isliye har pod jawab dene se pehle DB se poochhta hai.</p>
     <p>Mangalvaar raat DB 5 second ke liye atka. Subah ka dashboard:</p>
     <pre>lab, asli raftaar (3 pods, har page par 40 requests/second, teen run):
DB band raha                        5 second
pods restart hue                    3 (teeno)
/orders theek hui                   DB ke wapas aane ke 4.0–5.0 second baad
/home, DB band rehne ke dauraan     sirf 19.0–19.5% requests safal</pre>
     <p>Pods mein koi kharabi nahi thi. Phir teeno restart kyun hue? Aur /home kyun band hui?</p>
     <p class="tip">👉 Agle screen par wahi raat slow motion mein: teen pods, har 0.5 second par ek /home aur ek /orders. Dekho ki checker kya poochhta hai — aur jawab sunke kya karta hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: ek hi deep /healthz ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — ek hi /healthz, jo DB se poochhta hai',
      goal: 'Har click = ek ghatna. Teen cheezein dekho: <b>checker ko kya jawab mila</b>, <b>kis pod ko traffic mil raha hai</b>, aur <b>/home aur /orders ka kya hua</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'db', label: 'DB' },
        { id: 'fails', label: '"Zinda ho?" ke lagataar fail (hadd 3)' },
        { id: 'eps', label: 'Traffic paane wale pods' },
        { id: 'home', label: '/home (DB nahi chahiye)' },
        { id: 'orders', label: '/orders (DB chahiye)' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: `Teen pods: pod-1, pod-2, pod-3. Teeno ek hi DB se baat karte hain.<br><br>
            <b>Health checker</b> har 1 second par har pod se do sawaal poochhta hai:
            <ul>
              <li><b>"Traffic bhejein?"</b> — 1 baar "nahi" → checker us pod ko traffic bhejna band kar deta hai.</li>
              <li><b>"Zinda ho?"</b> — lagataar 3 baar "nahi" → checker maan leta hai ki pod atak gaya hai, aur pod ko <b>restart</b> kar deta hai. Restart ke baad pod ko dobara shuru hone mein <b>6 second</b> lagte hain.</li>
            </ul>
            Is app mein dono sawaalon ka jawab <b>ek hi raasta</b> deta hai: <code>/healthz</code>. Aur <code>/healthz</code> jawab dene se pehle DB se poochhta hai.`,
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'har 1 s: /healthz' }, db: { tone: 'ok', badge: 'theek' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { db: 'theek', fails: '0 / 3', eps: 'pod-1 · pod-2 · pod-3', home: '—', orders: '—' },
        },
        {
          clock: '0.00–2.25 s',
          say: 'Checker ne teeno se poochha. Teeno ne DB se poochha, aur kaha "haan".<br><br>Requests baari-baari teeno pods par ja rahi hain: /home ✓, /orders ✓.',
          flows: asked('ok', 'theek ho?', true),
          vars: { home: '✓', orders: '✓' },
        },
        {
          clock: '2.50 s',
          say: '💥 <b>DB band.</b><br><br>2.75 s: ek /home request pod-2 par gayi → ✓. Ek /orders request pod-3 par gayi → ✗: pod-3 ko DB nahi mila.<br><br>/orders ko DB chahiye, toh /orders ka fail hona samajh mein aata hai.',
          nodes: { db: { tone: 'bad', badge: 'band' } },
          vars: { db: '💥 band (2.50 s se)', orders: '✗ DB nahi mila' },
          ask: {
            q: '3.00 s par checker teeno pods ka <code>/healthz</code> kholega. Kya jawab milega?',
            choices: ["Teeno fail; /healthz shared DB ko call karta hai","Sirf pod-3 fail; last request wahi route hui thi","Teeno pass; process alive se DB check skip hoga","Checker fail; pod endpoints query nahi honge"],
            answer: 0,
            hint: '/healthz ke andar pod kisse poochhta hai? Aur DB kitne pods ke liye ek hi hai?',
            explain: "Health handler har pod se same unavailable DB call karta hai, isliye results correlated fail hain. Last business request assignment probe handler ko isolate nahi karti. Endpoint logic explicitly DB dependency include karta hai. Checker endpoint execute karta hai; yahan checker process failure nahi.",
           choiceExplanations: ["Health handler har pod se same unavailable DB call karta hai, isliye results correlated fail hain.","Last business request assignment probe handler ko isolate nahi karti.","Endpoint logic explicitly DB dependency include karta hai.","Checker endpoint execute karta hai; yahan checker process failure nahi."] },
        },
        {
          clock: '3.00 s',
          say: 'Teeno pods ne dono sawaalon par "nahi" kaha. "Traffic bhejein?" par ek "nahi" kaafi hai → <b>teeno pods ko traffic band</b>.<br><br>3.25 s: /home ✗ — koi READY pod nahi. /orders ✗ — koi READY pod nahi.<br><br>/home ko DB chahiye hi nahi tha. Par /home tak pahunchne ke liye ek pod chahiye — aur ab load balancer ke paas bhejne ko ek bhi pod nahi.',
          flows: asked('bad', '✗ ✗ ✗', true),
          nodes: Object.assign({ chk: { tone: 'slow', badge: '"zinda ho?" fail 1/3' } }, pods({ tone: 'slow', badge: 'traffic band' })),
          vars: { fails: '1 / 3', eps: 'koi nahi', home: '✗ koi READY pod nahi', orders: '✗ koi READY pod nahi' },
        },
        {
          clock: '4.00 s',
          say: 'Checker ne phir poochha. Phir teeno "nahi". "Zinda ho?" ke lagataar fail: <b>2/3</b>.',
          flows: asked('bad', '✗ ✗ ✗', true),
          nodes: { chk: { tone: 'slow', badge: '"zinda ho?" fail 2/3' } },
          vars: { fails: '2 / 3' },
          ask: {
            q: '5.00 s par teesra fail hoga. Checker ka niyam: lagataar 3 "nahi" = pod atak gaya. Checker kya karega? Aur isse kya theek hoga?',
            choices: ["Teeno restart; shared DB ki kharabi baaki rahegi","Sirf DB restart; pod startup delay avoid ho jaayega","Ek pod restart; checker automatic quorum use karega","Teeno ready; failed probes sirf warning likhenge"],
            answer: 0,
            hint: 'Checker ko sirf pod ka jawab dikhta hai: "nahi". "Nahi" ki wajah checker ko dikhti hai?',
            explain: "Given liveness threshold har pod par independently reach hota hai; container restart shared database repair nahi karta. App liveness checker DB process manage nahi karta. Is checker mein coordinated quorum restart policy nahi. Failure threshold ka configured action restart hai.",
           choiceExplanations: ["Given liveness threshold har pod par independently reach hota hai; container restart shared database repair nahi karta.","App liveness checker DB process manage nahi karta.","Is checker mein coordinated quorum restart policy nahi.","Failure threshold ka configured action restart hai."] },
        },
        {
          clock: '5.00 s',
          say: 'Teesra "nahi". Checker ne <b>teeno pods restart</b> kar diye.<br><br>Har pod ko dobara shuru hone mein 6 second lagenge: <b>11.00 s tak</b> teeno ka port band hai.',
          nodes: Object.assign({ chk: { tone: 'bad', badge: '3/3 → restart' } }, pods({ tone: 'bad', badge: 'restart → boot 6 s' })),
          vars: { fails: '3 / 3 → RESTART', eps: 'koi nahi' },
        },
        {
          clock: '7.50 s',
          say: '✅ <b>DB wapas aa gaya.</b> DB ki gadbad kul 5 second ki thi.<br><br>Par 7.75 s par: /home ✗, /orders ✗. Teeno pods abhi boot ho rahe hain.<br><br>DB theek ho chuka hai. Outage ab <b>sirf restart ki wajah se</b> chal raha hai.',
          nodes: Object.assign({ db: { tone: 'ok', badge: 'theek' }, chk: { tone: 'idle', badge: 'intezaar' } }, pods({ tone: 'bad', badge: 'boot ho raha hai' })),
          vars: { db: 'theek (7.50 s se)', fails: '—' },
        },
        {
          clock: '11.00 s',
          say: 'Teeno pods khul gaye. Checker ne poochha "traffic bhejein?" → teeno "haan" → <b>traffic wapas</b>.<br><br>11.25 s: /home ✓, /orders ✓.',
          flows: asked('ok', '✓ ✓ ✓', true),
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'har 1 s: /healthz' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { fails: '0 / 3', eps: 'pod-1 · pod-2 · pod-3', home: '✓', orders: '✓' },
        },
        {
          clock: 'nateeja',
          say: `13 second ka hisaab (har page par 26 requests):
            <ul>
              <li><b>/home:</b> 26 mein se <b>10</b> safal. Fail: 3.25 s se 10.75 s tak.</li>
              <li><b>/orders:</b> 26 mein se <b>9</b> safal.</li>
              <li><b>Restart:</b> 3 — teeno pods.</li>
              <li>DB 7.50 s par wapas aaya. /orders 11.25 s par theek hui: DB ke <b>3.75 s baad</b>.</li>
            </ul>
            DB 5 second band tha. Service 8 second band rahi — aur /home bhi, jise DB chahiye hi nahi.`,
          nodes: Object.assign({ chk: { tone: 'slow', badge: 'restart: 3' } }, pods({ tone: 'ok', badge: '1 restart' })),
          vars: { db: 'band raha: 5 s', fails: '3 restart', eps: 'koi nahi: 3.00 s se 11.00 s', home: '26 mein se 10 safal', orders: '26 mein se 9 safal' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi, asli raftaar par: 3 pods, har page par 40 requests/second, DB 5 second band. (Teen run.)
            <ul>
              <li><b>Restart:</b> 3 — teeno pods.</li>
              <li><b>/home</b>, DB band rehne ke dauraan: sirf <b>19.0–19.5%</b> requests safal.</li>
              <li><b>/orders</b> DB ke wapas aane ke <b>4.0–5.0 second baad</b> theek hui.</li>
            </ul>`,
          nodes: Object.assign({ chk: { tone: 'slow', badge: 'lab: restart 3' }, db: { tone: 'ok', badge: 'lab: 5 s band raha' } }, pods({ tone: 'ok', badge: '' })),
          vars: { db: 'lab: 5 s band', fails: 'lab: 3 restart', eps: 'lab: 3 pods', home: 'lab: DB band ke dauraan 19.0–19.5% safal', orders: 'lab: DB ke 4.0–5.0 s baad theek' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> checker ke paas do hi auzaar hain: <b>traffic rokna</b> aur <b>restart karna</b>. Restart sirf us kharabi ka ilaaj hai jo pod ke <b>andar</b> ho. DB pod ke bahar hai: pods ko restart karne se DB theek nahi hota — bas pods bhi gir jaate hain.',
    },

    /* ---------------- 2. pehla ilaaj: do alag raaste ---------------- */
    {
      type: 'dryrun',
      title: '✂️ Pehla ilaaj: do alag raaste — aadha kaam',
      goal: 'Wahi teen pods, wahi 5 second ki gadbad. Ab dono sawaalon ke jawab <b>alag-alag raaston</b> se aate hain. Dekho kya sudhra — aur kya phir bhi toota raha.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'live', label: '"Zinda ho?" ka jawab (/livez)' },
        { id: 'ready', label: '"Traffic bhejein?" ka jawab (/readyz)' },
        { id: 'eps', label: 'Traffic paane wale pods' },
        { id: 'home', label: '/home (DB nahi chahiye)' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar teeno pods restart hue, aur DB ke aane ke baad bhi service 3.75 second band rahi. Tum is team mein ho. Sujhaav aata hai:<br><br><b>"Do alag raaste banao. <code>/livez</code> bataye \'zinda ho?\' — DB se poochhe bina. <code>/readyz</code> bataye \'traffic bhejein?\' — DB se poochh ke."</b>',
          nodes: Object.assign({ chk: { tone: 'ok', badge: '/livez aur /readyz' }, db: { tone: 'ok', badge: 'theek' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { live: '—', ready: '—', eps: 'pod-1 · pod-2 · pod-3', home: '—' },
          ask: {
            q: 'Do alag raaston se kya badlega?',
            choices: ["Liveness bachegi; dependency-based readiness fail hogi","Dono probes pass; DB failures implicit ignore hongi","Restart continue; liveness ab bhi DB-dependent hai","Readiness pass; naam badalne se handler badal jaata"],
            answer: 0,
            hint: 'Restart kis sawaal ke jawab se hota hai? Aur traffic kis sawaal ke jawab se rukta hai?',
            explain: "Liveness ko DB se separate karne se correlated restarts rukte hain; readiness DB check ab bhi traffic affect karta hai. Readiness implementation dependency ab bhi check kar rahi hai. New liveness handler DB touch nahi karta. Endpoint name alone business dependency semantics nahi badalta.",
           choiceExplanations: ["Liveness ko DB se separate karne se correlated restarts rukte hain; readiness DB check ab bhi traffic affect karta hai.","Readiness implementation dependency ab bhi check kar rahi hai.","New liveness handler DB touch nahi karta.","Endpoint name alone business dependency semantics nahi badalta."] },
        },
        {
          clock: '3.00 s',
          say: 'DB 2.50 s par band hua. 3.00 s par checker ne poochha:<br><br><code>zinda ho? ✓ ✓ ✓ · traffic bhejein? ✗ ✗ ✗</code><br><br>Teeno pods ko traffic band. Par "zinda ho?" ke fail ki ginti 0 hi rahi.',
          flows: asked('slow', 'traffic ✗', true),
          nodes: Object.assign({ chk: { tone: 'slow', badge: 'zinda ✓ · traffic ✗' }, db: { tone: 'bad', badge: 'band' } }, pods({ tone: 'slow', badge: 'traffic band' })),
          vars: { live: '✓ ✓ ✓', ready: '✗ ✗ ✗', eps: 'koi nahi', home: '✗ koi READY pod nahi' },
        },
        {
          clock: '3.25–7.25 s',
          say: 'Chaar second tak yahi haal. Har second: "zinda ho?" ✓ ✓ ✓, "traffic bhejein?" ✗ ✗ ✗.<br><br>Teeno pods zinda hain, theek hain — aur khaali baithe hain. /home ki har request ko ek hi jawab milta hai: <b>koi READY pod nahi</b>.',
          nodes: pods({ tone: 'idle', badge: 'khaali baitha' }),
        },
        {
          clock: '7.50–8.25 s',
          say: '7.50 s: ✅ DB wapas. 7.75 s ki requests abhi bhi fail: checker ne dobara poochha nahi hai.<br><br>8.00 s: checker ne poochha → "traffic bhejein?" ✓ ✓ ✓ → <b>traffic wapas</b>. 8.25 s: /home ✓, /orders ✓.<br><br>Pods restart nahi hue the, isliye DB ke aate hi kaam par laut aaye.',
          flows: asked('ok', '✓ ✓ ✓', true),
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'zinda ✓ · traffic ✓' }, db: { tone: 'ok', badge: 'theek' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { ready: '✓ ✓ ✓', eps: 'pod-1 · pod-2 · pod-3', home: '✓' },
        },
        {
          clock: 'nateeja',
          say: `<div class="dr-scroll"><table>
              <tr><th>Kya naapa</th><th>Ek hi /healthz</th><th>Do alag raaste</th></tr>
              <tr><td>Restart</td><td>3</td><td><b>0</b></td></tr>
              <tr><td>/orders theek hui, DB ke kitni der baad</td><td>3.75 s</td><td><b>0.75 s</b></td></tr>
              <tr><td>/home safal (26 mein se)</td><td>10</td><td>16</td></tr>
              <tr><td>/home fail kab se kab tak</td><td>3.25–10.75 s</td><td>3.25–7.75 s</td></tr>
            </table></div>
            Restart gaye, aur wapsi tez hui. Par /home ab bhi poore 5 second band rahi.`,
          vars: { live: 'restart: 0', ready: 'DB ke 0.75 s baad wapas', home: '26 mein se 16 safal' },
          ask: {
            q: '/home ko DB nahi chahiye. /home phir bhi 5 second kyun band rahi?',
            choices: ["Pod-level readiness ne DB-free /home bhi hata di","/home ne independent DB connection exhaust kiya","Liveness restarts ne is run mein saare pods boot kiye","Router ne sirf /orders path ka registration hataaya"],
            answer: 0,
            hint: 'Load balancer request kis ko bhejta hai: page ko, ya pod ko? Aur us waqt kitne pods "haan" keh rahe the?',
            explain: "Whole pod not-ready hone se same Service ka /home route bhi endpoints lose kar sakta hai. Prompt /home ko DB-free batata hai. Is separated-probe run mein restart nahi tha. Readiness path-specific application router rule nahi.",
           choiceExplanations: ["Whole pod not-ready hone se same Service ka /home route bhi endpoints lose kar sakta hai.","Prompt /home ko DB-free batata hai.","Is separated-probe run mein restart nahi tha.","Readiness path-specific application router rule nahi."] },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi dono setup, asli raftaar par (teen run):
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Restart</th><th>/orders theek, DB ke baad</th><th>/home safal, DB band ke dauraan</th></tr>
              <tr><td>Ek hi /healthz (DB se poochh ke)</td><td>3</td><td>4.0–5.0 s</td><td>19.0–19.5%</td></tr>
              <tr><td>Do raaste: /livez seedha, /readyz DB se</td><td><b>0</b></td><td><b>0.9 s</b></td><td>17.5–19.5%</td></tr>
            </table></div>
            Aakhri khaana dekho: dono setup mein, DB band rehne ke dauraan /home ki zyadatar requests fail hui.`,
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'lab: restart 0' } }, pods({ tone: 'ok', badge: '' })),
          vars: { live: 'lab: restart 0', ready: 'lab: DB ke 0.9 s baad wapas', eps: 'lab: 3 pods', home: 'lab: DB band ke dauraan 17.5–19.5% safal' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> do alag raaston ne restart hataya — yeh zaroori tha. Par jab tak "traffic bhejein?" ka jawab ek <b>shared</b> cheez (DB) se poochh ke diya jaata hai, us cheez ke girte hi <b>saare pods ek saath</b> "nahi" kahenge. Agla level isi ka ilaaj hai.',
    },

    /* ---------------- 3. idea: dhaba aur gas ki line ---------------- */
    {
      type: 'cards',
      title: '🍳 Yeh tum dekh chuke ho — dhaba, teen rasoiye, ek gas ki line',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Manager ka ek sawaal',
          say: 'Highway ka dhaba. Teen rasoiye, aur teeno ke chulhe <b>ek hi gas ki line</b> se jude hain. Ek counter par lassi bhi milti hai — lassi ke liye gas nahi chahiye.<br><br>Manager har minute har rasoiye se poochhta hai: <b>"Sab theek?"</b> Rasoiya chulha jala ke dekhta hai. Gas aa rahi ho toh kehta hai "theek".<br><br>Manager ka niyam: jo rasoiya teen baar "theek nahi" kahe, us rasoiye ko ghar bhejo aur naya rasoiya bulao. Naye rasoiye ko pahunchne mein 6 minute lagte hain.<br><br><b>KhanaKart mein:</b> rasoiya = pod · gas ki line = DB · manager = health checker · lassi = /home.',
        },
        {
          title: '2. Gas 5 minute ke liye gayi',
          say: 'Gas band. Teeno rasoiyon ne kaha "theek nahi" — ek baar, do baar, teen baar.<br><br>Manager ne teeno ko ghar bhej diya aur teen naye bulaye. Thodi der mein gas aa gayi. Par naye rasoiye abhi raaste mein the.<br><br>Aur lassi? Lassi banane wale bhi wahi rasoiye the. Lassi bhi band.<br><br><b>KhanaKart mein:</b> yahi pehla slow motion tha. DB 5 second band; teeno pods restart; service 8 second band — /home bhi.',
        },
        {
          title: '3. Manager ko kya poochhna chahiye tha?',
          say: 'Socho tum manager ho.',
          ask: {
            q: 'Rasoiye se kaunse sawaal poochhne chahiye — aur har sawaal ke "nahi" par kya karna chahiye?',
            choices: ["Liveness fail par replace; readiness fail par pause","Dono failures par replace; role separation ki need nahi","Dono failures par pause; dead worker ko bhi rakho","Readiness fail par replace; liveness fail par pause"],
            answer: 0,
            hint: 'Behosh rasoiye ka ilaaj kya hai? Gas na hone ka ilaaj kya hai? Kya dono ilaaj ek hi hain?',
            explain: "Process unrecoverably stuck aur temporarily unable-to-serve alag conditions aur actions hain. Shared restart policy transient inability par unnecessary churn karegi. Stuck worker ko replacement/recovery chahiye ho sakta hai. Yeh lifecycle actions reverse karti hai.",
           choiceExplanations: ["Process unrecoverably stuck aur temporarily unable-to-serve alag conditions aur actions hain.","Shared restart policy transient inability par unnecessary churn karegi.","Stuck worker ko replacement/recovery chahiye ho sakta hai.","Yeh lifecycle actions reverse karti hai."] },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>App ki ek chalti copy</td><td><b>Pod</b> (ya instance)</td></tr>
              <tr><td>Jo har pod se baar-baar poochhta hai</td><td><b>Health checker</b>. Kubernetes mein yeh kaam kubelet karta hai; load balancer apna alag check chalate hain</td></tr>
              <tr><td>Checker ka ek sawaal</td><td><b>Probe</b> (ya health check)</td></tr>
              <tr><td>"Zinda ho?" — fail hone par restart</td><td><b>Liveness</b> probe</td></tr>
              <tr><td>"Traffic bhejein?" — fail hone par traffic band</td><td><b>Readiness</b> probe</td></tr>
              <tr><td>Jawab dene se pehle DB jaisi doosri cheez se poochhna</td><td><b>Deep</b> check</td></tr>
              <tr><td>Bina kisi se poochhe jawab dena</td><td><b>Shallow</b> check</td></tr>
            </table></div>
            ⚠️ <b>Ek aam galatfehmi:</b> "Health check jitna gehra, utna achha." Gehra check jis cheez ko chhuta hai, us cheez ki har gadbad ko saare pods tak pahuncha deta hai. Lab: liveness mein DB → 3 restart, aur DB ke aane ke baad 4.0–5.0 second aur.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> health ke do sawaal hain, aur dono ke "nahi" ka ilaaj alag hai. <b>"Zinda ho?"</b> ka "nahi" = restart. <b>"Traffic bhejein?"</b> ka "nahi" = bas traffic roko. Jo cheez pod ke bahar hai, uski gadbad ka ilaaj restart nahi.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Checker lagataar 3 baar "nahi" sunta hai aur pod ko dobara chalata hai', right: 'Liveness probe', explain: 'Fail = restart. Slow motion: 5.00 s par teeno pods restart — jabki kharabi DB mein thi.' },
        { left: 'Checker ek "nahi" sunta hai aur us pod ko traffic bhejna band karta hai; pod chalta rehta hai', right: 'Readiness probe', explain: 'Fail = traffic band, restart nahi. Slow motion: restart 0, DB ke 0.75 s baad wapsi.' },
        { left: '/healthz jawab dene se pehle DB mein SELECT 1 chalata hai', right: 'Deep check', explain: 'DB ki har gadbad ab health ke jawab mein hai — teeno pods ke jawab mein, ek saath.' },
        { left: '/livez bina kisi se poochhe "haan" kehta hai', right: 'Shallow check', explain: 'Jawab aa gaya = app atka nahi hai. "Zinda ho?" ke liye itna kaafi hai.' },
        { left: 'App ki ek chalti copy, jisse checker poochhta hai', right: 'Pod (instance)', explain: 'Lab mein teen pods hain. Har pod ek alag process hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Kal raat DB ka failover 5 second ka tha. Hamari service usse kaafi zyada der band rahi, aur saare pods restart hue. Sabse pehle kya dekhoge?"',
        choices: ["Liveness handler mein shared dependency check dekho","Pehle replica count badhao; probe policy wahi rakho","Pehle DB timeout badhao; restart trigger ignore karo","Pehle CPU scale karo; health handler baad mein dekho"],
        answer: 0,
        explain: "DB outage aur all-pod restart correlation dependency-coupled liveness inspect karne ka strong trigger hai. Extra replicas same bad probe par correlated fail hongi. Longer DB wait health check timeout ko aur hurt kar sakta hai. CPU pressure ka evidence prompt mein nahi.",
       choiceExplanations: ["DB outage aur all-pod restart correlation dependency-coupled liveness inspect karne ka strong trigger hai.","Extra replicas same bad probe par correlated fail hongi.","Longer DB wait health check timeout ko aur hurt kar sakta hai.","CPU pressure ka evidence prompt mein nahi."] },
      {
        q: '"Liveness aur readiness probe mein farak kya hai?"',
        choices: ["Liveness restart; readiness traffic eligibility badle","Liveness sirf boot; readiness restart control kare","Liveness DB health; readiness process memory dekhe","Dono restart; bas polling interval alag hota hai"],
        answer: 0,
        explain: "Liveness failure threshold container restart drive karta hai; readiness failure endpoint eligibility change karti hai. Startup protection distinct startupProbe responsibility hai. Probe implementation apna handler define karti hai, dependency labels fixed nahi. Readiness failure ko restart action nahi diya gaya.",
       choiceExplanations: ["Liveness failure threshold container restart drive karta hai; readiness failure endpoint eligibility change karti hai.","Startup protection distinct startupProbe responsibility hai.","Probe implementation apna handler define karti hai, dependency labels fixed nahi.","Readiness failure ko restart action nahi diya gaya."] },
    ],
  },
  success: [
    'Bata sakte ho ki liveness mein DB check 5 second ki gadbad ko lamba outage kaise banata hai',
    'Liveness aur readiness ka farak "fail hone par kya hota hai" se samjha sakte ho',
    'Bata sakte ho ki do alag raaste kya bachate hain — aur /home phir bhi kyun band rehti hai',
  ],
  cards: [
    { front: 'Liveness mein DB check — kya hota hai?', back: 'DB ki gadbad par saare pods ek saath fail → restart. Restart se DB theek nahi hota. Slow motion: DB 5 s band, service 8 s band, 3 restart. Lab: 3 restart, /orders DB ke 4.0–5.0 s baad theek.' },
    { front: 'Liveness vs readiness?', back: '<b>Liveness</b> fail = restart (app atka hai, khud theek nahi hoga). <b>Readiness</b> fail = traffic band, app chalta rehta hai (abhi kaam nahi le sakta).' },
    { front: 'Readiness mein shared DB — kya bachta hai, kya nahi?', back: 'Bachta hai: restart nahi, wapsi tez (slow motion: 0.75 s). Nahi bachta: DB band rehne tak saare pods ek saath bahar — /home bhi band (26 mein se 16).' },
    { front: 'Deep vs shallow check?', back: '<b>Deep:</b> jawab se pehle doosri cheez (DB) se poochhna. <b>Shallow:</b> bina poochhe. Deep check us cheez ki har gadbad ko saare pods tak pahunchata hai.' },
  ],
},
]);

})();
