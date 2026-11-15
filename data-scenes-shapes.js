/* =====================================================================
   System Gurukul — Scenes: 🧩 Shapes (shapes track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  classify: {
    intro: 'Interviewer: "Instagram jaisa feed banao." Boxes banane se pehle <b>chaar sawaal</b>, 30 second mein.',
    nodes: [
      { id: 'q1', col: 1, row: 0, icon: '1️⃣', label: 'Read ya write?', sub: 'read bahut zyada' },
      { id: 'q2', col: 2, row: 0, icon: '2️⃣', label: 'Turant ya baad?', sub: '2 s der chalegi' },
      { id: 'q3', col: 3, row: 0, icon: '3️⃣', label: 'Serve ya process?', sub: 'serve: p99 zaroori' },
      { id: 'prob', col: 0, row: 1, icon: '🧩', label: 'Naya problem', sub: 'Instagram jaisa feed', tone: 'accent' },
      { id: 'fail', col: 1, row: 1, icon: '💀', label: 'Failure modes', sub: 'pehle se pata' },
      { id: 'shape', col: 2, row: 1, icon: '🏷️', label: 'Shape ka naam' },
      { id: 'q4', col: 3, row: 1, icon: '4️⃣', label: 'Fanout kitna?', sub: 'laakhon followers' },
    ],
    steps: [
      { at: ['prob'], say: 'Aam galti: seedha boxes — LB, service, DB, cache. "Cache kyun?" "Scale ke liye." Pehle shape ka naam lo, phir box.' },
      { from: 'prob', to: 'q1', label: 'sawaal 1', say: 'Read zyada ya write zyada? Feed mein reads bahut zyada: cache aur replicas ki taraf ishara.' },
      { from: 'q1', to: 'q2', label: 'sawaal 2', say: 'Turant chahiye ya thodi der chalegi? Naya post 2 second baad dikhe toh chalega: queue aur async theek.' },
      { from: 'q2', to: 'q3', label: 'sawaal 3', say: 'Serve kar rahe ho ya process? Serve: latency aur p99 sabse zaroori.' },
      { from: 'q3', to: 'q4', label: 'sawaal 4', say: 'Ek user tak ya laakhon tak fanout? Celebrity ke 1 crore followers: fanout ka sawaal.' },
      { from: 'q4', to: 'shape', label: 'naam', tone: 'good', set: { shape: { tone: 'good', sub: 'read-heavy + fanout' } }, say: 'Naam: read-heavy + fanout. Ek system mein aksar 2–3 shapes hote hain, ek nahi.' },
      { from: 'shape', to: 'fail', label: 'naam ke saath aaye', tone: 'gold', set: { fail: { tone: 'gold', sub: 'hot key, stampede, lag' } }, say: 'Naam aate hi failure modes saamne: celebrity hot key, cache stampede, fanout lag. Ab har box ka karan hai. Bonus sawaal: galat jawab kitna mehenga?' },
    ],
  },

  search: {
    intro: 'Aman "wireless" khojta hai. <code>LIKE \'%wireless%\'</code> chalta hai — aur poori table padhi jaati hai.',
    nodes: [
      { id: 'db', col: 2, row: 0, icon: '🗄️', label: 'Postgres', sub: 'products · source of truth' },
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Aman', sub: '"wireless" khojo', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'search-api' },
      { id: 'idx', col: 2, row: 2, icon: '📚', label: 'Search index', sub: 'inverted index' },
      { id: 'ixr', col: 3, row: 1, icon: '🔁', label: 'Indexer', sub: 'CDC / events' },
    ],
    steps: [
      { from: 'user', to: 'api', label: 'q=wireless', say: 'Aman search box mein "wireless" likhta hai.' },
      { from: 'api', to: 'db', label: "LIKE '%wireless%'", tone: 'bad', set: { db: { tone: 'bad', sub: 'full scan 😵' } }, say: "B-tree shuruaat se navigate karta hai. Beech ka match = shuruaat pata nahi = har row padho. LIKE 'wireless%' chalega, '%wireless%' nahi: sirf ek % ka farak." },
      { at: ['idx'], set: { db: { tone: '', sub: 'products · source of truth' } }, say: 'Inverted index: table ko ulta karo. Normal: doc 12 → "wireless bluetooth headphones". Inverted: "wireless" → [12, 47, 88, …].' },
      { from: 'api', to: 'idx', label: 'wireless AND bluetooth', tone: 'good', say: 'Do shabd = do sorted lists ka intersection: [12, 47, 88] ∩ [12, 205] = [12]. Tez.' },
      { from: 'db', to: 'ixr', label: 'naya product', say: 'Merchant ne naya product save kiya. Indexer DB ka change padhta hai (CDC ya event).' },
      { from: 'ixr', to: 'idx', label: 'async update', tone: 'gold', set: { idx: { tone: 'gold', sub: 'kuch second peeche' } }, say: 'Index async update hota hai. "Maine save kiya, search mein nahi dikh raha" — is shape ka signature bug. Lag ka metric rakho.' },
      { at: ['idx'], say: 'Search index kabhi source of truth nahi: DB se dobara banaya ja sake. Kaunsa result upar aaye (relevance) product ka faisla hai, DB ka nahi.' },
    ],
  },

  media: {
    intro: 'Riya <b>4 GB ka video</b> upload kar rahi hai, dheeme mobile network par. Bytes kis raaste jaayein?',
    nodes: [
      { id: 'app', col: 1, row: 0, icon: '⚙️', label: 'app server' },
      { id: 'phone', col: 0, row: 1, icon: '📱', label: 'Riya ka phone', sub: '4 GB video', tone: 'accent' },
      { id: 's3', col: 2, row: 1, icon: '🪣', label: 'Object storage', sub: 'S3 jaisa' },
      { id: 'pipe', col: 3, row: 1, icon: '⚙️', label: 'Processing', sub: 'transcode, thumbnail' },
      { id: 'db', col: 1, row: 2, icon: '🗄️', label: 'Postgres', sub: 'sirf metadata' },
    ],
    steps: [
      { from: 'phone', to: 'app', label: '4 GB proxy ❌', tone: 'bad', set: { app: { tone: 'bad', sub: '12 min thread + DB conn' } }, say: 'Proxy upload: 4 GB, dheema network = 12 minute. Us poore waqt app server ka ek thread (aur aksar ek DB connection) pakda raha.' },
      { at: ['app'], say: '50 log ek saath upload karein → pool khatam → poori API timeout, upload se bina lena-dena wale endpoints bhi. Wahi pool exhaustion: CPU 10%, health green, sab timeout.' },
      { from: 'phone', to: 'app', label: 'signed URL do', tone: 'good', set: { app: { tone: 'good', sub: 'sirf 40 ms ka kaam' } }, say: 'Presigned URL: app server sirf 40 ms mein ek signed URL deta hai.' },
      { from: 'phone', to: 's3', label: 'seedha upload (4 GB)', tone: 'good', say: 'Phone 4 GB seedha object storage par bhejta hai. App server beech mein hai hi nahi.' },
      { from: 'app', to: 'db', label: 'metadata row', say: 'Bytes object storage mein, metadata (owner, size, status) DB mein. Hamesha.' },
      { from: 's3', to: 'pipe', label: 'event: "aa gaya"', say: 'Upload poora → event → processing (transcode, thumbnail). Status first-class: uploading → processing → ready / failed; user ko dikhao.' },
      { at: ['s3'], set: { s3: { tone: 'gold', sub: '30 din baad: sasta tier' } }, say: 'Tiering: purana video sasti storage class mein. Purana data sasta hona chahiye.' },
    ],
  },

  realtime: {
    intro: 'ChaiPay app ko live update chahiye. Polling, SSE ya WebSocket? Aur yaad rakho: <b>connection bhi ek resource hai</b>.',
    nodes: [
      { id: 'poll', col: 1, row: 0, icon: '🔁', label: 'Polling', sub: 'har 5 s request' },
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'ChaiPay app', tone: 'accent' },
      { id: 'sse', col: 1, row: 1, icon: '📡', label: 'SSE', sub: 'ek-tarfa stream' },
      { id: 'ws', col: 1, row: 2, icon: '🔌', label: 'WebSocket', sub: 'do-tarfa' },
      { id: 'gw', col: 2, row: 1, icon: '🚪', label: 'Realtime gateway', sub: '50,000 khuli connections' },
      { id: 'store', col: 3, row: 1, icon: '📬', label: 'Message store', sub: 'offline backlog' },
    ],
    steps: [
      { from: 'app', to: 'poll', label: 'kuch naya?', say: 'Polling: har 5 second ek request. Update kam hon toh sabse simple, aur aksar kaafi.' },
      { from: 'app', to: 'sse', label: 'notifications', tone: 'good', say: 'SSE: server se ek-tarfa stream, plain HTTP. Proxies aur auto-reconnect muft. Notifications aur LLM tokens ke liye sahi.' },
      { from: 'app', to: 'ws', label: 'chat', say: 'WebSocket: do-tarfa, jab client bhi bheje (chat, collab, gaming). Sirf notifications ke liye WebSocket aam over-engineering hai.' },
      { from: 'sse', to: 'gw', label: '50,000 connections', tone: 'gold', set: { gw: { tone: 'gold' } }, say: 'Har khuli connection memory aur file descriptor leti hai. Connections stateful hain, isliye scaling ka hisaab rps se nahi, khuli connections se.' },
      { from: 'gw', to: 'store', label: 'offline backlog', say: 'Sabse bada sawaal: offline user. Phone band tha toh messages store mein rakho; wapas aaye toh "last seen id" ke baad wale bhejo.' },
      { at: ['gw'], set: { gw: { tone: 'bad', sub: 'restart: sab ek saath' } }, say: 'Reconnect storm: gateway restart hua, 50,000 phone ek saath wapas judte hain. Ilaaj: random jitter ke saath reconnect, aur connections dheere-dheere drain.' },
      { at: ['store'], say: 'Fanout write par (har follower ki inbox mein daalo) ya read par (padhte waqt jodo)? Celebrity ke liye read par, aam user ke liye write par.' },
    ],
  },

  geo: {
    intro: 'Riya ko <b>paas ke drivers</b> chahiye. lat/lng par BETWEEN laga do? Dhokha.',
    nodes: [
      { id: 'bad', col: 1, row: 0, icon: '❌', label: 'lat/lng BETWEEN', sub: 'poori latitude patti' },
      { id: 'rider', col: 0, row: 1, icon: '📱', label: 'Riya', sub: '19.076, 72.877', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'nearby-api' },
      { id: 'gh', col: 2, row: 1, icon: '🔡', label: 'Geohash index', sub: 'Mumbai → te7ud9k' },
      { id: 'cells', col: 3, row: 1, icon: '🧩', label: 'Padosi cells' },
      { id: 'hot', col: 2, row: 2, icon: '🔥', label: 'Hot cell', sub: 'BKC, shaam 6 baje' },
    ],
    steps: [
      { from: 'rider', to: 'api', label: 'paas ke drivers?', say: 'Riya paas ke drivers maangti hai.' },
      { from: 'api', to: 'bad', label: 'lat BETWEEN, lng BETWEEN', tone: 'bad', set: { bad: { tone: 'bad', sub: '4 lakh rows padhi' } }, say: 'Composite (lat, lng) index pehli range se scan bound karta hai: poore desh ki us latitude patti ke 4 lakh drivers, phir lng se filter. B-tree 1D hai, jagah 2D.' },
      { from: 'api', to: 'gh', label: "prefix 'te7ud'", tone: 'good', say: 'Geohash do dimensions ko ek string mein badalta hai. Prefix chhota = cell bada: te ≈ 1250 km, te7u ≈ 39 km, te7ud ≈ 5 km.' },
      { at: ['gh'], set: { gh: { tone: 'good', sub: "LIKE 'te7ud%' (range)" } }, say: "Nearby = prefix scan: WHERE geohash LIKE 'te7ud%'. Ek sorted range — B-tree ka favourite kaam." },
      { from: 'gh', to: 'cells', label: 'radius ki saari cells', tone: 'gold', say: 'Cell boundary: Riya cell ke kinare par ho toh paas ka driver doosre cell mein ho sakta hai. Radius ko cover karne wali saari cells padho.' },
      { from: 'gh', to: 'hot', label: 'hazaaron drivers', tone: 'bad', set: { hot: { tone: 'bad' } }, say: 'Hot cell: geo data kabhi barabar nahi bikharta. BKC mein shaam 6 baje ek cell mein hazaaron drivers. Ilaaj: wahan chhote cells (lamba prefix) ya cell ko aur baanto.' },
    ],
  },

  ledger: {
    intro: 'Paisa "lagbhag sahi" nahi chalta. Riya ka balance <b>₹4,700 kyun</b> hai — kya tum bata sakte ho?',
    nodes: [
      { id: 'bal', col: 1, row: 0, icon: '🔢', label: 'balance column', sub: 'UPDATE … − 500' },
      { id: 'riya', col: 2, row: 0, icon: '👩', label: 'Riya ka account' },
      { id: 'pay', col: 0, row: 1, icon: '💸', label: 'pay-api', tone: 'accent' },
      { id: 'led', col: 1, row: 1, icon: '📒', label: 'ledger_entries', sub: 'sirf INSERT' },
      { id: 'bank', col: 3, row: 1, icon: '🏦', label: 'Bank statement' },
      { id: 'shop', col: 2, row: 2, icon: '🍬', label: 'Sharma Sweets' },
    ],
    steps: [
      { from: 'pay', to: 'bal', label: 'SET balance = balance − 500', tone: 'bad', set: { bal: { tone: 'bad', sub: '4700 — par kyun?' } }, say: 'Pehli galti: balance column ko UPDATE karna. "3 tareekh ko balance kya tha?" "4700 kyun hai?" Pata nahi; purani value mit gayi.' },
      { from: 'pay', to: 'led', label: 'INSERT entry', tone: 'good', say: 'Ledger: har badlaav ek nayi entry: +5000 topup, −500 order, +200 refund. Kabhi UPDATE ya DELETE nahi.' },
      { at: ['led'], set: { led: { tone: 'good', sub: 'balance = SUM = 4700' } }, say: 'Balance = entries ka SUM = 4700. Har number ka kab, kitna, kyun maujood hai.' },
      { from: 'led', to: 'riya', label: '−500 (debit)', say: 'Double-entry: Riya ne Sharma Sweets ko ₹500 diye. Pehli entry: Riya ke account se −500.' },
      { from: 'led', to: 'shop', label: '+500 (credit)', tone: 'good', say: 'Doosri entry: Sharma Sweets +500. Sab entries ka jod hamesha 0: paisa na banta hai, na mitta hai.' },
      { at: ['bank'], set: { bank: { tone: 'gold', sub: 'roz milao' } }, say: 'Reconciliation: roz ledger ko bank statement se milao. Farak mila toh entries batati hain kahan aur kab.' },
      { at: ['led'], say: 'Paise mein cache aur eventual consistency khatra: purana balance dekh kar do payments pass ho sakte hain. Kharch ka faisla taaza data par.' },
    ],
  },

  antipattern: {
    intro: 'Candidate ne ek <b>3-table CRUD app</b> ko 15 microservices mein tod diya. Pattern ka naam yaad tha — keemat nahi.',
    nodes: [
      { id: 'ms', col: 2, row: 0, icon: '🧩', label: 'Microservices' },
      { id: 'es', col: 3, row: 0, icon: '📜', label: 'Event sourcing' },
      { id: 'cand', col: 0, row: 1, icon: '🧑‍🎓', label: 'Candidate', sub: '"15 services banao"', tone: 'accent' },
      { id: 'app', col: 1, row: 1, icon: '📋', label: '3-table CRUD app' },
      { id: 'pg', col: 1, row: 2, icon: '🐘', label: 'Boring Postgres', sub: 'ek DB, ek deploy' },
      { id: 'cqrs', col: 2, row: 2, icon: '🔀', label: 'CQRS' },
      { id: 'kafka', col: 3, row: 2, icon: '📨', label: 'Kafka' },
    ],
    steps: [
      { from: 'cand', to: 'app', label: '15 microservices', tone: 'bad', say: 'Candidate ko pattern yaad tha. Pattern kis dard ka ilaaj hai, aur badle mein kya maangta hai, nahi pata tha.' },
      { at: ['ms'], set: { ms: { tone: 'bad', sub: 'har call = network call' } }, say: 'Microservices: har method call ab network call — fail, dheemi ya duplicate ho sakti hai.' },
      { at: ['es'], set: { es: { tone: 'bad', sub: 'projections + schema' } }, say: 'Event sourcing: "abhi state kya hai?" ke liye projections chahiye, aur event schema badalna mushkil.' },
      { at: ['cqrs'], set: { cqrs: { tone: 'bad', sub: 'write ke baad purana read' } }, say: 'CQRS: write ke turant baad read purana aata hai. UX ko sambhaalna padta hai.' },
      { at: ['kafka'], set: { kafka: { tone: 'bad', sub: 'ek aur cluster' } }, say: 'Kafka: ek aur cluster chalana, partitions, ordering aur ops ka bojh.' },
      { from: 'app', to: 'pg', label: 'boring SQL', tone: 'good', set: { pg: { tone: 'good' } }, say: 'Boring SQL kab jeetta hai: chhota data, transactions zaroori, team chhoti. Ek Postgres = ek backup, ek monitoring, ek on-call.' },
      { at: ['cand'], say: 'Har chunav ke liye ek sawaal: "chuna gaya pattern kya theek kar raha hai, jo abhi sach mein toota hua hai?" Jawab mein "aage chal ke" aaya, toh abhi zaroorat nahi.' },
    ],
  },

  chooser: {
    intro: 'Default stack se shuru karo. Doosra aujaar tabhi jab koi <b>maapi hui cheez</b> majboor kare.',
    nodes: [
      { id: 'pg', col: 0, row: 0, icon: '🐘', label: 'Postgres', sub: 'transactions, joins' },
      { id: 'cas', col: 1, row: 0, icon: '🗄️', label: 'Cassandra', sub: 'bhaari writes' },
      { id: 'redis', col: 2, row: 0, icon: '⚡', label: 'Redis', sub: 'cache, counters, locks' },
      { id: 'def', col: 1, row: 1, icon: '🧰', label: 'Default stack', sub: 'Postgres+Redis+S3+queue', tone: 'accent' },
      { id: 's3', col: 2, row: 1, icon: '🪣', label: 'S3', sub: 'bytes, backups' },
      { id: 'es', col: 0, row: 2, icon: '🔍', label: 'Elasticsearch', sub: 'full-text, facets' },
      { id: 'kafka', col: 1, row: 2, icon: '📨', label: 'Kafka', sub: 'durable log, replay' },
      { id: 'ch', col: 2, row: 2, icon: '📊', label: 'ClickHouse', sub: 'crore rows ka aggregate' },
    ],
    steps: [
      { at: ['def'], say: 'Default stack: Postgres + Redis + S3 + ek queue. Hatne ka karan maapa hua ho. "Aage chal ke" karan nahi hai.' },
      { at: ['pg'], set: { pg: { tone: 'gold', sub: 'galat: video, analytics' } }, say: 'Postgres: transactions, joins, constraints. Galat istemaal: 4 GB videos rakhna, crore rows par analytics chalana.' },
      { from: 'def', to: 'es', label: 'LIKE full scan kar raha', tone: 'good', set: { es: { sub: 'galat: source of truth' } }, say: 'Elasticsearch tab jab LIKE full scan kar raha ho. Galat istemaal: source of truth banana, ya badalta data (daam) wahan rakhna.' },
      { from: 'def', to: 'kafka', label: 'replay + kai consumers', tone: 'good', say: 'Kafka tab jab kai teams ko wahi events aur replay chahiye. Galat: sirf background jobs ke liye (simple queue kaafi), ya sync path mein.' },
      { from: 'def', to: 'ch', label: 'analytics OLTP ko dho rahi', tone: 'good', say: 'Columnar (ClickHouse) tab jab analytics queries OLTP ka buffer pool dho rahi hon. Galat: single-row updates, OLTP ki jagah.' },
      { from: 'def', to: 'cas', label: 'write rate > ek machine', tone: 'good', say: 'Cassandra tab jab ek table ka write rate ek machine se bahar ho aur access hamesha (device, time) se. Galat: ad-hoc queries; partition key baad mein nahi badalti.' },
      { at: ['redis', 's3'], set: { redis: { sub: 'galat: source of truth' }, s3: { sub: 'galat: database banana' } }, say: 'Redis: cache, counters, locks, sorted sets — par source of truth nahi (memory-first). S3: bytes aur backups — database ya query engine nahi.' },
      { at: ['def'], say: 'Interview mein mat bolo: "scale ke liye NoSQL", "Redis laga denge". Bolo: "write rate 80k/s ek node se bahar, access (device, time) se — isliye Cassandra." Har chunav ke saath zaroorat.' },
    ],
  },

  coffeeshop: {
    intro: 'Coffee shop = Uber = DoorDash = video transcoding. <b>Ek hi shape</b>: kaam aata hai → limited resources → poora hone par khabar.',
    nodes: [
      { id: 'big', col: 1, row: 0, icon: '🧾', label: 'Bade orders counter', sub: 'bulkhead' },
      { id: 'bar', col: 2, row: 0, icon: '🧑‍🍳', label: '8 baristas' },
      { id: 'line', col: 0, row: 1, icon: '🧍', label: 'Counter ki line', sub: 'request queue', tone: 'accent' },
      { id: 'cash', col: 1, row: 1, icon: '🎫', label: 'Cashier' },
      { id: 'mach', col: 2, row: 1, icon: '☕', label: '3 espresso machines', sub: 'asli bottleneck' },
      { id: 'pick', col: 3, row: 1, icon: '📣', label: 'Pickup counter' },
      { id: 'milk', col: 2, row: 2, icon: '🥛', label: 'Doodh', sub: 'dependency' },
    ],
    steps: [
      { from: 'line', to: 'cash', label: '2 cappuccino', say: 'Counter ki line = request queue. Line bahut lambi ho toh naye customer ko saaf batao (backpressure).' },
      { at: ['cash'], set: { cash: { tone: 'good', sub: 'token #47 = 202' } }, say: 'Token ka parcha = 202 Accepted + status endpoint. Wahi token dobara dikhao toh wahi order: idempotency ka anchor.' },
      { from: 'cash', to: 'mach', label: 'order #47', say: 'Order machines tak. Order ki state machine: liya → ban raha → ready.' },
      { at: ['mach', 'bar'], say: 'Asli bottleneck 3 espresso machines hain, 8 baristas nahi. Baristas badhane se coffee tez nahi banti; resource pool machines ka hai.' },
      { from: 'mach', to: 'pick', label: '"Order 47 ready!"', tone: 'good', say: 'Notification: "Order 47 ready!" Push, aur poll fallback (customer screen bhi dekh sakta hai).' },
      { at: ['milk'], set: { milk: { tone: 'bad', sub: 'khatam!' } }, say: 'Dependency failure: doodh khatam. Fallback: black coffee, aur saaf signal. "Aaj sirf simple coffee" — dukaan band karne se behtar (graceful degradation).' },
      { at: ['big'], set: { big: { tone: 'good' } }, say: 'Bulkhead: bade orders ka alag counter, taaki 20 coffee ka ek order poori line na roke. Admission control: "abhi 20 minute wait" — sach batao, faisla customer ka.' },
      { at: ['line'], say: 'Order aane ki rate banne ki rate se zyada hai toh line har minute badhti hai, chahe jitne baristas ho. Jaana-pehchana sawaal sabse mushkil: jargon hatao, shape dekho.' },
    ],
  },

  review: {
    intro: 'Design review ka ek hi kram, har baar. Aur ek sawaal jo bottleneck khol deta hai.',
    nodes: [
      { id: 'fr', col: 0, row: 0, icon: '1️⃣', label: 'FR', sub: 'kya karna hai' },
      { id: 'nfr', col: 1, row: 0, icon: '2️⃣', label: 'NFR ⭐', sub: 'kitna, kitni jaldi' },
      { id: 'est', col: 2, row: 0, icon: '3️⃣', label: 'Estimates ⭐', sub: 'traffic, data, growth' },
      { id: 'api', col: 3, row: 0, icon: '4️⃣', label: 'API', sub: 'entities pehle' },
      { id: 'fail', col: 0, row: 1, icon: '8️⃣', label: 'Failure modes ⭐', sub: 'sabse zyada skip' },
      { id: 'trade', col: 1, row: 1, icon: '7️⃣', label: 'Tradeoffs', sub: 'X kyunki Y; keemat Z' },
      { id: 'comp', col: 2, row: 1, icon: '6️⃣', label: 'Components', sub: 'boxes' },
      { id: 'data', col: 3, row: 1, icon: '5️⃣', label: 'Data model', sub: 'access pattern se' },
      { id: 'x10', col: 1, row: 2, icon: '🔟', label: '10x par kya toote?' },
    ],
    steps: [
      { at: ['fr'], say: '1. FR (kya karna hai): 3–5 lines. User order de sake, status dikhe, refund ho sake. Har design mein mumkin — architecture ka koi ishara nahi.' },
      { from: 'fr', to: 'nfr', label: 'kaisa?', tone: 'gold', say: '2. NFR (kaisa): p99 200 ms, 99.9%, peak 5,000 rps, order kabhi kho na sake. Aadhe faisle yahi karte hain. "Tez" requirement nahi; "p99 200 ms" hai.' },
      { from: 'nfr', to: 'est', label: 'kitna bada?', say: '3. Estimates: traffic, data, growth. Aksar yahin pata chalta hai ki problem chhota hai ya bada.' },
      { from: 'est', to: 'api', label: '5 minute', say: '4. API: pehle entities, phir endpoints. API ek kadam hai, manzil nahi.' },
      { from: 'api', to: 'data', label: 'access patterns', say: '5. Data model: access patterns se schema. Ulta kiya toh migrations likhoge.' },
      { from: 'data', to: 'comp', label: 'ab boxes', say: '6. Components: boxes. Log yahin se shuru karte hain, isliye design bina karan ka rehta hai.' },
      { from: 'comp', to: 'trade', label: 'har faisle ka kyun', say: '7. Tradeoffs: "maine X chuna, kyunki Y; keemat Z".' },
      { from: 'trade', to: 'fail', label: 'gira toh?', tone: 'bad', say: '8. Failure modes: sabse zyada skip hone wala kadam. Har box ke liye poochho: gira toh kya hoga?' },
      { at: ['x10'], set: { x10: { tone: 'gold', sub: 'pool → workers → limit' } }, say: '"10x par kya SABSE PEHLE tootega?" Aksar: DB connection pool, phir thread/worker pool, phir downstream rate limit. Aur poochho: rollback aur migration plan kya hai?' },
    ],
  },

  'boss-shapes': {
    intro: 'Food delivery, raat 8 baje, <b>8,000 rps</b>, aadha traffic ek ilaake se. Pehle shapes gino, phir boxes.',
    nodes: [
      { id: 'geo', col: 0, row: 0, icon: '📍', label: 'Nearby restaurants', sub: 'geo + read-heavy' },
      { id: 'menu', col: 1, row: 0, icon: '📖', label: 'Menu + listing', sub: 'read-heavy' },
      { id: 'order', col: 2, row: 0, icon: '🔄', label: 'Order lifecycle', sub: 'workflow' },
      { id: 'dash', col: 0, row: 1, icon: '📊', label: 'Restaurant dashboard', sub: 'COUNT(*) · pool 50' },
      { id: 'app', col: 1, row: 1, icon: '🍽️', label: 'Food delivery app', sub: '8 PM · 8,000 rps', tone: 'accent' },
      { id: 'pay', col: 2, row: 1, icon: '💰', label: 'Payment', sub: 'ledger' },
      { id: 'search', col: 0, row: 2, icon: '🔍', label: 'Restaurant search', sub: 'search' },
      { id: 'sms', col: 1, row: 2, icon: '🔔', label: '"Order accept" SMS', sub: 'notification' },
      { id: 'track', col: 2, row: 2, icon: '🛵', label: 'Live tracking', sub: 'realtime fanout' },
    ],
    steps: [
      { at: ['geo'], set: { geo: { tone: 'gold', sub: 'hot cell → chhote cells' } }, say: 'Nearby restaurants: geo + read-heavy. Aadha traffic ek ilaake se = hot cell. Ilaaj: wahan chhote cells aur cache.' },
      { at: ['menu'], set: { menu: { tone: 'gold', sub: 'stampede → jitter + lock' } }, say: 'Menu aur listing: read-heavy. Failure: stampede aur hot key. Ilaaj: TTL jitter aur single-flight (coalescing).' },
      { at: ['order'], set: { order: { tone: 'gold', sub: 'beech mein fail → saga' } }, say: 'Order lifecycle: workflow. Failure: beech mein fail. Ilaaj: saga + compensation, aur state user ko dikhao.' },
      { at: ['pay'], set: { pay: { tone: 'gold', sub: 'double charge → idem key' } }, say: 'Payment: ledger. Failure: double charge, numbers match nahi. Ilaaj: idempotency key, ledger entries, roz reconciliation.' },
      { at: ['track'], set: { track: { tone: 'gold', sub: 'reconnect storm → jitter' } }, say: 'Live tracking: realtime fanout. Failure: reconnect storm aur offline gap. Ilaaj: jitter ke saath reconnect, last-seen se backlog.' },
      { at: ['sms'], set: { sms: { tone: 'gold', sub: 'duplicate → dedupe key' } }, say: '"Order accept hua" SMS: notification. Failure: duplicate aur 8 baje ka burst. Ilaaj: dedupe key, queue se rate-limited bhejna.' },
      { at: ['search'], set: { search: { tone: 'gold', sub: 'index lag → lag metric' } }, say: 'Restaurant search: search shape. Failure: indexing lag ("naya restaurant dikh nahi raha"). Ilaaj: DB source of truth, async indexer, lag ka metric.' },
      { at: ['dash'], set: { dash: { tone: 'good', sub: 'COUNT hatao, cache, pool' } }, say: 'Dashboard dheema: pehle naapo (load, trace, metrics). Phir COUNT(*) hatao, cache + jitter, timeout + fallback. Pool sabse aakhir mein badhao, service time ghatane ke baad.' },
      { at: ['app'], set: { app: { tone: 'good', sub: 'kuch naya nahi seekha' } }, say: 'Is design mein kuch naya nahi seekha: har failure mode pehle se pata, har ilaaj bhi. Pattern ka naam pehchanne ka poora faayda yahi hai.' },
    ],
  },

});
