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
  { text: 'Ek normal request bhejo aur uska cost panel dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200) },
  { text: '/health maango — dekho woh kya-kya CHHUTA hai',
    check: s => s.records.some(r => r.kind === 'health') },
  { text: '500 rps ka load daalo',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 500) },
  { text: '`trace` se dekho ki waqt kahan gaya',
    check: s => s.records.some(r => r.kind === 'trace') },
];

const T_IV_DIAGNOSE = [
  { text: 'Load daalo taaki problem dikhe', check: s => s.records.some(r => r.kind === 'load') },
  { text: 'Trace karke bottleneck dhoondo', check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst)) },
];

const T_TAIL = [
  { text: '400 rps ka load daalo aur p50 vs p99 ka farak dekho',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 300) },
  { text: '99.9% availability ka error budget nikalo',
    check: s => s.records.some(r => r.kind === 'slo') },
];

const T_FANOUT = [
  { text: 'Normal request bhejo — baseline p99 dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 < 500) },
  { text: 'Downstream ko 3 second dheema karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'latency' && r.value >= 2000) },
  { text: 'Dekho ki uski latency seedha tumhare p99 mein judi',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 > 2000) },
  { text: 'Timeout laga ke damage baandho',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout') },
  { text: 'Ab failure bounded ho: HTTP 504 aur p99 800ms se kam',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && r.what === 'timeout');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 504 && r.p99 < 800); } },
];

const T_GUARDS = [
  { text: 'Dekho ki ?limit=1000 bina rok-tok chal jaata hai',
    check: s => s.records.some(r => r.kind === 'http' && r.limit >= 500 && r.status === 200) },
  { text: 'maxLimit 100 par set karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /maxLimit/.test(r.path) && r.value === 100) },
  { text: 'Ab wahi request 400 se reject honi chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 400 && r.guard === 'maxLimit') },
  { text: 'Rate limit lagao (100 rps)',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'ratelimit') },
  { text: 'Burst bhejo aur 429 khaao',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 429) },
];

const T_ESTIMATE = [
  { text: '12,00,000 users, 2 KB per record ka estimate nikalo',
    check: s => s.records.some(r => r.kind === 'estimate' && r.users >= 1000000) },
  { text: 'Peak rps nikalo (average nahi!)',
    check: s => s.records.some(r => r.kind === 'estimate' && r.peak > r.rps) },
  { text: '99.9% SLO ka error budget dekho',
    check: s => s.records.some(r => r.kind === 'slo') },
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
     Aur production mein jo outage aate hain, woh lagbhag hamesha
     intezaar se aate hain — kaam se nahi.</p>`,
    `<h3>🔬 "CPU 10% hai, memory theek hai, health green hai — phir timeout kyun?"</h3>
     <p>Yeh interview ka sabse achha sawaal hai, aur production ka sabse
     common 3 baje raat wala confusion. Agar app <b>busy nahi</b> hai, toh
     woh <b>kis cheez ka intezaar</b> kar rahi hai?</p>
     <p>Ek request ko trace karo — machine ke metrics ghoorna band karo:</p>
     <pre>  app handler (CPU)        5 ms   ← app ka apna kaam
  ⏳ pool.acquire()    9,900 ms   ← 💀 YAHI HAI
  db query                20 ms   ← DB bilkul theek hai!
  ────────────────────────────
  TOTAL                9,925 ms</pre>
     <p>Yahan <b>query optimize karna bilkul bekaar hai</b> — SQL sirf 20 ms
     le raha hai. Bottleneck DB nahi, <b>DB ke saamne ki queue</b> hai.</p>
     <p>Aur health check green kyun hai? Kyunki woh jaan-boojh ke sasta
     banaya gaya hai — woh sirf itna kehta hai <i>"process zinda hai"</i>.
     Usne na connection liya, na dependency chhui.</p>
     <p class="tip">🎯 <b>Health check pass hona</b> aur <b>service traffic
     serve kar paana</b> — yeh do alag baatein hain.</p>`,
    `<h3>🧰 perfsim — is app ka terminal</h3>
     <p>Baaki Gurukul apps mein terminal ek <i>tool</i> sikhata hai. Yahan
     terminal ek <b>poora system chalata hai</b>. Har daava jo tum padhoge,
     woh yahin prove hoga.</p>
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
        { text: 'TCP + TLS handshake', explain: '~80 ms, aur yeh har naye connection par lagta hai. Keep-alive / HTTP/2 isliye itna matter karta hai — handshake dobara nahi hota.' },
        { text: 'CDN edge — cached hai kya?', explain: 'Yahan HIT ho gaya toh request tumhare server tak pahunchi hi nahi. Sabse sasti request woh hai jo aayi hi nahi.' },
        { text: 'Load balancer — kaunsa instance', explain: 'TLS terminate + healthy instance chuno. ~1 ms. Yahi woh jagah hai jahan "instance down hai" pata chalta hai.' },
        { text: 'API gateway — auth + rate limit', explain: 'AuthN aur rate limiting YAHAN hote hain — service mein nahi. Jo request andar aane hi nahi chahiye, use baahar hi roko.' },
        { text: 'Service — business logic', explain: 'Ab tumhara code chalta hai. Aksar sirf 5 ms CPU — baaki sab intezaar hai.' },
        { text: 'Cache — Redis/memcached', explain: 'HIT = ~1 ms aur DB bacha. MISS = aage jao. Hit rate 90% ka matlab DB par load 10x kam.' },
        { text: 'DB connection pool — ek connection maango', explain: '🚧 Yahi woh jagah hai jahan QUEUE banti hai. Sab connections busy? Tumhari request line mein lag jaati hai — CPU 0% par.' },
        { text: 'Database — query chalao', explain: 'Aakhir mein asli kaam. 5 ms bhi ho sakta hai, 8 second bhi — depend karta hai ki query ne kitni rows chhui.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Raaste par ungli rakho',
      instructions: 'Diagram mein sahi hop click karo.',
      visual: 'lifecycle',
      questions: [
        { q: 'Kaunsa hop request ko poori tarah ROK sakta hai (server tak pahunchne hi na de)?', target: 'cdn', explain: 'CDN edge. HIT hua toh tumhara server ko pata bhi nahi chalta ki request aayi thi. Yeh sabse sasti "optimization" hai.' },
        { q: 'Kaunsa hop KAAM nahi karta — sirf INTEZAAR karwata hai?', target: 'pool', explain: 'Connection pool. Baaki sab hops kuch karte hain; pool sirf line lagwata hai. Aur outage lagbhag hamesha yahin se aate hain.' },
        { q: 'AuthN (tum kaun ho?) aur rate limiting kahan honi chahiye?', target: 'gateway', explain: 'API gateway — jitna baahar ho sake. Service tak pahunchne ke baad reject karne ka matlab hai ki thread, memory aur shayad connection pehle hi kharch ho chuke.' },
        { q: 'Handshake ki 80 ms ki keemat kahan lagti hai?', target: 'tls', explain: 'TCP + TLS. Isiliye keep-alive, connection pooling aur HTTP/2 itne zaroori hain — handshake ek hi baar ho, har request par nahi.' },
      ],
    },
    {
      type: 'terminal',
      title: '🔍 Pehla mission — system ko chhu ke dekho',
      goal: 'Ek nayi service mili hai. Uska naksha banao: ek request bhejo, health check dekho, load daalo, aur trace karke pata karo ki waqt kahan jaata hai.',
      sys: SD.sys.orders({ db: { longTxHolding: 42 } }),
      tasks: T_LIFECYCLE,
      success: SD.allTasks(T_LIFECYCLE),
      successText: `Tumne abhi woh dekha jo bahut se senior engineers pehli baar production incident mein dekhte hain:
        <b>CPU kam, health green, aur phir bhi sab kuch dheema.</b>
        <br><br>Jawab <code>trace</code> mein tha — <code>pool.acquire()</code> mein
        sabse zyada waqt gaya. Request kaam nahi kar rahi thi, woh <b>connection ka
        intezaar</b> kar rahi thi. Yeh poore Resilience track ki neev hai.`,
      solution: [
        "GET /api/v1/orders?page=1&limit=50",
        "GET /health",
        "load --rps 500 --duration 6",
        "trace GET /api/v1/orders",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'trace', r => /pool/.test(r.worst)); },
      hints: [
        "Pehle observation: Ek normal request bhejo aur uska cost panel dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: `trace` se dekho ki waqt kahan gaya. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/orders?page=1&limit=50\nGET /health\nload --rps 500 --duration 6\ntrace GET /api/v1/orders",
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa kaam kaunsi layer par?',
      instructions: 'Har kaam ko uski sahi jagah par daalo.',
      bins: [
        { id: 'edge', label: '🌍 CDN / Edge' },
        { id: 'gw', label: '🚪 Gateway' },
        { id: 'svc', label: '⚙️ Service' },
      ],
      items: [
        { text: 'Product images aur JS bundles', bin: 'edge', explain: 'Public + immutable = CDN ka perfect candidate. User ke sabse paas, aur tumhara server bilkul involve nahi.' },
        { text: 'JWT verify karna (tum kaun ho?)', bin: 'gw', explain: 'AuthN gateway par. Ek jagah, sab services ke liye. Har service mein dobara likhna = ek din koi bhool jaayega.' },
        { text: 'Per-user rate limit — 100 req/min', bin: 'gw', explain: 'Baahar hi roko. Service tak aane diya toh thread + memory + shayad ek DB connection pehle hi kharch ho gaya.' },
        { text: '"Kya yeh user IS order ko dekh sakta hai?"', bin: 'svc', explain: 'AuthZ service mein. Gateway ko yeh pata nahi ki order kiska hai — us business rule ka maalik service hai.' },
        { text: 'Refund tabhi jab order 30 din se purana na ho', bin: 'svc', explain: 'Pura business rule. Ise gateway mein daalna matlab business logic ko infrastructure mein bikhraana.' },
        { text: 'TLS terminate karna', bin: 'gw', explain: 'Gateway/LB par. Har service ko certificate manage karwana ek operational duswapna hai.' },
        { text: 'Public blog post ka HTML', bin: 'edge', explain: 'Sab ke liye same content = CDN. Yahi cheez agar per-user hoti toh CDN par daalna ek security bug hota.' },
        { text: 'Order total calculate karna', bin: 'svc', explain: 'Core domain logic. Ise kabhi bhi edge par mat le jao — wahan na data hai na consistency.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Samajh pakki karo',
      questions: [
        {
          q: 'Health check 200 OK de raha hai par saare user requests timeout ho rahe hain. Sabse pehla shak kis par?',
          choices: ["DB pool health probe se chhoot gaya","CPU ke bina DB corrupt maan lo","Har instance LB se hat gaya","200 se user path healthy maan lo"],
          answer: 0,
          explain: 'Health checks jaan-boojh ke <b>saste</b> hote hain — woh sirf "process zinda hai" batate hain. Asli requests ko pool se connection, downstream calls, transactions sab chahiye. Isiliye "health pass" ≠ "traffic serve ho raha hai". Agar CPU high hoti toh CPU metric bol deta.',
         choiceExplanations: ["Health checks jaan-boojh ke <b>saste</b> hote hain — woh sirf \"process zinda hai\" batate hain. Asli requests ko pool se connection, downstream calls, transactions sab chahiye. Isiliye \"health pass\" ≠ \"traffic serve ho raha hai\". Agar CPU high hoti toh CPU metric bol deta.","CPU/DB corruption ko trace ya metrics ke bina infer nahi kar sakte.","LB targets hatne ka saboot chahiye; process probe 200 alag signal hai.","Probe sirf us path ka result hai; user path ka proof nahi."] },
        {
          q: 'Rate limiting service ke andar lagane mein sabse badi dikkat kya hai?',
          choices: ["Reject se pehle resources lag gaye","Gateway ki quota state stale hogi","429 ko client samajh nahi paayega","Service global quota bana nahi sakti"],
          answer: 0,
          explain: 'Rate limiting ka poora maqsad hai <b>kaam se bachna</b>. Agar tum request ko pehle andar aane do, connection allocate karo, phir 429 bolo — toh tumne bachaya kuch nahi, sirf ek error page add kiya. <b>Jitna baahar reject karo, utna sasta.</b>',
         choiceExplanations: ["Rate limiting ka poora maqsad hai <b>kaam se bachna</b>. Agar tum request ko pehle andar aane do, connection allocate karo, phir 429 bolo — toh tumne bachaya kuch nahi, sirf ek error page add kiya. <b>Jitna baahar reject karo, utna sasta.</b>","Gateway-state staleness service-side limit ka zaroori nateeja nahi.","Client 429 handle kar sakta hai; resource cost pehle lag chuki hai.","Service bhi coordinated global quota implement kar sakti hai."] },
        {
          q: "Ek request ka trace: app 5 ms · pool.acquire 9,900 ms · SQL 20 ms. Pehla kadam?",
          choices: ["Pool hold/leak trace karo","SQL par naya index abhi lagao","DB RAM ko abhi double kar do","Pool 50 se 500 abhi kar do"],
          answer: 0,
          explain: "SQL sirf 20 ms le raha hai — <b>query bilkul theek hai</b>, index lagane se kuch nahi hoga. Pool size andha-dhundh badhana bhi galat hai: har connection DB par ek process hai, aur 500 connections aksar 50 se DHEEME hote hain. Pehle <b>wajah</b> dhoondo: lambi transaction? leaked connection? ya sach mein capacity kam hai?",
         choiceExplanations: ["SQL sirf 20 ms le raha hai — <b>query bilkul theek hai</b>, index lagane se kuch nahi hoga. Pool size andha-dhundh badhana bhi galat hai: har connection DB par ek process hai, aur 500 connections aksar 50 se DHEEME hote hain. Pehle <b>wajah</b> dhoondo: lambi transaction? leaked connection? ya sach mein capacity kam hai?","20 ms SQL dominant 9900 ms pool wait ko explain nahi karta.","RAM badhne se held/leaked connections zaroor release nahi honge.","DB capacity validate kiye bina 500 connections contention badha sakte hain."] },
        {
          q: 'CDN par cache karne ke liye sabse zaroori shart kya hai?',
          choices: ["Reuse policy aur cache key safe ho","Response ka size 20 KB se kam ho","Payload ka format JSON hi ho","Origin har roz response badalta ho"],
          answer: 0,
          explain: "Safe shared-cache reuse ke liye privacy rules, Cache-Control aur complete cache key chahiye. Public data common case hai; personalized edge caching sirf explicit authorization/key isolation ke saath. Size/format akela criterion nahi.",
         choiceExplanations: ["Safe shared-cache reuse ke liye privacy rules, Cache-Control aur complete cache key chahiye. Public data common case hai; personalized edge caching sirf explicit authorization/key isolation ke saath. Size/format akela criterion nahi.","Small private response bhi shared key se leak ho sakta hai.","JSON/HTML format shared reuse ki permission decide nahi karta.","Daily updates freshness ka sawaal hain, privacy boundary ka nahi."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Request Path',
    instructions: 'Pehla round. Yahan interviewer dekhta hai ki tumhara mental model kitna gehra hai. 🎤',
    questions: [
      {
        q: '"Ek user bolta hai app slow hai. Tum kahan se shuru karoge?"',
        choices: ["Slow request ka trace dekho","CPU dekhkar scale karo","DB query ko tune karo","Instances ko double karo"],
        answer: 0,
        explain: 'Machine metrics batate hain <b>machine kaisi hai</b>. Trace batata hai <b>request ke saath kya hua</b>. p99 high hai — yeh sirf bataata hai ki problem hai; trace batata hai <b>kahan</b>. "Follow one request" seniority ka sabse saaf signal hai.',
       choiceExplanations: ["Machine metrics batate hain <b>machine kaisi hai</b>. Trace batata hai <b>request ke saath kya hua</b>. p99 high hai — yeh sirf bataata hai ki problem hai; trace batata hai <b>kahan</b>. \"Follow one request\" seniority ka sabse saaf signal hai.","CPU symptom useful hai, par slow hop identify nahi karta.","DB hi bottleneck hai yeh abhi pata nahi.","Scale tab madad karega jab measured bottleneck horizontally scalable ho."] },
      {
        q: '"Cache kahan lagaoge — CDN, gateway, app, ya DB?"',
        choices: ["Ownership aur freshness se layer chuno","Latency se Redis ko default chuno","Outer layer hone se CDN chuno","Infra bachane ke liye DB cache chuno"],
        answer: 0,
        explain: 'Sahi jawab "kahan" nahi, <b>"kiska data hai"</b> se aata hai. Public/immutable → jitna baahar utna achha. Per-user shared reuse sirf explicit privacy policy aur authorization-aware cache key ke saath. Aur har cache layer ek <b>invalidation problem</b> free mein deti hai — isliye jitni kam layers, utna achha.',
       choiceExplanations: ["Sahi jawab \"kahan\" nahi, <b>\"kiska data hai\"</b> se aata hai. Public/immutable → jitna baahar utna achha. Per-user shared reuse sirf explicit privacy policy aur authorization-aware cache key ke saath. Aur har cache layer ek <b>invalidation problem</b> free mein deti hai — isliye jitni kam layers, utna achha.","Redis speed ownership, invalidation aur leakage constraints ka jawab nahi.","Outer layer sasti ho sakti hai; private/shared reuse policy pehle.","DB cache sab request paths aur application freshness solve nahi karta."] },
      {
        terminal: {
          goal: 'Interviewer: "Yeh raha ek service jo dheemi chal rahi hai. 2 minute hain — mujhe batao problem kahan hai."',
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
            "Pehle observation: Load daalo taaki problem dikhe. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
            "Checklist ko kram se dekho. Aakhri proof: Trace karke bottleneck dhoondo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
            "Near-answer walkthrough; har command alag Enter se chalao:\nload --rps 500 --duration 6\ntrace GET /api/v1/orders",
          ],
        },
      },
      {
        q: "\"Tumhare service ka p99 200 ms hai. Tum ek nayi dependency add kar rahe ho jiska p99 150 ms hai. Naya p99 kya hoga?\"",
        choices: ["Distributions ke bina naya p99 unknown","Serial call mein naya p99 exactly 350 ms","Parallel call mein p99 exactly 200 ms","Fast dependency se p99 exactly 150 ms"],
        answer: 0,
        explain: "Do marginal p99 values se serial sum ya parallel maximum ka exact p99 nahi nikalta. Full latency distributions, correlation aur call pattern chahiye. Independent calls ka slow-event union alag calculation hai; latencies ke percentiles ko seedha add mat karo.",
       choiceExplanations: ["Do marginal p99 values se serial sum ya parallel maximum ka exact p99 nahi nikalta. Full latency distributions, correlation aur call pattern chahiye. Independent calls ka slow-event union alag calculation hai; latencies ke percentiles ko seedha add mat karo.","Per-request sums judte hain; separate p99 values ka sum p99 nahi.","Parallel max ki distribution aur correlation chahiye;200 guaranteed nahi.","Dependency existing service work ko replace nahi karti."] },
    ],
  },
  success: [
    'Ek request ke saare hops naam le ke bata sakte ho',
    'Bata sakte ho kaunsa hop rokta hai aur kaunsa queue banata hai',
    '<code>trace</code> se bottleneck dhoondh sakte ho',
    'Samjha sakte ho ki health green kyun rehta hai jab service mar rahi ho',
  ],
  homework: `Apne project ka ek asli endpoint chuno aur uske <b>saare hops</b> likho —
    CDN hai? gateway? cache? pool size kitna hai? Phir ek sawaal ka jawab dhoondo:
    <b>agar 10x traffic aa jaaye toh sabse pehle kaunsa hop bharega?</b>
    Zyadatar logon ka jawab "CPU" hota hai, aur zyadatar log galat hote hain.`,
  cards: [
    { front: 'Ek request ke hops?', back: 'DNS → TCP/TLS → CDN → LB → Gateway → Service → Cache → <b>Pool</b> → DB. Har layer ka kaam: <b>agli layer tak jaane se rokna</b>.' },
    { front: 'Health green par sab timeout — kyun?', back: 'Health checks jaan-boojh ke saste hain — sirf "process zinda hai". Woh na pool se connection lete hain, na dependencies chhute hain. <b>Health pass ≠ traffic serve ho raha hai.</b>' },
    { front: 'Trace mein: app 5ms, pool.acquire 9900ms, SQL 20ms — kya karoge?', back: 'Query ko haath mat lagao (woh 20ms hai). Dekho <b>connections kaun pakde hai</b> — lambi transaction, leak, ya asli overload. Pool andha-dhundh badhana ulta padta hai.' },
    { front: 'Rate limit kahan?', back: '<b>Gateway par</b> — jitna baahar ho sake. Service mein reject karne se pehle hi thread + memory + connection kharch ho chuka hota hai.' },
    { front: 'AuthN vs AuthZ kahan?', back: 'AuthN (tum <b>kaun</b> ho) = gateway, ek jagah sab ke liye. AuthZ (tum yeh <b>kar sakte</b> ho?) = service, kyunki business rule ka maalik wahi hai.' },
    { front: 'CDN par kya daal sakte ho?', back: 'Sirf woh jo <b>sab users ke liye ek jaisa</b> ho. Unsafe common cache key se per-user data leak ho sakta hai;private/no-store aur tested key isolation enforce karo.' },
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
     <p>Kisi bhi purane codebase mein yeh dikhega: rate limiting service ke
     andar, business rules gateway mein, aur per-user data CDN par.
     Har ek "kaam kar raha tha" — isliye kabhi theek nahi hua.</p>
     <p>Boundary decide karne ka ek hi asli sawaal hai:
     <b>"Is faisle ke liye zaroori GYAAN kiske paas hai?"</b></p>
     <table>
       <tr><th>Faisla</th><th>Gyaan chahiye</th><th>Jagah</th></tr>
       <tr><td>Yeh token asli hai?</td><td>public key — sab ke liye same</td><td>🚪 Gateway</td></tr>
       <tr><td>Yeh user IS order ko dekh sakta hai?</td><td>order kiska hai — sirf service jaanti hai</td><td>⚙️ Service</td></tr>
       <tr><td>Yeh user ne 100 req/min paar kiya?</td><td>counter — sab ke liye same</td><td>🚪 Gateway</td></tr>
       <tr><td>Refund allowed hai?</td><td>order date, policy, payment state</td><td>⚙️ Service</td></tr>
       <tr><td>Yeh email unique hai?</td><td>poori table — race condition safe</td><td>🗄️ DB constraint</td></tr>
     </table>
     <p class="tip">🎯 Aakhri row important hai. Application code mein
     "pehle SELECT karke check karo, phir INSERT karo" <b>hamesha</b> ek
     race condition hai. Uniqueness ka faisla sirf DB kar sakta hai,
     kyunki sirf uske paas poora sach hai.</p>`,
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
     <p>Naye developers poochhte hain "yeh duplicate nahi hai?" — nahi.
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
        { q: '"Kya yeh user IS order ka maalik hai?" — kahan?', target: 'service', explain: 'Service. Gateway ko pata hi nahi ki order kiska hai. Yeh gyaan sirf domain ke paas hai.' },
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
        { text: 'Ek client 5000 req/sec maar raha hai, baaki ko jagah nahi mil rahi', bin: 'rl', explain: 'Fairness ka masla — ek client ko uski limit mein rakho. 429 + Retry-After bhejo.' },
        { text: 'Free plan wala user is mahine ke 1M calls kar chuka', bin: 'q', explain: 'Business rule, capacity ka masla nahi. System bilkul serve kar sakta hai — tum nahi karna chahte. 402 Payment Required ya 403.' },
        { text: 'Saare DB connections busy hain, queue 8000 tak pahunch gayi', bin: 'bp', explain: 'Tumhari halat kharab hai, client ki galti nahi. 503 + Retry-After. Isse client ko pata chalta hai ki dobara koshish karna theek hai.' },
        { text: 'Ek buggy mobile release har 100ms par poll kar raha hai', bin: 'rl', explain: 'Per-client limit. Yeh galti client ki hai aur 429 usse yahi batata hai.' },
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
      successText: `Do guards, do alag khatre. <code>maxLimit</code> ne <b>ek request</b> ko
        bahut bada hone se roka. <code>rate limit</code> ne <b>bahut saari requests</b> ko roka.
        Dono chahiye — ek ke bina doosra adhoora hai.
        <br><br>Aur dhyaan do ki dono <b>gateway</b> par hain: ab yeh requests service tak
        pahunchti hi nahi, isliye na thread lagta hai na connection.`,
      solution: [
        "GET /api/v1/transactions?limit=1000",
        "sim set api.maxLimit 100",
        "GET /api/v1/transactions?limit=1000",
        "sim add ratelimit --rps 100 --burst 120",
        "GET /api/v1/transactions -n 300",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.maxLimit === 100 && s.sys.api.rateLimit?.rps === 100 && s.sys.api.rateLimit?.burst === 120 && m.current(s, 'http', r => r.status === 429 && r.blocked > 0); },
      hints: [
        "Pehle observation: Dekho ki ?limit=1000 bina rok-tok chal jaata hai. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Burst bhejo aur 429 khaao. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?limit=1000\nsim set api.maxLimit 100\nGET /api/v1/transactions?limit=1000\nsim add ratelimit --rps 100 --burst 120\nGET /api/v1/transactions -n 300",
      ],
    },
    {
      type: 'quiz',
      title: 'Boundaries pakki karo',
      questions: [
        {
          q: 'App code mein: "SELECT karke dekho email exist karta hai? nahi? toh INSERT karo." Kya problem hai?',
          choices: ["Concurrent inserts race kar sakte hain","Do queries se corruption zaroor hoga","SELECT se uniqueness lock ho jaati hai","Index hone se race khatam hoti hai"],
          answer: 0,
          explain: 'Yeh classic <b>check-then-act</b> race hai. Do concurrent requests dono ko lagega email free hai. Uniqueness ka faisla sirf <b>DB unique constraint</b> kar sakta hai, kyunki sirf usi ke paas poora, atomic sach hai. App wali check UX ke liye rakho — guarantee ke liye nahi.',
         choiceExplanations: ["Yeh classic <b>check-then-act</b> race hai. Do concurrent requests dono ko lagega email free hai. Uniqueness ka faisla sirf <b>DB unique constraint</b> kar sakta hai, kyunki sirf usi ke paas poora, atomic sach hai. App wali check UX ke liye rakho — guarantee ke liye nahi.","Two-query overhead hai, par corruption guaranteed conclusion nahi.","Ordinary SELECT doosre concurrent INSERT ko reserve nahi karta.","Read index speed badhata hai; UNIQUE constraint invariant enforce karega."] },
        {
          q: 'System overload hai. Client ko kaunsa status code sabse sahi hai?',
          choices: ["503 aur suitable Retry-After","429 aur client quota message","400 aur payload validation message","404 aur missing-route message"],
          answer: 0,
          explain: '<b>429 = tumne bahut maara.</b> <b>503 = main bhara hua hoon.</b> Overload par 429 bhejna client ko galat sandesh deta hai — usne kuch galat nahi kiya. Aur 500 bhejna toh sabse bura hai: woh "bug" ka signal hai, aur achhe clients 500 par retry nahi karte — jabki yahan retry bilkul theek tha.',
         choiceExplanations: ["<b>429 = tumne bahut maara.</b> <b>503 = main bhara hua hoon.</b> Overload par 429 bhejna client ko galat sandesh deta hai — usne kuch galat nahi kiya. Aur 500 bhejna toh sabse bura hai: woh \"bug\" ka signal hai, aur achhe clients 500 par retry nahi karte — jabki yahan retry bilkul theek tha.","429 client-specific rate limit ke liye; yahan service overload diya hai.","Overload valid payload ko bad request nahi banata.","Overload se existing route missing nahi ho jaata."] },
        {
          q: "CDN shared cache mein per-user API response common key se reuse ho raha hai. Risk?",
          choices: ["Shared key se cross-user leak ho sakta","Har response automatically private hoga","Cookie hone se cache ruk jaayega","Stale data hi eklauta risk rahega"],
          answer: 0,
          explain: "Agar cache key user isolation nahi rakhti aur response shared-cacheable ho, toh doosre user ko private data mil sakta hai. Cache-Control private/no-store aur tested authorization-aware cache keys use karo. Cookie akela caching prevent nahi karta.",
         choiceExplanations: ["Agar cache key user isolation nahi rakhti aur response shared-cacheable ho, toh doosre user ko private data mil sakta hai. Cache-Control private/no-store aur tested authorization-aware cache keys use karo. Cookie akela caching prevent nahi karta.","Shared cache ko explicit policy/key isolation chahiye.","Set-Cookie akela shared caching ko prohibit nahi karta.","Wrong-user data freshness se zyada serious isolation failure hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Boundaries',
    instructions: 'Ab interviewer tumhe uljhane ki koshish karega. 🎤',
    questions: [
      {
        q: '"Validation client, gateway, service aur DB — chaaron jagah hai. Yeh duplicate code nahi hai?"',
        choices: ["Alag layer alag invariant enforce kare","Sirf client saari validation kare","Sirf gateway saare rules enforce kare","Sirf service UNIQUE check karke chhode"],
        answer: 0,
        explain: 'Yeh <b>defence in depth</b> hai, duplication nahi. Client wali hata do → form kharab lagega. DB wali hata do → <b>data</b> kharab ho jaayega. Alag layer, alag khatra, alag guarantee.',
       choiceExplanations: ["Yeh <b>defence in depth</b> hai, duplication nahi. Client wali hata do → form kharab lagega. DB wali hata do → <b>data</b> kharab ho jaayega. Alag layer, alag khatra, alag guarantee.","Client bypass ho sakta hai; server invariants phir bhi chahiye.","Gateway resource-level business state aur DB races own nahi karta.","Service ka pre-check concurrent writes ki UNIQUE guarantee nahi."] },
      {
        q: '"Tumhare paas 20 microservices hain. Auth kahan karoge?"',
        choices: ["Edge identity; service resource permissions","Gateway auth se internal callers trusted","Har request par central auth RPC zaroori","JWT valid toh har resource access allowed"],
        answer: 0,
        explain: "Gateway par identity verify karna common pattern hai; services ko trusted caller identity aur resource-level permissions enforce karni chahiye. Defense-in-depth JWT verification bhi valid hai. Central auth RPC har request par mandatory nahi.",
       choiceExplanations: ["Gateway par identity verify karna common pattern hai; services ko trusted caller identity aur resource-level permissions enforce karni chahiye. Defense-in-depth JWT verification bhi valid hai. Central auth RPC har request par mandatory nahi.","Internal caller bhi identity verify/boundary policy se authorize hona chahiye.","Local token verification/policy possible hai; synchronous RPC mandatory nahi.","Valid identity resource ownership ya operation permission prove nahi karti."] },
      {
        q: '"Tumhari service downstream payment provider ki 1000 rps limit paar kar rahi hai. Kya karoge?"',
        choices: ["Bounded queue aur outbound rate limit","Provider 429 par immediate retry loop","Unlimited queue se saara load rakh lo","Har caller ko apni quota galti batao"],
        answer: 0,
        explain: "Provider limit ke neeche outbound rate limit rakho; queue bounded ho aur deadline/expiry observable ho. Jobs accept karna possible na ho toh explicit backpressure do. Provider ki quota ko client ki quota galti mat bolo.",
       choiceExplanations: ["Provider limit ke neeche outbound rate limit rakho; queue bounded ho aur deadline/expiry observable ho. Jobs accept karna possible na ho toh explicit backpressure do. Provider ki quota ko client ki quota galti mat bolo.","Immediate retries provider ka overload aur badha sakti hain.","Unlimited queue memory, delay aur expired work accumulate karti hai.","Client quota cross nahi hui; overload/backpressure ko honest status do."] },
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
    Agar app code mein hai, toh woh ek race condition hai. Test karo:
    do requests theek ek saath bhejo aur dekho kya hota hai.`,
  cards: [
    { front: 'Boundary decide karne ka sawaal?', back: '<b>"Is faisle ke liye zaroori gyaan kiske paas hai?"</b> Public key gateway ke paas → AuthN wahan. Order kiska hai — service ke paas → AuthZ wahan.' },
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
    'Latency ke woh numbers jo har engineer ko pata hone chahiye',
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
     average anubhav nahi karta — woh <b>apni</b> request anubhav karta hai.
     Aur agar tumhare 10 lakh requests roz hain, toh p99 ka matlab hai
     <b>10,000 log roz</b> 5 second ruk rahe hain.</p>
     <p>Percentile padhne ka sahi tareeka:</p>
     <table>
       <tr><th>Metric</th><th>Kya batata hai</th><th>Kab dekho</th></tr>
       <tr><td>p50</td><td>"normal din kaisa hai"</td><td>capacity planning</td></tr>
       <tr><td>p95</td><td>"thoda kharab din"</td><td>SLO ke liye aksar yahi</td></tr>
       <tr><td>p99</td><td>"sabse kharab 1%"</td><td>tail problems dhoondhne</td></tr>
       <tr><td>p99.9</td><td>"tumhare sabse bade users"</td><td>heavy users ka data zyada hota hai — unka p50 tumhara p99.9 hai</td></tr>
       <tr><td>max</td><td>"ek bar aisa hua tha"</td><td>alerting ke liye bekaar</td></tr>
     </table>
     <p class="tip">🎯 Ek gehri baat: <b>tumhare sabse bade customer ka
     har request tumhara p99 hai.</b> Uske paas 10x data hai, isliye uski
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
     load ke <i>baad</i> load ho — unki latency user ke first paint mein
     ginni hi nahi chahiye.</p>
     <p><b>3. Hedged requests.</b> p95 par doosri copy bhej do, jo pehle
     aaye woh lo. Thoda extra load, bahut behtar tail.</p>`,
  ],
  stages: [
    {
      type: 'quiz',
      title: 'Percentiles padhna seekho',
      questions: [
        {
          q: "Dashboard: average 40 ms, p50 12 ms, p99 3200 ms. Sabse zaroori baat?",
          choices: ["Tail slow hai; average use chhupa raha","p50 low hai toh sab users fast hain","Mean low hai toh SLO pass maana jaaye","Mean-p50 gap se dashboard invalid hai"],
          answer: 0,
          explain: 'Average (40) p50 (12) se bahut zyada hai — yeh khud batata hai ki tail bhaari hai. 10 lakh requests/din par p99 = 3.2s ka matlab <b>10,000 log roz</b> 3 second ruk rahe hain. Woh sab support ticket ya uninstall ban sakte hain.',
         choiceExplanations: ["Average (40) p50 (12) se bahut zyada hai — yeh khud batata hai ki tail bhaari hai. 10 lakh requests/din par p99 = 3.2s ka matlab <b>10,000 log roz</b> 3 second ruk rahe hain. Woh sab support ticket ya uninstall ban sakte hain.","p50 median hai; slow 1% ko exclude karta hai.","SLO defined percentile par hai; mean uska substitute nahi.","Skewed latency distribution mein mean aur median differ karte hain."] },
        {
          q: "8 independent calls parallel hain; har call ki slow-event probability 1%hai. Kisi ek ke slow hone ki chance?",
          choices: ["Lagbhag 7.7% pages ka koi call slow","1%pages slow; parallelism tails hataata","0.125%pages slow; calls share karte","64%pages slow; percentages multiply"],
          answer: 0,
          explain: "Independence aur har call ki1%slow-event probability assume karo:1-(0.99^8)=0.0773, lagbhag 7.7%. Yeh any-slow event probability hai; page ka exact latency p99 nahi.",
         choiceExplanations: ["Independence aur har call ki1%slow-event probability assume karo:1-(0.99^8)=0.0773, lagbhag 7.7%. Yeh any-slow event probability hai; page ka exact latency p99 nahi.","Independent calls mein any-slow probability 1-0.99^8 hai.","Parallel execution individual slow probability ko 8 se divide nahi karta.","Any-slow union ke liye complement product use karo."] },
        {
          q: 'p99 theek karne ka sabse asardaar pehla kadam aksar kya hota hai?',
          choices: ["Trace se tail ka dominant hop pakdo","CPU dekhkar sab instances scale karo","Retry count ko pehle double kar do","Freshness bina cache TTL badha do"],
          answer: 0,
          explain: "Pehle slow requests ki traces se dominant critical-path wait identify karo. Fan-out reduce karna tab useful hai jab measured tail mein dependencies contribute kar rahi hon; har p99 incident ka universal fix nahi.",
         choiceExplanations: ["Pehle slow requests ki traces se dominant critical-path wait identify karo. Fan-out reduce karna tab useful hai jab measured tail mein dependencies contribute kar rahi hon; har p99 incident ka universal fix nahi.","CPU upgrade tab jab CPU measured tail cause ho.","Retries slow dependency par extra work aur tail add karte hain.","TTL change stale-data tradeoff hai; bottleneck pehle identify karo."] },
      ],
    },
    {
      type: 'match',
      title: 'Latency numbers yaad karo',
      instructions: 'Har operation ko uske order-of-magnitude se jodo.',
      pairs: [
        { left: 'CPU L1 cache reference', right: '~1 nanosecond', explain: 'Sabse tez cheez jo hoti hai. Baaki sab isi se compare hota hai.' },
        { left: 'Main memory (RAM) read', right: '~100 nanoseconds', explain: 'RAM cache se ~100x dheema — par disk se ~1000x tez. Isiliye in-memory cache itna kaam karta hai.' },
        { left: 'SSD random read', right: '~100 microseconds (0.1 ms)', explain: 'RAM se ~1000x dheema. Yahi wajah hai ki buffer pool mein data hona itna matter karta hai.' },
        { left: 'Same datacenter round trip', right: '~0.5 milliseconds', explain: 'Ek network hop lagbhag muft lagta hai — par 100 hops nahi. Fan-out isi liye mehenga hai.' },
        { left: 'Simple indexed DB query', right: '~1–5 milliseconds', explain: 'Achhi query ka target. Isse zyada lag raha hai toh EXPLAIN chalao.' },
        { left: 'India → US round trip', right: '~150 milliseconds', explain: 'Yeh light ki speed ki limit hai — koi optimization ise nahi todega. Isiliye CDN aur regional deployment.' },
      ],
    },
    {
      type: 'terminal',
      title: '📊 Tail ko pakdo',
      goal: 'Ek endpoint ka p99 SLO tod raha hai. Load daal ke dekho ki p50 aur p99 mein kitna farak hai, phir SLO ka error budget nikalo.',
      sys: SD.sys.orders({ db: { longTxHolding: 40 } }),
      tasks: T_TAIL,
      success: SD.allTasks(T_TAIL),
      successText: `Dekha? <b>p50 theek lag raha tha, p99 aag laga raha tha.</b> Agar tum sirf
        average dekhte toh kabhi pata hi nahi chalta.
        <br><br>Aur error budget ne ek aur baat batayi: 99.9% ka matlab mahine mein sirf
        <b>43 minute</b> ki chhoot. Ek hi kharab deploy pura mahine ka budget kha sakta hai.`,
      solution: [
        "load --rps 400 --duration 8",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'load', r => r.rps === 400) && m.latest(s, 'slo')?.avail === 99.9; },
      hints: [
        "Pehle observation: 400 rps ka load daalo aur p50 vs p99 ka farak dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: 99.9% availability ka error budget nikalo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nload --rps 400 --duration 8\nslo --availability 99.9",
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Latency',
    instructions: 'Numbers ke baare mein saaf bolna seniority ka signal hai. 🎤',
    questions: [
      {
        q: "\"Tumhara SLO p99 < 200 ms hai. Tum ek dependency add kar rahe ho jiska p99 180 ms hai. Kya problem hai?\"",
        choices: ["Critical path aur timeout budget check","180<200 se budget safe maan lo","Retry 2 se latency budget bacha lo","Dependency median se p99 certify karo"],
        answer: 0,
        explain: 'Uska p99 lagbhag tumhara <b>poora</b> budget hai — tumhare apne kaam ke liye kuch nahi bacha. Aur retry toh ulta latency badhata hai. Sahi soch: timeout apne SLO se kam rakho, fallback socho, aur poochho ki yeh call sync honi bhi chahiye ya nahi.',
       choiceExplanations: ["Uska p99 lagbhag tumhara <b>poora</b> budget hai — tumhare apne kaam ke liye kuch nahi bacha. Aur retry toh ulta latency badhata hai. Sahi soch: timeout apne SLO se kam rakho, fallback socho, aur poochho ki yeh call sync honi bhi chahiye ya nahi.","App, queue aur network ko bhi 200 ms budget ka hissa chahiye.","Retries same deadline mein time aur load consume karte hain.","Median se tail percentile guarantee nahi milti."] },
      {
        q: '"Ek customer bolta hai app unke liye bahut slow hai, par hamare dashboards green hain. Kaise debug karoge?"',
        choices: ["Customer-specific traces aur slices dekho","Green global mean se case close karo","Browser ko bina trace replace karao","Instances bina bottleneck badha do"],
        answer: 0,
        explain: 'Aggregate metrics bade customers ko <b>chhupa dete</b> hain — woh sankhya mein kam hain par unka har request tail mein hai. Isiliye per-tenant / per-endpoint percentiles rakho. "Dashboard green hai isliye problem nahi hai" — yeh sabse mehenga jhooth hai monitoring mein.',
       choiceExplanations: ["Aggregate metrics bade customers ko <b>chhupa dete</b> hain — woh sankhya mein kam hain par unka har request tail mein hai. Isiliye per-tenant / per-endpoint percentiles rakho. \"Dashboard green hai isliye problem nahi hai\" — yeh sabse mehenga jhooth hai monitoring mein.","Global aggregate tenant-specific slow queries chhupa sakta hai.","Client evidence useful hai, par browser blame bina measurement nahi.","Extra capacity tenant data-size/skew ya query-shape ko zaroor fix nahi karti."] },
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
    Phir poochho: <b>kitni downstream calls</b> karta hai yeh endpoint? Kya sabhi zaroori hain?`,
  cards: [
    { front: 'Average kyun jhooth bolta hai?', back: '99 requests 10ms + 1 request 5000ms = average 59ms 😊 par p99 = 5000ms 😡. Average ka kaam hi outliers ko <b>ghol dena</b> hai — user apni request anubhav karta hai, average nahi.' },
    { front: 'Tail amplification formula?', back: "<code>P(any slow) = 1 − (1−p)ⁿ</code> independent equal-p events ke liye. n=5, p=1% → 4.9%; n=100 → 63%. Exact page p99 correlation, deadlines aur wait-for-all behavior par depend hai." },
    { front: 'p99 theek karne ka pehla kadam?', back: 'Aksar <b>fan-out kam karo</b> — calls ghatao ya optional calls ko async karo. Har service ko 2x tez karne se zyada asar hota hai.' },
    { front: 'Bade customers aur p99?', back: 'Unke paas 10x data hai, isliye unki har query tail mein baithti hai. <b>Unka p50 tumhara p99 hai.</b> Per-tenant percentiles rakho.' },
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
    'Yeh numbers interview mein bol ke dikhana',
  ],
  lesson: [
    `<h3>📖 Teen numbers, poora system</h3>
     <p>System design interview mein "scale kar lenge" bolna sabse kamzor
     jawab hai. Do line ka hisaab uske jagah bahut aage le jaata hai.
     Sirf teen cheezein yaad rakho:</p>
     <pre>1 din      = 86,400 seconds   (≈ 10⁵ maan lo, math aasan)
1 M/din    ≈ 12 rps
peak       = average × 2–5     (flash sale? × 50)</pre>
     <p>Ab kuch bhi nikal sakte ho:</p>
     <pre>12 lakh users/din, har ek 2 requests
  = 24 lakh req/din
  = 24,00,000 / 86,400 ≈ 28 rps average
  = 28 × 3 ≈ 84 rps peak      ← ISKE liye design karo

Har record 2 KB:
  28 × 2 KB × 86,400  = 4.8 GB/din
  × 365               = 1.8 TB/saal
  × 3 (replication)   = 5.3 TB  ← yeh number budget meeting mein chahiye</pre>`,
    `<h3>🔬 Little's Law — poore Resilience track ki neev</h3>
     <p>Ek hi formula, aur woh sab kuch bata deta hai:</p>
     <pre>L = λ × W
concurrency = arrival rate × service time</pre>
     <p>500 requests/sec aa rahi hain, har ek 20 ms leti hai:</p>
     <pre>L = 500 × 0.020 = 10 requests ek saath andar</pre>
     <p>Matlab tumhe <b>10 connections</b> chahiye, 500 nahi. Yeh sabse
     bada gurumantra hai pool sizing ke liye — log aksar rps jitna pool
     bana dete hain, jo bilkul galat hai.</p>
     <p>Ulta karke padho toh aur bhi kaam ka hai:</p>
     <pre>capacity = pool_size × (1000 / service_ms)

pool 50, query 20 ms → 50 × 50  = 2,500 rps  ✅
pool 50, query 200 ms → 50 × 5  =   250 rps  ⚠️
pool 50, query 8 s    → 50 × 0.125 =  6 rps  💀</pre>
     <p class="tip">🎯 Dekho kya hua: <b>query 10x dheemi hui toh capacity
     10x gir gayi.</b> Isiliye ek slow query poore system ko gira sakti hai,
     chahe CPU 10% ho. Yahi woh pul hai jo "deep pagination" ko "3AM outage"
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
      successText: `Ab tumhare paas <b>numbers</b> hain, feelings nahi. Interview mein yeh do line —
        "average ~28 rps, peak ~84 rps, saal bhar mein 5.3 TB with replication" —
        "hum scale kar lenge" se hazaar guna behtar hai.
        <br><br>Aur error budget ne bata diya ki 99.9% kitna sakht hai: <b>mahine mein 43 minute</b>.`,
      solution: [
        "estimate --users 1200000 --rps 28 --bytes 2048",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'estimate')?.users === 1200000 && m.latest(s, 'estimate')?.rps === 28 && m.latest(s, 'slo')?.avail === 99.9; },
      hints: [
        "Pehle observation: 12,00,000 users, 2 KB per record ka estimate nikalo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: 99.9% SLO ka error budget dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nestimate --users 1200000 --rps 28 --bytes 2048\nslo --availability 99.9",
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
          choices: ["10 busy connections average honge","500 busy connections average honge","50 busy connections average honge","1 busy connection average hoga"],
          answer: 0,
          explain: "Steady-state 500 requests/s aur har request 20 ms DB connection hold karti hai:Little’s Law se average busy connections 500*0.020=10. Yeh production pool-size recommendation nahi; bursts, tail hold time aur headroom alag validate karo.",
         choiceExplanations: ["Steady-state 500 requests/s aur har request 20 ms DB connection hold karti hai:Little’s Law se average busy connections 500*0.020=10. Yeh production pool-size recommendation nahi; bursts, tail hold time aur headroom alag validate karo.","Little:500/s*0.020s=10; arrival rate connection count nahi.","50 chosen pool setting hai; given average occupancy 10 hai.","One connection 20 ms par max 50 requests/s serve karega."] },
        {
          q: 'Peak traffic ka andaza kaise lagate ho?',
          choices: ["Traffic history aur event burst model karo","Daily average ko fixed 2x kar do","Uniform arrival sab users par maan lo","Sirf load-test limit ko demand maan lo"],
          answer: 0,
          explain: 'Consumer apps mein traffic din bhar mein bahut unequal hota hai — shaam ka peak average se 3-4x ho sakta hai. Par <b>predictable events</b> alag category hain: board results, IPL ticket sale, flash sale. Wahan "average × 3" bilkul bekaar hai.',
         choiceExplanations: ["Consumer apps mein traffic din bhar mein bahut unequal hota hai — shaam ka peak average se 3-4x ho sakta hai. Par <b>predictable events</b> alag category hain: board results, IPL ticket sale, flash sale. Wahan \"average × 3\" bilkul bekaar hai.","Fixed 2x empirical demand ya sale bursts ka substitute nahi.","Users correlated bursts la sakte hain; uniform arrivals assumption verify karo.","Load test capacity batata hai; actual demand forecast alag chahiye."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Estimation',
    instructions: 'Yahan interviewer dekhta hai ki tum hisaab lagate ho ya andaza. 🎤',
    questions: [
      {
        q: "10 lakh users*5 photos/day*2 MB;365 days. Replication ke bina logical storage?",
        choices: ["3.65 PB logical storage per year","10 TB logical storage per year","100 TB logical storage per year","11 PB logical storage per year"],
        answer: 0,
        explain: "Decimal units:1 million*5*2 MB=10 TB/day;365 days par 3.65 PB logical. Three copies lagbhag 10.95 PB physical, plus metadata/overhead. Image objects ke liye object storage evaluate karo.",
       choiceExplanations: ["Decimal units:1 million*5*2 MB=10 TB/day;365 days par 3.65 PB logical. Three copies lagbhag 10.95 PB physical, plus metadata/overhead. Image objects ke liye object storage evaluate karo.","10 TB per day hai; year mein 365 se multiply karo.","5 million photos/day*2 MB*365=3.65 PB decimal units.","11 PB three-copy physical estimate hai; logical raw total 3.65 PB."] },
      {
        q: '"Tumhara pool 50 hai aur ek query 8 second le rahi hai. Kitni rps handle kar loge?"',
        choices: ["6.25 rps ideal upper bound","50 rps ideal upper bound","400 rps ideal upper bound","625 rps ideal upper bound"],
        answer: 0,
        explain: "Little's Law ka ulta roop: <code>capacity = pool × (1000 / service_ms)</code>. 6 rps par koi bhi real traffic queue bana dega. Yeh jawab isliye taakatwar hai kyunki yeh <b>slow query</b> ko seedha <b>outage</b> se jodta hai — aur wahi asli kahani hoti hai.",
       choiceExplanations: ["Little's Law ka ulta roop: <code>capacity = pool × (1000 / service_ms)</code>. 6 rps par koi bhi real traffic queue bana dega. Yeh jawab isliye taakatwar hai kyunki yeh <b>slow query</b> ko seedha <b>outage</b> se jodta hai — aur wahi asli kahani hoti hai.","50 slots hain; har slot 8s occupied hai,1s nahi.","50*8=400 occupancy-time multiply karta hai; rate divide hoga.","Milliseconds/seconds convert karo:50/8=6.25 rps."] },
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
    { front: 'Storage kaise nikalte ho?', back: '<code>rps × bytes × 86400</code> = per din. × 365 = per saal. <b>× 3 replication</b> — yeh aakhri step log bhool jaate hain aur budget teen guna galat ho jaata hai.' },
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
    '<code>202 Accepted</code> aur uska status endpoint',
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
     <p><b>Test — sync mein sirf woh cheez rakho jo:</b></p>
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
     <p>Yeh chhota sa status code poore async design ko client ke saamne
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
     ka problem <b>consistency</b> ke problem se badal liya. Yeh aksar
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
        { text: 'Order DB mein likhna', bin: 'sync', explain: 'User ko order ID chahiye jawab mein. Aur yeh fail ho toh poora kaam radd — dono shartein poori.' },
        { text: 'Payment authorize karna', bin: 'sync', explain: 'Card decline ho toh user ko TURANT pata chalna chahiye. Baad mein "aapka payment fail ho gaya" bhejna bura anubhav hai.' },
        { text: 'Stock available hai ya nahi check karna', bin: 'sync', explain: 'Order lene ka matlab hi tab hai jab cheez hai. Baad mein cancel karna sabse mehenga customer experience hai.' },
        { text: 'Confirmation email bhejna', bin: 'async', explain: 'User ne order screen par confirmation dekh liya. Email 2 second baad aaye ya 20 — koi farak nahi. Aur email service down hone se order fail nahi hona chahiye.' },
        { text: 'Warehouse ko notify karna', bin: 'async', explain: 'Shipping ghante mein hoti hai, millisecond mein nahi. Queue + retry se yeh zyada reliable bhi ho jaata hai.' },
        { text: 'Analytics event bhejna', bin: 'async', explain: 'Kabhi bhi analytics ko user request block nahi karni chahiye. Yeh sabse aasan async decision hai.' },
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
        { text: 'Queue mein message daalo', explain: 'Ab worker ise uthayega. (Aage <b>outbox pattern</b> milega — jo isi do-step ko atomic banata hai.)' },
        { text: '202 Accepted + Location: /reports/:id lautao', explain: '200 nahi — <b>202</b>. Kaam hua nahi hai, sirf maan liya gaya hai. Location header client ko batata hai ki status kahan dekhna hai.' },
        { text: 'Worker job uthaye, status: processing karo', explain: 'Ab client poll karega toh use pata chalega ki kaam chal raha hai — "kuch nahi ho raha" wala confusion khatm.' },
        { text: 'Kaam khatam — status: done + result URL', explain: 'Client ko poll se ya webhook se pata chal jaata hai. Result ko alag URL par rakhna behtar hai — woh cacheable ho jaata hai.' },
        { text: 'Fail hua toh retry, phir DLQ', explain: 'Bina DLQ ke ek kharab message infinite retry mein ja sakta hai aur poori queue rok sakta hai. DLQ = "isse alag rakh do, insaan dekhega".' },
      ],
    },
    {
      type: 'quiz',
      title: 'Async ki samajh',
      questions: [
        {
          q: 'Async kaam ke liye sabse sahi status code?',
          choices: ["202 aur job-status resource do","200 se background work complete bolo","201 se har queued request create bolo","204 se status tracking hata do"],
          answer: 0,
          explain: '<b>202 = "maine le liya, abhi kiya nahi"</b>. 200 bhejna jhooth hai. 201 tabhi jab resource sach mein ban gaya ho. 202 + Location client ko batata hai ki kaam pending hai aur status kahan milega.',
         choiceExplanations: ["<b>202 = \"maine le liya, abhi kiya nahi\"</b>. 200 bhejna jhooth hai. 201 tabhi jab resource sach mein ban gaya ho. 202 + Location client ko batata hai ki kaam pending hai aur status kahan milega.","Work incomplete hai;200 ko completed operation kehna misleading hoga.","201 created resource ke liye hai; generic deferred execution ka signal 202.","No-body response se client ko completion ka observability contract nahi milta."] },
        {
          q: 'Order flow mein email bhejna sync tha aur email service down ho gayi. Kya hoga?',
          choices: ["Checkout fail dikh sakta; effects reh sakte","Email failure order ko rollback karegi","Payment automatically refund ho jaayega","Email optional hone se timeout skip hoga"],
          answer: 0,
          explain: 'Yahi sync ka sabse bada khatra hai: <b>tumne apni availability ko sabse kamzor dependency se baandh diya</b>. Agar order 99.9% reliable hai aur email 99% toh combined = 98.9%. Har sync dependency tumhari availability ko <b>guna</b> karti hai.',
         choiceExplanations: ["Yahi sync ka sabse bada khatra hai: <b>tumne apni availability ko sabse kamzor dependency se baandh diya</b>. Agar order 99.9% reliable hai aur email 99% toh combined = 98.9%. Har sync dependency tumhari availability ko <b>guna</b> karti hai.","Remote email failure local committed order ko automatic rollback nahi karti.","Refund ke liye explicit compensating action chahiye.","Sync dependency timeout deti rahegi jab tak app handling badle."] },
        {
          q: 'Unbounded queue rakhne mein kya problem hai?',
          choices: ["Backlog aur waits grow karenge","Queue message format badal jaaye","Consumer capacity apne aap badhe","Queue purane tasks cancel kar de"],
          answer: 0,
          explain: 'Unbounded queue = <b>"failure baad mein, aur bada"</b>. Agar producers consumers se tez hain toh queue kabhi khaali nahi hogi. 4 ghante purana notification bhejne ka koi matlab hi nahi. Bounded queue + backpressure batati hai ki problem <b>abhi</b> hai — jab woh choti hai.',
         choiceExplanations: ["Unbounded queue = <b>\"failure baad mein, aur bada\"</b>. Agar producers consumers se tez hain toh queue kabhi khaali nahi hogi. 4 ghante purana notification bhejne ka koi matlab hi nahi. Bounded queue + backpressure batati hai ki problem <b>abhi</b> hai — jab woh choti hai.","Queue size limit message schema ko change nahi karti.","Buffer capacity consumer service rate nahi badhata.","Deadlines/expiry implement kiye bina stale tasks khud cancel nahi hote."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Sync vs Async',
    instructions: 'Yeh sawaal lagbhag har design interview mein aata hai. 🎤',
    questions: [
      {
        q: '"Kaise decide karoge ki koi kaam sync ho ya async?"',
        choices: ["Response needs aur failure contract dekho","Sirf duration dekhkar async chuno","Sirf external call dekhkar async chuno","Sirf throughput dekhkar async chuno"],
        answer: 0,
        explain: '"Dheema hai isliye async" adhoora hai — payment dheema hai par sync hona chahiye. Sahi test <b>zaroorat</b> aur <b>atomicity</b> hai. Aur "sab async" bhi galat hai: har async kaam ek naya failure mode, ek retry story aur ek status UI maangta hai.',
       choiceExplanations: ["\"Dheema hai isliye async\" adhoora hai — payment dheema hai par sync hona chahiye. Sahi test <b>zaroorat</b> aur <b>atomicity</b> hai. Aur \"sab async\" bhi galat hai: har async kaam ek naya failure mode, ek retry story aur ek status UI maangta hai.","Slow result bhi user response ke liye mandatory ho sakta hai.","External authorization/payment confirmation synchronous requirement rakh sakti hai.","Throughput ke saath ordering, feedback aur durability contract bhi chahiye."] },
      {
        q: '"Async karne se tumhe kya naya problem mila?"',
        choices: ["Delivery aur completion state manage karo","Queue se duplicates khud khatam honge","HTTP success se job complete maan lo","Consumer error se producer rollback hoga"],
        answer: 0,
        explain: 'Yeh jawab seniority dikhata hai. Async ek <b>trade</b> hai: latency ka problem gaya, consistency ka problem aaya. Ab chahiye idempotent consumers, DLQ, status endpoint, aur bounded queue. Jo candidate sirf faayde ginata hai, usne production mein async nahi chalaya.',
       choiceExplanations: ["Yeh jawab seniority dikhata hai. Async ek <b>trade</b> hai: latency ka problem gaya, consistency ka problem aaya. Ab chahiye idempotent consumers, DLQ, status endpoint, aur bounded queue. Jo candidate sirf faayde ginata hai, usne production mein async nahi chalaya.","Common brokers redeliver karte hain; idempotent consumers chahiye.","Accepted request aur finished job alag states hain.","Async producer aur consumer ki transactions automatic shared nahi hoti."] },
    ],
  },
  success: [
    'Do sawaal ke test se sync/async decide kar sakte ho',
    '202 Accepted + status endpoint ka pattern jaante ho',
    'Async ke chaaron naye problem aur unke ilaaj bata sakte ho',
    'Samjha sakte ho ki har sync dependency availability ko guna karti hai',
  ],
  homework: `Apne sabse dheeme <code>POST</code> endpoint ko dekho. Har kaam ke saamne do sawaal
    likho — "user ke jawab ke liye zaroori?" aur "fail ho toh sab radd?".
    Jitne kaamon par dono "nahi" hain, unhe queue mein daal ke dekho latency kitni girti hai.`,
  cards: [
    { front: 'Sync mein kya rakhein?', back: 'Sirf woh jo (a) user ke jawab ke liye <b>zaroori</b> ho, YA (b) fail hone par <b>poora kaam radd</b> karna pade. Baaki sab async.' },
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
     ke <i>baad</i> aaye. Ab unki latency user ke first paint mein hai hi nahi.</p>
     <p><b>3. Hedged request.</b> p95 beet gaya? doosri copy bhej do, jo pehle
     aaye woh lo. ~5% extra load, bahut behtar tail.</p>`,
    `<h3>🔬 Fan-in — ulta problem</h3>
     <p>Fan-out = ek request, bahut calls. Fan-in = bahut writers, ek jagah.
     Yeh dheere-dheere marta hai:</p>
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
        { q: '1000 workers ek hi row par likh rahe hain — yeh kaunsa problem hai?', target: 'fanin', explain: 'Fan-in. Lock contention — throughput lock hold time se tay hota hai, workers ki sankhya se nahi. Aur workers badhane se ulta kharab hota hai.' },
        { q: 'Har fan-out call par sabse zaroori guard kya hai?', target: 'timeout', explain: 'Timeout — aur woh tumhare apne SLO se CHHOTA. Bina timeout ke ek dheemi dependency tumhara poora p99 apne saath le doobti hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Problem se ilaaj jodo',
      instructions: 'Har halat ko sahi ilaaj se milao.',
      pairs: [
        { left: '🌿 Page 8 services ko call karta hai, p99 kharab', right: 'Calls ghatao — aggregate/batch endpoint', explain: 'Sabse asardaar pehla kadam. 8 calls ko 3 karna, har service ko 2x tez karne se zyada asar karta hai.' },
        { left: '⭐ Reviews section p99 200ms le raha hai', right: 'Optional content ko page load ke BAAD lao', explain: 'Woh first paint ke liye zaroori nahi. Async load karo — ab uski latency user ke perceived time mein hai hi nahi.' },
        { left: '🎲 Ek replica kabhi-kabhi dheema ho jaata hai', right: 'Hedged request — p95 par doosri copy bhejo', explain: '~5% extra load ke badle tail bahut behtar. Google ne yeh technique famous ki thi.' },
        { left: '🔥 1000 workers ek counter row par', right: 'Counter ko 100 rows mein partition karo', explain: 'Contention 100x kam. Padhte waqt SUM kar lo. Classic "sharded counter" pattern.' },
        { left: '⏳ Ek dependency latak gayi, threads khatam', right: 'Timeout + bulkhead', explain: 'Timeout ise chhodne par majboor karta hai; bulkhead uske liye threads ki limit baandhta hai taaki baaki service zinda rahe.' },
        { left: '📊 Har second 1000 view-count updates', right: 'App mein batch karo, ek write bhejo', explain: '1000 writes → 1 write. View count ko exact hone ki zaroorat bhi nahi — yeh perfect batching candidate hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🌿 Fan-out ka asar dekho',
      goal: 'Ek service ek downstream par depend karti hai. Dekho ki uski latency tumhare p99 mein seedha judti hai — phir timeout laga ke damage baandho.',
      sys: SD.sys.orders(),
      tasks: T_FANOUT,
      success: SD.allTasks(T_FANOUT),
      successText: `Timeout ne latency ko <b>theek nahi kiya</b> — usne use <b>bounded</b> kiya.
        Yeh farak zaroori hai: ab tumhara p99 downstream ki marzi par nahi, tumhare
        faisle par tika hai.
        <br><br>Niyam: har remote call par timeout, aur woh timeout tumhare apne SLO se
        <b>kam</b> hona chahiye. Warna tum apna vaada uske haath mein de rahe ho.`,
      solution: [
        "GET /api/v1/orders?page=1",
        "sim inject latency ledger 3000",
        "GET /api/v1/orders?page=1",
        "sim add timeout ledger 200",
        "GET /api/v1/orders?page=1",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.timeoutMs === 200 && m.current(s, 'http', r => r.p99 < 800 && r.status === 504); },
      hints: [
        "Pehle observation: Normal request bhejo — baseline p99 dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab failure bounded ho: HTTP 504 aur p99 800ms se kam. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/orders?page=1\nsim inject latency ledger 3000\nGET /api/v1/orders?page=1\nsim add timeout ledger 200\nGET /api/v1/orders?page=1",
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Fan-out',
    instructions: 'Yahan formula bolna bada farak laata hai. 🎤',
    questions: [
      {
        q: "6 independent parallel calls; har call 99%cases mein<=50 ms. Page wait-for-all hai. Kya nikaal sakte ho?",
        choices: ["Exact p99 unknown; any-slow chance 5.9%","Page p99 exactly 50 ms ho jaayega","Page p99 exactly 300 ms ho jaayega","Page tail exactly 1% hi reh jaayegi"],
        answer: 0,
        explain: "Independence aur wait-for-all assume karo:all 6 calls<=50 ms probability 0.99^6~94.1%; any-slow~5.9%. Slow calls kitni der leti hain yeh unknown hai, isliye exact page p99 derive nahi hota.",
       choiceExplanations: ["Independence aur wait-for-all assume karo:all 6 calls<=50 ms probability 0.99^6~94.1%; any-slow~5.9%. Slow calls kitni der leti hain yeh unknown hai, isliye exact page p99 derive nahi hota.","Independent 6 calls mein all<=50 ms chance 0.99^6~94.1%hai.","Parallel calls serial sum nahi; slow tail values bhi unknown hain.","Any-slow probability 1-0.99^6~5.9%hai,1%nahi."] },
      {
        q: '"1000 workers ek hi counter row update kar rahe hain. Throughput kam hai. Aur workers add karein?"',
        choices: ["Hot row partition ya updates batch karo","Workers ko 10x karke contention badhao","Read replicas se same write lock baanto","Isolation lower karke lost updates lo"],
        answer: 0,
        explain: 'Yeh ek jaal wala sawaal hai. Serialized resource par workers badhana <b>ulta</b> kaam karta hai — sab lock ke liye ladenge. Sahi jawab hai contention <b>khatam</b> karna: sharded counter (100 rows) ya app-level batching.',
       choiceExplanations: ["Yeh ek jaal wala sawaal hai. Serialized resource par workers badhana <b>ulta</b> kaam karta hai — sab lock ke liye ladenge. Sahi jawab hai contention <b>khatam</b> karna: sharded counter (100 rows) ya app-level batching.","Same exclusive row lock ko workers parallel execute nahi kar sakte.","Replicas primary ke same write-row lock ko distribute nahi karti.","Lower isolation atomic update serialization ko zaroor remove nahi karti."] },
    ],
  },
  success: [
    'Serial vs parallel fan-out ka cost bata sakte ho',
    'Tail amplification ka hisaab kar sakte ho',
    'Fan-in ki lock contention pehchaan sakte ho aur do ilaaj bata sakte ho',
    'Har remote call par timeout lagate ho — SLO se kam',
  ],
  homework: `Apne sabse bhaari page ka network tab kholo. Ginti karo kitni API calls hoti hain.
    Har ek ke saamne likho: "first paint ke liye zaroori?" Jo "nahi" hain unhe defer karke
    dekho ki perceived latency kitni girti hai.`,
  cards: [
    { front: 'Fan-out ka tail formula?', back: "<code>P(any slow) = 1 − (1−p)ⁿ</code> independent calls ke liye. 5 × 1% slow-event probability → 4.9%; 100 → 63%. Yeh exact latency p99 nahi." },
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
     gire. Yeh sabse achhi wajah hai.</p>
     <p><b>4. Alag tech ya compliance.</b> ML Python mein, PCI card data
     alag boundary mein.</p>
     <p><b>Nakli wajah:</b> "microservices modern hai" / "Netflix aisa karta
     hai". Netflix ke paas 2000 engineers hain; tumhare paas 6.</p>
     <h3>⚠️ Distributed monolith — sabse bura nateeja</h3>
     <p>Agar do services <b>ek hi table</b> par likhti hain, toh woh do
     services nahi hain. Tumne network latency, partial failure aur
     deployment complexity le li — aur independence mili hi nahi.</p>
     <pre>❌ order-service  → orders table ← inventory-service
✅ order-service  → orders table
   inventory-service → inventory table
   (baat karne ke liye: API ya event, table nahi)</pre>
     <p><b>Ek service, ek data ka maalik.</b> Yeh ek niyam microservices ki
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
        { text: 'Recommendation engine gire toh checkout na gire', bin: 'split', explain: 'Blast radius. Yeh sabse achhi wajah hai — ek non-critical feature critical path ko na le doobe.' },
        { text: 'Alag team, alag release cycle chahiye', bin: 'split', explain: "Team ownership. Conway's Law — agar do teams ek hi deploy par ladti hain toh boundary galat hai." },
        { text: 'ML model Python mein, baaki app Java mein', bin: 'split', explain: 'Alag tech stack — legitimate wajah. Par dhyaan rakho ki ab ek naya operational surface bhi mila.' },
        { text: 'Orders aur order-items — dono order flow ka hissa', bin: 'keep', explain: 'Ek hi transaction boundary. Inhe todna matlab ek simple INSERT ko saga bana dena. Yeh koi faayda nahi deta.' },
        { text: '"Microservices modern hai, sab kar rahe hain"', bin: 'keep', explain: 'Yeh wajah nahi hai. Netflix ke paas 2000 engineers hain. Tumhare paas 6. Same architecture dono ke liye sahi nahi ho sakta.' },
        { text: 'User profile aur user settings', bin: 'keep', explain: 'Same entity, same team, same lifecycle. Todne se sirf ek network call aur ek consistency problem milega.' },
        { text: 'PCI card data — compliance boundary chahiye', bin: 'split', explain: 'Compliance. Card data ko alag rakhne se audit scope chhota ho jaata hai — yeh asli, mehenga faayda hai.' },
      ],
    },
    {
      type: 'incident',
      title: '🚨 3AM: "Checkout down hai"',
      instructions: 'Ek nayi microservice ne sab kuch bigaad diya. Sahi kadam chuno.',
      pager: `<b>#prod-alerts</b> — 3:11 AM<br>
        Checkout ka p99 <b>8 second</b> hai, error rate 40%. CPU 12%. Memory theek.<br>
        Pichhle hafte hi <code>recommendation-service</code> deploy hui thi —
        checkout page uske "aapke liye" section ke liye use call karta hai.<br>
        Recommendation service ka p99 abhi <b>9 second</b> hai.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: "Bound optional call;safe fallback", good: true, next: 'why', explain: 'Bilkul. Ek optional feature critical path ko block kar raha hai. Timeout + empty fallback se checkout turant theek ho jaayega.' },
            { t: "Only scale recommendation workers", good: false, explain: 'Isse shayad woh theek ho jaaye — par asli bug yeh hai ki checkout uspar DEPEND kar raha hai. Kal koi aur dependency dheemi hogi toh phir yahi hoga.' },
            { t: "Rollback without change evidence", good: false, explain: 'Checkout mein badlaav hi nahi hua. Rollback se kuch nahi badlega.' },
            { t: "Tune unrelated SQL without trace", good: false, explain: 'CPU 12% hai aur DB shaant hai. Problem ek dheemi downstream call hai, query nahi.' },
          ],
        },
        why: {
          sitrep: '✅ Timeout 200ms + empty fallback laga diya. Checkout p99 wapas 240ms. Error rate 0%.',
          text: 'Ab post-incident: yeh hua hi kyun?',
          choices: [
            { t: "Optional work blocked critical capacity", good: true, next: 'fix', explain: 'Do galtiyan ek saath: bina timeout ka remote call, aur optional cheez ko blocking bana dena.' },
            { t: "Blame provider without caller review", good: false, explain: 'Woh dheemi thi — par asli sawaal yeh hai ki uski dheemi hone se checkout kyun gira. Ek service ki kharabi ko doosri ko nahi le doobna chahiye.' },
            { t: "Blame traffic without timeout analysis", good: false, explain: 'CPU 12% hai. Traffic problem nahi tha.' },
          ],
        },
        fix: {
          text: 'Aage ke liye kaunsa sabse asardaar kadam?',
          choices: [
            { t: "Budget calls;isolate optional capacity", good: true, next: 'end', explain: 'Timeout default bana do (opt-out, opt-in nahi). Bulkhead se optional calls apne alag thread pool mein rahein. Breaker se baar-baar failing dependency ko rok do.' },
            { t: "Only add provider replicas", good: false, explain: 'Availability badhegi, par pattern nahi badlega. Agli baar koi aur dependency dheemi hogi.' },
            { t: "Remove feature without testing isolation", good: false, explain: 'Feature hatana ek haar hai. Sahi jawab hai use SAFELY optional banana — timeout + fallback.' },
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
            <br>3. Bulkhead — optional calls ka apna thread pool ho, taaki woh critical path ke threads na khaayein.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Decomposition ki samajh',
      questions: [
        {
          q: "Do services ek hi table par likhti hain. Sabse zaroori design risk?",
          choices: ["Ownership aur deploy coupling badh sakti","Do writers se writes parallel guaranteed","Shared table se network failures khatam","Alag process se schema independence mili"],
          answer: 0,
          explain: "Do services ka shared table valid transitional design ho sakta hai, par ownership, schema changes aur writes coordinate karne padenge. Is single fact se system ko automatically distributed monolith declare nahi kar sakte.",
         choiceExplanations: ["Do services ka shared table valid transitional design ho sakta hai, par ownership, schema changes aur writes coordinate karne padenge. Is single fact se system ko automatically distributed monolith declare nahi kar sakte.","Same row/table writes constraints aur locks share karte hain.","Service boundaries aur network calls abhi bhi maujood hain.","Shared schema changes coordinating writers ko affect kar sakte hain."] },
        {
          q: 'Chhoti team (6 engineers), naya product. Kya architecture?',
          choices: ["Modular monolith se start evaluate karo","Har module ka cluster pehle deploy karo","Boundaries bina ek shared codebase banao","Har endpoint ko separate service banao"],
          answer: 0,
          explain: 'Shuru mein tumhe boundaries <b>pata hi nahi</b> hoti. Monolith mein galat boundary = ek refactor. Microservices mein = ek migration project. Modular monolith dono ka best deta hai: aaj sasta, kal nikaalna aasan.',
         choiceExplanations: ["Shuru mein tumhe boundaries <b>pata hi nahi</b> hoti. Monolith mein galat boundary = ek refactor. Microservices mein = ek migration project. Modular monolith dono ka best deta hai: aaj sasta, kal nikaalna aasan.","Six-person team par distributed operations ka fixed cost bhaari hai.","Monolith bhi explicit module boundaries se maintainable banta hai.","Endpoint count independent deployment ki business need prove nahi karta."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Decomposition',
    instructions: 'Yeh sawaal candidates ko sabse zyada uljhata hai. 🎤',
    questions: [
      {
        q: '"Kab microservices mein todoge?"',
        choices: ["Ownership aur scaling pressure par todo","Code 100k lines hote hi zaroor todo","Team 10 hote hi zaroor todo","Fashionable stack milte hi zaroor todo"],
        answer: 0,
        explain: 'Line count wajah nahi hai — ek 500k line ka achha modular monolith 20 kharab microservices se behtar hai. Sabse taakatwar jawab woh hai jo microservices ki <b>keemat</b> pehle gine aur phir kahe ki kaunsi asli wajah us keemat ko justify karti hai.',
       choiceExplanations: ["Line count wajah nahi hai — ek 500k line ka achha modular monolith 20 kharab microservices se behtar hai. Sabse taakatwar jawab woh hai jo microservices ki <b>keemat</b> pehle gine aur phir kahe ki kaunsi asli wajah us keemat ko justify karti hai.","Line count service boundary aur operational benefit define nahi karta.","Team count signal ho sakta hai; fixed threshold universal nahi.","New stack distributed failure/operations cost justify nahi karta."] },
      {
        q: '"Tumhari service ek doosri service par depend karti hai jo kabhi-kabhi dheemi ho jaati hai. Kya karoge?"',
        choices: ["Budgeted timeout; isolation aur fallback","Boundless retry; success tak wait karo","Timeout apne caller se bada rakho","Downstream ko blame karke monitor hatao"],
        answer: 0,
        explain: 'Chaar layers, chaar alag khatre: <b>timeout</b> intezaar baandhta hai, <b>fallback</b> user ko kuch deta hai, <b>breaker</b> baar-baar marne se bachata hai, <b>bulkhead</b> ise tumhare baaki threads khaane se rokta hai. Sirf retry lagana ulta storm banata hai.',
       choiceExplanations: ["Chaar layers, chaar alag khatre: <b>timeout</b> intezaar baandhta hai, <b>fallback</b> user ko kuch deta hai, <b>breaker</b> baar-baar marne se bachata hai, <b>bulkhead</b> ise tumhare baaki threads khaane se rokta hai. Sirf retry lagana ulta storm banata hai.","Unlimited retries outage mein work multiply aur budget exhaust karti hain.","Caller deadline ke baad wait karna orphaned work create karta hai.","Dependency metrics aur handling tumhare service SLO ka hissa hain."] },
    ],
  },
  success: [
    'Microservices ki asli keemat gina sakte ho',
    'Split ki 4 asli wajahein aur nakli wajah pehchaante ho',
    'Distributed monolith ka jaal dekh sakte ho',
    'Ek dheemi dependency se apni service bacha sakte ho',
  ],
  homework: `Apne system ka ek "service" chuno. Poochho: kya koi doosri service uske table ko
    seedha padhti/likhti hai? Agar haan, toh woh independent nahi hai. List banao ki
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
        woh <b>turant</b> jaane chahiye, campaign ke peeche fanse nahi.
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
            { id: 'sync200', label: "200 after every send completes", score: -3,
              why: 'Ek request mein 50 lakh push bhejna? Woh request ghanton chalegi aur pehle timeout par mar jaayegi. Aur retry par sab dobara chala jaayega.' },
            { id: 'a202', label: "202 with campaign status resource", score: 3,
              why: 'Sahi. Kaam hua nahi hai, sirf maan liya gaya hai. Client status URL par progress dekh sakta hai. Yahi async ka imaandaar contract hai.' },
            { id: 'a201', label: "201 for created campaign resource", score: 1,
              why: 'Bura nahi — campaign resource sach mein ban gaya. Par 202 zyada saaf hai kyunki asli kaam (bhejna) abhi baaki hai.' },
          ],
        },
        {
          id: 'queue', label: 'Queue ka design', icon: '📮',
          note: 'Transactional aur campaign ek saath?',
          options: [
            { id: 'one', label: "One FIFO and shared worker pool", score: -3,
              why: 'Campaign ke 50 lakh messages queue mein bharenge aur "payment failed" notification unke PEECHE lag jaayega. Yeh classic head-of-line blocking hai.' },
            { id: 'two', label: "Separate queues and worker budgets", score: 3,
              why: 'Bilkul. Alag queue = alag priority aur alag consumers. Yeh queue-level bulkhead hai — campaign ka spike transactional ko chhu bhi nahi sakta.' },
            { id: 'prio', label: "One queue;unsupported priority label", score: 0,
              why: 'Kagaz par theek, practice mein nazuk. Zyadatar brokers priority theek se nahi karte, aur agar consumers busy hain toh priority se koi farak nahi padta.' },
          ],
        },
        {
          id: 'rate', label: 'FCM ki 1000 rps limit', icon: '🚦',
          note: 'Provider ki limit kaise respect karoge?',
          options: [
            { id: 'retry', label: "Immediate retry each provider429", score: -3,
              why: 'Yeh retry storm hai. Provider ko aur maaroge, tumhara account throttle ya block ho sakta hai. "Retry karke handle kar lenge" sabse mehengi galti hai.' },
            { id: 'shape', label: "Bound outbound rate below quota", score: 3,
              why: 'Sahi. Limit ke thoda NEECHE raho (headroom). Yeh backpressure hai — tum apni speed control kar rahe ho, provider ko majboor nahi kar rahe.' },
            { id: 'workers', label: "Worker count alone enforces quota", score: 1,
              why: 'Kaam kar sakta hai par nazuk — worker count se rate control karna indirect hai. Ek worker restart ya slow provider par ganit bigad jaayega. Explicit limiter behtar hai.' },
          ],
        },
        {
          id: 'dup', label: 'Duplicate se bachav', icon: '♻️',
          note: 'Worker crash hua, message dobara aaya',
          options: [
            { id: 'hope', label: "Broker flag covers external sends", score: -3,
              why: 'Exactly-once delivery distributed systems mein hoti hi nahi. Jo hota hai woh hai at-least-once delivery + <b>idempotent processing</b>. Yeh sabse common galatfehmi hai.' },
            { id: 'idem', label: "Atomic recipient intent dedupe", score: 3,
              why: 'Sahi. "Bheja gaya" ko DB mein unique constraint ke saath likho. Dobara aane par insert fail hoga aur tum skip kar doge. At-least-once + idempotent = effectively-once.' },
            { id: 'mem', label: "Worker-memory sent-ID set only", score: -2,
              why: 'Worker restart par memory chali jaayegi. Aur 10 workers ki memory alag-alag hai — koi bhi doosre ka bheja hua nahi jaanta.' },
          ],
        },
        {
          id: 'poison', label: 'Kharab message', icon: '☠️',
          note: 'Ek message har baar crash kar raha hai',
          options: [
            { id: 'inf', label: "Retry every error indefinitely", score: -3,
              why: 'Poison message. Woh kabhi nahi chalega, aur uske peeche ki POORI queue ruk jaayegi. Yeh ek message ek outage ban jaata hai.' },
            { id: 'drop', label: "Drop on first transient failure", score: -1,
              why: 'Ab transient failures (network blip) mein bhi notifications gum ho rahe hain. Retry chahiye — bas anant nahi.' },
            { id: 'dlq', label: "Classify;bounded retries;DLQ/replay", score: 3,
              why: 'Sahi. Transient failures retry se theek ho jaate hain; permanent failures DLQ mein jaate hain jahan insaan dekh sakta hai. Queue kabhi block nahi hoti.' },
          ],
        },
        {
          id: 'status', label: 'Progress dikhana', icon: '📊',
          note: 'Marketing team ko kaise pata chale?',
          options: [
            { id: 'none', label: "No job status;fire and forget", score: -2,
              why: 'Team ko pata hi nahi chalega ki 50 lakh mein se kitne gaye, kitne fail. Woh support ticket ban jaayega.' },
            { id: 'poll', label: "Status with sent/failed/pending", score: 3,
              why: 'Sahi, aur 202 wale Location header ke saath perfectly fit hota hai. Counters worker se update hote rahein.' },
            { id: 'log', label: "Operator logs as only user status", score: -1,
              why: 'Logs debugging ke liye hain, product feature ke liye nahi. Marketing team Kibana nahi kholegi.' },
          ],
        },
      ],
      verdicts: {
        great: 'Har decision production-grade hai. Yeh design 50 lakh notifications bhejega aur transactional traffic ko chhuyega bhi nahi.',
        ok: 'Design chal jaayega, par upar dekho — ek-do decisions par tumne apne aap ko future incident de diya hai.',
        bad: 'Yeh design pehle bade campaign par toot jaayega. Neeche har option ka tradeoff padho — asli seekh wahi hai.',
      },
    },
    {
      type: 'quiz',
      title: 'Boss ke baad — samajh pakki',
      questions: [
        {
          q: 'Campaign aur transactional notifications ek hi queue mein kyun nahi?',
          choices: ["Campaign backlog urgent work rokega","Message formats queue ko corrupt karenge","Separate queue free mein capacity laayegi","Priority label se FIFO order badlega"],
          answer: 0,
          explain: 'Queue FIFO hoti hai. Bulk load ke peeche urgent message ka intezaar karna hi <b>head-of-line blocking</b> hai. Alag queues = queue-level bulkhead. Yeh wahi soch hai jo thread pool bulkhead mein thi, bas queue par lagi hai.',
         choiceExplanations: ["Queue FIFO hoti hai. Bulk load ke peeche urgent message ka intezaar karna hi <b>head-of-line blocking</b> hai. Alag queues = queue-level bulkhead. Yeh wahi soch hai jo thread pool bulkhead mein thi, bas queue par lagi hai.","Brokers schemas differentiate kar sakte hain; primary issue scheduling hai.","Separate queues isolation deti hain; workers/capacity bhi allocate karo.","Ordinary FIFO queue priority label se reorder nahi karti."] },
        {
          q: '"Exactly-once delivery" ke baare mein sach kya hai?',
          choices: ["End-to-end effects ko idempotent banao","Broker flag se external charges dedupe","At-most-once se loss aur duplicate dono 0","Transaction se har remote effect atomic"],
          answer: 0,
          explain: "Exactly-once guarantees ka scope poochho. Kafka transactions apne supported read-process-write boundary mein exactly-once semantics de sakti hain; external payment/email effects automatic included nahi. End-to-end outcomes ke liye idempotency, deduplication aur transactional boundaries chahiye.",
         choiceExplanations: ["Exactly-once guarantees ka scope poochho. Kafka transactions apne supported read-process-write boundary mein exactly-once semantics de sakti hain; external payment/email effects automatic included nahi. End-to-end outcomes ke liye idempotency, deduplication aur transactional boundaries chahiye.","Broker guarantees ka scope external DB/payment API ko cover nahi karta.","At-most-once loss allow karta hai; exactly-once outcome nahi.","Cross-system effects ko local transaction automatically commit nahi karti."] },
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — Flow Design',
    instructions: 'Aakhri round. Yahan tumhe design defend karna hai.',
    questions: [
      {
        q: '"Tumhare campaign se transactional notifications 20 minute late ho gaye. Kya galat tha?"',
        choices: ["Shared FIFO aur workers ne urgent job roki","Sirf provider ko queue order ka blame do","Sirf DB index ko queue order ka blame do","Sirf retries se urgent priority milegi"],
        answer: 0,
        explain: 'Yeh <b>isolation</b> ka failure hai, capacity ka nahi. Workers badhane se sirf campaign tez hoga; transactional phir bhi peeche hi rahega. Sahi jawab hai <b>alag lane</b> banana — chahe woh alag queue ho ya alag consumer group.',
       choiceExplanations: ["Yeh <b>isolation</b> ka failure hai, capacity ka nahi. Workers badhane se sirf campaign tez hoga; transactional phir bhi peeche hi rahega. Sahi jawab hai <b>alag lane</b> banana — chahe woh alag queue ho ya alag consumer group.","Delay producer/consumer scheduling se bhi aa sakta hai; provider evidence chahiye.","DB slowness ho sakti hai; campaign ke peeche wait isolation ka signal hai.","Retry urgent work ko same backlog ke peeche aur bhej sakti hai."] },
      {
        q: '"50 lakh notifications bhejne mein 90 minute lag rahe hain. Tez karo."',
        choices: ["1000/s par lower bound 83.3 minute hai","Workers 2x se lower bound 41.7 minute hai","Queue 2x se lower bound 20.8 minute hai","Retry 2x se lower bound 10.4 minute hai"],
        answer: 0,
        explain: "5 million/1000s=5000 seconds=83.3 minutes ka ideal provider-limited floor hai. Batching ka quota unit check karo; multiple accounts se limit bypass assume mat karo. Higher approved quota ya lower work volume evaluate karo.",
       choiceExplanations: ["5 million/1000s=5000 seconds=83.3 minutes ka ideal provider-limited floor hai. Batching ka quota unit check karo; multiple accounts se limit bypass assume mat karo. Higher approved quota ya lower work volume evaluate karo.","Provider cap unchanged ho toh extra workers 1000/s exceed nahi karte.","Queue size throughput quota nahi badhata.","Retries extra attempts kharch karti hain; unique deliveries ki cap nahi badhati."] },
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
    { front: 'Exactly-once ka sach?', back: 'Woh hoti hi nahi. <b>At-least-once delivery + idempotent processing = effectively-once.</b> Dedupe key par unique constraint lagao.' },
    { front: 'Poison message?', back: 'Woh message jo har baar crash karta hai. Bina DLQ ke woh poori queue rok deta hai. Pattern: <b>N retries with backoff → DLQ</b>.' },
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
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'compare' && r.h1 > r.h2 && r.h2 > r.h3) },
  { text: 'L4 load balancer kya kar sakta hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'lb' && r.layer === 4) },
  { text: 'Aur L7 kya kar sakta hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'lb' && r.layer === 7) },
];

const T_NUMBERS = [
  { text: 'Same datacenter (RTT 1ms) par ek cold connection',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt <= 2) },
  { text: 'Ab wahi cheez cross-continent (RTT 150ms) par',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt >= 120 && r.protocol === 'h1' && !r.warm) },
  { text: 'Cross-continent par HTTP/3 — ek RTT bachana yahan kitna bada hai',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.rtt >= 120 && r.protocol === 'h3') },
  { text: 'Ab in numbers se capacity nikalo',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Aur load chala ke dekho ki anumaan sahi tha ya nahi',
    check: s => s.records.some(r => r.kind === 'load') },
];

SD.registerLevelsAfter('flow', 'lifecycle', [
{
  id: 'networking',
  icon: '🌐',
  title: 'Network — Woh Sab Jo Request Bhejne Se PEHLE Hota Hai',
  badge: 'Protocol Pandit',
  objectives: [
    'DNS + TCP + TLS ka handshake tax — data se <b>pehle</b> ka waqt',
    'TCP vs UDP, aur QUIC (HTTP/3) beech ka raasta kaise nikalta hai',
    'Head-of-line blocking — HTTP/1.1, HTTP/2 aur HTTP/3 mein',
    'L4 vs L7 load balancer — aur WebSocket ke liye L4 kyun',
  ],
  lesson: [
    `<h3>📖 "Ek request 200ms leti hai" — usme se aadha kya tha?</h3>
     <p>Nayi HTTPS connection par ek byte data jaane se <b>pehle</b> yeh sab hota hai:</p>
     <pre>DNS lookup       30 ms   "api.example.com ka IP kya hai?"
TCP handshake    40 ms   SYN → SYN-ACK → ACK        (1 RTT)
TLS handshake    40 ms   keys ka exchange           (TLS 1.3: 1 RTT · purana TLS 1.2: 2 RTT = 80 ms)
─────────────────────
                110 ms   ...ab request bhej sakte ho  (TLS 1.2 par 150 ms)</pre>
     <p>Isiliye <b>connection reuse</b> (keep-alive / connection pooling) itna matter
     karta hai. Jo purane clients har request par nayi connection kholte the, unki
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
     Wahan "ruk ke dobara bhejo" ulta nuksaan hai.</p>
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
     hoti hai — bottleneck badal jaaye toh woh optimization ek bug ban jaati hai.</p>
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
     woh connection ghanton chalti hai, aur L4 use bas aage badha deta hai.</p>`,
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
        "Pehle observation: Ek COLD connection trace karo — data se pehle ka kharch dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Aur L7 kya kar sakta hai. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nnet trace\nnet trace --warm\nnet trace --protocol h3\nnet compare --assets 60\nnet lb l4\nnet lb l7",
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa protocol / layer kahan',
      pairs: [
        { left: 'REST API, mobile app se', right: 'HTTP/2 ya /3 over TCP/QUIC', explain: 'Data ka har byte chahiye aur kram matter karta hai — TCP-jaisi reliability zaroori hai. Mobile par HTTP/3 extra faayda deta hai: network badalne par connection nahi tootti.' },
        { left: 'Live video streaming', right: 'UDP', explain: 'Kho gaya frame dobara bhejne ka koi matlab nahi — jab woh aayega tab tak woh scene ja chuka hoga. Ek frame drop karke aage badhna hi sahi hai.' },
        { left: 'WebSocket chat gateway', right: 'L4 load balancer', explain: 'Connection ghanton chalti hai. L4 use bas aage badha deta hai aur beech mein aata hi nahi. L7 ko har connection ka state rakhna padta hai.' },
        { left: '/api → svc-a, /images → svc-b', right: 'L7 load balancer', explain: 'Path se routing ke liye LB ko HTTP request <b>padhni</b> padegi — yeh sirf L7 kar sakta hai.' },
        { left: 'Multiplayer game ki player position', right: 'UDP', explain: '200 ms purani position bekaar hai. TCP usse dobara bhejne ke liye <b>ruk</b> jaata — aur us doraan nayi positions bhi ruk jaati (HOL blocking). Ek chhoot jaana behtar hai.' },
        { left: 'Bank transfer API call', right: 'TCP', explain: 'Yahan har byte chahiye aur kram bhi. "Shayad pahunch gaya" jaisi koi cheez nahi hai. TCP default hai — aur yeh default badalne ki bahut khaas wajah chahiye.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Network ki samajh',
      questions: [
        {
          q: 'Ek client har request par nayi HTTPS connection kholta hai. Kitna extra kharch?',
          choices: ["Fresh setup mein kai RTT lag sakte","DNS cache se TCP setup bhi bach jaata","TLS resumption se har setup free hota","Payload se pehle sirf CPU cost hoti"],
          answer: 0,
          explain: "Fresh DNS, TCP, TLS setup multiple round trips le sakta hai; DNS cache, TLS version, resumption, connection reuse aur 0-RTT conditions result badalti hain.40 msRTT se universal 150 ms number derive nahi hota.",
         choiceExplanations: ["Fresh DNS, TCP, TLS setup multiple round trips le sakta hai; DNS cache, TLS version, resumption, connection reuse aur 0-RTT conditions result badalti hain.40 msRTT se universal 150 ms number derive nahi hota.","DNS cache naam resolution bachati hai; fresh TCP handshake alag hai.","Resumption setup kam kar sakti hai; network/0-RTT constraints baaki hain.","Connection establishment network round trips bhi leta hai."] },
        {
          q: 'HTTP/2 par shift kiya. Ab domain sharding (assets ko 4 subdomains par baantna) kya karega?',
          choices: ["Extra origins reuse aur setup badha sakte","Sharding har H2 stream ko faster karegi","Har hostname ek connection share karega","H2 mein DNS/TLS ki need khatam hogi"],
          answer: 0,
          explain: "H2 multiplexing se unnecessary domain sharding ka historical benefit kam hota hai; extra origins handshake/reuse cost badha sakte hain. Connection coalescing, certificate coverage aur origin placement ke kaaran outcome conditional hai.",
         choiceExplanations: ["H2 multiplexing se unnecessary domain sharding ka historical benefit kam hota hai; extra origins handshake/reuse cost badha sakte hain. Connection coalescing, certificate coverage aur origin placement ke kaaran outcome conditional hai.","H2 multiplex karta hai; unnecessary origins extra connections la sakte hain.","Connection coalescing conditional hai; har name automatic share nahi karta.","H2 application protocol hai; name resolution/security setup still needed."] },
        {
          q: 'HTTP/2 ne head-of-line blocking hata di — sach ya jhooth?',
          choices: ["TCP loss H2 streams ko rok sakta","H2 se TCP packet loss khatam hota","H3 mein har tarah ka blocking khatam","TLS on ho toh loss affect nahi karta"],
          answer: 0,
          explain: "H2 multiplexing HTTP/1.x request serialization ghataati hai, par TCP loss ordered delivery par multiple streams rok sakta hai. QUIC separate streams se cross-stream transport HOL ghataata hai; flow control, congestion aur application dependencies phir bhi ho sakti hain.",
         choiceExplanations: ["H2 multiplexing HTTP/1.x request serialization ghataati hai, par TCP loss ordered delivery par multiple streams rok sakta hai. QUIC separate streams se cross-stream transport HOL ghataata hai; flow control, congestion aur application dependencies phir bhi ho sakti hain.","H2 TCP reliability par hai; packet loss still possible hai.","QUIC cross-stream transport HOL ghataata hai; flow/congestion limits baaki hain.","Encryption transport retransmission aur ordering ko remove nahi karti."] },
      ],
    },
    {
      type: 'hotspot',
      title: 'Wire par ek request',
      visual: 'networking',
      questions: [
        { q: 'Data bhejne se pehle ka sabse bada kharch?', target: 'setup', explain: 'DNS + TCP + TLS milke ek RTT-heavy setup banate hain. Isiliye connection reuse sabse sasta optimization hai.' },
        { q: 'HTTP/1.1 mein assets line mein kyun lagte hain?', target: 'hol', explain: 'Ek connection par ek waqt mein ek request — head-of-line blocking. Browser 6 connections khol ke ise thoda kam karta hai, khatam nahi.' },
        { q: 'QUIC TCP ka handshake kaise bachaata hai?', target: 'quic', explain: 'Woh UDP par hai, isliye TCP handshake hai hi nahi — aur TLS usi ke saath ho jaata hai. Cold connection par ek poora RTT bach jaata hai.' },
        { q: 'WebSocket ke liye kaunsi LB layer?', target: 'l4', explain: 'L4 — woh connection ko bas aage badha deta hai. L7 ko har lambi connection ka state rakhna padta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Networking',
    instructions: 'Yeh woh layer hai jise log skip kar dete hain. 🎤',
    questions: [
      {
        q: "\"Tumhari API ka p99 achanak 400 ms badh gaya, par server ka processing time wahi hai. Kahan dekhoge?\"",
        choices: ["Network setup aur route traces dekho","App time stable toh issue impossible","DB index ko bina timing add karo","CPU ko bina bottleneck double karo"],
        answer: 0,
        explain: 'Server ka time wahi hai — matlab kharch <b>server se pehle</b> hai. Do sabse aam wajah: connection reuse toot gaya (naya client, naya SDK, ya pool ka config), ya network path lamba ho gaya (client naye region se aa raha hai, ya beech mein ek naya hop aa gaya). Dono ka jawab p99 mein dikhta hai aur CPU mein bilkul nahi.',
       choiceExplanations: ["Server ka time wahi hai — matlab kharch <b>server se pehle</b> hai. Do sabse aam wajah: connection reuse toot gaya (naya client, naya SDK, ya pool ka config), ya network path lamba ho gaya (client naye region se aa raha hai, ya beech mein ek naya hop aa gaya). Dono ka jawab p99 mein dikhta hai aur CPU mein bilkul nahi.","Client-observed latency app processing ke bahar bhi spend hoti hai.","DB timing stable ho toh index unexplained 400 ms ko target nahi karta.","CPU scaling fresh TLS/extra RTT ko directly remove nahi karti."] },
      {
        q: '"Video call feature banana hai. Protocol?"',
        choices: ["WebRTC media; reliable signaling alag","TCP stream par har frame wait karao","HTTP request mein continuous media rakho","Transport akela video codec decide kare"],
        answer: 0,
        explain: "Asli jawab yeh hai ki <b>ek hi system mein dono</b> chahiye, alag-alag hisson ke liye. Media stream mein 200 ms purana frame bekaar hai — usko dobara bhejna ulta nuksaan hai. Par \"user X call mein aa gaya\" jaisa signaling message kho jaana bilkul manzoor nahi. \"Sab kuch ek protocol par\" wala jawab hi galti hai.",
       choiceExplanations: ["Asli jawab yeh hai ki <b>ek hi system mein dono</b> chahiye, alag-alag hisson ke liye. Media stream mein 200 ms purana frame bekaar hai — usko dobara bhejna ulta nuksaan hai. Par \"user X call mein aa gaya\" jaisa signaling message kho jaana bilkul manzoor nahi. \"Sab kuch ek protocol par\" wala jawab hi galti hai.","Reliable ordered retransmission late frames ke peeche new media rok sakti hai.","Interactive media ko timing/loss control chahiye; request response enough nahi.","Codec aur congestion/application handling protocol choice se alag decisions hain."] },
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
    { front: 'UDP kab?', back: 'Jab <b>purana data bekaar</b> ho — live video, gaming, VoIP. Wahan "ruk ke dobara bhejo" ulta nuksaan hai. Baaki sab jagah TCP default.' },
    { front: 'HTTP/1.1 vs 2 vs 3?', back: '<b>1.1</b> — ek connection = ek request (browser 6 kholta hai). <b>2</b> — multiplexed, par TCP par HOL blocking baaki. <b>3</b> — QUIC/UDP, har stream alag; aur connection ID se network badalne par bhi zinda.' },
    { front: 'HTTP/2 ke baad domain sharding?', back: '<b>Nuksaan.</b> Har domain = extra DNS+TCP+TLS. Woh HTTP/1.1 ki 6-connection limit ke liye thi. Har optimization apne zamaane ki bottleneck ke liye hoti hai.' },
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
    'Ek RTT kitna mehenga hai — aur usse design kaise badalta hai',
    'Throughput aur size ke mote numbers',
    'Anumaan ko <b>naap</b> se milaana',
  ],
  lesson: [
    `<h3>📖 Latency ka ladder</h3>
     <p>Yeh numbers rat-ne ke liye nahi hain — inka faayda yeh hai ki inse
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
     <p class="tip">🎯 Inhe insaani paimane par rakho — sab kuch 1 billion se guna karo:
     L1 cache = <b>0.5 second</b>. RAM = <b>100 second</b>. SSD = <b>27 ghante</b>.
     Same-DC network = <b>6 din</b>. Cross-continent = <b>5 saal</b>.
     <br><br>Ab socho ki tumhare code mein ek loop ke andar ek network call hai.
     Woh har chakkar par <b>5 saal</b> intezaar kar raha hai.</p>
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
     Toh <code>1M/din ≈ 10 rps</code>. Yeh 15% galat hai aur bilkul kaafi hai —
     back-of-envelope mein tumhe order of magnitude chahiye, decimal nahi.</p>
     <p><b>2. Peak = average × 2 se 5.</b> Aur agar tumhare traffic mein koi
     <b>event</b> hai (result declaration, sale, match) toh woh 100x bhi ho sakta hai.
     Isliye pehle poochho: "kya iska traffic predictable spike wala hai?"</p>
     <p class="tip">🎯 Aur sabse zaroori: <b>anumaan lagane ke baad naapo.</b>
     Estimate ka kaam yeh batana hai ki tumhe kis <b>paimane</b> ki cheez chahiye —
     10 servers ya 1000. Uske baad asli number load test se aata hai, dimaag se nahi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Numbers se faisle tak',
      goal: `Ek hi design, do jagah: same datacenter aur cross-continent.
             Phir un numbers se capacity nikalo aur use <b>naap</b> ke check karo.`,
      sys: SD.sys.orders(),
      tasks: T_NUMBERS,
      success: SD.allTasks(T_NUMBERS),
      successText: `Wahi design, wahi code — sirf <b>doori</b> badli, aur latency 30x ho gayi.
        Yeh number koi tuning theek nahi kar sakti; ise sirf <b>architecture</b>
        theek karta hai (data user ke paas rakho, hops kam karo).
        Aur aakhir mein: anumaan lagao, phir <b>naapo</b>.`,
      solution: [
        "net trace --rtt 1",
        "net trace --rtt 150",
        "net trace --rtt 150 --protocol h3",
        "estimate --users 12000000 --rps 500 --bytes 2048",
        "load --rps 500 --duration 8",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'load', r => r.rps === 500); },
      hints: [
        "Pehle observation: Same datacenter (RTT 1ms) par ek cold connection. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Aur load chala ke dekho ki anumaan sahi tha ya nahi. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nnet trace --rtt 1\nnet trace --rtt 150\nnet trace --rtt 150 --protocol h3\nestimate --users 12000000 --rps 500 --bytes 2048\nload --rps 500 --duration 8",
      ],
    },
    {
      type: 'fill',
      title: 'Latency ladder',
      instructions: 'Sahi number chuno.',
      template: `RAM se ek value padhne mein ~{0} lagta hai, SSD se random read mein ~{1},
        aur same-datacenter network round trip mein ~{2}.
        Cross-continent round trip ~{3} hai — isliye ek user-facing request mein
        usse ek se zyada baar guzarna SLO tod deta hai.`,
      tokens: ['100 ns', '100 µs', '0.5 ms', '150 ms', '10 ms', '1 s'],
      blanks: [
        { answer: '100 ns', explain: 'RAM ~100 nanosecond. Yahi cache ka poora karan hai — SSD se woh <b>1000x</b> tez hai.' },
        { answer: '100 µs', explain: 'SSD random read ~100 microsecond = 0.1 ms. Isiliye ek index lookup sasta hai, par 1000 lookups (N+1) 100ms ban jaate hain.' },
        { answer: '0.5 ms', explain: 'Same-DC RTT ~0.5ms. Chhota lagta hai — par ek request mein 20 service hops = 10ms sirf network par, bina kuch kiye.' },
        { answer: '150 ms', explain: 'Cross-continent ~150ms. Yeh <b>physics</b> hai (light speed + fiber), koi tuning ise theek nahi kar sakti. Ilaaj sirf architecture hai: data user ke paas rakho.' },
      ],
    },
    {
      type: 'match',
      title: 'Number → design ka faisla',
      pairs: [
        { left: 'RAM 100ns vs SSD 100µs (1000x)', right: 'Cache lagane ka poora karan', explain: 'Yeh ek number caching ki poori duniya justify karta hai. Working set ko memory mein rakhna 1000x ka farak hai.' },
        { left: 'Cross-continent RTT 150ms', right: 'Data ko user ke paas rakho (regional partitioning)', explain: 'Ek user-facing request mein ek se zyada cross-continent hop = SLO gaya. Isiliye Uber city-wise partition karta hai aur CDN edge par baithta hai. Yeh physics hai, tuning nahi.' },
        { left: 'Same-DC RTT 0.5ms × 20 hops', right: 'Service decomposition ki chhupi hui keemat', explain: '20 microservice hops = 10ms sirf network par, bina kisi kaam ke. Isiliye ek request path mein service count bhi ek design number hai.' },
        { left: 'Ek Postgres ~10,000 qps', right: 'Sharding ka sawaal kab uthega', explain: 'Agar tumhara peak 2,000 qps hai toh sharding ki baat hi bekaar hai. Yeh number "abhi zaroorat hai ya nahi" ka seedha jawab de deta hai.' },
        { left: '1M requests/din ≈ 12 rps', right: '"Bahut traffic" aksar bahut kam hota hai', explain: 'Log "10 lakh requests roz" sun ke ghabra jaate hain. Woh 12 rps hai — ek laptop bhi kar lega. Isliye hamesha rps mein badlo, phir faisla karo.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Numbers ki samajh',
      questions: [
        {
          q: "1000 serial same-DC calls; har call ka assumed fixed RTT 0.5 ms. Sirf network wait?",
          choices: ["0.5 ms fixed RTT par 500 ms","0.5 ms fixed RTT par 5 ms","0.5 ms fixed RTT par 50 ms","0.5 ms fixed RTT par 0.5 ms"],
          answer: 0,
          explain: "Yahan har serial call ka fixed RTT 0.5 ms assume hai.1000*0.5 ms=500 ms. Actual same-DC RTT deployment-specific hai; batching aur independent calls ki bounded parallelism measure karo.",
         choiceExplanations: ["Yahan har serial call ka fixed RTT 0.5 ms assume hai.1000*0.5 ms=500 ms. Actual same-DC RTT deployment-specific hai; batching aur independent calls ki bounded parallelism measure karo.","Serial 1000*0.5 ms=500 ms;5 ms factor 100 chhota hai.","1000*0.5=500;50 factor 10 chhota hai.","Same-DC network trips zero-cost nahi; serial waits add hote hain."] },
        {
          q: "Observed Mumbai-Virginia RTT 150 ms hai. Reused connection par 200 msSLO assess kaise karoge?",
          choices: ["Measured RTT aur remaining budget dekho","150 msRTT se 200 msSLO impossible bolo","Database index se WAN RTT hatao","CPU 2x se network latency half karo"],
          answer: 0,
          explain: "150 ms observed RTT ke baad 200 msSLO mein 50 ms processing/queue budget bachta hai. Reused connection par target possible ho sakta hai; fresh TLS, multi-hop work aur tail variation budget tod sakte hain. Measurements se edge/region decision lo.",
         choiceExplanations: ["150 ms observed RTT ke baad 200 msSLO mein 50 ms processing/queue budget bachta hai. Reused connection par target possible ho sakta hai; fresh TLS, multi-hop work aur tail variation budget tod sakte hain. Measurements se edge/region decision lo.","150 msRTT akela 200 ms se kam hai; reuse aur processing budget matter karte hain.","DB index WAN propagation delay ko remove nahi karta.","CPU change geographic network round-trip ko halve nahi karta."] },
        {
          q: '"Humein 10 lakh requests roz handle karni hain" — pehla kadam?',
          choices: ["Average 11.6 rps; peak alag estimate karo","Daily count ko 11.6 million rps maan lo","Daily count se seedha sharding chuno","Daily count se fixed 50 rps peak bolo"],
          answer: 0,
          explain: '"10 lakh roz" bada sunai deta hai aur <b>12 rps</b> hota hai — jo ek single server ka kaam hai. Yeh conversion (÷ 86,400, ya mote taur par ÷ 100,000) sabse zyada waqt bachane wala shortcut hai, kyunki woh aadhe over-engineering ke faisle wahin rok deta hai.',
         choiceExplanations: ["\"10 lakh roz\" bada sunai deta hai aur <b>12 rps</b> hota hai — jo ek single server ka kaam hai. Yeh conversion (÷ 86,400, ya mote taur par ÷ 100,000) sabse zyada waqt bachane wala shortcut hai, kyunki woh aadhe over-engineering ke faisle wahin rok deta hai.","1 million/86400~11.6 rps; day-to-second conversion chahiye.","Average demand alone sharding necessity decide nahi karta.","Peak 50 scenario assumption hai; given daily total se derive nahi hota."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Numbers',
    instructions: 'Yahan mote numbers se jaldi jawab dena hi hunar hai. 🎤',
    questions: [
      {
        q: "5 crore users*20 photo views/day;90%20 KB thumbnails,10%200 KB images. Daily egress?",
        choices: ["1 billion views/day; mix par 38 TB egress","1 billion views/day; mix par 380 GB egress","1 billion views/day; mix par 3.8 TB egress","1 billion views/day; mix par 380 TB egress"],
        answer: 0,
        explain: "Assume 50 million users*20 views=1 billion views/day~11574 rps average. Given 90%20 KB thumbnails+10%200 KB images, weighted 38 KB/view=38 TB/day decimal egress. Storage ko uploaded objects/retention se estimate karo; view count se storage derive nahi hota.",
       choiceExplanations: ["Assume 50 million users*20 views=1 billion views/day~11574 rps average. Given 90%20 KB thumbnails+10%200 KB images, weighted 38 KB/view=38 TB/day decimal egress. Storage ko uploaded objects/retention se estimate karo; view count se storage derive nahi hota.","0.9*20 KB+0.1*200 KB=38 KB;1 billion*38 KB=38 TB.","Same weighted payload ke liye 3.8 TB factor 10 kam hai.","380 TB factor 10 zyada hai; thumbnail mix include karo."] },
      {
        q: '"Tumhare estimate galat nikle toh?"',
        choices: ["Assumptions record karke load test karo","Autoscale se har wrong estimate cover","Fixed 2x margin se har error cover","Precise digits se forecast exact hoga"],
        answer: 0,
        explain: 'Yeh jawab dikhata hai ki tum estimate ko uski <b>asli jagah</b> par rakhte ho: woh ek disha hai, guarantee nahi. Aur sabse achha hissa hai "assumptions likh ke rakhta hoon" — kyunki tab jab traffic ka shape alag nikle, tumhe pata hota hai ki design ka kaunsa hissa dobara sochna hai.',
       choiceExplanations: ["Yeh jawab dikhata hai ki tum estimate ko uski <b>asli jagah</b> par rakhte ho: woh ek disha hai, guarantee nahi. Aur sabse achha hissa hai \"assumptions likh ke rakhta hoon\" — kyunki tab jab traffic ka shape alag nikle, tumhe pata hota hai ki design ka kaunsa hissa dobara sochna hai.","Autoscale external quotas, hot rows aur correctness ko automatic solve nahi karti.","Fixed margin unknown orders-of-magnitude errors cover nahi karta.","Inputs uncertain hon toh decimal precision accuracy guarantee nahi."] },
    ],
  },
  success: [
    'Latency ladder yaad hai — aur insaani paimane par samajh sakte ho',
    'Har number se ek design ka natija nikaal sakte ho',
    '"Roz ka X" ko turant rps mein badal sakte ho',
    'Anumaan ke baad naapne ki aadat hai',
  ],
  homework: `Apne system ki ek asli request lo aur uska waqt teen hisson mein baanto:
    network, DB, aur app ka apna kaam. Phir dekho ki sabse bada hissa kaunsa hai —
    aur kya woh us latency ladder ke hisaab se <b>samajh mein aata hai</b>.
    Jo hissa numbers se mel na khaaye, wahi tumhara chhupa hua bug hai.`,
  cards: [
    { front: 'Latency ladder (mote taur par)?', back: 'L1 0.5ns · RAM <b>100ns</b> · SSD random <b>100µs</b> · same-DC RTT <b>0.5ms</b> · HDD seek 10ms · cross-country 40ms · <b>cross-continent 150ms</b>.' },
    { front: 'Insaani paimane par?', back: '×1 billion: L1 = 0.5 sec · RAM = 100 sec · SSD = 27 ghante · same-DC network = <b>6 din</b> · cross-continent = <b>5 saal</b>.' },
    { front: 'RAM vs SSD ka farak?', back: '<b>1000x</b> (100ns vs 100µs). Yeh ek number poori caching duniya ko justify karta hai.' },
    { front: '"Roz ka X" → rps?', back: '86,400 ko <b>100,000</b> maan lo. 1M/din ≈ 12 rps · 100M/din ≈ 1,200 rps · 1B/din ≈ 12,000 rps. Peak = average × 2–5 (event ho toh 100x).' },
    { front: 'Cross-continent SLO?', back: 'WAN RTT measurement route-specific hai. Propagation ko CPU/index se remove nahi kar sakte;connection reuse,call reduction aur regional placement ka remaining budget measure karo.' },
    { front: 'Ek Postgres kitna?', back: '~10,000 simple qps · Redis ~100k ops/s · Kafka partition ~10 MB/s. In numbers se pata chalta hai ki sharding ki baat <b>abhi</b> zaroori hai ya nahi.' },
  ],
},
]);

})();
