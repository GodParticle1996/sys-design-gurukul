/* =====================================================================
   🛡️ Playlist · 1 Resilience — Noisy Neighbour · level 5: KAB
   Hadd, baari, alag khidki — ya badi machine? Autoscale ki der, "koi shor nahi par jod zyada", aur apna hi raat ka job.
   Har number docker-labs/39-noisy-neighbor ke asli run se hai: tools/tenants.js (ex1, --scenario average),
   tools/autoscale.js (ex2), tools/batch.js (ex3).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'who', icon: '❓', label: 'kaun, kitna?', x: 140, y: 105 },
  { id: 'svc', icon: '🚪', label: 'saajhi service', x: 455, y: 105 },
  { id: 'what', icon: '⚖️', label: 'faisla', x: 760, y: 105 },
];

VISUALS['nn-kab'] = {
  t: 'Pehle poochho: koi ek shor kar raha hai, ya sabka jod hi zyada hai? Phir: khaali jagah ka kya ho?',
  html: SD.viz.svg(NODES, [{ from: 'who', to: 'svc' }, { from: 'svc', to: 'what' }], {
    nodes: { who: { tone: 'acc', badge: 'ek ka shor? ya sabka jod?' }, svc: { tone: 'slow', badge: 'chhat par' }, what: { tone: 'ok', badge: 'hadd · baari · alag · jagah' } },
    flows: [{ from: 'who', to: 'svc', label: 'bojh', tone: 'acc' }, { from: 'svc', to: 'what', label: '?', tone: 'slow' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'nn-kab',
  icon: '⚖️',
  group: '🔊 Noisy Neighbour',
  title: 'Noisy Neighbour 5 · Kab — hadd, baari, alag khidki, ya badi machine?',
  badge: 'Padosi Panch',
  objectives: [
    'Kis situation mein hadd, kis mein baari, kis mein alag khidki — aur kab sirf jagah badhani padti hai?',
    'Autoscaling akela noisy neighbour ka ilaaj kyun nahi hai?',
    'Jab koi shor nahi kar raha par sabka jod chhat se upar hai, tab isolation kya kar sakti hai aur kya nahi?',
    'Apna hi raat ka job din mein chal jaaye toh users ko kaise bachayein?',
  ],
  lesson: [
    `<h3>⚖️ "Autoscaling laga do, khatam"</h3>
     <p>partner-api ki meeting. Kisi ne kaha: <b>"Isolation-visolation chhodo. Autoscaling laga do: bheed aaye toh machines badh jaayein. Samasya khatam."</b></p>
     <p>Lab mein yahi kiya gaya. Ek tenant ne achanak bheed bhej di. Autoscaler ne bheed pehchaani, nayi machines uthayi:</p>
     <pre>bheed aayi:            2 s par
nayi machines chalu:   10.1 s par
us beech shaant tenants ki 472 mein se 354 requests fail  (75%)</pre>
     <p>Autoscaling ne apna kaam kiya. Bas <b>8 second der se</b>.</p>
     <p class="tip">👉 Is level mein pehle tum faisla karoge. Phir number dekhenge: badi machine kab kaafi hai, kab nahi — aur ek aisi situation jahan koi padosi shor kar hi nahi raha.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Hadd, baari, alag khidki — ya jagah badhao?',
      instructions: 'Nau situations. Har ek ke liye sabse theek pehla ilaaj chuno. Pehle apna jawab socho, phir daalo.',
      bins: [
        { id: 'quota', label: '✋ Har tenant ki hadd' },
        { id: 'fair', label: '🔁 Baari-baari' },
        { id: 'pool', label: '🚪 Alag khidki' },
        { id: 'cap', label: '🏗️ Jagah badhao' },
      ],
      items: [
        { text: 'Public API: koi bhi anjaan client ek second mein hazaaron requests bhej sakta hai', bin: 'quota', explain: 'Anjaan bhejne walon ke saamne pehli deewar hadd hai: har client ki ginti, paar ho toh 429 aur "kab aana hai".' },
        { text: 'Paid tenants ka saajha API: ek tenant ka bulk kaam doosron ko dheema na kare — par raat ko khaali jagah usi ke kaam aaye', bin: 'fair', explain: 'Shaant tenant bache <b>aur</b> khaali jagah bekaar na jaaye: yeh baari-baari hi karti hai. Lab: A ki 1,046 hui (hadd mein 721).' },
        { text: 'Payment ka kaam aur report banane ka kaam ek hi workers baant-te hain; report ke lambe kaam payment ko rok dete hain', bin: 'pool', explain: 'Payment ko apni khidkiyan do. Report kitni bhi lambi ho, payment ki khidki tak pahunch hi nahi sakti.' },
        { text: 'Teen tenants, teeno ausat. Kisi ka burst nahi — par teeno ka jod service ki chhat se upar hai', bin: 'cap', explain: 'Koi shor nahi kar raha. Isolation takleef ko barabar baant sakti hai, par jagah nahi bana sakti. Lab: har niyam mein sab dheeme (~796 ms).' },
        { text: 'Free plan ka vaada: ek minute mein 60 requests. Paid plan: 6,000', bin: 'quota', explain: 'Yahan hadd bachav nahi, <b>plan ka niyam</b> hai. Free tenant ko khaali jagah mile, yeh maqsad hi nahi.' },
        { text: 'Saajha build server: ek team ne 200 builds daal diye; baaki teams ke do-do builds un 200 ke peeche khade hain', bin: 'fair', explain: 'Har team ki apni line, baari-baari. Jab koi aur nahi hoga, badi team ke builds lagataar chalenge.' },
        { text: 'Ek bahut bada grahak, jisne likh ke maanga hai ki doosron ka bojh is grahak ke kaam ko kabhi na chhue', bin: 'pool', explain: 'Pakka vaada = alag jagah. Keemat: woh jagah khaali bhi baithegi — aur grahak usi ka paisa deta hai.' },
        { text: 'Har shaam 8 se 10 baje saare tenants ka traffic ek saath badhta hai', bin: 'cap', explain: 'Yeh kisi ek ka shor nahi, sabki roz ki bheed hai. Samay pata hai, toh machines pehle se badha do.' },
        { text: 'Raat ka cleanup job din mein chal gaya aur users ke saath wahi workers baant raha hai', bin: 'pool', explain: 'Job ko chhoti alag khidki do: "zyada se zyada 1 worker". Lab: users ka jawab 141 ms se 22 ms.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Paanch chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain.',
      steps: [
        {
          title: '1. Teen sawaal, teen tareeke',
          say: `<div class="dr-scroll"><table>
              <tr><th>Pehle yeh poochho</th><th>Haan ho toh</th><th>Lab</th></tr>
              <tr><td>Bhejne wala anjaan hai, ya hadd plan ka vaada hai?</td><td><b>Har tenant ki hadd</b> (429 + kab aana hai)</td><td>shaant tenants ke 0 fail · A ki 1,453 ko 429</td></tr>
              <tr><td>Khaali jagah kisi ke kaam aani chahiye?</td><td><b>Baari-baari</b></td><td>shaant tenants ke 0 fail · A ki 1,046 hui (hadd mein 721)</td></tr>
              <tr><td>Ek kaam ka doosre par zara bhi asar nahi chalega?</td><td><b>Alag khidki</b></td><td>slow motion: Bholu Dhaba 0.50 s; Annapurna 7.00 s tak</td></tr>
            </table></div>
            Yeh teeno ek doosre ke badle nahi hain. Aksar saath lagte hain: bahar ke darwaze par dheeli hadd, andar baari-baari, aur paise wale kaam ki alag khidki.`,
        },
        {
          title: '2. Badi machine (autoscaling) akeli kaafi kyun nahi?',
          say: `Autoscaler ke do kaam hain, aur dono mein waqt lagta hai: bheed ko <b>pehchaanna</b>, aur nayi machine ko <b>uthana</b>.<br><br>
            Lab: tenant A 2 s par bheed bhejta hai. Autoscaler 3 second tak dekhta hai ki bojh sach mein zyada hai, phir nayi machine uthne mein 5 second.
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Nayi machines kab</th><th>Us se pehle shaant tenants ke fail</th><th>Uske baad</th></tr>
              <tr><td>Ek line + autoscaling</td><td>10.1 s</td><td><b>472 mein se 354</b></td><td>342 mein se 0</td></tr>
              <tr><td>Baari-baari, autoscaling nahi</td><td>kabhi nahi</td><td>814 mein se 0</td><td>—</td></tr>
              <tr><td>Baari-baari + autoscaling</td><td>10.1 s</td><td>470 mein se 0</td><td>346 mein se 0</td></tr>
            </table></div>
            (Teen run mein pehli line ke fail: 354–377 (472 mein se).) Baari-baari ke saath autoscaling ka kaam sirf yeh reh gaya ki A ko zyada mile: A ki 2,162 ki jagah 3,058 requests hui.`,
          ask: {
            q: 'Bheed 2 s par aayi. Autoscaler 3 second dekhta hai, phir machine 5 second mein uthti hai. Us 8 second mein shaant tenants ko kaun bachayega?',
            choices: [
              'Isolation — hadd, baari ya alag khidki. Yeh usi pal kaam karti hai jab bheed aati hai. Autoscaling uske baad jagah badhata hai',
              'Koi nahi — 8 second sehna hi padega',
              'Autoscaler ko 0 second par set kar do',
              'Shaant tenants ko retry karne ko bol do',
            ],
            answer: 0,
            hint: 'Table ki doosri line dekho: wahan autoscaling thi hi nahi. Shaant tenants ke kitne fail hue?',
            explain: 'Isolation <b>abhi</b> bachati hai; autoscaling <b>thodi der baad</b> jagah banata hai. Pehle isolation, uske upar autoscaling — uske badle nahi.',
          },
        },
        {
          title: '3. Jab koi shor nahi kar raha',
          say: `Ek alag situation. Teen tenants, teeno <b>ausat</b>: har ek 80 requests/second. Service ki chhat 200. Koi burst nahi — bas jod 240 hai.
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>A ke fail</th><th>B ke fail</th><th>C ke fail</th><th>Aadhi requests kitne mein</th></tr>
              <tr><td>Sab ek line mein</td><td>0%</td><td>3%</td><td>15%</td><td>796 ms</td></tr>
              <tr><td>Har tenant 80 / second</td><td>0%</td><td>5%</td><td>14%</td><td>817 ms</td></tr>
              <tr><td>Baari-baari</td><td>2%</td><td>2%</td><td>2%</td><td>846 ms</td></tr>
            </table></div>
            Teeno niyamon mein <b>sab dheeme</b> hain (aam din: ~20 ms).<ul>
              <li>Hadd ne kuch nahi kiya: koi tenant apni hadd (80) ke upar gaya hi nahi. Teeno hadd ka jod (240) chhat (200) se upar tha.</li>
              <li>Ek line mein takleef kisi ek par zyada padi. Kis par — yeh sanyog hai. (Lab har baar A, phir B, phir C bhejta hai, isliye bhari line par C sabse zyada gira.)</li>
              <li>Baari-baari ne takleef barabar baant di.</li>
            </ul>
            Isolation takleef ko <b>baant</b> sakti hai. Jagah <b>bana</b> nahi sakti. Yahan ilaaj capacity hai.`,
        },
        {
          title: '4. Apna hi kaam padosi ban jaaye',
          say: `Padosi hamesha koi grahak nahi hota. Lab: KhanaKart ka apna cleanup job (300 tukde, har tukda 100 ms ka database kaam) raat ki jagah <b>din mein</b> chal gaya. Users 110 requests/second bhej rahe hain.
            <div class="dr-scroll"><table>
              <tr><th>Job kaise chala</th><th>Users ko jawab (aadhi requests)</th><th>Job, 10 second mein</th></tr>
              <tr><td>Users ki hi line mein</td><td>141 ms</td><td>300 mein se 189</td></tr>
              <tr><td>Kam zaroori: tabhi, jab users ki line khaali ho</td><td>42 ms</td><td>300 mein se 184</td></tr>
              <tr><td>Kam zaroori + zyada se zyada 1 worker</td><td><b>22 ms</b></td><td>300 mein se 100</td></tr>
              <tr><td>Raat ko (users 20 / second)</td><td>73 ms</td><td>poora, 8.4 s mein</td></tr>
            </table></div>
            <ul>
              <li>"Kam zaroori" akela kaafi nahi: 42 ms, 22 nahi. Jo tukda worker par chadh chuka, us tukde ko beech mein roka nahi ja sakta — user ko us tukde ke 100 ms khatam hone tak rukna padta hai.</li>
              <li>Job ko 1 worker tak rokne par users ko pata bhi nahi chala. Keemat: job aadhi raftaar par.</li>
              <li>Raat ko chalane se <b>kam log</b> prabhavit hue (164 requests), par jo us waqt aaye unhe 73 ms lage. "Raat" ka matlab "kisi par asar nahi" nahi hai.</li>
            </ul>`,
        },
        {
          title: '5. Har setting: bahut kam, bahut zyada',
          say: `<div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Bahut kam</th><th>Bahut zyada</th></tr>
              <tr><td>Har tenant ki hadd</td><td>Paise dene wale tenant ko 429, jabki jagah khaali hai (lab: 200 mein se 140 khaali, A phir bhi ruka)</td><td>Bachav khatam: sab hadd ka jod chhat se upar ho toh hadd kabhi lagti hi nahi (lab: 3 × 80 = 240, chhat 200)</td></tr>
              <tr><td>Ek tenant ki line ki lambai</td><td>Chhota sa burst bhi "na" ban jaata hai</td><td>Us tenant ki apni requests bahut der line mein rehti hain</td></tr>
              <tr><td>Job ke workers</td><td>Job kabhi khatam nahi hota</td><td>Users dheeme (lab: 141 ms)</td></tr>
            </table></div>
            <b>Kal subah:</b> apni har saajhi cheez ki list banao — API, database, queue, build server. Har ek ke aage likho: <b>ginti kiski hoti hai</b>, <b>ek grahak zyada se zyada kitna le sakta hai</b>, aur <b>khaali jagah ka kya hota hai</b>. Jahan pehla khaana khaali hai, wahan aaj bhi sab ek hi line mein hain.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> pehle poochho: <b>koi ek shor kar raha hai, ya sabka jod hi zyada hai?</b> Ek ka shor → isolation (hadd, baari, alag khidki). Sabka jod → jagah badhao. Autoscaling jagah badhata hai, par der se; us der mein isolation hi bachati hai.',
    },

    /* ---------------- 3. naapi hui galti: sirf autoscaling ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — autoscaling ki der',
      project: '39-noisy-neighbor',
      exercise: 'ex2-autoscale',
      goal: 'Tenant A 2 s par 300 requests/second bhejna shuru karta hai (chhat 200). Autoscaler 3 s tak 80% bojh dekhe, toh 5 s mein naye 4 workers uthata hai. Dekho us beech shaant tenants B aur C ka kya hota hai — teen setup mein.',
      why: '<code>services/shared.js</code> = saajhi service (4 workers × 20 ms = 200 requests/second) jisme autoscaler bhi hai. <code>tools/autoscale.js</code> teeno setup ek ke baad ek chalata hai (har ek 16 s). Number har run mein thode alag aayenge; tarteeb wahi rahegi.',
      steps: [
        { text: 'Service chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/39-noisy-neighbor && npm start ex2-autoscale', expect: 'ex2-autoscale\n[shared] :5181 · 4 workers × 20 ms' },
        { text: 'Doosre terminal mein: teeno setup (~50 s). "B+C error (scale se pehle / baad)" wala khaana dekho.', cmd: 'node tools/autoscale.js', expect: "A: 50 req/s, t=2s se 300 req/s · B, C: 30 req/s · 16 s · chhat 200 req/s → autoscale ke baad 400\n\nsetup                          naye workers kab   B+C error (scale se pehle / baad)   B+C p99 (pehle / baad)   A safal / bheje\nek line + autoscale               t=10.1s           354/472  /    0/342                1032 ms / 513 ms         3500 / 4171\nfair queuing, autoscale nahi   kabhi nahi             0/814  /    -                  41 ms / -         2162 / 4168\nfair queuing + autoscale          t=10.1s             0/470  /    0/346                  39 ms / 32 ms         3058 / 4183" },
      ],
      observe: {
        q: 'Pehli line mein autoscaling thi, aur scale ke baad B aur C ka ek bhi error nahi aaya. Phir scale se pehle 472 mein se 354 kyun fail hue?',
        choices: [
          'Bheed 2 s par aayi aur naye workers 10.1 s par. Us beech sab ek hi line mein the, aur line A ki bheed se bhari thi',
          'Autoscaler kharab tha',
          'B aur C ne apni hadd tod di',
          'Naye workers purane workers se dheeme the',
        ],
        answer: 0,
        explain: 'Autoscaling hamesha thodi der se aata hai. Doosri line dekho: baari-baari ke saath, bina kisi nayi machine ke, B aur C ka ek bhi error nahi.',
      },
      lesson: 'Autoscaling jagah ka ilaaj hai, padosi ka nahi. Pehle tenants ko alag karo; phir autoscaling ko jagah badhane do.',
    },

    /* ---------------- 4. naapi hui galti: raat ka job din mein ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — raat ka job din mein chal gaya',
      project: '39-noisy-neighbor',
      exercise: 'ex3-batch',
      goal: 'Cleanup job: 300 tukde, har tukda 100 ms. Users 110 requests/second (chhat 200). Job 2 s par shuru hota hai. Chaar tareeke: users ki line mein · kam zaroori · kam zaroori + 1 worker · raat ko.',
      why: '<code>tools/batch.js</code> chaaron tareeke ek ke baad ek chalata hai (har ek 12 s). "Kam zaroori" ka matlab: job ka tukda tabhi uthta hai jab users ki line khaali ho.',
      steps: [
        { text: 'Service chalao (agar pichhle lab se chal rahi hai toh rehne do).', cmd: 'cd docker-labs/39-noisy-neighbor && npm start ex3-batch', expect: 'ex3-batch\n[shared] :5181 · 4 workers × 20 ms' },
        { text: 'Doosre terminal mein: chaaron tareeke (~50 s). "users p50" wala khaana dekho.', cmd: 'node tools/batch.js', expect: "Service 200 req/s · cleanup: 300 chunks × 100 ms, t=2s se · 12 s\n\njob kab / kaise                          users p50 (job ke dauraan)   users p99   users error   job khatam hone mein\npeak par, users ki line mein                 141 ms                 166 ms        0/1070    10 s mein 189/300\npeak par, low priority                        42 ms                 100 ms        0/1073    10 s mein 184/300\npeak par, low priority + max 1 worker         22 ms                  24 ms        0/1068    10 s mein 100/300\noff-peak par (users 20 req/s)                 73 ms                 119 ms        0/164     8.4 s" },
      ],
      observe: {
        q: '"Kam zaroori" karne par users ka jawab 141 ms se 42 ms ho gaya — par 22 ms nahi. Baaki farak kahan se aa raha hai?',
        choices: [
          'Job ka jo tukda worker par chadh chuka hai, us tukde ko beech mein roka nahi ja sakta. User ko us tukde ke 100 ms khatam hone tak rukna padta hai. 1 worker ki hadd se baaki 3 workers hamesha users ke liye khaali rehte hain',
          '"Kam zaroori" wali setting kaam hi nahi karti',
          'Users zyada requests bhejne lage',
          'Database dheema ho gaya',
        ],
        answer: 0,
        explain: '"Pehle kaun" (priority) sirf yeh tay karta hai ki agla kaam kaunsa uthega. Chalte kaam ko priority nahi rokti. Isliye lambe kaam ko "kam zaroori" ke saath <b>workers ki hadd</b> bhi chahiye.',
      },
      lesson: 'Background job ke liye do cheezein saath: kam zaroori, aur workers ki hadd. Raat ko chalana madad karta hai — par "raat" bhi kisi ka din hota hai.',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Noisy neighbour ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Autoscaling laga do, noisy neighbour khatam."', bin: 'myth', explain: 'Nayi machines der se aati hain. Lab: bheed 2 s par, naye workers 10.1 s par; us beech shaant tenants ki 472 mein se 354 fail.' },
        { text: '"Beech mein ek queue laga do, load barabar ho jaayega."', bin: 'myth', explain: 'Ek saajhi line bheed ko sokhti hai, baant-ti nahi. Slow motion: ek line thi, aur Bholu Dhaba ke 7 mein se 3 fail hue.' },
        { text: '"Rate limit lagane mein koi nuksaan nahi."', bin: 'myth', explain: 'Hadd khaali jagah nahi dekhti. Lab: A ki 1,453 requests ko 429, jabki 200 mein se 140 khaali tha.' },
        { text: '"Rate limit IP par laga do, sab theek."', bin: 'myth', explain: 'Ek IP ke peeche bahut log ho sakte hain (office, load balancer). Lab ki asli library: A ki 12 requests ke baad B ki doosri request ko 429.' },
        { text: '"Kubernetes ki QoS class noisy neighbour ko rokti hai."', bin: 'myth', explain: 'QoS class sirf yeh tay karti hai ki tangi mein pehle kaun nikala jaaye. Hadd CPU limit se aati hai, baari ka wazan CPU request se. (Kubernetes documentation.)' },
        { text: '"Job raat ko chala do toh kisi par asar nahi."', bin: 'myth', explain: 'Kam log prabhavit hote hain, "koi nahi" nahi. Lab: raat mein aayi 164 requests ko 73 ms lage (din mein bina job ke ~20 ms).' },
        { text: 'Isolation takleef baant sakti hai, jagah nahi bana sakti.', bin: 'true', explain: 'Lab: teen ausat tenants, jod chhat se upar → har niyam mein sab dheeme. Baari-baari ne fail barabar kar diye (2% har ek), ghataye nahi.' },
        { text: '"Kam zaroori" (low priority) chalte hue kaam ko nahi rok sakta.', bin: 'true', explain: 'Lab: sirf "kam zaroori" → users 42 ms. Saath mein 1 worker ki hadd → 22 ms.' },
        { text: 'Shor ki keemat shor karne wale ko deni chahiye.', bin: 'true', explain: 'Baari-baari yahi karti hai. Slow motion: Annapurna ka kaam 1 second der se; Bholu Dhaba par koi asar nahi. Lab: A ki 1,121 requests ko "na" — A ki apni line bharne se.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — kab aur kya',
    instructions: 'Yahan faisla aur uski wajah bolni hai — number ke saath. 🎤',
    questions: [
      {
        q: '"Multi-tenant SaaS hai. Ek tenant ke bulk import se doosre tenants ke requests timeout ho jaate hain. Tum autoscaling ka sujhaav doge?"',
        choices: [
          'Akela autoscaling nahi. Nayi machines pehchaan + boot ke baad aati hain; us beech sab ek hi line mein hain. Pehle tenants ko alag karo (har tenant ki apni line, baari-baari; upar se ek hadd), phir autoscaling ko jagah badhane do',
          'Haan — bas autoscaling ka threshold kam kar do',
          'Us tenant ko block kar do',
          'Timeout badha do',
        ],
        answer: 0,
        explain: 'Lab: ek line + autoscaling → naye workers 10.1 s par, us se pehle shaant tenants ki 472 mein se 354 fail. Baari-baari (autoscaling ke bina) → 814 mein se 0.',
      },
      {
        q: '"Dashboard par har tenant apni hadd ke andar hai, phir bhi sabko latency badhi hui dikh rahi hai. Kaunsa tenant noisy hai?"',
        choices: [
          'Shayad koi nahi. Agar sabka jod service ki chhat se upar hai, toh yeh capacity ki samasya hai. Isolation takleef baant sakti hai, jagah nahi bana sakti — jagah badhani padegi (ya kam zaroori kaam girana)',
          'Jo tenant sabse zyada bhej raha hai, wahi noisy hai — use block karo',
          'Hadd aadhi kar do',
          'Latency ka metric galat hoga',
        ],
        answer: 0,
        explain: 'Lab: teen tenants, har ek 80/s (hadd 80), jod 240, chhat 200. Har niyam mein aadhi requests ko ~846 ms lage; baari-baari ne fail barabar kiye (2% har ek), ghataye nahi.',
      },
      {
        q: '"Ek maintenance job ko humne low priority kar diya, phir bhi users ko latency spike dikhte hain. Kyun?"',
        choices: [
          'Priority sirf agla kaam chunti hai; chalte hue lambe kaam ko nahi rokti. Job ke workers par hadd lagao (jaise zyada se zyada 1), ya job ke tukde chhote karo, ya job ko kam bheed wale waqt par le jao',
          'Low priority kaam nahi karti',
          'Users ki priority aur badha do',
          'Job ko aur workers de do taaki jaldi khatam ho',
        ],
        answer: 0,
        explain: 'Lab: users ki line mein → 141 ms. Kam zaroori → 42 ms. Kam zaroori + 1 worker → 22 ms (job aadhi raftaar par).',
      },
    ],
  },
  success: [
    'Pehle pooch sakte ho: ek ka shor hai, ya sabka jod hi zyada hai',
    'Bata sakte ho ki autoscaling kab madad karta hai aur us se pehle ke seconds mein kaun bachata hai',
    'Background job ke liye do cheezein saath laga sakte ho: kam zaroori, aur workers ki hadd',
  ],
  cards: [
    { front: 'Hadd, baari, alag khidki — kaise chunein?', back: 'Anjaan bhejne wala ya plan ka vaada → <b>hadd</b>. Khaali jagah kisi ke kaam aaye → <b>baari-baari</b>. Zara bhi asar nahi chalega → <b>alag khidki</b>. Aksar teeno saath.' },
    { front: 'Autoscaling akela kaafi kyun nahi?', back: 'Pehchaan + boot mein waqt lagta hai. Lab: bheed 2 s par, naye workers 10.1 s par; us beech shaant tenants ki 472 mein se 354 fail. Baari-baari ke saath: 0.' },
    { front: 'Koi shor nahi kar raha, par sab dheeme hain?', back: 'Sabka jod chhat se upar hai: capacity ki samasya. Isolation takleef baant-ti hai (lab: baari-baari → 2% har ek), jagah nahi banati.' },
    { front: 'Background job users ko dheema kar raha hai?', back: 'Kam zaroori + workers ki hadd. Lab: 141 ms → 42 ms (sirf kam zaroori) → 22 ms (+ 1 worker). Priority chalte kaam ko nahi rokti.' },
    { front: 'Sab tenants ki hadd ka jod chhat se upar ho toh?', back: 'Hadd bachati nahi. Lab: 3 × 80 = 240, chhat 200 → hadd kabhi lagi hi nahi, sab dheeme.' },
  ],
},
]);

})();
