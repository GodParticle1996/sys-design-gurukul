/* =====================================================================
   System Gurukul — Scenes: 🛡️ Resilience (resil track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  timeouts: {
    intro: 'bank-api <b>down nahi</b>, bas dheema hai. Phir bhi poora ChaiPay kyun gir gaya?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Riya', sub: 'SLO: 2 s', tone: 'accent' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'api-gateway' },
      { id: 'pay', col: 2, row: 1, icon: '⚙️', label: 'pay-api', sub: '200 threads' },
      { id: 'bank', col: 3, row: 1, icon: '🏦', label: 'bank-api' },
    ],
    steps: [
      { from: 'pay', to: 'bank', label: 'charge', tone: 'bad', set: { bank: { tone: 'bad', sub: 'har jawab 30 s' } }, say: 'bank-api down nahi, bas dheema: har jawab 30 second mein.' },
      { at: ['pay'], set: { pay: { tone: 'bad', sub: '200/200 threads latke' } }, say: 'pay-api ke bank call par koi timeout nahi. Har request 30 second tak thread aur connection pakde baithi. Thread pool khatam.' },
      { at: ['gw', 'pay'], set: { gw: { tone: 'bad', sub: 'requests latak rahi' } }, say: 'Ab pay-api ke SAARE endpoints down, balance wala bhi. Upar api-gateway bhi latakne laga: cascade. Dheema hona down hone se zyada khatarnak hai.' },
      { at: ['bank'], say: 'Teen timeouts: connect (1–3 s: "zinda hai?"), read (bytes ke beech: "bol raha hai?") aur total (poori call). Asli bachaav total timeout se hota hai.' },
      { from: 'user', to: 'gw', label: 'SLO 2 s', set: { gw: { tone: '', sub: 'deadline: 2 s' }, pay: { tone: '', sub: '200 threads' }, bank: { tone: 'bad', sub: 'ab bhi dheema' } }, say: 'Ab sahi design. Riya ka SLO 2 second hai. api-gateway ke paas poora budget: 2 s.' },
      { from: 'gw', to: 'pay', label: 'deadline: 1.8 s bacha', say: 'api-gateway request ke saath deadline bhejta hai: "tumhare paas 1.8 second bache hain". Is tareeke ko deadline propagation kehte hain.' },
      { from: 'pay', to: 'bank', label: 'total timeout 1.5 s', tone: 'good', set: { pay: { tone: 'good', sub: 'thread free, saaf error' } }, say: 'pay-api bank call par 1.5 s total timeout lagata hai, apne bache waqt se kam. Bank dheema? 1.5 s mein fail, thread free, Riya ko saaf error.' },
      { at: ['gw'], say: 'Timeout ek vaada hai jo tum apne caller se karte ho. Caller ka deadline khatam ho jaaye toh andar kaam karte rehna bekaar: kaam chhod do.' },
    ],
  },

  retries: {
    intro: 'Retry madad karta hai… jab tak saare clients <b>ek saath</b> retry na karein.',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Mobile app', sub: '200 clients', tone: 'accent' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'api-gateway' },
      { id: 'svc', col: 2, row: 1, icon: '⚙️', label: 'pay-api SDK' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres' },
    ],
    steps: [
      { at: ['db'], set: { db: { tone: 'bad', sub: 'thoda dheema · 10% errors' } }, say: 'Postgres thoda dheema hua: 10% requests fail ho rahi hain. Akela chhodo toh kuch minute mein theek ho jaata.' },
      { from: 'client', to: 'gw', label: 'retry, retry, retry…', tone: 'bad', set: { gw: { tone: 'bad', sub: 'load ×3 💀' } }, say: 'Saare clients retry karte hain: load ×2, phir ×3. Errors aur badhe. Service khud theek ho jaati, par retries ne mauka hi nahi diya.' },
      { at: ['client'], set: { client: { tone: 'gold', sub: 'backoff, jitter nahi' } }, say: 'Exponential backoff bina jitter: sabne ek saath fail dekha, sab 1 s ruke, sab ek saath maare, phir 2 s… load ki lehrein bani rahin.' },
      { at: ['client'], set: { client: { tone: 'good', sub: 'full jitter' } }, say: 'Full jitter: sleep = random(0, min(cap, base × 2ⁿ)). Lab 37 mein 200 clients: bina jitter 120 ne haar maani, jitter ke saath 0–1.' },
      { at: ['svc'], say: 'Kya retry karo: sirf asthaayi galti (timeout, 503, 429 + Retry-After) aur sirf idempotent kaam. 400/422 par request theek karo; 401 par credentials refresh karke bounded retry mumkin hai.' },
      { from: 'client', to: 'gw', label: '3 kul koshish', set: { gw: { tone: '', sub: '3 kul koshish' }, client: { tone: '' } }, say: 'Ab layers ka guna dekho. Mobile app ek action par 3 kul koshish karta hai.' },
      { from: 'gw', to: 'svc', label: 'har koshish × 3', tone: 'gold', set: { svc: { sub: '3 kul koshish' } }, say: 'api-gateway bhi har request par 3 kul koshish karta hai: ab 9.' },
      { from: 'svc', to: 'db', label: '× 3 = 27 requests', tone: 'bad', set: { db: { tone: 'bad', sub: 'ek action = 27 requests' } }, say: 'SDK bhi 3 kul koshish: 3 × 3 × 3 = 27 requests ek user action se. Retry sirf ek layer par rakho; baaki layers fail fast karein.' },
    ],
  },

  breaker: {
    intro: 'reco-api dheema ho gaya. Circuit breaker <b>kisko</b> bachata hai? Pehle khud ko.',
    nodes: [
      { id: 'co', col: 0, row: 1, icon: '🛒', label: 'checkout-api', sub: '200 threads', tone: 'accent' },
      { id: 'brk', col: 1, row: 1, icon: '🔌', label: 'Circuit breaker', sub: 'CLOSED' },
      { id: 'reco', col: 2, row: 1, icon: '🤖', label: 'reco-api' },
      { id: 'fb', col: 1, row: 2, icon: '📋', label: 'Fallback', sub: 'popular items list' },
    ],
    steps: [
      { from: 'brk', to: 'reco', label: 'CLOSED: calls jaati hain', say: 'CLOSED: calls reco-api tak jaati hain. Breaker ek window mein failures ginta hai.' },
      { at: ['reco'], set: { reco: { tone: 'bad', sub: '50%+ calls fail' } }, say: 'reco-api dheema hua: window mein 50% se zyada calls timeout.' },
      { at: ['brk'], set: { brk: { tone: 'bad', sub: 'OPEN · 30 s' }, co: { tone: 'good', sub: 'threads bache' } }, say: 'Breaker OPEN: 30 second tak koi call reco-api nahi jaati. Call 1 ms mein fail, 30 s ka intezaar nahi. checkout-api ke threads bache.' },
      { from: 'brk', to: 'fb', label: 'fallback', tone: 'good', say: 'Fallback: popular items ki cached list. Bina fallback ke breaker sirf "tez failure" hai.' },
      { from: 'brk', to: 'reco', label: 'HALF-OPEN: test call', tone: 'gold', set: { brk: { tone: 'gold', sub: 'HALF-OPEN' } }, say: '30 second baad HALF-OPEN: kuch test calls jaati hain. Pass → CLOSED. Fail → wapas OPEN.' },
      { at: ['brk'], set: { brk: { tone: 'good', sub: 'CLOSED' }, reco: { tone: 'good', sub: 'theek hua' } }, say: 'Test pass, breaker CLOSED. Breaker pehle khud ko bachata hai (threads), aur reco-api ko theek hone ka mauka deta hai.' },
      { at: ['brk'], say: 'Tuning: minimum calls rakho (5 mein se 3 fail par mat kholo). Sirf timeouts aur 5xx gino: 4xx gine toh breaker khud outage ban jaata hai (lab 38). Har dependency ka alag breaker.' },
    ],
  },

  bulkhead: {
    intro: 'Jahaz mein compartments isliye hote hain ki <b>ek chhed se poora jahaz na doobe</b>. shop-api mein kya hua?',
    nodes: [
      { id: 'users', col: 0, row: 1, icon: '👥', label: 'Users', tone: 'accent' },
      { id: 'app', col: 1, row: 1, icon: '⚙️', label: 'shop-api', sub: '200 threads, ek pool' },
      { id: 'co', col: 2, row: 0, icon: '🛒', label: '/checkout', sub: 'paisa' },
      { id: 'search', col: 2, row: 1, icon: '🔎', label: '/search' },
      { id: 'reco', col: 2, row: 2, icon: '🤖', label: '/recommendations', sub: 'optional' },
    ],
    steps: [
      { from: 'users', to: 'app', label: 'saare endpoints', say: 'shop-api ke saare endpoints ek hi 200-thread pool se thread lete hain.' },
      { from: 'app', to: 'reco', label: '30 s dheemi', tone: 'bad', set: { reco: { tone: 'bad', sub: '30 s dheemi' } }, say: 'Recommendations service 30 second dheemi hui. Recommendations ki requests threads pakde baithi hain.' },
      { at: ['app', 'co'], set: { app: { tone: 'bad', sub: '200/200 threads busy' }, co: { tone: 'bad', sub: 'down 💀' } }, say: '200 threads khatam → /checkout bhi down. Ek optional feature ne paise wala flow maar diya.' },
      { at: ['co', 'search', 'reco'], set: { app: { tone: '', sub: 'alag compartments' }, co: { tone: 'good', sub: '120 threads (apna)' }, search: { tone: 'good', sub: '60 threads (apna)' }, reco: { tone: 'bad', sub: '20 threads (apna)' } }, say: 'Bulkhead: har endpoint ka apna compartment. /checkout 120 threads, /search 60, /recommendations 20.' },
      { from: 'app', to: 'reco', label: '20 threads bhare', tone: 'bad', say: 'Recommendations ab bhi dheemi, aur apne 20 threads bhar deti hai. Baaki 180 threads safe.' },
      { from: 'app', to: 'co', label: 'checkout chalta raha ✅', tone: 'good', say: '/checkout ko pata bhi nahi chala. Bulkhead connection pools, queues aur alag servers par bhi lagta hai. Keemat: ek pool khaali pada ho toh bhi doosra use nahi kar sakta.' },
    ],
  },

  dlq: {
    intro: 'Ek kharab message ne <b>2 lakh messages</b> rok diye. Dead letter queue (DLQ) kaise bachati hai?',
    nodes: [
      { id: 'q', col: 0, row: 1, icon: '📮', label: 'cashback queue', sub: '2 lakh messages', tone: 'accent' },
      { id: 'c', col: 1, row: 1, icon: '👷', label: 'Consumer' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'wallet DB' },
      { id: 'dlq', col: 1, row: 2, icon: '🪦', label: 'DLQ' },
      { id: 'alert', col: 2, row: 2, icon: '🔔', label: 'Alert', sub: 'dlq.depth > 0' },
    ],
    steps: [
      { from: 'q', to: 'c', label: 'msg #4471', say: 'Consumer message #4471 uthata hai. JSON toota hua hai.' },
      { at: ['c', 'q'], set: { c: { tone: 'bad', sub: 'crash → wapas → crash' }, q: { tone: 'bad', sub: '2 lakh jam' } }, say: 'Bina DLQ: consumer crash, message wapas, phir crash. Infinite loop. Offset atka, peeche 2 lakh messages jam. Ek message = outage.' },
      { at: ['c'], set: { c: { tone: 'gold', sub: 'retry 1, 2, 3 (backoff)' } }, say: 'DLQ ke saath: fail hone par backoff ke saath retry 1, 2, 3. Asthaayi galti (DB thodi der band) inme theek ho jaati hai.' },
      { from: 'c', to: 'dlq', label: '3 baar fail → DLQ', tone: 'bad', set: { dlq: { tone: 'bad', sub: '#4471 + error + trace' } }, say: '3 baar ke baad message DLQ mein, saath mein original message, error, stack trace aur retry count.' },
      { from: 'c', to: 'db', label: 'baaki 2 lakh ✅', tone: 'good', set: { c: { tone: 'good', sub: 'aage badh gaya' }, q: { tone: 'good', sub: 'khaali ho rahi' } }, say: 'Consumer aage badh gaya. Baaki 2 lakh messages chal gaye.' },
      { from: 'dlq', to: 'alert', label: 'depth > 0', tone: 'gold', say: 'DLQ par alert laazmi: dlq.depth > 0. Jis DLQ ko koi nahi dekhta, wahan data chup-chaap marta hai.' },
      { from: 'dlq', to: 'c', label: 'fix ke baad replay', tone: 'good', say: 'Bug theek karke DLQ ke messages replay karo. Consumer idempotent ho, kyunki kuch messages pehle aadhe chal chuke ho sakte hain.' },
    ],
  },

  degrade: {
    intro: 'recommendations service down hai. Kya Aman ka <b>poora product page</b> girna chahiye?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Aman', sub: 'product page', tone: 'accent' },
      { id: 'page', col: 1, row: 1, icon: '📄', label: 'product-api' },
      { id: 'core', col: 2, row: 0, icon: '💰', label: 'Price + Buy', sub: 'CORE' },
      { id: 'rev', col: 2, row: 1, icon: '⭐', label: 'reviews', sub: 'IMPORTANT' },
      { id: 'reco', col: 2, row: 2, icon: '🤖', label: 'recommendations', sub: 'OPTIONAL' },
    ],
    steps: [
      { from: 'user', to: 'page', label: 'GET /product/42', say: 'Aman product page kholta hai.' },
      { at: ['reco', 'page'], set: { reco: { tone: 'bad', sub: 'down 💥' }, page: { tone: 'bad', sub: 'poora page 500' } }, say: 'recommendations down. Purana code: poora product page 500. Aman kuch khareed hi nahi sakta. Ek optional box ne revenue rok diya.' },
      { from: 'page', to: 'core', label: 'kabhi na gire', tone: 'good', set: { page: { tone: '', sub: 'adhoora jawab' }, core: { tone: 'good' } }, say: 'Degrade: CORE (product info, price, Buy button) hamesha chale.' },
      { from: 'page', to: 'rev', label: 'stale cache', tone: 'gold', set: { rev: { tone: 'gold', sub: '2 ghante purane' } }, say: 'reviews dheema? 2 ghante purane cached reviews dikhao. Thoda purana > kuch nahi.' },
      { at: ['reco'], set: { reco: { tone: 'muted', sub: 'chhupa diya' } }, say: 'Recommendations box chhupa do, khaali jagah bhi mat chhodo.' },
      { at: ['user'], set: { user: { sub: '"stock update ruka hai"' } }, say: 'Imaandaari: "Live stock abhi update nahi ho raha" jaisi line Aman ko dikhao. Chhupao mat.' },
      { at: ['core', 'rev', 'reco'], say: 'Har feature ko CORE / IMPORTANT / OPTIONAL mein pehle hi baanto, incident ke beech nahi. Paisa ya permission jaisi cheez par purana data dikhana galat faisle karwata hai: wahan fallback mat do.' },
    ],
  },

  shedding: {
    intro: 'Flash sale: <b>10,000 rps</b> aayi, capacity sirf <b>2,000</b>. Sabko andar lena sabse bura faisla kyun hai?',
    nodes: [
      { id: 'traffic', col: 0, row: 1, icon: '🌊', label: 'Traffic', sub: '10,000 rps', tone: 'accent' },
      { id: 'lb', col: 1, row: 1, icon: '🚦', label: 'Load shedder', sub: 'capacity 2,000' },
      { id: 'app', col: 2, row: 1, icon: '🎟️', label: 'ticket-api', sub: '2,000 rps tak' },
      { id: 'rej', col: 1, row: 2, icon: '⛔', label: '503 + Retry-After', sub: 'turant, sasta' },
    ],
    steps: [
      { from: 'traffic', to: 'lb', label: 'sab andar?', tone: 'bad', set: { app: { tone: 'bad', sub: 'p99 30 s · 0% safal' } }, say: 'Sabko andar aane do: queue badhti hai, p99 30 second, clients timeout hokar retry (load ×2). Nateeja: 0% requests safal, jabki 2,000 rps ho sakti thi.' },
      { from: 'lb', to: 'app', label: 'sirf 2,000 rps', tone: 'good', set: { app: { tone: 'good', sub: '2,000 rps poori speed' } }, say: 'Shed karo: sirf 2,000 rps andar, aur un 2,000 ko poori speed se serve karo.' },
      { from: 'lb', to: 'rej', label: 'baaki 8,000', tone: 'gold', say: 'Baaki ko turant 503 + Retry-After. Jaldi reject karna sasta hai; dheere fail hona sabse mehenga. 20% users khush, 0% se behtar.' },
      { at: ['lb'], set: { lb: { sub: 'checkout > browse > baaki' } }, say: 'Priority shedding: pehle analytics girao, phir browse, checkout sabse aakhir mein. Tiers pehle se likho. Neeche wale tier ki purani requests ko age boost do, taaki kabhi bhookhi na rahein.' },
      { at: ['lb'], set: { lb: { tone: 'gold', sub: '50% · 75% · 90% seedhi' } }, say: 'Ek switch nahi, seedhi: 50% par warning, 75% par low-priority shed, 90% par reject. Wapas utarne mein hysteresis, taaki baar-baar on/off na ho.' },
      { from: 'lb', to: 'traffic', label: '429: dheere bhejo', tone: 'good', say: 'Backpressure: signal source tak jaana chahiye (429 + Retry-After). Source khud dheema ho, tabhi bheed sach mein kam hoti hai.' },
    ],
  },

  backpressure: {
    intro: 'Producer 10,000/s bhejta hai, consumer 2,000/s sambhalta hai. <b>"Dheere bhejo"</b> kaun bolega?',
    nodes: [
      { id: 'det', col: 1, row: 0, icon: '📈', label: 'Detection', sub: 'growth rate · tail' },
      { id: 'prod', col: 0, row: 1, icon: '🏭', label: 'Producer', sub: '10,000/s', tone: 'accent' },
      { id: 'q', col: 1, row: 1, icon: '🧱', label: 'Queue' },
      { id: 'cons', col: 2, row: 1, icon: '👷', label: 'Consumer', sub: '2,000/s' },
      { id: 'pol', col: 1, row: 2, icon: '📜', label: 'Bhar gayi toh?', sub: 'policy = product faisla' },
    ],
    steps: [
      { from: 'prod', to: 'q', label: '10,000/s', say: 'Producer har second 10,000 messages queue mein daalta hai.' },
      { from: 'q', to: 'cons', label: '2,000/s', tone: 'bad', set: { q: { tone: 'bad', sub: 'line +8,000/s' } }, say: 'Consumer sirf 2,000/s nikaalta hai. Line har second 8,000 badhti hai. Unbounded queue ek jhooth hai: memory khatam, ya messages ghanton purane.' },
      { from: 'q', to: 'det', label: 'kitni tez badh rahi?', tone: 'gold', say: 'Detection: queue ki lambai nahi, badhne ki raftaar (growth rate) dekho; average nahi, tail latency. Errors bahut der se aate hain.' },
      { at: ['q'], set: { q: { tone: 'gold', sub: 'bounded: hadd tay' } }, say: 'Bounded queue: hadd tay karo. Ab sawaal: bhar gayi toh kya karein?' },
      { from: 'q', to: 'pol', label: 'chaar raaste', say: 'Chaar policies: block (batch pipelines), naya drop (retry-safe kaam), purana drop (dashboards, IoT jahan taazgi zaroori), ya error lautao (caller tay kare).' },
      { from: 'q', to: 'prod', label: '429 + Retry-After', tone: 'good', set: { prod: { tone: 'good', sub: 'dheema hua' } }, say: 'Propagation: signal source tak — 429 + Retry-After. Producer 2,000/s ya kam bheje toh line badhna rukti hai.' },
      { at: ['cons'], say: 'Pull model mein consumer khud speed tay karta hai. Kafka consumer pause()/resume() se partitions rok sakta hai. Node streams mein write() false de toh "drain" ka intezaar karo.' },
    ],
  },

  blast: {
    intro: 'Availability ka doosra sawaal: "kitni der" nahi, <b>"kitne users"</b> girenge? Cells aur shuffle sharding ka ganit.',
    nodes: [
      { id: 'fleet', col: 0, row: 0, icon: '🏢', label: 'Ek bada fleet', sub: 'blast radius: 100%' },
      { id: 'cells', col: 0, row: 1, icon: '🧊', label: '10 cells', sub: 'blast radius: 10%' },
      { id: 'shuf', col: 0, row: 2, icon: '🎲', label: '8 cells + shuffle', sub: 'blast radius: 3.6%' },
      { id: 'cust', col: 1, row: 1, icon: '🏏', label: 'DreamTeam11', sub: 'cells: C3 + C6', tone: 'accent' },
      { id: 'c3', col: 2, row: 0, icon: '📦', label: 'Cell 3' },
      { id: 'c6', col: 2, row: 2, icon: '📦', label: 'Cell 6' },
      { id: 'other', col: 3, row: 1, icon: '👥', label: 'Doosre customers', sub: 'alag jodiyan' },
    ],
    steps: [
      { at: ['fleet'], set: { fleet: { tone: 'bad' } }, say: 'Ek bade fleet par ek kharab deploy ya zehrila request = 100% users, chahe kitne bhi replicas hon.' },
      { at: ['cells'], set: { cells: { tone: 'gold' } }, say: '10 cells: har cell apna poora stack. Ek cell gira = 10% users. Keemat: 10 control planes, 10 deploys, 10 dashboards.' },
      { from: 'cust', to: 'c3', label: 'cell #1', say: 'Shuffle sharding: har customer ko 8 mein se koi 2 cells milte hain. DreamTeam11 ko Cell 3…' },
      { from: 'cust', to: 'c6', label: 'cell #2', say: '…aur Cell 6. Poora outage tabhi jab dono cells kharab hon.' },
      { at: ['c3', 'c6'], set: { c3: { tone: 'bad', sub: 'zehrila request se gira' }, c6: { tone: 'bad', sub: 'zehrila request se gira' } }, say: 'DreamTeam11 ka zehrila request Cell 3 aur Cell 6 dono gira deta hai. 8 cells mein C(8,2) = 28 jodiyan hain; isi jodi wale customers ≈ 1/28 = 3.6%.' },
      { at: ['other'], set: { other: { tone: 'good', sub: 'ek cell gira: degrade' } }, say: 'Jin customers ki jodi mein sirf ek cell gira (jaise C3 + C5), un customers ka doosra cell jawab deta hai: degrade, maut nahi.' },
      { at: ['shuf'], set: { shuf: { tone: 'good' } }, say: 'Bina shuffle 5% blast radius ke liye 20 cells chahiye (20 control planes). Shuffle se 8 cells mein 3.6%. Aur socho: gire cell ka load kahan jaayega? Spare capacity ya shed.' },
    ],
  },

  replication: {
    intro: 'Lab 32: app aur DB dono replicate kiye. Phir bhi system gir gaya. <b>Kaun si kadi</b> akeli thi?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '👥', label: 'Users', tone: 'accent' },
      { id: 'lb', col: 1, row: 1, icon: '⚖️', label: 'Load balancer', sub: 'sirf EK' },
      { id: 'a1', col: 2, row: 0, icon: '⚙️', label: 'app #1' },
      { id: 'a2', col: 2, row: 2, icon: '⚙️', label: 'app #2' },
      { id: 'd1', col: 3, row: 0, icon: '🗄️', label: 'DB primary', sub: 'zone A' },
      { id: 'd2', col: 3, row: 2, icon: '🗄️', label: 'DB replica', sub: 'zone B' },
    ],
    steps: [
      { from: 'user', to: 'lb', label: 'saari traffic', say: 'Saari traffic ek load balancer se guzarti hai.' },
      { at: ['a1', 'a2', 'd1', 'd2'], set: { a1: { tone: 'good' }, a2: { tone: 'good' }, d1: { tone: 'good' }, d2: { tone: 'good' } }, say: 'App aur DB do-do hain, alag zones mein. Kisi ek ke marne par bhi system chalta.' },
      { at: ['lb'], set: { lb: { tone: 'bad', sub: 'mara 💀' } }, say: 'Load balancer mara → lab mein sirf 25% available. Chain utni hi mazboot jitni kamzor kadi. Jo cheez sirf ek hai, wahi poora system hai.' },
      { at: ['lb'], set: { lb: { tone: 'good', sub: 'active-passive + VIP' } }, say: 'Load balancer bhi replicate karo: active-passive + floating IP (ya managed LB). Critical path ki har cheez: DB, LB, Kafka (RF 3), gateway, aur cache agar dependency hai.' },
      { at: ['a1', 'a2'], say: 'Active-active stateless apps ke liye aasan: dono traffic lete hain. Stateful DB mein dono jagah write = conflict ka khatra, isliye DB aksar active-passive.' },
      { from: 'd1', to: 'd2', label: 'process → zone → region', tone: 'gold', say: 'Replicas kahan rakho? Process → machine → rack → zone → region. Jitna door, utna bada hadsa jhel sakta hai, par sync utna dheema.' },
      { at: ['d2'], set: { d2: { tone: 'gold', sub: 'region B: DR' } }, say: 'Region hi gaya? DR ki seedhi: backup & restore → pilot light → warm standby → active-active. Upar jaao toh RTO aur RPO kam, par region B ka idle kharcha zyada (lab 40).' },
    ],
  },

  'replicas-backups': {
    intro: 'Raat 2 baje <code>DELETE FROM orders</code> chala, WHERE ke bina. Replica bachayega?',
    nodes: [
      { id: 'dev', col: 0, row: 1, icon: '😰', label: 'Galti wala script', sub: 'DELETE FROM orders', tone: 'bad' },
      { id: 'pri', col: 1, row: 1, icon: '🗄️', label: 'Primary', sub: '10,500 orders' },
      { id: 'rep', col: 2, row: 1, icon: '🪞', label: 'Replica', sub: '10,500 orders' },
      { id: 'snap', col: 1, row: 2, icon: '📸', label: 'Snapshot (subah)', sub: '10,000 orders' },
      { id: 'rest', col: 2, row: 2, icon: '🛟', label: 'Restored DB' },
      { id: 'wal', col: 3, row: 2, icon: '📜', label: 'WAL archive', sub: 'har change ka log' },
    ],
    steps: [
      { from: 'dev', to: 'pri', label: 'DELETE (bina WHERE)', tone: 'bad', set: { pri: { tone: 'bad', sub: '0 orders 😱' } }, say: 'Galti se WHERE ke bina DELETE. Primary par 0 orders.' },
      { from: 'pri', to: 'rep', label: 'turant copy', tone: 'bad', set: { rep: { tone: 'bad', sub: '0 orders 😱' } }, say: 'Replica wafadaar hai, galtiyon ke saath bhi: DELETE turant copy. Replica machine ke marne se bachata hai, galti se nahi.' },
      { from: 'snap', to: 'rest', label: 'sirf snapshot', tone: 'gold', set: { rest: { tone: 'gold', sub: '10,000 (500 gaye)' } }, say: 'Sirf subah ka snapshot restore kiya: 10,000 orders. Subah se raat tak ke 500 orders gaye.' },
      { from: 'wal', to: 'rest', label: 'DELETE se theek pehle tak', tone: 'good', set: { rest: { tone: 'good', sub: '10,500 ✅' } }, say: 'Snapshot + WAL log replay, DELETE se theek pehle ke pal tak (point-in-time restore): 10,500 orders ✅.' },
      { at: ['rest'], say: 'Backup tabhi backup hai jab restore ka test hua ho. Restore ka abhyaas asli Postgres par karo (SQL Gurukul lab).' },
    ],
  },

  flashcrowd: {
    intro: 'Board result <b>5 baje</b>. 12 lakh students ek saath. Achhi baat: tumhe pehle se pata hai kab aayenge.',
    nodes: [
      { id: 'scale', col: 1, row: 0, icon: '📈', label: 'Pre-scale', sub: '4:30 par servers up' },
      { id: 'batch', col: 2, row: 0, icon: '🧮', label: 'Precompute job', sub: '5 baje se pehle' },
      { id: 'st', col: 0, row: 1, icon: '🎓', label: '12 lakh students', sub: '~1,20,000 rps', tone: 'accent' },
      { id: 'wait', col: 1, row: 1, icon: '🚪', label: 'Waiting room', sub: '1.5 lakh andar' },
      { id: 'kv', col: 2, row: 1, icon: '🔑', label: 'Result KV store', sub: 'roll_no → result' },
      { id: 'rep', col: 3, row: 1, icon: '🪞', label: 'Replicas', sub: 'result immutable' },
    ],
    steps: [
      { at: ['st'], say: '4:59:59: 12 lakh students, ~1,20,000 rps. Normal scaling problem nahi: predictable flash crowd hai, aur waqt pehle se pata hai.' },
      { from: 'batch', to: 'kv', label: 'roll_no → poora result', tone: 'good', say: 'Precompute: 5 baje se pehle har roll number ka poora result object taiyaar. Request par koi calculation nahi.' },
      { at: ['scale'], set: { scale: { tone: 'good' } }, say: 'Pre-scale: autoscaling traffic aane ke BAAD react karta hai, aur minute laga deta hai. Servers pehle se chalu rakho.' },
      { from: 'st', to: 'wait', label: '1,20,000 rps', tone: 'gold', say: 'Admission control: waiting room. Ek waqt mein 1.5 lakh andar; baaki ko "loading…" aur line mein unka number.' },
      { from: 'wait', to: 'kv', label: 'GET roll_no', tone: 'good', say: 'Read path bilkul simple: partitioned key-value store, ek key lookup. Koi JOIN nahi, koi calculation nahi.' },
      { from: 'kv', to: 'rep', label: 'copies banao', tone: 'good', say: 'Result immutable hai, isliye aggressive replication mein conflict ho hi nahi sakta. Jitni copies chahiye, banao.' },
      { at: ['wait'], say: 'Retry amplification se bacho: refresh button par backoff. Aur asli traffic pattern ka load test, 5 baje se pehle.' },
    ],
  },

  observability: {
    intro: 'pay-api dheema hai. "Kya toota" kaafi nahi — <b>"waqt kahan gaya?"</b> Teen signals, teen alag sawaal.',
    nodes: [
      { id: 'red', col: 0, row: 0, icon: '🔴', label: 'RED', sub: 'rate · errors · duration' },
      { id: 'svc', col: 1, row: 1, icon: '⚙️', label: 'pay-api', tone: 'accent' },
      { id: 'use', col: 0, row: 2, icon: '🟡', label: 'USE', sub: 'utilization · saturation' },
      { id: 'met', col: 2, row: 0, icon: '📊', label: 'Metrics', sub: '"kuch galat hai?"' },
      { id: 'tr', col: 2, row: 1, icon: '🧵', label: 'Traces', sub: '"waqt kahan gaya?"' },
      { id: 'log', col: 2, row: 2, icon: '📜', label: 'Logs', sub: '"us request mein kya?"' },
      { id: 'lb', col: 3, row: 1, icon: '⚖️', label: 'Load balancer', sub: 'readiness check' },
    ],
    steps: [
      { from: 'svc', to: 'red', label: 'har service', say: 'RED har service ke liye: Rate (requests/sec), Errors, Duration (p50, p95, p99).' },
      { from: 'svc', to: 'use', label: 'har resource', say: 'USE har resource ke liye (CPU, DB pool, disk): Utilization, Saturation (kitna intezaar), Errors. Outage aksar saturation se aata hai; dashboard par aksar sirf utilization hota hai.' },
      { from: 'svc', to: 'met', label: 'sasta, aggregate', say: 'Metrics: "kya kuch galat hai?" Sasta aur aggregate; alerting isi se.' },
      { from: 'svc', to: 'tr', label: 'trace_id', say: 'Traces: "waqt KAHAN gaya?" Ek request ka poora safar, har hop ka waqt.' },
      { from: 'svc', to: 'log', label: 'trace_id se dhoondo', say: 'Logs: "us EK request mein kya hua?" Structured logs, trace_id ke saath, taaki trace se seedha log mil jaaye.' },
      { at: ['lb', 'svc'], set: { lb: { tone: 'gold', sub: 'pay-api ready hai?' } }, say: 'Liveness = process zinda hai? Readiness = traffic le sakta hai? (DB pool, dependencies). Pool khatam ho aur /health 200 de, toh health check jhooth bol raha hai.' },
      { at: ['met'], set: { met: { tone: 'good', sub: 'alert: symptoms par' } }, say: 'Alert symptoms par (error rate, p99, SLO burn), causes par nahi (CPU 80%). Jo user ko dukhe, wahi page kare.' },
    ],
  },

  slo: {
    intro: '"Kitna toot sakta hai?" ka ek number. SLI, SLO, SLA — aur <b>error budget</b>, jo product aur reliability ki bahas khatam karta hai.',
    nodes: [
      { id: 'nines', col: 1, row: 0, icon: '9️⃣', label: 'Nines', sub: 'har 9 ≈ 10x mehenga' },
      { id: 'sli', col: 0, row: 1, icon: '📏', label: 'SLI', sub: 'safal ÷ total' },
      { id: 'slo', col: 1, row: 1, icon: '🎯', label: 'SLO', sub: '99.9% / 30 din' },
      { id: 'sla', col: 2, row: 1, icon: '📜', label: 'SLA', sub: 'contract + paisa' },
      { id: 'bud', col: 1, row: 2, icon: '💰', label: 'Error budget', sub: '~43 min / mahina' },
      { id: 'dep', col: 2, row: 2, icon: '🚀', label: 'Naye deploys' },
    ],
    steps: [
      { at: ['sli'], say: 'SLI = jo tum naapte ho: safal requests ÷ total requests.' },
      { from: 'sli', to: 'slo', label: 'target', say: 'SLO = tumhara apna target: 30 din mein 99.9%.' },
      { from: 'slo', to: 'sla', label: 'SLA dheela rakho', tone: 'gold', say: 'SLA = customer se contract, paise ke saath. SLA hamesha SLO se dheela rakho, taaki SLO tootne par turant paisa na dena pade.' },
      { at: ['nines'], say: '99% = 432 min/mahina (7 ghante). 99.9% = 43 min. 99.99% = 4.3 min. 99.999% = 26 second. "100% uptime" target nahi, galatfehmi hai.' },
      { from: 'slo', to: 'bud', label: '100% − 99.9%', say: 'Error budget: 99.9% ka matlab ~43 minute/mahina kharch karne ki chhoot (time-based SLO mein). Product aur reliability ki bahas ab ek number par.' },
      { from: 'bud', to: 'dep', label: 'budget bacha: deploy', tone: 'good', say: 'Budget bacha hai? Deploy karo, experiment karo, tez chalo.' },
      { at: ['bud'], set: { bud: { tone: 'bad', sub: 'khatam' }, dep: { tone: 'muted', sub: 'ruke' } }, say: 'Budget khatam? Naye features ruko, reliability par kaam karo. SLO user ke dard par rakho (checkout safal hua?), CPU par nahi.' },
    ],
  },

  chaos: {
    intro: '"Humare paas 3 copies hain" — kya sach mein? Chaos engineering: todna nahi, <b>saabit</b> karna.',
    nodes: [
      { id: 'monkey', col: 0, row: 1, icon: '🐒', label: 'Chaos Monkey', tone: 'accent' },
      { id: 'i1', col: 1, row: 0, icon: '⚙️', label: 'instance 1' },
      { id: 'i2', col: 1, row: 1, icon: '⚙️', label: 'instance 2' },
      { id: 'i3', col: 1, row: 2, icon: '⚙️', label: 'instance 3' },
      { id: 'lb', col: 2, row: 1, icon: '⚖️', label: 'Load balancer' },
      { id: 'ss', col: 3, row: 1, icon: '📊', label: 'Steady state', sub: 'success ≥ 99.9%?' },
    ],
    steps: [
      { at: ['ss'], say: 'Steady state: "normal" ka number likho: success rate, p99, orders/min.' },
      { at: ['ss'], say: 'Hypothesis: "ek instance mare toh bhi success ≥ 99.9% rahega." Experiment ka kaam is hypothesis ko saabit ya galat karna hai.' },
      { from: 'monkey', to: 'i2', label: 'instance band', tone: 'bad', set: { i2: { tone: 'bad', sub: 'mara 💀' } }, say: 'Inject: Chaos Monkey instance 2 band karta hai. Chhota blast radius, aur "band karo" button taiyaar.' },
      { from: 'lb', to: 'i2', label: 'traffic ab bhi ja raha', tone: 'bad', set: { ss: { tone: 'bad', sub: '87.4% 😬' } }, say: 'Observe: lab 42 mein 3 instances, bina health check: 87.4%. Load balancer mare instance ko traffic bhejta raha.' },
      { at: ['lb'], set: { lb: { tone: 'good', sub: '+ health check' }, ss: { tone: 'gold', sub: '97.1%' } }, say: 'Kami theek: health check joda → 97.1%. Mare instance ko traffic band, par pata chalne tak kuch requests fail.' },
      { at: ['lb'], set: { lb: { sub: '+ health check + retry' }, ss: { tone: 'good', sub: '100% ✅' } }, say: 'Retry joda (idempotent requests par) → 100%. Monkey wahi, taiyaari alag. Steady state toote toh turant abort, kami likho, theek karo, dobara chalao.' },
    ],
  },

  'boss-resil': {
    intro: 'Pager <b>3:07 AM</b>. checkout gir raha hai. Pehle roko, phir diagnose, phir theek karo.',
    nodes: [
      { id: 'dash', col: 0, row: 0, icon: '📊', label: 'Dashboard', sub: 'CPU 12% · health green' },
      { id: 'co', col: 0, row: 1, icon: '🛒', label: 'checkout-api', sub: '60% errors · p99 9.9 s', tone: 'bad' },
      { id: 'pool', col: 1, row: 1, icon: '🧵', label: 'Thread pool', sub: 'ek hi, sab ke liye' },
      { id: 'sdk', col: 2, row: 1, icon: '🔁', label: 'payment SDK', sub: '3 retries, bina jitter' },
      { id: 'prov', col: 3, row: 1, icon: '🏦', label: 'Payment provider' },
      { id: 'fb', col: 2, row: 2, icon: '🪂', label: 'Fallback', sub: '"payment pending"' },
    ],
    steps: [
      { at: ['dash'], say: '3:07 AM. checkout ka error rate 60%, p99 9.9 s. Dashboard par CPU 12%, memory 40%, health green: "sab theek hai"?' },
      { from: 'sdk', to: 'prov', label: 'p99 8 s', tone: 'bad', set: { prov: { tone: 'bad', sub: 'down nahi, DHEEMA' } }, say: 'Diagnose: payment provider down nahi, DHEEMA hai: p99 8 second.' },
      { at: ['sdk'], set: { sdk: { tone: 'bad', sub: 'load ×4, sab ek saath' } }, say: 'SDK 3 retries karta hai, bina jitter: har call ki 4 koshish, load ×4, aur sab ek saath.' },
      { at: ['pool'], set: { pool: { tone: 'bad', sub: 'saare threads atke' } }, say: 'Ek hi thread pool sab ke liye: payment ke intezaar mein threads khatam, checkout ke baaki kaam bhi gire.' },
      { at: ['sdk'], set: { sdk: { tone: 'good', sub: 'timeout + jitter + 1 retry' } }, say: 'Roko: timeout se ek call ka intezaar bounded; jitter se retry storm ka synchronization tootta hai; retries kam.' },
      { at: ['pool'], set: { pool: { tone: 'good', sub: 'payment ka alag pool' } }, say: 'Bulkhead: payment calls ka alag pool. Blast radius chhota: payment atke toh bhi baaki checkout chale.' },
      { from: 'sdk', to: 'fb', label: 'breaker OPEN', tone: 'good', say: 'Circuit breaker failing provider par koshish rokta hai. Fallback: order "payment pending" mein, user ko saaf message, baad mein confirm.' },
      { at: ['co'], set: { co: { tone: 'good', sub: 'sambhal gaya' } }, say: 'Load shedding tay karti hai overload mein kitna kaam lena hai. Har guard ka alag kaam. Har remote call ek din fail hogi; sawaal hai tab system kya karega.' },
    ],
  },

});
