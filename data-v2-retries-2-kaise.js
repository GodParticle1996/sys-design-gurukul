/* =====================================================================
   🛡️ Playlist · 1 Resilience — Retries · level 2: KAISE
   Random intezaar (jitter) bheed kaise todta hai, aur server ka "baad mein aana" (503 + Retry-After).
   Har step docker-labs/37-retries ke `node tools/slowmo.js` (mode jitter, retryafter) ke asli run se hai;
   asli raftaar ke number ex1-jitter aur ex2-storm se.
   ===================================================================== */
(function () {

const ONE = [
  { id: 'asha', icon: '📱', label: 'Asha', x: 190, y: 105 },
  { id: 'pay', icon: '💳', label: 'payment-service', x: 640, y: 105 },
];
const SIX = [
  { id: 'phones', icon: '📱', label: '6 phones', x: 190, y: 105 },
  { id: 'pay', icon: '💳', label: 'payment-service', x: 640, y: 105 },
];
const VIZ = { w: 890, h: 215 };
const EMPTY5 = ['free', 'free', 'free', 'free', 'free'];

VISUALS['rt-kaise'] = {
  t: 'Fail sab ek saath hue the — par har phone apna random waqt chun ke alag-alag laut-ta hai',
  html: SD.viz.svg(SIX, [{ from: 'phones', to: 'pay' }], {
    nodes: { phones: { tone: 'ok', badge: '2.51 · 2.65 · 2.83 · 3.37 · 3.70 · 4.22 s' }, pay: { tone: 'ok', badge: 'andar kabhi 2 se zyada nahi' } },
    flows: [{ from: 'phones', to: 'pay', label: 'ek-ek', tone: 'ok' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rt-kaise',
  icon: '🎲',
  group: '🔁 Retries',
  title: 'Retries 2 · Kaise — random intezaar bheed kaise todta hai',
  badge: 'Jitter Jaadugar',
  objectives: [
    'Ek phone "random intezaar" kaise ginta hai — hadd kahan se aati hai, aur phone uske andar kya chunta hai?',
    'Chhe phones ek saath fail hue the. Random ke baad alag-alag kyun laute?',
    'Random ki keemat kya hai?',
    'Server khud kaise bole "abhi nahi, 1 second baad aana" — aur phone ko kya karna chahiye?',
  ],
  lesson: [
    `<h3>🎲 Sirf ek line badli</h3>
     <p>Pichhle level mein "har baar dugna ruko" se calls kam hui, par chhe phones phir bhi ek saath laute aur payment-service do baar aur giri.</p>
     <p>Is level mein app ke retry niyam ki <b>ek line</b> badli hai:</p>
     <pre>pehle:  ruko = 300 × 2ⁿ ms                    (300, 600, 1200, 2400)
ab:     ruko = 0 aur (300 × 2ⁿ) ke beech RANDOM</pre>
     <p>Wahi 6 phones, wahi crash, wahi payment-service. Slow motion ka nateeja:</p>
     <pre>pehle:  6 mein se 0 order · 3 crash · 30 calls
ab:     6 mein se 6 order · 1 crash (sirf deploy wala) · 28 calls</pre>
     <p class="tip">👉 Ek random sankhya ne itna kaise badal diya? Agle screen par Asha ke phone ke saath-saath chalo: har koshish par phone kya ginta hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. ek phone ka safar ---------------- */
    {
      type: 'dryrun',
      title: '👣 Dry run — Asha ke phone ka random intezaar',
      goal: 'Har click = ek ghatna. Har fail par do cheezein dekho: <b>hadd</b> kya hui, aur us hadd ke andar phone ne <b>kya chuna</b>.',
      nodes: ONE, edges: [{ from: 'asha', to: 'pay' }], viz: VIZ,
      vars: [
        { id: 'n', label: 'Asha ki koshish' },
        { id: 'cap', label: 'Is baar ki hadd (300 × 2ⁿ, zyada se zyada 2400 ms)' },
        { id: 'pick', label: 'Hadd ke andar random ne chuna' },
        { id: 'next', label: 'Agli koshish kab' },
        { id: 'svc', label: 'payment-service' },
        { id: 'inside', label: 'Service ke andar orders (hadd 5)' },
      ],
      steps: [
        {
          clock: '1.30 s',
          say: 'payment-service 1.00 s par crash hui thi (2.40 s par wapas aayegi). Asha "Order place" dabati hai. <b>Koshish 1</b> → fail.<br><br>Phone ab ek <b>hadd</b> ginta hai. Pehli fail ke baad hadd 300 ms hai. Phone 300 ms nahi rukta — 0 aur 300 ke beech <b>koi bhi</b> waqt chunega.',
          flows: [{ from: 'asha', to: 'pay', label: 'order', tone: 'bad' }],
          nodes: { asha: { tone: 'busy', badge: 'koshish 1 fail' }, pay: { tone: 'bad', badge: 'band · 2.40 s par wapas' } },
          vars: { n: '1 — fail', cap: '0 se 300 ms', pick: 'abhi nahi chuna', next: 'abhi tay nahi', svc: 'DOWN — 2.40 s par wapas', inside: EMPTY5 },
        },
        {
          clock: '1.30 s',
          say: 'Random ne chuna: <b>151 ms</b>. Asha ka phone 1.45 s par dobara bhejega.<br><br>Usi pal Bilal ke phone ne 297 ms chuna, Chitra ke phone ne 139 ms, Dev ke phone ne 12 ms. Chhe phones, chhe alag sankhyaein.',
          nodes: { asha: { tone: 'busy', badge: '151 ms ruk raha hai' } },
          vars: { pick: '151 ms', next: '1.45 s' },
        },
        {
          clock: '1.45 s',
          say: '<b>Koshish 2</b> → fail (payment-service abhi band hai). Hadd <b>dugni</b>: 0 se 600 ms. Random ne chuna: <b>550 ms</b>. Agli koshish 2.00 s par.',
          flows: [{ from: 'asha', to: 'pay', label: 'retry', tone: 'bad' }],
          nodes: { asha: { tone: 'busy', badge: '550 ms ruk raha hai' } },
          vars: { n: '2 — fail', cap: '0 se 600 ms', pick: '550 ms', next: '2.00 s' },
        },
        {
          clock: '2.00 s',
          say: '<b>Koshish 3</b> → fail. Hadd phir dugni: 0 se 1200 ms. Random ne chuna: <b>830 ms</b>. Agli koshish 2.83 s par.',
          flows: [{ from: 'asha', to: 'pay', label: 'retry', tone: 'bad' }],
          nodes: { asha: { tone: 'busy', badge: '830 ms ruk raha hai' } },
          vars: { n: '3 — fail', cap: '0 se 1200 ms', pick: '830 ms', next: '2.83 s' },
          ask: {
            q: 'Maan lo koshish 4 bhi fail ho jaati. Paanchvi koshish se pehle hadd kya hoti?',
            choices: [
              '0 se 2400 ms — hadd har fail par dugni hoti hai: 300, 600, 1200, 2400',
              '0 se 1200 ms — hadd wahi rehti hai',
              '0 se 4800 ms',
              'Theek 2400 ms — random ke bina',
            ],
            answer: 0,
            hint: 'Ab tak ki haddein dekho: 300, 600, 1200. Agli?',
            explain: 'Hadd = 300 × 2ⁿ: 300, 600, 1200, 2400. Aur 2400 par <b>chhat</b> lagi hai (cap): chhathi koshish hoti toh bhi hadd 2400 hi rehti, 4800 nahi. Chhat ke bina hadd minutes tak pahunch jaati.',
          },
        },
        {
          clock: '2.40 s',
          say: 'payment-service wapas aa gayi. Asha ka phone so raha hai — 2.83 s par jaagega. Tab tak do aur phones aa chuke honge: Esha (2.51 s) aur Chitra (2.65 s).',
          nodes: { asha: { tone: 'idle', badge: '2.83 s par jaagega' }, pay: { tone: 'ok', badge: 'UP' } },
          vars: { svc: 'UP — orders le rahi hai' },
        },
        {
          clock: '2.83 s',
          say: '<b>Koshish 4</b> → ✅ order lag gaya, 303 ms mein.<br><br>Us pal payment-service ke andar sirf <b>2 orders</b> the: Asha ka aur Chitra ka. Hadd 5 hai — crash ka sawaal hi nahi.',
          flows: [{ from: 'asha', to: 'pay', label: 'retry', tone: 'ok' }],
          nodes: { asha: { tone: 'ok', badge: 'order lag gaya' }, pay: { tone: 'ok', badge: 'andar 2/5' } },
          vars: { n: '4 — ✅ order laga', cap: 'zaroorat nahi', pick: 'zaroorat nahi', next: 'zaroorat nahi', inside: ['busy:Chitra', 'busy:Asha', 'free', 'free', 'free'] },
        },
        {
          clock: 'chhe ke chhe phones',
          say: `Ab poori tasveer. Chhe phones kab andar pahunche:
            <div class="dr-scroll"><table>
              <tr><th>Phone</th><th>Kis koshish par</th><th>Kab</th><th>Us pal service ke andar</th></tr>
              <tr><td>Esha</td><td>5</td><td>2.51 s</td><td>1</td></tr>
              <tr><td>Chitra</td><td>4</td><td>2.65 s</td><td>2</td></tr>
              <tr><td>Asha</td><td>4</td><td>2.83 s</td><td>2</td></tr>
              <tr><td>Bilal</td><td>5</td><td>3.37 s</td><td>1</td></tr>
              <tr><td>Farhan</td><td>5</td><td>3.70 s</td><td>1</td></tr>
              <tr><td>Dev</td><td>5</td><td>4.22 s</td><td>1</td></tr>
            </table></div>
            payment-service ke andar ek saath kabhi 2 se zyada orders nahi the.`,
          nodes: { asha: { tone: 'ok', badge: '6 mein se 6 order' }, pay: { tone: 'ok', badge: 'koi doosra crash nahi' } },
          vars: { n: 'sab phones: 4 ya 5 koshish', inside: EMPTY5 },
          ask: {
            q: '"Har baar dugna ruko" mein chhe phones 3.40–3.50 s par ek saath aaye the. Yahan chhe phones 2.51 se 4.22 s tak bikhre hain. Kyun?',
            choices: [
              'Fail sab ek saath hue the, par har phone ne apni hadd ke andar alag random waqt chuna — isliye lautne ke pal alag ho gaye',
              'Random wale phones kam baar koshish karte hain',
              'payment-service ne phones ko line mein laga diya',
              'Is baar payment-service ki hadd 5 se badha di gayi thi',
            ],
            answer: 0,
            hint: 'Dono baar hadd wahi thi (300, 600, 1200, 2400). Farq sirf yeh hai ki hadd ke andar kya chuna gaya.',
            explain: 'Fail hone ka pal tum nahi badal sakte: service giri toh sab ek saath fail honge. <b>Lautne ka pal</b> tum badal sakte ho. Random wahi karta hai.',
          },
        },
        {
          clock: 'random ki keemat',
          say: 'Random muft nahi hai. Dev ka phone dekho:<br><br>• Pehli fail ke baad Dev ke phone ne <b>12 ms</b> chuna — lagbhag turant dobara. (0 se hadd tak <b>kuch bhi</b> aa sakta hai.)<br>• Chauthi fail ke baad Dev ke phone ne <b>1986 ms</b> chuna. Dev ka order <b>4.22 s</b> par laga, jabki payment-service 2.40 s se theek thi.<br><br>Random poori bheed ke liye accha hai. Kisi ek user ke liye kabhi-kabhi lamba intezaar.',
          nodes: { asha: { tone: 'slow', badge: 'Dev: order 4.22 s par' }, pay: { tone: 'ok', badge: '2.40 s se theek' } },
        },
        {
          clock: 'teeno tareeke',
          say: `Wahi 6 phones, wahi crash, 8 second:
            <div class="dr-scroll"><table>
              <tr><th>Fail hone par</th><th>Phones ki calls</th><th>Crash</th><th>Order lage</th></tr>
              <tr><td>Turant dobara (har 300 ms)</td><td>132</td><td>5</td><td>6 mein se 0</td></tr>
              <tr><td>Har baar dugna ruko</td><td>30</td><td>3</td><td>6 mein se 0</td></tr>
              <tr><td>Dugni hadd ke andar random</td><td><b>28</b></td><td><b>1</b> (sirf deploy)</td><td><b>6 mein se 6</b></td></tr>
            </table></div>`,
          nodes: { asha: { tone: 'ok', badge: '28 calls · 6 order' }, pay: { tone: 'ok', badge: '1 crash (sirf deploy)' } },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein 200 clients ek hi pal mein ek gateway ko call karte hain (gateway ek waqt mein 10 leta hai, har client 8 koshish):
            <div class="dr-scroll"><table>
              <tr><th>Rukne ka tareeka</th><th>Kaam hua</th><th>Haar maani</th><th>Aakhri safal call</th></tr>
              <tr><td>Dugna, bina random</td><td>200 mein se 80</td><td>120</td><td>5272 ms</td></tr>
              <tr><td>Dugna × (0.8 se 1.2) — thoda random</td><td>200 mein se 200</td><td>0</td><td>3541 ms</td></tr>
              <tr><td>0 se hadd tak random</td><td>200 mein se 199</td><td>1</td><td>2518 ms</td></tr>
              <tr><td>Aadha pakka + aadha random</td><td>200 mein se 200</td><td>0</td><td>2734 ms</td></tr>
            </table></div>
            Thoda sa random bhi lehar tod deta hai. (Random wali lines har run mein thodi badalti hain: 0 ya 1 client haar maanta hai.)`,
          nodes: { asha: { tone: 'ok', badge: 'lab: 200 clients' }, pay: { tone: 'ok', badge: 'random ke saath 0–1 ne haar maani' } },
          vars: { n: 'lab: har client 8 koshish', cap: 'lab: 50 × 2ⁿ, zyada se zyada 2000 ms', pick: 'lab: tareeke ke hisaab se', next: 'lab', svc: 'lab: gateway, ek waqt mein 10', inside: 'lab: 10 tak' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> fail hone ka pal tumhare haath mein nahi — service giri toh sab ek saath fail honge. <b>Lautne ka pal</b> tumhare haath mein hai. Hadd dugni karte jao, aur hadd ke andar random chuno.<br>"0 se hadd tak random" ko <b>full jitter</b> kehte hain. "Aadha pakka + aadha random" ko <b>equal jitter</b>.',
    },

    /* ---------------- 2. server ka brake ---------------- */
    {
      type: 'dryrun',
      title: '🛑 Doosra brake — service khud bole "1 second baad aana"',
      goal: 'Is baar phones nahi badle: wahi "har 300 ms par dobara, koi limit nahi". <b>payment-service</b> badli hai. Dekho kya.',
      nodes: SIX, edges: [{ from: 'phones', to: 'pay' }], viz: VIZ,
      vars: [
        { id: 'svc', label: 'payment-service' },
        { id: 'inside', label: 'Service ke andar orders (hadd 5)' },
        { id: 'shed', label: 'Service ne mana kiya (503)' },
        { id: 'crashes', label: 'Crash kitni baar' },
        { id: 'orders', label: 'Order lage' },
      ],
      steps: [
        {
          clock: '1.00–2.30 s',
          say: 'Shuruaat wahi: 1.00 s par deploy se crash, chhe phones 1.30–1.40 s par fail, phir har 300 ms par retry (24 calls, sab fail).<br><br>payment-service mein ek naya niyam hai: <b>"Main bhari hoon toh girungi nahi. 6vi request ko mana kar dungi, aur bata dungi kab aana hai."</b>',
          flows: [{ from: 'phones', to: 'pay', label: 'retry', tone: 'bad' }],
          nodes: { phones: { tone: 'busy', badge: 'har 300 ms par dobara' }, pay: { tone: 'bad', badge: 'band · 2.40 s par wapas' } },
          vars: { svc: 'DOWN — 2.40 s par wapas', inside: EMPTY5, shed: '0', crashes: '1 (deploy)', orders: '6 mein se 0' },
        },
        {
          clock: '2.50–2.58 s',
          say: 'payment-service 2.40 s par uthi. Paanch phones ki retry andar: Asha, Bilal, Chitra, Dev, Esha. payment-service ke andar <b>5 orders</b> — hadd par.',
          flows: [{ from: 'phones', to: 'pay', label: 'retry', tone: 'acc' }],
          nodes: { pay: { tone: 'busy', badge: 'andar 5/5 — hadd par' } },
          vars: { svc: 'UP — par hadd par', inside: ['busy:Asha', 'busy:Bilal', 'busy:Chitra', 'busy:Dev', 'busy:Esha'] },
        },
        {
          clock: '2.60 s',
          say: 'Farhan ki retry pahunchti hai. Pichhli baar isi pal crash hua tha.<br><br>Is baar payment-service turant jawab deti hai: <code>503 Service Unavailable</code>, aur saath mein ek header: <code>Retry-After: 1</code>. Matlab: "abhi nahi; kam se kam 1 second baad aana." payment-service <b>giri nahi</b>.',
          flows: [{ from: 'pay', to: 'phones', label: '503', tone: 'slow', back: true }],
          nodes: { phones: { tone: 'slow', badge: 'Farhan: 503 · Retry-After: 1' }, pay: { tone: 'busy', badge: 'andar 5/5 · crash nahi' } },
          vars: { shed: '1 (Farhan)' },
          ask: {
            q: 'Farhan ke phone ko 503 ke saath "Retry-After: 1" mila hai. Phone ko kya karna chahiye?',
            choices: [
              'Kam se kam 1 second ruke (server ne khud bataya hai), thoda random jode, phir dobara bheje',
              'Apne niyam ke hisaab se 300 ms baad dobara bheje',
              'Turant dobara bheje — shayad ab jagah ho',
              'Kabhi dobara na bheje',
            ],
            answer: 0,
            hint: 'Kab jagah hogi, yeh kaun behtar jaanta hai: phone ya payment-service?',
            explain: 'Server ko pata hai woh kab khaali hoga; phone sirf andaaza lagata hai. Isliye server ka bataya waqt phone ke apne formule se <b>upar</b> hai. Thoda random isliye, taaki jin-jin ko "1 second" mila, woh sab theek 1 second baad ek saath na laut aayein.',
          },
        },
        {
          clock: '2.80–2.88 s',
          say: 'Paanchon orders lag gaye (302–304 ms har ek). payment-service khaali ho gayi. Farhan ka phone abhi ruka hua hai: usne <b>1043 ms</b> gine (1 second + thoda random).',
          nodes: { phones: { tone: 'ok', badge: '5 order lag gaye' }, pay: { tone: 'ok', badge: 'andar 0/5' } },
          vars: { svc: 'UP — orders le rahi hai', inside: EMPTY5, orders: '6 mein se 5' },
        },
        {
          clock: '3.64 s',
          say: 'Farhan ka phone laut-ta hai → ✅ order laga, 304 ms mein.<br><br><b>6 mein se 6 order. Koi doosra crash nahi.</b> Aur phones ka apna niyam wahi "turant dobara" wala tha.',
          flows: [{ from: 'phones', to: 'pay', label: 'retry', tone: 'ok' }],
          nodes: { phones: { tone: 'ok', badge: '6 mein se 6 order' }, pay: { tone: 'ok', badge: '1 crash (sirf deploy)' } },
          vars: { inside: ['busy:Farhan', 'free', 'free', 'free', 'free'], orders: '6 mein se 6' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab ki asli raftaar par (50 clients, ~500 requests/second, deploy-crash t = 2 s par):
            <div class="dr-scroll"><table>
              <tr><th>Clients ka tareeka</th><th>Crash</th><th>Users ko error</th><th>Calls / user action</th></tr>
              <tr><td>Turant retry, koi limit nahi</td><td>5</td><td>0 (par service theek hi nahi hui)</td><td>19.5</td></tr>
              <tr><td>Turant retry + server ka 503 + Retry-After</td><td><b>1</b></td><td><b>0</b></td><td>1.8</td></tr>
              <tr><td>Dugna + random, 3 koshish</td><td><b>1</b></td><td>598</td><td>1.2</td></tr>
            </table></div>
            Server ne restart ke pal sirf 27 requests ko mana kiya — aur crash ka chakkar bana hi nahi.`,
          nodes: { phones: { tone: 'ok', badge: 'lab: 0 users ko error' }, pay: { tone: 'ok', badge: 'lab: 27 ko mana, 1 crash' } },
          vars: { svc: 'lab: 7.0 s par theek', inside: 'lab mein hadd 40', shed: 'lab: 27', crashes: 'lab: 1 (sirf deploy)', orders: 'lab: 4,787 actions, sab safal' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> do brake hain, aur dono chahiye. <b>Client ka brake:</b> dugni hadd ke andar random ruko, aur koshish ki hadd rakho. <b>Server ka brake:</b> bhari ho toh girne ke bajaye <code>503</code> (ya <code>429 Too Many Requests</code>) ke saath <code>Retry-After</code> bhejo.<br>Client ko server ka bataya waqt apne formule se upar rakhna chahiye.',
    },

    /* ---------------- 3. kram pakka karo ---------------- */
    {
      type: 'order',
      title: 'Ek fail hui call ke baad phone kya-kya sochta hai',
      instructions: 'Retry ke andar ke faisle, sahi kram mein lagao.',
      steps: [
        { text: 'Call bheji — fail ho gayi', explain: 'Yahin se retry ka hisaab shuru hota hai.' },
        { text: 'Kya yeh failure dobara bhejne layak hai? (jawab nahi aaya / 503 / 429) — nahi toh ruk jao', explain: '400 ya 404 jaisi galti dobara bhejne se nahi badlegi. Uska poora hisaab level 4 mein.' },
        { text: 'Koshishein bachi hain? — nahi toh haar maan lo aur user ko batao', explain: 'Slow motion mein 5 koshish thi. Hadd ke bina phones hamesha lage rehte (132 calls).' },
        { text: 'Server ne Retry-After diya hai? — toh utna ruko (thoda random jod ke)', explain: 'Server jaanta hai woh kab khaali hoga. Farhan ka phone 1043 ms ruka.' },
        { text: 'Warna hadd nikalo: base × 2ⁿ, chhat (cap) tak — aur 0 se hadd ke beech random chuno', explain: 'Asha: hadd 300 → chuna 151 · hadd 600 → 550 · hadd 1200 → 830.' },
        { text: 'Utna ruko, phir wahi call dobara bhejo', explain: 'Aur phir yahi poora chakkar — jab tak kaam ho na jaaye ya koshishein khatam na ho jaayein.' },
      ],
    },

    /* ---------------- 4. asli service par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — chaaron tareeke, slow motion mein',
      project: '37-retries',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao: 6 phones, ek payment-service, chaar tareeke (har ek 8 second).',
      why: '<code>services/fragile.js</code> = payment-service (slow motion mein ek saath 5 orders, 6vi par crash). <code>lib/retry.js</code> = retry ka code. <code>tools/slowmo.js</code> chhe phones chalata hai; jitter ka random tay-beej wala hai, isliye tumhara output dry run se milega. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'payment-service chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/37-retries && npm start ex0-slowmo', expect: 'ex0-slowmo\n[fragile] :5165 crash > 40 ek saath · down 2000 ms · thanda 3000 ms' },
        { text: 'Doosre terminal mein: pehle sirf random wala tareeka. Asha ki chaar koshishein dhoondo aur dry run se milao.', cmd: 'node tools/slowmo.js --mode jitter', expect: `payment-service: ek saath 5 orders (har ek 300 ms), 6vi ek saath → CRASH · 1.0 s par deploy se crash, 1.4 s band · 6 phones 1.3–1.4 s par "Order place" · run 8 s

=== dugni hadd ke andar RANDOM ruko (jitter) · 5 koshish ===
       0.20 s  ek aur user ka order                     → ✅ 305 ms  (aam din)
       1.00 s  💥 kharab deploy: payment-service CRASH #1 · 1.4 s band (2.40 s par wapas)
       1.30 s  Asha    koshish 1 → ❌ service band · random(0–300) = 151 ms ruk ke phir
       1.32 s  Bilal   koshish 1 → ❌ service band · random(0–300) = 297 ms ruk ke phir
       1.34 s  Chitra  koshish 1 → ❌ service band · random(0–300) = 139 ms ruk ke phir
       1.36 s  Dev     koshish 1 → ❌ service band · random(0–300) = 12 ms ruk ke phir
       1.37 s  Dev     koshish 2 → ❌ service band · random(0–600) = 580 ms ruk ke phir
       1.38 s  Esha    koshish 1 → ❌ service band · random(0–300) = 250 ms ruk ke phir
       1.40 s  Farhan  koshish 1 → ❌ service band · random(0–300) = 43 ms ruk ke phir
       1.44 s  Farhan  koshish 2 → ❌ service band · random(0–600) = 294 ms ruk ke phir
       1.45 s  Asha    koshish 2 → ❌ service band · random(0–600) = 550 ms ruk ke phir
       1.48 s  Chitra  koshish 2 → ❌ service band · random(0–600) = 592 ms ruk ke phir
       1.62 s  Bilal   koshish 2 → ❌ service band · random(0–600) = 482 ms ruk ke phir
       1.63 s  Esha    koshish 2 → ❌ service band · random(0–600) = 23 ms ruk ke phir
       1.65 s  Esha    koshish 3 → ❌ service band · random(0–1200) = 359 ms ruk ke phir
       1.74 s  Farhan  koshish 3 → ❌ service band · random(0–1200) = 265 ms ruk ke phir
       1.95 s  Dev     koshish 3 → ❌ service band · random(0–1200) = 278 ms ruk ke phir
       2.00 s  Asha    koshish 3 → ❌ service band · random(0–1200) = 830 ms ruk ke phir
       2.00 s  Farhan  koshish 4 → ❌ service band · random(0–2400) = 1700 ms ruk ke phir
       2.01 s  Esha    koshish 4 → ❌ service band · random(0–2400) = 494 ms ruk ke phir
       2.07 s  Chitra  koshish 3 → ❌ service band · random(0–1200) = 582 ms ruk ke phir
       2.10 s  Bilal   koshish 3 → ❌ service band · random(0–1200) = 120 ms ruk ke phir
       2.22 s  Bilal   koshish 4 → ❌ service band · random(0–2400) = 1149 ms ruk ke phir
       2.23 s  Dev     koshish 4 → ❌ service band · random(0–2400) = 1986 ms ruk ke phir
       2.40 s  🟢 payment-service wapas aayi
       2.51 s  Esha    koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
       2.65 s  Chitra  koshish 4 → ✅ order laga (303 ms) · us pal service ke andar 2/5
       2.83 s  Asha    koshish 4 → ✅ order laga (303 ms) · us pal service ke andar 2/5
       3.37 s  Bilal   koshish 5 → ✅ order laga (304 ms) · us pal service ke andar 1/5
       3.70 s  Farhan  koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
       4.22 s  Dev     koshish 5 → ✅ order laga (303 ms) · us pal service ke andar 1/5
   nateeja → order lage: 6/6 · payment-service CRASH: 1 baar · payment-service par calls: 28 · 2.40 s se theek` },
        { text: 'Ab chaaron tareeke ek ke baad ek (~35 s). Har tareeke ke ant ki "nateeja" line dekho.', cmd: 'node tools/slowmo.js', expect: `payment-service: ek saath 5 orders (har ek 300 ms), 6vi ek saath → CRASH · 1.0 s par deploy se crash, 1.4 s band · 6 phones 1.3–1.4 s par "Order place" · run 8 s

=== turant retry — har 300 ms, koi limit nahi ===
   nateeja → order lage: 0/6 · payment-service CRASH: 5 baar · payment-service par calls: 132 · aakhri baar 8.50 s par uthi

=== har baar dugna ruko — 300, 600, 1200, 2400 ms · 5 koshish ===
   nateeja → order lage: 0/6 · payment-service CRASH: 3 baar · payment-service par calls: 30 · aakhri baar 7.30 s par uthi

=== dugni hadd ke andar RANDOM ruko (jitter) · 5 koshish ===
   nateeja → order lage: 6/6 · payment-service CRASH: 1 baar · payment-service par calls: 28 · 2.40 s se theek

=== turant retry, par service "503 + Retry-After: 1" bolti hai ===
   nateeja → order lage: 6/6 · payment-service CRASH: 1 baar · payment-service par calls: 31 · 503 (mana kiya): 1 · 2.40 s se theek` },
        { text: 'Aur sabse chhota program: sirf Asha ka phone, lib/retry.js ke saath.', cmd: 'node tools/mini.js', expect: `retry: 5 koshish · intezaar random(0 … 300 × 2ⁿ ms), hadd 2400 ms

  1.01 s  💥 payment-service CRASH · 1.4 s band
  1.30 s  Asha ne "Order place" dabaya
  1.31 s  koshish 1 fail → random(0–300) = 151 ms ruk ke phir
  1.46 s  koshish 2 fail → random(0–600) = 550 ms ruk ke phir
  2.01 s  koshish 3 fail → random(0–1200) = 830 ms ruk ke phir
  2.40 s  🟢 payment-service wapas aayi
  3.15 s  ✅ order lag gaya` },
      ],
      observe: {
        q: 'Jitter wale output mein Dev ki doosri koshish pehli ke sirf 12 ms baad gayi (1.36 s → 1.37 s). Kya yeh bug hai?',
        choices: [
          'Nahi. "0 se hadd tak random" mein 0 ke paas ki sankhya bhi aa sakti hai. Jahan kam se kam kuch rukna zaroori ho, wahan "aadha pakka + aadha random" (equal jitter) lete hain',
          'Haan, random generator kharab hai',
          'Haan, Dev ka phone niyam tod raha hai',
          'Nahi, Dev ka phone tez hai',
        ],
        answer: 0,
        explain: 'Full jitter ausatan sabse accha bikherta hai, par uska sabse chhota intezaar 0 ho sakta hai. Equal jitter mein hamesha ek floor hota hai (hadd ka aadha).',
      },
      lesson: 'Slow motion ki ginti: turant <b>0/6 order, 5 crash</b> · dugna <b>0/6, 3 crash</b> · random <b>6/6, 1 crash</b> · server ka Retry-After <b>6/6, 1 crash</b>.',
    },
  ],
  interview: {
    title: 'Interview Round — andar ka kaam',
    instructions: 'Yahan formula aur wajah dono bolne hain. 🎤',
    questions: [
      {
        q: '"Exponential backoff with jitter" mein agli koshish ka waqt kaise nikalta hai?',
        choices: [
          'Hadd = base × 2ⁿ (n = ab tak ki failures), ek chhat (cap) tak. Phir 0 aur hadd ke beech random waqt (full jitter). Server ne Retry-After diya ho toh pehle wahi maano',
          'Hamesha base × 2ⁿ rukte hain, random sirf pehli baar',
          'Har baar ek hi random sankhya rukte hain',
          'Jitna server ka CPU bhara ho, utna rukte hain',
        ],
        answer: 0,
        explain: 'Slow motion mein Asha: hadd 300 → 151 ms · hadd 600 → 550 ms · hadd 1200 → 830 ms. Chhat 2400 ms thi.',
      },
      {
        q: '"Server overload mein hai. Use clients ko kaise batana chahiye, aur clients ko kya karna chahiye?"',
        choices: [
          'Server girne se pehle 503 (ya 429) ke saath Retry-After bheje. Client utna to ruke hi, thoda random jod ke — apne backoff formule se pehle server ki baat maane',
          'Server connection kaat de; client turant dobara aaye',
          'Server 200 OK de aur body mein "busy" likhe',
          'Server kuch na bole; clients khud samajh jaayenge',
        ],
        answer: 0,
        explain: 'Lab: clients "turant retry" wale hi the. Server ke 503 + Retry-After se crash 5 se 1 ho gaye aur users ko 0 error mile (27 requests ko mana kiya gaya).',
      },
    ],
  },
  success: [
    'Kisi bhi koshish ke baad agla intezaar nikal sakte ho: hadd (dugni, chhat tak) aur uske andar random',
    'Bata sakte ho ki random ke baad phones alag-alag kyun lautte hain, aur random ki keemat kya hai',
    'Server ka brake jaante ho: 503 / 429 + Retry-After, aur client ko use kaise maanna hai',
  ],
  cards: [
    { front: 'Full jitter ka formula?', back: 'Hadd = base × 2ⁿ (chhat tak). Intezaar = <b>0 aur hadd ke beech random</b>. Slow motion mein Asha: 151 (hadd 300) → 550 (hadd 600) → 830 (hadd 1200).' },
    { front: 'Jitter bheed kaise todta hai?', back: 'Fail sab ek saath hote hain; random se <b>lautne ka pal</b> alag ho jaata hai. Slow motion: chhe phones 2.51 se 4.22 s tak bikhre, service ke andar kabhi 2 se zyada nahi. 6/6 order, 1 crash.' },
    { front: 'Random ki keemat?', back: 'Kisi ek user ko lamba intezaar mil sakta hai (Dev: order 4.22 s par, service 2.40 s se theek), aur full jitter kabhi lagbhag 0 bhi chun leta hai (Dev: 12 ms). Floor chahiye toh equal jitter.' },
    { front: 'Server "abhi nahi" kaise bolta hai?', back: '<code>503</code> ya <code>429</code> ke saath <code>Retry-After</code> (second mein, ya ek tareekh). Client utna to ruke hi, thoda random jod ke. Lab: crash 5 → 1, users ko 0 error.' },
  ],
},
]);

})();
