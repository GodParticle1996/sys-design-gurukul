/* =====================================================================
   🛡️ Playlist · 1 Resilience — Health Checks · level 2: KAISE
   Kaunse sawaal ka jawab kaise dein: DB ki gadbad ko health ke jawab se bahar rakhna (shallow), load balancer ka
   fail open, yaad rakha jawab; phir dheema boot (teesra sawaal) aur band hone ka kram.
   Har step docker-labs/43-health-checks ke asli run se hai: `node tools/slowmo.js`, `node tools/slowmo-boot.js`,
   `node tools/slowmo-stop.js`; asli raftaar = tools/dbblip.js (ex1), tools/slowstart.js (ex3), tools/rollout.js (ex4).
   Load balancers aur Kubernetes ke baare mein jo "documentation se" likha hai, woh is lab mein chalaya nahi gaya.
   ===================================================================== */
(function () {

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
const VIZ = { w: 890, h: 365, focus: ['p1', 'p2', 'p3', 'db'] };   // phone par pods aur DB hamesha dikhein
const pods = st => ({ p1: st, p2: st, p3: st });
const asked = (tone, label, deep) => [
  { from: 'chk', to: 'p1', tone }, { from: 'chk', to: 'p2', tone, label }, { from: 'chk', to: 'p3', tone },
].concat(deep ? [{ from: 'p1', to: 'db', tone }, { from: 'p2', to: 'db', tone, label: 'SELECT 1' }, { from: 'p3', to: 'db', tone }] : []);

VISUALS['hc-kaise'] = {
  t: 'DB band hai. Checker ne poochha "traffic bhejein?" — pods ne DB se poochhe bina kaha "haan". /home chalti rahi',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: Object.assign({ chk: { tone: 'ok', badge: 'traffic bhejein? ✓ ✓ ✓' }, db: { tone: 'bad', badge: 'band' } }, pods({ tone: 'ok', badge: 'READY' })),
    flows: [{ from: 'chk', to: 'p1', tone: 'ok' }, { from: 'chk', to: 'p2', tone: 'ok', label: 'apna haal' }, { from: 'chk', to: 'p3', tone: 'ok' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'hc-kaise',
  icon: '🧭',
  group: '🩺 Health Checks',
  title: 'Health Checks 2 · Kaise — kaunsa sawaal, kaunsa jawab',
  badge: 'Sawaal Ustaad',
  objectives: [
    '"Traffic bhejein?" ka jawab kis cheez se dena chahiye — aur DB ki gadbad kahan dikhni chahiye?',
    'Load balancer ka "fail open" kya hai, aur kaun karta hai?',
    'Der se khulne wale app ko checker ke restart se kaise bachayein?',
    'App band hote waqt requests kyun girti hain — aur sahi kram kya hai?',
  ],
  lesson: [
    `<h3>🧭 Sawaal pod ke baare mein hai. DB ke baare mein nahi.</h3>
     <p>Pichhle level ka hisaab (slow motion, har page par 26 requests):</p>
     <pre>ek hi /healthz, DB se poochh ke      → 3 restart · /home 26 mein se 10 safal
do raaste, /readyz DB se poochh ke   → 0 restart · /home 26 mein se 16 safal</pre>
     <p>Dono mein /home band hui — jise DB chahiye hi nahi. Wajah: DB ke girte hi <b>teeno pods ne ek saath</b> kaha "traffic mat bhejo".</p>
     <pre>is level ka setup, wahi 5 second ki gadbad:
/readyz sirf pod ka apna haal bataye   → 0 restart · /home 26 mein se 26 safal</pre>
     <p class="tip">👉 Is level mein teen cheezein hain: jawab mein kya rakhein, der se khulne wale app ka kya karein, aur band hote waqt kya karein. Teeno slow motion mein.</p>`,
  ],
  stages: [
    /* ---------------- 1. jawab mein kya rakhein ---------------- */
    {
      type: 'dryrun',
      title: '👣 Dry run — DB ki gadbad ko health ke jawab se bahar rakho',
      goal: 'Wahi teen pods, wahi 5 second ki gadbad (2.50 s se 7.50 s). Teen naye setup dekhoge. Har baar dekho: <b>kitne pods traffic paa rahe hain</b>, aur <b>/home ka kya hua</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'setup', label: 'Setup' },
        { id: 'ready', label: '"Traffic bhejein?" ka jawab' },
        { id: 'eps', label: 'Traffic paane wale pods' },
        { id: 'home', label: '/home (DB nahi chahiye)' },
        { id: 'orders', label: '/orders (DB chahiye)' },
      ],
      steps: [
        {
          clock: 'sawaal dobara padho',
          say: 'Sawaal hai: <b>"kya is pod ko traffic bhejein?"</b> Yeh sawaal <b>pod</b> ke baare mein hai. DB ke baare mein nahi.<br><br>Naya setup: <code>/readyz</code> sirf pod ka apna haal bataye, DB se poochhe bina. Aur DB band ho, toh <code>/orders</code> khud apni request par bata de: <b>503</b>.',
          nodes: Object.assign({ chk: { tone: 'ok', badge: '/livez aur /readyz' }, db: { tone: 'ok', badge: 'theek' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { setup: 'dono sawaal DB ko chhute hi nahi', ready: '—', eps: 'pod-1 · pod-2 · pod-3', home: '—', orders: '—' },
          ask: {
            q: 'DB band hai. Ek /orders request pod-2 par pahunchti hai, aur ek /home request pod-1 par. Naye setup mein kya hoga?',
            choices: [
              '/orders ko 503 milega, /home chalegi — DB ki gadbad ab poore pod ko traffic se nahi hataati',
              'Dono ko 503 milega — shared DB band hote hi /readyz phir teeno pods ko naya traffic dena rok dega',
              'Dono ko 200 milega — /readyz haan kahe toh /orders ka DB wala kaam bhi sahi maana jaayega',
              '/orders par pod restart hoga, /home chalegi — user ka 503 zinda hone ka fail gina jaayega',
            ],
            answer: 0,
            hint: '/home ko kya chahiye? Aur naye setup mein pods "traffic bhejein?" par kya keh rahe hain?',
            explain: 'Naya /readyz DB se nahi poochhta, toh pods traffic paate rehte hain. /orders ko DB nahi milta aur pod 503 deta hai. /home ko DB nahi chahiye, toh /home chalti hai.',
            choiceExplanations: [
              'Naya /readyz DB se nahi poochhta, toh pods traffic paate rehte hain. /orders ko DB nahi milta aur pod 503 deta hai. /home ko DB nahi chahiye, toh /home chalti hai.',
              'Naye setup mein /readyz ka jawab DB par nirbhar nahi hai. DB band hone se pods traffic se nahi hatenge.',
              '/readyz ka haan DB theek hone ka saboot nahi. /orders ko apne kaam ke liye DB phir bhi chahiye.',
              'User ki /orders request ka 503 liveness ka fail nahi hai. Checker alag health raasta kholta hai.',
            ],
          },
        },
        {
          clock: '2.50–7.25 s',
          say: 'DB 5 second band raha. Har second checker ne poochha, aur har baar:<br><br><code>zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓</code><br><br>Teeno pods traffic paate rahe. <b>/home:</b> har request ✓. <b>/orders:</b> har request ✗ — pod ne khud 503 diya.',
          flows: asked('ok', '✓ ✓ ✓', false),
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'traffic bhejein? ✓ ✓ ✓' }, db: { tone: 'bad', badge: 'band' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { ready: '✓ ✓ ✓', home: '✓', orders: '✗ 503 — pod ne khud diya' },
        },
        {
          clock: '7.50–7.75 s',
          say: `✅ DB wapas. 7.75 s ki /orders request: ✓ — DB ke <b>0.25 s baad</b>. Checker ke agle sawaal ka intezaar nahi karna pada: pods traffic se kabhi bahar gaye hi nahi the.
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>/home safal</th><th>/orders safal</th><th>Restart</th><th>/orders theek, DB ke baad</th></tr>
              <tr><td>Ek hi /healthz, DB se poochh ke</td><td>10</td><td>9</td><td>3</td><td>3.75 s</td></tr>
              <tr><td>Do raaste, /readyz DB se poochh ke</td><td>16</td><td>15</td><td>0</td><td>0.75 s</td></tr>
              <tr><td>Dono sawaal DB ko chhute hi nahi</td><td><b>26</b></td><td><b>16</b></td><td>0</td><td><b>0.25 s</b></td></tr>
            </table></div>
            (Har page par 26 requests.) DB band rehne ke dauraan /orders ki 10 requests aayi thi. /orders ke liye 16 se zyada mumkin hi nahi tha.`,
          nodes: { db: { tone: 'ok', badge: 'theek' } },
          vars: { home: '26 mein se 26 safal', orders: '26 mein se 16 safal' },
        },
        {
          clock: 'doosra bachav',
          say: 'Kabhi-kabhi "traffic bhejein?" ke jawab mein DB rakhna hi padta hai — ya kisi ne pehle se rakh diya hota hai. Tab ek doosra bachav <b>load balancer</b> mein hota hai.<br><br>Niyam: <b>agar ek bhi pod READY nahi hai, toh health ko bhool jao aur saare pods ko bhejo.</b><br><br>Soch: jab <i>saare</i> pods ek saath "nahi" keh rahe hon, toh shayad kharabi pods mein nahi hai.',
          nodes: Object.assign({ chk: { tone: 'ok', badge: '/readyz DB se poochh ke' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { setup: '/readyz DB se poochh ke + load balancer ka naya niyam', ready: '—', home: '—', orders: '—' },
          ask: {
            q: 'DB band hua. Teeno pods NOT READY. Ek /home request aayi. Naye niyam ke saath kya hoga?',
            choices: [
              'Load balancer /home kisi pod ko bhejega — koi READY na ho toh sab pods ko bhejne ka niyam hai',
              'Load balancer /home ko mana karega — aakhri READY pod ke hatne par bhi traffic rokna hi hai',
              'Load balancer /home rok kar rakhega — DB theek hone par ruki request kisi pod ko bheji jaayegi',
              'Load balancer /home bas pichhle READY pod ko bhejega — naya niyam purani sehat yaad rakhega',
            ],
            answer: 0,
            hint: 'Niyam dobara padho. Kitne pods READY hain? Tab load balancer kya karta hai?',
            explain: 'Is lab ka naya niyam hai: koi READY pod na ho toh bhi pods ko traffic bhejo. Pods chal rahe hain aur /home ko DB nahi chahiye, toh /home chalti hai. Is tareeke ka naam fail open hai.',
            choiceExplanations: [
              'Is lab ka naya niyam hai: koi READY pod na ho toh bhi pods ko traffic bhejo. Pods chal rahe hain aur /home ko DB nahi chahiye, toh /home chalti hai. Is tareeke ka naam fail open hai.',
              'Traffic rokna pehle wala niyam tha. Naya niyam aakhri READY pod ke hatne par sab pods ko traffic dene lagta hai.',
              'Lab ka load balancer DB ke lautne tak request sambhaal kar nahi rakhta. Naya niyam abhi kisi pod ko request bhejta hai.',
              'Naya niyam pichhla READY pod yaad karke nahi chunta. Koi READY na ho toh saare pods se chunta hai.',
            ],
          },
        },
        {
          clock: 'fail open',
          say: `Nateeja: /home 26 mein se <b>26</b> safal · /orders 26 mein se 16 · restart 0 · /orders DB ke 0.25 s baad theek. Wahi number jo "DB ko chhute hi nahi" wale setup ke the.<br><br>
            Kaun fail open karta hai? (Documentation se — is lab mein yeh chalaye nahi gaye.)
            <ul>
              <li><b>AWS Application Load Balancer:</b> jab target group ke saare targets unhealthy hon, toh load balancer saare targets ko bhejta hai.</li>
              <li><b>Envoy:</b> jab healthy hosts ek hadd se kam reh jaayein, toh Envoy health ko andekha karke sab hosts mein baant-ta hai. Is hadd ka naam panic threshold hai; default 50%.</li>
              <li><b>Kubernetes ka Service: nahi karta.</b> Koi pod READY nahi → connection hi nahi banta.</li>
            </ul>`,
          flows: asked('slow', '✗ ✗ ✗', false),
          nodes: Object.assign({ chk: { tone: 'slow', badge: 'traffic bhejein? ✗ ✗ ✗' }, db: { tone: 'bad', badge: 'band' } }, pods({ tone: 'slow', badge: 'NOT READY · traffic ✓' })),
          vars: { ready: '✗ ✗ ✗', eps: 'koi READY nahi → fail open: teeno', home: '26 mein se 26 safal', orders: '26 mein se 16 safal' },
        },
        {
          clock: 'yaad rakha jawab',
          say: `Ek aur setup aksar sujhaya jaata hai: <code>/readyz</code> har baar DB se na poochhe. App apni ghadi se <b>har 2 second par ek baar</b> DB se poochhe, jawab yaad rakhe, aur <code>/readyz</code> yaad se jawab de. (Fayda: DB par sawaalon ka bojh ghat-ta hai — level 5 mein naapenge.)<br><br>Gadbad ke waqt slow motion ki lines:
            <pre>2.50 s  💥 DB band
4.20 s  🗒️ pods ne DB se poochha (apni ghadi se, har 2 s) → yaad mein ab: "DB band"
5.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✗ ✗ ✗
5.00 s     → pod-1, pod-2, pod-3: traffic band (NOT READY)
7.50 s  ✅ DB wapas
8.20 s  🗒️ pods ne DB se poochha (apni ghadi se, har 2 s) → yaad mein ab: "DB theek"
9.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓
9.00 s     → pod-1, pod-2, pod-3: traffic wapas (READY)</pre>`,
          flows: asked('slow', 'yaad se', false),
          nodes: Object.assign({ chk: { tone: 'slow', badge: 'traffic bhejein? ✗ ✗ ✗' }, db: { tone: 'ok', badge: 'theek (7.50 s se)' } }, pods({ tone: 'slow', badge: 'yaad: "DB band"' })),
          vars: { setup: '/readyz yaad se (app har 2 s par DB se poochhta hai)', ready: '✗ ✗ ✗ (5.00 s se 9.00 s)', eps: 'koi nahi', home: '26 mein se 18 safal', orders: '26 mein se 13 safal' },
          ask: {
            q: 'DB 2.50 s par band hua, par pods 5.00 s par traffic se bahar hue. DB 7.50 s par aaya, par pods 9.00 s par wapas aaye. Der kahan se aayi?',
            choices: [
              'App ka yaad rakha jawab purana tha; checker ne bhi agle sawaal par badla hua jawab dekha',
              'DB band aur chalu bas checker ke sawaal par hota hai; DB ka apna samay alag maana nahi jaata',
              'App ko taaza DB jawab mil chuka tha; load balancer ne har jawab par ek tay deri jod di',
              'Checker ne DB ke fail hote hi app ki ghadi roki; DB lautne par ghadi phir chala di',
            ],
            answer: 0,
            hint: 'App DB se kab-kab poochhta hai? Aur beech ke waqt mein /readyz kya jawab deta hai?',
            explain: 'App har 2 second par DB se poochhta hai; checker har second par app se. Dono ghadiyan alag hain. App ne band DB 4.20 s par dekha, checker ne 5.00 s par. Wapsi app ne 8.20 s par dekhi, checker ne 9.00 s par. Yaad se jawab sasta hai, par purana ho sakta hai.',
            choiceExplanations: [
              'App har 2 second par DB se poochhta hai; checker har second par app se. Dono ghadiyan alag hain. App ne band DB 4.20 s par dekha, checker ne 5.00 s par. Wapsi app ne 8.20 s par dekhi, checker ne 9.00 s par. Yaad se jawab sasta hai, par purana ho sakta hai.',
              'DB 2.50 s par band aur 7.50 s par chalu hua. DB ka haal checker ke sawaal se nahi badalta.',
              'Deri do ghadiyon se aayi: pehle app ki 2 second wali ghadi, phir checker ki agli baari. Load balancer ne koi tay deri nahi jodi.',
              'App har 2 second par poochhta raha. Checker app ki ghadi band ya chalu nahi karta.',
            ],
          },
        },
        {
          clock: 'paanchon setup',
          say: `Slow motion ke paanchon setup, ek jagah (har page par 26 requests):
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>/home safal</th><th>/orders safal</th><th>Restart</th><th>/orders theek, DB ke baad</th></tr>
              <tr><td>Ek hi /healthz, DB se poochh ke</td><td>10</td><td>9</td><td>3</td><td>3.75 s</td></tr>
              <tr><td>/readyz DB se poochh ke</td><td>16</td><td>15</td><td>0</td><td>0.75 s</td></tr>
              <tr><td>/readyz yaad se (har 2 s)</td><td>18</td><td>13</td><td>0</td><td>1.75 s</td></tr>
              <tr><td>/readyz DB se + load balancer fail open</td><td><b>26</b></td><td>16</td><td>0</td><td>0.25 s</td></tr>
              <tr><td>Dono sawaal DB ko chhute hi nahi</td><td><b>26</b></td><td>16</td><td>0</td><td>0.25 s</td></tr>
            </table></div>
            Yaad wale setup mein /home thodi der aur chali (18), par /orders der se lauti (13).`,
          nodes: Object.assign({ chk: { tone: 'ok', badge: 'paanch setup' }, db: { tone: 'ok', badge: 'theek' } }, pods({ tone: 'ok', badge: 'READY' })),
          vars: { setup: 'paanchon', ready: 'upar ki table', eps: '—', home: '10 · 16 · 18 · 26 · 26', orders: '9 · 15 · 13 · 16 · 16' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi paanch setup, asli raftaar par: 3 pods, har page par 40 requests/second, DB 5 second band. (Teen run ka dayra.)
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>/home safal, DB band ke dauraan</th><th>Restart</th><th>/orders theek, DB ke baad</th></tr>
              <tr><td>Liveness DB check karta hai</td><td>19.0–19.5%</td><td>3</td><td>4.0–5.0 s</td></tr>
              <tr><td>Sirf readiness DB check karta hai</td><td>17.5–19.5%</td><td>0</td><td>0.9 s</td></tr>
              <tr><td>Readiness yaad se (DB har 2 s)</td><td>39.5%</td><td>0</td><td>2.0–3.0 s</td></tr>
              <tr><td>Readiness DB check + fail open</td><td><b>100%</b></td><td>0</td><td>0.0 s</td></tr>
              <tr><td>Dono shallow, app khud 503 deta hai</td><td><b>100%</b></td><td>0</td><td>0.0 s</td></tr>
            </table></div>`,
          vars: { setup: 'lab: paanchon', ready: 'lab ki table', eps: 'lab: 3 pods', home: 'lab: 19.0–19.5% se 100% tak', orders: 'lab: DB ke 4.0–5.0 s baad → 0.0 s baad' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "traffic bhejein?" ka jawab <b>pod ke apne haal</b> se do. Shared cheez (DB) ki gadbad ko <b>request ke jawab</b> mein dikhao: jis page ko DB chahiye, wahi page 503 de. Load balancer ka <b>fail open</b> doosra bachav hai: saare pods ek saath "nahi" kahein, toh sab ko bhejo.',
    },

    /* ---------------- 2. dheema boot ---------------- */
    {
      type: 'dryrun',
      title: '🐢 Dheema boot — checker ne app ko khulne se pehle hi maar diya',
      goal: 'Ek pod, jise khulne mein waqt lagta hai. Dekho ki "zinda ho?" wala sawaal kab pehli baar poochha jaata hai — aur us waqt app ka port khula hai ya nahi.',
      vars: [
        { id: 'when', label: '"Zinda ho?" pehli baar kab' },
        { id: 'boot', label: 'App ko khulne mein' },
        { id: 'restarts', label: 'Restart' },
        { id: 'ready', label: 'Pehli baar READY' },
      ],
      steps: [
        {
          clock: 'naya version',
          say: 'Naya version deploy hua. Is version ko khulne mein <b>8 second</b> lagte hain (framework, connections, cache). Tab tak app ka port band rehta hai.<br><br>Checker ki setting: "zinda ho?" har 2 second par, aur <b>1 "nahi" = restart</b>. Kisi ne likha hai: pod shuru hone ke <b>5 second baad</b> se poochhna shuru karo.',
          vars: { when: 'pod shuru hone ke 5 s baad', boot: '8 s', restarts: '0', ready: '—' },
          ask: {
            q: '5.00 s par checker pehli baar poochhega "zinda ho?". App 8.00 s par khulega. Kya hoga?',
            choices: [
              '5 s par port band milega aur restart hoga — naya boot phir 8 s se shuru hoga',
              '5 s par port band milega, par checker poore 8 s tak app khulne ka intezaar karega',
              '5 s ka fail bas yaad rahega — checker 8 s ke boot ke baad hi restart sochega',
              '5 s par traffic rukega, restart nahi — app 8 s par khul kar READY ho jaayega',
            ],
            answer: 0,
            hint: 'Checker ko bahar se kya dikhta hai: "boot ho raha hai", ya bas "jawab nahi aaya"?',
            explain: 'Is checker ki setting mein zinda hone ka ek fail hi restart ke liye kaafi hai. 5.00 s par port band hai, toh restart hota hai. Checker ko boot ka bacha hua samay nahi pata.',
            choiceExplanations: [
              'Is checker ki setting mein zinda hone ka ek fail hi restart ke liye kaafi hai. 5.00 s par port band hai, toh restart hota hai. Checker ko boot ka bacha hua samay nahi pata.',
              'Setting 5 second ki hai. Checker app ka 8 second wala boot dekhkar intezaar khud nahi badhaata.',
              'Is run mein ek fail par restart hai. Boot khatam hone tak fail sambhaal kar rakhne ki chhoot nahi di gayi.',
              '"Zinda ho?" fail hua hai. Traffic rokna doosre sawaal ka kaam hai; is fail par restart hoga.',
            ],
          },
        },
        {
          clock: '0–25 s',
          say: `<pre> 5.00 s  🩺 zinda ho? ✗ (port band) → RESTART #1
10.00 s  🩺 zinda ho? ✗ (port band) → RESTART #2 — 1 s ruk ke
16.00 s  🩺 zinda ho? ✗ (port band) → RESTART #3 — 2 s ruk ke
23.00 s  🩺 zinda ho? ✗ (port band) → RESTART #4 — 4 s ruk ke</pre>
            Har restart ke baad checker thoda zyada rukta hai: 0, 1, 2, 4 second. (Asli Kubernetes mein: 10, 20, 40 second … 5 minute tak.)<br><br>25 second mein <b>4 restart</b>, aur pod ek baar bhi READY nahi hua. Kubernetes is haalat ko <b>CrashLoopBackOff</b> dikhata hai.`,
          vars: { restarts: '4', ready: 'kabhi nahi' },
        },
        {
          clock: 'andaaza badhao',
          say: '"Theek hai — 5 ki jagah <b>10 second</b> baad se poochho."<br><br>App 8.00 s par khula. 8.00 s par READY. 10.00 s par "zinda ho?" ✓. Restart: 0.<br><br>Chal gaya.',
          vars: { when: 'pod shuru hone ke 10 s baad', restarts: '0', ready: '8.00 s' },
          ask: {
            q: 'Ek din boot mein 12 second lage (DB migration, thandi cache, bhari machine). Setting wahi hai: 10 second baad se poochho. Kya hoga?',
            choices: [
              '10 s par restart hoga — port abhi band hai; har naya boot phir 12 s maangega',
              '10 s par checker ruk jaayega — app ke 12 s maangne par delay khud badh jaayega',
              '10 s par fail yaad rahega — checker agle 2 s ke sawaal tak restart nahi karega',
              '10 s par traffic rukega — port 12 s par khulne tak restart ki ginti nahi badhegi',
            ],
            answer: 0,
            hint: '10.00 s par port khula hoga ya band? Aur checker ka niyam kya hai: kitne "nahi" par restart?',
            explain: 'Delay 10 second tay hai, boot 12 second ka. Port khulne se pehle pehla sawaal fail hota hai aur ek fail par restart ho jaata hai. Lambi shuruaat ki chhoot alag deni padegi.',
            choiceExplanations: [
              'Delay 10 second tay hai, boot 12 second ka. Port khulne se pehle pehla sawaal fail hota hai aur ek fail par restart ho jaata hai. Lambi shuruaat ki chhoot alag deni padegi.',
              'Checker boot ki zaroorat dekhkar tay delay ko khud nahi badalta. 10 second ki setting 10 hi rehti hai.',
              'Ek fail par restart ki setting hai. Agla sawaal poochhne tak pehla fail maaf nahi hota.',
              'Is sawaal ka fail restart karwaata hai. Traffic ka faisla alag hai; band port ke saath boot bach nahi jaata.',
            ],
          },
        },
        {
          clock: 'teesra sawaal',
          say: `Ilaaj: ek <b>teesra sawaal</b>, sirf shuruaat ke liye: <b>"shuru ho gaye?"</b>
            <ul>
              <li>Har 1 second par poochho. Lagataar 30 "nahi" par hi restart — yaani lagbhag 30 second ki chhoot.</li>
              <li>Jab tak is sawaal ka jawab "haan" na aaye, baaki dono sawaal <b>band</b>.</li>
              <li>Pehle "haan" ke baad yeh sawaal dobara nahi poochha jaata. "Zinda ho?" apne tez niyam se shuru ho jaata hai.</li>
            </ul>`,
          vars: { when: '"shuru ho gaye?" ke pehle "haan" ke baad', boot: '12 s', restarts: '—', ready: '—' },
        },
        {
          clock: '12.00 s',
          say: `Boot 12 second:
            <pre>12.00 s  🚪 app khul gaya (port chalu)
12.00 s  🩺 shuru ho gaye? ✓ — pehle 12 baar ✗ (chhoot 30 tak; koi restart nahi) → ab baaki dono sawaal
12.00 s  🩺 zinda ho? ✓ (aage har 2 s par)
12.00 s  🩺 traffic bhejein? ✓ → READY</pre>
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Boot</th><th>Pehli baar READY</th><th>Restart (25 s mein)</th></tr>
              <tr><td>"Zinda ho?" 5 s baad se</td><td>8 s</td><td>kabhi nahi</td><td>4</td></tr>
              <tr><td>"Zinda ho?" 10 s baad se</td><td>8 s</td><td>8.00 s</td><td>0</td></tr>
              <tr><td>"Zinda ho?" 10 s baad se</td><td>12 s</td><td>kabhi nahi</td><td>2</td></tr>
              <tr><td>"Shuru ho gaye?" wala sawaal</td><td>12 s</td><td><b>12.00 s</b></td><td><b>0</b></td></tr>
            </table></div>`,
          vars: { restarts: '0', ready: '12.00 s' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab ke mini cluster par wahi chaar setting, asli pod processes ke saath (teen run):
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Pehli baar READY</th><th>Restart</th><th>25 s par haal</th></tr>
              <tr><td>liveness delay 5 s, boot 8 s</td><td>kabhi nahi</td><td>4</td><td>CrashLoopBackOff</td></tr>
              <tr><td>liveness delay 10 s, boot 8 s</td><td>8.1 s</td><td>0</td><td>Running, READY</td></tr>
              <tr><td>liveness delay 10 s, boot 12 s</td><td>kabhi nahi</td><td>2</td><td>Running, NOT READY</td></tr>
              <tr><td>startupProbe (1 s × 30), boot 12 s</td><td><b>12.1 s</b></td><td><b>0</b></td><td>Running, READY</td></tr>
            </table></div>`,
          vars: { when: 'lab: chaaron setting', boot: 'lab: 8 s ya 12 s', restarts: 'lab: 4 · 0 · 2 · 0', ready: 'lab: startupProbe ke saath 12.1 s' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "abhi khul raha hai" aur "atak gaya hai" bahar se ek jaise dikhte hain. Isliye shuruaat ka sawaal alag rakho, lambi chhoot ke saath — aur "zinda ho?" ko tez rehne do. Shuruaat wale sawaal ka naam: <b>startup probe</b>.',
    },

    /* ---------------- 3. band hona ---------------- */
    {
      type: 'dryrun',
      title: '🚪 Band hona — load balancer ko khabar der se milti hai',
      goal: 'Deploy ke waqt purana pod band hota hai. Do pods: pod-old aur pod-new. Har 0.25 second par ek request, baari-baari. Dekho ki kaunsi requests girti hain — aur kyun.',
      vars: [
        { id: 'app', label: 'Signal milne par app' },
        { id: 'lb', label: 'Load balancer ko khabar' },
        { id: 'old', label: 'pod-old ka port band' },
        { id: 'fail', label: 'Fail (14 requests mein se)' },
      ],
      steps: [
        {
          clock: 'deploy',
          say: 'Naya version aa raha hai. Purane pod (pod-old) ko band hone ka signal milta hai. Is signal ka naam <b>SIGTERM</b> hai.<br><br>Ek baat: load balancer ko "pod-old ab nahi hai" ki khabar <b>turant nahi</b> milti. Is slow motion mein khabar <b>1 second der se</b> pahunchti hai.<br><br>Pehla app: SIGTERM milte hi band.',
          vars: { app: 'turant band', lb: 'SIGTERM ke 1 s baad (2.00 s par)', old: '1.00 s par', fail: '?' },
          ask: {
            q: '1.00 s par SIGTERM aaya aur pod-old turant band hua. Load balancer ko khabar 2.00 s par milegi. Beech mein pod-old ki baari wali requests ka kya hoga?',
            choices: [
              'Pod-old par hi jaayengi aur fail hongi — load balancer ki list mein pod-old abhi hai',
              'Pod-new par seedhe chali jaayengi — SIGTERM milte hi load balancer ki list bhi badal gayi',
              'Pod-old par fail hokar pod-new par phir jaayengi — load balancer khud dobara bhejega',
              'Load balancer par ruki rahengi — list badalne se pehle koi nayi request nahi bhejega',
            ],
            answer: 0,
            hint: 'Load balancer ke hisaab se 1.00 s aur 2.00 s ke beech kitne pods hain?',
            explain: 'Pod-old ka port band ho gaya, par load balancer ko khabar 2.00 s par milti hai. Beech mein pod-old ki baari aayi toh request band port tak jaayegi. Lab mein 14 mein se 2 requests fail hui.',
            choiceExplanations: [
              'Pod-old ka port band ho gaya, par load balancer ko khabar 2.00 s par milti hai. Beech mein pod-old ki baari aayi toh request band port tak jaayegi. Lab mein 14 mein se 2 requests fail hui.',
              'SIGTERM app ko mila hai; load balancer ki list turant nahi badli. Sawaal mein khabar ki deri 1 second hai.',
              'Lab mein fail request khud dobara bhejne ka niyam nahi. Asli setup mein dobara bhejna alag setting aur kaam ki suraksha par nirbhar hai.',
              'Lab ka load balancer purani list se requests bhejta rehta hai. List badalne tak sab requests rokne ka niyam nahi.',
            ],
          },
        },
        {
          clock: 'thoda ruk ke',
          say: 'Sujhaav: "SIGTERM ke baad <b>0.5 second</b> tak jawab dete raho, phir band."<br><br>#5 (1.10 s) → pod-old ✓. Par 1.50 s par port band ho gaya, aur khabar 2.00 s par pahunchi: #7 (1.60 s) → pod-old ✗.<br><br>14 mein se <b>1 fail</b>. Kam hua, khatam nahi.',
          vars: { app: '0.5 s tak jawab, phir band', old: '1.50 s par', fail: '1' },
        },
        {
          clock: 'khabar se zyada der',
          say: `SIGTERM ke baad <b>2 second</b> tak jawab: #5 ✓, #7 ✓. 2.00 s par load balancer ko khabar pahunchi. 3.00 s par pod-old band hua — tab tak pod-old par koi request aa hi nahi rahi thi.
            <div class="dr-scroll"><table>
              <tr><th>SIGTERM par app</th><th>pod-old band</th><th>Khabar pahunchi</th><th>Fail (14 mein se)</th></tr>
              <tr><td>Turant band</td><td>1.00 s</td><td>2.00 s</td><td>2</td></tr>
              <tr><td>0.5 s tak jawab</td><td>1.50 s</td><td>2.00 s</td><td>1</td></tr>
              <tr><td>2 s tak jawab</td><td>3.00 s</td><td>2.00 s</td><td><b>0</b></td></tr>
            </table></div>`,
          vars: { app: '2 s tak jawab, phir band', old: '3.00 s par', fail: '0' },
          ask: {
            q: 'SIGTERM ke baad kitni der tak jawab dete rehna kaafi hai?',
            choices: [
              'Khabar ki naapi hui deri tak jawab do; phir chalte kaam poore karke band ho',
              'Khabar bhejte hi band ho jaao; chalte kaam load balancer phir sambhaal lega',
              'Chalte kaam poore hote hi band ho; khabar ki deri ke liye rukna zaroori nahi',
              'Khabar ki deri tak ruko aur band ho; chalte kaam ka samay alag ginne ki zaroorat nahi',
            ],
            answer: 0,
            hint: 'Table mein "pod-old band" aur "khabar pahunchi" ke samay milao. Kis row mein port khabar se pehle band hua?',
            explain: 'Khabar pahunchne se pehle port band na ho. Khabar ki deri naapo, thodi chhoot rakho, aur chalte kaam poore hone ka samay bhi do. Kul samay band hone ki mili hui chhoot mein aana chahiye. Lab mein 0.5 s kam tha, 2 s kaafi; har setup ke liye 2 s pakka niyam nahi.',
            choiceExplanations: [
              'Khabar pahunchne se pehle port band na ho. Khabar ki deri naapo, thodi chhoot rakho, aur chalte kaam poore hone ka samay bhi do. Kul samay band hone ki mili hui chhoot mein aana chahiye. Lab mein 0.5 s kam tha, 2 s kaafi; har setup ke liye 2 s pakka niyam nahi.',
              'Khabar bhejna aur khabar pahunchna alag pal hain. Beech ki nayi requests band port par fail ho sakti hain.',
              'Purane kaam poore ho gaye tab bhi purani list se nayi request aa sakti hai. Khabar pahunchne ka samay bhi chahiye.',
              'Khabar pahunchne par naya traffic ruk sakta hai, par pehle liya hua kaam abhi chal sakta hai. Chalte kaam ko bhi poora hone ka samay do.',
            ],
          },
        },
        {
          clock: 'asli raftaar',
          say: `Lab ke mini cluster par: 3 pods, ek-ek karke badle gaye, 100 requests/second, khabar ~1 second der se. (Teen run.)
            <div class="dr-scroll"><table>
              <tr><th>SIGTERM par app</th><th>Requests</th><th>Fail</th></tr>
              <tr><td>Turant band</td><td>~1,018</td><td><b>75</b></td></tr>
              <tr><td>"Traffic bhejein?" par "nahi" + 2 s tak jawab, phir band</td><td>~1,018</td><td><b>0</b></td></tr>
            </table></div>
            Yeh <b>har deploy</b> ka hisaab hai.`,
          vars: { app: 'lab: dono', lb: 'lab: ~1 s der se', old: '—', fail: 'lab: 75 → 0' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> band hone ka kram: (1) signal aaya → "traffic bhejein?" par "nahi" kaho, (2) jawab dete raho jab tak load balancer ko khabar na pahunch jaaye, (3) chalte kaam poore karo, (4) ab band ho. Is tareeke ka naam: <b>graceful shutdown</b>.',
    },

    /* ---------------- 4. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — teeno slow motion, apni machine par',
      project: '43-health-checks',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi chalao. Pehle DB ki gadbad do setup mein, phir dheema boot, phir band hona.',
      why: '<code>lib/checker.js</code> = checker ka niyam (kitne "nahi" par kya karna hai). Teeno slow motion tools yahi niyam chalate hain. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Ghadi tay hai, isliye tumhara output dry run se milega. <code>--fast</code> lagao toh tool bina ruke chalta hai.',
      steps: [
        { text: 'Ek hi /healthz, DB se poochh ke. Dekho 3.00 s, 5.00 s aur 11.00 s par kya hua.', cmd: 'cd docker-labs/43-health-checks && node tools/slowmo.js --mode deep-live', expect: "3 pods (boot 6 s) · checker har 1 s par poochhta hai: \"zinda ho?\" (3 fail → restart) aur \"traffic bhejein?\" (1 fail → traffic band)\nDB 2.50 s se 7.50 s tak band · har 0.5 s par ek /home (DB nahi chahiye) aur ek /orders (DB chahiye)\n\n=== ek hi deep /healthz — \"zinda ho?\" aur \"traffic bhejein?\" dono DB se poochh ke ===\n    0.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    0.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    0.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n    1.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    1.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n    1.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    2.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    2.25 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n    2.50 s  💥 DB band\n    2.75 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)\n    3.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 1/3) · traffic bhejein? ✗ ✗ ✗\n    3.00 s     → pod-1, pod-2, pod-3: traffic band (NOT READY)\n    3.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    3.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    4.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 2/3) · traffic bhejein? ✗ ✗ ✗\n    4.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    4.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    5.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 3/3) · traffic bhejein? ✗ ✗ ✗\n    5.00 s     → pod-1, pod-2, pod-3: RESTART — dobara boot, 6 s lagenge\n    5.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    5.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    6.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)\n    6.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    6.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    7.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)\n    7.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    7.50 s  ✅ DB wapas\n    7.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    8.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)\n    8.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    8.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    9.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)\n    9.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n    9.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n   10.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)\n   10.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n   10.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi\n   11.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✓ ✓ ✓\n   11.00 s     → pod-1, pod-2, pod-3: traffic wapas (READY)\n   11.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n   11.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n   12.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✓ ✓ ✓\n   12.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n   12.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n   13.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n   nateeja → /home: 26 mein se 10 safal (fail: 3.25 s se 10.75 s tak) · /orders: 26 mein se 9 safal · restarts 3\n             DB 7.50 s par wapas → /orders phir se safal: 11.25 s par (DB ke 3.75 s baad)" },
        { text: 'Ab dono sawaal DB ko chhute hi nahi. /home wala khaana dekho.', cmd: 'node tools/slowmo.js --mode shallow', expect: "3 pods (boot 6 s) · checker har 1 s par poochhta hai: \"zinda ho?\" (3 fail → restart) aur \"traffic bhejein?\" (1 fail → traffic band)\nDB 2.50 s se 7.50 s tak band · har 0.5 s par ek /home (DB nahi chahiye) aur ek /orders (DB chahiye)\n\n=== dono sawaal DB ko chhute hi nahi · DB gaya toh /orders khud 503 deta hai ===\n    0.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    0.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    0.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n    1.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    1.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n    1.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    2.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    2.25 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n    2.50 s  💥 DB band\n    2.75 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)\n    3.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    3.25 s  /home ✓ (pod-1)                /orders ✗ (pod-2: DB nahi mila)\n    3.75 s  /home ✓ (pod-3)                /orders ✗ (pod-1: DB nahi mila)\n    4.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    4.25 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)\n    4.75 s  /home ✓ (pod-1)                /orders ✗ (pod-2: DB nahi mila)\n    5.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    5.25 s  /home ✓ (pod-3)                /orders ✗ (pod-1: DB nahi mila)\n    5.75 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)\n    6.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    6.25 s  /home ✓ (pod-1)                /orders ✗ (pod-2: DB nahi mila)\n    6.75 s  /home ✓ (pod-3)                /orders ✗ (pod-1: DB nahi mila)\n    7.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    7.25 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)\n    7.50 s  ✅ DB wapas\n    7.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    8.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    8.25 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n    8.75 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n    9.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n    9.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n    9.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n   10.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n   10.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n   10.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n   11.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n   11.25 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n   11.75 s  /home ✓ (pod-2)                /orders ✓ (pod-3)\n   12.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n   12.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)\n   12.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)\n   13.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓\n   nateeja → /home: 26 mein se 26 safal (kabhi fail nahi) · /orders: 26 mein se 16 safal · restarts 0\n             DB 7.50 s par wapas → /orders phir se safal: 7.75 s par (DB ke 0.25 s baad)" },
        { text: 'Dheema boot: chaaron setting.', cmd: 'node tools/slowmo-boot.js', expect: "1 pod · \"zinda ho?\" har 2 s, 1 fail = restart · restart ke beech intezaar 0, 1, 2, 4 s (asli Kubernetes: 10, 20, 40 s …) · 25 s dekha\n\n=== \"zinda ho?\" pod shuru hone ke 5 s baad se · boot 8 s ===\n    0.00 s  ▶️ pod shuru — boot 8 s (8.00 s par khulega)\n    5.00 s  🩺 zinda ho? ✗ (port band) → RESTART #1\n    5.00 s  ▶️ pod shuru — boot 8 s (13.00 s par khulega)\n   10.00 s  🩺 zinda ho? ✗ (port band) → RESTART #2 — 1 s ruk ke\n   11.00 s  ▶️ pod shuru — boot 8 s (19.00 s par khulega)\n   16.00 s  🩺 zinda ho? ✗ (port band) → RESTART #3 — 2 s ruk ke\n   18.00 s  ▶️ pod shuru — boot 8 s (26.00 s par khulega)\n   23.00 s  🩺 zinda ho? ✗ (port band) → RESTART #4 — 4 s ruk ke\n   nateeja → pehli baar READY: kabhi nahi · restarts 4 · 25.00 s par: restart ka intezaar (CrashLoopBackOff)\n\n=== \"zinda ho?\" 10 s baad se · boot 8 s ===\n    0.00 s  ▶️ pod shuru — boot 8 s (8.00 s par khulega)\n    8.00 s  🚪 app khul gaya (port chalu)\n    8.00 s  🩺 traffic bhejein? ✓ → READY\n   10.00 s  🩺 zinda ho? ✓ (aage har 2 s par)\n   nateeja → pehli baar READY: 8.00 s · restarts 0 · 25.00 s par: chal raha hai, READY\n\n=== \"zinda ho?\" 10 s baad se · aaj boot 12 s ===\n    0.00 s  ▶️ pod shuru — boot 12 s (12.00 s par khulega)\n   10.00 s  🩺 zinda ho? ✗ (port band) → RESTART #1\n   10.00 s  ▶️ pod shuru — boot 12 s (22.00 s par khulega)\n   20.00 s  🩺 zinda ho? ✗ (port band) → RESTART #2 — 1 s ruk ke\n   21.00 s  ▶️ pod shuru — boot 12 s (33.00 s par khulega)\n   nateeja → pehli baar READY: kabhi nahi · restarts 2 · 25.00 s par: abhi bhi boot ho raha hai — READY nahi\n\n=== \"shuru ho gaye?\" wala sawaal (har 1 s, 30 fail tak chhoot) · boot 12 s ===\n    0.00 s  ▶️ pod shuru — boot 12 s (12.00 s par khulega)\n   12.00 s  🚪 app khul gaya (port chalu)\n   12.00 s  🩺 shuru ho gaye? ✓ — pehle 12 baar ✗ (chhoot 30 tak; koi restart nahi) → ab baaki dono sawaal\n   12.00 s  🩺 zinda ho? ✓ (aage har 2 s par)\n   12.00 s  🩺 traffic bhejein? ✓ → READY\n   nateeja → pehli baar READY: 12.00 s · restarts 0 · 25.00 s par: chal raha hai, READY" },
        { text: 'Band hona: teeno tareeke.', cmd: 'node tools/slowmo-stop.js', expect: "2 pods · har 0.25 s par ek request, baari-baari · 1.00 s par pod-old ko SIGTERM · load balancer ko khabar 1 s der se (2.00 s par)\n\n=== SIGTERM par turant band ===\n    0.10 s  #1  → pod-old ✓\n    0.35 s  #2  → pod-new ✓\n    0.60 s  #3  → pod-old ✓\n    0.85 s  #4  → pod-new ✓\n    1.00 s  🛑 pod-old ko SIGTERM — app usi pal band\n    1.10 s  #5  → pod-old ✗ (port band: connection refused)\n    1.35 s  #6  → pod-new ✓\n    1.60 s  #7  → pod-old ✗ (port band: connection refused)\n    1.85 s  #8  → pod-new ✓\n    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new\n    2.10 s  #9  → pod-new ✓\n    2.35 s  #10 → pod-new ✓\n    2.60 s  #11 → pod-new ✓\n    2.85 s  #12 → pod-new ✓\n    3.10 s  #13 → pod-new ✓\n    3.35 s  #14 → pod-new ✓\n   nateeja → 14 requests · 2 fail\n\n=== SIGTERM ke baad 0.5 s tak jawab, phir band ===\n    0.10 s  #1  → pod-old ✓\n    0.35 s  #2  → pod-new ✓\n    0.60 s  #3  → pod-old ✓\n    0.85 s  #4  → pod-new ✓\n    1.00 s  🛑 pod-old ko SIGTERM — app 0.5 s tak jawab deta rahega\n    1.10 s  #5  → pod-old ✓\n    1.35 s  #6  → pod-new ✓\n    1.50 s  🚪 pod-old band (port band)\n    1.60 s  #7  → pod-old ✗ (port band: connection refused)\n    1.85 s  #8  → pod-new ✓\n    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new\n    2.10 s  #9  → pod-new ✓\n    2.35 s  #10 → pod-new ✓\n    2.60 s  #11 → pod-new ✓\n    2.85 s  #12 → pod-new ✓\n    3.10 s  #13 → pod-new ✓\n    3.35 s  #14 → pod-new ✓\n   nateeja → 14 requests · 1 fail\n\n=== SIGTERM ke baad 2 s tak jawab, phir band ===\n    0.10 s  #1  → pod-old ✓\n    0.35 s  #2  → pod-new ✓\n    0.60 s  #3  → pod-old ✓\n    0.85 s  #4  → pod-new ✓\n    1.00 s  🛑 pod-old ko SIGTERM — app 2 s tak jawab deta rahega\n    1.10 s  #5  → pod-old ✓\n    1.35 s  #6  → pod-new ✓\n    1.60 s  #7  → pod-old ✓\n    1.85 s  #8  → pod-new ✓\n    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new\n    2.10 s  #9  → pod-new ✓\n    2.35 s  #10 → pod-new ✓\n    2.60 s  #11 → pod-new ✓\n    2.85 s  #12 → pod-new ✓\n    3.00 s  🚪 pod-old band (port band)\n    3.10 s  #13 → pod-new ✓\n    3.35 s  #14 → pod-new ✓\n   nateeja → 14 requests · 0 fail" },
      ],
      observe: {
        q: 'Pehle do slow motion mein DB utni hi der band tha (2.50 s se 7.50 s). Pehle mein /home 26 mein se 10 baar safal hui, doosre mein 26 baar. Kya badla tha?',
        choices: [
          'Health ka jawab DB se alag hua — pods chalte rahe aur /home ko traffic milta raha',
          'DB ki gadbad chhoti hui — health ka jawab pehle jaisa raha, par pods jaldi laut aaye',
          'Pods ki ginti badhi — health ka jawab pehle jaisa raha, par kuch pods bache rahe',
          'Fail requests dobara gayi — health ka jawab pehle jaisa raha, par /home bach gayi',
        ],
        answer: 0,
        explain: 'Dono run mein DB 5 second band tha, pods aur requests bhi barabar the. Doosre run mein health ka jawab DB ko nahi chhoota. /home chalti rahi; /orders DB band hone par phir bhi fail hui.',
        choiceExplanations: [
          'Dono run mein DB 5 second band tha, pods aur requests bhi barabar the. Doosre run mein health ka jawab DB ko nahi chhoota. /home chalti rahi; /orders DB band hone par phir bhi fail hui.',
          'Sawaal mein DB dono baar 2.50 s se 7.50 s tak band tha. Gadbad ki muddat nahi badli.',
          'Dono setup mein teen pods hain. Farak pods ki ginti ka nahi, health ke jawab ka hai.',
          'Lab ne /home ki requests dobara bhejkar nahi bachaayi. Health se DB hataane par pods traffic paate rahe.',
        ],
      },
      lesson: 'Health ka jawab pod ke apne haal se do. Shuruaat ke liye alag sawaal rakho. Band hote waqt khabar pahunchne tak jawab dete raho.',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum "sab check kar lo" se aage sochte ho. 🎤',
    questions: [
      {
        q: '"Readiness probe mein database ka check rakhna chahiye ya nahi?"',
        choices: [
          'Pehle dekho DB ke bina kaunse pages chalte hain aur saare pods hatne par kya hoga',
          'Har DB ko readiness mein rakho — jitne zyada checks, utna sahi traffic ka faisla',
          'DB ko bas liveness mein rakho — DB ki gadbad par restart se service jaldi lautegi',
          'Check jaldi jawab de toh DB rakho — kaunse pages bach sakte hain, sochna zaroori nahi',
        ],
        answer: 0,
        explain: 'Har page ko DB chahiye toh readiness mein DB rakhna theek ho sakta hai. Kuch pages DB ke bina chalte hon toh shared DB ki gadbad sab pods hataakar bache hue pages bhi rok sakti hai. Jawab kitna purana hai aur load balancer ka niyam kya hai, dono dekho.',
        choiceExplanations: [
          'Har page ko DB chahiye toh readiness mein DB rakhna theek ho sakta hai. Kuch pages DB ke bina chalte hon toh shared DB ki gadbad sab pods hataakar bache hue pages bhi rok sakti hai. Jawab kitna purana hai aur load balancer ka niyam kya hai, dono dekho.',
          'Zyada checks ka matlab sahi faisla zaroori nahi. Shared DB fail hote hi saare pods bahar ho sakte hain.',
          'Pods restart karne se bahar ka DB theek nahi hota. Ulta pods dobara khulne ka intezaar bhi badhta hai.',
          'Tez check bhi galat wajah par sab traffic rok sakta hai. DB ke bina bache hue pages ka faisla alag hai.',
        ],
      },
      {
        q: '"initialDelaySeconds se kaam chal jaata hai. Startup probe kyun chahiye?"',
        choices: [
          'Startup probe ki chhoot tak shuruaat jaancho; pass ho toh baaki probes chalao',
          'Startup probe boot jitna bhi lamba ho rukega; fail ki ginti maayne nahi rakhti',
          'Startup probe bas jaldi poochhega; liveness boot ke beech restart karti rahegi',
          'Startup probe lagte hi traffic aayega; app ke khulne ka intezaar zaroori nahi',
        ],
        answer: 0,
        explain: 'Tay delay sirf andaaza hai. Startup probe ke pass hone tak liveness aur readiness nahi chalte. Startup ki chhoot bhi seemit hai: failureThreshold aur periodSeconds boot ko kaafi samay dein; chhoot khatam ho toh restart ho sakta hai.',
        choiceExplanations: [
          'Tay delay sirf andaaza hai. Startup probe ke pass hone tak liveness aur readiness nahi chalte. Startup ki chhoot bhi seemit hai: failureThreshold aur periodSeconds boot ko kaafi samay dein; chhoot khatam ho toh restart ho sakta hai.',
          'Startup ki chhoot bina hadd ki nahi. Lagataar failures ki tay hadd tak pahunchne par restart ho sakta hai.',
          'Startup probe sirf poochhne ki raftaar nahi badalta. Pass hone tak liveness ko rokna zaroori farak hai.',
          'Startup pass hone tak readiness nahi chalti. Startup probe lagna app khulne ya traffic milne ka saboot nahi.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki "traffic bhejein?" ka jawab pod ke apne haal se kyun dena chahiye, aur DB ki gadbad kahan dikhni chahiye',
    'Fail open kya hai, aur kaun karta hai — yeh samjha sakte ho',
    'Dheeme boot ke liye startup probe, aur band hone ka sahi kram bata sakte ho',
  ],
  cards: [
    { front: '"Traffic bhejein?" ke jawab mein kya rakhein?', back: 'Pod ka apna haal. Shared DB nahi: DB gaya toh saare pods ek saath bahar. Slow motion, /home: DB se poochh ke 16/26 · apne haal se 26/26. DB ki gadbad request ke jawab mein dikhao (503).' },
    { front: 'Fail open?', back: 'Load balancer ka niyam: koi pod healthy nahi → sab ko bhejo. AWS ALB karta hai; Envoy 50% se kam healthy par (panic threshold); Kubernetes ka Service nahi karta. Slow motion: /home 26/26.' },
    { front: 'Yaad rakha (cached) readiness?', back: 'DB par bojh ghatata hai. Par jawab 0–2 s purana: gadbad ka pata der se, theek hone ka bhi. "Saare pods ek saath bahar" wahi rehta hai. Slow motion: /orders 13/26, DB ke 1.75 s baad wapsi.' },
    { front: 'Startup probe kyun?', back: '"Khul raha hai" aur "atak gaya" bahar se ek jaise dikhte hain. Startup probe: pass hone tak baaki dono sawaal band, lambi chhoot. Slow motion: boot 12 s → READY 12.00 s, 0 restart (delay 10 s ke saath: 2 restart).' },
    { front: 'Band hone ka kram?', back: 'SIGTERM → "traffic bhejein?" par "nahi" → khabar pahunchne tak jawab dete raho → chalte kaam poore → band. Slow motion: turant band 2 fail · 0.5 s 1 fail · 2 s 0 fail. Lab: 75 → 0 har deploy.' },
  ],
},
]);

})();
