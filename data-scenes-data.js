/* =====================================================================
   System Gurukul — Scenes: 🗄️ Data (data track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  modeling: {
    intro: 'ChaiPay ka orders schema banana hai. Pehle tables nahi — pehle <b>sawaal</b>.',
    nodes: [
      { id: 'q1', col: 1, row: 0, icon: '❓', label: 'Sawaal #1', sub: 'Riya ke last 50 orders' },
      { id: 'pm', col: 0, row: 1, icon: '🧑‍💼', label: 'Product team', sub: 'app kya poochhegi?', tone: 'accent' },
      { id: 'schema', col: 2, row: 1, icon: '📐', label: 'Schema + index', sub: 'sawaalon se nikla' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres' },
      { id: 'q2', col: 1, row: 2, icon: '❓', label: 'Sawaal #2', sub: 'order ke items + daam' },
      { id: 'arch', col: 3, row: 2, icon: '🗃️', label: 'orders_archive', sub: 'delete hue orders' },
    ],
    steps: [
      { at: ['pm'], say: 'Ulta tareeka: pehle entities (User, Order, Product) ki tables, phir queries — aur 6-table JOIN milta hai. Sahi tareeka: pehle likho ki app kaunse sawaal poochhegi.' },
      { from: 'pm', to: 'q1', label: 'sabse zyada aata hai', say: 'Sawaal #1: "Riya ke last 50 orders". Frequency aur latency bhi likho: 1000/sec, p99 50 ms.' },
      { from: 'pm', to: 'q2', label: 'har order page par', say: 'Sawaal #2: "is order ke items aur unke daam". Har order page khulne par.' },
      { from: 'q1', to: 'schema', label: 'index (user_id, created_at)', tone: 'good', say: 'Schema sawaalon se nikalta hai: orders par (user_id, created_at) index, taaki sawaal #1 ek index seek ban jaaye.' },
      { from: 'q2', to: 'schema', label: 'price_at_order copy', tone: 'gold', say: 'Order item mein us waqt ka daam copy karo. Copy kiya daam duplicate nahi, historical fact hai: product ka daam kal badle toh purana bill nahi badalna chahiye.' },
      { from: 'schema', to: 'db', label: 'deleted_at IS NULL? ⚠️', tone: 'bad', say: 'Soft delete (deleted_at) ka jaal: har query mein deleted_at IS NULL lagana padta hai. Ek bhool = deleted data user ko dikh gaya. Unique constraint (email) bhi toot-te hain.' },
      { from: 'db', to: 'arch', label: 'delete + archive mein daalo', tone: 'good', say: 'Behtar: row delete karo aur orders_archive table mein daalo. Live queries saaf rehti hain, aur audit trail bhi bachta hai.' },
    ],
  },

  btree: {
    intro: '2.4 crore rows mein ek user dhoondhna hai. B-tree index sirf <b>~4 hops</b> mein kaise pahunchta hai?',
    nodes: [
      { id: 'q', col: 0, row: 1, icon: '🔍', label: 'Query', sub: "user_id = 'OP-101'", tone: 'accent' },
      { id: 'root', col: 1, row: 1, icon: '🌳', label: 'Root page', sub: 'hop 1' },
      { id: 'branch', col: 2, row: 1, icon: '🌿', label: 'Branch page', sub: 'hop 2' },
      { id: 'leaf', col: 3, row: 1, icon: '🍃', label: 'Leaf page', sub: 'hop 3 · keys sorted' },
      { id: 'heap', col: 3, row: 2, icon: '📦', label: 'Heap (table row)', sub: 'hop 4' },
    ],
    steps: [
      { from: 'q', to: 'root', label: "'OP-101' kahan?", say: "Root page mein keys ki range likhi hai. Root page batata hai ki 'OP-101' kis branch page mein milega." },
      { from: 'root', to: 'branch', label: 'hop 2', say: 'Branch page aur chhoti range batata hai. Har page mein ~100 bachche hain, isliye har hop par rows 100 guna kam.' },
      { from: 'branch', to: 'leaf', label: 'hop 3', say: "Leaf page mein keys sorted hain. 'OP-101' mil gaya, saath mein row ka pata." },
      { from: 'leaf', to: 'heap', label: 'row ka pata', tone: 'good', say: '2.4 crore rows mein ~4 hops (log ba 100). Lookup ki asli latency cache, selectivity aur disk I/O par tiki hai.' },
      { at: ['q'], set: { q: { tone: 'bad', sub: "LIKE '%sharma'" } }, say: "Index bekaar karne wale patterns: LIKE '%sharma' (shuru pata nahi), column par function YEAR(created_at), aur status != 'done' jaisi query jo lagbhag sab rows maange." },
      { at: ['leaf'], set: { leaf: { tone: 'gold', sub: 'EXPLAIN se pucho' } }, say: 'Query bahut saari rows maange toh optimizer seq scan chun sakta hai, aur sahi chunta hai. Koi pakka 90% niyam nahi; andaza mat lagao, EXPLAIN chalao.' },
    ],
  },

  composite: {
    intro: 'Index <code>(user_id, created_at, id)</code>. Phone book jaisa: pehle surname, phir naam. <b>Column ka kram</b> tay karta hai kaunsi query tez hogi.',
    nodes: [
      { id: 'q1', col: 0, row: 0, icon: '1️⃣', label: 'WHERE user_id = ?', sub: '1/3 column' },
      { id: 'q2', col: 0, row: 1, icon: '2️⃣', label: '+ created_at > ?', sub: '2/3 column' },
      { id: 'q3', col: 0, row: 2, icon: '❌', label: 'sirf created_at > ?', sub: 'pehla column gayab' },
      { id: 'ix', col: 1, row: 1, icon: '📒', label: 'Composite index', sub: '(user_id, created_at, id)' },
      { id: 'heap', col: 2, row: 1, icon: '📦', label: 'Table (heap)', sub: 'poori row' },
    ],
    steps: [
      { from: 'q1', to: 'ix', label: 'seedha sahi hissa', tone: 'good', say: 'Index pehle user_id par sorted hai. WHERE user_id = ? seedha us user ke hisse par pahunchta hai.' },
      { from: 'q2', to: 'ix', label: 'aur gehra', tone: 'good', say: 'Us user ke andar rows created_at par sorted hain. Range bhi tez, aur ORDER BY created_at muft.' },
      { from: 'q3', to: 'ix', label: 'surname nahi diya', tone: 'bad', say: 'Sirf created_at? Phone book mein sirf "Priya" dhoondhne jaisa: pehla column nahi diya toh index ka kram madad nahi karta. Postgres kabhi skip scan kar leta hai; EXPLAIN dekho.' },
      { at: ['ix'], set: { ix: { sub: 'equality → sort → range' } }, say: 'Kram chunne ka niyam: pehle equality wale columns, phir sort wala, aakhir mein range. Range ke baad wale columns seek ko chhota nahi karte, sirf filter karte hain.' },
      { from: 'ix', to: 'heap', label: 'row lao', say: 'Normal index scan: index se row ka pata milta hai, phir table (heap) se poori row aati hai.' },
      { at: ['ix'], set: { ix: { tone: 'good', sub: 'covering: + amount, status' } }, say: 'Covering index: query ke saare columns index mein hon toh index-only scan mumkin, heap visits bachte hain. Visibility ke liye Postgres kabhi heap padhta hai.' },
      { at: ['ix'], set: { ix: { tone: 'gold', sub: 'har write par update' } }, say: 'Write tax: har index har INSERT/UPDATE par update hota hai. 5 single-column indexes ≠ 1 sahi composite index.' },
    ],
  },

  ids: {
    intro: 'pay-api ke payments table ki primary key kya ho? Random UUID ka <b>chhupa hua bill</b> dekho.',
    nodes: [
      { id: 'uuid', col: 1, row: 0, icon: '🎲', label: 'UUIDv4 key', sub: 'random' },
      { id: 't1', col: 2, row: 0, icon: '🌳', label: 'B-tree (random)', sub: 'kahin bhi insert' },
      { id: 'app', col: 0, row: 1, icon: '⚙️', label: 'pay-api', sub: 'naye payments', tone: 'accent' },
      { id: 'snow', col: 1, row: 2, icon: '❄️', label: 'Snowflake id', sub: 'time + machine + seq' },
      { id: 't2', col: 2, row: 2, icon: '🌳', label: 'B-tree (sorted)', sub: 'aakhri page par' },
      { id: 'pub', col: 0, row: 2, icon: '🏷️', label: 'public_id', sub: 'API/URL mein, random' },
    ],
    steps: [
      { from: 'app', to: 'uuid', label: 'random id', say: 'Pehle pay-api primary key ke liye UUIDv4 (poori tarah random) banata tha.' },
      { from: 'uuid', to: 't1', label: 'kahin bhi girta hai', tone: 'bad', set: { t1: { tone: 'bad', sub: '340,000 page splits' } }, say: 'Random id B-tree mein kahin bhi girti hai. Wahan ka page shayad disk se laana pade; bhara ho toh SPLIT. Lab mein 1 lakh inserts: 340,000 splits, 43 second.' },
      { from: 'app', to: 'snow', label: 'sortable id', say: 'Snowflake id: 41 bit timestamp + 10 bit machine + 12 bit sequence. Naya id lagbhag hamesha pichhle se bada.' },
      { from: 'snow', to: 't2', label: 'aakhri page', tone: 'good', set: { t2: { tone: 'good', sub: '2,000 splits · 6 s' } }, say: 'Har naya row B-tree ke aakhri page par jaata hai, jo memory mein garam hai. Lab mein 1 lakh inserts: 2,000 splits, 6 second.' },
      { at: ['snow'], set: { snow: { tone: 'gold', sub: 'unique worker-ID chahiye' } }, say: 'Snowflake ki keemat: har machine ko unique worker-ID chahiye, aur clock peeche jaaye toh id banana rokna padta hai.' },
      { at: ['pub'], set: { pub: { tone: 'good' } }, say: 'Practical raasta: andar sortable BIGINT primary key, bahar alag public_id. Kharch: ek extra unique index. Public id guess karna mushkil karta hai, par authorization check ki jagah nahi leta.' },
    ],
  },

  indextypes: {
    intro: '90% jawab B-tree hai. Baaki 10% mein sahi index <b>100x farak</b> laata hai. Har sawaal ke liye sahi index chuno.',
    nodes: [
      { id: 'q1', col: 0, row: 0, icon: '❓', label: 'email = ?', sub: 'equality, range, sort' },
      { id: 'bt', col: 1, row: 0, icon: '🌳', label: 'B-tree', sub: 'default' },
      { id: 'q2', col: 0, row: 1, icon: '❓', label: "tags @> {'upi'}", sub: 'ek row, kai values' },
      { id: 'gin', col: 1, row: 1, icon: '📚', label: 'GIN (inverted)', sub: 'JSONB, arrays, tags' },
      { id: 'q3', col: 0, row: 2, icon: '❓', label: '5 km ke andar', sub: 'geo, overlap' },
      { id: 'gist', col: 1, row: 2, icon: '🗺️', label: 'GiST', sub: 'geo, ranges' },
      { id: 'q4', col: 2, row: 0, icon: '❓', label: "status='pending'", sub: 'sirf 0.1% rows' },
      { id: 'part', col: 3, row: 0, icon: '✂️', label: 'Partial index', sub: 'WHERE status=pending' },
      { id: 'q5', col: 2, row: 1, icon: '❓', label: 'logs by time', sub: 'badi, time-sorted table' },
      { id: 'brin', col: 3, row: 1, icon: '📊', label: 'BRIN', sub: 'bahut chhota' },
      { id: 'q6', col: 2, row: 2, icon: '❓', label: '"running" ~ "run"', sub: 'stemming + ranking' },
      { id: 'fts', col: 3, row: 2, icon: '🔎', label: 'Full-text', sub: 'ya search engine' },
    ],
    steps: [
      { from: 'q1', to: 'bt', label: 'equality', tone: 'good', say: 'email = ?, range, ORDER BY: B-tree. 90% cases mein yahi jawab.' },
      { from: 'q2', to: 'gin', label: 'kai values', tone: 'good', say: "Ek row mein kai values (tags, JSONB, array): GIN. GIN har value se rows ki list rakhta hai, kitaab ke peeche wale index jaisa." },
      { from: 'q3', to: 'gist', label: 'paas-paas', tone: 'good', say: '"5 km ke andar" ya time ranges ka overlap: GiST. B-tree ek seedhi line mein sort karta hai, do-dimension mein nahi.' },
      { from: 'q4', to: 'part', label: 'sirf pending rows', tone: 'good', say: 'Partial index sirf pending rows ka index banata hai: lesson ki misaal mein 1000x chhota, query ke liye wahi faayda, aur write tax bhi kam.' },
      { from: 'q5', to: 'brin', label: 'block ki range', tone: 'good', say: 'Bahut badi table jo time ke kram mein bharti hai (logs): BRIN har block ki min/max yaad rakhta hai. Index bahut chhota.' },
      { from: 'q6', to: 'fts', label: 'stemming', tone: 'gold', say: '"running" se "run" milana aur relevance ranking: full-text index. Typo, synonyms aur bada scale chahiye toh search engine (Elasticsearch jaisa).' },
    ],
  },

  nplus1: {
    intro: 'Code mein <b>ek line</b>. Database par <b>101 queries</b>. ORM ka sabse mehenga tohfa.',
    nodes: [
      { id: 'code', col: 0, row: 1, icon: '🧑‍💻', label: 'orders page code', sub: 'for o in orders', tone: 'accent' },
      { id: 'orm', col: 1, row: 1, icon: '🧰', label: 'ORM' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Postgres', sub: 'queries: 0' },
      { id: 'test', col: 0, row: 2, icon: '🧪', label: 'Test', sub: 'query count assert' },
    ],
    steps: [
      { from: 'code', to: 'orm', label: 'Order.limit(100)', say: 'Code: 100 orders lao, phir har order ka user.name dikhao. Code mein bas ek chhota loop hai.' },
      { from: 'orm', to: 'db', label: '1 query: orders', set: { db: { sub: 'queries: 1' } }, say: 'ORM pehle ek query chalata hai: 100 orders.' },
      { from: 'orm', to: 'db', label: '+100 queries: users', tone: 'bad', set: { db: { tone: 'bad', sub: 'queries: 101 😱' } }, say: 'Loop mein har o.user par ORM chupke se nayi query bhejta hai: 100 aur. Har query 1 ms ho toh bhi 101 ms, aur network round trips alag.' },
      { from: 'code', to: 'orm', label: '.includes(:user)', tone: 'good', say: 'Ilaaj: eager loading. ORM ko pehle hi bata do ki users bhi chahiye.' },
      { from: 'orm', to: 'db', label: 'WHERE id IN (…)', tone: 'good', set: { db: { tone: 'good', sub: 'queries: 2 · ~4 ms' } }, say: 'Ab sirf 2 queries: orders, phir saare users ek IN query mein. Ya ek JOIN. GraphQL mein DataLoader yahi batching karta hai.' },
      { from: 'test', to: 'code', label: 'assert queries <= 3', tone: 'gold', say: 'N+1 code padhne par dikhta nahi, isliye wapas aa jaata hai. Test mein query count assert karo: naya code 101 queries chalaye toh test fail.' },
    ],
  },

  pool: {
    intro: 'CPU 10%, memory 41%, health check green. Phir bhi <b>sab timeout</b>. wallet-api kis cheez ka intezaar kar rahi hai?',
    nodes: [
      { id: 'users', col: 0, row: 1, icon: '👥', label: 'Users', sub: '1,000 rps', tone: 'accent' },
      { id: 'app', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'CPU 10% · /health 200' },
      { id: 'pool', col: 2, row: 1, icon: '⏳', label: 'DB pool', sub: '50 connections' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres', sub: 'query 20 ms' },
    ],
    steps: [
      { from: 'users', to: 'app', label: 'p99 = 9,925 ms', tone: 'bad', say: 'wallet-api ka CPU 10%, memory 41%, /health 200 OK. Phir bhi p99 = 9,925 ms. App kaam nahi kar rahi, toh kis cheez ka intezaar kar rahi hai?' },
      { from: 'app', to: 'pool', label: 'pool.acquire() ⏳ 9,900 ms', tone: 'bad', set: { pool: { tone: 'bad', sub: 'queue lambi' } }, say: 'Ek request ka trace: 5 ms app ka kaam, 9,900 ms pool.acquire() mein intezaar, 20 ms DB query. Bottleneck DB nahi, DB ke saamne ki queue hai.' },
      { from: 'pool', to: 'db', label: 'query 20 ms', say: "Little's Law se capacity: pool × (1000 / query ms). Pool 50, query 20 ms → 2,500 rps." },
      { at: ['db'], set: { db: { tone: 'bad', sub: 'query ab 200 ms' } }, say: 'Query 200 ms ho jaaye toh wahi pool sirf 250 rps sambhalta hai. Requests 1,000 rps aa rahi hain, toh queue badhti hi jaati hai.' },
      { at: ['pool'], say: 'Utilization (CPU 10%) theek dikhta hai; saturation (queue ki lambai) asli kahani hai. Dashboard par pool ka wait time aur pending count rakho.' },
      { at: ['pool'], set: { pool: { tone: 'gold', sub: '50 → 500? ❌' } }, say: 'Pool 50 se 500 karna ilaaj nahi: Postgres par connections ka bojh, locks aur context switching badhte hain. Pehle dheemi query ya lambi transaction dhoondho; pool ka size concurrency sweep se naapo.' },
    ],
  },

  caching: {
    intro: 'Cache kahan lagao, kaise bharo, aur sabse mushkil: <b>purana data kab hatao</b>?',
    nodes: [
      { id: 'browser', col: 0, row: 1, icon: '📱', label: 'Browser / app', tone: 'accent' },
      { id: 'cdn', col: 1, row: 1, icon: '🌍', label: 'CDN', sub: 'public cheezein' },
      { id: 'redis', col: 2, row: 0, icon: '🧠', label: 'Redis', sub: 'app cache' },
      { id: 'app', col: 2, row: 1, icon: '⚙️', label: 'offers-api' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres', sub: 'asli data' },
      { id: 'cdc', col: 3, row: 0, icon: '🛰️', label: 'CDC stream', sub: 'DB ke har change' },
    ],
    steps: [
      { from: 'browser', to: 'cdn', label: 'offer banner image', tone: 'good', say: 'Jitna baahar cache karo, utna sasta. Public offer banner CDN par cache hota hai, sabke liye ek jaisa.' },
      { from: 'cdn', to: 'app', label: 'mere offers (per-user)', say: 'Per-user offers CDN par nahi. Request offers-api tak aati hai. Cache ki jagah data ka maalik tay karta hai.' },
      { from: 'app', to: 'redis', label: 'cache.get(key)', tone: 'gold', say: 'Cache-aside: offers-api pehle Redis dekhta hai. HIT toh jawab yahin se. Redis down ho toh bhi app DB se chal jaati hai.' },
      { from: 'app', to: 'db', label: 'MISS: SELECT', say: 'MISS par offers-api DB se data laati hai aur Redis mein TTL ke saath rakhti hai. Jaal: ek saath bahut misses = stampede (agla level).' },
      { from: 'db', to: 'cdc', label: 'offer badla', say: 'Merchant ne offer badla. Invalidation ke do hi raaste: TTL (aasan, par TTL tak purana data), ya change par key delete karna (taaza, par har write path yaad rakhna padta hai).' },
      { from: 'cdc', to: 'redis', label: 'DEL offer:42', tone: 'good', set: { redis: { tone: 'good', sub: 'key hati, agla read taaza' } }, say: 'CDC stream DB ke har change se Redis key delete karta hai, taaki koi write path bhool na jaaye. CDC mein bhi lag hota hai, isliye chhota TTL safety net rakho.' },
      { at: ['redis'], say: 'Write-through (cache + DB dono saath) write dheema karta hai aur crash par mel bigad sakta hai. Write-behind tez hai, par crash par data ja sakta hai.' },
    ],
  },

  stampede: {
    intro: 'Deploy ke 300 second baad DB achanak gir gaya. Kyun? <b>10,000 keys ek saath expire</b> hui.',
    nodes: [
      { id: 'deploy', col: 0, row: 0, icon: '🚀', label: 'Deploy (t=0)', sub: 'cache warm kiya' },
      { id: 'reqs', col: 0, row: 1, icon: '👥', label: 'Requests', sub: 'hazaaron/sec', tone: 'accent' },
      { id: 'redis', col: 1, row: 1, icon: '🧠', label: 'Redis', sub: '10,000 keys · TTL 300 s' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Postgres', sub: 'load: 0' },
      { id: 'lock', col: 1, row: 2, icon: '🔒', label: 'Single-flight lock', sub: 'ek key, ek DB call' },
    ],
    steps: [
      { from: 'deploy', to: 'redis', label: '10,000 keys, TTL 300', say: 'Deploy ke baad cache warm hua: 10,000 keys, sabka TTL 300 second. Saari keys ek hi pal mein bani.' },
      { from: 'reqs', to: 'redis', label: 'sab HIT', tone: 'good', say: 'Agle 300 second sab HIT. Postgres par load lagbhag 0.' },
      { at: ['redis'], set: { redis: { tone: 'bad', sub: 't=300: sab expire 💀' } }, say: 't=300: saari 10,000 keys ek saath expire hui.' },
      { from: 'redis', to: 'db', label: '10,000 MISS ek second mein', tone: 'bad', set: { db: { tone: 'bad', sub: 'load: 10,000/s 😵' } }, say: '10,000 requests ek second mein Postgres par. Ek garam key ke liye 500 jaisi queries ek saath ja sakti hain, kyunki sab ko MISS mila.' },
      { at: ['redis'], set: { redis: { tone: 'good', sub: 'TTL 300 + random(0, 60)' }, db: { tone: '', sub: 'load bikhar gaya' } }, say: 'Ilaaj 1, jitter: ttl = 300 + random(0, 60). Expiry 60 second ki khidki mein bikhar jaati hai. Sabse sasta fix.' },
      { from: 'redis', to: 'lock', label: 'sirf ek DB call', tone: 'good', say: 'Ilaaj 2, single-flight: ek key ke liye sirf ek request DB jaaye; baaki usi jawab ka intezaar karein.' },
      { at: ['redis'], say: 'Ilaaj 3, early refresh: expiry paas aate hi kuch requests pehle hi naya data le aati hain, taaki garam key kabhi khaali na ho.' },
    ],
  },

  'cache-invalidation': {
    intro: 'Sharma Sweets ke ek product ka daam badla. CDC batata hai <b>kaunsa record</b> badla. Par cache mein <b>kaunse views</b> purane ho gaye?',
    nodes: [
      { id: 'tags', col: 2, row: 0, icon: '🏷️', label: 'Tag index', sub: 'product:42 → 3 views' },
      { id: 'db', col: 0, row: 1, icon: '🗄️', label: 'products DB', sub: 'daam ₹40 → ₹45', tone: 'accent' },
      { id: 'cdc', col: 1, row: 1, icon: '🛰️', label: 'CDC stream', sub: 'record: product 42' },
      { id: 'l2', col: 2, row: 1, icon: '🧠', label: 'L2: Redis', sub: 'sub-ms' },
      { id: 'l1', col: 3, row: 1, icon: '🖥️', label: 'L1: server memory', sub: 'µs · har server alag' },
      { id: 'pub', col: 2, row: 2, icon: '📣', label: 'pub/sub', sub: 'har layer ko khabar' },
      { id: 'cdn', col: 3, row: 2, icon: '🌍', label: 'CDN', sub: 'product page' },
    ],
    steps: [
      { from: 'db', to: 'cdc', label: 'UPDATE price', say: 'Product 42 ka daam ₹40 se ₹45 hua. CDC stream batata hai ki kaunsa RECORD badla: product 42.' },
      { from: 'cdc', to: 'tags', label: 'kaunse views?', tone: 'gold', say: 'Par cache views ka hota hai: product page, category list, search result. Tag index (surrogate keys) batata hai: tag product:42 → 3 cached views.' },
      { from: 'tags', to: 'l2', label: '3 keys DEL', tone: 'good', set: { l2: { tone: 'good', sub: '3 views saaf' } }, say: 'Teeno views ki keys L2 Redis se delete.' },
      { at: ['l1'], set: { l1: { tone: 'bad', sub: '4 second purana daam' } }, say: 'Lab 33 ka sabak: CDC ne Redis saaf kiya, par har server ke andar wale L1 cache ko khabar nahi mili. 4 second tak galat daam dikha.' },
      { from: 'cdc', to: 'pub', label: 'invalidate product:42', say: 'Ilaaj: invalidation pub/sub par bhi chhapo, taaki har layer sune.' },
      { from: 'pub', to: 'l1', label: 'L1 bhi saaf', tone: 'good', set: { l1: { tone: 'good', sub: '~100 ms mein saaf' } }, say: 'Har server ka L1 pub/sub sunta hai aur apni copy hata deta hai: ~100 ms mein.' },
      { from: 'pub', to: 'cdn', label: 'purge tag', tone: 'good', say: 'CDN par bhi surrogate key se purge. Har layer tak khabar pahunchni chahiye, sirf Redis tak nahi.' },
      { at: ['l2'], set: { l2: { tone: 'gold', sub: 'product:42:v7' } }, say: 'Doosra raasta: version keys (product:42:v7). Purge ki zaroorat nahi; nayi version ki key padho, purani khud expire hoti hai. Keemat: memory mein purane versions.' },
    ],
  },

  eviction: {
    intro: 'Redis ki memory bhar gayi. Kaun si key nikle? Aur "stale data" ya "hit rate gira" — kya eviction policy ki galti hai?',
    nodes: [
      { id: 'scan', col: 0, row: 0, icon: '📑', label: 'Report job', sub: '1 lakh keys, ek baar' },
      { id: 'newk', col: 0, row: 1, icon: '➕', label: 'Naya data', tone: 'accent' },
      { id: 'redis', col: 1, row: 1, icon: '🧠', label: 'Redis', sub: 'memory: 100% bhari' },
      { id: 'lru', col: 2, row: 0, icon: '🕰️', label: 'LRU', sub: 'sabse purana use' },
      { id: 'lfu', col: 2, row: 2, icon: '📊', label: 'LFU', sub: 'sabse kam baar use' },
      { id: 'hot', col: 0, row: 2, icon: '🔥', label: 'Hot key', sub: 'ipl:score' },
    ],
    steps: [
      { at: ['redis'], say: 'Teen alag cheezein: eviction = memory bhari, policy key nikaalti hai. Expiry = TTL poora hua. Invalidation = data badla. Stale data invalidation ka bug hai, eviction ka nahi.' },
      { from: 'newk', to: 'redis', label: 'SET (memory full)', say: 'Naya data rakhne ke liye kisi key ko nikaalna padega. Kaun nikle, policy tay karti hai. Evictions aur expirations alag-alag gino.' },
      { from: 'redis', to: 'lru', label: 'nikaalo: sabse purana use', say: 'LRU: sabse lambe samay se use na hui key nikalti hai. Sessions aur "abhi dekha hua" ke liye achha.' },
      { from: 'scan', to: 'redis', label: '1 lakh keys ek baar', tone: 'bad', set: { redis: { tone: 'bad', sub: 'garam keys nikal gayi' } }, say: 'LRU ka jaal: report job 1 lakh keys ek baar padhta hai. LRU un keys ko "taaza" maanta hai, aur roz ki garam keys nikal jaati hain (scan pollution).' },
      { from: 'redis', to: 'lfu', label: 'nikaalo: sabse kam baar', tone: 'good', set: { redis: { tone: 'good', sub: 'garam keys bachi' } }, say: 'LFU: sabse kam baar use hui key nikalti hai. Top products jaisi hamesha-garam keys bachi rehti hain; ek baar wala scan unhe nahi hata pata.' },
      { from: 'hot', to: 'redis', label: '1 lakh reads/sec', tone: 'bad', say: 'Hot key: ek hi key par 1 lakh reads/sec. Sharding madad nahi karti, kyunki ek key ek hi shard par rehti hai. Ilaaj: har server par chhoti local copy, ya key ki kai copies.' },
      { at: ['redis'], say: 'Request coalescing: ek key ke 500 misses ek saath aayein toh sirf ek request DB tak jaaye; baaki 499 wahi jawab baant lein.' },
    ],
  },

  storage: {
    intro: '"Kaunsa database?" Jawab <b>access pattern</b> mein hai. Har sawaal ke saamne sahi store.',
    nodes: [
      { id: 'q1', col: 0, row: 0, icon: '💸', label: 'Paisa + rishte', sub: 'transaction, JOIN' },
      { id: 's1', col: 1, row: 0, icon: '🗄️', label: 'Postgres', sub: 'relational · default' },
      { id: 'q2', col: 0, row: 1, icon: '🔑', label: 'Session by key', sub: 'ek key, poora object' },
      { id: 's2', col: 1, row: 1, icon: '⚡', label: 'Redis', sub: 'key-value' },
      { id: 'q3', col: 0, row: 2, icon: '📈', label: 'Metrics by time', sub: 'append + time range' },
      { id: 's3', col: 1, row: 2, icon: '⏱️', label: 'Time-series DB', sub: 'retention ke saath' },
      { id: 'q4', col: 2, row: 0, icon: '🔎', label: 'Typo + relevance', sub: '"mitai" → "mithai"' },
      { id: 's4', col: 3, row: 0, icon: '🔍', label: 'OpenSearch', sub: 'search engine' },
      { id: 'q5', col: 2, row: 1, icon: '🎞️', label: 'Video / PDF', sub: 'badi files' },
      { id: 's5', col: 3, row: 1, icon: '🪣', label: 'Object store (S3)', sub: 'DB mein kabhi nahi' },
      { id: 'q6', col: 2, row: 2, icon: '🧮', label: 'Crore rows ka SUM', sub: 'analytics' },
      { id: 's6', col: 3, row: 2, icon: '📊', label: 'Columnar (OLAP)', sub: 'ClickHouse, BigQuery' },
    ],
    steps: [
      { from: 'q1', to: 's1', label: 'default', tone: 'good', say: 'Paisa, rishte, transactions, ad-hoc queries: relational DB. Yahin se shuru karo. Postgres JSONB, full-text aur partitioning ke saath bahut kuch akela kar leta hai.' },
      { from: 'q2', to: 's2', label: 'GET session:abc', tone: 'good', say: 'Ek key se poora object (session, cache, feature flag): key-value store.' },
      { from: 'q3', to: 's3', label: 'append + range', tone: 'good', say: 'Metrics aur IoT: sirf append, aur time range par padhna. Time-series store; hot data 30 din, purana warm/cold storage par.' },
      { from: 'q4', to: 's4', label: 'relevance', tone: 'good', say: 'Typo, relevance ranking, facets: search engine. Search engine sach ka maalik nahi; DB se copy hota hai.' },
      { from: 'q5', to: 's5', label: 'blob', tone: 'good', say: 'Badi files (video, PDF): object store. DB mein sirf file ka pata (URL) rakho.' },
      { from: 'q6', to: 's6', label: 'aggregate', tone: 'good', say: 'Crore rows par SUM/GROUP BY: columnar store. Sirf zaroori columns padhta hai, isliye analytics tez.' },
      { at: ['s1'], set: { s1: { tone: 'gold', sub: 'naya DB = naya on-call' } }, say: 'Polyglot persistence ka jaal: har naya database = naya backup, monitoring, on-call aur data sync ka jhanjhat. Naya store tabhi jab Postgres sach mein kam pade.' },
    ],
  },

  engines: {
    intro: 'Ek hi write, do engines. B-tree <b>abhi</b> kharch karta hai, LSM <b>baad mein</b>.',
    nodes: [
      { id: 'bt', col: 1, row: 0, icon: '🌳', label: 'B-tree', sub: 'Postgres, InnoDB' },
      { id: 'page', col: 2, row: 0, icon: '📄', label: 'Disk page', sub: 'in-place update' },
      { id: 'w', col: 0, row: 1, icon: '✍️', label: 'Write', sub: 'balance = 500', tone: 'accent' },
      { id: 'lsm', col: 1, row: 2, icon: '📚', label: 'LSM', sub: 'RocksDB, Cassandra' },
      { id: 'mem', col: 2, row: 2, icon: '🧠', label: 'Memtable + WAL', sub: 'sirf append' },
      { id: 'sst', col: 3, row: 2, icon: '🗂️', label: 'SSTables', sub: 'L0 → L1 → L2 → L3' },
    ],
    steps: [
      { from: 'w', to: 'bt', label: 'UPDATE', say: 'B-tree "abhi kharch karo": sahi page dhoondo, padho, badlo, wapas likho.' },
      { from: 'bt', to: 'page', label: 'random page I/O', tone: 'gold', say: 'Random page I/O, page splits, aur har index ka apna update. Badle mein read seedha hai: ek descent, row mil gayi.' },
      { from: 'w', to: 'lsm', label: 'append', say: 'LSM "baad mein kharch karo": kuch dhoondta nahi, sirf append karta hai.' },
      { from: 'lsm', to: 'mem', label: 'memtable + WAL', tone: 'good', say: 'Write pehle memory (memtable) aur WAL file mein jaata hai. Sequential I/O, isliye write tez.' },
      { from: 'mem', to: 'sst', label: 'flush → SSTable', say: 'Memtable bhar gaya toh disk par SSTable ban jaati hai. Read ko memtable, L0, L1… kai jagah dekhna pad sakta hai; Bloom filter faltu jagah chhudwata hai.' },
      { at: ['sst'], set: { sst: { tone: 'bad', sub: 'compaction: p99 ⬆' } }, say: 'Compaction: LSM ka taala hua bill. Purani SSTables jod kar dobara likhi jaati hain; disk aur CPU khaati hai, aur raat 3 baje p99 chadha sakti hai.' },
      { at: ['bt', 'lsm'], say: 'Teen kharche: write, read aur space amplification. Lesson ki misaal mein write amp B-tree ~4x, LSM ~1.3x; asli number workload aur compaction policy par tike hain, naap kar dekho.' },
    ],
  },

  probabilistic: {
    intro: 'Signup par "username le liya gaya?" har baar DB se poochhna mehenga hai. Kya <b>"shayad"</b> jawab bhi kaam aa sakta hai?',
    nodes: [
      { id: 'hll', col: 1, row: 0, icon: '📊', label: 'HyperLogLog', sub: '~12 KB' },
      { id: 'req', col: 0, row: 1, icon: '🙋', label: 'Signup form', sub: 'username check', tone: 'accent' },
      { id: 'bloom', col: 1, row: 1, icon: '🌸', label: 'Bloom filter', sub: 'bits + 3 hash' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'users DB', sub: 'asli jawab' },
    ],
    steps: [
      { at: ['bloom'], say: "Bloom filter = ek bit array + 3 hash functions. ADD 'priya': h1→17, h2→402, h3→9981, teeno bits 1 ho gaye." },
      { from: 'req', to: 'bloom', label: "'rahul' hai?", tone: 'good', set: { bloom: { tone: 'good', sub: 'ek bit 0 → PAKKA nahi' } }, say: "'rahul' check kiya: ek bhi bit 0 mila → 'rahul' pakka nahi hai. DB gaye bina jawab. False negative kabhi nahi hota." },
      { from: 'req', to: 'bloom', label: "'priya' hai?", tone: 'gold', set: { bloom: { tone: 'gold', sub: 'saare bits 1 → SHAYAD' } }, say: "'priya' ke teeno bits 1 → shayad hai. Bits kisi doosre naam ne bhi set kiye ho sakte hain (false positive)." },
      { from: 'bloom', to: 'db', label: 'sirf "shayad" par', say: 'Sirf "shayad" par asli DB lookup. Zyadatar bekaar lookups pehle hi kat chuke hote hain. Memory zyada do toh false positive kam.' },
      { at: ['bloom'], set: { bloom: { tone: 'bad', sub: 'delete nahi ho sakta' } }, say: "Delete nahi ho sakta: bits doosre naamon ke saath share hain. Ek bit 0 karoge toh koi doosra naam galti se 'nahi hai' ban jaayega." },
      { at: ['hll'], say: 'HyperLogLog: "kitne unique users?" ka jawab ~12 KB mein, crore unique tak, lagbhag 1% galti ke saath. Exact count ke liye saari IDs yaad rakhni padti.' },
      { at: ['bloom', 'hll'], say: 'Kab approximate theek? Jab galti ki keemat chhoti ho: ek extra DB lookup, dashboard par ~1%. Paise ya permission ke faisle par kabhi nahi.' },
    ],
  },

  sharding: {
    intro: 'Teen shabd jo log ghol dete hain: <b>replication, partitioning, sharding</b>. Teeno alag problem hal karte hain.',
    nodes: [
      { id: 'primary', col: 2, row: 0, icon: '✍️', label: 'Primary', sub: 'saare writes' },
      { id: 'part', col: 3, row: 0, icon: '✂️', label: 'Partitions', sub: 'orders_2026_01, _02…' },
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Riya', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'profile-api' },
      { id: 'shards', col: 3, row: 1, icon: '🧩', label: 'Shards', sub: 'kai servers' },
      { id: 'replica', col: 2, row: 2, icon: '🪞', label: 'Replica', sub: 'lag: 2 s' },
    ],
    steps: [
      { at: ['primary', 'replica'], say: 'Replication: wahi data, kai copies. Read scale aur HA (ek mare toh doosra) milta hai. Write scale nahi: saare writes ab bhi ek primary par.' },
      { from: 'user', to: 'api', label: 'naam badla', say: 'Riya profile mein apna naam badalti hai.' },
      { from: 'api', to: 'primary', label: 'UPDATE name', tone: 'good', say: 'profile-api write primary par karta hai. Save ho gaya ✅.' },
      { from: 'api', to: 'replica', label: 'GET /profile', tone: 'bad', set: { replica: { tone: 'bad', sub: 'purana naam 😡' } }, say: 'Turant refresh hua aur read replica se gaya. Replica 2 second peeche hai: purana naam dikha. Riya: "save nahi hua?"' },
      { at: ['api'], set: { api: { tone: 'good', sub: 'apna data: primary se' } }, say: 'Ilaaj (read-after-write): write ke baad kuch second primary se padho (sticky), ya user ka apna data hamesha primary se, ya write ki position yaad rakho aur replica ke pakadne tak ruko.' },
      { from: 'primary', to: 'part', label: 'ek server, tukde', say: 'Partitioning: ek hi server par table mahine ke hisaab se tukdon mein. Purane tukde drop karna aasan; capacity nahi badhti.' },
      { at: ['shards'], set: { shards: { tone: 'gold', sub: 'cross-shard JOIN gaya' } }, say: 'Sharding: data kai servers par bata. Write scale milta hai, par cross-shard JOIN aur transaction mushkil. Shard key sabse bada, lagbhag na badalne wala faisla.' },
    ],
  },

  conshash: {
    intro: 'Cache cluster mein ek node joda, aur DB gir gaya. Kyun? Aur hash ring is outage ko kaise rokta hai?',
    nodes: [
      { id: 'm4', col: 1, row: 0, icon: '➗', label: 'hash % 4', sub: 'user:42 → node 3' },
      { id: 'm5', col: 2, row: 0, icon: '➗', label: 'hash % 5', sub: 'user:42 → node 2 😱' },
      { id: 'db', col: 3, row: 0, icon: '🗄️', label: 'DB' },
      { id: 'key', col: 0, row: 1, icon: '🔑', label: 'key: user:42', tone: 'accent' },
      { id: 'ring', col: 1, row: 2, icon: '⭕', label: 'Hash ring', sub: '0 … 2³²' },
      { id: 'nb', col: 2, row: 2, icon: '🖥️', label: 'node-B', sub: 'ghadi ki disha mein agla' },
      { id: 'ne', col: 3, row: 2, icon: '🆕', label: 'naya node-E', sub: 'sirf ek arc leta hai' },
    ],
    steps: [
      { from: 'key', to: 'm4', label: '4 nodes', say: 'Seedha tareeka: hash(user:42) % 4 = node 3.' },
      { from: 'm4', to: 'm5', label: 'ek node joda', tone: 'bad', say: 'Ek node joda: ab % 5 → node 2. Alag node! 4 se 5 nodes par ~80% keys ki jagah badal jaati hai.' },
      { from: 'm5', to: 'db', label: '80% cache MISS', tone: 'bad', set: { db: { tone: 'bad', sub: 'achanak bhaari load' } }, say: 'Cache mein 80% keys turant thandi, aur saara load ek saath DB par. Sharding mein 80% data copy karna padta. Aksar seedha outage.' },
      { from: 'key', to: 'ring', label: 'nodes ko bhi hash karo', say: 'Hash ring: keys aur nodes dono ko ek gol daayre (0 … 2³²) par rakho.' },
      { from: 'ring', to: 'nb', label: 'ghadi ki disha mein', tone: 'good', say: 'Niyam: key ghadi ki disha mein pehle milne wale node ki hai. user:42 → node-B.' },
      { from: 'nb', to: 'ne', label: 'ek arc ki keys', tone: 'good', set: { ne: { tone: 'good' } }, say: 'Naya node-E ring par ek jagah baithta hai aur sirf apne se pehle wale arc ki keys leta hai: lagbhag 1/5 keys hilti hain, 80% nahi.' },
      { at: ['ring'], set: { ring: { tone: 'gold', sub: '150 vnodes har server' } }, say: 'Virtual nodes: har server ring par ~150 jagah. Toy misaal: bina vnodes ek node 45%, doosra 3% leta hai; 150 vnodes par har node ~25%.' },
    ],
  },

  migrations: {
    intro: '2 crore rows, <code>amount</code> INTEGER se BIGINT. App band kiye bina. <b>Kram hi sab kuch hai.</b>',
    nodes: [
      { id: 'oldc', col: 1, row: 0, icon: '🔢', label: 'amount', sub: 'INTEGER (purana)' },
      { id: 'flag', col: 2, row: 0, icon: '🚩', label: 'Feature flag', sub: 'read kahan se?' },
      { id: 'app', col: 0, row: 1, icon: '⚙️', label: 'orders-api', tone: 'accent' },
      { id: 'newc', col: 1, row: 1, icon: '🆕', label: 'amount_big', sub: 'BIGINT (naya)' },
      { id: 'bf', col: 2, row: 1, icon: '🚚', label: 'Backfill job', sub: '5k rows + sleep' },
      { id: 'rep', col: 3, row: 1, icon: '🪞', label: 'Replica', sub: 'lag: 0 s' },
      { id: 'ver', col: 2, row: 2, icon: '✅', label: 'Verify', sub: 'count → checksum' },
    ],
    steps: [
      { at: ['newc'], say: 'EXPAND: naya column amount_big banao. Purane column ko haath mat lagao.' },
      { from: 'app', to: 'newc', label: 'dual-write', tone: 'good', say: 'DUAL-WRITE: har naya write ab dono columns mein. Dual-write backfill se PEHLE shuru hona chahiye.' },
      { at: ['bf'], set: { bf: { tone: 'bad', sub: 'ulta kram = chup galti' } }, say: 'Kyun pehle? Kram ulta ho toh backfill ke dauraan aaye 41,204 writes nayi jagah pahunche hi nahi. Koi error nahi aata; sirf verify pakadta hai.' },
      { from: 'bf', to: 'newc', label: 'purani rows, 5k batch', set: { bf: { tone: '', sub: '5k rows + sleep' } }, say: 'BACKFILL: purani rows chhote batches (5k–10k) mein copy, beech mein thoda sleep.' },
      { from: 'bf', to: 'rep', label: 'WAL → replica lag', tone: 'bad', set: { rep: { tone: 'bad', sub: 'lag badha ⏳' } }, say: 'Har batch WAL banata hai aur replica ko peeche kar sakta hai. Batch size ek latency faisla hai: replica lag dekh kar speed tay karo.' },
      { at: ['ver'], set: { ver: { tone: 'good' } }, say: 'VERIFY: pehle count, phir checksum, phir shadow read (dono columns padh kar milao). Verify kabhi skip mat karo.' },
      { at: ['flag'], set: { flag: { tone: 'good', sub: '1% → 10% → 100%' } }, say: 'CUTOVER: reads ek flag se naye column par: 1% → 10% → 100%. Gadbad dikhe toh flag wapas.' },
      { at: ['oldc'], set: { oldc: { tone: 'muted', sub: 'CONTRACT: drop' } }, say: 'CONTRACT: kuch din baad purane column mein likhna band, phir drop. Drop ke baad rollback ka darwaza band ho jaata hai.' },
    ],
  },

  'boss-data': {
    intro: 'Ticket: "Merchant dashboard <b>12.8 second</b> le raha hai." Har kadam par naapo, andaza nahi.',
    nodes: [
      { id: 'ix', col: 1, row: 0, icon: '📒', label: 'Composite index', sub: '(merchant_id, created_at)' },
      { id: 'cov', col: 2, row: 0, icon: '🎯', label: 'Covering + fields', sub: 'sirf zaroori columns' },
      { id: 'cnt', col: 3, row: 0, icon: '🔢', label: 'COUNT(*) hatao', sub: 'has_more kaafi' },
      { id: 'dash', col: 0, row: 1, icon: '📊', label: 'Merchant dashboard', sub: '12.8 s 😴', tone: 'bad' },
      { id: 'cache', col: 3, row: 1, icon: '🧠', label: 'Cache + jitter', sub: '90% requests' },
    ],
    steps: [
      { at: ['dash'], say: 'EXPLAIN chalao: koi index nahi, full table scan + sort. 12.8 second. Pehle naapo, phir badlo.' },
      { from: 'dash', to: 'ix', label: 'access pattern → index', tone: 'good', set: { dash: { tone: 'gold', sub: '380 ms' } }, say: 'Query ke access pattern se mel khaata composite index: 12.8 s → 380 ms.' },
      { from: 'ix', to: 'cov', label: 'kam columns', tone: 'good', set: { dash: { sub: '140 ms' } }, say: 'Sirf zaroori fields maango aur index ko covering banao: 380 → 140 ms.' },
      { from: 'cov', to: 'cnt', label: 'total hatao', tone: 'good', set: { dash: { sub: '60 ms' } }, say: 'Har request par COUNT(*) ka total hatao (has_more ya approximate count): 140 → 60 ms.' },
      { from: 'cnt', to: 'cache', label: 'cache + TTL jitter', tone: 'good', set: { dash: { tone: 'good', sub: '2 ms (90% requests)' } }, say: 'Ab cache + TTL jitter: 90% requests 2 ms mein. Jitter se stampede nahi hota.' },
      { at: ['dash'], say: 'Kram yaad rakho: access pattern → mel khaata index → rows bounded → phir cache. Cache pehle lagate toh dheemi query sirf chhup jaati, theek nahi hoti.' },
    ],
  },

});
