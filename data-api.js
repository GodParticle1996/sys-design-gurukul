(() => {
/* =====================================================================
   TRACK 2 — API Design & Contracts
   naming · verbs · offset-pain · cursor · filtering · versioning ·
   errors · idempotency · ratelimit · boss-api
   ===================================================================== */

const T_OFFSET = [
  { text: 'page=1 maango — kitni rows padhi gayi?',
    check: s => s.records.some(r => r.kind === 'http' && r.page === 1 && r.status === 200 && !r.indexUsed && r.rowsExamined > 1000000) },
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
    check: s => s.records.filter(r => r.kind === 'http' && r.method === 'POST' && r.status === 201 && r.idem === 'ignored' && r.key === 'pay-1').length >= 2 },
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
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && !r.rateLimited && r.repeat >= 200) },
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
            'Client baaki endpoints khud andaaza laga sakta hai — kam docs, kam support, kam galtiyan',
            'API tez chalti hai — saaf naam wale routes server par jaldi match ho jaate hain',
            'REST ka label milta hai — REST naam se latency ki guarantee apne aap aa jaati hai',
            'Bandwidth bachti hai — chhote route names se har request halki ho jaati hai',
          ],
          answer: 0,
          explain: 'Consistency ka asli fayda predictability hai. Developer /users/5/orders dekhta hai toh /users/5/addresses bhi samajh jaata hai. Har inconsistency ek documentation lookup aur ek support ticket hai.',
          choiceExplanations: [
            'Consistency ka asli fayda predictability hai. Developer /users/5/orders dekhta hai toh /users/5/addresses bhi samajh jaata hai. Har inconsistency ek documentation lookup aur ek support ticket hai.',
            'Route match hone ka samay naam se lagbhag nahi badalta. Fayda insaan ke liye hai: andaaza lagana aasaan.',
            'REST ek design style hai, raftaar ka vaada nahi.',
            'URL ke kuch bytes bandwidth mein farak nahi daalte. Asli fayda samajhne mein hai.',
          ],
        },
        {
          q: 'GET se state badalne mein sabse bada khatra?',
          choices: [
            'GET safe maana jaata hai — crawler ya prefetch bina user ke faisle ke data badal sakta hai',
            'GET sirf user click par chalta hai — delete link par warning ho toh automatic call ka risk nahi',
            'Login laga do — logged-in GET ko browser prefetch kabhi chalata hi nahi, toh delete safe hai',
            'URL ko docs se hata do — crawler aur browser delete endpoint tak pahunch hi nahi sakte',
          ],
          answer: 0,
          explain: 'Asli incident jo baar-baar hua hai: kisi ne GET /delete?id= banaya, phir crawler ne poora database saaf kar diya. GET ka safe hona ek vaada hai jis par poori duniya bharosa karti hai.',
          choiceExplanations: [
            'Asli incident jo baar-baar hua hai: kisi ne GET /delete?id= banaya, phir crawler ne poora database saaf kar diya. GET ka safe hona ek vaada hai jis par poori duniya bharosa karti hai.',
            'GET apne aap bhi chal sakta hai. Link ki warning seedhi HTTP request ko nahi rokti.',
            'Login permission jaanchta hai — GET sirf user ke click par chalne ki guarantee login nahi deta.',
            'Docs se hataane se endpoint band nahi hota. URL links, history ya logs se bhi mil jaata hai.',
          ],
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
          'POST /orders/812/cancel ya PATCH status — cancellation ka record ho toh resource banao',
          'GET /orders/812/cancel — link click karte hi order cancel, sabse aasaan raasta',
          'DELETE /orders/812 — cancel ka matlab order hata dena, history ki zaroorat nahi',
          'POST /cancelOrder — har retry par nayi cancellation request ban jaaye, koi baat nahi',
        ],
        answer: 0,
        explain: 'Sahi jawab pattern bhi deta hai aur sawaal bhi poochhta hai: kya cancellation ka apna wajood hai (id, reason, history)? Hai toh cancellation ko resource banao. DELETE galat hai — cancel order ko mitana nahi, ek state hai jo audit ke liye rehni chahiye. Aur GET toh bilkul nahi.',
        choiceExplanations: [
          'Sahi jawab pattern bhi deta hai aur sawaal bhi poochhta hai: kya cancellation ka apna wajood hai (id, reason, history)? Hai toh cancellation ko resource banao. DELETE galat hai — cancel order ko mitana nahi, ek state hai jo audit ke liye rehni chahiye. Aur GET toh bilkul nahi.',
          'GET safe hona chahiye — crawler ya prefetch order cancel kar dega.',
          'Cancel order ko mitana nahi, ek state hai — audit ke liye history chahiye.',
          'Verb wala URL, aur har retry par nayi cancellation — duplicate aur ulajhan dono.',
        ],
      },
      {
        q: '"Ek team snake_case use kar rahi hai, doosri camelCase. Kya karoge?"',
        choices: [
          'Ek chuno aur poori API mein lagao — kaunsa, kam zaroori; ek jaisa hona zyada zaroori',
          'Dono support karo — har field do naam se bhejo, taaki koi bhi client na toote',
          'snake_case hi chuno — snake_case se API ki raftaar thodi badh jaati hai',
          'Har endpoint client ke hisaab se rakho — jo team jaisa chahe, waisa naam',
        ],
        answer: 0,
        explain: '"Dono support karo" sabse mehenga jawab hai — ab har field do jagah, har bug do baar. Kuch faislon mein chunna zaroori hai, kya chuna — utna nahi.',
        choiceExplanations: [
          '"Dono support karo" sabse mehenga jawab hai — ab har field do jagah, har bug do baar. Kuch faislon mein chunna zaroori hai, kya chuna — utna nahi.',
          'Ab har field do jagah, har bug do baar. Sabse mehenga jawab.',
          'Case style raftaar nahi badalta. Faisla consistency ka hai.',
          'Har endpoint alag = koi andaaza nahi laga sakta. Inconsistency ki keemat yahi hai.',
        ],
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
            '503 + Retry-After saaf batata hai "abhi bhara hoon, baad mein aana"; 500 bug jaisa lagta hai',
            '500 par client retry kar hi nahi sakta — 500 aate hi request hamesha ke liye band',
            '500 bhejne par request apne aap queue mein lag jaati hai aur baad mein chalti hai',
            '500 ke saath Retry-After bhejna mana hai, toh client ko intezaar ka pata nahi chalta',
          ],
          answer: 0,
          explain: 'Status code client ko agla kadam batata hai. 500 = "mere andar gadbad hai". 503 = "main abhi bhara hoon, thodi der baad aana" — aur saath mein Retry-After. Clients 500 par bhi retry kar sakte hain; isliye jo operation dobara chalna safe nahi, us ke retry ko idempotency, deadline aur backoff se baandho.',
          choiceExplanations: [
            'Status code client ko agla kadam batata hai. 500 = "mere andar gadbad hai". 503 = "main abhi bhara hoon, thodi der baad aana" — aur saath mein Retry-After. Clients 500 par bhi retry kar sakte hain; isliye jo operation dobara chalna safe nahi, us ke retry ko idempotency, deadline aur backoff se baandho.',
            'Clients 500 par bhi retry kar sakte hain. Dikkat: 500 bug ka signal hai, toh retry ka faisla ulajh jaata hai.',
            'Server ka 500 kuch queue nahi karta. Request khatam — client ko khud tay karna hai.',
            'Retry-After 500 ke saath mana nahi; par aam taur par 503 aur 429 ke saath bheja jaata hai.',
          ],
        },
        {
          q: 'PUT aur PATCH mein asli farak?',
          choices: [
            'PUT poora resource badalta hai (idempotent); PATCH badlaav bhejta hai — idempotent ho bhi, na bhi',
            'PUT naya resource banata hai, aur PATCH sirf pehle se bane resource ko update karta hai',
            'PATCH hamesha idempotent hai — chhota badlaav jitni baar bhejo, nateeja bilkul wahi',
            'PUT har baar bilkul same response deta hai, byte-by-byte — idempotent ka matlab wahi',
          ],
          answer: 0,
          explain: 'PUT ka matlab: "resource ab bilkul aisa hai" — N baar bhejo, nateeja wahi (HTTP mein PUT idempotent hai). PATCH ka matlab: "itna badlo" — "value set karo" idempotent ho sakta hai, "+1 karo" nahi. Retry logic ke liye farak seedha matter karta hai. (Same effect ka matlab same response nahi.)',
          choiceExplanations: [
            'PUT ka matlab: "resource ab bilkul aisa hai" — N baar bhejo, nateeja wahi (HTTP mein PUT idempotent hai). PATCH ka matlab: "itna badlo" — "value set karo" idempotent ho sakta hai, "+1 karo" nahi. Retry logic ke liye farak seedha matter karta hai. (Same effect ka matlab same response nahi.)',
            'PUT bhi update karta hai (aur kabhi create). Farak poora vs hissa ka hai.',
            '"+1 karo" jaisa PATCH har baar badlaav jodta hai — idempotent nahi.',
            'Idempotent ka matlab effect same, response nahi. Doosri baar 200 ki jagah 204 bhi aa sakta hai.',
          ],
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
          'POST "naya banao" hai; client Idempotency-Key bheje, server key dekh ke purana jawab de',
          'Body same ho toh POST apne aap idempotent hai — same body ka matlab same request',
          'Ek local DB transaction laga do — transaction khud pehchaan lega ki request retry hai',
          'POST ko PUT naam se bhejo — payment provider PUT dekh ke duplicate khud hata dega',
        ],
        answer: 0,
        explain: 'POST ka aam matlab "naya banao" — do baar = do cheezein (operation khud idempotent design ho sakta hai, par POST guarantee nahi deta). Doosra hissa (kaise banaoge) asli jawab hai: client stable key bheje, server key ko unique constraint ke saath rakhe, aur dobara aane par purana jawab lautaye. Payload bhi milao — wahi key, alag body = galti.',
        choiceExplanations: [
          'POST ka aam matlab "naya banao" — do baar = do cheezein (operation khud idempotent design ho sakta hai, par POST guarantee nahi deta). Doosra hissa (kaise banaoge) asli jawab hai: client stable key bheje, server key ko unique constraint ke saath rakhe, aur dobara aane par purana jawab lautaye. Payload bhi milao — wahi key, alag body = galti.',
          'Do alag users theek same amount bhej sakte hain — do alag payments. Isliye key client banata hai.',
          'Transaction ek request ke andar ka kaam bachata hai. Doosri request ko retry pehchaanne ke liye key chahiye.',
          'Naam badalne se provider ka bartav nahi badalta. Provider ka idempotency contract chahiye.',
        ],
      },
      {
        q: '"Client ko 401 mila. Kya karna chahiye? Aur 403 par?"',
        choices: [
          '401: credentials theek karo; 403: wajah jaancho, same credentials se automatic retry nahi',
          '401 par same token se retry karte raho — token expire hua ho toh server thodi der mein maan lega',
          '403 par naya token maango — token refresh se missing permission bhi har baar mil jaayegi',
          '403 ko temporary server error maano — backoff ke baad same credentials se access mil jaayega',
        ],
        answer: 0,
        explain: '401 par WWW-Authenticate dekho aur credentials theek karo (refresh ya login). 403 par server request mana kar raha hai — same credentials se automatic retry mat karo. Permission, scope ya policy ki wajah samjho; credentials ya permission badle toh nayi koshish kaam kar sakti hai.',
        choiceExplanations: [
          '401 par WWW-Authenticate dekho aur credentials theek karo (refresh ya login). 403 par server request mana kar raha hai — same credentials se automatic retry mat karo. Permission, scope ya policy ki wajah samjho; credentials ya permission badle toh nayi koshish kaam kar sakti hai.',
          'Expired token ko same token se dobara bhejna credentials theek nahi karta.',
          'Sirf token refresh karna access ki guarantee nahi. Permission ya scope ki dikkat pehle samjho.',
          '403 server ke bojh ka signal nahi. Mana hone ki wajah samjhe bina same credentials se retry loop mat chalao.',
        ],
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
      success: SD.allTasks(T_OFFSET),
      successText: `Yeh teen numbers yaad rakho:
        <br>• bina index, page 1 → <b>~12.8 s</b> (poori table scan + sort)
        <br>• index ke saath, page 1 → <b>~4 ms</b> ✅
        <br>• <b>wahi index</b>, page 4,85,728 → <b>~6.8 s</b> 💀
        <br><br>Index ne <b>sorting</b> bachaayi, <b>skipping</b> nahi.
        <code>OFFSET</code> ka matlab hi hai "ginte hue aage badho" — aur ginne ke liye
        har entry chhuni padti hai. B-tree ek tree hai, array nahi; usme
        "24 million-vaan element" par jump nahi kiya ja sakta.`,
      solution: [
        "GET /api/v1/transactions?page=1&limit=50",
        "CREATE INDEX ix_txn_created ON transactions(created_at)",
        "GET /api/v1/transactions?page=1&limit=50",
        "GET /api/v1/transactions?page=485728&limit=50",
        "EXPLAIN SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50 OFFSET 24286350",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'transactions', ['created_at']) && m.current(s, 'explain', r => r.table === 'transactions' && r.offset === 24286350 && r.rowsExamined > 1000000); },
      hints: [
        "Pehle observation: page=1 maango — kitni rows padhi gayi?. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: EXPLAIN se plan khud dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?page=1&limit=50\nCREATE INDEX ix_txn_created ON transactions(created_at)\nGET /api/v1/transactions?page=1&limit=50\nGET /api/v1/transactions?page=485728&limit=50\nEXPLAIN SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50 OFFSET 24286350",
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
      success: SD.allTasks(T_COUNT),
      successText: `<code>total</code> ek <b>alag query</b> hai — <code>COUNT(*)</code> —
        jo <b>poore filtered set</b> ko gin-ti hai. <code>LIMIT</code> use nahi rokta.
        <br><br>Teen practical jawab:
        <br>• <b>Total do hi mat</b> — bas <code>has_more: true</code> bhejo (Twitter/Slack aisa hi karte hain)
        <br>• <b>Approximate count</b> — <code>pg_class.reltuples</code> ya cached count, "about 24M"
        <br>• <b>Alag endpoint</b> — jise UI tabhi maange jab sach mein zaroorat ho
        <br><br>Poochho: kya user ko sach mein pata hona chahiye ki 2,42,86,450 rows hain?`,
      solution: [
        "GET /api/v1/transactions?page=1&limit=50",
        "sim set api.countTotal false",
        "GET /api/v1/transactions?page=1&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.countTotal === false && m.current(s, 'http', r => r.resource === 'transactions' && r.page === 1 && r.countTotal === false && r.status === 200); },
      hints: [
        "Pehle observation: Dekho ki `total` field kitna mehenga hai. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab wahi request dobara — farak dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?page=1&limit=50\nsim set api.countTotal false\nGET /api/v1/transactions?page=1&limit=50",
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
          q: "Typical indexed ORDER BY plan: OFFSET 1000000 LIMIT 50. Returned rows ke alawa kya cost?",
          choices: [
            'Lagbhag 10,00,050 entries — offset wali sab padh ke phenkni padti hain, phir 50 lautti hain',
            'Sirf 50 entries — DB sirf wahi rows padhta hai jo lautani hain, baaki ko chhoota nahi',
            'Index ho toh offset ka kharch zero — index seedha 10 lakh-vein entry par kood jaata hai',
            'LIMIT 50 hai, toh DB baaki entries ko chhoota hi nahi, bas un ki jagah rakh leta hai',
          ],
          answer: 0,
          explain: 'Typical ordered OFFSET 1000000 LIMIT 50 plan ko 10 lakh skipped entries + 50 results process karne padte hain. Index ke saath bhi — index sort deta hai, skip nahi. Kitne pages ya tuples asal mein padhe gaye, plan, filters aur visibility par depend karta hai; lautayi gayi rows ko kul kaam mat samjho.',
          choiceExplanations: [
            'Typical ordered OFFSET 1000000 LIMIT 50 plan ko 10 lakh skipped entries + 50 results process karne padte hain. Index ke saath bhi — index sort deta hai, skip nahi. Kitne pages ya tuples asal mein padhe gaye, plan, filters aur visibility par depend karta hai; lautayi gayi rows ko kul kaam mat samjho.',
            'OFFSET ko pehle 10 lakh entries ginni padti hain. Lautti 50 hain, kaam 10 lakh+ ka hai.',
            'Index sort deta hai, skip nahi. B-tree mein 10 lakh-vein entry par seedha koodne ka tareeka nahi.',
            'LIMIT nateeja chhota karta hai, kaam nahi. Skip ki gayi entries bhi padhni padti hain.',
          ],
        },
        {
          q: 'Deep-page query se sirf us request ko nuksaan hota hai?',
          choices: [
            'Nahi — doosron ka data cache se nikalta hai, replica peeche, ek connection bandha',
            'Haan — sirf us caller ka socket der tak busy rehta hai, baaki sab bilkul theek',
            'Haan — LIMIT 50 hai, toh query ka kharch utna hi, kisi aur par asar nahi padta',
            'Haan — padhne wali query memory nahi khaati, toh doosri queries par farak nahi',
          ],
          answer: 0,
          explain: 'Yahi is level ka sabse zaroori sabak. Ek deep-page query <b>saare users</b> ka anubhav kharab karti hai: cache se doosre logon ka data nikal jaata hai, replica peeche chala jaata hai, aur pool ka ek connection kai second ke liye bandhak ban jaata hai. Isiliye "sirf ek user hi toh karta hai" wali soch galat hai.',
          choiceExplanations: [
            'Yahi is level ka sabse zaroori sabak. Ek deep-page query <b>saare users</b> ka anubhav kharab karti hai: cache se doosre logon ka data nikal jaata hai, replica peeche chala jaata hai, aur pool ka ek connection kai second ke liye bandhak ban jaata hai. Isiliye "sirf ek user hi toh karta hai" wali soch galat hai.',
            'Socket ke saath DB ka cache, CPU aur pool ka connection bhi bandha — sab saajhe hain.',
            'LIMIT nateeja chhota karta hai; DB 10 lakh+ entries padhta hai.',
            'Padhne se buffer cache bharta hai — doosre users ka data cache se bahar ho jaata hai.',
          ],
        },
        {
          q: 'Offset pagination "galat" bhi kaise hai, sirf dheemi nahi?',
          choices: [
            'Beech mein data badla toh rows khisakti hain — koi row chhoot sakti hai, koi do baar dikhe',
            'Data bilkul na badle tab bhi rows har page par khisak jaati hain, hamesha',
            'Sort stable aur unique ho toh offset har badlaav mein bhi bilkul sahi rehta hai',
            'Offset sirf duplicate row deta hai — koi row kabhi bhi chhoot-ti nahi hai',
          ],
          answer: 0,
          explain: 'Offset row ki position par chalta hai. Pehla page padhne ke baad list ke shuru mein nayi row aaye, toh agle page par pehle dekhi row dobara aa sakti hai. Page boundary se pehle koi row delete ho, toh agle page se abhi na dekhi row chhoot sakti hai. Stable keyset cursor position khisakne ki dikkat se bachata hai.',
          choiceExplanations: [
            'Offset row ki position par chalta hai. Pehla page padhne ke baad list ke shuru mein nayi row aaye, toh agle page par pehle dekhi row dobara aa sakti hai. Page boundary se pehle koi row delete ho, toh agle page se abhi na dekhi row chhoot sakti hai. Stable keyset cursor position khisakne ki dikkat se bachata hai.',
            'Data na badle toh positions bhi nahi khisakti. Dikkat badalte data ki hai.',
            'Stable sort kram pakka karta hai, par naya row aane par positions phir bhi khisakti hain.',
            'Page boundary se pehle row delete ho, toh offset abhi na dekhi row ko chhod sakta hai. Duplicate ke saath chhootne ka khatra bhi hai.',
          ],
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
          'Pehle plan dekho — OFFSET hi dikkat hai; cursor par jao, tab tak max depth, timeout, rate limit',
          'created_at par index laga do — index se kisi bhi offset ka kharch zero ho jaata hai',
          'Read replica jod do — query replica par chalegi aur scan ki dikkat khatam ho jaayegi',
          'Request bahut dheemi hai, toh us partner ka account ban kar do, kaam khatam',
        ],
        answer: 0,
        explain: 'Sabse pehla kadam plan dekhna hai, andaaza nahi. Index lagana adhoora jawab hai — index page 1 theek karta hai, deep page nahi. Replica se query dheemi hi rahegi, bas doosri machine par. Aur "ban kar do" — thoda mann toh karta hai, par pehle hadd aur cursor do.',
        choiceExplanations: [
          'Sabse pehla kadam plan dekhna hai, andaaza nahi. Index lagana adhoora jawab hai — index page 1 theek karta hai, deep page nahi. Replica se query dheemi hi rahegi, bas doosri machine par. Aur "ban kar do" — thoda mann toh karta hai, par pehle hadd aur cursor do.',
          'Index page 1 theek karta hai, deep page nahi — index sort deta hai, skip nahi.',
          'Replica par bhi wahi 2.4 crore rows padhni hongi — query dheemi hi rahegi, bas doosri machine par.',
          'Partner ka kaam asli ho sakta hai. Pehle API ki hadd aur sahi pagination do.',
        ],
      },
      {
        terminal: {
          goal: 'Interviewer: "Yeh raha wahi endpoint. Mujhe LIVE dikhao ki index lagane ke baad bhi deep page slow rehta hai."',
          sys: SD.sys.txn({ api: { countTotal: false } }),
          tasks: T_PROVE,
          success: SD.allTasks(T_PROVE),
          successText: 'Perfect. Tumne <b>dikha ke</b> prove kiya, bataya nahi. Interview mein yeh farak sab kuch hai.',
          solution: [
            "CREATE INDEX ix_c ON transactions(created_at)",
            "GET /api/v1/transactions?page=1&limit=50",
            "GET /api/v1/transactions?page=485728&limit=50",
          ],
          verify: s => { const m = SD.mission; return m.index(s, 'transactions', ['created_at']) && m.current(s, 'http', r => r.page === 485728 && r.rowsExamined > 1000000); },
          hints: [
            "Pehle observation: created_at par index banao. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
            "Checklist ko kram se dekho. Aakhri proof: Deep page dikhao — index hote hue bhi dheema. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
            "Near-answer walkthrough; har command alag Enter se chalao:\nCREATE INDEX ix_c ON transactions(created_at)\nGET /api/v1/transactions?page=1&limit=50\nGET /api/v1/transactions?page=485728&limit=50",
          ],
        },
      },
      {
        q: '"Tumhare UI ko \\"1-50 of 24,286,450\\" dikhana hai. Kaise karoge?"',
        choices: [
          'Poochho exact count chahiye bhi? Aksar has_more kaafi; warna lagbhag count (cached)',
          'Har call par COUNT(*) chala do — COUNT(*) har table par ek jaisa tez hota hai',
          'Count ek baar cache karo, aur har baar cached number ko exact bata do',
          'Browser se total nikalwa lo — client pages gin ke khud total bata dega',
        ],
        answer: 0,
        explain: 'Sabse achha jawab requirement ko challenge karta hai. Twitter, Slack, Gmail — koi exact total nahi dikhata, sab "more" dikhate hain. Sach mein chahiye toh lagbhag count aksar kaafi hai: user ko "24,286,450" aur "about 24 million" mein farak nahi padta.',
        choiceExplanations: [
          'Sabse achha jawab requirement ko challenge karta hai. Twitter, Slack, Gmail — koi exact total nahi dikhata, sab "more" dikhate hain. Sach mein chahiye toh lagbhag count aksar kaafi hai: user ko "24,286,450" aur "about 24 million" mein farak nahi padta.',
          'Bade table par COUNT(*) poori ginti karta hai — har request par seconds lag sakte hain.',
          'Cached number purana ho sakta hai. Exact bolna galat hoga — "lagbhag" bolo, ya taazgi tay karo.',
          'Browser ke paas saare pages nahi hote. Total server hi jaanta hai.',
        ],
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
      success: SD.allTasks(T_CURSOR),
      successText: `Dekha? <b>rows examined 2.4 crore se 50 par aa gaya</b> — aur ab woh
        har page par 50 hi rahega.
        <br><br>Aur teen cheezein tumne saath mein kar li:
        <br>• Index cursor se <b>match</b> karta hai — <code>(created_at, id)</code>
        <br>• API ab <code>?page=</code> ko <b>400</b> deti hai — mehenga sawaal poochha hi nahi ja sakta
        <br>• Cursor <b>opaque</b> hai — kal tum query strategy badal sakte ho, clients nahi tootenge
        <br><br>Sabse achha optimization woh query hai jo <b>kabhi chali hi nahi</b>.`,
      solution: [
        "GET /api/v1/transactions?page=485728&limit=50",
        "CREATE INDEX ix_txn_keyset ON transactions(created_at, id)",
        "sim set api.pagination cursor",
        "GET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50",
        "GET /api/v1/transactions?page=485728&limit=50",
        "cursor decode eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.pagination === 'cursor' && m.index(s, 'transactions', ['created_at', 'id']) && m.current(s, 'http', r => r.keyset && r.rowsExamined <= 100 && r.status === 200) && m.current(s, 'http', r => r.guard === 'noPage'); },
      hints: [
        "Pehle observation: Pehle offset par page=485728 ka dard dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Cursor ke andar kya hai, khud dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?page=485728&limit=50\nCREATE INDEX ix_txn_keyset ON transactions(created_at, id)\nsim set api.pagination cursor\nGET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50\nGET /api/v1/transactions?page=485728&limit=50\ncursor decode eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0",
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
        { answer: 'user_id', explain: "<b>Index ka pehla column filter hona chahiye</b>, phir sort column, phir tie-breaker. User-scoped access mein leading user_id often useful hai;planner/cardinality/version matter karte hain. PostgreSQL 18 skip scan kuch missing-leading-filter cases bhi use kar sakta hai." },
      ],
    },
    {
      type: 'terminal',
      title: '🚚 Legacy API ko bachao',
      goal: 'Ek purani offset API chal rahi hai aur usme 4000 clients hain — tum ise raat ko band nahi kar sakte. Guards lagao taaki nuksaan ruk jaaye jab tak migration poora na ho.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_MIGRATE,
      success: SD.allTasks(T_MIGRATE),
      successText: `Yeh asli duniya ka jawab hai. Tum API ko raat ko nahi badal sakte —
        par <b>nuksaan aaj hi rok sakte ho</b>.
        <br><br><code>maxPageDepth</code> ne sabse mehengi queries band ki,
        <code>maxLimit</code> ne ek request ko bahut bada hone se roka.
        Ab clients ko saaf 400 milta hai jisme likha hai ki kya karna hai —
        timeout ya 500 se hazaar guna behtar.
        <br><br>Agla kadam: page-depth par metric lagao, dekho kaun gehra ja raha hai,
        unse baat karo, aur bade exports ke liye async job API do.`,
      solution: [
        "GET /api/v1/transactions?page=50000&limit=500",
        "sim set api.maxPageDepth 1000",
        "sim set api.maxLimit 100",
        "GET /api/v1/transactions?page=50000&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.maxLimit === 100 && s.sys.api.maxPageDepth === 1000 && m.current(s, 'http', r => r.guard === 'maxDepth' && r.status === 400); },
      hints: [
        "Pehle observation: Legacy offset API par deep page abhi bhi chal raha hai. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab deep page 400 se reject ho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?page=50000&limit=500\nsim set api.maxPageDepth 1000\nsim set api.maxLimit 100\nGET /api/v1/transactions?page=50000&limit=50",
      ],
    },
    {
      type: 'hotspot',
      title: 'Cursor ke hisse',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'cursor',
      questions: [
        { q: 'Same timestamp wale rows gum na hon — iske liye kya chahiye?', target: 'tuple', explain: 'Tuple comparison with tie-breaker: (created_at, id) < (?, ?). Bina id ke, same timestamp wale rows skip ya duplicate ho sakte hain.' },
        { q: 'Cursor client se chhupa (opaque) kyun rakhte hain?', target: 'opaque', explain: "Opaque representation internal strategy ko client contract se decouple karti hai. Expensive/tampered cursors ko server-side signature, scope, expiry aur query bounds se control karo; opacity alone security nahi." },
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
            'Do rows ki sort value same ho sakti hai — bina unique tie-breaker row chhoot ya dohra sakti hai',
            'id saath ho toh user ki permission bhi apne aap jaanch li jaati hai, isliye id rakho',
            'id jodne se sort ko index ki zaroorat hi nahi padti, query apne aap tez ho jaati hai',
            'id saath hone se created_at bhi har row ke liye unique ban jaata hai, bas isliye',
          ],
          answer: 0,
          explain: 'Agar 50 transactions ka created_at bilkul same hai aur page ki seema un 50 ke beech padti hai, toh created_at < ? se ya toh sab chhoot jaayenge ya sab dobara aayenge. Tie-breaker se kram poora (total) ban jaata hai — har row ki ek hi jagah hoti hai.',
          choiceExplanations: [
            'Agar 50 transactions ka created_at bilkul same hai aur page ki seema un 50 ke beech padti hai, toh created_at < ? se ya toh sab chhoot jaayenge ya sab dobara aayenge. Tie-breaker se kram poora (total) ban jaata hai — har row ki ek hi jagah hoti hai.',
            'id kram ke liye hai, permission ke liye nahi. Access ki jaanch alag hoti hai.',
            'Ulta: (created_at, id) par matching index chahiye, tabhi query tez hogi.',
            'created_at unique nahi banta. Jodi (created_at, id) unique banti hai.',
          ],
        },
        {
          q: 'Cursor pagination kis case mein SAHI nahi hai?',
          choices: [
            'Jab user ko sach mein "page 47 par jao" chahiye — jaise chhota admin table',
            'Jab naye records lagataar jud rahe hon — naye records cursor ko gadbad kar dete',
            'Jab stable sort aur filter dono maujood hon — tab cursor kaam nahi karta',
            'Jab user bas "agla page" dabata ho — cursor sirf random page ke liye hai',
          ],
          answer: 0,
          explain: 'Cursor sirf agla/pichhla page deta hai. Dataset chhota ho (10,000 rows) aur user ko random page chahiye, toh offset bilkul theek hai — chhote data par offset ka kharch hi nahi. Cursor deep pagination ka ilaaj hai, har pagination ka nahi.',
          choiceExplanations: [
            'Cursor sirf agla/pichhla page deta hai. Dataset chhota ho (10,000 rows) aur user ko random page chahiye, toh offset bilkul theek hai — chhote data par offset ka kharch hi nahi. Cursor deep pagination ka ilaaj hai, har pagination ka nahi.',
            'Stable sort key ho toh naye records aane se keyset cursor ko offset wali position khisakne ki dikkat nahi. (Sort key khud badle toh row chhoot ya dohra sakti hai.)',
            'Stable sort aur filter ke saath cursor sabse achha chalta hai.',
            '"Agla page" hi cursor ka sabse achha kaam hai. Random page jump cursor nahi deta.',
          ],
        },
        {
          q: 'Cursor ko opaque rakhne ka sabse bada practical faayda?',
          choices: [
            'Baad mein andar ki query badal sakte ho, bina clients tode',
            'Base64 se cursor ke andar ki fields secret ho jaati hain',
            'Opaque cursor ho toh server ko cursor jaanchna nahi padta',
            'Opaque cursor se zaroori index apne aap ban jaata hai',
          ],
          answer: 0,
          explain: 'API evolution ka faisla hai. Client cursor parse karta hai toh client tumhare andar ke schema par nirbhar ho gaya — ab tum sort column ya partition key nahi badal sakte. Opaque cursor aazaadi deta hai. Base64 security nahi — sirf "mat chhuo" ka ishaara; scope, signature aur expiry alag se socho.',
          choiceExplanations: [
            'API evolution ka faisla hai. Client cursor parse karta hai toh client tumhare andar ke schema par nirbhar ho gaya — ab tum sort column ya partition key nahi badal sakte. Opaque cursor aazaadi deta hai. Base64 security nahi — sirf "mat chhuo" ka ishaara; scope, signature aur expiry alag se socho.',
            'Base64 sirf encoding hai, taala nahi — koi bhi decode kar sakta hai.',
            'Cursor phir bhi jaancho: kisi aur user ka ya chheda hua cursor aa sakta hai.',
            'Index tumhe khud banana hai. Cursor ka format index nahi banata.',
          ],
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
          'Keyset: WHERE (created_at, id) < (?, ?), index (user_id, created_at, id), opaque cursor',
          '?last_id=812 — bas id se aage jao, aur sort created_at par hi rehne do',
          '?page=1&limit=50 rakho, aur page par index laga do — deep page bhi tez chalega',
          'Cursor mein sirf created_at rakho — timestamp se aage badhna hi kaafi hai',
        ],
        answer: 0,
        explain: "ID-only cursor ka chhupa hua jaal: <code>last_id</code> tabhi kaam karega jab id ka order sort order jaisa ho. <code>created_at DESC</code> par sort karte hue id se paginate karna galat rows dega. Poora jawab mein <b>tuple comparison + matching index + opaque cursor</b> teenon hone chahiye.",
        choiceExplanations: [
          'ID-only cursor ka chhupa hua jaal: <code>last_id</code> tabhi kaam karega jab id ka order sort order jaisa ho. <code>created_at DESC</code> par sort karte hue id se paginate karna galat rows dega. Poora jawab mein <b>tuple comparison + matching index + opaque cursor</b> teenon hone chahiye.',
          'Sort created_at par aur cursor id par = galat rows. Cursor mein wahi columns jo sort mein.',
          'Page par index nahi lagta — OFFSET phir bhi utni rows padhega.',
          'Ek hi time par kai rows ho sakti hain — tie-breaker id ke bina row chhoot ya dohra sakti hai.',
        ],
      },
      {
        q: '"Tumhare paas 4000 clients hain jo ?page= use kar rahe hain. Migration kaise karoge?"',
        choices: [
          'Dono chalao (next_cursor bhi bhejo), page ki gehraai par hadd aur metric, phir dheere hatao',
          'Ek din announce karke agle hi din ?page= hata do — clients khud badal lenge',
          'Page number ko andar hi andar cursor bana do — clients ko pata bhi nahi chalega',
          'Purane clients ke liye ?page= hamesha bina hadd chalne do, naye clients ko cursor do',
        ],
        answer: 0,
        explain: 'Sabse achha jawab kramik hai aur beech mein bhi nuksaan rokta hai: dono raaste, usage metrics, purane raaste par gehraai ki hadd, bade exports ke liye async API, aur ghoshit deprecation. Page ko andar cursor mein badalna kaam nahi karta — page number ka matlab hi "itni rows aage" hai, ginna padega.',
        choiceExplanations: [
          'Sabse achha jawab kramik hai aur beech mein bhi nuksaan rokta hai: dono raaste, usage metrics, purane raaste par gehraai ki hadd, bade exports ke liye async API, aur ghoshit deprecation. Page ko andar cursor mein badalna kaam nahi karta — page number ka matlab hi "itni rows aage" hai, ginna padega.',
          '4000 clients ek din mein nahi badlenge. Bina migration ke log toot jaayenge.',
          'Page 485728 ka matlab hi "24M rows aage" — bina bookmark ke cursor us page tak nahi pahunchta, ginna padega.',
          'Bina hadd ka purana raasta = dikkat kabhi khatam nahi hogi.',
        ],
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
    { front: 'Cursor opaque kyun?', back: "Kal <b>query strategy badal sako</b> bina clients tode. Tamper protection, scope aur query bounds alag enforce karo; opacity ya Base64 alone security nahi." },
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
            'Filters ke bahut combinations banenge — bina plan jaanche har query sasti rakhne ka vaada nahi',
            'Har column par alag index laga do — optimizer har combination ko jod kar hamesha sasta plan banayega',
            'GraphQL laga do — fields client chunta hai, isliye server ko query ka kharch baandhna nahi padega',
            'Har query ko timeout do — timeout lagte hi allowed filters ke sab combinations saste chalne lagenge',
          ],
          answer: 0,
          explain: 'Sirf 15 columns chunne ya chhodne se 32,768 combinations bante hain. Har combination ka alag index zaroori nahi (DB index jod bhi sakta hai), par har query sasti hogi — guarantee bhi nahi. Asli filters, sort aur data ki matra ke saath plans naap kar allow-list aur query ki hadd tay karo.',
          choiceExplanations: [
            'Sirf 15 columns chunne ya chhodne se 32,768 combinations bante hain. Har combination ka alag index zaroori nahi (DB index jod bhi sakta hai), par har query sasti hogi — guarantee bhi nahi. Asli filters, sort aur data ki matra ke saath plans naap kar allow-list aur query ki hadd tay karo.',
            'Har column ka alag index bhi har combination tez nahi karta — aur har index write ka kharch badhata hai.',
            'GraphQL ko bhi query cost analysis alag se chahiye — apne aap seemit nahi hota.',
            'Timeout sirf dheemi query ko kaat-ta hai; query tez nahi hoti, user ko error milta hai.',
          ],
        },
        {
          q: "?fields=id, amount projection ka possible performance faayda?",
          choices: [
            'Payload chhota; maange columns index mein hon toh table chhuye bina jawab mil sakta hai',
            'fields bhejne se DB matching index khud bana leta hai, toh query tez ho jaati hai',
            'Fields kam hon toh joins apne aap hat jaate hain, aur query halki ho jaati hai',
            'Har DB mein index-only scan pakka ho jaata hai, table kabhi padhni nahi padti',
          ],
          answer: 0,
          explain: 'Bytes bachana chhota fayda hai. Bada fayda: maange gaye saare columns index mein hon, toh DB sirf index padh ke jawab de sakta hai — heap tak jaana nahi padta. Par pakka nahi: PostgreSQL ko visibility map ki shart bhi chahiye. Kitna tez hua, naap ke dekho.',
          choiceExplanations: [
            'Bytes bachana chhota fayda hai. Bada fayda: maange gaye saare columns index mein hon, toh DB sirf index padh ke jawab de sakta hai — heap tak jaana nahi padta. Par pakka nahi: PostgreSQL ko visibility map ki shart bhi chahiye. Kitna tez hua, naap ke dekho.',
            'Index tumhe banana hai. Projection sirf maangta hai, banata nahi.',
            'Joins query ki zaroorat se tay hote hain; field list se apne aap nahi hat-te.',
            'PostgreSQL mein visibility map taaza na ho toh heap phir bhi padhna padta hai. Pakka nahi.',
          ],
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
          'Poochho asli 3-4 filters kaunse; un par index aur allow-list do, baaki search engine',
          'Saare filters allow kar do — client ki zaroorat hai, transaction DB sambhal lega',
          'GraphQL laga do — GraphQL mein har tarah ki search muft mein mil jaati hai',
          'Saare filters allow karo aur query timeout laga do — timeout se API safe hai',
        ],
        answer: 0,
        explain: 'Sahi jawab pehle asli zaroorat poochhta hai — aksar 20 "chahiye" wale filters mein se 3 hi use hote hain. Sach mein arbitrary query chahiye toh search engine (Elasticsearch) ya alag analytics API — transactional API par nahi. Aur GraphQL problem theek nahi karta; GraphQL wahi bina hadd ki problem naye layer par le aata hai (isliye GraphQL mein query cost analysis hoti hai).',
        choiceExplanations: [
          'Sahi jawab pehle asli zaroorat poochhta hai — aksar 20 "chahiye" wale filters mein se 3 hi use hote hain. Sach mein arbitrary query chahiye toh search engine (Elasticsearch) ya alag analytics API — transactional API par nahi. Aur GraphQL problem theek nahi karta; GraphQL wahi bina hadd ki problem naye layer par le aata hai (isliye GraphQL mein query cost analysis hoti hai).',
          'Har combination transaction DB par = kuch queries full scan, aur saare users dheeme.',
          'GraphQL wahi bina hadd ki problem naye layer par le aata hai — query cost analysis alag chahiye.',
          'Timeout sirf kaat-ta hai; mehenga sawaal poochhne ki ijaazat phir bhi rahegi.',
        ],
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
2. Response mein signal:  Deprecation: @1793491200   (1 Nov 2026 se purana, Unix seconds)
                          Sunset: Sat, 01 May 2027 00:00:00 GMT
                          Link: &lt;/docs/migrate&gt;; rel="deprecation"
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
          q: 'Purane clients response ke extra fields ignore karte hain. Kaunsa badlaav purani request ka nateeja chupke se badal dega?',
          choices: [
            'Default page size badal do — client limit na bheje toh response mein zyada rows aayengi',
            'Naya optional filter jodo — client filter na bheje toh pehle wali rows hi milti rahein',
            'Naya optional endpoint jodo — purana endpoint aur response pehle ki tarah chalte rahein',
            'Naya response field jodo — purane fields ka matlab, type aur data pehle jaisa hi rahe',
          ],
          answer: 0,
          explain: 'Field hataana <b>saaf</b> breaking hai — sab jaante hain. Default badalna chhupa hua hai: client ka code bilkul waisa hi hai, request bilkul waisi hi hai, par behaviour badal gaya. Aisi bugs debug karna sabse mushkil hota hai.',
          choiceExplanations: [
            'Field hataana <b>saaf</b> breaking hai — sab jaante hain. Default badalna chhupa hua hai: client ka code bilkul waisa hi hai, request bilkul waisi hi hai, par behaviour badal gaya. Aisi bugs debug karna sabse mushkil hota hai.',
            'Filter optional hai aur bina filter wala purana bartav bacha hai — purani request ka nateeja nahi badalta.',
            'Purana client purana endpoint hi chalata rahega; naya endpoint purana contract nahi badalta.',
            'Sawaal mein clients extra fields ignore karte hain. Purane fields ka contract bacha hai, toh extra field purana client nahi todta.',
          ],
        },
        {
          q: 'Public API ke liye URL versioning ka sabse bada faayda?',
          choices: [
            'Debug aasaan — /v1/ URL aur logs mein dikhta hai; curl aur CDN cache seedhe chalte',
            'Header versioning cache ho hi nahi sakta, isliye URL hi akela raasta bachta hai',
            'URL mein version likhne se bandwidth bachti hai — header chhota rehta hai',
            'REST mein URL ke andar version likhna zaroori niyam hai, warna REST nahi',
          ],
          answer: 0,
          explain: 'Public API mein <b>developer experience</b> sabse zyada matter karta hai. <code>/v1/</code> dikhta hai, share hota hai, curl mein aasan hai, aur CDN ke liye URL hi cache key hai. Header versioning technically zyada elegant hai par practically zyada friction deta hai.',
          choiceExplanations: [
            'Public API mein <b>developer experience</b> sabse zyada matter karta hai. <code>/v1/</code> dikhta hai, share hota hai, curl mein aasan hai, aur CDN ke liye URL hi cache key hai. Header versioning technically zyada elegant hai par practically zyada friction deta hai.',
            'Header versioning bhi cache ho sakta hai (Vary header se) — bas setup zyada.',
            'Bandwidth mein farak lagbhag zero hai. Fayda dikhne aur debug ka hai.',
            'REST version ki jagah tay nahi karta. URL ek aam, aasaan chunav hai.',
          ],
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
          'Naya field jodo, dono bhejo; docs mein deprecate karo, client migration jaanch kar purana hatao',
          'Seedha rename karke patch release mein bhejo — release notes mein purane aur naye naam ki mapping',
          'Ek mahine ka notice do, phir purana field hata do — notice poora hua toh migration bhi poori',
          'Purana field turant hatao, naya bhejo — error aane par clients se baat karke migration kara lo',
        ],
        answer: 0,
        explain: 'Database ka expand-contract pattern, API par: naya field jodo, kuch samay dono bhejo, phir purana hatao. v2 banana bhi kaam karega par bahut mehenga — ek field ke liye poora naya version? Deprecation/Sunset headers rollout mein madad karte hain, par kaunsa field hatega, docs mein saaf likhna padta hai. Aur "changelog mein likh dunga" ka matlab: tum production incident ka intezaar kar rahe ho.',
        choiceExplanations: [
          'Database ka expand-contract pattern, API par: naya field jodo, kuch samay dono bhejo, phir purana hatao. v2 banana bhi kaam karega par bahut mehenga — ek field ke liye poora naya version? Deprecation/Sunset headers rollout mein madad karte hain, par kaunsa field hatega, docs mein saaf likhna padta hai. Aur "changelog mein likh dunga" ka matlab: tum production incident ka intezaar kar rahe ho.',
          'Release notes client ka parser nahi badalte. Purana field hatte hi purane naam par nirbhar code tootega.',
          'Notice dene se migration pakki nahi hoti. Dono fields response mein hon toh aam server logs nahi batate ki client kaunsa field padhta hai — SDK telemetry ya client ki tasdeeq se jaancho.',
          'Errors aane tak client kaam band kar chuka hoga. Dono fields saath dekar migration ka waqt do.',
        ],
      },
      {
        q: '"Kab v2 banaoge?"',
        choices: [
          'Jab contract aisa badle ki additive raasta bache hi na — jaise poora resource model',
          'Har calendar saal ek naya v2 — clients ko pata rahega ki kab badalna hai, bas',
          'Jab bhi andar ka code refactor ho — public API ko bhi naya version de do',
          'Jab bhi naya optional field jude — har naye field ke saath naya version',
        ],
        answer: 0,
        explain: 'Har version ek lamba maintenance bojh hai — v1 ko saalon tak chalana padega. Isliye additive raasta ho toh additive; jab contract sach mein incompatible badle (jaise poora resource model), tab naya version ya naya endpoint. Kai fundamental changes hon toh ek saath "batch" karo. (Ek field ke liye bhi version ban sakta hai — pakka niyam nahi; par aksar additive raasta mil jaata hai.)',
        choiceExplanations: [
          'Har version ek lamba maintenance bojh hai — v1 ko saalon tak chalana padega. Isliye additive raasta ho toh additive; jab contract sach mein incompatible badle (jaise poora resource model), tab naya version ya naya endpoint. Kai fundamental changes hon toh ek saath "batch" karo. (Ek field ke liye bhi version ban sakta hai — pakka niyam nahi; par aksar additive raasta mil jaata hai.)',
          'Har version saalon ka maintenance bojh hai. Calendar wajah nahi, zaroorat wajah hai.',
          'Andar ka refactor client ko nahi dikhta. Contract nahi badla toh version nahi.',
          'Naya optional field additive hai — purane clients nahi toot-te.',
        ],
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
          'Sahi status, stable machine code, developer ke liye message, galat field, aur trace_id',
          'Error message ke saath poora stack trace aur DB ki details — debug aasaan rahega',
          'Sirf ek insaani message — client message ki string parse karke samajh lega',
          'Har error ko 200 OK bana ke bhejo, aur body mein error likh do, bas itna',
        ],
        answer: 0,
        explain: 'Sabse achha jawab batata hai ki har hissa kis ke liye hai: status → HTTP layer, code → client ka code, message → developer, field → UI, trace_id → support. Aur stack trace response mein bhejna security issue hai.',
        choiceExplanations: [
          'Sabse achha jawab batata hai ki har hissa kis ke liye hai: status → HTTP layer, code → client ka code, message → developer, field → UI, trace_id → support. Aur stack trace response mein bhejna security issue hai.',
          'Stack trace aur DB details response mein = security issue. Details logs mein rakho.',
          'Message badalte rehte hain — client ko stable code chahiye jis par switch kare.',
          '200 ka matlab sab theek — monitoring aur retry dono dhokha khaate hain.',
        ],
      },
      {
        q: '"Ek user ne signup kiya par email already exists. Kya bhejoge?"',
        choices: [
          'Depends — public signup par "email hai" batana enumeration hai; generic jawab do',
          'Har caller ko saaf batao ki email registered hai — 409, hamesha aur har jagah',
          '500 bhej do — conflict server ki andar ki baat hai, client ko kya batana hai',
          'Generic jawab de do, aur maan lo ki email sach mein isi signup wale ka hai',
        ],
        answer: 0,
        explain: 'Jawab security tradeoff pehchaanta hai. Public signup par "email registered hai" batana attacker ko bata deta hai ki kaunse emails tumhare paas hain. Kai products isliye "humne email bhej diya" bolte hain, account ho ya na ho. Authenticated ya internal API mein 409 + /errors/email-taken theek hai.',
        choiceExplanations: [
          'Jawab security tradeoff pehchaanta hai. Public signup par "email registered hai" batana attacker ko bata deta hai ki kaunse emails tumhare paas hain. Kai products isliye "humne email bhej diya" bolte hain, account ho ya na ho. Authenticated ya internal API mein 409 + /errors/email-taken theek hai.',
          'Public signup par "email registered hai" batana attacker ko emails ki list de deta hai. Internal/authenticated API mein 409 theek.',
          'Conflict client ki request ka masla hai, server ka bug nahi. 500 galat signal.',
          'Generic jawab enumeration rokta hai, ownership saabit nahi karta — confirmation email se pakka karo.',
        ],
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
     <p><b>4. TTL documented retry/recovery window se choose karo.</b> Hamesha rakhne se table
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
      success: SD.allTasks(T_IDEM),
      successText: `Dhyaan do ki pehli do requests mein <b>do alag payment IDs</b> bane —
        yahi asli duniya ka double charge hai.
        <br><br>Idempotency on hone ke baad wahi key dobara bhejne par
        <code>x-idempotent-replay: true</code> aaya aur <b>wahi purana jawab</b> mila.
        <br><br>Yaad rakho: key <b>client</b> banata hai (server banayega toh retry par nayi
        ban jaayegi), server use <b>unique constraint</b> ke saath store karta hai
        (app-level check race condition hai), aur <b>response bhi</b> store hota hai —
        sirf key nahi.`,
      solution: [
        "POST /v1/payments -H 'Idempotency-Key: pay-1'",
        "POST /v1/payments -H 'Idempotency-Key: pay-1'",
        "sim set api.idempotency true",
        "POST /v1/payments -H 'Idempotency-Key: order-8812'",
        "POST /v1/payments -H 'Idempotency-Key: order-8812'",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.idempotency === true && !!s.sys.seenKeys['order-8812'] && m.current(s, 'http', r => r.idem === 'replay' && r.key === 'order-8812'); },
      hints: [
        "Pehle observation: Bina idempotency ke do baar POST karo — do charge ban jaayenge. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Wahi key dobara bhejo — replay milna chahiye, naya charge nahi. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nPOST /v1/payments -H 'Idempotency-Key: pay-1'\nPOST /v1/payments -H 'Idempotency-Key: pay-1'\nsim set api.idempotency true\nPOST /v1/payments -H 'Idempotency-Key: order-8812'\nPOST /v1/payments -H 'Idempotency-Key: order-8812'",
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
          q: "Idempotency key ki sabse zaroori property kya hai?",
          choices: [
            'Retry par wahi key jaaye — operation ki pehchaan retry ke paar zinda rahe',
            'Har retry par nayi UUID bhejo — taaki har request alag aur saaf pehchani jaaye',
            'Key sirf server bana sakta hai — client ki banayi key kabhi bharose layak nahi',
            'Same payload hi pehchaan hai — body same ho toh key ki zaroorat hi nahi padti',
          ],
          answer: 0,
          explain: 'Doosri request pehli ki copy hai — baat sirf client jaanta hai. Server ke liye dono alag requests hain (pehli ka jawab shayad kho gaya tha). Isliye operation ki pehchaan (key) retry ke paar stable rehni chahiye: client UUID banaye, ya server pehle se key de jise client har retry mein bheje.',
          choiceExplanations: [
            'Doosri request pehli ki copy hai — baat sirf client jaanta hai. Server ke liye dono alag requests hain (pehli ka jawab shayad kho gaya tha). Isliye operation ki pehchaan (key) retry ke paar stable rehni chahiye: client UUID banaye, ya server pehle se key de jise client har retry mein bheje.',
            'Nayi key = server ke liye naya operation. Deduplication toot jaayegi — doosra charge.',
            'Client UUID aam hai; server bhi pehle se key de sakta hai jise client dobara bheje. Shart: retry mein wahi key.',
            'Do alag users theek same amount bhej sakte hain — do alag payments. Body pehchaan nahi.',
          ],
        },
        {
          q: 'Key ko DB unique constraint se kyun store karte hain, app check se kyun nahi?',
          choices: [
            'Do retries theek ek saath aa sakti hain — app ka "check karke insert" dono ko pass kar dega',
            'SELECT phir INSERT race-free hota hai, bas DB constraint thoda zyada tez chalta hai',
            'Ek hi process mein retries kabhi saath nahi aati, toh constraint sirf extra safety hai',
            'DB tez hai, toh duplicate banne ka mauka hi nahi milta — isliye key DB mein rakho',
          ],
          answer: 0,
          explain: 'Wahi check-then-act race jo Boundaries level mein thi. Aur yahan concurrency hi asli scenario hai — retries aksar ek saath aati hain (jaise network wapas aate hi). App check yahan bekaar hai; sirf DB ka unique constraint atomic hai.',
          choiceExplanations: [
            'Wahi check-then-act race jo Boundaries level mein thi. Aur yahan concurrency hi asli scenario hai — retries aksar ek saath aati hain (jaise network wapas aate hi). App check yahan bekaar hai; sirf DB ka unique constraint atomic hai.',
            'SELECT kuch lock nahi karta. Do saath aayi requests dono ko "key nahi mili" dikhega.',
            'Retries alag processes, alag servers se bhi aati hain — network wapas aate hi saath-saath.',
            'Raftaar race nahi rokti. Sirf atomic constraint rokta hai.',
          ],
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
          'Idempotency-Key: client key bheje, server key + result atomic rakhe, dobara par wahi jawab',
          'Payment button disable kar do — double click nahi hoga toh double charge bhi nahi hoga',
          'Key ko server ki memory mein rakho, commit ke baad — restart par bhi kaam chal jaayega',
          'Har retry par nayi key banao — taaki har koshish saaf alag dikhe aur gadbad na ho',
        ],
        answer: 0,
        explain: 'UI fixes (button disable) network retry se nahi bachate — aur network retry hi asli wajah hai. DB transaction bhi nahi bachata: do alag requests, do alag transactions. Poora jawab: stable key ko atomic unique write se claim karo; payload hash, status aur result rakho; adhoore (in-progress) kaam aur crash ke cases sambhalo; same key + alag body = mana (aksar 409 ya 422 — contract mein likho). Provider ko bhi apni idempotency key bhejo.',
        choiceExplanations: [
          'UI fixes (button disable) network retry se nahi bachate — aur network retry hi asli wajah hai. DB transaction bhi nahi bachata: do alag requests, do alag transactions. Poora jawab: stable key ko atomic unique write se claim karo; payload hash, status aur result rakho; adhoore (in-progress) kaam aur crash ke cases sambhalo; same key + alag body = mana (aksar 409 ya 422 — contract mein likho). Provider ko bhi apni idempotency key bhejo.',
          'Button network retry ko nahi rokta — aur asli wajah wahi network retry hai.',
          'Memory restart par khaali ho jaati hai, aur doosre server ko pata hi nahi. Key DB mein, atomic.',
          'Nayi key = naya payment. Retry mein wahi key jaani chahiye.',
        ],
      },
      {
        q: "Idempotency-key retention kaise choose karoge?",
        choices: [
          'Sabse lambi retry/recovery window se lamba rakho, par hadd ke saath — phir cleanup',
          'Har API par pakka 5 minute — chhota TTL, chhoti table, aur kaam khatam',
          'Payment settle hote hi key hata do — settle ke baad retry ka sawaal hi nahi',
          'Hamesha ke liye rakho — safety ke liye, table badhti hai toh badhne do',
        ],
        answer: 0,
        explain: 'Soch: sabse lambi retry window se lamba, par hadd ke saath. Expiry ke baad wahi key naya operation maani ja sakti hai. Bahut se payment providers ~24 ghante rakhte hain — par 24 ghante pakka niyam nahi; apne API contract aur business se chuno, aur privacy/storage ki hadd bhi dekho.',
        choiceExplanations: [
          'Soch: sabse lambi retry window se lamba, par hadd ke saath. Expiry ke baad wahi key naya operation maani ja sakti hai. Bahut se payment providers ~24 ghante rakhte hain — par 24 ghante pakka niyam nahi; apne API contract aur business se chuno, aur privacy/storage ki hadd bhi dekho.',
          'Kuch clients ghanton baad retry karte hain (offline phone, queue). 5 minute baad wahi key = naya payment.',
          'Settle hone ke baad bhi purana retry aa sakta hai — tab naya charge ban jaayega.',
          'Hamesha rakhne se table aur unique index lagataar badhte hain. Hadd chahiye.',
        ],
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
    { front: 'Key ka TTL?', back: "<b>Supported retry/recovery window ko cover karo.</b>24 hours ya 7 days examples hain, universal rule nahi. Hamesha rakhne se table aur uska unique index anant badhenge." },
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
      success: SD.allTasks(T_RL),
      successText: `Dhyaan do ki 429 ke saath <code>retry-after</code> aur
        <code>ratelimit-*</code> headers bhi aaye.
        <br><br>Woh headers optional nahi hain: <b>Retry-After ke bina client turant
        dobara maarega</b> — aur tumne rate limit lagayi hi isliye thi ki na maare.
        Achhe clients toh <code>ratelimit-remaining</code> dekh ke pehle hi dheeme
        ho jaate hain, 429 tak pahunchte hi nahi.`,
      solution: [
        "GET /api/v1/transactions -n 200",
        "sim add ratelimit --rps 100 --burst 150",
        "GET /api/v1/transactions -n 300",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.rateLimit?.rps === 100 && s.sys.api.rateLimit?.burst === 150 && m.current(s, 'http', r => r.status === 429 && r.blocked > 0); },
      hints: [
        "Pehle observation: Bina limit ke burst bhejo — sab 200 milega. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab burst bhejo aur 429 khaao. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions -n 200\nsim add ratelimit --rps 100 --burst 150\nGET /api/v1/transactions -n 300",
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
        { left: '🔴 Redis (counter store) down ho gaya', right: 'Risk ke hisaab se degraded quota ya fail-closed', explain: 'Fail-open availability preserve kar sakta hai,par abuse/payment/cost-sensitive routes ko bounded local policy ya fail-closed chahiye. Default product risk se choose/test karo.' },
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
          'Token bucket API key par; IP sirf anonymous ke liye; limiter down ki policy pehle tay',
          'Sirf IP par fixed window counter — har logged-in user ko bhi IP se hi gino, bas',
          'Redis down ho toh har route par fail open — hamesha, bina route ka risk soche',
          'Har request ke beech pakka gap rakho — burst bilkul na aane do, kabhi bhi nahi',
        ],
        answer: 0,
        explain: 'Achha jawab teen cheezein cover karta hai: algorithm + kyun (token bucket: seemit burst, jo asli traffic ka shape hai), key (API key/tenant; IP sirf anonymous ke liye), aur failure mode (limiter down ho toh fail open ya closed — route ke risk se pehle tay karo). Aakhri wala sabse zyada seniority dikhata hai.',
        choiceExplanations: [
          'Achha jawab teen cheezein cover karta hai: algorithm + kyun (token bucket: seemit burst, jo asli traffic ka shape hai), key (API key/tenant; IP sirf anonymous ke liye), aur failure mode (limiter down ho toh fail open ya closed — route ke risk se pehle tay karo). Aakhri wala sabse zyada seniority dikhata hai.',
          'Office ke 500 log ek IP se aate hain, aur attacker ke paas 500 IP hote hain. Logged-in user ko pehchaan se gino.',
          'Fail open ya closed risk par depend karta hai — login ya payment par fail open khatarnak ho sakta hai.',
          'Asli traffic burst mein aata hai. Pakka gap har sahi burst ko bhi mana karega.',
        ],
      },
      {
        q: '"429 ke saath kya bhejoge?"',
        choices: [
          'Retry-After, bache quota ki jaankari aur stable error code — client waqt aur wajah dono samjhe',
          'Body mein intezaar ka message likho — client message ke shabdon se retry ka waqt nikaal le',
          'Sirf quota ki kul limit do — client bachi capacity aur reset ka waqt andaaze se nikaal le',
          'Body mein poori limit policy likho — client har error par policy padh ke retry ka waqt chune',
        ],
        answer: 0,
        explain: 'Retry-After se client ko retry ka waqt milta hai. Quota ki jaankari (bacha hua, reset) se client pehle hi dheema ho sakta hai, aur stable code se error sambhal sakta hai. Header maanna client par depend hai — header na ho toh client ko apna seemit backoff chahiye. Headers ka exact naam aur format API contract mein likho.',
        choiceExplanations: [
          'Retry-After se client ko retry ka waqt milta hai. Quota ki jaankari (bacha hua, reset) se client pehle hi dheema ho sakta hai, aur stable code se error sambhal sakta hai. Header maanna client par depend hai — header na ho toh client ko apna seemit backoff chahiye. Headers ka exact naam aur format API contract mein likho.',
          'Message ka text badal ya translate ho sakta hai. Retry ka waqt machine ke padhne layak header mein do.',
          'Kul limit se bacha quota ya reset ka waqt nahi milta. Client ko bina andaaze kaam karne layak jaankari do.',
          'Policy ka text har mana hui request ka retry waqt nahi batata. Abhi ka haal aur retry ka waqt machine ke padhne layak bhejo.',
        ],
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
    { front: 'Rate limiter ka store down ho toh?', back: 'Risk-based failure policy:bounded local limit,explicit fail-open ya fail-closed. Security/financial abuse-sensitive endpoints ko unavailable quota store par unlimited access mat do.' },
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
            { id: 'page', label: "GET ?page=&limit= — page size par hadd, depth khuli", score: -3,
              why: 'Deep offset. Page 4,85,728 par DB ko 2.4 crore rows padh ke phenkni padengi — 7 second, ek connection bandhak, aur buffer pool trash.' },
            { id: 'cursor', label: "GET ?cursor=&limit= — opaque cursor se agla page", score: 3,
              why: 'Keyset pagination. Har page ka cost same — ek seek + 50 rows. Opaque cursor se tum baad mein query strategy badal sakte ho.' },
            { id: 'both', label: "Dono saath — purane page par gehraai ki hadd", score: 2,
              why: 'Migration ke DAURAN sahi hai — purane clients chalte rahenge aur nuksaan bounded hai. Par yeh manzil nahi, raasta hai.' },
          ],
        },
        {
          id: 'total', label: '"total" field', icon: '🧮',
          note: 'UI ko "1-50 of 24,286,450" dikhana hai',
          options: [
            { id: 'exact', label: "Har response mein taaza exact COUNT(*)", score: -3,
              why: 'Har request par ek poora COUNT(*) — 24M rows par ~2.7 s. LIMIT ise nahi rokta. Yeh akela hi SLO tod dega.' },
            { id: 'hasmore', label: "Sirf has_more + next cursor, total nahi", score: 3,
              why: 'Twitter, Slack, Gmail — koi exact total nahi dikhata. Sabse sasta aur 95% cases mein kaafi.' },
            { id: 'approx', label: "Cache se lagbhag total (\"about 24M\")", score: 2,
              why: 'Agar product ko sach mein number chahiye toh yeh sahi samjhauta hai. "About 24 million" aur "24,286,450" mein user ko koi farak nahi.' },
          ],
        },
        {
          id: 'pay', label: 'POST /payments', icon: '💳',
          note: 'Mobile app network drop par retry karta hai',
          options: [
            { id: 'plain', label: "Saada POST — koi operation ID nahi", score: -3,
              why: 'Network timeout par client retry karega aur DOOSRA charge ban jaayega. Client jaan hi nahi sakta ki request pahunchi thi ya jawab kho gaya.' },
            { id: 'idem', label: "POST + stable Idempotency-Key header", score: 3,
              why: 'Sahi. Server key ko unique constraint ke saath response ke SAATH store kare, aur dobara aane par wahi response lauta de.' },
            { id: 'dedupe', label: "Body ka hash hi operation ki pehchaan", score: -1,
              why: 'Toota hua: do alag users theek same amount bhej sakte hain — woh do jaayaz payments hain, duplicate nahi. Key client ko banani hi hogi.' },
          ],
        },
        {
          id: 'bulk', label: 'Partner ka bulk export', icon: '📦',
          note: 'Roz raat ko poora data chahiye',
          options: [
            { id: 'biglimit', label: "Ek bada sync response, saari rows ek saath", score: -3,
              why: 'Ek request poori memory kha jaayegi, ek connection ghanton block karegi, aur timeout par partner poora retry karega.' },
            { id: 'job', label: "Async export job — status URL + download", score: 3,
              why: 'Bade exports sync API par hone hi nahi chahiye. Job banao, background mein file banao, download link do. Yeh sync API ko poori tarah bacha leta hai.' },
            { id: 'cursorbulk', label: "Transaction cursor API, partner loop mein chalaye", score: 1,
              why: 'Chal jaayega aur bounded bhi hai — par 2.4 crore rows ke liye 4.8 lakh requests. Rate limit ke saath ghanton lagenge. Export job behtar hai.' },
          ],
        },
        {
          id: 'err', label: 'Error format', icon: '🚨',
          note: 'Client ko pata chalna chahiye ab kya karna hai',
          options: [
            { id: 'always200', label: "200 OK, aur body mein error likh do", score: -3,
              why: 'Status jhooth bol raha hai. Har HTTP client, retry library aur monitoring tool ko lagega sab theek hai. Yeh silent failures banata hai.' },
            { id: 'problem', label: "Sahi status + problem+json details", score: 3,
              why: 'Client stable `type` par switch kar sakta hai, UI field-level error dikha sakta hai, aur support trace_id se seedha logs mein ja sakta hai.' },
            { id: 'code', label: "Sahi status + apna stable error code", score: 1,
              why: 'Bura nahi — status aur code dono hain. Par trace_id aur field-level details ke bina debugging aur form UX dono mushkil rahenge.' },
          ],
        },
        {
          id: 'rl', label: 'Rate limiting', icon: '🚦',
          note: 'Partner sync raat ko bahut traffic bhejta hai',
          options: [
            { id: 'none', label: "Partner bharosemand hai — koi quota nahi chahiye", score: -3,
              why: 'Ek buggy retry loop ya galti se do baar chala sync poora product gira dega. "Bharosemand client" ek architecture decision nahi hai.' },
            { id: 'ip', label: "Sirf IP par ek fixed request limit laga do", score: -1,
              why: 'IP galat key hai: ek office ke 500 log ek IP se aate hain, aur attacker ke paas 500 IP hote hain. Aur mehengi requests sasti jaisi hi gini jaayengi.' },
            { id: 'weighted', label: "API key par quota, mehngi request zyada gine", score: 3,
              why: 'Sahi key (API key), sahi shape (burst allowed), sahi cost model (export mehenga), aur client ko batata hai ki kab dobara aaye.' },
          ],
        },
      ],
      verdicts: {
        great: 'Har decision production-grade hai. Design bounded queries aur safe retry intent ki direction mein hai;real capacity,crash recovery aur external payment idempotency test karna baaki hai.',
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
      success: SD.allTasks(T_BOSS_API),
      successText: `Ek line mein poora track:
        <br><br><b>Achhi API woh hai jiska naam guess kiya ja sake, jiski cost bounded ho,
        jiske errors actionable hon, aur jise surakshit retry kiya ja sake.</b>
        <br><br>Tumne aaj chaaron kiye: cursor se cost bounded ki, guards se mehenge sawaal band kiye,
        <code>total</code> hata ke chhupa hua COUNT(*) nikala, aur rate limit se ek client ko sab
        kuch kha jaane se roka.`,
      solution: [
        "GET /api/v1/transactions?page=485728&limit=50",
        "CREATE INDEX ix_keyset ON transactions(created_at, id)",
        "sim set api.countTotal false",
        "sim set api.pagination cursor",
        "GET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50",
        "sim set api.maxLimit 100",
        "sim add ratelimit --rps 100 --burst 150",
        "GET /api/v1/transactions?limit=1000",
        "GET /api/v1/transactions?page=485728&limit=50",
        "GET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50 -n 300",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.countTotal === false && s.sys.api.pagination === 'cursor' && s.sys.api.maxLimit === 100 && s.sys.api.rateLimit?.rps === 100 && s.sys.api.rateLimit?.burst === 150 && m.index(s, 'transactions', ['created_at', 'id']) && m.current(s, 'http', r => r.guard === 'maxLimit') && m.current(s, 'http', r => r.guard === 'noPage') && m.current(s, 'http', r => r.status === 429 && r.blocked > 0); },
      hints: [
        "Pehle observation: Deep offset ka dard dikhao. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Rate limit lagao. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?page=485728&limit=50\nCREATE INDEX ix_keyset ON transactions(created_at, id)\nsim set api.countTotal false\nsim set api.pagination cursor\nGET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50\nsim set api.maxLimit 100\nsim add ratelimit --rps 100 --burst 150\nGET /api/v1/transactions?limit=1000\nGET /api/v1/transactions?page=485728&limit=50\nGET /api/v1/transactions?cursor=eyJ0IjoiMjAyNi0wNC0xMVQwOToyMjowNFoiLCJpZCI6ODgxMjMwNH0&limit=50 -n 300",
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
          'Jiska naam andaaza lagaya ja sake, kharch seemit ho, errors kaam ke hon, retry safe ho',
          'Jo REST standard follow kare — REST ka naam hi sahi hone ki guarantee hai',
          'Jo tez ho — median latency kam ho toh API apne aap achhi maani jaayegi',
          'Jiski documentation achhi ho — docs achhe hon toh bina hadd ka kharch bhi theek',
        ],
        answer: 0,
        explain: 'Chaaron cheezein alag khatre se bachati hain: andaaza lagane layak naam (developer experience), seemit kharch (production bachana), kaam ke errors (client ka bartav), safe retry (correctness). Documentation zaroori hai — par achhi API ko docs ki utni zaroorat hi nahi padti.',
        choiceExplanations: [
          'Chaaron cheezein alag khatre se bachati hain: andaaza lagane layak naam (developer experience), seemit kharch (production bachana), kaam ke errors (client ka bartav), safe retry (correctness). Documentation zaroori hai — par achhi API ko docs ki utni zaroorat hi nahi padti.',
          'REST ek style hai. Naam se kharch seemit ya retry safe nahi hota.',
          'Tez median ke saath bhi bina hadd ki query ya double charge ho sakta hai.',
          'Docs zaroori hain, par bina hadd ka kharch production gira dega — docs se nahi bachega.',
        ],
      },
      {
        q: '"Tumhare paas ek endpoint hai jispar ek partner roz 2.4 crore rows sync karta hai. Kya karoge?"',
        choices: [
          'Sync API se hata ke async export job — 202 + status URL + download link do',
          'Partner ke liye ek hi request mein saari 2.4 crore rows ek saath bhej do',
          'Partner ko alag replica de do — replica par response jitna bada ho, chalega',
          'Cursor ke saath loop karne bolo — har page taaza, toh export bhi pakka consistent',
        ],
        answer: 0,
        explain: 'Sahi tool ka sawaal hai. Sync list API interactive browsing ke liye hai. 2.4 crore rows ka bulk transfer batch job hai — ek HTTP request mein daalne ki koshish timeouts, retries aur memory problems degi. (Cursor loop bhi chal jaayega par 4.8 lakh requests lagenge.)',
        choiceExplanations: [
          'Sahi tool ka sawaal hai. Sync list API interactive browsing ke liye hai. 2.4 crore rows ka bulk transfer batch job hai — ek HTTP request mein daalne ki koshish timeouts, retries aur memory problems degi. (Cursor loop bhi chal jaayega par 4.8 lakh requests lagenge.)',
          'Ek request poori memory kha jaayegi, connection ghanton bandha, timeout par sab dobara.',
          'Replica DB ka bojh hataata hai, par ek bade response ki memory aur timeout wahi rehte hain.',
          'Cursor loop chal jaayega (4.8 lakh requests), par har page alag pal ka data dikhata hai — poora export ek hi pal ka nahi hoga.',
        ],
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
       <tr><td>Verify karne mein</td><td>✅ local signature + issuer/audience/time validation possible; policy may add state checks</td><td>❌ har request par store lookup</td></tr>
       <tr><td>Turant revoke</td><td>⚠️ pure local signature/expiry checks mein expiry tak valid; immediate revoke ko deny list/introspection/version policy chahiye</td><td>✅ row delete karo, khatam</td></tr>
       <tr><td>Size</td><td>~800 bytes, har request ke saath</td><td>~40 bytes (bas ek id)</td></tr>
       <tr><td>Scale</td><td>✅ stateless — koi bhi node verify kar le</td><td>⚠️ shared store (Redis) chahiye</td></tr>
       <tr><td>Data purana ho jaana</td><td>❌ role token ke andar chhap gaya hai</td><td>✅ hamesha taaza</td></tr>
     </table>
     <p>Practical raasta jo dono ka faayda leta hai:</p>
     <pre>access token   JWT, umar 5–15 minute      ← har request iske saath
refresh token  opaque, server ke paas,     ← sirf naya access token lene ke liye
               umar 30 din, REVOKE ho sakta hai</pre>
     <p>Given 15-minute access token aur no immediate revocation check, refresh credential revoke karne ke baad existing access expiry tak valid reh sakta hai. Sensitive products ko deny list, token version ya introspection se shorter revoke window chahiye. 5–15 minute aur 30-day refresh duration examples hain; theft risk, rotation aur client recovery se policy choose karo.</p>
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
      success: SD.allTasks(T_AUTH),
      successText: `Tumne API ki sabse aam vulnerability apne haath se banayi aur band ki.
        Yaad rakho: <b>identity token se, scope token se, ownership check har resource par.</b>
        Aur 401 ≠ 403 — client dono ka bilkul alag matlab nikaalta hai.`,
      solution: [
        "GET /api/v1/transactions?user_id=8&limit=5",
        "sim set api.auth body",
        "GET /api/v1/transactions?user_id=8&limit=5",
        "sim set api.auth header",
        "GET /api/v1/transactions?limit=5",
        "GET /api/v1/transactions?limit=5 -H 'Authorization: Bearer expired'",
        "GET /api/v1/transactions?user_id=7&limit=5 -H 'Authorization: Bearer u7'",
        "GET /api/v1/transactions?user_id=8&limit=5 -H 'Authorization: Bearer u7'",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.auth === 'header' && m.current(s, 'http', r => r.status === 403 && r.actedAs === '7' && r.claimed === '8'); },
      hints: [
        "Pehle observation: Bina kisi auth ke kisi aur user ka data maango — dekho, mil jaata hai. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Apne token se KISI AUR ka data maango — 403 aana chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/transactions?user_id=8&limit=5\nsim set api.auth body\nGET /api/v1/transactions?user_id=8&limit=5\nsim set api.auth header\nGET /api/v1/transactions?limit=5\nGET /api/v1/transactions?limit=5 -H 'Authorization: Bearer expired'\nGET /api/v1/transactions?user_id=7&limit=5 -H 'Authorization: Bearer u7'\nGET /api/v1/transactions?user_id=8&limit=5 -H 'Authorization: Bearer u7'",
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
        { q: 'Access token ki umar chhoti kyun rakhte hain?', target: 'short', explain: "Pure signature/expiry-only validation revoked user ko expiry tak allow kar sakti hai. Short access lifetime exposure bound karti hai; immediate revocation ko stateful policy chahiye. Refresh credentials ko protected storage, rotation aur revocation chahiye." },
      ],
    },
    {
      type: 'quiz',
      title: 'Auth ki samajh',
      questions: [
        {
          q: 'Gateway ne token verify kar liya. Ab service ke andar aur kya check karna zaroori hai?',
          choices: [
            'Ownership — order isi user ka hai, aur user ko action ki ijaazat hai?',
            'Kuch nahi — JWT valid hai, toh jo bhi order maange, seedha laut do',
            'URL ki user ID ko hi caller ki pehchaan maan lo — wahi sabse seedha hai',
            'Frontend mein button chhupa hai, toh permission apne aap ho gayi samjho',
          ],
          answer: 0,
          explain: 'Gateway sirf authentication karta hai — "token asli hai, user 7 hai". Par "order #9912 user 7 ka hai ya nahi" — sirf orders service jaanti hai, kyunki data orders service ke paas hai. Ownership check chhootna hi sabse aam data leak hai.',
          choiceExplanations: [
            'Gateway sirf authentication karta hai — "token asli hai, user 7 hai". Par "order #9912 user 7 ka hai ya nahi" — sirf orders service jaanti hai, kyunki data orders service ke paas hai. Ownership check chhootna hi sabse aam data leak hai.',
            'Valid token batata hai kaun hai — kaunsa order dekh sakta hai, nahi. Ownership check chhootna sabse aam leak hai.',
            'URL ki ID koi bhi badal sakta hai. Pehchaan token se aati hai, URL se nahi.',
            'Button chhupane se API band nahi hoti — koi bhi seedha request bhej sakta hai.',
          ],
        },
        {
          q: "24 hour JWT sirf signature/exp se validate hota hai; revocation check nahi. User block karne par?",
          choices: [
            'User 24 ghante tak andar reh sakta hai — bina revocation ke server JWT wapas nahi le sakta',
            'Logout karte hi JWT ki saari copies apne aap har jagah se delete ho jaayengi',
            'Agli request par user apne aap block — JWT turant khud cancel ho jaata hai',
            'Signature key badal do — sirf us ek user ka token band ho jaayega, baaki chalte rahenge',
          ],
          answer: 0,
          explain: 'Sirf local validation ho (signature + expiry), toh block kiye user ka access token expiry tak chal sakta hai. Turant rokne ke liye deny list, token version ya introspection jaisi policy chahiye. Nayi signing key se naye tokens banana purane tokens ko band nahi karta; purani verification key maanna band karo, tab purani key wale saare tokens fail honge. Chhoti umar ka access token + revocable refresh token khatra ghataate hain — turant revoke ki guarantee nahi dete.',
          choiceExplanations: [
            'Sirf local validation ho (signature + expiry), toh block kiye user ka access token expiry tak chal sakta hai. Turant rokne ke liye deny list, token version ya introspection jaisi policy chahiye. Nayi signing key se naye tokens banana purane tokens ko band nahi karta; purani verification key maanna band karo, tab purani key wale saare tokens fail honge. Chhoti umar ka access token + revocable refresh token khatra ghataate hain — turant revoke ki guarantee nahi dete.',
            'JWT client ke paas hai; server copies delete nahi kar sakta. Signature valid hai toh chalta rahega.',
            'Bina revocation check ke server ko pata hi nahi ki user block hai.',
            'Key rotation ek user ko chun ke block nahi karti. Purani key maanna jaari rahe toh purane tokens chalenge; purani key reject karo toh us key ke saare tokens fail honge.',
          ],
        },
        {
          q: 'Naya endpoint bana aur auth lagana bhool gaye. Isse bachne ka sabse pakka tareeka?',
          choices: [
            'Framework mein default DENY — public endpoint ko alag se public mark karna pade',
            'Endpoint ke naam mein "public" likho — naam se sab ko pata rahega kaunsa khula',
            'Code review checklist banao — checklist se bhoolna namumkin ho jaayega',
            'Frontend se URL chhupa do — URL pata hi nahi toh koi call nahi karega',
          ],
          answer: 0,
          explain: 'Checklists insaan par nirbhar hain, aur insaan bhoolta hai. <b>Default-deny</b> galti ko structurally impossible bana deta hai: bhoolne ka natija "sabke liye khula" nahi, "sabke liye band" hai. Bhool pakdi jaati hai kyunki endpoint <b>kaam hi nahi karta</b> — chupchaap leak nahi hota.',
          choiceExplanations: [
            'Checklists insaan par nirbhar hain, aur insaan bhoolta hai. <b>Default-deny</b> galti ko structurally impossible bana deta hai: bhoolne ka natija "sabke liye khula" nahi, "sabke liye band" hai. Bhool pakdi jaati hai kyunki endpoint <b>kaam hi nahi karta</b> — chupchaap leak nahi hota.',
            'Naam security nahi hai. Server ko niyam chahiye, naam nahi.',
            'Checklist insaan par nirbhar hai, aur insaan bhoolta hai. Default deny galti ko band kar deta hai.',
            'URL network tab mein dikh jaata hai. Chhupana taala nahi.',
          ],
        },
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa auth mechanism kahan',
      pairs: [
        { left: 'Public REST API, third-party developers', right: 'API key + rate limit per key', explain: 'Key se tum <b>caller</b> pehchante ho (user nahi), aur usi par quota aur billing lagti hai. Key rotate karne layak honi chahiye.' },
        { left: 'Browser SPA, apna hi backend', right: 'HttpOnly + Secure + SameSite cookie session', explain: 'JS use padh hi nahi sakta, isliye XSS token chura nahi sakta. Server session hone se logout turant asar karta hai. localStorage mein JWT rakhna sabse aam galti hai.' },
        { left: 'Mobile app', right: 'Chhoti umar ka access token + revocable refresh token', explain: "Mobile client par access token short-lived aur refresh credential protected storage mein rakho. Immediate access revocation automatic nahi; deny list/introspection/version policy add kar sakte ho. Cookie vs bearer choice client/runtime threat model se decide karo." },
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
          'Token se user id lo, query scope karo: WHERE id = ? AND user_id = ? — pehchaan token se',
          'URL se order id lo aur order laut do — order id hi pehchaan ke liye kaafi hai',
          'Body mein user_id bhi lo, aur body ka user_id hi pakki pehchaan maan lo',
          'Frontend mein doosre users ke orders dikhao hi mat — bas, auth wahi hai',
        ],
        answer: 0,
        explain: 'Asli baat query mein hai: AND user_id = ?. Ownership check bhoolna mumkin hi nahi — galat user ko row milegi hi nahi. "Pehle fetch karo phir compare karo" bhi chalta hai, par wahi if kisi na kisi din chhoot jaata hai.',
        choiceExplanations: [
          'Asli baat query mein hai: AND user_id = ?. Ownership check bhoolna mumkin hi nahi — galat user ko row milegi hi nahi. "Pehle fetch karo phir compare karo" bhi chalta hai, par wahi if kisi na kisi din chhoot jaata hai.',
          'Koi bhi order id badal ke doosre ka order dekh lega.',
          'Body client bhejta hai — client kuch bhi likh sakta hai. Pehchaan token se.',
          'Frontend filter API ko band nahi karta. Seedha request bhej ke data mil jaayega.',
        ],
      },
      {
        q: "Auth dependency down hai aur required caller identity verify nahi ho sakti. Protected API kya kare?",
        choices: [
          'Pehchaan pakki na ho toh protected access mana karo — 503; "shak mein andar aane do" nahi',
          'Auth down hai toh sab requests andar aane do, taaki availability bani rahe',
          'Read requests ko bina auth chalne do, sirf writes rok do — padhna toh safe hai',
          'Cache wali key se har token maan lo — revoke hua token bhi chalne do, koi baat nahi',
        ],
        answer: 0,
        explain: 'Baaki track mein graceful degradation seekhte hain — adhoora jawab > koi jawab nahi. Auth apwaad hai: degrade karne ka matlab sabka data sabko de dena. Ek baat: auth-service down hone ka matlab har JWT unverifiable nahi — cached public keys se locally verify ho sakta hai, agar key ki taazgi aur revocation ki policy pehle se tay ho.',
        choiceExplanations: [
          'Baaki track mein graceful degradation seekhte hain — adhoora jawab > koi jawab nahi. Auth apwaad hai: degrade karne ka matlab sabka data sabko de dena. Ek baat: auth-service down hone ka matlab har JWT unverifiable nahi — cached public keys se locally verify ho sakta hai, agar key ki taazgi aur revocation ki policy pehle se tay ho.',
          'Auth mein degrade = sabka data sabko. Availability ke liye security nahi chhodi jaati.',
          'Read se bhi private data leak hota hai — doosre ka order padhna bhi leak hai.',
          'Cached public key se verify karna theek ho sakta hai — par revoke hua token maan lena galat.',
        ],
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
    { front: 'JWT ka sabse bada tradeoff?', back: "JWT locally validate ho sakta hai, par immediate user/token revocation ko deny list, introspection ya token-version state chahiye. Short-lived access + rotated revocable refresh credentials common design hai; lifetime policy risk se choose karo." },
    { front: 'Ownership check kahan?', back: 'Service ke andar, har resource par — aur behtar, <b>query mein</b>: <code>WHERE id=? AND user_id=?</code>. Gateway sirf authN karta hai, authZ nahi.' },
    { front: 'Naye endpoint par auth bhoolne se kaise bachein?', back: '<b>Default-deny.</b> Public ko <code>@Public</code> se explicitly mark karna pade. Bhoolne ka natija "band" ho, "khula" nahi.' },
    { front: 'Auth service down — fail open ya closed?', back: "Required identity/permission verify na ho toh protected access deny karo. Valid cached verification keys/tokens usable ho sakte hain if freshness/revocation policy permits;auth dependency outage always all requests failure nahi." },
  ],
},
]);

})();
