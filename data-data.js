/* =====================================================================
   TRACK 3 — Data & Storage
   modeling · btree · composite · indextypes · nplus1 · pool ·
   caching · stampede · storage · sharding · boss-data
   ===================================================================== */

const T_BTREE = [
  { text: 'Bina index ke plan dekho — Seq Scan milna chahiye',
    check: s => s.records.some(r => r.kind === 'explain' && !r.indexUsed) },
  { text: 'user_id par index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols.includes('user_id')) },
  { text: 'Ab plan dobara dekho — index lagna chahiye',
    check: s => s.records.some(r => r.kind === 'explain' && r.indexUsed) },
  { text: 'Request bhej ke asli farak naapo',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined < 100000) },
];

const T_COMPOSITE = [
  { text: 'Composite index banao — (user_id, created_at)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' &&
      r.cols.length >= 2 && r.cols[0] === 'user_id' && r.cols[1] === 'created_at') },
  { text: 'Leading column par filter karo — index lagega',
    check: s => s.records.some(r => r.kind === 'explain' && r.indexUsed && /user_id/.test(r.sql)) },
  { text: 'Ab SIRF created_at par filter karo — left-most prefix toota',
    check: s => s.records.some(r => r.kind === 'explain' && !r.indexUsed && !/user_id/.test(r.sql) && /created_at/.test(r.sql)) },
  { text: 'Index list dekho — Seq_in_index samjho',
    check: s => s.records.some(r => r.kind === 'showIndexes' && r.rows > 0) },
];

const T_POOL = [
  { text: 'Normal load daalo — sab theek dikhna chahiye',
    check: s => s.records.some(r => r.kind === 'load' && !r.poolStarved) },
  { text: 'Ek lambi transaction 45 connections pakad leti hai',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'long-tx') },
  { text: 'Wahi load dobara — ab pool bhar jaayega',
    check: s => s.records.some(r => r.kind === 'load' && r.poolStarved) },
  { text: 'Trace se prove karo ki waqt pool.acquire() mein gaya',
    check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst)) },
  { text: 'Metrics dekho — CPU 10% par pool wait aasman par',
    check: s => s.records.some(r => r.kind === 'metrics' && r.poolWaitHigh) },
];

const T_CACHE = [
  { text: 'Bina cache ke request ka cost dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.cache === 'MISS') },
  { text: 'Cache lagao — TTL 60s',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache') },
  { text: 'Ab dobara maango — HIT milna chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.cache === 'HIT') },
  { text: 'Load daal ke capacity ka farak dekho',
    check: s => s.records.some(r => r.kind === 'load') },
];

const T_STAMPEDE = [
  { text: 'Bina jitter ke cache lagao — warning padho',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache' && !r.cfg.jitterPct) },
  { text: 'Ab jitter ke saath lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache' && r.cfg.jitterPct > 0) },
  { text: 'Cache ke bina system zinda rahega? — load daal ke dekho',
    check: s => s.records.some(r => r.kind === 'load') },
];

const T_BOSS_DATA = [
  { text: 'Baseline: dashboard query kitni dheemi hai',
    check: s => s.records.some(r => r.kind === 'http' && r.rowsExamined > 1000000) },
  { text: 'Sahi composite index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols.length >= 2) },
  { text: 'COUNT(*) hatao',
    check: s => s.records.some(r => r.kind === 'sim' && /countTotal/.test(r.path || '') && r.value === false) },
  { text: 'Cache lagao — jitter ke saath',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache' && r.cfg.jitterPct > 0) },
  { text: 'Load daal ke prove karo ki ab capacity theek hai',
    check: s => s.records.some(r => r.kind === 'load' && !r.saturated) },
];

const T_IV_POOL = [
  { text: 'Load daal ke problem paida karo', check: s => s.records.some(r => r.kind === 'load') },
  { text: 'Trace se bottleneck dhoondo', check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst)) },
  { text: 'Metrics se prove karo', check: s => s.records.some(r => r.kind === 'metrics' && r.poolWaitHigh) },
];

SD.registerLevels('data', [

/* ===================================================================== */
{
  id: 'modeling',
  icon: '🧱',
  title: 'Data Modeling — Access Pattern Pehle',
  badge: 'Schema Shilpi',
  objectives: [
    'Schema likhne se pehle <b>sawaal</b> likho',
    'Normalize kab, denormalize kab — aur duplicate vs historical fact ka farak',
    'Composite primary keys',
    'Soft delete ka jaal aur uska behtar vikalp',
  ],
  lesson: [
    `<h3>📖 Ulta kaam mat karo</h3>
     <p>Zyadatar log aise shuru karte hain: "entities kya hain? User, Order,
     Product. Tables banao, normalize karo." Phir queries likhte hain aur
     6-table JOIN milte hain.</p>
     <p>Sahi kram ulta hai — <b>pehle sawaal likho</b>:</p>
     <pre>App kaunse sawaal poochhega?
  1. "is user ke last 50 orders"          1000/sec · p99 &lt; 50 ms
  2. "is order ke items + us waqt ka price"  500/sec · p99 &lt; 30 ms
  3. "is mahine ka revenue by merchant"      10/min · p99 &lt; 5 s

Ab schema + index design karo jo INHE sasta banaye.</pre>
     <p>Dhyaan do ki sawaal #3 ka latency budget 100x bada hai — matlab woh
     shayad ek alag system (analytics DB) ka kaam hai. Yeh baat schema-first
     approach mein <b>kabhi pata nahi chalti</b>.</p>
     <p class="tip">🎯 Yeh NoSQL ki soch maani jaati hai, par SQL mein bhi
     utni hi sahi hai. Schema ek <b>jawab</b> hai — sawaal pehle aane chahiye.</p>`,
    `<h3>🔬 Denormalize: duplicate vs historical fact</h3>
     <p>Sabse bada confusion yahi hai. Dekho:</p>
     <pre>orders.user_email    ← ❌ DUPLICATE (users.email ki copy)
                        user email badle toh yeh purana ho jaayega

order_items.price    ← ✅ HISTORICAL FACT
                        us waqt ka price. Product ka price kal badle toh
                        purane order ka amount NAHI badalna chahiye!</pre>
     <p>Doosra denormalization nahi hai — woh <b>sahi modeling</b> hai.
     Agar tum order ka total product table se JOIN karke nikaaloge, toh
     price badalte hi tumhare saare purane invoices galat ho jaayenge.</p>
     <p>Asli denormalization (performance ke liye) tab karo jab teenon sach hon:</p>
     <pre>1. read:write ratio bahut zyada ho (100:1)
2. JOIN sach mein bottleneck ho (NAAPA hua, andaza nahi)
3. tum sync rakhne ki keemat maan rahe ho (ab do jagah update)</pre>
     <h3>🗑️ Soft delete ka jaal</h3>
     <pre>❌ deleted_at IS NULL      → ab HAR query mein yeh lagana hai
                             ek bhool = deleted data user ko dikh gaya
                             unique constraints toot-te hain (email)
                             indexes mein kachra bhar jaata hai

✅ archive table            → delete karo, doosri table mein daalo
                             live queries saaf, audit trail bhi hai</pre>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Duplicate ya historical fact?',
      instructions: 'Har denormalized field ko sahi bin mein daalo.',
      bins: [
        { id: 'fact', label: '✅ Historical fact (sahi hai)' },
        { id: 'dup', label: '⚠️ Duplicate (sync problem)' },
      ],
      items: [
        { text: 'order_items.price — order ke waqt ka price', bin: 'fact', explain: 'Product ka price kal badal sakta hai, par purane order ka amount NAHI badalna chahiye. Yeh denormalization nahi, sahi modeling hai.' },
        { text: 'orders.user_email — users.email ki copy', bin: 'dup', explain: 'User email badlega toh yeh purana reh jaayega. Agar zaroori hai toh JOIN karo — ya soch samajh ke duplicate rakho aur sync ka rasta banao.' },
        { text: 'invoices.company_address — invoice ke waqt ka pata', bin: 'fact', explain: 'Legal document. Company address kal badle toh purani invoice waisi hi rehni chahiye — warna woh jhooth ban jaayegi.' },
        { text: 'posts.author_name — users.name ki copy', bin: 'dup', explain: 'Naam badlega toh purane posts par purana naam dikhega. Classic sync bug — aur users ko yeh turant dikh jaata hai.' },
        { text: 'orders.shipping_address — order ke waqt ka pata', bin: 'fact', explain: 'User ka current address badalne se purana order kahan gaya tha, woh nahi badalna chahiye.' },
        { text: 'comments.post_title — posts.title ki copy', bin: 'dup', explain: 'Pure denormalization for read speed. Theek hai — par ab title edit hone par comments update karne ka rasta chahiye.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Modeling ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'modeling',
      questions: [
        { q: 'Schema design shuru karne ka sahi pehla kadam?', target: 'queries', explain: '"App kaunse sawaal poochhega?" — access patterns pehle likho. Schema un sawaalon ka JAWAB hai.' },
        { q: 'Har access pattern ke saath aur kya likhna zaroori hai?', target: 'freq', explain: 'Frequency aur latency budget. 10/min wala sawaal aur 1000/sec wala sawaal bilkul alag design maangte hain — shayad alag system bhi.' },
        { q: 'deleted_at IS NULL wala tareeka kaunsi dikkat laata hai?', target: 'soft', explain: 'Har query mein woh condition lagani padti hai — ek bhool aur deleted data user ko dikh gaya. Saath hi unique constraints toot-te hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Modeling ki samajh',
      questions: [
        {
          q: 'order_items mein price copy karna denormalization hai?',
          choices: [
            'Nahi — woh HISTORICAL FACT hai. Product ka price badalne par purane order ka amount nahi badalna chahiye',
            'Haan, aur woh galat hai',
            'Haan, par performance ke liye theek hai',
            'Depend karta hai DB par',
          ],
          answer: 0,
          explain: 'Yeh farak bahut zaroori hai. Agar tum order total ko products table se JOIN karke nikaaloge, toh price badalte hi <b>saare purane invoices galat</b> ho jaayenge. Order ka price ek alag fact hai — product ke current price ki copy nahi.',
        },
        {
          q: 'Soft delete ka sabse bada khatra?',
          choices: [
            'Har query mein deleted_at IS NULL lagana padta hai — ek bhool aur deleted data user ko dikh jaata hai',
            'Disk space zyada lagta hai',
            'Queries dheemi ho jaati hain',
            'Backup bada ho jaata hai',
          ],
          answer: 0,
          explain: 'Yeh <b>opt-out safety</b> hai, jo hamesha kharaab idea hai — kabhi na kabhi koi bhool jaayega, aur woh bug production mein deleted user ka data dikhayega. Archive table isliye behtar hai: live table mein sirf live data hai, koi filter yaad rakhne ki zaroorat nahi.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Data Modeling',
    instructions: '"Access patterns" bolna yahan pehla achha signal hai. 🎤',
    questions: [
      {
        q: '"Ek e-commerce ka schema design karo."',
        choices: [
          'Pehle poochhunga ki app kaunse sawaal poochhegi aur unki frequency/latency kya hai — phir un patterns ke hisaab se tables aur indexes banaunga',
          'User, Product, Order, OrderItem tables banaunga aur 3NF tak normalize karunga',
          'Sab kuch ek JSON document mein rakhunga',
          'Microservices ke hisaab se har entity ka apna DB',
        ],
        answer: 0,
        explain: 'Entity list to har koi bana leta hai. <b>Access patterns poochhna</b> hi seniority ka signal hai — kyunki wahi batate hain ki kaunsa index chahiye, kya denormalize karna hai, aur kaunsa sawaal shayad ek alag analytics system ka kaam hai.',
      },
    ],
  },
  success: [
    'Schema se pehle access patterns likhte ho',
    'Duplicate aur historical fact mein farak kar sakte ho',
    'Denormalization ki teen shartein jaante ho',
    'Soft delete ka jaal aur archive table ka vikalp jaante ho',
  ],
  homework: `Apne project ki ek table chuno. Uske top 5 queries likho (slow query log se).
    Ab poochho: kya schema in queries ke liye bana tha, ya queries schema ke aas-paas
    ghum ke likhi gayi hain?`,
  cards: [
    { front: 'Schema design ka pehla kadam?', back: '<b>Access patterns likho</b> — app kaunse sawaal poochhegi, kitni baar, kitni latency mein. Schema un sawaalon ka jawab hai.' },
    { front: 'Duplicate vs Historical fact?', back: '<code>orders.user_email</code> = duplicate (sync problem). <code>order_items.price</code> = <b>historical fact</b> — product ka price badle toh purana order NAHI badalna chahiye.' },
    { front: 'Denormalize kab?', back: 'Teenon sach hon: <b>1.</b> read:write ratio bahut zyada <b>2.</b> JOIN naapa hua bottleneck ho <b>3.</b> sync ki keemat maan rahe ho.' },
    { front: 'Soft delete ka jaal?', back: 'Har query mein <code>deleted_at IS NULL</code> — ek bhool = deleted data dikh gaya. Unique constraints bhi toot-te hain. Behtar: <b>archive table</b>.' },
  ],
},

/* ===================================================================== */
{
  id: 'btree',
  icon: '🌳',
  title: 'B-tree Index — Kaam Kab Karta Hai, Kab Nahi',
  badge: 'Index Nipun',
  objectives: [
    'B-tree kaise kaam karta hai — aur 2.4 crore rows par sirf 4 hops kyun',
    'Selectivity — index kab <b>ignore</b> ho jaata hai',
    'Woh 4 patterns jo index ko bekaar kar dete hain',
    'EXPLAIN padhna — andaza mat lagao',
  ],
  lesson: [
    `<h3>📖 Kitaab ka index, par sorted aur balanced</h3>
     <p>B-tree ek sorted tree hai. Har node mein ~100 entries aati hain,
     isliye:</p>
     <pre>2,42,86,450 rows → log₁₀₀(24286450) ≈ 3.6 → ~4 hops</pre>
     <p>Isiliye index lookup <b>hamesha</b> tez hai, chahe table 1 lakh ki ho
     ya 10 crore ki. Table 100x badi karo, hops sirf 1 badhega.</p>
     <p>Aur kyunki leaves <b>sorted</b> hain, index sirf equality nahi —
     range aur sort bhi deta hai:</p>
     <table>
       <tr><th>Chalta hai ⚡</th><th>Kyun</th></tr>
       <tr><td><code>WHERE user_id = ?</code></td><td>equality — seedha pahuncho</td></tr>
       <tr><td><code>WHERE created_at &gt; ?</code></td><td>range — sorted hai, wahan se aage chalo</td></tr>
       <tr><td><code>ORDER BY created_at</code></td><td>sort MUFT — index already sorted hai</td></tr>
       <tr><td><code>WHERE name LIKE 'Ra%'</code></td><td>prefix — yeh bhi ek range hai</td></tr>
     </table>`,
    `<h3>🔬 Char patterns jo index ko maar dete hain</h3>
     <pre>❌ WHERE name LIKE '%sharma'      leading wildcard
   → index "Ra" se shuru kar sakta hai, "sharma se khatam" se nahi

❌ WHERE YEAR(created_at) = 2026   column par FUNCTION
   → index created_at par hai, YEAR(created_at) par nahi
   ✅ created_at >= '2026-01-01' AND created_at < '2027-01-01'

❌ WHERE status != 'done'          "sab kuch chhod ke"
   → aksar 90% rows match karengi — scan hi sasta hai

❌ WHERE is_active = 1             low selectivity (99% rows)
   → optimizer index IGNORE karega, aur woh SAHI hoga</pre>
     <p><b>Selectivity</b> = distinct values ÷ total rows.</p>
     <pre>email       — sab alag        → 1.0        perfect index
user_id     — 1000 users     → 0.001      achha
status      — 5 values       → 0.0000002  theek-thaak
is_active   — 2 values       → 0.00000008 bekaar</pre>
     <p class="tip">🎯 <b>Index tabhi laga jab woh 90%+ rows kaat de.</b>
     Agar query 30% rows laa rahi hai, toh index se random lookups karne se
     seq scan sasta padta hai. Optimizer yeh jaanta hai — isiliye woh
     tumhara index "ignore" karta hai. Woh bug nahi, samajhdaari hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🌳 Index lagao aur plan padho',
      goal: 'Ek 2.4 crore rows wali table par user ki transactions dhoondhni hain. Pehle plan dekho, phir index banao, phir plan dobara dekho — aur farak naapo.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_BTREE,
      success: allOf(T_BTREE),
      successText: `<b>Seq Scan → Index Scan.</b> Rows examined 2.4 crore se seedha neeche.
        <br><br>Aur yaad rakho: index tabhi lagega jab woh <b>90%+ rows kaat de</b>.
        Agar tumne <code>is_active</code> (2 values) par index banaya hota, toh optimizer
        use ignore kar deta — aur woh <b>sahi</b> hota, kyunki 99% rows ke liye random
        lookups karne se seq scan sasta hai.`,
      hints: [
        'Pehle bina index ke plan: EXPLAIN SELECT * FROM transactions WHERE user_id = 5',
        'Ab index banao: CREATE INDEX ix_txn_user ON transactions(user_id)',
        'Plan dobara dekho: EXPLAIN SELECT * FROM transactions WHERE user_id = 5',
        'Aur asli request se naapo: GET /api/v1/transactions?user_id=5&limit=50',
      ],
    },
    {
      type: 'bins',
      title: 'Index lagega ya nahi?',
      instructions: '`created_at` par index hai. Har query ko sahi bin mein daalo.',
      bins: [
        { id: 'yes', label: '⚡ Index lagega' },
        { id: 'no', label: '🐌 Index bekaar' },
      ],
      items: [
        { text: "WHERE created_at > '2026-01-01'", bin: 'yes', explain: 'Range query — index sorted hai, wahan se aage chal sakta hai.' },
        { text: 'WHERE YEAR(created_at) = 2026', bin: 'no', explain: 'Column par function. Index <code>created_at</code> par hai, <code>YEAR(created_at)</code> par nahi. Ise range mein likho: <code>&gt;= 2026-01-01 AND &lt; 2027-01-01</code>.' },
        { text: 'ORDER BY created_at DESC LIMIT 50', bin: 'yes', explain: 'Sort MUFT — index already sorted hai. DB seedha aakhri se 50 le lega.' },
        { text: "WHERE DATE(created_at) = '2026-06-01'", bin: 'no', explain: 'Wahi galti alag roop mein. <code>DATE()</code> bhi ek function hai. Range likho.' },
        { text: "WHERE created_at BETWEEN ? AND ?", bin: 'yes', explain: 'BETWEEN ek range hai — index ka perfect use case.' },
        { text: "WHERE created_at + INTERVAL '1 day' > NOW()", bin: 'no', explain: 'Column ke SAATH arithmetic bhi index tod deta hai. Doosri taraf le jao: <code>created_at &gt; NOW() - INTERVAL 1 day</code>.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'B-tree par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'btree',
      questions: [
        { q: 'Index kab bekaar ho jaata hai — kaunsa concept?', target: 'sel', explain: 'Selectivity. Index tabhi laga jab woh 90%+ rows kaat de. is_active (2 values) par index optimizer ignore karega — aur sahi karega.' },
        { q: 'Sabse aam galti kaunsi hai?', target: 'fn', explain: 'Column par function: WHERE YEAR(created_at) = 2026. Index created_at par hai, YEAR(created_at) par nahi. Range mein likho.' },
        { q: 'Index ke leaf level mein kya hota hai?', target: 'leaf', explain: 'Sorted entries — isiliye range aur ORDER BY dono muft mein mil jaate hain, sirf equality nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Index ki samajh',
      questions: [
        {
          q: 'Table 1 lakh se 10 crore ho gayi. Index lookup kitna dheema hoga?',
          choices: [
            'Lagbhag utna hi — B-tree ki depth log se badhti hai, ~4 hops se ~5 hops',
            '1000x dheema',
            '100x dheema',
            'Linearly dheema',
          ],
          answer: 0,
          explain: 'Yahi B-tree ka poora jaadu hai. Har node mein ~100 entries hoti hain, isliye depth <code>log₁₀₀(n)</code> hai. Data 1000x badhne par depth sirf 1.5 badhti hai. <b>Isiliye indexed lookup badi tables par bhi tez rehta hai.</b>',
        },
        {
          q: 'Optimizer tumhara index "ignore" kar raha hai. Sabse aam wajah?',
          choices: [
            'Query bahut zyada rows laa rahi hai (low selectivity) — index se random lookups karne se seq scan sasta hai',
            'Index corrupt hai',
            'Statistics purane hain, hamesha yahi hota hai',
            'Optimizer mein bug hai',
          ],
          answer: 0,
          explain: 'Index scan mein har match ke liye ek <b>random</b> row lookup hota hai — jo sequential read se kaafi mehenga hai. Agar query 30% rows la rahi hai, toh 30% random lookups karne se poori table sequentially padh lena sasta hai. Optimizer sahi kar raha hai. (Haan, purane statistics bhi wajah ho sakte hain — par pehla shak selectivity par karo.)',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Indexes',
    instructions: '"EXPLAIN" bolna yahan zaroori hai. 🎤',
    questions: [
      {
        q: '"Ek query slow hai. Pehla kadam?"',
        choices: [
          'EXPLAIN chalaunga aur plan dekhunga — Seq Scan hai ya Index Scan, kitni rows examine ho rahi hain vs return, aur sort/filesort ho raha hai kya',
          'created_at par index laga dunga',
          'Server ki RAM badha dunga',
          'Query ko do queries mein tod dunga',
        ],
        answer: 0,
        explain: '<b>Naapo, phir theek karo.</b> EXPLAIN bole bina koi performance jawab poora nahi hota. Aur sabse kaam ka number hai <b>rows examined ÷ rows returned</b> — agar woh 1000:1 hai, toh index ya query mein kuch galat hai.',
      },
      {
        q: '"Har column par index kyun na laga dein?"',
        choices: [
          'Kyunki har index ek write tax hai — har INSERT/UPDATE/DELETE ko har index update karna padta hai, aur woh disk aur memory bhi khaate hain. Saath hi zyada indexes se optimizer confuse ho sakta hai',
          'Index disk space leta hai, bas',
          'Har column par index se queries dheemi ho jaati hain',
          'Kuch problem nahi, laga dena chahiye',
        ],
        answer: 0,
        explain: 'Index ek <b>trade</b> hai: read tez, write dheema. Ek write-heavy table par 8 indexes ka matlab hai ki har INSERT sach mein 9 writes hai. Aur woh sab buffer pool mein jagah lete hain — jo tumhare asli data ke liye kam pad jaati hai.',
      },
    ],
  },
  success: [
    'B-tree ki depth aur uska matlab samjha sakte ho',
    'Selectivity se bata sakte ho ki index lagega ya nahi',
    'Woh 4 patterns pehchaante ho jo index ko maar dete hain',
    'EXPLAIN padh sakte ho',
  ],
  homework: `Apne slow query log se sabse dheemi query lo aur <code>EXPLAIN ANALYZE</code> chalao.
    Dekho: <b>rows examined ÷ rows returned</b> kitna hai? 1000:1 ho toh index ya query galat hai.`,
  cards: [
    { front: 'B-tree ki depth?', back: '<code>log₁₀₀(n)</code> — 2.4 crore rows par ~4 hops. Table 1000x badhe toh depth sirf 1.5 badhti hai. Isliye indexed lookup <b>hamesha</b> tez.' },
    { front: 'Selectivity?', back: 'distinct values ÷ total rows. <code>email</code> = 1.0 (perfect) · <code>is_active</code> = ~0 (bekaar). <b>Index tabhi laga jab 90%+ rows kaate.</b>' },
    { front: '4 patterns jo index maar dete hain?', back: '<b>1.</b> <code>LIKE &#39;%abc&#39;</code> (leading wildcard) <b>2.</b> <code>YEAR(col)</code> (function) <b>3.</b> <code>!=</code> <b>4.</b> low selectivity column.' },
    { front: 'Optimizer index ignore kyun karta hai?', back: 'Query bahut zyada rows laa rahi hai. Index scan mein har match par <b>random</b> lookup hota hai — 30% rows ke liye seq scan sasta hai. Woh sahi kar raha hai.' },
    { front: 'Sabse kaam ka EXPLAIN number?', back: '<b>rows examined ÷ rows returned.</b> 1000:1 ho toh index ya query galat hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'composite',
  icon: '🗂️',
  title: 'Composite Index — Column ka KRAM Hi Sab Kuch Hai',
  badge: 'Prefix Pandit',
  objectives: [
    '<b>Left-most prefix rule</b> — aur phone book ka ulta',
    'Column ka kram: equality → sort → range',
    '<b>Covering index</b> — heap chhue bina jawab',
    'Index ka write tax — 5 single ≠ 1 composite',
  ],
  lesson: [
    `<h3>📖 Phone book ko ulta rakh do</h3>
     <p>Ek phone book <code>(lastName, firstName)</code> par sorted hai.</p>
     <pre>"Sharma" dhoondo    → 1 second ⚡
"Priya" dhoondo     → POORI kitaab padhni padegi 🐌</pre>
     <p>Kyun? Kyunki kitaab <b>pehle</b> lastName se sorted hai. FirstName ka
     order sirf <b>ek lastName ke andar</b> hai. "Priya" naam har page par
     bikhre hue hain.</p>
     <p>Composite index bilkul yehi hai. <b>Left-most prefix rule:</b></p>
     <pre>CREATE INDEX ix ON transactions(user_id, created_at, id);

✅ WHERE user_id = ?                              1/3 — lagega
✅ WHERE user_id = ? AND created_at > ?           2/3 — aur gehra
✅ WHERE user_id = ? ORDER BY created_at          sort bhi MUFT
❌ WHERE created_at > ?                           FULL SCAN 💀
❌ WHERE id = ? (is index se)                     FULL SCAN 💀</pre>
     <p>Aakhri do mein <code>created_at</code> aur <code>id</code> index ke
     <b>andar</b> toh hain — par woh <b>leading column</b> nahi hain, isliye
     index bekaar hai.</p>`,
    `<h3>🔬 Column ka kram kaise chuno</h3>
     <pre>1️⃣  Equality columns PEHLE     (WHERE x = ?)
2️⃣  Sort column BEECH mein     (ORDER BY)
3️⃣  Range column AAKHIR mein   (> < BETWEEN)</pre>
     <p><b>Range aakhir mein kyun?</b> Kyunki range ke <b>baad</b> ka koi bhi
     column index se filter nahi hota. Dekho:</p>
     <pre>INDEX (status, created_at, merchant)
WHERE status = 'done' AND created_at > '2026-01-01' AND merchant = 'amazon'
       ─────────────────  ──────────────────────────  ─────────────────
       ✅ index se           ✅ index se (range)          ❌ ab sirf
                                                            rows padh ke
                                                            chhaanta hai

Behtar: INDEX (status, merchant, created_at)
        dono equality pehle, range aakhir mein → teenon index se</pre>
     <h3>🏆 Covering index</h3>
     <p>Agar query ke <b>saare</b> columns index mein hain, toh DB heap
     (asli table) chhue bina jawab de deta hai:</p>
     <pre>INDEX (user_id, created_at, amount)
SELECT amount FROM transactions WHERE user_id = ? ORDER BY created_at
→ "Index Only Scan" / "Using index"  — 2-3x tez</pre>
     <p class="tip">💸 <b>Index muft nahi — woh write par TAX hai.</b>
     8 indexes wali table par har INSERT sach mein 9 writes hai. Aur woh sab
     buffer pool mein jagah lete hain, jo tumhare asli data ke liye kam pad
     jaati hai. Aur yaad rakho: <b>5 alag single-column indexes ≠ ek
     composite index</b> — DB aksar ek hi chunta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🗂️ Left-most prefix khud todo',
      goal: 'Ek composite index banao, phir dikhao ki leading column ke saath woh lagta hai aur usko chhodte hi bilkul bekaar ho jaata hai — chahe doosra column index ke ANDAR hi kyun na ho.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_COMPOSITE,
      success: allOf(T_COMPOSITE),
      successText: `Dekha? <code>created_at</code> index ke <b>ANDAR</b> hai — phir bhi
        akele uspar filter karne se <b>full scan</b> hua.
        <br><br>Yahi left-most prefix rule hai, aur yahi wajah hai ki composite index mein
        <b>column ka kram sab kuch</b> hai. Kram chunne ka niyam:
        <b>equality → sort → range</b>. Range ke baad ka koi column index se filter nahi hota.`,
      hints: [
        'Composite index banao: CREATE INDEX ix_user_time ON transactions(user_id, created_at)',
        'Leading column ke saath: EXPLAIN SELECT * FROM transactions WHERE user_id = 5',
        'Ab bina leading column ke: EXPLAIN SELECT * FROM transactions WHERE created_at > 2026',
        'Aur index ki shakl dekho: show indexes on transactions',
      ],
    },
    {
      type: 'fill',
      title: 'Sahi index design karo',
      instructions: 'Yeh query roz 50,000 baar chalti hai. Iske liye sahi index likho.',
      template: `-- Query:
SELECT id, amount
FROM   transactions
WHERE  user_id = ?
  AND  status  = ?
  AND  created_at > ?
ORDER BY created_at DESC;

-- Sahi index:
CREATE INDEX ix ON transactions(
  {0},        -- equality
  {1},        -- equality
  {2},        -- range + sort (AAKHIR mein)
  {3}         -- covering ke liye — heap chhuna hi na pade
);`,
      tokens: ['user_id', 'status', 'created_at', 'amount', 'id', 'merchant'],
      blanks: [
        { answer: 'user_id', explain: 'Equality column pehle. Aur yeh sabse selective hai (har user ke apne rows), isliye leading position ke liye best.' },
        { answer: 'status', explain: 'Doosra equality column. Dono equality columns range se PEHLE aane chahiye.' },
        { answer: 'created_at', explain: 'Range + sort dono isi par hain — isliye yeh aakhir mein. Range ke BAAD ka koi column index se filter nahi hota.' },
        { answer: 'amount', explain: 'Query sirf <code>id</code> aur <code>amount</code> maang rahi hai. <code>amount</code> index mein daal dene se yeh <b>covering index</b> ban jaata hai (id toh aksar apne aap hota hai) — heap chhuna hi nahi padega.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Composite index par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'composite',
      questions: [
        { q: 'Kaunsa query pattern index ko poori tarah bekaar kar deta hai?', target: 'broken', explain: 'Leading column chhod dena. created_at index ke ANDAR hai par leading nahi — isliye full scan.' },
        { q: 'Range column kahan hona chahiye?', target: 'range', explain: 'Sabse AAKHIR mein. Range ke baad ka koi bhi column index se filter nahi hota — woh sirf rows padh ke chhaanta hai.' },
        { q: 'Index muft kyun nahi hai?', target: 'tax', explain: 'Har index har INSERT/UPDATE/DELETE ko dheema karta hai aur buffer pool mein jagah khaata hai. Index read tez karta hai aur write par TAX lagata hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Composite ki samajh',
      questions: [
        {
          q: 'INDEX (a, b, c) hai. WHERE b = 1 AND c = 2 — kya hoga?',
          choices: [
            'Full scan — leading column `a` par filter nahi hai, isliye index laga hi nahi',
            'Index lagega kyunki b aur c dono usme hain',
            'Index aadha lagega',
            'DB apne aap a ko ignore kar dega',
          ],
          answer: 0,
          explain: 'Left-most prefix rule. Index <code>a</code> se sorted hai; <code>b</code> ka order sirf ek <code>a</code> ke andar hai. Bina <code>a</code> ke DB ko pata hi nahi ki kahan se shuru kare. <b>Column index ke andar hona kaafi nahi — usse pehle wale sab chahiye.</b>',
        },
        {
          q: 'Column ka sahi kram kya hai?',
          choices: [
            'Equality columns pehle → sort column → range column aakhir mein',
            'Sabse selective column pehle, hamesha',
            'Alphabetical order',
            'Jo WHERE mein pehle likha hai',
          ],
          answer: 0,
          explain: 'Range column ke <b>baad</b> ka koi bhi column index se filter nahi hota — woh sirf rows padh ke chhaanta hai. Isliye range hamesha aakhir mein. (Equality columns ke beech mein selectivity se decide karo, par range ka aakhir hona pehla niyam hai.)',
        },
        {
          q: '5 single-column indexes vs 1 composite index — farak?',
          choices: [
            'DB aksar ek hi index chunta hai, isliye 5 alag indexes ek multi-column query ko utna nahi bachate — par unka write tax paanch guna hai',
            'Dono barabar hain',
            '5 single indexes behtar hain, zyada flexible',
            'Composite sirf tab jab teen se kam columns hon',
          ],
          answer: 0,
          explain: 'Kuch DBs "index intersection" karte hain par woh aksar composite se dheema hai. Aur asli nuksaan write side par hai: 5 indexes = har INSERT par 6 writes. <b>Query patterns dekh ke ek sahi composite banana</b> 5 randomly banaye single indexes se hamesha behtar hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Composite Indexes',
    instructions: 'Yeh sawaal bahut discriminating hota hai. 🎤',
    questions: [
      {
        q: '"INDEX (user_id, created_at) hai. WHERE created_at > ? kyun slow hai?"',
        choices: [
          'Left-most prefix rule — index user_id se sorted hai, created_at ka order sirf ek user_id ke andar hai. Bina user_id ke DB ko pata nahi kahan se shuru kare, isliye full scan',
          'created_at par alag index nahi hai',
          'Range queries index use nahi karti',
          'created_at aakhri column hai isliye dheema hai',
        ],
        answer: 0,
        explain: 'Phone book waali analogy bolna yahan sabse achha hai: <code>(lastName, firstName)</code> par sorted kitaab mein "Priya" dhoondhna poori kitaab padhna hai. Sahi hai ki column index ke andar hai — par woh <b>sorted</b> sirf pehle column ke andar hai.',
      },
      {
        q: '"Ek query 200ms le rahi hai aur index laga hua hai. Aur tez kaise karoge?"',
        choices: [
          'Dekhunga ki woh covering ban sakti hai ya nahi — SELECT ke saare columns index mein daal do toh heap chhuna hi nahi padega ("Index Only Scan"), aksar 2-3x tez',
          'Aur indexes laga dunga',
          'Query ko cache kar dunga',
          'Table ko partition kar dunga',
        ],
        answer: 0,
        explain: 'Index scan mein do kaam hote hain: index walk + har match ke liye ek <b>random heap lookup</b>. Doosra hissa aksar mehenga hai. Agar saare maange gaye columns index mein hain, toh woh poora hissa gayab ho jaata hai. Yeh sabse under-used optimization hai.',
      },
    ],
  },
  success: [
    'Left-most prefix rule samjha sakte ho',
    'Column ka sahi kram chun sakte ho (equality → sort → range)',
    'Covering index bana sakte ho',
    'Index ka write tax bata sakte ho',
  ],
  homework: `Apni sabse busy table ke indexes list karo (<code>\\d table</code> ya <code>SHOW INDEXES</code>).
    Har composite index ke saamne likho: kaunsi query iska leading column use karti hai?
    Jo index kisi query ka leading column match nahi karta, woh <b>sirf write tax</b> hai — hata do.`,
  cards: [
    { front: 'Left-most prefix rule?', back: 'INDEX (a,b,c) tabhi lagega jab WHERE mein <b>a</b> ho. Phone book <code>(lastName, firstName)</code> par sorted hai — "Priya" dhoondhna poori kitaab padhna hai.' },
    { front: 'Column ka kram?', back: '<b>Equality → sort → range.</b> Range ke BAAD ka koi column index se filter nahi hota — woh sirf rows padh ke chhaanta hai.' },
    { front: 'Covering index?', back: 'Query ke SAARE columns index mein → heap chhuna hi nahi padta (<code>Index Only Scan</code>). Random lookups bach jaate hain — 2-3x tez.' },
    { front: '5 single vs 1 composite?', back: 'DB aksar <b>ek hi</b> index chunta hai, toh 5 single multi-column query ko nahi bachate — par unka write tax 5 guna hai.' },
    { front: 'Index ka tax?', back: 'Har INSERT/UPDATE/DELETE ko <b>har</b> index update karna padta hai. 8 indexes = har insert sach mein 9 writes. Plus buffer pool mein jagah.' },
  ],
},

/* ===================================================================== */
{
  id: 'indextypes',
  icon: '🔬',
  title: 'Index ke Prakar — Kaunsa Kab',
  badge: 'Index Sommelier',
  objectives: [
    'B-tree · Hash · GIN/inverted · Full-text · Partial · BRIN · GiST',
    'Access pattern se index type chunna',
    'Partial index — 1000x chhota, wahi faayda',
    'Kab DB ka index kaafi nahi aur search engine chahiye',
  ],
  lesson: [
    `<h3>📖 90% jawab B-tree hai — baaki 10% mein 100x farak</h3>
     <table>
       <tr><th>Type</th><th>Kis liye</th><th>Kab</th></tr>
       <tr><td><b>B-tree</b></td><td>equality + range + sort</td><td>default — yahin se shuru karo</td></tr>
       <tr><td><b>Hash</b></td><td>SIRF equality</td><td>thoda tez, par range/sort nahi — bahut kam upyogi</td></tr>
       <tr><td><b>GIN / inverted</b></td><td>ek row mein KAI values</td><td>JSONB, arrays, tags, full-text</td></tr>
       <tr><td><b>Full-text</b></td><td>stemming + ranking</td><td>"running" ↔ "run", relevance</td></tr>
       <tr><td><b>Partial</b></td><td>rows ka ek hissa</td><td><code>WHERE status='pending'</code> — 0.1% rows</td></tr>
       <tr><td><b>BRIN</b></td><td>naturally sorted badi tables</td><td>time-series logs — B-tree se 1000x chhota</td></tr>
       <tr><td><b>GiST / R-tree</b></td><td>geo, ranges, overlaps</td><td>"5 km ke andar"</td></tr>
     </table>
     <p><b>Inverted index kya hai?</b> Normal index kehta hai "row → value".
     Inverted index kehta hai "value → kaunsi rows". Isiliye woh ek row mein
     <b>kai values</b> handle kar sakta hai:</p>
     <pre>row 1: tags = ['urgent', 'billing']
row 2: tags = ['urgent']

inverted index:
  'urgent'  → [1, 2]
  'billing' → [1]

WHERE tags @> ARRAY['urgent']   → seedha [1,2] mil gaya ⚡</pre>`,
    `<h3>🔬 Partial index — sabse under-used</h3>
     <pre>-- 5 crore orders, par sirf 50,000 "pending" hain
CREATE INDEX ix_pending ON orders(created_at)
  WHERE status = 'pending';</pre>
     <p>Yeh index <b>1000x chhota</b> hai poore index se. Faayde:</p>
     <pre>• memory mein poora aa jaata hai
• write tax sirf pending rows par (baaki 99.9% inserts par zero cost)
• "worker queue" pattern ka perfect fit</pre>
     <p>Yeh tab lagao jab tumhari queries hamesha ek hi chhote subset ko
     chhuti hain — jo aksar sach hota hai (pending jobs, active users,
     unread messages).</p>
     <h3>🔎 Kab DB kaafi nahi hai</h3>
     <p>Postgres full-text bahut achha hai — par uski bhi seema hai:</p>
     <table>
       <tr><th>Chahiye</th><th>Kahan</th></tr>
       <tr><td>"laptop charger" exact-ish match</td><td>Postgres full-text ✅</td></tr>
       <tr><td>Typo tolerance ("labtop")</td><td>search engine</td></tr>
       <tr><td>Relevance tuning, boosting</td><td>search engine</td></tr>
       <tr><td>Facets, aggregations on search</td><td>search engine</td></tr>
       <tr><td>Multi-language analyzers</td><td>search engine</td></tr>
     </table>
     <p class="tip">🎯 Par yaad rakho: search engine ek <b>alag system</b> hai —
     ab tumhe sync (indexing pipeline), consistency (lag), aur ek aur
     failure mode milega. Postgres se shuru karo; jab uski seema sach mein
     aa jaaye tab jao.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Access pattern se index type',
      instructions: 'Har zaroorat ko sahi index type se jodo.',
      pairs: [
        { left: '🔍 WHERE email = ? (equality + kabhi range)', right: 'B-tree', explain: 'Default aur 90% cases ka jawab. Equality, range aur sort teenon deta hai.' },
        { left: '🏷️ WHERE tags @> ARRAY[\'urgent\']', right: 'GIN / inverted index', explain: 'Ek row mein kai values. Inverted index "value → rows" map rakhta hai, isliye array/JSONB queries seedha kaam karti hain.' },
        { left: '📋 Sirf 50,000 pending orders (5 crore mein se)', right: 'Partial index — WHERE status = \'pending\'', explain: '1000x chhota, memory mein poora aa jaata hai, aur write tax sirf pending rows par.' },
        { left: '📈 2 saal ke logs, time se naturally sorted', right: 'BRIN', explain: 'BRIN har block ka min/max rakhta hai — B-tree se 1000x chhota. Naturally sorted append-only data ke liye perfect.' },
        { left: '🗺️ "5 km ke andar ke restaurants"', right: 'GiST / R-tree (PostGIS)', explain: 'Spatial index. B-tree 2D distance queries nahi kar sakta.' },
        { left: '📝 "running shoes" — "run" bhi match kare', right: 'Full-text index (stemming)', explain: 'Full-text stemming karta hai (running → run) aur relevance rank deta hai. LIKE se yeh kabhi nahi hoga.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Index types par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'indextypes',
      questions: [
        { q: 'Ek row mein kai values (tags, JSONB arrays) ke liye?', target: 'gin', explain: 'GIN / inverted index. Woh "value → kaunsi rows" map rakhta hai, isliye ek row ki kai values handle kar sakta hai.' },
        { q: 'Sirf 0.1% rows ko queries chhuti hain — kaunsa?', target: 'partial', explain: 'Partial index. 1000x chhota, memory mein poora aa jaata hai, aur baaki 99.9% inserts par zero write tax.' },
        { q: '2 saal ke time-sorted logs ke liye sabse chhota index?', target: 'brin', explain: 'BRIN — har block ka min/max rakhta hai. Naturally sorted data par B-tree se 1000x chhota.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Index types ki samajh',
      questions: [
        {
          q: 'Hash index B-tree se kab behtar hai?',
          choices: [
            'Bahut kam cases mein — sirf pure equality par thoda tez, par range, sort aur prefix kuch nahi kar sakta. Isliye default hamesha B-tree',
            'Hamesha, woh O(1) hai',
            'Bade tables par',
            'String columns par',
          ],
          answer: 0,
          explain: 'Theory mein hash O(1) hai aur B-tree O(log n) — par B-tree ka log n sirf ~4 hops hai, aur woh <b>range + sort + prefix</b> bhi deta hai. Ek chhote se speedup ke liye teen capabilities khona bura sauda hai. Isliye practice mein hash index bahut kam use hota hai.',
        },
        {
          q: 'Partial index ka sabse bada faayda kya hai?',
          choices: [
            'Woh 1000x chhota ho sakta hai — memory mein poora aa jaata hai aur baaki 99.9% inserts par koi write tax nahi',
            'Woh tez lookup deta hai',
            'Woh automatically maintain hota hai',
            'Woh multiple columns support karta hai',
          ],
          answer: 0,
          explain: 'Lookup speed lagbhag same hai (dono B-tree hain). Asli faayda <b>size</b> hai: chhota index = memory mein fit, aur <b>write tax sirf matching rows par</b>. 5 crore orders mein se 50,000 pending — us index ko maintain karna lagbhag muft hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Index Types',
    instructions: 'Yahan "depends" bolna sahi hai — par batao kis par. 🎤',
    questions: [
      {
        q: '"Product search banana hai — Postgres ya Elasticsearch?"',
        choices: [
          'Postgres full-text se shuru karunga — woh kaafi achha hai. Elasticsearch tab jab sach mein typo tolerance, relevance tuning, facets ya multi-language chahiye — kyunki woh ek naya system, naya sync pipeline aur naya failure mode laata hai',
          'Elasticsearch, woh search ke liye bana hai',
          'Postgres, hamesha',
          'Dono, ek fallback ke liye',
        ],
        answer: 0,
        explain: 'Sabse achha jawab <b>operational keemat</b> ko pehchaanta hai. Elasticsearch add karne ka matlab hai: indexing pipeline, consistency lag, ek aur cluster ko chalana, aur ek aur cheez jo 3 baje raat ko toot sakti hai. Woh keemat tabhi do jab Postgres ki seema sach mein aa gayi ho.',
      },
    ],
  },
  success: [
    'Access pattern se index type chun sakte ho',
    'Inverted index kya hai samjha sakte ho',
    'Partial index ka faayda bata sakte ho',
    'Jaante ho kab DB ka index kaafi nahi',
  ],
  homework: `Apne DB mein ek aisi query dhoondo jo hamesha ek hi chhote subset par chalti hai
    (pending jobs, unread, active). Uske liye <b>partial index</b> banao aur dono ka size compare karo:
    <code>SELECT pg_size_pretty(pg_relation_size('index_name'));</code>`,
  cards: [
    { front: 'Index types — ek line mein?', back: '<b>B-tree</b> default (equality+range+sort) · <b>Hash</b> sirf equality · <b>GIN</b> ek row mein kai values · <b>Partial</b> subset · <b>BRIN</b> sorted badi tables · <b>GiST</b> geo.' },
    { front: 'Inverted index?', back: 'Normal index: "row → value". Inverted: "<b>value → kaunsi rows</b>". Isliye ek row ki kai values (tags, arrays, words) handle kar sakta hai.' },
    { front: 'Partial index ka faayda?', back: '<b>1000x chhota</b> — memory mein poora aata hai, aur write tax <b>sirf matching rows</b> par. 5 crore orders mein 50,000 pending? Woh index lagbhag muft hai.' },
    { front: 'Hash index kyun kam use hota hai?', back: 'B-tree ka "log n" sirf ~4 hops hai aur woh <b>range + sort + prefix</b> bhi deta hai. Chhote speedup ke liye teen capabilities khona bura sauda hai.' },
    { front: 'DB search kab kaafi nahi?', back: 'Typo tolerance, relevance tuning, facets, multi-language — tab search engine. Par woh <b>naya system + sync pipeline + naya failure mode</b> hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'nplus1',
  icon: '🔁',
  title: 'N+1 Queries — ORM ka Sabse Mehenga Tohfa',
  badge: 'Query Counter',
  objectives: [
    'N+1 kya hai aur code mein kyun <b>dikhta nahi</b>',
    'Eager loading, DataLoader, aur JOIN',
    'GraphQL mein yeh kaise <b>nested</b> ho jaata hai',
    'Test mein query count assert karna',
  ],
  lesson: [
    `<h3>📖 Ek line, 101 queries</h3>
     <pre>orders = Order.limit(100)        # 1 query
for o in orders:
    print(o.user.name)           # 100 queries!</pre>
     <p>DB par:</p>
     <pre>SELECT * FROM orders LIMIT 100;
SELECT * FROM users WHERE id = 1;
SELECT * FROM users WHERE id = 2;
… 98 aur</pre>
     <p>Har query 1 ms bhi ho toh 101 ms — aur network round trip alag.
     Code mein yeh <b>ek line</b> hai. Yahi isse itna khatarnak banata hai:
     <b>code review mein bilkul normal dikhta hai</b>.</p>
     <p><b>Aur yeh chhupa kyun rehta hai?</b></p>
     <pre>dev machine:  10 orders  → 11 queries  → 12 ms   ✅ "theek hai"
production:  100 orders  → 101 queries → 400 ms  🐌
peak:        100 orders × 500 rps → 50,000 queries/sec 💀</pre>
     <p>Ilaaj — teenon theek hain, situation par depend karta hai:</p>
     <pre>1. Eager loading    orders.includes(:user)     → 2 queries
                    (Rails includes / Django select_related / JPA JOIN FETCH)
2. JOIN             ek hi query
3. DataLoader       ek request ke andar batch + dedupe (GraphQL ka standard)</pre>`,
    `<h3>🔬 GraphQL mein yeh nested ho jaata hai</h3>
     <pre>query {
  orders(limit: 100) {      # 1 query
    user { name }           # 100 queries
    items {                 # 100 queries
      product { name }      # 500 queries
    }
  }
}
─────────────────────────────
total: 701 queries — EK request mein</pre>
     <p>Isiliye GraphQL ke saath <b>DataLoader</b> lagbhag laazmi hai.
     Woh ek request ke andar saari <code>user(id)</code> calls ko ek tick
     tak jama karta hai, phir ek hi <code>WHERE id IN (...)</code> bhejta hai
     — aur duplicate ids ko dedupe bhi kar deta hai.</p>
     <h3>🧪 Ise wapas aane se kaise roko</h3>
     <p>Fix karna aasan hai; <b>wapas aane se rokna</b> mushkil hai —
     kyunki agla developer bhi wahi natural code likhega. Do cheezein
     kaam karti hain:</p>
     <pre>1. Test mein query count assert karo:
     assert_queries(2) { get '/orders' }

2. Dev mein N+1 detector chalao (bullet gem, django-silk, etc.)
   jo request ke doraan pakad ke chilla de</pre>
     <p class="tip">🎯 Query count ko ek <b>metric</b> ki tarah treat karo,
     latency ki tarah. "Yeh endpoint 3 queries karta hai" ek assertion honi
     chahiye, umeed nahi.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'N+1 ko pakdo aur theek karo',
      instructions: 'Sahi kram lagao.',
      steps: [
        { text: 'Naapo — endpoint ki query count dekho (APM ya log)', explain: 'Andaza mat lagao. Query count ek asli number hai jo har request par milta hai — bas usse dekha nahi jaata.' },
        { text: 'Pattern pehchaano — ek query + N chhoti queries', explain: 'Log mein bilkul ek jaisi queries alag-alag id ke saath dikhengi. Yeh N+1 ki saaf pehchaan hai.' },
        { text: 'Eager load lagao — includes / select_related / JOIN FETCH', explain: 'Sabse aasan fix. ORM 2 queries mein sab le aayega: ek parent ke liye, ek WHERE id IN (...) se children ke liye.' },
        { text: 'Dobara naapo — 101 se 2 hona chahiye', explain: 'Verify karo, maan mat lo. Kabhi-kabhi eager load ek jagah lagta hai aur doosri nested jagah N+1 bacha reh jaata hai.' },
        { text: 'Test mein query count assert karo', explain: 'Yahi woh kadam hai jo ise WAPAS aane se rokta hai. Bina iske agla developer wahi natural code likhega aur N+1 chup-chaap wapas aa jaayega.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'N+1 par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'nplus1',
      questions: [
        { q: 'N+1 dev machine par kyun nahi dikhta?', target: 'hidden', explain: '10 rows par 11 queries = 12 ms — sab theek lagta hai. Production mein 100 rows par 101 queries = 400 ms. Aur GraphQL mein yeh nested ho ke 501 ban jaata hai.' },
        { q: 'Ise WAPAS aane se kaunsa kadam rokta hai?', target: 'fix', explain: 'Test mein query count assert karna. Fix karna aasan hai — rokna mushkil, kyunki agla developer bhi wahi natural code likhega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'N+1 ki samajh',
      questions: [
        {
          q: 'GraphQL mein N+1 itna bura kyun ho jaata hai?',
          choices: [
            'Woh nested ho jaata hai — 100 orders × 5 items × 1 product = 501+ queries ek hi request mein. Isliye DataLoader lagbhag laazmi hai',
            'GraphQL dheema hai',
            'GraphQL indexes use nahi karta',
            'GraphQL mein caching nahi hoti',
          ],
          answer: 0,
          explain: 'REST mein N+1 ek level par hota hai. GraphQL mein client nesting decide karta hai, isliye woh <b>multiply</b> hota hai — aur tumhe pehle se pata bhi nahi ki client kya maangega. <b>DataLoader</b> (per-request batching + dedupe) isliye GraphQL ka standard hissa hai.',
        },
        {
          q: 'N+1 fix karne ke baad sabse zaroori kadam?',
          choices: [
            'Test mein query count assert karo — warna agla developer wahi natural code likhega aur N+1 chup-chaap wapas aa jaayega',
            'Documentation mein likh do',
            'Code comment add kar do',
            'Team ko bata do',
          ],
          answer: 0,
          explain: 'N+1 isliye baar-baar aata hai kyunki use likhna <b>natural</b> hai — <code>o.user.name</code> bilkul saaf code hai. Sirf ek automated check hi ise rok sakta hai. Comments aur docs 3 mahine mein bhula diye jaate hain.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — N+1',
    instructions: 'Yeh sawaal aksar "ORM ke saath kya problem hai" ke roop mein aata hai. 🎤',
    questions: [
      {
        q: '"Ek list endpoint 400ms le raha hai. DB metrics theek hain. Kya dekhoge?"',
        choices: [
          'Query COUNT dekhunga — shayad ek query nahi, 101 chhoti queries chal rahi hain. Har ek tez hai isliye DB "theek" dikhta hai, par total latency jud jaati hai',
          'Slow query log dekhunga',
          'Index add karunga',
          'DB ki CPU dekhunga',
        ],
        answer: 0,
        explain: 'Yeh jawab isliye achha hai ki woh <b>DB theek dikhne</b> wali baat ko explain karta hai. Slow query log kuch nahi dikhayega — har query 1 ms ki hai. Sirf query <b>count</b> se pata chalta hai. Isiliye "queries per request" ek monitoring metric honi chahiye.',
      },
    ],
  },
  success: [
    'N+1 pattern pehchaan sakte ho',
    'Eager loading, JOIN aur DataLoader mein chun sakte ho',
    'GraphQL mein iski multiplication samjha sakte ho',
    'Query count ko test mein assert karte ho',
  ],
  homework: `Apne sabse busy list endpoint ke liye ek test likho jo query count assert kare.
    Pehle chalao aur dekho asli number kya hai. Zyadatar teams ke liye woh number
    unke andaze se 5-10x zyada hota hai.`,
  cards: [
    { front: 'N+1 kya hai?', back: '1 query parents ke liye + N queries har child ke liye. Code mein <b>ek line</b> (<code>o.user.name</code>), DB par 101 queries.' },
    { front: 'N+1 chhupa kyun rehta hai?', back: 'Dev par 10 rows = 11 queries = 12ms, sab theek. Production par 100 rows = 101 queries = 400ms. Aur code review mein bilkul normal dikhta hai.' },
    { front: 'N+1 ke 3 ilaaj?', back: '<b>1.</b> Eager loading (<code>includes</code>/<code>select_related</code>) <b>2.</b> JOIN <b>3.</b> DataLoader (per-request batch + dedupe) — GraphQL ka standard.' },
    { front: 'GraphQL mein N+1?', back: 'Woh <b>nested</b> ho jaata hai: 100 orders × 5 items × 1 product = 501 queries ek request mein. DataLoader lagbhag laazmi hai.' },
    { front: 'N+1 ko wapas aane se kaise rokein?', back: '<b>Test mein query count assert karo.</b> Comments aur docs bhula diye jaate hain — N+1 likhna natural hai, isliye sirf automated check rokta hai.' },
  ],
},

/* =====================================================================
   L6 — Connection pool  ⭐ MARQUEE
   ===================================================================== */
{
  id: 'pool',
  icon: '🏊',
  title: 'Connection Pool — CPU 10%, Phir Bhi Sab Timeout',
  badge: 'Saturation Seer',
  objectives: [
    'Pool <b>kaam</b> nahi karta — <b>intezaar</b> karwata hai',
    "Little's Law se capacity nikalna",
    '<b>Utilization</b> vs <b>Saturation</b> — outage hamesha doosre se aata hai',
    'Pool badhana ilaaj kyun nahi hai',
  ],
  lesson: [
    `<h3>📖 Interview ka sabse achha sawaal</h3>
     <p><i>"Requests timeout ho rahi hain. CPU 10% hai. Memory theek hai.
     Health checks green hain. Kya ho raha hai?"</i></p>
     <p>Yahan asli hunar jawab jaanna nahi — <b>wahan tak pahunchna</b> hai.
     Kyunki production mein koi tumhe multiple-choice list nahi deta.</p>
     <p>Pehle dekho ki metrics kya <b>khaarij</b> kar rahe hain:</p>
     <pre>CPU 10%       → app computation nahi kar rahi
memory theek  → koi obvious memory pressure nahi
health green  → process ZINDA hai (bas itna)</pre>
     <p>Toh sawaal ban jaata hai: <b>"agar app kaam nahi kar rahi, toh woh
     kis cheez ka INTEZAAR kar rahi hai?"</b></p>
     <p>Ab machine metrics ghoorna band karo aur <b>ek request ka peecha
     karo</b>:</p>
     <pre>app handler (CPU)        5 ms
⏳ pool.acquire()    9,900 ms   ← 💀
db query                20 ms
─────────────────────────────
TOTAL                9,925 ms</pre>
     <p>Ab sab saaf hai. <b>Query optimize karna bilkul bekaar hai</b> —
     SQL sirf 20 ms le raha hai. DB bhi bilkul healthy dikhega. Bottleneck
     DB nahi, <b>DB ke saamne ki QUEUE</b> hai.</p>`,
    `<h3>🔬 Health check green kyun hai?</h3>
     <p>Kyunki woh jaan-boojh ke <b>sasta</b> banaya gaya hai:</p>
     <pre>GET /health  →  200 { "status": "ok" }</pre>
     <p>Usne na pool se connection liya, na koi dependency chhui, na koi
     transaction khola. Woh sirf itna kehta hai <i>"process zinda hai"</i>.</p>
     <p>Asli requests ko chahiye: pool se connection, shayad 2-3 downstream
     calls, ek transaction. Isliye:</p>
     <p class="tip">🎯 <b>"Health check pass hua" ≠ "service traffic serve
     kar sakti hai."</b> (Isiliye readiness check mein ek halki si real
     dependency check hoti hai — par woh bhi pool exhaustion nahi pakdegi
     agar uska apna connection path alag hai.)</p>
     <h3>🧮 Capacity ka formula</h3>
     <pre>capacity = pool_size × (1000 / service_ms)

pool 50, query  20 ms → 50 × 50    = 2,500 rps  ✅
pool 50, query 200 ms → 50 × 5     =   250 rps  ⚠️
pool 50, query   8 s  → 50 × 0.125 =     6 rps  💀</pre>
     <p><b>Query 10x dheemi hui toh capacity 10x gir gayi.</b> Yahi woh pul
     hai jo "deep pagination" ko "3AM outage" se jodta hai.</p>
     <p>Aur ek aur raasta hai jisse capacity girti hai — <b>koi connections
     pakde baitha ho</b>:</p>
     <pre>pool 50, par ek lambi transaction 45 pakde hue hai
→ effective pool = 5
→ capacity = 5 × 50 = 250 rps  (2,500 nahi)</pre>`,
    `<h3>🪣 Utilization vs Saturation</h3>
     <p>Yeh do shabd yaad rakh lo — inse debugging badal jaati hai:</p>
     <table>
       <tr><th>Utilization</th><th>Saturation</th></tr>
       <tr><td>"kitna USE ho raha hai"</td><td>"kitna INTEZAAR ho raha hai"</td></tr>
       <tr><td>CPU 10%, memory 41%</td><td>pool wait 9.9 s, queue depth 8000</td></tr>
       <tr><td>dashboards par hamesha hota hai</td><td>aksar hota hi nahi</td></tr>
     </table>
     <p><b>Outage hamesha saturation se aata hai.</b> Aur CPU/memory sirf
     do resources hain. Yeh sab bhi bhar sakte hain:</p>
     <pre>• DB connection pool        • thread pool
• HTTP connection pool     • file descriptors
• queue capacity           • worker slots
• downstream rate limits</pre>
     <h3>⚠️ Pool badhana ilaaj nahi hai</h3>
     <p>Pehla instinct hota hai <code>pool.size = 500</code>. Par har
     connection DB par ek <b>process/thread</b> hai:</p>
     <pre>500 connections aksar 50 se DHEEME hote hain
  → context switching
  → lock contention
  → memory per connection (Postgres: ~5-10 MB)</pre>
     <p>Sahi kram: <b>(1)</b> wajah dhoondo — lambi transaction? leak?
     <b>(2)</b> service time ghatao — query/index theek karo, N+1 hatao
     <b>(3)</b> phir pool tune karo. Aur pool ke saath hamesha ek
     <code>acquireTimeout</code> rakho — warna requests hamesha ke liye
     line mein lagi rahengi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🏊 Poora incident khud jiyo',
      goal: 'Ek service normal load par theek chal rahi hai. Ek lambi transaction 45 connections pakad legi. Dikhao ki CPU 10% par bhi sab timeout ho jaata hai — aur prove karo ki wajah pool hai, query nahi.',
      sys: SD.sys.orders(),
      tasks: T_POOL,
      success: allOf(T_POOL),
      successText: `Tumne abhi woh poora incident jiya jo har production team ek din dekhti hai:
        <br><br>• <code>load</code> ne dikhaya ki capacity <b>2,500 rps se 250 rps</b> par aa gayi — kyunki
        effective pool 50 se 5 ho gaya
        <br>• <code>trace</code> ne dikhaya ki <b>96% waqt <code>pool.acquire()</code></b> mein gaya, SQL sirf 15 ms
        <br>• <code>metrics</code> ne dikhaya ki <b>CPU 10%</b> hai aur <b>pool.wait_ms</b> aasman par
        <br><br>Yaad rakho: query optimize karna yahan bilkul bekaar hota.
        Aur pool 500 kar dena ulta padta — har connection DB par ek process hai.
        Sahi kadam tha: <b>dhoondho ki connections kaun pakde baitha hai.</b>`,
      hints: [
        "Baseline: load --rps 400 --duration 5 --path '/api/v1/orders?page=1&limit=50'",
        'Ab ek lambi transaction: sim inject long-tx --holds 45',
        "Wahi load dobara: load --rps 400 --duration 5 --path '/api/v1/orders?page=1&limit=50'",
        'Ek request ka peecha karo: trace GET /api/v1/orders',
        'Aur metrics dekho: metrics',
      ],
    },
    {
      type: 'incident',
      title: '🚨 3AM: "Sab green hai, par sab down hai"',
      instructions: 'Pager baja hai. Sahi raasta chuno.',
      pager: `<b>#prod-alerts</b> — 3:07 AM<br>
        <code>checkout-api</code> ka p99 <b>9.9 second</b>, error rate 60% (pool timeout).<br>
        <b>CPU 11%</b> · memory 43% · <b>/health 200 OK</b> · DB CPU 18%, slow query log <b>khaali</b>.<br>
        Pichhle 40 minute se chal raha hai. Deploy 6 ghante pehle hua tha.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Ek slow request ko end-to-end trace karo — dekho waqt kis span mein gaya', good: true, next: 'found', explain: 'Bilkul. Machine metrics ne bata diya ki app BUSY nahi hai. Ab pata karna hai ki woh kis cheez ka INTEZAAR kar rahi hai — aur woh sirf trace batayega.' },
            { t: 'Aur app instances add karo', good: false, explain: 'CPU 11% hai — instances ki kami nahi hai. Aur agar bottleneck shared DB pool hai, toh naye instances aur connections maangenge aur haalat BIGADENGE.' },
            { t: 'Slow queries optimize karo', good: false, explain: 'Slow query log KHAALI hai. DB ke paas queries pahunch hi nahi rahi — problem uske saamne hai.' },
            { t: 'Deploy rollback karo', good: false, explain: 'Deploy 6 ghante pehle tha aur problem 40 minute purani hai. Ho sakta hai kuch aur badla ho — pehle diagnose karo.' },
          ],
        },
        found: {
          sitrep: '🔍 Trace: app 5ms · <b>pool.acquire() 9,900ms</b> · SQL 20ms · serialize 2ms.',
          text: 'Ab kya karoge?',
          choices: [
            { t: 'Pool ke stats dekho — active vs idle, aur pata karo ki connections KAUN pakde baitha hai', good: true, next: 'why', explain: 'Sahi. Ab problem confirm ho gayi (pool), par WAJAH nahi. Kya sach mein load zyada hai, ya kuch connections bandhak bana ke baitha hai?' },
            { t: 'Pool size 50 se 500 kar do', good: false, explain: 'Ruko. Har connection DB par ek process hai — 500 connections aksar 50 se DHEEME hote hain. Aur agar wajah ek leak hai, toh 500 bhi 10 minute mein khatam ho jaayenge.' },
            { t: 'Query par index laga do', good: false, explain: 'SQL sirf 20 ms le raha hai. Use 10 ms karne se 9,900 ms ke wait par lagbhag kuch asar nahi hoga.' },
          ],
        },
        why: {
          sitrep: '📊 pool: 50/50 active, 0 idle. Ek query 40 minute se chal rahi hai — ek <b>analytics report</b> jo galti se prod par chala di gayi thi. Usne 45 connections ka ek batch job khola tha.',
          text: 'Ab turant kya?',
          choices: [
            { t: 'Us lambi transaction/job ko maaro, phir statement_timeout aur idle_in_transaction_timeout lagao', good: true, next: 'end', explain: 'Turant relief + permanent guard. Timeouts ke bina ek galat query kabhi bhi poora pool bandhak bana sakti hai.' },
            { t: 'DB restart kar do', good: false, explain: 'Connections toh chhoot jaayenge — par saare in-flight transactions bhi maare jaayenge aur outage lamba hoga. Aur wajah kal phir aa jaayegi.' },
            { t: 'Analytics team ko subah bata denge', good: false, explain: 'Abhi 60% users fail ho rahe hain. Bleeding pehle roko.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. p99 wapas 40 ms.',
          summary: `<b>Seekh:</b> CPU aur memory sirf <b>do</b> resources hain.
            Jo cheezein CPU se pehle bhar jaati hain: <b>DB connection pool · thread pool ·
            HTTP connection pool · file descriptors · queue capacity · worker slots ·
            downstream rate limits.</b>
            <br><br><b>Aage ke liye:</b>
            <br>• <code>pool.wait_ms</code>, <code>queue_depth</code> aur <code>active vs idle</code> ko dashboard par lao — p99 ke saath
            <br>• <code>statement_timeout</code> + <code>idle_in_transaction_session_timeout</code> lagao
            <br>• Analytics ko replica par bhejo, prod primary par kabhi nahi
            <br>• Pool ke saath <code>acquireTimeout</code> rakho — warna requests hamesha line mein lagi rahengi`,
        },
      },
    },
    {
      type: 'hotspot',
      title: 'Pool ke signals',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'pool',
      questions: [
        { q: 'p99 ke alawa kaunsa metric asli signal hai?', target: 'metrics', explain: 'pool.wait_ms. p99 batata hai ki problem HAI; pool wait batata hai ki problem KAHAN hai. Yeh dashboard par hona chahiye.' },
        { q: 'Trace mein sabse zyada waqt kahan gaya?', target: 'wait', explain: 'pool.acquire() — 9,900 ms. Request kaam nahi kar rahi thi, woh connection ka intezaar kar rahi thi.' },
        { q: 'Pool size 500 karne mein kya problem hai?', target: 'bigger', explain: 'Har connection DB par ek process/thread hai. 500 connections aksar 50 se DHEEME hote hain — context switching aur lock contention. Pehle service time ghatao.' },
        { q: 'CPU ke alawa jo bhar sakta hai, usko kya kehte hain?', target: 'saturate', explain: 'Saturation. Utilization = "kitna use ho raha hai", saturation = "kitna intezaar ho raha hai". Outage hamesha saturation se aata hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Pool ki samajh',
      questions: [
        {
          q: 'Trace: app 5ms, pool.acquire 9900ms, SQL 20ms. Query optimize karne se kitna faayda?',
          choices: [
            'Lagbhag zero — SQL sirf 20ms hai. Use 10ms karne se 9,925ms se 9,915ms ho jaayega',
            'Aadha time bach jaayega',
            'Bahut faayda hoga, query hi bottleneck hai',
            'Depend karta hai index par',
          ],
          answer: 0,
          explain: 'Yahi is level ka dil hai. Trace saaf batata hai ki 99.7% waqt <b>intezaar</b> mein gaya. Query ko infinitely tez kar do, phir bhi 9,900 ms ka wait bacha rahega. Bina trace ke log ghanto query tuning karte rehte hain.',
        },
        {
          q: 'Pool exhaustion ki 3 sabse aam wajahein?',
          choices: [
            'Lambi transactions (batch job, analytics query), connection leaks (code jo release nahi karta), aur sach mein slow queries (service time badh gaya)',
            'Kam RAM, kam CPU, kam disk',
            'Galat index, galat query, galat schema',
            'Zyada users, zyada data, zyada features',
          ],
          answer: 0,
          explain: 'Teenon ka lakshan ek jaisa hai (pool wait high) par ilaaj alag: lambi transaction → timeout lagao aur job ko replica par bhejo; leak → code theek karo; slow query → index/query theek karo. <b>Isliye pehle wajah dhoondo, pool badhao mat.</b>',
        },
        {
          q: 'Health check green rehne ki asli wajah?',
          choices: [
            'Woh jaan-boojh ke sasta hai — usne na pool se connection liya, na dependency chhui. Woh sirf "process zinda hai" batata hai',
            'Health check cache ho gaya tha',
            'Load balancer ne purana result use kiya',
            'Health check bug hai',
          ],
          answer: 0,
          explain: 'Health checks sasta hona <b>zaroori</b> hai — warna woh khud load banayenge aur outage mein sabse pehle fail honge. Par isi wajah se woh pool exhaustion nahi pakadte. <b>"Health pass" ≠ "traffic serve ho raha hai."</b>',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Saturation',
    instructions: 'Yeh sawaal 130+ mock interviews mein sabse zyada logon ko fansaata hai. 🎤',
    questions: [
      {
        q: '"Requests timeout ho rahi hain. CPU 10%, memory theek, health green. Kya ho raha hai?"',
        choices: [
          'App busy nahi hai, toh woh kisi cheez ka INTEZAAR kar rahi hai. Ek request trace karunga. Sabse aam wajah DB connection pool exhaustion hai — aur health green isliye hai kyunki woh check pool chhuta hi nahi',
          'CPU limit hit ho gayi hogi',
          'Database down hoga',
          'Load balancer ki problem hogi',
        ],
        answer: 0,
        explain: 'Sahi jawab do cheezein karta hai: pehle <b>metrics kya khaarij kar rahe hain</b> woh padhta hai, phir <b>ek request ka peecha</b> karta hai. "Connection pool" bolna achha hai — par "main trace karunga" bolna behtar hai, kyunki production mein tumhe options ki list nahi milti.',
      },
      {
        terminal: {
          goal: 'Interviewer: "Yeh raha woh system. 2 minute mein prove karo ki problem kahan hai — sirf batao mat, DIKHAO."',
          sys: SD.sys.orders({ db: { longTxHolding: 46 } }),
          tasks: T_IV_POOL,
          success: allOf(T_IV_POOL),
          successText: 'Zabardast. Load se problem paida ki, trace se jagah dhoondhi, metrics se prove kiya ki CPU nahi — <b>pool wait</b> hai.',
          hints: [
            'Load daalo: load --rps 400 --duration 6',
            'Trace karo: trace GET /api/v1/orders',
            'Aur prove karo: metrics',
          ],
        },
      },
      {
        q: '"Pool size 50 se 500 kar dein toh?"',
        choices: [
          'Aksar ulta padta hai — har connection DB par ek process/thread hai, toh 500 connections context switching aur lock contention badha ke DHEEME kar dete hain. Pehle wajah dhoondo aur service time ghatao',
          'Haan, 10x capacity mil jaayegi',
          'Haan, par memory dekhni padegi',
          'Nahi, kyunki DB max connections limit hai',
        ],
        answer: 0,
        explain: 'Yeh jawab dikhata hai ki tumne yeh production mein dekha hai. Pool badhana <b>DB par</b> load badhata hai. Sahi kram: wajah dhoondo (lambi tx? leak?) → service time ghatao → phir pool tune karo. Aur pool ke saath hamesha <code>acquireTimeout</code>.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki CPU 10% par timeout kaise hota hai',
    "Little's Law se capacity nikal sakte ho",
    'Utilization aur saturation mein farak kar sakte ho',
    'Pool exhaustion ki wajah dhoondh sakte ho — pool badhaane se pehle',
  ],
  homework: `Apne app ke pool metrics dhoondo: <code>pool.wait_ms</code>, active vs idle, queue depth.
    Agar dashboard par nahi hain, toh aaj hi lagao — p99 ke saath.
    Phir <code>statement_timeout</code> aur <code>idle_in_transaction_session_timeout</code> check karo.
    Agar woh set nahi hain, toh ek galat query kabhi bhi tumhara poora pool bandhak bana sakti hai.`,
  cards: [
    { front: 'CPU 10% par timeout — kyun?', back: 'App <b>kaam</b> nahi kar rahi, <b>intezaar</b> kar rahi hai. Aksar DB connection pool. Trace: app 5ms · <b>pool.acquire 9900ms</b> · SQL 20ms.' },
    { front: 'Health green kyun rehta hai?', back: 'Woh jaan-boojh ke sasta hai — na pool se connection leta hai, na dependency chhuta hai. <b>"Health pass" ≠ "traffic serve ho raha hai."</b>' },
    { front: 'Capacity ka formula?', back: '<code>capacity = pool_size × (1000 / service_ms)</code>. Pool 50 + query 20ms = 2500 rps. Wahi pool + query 8s = <b>6 rps</b>.' },
    { front: 'Utilization vs Saturation?', back: '<b>Utilization</b> = "kitna use ho raha hai" (CPU 10%). <b>Saturation</b> = "kitna intezaar ho raha hai" (pool wait 9.9s). <b>Outage hamesha saturation se aata hai.</b>' },
    { front: 'CPU ke alawa kya bhar sakta hai?', back: 'DB connection pool · thread pool · HTTP connection pool · file descriptors · queue capacity · worker slots · downstream rate limits.' },
    { front: 'Pool 500 kar dein?', back: 'Aksar <b>ulta</b> padta hai — har connection DB par ek process hai; 500 aksar 50 se dheeme hote hain. Pehle <b>wajah</b> dhoondo, phir service time ghatao.' },
  ],
},

/* ===================================================================== */
{
  id: 'caching',
  icon: '🧠',
  title: 'Caching — Layers, Patterns, aur Invalidation',
  badge: 'Cache Chatur',
  objectives: [
    'Kaunsi layer par cache — data ke <b>maalik</b> se tay hota hai',
    'Cache-aside vs write-through vs write-behind',
    'Invalidation ke do hi tareeke — aur dono ki keemat',
    'Cache key design',
  ],
  lesson: [
    `<h3>📖 Cache karne se pehle teen shartein</h3>
     <p>Cache tab lagao jab teenon sach hon:</p>
     <pre>1. MEHENGA hai        (query, computation, ya remote call)
2. BAAR-BAAR maanga jaata hai
3. KAM badalta hai</pre>
     <p>Sirf "slow hai" kaafi wajah nahi. Agar cheez har request par badalti
     hai toh cache sirf ek extra hop hai jo hamesha miss karega.</p>
     <p><b>Kaunsi layer?</b> Yeh <b>data ke maalik</b> se tay hota hai,
     speed se nahi:</p>
     <table>
       <tr><th>Data</th><th>Layer</th><th>Kyun</th></tr>
       <tr><td>Product image, JS bundle</td><td>CDN</td><td>public + immutable</td></tr>
       <tr><td>Public product page JSON</td><td>CDN (chhota TTL)</td><td>sab ke liye same</td></tr>
       <tr><td>User ka dashboard data</td><td>App cache (Redis)</td><td>per-user — CDN par KABHI nahi</td></tr>
       <tr><td>Computed aggregate</td><td>Materialized view</td><td>DB hi refresh kar le</td></tr>
     </table>
     <p class="tip">⚠️ Per-user data CDN par daalna sirf bug nahi — woh ek
     <b>security incident</b> hai. CDN shared cache hai; key aksar sirf URL
     hoti hai.</p>`,
    `<h3>🔬 Teen patterns</h3>
     <pre>CACHE-ASIDE (sabse aam)
  v = cache.get(k)
  if v is None:
      v = db.query(k)
      cache.set(k, v, ttl)
  return v
  ✅ cache down ho toh DB se chal jaayega
  ⚠️ miss par har request DB jaayegi (stampede — agla level)

WRITE-THROUGH
  db.write(k, v); cache.set(k, v)
  ✅ cache hamesha fresh
  ⚠️ har write dheema; aur jo kabhi padha hi nahi jaata woh bhi cache mein

WRITE-BEHIND
  cache.set(k, v); queue.push(k)   # DB baad mein
  ✅ write bahut tez
  💀 crash par DATA GAYA — sirf tab jab data kho sakta ho (view counts)</pre>
     <h3>🔑 Invalidation — do hi tareeke</h3>
     <pre>1. TTL              aasan · par thodi der stale
2. Explicit delete  fresh · par HAR write path yaad rakhna padega
                    (aur ek bhool = HAMESHA ka stale data)</pre>
     <p>Practical jawab: <b>dono</b>. Explicit delete karo, aur chhota TTL
     safety net ki tarah rakho — taaki ek bhool bhi 5 minute mein theek ho
     jaaye, hamesha ke liye na rahe.</p>
     <h3>🗝️ Cache key design</h3>
     <pre>user:5:orders:page:1:v2
└──┬─┘ │ └──┬──┘ └──┬───┘ └┬┘
   │   │    │       │      └── VERSION — badlo aur poora cache "invalid"
   │   │    │       └───────── variant (filters, page)
   │   │    └───────────────── kis cheez ka
   │   └────────────────────── id
   └────────────────────────── namespace</pre>
     <p>Version chaabi mein rakhna sabse chalak trick hai: schema ya
     serialization badalne par tum ek constant badal ke poora cache
     "invalidate" kar dete ho — bina kuch delete kiye.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🧠 Cache lagao aur capacity ka farak dekho',
      goal: 'Ek dheemi list query hai. Pehle uska cost dekho, phir cache lagao, phir load daal ke dekho ki capacity kitni badh gayi.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_CACHE,
      success: allOf(T_CACHE),
      successText: `Cache ne do cheezein di: <b>latency</b> (~1 ms) aur <b>capacity</b>
        (service time gira toh Little's Law se capacity badh gayi).
        <br><br>Par yaad rakho ki tumne ek naya sawaal bhi khareed liya:
        <b>"yeh data stale kab tak reh sakta hai?"</b> Aur ek naya khatra —
        agla level uske baare mein hai.`,
      hints: [
        'Pehle bina cache ke: GET /api/v1/transactions?page=1&limit=50',
        'Cache lagao: sim add cache --ttl 60 --jitter 15',
        'Ab dobara maango: GET /api/v1/transactions?page=1&limit=50',
        'Aur capacity dekho: load --rps 500 --duration 5',
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa cache pattern?',
      instructions: 'Har halat ko sahi pattern se jodo.',
      bins: [
        { id: 'aside', label: '📖 Cache-aside' },
        { id: 'through', label: '✍️ Write-through' },
        { id: 'behind', label: '⚡ Write-behind' },
      ],
      items: [
        { text: 'User profile — bahut padha jaata hai, kabhi-kabhi badalta hai', bin: 'aside', explain: 'Classic cache-aside. Cache down ho toh DB se chal jaayega — sabse resilient pattern.' },
        { text: 'Page view counter — 50,000/sec, exact hona zaroori nahi', bin: 'behind', explain: 'Write-behind ka perfect case: bahut writes, aur kuch counts kho jaayein toh koi farak nahi padta. Batch karke DB mein daalo.' },
        { text: 'Feature flags — har request padhti hai, kabhi-kabhi update', bin: 'through', explain: 'Write-through: update hote hi cache fresh ho. Yahan stale flag ka matlab galat behaviour hai, isliye TTL par bharosa nahi kar sakte.' },
        { text: 'Account balance — sach hona ZAROORI hai', bin: 'aside', explain: 'Cache-aside chhote TTL ke saath, aur write par explicit delete. Write-behind toh yahan bilkul nahi — crash par paisa gum.' },
        { text: 'Search suggestions — mehengi computation, roz update', bin: 'aside', explain: 'Cache-aside lambe TTL ke saath. Miss par recompute, warna cache se.' },
        { text: 'Session data — har request padhti aur likhti hai', bin: 'through', explain: 'Write-through: session hamesha fresh chahiye, aur agla request usi ko padhega. Stale session = user logged out dikhega.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Cache ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'caching',
      questions: [
        { q: 'Invalidation ke kitne tareeke hain?', target: 'invalid', explain: 'Do — TTL (aasan par stale) aur explicit delete on write (fresh par har write path yaad rakhna). Practical jawab: dono use karo.' },
        { q: 'Cache karne ki teen shartein kahan likhi hain?', target: 'what', explain: 'Mehenga + baar-baar maanga jaaye + kam badle. Teenon chahiye — sirf "slow hai" kaafi wajah nahi.' },
        { q: 'Per-user data kaunsi layer par NAHI daalna chahiye?', target: 'cdn', explain: 'CDN — woh shared cache hai. Ek user ka data doosre ko dikhega. Yeh bug nahi, security incident hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Cache ki samajh',
      questions: [
        {
          q: 'Cache lagane ki teen shartein?',
          choices: [
            'Mehenga + baar-baar maanga jaaye + kam badle — teenon chahiye',
            'Sirf slow hona kaafi hai',
            'Data public hona chahiye',
            'Data chhota hona chahiye',
          ],
          answer: 0,
          explain: 'Teenon zaroori hain. Mehenga par kabhi-kabhi maanga jaata hai? Cache lagbhag hamesha miss karega. Baar-baar maanga jaata hai par har baar badalta hai? Cache ek extra hop banke reh jaayega — aur stale bugs bhi dega.',
        },
        {
          q: 'Explicit invalidation ka sabse bada khatra?',
          choices: [
            'Har write path yaad rakhna padta hai — ek bhool aur woh key HAMESHA ke liye stale ho jaayegi',
            'Woh dheema hota hai',
            'Woh cache ko bhar deta hai',
            'Woh sirf Redis mein kaam karta hai',
          ],
          answer: 0,
          explain: 'TTL apne aap theek ho jaata hai — galti bhi 5 minute mein mit jaati hai. Explicit delete <b>kabhi</b> theek nahi hota agar tum ek code path bhool gaye. Isliye dono use karo: explicit delete + chhota TTL <b>safety net</b> ki tarah.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Caching',
    instructions: '"Cache lagao" bolna aasan hai; tradeoffs batana asli jawab hai. 🎤',
    questions: [
      {
        q: '"Yeh endpoint slow hai — cache laga dein?"',
        choices: [
          'Pehle poochhunga: yeh data kitna stale reh sakta hai? kitne alag keys banengi (hit rate)? aur cache poora chala jaaye toh DB jhel lega? Uske baad hi decide karunga',
          'Haan, Redis laga dete hain',
          'Nahi, pehle query optimize karo',
          'Haan, CDN par daal dete hain',
        ],
        answer: 0,
        explain: 'Teeno sawaal alag khatre pakadte hain: <b>staleness</b> (correctness), <b>key cardinality</b> (agar har request ki alag key hai toh hit rate ~0), aur <b>cold start</b> (agar cache ke bina DB gir jaata hai toh cache ek <i>dependency</i> hai, optimization nahi).',
      },
    ],
  },
  success: [
    'Cache ki teen shartein bata sakte ho',
    'Data ke maalik se layer chun sakte ho',
    'Teen patterns mein sahi chun sakte ho',
    'Cache key design kar sakte ho',
  ],
  homework: `Apne app ke sabse bade cache ka hit rate dekho. 80% se kam hai? Toh key
    cardinality bahut zyada hogi — dekho ki key mein kya-kya hai aur kya kuch hataya ja sakta hai.
    Phir poochho: cache poora flush ho jaaye toh DB zinda rahega?`,
  cards: [
    { front: 'Cache ki 3 shartein?', back: '<b>Mehenga</b> + <b>baar-baar maanga jaaye</b> + <b>kam badle</b>. Teenon chahiye — sirf "slow hai" kaafi wajah nahi.' },
    { front: 'Layer kaise chunein?', back: '<b>Data ke maalik se</b>, speed se nahi. Public+immutable → CDN. Per-user → app cache. Computed aggregate → materialized view. <b>Per-user CDN par kabhi nahi.</b>' },
    { front: '3 cache patterns?', back: '<b>Cache-aside</b> (aam, resilient) · <b>write-through</b> (hamesha fresh, write dheema) · <b>write-behind</b> (tez, par crash par data gaya).' },
    { front: 'Invalidation?', back: 'Do tareeke: <b>TTL</b> (aasan, apne aap theek) aur <b>explicit delete</b> (fresh, par ek bhool = hamesha stale). Practical: <b>dono</b> — delete + chhota TTL safety net.' },
    { front: 'Cache key ka shape?', back: '<code>user:5:orders:page:1:<b>v2</b></code> — namespace : id : kis cheez ka : variant : <b>version</b>. Version badlo aur poora cache ek constant se invalid ho jaata hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'stampede',
  icon: '🌩️',
  title: 'Cache Stampede — 10,000 Keys, Ek Saath Expire',
  badge: 'Herd Tamer',
  objectives: [
    'Stampede kaise banta hai — aur deploy uska sabse bada trigger kyun hai',
    'TTL jitter, single-flight lock, early refresh',
    'Cold start — cache <b>dependency</b> hai ya optimization?',
    'Hot key problem',
  ],
  lesson: [
    `<h3>📖 Sab kuch theek chal raha tha, phir t+300</h3>
     <pre>t=0     deploy hua, cache warm hua — 10,000 keys, TTL 300s
t=1..299  sab HIT — DB par lagbhag zero load ✅
t=300     SAARI 10,000 keys EK SAATH expire 💀
t=300     10,000 requests seedha DB par — ek second mein</pre>
     <p>Aur yeh isse bhi bura hai. Ek popular key par 500 requests/sec aa
     rahi hain. Woh expire hui:</p>
     <pre>request 1  → miss → DB query shuru (200 ms)
request 2  → miss (pehli abhi khatam nahi hui) → ek aur DB query
request 3  → miss → ek aur
… 100 requests, 100 IDENTICAL queries, ek hi key ke liye</pre>
     <p>Ise <b>thundering herd</b> kehte hain. Aur dhyaan do ki iska trigger
     aksar ek <b>deploy</b> hota hai — kyunki deploy ke baad cache ek saath
     bharti hai, isliye ek saath khaali bhi hoti hai.</p>`,
    `<h3>🔬 Teen ilaaj</h3>
     <p><b>1. TTL par jitter (sabse sasta fix)</b></p>
     <pre>❌ cache.set(k, v, ttl=300)
✅ cache.set(k, v, ttl=300 + random(0, 60))</pre>
     <p>Ab 10,000 keys 60 second mein bikhar ke expire hongi — 167 keys per
     second, jo DB aaram se jhel lega. Ek line ka fix.</p>
     <p><b>2. Single-flight lock</b></p>
     <pre>if cache miss:
    if acquire_lock(k):          # sirf EK request jeetegi
        v = db.query(k)
        cache.set(k, v, ttl)
        release_lock(k)
    else:
        wait_for_result(k)       # baaki uska intezaar karein
</pre>
     <p>Ek key ke liye sirf ek DB query. 100 identical queries ki jagah 1.</p>
     <p><b>3. Probabilistic early refresh</b></p>
     <pre>Expiry ke paas aate hi kuch requests (badhti hui probability se)
cache ko pehle hi refresh kar deti hain — isliye MISS hota hi nahi.</pre>
     <h3>❄️ Cold start — asli sawaal</h3>
     <p>Redis restart ho gaya. 100% miss. Ab poochho:</p>
     <p class="tip">🎯 <b>"Cache poora chala jaaye toh system zinda rahega?"</b>
     Agar jawab "nahi" hai, toh cache ek <b>optimization nahi, dependency</b>
     hai — aur uska matlab hai ki tumhare paas ek aur SPOF hai jise tumne
     kabhi failure mode ki tarah treat hi nahi kiya.</p>
     <h3>🔥 Hot key</h3>
     <p>Ek celebrity ka profile = ek cache key par 50,000 rps. Woh ek Redis
     node garam kar degi (sharding se koi faayda nahi — key toh ek hi hai).
     Do ilaaj: key ko replicate karo
     (<code>user:5:copy_0..9</code>, random padho), ya app ke andar ek chhota
     <b>local cache</b> (2 second TTL) rakho.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🌩️ Jitter ka farak dekho',
      goal: 'Pehle bina jitter ke cache lagao aur warning padho, phir jitter ke saath lagao. Phir sawaal ka jawab dhoondo: cache ke bina yeh system zinda rahega?',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_STAMPEDE,
      success: allOf(T_STAMPEDE),
      successText: `Jitter ek line ka fix hai jo poore stampede ko rok deta hai —
        <code>ttl = 300 + random(0, 60)</code>. 10,000 keys ab 60 second mein bikhar ke
        expire hongi, ek saath nahi.
        <br><br>Aur aakhri sawaal sabse zaroori tha: <b>cache ke bina load kya karta hai?</b>
        Agar system cache ke bina gir jaata hai, toh cache ek <b>optimization nahi,
        dependency</b> hai — aur uska matlab hai ki tumhare paas ek aur SPOF hai
        jise tumne kabhi failure mode ki tarah treat hi nahi kiya.`,
      hints: [
        'Pehle bina jitter: sim add cache --ttl 300',
        'Ab jitter ke saath: sim add cache --ttl 300 --jitter 20',
        'Aur cache ke bina capacity dekho: load --rps 500 --duration 5',
      ],
    },
    {
      type: 'match',
      title: 'Problem se ilaaj',
      instructions: 'Har cache problem ko sahi ilaaj se jodo.',
      pairs: [
        { left: '🌩️ 10,000 keys ek saath expire hoti hain', right: 'TTL par jitter — ttl + random(0, 60)', explain: 'Ek line ka fix. Expiry bikhar jaati hai, 167 keys/sec — DB aaram se jhel lega.' },
        { left: '🔁 Ek key ke liye 100 identical DB queries', right: 'Single-flight lock — sirf ek request DB jaaye', explain: 'Baaki requests us ek ke result ka intezaar karein. 100 queries ki jagah 1.' },
        { left: '❄️ Redis restart — 100% miss', right: 'Poochho: cache ke bina system zinda rahega?', explain: 'Agar nahi, toh cache ek dependency hai, optimization nahi. Ab woh ek SPOF hai jise tumne kabhi failure mode nahi maana.' },
        { left: '🔥 Ek celebrity key par 50,000 rps', right: 'Key replicate karo ya local in-process cache', explain: 'Sharding se faayda nahi — key ek hi hai. user:5:copy_0..9 ya app ke andar 2 second ka local cache.' },
        { left: '📉 Cache hit rate sirf 20%', right: 'Key cardinality bahut zyada — key se kuch hatao', explain: 'Agar key mein timestamp ya request id jaisa kuch hai toh har request ki apni key hogi. Cache kabhi hit nahi karega.' },
        { left: '🕰️ Ek write path cache delete karna bhool gaya', right: 'Chhota TTL safety net ki tarah rakho', explain: 'Explicit delete kabhi theek nahi hota agar ek path chhoot jaaye. TTL galti ko 5 minute mein mita deta hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Stampede ke ilaaj',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'stampede',
      questions: [
        { q: 'Sabse sasta fix kaunsa hai?', target: 'jitter', explain: 'TTL par jitter — ek line: ttl = 300 + random(0, 60). Expiry bikhar jaati hai aur stampede hota hi nahi.' },
        { q: 'Ek key ke liye 100 identical queries kaise roken?', target: 'lock', explain: 'Single-flight lock — sirf ek request DB jaaye, baaki uske result ka intezaar karein.' },
        { q: 'Redis restart ke baad ka sabse zaroori sawaal?', target: 'cold', explain: 'Cache ke bina system zinda rahega? Agar nahi, toh cache ek dependency hai — optimization nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Stampede ki samajh',
      questions: [
        {
          q: 'Stampede ka sabse aam trigger kya hota hai?',
          choices: [
            'Deploy — cache ek saath bharti hai, isliye ek saath khaali bhi hoti hai',
            'Traffic spike',
            'Redis ka slow hona',
            'Bade objects cache karna',
          ],
          answer: 0,
          explain: 'Yeh counterintuitive hai par bilkul sach: deploy ke baad saari keys lagbhag <b>ek hi pal</b> par set hoti hain, isliye TTL bhi ek saath khatam hota hai. Isliye jitter sirf achha idea nahi — deploy-heavy teams ke liye woh zaroori hai.',
        },
        {
          q: '"Cache ke bina DB gir jaata hai" ka matlab?',
          choices: [
            'Cache ek dependency hai, optimization nahi — aur woh ek SPOF hai jise tumne kabhi failure mode nahi maana',
            'Cache achha kaam kar raha hai',
            'DB ko scale karna chahiye',
            'Normal hai, sab systems aise hi hote hain',
          ],
          answer: 0,
          explain: 'Yeh farak zaroori hai. <b>Optimization</b> = chala jaaye toh dheema ho jaayega. <b>Dependency</b> = chala jaaye toh down ho jaayega. Agar cache dependency hai toh use waisa hi treat karo: HA, backups, aur ek plan ki cold start par kya hoga (jaise load shedding ya progressive warm-up).',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Stampede',
    instructions: 'Yeh sawaal caching ke baad ka natural follow-up hai. 🎤',
    questions: [
      {
        q: '"Redis restart hua aur poora system gir gaya. Kya galat tha?"',
        choices: [
          'Cache optimization nahi, dependency ban chuka tha. Fix: cache ke bina ka load naapo, load shedding/circuit breaker lagao, progressive warm-up karo, aur cache ko HA banao',
          'Redis ko restart nahi karna chahiye tha',
          'Aur Redis nodes chahiye',
          'DB ko scale karna chahiye tha',
        ],
        answer: 0,
        explain: 'Sahi jawab pehle problem ka <b>naam</b> deta hai (dependency vs optimization), phir chaar alag ilaaj deta hai. "Aur Redis nodes" sirf isi failure ko kam sambhav banata hai — us din ke liye tayyari nahi karta jab woh phir bhi ho jaaye.',
      },
    ],
  },
  success: [
    'Stampede ka mechanism samjha sakte ho',
    'Jitter, single-flight aur early refresh jaante ho',
    'Cold start par cache ko dependency ki tarah dekh sakte ho',
    'Hot key problem aur uske ilaaj bata sakte ho',
  ],
  homework: `Apne code mein <code>cache.set(...)</code> dhoondo. Kitni jagah TTL fixed hai?
    Un sab par jitter lagao — <code>ttl + random(0, ttl/5)</code>. Yeh ek line ka change
    tumhe ek din bacha lega.`,
  cards: [
    { front: 'Cache stampede?', back: 'Saari keys <b>ek saath</b> expire → sab requests ek saath DB par. Trigger aksar <b>deploy</b> hota hai (cache ek saath bharti hai, isliye ek saath khaali hoti hai).' },
    { front: 'Stampede ke 3 ilaaj?', back: '<b>1.</b> TTL jitter (<code>ttl + random</code>) — ek line ka fix <b>2.</b> single-flight lock (ek key, ek query) <b>3.</b> probabilistic early refresh.' },
    { front: 'Thundering herd?', back: 'Ek popular key expire hui → 100 requests ek saath miss → <b>100 identical DB queries</b>. Ilaaj: single-flight lock.' },
    { front: 'Cache: optimization ya dependency?', back: 'Poochho: <b>cache poora chala jaaye toh system zinda rahega?</b> "Nahi" = woh dependency hai, ek SPOF jise tumne failure mode nahi maana.' },
    { front: 'Hot key?', back: 'Ek key par 50,000 rps — sharding bekaar (key ek hi hai). Ilaaj: key replicate karo (<code>copy_0..9</code>) ya app ke andar 2s ka local cache.' },
  ],
},

/* ===================================================================== */
{
  id: 'storage',
  icon: '🗃️',
  title: 'Storage Engine — Access Pattern Batata Hai Kaunsa',
  badge: 'Store Selector',
  objectives: [
    'Relational · KV · Document · Time-series · Search · Object · Columnar',
    'Hot / warm / cold data aur retention',
    'Polyglot persistence ka jaal',
    'Postgres kitna kuch akela kar leta hai',
  ],
  lesson: [
    `<h3>📖 "Kaunsa database?" ka jawab access pattern mein hai</h3>
     <table>
       <tr><th>Access pattern</th><th>Store</th></tr>
       <tr><td>Rishte, transactions, ad-hoc queries</td><td><b>Relational</b> — yahin se shuru karo</td></tr>
       <tr><td>Ek key se poora object</td><td><b>Key-Value</b> — session, cache, flags</td></tr>
       <tr><td>Nested, alag-alag shape</td><td><b>Document</b> — catalog, CMS, event payloads</td></tr>
       <tr><td>Append-only + time range</td><td><b>Time-series</b> — metrics, IoT</td></tr>
       <tr><td>Relevance, typo, facets</td><td><b>Search</b> — Elasticsearch</td></tr>
       <tr><td>Bade files, blobs</td><td><b>Object store</b> — S3 (DB mein KABHI nahi)</td></tr>
       <tr><td>Crore rows par aggregate</td><td><b>Columnar/OLAP</b> — ClickHouse, BigQuery</td></tr>
       <tr><td>"3 hop door kaun"</td><td><b>Graph</b> — social, fraud rings</td></tr>
     </table>
     <p><b>Object store wali line ko underline kar lo.</b> Images, videos aur
     PDFs DB mein daalna sabse aam mehengi galti hai: backup ghanton ka
     ho jaata hai, replication lag badhta hai, aur buffer pool blobs se
     bhar jaata hai. DB mein sirf <b>metadata + URL</b>.</p>`,
    `<h3>🌡️ Hot · Warm · Cold</h3>
     <p>90% queries pichhle 30 din ko chhuti hain. Par zyadatar systems
     5 saal ka data ek hi table mein rakhte hain — aur phir <b>har</b> query
     dheemi hoti hai:</p>
     <pre>🔥 HOT   — 30 din    main DB · SSD · full index
🌤️ WARM  — 1 saal    partition · kam index · sasti disk
🧊 COLD  — 7 saal    S3/Glacier · parquet · dheemi par sasti query</pre>
     <p>Purana data hataane se sirf jagah nahi bachti — <b>indexes chhote
     ho jaate hain</b> (memory mein fit) aur buffer pool mein asli data ke
     liye jagah banti hai. Yeh ek "cleanup task" nahi, ek <b>performance
     fix</b> hai.</p>
     <h3>⚠️ Polyglot persistence ka jaal</h3>
     <p>"Har kaam ka apna DB" sunne mein sahi lagta hai. Practically:</p>
     <pre>5 databases = 5 backup plans + 5 failure modes + 5 upgrade cycles
            + 5 tarah ka gyaan + 5 cheezein jo 3 baje raat ko toot sakti hain</pre>
     <p>Aur Postgres akela bahut kuch kar leta hai:</p>
     <pre>JSONB          → document store jaisa (GIN index ke saath)
full-text      → basic search
PostGIS        → geo
LISTEN/NOTIFY  → halka pub/sub
arrays, ranges → bahut se special cases</pre>
     <p class="tip">🎯 <b>Ek DB se shuru karo.</b> Naya store tab lo jab
     access pattern sach mein fit na ho (jaise 50 crore metrics/din — woh
     Postgres ka kaam nahi) — aur uski poori operational keemat maan ke.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Access pattern se store',
      instructions: 'Har zaroorat ko sahi store se jodo.',
      pairs: [
        { left: '🛒 Orders, payments — transactions chahiye', right: 'Relational (Postgres/MySQL)', explain: 'ACID, foreign keys, ad-hoc queries. Default choice — aur zyadatar cases mein aakhri bhi.' },
        { left: '🎫 User sessions — key se lookup, TTL', right: 'Key-Value (Redis)', explain: 'Ek key, ek value, TTL built-in. Iske liye relational DB use karna bekaar overhead hai.' },
        { left: '📸 Product images, invoices PDF', right: 'Object store (S3)', explain: 'DB mein blobs daalna backup, replication aur buffer pool teenon ko barbaad karta hai. DB mein sirf metadata + URL.' },
        { left: '📈 5 crore sensor readings roz', right: 'Time-series (TimescaleDB/InfluxDB)', explain: 'Append-only + time-range queries + automatic downsampling. Postgres yeh scale par sangharsh karega.' },
        { left: '🔎 "labtop charger" — typo ke saath', right: 'Search engine (Elasticsearch)', explain: 'Typo tolerance, relevance tuning aur facets — yeh Postgres full-text se aage ki cheezein hain.' },
        { left: '📊 "Pichhle 2 saal ka revenue by region"', right: 'Columnar / OLAP (ClickHouse)', explain: 'Crore rows par aggregate. Columnar storage sirf zaroori columns padhta hai — 100x tez.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Storage ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'storage',
      questions: [
        { q: 'Bade files (images, PDFs) kahan?', target: 'obj', explain: 'Object store (S3). DB mein blobs daalna backup ghanton ka bana deta hai, replication lag badhata hai, aur buffer pool bhar deta hai.' },
        { q: 'Default choice kaunsa hona chahiye?', target: 'rdbms', explain: 'Relational. Rishte, transactions aur ad-hoc queries — aur woh JSONB, full-text aur geo bhi kar leta hai. Yahin se shuru karo.' },
        { q: '90% queries pichhle 30 din ko chhuti hain — us data ko kya kehte hain?', target: 'hot', explain: 'Hot data. Use main DB mein full index ke saath rakho; warm ko partition karo aur cold ko S3 par bhejo — isse har query tez ho jaati hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Storage ki samajh',
      questions: [
        {
          q: 'Purana data archive karne ka sabse bada faayda kya hai?',
          choices: [
            'Indexes chhote ho jaate hain aur memory mein fit hote hain — isse HAR query tez ho jaati hai, sirf purani nahi',
            'Disk space bachta hai',
            'Backup chhota ho jaata hai',
            'Compliance ke liye zaroori hai',
          ],
          answer: 0,
          explain: 'Disk sasta hai — woh asli wajah nahi. Asli faayda yeh hai ki chhota index memory mein fit ho jaata hai aur buffer pool mein asli data ke liye jagah banti hai. <b>Archiving ek performance fix hai, cleanup task nahi.</b>',
        },
        {
          q: '"Har kaam ke liye best DB" — is soch mein problem?',
          choices: [
            '5 databases = 5 backup plans, 5 failure modes, 5 upgrade cycles aur 5 cheezein jo 3 baje raat ko toot sakti hain. Operational keemat aksar technical faayde se badi hoti hai',
            'Koi problem nahi, yahi best practice hai',
            'Sirf cost badhta hai',
            'Sirf latency badhti hai',
          ],
          answer: 0,
          explain: 'Har naya datastore ek naya <b>operational</b> system hai — backups, monitoring, upgrades, on-call knowledge. Ek team jo Postgres achhe se chala sakti hai, woh 5 stores kharab chalayegi. Ek se shuru karo aur naya tab lo jab access pattern sach mein fit na ho.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Storage Choice',
    instructions: 'Yahan "depends" sahi jawab hai — bas batao kis par. 🎤',
    questions: [
      {
        q: '"SQL ya NoSQL?"',
        choices: [
          'Access pattern par depend karta hai. Rishte + transactions + ad-hoc queries → relational. Ek key se poora object, bahut zyada scale, simple access → KV/document. Aur aaj Postgres JSONB se document use-cases bhi kar leta hai',
          'NoSQL, woh scale karta hai',
          'SQL, woh reliable hai',
          'Dono use karo',
        ],
        answer: 0,
        explain: 'Yeh sawaal ka framing hi galat hai, aur sabse achha jawab use theek karta hai: sawaal "SQL ya NoSQL" nahi, <b>"access pattern kya hai"</b> hai. Aur "NoSQL scale karta hai" ek purana myth hai — modern Postgres bahut door tak jaata hai.',
      },
    ],
  },
  success: [
    'Access pattern se store chun sakte ho',
    'Hot/warm/cold data tier bana sakte ho',
    'Polyglot persistence ki operational keemat bata sakte ho',
    'Jaante ho ki blobs DB mein nahi jaate',
  ],
  homework: `Apne DB ki sabse badi table dekho. Uska kitna data pichhle 30 din ka hai?
    Agar 10% se kam, toh baaki 90% <b>har</b> query ko dheema kar raha hai.
    Ek partition ya archive plan banao.`,
  cards: [
    { front: 'Store kaise chunein?', back: '<b>Access pattern se.</b> Rishte+transactions → relational. Key se object → KV. Nested → document. Append+time → time-series. Relevance → search. Blobs → <b>object store</b>.' },
    { front: 'Blobs DB mein kyun nahi?', back: 'Backup ghanton ka ho jaata hai, replication lag badhta hai, buffer pool bhar jaata hai. DB mein sirf <b>metadata + URL</b>.' },
    { front: 'Hot/Warm/Cold?', back: '🔥 30 din — main DB, full index · 🌤️ 1 saal — partition, kam index · 🧊 7 saal — S3/parquet. <b>Archiving ek performance fix hai</b>, cleanup task nahi.' },
    { front: 'Polyglot ka jaal?', back: '5 databases = 5 backup plans + 5 failure modes + 5 upgrade cycles + 5 cheezein jo 3 baje raat ko toot sakti hain. <b>Ek se shuru karo.</b>' },
    { front: 'Postgres akela kya kar leta hai?', back: '<b>JSONB</b> (document) · <b>full-text</b> (basic search) · <b>PostGIS</b> (geo) · <b>LISTEN/NOTIFY</b> (halka pub/sub) · arrays, ranges.' },
  ],
},

/* ===================================================================== */
{
  id: 'sharding',
  icon: '🔀',
  title: 'Partition · Shard · Replica — Teen Alag Cheezein',
  badge: 'Shard Sage',
  objectives: [
    'Replication vs partitioning vs sharding — teenon alag problem solve karte hain',
    'Replica lag aur <b>read-after-write</b>',
    'Shard key — sabse bada aur sabse irreversible faisla',
    'Shard karne se pehle ke 5 kadam',
  ],
  lesson: [
    `<h3>📖 Teen shabd jo log ghol dete hain</h3>
     <table>
       <tr><th></th><th>Kya karta hai</th><th>Kya deta hai</th><th>Kya NAHI deta</th></tr>
       <tr><td><b>Replication</b></td><td>wahi data, kai copies</td><td>read scale + HA</td><td>write scale ❌</td></tr>
       <tr><td><b>Partitioning</b></td><td>ek server, table tukdon mein</td><td>purane tukde drop karna, chhote indexes</td><td>capacity ❌</td></tr>
       <tr><td><b>Sharding</b></td><td>kai servers, data bata hua</td><td>write scale ✅</td><td>cross-shard JOIN ❌</td></tr>
     </table>
     <p><b>Replica lag aur read-after-write:</b></p>
     <pre>1. POST /profile (naam badla)   → primary par likha ✅
2. GET  /profile                → replica se padha
3. PURANA naam dikha            → "save nahi hua?" 😡</pre>
     <p>Teen ilaaj:</p>
     <pre>• Sticky reads — write ke baad kuch second primary se padho
• Apna data hamesha primary se (doosron ka replica se chalega)
• Client ko write timestamp do; replica utna catch-up kare tabhi serve kare</pre>`,
    `<h3>🔑 Shard key — din 1 ka sabse bada faisla</h3>
     <pre>✅ user_id / tenant_id    zyadatar queries ek hi shard par
                          data barabar bantta hai

❌ created_at             SAARE naye writes ek shard par — hotspot
❌ country                India shard 100x bada, Fiji khaali
❌ auto-increment id      wahi hotspot problem</pre>
     <p><b>Shard key badalna lagbhag namumkin hai</b> — poora data dobara
     baantna padta hai, live traffic ke saath. Isliye yeh woh faisla hai
     jispar din 1 par sabse zyada sochna chahiye.</p>
     <p>Aur sharding ke baad kya khota hai:</p>
     <pre>• Cross-shard JOIN — gaya. Ab app mein merge karo.
• Cross-shard transaction — gaya. Ab saga likho.
• Global unique auto-increment — gaya. UUID ya snowflake id lo.
• "SELECT COUNT(*) FROM users" — ab woh N queries hai.</pre>
     <h3>📋 Shard karne se PEHLE ke 5 kadam</h3>
     <pre>1. Index theek karo         (aksar yahin problem khatam ho jaata hai)
2. Query theek karo         (N+1, deep offset, missing filters)
3. Cache lagao
4. Read replicas
5. Vertical scale           (aaj ek machine 100 TB aur lakhon IOPS kar leti hai)
─────────────────────────────
6. Partition
7. PHIR shard</pre>
     <p class="tip">🎯 Zyadatar teams shard karti hain jab unhe sirf <b>ek
     index</b> chahiye tha. Sharding ek 6-mahine ka project hai jo tumhare
     har future feature ko mehenga bana deta hai — use aakhri option ki tarah
     treat karo.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa tool?',
      instructions: 'Har problem ko sahi solution se jodo.',
      bins: [
        { id: 'repl', label: '👯 Replication' },
        { id: 'part', label: '✂️ Partitioning' },
        { id: 'shard', label: '🧩 Sharding' },
      ],
      items: [
        { text: 'Read traffic 10x badh gaya, writes waise hi', bin: 'repl', explain: 'Read replicas — exactly iske liye bane hain. Writes primary par hi rahenge.' },
        { text: '2 saal purane logs roz delete karne hain (DELETE slow hai)', bin: 'part', explain: 'Time-based partitions. Purana partition DROP karna instant hai; DELETE ghanton leta hai aur table bloat karta hai.' },
        { text: 'Write throughput ek server ki limit paar kar gaya', bin: 'shard', explain: 'Yahi ek asli wajah hai sharding ki. Replication write scale nahi deti.' },
        { text: 'Primary down ho toh service chalti rahe', bin: 'repl', explain: 'HA — replica ko promote karo. Yeh replication ka doosra bada faayda hai.' },
        { text: 'Table itni badi ho gayi ki index memory mein nahi aata', bin: 'part', explain: 'Partitioning se har partition ka apna chhota index banta hai — jo memory mein fit ho jaata hai.' },
        { text: 'Ek tenant ka data doosre se poori tarah alag rakhna hai', bin: 'shard', explain: 'Tenant-based sharding — compliance aur blast radius dono ke liye. Yeh sharding ki ek non-performance wajah hai.' },
      ],
    },
    {
      type: 'order',
      title: 'Scale karne ka sahi kram',
      instructions: 'Shard karne se pehle kya-kya karna chahiye — sahi kram lagao.',
      steps: [
        { text: 'Indexes theek karo', explain: 'Sabse sasta aur sabse asardaar. Aksar "hume shard karna padega" wali problem yahin khatam ho jaati hai.' },
        { text: 'Queries theek karo — N+1, deep offset, missing filters', explain: 'Ek deep-page query capacity 2500 rps se 6 rps kar deti hai. Sharding se pehle yeh dekho.' },
        { text: 'Cache lagao', explain: '90% hit rate ka matlab DB par load 10x kam. Yeh ek din ka kaam hai, sharding 6 mahine ka.' },
        { text: 'Read replicas add karo', explain: 'Agar load read-heavy hai (aksar hota hai) toh yeh problem lagbhag khatam kar deta hai.' },
        { text: 'Vertical scale — badi machine', explain: 'Aaj ek machine 100 TB aur lakhon IOPS kar leti hai. "Vertical scale kaam nahi karta" ek purana myth hai, aur woh sabse sasta option hai.' },
        { text: 'Partition karo', explain: 'Ek hi server par table ko tukdon mein baanto — chhote indexes, purane tukde drop karna aasan.' },
        { text: 'PHIR shard karo', explain: 'Aakhri option. Yeh 6-mahine ka project hai jo har future feature ko mehenga bana deta hai — cross-shard JOIN, transactions aur global counts sab chale jaate hain.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Sharding ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'sharding',
      questions: [
        { q: 'Write scale kaun deta hai?', target: 'shard', explain: 'Sharding. Replication sirf read scale aur HA deti hai — saare writes phir bhi primary par hi jaate hain.' },
        { q: 'created_at ko shard key banane mein kya problem hai?', target: 'bad1', explain: 'Saare naye writes ek hi shard par jaayenge — hotspot. Baaki shards khaali baithe rahenge.' },
        { q: '"Naam save kiya par purana dikh raha hai" — yeh kya hai?', target: 'lag', explain: 'Replica lag / read-after-write problem. Write primary par gaya, read replica se aaya jo abhi peeche hai.' },
        { q: 'Sharding se pehle kya karna chahiye?', target: 'order', explain: 'Index → query → cache → replicas → vertical scale → partition → PHIR shard. Zyadatar teams shard karti hain jab unhe sirf ek index chahiye tha.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Sharding ki samajh',
      questions: [
        {
          q: 'Read replicas add karne se write throughput kitna badhega?',
          choices: [
            'Bilkul nahi — saare writes phir bhi primary par jaate hain. Replicas sirf read scale aur HA dete hain',
            'Double ho jaayega',
            'Replicas ki sankhya jitna',
            'Thoda badhega',
          ],
          answer: 0,
          explain: 'Yeh sabse aam galatfehmi hai. Har replica ko <b>wahi saare writes</b> apply karne padte hain — matlab woh write load ghatate nahi, balki har replica use dobara karta hai. Write scale ke liye <b>sharding</b> hi raasta hai.',
        },
        {
          q: 'Shard key chunne mein sabse bada khatra?',
          choices: [
            'Woh lagbhag irreversible hai — badalne ke liye poora data live traffic ke saath dobara baantna padta hai',
            'Galat key se queries slow hongi',
            'Galat key se storage zyada lagega',
            'Koi khaas khatra nahi, baad mein badal sakte hain',
          ],
          answer: 0,
          explain: 'Index galat ho toh naya bana lo. Shard key galat ho toh tumhe <b>poora dataset re-shard</b> karna padega — live traffic ke saath, dual-write ke saath, mahino ka project. Isiliye yeh din 1 ka sabse zyada sochne wala faisla hai.',
        },
        {
          q: 'Read-after-write problem ka sabse simple ilaaj?',
          choices: [
            'Write ke baad kuch second us user ke reads primary se karo (sticky reads)',
            'Replica lag zero kar do',
            'Sab reads primary se karo',
            'Cache laga do',
          ],
          answer: 0,
          explain: 'Replica lag zero karna namumkin hai (physics). Sab reads primary se karna replicas ka poora point khatam kar deta hai. <b>Sticky reads</b> beech ka sahi raasta hai: sirf usi user ke, sirf kuch second ke liye — baaki sab replica se chalta rahega.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Scaling Data',
    instructions: 'Yahan jaldi sharding bol dena sabse aam galti hai. 🎤',
    questions: [
      {
        q: '"DB load nahi jhel raha. Shard karein?"',
        choices: [
          'Pehle poochhunga: read-heavy hai ya write-heavy? Indexes theek hain? Koi N+1 ya deep offset chal raha hai? Read-heavy hai toh replicas + cache. Vertical scale bhi bacha hai kya? Sharding aakhri option hai',
          'Haan, sharding se scale ho jaayega',
          'Nahi, bas badi machine le lo',
          'Read replicas add kar do',
        ],
        answer: 0,
        explain: 'Sabse achha jawab pehle <b>diagnose</b> karta hai. Zyadatar "shard karna padega" wali situations sach mein ek missing index ya ek N+1 hoti hain. Aur sharding ki keemat — cross-shard JOIN, transactions, global counts sab chale jaate hain — use aakhri option banati hai.',
      },
      {
        q: '"User bolta hai profile save nahi hua, par DB mein data hai. Kya hua?"',
        choices: [
          'Read-after-write — write primary par gaya, read replica se aaya jo peeche tha. Fix: us user ke reads kuch second primary se, ya write timestamp track karo',
          'Cache stale hai',
          'Transaction commit nahi hua',
          'Frontend bug hai',
        ],
        answer: 0,
        explain: 'Yeh replica-based architecture ka <b>sabse aam</b> user-facing bug hai. Aur woh intermittent hota hai (lag kabhi zyada, kabhi kam) — isliye reproduce karna mushkil hai aur log ise frontend bug samajh lete hain. Cache stale hona bhi possible hai, par replica lag pehla shak hona chahiye.',
      },
    ],
  },
  success: [
    'Replication, partitioning aur sharding mein farak kar sakte ho',
    'Read-after-write problem pehchaan sakte ho aur theek kar sakte ho',
    'Shard key chun sakte ho aur uske hotspots dekh sakte ho',
    'Sharding se pehle ke 5 kadam jaante ho',
  ],
  homework: `Apne system mein dekho: koi read replica se padhta hai? Agar haan, toh
    <b>read-after-write</b> ka koi handling hai? Ek test karo — profile update karke turant
    reload karo, 10 baar. Ek baar bhi purana data dikha toh tumhare paas woh bug hai.`,
  cards: [
    { front: 'Replication vs Partitioning vs Sharding?', back: '<b>Replication</b> = read scale + HA (write scale ❌). <b>Partitioning</b> = ek server, chhote tukde (capacity ❌). <b>Sharding</b> = kai servers, write scale ✅ (cross-shard JOIN ❌).' },
    { front: 'Read-after-write?', back: 'Write primary par, read replica se → <b>purana data dikha</b>. Ilaaj: sticky reads (kuch second primary se), ya write timestamp track karo.' },
    { front: 'Shard key ke liye kya achha hai?', back: '<b>user_id / tenant_id</b> — queries ek shard par, data barabar. ❌ <code>created_at</code> (saare naye writes ek shard par) · ❌ <code>country</code> (India 100x bada).' },
    { front: 'Shard key badal sakte hain?', back: '<b>Lagbhag nahi.</b> Poora data live traffic ke saath dobara baantna padta hai — mahino ka project. Isliye yeh din 1 ka sabse bada faisla hai.' },
    { front: 'Shard se pehle 5 kadam?', back: '<b>1.</b> Index <b>2.</b> Query (N+1, deep offset) <b>3.</b> Cache <b>4.</b> Read replicas <b>5.</b> Vertical scale → phir partition → phir shard.' },
  ],
},

/* ===================================================================== */
{
  id: 'boss-data',
  icon: '👑',
  title: 'BOSS — Dashboard: 12 Second se 200 ms',
  badge: 'Index Nipun',
  objectives: [
    'Poore track ko ek problem par lagao',
    'Har kadam par <b>naapo</b>, andaza mat lagao',
    'Sahi kram: index → rows bounded → cache',
  ],
  lesson: [
    `<h3>👑 Ticket: "Dashboard 12 second le raha hai"</h3>
     <p>Ek merchant dashboard hai jo 2.4 crore transactions par chalta hai.
     Product ne kaha: p99 200 ms se neeche laao.</p>
     <p>Tumhara kram yeh hona chahiye:</p>
     <pre>1. NAAPO      — plan dekho, rows examined vs returned
2. INDEX      — access pattern se match karta composite index
3. BOUNDED    — COUNT(*) hatao, limit lagao, fields kam karo
4. CACHE      — jitter ke saath
5. NAAPO      — load daal ke prove karo</pre>
     <p>Har kadam ke baad naapo. Zyadatar log kadam 4 se shuru karte hain
     (cache laga do) — aur phir stale-data bugs ke saath ek dheema system
     paate hain.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🏁 Dashboard bachao',
      goal: '2.4 crore transactions par dashboard 12 second le raha hai. Sahi kram se theek karo: naapo → index → rows bounded → cache → prove karo.',
      sys: SD.sys.txn({ api: { countTotal: true } }),
      tasks: T_BOSS_DATA,
      success: allOf(T_BOSS_DATA),
      successText: `Poora track ek problem par:
        <br><br><b>1.</b> Naapa — rows examined vs returned ne bata diya ki index chahiye
        <br><b>2.</b> Composite index — access pattern se match karta hua
        <br><b>3.</b> COUNT(*) hataya — woh chhupa hua 2.7 s
        <br><b>4.</b> Cache + jitter — stampede se bachte hue
        <br><b>5.</b> Load se prove kiya — ab capacity ke andar
        <br><br><b>Kram hi sab kuch tha.</b> Agar tum cache se shuru karte, toh tumhe ek dheema
        system stale-data bugs ke saath milta — aur pehle cache flush par sab wapas gir jaata.`,
      hints: [
        'Pehle naapo: GET /api/v1/transactions?user_id=5&page=1&limit=50',
        'Sahi composite index: CREATE INDEX ix_dash ON transactions(user_id, created_at, id)',
        'Chhupa hua COUNT hatao: sim set api.countTotal false',
        'Cache lagao jitter ke saath: sim add cache --ttl 60 --jitter 20',
        "Aur prove karo: load --rps 500 --duration 5 --path '/api/v1/transactions?user_id=5&page=1&limit=50'",
      ],
    },
    {
      type: 'quiz',
      title: 'Track ka nichod',
      questions: [
        {
          q: 'Optimization ka sahi kram kya hai?',
          choices: [
            'Naapo → index/query theek karo → rows bounded karo → phir cache. Cache aakhir mein, kyunki woh sirf lakshan chhupata hai',
            'Cache pehle, woh sabse tez faayda deta hai',
            'Hardware upgrade pehle',
            'Sharding pehle',
          ],
          answer: 0,
          explain: 'Cache se shuru karne par tum ek <b>dheema system</b> ko ek cache layer ke peeche chhupa dete ho. Pehle cache flush par sab wapas gir jaata hai — aur ab tumhare paas stale-data bugs bhi hain. Pehle asli query theek karo; cache uske BAAD ek multiplier hai, band-aid nahi.',
        },
        {
          q: 'Ek query 12 second le rahi thi aur index lagane se 380 ms ho gayi. Aage kya?',
          choices: [
            'Dekhunga ki kya woh covering ban sakti hai, aur kya koi chhupa hua COUNT(*) ya extra column hai — phir cache',
            'Bas ho gaya, 380 ms theek hai',
            'Sharding shuru karunga',
            'Aur indexes laga dunga',
          ],
          answer: 0,
          explain: '380 ms par tum SLO (200 ms) se abhi bhi upar ho. Covering index heap lookups hata deta hai (2-3x), aur <code>total</code> jaisa chhupa hua COUNT alag se seconds kha sakta hai. <b>Har kadam ke baad dobara naapo</b> — agla bottleneck aksar pehle wale se alag hota hai.',
        },
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — Data Layer',
    instructions: 'Aakhri round.',
    questions: [
      {
        q: '"Ek dashboard query 12 second le rahi hai. Poora approach batao."',
        choices: [
          'EXPLAIN se plan dekhunga (rows examined vs returned), access pattern se match karta composite index banaunga, covering banane ki koshish karunga, COUNT(*) aur extra columns hataunga, phir jitter wala cache — aur har kadam ke baad dobara naapunga',
          'Index laga dunga',
          'Cache laga dunga',
          'Read replica par bhej dunga',
        ],
        answer: 0,
        explain: 'Sabse achha jawab ek <b>kram</b> deta hai aur "har kadam ke baad naapunga" bolta hai. Yeh dikhata hai ki tum jaante ho ki agla bottleneck pehle wale se alag hota hai — aur ki cache ek <b>multiplier</b> hai, band-aid nahi.',
      },
    ],
  },
  success: [
    'Ek slow query ko systematically theek kar sakte ho',
    'Sahi kram mein optimize karte ho',
    'Har kadam par naapte ho',
    'Cache ko band-aid ki tarah nahi use karte',
  ],
  homework: `Apna sabse slow endpoint lo aur is track ka poora kram lagao —
    naapo, index, bounded, cache, phir dobara naapo. Har kadam ka number likho.
    Woh list tumhare next performance review ka sabse achha slide hai.`,
  cards: [
    { front: 'Optimization ka kram?', back: '<b>Naapo → index/query → rows bounded → cache → dobara naapo.</b> Cache aakhir mein — warna tum ek dheeme system ko chhupa rahe ho, theek nahi kar rahe.' },
    { front: 'Data track ek line mein?', back: 'Pehle <b>access pattern</b> likho, phir <b>index</b> banao jo use match kare, phir <b>rows bounded</b> karo, phir <b>cache</b> lagao — aur har kadam par <b>naapo</b>.' },
  ],
},
]);

/* =====================================================================
   L8.5 — Cache eviction, hot keys, coalescing
   (Puneet Patwari ke "30 Caching Principles" post se)
   ===================================================================== */
const T_EVICT = [
  { text: 'FIFO ke saath hit rate dekho',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'sim' && r.policy === 'fifo') },
  { text: 'Bilkul wahi keys, ab LRU ke saath',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'sim' && r.policy === 'lru') },
  { text: 'Aur ab LFU ke saath',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'sim' && r.policy === 'lfu') },
  { text: 'Dekho: is access pattern par LFU ka hit rate LRU se ZYADA hai',
    check: s => {
      const g = p => s.records.filter(r => r.kind === 'cache' && r.op === 'sim' && r.policy === p).pop();
      const lfu = g('lfu'), lru = g('lru');
      return !!(lfu && lru && lfu.hitRate > lru.hitRate);
    } },
  { text: 'Ek hot key par 50,000 rps daalo — ek node jal jaayega',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us key ki copies banao — load bant jaana chahiye',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Ek key par 5,000 ek-saath miss — bina coalescing ke',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === false) },
  { text: 'Single-flight on karo — 5,000 queries sirf 1 reh jaani chahiye',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === true && r.dbQueries === 1) },
];

SD.registerLevelsAfter('data', 'stampede', [
{
  id: 'eviction',
  icon: '🧊',
  title: 'Cache ke Andar — Kya Nikle, Kya Bache',
  badge: 'Eviction Vidwan',
  objectives: [
    'Eviction, expiry aur invalidation — <b>teen alag</b> cheezein',
    'LRU vs LFU vs FIFO — kaunsa access pattern kise pasand karta hai',
    'Hot key: ek key jo poore cluster ko bekaar kar deti hai',
    'Request coalescing — stampede ka seedha ilaaj',
  ],
  lesson: [
    `<h3>📖 Teen alag sawaal jo log ek samajh lete hain</h3>
     <table>
       <tr><th></th><th>Kab hota hai</th><th>Kaun decide karta hai</th></tr>
       <tr><td><b>Eviction</b></td><td>Memory bhar gayi</td><td>Cache khud (policy: LRU/LFU/FIFO)</td></tr>
       <tr><td><b>Expiry (TTL)</b></td><td>Waqt poora hua</td><td>Tumne likha tha (<code>ttl=60s</code>)</td></tr>
       <tr><td><b>Invalidation</b></td><td>Data <b>badal</b> gaya</td><td>Tumhara write path</td></tr>
     </table>
     <p>Yeh farak matter karta hai. "Mera cache stale data de raha hai" ka ilaaj
     eviction policy badalna <b>nahi</b> hai — woh invalidation ka bug hai.
     "Mera cache hit rate gir gaya" ka ilaaj TTL badalna <b>nahi</b> hai —
     woh aksar size ka problem hai.</p>
     <h3>🔬 Policy ka chunav = access pattern ka sawaal</h3>
     <table>
       <tr><th>Policy</th><th>Kya nikaalti hai</th><th>Kab achhi</th><th>Kab bura</th></tr>
       <tr><td><b>LRU</b></td><td>Jo sabse pehle use hui thi</td><td>Recency wale patterns — sessions, "abhi dekha hua"</td><td>Ek bada <b>scan</b> poora cache bahaa deta hai</td></tr>
       <tr><td><b>LFU</b></td><td>Jo sabse kam baar use hui</td><td>Kuch keys hamesha hot — celeb profiles, top products</td><td>Kal ki hot key <b>chipki</b> reh jaati hai (aging chahiye)</td></tr>
       <tr><td><b>FIFO</b></td><td>Jo sabse pehle aayi thi</td><td>Rolling buffer, jahan sab barabar hain</td><td>Zyadatar asli workloads par — use kabhi hi ho</td></tr>
     </table>
     <p class="tip">🎯 LRU ki sabse badi kamzori: <b>ek scan cache ko dho deta hai</b>.
     Ek analytics job jo 10 lakh rows padhta hai woh saari hot keys nikaal dega,
     jabki uski koi bhi key dobara nahi maangi jaayegi. Isiliye asli systems
     (Redis <code>allkeys-lru</code>, MySQL ka buffer pool) plain LRU nahi,
     uska <b>segmented/approximate</b> roop chalate hain — jismein nayi entry
     turant "hot" area mein nahi jaati.</p>`,
    `<h3>🔥 Hot key — woh problem jise sharding hal NAHI karti</h3>
     <p>Cricket final chal raha hai. Ek hi key — <code>match:live:score</code> —
     par 50,000 rps aa rahe hain. Tumhare paas 8 node ka Redis cluster hai.</p>
     <pre>hash("match:live:score")  →  hamesha ek hi node

node-3   ██████████████████  50,000 rps   🔥 jal raha hai
baaki 7  ·                        0 rps   😴 khaali baithe hain</pre>
     <p>Node add karne se kuch nahi hoga. Consistent hashing bhi nahi bachaayegi —
     woh <b>keys</b> ko baantti hai, ek key ko nahi. Ilaaj do hain:</p>
     <p><b>1. Key ko phailao</b> — <code>match:live:score#0</code> se
     <code>#7</code> tak 8 copies; client randomly ek chunta hai. Write par saari
     8 invalidate karni padengi, isliye yeh sirf <b>read-heavy</b> keys ke liye hai.</p>
     <p><b>2. Local (in-process) cache</b> — 1 second ka TTL app ke andar hi.
     50,000 rps ka 99.9% app ki memory se hi nikal jaayega, Redis tak jaayega hi nahi.
     Kharch: har instance ka data 1 second tak alag ho sakta hai. Live score ke liye
     yeh bilkul manzoor hai.</p>
     <h3>🤝 Coalescing — stampede ka doosra taala</h3>
     <p>Pichhle level mein tumne <b>TTL jitter</b> lagaya tha. Woh expiry ko
     <b>bikherta</b> hai. Par ek popular key toh phir bhi kisi na kisi pal expire
     hogi hi — aur us pal 5,000 requests ek saath miss karengi.</p>
     <pre>bina coalescing:  5,000 miss  →  5,000 DB queries  💥
saath mein:       5,000 miss  →      1 DB query    ✅
                  (pehli request "lock" leti hai, baaki usi ka intezaar karti hain)</pre>
     <p class="tip">🎯 Jitter <b>alag-alag keys</b> ko ek saath expire hone se rokta hai.
     Coalescing <b>ek key</b> par ek saath aaye miss ko sambhaalta hai.
     Yeh do alag bimariyan hain — dono ka ilaaj lagao.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Cache Lab',
      goal: `Ek hi access pattern ko teen policies par chalao, phir ek hot key aur
             ek stampede sambhaalo. <b>Numbers khud dekho.</b>`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_EVICT,
      success: allOf(T_EVICT),
      successText: `Ab tum "Redis laga dete hain" se aage ho.
        Policy access pattern se aati hai, hot key ko sharding nahi <b>replication</b> bachaati hai,
        aur stampede ke do alag taale hain — <b>jitter</b> (keys bikhero) aur
        <b>coalescing</b> (ek key ke saare miss ek saath samet lo).`,
      hints: [
        "Yeh pattern do hot keys + ek scan hai. FIFO se shuru: cache sim --policy fifo --size 3 --keys 'a b a b a b c d e f a b'",
        "Wahi keys LRU par: cache sim --policy lru --size 3 --keys 'a b a b a b c d e f a b'",
        "Ab LFU par: cache sim --policy lfu --size 3 --keys 'a b a b a b c d e f a b'",
        "LFU jeet gaya kyunki usne a aur b ki GINTI yaad rakhi — scan (c,d,e,f) unhe nikaal nahi paaya. LRU ke liye scan ki har key 'sabse recent' thi.",
        "Ab hot key: cache hotkey --key match:live:score --rps 50000",
        "Key ki 8 copies banao: cache hotkey --key match:live:score --rps 50000 --replicas 8",
        "Stampede bina coalescing: cache coalesce --misses 5000",
        "Ab single-flight on: cache coalesce --misses 5000 --on",
      ],
    },
    {
      type: 'bins',
      title: 'Eviction, Expiry, ya Invalidation?',
      instructions: 'Har problem ka sahi ilaaj kaunsa mechanism hai?',
      bins: [
        { id: 'evict', label: '🧊 Eviction (memory)' },
        { id: 'ttl', label: '⏳ Expiry / TTL (waqt)' },
        { id: 'inval', label: '🔄 Invalidation (data badla)' },
      ],
      items: [
        { text: 'User ne apna naam badla, par purana naam abhi bhi dikh raha hai', bin: 'inval', explain: 'Data <b>badla</b> hai. Write path ko cache key delete karni chahiye. TTL ghatana ek bandage hai — woh galat window ko chhota karta hai, khatam nahi.' },
        { text: 'Cache 8GB tak bhar gaya, memory limit aa gayi', bin: 'evict', explain: 'Yahi eviction ka poora kaam hai. Ab policy decide karti hai kaun bahar jaaye. Agar hit rate gir raha hai toh pehle <b>size</b> dekho, policy baad mein.' },
        { text: 'Exchange rate 5 minute se zyada purana nahi hona chahiye', bin: 'ttl', explain: 'Yeh <b>freshness</b> ka business rule hai, memory ka nahi. TTL = 300s. Yahan koi invalidation event hai hi nahi — data khud badalta rehta hai.' },
        { text: 'Ek analytics job chala aur uske baad sab kuch slow ho gaya', bin: 'evict', explain: 'Classic <b>LRU cache pollution</b>. Job ne 10 lakh keys chhui, sab "recent" ban gayi, aur asli hot keys bahar chali gayi. Ilaaj: analytics ko alag cache/replica do, ya scan-resistant policy.' },
        { text: 'Product ka daam badla — 3 alag cached pages par purana daam hai', bin: 'inval', explain: 'Ek data badla, teen keys asar mein aayi. Isiliye <b>cache key design</b> pehle sochte hain: agar invalidation ke liye 3 keys yaad rakhni padein, toh key design galat hai. Tag/version-based invalidation dekho.' },
        { text: 'Homepage feed 60 second purana ho toh chalega', bin: 'ttl', explain: 'Jaan-boojh ke chuni gayi staleness. Yeh sabse sasta caching decision hai — bas TTL par <b>jitter</b> lagana mat bhoolna.' },
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa workload, kaunsi policy',
      pairs: [
        { left: 'User sessions — abhi active log', right: 'LRU', explain: 'Recency hi sab kuch hai. Jo user 2 ghante se nahi aaya uska session nikal jaana bilkul theek hai.' },
        { left: 'Top 100 products jo 90% traffic khaate hain', right: 'LFU', explain: 'Kuch keys hamesha hot hain. LFU unhe ginti ke aadhar par bachaata hai — beech mein aane wale one-off products unhe nikaal nahi paate.' },
        { left: 'Aakhri 1000 events ka rolling window', right: 'FIFO', explain: 'Yahan "purana" ka matlab hi "bekaar" hai. Kaun kitni baar padha gaya, iska koi mahatva nahi.' },
        { left: 'Live match ka score — 50,000 rps ek key par', right: 'Local cache + key replication', explain: 'Yeh eviction ka sawaal hai hi nahi — <b>distribution</b> ka hai. 1s local TTL 99.9% traffic khaa jaata hai, aur bachi hui key ki copies alag nodes par baithti hain.' },
        { left: 'Exchange rate — 5 min se purana nahi chahiye', right: 'TTL (jitter ke saath)', explain: 'Freshness ka rule, memory ka nahi. Aur agar 10,000 currency pairs ek saath cache hui thi toh jitter ke bina woh ek saath expire hongi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Cache internals',
      questions: [
        {
          q: 'Ek nightly analytics job chalta hai aur uske baad subah tak API slow rehti hai. Sabse sambhaavit wajah?',
          choices: [
            'Job ne LRU cache ko dho diya — lakhon "ek baar padhi" keys ne hot keys ko bahar nikaal diya',
            'Job ne DB lock kar diya',
            'Cache server restart ho gaya',
            'TTL bahut chhota hai',
          ],
          answer: 0,
          explain: '<b>Cache pollution.</b> LRU ke liye scan ki har key "abhi use hui" hai, isliye woh sabse zyada bachaane laayak lagti hai — jabki woh dobara kabhi nahi maangi jaayegi. Isiliye analytics ko hamesha <b>alag</b> replica/cache do. Yeh "subah tak slow" wala pattern iska signature hai.',
        },
        {
          q: 'TTL par jitter laga diya hai. Phir bhi ek popular key expire hote hi DB spike karta hai. Kya missing hai?',
          choices: [
            'Request coalescing (single-flight) — ek key par ek saath aaye saare miss ko ek query mein samet leta hai',
            'TTL aur badhao',
            'Aur jitter lagao',
            'Cache size badhao',
          ],
          answer: 0,
          explain: 'Jitter <b>alag-alag keys</b> ko ek saath expire hone se rokta hai. Par <b>ek</b> key toh kisi na kisi pal expire hogi hi — aur agar us key par 5,000 rps hai, toh us ek pal mein 5,000 miss ek saath honge. Coalescing unhe ek query mein baandh deta hai. Dono chahiye.',
        },
        {
          q: '8-node Redis cluster hai. Ek key par 50,000 rps aa raha hai aur ek node 100% CPU par hai. Node badhane se kya hoga?',
          choices: [
            'Kuch nahi — ek key hamesha ek hi node par hash hoti hai. Key ki copies banani padengi',
            'Load 9 nodes par bant jaayega',
            'Consistent hashing khud sambhaal legi',
            'Redis apne aap hot key replicate kar deta hai',
          ],
          answer: 0,
          explain: 'Sharding <b>keys ko</b> baantti hai, <b>ek key ko nahi</b>. Yeh woh scaling limit hai jo log sabse aakhir mein samajhte hain: cluster ki total capacity chahe kitni ho, <b>ek key ki capacity ek node ki capacity hai</b>. Isliye ya toh key ko N copies mein todo, ya use app ke local cache mein rakh lo.',
        },
      ],
    },
    {
      type: 'hotspot',
      title: 'Cache ka andar',
      visual: 'eviction',
      questions: [
        { q: 'Memory bharne par kaun decide karta hai ki kya nikle?', target: 'policy', explain: 'Eviction policy — LRU/LFU/FIFO. Yeh sirf <b>memory pressure</b> par chalti hai; TTL aur invalidation se iska koi lena-dena nahi.' },
        { q: 'Ek scan (analytics job) LRU ka kya bigaadta hai?', target: 'pollute', explain: 'Scan ki har key "abhi use hui" ban jaati hai, isliye LRU asli hot keys ko nikaal deta hai — aur scan ki keys dobara kabhi maangi hi nahi jaati.' },
        { q: '50k rps wali ek key ko kya bachaata hai?', target: 'replicate', explain: 'Key ki N copies (<code>key#0..#7</code>) — taaki hash alag-alag nodes par jaaye. Aur uske upar 1 second ka local cache.' },
        { q: 'Ek key ke ek-saath aaye 5000 miss ko kaun samet leta hai?', target: 'flight', explain: 'Single-flight / request coalescing: pehli request DB jaati hai, baaki usi ke jawab ka intezaar karti hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Caching ke andar tak',
    instructions: 'Yahan "Redis laga denge" kaafi nahi hai. 🎤',
    questions: [
      {
        q: '"Cache hit rate 40% hai. Kaise badhaoge?"',
        choices: [
          'Pehle poochhunga ki miss kis wajah se hai — size (evictions), TTL (expiry), ya invalidation. Teenon ka ilaaj alag hai. Eviction rate aur expiry rate alag metrics honi chahiye',
          'Cache size double kar dunga',
          'TTL badha dunga',
          'LRU se LFU par shift karunga',
        ],
        answer: 0,
        explain: 'Teenon "sudhaar" bina diagnosis ke tukka hain. Agar miss <b>eviction</b> se hain toh size badhao. <b>Expiry</b> se hain toh TTL dekho. Aur agar keys itni bikhri hui hain ki har key sirf ek baar maangi jaati hai, toh cache is data ke liye galat aujaar hi hai — key design badlo. Isiliye evictions aur expirations ko <b>alag-alag</b> count karo.',
      },
      {
        q: '"Cache (Redis) poora down ho gaya. API ka kya hoga?"',
        choices: [
          'Sab traffic seedha DB par — aur DB us load ke liye size kiya hi nahi gaya tha. Isliye cache-down par load shedding + local fallback cache + DB par concurrency limit chahiye',
          'Thoda slow ho jaayega',
          'Redis HA hai, yeh hoga hi nahi',
          'Requests fail ho jaayengi',
        ],
        answer: 0,
        explain: 'Yeh sabse under-rated failure mode hai. 95% hit rate ka matlab hai DB sirf 5% traffic dekh raha tha — cache girte hi woh <b>20x</b> ho jaata hai, aur DB turant girta hai. Cache ko "optional speedup" maano, "chhupa hua load-bearing wall" nahi: DB par concurrency cap lagao, aur cache-down mode mein degrade karo.',
      },
    ],
  },
  success: [
    'Eviction, expiry aur invalidation ko alag kar sakte ho',
    'Access pattern dekh ke policy chun sakte ho — aur LRU ka scan-pollution pehchaan sakte ho',
    'Hot key ka ilaaj (replication + local cache) bata sakte ho',
    'Stampede ke dono taale — jitter aur coalescing — alag-alag samjha sakte ho',
  ],
  homework: `Apne cache ke do metrics alag karo: <code>evictions</code> aur <code>expirations</code>.
    Agar evictions zyada hain toh cache chhota hai. Agar expirations zyada hain toh TTL par baat karo.
    Aur ek sawaal apni team se poochho: "Redis abhi down ho jaaye toh DB kitna load lega?"`,
  cards: [
    { front: 'Eviction vs expiry vs invalidation?', back: '<b>Eviction</b> = memory bhari (policy decide karti hai) · <b>Expiry</b> = TTL poora (tumne likha tha) · <b>Invalidation</b> = data badla (write path ka kaam). Teenon ka ilaaj alag.' },
    { front: 'LRU ki sabse badi kamzori?', back: '<b>Scan pollution</b> — ek analytics job ki lakhon "ek baar padhi" keys sabse recent ban ke asli hot keys ko nikaal deti hain. Isiliye analytics alag replica par.' },
    { front: 'LFU kab, LRU kab?', back: '<b>LFU</b> — kuch keys hamesha hot (top products, celeb profiles); scan se bachti hain. <b>LRU</b> — recency matter karti hai (sessions). LFU mein aging chahiye warna kal ki hot key chipak jaati hai.' },
    { front: 'Ek key par 50k rps — cluster badhane se?', back: 'Kuch nahi. Ek key hamesha <b>ek node</b> par hash hoti hai. Ilaaj: key ki N copies (<code>key#0..#7</code>) + 1s ka local in-process cache.' },
    { front: 'Jitter vs coalescing?', back: '<b>Jitter</b> = alag-alag keys ek saath expire na hon. <b>Coalescing (single-flight)</b> = EK key par ek saath aaye 5000 miss → 1 DB query. Do alag bimariyan, dono ka ilaaj lagao.' },
    { front: 'Redis down ho jaaye toh?', back: '95% hit rate ka matlab DB par load <b>20x</b> ho jaayega. Cache load-bearing hai — DB par concurrency cap + local fallback + shedding pehle se socho.' },
  ],
},
]);

/* =====================================================================
   L9.5 — Storage engines: B-tree vs LSM (Database Fundamentals #2, #7)
   ===================================================================== */
const T_ENGINE = [
  { text: 'B-tree par 1 lakh writes chalao — write amplification dekho',
    check: s => s.records.some(r => r.kind === 'bench' && r.op === 'write' && r.engine === 'btree') },
  { text: 'Wahi B-tree par 1 lakh point reads',
    check: s => s.records.some(r => r.kind === 'bench' && r.op === 'read' && r.engine === 'btree') },
  { text: 'Engine ko LSM par shift karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /db\.engine/.test(r.path) && /lsm/i.test(String(r.value))) },
  { text: 'Ab LSM par writes — B-tree se saaf tez hone chahiye',
    check: s => {
      const l = s.records.filter(r => r.kind === 'bench' && r.op === 'write' && r.engine === 'lsm').pop();
      const b = s.records.filter(r => r.kind === 'bench' && r.op === 'write' && r.engine === 'btree').pop();
      return !!(l && b && l.ms < b.ms);
    } },
  { text: 'Aur LSM par reads — ab ULTA hoga',
    check: s => {
      const l = s.records.filter(r => r.kind === 'bench' && r.op === 'read' && r.engine === 'lsm').pop();
      const b = s.records.filter(r => r.kind === 'bench' && r.op === 'read' && r.engine === 'btree').pop();
      return !!(l && b && l.ms > b.ms);
    } },
  { text: 'Compaction chalao — LSM ka chhupa hua bill dekho',
    check: s => s.records.some(r => r.kind === 'bench' && r.op === 'compact' && r.ran === true) },
];

SD.registerLevelsAfter('data', 'storage', [
{
  id: 'engines',
  icon: '💾',
  title: 'Engine ke Andar — B-tree vs LSM',
  badge: 'Engine Gyata',
  objectives: [
    'Write / read / space <b>amplification</b> — teen alag kharche',
    'B-tree page in-place update karta hai, LSM sirf <b>append</b> karta hai',
    'Compaction: LSM ka taala hua bill',
    'Row vs columnar — OLTP aur OLAP ka asli farak',
  ],
  lesson: [
    `<h3>📖 "Database dheema hai" ke peechhe engine hota hai</h3>
     <p>Har database ke neeche ek storage engine hai jo tay karta hai ki
     ek row <b>disk par kaise pahunchti hai</b>. Do bade parivaar hain, aur
     unka sauda ek line mein likha ja sakta hai:</p>
     <pre>B-tree  →  "abhi kharch karo"   — har write par sahi page dhoondo, padho, badlo, likho
LSM     →  "baad mein kharch karo" — memory mein rakho, disk par APPEND karo, saaf baad mein</pre>
     <table>
       <tr><th></th><th>B-tree (Postgres, InnoDB)</th><th>LSM (RocksDB, Cassandra, ScyllaDB)</th></tr>
       <tr><td>Write</td><td>Random page I/O — dheema</td><td>Sequential append — <b>bahut tez</b></td></tr>
       <tr><td>Point read</td><td>Ek descent, ho gaya — <b>tez</b></td><td>Kai levels + bloom filters</td></tr>
       <tr><td>Range scan</td><td>Leaf pages ek kadi mein — tez</td><td>Levels ko merge karna padta hai</td></tr>
       <tr><td>Space</td><td>Fragmentation, ~1.3x</td><td>Purane versions + tombstones, ~2x</td></tr>
       <tr><td>Chhupa hua kharch</td><td>Page splits, vacuum</td><td><b>Compaction</b> — p99 par dikhta hai</td></tr>
     </table>
     <h3>🔬 Teen "amplification"</h3>
     <p><b>Write amp</b> — tumne 1 KB likha, disk par kitna gaya? B-tree mein poora
     page (8 KB) likhna padta hai + WAL + har index ka apna update → 4x se upar aam hai.</p>
     <p><b>Read amp</b> — ek row ke liye kitni jagah dekhni padi? LSM mein woh key
     memtable mein ho sakti hai, ya L0 mein, ya L3 mein. Bloom filter zyadatar levels
     ko turant "yahan nahi hai" bata deta hai — par range scan par bloom kaam nahi aata,
     wahan sab merge karna hi padta hai.</p>
     <p><b>Space amp</b> — LSM mein purana version turant delete nahi hota, aur delete
     bhi ek <b>tombstone</b> likhta hai (yaani delete karne se disk <b>badhta</b> hai).
     Compaction hi use saaf karta hai.</p>
     <p class="tip">🎯 Yeh teenon ek saath kam nahi ho sakte. Yeh
     <b>RUM conjecture</b> hai — Read, Update, Memory: kisi bhi do ko behtar karo,
     teesra bigadta hai. Isiliye "sabse achha engine" jaisi koi cheez nahi hai,
     sirf "is workload ke liye sahi engine" hota hai.</p>`,
    `<h3>🧹 Compaction — woh cheez jo 3AM par p99 chadha deti hai</h3>
     <p>LSM ke writes tez the kyunki usne kaam <b>taal</b> diya tha. Compaction wahi
     taala hua kaam karti hai: purani SSTables padho, merge karo, duplicate aur
     tombstones hatao, nayi likho.</p>
     <pre>Compaction ke doraan:
   disk I/O    ████████████  saturated
   read p99    ~3x
   CPU         merge + checksum + compression</pre>
     <p>Isiliye Cassandra/RocksDB wale systems mein "sab theek tha, achanak latency
     spike" ka jawab aksar compaction hota hai. Woh bug nahi hai — woh
     <b>bill</b> hai. Ilaaj: compaction ko throttle karo, off-peak par chalao,
     aur uski I/O ko monitor karo jaise woh ek asli workload ho — kyunki hai.</p>
     <h3>📊 Row vs Columnar — ek doosra aayaam</h3>
     <pre>ROW store (OLTP):   [id|name|city|amount]  [id|name|city|amount] ...
   "user 7 ka poora record do"       → ek jagah se sab mil gaya ✅
   "saare amounts ka SUM"            → har row ki har column padhni padi ❌

COLUMNAR (OLAP):    [id id id...] [name name...] [amount amount...]
   "saare amounts ka SUM"            → sirf ek column padhi, aur woh
                                       ek jaisi values hain → 10x compress ✅
   "user 7 ka poora record"          → 4 alag jagah se todna pada ❌</pre>
     <p class="tip">🎯 Isiliye ek hi DB dono kaam achhe se nahi kar sakta.
     Yeh "OLTP vs OLAP" ka poora sar hai: OLTP <b>thodi rows ki saari columns</b>
     maangta hai, OLAP <b>saari rows ki thodi columns</b>. Storage layout hi
     ulta hai. Isiliye analytics ke liye alag columnar store (ClickHouse,
     BigQuery, Redshift) mein data bheja jaata hai — "hum bas ek replica par
     query chala lenge" sirf shuru mein chalta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Dono engines ko chal ke dekho',
      goal: `Ek hi workload, do engines. <b>Numbers khud nikaalo</b> —
             aur phir woh kharch dhoondo jo LSM ne chhupa rakha tha.`,
      sys: SD.sys.txn({ db: { engine: 'postgres' }, api: { countTotal: false } }),
      tasks: T_ENGINE,
      success: allOf(T_ENGINE),
      successText: `Ab tum "NoSQL tez hota hai" jaisi baat nahi karoge.
        LSM writes par tez hai kyunki usne kaam <b>taal</b> diya —
        aur woh kaam compaction ke roop mein wapas aata hai.
        Chunav workload se hota hai: <b>write-heavy + range scans → LSM,
        read-heavy + chhote random updates → B-tree.</b>`,
      hints: [
        'Pehle B-tree par writes: bench write --rows 100000',
        'Ab usi engine par reads: bench read --rows 100000',
        'Engine badlo: sim set db.engine lsm',
        'LSM par writes: bench write --rows 100000',
        'LSM par reads — ab ulta natija dekho: bench read --rows 100000',
        'Aur ab chhupa hua bill: bench compact',
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa engine chuno?',
      instructions: 'Har workload ke liye sahi storage engine.',
      bins: [
        { id: 'btree', label: '🌳 B-tree' },
        { id: 'lsm', label: '📚 LSM-tree' },
        { id: 'col', label: '📊 Columnar' },
      ],
      items: [
        { text: 'Orders table — checkout, status updates, "mera order dikhao"', bin: 'btree', explain: 'Chhote random reads + updates, aur strong transactions chahiye. Classic OLTP — Postgres/MySQL.' },
        { text: 'IoT sensors — 5 lakh readings per second, kabhi update nahi', bin: 'lsm', explain: 'Bhaari append-only write rate. LSM ka sequential append yahi ke liye bana hai. Aur reads aksar range scans hote hain ("aakhri 1 ghanta"), jo LSM sambhaal leta hai.' },
        { text: '"Pichhle saal har mahine ka revenue by region"', bin: 'col', explain: 'Saari rows, sirf 3 columns. Columnar sirf woh 3 columns padhega aur ek jaisi values 10x compress hongi. Row store ko har row ki <b>har</b> column padhni padegi.' },
        { text: 'Chat messages — bahut writes, aur "is room ke aakhri 50"', bin: 'lsm', explain: 'Write-heavy + range scan by (room_id, time). LSM ka natural fit — Cassandra/ScyllaDB isi ke liye chalte hain.' },
        { text: 'User accounts — login, profile edit, email se lookup', bin: 'btree', explain: 'Kam writes, bahut point reads, unique constraints chahiye. B-tree ka ek descent sabse sasta jawab hai.' },
        { text: 'Product analytics — "kis funnel step par log gir rahe hain"', bin: 'col', explain: 'Crore rows par aggregate. Yeh OLTP DB par chalane se hi woh DB girta hai — isliye event data alag columnar store mein bhejo.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Engine ki samajh',
      questions: [
        {
          q: 'LSM par writes tez kyun hain?',
          choices: [
            'Woh disk par kuch dhoondte hi nahi — memtable + sequential append. Kharch (merge/cleanup) baad mein compaction mein chukta hai',
            'LSM data compress karta hai',
            'LSM writes ko skip kar deta hai',
            'LSM ke paas zyada memory hoti hai',
          ],
          answer: 0,
          explain: 'Yahi poora idea hai: <b>random I/O ko sequential I/O mein badal do</b>, aur ordering ka kaam baad ke liye taal do. B-tree ko har write par woh page dhoondna padta hai jahan row baithti hai. LSM bas aage likh deta hai. Kharch mita nahi — sirf <b>khiska</b> diya gaya.',
        },
        {
          q: 'Cassandra cluster mein har kuch ghante p99 read latency 3x ho jaati hai. Sabse sambhaavit wajah?',
          choices: [
            'Compaction chal rahi hai — woh disk I/O kha jaati hai aur reads uske peechhe lagti hain',
            'Network problem',
            'GC pause',
            'Ek node down hai',
          ],
          answer: 0,
          explain: 'Periodic + I/O-heavy + sirf p99 par dikhna = compaction ka signature. (GC pause bhi periodic hota hai par woh milliseconds ka hota hai aur CPU par dikhta hai, disk par nahi.) Ilaaj: compaction throttle, off-peak scheduling, aur compaction I/O ko dashboard par rakho.',
        },
        {
          q: 'LSM mein ek row DELETE karne se disk par kya hota hai?',
          choices: [
            'Ek "tombstone" likhi jaati hai — yaani delete karne se disk BADHTA hai, ghatta nahi. Jagah compaction ke baad khaali hoti hai',
            'Row turant hat jaati hai',
            'Kuch nahi hota',
            'Poori SSTable dobara likhi jaati hai',
          ],
          answer: 0,
          explain: 'Chaunkane wala par bilkul sach. LSM mein purani SSTables <b>immutable</b> hain — unhe badla nahi ja sakta. Isliye delete bhi ek naya record hai: "yeh key ab nahi hai". Isiliye Cassandra mein "bahut saare deletes" ek jaana-maana problem hai, aur tombstones ki apni GC period hoti hai.',
        },
      ],
    },
    {
      type: 'fill',
      title: 'Amplification ka hisaab',
      instructions: 'Sahi shabd chuno.',
      template: `Tumne 1 KB ka ek row likha, par disk par 8 KB gaya — yeh {0} amplification hai.
        Ek key dhoondne ke liye 4 SSTable levels dekhne padi — yeh {1} amplification hai.
        Delete ki hui rows abhi bhi disk gher rahi hain — yeh {2} amplification hai.
        Teenon ek saath kam nahi ho sakte — isko {3} kehte hain.`,
      tokens: ['write', 'read', 'space', 'RUM conjecture', 'CAP theorem', 'network'],
      blanks: [
        { answer: 'write', explain: 'Write amp = disk par gaya bytes ÷ tumne likhe bytes. Page-level writes + WAL + har index ka update milke ise 4x+ le jaate hain.' },
        { answer: 'read', explain: 'Read amp = ek logical read ke liye kitni physical jagah dekhni padi. LSM mein levels, B-tree mein tree ki depth.' },
        { answer: 'space', explain: 'Space amp = disk par size ÷ asli data ka size. LSM mein purane versions + tombstones ise ~2x rakhte hain jab tak compaction na chale.' },
        { answer: 'RUM conjecture', explain: '<b>R</b>ead, <b>U</b>pdate, <b>M</b>emory — kisi bhi do ko optimize karo, teesra bigadta hai. Isiliye "sabse achha engine" hota hi nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Storage engine',
    instructions: 'Yeh sawaal alag karta hai ki tumne DB <b>use</b> kiya hai ya <b>samjha</b> hai. 🎤',
    questions: [
      {
        q: '"Time-series metrics store karne hain — 10 lakh writes/sec. Kaunsa DB?"',
        choices: [
          'LSM-based (Cassandra/ScyllaDB) ya purpose-built TSDB. Write-heavy + append-only + range-scan by time — sab LSM ke favour mein. Postgres yahan write amplification par mar jaayega',
          'Postgres — woh sab kuch kar leta hai',
          'MongoDB',
          'Redis',
        ],
        answer: 0,
        explain: 'Yahan har signal ek hi taraf ishara karta hai: writes bahut, updates lagbhag zero, reads range-scan by time, aur purana data drop hota rehta hai. Yeh LSM ki definition hai. (Aur agar bolo "Postgres + TimescaleDB" toh woh bhi sahi jawab hai — woh chunking + compression laga ke usi problem ko alag tareeke se hal karta hai.)',
      },
      {
        q: '"Ek hi Postgres par OLTP aur analytics dono chal rahe hain. Kya galat hai?"',
        choices: [
          'Do bilkul ulte access patterns ek hi engine par hain — analytics ke bade scans buffer pool dho dete hain aur OLTP ka p99 chadh jaata hai. Alag karo: read replica se shuru, phir columnar store',
          'Kuch galat nahi, bas machine badi kar do',
          'Index add kar do',
          'Analytics raat mein chalao',
        ],
        answer: 0,
        explain: 'Asli nuksaan latency nahi, <b>cache pollution</b> hai — ek analytics scan buffer pool mein se saara hot OLTP data nikaal deta hai (bilkul wahi jo tumne LRU level mein dekha). Machine badi karna sirf line aage khiskata hai. Read replica pehla practical kadam hai; par jab query "crore rows par aggregate" ban jaayein toh row store hi galat aujaar hai — columnar chahiye.',
      },
    ],
  },
  success: [
    'Write, read aur space amplification alag-alag samjha sakte ho',
    'B-tree vs LSM ka chunav workload se justify kar sakte ho',
    'Compaction ko latency spikes se jod sakte ho',
    'Row vs columnar ka farak aur OLTP/OLAP ka batwara bata sakte ho',
  ],
  homework: `Apne main DB ka engine pata karo (Postgres = B-tree, MongoDB = B-tree, Cassandra/RocksDB = LSM).
    Phir apni sabse bhaari table ka read:write ratio nikaalo. Kya woh engine us ratio ke liye sahi hai?
    Aur ek sawaal: tumhari analytics query kis DB par chalti hai?`,
  cards: [
    { front: 'B-tree vs LSM — ek line?', back: '<b>B-tree</b> = "abhi kharch karo" (random page write). <b>LSM</b> = "baad mein kharch karo" (sequential append + compaction). Kharch mita nahi, khiska hai.' },
    { front: 'Teen amplification?', back: '<b>Write</b> (disk par gaya ÷ likha) · <b>Read</b> (kitni jagah dekhni padi) · <b>Space</b> (disk size ÷ data size). RUM conjecture: teenon ek saath achhe nahi ho sakte.' },
    { front: 'Cassandra par periodic p99 spike?', back: '<b>Compaction.</b> Woh LSM ka taala hua bill hai — disk I/O saturate karti hai. Throttle karo, off-peak chalao, uski I/O monitor karo.' },
    { front: 'LSM mein DELETE se disk?', back: '<b>Badhta hai</b> — ek tombstone likhi jaati hai. SSTables immutable hain. Jagah compaction ke baad milti hai.' },
    { front: 'Row vs columnar?', back: '<b>Row</b> = thodi rows ki saari columns (OLTP). <b>Columnar</b> = saari rows ki thodi columns (OLAP) + 10x compression. Layout hi ulta hai — ek DB dono achha nahi kar sakta.' },
    { front: 'OLTP DB par analytics chalane ka asli nuksaan?', back: 'Latency nahi — <b>cache pollution</b>. Bada scan buffer pool se hot OLTP data nikaal deta hai. Replica → phir columnar store.' },
  ],
},
]);

/* =====================================================================
   L10.5 — Migrations & backfill (Database Fundamentals #10 + prep-post)
   "Ek migration plan, backfill, verification aur rollback" — Sameer Bhardwaj
   ===================================================================== */
const T_DBMIGRATE = [
  { text: 'Migration ki haalat dekho',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'status') },
  { text: 'Seedha backfill chala do (galat kram — jaan-boojh ke)',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'backfill' && r.dualWrite === false) },
  { text: 'Verify karo — drift pakda jaana chahiye',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'verify' && r.verified === false && r.drift > 0) },
  { text: 'Rollback karo — abhi mumkin hai kyunki purani table source of truth hai',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'rollback') },
  { text: 'Ab SAHI kram: pehle dual-write on',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'dual-write' && r.dualWrite === true) },
  { text: 'Phir chhote batch mein backfill (50k se kam, warna replica lag)',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'backfill' && r.dualWrite === true && r.lockRisk === false) },
  { text: 'Ab verify — drift zero hona chahiye',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'verify' && r.verified === true) },
  { text: 'Aur ab cutover — surakshit',
    check: s => s.records.some(r => r.kind === 'migrate' && r.op === 'cutover' && r.safe === true) },
];

SD.registerLevelsAfter('data', 'sharding', [
{
  id: 'migrations',
  icon: '🔄',
  title: 'Migration — 2 Crore Rows, Zero Downtime',
  badge: 'Migration Marmagya',
  objectives: [
    'Expand-contract: purana aur naya <b>saath</b> chalte hain',
    'Kram: dual-write → backfill → <b>verify</b> → cutover',
    'Backfill batch size ka replica lag se rishta',
    'Rollback ka darwaza kab band ho jaata hai',
  ],
  lesson: [
    `<h3>📖 Migration mein "downtime" sabse chhota problem hai</h3>
     <p>Sabse bada problem <b>chup-chaap galat data</b> hai. Downtime dikhta hai —
     koi bhi pakad lega. Par 41,204 rows jo backfill ke doraan chhoot gayi,
     woh mahino tak nahi dikhengi... jab tak koi customer support ticket na aaye.</p>
     <p>Isiliye har achhi migration ka ek hi shape hota hai:</p>
     <pre>1. EXPAND     nayi table/column banao — purani ko haath mat lagao
2. DUAL-WRITE har naya write DONO jagah jaaye     ← yeh SABSE PEHLE
3. BACKFILL   purana data chhote batches mein copy karo
4. VERIFY     count + checksum — dono match karein
5. CUTOVER    reads nayi jagah se (ek FLAG se, deploy se nahi)
6. CONTRACT   kuch din baad purani jagah likhna band, phir hatao</pre>
     <p class="tip">🎯 Kadam 2 aur 3 ka kram badalna hi <b>sabse aam</b> migration
     bug hai. Agar tum pehle backfill karoge, toh backfill chalte waqt jo naye
     writes aayenge woh nayi table mein kabhi pahunchenge hi nahi. Backfill ek
     <b>snapshot</b> copy karta hai; dual-write us snapshot ke baad ki duniya
     sambhaalta hai. Dono ke beech mein koi khaali jagah nahi bachni chahiye.</p>`,
    `<h3>🔬 Backfill: batch size ek latency decision hai</h3>
     <pre>UPDATE ... WHERE id BETWEEN 1 AND 20000000    ← ek statement, 20 minute
   → ek LAMBI transaction: locks pakde, undo log phoola,
     replica lag 300s+, aur beech mein fail hui toh poora rollback

WHILE (rows bache):                            ← chhote batches
   UPDATE ... WHERE id BETWEEN ? AND ?+5000
   COMMIT
   sleep(50ms)                                 ← DB ko saans lene do</pre>
     <p>Chhote batches dheeme lagte hain par woh <b>resumable</b> hain, replica lag
     nahi banate, aur beech mein rok ke wapas shuru kiye ja sakte hain.
     Migration ka dhyeya "jaldi" nahi hai — <b>"kisi ko pata na chale"</b> hai.</p>
     <h3>✅ Verify ko skip mat karo</h3>
     <p>Verify sirf <code>COUNT(*)</code> nahi hai. Teen level:</p>
     <table>
       <tr><td><b>Count</b></td><td>rows barabar hain?</td><td>sasta, roz chalao</td></tr>
       <tr><td><b>Checksum</b></td><td>values bhi barabar hain?</td><td>batch-wise hash</td></tr>
       <tr><td><b>Shadow read</b></td><td>asli traffic dono jagah se padho aur compare karo</td><td>sabse pakka</td></tr>
     </table>
     <p>Shadow read sabse achha hai: cutover se pehle hi tum <b>asli</b> queries par
     dono jagah ka jawab compare kar lete ho, aur mismatch log kar dete ho —
     bina user ko kuch dikhaye.</p>
     <h3>🚪 Rollback ka darwaza</h3>
     <p class="tip">🎯 Rollback tab tak mumkin hai jab tak <b>purani table source of
     truth hai</b>. Jis pal tum purani jagah likhna band karte ho, darwaza band ho
     jaata hai — uske baad "wapas" jaane ka matlab hai naya data khona.
     Isiliye dual-write cutover ke <b>baad bhi</b> kuch din chalne do,
     aur cutover ek <b>flag</b> ho: deploy rollback mein 20 minute lagte hain,
     flag palatne mein 20 second.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Migration, do baar',
      goal: `Pehle <b>galat kram</b> se migration chalao aur dekho ki data chup-chaap
             kaise gayab hota hai. Phir rollback karke sahi kram se karo.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_DBMIGRATE,
      success: allOf(T_DBMIGRATE),
      successText: `Tumne dono raaste dekhe. Farak sirf ek kadam ke <b>kram</b> ka tha —
        aur usi se 41,204 rows chup-chaap kho gayi thi.
        <b>dual-write → backfill → verify → cutover.</b> Aur rollback ka darwaza
        tabhi tak khula hai jab tak purani table source of truth hai.`,
      hints: [
        'Pehle haalat dekho: migrate status',
        'Ab galat kram — seedha backfill: migrate backfill --batch 5000',
        'Ab verify karo aur nuksaan dekho: migrate verify',
        'Wapas jao: migrate rollback',
        'Ab sahi kram — pehle dual-write: migrate dual-write on',
        'Phir chhote batch mein backfill: migrate backfill --batch 5000',
        'Ab verify saaf hona chahiye: migrate verify',
        'Aur ab surakshit cutover: migrate cutover',
      ],
    },
    {
      type: 'order',
      title: 'Ek column rename karne ka sahi kram',
      instructions: 'Zero-downtime column rename ke kadam sahi order mein.',
      steps: [
        { text: 'Naya column add karo (nullable) — purana chhua bhi nahi', explain: '<b>Expand.</b> Nullable isliye ki purane rows ko turant bharne ki zaroorat na pade — warna ek ALTER poori table lock kar dega.' },
        { text: 'App ko DONO columns likhne lago, padho abhi bhi purane se', explain: '<b>Dual-write.</b> Ab se koi naya data chhootega nahi. Yeh backfill se PEHLE aana chahiye — yahi poore kram ka dil hai.' },
        { text: 'Purane rows ko chhote batches mein backfill karo', explain: '5k–10k rows per batch + beech mein sleep. Resumable, replica-friendly, aur rok ke dobara shuru kiya ja sakta hai.' },
        { text: 'Verify — count + checksum + shadow reads', explain: 'Yahan tumhe <b>saboot</b> milta hai. Bina iske cutover ek ummeed hai, decision nahi.' },
        { text: 'Reads ko naye column par shift karo — ek feature flag se', explain: '<b>Cutover.</b> 1% → 10% → 100%. Flag isliye ki wapas aana 20 second ka kaam ho, 20 minute ka deploy nahi.' },
        { text: 'Kuch din baad purane column mein likhna band karo', explain: 'Ab rollback ka darwaza band ho raha hai — isliye "kuch din baad", turant nahi. Tab tak dono bharte raho.' },
        { text: 'Purana column drop karo', explain: '<b>Contract.</b> Sabse aakhir mein, aur tab jab metrics kah dein ki koi use nahi kar raha. Yeh kadam mahine baad aa sakta hai — koi jaldi nahi.' },
      ],
    },
    {
      type: 'incident',
      title: 'Incident — Migration ke beech',
      pager: '🚨 02:14 — "Nayi table par shift kiye 6 ghante ho gaye. Support keh raha hai kuch users ke purane orders gayab hain."',
      start: 'q1',
      nodes: {
        q1: {
          text: 'Cutover kal raat hua tha. Backfill "successful" dikha tha. Pehla kadam?',
          choices: [
            { t: 'Turant flag palat ke reads wapas purani table par karo', good: true, next: 'q2', explain: 'Sahi. Cutover ek flag tha, isliye rollback 20 second ka kaam hai. Pehle <b>khoon roko</b>, diagnosis baad mein — kyunki purani table abhi bhi source of truth hai aur wahan poora data hai.' },
            { t: 'Pehle root cause dhoondo ki kitne rows gayab hain', good: false, explain: 'Diagnosis zaroori hai — par abhi users ka data gayab dikh raha hai. Rollback ek flag door hai aur uska koi nuksaan nahi. Pehle bleeding roko.' },
            { t: 'Gayab rows manually copy kar do', good: false, explain: 'Tumhe abhi pata bhi nahi ki kitni aur kaunsi rows gayab hain. Manual patch bina verify ke naya, aur gehra, corruption bana sakta hai.' },
          ],
        },
        q2: {
          text: 'Reads wapas purani table par hain, users theek hain. Ab wajah dhoondo.',
          choices: [
            { t: 'migrate verify chalao — count aur checksum compare karo', good: true, next: 'q3', explain: 'Yahi woh kadam tha jo cutover se pehle chhoot gaya tha. Ab yeh exact number dega — anumaan nahi.' },
            { t: 'Backfill dobara chala do', good: false, explain: 'Bina jaane ki drift kyun hai, dobara backfill wahi galti dohra sakta hai. Aur agar dual-write abhi bhi off hai toh natija wahi rahega.' },
            { t: 'Application logs padho', good: false, explain: 'Logs madad karenge, par yahan seedha sawaal hai "dono tables mein kitna farak hai" — aur uska seedha jawab count + checksum hai.' },
          ],
        },
        q3: {
          text: 'Verify: 41,204 rows ka farak. Sab timestamps backfill wale 3-ghante ke window ke hain. Kya hua tha?',
          choices: [
            { t: 'Dual-write backfill ke BAAD on kiya gaya tha — us window ke naye writes sirf purani table mein gaye', good: true, next: 'end', explain: 'Bilkul. Backfill ne ek snapshot copy kiya, aur us snapshot ke baad aaye writes nayi table mein kabhi pahunche hi nahi. Isiliye kram hamesha <b>dual-write pehle</b> hai. Ab: dual-write on karo, backfill dobara (idempotent upsert se), verify, phir 1% traffic se cutover.' },
            { t: 'Backfill script mein bug tha', good: false, explain: 'Mumkin hai, par saboot iske khilaaf hai: gayab rows <b>ek hi time window</b> ki hain, bikhri hui nahi. Bug hota toh nuksaan random hota. Time-window ka pattern hamesha "us doraan aaye writes" ki taraf ishara karta hai.' },
            { t: 'Replica lag ki wajah se rows dikh nahi rahi', good: false, explain: 'Replica lag 6 ghante nahi rehta, aur woh rows ko <b>gayab</b> nahi karta — sirf der se dikhata hai. Yahan checksum bhi mismatch hai, toh data sach mein nahi hai.' },
          ],
        },
        end: {
          end: true,
          text: 'Reads wapas purani table par. Users theek hain. Root cause mil gaya.',
          summary: `<b>Seekh:</b> Galti "backfill" mein nahi thi — <b>kram</b> mein thi.
            <br><br><b>Sahi kram:</b> <code>dual-write → backfill → verify → cutover</code>
            <br><br><b>Teen cheezein jinhone bachaya:</b>
            <br>• Cutover ek <b>flag</b> tha — rollback 20 second ka kaam tha, 20 minute ka deploy nahi
            <br>• Purani table abhi bhi <b>source of truth</b> thi — isliye wapas jaana mumkin tha
            <br>• Gayab rows ka <b>ek hi time window</b> hona seedha root cause tak le gaya
            <br><br><b>Aur ek:</b> yeh galti koi error nahi deti. Sirf <code>verify</code> ise pakadta hai —
            isiliye woh optional nahi hai.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Migration ki samajh',
      questions: [
        {
          q: 'Backfill se PEHLE dual-write on karna kyun zaroori hai?',
          choices: [
            'Backfill ek snapshot copy karta hai. Uske chalte waqt aaye naye writes nayi table mein tabhi jaayenge jab dual-write pehle se on ho',
            'Isse backfill tez hota hai',
            'Yeh convention hai',
            'Warna DB error deta hai',
          ],
          answer: 0,
          explain: 'Dono kadam milke ek poora cover dete hain: <b>backfill</b> ateet sambhaalta hai, <b>dual-write</b> vartaman. Kram ulta karne se beech mein ek khaali khidki ban jaati hai — aur us khidki ka data chup-chaap kho jaata hai. Yeh galti error nahi deti, isliye sirf verify hi ise pakadta hai.',
        },
        {
          q: 'Cutover ko feature flag se karna kyun behtar hai, deploy se nahi?',
          choices: [
            'Flag 20 second mein palat jaata hai aur uska blast radius chhota hai; deploy rollback mein 20 minute lagte hain — jo ek incident mein bahut lamba hai',
            'Flags tez chalte hain',
            'Deploy mein bug aa sakta hai',
            'Flag se code saaf rehta hai',
          ],
          answer: 0,
          explain: 'Migration mein sabse zaroori sawaal yeh hai: <b>"galat hua toh wapas aane mein kitna waqt lagega?"</b> Flag se woh jawab seconds mein hota hai, aur tum 1% traffic par pehle test bhi kar sakte ho. Isiliye risky changes hamesha flag ke peechhe jaate hain.',
        },
        {
          q: 'Rollback ka darwaza kab band ho jaata hai?',
          choices: [
            'Jis pal purani table par likhna band ho jaata hai — uske baad wapas jaane ka matlab naya data khona',
            'Cutover ke turant baad',
            'Jab purani table drop ho',
            'Jab backfill poora ho',
          ],
          answer: 0,
          explain: 'Cutover ke baad bhi <b>reads</b> nayi jagah se aa rahe hain par <b>writes</b> dono jagah ja rahe hain — isliye purani table abhi bhi poori aur wapas laayak hai. Woh rishta tabhi tootta hai jab tum dual-write band karte ho. Isiliye "contract" phase hamesha aakhir mein aur jaan-boojh ke der se aata hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Migration',
    instructions: 'Yeh sawaal senior aur staff ko alag karta hai. 🎤',
    questions: [
      {
        q: '"2 crore rows wali table ko naye schema par le jaana hai, bina downtime. Plan bolo."',
        choices: [
          'Expand-contract: naya column/table banao → dual-write on → chhote batches mein backfill (sleep ke saath) → count + checksum + shadow read se verify → flag se 1%→100% cutover → kuch din baad purana likhna band → drop',
          'Maintenance window lo aur ek raat mein migrate kar do',
          'Nayi table banao, data copy karo, app switch kar do',
          'ALTER TABLE chala do, Postgres handle kar lega',
        ],
        answer: 0,
        explain: 'Jo cheez interviewer sun-na chahta hai woh <b>kram</b> aur <b>rollback</b> hai. Doosra option chhote systems mein chalta hai par global product mein window hai hi nahi. Teesra wahi galti hai jo tumne mission mein ki — backfill ke doraan ke writes kho jaayenge. Aur chautha ek 20-minute lock hai jo poora site gira dega.',
      },
      {
        q: '"Cutover ke baad tumhe kaise pata chalega ki sab theek hai?"',
        choices: [
          'Cutover se PEHLE shadow reads chalunga aur mismatch rate log karunga; cutover 1% traffic par karunga aur error rate + business metric (orders/min) dono dekhunga — sirf latency nahi',
          'Error rate dekhunga',
          'QA se test karwaunga',
          'Support tickets ka intezaar karunga',
        ],
        answer: 0,
        explain: 'Silent data bugs <b>error rate par dikhte hi nahi</b> — API 200 lauta rahi hai, bas galat data ke saath. Isiliye business metric chahiye (orders/min, revenue/hour): agar woh gir jaaye toh kuch toota hai chahe har request 200 ho. Aur shadow read cutover se pehle hi jawab de deta hai.',
      },
    ],
  },
  success: [
    'Expand-contract migration ka poora kram bol sakte ho',
    'Jaante ho ki dual-write backfill se PEHLE kyun aata hai',
    'Backfill batch size ko replica lag se jod sakte ho',
    'Verify ke teen level aur rollback ki khidki samajhte ho',
  ],
  homework: `Apni team ki aakhri schema migration nikaalo. Uske saamne yeh 4 sawaal likho:
    (1) dual-write backfill se pehle tha? (2) verify kaise hua — count, checksum, ya sirf ummeed?
    (3) cutover flag se tha ya deploy se? (4) rollback mein kitna waqt lagta?
    Jitne jawab khaali hain, utna risk agli baar bhi rahega.`,
  cards: [
    { front: 'Zero-downtime migration ka kram?', back: '<b>expand → dual-write → backfill → verify → cutover → contract.</b> Dual-write backfill se PEHLE — warna beech ka data chup-chaap kho jaata hai.' },
    { front: 'Dual-write pehle kyun?', back: 'Backfill <b>ateet</b> copy karta hai (snapshot), dual-write <b>vartaman</b> sambhaalta hai. Kram ulta = beech mein khaali khidki = silent data loss.' },
    { front: 'Backfill batch size?', back: '5k–10k rows + beech mein sleep. Bade batch = lambi transaction = locks + undo bloat + replica lag. Dhyeya "jaldi" nahi, <b>"kisi ko pata na chale"</b>.' },
    { front: 'Verify ke teen level?', back: '<b>Count</b> (sasta) → <b>Checksum</b> (values bhi) → <b>Shadow read</b> (asli traffic dono jagah, compare + log). Sabse pakka teesra.' },
    { front: 'Cutover flag se kyun, deploy se nahi?', back: 'Flag 20 second mein palatta hai, deploy 20 minute leta hai. Aur flag se 1%→10%→100% kar sakte ho.' },
    { front: 'Rollback ka darwaza kab band?', back: 'Jis pal <b>purani table par likhna band</b> hota hai. Isliye dual-write cutover ke baad bhi kuch din chalao.' },
  ],
},
]);

/* =====================================================================
   L3.5 — Unique IDs at scale   (ByteByteGo / Hello Interview ka classic)
   ===================================================================== */
const T_IDS = [
  { text: 'Kuch UUIDv4 dekho — koi kram hai?',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'gen' && r.type === 'uuid4') },
  { text: 'Ab Snowflake — dhyaan do ki woh badhti hain',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'gen' && r.type === 'snowflake') },
  { text: 'UUIDv4 primary key par 10 lakh inserts',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'uuid4') },
  { text: 'Wahi kaam Snowflake par',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'snowflake') },
  { text: 'Dekho: sortable id se page splits lagbhag khatam ho gaye',
    check: s => {
      const u = s.records.filter(r => r.kind === 'id' && r.op === 'bench' && r.sortable === false).pop();
      const k = s.records.filter(r => r.kind === 'id' && r.op === 'bench' && r.sortable === true).pop();
      return !!(u && k && k.splits < u.splits / 10 && k.ms < u.ms);
    } },
  { text: 'ULID bhi dekh lo — UUID jitna bada, par sortable',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'ulid') },
];

SD.registerLevelsAfter('data', 'composite', [
{
  id: 'ids',
  icon: '🆔',
  title: 'IDs — Random Primary Key Ki Chhupi Hui Keemat',
  badge: 'ID Shilpi',
  objectives: [
    'Random UUID primary key B-tree ko kaise todta hai',
    'Snowflake ka 64-bit kaise tootta hai — aur woh coordination-free kyun hai',
    'Sortable id se cursor pagination <b>muft</b> mein theek ho jaati hai',
    'External id aur primary key alag ho sakte hain — aur honi chahiye',
  ],
  lesson: [
    `<h3>📖 "UUID hi use kar lete hain" — aur uska bill</h3>
     <p>UUIDv4 ka waada bahut achha hai: koi coordination nahi, koi central counter
     nahi, takraane ka darr nahi, aur URL mein daalne par koi guess nahi kar sakta
     (<code>/orders/1247</code> se <code>/orders/1248</code> maang lena aasan hai).</p>
     <p>Par jab woh <b>primary key</b> ban jaata hai, tab ek chhupa hua bill aata hai —
     aur woh seedha B-tree se aata hai, jo tumne pichhle levels mein dekha:</p>
     <pre>Sortable id (autoinc/Snowflake):
   har naya row  →  B-tree ke AAKHRI page par
                 →  woh page pehle se memory mein garam hai
                 →  koi split nahi, koi random I/O nahi

Random id (UUIDv4):
   har naya row  →  B-tree mein KAHIN BHI
                 →  woh page shayad disk se laana pade
                 →  page bhara hua ho toh SPLIT
                 →  index bikhar jaata hai (fragmentation)</pre>
     <p class="tip">🎯 Aur ek doosri, kam dikhne wali kami: <b>UUIDv4 se sort karne ka
     koi matlab nahi</b>. Isliye woh cursor pagination ka tie-breaker nahi ban sakta —
     <code>(created_at, id)</code> wala keyset tab hi kaam karta hai jab <code>id</code>
     ka kram <b>waqt</b> ke kram jaisa ho. Random id ke saath ek hi millisecond ke
     do rows ka kram har baar alag ho sakta hai.</p>`,
    `<h3>❄️ Snowflake — 64 bits mein sab kuch</h3>
     <pre>┌─1─┬────────── 41 ──────────┬──── 10 ────┬──── 12 ────┐
│ 0 │      timestamp (ms)     │ machine id │  sequence  │
└───┴─────────────────────────┴────────────┴────────────┘

41 bit timestamp  →  69 saal (ek custom epoch se)
10 bit machine    →  1024 machines, kabhi nahi takraayengi
12 bit sequence   →  4096 ids per machine PER MILLISECOND</pre>
     <p>Timestamp <b>sabse aage</b> hai — isliye jab tum ids ko number ki tarah sort
     karte ho, woh apne aap <b>waqt ke kram</b> mein aa jaati hain. Aur koi central
     service nahi chahiye: har machine apni id khud bana leti hai.</p>
     <p><b>Ek asli khatra:</b> agar server ki clock <b>peechhe</b> chali jaaye (NTP
     adjustment), toh woh ids dobara ban sakti hain. Isiliye asli implementations
     clock peeche jaane par <b>ruk jaati hain</b> ya ek logical counter aage badha
     deti hain — kabhi chupchaap purani id nahi dohraati.</p>
     <table>
       <tr><th></th><th>autoinc</th><th>UUIDv4</th><th>ULID</th><th>Snowflake</th></tr>
       <tr><td>Size</td><td>8 B</td><td>16 B</td><td>16 B</td><td>8 B</td></tr>
       <tr><td>Sortable</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td></tr>
       <tr><td>Coordination</td><td>❌ DB chahiye</td><td>✅ kuch nahi</td><td>✅ kuch nahi</td><td>⚠️ machine id</td></tr>
       <tr><td>Guess-proof</td><td>❌</td><td>✅</td><td>⚠️ time leak</td><td>⚠️ time leak</td></tr>
       <tr><td>Distributed writes</td><td>❌ bottleneck</td><td>✅</td><td>✅</td><td>✅</td></tr>
     </table>
     <h3>🎯 Practical raasta: do alag ids</h3>
     <pre>id            BIGINT (Snowflake / autoinc)   ← PRIMARY KEY, index-friendly
public_id     UUID / short code              ← API aur URL mein yahi jaata hai</pre>
     <p class="tip">🎯 Isse dono cheezein mil jaati hain: index sequential rehta hai
     (writes tez, cursor pagination sahi), aur bahar koi tumhara row count guess
     nahi kar sakta na hi <code>/orders/1248</code> maang sakta hai.
     Kharch: ek extra unique index. Woh lagbhag hamesha manzoor hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Random vs sortable',
      goal: `Do id schemes par 10 lakh inserts chalao aur B-tree ka farak khud dekho.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_IDS,
      success: allOf(T_IDS),
      successText: `Ek "chhota sa" faisla — kaunsi id — ne write throughput,
        index size aur cursor pagination teenon badal diye.
        Aur yeh koi naya sabak nahi tha: yeh wahi <b>B-tree</b> hai jo tum
        pehle se jaante ho, ab primary key ki taraf se dekha gaya.`,
      hints: [
        'Pehle UUIDv4 dekho: id gen uuid4 --n 5',
        'Ab Snowflake — badhte hue numbers: id gen snowflake --n 5',
        'UUIDv4 par 10 lakh inserts: id bench --type uuid4 --rows 1000000',
        'Wahi Snowflake par: id bench --type snowflake --rows 1000000',
        'Ab ULID bhi: id bench --type ulid --rows 1000000',
        'Aur baseline ke liye autoinc: id bench --type autoinc --rows 1000000',
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsi id kahan',
      instructions: 'Har sthiti ke liye sahi id scheme.',
      bins: [
        { id: 'auto', label: '🔢 AUTO_INCREMENT' },
        { id: 'uuid', label: '🎲 UUIDv4' },
        { id: 'sort', label: '❄️ Snowflake / ULID' },
      ],
      items: [
        { text: 'Ek hi Postgres, chhoti app, internal admin tool', bin: 'auto', explain: 'Sabse simple aur sabse chhota. Jab tak ek hi DB writer hai aur ids bahar nahi jaati, autoinc se behtar kuch nahi. Boring jeetta hai.' },
        { text: 'Public URL mein dikhne wala id — /invoices/<id>', bin: 'uuid', explain: 'Autoinc yahan do cheezein leak karta hai: tumhara total count, aur doosron ke records (<code>/invoices/1248</code> maang lo). UUID guess-proof hai.' },
        { text: '5 services alag-alag jagah se ek hi table mein likh rahi hain', bin: 'sort', explain: 'Coordination-free chahiye <b>aur</b> index-friendly bhi. Snowflake dono deta hai — har service apni id banati hai, aur woh phir bhi waqt ke kram mein rehti hain.' },
        { text: 'Client offline mein rows banata hai, baad mein sync karta hai', bin: 'uuid', explain: 'Client ko server se poochhe bina id chahiye, aur takraana bilkul nahi chahiye. ULID bhi chalega aur sortable bhi hoga — par agar client ki clock par bharosa nahi toh UUIDv4 zyada surakshit hai.' },
        { text: 'Events table jahan 50,000 inserts/sec aate hain', bin: 'sort', explain: 'Yahan random id ka page-split tax seedha throughput khaa jaayega. Sortable id se har insert aakhri (garam) page par jaata hai.' },
        { text: 'Ek row jise cursor pagination se page karna hai', bin: 'sort', explain: '<code>(created_at, id)</code> tie-breaker tabhi sahi hai jab id ka kram waqt ka kram ho. Random id ke saath ek hi millisecond ke rows ka order har baar badal sakta hai — aur woh rows skip ya duplicate karta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'IDs ki samajh',
      questions: [
        {
          q: 'UUIDv4 primary key par writes dheeme kyun hote hain?',
          choices: [
            'Har insert B-tree mein random jagah jaata hai — woh page disk se laana pad sakta hai, aur bharne par split hota hai. Sortable id hamesha aakhri (garam) page par jaata hai',
            'UUID bada hota hai isliye',
            'UUID generate karna mehenga hai',
            'Database UUID support nahi karta',
          ],
          answer: 0,
          explain: 'Size ka thoda asar hai (16 vs 8 bytes) par asli kharch <b>random insert order</b> ka hai. Yeh bilkul wahi baat hai jo tumne B-tree level mein seekhi thi: sorted structure mein sequential insert sasta hai, random insert mehenga. Bas ab woh baat primary key ke faisle par lag rahi hai.',
        },
        {
          q: 'Snowflake ka timestamp sabse aage kyun rakha jaata hai?',
          choices: [
            'Taaki id ko number ki tarah sort karne par woh WAQT ke kram mein aa jaaye — index bhi sequential rehta hai aur cursor tie-breaker bhi sahi ho jaata hai',
            'Taaki id chhoti rahe',
            'Taaki uniqueness bane',
            'Taaki debugging aasan ho',
          ],
          answer: 0,
          explain: 'Bit order hi poora design hai. Timestamp aage ho toh sorting = time ordering. Agar machine id aage hota, toh saari ids machine ke hisaab se group ho jaati aur woh sequential-insert wala faayda khatam ho jaata.',
        },
        {
          q: 'API mein UUID chahiye par index sequential rakhna hai. Kya karoge?',
          choices: [
            'Do ids: internal BIGINT primary key (Snowflake/autoinc) + ek public UUID column jispar unique index ho. API sirf public id dikhaaye',
            'UUID ko hi primary key rakho',
            'UUID ko string ki jagah binary(16) mein rakho',
            'Autoinc use karo aur URL mein encode kar do',
          ],
          answer: 0,
          explain: 'Yeh standard hal hai kyunki yeh dono zaroorton ko <b>alag</b> kar deta hai: index ki zaroorat sequential id ki hai, API ki zaroorat guess-proof id ki. (binary(16) UUID ko chhota kar deta hai — achha hai — par random insert ka problem wahi rehta hai.)',
        },
      ],
    },
    {
      type: 'order',
      title: 'Snowflake id banne ka kram',
      instructions: 'Ek id banane ke kadam sahi order mein.',
      steps: [
        { text: 'Abhi ka time lo aur usme se custom epoch ghatao', explain: 'Custom epoch (jaise 2020) isliye ki 41 bits mein 69 saal aa jaayein. Unix epoch se ginte toh bits jaldi khatam ho jaate.' },
        { text: 'Check karo ki clock peechhe toh nahi chali gayi', explain: 'Sabse zaroori kadam, aur sabse zyada bhoola jaane wala. NTP clock peeche kar sakta hai — aur tab wahi ids dobara ban jaayengi. Yahan ruk jao ya logical counter aage badhao.' },
        { text: 'Agar wahi millisecond hai toh sequence ++ karo', explain: '12 bits = 4096 ids per ms per machine. Yeh ek machine ke liye 40 lakh ids/second hai — lagbhag hamesha kaafi.' },
        { text: 'Agar sequence bhar gaya toh agle millisecond ka intezaar karo', explain: 'Ek millisecond mein 4096 se zyada chahiye? Ruko. Yeh takraane se behtar hai — aur practically kabhi nahi hota.' },
        { text: 'Teenon hisson ko shift karke jodo', explain: '<code>(ts &lt;&lt; 22) | (machine &lt;&lt; 12) | sequence</code>. Timestamp sabse upar ke bits mein — isiliye sorting waqt ke hisaab se hoti hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — IDs',
    instructions: 'Chhota sawaal, gehra jawab. 🎤',
    questions: [
      {
        q: '"Ek distributed system mein unique IDs kaise banaoge?"',
        choices: [
          'Snowflake-style: timestamp + machine id + sequence. Coordination-free, sortable (isliye index-friendly), aur 64 bits mein aa jaata hai. Clock skew ka handling batana zaroori hai',
          'UUIDv4 — simple aur unique',
          'Ek central ID service banaunga',
          'Database ka auto-increment',
        ],
        answer: 0,
        explain: 'UUIDv4 galat nahi hai — par woh index par kya karta hai, yeh <b>bolna</b> chahiye. Central ID service ek single point of failure aur ek network hop hai har insert par. Autoinc distributed writes mein chalta hi nahi. Aur woh aakhri line — clock skew — hi yeh dikhati hai ki tumne ise sach mein socha hai.',
      },
      {
        q: '"URL shortener ke liye kaunsi id?"',
        choices: [
          'Ek counter (ya Snowflake) ko base62 mein encode karo — chhota code, koi collision check nahi. Agar sequential codes se dusron ke links guess honay ka darr ho, toh counter ko encode karne se pehle scramble kar do',
          'Random 7-character string, aur collision par retry',
          'URL ka hash',
          'UUID',
        ],
        answer: 0,
        explain: 'Random string ke saath har insert par ek <b>"yeh code pehle se hai kya?"</b> lookup karna padta hai — aur jaise-jaise space bharta hai, collisions badhte jaate hain. Counter + base62 mein woh lookup <b>hai hi nahi</b>, aur code chhote se chhota rehta hai. Hash ka problem yeh hai ki ek hi URL do baar shorten karne par wahi code milega — jo kabhi feature hai, kabhi bug.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki random primary key B-tree ka kya bigaadta hai',
    'Snowflake ka bit layout aur clock-skew ka khatra jaante ho',
    'Sortable id aur cursor pagination ka rishta samajhte ho',
    'Internal id vs public id alag kar sakte ho',
  ],
  homework: `Apni sabse badi table ka primary key dekho. Agar woh UUID hai —
    uske index ka size aur fragmentation nikaalo, aur insert rate dekho.
    Phir poochho: kya us UUID ko <code>public_id</code> banake primary key
    bigint kiya ja sakta hai?`,
  cards: [
    { front: 'Random UUID primary key ka bill?', back: 'Har insert B-tree mein <b>random jagah</b> → page disk se laana + splits + fragmentation. Sortable id hamesha aakhri (garam) page par jaata hai. Aur UUIDv4 sort ka <b>koi matlab nahi</b> — cursor tie-breaker nahi ban sakta.' },
    { front: 'Snowflake ka layout?', back: '<code>1 bit | 41 bit timestamp | 10 bit machine | 12 bit sequence</code> = 64 bit. Timestamp <b>sabse aage</b>, isliye sorting = time ordering. 1024 machines × 4096 ids/ms.' },
    { front: 'Snowflake ka asli khatra?', back: '<b>Clock peeche jaana</b> (NTP). Tab wahi ids dobara ban sakti hain. Implementation ko ruk jaana chahiye ya logical counter badhana chahiye — chupchaap dohraana nahi.' },
    { front: 'API mein UUID + index sequential?', back: '<b>Do ids:</b> internal BIGINT primary key + public UUID column (unique index). Index sequential rehta hai, aur bahar koi count ya doosre records guess nahi kar sakta.' },
    { front: 'URL shortener ki id?', back: 'Counter/Snowflake ko <b>base62</b> mein encode karo — chhota code, aur koi "yeh code pehle se hai kya" lookup nahi. Random string har insert par collision check maangti hai.' },
  ],
},
]);

/* =====================================================================
   L11.5 — Bloom filters & probabilistic structures
   ===================================================================== */
const T_PROB = [
  { text: '10 lakh items ke liye 1% false-positive wala bloom filter banao',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.fpRate < 2) },
  { text: 'Dekho ki exact set se woh kitna sasta hai',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.exactBytes > r.bytes * 5) },
  { text: 'Ab use aadhi memory do — false positive kitna badhta hai?',
    check: s => {
      const all = s.records.filter(r => r.kind === 'probabilistic' && r.op === 'bloom');
      return all.length >= 2 && all.some(a => all.some(b => b.bits < a.bits && b.fpRate > a.fpRate * 3));
    } },
  { text: '10 crore unique items ka HyperLogLog',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'hll' && r.items >= 100000000) },
  { text: 'Aur dekho ki uski memory items ki sankhya se nahi badhti',
    check: s => {
      const all = s.records.filter(r => r.kind === 'probabilistic' && r.op === 'hll');
      return all.length >= 2 && all.some(a => all.some(b => b.items !== a.items && b.bytes === a.bytes));
    } },
];

SD.registerLevelsAfter('data', 'engines', [
{
  id: 'probabilistic',
  icon: '🌸',
  title: 'Bloom Filter — Thoda Galat, Par 1000x Sasta',
  badge: 'Approximation Acharya',
  objectives: [
    'Bloom filter: "pakka nahi hai" vs "shayad hai"',
    'False positive ka <b>daam</b> — memory ke badle',
    'HyperLogLog: 12 KB mein 10 crore unique',
    'Kab approximate jawab sahi jawab hota hai',
  ],
  lesson: [
    `<h3>📖 Ek sawaal jiska jawab "shayad" bhi kaafi hai</h3>
     <p>Socho ki tumhare paas 5 crore usernames hain aur poochha jaata hai:
     "kya yeh username liya hua hai?" Exact jawab ke liye tumhe saare usernames
     memory mein rakhne padenge — <b>gigabytes</b>. Par agar jawab thoda
     galat ho toh?</p>
     <pre>Bloom filter kehta hai sirf do cheezein:
   "PAKKA nahi hai"  ← yeh hamesha SACH hai
   "SHAYAD hai"      ← yeh 1% baar jhooth ho sakta hai</pre>
     <p>Yaani <b>false negative kabhi nahi</b>, false positive kabhi-kabhi.
     Aur yeh asymmetry hi use kaam ka banati hai:
     agar woh kahe "nahi hai", toh tum bina DB gaye seedha jawab de sakte ho.
     Agar kahe "shayad hai", toh tum DB dekh lo — par tab tak
     <b>99% bekaar lookups kat chuke honge</b>.</p>
     <h3>🔬 Andar kya hai</h3>
     <pre>ek bit array (sab 0)  +  k alag hash functions

ADD "priya":     h1→bit 17, h2→bit 402, h3→bit 9981   → teenon 1 kar do
CHECK "priya":   teenon bits 1 hain?  → "shayad hai"
CHECK "rahul":   h1→bit 55 = 0        → "PAKKA nahi hai" ✅ (ek 0 kaafi hai)</pre>
     <p>False positive isliye hota hai ki kisi <b>doosre</b> item ne woh saare bits
     pehle se 1 kar diye hon. Aur isiliye <b>delete nahi ho sakta</b> — bit 0
     karoge toh kisi aur item ka jawab bhi tod doge. (Uske liye counting bloom
     filter chahiye, jisme bits ki jagah chhote counters hote hain.)</p>
     <p class="tip">🎯 Do knobs hain: <b>bits (m)</b> aur <b>hash functions (k)</b>.
     Zyada bits = kam false positive, zyada memory. Optimal k ≈ (m/n) × ln2.
     Aur poora tradeoff ek line mein: <b>memory kam karo, jhooth badh jaata hai</b>.</p>`,
    `<h3>📊 HyperLogLog — "kitne unique?" ka jawab 12 KB mein</h3>
     <p>Ab doosra sawaal: "aaj kitne <b>unique</b> visitors aaye?"
     Exact ginne ke liye har visitor id yaad rakhni padegi — 10 crore ids = ~1.5 GB.</p>
     <p>HLL woh ids <b>store hi nahi karta</b>. Woh sirf itna dekhta hai:
     har id ka hash lo, aur dekho ki uske shuru mein kitne zero hain.
     Agar kisi hash ke shuru mein 20 zero mile, toh shayad tumne ~2²⁰ items dekhe hain
     (kyunki 20 zero milne ki sambhavna 1/2²⁰ hai). Bahut saare registers rakh ke
     is anumaan ka average nikaalo — bas.</p>
     <pre>16,384 registers  →  12 KB memory  →  ±0.81% galti
   10 lakh unique?  12 KB
   10 crore unique? 12 KB      ← memory BADALTI HI NAHI</pre>
     <p class="tip">🎯 Aur ek bahut kaam ka gun: <b>HLLs merge ho sakte hain.</b>
     Har server apna HLL rakhe, din ke ant mein sab jod do — aur tumhe poore
     system ka unique count mil jaata hai, bina kisi central counter ke.
     Isiliye Redis ka <code>PFADD</code>/<code>PFCOUNT</code>/<code>PFMERGE</code>
     analytics mein itna use hota hai.</p>
     <h3>🎯 Asli sawaal: kab approximate chalega?</h3>
     <table>
       <tr><th>Kaam</th><th>Approximate?</th></tr>
       <tr><td>"Aaj kitne unique visitors" (dashboard)</td><td>✅ 4,82,391 vs 4,84,100 — kisko farak padta hai</td></tr>
       <tr><td>"Yeh username liya hua hai?" (pehla check)</td><td>✅ "shayad hai" par exact check kar lo</td></tr>
       <tr><td>"Yeh URL malicious hai?" (browser)</td><td>✅ "shayad" par server se poochho — Chrome yahi karta hai</td></tr>
       <tr><td><b>"Is user ka balance kitna hai"</b></td><td>❌ kabhi nahi</td></tr>
       <tr><td><b>"Yeh payment already ho chuka hai?"</b></td><td>❌ false positive matlab payment skip — kabhi nahi</td></tr>
     </table>
     <p>Yeh wahi purana sawaal hai: <b>galat jawab kitna mehenga hai?</b>
     Jab uska daam chhota ho, approximation 1000x memory bacha deti hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Approximation ka daam',
      goal: `Bloom filter ka memory-vs-jhooth tradeoff khud naapo,
             aur HLL ki fixed memory dekh ke maano.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_PROB,
      success: allOf(T_PROB),
      successText: `Ab tum ek naya sawaal poochhna jaante ho:
        <b>"kya yahan exact jawab ki zaroorat hai?"</b>
        Jab jawab "nahi" ho, to approximation 20x–1,00,000x memory bacha deti hai —
        aur yeh sirf ek optimization nahi, aksar woh cheez hai jo kaam ko
        <b>mumkin</b> banati hai.`,
      hints: [
        '10 lakh items, 1% false positive: bloom --items 1000000 --fp 0.01',
        'Ab aadhi memory do aur jhooth dekho: bloom --items 1000000 --bits 4000000 --hashes 3',
        'Aur bahut kam memory: bloom --items 1000000 --bits 2000000 --hashes 2',
        '10 crore unique ka HLL: hll --items 100000000',
        'Ab 10 lakh ka HLL — memory dekho: hll --items 1000000',
      ],
    },
    {
      type: 'bins',
      title: 'Approximate chalega ya nahi?',
      instructions: 'Har sthiti ke liye faisla karo.',
      bins: [
        { id: 'ok', label: '✅ Approximate chalega' },
        { id: 'no', label: '❌ Exact chahiye' },
      ],
      items: [
        { text: 'Dashboard par "aaj ke unique visitors"', bin: 'ok', explain: 'HLL ka classic case. ±0.8% galti kisi business decision ko nahi badalti, aur memory 1.5 GB se 12 KB ho jaati hai.' },
        { text: 'LSM ki SSTable mein "yeh key hai kya?"', bin: 'ok', explain: 'Yahi bloom filter ka sabse aam production use hai. "Nahi hai" par disk chhua hi nahi jaata; "shayad hai" par asli lookup hoti hai. Isse LSM ka read amplification bahut gir jaata hai.' },
        { text: '"Is user ka wallet balance kitna hai"', bin: 'no', explain: 'Paisa. Yahan ±0.8% ka matlab hai kisi ka balance galat dikhana. Approximation ka faayda memory hai; yahan galti ka daam <b>bharosa aur paisa</b> hai.' },
        { text: 'Cache ke aage "yeh key exist karti bhi hai?"', bin: 'ok', explain: 'Bloom filter cache-penetration rokta hai: jo keys hain hi nahi (aksar attack ya bug), unki requests DB tak jaati hi nahi. "Shayad hai" par normal raasta chalta hai.' },
        { text: '"Yeh payment id pehle process ho chuka hai?"', bin: 'no', explain: 'False positive ka matlab hai ek asli payment ko duplicate samajh ke <b>skip</b> kar dena. (Bloom ko ek pehle-chhanne wale filter ki tarah use kar sakte ho — par "haan" par DB check laazmi hai.)' },
        { text: 'Browser mein "yeh URL malicious list mein hai?"', bin: 'ok', explain: 'Chrome Safe Browsing bilkul yahi karta hai — crore URLs ki list phone par nahi aa sakti. Bloom local mein chalta hai; "shayad" par hi server se poochha jaata hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Probabilistic ki samajh',
      questions: [
        {
          q: 'Bloom filter false NEGATIVE kabhi kyun nahi deta?',
          choices: [
            'Add karte waqt uske saare bits 1 kar diye gaye the, aur bits kabhi 0 nahi hote — isliye maujood item ke saare bits hamesha 1 milenge',
            'Kyunki hash functions perfect hain',
            'Kyunki woh sab kuch store karta hai',
            'Deta hai, kabhi-kabhi',
          ],
          answer: 0,
          explain: 'Yahi asymmetry poore structure ko kaam ka banati hai. "Nahi hai" par tum <b>pakka</b> bharosa kar sakte ho — aur wahi case fast path hai. Isi wajah se bloom ko <b>filter</b> kehte hain: woh "pakka nahi" wale ko turant kaat deta hai.',
        },
        {
          q: 'Bloom filter se item delete kyun nahi kar sakte?',
          choices: [
            'Uske bits kisi DOOSRE item ne bhi set kiye ho sakte hain — 0 karne se us item ka jawab galat (false negative) ho jaayega',
            'Woh immutable hota hai',
            'Delete slow hai',
            'Delete kar sakte hain',
          ],
          answer: 0,
          explain: 'Bits <b>share</b> hote hain — yahi to memory bachaane ka poora tareeka hai. Isliye ek bit 0 karne se doosre items toot sakte hain, aur false negative aa jaayega — jo bloom ki ek guarantee hai. Uske liye <b>counting bloom filter</b> chahiye (bits ki jagah 4-bit counters), jo ~4x memory leta hai.',
        },
        {
          q: 'HLL ki memory 10 lakh aur 10 crore items ke liye ek jaisi kyun hai?',
          choices: [
            'Woh items store hi nahi karta — sirf fix registers rakhta hai jinme "sabse zyada kitne leading zeros dekhe" ka nishaan hota hai',
            'Woh compression karta hai',
            'Woh sample leta hai',
            'Woh disk par overflow karta hai',
          ],
          answer: 0,
          explain: 'Yeh cheez pehli baar sunne mein namumkin lagti hai, aur asli idea bahut khoobsurat hai: agar tumne kisi hash mein shuru mein 20 zero dekhe, toh shayad tumne ~2²⁰ cheezein dekhi hain — kyunki utne zero itni hi kam baar aate hain. Bahut saare registers ka average is anumaan ko ±0.81% tak le aata hai. Data kahin store nahi hota.',
        },
      ],
    },
    {
      type: 'match',
      title: 'Structure → uska kaam',
      pairs: [
        { left: 'Bloom filter', right: '"Yeh cheez set mein hai?" — memory ke badle thoda jhooth', explain: 'Membership test. "Nahi" pakka, "haan" shayad. LSM SSTables, cache penetration, Safe Browsing.' },
        { left: 'HyperLogLog', right: '"Kitne UNIQUE hain?" — fixed memory mein', explain: '12 KB mein ±0.81%, chahe 10 crore ho. Aur merge ho sakta hai, isliye distributed counting muft mein.' },
        { left: 'Count-Min Sketch', right: '"Yeh item kitni baar aaya?" — frequency ka anumaan', explain: 'Heavy hitters dhoondhne ke liye — top-k, rate limiting, hot key detection. Ginti hamesha asli se zyada ya barabar hoti hai, kabhi kam nahi.' },
        { left: 'Counting bloom filter', right: 'Bloom, par DELETE ke saath', explain: 'Bits ki jagah chhote counters. ~4x memory, par ab item hataya ja sakta hai.' },
        { left: 'Exact hash set', right: 'Jab galat jawab ka daam bada ho', explain: 'Payments, balances, permissions. Approximation ka faayda memory hai — aur wahan memory sabse sasti cheez hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Approximation',
    instructions: 'Yeh jawab dikhata hai ki tum tradeoffs sochte ho. 🎤',
    questions: [
      {
        q: '"Ek URL shortener mein check karna hai ki short code pehle se use hua hai. 100 crore codes hain."',
        choices: [
          'Memory mein bloom filter — "nahi hai" par turant aage badho (99% cases), "shayad hai" par hi DB check karo. Ya isse behtar: counter+base62 use karo taaki yeh check chahiye hi na',
          'Har baar DB mein check karo',
          'Saare codes memory mein rakho',
          'Redis SET use karo',
        ],
        answer: 0,
        explain: 'Achha jawab dono deta hai: <b>bloom</b> (agar random codes hi chahiye) <b>aur</b> yeh soch ki asli hal is check ko <b>khatam</b> kar dena hai. Sequential counter ko base62 mein encode karne se collision mumkin hi nahi — aur tab yeh poora problem gayab ho jaata hai. Sabse achha optimization woh hai jo kaam hi hata de.',
      },
      {
        q: '"Bloom filter ka size kaise chunoge?"',
        choices: [
          'Ulta chalunga: pehle poochhunga ki false positive ka DAAM kya hai. Agar ek extra DB lookup hai toh 1-5% theek hai; agar user ko dikhne wali galti hai toh 0.01% chahiye. Phir m = -n·ln(p)/(ln2)² se bits nikaal lunga',
          'Jitni memory available hai',
          '10 bits per item',
          'Trial and error se',
        ],
        answer: 0,
        explain: 'Formula yaad hona achha hai, par asli jawab pehle vaakya mein hai: <b>false positive ka daam kya hai?</b> LSM ke liye ek extra disk read hai (1% bilkul theek). Safe Browsing ke liye ek extra server call hai (theek). Agar false positive ka matlab user ko galat cheez dikhana hai, toh bloom yahan galat aujaar hi hai.',
      },
    ],
  },
  success: [
    'Bloom filter ka asymmetric jawab samjha sakte ho',
    'Memory vs false-positive ka tradeoff naap sakte ho',
    'HLL ki fixed memory aur merge-ability jaante ho',
    '"Kya yahan exact jawab chahiye?" poochhne lage ho',
  ],
  homework: `Apne system mein ek aisi jagah dhoondo jahan tum "yeh cheez hai kya?" poochh ke
    aksar "nahi" paate ho — cache miss, duplicate check, ya ek existence lookup.
    Ginti karo ki kitne percent jawab "nahi" hote hain. Agar 90%+ hain,
    wahan ek bloom filter poore load ka 90% kaat sakta hai.`,
  cards: [
    { front: 'Bloom filter kya bolta hai?', back: '<b>"Pakka nahi hai"</b> (hamesha sach) ya <b>"shayad hai"</b> (kabhi-kabhi jhooth). False negative <b>kabhi nahi</b>. Isi asymmetry se woh kaam ka hai.' },
    { front: 'Bloom se delete kyun nahi?', back: 'Bits doosre items ke saath <b>share</b> hote hain — 0 karne se unka jawab toot jaayega (false negative). Uske liye <b>counting bloom</b> (~4x memory).' },
    { front: 'Bloom ka size kaise chunein?', back: 'Pehle poochho: <b>false positive ka daam kya hai?</b> Ek extra DB lookup → 1-5% theek. User ko dikhne wali galti → bloom galat aujaar hai. Formula: <code>m = -n·ln(p)/(ln2)²</code>.' },
    { front: 'HyperLogLog?', back: '"Kitne <b>unique</b>?" — 16,384 registers = <b>12 KB</b>, ±0.81%, chahe 10 crore ho. Items store hi nahi hote — sirf "sabse zyada kitne leading zeros dekhe".' },
    { front: 'HLL ka best gun?', back: 'Woh <b>merge</b> ho sakta hai. Har server apna rakhe, baad mein sab jod do — distributed unique count bina kisi central counter ke. (Redis: PFADD/PFCOUNT/PFMERGE.)' },
    { front: 'Bloom production mein kahan?', back: '<b>LSM ki har SSTable</b> par (read amplification ghatata hai) · <b>cache ke aage</b> (jo keys hain hi nahi, unhe DB tak jaane se rokta hai) · Chrome Safe Browsing.' },
  ],
},
]);

/* =====================================================================
   L13.5 — Consistent hashing   (Arpit Bhayani / Hello Interview ka staple)
   ===================================================================== */
const T_RING = [
  { text: 'Ring ki haalat dekho — 4 nodes, 1 vnode each',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'show') },
  { text: 'Dekho ki bina vnodes ke distribution kitna bekaar hai (skew > 1.4x)',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'show' && r.vnodes === 1 && r.skew > 1.4) },
  { text: 'Virtual nodes chalu karo — 150 per node',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'vnodes' && r.vnodes >= 100 && r.skew < 1.1) },
  { text: 'Ek naya node jodo — aur dekho kitni keys move hui',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'add') },
  { text: 'Aur dekho ki hash % N mein kitni move hoti (bahut zyada)',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'add' && r.modPct > r.movedPct * 2) },
  { text: 'Ab ek node hatao — sirf uski keys bantni chahiye',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'remove' && r.movedPct < 40) },
];

SD.registerLevelsAfter('data', 'sharding', [
{
  id: 'conshash',
  icon: '⭕',
  title: 'Consistent Hashing — Node Jodne Par Sab Kuch Na Hile',
  badge: 'Ring Rakshak',
  objectives: [
    '<code>hash % N</code> node add karne par 80% keys kyun hila deta hai',
    'Hash ring: keys ko nahi, <b>nodes</b> ko hash karo',
    'Virtual nodes — bina unke ring bhi bekaar hai',
    'Rebalancing ki asli keemat: har move ek data transfer hai',
  ],
  lesson: [
    `<h3>📖 Sabse seedha tareeka, aur woh kyun tootta hai</h3>
     <pre>node = hash(key) % N</pre>
     <p>4 nodes hain, sab theek chal raha hai. Ab traffic badha aur tumne
     paanchva node joda. <code>% 4</code> ab <code>% 5</code> ho gaya —
     aur lagbhag <b>har key ka jawab badal gaya</b>:</p>
     <pre>key "user:42"    hash = 91827

   % 4  →  node 3
   % 5  →  node 2      ← alag node!

Practically: 4 → 5 nodes par ~80% keys move hoti hain.</pre>
     <p>Cache mein iska matlab hai <b>80% cache turant thanda</b> — aur woh saara
     load ek saath DB par. Database sharding mein iska matlab hai 80% data ko
     ek machine se doosri par <b>copy</b> karna. Yeh sirf dheema nahi hai —
     yeh aksar ek outage hai.</p>
     <p class="tip">🎯 Aur yahi wajah hai ki <code>% N</code> wali sharding chhote
     system mein bilkul theek chalti hai aur badhne ke waqt <b>exactly</b> tab kaatti
     hai jab tumhe scale karna hai. Woh ek aisa faisla hai jiski keemat baad mein
     chukti hai — sabse buri tarah ki technical debt.</p>`,
    `<h3>⭕ Hash ring — ulta soch ke dekho</h3>
     <p>Trick yeh hai: sirf keys ko hash mat karo — <b>nodes ko bhi hash karo</b>,
     aur dono ko ek hi 0 se 2³²-1 wale gol daayre par rakho.</p>
     <pre>          0 / 2³²
             ·
    node-C ·   · node-A
         ·       ·
         ·   ⭕  ·
         ·       ·
    key ·         · node-B
         ·  ·  ·

Niyam: har key GHADI KI DISHA mein pehle milne wale node ki hai.</pre>
     <p>Ab node add karo. Woh ring par ek jagah baithta hai aur sirf <b>apne se pehle
     wale hisse</b> ki keys leta hai. Baaki ring bilkul waise ka waisa —
     unki keys hili hi nahi.</p>
     <pre>4 → 5 nodes:   hash % N  →  ~80% keys move
               hash ring →  ~20% keys move   (= 1/N, jitni honi hi thi)</pre>
     <h3>🌀 Virtual nodes — bina inke ring bhi bekaar hai</h3>
     <p>Ek problem baaki hai: agar har node ring par <b>ek hi</b> jagah baithe,
     toh unke beech ki doori random hogi. Koi node poore ring ka 45% le lega
     aur koi 5%. Yeh <b>skew</b> hai.</p>
     <p>Ilaaj: har node ko ring par <b>kai baar</b> rakho —
     <code>node-A#0</code>, <code>node-A#1</code>, ... <code>node-A#149</code>.
     Ab har node bahut saare chhote tukdon ka maalik hai, aur unka jod
     lagbhag barabar ho jaata hai (150 vnodes par skew ~1.05x).</p>
     <p class="tip">🎯 Virtual nodes ka doosra, aur shayad bada faayda:
     jab ek node <b>girta</b> hai, uska load <b>saare</b> nodes mein bant jaata hai —
     sirf uske ek padosi par nahi. Bina vnodes ke ek node ka girna uske padosi ko
     dugna load de deta hai, aur woh bhi gir sakta hai. Yeh cascade
     <b>vnodes ke bina</b> asli khatra hai.</p>
     <h3>🧭 Kahan-kahan yeh chalta hai</h3>
     <pre>Cassandra / DynamoDB    partition assignment
Redis Cluster           16,384 hash slots (thoda alag, wahi soch)
Memcached clients       node list par consistent hashing
CDN / load balancers    request → wahi origin (cache locality ke liye)
Envoy / gRPC            "ring hash" load balancing policy</pre>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Ring khud chalao',
      goal: `Skew dekho, virtual nodes se theek karo, phir node add/remove karke
             ring aur <code>% N</code> ka farak <b>naapo</b>.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_RING,
      success: allOf(T_RING),
      successText: `Do numbers yaad rakhne laayak hain: <b>~80% vs ~20%</b> keys move,
        aur <b>skew 1.9x se 1.01x</b> virtual nodes ke saath.
        Aur ek baat jo log bhool jaate hain — <b>ring bina vnodes ke aadha hi kaam
        karta hai</b>: distribution bekaar rehti hai aur node girne par uska poora
        load ek padosi par pad jaata hai.`,
      hints: [
        'Pehle haalat dekho: ring show',
        'Skew dikha? Ab virtual nodes: ring set vnodes 150',
        'Ek naya node jodo: ring add node-5',
        'Ab ek hatao: ring remove node-2',
        'Aur ek aur jodo, farak pakka karne ke liye: ring add node-6',
      ],
    },
    {
      type: 'quiz',
      title: 'Ring ki samajh',
      questions: [
        {
          q: '4 se 5 nodes karne par <code>hash % N</code> kitni keys hila deta hai?',
          choices: [
            '~80% — kyunki har key ka modulo badal jaata hai. Cache mein iska matlab 80% turant thanda',
            '~20%, sirf naye node ki',
            '~25%',
            'Koi nahi, hash wahi rehta hai',
          ],
          answer: 0,
          explain: 'Hash toh wahi rehta hai — par <b>modulo</b> badal gaya, aur wahi node decide karta hai. Sirf woh keys apni jagah rehti hain jinka <code>hash % 4 === hash % 5</code> ho, jo lagbhag 1/5 hain. Baaki sab hil jaati hain.',
        },
        {
          q: 'Consistent hashing mein node add karne par kitni keys move honi chahiye?',
          choices: [
            '~1/N — sirf utni jitni naye node ko milni hi thi. Baaki ring ko pata bhi nahi chalta',
            'Aadhi',
            'Koi nahi',
            'Sab',
          ],
          answer: 0,
          explain: 'Yahi poori technique ka maksad hai: rebalancing ko <b>kam se kam</b> rakhna. Naya node ring par ek jagah baithta hai aur sirf apne se pehle wale arc ki keys leta hai. Baaki nodes bilkul nahi chhue jaate — aur "chhue jaana" ka matlab hai cache miss ya data transfer.',
        },
        {
          q: 'Virtual nodes ke bina consistent hashing mein kya galat hai?',
          choices: [
            'Distribution skew ho jaati hai (koi node 45%, koi 5%) — aur node girne par uska POORA load uske ek padosi par pad jaata hai, jisse cascade ho sakta hai',
            'Kuch galat nahi',
            'Woh slow ho jaati hai',
            'Keys kho jaati hain',
          ],
          answer: 0,
          explain: 'Do alag problems ek hi ilaaj se hal hote hain. <b>Skew</b> dikh jaata hai (koi node garam rehta hai). <b>Cascade</b> nahi dikhta jab tak hota nahi: ek node gira, uski saari keys ek padosi ko mili, woh dab ke gira, aur uska load agle ko... 150 vnodes ke saath gire hue node ka load <b>sabme</b> bant jaata hai.',
        },
        {
          q: 'Consistent hashing hot key ka problem hal karti hai?',
          choices: [
            'Nahi — woh KEYS ko baantti hai, ek key ko nahi. Ek popular key phir bhi ek hi node par jaati hai',
            'Haan, poori tarah',
            'Haan, vnodes ke saath',
            'Haan agar nodes zyada hon',
          ],
          answer: 0,
          explain: 'Yeh bilkul wahi baat hai jo tumne <b>eviction</b> level mein dekhi thi, ab doosri taraf se. Consistent hashing <b>rebalancing</b> ka problem hal karti hai, <b>skew</b> ka nahi jo ek hi key se aata ho. Hot key ke liye ilaaj alag hai: key ki N copies, ya local cache.',
        },
      ],
    },
    {
      type: 'order',
      title: 'Ring par ek key ka safar',
      instructions: 'Kaise pata chalta hai ki key kis node ki hai?',
      steps: [
        { text: 'Har node ke liye uske vnodes ke hash nikaalo (node-A#0 … node-A#149)', explain: 'Yeh ek baar hota hai, jab cluster ka shape badalta hai. Yeh ring ka "naksha" hai.' },
        { text: 'Un saare points ko ek sorted list mein rakho', explain: 'Sorted isliye ki agla kadam ek binary search ho jaaye — O(log n), har lookup par.' },
        { text: 'Key ka hash nikaalo', explain: 'Wahi hash function jo nodes ke liye use kiya tha — dono ek hi daayre par hone chahiye.' },
        { text: 'Sorted list mein pehla point dhoondo jiska hash key se BADA ho', explain: 'Yeh "ghadi ki disha mein agla node" hai. Binary search se turant mil jaata hai.' },
        { text: 'Agar koi bada nahi mila toh list ke pehle point par wapas aa jao', explain: 'Ring <b>gol</b> hai — 2³² ke baad wapas 0. Yeh wrap-around bhoolna sabse aam bug hai (aakhri arc ki keys kahin nahi jaati).' },
        { text: 'Us point ka asli node hi key ka maalik hai', explain: 'vnode → node ka mapping. Replication chahiye toh ring par <b>agle N alag nodes</b> le lo — Cassandra yahi karta hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Hash ring',
      visual: 'conshash',
      questions: [
        { q: '<code>% N</code> node add karne par kya karta hai?', target: 'modn', explain: 'Lagbhag har key ka modulo badal jaata hai — ~80% keys move. Cache thanda, ya bhaari data transfer.' },
        { q: 'Ring par key kis node ki hoti hai?', target: 'clockwise', explain: 'Ghadi ki disha mein pehla milne wala node. Isliye naya node sirf apne se pehle wale arc ki keys leta hai.' },
        { q: 'Virtual nodes kya theek karte hain?', target: 'vnodes', explain: 'Do cheezein: distribution ka skew, aur node girne par load ka ek hi padosi par padna (cascade).' },
        { q: 'Yeh kaunsa problem hal NAHI karti?', target: 'hotkey', explain: 'Hot key. Ring keys ko baantti hai, <b>ek key ko nahi</b>. Uske liye key replication ya local cache chahiye.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Consistent hashing',
    instructions: 'Yeh lagbhag har sharding sawaal mein aata hai. 🎤',
    questions: [
      {
        q: '"Tumhara Redis cluster 4 se 8 nodes karna hai. Kya hoga?"',
        choices: [
          'Consistent hashing ke saath ~50% keys move hongi (naye nodes ka hissa) — par woh cache miss hain, data loss nahi. Isliye rebalancing dheere karo aur DB par concurrency cap rakho, warna miss ka spike DB gira dega',
          '~50% keys move hongi, koi problem nahi',
          'Sab keys move hongi',
          'Kuch nahi hoga',
        ],
        answer: 0,
        explain: 'Pehla hissa hisaab hai, doosra hissa <b>anubhav</b> hai. Cache mein "key move ho gayi" ka matlab hai "miss" — aur agar 50% keys ek saath miss karein toh DB par load achanak dugna ho jaata hai. Isiliye asli teams rebalancing ko dheere karti hain aur us doraan DB par ek concurrency cap rakhti hain.',
      },
      {
        q: '"Consistent hashing kab NAHI chahiye?"',
        choices: [
          'Jab shards ka set stable ho aur tum explicit mapping rakh sakte ho (jaise tenant → shard ek table mein) — woh zyada flexible hai: hot tenants ko haath se move kar sakte ho, aur "yeh data kahan hai" ka jawab pakka hota hai',
          'Kabhi nahi, woh hamesha behtar hai',
          'Chhote systems mein',
          'Jab keys kam hon',
        ],
        answer: 0,
        explain: 'Yeh jawab isliye achha hai ki yeh technique ko uski <b>jagah</b> par rakhta hai. Consistent hashing tab chamakti hai jab nodes <b>apne aap</b> aate-jaate hain (cache clusters, Cassandra). Par ek explicit lookup table (tenant → shard) tumhe woh cheez deti hai jo ring nahi de sakti: <b>control</b> — hot tenant ko uthake alag shard par rakh dena.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki <code>% N</code> resize par kyun tootta hai',
    'Hash ring ka lookup algorithm samjha sakte ho',
    'Virtual nodes ke DONO faayde jaante ho (skew + cascade)',
    'Jaante ho ki yeh hot key ka ilaaj nahi hai',
  ],
  homework: `Apne cache ya shard layer ka pata karo: keys nodes par kaise map hoti hain?
    Agar <code>% N</code> hai, toh yeh hisaab lagao — "ek node add karne par kitna
    percent cache thanda hoga, aur us pal DB par kitna load aayega?"
    Woh number likh ke rakho; woh tumhare agle scaling event ka plan hai.`,
  cards: [
    { front: '<code>hash % N</code> par node add karne se?', back: '~<b>80%</b> keys move (4→5 nodes). Cache mein = 80% turant thanda; sharding mein = 80% data transfer. Isliye woh scale karte waqt hi kaatta hai.' },
    { front: 'Hash ring ka niyam?', back: 'Keys <b>aur nodes dono</b> ko ek gol daayre par hash karo. Har key <b>ghadi ki disha</b> mein pehle milne wale node ki. Node add par sirf ~1/N keys move.' },
    { front: 'Virtual nodes kyun?', back: 'Do wajah: (1) <b>skew</b> — ek jagah baithne se koi node 45% le leta hai; (2) <b>cascade</b> — node girne par uska poora load ek padosi par. 150 vnodes se skew ~1.01x aur load sabme bant jaata hai.' },
    { front: 'Ring lookup?', back: 'vnode hashes ki <b>sorted list</b> + binary search (pehla point jo key se bada ho) + <b>wrap-around</b> (koi bada na mile toh pehla point). Wrap bhoolna sabse aam bug hai.' },
    { front: 'Consistent hashing hot key theek karti hai?', back: '<b>Nahi.</b> Woh keys ko baantti hai, <b>ek key ko nahi</b>. Hot key ke liye: key ki N copies ya local cache.' },
    { front: 'Kab ring NAHI chahiye?', back: 'Jab shard set stable ho — tab <b>explicit mapping</b> (tenant → shard table) behtar hai: hot tenant ko haath se move kar sakte ho, aur "data kahan hai" pakka pata hota hai.' },
  ],
},
]);
