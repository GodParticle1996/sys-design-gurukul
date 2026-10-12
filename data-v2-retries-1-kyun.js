/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: RETRIES (chaar chhote levels)
     1 Kyun  → samasya pehle: retry storm (yeh file)     2 Kaise → random intezaar (jitter), Retry-After
     3 Code  → asli code + asli library (p-retry)        4 Kab   → kya dobara bhejein, kahan, kitna
   Har number docker-labs/37-retries ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = ex1-jitter, ex2-storm, ex3-layers.
   Source videos (credit): Software Developer Diaries — "Every engineer should know this (retries with jitter)",
   "This is how you protect your backend from a Retry Storm", "Retry Mechanisms and Patterns #Shorts",
   "The Secret Weapon Behind Resilient Distributed Systems".
   ===================================================================== */
(function () {

/* do dabbe: 6 phones → payment-service */
const NODES = [
  { id: 'phones', icon: '📱', label: '6 phones', x: 190, y: 105 },
  { id: 'pay', icon: '💳', label: 'payment-service', x: 640, y: 105 },
];
const EDGES = [{ from: 'phones', to: 'pay' }];
const VIZ = { w: 890, h: 215 };
const EMPTY5 = ['free', 'free', 'free', 'free', 'free'];
const FULL5 = ['busy', 'busy', 'busy', 'busy', 'busy'];
const TRY = [{ from: 'phones', to: 'pay', label: 'retry', tone: 'bad' }];

VISUALS['rt-kyun'] = {
  t: 'payment-service uthte hi chhe phones ki atki hui retries ek saath girti hain',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { phones: { tone: 'busy', badge: 'har 300 ms par dobara' }, pay: { tone: 'bad', badge: 'CRASH #2 · hadd 5' } },
    flows: [{ from: 'phones', to: 'pay', label: '6 retry', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rt-kyun',
  icon: '🌪️',
  group: '🔁 Retries',
  title: 'Retries 1 · Kyun — 1.4 second ki gadbad khatam kyun nahi hui',
  badge: 'Storm Jasoos',
  objectives: [
    'payment-service sirf 1.4 second band thi — phir outage lamba kyun chala?',
    'Har baar zyada rukne (backoff) se calls kam hui. Phir bhi service dobara kyun giri?',
    'Tatkal ticket ki site subah 10 baje baar-baar kyun girti hai?',
    'Retry, backoff, jitter, retry storm: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🏏 Ravivaar raat 8:30, KhanaKart</h3>
     <p>IPL final ka break hai. Sab ek saath khaana order kar rahe hain: har minute <b>300 orders</b>, ek order ausatan <b>₹400</b>.</p>
     <p>8:30 par payment-service ka ek naya version deploy hota hai. Version kharab nikla: payment-service gir jaati hai aur <b>1.4 second</b> mein khud wapas aa jaati hai.</p>
     <p>1.4 second. Itne mein toh kisi ko pata bhi nahi chalna chahiye tha.</p>
     <p>Par payment-service agle kai minute <b>baar-baar girti rahi</b>. Kisi ka paisa nahi kata, kisi ka order nahi laga.</p>
     <pre>300 orders/minute × ₹400 × 4 minute = ₹4,80,000 ke orders gaye</pre>
     <p>payment-service ko baar-baar kisne giraya? Kisi hacker ne nahi. <b>KhanaKart ke apne app ne.</b></p>
     <p class="tip">👉 Agle screen par wahi 1.4 second slow motion mein: 6 phones, ek payment-service. Dekho ki "fail hua? dobara bhejo" kahan le jaata hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: turant retry ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — fail hua? turant dobara',
      goal: 'Har click = ek ghatna. Jo badla, woh peele rang mein chamkega. Dekho ki payment-service uthne ke baad bhi tik kyun nahi paati.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'svc', label: 'payment-service' },
        { id: 'inside', label: 'Service ke andar orders (hadd 5)' },
        { id: 'calls', label: 'Phones ki ab tak calls' },
        { id: 'crashes', label: 'Crash kitni baar' },
        { id: 'orders', label: 'Order lage' },
      ],
      steps: [
        {
          clock: '0.20 s',
          say: 'Aam din. Ek order aata hai. payment-service <b>303 ms</b> mein paisa kaat ke jawab de deti hai.<br><br>payment-service ek saath <b>5 orders</b> sambhal sakti hai. 6va order ek saath aa gaya toh payment-service <b>crash</b> ho jaati hai. (Slow motion ke liye sankhya chhoti rakhi hai. Lab ki asli raftaar mein hadd 40 hai.)',
          flows: [{ from: 'phones', to: 'pay', label: 'order', tone: 'ok' }],
          nodes: { phones: { tone: 'idle', badge: '' }, pay: { tone: 'ok', badge: 'jawab 303 ms mein' } },
          vars: { svc: 'UP — orders le rahi hai', inside: ['busy', 'free', 'free', 'free', 'free'], calls: '0', crashes: '0', orders: '6 mein se 0' },
        },
        {
          clock: '1.00 s',
          say: 'Kharab deploy. payment-service <b>crash</b> ho jaati hai. payment-service 1.4 second band rahegi: <b>2.40 s</b> par wapas aayegi.',
          nodes: { pay: { tone: 'bad', badge: 'CRASH #1 · 2.40 s tak band' } },
          vars: { svc: 'DOWN — 2.40 s par wapas', inside: EMPTY5, crashes: '1 (deploy)' },
        },
        {
          clock: '1.30–1.40 s',
          say: 'Chhe log "Order place" dabate hain: Asha, Bilal, Chitra, Dev, Esha, Farhan. payment-service band hai, isliye chhe ki chhe calls turant <b>fail</b>.<br><br>KhanaKart ke app mein ek seedha niyam likha hai: <b>"call fail hui? 300 ms baad dobara bhejo."</b> Koi limit nahi.',
          flows: [{ from: 'phones', to: 'pay', label: 'order', tone: 'bad' }],
          nodes: { phones: { tone: 'busy', badge: 'fail → 300 ms baad dobara' } },
          vars: { calls: '6' },
        },
        {
          clock: '1.60–2.30 s',
          say: 'Chhe phones har 300 ms par dobara bhejte hain. Teen round aur: <b>18 calls</b>, sab fail. payment-service abhi bhi band hai.',
          flows: TRY,
          vars: { calls: '24' },
          ask: {
            q: 'payment-service 2.40 s par wapas aayegi. Chhe phones abhi bhi har 300 ms par retry kar rahe hain. 2.40 s ke baad kya hoga?',
            choices: [
              'Chhe ki chhe retries lagbhag ek saath pahunchengi. Hadd 5 hai — 6vi par payment-service phir crash',
              'Chhe ke chhe order lag jaayenge — payment-service theek ho chuki hai',
              'Pehla phone andar jaayega, baaki paanch line mein khade rahenge',
              'Phones tab tak retry karna band kar chuke honge',
            ],
            answer: 0,
            hint: 'Kitne phones retry kar rahe hain? payment-service ek saath kitne orders sambhal sakti hai?',
            explain: 'Chhe phones, hadd paanch. payment-service ke liye "uthte hi" ka matlab hai: <b>saari atki hui retries ek saath</b>.',
          },
        },
        {
          clock: '2.50–2.58 s',
          say: 'payment-service 2.40 s par uth gayi. 2.50 se 2.58 s ke beech paanch phones ki retry andar pahunchti hai. payment-service ke andar ab <b>5 orders</b>: hadd par.',
          flows: [{ from: 'phones', to: 'pay', label: 'retry', tone: 'acc' }],
          nodes: { pay: { tone: 'busy', badge: 'andar 5/5 — hadd par' } },
          vars: { svc: 'UP — par hadd par', inside: FULL5, calls: '29' },
        },
        {
          clock: '2.60 s',
          say: 'Chhathe phone (Farhan) ki retry pahunchti hai. 6va order ek saath → payment-service <b>phir crash</b>.<br><br>Andar wale paanch orders bhi gaye. Kisi ka paisa nahi kata. payment-service ab <b>4.00 s</b> tak band.',
          flows: TRY,
          nodes: { pay: { tone: 'bad', badge: 'CRASH #2 · 4.00 s tak band' } },
          vars: { svc: 'DOWN — 4.00 s par wapas', inside: EMPTY5, calls: '30', crashes: '2' },
        },
        {
          clock: '2.90–3.80 s',
          say: 'Chhe phones phir se har 300 ms par retry. Chaar round, <b>24 calls</b>, sab fail. Ab chhe ke chhe phones ek hi taal par hain: sab 2.60 s par ek saath fail hue the.',
          flows: TRY,
          vars: { calls: '54' },
        },
        {
          clock: '4.10 s',
          say: 'payment-service 4.00 s par uthi. 4.10 s par chhe retries <b>ek hi pal</b> mein: 5 andar, 6vi par <b>crash #3</b>. 5.50 s tak band.',
          flows: TRY,
          nodes: { pay: { tone: 'bad', badge: 'CRASH #3 · 5.50 s tak band' } },
          vars: { svc: 'DOWN — 5.50 s par wapas', calls: '60', crashes: '3' },
        },
        {
          clock: '5.60 s aur 7.10 s',
          say: 'Wahi chakkar do baar aur: 5.60 s par <b>crash #4</b>, 7.10 s par <b>crash #5</b>. Har baar payment-service uthi, chhe retries ek saath aayi, payment-service phir giri.',
          flows: TRY,
          nodes: { pay: { tone: 'bad', badge: 'CRASH #5 · 8.50 s tak band' } },
          vars: { svc: 'DOWN — 8.50 s par wapas', calls: '132', crashes: '5' },
        },
        {
          clock: '8 second ka nateeja',
          say: `Slow motion ke 8 second:
            <ul>
              <li>Order lage: <b>6 mein se 0</b></li>
              <li>payment-service crash: <b>5 baar</b> (deploy ne sirf 1 baar giraya tha)</li>
              <li>Phones ki calls: <b>132</b> — chhe orders ke liye</li>
            </ul>
            payment-service ke code mein doosre crash ki koi wajah nahi thi. 1.4 second ki gadbad ko phones ki retries ne zinda rakha.`,
          nodes: { phones: { tone: 'bad', badge: '0 / 6 order' }, pay: { tone: 'bad', badge: '5 crash' } },
          flows: TRY,
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi kahani asli raftaar par: 50 clients, har second ~500 requests, payment-service 40 se zyada ek saath par crash. Deploy-crash t = 2 s par.
            <ul>
              <li>Akela deploy-crash hota toh payment-service <b>7.0 s</b> par theek ho jaati.</li>
              <li>"Turant retry, koi limit nahi" ke saath: <b>5 crash</b>, aur 12 second ke run mein payment-service theek hui hi nahi.</li>
              <li>Har user action par payment-service ko <b>~19 calls</b> gayi (kul 20,213).</li>
            </ul>`,
          nodes: { phones: { tone: 'bad', badge: 'har action par ~19 calls' }, pay: { tone: 'bad', badge: '5 crash · 12 s mein theek nahi' } },
          flows: TRY,
          vars: { svc: 'lab: 12 s ke run mein theek nahi hui', inside: 'lab mein hadd 40', calls: 'lab: 20,213', crashes: 'lab: 5', orders: 'lab: 1,038 actions mein se 988 — der se' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> retry akeli call ke liye madad hai. Par jab service gir ke uthti hai, tab <b>saari atki hui retries ek saath</b> girti hain — aur service ko dobara gira deti hain.<br>Is chakkar ka naam: <b>retry storm</b>.',
    },

    /* ---------------- 2. pehla ilaaj: backoff ---------------- */
    {
      type: 'dryrun',
      title: '⏳ Pehla ilaaj: har baar dugna ruko — aadha kaam',
      goal: 'Wahi 6 phones, wahi crash. App ka niyam badal gaya hai. Dekho kya sudhra — aur kya nahi.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'svc', label: 'payment-service' },
        { id: 'wait', label: 'Har phone ka agla intezaar' },
        { id: 'calls', label: 'Phones ki ab tak calls' },
        { id: 'crashes', label: 'Crash kitni baar' },
        { id: 'orders', label: 'Order lage' },
      ],
      steps: [
        {
          clock: '1.00 s',
          say: 'Wahi kahani dobara: 1.00 s par deploy se crash, payment-service 2.40 s tak band. Pichhli baar phones ne har 300 ms par retry kiya aur payment-service 5 baar giri. Tum is team mein ho.',
          nodes: { phones: { tone: 'idle', badge: '' }, pay: { tone: 'bad', badge: 'CRASH #1 · 2.40 s tak band' } },
          vars: { svc: 'DOWN — 2.40 s par wapas', wait: 'abhi tay nahi', calls: '0', crashes: '1 (deploy)', orders: '6 mein se 0' },
          ask: {
            q: 'App ke retry niyam mein sabse seedha pehla sudhaar kya hoga?',
            choices: [
              'Har fail ke baad pichhli baar se dugna ruko (300, 600, 1200 … ms), aur 5 koshish ke baad ruk jao',
              'Retry poori tarah hata do',
              'payment-service ko bada server de do',
              'Jo phone 3 baar fail ho, use block kar do',
            ],
            answer: 0,
            hint: 'Dikkat yeh thi ki phones bahut jaldi-jaldi aur bina ruke bhejte rahe.',
            explain: 'Har baar zyada rukne ka naam <b>backoff</b> hai; har baar dugna = <b>exponential backoff</b>. (Retry hata dena bhi theek nahi: ek chhoti si blip par bhi user ko error milega.)',
          },
        },
        {
          clock: '1.30–1.40 s',
          say: 'Chhe phones "Order place" dabate hain → sab fail. Naya niyam: pehli baar <b>300 ms</b> ruko.',
          flows: [{ from: 'phones', to: 'pay', label: 'order', tone: 'bad' }],
          nodes: { phones: { tone: 'busy', badge: '300 ms ruk rahe hain' } },
          vars: { wait: '300 ms', calls: '6' },
        },
        {
          clock: '1.60–1.70 s',
          say: 'Doosri koshish → fail. Ab dugna: <b>600 ms</b>.',
          flows: TRY,
          nodes: { phones: { tone: 'busy', badge: '600 ms ruk rahe hain' } },
          vars: { wait: '600 ms', calls: '12' },
        },
        {
          clock: '2.20–2.30 s',
          say: 'Teesri koshish → fail. Ab <b>1200 ms</b>.<br><br>payment-service 0.1 second baad (2.40 s par) uth jaayegi. Chhe phones tab tak so rahe honge: sab 3.40–3.50 s par lautenge.',
          flows: TRY,
          nodes: { phones: { tone: 'busy', badge: '1200 ms ruk rahe hain' } },
          vars: { wait: '1200 ms', calls: '18' },
        },
        {
          clock: '2.40 s',
          say: 'payment-service wapas aa gayi. Koi phone nahi aaya — payment-service khaali baithi hai.',
          nodes: { pay: { tone: 'ok', badge: 'UP · andar 0/5' } },
          vars: { svc: 'UP — khaali' },
          ask: {
            q: 'Chhe phones 1200 ms ruk ke 3.40–3.50 s par lautenge. Chhe ke chhe ek hi pal fail hue the aur ek hi formula se ruke. Kya hoga?',
            choices: [
              'Chhe phir se lagbhag ek saath pahunchenge → 6vi par payment-service crash',
              'Itna rukne ke baad chhe ke chhe order lag jaayenge',
              'Sirf Asha ka order lagega',
              'Phones 1200 ms mein bhool jaayenge ki order bhejna tha',
            ],
            answer: 0,
            hint: 'Sab ek saath fail hue. Sab ne ek hi sankhya (1200 ms) gini. Toh sab kab lautenge?',
            explain: 'Ek hi pal + ek hi formula = <b>ek hi pal par wapsi</b>. Zyada rukne se bheed chhoti nahi hoti — bas der se aati hai.',
          },
        },
        {
          clock: '3.40–3.50 s',
          say: 'Chauthi koshish. Chhe phones 100 ms ke andar: 5 andar, 6vi par <b>crash #2</b>. payment-service 4.90 s tak band. Agla intezaar: <b>2400 ms</b>.',
          flows: TRY,
          nodes: { phones: { tone: 'busy', badge: '2400 ms ruk rahe hain' }, pay: { tone: 'bad', badge: 'CRASH #2 · 4.90 s tak band' } },
          vars: { svc: 'DOWN — 4.90 s par wapas', wait: '2400 ms', calls: '24', crashes: '2' },
        },
        {
          clock: '5.90 s',
          say: 'Paanchvi koshish. Ab chhe ke chhe phones <b>ek hi pal</b> par: <b>crash #3</b>.<br><br>5 koshish poori. Chhe phones haar maan lete hain. Chhe users ko error: "Payment nahi ho paya."',
          flows: TRY,
          nodes: { phones: { tone: 'bad', badge: 'haar maan li · 6 error' }, pay: { tone: 'bad', badge: 'CRASH #3 · 7.30 s tak band' } },
          vars: { svc: 'DOWN — 7.30 s par wapas', wait: 'haar maan li', calls: '30', crashes: '3', orders: '6 mein se 0 — 6 users ko error' },
        },
        {
          clock: 'tulna',
          say: `<div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Phones ki calls</th><th>Crash</th><th>Order lage</th></tr>
              <tr><td>Turant retry, koi limit nahi</td><td>132</td><td>5</td><td>6 mein se 0</td></tr>
              <tr><td>Har baar dugna ruko, 5 koshish</td><td><b>30</b></td><td><b>3</b></td><td>6 mein se 0</td></tr>
            </table></div>
            Calls 132 se 30 ho gayi. Yeh sudhaar hai. Par payment-service phir bhi do baar aur giri, aur ek bhi order nahi laga.`,
          nodes: { phones: { tone: 'bad', badge: '30 calls · 0 order' }, pay: { tone: 'bad', badge: '3 crash' } },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein 200 clients ek hi pal mein ek payment gateway ko call karte hain. Gateway ek waqt mein sirf 10 le sakta hai. Har client 8 koshish karta hai, har baar dugna ruk ke — bina kisi random ke:
            <ul>
              <li>200 mein se sirf <b>80</b> ka kaam hua. <b>120 clients ne haar maan li.</b></li>
              <li>Aakhri safal call <b>5.3 second</b> par.</li>
            </ul>
            Har "lehar" mein wahi 200 ek saath aaye, 10 jeete, baaki phir ek saath ruke.`,
          nodes: { phones: { tone: 'bad', badge: 'lab: 120 / 200 ne haar maani' }, pay: { tone: 'slow', badge: 'har lehar mein sirf 10' } },
          vars: { svc: 'lab: gateway, ek waqt mein 10', wait: '50, 100, 200 … 2000 ms', calls: 'lab: 1,320', crashes: 'lab: gateway crash nahi hota, 503 deta hai', orders: 'lab: 200 mein se 80' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> backoff ne calls kam ki, par <b>bheed nahi todi</b>. Chhe phones ek hi pal fail hue, ek hi formula se ruke, isliye ek hi pal par laute.<br>Agla sawaal apne aap banta hai: sab phones ko <b>alag-alag pal</b> par kaise lautaya jaaye?',
    },

    /* ---------------- 3. idea: tatkal ticket ---------------- */
    {
      type: 'cards',
      title: '🚉 Yeh tum dekh chuke ho — tatkal ticket, subah 10 baje',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Tatkal ki site subah 10 baje kyun girti hai?',
          say: 'Theek 10:00:00 par lakhon log ek saath "Book" dabate hain. Site gir jaati hai.<br><br>Ab sab kya karte hain? <b>Refresh. Refresh. Refresh.</b> Site jaise hi uthti hai, saare refresh ek saath pahunchte hain. Site phir gir jaati hai.<br><br><b>KhanaKart mein:</b> refresh dabane wale log = chhe phones · site = payment-service.',
        },
        {
          title: '2. "Thodi der baad aana" kaafi kyun nahi?',
          say: 'Bank ke counter par board laga hai: <b>"Server down. 15 minute baad aaiye."</b><br><br>Sab log bahar chai peete hain. Theek 15 minute baad sab <b>ek saath</b> laut aate hain. Counter par phir wahi bheed.<br><br><b>KhanaKart mein:</b> yahi "har baar dugna ruko" tha. Sab ne ek hi sankhya gini.',
        },
        {
          title: '3. Bheed kaise tootti hai?',
          say: 'Doctor ke clinic par receptionist bolti hai: <b>"15 se 30 minute ke beech kabhi bhi aa jaana."</b><br><br>Koi 16 minute mein aata hai, koi 22 mein, koi 29 mein. Log wahi hain, doctor wahi hai — par sab ek saath nahi aate.',
          ask: {
            q: 'payment-service 2.40 s par uthegi. Chhe phones ko kaise lautana chahiye?',
            choices: [
              'Har phone apna alag random waqt chune — koi 2.5 s par, koi 2.8 s par, koi 3.4 s par',
              'Chhe ke chhe theek 2.40 s par',
              'Chhe ke chhe theek 5.00 s par, taaki payment-service ko aaraam mile',
              'Koi kabhi na laute',
            ],
            answer: 0,
            hint: 'Dikkat rukne ki lambai mein nahi thi. Dikkat yeh thi ki sab ek hi pal par laute.',
            explain: 'Der se lautna kaafi nahi; <b>alag-alag</b> lautna zaroori hai. Random hi woh cheez hai jo chhe phones ko ek doosre se alag karti hai.',
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Fail hui call ko dobara bhejna</td><td><b>Retry</b></td></tr>
              <tr><td>Har fail ke baad pehle se zyada rukna</td><td><b>Backoff</b> (har baar dugna = exponential backoff)</td></tr>
              <tr><td>Rukne ke waqt mein random milana</td><td><b>Jitter</b></td></tr>
              <tr><td>Atki hui retries ka ek saath girna, service ka baar-baar girna</td><td><b>Retry storm</b> (isi bheed ko "thundering herd" bhi kehte hain)</td></tr>
            </table></div>
            ⚠️ <b>Ek aam galatfehmi:</b> "1 second, 2 second, 3 second ruko" exponential backoff <b>nahi</b> hai — yeh seedhi line hai (linear). Exponential ka matlab har baar <b>dugna</b>: 1, 2, 4, 8 second.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> retry ki teen galtiyan hoti hain: bahut jaldi, bina ruke, aur <b>sab ek saath</b>. Backoff pehli do theek karta hai. Teesri ko sirf random (jitter) theek karta hai.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Order ki call fail hui, phone ne wahi call dobara bhej di', right: 'Retry', explain: 'Retry = fail hui call ko dobara bhejna. Ek akeli blip ke liye sahi ilaaj.' },
        { left: 'Phone pehle 300 ms ruka, phir 600, phir 1200', right: 'Exponential backoff', explain: 'Har baar dugna rukna. Calls kam hoti hain (slow motion: 132 → 30), par sab phones phir bhi ek saath lautte hain.' },
        { left: 'Phone 0 se 600 ms ke beech koi bhi waqt chunta hai', right: 'Jitter', explain: 'Rukne mein random. Isi se chhe phones alag-alag pal par lautte hain.' },
        { left: 'payment-service uthi, chhe retries ek saath aayi, payment-service phir giri — baar-baar', right: 'Retry storm', explain: 'Slow motion: 1 deploy-crash 5 crash ban gaya. Lab: har user action par ~19 calls.' },
        { left: 'Phone 1 s, 2 s, 3 s rukta hai', right: 'Linear backoff (exponential nahi)', explain: 'Har baar utna hi badhna = linear. Exponential = har baar dugna: 1, 2, 4, 8.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Hamari service sirf 2 second ke liye giri thi, par outage kai minute chala. Aisa kaise ho sakta hai?"',
        choices: [
          'Clients ki atki hui retries service ke uthte hi ek saath pahunchi aur service ko dobara gira diya — baar-baar. Retry storm. Ilaaj: backoff + jitter + koshish ki hadd, aur server bhara ho toh crash ke bajaye 503 + Retry-After',
          'Service ka restart hi kai minute leta hoga',
          'Database corrupt ho gaya hoga',
          'Load balancer ne traffic rok diya hoga',
        ],
        answer: 0,
        explain: 'Lab: akela crash hota toh service 7.0 s par theek. Turant retries ke saath 5 crash, aur 12 s ke run mein theek hui hi nahi; har user action par ~19 calls.',
      },
      {
        q: '"Humne exponential backoff laga diya hai. Phir bhi restart ke baad traffic ki ek deewar aati hai. Kyun?"',
        choices: [
          'Saare clients ek hi pal fail hue aur ek hi formula se ruke, isliye ek hi pal par laute. Backoff rukna badhata hai, bheed nahi todta. Rukne mein random (jitter) chahiye',
          'Backoff ka base bahut chhota hai, use badha do',
          'Clients ki ghadiyan galat hain',
          'Backoff sirf GET requests par kaam karta hai',
        ],
        answer: 0,
        explain: 'Lab: 200 clients, backoff bina random → 120 ne haar maani, aakhri safal call 5.3 s par. Slow motion: calls 132 → 30, par crash phir bhi 3.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki retries ek chhoti gadbad ko lamba outage kaise bana deti hain',
    'Backoff kya sudharta hai (calls) aur kya nahi (ek saath wapsi) — number ke saath',
    'Retry, backoff, jitter aur retry storm ko pehchaan sakte ho; "1, 2, 3 second" ko exponential nahi kehte',
  ],
  cards: [
    { front: 'Retry storm kya hai?', back: 'Service gir ke uthi → saari atki hui retries <b>ek saath</b> pahunchi → service phir giri → baar-baar. Slow motion: 1 crash → 5 crash, 132 calls, 0 order. Lab: har user action par ~19 calls.' },
    { front: 'Backoff akela kaafi kyun nahi?', back: 'Sab ek hi pal fail hue, ek hi formula se ruke → ek hi pal par laute. Calls kam hui (132 → 30), par crash phir bhi 3. Lab: 200 mein se 120 clients ne haar maani.' },
    { front: '"1 s, 2 s, 3 s" kaunsa backoff hai?', back: 'Linear. Exponential = har baar <b>dugna</b>: 1, 2, 4, 8 s.' },
    { front: 'Retry ki teen galtiyan?', back: 'Bahut jaldi · bina ruke · sab ek saath. Backoff + koshish ki hadd pehli do theek karte hain. Teesri sirf jitter (random) theek karta hai.' },
  ],
},
]);

})();
