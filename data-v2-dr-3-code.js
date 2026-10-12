/* =====================================================================
   🛡️ Playlist · 1 Resilience — Disaster Recovery · level 3: CODE
   Copy ka niyam (lib/replicator.js), router ka faisla (lib/failover.js), aur apne app mein lagana (tools/mini.js).
   Code ke tukde ASLI files se hain (docker-labs/40-disaster-recovery) — validate.js unhe byte-for-byte milata hai.
   Number us folder ke asli run se hain (slow motion: tools/slowmo*.js aur tools/mini.js; asli raftaar: ex1 aur ex2).
   Lab mein samay chhota kiya gaya hai (lab ke second = asli duniya ke ghante); kram asli hai.
   ===================================================================== */
(function () {

const HERO = [
  { id: 'wr', icon: '✍️', label: 'write()', x: 140, y: 105 },
  { id: 'wt', icon: '📋', label: 'waiting', x: 445, y: 105 },
  { id: 'b', icon: '🏝️', label: 'region B', x: 750, y: 105 },
];

VISUALS['dr-code'] = {
  t: 'write() order rakhta hai aur turant "ho gaya" bolta hai. Copy ka kaam tick() baad mein karta hai. Jab tak order waiting mein hai, woh sirf region A mein hai',
  html: SD.viz.svg(HERO, [{ from: 'wr', to: 'wt' }, { from: 'wt', to: 'b' }], {
    nodes: { wr: { tone: 'ok', badge: 'rakho + ho gaya' }, wt: { tone: 'bad', badge: 'sirf yahan wale' }, b: { tone: 'idle', badge: 'tick() se pahunche' } },
    flows: [{ from: 'wr', to: 'wt', label: 'push', tone: 'ok' }, { from: 'wt', to: 'b', label: 'tick()', tone: 'slow' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'dr-code',
  icon: '💻',
  group: '🌋 Disaster Recovery',
  title: 'Disaster Recovery 3 · Code — jis line par data khota hai',
  badge: 'Copy Lohaar',
  objectives: [
    '"Ho gaya" mil chuka order code mein kahan rakha hota hai — aur region abhi gaya toh kitne orders jaayenge?',
    'Copy fail ho jaaye toh orders ka kya hota hai — async mein, aur sync mein?',
    'Router "region A gaya" kab maanta hai, aur A wapas aaye toh apne aap wapas kyun nahi jaata?',
    'Apne app mein yeh sab kitni lines mein lagta hai?',
  ],
  lesson: [
    `<h3>💻 Jis line par data khota hai</h3>
     <p>Pichhle levels mein dekha: kuch orders ko "ho gaya" mil chuka tha, phir bhi region A ke saath chale gaye. Woh orders us pal kahan rakhe the? Aur kaunsi line ne un orders ko wahan rakha? Aaj yahi code mein dhoondhte hain. Lab folder: <code>docker-labs/40-disaster-recovery/</code></p>
     <pre>lib/replicator.js  ← copy ka niyam: kho gaye orders (RPO) yahin paida hote hain   (43 line)
lib/failover.js    ← router ka faisla: "region A gaya?"                          (16 line)
tools/mini.js      ← apne app mein lagana                                         (line 8–30)</pre>
     <p>Lab ki services aur saare slow motion yahi files chalate hain. Tumne jo number dekhe, unhi lines se aaye. Pehli file mein ek list hai, <code>waiting</code>: jo orders abhi sirf region A mein hain.</p>
     <p class="tip">👉 Ek cheez dhoondte hue padho: <code>write()</code> mein "ho gaya" copy se <b>pehle</b> bola jaata hai, ya <b>baad</b> mein? Do mode hain, toh do jawab.</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/replicator.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/replicator.js — copy ka niyam, line-by-line',
      goal: 'Sawaal: "ho gaya" bolne ke baad bhi order kahan rakha hota hai? Har click par sirf wahi lines chamkengi jo chali. Misaal slow motion wali hai: har 0.5 s par ek order, copy har 1 s par, doosre region tak ek chakkar 0.20 s. Teen jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/40-disaster-recovery/lib/replicator.js',
        file: 'docker-labs/40-disaster-recovery/lib/replicator.js',
        from: 16,
        text: "function createReplicator(opts) {\n  const { ship, mode = 'async', everyMs = 300 } = opts;\n  const orders = new Map();   // is region ka DB\n  let waiting = [];           // sirf yahan, wahan nahi\n  let busy = false;           // ek waqt mein ek hi copy\n  let timer = null;\n\n  // DB mein badlav lagao (dono taraf yahi chalta hai)\n  function apply(change) {\n    if (change.type === 'delete-all') orders.clear();\n    else orders.set(change.id, change);\n  }\n\n  async function tick() {\n    if (busy || waiting.length === 0) return;\n    busy = true;\n    const batch = waiting.slice();   // jitne abhi hain\n    try {\n      await ship(batch);             // wahan pahunch gaye?\n      waiting = waiting.slice(batch.length);   // toh hatao\n    } catch (e) {\n      // nahi pahunche: list waisi hi, agli baar phir\n    }\n    busy = false;\n  }\n\n  async function write(change) {\n    if (mode === 'sync') {\n      await ship([change]);   // pehle wahan, fail = throw\n      apply(change);          // phir yahan\n      return;                 // ab caller \"ho gaya\" bole\n    }\n    apply(change);            // pehle yahan rakho\n    waiting.push(change);     // copy baad mein\n  }\n\n  return {\n    orders, apply, write, tick,\n    pending: () => waiting.length,\n    start: () => { timer = setInterval(tick, everyMs); },\n    stop: () => clearInterval(timer),\n  };\n}",
      },
      vars: [
        { id: 'orders', label: '<code>orders</code> (region A ka DB)' },
        { id: 'waiting', label: '<code>waiting</code> (sirf region A mein)' },
        { id: 'b', label: 'Region B mein' },
        { id: 'lost', label: 'Region A abhi gaya toh kho jaayenge' },
        { id: 'said', label: 'Caller ne grahak se kya kaha' },
      ],
      steps: [
        {
          clock: 'do cheezein yaad',
          line: '18-21',
          say: `Replicator ki yaad do cheezein hain:<br><br>
            <b>Line 18, <code>orders</code>:</b> is region ka DB.<br>
            <b>Line 19, <code>waiting</code>:</b> jo badlav (change) sirf <b>yahan</b> hain, doosre region mein abhi nahi. Abhi badlav = ek order. (Aakhri step mein ek aur kism ka badlav dikhega.)<br><br>
            Line 20 (<code>busy</code>) aur line 21 (<code>timer</code>) sirf intezaam hain: ek waqt mein ek hi copy, aur copy ki ghadi.<br><br>
            Region gaya toh <code>orders</code> bhi gaya. Jo orders doosre region tak nahi pahunche, un orders ki list hi <code>waiting</code> hai.`,
          vars: { orders: '0', waiting: '0', b: '0', lost: '0', said: '—' },
        },
        {
          clock: '0.00–0.50 s · write()',
          line: [42, 43, 48, 49, 50],
          say: `Order #1 (0.00 s) aur #2 (0.50 s) aaye. Mode async hai. Dono ke liye <code>write(change)</code> mein wahi lines chalin:<br><br>
            <b>Line 43:</b> mode sync hai? Nahi → seedha line 48.<br>
            <b>Line 48:</b> pehle yahan rakho: <code>apply(change)</code> order ko <code>orders</code> mein daalta hai.<br>
            <b>Line 49:</b> copy baad mein: <code>waiting.push(change)</code>.<br>
            <b>Line 50:</b> <code>write()</code> khatam. Ab caller grahak ko "ho gaya" bol sakta hai.`,
          vars: { orders: '2 (#1, #2)', waiting: '2 (#1, #2)', b: '0', lost: '?', said: '"ho gaya" — turant' },
          ask: {
            q: 'Dono orders ko "ho gaya" mil chuka hai. Ab 0.50 s par region A mar jaaye. Kaunse orders kho gaye?',
            choices: [
              '#1 aur #2, dono. Dono sirf region A ke andar hain (<code>orders</code> mein bhi, <code>waiting</code> mein bhi). B tak kuch nahi pahuncha',
              'Koi nahi — "ho gaya" mil chuka hai, toh order surakshit hain',
              'Sirf #2 — #1 ki copy ab tak ho chuki hogi',
              'Koi nahi — har order do jagah rakha hai (<code>orders</code> mein aur <code>waiting</code> mein), ek jagah toh bachega',
            ],
            answer: 0,
            hint: 'Dekho: <code>write()</code> ki kaunsi line B tak kuch bhejti hai? Aur <code>orders</code> aur <code>waiting</code> kiske andar rakhe hain?',
            explain: 'Slow motion ki line: <code>0.50 s #2 aaya → "ho gaya" ✓ turant A mein: 2 · B mein: 0 · raaste mein: 2</code>. "Raaste mein" yahi <code>waiting</code> list hai. "Ho gaya" sirf itna kehta hai ki region A ne order rakh liya. Jo orders <code>waiting</code> mein hain, region gaya toh wahi kho jaate hain.',
          },
        },
        {
          clock: '1.00–1.20 s · tick()',
          line: ['29-32', 34, 35, 39],
          say: `Ab copy ki ghadi. <code>tick()</code> har <code>everyMs</code> par chalti hai. 1.00 s par:<br><br>
            <b>Line 30:</b> list khaali hai, ya pichhli copy abhi chal rahi hai? Nahi → aage.<br>
            <b>Line 32:</b> <code>batch</code> = list ki ek nakal: abhi #1, #2.<br>
            <b>Line 34:</b> <code>await ship(batch)</code> — B tak bhejo, aur jawab aane tak ruko.<br>
            <b>Line 35:</b> ship <b>safal</b> hua, tabhi list se hatao — sirf <code>batch</code> jitne.<br><br>
            Copy ke raaste mein order #3 aa gaya. Order #3 <code>batch</code> mein nahi tha, isliye list mein bacha:
            <pre>1.00 s  📦 copy shuru: A → B   #1, #2
1.00 s  #3  aaya → "ho gaya" ✓ turant   A mein: 3 · B mein: 0 · raaste mein: 3
1.20 s  📬 B ne rakh liye: #1, #2   (B mein ab 2)</pre>`,
          vars: { orders: '3 (#1–#3)', waiting: '1 (#3)', b: '2 (#1, #2)', lost: '1 (#3)' },
        },
        {
          clock: '2.00–2.40 s · copy fail',
          line: [34, 36, 37, 39],
          say: `Ab 2.00 s par B tak pahunchna band ho gaya (2 second ke liye). Region A bilkul theek hai. <code>tick()</code> ne #3, #4 ka batch bheja:
            <pre>2.00 s  💥 B tak pahunchna band (unreachable) — 2.00 s ke liye; A bilkul theek hai
2.00 s  📦 copy shuru: A → B   #3, #4</pre>
            B se jawab nahi aaya, aur line 34 par <code>await ship(batch)</code> ne throw kiya.`,
          vars: { orders: '5 (#1–#5)', waiting: '3 (#3, #4, #5)', b: '2 (#1, #2)', lost: '3 (#3, #4, #5)' },
          ask: {
            q: 'Line 34 par <code>ship</code> ne throw kiya. Ab <code>waiting</code> mein kya rahega?',
            choices: [
              '#3, #4, #5 — sab waisa hi. Throw hote hi line 35 chhoot gayi, <code>catch</code> ne kuch hataya nahi; agli ghadi par wahi batch phir jaayega',
              'Sirf #5 — #3 aur #4 "bheje ja chuke" hain, toh list se hat gaye',
              'Khaali — copy fail hui toh list saaf, orders dobara nahi bheje jaate',
              '#3 aur #4 ek alag "retry" list mein chale gaye',
            ],
            answer: 0,
            hint: 'Line 35 <code>await ship(batch)</code> ke <b>baad</b> aati hai. <code>await</code> ne throw kiya — toh Node seedha kahan kood jaata hai?',
            explain: 'Slow motion ki line: <code>2.40 s ⚠️ copy fail: B ka jawab nahi aaya (0.40 s ruke) — #3, #4 list mein hi hain, agle tick par phir</code>. Order tab hatta hai jab B ka jawab aa jaaye, pehle nahi. Isliye B kuch der na mile aur A zinda rahe, toh orders baad mein pahunch jaate hain.',
          },
        },
        {
          clock: '4.00 s · pending()',
          line: 54,
          say: `<b>Line 54:</b> <code>pending()</code> = <code>waiting.length</code>. Matlab: region A <b>abhi</b> gaya toh kitne "ho gaya" wale orders kho jaayenge.<br><br>
            B 2 second tak nahi mila, aur list badhti gayi. 4.00 s par:
            <pre>4.00 s  #9  aaya → "ho gaya" ✓ turant   A mein: 9 · B mein: 2 · raaste mein: 7</pre>
            Slow motion ka "raaste mein" yahi <code>pending()</code> hai. Slow motion ke tool khud jaanchte hain: region jaate waqt kho gaye orders ki ginti aur <code>pending()</code> barabar nikli.<br><br>
            Asli raftaar wale lab mein (50 orders/second, teen run) bhi yahi: B 2 s unreachable aur usi beech region A gaya → 80–81 orders gaye. B theek hota toh 5.`,
          vars: { orders: '9 (#1–#9)', waiting: '7 (#3–#9)', b: '2 (#1, #2)', lost: '7 (#3–#9)' },
        },
        {
          clock: 'sync · 2.00–2.40 s',
          line: '43-47',
          say: `Ab wahi code, par mode sync hai. Line 43 ab sach hai:<br><br>
            <b>Line 44:</b> pehle <code>ship</code> — B tak bhejo, jawab aane tak yahin ruko.<br>
            <b>Line 45:</b> phir <code>apply</code> — tab region A mein rakho.<br>
            <b>Line 46:</b> <code>return</code> — ab caller "ho gaya" bole.<br><br>
            <code>waiting</code> mein kuch jaata hi nahi. Normal din ka #1:
            <pre>0.00 s  #1  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
0.20 s  #1  → "ho gaya" ✓ (0.20 s baad)   A mein: 1 · B mein: 1 · raaste mein: 0</pre>
            Ab 2.00 s: B tak pahunchna band, region A theek. Order #5 aaya, aur line 44 par <code>ship</code> ne throw kiya.`,
          vars: { orders: '4 (#1–#4)', waiting: '0', b: '4 (#1–#4)', lost: '0', said: '?' },
          ask: {
            q: 'Mode sync hai, B tak raasta band. Line 44 par <code>ship</code> ne throw kiya. Order #5 ka kya hoga?',
            choices: [
              '<code>write()</code> throw karta hai; line 45 aur 46 chalti hi nahi. Caller grahak ko error deta hai (503), "ho gaya" nahi. #5 region A mein bhi nahi rakha gaya',
              '#5 region A mein rakh liya jaata hai aur <code>waiting</code> mein jaata hai; copy baad mein hoti hai, aur grahak ko "ho gaya" milta hai',
              '#5 region A mein rakha rehta hai, par grahak ko error milta hai',
              '<code>write()</code> khud 3 baar koshish karta hai, phir "ho gaya" bolta hai',
            ],
            answer: 0,
            hint: 'Line 44 ke throw ke baad line 45 (<code>apply</code>) aur line 46 (<code>return</code>) chalengi?',
            explain: 'Slow motion ki line: <code>2.40 s #5 → ✗ FAIL (0.40 s baad): B ka jawab nahi aaya · "ho gaya" NAHI bola   A mein: 4 · B mein: 4 · raaste mein: 0</code>. "A mein" 4 hi raha: #5 rakha hi nahi gaya. Isliye grahak ko galat "ho gaya" nahi mila — par B ki gadbad se A theek hote hue bhi order fail hua. (503 app ka kaam hai: stage 3 mein dekhoge.)',
          },
        },
        {
          clock: 'ek hi code, teen settings',
          line: [17, 55],
          say: `Backup, copy aur sync — teeno ke liye <code>createReplicator</code> ek hi hai. Farak line 17 ke do dabbon ka hai: <code>mode</code> aur <code>everyMs</code>.
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th><code>mode</code> · <code>everyMs</code></th><th>Slow motion mein kho gaye</th><th>"Ho gaya" kehne mein</th></tr>
              <tr><td>Backup (snapshot)</td><td>async · 3000 (3 s)</td><td>3 order (#7–#9)</td><td>turant</td></tr>
              <tr><td>Copy (replication)</td><td>async · 1000 (1 s)</td><td>1 order (#9)</td><td>turant</td></tr>
              <tr><td>Sync</td><td>sync</td><td>koi nahi (0 order)</td><td>har baar 0.20 s</td></tr>
            </table></div>
            Line 55 mein yahi <code>everyMs</code> ghadi ka gap banta hai. Asli raftaar wale lab mein copy ka <code>everyMs</code> 300 hai (line 17 ka default), backup ka 3000. Wahan bhi wahi kram (50 orders/second, teen run): backup mein 50 orders gaye, copy mein 5.`,
          vars: { orders: '—', waiting: '—', b: '—', lost: 'backup 3 · copy 1 · sync 0', said: '—' },
        },
        {
          clock: '7.75–8.00 s · apply()',
          line: '23-27',
          say: `<b>Line 25:</b> badlav <code>delete-all</code> ho toh <code>orders.clear()</code>. <b>Line 26:</b> warna order rakho.<br><br>
            Copy ke liye "ek order" aur "saare orders mita do" mein koi farak nahi — dono ek <b>badlav</b> hain. Ek galat DELETE bhi <code>waiting</code> mein jaata hai, aur B par wahi <code>apply()</code> chalta hai:
            <pre>8.00 s  📦 copy: A → B   #15, #16, 🗑️ DELETE (3 badlav)
8.00 s  ☠️ DELETE B tak bhi pahunch gayi: B ke saare orders gaye (14 → 0) — B ne galti ko bhi sahi badlav maana</pre>
            Copy galti aur sahi kaam mein farak nahi karti.`,
          vars: { orders: '16 → 0 (DELETE ke baad)', waiting: '3 badlav: #15, #16, DELETE', b: '14 → 0 (8.00 s par)', lost: '—', said: '—' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "ho gaya" aur "copy" do alag cheezein hain, aur dono ke beech ki list ka naam <code>waiting</code> hai. Async mein <code>waiting</code> ke orders region ke saath jaate hain — <code>pending()</code> un orders ki ginti batata hai. Sync mein list khaali rehti hai, par har order B ka intezaar karta hai, aur B na mile toh order fail. Aur copy galti ko bhi copy kar deti hai: DELETE bhi ek badlav hai.',
    },

    /* ---------------- 2. lib/failover.js ---------------- */
    {
      type: 'dryrun',
      title: '🧮 lib/failover.js — router ka faisla, line-by-line',
      goal: 'Sawaal: router ko kaise pata chale ki region A sach mein gaya — ek ✗ se, ya kitne se? Is file mein jawab hai: har health check ke baad <code>result(ok)</code> bulaya jaata hai. Number slow motion ke hain: router har 0.5 s par region A se poochhta hai, aur A 4.00 s par gaya. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/40-disaster-recovery/lib/failover.js',
        file: 'docker-labs/40-disaster-recovery/lib/failover.js',
        from: 7,
        text: "function createDetector({ threshold = 3 } = {}) {\n  let fails = 0;        // lagataar kitne check fail hue\n  let done = false;     // failover ho chuka?\n\n  return {\n    // har health check ke baad bulao. true = B par chalo\n    result(ok) {\n      if (done) return false;\n      fails = ok ? 0 : fails + 1;   // ek pass = ginti zero\n      if (fails < threshold) return false;\n      done = true;\n      return true;      // sirf ek baar. Wapas nahi aata\n    },\n    fails: () => fails,\n  };\n}",
      },
      vars: [
        { id: 'call', label: 'Health check ka jawab' },
        { id: 'fails', label: '<code>fails</code>' },
        { id: 'done', label: '<code>done</code>' },
        { id: 'ret', label: '<code>result()</code> ne lautaya' },
      ],
      steps: [
        {
          clock: 'router ki yaad',
          line: '7-9',
          say: `Router ke faisle ki poori yaad do variable hain:<br><br>
            <b>Line 8, <code>fails</code>:</b> lagataar kitne health check fail hue.<br>
            <b>Line 9, <code>done</code>:</b> failover ho chuka?<br><br>
            <b>Line 7, <code>threshold</code>:</b> kitne <b>lagataar</b> fail par maana jaaye ki region sach mein gaya. Default 3.`,
          vars: { call: '—', fails: '0', done: 'false', ret: '—' },
        },
        {
          clock: 'ek pass = ginti zero',
          line: [15, 16],
          say: `Router ko ek ke baad ek health check ka jawab milta hai (✓ = region A ne jawab diya, ✗ = nahi diya). Har jawab par <code>result(ok)</code> bulaya jaata hai:<br><br>
            <b>Line 15:</b> jawab ✓ ho toh <code>fails = 0</code>. ✗ ho toh <code>fails + 1</code>.<br>
            <b>Line 16:</b> <code>fails</code> abhi <code>threshold</code> se chhota hai? Toh <code>false</code> — abhi failover nahi.`,
          vars: { call: '✗ ✗ ✓ ✗ ✗ ✗ · hadd 3', fails: '?', done: 'false', ret: '?' },
          ask: {
            q: 'Router ko chhe jawab mile: ✗ ✗ ✓ ✗ ✗ ✗. Hadd 3 hai. <code>result()</code> pehli baar <code>true</code> kis jawab par lautayega?',
            choices: [
              'Chhathe jawab par. Teesre jawab (✓) ne ginti zero kar di; ✓ ke baad lagataar ✗ ✗ ✗: ginti 1, 2, 3',
              'Chauthe jawab par — tab tak kul teen ✗ ho chuke',
              'Teesre jawab par — hadd 3 hai, toh teesre par hi',
              'Kabhi nahi — beech mein ek ✓ aa gaya, toh failover ka mauka chala gaya',
            ],
            answer: 0,
            hint: 'Line 15: ek ✓ aane par <code>fails</code> kya ho jaata hai? Har jawab ke baad <code>fails</code> likhte jao.',
            explain: 'Ginti: 1, 2, 0, 1, 2, 3. Line 16 ki shart (<code>fails &lt; threshold</code>) chhathe jawab par pehli baar jhooti hui. Hadd "kul kitne fail" nahi, "<b>lagataar</b> kitne fail" hai: ek pass ke baad ginti phir zero se shuru.',
          },
        },
        {
          clock: '5.50 s · hadd tak pahunche',
          line: [16, 17, 18],
          say: `Ab slow motion ka run. Region A 4.00 s par gaya. Router ke teen jawab lagataar ✗:
            <pre>4.50 s  🩺 A ✗ (lagataar fail 1/3)
5.00 s  🩺 A ✗ (lagataar fail 2/3)
5.50 s  🩺 A ✗ (lagataar fail 3/3) → FAILOVER: router ne B ko "activate" kaha, ab saara traffic B par</pre>
            Teesre ✗ par:<br>
            <b>Line 16:</b> 3 &lt; 3? Nahi → aage.<br>
            <b>Line 17:</b> <code>done = true</code>.<br>
            <b>Line 18:</b> <code>return true</code> — "ab B par chalo". Sirf ek baar.<br><br>
            Uske baad har health check par line 14 hi chalti hai: <code>done</code> true hai, toh <code>false</code>.`,
          vars: { call: 'teesra ✗ (5.50 s)', fails: '1 → 2 → 3', done: 'true', ret: 'true → B par chalo' },
        },
        {
          clock: 'region A wapas aa gaya',
          line: [9, 14, 18],
          say: `Failover ho chuka hai. Kuch der baad region A wapas theek ho gaya.<br><br>
            Code dekho: line 14 par <code>done</code> true hai, toh <code>result()</code> hamesha <code>false</code> lautata hai. Aur poore code mein <code>done</code> ko wapas <code>false</code> karne wali koi line hai hi nahi. Line 18 ka comment bhi yahi kehta hai: <code>sirf ek baar. Wapas nahi aata</code>.`,
          vars: { call: 'region A wapas theek', fails: '3', done: 'true', ret: 'false (hamesha)' },
          ask: {
            q: 'Region A wapas theek hai. Phir bhi router apne aap wapas A par kyun nahi jaata?',
            choices: [
              'Failover ke baad ke saare naye orders B mein gaye hain, A mein nahi — A ka data purana hai. Router apne aap wapas gaya toh kuch grahak A par honge, kuch B par: do jagah likhna, aur dono ka data alag. Isliye wapsi insaan tay karta hai: pehle A ko B ke barabar karo, phir traffic badlo',
              'Yeh bug hai — kuch der baad <code>done</code> ko apne aap <code>false</code> kar dena chahiye',
              'Kyunki region A gaya matlab hamesha ke liye gaya — wapas aata hi nahi',
              'Kyunki wapas jaane ka kharcha zyada hai (data transfer ka bill)',
            ],
            answer: 0,
            hint: 'Failover ke baad naye orders kahan likhe ja rahe hain — region A mein ya B mein? Aur agar kuch grahak abhi B par hon aur kuch A par?',
            explain: 'Failover ke baad ke naye orders B mein hain; A ka data purana hai. Router apne aap wapas gaya toh do jagah likhna shuru ho sakta hai. Aur region A girta-uthta ho (flapping), toh traffic idhar-udhar uchhalta rahega. Isliye line 18: <code>sirf ek baar. Wapas nahi aata</code>. Lab ka router bhi failover ke baad region A ko poochhna band kar deta hai; wapsi ke liye alag se <code>POST /config</code> bhejna padta hai.',
          },
        },
        {
          clock: 'kitni der mein pata chalta hai?',
          line: 16,
          say: `Line 16 se ek seedha hisaab nikalta hai: router ko gadbad ka pata chalne mein lagbhag <b>sawaalon ka fasla × hadd</b> jitna samay lagta hai.
            <div class="dr-scroll"><table>
              <tr><th>Kahan</th><th>Fasla</th><th>Hadd</th><th>Pata chalne mein</th></tr>
              <tr><td>Slow motion (A 4.00 s par gaya)</td><td>0.5 s</td><td>3</td><td>1.50 s — FAILOVER 5.50 s par</td></tr>
              <tr><td>Asli raftaar lab, active-active (teen run)</td><td>500 ms</td><td>3</td><td>RTO 1.0–1.5 s</td></tr>
            </table></div>
            Active-active mein region B pehle se poora chal raha hota hai, isliye wahan RTO (orders kitni der fail hote rahe) lagbhag sirf pata chalne ka samay hai. 500 ms × 3 = 1.5 s upar ki hadd hai (hisaab). Teen run mein kam-zyada isliye: region A health check ke jaal mein kahin bhi gir sakta hai — check ke theek baad girne par poora 1.5 s, theek pehle girne par ek fasla kam.<br><br>
            Hadd chhoti = pata jaldi, par jhoothi ghabrahat ka khatra: ek-do dheeme jawab bhi failover karwa denge, aur failover wapas nahi hota. Hadd badi = ulta.`,
          vars: { call: 'fasla × hadd', fails: '3', done: 'true', ret: 'A ke 1.50 s baad true' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> router ka poora dimaag ek ginti hai: <b>lagataar</b> kitne health check fail hue. Hadd tak pahunchi toh <code>true</code> — sirf ek baar, phir <code>done</code> hamesha ke liye. Pata chalne ka samay = fasla × hadd. Failover wapas nahi hota: wapsi data milakar ek insaan tay karta hai.',
    },

    /* ---------------- 3. apne app mein ---------------- */
    {
      type: 'dryrun',
      title: '🔌 tools/mini.js — apne app mein lagana: line 8–30',
      goal: 'Sawaal: "ho gaya" kab bolna hai, yeh app ki kaunsi line tay karti hai? Yeh file ek poora chhota app hai, <code>lib/replicator.js</code> ke saath. Neeche ka hissa sirf dikhane ke liye hai, isliye yahan nahi dikhaya. Chaar tukde: banana, order lena, chalana, aur ek sawaal.',
      code: {
        title: 'docker-labs/40-disaster-recovery/tools/mini.js',
        file: 'docker-labs/40-disaster-recovery/tools/mini.js',
        from: 8,
        text: "const { serve, json } = require('../lib/util');\nconst { createReplicator } = require('../lib/replicator');\n\nconst PORT = 5195;\nconst SYNC = process.argv.includes('--sync');\n\nconst rep = createReplicator({\n  mode: SYNC ? 'sync' : 'async',\n  everyMs: 2000,\n  // asli app mein yahan fetch(...) hoga\n  ship: batch => other.receive(batch),\n});\n\nasync function order(req, res, url, params, body) {\n  try {\n    await rep.write(body);   // sync: yahin ruko\n    return json(res, 201, { ok: true });   // ho gaya\n  } catch (e) {\n    return json(res, 503, { ok: false });  // copy nahi hui\n  }\n}\n\nserve(PORT, { 'POST /order': order }, () => rep.start());",
      },
      vars: [
        { id: 'part', label: 'Tukda' },
        { id: 'does', label: 'Kya karta hai' },
        { id: 'reply', label: 'Grahak ko "ho gaya" kab milta hai' },
      ],
      steps: [
        {
          clock: '1 · banao',
          line: [12, '14-19'],
          say: `<b>Line 12:</b> <code>--sync</code> lagaya ho toh <code>SYNC</code> true.<br>
            <b>Line 15–16:</b> <code>mode</code> sync ya async. Async mein <code>everyMs: 2000</code>: jama orders har 2 second par copy hote hain.<br>
            <b>Line 18:</b> <code>ship</code> = doosre region tak bhejne wala function. Asli app mein yahan <code>fetch(...)</code> hoga (line 17 ka comment). Is file mein ek nakli doosra region hai, jo neeche ke hisse mein hai.<br><br>
            Ek zaroori niyam (<code>replicator.js</code> ke comment mein): <code>ship</code> fail ho toh <b>throw</b> kare. <code>fetch</code> 503 par bhi throw nahi karta, isliye asli <code>ship</code> mein <code>if (!r.ok) throw …</code> bhi chahiye (lab ke <code>services/region.js</code> mein yahi hai) — warna replicator maan lega ki pahunch gaya, aur order ko list se hata dega.`,
          vars: { part: 'createReplicator({ … })', does: 'copy ka niyam banata hai', reply: '—' },
        },
        {
          clock: '2 · order lo',
          line: '21-28',
          say: `<b>Line 23:</b> <code>await rep.write(body)</code> — order replicator ko do. Async mein <code>write()</code> turant lautta hai. Sync mein B ka jawab aane tak yahin ruko (line ka comment).<br>
            <b>Line 24:</b> uske <b>baad</b> 201 — "ho gaya".<br>
            <b>Line 25–26:</b> <code>write()</code> ne throw kiya (sync mein <code>ship</code> fail) → <b>503</b>, "copy nahi hui". Grahak ko "ho gaya" nahi dikhta.<br><br>
            Pichhle stage ka sync wala order #5 yahin 503 banta hai. Async mein <code>write()</code> ke andar <code>ship</code> bulaya hi nahi jaata, isliye copy ki gadbad se 503 nahi aata.`,
          vars: { part: 'order(req, res, …)', does: 'write() ke baad 201; throw par 503', reply: 'write() ke poora hone ke baad' },
        },
        {
          clock: '3 · chalao',
          line: 30,
          say: `<b>Line 30:</b> server khulte hi <code>rep.start()</code>: copy ki ghadi <code>setInterval(tick, everyMs)</code> chalu (replicator.js ki line 55).<br>
            Async mein yahi ghadi har 2 second par <code>waiting</code> ko B tak bhejti hai. Sync mein <code>waiting</code> hamesha khaali rehti hai, toh ghadi ke paas karne ko kuch nahi.<br><br>
            Raasta: <code>POST /order</code> → upar wala <code>order</code> function.`,
          vars: { part: 'serve(PORT, { … })', does: 'POST /order sunta hai, copy ki ghadi chalata hai' },
        },
        {
          clock: '4 · ek await',
          line: [23, 24],
          say: `Ek aakhri sawaal, line 23 par. <code>rep.write(body)</code> ek promise lautata hai, aur <code>await</code> <code>order()</code> ko us promise ke poora hone tak rokta hai. Mode sync hai (<code>node tools/mini.js --sync</code>).`,
          vars: { part: 'line 23: await', does: 'order() ko write() ke poora hone tak rokta hai', reply: '?' },
          ask: {
            q: 'Sync mode mein line 23 se <code>await</code> hata do: <code>rep.write(body);</code>. Phir kya hoga?',
            choices: [
              'Line 24 turant chal jaayegi: B ka jawab aane se pehle hi grahak ko 201 chala jaayega. <code>ship</code> fail hua toh line 26 ka <code>catch</code> chalega hi nahi — aur sync mein region A ne order rakha bhi nahi. Grahak ko "ho gaya", par order kahin nahi',
              'Kuch nahi badlega — <code>write()</code> sync mode mein apne aap ruk jaata hai',
              'Sync mode async ban jaayega: order <code>waiting</code> mein jaayega aur <code>tick()</code> baad mein bhej dega',
              'Node error dega: async function ko <code>await</code> ke bina bula nahi sakte',
            ],
            answer: 0,
            hint: 'Line 23 ke baad line 24 kab chalti hai? <code>write()</code> ke poora hone ka intezaar kaun karta hai?',
            explain: 'Sync mode ka poora fayda is ek <code>await</code> mein hai. Mini run mein dekho: <code>0.35 s #1 201 0.2 s 1 1 ← pehle doosre region ka jawab (0.2 s), phir "ho gaya"</code> — 201 B ke jawab ke <b>baad</b> gaya. Bina <code>await</code> ke 201 turant jaata, aur B ki gadbad <code>catch</code> tak pahunchti hi nahi.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> apne app mein teen cheezein chahiye: <code>createReplicator</code> (mode, <code>everyMs</code>, aur ek <code>ship</code> jo fail par throw kare), order handler jo <code>await rep.write(body)</code> ke <b>baad</b> hi 201 bheje (aur throw par 503), aur server khulte hi <code>rep.start()</code>. Ek <code>await</code> tay karta hai ki "ho gaya" kab bola jaaye.',
    },

    /* ---------------- 4. chala ke dekho ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — wahi app, do mode mein',
      project: '40-disaster-recovery',
      exercise: 'ex0-slowmo',
      goal: 'Abhi jo file padhi, wahi chalao. App port 5195 par khulta hai. Har 0.5 s par ek order aata hai, aur 3.80 s par yeh region "gaya". Pehle async (pehle "ho gaya"), phir <code>--sync</code> (pehle copy).',
      why: '<code>tools/mini.js</code> ka upar ka hissa (line 8–30) wahi app hai jo abhi padha. Neeche ka hissa sirf dikhane ke liye hai: orders bhejta hai, 3.80 s par region ke "jaane" ka pal tay karta hai, aur batata hai ki doosre region mein kaun se order hain. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Chalao (~4 s). Aakhri teen line dekho: "ho gaya" mila, par kitne order doosre region mein nahi hain?', cmd: 'cd docker-labs/40-disaster-recovery && node tools/mini.js', expect: "app :5195 · lib/replicator.js · mode: async · copy har 2 s par\n\n    samay   order  jawab  kitni der   A mein  doosre mein\n   0.35 s   #1    201    0.0 s       1       0       ← \"ho gaya\" turant; copy abhi nahi gayi\n   0.85 s   #2    201    0.0 s       2       0\n   1.35 s   #3    201    0.0 s       3       0\n   1.85 s   #4    201    0.0 s       4       0\n   2.35 s   #5    201    0.0 s       5       4       ← 2.00 s par #1–#4 ki copy gayi (pahunchi 2.20 s par)\n   2.85 s   #6    201    0.0 s       6       4\n   3.35 s   #7    201    0.0 s       7       4\n\n💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)\n\n  \"ho gaya\" (201) mila:         #1–#7 (7 order)\n  doosre region mein hain:      #1–#4 (4 order)\n  \"ho gaya\" mila, par kho gaye: #5–#7 (3 order)" },
        { text: 'Ab wahi, <code>--sync</code> ke saath. "Kitni der" wala khaana dekho, aur aakhri teen line.', cmd: 'node tools/mini.js --sync', expect: "app :5195 · lib/replicator.js · mode: sync · har order doosre region ka jawab dekhta hai\n\n    samay   order  jawab  kitni der   A mein  doosre mein\n   0.35 s   #1    201    0.2 s       1       1       ← pehle doosre region ka jawab (0.2 s), phir \"ho gaya\"\n   0.85 s   #2    201    0.2 s       2       2\n   1.35 s   #3    201    0.2 s       3       3\n   1.85 s   #4    201    0.2 s       4       4\n   2.35 s   #5    201    0.2 s       5       5       ← har order mein wahi 0.2 s ka intezaar\n   2.85 s   #6    201    0.2 s       6       6\n   3.35 s   #7    201    0.2 s       7       7\n\n💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)\n\n  \"ho gaya\" (201) mila:         #1–#7 (7 order)\n  doosre region mein hain:      #1–#7 (7 order)\n  \"ho gaya\" mila, par kho gaye: koi nahi (0 order)" },
      ],
      observe: {
        q: 'Dono run ki aakhri line dekho — "ho gaya" mila, par kho gaye: async mein #5–#7 (3 order), sync mein koi nahi (0 order). Yeh farak kaunsi line se aaya, aur uski keemat kya thi?',
        choices: [
          'Sync mein "ho gaya" B ka jawab aane ke <b>baad</b> bola gaya (replicator.js ki line 44 <code>await ship</code>, mini.js ki line 23 <code>await rep.write</code>). Keemat: har order mein 0.2 s ka intezaar, async mein 0.0 s',
          'Sync mein copy zyada tezi se chalti hai, isliye kuch nahi khoya — keemat kuch nahi',
          'Sync mein region der se gaya, isliye orders bach gaye',
          'Sync mein <code>everyMs</code> chhota hota hai, isliye copy jaldi-jaldi chalti hai',
        ],
        answer: 0,
        explain: 'Dono run mein region 3.80 s par gaya aur <code>everyMs</code> 2000 hi raha. Async: <code>apply</code> + <code>waiting.push</code>, phir turant "ho gaya"; #5–#7 abhi <code>waiting</code> mein the. Sync: <code>await ship</code> pehle, toh "ho gaya" har order par 0.2 s baad.',
      },
      lesson: '🎯 <b>Asli baat:</b> wahi app, do mode. Async: "ho gaya" 0.0 s mein, par kho gaye #5–#7 (3 order). Sync: har order 0.2 s mein, kho gaye koi nahi (0 order). Farak ek <code>await</code> ka hai, aur uski keemat har order ka intezaar.',
    },
  ],
  interview: {
    title: 'Interview Round — jis line par data khota hai',
    instructions: 'Interviewer dekhna chahta hai ki tum "ho gaya" aur "copy" ka rishta code se samjha sakte ho. 🎤',
    questions: [
      {
        q: '"RPO zero chahiye. Code mein kya badlega, aur uski keemat kya hai?"',
        choices: [
          `Replicator ko <code>mode: 'sync'</code> par chalao: <code>write()</code> pehle <code>ship</code> karta hai (B ka jawab aane tak ruko), phir region A mein rakhta hai, tab "ho gaya". Keemat do hain: har order mein doosre region ka ek chakkar, aur B ki gadbad A ki gadbad ban jaati hai — B nahi mila toh order fail, chahe region A bilkul theek ho`,
          '<code>everyMs</code> ko bahut chhota kar do (jaise 1 ms). Copy itni tez hogi ki kuch nahi khoyega, aur keemat kuch nahi',
          'Router ki <code>threshold</code> 1 kar do — failover jaldi hoga, toh data nahi khoyega',
          'Active-active lagao — dono region likhte hain, toh kuch nahi khoyega',
        ],
        answer: 0,
        explain: 'Keemat ke number. Chakkar: slow motion mein har order 0.20 s; asli raftaar par (nakli round trip 40 ms) median 2 ms se 45 ms. B ki gadbad: B ke unreachable rehte bheje gaye 75 orders mein se 75 fail (async mein 0).<br><br>Kho gaye orders. Slow motion (A 3.10 s par gaya): async mein #5–#7 (3 order) kho gaye; sync mein koi nahi, par #7 ko "ho gaya" mila hi nahi. Asli raftaar (50 orders/second, teen run): async mein 5 / 125 kho gaye, sync mein 0 / 123. Copy tez karne se ginti ghat-ti hai, zero nahi hoti: copy har 300 ms par bhi 5 orders gaye. Threshold RTO badalta hai, RPO nahi. Active-active mein bhi copy async hai: slow motion mein #9 gaya, asli raftaar par 2–3 orders (teen run).',
      },
      {
        q: '"Failover apne aap wapas kyun nahi hota?"',
        choices: [
          'Code jaan-boojhkar ek-tarfa hai: <code>done</code> ek baar true hua toh <code>result()</code> hamesha <code>false</code>. Failover ke baad ke saare naye orders B mein hain, region A ka data purana hai. Router apne aap wapas gaya toh kuch grahak A par, kuch B par — do jagah likhna, aur dono ka data alag. Region A girta-uthta ho toh traffic idhar-udhar uchhalta rahega. Isliye wapsi insaan karta hai: pehle A ko B ke barabar karo, phir traffic badlo',
          'Yeh bug hai — kuch der baad <code>done</code> ko apne aap <code>false</code> kar dena chahiye',
          'Kyunki region A gaya matlab hamesha ke liye gaya — wapas aata hi nahi',
          'Kyunki wapas jaane ka kharcha zyada hai (data transfer ka bill)',
        ],
        answer: 0,
        explain: 'Line 18 ka comment: <code>sirf ek baar. Wapas nahi aata</code>. Slow motion: <code>5.50 s 🩺 A ✗ (lagataar fail 3/3) → FAILOVER: router ne B ko "activate" kaha, ab saara traffic B par</code> — FAILOVER sirf ek hi baar hota hai. Wapsi ka faisla data milakar ek insaan karta hai.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki "ho gaya" bolne ke baad bhi order kahan rehta hai (<code>waiting</code>), aur region abhi gaya toh kitne orders jaayenge (<code>pending()</code>)',
    'Samjha sakte ho ki async aur sync mein <code>write()</code> ki kaunsi lines alag chalti hain, aur sync ki keemat kya hai',
    'Router ka niyam likh sakte ho: lagataar fail ki ginti, hadd par ek baar <code>true</code>, aur wapsi insaan ke haath mein',
  ],
  cards: [
    { front: 'Region gaya toh kaunse orders kho jaate hain — aur code mein kahan dikhta hai?', back: 'Jo <code>waiting</code> mein hain: "ho gaya" mil chuka, par B mein nahi. <code>pending()</code> = <code>waiting.length</code> = abhi gaya toh itne orders gaye. Slow motion ka "raaste mein" yahi ginti hai. Order list se tab hatta hai jab B ka jawab aa jaaye (line 35), pehle nahi.' },
    { front: 'async aur sync mein write() ki kaunsi lines alag hain?', back: 'async: <code>apply</code> → <code>waiting.push</code> → return ("ho gaya"). sync: <code>await ship</code> → <code>apply</code> → return. Sync mein ship fail → write() throw → caller 503, order region A mein rakha hi nahi. Keemat: har order mein B ka ek chakkar (slow motion 0.20 s; asli raftaar median 2 ms → 45 ms).' },
    { front: 'Router "region gaya" kab maanta hai, aur kitni der mein pata chalta hai?', back: 'Lagataar <code>threshold</code> (3) health check fail. Ek pass ginti zero karta hai: ✗ ✗ ✓ ✗ ✗ ✗ → 1, 2, 0, 1, 2, 3 → chhathe par true. Pata chalne mein lagbhag fasla × hadd: slow motion 0.5 s × 3 = 1.50 s (A 4.00 s par gaya, FAILOVER 5.50 s par).' },
    { front: 'Failover apne aap wapas kyun nahi hota?', back: '<code>done</code> ek baar true toh hamesha (line 18: "sirf ek baar. Wapas nahi aata"). Naye orders B mein hain, A ka data purana — apne aap wapas gaye toh do jagah likhna. Wapsi insaan tay karta hai: pehle data milao, phir traffic badlo.' },
    { front: 'Galat DELETE bhi B tak kyun pahunch jaata hai?', back: '<code>apply()</code> ke liye "ek order" aur "saare orders mita do" dono sirf badlav hain (line 25–26). Copy dono ko ek jaisa bhejti hai. Slow motion: 8.00 s par B ke 14 orders gaye. Replica backup nahi hai.' },
  ],
},
]);

})();
