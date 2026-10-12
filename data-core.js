/* =====================================================================
   System Gurukul — Ranks, Tracks & shared SYSTEM presets

   Domain: "Khaata" — ek payments + orders app.
     txn-api       transactions list/detail  (24M rows — pagination ka akhaada)
     payments-api  charge banata hai         (idempotency ka akhaada)
     orders-api    checkout                  (pool/resilience ka akhaada)
     ledger        downstream service        (timeout/retry/breaker ka akhaada)
     results-api   board results             (flash crowd ka akhaada)
     reminders     bill reminders            (scheduling ka akhaada)

   Naya track add karna ho? Yahan ek entry + ek nayi data-<track>.js file
   + index.html mein ek <script> tag + validate.js ki list.
   ===================================================================== */

const RANKS = [
  { xp: 0,    name: 'Request Shishya',      icon: '🐣' },
  { xp: 250,  name: 'Flow Pathik',          icon: '🧭' },
  { xp: 600,  name: 'Contract Karigar',     icon: '🔌' },
  { xp: 1050, name: 'Cursor Kushal',        icon: '📄' },
  { xp: 1550, name: 'Index Nipun',          icon: '🗂️' },
  { xp: 2100, name: 'Cache Chatur',         icon: '🧠' },
  { xp: 2700, name: 'Timeout Tapasvi',      icon: '⏱️' },
  { xp: 3400, name: 'Breaker Bhairav',      icon: '🔌' },
  { xp: 4200, name: 'Backpressure Balwan',  icon: '🌊' },
  { xp: 5100, name: 'Saga Sutradhar',       icon: '🧩' },
  { xp: 6100, name: 'Consistency Chintak',  icon: '🌐' },
  { xp: 7200, name: 'Scale Shilpi',         icon: '📐' },
  { xp: 8400, name: 'System Sthapati',      icon: '🏛️' },
  { xp: 9800,  name: 'Pattern Parakhi',      icon: '🧩' },
  { xp: 11000, name: 'Migration Marmagya',   icon: '🔄' },
  { xp: 12200, name: 'Protocol Pandit',      icon: '🌐' },
  { xp: 13600, name: 'Nirmata',              icon: '🏗️' },
  { xp: 14300, name: 'Incident Insaan',      icon: '🚨' },
  { xp: 15600, name: 'Napkin Nawab',         icon: '🧮' },
  { xp: 17200, name: 'Architect Mahaguru',   icon: '👑' },
];

SD.tracks = [
  {
    id: 'flow',
    icon: '🧭',
    name: 'Foundations — Request ka Safar',
    blurb: 'Ek request client se DB tak jaake wapas kaise aati hai. Kahan cache karo, kahan auth, kahan rate limit. Sync vs async, fan-out, service decomposition, aur back-of-envelope estimation — Boss: naye feature ka poora flow design karo.',
    certTitle: 'FLOW PATHIK',
    certSub: 'Certificate of Request-Path Fluency',
    motto: 'Design se pehle poochho — yeh request kahan-kahan se guzregi?',
    formula: 'Latency = har hop ka sum + har QUEUE ka wait',
  },
  {
    id: 'api',
    icon: '🔌',
    name: 'API Design & Contracts',
    blurb: 'Route naming, verbs & status codes, offset pagination ka katl aur cursor ka ilaaj, filtering, versioning, error contracts, idempotency keys, rate limiting — Boss: ek API design review jisme har galti mehengi hai.',
    certTitle: 'CONTRACT KARIGAR',
    certSub: 'Certificate of API Design',
    motto: 'Sabse tez query woh hai jo API ne kabhi poochhne hi nahi di.',
    formula: 'Achhi API = predictable naam + bounded cost + saaf error',
  },
  {
    id: 'data',
    icon: '🗄️',
    name: 'Data & Storage',
    blurb: 'Access pattern se schema banao. B-tree se lekar inverted index tak — kaunsa index kab. N+1, connection pool aur Little\'s Law, caching ke saare layers, stampede, sharding vs partitioning — Boss: dashboard ko 12s se 200ms par lao.',
    certTitle: 'INDEX NIPUN',
    certSub: 'Certificate of Data-Layer Mastery',
    motto: 'Pehle access pattern likho, phir schema. Ulta karoge toh migration likhoge.',
    formula: 'Fast read = sahi index + sahi cache + bounded rows',
  },
  {
    id: 'resil',
    icon: '🛡️',
    name: 'Scale & Resilience',
    blurb: 'Timeouts, retries + jitter, circuit breakers, bulkheads, DLQ, load shedding, admission control, flash crowd, aur woh 3AM sawaal — "CPU 10% hai, phir bhi timeout kyun?" — Boss: incident jo tumhe khud debug karna hai.',
    certTitle: 'BREAKER BHAIRAV',
    certSub: 'Certificate of Production Resilience',
    motto: 'Har remote call ek din fail hogi. Sawaal yeh hai — tab tumhara system kya karega?',
    formula: 'Survival = timeout + jitter + breaker + fallback + shed',
  },
  {
    id: 'dist',
    icon: '🌐',
    name: 'Distributed Data & Consistency',
    blurb: '2PC ke bina consistency. Saga, outbox, CQRS read models, eventual consistency ka UX, DB-per-service, exactly-once ka jhooth, aur 2 crore rows scan kiye bina scheduled kaam — Boss: poora order system design karo.',
    certTitle: 'CONSISTENCY CHINTAK',
    certSub: 'Certificate of Distributed Systems Design',
    motto: 'Distributed system mein "ek saath" jaisi koi cheez nahi hoti — sirf "aakhir mein".',
    formula: 'Correctness = idempotent + retryable + observable',
  },
  {
    id: 'shapes',
    icon: '🧩',
    name: 'Patterns & System Shapes',
    blurb: 'Ab tak tumne parts seekhe. Ab unhe SHAPES mein pehchano. Har problem 12 mein se kisi ek pattern ki hai — aur har pattern ka apna jaana-pehchana failure mode. Search, media upload, realtime fanout, geo — chaar shapes gehrai se, aur ek coffee shop jo asli mein Uber hai. Boss: khaali page se poora design.',
    certTitle: 'PATTERN PARAKHI',
    certSub: 'Certificate of Pattern Recognition',
    motto: 'Boxes banane se pehle pattern ka naam lo. Naam aate hi tradeoffs khud saamne aa jaate hain.',
    formula: 'Sahi design = sahi pattern + uska known failure mode',
  },
  {
    id: 'builds',
    icon: '🏗️',
    name: 'Poore Systems Banao',
    blurb: 'Ab sirf tum aur ek khaali page. Saat asli systems — URL shortener, leaderboard, ad click aggregator, ticket booking, chat, video platform — aur Final Boss: Uber. Har ek mein requirements se shuru, estimate, design canvas, aur phir simulator par uska asli bottleneck maapo.',
    certTitle: 'ARCHITECT MAHAGURU',
    certSub: 'Certificate of System Design Practice',
    motto: 'Padhna alag hai, banana alag. Yahan tum banate ho.',
    formula: 'Design = shapes pehchano + numbers nikalo + bottleneck maapo + keemat bolo',
  },
  {
    id: 'feed',
    icon: '📡',
    name: 'The Feed — Asli Posts, Asli Outages',
    blurb: 'Yeh track feed se banta hai. Cloudflare, GitHub, AWS, Roblox aur Slack ke apne public postmortems — asli timeline, asli numbers, asli root cause. Saath mein napkin math ki reps, vector search, multi-region, progressive rollout aur cost-per-request. Naya post aaye toh yahi track badhta hai.',
    certTitle: 'INCIDENT INSAAN',
    certSub: 'Certificate of Postmortem Literacy',
    motto: 'Har bada outage ek chhote se badlav se shuru hota hai jise kisi ne "safe" samjha tha.',
    formula: 'Outage = ek chhota trigger × ek chhupa hua limit × ek recovery jo khud us system par nirbhar thi',
    alwaysUnlocked: true,
  },
  {
    id: 'stories',
    icon: '🏢',
    name: 'Real Company Stories',
    blurb: 'Reddit, Cloudflare, Jira, Snowflake, Airtable, Slack, Discord, Instagram, Stripe, Prime Video, Dropbox, WhatsApp, Roblox, Notion — har company ne ek ajeeb sa faisla liya, aur uske baad baaki poora system us faisle ke hisaab se bana. Har level mein woh faisla, uski keemat, aur laptop par chalne wala ek Docker lab.',
    certTitle: 'ARCHITECTURE ARCHAEOLOGIST',
    certSub: 'Certificate of Production Case Studies',
    motto: 'Har bada system ek ajeeb faisle par khada hai — pehle faisla dhoondho, phir architecture samajh aayega.',
    formula: 'Architecture = ek core faisla + us faisle ki keemat + keemat chhupane ke tareeke',
    alwaysUnlocked: true,
  },
  {
    id: 'ai',
    icon: '🤖',
    name: 'AI Companies — Model ke peeche ka system',
    blurb: 'AI ka asli kaam model ke bahar hota hai. Agent ko kaise band rakhein, Google muft GPU kaise baant-ta hai, TikTok 3 swipe mein kaise pehchaanta hai, Replit Agent ka "undo" button, DeepSeek ne patli wire par model kaise train kiya, aur Amazon $200 billion kis cheez par kharch karta hai. Har level ke saath laptop par chalne wala Docker lab.',
    certTitle: 'AI INFRA ACHARYA',
    certSub: 'Certificate of AI Systems Engineering',
    motto: 'Model ek function hai. Uske chaaron taraf ka system hi product hai.',
    formula: 'AI system = model + containment + data pipeline + compute ka hisaab',
    alwaysUnlocked: true,
  },
  {
    id: 'planet',
    icon: '🌍',
    name: 'Planet-scale Infra — Poori duniya ke liye',
    blurb: 'BitTorrent (server ke bina file baantna), Starlink (har 15 sec badalta network), YouTube (1 arab ghante roz), Gmail (ek bhi mail na khoye), Google Search (0.2 sec mein poora web) aur Google Maps (traffic ke saath raasta). Har ek mein physics, numbers aur ek Docker lab.',
    certTitle: 'PLANET-SCALE PANDIT',
    certSub: 'Certificate of Planet-scale Systems',
    motto: 'Planet ke paimane par har "kabhi-kabhi" roz hota hai.',
    formula: 'Planet-scale = physics + asymmetry (mehenga kaam ek baar) + failure ek RATE hai',
    alwaysUnlocked: true,
  },
];

/* =====================================================================
   SYSTEM PRESETS — missions inhe spread karke apna sys banate hain:
     sys: SD.sys.txn({ api: { pagination: 'cursor' } })
   Yaad rakho: agar tum db.tables doge toh default tables REPLACE ho jaate
   hain (merge nahi) — perfsim.js ka contract dekho.
   ===================================================================== */
SD.sys = {};

/* 24 million transactions — pagination levels ka ghar */
SD.sys.txn = function (over) {
  return deepAssign({
    name: 'txn-api',
    slo: { p99Ms: 200, availability: 99.9 },
    db: {
      bufferPoolMB: 512,
      tables: {
        transactions: {
          rows: 24286450, rowBytes: 220, pk: 'id',
          cols: ['id', 'user_id', 'amount', 'status', 'merchant', 'created_at'],
          indexes: [{ name: 'transactions_pkey', cols: ['id'], unique: true }],
        },
      },
    },
    api: { pagination: 'offset', countTotal: true, defaultSort: 'created_at', primaryTable: 'transactions' },
  }, over);
};

/* checkout — chhota table, ek downstream ledger. Pool/resilience ka ghar. */
SD.sys.orders = function (over) {
  return deepAssign({
    name: 'orders-api',
    slo: { p99Ms: 200, availability: 99.9 },
    db: {
      bufferPoolMB: 4096,
      tables: {
        orders: {
          rows: 4200000, rowBytes: 200, pk: 'id',
          cols: ['id', 'user_id', 'status', 'total', 'created_at'],
          indexes: [
            { name: 'orders_pkey', cols: ['id'], unique: true },
            { name: 'ix_orders_created', cols: ['created_at'] },
          ],
        },
      },
    },
    pool: { size: 50, acquireTimeoutMs: 10000 },
    app: { instances: 4, cpuMsPerReq: 5 },
    api: { pagination: 'offset', countTotal: false, defaultSort: 'created_at', primaryTable: 'orders' },
    deps: { ledger: { p50: 8, p99: 15, errorRate: 0 } },
  }, over);
};

/* payments — idempotency ka ghar */
SD.sys.payments = function (over) {
  return deepAssign({
    name: 'payments-api',
    slo: { p99Ms: 300, availability: 99.99 },
    db: {
      bufferPoolMB: 2048,
      tables: {
        payments: {
          rows: 8400000, rowBytes: 260, pk: 'id',
          cols: ['id', 'user_id', 'amount', 'status', 'idempotency_key', 'created_at'],
          indexes: [{ name: 'payments_pkey', cols: ['id'], unique: true }],
        },
      },
    },
    api: { idempotency: false, countTotal: false, primaryTable: 'payments' },
    deps: { psp: { p50: 120, p99: 400, errorRate: 0 } },
  }, over);
};

/* board results — flash crowd ka ghar */
SD.sys.results = function (over) {
  return deepAssign({
    name: 'results-api',
    slo: { p99Ms: 500, availability: 99.9 },
    db: {
      bufferPoolMB: 1024,
      tables: {
        results: {
          rows: 1200000, rowBytes: 900, pk: 'roll_no',
          cols: ['roll_no', 'name', 'marks', 'rank', 'published_at'],
          indexes: [{ name: 'results_pkey', cols: ['roll_no'], unique: true }],
        },
      },
    },
    pool: { size: 50, acquireTimeoutMs: 10000 },
    api: { countTotal: false, primaryTable: 'results' },
    deps: { rank_service: { p50: 90, p99: 180, errorRate: 0 } },
  }, over);
};

/* bill reminders — scheduling ka ghar */
SD.sys.reminders = function (over) {
  return deepAssign({
    name: 'reminder-service',
    slo: { p99Ms: 1000, availability: 99.9 },
    db: {
      bufferPoolMB: 2048,
      tables: {
        cards: {
          rows: 20000000, rowBytes: 180, pk: 'id',
          cols: ['id', 'user_id', 'due_date', 'reminder_at', 'status', 'timezone'],
          indexes: [{ name: 'cards_pkey', cols: ['id'], unique: true }],
        },
      },
    },
    api: { countTotal: false, primaryTable: 'cards', defaultSort: 'reminder_at' },
  }, over);
};

/* chhota deep-merge — presets ke upar mission-specific tweaks */
function deepAssign(base, over) {
  if (!over) return base;
  Object.keys(over).forEach(k => {
    const b = base[k], o = over[k];
    if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b)) deepAssign(b, o);
    else base[k] = o;
  });
  return base;
}
