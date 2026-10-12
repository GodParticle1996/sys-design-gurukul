/* =====================================================================
   🛡️ Playlist · 1 Resilience — Backpressure · level 2: KAISE
   Bhari line ke chaar jawab (drop-new · error · block · drop-oldest), aur "dheere bhejo" teen services ki chain mein
   source tak kaise pahunchta hai (429 + Retry-After).
   Har step docker-labs/15-backpressure ke asli run se hai: slow motion = `node tools/slowmo.js`
   (modes error, block-server, block, drop-oldest), asli raftaar = tools/queue.js (ex1) aur tools/hint.js (ex2).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'src', icon: '📤', label: 'bhejne wala', x: 135, y: 105 },
  { id: 'ds', icon: '🧭', label: 'dispatch-service', x: 505, y: 105 },
  { id: 'rd', icon: '🛵', label: 'riders', x: 880, y: 105 },
];
const EDGES = [{ from: 'src', to: 'ds' }, { from: 'ds', to: 'rd' }];
const VIZ = { w: 1000, h: 215 };
const OUT = { from: 'ds', to: 'rd', label: '1/s', tone: 'ok' };
const cap8 = n => Array.from({ length: 8 }, (_, i) => (i < n ? 'busy' : 'free'));

/* chain: phones → app-api → order-service */
const CHAIN = [
  { id: 'ph', icon: '📱', label: '150 phones', x: 125, y: 105 },
  { id: 'api', icon: '🧩', label: 'app-api', x: 445, y: 105 },
  { id: 'os', icon: '🧾', label: 'order-service', x: 755, y: 105 },
];
const CEDGES = [{ from: 'ph', to: 'api' }, { from: 'api', to: 'os' }];
const CVIZ = { w: 890, h: 215 };

VISUALS['bp-kaise'] = {
  t: 'Kaam aage jaata hai; "bhari hoon, itni der baad aana" peeche — source tak',
  html: SD.viz.svg(CHAIN, CEDGES, {
    nodes: { ph: { tone: 'ok', badge: 'ruk ke dobara' }, api: { tone: 'acc', badge: '44 ki ginti rakhta hai' }, os: { tone: 'ok', badge: 'ek saath 44 · "na" 0 baar' } },
    flows: [{ from: 'api', to: 'ph', label: '429', tone: 'slow', back: true }, { from: 'api', to: 'os', label: 'order', tone: 'ok' }],
  }, CVIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'bp-kaise',
  icon: '📣',
  group: '🌊 Backpressure',
  title: 'Backpressure 2 · Kaise — "line bhari hai" bhejne wale tak kaise pahunchta hai',
  badge: 'Signal Sarthi',
  objectives: [
    'Bhari line ke paas kaun-kaun se jawab hain — aur har jawab mein kisko pata chalta hai?',
    '"Rok lo" kab sach mein kaam karta hai, aur kab line bas ek kadam peeche khisak jaati hai?',
    'Sabse purana kaam girana kis tarah ke data ke liye sahi hai?',
    'Teen services ki chain mein "dheere bhejo" phone tak kaise pahunchta hai?',
  ],
  lesson: [
    `<h3>📣 Wahi 16 orders, do alag shaamein</h3>
     <p>Pichhle level mein line par hadd lagi (8), aur bhari line ne naye orders <b>chupchaap</b> gira diye. 16 customers ka paisa kata, phone par "confirm" dikha, rider nahi aaya.</p>
     <p>Ab line ke niyam mein <b>ek shabd</b> badlo:</p>
     <pre>pehle:  line bhari → order chupchaap gira         → 16 customers ko "✅ confirm"  (jhooth)
ab:     line bhari → order-service ko turant "na" → 16 customers ko "abhi bahut bheed hai"  (sach)</pre>
     <p>Dono shaam wahi 16 orders dispatch-service tak nahi pahunche. Par doosri shaam mein <b>kisi ka paisa nahi phansa</b>, aur 16 log jaante hain ki thodi der mein dobara try karna hai.</p>
     <p class="tip">👉 Farak sirf itna hai ki bhari line ne <b>kisko bataya</b>. Agle screen par bhari line ke chaaron jawab, ek-ek karke.</p>`,
  ],
  stages: [
    /* ---------------- 1. bhari line ke chaar jawab ---------------- */
    {
      type: 'dryrun',
      title: '📋 Bhari line ke chaar jawab',
      goal: 'Wahi shaam: 5 orders/second aate hain, dispatch-service 1/second karti hai, line ki hadd 8. Har baar sirf <b>bhari line ka jawab</b> badlega. Do cheezein dekhte raho: kiska kaam nahi hua, aur kisko pata chala.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'rule', label: 'Bhari line ka jawab' },
        { id: 'line', label: 'Line (hadd 8)' },
        { id: 'told', label: 'Bhejne wale ko kya pata chala' },
        { id: 'lost', label: 'Gire · mana hue · ruke' },
        { id: 'age', label: 'dispatch-service ne jo order uthaya, kitni der se khada tha' },
      ],
      steps: [
        {
          clock: 'jawab 1 · yaad karo',
          say: 'Pichhle level ka jawab: <b>naya order chupchaap gira do.</b><br><br>6 second mein 30 orders aaye. 16 gire. order-service ko pata nahi chala, isliye 16 customers ko "confirm" hi dikha.',
          nodes: { src: { tone: 'slow', badge: 'order-service · 16 jhoothe confirm' }, ds: { tone: 'ok', badge: 'line 8/8' }, rd: { tone: 'ok', badge: '' } },
          flows: [{ from: 'src', to: 'ds', label: '5/s', tone: 'bad' }, OUT],
          vars: { rule: 'naya chupchaap girao', line: cap8(8), told: 'kuch nahi', lost: '16 gire', age: '0.1 · 0.9 · 1.7 · 2.5 · 3.3 · 4.1 s' },
        },
        {
          clock: 'jawab 2 · 2.0 s',
          say: 'Jawab 2: <b>bhejne wale ko "na" bolo.</b><br><br>order-service ab paisa kaatne se <b>pehle</b> poochhti hai: "line mein jagah hai?" 2.0 s par #11 aaya. Line: "bhari hoon." order-service customer ko turant bolti hai: <b>"Abhi bahut orders hain, thodi der mein try karein."</b> Paisa nahi kata.',
          nodes: { src: { tone: 'ok', badge: 'order-service · "na" suna' }, ds: { tone: 'slow', badge: 'line 8/8 · "bhari hoon"' } },
          flows: [{ from: 'ds', to: 'src', label: 'na', tone: 'slow', back: true }],
          vars: { rule: 'bhejne wale ko "na" bolo', told: '"line bhari hai" — turant', lost: '1 mana hua (#11)', age: '—' },
        },
        {
          clock: 'jawab 2 · 5.9 s',
          say: `6 second ka hisaab:
            <ul>
              <li>"Confirm" bola: <b>14</b> (5 ko rider mila, 1 par kaam chal raha hai, 8 line mein).</li>
              <li>"Abhi nahi" bola: <b>16</b> — turant, paisa kaatne se pehle.</li>
              <li>Chupchaap gire: <b>0</b>.</li>
            </ul>
            dispatch-service tak utne hi orders pahunche jitne pehle: 14. Farak yeh hai ki ab <b>koi jhootha "confirm" nahi</b>, aur order-service gin sakti hai ki kitne log lautaye gaye.`,
          flows: [{ from: 'src', to: 'ds', label: '5/s', tone: 'acc' }, OUT],
          nodes: { src: { tone: 'ok', badge: 'order-service · 16 ko sach bataya' }, ds: { tone: 'ok', badge: 'line 8/8' } },
          vars: { told: '"line bhari hai" — 16 baar, turant', lost: '16 mana hue · 0 chupchaap', age: '0.1 · 0.9 · 1.7 · 2.5 · 3.3 · 4.1 s' },
        },
        {
          clock: 'jawab 3 · 2.0–3.1 s',
          say: 'Jawab 3: <b>"na" mat bolo — rok lo.</b> Line bhari hai toh order-service ka code wahin ruk jaata hai, jab tak jagah na bane. Customer ke phone par "Placing order…" ghoomta rehta hai.<br><br>2.0 s: #11 aaya → ruk gaya. 2.1 s: dispatch-service ne #3 uthaya → #11 line mein (0.1 s ruk ke). Phir #12, #13, #14, #15, #16 aaye — <b>paanchon ruk gaye</b>. 3.1 s par jagah bani: sirf #12 andar gaya.',
          nodes: { src: { tone: 'busy', badge: 'order-service · 4 ruke hue' }, ds: { tone: 'slow', badge: 'line 8/8' } },
          flows: [{ from: 'src', to: 'ds', label: 'ruko', tone: 'slow', stuck: true }, OUT],
          vars: { rule: 'rok lo (customers aate rehte hain)', told: 'kuch nahi — bas atka hua hai', lost: '4 ruke hue (#13–#16)', age: '—' },
          ask: {
            q: 'Customers aate ja rahe hain: 5 har second. Line har second sirf 1 ko andar leti hai. 5.9 s par order-service ke andar kitne orders ruke honge?',
            choices: [
              '16 — har second 4 badh rahe hain. Line ab order-service ke andar ban gayi hai',
              '0 — tab tak sab line mein chale jaayenge',
              '8 — line ki hadd jitne',
              '1 — ek waqt mein ek hi ruk sakta hai',
            ],
            answer: 0,
            hint: 'Har second 5 aate hain aur 1 andar jaata hai. Baaki 4 kahan khade hain?',
            explain: 'Ruke hue orders khud ek line hain — aur us par <b>koi hadd nahi</b>. Slow motion: 2.9 s par 4 ruke, 3.9 s par 8, 4.9 s par 12, 5.9 s par <b>16</b>.',
          },
        },
        {
          clock: 'jawab 3 · 5.9 s',
          say: 'Gire: 0. Line: 8. Par <b>16 customers ka phone atka hai</b>, aur har second 4 aur atak rahe hain. order-service ki memory mein ab 16 ruke hue orders hain.<br><br>Yeh level 1 wali kahani hi hai. Bina hadd ki line wapas aa gayi — bas ek kadam peeche: dispatch-service se nikal ke order-service ke andar.<br><br>Rokna tabhi kaam karta hai jab <b>jise roka, woh sach mein bhejna band kar de</b>. Customers nahi rukte. Woh aate rehte hain.',
          nodes: { src: { tone: 'bad', badge: 'order-service · 16 ruke, badh rahe' }, ds: { tone: 'ok', badge: 'line 8/8' } },
          flows: [{ from: 'src', to: 'ds', label: 'ruko', tone: 'bad', stuck: true }, OUT],
          vars: { lost: '16 ruke hue — aur har second 4 aur', told: 'kuch nahi — bas atka hua hai' },
        },
        {
          clock: 'jawab 3 (program) · 2.0–4.1 s',
          say: 'Ab bhejne wala badlo. Ek office ne 30 dabbon ka bulk order diya hai. Ek program file se ek-ek order padhta hai aur line mein daalta hai. Yeh program <b>ruk sakta hai</b>: jab tak pichhla order line mein na chala jaaye, program agla padhta hi nahi.<br><br>2.0 s: program #11 dena chahta hai → line bhari → <b>program ruk gaya</b>. 2.1 s: jagah bani → #11 andar. 2.2 s: #12 → ruk gaya. 3.1 s: jagah bani → #12 andar. 4.1 s: #13 andar.',
          nodes: { src: { tone: 'busy', badge: 'bulk program · RUKA hua' }, ds: { tone: 'ok', badge: 'line 8/8' } },
          flows: [{ from: 'src', to: 'ds', label: 'ruko', tone: 'slow', stuck: true }, OUT],
          vars: { rule: 'rok lo (bhejne wala ruk sakta hai)', told: '"ruk ja" — program khud ruka hua hai', lost: '0', age: '—' },
          ask: {
            q: 'Line bharne se pehle program 5 orders/second de raha tha. Line bharne ke baad program ki raftaar kya ho gayi?',
            choices: [
              '1 order/second — jagah tabhi banti hai jab dispatch-service ek order uthati hai',
              '5 orders/second — program ki raftaar nahi badalti',
              '0 — program hamesha ke liye ruk gaya',
              '8 orders/second — line ki hadd jitni',
            ],
            answer: 0,
            hint: '2.1 s, 3.1 s, 4.1 s — program ka order andar kab-kab gaya? Usi pal dispatch-service ne kya kiya tha?',
            explain: 'Program har baar tabhi aage badha jab dispatch-service ne ek order uthaya. dispatch-service ki raftaar (1/second) program ki raftaar ban gayi.',
          },
        },
        {
          clock: 'jawab 3 (program) · 5.9 s',
          say: `6 second ka hisaab:
            <ul>
              <li>Line mein daale: <b>14</b>. Gire: <b>0</b>.</li>
              <li>Ruka hua: <b>sirf program khud</b>. Kahin koi dher nahi.</li>
              <li>Baaki 16 orders <b>file mein hi hain</b>: na gire, na kho gaye, na kisi ki memory mein.</li>
            </ul>
            Program ki raftaar 5/second se 1/second ho gayi. Consumer ki raftaar producer ki raftaar ban gayi — <b>yahi backpressure hai</b>.`,
          nodes: { src: { tone: 'ok', badge: 'bulk program · 1 order/second' }, ds: { tone: 'ok', badge: 'line 8/8' } },
          flows: [{ from: 'src', to: 'ds', label: '1/s', tone: 'ok' }, OUT],
          vars: { told: '"ruk ja" — aur program sach mein ruka', lost: '0 gire · 16 file mein surakshit' },
        },
        {
          clock: 'jawab 4',
          say: 'Jawab 4: <b>line ka sabse purana kaam gira do, naya le lo.</b><br><br>Orders ke liye yeh bura hai: jo sabse der se khada hai, wahi gira.<br><br>Par KhanaKart mein ek aur line hai. Har rider ka phone har second apni <b>location</b> bhejta hai, taaki customer ko map par rider dikhe. Maan lo woh line bhar gayi.',
          nodes: { src: { tone: 'ok', badge: 'riders ke phone · location' }, ds: { tone: 'slow', badge: 'line 8/8' } },
          flows: [{ from: 'src', to: 'ds', label: '5/s', tone: 'acc' }, OUT],
          vars: { rule: 'sabse purana girao, naya lo', told: 'kuch nahi', lost: '—', age: '—' },
          ask: {
            q: 'Rider ki location wali line bhari hai aur ek nayi location aayi. Kya girana sahi hai?',
            choices: [
              'Line ki sabse purani location — purani location map par galat jagah dikhayegi; kaam ki cheez nayi location hai',
              'Nayi location — line mein jo pehle aaya, pehle uska haq',
              'Kuch nahi — rider ke phone ko rok do jab tak jagah na bane',
              'Koi bhi — location toh location hai',
            ],
            answer: 0,
            hint: 'Customer map par kya dekhna chahta hai: rider 8 second pehle kahan tha, ya abhi kahan hai?',
            explain: 'Kuch data ki keemat uski <b>taazgi</b> mein hoti hai: location, share ka bhaav, live score. Aise data mein purana girana nuksaan nahi, safai hai.',
          },
        },
        {
          clock: 'jawab 4 · 5.9 s',
          say: `Slow motion mein "sabse purana girao": 2.0 s par #11 aaya → line ka sabse purana #3 gira, #11 andar. 6 second mein 16 gire — par dekho dispatch-service ne <b>kya uthaya</b>:
            <div class="dr-scroll"><table>
              <tr><th>Bhari line ka jawab</th><th>Jo utha, woh kitni der se khada tha</th></tr>
              <tr><td>Naya girao / "na" bolo</td><td>0.1 · 0.9 · 1.7 · 2.5 · 3.3 · 4.1 s — badhta hua</td></tr>
              <tr><td>Sabse purana girao</td><td>0.1 · 0.9 · <b>1.5 · 1.5 · 1.5 · 1.5 s</b> — tika hua</td></tr>
            </table></div>
            Line hamesha sabse <b>naye</b> 8 se bhari rehti hai.`,
          nodes: { src: { tone: 'ok', badge: 'riders ke phone · location' }, ds: { tone: 'ok', badge: 'line 8/8 · hamesha taaza' } },
          flows: [{ from: 'src', to: 'ds', label: '5/s', tone: 'acc' }, OUT],
          vars: { lost: '16 gire (sabse purane)', age: '0.1 · 0.9 · 1.5 · 1.5 · 1.5 · 1.5 s' },
        },
        {
          clock: 'chaaron ek saath',
          say: `<div class="dr-scroll"><table>
              <tr><th>Bhari line ka jawab</th><th>Bhejne wale ko pata?</th><th>Slow motion (30 orders)</th><th>Lab, asli raftaar (30 s)</th></tr>
              <tr><td>Naya chupchaap girao</td><td>Nahi</td><td>16 gire</td><td>2,16,740 gire · sabse purana 10 s</td></tr>
              <tr><td>"Na" bolo</td><td>Haan, turant</td><td>16 ko "abhi nahi"</td><td>2,16,580 baar "na" · sabse purana 10 s</td></tr>
              <tr><td>Rok lo (jo ruk sakta hai)</td><td>Haan — bhejne wala khud ruka hua hai</td><td>bheje 14 · gire 0</td><td>raftaar 9,832 → <b>2,638/s</b> · gire 0</td></tr>
              <tr><td>Sabse purana girao</td><td>Nahi</td><td>16 gire · line taaza</td><td>2,16,740 gire · sabse purana sirf <b>2 s</b></td></tr>
            </table></div>
            Lab mein bhejne wala 10,000/second ka hai, kaam karne wala 2,000/second ka, line ki hadd 20,000.`,
          nodes: { src: { tone: 'idle', badge: '' }, ds: { tone: 'ok', badge: 'kaam: chaaron mein utna hi' } },
          vars: { rule: 'chaaron', told: 'do mein haan · do mein nahi', lost: 'upar ki table', age: 'upar ki table' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> chaaron jawab mein dispatch-service utna hi kaam karti hai. Farak do sawaalon ka hai: <b>kiska kaam nahi hoga</b> (naye ka, purane ka, ya kisi ka nahi — bas der se), aur <b>kya bhejne wale ko pata chalega</b>.<br>Jis jawab mein bhejne wale ko pata chalta hai aur bhejne wala dheema hota hai, wahi backpressure hai. Insaan ko "na" bolo; program ko rok lo.',
    },

    /* ---------------- 2. chain: signal darwaze tak ---------------- */
    {
      type: 'dryrun',
      title: '🚪 Signal darwaze tak — phones → app-api → order-service',
      goal: 'Ab poori chain. order-service ne apni hadd laga li hai aur "na" bolna seekh liya hai. Dekho ki yeh "na" phone tak pahunchta hai ya raaste mein kho jaata hai.',
      nodes: CHAIN, edges: CEDGES, viz: CVIZ,
      vars: [
        { id: 'b', label: 'order-service bhari ho toh app-api ka jawab' },
        { id: 'sent', label: 'Phones ne requests bheji (15 s)' },
        { id: 'done', label: 'Orders poore hue' },
        { id: 'tries', label: 'Ek order par kitni requests' },
        { id: 'cno', label: 'order-service ne kitni baar "na" bola' },
      ],
      steps: [
        {
          clock: 'pehle ek restaurant',
          say: 'Shanivaar raat, restaurant bhara hai. Rasoi ek saath utne hi order bana sakti hai.<br><br><b>Tareeka 1:</b> sabko andar bitha lo. Waiter har table ka order le kar rasoi bhaagta hai, rasoi bolti hai "abhi nahi", waiter laut-ta hai, table phir poochhti hai… Rasoi ka aadha waqt "abhi nahi" bolne mein jaata hai.<br><br><b>Tareeka 2:</b> darwaze par khada aadmi jaanta hai ki rasoi kitna sambhal sakti hai. Darwaze wala aadmi wahin bol deta hai: <b>"Sir, 20 minute lagenge."</b> Rasoi tak koi faltu chakkar nahi.',
          nodes: { ph: { tone: 'idle', badge: 'grahak' }, api: { tone: 'idle', badge: 'darwaza' }, os: { tone: 'idle', badge: 'rasoi' } },
          vars: { b: '—', sent: '—', done: '—', tries: '—', cno: '—' },
        },
        {
          clock: 'KhanaKart ki chain',
          say: '150 phones lagataar order bhej rahe hain. Har request pehle <b>app-api</b> par aati hai, app-api use <b>order-service</b> ko deta hai.<br><br>order-service ek saath <b>44</b> orders sambhalti hai (4 par kaam + 40 line mein), yaani ~200 orders/second. 45va aaya toh order-service bolti hai: <code>503</code> — "bhari hoon".<br><br>Phones ka niyam purana hai: "fail hua? turant dobara."',
          nodes: { ph: { tone: 'busy', badge: 'fail? turant dobara' }, api: { tone: 'ok', badge: 'jo mila, aage de do' }, os: { tone: 'slow', badge: 'ek saath 44 · phir 503' } },
          flows: [{ from: 'ph', to: 'api', label: 'order', tone: 'acc' }, { from: 'api', to: 'os', label: 'order', tone: 'acc' }],
          vars: { b: '503 jaisa mila waisa phone ko de do', sent: '—', done: '—', tries: '—', cno: '—' },
          ask: {
            q: 'order-service 503 deti hai, app-api wahi 503 phone ko de deta hai, phone turant dobara bhejta hai. order-service ka zyada waqt kis kaam mein jaayega?',
            choices: [
              '"Na" bolne mein — har thukrayi hui request bhi order-service tak pahunchti hai aur jawab maangti hai',
              'Orders poore karne mein — 503 dene mein koi mehnat nahi lagti',
              'Soney mein — phones thak ke ruk jaayenge',
              'Line lambi karne mein',
            ],
            answer: 0,
            hint: 'Jo request thukrayi gayi, woh kahan tak pahunch chuki thi? Use kisne padha aur jawab diya?',
            explain: '"Na" bolna bhi kaam hai. Jo request order-service tak pahunch gayi, use padhna aur jawab dena padta hi hai.',
          },
        },
        {
          clock: 'tareeka 1 · 15 s ka run',
          say: `Lab ka nateeja:
            <ul>
              <li>Phones ne <b>73,571</b> requests bheji.</li>
              <li>Orders poore hue: <b>2,745</b>. Yaani ek order par <b>26.8</b> requests.</li>
              <li>order-service ne <b>70,826</b> baar "na" bola.</li>
            </ul>
            order-service ke paas "dheere bhejo" kehne ka tareeka tha: 503. Par 503 phone tak pahunch ke bhi bekaar gaya: phone ne 503 suna aur turant wapas aa gaya.`,
          nodes: { ph: { tone: 'bad', badge: '73,571 requests' }, api: { tone: 'slow', badge: 'sab aage bheja' }, os: { tone: 'bad', badge: '"na" 70,826 baar' } },
          flows: [{ from: 'ph', to: 'api', label: 'order', tone: 'bad' }, { from: 'api', to: 'os', label: 'order', tone: 'bad' }, { from: 'os', to: 'api', label: '503', tone: 'bad', back: true }],
          vars: { sent: '73,571', done: '2,745', tries: '26.8', cno: '70,826' },
        },
        {
          clock: 'tareeka 2 · darwaze par ginti',
          say: `app-api ab darwaze wala aadmi banta hai. app-api ko pata hai ki order-service ek saath 44 leti hai. Jab 44 requests order-service ke paas hon, toh app-api agli request ko <b>order-service ko chhue bina</b> lauta deta hai: <code>429</code> — "bahut requests".
            <ul>
              <li>order-service ne "na" bola: <b>0 baar</b>. Orders poore: <b>2,975</b> (pehle se zyada).</li>
              <li>Par phones ne <b>6,02,805</b> requests bheji. Ek order par <b>202.6</b>.</li>
            </ul>
            order-service bach gayi. Ab phones app-api ko peet rahe hain.`,
          nodes: { ph: { tone: 'bad', badge: '6,02,805 requests' }, api: { tone: 'slow', badge: '429 · 5,99,830 baar' }, os: { tone: 'ok', badge: '"na" 0 baar' } },
          flows: [{ from: 'ph', to: 'api', label: 'order', tone: 'bad' }, { from: 'api', to: 'ph', label: '429', tone: 'slow', back: true }, { from: 'api', to: 'os', label: 'order', tone: 'ok' }],
          vars: { b: '429 — par "kab aana hai" nahi bataya', sent: '6,02,805', done: '2,975', tries: '202.6', cno: '0' },
          ask: {
            q: 'app-api ne "na" toh bol diya. 429 ke saath app-api aur kya bheje, jisse phones ki bheed kam ho?',
            choices: [
              '<code>Retry-After</code> — "itni der baad aana". Phone utna ruk ke hi dobara bheje',
              'Ek lamba error message',
              'order-service ka address, taaki phone seedha wahan chala jaaye',
              'Kuch nahi — 429 apne aap mein kaafi hai',
            ],
            answer: 0,
            hint: 'Darwaze wale aadmi ne sirf "jagah nahi hai" nahi kaha tha. Usne aur kya kaha tha?',
            explain: '"Sir, 20 minute lagenge." Sirf "na" sunke grahak darwaze par hi khada rehta hai aur har pal poochhta hai. "Kab aana hai" sunke woh hat jaata hai.',
          },
        },
        {
          clock: 'tareeka 3 · 429 + Retry-After',
          say: `app-api ab bolta hai: <code>429</code> + <code>Retry-After: 250 ms</code>. Phone utna rukta hai (thoda random jod ke), phir bhejta hai.
            <div class="dr-scroll"><table>
              <tr><th>app-api ka jawab</th><th>Phones ki requests</th><th>Orders poore</th><th>Ek order par</th><th>order-service ka "na"</th></tr>
              <tr><td>503 aage de do</td><td>73,571</td><td>2,745</td><td>26.8</td><td>70,826</td></tr>
              <tr><td>429, bina Retry-After</td><td>6,02,805</td><td>2,975</td><td>202.6</td><td>0</td></tr>
              <tr><td>429 + Retry-After 250 ms</td><td><b>9,391</b></td><td><b>2,990</b></td><td><b>3.1</b></td><td>0</td></tr>
            </table></div>
            Orders teeno mein lagbhag barabar: order-service ki raftaar hi hadd hai. Jo ghata, woh <b>bekaar kaam</b> hai.`,
          nodes: { ph: { tone: 'ok', badge: '9,391 requests · ruk ke' }, api: { tone: 'acc', badge: '429 + Retry-After' }, os: { tone: 'ok', badge: '"na" 0 baar' } },
          flows: [{ from: 'ph', to: 'api', label: 'order', tone: 'ok' }, { from: 'api', to: 'ph', label: '429', tone: 'slow', back: true }, { from: 'api', to: 'os', label: 'order', tone: 'ok' }],
          vars: { b: '429 + Retry-After 250 ms', sent: '9,391', done: '2,990', tries: '3.1', cno: '0' },
        },
        {
          clock: 'signal ka raasta',
          say: `Kaam ek disha mein gaya, khabar ulti disha mein:
            <pre>kaam:   phone → app-api → order-service
khabar: order-service bhari → app-api ko pata (44 ki ginti)
        → phone ko pata (429) → phone dheema (Retry-After)
        → insaan ko pata (screen: "bahut bheed hai, thodi der mein")</pre>
            Har kadi ke do kaam hain: <b>apni hadd jaanna</b>, aur hadd par aaye toh <b>peeche wali kadi ko batana</b>.<br><br>Ek bhi kadi chup rahi, ya bas jama karti rahi, toh khabar wahin ruk jaati hai — aur line usi kadi ke andar banti hai. (Jawab 3 yaad karo: 16 ruke hue orders.)`,
          nodes: { ph: { tone: 'ok', badge: 'dheema hua' }, api: { tone: 'acc', badge: 'ginta hai · batata hai' }, os: { tone: 'ok', badge: 'poori raftaar se kaam' } },
          flows: [{ from: 'os', to: 'api', label: 'bhari', tone: 'slow', back: true }, { from: 'api', to: 'ph', label: '429', tone: 'slow', back: true }],
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> backpressure kisi ek service ka feature nahi, poori chain ka hai. Khabar ko wahan tak jaana hai jahan se kaam <b>paida</b> hota hai.<br>Raaste ki har kadi ko chahiye: ek hadd, hadd par "na", aur "kab aana hai". Lab: ek order par 26.8 requests → 3.1.',
    },

    /* ---------------- 3. kram pakka karo ---------------- */
    {
      type: 'order',
      title: 'Bhari order-service se phone ki screen tak — khabar ka safar',
      instructions: 'order-service bhar gayi hai. Uske baad kya-kya hota hai? Sahi kram mein lagao.',
      steps: [
        { text: 'order-service ke paas 44 orders ho gaye — order-service ki hadd', explain: '4 par kaam + 40 line mein. Yeh hadd order-service ne khud tay ki hai.' },
        { text: 'app-api apni ginti dekhta hai: 44 requests pehle se order-service ke paas hain', explain: 'app-api ko order-service se poochhna nahi padta. app-api khud ginta hai ki kitni bheji aur kitni lauti.' },
        { text: 'Nayi request aati hai. app-api use order-service ko bheje bina lautata hai: 429 + Retry-After', explain: 'order-service tak koi faltu chakkar nahi. Lab: order-service ne 0 baar "na" bola.' },
        { text: 'Phone 429 dekhta hai aur turant dobara nahi bhejta', explain: 'Yahi woh jagah hai jahan khabar source tak pahunchti hai.' },
        { text: 'Phone Retry-After jitna rukta hai (thoda random jod ke)', explain: 'Random isliye ki saare ruke hue phones ek hi pal par na lautein. (Retries wale levels.)' },
        { text: 'order-service ka ek order poora hota hai — ek jagah banti hai', explain: 'app-api ki ginti 44 se 43 ho jaati hai.' },
        { text: 'Phone ki agli request app-api se hote hue order-service tak pahunch jaati hai', explain: 'Kaam utna hi hua jitna order-service kar sakti thi. Bas bekaar chakkar hat gaye.' },
      ],
    },

    /* ---------------- 4. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — bhari line ke jawab, slow motion mein',
      project: '15-backpressure',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao: 5 orders/second aate hain, 1/second nikalta hai, aur line ka niyam badalta hai (har tareeka 6 second).',
      why: '<code>lib/bounded-queue.js</code> = hadd wali line ka code. <code>tools/slowmo.js</code> wahi line saat tareekon se chalata hai. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Samay tay hai, isliye tumhara output dry run se milega.',
      steps: [
        { text: 'Pehle "rok lo", jab customers aate rehte hain. "handler ruke hue" wala khaana dekho.', cmd: 'cd docker-labs/15-backpressure && node tools/slowmo.js --mode block-server', expect: "order-service: har 200 ms par ek order (5 orders/s) · dispatch-service: ek order par 1 s (1 order/s) · line har second 4 badhti hai\n\n=== line ki hadd 8 · bhari ho toh order-service ka handler rukta hai (block) — customers aate rehte hain ===\n   ek-ek ghatna, 1.8 s se 3.1 s tak:\n    1.8 s  #10 aaya → line 8/8 — BHARI\n    2.0 s  #11 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8\n    2.1 s  #11 line mein gaya (0.1 s ruk ke) → line 8/8\n    2.2 s  #12 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    2.4 s  #13 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    2.6 s  #14 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    2.8 s  #15 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    3.0 s  #16 aaya → line bhari (8/8) → handler RUK gaya · customer ka phone \"Placing order…\"\n    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8\n    3.1 s  #12 line mein gaya (0.9 s ruk ke) → line 8/8\n   har second ka haal:\n      pal   aaye   line mein   handler ruke hue (customer ka spinner)   rider mila\n    0.9 s      5           4                                        0            0\n    1.9 s     10           8                                        0            1\n    2.9 s     15           8                                        4            2\n    3.9 s     20           8                                        8            3\n    4.9 s     25           8                                       12            4\n    5.9 s     30           8                                       16            5\n   nateeja → gire: 0 · line mein: 8 · par 16 customers ka phone \"Placing order…\" par atka hai, aur yeh ginti har second 4 badh rahi hai\n             bina hadd ki line wapas aa gayi — bas ek kadam peeche: line se nikal ke order-service ke andar" },
        { text: 'Ab wahi "rok lo", par bhejne wala ek program hai jo ruk sakta hai.', cmd: 'node tools/slowmo.js --mode block', expect: "order-service: har 200 ms par ek order (5 orders/s) · dispatch-service: ek order par 1 s (1 order/s) · line har second 4 badhti hai\n\n=== line ki hadd 8 · bhejne wala EK program hai jo ruk sakta hai (block) — 30 orders ki bulk file ===\n   ek-ek ghatna, 1.8 s se 4.1 s tak:\n    1.8 s  bhejne wale ne #10 diya → line 8/8 — BHARI\n    2.0 s  bhejne wala #11 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya\n    2.1 s  dispatch-service: #2 ko rider mil gaya · #3 uthaya (1.7 s se khada tha) → line 7/8\n    2.1 s  #11 line mein gaya (0.1 s ruk ke) → line 8/8\n    2.2 s  bhejne wala #12 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya\n    3.1 s  dispatch-service: #3 ko rider mil gaya · #4 uthaya (2.5 s se khada tha) → line 7/8\n    3.1 s  #12 line mein gaya (0.9 s ruk ke) → line 8/8\n    3.1 s  bhejne wala #13 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya\n    4.1 s  dispatch-service: #4 ko rider mil gaya · #5 uthaya (3.3 s se khada tha) → line 7/8\n    4.1 s  #13 line mein gaya (1.0 s ruk ke) → line 8/8\n    4.1 s  bhejne wala #14 dena chahta hai → line bhari (8/8) → bhejne wala RUK gaya\n   har second ka haal:\n      pal   line mein daale   line mein             bhejne wala   rider mila\n    0.9 s                 5           4               chal raha            0\n    1.9 s                10           8               chal raha            1\n    2.9 s                11           8   RUKA hua (line bhari)            2\n    3.9 s                12           8   RUKA hua (line bhari)            3\n    4.9 s                13           8   RUKA hua (line bhari)            4\n    5.9 s                14           8   RUKA hua (line bhari)            5\n   nateeja → line mein daale: 14 · gire: 0 · ruka hua: sirf bhejne wala khud · baaki 16 orders file mein hi hain — na gire, na kho gaye\n             bhejne wale ki raftaar: pehle 5 orders/s, line bharne ke baad 1 order/s — dispatch-service ki raftaar" },
        { text: 'Ab saaton tareeke ek ke baad ek (~45 s). Har tareeke ke ant ki "nateeja" line dekho.', cmd: 'node tools/slowmo.js', expect: "order-service: har 200 ms par ek order (5 orders/s) · dispatch-service: ek order par 1 s (1 order/s) · line har second 4 badhti hai\n\n=== line ki koi hadd nahi · process ki memory mein 20 orders ki line aati hai ===\n    5.0 s   #26 aaya → line 21 · memory mein jagah sirf 20 ki → 💥 process CRASH (out of memory)\n   nateeja → \"confirm\" bola: 26 · rider mila: 4 · gayab: 22 (line ke 21 + jis par kaam chal raha tha 1)\n\n=== line ki koi hadd nahi · memory dugni: 40 orders ki line aati hai ===\n   10.0 s   #51 aaya → line 41 · memory mein jagah sirf 40 ki → 💥 process CRASH (out of memory)\n   nateeja → \"confirm\" bola: 51 · rider mila: 9 · gayab: 42 (line ke 41 + jis par kaam chal raha tha 1)\n\n=== line ki hadd 8 · bhari ho toh naya order chupchaap gira do (drop-new) ===\n   nateeja → \"confirm\" bola: 30 · rider mila ya milega: 14 (5 ko mila, 1 par kaam chal raha, 8 line mein) · chupchaap gire: 16 · process zinda\n\n=== line ki hadd 8 · bhari ho toh customer ko turant \"abhi nahi\" bolo (error) ===\n   nateeja → \"confirm\" bola: 14 (5 ko rider mila, 1 par kaam chal raha, 8 line mein) · \"abhi nahi\" bola: 16 — turant, paisa kaatne se pehle · chupchaap gire: 0\n\n=== line ki hadd 8 · bhari ho toh sabse purana order gira do (drop-oldest) ===\n   nateeja → \"confirm\" bola: 30 · rider mila ya milega: 14 (5 ko mila, 1 par kaam chal raha, 8 line mein) · chupchaap gire: 16 · process zinda\n\n=== line ki hadd 8 · bhari ho toh order-service ka handler rukta hai (block) — customers aate rehte hain ===\n   nateeja → gire: 0 · line mein: 8 · par 16 customers ka phone \"Placing order…\" par atka hai, aur yeh ginti har second 4 badh rahi hai\n             bina hadd ki line wapas aa gayi — bas ek kadam peeche: line se nikal ke order-service ke andar\n\n=== line ki hadd 8 · bhejne wala EK program hai jo ruk sakta hai (block) — 30 orders ki bulk file ===\n   nateeja → line mein daale: 14 · gire: 0 · ruka hua: sirf bhejne wala khud · baaki 16 orders file mein hi hain — na gire, na kho gaye\n             bhejne wale ki raftaar: pehle 5 orders/s, line bharne ke baad 1 order/s — dispatch-service ki raftaar" },
      ],
      observe: {
        q: 'Dono "rok lo" wale run mein line ka niyam ek hi tha. Ek mein 16 orders order-service ke andar jama hue, doosre mein kahin kuch jama nahi hua. Farak kahan tha?',
        choices: [
          'Bhejne wale mein. Customers aate rahe (har order ka apna ruka hua code), jabki bulk program sach mein ruk gaya — usne agla order padha hi nahi',
          'Line ki hadd mein — doosre run mein hadd badi thi',
          'dispatch-service mein — doosre run mein dispatch-service tez thi',
          'Kismat mein — dobara chalao toh ulta hoga',
        ],
        answer: 0,
        explain: 'Rokna tabhi backpressure hai jab jise roka, woh kaam <b>paida karna</b> band kar de. Warna line bas ek kadam peeche khisakti hai.',
      },
      lesson: 'Bhari line ka niyam likhne se pehle poochho: bhejne wala kaun hai, aur kya woh ruk sakta hai?',
    },
  ],
  interview: {
    title: 'Interview Round — signal samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum "kisko pata chala" tak sochte ho. 🎤',
    questions: [
      {
        q: '"Humne queue bounded kar di aur bhari hone par producer ko block kar diya. Phir bhi API server ki memory badhti ja rahi hai. Kyun?"',
        choices: [
          'Block hue requests API server ke andar jama ho rahe hain — users nahi ruke, toh ruke hue handlers khud ek bina hadd ki line ban gaye. User-facing raaste par block ki jagah turant "na" (429 + Retry-After) do',
          'Bounded queue mein memory leak hota hai',
          'Queue ki hadd aur badha do',
          'Block karna hamesha galat hai',
        ],
        answer: 0,
        explain: 'Slow motion: "rok lo" + aate hue customers → 5.9 s par 16 ruke hue, har second 4 aur. Wahi "rok lo" + ek program jo ruk sakta hai → kahin kuch jama nahi, raftaar 5/s → 1/s.',
      },
      {
        q: '"Hamara downstream 503 deta hai, hum wahi client ko de dete hain. Kya yeh kaafi backpressure hai?"',
        choices: [
          'Nahi. Client turant dobara bhejega aur downstream ka waqt "na" bolne mein jaayega. Beech wali service downstream ki hadd jaane, hadd par use chhue bina 429 + Retry-After de, aur client us Retry-After ko maane',
          'Haan — 503 hi backpressure hai',
          '503 ki jagah 500 bhejo',
          'Client ko block kar do',
        ],
        answer: 0,
        explain: 'Lab: 503 aage dene par ek order par 26.8 requests, order-service ne 70,826 baar "na" bola. 429 + Retry-After 250 ms par 3.1 requests, "na" 0 baar.',
      },
      {
        q: '"Live location, share ke bhaav jaisa data ek bhari queue mein aa raha hai. Kya giraoge?"',
        choices: [
          'Sabse purana. Is data ki keemat taazgi mein hai; line hamesha sabse naye data se bhari rehni chahiye',
          'Sabse naya — pehle aaya, pehle paya',
          'Kuch nahi — producer ko block karo',
          'Queue ki hadd hata do',
        ],
        answer: 0,
        explain: 'Lab, asli raftaar: naya girane par line ka sabse purana kaam 10 s purana; sabse purana girane par sirf 2 s.',
      },
    ],
  },
  success: [
    'Bhari line ke chaaron jawab bata sakte ho, aur har ek mein kisko pata chalta hai',
    'Samjha sakte ho ki "rok lo" kab backpressure hai aur kab line bas peeche khisakti hai',
    'Chain mein khabar ka raasta bata sakte ho: hadd → 429 → Retry-After → source',
  ],
  cards: [
    { front: 'Bhari line ke chaar jawab?', back: '<b>Naya chupchaap girao</b> · <b>"na" bolo</b> · <b>rok lo</b> · <b>sabse purana girao</b>. Kaam chaaron mein utna hi hota hai; farak hai kiska kaam nahi hua aur kisko pata chala.' },
    { front: '"Rok lo" kab kaam karta hai?', back: 'Jab jise roka, woh sach mein bhejna band kar de (program, batch job, stream). Customers nahi rukte: slow motion mein 16 ruke hue orders order-service ke andar jama hue. Insaan ko turant "na" bolo.' },
    { front: 'Sabse purana girana kab sahi?', back: 'Jab data ki keemat taazgi mein ho: location, bhaav, live score. Lab: line ka sabse purana kaam 2 s purana (naya girane par 10 s).' },
    { front: 'Chain mein backpressure ke teen hisse?', back: 'Har kadi: (1) apni hadd jaane, (2) hadd par peeche wale ko "na" bole — 429, (3) bataye kab aana hai — Retry-After. Lab: ek order par 26.8 requests → 3.1.' },
    { front: '429 bina Retry-After?', back: 'Downstream bach jaata hai, par client darwaze par hi khada rehta hai. Lab: ek order par 202.6 requests (6,02,805 kul).' },
  ],
},
]);

})();
