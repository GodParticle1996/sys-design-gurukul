/* =====================================================================
   System Gurukul — Scenes: 🏗️ Builds (builds track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  bitly: {
    intro: 'URL shortener: <b>40 writes/sec</b> aur <b>4,000 reads/sec</b> (average). Ek ratio poora design tay kar deta hai.',
    nodes: [
      { id: 'creator', col: 0, row: 0, icon: '🍬', label: 'Sharma Sweets', sub: 'naya short link' },
      { id: 'counter', col: 1, row: 0, icon: '🔢', label: 'Code generator', sub: 'counter → base62' },
      { id: 'cache', col: 2, row: 0, icon: '🧠', label: 'Redis cache', sub: '95%+ hit' },
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Aman', sub: 'GET /aX9k2Lq', tone: 'accent' },
      { id: 'app', col: 1, row: 1, icon: '⚙️', label: 'redirect-api' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Postgres', sub: 'code → long URL' },
    ],
    steps: [
      { at: ['creator', 'user'], say: '40 writes/sec : 4,000 average reads/sec (peak ~12,000). Write:read = 1:100. Write path itna chhota ki uspar zyada sochna galti; saara kaam read path par.' },
      { from: 'creator', to: 'counter', label: 'naya code chahiye', say: 'Teen tareeke: random 7 chars (har insert par "code free hai?" lookup), md5 ke pehle 7 (collision phir bhi), ya counter → scramble → base62 (collision hi nahi).' },
      { from: 'counter', to: 'db', label: 'aX9k2Lq → URL', tone: 'good', say: 'Counter tareeka: 62⁷ ≈ 35.2 kharab codes; 5 saal ke 6 arab URLs ke liye ~586x margin. Counter sortable hai, index bhi khush.' },
      { from: 'user', to: 'app', label: 'GET /aX9k2Lq', say: 'Aman short link kholta hai. Redirect path bilkul simple rakho.' },
      { from: 'app', to: 'cache', label: 'HIT (95%+)', tone: 'good', say: 'Zyadatar redirects Redis cache se: code → long URL.' },
      { from: 'app', to: 'db', label: 'MISS', say: 'Cache miss par Postgres, phir cache mein rakho.' },
      { from: 'app', to: 'user', label: '302 Found', tone: 'gold', say: '302: explicit cache policy na ho toh aam taur par har click server tak aata hai — analytics milta hai, destination badal sakte ho. 301 browser cache karta hai: load kam, par click count khatam.' },
      { at: ['cache'], set: { cache: { tone: 'bad', sub: 'viral link = hot key' } }, say: 'Viral link: ek code par lakhon clicks = hot key. Shortener ka product analytics hai, isliye 302; yahan load hi business hai, load ke liye local cache aur copies.' },
    ],
  },

  leaderboard: {
    intro: '"Top 100" aasan hai. <b>"Meri rank kya hai?"</b> — har player ka sawaal — sabse mehenga hai.',
    nodes: [
      { id: 'sql', col: 1, row: 0, icon: '🐘', label: 'Postgres', sub: 'ORDER BY score' },
      { id: 'daily', col: 3, row: 0, icon: '📅', label: 'leaderboard:daily', sub: 'TTL 48 ghante' },
      { id: 'player', col: 0, row: 1, icon: '🎮', label: 'Riya (player)', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'game-api' },
      { id: 'zset', col: 2, row: 1, icon: '🧠', label: 'Redis sorted set', sub: 'skip list' },
      { id: 'weekly', col: 3, row: 1, icon: '🗓️', label: 'leaderboard:weekly', sub: 'TTL 14 din' },
    ],
    steps: [
      { from: 'api', to: 'sql', label: 'ORDER BY … LIMIT 100', tone: 'good', say: 'Top 100: ORDER BY score DESC LIMIT 100 index ke pehle 100 entries se tez hai.' },
      { from: 'api', to: 'sql', label: 'COUNT(*) score > mera', tone: 'bad', set: { sql: { tone: 'bad', sub: 'lakhon rows har baar' } }, say: '"Meri rank?" = COUNT(*) jinka score mujhse zyada: har baar lakhon rows, aur har player poochhta hai. 10k updates/sec index ke ek hisse par hot spot.' },
      { from: 'player', to: 'api', label: 'score +50', say: 'Riya ka score badha.' },
      { from: 'api', to: 'zset', label: 'ZADD · O(log n)', tone: 'good', set: { sql: { tone: '', sub: 'ORDER BY score' } }, say: 'Redis sorted set: ZADD se score update, O(log n).' },
      { at: ['zset'], set: { zset: { tone: 'good', sub: 'ZREVRANK · O(log n)' } }, say: 'ZREVRANGE top 100: O(log n + k). ZREVRANK meri rank: O(log n). Skip list har node par "mere neeche kitne" ka count rakhti hai, isliye rank gini nahi, padhi jaati hai.' },
      { from: 'zset', to: 'daily', label: 'time windows', say: 'Time windows = alag keys: leaderboard:daily:2026-09-04 (TTL 48 ghante), weekly (TTL 14 din), alltime (koi TTL nahi).' },
      { at: ['zset'], say: 'Bada sabak: kabhi jawab "query optimize karo" nahi, alag data structure hota hai. 5 crore players par: top players exact, baaki ke liye approximate rank.' },
    ],
  },

  adclick: {
    intro: 'Ad clicks ginne hain. Billing <b>isi data</b> par hoti hai — galti matlab paisa.',
    nodes: [
      { id: 'ch', col: 3, row: 0, icon: '📊', label: 'ClickHouse', sub: 'dashboard (fast)' },
      { id: 'browser', col: 0, row: 1, icon: '🖱️', label: 'Browser', sub: 'ad click', tone: 'accent' },
      { id: 'ingest', col: 1, row: 1, icon: '🚪', label: 'ingest API' },
      { id: 'kafka', col: 2, row: 1, icon: '📨', label: 'Kafka', sub: 'partition: ad_id' },
      { id: 'flink', col: 3, row: 1, icon: '🌊', label: 'Flink', sub: 'event-time windows' },
      { id: 's3', col: 2, row: 2, icon: '🪣', label: 'S3', sub: 'raw events' },
      { id: 'batch', col: 3, row: 2, icon: '🧾', label: 'Raat ka batch', sub: 'EXACT + dedup' },
    ],
    steps: [
      { from: 'browser', to: 'ingest', label: 'click (id: c-9)', say: 'User ne ad par click kiya. Har click ki apni unique id hai.' },
      { from: 'ingest', to: 'kafka', label: 'key = ad_id', say: 'Kafka partition key ad_id: ek ad ke saare clicks ek partition mein, kram mein. Partition key ka chunav = ordering ka design.' },
      { from: 'kafka', to: 'flink', label: 'event time', tone: 'good', say: 'Flink event time (click kab hua) se minute ki windows banata hai, processing time se nahi. Mobile ke late clicks bhi sahi minute mein jaate hain.' },
      { from: 'flink', to: 'ch', label: 'turant, thodi galti', say: 'Fast path: ClickHouse dashboard. Turant chahiye, thodi galti manzoor.' },
      { from: 'kafka', to: 's3', label: 'har raw event', say: 'Har raw event S3 mein bhi jaata hai.' },
      { from: 's3', to: 'batch', label: 'billing yahin se', tone: 'good', set: { batch: { tone: 'good' } }, say: 'Slow path: raat ko exact batch, dedup ke saath. Billing isi se. Ek pipeline se speed aur correctness dono maangna galti hai.' },
      { at: ['kafka'], say: 'Dedup laazmi: at-least-once mein consumer crash par batch dobara = dugna bill. Click id se dedup. Billing ke liye HLL jaise approximate structures galat jagah.' },
    ],
  },

  ticketmaster: {
    intro: 'Concert ke tickets khule: <b>5 lakh log</b>, 10 second, aur sirf <b>200 seats</b>. Do alag problems, do alag ilaaj.',
    nodes: [
      { id: 'map', col: 1, row: 0, icon: '🗺️', label: 'Seat map (cache)', sub: '1–2 s purana theek' },
      { id: 'crowd', col: 0, row: 1, icon: '🌊', label: '5 lakh log', sub: '10 second mein', tone: 'accent' },
      { id: 'wr', col: 1, row: 1, icon: '🚪', label: 'Waiting room', sub: '3,000 andar' },
      { id: 'redis', col: 2, row: 1, icon: '🔒', label: 'Redis hold', sub: 'SET NX EX 600' },
      { id: 'pay', col: 3, row: 1, icon: '💳', label: 'Payment', sub: '10 minute' },
      { id: 'db', col: 2, row: 2, icon: '🗄️', label: 'Bookings DB' },
    ],
    steps: [
      { at: ['crowd'], say: 'Problem 1, flash crowd: 5 lakh log, 10 second. Problem 2, contention: 200 seats, sab front row chahte hain. Ek ka ilaaj doosre ko theek nahi karta.' },
      { from: 'crowd', to: 'wr', label: 'number 42,318 · ~8 min', tone: 'good', say: 'Waiting room: "tumhara number 42,318, ~8 minute". Andar ek waqt mein 3,000. Bina number ke sab refresh karte, aur retry se load 3x.' },
      { from: 'wr', to: 'map', label: 'seat map', say: 'Seat map ka read path alag: cache se (1–2 second purana theek), aur "seat A14 gayi" jaise updates SSE se.' },
      { from: 'wr', to: 'redis', label: 'HOLD A14', tone: 'good', set: { redis: { tone: 'good', sub: 'A14 = user:912 · 10 min' } }, say: 'Kadam 1, HOLD: SET seat:evt42:A14 user:912 NX EX 600. NX = sirf khaali ho tab (atomic). EX = abandoned checkout apne aap wapas.' },
      { from: 'redis', to: 'pay', label: 'PAY (10 min)', say: 'Kadam 2, PAY: user 10 minute mein checkout karta hai. Is beech koi DB lock latka hua nahi.' },
      { from: 'pay', to: 'db', label: 'CONFIRM', tone: 'good', set: { db: { tone: 'good', sub: 'A14 sold ✅' } }, say: 'Kadam 3, CONFIRM: payment ok → hold ka owner aur version jaancho, phir seat sold + booking row ek DB transaction mein. Redis hold baad mein saaf.' },
      { at: ['redis'], say: 'Payment fail ya timeout → hold apne aap expire, seat wapas. Payment hold expire hone ke baad aaye toh seat kisi aur ki ho sakti hai: refund aur reconciliation ka raasta pehle se rakho.' },
    ],
  },

  whatsapp: {
    intro: 'Aman ne Riya ko message bheja. Riya ke <b>teen devices</b> hain, ek offline. Kaise sabko sab milega?',
    nodes: [
      { id: 'push', col: 2, row: 0, icon: '📡', label: 'Push / socket', sub: 'sirf optimization' },
      { id: 'phone', col: 3, row: 0, icon: '📱', label: 'Riya ka phone', sub: 'last_seen 8817' },
      { id: 'aman', col: 0, row: 1, icon: '🙋', label: 'Aman', tone: 'accent' },
      { id: 'chat', col: 1, row: 1, icon: '💬', label: 'chat-service' },
      { id: 'store', col: 2, row: 1, icon: '🗄️', label: 'Message store', sub: 'durable' },
      { id: 'laptop', col: 3, row: 1, icon: '💻', label: 'Riya ka laptop', sub: 'last_seen 8814' },
      { id: 'tablet', col: 3, row: 2, icon: '📟', label: 'Riya ka tablet', sub: 'last_seen 8801' },
    ],
    steps: [
      { from: 'aman', to: 'chat', label: '"kal milte hain"', say: 'Aman Riya ko message bhejta hai.' },
      { from: 'chat', to: 'store', label: 'id 8818 · COMMIT', tone: 'good', set: { store: { tone: 'good', sub: 'conv 77: id 8818' } }, say: 'Pehle durable store: conversation mein badhti hui id 8818. Commit yahin hota hai.' },
      { from: 'chat', to: 'push', label: 'online devices ko', say: 'Phir push. Push sirf optimization hai: online device ko turant khabar. Ulta kram (pehle push, phir store) = message dikha, par save nahi hua.' },
      { from: 'push', to: 'phone', label: '8818', tone: 'good', set: { phone: { tone: 'good', sub: 'last_seen 8818' } }, say: 'Riya ka phone online tha: message turant mila.' },
      { from: 'store', to: 'laptop', label: '8814 ke baad kya hai?', tone: 'good', set: { laptop: { tone: 'good', sub: 'last_seen 8818' } }, say: 'Laptop wapas online aaya: "last_seen 8814 ke baad kya hai?" Wahi gap-fill query jo har reconnect chalata hai.' },
      { from: 'store', to: 'tablet', label: '8801 ke baad kya hai?', tone: 'good', set: { tablet: { tone: 'good', sub: 'last_seen 8818' } }, say: 'Tablet ke 17 messages baaki the; wahi query. Multi-device ke liye alag sync system nahi chahiye: har device ka apna cursor.' },
      { at: ['store'], say: 'Delivery aur read receipts bhi cursors hi hain: "kitno ne padha" = kitne cursors 8818 tak pahunche. Group chat mein fanout write par ya read par, group ke size par tay hota hai.' },
    ],
  },

  youtube: {
    intro: '100 crore watch-hours/din × ~1 GB = <b>~1 EB/din ≈ 92.6 Tbps</b>. Origin se serve karna namumkin. Teen alag systems.',
    nodes: [
      { id: 'count', col: 3, row: 0, icon: '👁️', label: 'View counter', sub: 'batch mein jodo' },
      { id: 'creator', col: 0, row: 1, icon: '🎬', label: 'Creator', sub: '4K video', tone: 'accent' },
      { id: 's3', col: 1, row: 1, icon: '🪣', label: 'S3 (raw)' },
      { id: 'tx', col: 2, row: 1, icon: '⚙️', label: 'Transcode workers', sub: '240p … 4K chunks' },
      { id: 'cdn', col: 3, row: 1, icon: '🌍', label: 'CDN', sub: '99% traffic yahan' },
      { id: 'viewer', col: 3, row: 2, icon: '📱', label: 'Viewer', sub: '4G network' },
    ],
    steps: [
      { from: 'creator', to: 's3', label: 'presigned multipart', say: '1. UPLOAD: presigned multipart seedha S3. Bandwidth-bound; app server sirf 40 ms kaam karta hai, 20 minute nahi.' },
      { from: 's3', to: 'tx', label: 'S3 event → queue', say: '2. TRANSCODE: S3 event → queue → workers. CPU-bound: 240p se 4K tak versions, chhote chunks aur ek manifest. Status API se progress.' },
      { from: 'tx', to: 'cdn', label: 'chunks + manifest', say: '3. DELIVER: CDN; miss par origin. Egress-bound, 99% traffic yahin. Teenon alag scale karte hain; viral video ki delivery uploads ko nahi rokti.' },
      { from: 'viewer', to: 'cdn', label: 'manifest + chunks', tone: 'good', set: { viewer: { tone: 'good', sub: 'network gira → 360p' } }, say: 'Adaptive bitrate: video ek file nahi, chunks ki list. Player network dekh kar har agla chunk chunta hai: network gira toh agla chunk 360p.' },
      { at: ['cdn'], set: { cdn: { tone: 'gold', sub: 'hit ratio sabse zaroori' } }, say: 'CDN byte hit ratio sabse zaroori metric: 95% se 90% hua toh origin traffic dugna (5% → 10%).' },
      { at: ['count'], say: '100 crore views/din ≈ 11,574 events/sec poore platform par. View count exact nahi chahiye: batch mein jodo; ek hot video ki row par har view ka UPDATE mat karo.' },
    ],
  },

  dropbox: {
    intro: 'Riya ka 50 GB folder sync karna hai, do laptops par. Bytes kis raaste, aur doosre laptop ko <b>khabar kaise</b>?',
    nodes: [
      { id: 'app', col: 1, row: 0, icon: '⚙️', label: 'app server', sub: 'ijazat, bytes nahi' },
      { id: 'client', col: 0, row: 1, icon: '💻', label: 'Laptop 1 (client)', sub: '50 GB folder', tone: 'accent' },
      { id: 's3', col: 2, row: 1, icon: '🪣', label: 'S3', sub: 'chunks (hash se)' },
      { id: 'meta', col: 1, row: 2, icon: '🗄️', label: 'Metadata DB', sub: 'file → chunk hashes' },
      { id: 'log', col: 2, row: 2, icon: '📜', label: 'Change log', sub: 'durable, cursor wala' },
      { id: 'l2', col: 3, row: 1, icon: '💻', label: 'Laptop 2' },
    ],
    steps: [
      { from: 'client', to: 'app', label: 'upload karna hai', say: 'Laptop 1 app server se ijazat maangta hai. Proxy raaste mein har byte do baar chalti, aur 50 GB ki ek file server bhar deti.' },
      { from: 'app', to: 'client', label: 'presigned URL', tone: 'gold', say: 'App server presigned URL deta hai. URL ek bearer token hai, isliye expiry minute mein rakho.' },
      { at: ['client'], set: { client: { sub: 'chunks + har chunk ka hash' } }, say: 'Chunking + fingerprint: file ko chunks mein kaato, har chunk ka hash. Ek faisla, teen faayde: resumable upload, dedup, parallel upload.' },
      { from: 'client', to: 's3', label: 'sirf naye chunks', tone: 'good', say: 'Jis chunk ka hash S3 mein pehle se hai, wahi chunk dobara upload nahi hota. Network toota? Bas bache chunks.' },
      { from: 'client', to: 'meta', label: 'file → hashes list', say: 'Metadata DB mein file ki chunk-hash list. Bytes S3 mein, metadata DB mein.' },
      { at: ['client'], set: { client: { sub: 'content-defined chunks' } }, say: 'Fixed-size chunks: file ke shuru mein 1 byte jodo toh saari boundaries khisak jaati hain, dedup gaya. Content-defined (rolling hash): zyadatar sirf aas-paas ke chunks badalte hain.' },
      { from: 'meta', to: 'log', label: 'change #9123', say: 'Har badlaav durable change log mein, ek badhti hui position ke saath.' },
      { from: 'log', to: 'l2', label: 'push + cursor catch-up', tone: 'good', set: { l2: { tone: 'good', sub: 'cursor 9123 tak' } }, say: 'Laptop 2 ko push se jaldi khabar. Push toot sakta hai (laptop band tha), isliye wapas aakar poochho: "mere cursor ke baad kya badla?"' },
    ],
  },

  crawler: {
    intro: '10 arab pages, 5 din. Asli mushkil machines nahi — <b>har website ke saath tameez</b> (politeness) aur coordination.',
    nodes: [
      { id: 'ud', col: 0, row: 0, icon: '🔗', label: 'URL dedup', sub: 'normalize → hash → bloom' },
      { id: 'lock', col: 1, row: 0, icon: '🚦', label: 'Per-domain limit', sub: 'Redis lock + delay' },
      { id: 'frontier', col: 0, row: 1, icon: '📋', label: 'URL frontier', sub: 'domain-wise queues', tone: 'accent' },
      { id: 'workers', col: 1, row: 1, icon: '👷', label: '500 workers' },
      { id: 'web', col: 2, row: 1, icon: '🌐', label: 'Websites' },
      { id: 'trap', col: 1, row: 2, icon: '🕳️', label: 'Crawler trap', sub: 'infinite calendar' },
      { id: 'cd', col: 2, row: 2, icon: '📄', label: 'Content dedup', sub: 'content hash / simhash' },
    ],
    steps: [
      { at: ['frontier'], say: '10 arab ÷ 3,750 pages/sec/machine ÷ 5 din ≈ 8 machines — sirf assumed bandwidth ka floor. CPU, storage, DNS aur politeness benchmark karo; sabse tang resource capacity tay karta hai.' },
      { from: 'workers', to: 'web', label: '500 × 1 req/s', tone: 'bad', set: { web: { tone: 'bad', sub: 'ek domain: 500 req/s 😵' } }, say: 'Har worker "main 1 req/sec bhejta hoon" — par 500 workers × 1 = 500 req/sec ek hi domain par. Politeness worker ka kaam nahi.' },
      { from: 'workers', to: 'lock', label: 'is domain ki baari?', tone: 'good', set: { web: { tone: 'good', sub: 'ek domain: 1 req/s' } }, say: 'Global shart ke liye shared jagah: per-domain lock (Redis), ya message delay karke wapas queue mein. Politeness queue ka kaam hai.' },
      { from: 'frontier', to: 'ud', label: 'pehle crawl hua?', say: 'URL dedup, queue mein daalne se pehle: URL normalize → hash → Bloom filter ya index.' },
      { from: 'web', to: 'cd', label: 'page ka hash', say: 'Content dedup, fetch ke baad: ek hi page darjan URLs par (tracking params). Content hash ya simhash se pehchano.' },
      { at: ['trap'], set: { trap: { tone: 'bad' } }, say: 'Crawler trap: infinite calendar (agla mahina, agla mahina…). Sasta ilaaj: har domain ka page budget aur URL depth ki hadd.' },
      { at: ['workers'], say: 'DNS chhupa kharcha: har naya domain ek lookup. Apna DNS cache rakho, aur lookup latency aur cache hit rate naapo.' },
    ],
  },

  'boss-uber': {
    intro: 'FINAL BOSS: ride hailing. <b>10 lakh drivers</b>, raat 8 baje, baarish, ek shehar mein 50,000 requests/min. Saat shapes.',
    nodes: [
      { id: 'loc', col: 0, row: 0, icon: '📍', label: 'Driver locations', sub: 'write-heavy' },
      { id: 'geo', col: 1, row: 0, icon: '🗺️', label: 'Nearby search', sub: 'geo' },
      { id: 'match', col: 2, row: 0, icon: '🤝', label: 'Matching', sub: 'contention' },
      { id: 'app', col: 1, row: 1, icon: '🚕', label: 'Ride hailing', sub: '8 PM · baarish', tone: 'accent' },
      { id: 'life', col: 2, row: 1, icon: '🔄', label: 'Ride lifecycle', sub: 'workflow' },
      { id: 'surge', col: 0, row: 2, icon: '📈', label: 'Surge pricing', sub: 'streaming' },
      { id: 'fare', col: 1, row: 2, icon: '💰', label: 'Fare + payment', sub: 'ledger' },
      { id: 'track', col: 2, row: 2, icon: '🛰️', label: 'Live tracking', sub: 'realtime fanout' },
    ],
    steps: [
      { at: ['loc'], set: { loc: { tone: 'gold', sub: '1.5 cr/min → in-memory' } }, say: 'Driver locations: 10 lakh drivers, har 4 second update = 1.5 crore writes/min. DB par storm. Location durable nahi, current chahiye: in-memory geo index.' },
      { at: ['geo'], set: { geo: { tone: 'gold', sub: 'hot cell → chhote cells' } }, say: 'Nearby search: geo. Airport par 8 baje, baarish: hot cell. Wahan chhote cells; radius cover karne wali saari cells padho.' },
      { at: ['match'], set: { match: { tone: 'gold', sub: '1 driver, 2 riders → hold' } }, say: 'Matching: contention. Ek driver do riders ko? Driver par atomic hold; offer reject ya timeout par hold chhodo.' },
      { at: ['life'], set: { life: { tone: 'gold', sub: 'beech mein fail → saga' } }, say: 'Ride lifecycle: workflow (requested → accepted → started → completed). Beech mein fail → saga + compensation.' },
      { at: ['track'], set: { track: { tone: 'gold', sub: 'reconnect storm → jitter' } }, say: 'Live tracking: realtime fanout. Reconnect storm → jitter; offline gap → last-seen se backlog.' },
      { at: ['fare'], set: { fare: { tone: 'gold', sub: 'double charge → idem key' } }, say: 'Fare + payment: ledger. Double charge → idempotency key; numbers milane ke liye roz reconciliation.' },
      { at: ['surge'], set: { surge: { tone: 'gold', sub: 'late events → event time' } }, say: 'Surge pricing: streaming. Late events → event-time windows; ek shehar ka hot partition → partition aur baanto.' },
      { at: ['app'], set: { app: { tone: 'good', sub: 'ek bhi cheez nayi nahi' } }, say: 'Saat shapes, aur ek bhi cheez nayi nahi. Har failure mode ka naam pata hai, har ilaaj bhi. Yahi is poore app ka maksad tha.' },
    ],
  },

});
