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
      { at: ['svc'], say: 'Kya retry karo: sirf asthaayi galti (timeout, 503, 429 + Retry-After) aur sirf idempotent kaam. 400, 401, 422 par kabhi nahi: dobara bhejne se jawab nahi badlega.' },
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
      { from: 'q', to: 'prod', label: '429 + Retry-After', tone: 'good', set: { prod: { tone: 'good', sub: 'dheema hua' } }, say: 'Propagation: signal source tak — 429 + Retry-After. Producer dheema hota hai, aur line badhna rukti hai.' },
      { at: ['cons'], say: 'Pull model mein consumer khud speed tay karta hai. Kafka consumer pause()/resume() se partitions rok sakta hai. Node streams mein write() false de toh "drain" ka intezaar karo.' },
    ],
  },

});
