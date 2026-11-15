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

});
