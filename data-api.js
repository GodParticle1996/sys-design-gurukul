/* =====================================================================
   TRACK 2 — API Design & Contracts
   naming · verbs · offset-pain · cursor · filtering · versioning ·
   errors · idempotency · ratelimit · boss-api
   ===================================================================== */

const T_OFFSET = [
  { text: 'page=1 maango — kitni rows padhi gayi?',
    check: s => s.records.some(r => r.kind === 'http' && r.page === 1 && r.status === 200) },
  { text: 'created_at par index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols.includes('created_at')) },
  { text: 'Ab page=1 tez hona chahiye (rows examined 1000 se kam)',
    check: s => { const i = s.records.findIndex(r => r.kind === 'index' && r.op === 'create');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.page === 1 && r.rowsExamined < 1000); } },
  { text: 'Ab page=485728 maango — index hone ke BAAWAJOOD',
    check: s => s.records.some(r => r.kind === 'http' && r.page >= 100000 && r.rowsExamined > 1000000) },
  { text: 'EXPLAIN se plan khud dekho',
    check: s => s.records.some(r => r.kind === 'explain') },
];

const T_COUNT = [
  { text: 'Dekho ki `total` field kitna mehenga hai',
    check: s => s.records.some(r => r.kind === 'http' && r.countTotal === true) },
  { text: 'countTotal band karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /countTotal/.test(r.path) && r.value === false) },
  { text: 'Ab wahi request dobara — farak dekho',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && /countTotal/.test(r.path || ''));
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 200 && r.countTotal === false); } },
];

const T_CURSOR = [
  { text: 'Pehle offset par page=485728 ka dard dekho',
    check: s => s.records.some(r => r.kind === 'http' && !r.keyset && r.page >= 100000) },
  { text: 'Keyset ke liye sahi index banao (created_at, id)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'created_at' && r.cols.includes('id')) },
  { text: 'API ko cursor pagination par shift karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /pagination/.test(r.path) && r.value === 'cursor') },
  { text: 'Cursor se maango — 100 se kam rows examined honi chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.keyset && r.rowsExamined <= 100 && r.status === 200) },
  { text: 'Ab ?page= bhejo — API ise reject karni chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 400 && r.guard === 'noPage') },
  { text: 'Cursor ke andar kya hai, khud dekho',
    check: s => s.records.some(r => r.kind === 'cursor' && r.op === 'decode') },
];

const T_MIGRATE = [
  { text: 'Legacy offset API par deep page abhi bhi chal raha hai',
    check: s => s.records.some(r => r.kind === 'http' && r.page >= 10000 && r.status === 200) },
  { text: 'Max page depth 1000 par baandho',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /maxPageDepth/.test(r.path)) },
  { text: 'Max limit 100 par baandho',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /maxLimit/.test(r.path)) },
  { text: 'Ab deep page 400 se reject ho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 400 && r.guard === 'maxDepth') },
];

const T_IDEM = [
  { text: 'Bina idempotency ke do baar POST karo — do charge ban jaayenge',
    check: s => s.records.filter(r => r.kind === 'http' && r.method === 'POST' && r.status === 201).length >= 2 },
  { text: 'Idempotency on karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /idempotency/.test(r.path) && r.value === true) },
  { text: 'Key ke saath POST karo',
    check: s => s.records.some(r => r.kind === 'http' && r.idem === 'new') },
  { text: 'Wahi key dobara bhejo — replay milna chahiye, naya charge nahi',
    check: s => s.records.some(r => r.kind === 'http' && r.idem === 'replay') },
];

const T_PROVE = [
  { text: 'created_at par index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create') },
  { text: 'Shallow page dikhao — tez',
    check: s => s.records.some(r => r.kind === 'http' && r.page === 1 && r.rowsExamined < 1000) },
  { text: 'Deep page dikhao — index hote hue bhi dheema',
    check: s => s.records.some(r => r.kind === 'http' && r.page >= 100000 && r.rowsExamined > 1000000) },
];

const T_RL = [
  { text: 'Bina limit ke burst bhejo — sab 200 milega',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && !r.rateLimited) },
  { text: 'Token bucket lagao (100 rps, burst 150)',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'ratelimit') },
  { text: 'Ab burst bhejo aur 429 khaao',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 429) },
];

const T_BOSS_API = [
  { text: 'Deep offset ka dard dikhao',
    check: s => s.records.some(r => r.kind === 'http' && !r.keyset && r.rowsExamined > 1000000) },
  { text: 'Keyset ke liye sahi index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'created_at' && r.cols.includes('id')) },
  { text: 'total ka chhupa hua COUNT(*) hatao',
    check: s => s.records.some(r => r.kind === 'sim' && /countTotal/.test(r.path || '') && r.value === false) },
  { text: 'Cursor pagination on karo',
    check: s => s.records.some(r => r.kind === 'sim' && /pagination/.test(r.path || '') && r.value === 'cursor') },
  { text: 'Cursor se maango — 100 se kam rows',
    check: s => s.records.some(r => r.kind === 'http' && r.keyset && r.rowsExamined <= 100) },
  { text: 'Max limit baandho',
    check: s => s.records.some(r => r.kind === 'sim' && /maxLimit/.test(r.path || '')) },
  { text: 'Rate limit lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'ratelimit') },
];

SD.registerLevels('api', [

/* =====================================================================
   L1 — Naming
   ===================================================================== */
{
  id: 'naming',
  icon: '🔤',
  title: 'Resource Naming — URL mein Noun, Method mein Verb',
  badge: 'Name Giver',
  objectives: [
    'URL <b>resource</b> batati hai, method <b>kaam</b>',
    'Plural nouns, 2-level nesting, kebab-case',
    'Jo cheez CRUD nahi hai use kaise naam do',
    'Predictable API = kam documentation, kam support',
  ],
  lesson: [
    `<h3>📖 Ek hi niyam se 80% design ho jaata hai</h3>
     <p><b>URL batati hai "kya", method batata hai "kya karna hai".</b>
     Bas itna. Isse jo nikalta hai:</p>
     <pre>❌ POST /getUser?id=5           ✅ GET    /users/5
❌ POST /createNewOrder         ✅ POST   /orders
❌ GET  /deleteUser/5           ✅ DELETE /users/5
❌ POST /updateUserEmail        ✅ PATCH  /users/5</pre>
     <p>Left side har endpoint ek <b>naya aviskaar</b> hai — client ko har
     baar docs kholni padti hai. Right side mein <code>/users/5</code> dekh
     ke tum <b>guess</b> kar sakte ho ki <code>/users/5/orders</code> bhi
     hoga. Yahi achhi API ki asli pehchaan hai: <b>guessable</b>.</p>
     <p>Chaar chhote niyam:</p>
     <table>
       <tr><th>Niyam</th><th>Kyun</th></tr>
       <tr><td><b>Plural nouns</b> — /orders</td><td>collection aur item ek jaise dikhein: /orders aur /orders/812</td></tr>
       <tr><td><b>Nesting max 2 level</b></td><td>/users/5/orders ✅ · /users/5/orders/9/items/3/tax ❌ — uske baad flat + query params behtar hai</td></tr>
       <tr><td><b>kebab-case paths</b></td><td>/shipping-addresses — URLs case-sensitive hain, underscore link mein underline ke neeche chhup jaata hai</td></tr>
       <tr><td><b>Consistency &gt; perfection</b></td><td>snake_case ya camelCase — jo bhi chuno, poori API mein ek hi</td></tr>
     </table>`,
    `<h3>🔬 Jab cheez CRUD nahi hai</h3>
     <p>Sab kuch resource nahi ban sakta. "Order cancel karo", "password
     reset karo", "invoice bhejo" — inke liye teen tareeke hain:</p>
     <pre>1. Sub-resource action  →  POST /orders/812/cancel        (sabse aam, saaf)
2. State ko field maano →  PATCH /orders/812 {"status":"cancelled"}
3. Action ko resource   →  POST /refunds {"order_id": 812}   (refund ki apni zindagi hai)</pre>
     <p>Kaunsa chuno? <b>Poochho ki us action ka apna wajood hai ya nahi.</b>
     Refund ka apna id, apna status, apni history hoti hai — woh resource
     hai. "Cancel" bas ek state transition hai — woh action endpoint hai.</p>
     <p class="tip">🎯 REST purist mat bano. <code>POST /orders/812/cancel</code>
     har developer turant samajh jaayega. Uske liye ek "cancellation resource"
     banana <i>theoretically</i> saaf hai aur <i>practically</i> pareshaani.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Achha naam ya bura?',
      instructions: 'Har endpoint ko sahi bin mein daalo.',
      bins: [
        { id: 'good', label: '✅ Achha' },
        { id: 'bad', label: '❌ Bura' },
      ],
      items: [
        { text: 'GET /users/5/orders', bin: 'good', explain: 'Noun, plural, 2-level nesting. Client ise dekh ke baaki endpoints guess kar sakta hai.' },
        { text: 'POST /getUserOrders', bin: 'bad', explain: 'Do galtiyan: verb URL mein, aur read ke liye POST. POST se yeh na cacheable rahi na safe.' },
        { text: 'DELETE /orders/812', bin: 'good', explain: 'Method hi kaam bata raha hai. URL sirf resource batati hai.' },
        { text: 'GET /orders/delete/812', bin: 'bad', explain: 'GET se state badalna 💀. Browser prefetch, crawler ya CDN tumhara data mita sakte hain.' },
        { text: 'POST /orders/812/cancel', bin: 'good', explain: 'State transition ke liye action endpoint bilkul theek hai. Har developer turant samajh jaayega.' },
        { text: 'GET /api/v1/getAllOrdersForUserById?userId=5', bin: 'bad', explain: 'Verb + redundant "ById" + jo cheez path mein honi chahiye woh query param mein. Yeh RPC hai, REST nahi.' },
        { text: 'PATCH /users/5', bin: 'good', explain: 'Partial update ke liye PATCH sahi hai. PUT poora resource replace karta hai.' },
        { text: 'GET /users/5/orders/9/items/3/refunds/1', bin: 'bad', explain: '5 level nesting. Yahan tak aate-aate URL yaad rakhna namumkin hai. Flat karo: /refunds/1 ya /refunds?item_id=3.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Naming ke niyam',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'naming',
      questions: [
        { q: 'Nesting kitne level tak theek hai?', target: 'nest', explain: '2 level tak. Uske baad URL yaad rakhna mushkil ho jaata hai — flat resource + query param behtar hai.' },
        { q: 'Collection ka naam plural ya singular?', target: 'plural', explain: 'Plural — /orders. Isse /orders (collection) aur /orders/812 (item) ka rishta saaf dikhta hai.' },
        { q: '"Order cancel karo" — jo CRUD mein fit nahi hota, uske liye?', target: 'action', explain: 'Action endpoint: POST /orders/812/cancel. Sab kuch resource banana theoretically saaf hai aur practically pareshaani.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Naming pakki karo',
      questions: [
        {
          q: 'Achhi API design ka sabse bada practical faayda kya hai?',
          choices: [
            'Client baaki endpoints GUESS kar sakta hai — kam docs, kam support, kam galtiyan',
            'Woh tez chalti hai',
            'Woh REST standard follow karti hai',
            'Woh kam bandwidth leti hai',
          ],
          answer: 0,
          explain: 'Consistency ka asli faayda <b>predictability</b> hai. Jab developer <code>/users/5/orders</code> dekhta hai toh use <code>/users/5/addresses</code> bhi pata chal jaata hai. Har inconsistency ek documentation lookup aur ek support ticket hai.',
        },
        {
          q: 'GET se state badalne mein sabse bada khatra?',
          choices: [
            'Crawlers, browser prefetch aur CDN sab GET ko safe maankar chala dete hain — tumhara data khud-ba-khud mit sakta hai',
            'Sirf semantics ka masla hai',
            'GET mein body nahi bhej sakte',
            'Slow hoga',
          ],
          answer: 0,
          explain: 'Yeh asli incident hai jo bar-bar hua hai: kisi ne <code>GET /delete?id=</code> banaya, phir Google crawler ne poora database saaf kar diya. GET ka <b>safe</b> hona ek vaada hai jispar poori duniya bharosa karti hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — API Naming',
    instructions: 'Aasan lagta hai, par yahin log fisalte hain. 🎤',
    questions: [
      {
        q: '"Order cancel karne ka endpoint kaise design karoge?"',
        choices: [
          'POST /orders/812/cancel — ya PATCH se status badlo. Poochhunga ki cancellation ka apna wajood hai (id, reason, history) — hai toh use resource banaunga',
          'POST /cancelOrder',
          'DELETE /orders/812',
          'GET /orders/812/cancel',
        ],
        answer: 0,
        explain: 'Sahi jawab pattern bhi deta hai aur <b>sawaal</b> bhi poochhta hai. DELETE galat hai — cancel karna order ko mitana nahi hai, woh ek state hai jo audit ke liye rehni chahiye. Aur GET toh bilkul nahi.',
      },
      {
        q: '"Ek team snake_case use kar rahi hai, doosri camelCase. Kya karoge?"',
        choices: [
          'Ek chuno aur poori API mein lagao — kaunsa, uska farak bahut kam hai; consistency ka farak bahut zyada hai',
          'Dono support karo',
          'snake_case hi sahi hai',
          'Client ko convert karne do',
        ],
        answer: 0,
        explain: '"Dono support karo" sabse mehenga jawab hai — ab har field do jagah, har bug do baar. Yeh un decisions mein se hai jahan <b>chunna</b> zaroori hai, <b>kya chuna</b> nahi.',
      },
    ],
  },
  success: [
    'Resource-based URLs likh sakte ho',
    'Actions ko sahi tareeke se naam de sakte ho',
    'Bata sakte ho ki GET safe kyun hona chahiye',
    'Consistency ko perfection se upar rakhte ho',
  ],
  homework: `Apni API ke 10 endpoints list karo. Har ek ke saamne likho: URL mein koi verb hai?
    nesting 2 se zyada? plural/singular consistent? Jitne "haan" hain, utne future support tickets.`,
  cards: [
    { front: 'Naming ka ek niyam?', back: '<b>URL batati hai "kya" (noun), method batata hai "kya karna hai" (verb).</b> Isse 80% design apne aap ho jaata hai.' },
    { front: 'Nesting ki limit?', back: '<b>2 level.</b> /users/5/orders ✅. Uske aage flat resource + query param — warna URL yaad rakhna namumkin.' },
    { front: 'CRUD mein fit na hone wale action?', back: '<code>POST /orders/812/cancel</code>. Agar us action ka apna wajood hai (id, status, history) toh use resource banao: <code>POST /refunds</code>.' },
    { front: 'GET safe kyun hona chahiye?', back: 'Crawlers, prefetch aur CDN GET ko safe maankar chalate hain. <code>GET /delete?id=</code> ne asli databases saaf kiye hain.' },
  ],
},

/* =====================================================================
   L2 — Verbs & status codes
   ===================================================================== */
{
  id: 'verbs',
  icon: '🔁',
  title: 'Verbs & Status Codes — Safe, Idempotent, ya Na Dono',
  badge: 'Verb Vidwan',
  objectives: [
    '<b>Safe</b> vs <b>idempotent</b> — do alag cheezein',
    'Har method ki guarantee — aur retry par uska matlab',
    'Status codes jo client ko batate hain ki <b>ab kya karna hai</b>',
    '401 vs 403, 429 vs 503, 400 vs 422',
  ],
  lesson: [
    `<h3>📖 Do shabd jo sab kuch tay karte hain</h3>
     <p><b>Safe</b> = kuch badalta nahi (sirf padhta hai).<br>
     <b>Idempotent</b> = N baar bhejo, asar ek baar jaisa.</p>
     <table>
       <tr><th>Method</th><th>Safe</th><th>Idempotent</th><th>Retry par?</th></tr>
       <tr><td>GET</td><td>✅</td><td>✅</td><td>bilkul safe</td></tr>
       <tr><td>PUT</td><td>❌</td><td>✅</td><td>safe — poora replace hai</td></tr>
       <tr><td>DELETE</td><td>❌</td><td>✅</td><td>safe — pehle se hi gaya hua</td></tr>
       <tr><td>PATCH</td><td>❌</td><td>⚠️ depends</td><td>"amount = 5" safe · "amount + 1" nahi</td></tr>
       <tr><td>POST</td><td>❌</td><td>❌</td><td><b>khatarnak</b> — isi liye Idempotency-Key</td></tr>
     </table>
     <p>Yeh sirf theory nahi hai — <b>poori duniya isi par bharosa karti
     hai</b>. Load balancers GET ko dobara bhej dete hain. Mobile SDKs
     network error par PUT retry karte hain. Agar tumne GET ko unsafe bana
     diya, toh tum ek aise vaade ko tod rahe ho jo tumhare code ke bahar
     nibhaya ja raha hai.</p>`,
    `<h3>🔬 Status code = "ab client kya kare?"</h3>
     <p>Har status code ka asli kaam client ko <b>agla kadam</b> batana hai:</p>
     <table>
       <tr><th>Code</th><th>Matlab</th><th>Client kya kare</th></tr>
       <tr><td>200 / 201 / 204</td><td>ho gaya</td><td>aage badho</td></tr>
       <tr><td><b>202</b></td><td>maan liya, hua nahi</td><td>status URL poll karo</td></tr>
       <tr><td>400</td><td>request hi galat hai (parse nahi hui)</td><td>theek karo, dobara bhejo</td></tr>
       <tr><td><b>401</b></td><td>tum kaun ho pata nahi</td><td>login karo / token refresh</td></tr>
       <tr><td><b>403</b></td><td>pata hai, par ijaazat nahi</td><td>haar maano — retry bekaar hai</td></tr>
       <tr><td>404</td><td>hai hi nahi</td><td>haar maano</td></tr>
       <tr><td>409</td><td>conflict (state badal chuka)</td><td>latest lo, phir dobara</td></tr>
       <tr><td><b>422</b></td><td>samajh aaya, par values galat</td><td>form par error dikhao</td></tr>
       <tr><td><b>429</b></td><td>tumne bahut maara</td><td>Retry-After tak ruko</td></tr>
       <tr><td>500</td><td>mera bug</td><td>retry aksar bekaar</td></tr>
       <tr><td><b>503</b></td><td>main bhara hoon</td><td>backoff ke saath retry karo ✅</td></tr>
     </table>
     <p class="tip">🎯 <b>Sabse mehengi galti:</b> overload par 500 bhejna.
     Achhe clients 500 par retry <i>nahi</i> karte (kyunki woh bug lagta hai)
     — jabki yahan retry hi sahi tha. 503 + Retry-After bhejo.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Halat se status code jodo',
      instructions: 'Har situation ko sahi code se milao.',
      pairs: [
        { left: '🔑 Token expire ho gaya', right: '401 Unauthorized', explain: '"Tum kaun ho pata nahi." Client ko token refresh karna chahiye. 403 bhejoge toh client login flow trigger hi nahi karega.' },
        { left: '🚫 User logged in hai par admin nahi', right: '403 Forbidden', explain: '"Pata hai tum kaun ho, par ijaazat nahi." Client ko yahan retry NAHI karna chahiye — yeh permanent hai.' },
        { left: '📝 Email field mein "abc" bheja', right: '422 Unprocessable Entity', explain: 'Request parse ho gayi, structure theek hai, par VALUE galat hai. 400 tab jab request hi parse na ho.' },
        { left: '🌊 Server pe load bahut hai', right: '503 + Retry-After', explain: '"Main bhara hoon." Retry-After ke saath. 500 bhejna sabse badi galti — client retry hi nahi karega.' },
        { left: '⏳ Report ban rahi hai, 5 min lagenge', right: '202 Accepted + Location', explain: 'Kaam hua nahi hai, sirf maan liya gaya. Location header status URL deta hai.' },
        { left: '🔄 Doosre ne beech mein resource badal diya', right: '409 Conflict', explain: 'Optimistic locking ka jawab. Client ko latest version laake dobara try karna chahiye.' },
      ],
    },
    {
      type: 'bins',
      title: 'Retry karna safe hai?',
      instructions: 'Network timeout ke baad — kaunsi request dobara bhejna safe hai?',
      bins: [
        { id: 'safe', label: '✅ Retry safe' },
        { id: 'unsafe', label: '⚠️ Retry khatarnak' },
      ],
      items: [
        { text: 'GET /orders/812', bin: 'safe', explain: 'Safe + idempotent. Jitni baar chaaho bhejo.' },
        { text: 'PUT /users/5 {"name":"Ravi"}', bin: 'safe', explain: 'Poora replace — 5 baar bhejo, natija wahi. Yahi PUT ki guarantee hai.' },
        { text: 'DELETE /orders/812', bin: 'safe', explain: 'Doosri baar 404 ya 204 milega, par order ek hi baar delete hua. Idempotent.' },
        { text: 'POST /payments {"amount":4999}', bin: 'unsafe', explain: '💀 Doosra charge. Isi ek line ke liye Idempotency-Key ka poora concept bana hai.' },
        { text: 'PATCH /counters/1 {"views": 500}', bin: 'safe', explain: 'Absolute value set kar raha hai — idempotent. Yeh PATCH ka safe roop hai.' },
        { text: 'PATCH /counters/1 {"views": "+1"}', bin: 'unsafe', explain: 'Relative change — har retry ek aur badha dega. Isliye PATCH par "depends" likha jaata hai.' },
        { text: 'POST /orders {"idempotency_key":"abc-1"}', bin: 'safe', explain: 'POST par bhi key ho toh retry safe ho jaata hai. Yahi key ka poora maqsad hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Verbs & codes par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'verbs',
      questions: [
        { q: 'Overload par kaunsa group sahi hai?', target: 'c500', explain: '503 Service Unavailable + Retry-After. Us group mein 500/502/503/504 hain — aur overload ke liye 503 hi sahi hai, 500 nahi.' },
        { q: 'Async kaam shuru hua — kaunsa group?', target: 'c200', explain: '202 Accepted. Woh 2xx group mein hai: 200 OK, 201 Created, 202 Accepted, 204 No Content.' },
        { q: 'Rate limit paar — kaunsa group?', target: 'c409', explain: '429 Too Many Requests, jo 409/422/429 group mein hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Codes pakke karo',
      questions: [
        {
          q: 'Server overload par 500 bhejne mein kya problem hai?',
          choices: [
            'Achhe clients 500 par retry nahi karte (woh bug lagta hai) — jabki yahan backoff ke saath retry hi sahi tha',
            'Koi problem nahi, 500 generic error hai',
            '500 se logs bhar jaate hain',
            'Client ko 500 samajh nahi aata',
          ],
          answer: 0,
          explain: 'Status code client ko <b>agla kadam</b> batata hai. 500 = "mera bug hai, retry se kuch nahi hoga". 503 = "main abhi bhara hoon, thodi der baad aana" — aur uske saath Retry-After. Galat code se client galat kaam karega.',
        },
        {
          q: 'PUT aur PATCH mein asli farak?',
          choices: [
            'PUT poora resource replace karta hai (isliye hamesha idempotent); PATCH partial change karta hai (idempotent ho bhi sakta hai, nahi bhi)',
            'PATCH naya hai, PUT purana',
            'PUT create karta hai, PATCH update',
            'Koi khaas farak nahi',
          ],
          answer: 0,
          explain: 'PUT ka matlab hai "resource ab bilkul YEH hai" — isliye N baar bhejne se natija nahi badalta. PATCH ka matlab hai "yeh badlo" — aur "+1 karo" jaisa patch idempotent nahi hai. Yeh farak retry logic ke liye seedha matter karta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Verbs & Codes',
    instructions: '"Safe" aur "idempotent" sahi bolna yahan bada farak laata hai. 🎤',
    questions: [
      {
        q: '"POST idempotent kyun nahi hai, aur ise idempotent kaise banaoge?"',
        choices: [
          'POST "naya banao" kehta hai, toh do baar = do cheezein. Idempotency-Key header se: client ek key bheje, server use unique constraint ke saath store kare aur dobara aane par purana jawab lauta de',
          'POST idempotent hai agar body same ho',
          'POST ko PUT se badal do',
          'Database transaction se ho jaayega',
        ],
        answer: 0,
        explain: 'Doosra hissa (kaise banaoge) hi asli jawab hai. Aur "same body toh same request" galat hai — do alag users theek same amount bhej sakte hain, woh do alag payments hain. Isiliye key <b>client</b> banata hai.',
      },
      {
        q: '"Client ko 401 mila. Kya karna chahiye? Aur 403 par?"',
        choices: [
          '401 par token refresh karke dobara try — 403 par haar maan lo, kyunki retry se kuch nahi badlega',
          'Dono par login screen dikhao',
          'Dono par retry karo',
          'Dono par error dikha do',
        ],
        answer: 0,
        explain: '401 = <b>authentication</b> ka masla (kaun ho pata nahi) → refresh/login. 403 = <b>authorization</b> ka masla (pata hai, ijaazat nahi) → retry bekaar hai. Inhe ulta bhejne se client infinite login loop mein pahunch jaata hai — yeh asli bug hai jo bahut jagah dikhta hai.',
      },
    ],
  },
  success: [
    'Safe aur idempotent ka farak bata sakte ho',
    'Har method ki retry guarantee jaante ho',
    'Status code se client ko sahi agla kadam batate ho',
    '401/403, 400/422, 429/503 sahi jagah use karte ho',
  ],
  homework: `Apni API ke error responses dekho. Kitne endpoints overload par 500 bhejte hain?
    Kitne 401 aur 403 mein farak karte hain? Har galat code ek client-side bug hai jo
    tumhe kabhi report nahi hoga.`,
  cards: [
    { front: 'Safe vs Idempotent?', back: '<b>Safe</b> = kuch badalta nahi (GET). <b>Idempotent</b> = N baar = 1 baar jaisa (GET, PUT, DELETE). POST dono nahi — isliye Idempotency-Key.' },
    { front: 'PATCH idempotent hai?', back: '<b>Depends.</b> <code>{"views": 500}</code> idempotent hai. <code>{"views": "+1"}</code> nahi. Isliye PATCH ke retry par soch ke faisla karo.' },
    { front: '401 vs 403?', back: '<b>401</b> = "tum kaun ho pata nahi" → token refresh karo. <b>403</b> = "pata hai, ijaazat nahi" → haar maano. Ulta bhejne se infinite login loop banta hai.' },
    { front: 'Overload par kaunsa code?', back: '<b>503 + Retry-After</b>. 500 bhejoge toh achhe clients retry hi nahi karenge — jabki yahan retry sahi tha.' },
    { front: '400 vs 422?', back: '<b>400</b> = request parse hi nahi hui (malformed JSON). <b>422</b> = parse ho gayi, structure theek, par values galat (email = "abc").' },
  ],
},

/* =====================================================================
   L3 — Offset pagination ka katl  ⭐ MARQUEE
   ===================================================================== */
{
  id: 'offset-pain',
  icon: '📄',
  title: 'Deep Offset — Ek Query jo DB ko Maar Deti Hai',
  badge: 'Offset Survivor',
  objectives: [
    '<code>OFFSET n</code> ka asli matlab: n rows padho aur PHENK do',
    'Index kyun <b>poori tarah</b> nahi bachata',
    '<code>total</code> field ki chhupi hui keemat',
    'Deep pagination se buffer pool, replica lag aur tail latency par asar',
  ],
  lesson: [
    `<h3>📖 "Ek user page 485728 maang raha hai"</h3>
     <p>Transaction history API. Ek user ne page 4,85,728 maanga.
     Database par yeh chala:</p>
     <pre>SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 50 OFFSET 24286350;</pre>
     <p>Ab yeh soch lo ki database ko karna kya pada:</p>
     <pre>2,42,86,400 rows padhi
2,42,86,350 rows PHENKI
        50 rows di</pre>
     <p><b>User ko 50 rows dikhi. Database ne 2.4 crore ki keemat chukayi.</b></p>
     <p>Isiliye page 1 tez hai, page 100 theek hai, aur page 4,85,728 aisa
     lagta hai jaise database ko saza mil rahi ho:</p>
     <table>
       <tr><th>Page</th><th>OFFSET</th><th>Rows padhi</th><th>Time</th></tr>
       <tr><td>1</td><td>0</td><td>50</td><td>4 ms ⚡</td></tr>
       <tr><td>100</td><td>4,950</td><td>5,000</td><td>12 ms 🙂</td></tr>
       <tr><td>10,000</td><td>4,99,950</td><td>5 lakh</td><td>380 ms 😬</td></tr>
       <tr><td>4,85,728</td><td>2,42,86,350</td><td>2.4 crore</td><td>7 s 💀</td></tr>
     </table>
     <p class="tip">🎯 Yahan asli galti kahan hui? <b>API ne user ko yeh
     sawaal poochhne DIYA.</b> Ek query jo 2.4 crore rows chhuti hai, woh
     production mein ek public endpoint ke peeche nahi honi chahiye thi.</p>`,
    `<h3>🔬 "Bhai index laga do na"</h3>
     <p>Yeh sabse aam jawab hai. Chalo lagate hain:</p>
     <pre>CREATE INDEX ix_txn_created ON transactions(created_at);</pre>
     <p>Aur ab dekho kya hua:</p>
     <pre>page 1        : 12.8 s → 4 ms      ✅ zabardast!
page 4,85,728 : 12.8 s → 6.8 s    😐 …itna hi?</pre>
     <p><b>Index ne sorting bachaayi — skipping nahi.</b></p>
     <p>Yeh farak samajhna is poore level ka dil hai. Index ek sorted
     structure hai. Woh database ko batata hai ki rows <b>kis kram mein</b>
     hain. Par <code>OFFSET 24286350</code> ka matlab hai <i>"24,286,350
     entries ke baad wali le aao"</i> — aur "ke baad wali" jaanne ka ek hi
     tareeka hai: <b>ginte hue chalo</b>.</p>
     <p>B-tree ek array nahi hai jahan tum index se seedha jump kar sako.
     Woh ek tree hai. "24 million-vaan element" nikalne ke liye use
     24 million entries chalni hi padengi — bas tez chalega.</p>
     <p>Aur ek aur cheez chhupi hui hai:</p>
     <pre>{ "data": [...50 items...], "page": 485728, "total": 24286450 }
                                              ↑
             yeh field har request par ek COUNT(*) chalati hai
             = 2.7 aur second</pre>
     <p>Woh chhota sa <code>total</code> jo UI mein "1-50 of 24,286,450"
     dikhata hai — woh <b>poori filtered table gin-ta hai</b>, har baar.</p>`,
    `<h3>💣 Aur bhi bura: nuksaan sirf tumhara nahi hai</h3>
     <p>Ek deep-page query sirf apne aap ko dheema nahi karti:</p>
     <table>
       <tr><th>Asar</th><th>Kya hota hai</th></tr>
       <tr><td><b>Buffer pool trash</b></td><td>2.4 crore rows cache mein bharti hain aur baaki sabka data nikaal deti hain — ab <b>saari</b> queries dheemi</td></tr>
       <tr><td><b>Replica lag</b></td><td>lambi read replica ko peeche kar deti hai → read-after-write tootna shuru</td></tr>
       <tr><td><b>Connection hostage</b></td><td>7 second tak ek pool connection blocked — capacity 6 rps par aa jaati hai</td></tr>
       <tr><td><b>Tail latency</b></td><td>tumhare p99 mein yeh dikhega, par asal mein saare users ka anubhav kharab hua</td></tr>
       <tr><td><b>Rows gum ho jaati hain</b></td><td>page 2 dekhte waqt naya row aa gaya? sab shift ho gaya — ek row tum <b>kabhi</b> nahi dekhoge</td></tr>
     </table>
     <p>Aakhri wala aksar log bhool jaate hain: <b>offset pagination sirf
     dheemi nahi, GALAT bhi hai</b> jab data badal raha ho. Woh position par
     kaam karti hai, identity par nahi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '💀 Khud dekho — page 485728',
      goal: 'Ek 2.4 crore rows wali transactions table hai. Pehle page 1 maango. Phir index banao aur farak dekho. Phir wahi index rehte hue page 4,85,728 maango — aur samjho ki index ne kyun nahi bachaya.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_OFFSET,
      success: allOf(T_OFFSET),
      successText: `Yeh teen numbers yaad rakho:
        <br>• bina index, page 1 → <b>~12.8 s</b> (poori table scan + sort)
        <br>• index ke saath, page 1 → <b>~4 ms</b> ✅
        <br>• <b>wahi index</b>, page 4,85,728 → <b>~6.8 s</b> 💀
        <br><br>Index ne <b>sorting</b> bachaayi, <b>skipping</b> nahi.
        <code>OFFSET</code> ka matlab hi hai "ginte hue aage badho" — aur ginne ke liye
        har entry chhuni padti hai. B-tree ek tree hai, array nahi; usme
        "24 million-vaan element" par jump nahi kiya ja sakta.`,
      hints: [
        'Pehle bina index ke: GET /api/v1/transactions?page=1&limit=50',
        'Ab index banao: CREATE INDEX ix_txn_created ON transactions(created_at)',
        'Wahi page dobara maango: GET /api/v1/transactions?page=1&limit=50',
        'Ab gehra jao: GET /api/v1/transactions?page=485728&limit=50',
        'Aur plan khud dekho: EXPLAIN SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50 OFFSET 24286350',
      ],
    },
    {
      type: 'terminal',
      title: '🧮 "total" field ki keemat',
      goal: 'UI par "1-50 of 24,286,450" dikhta hai. Woh chhota sa number har request par kitna mehenga padta hai? Naapo, phir band karo.',
      sys: SD.sys.txn({
        api: { countTotal: true },
        db: { tables: { transactions: { indexes: [
          { name: 'transactions_pkey', cols: ['id'], unique: true },
          { name: 'ix_txn_created', cols: ['created_at'] },
        ] } } },
      }),
      tasks: T_COUNT,
      success: allOf(T_COUNT),
      successText: `<code>total</code> ek <b>alag query</b> hai — <code>COUNT(*)</code> —
        jo <b>poore filtered set</b> ko gin-ti hai. <code>LIMIT</code> use nahi rokta.
        <br><br>Teen practical jawab:
        <br>• <b>Total do hi mat</b> — bas <code>has_more: true</code> bhejo (Twitter/Slack aisa hi karte hain)
        <br>• <b>Approximate count</b> — <code>pg_class.reltuples</code> ya cached count, "about 24M"
        <br>• <b>Alag endpoint</b> — jise UI tabhi maange jab sach mein zaroorat ho
        <br><br>Poochho: kya user ko sach mein pata hona chahiye ki 2,42,86,450 rows hain?`,
      hints: [
        'Pehle total ke saath: GET /api/v1/transactions?page=1&limit=50',
        'Ab band karo: sim set api.countTotal false',
        'Aur wahi request dobara: GET /api/v1/transactions?page=1&limit=50',
      ],
    },
    {
      type: 'hotspot',
      title: 'Offset ke dard par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'offset-pain',
      questions: [
        { q: 'Index lagane ke baad bhi deep page slow kyun rehta hai?', target: 'why', explain: 'Index SKIP nahi kar sakta, sirf tez WALK karta hai. OFFSET ka matlab hi "ginte hue aage badho" hai — aur ginne ke liye har entry chhuni padti hai.' },
        { q: 'Kaunsi cheez har request par ek poora COUNT(*) chalati hai?', target: 'count', explain: 'Response ka "total" field. Woh poore filtered set ko ginta hai — LIMIT use nahi rokta.' },
        { q: 'Data badalne par offset pagination kya galti karti hai?', target: 'shift', explain: 'Rows shift ho jaati hain. Naya row aane par page 2 ka pehla row page 1 par chala jaata hai — aur ek row tum kabhi nahi dekhte. Offset POSITION par kaam karta hai, identity par nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Offset ki samajh',
      questions: [
        {
          q: '"OFFSET 1000000 LIMIT 50" mein database kitni rows padhta hai?',
          choices: [
            '10,00,050 — offset wali sab padhni aur phenkni padti hain',
            '50 — sirf jo return hoti hain',
            '1000 — DB optimize kar leta hai',
            'Depend karta hai index par — index ho toh 50',
          ],
          answer: 0,
          explain: 'Aakhri option sabse aam galatfehmi hai. Index ke saath bhi <b>10,00,050 index entries</b> walk karni padti hain. Index sorting deta hai, skipping nahi. Ek B-tree mein "10 lakh-vaan element" par jump karne ka koi tareeka nahi hai.',
        },
        {
          q: 'Deep-page query se sirf us request ko nuksaan hota hai?',
          choices: [
            'Nahi — buffer pool trash hota hai (saari queries dheemi), replica lag badhta hai, aur ek connection 7 second block rehta hai',
            'Haan, sirf wahi request slow hoti hai',
            'Nahi, par sirf CPU par asar padta hai',
            'Sirf disk par asar padta hai',
          ],
          answer: 0,
          explain: 'Yahi is level ka sabse zaroori sabak. Ek deep-page query <b>saare users</b> ka anubhav kharab karti hai: cache se doosre logon ka data nikal jaata hai, replica peeche chala jaata hai, aur pool ka ek connection kai second ke liye bandhak ban jaata hai. Isiliye "sirf ek user hi toh karta hai" wali soch galat hai.',
        },
        {
          q: 'Offset pagination "galat" bhi kaise hai, sirf dheemi nahi?',
          choices: [
            'Data badalne par rows shift ho jaati hain — naya row aane par ek purani row tum kabhi nahi dekhoge, aur ek do baar dikh sakti hai',
            'Woh galat nahi hai, bas dheemi hai',
            'Woh sirf sorted data par galat hai',
            'Woh duplicate rows deti hai par skip nahi karti',
          ],
          answer: 0,
          explain: 'Offset <b>position</b> par kaam karta hai. Jab tum page 1 dekh rahe the aur ek naya transaction aaya, toh sab kuch ek position aage khisak gaya — page 2 ka pehla row ab page 1 par hai, aur tumne use kabhi nahi dekha. Keyset pagination <b>identity</b> par kaam karta hai, isliye yeh problem hi nahi hoti.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Deep Pagination',
    instructions: 'Yeh backend interview ka sabse aam performance sawaal hai. 🎤',
    questions: [
      {
        q: '"Ek user transaction history API par page 4,85,728 maang raha hai aur DB gir raha hai. Kya karoge?"',
        choices: [
          'Pehle query plan dekhunga. Problem OFFSET hai — DB ko 2.4 crore rows padh ke phenkni padti hain. Cursor pagination par jaunga; tab tak max page depth, timeout aur rate limit lagaunga',
          'User ko ban kar dunga',
          'created_at par index laga dunga',
          'Read replica add kar dunga',
        ],
        answer: 0,
        explain: 'Sabse pehla kadam <b>plan dekhna</b> hai, andaza nahi. Index lagana adhoora jawab hai — woh page 1 theek karta hai, deep page nahi. Replica se query dheemi hi rahegi, bas doosri machine par. Aur "ban kar do" — well, thoda mann toh karta hai.',
      },
      {
        terminal: {
          goal: 'Interviewer: "Yeh raha wahi endpoint. Mujhe LIVE dikhao ki index lagane ke baad bhi deep page slow rehta hai."',
          sys: SD.sys.txn({ api: { countTotal: false } }),
          tasks: T_PROVE,
          success: allOf(T_PROVE),
          successText: 'Perfect. Tumne <b>dikha ke</b> prove kiya, bataya nahi. Interview mein yeh farak sab kuch hai.',
          hints: [
            'Index banao: CREATE INDEX ix_c ON transactions(created_at)',
            'Shallow page: GET /api/v1/transactions?page=1&limit=50',
            'Deep page: GET /api/v1/transactions?page=485728&limit=50',
          ],
        },
      },
      {
        q: '"Tumhare UI ko \\"1-50 of 24,286,450\\" dikhana hai. Kaise karoge?"',
        choices: [
          'Poochhunga ki exact count sach mein chahiye ya nahi. Zyadatar cases mein has_more kaafi hai, warna approximate count (reltuples / cached) — exact COUNT(*) har request par 2.7 s ka hai',
          'COUNT(*) chala dunga, woh tez hai',
          'Total ko cache kar dunga 1 ghante ke liye',
          'Frontend se count karwa lunga',
        ],
        answer: 0,
        explain: 'Sabse achha jawab <b>requirement ko challenge</b> karta hai. Twitter, Slack, Gmail — koi bhi exact total nahi dikhata, sab "more" dikhate hain. Aur agar sach mein chahiye toh approximate count 99% cases mein kaafi hai: user ko "24,286,450" aur "about 24 million" mein koi farak nahi padta.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki OFFSET n ka matlab "n rows padho aur phenko" hai',
    'Samjha sakte ho ki index sorting bachata hai, skipping nahi',
    '<code>total</code> field ki keemat pehchaante ho',
    'Deep pagination ke system-wide nuksaan gina sakte ho',
  ],
  homework: `Apne DB par chalao: <code>EXPLAIN ANALYZE SELECT * FROM &lt;badi_table&gt;
    ORDER BY created_at DESC LIMIT 50 OFFSET 100000;</code>
    "rows" aur "actual time" dekho. Phir OFFSET ko 0 karke dobara chalao.
    Ratio hi poori kahani hai.`,
  cards: [
    { front: 'OFFSET 1000000 LIMIT 50 — kitni rows padhi?', back: '<b>10,00,050.</b> Offset wali sab padhni AUR phenkni padti hain. Index hone par bhi — bas index entries walk hoti hain.' },
    { front: 'Index deep offset ko kyun nahi bachata?', back: 'Index <b>sorting</b> deta hai, <b>skipping</b> nahi. B-tree ek tree hai, array nahi — "24 million-vaan element" par jump nahi kar sakte, ginte hue chalna padta hai.' },
    { front: '"total" field ki keemat?', back: 'Ek poora <code>COUNT(*)</code> har request par — 24M rows par ~2.7 s. LIMIT use nahi rokta. Ilaaj: <code>has_more</code>, approximate count, ya alag endpoint.' },
    { front: 'Deep page ka system-wide nuksaan?', back: '<b>Buffer pool trash</b> (saari queries dheemi) · <b>replica lag</b> · <b>connection 7s bandhak</b> (capacity 6 rps) · <b>tail latency</b>. Sirf ek user ka masla nahi.' },
    { front: 'Offset "galat" kaise hai?', back: 'Woh <b>position</b> par kaam karta hai, identity par nahi. Data badle toh rows shift hoti hain — ek row kabhi nahi dikhegi, ek do baar dikh sakti hai.' },
  ],
},

/* =====================================================================
   L4 — Cursor pagination  ⭐ MARQUEE
   ===================================================================== */
{
  id: 'cursor',
  icon: '🔑',
  title: 'Cursor Pagination — "Jahan Chhoda Tha, Wahin Se"',
  badge: 'Cursor Kushal',
  objectives: [
    'Keyset query: <code>WHERE (sort_col, id) &lt; (?, ?)</code>',
    'Cursor ko <b>opaque</b> kyun rakhna hai',
    'Index cursor se <b>match</b> karna chahiye',
    'Cursor ki imaandaar keemat — aur legacy API ka migration',
  ],
  lesson: [
    `<h3>📖 Sawaal hi badal do</h3>
     <p>Offset poochhta hai: <i>"2,42,86,350 rows ke BAAD wali 50 do"</i> —
     aur database ko ginna padta hai.</p>
     <p>Cursor poochhta hai: <i>"IS point ke baad wali 50 do"</i> — aur
     database seedha wahan pahunch jaata hai.</p>
     <pre>-- OFFSET: ginte hue chalo
SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 50 OFFSET 24286350;        → 2.4 crore rows chhui

-- KEYSET: seedha pahuncho
SELECT * FROM transactions
WHERE (created_at, id) &lt; ('2026-04-11 09:22:04', 8812304)
ORDER BY created_at DESC, id DESC
LIMIT 50;                        → 1 seek + 50 rows ⚡</pre>
     <p>Aur sabse badi baat: <b>page 1 aur page 4,85,728 ka cost bilkul
     same hai.</b> Kyunki dono mein ek seek aur 50 rows hain.</p>
     <p>Do cheezein dhyaan se dekho:</p>
     <p><b>1. Tuple comparison</b> — <code>(created_at, id) &lt; (?, ?)</code>,
     sirf <code>created_at &lt; ?</code> nahi. <code>id</code> tie-breaker hai:
     agar do transactions ka timestamp bilkul same hai (jo hota hai), toh
     bina tie-breaker ke ek row skip ho sakti hai ya do baar aa sakti hai.</p>
     <p><b>2. Index MATCH karna chahiye</b> — order bilkul wahi:
     <code>(filter columns…, sort column, tie-breaker)</code>.
     Warna DB phir bhi sort karega aur tumhara saara faayda chala jaayega.</p>`,
    `<h3>🔬 Cursor OPAQUE hona chahiye</h3>
     <p>Client ko cursor <b>banana</b> nahi chahiye. Server banata hai,
     server padhta hai:</p>
     <pre>{ "data": [...],
  "next_cursor": "eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNCwiZCI6ImRlc2MifQ",
  "has_more": true }

decode karne par:  { "t": "2026-04-11T09:22:04Z", "id": 8812304, "d": "desc" }</pre>
     <p><b>Opaque rakhne ke teen faayde:</b></p>
     <p>1. <b>Kal query strategy badal sakte ho</b> — sort column badlo,
     partition key add karo, clients ko pata bhi nahi chalega.</p>
     <p>2. <b>User anap-shanap cursor nahi bana sakta</b> — woh "page
     4,85,728" par jump karke mehengi query trigger nahi kar sakta.</p>
     <p>3. <b>Sort direction aur filter state</b> bhi cursor mein
     ja sakte hain, taaki server verify kar sake ki client ne beech mein
     filter nahi badla.</p>
     <p class="tip">🎯 Opaque ka matlab "encrypted" nahi hai — base64 ek
     security feature nahi hai. Matlab hai: <b>contract mein likha hai ki
     client isse parse nahi karega.</b> Agar chinta hai toh sign kar do.</p>`,
    `<h3>⚖️ Cursor ki keemat — imaandaari se</h3>
     <p>Cursor har jagah sahi jawab nahi hai. Teen asli nuksaan:</p>
     <table>
       <tr><th>Nuksaan</th><th>Kab matter karta hai</th><th>Kya karein</th></tr>
       <tr><td>"Page 500 par jao" nahi ho sakta</td><td>admin tables, reports</td><td>chhote datasets par offset theek hai; deep jump chahiye toh filter do (date range)</td></tr>
       <tr><td>Total count mushkil</td><td>"1-50 of 24M" wala UI</td><td><code>has_more</code>, approximate count</td></tr>
       <tr><td>Sort key unique + stable honi chahiye</td><td>"random sort", "relevance sort"</td><td>tie-breaker id add karo; sach mein random chahiye toh seed cursor mein rakho</td></tr>
     </table>
     <h3>🚚 Legacy API ka migration</h3>
     <p>Ek chalti hui API ko raat ko nahi badal sakte. 5 kadam:</p>
     <pre>1. next_cursor BHI bhejo    → page abhi bhi chalta rahe (dono support)
2. max page depth lagao     → page &gt; 1000 par 400 + saaf message
3. deep-page users dhoondo  → page depth par metric/alert
4. bade export ko async API → sync call ki jagah ek job
5. page hata do             → 400 + "cursor use karo"</pre>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🔑 Cursor par shift karo — aur prove karo',
      goal: 'Wahi 2.4 crore rows wali table. Pehle offset ka dard dobara dekho, phir sahi index banao, cursor pagination on karo, aur prove karo ki ab kitni bhi gehrai par cost same hai.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_CURSOR,
      success: allOf(T_CURSOR),
      successText: `Dekha? <b>rows examined 2.4 crore se 50 par aa gaya</b> — aur ab woh
        har page par 50 hi rahega.
        <br><br>Aur teen cheezein tumne saath mein kar li:
        <br>• Index cursor se <b>match</b> karta hai — <code>(created_at, id)</code>
        <br>• API ab <code>?page=</code> ko <b>400</b> deti hai — mehenga sawaal poochha hi nahi ja sakta
        <br>• Cursor <b>opaque</b> hai — kal tum query strategy badal sakte ho, clients nahi tootenge
        <br><br>Sabse achha optimization woh query hai jo <b>kabhi chali hi nahi</b>.`,
      hints: [
        'Pehle dard yaad karo: GET /api/v1/transactions?page=485728&limit=50',
        'Keyset ke liye index: CREATE INDEX ix_txn_keyset ON transactions(created_at, id)',
        'Ab API shift karo: sim set api.pagination cursor',
        'Cursor se maango: GET /api/v1/transactions?cursor=eyJ0IjoxfQ&limit=50',
        'Purana page param try karo: GET /api/v1/transactions?page=485728&limit=50',
        'Aur cursor ke andar jhaanko: cursor decode eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0',
      ],
    },
    {
      type: 'fill',
      title: 'Keyset query likho',
      instructions: 'Ek user ki transaction history, latest pehle. Blanks bharo.',
      template: `SELECT id, amount, status, created_at
FROM   transactions
WHERE  user_id = ?
  AND  ({0}, id) {1} (?, ?)
ORDER BY created_at DESC, {2} DESC
LIMIT  50;

-- Isko sahi index CHAHIYE:
CREATE INDEX ix ON transactions({3}, created_at, id);`,
      tokens: ['created_at', '<', 'id', 'user_id', '>', 'amount', 'status', '='],
      blanks: [
        { answer: 'created_at', explain: 'Sort column. Tuple comparison ka pehla member hamesha sort column hota hai.' },
        { answer: '<', explain: 'DESC order mein "iske baad wale" ka matlab hai "isse chhote". ASC hota toh <code>&gt;</code> lagta. Yahan ulta likhna sabse aam bug hai.' },
        { answer: 'id', explain: 'Tie-breaker. Do transactions ka timestamp bilkul same ho sakta hai — bina iske ek row skip ho jaayegi ya do baar aa jaayegi.' },
        { answer: 'user_id', explain: '<b>Index ka pehla column filter hona chahiye</b>, phir sort column, phir tie-breaker. Left-most prefix rule: agar <code>user_id</code> leading nahi hoga toh yeh index lagega hi nahi.' },
      ],
    },
    {
      type: 'terminal',
      title: '🚚 Legacy API ko bachao',
      goal: 'Ek purani offset API chal rahi hai aur usme 4000 clients hain — tum ise raat ko band nahi kar sakte. Guards lagao taaki nuksaan ruk jaaye jab tak migration poora na ho.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_MIGRATE,
      success: allOf(T_MIGRATE),
      successText: `Yeh asli duniya ka jawab hai. Tum API ko raat ko nahi badal sakte —
        par <b>nuksaan aaj hi rok sakte ho</b>.
        <br><br><code>maxPageDepth</code> ne sabse mehengi queries band ki,
        <code>maxLimit</code> ne ek request ko bahut bada hone se roka.
        Ab clients ko saaf 400 milta hai jisme likha hai ki kya karna hai —
        timeout ya 500 se hazaar guna behtar.
        <br><br>Agla kadam: page-depth par metric lagao, dekho kaun gehra ja raha hai,
        unse baat karo, aur bade exports ke liye async job API do.`,
      hints: [
        'Pehle dekho ki abhi kuch nahi rok raha: GET /api/v1/transactions?page=50000&limit=500',
        'Page depth baandho: sim set api.maxPageDepth 1000',
        'Limit baandho: sim set api.maxLimit 100',
        'Ab dobara try karo: GET /api/v1/transactions?page=50000&limit=50',
      ],
    },
    {
      type: 'hotspot',
      title: 'Cursor ke hisse',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'cursor',
      questions: [
        { q: 'Same timestamp wale rows gum na hon — iske liye kya chahiye?', target: 'tuple', explain: 'Tuple comparison with tie-breaker: (created_at, id) < (?, ?). Bina id ke, same timestamp wale rows skip ya duplicate ho sakte hain.' },
        { q: 'Cursor client se chhupa (opaque) kyun rakhte hain?', target: 'opaque', explain: 'Taaki kal tum query strategy badal sako aur clients na tootein — aur taaki user manmana cursor bana ke mehengi query trigger na kar sake.' },
        { q: 'Index ka kram kya hona chahiye?', target: 'idx', explain: '(filter columns, sort column, tie-breaker) — bilkul isi kram mein. Warna DB phir bhi sort karega aur cursor ka poora faayda chala jaayega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Cursor ki samajh',
      questions: [
        {
          q: 'Keyset query mein tie-breaker id kyun zaroori hai?',
          choices: [
            'Kyunki do rows ka sort value bilkul same ho sakta hai — bina unique tie-breaker ke ek row skip ho sakti hai ya do baar aa sakti hai',
            'Performance ke liye',
            'Index chahiye isliye',
            'Zaroori nahi hai, optional hai',
          ],
          answer: 0,
          explain: 'Agar 50 transactions ka <code>created_at</code> bilkul same hai aur page boundary unke beech mein padti hai, toh <code>created_at &lt; ?</code> se ya toh sab chhoot jaayenge ya sab dobara aayenge. Tie-breaker se ordering <b>total</b> ban jaati hai — har row ki ek hi jagah hoti hai.',
        },
        {
          q: 'Cursor pagination kis case mein SAHI nahi hai?',
          choices: [
            'Jab user ko sach mein "page 47 par jao" chahiye — jaise admin table jahan data chhota hai',
            'Jab data bahut zyada ho',
            'Jab sorting chahiye',
            'Jab filtering chahiye',
          ],
          answer: 0,
          explain: 'Cursor sirf next/prev deta hai. Agar dataset chhota hai (10,000 rows) aur user ko random page access chahiye, toh offset bilkul theek hai — wahan cost hi nahi hai. <b>Cursor ek ilaaj hai deep pagination ka, har pagination ka nahi.</b>',
        },
        {
          q: 'Cursor ko opaque rakhne ka sabse bada practical faayda?',
          choices: [
            'Tum baad mein internal query strategy badal sakte ho bina clients tode',
            'Woh chhota hota hai',
            'Woh secure hota hai',
            'Woh tez hota hai',
          ],
          answer: 0,
          explain: 'Yeh ek <b>API evolution</b> ka faisla hai. Agar client cursor parse karta hai toh woh tumhare internal schema par depend kar gaya — aur ab tum sort column ya partition key kabhi nahi badal sakte. Opaque cursor tumhe aazadi deta hai. (Base64 security nahi hai — woh sirf "isse mat chhuo" ka signal hai.)',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Cursor Pagination',
    instructions: 'Yahan tumhe design aur uske tradeoffs dono defend karne honge. 🎤',
    questions: [
      {
        q: '"Cursor pagination design karo transaction history ke liye."',
        choices: [
          'GET /transactions?cursor=<opaque>&limit=50. Query: WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 50, index (user_id, created_at, id) par. Cursor server banata hai, base64 mein, aur usme sort value + tie-breaker + direction hote hain',
          'GET /transactions?last_id=812&limit=50 — bas id se aage jao',
          'GET /transactions?page=1&limit=50 par index laga do',
          'GET /transactions?offset=0&limit=50 aur offset ko cap kar do',
        ],
        answer: 0,
        explain: 'Doosra option ek chhupa hua jaal hai: <code>last_id</code> tabhi kaam karega jab id ka order sort order jaisa ho. <code>created_at DESC</code> par sort karte hue id se paginate karna galat rows dega. Poora jawab mein <b>tuple comparison + matching index + opaque cursor</b> teenon hone chahiye.',
      },
      {
        q: '"Tumhare paas 4000 clients hain jo ?page= use kar rahe hain. Migration kaise karoge?"',
        choices: [
          'Dono support karo (response mein next_cursor bhi bhejo), max page depth lagao, page-depth par metric se dekho kaun gehra ja raha hai, bade exports ke liye async API do, phir page hata do',
          'Ek din announce karke page hata dunga',
          'Sirf naye clients ko cursor dunga, purane waise hi chalte rahenge',
          'Page ko internally cursor mein convert kar dunga',
        ],
        answer: 0,
        explain: 'Sabse achha jawab <b>kramik</b> hai aur beech mein bhi nuksaan rokta hai. Aakhri option (page ko internally convert karna) namumkin hai — page 485728 ka matlab hi "24M rows aage" hai, uske liye ginna hi padega. Aur "purane waise hi chalte rahenge" ka matlab hai ki problem kabhi khatam nahi hoga.',
      },
    ],
  },
  success: [
    'Keyset query tuple comparison ke saath likh sakte ho',
    'Cursor ke liye sahi index bana sakte ho',
    'Cursor ko opaque rakhne ki wajah bata sakte ho',
    'Legacy offset API ka migration plan bana sakte ho',
  ],
  homework: `Apni sabse badi list API par <code>?page=</code> ki depth ka metric lagao
    (histogram: page 1-10, 10-100, 100-1000, 1000+). Ek hafte baad dekho:
    kya sach mein koi page 1000 se aage jaata hai? Zyadatar teams ke liye jawab
    "sirf ek buggy script" hota hai — aur woh ek line ka fix hai.`,
  cards: [
    { front: 'Keyset query?', back: '<code>WHERE (created_at, id) &lt; (?, ?) ORDER BY created_at DESC, id DESC LIMIT 50</code>. Ek seek + 50 rows — <b>page 1 aur page 485728 ka cost same</b>.' },
    { front: 'Tie-breaker id kyun?', back: 'Do rows ka sort value same ho sakta hai. Bina unique tie-breaker ke page boundary par rows <b>skip ya duplicate</b> ho jaati hain. Tie-breaker ordering ko TOTAL banata hai.' },
    { front: 'Cursor ke liye index?', back: '<code>(filter columns…, sort column, tie-breaker)</code> — bilkul isi kram mein. Warna DB phir bhi sort karega aur poora faayda chala jaayega.' },
    { front: 'Cursor opaque kyun?', back: 'Kal <b>query strategy badal sako</b> bina clients tode. Saath hi user manmana cursor bana ke mehengi query trigger nahi kar sakta. (Base64 security nahi hai.)' },
    { front: 'Cursor kab SAHI nahi?', back: 'Jab dataset chhota ho aur user ko sach mein random page access chahiye (admin tables). Cursor <b>deep</b> pagination ka ilaaj hai, har pagination ka nahi.' },
    { front: 'Legacy migration ke 5 kadam?', back: '1. next_cursor bhi bhejo 2. max page depth 3. page-depth metric 4. bade export ke liye async API 5. page hata do.' },
  ],
},

/* =====================================================================
   L5 — Filtering, sorting, sparse fields
   ===================================================================== */
{
  id: 'filtering',
  icon: '🔍',
  title: 'Filter · Sort · Fields — Har Param ek Vaada Hai',
  badge: 'Query Gatekeeper',
  objectives: [
    'Bounded query surface — allow-list, SQL-in-querystring nahi',
    'Ek filter <b>zaroori</b> banana (tenant-scoped data ka sona)',
    'Sparse fieldsets aur covering index ka rishta',
    'Sorting par bhi allow-list — warna full scan',
  ],
  lesson: [
    `<h3>📖 Wahi bimari, naya roop</h3>
     <p>Deep pagination ka sabak yaad hai? <b>API ne user ko mehenga sawaal
     poochhne diya.</b> Filtering mein bilkul wahi galti hoti hai —
     bas dikhti kam hai.</p>
     <p>"Client ko flexibility do, har column par filter allow karo":</p>
     <pre>15 filterable columns → 2¹⁵ = 32,768 possible combinations</pre>
     <p>Tum 32,768 indexes nahi bana sakte. Matlab koi na koi client ek din
     aisi combination bhejega jo <b>full table scan</b> karti hai. Aur woh
     din production incident ka din hoga.</p>
     <p><b>Bounded query surface ka matlab:</b></p>
     <table>
       <tr><th>Niyam</th><th>Kyun</th></tr>
       <tr><td><b>Filters ki allow-list</b></td><td>sirf woh columns jinke liye index hai</td></tr>
       <tr><td><b>Sort ki allow-list</b></td><td><code>?sort=notes</code> par full scan + filesort</td></tr>
       <tr><td><b>Ek filter zaroori</b></td><td><code>/transactions</code> bina <code>user_id</code> ke = 400. Multi-tenant data mein yeh sona hai — har query apne aap bounded ho jaati hai</td></tr>
       <tr><td><b>default limit + max limit</b></td><td>default 20, max 100. Dono chahiye — default na ho toh kuch clients sab maang lenge</td></tr>
     </table>
     <p class="tip">🎯 <b>Har query param ek vaada hai</b> ki tum use sasta
     serve kar sakte ho. Jo vaada nibha na sako, woh param mat do —
     baad mein hataana bahut mushkil hai.</p>`,
    `<h3>🔬 Sparse fieldsets — chhota faayda, bada faayda</h3>
     <pre>GET /transactions?fields=id,amount,created_at</pre>
     <p>Pehla faayda saaf hai: kam bytes network par.</p>
     <p>Doosra faayda bada hai: agar <code>(user_id, created_at, id, amount)</code>
     par index hai, toh yeh query <b>index se hi poori ho jaati hai</b> —
     table ko chhuna hi nahi padta. Ise <b>covering index</b> kehte hain,
     aur woh 2-3x tez hota hai kyunki random row lookups bach jaate hain.</p>
     <p>Teesra faayda sabse chhupa hua hai: <code>SELECT *</code> tumhe
     schema se <b>baandh</b> deta hai. Ek din koi <code>notes TEXT</code>
     column add karega aur tumhari list API ka payload 40x ho jaayega —
     bina kisi code change ke.</p>
     <h3>⚠️ Filter syntax — pragmatic raho</h3>
     <pre>✅ ?status=pending&merchant=amazon        saaf, indexable
✅ ?created_after=2026-01-01              range — index ka aakhri column
✅ ?amount_min=100&amount_max=500         explicit
✅ ?sort=-created_at                       minus = descending

❌ ?filter=amount>100 AND status='x'      SQL-in-querystring
❌ ?q={"$or":[{"a":1},{"b":2}]}            MongoDB injection ka nyota
❌ ?sort=random()                          poori table sort</pre>
     <p>Aakhri do sirf khatarnak nahi hain — woh <b>unbounded</b> hain.
     Tum kabhi guarantee nahi kar sakte ki woh sasti hongi.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Yeh query param dena chahiye?',
      instructions: 'Har param ko sahi bin mein daalo.',
      bins: [
        { id: 'yes', label: '✅ De do' },
        { id: 'no', label: '❌ Mat do' },
      ],
      items: [
        { text: '?status=pending — indexed enum column', bin: 'yes', explain: 'Index hai, cardinality theek hai, bounded hai. Perfect filter.' },
        { text: '?filter=amount>100 AND status=\'x\'', bin: 'no', explain: 'SQL-in-querystring. Tum kabhi guarantee nahi kar sakte ki yeh sasti hogi — aur injection ka darwaza bhi khula hai.' },
        { text: '?fields=id,amount,status', bin: 'yes', explain: 'Sparse fieldset — kam bytes, aur covering index ka rasta khulta hai. Saath hi schema changes se bhi bachata hai.' },
        { text: '?sort=notes — lamba TEXT column, koi index nahi', bin: 'no', explain: 'Full scan + filesort. Sort par bhi allow-list honi chahiye: sirf indexed columns.' },
        { text: '?created_after=2026-01-01', bin: 'yes', explain: 'Range filter — composite index ka aakhri column ban sakta hai. Bounded aur indexable.' },
        { text: '?q={"$where":"this.amount>100"}', bin: 'no', explain: 'Yeh code execution hai, filter nahi. Mongo ke $where jaise operators ko API surface par kabhi expose mat karo.' },
        { text: '?limit=50 (default 20, max 100)', bin: 'yes', explain: 'Default AUR max dono hain — yahi sahi tareeka hai. Sirf max se kaam nahi chalta.' },
        { text: '?limit=1000000', bin: 'no', explain: 'Unbounded. Ek request se poora DB memory mein aa jaayega. maxLimit lagao.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Query surface baandho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'filtering',
      questions: [
        { q: 'Multi-tenant data mein sabse taakatwar guard kaunsa hai?', target: 'require', explain: 'Ek filter ZAROORI banana — jaise user_id ya tenant_id. Isse har query apne aap bounded ho jaati hai, aur koi bhi accidentally poori table nahi chhu sakta.' },
        { q: '15 filterable columns ka asli problem kya hai?', target: 'anyfilter', explain: '32,768 combinations — tum har ek ke liye index nahi bana sakte. Koi na koi client aisi combination bhejega jo full scan karti hai.' },
        { q: 'Filters ko kaise baandhte hain?', target: 'allow', explain: 'Allow-list — sirf woh filters jinke liye index maujood hai. Deny-list kabhi kaam nahi karti kyunki naye columns apne aap allowed ho jaate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Query surface ki samajh',
      questions: [
        {
          q: '"Har column par filter allow karte hain, flexible API hai" — problem?',
          choices: [
            'n columns = 2ⁿ combinations. Tum har ek ke liye index nahi bana sakte, isliye kuch combinations hamesha full scan karengi',
            'Koi problem nahi, flexibility achhi hai',
            'Sirf documentation lambi ho jaayegi',
            'Client confuse ho jaayega',
          ],
          answer: 0,
          explain: 'Yeh deep pagination wali hi bimari hai: <b>API ne ek mehenga sawaal poochhne ki ijaazat de di</b>. Aur combinatorics tumhare khilaf hai — 15 columns par 32,768 combinations hain. Allow-list hi ek raasta hai.',
        },
        {
          q: '?fields=id,amount ka sabse bada performance faayda?',
          choices: [
            'Query covering index se poori ho sakti hai — table chhuna hi nahi padta, random row lookups bach jaate hain',
            'Kam bytes network par jaate hain',
            'JSON parse tez hota hai',
            'Cache mein zyada entries aati hain',
          ],
          answer: 0,
          explain: 'Bytes bachana chhota faayda hai. Bada faayda yeh hai ki agar saare maange gaye columns index mein hain, toh DB <b>sirf index padh ke</b> jawab de deta hai — heap tak jaana hi nahi padta. Yeh aksar 2-3x tez hota hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Query Design',
    instructions: 'Yeh sawaal aksar "flexibility" ke jaal mein le jaata hai. 🎤',
    questions: [
      {
        q: '"Client bolta hai use har field par filter karna hai. Kya karoge?"',
        choices: [
          'Poochhunga ki asli use-case kaunse 3-4 filters hain. Un par index banake allow-list dunga. Sach mein arbitrary query chahiye toh search engine (Elasticsearch) ya alag analytics API — transactional API par nahi',
          'Sab filters allow kar dunga, client ki zaroorat hai',
          'GraphQL use kar lunga',
          'Sab filters allow karke query timeout laga dunga',
        ],
        answer: 0,
        explain: 'Sahi jawab pehle <b>asli zaroorat</b> poochhta hai — aksar 20 "chahiye" wale filters mein se 3 hi use hote hain. Aur GraphQL isse theek nahi karta; woh wahi unbounded problem ek naye layer par le aata hai (isliye GraphQL mein query cost analysis hoti hai).',
      },
    ],
  },
  success: [
    'Bounded query surface design kar sakte ho',
    'Allow-list vs deny-list ka farak jaante ho',
    'Sparse fieldsets aur covering index ka rishta samjha sakte ho',
    'Ek zaroori filter se query ko bounded bana sakte ho',
  ],
  homework: `Apni list API ke saare query params ginno. Har ek ke saamne likho:
    "iske liye index hai?" Jitne "nahi" hain, utni queries ek din full scan karengi.`,
  cards: [
    { front: 'Har column par filter — problem?', back: 'n columns = <b>2ⁿ combinations</b>. 15 columns = 32,768. Har ek ke liye index namumkin hai — kuch combinations hamesha full scan karengi.' },
    { front: 'Bounded query surface ke 4 niyam?', back: '<b>1.</b> Filters ki allow-list <b>2.</b> Sort ki allow-list <b>3.</b> Ek filter zaroori (tenant_id) <b>4.</b> default limit + max limit.' },
    { front: 'Sparse fieldsets ka bada faayda?', back: '<b>Covering index</b> — saare maange gaye columns index mein hon toh table chhuna hi nahi padta. 2-3x tez. (Bytes bachana chhota faayda hai.)' },
    { front: 'Query param ka usool?', back: 'Har param ek <b>vaada</b> hai ki tum use sasta serve kar sakte ho. Jo vaada nibha na sako, woh param mat do — baad mein hataana bahut mushkil hai.' },
  ],
},

/* =====================================================================
   L6 — Versioning
   ===================================================================== */
{
  id: 'versioning',
  icon: '🏷️',
  title: 'Versioning — Client Tumhare Saath Deploy Nahi Hota',
  badge: 'Compat Keeper',
  objectives: [
    'Kaunse changes <b>breaking</b> hain (kuch chaunkane wale hain)',
    'URL vs header versioning ka tradeoff',
    'Additive changes se version hi na badalna pade',
    'Deprecation ka sahi tareeka',
  ],
  lesson: [
    `<h3>📖 Sabse zaroori baat</h3>
     <p>Web app deploy karo — sab users turant naya code chala rahe hain.
     API deploy karo — <b>clients wahi purana code chala rahe hain</b>,
     aur shayad saalon tak chalaenge. Ek mobile app version jo 2 saal purana
     hai, woh abhi bhi tumhari API call kar raha hai.</p>
     <p>Isliye API mein "bas theek kar dete hain" nahi hota.</p>
     <table>
       <tr><th>✅ Safe (additive)</th><th>❌ Breaking</th></tr>
       <tr><td>naya <b>optional</b> field add</td><td>field hataana ya rename</td></tr>
       <tr><td>naya endpoint add</td><td>type badalna (<code>"5"</code> → <code>5</code>)</td></tr>
       <tr><td>naya optional query param</td><td>optional ko required banana</td></tr>
       <tr><td>response mein naya field</td><td>default behaviour badalna</td></tr>
       <tr><td>error message ka text</td><td>error <b>code</b> ya format badalna</td></tr>
     </table>
     <p>Do cheezein log aksar bhool jaate hain:</p>
     <p><b>1. Enum mein nayi value add karna breaking ho sakta hai.</b>
     Agar client ka code <code>switch(status)</code> karta hai aur
     <code>default: throw</code> hai, toh nayi value uska crash hai.
     Isliye din 1 se document karo: "unknown values ko gracefully handle karo".</p>
     <p><b>2. Default behaviour badalna sabse chhupa hua breaking change hai.</b>
     Agar <code>?limit</code> ka default 20 se 50 kar do, toh kisi ka
     pagination loop toot sakta hai — aur uska code bilkul waisa hi hai.</p>`,
    `<h3>🔬 URL vs header — aur teesra raasta</h3>
     <table>
       <tr><th></th><th>URL <code>/v1/</code></th><th>Header</th></tr>
       <tr><td>Browser mein test</td><td>✅ paste karo, chal gaya</td><td>❌ curl chahiye</td></tr>
       <tr><td>CDN caching</td><td>✅ URL hi key hai</td><td>⚠️ Vary header chahiye</td></tr>
       <tr><td>Logs mein dikhta hai</td><td>✅</td><td>⚠️ log karna padega</td></tr>
       <tr><td>URL saaf rehti hai</td><td>❌ har resource duplicate</td><td>✅</td></tr>
       <tr><td>Granular (per-resource)</td><td>❌</td><td>✅</td></tr>
     </table>
     <p>Practical salah: <b>URL versioning</b> chuno agar public API hai
     (debuggability jeet jaati hai), <b>header</b> agar internal hai aur
     tumhare paas achhi tooling hai. Par sabse zaroori:</p>
     <p class="tip">🎯 <b>Sabse achha version woh hai jo tum kabhi banao hi
     nahi.</b> v2 banana ek din ka kaam hai; v1 ko <b>hamesha</b> chalate
     rehna saalon ka boj hai. Har change se pehle poochho: "ise additive
     bana sakte hain?"</p>
     <h3>📉 Deprecation kaise karein</h3>
     <pre>1. Naya tareeka do, purana chalta rahe
2. Response mein signal:  Deprecation: true
                          Sunset: Sat, 01 Nov 2026 00:00:00 GMT
                          Link: </docs/migrate>; rel="deprecation"
3. Usage metrics dekho — kaun abhi bhi purana use kar raha hai
4. Un clients se SEEDHA baat karo (email, dashboard warning)
5. Traffic ~0 hone par hatao — pehle "brownout" (roz 5 min band) se test karo</pre>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Breaking change ya nahi?',
      instructions: 'Har change ko sahi bin mein daalo.',
      bins: [
        { id: 'safe', label: '✅ Safe' },
        { id: 'break', label: '❌ Breaking' },
      ],
      items: [
        { text: 'Response mein naya field "currency" add kiya', bin: 'safe', explain: 'Purane clients use ignore kar denge. Additive changes hamesha safe hain — yahi asli hunar hai.' },
        { text: '"total_amount" ko "amount" rename kiya', bin: 'break', explain: 'Purane clients ko field milega hi nahi. Sahi tareeka: dono bhejo, purane ko deprecate karo, phir mahino baad hatao.' },
        { text: 'amount ko "4999" (string) se 4999 (number) kiya', bin: 'break', explain: 'Type change breaking hai chahe value same lage. Strict parsers (Swift, Kotlin, TypeScript) turant crash karenge.' },
        { text: 'Naya optional query param ?include=refunds add kiya', bin: 'safe', explain: 'Default purana behaviour hai, isliye koi purana client affected nahi.' },
        { text: 'limit ka default 20 se 50 kiya', bin: 'break', explain: 'Sabse chhupa hua breaking change. Kisi ka pagination loop, kisi ka rate limit budget toot sakta hai — aur unka code bilkul waisa hi hai.' },
        { text: 'status enum mein nayi value "on_hold" add ki', bin: 'break', explain: 'Chaunkane wala par sach: agar client switch/default:throw karta hai toh yeh crash hai. Isliye din 1 se document karo ki unknown values handle karni hain.' },
        { text: 'Error message ka text theek kiya (code wahi)', bin: 'safe', explain: 'Message insaan ke liye hai, code machine ke liye. Isliye clients ko HAMESHA code par switch karna chahiye, message par kabhi nahi.' },
        { text: 'Optional field "email" ko required banaya', bin: 'break', explain: 'Purane requests ab 400 honge. Naye required fields sirf naye endpoints par aa sakte hain.' },
      ],
    },
    {
      type: 'order',
      title: 'Deprecation ka sahi kram',
      instructions: 'Ek purana field hataane ke kadam sahi order mein.',
      steps: [
        { text: 'Naya field add karo — purana bhi bhejte raho', explain: 'Expand phase. Ab dono maujood hain, koi client nahi toota. Yeh bilkul database ke expand-contract migration jaisa hai.' },
        { text: 'Docs update karo + Deprecation/Sunset headers bhejo', explain: 'Machine-readable signal. Achhe clients monitoring laga sakte hain. Sunset date se log ko plan karne ka waqt milta hai.' },
        { text: 'Usage metrics lagao — kaun purana field use kar raha hai', explain: 'Bina data ke tum kabhi confident nahi honge. Yeh kadam skip karne se log saalon tak "shayad koi use kar raha hoga" mein atke rehte hain.' },
        { text: 'Bache hue clients se seedha baat karo', explain: 'Email, dashboard warning, ya account manager. Announcement blog post kaafi nahi hota — koi nahi padhta.' },
        { text: 'Brownout — roz 5 minute ke liye field hatao', explain: 'Chalak technique: jo clients abhi bhi depend karte hain unhe controlled window mein error dikhega. Woh turant pata chal jaate hain — bina permanent damage ke.' },
        { text: 'Traffic ~0 hone par field hata do', explain: 'Contract phase. Ab safe hai kyunki tumhare paas DATA hai, umeed nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Versioning ki samajh',
      questions: [
        {
          q: 'Sabse chhupa hua breaking change kaunsa hai?',
          choices: [
            'Default behaviour badalna — jaise ?limit ka default 20 se 50 karna',
            'Field hataana',
            'Naya endpoint add karna',
            'Error message ka text badalna',
          ],
          answer: 0,
          explain: 'Field hataana <b>saaf</b> breaking hai — sab jaante hain. Default badalna chhupa hua hai: client ka code bilkul waisa hi hai, request bilkul waisi hi hai, par behaviour badal gaya. Aisi bugs debug karna sabse mushkil hota hai.',
        },
        {
          q: 'Public API ke liye URL versioning ka sabse bada faayda?',
          choices: [
            'Debuggability — browser mein paste karo aur chal jaata hai, logs mein dikhta hai, CDN cache seedha kaam karta hai',
            'Woh zyada RESTful hai',
            'Woh kam bandwidth leta hai',
            'Header versioning kaam hi nahi karta',
          ],
          answer: 0,
          explain: 'Public API mein <b>developer experience</b> sabse zyada matter karta hai. <code>/v1/</code> dikhta hai, share hota hai, curl mein aasan hai, aur CDN ke liye URL hi cache key hai. Header versioning technically zyada elegant hai par practically zyada friction deta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Versioning',
    instructions: 'Yahan "kabhi mat todo" wali soch dikhani hai. 🎤',
    questions: [
      {
        q: '"Tumhe response ka ek field rename karna hai. Kaise karoge?"',
        choices: [
          'Naya field add karke DONO bhejunga, purane ko Deprecation/Sunset headers se mark karunga, usage metrics dekhunga, bache hue clients se baat karunga, phir hataunga',
          'Rename karke changelog mein likh dunga',
          'v2 bana dunga',
          'Ek mahine ka notice de ke rename kar dunga',
        ],
        answer: 0,
        explain: 'Yeh database ka <b>expand-contract</b> pattern hai, API par. v2 banana bhi kaam karega par bahut mehenga hai — ek field ke liye poora naya version maintain karna? Aur "changelog mein likh dunga" ka matlab hai ki tum production incident ka intezaar kar rahe ho.',
      },
      {
        q: '"Kab v2 banaoge?"',
        choices: [
          'Jab itne breaking changes ek saath chahiye hon ki additive rasta bacha hi na ho — jaise poora resource model badalna. Ek-do fields ke liye kabhi nahi',
          'Har bade release par',
          'Saal mein ek baar',
          'Jab bhi koi breaking change chahiye',
        ],
        answer: 0,
        explain: 'Har version ek <b>hamesha ka maintenance boj</b> hai — v1 ko saalon tak chalana padega. Isliye versions ko "batch" karo: jab kai fundamental changes ikattha ho jaayein tab ek v2, warna sab kuch additive.',
      },
    ],
  },
  success: [
    'Breaking vs safe changes pehchaan sakte ho',
    'Enum aur default-change wale chhupe hue breaking changes jaante ho',
    'URL vs header versioning ka tradeoff bata sakte ho',
    'Expand-contract se field rename kar sakte ho',
  ],
  homework: `Apni API ka aakhri release note dekho. Har change ke saamne likho "breaking?".
    Phir dekho ki kya koi aisa change tha jo tumne "chhota" samajh ke kar diya —
    default value, enum, ya error format.`,
  cards: [
    { front: 'Safe (additive) changes?', back: 'Naya <b>optional</b> field · naya endpoint · naya optional param · error <b>message</b> ka text. Purane clients ignore kar dete hain.' },
    { front: 'Chhupe hue breaking changes?', back: '<b>Default behaviour badalna</b> (limit 20→50) · <b>enum mein nayi value</b> (client ka switch/default:throw) · <b>type badalna</b> ("5"→5).' },
    { front: 'URL vs header versioning?', back: '<b>URL</b> (/v1/) = browser-testable, CDN-friendly, logs mein dikhta hai → public API. <b>Header</b> = saaf URL, granular → internal API.' },
    { front: 'Field rename kaise?', back: '<b>Expand-contract:</b> dono bhejo → Deprecation/Sunset headers → usage metrics → clients se baat → brownout → hatao.' },
    { front: 'v2 kab banao?', back: 'Jab itne breaking changes chahiye ki additive rasta bache hi na. Har version <b>hamesha ka</b> maintenance boj hai — batch karo.' },
  ],
},

/* =====================================================================
   L7 — Error contracts
   ===================================================================== */
{
  id: 'errors',
  icon: '🚨',
  title: 'Error Contract — Machine Bhi Padhe, Insaan Bhi',
  badge: 'Error Artisan',
  objectives: [
    'Har error mein: stable code, insaani message, field, trace_id',
    'RFC 9457 problem+json',
    'Error ka asli sawaal: <b>"client ab kya kare?"</b>',
    'Internal details leak na karna',
  ],
  lesson: [
    `<h3>📖 Ek error ko teen sawaalon ka jawab dena chahiye</h3>
     <pre>1. Kya hua?                  → status code + stable code
2. Client ab kya kare?       → retry? theek karo? haar maano?
3. Debug kaise karein?       → trace_id</pre>
     <p>Jo aksar milta hai:</p>
     <pre>200 OK
{ "error": "something went wrong" }</pre>
     <p>Yeh teenon sawaalon mein fail hai. Aur status 200 hone se
     har HTTP client, har retry library, har monitoring tool ko lagega ki
     sab theek hai.</p>
     <p>RFC 9457 (problem details) ka shape:</p>
     <pre>422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type":     "/errors/validation-failed",   ← STABLE machine code
  "title":    "Validation failed",           ← chhota insaani title
  "status":   422,
  "detail":   "amount 0 se bada hona chahiye",
  "instance": "/orders/812",
  "trace_id": "abc123",                      ← support → logs
  "errors": [
    { "field": "amount", "code": "min", "min": 1 }
  ]
}</pre>
     <p><b>Sabse zaroori field <code>type</code> hai.</b> Client usi par
     switch karega. Message kabhi bhi badal sakta hai (translation, wording),
     par code <b>kabhi nahi</b> — woh contract ka hissa hai.</p>`,
    `<h3>🔬 Do galtiyan jo mehengi padti hain</h3>
     <p><b>1. Internal details leak karna</b></p>
     <pre>❌ 500 { "error": "ERROR: duplicate key value violates unique
        constraint \\"users_email_key\\" DETAIL: Key (email)=(a@b.com)
        already exists. at OrderService.java:142" }</pre>
     <p>Isme tumne bata diya: DB kaunsa hai, table ka naam, constraint ka
     naam, aur ki woh email registered hai (user enumeration). Sahi jawab:</p>
     <pre>✅ 409 { "type": "/errors/email-taken", "title": "Email pehle se registered hai",
        "status": 409, "trace_id": "abc123" }</pre>
     <p>Poora stack trace <b>logs</b> mein jaayega, response mein nahi.
     <code>trace_id</code> dono ko jodta hai.</p>
     <p><b>2. Sab errors ek saath dena bhool jaana</b></p>
     <pre>❌ { "error": "email invalid" }        → user theek karta hai
   { "error": "password too short" }  → phir se
   { "error": "phone invalid" }       → phir se… (3 round trips)

✅ { "errors": [ {"field":"email",...}, {"field":"password",...},
                {"field":"phone",...} ] }   → ek hi baar mein sab</pre>
     <p class="tip">🎯 <code>trace_id</code> ek field hai jo ghanton bachata
     hai. User screenshot bhejta hai → tum us id se seedha logs mein
     jaate ho. Iske bina support ticket ek jasoosi novel ban jaata hai.</p>`,
  ],
  stages: [
    {
      type: 'fill',
      title: 'Ek achha error response likho',
      instructions: 'Payment fail hua kyunki balance kam tha. Blanks bharo.',
      template: `HTTP/1.1 {0} Unprocessable Entity
Content-Type: application/{1}+json

{
  "type":     "/errors/insufficient-funds",
  "title":    "Balance kam hai",
  "status":   422,
  "detail":   "Account mein ₹1,200 hai, ₹4,999 chahiye",
  "{2}": "req_8f2a91c",
  "errors": [
    { "{3}": "amount", "code": "insufficient_funds" }
  ]
}`,
      tokens: ['422', 'problem', 'trace_id', 'field', '400', 'json', 'request_id', 'name'],
      blanks: [
        { answer: '422', explain: 'Request parse ho gayi aur structure theek tha — sirf business rule fail hua. 400 tab jab request hi malformed ho.' },
        { answer: 'problem', explain: '<code>application/problem+json</code> — RFC 9457 ka media type. Isse clients ko pata chalta hai ki error ka shape standard hai.' },
        { answer: 'trace_id', explain: 'Support ticket se seedha logs tak. Yeh ek field debugging mein ghante bachata hai.' },
        { answer: 'field', explain: 'Kaunsa field galat tha — taaki UI usi input ke neeche error dikha sake, poore form par nahi.' },
      ],
    },
    {
      type: 'bins',
      title: 'Yeh error response theek hai?',
      instructions: 'Har response ko sahi bin mein daalo.',
      bins: [
        { id: 'good', label: '✅ Theek' },
        { id: 'bad', label: '❌ Problem hai' },
      ],
      items: [
        { text: '200 { "error": "not found" }', bin: 'bad', explain: 'Status jhooth bol raha hai. Har HTTP client, retry library aur monitoring tool ko lagega sab theek hai. 404 bhejo.' },
        { text: '409 { "type": "/errors/email-taken", "trace_id": "abc" }', bin: 'good', explain: 'Sahi status, stable machine code, aur trace_id. Client ise handle kar sakta hai.' },
        { text: '500 { "error": "duplicate key violates users_email_key at Service.java:142" }', bin: 'bad', explain: 'Do problem: galat status (yeh 409 hai, 500 nahi) aur internal details leak — DB schema, file path, aur user enumeration.' },
        { text: '422 { "errors": [ 3 field errors ek saath ] }', bin: 'good', explain: 'Saare validation errors ek baar mein. User ek hi baar mein sab theek kar sakta hai — teen round trips nahi.' },
        { text: '429 (koi Retry-After header nahi)', bin: 'bad', explain: 'Client ko pata hi nahi kab dobara try kare — woh turant maarega. Retry-After ke bina rate limit ka aadha maqsad khatam.' },
        { text: '503 + Retry-After: 30 + trace_id', bin: 'good', explain: 'Overload ka sahi jawab. Client jaanta hai ki retry karna hai aur kab.' },
        { text: '400 "Internal Server Error occurred"', bin: 'bad', explain: 'Status aur message ek doosre ka virodh kar rahe hain. Client ko samajh hi nahi aayega ki uski galti hai ya server ki.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Error contract ke hisse',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'errors',
      questions: [
        { q: 'Client kis field par switch karega?', target: 'code', explain: 'Stable machine code (type/code). Message kabhi bhi badal sakta hai — translation, wording — par code contract ka hissa hai.' },
        { q: 'Support ticket se logs tak pahunchne ke liye?', target: 'trace', explain: 'trace_id. User screenshot bhejta hai, tum seedha us id se logs mein jaate ho. Iske bina har ticket ek jasoosi kaam hai.' },
        { q: 'Form par sahi input ke neeche error dikhane ke liye?', target: 'field', explain: 'Field name. Iske bina UI ko poore form par ek generic error dikhana padta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Errors',
    instructions: 'Error design aksar poochha nahi jaata — isliye achha jawab yaad reh jaata hai. 🎤',
    questions: [
      {
        q: '"Error response mein kya hona chahiye?"',
        choices: [
          'Sahi status code, stable machine code (client isi par switch kare), insaani message developers ke liye, kaunsa field galat tha, aur trace_id. Internal details kabhi nahi — woh logs mein',
          'Error message aur stack trace',
          'Bas ek error code',
          'HTTP status kaafi hai',
        ],
        answer: 0,
        explain: 'Sabse achha jawab batata hai ki har hissa <b>kiske liye</b> hai: status → HTTP layer, code → client ka code, message → developer, field → UI, trace_id → support. Aur stack trace response mein bhejna security issue hai.',
      },
      {
        q: '"Ek user ne signup kiya par email already exists. Kya bhejoge?"',
        choices: [
          'Depends: agar API authenticated/internal hai toh 409 with /errors/email-taken. Agar public signup hai toh soch samajh ke — "email exists" batana user enumeration deta hai, isliye kai jagah generic message + email par confirmation bheja jaata hai',
          '409 Conflict, hamesha',
          '400 Bad Request',
          '500 Internal Server Error',
        ],
        answer: 0,
        explain: 'Yeh jawab isliye achha hai ki woh <b>security tradeoff</b> pehchaanta hai. Public signup par "yeh email registered hai" batana attacker ko bata deta hai ki kaunse emails tumhare paas hain. Kai products isliye "hum ne email bhej diya" bolte hain chahe account ho ya na ho.',
      },
    ],
  },
  success: [
    'RFC 9457 problem+json shape jaante ho',
    'Har error ke hisse ka maqsad bata sakte ho',
    'Internal details leak nahi karte',
    'Saare validation errors ek saath bhejte ho',
  ],
  homework: `Apni API se 5 alag errors trigger karo. Dekho: kya sabka format same hai?
    Kya sabme stable code hai? Kya kisi mein stack trace ya SQL leak ho raha hai?
    Aur kya koi 200 ke saath error bhej raha hai?`,
  cards: [
    { front: 'Error ke 3 sawaal?', back: '<b>1.</b> Kya hua (status + stable code) <b>2.</b> Client ab kya kare (retry/fix/haar maano) <b>3.</b> Debug kaise (trace_id).' },
    { front: 'Client kis par switch kare?', back: '<b>Stable machine code</b> (<code>type</code>), message par kabhi nahi. Message translate/reword ho sakta hai; code contract hai.' },
    { front: 'Internal details leak?', back: 'DB constraint naam, table naam, file:line, aur "email exists" (user enumeration) — sab response se BAAHAR. Logs mein, aur <code>trace_id</code> se jodo.' },
    { front: 'Validation errors kaise bhejein?', back: '<b>Saare ek saath</b> — <code>errors: [{field, code}, ...]</code>. Ek-ek karke bhejne se user ko 3 round trips karni padti hain.' },
  ],
},

/* =====================================================================
   L8 — Idempotency keys
   ===================================================================== */
{
  id: 'idempotency',
  icon: '♻️',
  title: 'Idempotency Keys — Double Charge se Bachao',
  badge: 'Replay Guard',
  objectives: [
    'Client kabhi nahi jaan sakta ki request pahunchi ya jawab kho gaya',
    'Key <b>client</b> banata hai, server unique constraint se store karta hai',
    'Same key + alag body = <b>409</b>',
    'Kahan zaroori hai, kahan nahi',
  ],
  lesson: [
    `<h3>📖 Ek network timeout, do charge</h3>
     <pre>client → POST /payments (₹4,999)
                              server ne charge kar diya ✅
       ←  … timeout, jawab kho gaya 📵
client sochta hai: "shayad gaya hi nahi tha"
client → POST /payments (₹4,999)
                              DOOSRA charge 💀</pre>
     <p>Yahan client ne kuch galat nahi kiya. <b>Woh jaan hi nahi sakta</b>
     ki request pahunchi nahi thi ya jawab kho gaya — dono bilkul ek jaise
     dikhte hain. Aur agar woh retry na kare, toh asli failures par payment
     kabhi nahi hoga.</p>
     <p>Isliye retry <b>zaroori</b> hai, aur duplicate protection bhi.</p>
     <pre>client → POST /payments
          Idempotency-Key: 7f3a-...-91c    ← client ne banayi
                              201 Created, key store hui ✅
       ←  … timeout 📵
client → POST /payments
          Idempotency-Key: 7f3a-...-91c    ← WAHI key
                              200 OK + x-idempotent-replay: true
                              (naya charge NAHI hua) 🎉</pre>`,
    `<h3>🔬 Char cheezein sahi karni hoti hain</h3>
     <p><b>1. Key CLIENT banata hai.</b> Har <i>logical operation</i> ke
     liye ek UUID. Server banayega toh retry par nayi key ban jaayegi aur
     poora point khatam. Client key tab banata hai jab user "Pay" dabata
     hai — retry par wahi key jaati hai.</p>
     <p><b>2. UNIQUE constraint par store karo, app check par nahi.</b></p>
     <pre>❌ SELECT key... if not found → INSERT     (race condition!)
✅ INSERT ... ON CONFLICT DO NOTHING       (atomic)</pre>
     <p>Do requests ek saath aa sakti hain (woh toh puri baat hi hai).
     App-level check dono ko "nahi mili" bolega. Sirf DB constraint
     guarantee de sakta hai.</p>
     <p><b>3. Same key + ALAG body = 409 Conflict.</b> Agar client ne wahi
     key alag amount ke saath bheji, toh yeh uska bug hai. Chup-chaap purana
     jawab lauta dena ek chhupa hua bug ban jaata hai — user ko lagega ₹100
     ka payment hua jabki ₹4,999 wala jawab mila.</p>
     <p><b>4. TTL rakho — 24 ghante se 7 din.</b> Hamesha rakhne se table
     anant badhegi. Zyadatar payment providers 24h rakhte hain.</p>
     <h3>⚠️ Response bhi store karo, sirf key nahi</h3>
     <p>Replay par tumhe <b>wahi jawab</b> lautana hai jo pehli baar diya
     tha — payment id ke saath. Sirf "ho chuka hai" bolne se client ke paas
     payment id nahi aayega.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '♻️ Double charge banao, phir roko',
      goal: 'Payments API par idempotency nahi hai. Pehle khud double charge banao, phir idempotency on karke prove karo ki ab nahi ho sakta.',
      sys: SD.sys.payments(),
      tasks: T_IDEM,
      success: allOf(T_IDEM),
      successText: `Dhyaan do ki pehli do requests mein <b>do alag payment IDs</b> bane —
        yahi asli duniya ka double charge hai.
        <br><br>Idempotency on hone ke baad wahi key dobara bhejne par
        <code>x-idempotent-replay: true</code> aaya aur <b>wahi purana jawab</b> mila.
        <br><br>Yaad rakho: key <b>client</b> banata hai (server banayega toh retry par nayi
        ban jaayegi), server use <b>unique constraint</b> ke saath store karta hai
        (app-level check race condition hai), aur <b>response bhi</b> store hota hai —
        sirf key nahi.`,
      hints: [
        "Bina protection ke ek payment: POST /v1/payments -H 'Idempotency-Key: pay-1'",
        "Ab dobara wahi: POST /v1/payments -H 'Idempotency-Key: pay-1'",
        'Ab protection on karo: sim set api.idempotency true',
        "Key ke saath bhejo: POST /v1/payments -H 'Idempotency-Key: order-8812'",
        "Aur wahi key phir se: POST /v1/payments -H 'Idempotency-Key: order-8812'",
      ],
    },
    {
      type: 'bins',
      title: 'Idempotency key kahan chahiye?',
      instructions: 'Har endpoint ko sahi bin mein daalo.',
      bins: [
        { id: 'need', label: '🔑 Key chahiye' },
        { id: 'no', label: '➖ Nahi chahiye' },
      ],
      items: [
        { text: 'POST /payments — paisa katta hai', bin: 'need', explain: 'Classic case. Duplicate = asli paisa. Yahan key optional nahi, laazmi hai.' },
        { text: 'GET /orders/812', bin: 'no', explain: 'GET pehle se safe aur idempotent hai. Jitni baar chaaho bhejo.' },
        { text: 'POST /orders — inventory reserve karta hai', bin: 'need', explain: 'Duplicate order = do baar stock block. Paise jitna hi bura, aur aksar log ise miss kar jaate hain.' },
        { text: 'PUT /users/5 {"name":"Ravi"}', bin: 'no', explain: 'PUT poora replace hai — pehle se idempotent. Naam 5 baar set karo, wahi natija.' },
        { text: 'POST /notifications/send', bin: 'need', explain: 'Duplicate = user ko 5 baar wahi push. Chhota lagta hai par uninstall ki wajah banta hai.' },
        { text: 'DELETE /orders/812', bin: 'no', explain: 'Dobara delete karne par 404 ya 204 milega — order ek hi baar delete hua. Idempotent.' },
        { text: 'POST /refunds', bin: 'need', explain: 'Double refund = seedha paisa ka nuksaan, aur reconcile karna duswapna.' },
        { text: 'POST /search — sirf padhta hai', bin: 'no', explain: 'POST hai par kuch badalta nahi (body bada tha isliye POST). Retry safe hai. Yahan key ka koi kaam nahi.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Idempotency ke niyam',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'idempotency',
      questions: [
        { q: 'Key kaun banata hai?', target: 'who', explain: 'Client. Server banayega toh har retry par nayi key ban jaayegi aur poora maqsad khatam ho jaayega. Client "Pay" dabne par ek UUID banata hai aur retry mein wahi bhejta hai.' },
        { q: 'Key store karne ka sahi tareeka?', target: 'store', explain: 'DB unique constraint par — INSERT ... ON CONFLICT. App-level "pehle check karo phir insert" ek race condition hai, aur concurrency hi toh poora problem hai.' },
        { q: 'Same key par ALAG body aa jaaye toh?', target: 'conflict', explain: '409 Conflict. Chup-chaap purana jawab lautana chhupa hua bug hai — client ko lagega uska naya request safal hua.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Idempotency ki samajh',
      questions: [
        {
          q: 'Idempotency key server kyun nahi bana sakta?',
          choices: [
            'Kyunki retry par server nayi key banayega — aur woh retry ek naye request jaisa dikhega. Key ko RETRY ke paar zinda rehna hai, isliye client hi bana sakta hai',
            'Server ke paas UUID library nahi hoti',
            'Security ke liye',
            'Server bana sakta hai, dono theek hai',
          ],
          answer: 0,
          explain: 'Poora point yeh hai ki <b>doosri request pehli ki copy hai</b>. Yeh baat sirf client jaanta hai. Server ke liye dono bilkul alag requests hain — usne pehli ka jawab bheja hi nahi tha.',
        },
        {
          q: 'Key ko DB unique constraint se kyun store karte hain, app check se kyun nahi?',
          choices: [
            'Kyunki do retries theek ek saath aa sakti hain — app-level "check karke insert" dono ko pass kar dega. Sirf DB constraint atomic hai',
            'DB tez hai',
            'App code mein bug ho sakta hai',
            'Constraint se index apne aap ban jaata hai',
          ],
          answer: 0,
          explain: 'Yeh wahi <b>check-then-act</b> race hai jo Boundaries level mein thi. Aur yahan toh concurrency hi asli scenario hai — retries aksar ek saath aati hain (jaise jab network wapas aata hai). App check yahan bilkul bekaar hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Idempotency',
    instructions: 'Payments ka sabse aam interview sawaal. 🎤',
    questions: [
      {
        q: '"Payment API mein double charge kaise rokoge?"',
        choices: [
          'Idempotency-Key header — client har payment attempt ke liye ek UUID banata hai, server use unique constraint ke saath response ke SAATH store karta hai, aur dobara aane par wahi response lauta deta hai. Same key + alag body = 409',
          'Client ko double click rokne bolunga',
          'Payment ke baad button disable kar dunga',
          'Database transaction use karunga',
        ],
        answer: 0,
        explain: 'UI-level fixes (button disable) network retry se nahi bachate — aur network retry hi asli wajah hai. Transaction bhi nahi bachata: do alag requests, do alag transactions. Poore jawab mein <b>client-generated key + unique constraint + stored response + 409 on mismatch</b> chaaron hone chahiye.',
      },
      {
        q: '"Key kitni der store karoge?"',
        choices: [
          '24 ghante se 7 din — retry window se lamba, par itna nahi ki table anant badhe. TTL ke baad cleanup job se hatao',
          'Hamesha — safety ke liye',
          '5 minute',
          'Jab tak payment settle na ho',
        ],
        answer: 0,
        explain: 'Sochne ka tareeka: <b>retry window se lamba, par bounded</b>. Koi client 3 din baad retry nahi karega. Hamesha rakhne se table lagataar badhegi aur us par unique index bhi. Zyadatar payment providers 24 ghante rakhte hain.',
      },
    ],
  },
  success: [
    'Samjha sakte ho ki client retry kyun zaroori hai',
    'Idempotency key ka poora flow design kar sakte ho',
    'Jaante ho ki key client banata hai aur DB constraint se store hoti hai',
    'Bata sakte ho kahan key chahiye aur kahan nahi',
  ],
  homework: `Apni API ke saare POST endpoints list karo. Har ek ke saamne likho: "agar yeh
    do baar chal gaya toh kya hoga?" Jinke jawab mein paisa, inventory ya notification hai,
    unhe idempotency key chahiye — aaj.`,
  cards: [
    { front: 'Client retry kyun karta hai?', back: 'Woh <b>jaan hi nahi sakta</b> ki request pahunchi nahi ya jawab kho gaya — dono ek jaise dikhte hain. Isliye retry zaroori hai, aur duplicate protection bhi.' },
    { front: 'Key kaun banata hai?', back: '<b>Client.</b> Server banayega toh retry par nayi key ban jaayegi. Key ko retry ke paar zinda rehna hai — yeh sirf client jaanta hai.' },
    { front: 'Key kaise store karein?', back: '<b>DB unique constraint</b> — <code>INSERT ... ON CONFLICT</code>. App-level check race condition hai, aur concurrency hi asli scenario hai. <b>Response bhi store karo</b>, sirf key nahi.' },
    { front: 'Same key, alag body?', back: '<b>409 Conflict.</b> Chup-chaap purana jawab lautana chhupa hua bug hai — client sochega uska naya request safal hua.' },
    { front: 'Key ka TTL?', back: '<b>24 ghante se 7 din</b> — retry window se lamba par bounded. Hamesha rakhne se table aur uska unique index anant badhenge.' },
  ],
},

/* =====================================================================
   L9 — Rate limiting
   ===================================================================== */
{
  id: 'ratelimit',
  icon: '🛡️',
  title: 'Rate Limiting — Token Bucket aur Imaandaar Headers',
  badge: 'Bucket Keeper',
  objectives: [
    'Token bucket vs fixed window (aur border ka jaal)',
    'Kis par limit — API key, IP nahi',
    '<code>Retry-After</code> ke bina rate limit aadha bekaar hai',
    'Saari requests barabar nahi — weighted limiting',
  ],
  lesson: [
    `<h3>📖 Token bucket — sabse zyada use hone wala</h3>
     <pre>bucket capacity (burst) = 200 tokens
refill rate             = 100 tokens/second
har request             = 1 token

bucket khaali? → 429 + Retry-After</pre>
     <p>Iska sabse achha gun: <b>burst allowed hai</b>. App khulte hi 200
     requests aa gayi? Bilkul theek — asli users aise hi behave karte hain
     (ek screen par 30 API calls). Par lagataar 100/sec se zyada nahi
     chalega, kyunki refill rate wahi hai.</p>
     <p><b>Fixed window ka jaal:</b> "per minute 6000" ka matlab yeh nahi
     ki traffic barabar bantega:</p>
     <pre>10:00:59 → 6000 requests   (window 1 khatam)
10:01:00 → 6000 requests   (window 2 shuru)
────────────────────────────────────
ek second mein 12,000 requests 💥</pre>
     <p>Isliye ya toh token bucket, ya <b>sliding window</b> use karo.</p>`,
    `<h3>🔬 Teen faisle jo aksar galat hote hain</h3>
     <p><b>1. Kis par limit — API key, IP nahi.</b></p>
     <pre>IP par limit:
  ❌ ek office ke 500 log → ek IP → sab block
  ❌ ek attacker ke paas 500 IP → limit bekaar
  ✅ IP sirf anonymous endpoints par (login, signup)</pre>
     <p>IP-based limiting asli users ko rokta hai aur attackers ko nahi.
     Authenticated traffic par hamesha <b>user/API key</b> par limit lagao.</p>
     <p><b>2. Saari requests barabar nahi hoti.</b></p>
     <pre>GET /users/5        →  1 token   (2 ms)
POST /reports       → 50 tokens  (8 second)</pre>
     <p>Agar dono 1 token lete hain, toh koi 100 report requests bhej ke
     tumhe gira dega — aur technically usne limit "respect" ki thi.</p>
     <p><b>3. Retry-After ke bina rate limit aadha bekaar hai.</b></p>
     <pre>429 Too Many Requests
retry-after: 3
ratelimit-limit: 100
ratelimit-remaining: 0
ratelimit-reset: 3</pre>
     <p>Iske bina client turant dobara maarega — aur tumne rate limit lagayi
     hi isliye thi ki na maare. Achhe clients <code>ratelimit-remaining</code>
     dekh ke <b>pehle hi</b> dheeme ho jaate hain — yeh 429 se bhi behtar hai.</p>
     <p class="tip">🎯 Distributed setup mein counter <b>shared</b> hona
     chahiye (Redis), warna 10 instances par limit 10x ho jaayegi. Aur
     Redis down ho toh? <b>Fail open</b> (allow) — rate limiter ki kharabi
     poore product ko na giraye.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🛡️ Token bucket lagao',
      goal: 'Ek public API bina rate limit ke chal rahi hai. Burst bhej ke dekho ki kuch nahi rokta, phir token bucket lagao aur 429 khaao.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_RL,
      success: allOf(T_RL),
      successText: `Dhyaan do ki 429 ke saath <code>retry-after</code> aur
        <code>ratelimit-*</code> headers bhi aaye.
        <br><br>Woh headers optional nahi hain: <b>Retry-After ke bina client turant
        dobara maarega</b> — aur tumne rate limit lagayi hi isliye thi ki na maare.
        Achhe clients toh <code>ratelimit-remaining</code> dekh ke pehle hi dheeme
        ho jaate hain, 429 tak pahunchte hi nahi.`,
      hints: [
        'Pehle bina limit ke burst: GET /api/v1/transactions -n 200',
        'Ab bucket lagao: sim add ratelimit --rps 100 --burst 150',
        'Aur dobara burst maaro: GET /api/v1/transactions -n 300',
      ],
    },
    {
      type: 'match',
      title: 'Rate limiting ke faisle',
      instructions: 'Har halat ko sahi jawab se jodo.',
      pairs: [
        { left: '🏢 Ek office ke 500 log, ek IP', right: 'API key/user par limit — IP par nahi', explain: 'IP par limit asli users ko rokti hai. Attacker ke paas toh 500 IP hote hain — usko rokti bhi nahi.' },
        { left: '📊 POST /reports 8 second leta hai', right: 'Weighted limiting — 50 tokens', explain: 'Saari requests barabar nahi. Mehenge endpoints zyada tokens lein, warna 100 report calls tumhe gira dengi.' },
        { left: '⏰ "Per minute 6000" limit', right: 'Border par 12,000 aa sakte hain — sliding window ya token bucket lo', explain: 'Fixed window ka classic jaal: 10:00:59 par 6000 aur 10:01:00 par 6000.' },
        { left: '🔴 Redis (counter store) down ho gaya', right: 'Fail OPEN — requests allow karo', explain: 'Rate limiter ek suraksha hai, product nahi. Uski kharabi se poora product nahi girna chahiye.' },
        { left: '📱 App khulte hi 30 API calls', right: 'Token bucket with burst — yeh normal hai', explain: 'Asli users burst mein aate hain. Strict per-second limit legitimate traffic ko todegi.' },
        { left: '🤖 Client 429 ke baad turant dobara maar raha hai', right: 'Retry-After header bhejo', explain: 'Iske bina client ko pata hi nahi kab try kare. Yeh ek header retry storm rokta hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Rate limiting ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'ratelimit',
      questions: [
        { q: 'Authenticated API par limit kis par lagegi?', target: 'key', explain: 'API key / user id par. IP par limit asli users (office, NAT) ko rokti hai aur attackers (500 IPs) ko nahi rokti.' },
        { q: 'GET /users/5 aur POST /reports ko ek jaisa treat karne mein problem?', target: 'cost', explain: 'Weighted limiting chahiye. Warna koi 100 mehengi requests bhej ke system gira dega — aur technically limit "respect" ki hogi.' },
        { q: 'Burst allow karne wala mechanism kaunsa hai?', target: 'bucket', explain: 'Token bucket. Bucket bhara hua ho toh burst nikal jaata hai; uske baad refill rate hi limit hai. Asli users burst mein hi aate hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Rate Limiting',
    instructions: 'Yahan algorithm ka naam lena aur tradeoff batana dono chahiye. 🎤',
    questions: [
      {
        q: '"Rate limiting design karo — kaunsa algorithm aur kis par?"',
        choices: [
          'Token bucket (burst allow karta hai, jo asli traffic ka shape hai), API key par — IP sirf anonymous endpoints ke liye. Counter Redis mein shared, aur Redis down ho toh fail open',
          'Fixed window counter, IP par',
          'Har request ke beech minimum gap enforce karunga',
          'Nginx ka default rate limit laga dunga',
        ],
        answer: 0,
        explain: 'Achha jawab teen cheezein cover karta hai: <b>algorithm + kyun</b> (burst = asli traffic shape), <b>key</b> (API key, IP nahi), aur <b>failure mode</b> (Redis down = fail open). Aakhri wala sabse zyada seniority dikhata hai.',
      },
      {
        q: '"429 ke saath kya bhejoge?"',
        choices: [
          'Retry-After (kab try karein), ratelimit-limit/remaining/reset (client pehle hi dheema ho sake), aur ek stable error code. Iske bina client turant dobara maarega',
            'Bas 429 status code',
          '429 aur ek error message',
          '503 bhejunga taaki client retry kare',
        ],
        answer: 0,
        explain: '<code>Retry-After</code> sabse zaroori hai — uske bina rate limit ka aadha maqsad khatam. Aur <code>ratelimit-remaining</code> se achhe clients 429 tak pahunchte hi nahi; woh pehle hi apni speed kam kar lete hain. Yeh <b>cooperative</b> design hai.',
      },
    ],
  },
  success: [
    'Token bucket samjha sakte ho aur fixed window ka jaal bata sakte ho',
    'API key vs IP ka faisla sahi kar sakte ho',
    'Retry-After aur ratelimit headers bhejte ho',
    'Weighted limiting aur fail-open jaante ho',
  ],
  homework: `Apni API ka sabse mehenga endpoint dhoondo (p99 sabse zyada). Ab dekho: kya uspar
    wahi rate limit hai jo <code>GET /health</code> par hai? Agar haan, toh koi bhi us endpoint ko
    limit ke andar rehte hue tumhe gira sakta hai.`,
  cards: [
    { front: 'Token bucket?', back: 'burst capacity + refill rate. <b>Burst allow karta hai</b> — asli users aise hi aate hain (app khulte hi 30 calls). Bucket khaali = 429.' },
    { front: 'Fixed window ka jaal?', back: '"Per minute 6000" par <b>border ke aar-paar 12,000</b> aa sakte hain (10:00:59 + 10:01:00). Sliding window ya token bucket lo.' },
    { front: 'Limit kis par?', back: '<b>API key / user id</b> par. IP par limit ek office ke 500 logon ko rokti hai, aur 500 IP wale attacker ko nahi rokti. IP sirf anonymous endpoints par.' },
    { front: '429 ke saath kya?', back: '<code>Retry-After</code> (laazmi) + <code>ratelimit-limit/remaining/reset</code>. Iske bina client turant dobara maarega — jo poora maqsad hi tod deta hai.' },
    { front: 'Rate limiter ka store down ho toh?', back: '<b>Fail OPEN</b> — requests allow karo. Rate limiter ek suraksha hai, product nahi; uski kharabi se product nahi girna chahiye.' },
  ],
},

/* =====================================================================
   L10 — BOSS: API design review
   ===================================================================== */
{
  id: 'boss-api',
  icon: '👑',
  title: 'BOSS — API Design Review',
  badge: 'Contract Karigar',
  objectives: [
    'Ek asli API mein saari bimariyan pehchaano',
    'Har decision ka tradeoff bol sako',
    'Poore track ko ek saath lagao',
  ],
  lesson: [
    `<h3>👑 Review meeting</h3>
     <p>Ek team ne payments API ka design bheja hai. Tumhe review karna hai.
     Har endpoint mein kuch na kuch hai — aur har ek asli production incident
     ban chuki hai kisi na kisi company mein.</p>
     <pre>POST /getTransactions?page=485728&limit=5000
200 { "error": "not found" }
POST /payments                      (koi idempotency key nahi)
429                                 (koi Retry-After nahi)
{ ..., "total": 24286450 }</pre>
     <p>Neeche design canvas hai. Har slot par sahi decision chuno.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: '🏗️ Payments API redesign karo',
      instructions: 'Har slot par ek decision chuno, phir review karao.',
      brief: `Ek fintech app ki <b>transaction history + payments</b> API. Table mein
        <b>2.4 crore rows</b> hain. Mobile app kabhi-kabhi network drop hota hai aur retry karta hai.
        Ek partner integration roz raat ko poora data sync karta hai.`,
      requirements: [
        '2.4 crore transactions',
        'Mobile app retry karta hai (network drop)',
        'Partner ko bulk export chahiye',
        'p99 < 200 ms',
        'Double charge bilkul nahi',
      ],
      pass: 15,
      slots: [
        {
          id: 'list', label: 'History endpoint', icon: '📄',
          note: 'Transaction list kaise dogey?',
          options: [
            { id: 'page', label: 'GET /transactions?page=N&limit=50', score: -3,
              why: 'Deep offset. Page 4,85,728 par DB ko 2.4 crore rows padh ke phenkni padengi — 7 second, ek connection bandhak, aur buffer pool trash.' },
            { id: 'cursor', label: 'GET /transactions?cursor=<opaque>&limit=50', score: 3,
              why: 'Keyset pagination. Har page ka cost same — ek seek + 50 rows. Opaque cursor se tum baad mein query strategy badal sakte ho.' },
            { id: 'both', label: 'Dono: cursor + page (max depth 1000)', score: 2,
              why: 'Migration ke DAURAN sahi hai — purane clients chalte rahenge aur nuksaan bounded hai. Par yeh manzil nahi, raasta hai.' },
          ],
        },
        {
          id: 'total', label: '"total" field', icon: '🧮',
          note: 'UI ko "1-50 of 24,286,450" dikhana hai',
          options: [
            { id: 'exact', label: 'Har response mein exact COUNT(*)', score: -3,
              why: 'Har request par ek poora COUNT(*) — 24M rows par ~2.7 s. LIMIT ise nahi rokta. Yeh akela hi SLO tod dega.' },
            { id: 'hasmore', label: 'Sirf has_more: true', score: 3,
              why: 'Twitter, Slack, Gmail — koi exact total nahi dikhata. Sabse sasta aur 95% cases mein kaafi.' },
            { id: 'approx', label: 'Approximate count (cached / reltuples)', score: 2,
              why: 'Agar product ko sach mein number chahiye toh yeh sahi samjhauta hai. "About 24 million" aur "24,286,450" mein user ko koi farak nahi.' },
          ],
        },
        {
          id: 'pay', label: 'POST /payments', icon: '💳',
          note: 'Mobile app network drop par retry karta hai',
          options: [
            { id: 'plain', label: 'Plain POST', score: -3,
              why: 'Network timeout par client retry karega aur DOOSRA charge ban jaayega. Client jaan hi nahi sakta ki request pahunchi thi ya jawab kho gaya.' },
            { id: 'idem', label: 'POST + Idempotency-Key (client-generated)', score: 3,
              why: 'Sahi. Server key ko unique constraint ke saath response ke SAATH store kare, aur dobara aane par wahi response lauta de.' },
            { id: 'dedupe', label: 'Server body ka hash banake dedupe kare', score: -1,
              why: 'Toota hua: do alag users theek same amount bhej sakte hain — woh do jaayaz payments hain, duplicate nahi. Key client ko banani hi hogi.' },
          ],
        },
        {
          id: 'bulk', label: 'Partner ka bulk export', icon: '📦',
          note: 'Roz raat ko poora data chahiye',
          options: [
            { id: 'biglimit', label: 'limit=100000 allow kar do', score: -3,
              why: 'Ek request poori memory kha jaayegi, ek connection ghanton block karegi, aur timeout par partner poora retry karega.' },
            { id: 'job', label: 'Async export job — 202 + status URL + file link', score: 3,
              why: 'Bade exports sync API par hone hi nahi chahiye. Job banao, background mein file banao, download link do. Yeh sync API ko poori tarah bacha leta hai.' },
            { id: 'cursorbulk', label: 'Wahi cursor API, unhe loop karne do', score: 1,
              why: 'Chal jaayega aur bounded bhi hai — par 2.4 crore rows ke liye 4.8 lakh requests. Rate limit ke saath ghanton lagenge. Export job behtar hai.' },
          ],
        },
        {
          id: 'err', label: 'Error format', icon: '🚨',
          note: 'Client ko pata chalna chahiye ab kya karna hai',
          options: [
            { id: 'always200', label: '200 + { "error": "..." }', score: -3,
              why: 'Status jhooth bol raha hai. Har HTTP client, retry library aur monitoring tool ko lagega sab theek hai. Yeh silent failures banata hai.' },
            { id: 'problem', label: 'Sahi status + problem+json (type, detail, trace_id)', score: 3,
              why: 'Client stable `type` par switch kar sakta hai, UI field-level error dikha sakta hai, aur support trace_id se seedha logs mein ja sakta hai.' },
            { id: 'code', label: 'Sahi status + ek custom error code', score: 1,
              why: 'Bura nahi — status aur code dono hain. Par trace_id aur field-level details ke bina debugging aur form UX dono mushkil rahenge.' },
          ],
        },
        {
          id: 'rl', label: 'Rate limiting', icon: '🚦',
          note: 'Partner sync raat ko bahut traffic bhejta hai',
          options: [
            { id: 'none', label: 'Koi limit nahi — partner bharosemand hai', score: -3,
              why: 'Ek buggy retry loop ya galti se do baar chala sync poora product gira dega. "Bharosemand client" ek architecture decision nahi hai.' },
            { id: 'ip', label: 'IP par 1000 rpm', score: -1,
              why: 'IP galat key hai: ek office ke 500 log ek IP se aate hain, aur attacker ke paas 500 IP hote hain. Aur mehengi requests sasti jaisi hi gini jaayengi.' },
            { id: 'weighted', label: 'API key par token bucket + weighted cost + Retry-After', score: 3,
              why: 'Sahi key (API key), sahi shape (burst allowed), sahi cost model (export mehenga), aur client ko batata hai ki kab dobara aaye.' },
          ],
        },
      ],
      verdicts: {
        great: 'Har decision production-grade hai. Yeh API 2.4 crore rows par bhi predictable rahegi aur double charge kabhi nahi karegi.',
        ok: 'Design theek hai, par ek-do jagah tumne apne aap ko future incident de diya hai. Neeche tradeoffs dekho.',
        bad: 'Yeh API pehle bade partner sync par gir jaayegi. Har option ka "why" padho — asli seekh wahi hai.',
      },
    },
    {
      type: 'terminal',
      title: '🏁 Final: sab kuch ek saath',
      goal: 'Ab poore track ko ek mission mein lagao — deep offset ka dard dikhao, sahi index banao, cursor par shift karo, guards lagao, aur rate limit chalu karo.',
      sys: SD.sys.txn({ api: { countTotal: true } }),
      tasks: T_BOSS_API,
      success: allOf(T_BOSS_API),
      successText: `Ek line mein poora track:
        <br><br><b>Achhi API woh hai jiska naam guess kiya ja sake, jiski cost bounded ho,
        jiske errors actionable hon, aur jise surakshit retry kiya ja sake.</b>
        <br><br>Tumne aaj chaaron kiye: cursor se cost bounded ki, guards se mehenge sawaal band kiye,
        <code>total</code> hata ke chhupa hua COUNT(*) nikala, aur rate limit se ek client ko sab
        kuch kha jaane se roka.`,
      hints: [
        'Dard dikhao: GET /api/v1/transactions?page=485728&limit=50',
        'Sahi index: CREATE INDEX ix_keyset ON transactions(created_at, id)',
        'total ka chhupa hua COUNT hatao: sim set api.countTotal false',
        'Cursor par shift: sim set api.pagination cursor',
        'Aur maango: GET /api/v1/transactions?cursor=eyJ0IjoxfQ&limit=50',
        'Limit baandho: sim set api.maxLimit 100',
        'Rate limit: sim add ratelimit --rps 100 --burst 150',
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — API Design',
    instructions: 'Aakhri round. Yahan tumhe poora design defend karna hai.',
    questions: [
      {
        q: '"Ek line mein — achhi API kya hai?"',
        choices: [
          'Jiska naam guess kiya ja sake, jiski cost bounded ho, jiske errors actionable hon, aur jise surakshit retry kiya ja sake',
          'Jo REST standard follow kare',
          'Jo tez ho',
          'Jiski documentation achhi ho',
        ],
        answer: 0,
        explain: 'Chaaron cheezein alag khatre se bachati hain: <b>guessable</b> (developer experience), <b>bounded cost</b> (production survival), <b>actionable errors</b> (client behaviour), <b>safe retry</b> (correctness). Documentation zaroori hai — par achhi API ko uski utni zaroorat hi nahi padti.',
      },
      {
        q: '"Tumhare paas ek endpoint hai jispar ek partner roz 2.4 crore rows sync karta hai. Kya karoge?"',
        choices: [
          'Use sync API se hatakar async export job par lunga — 202 + status URL + file download. Sync list API bade exports ke liye bani hi nahi hai',
          'Uske liye limit badha dunga',
          'Uske liye alag replica de dunga',
          'Cursor pagination par loop karne bolunga',
        ],
        answer: 0,
        explain: 'Yeh <b>sahi tool</b> ka sawaal hai. Sync list API interactive browsing ke liye hai. 2.4 crore rows ka bulk transfer ek batch job hai — usse ek HTTP request cycle mein daalne ki koshish hamesha timeouts, retries aur memory problems degi. (Cursor loop bhi chal jaayega par 4.8 lakh requests lagenge.)',
      },
    ],
  },
  success: [
    'Ek API design review kar sakte ho aur har bimari pehchaan sakte ho',
    'Cursor, guards, idempotency aur rate limiting saath mein laga sakte ho',
    'Har decision ka tradeoff bol sakte ho',
    'Jaante ho ki bulk export sync API ka kaam nahi hai',
  ],
  homework: `Apni sabse purani API ka ek endpoint chuno aur is track ki checklist se review karo:
    naming · verb/status · pagination · filters · versioning · errors · idempotency · rate limit.
    Har "❌" ke saamne likho ki woh kis din production incident banega.`,
  cards: [
    { front: 'Achhi API — ek line mein?', back: 'Jiska naam <b>guess</b> kiya ja sake, jiski cost <b>bounded</b> ho, jiske errors <b>actionable</b> hon, aur jise <b>surakshit retry</b> kiya ja sake.' },
    { front: 'Bulk export kaise dein?', back: '<b>Async export job</b> — 202 + status URL + file link. Sync list API interactive browsing ke liye hai; 2.4 crore rows ka transfer ek batch job hai.' },
    { front: 'Legacy offset API par turant kya lagayein?', back: '<code>maxPageDepth</code> + <code>maxLimit</code> + timeout + page-depth metric. Migration mein waqt lagega — nuksaan aaj rok sakte ho.' },
  ],
},
]);

/* =====================================================================
   L6.5 — Auth & Identity  (Puneet Patwari ke API Fundamentals #18–20)
   `versioning` ke BAAD daala gaya, isliye registerLevelsAfter.
   ===================================================================== */
const T_AUTH = [
  { text: 'Bina kisi auth ke kisi aur user ka data maango — dekho, mil jaata hai',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.auth === 'none' && r.claimed) },
  { text: 'Identity ko request se lo:  sim set api.auth body',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /api\.auth/.test(r.path) && r.value === 'body') },
  { text: 'Ab kisi aur ka user_id daalo — impersonation ho jaayega',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.auth === 'body' && r.claimed) },
  { text: 'Identity ko token par shift karo:  sim set api.auth header',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /api\.auth/.test(r.path) && r.value === 'header') },
  { text: 'Bina token request bhejo — 401 aana chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 401 && r.denied === 'no-token') },
  { text: 'Expired token bhejo — 401 (aur samjho JWT revoke kyun nahi hota)',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 401 && r.denied === 'expired') },
  { text: 'Apne token se apna data maango — 200',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.auth === 'header' && r.actedAs) },
  { text: 'Apne token se KISI AUR ka data maango — 403 aana chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 403 && r.denied === 'idor') },
];

SD.registerLevelsAfter('api', 'versioning', [
{
  id: 'auth',
  icon: '🔐',
  title: 'Auth — Tum Kaun Ho, Yeh Client Nahi Batata',
  badge: 'Identity Rakshak',
  objectives: [
    'Identity <b>header</b> se aati hai — body ya query se <b>kabhi nahi</b>',
    '401 vs 403 ka asli farak (aur client dono ko alag handle karta hai)',
    'JWT vs server session — kaun sa kab, aur revocation ka jhanjhat',
    'Default-deny: har endpoint ka auth status <b>likha</b> hona chahiye',
  ],
  lesson: [
    `<h3>📖 Ek line jo sab kuch bacha leti hai</h3>
     <p class="tip">🎯 <b>Request ka har hissa client ke kaabu mein hai.</b> URL, query params,
     body, headers — sab. Client jo chaahe likh sakta hai.</p>
     <p>Toh phir header se identity lena "surakshit" kaise hua? Kyunki hum
     <code>Authorization</code> header ke andar jo hai use <b>verify</b> karte hain —
     uspar server ka signature (JWT) hai, ya woh ek session id hai jo server ke paas
     store hai. Hum header par bharosa nahi karte, hum <b>signature</b> par karte hain.</p>
     <p>Iska ulta yeh galti hai, jo aaj bhi sabse common API vulnerability hai:</p>
     <pre>GET /api/v1/transactions?user_id=7      ← "main user 7 hoon"
GET /api/v1/transactions?user_id=8      ← "...ab main user 8 hoon" 😈</pre>
     <p>Server ne bas <b>maan liya</b>. Isko <b>IDOR</b> kehte hain — Insecure Direct
     Object Reference. Yeh koi fancy hack nahi hai; yeh URL mein ek number badalna hai.
     Aur yeh OWASP API Security ki list mein <b>#1</b> par hai.</p>
     <h3>🔀 Do alag sawaal</h3>
     <table>
       <tr><th></th><th>AuthN — Authentication</th><th>AuthZ — Authorization</th></tr>
       <tr><td>Sawaal</td><td>"Tum kaun ho?"</td><td>"Tumhe iski ijaazat hai?"</td></tr>
       <tr><td>Fail par</td><td><b>401</b> Unauthorized</td><td><b>403</b> Forbidden</td></tr>
       <tr><td>Client kya kare</td><td>Login bhejo / token refresh karo</td><td>Login se kuch nahi hoga — error dikhao</td></tr>
       <tr><td>Kahan hota hai</td><td>Gateway / edge par (ek baar)</td><td>Service ke andar (har resource par)</td></tr>
     </table>
     <p>Yeh sirf naam ka farak nahi hai. Agar tum AuthZ fail par 401 bhej doge, toh
     mobile app user ko <b>bar-bar login screen</b> dikhaayega — jabki login se problem
     hal hi nahi hone wali. Yeh ek asli, aam bug hai.</p>`,
    `<h3>🔬 JWT vs Server Session</h3>
     <table>
       <tr><th></th><th>JWT (self-contained)</th><th>Server session</th></tr>
       <tr><td>Verify karne mein</td><td>✅ sirf signature check — koi DB call nahi</td><td>❌ har request par store lookup</td></tr>
       <tr><td>Turant revoke</td><td>❌ <b>nahi ho sakta</b> — token expire hone tak valid hai</td><td>✅ row delete karo, khatam</td></tr>
       <tr><td>Size</td><td>~800 bytes, har request ke saath</td><td>~40 bytes (bas ek id)</td></tr>
       <tr><td>Scale</td><td>✅ stateless — koi bhi node verify kar le</td><td>⚠️ shared store (Redis) chahiye</td></tr>
       <tr><td>Data purana ho jaana</td><td>❌ role token ke andar chhap gaya hai</td><td>✅ hamesha taaza</td></tr>
     </table>
     <p>Practical raasta jo dono ka faayda leta hai:</p>
     <pre>access token   JWT, umar 5–15 minute      ← har request iske saath
refresh token  opaque, server ke paas,     ← sirf naya access token lene ke liye
               umar 30 din, REVOKE ho sakta hai</pre>
     <p>Ab "revoke nahi kar sakte" ki khidki sirf 15 minute ki hai — aur woh aksar
     kaafi hoti hai. User ko ban karo → refresh token delete → 15 min mein woh bahar.</p>
     <h3>🎯 Default-deny</h3>
     <p>Sabse mehengi auth bug "galat rule" nahi hoti — <b>bhool jaana</b> hoti hai.
     Koi naya endpoint bana deta hai aur auth lagana bhool jaata hai. Ilaaj: framework
     mein default hi <b>deny</b> ho, aur public endpoint ko <b>explicitly</b> mark karna pade.</p>
     <pre>@Public                      ← likhna PADEGA, warna band hai
GET  /v1/health
GET  /v1/products            ← public catalog

(kuch nahi likha = protected)
GET  /v1/transactions        ← token chahiye
GET  /v1/admin/users         ← token + role=admin</pre>
     <p class="tip">🎯 Aur GraphQL mein yeh <b>field</b> tak jaata hai: ek hi
     <code>User</code> type mein <code>name</code> sabko dikh sakta hai par
     <code>email</code> sirf khud ko. Isiliye GraphQL mein authorization
     <b>resolver</b> par hoti hai, endpoint par nahi — kyunki endpoint toh ek hi hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: '401, 403 ya 404?',
      instructions: 'Har situation ka sahi status code chuno.',
      bins: [
        { id: 'c401', label: '401 Unauthorized' },
        { id: 'c403', label: '403 Forbidden' },
        { id: 'c404', label: '404 Not Found' },
      ],
      items: [
        { text: 'Authorization header bheja hi nahi', bin: 'c401', explain: 'Server ko pata hi nahi tum kaun ho. 401 + <code>WWW-Authenticate</code> header. Client ko login bhejna chahiye.' },
        { text: 'Token ka signature galat hai (chhed-chaad ki gayi)', bin: 'c401', explain: 'Identity establish hi nahi hui. 401. Aur ise <b>log karo</b> — signature fail hona attack ka signal hai, normal expiry nahi.' },
        { text: 'Token 20 minute pehle expire ho gaya', bin: 'c401', explain: '401 — par client ko chahiye ki woh chupchaap refresh token se naya le aur request dobara bheje. User ko login screen dikhana galat UX hai.' },
        { text: 'Valid user hai, par doosre user ka order maang raha hai', bin: 'c403', explain: 'Identity clear hai, ijaazat nahi. 403. Login se kuch nahi badlega — isliye 401 bhejna client ko infinite login loop mein daal dega.' },
        { text: 'Normal user /v1/admin/users maang raha hai', bin: 'c403', explain: '403 — role kam hai. (Kuch teams yahan jaan-boojh ke 404 bhejti hain taaki admin routes ka pata hi na chale — dono soch sahi hai, par TEAM mein ek hi chuno.)' },
        { text: 'Private repo maanga jiska existence hi leak nahi karna', bin: 'c404', explain: 'GitHub yahi karta hai. 403 kehna bhi ek leak hai: "yeh cheez maujood toh hai". Jab <b>existence</b> hi secret ho, 404 bhejo.' },
        { text: 'Token sahi hai, resource sach mein delete ho chuka hai', bin: 'c404', explain: 'Seedha 404 — yahan koi auth sawaal hai hi nahi.' },
      ],
    },
    {
      type: 'terminal',
      title: 'Mission — Impersonation se Token tak',
      goal: `Ek API hai jo <b>maan leti hai</b> ki tum wahi ho jo tum keh rahe ho.
             Pehle use tod ke dikhao, phir theek karo.`,
      sys: SD.sys.txn({
        db: { tables: { transactions: { indexes: [
          { name: 'transactions_pkey', cols: ['id'], unique: true },
          { name: 'ix_txn_user', cols: ['user_id', 'created_at', 'id'] },
        ] } } },
        api: { auth: null, countTotal: false, pagination: 'cursor' },
      }),
      tasks: T_AUTH,
      success: allOf(T_AUTH),
      successText: `Tumne API ki sabse aam vulnerability apne haath se banayi aur band ki.
        Yaad rakho: <b>identity token se, scope token se, ownership check har resource par.</b>
        Aur 401 ≠ 403 — client dono ka bilkul alag matlab nikaalta hai.`,
      hints: [
        "Pehle bina auth ke kisi aur ka data maango: GET /api/v1/transactions?user_id=8&limit=5",
        "Ab identity request se lene lago: sim set api.auth body",
        "Aur kisi aur ban jao: GET /api/v1/transactions?user_id=8&limit=5",
        "Ab sahi tareeka: sim set api.auth header",
        "Bina token bhejo: GET /api/v1/transactions?limit=5",
        "Expired token: GET /api/v1/transactions?limit=5 -H 'Authorization: Bearer expired'",
        "Apna token, apna data: GET /api/v1/transactions?user_id=7&limit=5 -H 'Authorization: Bearer u7'",
        "Apna token, DOOSRE ka data: GET /api/v1/transactions?user_id=8&limit=5 -H 'Authorization: Bearer u7'",
      ],
    },
    {
      type: 'hotspot',
      title: 'Auth ka naksha',
      visual: 'auth',
      questions: [
        { q: 'Identity kis cheez se nikalni chahiye?', target: 'token', explain: 'Sirf verified token se. Query param, body field, ya koi bhi <code>X-User-Id</code> jo client bhej sakta hai — sab jhooth bol sakte hain.' },
        { q: 'Kaunsa hissa client jhooth bol ke bhar sakta hai?', target: 'spoof', explain: 'Query aur body — dono poori tarah client ke kaabu mein hain. Yahan se identity lena hi IDOR ki jad hai.' },
        { q: 'Ownership check kahan hona chahiye?', target: 'own', explain: 'Service ke andar, <b>har resource par</b>. Gateway sirf "token valid hai" bata sakta hai; "yeh order <b>iska</b> hai" sirf woh service jaanti hai jiske paas data hai.' },
        { q: 'Access token ki umar chhoti kyun rakhte hain?', target: 'short', explain: 'Kyunki JWT ko beech mein revoke nahi kar sakte. Chhoti umar = chori hue token ki khidki chhoti. Lambi umar ka kaam refresh token karta hai, jo revoke ho sakta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Auth ki samajh',
      questions: [
        {
          q: 'Gateway ne token verify kar liya. Ab service ke andar aur kya check karna zaroori hai?',
          choices: [
            'Ownership — kya yeh resource sach mein isi user ka hai',
            'Kuch nahi, gateway ne kaam kar diya',
            'Token dobara verify karna',
            'Rate limit',
          ],
          answer: 0,
          explain: 'Gateway sirf <b>authentication</b> karta hai — "token asli hai, yeh user 7 hai". Par "order #9912 user 7 ka hai ya nahi" — yeh sirf orders service jaanti hai, kyunki data uske paas hai. Yeh check chhootna hi sabse aam data leak hai.',
        },
        {
          q: 'Ek user ko turant block karna hai. Tum pure JWT use kar rahe ho jiski umar 24 ghante hai. Kya hoga?',
          choices: [
            'Woh 24 ghante tak andar rahega — JWT self-contained hai, server use "wapas" nahi le sakta',
            'Agli request par block ho jaayega',
            'JWT delete kar denge',
            'Signature key badal denge, bas',
          ],
          answer: 0,
          explain: 'Yahi JWT ka sabse bada tradeoff hai. Token ke andar hi sab likha hai, isliye server bina DB dekhe verify karta hai — <b>aur isi wajah se</b> use beech mein cancel nahi kar sakta. (Signature key badalna kaam karega par woh <b>sabko</b> logout kar dega.) Practical hal: access token 15 min ka + revocable refresh token.',
        },
        {
          q: 'Naya endpoint bana aur auth lagana bhool gaye. Isse bachne ka sabse pakka tareeka?',
          choices: [
            'Framework mein default DENY ho — public endpoint ko explicitly mark karna pade',
            'Code review checklist',
            'Har PR par security team se poochho',
            'Endpoint ke naam mein "public" likho',
          ],
          answer: 0,
          explain: 'Checklists insaan par nirbhar hain, aur insaan bhoolta hai. <b>Default-deny</b> galti ko structurally impossible bana deta hai: bhoolne ka natija "sabke liye khula" nahi, "sabke liye band" hai. Bhool pakdi jaati hai kyunki endpoint <b>kaam hi nahi karta</b> — chupchaap leak nahi hota.',
        },
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa auth mechanism kahan',
      pairs: [
        { left: 'Public REST API, third-party developers', right: 'API key + rate limit per key', explain: 'Key se tum <b>caller</b> pehchante ho (user nahi), aur usi par quota aur billing lagti hai. Key rotate karne layak honi chahiye.' },
        { left: 'Browser SPA, apna hi backend', right: 'HttpOnly + Secure + SameSite cookie session', explain: 'JS use padh hi nahi sakta, isliye XSS token chura nahi sakta. Server session hone se logout turant asar karta hai. localStorage mein JWT rakhna sabse aam galti hai.' },
        { left: 'Mobile app', right: 'Chhoti umar ka access token + revocable refresh token', explain: 'Mobile par cookies asuvidha hain. Access token chhota rakho (revoke nahi hota), refresh token secure storage mein (revoke hota hai).' },
        { left: 'Service → service (internal)', right: 'mTLS ya short-lived service token', explain: 'Yahan "user" hai hi nahi. Har service ka apna identity certificate ho. Aur asli user ki identity alag se propagate karo — warna downstream ownership check nahi kar sakti.' },
        { left: 'GraphQL — ek user ka email sirf usi ko dikhe', right: 'Resolver-level (field-level) authorization', explain: 'GraphQL mein endpoint ek hi hai (<code>/graphql</code>), isliye endpoint par authz kaafi nahi. Har field ka apna resolver hai — check wahin lagta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Auth',
    instructions: 'Yahan galat jawab seedha "security incident" jaisa sunta hai. 🎤',
    questions: [
      {
        q: '"Tumhari API mein user apna order dekhta hai. Design bolo."',
        choices: [
          'Token se user id nikaalo, phir query hi user_id se scope karo: WHERE id = ? AND user_id = <token wala>. Order id URL mein hai par identity token se hi aayegi',
          'URL se order id lo aur woh order laut do',
          'Client se user_id aur order id dono lo, dono match karo',
          'Frontend mein doosre users ke orders dikhaao hi mat',
        ],
        answer: 0,
        explain: 'Asli baat query mein hai: <code>AND user_id = ?</code>. Isse ownership check <b>bhoolna hi mumkin nahi</b> — galat user ko row milegi hi nahi. "Pehle fetch karo phir compare karo" bhi chalta hai, par usme woh <code>if</code> koi na koi din chhoot jaata hai.',
      },
      {
        q: '"Tumhara auth service down ho gaya. API ko kya karna chahiye?"',
        choices: [
          'Fail CLOSED — 503 do. Auth ke liye "shak ho toh andar aane do" kabhi nahi',
          'Sabko andar aane do taaki availability bani rahe',
          'Cached tokens allow karo, naye reject karo',
          'Read allow, write block',
        ],
        answer: 0,
        explain: 'Baaki poore track mein hum <b>graceful degradation</b> sikhte hain — adhoora jawab &gt; koi jawab nahi. Auth <b>apwaad</b> hai: yahan degrade karne ka matlab hai sabka data sabko de dena. (Teesra option practical hai — pehle se verify hue tokens ki chhoti si cache thodi der chalti rahe — par uska scope aur TTL <b>pehle se</b> tay hona chahiye, incident ke beech mein nahi.)',
      },
    ],
  },
  success: [
    'Identity sirf verified token se nikaal sakte ho',
    'IDOR pehchaan sakte ho aur query-scoping se rok sakte ho',
    '401 aur 403 ka farak jaante ho — aur client par uska asar',
    'JWT vs session ka tradeoff aur refresh-token wala practical raasta bata sakte ho',
  ],
  homework: `Apni API ke 5 endpoints lo. Har ek ke saamne likho: (1) public hai ya protected,
    (2) identity kahan se aati hai, (3) ownership check kis line par hota hai.
    Jahan (3) khaali reh jaaye — wahi tumhara agla bug hai.`,
  cards: [
    { front: 'Identity kahan se lein?', back: 'Sirf <b>verified token</b> se (Authorization header). Query/body/koi bhi client-set header <b>jhooth bol sakta hai</b> — wahan se identity lena hi IDOR hai.' },
    { front: '401 vs 403?', back: '<b>401</b> = "tum kaun ho, pata nahi" → client login/refresh bheje. <b>403</b> = "pata hai, ijaazat nahi" → login se kuch nahi hoga. Galat code = infinite login loop.' },
    { front: 'JWT ka sabse bada tradeoff?', back: 'Bina DB dekhe verify hota hai — <b>isi wajah se</b> revoke nahi hota. Hal: access token 5–15 min + revocable refresh token.' },
    { front: 'Ownership check kahan?', back: 'Service ke andar, har resource par — aur behtar, <b>query mein</b>: <code>WHERE id=? AND user_id=?</code>. Gateway sirf authN karta hai, authZ nahi.' },
    { front: 'Naye endpoint par auth bhoolne se kaise bachein?', back: '<b>Default-deny.</b> Public ko <code>@Public</code> se explicitly mark karna pade. Bhoolne ka natija "band" ho, "khula" nahi.' },
    { front: 'Auth service down — fail open ya closed?', back: '<b>Fail CLOSED (503).</b> Baaki har jagah degrade karna sahi hai; auth apwaad hai — yahan degrade = sabka data sabko.' },
  ],
},
]);
