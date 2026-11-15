/* =====================================================================
   System Gurukul — Scenes: 🔌 API Design (api track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  naming: {
    intro: 'Aman ek naya app bana raha hai jo ChaiPay API use karta hai. Kya Aman docs khole bina endpoint <b>guess</b> kar sakta hai?',
    nodes: [
      { id: 'docs', col: 0, row: 0, icon: '📖', label: 'API docs', sub: 'har baar kholni padti' },
      { id: 'dev', col: 0, row: 1, icon: '👨‍💻', label: 'Aman (developer)', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '🚪', label: 'ChaiPay API' },
      { id: 'user', col: 2, row: 0, icon: '👤', label: 'GET /users/5', sub: 'ek user' },
      { id: 'orders', col: 2, row: 1, icon: '🧾', label: 'GET /users/5/orders', sub: 'user 5 ke orders' },
      { id: 'neworder', col: 2, row: 2, icon: '➕', label: 'POST /orders', sub: 'naya order' },
      { id: 'cancel', col: 1, row: 2, icon: '✖️', label: 'Cancel karna?', sub: 'CRUD nahi hai' },
    ],
    steps: [
      { from: 'dev', to: 'docs', label: 'POST /getUser?? 🤔', tone: 'bad', say: 'Purani API mein har endpoint alag dhang ka tha: POST /getUser, GET /deleteUser/5. Aman ko har endpoint ke liye docs kholni padti thi.' },
      { at: ['api'], set: { api: { tone: 'good', sub: 'URL = noun · method = verb' } }, say: 'Ek niyam se 80% design ho jaata hai: URL resource (noun) batata hai, HTTP method kaam (verb). Plural nouns, kebab-case, zyada se zyada 2 level nesting.' },
      { from: 'api', to: 'user', label: 'GET', tone: 'good', say: 'Ek user chahiye: GET /users/5. Collection /users, item /users/5 — dono ek jaise dikhte hain.' },
      { from: 'api', to: 'orders', label: 'GET', tone: 'good', say: 'User 5 ke orders: GET /users/5/orders. Aman ne docs khole bina guess kar liya. Achhi API ki asli pehchaan yahi hai.' },
      { from: 'api', to: 'neworder', label: 'POST · PATCH · DELETE', tone: 'good', say: 'Naya order: POST /orders. Badlo: PATCH /orders/812. Hatao: DELETE /orders/812. Method badla, URL wahi.' },
      { from: 'api', to: 'cancel', label: 'POST /orders/812/cancel', tone: 'gold', say: 'Cancel CRUD nahi hai. Sabse aam raasta: sub-resource action POST /orders/812/cancel. Refund ka apna id aur status hai, isliye refund apna resource: POST /refunds.' },
    ],
  },

  verbs: {
    intro: 'Network timeout aaya. Kya app request <b>dobara</b> bheje? Jawab HTTP method par tika hai.',
    nodes: [
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'ChaiPay app', tone: 'accent' },
      { id: 'srv', col: 1, row: 1, icon: '⚙️', label: 'wallet-api' },
      { id: 'get', col: 2, row: 0, icon: '👀', label: 'GET /balance', sub: 'safe ✅ idempotent ✅' },
      { id: 'put', col: 2, row: 1, icon: '📝', label: 'PUT /profile', sub: 'safe ❌ idempotent ✅' },
      { id: 'post', col: 2, row: 2, icon: '💸', label: 'POST /payments', sub: 'safe ❌ idempotent ❌' },
    ],
    steps: [
      { from: 'srv', to: 'get', label: 'retry: theek ✅', tone: 'good', say: 'GET /balance par timeout aaya. GET safe hai (kuch badalta nahi) aur idempotent hai. App bina dare retry kar sakta hai, cache bhi kar sakta hai.' },
      { from: 'srv', to: 'put', label: '5 baar = 1 baar', tone: 'good', say: 'PUT /profile poora resource replace karta hai. 5 baar bhejo, natija wahi. Safe nahi (data badalta hai), par idempotent hai.' },
      { from: 'srv', to: 'post', label: 'retry = doosra charge 💀', tone: 'bad', say: 'POST /payments na safe, na idempotent. Retry kiya toh doosra charge. Isliye POST par Idempotency-Key chahiye.' },
      { at: ['srv'], say: 'PATCH dhyaan se: "value = 5" idempotent hai, "+1 karo" idempotent nahi. Safe = kuch nahi badla. Idempotent = N baar bhejo, asar ek baar jaisa.' },
      { from: 'srv', to: 'app', label: '401 vs 403', tone: 'gold', say: 'Status code batata hai ki client ab kya kare. 401 = server nahi jaanta tum kaun ho (login karo). 403 = jaanta hai, par permission nahi (login se kuch nahi badlega).' },
      { from: 'srv', to: 'app', label: '429 vs 503 · 400 vs 422', tone: 'gold', say: '429 = tum zyada bhej rahe ho, Retry-After ke baad aao. 503 = server khud pareshan hai. 400 = request hi toota hua; 422 = samajh aayi par value galat.' },
    ],
  },

  'offset-pain': {
    intro: 'Koi <code>GET /transactions?page=485728</code> maang raha hai. User ko 50 rows chahiye. Postgres ko kitni padhni padti hain?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '🕷️', label: 'Scraper', sub: 'page=485728', tone: 'bad' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'transactions-api', sub: 'LIMIT 50 OFFSET …' },
      { id: 'idx', col: 2, row: 0, icon: '🗂️', label: 'Index', sub: 'ON (created_at)' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Postgres primary' },
      { id: 'buf', col: 2, row: 2, icon: '🧠', label: 'Buffer pool (RAM)', sub: 'sabke garam pages' },
      { id: 'rep', col: 3, row: 1, icon: '🪞', label: 'Read replica', sub: 'lag: 0 s' },
    ],
    steps: [
      { from: 'user', to: 'api', label: '?page=1', tone: 'good', say: 'Page 1: OFFSET 0. Postgres 50 rows padhta hai, 4 ms. Koi dikkat nahi.' },
      { from: 'user', to: 'api', label: '?page=485728', tone: 'bad', say: 'Ab page 485728. transactions-api query banati hai: LIMIT 50 OFFSET 24,286,350.' },
      { from: 'api', to: 'db', label: 'OFFSET 24,286,350', tone: 'bad', set: { db: { tone: 'bad', sub: '2.4 crore rows · 7 s' } }, say: 'Postgres ko 2.4 crore rows padh kar phenkni padti hain, tab 50 rows milti hain: ~7 second. User ko 50 hi dikhi; poori keemat DB ne chukayi.' },
      { from: 'db', to: 'idx', label: 'index se walk', tone: 'gold', say: '"Index laga do?" Page 1: 12.8 s → 4 ms. Page 485728: 12.8 s → 6.8 s. Index sorting bachata hai, skipping nahi: 24M entries chalni hi padti hain.' },
      { from: 'db', to: 'buf', label: '2.4 crore rows andar', tone: 'bad', set: { buf: { tone: 'bad', sub: 'garam pages bahar 😵' } }, say: 'Nuksaan sirf ek query ka nahi: 2.4 crore rows buffer pool mein bharti hain aur baaki sabka data nikaal deti hain. Ab saari queries dheemi.' },
      { from: 'db', to: 'rep', label: 'replication peeche', tone: 'bad', set: { rep: { tone: 'bad', sub: 'lag badh raha ⏳' } }, say: 'Read replica par lambi read replica ko peeche kar deti hai. Replica lag badha toh read-after-write tootne lagta hai: user ko apna naya data nahi dikhta.' },
      { at: ['api'], set: { api: { tone: 'bad', sub: '1 connection 7 s ke liye' } }, say: 'Aur ek pool connection 7 second tak hostage. Ilaaj agle level mein: cursor pagination, jiski cost har page par same rehti hai.' },
    ],
  },

  cursor: {
    intro: 'Sawaal hi badal do: "page 485728 do" nahi, balki <b>"jahan chhoda tha, uske baad ke 50 do"</b>.',
    nodes: [
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'Riya ka app', sub: 'infinite scroll', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'transactions-api' },
      { id: 'idx', col: 2, row: 1, icon: '🗂️', label: 'Index', sub: 'user_id, created_at, id' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres', sub: '50 rows padhi, 50 di' },
    ],
    steps: [
      { from: 'app', to: 'api', label: 'GET /transactions', say: 'Pehla page: transactions-api 50 rows deta hai, saath mein next_cursor.' },
      { from: 'api', to: 'app', label: 'next_cursor: eyJ0Ijo…', tone: 'gold', say: 'Cursor opaque hai: base64({t, id}). App andar nahi jhaankta. Server kal cursor ka format badal sake, isliye client ko sirf ek band dabba milta hai.' },
      { from: 'app', to: 'api', label: '?cursor=eyJ0Ijo…', say: 'Agla page: app wahi cursor wapas bhejta hai. Page number kahin nahi hai.' },
      { from: 'api', to: 'idx', label: '(created_at, id) < (?, ?)', tone: 'good', say: 'Server cursor kholta hai aur keyset query chalata hai. Index ka kram (user_id, created_at, id) query se match karta hai: filter → sort → tie-break.' },
      { from: 'idx', to: 'db', label: '1 seek · 50 rows', tone: 'good', set: { db: { tone: 'good' } }, say: 'Index par 1 seek, 50 rows padhi, 50 di. Page 1 ho ya page 4,85,728, cost same.' },
      { at: ['idx'], say: 'id tie-breaker kyun? Same created_at wali do rows hon toh sirf created_at se ek row gum ho sakti hai ya do baar aa sakti hai.' },
      { at: ['app'], set: { app: { tone: 'gold', sub: '"page 500 par jao" ❌' } }, say: 'Imaandaar keemat: "page 500 par jao" nahi ho sakta, aur total count mushkil (has_more do). Admin tables aur chhote reports par offset theek hai.' },
    ],
  },

  filtering: {
    intro: 'DreamTeam11 ke transactions dikhane hain. Filter, sort aur fields — <b>har param ek query ki keemat</b> hai.',
    nodes: [
      { id: 'evil', col: 0, row: 0, icon: '🧨', label: 'Jigyasu client', sub: '?sort=random()', tone: 'bad' },
      { id: 'client', col: 0, row: 1, icon: '🏏', label: 'DreamTeam11 app', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'transactions-api', sub: 'allow-list' },
      { id: 'idx', col: 2, row: 1, icon: '🗂️', label: 'Index', sub: 'merchant, status, created' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Postgres' },
    ],
    steps: [
      { from: 'client', to: 'api', label: '?status=pending', tone: 'good', say: 'App maangta hai: status=pending, created_after=2026-01-01, sort=-created_at. Teeno allow-list mein hain, aur teeno ke liye index bana hai.' },
      { at: ['api'], set: { api: { sub: 'merchant_id zaroori ✅' } }, say: 'Ek filter zaroori hai: merchant_id (tenant), token se aata hai. Bina tenant filter ke query poori table chhoo sakti hai, aur doosre merchant ka data bhi.' },
      { from: 'api', to: 'idx', label: 'index seek', tone: 'good', say: 'Index ka kram: merchant → status → created_at. Range filter (created_after) index ke aakhri column par, isliye seek tez.' },
      { from: 'evil', to: 'api', label: '?sort=random()', tone: 'bad', set: { api: { tone: 'good', sub: '400: sort allowed nahi' } }, say: 'Har column par filter/sort allow kiya toh 15 columns = 32,768 combinations; har ek ka index namumkin. Koi na koi full scan dhoondh lega. Allow-list ke bahar = 400.' },
      { from: 'client', to: 'api', label: '?fields=id,amount,status', tone: 'gold', say: 'Sparse fieldsets: sirf 3 columns maango. Payload chhota hota hai.' },
      { from: 'idx', to: 'db', label: 'table chhui hi nahi', tone: 'good', set: { db: { tone: 'muted', sub: 'index-only scan' } }, say: 'Bada faayda: maange gaye columns index mein hi hon toh covering index se jawab mil jaata hai. Postgres table padhta hi nahi (index-only scan).' },
    ],
  },

  versioning: {
    intro: 'ChaiPay ka naya backend deploy hua. Lekin purana app <b>abhi bhi lakhon phones</b> par chal raha hai. Client tumhare saath deploy nahi hota.',
    nodes: [
      { id: 'old', col: 0, row: 0, icon: '📱', label: 'Purana app v3', sub: 'update nahi kiya' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'naya deploy' },
      { id: 'neu', col: 0, row: 2, icon: '📲', label: 'Naya app v4', tone: 'accent' },
      { id: 'v2', col: 2, row: 1, icon: '🆕', label: '/v2/wallets', sub: 'sirf breaking change par' },
    ],
    steps: [
      { from: 'api', to: 'old', label: '+ cashback (optional)', tone: 'good', say: 'Naya optional field jodna safe hai. Purana app v3 unknown field ignore kar deta hai.' },
      { from: 'api', to: 'old', label: 'amount: "5" → 5', tone: 'bad', set: { old: { tone: 'bad', sub: 'crash 💥' } }, say: 'Type badalna breaking hai: "5" string se 5 number. Purana app v3 parse nahi kar paata aur crash. Field hataana, rename karna, required banana bhi breaking.' },
      { from: 'api', to: 'old', label: "status: 'on_hold' (naya)", tone: 'gold', set: { old: { tone: 'gold', sub: 'unknown enum?' } }, say: 'Enum mein nayi value tabhi safe hai jab purana app unknown value sambhalta ho. Sabse chhupa breaking change: default behaviour badalna.' },
      { from: 'neu', to: 'api', label: 'GET /v2/wallets', say: 'Breaking change zaroori ho toh nayi version. URL mein (/v2/) dikhta hai, cache aur debug aasan; header mein URL saaf rehta hai, par browser se test mushkil.' },
      { from: 'api', to: 'v2', label: 'v1 + v2 saath', tone: 'good', say: 'v1 aur v2 kuch mahine saath chalte hain. Behtar raasta: additive changes, taaki version badalni hi na pade.' },
      { from: 'api', to: 'old', label: 'Deprecation + Sunset', tone: 'gold', set: { old: { tone: 'gold', sub: 'band hone ki date mili' } }, say: 'v1 band karne se pehle: Deprecation aur Sunset headers, usage metrics, clients se seedhi baat, phir brownout (roz 5 min band). Traffic ~0 ho tab hatao.' },
    ],
  },

  auth: {
    intro: 'Server ko kaise pata ki request <b>Riya</b> ki hai? Client jo kehta hai, us par nahi — jo server <b>verify</b> kar sake, us par.',
    nodes: [
      { id: 'idp', col: 1, row: 0, icon: '🔑', label: 'Auth server', sub: 'tokens banata hai' },
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Riya ka app', tone: 'accent' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'API gateway', sub: 'AuthN: signature' },
      { id: 'svc', col: 2, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'AuthZ: maalik kaun?' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'wallets table' },
      { id: 'aman', col: 0, row: 2, icon: '🕵️', label: 'Aman (jigyasu)', sub: '?user_id=8', tone: 'bad' },
    ],
    steps: [
      { from: 'aman', to: 'gw', label: '?user_id=8', tone: 'bad', say: 'Aman URL mein user_id=8 likh deta hai. Server identity query, body ya bina signature wale header se le, toh Aman kisi aur ka data padh leta hai: IDOR (OWASP API list mein #1).' },
      { from: 'client', to: 'idp', label: 'login', say: 'Riya login karti hai. Auth server access token (5–15 min) aur refresh token (30 din) deta hai. Refresh token server ke paas hai, revoke ho sakta hai.' },
      { from: 'client', to: 'gw', label: 'Authorization: Bearer …', tone: 'good', set: { gw: { tone: 'good', sub: 'token asli ✓ = riya' } }, say: 'Har request mein access token header mein. API gateway signature jaanchta hai (AuthN). Server ko bharosa header par nahi, signature par hai.' },
      { from: 'gw', to: 'svc', label: 'user = riya (verified)', say: 'Identity sirf verified token se aati hai. JWT revoke nahi hota, isliye access token ki umar chhoti rakhi hai.' },
      { from: 'svc', to: 'db', label: 'id=42 AND owner=riya', tone: 'good', say: 'wallet-api AuthZ karta hai: wallet 42 ki maalik Riya hai? Nahi toh 403. Token hi nahi ya galat? 401. Dono alag sawaal, alag jawab.' },
      { at: ['svc'], set: { svc: { tone: 'good', sub: 'default: deny 🔒' } }, say: 'Default-deny: har naya endpoint shuru se band. Auth ki zaroorat likh kar hi kholo. Koi bhool gaya toh endpoint band rahega, khula nahi.' },
    ],
  },

  errors: {
    intro: 'Riya ne galti se <b>₹0 ka order</b> bheja. Error aisa ho ki app (machine) aur Riya (insaan) dono samjhein.',
    nodes: [
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'ChaiPay app', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'orders-api' },
      { id: 'logs', col: 2, row: 1, icon: '🔎', label: 'Logs + traces', sub: 'trace_id se khoj' },
      { id: 'support', col: 2, row: 0, icon: '🎧', label: 'Support team' },
    ],
    steps: [
      { from: 'app', to: 'api', label: 'POST /orders amount=0', say: 'Riya ka app ₹0 ka order bhejta hai.' },
      { from: 'api', to: 'app', label: '200 {"error": "…wrong"}', tone: 'bad', set: { app: { tone: 'bad', sub: 'retry? kya dikhaun? 🤷' } }, say: 'Bura jawab: 200 OK ke saath "something went wrong". App ko pata hi nahi ki fail hua. Retry kare? Kaunsa field galat? Kuch pata nahi.' },
      { from: 'api', to: 'app', label: '422 problem+json', tone: 'good', set: { app: { tone: 'good', sub: 'amount ke neeche laal line' } }, say: 'Sahi jawab: 422 + RFC 9457 problem+json. type (stable machine code), title, detail (insaani message), errors: [{ field: "amount", code: "min" }].' },
      { at: ['app'], say: 'App "type" par switch karta hai, message par nahi. Message kal badal sakta hai; code stable rehta hai. Asli sawaal: client ab kya kare?' },
      { from: 'support', to: 'logs', label: 'trace_id: abc123', tone: 'gold', say: 'Riya support ko screenshot bhejti hai. Response ka trace_id support team ko seedha us request ke logs tak le jaata hai.' },
      { at: ['api'], set: { api: { tone: 'good', sub: 'andar ki baat andar' } }, say: 'Leak mat karo: stack trace, SQL query, internal hostnames jawab mein nahi. Attacker ke liye wahi cheezein naksha hain.' },
    ],
  },

  idempotency: {
    intro: 'Riya ₹4,999 pay karti hai. Network timeout. App dobara bhejta hai. <b>Ek charge ya do?</b>',
    nodes: [
      { id: 'keys', col: 1, row: 0, icon: '🗝️', label: 'idempotency_keys', sub: 'UNIQUE(key)' },
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'Riya ka app', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'pay-api' },
      { id: 'bank', col: 2, row: 1, icon: '🏦', label: 'Bank / PSP', sub: 'charges: 0' },
    ],
    steps: [
      { from: 'app', to: 'api', label: 'POST + Key: abc-1', say: 'App ek UUID banata hai: Idempotency-Key: abc-1. Key client banata hai; server banata toh retry par nayi key ban jaati, aur key bekaar.' },
      { from: 'api', to: 'keys', label: 'INSERT abc-1', tone: 'good', say: 'pay-api key ko UNIQUE constraint wali table mein likhta hai, request body ke hash ke saath.' },
      { from: 'api', to: 'bank', label: 'charge ₹4,999', tone: 'good', set: { bank: { sub: 'charges: 1' }, keys: { sub: 'abc-1 → response saved' } }, say: 'Bank ne charge kiya ✅. pay-api response bhi key ke saath store karta hai, sirf key nahi.' },
      { from: 'api', to: 'app', label: '201 … (jawab kho gaya)', tone: 'bad', say: 'Jawab network mein kho gaya. App nahi jaan sakta: request pahunchi hi nahi, ya jawab kho gaya? Dono ek jaise dikhte hain, isliye retry laazmi hai.' },
      { from: 'app', to: 'api', label: 'retry · Key: abc-1', say: 'App wahi key ke saath retry karta hai.' },
      { from: 'api', to: 'keys', label: 'abc-1 pehle se hai', tone: 'gold', say: 'UNIQUE constraint batata hai: key abc-1 pehle se hai. Bank ko dobara call nahi jaati.' },
      { from: 'api', to: 'app', label: '200 + idempotent-replay', tone: 'good', say: 'pay-api stored response wapas deta hai. Charge ek hi. Same key ke saath alag body (₹5,999) aaye toh 409 Conflict.' },
    ],
  },

  ratelimit: {
    intro: 'DreamTeam11 ka app match shuru hote hi requests ki baarish karta hai. <b>Token bucket</b> kaise rokta hai — aur kab nahi rokta?',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '🏏', label: 'DreamTeam11 app', sub: 'API key: dt11', tone: 'accent' },
      { id: 'bucket', col: 1, row: 1, icon: '🪣', label: 'Token bucket', sub: '200 tokens · +100/sec' },
      { id: 'api', col: 2, row: 1, icon: '⚙️', label: 'pay-api' },
      { id: 'office', col: 1, row: 0, icon: '🏢', label: '500 log, 1 IP', sub: 'office ka NAT' },
    ],
    steps: [
      { at: ['bucket'], say: 'Har API key ki ek bucket: zyada se zyada 200 tokens, har second 100 naye. Har request 1 token khaati hai.' },
      { from: 'client', to: 'bucket', label: '200 requests ek saath', tone: 'good', set: { bucket: { sub: '0 tokens bache' } }, say: 'Match shuru: 200 requests ek saath. Burst allowed hai; asli users aise hi chalte hain.' },
      { from: 'bucket', to: 'api', label: '200 aage gayi', tone: 'good', say: 'Saari 200 requests pay-api tak pahunch gayi.' },
      { from: 'client', to: 'bucket', label: '201vi request', tone: 'bad', set: { bucket: { tone: 'bad', sub: 'khaali · refill 100/sec' } }, say: 'Bucket khaali. 201vi request ko 429 Too Many Requests. Ab lambi chalne wali limit = refill rate, 100 requests/second.' },
      { from: 'bucket', to: 'client', label: '429 + Retry-After', tone: 'gold', say: 'Jawab mein Retry-After aur ratelimit-* headers. Retry-After ke bina client turant dobara maarega, aur rate limit ka matlab hi khatam.' },
      { from: 'office', to: 'bucket', label: 'IP par limit? ❌', tone: 'bad', say: 'Limit kis par? API key par, IP par nahi: ek office ke 500 log ek hi IP (NAT) se aate hain. IP par limit lagi toh sab ek saath block.' },
      { at: ['bucket'], set: { bucket: { tone: 'gold', sub: 'fixed window ka jaal' } }, say: 'Fixed window (6000/min) ka jaal: 0:59 par 5,999 aur 1:00 par 6,000 = do second mein ~12,000. Aur saari requests barabar nahi: mehengi report = zyada tokens (weighted).' },
    ],
  },

  'boss-api': {
    intro: 'Design review: ek asli API mein <b>chhe bimariyan</b>. Har dabba ek bimari hai. Kadam-dar-kadam ilaaj dekho.',
    nodes: [
      { id: 'e1', col: 0, row: 0, icon: '🔤', label: 'Naming', sub: 'POST /getTransactions', tone: 'bad' },
      { id: 'e2', col: 1, row: 0, icon: '📄', label: 'Pagination', sub: '?page=485728&limit=5000', tone: 'bad' },
      { id: 'e3', col: 2, row: 0, icon: '🏷️', label: 'Status code', sub: '200 {"error":"not found"}', tone: 'bad' },
      { id: 'e4', col: 0, row: 1, icon: '💳', label: 'Payments', sub: 'POST /payments (no key)', tone: 'bad' },
      { id: 'e5', col: 1, row: 1, icon: '🚦', label: 'Rate limit', sub: '429 bina Retry-After', tone: 'bad' },
      { id: 'e6', col: 2, row: 1, icon: '🔢', label: 'Total count', sub: '"total": 24286450', tone: 'bad' },
    ],
    steps: [
      { at: ['e1'], set: { e1: { tone: 'good', sub: 'GET /transactions' } }, say: 'Bimari 1: verb URL mein aur method galat. Ilaaj: GET /transactions. Naam guess ho sake.' },
      { at: ['e2'], set: { e2: { tone: 'good', sub: 'cursor · limit ≤ 100' } }, say: 'Bimari 2: deep offset aur bina hadd ki limit. Ilaaj: cursor pagination aur limit par upper cap (jaise 100).' },
      { at: ['e3'], set: { e3: { tone: 'good', sub: '404 + problem+json' } }, say: 'Bimari 3: 200 ke saath error, status code jhooth bol raha hai. Ilaaj: 404 + problem+json, stable type code ke saath.' },
      { at: ['e4'], set: { e4: { tone: 'good', sub: 'Idempotency-Key zaroori' } }, say: 'Bimari 4: bina key ke retry = double charge. Ilaaj: POST /payments par Idempotency-Key required.' },
      { at: ['e5'], set: { e5: { tone: 'good', sub: '429 + Retry-After' } }, say: 'Bimari 5: client turant dobara maarega. Ilaaj: Retry-After aur ratelimit-* headers.' },
      { at: ['e6'], set: { e6: { tone: 'good', sub: 'has_more · total hatao' } }, say: 'Bimari 6: har request par COUNT(*). Ilaaj: total hatao (ya approximate do); infinite scroll ke liye has_more kaafi hai.' },
    ],
  },

});
