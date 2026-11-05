(() => {
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
  { text: 'user_id index ke saath transactions dobara maango — 1,00,000 se kam rows padhi jaayein',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.resource === 'transactions' && r.rowsExamined < 100000 && r.revision === s.revision && SD.mission.index(s, 'transactions', ['user_id'])) },
];

const T_COMPOSITE = [
  { text: 'Composite index banao — (user_id, created_at)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' &&
      r.cols.length >= 2 && r.cols[0] === 'user_id' && r.cols[1] === 'created_at') },
  { text: 'Leading column par filter karo — index lagega',
    check: s => s.records.some(r => r.kind === 'explain' && r.indexUsed && /user_id/.test(r.sql)) },
  { text: 'Ab SIRF created_at par filter karo — left-most prefix toota',
    check: s => s.records.some(r => r.kind === 'explain' && !r.indexUsed && !/user_id/.test(r.sql) && /created_at/.test(r.sql)) },
  { text: "(user_id, created_at) index ki list dobara dekho — Seq_in_index column ka kram batata hai",
    check: s => s.records.some(r => r.kind === 'showIndexes' && r.rows > 0 && r.revision === s.revision && SD.mission.index(s, 'transactions', ['user_id','created_at'])) },
];

const T_POOL = [
  { text: '400 rps ka normal load chalao — sab theek dikhna chahiye',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 400 && !r.poolStarved) },
  { text: 'Ek lambi transaction 45 connections pakad leti hai',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'long-tx' && r.holds === 45) },
  { text: '400 rps ka load dobara — ab pool bhar jaayega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 400 && r.poolStarved) },
  { text: 'Trace se prove karo ki waqt pool.acquire() mein gaya',
    check: s => s.records.some(r => r.kind === 'trace' && /pool/.test(r.worst)) },
  { text: 'Metrics dekho — CPU 10% par pool wait aasman par',
    check: s => s.records.some(r => r.kind === 'metrics' && r.poolWaitHigh && r.revision === s.revision && s.sys.db.longTxHolding === 45) },
];

const T_CACHE = [
  { text: 'Bina cache ke request ka cost dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.cache === 'MISS' && !r.cacheEnabled) },
  { text: 'Pehle bina cache 500 rps ka load chalao — system bhar jaata hai',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && r.saturated && !r.cacheSteps) },
  { text: 'Cache lagao — TTL 60s, jitter 15%, hit-rate 1 (maan lo cache poora garam hai)',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache' && r.cfg.ttlSec === 60 && r.cfg.jitterPct === 15 && r.cfg.hitRate === 1) },
  { text: 'Cache lagne ke baad wahi GET bhejo — pehli baar MISS, aur cache bhar jaata hai',
    check: s => s.records.some(r => r.kind === 'http' && r.cache === 'MISS' && r.dbQueries > 0 && s.records.some(c => c.kind === 'sim' && c.what === 'cache' && s.records.indexOf(c) < s.records.indexOf(r))) },
  { text: 'Ab dobara maango — HIT milna chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.cache === 'HIT') },
  { text: '500 rps ka load dobara chalao — system na bhare, errors zero',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && !r.saturated && r.errPct === 0 && r.revision === s.revision && s.sys.api.cache?.ttlSec === 60 && s.sys.api.cache.jitterPct === 15 && s.sys.api.cache.hitRate === 1) },
];

const T_STAMPEDE = [
  { text: 'Cache TTL 10s, jitter 0, hit-rate 1: 500 rps par 12s ka load — expiry par DB par jhatka dekho',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && r.cacheConfig?.ttlSec === 10 && r.cacheConfig.jitterPct === 0 && r.expiryMisses === 100 && r.cacheSteps.some(x => x.expiredKeys === 100)) },
  { text: 'Ab jitter 20% karke wahi 12s load — jhatka chhota ho',
    check: s => { const loads = s.records.filter(r => r.kind === 'load' && r.expiryMisses > 0); return loads.length >= 2 && loads[1].cacheConfig?.ttlSec === 10 && loads[1].cacheConfig.jitterPct === 20 && loads[1].cacheSteps.every(x => x.expiredKeys < 100) && loads[1].maxP99 < loads[0].maxP99; } },
  { text: 'api.cache null karo (cache gir gaya) — 500 rps ka load dobara chalao aur DB ki asli capacity dekho',
    check: s => s.sys.api.cache === null && SD.mission.current(s, 'load', r => r.rps === 500) },
];

const T_BOSS_DATA = [
  { text: 'Baseline: dashboard query kitni dheemi hai',
    check: s => s.records.some(r => r.kind === 'http' && r.rowsExamined > 1000000) },
  { text: "transactions par (user_id, created_at, id) composite index banao",
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'user_id' && r.cols[1] === 'created_at' && r.cols[2] === 'id' && SD.mission.index(s, 'transactions', ['user_id','created_at','id'])) },
  { text: 'COUNT(*) hatao',
    check: s => s.records.some(r => r.kind === 'sim' && /countTotal/.test(r.path || '') && r.value === false && s.sys.api.countTotal === false) },
  { text: 'Cache lagao — jitter ke saath',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'cache' && r.cfg.jitterPct > 0) },
  { text: "500 rps ka load dobara chalao — system na bhare, aur cache ka jitter 0 se zyada rahe",
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && !r.saturated && r.revision === s.revision && s.sys.api.cache?.jitterPct > 0) },
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
          q: 'Product ka daam badal gaya. Purana bill sahi rakhne ke liye order item mein kya rakhoge?',
          choices: [
            'Kharidte waqt tay hua daam rakho, taaki purane bill ka amount sahi bana rahe',
            'Product ka aaj ka daam padho, taaki har bill mein sabse taaza amount hi aaye',
            'Kharidte waqt ka daam bas cache mein rakho, taaki bill jaldi nikal sake',
            'DB ka default daam rakhne do, taaki app ko purane bill ka hisaab na karna pade',
          ],
          answer: 0,
          explain: 'Purane bill mein kharidte waqt tay hua daam chahiye. Product ka aaj ka daam alag baat hai. Order item ka daam rakhna sahi hisaab bachata hai; sirf query tez karna maqsad nahi. Snapshot ya denormalization ka naam dene se business ka niyam nahi badalta.',
          choiceExplanations: [
            'Purane bill mein kharidte waqt tay hua daam chahiye. Product ka aaj ka daam alag baat hai. Order item ka daam rakhna sahi hisaab bachata hai; sirf query tez karna maqsad nahi. Snapshot ya denormalization ka naam dene se business ka niyam nahi badalta.',
            'Product ka daam badalne par purane bill ka amount nahi badalna chahiye. Aaj ka daam kharidte waqt ke daam ka badal nahi.',
            'Cache hat sakta hai ya purana pad sakta hai. Tay hua daam order ke saath sambhalna chahiye; bill jaldi nikalna alag faayda hai.',
            'DB ka default business ka tay hua daam nahi jaanta. App ko kharidte waqt ka sahi amount record karna hoga.',
          ],
        },
        {
          q: 'Row par deleted_at laga diya, par row table mein hai. User ki list banate waqt kaunsa khatra hai?',
          choices: [
            'Deleted rows ka filter chhoota, toh user ko hataaya hua data dikh sakta hai',
            'Deleted rows ka filter DB khud laga dega, toh raw query bhi data chhupa degi',
            'Deleted row backup se bhi hat jaayegi, toh restore par purana data nahi aayega',
            'Deleted row ki jagah khaali ho jaayegi, toh DB nayi row bina purge rakh dega',
          ],
          answer: 0,
          explain: 'Soft delete row ko nishaan lagaata hai, mitaata nahi. List ki query mein sahi filter na ho toh hataaya hua data dikh sakta hai. ORM ke default filters, views aur access ke niyam madad kar sakte hain. Archive table ya soft delete ka faisla restore aur data rakhne ki zaroorat se karo.',
          choiceExplanations: [
            'Soft delete row ko nishaan lagaata hai, mitaata nahi. List ki query mein sahi filter na ho toh hataaya hua data dikh sakta hai. ORM ke default filters, views aur access ke niyam madad kar sakte hain. Archive table ya soft delete ka faisla restore aur data rakhne ki zaroorat se karo.',
            'ORM ka default filter kuch queries mein madad karta hai. Raw queries ya admin ke raaste par visibility ka niyam alag se pakka karna padta hai.',
            'Soft delete backup ki copies nahi mitaata. Backup aur restore ke liye data rakhne aur hataane ka alag niyam chahiye.',
            'Row table mein bani rehti hai. Sirf deleted_at bharne se row purge nahi hoti aur saari jagah wapas nahi milti.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Data Modeling',
    instructions: '"Access patterns" bolna yahan pehla achha signal hai. 🎤',
    questions: [
      {
        q: 'E-commerce ka schema banana hai. Tables tay karne se pehle kaunsa kaam karoge?',
        choices: [
          'App ke sawaal aur sahi hisaab ke niyam poochho, phir tables ka roop tay karo',
          'Har entity ki service pehle bana do, phir app ke sawaalon ko services mein baanto',
          'Document DB pehle chun lo, phir tables ke rishton par sochne ka kaam chhod do',
          'Entities ko pehle poora normalize karo, phir app ke sawaalon ko schema se milaao',
        ],
        answer: 0,
        explain: 'Pehle poochho: app kya padhegi, kitni baar padhegi, aur kitni deri chalegi? Saath mein sahi hisaab ke niyam samjho. App ke sawaal batate hain ki kaunse tables aur indexes kaam aayenge, aur kis report ko alag analytics system chahiye ho sakta hai.',
        choiceExplanations: [
          'Pehle poochho: app kya padhegi, kitni baar padhegi, aur kitni deri chalegi? Saath mein sahi hisaab ke niyam samjho. App ke sawaal batate hain ki kaunse tables aur indexes kaam aayenge, aur kis report ko alag analytics system chahiye ho sakta hai.',
          'Har entity ko alag service banana zaroori nahi. Service ki zimmedaari aur alag deploy karne ki zaroorat samjhe bina boundary tay nahi hoti.',
          'Document DB mein bhi data ke rishte aur sahi updates ke niyam rehte hain. DB chunne se app ke sawaal samajhne ka kaam nahi mitta.',
          'Normalization kaam ka tareeka hai, par app ko kya padhna aur badalna hai, pehle samajhna chahiye. Schema ko zaroorat ke hisaab se parakho.',
        ],
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
     <p>Tree navigation dheere grow karti hai; given fanout 100 mein table 100x badi hone par roughly ek hop add hota hai. Actual latency selectivity, cache, heap fetches aur I/O par depend hai; index every query ko faster nahi banata.</p>
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
     <p class="tip">🎯 <b>Index sabse zyada kaam aata hai jab query thodi rows maange.</b>
     Query bahut saari rows laa rahi ho, toh index se random lookups karne se
     seq scan sasta pad sakta hai. Koi pakka % cutoff nahi — data, cache aur disk
     par depend karta hai. Optimizer apne andaaze se plan chunta hai; index
     "ignore" hona aksar bug nahi, samajhdaari hai. EXPLAIN se jaancho.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🌳 Index lagao aur plan padho',
      goal: 'Ek 2.4 crore rows wali table par user ki transactions dhoondhni hain. Pehle plan dekho, phir index banao, phir plan dobara dekho — aur farak naapo.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_BTREE,
      success: SD.allTasks(T_BTREE),
      successText: `<b>Seq Scan → Index Scan.</b> Rows examined 2.4 crore se seedha neeche.
        <br><br>Aur yaad rakho: index selection ka universal <b>90% cutoff nahi</b>. Statistics, selectivity, table size, ordering, covering aur storage cost se planner choose karta hai. Agar 99% rows match karein toh seq scan cheaper ho sakta hai; rare boolean value par index useful ho sakta hai. Real workload par EXPLAIN ANALYZE dekho.`,
      solution: [
        "EXPLAIN SELECT * FROM transactions WHERE user_id = 5",
        "CREATE INDEX ix_txn_user ON transactions(user_id)",
        "EXPLAIN SELECT * FROM transactions WHERE user_id = 5",
        "GET /api/v1/transactions?user_id=5&limit=50",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'transactions', ['user_id']) && m.current(s, 'http', r => r.resource === 'transactions' && r.rowsExamined < 100000 && r.status === 200); },
      hints: [
        'Pehle user filter wali query ka `EXPLAIN` padho. Index ke bina rows examined batayega ki chhota jawab nikaalne ke liye kitni table padhi gayi.',
        '`CREATE INDEX <name> ON transactions(user_id)` ke baad same `EXPLAIN SELECT ... WHERE user_id = <user>` chalao. Phir `GET <path>?user_id=<user>&limit=<n>`; plan ke saath request ka cost bhi jaancho.',
        'Poora raasta — har command alag Enter se chalao:\nEXPLAIN SELECT * FROM transactions WHERE user_id = 5\nCREATE INDEX ix_txn_user ON transactions(user_id)\nEXPLAIN SELECT * FROM transactions WHERE user_id = 5\nGET /api/v1/transactions?user_id=5&limit=50',
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
          q: 'Balanced B-tree wali table 1 lakh se 10 crore rows ho gayi. Lookup ke baare mein kya keh sakte ho?',
          choices: [
            'Tree ki gehraai dheere badhegi; lookup ka asli waqt naap kar pata chalega',
            'Rows hazaar guna badhi hain, toh lookup ka waqt bhi hazaar guna hi badhega',
            'Index laga hua hai, toh lookup ka waqt pehle jitna hi rehna pakka hai',
            'Har nayi row ek hop jodegi, toh tree ki gehraai bhi rows jitni badhegi',
          ],
          answer: 0,
          explain: 'B-tree har hop par search ka bacha hissa chhota karta hai. Balanced tree ki gehraai logarithmic badhti hai, rows ke seedhe anupaat mein nahi. Asli hops aur waqt page mein entries ki ginti, key ki chaudai, cache aur disk se padhne par bhi nirbhar hain.',
          choiceExplanations: [
            'B-tree har hop par search ka bacha hissa chhota karta hai. Balanced tree ki gehraai logarithmic badhti hai, rows ke seedhe anupaat mein nahi. Asli hops aur waqt page mein entries ki ginti, key ki chaudai, cache aur disk se padhne par bhi nirbhar hain.',
            'Hazaar guna rows ka matlab hazaar guna hops nahi. Branches search ko chhote hisson mein baantti hain; waqt par cache aur disk ka bhi asar hai.',
            'Index waqt ko freeze nahi karta. Tree ki gehraai, cache misses aur table se rows laane ka kaam badal sakta hai.',
            'Balanced tree ek row ke liye ek naya level nahi jodta. Ek level ke nodes kai branches aur entries rakhte hain.',
          ],
        },
        {
          q: 'Query ke plan mein Seq Scan aaya, Index Scan nahi. Wajah samajhne ke liye kya jaanchoge?',
          choices: [
            'Kitni rows chahiye, planner ka andaaza aur padhne ka kharch plan mein dekho',
            'Index ki entry kharab maan lo, aur plan samjhe bina index dobara bana do',
            'Planner ka bug maan lo, aur rows ka andaaza dekhe bina index zabardasti lagao',
            'Statistics bekaar maan lo, aur data ka batwaara dekhe bina setting badal do',
          ],
          answer: 0,
          explain: 'Bahut rows chahiye hon toh table ko seedha padhna sasta pad sakta hai. Par 30% jaisa koi ek cutoff har query par lagu nahi hota. Plan mein rows ka andaaza, actual rows, cache aur disk ka kaam dekho; purane statistics bhi galat andaaze ki wajah ho sakte hain.',
          choiceExplanations: [
            'Bahut rows chahiye hon toh table ko seedha padhna sasta pad sakta hai. Par 30% jaisa koi ek cutoff har query par lagu nahi hota. Plan mein rows ka andaaza, actual rows, cache aur disk ka kaam dekho; purane statistics bhi galat andaaze ki wajah ho sakte hain.',
            'Seq Scan sahi aur sasta plan bhi ho sakta hai. Corruption kehne ke liye alag saboot chahiye; sirf index na lagna kaafi nahi.',
            'Planner bahut rows ke liye sahi tarah Seq Scan chun sakta hai. Galat andaaze ya cost ka saboot dekhe bina bug mat maano.',
            'Planner statistics ki madad se plan chunta hai. Statistics purane hain ya data alag banta hai, jaanch kar hi setting badlo.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Indexes',
    instructions: '"EXPLAIN" bolna yahan zaroori hai. 🎤',
    questions: [
      {
        q: 'Ek query dheemi hai. Badlaav chunne se pehle sabse kaam ki jaanch kaunsi hogi?',
        choices: [
          'EXPLAIN se plan dekho, phir rows aur samay ka asli kaam naap kar milao',
          'created_at par index bana do, phir query tez hui toh jaanch poori maan lo',
          'Server ki RAM badha do, phir query tez hui toh jaanch poori maan lo',
          'Query ko do calls mein baant do, phir har call chhoti ho toh theek maan lo',
        ],
        answer: 0,
        explain: 'Pehle dekho ki query waqt kahan laga rahi hai: rows padhne, sort, join ya intezaar mein? EXPLAIN plan ka andaaza deta hai; EXPLAIN ANALYZE query chala kar actual rows aur waqt dikhata hai. Bahut rows padh kar kam lautna jaanch ka signal hai, apne aap galti ka saboot nahi.',
        choiceExplanations: [
          'Pehle dekho ki query waqt kahan laga rahi hai: rows padhne, sort, join ya intezaar mein? EXPLAIN plan ka andaaza deta hai; EXPLAIN ANALYZE query chala kar actual rows aur waqt dikhata hai. Bahut rows padh kar kam lautna jaanch ka signal hai, apne aap galti ka saboot nahi.',
          'created_at ka index tabhi madad karega jab query ka filter ya order index se mel khaaye. Bina plan ke extra index writes ka kharch badha sakta hai.',
          'RAM cache ki tangi mein madad kar sakti hai. Pehle pata karo ki waqt disk, sort, CPU ya kisi intezaar mein lag raha hai.',
          'Do calls mein network ke chakkar badh sakte hain. Query baantne se pehle dheeme hisse ka saboot chahiye.',
        ],
      },
      {
        q: 'Har column par index bana dene se kya keemat chukaani pad sakti hai?',
        choices: [
          'Indexes jagah aur cache lete hain; entries badalne par write ka kaam bhi badhta hai',
          'Indexes bas disk lete hain; nayi rows likhne ka kaam pehle jitna hi rehta hai',
          'Indexes har UPDATE par badalte hain; values wahi rahen tab bhi har entry nayi banti hai',
          'Indexes har query bacha lete hain; writes ka extra kharch read se poora ho jaata hai',
        ],
        answer: 0,
        explain: 'Index jagah aur cache leta hai. Nayi ya badli indexed values ke saath index sambhalne ka kaam bhi lagta hai. Har UPDATE har index entry ko dobara likhe, zaroori nahi. Sirf app ki zaroori queries ko faayda dene wale indexes ka kharch manzoor karo.',
        choiceExplanations: [
          'Index jagah aur cache leta hai. Nayi ya badli indexed values ke saath index sambhalne ka kaam bhi lagta hai. Har UPDATE har index entry ko dobara likhe, zaroori nahi. Sirf app ki zaroori queries ko faayda dene wale indexes ka kharch manzoor karo.',
          'Index sirf disk par nahi rehta; cache aur likhne ka kaam bhi leta hai. INSERT par sahi indexes mein entries bhi jodni padti hain.',
          'Kuch UPDATE mein indexed values nahi badalti aur DB har index entry dobara banaane se bach sakta hai. Har UPDATE ke liye ek hi kharch mat maano.',
          'Faayda query ke filter, order aur maangi rows par nirbhar hai. Kam padhi jaane wali table par extra indexes ka write kharch bhaari pad sakta hai.',
        ],
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
    { front: 'B-tree ki depth?', back: '<code>log₁₀₀(n)</code> — 2.4 crore rows par ~4 hops. Table 1000x badhe toh depth sirf 1.5 badhti hai. Exact latency caching,IO,selectivity aurrow lookups par depend hai;depth alone runtime guarantee nahi.' },
    { front: 'Selectivity?', back: 'distinct values ÷ total rows. <code>email</code> = 1.0 (perfect) · <code>is_active</code> = ~0 (bekaar). <b>Thodi rows maangne wali query par index sabse kaam ka — pakka % cutoff nahi; plan dekho.</b>' },
    { front: '4 patterns jo index maar dete hain?', back: '<b>1.</b> <code>LIKE &#39;%abc&#39;</code> (leading wildcard) <b>2.</b> <code>YEAR(col)</code> (function) <b>3.</b> <code>!=</code> <b>4.</b> low selectivity column.' },
    { front: 'Optimizer index ignore kyun karta hai?', back: 'Query bahut zyada rows laa rahi hai. Index scan mein har match par <b>random</b> lookup hota hai — bahut rows ke liye seq scan sasta pad sakta hai (pakka % nahi). Optimizer aksar sahi hota hai — EXPLAIN se jaancho.' },
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
✅ WHERE user_id = ? ORDER BY created_at          matching order; explicit sort may avoid
⚠️ WHERE created_at > ?                           broad scan/skip scan:EXPLAIN
⚠️ WHERE id = ? (is index se)                     plan/cardinality dependent</pre>
     <p>Aakhri do mein <code>created_at</code> aur <code>id</code> index ke
     <b>andar</b> toh hain — par woh <b>leading column</b> nahi hain, isliye
     leading equality filter jitna direct seek nahi milta.PostgreSQL 18 mein skip scan low-cardinality leading values par help kar sakta hai;plan dekho.</p>`,
    `<h3>🔬 Column ka kram kaise chuno</h3>
     <pre>1️⃣  Equality columns PEHLE     (WHERE x = ?)
2️⃣  Sort column BEECH mein     (ORDER BY)
3️⃣  Range column AAKHIR mein   (> < BETWEEN)</pre>
     <p><b>Range aakhir mein kyun?</b> Kyunki range ke <b>baad</b> ka koi bhi
     column narrow contiguous seek ko zaroor reduce nahi karta;index predicate check,bitmap combination ya skip scan still help kar sakte hain.Dekho:</p>
     <pre>INDEX (status, created_at, merchant)
WHERE status = 'done' AND created_at > '2026-01-01' AND merchant = 'amazon'
       ─────────────────  ──────────────────────────  ─────────────────
       ✅ index se           ✅ index se (range)          ⚠️ index predicate check ho sakta hai;
                                                            narrow seek necessarily nahi

Behtar: INDEX (status, merchant, created_at)
        dono equality pehle, range aakhir mein → teenon index se</pre>
     <h3>🏆 Covering index</h3>
     <p>Query ke <b>saare</b> required columns supported index mein hon toh index-only scan possible hai. PostgreSQL mein visibility map all-visible na ho toh heap fetches phir bhi lag sakte hain:</p>
     <pre>INDEX (user_id, created_at, amount)
SELECT amount FROM transactions WHERE user_id = ? ORDER BY created_at
→ "Index Only Scan" / "Using index" candidate; heap fetches and timing measure karo</pre>
     <p class="tip">💸 <b>Index muft nahi — woh write par TAX hai.</b>
     8 indexes wali table par INSERT ko heap aur affected indexes maintain karne padte hain; physical writes/WAL/page splits fixed 9 I/O nahi. Aur woh sab
     buffer pool mein jagah lete hain, jo tumhare asli data ke liye kam pad
     jaati hai. Aur yaad rakho: <b>5 alag single-column indexes ≠ ek
     composite index</b> — DB aksar ek hi chunta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🗂️ Left-most prefix khud todo',
      goal: 'Composite index banao. Is simulator mein pehle column ke bina index nahi chuna jaata. Asli database poore index ka scan ya skip scan bhi chun sakta hai — asli DB par EXPLAIN ANALYZE se dekho.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_COMPOSITE,
      success: SD.allTasks(T_COMPOSITE),
      successText: `Sirf created_at ke filter par simulator ne poori table padhi. Ye model sirf baayein se shuru hone wale columns ka faayda dikhata hai. Asli database skip scan, poore index ka scan aur data ke aankde bhi dekhta hai. Column ka kram is hisaab se chuno: pehle barabari (=) wale, phir sort, phir range — aur asli DB par plan naapo.`,
      solution: [
        "CREATE INDEX ix_user_time ON transactions(user_id, created_at)",
        "EXPLAIN SELECT * FROM transactions WHERE user_id = 5",
        "EXPLAIN SELECT * FROM transactions WHERE created_at > 2026",
        "show indexes on transactions",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'transactions', ['user_id', 'created_at']) && m.current(s, 'showIndexes', r => r.rows > 0); },
      hints: [
        'Pehle `(user_id, created_at)` ka composite index banao. Column ka kram test karna hai; phone book mein pehla naam chhodne jaisa farak dekho.',
        '`EXPLAIN SELECT ... WHERE user_id = <user>` ko sirf created_at wali query se milao. Simulator leading filter ke bina composite index nahi chunta. `show indexes on transactions` mein column order padho.',
        'Poora raasta — har command alag Enter se chalao:\nCREATE INDEX ix_user_time ON transactions(user_id, created_at)\nEXPLAIN SELECT * FROM transactions WHERE user_id = 5\nEXPLAIN SELECT * FROM transactions WHERE created_at > 2026\nshow indexes on transactions',
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
          q: 'PostgreSQL 18 mein INDEX(a, b, c) hai. Query WHERE b=1 AND c=2 hai. Plan ke baare mein kya keh sakte ho?',
          choices: [
            'Plan dekho: a ki values kam hon toh skip scan kaam aa sakta hai',
            'a par filter nahi hai, toh DB index ko plan se poori tarah hata dega',
            'b aur c index mein hain, toh DB bas matching entries hi padh paayega',
            'WHERE mein b pehle hai, toh DB index ko b se shuru hua maan lega',
          ],
          answer: 0,
          explain: 'Index pehle a ke groups banaata hai. PostgreSQL 18 mein a ki alag values kam hon toh DB har group mein b aur c dhoondh sakta hai: skip scan. Bahut groups hon toh bada index scan ya table scan sasta ho sakta hai. EXPLAIN se actual plan dekho.',
          choiceExplanations: [
            'Index pehle a ke groups banaata hai. PostgreSQL 18 mein a ki alag values kam hon toh DB har group mein b aur c dhoondh sakta hai: skip scan. Bahut groups hon toh bada index scan ya table scan sasta ho sakta hai. EXPLAIN se actual plan dekho.',
            'Leading filter na hone se index poori tarah bekaar nahi hota. PostgreSQL 18 ka skip scan kam groups mein madad kar sakta hai.',
            'Columns index mein hone bhar se chhota seek pakka nahi. Leading a ke groups aur planner ka kharch bhi dekhna padta hai.',
            'Index ka kram CREATE INDEX tay karta hai. WHERE mein shartein aage-peechhe likhne se index ka kram nahi badalta.',
          ],
        },
        {
          q: 'Composite B-tree mein columns ka kram tay karna hai. Kaunsa tareeka zyada bharosemand hai?',
          choices: [
            'Equality, sort aur range se kram aazmao, phir actual query ka plan milao',
            'Sabse kam rows dene wala column aage rakho, sort ka kharch baad mein dekho',
            'WHERE mein columns jis kram mein likhe hain, index mein bhi wahi kram rakho',
            'Sirf range wala column aage rakho, equality aur sort ka kram baad mein dekho',
          ],
          answer: 0,
          explain: 'Equality columns aage rakhna achhi shuruaat ho sakti hai. Par ORDER BY, range mein kitni rows hain, sort ki direction aur DB ka support bhi dekho. Equality, sort, range ka niyam madad karta hai; har query ke liye ek hi kram sahi nahi. EXPLAIN se parakho.',
          choiceExplanations: [
            'Equality columns aage rakhna achhi shuruaat ho sakti hai. Par ORDER BY, range mein kitni rows hain, sort ki direction aur DB ka support bhi dekho. Equality, sort, range ka niyam madad karta hai; har query ke liye ek hi kram sahi nahi. EXPLAIN se parakho.',
            'Sirf sabse chhota result dene wala column chunne se sort aur range ka kharch chhoot sakta hai. Puri query ko dekhkar kram tay karo.',
            'WHERE ki likhaavat ka kram DB badal sakta hai. Index ka kram query ke filter aur order ki zaroorat se chuno.',
            'Range pehle rakhne par baad ki equality chhota seek nahi bana paaye, mumkin hai. Kitna scan aur sort hoga, actual plan mein dekho.',
          ],
        },
        {
          q: 'Query kai columns filter karti hai aur result sort bhi karti hai. Paanch single indexes aur matching composite mein kya farak hai?',
          choices: [
            'Matching composite filter aur sort ka kaam ek kram se kar sakta hai',
            'Paanch single indexes milkar composite ka sorted kram bana dete hain',
            'PostgreSQL ek plan mein bas ek index padh kar result nikaal sakta hai',
            'Composite kai columns rakhta hai, toh writes ka kharch bach jaata hai',
          ],
          answer: 0,
          explain: 'Matching composite filter aur order dono sambhal sakta hai. PostgreSQL kai indexes ke matches bitmap mein mila bhi sakta hai, par bitmap se index ka sort order nahi bachta; alag sort lag sakta hai. Read ka faayda aur write, jagah ka kharch naap kar chuno.',
          choiceExplanations: [
            'Matching composite filter aur order dono sambhal sakta hai. PostgreSQL kai indexes ke matches bitmap mein mila bhi sakta hai, par bitmap se index ka sort order nahi bachta; alag sort lag sakta hai. Read ka faayda aur write, jagah ka kharch naap kar chuno.',
            'Alag indexes ke matches milaana composite ka sorted kram dene jaisa nahi. Bitmap plan ke baad alag sort lag sakta hai.',
            'PostgreSQL bitmap AND ya OR se kai indexes ke matches mila sakta hai. Har query ke liye sirf ek index ki pabandi nahi.',
            'Composite bhi jagah leta hai aur matching writes par entries badalni padti hain. Kai columns ek saath rakhne se kharch zero nahi hota.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Composite Indexes',
    instructions: 'Yeh sawaal bahut discriminating hota hai. 🎤',
    questions: [
      {
        q: 'INDEX(user_id, created_at) hai, par sirf tareekh se filter karne wali query dheemi hai. Kaunsi jaanch kaam aayegi?',
        choices: [
          'Plan mein user groups aur reads dekho; DB ka version bhi jaanch lo',
          'Range query mein index nahi lagta, isliye tareekh ki shart hata kar dekho',
          'created_at aakhri column hai, isliye index ko corrupt maan kar bana do',
          'user_id ki shart nahi hai, isliye table ka poora scan hi pakka maan lo',
        ],
        answer: 0,
        explain: 'Phone book surname ke groups mein hoti hai; sirf first name dhoondhne par kai groups dekhne padte hain. INDEX(user_id, created_at) mein tareekh user ke andar sorted hai. PostgreSQL 18 ka skip scan kam user groups mein madad kar sakta hai. Version, groups ki ginti aur plan dekho.',
        choiceExplanations: [
          'Phone book surname ke groups mein hoti hai; sirf first name dhoondhne par kai groups dekhne padte hain. INDEX(user_id, created_at) mein tareekh user ke andar sorted hai. PostgreSQL 18 ka skip scan kam user groups mein madad kar sakta hai. Version, groups ki ginti aur plan dekho.',
          'B-tree ranges mein bhi kaam aata hai. Sawaal range hone ka nahi, query ko index ke kram se kitna faayda milne ka hai.',
          'created_at aakhri hone se corruption nahi hota. Trailing column par filter check ho sakta hai; skip scan bhi madad kar sakta hai.',
          'user_id na dene par poora table scan pakka nahi. DB ka version, user groups ki ginti aur scan ka kharch plan tay karte hain.',
        ],
      },
      {
        q: 'Index lagaane ke baad bhi query 200 ms leti hai. Agla badlaav kaise chunoge?',
        choices: [
          'Plan mein rows, table se reads aur sort ka waqt dekho, phir fix parakho',
          'Index maujood hai, toh SQL ka kaam poora maano aur bas server badha do',
          'Saare SELECT columns index mein jod do, toh table reads zero maan kar chalo',
          'Query abhi dheemi hai, toh table baant do aur partition ka faayda pakka maano',
        ],
        answer: 0,
        explain: 'Index ke baad bhi bahut rows, sort, join ya intezaar bacha ho sakta hai. Saare required columns index mein hon toh covering se faayda mil sakta hai. PostgreSQL ko row ki visibility jaanchne ke liye table par jaana phir bhi pad sakta hai. Heap fetches aur waqt naap kar hi faayda maano.',
        choiceExplanations: [
          'Index ke baad bhi bahut rows, sort, join ya intezaar bacha ho sakta hai. Saare required columns index mein hon toh covering se faayda mil sakta hai. PostgreSQL ko row ki visibility jaanchne ke liye table par jaana phir bhi pad sakta hai. Heap fetches aur waqt naap kar hi faayda maano.',
          'Index hona query ka saara kaam sasta hone ka saboot nahi. Kam rows, sahi order aur bache intezaar ki jaanch abhi baaki hai.',
          'Columns index mein hon tab bhi PostgreSQL visibility ke liye table padh sakta hai. Covering se har heap read mitne ka vaada nahi.',
          'Partition tab madad karega jab query kuch hisson ko chhod sake ya data sambhalna aasaan ho. Har dheemi query ka ilaaj partition nahi.',
        ],
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
    { front: 'Left-most prefix rule?', back: "INDEX(a,b,c) leading equality se often narrow seek deta hai. Missing a index ko universally unusable nahi banata; PostgreSQL 18 skip scan, cardinality aur actual plan verify karo. Analogy mein firstName-only lookup ka seek less direct hai." },
    { front: 'Column ka kram?', back: '<b>Equality → sort → range.</b> Range ke BAAD ka koi column index se filter nahi hota — woh sirf rows padh ke chhaanta hai.' },
    { front: 'Covering index?', back: 'Query ke SAARE columns index mein → heap aksar chhuna nahi padta (<code>Index Only Scan</code>) — par PostgreSQL mein visibility map taaza na ho toh heap phir bhi padhna padta hai. Kitna tez hua, naap ke dekho.' },
    { front: '5 single vs 1 composite?', back: 'DB aksar <b>ek hi</b> index chunta hai, toh 5 single multi-column query ko nahi bachate — par unka write tax 5 guna hai.' },
    { front: 'Index ka tax?', back: "Indexes insert/delete maintenance, WAL aur cache space add karte hain. UPDATE ki index cost changed columns/engine par depend hai; PostgreSQL HOT kuch updates mein new index entries avoid karta hai. 8 indexes ko fixed 9 physical I/O mat maano." },
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
          q: 'PostgreSQL mein equality ke saath range aur sorted result bhi chahiye. Hash aur B-tree mein kaunsa farak kaam aayega?',
          choices: [
            'Hash equality dhoondhta hai; B-tree range aur sort mein bhi kaam aa sakta hai',
            'Hash buckets bhi sorted rehte hain; B-tree ki tarah range nikaal sakte hain',
            'Hash text ko words mein todta hai; product search ki ranking bhi sambhaalta hai',
            'Hash ka lookup O(1) hai; range aur sort milaakar bhi har load par tez rahega',
          ],
          answer: 0,
          explain: 'PostgreSQL ka hash index equality dhoondhta hai. B-tree equality ke saath sorted kram aur ranges mein bhi madad kar sakta hai. Hash ka average O(1) akela poora query cost nahi bataata; cache, disk, collisions aur index sambhalne ka kaam bhi naapna padta hai.',
          choiceExplanations: [
            'PostgreSQL ka hash index equality dhoondhta hai. B-tree equality ke saath sorted kram aur ranges mein bhi madad kar sakta hai. Hash ka average O(1) akela poora query cost nahi bataata; cache, disk, collisions aur index sambhalne ka kaam bhi naapna padta hai.',
            'Hash bucket key ka sorted kram nahi deta. Equality ke matches milte hain, ordered range walk nahi.',
            'Full-text search words aur matching ki alag indexing maangti hai. Hash index bas value ki equality se kaam karta hai.',
            'O(1) average lookup sorted output aur range ka kaam nahi mitaata. Asli query aur DB implementation se faayda naapna hoga.',
          ],
        },
        {
          q: 'Orders bahut hain, par queries sirf pending orders padhti hain. Partial index se kya faayda mil sakta hai?',
          choices: [
            'Sirf shart waali rows rakhega, toh index aur write ka kaam kam ho sakta hai',
            'Index ek baar banega, toh baad ki pending rows par entry jodne ka kaam bachega',
            'Index pending par banega, toh doosri status ki queries bhi poori cover karega',
            'Index chhota banega, toh matching rows ki uniqueness jaanchna chhod sakte hain',
          ],
          answer: 0,
          explain: 'Partial index sirf shart, jaise status=pending, se milti rows rakhta hai. Chhota subset ho toh jagah aur maintenance kam ho sakti hai. Matching writes ka kaam phir bhi hai; query se index ki shart poori hona planner ko samajh aana chahiye. Koi fixed 1000x faayda pakka nahi.',
          choiceExplanations: [
            'Partial index sirf shart, jaise status=pending, se milti rows rakhta hai. Chhota subset ho toh jagah aur maintenance kam ho sakti hai. Matching writes ka kaam phir bhi hai; query se index ki shart poori hona planner ko samajh aana chahiye. Koi fixed 1000x faayda pakka nahi.',
            'Nayi qualifying row par index entry jodni padti hai. Row shart mein aaye ya bahar jaaye, UPDATE par bhi maintenance lag sakti hai.',
            'Sirf pending rows ka index doosri status ki saari rows nahi rakhta. Planner ko query se partial index ki shart poori hoti dikhni chahiye.',
            'Partial index chhota hone se uniqueness ki business shart nahi mitti. Unique partial index matching subset mein uniqueness bhi jaanch sakta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Index Types',
    instructions: 'Yahan "depends" bolna sahi hai — par batao kis par. 🎤',
    questions: [
      {
        q: 'Product search bana rahe ho. PostgreSQL aur Elasticsearch mein faisla kaise karoge?',
        choices: [
          'Search ke nateeje aur zarooratein parakho; alag engine ka kharch bhi gino',
          'Elasticsearch chun lo; search alag hote hi DB se sync ka kaam bach jaayega',
          'PostgreSQL hata do; relational DB mein words ke liye full-text search nahi hoti',
          'Sirf requests per second gino; language aur ranking baad mein tune ho jaayengi',
        ],
        answer: 0,
        explain: 'Pehle search ki zaroorat samjho: kaunse results upar chahiye, typo aur language ka kya asar hai, kitna load aur kitni taaza jaankari chahiye? PostgreSQL full-text ya alag search engine dono valid ho sakte hain. Alag engine ke saath sync, dobara index banaana aur system chalaane ka kaam bhi aata hai.',
        choiceExplanations: [
          'Pehle search ki zaroorat samjho: kaunse results upar chahiye, typo aur language ka kya asar hai, kitna load aur kitni taaza jaankari chahiye? PostgreSQL full-text ya alag search engine dono valid ho sakte hain. Alag engine ke saath sync, dobara index banaana aur system chalaane ka kaam bhi aata hai.',
          'DB aur search index alag hon toh changes pahunchane aur failure ke baad pakadne ka kaam chahiye. Alag engine se sync kaam nahi mitta.',
          'PostgreSQL full-text search karta hai. Alag engine tab chuno jab search ki zaroorat aur naap extra system ki keemat ko sahi thahraayein.',
          'Requests ki raftaar akeli result quality nahi bataati. Language, ranking, filter, latency aur data ki taazgi bhi faisle ka hissa hain.',
        ],
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
          q: 'GraphQL mein orders ke andar items aur har item ka product maanga gaya. Bina batching kaunsa khatra badh sakta hai?',
          choices: [
            'Nested resolvers alag DB calls karein, toh ek request ki calls badh sakti hain',
            'GraphQL ki call mein DB index band rahe, toh har query poori table padh legi',
            'GraphQL ka result cache nahi ho sake, toh har request saari queries dohraayegi',
            'DataLoader lage toh har dependency ek call banegi, alag queries bachengi hi nahi',
          ],
          answer: 0,
          explain: 'Order, item aur product ke resolver alag-alag DB calls karein toh nested data ke saath calls badh sakti hain. N+1 REST mein bhi nested ho sakta hai; GraphQL akela wajah nahi. DataLoader ek request ke andar compatible keys ko batch aur dedupe karta hai. Har layer aur dependency ek hi query mein nahi milti.',
          choiceExplanations: [
            'Order, item aur product ke resolver alag-alag DB calls karein toh nested data ke saath calls badh sakti hain. N+1 REST mein bhi nested ho sakta hai; GraphQL akela wajah nahi. DataLoader ek request ke andar compatible keys ko batch aur dedupe karta hai. Har layer aur dependency ek hi query mein nahi milti.',
            'GraphQL DB indexes band nahi karta. Resolver aam indexed queries chala sakta hai; khatra alag-alag calls ki ginti ka hai.',
            'GraphQL mein caching mumkin hai. Cache keys, permissions aur data badalne par cache saaf karne ka niyam phir bhi banana padta hai.',
            'DataLoader compatible keys ko jama karta hai. Alag rounds ya dependencies ka kaam ek hi DB call banne ka vaada nahi.',
          ],
        },
        {
          q: 'N+1 fix ho gaya. Agli release mein chhupi extra DB calls pakadne ke liye kaunsa guard lagaoge?',
          choices: [
            'Endpoint ke test mein query count ki hadd jaancho, taaki extra calls par build ruke',
            'Endpoint ke docs mein fix likho, taaki code badalne par extra calls khud pakdi jaayein',
            'Resolver par fix ka comment rakho, taaki query count badhte hi review pakad le',
            'Team ko demo mein fix dikhao, taaki naye code mein extra calls pehle hi ruk jaayein',
          ],
          answer: 0,
          explain: 'Endpoint ke test mein DB calls ki ginti jaancho. Data ki ginti badhaakar bhi dekho ki N ke saath queries phir na badhein. Docs, comments aur review madad karte hain, par executable check code badalne par seedha signal deta hai. Query count ko latency ke saath metric bhi rakho.',
          choiceExplanations: [
            'Endpoint ke test mein DB calls ki ginti jaancho. Data ki ginti badhaakar bhi dekho ki N ke saath queries phir na badhein. Docs, comments aur review madad karte hain, par executable check code badalne par seedha signal deta hai. Query count ko latency ke saath metric bhi rakho.',
            'Docs wajah samjhaate hain, par naya code kitni DB calls karta hai, khud nahi ginte. Automated query-count check bhi chahiye.',
            'Comment code ke saath purana pad sakta hai. Saaf dikhne wala resolver bhi extra calls kar sakta hai; count ka test zyada seedha saboot hai.',
            'Demo se team seekh sakti hai, par baad ka refactor ya naya developer phir extra calls la sakta hai. Har build mein chalne wala check madad karega.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — N+1',
    instructions: 'Yeh sawaal aksar "ORM ke saath kya problem hai" ke roop mein aata hai. 🎤',
    questions: [
      {
        q: 'List endpoint 400 ms leta hai, DB metrics theek hain aur slow-query log khaali hai. Ab kya jaanchoge?',
        choices: [
          'Ek request ki queries gino aur dekho kitna waqt ek ke baad ek waits mein gaya',
          'Bas slow-query log ko wajah maano; entry nahi hai toh DB calls ko chhod do',
          'Bas saare filters par indexes banao; tez queries milte hi total waqt gir jaayega',
          'Bas DB ka average CPU dekho; kam CPU ho toh DB calls ka kaam sasta maan lo',
        ],
        answer: 0,
        explain: 'Kai chhoti sequential queries ki deri jud sakti hai, bhale har query slow-log ki hadd se neeche ho. Ek request ka trace aur query count dekho; DB metrics theek hone se N+1 saabit nahi hota, bas N+1 ek jaanchne laayak wajah hai. Network aur doosre waits bhi dekho.',
        choiceExplanations: [
          'Kai chhoti sequential queries ki deri jud sakti hai, bhale har query slow-log ki hadd se neeche ho. Ek request ka trace aur query count dekho; DB metrics theek hone se N+1 saabit nahi hota, bas N+1 ek jaanchne laayak wajah hai. Network aur doosre waits bhi dekho.',
          'Slow-log ki hadd se neeche wali kai queries milkar endpoint ko dheema kar sakti hain. Khaali log saari DB calls ko khaarij nahi karta.',
          'Har query tez ho tab bhi bahut round trips waqt lete hain. Query count aur trace dekhe bina indexes lagaana asli wajah chhod sakta hai.',
          'DB ka CPU kam reh sakta hai jab app bahut chhoti calls aur network waits mein waqt lagaati hai. Average CPU poora request path nahi dikhaata.',
        ],
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
    '<b>Utilization</b> vs <b>Saturation</b> — bahut se outage doosre se aate hain',
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
     <p><b>Bahut se outage saturation se aate hain.</b> Aur CPU/memory sirf
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
      goal: 'Ek service normal load par theek chal rahi hai. Ek lambi transaction 45 connections pakad legi. Dikhao ki CPU 10% par bhi pool ka intezaar badhta hai — aur saabit karo ki wajah pool hai, query nahi.',
      sys: SD.sys.orders(),
      tasks: T_POOL,
      success: SD.allTasks(T_POOL),
      successText: `Kaam ke connections 50 se 5 reh gaye. Capacity <b>3320 se 332 rps</b> ho gayi. 400 rps par pool ka sabse lamba intezaar <b>1024ms</b> tha — 10000ms ke timeout tak nahi pahuncha, isliye errors zero rahe. Trace mein atkaav pool.acquire() par hai. CPU ka 10% hona capacity ki poori kahani nahi batata.`,
      solution: [
        "load --rps 400 --duration 5 --path '/api/v1/orders?page=1&limit=50'",
        "sim inject long-tx --holds 45",
        "load --rps 400 --duration 5 --path '/api/v1/orders?page=1&limit=50'",
        "trace GET /api/v1/orders",
        "metrics",
      ],
      verify: s => { const m = SD.mission; return s.sys.db.longTxHolding === 45 && m.current(s, 'metrics', r => r.poolWaitHigh); },
      hints: [
        'Pehle orders par normal `load` chalao aur capacity dekho. Lambi transaction inject karne ke baad same load se connection shortage alag pakad mein aayegi.',
        '`sim inject long-tx --holds 45` ke baad `load --rps 400 --duration <seconds> --path \'<same-path>\'`. `trace GET /api/v1/orders` mein pool.acquire ka wait dekho; `metrics` se CPU aur pool wait milao.',
        'Poora raasta — har command alag Enter se chalao:\nload --rps 400 --duration 5 --path \'/api/v1/orders?page=1&limit=50\'\nsim inject long-tx --holds 45\nload --rps 400 --duration 5 --path \'/api/v1/orders?page=1&limit=50\'\ntrace GET /api/v1/orders\nmetrics',
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
            { t: "Trace one slow request end-to-end", good: true, next: 'found', explain: 'Bilkul. Machine metrics ne bata diya ki app BUSY nahi hai. Ab pata karna hai ki woh kis cheez ka INTEZAAR kar rahi hai — aur woh sirf trace batayega.' },
            { t: "Add app instances immediately", good: false, explain: 'CPU 11% hai — instances ki kami nahi hai. Aur agar bottleneck shared DB pool hai, toh naye instances aur connections maangenge aur haalat BIGADENGE.' },
            { t: "Tune SQL without wait evidence", good: false, explain: 'Slow query log KHAALI hai. DB ke paas queries pahunch hi nahi rahi — problem uske saamne hai.' },
            { t: "Rollback without change evidence", good: false, explain: 'Deploy 6 ghante pehle tha aur problem 40 minute purani hai. Ho sakta hai kuch aur badla ho — pehle diagnose karo.' },
          ],
        },
        found: {
          sitrep: '🔍 Trace: app 5ms · <b>pool.acquire() 9,900ms</b> · SQL 20ms · serialize 2ms.',
          text: 'Ab kya karoge?',
          choices: [
            { t: "Inspect pool holders and age", good: true, next: 'why', explain: 'Sahi. Ab problem confirm ho gayi (pool), par WAJAH nahi. Kya sach mein load zyada hai, ya kuch connections bandhak bana ke baitha hai?' },
            { t: "Increase pool50to500 now", good: false, explain: 'Ruko. Har connection DB par ek process hai — 500 connections aksar 50 se DHEEME hote hain. Aur agar wajah ek leak hai, toh 500 bhi 10 minute mein khatam ho jaayenge.' },
            { t: "Add another query index now", good: false, explain: 'SQL sirf 20 ms le raha hai. Use 10 ms karne se 9,900 ms ke wait par lagbhag kuch asar nahi hoga.' },
          ],
        },
        why: {
          sitrep: '📊 pool: 50/50 active, 0 idle. Ek query 40 minute se chal rahi hai — ek <b>analytics report</b> jo galti se prod par chala di gayi thi. Usne 45 connections ka ek batch job khola tha.',
          text: 'Ab turant kya?',
          choices: [
            { t: "Safely cancel bad job;bound future holds", good: true, next: 'end', explain: 'Turant relief + permanent guard. Timeouts ke bina ek galat query kabhi bhi poora pool bandhak bana sakti hai.' },
            { t: "Restart DB without holder analysis", good: false, explain: 'Connections toh chhoot jaayenge — par saare in-flight transactions bhi maare jaayenge aur outage lamba hoga. Aur wajah kal phir aa jaayegi.' },
            { t: "Leave saturation until next morning", good: false, explain: 'Abhi 60% users fail ho rahe hain. Bleeding pehle roko.' },
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
        { q: 'CPU ke alawa jo bhar sakta hai, usko kya kehte hain?', target: 'saturate', explain: 'Saturation. Utilization = "kitna use ho raha hai", saturation = "kitna intezaar ho raha hai". Bahut se outage saturation se aate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Pool ki samajh',
      questions: [
        {
          q: 'Trace: app 5 ms, pool.acquire 9900 ms, SQL 20 ms. Sirf SQL 10 ms ho aur baaki spans wahi rahen, toh total kya hoga?',
          choices: [
            '9925 se 9915 ms hoga; bachat bas 10 ms, bada wait abhi baaki hai',
            '9925 se lagbhag 4962 ms hoga; SQL aadha, toh total bhi aadha hai',
            '9925 se 15 ms hoga; SQL tez hote hi pool ka poora wait hat jaayega',
            '9925 se 9900 ms hoga; SQL tez hote hi app ka waqt bhi mit jaayega',
          ],
          answer: 0,
          explain: 'Diye hue spans mein total 5 + 9900 + 20 = 9925 ms hai. Sirf SQL 20 se 10 ms karne par total 9915 ms hoga. Sawaal mein wait wahi maana hai; production mein holders ki queries tez karne se pool ki queue bhi ghat sakti hai. Pehle trace se connections pakadne ki wajah jaancho.',
          choiceExplanations: [
            'Diye hue spans mein total 5 + 9900 + 20 = 9925 ms hai. Sirf SQL 20 se 10 ms karne par total 9915 ms hoga. Sawaal mein wait wahi maana hai; production mein holders ki queries tez karne se pool ki queue bhi ghat sakti hai. Pehle trace se connections pakadne ki wajah jaancho.',
            'SQL aadha karne se sirf 10 ms bachte hain. Baaki 9900 ms acquire wait aur 5 ms app ka kaam sawaal mein badalte nahi.',
            'Query tez hone se diye trace ka pool wait apne aap zero nahi hota. Connections kaun pakad raha hai aur kyun, alag jaanch chahiye.',
            'SQL abhi 10 ms aur app abhi 5 ms leti hai. Dono ko 9900 ms ke pool wait mein jodna padta hai.',
          ],
        },
        {
          q: 'Pool bhar gaya aur requests connection ke liye ruk rahi hain. Kaunsi wajah ki list jaanchne laayak hai?',
          choices: [
            'Lambe holds, chhoote releases aur aati demand ko pool ke saath milao',
            'Sirf RAM ki kami dhoondho; khaali RAM ho toh pool apne aap sambhal lega',
            'Sirf SQL ki likhaavat dekho; valid query connection ko rok nahi sakti',
            'Sirf kam CPU dekho; CPU khaali ho toh pool ki line asli masla nahi hai',
          ],
          answer: 0,
          explain: 'Pool mein connections ki hadd hai. Lambi transactions, slow queries, connection wapas na dena, bahar ki call ka intezaar ya zyada demand pool bhar sakte hain. Hold ka waqt, active/idle connections aur aati requests ko trace se milao; sab wajah ka ilaaj ek jaisa nahi.',
          choiceExplanations: [
            'Pool mein connections ki hadd hai. Lambi transactions, slow queries, connection wapas na dena, bahar ki call ka intezaar ya zyada demand pool bhar sakte hain. Hold ka waqt, active/idle connections aur aati requests ko trace se milao; sab wajah ka ilaaj ek jaisa nahi.',
            'Pool ki hadd RAM khaali hone par bhi pahunch sakti hai. Connections der tak busy ya leak hon toh agla caller line mein rukega.',
            'Sahi SQL bhi dheema chal sakta hai, lock par ruk sakta hai ya transaction mein connection pakad sakta hai. Syntax valid hona jaldi release ka saboot nahi.',
            'CPU khaali reh sakta hai jab callers connection ya bahar ke kaam ka intezaar karein. Kam CPU pool wait ko khaarij nahi karta.',
          ],
        },
        {
          q: 'Checkout pool.acquire par atka hai. /health ka handler bas HTTP 200 bhejta hai. /health ki safalta kya bataati hai?',
          choices: [
            'Process probe ka jawab de raha hai; checkout ke DB path ka saboot abhi nahi',
            'Process ne checkout ki query poori kar li hai; pool wait ka number purana hai',
            'Process ko DB connection mil gaya hai; bas checkout ka timeout chhota pada hai',
            'Process ki sab dependencies theek hain; checkout ka fail hona client ki galti hai',
          ],
          answer: 0,
          explain: '/health handler ne pool ya DB ka kaam kiya hi nahi. HTTP 200 se bas handler ke jawab dene ka saboot milta hai; customer request poori hone ka nahi. Probe mein kya jaanchte ho, saaf rakho. Dependency jaanchne wala probe bhi apne path jitna hi saboot deta hai.',
          choiceExplanations: [
            '/health handler ne pool ya DB ka kaam kiya hi nahi. HTTP 200 se bas handler ke jawab dene ka saboot milta hai; customer request poori hone ka nahi. Probe mein kya jaanchte ho, saaf rakho. Dependency jaanchne wala probe bhi apne path jitna hi saboot deta hai.',
            '/health ne checkout ki query chalaayi hi nahi. Probe ka jawab aana acquire wait purana hone ka saboot nahi.',
            'Probe DB connection leta hi nahi. HTTP 200 se connection milne ya checkout ka timeout galat hone ka nateeja nahi nikalta.',
            'Chhota health handler saari dependencies nahi parakhta. Client ki galti kehne se pehle checkout ke blocked path ki jaanch karo.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Saturation',
    instructions: 'Yeh sawaal 130+ mock interviews mein sabse zyada logon ko fansaata hai. 🎤',
    questions: [
      {
        q: 'Requests timeout ho rahi hain. CPU 10%, memory theek, /health green hai. Agla kadam kya hai?',
        choices: [
          'Ek request trace karo; pool aur dependencies par intezaar ka waqt dhoondho',
          'CPU khaali hai, toh timeout ko galat alert maano aur trace ki jaanch chhod do',
          'Health green hai, toh user ki timeout report ko client ka masla maan lo',
          'App ka CPU badha do, taaki connection par ruki requests ko zyada compute mile',
        ],
        answer: 0,
        explain: 'Kam CPU aur green probe poori request ka haal nahi bataate. Ek request ka trace dekho: pool, lock, DB, network ya dependency par waqt lag sakta hai. Pool exhaustion ek mumkin wajah hai, pehle se tay diagnosis nahi. Holders aur waits ke saboot ke baad fix chuno.',
        choiceExplanations: [
          'Kam CPU aur green probe poori request ka haal nahi bataate. Ek request ka trace dekho: pool, lock, DB, network ya dependency par waqt lag sakta hai. Pool exhaustion ek mumkin wajah hai, pehle se tay diagnosis nahi. Holders aur waits ke saboot ke baad fix chuno.',
          'Pool, lock ya network par intezaar karte hue bhi timeout ho sakta hai. Kam CPU timeout report ko galat nahi banaata.',
          'Probe failing resource ko chhod sakta hai. /health green hone se checkout ya doosra user path sahi hona pakka nahi.',
          'CPU badhaane se leak hua ya lambi transaction mein pakda connection seedha chhoot nahi jaata. Pehle intezaar ki wajah dhoondho.',
        ],
      },
      {
        terminal: {
          goal: "Interviewer: load, trace aur metrics se saabit karo ki atkaav pool ke intezaar mein hai. Akela CPU nahi batata ki system bhar gaya.",
          sys: SD.sys.orders({ db: { longTxHolding: 46 } }),
          tasks: T_IV_POOL,
          success: SD.allTasks(T_IV_POOL),
          successText: 'Zabardast. Load se problem paida ki, trace se jagah dhoondhi, metrics se prove kiya ki CPU nahi — <b>pool wait</b> hai.',
          solution: [
            "load --rps 400 --duration 6",
            "trace GET /api/v1/orders",
            "metrics",
          ],
          verify: s => { const m = SD.mission; return m.current(s, 'metrics', r => r.poolWaitHigh); },
          hints: [
            'Pehle `load` se traffic daalo — bina bhaar ke pool ki kami dikhti hi nahi.',
            '`trace GET /api/v1/orders` batayega waqt kahan gaya. Phir `metrics` mein CPU aur pool wait alag padho: CPU khaali aur pool wait bada matlab connections kam pad rahe hain.',
            'Poora raasta — har command alag Enter se chalao:\nload --rps 400 --duration 6\ntrace GET /api/v1/orders\nmetrics',
          ],
        },
      },
      {
        q: 'Pool size 50 se 500 karne ka sujhaav hai. Faisle se pehle kya karoge?',
        choices: [
          'DB ki hadd aur holds pehle naapo, phir pool badalne ka asar parakho',
          'Pool das guna kar do; utni hi query par throughput bhi das guna milega',
          'Pool das guna kar do; idle connections DB ki memory ka kharch nahi lete',
          'DB ka max_connections dekho; wahi har app ke pool ka sahi size hoga',
        ],
        answer: 0,
        explain: 'Pehle connections der tak pakadne ki wajah aur aati demand dekho. Query, transaction ya leak ka ilaaj karke pool tune karo. Saare app replicas ka mila DB connection budget gino; memory, CPU, I/O aur locks ki hadd bachi rehti hai. Acquire ka bounded wait aur request ki deadline rakho.',
        choiceExplanations: [
          'Pehle connections der tak pakadne ki wajah aur aati demand dekho. Query, transaction ya leak ka ilaaj karke pool tune karo. Saare app replicas ka mila DB connection budget gino; memory, CPU, I/O aur locks ki hadd bachi rehti hai. Acquire ka bounded wait aur request ki deadline rakho.',
          'Badi pool se DB ke CPU, disk ya locks das guna nahi ho jaate. Extra concurrency se contention aur latency badh bhi sakti hai.',
          'Idle backend connections bhi resources lete hain. Kitni memory lagegi, DB aur configuration par nirbhar hai; cost zero mat maano.',
          'max_connections ek allowed ceiling hai, performance ka optimum nahi. Kai app pools ka mila load bhi DB ke budget mein aana chahiye.',
        ],
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
    { front: 'Utilization vs Saturation?', back: '<b>Utilization</b> = "kitna use ho raha hai" (CPU 10%). <b>Saturation</b> = "kitna intezaar ho raha hai" (pool wait 9.9s). <b>Bahut se outage saturation (intezaar) se aate hain — CPU kam dikhe tab bhi.</b>' },
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
     <p>Cache tab sabse zyada kaam aata hai jab teeno sach hon:</p>
     <pre>1. MEHENGA hai        (query, computation, ya remote call)
2. BAAR-BAAR maanga jaata hai
3. KAM badalta hai</pre>
     <p>Sirf "slow hai" kaafi wajah nahi. Agar cheez har request par badalti
     hai toh cache sirf ek extra hop hai jo hamesha miss karega. (Badalne wala data bhi
     version ya invalidation ke saath cache ho sakta hai — agar padha zyada jaaye, badla kam.)</p>
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
  ✅ cache aksar fresh — par DB write aur cache.set ke beech crash ya race ho toh dono alag ho sakte hain
  ⚠️ har write dheema; aur jo kabhi padha hi nahi jaata woh bhi cache mein

WRITE-BEHIND
  cache.set(k, v); queue.push(k)   # DB baad mein
  ✅ write bahut tez
  💀 crash par DATA GAYA — sirf tab jab data kho sakta ho (view counts)</pre>
     <h3>🔑 Invalidation — do hi tareeke</h3>
     <pre>1. TTL              aasan · par thodi der stale
2. Explicit delete  fresh · par HAR write path yaad rakhna padega
                    (aur ek bhool = stale data, jab tak TTL ya agla write na hataaye)</pre>
     <p>Practical jawab: <b>dono</b>. Explicit delete karo, aur chhota TTL
     safety net ki tarah rakho — taaki ek bhool bhi 5 minute mein theek ho
     jaaye, ghanton tak na rahe.</p>
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
      goal: "Dheemi list query ka GET aur 500 rps ka load pehle naapo. Phir cache lagao (TTL 60s, jitter 15%, hit-rate 1) aur wahi load dobara chala ke dikhao ki system sambhal gaya.",
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_CACHE,
      success: SD.allTasks(T_CACHE),
      successText: "Pehli request ne cache bhara, doosri HIT hui. Hit-rate 1 maan ke 500 rps ka load bina bhare aur bina errors ke chala. Asli hit rate alag se naapna hoga. TTL expire hona aur cache ka gir jaana bhi capacity plan ka hissa hain.",
      solution: [
        "GET /api/v1/transactions?page=1&limit=50",
        "load --rps 500 --duration 5",
        "sim add cache --ttl 60 --jitter 15 --hit-rate 1",
        "GET /api/v1/transactions?page=1&limit=50",
        "GET /api/v1/transactions?page=1&limit=50",
        "load --rps 500 --duration 5"
      ],
      verify: s => { const m = SD.mission; return s.sys.api.cache?.ttlSec === 60 && s.sys.api.cache.jitterPct === 15 && s.sys.api.cache.hitRate === 1 && m.current(s, 'load', r => r.rps === 500 && !r.saturated && r.errPct === 0); },
      hints: [
        "Pehle list GET aur 500 rps ka load bina cache naapo. Cache lagne ke baad pehla GET cache bharega (MISS); wahi GET dobara HIT dega.",
        "`sim add cache --ttl <s> --jitter <pct> --hit-rate <0-1>` lagao. Wahi URL do baar maango, phir `load --rps <rate> --duration <s>` dobara chalao — system na bhare aur errors zero rahein.",
        "Poora raasta — har command alag Enter se chalao:\nGET /api/v1/transactions?page=1&limit=50\nload --rps 500 --duration 5\nsim add cache --ttl 60 --jitter 15 --hit-rate 1\nGET /api/v1/transactions?page=1&limit=50\nGET /api/v1/transactions?page=1&limit=50\nload --rps 500 --duration 5",
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
          q: 'Query mehengi hai. Cache ka kharch sahi padega ya nahi, kaise jaanchoge?',
          choices: [
            'Dobara padhne ka mauka, data kitna taaza chahiye aur cache ka kharch milao',
            'Query mehengi hai, toh result cache karo; dobara padhne ki ginti baad mein dekho',
            'Data private hai, toh cache chhod do; user ki alag key se bhi kaam nahi banega',
            'Result chhota hai, toh hit rate achha maano; kitni alag keys hain, chhod do',
          ],
          answer: 0,
          explain: 'Cache tab faayda deta hai jab saved reads ka faayda jagah, misses aur data taaza rakhne ke kharch se badhe. Baar-baar badalta data bhi invalidation ya version ke saath cache ho sakta hai, agar kaafi reuse ho. Cache khaali ya down ho toh DB kitna load seh paayega, bhi parakho.',
          choiceExplanations: [
            'Cache tab faayda deta hai jab saved reads ka faayda jagah, misses aur data taaza rakhne ke kharch se badhe. Baar-baar badalta data bhi invalidation ya version ke saath cache ho sakta hai, agar kaafi reuse ho. Cache khaali ya down ho toh DB kitna load seh paayega, bhi parakho.',
            'Mehenga result ek hi baar padha jaaye toh cache miss aur bharne ka extra kaam hi de sakta hai. Reuse ka saboot bhi chahiye.',
            'Private data user ke hisaab se alag key aur sahi access checks ke saath cache ho sakta hai. Users ke results mila dena khatra hai.',
            'Chhota result hona reuse ka saboot nahi. Bahut alag keys aur kam repeat reads se hit rate kam reh sakta hai.',
          ],
        },
        {
          q: 'Writes par cache entry delete karne ka niyam hai. Kaunsi chook se purana data reh sakta hai?',
          choices: [
            'Ek write path entry saaf karna bhool jaaye, toh cache purana result de sakta hai',
            'Har delete poora cache scan kare, toh ek key ki safai se baaki writes ruk jaati hain',
            'Redis ke alawa cache rakha ho, toh entry delete karne ka niyam chal nahi sakta',
            'Ek write chhoot jaaye, toh TTL hone par bhi entry kabhi badal nahi sakti hai',
          ],
          answer: 0,
          explain: 'Har write path sahi cache keys saaf kare, zaroori hai. Missing path ya purana result baad mein refill hone ki race se stale data reh sakta hai. TTL, jagah ke liye cache se entry hatna ya baad ki invalidation purana result hata sakte hain; ek chook ka matlab sadaa stale hona nahi. Layers, ordering aur recovery bhi parakho.',
          choiceExplanations: [
            'Har write path sahi cache keys saaf kare, zaroori hai. Missing path ya purana result baad mein refill hone ki race se stale data reh sakta hai. TTL, jagah ke liye cache se entry hatna ya baad ki invalidation purana result hata sakte hain; ek chook ka matlab sadaa stale hona nahi. Layers, ordering aur recovery bhi parakho.',
            'Sahi key maloom ho toh targeted delete ya version badalne se kaam ho sakta hai. Har invalidation ko poora cache scan karna zaroori nahi.',
            'Application ki memory, Redis aur doosre caches mein bhi entries hataayi ya badli ja sakti hain. Invalidation sirf Redis ka feature nahi.',
            'TTL, jagah ke liye entry hatna ya baad ki invalidation purana result hata sakte hain. Freshness par refill race aur source ki deri ka asar phir bhi ho sakta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Caching',
    instructions: '"Cache lagao" bolna aasan hai; tradeoffs batana asli jawab hai. 🎤',
    questions: [
      {
        q: 'Endpoint dheema hai. Team cache lagaana chahti hai. Pehle kaunse sawaal poochhoge?',
        choices: [
          'Kitna purana data chalega, keys kitni hain, cache khaali ho toh DB seh lega?',
          'Redis mil raha hai kya? Milta ho toh cache ka faayda pakka maan kar aage badho',
          'CDN laga sakte hain kya? Har login user ka result bas URL par cache kar do',
          'Query tune hui hai kya? Ho gayi ho toh cache ke faayde ki jaanch chhod do',
        ],
        answer: 0,
        explain: 'Data kitna purana chal sakta hai, domain ka niyam tay karega. Keys aur repeat reads se hit rate ka andaaza milega. Cache khaali ho toh DB par aane wala load alag parakho. Private results ki keys aur permissions bhi jaancho. Dheema endpoint hona akela cache chunne ki wajah nahi.',
        choiceExplanations: [
          'Data kitna purana chal sakta hai, domain ka niyam tay karega. Keys aur repeat reads se hit rate ka andaaza milega. Cache khaali ho toh DB par aane wala load alag parakho. Private results ki keys aur permissions bhi jaancho. Dheema endpoint hona akela cache chunne ki wajah nahi.',
          'Redis milne se freshness aur reuse ki zaroorat tay nahi hoti. Engine chunne se pehle data aur workload ke sawaal poochho.',
          'Sirf URL par alag users ke results milaane se data leak ho sakta hai. Shared cache ke liye explicit safe policy aur user isolation chahiye.',
          'Tez query ko bhi bahut baar maanga jaaye toh caching ka faayda ho sakta hai. Query tuning aur caching ki keemat alag naap kar chuno.',
        ],
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
    { front: 'Layer kaise chunein?', back: '<b>Data ke maalik se</b>, speed se nahi. Public+immutable → CDN. Per-user → app cache. Computed aggregate → materialized view. <b>Personalized shared reuse ko explicit policy aur authorization-aware key isolation chahiye.</b>' },
    { front: '3 cache patterns?', back: "<b>Cache-aside:</b> miss par DB; invalidation race/TTL policy chahiye. <b>Write-through:</b> cache+store write path, atomicity/failure policy explicit. <b>Write-behind:</b> async persistence; acknowledged durability queue/log/recovery contract par depend hai." },
    { front: 'Invalidation?', back: 'Do tareeke: <b>TTL</b> (aasan, apne aap theek) aur <b>explicit delete</b> (fresh, par ek bhool = stale, jab tak TTL ya agla write na hataaye). Practical: <b>dono</b> — delete + chhota TTL safety net.' },
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
      goal: 'TTL expire hone par load naapo: pehle bina jitter, phir 20% jitter ke saath. Phir cache band karke dekho ki 500 rps par DB kitna sambhalta hai.',
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_STAMPEDE,
      success: SD.allTasks(T_STAMPEDE),
      successText: `Bina jitter saari 100 keys ek hi pal expire hui aur ek saath MISS hui. ±20% jitter ne expiry alag-alag seconds mein baant di, aur jhatka chhota hua. Par ek hi garam key ki bheed jitter nahi rokta — garam key ke liye single-flight chahiye. Cache band hone par DB ki hadd bhi dikh gayi.`,
      solution: [
        "sim add cache --ttl 10 --hit-rate 1",
        "load --rps 500 --duration 12",
        "sim add cache --ttl 10 --jitter 20 --hit-rate 1",
        "load --rps 500 --duration 12",
        "sim set api.cache null",
        "load --rps 500 --duration 5"
      ],
      verify: s => { const m = SD.mission; return s.sys.api.cache === null && m.current(s, 'load', r => r.rps === 500); },
      hints: [
        "10s TTL wale cache ke saath 12s ka load chalao. Bina jitter saari keys ek saath expire hongi, aur output mein DB par jhatka dikhega.",
        "`sim add cache --ttl <s> --jitter <pct> --hit-rate 1` ke saath wahi 12s load dobara chalao. Jitter alag-alag keys ki expiry phailaata hai; ek garam key ke liye single-flight chahiye. Aakhir mein `sim set api.cache null` karke cache girne par load dekho.",
        "Poora raasta — har command alag Enter se chalao:\nsim add cache --ttl 10 --hit-rate 1\nload --rps 500 --duration 12\nsim add cache --ttl 10 --jitter 20 --hit-rate 1\nload --rps 500 --duration 12\nsim set api.cache null\nload --rps 500 --duration 5",
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
          q: 'Ek popular key cache mein nahi mili. Bahut requests ek saath aayi. Stampede kab banega?',
          choices: [
            'Har request bhaari DB query alag chalayegi, bina refresh ko aapas mein jode',
            'Har request cache ki alag key maangegi, aur DB ka kul kaam pehle jitna hi rahega',
            'Har request ek hi refresh ka nateeja legi, aur DB par ek hi query chalti rahegi',
            'Har request ko purana jawab milta rahega, aur peeche ek refresh chalta rahega',
          ],
          answer: 0,
          explain: 'Stampede mein kai requests ek hi key ka wahi bhaari kaam saath dobara karti hain. Expiry, cold start, invalidation ya traffic ka uchhaal wajah ho sakta hai. Jitter alag keys ki expiry bikherta hai; single-flight ek key ke refresh ko jodta hai.',
          choiceExplanations: [
            'Stampede mein kai requests ek hi key ka wahi bhaari kaam saath dobara karti hain. Expiry, cold start, invalidation ya traffic ka uchhaal wajah ho sakta hai. Jitter alag keys ki expiry bikherta hai; single-flight ek key ke refresh ko jodta hai.',
            'Alag keys bhi DB par bojh daal sakti hain, par diye hue case mein khatra ek hi key ka kaam baar-baar karna hai.',
            'Ek refresh ka nateeja baantna single-flight hai; same-key stampede ko rokne ka tareeka hai.',
            'Purana jawab dete hue peeche ek refresh chalana repeated DB queries ko rok sakta hai; freshness ka alag sauda hai.',
          ],
        },
        {
          q: 'Cache band hote hi saari requests DB par jaati hain aur DB load nahi jhel paata. Design ka matlab?',
          choices: [
            'Cache par capacity tiki hai; cache band hone aur cold start ka plan chahiye',
            'Cache hit rate achha hai; cache band ho toh DB ko wahi normal miss load milta rahega',
            'Cache ki doosri copy hai; cache ke bina DB ka load naapna recovery ke liye kaafi hai',
            'Cache dobara aayega; tab tak saare miss DB par bhejna recovery ka sabse sasta raasta',
          ],
          answer: 0,
          explain: 'Cache ne DB ka aam load ghata rakha hai. Cache na ho toh DB ki capacity paar ho sakti hai. DB tak jaane wale kaam ki hadd, dheere warm-up, fallback aur failure tests chahiye. Cache ki kai copies availability badha sakti hain; dependency hona akela single point of failure ka saboot nahi.',
          choiceExplanations: [
            'Cache ne DB ka aam load ghata rakha hai. Cache na ho toh DB ki capacity paar ho sakti hai. DB tak jaane wale kaam ki hadd, dheere warm-up, fallback aur failure tests chahiye. Cache ki kai copies availability badha sakti hain; dependency hona akela single point of failure ka saboot nahi.',
            'Cache band ho toh pehle ke hits bhi DB tak jaa sakte hain; normal miss rate se kaafi zyada load aayega.',
            'Doosri copy madad karti hai, par recovery mein kaam ki hadd aur cold-start handling bhi chahiye.',
            'Saare miss bhejne se DB bhar sakta hai; recovery ke waqt fallback load baandhna zaroori hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Stampede',
    instructions: 'Yeh sawaal caching ke baad ka natural follow-up hai. 🎤',
    questions: [
      {
        q: 'Redis restart ke baad API timeouts aur DB load badha. Recovery plan mein kya jodoge?',
        choices: [
          'Cache ke bina DB ka load naapo, fallback baandho aur cache dheere-dheere bharo',
          'Redis ki copies badhao, phir failover ke waqt har miss ko seedha DB tak bhejo',
          'Miss par retry badhao, taaki DB cache ko zyada parallel requests se jaldi bhar de',
          'Cache ko ek saath poora bharo, taaki warm-up ke dauraan traffic bhi tez aata rahe',
        ],
        answer: 0,
        explain: 'Pehle trace aur hit/miss metrics se cold cache ka asar confirm karo. Cache ke bina DB ka load naapo; fallback concurrency aur admission ki hadd rakho. Cache dheere bharo aur failover test karo. Redis ki replicas failure ka chance ghata sakti hain, par cold start ya shared failure ki tayyari phir bhi chahiye.',
        choiceExplanations: [
          'Pehle trace aur hit/miss metrics se cold cache ka asar confirm karo. Cache ke bina DB ka load naapo; fallback concurrency aur admission ki hadd rakho. Cache dheere bharo aur failover test karo. Redis ki replicas failure ka chance ghata sakti hain, par cold start ya shared failure ki tayyari phir bhi chahiye.',
          'Copies availability mein madad karti hain, par sab miss DB par bhejna capacity ki hadd paar kar sakta hai.',
          'Retry extra DB kaam badha sakta hai; bounded refresh aur request admission zyada seedha bachav hain.',
          'Ek saath warm-up live traffic se resources ke liye lad sakta hai; batch aur rate dono baandho.',
        ],
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
          q: 'Purane records active DB se archive mein le jaane se query performance ko kya faayda ho sakta hai?',
          choices: [
            'Active indexes aur working set chhote ho sakte hain, query pattern fit ho toh',
            'Archive se har query tez hogi, chahe query active data ko chhooti bhi na ho',
            'Archive ki copy alag rakhne se total bytes ghatenge, retention badle bina bhi',
            'Archive mein data bhejne se access aur deletion policies rakhna band kar sakte ho',
          ],
          answer: 0,
          explain: 'Active rows aur indexes kam hone se working set memory mein behtar fit ho sakta hai. Faayda query pattern aur engine par depend karta hai. Archive mein data ab bhi store hota hai; total storage, retention, restore aur access ka plan alag chahiye. Har query tez hone ki guarantee nahi.',
          choiceExplanations: [
            'Active rows aur indexes kam hone se working set memory mein behtar fit ho sakta hai. Faayda query pattern aur engine par depend karta hai. Archive mein data ab bhi store hota hai; total storage, retention, restore aur access ka plan alag chahiye. Har query tez hone ki guarantee nahi.',
            'Archive se unrelated query ya kisi aur bottleneck wali query ko faayda zaroor mile, aisa nahi.',
            'Data ki archive copy bhi jagah leti hai; total bytes policy, compression aur duplicates par depend karte hain.',
            'Archive par bhi access aur deletion ki policies lagti hain; location badalna obligations nahi hataata.',
          ],
        },
        {
          q: 'Har access pattern ke liye alag database lene se kaunsi nayi keemat judti hai?',
          choices: [
            'Har engine ke backup, recovery, upgrades aur monitoring ka alag kaam judta hai',
            'Sirf storage bill badhta hai; recovery ka flow saare engines mein ek reh sakta hai',
            'Sirf network hops badhte hain; backups aur upgrades purane plan se chal sakte hain',
            'Sirf query syntax badalti hai; on-call ko naye failure modes seekhne nahi padenge',
          ],
          answer: 0,
          explain: 'Har naya store backup, recovery, monitoring, upgrades aur team ki expertise maangta hai. Specialized engine useful ho sakta hai, par access-pattern ka faayda operational keemat ke saath parkho. Ek engine jaanna kai engines sambhaalne ki guarantee nahi; chhoti team bhi planning se kai stores chala sakti hai.',
          choiceExplanations: [
            'Har naya store backup, recovery, monitoring, upgrades aur team ki expertise maangta hai. Specialized engine useful ho sakta hai, par access-pattern ka faayda operational keemat ke saath parkho. Ek engine jaanna kai engines sambhaalne ki guarantee nahi; chhoti team bhi planning se kai stores chala sakti hai.',
            'Storage bill ke alawa restore aur failure behavior bhi badal sakta hai; recovery plan test karo.',
            'Naye engine ki backup, version aur upgrade shartein alag ho sakti hain; purana plan akela kaafi nahi.',
            'Query language ke saath failure modes aur on-call diagnosis bhi badalte hain.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Storage Choice',
    instructions: 'Yahan "depends" sahi jawab hai — bas batao kis par. 🎤',
    questions: [
      {
        q: 'Naye product ke liye SQL ya NoSQL ka faisla kaise shuru karoge?',
        choices: [
          'Reads, writes, rishte aur correctness ke niyam se suitable data stores chuno',
          'NoSQL pehle chuno, phir hot keys aur partitioning ko scale badhne par sambhaalo',
          'SQL pehle chuno, phir app ke correctness rules ko database ke bharose chhod do',
          'Dono pehle jodo, phir data sync aur operations ka budget traffic aane par gino',
        ],
        answer: 0,
        explain: 'Pehle access pattern, data ke rishte, transactions aur correctness ke niyam samjho. Phir scale, operations aur recovery ke saath stores compare karo. NoSQL naam linear scaling ki guarantee nahi; SQL naam app ko apne aap correct nahi banata. Postgres JSONB jaise features kuch document workloads bhi sambhaal sakte hain.',
        choiceExplanations: [
          'Pehle access pattern, data ke rishte, transactions aur correctness ke niyam samjho. Phir scale, operations aur recovery ke saath stores compare karo. NoSQL naam linear scaling ki guarantee nahi; SQL naam app ko apne aap correct nahi banata. Postgres JSONB jaise features kuch document workloads bhi sambhaal sakte hain.',
          'NoSQL mein bhi hot keys, partitioning aur consistency scale ko limit kar sakte hain; workload pehle chahiye.',
          'DB constraints madad karti hain, par app ke workflow aur permissions bhi sahi design karne padte hain.',
          'Bina zaroorat dono stores jodne se sync aur recovery ka extra kaam aata hai.',
        ],
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
     <pre>• Cross-shard JOIN — mehnga ya engine par nirbhar; aksar app mein merge karna padta hai.
• Cross-shard transaction — mehngi (2PC) ya engine par nirbhar; aksar saga likhni padti hai.
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
        { text: 'PHIR shard karo', explain: "Aakhri option. Migration effort workload/team par depend hai; ownership, routing aur failure recovery ko explicit plan chahiye — cross-shard JOIN, transactions aur global counts ko engine-specific support, coordination aur extra cost chahiye." },
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
          q: 'Single-primary DB mein read replicas jodne se write capacity par kya asar ho sakta hai?',
          choices: [
            'Read offload se headroom mil sakta hai; writes phir bhi primary par hain',
            'Har replica naya write leader banta hai; writes ka kaam primaries mein bantta hai',
            'Do replicas se write limit teen guna hoti hai; storage ka kaam seedha bantta hai',
            'Ek row ka lock replicas baantte hain; same-row writes parallel ho sakti hain',
          ],
          answer: 0,
          explain: 'Single-primary setup mein writes primary par hi commit hote hain. Reads replicas par bhejne se primary ke resources khaali ho sakte hain aur indirectly writes ko headroom mil sakta hai. Replicas write execution ko seedha shard nahi karti; count badhne se linear write scaling nahi milti.',
          choiceExplanations: [
            'Single-primary setup mein writes primary par hi commit hote hain. Reads replicas par bhejne se primary ke resources khaali ho sakte hain aur indirectly writes ko headroom mil sakta hai. Replicas write execution ko seedha shard nahi karti; count badhne se linear write scaling nahi milti.',
            'Read replica normal write leader nahi banti; single-primary ka write owner wahi primary hai.',
            'Replica count primary ki write capacity ka multiplier nahi; actual resource bottleneck naapo.',
            'Primary ki hot row ka serialization replicas se nahi hat-ta; write pattern alag badalna hoga.',
          ],
        },
        {
          q: 'Galat shard key baad mein badalni pade toh sabse badi keemat kya ho sakti hai?',
          choices: [
            'Live data move karke routing aur writers ka taal-mel rakhna pad sakta hai',
            'Sirf metadata badal kar purane data ko waise hi padhte rehna pad sakta hai',
            'Sirf rows ki ginti barabar karke request load barabar maana ja sakta hai',
            'Sirf disk size badal kar cross-shard query ka extra kharcha hat sakta hai',
          ],
          answer: 0,
          explain: 'Shard key routing aur data placement tay karti hai. Key badalne par live records move karne, writers coordinate karne aur compatibility rakhne ka kaam aa sakta hai. Migration ki mushkil topology aur tools par depend karti hai; har change mahino ka ya irreversible nahi. Barabar row count barabar request load ki guarantee nahi.',
          choiceExplanations: [
            'Shard key routing aur data placement tay karti hai. Key badalne par live records move karne, writers coordinate karne aur compatibility rakhne ka kaam aa sakta hai. Migration ki mushkil topology aur tools par depend karti hai; har change mahino ka ya irreversible nahi. Barabar row count barabar request load ki guarantee nahi.',
            'Agar nayi key ownership badalti hai toh sirf metadata kaafi nahi; old/new routes ko data milna chahiye.',
            'Hot tenants aur keys ke kaaran same row count par traffic bahut alag ho sakta hai.',
            'Disk badhane se routing, cross-shard joins aur transaction coordination ka kaam nahi mitta.',
          ],
        },
        {
          q: 'Write ke turant baad user ko naya data padhana hai. Async replicas ke saath kaunsa guard chahiye?',
          choices: [
            'Primary se padho, ya replica par committed write position apply hone tak ruko',
            'Do second ruk kar kisi replica se padho; fixed wait ko freshness ka proof maano',
            'Cache jod kar wahi key padho; cache ki copy ko naya commit maana jaaye',
            'Kisi replica se turant padho; primary commit ko replica apply ka proof maano',
          ],
          answer: 0,
          explain: 'Primary read ya committed write ki replication position tak catch-up ka check read-after-write mein madad karta hai. Fixed sticky-read window practical heuristic hai, guarantee nahi: lag window se badh sakta hai. Session/consistency token se required position ko serving replica tak pahunchao aur wait ki deadline/fallback tay karo.',
          choiceExplanations: [
            'Primary read ya committed write ki replication position tak catch-up ka check read-after-write mein madad karta hai. Fixed sticky-read window practical heuristic hai, guarantee nahi: lag window se badh sakta hai. Session/consistency token se required position ko serving replica tak pahunchao aur wait ki deadline/fallback tay karo.',
            'Async lag do second se zyada ho sakta hai; fixed wait write apply hone ka saboot nahi.',
            'Cache bhi stale ho sakta hai; nayi value ya version ka reliable update chahiye.',
            'Primary commit aur async replica par apply alag events hain; immediate read purana ho sakta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Scaling Data',
    instructions: 'Yahan jaldi sharding bol dena sabse aam galti hai. 🎤',
    questions: [
      {
        q: 'DB load nahi jhel raha. Sharding chunne se pehle kya karoge?',
        choices: [
          'Reads, writes aur hot queries naapo; bottleneck se candidates parkho',
          'Pehle shards badhao; query plans aur N+1 ko distribution ke baad parkho',
          'Pehle read replicas badhao; hot-row writes ki hadd ko same plan se parkho',
          'Pehle machine badi karo; capacity ki bachi hadd ko traffic badhne par parkho',
        ],
        answer: 0,
        explain: 'Trace aur plans se bottleneck dhoondho: query ka kaam, indexes, N+1, read pressure, write pressure ya hot keys? Phir cache, replicas, hardware aur sharding ke saude compare karo. Sharding routing aur operations ko mehenga karti hai; cross-shard joins aur transactions kuch systems support karte hain, par coordination ki keemat badh sakti hai.',
        choiceExplanations: [
          'Trace aur plans se bottleneck dhoondho: query ka kaam, indexes, N+1, read pressure, write pressure ya hot keys? Phir cache, replicas, hardware aur sharding ke saude compare karo. Sharding routing aur operations ko mehenga karti hai; cross-shard joins aur transactions kuch systems support karte hain, par coordination ki keemat badh sakti hai.',
          'Inefficient query ya N+1 shards par bhi reh sakti hai; scatter-gather extra kaam jod sakta hai.',
          'Replicas reads offload kar sakti hain; same primary ki hot writes ka bottleneck reh sakta hai.',
          'Badi machine useful ho sakti hai, par finite headroom aur cost bina naape chunna diagnosis nahi.',
        ],
      },
      {
        q: 'Profile save safal tha, par next GET mein purana naam mila. Pehla useful check?',
        choices: [
          'Write commit aur GET ki serving replica/cache trace karo, freshness parkho',
          'Write ka 200 dekhkar DB freshness maan lo, phir client ko root cause likh do',
          'Write ka commit dekhkar har replica current maano, phir frontend rollback karo',
          'Write ka naya naam log mein dekho, phir bina read trace cache saaf karte raho',
        ],
        answer: 0,
        explain: 'Pehle primary commit aur GET ka actual source confirm karo. Async replica ne write abhi apply na kiya ho toh stale read mil sakta hai; cache/client state bhi possible hai. Primary read ya required replication position se compare karo. Sirf save success ka matlab har serving copy updated nahi.',
        choiceExplanations: [
          'Pehle primary commit aur GET ka actual source confirm karo. Async replica ne write abhi apply na kiya ho toh stale read mil sakta hai; cache/client state bhi possible hai. Primary read ya required replication position se compare karo. Sirf save success ka matlab har serving copy updated nahi.',
          'Write success read path ki freshness nahi batata; client ko blame karne se pehle trace chahiye.',
          'Async replicas commit ke baad bhi peeche ho sakti hain; frontend rollback bina saboot galat target ho sakta hai.',
          'Cache flush symptom badal sakta hai, par serving replica aur cache trace ke bina cause confirm nahi hoga.',
        ],
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
    { front: 'Replication vs Partitioning vs Sharding?', back: '<b>Replication</b> = read scale + HA (write scale ❌). <b>Partitioning</b> = ek server, chhote tukde (capacity ❌). <b>Sharding</b> = kai servers, write scale ✅ (cross-shard JOIN mehnga ya engine par nirbhar).' },
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
      success: SD.allTasks(T_BOSS_DATA),
      successText: "Dashboard theek karne ka kram: pehle scan naapo, transactions (user_id, created_at, id) index banao, countTotal=false karo, jitter wala cache lagao, aur 500 rps ka load dobara chala ke dikhao ki system sambhal gaya. Cache gir jaaye toh DB kitna sambhalega, alag se jaanchna hoga.",
      solution: [
        "GET /api/v1/transactions?user_id=5&page=1&limit=50",
        "CREATE INDEX ix_dash ON transactions(user_id, created_at, id)",
        "sim set api.countTotal false",
        "sim add cache --ttl 60 --jitter 20",
        "load --rps 500 --duration 5 --path '/api/v1/transactions?user_id=5&page=1&limit=50'",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.countTotal === false && s.sys.api.cache?.jitterPct > 0 && m.index(s, 'transactions', ['user_id', 'created_at', 'id']) && m.current(s, 'load', r => r.rps === 500 && !r.saturated); },
      hints: [
        'Pehle user-filter wali dashboard GET bhejo aur examined vs returned rows padho. Access pattern ka baseline sahi composite index chunne mein madad karega.',
        'Index mein pehle user filter, phir sort aur unique tie-breaker rakho: `CREATE INDEX <name> ON transactions(<columns>)`. Count hataakar jitter wala cache lagao; `load --path \'<same-path>\' --rps <rate>` se capacity jaancho.',
        'Poora raasta — har command alag Enter se chalao:\nGET /api/v1/transactions?user_id=5&page=1&limit=50\nCREATE INDEX ix_dash ON transactions(user_id, created_at, id)\nsim set api.countTotal false\nsim add cache --ttl 60 --jitter 20\nload --rps 500 --duration 5 --path \'/api/v1/transactions?user_id=5&page=1&limit=50\'',
      ],
    },
    {
      type: 'quiz',
      title: 'Track ka nichod',
      questions: [
        {
          q: 'Dashboard slow hai. Optimization ka pehla framework kya hoga?',
          choices: [
            'Bottleneck aur correctness naapo, kaam baandho, phir candidates ka sauda test karo',
            'Pehle cache lagao, phir data freshness aur cache-down ka DB load baad mein naapo',
            'Pehle shards badhao, phir plans aur request load ka actual bottleneck baad mein naapo',
            'Pehle CPU double karo, phir lock, I/O aur pool wait ka actual bottleneck baad mein naapo',
          ],
          answer: 0,
          explain: 'Pehle request ka waqt aur correctness contract samjho. Query/rows ka kaam baandho, phir indexes, cache, hardware aur topology ko SLO, cost aur failures par test karo. Cache useful optimization ya load-bearing dependency ho sakta hai; har design mein cache last ho, aisa universal rule nahi. Har change ke baad naapo.',
          choiceExplanations: [
            'Pehle request ka waqt aur correctness contract samjho. Query/rows ka kaam baandho, phir indexes, cache, hardware aur topology ko SLO, cost aur failures par test karo. Cache useful optimization ya load-bearing dependency ho sakta hai; har design mein cache last ho, aisa universal rule nahi. Har change ke baad naapo.',
            'Freshness aur cold-path capacity ke bina cache stale data ya outage ka risk badha sakta hai.',
            'Sharding routing aur operational keemat jodti hai; inefficient query ka actual work phir bhi reh sakta hai.',
            'CPU extra ho tab bhi lock wait, leak ya I/O bottleneck reh sakta hai; target measured resource hona chahiye.',
          ],
        },
        {
          q: 'Index se query 12 s se 380 ms ho gayi. Agla decision kaise loge?',
          choices: [
            '380 ms ko required percentile SLO se milaao; baaki query aur response work naapo',
            '380 ms ko kaafi maano; single sample ke baad user SLO ka comparison band karo',
            'Index lag chuka hai toh shard karo; remaining plan aur row count ko baad mein dekho',
            'Aur indexes jodo; existing plan aur write cost ka comparison deploy ke baad karo',
          ],
          answer: 0,
          explain: 'Boss ticket ka target p99 200 ms se neeche hai; 380 ms ka single sample p99 compliance saabit nahi karta. Load par percentiles aur remaining work naapo: scans, sorts, COUNT, heap fetches aur serialization. Covering index bhi zero heap reads guarantee nahi karta. Required behavior bachate hue improvement candidates test karo.',
          choiceExplanations: [
            'Boss ticket ka target p99 200 ms se neeche hai; 380 ms ka single sample p99 compliance saabit nahi karta. Load par percentiles aur remaining work naapo: scans, sorts, COUNT, heap fetches aur serialization. Covering index bhi zero heap reads guarantee nahi karta. Required behavior bachate hue improvement candidates test karo.',
            'Fast sample percentile SLO ka proof nahi; given ticket ka p99 target bhi check karna hai.',
            'Sharding se pehle remaining query work aur simpler changes parkho; existing index next architecture nahi chunta.',
            'Extra indexes writes aur storage ko mehenga karte hain; plan aur measured response benefit compare karo.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — Data Layer',
    instructions: 'Aakhri round.',
    questions: [
      {
        q: 'Dashboard query 12 s leti hai. Poora debugging approach kaunsa hai?',
        choices: [
          'Trace aur EXPLAIN se kaam dhoondho, focused change karo aur load par dobara naapo',
          'Sirf index banao, phir count, sort aur response serialization ko waise hi chhod do',
          'Sirf cache banao, phir misses aur cache-down par DB ki capacity ko waise hi chhod do',
          'Sirf replica jodo, phir expensive query ka algorithm aur row count waise hi chhod do',
        ],
        answer: 0,
        explain: 'Trace mein query ke saath pool wait aur response ka kaam dekho. EXPLAIN se scans, joins, sorts aur examined rows samjho. Access pattern se index/row limits/count ka sauda parkho; cache ki freshness aur cold-path capacity design karo. Har focused change ke baad response percentiles aur errors load par naapo. Cache ya replica useful ho sakte hain, par measured bottleneck target karo.',
        choiceExplanations: [
          'Trace mein query ke saath pool wait aur response ka kaam dekho. EXPLAIN se scans, joins, sorts aur examined rows samjho. Access pattern se index/row limits/count ka sauda parkho; cache ki freshness aur cold-path capacity design karo. Har focused change ke baad response percentiles aur errors load par naapo. Cache ya replica useful ho sakte hain, par measured bottleneck target karo.',
          'Index madad kar sakta hai, par COUNT, sorting, N+1 ya serialization ab bhi bottleneck ho sakte hain.',
          'Cache miss ya outage par backend ko safe load jhelna chahiye; cache akela cold path nahi theek karta.',
          'Replica read pressure alag kar sakti hai, par same query ka scan work khud nahi badalti.',
        ],
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
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'sim' && r.policy === 'lru' && r.keys === s.records.find(x => x.kind === 'cache' && x.op === 'sim' && x.policy === 'fifo')?.keys) },
  { text: 'Aur ab LFU ke saath',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'sim' && r.policy === 'lfu' && r.keys === s.records.find(x => x.kind === 'cache' && x.op === 'sim' && x.policy === 'fifo')?.keys) },
  { text: 'Dekho: is access pattern par LFU ka hit rate LRU se ZYADA hai',
    check: s => {
      const g = p => s.records.filter(r => r.kind === 'cache' && r.op === 'sim' && r.policy === p).pop();
      const lfu = g('lfu'), lru = g('lru');
      return !!(lfu && lru && lfu.keys === lru.keys && lfu.size === lru.size && lfu.hitRate > lru.hitRate);
    } },
  { text: 'Ek hot key par 50,000 rps daalo — ek node jal jaayega',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true && r.rps === 50000) },
  { text: 'match:live:score ki copies banao — load copies mein bant jaaye',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Ek key par 5,000 ek-saath miss — bina coalescing ke',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === false && r.misses === 5000) },
  { text: 'Single-flight on karo — 5,000 queries sirf 1 reh jaani chahiye',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === true && r.misses === 5000 && r.dbQueries === 1 && s.sys.api.cache?.singleFlight === true && r === SD.mission.latest(s, 'cache', 'coalesce')) },
  { text: 'Single-flight band rakh ke 5000 rps ka flash load chalao — DB queries gino',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 5000 && r.pattern === 'flash' && r.dbQueries > 5) },
  { text: 'Single-flight chalu karke wahi flash load dobara — DB queries ghatein aur system na bhare',
    check: s => s.sys.api.cache?.singleFlight === true && SD.mission.current(s, 'load', r => r.rps === 5000 && r.pattern === 'flash' && !r.saturated && r.dbQueries <= 5) },
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
     hogi hi — aur cache dobara bharne tak aayi har request miss karegi (5,000 rps par 200 ms ki khidki = lagbhag 1,000 requests).</p>
     <pre>bina coalescing:  ~1,000 miss  →  ~1,000 DB queries  💥
saath mein:       ~1,000 miss  →       1 DB query    ✅  (har app process mein ek)
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
      success: SD.allTasks(T_EVICT),
      successText: `Ab tum "Redis laga dete hain" se aage ho.
        Policy access pattern se aati hai, hot key ko sharding nahi <b>replication</b> bachaati hai,
        aur stampede ke do alag taale hain — <b>jitter</b> (keys bikhero) aur
        <b>coalescing</b> (ek key ke saare miss ek saath samet lo).`,
      solution: [
        "cache sim --policy fifo --size 3 --keys 'a b a b a b c d e f a b'",
        "cache sim --policy lru --size 3 --keys 'a b a b a b c d e f a b'",
        "cache sim --policy lfu --size 3 --keys 'a b a b a b c d e f a b'",
        "cache hotkey --key match:live:score --rps 50000",
        "cache hotkey --key match:live:score --rps 50000 --replicas 8",
        "cache coalesce --misses 5000",
        "load --rps 5000 --duration 5 --pattern flash",
        "cache coalesce --misses 5000 --on",
        "load --rps 5000 --duration 5 --pattern flash"
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'cache', 'coalesce')?.on === true && m.latest(s, 'cache', 'coalesce')?.dbQueries === 1 && s.sys.api.cache?.singleFlight === true && m.current(s, 'load', r => r.rps === 5000 && r.pattern === 'flash' && !r.saturated); },
      hints: [
        "FIFO, LRU aur LFU compare karte waqt cache size aur keys ka kram same rakho. Garam key ki copies aur ek key ki requests ko jodna (coalescing) — do alag dikkatein sambhaalte hain.",
        "`cache coalesce --misses <n> --on <true|false>` se ek hi key ke misses par coalescing band aur chalu compare karo. Har setting ke baad `load --rps <rate> --duration <s> --pattern flash` chalao — chalu hone par DB queries ghatengi.",
        "Poora raasta — har command alag Enter se chalao:\ncache sim --policy fifo --size 3 --keys 'a b a b a b c d e f a b'\ncache sim --policy lru --size 3 --keys 'a b a b a b c d e f a b'\ncache sim --policy lfu --size 3 --keys 'a b a b a b c d e f a b'\ncache hotkey --key match:live:score --rps 50000\ncache hotkey --key match:live:score --rps 50000 --replicas 8\ncache coalesce --misses 5000\nload --rps 5000 --duration 5 --pattern flash\ncache coalesce --misses 5000 --on\nload --rps 5000 --duration 5 --pattern flash",
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
          q: 'Nightly scan ke baad morning API slow hai. Cache pollution ka shak kaise parkhoge?',
          choices: [
            'Scan ke waqt evictions, hit rate aur DB I/O ko trace ke saath mila kar dekho',
            'Scan ke waqt sirf job ka end time dekho, phir DB locks ko root cause likh do',
            'Scan ke waqt sirf API latency dekho, phir Redis restart ko root cause likh do',
            'Scan ke waqt sirf calendar dekho, phir chhote TTL ko root cause maan lo',
          ],
          answer: 0,
          explain: 'Bada scan hot working set ki keys nikaal sakta hai. Evictions, hit/miss rate aur DB I/O ka badlaav scan ke saath mila kar dekho. Sirf roz ek waqt slow hona cause ka saboot nahi; locks, GC pauses aur doosra load bhi parkho.',
          choiceExplanations: [
            'Bada scan hot working set ki keys nikaal sakta hai. Evictions, hit/miss rate aur DB I/O ka badlaav scan ke saath mila kar dekho. Sirf roz ek waqt slow hona cause ka saboot nahi; locks, GC pauses aur doosra load bhi parkho.',
            'Locks ke liye wait aur lock-holder ka saboot chahiye; job ka waqt akela locks saabit nahi karta.',
            'Restart ke liye uptime, logs ya process events chahiye; latency akeli restart saabit nahi karti.',
            'Expiry aur memory eviction alag hain; counters aur key lifetimes se dono ko alag karo.',
          ],
        },
        {
          q: 'TTL jitter ke baad bhi ek popular key expire hote hi kai identical DB queries aati hain. Kya jodoge?',
          choices: [
            'Ek key ka refresh single-flight se jodo, callers ek nateeje ka intezaar karein',
            'Alag keys ka TTL jitter aur badhao, taaki same key ke callers apne aap bant jaayein',
            'Cache ki memory aur badhao, taaki same key ki expiry par DB ka kaam kam ho jaaye',
            'DB pool ki capacity aur badhao, taaki har caller apna alag refresh chalaata rahe',
          ],
          answer: 0,
          explain: 'Jitter alag keys ki expiry bikherta hai. Ek popular key par rebuild chalne ke dauraan kai misses aa sakte hain. Single-flight same key ke refresh ko jodta hai. Coordination ki hadd saaf rakho: process-local map ho toh har app apna ek rebuild chala sakti hai. 5000 rps ka matlab ek hi pal 5000 misses nahi; ginti rebuild window par depend karti hai.',
          choiceExplanations: [
            'Jitter alag keys ki expiry bikherta hai. Ek popular key par rebuild chalne ke dauraan kai misses aa sakte hain. Single-flight same key ke refresh ko jodta hai. Coordination ki hadd saaf rakho: process-local map ho toh har app apna ek rebuild chala sakti hai. 5000 rps ka matlab ek hi pal 5000 misses nahi; ginti rebuild window par depend karti hai.',
            'Alag keys ka jitter same key par ek waqt chal rahe refresh ko nahi jodta.',
            'Memory badhne se capacity evictions ghatti hain; given key ka TTL phir bhi expire ho sakta hai.',
            'Zyada concurrent DB queries same kaam dohraati hain; pool badhana coalescing ka badal nahi.',
          ],
        },
        {
          q: '8-primary Redis Cluster mein ek key par 50,000 reads/s se ek primary busy hai. Primary jodne ka asar?',
          choices: [
            'Key ka slot ek primary ka hai; extra primary akela reads nahi baantega',
            'Key ke reads naye primary par bantenge; client ko wahi ek key bhejni kaafi hogi',
            'Key ki value tukdon mein tootegi; naye primary par aadhi value chali jaayegi',
            'Key ki copies sab primaries par aayengi; cluster apne aap har read alag bhejega',
          ],
          answer: 0,
          explain: 'Redis Cluster key ko 16,384 hash slots mein map karta hai. Ek slot ka serving primary hota hai; primary jodne se same key ka read load apne aap nahi bantta. Local cache, explicitly routed replica reads ya multiple keys par copies madad kar sakti hain; freshness aur write/invalidation ka sauda parkho.',
          choiceExplanations: [
            'Redis Cluster key ko 16,384 hash slots mein map karta hai. Ek slot ka serving primary hota hai; primary jodne se same key ka read load apne aap nahi bantta. Local cache, explicitly routed replica reads ya multiple keys par copies madad kar sakti hain; freshness aur write/invalidation ka sauda parkho.',
            'Extra primary keys/slots ka load baant sakta hai; ek key ke reads ko baantne ki alag routing chahiye.',
            'Cluster primary jodne par ek value ko tukdon mein nahi todta; value partitioning app ka design hai.',
            'Redis Cluster read routing ko sab primaries mein automatic broadcast nahi banata; copies aur routing explicit chahiye.',
          ],
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
        q: 'Cache hit rate 40% hai. Sudhaar chunne se pehle kya naapoge?',
        choices: [
          'Misses cold start, expiry, eviction ya invalidation se hain, ginti alag karo',
          'Pehle memory double karo, phir bache misses ko cold start aur expiry mein baanto',
          'Pehle TTL double karo, phir freshness aur invalidation ka allowed budget parkho',
          'Pehle LFU lagao, phir traffic mein recency aur frequency ka pattern dhoondho',
        ],
        answer: 0,
        explain: 'Miss ki wajah se ilaaj chuno. Memory evictions mein madad kar sakti hai; TTL freshness budget ke andar badal sakta hai. Har key ek hi baar maangi jaati ho toh repeat hits kam rahenge. Cold start, expiry, eviction aur invalidation alag count karo; policy aur key design traffic se parkho.',
        choiceExplanations: [
          'Miss ki wajah se ilaaj chuno. Memory evictions mein madad kar sakti hai; TTL freshness budget ke andar badal sakta hai. Har key ek hi baar maangi jaati ho toh repeat hits kam rahenge. Cold start, expiry, eviction aur invalidation alag count karo; policy aur key design traffic se parkho.',
          'Extra memory capacity misses ghata sakti hai; expiry ya one-time keys ka masla alag hai.',
          'Lamba TTL purana data zyada der rakh sakta hai; freshness ka contract pehle chahiye.',
          'LFU kuch frequency patterns ko suit karta hai; miss ki wajah bina jaane policy badalna andaaza hai.',
        ],
      },
      {
        q: 'Redis cache band ho jaaye toh API ko DB bachane ke liye kya karna chahiye?',
        choices: [
          'DB tak fallback kaam ki hadd rakho; zaroorat par kuch requests saaf mana karo',
          'DB tak saare requests bhejo; cache hit rate achha tha toh capacity mil jaayegi',
          'DB tak har miss kai baar retry karo; cache lautne tak extra load chalta rahega',
          'DB tak sab warm-up jobs saath bhejo; live requests ka budget baad mein dekho',
        ],
        answer: 0,
        explain: 'Cache band hone par pehle ke hits bhi DB tak pahunch sakte hain. Same traffic aur one-query-per-miss model mein 95% hit rate se all-miss DB demand 20 guna ho sakti hai; DB zaroor girega, aisa fixed rule nahi. Capacity naapo, fallback concurrency baandho, aur allowed stale data ya saaf rejection se degrade karo. Cache load-bearing dependency bhi ho sakta hai.',
        choiceExplanations: [
          'Cache band hone par pehle ke hits bhi DB tak pahunch sakte hain. Same traffic aur one-query-per-miss model mein 95% hit rate se all-miss DB demand 20 guna ho sakti hai; DB zaroor girega, aisa fixed rule nahi. Capacity naapo, fallback concurrency baandho, aur allowed stale data ya saaf rejection se degrade karo. Cache load-bearing dependency bhi ho sakta hai.',
          'Hit rate normal DB load batata hai; all-miss load jhelne ki capacity alag naapni padegi.',
          'Retry DB ka kaam badhaata hai; bachi capacity ke andar bounded retry hi socho.',
          'Warm-up aur live requests ek hi DB capacity ke liye lad sakte hain; dono ke budgets chahiye.',
        ],
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
      goal: "Wahi likhne aur padhne ka kaam B-tree aur LSM par chala ke tulna karo. LSM ka baad mein hone wala compaction ka kaam bhi naapo.",
      sys: SD.sys.txn({ db: { engine: 'postgres' }, api: { countTotal: false } }),
      tasks: T_ENGINE,
      success: SD.allTasks(T_ENGINE),
      successText: "LSM ne likhne ka kuch kaam compaction tak taal diya. Padhne aur likhne ka kharch alag hai — engine chunte waqt apna workload, likhne ka atirikt kaam (amplification) aur compaction ka bojh saath dekho.",
      solution: [
        "bench write --rows 100000",
        "bench read --rows 100000",
        "sim set db.engine lsm",
        "bench write --rows 100000",
        "bench read --rows 100000",
        "bench compact",
      ],
      verify: s => { const m = SD.mission; return s.sys.db.engine === 'lsm' && m.current(s, 'bench', r => r.op === 'compact' && r.ran); },
      hints: [
        'Pehle B-tree par `bench write` aur `bench read` chalao. Same workload ka baseline chahiye; sirf write speed se engine chunna adhoora faisla hoga.',
        '`sim set db.engine lsm` ke baad `bench write --rows 100000` aur `bench read --rows 100000` repeat karo. Model mein LSM writes tez, point reads dheeme hain; `bench compact` se taala hua kharch dekho.',
        'Poora raasta — har command alag Enter se chalao:\nbench write --rows 100000\nbench read --rows 100000\nsim set db.engine lsm\nbench write --rows 100000\nbench read --rows 100000\nbench compact',
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
          q: 'LSM engine writes ka kharcha kis tarah baantta hai?',
          choices: [
            'Writes memory mein jodta hai, sorted files flush karta hai, merge baad mein karta hai',
            'Writes sirf memory mein rakhta hai, durable mode mein disk par likhna chhod deta hai',
            'Writes seedhe final sorted jagah rakhta hai, purani files ko merge karna chhod deta hai',
            'Writes ke liye alag file rakhta hai, isliye delete aur merge ka I/O bach jaata hai',
          ],
          answer: 0,
          explain: 'Aam durable LSM path pehle write-ahead log mein record likhta hai; phir memory ki memtable mein update rakhta hai. Sorted SSTables flush hoti hain aur compaction baad mein versions merge karti hai. Random updates ka kuch kharcha shift hota hai; compaction ka read/write I/O mita nahi. Har LSM write disk read se mukt ya har B-tree se tez nahi.',
          choiceExplanations: [
            'Aam durable LSM path pehle write-ahead log mein record likhta hai; phir memory ki memtable mein update rakhta hai. Sorted SSTables flush hoti hain aur compaction baad mein versions merge karti hai. Random updates ka kuch kharcha shift hota hai; compaction ka read/write I/O mita nahi. Har LSM write disk read se mukt ya har B-tree se tez nahi.',
            'Durable LSM aam taur par log aur flush se data persist karta hai; memory akeli durable storage nahi.',
            'Multiple sorted files ko compaction mein merge karna LSM ka aham kharcha hai.',
            'Append ka faayda merge aur deletion markers ki cleanup ko muft nahi banata.',
          ],
        },
        {
          q: 'Cassandra ka read p99 kuch intervals mein 3 guna badhta hai. Compaction ka shak kaise parkhoge?',
          choices: [
            'Spikes ko compaction, disk I/O queue aur latency ke metrics se mila kar dekho',
            'Spikes ka interval dekho, phir bina I/O metrics compaction throttle karna chuno',
            'Spikes mein CPU kam dekho, phir GC pause ko evidence ke bina list se hata do',
            'Spikes ke baad nodes jodo, phir storage I/O ka cause hona list se hata do',
          ],
          answer: 0,
          explain: 'Compaction reads ke saath disk aur CPU ke liye lad sakti hai. Read p99 spikes ko compaction activity, I/O latency aur queue ke saath mila kar dekho. GC pauses, repair, cache misses aur network bhi parkho. 3 guna yahan observed symptom hai; periodic spike compaction saabit nahi karta.',
          choiceExplanations: [
            'Compaction reads ke saath disk aur CPU ke liye lad sakti hai. Read p99 spikes ko compaction activity, I/O latency aur queue ke saath mila kar dekho. GC pauses, repair, cache misses aur network bhi parkho. 3 guna yahan observed symptom hai; periodic spike compaction saabit nahi karta.',
            'Periodicity akeli diagnosis nahi; repair ya GC bhi intervals mein ho sakte hain.',
            'CPU ka aggregate kam hona GC pause ko rule out nahi karta; pause metrics aur traces dekho.',
            'Nodes badhne se storage contention ka cause khud saabit ya reject nahi hota.',
          ],
        },
        {
          q: 'LSM mein DELETE ke baad disk space turant khaali kyun nahi ho sakti?',
          choices: [
            'Tombstone likhta hai; purane versions ko safe compaction baad mein hataati hai',
            'Delete har purani SSTable ko turant dobara likhta hai; marker rakhna nahi padta',
            'Delete sirf memory ki value hataata hai; disk aur replicas ko khabar dena nahi padta',
            'Delete marker purane replicas ko update karta hai; repair aur retention hata sakte hain',
          ],
          answer: 0,
          explain: 'LSM delete aksar tombstone, yaani deletion marker, likhta hai. Purane versions disk par reh sakte hain; safe compaction aur retention/replica conditions ke baad jagah milti hai. Marker se temporary space badh bhi sakti hai. Cassandra mein tombstone jaldi hataane se purane replica ka deleted data wapas aa sakta hai.',
          choiceExplanations: [
            'LSM delete aksar tombstone, yaani deletion marker, likhta hai. Purane versions disk par reh sakte hain; safe compaction aur retention/replica conditions ke baad jagah milti hai. Marker se temporary space badh bhi sakti hai. Cassandra mein tombstone jaldi hataane se purane replica ka deleted data wapas aa sakta hai.',
            'Delete aam taur par marker likhta hai; har SSTable turant rewrite nahi hoti.',
            'Sirf memory se hataana durable deletion ya replicas ki consistency nahi sambhaalega.',
            'Tombstone khud har replica ke catch-up ka saboot nahi; repair aur retention ki shartein chahiye.',
          ],
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
        q: 'Metrics ki 10 lakh writes/second aani hain. DB shortlist kaise banao?',
        choices: [
          'Row size, retention aur queries lo; TSDB, LSM aur partitioned SQL benchmark karo',
          'Writes ki ginti se Cassandra chuno; row size aur retention benchmark ke baad dekho',
          'Memory ki raftaar se Redis chuno; retained data aur durability ko baad mein dekho',
          'SQL ki reliability se Postgres chuno; query pattern aur hardware ko baad mein dekho',
        ],
        answer: 0,
        explain: '10 lakh writes/second akela engine nahi chunta. Bytes/write, retention, unique series ki ginti, queries, durability, hardware aur operational budget chahiye. Time-series DB, LSM aur partitioned relational options ko representative load par benchmark karo. Postgres ko sirf time-series naam se reject mat karo.',
        choiceExplanations: [
          '10 lakh writes/second akela engine nahi chunta. Bytes/write, retention, unique series ki ginti, queries, durability, hardware aur operational budget chahiye. Time-series DB, LSM aur partitioned relational options ko representative load par benchmark karo. Postgres ko sirf time-series naam se reject mat karo.',
          'Same write count par row size aur retention alag hon toh disk, memory aur compaction ka load alag hoga.',
          'Retained data aur durability Redis ki memory aur persistence cost ko badalte hain.',
          'Postgres fit ho sakta hai, par workload aur hardware bina benchmark ki capacity maan lena sahi nahi.',
        ],
      },
      {
        q: 'Ek Postgres par OLTP aur analytics chal rahe hain. Kab isolation ka faisla loge?',
        choices: [
          'Jab scans se OLTP ka measured SLO bigde; replica ya warehouse ka sauda parkho',
          'Jab analytics query pehli baar chale; shared engine ko bina naape reject kar do',
          'Jab nightly schedule mil jaaye; OLTP se resource contention ko solved maan lo',
          'Jab naya index ban jaaye; bade aggregates ka I/O aur CPU kam naapna chhod do',
        ],
        answer: 0,
        explain: 'Bade analytics scans OLTP ke CPU, I/O, memory/cache aur locks se resources baant sakte hain. Plan, working set aur SLO naap kar isolation chuno. Read replica ya warehouse madad kar sakte hain; columnar layout broad column aggregates ko suit kar sakta hai. Shared engine kuch workloads mein theek hai; universal row-count cutoff nahi.',
        choiceExplanations: [
          'Bade analytics scans OLTP ke CPU, I/O, memory/cache aur locks se resources baant sakte hain. Plan, working set aur SLO naap kar isolation chuno. Read replica ya warehouse madad kar sakte hain; columnar layout broad column aggregates ko suit kar sakta hai. Shared engine kuch workloads mein theek hai; universal row-count cutoff nahi.',
          'Dono workloads saath chal sakte hain agar capacity aur isolation SLO meet karein; pehle naapo.',
          'Night job lambi chal sakti hai ya cache/I/O pressure chhod sakti hai; schedule hard isolation nahi.',
          'Index ke baad bhi broad aggregate ko bahut data padhna pad sakta hai; actual work naapo.',
        ],
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
    { front: 'OLTP DB par analytics chalane ka asli nuksaan?', back: "Broad scans CPU/I/O/cache aur isolation budgets compete kar sakti hain. Actual OLTP SLO impact measure karo; replica/warehouse aur columnar storage access pattern ke hisaab se evaluate karo." },
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
  { text: 'Phir chhote batch mein backfill karo (50,000 ya kam — bade batch se replica peeche reh jaati hai)',
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
     aur cutover ek <b>flag</b> ho: deploy rollback mein aksar minutes lagte hain,
     flag palatna aksar seconds ka kaam (kitna tez — flag system par depend).</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Migration, do baar',
      goal: `Pehle <b>galat kram</b> se migration chalao aur dekho ki data chup-chaap
             kaise gayab hota hai. Phir rollback karke sahi kram se karo.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_DBMIGRATE,
      success: SD.allTasks(T_DBMIGRATE),
      successText: "Bina dual-write ke backfill mein 41,204 rows ka farak aa gaya. Rollback ke baad dual-write → backfill → verify → cutover ke kram ne farak zero kar diya. Batch 50,000 ya kam rakho, aur saaf likho ki sach kaunsi table hai aur rollback kahan tak ho sakta hai.",
      solution: [
        "migrate status",
        "migrate backfill --batch 5000",
        "migrate verify",
        "migrate rollback",
        "migrate dual-write on",
        "migrate backfill --batch 5000",
        "migrate verify",
        "migrate cutover",
      ],
      verify: s => { const m = SD.mission; return s.sys.migration?.dualWrite === true && s.sys.migration.verified === true && s.sys.migration.cutover === true && s.sys.migration.drift === 0 && s.sys.migration.backfilled === s.sys.migration.total && s.sys.migration.batch <= 50000; },
      hints: [
        'Pehle `migrate status` padho, phir jaan-boojhkar backfill pehle chalao. Verify ka drift batayega ki copy ke dauraan naye writes chhoot sakte hain.',
        '`migrate rollback` ke baad `migrate dual-write on` pehle chahiye. `migrate backfill --batch <rows>` mein batch chhota rakho; `migrate verify` mein drift zero ho tab `migrate cutover` chalao.',
        'Poora raasta — har command alag Enter se chalao:\nmigrate status\nmigrate backfill --batch 5000\nmigrate verify\nmigrate rollback\nmigrate dual-write on\nmigrate backfill --batch 5000\nmigrate verify\nmigrate cutover',
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
        { text: 'Reads ko naye column par shift karo — ek feature flag se', explain: '<b>Cutover.</b> 1% → 10% → 100%. Flag isliye ki wapas aana seconds ka kaam ho, minutes ka deploy nahi (asli samay flag system par depend).' },
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
            { t: "Rollback reads if old data is current", good: true, next: 'q2', explain: 'Sahi. Cutover ek flag tha, isliye rollback 20 second ka kaam hai. Pehle <b>khoon roko</b>, diagnosis baad mein — kyunki purani table abhi bhi source of truth hai aur wahan poora data hai.' },
            { t: "Find full root cause before relief", good: false, explain: 'Diagnosis zaroori hai — par abhi users ka data gayab dikh raha hai. Rollback ek flag door hai aur uska koi nuksaan nahi. Pehle bleeding roko.' },
            { t: "Copy rows manually during live writes", good: false, explain: 'Tumhe abhi pata bhi nahi ki kitni aur kaunsi rows gayab hain. Manual patch bina verify ke naya, aur gehra, corruption bana sakta hai.' },
          ],
        },
        q2: {
          text: 'Reads wapas purani table par hain, users theek hain. Ab wajah dhoondo.',
          choices: [
            { t: "Verify counts,keys and checksums", good: true, next: 'q3', explain: 'Yahi woh kadam tha jo cutover se pehle chhoot gaya tha. Ab yeh exact number dega — anumaan nahi.' },
            { t: "Rerun backfill without diagnosis", good: false, explain: 'Bina jaane ki drift kyun hai, dobara backfill wahi galti dohra sakta hai. Aur agar dual-write abhi bhi off hai toh natija wahi rahega.' },
            { t: "Read logs without data comparison", good: false, explain: 'Logs madad karenge, par yahan seedha sawaal hai "dono tables mein kitna farak hai" — aur uska seedha jawab count + checksum hai.' },
          ],
        },
        q3: {
          text: 'Verify: 41,204 rows ka farak. Sab timestamps backfill wale 3-ghante ke window ke hain. Kya hua tha?',
          choices: [
            { t: "Check write capture during snapshot", good: true, next: 'end', explain: 'Bilkul. Backfill ne ek snapshot copy kiya, aur us snapshot ke baad aaye writes nayi table mein kabhi pahunche hi nahi. Snapshot se pehle concurrent writes capture hona zaroori hai:coordinated dual-write,CDC ya equivalent recovery protocol. Ab: dual-write on karo, backfill dobara (idempotent upsert se), verify, phir 1% traffic se cutover.' },
            { t: "Assume any backfill script corrupted", good: false, explain: 'Mumkin hai, par saboot iske khilaaf hai: gayab rows <b>ek hi time window</b> ki hain, bikhri hui nahi. Bug hota toh nuksaan random hota. Time-window ka pattern hamesha "us doraan aaye writes" ki taraf ishara karta hai.' },
            { t: "Assume all missing rows replica lag", good: false, explain: 'Replica lag 6 ghante nahi rehta, aur woh rows ko <b>gayab</b> nahi karta — sirf der se dikhata hai. Yahan checksum bhi mismatch hai, toh data sach mein nahi hai.' },
          ],
        },
        end: {
          end: true,
          text: 'Reads wapas purani table par. Users theek hain. Root cause mil gaya.',
          summary: `<b>Seekh:</b> Galti "backfill" mein nahi thi — <b>kram</b> mein thi.
            <br><br><b>Sahi kram:</b> <code>dual-write → backfill → verify → cutover</code>
            <br><br><b>Teen cheezein jinhone bachaya:</b>
            <br>• Cutover ek <b>flag</b> tha — rollback seconds ka kaam tha, minutes ka deploy nahi (aur purana data abhi taaza tha)
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
          q: 'Backfill snapshot ke dauraan writes chalti rahengi. Naye store mein gap rokne ke liye kya chahiye?',
          choices: [
            'Snapshot boundary se capture jodo; concurrent writes baad mein replay kar sako',
            'Snapshot pehle poora karo, phir snapshot ke baad se writes ki capture shuru karo',
            'Snapshot batches ko tez karo, phir beech ki writes ke liye capture chhod do',
            'Snapshot ke row counts milaao, phir badli values ki capture ko poora maan lo',
          ],
          answer: 0,
          explain: 'Snapshot aur change-log position ka taal-mel rakho, taaki snapshot ke dauraan ki commits replay ho sakein. CDC, coordinated dual-write ya doosra recoverable protocol fit ho sakta hai. Plain independent dual writes mein partial failure aur ordering ka gap sambhaalna hoga; snapshot akela future writes copy nahi karta.',
          choiceExplanations: [
            'Snapshot aur change-log position ka taal-mel rakho, taaki snapshot ke dauraan ki commits replay ho sakein. CDC, coordinated dual-write ya doosra recoverable protocol fit ho sakta hai. Plain independent dual writes mein partial failure aur ordering ka gap sambhaalna hoga; snapshot akela future writes copy nahi karta.',
            'Snapshot ke dauraan badli rows ka gap bachega; capture ko snapshot boundary ke saath coordinate karo.',
            'Tez backfill bhi nonzero concurrency window rakhta hai; writes capture ya reconcile karni padengi.',
            'Equal row counts values ki equality nahi batate; updates count badle bina data badal sakti hain.',
          ],
        },
        {
          q: 'Migration cutover ko feature flag ke peeche rakhne ka faayda kya hai?',
          choices: [
            'Traffic dheere shift aur wapas route karo; compatibility pehle verify karo',
            'Flag palat kar purane store ka missed data la sakte ho; replay baad mein dekho',
            'Flag laga kar purana schema hata sakte ho; data compatibility baad mein dekho',
            'Flag ke fixed fast time par bharosa karo; propagation test rollout ke baad karo',
          ],
          answer: 0,
          explain: 'Feature flag routing ko controlled stages mein badal sakta hai aur rollback tez kar sakta hai. Propagation ka time implementation par depend karta hai; 20 second ya 20 minute universal nahi. Purana path current data padh sake aur code/schema compatible hon, pehle verify karo. Flag missing data ko khud wapas nahi laata.',
          choiceExplanations: [
            'Feature flag routing ko controlled stages mein badal sakta hai aur rollback tez kar sakta hai. Propagation ka time implementation par depend karta hai; 20 second ya 20 minute universal nahi. Purana path current data padh sake aur code/schema compatible hon, pehle verify karo. Flag missing data ko khud wapas nahi laata.',
            'Flag route badalta hai; old store se chhoote writes ke liye replay ya reverse replication chahiye.',
            'Purana schema hataane se old readers toot sakte hain aur rollback band ho sakta hai; flag akela compatibility nahi deta.',
            'Flag caches aur delivery mein delay ho sakta hai; measured propagation aur failure behavior pehle test karo.',
          ],
        },
        {
          q: 'Cutover ke baad writes sirf naye store mein jaa rahi hain. Purane store par safe rollback kaise bachega?',
          choices: [
            'New writes old store tak replay karo; reverse replication aur parity test karo',
            'Sirf read flag wapas karo; purane store mein aakhri backfill ko current maan lo',
            'Sirf nayi writes band karo; purane store mein beech ke updates apne aap maan lo',
            'Sirf purani table bachi rakho; latest values dono jagah hone ka proof maan lo',
          ],
          answer: 0,
          explain: 'Purane store ko updates nahi mil rahe toh rollback se nayi writes chhoot sakti hain. Preserved changelog, reverse replication ya tested reconciliation se old path ko current banao. Data parity aur writer ownership verify karne ke baad route badlo. Dual-write band hona akela permanent irreversibility nahi, par simple flag rollback unsafe ho sakta hai.',
          choiceExplanations: [
            'Purane store ko updates nahi mil rahe toh rollback se nayi writes chhoot sakti hain. Preserved changelog, reverse replication ya tested reconciliation se old path ko current banao. Data parity aur writer ownership verify karne ke baad route badlo. Dual-write band hona akela permanent irreversibility nahi, par simple flag rollback unsafe ho sakta hai.',
            'Last backfill ke baad aayi writes old store mein nahi hongi; read flag data sync nahi karta.',
            'Naye writes rokne se pehle ke missing updates replay nahi hote; missing updates ka recovery path chahiye.',
            'Table ka hona latest data ka proof nahi; applied position aur values verify karo.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Migration',
    instructions: 'Yeh sawaal senior aur staff ko alag karta hai. 🎤',
    questions: [
      {
        q: '2 crore rows ko naye schema par bina downtime le jaana hai. Kaunsa plan choose karoge?',
        choices: [
          'Expand, changes capture, bounded backfill, parity verify, phir staged cutover karo',
          'Expand, live rows copy, sirf counts verify, phir reads ek saath naye store par karo',
          'Expand, bada ALTER chalao, lock behavior parkhe bina cutover ka time pakka karo',
          'Expand, copy verify, purana schema drop karo, phir canary se readers ko parkho',
        ],
        answer: 0,
        explain: 'Naya schema compatible rakho. Concurrent changes capture karo, backfill ke batches aur DB/replica load baandho. Counts, keys, values aur important queries compare karo; phir canary cutover aur tested rollback rakho. Dual writes akeli atomic nahi. DDL locks aur table rewrite operation/version par depend karte hain; representative environment mein test karo.',
        choiceExplanations: [
          'Naya schema compatible rakho. Concurrent changes capture karo, backfill ke batches aur DB/replica load baandho. Counts, keys, values aur important queries compare karo; phir canary cutover aur tested rollback rakho. Dual writes akeli atomic nahi. DDL locks aur table rewrite operation/version par depend karte hain; representative environment mein test karo.',
          'Live copy ki concurrent updates miss ho sakti hain; count equal hona values equal hone ka proof nahi.',
          'ALTER ka lock/rewrite behavior operation aur version par depend karta hai; latency budget bina test pakka nahi.',
          'Old schema jaldi drop karne se readers aur rollback path toot sakte hain; contract phase baad mein chahiye.',
        ],
      },
      {
        q: 'Migration cutover par correctness ka bharosa kaise badhaoge?',
        choices: [
          'Parity aur shadow reads ke saath errors, latency aur business outcomes dekho',
          'Sirf low latency par rollout badhao; silent data mismatch ko logs par chhod do',
          'Sirf 200 responses par rollout badhao; orders aur values ka comparison chhod do',
          'Sirf QA pass par rollout badhao; live traffic aur lag ka monitoring baad mein karo',
        ],
        answer: 0,
        explain: 'Cutover se pehle shadow reads aur chunk/key/value parity check karo. Canary mein error rate, latency aur orders jaise business outcomes dekho. Fast 200 response bhi galat data de sakta hai. Shadow sampling har row ya future failure ka proof nahi; async lag aur comparison timing samajh kar mismatches classify karo.',
        choiceExplanations: [
          'Cutover se pehle shadow reads aur chunk/key/value parity check karo. Canary mein error rate, latency aur orders jaise business outcomes dekho. Fast 200 response bhi galat data de sakta hai. Shadow sampling har row ya future failure ka proof nahi; async lag aur comparison timing samajh kar mismatches classify karo.',
          'Galat data bhi tez aa sakta hai; latency correctness ya complete migration ka proof nahi.',
          '200 transport/API success bata sakta hai, correct business outcome nahi; data parity bhi chahiye.',
          'QA useful hai, par live load, replication lag aur real query patterns rollout monitoring maangte hain.',
        ],
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
    { front: 'Cutover flag se kyun, deploy se nahi?', back: 'Flag aksar seconds mein palat-ta hai, deploy minutes leta hai (setup par depend). Aur flag se 1%→10%→100% kar sakte ho. Shart: purana raasta abhi bhi taaza data padh sake.' },
    { front: 'Rollback ka darwaza kab band?', back: 'Jis pal <b>purani table par likhna band</b> hota hai. Isliye dual-write cutover ke baad bhi kuch din chalao.' },
  ],
},
]);

/* =====================================================================
   L3.5 — Unique IDs at scale   (ByteByteGo / Hello Interview ka classic)
   ===================================================================== */
const T_IDS = [
  { text: "Kuch UUIDv4 dekho — koi kram hai?",
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'gen' && r.type === 'uuid4') },
  { text: "Snowflake IDs banao — badhta hua kram dekho",
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'gen' && r.type === 'snowflake') },
  { text: "UUIDv4 primary key par 10 lakh inserts",
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'uuid4' && r.rows === 1000000) },
  { text: 'Snowflake par bhi 10 lakh inserts',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'snowflake' && r.rows === 1000000) },
  { text: 'Dekho: sortable id se page splits lagbhag khatam ho gaye',
    check: s => {
      const u = s.records.filter(r => r.kind === 'id' && r.op === 'bench' && r.sortable === false).pop();
      const k = s.records.filter(r => r.kind === 'id' && r.op === 'bench' && r.sortable === true).pop();
      return !!(u && k && k.rows === u.rows && k.rows === 1000000 && k.splits < u.splits / 10 && k.ms < u.ms);
    } },
  { text: 'ULID par bhi 10 lakh inserts — aakhri benchmark ULID ka ho',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.type === 'ulid' && r.rows === 1000000 && r === SD.mission.latest(s, 'id', 'bench')) },
];

SD.registerLevelsAfter('data', 'composite', [
{
  id: 'ids',
  icon: '🆔',
  title: 'IDs — Random Primary Key Ki Chhupi Hui Keemat',
  badge: 'ID Shilpi',
  objectives: [
    "Random UUID primary key ka locality/write-cost tradeoff",
    "Snowflake ke 64 bits, worker-ID allocation aur clock rollback policy",
    'Chronological id aur unique cursor tie-breaker alag properties hain',
    'External id aur primary key alag ho sakte hain — aur honi chahiye',
  ],
  lesson: [
    `<h3>📖 "UUID hi use kar lete hain" — aur uska bill</h3>
     <p>UUIDv4 ka waada bahut achha hai: koi coordination nahi, koi central counter
     nahi; collision probability tiny hai, mathematically zero nahi. Good random generation guessing harder banati hai; authorization phir bhi chahiye
     (<code>/orders/1247</code> se <code>/orders/1248</code> maang lena aasan hai).</p>
     <p>Par jab woh <b>primary key</b> ban jaata hai, tab ek chhupa hua bill aata hai —
     aur woh seedha B-tree se aata hai, jo tumne pichhle levels mein dekha:</p>
     <pre>Sortable id (autoinc/Snowflake):
   har naya row  →  B-tree ke AAKHRI page par
                 →  woh page pehle se memory mein garam hai
                 →  locality often better; page splits still possible

Random id (UUIDv4):
   har naya row  →  B-tree mein KAHIN BHI
                 →  woh page shayad disk se laana pade
                 →  page bhara hua ho toh SPLIT
                 →  index bikhar jaata hai (fragmentation)</pre>
     <p class="tip">🎯 <b>Chronology aur stable ordering alag hain.</b> UUIDv4 akeli creation-time order nahi deti, par unique aur stable hone ke kaaran <code>(created_at, id)</code> cursor ka tie-breaker ban sakti hai. ORDER BY aur cursor comparison dono mein wahi columns, direction aur collation chahiye; matching index bhi banao. Ek timestamp par do rows ka order unique id se deterministic hota hai.</p>`,
    `<h3>❄️ Snowflake — 64 bits mein sab kuch</h3>
     <pre>┌─1─┬────────── 41 ──────────┬──── 10 ────┬──── 12 ────┐
│ 0 │      timestamp (ms)     │ machine id │  sequence  │
└───┴─────────────────────────┴────────────┴────────────┘

41 bit timestamp  →  69 saal (ek custom epoch se)
10 bit machine    →  1024 assigned worker IDs;duplicate assignment prevent karo
12 bit sequence   →  4096 ids per machine PER MILLISECOND</pre>
     <p>Timestamp <b>sabse aage</b> hai — isliye jab tum ids ko number ki tarah sort
     karte ho, woh apne aap <b>waqt ke kram</b> mein aa jaati hain. Per-ID central request zaroori nahi, par unique worker-ID allocation, clock policy aur state recovery coordinate karne padte hain. Timestamp order global causality guarantee nahi.</p>
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
     <p class="tip">🎯 Internal sortable key locality improve kar sakti hai; stable unique public key API ko decouple karti hai. Public UUID guessing harder banati hai, par authorization checks replace nahi karti. Cursor correctness ko explicit total order aur matching predicate chahiye.
     Kharch: ek extra unique index. Woh lagbhag hamesha manzoor hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Random vs sortable',
      goal: `Do id schemes par 10 lakh inserts chalao aur B-tree ka farak khud dekho.`,
      sys: SD.sys.txn({ api: { countTotal: false } }),
      tasks: T_IDS,
      success: SD.allTasks(T_IDS),
      successText: "Wahi 10 lakh inserts: random UUIDv4 ne kram wale Snowflake/ULID se zyada page splits aur likhne ka kharch dikhaya. Benchmark sirf B-tree mein paas-paas likhne ka faayda dikhata hai — content hash, takraav ki jaanch ya ghadiyon ki sahi-sahi ginti ka saboot nahi.",
      solution: [
        "id gen uuid4 --n 5",
        "id gen snowflake --n 5",
        "id bench --type uuid4 --rows 1000000",
        "id bench --type snowflake --rows 1000000",
        "id bench --type ulid --rows 1000000",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'id', 'bench')?.type === 'ulid'; },
      hints: [
        'Pehle `id gen <type> --n <count>` se random aur sortable IDs dekho. ID ka kram B-tree mein nayi entry ki jagah badalta hai.',
        '`id bench --type <scheme> --rows 1000000` mein har scheme par same rows rakho. UUIDv4 aur Snowflake ke page splits, time aur index size milao; phir ULID benchmark se sortable badi ID bhi jaancho.',
        'Poora raasta — har command alag Enter se chalao:\nid gen uuid4 --n 5\nid gen snowflake --n 5\nid bench --type uuid4 --rows 1000000\nid bench --type snowflake --rows 1000000\nid bench --type ulid --rows 1000000',
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
        { text: 'Public URL mein dikhne wala id — /invoices/&lt;id&gt;', bin: 'uuid', explain: 'Autoinc yahan do cheezein leak karta hai: tumhara total count, aur doosron ke records (<code>/invoices/1248</code> maang lo). UUID guess-proof hai.' },
        { text: '5 services alag-alag jagah se ek hi table mein likh rahi hain', bin: 'sort', explain: 'Coordination-free chahiye <b>aur</b> index-friendly bhi. Snowflake dono deta hai — har service apni id banati hai, aur woh phir bhi waqt ke kram mein rehti hain.' },
        { text: 'Client offline mein rows banata hai, baad mein sync karta hai', bin: 'uuid', explain: 'Client ko server se poochhe bina id chahiye, aur takraana bilkul nahi chahiye. ULID bhi chalega aur sortable bhi hoga — par agar client ki clock par bharosa nahi toh UUIDv4 zyada surakshit hai.' },
        { text: 'Events table jahan 50,000 inserts/sec aate hain', bin: 'sort', explain: 'Yahan random id ka page-split tax seedha throughput khaa jaayega. Sortable id se har insert aakhri (garam) page par jaata hai.' },
        { text: 'ID akeli roughly creation-time order de; alag timestamp sort field nahi hai', bin: 'sort', explain: 'Snowflake/ULID time component ke saath roughly chronological ordering deti hain; clock aur same-timestamp guarantees implementation par depend hain. Agar created_at alag sort column hai, unique stable UUIDv4 bhi valid tie-breaker hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'IDs ki samajh',
      questions: [
        {
          q: 'UUIDv4 primary key par inserts dheeme dikh rahe hain. B-tree mein kaunsi wajah jaanchoge?',
          choices: [
            'Random keys se writes bikharti hain; pages, cache aur splits jaancho',
            'Sirf UUID ki chaudai dekho; keys ka page par kram write ko nahi badalta',
            'Bas sortable key chun lo; aage badhti keys mein page split ka khatra nahi',
            'Bas UUID banne ka waqt dekho; B-tree mein insert ka kaam bahut sasta hai',
          ],
          answer: 0,
          explain: 'UUIDv4 random jagah insert kara sakta hai; alag pages laane aur splits ka kaam badh sakta hai. Key ki chaudai, DB aur load bhi maayne rakhte hain. Waqt ke kram wale IDs locality sudhaar sakte hain, par splits aur ek garam page par bheed phir bhi ho sakti hai. UUIDv7, RFC 9562 ka time-ordered UUID, waqt ke hisaab se sort ho sakta hai; PostgreSQL 18 mein uuidv7() milta hai. Global event order ka vaada mat maano.',
          choiceExplanations: [
            'UUIDv4 random jagah insert kara sakta hai; alag pages laane aur splits ka kaam badh sakta hai. Key ki chaudai, DB aur load bhi maayne rakhte hain. Waqt ke kram wale IDs locality sudhaar sakte hain, par splits aur ek garam page par bheed phir bhi ho sakti hai. UUIDv7, RFC 9562 ka time-ordered UUID, waqt ke hisaab se sort ho sakta hai; PostgreSQL 18 mein uuidv7() milta hai. Global event order ka vaada mat maano.',
            'UUID ki chaudai jagah leti hai, par random insert se page aur cache ka kaam bhi badal sakta hai. Sirf size se poori wajah nahi milti.',
            'Aage badhti keys bhi aakhri page ko bhar sakti hain aur split kara sakti hain. Ek hi hisse par writes ki bheed bhi lag sakti hai.',
            'UUID banaane ka kharch implementation par nirbhar hai. DB mein pages laane aur badalne ka kaam naape bina generation ko wajah mat maano.',
          ],
        },
        {
          q: 'Snowflake ID mein timestamp ke bits sabse aage rakhne se kaunsa faayda milta hai?',
          choices: [
            'Number se sort karo toh IDs lagbhag waqt ke kram mein aa sakte hain',
            'Waqt ek ho tab bhi timestamp akela har node ki ID alag bana deta hai',
            'Clock peeche jaaye tab bhi number ka kram aage badhta hi rehta hai',
            'Number ka kram har node par events ki wajah aur nateeja bata deta hai',
          ],
          answer: 0,
          explain: 'Timestamp aage hone se bade waqt ki ID number mein aage aa sakti hai. Alag worker IDs, sequence aur clock peeche jaane ka niyam bhi chahiye. Nodes ki clocks alag ho sakti hain; ID ka numeric order har event ka asli ya causal order pakka nahi karta.',
          choiceExplanations: [
            'Timestamp aage hone se bade waqt ki ID number mein aage aa sakti hai. Alag worker IDs, sequence aur clock peeche jaane ka niyam bhi chahiye. Nodes ki clocks alag ho sakti hain; ID ka numeric order har event ka asli ya causal order pakka nahi karta.',
            'Ek waqt par kai nodes kai IDs bana sakte hain. Alag worker ID aur sequence ke bina sirf timestamp uniqueness nahi bachaata.',
            'Clock peeche jaaye toh timestamp chhota ho sakta hai. Rukne ya logical waqt sambhalne ka niyam alag se chahiye.',
            'Physical clocks se har node ki event causality nahi nikalti. Pehle bana number kisi doosre event ki wajah hone ka saboot nahi.',
          ],
        },
        {
          q: 'Internal primary key sequential chahiye, aur public API mein UUIDv4 dena zaroori hai. Kaunsa model dono zarooratein poori karega?',
          choices: [
            'Andar BIGINT key, bahar UUIDv4 ka alag column rakho aur unique index banao',
            'Andar UUIDv4 ko binary key rakho, taaki random values bhi kram mein likhi jaayein',
            'Andar counter, bahar base64 rakho, taaki public ID bhi UUIDv4 ki shart poori kare',
            'Andar UUIDv7 key, bahar bhi UUIDv7 bhejo, taaki UUIDv4 ki shart poori ho jaaye',
          ],
          answer: 0,
          explain: 'BIGINT primary key aur alag unique UUIDv4 public_id dono shartein poori karte hain. Public UUIDv4 ke unique index par random writes ka kharch phir bhi hai; permission checks bhi chahiye. UUIDv7 waqt ke kram wala 128-bit UUID hai (RFC 9562; PostgreSQL 18 mein uuidv7()). UUIDv7 tab vikalp hai jab API ki UUIDv4 waali shart badal sake.',
          choiceExplanations: [
            'BIGINT primary key aur alag unique UUIDv4 public_id dono shartein poori karte hain. Public UUIDv4 ke unique index par random writes ka kharch phir bhi hai; permission checks bhi chahiye. UUIDv7 waqt ke kram wala 128-bit UUID hai (RFC 9562; PostgreSQL 18 mein uuidv7()). UUIDv7 tab vikalp hai jab API ki UUIDv4 waali shart badal sake.',
            'Binary format jagah bacha sakta hai, par UUIDv4 ki values random hi rehti hain. Binary mein rakhne se insert sequential nahi hota.',
            'Counter ko base64 mein likhna UUIDv4 banaana nahi. Encoding se counter ka andaaza lagaana ya access karna bhi apne aap nahi rukta.',
            'UUIDv7 aur UUIDv4 alag versions hain. Time order ka faayda ho sakta hai, par public API ki pakki UUIDv4 shart poori nahi hoti.',
          ],
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
        { text: 'Agar sequence bhar gaya toh agle millisecond ka intezaar karo', explain: 'Ek millisecond mein 4096 se zyada chahiye? Ruko. Yeh takraane se behtar hai — workload bursts mein possible hai;generation wait/backpressure ka SLA test karo.' },
        { text: 'Teenon hisson ko shift karke jodo', explain: '<code>(ts &lt;&lt; 22) | (machine &lt;&lt; 12) | sequence</code>. Timestamp sabse upar ke bits mein — isiliye sorting waqt ke hisaab se hoti hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — IDs',
    instructions: 'Chhota sawaal, gehra jawab. 🎤',
    questions: [
      {
        q: 'Alag nodes par 64-bit IDs banaane hain, lagbhag waqt ke kram mein. Kaunsa design parakhoge?',
        choices: [
          'Timestamp, worker ID aur sequence jodo; worker aur clock ka niyam tay karo',
          'UUIDv4 ko seedha rakh do; random UUID apne aap 64-bit waqt ka kram dega',
          'Har node ka apna counter rakho; doosre nodes ka counter dekhna zaroori nahi',
          'Sirf timestamp ko ID rakh do; ek clock tick mein kai inserts bhi alag rahenge',
        ],
        answer: 0,
        explain: 'Snowflake jaisa timestamp, worker ID aur sequence wala design fit ho sakta hai. Worker IDs alag dene, restart ke baad state sambhalne aur clock peeche jaane ki taiyaari chahiye. Har ID par central call bach sakti hai; saari coordination nahi. UUIDv7 time-ordered hai, par 128-bit hai; 64-bit shart ka badal nahi.',
        choiceExplanations: [
          'Snowflake jaisa timestamp, worker ID aur sequence wala design fit ho sakta hai. Worker IDs alag dene, restart ke baad state sambhalne aur clock peeche jaane ki taiyaari chahiye. Har ID par central call bach sakti hai; saari coordination nahi. UUIDv7 time-ordered hai, par 128-bit hai; 64-bit shart ka badal nahi.',
          'UUIDv4 128-bit random UUID hai; creation time ka kram nahi deta. Waqt ke kram wala UUIDv7 bhi 128-bit hai.',
          'Do nodes ka local counter ek hi value de sakta hai. Alag worker ID ya doosra uniqueness ka tareeka chahiye.',
          'Ek clock tick par ek node bhi kai IDs maang sakta hai. Timestamp akela worker aur sequence ki jagah nahi leta.',
        ],
      },
      {
        q: 'Chhote URL codes chahiye. Har nayi entry ko alag counter mil sakta hai, aur code counter se dobara nikaalna hai. Kaunsa tareeka fit hai?',
        choices: [
          'Counter base62 mein likho; andaaze aur access ke niyam alag rakho',
          'URL ka chhota hash base62 mein likho; collision ki jaanch chhod sakte ho',
          'Saat random characters ka code rakho; unique constraint ki zaroorat nahi',
          'UUID ko poora text banaakar rakho; counter se bhi chhota code milega',
        ],
        answer: 0,
        explain: 'Alag counter ko base62 mein likhne se chhota, dobara nikaalne laayak code mil sakta hai. Counter ka andaaza lag sakta hai; private links ke liye access ka niyam alag chahiye. Random code bhi doosri zarooraton mein valid hai, par collision par DB ka unique constraint aur naye code ke saath retry chahiye. Chhote hash mein bhi collision mumkin hai.',
        choiceExplanations: [
          'Alag counter ko base62 mein likhne se chhota, dobara nikaalne laayak code mil sakta hai. Counter ka andaaza lag sakta hai; private links ke liye access ka niyam alag chahiye. Random code bhi doosri zarooraton mein valid hai, par collision par DB ka unique constraint aur naye code ke saath retry chahiye. Chhote hash mein bhi collision mumkin hai.',
          'Hash chhota karne par alag URLs ka code ek ho sakta hai. Collision sambhaalna padega; base62 sirf likhne ka format badalta hai.',
          'Saat characters ki jagah finite hai; random codes takra sakte hain. Unique constraint aur collision par naye code se retry karke sahi entry bachaao.',
          'Poora UUID text chhote counter ke base62 code se bada ho sakta hai. UUID ko sabse chhota code kehne ki wajah nahi.',
        ],
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
    { front: 'Random UUID primary key ka bill?', back: 'Har insert B-tree mein <b>random jagah</b> → page disk se laana + splits + fragmentation. Time-ordered id aksar right edge ke paas insert hoti hai; hot-page contention bhi dekhna padta hai. UUIDv4 chronological nahi hai, par (created_at, id) cursor mein stable unique tie-breaker ban sakti hai.' },
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
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.items === 1000000 && r.bits === 9585059 && r.fpRate <= 1.01) },
  { text: 'Dekho ki exact set se Bloom filter kitna sasta hai',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.exactBytes > r.bytes * 5) },
  { text: 'Ab 4,000,000 bits do (pehle ka lagbhag 42%) — false positive kitna badhta hai?',
    check: s => {
      const all = s.records.filter(r => r.kind === 'probabilistic' && r.op === 'bloom');
      return all.length >= 2 && all.some(a => all.some(b => b.bits < a.bits && b.fpRate > a.fpRate * 3));
    } },
  { text: '10 crore unique items ka HyperLogLog',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'hll' && r.items === 100000000) },
  { text: 'Phir 10 lakh items ka HLL; dono HLL ki memory same rahe',
    check: s => {
      const all = s.records.filter(r => r.kind === 'probabilistic' && r.op === 'hll');
      return all.length >= 2 && all.some(a => all.some(b => b.items !== a.items && b.bytes === a.bytes && SD.mission.latest(s, 'probabilistic', 'hll')?.items === 1000000));
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
     <p>Healthy complete insert-only filter mein inserted items ke false negatives nahi; false positives possible hain. Lag, corruption aur unsafe deletion alag failure paths hain.
     Aur yeh asymmetry hi use kaam ka banati hai:
     agar woh kahe "nahi hai" aur filter complete/freshness contract meet karta ho, toh negative lookup skip kar sakte ho. Username allocation ko atomic DB uniqueness se protect karo.
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
      success: SD.allTasks(T_PROB),
      successText: "Bloom filter sirf pehli chhanni hai: \"shayad hai\" ka matlab pakka hai nahi. HLL alag cheezon ki ginti ka andaaza deta hai. Andaaze se memory bachti hai, par galat \"haan\" aur ginti ki galti ki keemat bhi soch ke chuno.",
      solution: [
        "bloom --items 1000000 --fp 0.01",
        "bloom --items 1000000 --bits 4000000 --hashes 3",
        "hll --items 100000000",
        "hll --items 1000000",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'probabilistic', 'hll')?.items === 1000000; },
      hints: [
        'Pehle `bloom --items <count> --fp <fraction>` se filter ka size nikalo. Exact set ke bytes se comparison approximation ki bachat dikhayega.',
        '`bloom --items 1000000 --fp 0.01` ke baad same items par `--bits <bits> --hashes <count>` se kam memory do. False positives badhenge. `hll --items <count>` alag counts par same registers ki memory rakhta hai.',
        'Poora raasta — har command alag Enter se chalao:\nbloom --items 1000000 --fp 0.01\nbloom --items 1000000 --bits 4000000 --hashes 3\nhll --items 100000000\nhll --items 1000000',
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
          q: 'Healthy, poore updated insert-only Bloom filter mein added item ko absent kyun nahi batata?',
          choices: [
            'Add par item ke hash bits set hue the; normal checks un bits ko clear nahi karte',
            'Add par item ka poora naam rakha tha; har check exact naam se comparison karta hai',
            'Add par hash unique ban gaya tha; doosre items same bits ko kabhi set nahi karte',
            'Add par item ka count rakha tha; har check negative result ko positive kar deta hai',
          ],
          answer: 0,
          explain: 'Normal bit Bloom filter item ke hash positions par bits set karta hai. Healthy insert-only filter mein added item ke bits clear nahi hote, isliye false negative nahi. Doosre items bits share kar sakte hain, isliye false positive ho sakta hai. Lag, corruption, incomplete publication ya unsafe deletion is contract se alag failures hain.',
          choiceExplanations: [
            'Normal bit Bloom filter item ke hash positions par bits set karta hai. Healthy insert-only filter mein added item ke bits clear nahi hote, isliye false negative nahi. Doosre items bits share kar sakte hain, isliye false positive ho sakta hai. Lag, corruption, incomplete publication ya unsafe deletion is contract se alag failures hain.',
            'Bloom filter original items ki exact list nahi rakhta; membership bits ka summary rakhta hai.',
            'Hash positions share ho sakti hain; collisions hi false positives ki ek wajah hain.',
            'Normal bit Bloom filter per-item counter ya negative-to-positive correction nahi rakhta.',
          ],
        },
        {
          q: 'Normal bit Bloom filter se ek item hataane ke liye hash bits zero karna unsafe kyun hai?',
          choices: [
            'Items same bits baant sakte hain; zero karne se doosra added item chhup sakta hai',
            'Har bit sirf ek item ki hoti hai; delete ke waqt hash ko dobara banana pad sakta hai',
            'Filter original items rakhta hai; ek bit clear karne se saari list copy karni pad sakti hai',
            'Har Bloom variant delete rokta hai; counters rakhne par bhi item hat nahi sakta hai',
          ],
          answer: 0,
          explain: 'Ek bit kai items se set ho sakti hai. Ek item ke bits clear karoge toh doosre added item ka check false negative de sakta hai. Counting Bloom filter bits ki jagah counters rakhta hai aur sahi deletion contract ke saath delete support kar sakta hai. Normal bit variant aur deletion variants alag hain.',
          choiceExplanations: [
            'Ek bit kai items se set ho sakti hai. Ek item ke bits clear karoge toh doosre added item ka check false negative de sakta hai. Counting Bloom filter bits ki jagah counters rakhta hai aur sahi deletion contract ke saath delete support kar sakta hai. Normal bit variant aur deletion variants alag hain.',
            'Hash collision se items same bits share karte hain; bit par unique item ownership nahi hoti.',
            'Normal filter original item list rakhta hi nahi; problem shared bits clear karna hai.',
            'Counting Bloom jaise variants valid deletions support kar sakte hain; har variant ko ek rule se mat gino.',
          ],
        },
        {
          q: 'HLL har unique id yaad rakhe bina unique count ka andaaza kaise rakhta hai?',
          choices: [
            'Hash patterns ka register summary rakhta hai; precision se register count chunta hai',
            'Har unique id compress karke rakhta hai; badhti cardinality par bhi bytes fixed hain',
            'Har unique id ka fixed hissa rakhta hai; sample badhe toh bachi ids disk par jaati hain',
            'Har unique id ka exact hash rakhta hai; memory bhare toh purane hashes disk par jaate hain',
          ],
          answer: 0,
          explain: 'HLL original ids ki list ke bajay hash patterns ka register summary rakhta hai. Chuni hui precision par core register count cardinality ke saath nahi badhta; estimate approximate hota hai. Sparse encodings chhote sets par storage size badal sakti hain. Fixed core registers ka matlab har encoding mein har waqt same allocated bytes nahi.',
          choiceExplanations: [
            'HLL original ids ki list ke bajay hash patterns ka register summary rakhta hai. Chuni hui precision par core register count cardinality ke saath nahi badhta; estimate approximate hota hai. Sparse encodings chhote sets par storage size badal sakti hain. Fixed core registers ka matlab har encoding mein har waqt same allocated bytes nahi.',
            'Har unique id ka lossless compressed record rakhoge toh set badhne par memory badhegi; HLL list nahi rakhta.',
            'HLL fixed percentage wala growing sample aur exact overflow store nahi rakhta; core register summary hai.',
            'HLL disk par exact ids spill karke count nahi nikaalta; register statistics se estimate karta hai.',
          ],
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
        q: 'Random short code allocate karna hai. Bloom filter ke saath uniqueness kaise pakki karoge?',
        choices: [
          'Negative par lookup bachao, par final claim DB ke atomic UNIQUE insert se karo',
          'Negative par seedha code do, phir DB mein uniqueness ki jaanch baad mein karo',
          'Positive par code taken maano, phir user ko exact collision ka result dikha do',
          'Positive par naya code lo, par concurrent writers ki final DB claim ko chhod do',
        ],
        answer: 0,
        explain: 'Complete aur fresh insert-only filter ka negative unnecessary lookup bacha sakta hai. Positive false ho sakta hai. Concurrent writers ya filter lag se bachne ke liye DB mein atomic UNIQUE insert/claim final guard hai. Filter uniqueness ka authoritative record nahi; positive candidates chhodna policy ho sakti hai, exact existence ka proof nahi.',
        choiceExplanations: [
          'Complete aur fresh insert-only filter ka negative unnecessary lookup bacha sakta hai. Positive false ho sakta hai. Concurrent writers ya filter lag se bachne ke liye DB mein atomic UNIQUE insert/claim final guard hai. Filter uniqueness ka authoritative record nahi; positive candidates chhodna policy ho sakti hai, exact existence ka proof nahi.',
          'Negative filter response concurrent writer ka claim nahi rokta; final atomic uniqueness guard abhi chahiye.',
          'Positive ka matlab shayad present hai; exact collision batane ke liye authoritative check chahiye.',
          'Naya candidate chunne se do writers ki race nahi hat-ti; final unique claim phir bhi chahiye.',
        ],
      },
      {
        q: 'Bloom filter ki memory aur hash count chunne ka shuruati hisaab kya hoga?',
        choices: [
          'Expected items aur error budget chuno, phir bits aur hash count nikalo',
          'Har item ko 10 bits do, phir har workload ke error budget ko poora maan lo',
          'Bachi RAM jitni bits do, phir expected item count ko planning se hata do',
          'Hashes ki ginti badhaate raho, phir bits ka same size har budget par rakh do',
        ],
        answer: 0,
        explain: 'Expected item count n aur acceptable false-positive probability p chuno. Required bits m = -n ln(p)/(ln 2)^2; achha hash count k lagbhag (m/n) ln 2 hai. Positive galat ho toh cost kya hai, pehle tay karo. Exact correctness chahiye toh authoritative verification rakho; har approximate application ka contract alag ho sakta hai.',
        choiceExplanations: [
          'Expected item count n aur acceptable false-positive probability p chuno. Required bits m = -n ln(p)/(ln 2)^2; achha hash count k lagbhag (m/n) ln 2 hai. Positive galat ho toh cost kya hai, pehle tay karo. Exact correctness chahiye toh authoritative verification rakho; har approximate application ka contract alag ho sakta hai.',
          '10 bits/item ek error range se juda estimate hai; har error target ke liye kaafi nahi.',
          'Bits ke saath expected cardinality badhegi toh false-positive rate bhi badlega; RAM akeli target nahi batati.',
          'Optimal count ke baad zyada hashing cost aur bit occupancy badha kar false-positive rate bigaad sakti hai.',
        ],
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
    { front: 'Bloom filter kya bolta hai?', back: "<b>\"Pakka nahi hai\"</b> (hamesha sach) ya <b>\"shayad hai\"</b> (kabhi-kabhi jhooth). Healthy,complete insert-only filter mein false negative nahi;lag,corruption aur unsafe deletion scope ke bahar hain. Isi asymmetry se woh kaam ka hai." },
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
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'vnodes' && r.vnodes === 150 && s.sys.ring?.vnodes === 150 && r.skew < 1.1) },
  { text: 'node-5 jodo — aur dekho kitni keys move hui',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'add' && s.sys.ring?.nodes.includes('node-5')) },
  { text: 'Aur dekho ki hash % N mein kitni move hoti (bahut zyada)',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'add' && r.modPct > r.movedPct * 2) },
  { text: 'Ab node-2 hatao — sirf node-2 ki keys baaki nodes mein bantein',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'remove' && r.movedPct < 40 && !s.sys.ring?.nodes.includes('node-2') && r.revision === s.revision) },
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
     lagbhag barabar ho jaata hai (150 vnodes par skew kaafi kam — kitna, nodes aur keys par depend; lab 34 ke ek run mein 1.2x).</p>
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
      success: SD.allTasks(T_RING),
      successText: "Simulator mein vnodes ne asantulan 1.89x se 1.01x kar diya. Node jodne par ring ne lagbhag 17.5% keys hilaayi; modulo wale tareeke mein lagbhag 80% hilti. Asli cluster mein bantwaara aur node girne ka bojh alag se naapo.",
      solution: [
        "ring show",
        "ring set vnodes 150",
        "ring add node-5",
        "ring remove node-2",
      ],
      verify: s => { const m = SD.mission; return s.sys.ring?.vnodes === 150 && s.sys.ring.nodes.includes('node-5') && !s.sys.ring.nodes.includes('node-2') && m.current(s, 'ring', r => r.op === 'remove' && r.movedPct < 40); },
      hints: [
        'Pehle `ring show` chalao aur node-wise keys dekho. Sirf ring bana dene se barabar load nahi milta; skew ka baseline pakdo.',
        '`ring set vnodes 150` ke baad distribution dekho. `ring add <node>` mein moved keys ko hash % N se milao; `ring remove <node>` par ring sirf hataye node ki ownership dobara baantti hai.',
        'Poora raasta — har command alag Enter se chalao:\nring show\nring set vnodes 150\nring add node-5\nring remove node-2',
      ],
    },
    {
      type: 'quiz',
      title: 'Ring ki samajh',
      questions: [
        {
          q: 'Same hash aur stable node labels par modulo routing 4 se 5 nodes ho gayi. Uniform hashes par kitna remap?',
          choices: [
            'Lagbhag 80% keys — hash % 4 aur hash % 5 adhiktar residues par alag milte hain',
            'Lagbhag 20% keys — sirf naye node ko mili keys ka route badalta maana jaata hai',
            'Lagbhag 25% keys — purane chaar nodes mein se ek ka hissa badalta maana jaata hai',
            'Lagbhag 0% keys — same hash rehne se node ka remainder bhi same maana jaata hai',
          ],
          answer: 0,
          explain: 'Uniform hash residues modulo 20 aur stable labels 0..N-1 maano. 20 residues mein 4 par h%4 = h%5, 16 par alag: 16/20 = 80% remap. Hash same hai, modulus badla hai. Actual keys ka percentage hash distribution aur node-list labeling par depend karega.',
          choiceExplanations: [
            'Uniform hash residues modulo 20 aur stable labels 0..N-1 maano. 20 residues mein 4 par h%4 = h%5, 16 par alag: 16/20 = 80% remap. Hash same hai, modulus badla hai. Actual keys ka percentage hash distribution aur node-list labeling par depend karega.',
            '20% naye node ka balanced share hai; modulo purane nodes ke beech bhi kaafi keys remap karta hai.',
            'Purane node ka 25% share expansion ke total remap ka formula nahi; residues compare karo.',
            'Same hash ka 4 aur 5 se remainder alag ho sakta hai; node routing remainder se nikalti hai.',
          ],
        },
        {
          q: 'Balanced N-node consistent-hash cluster mein ek barabar-capacity node jodo. Ideal movement kitna?',
          choices: [
            'Lagbhag 1/(N+1) keys naye node par; baaki owners ka zyada hissa reh sakta hai',
            'Lagbhag 1/2 keys naye node par; purane nodes kitne bhi hon, aadha hissa chahiye',
            'Lagbhag zero keys naye node par; node jodne par data transfer bachna chahiye',
            'Lagbhag saari keys naye node par; ring ka naya member pehla owner banta hai',
          ],
          answer: 0,
          explain: 'Expansion ke baad total N+1 barabar-capacity nodes hain; naye node ka ideal balanced share 1/(N+1) hai. Consistent hashing baaki ownership ka zyada hissa bachata hai. Real ring mein token placement, vnodes aur weights se movement aur skew alag ho sakte hain.',
          choiceExplanations: [
            'Expansion ke baad total N+1 barabar-capacity nodes hain; naye node ka ideal balanced share 1/(N+1) hai. Consistent hashing baaki ownership ka zyada hissa bachata hai. Real ring mein token placement, vnodes aur weights se movement aur skew alag ho sakte hain.',
            'Naye node ka target share total N+1 nodes se aata hai; har expansion mein aadha nahi.',
            'Naye node ko zero keys doge toh storage/load ka hissa nahi milega; useful expansion mein movement chahiye.',
            'Ring par naya node keyspace ka hissa leta hai, poori keyspace nahi.',
          ],
        },
        {
          q: 'Har physical node ring par sirf ek random point par hai. Kya risk hai?',
          choices: [
            'Unequal intervals se keys tedhi bant sakti hain; failure par padosi ka load badhe',
            'Kaafi keys aate hi intervals barabar ho jaayenge; failure load khud bant jaayega',
            'Same node count se har interval barabar hoga; padosi ki capacity dekhni nahi padegi',
            'Node failure par ring baaki owners ko na chhooegi; failed keys ko route nahi milega',
          ],
          answer: 0,
          explain: 'Ek random point per node par ring intervals unequal ho sakte hain. Simple next-owner routing mein failed interval padosi ko mil sakta hai. Vnodes physical node ko kai intervals dete hain; failed load kai owners tak bant sakta hai. Har owner ko barabar failover load ya 150 vnodes par fixed skew milna guaranteed nahi.',
          choiceExplanations: [
            'Ek random point per node par ring intervals unequal ho sakte hain. Simple next-owner routing mein failed interval padosi ko mil sakta hai. Vnodes physical node ko kai intervals dete hain; failed load kai owners tak bant sakta hai. Har owner ko barabar failover load ya 150 vnodes par fixed skew milna guaranteed nahi.',
            'Zyada keys wahi unequal geometry ko aur saaf sample karengi; token intervals khud barabar nahi honge.',
            'Node count barabar hone se random points ki distances equal nahi hoti; capacity planning abhi chahiye.',
            'Failed node hataane par next surviving owner ko routes milte hain; cached data na ho toh misses aa sakte hain.',
          ],
        },
        {
          q: 'Ek popular key par request load bahut zyada hai. Consistent hashing akeli kya kar sakti hai?',
          choices: [
            'Kai keys ka ownership baant sakti hai; ek hot key ka load ek owner par rehta hai',
            'Vnodes se same key har request par alag owner ko milegi; load sab nodes mein batega',
            'Nodes badhne se same value apne aap tootegi; ek read kai owners se poori hogi',
            'Uniform hash se request popularity barabar hogi; hot key ka load halka ho jaayega',
          ],
          answer: 0,
          explain: 'Consistent hashing membership changes par remapping ko simit karti hai. Vnodes keyspace baantte hain; ek hot key ki popularity ko nahi. Local cache, read replicas ya explicit key copies ke saath read load baant sakte ho. Har design mein routing, writes aur freshness ka alag sauda hai.',
          choiceExplanations: [
            'Consistent hashing membership changes par remapping ko simit karti hai. Vnodes keyspace baantte hain; ek hot key ki popularity ko nahi. Local cache, read replicas ya explicit key copies ke saath read load baant sakte ho. Har design mein routing, writes aur freshness ka alag sauda hai.',
            'Vnodes par deterministic routing same key ka owner chunti hai; har request automatic random copy par nahi jaati.',
            'Value partitioning alag app design hai; node jodne se same value khud tukdon mein nahi banti.',
            'Uniform keys aur uniform request load alag hain; ek key ko bahut zyada reads mil sakti hain.',
          ],
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
        q: 'Redis Cluster ko 4 se 8 primaries karna hai. Rebalance ka plan kaise banao?',
        choices: [
          'Hash-slot migration dheere karo; data movement aur origin/cold-path load naapo',
          'Consistent-hash ring par nodes jodo; Redis slots ko bina move kiye ready maano',
          'Aadhi keys ka owner badle toh loss maano; migration ki copies ko jaanchna chhodo',
          'Naye primaries start karo; slot ownership aur client redirects baad mein dekho',
        ],
        answer: 0,
        explain: 'Redis Cluster consistent-hash ring ke bajay 16,384 fixed hash slots rakhta hai. Balanced 4 se 8 expansion mein naye primaries lagbhag aadhe slots le sakte hain; key count/bytes skew alag ho sakta hai. Live slot migration keys transfer kar sakti hai, har moved key cache miss nahi banti. Migration load, redirects, hit rate aur origin pressure naapo aur baandho.',
        choiceExplanations: [
          'Redis Cluster consistent-hash ring ke bajay 16,384 fixed hash slots rakhta hai. Balanced 4 se 8 expansion mein naye primaries lagbhag aadhe slots le sakte hain; key count/bytes skew alag ho sakta hai. Live slot migration keys transfer kar sakti hai, har moved key cache miss nahi banti. Migration load, redirects, hit rate aur origin pressure naapo aur baandho.',
          'Redis Cluster slots ka ownership badalta hai; generic ring add akela Redis resharding nahi karta.',
          'Ownership transfer data loss ka matlab nahi; migration copied keys ko nayi jagah serve kar sakti hai.',
          'Primaries start hone se slots automatic balanced nahi ho jaate; routing aur migration plan chahiye.',
        ],
      },
      {
        q: 'Explicit tenant-to-shard mapping kab consistent hashing se zyada seedha control de sakti hai?',
        choices: [
          'Hot tenant ko specific shard par move karna ho aur mapping sambhaal sako',
          'Har client ko sirf node list se owner chahiye, central mapping rakhna nahi hai',
          'Har tenant ke data ko sab shards se padhna ho, directory ko JOIN engine maano',
          'Har read ko alag node par bhejna ho, directory ko read-load balancer maano',
        ],
        answer: 0,
        explain: 'Tenant-to-shard directory se hot tenant ko specific shard par route ya migrate karne ka seedha control milta hai. Mapping availability, updates aur migration ka protocol sambhaalna padega. Ring, modulo aur directory alternatives hain; stable membership mein bhi owner dhoondhne ka tareeka chahiye. Ring implementations bhi manual placement controls rakh sakti hain.',
        choiceExplanations: [
          'Tenant-to-shard directory se hot tenant ko specific shard par route ya migrate karne ka seedha control milta hai. Mapping availability, updates aur migration ka protocol sambhaalna padega. Ring, modulo aur directory alternatives hain; stable membership mein bhi owner dhoondhne ka tareeka chahiye. Ring implementations bhi manual placement controls rakh sakti hain.',
          'Sirf node list se local owner nikaalna hash routing ka faayda hai; directory mapping ko available rakhna padega.',
          'Directory owner dhoondhti hai; cross-shard JOIN execute ya local nahi banaati.',
          'Tenant-to-shard directory placement tay karti hai; read replicas par load baantna alag design hai.',
        ],
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
    { front: 'Virtual nodes kyun?', back: 'Do wajah: (1) <b>skew</b> — ek jagah baithne se koi node 45% le leta hai; (2) <b>cascade</b> — node girne par uska poora load ek padosi par. Vnodes se skew bahut ghat-ta hai (lab 34 ke ek run mein 1.2x), aur girne wale node ka load kai nodes mein bant sakta hai.' },
    { front: 'Ring lookup?', back: 'vnode hashes ki <b>sorted list</b> + binary search (pehla point jo key se bada ho) + <b>wrap-around</b> (koi bada na mile toh pehla point). Wrap bhoolna sabse aam bug hai.' },
    { front: 'Consistent hashing hot key theek karti hai?', back: '<b>Nahi.</b> Woh keys ko baantti hai, <b>ek key ko nahi</b>. Hot key ke liye: key ki N copies ya local cache.' },
    { front: 'Kab ring NAHI chahiye?', back: 'Jab shard set stable ho — tab <b>explicit mapping</b> (tenant → shard table) behtar hai: hot tenant ko haath se move kar sakte ho, aur "data kahan hai" pakka pata hota hai.' },
  ],
},
]);

})();
