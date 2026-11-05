(() => {
/* =====================================================================
   TRACK 1 — Foundations: Request ka Safar
   lifecycle · boundaries · latency · estimation · syncasync · fanout ·
   decompose · boss-flow

   ⚠️ PATTERN: har terminal mission ke tasks ek `const` array mein hain
   aur `success` unhi se banta hai (`SD.allTasks(TASKS)`). Isse woh classic bug
   hi nahi ho sakta jisme success() tasks se kam shartein check kare aur
   baaki tasks kabhi tick hi na hon.
   ===================================================================== */



/* ---------------------------------------------------------------- L1 */
const T_LIFECYCLE = [
  { text: "Ek normal GET bhejo aur cost panel padho",
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200) },
  { text: "/health maango — dekho ki health check DB aur dependency tak jaata hi nahi",
    check: s => s.records.some(r => r.kind === 'health') },
  { text: '500 rps ka load daalo',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500) },
  { text: 'Naya trace chalao: atka hua kadam pool.acquire() nikle',
    check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst) && r.revision === s.revision) },
];

const T_IV_DIAGNOSE = [
  { text: 'Load daalo taaki problem dikhe', check: s => s.records.some(r => r.kind === 'load') },
  { text: 'Naya trace chalao aur atka hua kadam (pool.acquire()) dhoondo', check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst) && r.revision === s.revision) },
];

const T_TAIL = [
  { text: '400 rps ka load daalo aur p50 vs p99 ka farak dekho',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 400 && r.revision === s.revision) },
  { text: '99.9% availability ka error budget nikalo',
    check: s => s.records.some(r => r.kind === 'slo' && r.avail === 99.9 && r === SD.mission.latest(s, 'slo')) },
];

const T_FANOUT = [
  { text: 'Normal request bhejo — baseline p99 dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 < 500) },
  { text: 'Downstream ko 3 second dheema karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'latency' && r.target === 'ledger' && r.value === 3000) },
  { text: 'GET bhejo: jawab 200 aaye, par p99 2000ms se upar — ledger ki der API mein jud gayi',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 > 2000) },
  { text: 'Ledger par 150ms ka timeout lagao (200ms SLO se kam)',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout' && r.target === 'ledger' && r.ms === 150) },
  { text: 'Ab failure bounded ho: HTTP 504 aur p99 800ms se kam',
    check: s => s.sys.deps.ledger?.timeoutMs === 150 && SD.mission.current(s, 'http', r => r.status === 504 && r.p99 < 800) },
];

const T_GUARDS = [
  { text: 'Dekho ki ?limit=1000 bina rok-tok chal jaata hai',
    check: s => s.records.some(r => r.kind === 'http' && r.limit === 1000 && r.status === 200) },
  { text: 'maxLimit 100 par set karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /maxLimit/.test(r.path) && r.value === 100) },
  { text: 'maxLimit=100 ke baad limit=1000 wali request bhejo — 400 se mana ho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 400 && r.guard === 'maxLimit') },
  { text: 'Rate limit lagao: 100 rps, burst 120',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'ratelimit' && r.cfg.rps === 100 && r.cfg.burst === 120 && s.sys.api.rateLimit?.rps === 100 && s.sys.api.rateLimit?.burst === 120) },
  { text: 'Burst bhejo aur 429 khaao',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 429 && r.blocked > 0 && r.revision === s.revision && s.sys.api.maxLimit === 100) },
];

const T_ESTIMATE = [
  { text: '12,00,000 users, har record 2048 bytes; average 27.78 rps ko 28 rps maan ke estimate do',
    check: s => s.records.some(r => r.kind === 'estimate' && r.users === 1200000 && r.rps === 28 && r.bytesPer === 2048 && r === SD.mission.latest(s, 'estimate')) },
  { text: "Peak nikalo: average 28 rps ka 3 guna = 84 rps",
    check: s => s.records.some(r => r.kind === 'estimate' && r.peak === 84 && r.rps === 28 && r === SD.mission.latest(s, 'estimate')) },
  { text: '99.9% SLO ka error budget dekho',
    check: s => s.records.some(r => r.kind === 'slo' && r.avail === 99.9 && r === SD.mission.latest(s, 'slo')) },
];

SD.registerLevels('flow', [

/* =====================================================================
   L1 — Request ki poori zindagi
   ===================================================================== */
{
  id: 'lifecycle',
  icon: '🧭',
  title: 'Ek Request ki Poori Zindagi',
  badge: 'Path Finder',
  objectives: [
    'Client se DB tak ke <b>har hop</b> ka naam aur keemat',
    'Kaunsa hop <b>rok</b> sakta hai (CDN, cache) aur kaunsa <b>queue</b> banata hai',
    '<code>trace</code> se dekhna ki waqt <b>kahan</b> gaya',
    'Health check green kyun rehta hai jab sab kuch jal raha ho',
  ],
  lesson: [
    `<h3>📖 "GET /orders" — beech mein kya-kya hota hai?</h3>
     <p>Zyadatar developers ka mental model do box ka hota hai:
     <code>App → DB</code>. Asli raasta aisa dikhta hai:</p>
     <pre>Browser
  → DNS lookup                    20 ms   (cached ho toh 0)
  → TCP + TLS handshake           80 ms   (keep-alive ho toh 0)
  → CDN edge            ← HIT toh yahin khatam ⚡
  → Load balancer                  1 ms
  → API gateway                    3 ms   (auth + rate limit)
  → Service (app code)             5 ms
  → Cache (Redis)       ← HIT toh yahin khatam ⚡   1 ms
  → 🚧 DB connection pool         ??? ms  ← YAHAN QUEUE BANTI HAI
  → Database                       5 ms
  ← wapas, ulte kram mein</pre>
     <p>Do baatein turant dhyaan mein rakho:</p>
     <p><b>1. Har layer ka ek hi kaam hai — agli layer tak jaane se ROKNA.</b>
     CDN ne rok liya? Server ne kuch kiya hi nahi. Cache ne rok liya? DB ne
     kuch kiya hi nahi. Isiliye "kahan cache karun" ka jawab hamesha
     <i>"jitna baahar ho sake"</i> hota hai.</p>
     <p><b>2. Ek hop baaki sab se alag hai — connection pool.</b> Baaki
     saare hops <b>kaam</b> karte hain. Pool <b>intezaar</b> karwata hai.
     Aur production ke outage lagbhag hamesha
     intezaar se aate hain — kaam se nahi.</p>`,
    `<h3>🔬 "CPU 10% hai, memory theek hai, health green hai — phir timeout kyun?"</h3>
     <p>Interview ka sabse achha sawaal, aur production ka sabse
     common 3 baje raat wala confusion. Agar app <b>busy nahi</b> hai, toh
     app <b>kis cheez ka intezaar</b> kar rahi hai?</p>
     <p>Ek request ko trace karo — machine ke metrics ghoorna band karo:</p>
     <pre>  app handler (CPU)        5 ms   ← app ka apna kaam
  ⏳ pool.acquire()    9,900 ms   ← 💀 YAHI HAI
  db query                20 ms   ← DB bilkul theek hai!
  ────────────────────────────
  TOTAL                9,925 ms</pre>
     <p>Is request ka SQL sirf 20 ms le raha hai — waqt <b>DB ke saamne ki queue</b>
     mein gaya. Ab dekho connections kaun pakde baitha hai: lambi transactions, leak,
     ya sach mein bojh zyada. (Ek request ka 20 ms baaki connections ka haal nahi batata.)</p>
     <p>Aur health check green kyun hai? Kyunki is service ka health check jaan-boojh ke
     sasta banaya gaya hai — health check sirf itna kehta hai <i>"process zinda hai"</i>.
     Health check ne na connection liya, na dependency chhui.</p>
     <p class="tip">🎯 <b>Health check pass hona</b> aur <b>service traffic
     serve kar paana</b> — dono alag baatein hain.</p>`,
    `<h3>🧰 perfsim — is app ka terminal</h3>
     <p>Baaki Gurukul apps mein terminal ek <i>tool</i> sikhata hai. Yahan
     terminal ek <b>poora system chalata hai</b>. Har daava jo tum padhoge,
     us daave ka saboot yahin milega.</p>
     <pre>GET /api/v1/transactions?page=1&limit=50   ← request bhejo, cost dekho
show tables                                ← system mein kya-kya hai
sim status                                 ← poora dashboard
load --rps 500 --duration 8                ← load daalo
trace GET /api/v1/orders                   ← waqt kahan gaya
metrics                                    ← CPU vs saturation
help                                       ← saare commands</pre>
     <p>Mission mein <code>help</code> hamesha available hai. Ghabrana mat —
     galat command se kuch toot-ta nahi.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Request ke hops sahi kram mein',
      instructions: 'Browser se database tak — sahi order lagao.',
      steps: [
        { text: 'DNS lookup — domain se IP', explain: 'Sabse pehla network kaam. Cached ho toh 0 ms, warna ~20 ms. Isiliye pehla page load hamesha dheema lagta hai.' },
        { text: 'TCP + TLS handshake', explain: '~80 ms, aur ye kharch har naye connection par lagta hai. Keep-alive / HTTP/2 isliye itna matter karta hai — handshake dobara nahi hota.' },
        { text: 'CDN edge — cached hai kya?', explain: 'Yahan HIT ho gaya toh request tumhare server tak pahunchi hi nahi. Sabse sasti request — jo aayi hi nahi.' },
        { text: 'Load balancer — kaunsa instance', explain: 'TLS terminate + healthy instance chuno. ~1 ms. Isi jagah pata chalta hai ki "instance down hai".' },
        { text: 'API gateway — auth + rate limit', explain: 'AuthN aur rate limiting YAHAN hote hain — service mein nahi. Jo request andar aane hi nahi chahiye, use baahar hi roko.' },
        { text: 'Service — business logic', explain: 'Ab tumhara code chalta hai. Aksar sirf 5 ms CPU — baaki sab intezaar hai.' },
        { text: 'Cache — Redis/memcached', explain: 'HIT = ~1 ms aur DB bacha. MISS = aage jao. Hit rate 90% ka matlab DB par load 10x kam.' },
        { text: 'DB connection pool — ek connection maango', explain: '🚧 QUEUE isi jagah banti hai. Sab connections busy? Tumhari request line mein lag jaati hai — CPU 0% par.' },
        { text: 'Database — query chalao', explain: 'Aakhir mein asli kaam. 5 ms bhi ho sakta hai, 8 second bhi — depend karta hai ki query ne kitni rows chhui.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Raaste par ungli rakho',
      instructions: 'Diagram mein sahi hop click karo.',
      visual: 'lifecycle',
      questions: [
        { q: 'Kaunsa hop request ko poori tarah ROK sakta hai (server tak pahunchne hi na de)?', target: 'cdn', explain: 'CDN edge. HIT hua toh tumhara server ko pata bhi nahi chalta ki request aayi thi. CDN HIT sabse sasti "optimization" hai.' },
        { q: 'Kaunsa hop KAAM nahi karta — sirf INTEZAAR karwata hai?', target: 'pool', explain: 'Connection pool. Baaki sab hops kuch karte hain; pool sirf line lagwata hai. Aur outage lagbhag hamesha yahin se aate hain.' },
        { q: 'AuthN (tum kaun ho?) aur rate limiting kahan honi chahiye?', target: 'gateway', explain: 'API gateway — jitna baahar ho sake. Service tak pahunchne ke baad reject karne ka matlab hai ki thread, memory aur shayad connection pehle hi kharch ho chuke.' },
        { q: 'Handshake ki 80 ms ki keemat kahan lagti hai?', target: 'tls', explain: 'TCP + TLS. Isiliye keep-alive, connection pooling aur HTTP/2 itne zaroori hain — handshake ek hi baar ho, har request par nahi.' },
      ],
    },
    {
      type: 'terminal',
      title: '🔍 Pehla mission — system ko chhu ke dekho',
      goal: "Orders service ka naksha banao: ek GET, health check, 500 rps ka load, aur trace mein pool.acquire() par atkaav.",
      sys: SD.sys.orders({ db: { longTxHolding: 42 } }),
      tasks: T_LIFECYCLE,
      success: SD.allTasks(T_LIFECYCLE),
      successText: "CPU kam hai, health green hai — phir bhi request pool ke connection ka intezaar kar sakti hai. Naye trace ne dikhaya ki atkaav pool.acquire() par hai. Health check ka green hona DB ya downstream ke theek hone ka saboot nahi.",
      solution: [
        "GET /api/v1/orders?page=1&limit=50",
        "GET /health",
        "load --rps 500 --duration 6",
        "trace GET /api/v1/orders",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'trace', r => /pool/.test(r.worst)); },
      hints: [
        'Shuru mein kuch mat badlo. Ek normal GET bhejo aur cost panel padho — aage ka har number is pehle number se milana hai.',
        '/health 200 de tab bhi dekho ki health check kya-kya NAHI chhoota (DB? cache?). Phir load daalo aur `trace GET <path>` se dekho ki waqt kis hisse mein gaya.',
        'Poora raasta — har command alag Enter se chalao:\nGET /api/v1/orders?page=1&limit=50\nGET /health\nload --rps 500 --duration 6\ntrace GET /api/v1/orders',
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa kaam kaunsi layer par?',
      instructions: 'Har kaam ko kaam ki sahi jagah par daalo.',
      bins: [
        { id: 'edge', label: '🌍 CDN / Edge' },
        { id: 'gw', label: '🚪 Gateway' },
        { id: 'svc', label: '⚙️ Service' },
      ],
      items: [
        { text: 'Product images aur JS bundles', bin: 'edge', explain: 'Public + immutable = CDN ka perfect candidate. User ke sabse paas, aur tumhara server bilkul involve nahi.' },
        { text: 'JWT verify karna (tum kaun ho?)', bin: 'gw', explain: 'AuthN gateway par. Ek jagah, sab services ke liye. Har service mein dobara likhna = ek din koi bhool jaayega.' },
        { text: 'Per-user rate limit — 100 req/min', bin: 'gw', explain: 'Baahar hi roko. Service tak aane diya toh thread + memory + shayad ek DB connection pehle hi kharch ho gaya.' },
        { text: '"Kya user IS order ko dekh sakta hai?"', bin: 'svc', explain: 'AuthZ service mein. Gateway ko pata nahi ki order kiska hai — us business rule ka maalik service hai.' },
        { text: 'Refund tabhi jab order 30 din se purana na ho', bin: 'svc', explain: 'Pura business rule. Ownership ka check gateway mein daalna matlab business logic ko infrastructure mein bikhraana.' },
        { text: 'TLS terminate karna', bin: 'gw', explain: 'Gateway/LB par. Har service ko certificate manage karwana ek operational duswapna hai.' },
        { text: 'Public blog post ka HTML', bin: 'edge', explain: 'Sab ke liye same content = CDN. Yahi cheez agar per-user hoti toh CDN par daalna ek security bug hota.' },
        { text: 'Order total calculate karna', bin: 'svc', explain: 'Core domain logic. Ownership ka check kabhi edge par mat le jao — edge par na data hai na consistency.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Samajh pakki karo',
      questions: [
        {
          q: 'Health check 200 OK de raha hai par saare user requests timeout ho rahe hain. Sabse pehla shak kis par?',
          choices: [
            'Koi resource bhar chuka hai jise health check chhoota hi nahi — jaise DB connection pool',
            'Server ka CPU 100% par hoga — CPU bhara ho toh har request timeout hoti hai',
            'Database corrupt ho gaya hoga — isliye har query atak ke timeout de rahi hai',
            'Load balancer ne saare instances hata diye honge — requests kahin ja hi nahi rahi',
          ],
          answer: 0,
          explain: '200 sirf health handler ke check kiye hue raaste ka saboot hai. Agar handler pool ya downstream ko nahi chhoota, toh user requests resource ka intezaar karti reh sakti hain — jaise DB connection pool. Handler aur user-request trace dono dekho; green check poori service ki guarantee nahi.',
          choiceExplanations: [
            '200 sirf health handler ke check kiye hue raaste ka saboot hai. Agar handler pool ya downstream ko nahi chhoota, toh user requests resource ka intezaar karti reh sakti hain — jaise DB connection pool. Handler aur user-request trace dono dekho; green check poori service ki guarantee nahi.',
            'Ho sakta hai, par CPU 100% hota toh CPU ka graph khud bata deta. Bina dekhe CPU maan lena andaaza hai.',
            'Corruption bina saboot ka bada daava hai. Pehle dekho request kahan atak rahi hai — trace aur metrics se.',
            'Health handler ka 200 balancer ki membership saabit nahi karta. Balancer ki routing state aur user-request trace dekho.',
          ],
        },
        {
          q: 'Rate limiting service ke andar lagane mein sabse badi dikkat kya hai?',
          choices: [
            'Mana karne se pehle hi network, thread aur memory ka kuch kharcha ho chuka hota hai',
            'Service ke andar ginti purani rehti hai, kyunki hadd ki jaankari gateway ke paas hoti hai',
            'Service se aaya 429 client samajh nahi paata — 429 sirf gateway ka jawab maana jaata hai',
            'Service ke andar poore system ki ek saath hadd (global quota) ban hi nahi sakti',
          ],
          answer: 0,
          explain: 'Service tak pahunchne se pehle network aur request handling ka kuch kharcha ho chuka hota hai. Service ke shuru mein lagi limit phir bhi DB aur downstream ka kaam bacha sakti hai. Gateway par moti limit se aur pehle bachav milta hai; service mein domain ya resource ki limit bhi kaam aati hai. Jitna bahar mana karo, utna sasta.',
          choiceExplanations: [
            'Service tak pahunchne se pehle network aur request handling ka kuch kharcha ho chuka hota hai. Service ke shuru mein lagi limit phir bhi DB aur downstream ka kaam bacha sakti hai. Gateway par moti limit se aur pehle bachav milta hai; service mein domain ya resource ki limit bhi kaam aati hai. Jitna bahar mana karo, utna sasta.',
            'Service apni ginti khud rakh sakti hai. Asli baat: service tak aate-aate kuch kharcha ho chuka.',
            '429 koi bhi bhej sakta hai, aur client samajh leta hai. Baat 429 se pehle lage kharche ki hai.',
            'Service bhi milke ek global hadd rakh sakti hai (jaise shared Redis counter). Baat kharche ki hai.',
          ],
        },
        {
          q: "Ek request ka trace: app 5 ms · pool.acquire 9,900 ms · SQL 20 ms. Pehla kadam?",
          choices: [
            'Dekho connections kaun pakde baitha hai — lambi transaction, leak, ya sach mein bojh zyada',
            'SQL par naya index lagao — query tez hogi toh pool bhi apne aap jaldi khaali hoga',
            'DB server ki RAM double karo — zyada RAM se pakde hue connections jaldi chhootenge',
            'Pool ka size 50 se 500 kar do — zyada connections honge toh intezaar khatam ho jaayega',
          ],
          answer: 0,
          explain: 'Trace mein sabse bada hissa pool ka intezaar hai. Pehle connections ka hold time, lambi transactions, leaks aur aane wala bojh dekho. SQL ko tez karna tab madad karta hai jab SQL connections ko der tak pakad raha ho — ek request ka 20 ms sample wajah saabit nahi karta. Pool badhane se pehle DB ki capacity naapo: bahut zyada connections aksar DB ko dheema karte hain.',
          choiceExplanations: [
            'Trace mein sabse bada hissa pool ka intezaar hai. Pehle connections ka hold time, lambi transactions, leaks aur aane wala bojh dekho. SQL ko tez karna tab madad karta hai jab SQL connections ko der tak pakad raha ho — ek request ka 20 ms sample wajah saabit nahi karta. Pool badhane se pehle DB ki capacity naapo: bahut zyada connections aksar DB ko dheema karte hain.',
            'Index tab madad karega jab connections dheemi queries mein phanse hon. Pehle hold time aur bhare pool ka saboot chahiye.',
            'RAM badhne se pakde hue ya leak hue connections apne aap nahi chhootte.',
            'Bina wajah jaane 500 connections DB par kheencha-taani badha sakte hain — aksar 50 se dheeme.',
          ],
        },
        {
          q: 'Public response ko CDN ke shared cache par rakhne se pehle sabse zaroori check kya hai?',
          choices: [
            'Cache key user ko galat response na de, aur policy shared caching ki ijaazat de',
            'Response chhota ho — 20 KB se bade response CDN par cache nahi karne chahiye',
            'Response ka format fixed ho — har user ko same JSON shape mile toh cache safe hai',
            'Content roz badalta ho — roz badalne wala content hi CDN ka sabse bada fayda hai',
          ],
          answer: 0,
          explain: 'Public content sabse aam case hai. CDN shared cache hai — key aksar sirf URL hoti hai, toh galat key par ek user ka response doosre ko mil sakta hai: bug nahi, security incident. User-specific content ke liye authorization, user ko alag rakhne wali cache key aur saaf policy chahiye; Cache-Control: private wala response shared cache mein nahi rakha jaata. Size ya format akele faisla nahi karte.',
          choiceExplanations: [
            'Public content sabse aam case hai. CDN shared cache hai — key aksar sirf URL hoti hai, toh galat key par ek user ka response doosre ko mil sakta hai: bug nahi, security incident. User-specific content ke liye authorization, user ko alag rakhne wali cache key aur saaf policy chahiye; Cache-Control: private wala response shared cache mein nahi rakha jaata. Size ya format akele faisla nahi karte.',
            'Chhota private response bhi doosre user ko dikh sakta hai. Size share karne ki ijaazat tay nahi karta.',
            'Shape same hona content same hona nahi. Har user ki order-list same shape ki, par alag hai.',
            'Roz badalna freshness ka sawaal hai, privacy ka nahi. Pehle dekho response share karna safe hai ya nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Request Path',
    instructions: 'Pehla round. Yahan interviewer dekhta hai ki tumhara mental model kitna gehra hai. 🎤',
    questions: [
      {
        q: '"Ek user bolta hai app slow hai. Tum kahan se shuru karoge?"',
        choices: [
          'Ek slow request ko shuru se aakhir tak trace karunga — waqt kis hop mein gaya',
          'Server ka CPU aur memory dekhunga, aur zyada ho toh turant scale up kar dunga',
          'Database ki slow query log dekhunga — dheemapan aksar database se hi aata hai',
          'Aur servers add kar dunga — zyada servers par har user ki request jaldi chalegi hi',
        ],
        answer: 0,
        explain: 'Machine metrics batate hain machine kaisi hai. Trace batata hai request ke saath kya hua. p99 high hai — bas itna pata chalta hai ki dikkat hai; trace batata hai kahan. "Ek request ka peechha karo" seniority ka sabse saaf signal hai.',
        choiceExplanations: [
          'Machine metrics batate hain machine kaisi hai. Trace batata hai request ke saath kya hua. p99 high hai — bas itna pata chalta hai ki dikkat hai; trace batata hai kahan. "Ek request ka peechha karo" seniority ka sabse saaf signal hai.',
          'CPU dikhata hai machine kaisi hai — request kahan atki, nahi. Pehle slow hop dhoondho.',
          'Database ho sakta hai, par abhi pata nahi. Trace batayega ki waqt database mein gaya ya kahin aur.',
          'Servers tab madad karte hain jab naapa hua bottleneck servers badhane se hat-ta ho. Pehle naapo.',
        ],
      },
      {
        q: '"Cache kahan lagaoge — CDN, gateway, app, ya DB?"',
        choices: [
          'Data kiska hai us par: public → CDN, per-user → app cache, bhaari hisaab → materialized view',
          'Hamesha Redis mein — Redis sabse tez hai, toh har tarah ka data Redis mein hi rakho',
          'Sab kuch CDN par — CDN sabse bahar hai, toh har request sabse jaldi laut aayegi',
          'Database ke apne cache par bharosa — DB khud yaad rakhta hai, alag layer bekaar hai',
        ],
        answer: 0,
        explain: 'Sahi jawab "kahan" se nahi, "data kiska hai" se aata hai. Public ya na badalne wala data → jitna bahar, utna achha. Per-user data shared cache par sirf tab, jab cache key mein user ki pehchaan ho aur privacy niyam saaf ho. Aur har cache layer ek invalidation problem muft mein deti hai — isliye jitni kam layers, utna achha.',
        choiceExplanations: [
          'Sahi jawab "kahan" se nahi, "data kiska hai" se aata hai. Public ya na badalne wala data → jitna bahar, utna achha. Per-user data shared cache par sirf tab, jab cache key mein user ki pehchaan ho aur privacy niyam saaf ho. Aur har cache layer ek invalidation problem muft mein deti hai — isliye jitni kam layers, utna achha.',
          'Redis tez hai, par data kiska hai aur kab purana hoga — Redis ka tez hona in sawaalon ka jawab nahi.',
          'Sab kuch CDN par rakhna safe nahi. Private content ke liye sahi key, authorization aur caching policy chahiye.',
          'DB ka cache request ke DB tak aane ke baad hi kaam aata hai. App ya CDN wala kaam DB cache nahi karta.',
        ],
      },
      {
        terminal: {
          goal: "Interviewer: orders service dheemi hai. Load chalao, phir naye trace se dikhao ki atkaav pool.acquire() par hai.",
          sys: SD.sys.orders({ db: { longTxHolding: 45 } }),
          tasks: T_IV_DIAGNOSE,
          success: SD.allTasks(T_IV_DIAGNOSE),
          successText: 'Bilkul sahi. Tumne machine ghoorne ke bajaye <b>ek request ka peecha</b> kiya — aur bottleneck 5 second mein mil gaya.',
          solution: [
            "load --rps 500 --duration 6",
            "trace GET /api/v1/orders",
          ],
          verify: s => { const m = SD.mission; return m.current(s, 'trace', r => /pool/.test(r.worst)); },
          hints: [
            'Shaant system mein dheemapan dikhta hi nahi. Pehle `load` se traffic daalo, taaki problem sach mein ho rahi ho.',
            'Machine ke numbers ghoorne ke bajaye ek request ka peecha karo: `trace GET /api/v1/orders`. Trace ka sabse lamba hissa hi bottleneck hai.',
            'Poora raasta — har command alag Enter se chalao:\nload --rps 500 --duration 6\ntrace GET /api/v1/orders',
          ],
        },
      },
      {
        q: "\"Tumhare service ka p99 200 ms hai. Tum ek nayi dependency add kar rahe ho jiska p99 150 ms hai. Naya p99 kya hoga?\"",
        choices: [
          'Pakka nahi keh sakte — do p99 seedhe nahi judte; poori distribution chahiye',
          'Theek 350 ms — serial call mein dono p99 seedhe jud jaate hain, bas itna hi',
          'Theek 200 ms — parallel call mein naya p99 dono mein bade wale jitna hota hai',
          'Theek 150 ms — nayi dependency tez hai, toh service ka p99 neeche aa jaayega',
        ],
        answer: 0,
        explain: 'Do alag p99 se serial jod ya parallel maximum ka pakka p99 nahi nikalta — poori latency distribution, dono ka aapas mein rishta (correlation) aur call ka tareeka chahiye. Par aam baat: do calls mein se koi bhi slow ho sakti hai, toh slow requests ka hissa badhta hai (independent hon toh lagbhag 1 − 0.99² ≈ 2%). Isliye har extra dependency p99 par tax hai — aur har call par timeout zaroori hai.',
        choiceExplanations: [
          'Do alag p99 se serial jod ya parallel maximum ka pakka p99 nahi nikalta — poori latency distribution, dono ka aapas mein rishta (correlation) aur call ka tareeka chahiye. Par aam baat: do calls mein se koi bhi slow ho sakti hai, toh slow requests ka hissa badhta hai (independent hon toh lagbhag 1 − 0.99² ≈ 2%). Isliye har extra dependency p99 par tax hai — aur har call par timeout zaroori hai.',
          'Har request ka samay judta hai, par do alag p99 jodne se p99 nahi banta. Dono kab slow hote hain — saath ya alag — distribution chahiye.',
          'Parallel mein bhi koi ek call slow ho toh poori request slow. Do mein se koi bhi slow ho sakti hai, toh tail aksar badhti hai.',
          'Nayi dependency purana kaam hatati nahi, upar se judti hai.',
        ],
      },
    ],
  },
  success: [
    'Ek request ke saare hops naam le ke bata sakte ho',
    'Bata sakte ho kaunsa hop rokta hai aur kaunsa queue banata hai',
    '<code>trace</code> se bottleneck dhoondh sakte ho',
    'Samjha sakte ho ki health green kyun rehta hai jab service mar rahi ho',
  ],
  homework: `Apne project ka ek asli endpoint chuno aur endpoint ke <b>saare hops</b> likho —
    CDN hai? gateway? cache? pool size kitna hai? Phir ek sawaal ka jawab dhoondo:
    <b>agar 10x traffic aa jaaye toh sabse pehle kaunsa hop bharega?</b>
    Zyadatar logon ka jawab "CPU" hota hai, aur zyadatar log galat hote hain.`,
  cards: [
    { front: 'Ek request ke hops?', back: 'DNS → TCP/TLS → CDN → LB → Gateway → Service → Cache → <b>Pool</b> → DB. Har layer ka kaam: <b>agli layer tak jaane se rokna</b>.' },
    { front: 'Health green par sab timeout — kyun?', back: 'Health checks jaan-boojh ke saste hain — sirf "process zinda hai". Health checks na pool se connection lete hain, na dependencies chhute hain. <b>Health pass ≠ traffic serve ho raha hai.</b>' },
    { front: 'Trace mein: app 5ms, pool.acquire 9900ms, SQL 20ms — kya karoge?', back: 'Query ko haath mat lagao (query sirf 20ms hai). Dekho <b>connections kaun pakde hai</b> — lambi transaction, leak, ya asli overload. Pool andha-dhundh badhana ulta padta hai.' },
    { front: 'Rate limit kahan?', back: '<b>Gateway par</b> — jitna baahar ho sake. Service mein reject karne se pehle hi thread + memory + connection kharch ho chuka hota hai.' },
    { front: 'AuthN vs AuthZ kahan?', back: 'AuthN (tum <b>kaun</b> ho) = gateway, ek jagah sab ke liye. AuthZ (kya tum <b>kar sakte</b> ho?) = service, kyunki business rule ka maalik wahi hai.' },
    { front: 'CDN par kya daal sakte ho?', back: 'Sirf wahi data jo <b>sab users ke liye ek jaisa</b> ho. Unsafe common cache key se per-user data leak ho sakta hai;private/no-store aur tested key isolation enforce karo.' },
  ],
},

/* =====================================================================
   L2 — Boundaries
   ===================================================================== */
{
  id: 'boundaries',
  icon: '🚧',
  title: 'Boundaries — Kaam Kis Layer ka Hai',
  badge: 'Boundary Keeper',
  objectives: [
    'AuthN baahar, AuthZ andar — aur kyun',
    'Cache ki jagah <b>data ke maalik</b> se tay hoti hai, tezi se nahi',
    'Rate limit, quota aur backpressure — teeno alag cheezein',
    'Validation har layer par kyun (aur kaunsi validation kahan)',
  ],
  lesson: [
    `<h3>📖 Ek galti jo har codebase mein milti hai</h3>
     <p>Kisi bhi purane codebase mein ye dikhega: rate limiting service ke
     andar, business rules gateway mein, aur per-user data CDN par.
     Har ek "kaam kar raha tha" — isliye kabhi theek nahi hua.</p>
     <p>Boundary decide karne ka ek hi asli sawaal hai:
     <b>"Is faisle ke liye zaroori GYAAN kiske paas hai?"</b></p>
     <table>
       <tr><th>Faisla</th><th>Gyaan chahiye</th><th>Jagah</th></tr>
       <tr><td>Token asli hai?</td><td>public key — sab ke liye same</td><td>🚪 Gateway</td></tr>
       <tr><td>Kya user IS order ko dekh sakta hai?</td><td>order kiska hai — sirf service jaanti hai</td><td>⚙️ Service</td></tr>
       <tr><td>User ne 100 req/min paar kiya?</td><td>counter — sab ke liye same</td><td>🚪 Gateway</td></tr>
       <tr><td>Refund allowed hai?</td><td>order date, policy, payment state</td><td>⚙️ Service</td></tr>
       <tr><td>Email unique hai?</td><td>poori table — race condition safe</td><td>🗄️ DB constraint</td></tr>
     </table>
     <p class="tip">🎯 Aakhri row important hai. Application code mein
     "pehle SELECT karke check karo, phir INSERT karo" <b>hamesha</b> ek
     race condition hai. Uniqueness ka faisla sirf DB kar sakta hai,
     kyunki poora sach sirf database ke paas hai.</p>`,
    `<h3>🔬 Rate limit vs Quota vs Backpressure</h3>
     <p>Teen alag cheezein, teen alag maqsad — log teenon ko "rate limiting"
     bol dete hain:</p>
     <table>
       <tr><th></th><th>Kya rokta hai</th><th>Kiske liye</th><th>Jawab</th></tr>
       <tr><td><b>Rate limit</b></td><td>burst — 100 req/min</td><td>fairness — ek client sab na kha jaaye</td><td><code>429 + Retry-After</code></td></tr>
       <tr><td><b>Quota</b></td><td>total — 1M req/mahina</td><td>business/billing</td><td><code>402</code> ya <code>403</code></td></tr>
       <tr><td><b>Backpressure</b></td><td>system bhar gaya</td><td>khud ko bachana</td><td><code>503 + Retry-After</code></td></tr>
     </table>
     <p>Farak samajhna zaroori hai: rate limit <b>client ki galti</b> batata
     hai. Backpressure <b>tumhari halat</b> batata hai. Agar tum overload
     par 429 bhejoge, toh client sochega ki usne kuch galat kiya aur
     shayad tez retry karega — jabki tumhe ulta chahiye tha.</p>`,
    `<h3>🧪 Validation har jagah — par alag-alag</h3>
     <pre>Client   → "form khaali hai" (UX ke liye — bharosa ZERO)
Gateway  → schema/size/content-type (kachra andar hi na aaye)
Service  → business rules (amount > 0, order cancel ho sakta hai?)
Database → constraints (unique, FK, NOT NULL — aakhri kila)</pre>
     <p>Naye developers poochhte hain "kya ye duplicate nahi hai?" — nahi.
     Har layer <b>alag cheez</b> se bacha rahi hai. Client wali UX ke liye
     hai; DB wali <b>concurrency</b> ke liye hai. Client wali validation
     hata do toh form kharab lagega. DB wali hata do toh <b>data
     kharab</b> ho jaayega.</p>`,
  ],
  stages: [
    {
      type: 'hotspot',
      title: 'Har cheez apni jagah',
      instructions: 'Diagram mein sahi layer par click karo.',
      visual: 'boundaries',
      questions: [
        { q: 'JWT signature verify karna kahan?', target: 'gateway', explain: 'Gateway — ek jagah, sab services ke liye. Har service mein alag se likhoge toh ek din koi service purani library par reh jaayegi.' },
        { q: '"Kya user IS order ka maalik hai?" — kahan?', target: 'service', explain: 'Service. Gateway ko pata hi nahi ki order kiska hai. Ye gyaan sirf domain ke paas hai.' },
        { q: 'Uniqueness ki aakhri guarantee kahan?', target: 'db', explain: 'DB constraint. App mein "check karke insert" karna hamesha race condition hai — do requests ek saath check kar lengi aur dono pass ho jaayengi.' },
        { q: 'Product images kahan se serve honi chahiye?', target: 'cdn', explain: "Public immutable assets CDN se serve karo. Cache hits origin requests ghataate hain; misses, revalidation aur invalidation ka load rehta hai. Private images ko authorization-aware policy chahiye." },
      ],
    },
    {
      type: 'bins',
      title: 'Rate limit · Quota · Backpressure',
      instructions: 'Har halat ko sahi mechanism se jodo.',
      bins: [
        { id: 'rl', label: '🛡️ Rate limit (429)' },
        { id: 'q', label: '📊 Quota (402/403)' },
        { id: 'bp', label: '🌊 Backpressure (503)' },
      ],
      items: [
        { text: 'Ek client 5000 req/sec maar raha hai, baaki ko jagah nahi mil rahi', bin: 'rl', explain: 'Fairness ka masla — har client ko client ki apni limit mein rakho. 429 + Retry-After bhejo.' },
        { text: 'Free plan wala user is mahine ke 1M calls kar chuka', bin: 'q', explain: 'Business rule, capacity ka masla nahi. System bilkul serve kar sakta hai — tum nahi karna chahte. 402 Payment Required ya 403.' },
        { text: 'Saare DB connections busy hain, queue 8000 tak pahunch gayi', bin: 'bp', explain: 'Tumhari halat kharab hai, client ki galti nahi. 503 + Retry-After. Retry-After se client ko pata chalta hai ki dobara koshish karna theek hai.' },
        { text: 'Ek buggy mobile release har 100ms par poll kar raha hai', bin: 'rl', explain: 'Per-client limit. Galti client ki hai, aur 429 client ko yahi batata hai.' },
        { text: 'Downstream payment provider ne bola "1000 rps se zyada mat bhejo"', bin: 'bp', explain: 'Tumhe apna outbound flow control karna hai — queue mein daalo aur dheere bhejo. Users ko 429 bhejna galat hoga, unhone kuch galat nahi kiya.' },
        { text: 'Trial account 30 din baad expire ho gaya', bin: 'q', explain: 'Pure business/billing decision. Capacity se koi lena-dena nahi.' },
      ],
    },
    {
      type: 'terminal',
      title: '🛡️ Gateway par guard lagao',
      goal: 'Ek public API bina kisi guard ke chal rahi hai. Pehle dekho ki koi bhi kitna nuksaan kar sakta hai, phir gateway par limits lagao aur prove karo ki ab nahi ho sakta.',
      sys: SD.sys.txn(),
      tasks: T_GUARDS,
      success: SD.allTasks(T_GUARDS),
      successText: "maxLimit=100 ek request ka size baandhta hai. 100 rps (burst 120) ka limiter traffic ki raftaar baandhta hai. Naye 400 aur 429 jawabon ne dono rok kaam karti dikhayi.",
      solution: [
        "GET /api/v1/transactions?limit=1000",
        "sim set api.maxLimit 100",
        "GET /api/v1/transactions?limit=1000",
        "sim add ratelimit --rps 100 --burst 120",
        "GET /api/v1/transactions -n 300",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.maxLimit === 100 && s.sys.api.rateLimit?.rps === 100 && s.sys.api.rateLimit?.burst === 120 && m.current(s, 'http', r => r.status === 429 && r.blocked > 0); },
      hints: [
        'Pehle dikhao ki khatra asli hai: guard ke bina `?limit=1000` wali GET bhejo, aur dekho kitni rows aur kitna kharcha aaya.',
        'Do alag guard hain. Page ka size: `sim set api.maxLimit 100`, phir wahi request 400 deni chahiye. Raftaar: `sim add ratelimit …` — raftaar ka guard burst bhejne par hi dikhta hai (`-n 300`).',
        'Poora raasta — har command alag Enter se chalao:\nGET /api/v1/transactions?limit=1000\nsim set api.maxLimit 100\nGET /api/v1/transactions?limit=1000\nsim add ratelimit --rps 100 --burst 120\nGET /api/v1/transactions -n 300',
      ],
    },
    {
      type: 'quiz',
      title: 'Boundaries pakki karo',
      questions: [
        {
          q: 'App code mein: "SELECT karke dekho email exist karta hai? nahi? toh INSERT karo." Kya problem hai?',
          choices: [
            'Do requests ek saath SELECT karke dono "nahi mila" dekhengi, aur dono INSERT kar dengi',
            'Do queries chalne se data zaroor corrupt hoga — ek hi query mein dono kaam karo',
            'Kuch problem nahi — SELECT email ko tab tak lock rakhta hai jab tak INSERT na ho',
            'SELECT par index laga do — index hone se race apne aap khatam ho jaati hai',
          ],
          answer: 0,
          explain: 'Check-then-act race: do saath aayi requests dono ko lagega email free hai. Uniqueness ka faisla sirf DB ka UNIQUE constraint kar sakta hai, kyunki sirf DB ke paas poora, atomic sach hai. App wali check UX ke liye rakho — guarantee ke liye nahi.',
          choiceExplanations: [
            'Check-then-act race: do saath aayi requests dono ko lagega email free hai. Uniqueness ka faisla sirf DB ka UNIQUE constraint kar sakta hai, kyunki sirf DB ke paas poora, atomic sach hai. App wali check UX ke liye rakho — guarantee ke liye nahi.',
            'Do queries thodi dheemi hain, par asli khatra duplicate email hai, corruption nahi.',
            'Aam SELECT email ko agle INSERT tak reserve nahi karta. Do requests dono ko email absent dikh sakta hai; padh ke insert karna race nahi rokta.',
            'Aam lookup index padhna tez karta hai. UNIQUE constraint (ya UNIQUE index) hi saath aaye inserts mein duplicate email rokta hai.',
          ],
        },
        {
          q: 'System overload hai. Client ko kaunsa status code sabse sahi hai?',
          choices: [
            '503 + Retry-After — "meri taraf bhaari hai, thodi der baad aana"',
            '429 — "tumne bahut requests bheji", taaki client apni raftaar ghataaye',
            '400 — request poori nahi ho saki, toh request ko hi kharab bata do',
            '500 — server ke andar kuch gadbad hai, client ko itna batana kaafi',
          ],
          answer: 0,
          explain: '429 = tumne bahut maara. 503 = main bhara hua hoon. Overload par 429 bhejna client ko galat sandesh deta hai — client ne kuch galat nahi kiya. Aur 500 bug ka signal hai; 503 + Retry-After client ko batata hai ki kab dobara aana theek hai.',
          choiceExplanations: [
            '429 = tumne bahut maara. 503 = main bhara hua hoon. Overload par 429 bhejna client ko galat sandesh deta hai — client ne kuch galat nahi kiya. Aur 500 bug ka signal hai; 503 + Retry-After client ko batata hai ki kab dobara aana theek hai.',
            '429 tab, jab ek client apni hadd paar kare. Yahan poora system bhara hai — client ne kuch galat nahi kiya.',
            'Request bilkul theek thi. 400 client ko bolega ki request badlo — jabki dikkat server ki hai.',
            '500 bug ka signal hai, aur bahut se clients 500 par retry nahi karte. Overload par thodi der baad retry bilkul theek hai — 503 + Retry-After wahi batata hai.',
          ],
        },
        {
          q: "CDN shared cache mein per-user API response common key se reuse ho raha hai. Risk?",
          choices: [
            'Ek user ka data doosre user ko dikh sakta hai — bug nahi, security incident',
            'Response apne aap private maana jaayega, toh CDN kuch cache hi nahi karega',
            'Response mein cookie hai, toh CDN cache karega hi nahi — koi khatra nahi',
            'Bas thoda purana data dikhega — per-user response ka itna hi khatra hai',
          ],
          answer: 0,
          explain: 'CDN shared cache hai — key aksar sirf URL hoti hai. Do users ka same URL = same cache entry. Isliye per-user responses par Cache-Control: private ya no-store, ya cache key mein user ki pehchaan — aur dono ka test. Galti asli incidents mein kai baar hui hai.',
          choiceExplanations: [
            'CDN shared cache hai — key aksar sirf URL hoti hai. Do users ka same URL = same cache entry. Isliye per-user responses par Cache-Control: private ya no-store, ya cache key mein user ki pehchaan — aur dono ka test. Galti asli incidents mein kai baar hui hai.',
            'CDN apne aap private nahi maanta. Cache-Control: private ya no-store khud likhna padta hai.',
            'Cookie akele caching nahi rokti. Policy aur cache key saaf likhni padti hai.',
            'Purana data chhoti baat hai. Doosre user ka private data dikhna kahin bada khatra hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Boundaries',
    instructions: 'Ab interviewer tumhe uljhane ki koshish karega. 🎤',
    questions: [
      {
        q: '"Validation client, gateway, service aur DB — chaaron jagah hai. Kya chaar layers ki validation duplicate kaam hai?"',
        choices: [
          'Har layer alag khatra rokti hai: client UX, gateway kachra, service niyam, DB race',
          'Sirf client par validation rakho, server tak hamesha saaf data hi aayega',
          'Sirf gateway par saare niyam rakho, services halki aur saaf rahengi',
          'Sirf service mein check karo; DB ka UNIQUE constraint duplicate kaam hai',
        ],
        answer: 0,
        explain: 'Defence in depth hai, duplication nahi. Client wali hata do → form kharab lagega. DB wali hata do → data kharab ho jaayega. Alag layer, alag khatra, alag guarantee.',
        choiceExplanations: [
          'Defence in depth hai, duplication nahi. Client wali hata do → form kharab lagega. DB wali hata do → data kharab ho jaayega. Alag layer, alag khatra, alag guarantee.',
          'Client ko bypass kiya ja sakta hai (curl, purana app). Server par niyam phir bhi chahiye.',
          'Gateway har service ke business niyam aur DB ki race nahi jaanta.',
          'Service ka pre-check do saath aayi writes ko nahi rokta. UNIQUE constraint hi guarantee hai.',
        ],
      },
      {
        q: '"Tumhare paas 20 microservices hain. Auth kahan karoge?"',
        choices: [
          'Gateway token jaanche; har service caller ki pehchaan aur resource ki permission jaanche',
          'Gateway par token check ho gaya, toh andar ki har call ko bharosemand maan lo',
          'Har request par har service ek central auth-service ko call kare, tabhi pakka hai',
          'JWT valid hai toh user har resource tak pahunch sakta hai — token hi permission hai',
        ],
        answer: 0,
        explain: 'Token verify karna ek jagah (gateway) — warna 20 jagah library update. Par AuthZ gateway par le jaoge toh gateway ko har service ke domain niyam jaanne padenge — distributed monolith. Isliye resource-level niyam har service mein. Services ke beech dono taraf certificate se pehchaan jaanchna mutual TLS (mTLS) kehlata hai. Har service mein JWT dobara verify karna (defence in depth) bhi theek hai; har request par central auth RPC zaroori nahi.',
        choiceExplanations: [
          'Token verify karna ek jagah (gateway) — warna 20 jagah library update. Par AuthZ gateway par le jaoge toh gateway ko har service ke domain niyam jaanne padenge — distributed monolith. Isliye resource-level niyam har service mein. Services ke beech dono taraf certificate se pehchaan jaanchna mutual TLS (mTLS) kehlata hai. Har service mein JWT dobara verify karna (defence in depth) bhi theek hai; har request par central auth RPC zaroori nahi.',
          'Andar ka caller bhi pehchaan aur niyam se jaancha jaana chahiye. Warna ek ghusa hua service sab kuch kar lega.',
          'Har request par ek central service ko call karoge, toh central service girne par sab callers ruk sakte hain. Token local bhi verify ho sakta hai.',
          'Valid token pehchaan batata hai — kaunsa resource chhoo sakta hai, nahi.',
        ],
      },
      {
        q: '"Tumhari service downstream payment provider ki 1000 rps limit paar kar rahi hai. Kya karoge?"',
        choices: [
          'Bahar jaane wali calls par rate limit + seemit queue; queue bhari ho toh saaf mana karo',
          'Provider ka 429 milte hi turant dobara bhejo, jab tak call nikal na jaaye',
          'Ek bina hadd ki queue mein sab daal do — dheere-dheere sab chala hi jaayega',
          'Apne users ko 429 bhejo — "tumne bahut requests bheji", taaki users ruk jaayein',
        ],
        answer: 0,
        explain: 'Outbound flow control: provider ki hadd se neeche bhejo, queue ki hadd ho aur har kaam ki expiry dikhe. User ko batao ki payment "processing" hai; queue bhar jaaye toh saaf backpressure do. Aur retry loop sabse bura — provider ko aur maaroge. Yahin async design apne aap zaroori ban jaata hai.',
        choiceExplanations: [
          'Outbound flow control: provider ki hadd se neeche bhejo, queue ki hadd ho aur har kaam ki expiry dikhe. User ko batao ki payment "processing" hai; queue bhar jaaye toh saaf backpressure do. Aur retry loop sabse bura — provider ko aur maaroge. Yahin async design apne aap zaroori ban jaata hai.',
          'Turant retry provider ko aur maarega. Limit ke upar bhejna band karo, tez nahi.',
          'Bina hadd ki queue memory khaayegi, aur purane payment itni der se jaayenge ki bekaar ho jaayenge.',
          'Users ne hadd nahi todi — provider ki hadd hai. Galat sandesh mat do; "processing" ya saaf backpressure do.',
        ],
      },
    ],
  },
  success: [
    'Kisi bhi faisle ke liye sahi layer chun sakte ho',
    'Rate limit, quota aur backpressure mein farak bata sakte ho',
    '429 vs 503 sahi jagah use karte ho',
    'Jaante ho ki uniqueness ki guarantee sirf DB de sakta hai',
  ],
  homework: `Apne project ka <code>POST</code> endpoint dekho jo kuch banata hai (user, order, kuch bhi).
    Pata karo: uniqueness kahan enforce hoti hai — app code mein ya DB constraint mein?
    Agar check app code mein hai, toh race condition hai. Test karo:
    do requests theek ek saath bhejo aur dekho kya hota hai.`,
  cards: [
    { front: 'Boundary decide karne ka sawaal?', back: '<b>"Is faisle ke liye zaroori gyaan kiske paas hai?"</b> Public key gateway ke paas → AuthN gateway par. Order kiska hai — service ke paas → AuthZ service mein.' },
    { front: '429 vs 503?', back: '<b>429</b> = "tumne bahut maara" (client ki galti). <b>503</b> = "main bhara hoon" (meri halat). Overload par 429 bhejna client ko galat sandesh deta hai.' },
    { front: 'Rate limit vs Quota vs Backpressure?', back: 'Rate limit = burst rokna, <i>fairness</i>. Quota = total rokna, <i>business</i>. Backpressure = khud ko bachana, <i>capacity</i>.' },
    { front: 'Check-then-act kyun toota hua hai?', back: '"SELECT karke dekho, phir INSERT" — do concurrent requests dono pass ho jaayengi. Uniqueness sirf <b>DB unique constraint</b> guarantee kar sakta hai.' },
    { front: 'Validation 4 jagah — duplicate?', back: 'Nahi, <b>defence in depth</b>. Client → UX. Gateway → kachra. Service → business rules. DB → concurrency. Har ek alag khatre se bacha rahi hai.' },
  ],
},
/* =====================================================================
   L3 — Latency & Percentiles
   ===================================================================== */
{
  id: 'latency',
  icon: '⏱️',
  title: 'p50 Jhoot Bolta Hai — Tail Latency',
  badge: 'Tail Chaser',
  objectives: [
    'Average kyun <b>hamesha</b> gumraah karta hai',
    'p50 / p95 / p99 ka asli matlab — aur kaunsa dekhna hai',
    '<b>Tail amplification</b>: 5 calls, 1% tail → 5% slow requests',
    'Latency ke numbers jo har engineer ko pata hone chahiye',
  ],
  lesson: [
    `<h3>📖 100 requests, ek jhooth</h3>
     <pre>99 requests →    10 ms
 1 request  → 5,000 ms
────────────────────────
average     →    59 ms   😊 "sab theek hai"
p50         →    10 ms   😊
p99         → 5,000 ms   😡 ← asli kahani</pre>
     <p>Average ka kaam hi outliers ko <b>ghol dena</b> hai. Par user
     average anubhav nahi karta — user <b>apni</b> request anubhav karta hai.
     Aur agar tumhare 10 lakh requests roz hain, toh p99 ka matlab hai
     <b>10,000 log roz</b> 5 second ruk rahe hain.</p>
     <p>Percentile padhne ka sahi tareeka:</p>
     <table>
       <tr><th>Metric</th><th>Kya batata hai</th><th>Kab dekho</th></tr>
       <tr><td>p50</td><td>"normal din kaisa hai"</td><td>capacity planning</td></tr>
       <tr><td>p95</td><td>"thoda kharab din"</td><td>SLO ke liye aksar yahi</td></tr>
       <tr><td>p99</td><td>"sabse kharab 1%"</td><td>tail problems dhoondhne</td></tr>
       <tr><td>p99.9</td><td>"tumhare sabse bade users"</td><td>heavy users ka data zyada hota hai — heavy users ka p50 tumhara p99.9 hai</td></tr>
       <tr><td>max</td><td>"ek bar aisa hua tha"</td><td>alerting ke liye bekaar</td></tr>
     </table>
     <p class="tip">🎯 Ek gehri baat: <b>tumhare sabse bade customer ka
     har request tumhara p99 hai.</b> Sabse bade customer ke paas 10x data hai, isliye us customer ki
     har query tail mein baithti hai. p99 theek karna = apne sabse
     valuable users ko theek karna.</p>`,
    `<h3>🔬 Tail amplification — microservices ka chhupa tax</h3>
     <p>Maan lo har call defined threshold se 1% cases mein slow hai; calls ke slow events independent assume karo. p99 latency ka time value hai, percentage ka naam nahi.
     Ab ek page banao jo 5 services ko <b>parallel</b> call karta hai.
     Page tabhi tez hai jab <b>saari 5</b> tez hon:</p>
     <pre>P(sab tez)   = 0.99⁵ = 95.1%
P(koi ek slow) = 1 − 0.99⁵ =  4.9%   ← 1% se 4.9% ho gaya!

10 calls  → 1 − 0.99¹⁰ =  9.6%
100 calls → 1 − 0.99¹⁰⁰ = 63%   💀</pre>
     <p>Isiliye "chhote chhote microservices bana do" wali salah adhoori
     hai. Har extra call tumhare <b>p99 ko p50 ki taraf</b> kheenchti hai.</p>
     <p>Teen ilaaj:</p>
     <p><b>1. Kam calls.</b> 5 calls ko 2 banao — batch ya aggregate endpoint.</p>
     <p><b>2. Optional ko async karo.</b> Reviews aur recommendations page
     load ke <i>baad</i> load ho — recommendations ki latency user ke first paint mein
     ginni hi nahi chahiye.</p>
     <p><b>3. Hedged requests.</b> p95 par doosri copy bhej do, jo pehle
     aaye, wahi lo. Thoda extra load, bahut behtar tail.</p>`,
  ],
  stages: [
    {
      type: 'quiz',
      title: 'Percentiles padhna seekho',
      questions: [
        {
          q: "Dashboard: average 40 ms, p50 12 ms, p99 3200 ms. Sabse zaroori baat?",
          choices: [
            'Har 100 mein se 1 request ko 3 second se zyada lag raha hai — average ne tail chhupa li',
            'Sab theek hai — p50 sirf 12 ms hai, matlab lagbhag saare users tez chal rahe hain',
            'Average 40 ms achha hai, toh SLO pass maan lo — average hi asli tasveer dikhata hai',
            'Average aur p50 itne alag hain, matlab dashboard ka data hi kahin galat hai',
          ],
          answer: 0,
          explain: 'Average (40) p50 (12) se bahut zyada hai — farak khud batata hai ki tail bhaari hai. 10 lakh requests/din par p99 = 3.2 s ka matlab: roz 10,000 requests 3 second se zyada rukti hain. Wahi support ticket ya uninstall ban sakti hain.',
          choiceExplanations: [
            'Average (40) p50 (12) se bahut zyada hai — farak khud batata hai ki tail bhaari hai. 10 lakh requests/din par p99 = 3.2 s ka matlab: roz 10,000 requests 3 second se zyada rukti hain. Wahi support ticket ya uninstall ban sakti hain.',
            'p50 beech wali request hai. Sabse dheemi 1% p50 mein dikhti hi nahi.',
            'SLO aksar percentile par hota hai (jaise p99). Average tail ko barabar kar ke chhupa deta hai.',
            'Average aur p50 ka farak data galat hone ka nahi — bhaari tail ka nishaan hai.',
          ],
        },
        {
          q: '8 independent calls parallel chalti hain; har call 1% baar slow hoti hai. Page ki koi ek call slow hone ka chance?',
          choices: [
            'Lagbhag 7.7% — koi ek bhi call slow ho toh poora page slow (1 − 0.99⁸)',
            'Sirf 1% — parallel calls ek doosre ka intezaar nahi karti, toh tail nahi badhti',
            'Lagbhag 0.125% — 1% ko 8 calls mein baant do, toh har page ka hissa chhota',
            'Lagbhag 92% — 0.99 ko 8 baar guna karo, wahi slow hone ka chance hai',
          ],
          answer: 0,
          explain: 'Har call independent ho aur har call 1% baar slow ho: 1 − 0.99⁸ ≈ 0.077, lagbhag 7.7%. Parallel calls latency jodti nahi, par tail badhati hain — page ko sabka intezaar hai. Formula (1 − (1−p)ⁿ) interview mein bolna seniority dikhata hai. (Ginti "koi ek slow" ke chance ki hai, page ke exact p99 ki nahi.)',
          choiceExplanations: [
            'Har call independent ho aur har call 1% baar slow ho: 1 − 0.99⁸ ≈ 0.077, lagbhag 7.7%. Parallel calls latency jodti nahi, par tail badhati hain — page ko sabka intezaar hai. Formula (1 − (1−p)ⁿ) interview mein bolna seniority dikhata hai. (Ginti "koi ek slow" ke chance ki hai, page ke exact p99 ki nahi.)',
            'Page ko sabka intezaar karna padta hai. Koi ek bhi slow ho toh page slow — chance badhta hai.',
            'Parallel chalne se har call ka 1% chance bant-ta nahi. Har call apne aap 1% baar slow ho sakti hai.',
            '0.99⁸ ≈ 92% sab calls tez hone ka chance hai. Koi ek slow hone ka chance 1 − 0.92 ≈ 7.7% hai.',
          ],
        },
        {
          q: 'p99 theek karne ka sabse asardaar pehla kadam aksar kya hota hai?',
          choices: [
            'Slow requests ki trace dekho — tail ka sabse bada intezaar kis hop mein hai, wahi pakdo',
            'Saare servers ka CPU badha do — CPU badhte hi har request ki tail ghat jaati hai',
            'Har call par retry badha do — dobara koshish se slow requests jaldi nipat jaayengi',
            'Cache ka TTL badha do — zyada der cache rahega toh tail apne aap ghat jaayegi',
          ],
          answer: 0,
          explain: 'Pehle slow requests ki traces se dekho ki waqt kahan ja raha hai. Aksar tail ka sabse bada source kitni cheezon ka intezaar hota hai, na ki har cheez ki apni speed — tab fan-out ghatana (calls kam karo, optional calls async karo) sabse asardaar hai. Par har p99 incident ka ek hi ilaaj nahi; trace batayega.',
          choiceExplanations: [
            'Pehle slow requests ki traces se dekho ki waqt kahan ja raha hai. Aksar tail ka sabse bada source kitni cheezon ka intezaar hota hai, na ki har cheez ki apni speed — tab fan-out ghatana (calls kam karo, optional calls async karo) sabse asardaar hai. Par har p99 incident ka ek hi ilaaj nahi; trace batayega.',
            'CPU tabhi madad karega jab naapa hua tail CPU se aa raha ho. Pehle naapo.',
            'Retry slow dependency par aur kaam aur ek extra round trip jodta hai — tail aur badhti hai.',
            'TTL badhana purane data ka sauda hai. Pehle dekho tail kahan se aa rahi hai.',
          ],
        },
      ],
    },
    {
      type: 'match',
      title: 'Latency numbers yaad karo',
      instructions: 'Har operation ko operation ke order-of-magnitude se jodo.',
      pairs: [
        { left: 'CPU L1 cache reference', right: '~1 nanosecond', explain: 'Sabse tez cheez jo hoti hai. Baaki sab isi number se compare hota hai.' },
        { left: 'Main memory (RAM) read', right: '~100 nanoseconds', explain: 'RAM cache se ~100x dheema — par disk se ~1000x tez. Isiliye in-memory cache itna kaam karta hai.' },
        { left: 'SSD random read', right: '~100 microseconds (0.1 ms)', explain: 'RAM se ~1000x dheema. Yahi wajah hai ki buffer pool mein data hona itna matter karta hai.' },
        { left: 'Same datacenter round trip', right: '~0.5 milliseconds', explain: 'Ek network hop lagbhag muft lagta hai — par 100 hops nahi. Fan-out isi liye mehenga hai.' },
        { left: 'Simple indexed DB query', right: '~1–5 milliseconds', explain: 'Achhi query ka target. Query ko 5 ms se zyada lag raha hai toh EXPLAIN chalao.' },
        { left: 'India → US round trip', right: '~150 milliseconds', explain: 'Cross-continent RTT light ki speed ki limit hai — koi optimization is limit ko nahi todega. Isiliye CDN aur regional deployment.' },
      ],
    },
    {
      type: 'terminal',
      title: '📊 Tail ko pakdo',
      goal: 'Ek endpoint ka p99 SLO tod raha hai. Load daal ke dekho ki p50 aur p99 mein kitna farak hai, phir SLO ka error budget nikalo.',
      sys: SD.sys.orders({ db: { longTxHolding: 45 } }),
      tasks: T_TAIL,
      success: SD.allTasks(T_TAIL),
      successText: `Dekha? <b>p50 aur p99 dono badhe; p99 ne 200ms SLO toda.</b> Agar tum sirf
        average dekhte toh kabhi pata hi nahi chalta.
        <br><br>Aur error budget ne ek aur baat batayi: 99.9% ka matlab mahine mein sirf
        <b>43 minute</b> ki chhoot. Ek hi kharab deploy pura mahine ka budget kha sakta hai.`,
      solution: [
        "load --rps 400 --duration 8",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'load', r => r.rps === 400) && m.latest(s, 'slo')?.avail === 99.9; },
      hints: [
        'Pehle `load` chalao aur har second ka p50 aur p99 saath padho. Normal requests tez hon tab bhi tail users ka intezaar chhupa sakti hai.',
        '`load --rps 400 --duration <seconds>` mein p99 ko SLO se milao. Availability ka matlab allowed downtime hai: `slo --availability 99.9` se budget nikalo; p99 aur uptime alag vaade hain.',
        'Poora raasta — har command alag Enter se chalao:\nload --rps 400 --duration 8\nslo --availability 99.9',
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Latency',
    instructions: 'Numbers ke baare mein saaf bolna seniority ka signal hai. 🎤',
    questions: [
      {
        q: "\"Tumhara SLO p99 < 200 ms hai. Tum ek dependency add kar rahe ho jiska p99 180 ms hai. Kya problem hai?\"",
        choices: [
          'Budget lagbhag khatam — SLO se kam timeout rakho, aur socho ki call sync zaroori hai?',
          'Koi problem nahi — 180 ms 200 ms se kam hai, toh SLO apne aap safe hai, bas itna',
          'Do baar retry laga do — reliability badhegi aur latency ka budget bhi bacha rahega',
          'Dependency ka median dekh ke p99 tay kar lo — median theek ho toh tail bhi theek',
        ],
        answer: 0,
        explain: 'Dependency ka p99 lagbhag tumhara poora budget hai — tumhare apne kaam ke liye kuch nahi bacha. Aur retry ulta latency badhata hai. Sahi soch: timeout apne SLO se kam rakho, fallback socho, aur poochho ki call sync honi bhi chahiye ya nahi.',
        choiceExplanations: [
          'Dependency ka p99 lagbhag tumhara poora budget hai — tumhare apne kaam ke liye kuch nahi bacha. Aur retry ulta latency badhata hai. Sahi soch: timeout apne SLO se kam rakho, fallback socho, aur poochho ki call sync honi bhi chahiye ya nahi.',
          'Tumhare apne kaam, queue aur network ko bhi 200 ms mein jagah chahiye. 180 lagbhag poora budget hai.',
          'Retry bachi hui deadline mein aur samay aur bojh khaata hai; doosri koshish se pehle bacha budget dekho.',
          'Median se tail ka pata nahi chalta. p99 alag naapna padta hai.',
        ],
      },
      {
        q: '"Ek customer ke liye app bahut slow hai, par overall dashboards green hain. Kaise debug karoge?"',
        choices: [
          'Us customer ki alag percentile aur traces dekhunga — bade customer ka p50 aksar hamara p99',
          'Dashboard green hai, toh problem customer ke internet mein hogi — case band kar do',
          'Customer se browser badalne ko bolunga — aksar purana browser hi dheema hota hai',
          'Aur servers add kar dunga — zyada servers par har customer apne aap tez chalega',
        ],
        answer: 0,
        explain: 'Poore system ke metrics bade customers ko chhupa dete hain — bade customer ginti mein kam hain, par bade customers ki har request tail mein hai. Isliye per-tenant / per-endpoint percentiles rakho. "Dashboard green hai isliye problem nahi" — monitoring ka sabse mehenga jhooth hai.',
        choiceExplanations: [
          'Poore system ke metrics bade customers ko chhupa dete hain — bade customer ginti mein kam hain, par bade customers ki har request tail mein hai. Isliye per-tenant / per-endpoint percentiles rakho. "Dashboard green hai isliye problem nahi" — monitoring ka sabse mehenga jhooth hai.',
          'Poore system ka jod ek customer ki dheemi queries chhupa sakta hai. Green dashboard us customer ka saboot nahi.',
          'Client ki taraf ka saboot kaam ka hai, par bina naape browser ko dosh dena andaaza hai.',
          'Zyada servers us customer ke bade data ya query ki shape ko theek nahi karte.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki average kyun gumraah karta hai',
    'p50 / p95 / p99 sahi context mein use karte ho',
    'Tail amplification ka formula <code>1 − (1−p)ⁿ</code> apply kar sakte ho',
    'Latency ke order-of-magnitude numbers yaad hain',
  ],
  homework: `Apne sabse zyada chalne wale endpoint ka p50 aur p99 nikalo.
    Ratio dekho: agar p99/p50 &gt; 10 hai, toh kahin queueing ho rahi hai (pool, thread, lock).
    Phir poochho: endpoint <b>kitni downstream calls</b> karta hai? Kya sabhi zaroori hain?`,
  cards: [
    { front: 'Average kyun jhooth bolta hai?', back: '99 requests 10ms + 1 request 5000ms = average 59ms 😊 par p99 = 5000ms 😡. Average ka kaam hi outliers ko <b>ghol dena</b> hai — user apni request anubhav karta hai, average nahi.' },
    { front: 'Tail amplification formula?', back: "<code>P(any slow) = 1 − (1−p)ⁿ</code> independent equal-p events ke liye. n=5, p=1% → 4.9%; n=100 → 63%. Exact page p99 correlation, deadlines aur wait-for-all behavior par depend hai." },
    { front: 'p99 theek karne ka pehla kadam?', back: 'Aksar <b>fan-out kam karo</b> — calls ghatao ya optional calls ko async karo. Har service ko 2x tez karne se zyada asar hota hai.' },
    { front: 'Bade customers aur p99?', back: 'Bade customers ke paas 10x data hai, isliye bade customers ki har query tail mein baithti hai. <b>Bade customers ka p50 tumhara p99 hai.</b> Per-tenant percentiles rakho.' },
    { front: 'Latency numbers?', back: 'L1 1ns · RAM 100ns · SSD 0.1ms · same-DC RTT 0.5ms · indexed query 1-5ms · India→US 150ms. Yaad rakhne ki cheez: <b>RAM disk se ~1000x tez hai</b>.' },
  ],
},

/* =====================================================================
   L4 — Back-of-the-envelope estimation
   ===================================================================== */
{
  id: 'estimation',
  icon: '📐',
  title: 'Back-of-the-Envelope — Andaza Nahi, Hisaab',
  badge: 'Number Cruncher',
  objectives: [
    'DAU se rps nikalna — aur <b>peak</b> ke liye design karna',
    'Storage aur bandwidth ka hisaab (replication ke saath)',
    "<b>Little's Law</b>: L = λ × W — concurrency ka formula",
    'Ye numbers interview mein bol ke dikhana',
  ],
  lesson: [
    `<h3>📖 Teen numbers, poora system</h3>
     <p>System design interview mein "scale kar lenge" bolna sabse kamzor
     jawab hai. Do line ka hisaab "scale kar lenge" se bahut aage le jaata hai.
     Sirf teen cheezein yaad rakho:</p>
     <pre>1 din      = 86,400 seconds   (≈ 10⁵ maan lo, math aasan)
1 M/din    ≈ 12 rps
peak       = average × 2–5     (flash sale? × 50)</pre>
     <p>Ab kuch bhi nikal sakte ho:</p>
     <pre>12 lakh users/din, har ek 2 requests
  = 24 lakh req/din
  = 24,00,000 / 86,400 ≈ 28 rps average
  = 28 × 3 ≈ 84 rps peak      ← PEAK ke liye design karo

Har record 2 KB:
  28 × 2 KB × 86,400  = 4.8 GB/din
  × 365               = 1.8 TB/saal
  × 3 (replication)   = 5.3 TB  ← ye number budget meeting mein chahiye</pre>`,
    `<h3>🔬 Little's Law — poore Resilience track ki neev</h3>
     <p>Ek hi formula, aur formula sab kuch bata deta hai:</p>
     <pre>L = λ × W
concurrency = arrival rate × service time</pre>
     <p>500 requests/sec aa rahi hain, har ek 20 ms leti hai:</p>
     <pre>L = 500 × 0.020 = 10 requests ek saath andar</pre>
     <p>Matlab tumhe <b>10 connections</b> chahiye, 500 nahi. Little's Law sabse
     bada gurumantra hai pool sizing ke liye — log aksar rps jitna pool
     bana dete hain, jo bilkul galat hai.</p>
     <p>Ulta karke padho toh aur bhi kaam ka hai:</p>
     <pre>capacity = pool_size × (1000 / service_ms)

pool 50, query 20 ms → 50 × 50  = 2,500 rps  ✅
pool 50, query 200 ms → 50 × 5  =   250 rps  ⚠️
pool 50, query 8 s    → 50 × 0.125 =  6 rps  💀</pre>
     <p class="tip">🎯 Dekho kya hua: <b>query 10x dheemi hui toh capacity
     10x gir gayi.</b> Isiliye ek slow query poore system ko gira sakti hai,
     chahe CPU 10% ho. Yahi pul "deep pagination" ko "3AM outage"
     se jodta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '📐 Naye feature ka hisaab lagao',
      goal: 'Product ne kaha: "12 lakh users, har ek roz 2 transactions". Tumhe capacity plan dena hai. Estimate nikalo, peak nikalo, aur error budget dekho.',
      sys: SD.sys.txn(),
      tasks: T_ESTIMATE,
      success: SD.allTasks(T_ESTIMATE),
      successText: "Average 28 rps, peak (3 guna) 84 rps, aur 365 din ka replicated storage 4.9 TB. 99.9% availability par 30 din mein 43.2 minute ki chhoot hai. Simulator storage 1024 wali units mein dikhata hai.",
      solution: [
        "estimate --users 1200000 --rps 28 --bytes 2048",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'estimate')?.users === 1200000 && m.latest(s, 'estimate')?.rps === 28 && m.latest(s, 'slo')?.avail === 99.9; },
      hints: [
        'Pehle roz ki transactions gino: users guna har user ki daily requests. Daily total ko seconds mein baantne par average rps milega; peak alag chahiye.',
        '`estimate --users 1200000 --rps <average> --bytes 2048` chalao. Average users ki ginti nahi, requests/sec hai; output mein peak aur replication ka kharch dekho. Phir `slo --availability 99.9`.',
        'Poora raasta — har command alag Enter se chalao:\nestimate --users 1200000 --rps 28 --bytes 2048\nslo --availability 99.9',
      ],
    },
    {
      type: 'fill',
      title: "Little's Law lagao",
      instructions: 'Capacity ka hisaab poora karo.',
      template: `Pool size            = 50 connections
Query service time   = {0} ms
────────────────────────────────────────
Ek connection kitni req/sec kar sakta hai?
  1000 / 20            = {1} req/sec
Poore pool ki capacity?
  50 × 50              = {2} rps

Ab query 8 second ki ho gayi (deep pagination):
  50 × (1000 / 8000)   = {3} rps   💀`,
      tokens: ['20', '50', '2500', '6', '500', '1000', '160', '0.125'],
      blanks: [
        { answer: '20', explain: 'Ek achhi indexed query ka normal time. Yahi hamara baseline hai.' },
        { answer: '50', explain: '1000 ms / 20 ms = 50. Ek connection ek second mein 50 requests nipta sakta hai.' },
        { answer: '2500', explain: '50 connections × 50 req/sec = <b>2,500 rps</b>. Itni capacity mein zyadatar apps aaram se chalti hain.' },
        { answer: '6', explain: '50 × 0.125 = <b>6 rps</b>. Query 400x dheemi hui toh capacity 400x gir gayi. 6 rps par koi bhi real traffic system ko gira dega — aur CPU tab bhi 10% hi dikhega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Hisaab pakka karo',
      questions: [
        {
          q: "Steady 500 rps; har request DB connection 20 ms hold karti hai. Average busy connections?",
          choices: [
            'Ausat lagbhag 10 — 500 × 0.020; kisi pal ginti kam ya zyada ho sakti hai',
            '500 — har request ko apna alag connection chahiye, toh rps jitne connections',
            '50 — default pool size 50 hota hai, toh average bhi utna hi rahega',
            '1 — 20 ms bahut kam hai, toh ek connection baari-baari sab sambhal lega',
          ],
          answer: 0,
          explain: 'Steady 500 requests/s, har request 20 ms connection rakhti hai: Little\'s Law se average busy connections = 500 × 0.020 = 10. Log aksar rps jitna pool bana dete hain — jo DB ko hi maar deta hai, kyunki har connection DB par ek process/thread hai. (10 sirf average hai; burst, tail aur headroom ke liye pool alag se parkho.)',
          choiceExplanations: [
            'Steady 500 requests/s, har request 20 ms connection rakhti hai: Little\'s Law se average busy connections = 500 × 0.020 = 10. Log aksar rps jitna pool bana dete hain — jo DB ko hi maar deta hai, kyunki har connection DB par ek process/thread hai. (10 sirf average hai; burst, tail aur headroom ke liye pool alag se parkho.)',
            'rps aane ki raftaar hai. 20 ms hold time par ausat 10 connections busy; har pal theek 10 hona zaroori nahi.',
            'Pool size setting hai, naap nahi. Average busy connections bojh se nikalte hain: 500 × 0.020 = 10.',
            'Ek connection ek second mein sirf 50 requests (1000 ÷ 20) sambhal sakta hai. 500 rps ke liye ~10 chahiye.',
          ],
        },
        {
          q: 'Peak traffic ka andaza kaise lagate ho?',
          choices: [
            'Traffic ki history dekho — aam din average × 2–5; sale ya result day ka alag hisaab',
            'Hamesha average × 2 — har app ka peak average ka dugna hi hota hai, bas itna',
            'Peak = average — users din bhar barabar aate hain, toh traffic barabar bant-ta hai',
            'Load test mein system jahan tak chala, wahi peak maan lo — maang alag se mat gino',
          ],
          answer: 0,
          explain: 'Consumer apps mein traffic din bhar bahut unequal hota hai — shaam ka peak average se 3–4 guna ho sakta hai. Par pehle se pata events alag category hain: board results, IPL ticket sale, flash sale. Aise events par "average × 3" bilkul bekaar hai.',
          choiceExplanations: [
            'Consumer apps mein traffic din bhar bahut unequal hota hai — shaam ka peak average se 3–4 guna ho sakta hai. Par pehle se pata events alag category hain: board results, IPL ticket sale, flash sale. Aise events par "average × 3" bilkul bekaar hai.',
            'Har app ka peak alag hai; board result ya flash sale par 50 guna bhi ho sakta hai.',
            'Traffic din bhar barabar nahi hota — shaam ka peak average se 3–4 guna ho sakta hai.',
            'Load test system ki hadd batata hai, users ki maang nahi. Maang history aur events se aati hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Estimation',
    instructions: 'Yahan interviewer dekhta hai ki tum hisaab lagate ho ya andaza. 🎤',
    questions: [
      {
        q: '10 lakh users, har user roz 5 photo (2 MB har ek), poore saal. Replication ke bina logical storage kitna?',
        choices: [
          '10 lakh × 5 × 2 MB = 10 TB/din → saal mein lagbhag 3.65 PB',
          'Lagbhag 10 TB — 10 lakh × 5 × 2 MB, saal bhar mein bas itna',
          'Lagbhag 100 TB — roz 10 TB, par photos das guna compress hoti hain',
          'Lagbhag 11 PB — roz 10 TB × 365 × 3 copies, yahi logical storage',
        ],
        answer: 0,
        explain: 'Decimal units: 10⁶ × 5 × 2 MB = 10 TB/din; × 365 ≈ 3.65 PB logical. Teen copies ke saath lagbhag 11 PB physical, upar se metadata. Asli seekh: itna data DB mein daalne ki baat hi galat hai — kaam object storage (S3) ka hai; DB mein sirf metadata + URL.',
        choiceExplanations: [
          'Decimal units: 10⁶ × 5 × 2 MB = 10 TB/din; × 365 ≈ 3.65 PB logical. Teen copies ke saath lagbhag 11 PB physical, upar se metadata. Asli seekh: itna data DB mein daalne ki baat hi galat hai — kaam object storage (S3) ka hai; DB mein sirf metadata + URL.',
          '10 TB ek din ka hai. Saal bhar: 10 TB × 365 ≈ 3.65 PB.',
          'Sawaal mein compression ki baat nahi. Photos (JPEG) pehle se compressed hoti hain — das guna aur nahi ghat-ti.',
          '11 PB teen copies ke saath physical storage hai. Replication ke bina logical 3.65 PB.',
        ],
      },
      {
        q: '"Pool mein 50 connections hain. Har request ek connection ko poore 8 second pakadti hai, aur koi aur bottleneck nahi. Zyada se zyada kitni requests/second poori hongi?"',
        choices: [
          'Lagbhag 6.25 rps — 50 connections ko 8 second se bhaag do; chhat itni hi',
          '50 rps — pool mein 50 connections hain, toh har second 50 requests nikal jaayengi',
          '400 rps — 50 connections × 8 second, toh har second 400 requests sambhal lega',
          'CPU par depend karta hai — CPU khaali ho toh rps kitna bhi ho sakta hai',
        ],
        answer: 0,
        explain: 'Har connection 8 second mein ek request poori karta hai. 50 ÷ 8 = 6.25 rps — sabse achhe haal ki chhat; asal mein aur kam ho sakta hai. 6 rps par koi bhi asli traffic line bana dega. (Ek query ka slow hona akela har request ka hold time nahi batata — trace se hold time naapo.)',
        choiceExplanations: [
          'Har connection 8 second mein ek request poori karta hai. 50 ÷ 8 = 6.25 rps — sabse achhe haal ki chhat; asal mein aur kam ho sakta hai. 6 rps par koi bhi asli traffic line bana dega. (Ek query ka slow hona akela har request ka hold time nahi batata — trace se hold time naapo.)',
          'Har connection ek request ko 8 second pakadta hai. 50 connections ek second mein sirf 50 ÷ 8 ≈ 6 requests poori karte hain.',
          '8 se guna nahi, bhaag karna hai: 50 ÷ 8 ≈ 6.25 rps.',
          'CPU 10% ho tab bhi har request 8 second connection pakadti hai. Chhat pool aur hold time tay karte hain.',
        ],
      },
    ],
  },
  success: [
    'DAU se average aur peak rps nikal sakte ho',
    'Storage + bandwidth ka hisaab replication ke saath kar sakte ho',
    "Little's Law se pool/thread size decide kar sakte ho",
    'Bata sakte ho ki slow query capacity ko kaise girati hai',
  ],
  homework: `Apne sabse busy endpoint ke liye hisaab lagao: <code>capacity = pool_size × (1000 / p50_ms)</code>.
    Ab apne peak rps se compare karo. Agar peak capacity ke 50% se upar hai, toh tum
    ek slow-query incident se sirf ek deploy door ho.`,
  cards: [
    { front: 'Estimation ke 3 numbers?', back: '<b>1 din = 86,400 s</b> (≈10⁵) · <b>1M/din ≈ 12 rps</b> · <b>peak = average × 2-5</b> (predictable event ho toh 50x).' },
    { front: "Little's Law?", back: '<code>L = λ × W</code> — concurrency = arrival rate × service time. 500 rps × 20ms = <b>10 concurrent</b>, matlab 10 connections chahiye, 500 nahi.' },
    { front: 'Capacity ka formula?', back: '<code>capacity = pool_size × (1000 / service_ms)</code>. Pool 50 + query 20ms = 2500 rps. Wahi pool + query 8s = <b>6 rps</b>.' },
    { front: 'Storage kaise nikalte ho?', back: '<code>rps × bytes × 86400</code> = per din. × 365 = per saal. <b>× 3 replication</b> — aakhri step log bhool jaate hain aur budget teen guna galat ho jaata hai.' },
  ],
},

/* =====================================================================
   L5 — Sync vs Async
   ===================================================================== */
{
  id: 'syncasync',
  icon: '🔀',
  title: 'Sync vs Async — Kab Rukna, Kab "Baad Mein"',
  badge: 'Queue Master',
  objectives: [
    'Sync mein SIRF kya hona chahiye — do sawaal ka test',
    '<code>202 Accepted</code> aur job ka status endpoint',
    'Async se latency theek hoti hai par <b>consistency ka problem</b> milta hai',
    'Queue spike ko smooth karta hai — par unbounded queue ek jaal hai',
  ],
  lesson: [
    `<h3>📖 Ek order place karne mein 3.2 second</h3>
     <pre>POST /orders
  → order DB mein likho          20 ms
  → payment charge karo         400 ms
  → confirmation email          800 ms
  → warehouse ko batao          300 ms
  → analytics event             200 ms
  → invoice PDF banao         1,500 ms
  ─────────────────────────────────────
  201 Created                 3,220 ms  🐌</pre>
     <p>Do problem hain, aur doosri pehli se badi hai:</p>
     <p><b>1.</b> User 3.2 second ruka.</p>
     <p><b>2.</b> Agar email service down hai toh <b>order hi fail ho
     gaya</b> — jabki order ban chuka tha aur paisa kat chuka tha. Ab
     tumhare paas ek aisa order hai jo DB mein hai par user ko error mila.</p>
     <p><b>Test — sync mein sirf aisi cheez rakho jo:</b></p>
     <p>(a) user ke jawab ke liye <b>zaroori</b> ho, YA<br>
        (b) fail hone par <b>poora kaam radd</b> karna pade.</p>
     <pre>SYNC:  order likho + payment    → 420 ms → 201 Created ✅
ASYNC: email · warehouse · analytics · PDF → queue mein</pre>
     <p>User 420 ms mein free. Email service down? Message queue mein pada
     rahega. <b>Order tab bhi safal hai</b> — aur yahi sahi hai.</p>`,
    `<h3>🔬 202 Accepted — imaandaar status code</h3>
     <p>Jab kaam async ho gaya, toh <code>200 OK</code> bhejna jhooth hai —
     kuch hua hi nahi abhi tak. Sahi jawab:</p>
     <pre>POST /reports
202 Accepted
Location: /reports/rep_8821

GET /reports/rep_8821
{ "status": "processing", "progress": 40 }   → phir "done" + result URL</pre>
     <p>202 jaisa chhota sa status code poore async design ko client ke saamne
     <b>imaandaar</b> bana deta hai. Client ko pata hai ki poll karna hai.</p>
     <h3>⚠️ Async free nahi hai</h3>
     <p>Async ne latency ka problem hataya aur <b>chaar naye problem</b>
     de diye:</p>
     <table>
       <tr><th>Problem</th><th>Ilaaj</th></tr>
       <tr><td>Message do baar deliver hua</td><td>idempotent consumer (dedupe key)</td></tr>
       <tr><td>Message hamesha fail ho raha hai</td><td>retry + <b>DLQ</b> (warna poori queue ruk jaayegi)</td></tr>
       <tr><td>User ko nahi pata kaam hua ya nahi</td><td>status endpoint / webhook / notification</td></tr>
       <tr><td>Queue bharti ja rahi hai</td><td>bounded queue + backpressure — unbounded queue matlab "problem baad mein, aur bada"</td></tr>
     </table>
     <p class="tip">🎯 <b>Async ek trade hai, jeet nahi.</b> Tumne latency
     ka problem <b>consistency</b> ke problem se badal liya. Ye sauda aksar
     achha sauda hai — par jaante hue karo.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Sync ya Async?',
      instructions: 'Order placement ke har kaam ko sahi jagah daalo.',
      bins: [
        { id: 'sync', label: '⚡ SYNC — request ke andar' },
        { id: 'async', label: '📮 ASYNC — queue mein' },
      ],
      items: [
        { text: 'Order DB mein likhna', bin: 'sync', explain: 'User ko order ID chahiye jawab mein. Aur payment fail ho toh poora kaam radd — dono shartein poori.' },
        { text: 'Payment authorize karna', bin: 'sync', explain: 'Card decline ho toh user ko TURANT pata chalna chahiye. Baad mein "aapka payment fail ho gaya" bhejna bura anubhav hai.' },
        { text: 'Stock available hai ya nahi check karna', bin: 'sync', explain: 'Order lene ka matlab hi tab hai jab cheez hai. Baad mein cancel karna sabse mehenga customer experience hai.' },
        { text: 'Confirmation email bhejna', bin: 'async', explain: 'User ne order screen par confirmation dekh liya. Email 2 second baad aaye ya 20 — koi farak nahi. Aur email service down hone se order fail nahi hona chahiye.' },
        { text: 'Warehouse ko notify karna', bin: 'async', explain: 'Shipping ghante mein hoti hai, millisecond mein nahi. Queue + retry se email bhejna zyada reliable bhi ho jaata hai.' },
        { text: 'Analytics event bhejna', bin: 'async', explain: 'Kabhi bhi analytics ko user request block nahi karni chahiye. Analytics ko async karna sabse aasan faisla hai.' },
        { text: 'Invoice PDF banana', bin: 'async', explain: '1.5 second ka CPU kaam. User ko turant nahi chahiye — email mein link bhej do ya "download ready" dikhao.' },
        { text: 'Loyalty points update karna', bin: 'async', explain: 'Eventually consistent bilkul theek hai. Par UI mein "points jald hi update honge" dikhana zaroori hai — warna user ko lagega bug hai.' },
      ],
    },
    {
      type: 'order',
      title: 'Async endpoint ka sahi flow',
      instructions: 'Ek lambi report generate karne ka API flow sahi kram mein.',
      steps: [
        { text: 'POST /reports — request validate karo', explain: 'Validation SYNC hai — galat request ko queue mein daalna bekaar hai, aur user ko turant pata chalna chahiye.' },
        { text: 'Job row banao (status: queued) aur ek ID do', explain: 'Pehle DB mein likho, phir queue mein daalo. Ulta karoge toh worker aise job par kaam kar sakta hai jo DB mein hai hi nahi.' },
        { text: 'Queue mein message daalo', explain: 'Ab worker message uthayega. (Aage <b>outbox pattern</b> milega — jo isi do-step ko atomic banata hai.)' },
        { text: '202 Accepted + Location: /reports/:id lautao', explain: '200 nahi — <b>202</b>. Kaam hua nahi hai, sirf maan liya gaya hai. Location header client ko batata hai ki status kahan dekhna hai.' },
        { text: 'Worker job uthaye, status: processing karo', explain: 'Ab client poll karega toh use pata chalega ki kaam chal raha hai — "kuch nahi ho raha" wala confusion khatm.' },
        { text: 'Kaam khatam — status: done + result URL', explain: 'Client ko poll se ya webhook se pata chal jaata hai. Result ko alag URL par rakhna behtar hai — result cacheable ho jaata hai.' },
        { text: 'Fail hua toh retry, phir DLQ', explain: 'Bina DLQ ke ek kharab message infinite retry mein ja sakta hai aur poori queue rok sakta hai. DLQ = "is message ko alag rakh do, insaan dekhega".' },
      ],
    },
    {
      type: 'quiz',
      title: 'Async ki samajh',
      questions: [
        {
          q: 'POST /reports ne report banane ka kaam maan liya, par report abhi bani nahi. Kaunsa response pending kaam aur status ka raasta saaf batayega?',
          choices: [
            '202 Accepted + Location header, jahan job ka status dekha ja sake',
            '200 OK — request mil gayi, toh kaam ho gaya maan ke 200 bhej do',
            '201 Created — queue mein job ban gayi, toh resource create ho gaya',
            '204 No Content — jawab mein kuch nahi bhejna, status ki zaroorat nahi',
          ],
          answer: 0,
          explain: '202 Accepted batata hai: "kaam le liya, abhi poora nahi hua". Response mein status ka URL do — Location header ek tareeka hai. Agar maanga hua resource ban chuka ho, toh 201 bhi sahi ho sakta hai; aur status endpoint ka 200 pending haal dikha sakta hai.',
          choiceExplanations: [
            '202 Accepted batata hai: "kaam le liya, abhi poora nahi hua". Response mein status ka URL do — Location header ek tareeka hai. Agar maanga hua resource ban chuka ho, toh 201 bhi sahi ho sakta hai; aur status endpoint ka 200 pending haal dikha sakta hai.',
            'Report poori hone wala 200 yahan galat vaada hoga. (Pending haal batane wala 200 har API mein galat nahi.)',
            'Maangi hui report abhi bani nahi. Sirf queue entry banne se report creation poora nahi hota.',
            '204 pending kaam ya progress ka raasta nahi batata; yahan 202 aur status URL behtar hain.',
          ],
        },
        {
          q: 'Order flow mein email bhejna sync tha aur email service down ho gayi. Kya hoga?',
          choices: [
            'Order fail dikh sakta hai — jabki order ban chuka, paisa kat chuka ho sakta hai',
            'Email fail hote hi order aur payment, dono apne aap wapas rollback ho jaayenge',
            'Payment apne aap refund ho jaayega, kyunki order poora hua hi nahi tha',
            'Kuch nahi — email optional hai, toh system email ka intezaar khud chhod dega',
          ],
          answer: 0,
          explain: 'Email ka fail hona order ko fail dikha sakta hai, jabki order aur payment pehle ho chuke hon. Agar order aur email ki safalta ek doosre se independent hon aur dono zaroori hon: 0.999 × 0.99 ≈ 98.9%. Saajhi failures hon toh seedha guna sahi nahi baithta. Optional email ko alag (async) bhejo, toh order email ke jawab ka intezaar nahi karega.',
          choiceExplanations: [
            'Email ka fail hona order ko fail dikha sakta hai, jabki order aur payment pehle ho chuke hon. Agar order aur email ki safalta ek doosre se independent hon aur dono zaroori hon: 0.999 × 0.99 ≈ 98.9%. Saajhi failures hon toh seedha guna sahi nahi baithta. Optional email ko alag (async) bhejo, toh order email ke jawab ka intezaar nahi karega.',
            'Order aur payment pehle hi ho chuke; email fail hone se wapas nahi hote. Grahak ko error dikhega, par effect reh jaayega.',
            'Refund kisi ne likha hi nahi. Paisa kat chuka, aur grahak ko error dikhega.',
            'Code mein email sync hai — optional hona sirf business ki soch hai. Code email ka jawab aane tak rukega.',
          ],
        },
        {
          q: 'Unbounded queue rakhne mein kya problem hai?',
          choices: [
            'Problem hat-ti nahi, aage badhti hai — memory bharegi, intezaar ghanton tak, data bekaar',
            'Koi problem nahi — queue ka kaam hi buffer karna hai, jitna bada utna achha',
            'Queue bhari hone par consumers apne aap badh jaayenge, toh backlog nahi rahega',
            'Queue purane kaam apne aap cancel kar degi, toh line kabhi lambi nahi hogi',
          ],
          answer: 0,
          explain: 'Bina hadd ki queue = "failure baad mein, aur bada". Producer consumer se tez hai toh queue kabhi khaali nahi hogi. 4 ghante purana notification bhejne ka koi matlab nahi. Hadd wali queue + backpressure batati hai ki problem abhi hai — jab problem chhoti hai.',
          choiceExplanations: [
            'Bina hadd ki queue = "failure baad mein, aur bada". Producer consumer se tez hai toh queue kabhi khaali nahi hogi. 4 ghante purana notification bhejne ka koi matlab nahi. Hadd wali queue + backpressure batati hai ki problem abhi hai — jab problem chhoti hai.',
            'Buffer thodi der ka uchhaal sambhalta hai. Producer lagataar tez ho toh line kabhi khaali nahi hogi.',
            'Queue consumers nahi badhati. Consumers badhana alag kaam hai — aur hadd tak hi.',
            'Bina hadd ki queue kuch cancel nahi karti — purane kaam bas line mein pade rehte hain.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Sync vs Async',
    instructions: 'Ye sawaal lagbhag har design interview mein aata hai. 🎤',
    questions: [
      {
        q: '"Kaise decide karoge ki koi kaam sync ho ya async?"',
        choices: [
          'Do sawaal: user ke jawab ke liye zaroori? fail par poora kaam radd? Dono nahi → async',
          'Jo kaam dheema ho, async kar do — dheemapan hi async ka asli test hai',
          'Jo kaam bahar ki service call kare, async kar do — bahar ki call kamzor hoti hai',
          'Sab kuch async kar do — async hamesha zyada tez aur zyada mazboot hota hai',
        ],
        answer: 0,
        explain: 'Faisla user ke contract se karo. Paid confirmation turant deni ho toh payment ka nateeja chahiye (sync). Pending order manzoor ho toh payment async bhi ho sakta hai — status aur failure handling ke saath. Aur "sab async" bhi galat hai: har async kaam naya failure mode, retry ki kahani aur status UI maangta hai. (Sync call akeli order aur remote payment ko atomic nahi banati.)',
        choiceExplanations: [
          'Faisla user ke contract se karo. Paid confirmation turant deni ho toh payment ka nateeja chahiye (sync). Pending order manzoor ho toh payment async bhi ho sakta hai — status aur failure handling ke saath. Aur "sab async" bhi galat hai: har async kaam naya failure mode, retry ki kahani aur status UI maangta hai. (Sync call akeli order aur remote payment ko atomic nahi banati.)',
          'Dheemapan akela faisla nahi karta. Zaroori nateeja kab chahiye, aur pending haal manzoor hai ya nahi — pehle tay karo.',
          'Bahar ki call bhi sync ya async ho sakti hai. User ko abhi kaunsa nateeja dena hai, contract se tay karo.',
          'Har async kaam naya failure mode, retry ki kahani aur status UI maangta hai.',
        ],
      },
      {
        q: '"Async karne se tumhe kya naya problem mila?"',
        choices: [
          'Consistency — duplicate delivery, pakki failures, status dikhana aur queue ka badhna',
          'Kuch nahi — async sirf fayda deta hai, queue duplicate bhi khud hata deti hai',
          'Queue tak pahunch gaya toh kaam poora maan lo — HTTP 200 hi pakki khabar hai',
          'Consumer fail ho toh producer ka kaam apne aap rollback ho jaata hai, bas itna',
        ],
        answer: 0,
        explain: 'Async ek sauda hai: latency ki problem gayi, consistency ki problem aayi. Ab chahiye idempotent consumers, DLQ, status endpoint, aur hadd wali queue. Jo candidate sirf fayde ginata hai, us candidate ne production mein async nahi chalaya.',
        choiceExplanations: [
          'Async ek sauda hai: latency ki problem gayi, consistency ki problem aayi. Ab chahiye idempotent consumers, DLQ, status endpoint, aur hadd wali queue. Jo candidate sirf fayde ginata hai, us candidate ne production mein async nahi chalaya.',
          'Queue ek message do baar bhi de sakti hai. Consumers idempotent banane padte hain.',
          'Queue mein jaana kaam ka hona nahi. Kaam baad mein fail ho sakta hai — status ka raasta chahiye.',
          'Producer ka kaam pehle hi ho chuka; consumer ki galti se wapas nahi hota. DLQ aur retry sochne padte hain.',
        ],
      },
    ],
  },
  success: [
    'Do sawaal ke test se sync/async decide kar sakte ho',
    '202 Accepted + status endpoint ka pattern jaante ho',
    'Async ke chaaron naye problem aur har problem ka ilaaj bata sakte ho',
    'Samjha sakte ho ki har sync dependency availability ko guna karti hai',
  ],
  homework: `Apne sabse dheeme <code>POST</code> endpoint ko dekho. Har kaam ke saamne do sawaal
    likho — "user ke jawab ke liye zaroori?" aur "fail ho toh sab radd?".
    Jin kaamon par dono jawab "nahi" hain, un kaamon ko queue mein daal ke dekho latency kitni girti hai.`,
  cards: [
    { front: 'Sync mein kya rakhein?', back: 'Sirf wahi kaam jo (a) user ke jawab ke liye <b>zaroori</b> ho, YA (b) fail hone par <b>poora kaam radd</b> karna pade. Baaki sab async.' },
    { front: 'Async ka status code?', back: '<b>202 Accepted</b> + <code>Location</code> header. 200 jhooth hai (kaam hua nahi). Client us URL par status poll karta hai.' },
    { front: 'Async se kya naya problem milta hai?', back: '<b>Consistency.</b> Duplicate delivery → idempotent consumer. Permanent failure → DLQ. "Hua ya nahi?" → status endpoint. Queue growth → bounded + backpressure.' },
    { front: 'Sync dependency aur availability?', back: 'Availability <b>guna</b> hoti hai. Order 99.9% × email 99% = 98.9%. Har sync call tumhari availability ko neeche kheenchti hai.' },
    { front: 'Unbounded queue kyun bura?', back: '"Failure baad mein, aur bada." Producer tez hai toh queue kabhi khaali nahi hogi — 4 ghante purana notification bekaar hai. Bounded queue problem <b>abhi</b> dikhati hai.' },
  ],
},

/* =====================================================================
   L6 — Fan-out / Fan-in
   ===================================================================== */
{
  id: 'fanout',
  icon: '🌿',
  title: 'Fan-out / Fan-in — Parallel ka Tax',
  badge: 'Fan Wrangler',
  objectives: [
    'Serial vs parallel fan-out — aur dono ka asli cost',
    'Fan-out se tail kyun badhta hai (aur teen ilaaj)',
    'Fan-in: 1000 workers ek row par — lock contention',
    'Har fan-out call par timeout kyun laazmi hai',
  ],
  lesson: [
    `<h3>📖 Product page — 5 services</h3>
     <pre>Illustrative single request latencies (aggregate percentiles nahi):
GET /product/42
  catalog      40 ms
  pricing      60 ms
  inventory    90 ms
  reviews     120 ms
  recommend   200 ms

serial   → 40+60+90+120+200 = 510 ms  🐌
parallel → max(...)         = 200 ms  ⚡</pre>
     <p>Parallel clearly behtar hai. Par ab tail dekho — page tabhi tez hai
     jab <b>saari 5</b> tez hon:</p>
     <pre>P(koi ek slow) = 1 − 0.99⁵ = 4.9%</pre>
     <p>Independent slow events aur wait-for-all assumptions mein any-slow chance <b>4.9%</b> hai. Correlated failures mein product formula valid nahi; end-to-end p99 ko individual p99 values jod kar ya max karke calculate nahi kar sakte.</p>
     <p><b>Teen ilaaj:</b></p>
     <p><b>1. Kam calls.</b> Ek aggregate endpoint ya batch API — 5 calls ko 2 banao.</p>
     <p><b>2. Optional ko async.</b> Reviews aur recommendations page render
     ke <i>baad</i> aaye. Ab optional calls ki latency user ke first paint mein hai hi nahi.</p>
     <p><b>3. Hedged request.</b> p95 beet gaya? doosri copy bhej do, jo pehle
     aaye, wahi lo. ~5% extra load, bahut behtar tail.</p>`,
    `<h3>🔬 Fan-in — ulta problem</h3>
     <p>Fan-out = ek request, bahut calls. Fan-in = bahut writers, ek jagah.
     Fan-in dheere-dheere maarta hai:</p>
     <pre>1000 workers → UPDATE counters SET views = views + 1 WHERE id = 1

Sab ek hi row par lock maang rahe hain.
→ 999 intezaar mein, 1 kaam kar raha hai
→ throughput = 1 / lock_hold_time    (workers ki sankhya se koi farak nahi!)</pre>
     <p>Yahan aur machine add karna <b>zero</b> madad karta hai — balki
     contention badhata hai. Do asli ilaaj:</p>
     <p><b>Partition karo:</b> ek row ki jagah 100 rows (<code>counter_0</code>
     … <code>counter_99</code>), random ek par likho, padhte waqt jod lo.
     Contention 100x kam.</p>
     <p><b>Batch karo:</b> app mein 1 second ke updates jodo, phir ek hi
     write bhejo. 1000 writes → 1 write.</p>
     <p class="tip">🎯 Yaad rakho: <b>fan-out latency ka problem hai,
     fan-in throughput ka.</b> Dono ka ilaaj alag hai.</p>`,
  ],
  stages: [
    {
      type: 'hotspot',
      title: 'Fan-out diagram par ungli rakho',
      instructions: 'Sahi jagah click karo.',
      visual: 'fanout',
      questions: [
        { q: "5 independent calls, har call 1% chance se threshold cross kare; any-slow chance?", target: 'tail', explain: "Independence mein 1 − 0.99⁵ ≈ 4.9% any-slow probability hai. Correlated calls ya full page latency distribution ke liye separate measurement/model chahiye." },
        { q: 'p99 theek karne ka sabse asardaar PEHLA kadam?', target: 'fewer', explain: 'Calls ki sankhya ghatao. 8 calls ko 3 karna, har service ko 2x tez karne se zyada asar karta hai — kyunki tail har call par multiply hota hai.' },
        { q: '1000 workers ek hi row par likh rahe hain — is problem ka naam kya hai?', target: 'fanin', explain: 'Fan-in. Lock contention — throughput lock hold time se tay hota hai, workers ki sankhya se nahi. Aur workers badhane se ulta kharab hota hai.' },
        { q: 'Har fan-out call par sabse zaroori guard kya hai?', target: 'timeout', explain: 'Timeout — aur timeout tumhare apne SLO se CHHOTA. Bina timeout ke ek dheemi dependency tumhara poora p99 apne saath le doobti hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Problem se ilaaj jodo',
      instructions: 'Har halat ko sahi ilaaj se milao.',
      pairs: [
        { left: '🌿 Page 8 services ko call karta hai, p99 kharab', right: 'Calls ghatao — aggregate/batch endpoint', explain: 'Sabse asardaar pehla kadam. 8 calls ko 3 karna, har service ko 2x tez karne se zyada asar karta hai.' },
        { left: '⭐ Reviews section p99 200ms le raha hai', right: 'Optional content ko page load ke BAAD lao', explain: 'Reviews first paint ke liye zaroori nahi. Async load karo — ab reviews ki latency user ke perceived time mein hai hi nahi.' },
        { left: '🎲 Ek replica kabhi-kabhi dheema ho jaata hai', right: 'Hedged request — p95 par doosri copy bhejo', explain: '~5% extra load ke badle tail bahut behtar. Google ne hedged requests ki technique famous ki thi.' },
        { left: '🔥 1000 workers ek counter row par', right: 'Counter ko 100 rows mein partition karo', explain: 'Contention 100x kam. Padhte waqt SUM kar lo. Classic "sharded counter" pattern.' },
        { left: '⏳ Ek dependency latak gayi, threads khatam', right: 'Timeout + bulkhead', explain: 'Timeout latki call ko chhodne par majboor karta hai; bulkhead dependency ke liye threads ki limit baandhta hai taaki baaki service zinda rahe.' },
        { left: '📊 Har second 1000 view-count updates', right: 'App mein batch karo, ek write bhejo', explain: '1000 writes → 1 write. View count ko exact hone ki zaroorat bhi nahi — view count perfect batching candidate hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🌿 Fan-out ka asar dekho',
      goal: "Pehle orders GET ka normal samay naapo. Phir ledger ko 3000ms dheema karo, aur 150ms ke timeout se intezaar ki hadd baandho.",
      sys: SD.sys.orders(),
      tasks: T_FANOUT,
      success: SD.allTasks(T_FANOUT),
      successText: "Ledger ab bhi dheema hai. 150ms ke timeout ne intezaar ki hadd baandhi: naye GET ne jaldi 504 diya, latka nahi. Remote call ka timeout API ke 200ms SLO se kam rakho, kyunki app aur DB ka samay bhi isi 200ms mein aata hai.",
      solution: [
        "GET /api/v1/orders?page=1",
        "sim inject latency ledger 3000",
        "GET /api/v1/orders?page=1",
        "sim add timeout ledger 150",
        "GET /api/v1/orders?page=1",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.timeoutMs === 150 && m.current(s, 'http', r => r.p99 < 800 && r.status === 504); },
      hints: [
        'Pehle orders ki normal `GET` bhejo aur p99 likh lo. Ledger dheema karne ke baad p99 ka farak downstream ka kharch dikhayega.',
        '`sim inject latency ledger 3000` ke baad GET dobara bhejo. `sim add timeout ledger <ms>` intezaar baandhta hai; fresh GET par 504 aur p99 ki hadd jaancho. Timeout downstream ko tez nahi banata.',
        'Poora raasta — har command alag Enter se chalao:\nGET /api/v1/orders?page=1\nsim inject latency ledger 3000\nGET /api/v1/orders?page=1\nsim add timeout ledger 150\nGET /api/v1/orders?page=1',
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Fan-out',
    instructions: 'Yahan formula bolna bada farak laata hai. 🎤',
    questions: [
      {
        q: '6 independent calls parallel chalti hain; har call 99% baar 50 ms ke andar lautti hai. Page sabka intezaar karta hai. Kya keh sakte ho?',
        choices: [
          'Lagbhag 5.9% pages mein koi call slow (1 − 0.99⁶) — tail badhi, par exact p99 pata nahi',
          'Page ka p99 theek 50 ms rahega — calls parallel hain, toh ek doosre ka samay nahi judta',
          'Page ka p99 theek 300 ms hoga — 6 calls × 50 ms, sab ka samay jud jaayega',
          'Page ki tail bhi 1% hi rahegi — har call 1% slow hai, toh page bhi 1% hi slow',
        ],
        answer: 0,
        explain: 'Independent calls aur sabka intezaar maano: saari 6 calls 50 ms ke andar = 0.99⁶ ≈ 94.1%; koi ek slow ≈ 5.9%. Slow call kitni der leti hai, pata nahi — isliye page ka exact p99 nahi nikalta. Formula bol dena interview mein bada farak laata hai; aur agla kadam (calls ghatao, optional calls async karo) dikhata hai ki tumne kiya hai, sirf padha nahi.',
        choiceExplanations: [
          'Independent calls aur sabka intezaar maano: saari 6 calls 50 ms ke andar = 0.99⁶ ≈ 94.1%; koi ek slow ≈ 5.9%. Slow call kitni der leti hai, pata nahi — isliye page ka exact p99 nahi nikalta. Formula bol dena interview mein bada farak laata hai; aur agla kadam (calls ghatao, optional calls async karo) dikhata hai ki tumne kiya hai, sirf padha nahi.',
          'Parallel mein samay nahi judta, par page sabse dheemi call ka intezaar karta hai. Koi ek slow ho toh page slow.',
          'Parallel calls ek saath chalti hain — 6 × 50 jodna serial ka hisaab hai.',
          'Har call 1% slow hai, par 6 mein se koi ek slow hone ka chance 1 − 0.99⁶ ≈ 5.9% hai.',
        ],
      },
      {
        q: '"1000 workers ek hi counter row update kar rahe hain. Throughput kam hai. Aur workers add karein?"',
        choices: [
          'Nahi — throughput lock ke samay se tay hai; counter kai rows mein baanto ya batch karo',
          'Haan — workers 10 guna karo, zyada log milke kaam aur jaldi kar lenge',
          'Read replicas jodo — replicas par bhi wahi row update hogi, toh lock bant jaayega',
          'Isolation level ghata do — lock kam lagega; kuch updates kho bhi jaayein toh chalega',
        ],
        answer: 0,
        explain: 'Jaal wala sawaal. Ek row par saare writes ek-ek karke hi ho sakte hain; workers badhana ulta kaam karta hai — sab lock ke liye ladenge. Sahi jawab hai kheencha-taani khatam karna: sharded counter (jaise 100 rows, padhte waqt jodo) ya app mein updates batch karna.',
        choiceExplanations: [
          'Jaal wala sawaal. Ek row par saare writes ek-ek karke hi ho sakte hain; workers badhana ulta kaam karta hai — sab lock ke liye ladenge. Sahi jawab hai kheencha-taani khatam karna: sharded counter (jaise 100 rows, padhte waqt jodo) ya app mein updates batch karna.',
          'Sab workers ek hi row ke lock ke liye ladenge. Zyada workers = zyada kheencha-taani, kam kaam.',
          'Replicas sirf padhne ke liye hain. Write phir bhi ek hi primary ki ek hi row par jaati hai.',
          'Counter mein update khona = galat ginti. Throughput ke liye sahi data nahi chhoda jaata.',
        ],
      },
    ],
  },
  success: [
    'Serial vs parallel fan-out ka cost bata sakte ho',
    'Tail amplification ka hisaab kar sakte ho',
    'Fan-in ki lock contention pehchaan sakte ho aur do ilaaj bata sakte ho',
    'Har remote call par timeout lagate ho — SLO se kam',
  ],
  homework: `Apne sabse bhaari page ka network tab kholo. Ginti karo kitni API calls hoti hain.
    Har ek ke saamne likho: "first paint ke liye zaroori?" Jinka jawab "nahi" hai, un calls ko defer karke
    dekho ki perceived latency kitni girti hai.`,
  cards: [
    { front: 'Fan-out ka tail formula?', back: "<code>P(any slow) = 1 − (1−p)ⁿ</code> independent calls ke liye. 5 × 1% slow-event probability → 4.9%; 100 → 63%. Formula probability deta hai, exact latency p99 nahi." },
    { front: 'Fan-out tail ke 3 ilaaj?', back: '<b>1.</b> Calls ghatao (aggregate/batch). <b>2.</b> Optional content ko async karo. <b>3.</b> Hedged request — p95 par doosri copy.' },
    { front: 'Fan-in problem?', back: '1000 writers, ek row → lock contention. <b>Throughput = 1 / lock_hold_time</b>, workers se koi farak nahi. Ilaaj: partition (sharded counter) ya batch.' },
    { front: 'Fan-out vs Fan-in?', back: 'Fan-out = <b>latency</b> ka problem (intezaar). Fan-in = <b>throughput</b> ka problem (contention). Ilaaj bilkul alag hain.' },
  ],
},

/* =====================================================================
   L7 — Service decomposition
   ===================================================================== */
{
  id: 'decompose',
  icon: '🧩',
  title: 'Service Decomposition — Kab Todo, Kab Nahi',
  badge: 'Boundary Architect',
  objectives: [
    'Microservices ki asli keemat — 4 cheezein jo mehengi ho jaati hain',
    'Split karne ki <b>4 asli wajahein</b> (aur ek nakli)',
    'Data ownership — distributed monolith ka jaal',
    '"Ek service slow ho gayi toh?" — blast radius',
  ],
  lesson: [
    `<h3>📖 Jo mehenga ho jaata hai</h3>
     <p>Service todne se pehle imaandaari se dekh lo ki kya-kya badalta hai:</p>
     <table>
       <tr><th>Monolith mein</th><th>Microservices mein</th></tr>
       <tr><td>function call — 0.001 ms, kabhi fail nahi</td><td>network call — 5 ms, <b>fail ho sakti hai</b></td></tr>
       <tr><td>ek transaction, ROLLBACK muft</td><td><b>saga</b> — compensating actions khud likho</td></tr>
       <tr><td>ek JOIN</td><td>4 API calls + app mein merge</td></tr>
       <tr><td>stack trace</td><td>distributed tracing ka poora setup</td></tr>
       <tr><td>galat boundary = ek refactor</td><td>galat boundary = ek <b>migration project</b></td></tr>
     </table>
     <p>Aakhri row sabse zaroori hai. Shuru mein tumhe boundaries <b>pata
     hi nahi</b> hoti. Monolith mein galti sasti hai — file move kar do.
     Microservices mein galti ek quarter kha jaati hai.</p>
     <p class="tip">🎯 <b>Modular monolith</b> aksar sahi jawab hota hai:
     saaf module boundaries, alag schemas, par ek deploy. Jab kisi module ko
     sach mein alag scaling ya alag team chahiye, tab use nikaal lo — aur
     tab tak tumhe pata bhi chal chuka hoga ki boundary kahan hai.</p>`,
    `<h3>🔬 Split karne ki 4 asli wajahein</h3>
     <p><b>1. Team ownership.</b> Alag team, alag release cycle. (Conway's
     Law: system waise hi bantega jaise teams banti hain.)</p>
     <p><b>2. Alag scaling shape.</b> Search ko 40 machine chahiye, billing
     ko 2. Ek saath rakhoge toh billing ko bhi 40 par chalana padega.</p>
     <p><b>3. Blast radius.</b> Recommendation engine gire toh checkout na
     gire. Ye sabse achhi wajah hai.</p>
     <p><b>4. Alag tech ya compliance.</b> ML Python mein, PCI card data
     alag boundary mein.</p>
     <p><b>Nakli wajah:</b> "microservices modern hai" / "Netflix aisa karta
     hai". Netflix ke paas 2000 engineers hain; tumhare paas 6.</p>
     <h3>⚠️ Distributed monolith — sabse bura nateeja</h3>
     <p>Agar do services <b>ek hi table</b> par likhti hain, toh dono do
     services nahi hain. Tumne network latency, partial failure aur
     deployment complexity le li — aur independence mili hi nahi.</p>
     <pre>❌ order-service  → orders table ← inventory-service
✅ order-service  → orders table
   inventory-service → inventory table
   (baat karne ke liye: API ya event, table nahi)</pre>
     <p><b>Ek service, ek data ka maalik.</b> Ye ek niyam microservices ki
     zyadatar galtiyan rok deta hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Split karein ya nahi?',
      instructions: 'Har halat ko sahi bin mein daalo.',
      bins: [
        { id: 'split', label: '🔪 Split karo' },
        { id: 'keep', label: '📦 Ek hi rakho' },
      ],
      items: [
        { text: 'Search ko 40 machine chahiye, baaki app ko 2', bin: 'split', explain: 'Alag scaling shape — sabse saaf wajah. Ek saath rakhoge toh poore app ko 40 par chalana padega.' },
        { text: 'Recommendation engine gire toh checkout na gire', bin: 'split', explain: 'Blast radius sabse achhi wajah hai — ek non-critical feature critical path ko na le doobe.' },
        { text: 'Alag team, alag release cycle chahiye', bin: 'split', explain: "Team ownership. Conway's Law — agar do teams ek hi deploy par ladti hain toh boundary galat hai." },
        { text: 'ML model Python mein, baaki app Java mein', bin: 'split', explain: 'Alag tech stack — legitimate wajah. Par dhyaan rakho ki ab ek naya operational surface bhi mila.' },
        { text: 'Orders aur order-items — dono order flow ka hissa', bin: 'keep', explain: 'Ek hi transaction boundary. Orders aur order-items ko todna matlab ek simple INSERT ko saga bana dena. Is bantwaare se koi faayda nahi.' },
        { text: '"Microservices modern hai, sab kar rahe hain"', bin: 'keep', explain: '"Sab kar rahe hain" wajah nahi hai. Netflix ke paas 2000 engineers hain. Tumhare paas 6. Same architecture dono ke liye sahi nahi ho sakta.' },
        { text: 'User profile aur user settings', bin: 'keep', explain: 'Same entity, same team, same lifecycle. Todne se sirf ek network call aur ek consistency problem milega.' },
        { text: 'PCI card data — compliance boundary chahiye', bin: 'split', explain: 'Compliance. Card data ko alag rakhne se audit scope chhota ho jaata hai — chhota audit scope asli, mehenga faayda hai.' },
      ],
    },
    {
      type: 'incident',
      title: '🚨 3AM: "Checkout down hai"',
      instructions: 'Ek nayi microservice ne sab kuch bigaad diya. Sahi kadam chuno.',
      pager: `<b>#prod-alerts</b> — 3:11 AM<br>
        Checkout ka p99 <b>8 second</b> hai, error rate 40%. CPU 12%. Memory theek.<br>
        Pichhle hafte hi <code>recommendation-service</code> deploy hui thi —
        checkout page "aapke liye" section ke liye recommendation-service ko call karta hai.<br>
        Recommendation service ka p99 abhi <b>9 second</b> hai.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: "Recommendation call par timeout + khaali fallback lagao — section optional hai", good: true, next: 'why', explain: 'Bilkul. Ek optional feature critical path ko block kar raha hai. Timeout + empty fallback se checkout turant theek ho jaayega.' },
            { t: "Recommendation service ke workers badhao, taaki call jaldi laut aaye", good: false, explain: 'Rollback se shayad aaj ka masla theek ho jaaye — par asli bug ye hai ki checkout recommendation-service par DEPEND kar raha hai. Kal koi aur dependency dheemi hogi toh phir yahi hoga.' },
            { t: "Checkout service rollback karo — shayad pichhle deploy mein kuch toota", good: false, explain: 'Checkout mein badlaav hi nahi hua. Rollback se kuch nahi badlega.' },
            { t: "DB ki queries optimize karo — checkout ki SQL shayad dheemi ho gayi", good: false, explain: 'CPU 12% hai aur DB shaant hai. Problem ek dheemi downstream call hai, query nahi.' },
          ],
        },
        why: {
          sitrep: '✅ Timeout 200ms + empty fallback laga diya. Checkout p99 wapas 240ms. Error rate 0%.',
          text: 'Ab post-incident: aisa hua hi kyun?',
          choices: [
            { t: "Optional recommendation call bina timeout ke checkout ke raaste par thi", good: true, next: 'fix', explain: 'Do galtiyan ek saath: bina timeout ka remote call, aur optional cheez ko blocking bana dena.' },
            { t: "Recommendation service mein bug tha — galti poori tarah doosri team ki hai", good: false, explain: 'Recommendation service dheemi thi — par asli sawaal ye hai ki recommendation ke dheeme hone se checkout kyun gira. Ek service ki kharabi ko doosri ko nahi le doobna chahiye.' },
            { t: "Traffic achanak zyada aa gaya tha, isliye checkout bojh se gir gaya", good: false, explain: 'CPU 12% hai. Traffic problem nahi tha.' },
          ],
        },
        fix: {
          text: 'Aage ke liye kaunsa sabse asardaar kadam?',
          choices: [
            { t: "Har bahar ki call par default timeout; optional calls ke liye bulkhead + breaker", good: true, next: 'end', explain: 'Timeout default bana do (opt-out, opt-in nahi). Bulkhead se optional calls apne alag thread pool mein rahein. Breaker se baar-baar failing dependency ko rok do.' },
            { t: "Recommendation service ko zyada replicas par chalao, taaki dheemi na pade", good: false, explain: 'Availability badhegi, par pattern nahi badlega. Agli baar koi aur dependency dheemi hogi.' },
            { t: "Checkout page se recommendations hata do — na feature rahega, na khatra", good: false, explain: 'Feature hatana ek haar hai. Sahi jawab hai use SAFELY optional banana — timeout + fallback.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. Checkout ab resilient hai.',
          summary: `<b>Seekh:</b> "Optional feature" tabhi optional hai jab code mein bhi optional ho.
            Bina timeout ke ek call ka matlab hai ki tumne apni availability us service ko de di.
            <br><br><b>Teen niyam:</b>
            <br>1. Har remote call par timeout — <b>default</b>, opt-in nahi.
            <br>2. Optional dependencies ke liye fallback likho (khaali list bhi chalega).
            <br>3. Bulkhead — optional calls ka apna thread pool ho, taaki optional calls critical path ke threads na khaayein.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Decomposition ki samajh',
      questions: [
        {
          q: "Do services ek hi table par likhti hain. Sabse zaroori design risk?",
          choices: [
            'Dono services ek doosre ke schema se bandh jaati hain — ek migration dono ko tod sakti hai',
            'Do services likh rahi hain, toh writes hamesha parallel aur tez honge, bas fayda',
            'Shared table hai, toh services ke beech network failures khatam ho jaayenge',
            'Alag process hain, toh har service apna schema aazaadi se badal sakti hai',
          ],
          answer: 0,
          explain: 'Shared writable table = dono services ek doosre ke schema se bandhi. Ek migration dono ko todegi; deploy independent nahi rahe. Network latency khareedi, independence mili nahi. Migration ke dauraan thodi der chal sakta hai, par ownership, schema changes aur writes ka taal-mel karna padega. Niyam: ek service, ek data ka maalik.',
          choiceExplanations: [
            'Shared writable table = dono services ek doosre ke schema se bandhi. Ek migration dono ko todegi; deploy independent nahi rahe. Network latency khareedi, independence mili nahi. Migration ke dauraan thodi der chal sakta hai, par ownership, schema changes aur writes ka taal-mel karna padega. Niyam: ek service, ek data ka maalik.',
            'Do writers ka matlab parallel nahi — ek hi rows par ladenge bhi.',
            'Network ki gadbad DB tak ke raaste mein bhi hoti hai. Shared table network ko nahi hatati.',
            'Ulta: dono ek hi table padhte-likhte hain, toh ek ka schema badla toh doosri tooti.',
          ],
        },
        {
          q: 'Chhoti team (6 engineers), naya product. Kya architecture?',
          choices: [
            'Modular monolith — saaf module boundaries, ek deploy; zaroorat pade tab module nikaalo',
            'Shuru se 10 microservices — baad mein todna mushkil hai, toh abhi tod lo',
            'Ek bada monolith bina structure ke — chhoti team hai, boundaries ki zaroorat nahi',
            'Har endpoint ek alag serverless function — sab alag, sab apne aap scale honge',
          ],
          answer: 0,
          explain: 'Shuru mein tumhe boundaries <b>pata hi nahi</b> hoti. Monolith mein galat boundary = ek refactor. Microservices mein = ek migration project. Modular monolith dono ka best deta hai: aaj sasta, kal nikaalna aasan.',
          choiceExplanations: [
            'Shuru mein tumhe boundaries <b>pata hi nahi</b> hoti. Monolith mein galat boundary = ek refactor. Microservices mein = ek migration project. Modular monolith dono ka best deta hai: aaj sasta, kal nikaalna aasan.',
            'Shuru mein boundaries pata hi nahi hoti. Microservices mein galat boundary = poora migration project.',
            'Bina structure ke code baad mein todna sabse mushkil hai. Module boundaries aaj sasti hain.',
            'Har endpoint alag = bahut saare deploy, network calls aur debugging. 6 logon ke liye bhaari.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Decomposition',
    instructions: 'Ye sawaal candidates ko sabse zyada uljhata hai. 🎤',
    questions: [
      {
        q: '"Kab microservices mein todoge?"',
        choices: [
          'Jab asli wajah ho: alag team ownership, alag scaling, blast radius, ya alag tech/compliance',
          'Jab code 100k lines paar kare — itne bade codebase ko todna hi padta hai, niyam hai',
          'Jab team 10 logon se badi ho jaaye — itne log ek codebase mein saath nahi chal sakte',
          'Pehle har module ko alag deploy karo, phir traffic dekh ke ownership boundaries dhoondho',
        ],
        answer: 0,
        explain: 'Line count wajah nahi hai — ek 500k line ka achha modular monolith 20 kharab microservices se behtar hai. Sabse taakatwar jawab pehle microservices ki keemat ginta hai, phir batata hai ki kaunsi asli wajah keemat ko justify karti hai.',
        choiceExplanations: [
          'Line count wajah nahi hai — ek 500k line ka achha modular monolith 20 kharab microservices se behtar hai. Sabse taakatwar jawab pehle microservices ki keemat ginta hai, phir batata hai ki kaunsi asli wajah keemat ko justify karti hai.',
          'Line count wajah nahi — ek achha 500k line ka modular monolith 20 kharab microservices se behtar hai.',
          'Team size akela wajah nahi. Kya teams sach mein alag-alag hisse sambhalti hain, aur alag deploy chahiye?',
          'Boundary samajhne se pehle todoge, toh galat ownership badalna distributed migration ban jaayega.',
        ],
      },
      {
        q: '"Tumhari service ek doosri service par depend karti hai jo kabhi-kabhi dheemi ho jaati hai. Kya karoge?"',
        choices: [
          'Deadline ke andar timeout, optional call ka fallback aur dependency ka alag budget',
          'Fail hoti call ko caller ki deadline tak retry karo, workers ka budget saajha rakho',
          'Dependency ka timeout caller se lamba rakho, taaki chalti request poori ho sake',
          'Provider ke replicas aur alerts badhao; caller mein isolation baad mein dekhna',
        ],
        answer: 0,
        explain: 'Chaar layers, chaar alag khatre: timeout intezaar baandhta hai, fallback user ko kuch deta hai, breaker baar-baar marne se bachata hai, bulkhead dheemi dependency ko tumhare baaki threads khaane se rokta hai. Sirf provider ko theek karna tumhari service ko khula chhodta hai — agli baar koi aur dependency dheemi hogi.',
        choiceExplanations: [
          'Chaar layers, chaar alag khatre: timeout intezaar baandhta hai, fallback user ko kuch deta hai, breaker baar-baar marne se bachata hai, bulkhead dheemi dependency ko tumhare baaki threads khaane se rokta hai. Sirf provider ko theek karna tumhari service ko khula chhodta hai — agli baar koi aur dependency dheemi hogi.',
          'Deadline tak retry dheemi service par aur bojh daalta hai — aur saajhe workers sab ke sab us call mein phans jaate hain.',
          'Caller pehle hi haar maan lega; tumhara thread bekaar kaam karta rahega. Timeout caller se chhota ho.',
          'Provider theek ho toh achha, par tumhari service phir bhi khuli hai. Isolation tumhare haath mein hai — abhi.',
        ],
      },
    ],
  },
  success: [
    'Microservices ki asli keemat gina sakte ho',
    'Split ki 4 asli wajahein aur nakli wajah pehchaante ho',
    'Distributed monolith ka jaal dekh sakte ho',
    'Ek dheemi dependency se apni service bacha sakte ho',
  ],
  homework: `Apne system ka ek "service" chuno. Poochho: kya koi doosri service is service ki table ko
    seedha padhti/likhti hai? Agar haan, toh service independent nahi hai. List banao ki
    us coupling ko todne ke liye kaunse API ya events chahiye.`,
  cards: [
    { front: 'Microservices ki asli keemat?', back: 'function call → <b>network call jo fail ho sakti hai</b>; transaction → <b>saga</b>; JOIN → <b>API composition</b>; stack trace → <b>distributed tracing</b>; galat boundary → <b>migration project</b>.' },
    { front: 'Split ki 4 asli wajahein?', back: '<b>1.</b> Team ownership <b>2.</b> Alag scaling shape <b>3.</b> Blast radius <b>4.</b> Alag tech/compliance. "Modern hai" wajah <b>nahi</b> hai.' },
    { front: 'Distributed monolith?', back: 'Do services ek hi table par likhein. Network latency, partial failure aur deploy complexity <b>mil gayi</b>; independence <b>nahi mili</b>. Niyam: <b>ek service, ek data ka maalik</b>.' },
    { front: 'Chhoti team, naya product?', back: '<b>Modular monolith</b> — saaf boundaries, ek deploy. Boundaries shuru mein pata nahi hoti; monolith mein galti sasti hai.' },
    { front: 'Dheemi dependency se bachne ke 4 layer?', back: '<b>Timeout</b> (SLO se kam) → <b>fallback</b> (optional ho toh) → <b>circuit breaker</b> (baar-baar fail) → <b>bulkhead</b> (alag thread pool).' },
  ],
},

/* =====================================================================
   L8 — BOSS: poora flow design karo
   ===================================================================== */
{
  id: 'boss-flow',
  icon: '👑',
  title: 'BOSS — Notification Feature ka Poora Flow',
  badge: 'Flow Pathik',
  objectives: [
    'Sab kuch ek saath lagao: boundaries + sync/async + guards',
    'Har decision ka <b>tradeoff</b> bol sako',
    'Design review jhelna — jahan har galti mehengi hai',
  ],
  lesson: [
    `<h3>👑 Brief</h3>
     <p>Product ne kaha: <i>"Users ko push notification bhejne ka feature
     chahiye. Marketing team ek baar mein 50 lakh users ko bhej sakti ho."</i></p>
     <p>Tumhe poora flow design karna hai. Har decision par socho:</p>
     <pre>• Client kya bhejta hai, aur turant kya jawab milta hai?
• Kaam sync hoga ya async?
• Rate limiting kahan — aur kis cheez ki?
• Provider (FCM/APNs) ki limit kaise respect karoge?
• Ek notification do baar na jaaye — kaise?
• Ek kharab message poori queue na roke — kaise?</pre>
     <p>Neeche design canvas hai. Har slot par ek decision chuno, phir
     <b>design review</b> karao. Review mein saare options ke tradeoff
     khulenge — sirf tumhare chune hue ke nahi.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: '🏗️ Notification service design karo',
      instructions: 'Har slot par ek decision chuno, phir review karao.',
      brief: `Marketing team ek campaign banati hai jo <b>50 lakh users</b> ko push notification
        bhejta hai. Users ko transactional notifications bhi milte hain (order shipped, payment failed) —
        transactional notifications <b>turant</b> jaane chahiye, campaign ke peeche fanse nahi.
        FCM ki limit <b>1000 rps</b> hai.`,
      requirements: [
        '50 lakh notifications, ek campaign',
        'Transactional notifications < 5 second',
        'FCM limit: 1000 rps',
        'Ek notification do baar na jaaye',
        'Ek kharab message baaki ko na roke',
      ],
      pass: 13,
      slots: [
        {
          id: 'api', label: 'API ka jawab', icon: '🚪',
          note: 'Campaign create hone par client ko kya milega?',
          options: [
            { id: 'sync200', label: "200 OK — saare 50 lakh push bhej ke hi jawab do", score: -3,
              why: 'Ek request mein 50 lakh push bhejna? Aisi request ghanton chalegi aur pehle timeout par mar jaayegi. Aur retry par sab dobara chala jaayega.' },
            { id: 'a202', label: "202 Accepted + campaign ka status URL lauta do", score: 3,
              why: 'Sahi. Kaam hua nahi hai, sirf maan liya gaya hai. Client status URL par progress dekh sakta hai. Yahi async ka imaandaar contract hai.' },
            { id: 'a201', label: "201 Created — campaign resource ban gaya, bas", score: 1,
              why: 'Bura nahi — campaign resource sach mein ban gaya. Par 202 zyada saaf hai kyunki asli kaam (bhejna) abhi baaki hai.' },
          ],
        },
        {
          id: 'queue', label: 'Queue ka design', icon: '📮',
          note: 'Transactional aur campaign ek saath?',
          options: [
            { id: 'one', label: "Ek hi queue aur ek hi worker pool, sab ke liye", score: -3,
              why: 'Campaign ke 50 lakh messages queue mein bharenge aur "payment failed" notification campaign ke messages ke PEECHE lag jaayega. Is atkaav ko head-of-line blocking kehte hain.' },
            { id: 'two', label: "Alag queues, alag workers: transactional + bulk", score: 3,
              why: 'Bilkul. Alag queue = alag priority aur alag consumers. Alag queue + alag workers = queue-level bulkhead — campaign ka spike transactional ko chhu bhi nahi sakta.' },
            { id: 'prio', label: "Ek hi queue, har message par priority ka label", score: 0,
              why: 'Kagaz par theek, practice mein nazuk. Zyadatar brokers priority theek se nahi karte, aur agar consumers busy hain toh priority se koi farak nahi padta.' },
          ],
        },
        {
          id: 'rate', label: 'FCM ki 1000 rps limit', icon: '🚦',
          note: 'Provider ki limit kaise respect karoge?',
          options: [
            { id: 'retry', label: "Jitna ho sake bhejo, 429 aaye toh turant retry", score: -3,
              why: '429 par turant retry = retry storm. Provider ko aur maaroge, tumhara account throttle ya block ho sakta hai. "Retry karke handle kar lenge" sabse mehengi galti hai.' },
            { id: 'shape', label: "Outbound limiter: quota se neeche, ~900 rps par", score: 3,
              why: 'Sahi. Limit ke thoda NEECHE raho (headroom). Quota se neeche rehna backpressure hai — tum apni speed control kar rahe ho, provider ko majboor nahi kar rahe.' },
            { id: 'workers', label: "Utne workers rakho ki rate lagbhag 1000 rps bane", score: 1,
              why: 'Kaam kar sakta hai par nazuk — worker count se rate control karna indirect hai. Ek worker restart ya slow provider par ganit bigad jaayega. Explicit limiter behtar hai.' },
          ],
        },
        {
          id: 'dup', label: 'Duplicate se bachav', icon: '♻️',
          note: 'Worker crash hua, message dobara aaya',
          options: [
            { id: 'hope', label: "Broker ke \"exactly-once\" flag par bharosa karo", score: -3,
              why: 'Exactly-once delivery distributed systems mein hoti hi nahi. Asal mein hota hai at-least-once delivery + <b>idempotent processing</b>. Exactly-once maan lena sabse common galatfehmi hai.' },
            { id: 'idem', label: "Unique key (campaign_id, user_id) se dedupe karo", score: 3,
              why: 'Sahi. "Bheja gaya" ko DB mein unique constraint ke saath likho. Dobara aane par insert fail hoga aur tum skip kar doge. At-least-once + idempotent = effectively-once.' },
            { id: 'mem', label: "Bheje gaye IDs ko worker ki memory mein rakho", score: -2,
              why: 'Worker restart par memory chali jaayegi. Aur 10 workers ki memory alag-alag hai — koi bhi doosre ka bheja hua nahi jaanta.' },
          ],
        },
        {
          id: 'poison', label: 'Kharab message', icon: '☠️',
          note: 'Ek message har baar crash kar raha hai',
          options: [
            { id: 'inf', label: "Har error par retry karte raho, jab tak chal na jaaye", score: -3,
              why: 'Poison message. Poison message kabhi nahi chalega, aur poison message ke peeche ki POORI queue ruk jaayegi. Ek message poora outage ban jaata hai.' },
            { id: 'drop', label: "Pehli baar fail hote hi message phenk do, aage badho", score: -1,
              why: 'Ab transient failures (network blip) mein bhi notifications gum ho rahe hain. Retry chahiye — bas anant nahi.' },
            { id: 'dlq', label: "Error pehchaano; 3 retries (backoff), phir DLQ", score: 3,
              why: 'Sahi. Transient failures retry se theek ho jaate hain; permanent failures DLQ mein jaate hain jahan insaan dekh sakta hai. Queue kabhi block nahi hoti.' },
          ],
        },
        {
          id: 'status', label: 'Progress dikhana', icon: '📊',
          note: 'Marketing team ko kaise pata chale?',
          options: [
            { id: 'none', label: "Kuch nahi — bas bhej do, status ki zaroorat nahi", score: -2,
              why: 'Team ko pata hi nahi chalega ki 50 lakh mein se kitne gaye, kitne fail. Har sawaal support ticket ban jaayega.' },
            { id: 'poll', label: "GET /campaigns/:id — sent / failed / pending ginti", score: 3,
              why: 'Sahi, aur 202 wale Location header ke saath perfectly fit hota hai. Counters worker se update hote rahein.' },
            { id: 'log', label: "Operators ke liye logs — wahi status ka zariya", score: -1,
              why: 'Logs debugging ke liye hain, product feature ke liye nahi. Marketing team Kibana nahi kholegi.' },
          ],
        },
      ],
      verdicts: {
        great: 'Har decision production-grade hai. Ye design 50 lakh notifications bhejega aur transactional traffic ko chhuyega bhi nahi.',
        ok: 'Design chal jaayega, par upar dekho — ek-do decisions par tumne apne aap ko future incident de diya hai.',
        bad: 'Ye design pehle bade campaign par toot jaayega. Neeche har option ka tradeoff padho — asli seekh wahi hai.',
      },
    },
    {
      type: 'quiz',
      title: 'Boss ke baad — samajh pakki',
      questions: [
        {
          q: 'Ek FIFO queue aur saajhe workers hain. 50 lakh campaign messages pehle aaye; "payment failed" notification baad mein. Alag queue aur worker budget kyun chahiye?',
          choices: [
            'Head-of-line blocking — 50 lakh campaign messages ke peeche "payment failed" atak jaayega',
            'Alag-alag message format ek queue mein aa kar queue ko corrupt kar denge',
            'Alag queue banane se capacity muft mein badh jaati hai, isliye alag rakho',
            'Ek hi queue mein priority label se kaam chal jaata — alag queue ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'Is FIFO setup mein urgent message bulk backlog ke peeche rukega — head-of-line blocking. Alag queues ke saath transactional workers ka budget bhi alag rakho (queue-level bulkhead). Priority queue doosra design ho sakta hai, par pehle se chal rahe kaam ko label akela nahi rokta.',
          choiceExplanations: [
            'Is FIFO setup mein urgent message bulk backlog ke peeche rukega — head-of-line blocking. Alag queues ke saath transactional workers ka budget bhi alag rakho (queue-level bulkhead). Priority queue doosra design ho sakta hai, par pehle se chal rahe kaam ko label akela nahi rokta.',
            'Format alag hona queue ko kharab nahi karta. Dikkat kram ki hai: bulk ke peeche urgent.',
            'Alag queue apne aap capacity nahi laati — alag workers aur budget dene padte hain.',
            'Diye hue FIFO setup mein priority scheduling hai hi nahi. Priority chahiye toh broker ka support aur workers ka bantwaara dono design karne honge.',
          ],
        },
        {
          q: '"Exactly-once delivery" ke baare mein sach kya hai?',
          choices: [
            'End-to-end exactly-once nahi milta — at-least-once bhejo, aur effect idempotent banao',
            'Broker ka exactly-once flag laga do — bahar ke charge aur email bhi dedupe ho jaayenge',
            'At-most-once chuno — tab na koi message khoyega, na koi do baar aayega',
            'Transaction laga do — har remote effect (payment, email) apne aap atomic ho jaayega',
          ],
          answer: 0,
          explain: 'Crash ke baad network par "message gaya ya nahi" pakka jaanna mushkil hai — isliye system ya dobara bhejega (at-least-once) ya kabhi kho dega (at-most-once). Kafka jaise brokers apni hadd ke andar exactly-once semantics de sakte hain, par bahar ke effects (payment, email) us hadd mein nahi aate. Practical jawab: at-least-once bhejo, idempotent bano = effectively-once.',
          choiceExplanations: [
            'Crash ke baad network par "message gaya ya nahi" pakka jaanna mushkil hai — isliye system ya dobara bhejega (at-least-once) ya kabhi kho dega (at-most-once). Kafka jaise brokers apni hadd ke andar exactly-once semantics de sakte hain, par bahar ke effects (payment, email) us hadd mein nahi aate. Practical jawab: at-least-once bhejo, idempotent bano = effectively-once.',
            'Kafka transactions apni read-process-write hadd ke andar exactly-once dete hain. Bahar ka payment ya email us hadd mein nahi aata.',
            'At-most-once mein duplicate nahi, par message kho sakta hai.',
            'DB transaction remote API ko apne andar nahi le sakta. Bahar ke effect ke liye idempotency key chahiye.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — Flow Design',
    instructions: 'Aakhri round. Yahan tumhe design defend karna hai.',
    questions: [
      {
        q: '"Trace mein transactional notification ek FIFO queue mein campaign backlog ke peeche 20 minute ruki. Dono classes ke workers bhi saajhe hain. Kya badloge?"',
        choices: [
          'Campaign aur transactional kaam ke liye alag queues aur pakka worker budget rakho',
          'FCM dheema tha — provider ne transactional messages ko jaan-boojh ke peeche daal diya',
          'DB slow tha — index lagao, transactional messages apne aap jaldi jaane lagenge',
          'Retries kam the — zyada retry lagao, urgent messages ko apne aap priority mil jaayegi',
        ],
        answer: 0,
        explain: 'Dekha hua intezaar queue aur workers ke saajhe hone se aaya. Alag queues aur transactional workers ka apna budget rakho. Downstream quota aur saajha DB bhi parkho. (Sirf consumer group alag karne se message classes aur capacity apne aap alag nahi hoti.)',
        choiceExplanations: [
          'Dekha hua intezaar queue aur workers ke saajhe hone se aaya. Alag queues aur transactional workers ka apna budget rakho. Downstream quota aur saajha DB bhi parkho. (Sirf consumer group alag karne se message classes aur capacity apne aap alag nahi hoti.)',
          'Provider ko queue ka kram pata hi nahi. Kram tumhari queue ne banaya.',
          'DB index queue ka kram nahi badalta. Transactional messages campaign ke peeche khade the.',
          'Retry kram nahi badalta, sirf bojh badhata hai.',
        ],
      },
      {
        q: '"50 lakh notifications bhejne mein 90 minute lag rahe hain. Tez karo."',
        choices: [
          'Pehle hisaab: 1000 rps par 50 lakh ka floor ~83 minute hai — hum lagbhag hadd par hain',
          'Workers dugne kar do — 90 minute aadhe hokar lagbhag 45 minute ho jaayenge',
          'Queue ko tez broker par le jao — queue ki speed badhte hi kaam jaldi niklega',
          'Retry dugne kar do — fail hue messages jaldi niklenge, toh kul samay ghatega',
        ],
        answer: 0,
        explain: 'Pehle hisaab: 50,00,000 ÷ 1000 rps = 5000 s ≈ 83 minute — provider ki limit par sabse kam samay. Tum already hadd ke paas ho; workers badhana kuch nahi karega. Tez karna hai toh provider se badi quota maango, ya kaam ghatao. (Batching ka quota unit check karo; kai accounts se limit todna maan ke mat chalo.) "Constraint pehchaano" wali soch senior engineers ko alag karti hai.',
        choiceExplanations: [
          'Pehle hisaab: 50,00,000 ÷ 1000 rps = 5000 s ≈ 83 minute — provider ki limit par sabse kam samay. Tum already hadd ke paas ho; workers badhana kuch nahi karega. Tez karna hai toh provider se badi quota maango, ya kaam ghatao. (Batching ka quota unit check karo; kai accounts se limit todna maan ke mat chalo.) "Constraint pehchaano" wali soch senior engineers ko alag karti hai.',
          'Bottleneck FCM ki 1000 rps limit hai, workers nahi. Workers badhao toh bhi 1000/s se tez nahi bhej sakte.',
          'Queue bottleneck nahi hai. Limit provider ki hai.',
          'Retry bojh badhata hai, limit nahi.',
        ],
      },
    ],
  },
  success: [
    'Ek poora feature flow design kar sakte ho — API se worker tak',
    'Har decision ka tradeoff bol sakte ho',
    'Head-of-line blocking pehchaante ho aur queue-level isolation lagate ho',
    'Exactly-once guarantee ka scope aur external effects ki idempotency explain kar sakte ho',
  ],
  homework: `Apne project ka koi ek async kaam chuno (email, webhook, export).
    Chaar sawaal poochho: (1) duplicate aane par kya hoga? (2) hamesha fail hone par kya hoga?
    (3) user ko status kaise pata chalta hai? (4) queue kitni badi ho sakti hai?
    Jitne sawaalon ka jawab nahi hai, utne future incidents hain.`,
  cards: [
    { front: 'Head-of-line blocking?', back: 'Bulk messages ke peeche urgent message atak jaata hai. Ilaaj: <b>alag queue + alag consumers</b> — queue-level bulkhead.' },
    { front: 'Exactly-once ka sach?', back: 'Exactly-once hoti hi nahi. <b>At-least-once delivery + idempotent processing = effectively-once.</b> Dedupe key par unique constraint lagao.' },
    { front: 'Poison message?', back: 'Aisa message jo har baar crash karta hai. Bina DLQ ke poison message poori queue rok deta hai. Pattern: <b>N retries with backoff → DLQ</b>.' },
    { front: 'Downstream rate limit kaise respect karein?', back: '<b>Outbound rate limiter</b> — limit se thoda NEECHE (headroom). "429 par retry kar lenge" retry storm banata hai.' },
  ],
},

]);

/* =====================================================================
   L1.5 — Networking essentials   (Hello Interview: Core Concepts)
   L3.5 — Numbers to know
   ===================================================================== */
const T_NET = [
  { text: 'Ek COLD connection trace karo — data se pehle ka kharch dekho',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === false && r.protocol === 'h1') },
  { text: 'Ab WARM connection — setup gayab ho jaana chahiye',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === true) },
  { text: 'HTTP/3 par cold trace — TCP handshake hai hi nahi',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.protocol === 'h3' && r.tcp === 0) },
  { text: '60 assets par teenon protocols compare karo',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'compare' && r.assets === 60 && r.h1 > r.h2 && r.h2 > r.h3) },
  { text: 'L4 load balancer kya kar sakta hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'lb' && r.layer === 4) },
  { text: 'Aur L7 kya kar sakta hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'lb' && r.layer === 7) },
];

const T_NUMBERS = [
  { text: 'Same datacenter (RTT 1ms) par ek cold connection',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt === 1 && r.protocol === 'h1' && !r.warm) },
  { text: 'Ab wahi cheez cross-continent (RTT 150ms) par',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt === 150 && r.protocol === 'h1' && !r.warm) },
  { text: 'Cross-continent par HTTP/3 — ek RTT bachana yahan kitna bada hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt === 150 && r.protocol === 'h3') },
  { text: '1,20,00,000 users, 500 rps, har record 2048 bytes: storage aur peak ka estimate nikalo',
    check: s => s.records.some(r => r.kind === 'estimate' && r.users === 12000000 && r.rps === 500 && r.bytesPer === 2048) },
  { text: '500 rps ka naya load chalao — load sirf server ka kharch naapta hai, network ka RTT load mein nahi judta',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && r.revision === s.revision) },
];

SD.registerLevelsAfter('flow', 'lifecycle', [
{
  id: 'networking',
  icon: '🌐',
  title: 'Network — Request Bhejne Se PEHLE Ka Sab Kuch',
  badge: 'Protocol Pandit',
  objectives: [
    'DNS + TCP + TLS ka handshake tax — data se <b>pehle</b> ka waqt',
    'TCP vs UDP, aur QUIC (HTTP/3) beech ka raasta kaise nikalta hai',
    'Head-of-line blocking — HTTP/1.1, HTTP/2 aur HTTP/3 mein',
    'L4 vs L7 load balancer — aur WebSocket ke liye L4 kyun',
  ],
  lesson: [
    `<h3>📖 "Ek request 200ms leti hai" — usme se aadha kya tha?</h3>
     <p>Nayi HTTPS connection par ek byte data jaane se <b>pehle</b> itna kuch hota hai:</p>
     <pre>DNS lookup       30 ms   "api.example.com ka IP kya hai?"
TCP handshake    40 ms   SYN → SYN-ACK → ACK        (1 RTT)
TLS handshake    40 ms   keys ka exchange           (TLS 1.3: 1 RTT · purana TLS 1.2: 2 RTT = 80 ms)
─────────────────────
                110 ms   ...ab request bhej sakte ho  (TLS 1.2 par 150 ms)</pre>
     <p>Isiliye <b>connection reuse</b> (keep-alive / connection pooling) itna matter
     karta hai. Har request par nayi connection kholne wale purane clients ki
     latency dugni thi — aur code mein kuch "galat" nahi dikhta tha.</p>
     <h3>🔀 TCP vs UDP</h3>
     <table>
       <tr><th></th><th>TCP</th><th>UDP</th></tr>
       <tr><td>Delivery</td><td>guaranteed, kram mein</td><td>koi guarantee nahi</td></tr>
       <tr><td>Setup</td><td>handshake chahiye</td><td>seedha bhejo</td></tr>
       <tr><td>Packet kho gaya</td><td>ruko, dobara bhejo</td><td>aage badho</td></tr>
       <tr><td>Kab</td><td><b>default</b> — API, web, DB</td><td>jab <b>purana data bekaar</b> ho</td></tr>
     </table>
     <p>UDP tab chuno jab der se aaya data <b>kaam ka hi nahi</b> hai: live video ka
     purana frame, game mein 200ms purani position, VoIP ka pichhla syllable.
     Aise data ke liye "ruk ke dobara bhejo" ulta nuksaan hai.</p>
     <p class="tip">🎯 <b>QUIC</b> (HTTP/3 ki neev) UDP par banaya gaya hai — par usne
     reliability, ordering aur congestion control <b>khud</b> implement kar liye.
     Kyun? Kyunki TCP kernel mein hai aur use badalna lagbhag namumkin hai;
     UDP par jaake unhone TCP ko <b>userspace mein dobara likh diya</b>, behtar tareeke se.</p>`,
    `<h3>🚦 Head-of-line blocking — teen versions ki asli kahani</h3>
     <pre>HTTP/1.1  ek connection = ek request at a time
          → browser 6 connections kholta hai, baaki assets LINE mein
          → yahi wajah thi "sprite sheets" aur "domain sharding" ki

HTTP/2    ek connection, saari requests MULTIPLEXED
          → par TCP par hai. Ek packet kho gaya = SAARI streams ruk gayi
          → HOL blocking mita nahi, ek layer NEECHE chala gaya

HTTP/3    QUIC (UDP) — har stream apne aap mein
          → packet loss sirf USI stream ko rokta hai
          → aur connection ka pata IP nahi, ek connection ID hai
            (isliye WiFi → 4G par connection zinda rehti hai)</pre>
     <p class="tip">🎯 Practical natija: HTTP/2 ke baad purani optimizations
     <b>nuksaan</b> karti hain. Domain sharding ab extra DNS + TCP + TLS handshakes
     hai. Sprite sheets ab ek badi file hai jiska ek pixel badalne par poori dobara
     download hoti hai. Optimization hamesha <b>us zamaane ki bottleneck</b> ke liye
     hoti hai — bottleneck badal jaaye toh purani optimization ek bug ban jaati hai.</p>
     <h3>⚖️ L4 vs L7 load balancer</h3>
     <table>
       <tr><th></th><th>L4 (transport)</th><th>L7 (application)</th></tr>
       <tr><td>Dekhta hai</td><td>IP + port</td><td>poori HTTP request</td></tr>
       <tr><td>Route by</td><td>connection</td><td>path, header, cookie</td></tr>
       <tr><td>TLS</td><td>pass-through</td><td>terminate karta hai</td></tr>
       <tr><td>Retry / rewrite</td><td>❌</td><td>✅</td></tr>
       <tr><td>WebSocket</td><td>✅ seedha nikal jaati hai</td><td>⚠️ state rakhna padta hai</td></tr>
       <tr><td>Cost</td><td>bahut tez</td><td>parse + decrypt ka kharch</td></tr>
     </table>
     <p>Zyadatar HTTP traffic ke liye <b>L7</b> chahiye — kyunki path se routing,
     retry aur rate limiting wahin milte hain. Par <b>persistent connections</b>
     (WebSocket, gRPC streams, database proxies) ke liye L4 sahi hai:
     aisi connection ghanton chalti hai, aur L4 connection ko bas aage badha deta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Wire par kya ho raha hai',
      goal: `Handshake ka tax khud naapo, phir teenon HTTP versions compare karo,
             aur dono load balancer layers dekho.`,
      sys: SD.sys.orders(),
      tasks: T_NET,
      success: SD.allTasks(T_NET),
      successText: `Ab tum "network slow hai" se aage ho. Setup ka tax, protocol ka
        head-of-line blocking, aur LB ki layer — teenon <b>design</b> ke faisle hain,
        ops ke nahi. Aur sabse sasta optimization abhi bhi wahi hai:
        <b>connection dobara istemaal karo</b>.`,
      solution: [
        "net trace",
        "net trace --warm",
        "net trace --protocol h3",
        "net compare --assets 60",
        "net lb l4",
        "net lb l7",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'net', r => r.op === 'lb' && r.layer === 7); },
      hints: [
        'Pehle `net trace` chalao. Cold connection mein DNS, TCP aur TLS ka setup kharch dikhega; request ka kaam baad mein shuru hota hai.',
        'Connection reuse ka farak `net trace --warm` se dekho. Protocol badalne ke liye `net trace --protocol <version>`; assets par `net compare --assets 60`. Routing ki seema `net lb <layer>` se padho.',
        'Poora raasta — har command alag Enter se chalao:\nnet trace\nnet trace --warm\nnet trace --protocol h3\nnet compare --assets 60\nnet lb l4\nnet lb l7',
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa protocol / layer kahan',
      pairs: [
        { left: 'REST API, mobile app se', right: 'HTTP/2 ya /3 over TCP/QUIC', explain: 'Data ka har byte chahiye aur kram matter karta hai — TCP-jaisi reliability zaroori hai. Mobile par HTTP/3 extra faayda deta hai: network badalne par connection nahi tootti.' },
        { left: 'Live video streaming', right: 'UDP', explain: 'Kho gaya frame dobara bhejne ka koi matlab nahi — frame dobara aayega tab tak scene ja chuka hoga. Ek frame drop karke aage badhna hi sahi hai.' },
        { left: 'WebSocket chat gateway', right: 'L4 load balancer', explain: 'Connection ghanton chalti hai. L4 use bas aage badha deta hai aur beech mein aata hi nahi. L7 ko har connection ka state rakhna padta hai.' },
        { left: '/api → svc-a, /images → svc-b', right: 'L7 load balancer', explain: 'Path se routing ke liye LB ko HTTP request <b>padhni</b> padegi — request sirf L7 padh sakta hai.' },
        { left: 'Multiplayer game ki player position', right: 'UDP', explain: '200 ms purani position bekaar hai. TCP khoya packet dobara bhejne ke liye <b>ruk</b> jaata — aur us doraan nayi positions bhi ruk jaati (HOL blocking). Ek chhoot jaana behtar hai.' },
        { left: 'Bank transfer API call', right: 'TCP', explain: 'Yahan har byte chahiye aur kram bhi. "Shayad pahunch gaya" jaisi koi cheez nahi hai. TCP default hai — aur default badalne ki bahut khaas wajah chahiye.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Network ki samajh',
      questions: [
        {
          q: 'Ek client har request par nayi HTTPS connection kholta hai. Kitna extra kharch?',
          choices: [
            'DNS + TCP + TLS — data se pehle kai round trip; 40 ms RTT par 100 ms se zyada ho sakta hai',
            'Kuch khaas nahi — DNS cache ho gaya toh TCP aur TLS ka setup bhi bach jaata hai',
            'Kuch nahi — TLS resumption har nayi connection ko bilkul muft bana deta hai',
            'Sirf thodi CPU — handshake server ka kaam hai, network ka koi round trip nahi lagta',
          ],
          answer: 0,
          explain: 'Nayi connection par DNS (agar cache nahi), TCP aur TLS — har ek mein round trip lagte hain, aur sab kuch data bhejne se pehle. Kitna lagega, DNS cache, TLS version (1.2 ya 1.3), resumption aur 0-RTT par depend karta hai — ek pakka number nahi. Code mein kuch "galat" nahi dikhta, bas har baar extra intezaar. Isliye connection pooling / keep-alive har HTTP client ka pehla config hai jise check karna chahiye.',
          choiceExplanations: [
            'Nayi connection par DNS (agar cache nahi), TCP aur TLS — har ek mein round trip lagte hain, aur sab kuch data bhejne se pehle. Kitna lagega, DNS cache, TLS version (1.2 ya 1.3), resumption aur 0-RTT par depend karta hai — ek pakka number nahi. Code mein kuch "galat" nahi dikhta, bas har baar extra intezaar. Isliye connection pooling / keep-alive har HTTP client ka pehla config hai jise check karna chahiye.',
            'DNS cache sirf naam dhoondhna bachata hai. Nayi connection par TCP aur TLS ke round trip phir bhi lagte hain.',
            'Resumption TLS ka setup chhota karta hai, khatam nahi. TCP handshake phir bhi lagta hai.',
            'Handshake mein client aur server ke beech message aate-jaate hain — har ek round trip network ka samay hai.',
          ],
        },
        {
          q: 'HTTP/2 par shift kiya. Ab domain sharding (assets ko 4 subdomains par baantna) kya karega?',
          choices: [
            'Nuksaan ho sakta hai — har extra domain ka apna setup, jabki H2 ek connection mein sab bhejta hai',
            'Fayda hoga — chaar domains par chaar guna parallel requests chalengi, sab kuch tez',
            'Kuch nahi hoga — H2 mein saare subdomains apne aap ek hi connection share karte hain',
            'Thoda fayda — H2 mein DNS aur TLS ki zaroorat hi nahi, toh extra domain muft padta hai',
          ],
          answer: 0,
          explain: 'Domain sharding HTTP/1.1 ki 6-connections-per-host limit ke liye bani thi. HTTP/2 mein ek connection par saari requests multiplex hoti hain, toh extra domains aksar sirf setup badhate hain. (Kuch browsers certificate aur IP milne par connections jod dete hain — tab nuksaan kam.) Sabak: har optimization apne zamaane ki bottleneck ke liye hoti hai; bottleneck badle toh optimization bug ban sakti hai.',
          choiceExplanations: [
            'Domain sharding HTTP/1.1 ki 6-connections-per-host limit ke liye bani thi. HTTP/2 mein ek connection par saari requests multiplex hoti hain, toh extra domains aksar sirf setup badhate hain. (Kuch browsers certificate aur IP milne par connections jod dete hain — tab nuksaan kam.) Sabak: har optimization apne zamaane ki bottleneck ke liye hoti hai; bottleneck badle toh optimization bug ban sakti hai.',
            'H2 ek hi connection par saari requests saath bhejta hai (multiplexing). Domains baantne se parallelism nahi badhta, setup badhta hai.',
            'Connections tabhi share hote hain jab certificate aur IP milte hon (connection coalescing). Har subdomain apne aap nahi judta.',
            'H2 bhi DNS aur TLS par hi chalta hai. Har naya domain apna naam aur setup maangta hai.',
          ],
        },
        {
          q: 'HTTP/2 ne head-of-line blocking hata di — sach ya jhooth?',
          choices: [
            'Aadha sach — HTTP layer par hata di, par TCP par baaki: ek packet khoye toh sab rukti',
            'Poora sach — HTTP/2 ke baad packet khone par bhi baaki streams bilkul nahi rukti hain',
            'Jhooth — HTTP/2 ne kuch nahi badla; requests pehle jaisi ek ke baad ek chalti hain',
            'Sirf HTTPS par sach — TLS laga ho toh khoya packet baaki streams ko nahi rokta',
          ],
          answer: 0,
          explain: 'HTTP/2 requests ko multiplex karta hai, par TCP mein khoye bytes ke baad ka saara data delivery ka intezaar karta hai — sab streams rukti hain. QUIC (HTTP/3) mein khoye packet ka data jin streams ka tha, wahi streams retransmission ka intezaar karti hain; baaki streams aage badh sakti hain. (Ek packet mein kai streams ka data ho sakta hai.) Congestion aur connection-level flow control phir bhi saajhe hain.',
          choiceExplanations: [
            'HTTP/2 requests ko multiplex karta hai, par TCP mein khoye bytes ke baad ka saara data delivery ka intezaar karta hai — sab streams rukti hain. QUIC (HTTP/3) mein khoye packet ka data jin streams ka tha, wahi streams retransmission ka intezaar karti hain; baaki streams aage badh sakti hain. (Ek packet mein kai streams ka data ho sakta hai.) Congestion aur connection-level flow control phir bhi saajhe hain.',
            'HTTP/2 TCP par chalta hai. TCP har byte kram mein deta hai, toh ek khoya packet sab streams ko rok deta hai.',
            'HTTP/2 ne ek connection par kai requests saath bhejna shuru kiya — HTTP layer ka intezaar sach mein ghata.',
            'TLS data par taala lagata hai; packet khone par dobara bhejna aur kram ka niyam nahi badalta.',
          ],
        },
      ],
    },
    {
      type: 'hotspot',
      title: 'Wire par ek request',
      visual: 'networking',
      questions: [
        { q: 'Data bhejne se pehle ka sabse bada kharch?', target: 'setup', explain: 'DNS + TCP + TLS milke ek RTT-heavy setup banate hain. Isiliye connection reuse sabse sasta optimization hai.' },
        { q: 'HTTP/1.1 mein assets line mein kyun lagte hain?', target: 'hol', explain: 'Ek connection par ek waqt mein ek request — head-of-line blocking. Browser 6 connections khol ke HOL blocking thoda kam karta hai, khatam nahi.' },
        { q: 'QUIC TCP ka handshake kaise bachaata hai?', target: 'quic', explain: 'QUIC UDP par chalta hai, isliye TCP handshake hai hi nahi — aur TLS QUIC ke handshake ke saath hi ho jaata hai. Cold connection par ek poora RTT bach jaata hai.' },
        { q: 'WebSocket ke liye kaunsi LB layer?', target: 'l4', explain: 'L4 — connection ko bas aage badha deta hai. L7 ko har lambi connection ka state rakhna padta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Networking',
    instructions: 'Is layer ko log aksar skip kar dete hain. 🎤',
    questions: [
      {
        q: "\"Tumhari API ka p99 achanak 400 ms badh gaya, par server ka processing time wahi hai. Kahan dekhoge?\"",
        choices: [
          'Connection setup aur raasta — keep-alive toota, ya traffic naye region se aane laga',
          'Kahin nahi — server ka processing time wahi hai, toh dikkat ho hi nahi sakti hai',
          'Database par naya index lagaunga — slow query hi aksar p99 ko upar le jaati hai',
          'CPU double kar dunga — zyada CPU milte hi har request jaldi nipat jaayegi',
        ],
        answer: 0,
        explain: 'Naape hue server span ke bahar ka samay dekho: connection setup (keep-alive toota? har baar nayi TLS?), client se server aur wapas ka network (naya region, naya proxy), proxy ki line, response transfer aur client ki taraf ka intezaar. Client ki taraf ka trace 400 ms ka hissa dikhayega.',
        choiceExplanations: [
          'Naape hue server span ke bahar ka samay dekho: connection setup (keep-alive toota? har baar nayi TLS?), client se server aur wapas ka network (naya region, naya proxy), proxy ki line, response transfer aur client ki taraf ka intezaar. Client ki taraf ka trace 400 ms ka hissa dikhayega.',
          'User ko dikhne wala samay server ke bahar bhi kharch hota hai: connection, network, proxy.',
          'Bina query trace dekhe index chunna andaaza hai. Server ke bahar ka gap bhi naapo.',
          'CPU nayi TLS handshake ya lamba raasta nahi hatata. Server ka kaam pehle hi utna hi hai.',
        ],
      },
      {
        q: '"Video call feature banana hai. Protocol?"',
        choices: [
          'Media ke liye WebRTC (UDP) — purana frame bekaar; signaling ke liye alag reliable raasta',
          'Sab kuch TCP par — reliability chahiye, toh har frame ka pahunchna pakka karo',
          'Har video frame ek alag HTTP request mein bhejo — HTTP sabse aasaan aur saaf hai',
          'Protocol se farak nahi — video ki quality sirf codec tay karta hai, transport nahi',
        ],
        answer: 0,
        explain: 'Interactive media ke liye WebRTC aam taur par UDP par chalta hai; signaling ka reliable raasta alag hota hai. Media mein playout deadline aham hai: deadline ke baad aaya frame bekaar ho sakta hai, par waqt par pahunchne wala selective retransmission madad bhi kar sakta hai. Sab media ko ek ordered TCP stream mein baandhne se khoye bytes naye data ko rok dete hain. "Sab kuch ek protocol par" wala jawab hi galti hai.',
        choiceExplanations: [
          'Interactive media ke liye WebRTC aam taur par UDP par chalta hai; signaling ka reliable raasta alag hota hai. Media mein playout deadline aham hai: deadline ke baad aaya frame bekaar ho sakta hai, par waqt par pahunchne wala selective retransmission madad bhi kar sakta hai. Sab media ko ek ordered TCP stream mein baandhne se khoye bytes naye data ko rok dete hain. "Sab kuch ek protocol par" wala jawab hi galti hai.',
          'TCP ka ordered byte stream packet khone par naye media ko bhi rok deta hai. WebRTC deadline ke hisaab se loss aur recovery sambhalta hai.',
          'Har frame par request-response ka chakkar = bahut der. Live media ko lagataar behne wala raasta chahiye.',
          'Codec zaroori hai, par khoye packet aur der ka ilaaj transport aur app tay karte hain.',
        ],
      },
    ],
  },
  success: [
    'DNS/TCP/TLS ka setup tax naap sakte ho',
    'TCP vs UDP ka faisla "purana data bekaar hai?" se le sakte ho',
    'Teenon HTTP versions ka head-of-line blocking samjha sakte ho',
    'L4 vs L7 chun sakte ho — aur WebSocket ke liye L4 kyun',
  ],
  homework: `Apne kisi HTTP client ka config dekho: keep-alive on hai? Pool ka size kya hai?
    Phir <code>curl -w "@curl-format.txt"</code> se ek asli call ka DNS/TCP/TLS breakdown nikaalo.
    Aur apne load balancer ka pata karo — L4 hai ya L7?`,
  cards: [
    { front: 'Nayi HTTPS connection ka tax?', back: 'DNS (~30 ms) + TCP (1 RTT) + TLS 1.3 (1 RTT) ≈ <b>110 ms</b> at 40 ms RTT — data bhejne se <b>pehle</b>. Purane TLS 1.2 par ek RTT aur: 150 ms. Isliye keep-alive / connection pooling sabse sasta optimization hai.' },
    { front: 'UDP kab?', back: 'Jab <b>purana data bekaar</b> ho — live video, gaming, VoIP. Aise data ke liye "ruk ke dobara bhejo" ulta nuksaan hai. Baaki sab jagah TCP default.' },
    { front: 'HTTP/1.1 vs 2 vs 3?', back: '<b>1.1</b> — ek connection = ek request (browser 6 kholta hai). <b>2</b> — multiplexed, par TCP par HOL blocking baaki. <b>3</b> — QUIC/UDP, har stream alag; aur connection ID se network badalne par bhi zinda.' },
    { front: 'HTTP/2 ke baad domain sharding?', back: '<b>Nuksaan.</b> Har domain = extra DNS+TCP+TLS. Domain sharding HTTP/1.1 ki 6-connection limit ke liye thi. Har optimization apne zamaane ki bottleneck ke liye hoti hai.' },
    { front: 'L4 vs L7 LB?', back: '<b>L4</b> = IP+port, tez, TLS pass-through, <b>WebSocket ke liye sahi</b>. <b>L7</b> = poori request padhta hai → path routing, retry, rate limit, TLS terminate. HTTP traffic ke liye L7.' },
  ],
},
]);

SD.registerLevelsAfter('flow', 'latency', [
{
  id: 'numbers',
  icon: '🔢',
  title: 'Numbers Jo Yaad Hone Chahiye',
  badge: 'Number Nipun',
  objectives: [
    'Latency ka ladder — L1 cache se cross-continent tak',
    'Ek RTT kitna mehenga hai — aur RTT se design kaise badalta hai',
    'Throughput aur size ke mote numbers',
    'Anumaan ko <b>naap</b> se milaana',
  ],
  lesson: [
    `<h3>📖 Latency ka ladder</h3>
     <p>Ye numbers rat-ne ke liye nahi hain — in numbers ka faayda ye hai ki in numbers se
     <b>design ke faisle apne aap</b> nikal aate hain.</p>
     <pre>L1 cache                    0.5 ns
Branch mispredict             5 ns
L2 cache                      7 ns
Mutex lock/unlock            25 ns
Main memory (RAM)           100 ns
1 KB compress (snappy)        2 µs   =     2,000 ns
SSD random read             100 µs   =   100,000 ns
Same-datacenter RTT         0.5 ms   =   500,000 ns
Disk (HDD) seek              10 ms
Cross-country RTT (US)       40 ms
Cross-continent RTT         150 ms
</pre>
     <p class="tip">🎯 In numbers ko insaani paimane par rakho — sab kuch 1 billion se guna karo:
     L1 cache = <b>0.5 second</b>. RAM = <b>100 second</b>. SSD = <b>27 ghante</b>.
     Same-DC network = <b>6 din</b>. Cross-continent = <b>5 saal</b>.
     <br><br>Ab socho ki tumhare code mein ek loop ke andar ek network call hai.
     Loop har chakkar par <b>5 saal</b> intezaar kar raha hai.</p>
     <h3>🔬 In numbers se design kaise nikalta hai</h3>
     <table>
       <tr><th>Number</th><th>Design ka natija</th></tr>
       <tr><td>RAM 100ns vs SSD 100µs = <b>1000x</b></td><td>Cache ka poora karan. Working set memory mein rakho</td></tr>
       <tr><td>Same-DC RTT 0.5ms</td><td>Ek request mein 20 service hops = 10ms sirf network — <b>N+1 ka network wala roop</b></td></tr>
       <tr><td>Cross-continent 150ms</td><td>Ek user-facing request mein <b>ek</b> se zyada cross-region hop matlab SLO gaya. Isiliye data user ke paas rakho</td></tr>
       <tr><td>SSD random 100µs</td><td>Ek index lookup ~0.1ms. 1000 lookups = 100ms — isiliye N+1 dikhta hai</td></tr>
       <tr><td>1 Gbps = 125 MB/s</td><td>1 GB file transfer = 8 second, best case. Bade payloads network-bound hain</td></tr>
     </table>`,
    `<h3>📏 Size aur throughput ke mote numbers</h3>
     <pre>Ek int                   4 bytes
Ek UUID                 16 bytes  (36 as string — 2x waste)
Ek timestamp             8 bytes
Ek chhoti row       ~100–500 bytes
Ek typical JSON API response  ~1–10 KB

1 din                = 86,400 s  (~100k, hisaab ke liye)
1M requests/din      ≈ 12 rps
100M requests/din    ≈ 1,200 rps
1B requests/din      ≈ 12,000 rps

Ek Postgres instance   ~10,000 simple qps
Ek Redis instance      ~100,000 ops/sec
Ek Kafka partition     ~10 MB/s
Ek modern NIC          1–10 Gbps</pre>
     <h3>✂️ Do shortcuts jo har estimate mein kaam aate hain</h3>
     <p><b>1. "Roz ka X" ko rps mein badalna:</b> 86,400 ko 100,000 maan lo.
     Toh <code>1M/din ≈ 10 rps</code>. Andaaza 15% galat hai aur bilkul kaafi hai —
     back-of-envelope mein tumhe order of magnitude chahiye, decimal nahi.</p>
     <p><b>2. Peak = average × 2 se 5.</b> Aur agar tumhare traffic mein koi
     <b>event</b> hai (result declaration, sale, match) toh peak 100x bhi ho sakta hai.
     Isliye pehle poochho: "kya system ka traffic predictable spike wala hai?"</p>
     <p class="tip">🎯 Aur sabse zaroori: <b>anumaan lagane ke baad naapo.</b>
     Estimate ka kaam batana hai ki tumhe kis <b>paimane</b> ki cheez chahiye —
     10 servers ya 1000. Estimate ke baad asli number load test se aata hai, dimaag se nahi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Numbers se faisle tak',
      goal: `Ek hi design, do jagah: same datacenter aur cross-continent.
             Phir storage aur peak traffic ka estimate nikalo. Alag load run se server capacity naapo.`,
      sys: SD.sys.orders(),
      tasks: T_NUMBERS,
      success: SD.allTasks(T_NUMBERS),
      successText: `Cold HTTP/1.1 trace 53ms se 500ms hua: lagbhag <b>9.4x</b>.
        Data user ke paas rakhne se RTT ghatega. Estimate storage aur peak traffic ka hai.
        Load server capacity naapta hai; network RTT load ke service time mein nahi judta.`,
      solution: [
        "net trace --rtt 1",
        "net trace --rtt 150",
        "net trace --rtt 150 --protocol h3",
        "estimate --users 12000000 --rps 500 --bytes 2048",
        "load --rps 500 --duration 8",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'load', r => r.rps === 500); },
      hints: [
        'Pehle `net trace --rtt <ms>` se same-datacenter cold connection dekho. Phir sirf doori badalne par setup ka kharch saaf dikhega.',
        'RTT bada ho toh handshake bachana zyada kaam aata hai: `net trace --rtt 150 --protocol h3`. `estimate --users <users> --rps <rate> --bytes <size>` ka hisaab `load --rps <rate> --duration <seconds>` se jaancho.',
        'Poora raasta — har command alag Enter se chalao:\nnet trace --rtt 1\nnet trace --rtt 150\nnet trace --rtt 150 --protocol h3\nestimate --users 12000000 --rps 500 --bytes 2048\nload --rps 500 --duration 8',
      ],
    },
    {
      type: 'fill',
      title: 'Latency ladder',
      instructions: 'Sahi number chuno.',
      template: `RAM se ek value padhne mein ~{0} lagta hai, SSD se random read mein ~{1},
        aur same-datacenter network round trip mein ~{2}.
        Cross-continent round trip ~{3} hai — isliye ek user-facing request mein
        cross-continent round trip se ek se zyada baar guzarna SLO tod deta hai.`,
      tokens: ['100 ns', '100 µs', '0.5 ms', '150 ms', '10 ms', '1 s'],
      blanks: [
        { answer: '100 ns', explain: 'RAM ~100 nanosecond. Yahi cache ka poora karan hai — RAM SSD se <b>1000x</b> tez hai.' },
        { answer: '100 µs', explain: 'SSD random read ~100 microsecond = 0.1 ms. Isiliye ek index lookup sasta hai, par 1000 lookups (N+1) 100ms ban jaate hain.' },
        { answer: '0.5 ms', explain: 'Same-DC RTT ~0.5ms. Chhota lagta hai — par ek request mein 20 service hops = 10ms sirf network par, bina kuch kiye.' },
        { answer: '150 ms', explain: 'Cross-continent ~150ms. Doori <b>physics</b> hai (light speed + fiber), koi tuning physics ko theek nahi kar sakti. Ilaaj sirf architecture hai: data user ke paas rakho.' },
      ],
    },
    {
      type: 'match',
      title: 'Number → design ka faisla',
      pairs: [
        { left: 'RAM 100ns vs SSD 100µs (1000x)', right: 'Cache lagane ka poora karan', explain: 'Ye ek number caching ki poori duniya justify karta hai. Working set ko memory mein rakhna 1000x ka farak hai.' },
        { left: 'Cross-continent RTT 150ms', right: 'Data ko user ke paas rakho (regional partitioning)', explain: 'Ek user-facing request mein ek se zyada cross-continent hop = SLO gaya. Isiliye Uber city-wise partition karta hai aur CDN edge par baithta hai. Doori physics hai, tuning nahi.' },
        { left: 'Same-DC RTT 0.5ms × 20 hops', right: 'Service decomposition ki chhupi hui keemat', explain: '20 microservice hops = 10ms sirf network par, bina kisi kaam ke. Isiliye ek request path mein service count bhi ek design number hai.' },
        { left: 'Ek Postgres ~10,000 qps', right: 'Sharding ka sawaal kab uthega', explain: 'Agar tumhara peak 2,000 qps hai toh sharding ki baat hi bekaar hai. rps ka number "abhi zaroorat hai ya nahi" ka seedha jawab de deta hai.' },
        { left: '1M requests/din ≈ 12 rps', right: '"Bahut traffic" aksar bahut kam hota hai', explain: 'Log "10 lakh requests roz" sun ke ghabra jaate hain. 10 lakh roz = 12 rps — ek laptop bhi kar lega. Isliye hamesha rps mein badlo, phir faisla karo.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Numbers ki samajh',
      questions: [
        {
          q: "1000 serial same-DC calls; har call ka assumed fixed RTT 0.5 ms. Sirf network wait?",
          choices: [
            'Lagbhag 500 ms — 1000 × 0.5 ms; N+1 ka network wala roop yahi hai',
            'Lagbhag 5 ms — same DC hai, toh calls ka intezaar lagbhag judta hi nahi',
            'Lagbhag 50 ms — same DC mein RTT 0.05 ms jitna chhota maan ke chalo',
            'Kuch khaas nahi — same DC mein network ka samay zero ke barabar hai',
          ],
          answer: 0,
          explain: 'Diye hue fixed RTT par serial network wait = 1000 × 0.5 ms = 500 ms — aur is intezaar mein ek bhi byte ka kaam nahi hua. Independent calls ko batching se kam trips mein bhej sakte ho; DataLoader ek batch window ki loads jod sakta hai. Par calls ek doosre par nirbhar hon ya batch ki hadd ho, toh saari calls ek trip nahi banti. Asli RTT naapo.',
          choiceExplanations: [
            'Diye hue fixed RTT par serial network wait = 1000 × 0.5 ms = 500 ms — aur is intezaar mein ek bhi byte ka kaam nahi hua. Independent calls ko batching se kam trips mein bhej sakte ho; DataLoader ek batch window ki loads jod sakta hai. Par calls ek doosre par nirbhar hon ya batch ki hadd ho, toh saari calls ek trip nahi banti. Asli RTT naapo.',
            'Serial calls ek ke baad ek hoti hain, toh intezaar judta hai: 1000 × 0.5 = 500 ms. 5 ms sau guna kam hai.',
            'Sawaal mein RTT 0.5 ms diya hai. 1000 × 0.5 = 500 ms; 50 ms das guna kam hai.',
            'Same DC sasta hai, muft nahi. 1000 serial calls par 0.5 ms bhi aadha second ban jaata hai.',
          ],
        },
        {
          q: 'Mumbai se Virginia ka naapa hua RTT 150 ms hai. Connection pehle se khula (reused) hai. 200 ms ka SLO kaise parkhoge?',
          choices: [
            'Bacha budget gino — 150 ms ke baad ~50 ms kaam aur queue ke liye; tail aur nayi TLS bhi',
            'Seedha kaho ki 200 ms namumkin hai — 150 ms RTT par koi request waqt par nahi lautegi',
            'Database par index lagao — index se Mumbai-Virginia ka round trip bhi chhota hoga',
            'CPU double karo — tez CPU network ka samay bhi lagbhag aadha kar deta hai',
          ],
          answer: 0,
          explain: '150 ms naape hue RTT ke baad 200 ms SLO mein ~50 ms processing aur queue ke liye bachte hain. Reused connection par target ho sakta hai; nayi TLS, kai hops ka kaam ya tail ka uchhaal budget tod sakte hain. Physics yaad rakho: Mumbai-Virginia ~13,000 km, fiber mein do taraf ~130 ms minimum — koi index ya cache physics nahi badal sakta; sirf data ko paas laana (edge, regional deployment) madad karta hai. Faisla measurements se lo.',
          choiceExplanations: [
            '150 ms naape hue RTT ke baad 200 ms SLO mein ~50 ms processing aur queue ke liye bachte hain. Reused connection par target ho sakta hai; nayi TLS, kai hops ka kaam ya tail ka uchhaal budget tod sakte hain. Physics yaad rakho: Mumbai-Virginia ~13,000 km, fiber mein do taraf ~130 ms minimum — koi index ya cache physics nahi badal sakta; sirf data ko paas laana (edge, regional deployment) madad karta hai. Faisla measurements se lo.',
            'Namumkin nahi: 150 + 50 = 200. Reused connection par target ho sakta hai — bas budget bahut tight hai.',
            'Index DB ka kaam tez karta hai. Mumbai se Virginia ki doori index se nahi ghat-ti.',
            'Roshni fiber mein ~200,000 km/s chalti hai. CPU doori ka samay nahi badal sakta.',
          ],
        },
        {
          q: '"Humein 10 lakh requests roz handle karni hain" — pehla kadam?',
          choices: [
            'Pehle ~11.6 rps average nikaalo; phir peak, har request ka kaam aur size naapo',
            '10 lakh ko seedha rps maan lo — 10 lakh requests har second ke hisaab se plan karo',
            'Roz ki ginti badi hai, toh pehle din se hi database ki sharding plan kar lo',
            'Peak pakka 50 rps hoga — roz ki ginti se peak hamesha seedha nikal aata hai',
          ],
          answer: 0,
          explain: '10 lakh ÷ 86,400 ≈ 11.6 rps average — "10 lakh roz" bada sunai deta hai, par raftaar chhoti hai. Conversion (÷ 86,400, ya mote taur par ÷ 100,000) sabse zyada waqt bachane wala shortcut hai. Par sirf roz ki ginti se server ki ginti ya sharding tay nahi hoti — peak, har request ka kaam, data aur availability ki zaroorat bhi chahiye.',
          choiceExplanations: [
            '10 lakh ÷ 86,400 ≈ 11.6 rps average — "10 lakh roz" bada sunai deta hai, par raftaar chhoti hai. Conversion (÷ 86,400, ya mote taur par ÷ 100,000) sabse zyada waqt bachane wala shortcut hai. Par sirf roz ki ginti se server ki ginti ya sharding tay nahi hoti — peak, har request ka kaam, data aur availability ki zaroorat bhi chahiye.',
            'Roz ko second mein badlo: 10 lakh ÷ 86,400 ≈ 11.6 rps. Roz ki ginti rps nahi hai.',
            'Average rps sharding ka saboot nahi. Pehle read/write load, data size aur peak naapo.',
            'Peak traffic ke shape par depend karta hai. 50 ek andaaza ho sakta hai, pakka nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Numbers',
    instructions: 'Yahan mote numbers se jaldi jawab dena hi hunar hai. 🎤',
    questions: [
      {
        q: '5 crore users, har user roz 20 photo dekhta hai. 90% views 20 KB thumbnails, 10% views 200 KB images. Roz ka egress kitna?',
        choices: [
          '100 crore views/din; 0.9 × 20 + 0.1 × 200 = 38 KB/view → lagbhag 38 TB/din',
          '100 crore views/din; har view ko 20 KB ka thumbnail maan lo → lagbhag 20 TB/din',
          '100 crore views/din; ausat 38 KB/view → lagbhag 3.8 TB/din ka egress',
          '100 crore views/din; ausat 38 KB/view → lagbhag 380 TB/din ka egress',
        ],
        answer: 0,
        explain: '5 crore × 20 = 100 crore views/din ≈ 11,574 rps average. Har view ka ausat: 0.9 × 20 KB + 0.1 × 200 KB = 38 KB → 38 TB/din (decimal units). Number khud design batata hai: itna origin se bhejna paagalpan hai — kaam CDN ka hai, aur asli sawaal cache hit rate ka hai. (Storage upload aur retention se gino, views se nahi.)',
        choiceExplanations: [
          '5 crore × 20 = 100 crore views/din ≈ 11,574 rps average. Har view ka ausat: 0.9 × 20 KB + 0.1 × 200 KB = 38 KB → 38 TB/din (decimal units). Number khud design batata hai: itna origin se bhejna paagalpan hai — kaam CDN ka hai, aur asli sawaal cache hit rate ka hai. (Storage upload aur retention se gino, views se nahi.)',
          'Sirf thumbnails gine. 10% badi images bhi hain: 0.9 × 20 + 0.1 × 200 = 38 KB.',
          'Ek shunya kam laga: 100 crore × 38 KB = 38 TB, 3.8 nahi.',
          'Ek shunya zyada laga: 100 crore × 38 KB = 38 TB, 380 nahi.',
        ],
      },
      {
        q: '"Tumhare estimate galat nikle toh?"',
        choices: [
          'Estimate disha hai — assumptions likh ke load test se naapta hoon, galat hissa dobara dekhta',
          'Autoscaling sambhaal legi — estimate jitna bhi galat ho, machines apne aap badh jaayengi',
          'Main hamesha 2 guna margin rakhta hoon — itna margin har tarah ki galti ko dhak leta hai',
          'Main estimate dashamlav tak exact nikaalta hoon — exact number kabhi galat nahi hota',
        ],
        answer: 0,
        explain: 'Estimate ka kaam order of magnitude batana hai — 10 servers ya 1000. Sabse achha hissa: "assumptions likh ke rakhta hoon" — traffic ka shape alag nikle, toh pata hota hai ki design ka kaunsa hissa dobara sochna hai.',
        choiceExplanations: [
          'Estimate ka kaam order of magnitude batana hai — 10 servers ya 1000. Sabse achha hissa: "assumptions likh ke rakhta hoon" — traffic ka shape alag nikle, toh pata hota hai ki design ka kaunsa hissa dobara sochna hai.',
          'Autoscaling bahar ki quota, hot rows ya galat design ko theek nahi karti.',
          'Galti das guna ki ho toh 2 guna margin kuch nahi bachata.',
          'Andaaze ke input hi pakke nahi, toh dashamlav tak ka number bhi pakka nahi.',
        ],
      },
    ],
  },
  success: [
    'Latency ladder yaad hai — aur insaani paimane par samajh sakte ho',
    'Har number se ek design ka natija nikaal sakte ho',
    '"Roz ka X" ko turant rps mein badal sakte ho',
    'Anumaan ke baad naapne ki aadat hai',
  ],
  homework: `Apne system ki ek asli request lo aur request ka waqt teen hisson mein baanto:
    network, DB, aur app ka apna kaam. Phir dekho ki sabse bada hissa kaunsa hai —
    aur kya har hissa latency ladder ke hisaab se <b>samajh mein aata hai</b>.
    Jo hissa numbers se mel na khaaye, wahi tumhara chhupa hua bug hai.`,
  cards: [
    { front: 'Latency ladder (mote taur par)?', back: 'L1 0.5ns · RAM <b>100ns</b> · SSD random <b>100µs</b> · same-DC RTT <b>0.5ms</b> · HDD seek 10ms · cross-country 40ms · <b>cross-continent 150ms</b>.' },
    { front: 'Insaani paimane par?', back: '×1 billion: L1 = 0.5 sec · RAM = 100 sec · SSD = 27 ghante · same-DC network = <b>6 din</b> · cross-continent = <b>5 saal</b>.' },
    { front: 'RAM vs SSD ka farak?', back: '<b>1000x</b> (100ns vs 100µs). Ye ek number poori caching duniya ko justify karta hai.' },
    { front: '"Roz ka X" → rps?', back: '86,400 ko <b>100,000</b> maan lo. 1M/din ≈ 12 rps · 100M/din ≈ 1,200 rps · 1B/din ≈ 12,000 rps. Peak = average × 2–5 (event ho toh 100x).' },
    { front: 'Cross-continent SLO?', back: 'WAN RTT measurement route-specific hai. Propagation ko CPU/index se remove nahi kar sakte;connection reuse,call reduction aur regional placement ka remaining budget measure karo.' },
    { front: 'Ek Postgres kitna?', back: '~10,000 simple qps · Redis ~100k ops/s · Kafka partition ~10 MB/s. In numbers se pata chalta hai ki sharding ki baat <b>abhi</b> zaroori hai ya nahi.' },
  ],
},
]);

})();
