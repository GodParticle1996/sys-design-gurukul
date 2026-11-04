/* =====================================================================
   "Intermediate System Design" episodes (Akhil Sharma) — purane topics ko
   gehra karna + jo bilkul naye hain unke level

   User ka niyam: jo topic pehle se app mein hai, uska naya level mat banao —
   purane level ko badhao (SD.extendLevel). Naye levels sirf wahan jahan
   topic sach mein naya hai.

     resil/shedding  ← Ep 2 Backpressure: graduated ladder, hysteresis, tiers
     resil/backpressure (NAYA, shedding ke baad) ← Ep 2 — lab 15
     resil/breaker   ← Ep 2: dead-but-slow dependency
     resil/blast     ← AWS $200B video: shuffle sharding ka lab (lab 20)
     resil/replication + resil/replicas-backups (NAYE, blast ke baad) ← Ep 7 — lab 32
     data/caching    ← Ep 6: TTL ka sauda, CDC invalidation pipeline
     data/stampede   ← Ep 6: mutex vs SWR vs early refresh — lab 33
     data/cache-invalidation (NAYA, stampede ke baad) ← Ep 6 — lab 33
     data/conshash   ← Ep 5: numbers, failure timeline, kab nahi — lab 34
     data/pool       ← Ep 4: pooler, modes, cores×2, storm — lab 35
     dist/locks      ← Ep 3: pause problem, Redlock bahas, lease — lab 36
     dist/lock-choices (NAYA, locks ke baad) ← Ep 3 — lab 36

   ⚠️ data-ext-videos.js ke BAAD load ho (locks/contention wahan badhte hain,
   aur registerLevelsAfter ko target chahiye).
   ===================================================================== */
(function () {

/* =====================================================================
   1. resil/shedding — graduated ladder, hysteresis, priority tiers
   ===================================================================== */
SD.extendLevel('shedding', {
  objectives: [
    '<b>Graduated ladder</b> (50% warn → 75% low-priority shed → 90% reject) + hysteresis',
    'Priority tiers pehle se tay — aur starvation ke liye age boosting',
  ],
  lesson: [
    `<h3>🪜 Ek switch nahi, ek seedhi</h3>
     <p>Shedding ek on/off switch nahi. Seedhi ki tarah:</p>
     <pre>50% bhara  → log warning
75% bhara  → low-priority (analytics, crawlers) girao
90% bhara  → naye writes reject</pre>
     <p>Aur <b>hysteresis</b>: 90% par chalu hua reject 80% par hi band ho — warna har tick par on-off (flapping).</p>
     <h3>🏷️ Tiers pehle se likho</h3>
     <table>
       <tr><th>Tier</th><th>Misaal</th><th>Kab girao</th></tr>
       <tr><td>Critical</td><td>Payments, auth</td><td>Last resort; bounded admission phir bhi</td></tr>
       <tr><td>Standard</td><td>Paying customer ka API</td><td>Aakhir mein</td></tr>
       <tr><td>Background</td><td>Webhooks, exports</td><td>Pehle</td></tr>
       <tr><td>Batch</td><td>Analytics, crawlers</td><td>Turant</td></tr>
     </table>
     <p>Trip-service design example: internal analytics pehle shed ho sakta hai; yeh Uber ki current internal policy ka claim nahi. Aur <b>priority starvation</b> se bachne ke liye <b>age boosting</b> — jo 1
     minute se line mein hai, uski priority badhao.</p>`,
  ],
  cards: [
    { front: 'Shedding ki graduated ladder?', back: '50% warn → 75% low-priority shed → 90% naye writes reject; hysteresis se (90% par on, 80% par off) flapping nahi.' },
    { front: 'Priority starvation ka ilaaj?', back: 'Age boosting — jo request 1 min se zyada line mein hai, uski priority badhao.' },
  ],
});

/* =====================================================================
   2. resil/breaker — dead-but-slow dependency
   ===================================================================== */
SD.extendLevel('breaker', {
  lesson: [
    `<h3>🐌 Mara hua nahi — dheema: sabse khatarnak dependency</h3>
     <p>Downstream errors nahi deta, bas har request par <b>30 second</b> leta hai. Tumhare 50 threads ek-ek karke usi ke intezaar mein
     atakte hain → 50 requests ke baad <b>poori service</b> band, jabki tumhara apna code bilkul theek hai.</p>
     <p>Breaker: lagataar 5 failures (timeouts bhi) → OPEN (turant fail) → 30 sec cooldown → ek test request → CLOSE ya OPEN. Yaad rakho:
     breaker <b>tumhe</b> bachata hai — tumhare threads, tumhari memory — downstream ko nahi (woh bonus hai).</p>`,
  ],
  interview: [
    {
      q: 'Interviewer: "Ek dependency errors nahi de rahi, bas 30 sec leti hai. Hamari service kyun giri?"',
      choices: [
        'Har request thread/connection pakad ke ruki — pool bhar gaya; timeout + breaker + bulkhead',
        'Errors aaye hi nahi, toh connections ka bharna mumkin hi nahi tha — wajah kahin aur',
        'CPU kam tha, toh threads khatam hona namumkin tha — wajah CPU ke bahar dhoondho',
        'Aur replicas jod do — zyada replicas latke intezaar ko apne aap sambhal lenge',
      ],
      answer: 0,
      explain: 'Lamba service time ek saath chal rahi requests badhata hai aur pool bhar deta hai. Har request jawab aane tak resources pakde rehti hai — CPU kam hote hue bhi. Deadline (chhota timeout), bulkhead, aur timeouts ko failure ginne wala breaker chahiye.',
      choiceExplanations: [
        'Lamba service time ek saath chal rahi requests badhata hai aur pool bhar deta hai. Har request jawab aane tak resources pakde rehti hai — CPU kam hote hue bhi. Deadline (chhota timeout), bulkhead, aur timeouts ko failure ginne wala breaker chahiye.',
        'Dheemi call error nahi deti, bas connection pakde rehti hai — pool bhar jaata hai.',
        'Intezaar karte threads CPU nahi khaate — CPU kam hote hue bhi threads khatam ho sakte hain.',
        'Naye replicas bhi usi 30 second ke intezaar mein phans jaayenge.',
      ],
    },
  ],
  cards: [
    { front: 'Dead-but-slow dependency?', back: 'Errors nahi, bas 30 s per request → tumhare threads uske intezaar mein → pool bhara → poori service band. Ilaaj: timeout + breaker (timeouts gine) + bulkhead.' },
  ],
});

/* =====================================================================
   3. resil/blast — shuffle sharding ka asli lab
   ===================================================================== */
SD.extendLevel('blast', {
  lesson: [
    `<h3>🎲 Route 53 ke numbers</h3>
     <p>Ek zeher wali request (poison) jo har worker ko crash kare jise woh chhuye — aur client retry use aage le jaaye:</p>
     <ul>
       <li><b>Koi sharding nahi</b> (8 workers sab ke): retry ne saare 8 maare → sab band.</li>
       <li><b>Plain sharding</b> (4 × 2): us shard ke saare customers band (~1/4).</li>
       <li><b>Shuffle sharding</b>: har customer ka apna 2-of-8 jodi → C(8,2) = 28 combinations → exact same jodi sirf ~1/28 (&lt;4%);
       baaki ka ek worker mara bhi toh retry dusre par.</li>
     </ul>
     <p>100 workers, har customer ko 5 → C(100,5) = <b>75,287,520</b> combinations (video mein ek jagah "800" bola — galat). Hardware 12.5×,
     combinations ~27 lakh ×. <b>Same hardware — sirf assignment badla.</b></p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek zeher wali request, 8 asli worker processes',
      project: '20-aws',
      exercise: 'ex2-shuffle-shard',
      goal: 'Customer 7 ki poison request — none / shard / shuffle mein kitne workers mare aur kitne customers poore band?',
      why: `<code>services/fleet.js</code> 8 asli worker processes chalata hai; poison request par worker <code>process.exit</code>. <code>services/router.js</code>
        fail par customer ke agle worker par retry karta hai — retry hi zeher aage le jaata hai.`,
      steps: [
        { text: 'Fleet + router chalao.', cmd: 'cd docker-labs/20-aws && npm start ex2-shuffle-shard', expect: 'ex2-shuffle-shard\n[fleet] :4931 — 8 workers :4940..4947\n[router] :4932 — SHARDING=shuffle, 100 customers' },
        { text: 'Teeno tareeke.', cmd: 'node tools/poison.js', expect: 'none         8 / 8  (saare 8)                  99 / 99            0\nshard        2 / 8  (4946,4947)                24 / 99            0\nshuffle      2 / 8  (4942,4947)                 3 / 99            43\n\nCombinations: C(8,2) = 28 → kisi aur customer ka EXACT same jodi hone ka chance 1/28 (< 4%).\nRoute 53 jaisa: 100 workers, har customer ko 5 → C(100,5) = 75,287,520 combinations.' },
      ],
      observe: {
        q: 'Shuffle mein 43 customers ka ek worker mara, phir bhi 43 customers bache. Kyun?',
        choices: [
          'Doosra diya hua worker zinda tha — sirf 3 ki poori jodi wahi thi; retry doosre par gaya',
          'Thode overlap wale customers ke dono workers mare the, phir bhi kisi tarah bache',
          'Router ne cache se saare safal jawab bana ke de diye, worker ki zaroorat nahi',
          'Wahi jodi wale customers ko apne aap ek teesra worker mil gaya, bina niyam',
        ],
        answer: 0,
        explain: 'Lab mein do-worker jodiyon mein thode overlap wale customers ke paas ek doosra worker bacha tha; poori jodi same wale (3 customers) dono kho baithe. Thoda aur poora overlap alag cases hain.',
        choiceExplanations: [
          'Lab mein do-worker jodiyon mein thode overlap wale customers ke paas ek doosra worker bacha tha; poori jodi same wale (3 customers) dono kho baithe. Thoda aur poora overlap alag cases hain.',
          'Thode overlap mein ek hi worker saajha tha — doosra zinda raha.',
          'Jawab bache hue worker se aaye, cache se nahi.',
          'Teesra worker dene ka koi niyam set nahi tha.',
        ],
      },
      lesson: 'Shuffle sharding: hardware wahi, assignment alag — blast radius 1/4 se ~1/28.',
    },
  ],
  cards: [
    { front: 'Lab 20: poison request?', back: 'None: 99/99 band. Shard (4×2): 24/99. Shuffle (2-of-8): 3/99, aur 43 ne overlap ke bawajood retry se bach gaye.' },
  ],
});

/* =====================================================================
   4. data/caching — TTL ka sauda, CDC invalidation pipeline
   ===================================================================== */
SD.extendLevel('caching', {
  objectives: ['TTL aur CDC invalidation ka freshness contract; races, lag aur every cache layer'],
  lesson: [
    `<h3>🤝 TTL = users se ek sauda</h3>
     <p>TTL stale window limit karne ka ek control hai; actual freshness fill race, upstream lag aur other cache layers se depend karti hai. Price/inventory/permissions mein allowed staleness domain contract se decide karo; authoritative action par current invariant validate karo.
     Lamba TTL = ghanton purana; chhota = lagatar misses.</p>
     <h3>🛰️ CDC invalidation pipeline</h3>
     <p>Cache-aside mein cache ko pata hi nahi ki DB badla. Toh DB ke <b>write-ahead log</b> (wahi jo crash recovery aur replication ke liye
     hai) ko padho:</p>
     <pre>App → DB → WAL → Debezium (WAL tail, har insert/update/delete ka event) → Kafka (retention, replication aur durable offsets ke andar recovery buffer)
    → chhota invalidation consumer (change → kaunsi keys) → Redis DEL          end-to-end delay workload se measure karo</pre>
     <p>Product/price/inventory updates ko CDC se cache tak la sakte ho; lag, lost invalidation, reconnect aur stale-refill race verify karo. Yeh reference pattern hai, Shopify ke current internal implementation ka claim nahi. (Poora khel — tags, versions, L1 —
     agle level "Cache Invalidation" mein, lab ke saath.)</p>`,
  ],
  cards: [
    { front: 'CDC cache invalidation?', back: 'DB WAL → CDC → retained stream → invalidator → relevant cache layers. Lag, retention recovery aur refill race test karo. Async invalidation instantaneous consistency guarantee nahi.' },
  ],
});

/* =====================================================================
   5. data/stampede — mutex vs SWR vs probabilistic early refresh (lab)
   ===================================================================== */
SD.extendLevel('stampede', {
  lesson: [
    `<h3>🐃 Hot key expire hui — teen ilaaj, asli numbers</h3>
     <p>Hot key (homepage listing, pricing) expire → 1,000 ek saath misses → 1,000 ek jaisi DB queries ek second mein → DB (jo cache ke peeche
     50 qps ka aadi tha) gir sakta hai.</p>
     <table>
       <tr><th>Ilaaj</th><th>Kaise</th><th>Keemat</th></tr>
       <tr><td>Mutex (single-flight)</td><td>Pehla lock le ke rebuild, baaki intezaar</td><td>Rebuild 2 sec ho toh 1,000 log 2 sec ruke</td></tr>
       <tr><td>Stale-while-revalidate</td><td>Purana do, peeche ek refresh</td><td>Thodi der purana data (CDNs saalon se)</td></tr>
       <tr><td>Probabilistic early expiry</td><td>Expire ke paas har request thode chance se pehle refresh</td><td>Kam traffic wali keys par bharosa nahi</td></tr>
     </table>
     <pre>lab 33 — expire ke baad 1,000 requests ek saath, DB read 400 ms:
none     757 DB reads (739 ek saath)   p50 1087 ms   p99 1339 ms
mutex      3 DB reads                  p50  457 ms   p99  472 ms
swr        3 DB reads                  p50  122 ms   p99  217 ms   (thodi der stale)
xfetch     3 DB reads                  p50  122 ms   p99  226 ms   (key kabhi thandi hi nahi hui)</pre>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 1,000 requests, hot key abhi expire hui',
      project: '33-cache-invalidation',
      exercise: 'ex1-invalidation',
      goal: 'Hot key ka TTL khatam hote hi 1,000 requests — none / mutex / swr / xfetch: DB par kitni queries, aur burst ka p99.',
      why: `<code>services/app.js</code> (do instances) mein chaaron strategies; <code>services/db.js</code> is test mein har read 400 ms (bhaari query).
        <code>tools/stampede.js</code> 1.9 sec steady traffic, phir expire ke 80 ms baad burst.`,
      steps: [
        { text: 'DB + cache + 2 apps + invalidator chalao.', cmd: 'cd docker-labs/33-cache-invalidation && npm start ex1-invalidation', expect: 'ex1-invalidation\n[db] :5111\n[cache] :5112\n[app1] :5113\n[app2] :5114\n[invalidator] :5115 enabled=true' },
        { text: 'Stampede test.', cmd: 'node tools/stampede.js', expect: 'none          757 (ek saath 739)    1087 ms    1339 ms   nahi\nmutex           3 (ek saath   2)     457 ms     472 ms   nahi\nswr             3 (ek saath   2)     122 ms     217 ms   haan (thodi der ke liye)\nxfetch          3 (ek saath   2)     122 ms     226 ms   nahi' },
      ],
      observe: {
        q: 'Lab ke recorded run mein mutex par 3 DB reads aur burst p50 457 ms tha. Requests kis baat par ruki?',
        choices: [
          'Har app ke callers apni shared DB rebuild poori hone ka intezaar kar rahe the',
          'Har caller ko mutex ka taala lene mein hi fixed 400 ms ka samay lag raha tha',
          'Har caller ko pehle purana price mila, phir DB rebuild ka jawab lena pad raha tha',
          'Har caller ko mutex ne alag DB query di, par DB saari queries saath kar raha tha',
        ],
        answer: 0,
        explain: 'Lab mein DB rebuild ka kaam 400 ms ka hai. Har app ki inflight map ek key ka rebuild jodti hai; baaki callers nateeje ka intezaar karte hain. Recorded 3 reads mein warm-up bhi shaamil hai. SWR purana value de sakta hai agar staleness manzoor ho. 457 ms p50 recorded run ka hai, lock ka fixed overhead nahi.',
        choiceExplanations: [
          'Lab mein DB rebuild ka kaam 400 ms ka hai. Har app ki inflight map ek key ka rebuild jodti hai; baaki callers nateeje ka intezaar karte hain. Recorded 3 reads mein warm-up bhi shaamil hai. SWR purana value de sakta hai agar staleness manzoor ho. 457 ms p50 recorded run ka hai, lock ka fixed overhead nahi.',
          '400 ms DB rebuild ka configured samay hai; mutex lene ka fixed samay nahi.',
          'Mutex path fresh rebuild ka nateeja wait karta hai. Purana value turant dena SWR ka alag behavior hai.',
          'Mutex path har app mein same key ka refresh jodta hai, har caller ke liye alag query nahi bhejta.',
        ],
      },
      lesson: 'Stampede ke teen ilaaj — sabne DB bachaya, farq latency aur staleness mein.',
    },
  ],
  cards: [
    { front: 'Lab 33: stampede?', back: 'None: 757 DB reads (sabse zyada 739 ek saath). Mutex/SWR/xfetch: 3 reads. Mutex p50 457 ms (intezaar), SWR/xfetch ~122 ms.' },
  ],
});

/* =====================================================================
   6. data/conshash — numbers, failure timeline, kab nahi (lab 34)
   ===================================================================== */
SD.extendLevel('conshash', {
  lesson: [
    `<h3>🧮 Numbers (asli cache nodes par)</h3>
     <pre>lab 34 — 6 cache node processes, 1 lakh keys:
mode       load max/min      node mara → miss (DB)   node joda → keys hilin
modulo     1.0×              83.3%                   85.9%
ring       28.6×             26.6%                    8.9%
vnodes     1.2×              17.7%                   14.3%
weighted   2.1× (jaan-boojh) 15.1%                   12.5%</pre>
     <p>Modulo: load ekdum barabar par N badla toh lagbhag sab hila → ~83,000 keys ka cache thanda; un keys ki agli reads DB par jaayengi. Ek point per node: load 28× tedha. Vnodes:
     barabar + sirf zaroori keys hilin. Weighted: bade server ko zyada vnodes → zyada hissa, routing code wahi.</p>
     <h3>⏱️ Production mein node mara — timeline</h3>
     <ol>
       <li><b>Detect</b> — health checks har kuch sec, kuch failures → mara (~5–30 sec).</li>
       <li>Har client ko <b>naya ring</b> pata chale (config push / service discovery).</li>
       <li>Remap hui keys miss → DB se → cache.</li>
     </ol>
     <p>Pure cache (Memcached): kuch sec ka chhota miss bump. <b>Database</b> (Cassandra, DynamoDB): DB se dobara bana nahi sakte → har key ring par
     agle 2–3 nodes par <b>replicate</b>; replica ke paas data pehle se. Aam taur par &lt;2 min thodi badhi latency, outage nahi. (Memcached client
     <b>Ketama</b>, Cloudflare/Akamai edge routing, Discord gateways.)</p>
     <p class="tip">⚖️ Kab <b>nahi</b>: servers ki ginti fixed hai, ya resharding ke liye maintenance window chal jaata hai → modulo seedha aur theek.
     Consistent hashing badlaav ko muft nahi banata — nuksaan ko <b>simit</b> karta hai (blip vs miss storm).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 7 cache nodes, 1 lakh keys, chaar routing',
      project: '34-consistent-hashing',
      exercise: 'ex1-ring',
      goal: 'modulo / ring / vnodes / weighted — load skew, ek node marne par cache miss, ek node jodne par kitni keys hilin.',
      why: `<code>lib/router.js</code> = client ka router. Nodes asli processes (5121–5127) hain; misses asli <code>mget</code> se gine jaate hain.`,
      steps: [
        { text: '7 nodes chalao.', cmd: 'cd docker-labs/34-consistent-hashing && npm start ex1-ring', expect: 'ex1-ring\n[cache-node] :5121 … [cache-node] :5127' },
        { text: 'Rehash test.', cmd: 'node tools/rehash.js', expect: 'modulo      16761 / 16561  =   1.0x                          83288 (83.3%)                       85865 (85.9%)\nring        26583 / 931    =  28.6x                          26583 (26.6%)                        8928 (8.9%)\nvnodes      17722 / 14933  =   1.2x                          17722 (17.7%)                       14312 (14.3%)\nweighted    28472 / 13280  =   2.1x (node1 weight 2 → 28472)  15088 (15.1%)                       12534 (12.5%)' },
      ],
      observe: {
        q: 'Lab ke recorded run mein modulo load ratio ~1.0x tha, par resize par 83-86% routes badle. Lesson?',
        choices: [
          'Placement ke saath membership change ka remap aur cold-path load bhi gino',
          'Barabar placement se cached values safe hain; remap ka DB par kharcha nahi gino',
          'Barabar placement se resize muft hai; node-list update ko hi poora rebalance maano',
          'Barabar placement CPU bachata hai; 83-86% ko modulo calculation ka timeout maano',
        ],
        answer: 0,
        explain: 'Lab ke recorded run mein 6 se 5 nodes par 83.3% routes badle, aur 6 se 7 par 85.9%. Modulo ka normal placement balanced tha, par membership badli toh bahut routes badle. Cold cache se origin ka load badh sakta hai. Percentages run ke hain; router CPU latency ka measurement nahi.',
        choiceExplanations: [
          'Lab ke recorded run mein 6 se 5 nodes par 83.3% routes badle, aur 6 se 7 par 85.9%. Modulo ka normal placement balanced tha, par membership badli toh bahut routes badle. Cold cache se origin ka load badh sakta hai. Percentages run ke hain; router CPU latency ka measurement nahi.',
          'Key count balanced hone se new owner ke paas value pehle se hone ka proof nahi milta.',
          'Node list badalne ke baad keys ka route aur data/cold-path ka kaam bhi sambhaalna padta hai.',
          'Tool routing changes aur misses ginta hai; 83-86% CPU timeouts ka number nahi.',
        ],
      },
      lesson: 'Consistent hashing ka asli kaam: node badle toh sirf ~1/N keys hilein.',
    },
  ],
  cards: [
    { front: 'Lab 34: node mara toh miss?', back: 'Modulo 83.3%, ring 26.6% (tedha load), vnodes 17.7% (~1/6), weighted 15.1%.' },
    { front: 'Node marne ki timeline?', back: 'Detect (~5–30 s) → clients ko naya ring → remapped keys miss → DB se. Cache: chhota bump. DB (Cassandra): agle 2–3 nodes par replicas.' },
  ],
});

/* =====================================================================
   7. data/pool — pooler, modes, sizing, storm (lab 35)
   ===================================================================== */
SD.extendLevel('pool', {
  objectives: ['Pooler (PgBouncer): session vs transaction vs statement; pool size measured concurrency sweep se; connection storm'],
  lesson: [
    `<h3>🧑‍🤝‍🧑 1,000 connections, 50 kaam kar rahe</h3>
     <p>Postgres har connection ke liye ek <b>process</b> banata hai (~5–10 MB + file descriptors). 1,000 app servers × 1 = 5–10 GB sirf connections
     ke liye — aur 80–95% idle ("1,000 ka paisa, 50 ka kaam"). <b>Pooler</b> (PgBouncer) beech mein: ~50 asli connections, jise zaroorat use udhaar →
     ~20× kam connections.</p>
     <table>
       <tr><th>Mode</th><th>Connection kab tak</th><th>Kya toot-ta</th></tr>
       <tr><td>Session</td><td>Client ke poore session tak</td><td>Kuch nahi — par multiplexing sabse kam</td></tr>
       <tr><td><b>Transaction</b></td><td>BEGIN…COMMIT tak</td><td>Session SET/LISTEN/advisory locks; protocol prepared plans configuration par supported ho sakti hain</td></tr>
       <tr><td>Statement</td><td>Ek query</td><td>Transactions hi nahi — lagbhag sab</td></tr>
     </table>
     <p>PgBouncer (chhota, single-threaded C, ~2 MB, sirf pooling) se shuru karo; Pgpool-II (read/write split, cache, failover — zyada failure modes)
     tabhi jab woh cheezein chahiye.</p>`,
    `<h3>📐 Pool kitna bada? latency/concurrency sweep</h3>
     <p>More connections execution capacity create nahi karti. CPU, I/O wait, query mix, locks aur downstream budgets measure karo. <code>2 × cores</code> jaisi heuristic starting hypothesis hai, exact universal optimum nahi. Har app replica/pool ka aggregate DB budget gino; bounded queue aur request deadline rakho.</p>
     <pre>lab 35 — 200 clients bina ruke (8 cores wala DB model):
pool=4    529 tx/s     pool=16   1490 tx/s  ← peak
pool=64   502 tx/s     pool=256   186 tx/s  ← 8× kam
1,000 mostly-idle clients: seedha DB → 500 refused, ~1 GB; transaction pool 32 → 0 refused, 64 MB; session pool 32 → sirf 32 clients served</pre>
     <h3>🌪️ Connection storm</h3>
     <p>PgBouncer restart → 1,000 clients ek saath reconnect → thanda pooler bahut saare naye connections → Postgres har ek ke liye process fork →
     CPU spike ya connection limits possible hain. Ilaaj: rolling/staggered reconnect, bounded app-side jitter, measured server connection caps. <code>min_pool_size</code> only forced-user pool ya connected-client conditions mein enforced hota hai; <code>server_login_retry</code> failed-server-login delay hai, random client jitter nahi. Aur
     <b>jaldi mana karo</b> (client_login_timeout). Pooler restart ko DB operation ki tarah treat karo.</p>
     <p class="tip">🎯 Ek alert: <code>cl_waiting &gt; 0</code> 30 sec se zyada. (sv_active/pool_size &gt;90% = saturated; avg_xact_time &gt;500 ms = slow
     queries connections pakad rahi hain.)</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — pool size ka pahaad aur pooling modes',
      project: '35-connection-pooling',
      exercise: 'ex1-pool',
      goal: 'Closed loop mein pool 4 → 256: throughput kahan peak? Phir 1,000 idle-ish clients: seedha DB vs transaction vs session pooling.',
      why: `<code>services/db.js</code>: 2 MB per connection (asli Buffer), max 500, 8 cores, query 2 ms; 8 se zyada ek saath → cores baantne + 3% per extra.
        <code>services/pooler.js</code>: transaction/session mode, pool size <code>POST /config</code> se.`,
      steps: [
        { text: 'DB + pooler chalao.', cmd: 'cd docker-labs/35-connection-pooling && npm start ex1-pool', expect: 'ex1-pool\n[db] :5131 max_connections=500 cores=8\n[pooler] :5132 mode=transaction pool=16' },
        { text: 'Pool size sweep (closed loop).', cmd: 'node tools/clients.js --via pooler --load busy --pool 16\nnode tools/clients.js --via pooler --load busy --pool 256', expect: 'pooler transaction pool=16   tx/sec  1490   p50   131 ms  p99   138 ms\npooler transaction pool=256  tx/sec   186   p50  1011 ms  p99  1309 ms' },
        { text: '1,000 idle-ish clients: seedha vs pooled.', cmd: 'node tools/clients.js --via db\nnode tools/clients.js --via pooler --pool 32\nnode tools/clients.js --via pooler --mode session --pool 32', expect: 'seedha DB                    tx/sec   450   p50  22 ms  p99 142 ms   clients served  500/1000 (refused 500)   DB conns 500 (≈1000 MB)\npooler transaction pool=32   tx/sec   905   p50  23 ms  p99  33 ms   clients served 1000/1000 (refused 0)     DB conns  32 (≈64 MB)\npooler session pool=32       tx/sec    30   p50  24 ms  p99 173 ms   clients served   32/1000                  DB conns  32 (≈64 MB)' },
      ],
      observe: {
        q: 'Lab ke darj run mein pool 16 se 256 kiya: 1490 se 186 tx/s aaye. Kya samjhaoge?',
        choices: [
          'Lab ke model mein saath chalti queries badhi, toh har query mehengi padi',
          'Pool ke naye connections ne cores badha diye, toh model ki CPU capacity badhi thi',
          'Pool ka sabse chhota size hi sahi hai, toh 4 connections par peak aana chahiye tha',
          'Pool ka sahi size cores se pakka milta hai, toh production sweep ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Lab 35 ke darj run mein pool 16 par 1490 tx/s aur pool 256 par 186 tx/s mile. Model 8 se zyada active queries par cores baantne aur extra contention ka waqt badhaata hai. Pool 256 ki hadd thi, par 200 clients se 200 DB connections bane. Production ka sahi pool CPU, I/O, locks aur query mix ke saath naapna hoga; 2 x cores sirf shuruaati andaaza hai.',
        choiceExplanations: [
          'Lab 35 ke darj run mein pool 16 par 1490 tx/s aur pool 256 par 186 tx/s mile. Model 8 se zyada active queries par cores baantne aur extra contention ka waqt badhaata hai. Pool 256 ki hadd thi, par 200 clients se 200 DB connections bane. Production ka sahi pool CPU, I/O, locks aur query mix ke saath naapna hoga; 2 x cores sirf shuruaati andaaza hai.',
          'Connections jodne se model ke 8 cores nahi badle. Zyada active queries ne model mein ek query ka waqt aur badhaaya.',
          'Darj sweep mein pool 4 par 529 tx/s aur pool 16 par 1490 tx/s the. Bahut chhota pool bhi kaam rok sakta hai; I/O waits mein useful concurrency chahiye.',
          'Core-count formula workload aur waits ka badal nahi. DB budget ke andar pool sizes par throughput aur latency naap kar chuno.',
        ],
      },
      lesson: 'Pool chhota aur sahi (≈ cores × 2), transaction mode, aur 1,000 app connections pooler par.',
    },
  ],
  interview: [
    {
      q: 'PgBouncer restart ke baad naye DB connections ka graph uchhla aur DB fail hone laga. Agli recovery kaise sudhaaroge?',
      choices: [
        'Reconnect baanto, retries mein jitter rakho aur DB connections ki hadd naapo',
        'server_login_retry ko app ka random jitter maano aur sab clients saath jodo',
        'min_pool_size badha do; bina clients ke har pool garam ho jaayega, maan lo',
        'Bas client_login_timeout chhota karo; DB ke connections ka budget wahi rakho',
      ],
      answer: 0,
      explain: 'Ek saath reconnect se connection storm aa sakta hai. Recovery ko hisson mein karo, app retries ko bounded aur jitter ke saath rakho, aur mila DB budget naapo. server_login_retry failed server login ke baad delay hai, app ka random jitter nahi. min_pool_size kaam karega ya nahi, clients aur pool ki user settings par bhi nirbhar hai. Login timeout intezaar baandhta hai, DB capacity nahi badhaata.',
      choiceExplanations: [
        'Ek saath reconnect se connection storm aa sakta hai. Recovery ko hisson mein karo, app retries ko bounded aur jitter ke saath rakho, aur mila DB budget naapo. server_login_retry failed server login ke baad delay hai, app ka random jitter nahi. min_pool_size kaam karega ya nahi, clients aur pool ki user settings par bhi nirbhar hai. Login timeout intezaar baandhta hai, DB capacity nahi badhaata.',
        'server_login_retry server login fail hone ke baad ka delay hai. App clients ki reconnect timings apne aap random nahi ho jaati.',
        'min_pool_size tab enforced hota hai jab pool par clients hon ya forced user configured ho. Har khaali pool ko pehle se garam karne ka vaada nahi.',
        'Login timeout pending clients ko jaldi fail kar sakta hai. Saath mein connections ki hadd aur reconnect ki raftaar sambhaale bina storm ki wajah reh sakti hai.',
      ],
    },
  ],
  cards: [
    { front: 'PgBouncer modes?', back: 'Session preserves session semantics. Transaction shares connection after COMMIT; session features audit karo. Configured protocol prepared plans supported ho sakti hain. Statement disallows multi-statement transactions; simple autocommit use case.' },
    { front: 'Pool size formula?', back: '≈ cores × 2 + 1 (16 cores → 33). Lab 35: pool 16 → 1490 tx/s, 256 → 186 tx/s.' },
    { front: 'Pooler ka ek alert?', back: 'cl_waiting > 0 for > 30 s. (sv_active/pool_size > 90% saturated; avg_xact_time > 500 ms slow queries.)' },
  ],
});

/* =====================================================================
   8. dist/locks — pause problem, Redlock bahas, lease (lab 36)
   ===================================================================== */
SD.extendLevel('locks', {
  objectives: ['GC pause se double charge — Redlock kyun nahi bachata; "lease liveness ke liye, fence safety ke liye"'],
  lesson: [
    `<h3>⏸️ Pause problem (video ki Plaid wali kahani)</h3>
     <p>Video ke mutabik Plaid mein hazaron bank transactions <b>do baar</b> dikhe; 4 ghante lage dhoondhne mein; code "bilkul sahi" chal raha tha;
     mujrim ek lock tha. Aam Redis lock: <code>SET key NX EX 10</code> — zyadatar kaam karta hai, chupchaap toota hua.</p>
     <p>Lock tabhi kaam karta hai jab holder <b>sach mein chal raha ho</b>. GC pause (10+ sec), network delay, pod restart, VM live migration → process
     jam, par lock ka TTL chalta rahta hai. A lock leta hai (10 s), card charge shuru, 12 s GC pause → Redis key expire → B lock leta hai, charge karta
     hai → A jaagta hai, sochta hai lock uska hai → phir charge.</p>
     <h3>⚔️ Redlock bahas</h3>
     <p>antirez (Redis ke banane wale): 5 Redis instances, majority maane. Martin <b>Kleppmann</b>: pause <b>client</b> ki problem hai — 1 Redis ho ya 5,
     12 sec chup client ko kuch nahi bachata. Jawab: <b>fencing tokens</b> — storage chhota token mana kare. "Lock correctness ki seema nahi hai,
     <b>database</b> hai; lock sirf performance optimization hai."</p>
     <pre>lab 36 — 30 orders, worker A ka 600 ms GC pause (TTL 300 ms):
single lock              double charge 30/30
redlock (5 nodes)        double charge 30/30   ← majority ne kuch nahi bachaya
single + fencing token   double charge  0/30   (ledger ne 30 purane tokens reject kiye)</pre>
     <h3>💓 Lease</h3>
     <p>Lease ownership ko limited duration deti hai. TTL/renew interval observed pauses, RPC delay, clock behavior aur recovery objectives se choose karo; fixed 3–5× rule safety proof nahi. Lease akela pause theek nahi karta
     (renew thread bhi rukta hai). <b>"Lease liveness ke liye, fence safety ke liye."</b></p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — GC pause, Redlock aur fencing',
      project: '36-distributed-locks',
      exercise: 'ex1-fencing',
      goal: 'Worker A lock leke 600 ms jam; lock (300 ms) expire; B charge karta hai; A jaag ke bhi charge karta hai — single, Redlock, fencing token.',
      why: `<code>services/lockd.js</code> (5 instances Redlock ke liye) har acquire par badhta fencing token deta hai. <code>services/ledger.js</code>
        <code>FENCING=1</code> par order ka sabse bada token yaad rakhta hai aur chhota mana karta hai.`,
      steps: [
        { text: '5 lock servers + ledger chalao.', cmd: 'cd docker-labs/36-distributed-locks && npm start ex1-fencing', expect: 'ex1-fencing\n[lockd] :5151 … [lockd] :5155\n[ledger] :5156 fencing=false' },
        { text: 'Pause test.', cmd: 'node tools/pause.js', expect: 'single                   nahi                     30         30          0\nredlock (5 nodes)        nahi                     30         30          0\nsingle + fencing token   haan (token)             30          0          30' },
      ],
      observe: {
        q: 'Redlock (5 mein se 3 majority) ne ek bhi double charge kyun nahi roka?',
        choices: [
          'A ruka tha aur purani lease ke bharose likha — ledger ko purana token thukrana chahiye',
          'Quorum mein aur votes jod do — zyada votes ruke hue client ko pause se bacha lengi',
          'TTL lamba kar do — lamba TTL duplicate payment ki dikkat poori tarah suljha dega',
          'Ghadiyan sync kar do — sahi ghadi chal rahi bahar ki request ko wapas le aayegi',
        ],
        answer: 0,
        explain: 'Dikkat lock servers mein nahi, A ke pause mein thi. Kitne bhi servers hon, jaaga hua A purani lease ke bharose likh deta hai. Lab mein yahi hua: naye maalik ke baad purane A ka charge laga. Sirf ledger (jahan likha jaata hai) purana fencing token mana kar sakta hai. Duplicate payment ke liye idempotency key alag se rakho.',
        choiceExplanations: [
          'Dikkat lock servers mein nahi, A ke pause mein thi. Kitne bhi servers hon, jaaga hua A purani lease ke bharose likh deta hai. Lab mein yahi hua: naye maalik ke baad purane A ka charge laga. Sirf ledger (jahan likha jaata hai) purana fencing token mana kar sakta hai. Duplicate payment ke liye idempotency key alag se rakho.',
          'Votes lock servers ke beech hain. Client ka pause koi vote nahi rok sakta.',
          'Pause kitna lamba hoga, pata nahi. TTL lamba karne se duplicate charge ka khatra nahi mit-ta.',
          'Ghadi badalne se nikal chuki request wapas nahi aati. Ledger ko token jaanchna padega.',
        ],
      },
      lesson: 'Lock performance ke liye, fencing correctness ke liye — aur fencing resource hi check karta hai.',
    },
  ],
  cards: [
    { front: 'Pause problem?', back: 'GC pause / VM migration mein process jam, lock TTL expire → doosra lock le leta hai → pehla jaag ke purane bharose par likhta hai. Lab: 30/30 double charge.' },
    { front: 'Redlock vs Kleppmann?', back: 'Redlock: 5 Redis majority. Kleppmann: pause client mein hai — servers badhane se nahi bachta. Lab: Redlock bhi 30/30. Fencing token: 0.' },
    { front: 'Lease rules?', back: 'TTL ≈ 3–5× kaam ka time, TTL/3 par renew. Lease = liveness; fence = safety.' },
  ],
});

/* =====================================================================
   9. NAYA — resil/backpressure (shedding ke baad)
   ===================================================================== */
VISUALS['backpressure'] = {
  t: 'Har cheez jo kaam leti hai — "jab main na sambhal paun tab?"',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Problem</span><span class="q">producer 10,000/s, consumer 2,000/s → line +8,000/s</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Detection</span><span class="q">line ki GROWTH RATE, tail latency, worker utilization — errors bahut der se</span></div>
      <div class="dg-rung a"><span class="lv">3</span><span class="cmd">Response</span><span class="q">absorb (jhooth) · drop (signal ke saath) · propagate</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Propagation</span><span class="q">429 + Retry-After source tak — source dheema ho</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-gold"><span class="ni">🧱</span><span class="nl">block</span><span class="ns">batch pipelines</span></div>
      <div class="dg-node is-gold"><span class="ni">🆕</span><span class="nl">drop new</span><span class="ns">retry-safe kaam</span></div>
      <div class="dg-node is-gold"><span class="ni">🗑️</span><span class="nl">drop oldest</span><span class="ns">taazgi zaroori (dashboards, IoT)</span></div>
      <div class="dg-node is-gold"><span class="ni">⛔</span><span class="nl">error</span><span class="ns">caller tay kare</span></div>
    </div>`,
};

SD.registerLevelsAfter('resil', 'shedding', [
{
  id: 'backpressure',
  icon: '🌊',
  title: 'Backpressure — "dheere bhejo" kaun bolega?',
  badge: 'Backpressure Balwan',
  objectives: [
    'Chaar layers: problem, detection, response, propagation',
    'Detection: depth nahi, growth rate; average nahi, tail',
    'Bounded queue ke chaar policies — ek product faisla',
    'Propagation (429 + Retry-After), push vs pull, Kafka pause/resume',
  ],
  lesson: [
    `<h3>🚰 Paani ki tanki</h3>
     <p>Pipe = queue, paani = requests/events, naali = consumer. Kafka consumer lag, RabbitMQ ka memory-limit reject, HTTP 429 — sab
     backpressure ke signal hain. "Consumers badha do / queue badi kar do" sirf lakshan ka ilaaj.</p>
     <pre>producer 10,000/s, consumer 2,000/s → line +8,000/s
30 sec ka burst → jhel liya
1 ghanta → ~3 crore events, GBs RAM → OOM kill → in-memory queue ke saare events GAYE
(Kafka persistent hai par ghanton peeche → purana data, der se payments, notifications gayab)</pre>
     <p>Badi queue sirf crash ko <b>aage khiskaati</b> hai.</p>
     <h3>🔍 Detection</h3>
     <ul>
       <li><b>Growth rate &gt; depth</b>: 90% bhari par sthir = theek; 30% bhari par 5%/sec badhti = ~14 sec mein full = bada emergency. Kafka lag = growth rate.</li>
       <li><b>Tail latency</b>: 99 × 10 ms + 1 × 5 s → average ~60 ms, sab chhup gaya.</li>
       <li><b>Worker utilization</b>: 49/50 busy = ek burst door.</li>
       <li><b>Error rate</b> = bahut der se (pool khatam, timeouts, 503s).</li>
     </ul>`,
    `<h3>🧱 Bounded queue — "unbounded queue ek jhooth hai"</h3>
     <p>Bhar gayi toh chaar raaste — aur yeh <b>product</b> ka faisla hai (kiska kaam giraya jaaye), incident ke beech random nahi:</p>
     <pre>lab 15 (ex1) — producer 10,000/s, consumer 2,000/s, cap 20,000:
unbounded   t=30s queue 2,36,000 · 252 MB (~8 MB/s badhta)   sabse purana 24 s
block       producer ki raftaar 2,638/s                       (asli backpressure)
drop-new    2,16,740 giraye                                    (retry-safe kaam)
drop-oldest 2,16,740 giraye · sabse purana sirf 2 s            (taazgi)
error       2,16,580 errors producer ko                        (caller tay kare)</pre>
     <h3>📣 Signal source tak</h3>
     <p>A → B → C, C dab gaya. Bina propagation: A poori raftaar se, B hamesha shed karta rahe, C "na" bolne mein thake. Propagation: C 503 → B ki line
     badhi → B <b>429 + Retry-After</b> → A ruke. Retry-After ke bina 429 bas "na" — client turant wapas.</p>
     <pre>lab 15 (ex2):
PROPAGATE=0  A ne 72,166 bheje → 2,757 poore (26.2 tries/success)   C ne 69,409 thukraye
PROPAGATE=1  A ne  9,374 bheje → 2,979 poore (3.1 tries/success)    C ne 0 thukraye</pre>
     <p><b>Pull</b> apne aap backpressure hai (consumer kehta hai "50 do"; Kafka <code>poll()</code>). Kafka mein <code>max.poll.interval.ms</code>
     (default 5 min) se dheema batch → group se bahar → poora group rebalance. Ilaaj: processing line bhari ho toh <code>consumer.pause(partitions)</code>
     (heartbeat chalte rahein), khaali ho toh resume. LinkedIn (roz 7 trillion+ messages): pause/resume + lag monitoring.</p>
     <p class="tip">🎯 Har woh cheez jo kaam leti hai, jawab de: <b>"jab main na sambhal paun tab kya?"</b> Jawab nahi = slow-motion crash.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🌊 Backpressure</b> (paanch levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — bounded queue ke chaar faisle',
      project: '15-backpressure',
      exercise: 'ex1-bounded-queue',
      goal: 'Producer 10,000/s, consumer 2,000/s, 30 sec — unbounded aur cap 20,000 ke saath block / drop-new / drop-oldest / error.',
      why: `<code>tools/queue.js</code> ek process mein producer aur consumer chalata hai; har event ~1 KB. Server nahi chahiye.`,
      steps: [
        { text: 'Unbounded.', cmd: 'cd docker-labs/15-backpressure && node tools/queue.js --policy unbounded', expect: "policy=unbounded: producer ki asli raftaar 9832/s, queue mein 236000, dropped 0, errors (producer ko bataya) 0, sabse purana event 24 s purana" },
        { text: 'Drop-oldest (cap 20,000).', cmd: 'node tools/queue.js --policy drop-oldest --cap 20000', expect: "policy=drop-oldest cap=20000: producer ki asli raftaar 9858/s, queue mein 19980, dropped 216740, errors (producer ko bataya) 0, sabse purana event 2 s purana" },
        { text: 'Block.', cmd: 'node tools/queue.js --policy block --cap 20000', expect: "policy=block cap=20000: producer ki asli raftaar 2638/s, queue mein 19980, dropped 0, errors (producer ko bataya) 0, sabse purana event 10 s purana" },
      ],
      observe: {
        q: 'Live stock ticker ke liye kaunsi policy?',
        choices: [
          'drop-oldest — sirf taaza daam dikhana hai, toh purane events bekaar hain',
          'error — line bhari ho toh naye price par error do, aur purane rakh lo',
          'unbounded — badi line purane events ko bhi apne aap taaza kar degi',
          'block — producer ko rok do; ticker mein bhi koi event nahi chhodna',
        ],
        answer: 0,
        explain: 'Jab taaza daam poori history se zyada zaroori ho (live display), toh purane events gira dena theek hai: lab mein sabse purana event sirf 2 s purana raha. Billing ya audit jaise kaam mein har tick rakhna padta hai — billing mein block (lossless backpressure) sahi.',
        choiceExplanations: [
          'Jab taaza daam poori history se zyada zaroori ho (live display), toh purane events gira dena theek hai: lab mein sabse purana event sirf 2 s purana raha. Billing ya audit jaise kaam mein har tick rakhna padta hai — billing mein block (lossless backpressure) sahi.',
          'Naya price hi sabse kaam ka hai — naya phenk ke purana rakhna ulta.',
          'Badi line purane daamon ki umar badhati hai — dikhte daam aur purane.',
          'Block tab theek jab har event zaroori ho (jaise billing). Ticker ko taaza daam chahiye.',
        ],
      },
      lesson: 'Bounded queue ka matlab hai pehle se tay karna ki bhar jaane par kiska kaam jaayega.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — A → B → C, signal source tak',
      project: '15-backpressure',
      exercise: 'ex2-propagation',
      goal: 'C dab gaya. B ne 503 hi aage badhaya (PROPAGATE=0) vs 429 + Retry-After diya (PROPAGATE=1) — A ne kitna bheja, kitna kaam hua.',
      why: `<code>services/c.js</code>: 4 kaam ek saath, line 40, bhari → 503. <code>services/b.js</code>: PROPAGATE=1 par C par 44 inflight hone par C ko chhue bina
        429 + Retry-After 250 ms. <code>tools/client.js</code>: 150 workers, jittered retry.`,
      steps: [
        { text: 'Bina propagation.', cmd: 'cd docker-labs/15-backpressure && PROPAGATE=0 npm start ex2-propagation\nnode tools/client.js', expect: "A: 72166 requests bheje → 2757 kaam poore (26.2 tries per success) | p50 274 ms p99 6932 ms\nB: C ko 72166 bheje, C ne 69409 thukraye (bekaar kaam), 0 ko 429 bina C chhue | C: 2757 kiye, 69409 rejected\nA ke 150 workers: ek worker ke kaam — sabse kam 1, beech wala 17, sabse zyada 52 | jin workers ka ek bhi kaam poora nahi hua: 0 | ek kaam par sabse lamba intezaar 14.0 s" },
        { text: 'Propagation ke saath.', cmd: 'PROPAGATE=1 npm start ex2-propagation\nnode tools/client.js', expect: "A: 9374 requests bheje → 2979 kaam poore (3.1 tries per success) | p50 224 ms p99 8236 ms\nB: C ko 2979 bheje, C ne 0 thukraye (bekaar kaam), 6395 ko 429 bina C chhue | C: 2979 kiye, 0 rejected\nA ke 150 workers: ek worker ke kaam — sabse kam 0, beech wala 17, sabse zyada 67 | jin workers ka ek bhi kaam poora nahi hua: 18 | ek kaam par sabse lamba intezaar 15.3 s" },
      ],
      observe: {
        q: 'Propagation ke saath A ne 7× kam bheja — phir bhi kaam ZYADA hua (2,757 → 2,979). Kaise?',
        choices: [
          'C ka waqt "na" bolne mein nahi gaya — C asli kaam karta raha; source ne raftaar ghataai',
          'Kam bhejne se kaam hamesha ghat-ta hai — yahan B ne cache se kaam badha diya',
          'Beech ki queue ne C ke liye extra CPU bana diya, isliye zyada kaam ho gaya',
          'Mana ki gayi requests ka koi kharch hi nahi tha — C par koi farak nahi pada',
        ],
        answer: 0,
        explain: 'Is lab ke run mein C bahut saare "na" bolne se bacha, aur asli kaam poora kar saka. Bhare system par kam dabav kaam ki ginti (goodput) badha sakta hai. Mana karna sasta ho sakta hai, muft nahi.',
        choiceExplanations: [
          'Is lab ke run mein C bahut saare "na" bolne se bacha, aur asli kaam poora kar saka. Bhare system par kam dabav kaam ki ginti (goodput) badha sakta hai. Mana karna sasta ho sakta hai, muft nahi.',
          'Bhare system par kam dabav kaam ki ginti badha sakta hai — bekaar "na" ka kharch bachta hai. B mein cache nahi.',
          'Queue CPU nahi banati.',
          '69,409 "na" bolna bhi C ka waqt tha — wahi waqt bacha.',
        ],
      },
      lesson: '429 + Retry-After se signal source tak — tabhi backpressure, warna sirf shedding.',
    },
  ],
  interview: {
    title: 'Interview Round — backpressure',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Kafka consumer lag badh raha hai. Consumers badha dein?"',
        choices: [
          'Lag ki raftaar aur wajah dekho — hot partition ya dheema downstream',
          'Consumers 10 guna kar do — kaam bhi seedha 10 guna tez ho jaayega',
          'Retention badha do — processing ki raftaar apne aap badh jaayegi',
          'Offset aage commit kar do — pending kaam poora maan liya jaayega',
        ],
        answer: 0,
        explain: 'Ek consumer group mein kaam ka bantwaara partitions se bandha hai; hot partition ya dheema downstream pehle dhoondho. Consumer ke andar seemit processing + pause/resume, upstream ko signal, aur lag par alert.',
        choiceExplanations: [
          'Ek consumer group mein kaam ka bantwaara partitions se bandha hai; hot partition ya dheema downstream pehle dhoondho. Consumer ke andar seemit processing + pause/resume, upstream ko signal, aur lag par alert.',
          'Ek group mein consumers partitions se zyada hon toh baaki khaali baithenge.',
          'Retention samay deta hai, raftaar nahi.',
          'Bina padhe commit = data khona chhupana.',
        ],
      },
      {
        q: 'Interviewer: "429 return karte hain par clients turant retry karte hain."',
        choices: [
          'Retry-After do, aur clients jitter ke saath maanein — SDK mein seemit backoff',
          '503 bhej do — 503 dekh ke clients apne aap peeche hat jaayenge, pakka',
          'Retry-After header de diya, toh SDK ka sahi bartav bhi pakka ho gaya',
          'Rate limiter hata do — retries ki kheencha-taani apne aap khatam ho jaayegi',
        ],
        answer: 0,
        explain: 'Server ka signal aur client ka amal dono chahiye: 429 ke saath Retry-After, aur header na ho toh SDK mein seemit backoff. Test karo ki clients header sach mein padhte aur maante hain.',
        choiceExplanations: [
          'Server ka signal aur client ka amal dono chahiye: 429 ke saath Retry-After, aur header na ho toh SDK mein seemit backoff. Test karo ki clients header sach mein padhte aur maante hain.',
          'Status akela client ka bartav pakka nahi karta.',
          'Header dena aur client ka maanna alag — test karo ki SDK sach mein maanta hai.',
          'Bachav hatane se bojh aur badhega.',
        ],
      },
    ],
  },
  success: [
    'Main backpressure ke chaar layers aur growth-rate detection samjha sakta hoon',
    'Main bounded queue ki policy product ke hisaab se chun sakta hoon',
    'Main lab se propagation ka faayda dikha sakta hoon',
  ],
  homework: `<p>Apne system ki har queue/buffer (Kafka topic, in-memory channel, thread pool, HTTP client pool) list karo. Har ek: bounded hai? Bhar
    gayi toh kya hota hai (block/drop/error)? Kiska kaam girega — kya yeh faisla likha hua hai?</p>`,
  cards: [
    { front: 'Backpressure ke chaar layers?', back: 'Problem (producer > consumer), detection (growth rate, tail, utilization), response (absorb/drop/propagate), propagation (429 + Retry-After source tak).' },
    { front: 'Bounded queue ki 4 policies?', back: 'Block (batch), drop-new (retry-safe), drop-oldest (taazgi), error (caller tay kare). Product ka faisla, pehle se.' },
    { front: 'Lab 15: propagation?', back: 'Bina: A 72,166 bheje, 2,757 poore, C ne 69,409 thukraye. Saath: 9,374 bheje, 2,979 poore, 0 thukraye.' },
  ],
},
]);

/* =====================================================================
   10. NAYE — resil/replication + resil/replicas-backups (blast ke baad)
   ===================================================================== */
VISUALS['replication'] = {
  t: 'Replication ek database technique nahi — fault tolerance ki soch',
  html: `
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🗄️</span><span class="nl">DB</span><span class="ns">primary + 2 replicas, alag AZs</span></div>
      <div class="dg-node"><span class="ni">🚦</span><span class="nl">Load balancer</span><span class="ns">active-passive + floating VIP (ya managed ALB)</span></div>
      <div class="dg-node"><span class="ni">📨</span><span class="nl">Kafka</span><span class="ns">replication factor ~3 per partition</span></div>
      <div class="dg-node"><span class="ni">🧠</span><span class="nl">Cache</span><span class="ns">optimization? rebuild. Dependency? replicate</span></div>
      <div class="dg-node"><span class="ni">🚪</span><span class="nl">API gateway</span><span class="ns">replicas + config drift se bacho</span></div>
      <div class="dg-node is-gold"><span class="ni">🌍</span><span class="nl">Region</span><span class="ns">critical ho toh 2–3 regions active</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Lab 32: 2 apps + 2 DBs replicate kiye… par LB ek → LB mara = 25% available. <b>Jo sirf ek hai, wahi poora system hai.</b></div>`,
};
VISUALS['replicas-backups'] = {
  t: 'Replica machine se bachata hai, backup galti se',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🪞 Replica</span>
        <div class="dg-cap">Hardware/machine ke marne se. Isliye <b>har cheez turant copy</b> — galat write, DROP TABLE, attacker ka delete bhi.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🗂️ Backup + log (PITR)</span>
        <div class="dg-cap">Samay mein peeche ja sakte ho — snapshot + WAL/binlog se galti se thik pehle tak.</div></div>
    </div>
    <div class="dg-cap">Lab 32: DELETE FROM orders → primary 0, replica 0. Snapshot se 10,000 (subah ke 500 gaye); snapshot + log se 10,500 ✅.</div>`,
};

SD.registerLevelsAfter('resil', 'blast', [
{
  id: 'replication',
  icon: '🪞',
  title: 'Replication har jagah — aur active-active vs active-passive',
  badge: 'SPOF Shikari',
  objectives: [
    'Single point of failure: critical path ki har cheez, sirf DB nahi',
    'Replicas kahan rakhein: process → machine → rack → zone → region',
    'Active-active vs active-passive — stateless vs stateful',
    'Lab: chain mein har tier maaro',
  ],
  lesson: [
    `<h3>🔗 Chain utni hi mazboot jitni kamzor kadi</h3>
     <p>Ek DB + ek LB + ek Kafka broker + ek Redis — sab critical path mein. Inme se <b>koi bhi ek</b> gira (disk corrupt, LB reboot, broker OOM, Redis
     partition) = poora system band. <b>SPOF</b> = koi bhi dependency jiska backup nahi.</p>
     <ul>
       <li><b>DB</b>: primary + ≥2 replicas (ek kho ke bhi redundancy); <b>alag AZs</b> — ek DC ki aag/bijli teeno maar degi; critical → alag regions.</li>
       <li><b>Load balancer</b> khud SPOF — active-passive jodi + floating VIP / DNS failover; AWS ALB andar se replicated (kisi aur ka kaam); Nginx/HAProxy/Envoy khud chalao toh tumhara.</li>
       <li><b>Queue broker</b>: Kafka har partition ko ~3 brokers par (leader + followers), write tab ack jab kaafi followers ke paas. "Koi message sirf ek machine par nahi."</li>
       <li><b>Cache</b>: sirf optimization? Replicate mat karo, source se dobara bana lo. Dependency (cold start DB ko kuchal dega)? Replicate.</li>
       <li><b>API gateway</b>: LB jaisa — aur <b>config drift</b> se bacho (3 mein se ek par naya routing rule = random behaviour).</li>
     </ul>
     <p class="tip">🎯 Jitna bhayanak failure, utni door replicas: process → machine → rack → zone → region.</p>`,
    `<h3>⚖️ Active-active vs active-passive</h3>
     <table>
       <tr><th></th><th>Active-active</th><th>Active-passive</th></tr>
       <tr><td>Kaam</td><td>Sab replicas asli kaam</td><td>Standby taiyaar par khaali</td></tr>
       <tr><td>Failover</td><td>Traffic bas shift</td><td>Takeover ki der (sec, kabhi zyada)</td></tr>
       <tr><td>Keemat</td><td>Consistency, conflicts, coordination</td><td>Khaali capacity; simple (ek faisla lene wala)</td></tr>
       <tr><td>Aam taur par</td><td>Stateless (LB, app servers)</td><td>Stateful (primary DB)</td></tr>
     </table>
     <pre>lab 32 — LB → app → DB, t=2 par ek cheez maari (8 sec, 100 req/s):
1 app, 1 DB                      app1 mara → 24.9% available
2 apps, 1 DB                     app1 mara → 100%
2 apps, 1 DB                     db1 mara  → 24.8%
DB active-passive (3 checks)     db1 mara  → 86.6% (1.1 sec errors)
DB active-active (retry)         db1 mara  → 100%
sab replicated, LB ek            lb mara   → 25.0%</pre>
     <p>Har critical component ke liye teen sawaal: (1) gira toh kya? (2) kitni sambhavna? (disks &gt; CPUs; machines &gt; poore DCs) (3) replicate ki
     keemat? (doosra LB sasta; multi-region active-active transactional DB ek order zyada). Maqsad "sab replicate karo" nahi — <b>"koi ek failure poora
     system na giraye"</b>.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — chain mein har tier maaro',
      project: '32-replication',
      exercise: 'ex1-chain',
      goal: 'LB → app → DB: bina replica, replicated, DB active-passive vs active-active — aur aakhir mein akela LB.',
      why: `<code>services/tier.js</code> ek generic tier hai (single / active-passive: 500 ms health check, 3 fail → standby / active-active: retry).
        <code>POST /kill</code> = har connection todta hai. <code>tools/spof.js</code> chhe setups chalata hai.`,
      steps: [
        { text: 'Paanch tiers chalao.', cmd: 'cd docker-labs/32-replication && npm start ex1-chain', expect: 'ex1-chain\n[lb] :5101\n[app1] :5102\n[app2] :5103\n[db1] :5104\n[db2] :5105' },
        { text: 'SPOF test.', cmd: 'node tools/spof.js', expect: '1 app, 1 DB (koi replica nahi)               app1  maara →  590 fail / 786  (24.9% available)  errors ki khidki: 6.0 s\n2 apps, DB active-passive (3 health checks)  db1   maara →  105 fail / 783  (86.6% available)  errors ki khidki: 1.1 s\n2 apps, DB active-active (retry)             db1   maara →    0 fail / 791  (100.0% available)  errors ki khidki: 0 s\nsab replicated — par LB sirf EK              lb    maara →  592 fail / 789  (25.0% available)  errors ki khidki: 6.0 s' },
      ],
      observe: {
        q: 'Active-passive mein standby taiyaar tha, phir bhi 1.1 sec errors kyun?',
        choices: [
          'Switch karne wale ne 3 health checks ke baad hi primary ko mara maana — beech mein errors',
          'Standby taiyaar tha, toh pata chalne ka samay bhi zero hona chahiye tha, bug hai',
          'Teen checks hamesha theek 1.5 s ka failover dete hain, har setup mein pakka',
          'Asli deployments mein failover hamesha kam se kam 30 second hi leta hai',
        ],
        answer: 0,
        explain: 'Lab mein switch karne wale ne 3 × 500 ms health checks ke baad maana ki primary mara — takeover ki khidki detector ke schedule se aayi. Asli duniya mein detection + promotion + routing + client cache — poora failover naap ke dekho. Taiyaar standby failure ka pata chalna turant nahi karta.',
        choiceExplanations: [
          'Lab mein switch karne wale ne 3 × 500 ms health checks ke baad maana ki primary mara — takeover ki khidki detector ke schedule se aayi. Asli duniya mein detection + promotion + routing + client cache — poora failover naap ke dekho. Taiyaar standby failure ka pata chalna turant nahi karta.',
          'Taiyaar standby failure ko turant pakadna nahi sikhata — pata chalne mein checks lagte hain.',
          'Checks ka phase, timeout aur kaam asli samay badalte hain. Pakka 1.5 s nahi.',
          'Koi pakki minimum nahi — setup par depend. Naap ke dekho.',
        ],
      },
      lesson: 'Replica tabhi kaam ka jab koi use chunne wala bhi zinda ho — aur har tier mein.',
    },
    {
      type: 'bins',
      title: 'Active-active ya active-passive?',
      instructions: 'Aam taur par kaunsa pattern?',
      bins: [
        { id: 'aa', label: '⚖️ Active-active' },
        { id: 'ap', label: '🛌 Active-passive' },
      ],
      items: [
        { text: 'Stateless app servers', bin: 'aa', explain: 'Koi state nahi — sab kaam karein, ek gire toh baaki.' },
        { text: 'Primary relational DB (writes)', bin: 'ap', explain: 'Ek faisla lene wala — conflicts nahi.' },
        { text: 'Load balancers ki jodi (VIP ke saath)', bin: 'ap', explain: 'Aksar active-passive + floating VIP (managed LBs andar se active-active).' },
        { text: 'CDN edge servers', bin: 'aa', explain: 'Sab serve karte hain.' },
        { text: 'Leader-based scheduler', bin: 'ap', explain: 'Ek leader, baaki standby (lease).' },
        { text: 'Read replicas pool', bin: 'aa', explain: 'Sab reads serve karte hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — replication design',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare paas 3 app servers aur DB replica hai — SPOF-free?"',
        choices: [
          'Critical path ka har hissa aur saajhe failure domains jaancho — LB, DNS, queue bhi',
          '3 app replicas aur 1 DB replica hain, toh SPOF-free hone ka poora saboot hai',
          '5 app replicas kar do — zyada app servers se saajha LB aur DNS bhi redundant',
          'DB theek hai toh queues aur auth critical path mein aate hi nahi, chhod do',
        ],
        answer: 0,
        explain: 'Replica ki ginti ke saath detection, failover karne wala, saajhi dependencies aur capacity bhi parkho. Har critical-path component dekho: LB, queue, cache (agar dependency), gateway, DNS, region — ek bhi akela = SPOF.',
        choiceExplanations: [
          'Replica ki ginti ke saath detection, failover karne wala, saajhi dependencies aur capacity bhi parkho. Har critical-path component dekho: LB, queue, cache (agar dependency), gateway, DNS, region — ek bhi akela = SPOF.',
          'Bina replica wale critical hisse (LB, DNS, broker) phir bhi SPOF hain.',
          'Zyada app servers infrastructure ke akele hisson ko redundant nahi banate.',
          'Request ka asli raasta tay karta hai kaun critical hai — queue aur auth aksar hain.',
        ],
      },
      {
        q: 'Interviewer: "Cache ko replicate karein?"',
        choices: [
          'Poochho: cache khaali ho toh kya hoga — dheema par chalega, ya DB kuchla jaayega?',
          'Cache sirf optimization hai — cache girne ka asar hamesha zero hi maan lo',
          'Replication jod do — copy banate hi stale data ki dikkat bhi khatam ho jaati hai',
          'Production mein cache ko asli data jaisa pakka (durable) source maan ke chalo',
        ],
        answer: 0,
        explain: 'Poochho: cache optimization hai (khaali ho toh dheema par chalega → rebuild) ya dependency (thanda cache DB ko kuchal dega → replicate ya headroom)? Garam cache par nirbhar rehna chhupa hua availability bottleneck ban sakta hai.',
        choiceExplanations: [
          'Poochho: cache optimization hai (khaali ho toh dheema par chalega → rebuild) ya dependency (thanda cache DB ko kuchal dega → replicate ya headroom)? Garam cache par nirbhar rehna chhupa hua availability bottleneck ban sakta hai.',
          'Thanda cache DB par itna bojh daal sakta hai ki DB gir jaaye — asar zero nahi.',
          'Replicas availability dete hain, consistency ka niyam apne aap nahi.',
          'Cache ki copy asli data (source of truth) jaisi pakki nahi.',
        ],
      },
    ],
  },
  success: [
    'Main critical path ka SPOF map bana sakta hoon',
    'Main active-active aur active-passive ka sahi istemaal bata sakta hoon',
    'Main lab se replication aur takeover ki khidki dikha sakta hoon',
  ],
  homework: `<p>Apne sabse zaroori request path ka har component likho (DNS → CDN → LB → gateway → app → cache → DB → queue). Har ek ke saamne: kitni
    copies, kahan (AZ/region), aur failover kaun karta hai kitni der mein? Jahan "1" likha hai, wahi tumhara SPOF.</p>`,
  cards: [
    { front: 'SPOF?', back: 'Critical path ki koi bhi dependency jiska backup nahi — DB, LB, broker, cache (agar dependency), gateway, region. Lab: LB ek → 25%.' },
    { front: 'Active-active vs passive?', back: 'Active-active: sab kaam, turant shift, par sync/conflicts (stateless). Active-passive: standby khaali, takeover der (lab 1.1 s), simple (stateful primary).' },
    { front: 'Replicate karne ke teen sawaal?', back: 'Gira toh kya? Kitni sambhavna? Keemat kya? Maqsad: koi ek failure poora system na giraye.' },
  ],
},
{
  id: 'replicas-backups',
  icon: '🗂️',
  title: 'Replica backup nahi hai',
  badge: 'Backup Bhakt',
  objectives: [
    'Replication kin cheezon se NAHI bachata',
    'Snapshot vs snapshot + log (point-in-time restore)',
    'Lab: galat DELETE — replica ne bhi copy kiya',
    'Restore ka test — asli Postgres par (SQL Gurukul)',
  ],
  lesson: [
    `<h3>🪞 Replica wafadaar hai — galtiyon ke saath bhi</h3>
     <p>Replication in cheezon se <b>nahi</b> bachata:</p>
     <ul>
       <li><b>Data bigaadne wale bugs</b> — galat write replicate hota hai ("galat data ko aur durable bana diya").</li>
       <li><b>Operator ki galti</b> — DROP TABLE seconds mein har replica par ("teen baar table khoya").</li>
       <li><b>Attacks</b> — deletions har jagah copy.</li>
       <li><b>Replication system ke apne bugs</b> — followers alag ho jaayein, pata hi nahi kaunsa sahi.</li>
     </ul>
     <p><b>Replicas hardware failure</b> se bachate hain, <b>backups logical failure</b> se. Dono chahiye.</p>
     <pre>lab 32 (ex2):
02:00 backup: 10,000 orders          09:00 tak primary = replica = 10,500
10:42 intern: DELETE FROM orders;    primary 0 · replica 0
restore sirf snapshot:           10,000 (subah ke 500 gaye)
restore snapshot + log (bad query se thik pehle): 10,500 ✅</pre>`,
    `<h3>⏪ Point-in-time restore</h3>
     <p>Snapshot (raat ka base backup) + uske baad ka har write ka log (Postgres WAL archive / MySQL binlog) → kisi bhi pal tak wapas:
     <code>recovery_target_time = '10:41:59'</code>. Asli Postgres par yahi — primary + streaming standby + WAL archive, DROP TABLE standby tak ms
     mein pahunchta hai aur PITR use wapas laata hai — 🐘 SQL Gurukul ke <b>Read Replicas</b> aur <b>Backup &amp; Replication</b> levels mein (lab 08).</p>
     <p class="tip">🎯 <b>Backup tab tak backup nahi jab tak restore test na kiya ho.</b> Aur backup replication ke raaste se alag rakho (alag
     account/permissions) — attacker ya galat script dono ko ek saath na mita sake.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — galat DELETE: replica vs backup + log',
      project: '32-replication',
      exercise: 'ex2',
      goal: 'Raat ka snapshot, subah ke 500 orders, phir 10:42 par DELETE bina WHERE — replica, snapshot aur snapshot + log se kya wapas milta hai?',
      why: `<code>tools/badwrite.js</code>: primary har write replica par turant bhejta hai (sync) aur ek log rakhta hai. Koi server nahi.`,
      steps: [
        { text: 'Tool chalao.', cmd: 'cd docker-labs/32-replication && node tools/badwrite.js', expect: '10:42 intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)\n   primary: 0 orders    replica: 0 orders   ← replica ne bhi wafadaari se copy kar liya\n\nRestore sirf snapshot se: 10000 orders   (subah ke 500 gaye)\nRestore snapshot + log (bad query se thik PEHLE tak, seq < 10501): 10500 orders  ✅ sab wapas' },
        { text: 'Aakhri lines ka niyam padho.', cmd: 'node tools/badwrite.js | tail -3', expect: 'Replica = hardware/machine ke marne se bachaata hai (sab kuch, galtiyan bhi, turant copy).\nBackup + log = galti se bachaata hai (samay mein peeche ja sakte ho). Dono chahiye, ek dusre ki jagah nahi le sakte.\nAsli Postgres mein yahi: base backup + WAL archive → recovery_target_time. (SQL Gurukul lab 08-replication mein asli PG par.)' },
      ],
      observe: {
        q: 'Sirf snapshot se restore mein subah ke 500 orders kyun gaye?',
        choices: [
          'Snapshot ke baad ke writes sirf log mein the — log replay ke bina wapas nahi aate',
          'Snapshot apne aap har aane wala commit lagataar apne andar rakhta rehta hai',
          'Replica hone se snapshot ka samay apne aap sabse naya ban jaata hai',
          'Restore ke baad rows ki ginti sahi thi, toh data poora taaza hai, pakka',
        ],
        answer: 0,
        explain: 'Snapshot raat 2 baje ka tha — us ke baad ke writes sirf log (archive/WAL) mein the; log replay ke bina baad ke writes wapas nahi aate. Snapshot ke baad ka kaam laane ke liye poori PITR chain chahiye.',
        choiceExplanations: [
          'Snapshot raat 2 baje ka tha — us ke baad ke writes sirf log (archive/WAL) mein the; log replay ke bina baad ke writes wapas nahi aate. Snapshot ke baad ka kaam laane ke liye poori PITR chain chahiye.',
          'Snapshot ek pal ki tasveer hai — baad ke writes us mein nahi.',
          'Replica backup ke samay ko nahi badalta.',
          'Ginti se galat values ya chhoote naye writes chhup sakte hain.',
        ],
      },
      lesson: 'Replica aur backup alag cheezon se bachate hain — dono rakho, aur restore test karo.',
    },
    {
      type: 'bins',
      title: 'Kaun bachayega?',
      instructions: 'Har haadse ke liye — replica ya backup?',
      bins: [
        { id: 'replica', label: '🪞 Replica bachayega' },
        { id: 'backup', label: '🗂️ Sirf backup + log bachayega' },
      ],
      items: [
        { text: 'Primary DB ki disk mar gayi', bin: 'replica', explain: 'Hardware — replica promote.' },
        { text: 'Migration script ne galat column update kar diya', bin: 'backup', explain: 'Galat write har replica par.' },
        { text: 'Poora AZ bijli se gaya', bin: 'replica', explain: 'Doosre AZ ka replica.' },
        { text: 'Ransomware ne tables encrypt/delete kiye', bin: 'backup', explain: 'Replication ne har jagah copy kiya — alag, protected backup chahiye.' },
        { text: 'Intern ne DROP TABLE chala diya', bin: 'backup', explain: 'Seconds mein har replica par.' },
        { text: 'Primary ka process OOM se mara', bin: 'replica', explain: 'Machine/process failure.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — backups',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare paas 3 replicas hain, backup ki zaroorat?"',
        choices: [
          'Replicas galat badlaav bhi copy karte hain — PITR backup aur restore drill chahiye',
          '3 live replicas galat badlaav ko bhi apne aap wapas kar denge, backup bekaar',
          'Hafte mein ek dump kaafi hai — har business ka RPO aaram se poora karega',
          'Usi account ki replica hack hone par bhi data ko alag aur safe rakhegi',
        ],
        answer: 0,
        explain: 'Replicas galat writes, DROP TABLE, attacks — sab turant copy kar dete hain. Replication live availability deti hai; backups/PITR galat badlaav se wapsi. Base backup + WAL/binlog archive (PITR), alag account mein, aur restore drills.',
        choiceExplanations: [
          'Replicas galat writes, DROP TABLE, attacks — sab turant copy kar dete hain. Replication live availability deti hai; backups/PITR galat badlaav se wapsi. Base backup + WAL/binlog archive (PITR), alag account mein, aur restore drills.',
          'Replica galat badlaav ko bhi copy karti hai — wapas nahi karti.',
          'Backup ki baari business ke RPO se tay hoti hai — hafta aksar bahut lamba.',
          'Saajhe credentials ek saath sab kho sakte hain. Alag account chahiye.',
        ],
      },
      {
        q: 'Interviewer: "Backup strategy kaise sabit karoge?"',
        choices: [
          'Alag jagah restore drill — data ki jaanch aur asli RTO/RPO naapo',
          'Backup job green hai, toh restore bhi chal jaayega — saboot ho gaya',
          'Archive file khaali nahi hai, toh app bhi wapas laayi ja sakti hai',
          'Vendor ka storage SLA hai, toh poori service ki wapsi bhi pakki',
        ],
        answer: 0,
        explain: 'Restore ka abhyaas data ke sahi hone, dependencies aur wapsi ke samay ka saboot deta hai. Kabhi restore na hua backup, backup nahi — bas umeed hai.',
        choiceExplanations: [
          'Restore ka abhyaas data ke sahi hone, dependencies aur wapsi ke samay ka saboot deta hai. Kabhi restore na hua backup, backup nahi — bas umeed hai.',
          'Backup banne ka safal hona restore chalne ka saboot nahi.',
          'File hona poora, chalne layak backup hone ki guarantee nahi.',
          'Storage ka SLA poori app ki wapsi ka SLA nahi.',
        ],
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki replication kin cheezon se nahi bachata',
    'Main snapshot aur point-in-time restore ka farq samjha sakta hoon',
    'Main backup ko restore drill se sabit karne ka plan bana sakta hoon',
  ],
  homework: `<p>Apne sabse zaroori DB ke liye likho: aakhri backup kab, log archive hai ya nahi, aakhri restore test kab hua, aur "10:41 tak wapas lao"
    kitni der mein ho sakta hai? Agar koi jawab "pata nahi" hai, wahi agla kaam.</p>`,
  cards: [
    { front: 'Replication kis se NAHI bachata?', back: 'Galat writes/bugs, operator galti (DROP TABLE), attacks, replication ke apne bugs — sab turant har replica par.' },
    { front: 'Snapshot vs PITR?', back: 'Snapshot = ek pal (lab: subah ke 500 gaye). Snapshot + WAL/binlog = koi bhi pal (lab: 10,500 wapas).' },
    { front: 'Backup ka niyam?', back: 'Restore test na hua toh backup nahi; replication ke raaste se alag account/permissions mein rakho.' },
  ],
},
]);

/* =====================================================================
   11. NAYA — data/cache-invalidation (stampede ke baad)
   ===================================================================== */
VISUALS['cache-invalidation'] = {
  t: 'Invalidation ek spectrum hai',
  html: `
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">⏲️</span><span class="nl">TTL</span><span class="ns">sabse simple, sabse purana</span></div>
      <div class="dg-node is-good"><span class="ni">🛰️</span><span class="nl">CDC</span><span class="ns">lagbhag zero staleness, infra chahiye</span></div>
      <div class="dg-node is-accent"><span class="ni">🏷️</span><span class="nl">Tags / surrogate keys</span><span class="ns">views bhi saaf — tag index maintain karna</span></div>
      <div class="dg-node is-gold"><span class="ni">🔢</span><span class="nl">Version keys</span><span class="ns">purge logic zero — memory mein purane versions</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🖥️ L1 (process, µs)</span><span class="dg-pill">🧠 L2 Redis (sub-ms)</span><span class="dg-pill">🌍 CDN</span>
      <span class="dg-arrow">←</span><span class="dg-pill good">📣 pub/sub: har layer tak khabar</span>
    </div>
    <div class="dg-cap">Lab 33: CDC ne Redis saaf kiya, par L1 ko pata nahi → 4 sec galat price. Pub/sub ke saath ~100 ms.</div>`,
};

SD.registerLevelsAfter('data', 'stampede', [
{
  id: 'cache-invalidation',
  icon: '🧹',
  title: 'Cache Invalidation — record nahi, views; key nahi, har layer',
  badge: 'Invalidation Ishwar',
  objectives: [
    'CDC batata hai kaunsa RECORD badla — par cache VIEWS ka hota hai',
    'Tag-based (surrogate keys) aur version-based keys',
    'L1 / L2 / CDN — har layer tak invalidation',
    'Lab: TTL vs CDC vs CDC + pub/sub',
  ],
  lesson: [
    `<h3>🧩 Record badla, view kaunse?</h3>
     <p>CDC batata hai "product 123 badla". Par app <b>views</b> cache karta hai jo records se bane hain: profile page (user + 3 recent orders), homepage ka
     "top contributors", admin ka filtered search. Kis-kis key ko mitao?</p>
     <ul>
       <li><b>Tag-based</b>: har cached view jo product 123 par nirbhar hai, use tag "product:123" do; badlaav par <b>tag se purge</b>, ek call.
       Cloudflare ke <b>surrogate keys</b>: ek purge se edge par saikdon related assets saaf.</li>
       <li><b>Version-based keys</b>: invalidate mat karo, <b>key badlo</b> — <code>product:123:v5</code> → <code>v6</code>; purana unreachable, TTL se khatam.
       Current version ek chhoti Redis key/DB column mein. GitHub static assets: filename mein content hash. Version pointer freshness, old-key retention aur lookup/fill races still manage karo; keemat memory aur coordination hai.</li>
     </ul>`,
    `<h3>🏢 Har layer tak khabar</h3>
     <p>L1 in-process (hash map / Caffeine / LRU, µs), L2 Redis/Memcached (network, sub-ms, saajha), CDN edge par. CDC ne L2 ki key mitayi — par har app
     instance ki <b>L1</b> copy apne expiry tak purani. Ilaaj: <b>invalidation propagation</b> — event publish (Redis Pub/Sub / Kafka) → har instance L1
     saaf kare.</p>
     <pre>lab 33 — iPhone ka price DB mein badla:
sirf TTL (cache 5 s, L1 5 s)          ~4,000 ms galat
CDC → shared cache DEL (L1 ko pata nahi) ~4,040 ms galat
CDC + L1 ko pub/sub se khabar            ~91–121 ms</pre>
     <p class="tip">🎯 Invalidation ek spectrum hai: TTL (sabse simple, sabse purana), CDC (measured async lag + infra), tags (poora + tag index),
     versions (pointer/retention/race management + memory). Combination users ki staleness tolerance se chuno.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — price badla, kaun kitni der galat?',
      project: '33-cache-invalidation',
      exercise: 'ex1-invalidation',
      goal: 'TTL only vs CDC (shared cache DEL) vs CDC + L1 pub/sub — dono app servers kitni der purana price dikhate hain.',
      why: `<code>services/invalidator.js</code> DB ka change log padhta hai (CDC) → shared cache DEL + event publish. <code>services/app.js</code> ka L1
        <code>l1Pubsub</code> on ho toh events sun ke apni copy saaf karta hai.`,
      steps: [
        { text: 'Poora setup chalao.', cmd: 'cd docker-labs/33-cache-invalidation && npm start ex1-invalidation', expect: 'ex1-invalidation\n[invalidator] :5115 enabled=true' },
        { text: 'Staleness test.', cmd: 'node tools/staleness.js', expect: 'sirf TTL (cache 5 s, L1 5 s)             app1 purana dikhaya  3998 ms   app2  4028 ms\nCDC → shared cache DEL (L1 ko pata nahi) app1 purana dikhaya  4040 ms   app2  4044 ms\nCDC + L1 ko pub/sub se khabar            app1 purana dikhaya    91 ms   app2   121 ms' },
      ],
      observe: {
        q: 'Lab ke recorded run mein CDC se shared cache saaf hui, par price ~4 s purana raha. Kaunsi layer bachi?',
        choices: [
          'Har app ki local L1 copy bachi rahi; copy apne TTL tak purana price deti rahi',
          'Shared L2 copy bachi rahi; successful DEL ke baad bhi wahi purana price deti rahi',
          'DB ki value badli nahi thi; commit hone se pehle CDC ne naya price bhej diya tha',
          'Client ka page bacha raha; app endpoint ne purane price ka response diya hi nahi',
        ],
        answer: 0,
        explain: 'Lab ke recorded run mein shared cache DEL ke baad app1/app2 lagbhag 4040/4044 ms tak purana price dete rahe. App ki local L1 ko invalidation nahi mili thi. CDC plus L1 notification ke run mein lagbhag 91/121 ms lage. Har cache layer ki invalidation aur allowed staleness alag design karo; timings har setup ki guarantee nahi.',
        choiceExplanations: [
          'Lab ke recorded run mein shared cache DEL ke baad app1/app2 lagbhag 4040/4044 ms tak purana price dete rahe. App ki local L1 ko invalidation nahi mili thi. CDC plus L1 notification ke run mein lagbhag 91/121 ms lage. Har cache layer ki invalidation aur allowed staleness alag design karo; timings har setup ki guarantee nahi.',
          'Diye hue trace mein shared DEL safal thi; local L1 copy phir bhi bachi reh sakti hai.',
          'Lab mein DB price change ho chuka tha. Purana response local copy se mil raha tha, rollback ka saboot nahi.',
          'Tool app endpoints se price padhta hai; purana response server se aaya, sirf screen ki copy nahi.',
        ],
      },
      lesson: 'Record → views (tags/versions), aur key → har layer (pub/sub).',
    },
    {
      type: 'match',
      title: 'Kaunsa tareeka kab?',
      instructions: 'Har situation ko sahi invalidation se jodo.',
      pairs: [
        { left: '📰 Blog post page, 1 min purana chalega', right: 'TTL — sabse simple', explain: 'Staleness chal jaati hai toh complexity mat khareedo.' },
        { left: '💰 Product view, measured async lag acceptable', right: 'CDC (WAL → Kafka → invalidator)', explain: 'Async invalidation lag, refill races aur recovery test karo; checkout inventory invariant authoritative state par validate karo.' },
        { left: '🧩 Ek product 200 cached pages mein dikhta hai', right: 'Tags / surrogate keys — ek purge sab saaf', explain: 'Cloudflare surrogate keys.' },
        { left: '📦 JS/CSS bundles', right: 'Version/content-hash wali keys', explain: 'Purge hi nahi — naya naam.' },
        { left: '🖥️ Har app instance ki in-process cache', right: 'Pub/sub se invalidation propagation', explain: 'L1 ko bhi khabar.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — cache invalidation',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Price badla, kuch users ko purana price aur kuch ko naya dikha. Pehla useful kadam?',
        choices: [
          'Request kis L1, L2 aur CDN se aayi, trace karo; freshness aur invalidation parkho',
          'Sirf L2 ki key delete karo; app memory ki copies ko alag track karna baad mein dekho',
          'Sirf browser refresh karao; server ki local copies ko waise hi expire hone do',
          'Sirf TTL chhota karo; allowed staleness aur miss load ko naapna baad mein dekho',
        ],
        answer: 0,
        explain: 'Pehle response ka raasta dhoondho: app ki L1, shared L2 aur CDN mein kaunsi copy mili? Phir allowed staleness, invalidation, version pointer aur refresh races parkho. Notification kho jaaye ya app reconnect kare toh recovery ka plan chahiye. Redis Pub/Sub akela missed messages replay nahi karta.',
        choiceExplanations: [
          'Pehle response ka raasta dhoondho: app ki L1, shared L2 aur CDN mein kaunsi copy mili? Phir allowed staleness, invalidation, version pointer aur refresh races parkho. Notification kho jaaye ya app reconnect kare toh recovery ka plan chahiye. Redis Pub/Sub akela missed messages replay nahi karta.',
          'Remote DEL app ki process memory apne aap nahi badalta; L1 ko bhi khabar ya version check chahiye.',
          'Browser refresh bhi server ki purani cached copy padh sakta hai; serving layer ka saboot chahiye.',
          'Chhota TTL stale window ghata sakta hai, par exact freshness ki guarantee nahi aur misses badh sakte hain.',
        ],
      },
      {
        q: 'Product badla, par product se bane cached pages ki list nahi hai. Targeted invalidation kaise banao?',
        choices: [
          'Cached views ke source tags ya versions rakho, phir affected views saaf karo',
          'Har product update par poora cache saaf karo, chahe baaki views badle na hon',
          'Har cached page ko ek hi TTL do, phir product se pages ka rishta rakhna chhodo',
          'Har page ki key alag rakho, phir DB updates ki khabar pahunchana band kar do',
        ],
        answer: 0,
        explain: 'View kai records se ban sakta hai. Source record ke tags ya version wali keys se affected views ka rishta rakho. Tags ka size, current version ki freshness aur refresh/invalidation races sambhalo. Poora flush extra misses laata hai; fixed TTL write ke saath exact freshness nahi deta.',
        choiceExplanations: [
          'View kai records se ban sakta hai. Source record ke tags ya version wali keys se affected views ka rishta rakho. Tags ka size, current version ki freshness aur refresh/invalidation races sambhalo. Poora flush extra misses laata hai; fixed TTL write ke saath exact freshness nahi deta.',
          'Poora flush stale views hata sakta hai, par unrelated views bhi thandi hongi. Targeted invalidation ke liye dependency mapping chahiye.',
          'TTL expire hone se pehle purana view mil sakta hai; same TTL dependency mapping ka badal nahi.',
          'Alag keys naming ka masla hal karti hain; source badalne par kaunsi entry badalni hai, abhi bhi pata nahi chalega.',
        ],
      },
    ],
  },
  success: [
    'Main record aur view invalidation ka farq samjha sakta hoon',
    'Main tags aur version keys ka istemaal bata sakta hoon',
    'Main multi-layer invalidation lab se dikha sakta hoon',
  ],
  homework: `<p>Apne app ke caches list karo — browser, CDN, in-process, Redis. Har ek ke liye: invalidation kaise hoti hai (TTL/CDC/tag/version)? Kaunsi
    layer ko badlaav ki khabar hi nahi milti? Wahi tumhare "kabhi-kabhi purana data" bugs ki jad hai.</p>`,
  cards: [
    { front: 'Tag-based invalidation?', back: 'Har cached view ko uske records ke tags ("product:123"); badlaav par tag purge — ek call. Cloudflare surrogate keys.' },
    { front: 'Version keys?', back: 'Key badlo (product:123:v5 → v6) — purana unreachable, TTL se khatam. Purge logic zero, keemat memory. GitHub asset hashes.' },
    { front: 'Lab 33: L1?', back: 'TTL: ~4 s galat. CDC (sirf Redis DEL): phir bhi ~4 s (L1). CDC + pub/sub: ~100 ms.' },
  ],
},
]);

/* =====================================================================
   12. NAYA — dist/lock-choices (locks ke baad)
   ===================================================================== */
VISUALS['lock-choices'] = {
  t: 'Kaunsa taala — ya taala hi nahi?',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-gold"><span class="ni">⚡</span><span class="nl">Redis SET NX EX</span><span class="ns">lease + stale-holder risk; resource contract verify</span></div>
      <div class="dg-node is-good"><span class="ni">🦓</span><span class="nl">ZooKeeper / etcd</span><span class="ns">session expiry + predecessor watch; latency measure</span></div>
      <div class="dg-node is-good"><span class="ni">🐘</span><span class="nl">Postgres advisory lock</span><span class="ns">session end release; DB failure semantics test</span></div>
      <div class="dg-node is-accent"><span class="ni">🚫</span><span class="nl">Koi taala nahi</span><span class="ns">idempotent (ON CONFLICT) ya optimistic (version column)</span></div>
    </div>
    <div class="dg-cap">Lab 36: 100 waiters — "sabko jagao" 5,050 wake-ups; "line mein agla" (ZooKeeper jaisa) 100.</div>`,
};

SD.registerLevelsAfter('dist', 'locks', [
{
  id: 'lock-choices',
  icon: '🗝️',
  title: 'Lock kaunsa — aur kya chahiye bhi?',
  badge: 'Taala Tolne Wala',
  objectives: [
    'ZooKeeper sequential nodes vs Redis vs Postgres advisory locks',
    'Thundering herd: sabko jagao vs line mein agla (lab)',
    'Granularity aur ordering — deadlock se bachna',
    'Kya lock chahiye bhi? idempotency aur optimistic concurrency',
  ],
  lesson: [
    `<h3>🦓 ZooKeeper — line mein number</h3>
     <p>Har waiter ek <b>ephemeral sequential</b> node banata hai (number ke saath). Sabse chhota number jeet-ta hai. Har waiter sirf apne se
     <b>pehle wale</b> ko watch karta hai → release par sirf ek jaagta hai (koi thundering herd nahi). Ephemeral = session se juda → session expiry → ephemeral node removed → next owner proceed. Temporary disconnect immediate deletion nahi; session timeout aur recoverable-create ambiguity handle karo. Latency deployment/workload par measure karo; fixed 5–15 ms universal claim nahi. etcd equivalent coordination primitives deta hai.</p>
     <pre>lab 36 — 100 workers, ek lock, 100 handoffs:
all   (sabko jagao)       5,050 wake-ups · 4,950 bekaar
queue (line mein agla)      100 wake-ups · 0 bekaar</pre>
     <h3>🐘 Postgres advisory locks — kam aanke gaye</h3>
     <p><code>pg_advisory_lock(key)</code> — wahi andar ka lock manager jo <code>SELECT … FOR UPDATE</code> use karta hai; koi naya infra nahi, crash-safe
     (session khatam = release), deadlock detection built-in, ~1 ms. <code>pg_advisory_xact_lock</code> COMMIT/ROLLBACK par khud chhoot-ta hai (bhoolna
     mumkin nahi). Keemat: har holder ek DB connection; Postgres gira toh saare locks gaye. Jab critical section usi DB mein likhta hai — yahi sahi
     shuruaat. (Asli Postgres + MySQL <code>GET_LOCK</code> par — 3 servers ek cron, GC pause wala zombie, PgBouncer ka jaal: 🐘 SQL Gurukul ka <b>db-advisory</b> level, lab 10.)</p>`,
    `<h3>🎯 Granularity aur ordering</h3>
     <ul>
       <li>Entity par taala (order 123), <b>table par nahi</b> (sab kuch line mein).</li>
       <li>Har field ka alag taala nahi (status lock + payment lock → deadlock ka khatra).</li>
       <li>Kai taale chahiye toh <b>hamesha ek hi order</b> mein lo (jaise alphabetical).</li>
     </ul>
     <h3>🤔 Taala chahiye bhi?</h3>
     <ul>
       <li><b>Idempotent</b> kaam → <code>INSERT … ON CONFLICT DO NOTHING</code>.</li>
       <li>Takraav pakda ja sakta hai → <b>optimistic concurrency</b> (version column, <code>WHERE version = N</code>; haara retry kare — na taala, na deadlock, na timeout).</li>
       <li>External effects (payment/SMS) ke liye provider-supported idempotency, reconciliation aur ownership contract dekho. Fencing tabhi useful hai jab <b>resource token atomically validate</b> kare. Distributed mutex alone exactly-once effect prove nahi karta; shared-state coordination ke aur bhi valid lock use cases hain.</li>
     </ul>
     <p class="tip">🎯 Distributed lock ≠ mutex. Do alag chintayein: <b>liveness</b> (lease: mara holder hamesha na roke) aur <b>safety</b> (fencing:
     purana holder bigaad na sake).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 100 waiters: sabko jagao vs line mein agla',
      project: '36-distributed-locks',
      exercise: 'ex1-fencing',
      goal: 'Ek lock ke 100 intezaar karne wale — release par sabko jagane (herd) vs sirf agle ko jagane (ZooKeeper jaisa queue) mein kitne wake-ups?',
      why: `<code>services/lockd.js</code> ka <code>POST /wait</code>: <code>style=all</code> sabko jagata hai, <code>style=queue</code> sirf line mein pehle ko.
        Lost wake-up se bachne ke liye lock khaali ho toh wait turant lautta hai.`,
      steps: [
        { text: 'Lock servers chalao (agar band hain).', cmd: 'cd docker-labs/36-distributed-locks && npm start ex1-fencing', expect: 'ex1-fencing' },
        { text: 'Herd test.', cmd: 'node tools/herd.js', expect: 'style    lock handoffs   total wake-ups   bekaar jaagna (jaage par lock nahi mila)\nall           100            5050          4950\nqueue         100             100          0' },
      ],
      observe: {
        q: 'Wahi "all" tareeka 200 waiters par chalao (har waiter ek baar lock jeete). Lab ki ginti ke hisaab se kul kitne wake-ups?',
        choices: [
          '20,100 — har release par bache sab jaagte hain: 200 + 199 + … + 1',
          '19,900 — 199 + 198 + … + 1; pehle round ke 200 nahi gine jaate',
          '40,000 — har release par saare 200 waiters dobara jaagte hain',
          '200 — har release par sirf agla waiter jaagta hai, ek-ek karke',
        ],
        answer: 0,
        explain: 'Lab pehla round bhi ginta hai: 100 waiters par 100 + 99 + … + 1 = 5,050. 200 par wahi pattern: 200 + 199 + … + 1 = 200 × 201 / 2 = 20,100. Kaam ke sirf 200 — baaki bekaar jaagna. Waiters dugne, wake-ups lagbhag chaar guna: yahi N² ka dard hai.',
        choiceExplanations: [
          'Lab pehla round bhi ginta hai: 100 waiters par 100 + 99 + … + 1 = 5,050. 200 par wahi pattern: 200 + 199 + … + 1 = 200 × 201 / 2 = 20,100. Kaam ke sirf 200 — baaki bekaar jaagna. Waiters dugne, wake-ups lagbhag chaar guna: yahi N² ka dard hai.',
          'Lab pehle round ke wake-ups bhi ginta hai (100 waiters par 5,050). 200 par bhi pehle 200 gine jaayenge.',
          'Har release par jaagne wale ek kam hote jaate hain — 200, 199, 198 … Saare 200 har baar nahi.',
          '200 "sirf agla" (queue) wale tareeke ki ginti hai. "all" mein bache sab jaagte hain.',
        ],
      },
      lesson: 'Release par ek hi jaage — warna lock server khud bheed ka shikaar.',
    },
    {
      type: 'bins',
      title: 'Taala chahiye ya nahi?',
      instructions: 'Boundary chuno: ek DB ke atomic state change se kaam ho sakta hai, ya external execution/ownership contract bhi chahiye? External group ka matlab lock mandatory nahi.',
      bins: [
        { id: 'nolock', label: '🗃️ Single-DB atomicity / OCC' },
        { id: 'lock', label: '🔗 External execution / ownership' },
      ],
      items: [
        { text: 'Signup par welcome email ka record ek hi baar bane', bin: 'nolock', explain: 'Unique constraint + ON CONFLICT DO NOTHING.' },
        { text: 'Card par paisa kaatna (payment gateway)', bin: 'lock', explain: 'Provider-side stable operation ID/dedup, ambiguous outcome reconciliation aur allowed retry window verify karo. Local lock remote effect atomically dedupe nahi karta.' },
        { text: 'Profile edit — do tabs se ek saath', bin: 'nolock', explain: 'Version column — haara retry kare.' },
        { text: 'Paid SMS API se OTP bhejna', bin: 'lock', explain: 'External send boundary hai: provider idempotency supported ho toh stable key use karo; warna ambiguous retry duplication/loss tradeoff explicit karo. Mutex alone delivery uniqueness prove nahi karta.' },
        { text: 'Counter badhana (likes)', bin: 'nolock', explain: 'Atomic UPDATE likes = likes + 1.' },
        { text: 'Raat ka billing job sirf ek machine chalaye', bin: 'lock', explain: 'Leader election / lease — aur job ki idempotency key.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — choosing a lock',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Order processing mein double processing rokni hai. Redis lock lagayein?"',
        choices: [
          'Pehle order status par atomic update ya unique key; bahar ka effect ho toh fencing dekho',
          'Redis SET NX akela hi payment ka side effect exactly-once kar deta hai, aur kuch nahi',
          'Paanch Redis leases (Redlock) lo — client ka pause aur retries dono khatam ho jaayenge',
          'Java ka synchronized lagao — process ka mutex saari service machines ko sambhal lega',
        ],
        answer: 0,
        explain: 'Pehle poochho: lock chahiye bhi? Ek DB ka niyam ho toh shart wala update (WHERE status = \'new\'), unique constraint ya transaction kaafi hai — critical section Postgres mein hi ho toh pg_advisory_xact_lock bhi. Bahar ka effect ho toh idempotency aur fencing manne wala contract chahiye. Lock holder ruk sakta hai, aur adhoora jawab bhi aa sakta hai. Quorum lease client ka chalta kaam nahi rokti.',
        choiceExplanations: [
          'Pehle poochho: lock chahiye bhi? Ek DB ka niyam ho toh shart wala update (WHERE status = \'new\'), unique constraint ya transaction kaafi hai — critical section Postgres mein hi ho toh pg_advisory_xact_lock bhi. Bahar ka effect ho toh idempotency aur fencing manne wala contract chahiye. Lock holder ruk sakta hai, aur adhoora jawab bhi aa sakta hai. Quorum lease client ka chalta kaam nahi rokti.',
          'Lock lene ke baad holder ruk sakta hai aur lease chali jaati hai. Payment ko khud dedupe karna padta hai.',
          'Quorum lock servers ke beech hai. Client ka pause aur retries phir bhi hote hain.',
          'Process ka mutex sirf usi process ke threads ko rokta hai. Doosri machines alag hain.',
        ],
      },
      {
        q: 'Interviewer: "Kai workers ek lock ke liye ruke hain, aur lock server ka CPU 100% ho jaata hai. Kya karoge?"',
        choices: [
          'Line banao: har waiter sirf apne aage wale ko dekhe, ya hadd wala jittered backoff',
          'Lease lambi kar do — lambi lease se har release par jaagne wale kam ho jaayenge',
          'Bada lock server le lo — bade server se bheed wala ganit hi badal jaayega, poora',
          'Aur workers jod do — ek hi lock par zyada workers se kaam aur tez ho jaayega',
        ],
        answer: 0,
        explain: 'Thundering herd: har release par sab waiters jaagte hain, ek jeet-ta hai, baaki phir so jaate hain. Ek-ek karke saunpo: line (jaise ZooKeeper ke sequential nodes — har waiter sirf aage wale ko dekhe), ya hadd wala jittered backoff. Cancel, chhoota hua wake-up aur fairness bhi sambhalo. Lambi lease ya bada server wahi N² ka ganit rakhte hain.',
        choiceExplanations: [
          'Thundering herd: har release par sab waiters jaagte hain, ek jeet-ta hai, baaki phir so jaate hain. Ek-ek karke saunpo: line (jaise ZooKeeper ke sequential nodes — har waiter sirf aage wale ko dekhe), ya hadd wala jittered backoff. Cancel, chhoota hua wake-up aur fairness bhi sambhalo. Lambi lease ya bada server wahi N² ka ganit rakhte hain.',
          'Lease ki lambai jagaane ka tareeka nahi badalti. Release par phir sab jaagenge.',
          'Bada CPU wahi bekaar ka kaam jaldi karega. Bheed N² ki tarah badhti rahegi.',
          'Ek lock ek waqt mein ek ko milta hai. Zyada waiters = zyada bheed, zyada kaam nahi.',
        ],
      },
    ],
  },
  success: [
    'Main ZooKeeper, Redis aur Postgres advisory locks mein chun sakta hoon',
    'Main granularity aur ordering se deadlock bacha sakta hoon',
    'Main bata sakta hoon kab lock chahiye hi nahi',
  ],
  homework: `<p>Apne codebase mein har distributed lock dhoondho. Har ek ke saamne: kya kaam idempotent ho sakta hai? Version column se ho sakta hai?
    Agar lock sach mein chahiye — fencing token ya storage-level check hai? Aur TTL/renew/pause budget measured hai? Resource stale token atomically reject karta hai?</p>`,
  cards: [
    { front: 'ZooKeeper lock?', back: 'Ephemeral sequential waiter nodes; predecessor watch unnecessary herd reduce karta hai. Session expiry par ephemeral removal; temporary disconnect immediate expiry nahi. Recoverable errors/watch races handle karo; latency measure karo.' },
    { front: 'Postgres advisory lock?', back: 'pg_advisory_lock / pg_advisory_xact_lock (COMMIT par khud chhoote); naya infra nahi, crash-safe, deadlock detection, ~1 ms. Critical section usi DB mein ho toh best shuruaat.' },
    { front: 'Lock kab chahiye hi nahi?', back: 'Single-DB invariant atomic constraint/update/OCC se solve ho sakta hai. External effect ke liye provider idempotency/reconciliation inspect karo. Locks shared coordination mein valid ho sakte hain; resource fencing alone payment dedupe nahi.' },
  ],
},
]);

})();
