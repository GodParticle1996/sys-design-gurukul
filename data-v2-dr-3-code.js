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
    'Apne app mein health checks kitni lines mein lagte hain?',
  ],
  lesson: [
    `<h3>💻 Jis line par data khota hai</h3>
     <p>Pichhle levels mein dekha: kuch orders ko "ho gaya" mil chuka tha, phir bhi region A ke saath chale gaye. Khoye orders us pal kahan rakhe the? Aur kaunsi line ne orders ko us jagah rakha? Aaj yahi code mein dhoondhte hain. Lab folder: <code>docker-labs/40-disaster-recovery/</code></p>
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
            q: 'Async mode mein #1 aur #2 ko "ho gaya" mila. 0.50 s par A chala jaaye, toh kaunse orders khoyenge?',
            choices: [
              '#1 aur #2; dono orders A mein hain, aur B tak copy abhi gayi hi nahi',
              'Koi nahi; orders aur waiting mein rakhe orders do alag jagah bach gaye',
              'Sirf #2; pehla order write() ke andar se B ko turant bheja gaya hoga',
              'Koi nahi; "ho gaya" milne par dono orders B mein bhi rakhe ja chuke hain',
            ],
            answer: 0,
            hint: 'write() ke async raaste mein ship kab bulaya gaya? orders aur waiting kis region mein hain?',
            explain: 'orders ek Map hai aur waiting ek list; dono A ki memory mein hain. Async write() order A mein rakhta hai aur waiting mein jodta hai. 0.50 s tak ship nahi chala. A ki poori memory gayi, toh #1 aur #2 dono gaye; do naam wali memory doosre region ki copy nahi hai.',
            choiceExplanations: [
              'orders ek Map hai aur waiting ek list; dono A ki memory mein hain. Async write() order A mein rakhta hai aur waiting mein jodta hai. 0.50 s tak ship nahi chala. A ki poori memory gayi, toh #1 aur #2 dono gaye; do naam wali memory doosre region ki copy nahi hai.',
              'orders aur waiting dono A par hain. A ke jaane se dono chale jaate hain; do alag regions ki suraksha nahi milti.',
              'Async write() ship ko nahi bulata. #1 bhi pehle tick ke intezaar mein A par hai.',
              'Async "ho gaya" local write ke baad milta hai. B ka jawab us safal jawab ki shart nahi hai.',
            ],
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
            q: '#3 aur #4 bhejte waqt ship ne throw kiya. #5 bhi waiting mein aa gaya. Catch ke baad waiting mein kya bachega?',
            choices: [
              '#3, #4, #5 bachenge; ship fail hone par hatane wali line nahi chalti',
              'Sirf #5 bachega; ship bulate hi bheja hua batch waiting se hat jaata hai',
              'Kuch nahi bachega; catch copy fail hone par poori waiting saaf karta hai',
              'Sirf #5 bachega; #3 aur #4 catch ki alag retry list mein chale jaate hain',
            ],
            answer: 0,
            hint: 'await throw kare toh await ke baad wali line chalegi, ya seedha catch aayega?',
            explain: 'await ship(batch) throw kare toh batch hatane wali line 35 chhoot jaati hai. Catch list nahi badalta. #3, #4 aur naya #5 waiting mein rehte hain; agla tick phir koshish karega. Asli network mein B copy laga chuka ho aur jawab kho jaaye, toh batch dobara pahunch sakta hai; ek badlaav do baar aane ka intezaam bhi chahiye.',
            choiceExplanations: [
              'await ship(batch) throw kare toh batch hatane wali line 35 chhoot jaati hai. Catch list nahi badalta. #3, #4 aur naya #5 waiting mein rehte hain; agla tick phir koshish karega. Asli network mein B copy laga chuka ho aur jawab kho jaaye, toh batch dobara pahunch sakta hai; ek badlaav do baar aane ka intezaam bhi chahiye.',
              'Code batch ship karne ke baad bhi waiting mein rakhta hai. List se tabhi hatata hai jab ship safal laut-ta hai.',
              'Catch mein list saaf karne ki line nahi. Copy fail hone par pending badlaav bachaye jaate hain.',
              'Alag retry list code mein hai hi nahi. Nakaam batch wahi waiting mein rehkar agle tick par jaata hai.',
            ],
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
            q: 'Sync mode mein #5 ke liye line 44 ka ship throw karta hai. A mein order aur grahak ka jawab kya hoga?',
            choices: [
              'A mein #5 nahi rakha jaayega; write() fail hoga aur caller error bhejega',
              'A mein #5 rakhkar "ho gaya" milega; waiting baad mein #5 ko B tak bhejegi',
              'A mein #5 rakha reh jaayega; caller error dega aur baad mein #5 hata dega',
              'A mein #5 teen koshish ke baad rakhega; caller phir "ho gaya" keh dega',
            ],
            answer: 0,
            hint: 'Ship ke baad wali apply line tak pahunchne ke liye kaunsa await safal hona chahiye?',
            explain: 'Sync branch mein pehle await ship hai, phir apply. Ship throw kare toh apply aur safal return nahi chalte. Error caller tak aata hai; lab ka caller safal jawab ki jagah 503 deta hai. A mein #5 nahi rakha gaya. B par asar hua ya nahi, sirf throw dekhkar har asli network mein pakka nahi keh sakte.',
            choiceExplanations: [
              'Sync branch mein pehle await ship hai, phir apply. Ship throw kare toh apply aur safal return nahi chalte. Error caller tak aata hai; lab ka caller safal jawab ki jagah 503 deta hai. A mein #5 nahi rakha gaya. B par asar hua ya nahi, sirf throw dekhkar har asli network mein pakka nahi keh sakte.',
              'Local apply aur waiting mein jodna async branch ka kaam hai. Ship fail hone par sync branch async mein nahi badalti.',
              'Apply ship ke baad hai. Ship fail hua toh local save pehle hua hi nahi, isliye local rollback ka sawaal nahi.',
              'write() mein teen koshish ka niyam nahi. Ship ka error seedha caller tak jaata hai.',
            ],
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
            Line 55 mein yahi <code>everyMs</code> ghadi ka gap banta hai. Asli raftaar wale lab mein copy ka <code>everyMs</code> 300 hai (line 17 ka default), backup ka 3000. Teeno run mein bhi wahi kram (50 orders/second): backup mein 50 orders gaye, copy mein 5.`,
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
            q: 'Jawab mile: fail, fail, pass, fail, fail, fail. Threshold 3 hai. result() pehli baar true kab dega?',
            choices: [
              'Chhathe jawab par; beech ke pass ke baad fail ki ginti phir shuru hoti hai',
              'Chauthe jawab par; ab tak mile teen fail milkar threshold poora kar dete hain',
              'Teesre jawab par; threshold teen hai toh teesra jawab faisla kar deta hai',
              'Paanchve jawab par; pass par ginti ek ghatakar baaki fail jode jaate hain',
            ],
            answer: 0,
            hint: 'Har jawab ke baad fails likho. Pass wali line ko khaas dhyaan se chalao.',
            explain: 'Har jawab ke baad fails ki ginti 1, 2, 0, 1, 2, 3 hai. Pass poori ginti zero karta hai. Chhathe jawab par teen lagataar fail poore hote hain, toh pehli baar true milta hai.',
            choiceExplanations: [
              'Har jawab ke baad fails ki ginti 1, 2, 0, 1, 2, 3 hai. Pass poori ginti zero karta hai. Chhathe jawab par teen lagataar fail poore hote hain, toh pehli baar true milta hai.',
              'Threshold kul fail nahi ginta. Teesre jawab ka pass pehle dono fail ki ginti mita chuka hai.',
              'Threshold jawab ka number nahi hai. Teesra jawab pass hai aur fails ko zero karta hai.',
              'Pass ginti ek nahi ghatata; ginti zero karta hai. Paanchve jawab tak dobara sirf do fail hue.',
            ],
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
            Phir har health check par line 14 hi chalti hai: <code>done</code> true hai, toh <code>false</code>.`,
          vars: { call: 'teesra ✗ (5.50 s)', fails: '1 → 2 → 3', done: 'true', ret: 'true → B par chalo' },
        },
        {
          clock: 'region A wapas aa gaya',
          line: [9, 14, 18],
          say: `Failover ho chuka hai. Kuch der baad region A wapas theek ho gaya.<br><br>
            Code dekho: line 14 par <code>done</code> true hai, toh <code>result()</code> hamesha <code>false</code> lautata hai. Aur poore code mein <code>done</code> ko wapas <code>false</code> karne wali koi line hai hi nahi. Line 18 ka comment bhi yahi kehta hai: <code>sirf ek baar. Wapas nahi aata</code>.`,
          vars: { call: 'region A wapas theek', fails: '3', done: 'true', ret: 'false (hamesha)' },
          ask: {
            q: 'A phir theek jawab de raha hai. Lab ka router seedha A par lautne ke bajaye B par kyun rehta hai?',
            choices: [
              'Naye orders B mein hain; pehle A ka data milao, phir likhna aur traffic badlo',
              'A phir jawab de raha hai; done hata do toh purane orders bhi taaza ho jaayenge',
              'A par likhna khol do; B naye aur purane orders ko apne aap sahi mila dega',
              'DNS ki yaad khatam hone do; tab tak A ka DB bhi B ke barabar ho jaayega',
            ],
            answer: 0,
            hint: 'A band tha tab naye orders kis region mein gaye? A ka health pass un orders ke baare mein kya batata hai?',
            explain: 'Lab mein done ek baar true ho toh result() dobara true nahi deta. B par failover ke baad naye orders likhe gaye; A theek ho kar bhi purana data rakh sakta hai. Wapsi se pehle data milao, pakka karo ki purana writer galat waqt par nahi likh sakta, phir traffic badlo. A ka girna-uthna traffic ko baar-baar na uchhaale.',
            choiceExplanations: [
              'Lab mein done ek baar true ho toh result() dobara true nahi deta. B par failover ke baad naye orders likhe gaye; A theek ho kar bhi purana data rakh sakta hai. Wapsi se pehle data milao, pakka karo ki purana writer galat waqt par nahi likh sakta, phir traffic badlo. A ka girna-uthna traffic ko baar-baar na uchhaale.',
              'A ki health pass hone se A ke data ki taazgi sabit nahi hoti. Done hata dena missing orders nahi laata.',
              'Do jagah likhna kholne se alag data ya takraate badlaav ban sakte hain. Lab mein apne aap milane ka niyam nahi.',
              'DNS pate ki yaad badalta hai, DB ka data nahi. Data ki copy aur traffic ki wapsi alag kaam hain.',
            ],
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
            Active-active mein region B pehle se poora chal raha hota hai, isliye active-active ka RTO (orders kitni der fail hote rahe) lagbhag sirf pata chalne ka samay hai. 500 ms × 3 = lagbhag 1.5 s (hisaab). A jawab dena band kar de par connection na tode, toh aakhri check ka 300 ms timeout bhi judta hai — tab 1.5 s se thoda zyada lag sakta hai. Teen run mein kam-zyada isliye: region A health check ke jaal mein kahin bhi gir sakta hai — check ke theek baad girne par poora 1.5 s, theek pehle girne par ek fasla kam.<br><br>
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
      goal: 'Sawaal: "ho gaya" kab bolna hai, app ki kaunsi line tay karti hai? server.js ek poora chhota app hai, <code>lib/replicator.js</code> ke saath. Neeche ka hissa sirf dikhane ke liye hai, isliye yahan nahi dikhaya. Chaar tukde: banana, order lena, chalana, aur ek sawaal.',
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
            <b>Line 24:</b> copy ke <b>baad</b> 201 — "ho gaya".<br>
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
            q: 'Sync mini app mein await hata kar rep.write(body); likha. B ka jawab abhi nahi aaya. Handler kya kar sakta hai?',
            choices: [
              '201 pehle bhej sakta hai; baad mein write ka error paas wale catch mein nahi aayega',
              '201 tabhi bhejega jab B lautega; async function caller ko khud rukne par majboor karega',
              'Order waiting mein daal dega; await hatate hi sync branch async branch ban jaayegi',
              'Call par syntax error dega; promise lautane wala function bina await bulaya nahi jaayega',
            ],
            answer: 0,
            hint: 'write() promise deta hai. Handler ki agli line ko us promise ka intezaar kaun karwata hai?',
            explain: 'Async function promise lautata hai; caller apne aap intezaar nahi karta. Await hatao toh handler 201 jaldi bhej sakta hai. Baad ka rejected promise us try/catch mein nahi aayega. Mode sync hi hai: na waiting wali branch badli, na B ki copy pakki hui.',
            choiceExplanations: [
              'Async function promise lautata hai; caller apne aap intezaar nahi karta. Await hatao toh handler 201 jaldi bhej sakta hai. Baad ka rejected promise us try/catch mein nahi aayega. Mode sync hi hai: na waiting wali branch badli, na B ki copy pakki hui.',
              'Async function chalna shuru karta hai aur promise lautata hai. Caller ko rukne ke liye await ya promise ka alag intezaam chahiye.',
              'Mode configuration se aata hai. Caller ka await hatne se replicator async branch par nahi jaata.',
              'Bina await function bulana valid JavaScript hai. Dikkat syntax ki nahi, jaldi jawab aur baad ke error ko sambhalne ki hai.',
            ],
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
      goal: 'Abhi jo file padhi, wahi chalao. App port 5195 par khulta hai. Har 0.5 s par ek order aata hai, aur 3.80 s par region A "gaya". Pehle async (pehle "ho gaya"), phir <code>--sync</code> (pehle copy).',
      why: '<code>tools/mini.js</code> ka upar ka hissa (line 8–30) wahi app hai jo abhi padha. Neeche ka hissa sirf dikhane ke liye hai: orders bhejta hai, 3.80 s par region ke "jaane" ka pal tay karta hai, aur batata hai ki doosre region mein kaun se order hain. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Chalao (~4 s). Aakhri teen line dekho: "ho gaya" mila, par kitne order doosre region mein nahi hain?', cmd: 'cd docker-labs/40-disaster-recovery && node tools/mini.js', expect: "app :5195 · lib/replicator.js · mode: async · copy har 2 s par\n\n    samay   order  jawab  kitni der   A mein  doosre mein\n   0.35 s   #1    201    0.0 s       1       0       ← \"ho gaya\" turant; copy abhi nahi gayi\n   0.85 s   #2    201    0.0 s       2       0\n   1.35 s   #3    201    0.0 s       3       0\n   1.85 s   #4    201    0.0 s       4       0\n   2.35 s   #5    201    0.0 s       5       4       ← 2.00 s par #1–#4 ki copy gayi (pahunchi 2.20 s par)\n   2.85 s   #6    201    0.0 s       6       4\n   3.35 s   #7    201    0.0 s       7       4\n\n💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)\n\n  \"ho gaya\" (201) mila:         #1–#7 (7 order)\n  doosre region mein hain:      #1–#4 (4 order)\n  \"ho gaya\" mila, par kho gaye: #5–#7 (3 order)" },
        { text: 'Ab wahi, <code>--sync</code> ke saath. "Kitni der" wala khaana dekho, aur aakhri teen line.', cmd: 'node tools/mini.js --sync', expect: "app :5195 · lib/replicator.js · mode: sync · har order doosre region ka jawab dekhta hai\n\n    samay   order  jawab  kitni der   A mein  doosre mein\n   0.35 s   #1    201    0.2 s       1       1       ← pehle doosre region ka jawab (0.2 s), phir \"ho gaya\"\n   0.85 s   #2    201    0.2 s       2       2\n   1.35 s   #3    201    0.2 s       3       3\n   1.85 s   #4    201    0.2 s       4       4\n   2.35 s   #5    201    0.2 s       5       5       ← har order mein wahi 0.2 s ka intezaar\n   2.85 s   #6    201    0.2 s       6       6\n   3.35 s   #7    201    0.2 s       7       7\n\n💥 3.80 s par yeh region gaya (jo kuch sirf yahan tha, woh gaya)\n\n  \"ho gaya\" (201) mila:         #1–#7 (7 order)\n  doosre region mein hain:      #1–#7 (7 order)\n  \"ho gaya\" mila, par kho gaye: koi nahi (0 order)" },
      ],
      observe: {
        q: 'Mini app ke recorded runs mein async ne #5–#7 khoye, sync ne koi "ho gaya" wala order nahi khoya. Kaunsa code farak samjhata hai?',
        choices: [
          'Ship ke jawab par sync write poora hua; handler ne write ke baad hi 201 diya',
          'Sync mein copy ki ghadi jaldi chali; handler ne B ke jawab se pehle hi 201 de diya',
          'Sync mein A zyada der tak chala; write ka raasta aur 201 ka pal wahi rakha gaya',
          'Sync mein 201 ke baad copy gayi; nakaam copy ko catch ne backup mein rakh diya',
        ],
        answer: 0,
        explain: 'Lab ke ek recorded run mein async ne #5–#7 khoye, sync mein "ho gaya" wala koi order nahi khoya. Sync write() pehle await ship karta hai; mini handler await rep.write ke baad 201 deta hai. Raaste mein 0.2 s ka banaya hua intezaar hai; asli app ka samay machine aur network se badlega. Nateeja lab ke A-jaane wale scenario ka hai, har aafat ki guarantee nahi.',
        choiceExplanations: [
          'Lab ke ek recorded run mein async ne #5–#7 khoye, sync mein "ho gaya" wala koi order nahi khoya. Sync write() pehle await ship karta hai; mini handler await rep.write ke baad 201 deta hai. Raaste mein 0.2 s ka banaya hua intezaar hai; asli app ka samay machine aur network se badlega. Nateeja lab ke A-jaane wale scenario ka hai, har aafat ki guarantee nahi.',
          'Sync write har order ki ship ka jawab dekhta hai. everyMs chhota karna tested farak nahi tha.',
          'Dono runs mein A ko 3.80 s par gaya maana gaya. Copy aur 201 ka kram badla, failure schedule nahi.',
          'Sync mein copy 201 se pehle hai. Catch purane backup mein nakaam order nahi daalta.',
        ],
      },
      lesson: '🎯 <b>Asli baat:</b> wahi app, do mode. Async: "ho gaya" 0.0 s mein, par kho gaye #5–#7 (3 order). Sync: har order 0.2 s mein, kho gaye koi nahi (0 order). Farak ek <code>await</code> ka hai, aur await ki keemat har order ka intezaar.',
    },
  ],
  interview: {
    title: 'Interview Round — jis line par data khota hai',
    instructions: 'Interviewer dekhna chahta hai ki tum "ho gaya" aur "copy" ka rishta code se samjha sakte ho. 🎤',
    questions: [
      {
        q: 'Sirf A ke jaane par koi "ho gaya" wala order na khoye: replicator aur caller mein kya rakhoge?',
        choices: [
          'Mode sync aur await write; B ki pakki copy ke baad hi grahak ko "ho gaya" bhejoge',
          'Mode async aur everyMs 1; copy tez hogi toh A ka "ho gaya" akela kaafi maanoge',
          'Mode async aur threshold 1; router jaldi badlega toh na bheja order bhi bacha loge',
          'Dono taraf writes aur wahi async copy; do writers se har order ki do copy maanoge',
        ],
        answer: 0,
        explain: 'Replicator mein sync aur caller mein await rep.write rakho. "Ho gaya" B ki copy ke baad hi bhejo. Keemat har order par B ka jawab aur B na mile toh write ki nakaami hai. Production mein B ka jawab tikau storage mein copy rakhne ka pakka saboot hona chahiye; lab ki memory power loss ke baad data bachne ka saboot nahi.',
        choiceExplanations: [
          'Replicator mein sync aur caller mein await rep.write rakho. "Ho gaya" B ki copy ke baad hi bhejo. Keemat har order par B ka jawab aur B na mile toh write ki nakaami hai. Production mein B ka jawab tikau storage mein copy rakhne ka pakka saboot hona chahiye; lab ki memory power loss ke baad data bachne ka saboot nahi.',
          'Chhota async fasla loss ka mauka ghata sakta hai. A ka jawab aur B ki copy ke beech gap phir bhi reh sakta hai.',
          'Threshold routing jaldi badalta hai. A ke saath ja chuka aur B ko na bheja order wapas nahi banata.',
          'Dono taraf writes chalne se har order copy hone ka vaada nahi banta. Async gap aur takraate writes alag se sambhalne padenge.',
        ],
      },
      {
        q: 'Lab mein done failover ke baad true rehta hai. A laut aaye toh traffic ki wapsi alag se kyun tay karte hain?',
        choices: [
          'A mein naye orders kam ho sakte hain; data aur writer tay karke traffic laao',
          'A asal region hai toh pehle A chuno; timer se done hata kar traffic A par laao',
          'A ke health pass ko taaza data maano; B ke naye orders purane A se badal kar laao',
          'Traffic A aur B mein baari se bhejo; alag pade orders khud milkar ek haal bana lo',
        ],
        answer: 0,
        explain: 'Done ka ek-tarfa niyam lab mein traffic ko baar-baar idhar-udhar jaane se rokta hai. A lautne par pehle B ke naye orders A tak laao aur likhne ka haq kis region ke paas hoga, tay karo. Phir traffic badlo. Data milana aur writer badalna sirf health pass hone se poora nahi hota.',
        choiceExplanations: [
          'Done ka ek-tarfa niyam lab mein traffic ko baar-baar idhar-udhar jaane se rokta hai. A lautne par pehle B ke naye orders A tak laao aur likhne ka haq kis region ke paas hoga, tay karo. Phir traffic badlo. Data milana aur writer badalna sirf health pass hone se poora nahi hota.',
          'A pehle chalta tha, par ab purana data ho sakta hai. Timer data taaza hone ka saboot nahi hai.',
          'Health pass se B ke naye orders bekaar nahi ho jaate. Purane A se B ko badalne par safal orders mit sakte hain.',
          'Traffic baantne se DB apne aap nahi milte. Bina niyam do writers alag-alag haal bana sakte hain.',
        ],
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
