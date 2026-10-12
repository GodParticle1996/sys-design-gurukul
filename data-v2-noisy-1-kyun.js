/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: NOISY NEIGHBOUR (paanch chhote levels)
     1 Kyun    → samasya pehle: ek tenant ka shor, doosre ki request fail (yeh file)
     2 Kaise   → baari-baari (har tenant ki apni line), token wali baalti, alag khidki
     3 Code    → lib/fair-queue.js aur lib/token-bucket.js, line by line
     4 Library → asli limiter (express-rate-limit); Kubernetes aur API gateway mein wahi teen cheezein
     5 Kab     → hadd, baari, alag khidki, ya badi machine? autoscale ki der; raat ka job din mein
   Har number docker-labs/39-noisy-neighbor ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/tenants.js (ex1).
   Source video (credit): Software Developer Diaries — "How to avoid the Noisy Neighbor problem in your software architecture?"
   ===================================================================== */
(function () {

/* do tenant, ek shared service */
const NODES = [
  { id: 'a', icon: '🏢', label: 'Annapurna (A)', x: 165, y: 85 },
  { id: 'b', icon: '🍲', label: 'Bholu Dhaba (B)', x: 165, y: 245 },
  { id: 'api', icon: '🚪', label: 'partner-api', x: 690, y: 165 },
];
const EDGES = [{ from: 'a', to: 'api' }, { from: 'b', to: 'api' }];
const VIZ = { w: 890, h: 330 };
const A = n => Array.from({ length: n }, () => 'busy:A');
const Bq = n => Array.from({ length: n }, () => 'wait:B');

VISUALS['nn-kyun'] = {
  t: 'Ek hi line: Annapurna ke 10 kaam aage, Bholu Dhaba ka ek order peeche',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { a: { tone: 'busy', badge: '12 requests ek saath' }, b: { tone: 'bad', badge: '7 mein se 3 fail' }, api: { tone: 'slow', badge: 'line: A A A A A A A A A A B' } },
    flows: [{ from: 'a', to: 'api', label: '12', tone: 'bad' }, { from: 'b', to: 'api', label: '1', tone: 'acc' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'nn-kyun',
  icon: '🔊',
  group: '🔊 Noisy Neighbour',
  title: 'Noisy Neighbour 1 · Kyun — padosi ka shor, tumhari request fail',
  badge: 'Padosi Jasoos',
  objectives: [
    'Bholu Dhaba ne kuch galat nahi kiya. Phir Bholu Dhaba ke 7 mein se 3 order accept kyun fail hue?',
    'Annapurna ka shor 0.22 second ka tha. Bholu Dhaba 3.5 second tak kyun bhugta?',
    'Har tenant par hadd lagane se kya bacha — aur kya bekaar gaya?',
    'Tenant, multi-tenant, noisy neighbour, quota, 429: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🍲 Shanivaar raat 8 baje, Bholu Dhaba</h3>
     <p>Bholu Dhaba ek chhota restaurant hai. KhanaKart ke orders ek tablet par aate hain. Bholu "Accept" dabata hai, tablet KhanaKart ke <b>partner-api</b> ko batata hai, aur order pakka.</p>
     <p>Aaj raat tablet baar-baar yeh dikha raha hai:</p>
     <pre>⚠️ Order accept nahi ho paya. Dobara try karein.</pre>
     <p>Bholu ka Wi-Fi theek hai. KhanaKart ka status page hara hai. Bholu ne aaj kuch alag nahi kiya.</p>
     <p>Usi waqt, shehar ke doosre kone mein, <b>Annapurna Foods</b> (400 outlets wala chain) ke IT wale ne ek script chalayi: naye daam saare outlets ke menu mein daal do. Annapurna aur Bholu Dhaba ek doosre ko jaante bhi nahi.</p>
     <p>Dono mein ek hi cheez saajha hai: KhanaKart ka wahi partner-api.</p>
     <pre>lab, asli raftaar: ek tenant ne 5 second shor kiya → do shaant tenants ki 578 mein se 233 requests fail (40%)</pre>
     <p class="tip">👉 Agle screen par wahi raat slow motion mein: partner-api ki do khidkiyan, Bholu Dhaba ka har second ek order, aur Annapurna ki 12 requests ek saath.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: ek hi line ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — sab ek hi line mein',
      goal: 'Har click = ek ghatna. Jo badla, woh peele rang mein chamkega. Line mein <b>A</b> = Annapurna ka kaam, <b>B</b> = Bholu Dhaba ka. Dekho ki B ka kaam kiske peeche khada hota hai.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'win', label: 'partner-api ki 2 khidkiyan' },
        { id: 'line', label: 'partner-api ki line' },
        { id: 'b', label: 'Bholu Dhaba ke order accept' },
        { id: 'a', label: 'Annapurna ka menu sync' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'partner-api ke paas <b>2 khidkiyan</b> hain. Ek request par ek khidki <b>0.5 second</b> lagati hai. Yaani partner-api 4 requests/second kar sakta hai.<br><br>Bholu Dhaba har second ek "order accept" bhejta hai. Bholu Dhaba ka tablet jawab ka <b>1.5 second</b> intezaar karta hai; uske baad error dikha deta hai.',
          nodes: { a: { tone: 'idle', badge: 'abhi shaant' }, b: { tone: 'ok', badge: 'har second 1 request' }, api: { tone: 'ok', badge: '2 khidkiyan · 0.5 s har request' } },
          vars: { win: ['free', 'free'], line: 'khaali', b: '—', a: 'abhi shuru nahi' },
        },
        {
          clock: '0.25–0.75 s',
          say: 'Bholu Dhaba ka pehla order accept, <b>B#1</b>. Line khaali hai: B#1 seedha khidki 1 par. 0.75 s par jawab aa gaya: ✅ <b>0.50 s</b> mein.<br><br>Aam din aisa hi dikhta hai.',
          flows: [{ from: 'b', to: 'api', label: 'B#1', tone: 'ok' }],
          nodes: { b: { tone: 'ok', badge: 'B#1 ✅ 0.50 s' } },
          vars: { b: ['ok'] },
        },
        {
          clock: '1.00–1.22 s',
          say: 'Annapurna ki script chali: <b>12 requests</b>, 0.22 second ke andar. Pehli do seedhe khidkiyon par. Baaki <b>10 line mein</b>.',
          flows: [{ from: 'a', to: 'api', label: '12', tone: 'bad' }],
          nodes: { a: { tone: 'busy', badge: '12 requests ek saath' }, api: { tone: 'busy', badge: 'line mein 10' } },
          vars: { win: ['busy:A#1', 'busy:A#2'], line: A(10), a: '12 mein se 0 hue · 2 khidki par · 10 line mein' },
        },
        {
          clock: '1.25 s',
          say: 'Bholu Dhaba ka agla order accept, <b>B#2</b>. Dono khidkiyan Annapurna ke kaam mein lagi hain. B#2 line mein lagta hai — <b>11vein number par</b>.',
          flows: [{ from: 'b', to: 'api', label: 'B#2', tone: 'acc' }],
          nodes: { b: { tone: 'busy', badge: 'B#2 line mein, 11va' }, api: { tone: 'busy', badge: 'line mein 11' } },
          vars: { line: A(10).concat(Bq(1)), b: ['ok', 'wait:#2'] },
          ask: {
            q: 'B#2 ke aage Annapurna ke 10 kaam hain. Do khidkiyan har 0.5 second mein 2 kaam nipta-ti hain. Bholu Dhaba ka tablet 1.5 second rukta hai. B#2 ka kya hoga?',
            choices: [
              'B#2 ki baari ~4.0 s par aayegi. Tablet 2.75 s par hi haar maan lega — B#2 fail',
              'B#2 ~1.5 s par ho jaayega — agli khaali khidki use le legi',
              'partner-api B#2 ko pehle kar dega, kyunki Bholu Dhaba ne sirf ek request bheji hai',
              'Annapurna ke kaam ruk jaayenge jab tak B#2 na ho jaaye',
            ],
            answer: 0,
            hint: '10 kaam, har 0.5 second mein 2. Kitne second lagenge? B#2 kab aaya tha, aur tablet kab tak rukega?',
            explain: '10 kaam ÷ 4 per second = 2.5 second. B#2 1.25 s par aaya; tablet 1.25 + 1.5 = <b>2.75 s</b> tak rukega. Line ko nahi pata ki B#2 kiska hai — line sirf yeh jaanti hai ki kaun pehle aaya.',
          },
        },
        {
          clock: '2.25–2.75 s',
          say: '2.25 s: <b>B#3</b> aaya. Line: Annapurna ke 6, phir B#2, phir B#3.<br><br>2.75 s: B#2 ko aaye 1.5 second ho gaye. Tablet ne haar maan li: <b>"Order accept nahi ho paya."</b> B#2 abhi bhi line mein khada hai — partner-api ko pata hi nahi ki tablet ja chuka.',
          flows: [{ from: 'b', to: 'api', label: 'B#3', tone: 'acc' }],
          nodes: { b: { tone: 'bad', badge: 'B#2 ❌ tablet ne haar maani' }, api: { tone: 'busy', badge: 'line mein 6' } },
          vars: { win: ['busy:A#7', 'busy:A#8'], line: A(4).concat(Bq(2)), b: ['ok', 'bad', 'wait:#3'], a: '12 mein se 6 hue' },
        },
        {
          clock: '3.25–3.75 s',
          say: '3.25 s: <b>B#4</b> aaya. Line: Annapurna ke 2, phir B#2, B#3, B#4.<br><br>3.75 s: B#3 bhi fail. Tablet par doosri baar wahi error.',
          flows: [{ from: 'b', to: 'api', label: 'B#4', tone: 'acc' }],
          nodes: { b: { tone: 'bad', badge: 'B#2 ❌ · B#3 ❌' } },
          vars: { win: ['busy:A#11', 'busy:A#12'], line: Bq(3), b: ['ok', 'bad', 'bad', 'wait:#4'], a: '12 mein se 10 hue' },
        },
        {
          clock: '4.00–4.52 s',
          say: '4.02 s: Annapurna ka aakhri kaam ho gaya. Annapurna ke <b>12 mein se 12</b> ✅.<br><br>Ab khidkiyan B#2 aur B#3 uthati hain — jinka tablet kab ka haar maan chuka. partner-api poora 0.5 second lagata hai un jawabon par jinhe ab koi nahi sunega. <b>Bekaar kaam.</b>',
          nodes: { a: { tone: 'ok', badge: '12 mein se 12 ✅ · 4.02 s' }, api: { tone: 'slow', badge: 'B#2, B#3 par bekaar kaam' } },
          vars: { win: ['skip:B#2', 'skip:B#3'], line: Bq(2), b: ['ok', 'bad', 'bad', 'wait:#4', 'wait:#5'], a: '12 mein se 12 hue ✅ (4.02 s par)' },
          ask: {
            q: 'Annapurna ka burst 1.22 s par khatam ho gaya tha, aur Annapurna ka saara kaam 4.02 s par. B#4 3.25 s par aaya tha, B#5 4.25 s par. Inka kya hoga?',
            choices: [
              'B#4 bhi fail (4.75 s par tablet haar maanega; jawab 5.00 s par banega). B#5 bach jaayega — 0.77 s mein',
              'Dono turant ho jaayenge — Annapurna ka kaam toh khatam ho chuka',
              'Dono fail honge',
              'B#5 pehle hoga, phir B#4',
            ],
            answer: 0,
            hint: 'Khidkiyan abhi kis kaam mein lagi hain? B#4 ke aage line mein kaun hai?',
            explain: 'B#4 ke aage B#2 aur B#3 ka bekaar kaam tha. B#4 4.50 s par khidki tak pahuncha; tablet 4.75 s par ja chuka. <b>Shor khatam hone ke baad bhi line saaf hone mein waqt lagta hai.</b>',
          },
        },
        {
          clock: 'nateeja',
          say: `Slow motion ke 7.5 second:
            <ul>
              <li>Bholu Dhaba: 7 mein se <b>4 ✅, 3 ❌</b>.</li>
              <li>Annapurna: 12 mein se <b>12 ✅</b>.</li>
              <li>partner-api ka bekaar kaam: 3 requests (1.5 second).</li>
            </ul>
            Annapurna ne <b>0.22 second</b> shor kiya. Bholu Dhaba <b>3.5 second</b> tak bhugta (1.25 s se 4.75 s).<br><br>Aur Bholu Dhaba ke hisaab se: "kabhi order accept hota hai, kabhi nahi." Koi pattern nahi dikhta.`,
          nodes: { a: { tone: 'ok', badge: '12 mein se 12 ✅' }, b: { tone: 'bad', badge: '7 mein se 3 ❌' }, api: { tone: 'idle', badge: '3 requests ka bekaar kaam' } },
          vars: { win: ['free', 'free'], line: 'khaali', b: ['ok', 'bad', 'bad', 'bad', 'ok', 'ok', 'ok'], a: '12 mein se 12 hue ✅' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi kahani asli raftaar par. partner-api jaisi service: 4 khidkiyan, <b>200 requests/second</b>. Tenant A 5 second ke liye <b>400 requests/second</b> bhejta hai. Tenant B aur C shaant hain: 30 requests/second har ek.
            <ul>
              <li>B aur C ki 578 mein se <b>233 requests fail</b> (40%).</li>
              <li>B aur C ki jo requests hui, unme sabse dheemi 1% ko <b>1,031 ms</b> lage. (Aam din: ~20 ms.)</li>
              <li>A ki 1,376 requests ho gayi.</li>
            </ul>`,
          nodes: { a: { tone: 'busy', badge: 'lab: 400/s, 5 second' }, b: { tone: 'bad', badge: 'lab: 40% fail' }, api: { tone: 'slow', badge: 'lab: 200/s' } },
          flows: [{ from: 'a', to: 'api', label: '400/s', tone: 'bad' }, { from: 'b', to: 'api', label: '30/s', tone: 'acc' }],
          vars: { win: 'lab: 4 khidkiyan, 200 requests/second', line: 'lab: hadd 200, bhari', b: 'lab: 578 mein se 233 fail', a: 'lab: 1,376 hui' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> ek line sabko barabar nahi rakhti. Jo zyada bhejta hai, line usi ki ho jaati hai — aur shaant tenant ka kaam kisi aur ke kaam ke peeche khada rehta hai.<br>Shaant tenant ko yeh "kabhi chalta hai, kabhi nahi" jaisa dikhta hai. Is samasya ka naam: <b>noisy neighbour</b> (shor karne wala padosi).',
    },

    /* ---------------- 2. pehla ilaaj: har tenant ki hadd ---------------- */
    {
      type: 'dryrun',
      title: '✋ Pehla ilaaj: har tenant ki hadd — aadha kaam',
      goal: 'Wahi raat, wahi requests. partner-api mein ek naya niyam hai. Dekho kya bacha — aur kya bekaar gaya.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'rule', label: 'Niyam' },
        { id: 'win', label: 'partner-api ki 2 khidkiyan' },
        { id: 'b', label: 'Bholu Dhaba ke order accept' },
        { id: 'a', label: 'Annapurna ka menu sync' },
        { id: 'idle', label: 'Khidkiyon ne kul kitna kaam kiya' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar Bholu Dhaba ke 7 mein se 3 order accept fail hue. Tum partner-api ki team mein ho. Pehla sujhaav: <b>"Har tenant ek second mein 2 se zyada requests nahi bhej sakta. Zyada bheje toh turant mana."</b>',
          nodes: { a: { tone: 'idle', badge: 'hadd: 2 / second' }, b: { tone: 'idle', badge: 'hadd: 2 / second' }, api: { tone: 'ok', badge: 'har tenant ki ginti' } },
          vars: { rule: 'har tenant: 2 requests / second', win: ['free', 'free'], b: 'pichhli baar: 7 mein se 3 ❌', a: 'pichhli baar: 12 mein se 12 ✅', idle: 'pichhli baar: 9.50 s (1.50 s bekaar)' },
          ask: {
            q: 'Annapurna 1.00 s par 12 requests ek saath bhejega. Is niyam ke saath kya hoga?',
            choices: [
              'Pehli 2 andar jaayengi. Baaki 10 ko turant "mana" milega',
              'Baarah ki baarah andar jaayengi, bas dheere-dheere',
              'Annapurna hamesha ke liye block ho jaayega',
              'Bholu Dhaba ki requests mana hongi',
            ],
            answer: 0,
            hint: 'Hadd 2 per second hai. Annapurna ne 0.22 second mein kitni bheji?',
            explain: 'Hadd se upar ki request line mein lagti hi nahi. partner-api us request ko turant lauta deta hai: status <code>429</code> — "bahut zyada requests".',
          },
        },
        {
          clock: '1.00–1.22 s',
          say: 'Annapurna ki 12 requests. Pehli 2 khidkiyon par. Baaki <b>10 ko turant 429</b> — mana. Line khaali.',
          flows: [{ from: 'a', to: 'api', label: '12', tone: 'bad' }, { from: 'api', to: 'a', label: '429', tone: 'slow', back: true }],
          nodes: { a: { tone: 'slow', badge: '2 andar · 10 ko 429' }, api: { tone: 'ok', badge: 'line khaali' } },
          vars: { win: ['busy:A#1', 'busy:A#2'], a: '12 mein se 2 andar · 10 mana (429)' },
        },
        {
          clock: '1.25–2.00 s',
          say: '1.25 s: Bholu Dhaba ka <b>B#2</b>. Line mein sirf B#2. 1.50 s par khidki 1 khaali hui aur B#2 utha. 2.00 s par jawab: ✅ <b>0.75 s</b> mein.',
          flows: [{ from: 'b', to: 'api', label: 'B#2', tone: 'ok' }],
          nodes: { b: { tone: 'ok', badge: 'B#2 ✅ 0.75 s' } },
          vars: { win: ['busy:B#2', 'free'], b: ['ok', 'ok'] },
        },
        {
          clock: '2.00 s ke baad',
          say: 'Annapurna ki do requests ho chuki. Bholu Dhaba har second ek bhejta hai. Baaki samay <b>dono khidkiyan khaali baithi hain</b>.',
          nodes: { a: { tone: 'slow', badge: '10 requests mana ho chuki' }, api: { tone: 'idle', badge: 'khidkiyan khaali' } },
          vars: { win: ['free', 'free'] },
          ask: {
            q: 'Khidkiyan khaali hain. Annapurna ki 10 requests mana ho chuki hain. Annapurna ka menu sync kaise poora hoga?',
            choices: [
              'Annapurna ko dobara bhejna padega — aur 2 per second se tez nahi, chaahe khidkiyan khaali hi kyun na hon',
              'partner-api khaali khidki dekh ke mana ki hui requests khud utha lega',
              'Hadd apne aap hat jaayegi jab khidkiyan khaali hongi',
              'Menu sync poora ho chuka hai',
            ],
            answer: 0,
            hint: 'Mana ki hui request kahan gayi? Kya hadd ko pata hai ki khidkiyan khaali hain?',
            explain: 'Hadd sirf ginti dekhti hai: "is tenant ne is second mein kitni bheji". Hadd ko nahi dikhta ki khidkiyan khaali hain. Mana ki hui request partner-api ke paas hai hi nahi.',
          },
        },
        {
          clock: 'nateeja',
          say: `<div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>Bholu Dhaba</th><th>Annapurna</th><th>Khidkiyon ne kaam kiya</th></tr>
              <tr><td>Sab ek line mein</td><td>7 mein se 3 ❌</td><td>12 mein se 12 ✅ (4.02 s)</td><td>9.50 s — usme 1.50 s bekaar</td></tr>
              <tr><td>Har tenant: 2 / second</td><td><b>7 mein se 0 ❌</b></td><td>12 mein se <b>2</b> ✅, 10 mana</td><td><b>4.50 s</b></td></tr>
            </table></div>
            Bholu Dhaba bach gaya. Yeh asli sudhaar hai.<br><br>Par Annapurna ka kaam poora nahi hua, jabki khidkiyan aadhe se zyada samay khaali baithi rahi.`,
          nodes: { a: { tone: 'slow', badge: '12 mein se 2 ✅ · 10 mana' }, b: { tone: 'ok', badge: '7 mein se 7 ✅' }, api: { tone: 'idle', badge: '15 s mein 4.50 s kaam' } },
          vars: { b: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'], a: '12 mein se 2 ✅ · 10 mana', idle: '4.50 s (15 s mein se)' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi niyam asli raftaar par (har tenant 80 requests/second; service 200/second):
            <ul>
              <li>B aur C: 580 mein se <b>0 fail</b>.</li>
              <li>A: sirf <b>721</b> hui; <b>1,453</b> ko 429. (Ek line mein A ki 1,376 hui thi.)</li>
            </ul>
            B aur C sirf 60/second le rahe the. 200 mein se 140 khaali tha. A ko phir bhi 80 par rok diya gaya.`,
          nodes: { a: { tone: 'slow', badge: 'lab: 1,453 ko 429' }, b: { tone: 'ok', badge: 'lab: 0 fail' }, api: { tone: 'idle', badge: 'lab: jagah khaali thi' } },
          vars: { rule: 'lab: har tenant 80 / second', win: 'lab: 200 requests/second', b: 'lab: 580 mein se 0 fail', a: 'lab: 721 hui · 1,453 mana', idle: 'lab: 200 mein se 140 khaali, A phir bhi ruka' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> har tenant par hadd lagane se shaant tenant bach jaata hai. Par hadd andhi hoti hai: hadd ko sirf ginti dikhti hai, khaali khidki nahi.<br>Agla sawaal apne aap banta hai: Bholu Dhaba ko bachate hue, khaali jagah Annapurna ko kaise dein?',
    },

    /* ---------------- 3. idea: railway ki khidki ---------------- */
    {
      type: 'cards',
      title: '🚉 Yeh tum dekh chuke ho — reservation ki khidki',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Ek ticket ke liye do ghante kyun lage?',
          say: 'Railway reservation ki khidki. Tumhe ek ticket chahiye. Tumse aage ek agent khada hai — <b>40 form</b> le kar.<br><br>Babu ek-ek form bharta hai. Tum agent ke 40 form ke peeche ho. Khidki 8 baje band ho jaati hai. Tum bina ticket ghar jaate ho.<br><br><b>KhanaKart mein:</b> agent = Annapurna · tum = Bholu Dhaba · babu = partner-api ki khidki · "8 baje band" = tablet ka 1.5 second.',
        },
        {
          title: '2. "Ek vyakti, ek form" ka board kaafi kyun nahi?',
          say: 'Agle din khidki par board lagta hai: <b>"Ek vyakti, ek form."</b> Agent ab line nahi rok sakta. Tumhe ticket mil jaata hai.<br><br>Par dopahar 3 baje khidki par koi nahi hai. Babu khaali baitha hai. Agent ke haath mein 39 form hain — aur board ab bhi kehta hai "ek hi".<br><br><b>KhanaKart mein:</b> yahi "har tenant 2 per second" tha. Bholu Dhaba bacha, par khidkiyan khaali baithi rahi aur Annapurna ki 10 requests mana hui.',
        },
        {
          title: '3. Behtar niyam kya ho sakta hai?',
          say: 'Babu ko ek aisa niyam chahiye jisme tumhe agent ke 40 form ke peeche na rukna pade — aur jab line mein koi na ho, tab agent ka kaam bhi chalta rahe.',
          ask: {
            q: 'Kaunsa niyam dono kaam karega?',
            choices: [
              '"Ek baar mein ek form. Phir line ke peeche jao. Peeche koi nahi hai toh tum hi phir aa jao."',
              '"Agent ko khidki par aane hi mat do."',
              '"Jo pehle aaya, uske saare form pehle."',
              '"Agent ke form raat ko bharenge" — aur din mein khidki khaali rahe toh rahe',
            ],
            answer: 0,
            hint: 'Tumhe jaldi baari chahiye. Agent ko khaali khidki chahiye. Kaunsa niyam kisi ko rokta nahi, bas baari baant-ta hai?',
            explain: 'Yeh hadd nahi, <b>baari</b> hai. Tum ek form ke baad nikal jaate ho; agent ek-ek karke bharta rehta hai, aur jab koi aur nahi hota tab lagataar. Agla level isi niyam ka hai.',
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Ek grahak jo kisi saajhe system ko use karta hai (Annapurna, Bholu Dhaba)</td><td><b>Tenant</b></td></tr>
              <tr><td>Ek hi system, kai tenants ke liye</td><td><b>Multi-tenant</b></td></tr>
              <tr><td>Ek tenant ke bojh se doosre tenants ka kaam bigadna</td><td><b>Noisy neighbour</b></td></tr>
              <tr><td>"Har tenant itne se zyada nahi" wali hadd</td><td><b>Quota</b> ya <b>rate limit</b>; hadd lagane ko <b>throttling</b> kehte hain</td></tr>
              <tr><td>Hadd se upar ki request ko mila jawab</td><td><b>429</b> Too Many Requests</td></tr>
            </table></div>
            ⚠️ <b>Ek aam galatfehmi:</b> "Beech mein ek queue laga do, load barabar ho jaayega." Slow motion mein ek queue (line) lagi hui thi — aur line Annapurna ki ho gayi. Ek saajhi line bheed ko <b>sokhti</b> hai, <b>baant-ti nahi</b>.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> saajhe system mein do alag sawaal hain. <b>Bachav:</b> ek tenant doosre ka kaam na bigaad paaye. <b>Bekaar na jaaye:</b> khaali jagah kisi ke kaam aaye. Ek line pehla nahi karti. Hadd doosra nahi karti.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Annapurna aur Bholu Dhaba dono ek hi partner-api use karte hain', right: 'Multi-tenant', explain: 'Ek system, kai grahak. Sasta padta hai — aur isi wajah se padosi ka shor mumkin hota hai.' },
        { left: 'Annapurna ke 12 requests ke peeche Bholu Dhaba ka order accept fail ho gaya', right: 'Noisy neighbour', explain: 'Slow motion: Bholu Dhaba ke 7 mein se 3 fail. Lab: shaant tenants ki 40% requests fail.' },
        { left: 'Har tenant ek second mein 2 se zyada requests nahi bhej sakta', right: 'Quota (rate limit)', explain: 'Har tenant ki hadd. Slow motion: Bholu Dhaba ke 0 fail — par Annapurna ki 10 mana, jabki khidkiyan khaali thi.' },
        { left: 'Annapurna ki 3ri request ko turant "mana" mila', right: '429', explain: '429 Too Many Requests: "tumne hadd se zyada bheja". Request line mein lagti hi nahi.' },
        { left: 'Annapurna, Bholu Dhaba, Chai Adda — partner-api ke grahak', right: 'Tenant', explain: 'Tenant = saajhe system ka ek grahak. Yeh ek company ho sakti hai, ek team, ya ek user.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Ek customer shikayat karta hai ki hamari API kabhi chalti hai, kabhi timeout. Us customer ke apne requests bahut kam hain, aur hamara dashboard theek dikhta hai. Kahan dekhoge?"',
        choices: [
          'Dekhunga ki us waqt koi doosra tenant bahut zyada bhej raha tha ya nahi. Saajhi line mein shaant tenant ka kaam shor karne wale ke kaam ke peeche khada ho jaata hai. Graph tenant ke hisaab se alag-alag dekhne padenge — sabka jod theek dikh sakta hai',
          'Customer ka internet kharab hoga',
          'Server ko restart kar dunga',
          'Timeout badha dunga',
        ],
        answer: 0,
        explain: 'Slow motion: Annapurna ke 12 mein se 12 ✅, Bholu Dhaba ke 7 mein se 3 ❌ — "kabhi chalta hai, kabhi nahi". Lab: shaant tenants ki 578 mein se 233 fail.',
      },
      {
        q: '"Noisy neighbour se bachne ke liye humne har tenant par rate limit laga di. Ab ek bada customer keh raha hai ki raat 3 baje bhi us customer ke bulk job ko 429 milta hai, jab system khaali hota hai. Kya galat hai?"',
        choices: [
          'Rate limit sirf ginti dekhti hai, khaali jagah nahi. Shaant tenants bache, par khaali capacity bekaar ja rahi hai. Baari baantne wala tareeka (har tenant ki apni line, baari-baari) dono kaam karta hai',
          'Customer ko raat mein kaam nahi karna chahiye',
          'Rate limit hata do',
          'Kuch galat nahi — 429 ka matlab hi yahi hai',
        ],
        answer: 0,
        explain: 'Lab: har tenant 80/second ki hadd → A ki sirf 721 hui, 1,453 ko 429 — jabki 200 mein se 140 khaali tha.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki shaant tenant ki request shor karne wale ke peeche kaise fail hoti hai',
    'Har tenant ki hadd kya bachati hai aur kya bekaar karti hai — number ke saath',
    'Tenant, multi-tenant, noisy neighbour, quota aur 429 ko pehchaan sakte ho',
  ],
  cards: [
    { front: 'Noisy neighbour kya hai?', back: 'Saajhe system mein ek tenant ka bojh doosre tenants ka kaam bigaad deta hai. Slow motion: Annapurna ki 12 requests → Bholu Dhaba ke 7 mein se 3 order accept fail. Lab: shaant tenants ki 40% fail.' },
    { front: 'Shor 0.22 second ka tha. Asar 3.5 second kyun raha?', back: 'Line saaf hone mein waqt lagta hai, aur fail ho chuki requests ka kaam bhi line mein khada rehta hai (tablet ja chuka, par line ko pata nahi). Slow motion: 3 requests ka bekaar kaam.' },
    { front: 'Har tenant ki hadd (quota): kya bacha, kya gaya?', back: 'Bacha: shaant tenant (Bholu Dhaba 0 fail). Gaya: khaali jagah — Annapurna ki 10 requests mana, khidkiyon ne 15 s mein sirf 4.50 s kaam kiya. Lab: A ki 1,453 ko 429.' },
    { front: '"Ek queue laga do" noisy neighbour ka ilaaj hai?', back: 'Nahi. Ek saajhi line bheed ko sokhti hai, baant-ti nahi: line usi ki ho jaati hai jo zyada bhejta hai. Slow motion mein line thi — aur 3 fail hue.' },
  ],
},
]);

})();
