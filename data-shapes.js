(() => {
/* =====================================================================
   TRACK 6 — Patterns & System Shapes
   classify · search · media · realtime · geo · ledger ·
   antipattern · coffeeshop · review · boss-shapes

   Yeh track SYNTHESIS hai: pehle paanch tracks ne parts diye,
   yahan un parts ko SHAPES mein pehchanna sikhte hain.
   `allOf` data-flow.js mein define hai (script scope shared hai).
   ===================================================================== */

const T_GEO = [
  { text: 'Table dekho — kitne drivers hain',
    check: s => s.records.some(r => r.kind === 'showTables') },
  { text: 'Bina index ke ek cell ke drivers maango — full scan dekho',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined > 1000000) },
  { text: 'geohash par composite index banao (geohash, updated_at)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash' && r.cols[1] === 'updated_at' && SD.mission.index(s, 'drivers', ['geohash', 'updated_at'])) },
  { text: 'Ab wahi query — 1000 se kam rows examined honi chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash' && r.cols[1] === 'updated_at' && SD.mission.index(s, 'drivers', ['geohash', 'updated_at']));
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined < 1000);
    } },
  { text: 'Ab hot cell: airport par surge — ek cell par 40,000 rps',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.key === 'cell:te7ud9' && r.rps === 40000 && r.hot === true) },
  { text: "cell:te7ud9 key ki copies banao aur 40,000 rps ka load baanto (cell ko naqshe par todna nahi, sirf copies)",
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.key === 'cell:te7ud9' && r.rps === 40000 && r.hot === false && r.replicas > 1 && r.rps === 40000 && r === SD.mission.latest(s, 'cache', 'hotkey')) },
];
const T_REVIEW = [
  { text: 'Aaj ke numbers estimate karo',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Aaj ka load chalao (500 rps) — system theek hona chahiye',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 500 && r.saturated === false) },
  { text: 'Ab 10x load daalo — kuch toota hoga',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 5000 && r.saturated === true) },
  { text: 'metrics se dekho ki sabse pehle kya toota',
    check: s => s.records.some(r => r.kind === 'metrics') },
  { text: 'Ek trace lo — waqt kahan ja raha hai',
    check: s => s.records.some(r => r.kind === 'trace') },
  { text: "Pool 200 kar do",
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool' && r.n === 200 && s.sys.pool.size === 200) },
  { text: 'Ab 10x dobara — ab saturated nahi hona chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool' && r.n === 200 && s.sys.pool.size === 200);
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps === 5000 && r.saturated === false && r.revision === s.revision);
    } },
];
const T_BOSS_SHAPES = [
  { text: 'Peak ka andaaza lagao',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Naive design par 8,000 rps chalao — design girega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 8000 && r.saturated === true) },
  { text: 'trace se dekho ki waqt kahan ja raha hai',
    check: s => s.records.some(r => r.kind === 'trace') },
  { text: 'Sabse bada kharch: har request par COUNT(*) — countTotal false karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /countTotal/.test(r.path) && r.value === false && s.sys.api.countTotal === false) },
  { text: "Alag prayog: cell:te7ud9 par 40,000 rps ki padhai (8000 rps ke API load se alag)",
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.key === 'cell:te7ud9' && r.rps === 40000 && r.hot === true) },
  { text: "cell:te7ud9 key ki copies banao (simulator cell ko naqshe par nahi todta, sirf copies)",
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.key === 'cell:te7ud9' && r.rps === 40000 && r.hot === false && r.replicas > 1) },
  { text: 'Read path ko cache do — TTL par jitter ke saath',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache' && r.cfg && r.cfg.jitterPct > 0 && s.sys.api.cache?.jitterPct > 0) },
  { text: 'Ek key ke ek-saath miss ko single-flight se samet lo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === true && r.dbQueries === 1) },
  { text: "restaurant_svc par 300ms ka timeout lagao",
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'timeout' && r.target === 'restaurant_svc' && r.ms === 300 && s.sys.deps.restaurant_svc?.timeoutMs === 300) },
  { text: 'Aur ek fallback — taaki downstream girne par bhi jawab mile',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'fallback' && r.target === 'restaurant_svc' && !!s.sys.deps.restaurant_svc?.fallback) },
  { text: "Har request ka samay ghatane ke baad pool 300 kar do",
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool' && r.n === 300 && s.sys.pool.size === 300) },
  { text: 'Ab 8,000 rps dobara — ab system khada rehna chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool' && r.n === 300 && s.sys.pool.size === 300);
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps === 8000 && r.saturated === false && r.revision === s.revision);
    } },
  { text: '99.9% SLO ka budget padho: kitna kharch hua, kitna bacha, kis raftaar se jal raha hai',
    check: s => s.records.some(r => r.kind === 'slo' && r.avail === 99.9 && r.observedSec > 0 && Number.isFinite(r.remainingMin) && r === SD.mission.latest(s, 'slo')) },
];

SD.registerLevels('shapes', [

/* =====================================================================
   L1 — Pattern classification: boxes se pehle naam
   ===================================================================== */
{
  id: 'classify',
  icon: '🏷️',
  title: 'Pehle Naam Lo, Phir Box Banao',
  badge: 'Pattern Parakhi',
  objectives: [
    'Chaar sawaal jo 30 second mein pattern bata dete hain',
    '12 shapes — aur har ek ka <b>jaana-pehchana</b> failure mode',
    'Ek system mein aksar 2–3 shapes hote hain, ek nahi',
    'Naam aate hi tradeoffs khud saamne aa jaate hain',
  ],
  lesson: [
    `<h3>📖 Log design mein fansate kyun hain</h3>
     <p>"Instagram design karo" sunte hi zyadatar log <b>boxes banane</b> lagte hain —
     load balancer, service, DB, cache, queue. Boxes shayad sahi bhi hon, par boxes ke
     peechhe koi soch nahi hoti. Poochho "cache kyun?" toh jawab aata hai "scale ke liye".</p>
     <p>Ek chhota sa kadam sab badal deta hai: <b>boxes banane se pehle problem ka
     naam lo.</b></p>
     <pre>"Instagram ek READ-HEAVY problem hai jisme ek REALTIME FANOUT hissa hai."</pre>
     <p>Ab tumhare paas soch ka dhaancha hai. Read-heavy ka matlab hai: source of truth
     kya hai, kya cache hoga, cache miss par kya, replication kaisi. Realtime fanout ka
     matlab hai: connections kaun sambhaalega, offline user ko kya milega, fanout
     write par ya read par. Tumne kuch yaad nahi kiya — tumne <b>daayra chhota</b> kar liya.</p>
     <h3>⏱️ Chaar sawaal — 30 second</h3>
     <table>
       <tr><th>Sawaal</th><th>Kya khulta hai</th></tr>
       <tr><td>1. Read zyada ya write zyada?</td><td>Read-heavy → cache, replicas. Write-heavy → append log, partitioning</td></tr>
       <tr><td>2. Turant chahiye ya thodi der mein chalega?</td><td>Turant → push/websocket. Thodi der → queue, batch</td></tr>
       <tr><td>3. Users ko serve kar rahe ho ya data process?</td><td>Serve → latency, p99. Process → throughput, cost</td></tr>
       <tr><td>4. Ek user ka kaam ya laakhon tak fanout?</td><td>Fanout → hot keys, celeb problem, precompute</td></tr>
     </table>
     <p class="tip">🎯 Paanchva sawaal jo aksar sabse zyada matter karta hai:
     <b>"Yahan galat jawab kitna mehenga hai?"</b> Ek feed mein purana post dikh jaana
     theek hai. Ek wallet mein galat balance dikhna theek <b>nahi</b> hai.
     Yahi ek sawaal caching, consistency aur transactions — teenon ka jawab de deta hai.</p>`,
    `<h3>🗺️ 12 shapes aur jaane-pehchane failure modes</h3>
     <table>
       <tr><th>Shape</th><th>Udaharan</th><th>Yahi toota hai</th></tr>
       <tr><td>1. Read-heavy</td><td>Feed, catalog, profile</td><td>Cache invalidation · hot key</td></tr>
       <tr><td>2. Write-heavy / event</td><td>Logs, metrics, payments</td><td>Duplicate events · partition key ka chunav</td></tr>
       <tr><td>3. Realtime fanout</td><td>Chat, notifications, live score</td><td>Connection storm · offline user ka backlog</td></tr>
       <tr><td>4. Batch / analytics</td><td>Dashboards, DAU reports</td><td>Freshness vs cost · pipeline chup-chaap fail</td></tr>
       <tr><td>5. Search & filter</td><td>Search bar, autocomplete</td><td>Indexing lag · relevance</td></tr>
       <tr><td>6. File & media</td><td>Photos, video</td><td>App ke through proxy karna · storage cost</td></tr>
       <tr><td>7. Workflow orchestration</td><td>Order pipeline, approvals</td><td>Beech mein fail · compensating action</td></tr>
       <tr><td>8. Transactional / ledger</td><td>Wallet, payments</td><td>"Numbers match nahi kar rahe"</td></tr>
       <tr><td>9. Recommendation</td><td>Home feed, "aapke liye"</td><td>Cold start · training-serving skew</td></tr>
       <tr><td>10. Notification</td><td>Email, push, SMS</td><td>Duplicate bhejna · 9AM par 50 lakh ek saath</td></tr>
       <tr><td>11. Geo / spatial</td><td>Nearby drivers, delivery</td><td>Hot cell · cell boundary par results</td></tr>
       <tr><td>12. Distributed coordination</td><td>Scheduler, leader election</td><td>Split brain · clock skew</td></tr>
     </table>
     <p><b>Zaroori:</b> asli systems mein aksar 2–3 shapes hote hain. Instagram =
     read-heavy (feed) + media (photos) + realtime fanout (notifications) +
     recommendation (explore). Har hisse ko hisse ke apne shape se design karo —
     ek hi hathoda sab par mat chalao.</p>
     <p class="tip">🎯 Shapes ke 12 naam yaad karne ki cheez nahi hain. Shapes ke naam ka faayda hai ki
     naam ke saath <b>failure mode</b> aata hai. Jaise hi tum bolo "system realtime fanout
     hai", agla sawaal khud aa jaata hai: "offline user ka kya hoga?" — aur wahi sawaal
     asli design hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Is problem ka shape kya hai?',
      instructions: 'Har system ko system ke MUKHYA shape mein daalo.',
      bins: [
        { id: 'read', label: '📖 Read-heavy' },
        { id: 'write', label: '✍️ Write-heavy / event' },
        { id: 'fan', label: '📡 Realtime fanout' },
        { id: 'txn', label: '💰 Transactional / ledger' },
      ],
      items: [
        { text: 'Product catalog — din mein ek baar update, crore views', bin: 'read', explain: 'Read:write ratio ~100000:1. Poora design cache aur CDN ke around banega; DB lagbhag chhua hi nahi jaayega.' },
        { text: 'IoT sensors se 5 lakh readings/sec', bin: 'write', explain: 'Append-only, kabhi update nahi, reads range-scan by time. LSM + time-partitioning ka classic case.' },
        { text: 'Cricket ka live score 50 lakh screens par', bin: 'fan', explain: 'Ek write, laakhon receivers. Sawaal "DB kaisa" nahi — "connections kaun rakhega aur update kaise pahunchega" hai.' },
        { text: 'Wallet — paisa add karo, kharch karo, balance dikhao', bin: 'txn', explain: 'Yahan galat jawab ki keemat sabse zyada hai. Double-entry ledger, strong consistency, aur reconciliation — cache ka sawaal baad mein aata hai.' },
        { text: 'Group chat mein message bhejna', bin: 'fan', explain: 'Ek message → N members ko turant. Aur asli sawaal: offline member ka kya? Yahi is shape ka signature failure mode hai.' },
        { text: 'Application logs ingest karna — 2 TB/din', bin: 'write', explain: 'Bhaari append, kabhi update nahi, aur read pattern "aakhri ek ghanta" hota hai. Kafka + object storage + retention policy.' },
        { text: 'News homepage — sabko lagbhag ek jaisa dikhta hai', bin: 'read', explain: 'Ek hi content laakhon ko. Yahan precompute + CDN itna kaam kar dete hain ki backend lagbhag idle rehta hai.' },
        { text: 'Refund — merchant se paise wapas user ke wallet mein', bin: 'txn', explain: 'Do systems ke beech paisa. Idempotency, ledger entries, aur reconciliation job — teenon zaroori. Workflow bhi hai, par system ka DIL transactional hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Shape → jaana-pehchana failure mode',
      pairs: [
        { left: 'Search & filtering', right: 'Indexing lag — "maine save kiya, search mein nahi dikh raha"', explain: 'Search index lagbhag hamesha <b>async</b> bharta hai. Bug nahi, design hai — par user ko dikhna chahiye ("indexing ho raha hai"), warna user dobara save karega.' },
        { left: 'Geo / spatial', right: 'Hot cell — airport par surge, ek cell mein saare drivers', explain: 'Geo data <b>uniformly</b> nahi bikhra hota. Aadha shehar ek cell mein aa jaata hai. Cell size fixed rakhna hi galti hai — adaptive grid ya cell splitting chahiye.' },
        { left: 'Notification', right: '9:00 AM par 50 lakh notifications ek saath', explain: 'Sabne "subah 9 baje" chuna. Ilaaj: schedule ko jaan-boojh ke <b>stagger</b> karo (±15 min jitter) aur user ke timezone se baandho.' },
        { left: 'File & media', right: 'App server ke through 4 GB video proxy karna', explain: 'Upload app ke through jaane ka matlab hai poore upload ke doraan ek thread + ek connection block. Ilaaj: presigned URL se client seedha object storage par likhe.' },
        { left: 'Distributed coordination', right: 'Split brain — do nodes ek saath "main leader hoon" maante hain', explain: 'Network partition mein purana leader ko pata hi nahi chalta ki leader ka lease khatam ho gaya. Ilaaj: fencing token — har write ke saath ek badhta hua number, aur storage purana number reject kare.' },
        { left: 'Batch / analytics', right: 'Pipeline chup-chaap fail — dashboard purana data dikhata raha', explain: 'Sabse khatarnak isliye ki koi error nahi dikhta. Ilaaj: <b>freshness</b> par alert karo ("aakhri successful run 3 ghante purana hai"), sirf failure par nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Classification ki samajh',
      questions: [
        {
          q: 'Pattern ka naam lene ka asli faayda kya hai?',
          choices: [
            'Naam ke saath pattern ke jaane-pehchaane tradeoffs aur failure ke sawaal aa jaate hain',
            'Pattern ka naam le liya toh system ki capacity apne aap saabit ho jaati hai, bas',
            'Pattern ka naam lene se code bhi apne aap sahi likha jaata hai, bina kisi bug ke',
            'Do systems ka diagram ek jaisa dikhe toh dono ka workload bhi ek jaisa hota hai',
          ],
          answer: 0,
          explain: 'Naam ek checklist khol deta hai. "Realtime fanout" bolte hi khud poochhoge: offline user ka kya? connection storm par kya? fanout likhte waqt ya padhte waqt? Bina naam ke tum wahi 3 boxes banaate ho jo pichhli baar banaye the.',
          choiceExplanations: [
            'Naam ek checklist khol deta hai. "Realtime fanout" bolte hi khud poochhoge: offline user ka kya? connection storm par kya? fanout likhte waqt ya padhte waqt? Bina naam ke tum wahi 3 boxes banaate ho jo pichhli baar banaye the.',
            'Naam sirf sahi sawaal deta hai. Capacity naap ke hi pata chalti hai.',
            'Naam design ki disha deta hai. Code ki galtiyan phir bhi test se pakadni padti hain.',
            'Ek jaise boxes ke peeche bilkul alag load ho sakta hai. Workload numbers se naapo.',
          ],
        },
        {
          q: 'Instagram ka shape kya hai?',
          choices: [
            'Feed read-heavy, photos media, follow rishton ka graph, notifications realtime fanout',
            'Feed read-heavy, photos ledger, follow rishton ka graph, notifications realtime fanout',
            'Feed batch analytics, photos media, follow rishton ka graph, notifications realtime fanout',
            'Feed read-heavy, photos media, follow rishton ka graph, notifications batch analytics',
          ],
          answer: 0,
          explain: '"Pattern rat lena" aur "pattern samajhna" mein yahi farak hai. Asli systems mein 2–3 shapes hote hain, aur har hisse ka alag failure mode. Ek hi hathoda sab par chalaya toh log photos ko DB mein daal dete hain.',
          choiceExplanations: [
            '"Pattern rat lena" aur "pattern samajhna" mein yahi farak hai. Asli systems mein 2–3 shapes hote hain, aur har hisse ka alag failure mode. Ek hi hathoda sab par chalaya toh log photos ko DB mein daal dete hain.',
            'Photos bytes hain — media shape. Ledger paise ke hisaab ke liye hota hai.',
            'Feed har request par padhi jaati hai — read-heavy. Batch analytics der se chalne wali reports ke liye hai.',
            'Notifications turant pahunchni chahiye — realtime fanout. Batch analytics der se chalti hai.',
          ],
        },
        {
          q: 'Chaar classification sawaalon ke baad, paanchva sawaal jo sabse zyada matter karta hai?',
          choices: [
            '"Yahan galat ya purana jawab kitna mehenga hai?" — caching aur consistency yahi tay karta',
            '"Kitne users honge?" — bas users ki ginti dekh ke consistency chuno, aur kuch nahi',
            '"Tech ka budget kitna hai?" — bas budget dekh ke sahi-galat ka faisla kar lo',
            '"Team kitni badi hai?" — bas team ke size se privacy ka faisla kar lo, seedha',
          ],
          answer: 0,
          explain: 'Feed mein 30 second purana post dikhe toh chalta hai — isliye tez caching aur eventual consistency. Wallet mein purana balance dikhe toh nahi chalta — wallet mein cache khatra hai. Ek hi sawaal ne dono systems ka data layer tay kar diya.',
          choiceExplanations: [
            'Feed mein 30 second purana post dikhe toh chalta hai — isliye tez caching aur eventual consistency. Wallet mein purana balance dikhe toh nahi chalta — wallet mein cache khatra hai. Ek hi sawaal ne dono systems ka data layer tay kar diya.',
            'Users ki ginti scale batati hai. Galat jawab kitna dard dega, users ki ginti nahi batati.',
            'Budget zaroori hai, par sahi-galat ki keemat pehle aati hai. Wallet sasta karke galat nahi chal sakta.',
            'Team ka size kaam baantne ka sawaal hai. Privacy aur sahi jawab data se tay hote hain.',
          ],
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — "Design Twitter" ka pehla kadam',
      instructions: 'Boxes se pehle: har hisse ka shape aur hisse ka sabse zaroori decision chuno.',
      brief: `Interviewer ne kaha: <b>"Twitter design karo."</b> 30 crore users, ek user
        average 200 logon ko follow karta hai, kuch celebs ke 5 crore followers hain.
        Tum abhi boxes nahi bana rahe — tum <b>shapes</b> pehchaan rahe ho.`,
      requirements: [
        'Timeline p99 &lt; 200ms',
        'Celeb ke 5 crore followers',
        'Tweet 5 second mein dikh jaaye',
      ],
      pass: 11,
      slots: [
        {
          id: 'shape', label: 'Timeline ka mukhya shape', icon: '🏷️',
          options: [
            { id: 'rh', label: "Read-heavy, har user ka alag fanout", score: 3, why: 'Sahi. Ek tweet likha jaata hai, laakhon baar padha jaata hai. Read:write ~1000:1. Isliye poora design read path ke around banega — aur likhne par extra kaam karna manzoor hai.' },
            { id: 'wh', label: "Write-heavy, sirf jodne wala audit log", score: -2, why: 'Tweets ki sankhya reads ke saamne kuch bhi nahi hai. Is naam se tum galat cheez optimize karoge — ingest pipeline banaoge jabki dard timeline read mein hai.' },
            { id: 'tx', label: "Pakka atomic, kai resources wala ledger", score: -3, why: 'Tweet kho jaana bura hai par vittiya nuksaan nahi. Yahan strong consistency ki keemat chukane ki koi wajah nahi — strong consistency ki keemat latency mein chukani padti.' },
          ],
        },
        {
          id: 'fanout', label: 'Timeline kab banega', icon: '📡',
          options: [
            { id: 'hybrid', label: "Hybrid fanout: celeb ke tweets read par jodo", score: 3, why: 'Yahi asli jawab hai. Aam user ke liye write par fanout (200 inboxes likhna sasta hai, aur read turant ho jaata hai). Celeb ke liye write-fanout 5 crore writes ban jaata — isliye celeb tweets read par merge hote hain. Twitter yahi karta hai.' },
            { id: 'write', label: "Har follower ka inbox likhte waqt bharo", score: -1, why: 'Aam users ke liye sahi, par ek celeb ka tweet 5 crore inbox writes bana dega — ek tweet se poora cluster ruk jaayega. "Celebrity problem" is shape ka signature failure mode hai.' },
            { id: 'read', label: "Har timeline padhte waqt naye sire se banao", score: -1, why: 'Har timeline load par 200 logon ki latest tweets fetch aur merge karni padengi — p99 200ms lagbhag namumkin. Read-heavy system mein kaam <b>write</b> par karo, read par nahi.' },
          ],
        },
        {
          id: 'media', label: 'Tweet ke saath images', icon: '🖼️',
          options: [
            { id: 'obj', label: "Object store + CDN, DB mein sirf metadata", score: 3, why: 'Sahi — images ek alag shape (media) hain, aur media ko alag design chahiye. DB mein sirf metadata; bytes S3 par, aur users ke paas CDN se.' },
            { id: 'blob', label: "Bade BLOBs transaction wale DB mein", score: -3, why: 'Classic galti. Images DB ka buffer pool kha jaayengi (asli queries slow hongi), backup ka size 100x ho jaayega, aur replication lag chad jaayega. DB metadata ke liye hai, bytes ke liye nahi.' },
            { id: 'fs', label: "Sirf app ki local disk, jo restart par mitti", score: -2, why: 'Instance ephemeral hai — restart par gaya. Aur do instances ka data alag ho jaayega. Local disk sirf single-server duniya mein chalti hai.' },
          ],
        },
        {
          id: 'cost', label: 'Galat jawab ki keemat', icon: '⚖️',
          options: [
            { id: 'eventual', label: "Kitna purana chalega, saaf budget tay karo", score: 2, why: 'Sahi soch. Ek line poore data layer ko khol deti hai: aggressive caching, async fanout, read replicas — sab manzoor ho jaate hain kyunki thodi purani timeline se kisi ka nuksaan nahi.' },
            { id: 'strong', label: "Har jagah turant, global visibility zaroori", score: -2, why: 'Har jagah turant taaza timeline ki shart se reads ko writes ke saath taal-mel rakhna padega — latency aur availability ka kharcha badhta hai, jiski business ko zaroorat hi nahi thi. (Strong visibility ka matlab har follower ka inbox sync likhna nahi; inbox kab banana hai, alag faisla hai.)' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Tumne boxes banane se pehle <b>shapes</b> pehchaan liye — aur isi wajah se hybrid fanout khud saamne aa gaya, yaad karne ki zaroorat nahi padi.',
        ok: '👍 Theek hai, par ek decision ne tumhe galat direction mein dhakela. Har option ka "why" padho — asli seekh wahi hai.',
        bad: '🤔 Design Twitter shapes ka sawaal tha, components ka nahi. Dobara socho: kaun sa hissa read-heavy hai, kaun sa media, aur galat jawab kahan mehenga hai.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Pattern pehchaan',
    instructions: 'Pehle 60 second mein pattern bol dena hi aadha jawab hai. 🎤',
    questions: [
      {
        q: '"UberEats design karo." Shuruaat kaise karoge?',
        choices: [
          'Pehle requirements; phir shapes pehchaano — geo, order workflow aur live tracking',
          'Pehle microservices ki ginti tay karo — kitni services, yahi pehla faisla hai',
          'Pehle DB ka brand chuno — user ki journey baad mein dekh lenge, aaram se',
          'Ek queue laga do — queue lagate hi payment bhi apne aap sahi chalne lagega',
        ],
        answer: 0,
        explain: 'Pehle user journey, non-functional zaroorat (latency, scale) aur niyam (paisa do baar na kate) saaf karo. Phir shapes pehchaano: paas ke restaurants aur riders (geo), order ka lifecycle (workflow), live tracking (realtime fanout). Kahan se shuru karna hai — order se ya matching se — scope ka faisla hai, koi pakka pehla vaakya nahi.',
        choiceExplanations: [
          'Pehle user journey, non-functional zaroorat (latency, scale) aur niyam (paisa do baar na kate) saaf karo. Phir shapes pehchaano: paas ke restaurants aur riders (geo), order ka lifecycle (workflow), live tracking (realtime fanout). Kahan se shuru karna hai — order se ya matching se — scope ka faisla hai, koi pakka pehla vaakya nahi.',
          'Services ki ginti design ka nateeja hai, shuruaat nahi. Pehle samjho kya banana hai.',
          'Brand tab chuno jab pata ho data kaisa hai aur kaise padha jaayega.',
          'Queue kaam ko baad mein karti hai, sahi nahi karti. Payment ke niyam alag se chahiye.',
        ],
      },
      {
        q: '"Problem read-heavy hai — aage kya poochhoge?"',
        choices: [
          'Data kitna taaza chahiye, cache kis key par, kitna reuse, aur cache miss par kya hoga',
          'Redis lo — Redis ka brand chunte hi padhne ke saare risk apne aap band ho jaate hain',
          'Read replicas laga do — replicas se purana data dikhna apne aap zero ho jaata hai',
          'CDN laga do — CDN har user ka private data bhi sabke saath safe share karta hai',
        ],
        answer: 0,
        explain: 'Baaki teen jawab bina sawaal ke jawab hain. Shape ki checklist sahi kram deti hai: source of truth kya hai, kya aur kis key par cache hoga, miss par kya hota hai, aur kitna purana data chalega. Tool ka naam (Redis ya Memcached) sabse aakhir mein aata hai, aur sabse kam matter karta hai.',
        choiceExplanations: [
          'Baaki teen jawab bina sawaal ke jawab hain. Shape ki checklist sahi kram deti hai: source of truth kya hai, kya aur kis key par cache hoga, miss par kya hota hai, aur kitna purana data chalega. Tool ka naam (Redis ya Memcached) sabse aakhir mein aata hai, aur sabse kam matter karta hai.',
          'Brand chunna sawaal ka jawab nahi. Taazgi, key aur miss ka raasta pehle tay karo.',
          'Replicas peeche chal sakte hain — purana data dikh sakta hai. Lag naapna padta hai.',
          'Private data CDN par galat key se doosre ko dikh sakta hai. Har cheez share karne layak nahi.',
        ],
      },
    ],
  },
  success: [
    'Chaar sawaalon se 30 second mein pattern bol sakte ho',
    '12 shapes aur failure modes jaante ho',
    'Ek system mein kai shapes pehchaan sakte ho',
    '"Galat jawab kitna mehenga hai" se data layer decide kar sakte ho',
  ],
  homework: `Apne kaam ka system lo aur use tod ke likho: har hissa kaunsa shape hai.
    Phir har shape ke saamne shape ka jaana-pehchana failure mode likho —
    aur poochho "hum failure mode ke liye tayyar hain?"`,
  cards: [
    { front: 'Boxes se pehle kya?', back: 'Problem ka <b>naam</b>. "Problem read-heavy hai jisme realtime fanout ka hissa hai." Naam ke saath problem ke failure modes aate hain — aur wahi agle sawaal hain.' },
    { front: 'Classification ke 4 sawaal?', back: '1. Read ya write zyada? 2. Turant ya thodi der mein? 3. Serve ya process? 4. Ek user ya laakhon tak fanout?' },
    { front: 'Paanchva (sabse zaroori) sawaal?', back: '<b>"Galat jawab kitna mehenga hai?"</b> Feed mein purana post = theek. Wallet mein purana balance = nahi. Ek sawaal ne caching, consistency aur transactions teenon tay kar diye.' },
    { front: 'Ek system = ek shape?', back: 'Nahi — aksar 2–3. Instagram = read-heavy + media + realtime fanout + recommendation. Har hisse ko hisse ke apne shape se design karo.' },
    { front: 'Twitter timeline ka asli jawab?', back: '<b>Hybrid fanout</b> — aam user ke liye write par (200 inboxes sasta), celeb ke liye read par merge (warna 5 crore writes). Hybrid fanout "celebrity problem" ka standard hal hai.' },
  ],
},

/* =====================================================================
   L2 — Search & inverted index
   ===================================================================== */
{
  id: 'search',
  icon: '🔍',
  title: 'Search — Jahan LIKE %...% Mar Jaata Hai',
  badge: 'Index Anveshak',
  objectives: [
    'B-tree text search kyun nahi kar sakta — aur inverted index kaise karta hai',
    'Async indexing lag: "maine save kiya, search mein nahi dikh raha"',
    'Relevance ek <b>product</b> decision hai, DB decision nahi',
    'Search index kabhi source of truth nahi hota',
  ],
  lesson: [
    `<h3>📖 Ek query jo har startup ko ek din kaatti hai</h3>
     <pre>SELECT * FROM products WHERE name LIKE '%wireless%';</pre>
     <p>LIKE query 10,000 rows tak theek chalti hai. 50 lakh par LIKE query <b>full table scan</b> hai —
     aur index laga dene se bhi kuch nahi hota. Kyun? Kyunki B-tree ek <b>sorted</b>
     dhaancha hai. B-tree "w se shuru hone wale" jaldi dhoondh sakta hai, par
     "jisme kahin bhi wireless ho" ke liye B-tree ko har row dekhni hi padegi.
     <code>LIKE 'wireless%'</code> index use karta hai; <code>LIKE '%wireless%'</code>
     nahi kar sakta — aur prefix aur substring ka farak sirf ek <code>%</code> ka hai.</p>
     <h3>🔄 Inverted index — table ko ulta kar do</h3>
     <pre>NORMAL index:   row → row ke shabd
   doc 12  →  "wireless bluetooth headphones"
   doc 47  →  "wireless mouse"

INVERTED index: shabd → un rows ki list
   "wireless"   →  [12, 47, 88, 301, ...]
   "bluetooth"  →  [12, 205, ...]
   "headphones" →  [12, 99, ...]</pre>
     <p>Ab "wireless bluetooth" ki search do sorted lists ka <b>intersection</b> hai —
     aur intersection microseconds ka kaam hai, chahe crore documents hon.
     Yahi Elasticsearch/Lucene, Postgres ka GIN, aur har search engine karta hai.</p>
     <p>Par index banane se pehle text ko <b>saaf</b> karna padta hai — aur yahi hissa
     search ko "database" se alag banata hai:</p>
     <pre>"Wireless Headphones!"
  → lowercase        "wireless headphones!"
  → tokenize         ["wireless", "headphones!"]
  → punctuation      ["wireless", "headphones"]
  → stopwords hatao  (the, a, is, aur...)
  → stemming         ["wireless", "headphone"]   ← "headphones" bhi milega
  → synonyms         earphone → headphone</pre>
     <p class="tip">🎯 Yahi wajah hai ki search "bas ek index" nahi hai —
     search ek <b>bhasha</b> ka faisla hai. Hindi ke liye stemming alag hogi, aur
     "iphone 15" ko "iphone" + "15" mein todna sahi hai ya nahi, token todne ka faisla product decide
     karta hai, database nahi.</p>`,
    `<h3>⏳ Indexing lag — is shape ka signature bug</h3>
     <p>Search index lagbhag hamesha <b>alag</b> system hai (Elasticsearch), aur usme
     data <b>async</b> pahunchta hai:</p>
     <pre>POST /products  →  Postgres (source of truth)  ✅ 200 OK
                        ↓ (event / CDC)
                   Elasticsearch                  ⏳ 2–30 second
GET /search?q=... →  abhi tak nahi mila            😕</pre>
     <p>User ne product save kiya, list mein dikh raha hai, par search mein nahi.
     User soch le<b>ga</b> ki save nahi hua — aur dobara save karega. Ab tumhare paas
     duplicate hai.</p>
     <p>Ilaaj bug fix karna nahi hai — indexing lag design hai. Ilaaj <b>UX</b> hai:</p>
     <table>
       <tr><td>Apna banaya hua item</td><td>Search bypass karke seedha DB se dikhao ("read your own writes")</td></tr>
       <tr><td>Saaf signal</td><td>"Indexing... kuch second mein search mein aayega"</td></tr>
       <tr><td>Monitor</td><td>Indexing lag ek <b>SLI</b> ho — p99 lag par alert</td></tr>
     </table>
     <p class="tip">🎯 Aur sabse zaroori niyam: <b>search index kabhi source of truth
     nahi hota</b>. Search index kisi bhi din poora dobara banaya ja sakta hona chahiye —
     kyunki mapping badalne par, corruption par, ya version upgrade par search index dobara
     banega hi. Agar koi data sirf Elasticsearch mein hai, toh sirf Elasticsearch mein rakha data ek din
     chala jaayega.</p>
     <h3>🎯 Relevance — engineering nahi, product</h3>
     <p>"Sahi natija" ka jawab database ke paas nahi hai. Ranking signals mila ke bante hain:</p>
     <pre>score = text_match × w1        (shabd kitne mile — BM25)
      + popularity × w2        (kitne log kharidte hain)
      + recency   × w3         (naya maal upar)
      + personalization × w4   (isne pehle kya dekha)
      + business  × w5         (stock hai? margin?)</pre>
     <p>Weights product/data science tay karte hain, aur weights <b>A/B test</b> se badalte
     hain. Isliye search ka sabse zaroori infra CTR logging hai — bina click data ke
     relevance sudhaari hi nahi ja sakti.</p>`,
  ],
  stages: [
    {
      type: 'quiz',
      title: 'Search ki buniyaad',
      questions: [
        {
          q: 'Saada B-tree index aur LIKE \'%wireless%\' — kaunsi baat sahi hai?',
          choices: [
            'Saada B-tree beech ke shabd tak seedha nahi pahunchta — shuru ke aksharon se dhoondta hai',
            'Har LIKE query har index ko hamesha nazarandaaz karti hai — prefix wali query bhi',
            'Text columns par koi bhi index ban hi nahi sakta — text ke liye index hota hi nahi',
            'Wildcard hai toh trigram index bhi kabhi kaam nahi aa sakta — koi raasta hi nahi',
          ],
          answer: 0,
          explain: 'B-tree sorted hai — shuru ke aksharon se dhoondta hai (LIKE \'wire%\' tez). Beech mein match (LIKE \'%wireless%\') ke liye saada B-tree seedha seek nahi de sakta, toh scan. PostgreSQL ka pg_trgm (GIN/GiST) aise LIKE/ILIKE ko tez kar sakta hai. EXPLAIN se jaancho — "har LIKE full scan" galat hai.',
          choiceExplanations: [
            'B-tree sorted hai — shuru ke aksharon se dhoondta hai (LIKE \'wire%\' tez). Beech mein match (LIKE \'%wireless%\') ke liye saada B-tree seedha seek nahi de sakta, toh scan. PostgreSQL ka pg_trgm (GIN/GiST) aise LIKE/ILIKE ko tez kar sakta hai. EXPLAIN se jaancho — "har LIKE full scan" galat hai.',
            'LIKE \'wire%\' jaisa prefix B-tree use kar sakta hai. Dikkat sirf aage wale wildcard ki hai.',
            'Text columns par B-tree, trigram aur full-text, sab index ban sakte hain.',
            'pg_trgm ka trigram index \'%wireless%\' jaise pattern ko tez kar sakta hai.',
          ],
        },
        {
          q: 'Product DB mein save ho gaya, par search mein nahi dikh raha (indexing async hai). Pehle kya karoge?',
          choices: [
            'Indexing ka lag jaancho, aur user ko saaf "indexing ho rahi hai" dikhao',
            'Index refresh kar do — refresh se har gayab document turant aa jaata hai',
            'Async indexing ka matlab write kho gaya — product dobara save karwao',
            'Search rank neeche hai, toh pakka DB mein row hi nahi — DB theek karo',
          ],
          answer: 0,
          explain: 'Search index source se async banta hai, toh commit ke baad thoda lag normal hai. Pehle alag karo: indexing fail hui, ya bas der hai? User ko saaf pending state dikhao, ya seller ke apne products seedha DB se dikhao. Har write par zabardasti refresh mehenga pad sakta hai.',
          choiceExplanations: [
            'Search index source se async banta hai, toh commit ke baad thoda lag normal hai. Pehle alag karo: indexing fail hui, ya bas der hai? User ko saaf pending state dikhao, ya seller ke apne products seedha DB se dikhao. Har write par zabardasti refresh mehenga pad sakta hai.',
            'Refresh sirf indexed data ko dikhata hai. Document pipeline mein atka ho toh refresh se nahi aayega.',
            'Product DB mein save hai. Async ka matlab der hai, khoya nahi.',
            'Rank aur DB ki row alag cheezein hain. Pehle dekho document index mein hai bhi ya nahi.',
          ],
        },
        {
          q: "Is design mein search derived projection kyun rakhein?",
          choices: [
            'Index ko asli source se kabhi bhi dobara banaya ja sake — mapping badle ya index bigde',
            'Search engines kisi bhi data ko pakka save kar hi nahi sakte — kabhi bhi nahi',
            'Har search system hamesha phenkne layak hona chahiye — yahi pakka niyam hai',
            'Index dobara ban sakta hai, toh asli source data ab delete kar sakte ho, bas',
          ],
          answer: 0,
          explain: 'Is lesson mein search index ek nikla hua (derived) roop hai — asli records ya changelog se dobara ban sakta hai. Mapping badli, index kharab hua, ya version upgrade — dobara banao. "Search engine kabhi source of truth nahi" har jagah ka niyam nahi; apne design ki durability aur recovery saaf likho.',
          choiceExplanations: [
            'Is lesson mein search index ek nikla hua (derived) roop hai — asli records ya changelog se dobara ban sakta hai. Mapping badli, index kharab hua, ya version upgrade — dobara banao. "Search engine kabhi source of truth nahi" har jagah ka niyam nahi; apne design ki durability aur recovery saaf likho.',
            'Search engines data pakka rakh sakte hain. Is design mein bas asli source DB hai.',
            'Kuch designs mein search hi source hota hai. Yahan derived chuna — design ka faisla hai.',
            'Index dobara banane ke liye hi source chahiye. Source delete kiya toh rebuild namumkin.',
          ],
        },
      ],
    },
    {
      type: 'order',
      title: 'Text ko index karne ke kadam',
      instructions: 'Analysis pipeline sahi kram mein.',
      steps: [
        { text: 'Lowercase karo', explain: '"Wireless" aur "wireless" ek hi hone chahiye. Sabse pehla aur sabse sasta normalization.' },
        { text: 'Tokenize — vaakya ko shabdon mein todo', explain: 'Yahan bhasha ka faisla shuru hota hai: "iphone-15" ek token hai ya do? Hindi/Chinese mein toh space bhi bharosemand nahi hai.' },
        { text: 'Punctuation aur stopwords hatao', explain: '"the", "a", "is" har document mein hain — aise shabd filter karne mein madad nahi karte, sirf index phulaate hain. (Par "to be or not to be" jaisi phrase search ke liye kabhi-kabhi rakhne padte hain.)' },
        { text: 'Stemming — shabd ko mool roop tak lao', explain: '"headphones" → "headphone", "running" → "run". Ab "headphone" search karne par "headphones" bhi milta hai. Har bhasha ka apna stemmer hota hai.' },
        { text: 'Synonyms lagao', explain: '"earphone" → "headphone", "mobile" → "phone". Synonyms poori tarah <b>product</b> ka faisla hain — aur synonyms galat hon toh search "kuch bhi" dikhane lagta hai.' },
        { text: 'Inverted index mein postings likho', explain: 'Ab har token ke saamne document ids ki sorted list ban gayi. Query bhi <b>isi</b> pipeline se guzarti hai — warna query aur index ka token match hi nahi karega.' },
      ],
    },
    {
      type: 'incident',
      title: 'Incident — "Search mein purane daam dikh rahe hain"',
      pager: '📉 11:40 — Sale live hai. Support: "Search mein product ka purana daam dikh raha hai, kholne par naya."',
      start: 's1',
      nodes: {
        s1: {
          text: 'Product page sahi hai, search results galat. Pehla kadam?',
          choices: [
            { t: "Index ka lag aur source ke versions jaancho", good: true, next: 's2', explain: 'Sahi. Do jagah ka data alag hai, aur dono ke beech ek async pipeline hai. Pehla sawaal hamesha "pipeline kitni peechhe hai" hona chahiye.' },
            { t: "Poora index turant dobara banao, abhi", good: false, explain: 'Sale ke beech mein full reindex ghante le sakta hai aur us doraan search aur bhi bura ho jaayega. Pehle maapo ki lag kitna hai — shayad pipeline khud pakad legi.' },
            { t: "Indexed data jaanche bina cache saaf karo", good: false, explain: 'Search ka cache aur product page ka cache alag ho sakte hain. Pehle index ka daam source se milao — tab pata chalega purana daam index mein hai ya cache mein. Bina jaanch cache saaf karne se asli wajah chhip sakti hai.' },
          ],
        },
        s2: {
          text: 'Indexing lag 47 minute hai (normally 3 second). Queue mein 12 lakh events pade hain. Ab?',
          choices: [
            { t: "Sahi daam source se dikhao, ingest ko baandho", good: true, next: 's3', explain: 'Do kadam ek saath: pipeline ka backlog kam karo, aur us beech user ko sahi daam dikhao. Search ka kaam <b>dhoondna</b> hai; daam jaisi badalne wali cheez search index se dikhana hi risk tha.' },
            { t: "Bas consumers ke backlog pakadne ka intezaar karo", good: false, explain: 'Backlog kam ho jaayega, par tab tak users galat daam dekhte rahenge — aur sale ke beech galat daam seedha revenue aur bharosa ka nuksaan hai.' },
            { t: "Sale mein browse aur product pages band kar do", good: false, explain: 'Sale ke din search band karna backlog se bada nuksaan hai. Degrade karo, bandh mat karo.' },
          ],
        },
        s3: {
          text: 'Backlog saaf ho gaya. Root cause: sale shuru hote hi 12 lakh price updates ek saath aaye. Permanent fix?',
          choices: [
            { t: "Ingest ko baandho; dikhaya daam taaza jaancho", good: true, next: 'end', explain: 'Asli seekh: search index mein aisa data mat rakho jo <b>tezi se badalta</b> hai aur jiska galat hona mehenga hai. Daam se filter karna theek hai (thodi galti chalti hai), par daam <b>dikhana</b> live source se hona chahiye. Aur bulk updates ko hamesha throttle karo, warna bulk updates realtime updates ko peechhe dhakel dete hain.' },
            { t: "Hamesha extra capacity; burst par koi control nahi", good: false, explain: 'Hamesha extra capacity = peak ke liye har waqt paisa jalaana, aur agli baar 12 lakh ki jagah 50 lakh updates aayenge. Capacity backlog ka jawab hai, <b>design</b> ka nahi.' },
            { t: "Har source write ke saath index bhi sync likho", good: false, explain: 'Ab har price update Elasticsearch par nirbhar ho gaya — ES slow hua toh <b>catalog writes</b> slow. Tumne search ka problem availability ka problem bana diya.' },
          ],
        },
        end: {
          end: true,
          text: 'Backlog saaf. Daam ab live source se dikh rahe hain.',
          summary: `<b>Seekh:</b> Search index mein aisa data mat rakho jo <b>tezi se badalta</b> hai
            aur jiska galat hona mehenga hai.
            <br><br>• Daam se <b>filter</b> karna theek hai (thodi galti chalti hai)
            <br>• Daam <b>dikhana</b> live source se hona chahiye
            <br>• Bulk updates ko throttle karo — warna bulk updates realtime updates ko peechhe dhakel dete hain
            <br>• Indexing lag ek <b>SLI</b> ho, alert ke saath — warna indexing lag chup-chaap badhta hai`,
        },
      },
    },
    {
      type: 'design',
      title: 'Design Canvas — E-commerce search',
      instructions: '5 crore products, 20,000 searches/sec peak. Har slot ka sahi chunav karo.',
      brief: `Ek marketplace ka search banao. Sellers din bhar products add karte rehte hain,
        daam ghante-ghante badalte hain, aur peak par 20,000 searches/sec aate hain.`,
      requirements: ['p99 &lt; 150ms', '5 crore products', 'Sellers ko apna product turant dikhe'],
      pass: 10,
      slots: [
        {
          id: 'store', label: 'Search kis par chalega', icon: '🔍',
          options: [
            { id: 'es', label: "Alag search engine, relevance ke liye bana", score: 3, why: 'Sahi. Inverted index, analyzers, relevance scoring aur aggregations — OLTP DB ka kaam hi nahi. Aur search ka load main DB se poori tarah alag ho jaata hai.' },
            { id: 'like', label: "Source table par saada substring LIKE query", score: -3, why: '5 crore rows par har search ek full table scan hai. Aur scan buffer pool bhi dho dega, jisse tumhari <b>baaki</b> queries bhi slow ho jaayengi. LIKE sirf prototype tak chalta hai.' },
            { id: 'gin', label: "Postgres full-text GIN index se shuruaat", score: 1, why: 'Vaajib chunav — agar tum already Postgres par ho aur relevance simple hai toh GIN ek poora system bachaa deta hai. Par 5 crore products + custom ranking + facets par GIN dab jaata hai. "Chhote se shuru karo" ka sahi jawab, is scale ka nahi.' },
          ],
        },
        {
          id: 'sync', label: 'Data index tak kaise pahunche', icon: '🔄',
          options: [
            { id: 'cdc', label: "Transactional outbox/CDC se indexer tak", score: 3, why: 'Sahi. Product aur outbox row ek DB transaction mein likho, ya DB ka CDC log padho — index DB se derive hota hai. Indexer ruk jaaye toh bache events se kaam dobara chale. Log ki retention, backups aur backlog par nazar rakho; indexer duplicate events bhi sambhaale.' },
            { id: 'dual', label: "App se dono jagah alag-alag likho", score: -2, why: 'Do systems mein ek saath likhne ka koi atomic tareeka nahi hai. DB write chal gaya aur ES write fail ho gaya — ab product hamesha ke liye search se gayab hai, aur kisi ko pata bhi nahi chalega.' },
            { id: 'cron', label: "Har kuch minute poora dataset badlo", score: -1, why: 'Chalega par bhaari hai: 10 minute ka lag, aur har run poora dataset chhuta hai. Seller ko apna product 10 minute baad dikhna aaj ke standard par kharab UX hai.' },
          ],
        },
        {
          id: 'price', label: 'Daam kahan se dikhega', icon: '💰',
          options: [
            { id: 'live', label: "Search se candidates, daam source se jaanch ke", score: 3, why: 'Sahi — aur log yahi sabak incident ke baad seekhte hain. Daam se filter karne mein thodi galti chalti hai; daam <b>dikhane</b> mein nahi. Isliye ranking/filter index se, aur final display ek live batch fetch se.' },
            { id: 'idx', label: "Index ke daam ko hi aaj ka asli daam maano", score: -2, why: 'Daam ghante-ghante badalta hai aur index async hai. Sale ke din index ka daam seedha "galat daam dikha" wala incident ban jaata hai.' },
          ],
        },
        {
          id: 'own', label: 'Seller ko apna naya product', icon: '👤',
          options: [
            { id: 'bypass', label: "Seller ko apna product seedha source se dikhao", score: 2, why: 'Read-your-own-writes. Sasta, aur duplicate submissions banane wali confusion khatam kar deta hai.' },
            { id: 'wait', label: "Seller ko search index ka intezaar karwao", score: -1, why: '"Kuch second" backlog ke waqt 47 minute ban jaate hain. Aur user tab tak maan lega ki save hi nahi hua — aur dobara submit karega.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Tumne search ko ek <b>derived</b> system ki tarah treat kiya — source of truth DB, sync CDC se, aur badalne wala data live. Yahi sahi shape hai.',
        ok: '👍 Buniyaad theek hai. Ek chunav us classic incident ki taraf le jaata — har option ka why padho.',
        bad: '🤔 Yaad rakho: search index kabhi source of truth nahi, aur usme tezi se badalne wala data mat rakho.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Search',
    instructions: 'Search shape "async" ke around ghoomta hai. 🎤',
    questions: [
      {
        q: '"Elasticsearch poora chala gaya. Kya hoga?"',
        choices: [
          'Search band, par site chalegi — browse aur direct links chalao, index source se banao',
          'Har request search engine se hi jaati hai — ES gaya toh poori site band, bas',
          'DB par fallback kar do — har search ko bina hadd seedha DB par bhej do',
          'Index dobara bana lenge — source ya backup ke bina bhi rebuild ho jaayega',
        ],
        answer: 0,
        explain: 'Sawaal yahi hai: tumne ES ko derived maana ya nahi. Catalog writes ES par tike hon toh ES ka girna poori company ka outage. Nahi toh sirf ek degraded feature: category browse aur direct links chalein, aur index source se dobara bane. "DB par fallback" lalchata hai, par girti site par bina hadd full scans chalana aag mein ghee hai.',
        choiceExplanations: [
          'Sawaal yahi hai: tumne ES ko derived maana ya nahi. Catalog writes ES par tike hon toh ES ka girna poori company ka outage. Nahi toh sirf ek degraded feature: category browse aur direct links chalein, aur index source se dobara bane. "DB par fallback" lalchata hai, par girti site par bina hadd full scans chalana aag mein ghee hai.',
          'ES derived ho toh product page, cart, checkout ES ke bina chalte hain. Sirf search rukta hai.',
          'Bina hadd DB fallback = har search ek full scan. DB bhi gir jaayega.',
          'Rebuild ke liye source ya backup chahiye. Source hi asli bachav hai.',
        ],
      },
      {
        q: '"Search results kharab hain. Debug kaise karoge?"',
        choices: [
          'Alag karo: document index mein hai? query sahi bani? phir rank — har ek ke tool alag',
          'Ranking weights tune karo — gayab documents ko nazarandaaz karo, bas itna kaafi',
          'Bas aur training data jod do — data badhega toh results apne aap sudhar jaayenge',
          'Bas RAM badha do — RAM badhte hi relevance apne aap saabit ho jaayegi, pakka',
        ],
        answer: 0,
        explain: 'Pehla kaanta: document index mein hai hi nahi (indexing — analyzer, pipeline, mapping dekho), ya hai par neeche rank hua (relevance — scoring aur signals dekho). Beech mein query bhi galat ban sakti hai. Bina alag kiye log ranking weights ghumate reh jaate hain, jabki document index mein tha hi nahi.',
        choiceExplanations: [
          'Pehla kaanta: document index mein hai hi nahi (indexing — analyzer, pipeline, mapping dekho), ya hai par neeche rank hua (relevance — scoring aur signals dekho). Beech mein query bhi galat ban sakti hai. Bina alag kiye log ranking weights ghumate reh jaate hain, jabki document index mein tha hi nahi.',
          'Document index mein hi nahi toh koi weight document ko upar nahi laayega.',
          'Training data relevance ka ek hissa hai. Gayab document ki dikkat indexing mein hai.',
          'RAM speed deti hai, sahi results nahi. Relevance alag naapni padti hai.',
        ],
      },
    ],
  },
  success: [
    "Bata sakte ho ki LIKE '%x%' par index kyun bekaar hai",
    'Inverted index aur analysis pipeline samjha sakte ho',
    'Indexing lag ko design maan ke indexing lag ka UX bana sakte ho',
    'Search ko derived store ki tarah treat karte ho',
  ],
  homework: `Apne product mein koi search box dhoondo. Poochho: (1) search box kis par chalta hai,
    (2) data search index mein kaise pahunchta hai, (3) indexing lag ka koi metric hai?
    Aur ek test: ek naya item banao aur ginti karo ki search mein aane mein kitne second lage.`,
  cards: [
    { front: "LIKE '%x%' par index kyun nahi chalta?", back: 'B-tree <b>sorted</b> hai — navigate shuruaat se hota hai. Beech ka match unknown shuruaat hai, isliye har row dekhni padti hai. <code>LIKE \'x%\'</code> chalta hai.' },
    { front: 'Inverted index kya hai?', back: 'Table ka ulta: <b>shabd → document ids ki sorted list</b>. Kai shabdon ki search mein lists ka intersection lo. Lucene/Elasticsearch/GIN mein bhi inverted index hai.' },
    { front: 'Analysis pipeline ke kadam?', back: 'lowercase → tokenize → punctuation/stopwords → stemming → synonyms → postings. <b>Query bhi isi pipeline se</b> guzarni chahiye.' },
    { front: 'Indexing lag ka ilaaj?', back: 'Bug nahi, design hai. Ilaaj UX mein: apne items DB se dikhao (read-your-own-writes) + "indexing" signal + lag par SLI/alert.' },
    { front: 'Search index source of truth?', back: '<b>Kabhi nahi.</b> Search index reindex hoga hi (mapping/version/corruption). Sirf search index mein rakha data ek din chala jaayega.' },
    { front: 'Search index mein kya NA rakhein?', back: 'Tezi se badalne wala data jiska galat hona mehenga ho — jaise <b>daam</b>. Filter uspar karo, par dikhao live source se.' },
  ],
},

/* =====================================================================
   L3 — File & media storage
   ===================================================================== */
{
  id: 'media',
  icon: '📤',
  title: 'Media — Bytes Kabhi App Server Se Mat Guzaro',
  badge: 'Media Marmagya',
  objectives: [
    'Presigned URL: client seedha object storage par likhe',
    'Bytes object storage mein, metadata DB mein — <b>hamesha</b>',
    'Upload ke baad ka processing pipeline aur processing ka status',
    'Storage tiering — purana data sasta hona chahiye',
  ],
  lesson: [
    `<h3>📖 Ek 4 GB video, ek app server</h3>
     <p>Sabse seedha design aisa lagta hai:</p>
     <pre>client → POST /upload → app server → S3</pre>
     <p>Aur app server se upload chhoti files par kaam bhi karta hai. Par ab hisaab lagao: ek 4 GB video
     ek dheeme mobile network se aa rahi hai — 12 minute lagenge. Un 12 minute mein
     us request ne <b>ek thread pakad rakha hai</b>, aur aksar ek DB connection bhi
     (kyunki handler ne pehle hi le liya tha). 50 log ek saath upload kar rahe hain
     toh tumhara poora pool khatam — aur baaki poori API, jiska upload se koi lena-dena
     nahi, timeout karne lagti hai.</p>
     <p>Yaad aaya? Upload ke connections bharna bilkul wahi <b>connection pool exhaustion</b> hai jo tumne
     Resilience track mein dekha tha — CPU 10%, health green, sab timeout.
     Wajah alag hai, shape wahi hai.</p>
     <h3>✅ Presigned URL — bytes ko backend se bahar nikaal do</h3>
     <pre>1. client → POST /uploads          "mujhe ek 4GB mp4 daalna hai"
2. app   → S3 se ek key ka signed URL banao (5 min valid, content-type fix)
        → 201 { upload_url, file_id }        ← 40 ms mein khatam
3. client → PUT &lt;upload_url&gt;  (SEEDHA S3 par — app server beech mein hai hi nahi)
4. S3    → event: "file aa gaya"
5. app   → metadata row, phir processing (thumbnail, transcode, scan)</pre>
     <p>Ab app server ne 40 ms kaam kiya, 12 minute nahi. Bytes kabhi tumhare
     process se guzre hi nahi. Aur bonus: S3 khud resumable/multipart upload
     deta hai, jo tumhe warna khud banana padta.</p>
     <p class="tip">🎯 Signed URL ko <b>tight</b> banao: chhoti expiry (5–15 min),
     ek hi key ke liye, aur <code>Content-Type</code> fix. Size ki max hadd chahiye toh
     presigned <b>POST</b> policy (content-length-range) lo — saada PUT URL max size nahi baandhta.
     Warna signed URL "koi bhi kuch bhi upload kar de" wala darwaza ban jaata hai — aur bill tumhara hai.</p>`,
    `<h3>🗄️ Bytes kahan, metadata kahan</h3>
     <table>
       <tr><th></th><th>Object storage (S3)</th><th>Database</th></tr>
       <tr><td>Kya rakhein</td><td>Asli bytes</td><td>id, owner, size, type, status, created_at, s3_key</td></tr>
       <tr><td>Kyun</td><td>Sasta, unlimited, CDN-friendly</td><td>Query, join, permission, transaction</td></tr>
     </table>
     <p>DB mein BLOB rakhne ka anjaam: buffer pool bytes se bhar jaata hai (isliye
     tumhari <b>asli</b> queries slow hoti hain), backup ka size 100x, replication lag,
     aur ek din DB se object storage ki migration jo koi nahi karna chahta.</p>
     <h3>⚙️ Upload ke baad — status ek first-class cheez hai</h3>
     <pre>uploaded → scanning → processing → ready
                  ↓            ↓
               rejected      failed</pre>
     <p>Transcode aur thumbnail banane mein minute lagte hain. Isliye upload API
     <b>202 Accepted</b> jaisa vyavhaar kare aur ek status endpoint de. UI ko
     "processing..." dikhana chahiye — nahi toh user ek toota hua video dekhega
     aur samjhega upload fail ho gaya. (Processing status wahi async pattern hai jo tumne
     API track mein dekha tha.)</p>
     <h3>💸 Tiering — purana data sasta hona chahiye</h3>
     <table>
       <tr><td>0–30 din</td><td>Standard</td><td>aksar dekha jaata hai</td></tr>
       <tr><td>30–90 din</td><td>Infrequent Access</td><td>sasta store, mehenga read</td></tr>
       <tr><td>90+ din</td><td>Glacier / Archive</td><td>bahut sasta, ghanton mein milta hai</td></tr>
     </table>
     <p class="tip">🎯 Storage ka lifecycle rule <b>din 1</b> par likho. Baad mein lifecycle rule
     "kabhi kar lenge" ban jaata hai, aur do saal baad storage bill compute bill se
     bada ho jaata hai. Aur delete ka bhi ek rule ho: kya cheez kabhi delete <b>hoti</b>
     hai?</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Presigned upload ka flow',
      instructions: 'Kadam sahi kram mein rakho.',
      steps: [
        { text: 'Client app se poochhta hai: "mujhe ek file daalni hai"', explain: 'Sirf metadata jaata hai — naam, size, type. Bytes abhi kahin nahi ja rahe.' },
        { text: 'App permission check karta hai aur quota dekhta hai', explain: 'Yahi ek jagah hai jahan tum "nahi" keh sakte ho. Ek baar signed URL de diya, toh tumhara control khatam.' },
        { text: 'App ek key ka signed PUT URL banata hai — chhoti expiry aur zaroori signed headers', explain: 'S3 signature mein bandhi shartein jaanchta hai — client shartein badle toh S3 reject karega. Max size ki hadd chahiye toh presigned POST policy lo; upload ke baad asli size aur file type bhi jaancho.' },
        { text: 'Client SEEDHA object storage par PUT karta hai', explain: 'Yahan poora faayda hai: 4 GB bytes tumhare app server se guzre hi nahi. Aur multipart/resume S3 khud sambhaalta hai.' },
        { text: 'Object storage se event aata hai: "file aa gaya"', explain: 'Client par bharosa mat karo ("maine daal diya") — client jhooth bol sakta hai ya beech mein mar sakta hai. Sach storage se aana chahiye.' },
        { text: 'App metadata row banata hai (status = uploaded)', explain: 'Ab file DB mein "maujood" hai. Event se pehle file ek adhoora, orphan object thi.' },
        { text: 'Background worker: scan, thumbnail, transcode — phir status = ready', explain: 'Minute ka kaam hai, isliye async. Aur beech ka status UI ko dikhna chahiye, warna user samjhega upload toot gaya.' },
      ],
    },
    {
      type: 'bins',
      title: 'Data kahan rakhein?',
      instructions: 'Object storage mein ya database mein?',
      bins: [
        { id: 'obj', label: '🪣 Object storage' },
        { id: 'db', label: '🗄️ Database' },
      ],
      items: [
        { text: 'Original 4 GB video file', bin: 'obj', explain: 'Bytes hamesha object storage mein. Sasta, unlimited, aur CDN seedha object storage se serve kar sakta hai.' },
        { text: 'Video ka owner, title aur visibility', bin: 'db', explain: 'Metadata query aur permission ka data hai — joins, filters aur transactions chahiye.' },
        { text: '480p / 720p / 1080p transcoded versions', bin: 'obj', explain: 'Thumbnails bhi bytes hain. DB mein sirf thumbnails ke keys aur "kaun-kaun ready hai" rehta hai.' },
        { text: 'Upload ka status (uploaded → processing → ready)', bin: 'db', explain: 'Upload status ek state machine hai, jispar tum query karoge ("saare stuck uploads dikhao"). Object storage query karne ke liye nahi bana.' },
        { text: 'Thumbnail images', bin: 'obj', explain: 'Chhoti hain isliye DB mein rakhne ka lalach hota hai — par chhoti files bhi crore ho jaati hain aur buffer pool kha jaati hain. Bytes = object storage, apwaad nahi.' },
        { text: 'Video par kitne views aaye', bin: 'db', explain: 'Badalta hua counter — DB ya ek counter store. Object storage immutable objects ke liye hai, badalte numbers ke liye nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Media ki samajh',
      questions: [
        {
          q: 'Upload app server ke beech se guzre, toh kaunsa resource kharch hota hai?',
          choices: [
            'Har upload app server ki bandwidth aur ek concurrency slot poori der pakde rakhta hai',
            'Har upload apne aap ek DB connection bhi pakad leta hai — hamesha, har haal mein',
            'Async server par upload karo toh memory ka koi kharcha hi nahi lagta, bilkul zero',
            'Seedha object storage par upload mein backpressure jaisi koi cheez hoti hi nahi',
          ],
          answer: 0,
          explain: 'Bytes app server se guzrein toh har upload poori der bandwidth aur ek concurrency slot (thread, socket, buffer) pakde rehta hai. 50 dheeme mobile uploads pool bhar dete hain aur baaki API bhi atakne lagti hai. Isliye client ko seedha storage par bhejo; app server sirf permission deta hai.',
          choiceExplanations: [
            'Bytes app server se guzrein toh har upload poori der bandwidth aur ek concurrency slot (thread, socket, buffer) pakde rehta hai. 50 dheeme mobile uploads pool bhar dete hain aur baaki API bhi atakne lagti hai. Isliye client ko seedha storage par bhejo; app server sirf permission deta hai.',
            'DB connection tabhi bandhta hai jab code upload ke beech transaction khula rakhe. Har upload mein zaroori nahi.',
            'Async server bhi buffers aur sockets rakhta hai. Kharcha kam ho sakta hai, zero nahi.',
            'Object storage ki bhi hadd aur throttling hoti hai. Bas bojh app server par nahi padta.',
          ],
        },
        {
          q: 'Client seedha storage par upload kare — permission mein kya-kya bandhoge?',
          choices: [
            'Ek hi key, chhoti expiry (5–15 min), aur size va content-type ki shartein',
            'URL secret hai toh expiry ki zaroorat nahi — link hamesha chalta rahe',
            'Content-Type image/png likha hai toh file pakka safe image hai, bas',
            'Presigned PUT URL har haal mein max size apne aap laga deta hai',
          ],
          answer: 0,
          explain: 'Upload ki permission chhoti aur tang rakho: ek hi object key, 5–15 minute ki expiry, aur jahan ho sake size ki hadd (jaise presigned POST ki content-length-range) aur content-type ki shart. Upload ke baad file ko khud jaancho — header jhooth bol sakta hai.',
          choiceExplanations: [
            'Upload ki permission chhoti aur tang rakho: ek hi object key, 5–15 minute ki expiry, aur jahan ho sake size ki hadd (jaise presigned POST ki content-length-range) aur content-type ki shart. Upload ke baad file ko khud jaancho — header jhooth bol sakta hai.',
            'URL leak hota hai — logs, history, share. Bina expiry ke link hamesha ke liye khula darwaza hai.',
            'Content-Type client khud likhta hai. Asli file ki jaanch upload ke baad karo.',
            'Saada presigned PUT size ki hadd nahi lagata. Size ke liye presigned POST policy ya baad ki jaanch chahiye.',
          ],
        },
        {
          q: 'Upload poora hone ka bharose layak saboot kya hai?',
          choices: [
            'Storage mein object sach mein hai — storage ka event, aur chhoote events ke liye repair',
            'Client ne "ho gaya" bola, toh object par bharosa karo — client jhooth nahi bolta',
            'Storage ka ek event aaya toh duplicate event kabhi nahi aayega — bas ek hi baar',
            'Storage callback hai toh koi event kabhi chhootta nahi — repair ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'Client jhooth bol sakta hai ya beech mein mar sakta hai — saboot storage se lo. Storage events (jaise S3 notification) aksar at-least-once aate hain: kabhi duplicate, kabhi der se, kabhi chhoot bhi jaate hain. Toh handler idempotent ho, aur ek repair job atke uploads (status = pending) ko storage se milaaye.',
          choiceExplanations: [
            'Client jhooth bol sakta hai ya beech mein mar sakta hai — saboot storage se lo. Storage events (jaise S3 notification) aksar at-least-once aate hain: kabhi duplicate, kabhi der se, kabhi chhoot bhi jaate hain. Toh handler idempotent ho, aur ek repair job atke uploads (status = pending) ko storage se milaaye.',
            'Client ka call beech mein mar sakta hai, ya jhooth bol sakta hai. Storage se jaancho.',
            'Storage events duplicate bhi aa sakte hain. Handler idempotent hona chahiye.',
            'Events chhoot sakte hain ya der se aa sakte hain. Repair job atke uploads pakadti hai.',
          ],
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Video upload platform',
      instructions: 'Har slot par sahi chunav — aur galton ka why zaroor padho.',
      brief: `Ek video platform banao. Users tak 5 GB tak ke videos daalte hain,
        har video ke 3 resolutions chahiye, aur duniya bhar mein play hona chahiye.`,
      requirements: ['5 GB tak upload', '3 resolutions', 'Global playback', 'Purana content sasta ho'],
      pass: 11,
      slots: [
        {
          id: 'path', label: 'Upload ka raasta', icon: '📤',
          options: [
            { id: 'signed', label: "Ek key ka direct upload, seedha storage par", score: 3, why: 'Sahi. App server 40ms kaam karta hai, bytes app server ke paas se guzarte hi nahi. Multipart aur resume storage khud deta hai.' },
            { id: 'proxy', label: "App API ke beech se bytes stream karo", score: -3, why: 'Har upload poore duration ke liye ek concurrency slot pakdta hai. 50 slow uploads = pool khatam = poori API down. Presigned URL ka poora karan yahi hai.' },
            { id: 'chunk', label: "Apna khud ka chunk protocol, app ke through", score: -1, why: 'Kaam karega, par tum multipart, resume, retry aur cleanup khud likh rahe ho — jo S3 muft mein deta hai. Aur bytes phir bhi tumhare server se guzar rahe hain.' },
          ],
        },
        {
          id: 'store', label: 'Bytes kahan', icon: '🪣',
          options: [
            { id: 's3', label: "Bytes object store mein, metadata apne DB mein", score: 3, why: 'Standard aur sahi. Bytes sasti, unlimited, CDN-ready jagah par; metadata DB mein, jahan query aur permission chalti hai.' },
            { id: 'blob', label: "Saare bytes transaction wale DB mein", score: -3, why: 'Buffer pool bytes se bhar jaayega (asli queries slow), backup 100x, replication lag. Aur ek din bytes bahar nikalne ki migration karni hi padegi.' },
            { id: 'disk', label: "Sirf app node ki disk, jo restart par mitti", score: -3, why: 'Instance ephemeral hai aur do instances ka data alag ho jaayega. Local disk sirf ek server wali duniya mein chalti hai.' },
          ],
        },
        {
          id: 'proc', label: 'Transcoding', icon: '⚙️',
          options: [
            { id: 'async', label: "Queue + workers, aur progress ka status", score: 3, why: 'Transcoding minute leti hai — request cycle ka kaam hai hi nahi. Queue burst sambhaalti hai, workers alag scale hote hain, aur status UI ko sach dikhata hai.' },
            { id: 'sync', label: "Upload request ke andar hi CPU ka kaam", score: -3, why: 'Request minute tak latki rahegi, gateway timeout karega, aur retry par poora kaam dobara. Async ka textbook case.' },
          ],
        },
        {
          id: 'serve', label: 'Playback', icon: '🌍',
          options: [
            { id: 'cdn', label: "Permission wale CDN se video segments", score: 2, why: 'Video badi aur immutable hai — CDN ke liye ideal. Signed URL private content ko bhi CDN se serve karne deta hai, aur origin par load lagbhag zero rehta hai.' },
            { id: 'origin', label: "Seedha object storage se video segments", score: 0, why: 'Kaam karega par har viewer ko origin region tak jaana padega — door ke users ke liye buffering, aur egress bill zyada. CDN yahan lagbhag muft ki jeet hai.' },
            { id: 'app', label: "App har segment beech mein se bheje", score: -3, why: 'Wahi galti, ab read side par. Ek 2-ghante ka video stream ek slot ko 2 ghante ke liye pakad lega.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Bytes kabhi app server se nahi guzre — na upload par, na playback par. Yahi is shape ka poora sar hai.',
        ok: '👍 Zyadatar sahi. Ek jagah tumne bytes ko apne process se guzaar diya — wahi jagah production mein pool khaayegi.',
        bad: '🤔 Ek niyam yaad rakho: <b>bytes object storage mein, metadata DB mein, aur app server dono ke beech mein nahi</b>.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Media',
    instructions: 'Yahan ek hi galti sab kuch bata deti hai. 🎤',
    questions: [
      {
        q: '"Users profile photo upload karte hain. Design bolo."',
        choices: [
          'Ek key ka direct upload; phir jaancho (size, type, resize) aur tab publish karo',
          'Upload hua MIME type maan lo, aur photo turant sabko dikha do — jaanch bekaar',
          'Upload chalne tak DB transaction khula rakho — upload ke saath hi commit karo',
          'User ki poori bucket ko public writable kar do — upload aasan ho jaayega, bas',
        ],
        answer: 0,
        explain: 'Presigned URL se client seedha storage par; DB mein sirf key aur status (pending). Storage event par file jaancho (asli type, size), async resize karo, phir status = ready aur CDN se serve. Header par bharosa mat karo, aur upload ke dauraan DB transaction mat kholo.',
        choiceExplanations: [
          'Presigned URL se client seedha storage par; DB mein sirf key aur status (pending). Storage event par file jaancho (asli type, size), async resize karo, phir status = ready aur CDN se serve. Header par bharosa mat karo, aur upload ke dauraan DB transaction mat kholo.',
          'MIME type client likhta hai. Bina jaanch ke kharab ya galat file sabko dikh jaayegi.',
          'Upload minute le sakta hai. Itni der khula transaction locks aur connections pakde rakhega.',
          'Public writable bucket mein koi bhi kuch bhi daal sakta hai. Har upload ek key tak bandha ho.',
        ],
      },
      {
        q: '"Storage bill har mahine badhta ja raha hai. Kya karoge?"',
        choices: [
          'Retention aur access ka hisaab dekho — lifecycle rules, orphans, purane versions',
          'Har object ko 30 din par archive karna zaroori hai — bina dekhe, sab objects par',
          'Har orphan object turant delete karo — upload chal rahe hon tab bhi, bina ruke',
          'Storage compress kar do — compression ke baad retention ka sawaal hi khatam',
        ],
        answer: 0,
        explain: 'Pehle dekho kya pada hai aur kitna padha jaata hai. Lifecycle rules (jaise 30 din baad infrequent-access, 90 din baad archive — access pattern dekh ke), orphan objects saaf karo (DB mein jinki row nahi — par thoda ruk ke, kyunki naya upload abhi row bana raha ho sakta hai), aur purane transcoded versions ki retention tay karo. Archive se padhna mehenga aur dheema hai — har cheez archive nahi.',
        choiceExplanations: [
          'Pehle dekho kya pada hai aur kitna padha jaata hai. Lifecycle rules (jaise 30 din baad infrequent-access, 90 din baad archive — access pattern dekh ke), orphan objects saaf karo (DB mein jinki row nahi — par thoda ruk ke, kyunki naya upload abhi row bana raha ho sakta hai), aur purane transcoded versions ki retention tay karo. Archive se padhna mehenga aur dheema hai — har cheez archive nahi.',
          'Jo cheez roz padhi jaati hai, archive mein mehengi padegi. Access pattern dekh ke niyam banao.',
          'Upload ke beech object pehle aata hai, row baad mein. Turant delete se asli uploads mit jaayenge — thoda grace period rakho.',
          'Compression bytes kam karta hai, faltu data nahi hatata. Retention phir bhi tay karni hai.',
        ],
      },
    ],
  },
  success: [
    'Presigned upload ka poora flow bana sakte ho',
    'Jaante ho ki bytes app server se guzarna pool kyun khaata hai',
    'Bytes/metadata ka batwara aur processing pipeline design kar sakte ho',
    'Storage tiering aur orphan cleanup soch sakte ho',
  ],
  homework: `Apne system mein koi upload dhoondo. Poochho: (1) bytes app server se guzarte hain?
    (2) upload ke doraan ek DB connection pakda rehta hai? (3) lifecycle rule hai?
    (4) failed uploads ke orphan objects kaun saaf karta hai?`,
  cards: [
    { front: 'Upload app server se kyun na guzre?', back: 'Har upload poore duration ke liye ek <b>concurrency slot</b> (thread + aksar DB connection) pakadta hai. 50 slow uploads = pool khatam = poori API timeout. Pool exhaustion ka pattern hai.' },
    { front: 'Presigned URL flow?', back: 'client poochhe → app permission check kare → signed URL de (chhoti expiry, ek key, content-type; size cap ke liye POST policy) → client SEEDHA storage par PUT → <b>storage ka event</b> → metadata row → async processing.' },
    { front: '"File aa gaya" kaun batayega?', back: '<b>Object storage ka event</b> — client nahi. Client jhooth bol sakta hai ya beech mein mar sakta hai.' },
    { front: 'Bytes vs metadata?', back: 'Bytes → object storage (sasta, CDN-ready). Metadata → DB (query, permission, transaction). DB mein BLOB = buffer pool khatam + backup 100x.' },
    { front: 'Storage bill kaise ghataayein?', back: 'Lifecycle rules (30d IA → 90d archive) + <b>orphan objects</b> saaf karo (jinka DB row nahi) + transcoded versions ki retention. Lifecycle rule din 1 par likho.' },
  ],
},

/* =====================================================================
   L4 — Realtime fanout / WebSockets
   ===================================================================== */
{
  id: 'realtime',
  icon: '🔌',
  title: 'Realtime — Connections Bhi Ek Resource Hain',
  badge: 'Fanout Rakshak',
  objectives: [
    'Polling vs long-poll vs SSE vs WebSocket — kab kaunsa',
    'Connections stateful hain — isliye scaling ke niyam alag hain',
    'Offline user ka backlog: is shape ka sabse bada sawaal',
    'Reconnect storm — jab sab ek saath wapas aate hain',
  ],
  lesson: [
    `<h3>📖 Chaar tareeke, aur chaar tareekon ka asli farak</h3>
     <table>
       <tr><th></th><th>Kaise</th><th>Kab</th></tr>
       <tr><td><b>Polling</b></td><td>Har 5s ek request</td><td>Update kabhi-kabhi. Sabse simple — aur aksar kaafi</td></tr>
       <tr><td><b>Long poll</b></td><td>Request tab tak rukti hai jab tak data na aaye</td><td>WebSocket na chal paaye tab ka fallback</td></tr>
       <tr><td><b>SSE</b></td><td>Ek-tarfa stream server → client</td><td>Notifications, live score, LLM ka token stream</td></tr>
       <tr><td><b>WebSocket</b></td><td>Do-tarfa, hamesha khula</td><td>Chat, collab editing, gaming — jahan client bhi bhejta hai</td></tr>
     </table>
     <p class="tip">🎯 Sabse aam over-engineering yahi hai: notifications ke liye
     WebSocket lagana. Agar data sirf server se client ki taraf jaata hai, toh
     <b>SSE</b> chuno — SSE plain HTTP hai, isliye proxies, load balancers aur
     reconnect sab apne aap kaam karte hain. WebSocket tab lo jab client ko bhi
     wapas bolna ho.</p>
     <h3>🔢 Connection ek resource hai</h3>
     <p>Stateless HTTP mein request 40 ms rehti hai aur chali jaati hai. WebSocket
     <b>ghanton</b> tak rehta hai. Lambe connection ka matlab:</p>
     <pre>10 lakh concurrent users
   ÷ 50,000 connections per node       ← memory + file descriptors ki hadd
   = 20 nodes SIRF connections ke liye

...aur 20 gateway nodes tab bhi chahiye jab koi kuch bhej hi nahi raha.</pre>
     <p>Isliye realtime systems mein <b>connection layer</b> aur <b>business logic</b>
     alag scale hote hain. Gateway nodes sirf sockets rakhte hain; asli kaam peechhe
     hota hai, aur gateway nodes aur services ke beech ek pub/sub baithta hai.</p>
     <pre>client ⇄ WS gateway (sirf sockets)  ⇄  pub/sub (Redis/Kafka)  ⇄  services</pre>
     <p>Pub/sub isliye zaroori hai ki user A gateway-3 par hai aur user B gateway-17 par.
     Bina pub/sub ke gateway-3 ko pata hi nahi ki B kahan hai.</p>`,
    `<h3>📴 Sabse bada sawaal: offline user</h3>
     <p>Realtime design ka 80% "message bhejna" nahi hai — message bhejna aasan hai. Asli sawaal
     hai: <b>jo connected nahi tha, use kya milega?</b></p>
     <pre>❌ sirf broadcast:  offline user ne message MISS kar diya, hamesha ke liye
✅ persist + push:  message pehle STORE hoto, phir connected logon ko push
                    reconnect par: "mere last_seen_id ke baad kya aaya?"</pre>
     <p>Isliye chat mein WebSocket sirf ek <b>tez raasta</b> hai, source of truth nahi.
     Message pehle DB/log mein likha jaata hai, phir push hota hai. Reconnect par
     client apna aakhri id bhejta hai aur gap bhar leta hai. Persist karke push karne ka design kar liya toh
     "message kho gaya" wale bugs khud khatam ho jaate hain.</p>
     <h3>🌩️ Reconnect storm</h3>
     <p>Ek gateway node restart hua. Uspar 50,000 connections the. Ab saare connections
     <b>ek saath</b> reconnect karenge — aur har reconnect sasta nahi hai:
     auth, subscription restore, aur "maine kya miss kiya" ka backlog fetch.</p>
     <p>Saath reconnect karna bilkul wahi retry storm hai jo tumne Resilience track mein dekha tha,
     aur ilaaj bhi wahi hai: <b>client par exponential backoff + full jitter</b>.
     Bina jitter ke 50,000 clients theek 1 second baad ek saath wapas aayenge,
     agla node giraayenge, aur cascade shuru.</p>
     <p class="tip">🎯 Aur ek cheez: backlog fetch par <b>limit</b> lagao.
     Agar koi 3 din baad wapas aata hai toh use 40,000 messages mat bhejo —
     use bolo "bahut kuch miss hua, yahan se load karo" aur normal pagination
     par bhej do. Warna ek user ka reconnect poore gateway ko block kar dega.</p>
     <h3>📡 Fanout: write par ya read par</h3>
     <table>
       <tr><td><b>Write par fanout</b></td><td>Har receiver ke inbox mein likho</td><td>Read turant. Celeb par phatta hai</td></tr>
       <tr><td><b>Read par fanout</b></td><td>Padhte waqt sources merge karo</td><td>Write sasta. Read mehenga</td></tr>
       <tr><td><b>Hybrid</b></td><td>Aam ke liye write, celeb ke liye read</td><td>Asli systems yahi karte hain</td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Kaunsa transport chuno',
      pairs: [
        { left: 'Order tracking page — status har kuch minute badalta hai', right: 'Polling (har 10s)', explain: 'Update kam hai aur turant nahi chahiye. Polling simple hai, proxy-friendly hai, aur ismein koi connection state nahi rakhni padti. Kabhi-kabhi sabse boring jawab hi sahi hai.' },
        { left: 'Notification bell — server se client ki taraf', right: 'SSE', explain: 'Ek-tarfa stream. SSE plain HTTP hai, isliye reconnect, proxies aur HTTP/2 sab muft mein kaam karte hain. WebSocket yahan zyada hai.' },
        { left: 'Group chat — dono taraf messages', right: 'WebSocket', explain: 'Client bhi bhejta hai (typing indicators, read receipts, messages), isliye do-tarfa channel chahiye.' },
        { left: 'LLM ka jawab token-by-token', right: 'SSE', explain: 'Server se client ek-tarfa stream — SSE aise stream ke liye hi bana hai. Isiliye lagbhag saari LLM APIs SSE par streaming deti hain, WebSocket par nahi.' },
        { left: 'Collaborative document editing', right: 'WebSocket + CRDT/OT', explain: 'Do-tarfa aur bahut baar. Aur transport se bada sawaal hai <b>conflict resolution</b> — do log ek hi line ek saath badlein toh kya ho.' },
        { left: 'Live cricket score — 50 lakh viewers', right: 'SSE/WebSocket + edge fanout', explain: 'Ek hi data sabko. Isliye origin ek baar bheje aur edge/CDN layer use laakhon connections tak phailaaye — origin ko 50 lakh connections chhoona hi nahi chahiye.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Realtime ki samajh',
      questions: [
        {
          q: 'Realtime chat design mein sabse zaroori sawaal kaunsa hai?',
          choices: [
            'Offline user ko message kaise milega — message pehle pakka store, phir push',
            'Kaunsi WebSocket library lein — library hi delivery ka bharosa tay karti hai',
            'Har node par kitne sockets — sockets ki ginti hi delivery tay karti hai',
            'TLS laga do — TLS chhoote hue messages ko hamesha ke liye store kar leta hai',
          ],
          answer: 0,
          explain: '"Jo user offline tha, message kaise paayega?" — isi sawaal se design khulta hai: message pehle durable store mein, badhti ID ke saath, phir push. Library, sockets ki ginti aur encryption baad ke sawaal hain.',
          choiceExplanations: [
            '"Jo user offline tha, message kaise paayega?" — isi sawaal se design khulta hai: message pehle durable store mein, badhti ID ke saath, phir push. Library, sockets ki ginti aur encryption baad ke sawaal hain.',
            'Library sirf connection sambhalti hai. Offline user ka message store se aata hai.',
            'Sockets ki ginti capacity hai. Delivery ka vaada store aur cursor se banta hai.',
            'TLS raaste mein data chhupata hai. Message store karna alag kaam hai.',
          ],
        },
        {
          q: 'Ek gateway node (50,000 connections) restart hua. Sabse bada khatra?',
          choices: [
            'Sab ek saath reconnect — auth, subscriptions, backlog ek pal mein; agla node bhi gire',
            'Restart par har durable chat pakka kho jaati hai — store mein kuch bhi nahi bachta',
            '50k sockets ka matlab 50k leak hue objects — memory leak hi sabse bada khatra hai',
            'Clients reconnect karte waqt apne aap jitter laga dete hain — koi dikkat hi nahi',
          ],
          answer: 0,
          explain: '50,000 clients ek pal mein laut-te hain: har ek auth, subscription restore aur chhoote messages ki fetch karta hai. Lehar agle node ko bhi gira sakti hai — ek ke baad ek. Ilaaj: client par jitter wala reconnect, server par admission ki hadd, aur restarts dheere-dheere (staggered).',
          choiceExplanations: [
            '50,000 clients ek pal mein laut-te hain: har ek auth, subscription restore aur chhoote messages ki fetch karta hai. Lehar agle node ko bhi gira sakti hai — ek ke baad ek. Ilaaj: client par jitter wala reconnect, server par admission ki hadd, aur restarts dheere-dheere (staggered).',
            'Messages store mein hain — restart sirf connections todta hai. Dikkat wapas aane ki bheed hai.',
            'Sockets ki ginti leak ka saboot nahi. Khatra ek saath laut-ne ka hai.',
            'Jitter tabhi hai jab client code mein likha ho. Bina likhe sab ek saath laut-te hain.',
          ],
        },
        {
          q: 'Sirf server se client tak notifications jaani hain. WebSocket ya SSE — sahi soch?',
          choices: [
            'Ek taraf ke events ke liye SSE fit ho sakta hai — dono ka kharcha milao',
            'WebSocket ek taraf ka traffic bhej hi nahi sakta — sirf do-taraf chalta hai',
            'SSE par proxy timeout kabhi lagta hi nahi — bina hadd khula reh sakta hai',
            'Browser ka SSE server ki recovery bhi apne aap kar deta hai — kuch nahi likhna',
          ],
          answer: 0,
          explain: 'Data sirf ek taraf ja raha hai, toh SSE plain HTTP par chal jaata hai: proxies aur LB ke saath aasan, aur browser khud reconnect karta hai (Last-Event-ID ke saath). Par server ko chhoote events dobara dene ka intezaam phir bhi karna hai, aur proxy timeouts ke liye heartbeat. WebSocket bhi chalega — bas zyada kaam khud sambhalna padta hai. Dono ka kharcha milao.',
          choiceExplanations: [
            'Data sirf ek taraf ja raha hai, toh SSE plain HTTP par chal jaata hai: proxies aur LB ke saath aasan, aur browser khud reconnect karta hai (Last-Event-ID ke saath). Par server ko chhoote events dobara dene ka intezaam phir bhi karna hai, aur proxy timeouts ke liye heartbeat. WebSocket bhi chalega — bas zyada kaam khud sambhalna padta hai. Dono ka kharcha milao.',
            'WebSocket do-taraf hai, par ek taraf bhejna bhi bilkul chalta hai. Sawaal kharche ka hai.',
            'Proxies lambi idle connection kaat dete hain. SSE ko bhi heartbeat chahiye.',
            'Browser sirf reconnect karta hai. Chhoote events dobara dena server ka kaam hai.',
          ],
        },
      ],
    },
    {
      type: 'incident',
      title: 'Incident — "Chat mein messages kabhi-kabhi gayab ho jaate hain"',
      pager: '🚨 Users: "Kabhi-kabhi message bheja jaata hai par doosre ko dikhta hi nahi. Refresh karne par bhi nahi."',
      start: 'r1',
      nodes: {
        r1: {
          text: 'Refresh par bhi nahi dikhta — bada clue hai. Ab?',
          choices: [
            { t: "Jaancho: message pakka store hua tha?", good: true, next: 'r2', explain: 'Sahi. "Refresh par bhi nahi" ka matlab hai problem delivery ka nahi, <b>persistence</b> ka hai. Agar sirf live push toota hota toh refresh par dikh jaata.' },
            { t: "Sirf socket connection ke logs dekho", good: false, explain: 'Connection ki jaanch tab kaam aati hai jab message store hai par pahunch nahi raha. Yahan refresh par bhi nahi dikh raha — toh pehle dekho ki message likha bhi gaya tha ya nahi.' },
            { t: "Sirf client ka dikhane wala code dekho", good: false, explain: 'Ho sakta hai, par sabse pehla aur sasta test: message DB mein hai? Ek query se aadha search space kat jaata hai.' },
          ],
        },
        r2: {
          text: 'Message DB mein hai HI NAHI. Code: pehle sabko WebSocket par broadcast, phir async DB insert. Kya galat hai?',
          choices: [
            { t: "Pehle pakka store, phir push aur ACK", good: true, next: 'r3', explain: 'Bilkul. Broadcast pehle karne se connected users ko message dikh gaya, par message kahin likha hi nahi gaya. DB insert fail hua toh kisi ko pata bhi nahi chala — aur refresh par message gayab. <b>Pehle store, phir push.</b>' },
            { t: "Pehle broadcast, phir insert ko sync karo", good: false, explain: 'Sync karne se latency badhegi par asli galti kram ki hai, sync/async ki nahi. Agar tum pehle persist karke phir push karo toh async bhi bilkul theek hai.' },
            { t: "Push ke baad insert par retry jod do", good: false, explain: 'Retry madad karega, par sirf khidki chhoti karta hai. Jab tak push persist se pehle hai, tab tak "dikha par save nahi hua" mumkin rahega.' },
          ],
        },
        r3: {
          text: 'Kram theek kar diya. Ab offline users ka kya — offline users ko message kaise milega?',
          choices: [
            { t: "Badhti ID ka cursor; hadd wala catch-up", good: true, next: 'end', explain: 'Yahi is shape ka standard hal hai. Ab live push sirf ek <b>optimization</b> hai — sach hamesha store mein hai, aur client kabhi bhi gap bhar sakta hai. Limit isliye ki 3 din baad wapas aane wale ko 40,000 messages ek saath na bhejein.' },
            { t: "Har user ki durable inbox, reconnect par", good: false, explain: 'Ab tumhe per-user queues ka state rakhna padega, jo bade paimane par mehenga hai. Aur agar user 3 mahine na aaye? Store + cursor (last_seen_id) wahi kaam bina alag infra ke karta hai.' },
            { t: "Push service hi poori message history", good: false, explain: 'Push notification alag feature hai (user ko batana). Yahan sawaal hai: app khulne par user purane messages <b>dekhega</b> kaise?' },
          ],
        },
        end: {
          end: true,
          text: 'Ab message pehle store hota hai, phir push. Gayab hona band.',
          summary: `<b>Seekh:</b> WebSocket ek <b>tez raasta</b> hai — source of truth nahi.
            <br><br><b>Pattern:</b> <code>persist (id ke saath) → push → reconnect par last_seen_id se gap bharo</code>
            <br><br>Persist karke push karne ka ek design chaar problems hal karta hai: offline users, reconnects,
            multi-device sync, aur "message kho gaya". Delivery/read receipts bhi ismein
            natural roop se fit ho jaate hain — delivery/read receipts bas per-user cursors hain.
            <br><br><b>Limit lagana mat bhoolna:</b> 3 din baad wapas aane wale ko
            40,000 messages ek saath mat bhejo.`,
        },
      },
    },
    {
      type: 'fill',
      title: 'Realtime ke faisle',
      instructions: 'Sahi shabd chuno.',
      template: `Server se client ek-tarfa stream ke liye {0} chuno — SSE plain HTTP hai.
        Do-tarfa chahiye tab {1}. Connections stateful hain isliye {2} layer ko
        business logic se alag scale karo. Aur node restart par sab ek saath
        wapas na aayein, sabko saath lautne se rokne ke liye client par {3} lagao.`,
      tokens: ['SSE', 'WebSocket', 'gateway', 'backoff + jitter', 'polling', 'cache'],
      blanks: [
        { answer: 'SSE', explain: 'Server-Sent Events plain HTTP par chalta hai — proxies, LB aur auto-reconnect sab muft. Notifications aur LLM streaming SSE ke classic use hain.' },
        { answer: 'WebSocket', explain: 'Tab jab client bhi bhejta ho — chat, collab editing, gaming.' },
        { answer: 'gateway', explain: 'Gateway nodes sirf sockets rakhte hain (memory + FDs ki hadd). Business logic peechhe, aur beech mein pub/sub — kyunki do users do alag gateways par hote hain.' },
        { answer: 'backoff + jitter', explain: 'Warna 50,000 clients theek ek saath wapas aayenge aur agla node giraayenge. Wahi retry storm jo Resilience track mein dekha tha.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Realtime',
    instructions: 'Offline user ka sawaal hi is round ka dil hai. 🎤',
    questions: [
      {
        q: '"WhatsApp jaisa chat design karo. Message delivery kaise?"',
        choices: [
          'Pehle durable store (badhti ID), phir push; reconnect par cursor se gap bharo',
          'Sirf online sockets par broadcast karo — broadcast hi history ban jaata hai',
          'Push notification ko hi pakka record maano — push hi asli log hai, bas',
          'Socket ka ACK aa gaya matlab message hamesha ke liye store ho gaya, pakka',
        ],
        answer: 0,
        explain: 'Message pehle durable store mein, badhti ID ke saath. Phir connected recipients ko push. Reconnect par client last_seen_id bheje aur gap bhare. Push ek optimization hai, source of truth nahi.',
        choiceExplanations: [
          'Message pehle durable store mein, badhti ID ke saath. Phir connected recipients ko push. Reconnect par client last_seen_id bheje aur gap bhare. Push ek optimization hai, source of truth nahi.',
          'Offline user tak broadcast nahi pahunchta. Store ke bina history bachti hi nahi.',
          'Push notification chhoot sakti hai ya user band kar sakta hai. Asli record store hai.',
          'Socket ACK sirf "mil gaya" batata hai. Store tab hua jab durable write hua.',
        ],
      },
      {
        q: '"1 crore concurrent connections chahiye. Kya sochoge?"',
        choices: [
          'Ek node par kitne sockets, naap ke dekho; gateway alag scale karo, storm ki hadd rakho',
          '50k sockets per node ek pakka hardware niyam hai — har machine par bilkul wahi',
          'Load balancer akela saare sessions store kar leta hai — aur kuch nahi chahiye',
          'Autoscaling akele saare toote users ko wapas jod deti hai, apne aap, turant',
        ],
        answer: 0,
        explain: 'Connection layer alag rakho: gateway nodes sirf sockets sambhalein (kitne per node — load test se naapo; ~50k ek shuruaati andaaza hai), beech mein pub/sub, aur business logic alag scale ho. Reconnect storm ke liye jitter, admission ki hadd aur staggered restarts.',
        choiceExplanations: [
          'Connection layer alag rakho: gateway nodes sirf sockets sambhalein (kitne per node — load test se naapo; ~50k ek shuruaati andaaza hai), beech mein pub/sub, aur business logic alag scale ho. Reconnect storm ke liye jitter, admission ki hadd aur staggered restarts.',
          'Sockets per node memory, CPU aur message rate par depend karta hai. Naap ke tay karo.',
          'LB traffic baant-ta hai. Kaun kis node par hai aur kise kya bhejna hai — alag registry chahiye.',
          'Naye nodes aane mein waqt lagta hai, aur bheed pehle aati hai. Jitter aur hadd chahiye.',
        ],
      },
    ],
  },
  success: [
    'Polling / long-poll / SSE / WebSocket ka sahi chunav kar sakte ho',
    'Connection ko ek capacity dimension ki tarah dekh sakte ho',
    'Offline user ke liye store-then-push + cursor design kar sakte ho',
    'Reconnect storm pehchaan ke jitter laga sakte ho',
  ],
  homework: `Agar tumhare product mein koi realtime feature hai, teen sawaal poochho:
    (1) message pehle store hota hai ya pehle push? (2) offline user gap kaise bharta hai?
    (3) saare gateway nodes ek saath restart hue toh kya hoga?`,
  cards: [
    { front: 'SSE vs WebSocket?', back: '<b>SSE</b> = ek-tarfa (server→client), plain HTTP, reconnect muft — notifications, LLM streaming. <b>WebSocket</b> = do-tarfa — chat, collab, gaming. Ek-tarfa ke liye WS over-engineering hai.' },
    { front: 'Realtime design ka sabse bada sawaal?', back: '<b>"Offline user ko message kaise milega?"</b> Offline user ke sawaal se nikalta hai: pehle STORE karo (id ke saath), phir push. Reconnect par client last_seen_id se gap bhare.' },
    { front: 'Connections ka scaling?', back: 'Connection ek <b>capacity dimension</b> hai — ~50k/node (memory + FDs). 10 lakh users = 20 gateway nodes, chahe koi kuch bhej hi na raha ho. Gateway aur logic alag scale karo, beech mein pub/sub.' },
    { front: 'Reconnect storm?', back: 'Node restart = 50,000 ek saath reconnect (auth + subs + backlog). Ilaaj: client par <b>backoff + full jitter</b>, backlog fetch par limit, aur staggered/rolling restarts.' },
    { front: 'Fanout write par ya read par?', back: '<b>Write par</b> = read turant, par celeb par phatta hai. <b>Read par</b> = write sasta, read mehenga. Asli systems <b>hybrid</b> karte hain.' },
  ],
},

/* =====================================================================
   L5 — Geo & spatial
   ===================================================================== */

{
  id: 'geo',
  icon: '📍',
  title: 'Geo — "Nearby" Ek Range Query Nahi Hai',
  badge: 'Spatial Shilpi',
  objectives: [
    'lat/lng ka BETWEEN kyun ek jaal hai',
    'Geohash: do dimensions ko ek <b>sorted string</b> mein badalna',
    'Hot cell — geo data kabhi uniformly nahi bikhra hota',
    'Cell boundary ka problem aur cell boundary ka hal',
  ],
  lesson: [
    `<h3>📖 Seedha jawab jo dhokha deta hai</h3>
     <pre>SELECT * FROM drivers
WHERE lat BETWEEN 19.05 AND 19.15
  AND lng BETWEEN 72.80 AND 72.90;</pre>
     <p>lat/lng range query sahi lagta hai. Par yaad karo composite index ka niyam:
     <b>range column ke baad index ruk jaata hai</b>. Yahan
     <b>dono</b> columns range hain. Index <code>(lat, lng)</code> banao toh
     index <code>lat</code> ki range tak chalega — yaani poori latitude patti ke
     saare drivers — aur phir <code>lng</code> se filter karne ke liye DB ko
     saari rows padhni padengi.</p>
     <pre>(lat, lng) index ke saath:
   lat 19.05–19.15 ki patti  →  poore desh ki us patti ke 4 lakh drivers
   phir lng se filter        →  bache 900
   yaani 4 lakh rows padh ke 900 nikale</pre>
     <p>Asli problem hai: <b>B-tree ek-dimension ka hai</b>, aur jagah do-dimension ki.</p>
     <h3>🔡 Geohash — do dimensions ko ek line mein badlo</h3>
     <p>Geohash duniya ko baar-baar aadha karta hai (kabhi lng, kabhi lat) aur har
     faisle ko ek bit banata hai. Un bits ko base32 mein likho — bas, ek string:</p>
     <pre>Mumbai (19.076, 72.877)  →  te7ud9k

te        →  ~1250 km ka box
te7       →  ~156 km
te7u      →  ~39 km
te7ud     →  ~5 km
te7ud9    →  ~1.2 km
te7ud9k   →  ~150 m</pre>
     <p class="tip">🎯 Kamaal ki baat: <b>same prefix ek spatial cell deta hai;nearby points boundary ke across different prefix rakh sakte hain.</b>
     Radius cover karne wali cells ke prefixes se <b>candidate set</b> nikalo, jaise <code>WHERE geohash LIKE 'te7ud%'</code>. Query index/operator/collation verify karo; cell boundary ke across cells bhi chahiye. Final exact distance filter aur sort radius correctness dete hain.</p>
     <p>Ismein bhi behtar: <b>H3</b> mostly hexagonal hierarchical grid hai; pentagons aur projection distortion bhi hain. Neighbor/radius coverage supported traversal se nikalo; grid hop distance exact geographic distance nahi. Candidate points par exact radius/distance verify karo.</p>`,
    `<h3>🔥 Hot cell — is shape ka signature failure</h3>
     <p>Geo data <b>kabhi</b> uniformly nahi bikhra hota. Aadha shehar 5% cells mein hai,
     aur 8 PM par airport wali ek cell mein poore region ka traffic aa jaata hai.</p>
     <pre>cell te7ud9  (airport, 8 PM)   ████████████  40,000 rps  🔥
cell te7uc2  (samundar)                        0 rps  😴</pre>
     <p>Hot cell bilkul wahi <b>hot key</b> problem hai jo cache level mein tha —
     aur ilaaj bhi wahi shape rakhta hai:</p>
     <table>
       <tr><td>Cell ko todo</td><td>Hot cell ko finer spatial resolution par split karo (geohash5 →7characters)</td></tr>
       <tr><td>Replicate karo</td><td>Us cell ka data N copies mein, alag nodes par</td></tr>
       <tr><td>Adaptive grid</td><td>Density ke hisaab se cell size — ghani jagah chhote cells</td></tr>
     </table>
     <p>Isliye fixed grid size lagbhag hamesha galti hai. Manhattan aur Rajasthan
     ke liye ek hi cell size sahi ho hi nahi sakta.</p>
     <h3>🧩 Cell boundary ka problem</h3>
     <p>Tum cell <code>te7ud9</code> mein ho, bilkul cell ke kinare par. Sabse paas ka
     driver 50 meter door hai — par driver <b>bagal wale cell</b> mein hai. Sirf apni
     cell dekhoge toh driver milega hi nahi.</p>
     <pre>Ilaaj: apni cell + apni cell ke 8 padosi cells query karo (geohash ke neighbours)
       phir un candidates par ASLI doori nikaal ke sort karo</pre>
     <p class="tip">🎯 Yahi geo ka standard do-kadam design hai:
     <b>1. index se candidates chuno (mota chhanna), 2. unhi par sahi hisaab karo
     (baarik chhanna).</b> Index ka kaam 84 lakh ko 900 tak laana hai —
     "sabse paas kaun" ka sahi jawab asli doori nikaalne ke baad nikalta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Nearby drivers',
      goal: `84 lakh drivers hain. Ek cell ke drivers nikalo — pehle bina index,
             phir sahi index ke saath. Phir dekho ki 8 PM par airport kya karta hai.`,
      sys: {
        name: 'dispatch-api',
        slo: { p99Ms: 150, availability: 99.9 },
        db: {
          bufferPoolMB: 1024,
          tables: {
            drivers: {
              rows: 8400000, rowBytes: 160, pk: 'id',
              cols: ['id', 'driver_id', 'geohash', 'city', 'status', 'updated_at'],
              indexes: [{ name: 'drivers_pkey', cols: ['id'], unique: true }],
            },
          },
        },
        api: { pagination: 'offset', countTotal: false, defaultSort: 'updated_at', primaryTable: 'drivers' },
      },
      tasks: T_GEO,
      success: SD.allTasks(T_GEO),
      successText: `Geohash ne do-dimension ka problem ek <b>prefix scan</b> bana diya —
        wahi B-tree jo tum pehle se jaante ho. Aur hot cell wahi hot key hai
        jo cache level mein mili thi: ek shape, do jagah. Isiliye patterns pehchanna
        zaroori hai — ilaaj aksar tumhe pehle se aata hota hai.`,
      solution: [
        "show tables",
        "GET /api/v1/drivers?geohash=te7ud9&limit=20",
        "CREATE INDEX ix_geo ON drivers(geohash, updated_at)",
        "GET /api/v1/drivers?geohash=te7ud9&limit=20",
        "cache hotkey --key cell:te7ud9 --rps 40000",
        "cache hotkey --key cell:te7ud9 --rps 40000 --replicas 8",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'drivers', ['geohash', 'updated_at']) && m.latest(s, 'cache', 'hotkey')?.rps === 40000 && m.latest(s, 'cache', 'hotkey')?.hot === false; },
      hints: [
        'Pehle `show tables` se drivers ka paimana dekho, phir ek cell ki GET bhejo. Returned drivers se zyada rows padhna missing access index ka sanket hai.',
        '`CREATE INDEX <name> ON drivers(geohash, updated_at)` ke baad same cell ki GET dohrao. Hot cell ke liye `cache hotkey --key <cell-key> --rps 40000 --replicas <copies>`; copies read load baantti hain.',
        'Poora raasta — har command alag Enter se chalao:\nshow tables\nGET /api/v1/drivers?geohash=te7ud9&limit=20\nCREATE INDEX ix_geo ON drivers(geohash, updated_at)\nGET /api/v1/drivers?geohash=te7ud9&limit=20\ncache hotkey --key cell:te7ud9 --rps 40000\ncache hotkey --key cell:te7ud9 --rps 40000 --replicas 8',
      ],
    },
    {
      type: 'quiz',
      title: 'Geo ki samajh',
      questions: [
        {
          q: 'Saada composite B-tree (lat, lng) se radius wali query mein kya dikkat hai?',
          choices: [
            'Lat ki range ke baad index paas ka ilaka nahi pakad paata — lambi patti scan hoti hai',
            'Float values ka index ban hi nahi sakta — lat aur lng par index namumkin hai',
            'Do columns ek index mein ho hi nahi sakte — composite index hota hi nahi',
            'BETWEEN kabhi B-tree scan use nahi karta — har baar poori table scan hoti hai',
          ],
          answer: 0,
          explain: 'B-tree jagahon ko ek sorted kram mein rakhta hai. Lat ki range (BETWEEN) par index ki ek lambi patti padhni padti hai — lng ki shart index ke andar jaanchi jaati hai, par padhne wala hissa chhota nahi hota (kuch naye plans skip scan se ghataate hain). Radius ke liye spatial index (geohash/H3 cells, ya PostGIS GiST) se tulna karo, aur EXPLAIN se asli scan dekho.',
          choiceExplanations: [
            'B-tree jagahon ko ek sorted kram mein rakhta hai. Lat ki range (BETWEEN) par index ki ek lambi patti padhni padti hai — lng ki shart index ke andar jaanchi jaati hai, par padhne wala hissa chhota nahi hota (kuch naye plans skip scan se ghataate hain). Radius ke liye spatial index (geohash/H3 cells, ya PostGIS GiST) se tulna karo, aur EXPLAIN se asli scan dekho.',
            'Float columns par index bilkul banta hai. Dikkat 2D doori ki hai.',
            'Composite index kai columns par banta hai. Dikkat radius ki 2D banawat hai; baad ka column bekaar nahi hota.',
            'BETWEEN B-tree par range scan karta hai. Dikkat doosre column ki hai.',
          ],
        },
        {
          q: 'Geohash aur paas-paas ki jagah — kaunsi baat sahi hai?',
          choices: [
            'Paas ki jagahon ka prefix aksar ek jaisa — par cell ki seema par hamesha nahi',
            'Har paas wali jodi ka geohash prefix hamesha same hota hai, bina exception',
            'Ek prefix pakka radius ke saare sahi nateeje de deta hai — aur kuch nahi',
            'Geohash har jagah saare cells ko bilkul barabar size ka bana deta hai',
          ],
          answer: 0,
          explain: 'Geohash mein paas ki jagahein aksar same prefix share karti hain — isliye "nearby" ek B-tree prefix scan ban jaata hai. Par cell ki seema par do paas ke points ke prefix bilkul alag ho sakte hain. Isliye padosi cells bhi dekho, phir asli doori nikaalo. Cells ka size latitude ke saath badalta hai.',
          choiceExplanations: [
            'Geohash mein paas ki jagahein aksar same prefix share karti hain — isliye "nearby" ek B-tree prefix scan ban jaata hai. Par cell ki seema par do paas ke points ke prefix bilkul alag ho sakte hain. Isliye padosi cells bhi dekho, phir asli doori nikaalo. Cells ka size latitude ke saath badalta hai.',
            'Cell ki seema ke dono taraf paas ke points ka prefix alag ho sakta hai.',
            'Prefix sirf candidates deta hai. Asli doori se filter karna padta hai.',
            'Geohash cells latitude ke saath chhote-bade hote hain. Barabar size nahi.',
          ],
        },
        {
          q: 'Query cell ki seema par hai. Paas ke candidates sahi tarah kaise dhakoge?',
          choices: [
            'Radius dhakne wale saare cells lo, phir candidates ki asli doori nikaal ke filter',
            'Sirf apni cell dekho — apni cell hamesha sabse paas wale ko dhak leti hai',
            'Har radius ke liye hamesha theek 8 padosi cells — na kam, na zyada',
            'H3 mein hamesha 8 padosi hexagon hote hain — bilkul geohash jaisa hi',
          ],
          answer: 0,
          explain: 'Query seema par ho toh paas wala driver padosi cell mein ho sakta hai. Radius ko dhakne wale saare cells lo (geohash mein aksar apni + 8 padosi; bada radius ho toh aur), phir candidates par asli doori (haversine) nikaal ke filter aur sort karo. H3 hexagon ke 6 padosi hote hain.',
          choiceExplanations: [
            'Query seema par ho toh paas wala driver padosi cell mein ho sakta hai. Radius ko dhakne wale saare cells lo (geohash mein aksar apni + 8 padosi; bada radius ho toh aur), phir candidates par asli doori (haversine) nikaal ke filter aur sort karo. H3 hexagon ke 6 padosi hote hain.',
            'Sirf apni cell dekhoge toh seema ke paar wala driver chhoot jaayega.',
            'Radius cell se bada ho toh 8 se zyada cells chahiye. Ginti radius par depend karti hai.',
            'Hexagon ke 6 padosi hote hain, 8 nahi.',
          ],
        },
        {
          q: '8 PM par airport wali cell par 40,000 rps aa raha hai. Kaunsi dikkat hai?',
          choices: [
            'Hot cell (hot key) — skew naapo, cell ko chhote hisson mein todo ya replicate karo',
            'Geo workload mein hot partition ho hi nahi sakta — yahan kuch aur galat hai',
            'Chhote cells se poore ilaake ka traffic hi khatam ho jaata hai, bas',
            'Aur nodes jod do — nodes ek cell ko apne aap kai hisson mein baant lenge',
          ],
          answer: 0,
          explain: 'Cache level wala hot key, naye roop mein: ek cell par bahut bheed. Pehle skew naapo, phir garam cell ko chhoti precision par todo (adaptive cells) ya cell ka data replicate karke reads baanto. Nodes jodne se ek cell apne aap nahi bant-ti.',
          choiceExplanations: [
            'Cache level wala hot key, naye roop mein: ek cell par bahut bheed. Pehle skew naapo, phir garam cell ko chhoti precision par todo (adaptive cells) ya cell ka data replicate karke reads baanto. Nodes jodne se ek cell apne aap nahi bant-ti.',
            'Airport, stadium, station — geo mein hot cells aam hain.',
            'Chhote cells load baant-te hain, traffic khatam nahi karte. Log wahi hain.',
            'Ek key ek hi node par rehti hai jab tak tum khud na todo. Nodes jodne se cell nahi bant-ta.',
          ],
        },
      ],
    },
    {
      type: 'bins',
      title: 'Geo faisle',
      instructions: 'Har cheez ko sahi bin mein daalo.',
      bins: [
        { id: 'good', label: '✅ Achha faisla' },
        { id: 'bad', label: '❌ Jaal' },
      ],
      items: [
        { text: 'Geohash prefix se candidates, phir haversine se exact doori', bin: 'good', explain: 'Do-kadam design: index mota chhanna karta hai, asli hisaab sirf bache hue candidates par chalta hai. Yahi har production geo system karta hai.' },
        { text: 'Poore shehar ke liye ek fixed cell size', bin: 'bad', explain: 'Density kahin 100x zyada hai. Ek cell size ka matlab hai kahin cell khaali aur kahin cell jal rahi hai. Adaptive grid ya cell splitting chahiye.' },
        { text: 'Driver locations Redis mein, DB mein sirf snapshot', bin: 'good', explain: 'Location har 4 second par update hoti hai — <b>hot, ephemeral</b> data. Har update DB mein likhna write storm hai. Redis (GEO commands ke saath) yahan sahi jagah hai.' },
        { text: 'Sirf apni cell query karo, padosi cells chhodo', bin: 'bad', explain: "Cell boundary ka problem: 50 meter door ka driver bagal ki cell mein hoga aur kabhi nahi milega. Supported radius cover karne wali neighboring cells lo;count resolution/radius aur grid scheme par depend hai." },
        { text: 'Har driver ping ko DB mein insert karo (4 sec par ek)', bin: 'bad', explain: '1 lakh drivers × 15 ping/min = 15 lakh writes/min, aur purana location ka koi mol nahi. Location ek <b>current state</b> hai, history nahi — in-memory store mein rakho.' },
        { text: 'H3 hexagons use karna square cells ki jagah', bin: 'good', explain: "H3 hierarchical hexagonal cells useful adjacency dete hain,butpentagons/distortion aur resolution-dependent coverage handle karo.Exact radius distance filter separately chahiye." },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Geo',
    instructions: 'Yahan "hot cell" bolna hi tumhe alag kar deta hai. 🎤',
    questions: [
      {
        q: '"Nearby drivers design karo" — sahi nateeje ke liye kya zaroori hai?',
        choices: [
          'Radius dhakne wale cells, taaza locations, aur aakhir mein asli doori se filter',
          'PostGIS ka koi bhi istemaal apne aap mein bahut dheema hai — kabhi mat lo',
          'Sirf apni cell dekho — apni cell sabse paas ke driver ki guarantee hai',
          'Koi bhi cell scheme ho, hamesha theek 8 padosi cells hi dekhne hain',
        ],
        answer: 0,
        explain: 'Locations in-memory geo store mein (har ~4 s update), geohash ya H3 cell se index. Query = radius dhakne wale cells, phir asli doori (haversine) se filter aur sort. Purani location wale drivers hatao (taazgi), aur hot cells ke liye adaptive precision ya replication. PostGIS bhi chal sakta hai — load naap ke chuno.',
        choiceExplanations: [
          'Locations in-memory geo store mein (har ~4 s update), geohash ya H3 cell se index. Query = radius dhakne wale cells, phir asli doori (haversine) se filter aur sort. Purani location wale drivers hatao (taazgi), aur hot cells ke liye adaptive precision ya replication. PostGIS bhi chal sakta hai — load naap ke chuno.',
          'PostGIS ka GiST index nearby query tez karta hai. Write load ke hisaab se chuno.',
          'Seema ke paar wala driver padosi cell mein ho sakta hai.',
          'Padosi cells ki ginti scheme aur radius par depend karti hai (H3 ke 6).',
        ],
      },
      {
        q: '1 lakh drivers har 4 second location bhejte hain. Abhi ki location aur history kaise rakhoge?',
        choices: [
          'Abhi ki location in-memory geo store mein; history sirf utni jitni zaroori, alag',
          'Har location update phenk do — kisi bhi location ko kabhi save mat karo',
          'Postgres 25k writes/second kabhi jhel hi nahi sakta — namumkin hai',
          'Kafka akela sabse paas ka driver bata deta hai — query ki zaroorat nahi',
        ],
        answer: 0,
        explain: '1 lakh ÷ 4 s = 25,000 updates/second. Abhi ki location ek in-memory geo store (jaise Redis GEO) mein — current state, history nahi. History utni hi rakho jitni chahiye (trip ka raasta, billing, jhagde), alag store mein ya stream se batch karke. Har update DB mein bhejna zaroori nahi — par "Postgres 25k writes/s kar hi nahi sakta" bhi galat; naap ke chuno.',
        choiceExplanations: [
          '1 lakh ÷ 4 s = 25,000 updates/second. Abhi ki location ek in-memory geo store (jaise Redis GEO) mein — current state, history nahi. History utni hi rakho jitni chahiye (trip ka raasta, billing, jhagde), alag store mein ya stream se batch karke. Har update DB mein bhejna zaroori nahi — par "Postgres 25k writes/s kar hi nahi sakta" bhi galat; naap ke chuno.',
          'Trip ka raasta, billing aur jhagde ke liye kuch history chahiye. Sab phenkna galat hai.',
          'Sahi hardware aur batching ke saath Postgres 25k writes/s kar sakta hai. Sawaal kharche aur zaroorat ka hai.',
          'Kafka log hai, geo query nahi karta. "Sabse paas kaun" ke liye geo index chahiye.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki 2D range query par index kyun nahi chalta',
    'Geohash/H3 radius coverage se candidates,phir exact distance filter choose kar sakte ho',
    'Hot cell pehchaan ke split/replicate kar sakte ho',
    'Cell boundary ka do-kadam hal jaante ho',
  ],
  homework: `Apne shehar ka geohash nikaalo (koi bhi online tool). Dekho ki 5 characters
    par box kitna bada hai aur 7 par kitna. Phir socho: tumhare use case ke liye
    kaunsi precision sahi hai — aur peak par us cell mein kitne log honge?`,
  cards: [
    { front: 'lat/lng dono par BETWEEN — kya hota hai?', back: 'Composite index <b>pehli range ke baad ruk jaata hai</b>. Poori latitude patti padhni padti hai. B-tree 1D hai, jagah 2D.' },
    { front: 'Geohash ka kamaal?', back: 'Common prefix ek hi coarse cell dikhata hai. Paas ke points cell boundaries ke aar-paar hon toh prefixes alag ho sakte hain. Isliye "nearby" = <code>LIKE \'te7ud%\'</code> = B-tree prefix scan. 2D problem 1D ban gaya.' },
    { front: 'Geo query ka do-kadam design?', back: '1. Index se <b>mota chhanna</b> (cell + 8 padosi → ~900 candidates). 2. Un par <b>asli doori</b> (haversine) nikaal ke sort. Index ka kaam sirf candidates dena hai.' },
    { front: 'Hot cell?', back: 'Geo data uniformly nahi bikhra — airport 8 PM par jalta hai. Hot cell <b>wahi hot key</b> problem hai: cell ko finer resolution par split karo ya replicate karo. Fixed grid size lagbhag hamesha galti hai.' },
    { front: 'Driver locations kahan store karein?', back: '<b>In-memory geo store</b> (Redis) — driver locations current state hai, history nahi. 1 lakh drivers × 15 ping/min DB par bhejna write storm hai.' },
    { front: 'H3 hexagons kyun?', back: "H3 mostly hexagonal hierarchical grid hai,pentagons aur projection distortion bhi hain.Neighbor/radius cover gridDisk ya appropriate coverage algorithm se nikalo,phir exact distance verify karo." },
  ],
},

/* =====================================================================
   L6 — Transactional / ledger
   ===================================================================== */
{
  id: 'ledger',
  icon: '💰',
  title: 'Ledger — Jahan "Lagbhag Sahi" Chalta Hi Nahi',
  badge: 'Ledger Rakshak',
  objectives: [
    'Balance ek <b>column</b> nahi, entries ka <b>sum</b> hota hai',
    'Double-entry: har paisa kahin se aaya, kahin gaya',
    'Reconciliation — "numbers match nahi kar rahe" ka jawab',
    'Money mein cache aur eventual consistency kab khatra hain',
  ],
  lesson: [
    `<h3>📖 Sabse pehli galti: balance ko update karna</h3>
     <pre>UPDATE accounts SET balance = balance - 500 WHERE id = 7;</pre>
     <p>Balance update chalta hai. Par ab ek sawaal ka jawab do: <b>"3 tareekh ko dopahar
     2 baje account ka balance kya tha?"</b> Jawab hai — pata nahi. Tumne purani value
     ke upar likh diya. Itihaas kahin nahi hai.</p>
     <p>Aur agla sawaal: <b>"balance 4,700 kyun hai?"</b> Jawab: pata nahi.
     Bas 4,700 hai.</p>
     <p>Isliye har asli financial system balance ko <b>store</b> nahi karta —
     financial system <b>immutable entries</b> store karta hai aur balance entries ka sum hota hai:</p>
     <pre>entries (kabhi UPDATE nahi, kabhi DELETE nahi — sirf INSERT)
   id  account  amount   type      ref
   1   7        +5000    credit    topup_881
   2   7         -500    debit     order_912
   3   7         +200    credit    refund_912

balance(7) = SUM(amount) = 4700   ← hamesha derive hota hai</pre>
     <p class="tip">🎯 Ab har sawaal ka jawab hai: kab, kitna, kyun, kis wajah se.
     Ledger event sourcing ka sabse purana aur sabse aazmaaya hua roop hai —
     accountants ledger ko 600 saal se chala rahe hain.</p>
     <h3>⚖️ Double-entry — paisa banta ya mitta nahi</h3>
     <p>Har transaction <b>do</b> entries banata hai: ek jagah se nikla, doosri jagah
     gaya. Aur system ka ek hi invariant hai:</p>
     <pre>user_wallet   -500
merchant       +500
             -------
SUM              0     ← poore system ka sum hamesha ZERO hona chahiye</pre>
     <p>Double-entry sirf hisaab-kitaab nahi hai — zero sum ek <b>checkable invariant</b> hai.
     Ek query jo poore system ka sum leti hai; agar sum kabhi zero nahi hai, toh
     kahin paisa bana ya mita hai. Zero sum ka alert automatic ho sakta hai, aur alert bugs
     pakadta hai jo kisi test mein nahi milte.</p>
     <p>Performance ke liye ek <b>materialized balance</b> rakhna theek hai —
     par materialized balance sirf ek cache hai, aur materialized balance ko regularly entries ke sum se milaana padta hai.</p>`,
    `<h3>🔍 Reconciliation — "numbers match nahi kar rahe"</h3>
     <p>Numbers ka mismatch money shape ka signature failure mode hai. Tumhara ledger kehta hai
     ₹4,82,100 aaye. Payment gateway kehta hai ₹4,81,650. Kaun sahi hai?</p>
     <p>Jawab: <b>koi bhi nahi, jab tak tum milaao na.</b> Reconciliation ek roz ka
     job hai jo dono taraf ke records line-by-line milaata hai:</p>
     <pre>Teen tarah ke farak milte hain:
   1. Hamare paas hai, payment gateway ke paas nahi  →  humne count kar liya, paisa aaya nahi?
   2. Payment gateway ke paas hai, hamare paas nahi  →  webhook chhoot gaya / event kho gaya
   3. Dono ke paas, amount alag        →  fees, currency conversion, rounding</pre>
     <p>Teesra sabse aam hai aur sabse boring — aur isiliye log amount ka farak skip karte hain
     aur phir saal ke ant mein 40 lakh ka farak dhoondte hain.</p>
     <p class="tip">🎯 Distributed systems mein reconciliation optional nahi hai.
     Broker ki transactional processing boundary ko external payment/ledger effects par automatic mat lagao. Retried delivery, missing acknowledgments aur partial failures handle karo. Idempotency repeated effects ko limit karti hai; independent reconciliation missing ya mismatched outcomes <b>pakadti</b> hai. Dono chahiye.</p>
     <h3>🚫 Yahan cache aur eventual consistency kab khatra hain</h3>
     <table>
       <tr><th>Kaam</th><th>Stale chalega?</th></tr>
       <tr><td>Transaction history dikhana</td><td>✅ 30 second purana theek hai</td></tr>
       <tr><td>Dashboard par "kul kharch"</td><td>✅ minute bhar purana theek hai</td></tr>
       <tr><td><b>Kharch se pehle balance check</b></td><td>❌ <b>kabhi nahi</b> — yahan overdraft ban jaayega</td></tr>
       <tr><td>Refund ki eligibility</td><td>❌ nahi — double refund ban jaayega</td></tr>
     </table>
     <p>Balance check wahi "galat jawab kitna mehenga hai" wala sawaal hai. Yahan poora system
     eventual ho sakta hai — <b>siwaay us ek query ke jo paisa nikaalne se pehle
     chalti hai</b>. Balance check ki query primary se, ek transaction ke andar, aur account row par
     lock ke saath chalni chahiye.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Money system ke faisle',
      instructions: 'Har faisle ko sahi bin mein daalo.',
      bins: [
        { id: 'good', label: '✅ Sahi' },
        { id: 'bad', label: '❌ Khatarnak' },
      ],
      items: [
        { text: 'Balance ko entries ke SUM se derive karna', bin: 'good', explain: 'Itihaas bacha rehta hai, har number ka karan hota hai, aur audit apne aap ho jaata hai. Materialized balance ek cache ke roop mein rakhna theek hai.' },
        { text: 'Paise ko float/double mein store karna', bin: 'bad', explain: '0.1 + 0.2 ≠ 0.3 binary floating point mein. Paisa hamesha <b>integer</b> mein (paise/cents) ya decimal type mein rakho. Float ki galti chhoti si rounding se shuru hoti hai aur reconciliation ka sabse ganda din ban jaati hai.' },
        { text: 'Ledger entry ko baad mein UPDATE karna', bin: 'bad', explain: 'Entries <b>immutable</b> hain. Galti hui toh nayi <b>reversal</b> entry banao, purani ko badlo mat. Warna tumhara audit trail jhooth bolne lagta hai.' },
        { text: 'Har payment par idempotency key', bin: 'good', explain: 'Retries hongi hi — network timeout par client ko pata hi nahi chalta ki charge hua ya nahi. Key ke bina retry = double charge.' },
        { text: 'Roz reconciliation job jo gateway se milaata hai', bin: 'good', explain: 'Idempotency duplicates <b>rokti</b> hai; reconciliation kho gaye aur alag hue records <b>pakadti</b> hai. Distributed system mein dono chahiye.' },
        { text: 'Balance ko Redis se padhna (kharch se pehle)', bin: 'bad', explain: 'Stale balance = overdraft. History dikhane ke liye cache theek hai, par <b>paisa nikaalne se pehle</b> wala check primary se, transaction ke andar, lock ke saath hona chahiye.' },
        { text: 'Poore system ka SUM(amount) = 0 par alert', bin: 'good', explain: 'Double-entry ka invariant. Ek query jo poore system ki sehat batati hai — aur aise bugs pakadti hai jo kisi unit test mein nahi milte.' },
      ],
    },
    {
      type: 'order',
      title: 'Ek payment ka sahi kram',
      instructions: 'User ₹500 se order pay kar raha hai. Kadam sahi kram mein.',
      steps: [
        { text: 'Idempotency key ke saath request aayi — pehle dekho ki key pehle dekhi hai kya', explain: 'Sabse pehla kadam. Agar key pehle se hai toh <b>wahi purana jawab</b> laut do — naya charge mat banao. Retry par yahi bachaata hai.' },
        { text: 'Transaction shuru karo aur account row par lock lo', explain: 'Bina lock ke do concurrent requests dono balance 500 padh lengi aur dono pass ho jaayengi — classic double-spend. <code>SELECT ... FOR UPDATE</code>.' },
        { text: 'Balance check karo — primary se, cache se nahi', explain: 'Poore flow mein sirf is query ko kabhi stale nahi hona chahiye. Baaki system eventual ho sakta hai.' },
        { text: 'Do ledger entries likho: wallet −500, merchant +500', explain: 'Double-entry. Dono ek hi transaction mein, taaki aadha kabhi na ho. Sum zero rehta hai.' },
        { text: 'Idempotency key ko jawab ke saath store karo', explain: 'Usi transaction mein — warna commit ho jaayega par key save nahi hogi, aur retry double charge banayegi.' },
        { text: 'Commit', explain: 'Ab sab kuch atomic ho gaya: entries, balance ka asar, aur idempotency record — teenon saath.' },
        { text: 'Commit ke BAAD event publish karo (outbox se)', explain: 'Commit se pehle publish karna galat hai — transaction rollback ho gaya toh tumne ek jhooti event bhej di. Outbox pattern isi dikkat ke liye hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Ledger ki samajh',
      questions: [
        {
          q: 'Sirf balance ka column badalte ho, payment ki entries nahi rakhte. Kya khatra hai?',
          choices: [
            'Purani entries bina balance badla, toh rakam ka karan aur waqt kho sakte hain',
            'Balance par row lock liya, toh purane har len-den ka record bhi mil jaayega',
            'Entries ki jagah roz ka kul balance rakho, har payment ka audit ho jaayega',
            'Gateway ka aaj ka total rakho, har purane wallet balance ka jawab mil jaayega',
          ],
          answer: 0,
          explain: 'Sirf aaj ka balance batata hai ki kitna paisa hai; kaise bana, pata nahi chalta. Na badalne wali ledger entries ke saath tez reads ke liye balance bhi rakh sakte ho. Entries aur balance ka asar ek transaction mein likho; niyam aur reconciliation bhi chahiye.',
          choiceExplanations: [
            'Sirf aaj ka balance batata hai ki kitna paisa hai; kaise bana, pata nahi chalta. Na badalne wali ledger entries ke saath tez reads ke liye balance bhi rakh sakte ho. Entries aur balance ka asar ek transaction mein likho; niyam aur reconciliation bhi chahiye.',
            'Row lock ek saath kharch ko sambhaalta hai. Purani entries ka itihaas lock se nahi banta.',
            'Roz ka total har payment ka waqt, rakam aur reference nahi batata.',
            'Gateway ka total har wallet ka itihaas nahi deta. Apni entries bhi chahiye.',
          ],
        },
        {
          q: 'Tumhara ledger ₹4,82,100 kehta hai, gateway ₹4,81,650. Pehla kadam?',
          choices: [
            'Payment IDs, waqt, fees aur rakam milaao; farak ke alag groups banao',
            '₹450 ka adjustment daalo; total mil jaaye toh jaanch poori maan lo',
            'Gateway ka total sahi maano; apne records bina milaan badal do',
            'Apna total sahi maano; gateway ke records ki jaanch rok do',
          ],
          answer: 0,
          explain: '₹450 ka farak wajah nahi batata. Records ko payment ID se milaao: sirf apne ledger mein, sirf gateway mein, ya dono mein alag rakam. Webhook, cutoff ka waqt, fees aur rounding jaancho. Dono taraf galti ho sakti hai.',
          choiceExplanations: [
            '₹450 ka farak wajah nahi batata. Records ko payment ID se milaao: sirf apne ledger mein, sirf gateway mein, ya dono mein alag rakam. Webhook, cutoff ka waqt, fees aur rounding jaancho. Dono taraf galti ho sakti hai.',
            'Bina saboot adjustment se total mil sakta hai, par chhooti payment chhip jaayegi.',
            'Gateway ki fees, cutoff ya galti farak bana sakti hai. Records milaaye bina apna ledger mat badlo.',
            'Apne ledger mein bhi missing event ya galti ho sakti hai. Dono records jaanchne hain.',
          ],
        },
        {
          q: 'Paisa kis type mein store karoge?',
          choices: [
            'Currency ke saath decimal ya chhoti ikai ka integer; rounding ka niyam saaf',
            'Double mein rakam rakho; aakhri screen par round karna hisaab ke liye kaafi',
            'Har currency ko paise ki tarah do decimal do; alag niyam rakhna bekaar',
            'Rakam ko string mein rakho; jodne se pehle type aur currency jaanchna bekaar',
          ],
          answer: 0,
          explain: '₹4,999.50 ko 499950 paise rakh sakte ho. Decimal type bhi chalta hai. Currency, chhoti ikai aur rounding ka niyam saaf rakho; har currency mein do decimal nahi hote. Binary float kai decimal rakam theek se nahi rakh paata.',
          choiceExplanations: [
            '₹4,999.50 ko 499950 paise rakh sakte ho. Decimal type bhi chalta hai. Currency, chhoti ikai aur rounding ka niyam saaf rakho; har currency mein do decimal nahi hote. Binary float kai decimal rakam theek se nahi rakh paata.',
            'Sirf screen par rounding karne se pehle ke float hisaab ki galti nahi mitti.',
            'Currency ki chhoti ikai alag ho sakti hai. Do decimal sab currencies ka niyam nahi.',
            'String akeli sahi hisaab nahi karaati. Rakam, currency aur decimal hisaab jaanchna padega.',
          ],
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Wallet',
      instructions: 'Ek wallet banao jisme paisa kabhi kho ya ban na sake.',
      brief: `Users wallet mein paisa daalte hain, kharch karte hain, refund paate hain.
        Peak 2,000 transactions/sec. Regulator poora audit trail maangta hai.`,
      requirements: ['Paisa kabhi kho/ban na sake', 'Poora audit trail', 'Double-spend na ho'],
      pass: 10,
      slots: [
        {
          id: 'model', label: 'Balance ka model', icon: '📒',
          options: [
            { id: 'entries', label: "Entries na badlo; balance entries se nikaalo", score: 3, why: 'Entries se rakam ka waqt, reference aur karan milta hai. Materialized balance ko entries se milaate raho; audit ke baaki checks bhi chahiye.' },
            { id: 'col', label: "Sirf balance badlo; entries ka itihaas na rakho", score: -3, why: 'Sirf balance se har purane len-den ka karan nahi milta. Recovery ke liye alag records ya backups par nirbhar rehna padega.' },
            { id: 'both', label: "Balance aur entries alag-alag sach maano", score: -1, why: 'Entries aur balance ko alag-alag badalne diya toh farak ban sakta hai. Entries ko asal record maano; balance ko entries se nikaalo.' },
          ],
        },
        {
          id: 'concur', label: 'Do requests ek saath', icon: '🔒',
          options: [
            { id: 'lock', label: "Transaction mein row lock; check aur debit saath", score: 3, why: 'Account row lock ke andar check aur debit saath hote hain. Ek account ke kharch kram mein chalte hain; doosre shared records par contention phir bhi ho sakta hai.' },
            { id: 'opt', label: "Version jaanch ke debit; takraav par retry", score: 1, why: 'Chalta hai aur read-heavy par aksar behtar hai. Par ek hot account (jaise merchant ka) par retry storm ban sakta hai. Wallet ke liye pessimistic lock zyada seedha hai.' },
            { id: 'none', label: "Balance padho, phir bina shart debit likho", score: -3, why: 'Do requests balance 500 padhkar kharch manzoor kar sakti hain. Bina atomic shart ke overdraft ya kho gaya update ho sakta hai.' },
          ],
        },
        {
          id: 'retry', label: 'Client ne timeout par retry kiya', icon: '🔁',
          options: [
            { id: 'idem', label: "Ek payment ki key aur asar saath save karo", score: 3, why: 'Ek payment ki key aur payment ka asar ek transaction mein rakho. Retry par save hua jawab do; badli hui request ko key ke saath mat chalaao.' },
            { id: 'dedup', label: "Rakam, user aur waqt milne par retry maano", score: -1, why: 'Do asli ₹100 payments ek hi user se paas-paas aa sakti hain. Sirf rakam aur waqt milaakar duplicate maana toh sahi payment ruk sakti hai.' },
            { id: 'nothing', label: "Har dobara aayi request ko nayi payment maano", score: -3, why: 'Timeout par charge hua ya nahi, client ko pata nahi. Har retry ko naya debit maana toh do baar charge ho sakta hai.' },
          ],
        },
        {
          id: 'recon', label: 'Gateway se milaan', icon: '🔍',
          options: [
            { id: 'daily', label: "Gateway ki har payment milaao, farak par alert", score: 2, why: 'Idempotency dobara aayi payment ka asar rokne mein madad karti hai. Gateway se independent milaan chhoote, galat ya alag records pakadta hai.' },
            { id: 'never', label: "App code sahi maano, gateway se milaan chhodo", score: -2, why: 'Sawaal code ka nahi hai. Webhooks kho jaate hain, gateway timeouts hote hain, fees baad mein lagti hain. Bina reconciliation ke tumhe pata mahino baad chalega — ya kabhi nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Immutable entries + lock + idempotency + reconciliation. Yahi chaar cheezein hain jinke bina money system ek din chup-chaap galat ho jaata hai.',
        ok: '👍 Buniyaad theek hai, par ek jagah tumne distributed system mein ek galat bharosa kar liya.',
        bad: '🤔 Money mein "lagbhag sahi" jaisi koi cheez nahi hoti. Balance derive karo, lock lo, idempotent bano, aur milaate raho.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Ledger',
    instructions: 'Yahan har "shayad" mehenga hai. 🎤',
    questions: [
      {
        q: 'Do requests ek wallet se saath kharch kar rahi hain. Balance ka niyam kaise bachega?',
        choices: [
          'Balance check aur debit ek transaction mein lock ya version ki shart se karo',
          'Har app instance ka apna mutex lo; DB write par koi shart mat lagao',
          'Primary se balance padho; transaction bina thodi der baad debit likh do',
          'Queue mein kram rakho; crash ke baad dobara aaye debit ko naya maan lo',
        ],
        answer: 0,
        explain: 'Do requests ek hi purana balance padh sakti hain. Check aur debit ko row lock, version check ya DB ki shart wale update se ek saath bachao. Queue se bhi kram bana sakte ho, par ek writer ka haq, durable kaam aur retry ki key sambhaalni padegi.',
        choiceExplanations: [
          'Do requests ek hi purana balance padh sakti hain. Check aur debit ko row lock, version check ya DB ki shart wale update se ek saath bachao. Queue se bhi kram bana sakte ho, par ek writer ka haq, durable kaam aur retry ki key sambhaalni padegi.',
          'Ek instance ka mutex doosre instance ko nahi rokta. DB par bhi saanjha bachav chahiye.',
          'Primary se padhne ke baad doosri request balance badal sakti hai. Check aur debit saath bachao.',
          'Queue ka kram duplicate retry nahi rokta. Crash ke baad ek debit dobara lag sakta hai.',
        ],
      },
      {
        q: '"Ek event double process ho gaya aur user ko do baar credit mil gaya. Ab?"',
        choices: [
          'Galat credit ki reversal entry banao, duplicate roko aur records milaao',
          'Galat credit ki purani entry delete karo, naya balance dobara nikaalo',
          'Wallet ka balance seedha ghata do, purani entries ko jaisa hai rakho',
          'Purani credit entry ki rakam badlo, correction ka alag record mat rakho',
        ],
        answer: 0,
        explain: 'Purani entry bachaao. Correction ki manzoori lekar original payment se judi reversal entry banao. Phir duplicate ka karan, idempotency key aur reconciliation jaancho. Sirf balance milne se payment ka itihaas sahi nahi ho jaata.',
        choiceExplanations: [
          'Purani entry bachaao. Correction ki manzoori lekar original payment se judi reversal entry banao. Phir duplicate ka karan, idempotency key aur reconciliation jaancho. Sirf balance milne se payment ka itihaas sahi nahi ho jaata.',
          'Delete karne se asli galti ka record mit jaata hai. Reversal se galti aur sudhaar dono dikhte hain.',
          'Balance badal diya par entries nahi badli, toh entries ka sum aur balance alag ho sakte hain.',
          'Purani rakam badalne se asli ghatna chhipti hai. Correction ka juda hua record chahiye.',
        ],
      },
    ],
  },
  success: [
    'Balance ko entries se derive kar sakte ho',
    'Double-entry ka zero-sum invariant check kar sakte ho',
    'Reconciliation ke teen buckets bana sakte ho',
    'Jaante ho ki money mein cache kahan chalta hai aur kahan nahi',
  ],
  homework: `Agar tumhare system mein paisa, points, credits ya quota jaisi koi cheez hai —
    dekho ki balance ek column hai ya entries. Agar column hai, toh balance ka sawaal poochho:
    "kal dopahar balance ki kya value thi, aur kyun?" Agar jawab nahi hai, wahi tumhara agla design hai.`,
  cards: [
    { front: 'Balance kaise rakhein?', back: 'Column mein <b>nahi</b> — <b>immutable entries</b> rakho, balance = SUM(amount). Itihaas, karan aur audit teenon muft milte hain. Materialized balance sirf cache hai.' },
    { front: 'Double-entry ka invariant?', back: 'Har transaction ki <b>do</b> entries; poore system ka <code>SUM(amount) = 0</code>. Ek query jo batati hai ki kahin paisa bana ya mita toh nahi. Uspar alert lagao.' },
    { front: 'Reconciliation ke teen buckets?', back: '1. Sirf hamare paas · 2. Sirf payment gateway ke paas (webhook chhoota) · 3. Dono par amount alag (fees/rounding). Har bucket ka fix alag hai.' },
    { front: 'Idempotency vs reconciliation?', back: 'Idempotency duplicates <b>rokti</b> hai, reconciliation kho gaye/alag records <b>pakadti</b> hai. Exactly-once mumkin nahi — isliye dono chahiye.' },
    { front: 'Money mein cache kahan NAHI?', back: 'History/dashboard par theek. Par <b>kharch se pehle ka balance check</b> hamesha primary se, transaction ke andar, row lock ke saath — warna overdraft.' },
    { front: 'Paisa kis type mein?', back: '<b>Integer paise/cents</b> ya decimal. Float kabhi nahi — 0.1+0.2≠0.3, aur float ki galti reconciliation mein hi dikhti hai.' },
    { front: 'Galat entry ka fix?', back: 'Nayi <b>reversal entry</b>. Purani entry ko kabhi update/delete mat karo — audit trail jhootha ho jaata hai.' },
  ],
},

/* =====================================================================
   L7 — Anti-patterns: pattern ka naam jaanna ≠ samajhna
   ===================================================================== */
{
  id: 'antipattern',
  icon: '🚫',
  title: 'Pattern Ka Naam Jaanna ≠ Use Samajhna',
  badge: 'Tradeoff Tapasvi',
  objectives: [
    'Har pattern jitne problem hal karta hai, utne <b>banata</b> bhi hai',
    'Kab boring SQL database sabse achha jawab hai',
    'Premature distribution ki asli keemat',
    'Ek achha sawaal jo har technology chunav ko saaf kar deta hai',
  ],
  lesson: [
    `<h3>📖 Ek candidate jo microservices samjha raha tha</h3>
     <p>Ek engineer microservices ke faayde bilkul sahi bata raha tha — independent
     deploys, fault isolation, alag scaling. Sab sahi. Phir engineer ko ek 3-table wala CRUD
     app diya gaya, aur engineer ne app ko <b>15 services</b> mein tod diya.</p>
     <p>Engineer ne pattern <b>yaad</b> kar liya tha. Engineer nahi samajh paaya ki pattern
     kis dard ka ilaaj hai — aur ilaaj ke badle mein kya keemat maangta hai.</p>
     <p class="tip">🎯 Har pattern ek <b>vyapaar</b> hai. Jab tak tum nahi bata
     sakte ki pattern kya <b>bigadta</b> hai, tab tak tumne pattern samjha nahi hai —
     bas pattern ka naam seekha hai.</p>
     <table>
       <tr><th>Pattern</th><th>Kya hal karta hai</th><th>Kya banata hai</th></tr>
       <tr><td>Microservices</td><td>Team independence, alag scaling</td><td>Network har jagah, distributed debugging, data consistency ka jhanjhat</td></tr>
       <tr><td>Event sourcing</td><td>Poora itihaas, time travel, audit</td><td>Har query ke liye projections, schema evolution, "abhi state kya hai" mushkil</td></tr>
       <tr><td>CQRS</td><td>Read aur write alag scale</td><td>Do models, eventual consistency, aur eventual consistency ka UX</td></tr>
       <tr><td>Kafka</td><td>Durable log, replay, decoupling</td><td>Ek aur cluster chalana, partition/ordering ki samajh, ops ka boj</td></tr>
       <tr><td>Cache</td><td>Latency aur DB load</td><td>Invalidation, staleness, stampede, aur ek naya failure mode</td></tr>
       <tr><td>Sharding</td><td>Ek node ki hadd tod do</td><td>Cross-shard queries, rebalancing, hot shards, distributed transactions</td></tr>
     </table>
     <p>Daayen column ko padho. Daayen column ki dikkatein galtiyan nahi hain — dikkatein <b>keemat</b> hai.
     Aur keemat tabhi chukani chahiye jab baayan column ka dard sach mein ho raha ho.</p>`,
    `<h3>🥱 Boring SQL kab jeetta hai</h3>
     <p>Ek Postgres instance aaj ke hardware par:</p>
     <pre>~10,000 simple queries/sec
~5–10 TB tak aaram se
JSONB (document store), full-text search (GIN),
geo (PostGIS), pub/sub (LISTEN/NOTIFY), queues (SKIP LOCKED)</pre>
     <p>Yaani Postgres <b>ek hi box</b> mein document DB, search engine, geo store aur
     queue ka kaam kar deta hai — ek hi transaction, ek hi backup, ek hi cheez jise
     monitor karna hai. Zyadatar products Postgres se kabhi bahar nikalte hi nahi.</p>
     <p>Aur jab tum Postgres ko todte ho, tum sirf technology nahi jodte — tum
     <b>failure modes</b> jodte ho. Do systems ka matlab hai dono systems ke beech consistency,
     dono systems ka sync, dono ka alag-alag down hona, aur ek naya on-call rotation.</p>
     <h3>❓ Ek sawaal jo har chunav saaf kar deta hai</h3>
     <p class="tip">🎯 <b>"Chuna gaya pattern kis cheez ko theek kar raha hai, jo abhi sach mein
     toota hua hai?"</b></p>
     <p>Agar jawab mein "scale par..." ya "aage chal ke..." aata hai, toh abhi
     zaroorat nahi hai. Aaj ka dard chahiye, kal ka anumaan nahi.</p>
     <table>
       <tr><th>Ye sunte ho...</th><th>Toh sawaal poochho</th></tr>
       <tr><td>"Kafka laga dete hain"</td><td>"Roz kitne events hain? Replay chahiye? 1000/din ke liye ek table kaafi hai."</td></tr>
       <tr><td>"Redis cache laga dete hain"</td><td>"Query abhi kitni slow hai? Data kitni baar badalta hai? Ek index se kaam ho jaayega?"</td></tr>
       <tr><td>"Service alag kar dete hain"</td><td>"Alag deploy karna hai, ya alag scale? Ya bas code ganda lag raha hai?"</td></tr>
       <tr><td>"MongoDB behtar hai"</td><td>"Kaunsi query abhi mushkil hai? Schema sach mein badal raha hai ya humne design nahi kiya?"</td></tr>
       <tr><td>"Event sourcing karte hain"</td><td>"Audit chahiye ya time-travel? Sirf audit ke liye ek audit table kaafi hai."</td></tr>
     </table>
     <p>Zaroorat ka sawaal cynical nahi hai. Aadhe waqt jawab "haan, sach mein zaroorat hai"
     hoga — aur tab tum pattern <b>saaf iraade</b> ke saath laga rahe ho, aur pattern ki keemat
     jaante hue.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Zaroorat hai ya over-engineering?',
      instructions: 'Har sthiti dekho aur faisla karo.',
      bins: [
        { id: 'yes', label: '✅ Vaajib' },
        { id: 'no', label: '🚫 Over-engineering' },
      ],
      items: [
        { text: 'Roz 1,000 background jobs — "Kafka laga dete hain"', bin: 'no', explain: '1000/din = 0.01/sec. Ek DB table + <code>SELECT FOR UPDATE SKIP LOCKED</code> itna kaam haste-khelte kar dega, aur usme transactions bhi milte hain. Kafka ek aur cluster hai jise chalana padega.' },
        { text: '5 teams ek hi repo par, deploy ek doosre ko block kar rahe hain', bin: 'yes', explain: 'Yahi <b>asli</b> dard hai jo microservices hal karte hain — technical nahi, organizational. Yahi Conway\'s law ka sahi istemaal hai.' },
        { text: '20 GB data — "sharding kar dete hain"', bin: 'no', explain: '20 GB toh RAM mein aa jaata hai. Sharding cross-shard queries, rebalancing aur distributed transactions leke aati hai — ek aisi problem ke liye jo abhi hai hi nahi.' },
        { text: 'Regulator poora audit trail maangta hai — kisne kya badla, kab', bin: 'yes', explain: 'Yahi event sourcing/append-only ka asli case hai — ya kam se kam ek immutable audit table ka. Yahan requirement bahar se aayi hai, andar se anumaan nahi.' },
        { text: 'Ek query 8 second leti hai — "cache laga dete hain"', bin: 'no', explain: 'Pehle poochho <b>kyun</b> 8 second lag rahe hain. Aksar ek missing index query ko 20ms bana deta hai. Cache slow query ko chhupa deta hai aur saath mein invalidation, staleness aur ek naya failure mode le aata hai.' },
        { text: 'Search par LIKE full scan kar raha hai, 5 crore rows', bin: 'yes', explain: 'Yahan B-tree structurally kaam kar hi nahi sakta. Algorithm ki hadd hai, tuning ki nahi — inverted index chahiye.' },
        { text: 'Ek Postgres, 40% CPU, sab theek — "MongoDB par shift karte hain"', bin: 'no', explain: 'Yahan koi problem statement hai hi nahi. Migration ka risk asli hai, faayda kalpanik. "Behtar hai" ek technology ka gun nahi — kisi zaroorat ke saamne hi behtar hota hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Pattern → chhupi hui keemat',
      pairs: [
        { left: 'Microservices', right: 'Har function call ab ek network call hai — jo fail, dheemi ya duplicate ho sakti hai', explain: 'Monolith mein method call 0.001 ms leti hai aur network ki wajah se kabhi fail nahi hoti. Service call 5 ms leti hai, timeout kar sakti hai, retry ho sakti hai, aur ab service call ke liye circuit breaker chahiye. Ek line ka change ab distributed systems ka problem hai.' },
        { left: 'Event sourcing', right: '"Abhi state kya hai" ke liye projections chahiye — har query ke liye ek', explain: 'Events se current state seedha nahi milti; use replay ya projection se banana padta hai. Aur jab business rule badalta hai toh purane events ka matlab bhi badalta hai — schema evolution yahan sabse mushkil hissa hai.' },
        { left: 'CQRS', right: 'Write ke turant baad read purana data de sakta hai — aur UX ko purana data sambhaalna padta hai', explain: 'User ne save kiya, list refresh ki, purana data dikha. Bug nahi hai, design hai — par user ko dikhana padta hai (optimistic UI, ya "sync ho raha hai" ka signal).' },
        { left: 'Sharding', right: 'Cross-shard query aur transaction — dono lagbhag khatam', explain: 'Jo pehle ek JOIN tha, ab N queries + application mein merge hai. Aur do shards ke beech atomic transaction ke liye 2PC ya saga chahiye. Isiliye shard key soch ke chuno — badalna bahut mehenga padta hai.' },
        { left: 'Cache', right: 'Ek naya failure mode — aur cache "load-bearing" ban jaata hai', explain: '95% hit rate ka matlab hai cache girte hi DB par load 20x. Cache "optional speedup" lagta hai par chupke se aisi cheez ban jaata hai jiske bina system khada hi nahi rehta.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Tradeoffs',
      questions: [
        {
          q: 'Kisi bhi technology chunav se pehle sabse achha sawaal?',
          choices: [
            'Kaunsi zaroorat poori hogi, aur badle mein chalane ka kitna boj badhega?',
            'Kaunsi company tool chalaati hai, bas company ka size apne se milaao',
            'Demo mein kitni latency hai, bas demo ka number target maan lo',
            'Team kya seekhna chahti hai — naya tool seekhna hi production mein laane ki wajah hai',
          ],
          answer: 0,
          explain: 'Pehle zaroorat aur saboot dekho. Aaj ka dard ya bharose layak aane wala load complexity ki keemat sahi thahara sakta hai. Team ki samajh, kharcha aur failure ka risk bhi faisle ka hissa hain.',
          choiceExplanations: [
            'Pehle zaroorat aur saboot dekho. Aaj ka dard ya bharose layak aane wala load complexity ki keemat sahi thahara sakta hai. Team ki samajh, kharcha aur failure ka risk bhi faisle ka hissa hain.',
            'Do companies ka size same ho sakta hai, par queries, niyam aur team alag ho sakte hain.',
            'Demo ka load aur data production se alag ho sakta hai. Apna target load naapna padega.',
            'Seekhne ka maqsad sahi hai. Production mein component ki zaroorat aur zimmedaari bhi honi chahiye.',
          ],
        },
        {
          q: 'Chhote CRUD app ko 15 services mein tod rahe ho. Faisla kaise jaanchoge?',
          choices: [
            'Alag teams ya scaling ka faayda, network aur deploy ke kharche se milaao',
            'Alag deploys gin lo; zyada deploys ko hi release ki tezi ka saboot maano',
            'Files ki ginti dekho; har folder ko alag service ki seema maan lo',
            'Har service ka unit test lo; network failure ki jaanch baad ke liye chhodo',
          ],
          answer: 0,
          explain: '15 services se alag deploy aur scaling mil sakti hai, par chhote CRUD app mein network calls aur monitoring ka boj bhi badhta hai. Ownership aur isolation ki zaroorat ho toh split sahi ho sakta hai; ginti akeli faayda nahi batati.',
          choiceExplanations: [
            '15 services se alag deploy aur scaling mil sakti hai, par chhote CRUD app mein network calls aur monitoring ka boj bhi badhta hai. Ownership aur isolation ki zaroorat ho toh split sahi ho sakta hai; ginti akeli faayda nahi batati.',
            'Shared schema ya saath deploy ki majboori alag deploy ka faayda ghata sakti hai.',
            'Folder code ki jagah batata hai. Service ki seema data, zimmedaari aur deploy se tay karo.',
            'Unit tests network timeout aur aadha poora hua kaam akela nahi jaanchte. Integration aur failure checks chahiye.',
          ],
        },
        {
          q: 'Ek query 8 second le rahi hai. "Redis cache laga dete hain" — kya galat hai?',
          choices: [
            'Pehle query ka plan dekho; cache miss aur taazgi ka raasta bhi tay karo',
            'Pehle cache lagao; hit rate achha ho toh slow query ki jaanch chhod do',
            'Pehle Redis lo; DB write badle toh cache ka niyam baad mein socho',
            'Cache ka size badhao — bada cache miss par bhi 8 s wali query ko tez kar dega',
          ],
          answer: 0,
          explain: '8 second ki wajah plan, index, locks ya bahut saari queries ho sakti hai. Wajah naapo; fix se kitna faayda hoga, load par jaancho. Cache madad kar sakta hai, par miss par wahi mehenga kaam lautega. Taazgi aur cache outage ka plan chahiye.',
          choiceExplanations: [
            '8 second ki wajah plan, index, locks ya bahut saari queries ho sakti hai. Wajah naapo; fix se kitna faayda hoga, load par jaancho. Cache madad kar sakta hai, par miss par wahi mehenga kaam lautega. Taazgi aur cache outage ka plan chahiye.',
            'Achha hit rate slow miss ko nahi mitaata. Cold start ya outage par misses badh sakte hain.',
            'DB badalne par cache kitni der purana rahega, pehle tay karo. Brand chunne se invalidation nahi sulajhta.',
            'Bada cache hit badha sakta hai, par miss par wahi 8 s ki query chalti hai. Query ka plan dekhna padega.',
          ],
        },
      ],
    },
    {
      type: 'incident',
      title: 'Design Review — "Hum Kafka aur microservices use karenge"',
      pager: '📋 Ek junior engineer ne naye internal tool ka design laaya hai. 200 employees use karenge. Tum reviewer ho.',
      start: 'a1',
      nodes: {
        a1: {
          text: 'Design mein 6 microservices, Kafka, Redis, aur Elasticsearch hain. 200 users ke liye. Pehla sawaal?',
          choices: [
            { t: "Har component ka faayda aur chalane ka boj poochho", good: true, next: 'a2', explain: 'Har component ki zaroorat aur chalane ka boj poochhne se review saboot par rehta hai. Chhote user count ke bawajood data ya correctness ki badi zaroorat ho sakti hai.' },
            { t: "Sirf 200 users dekhkar saare components hata do", good: false, explain: 'Nateeja shayad sahi ho par tareeka galat hai. Bina karan poochhe reject karna engineer ko defensive bana deta hai — aur ho sakta hai koi requirement ho jo tumhe pata hi nahi.' },
            { t: "Sirf users gino, data aur queries ki baat chhod do", good: false, explain: '200 users pehle se diye hain. Query rate, data aur har component ka karan bhi jaancho; user count akela design nahi bataata.' },
          ],
        },
        a2: {
          text: 'Jawab: "aage chal ke scale karna pad sakta hai, aur main naye tools seekhna chahta tha." Ab?',
          choices: [
            { t: "Production simple rakho; tools alag prototype mein seekho", good: true, next: 'a3', explain: 'Prototype mein seekhne ka mauka milta hai. Production ki complexity ko asli zaroorat aur team ki zimmedaari se baandho.' },
            { t: "Seekhna bekaar bolo; engineer ko koi raasta mat do", good: false, explain: 'Seekhna achha maqsad hai. Bina prototype ya exercise ka raasta diye sirf mana karna engineer ki zaroorat nahi suljhaata.' },
            { t: "Seekhne ke liye saare tools production mein rehne do", good: false, explain: 'Ab 200 users ka tool 6 services aur teen infra pieces par chal raha hai, jise koi na koi 3 saal tak maintain karega. "Seekhne" ki keemat team chukayegi.' },
          ],
        },
        a3: {
          text: 'Simple version kya hoga?',
          choices: [
            { t: "Ek service, Postgres aur hadd wale background jobs", good: true, next: 'end', explain: 'Di hui zaroorat par ek service aur DB deploy aur recovery ka boj ghata sakte hain. Saaf interfaces baad ka split aasan kar sakte hain; migration ka ek din ka vaada nahi.' },
            { t: "Bina alag ownership ke bhi teen services bana do", good: false, explain: 'Teen services ka number apne aap faayda nahi deta. Seema ko ownership, deploy ya scaling ki zaroorat se jodo.' },
            { t: "Bina replay ki zaroorat ke Kafka cluster chalaao", good: false, explain: 'Kafka is scale par sirf ek aur cluster hai jise chalana, monitor karna aur upgrade karna padega. 1000 jobs/din ke liye ek table kaafi hai.' },
          ],
        },
        end: {
          end: true,
          text: 'Design ek service + Postgres par aa gaya — aur engineer khush hai.',
          summary: `<b>Seekh:</b> Sabse achha design review <b>dono</b> zaroorton ko maanta hai —
            system ki, aur engineer ki.
            <br><br><b>Sawaal jo sab kholta hai:</b> "Chuna gaya pattern kis cheez ko theek kar raha hai,
            jo <b>abhi</b> sach mein toota hua hai?"
            <br><br>Jawab mein "aage chal ke" ya "seekhna chahta tha" aaye — dono asli wajah hain,
            par production system seekhne ya aage ki taiyari ki jagah nahi. Engineer ko seekhne ka mauka
            <b>aise system mein</b> do jahan nayi technology sach mein chahiye.
            <br><br><b>Aur yaad rakho:</b> "beech ka raasta" (3 services) aksar dono ka bura hissa
            hota hai — distributed complexity, bina alag services ke faayde ke.`,
        },
      },
    },
  ],
  interview: {
    title: 'Interview Round — Tradeoffs',
    instructions: 'Yahan "nahi" bol paana sabse bada signal hai. 🎤',
    questions: [
      {
        q: 'Postgres ya naya distributed store — chunav kaise samjhaaoge?',
        choices: [
          'Queries aur niyam fit hon toh Postgres se shuru; asli load par naapo',
          '10k QPS ka aam number lo; apni queries naapne ka kaam chhod do',
          'Naya distributed store lo; sirf topology se on-call ka boj kam maano',
          'Aage sharding ho sakti hai; bas andeshe par aaj relational DB hata do',
        ],
        answer: 0,
        explain: 'Postgres ki capacity ka ek pakka QPS ya TB number nahi hai. Queries, hardware, durability aur failure ke dauraan apna SLO jaancho. Distributed store tab lo jab zaroorat, team aur maapa hua faayda extra boj ko sahi thaharaaye.',
        choiceExplanations: [
          'Postgres ki capacity ka ek pakka QPS ya TB number nahi hai. Queries, hardware, durability aur failure ke dauraan apna SLO jaancho. Distributed store tab lo jab zaroorat, team aur maapa hua faayda extra boj ko sahi thaharaaye.',
          '10k QPS har query aur machine ka vaada nahi. Contention aur disk ka kharcha bhi badalta hai.',
          'Distributed store mein network aur partial failure ka boj aa sakta hai. On-call ka kharcha alag naapo.',
          'Relational system ko baad mein partition, shard ya migrate kar sakte ho. Aaj ki zaroorat pehle saaf karo.',
        ],
      },
      {
        q: '"Tumne kabhi aisa pattern hataya hai jo pehle add kiya tha?"',
        choices: [
          'Hataaya kharcha, bacha hua faayda aur migration ke baad ke numbers bataao',
          'Sirf chhota diagram dikhaao; latency aur errors ka milaan mat karo',
          'Naye trend ka naam bataao — industry ka trend badalna hataane ka kaafi saboot hai',
          'Sirf component delete karne ka tareeka bataao; rollback plan chhod do',
        ],
        answer: 0,
        explain: 'Ek asli misaal mein bataao: component kya kaam karta tha, zaroorat kaise badli, kya hataaya aur nateeja kaise naapa. Data migration, rollout aur rollback bhi samjhaao. Component hataana bhi failure la sakta hai.',
        choiceExplanations: [
          'Ek asli misaal mein bataao: component kya kaam karta tha, zaroorat kaise badli, kya hataaya aur nateeja kaise naapa. Data migration, rollout aur rollback bhi samjhaao. Component hataana bhi failure la sakta hai.',
          'Kam boxes se design aasan dikh sakta hai. Latency, errors aur kharcha naapkar faayda saabit karo.',
          'Trend badalne se requirement nahi badalti. Tool ka kaam aur boj dekhna padega.',
          'Delete karna akela kaafi nahi. Bacha data aur galti par wapas jaane ka raasta bhi chahiye.',
        ],
      },
    ],
  },
  success: [
    'Har pattern ki chhupi hui keemat bata sakte ho',
    '"Pattern kya theek kar raha hai jo abhi toota hai" poochh sakte ho',
    'Jaante ho ki ek Postgres kitna kar leta hai',
    'Over-engineering ko bina engineer ko kaate rok sakte ho',
  ],
  homework: `Apne system ka koi ek component chuno — cache, queue, ya ek alag service.
    Likho: (1) component kis dard ke liye aaya tha, (2) component laane wala dard aaj bhi hai?,
    (3) component ki keemat kya hai (ops, failure modes, samajhne ka boj).
    Agar (2) ka jawab "nahi" hai — toh ek achha PR component hataane mein chhupa hai.`,
  cards: [
    { front: 'Pattern samajhne ka test?', back: 'Tum bata sako ki pattern kya <b>bigadta</b> hai. Sirf faayde bata paana = naam yaad hai, samajh nahi.' },
    { front: 'Technology chunav se pehle ka sawaal?', back: '<b>"Chuni gayi technology kis cheez ko theek kar rahi hai, jo abhi sach mein toota hua hai?"</b> Jawab mein "aage chal ke" aaye toh abhi zaroorat nahi.' },
    { front: 'Ek Postgres kitna kar leta hai?', back: "Capacity ka koi fixed universal number nahi. Query mix, hardware, durability aur SLO ke saath benchmark karo. Requirements se mel khaayein toh Postgres ke JSONB, full-text, PostGIS aur SKIP LOCKED kaam aate hain." },
    { front: 'Microservices ki asli keemat?', back: 'Har method call ab ek <b>network call</b> hai — fail, dheemi, ya duplicate ho sakti hai. Ek stack trace ab distributed trace hai. Faayda organizational hai, technical nahi.' },
    { front: '8-second query par cache?', back: 'Pehle poochho <b>kyun</b> 8 second. Aksar missing index ya N+1. Cache slow query ko chhupata hai, hataata nahi — aur miss par query ke 8 second sabse bure waqt par wapas aate hain.' },
    { front: 'Sharding se pehle?', back: '20 GB RAM mein aa jaata hai. Sharding cross-shard queries, rebalancing aur hot shards laati hai. Shard key badalna <b>bahut mehenga</b> hai — poora data dobara baantna padta hai.' },
  ],
},

/* =====================================================================
   L8 — Coffee shop: ek roz ki cheez jo asli mein Uber hai
   ===================================================================== */
{
  id: 'coffeeshop',
  icon: '☕',
  title: 'Coffee Shop — Jo Asli Mein Uber Hai',
  badge: 'Abstraction Aacharya',
  objectives: [
    'Ek roz ki cheez mein poora distributed system dekhna',
    'Queue, resource pool, async processing, notification — sab ek dukaan mein',
    'Jaani-pehchani cheez sabse mushkil kyun hoti hai',
    'Jargon hataane par soch saaf ho jaati hai',
  ],
  lesson: [
    `<h3>📖 Sawaal jo aasan lagta hai</h3>
     <p class="tip">☕ <b>"Ek coffee shop ka system design karo. Orders lo, espresso
     machines manage karo, rush hour sambhaalo, aur coffee ready hone par customer
     ko batao."</b></p>
     <p>Senior engineers is sawaal par aksar phisal jaate hain — aur wajah ulti hai
     jo tum socho. Senior engineers isliye nahi phisalte ki sawaal mushkil hai; engineers isliye
     phisalte hain ki sawaal <b>jaana-pehchana</b> hai. Dimaag "arre sawaal toh coffee shop
     hai" bol ke abstraction dhoondna hi band kar deta hai. "Design Uber" sunte hi
     wahi log turant queues aur workers ki baat karne lagte hain.</p>
     <h3>🔄 Ek-ek karke, dono taraf</h3>
     <table>
       <tr><th>Coffee shop mein</th><th>System mein</th></tr>
       <tr><td>Counter par line</td><td><b>Request queue</b> — burst ko sambhaalti hai</td></tr>
       <tr><td>3 espresso machines</td><td><b>Resource pool</b> (worker slots / DB connections)</td></tr>
       <tr><td>Baristas ko order baantna</td><td><b>Load balancing</b></td></tr>
       <tr><td>Order lena ≠ coffee banana</td><td><b>Async processing</b> — accept ab, kaam baad mein</td></tr>
       <tr><td>Token number ka parcha</td><td><b>Job id</b> + status endpoint (202 Accepted)</td></tr>
       <tr><td>"Order 47 ready!"</td><td><b>Notification</b> — push/poll</td></tr>
       <tr><td>Order → banaya ja raha → ready</td><td><b>State machine</b></td></tr>
       <tr><td>Rush hour par extra barista</td><td><b>Auto-scaling</b> (jo der se aata hai)</td></tr>
       <tr><td>Doodh khatam ho gaya</td><td><b>Downstream dependency fail</b> + degrade</td></tr>
       <tr><td>Customer coffee lene aaya hi nahi</td><td><b>Orphan / abandoned job</b> + TTL cleanup</td></tr>
     </table>
     <p>Coffee shop ki tulna mazaak ki tulna nahi hai. Coffee shop bilkul wahi shape hai jo Uber, DoorDash,
     video transcoding, print jobs — har <b>task processing system</b> ka hai.</p>`,
    `<h3>🤔 Aise sawaal jinke jawab dukaan mein saaf dikhte hain</h3>
     <p><b>"Line bahut lambi ho jaaye toh?"</b><br>
     Dukaan do cheezein karti hai: kuch log line dekh ke chale jaate hain
     (<b>load shedding</b>), aur kabhi staff kehta hai "aaj sirf simple coffee"
     (<b>graceful degradation</b>). Aur agar tum honest ho toh entrance par likh doge
     "abhi 20 minute wait" — wait ka notice <b>admission control</b> hai, aur notice customer ke
     liye bhi behtar hai jo intezaar nahi kar sakta.</p>
     <p><b>"Barista ne coffee banayi par customer aaya hi nahi?"</b><br>
     10 minute baad bina li gayi coffee phenk di jaati hai. Coffee hataana <b>TTL + cleanup</b> hai —
     TTL + cleanup ke bina pending jobs ka dher lagta rehta hai.</p>
     <p><b>"Ek order beech mein gir gaya?"</b><br>
     Token slip abhi bhi customer ke paas hai. Customer dobara bolega, aur staff dekhega
     ki order bana ya nahi. Token se jaanchna <b>idempotency</b> hai — token id se coffee dobara nahi
     banayi jaayegi. Bina token ke staff do coffee bana dete.</p>
     <p><b>"Ek customer 30 coffee maang le?"</b><br>
     Bada order poori dukaan ko block kar dega. Ilaaj: bade orders ke liye alag counter —
     alag counter <b>bulkhead</b> hai. (Grocery store ka "10 items or less" lane bilkul yahi hai.)</p>
     <p class="tip">🎯 Coffee shop ka level ek trick sikhata hai jo interview aur asli kaam
     dono mein chalti hai: <b>jab design mein fans jao, use ek insaani cheez
     bana ke socho.</b> Warehouse, restaurant, post office, hospital ka ER —
     sabne apni scaling problems dashak pehle hal kar li hain, aur roz ki jagahon ke hal
     tumhe pehle se pata hain.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Dukaan → System',
      pairs: [
        { left: 'Counter par lambi line', right: 'Request queue + backpressure', explain: 'Queue burst ko sambhaalti hai. Par queue ki bhi ek hadd hai — line footpath tak pahunch gayi toh naye customers ko rokna hi padega. Unbounded queue ka matlab hai memory khatam aur sabko infinite wait.' },
        { left: '3 espresso machines, 8 baristas', right: 'Resource pool ka bottleneck', explain: 'Barista badhane se throughput nahi badhega — machines hi hadd hain. Bilkul waise hi jaise app instances badhane se kuch nahi hota agar DB connection pool 50 par atka hai.' },
        { left: 'Token number ka parcha', right: '202 Accepted + job id + status endpoint', explain: 'Order accept ho gaya, kaam abhi baaki hai. Customer ke paas ek reference hai jisse customer status poochh sakta hai. Async API ka poora contract yahi hai.' },
        { left: '"Aaj sirf simple coffee milegi"', right: 'Graceful degradation', explain: 'Bandh karne se behtar hai kam menu. System mein: recommendations band, personalization band, par checkout chalta rahe.' },
        { left: 'Bade orders ke liye alag counter', right: 'Bulkhead', explain: 'Ek 30-coffee ka order poori line block na kare. Systems mein: bhaari kaam alag pool/queue mein — warna ek slow request type sab kuch le doobti hai.' },
        { left: '10 minute purani coffee phenk di jaati hai', right: 'TTL + orphan cleanup', explain: 'Har system mein aisa kaam hota hai jiska koi intezaar nahi kar raha. Aise kaam ke liye TTL ho, warna pending jobs jama hote rehte hain.' },
        { left: '"Doodh khatam ho gaya"', right: 'Dependency failure + fallback', explain: 'Dukaan band nahi hoti — black coffee milti rehti hai, aur menu par likh diya jaata hai. Fallback + saaf signal.' },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Coffee shop chain',
      instructions: 'Ab jargon ke saath: 500 dukaanein, peak par 200 orders/minute per dukaan.',
      brief: `Ek coffee chain ka ordering system banao. App se order, dukaan mein banta hai,
        ready hone par notification. Peak hour mein ek dukaan par 200 orders/minute
        aate hain, aur kitchen 60/minute hi bana sakti hai.`,
      requirements: ['Order kabhi kho na jaaye', 'Customer ko sahi ETA dikhe', 'Peak par dukaan girni nahi chahiye'],
      pass: 11,
      slots: [
        {
          id: 'accept', label: 'Order accept karna', icon: '📝',
          options: [
            { id: 'async', label: "Order pakka save karo; ID aur status do", score: 3, why: 'Accept karna udaharan mein 10 ms, banana 4 minute. Order pakka save karke ID do; customer status jaan sakta hai. Acceptance time load par naapo.' },
            { id: 'sync', label: "Coffee banne tak HTTP request khuli rakho", score: -3, why: '4 minute ki request network ya gateway timeout se toot sakti hai. Retry par duplicate order rokna padega. Acceptance aur preparation alag rakho.' },
            { id: 'fire', label: "Order le lo; pakki ID aur tracking chhod do", score: -2, why: 'Ab customer ke paas poochhne ka koi tareeka nahi ("mera order kahan hai?"), aur tumhare paas idempotency ka koi anchor nahi. Job id async ka minimum hai.' },
          ],
        },
        {
          id: 'overload', label: 'Peak: 200 aa rahe, 60 ban rahe', icon: '🌊',
          options: [
            { id: 'admit', label: "Naye orders ki hadd rakho; sahi ETA dikhaao", score: 3, why: 'ETA dekhkar customer wait ka faisla kar sakta hai. Queue ki hadd capacity aur deadline se baandho; kitne customers lautenge, naapna padega.' },
            { id: 'queue', label: "200/min lete raho; queue ki hadd mat rakho", score: -2, why: '200/min aate rahein aur 60/min banein toh backlog 140/min badhega. Peak ki lambai bina ek ghante ka wait nahi nikaal sakte. Unlimited queue wait ka vaada tod sakti hai.' },
            { id: 'reject', label: "Zyada orders par sirf error do; wait mat bataao", score: 0, why: 'Reject karna overload rok sakta hai, par sirf error customer ko wait nahi batata. Retry-After aur client backoff do; retries mein jitter bhi chahiye.' },
          ],
        },
        {
          id: 'notify', label: 'Coffee ready — customer ko batana', icon: '🔔',
          options: [
            { id: 'push', label: "Status endpoint rakho; ready hone par push bhi", score: 2, why: 'Push chhoot sakta hai ya permission band ho sakti hai. Status endpoint app dobara khulne par current order state deta hai; push sirf jaldi khabar deta hai.' },
            { id: 'poll', label: "Hadd ke saath baar-baar order status poochho", score: 1, why: 'Simple aur bharosemand — par app band ho toh kuch nahi. Ek dukaan mein 200 customers × 12 polls/min bhi kaafi load hai. Push + poll fallback behtar hai.' },
            { id: 'ws', label: "Har customer ka do-tarfa socket khula rakho", score: -1, why: 'Sirf ready ki khabar ke liye do-tarfa socket ka extra boj ho sakta hai. Background app ki delivery ke liye platform push ya baad ka status fetch phir bhi chahiye.' },
          ],
        },
        {
          id: 'dup', label: 'Network gira, app ne retry kiya', icon: '🔁',
          options: [
            { id: 'idem', label: "Retry par ek order ki wahi intent ID bhejo", score: 3, why: 'Ek order ki key har retry par same rakho. Server key aur order ka asar atomic save kare, aur same request par purana result de.' },
            { id: 'window', label: "Do minute mein same coffee ko duplicate maano", score: -1, why: 'Do dost ek saath ek jaisi coffee order karein — ek reject ho jaayega. Guessing se dedup karna asli orders todta hai.' },
            { id: 'none', label: "Har HTTP attempt ko alag naya order maano", score: -3, why: 'Timeout par pehla order save ho sakta hai. Har retry naya order banaaye toh do coffee aur do charges ban sakte hain.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Tumne dukaan ko system mein badal diya — aur har jawab wahi tha jo ek achhi dukaan pehle se karti hai.',
        ok: '👍 Zyadatar sahi. Ek jagah tum "system" ki tarah soche jahan "dukaan" ki tarah sochna behtar tha.',
        bad: '🤔 Wapas dukaan mein jao: line lambi ho toh dukaan kya karti hai? Coffee ready ho toh kaise batati hai? Wahi jawab system ka bhi hai.',
      },
    },
    {
      type: 'quiz',
      title: 'Abstraction ki samajh',
      questions: [
        {
          q: 'Senior engineers coffee shop wale sawaal par kyun phisalte hain?',
          choices: [
            'Dukaan ka jaana-pehchana naam queue aur limited machines ka pattern chhupa sakta hai',
            'Coffee shop ka naam sunte hi sirf menu ka schema poora system samjha deta hai',
            'Counter ki line dikh rahi ho toh machine ki capacity alag naapna zaroori nahi',
            'Order lene ka counter tez ho toh kitchen ki queue ki hadd baad mein soch sakte hain',
          ],
          answer: 0,
          explain: 'Coffee shop ko sirf menu aur counter samjho toh queue, resource pool aur pending order chhoot sakte hain. Machines aur baristas ko alag resources maano. Jargon hataakar order ka safar dekhne se system ka pattern khulta hai.',
          choiceExplanations: [
            'Coffee shop ko sirf menu aur counter samjho toh queue, resource pool aur pending order chhoot sakte hain. Machines aur baristas ko alag resources maano. Jargon hataakar order ka safar dekhne se system ka pattern khulta hai.',
            'Menu data model ka hissa hai. Orders ki line, capacity aur ready status bhi design karne hain.',
            'Line se bheed dikhti hai. Capacity jaanne ke liye machines ka kaam aur service rate naapo.',
            'Accept karna tez ho sakta hai, banana dheema. Bina hadd queue mein wait badhega.',
          ],
        },
        {
          q: '3 machines poori capacity par hain, 8 baristas hain. Ek barista aur joda. Kya hoga?',
          choices: [
            'Machines hi saturated hain toh extra barista se output ki hadd nahi badhegi',
            'Baristas 8 se 9 hue toh coffee output bhi seedha 12.5% badh jaayega',
            'Ek extra barista se machines ka cycle time bina aur badlaav ghat jaayega',
            'Barista khaali dikha toh bottleneck nahi, machine ki queue dekhna bekaar hai',
          ],
          answer: 0,
          explain: 'Agar teen machines hi lagataar busy bottleneck hain, naya barista machine count ya cycle time nahi badhaata. Output ki hadd same reh sakti hai. Staff ka kaam bottleneck ho toh nateeja alag hoga; utilization aur queue naapo.',
          choiceExplanations: [
            'Agar teen machines hi lagataar busy bottleneck hain, naya barista machine count ya cycle time nahi badhaata. Output ki hadd same reh sakti hai. Staff ka kaam bottleneck ho toh nateeja alag hoga; utilization aur queue naapo.',
            'Output barista count ke anupaat mein tabhi badhega jab staff capacity asli hadd ho.',
            'Extra staff se espresso machine ka cycle apne aap chhota nahi hota. Process mein asli badlaav chahiye.',
            'Khaali barista aur busy machines machine bottleneck ka signal ho sakte hain. Dono stations jaancho.',
          ],
        },
        {
          q: 'Design mein fans jao toh sabse kaam ka trick?',
          choices: [
            'Dukaan jaisi misaal se line, resources aur failure map karo; phir numbers naapo',
            'Jaani-pehchani app ka diagram lo; apne load aur niyam se tulna chhod do',
            'Jitne patterns yaad hain sab diagram mein jodo; har naye box se design sudhrega',
            'Ek dukaan ka queue rule mil gaya toh wahi rule bina test har system par lagaao',
          ],
          answer: 0,
          explain: 'Dukaan, warehouse ya hospital se queue aur limited resources sochna aasan hota hai. Misaal sahi sawaal nikaalti hai. Asli network, retries, load aur deadlines alag ho sakte hain; numbers aur niyam phir bhi jaanchne hain.',
          choiceExplanations: [
            'Dukaan, warehouse ya hospital se queue aur limited resources sochna aasan hota hai. Misaal sahi sawaal nikaalti hai. Asli network, retries, load aur deadlines alag ho sakte hain; numbers aur niyam phir bhi jaanchne hain.',
            'Do apps ke load aur niyam alag ho sakte hain. Copy karne se pehle fit jaancho.',
            'Har box naya boj aur failure jod sakta hai. Har component ki zaroorat honi chahiye.',
            'Misaal samajh deti hai, performance ka saboot nahi. Apne system par test aur measurement chahiye.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Coffee shop',
    instructions: 'Pehla vaakya hi sab bata deta hai. 🎤',
    questions: [
      {
        q: '"Coffee shop ka system design karo." Tumhara pehla vaakya?',
        choices: [
          'Order ka safar aur limited resources saaf karo; phir scope ke hisse design karo',
          'Menu ka DB schema pehle poora karo; orders ka flow baad mein poochho',
          'Machine khareedne ka budget pehle lock karo; peak demand baad mein naapo',
          'Payment aur cancellation ko baad ka feature maano; pehle sirf queue banaao',
        ],
        answer: 0,
        explain: 'Order lena, limited machines par banana aur ready hone ka status dena task processing ka flow hai. Scope, peak aur payment/cancellation ke niyam saaf karo. Phir queue, resources aur async API ka chunav karo; ek pakka pehla vaakya zaroori nahi.',
        choiceExplanations: [
          'Order lena, limited machines par banana aur ready hone ka status dena task processing ka flow hai. Scope, peak aur payment/cancellation ke niyam saaf karo. Phir queue, resources aur async API ka chunav karo; ek pakka pehla vaakya zaroori nahi.',
          'Schema ko customer flow aur queries se jodo. Poora schema pehle lock karna ulta kram hai.',
          'Capacity aur demand jaane bina budget se machine count tay karna andaaza hoga.',
          'Payment aur cancellation accepted order ke niyam hain. Queue akeli sahi business asar nahi bachaati.',
        ],
      },
      {
        q: '"Rush hour: 200 orders/min aa rahe hain, kitchen 60 bana sakti hai. Kya karoge?"',
        choices: [
          'Queue ki hadd aur ETA rakho; capacity ke hisaab se naye orders manzoor karo',
          'Peak mein sab orders lete raho; queue badhe toh bhi acceptance band mat karo',
          'Abhi sab orders le lo; naye staff ke aane tak badhta wait mat dikhaao',
          'Kitchen ko bachane ke liye poore peak par har order band kar do, khaali ho tab bhi',
        ],
        answer: 0,
        explain: '200 orders/min aaye aur 60/min bane toh, bina rok ke, backlog 140 orders/min badhega. Queue ko limit karo, wait ka andaaza dikhaao aur zaroorat par naye orders roko. Peak ke baad arrivals kam hon toh queue drain ho sakti hai; peak ki lambai bhi maayne rakhti hai.',
        choiceExplanations: [
          '200 orders/min aaye aur 60/min bane toh, bina rok ke, backlog 140 orders/min badhega. Queue ko limit karo, wait ka andaaza dikhaao aur zaroorat par naye orders roko. Peak ke baad arrivals kam hon toh queue drain ho sakti hai; peak ki lambai bhi maayne rakhti hai.',
          'Queue capacity nahi badhaati. Peak ke dauraan backlog aur wait badhenge; deadline toot sakti hai.',
          'Extra staff aane tak overload chalta rahega. Abhi admission ki hadd aur sahi ETA chahiye.',
          'Safe capacity ke andar kaam manzoor kar sakte ho. Khaali kitchen par bhi sab reject karna bekaar nuksaan hai.',
        ],
      },
    ],
  },
  success: [
    'Roz ki cheezon mein system patterns dekh sakte ho',
    'Task processing shape ke saare hisse pehchaan sakte ho',
    'Jaante ho ki jaani-pehchani problem abstraction kyun chhupati hai',
    'Fans jaane par insaani analogy se raasta nikaal sakte ho',
  ],
  homework: `Koi ek roz ki jagah chuno — restaurant, hospital ER, ya airport check-in.
    Chuni gayi jagah ke 5 hisse likho aur hisson ke system-naam do. Phir poochho: "jagah ke log overload
    kaise sambhaalte hain?" Overload sambhaalne ka jawab lagbhag hamesha tumhare system par bhi lagta hai.`,
  cards: [
    { front: 'Coffee shop asli mein kya hai?', back: 'Ek <b>task processing system</b> — orders (requests) → limited resources (pool) → completion notification. Wahi shape jo Uber/DoorDash/transcoding ka hai.' },
    { front: 'Senior engineers yahan kyun phisalte hain?', back: 'Jaani-pehchani cheez abstraction <b>chhupa</b> deti hai. Wahi log "Design Uber" par turant queues ki baat karte hain par "coffee shop" par literal jawab dete hain.' },
    { front: '8 baristas, 3 machines — barista badhao?', back: 'Kuch nahi hoga. Bottleneck <b>machines</b> hain. Wahi galti: app instances badhana jab DB pool 50 par atka ho. Pehle bottleneck dhoondo.' },
    { front: 'Token slip = ?', back: '<b>202 Accepted + job id + status endpoint</b>, aur job id <b>idempotency</b> ka anchor bhi hai — dobara maangne par nayi coffee nahi banti.' },
    { front: '"10 items or less" lane = ?', back: '<b>Bulkhead.</b> Bada order poori line block na kare. Systems mein: bhaari kaam alag pool/queue mein.' },
    { front: 'Design mein fans jao toh?', back: 'Use ek <b>insaani cheez</b> bana ke socho — dukaan, warehouse, ER. Dukaan, warehouse, ER ne queueing aur degradation dashakon pehle hal kiya, aur queueing aur degradation ke hal tumhe intuitively pata hain.' },
  ],
},

/* =====================================================================
   L9 — Design review: 10x par kya toota hai
   ===================================================================== */

{
  id: 'review',
  icon: '🔎',
  title: 'Design Review — 10x Par Kya Toota Hai',
  badge: 'Review Rishi',
  objectives: [
    'Ek dohrane laayak dhaancha: FR → NFR → estimate → API → data → components → tradeoffs → failure modes',
    'Functional vs non-functional ka saaf farak',
    '"10x par kya sabse pehle tootega" — ek sawaal jo bottleneck khol deta hai',
    'Har design ka rollback aur migration plan',
  ],
  lesson: [
    `<h3>📖 Ek hi kram, har baar</h3>
     <p>Achhe engineers har design ko naye siray se nahi sochte — engineers ke paas ek
     <b>dhaancha</b> hota hai jo engineers har baar chalate hain. Dhaanche se zaroori cheezein
     chhootni band ho jaati hain jo warna chhootti hain.</p>
     <pre>1. FR         system ko KYA karna hai (zyada se zyada 3–5 line)
2. NFR        kitna, kitni jaldi, kitna bharosemand, kitna paisa
3. Estimate   traffic, data size, growth — mote numbers
4. API        entities → endpoints (zyada se zyada 5 minute)
5. Data model access patterns → schema → indexes
6. Components services, queues, caches, stores
7. Tradeoffs  har bade faisle ka "kyun" aur faisle ki keemat
8. Failure    10x par kya tootega, aur har hop gir jaaye toh kya</pre>
     <p class="tip">🎯 Log kadam 6 se shuru kar dete hain — boxes banane se.
     Aur isiliye boxes se shuru karne walon ka design "sahi" ho ke bhi <b>bina karan</b> ka rehta hai.
     Kadam 2 aur 3 sabse zyada waqt bachaate hain: aksar unhi se pata chalta hai ki
     poora problem hi bahut chhota ya bahut bada hai jitna socha tha.</p>
     <h3>🔀 FR vs NFR</h3>
     <table>
       <tr><th>Functional (KYA)</th><th>Non-functional (KAISA)</th></tr>
       <tr><td>User order de sakta hai</td><td>p99 &lt; 200 ms</td></tr>
       <tr><td>Order status dikhta hai</td><td>99.9% availability</td></tr>
       <tr><td>Refund ho sakta hai</td><td>Order kabhi kho na sake</td></tr>
       <tr><td>Notification jaata hai</td><td>Peak 5,000 rps</td></tr>
     </table>
     <p>NFR hi <b>architecture</b> banate hain. "User order de sakta hai" har design mein
     mumkin hai. "Order kabhi kho na sake, p99 200ms, 5000 rps" — saari teen shartein
     milke tumhare aadhe faisle khud kar deti hain.</p>`,
    `<h3>🔟 "10x par kya sabse pehle tootega?"</h3>
     <p>Traffic badhne ka ek sawaal poore review ka nichod hai. Aur pehle tootne wali cheez ka jawab lagbhag hamesha
     un cheezon mein se ek hota hai jo <b>CPU se bahut pehle</b> khatam ho jaati hain:</p>
     <pre>DB connection pool      ← sabse aam
thread / worker pool
downstream rate limit
ek hot partition ya key
queue ki capacity
file descriptors
ek shared lock</pre>
     <p>Dhyaan do: <b>ek bhi CPU nahi hai.</b> Isiliye "CPU 10%, health green,
     phir bhi timeout" itna aam hai. 10x ka sawaal tumhe pehle tootne wali limit dhoondhne
     par majboor karta hai jo dashboard par nahi dikhti.</p>
     <h3>🔙 Do sawaal jo aksar chhoot jaate hain</h3>
     <p><b>"Migration plan kya hai?"</b> — greenfield design interview mein bhi aksar
     ek purana system hota hai. Migration plan ke bina design ek <b>kalpana</b> hai. Dual-write,
     backfill, verify, cutover — wahi kram jo tumne Data track mein seekha.</p>
     <p><b>"Rollback mein kitna waqt lagega?"</b> — rollback ka waqt ek design ka gun hai, ops ka
     detail nahi. Agar jawab "20 minute" hai toh tumhara har change 20 minute ka
     risk hai. Agar "20 second (flag)" hai toh tum tez chal sakte ho.</p>
     <h3>✅ Review checklist</h3>
     <pre>□ Assumptions likhe hain (guess ko fact ki tarah pesh nahi kiya)
□ NFR mein numbers hain, visheshan nahi ("tez" nahi — "p99 200ms")
□ Hot key / skew socha hai
□ 10x par pehla bottleneck naam se pata hai
□ Har dependency ka timeout + fallback likha hai
□ Migration plan hai
□ Rollback ka waqt pata hai
□ Kya monitor karenge, aur kis par alert</pre>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Design ka kram',
      instructions: 'Ek design ko is kram mein banao.',
      steps: [
        { text: 'Functional requirements — 3 se 5 line', explain: 'Chhota rakho. Agar 15 features likh doge toh 45 minute mein kuch bhi gehra nahi hoga. Scope kaatna khud ek skill hai.' },
        { text: 'Non-functional — scale, latency, availability, consistency, cost', explain: 'Yahi architecture banate hain. Aur inme <b>numbers</b> hone chahiye: "tez" ek requirement nahi hai, "p99 200ms" hai.' },
        { text: 'Estimates — traffic, data size, growth', explain: 'Mote numbers. Aksar yahin pata chalta hai ki data 20 GB hai (yaani sharding ki baat hi bekaar hai) ya 200 TB (yaani sab kuch badal jaata hai).' },
        { text: 'API — entities pehle, phir endpoints', explain: 'Nouns nikaalo (Order, Payment, Restaurant), phir unse resources banao. 5 minute se zyada nahi — API design ek kadam hai, manzil nahi.' },
        { text: 'Data model — access patterns se schema', explain: 'Pehle likho ki kaunsi queries chalengi, phir schema aur indexes. Ulta karoge toh migration likhoge.' },
        { text: 'Components — services, queues, caches, stores', explain: 'Ab boxes bante hain — aur har box ka karan upar wale kadmon mein likha hua hai.' },
        { text: 'Tradeoffs — har bade faisle ka kyun aur faisle ki keemat', explain: 'Yahan tum dikhate ho ki tumne <b>chuna</b> hai, yaad nahi kiya. "Maine X chuna, kyunki Y; X ki keemat Z hai."' },
        { text: 'Failure modes — 10x par kya tootega, har hop girne par kya', explain: 'Sabse zyada nazarandaaz kiya jaane wala kadam, aur asli kaam mein sabse zyada kaam ka. Yahi seniority dikhata hai.' },
      ],
    },
    {
      type: 'terminal',
      title: 'Mission — 10x par kya tootega',
      goal: `Ek chalta hua orders system hai. Aaj ka load theek hai. <b>10x daalo,
             bottleneck dhoondo, aur theek karo</b> — bilkul waise jaise ek asli
             capacity review mein karte hain.`,
      sys: SD.sys.orders(),
      tasks: T_REVIEW,
      success: SD.allTasks(T_REVIEW),
      successText: "500 rps ke normal din aur 5000 rps ke incident ne capacity ki hadd dikhayi. Metrics aur trace ne atkaav pool mein dikhaya. Pool 200 ke baad 5000 rps ka load bina bhare chala. Asli DB par zyada connections ki keemat bhi naapo.",
      solution: [
        "estimate --users 12000000 --rps 500 --bytes 2048",
        "load --rps 500 --duration 8",
        "load --rps 5000 --duration 8",
        "metrics",
        "trace GET /api/v1/orders",
        "sim scale pool 200",
        "load --rps 5000 --duration 8",
      ],
      verify: s => { const m = SD.mission; return s.sys.pool.size === 200 && m.current(s, 'load', r => r.rps === 5000 && !r.saturated); },
      hints: [
        'Pehle `estimate` se aaj ke traffic aur record size ka hisaab nikalo. Phir aaj ka load naapo; badhe load ke liye comparison ka baseline chahiye.',
        '`load --rps 500 --duration <seconds>` ke baad `load --rps <10x-rate> --duration <seconds>`. `metrics` aur `trace GET /api/v1/orders` se pool wait jaancho; `sim scale pool <connections>` ke baad same load dohrao.',
        'Poora raasta — har command alag Enter se chalao:\nestimate --users 12000000 --rps 500 --bytes 2048\nload --rps 500 --duration 8\nload --rps 5000 --duration 8\nmetrics\ntrace GET /api/v1/orders\nsim scale pool 200\nload --rps 5000 --duration 8',
      ],
    },
    {
      type: 'bins',
      title: 'Functional ya Non-functional?',
      instructions: 'Har requirement ko sahi bin mein daalo.',
      bins: [
        { id: 'fr', label: '⚙️ Functional (KYA)' },
        { id: 'nfr', label: '📏 Non-functional (KAISA)' },
      ],
      items: [
        { text: 'User apne pichhle orders dekh sakta hai', bin: 'fr', explain: 'Feature — system kya karta hai. Aisa feature lagbhag har design mein mumkin hai, isliye feature mein architecture ka koi ishara nahi.' },
        { text: 'Order list p99 200 ms se kam mein aaye', bin: 'nfr', explain: 'p99 ka target caching, indexing aur pagination ka faisla khud kar deta hai. NFR hi architecture banate hain.' },
        { text: 'Payment fail hone par order cancel ho jaaye', bin: 'fr', explain: 'Business rule — kya hona chahiye. (Rule ka <b>kaise</b> — saga, compensating transaction — ek design decision hai.)' },
        { text: 'System 99.95% uptime de', bin: 'nfr', explain: 'Saal mein ~4.4 ghante down. Availability ka target redundancy, multi-AZ aur failover ka faisla banata hai — aur teeno paisa maangte hain.' },
        { text: 'Peak par 5,000 orders/second', bin: 'nfr', explain: 'Ek number jo poora capacity plan tay karta hai. "Bahut traffic" se koi design nahi banta; 5,000 rps se banta hai.' },
        { text: 'Refund 7 din ke andar ho sakta hai', bin: 'fr', explain: 'Business rule. (Par dhyaan do — rule se ek NFR bhi nikalta hai: order data kam se kam 7 din turant milna chahiye.)' },
        { text: 'Order kabhi kho na sake — payment ke baad bhi nahi', bin: 'nfr', explain: 'Durability requirement, aur sabse mehenga. Durability se outbox pattern, persistent queues aur replication sab justified ho jaate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Review ki samajh',
      questions: [
        {
          q: '10x load par pehla bottleneck kaise dhoondoge?',
          choices: [
            'Load dheere badhaao; trace aur metrics se pehli saturated limit dhoondo',
            'CPU kam dikhe toh network aur disk ko chhodkar sirf DB pool badhaao',
            'Har baar DB pool pehle badhaao; same fix ko sab workloads par lagaao',
            'Health green ho toh target load aur timeout ko naapne ka kaam chhod do',
          ],
          answer: 0,
          explain: 'CPU, disk, network, memory, pool, hot key ya provider quota — koi bhi pehli hadd ho sakti hai. Baseline lo, load badhaao aur waits/saturation milaao. Fix ke baad wahi load dobara chalaao; pehle se bottleneck mat maan lo.',
          choiceExplanations: [
            'CPU, disk, network, memory, pool, hot key ya provider quota — koi bhi pehli hadd ho sakti hai. Baseline lo, load badhaao aur waits/saturation milaao. Fix ke baad wahi load dobara chalaao; pehle se bottleneck mat maan lo.',
            'Low CPU network ya disk wait ka signal ho sakta hai. Trace bina pool badhaana andaaza hai.',
            'Har workload ki pehli hadd alag ho sakti hai. Pool badhaane se DB par overload bhi badh sakta hai.',
            'Health check poora request path nahi jaanchta ho sakta. Load aur timeout ka saboot phir bhi chahiye.',
          ],
        },
        {
          q: 'Design ka happy path bana liya. Failure ka risk jaanchne ke liye ab kya karoge?',
          choices: [
            'Dependency ko fail karke timeout, retry aur overload ka nateeja jaancho',
            'Diagram mein sab arrows banaao; failure ka proof diagram se poora maano',
            'API ke naam ek jaise rakho; retry ki hadd client par bina niyam chhod do',
            'Data types saaf likho; rollback aur purane data ki jaanch baad mein karo',
          ],
          answer: 0,
          explain: 'Happy path se pata chalta hai ki sab theek ho toh kaam kaise chalega. Dependency timeout, retry ki bheed aur overload par alag checks chahiye. Saaf diagram aur schema madad karte hain, par recovery ka saboot nahi dete.',
          choiceExplanations: [
            'Happy path se pata chalta hai ki sab theek ho toh kaam kaise chalega. Dependency timeout, retry ki bheed aur overload par alag checks chahiye. Saaf diagram aur schema madad karte hain, par recovery ka saboot nahi dete.',
            'Arrows dependencies bataate hain. Timeout aur failure ke dauraan nateeja test se jaancho.',
            'Naam retry storm nahi rokta. Retry budget, backoff aur repeated effects ka bachav tay karo.',
            'Data types se rollout ka poora raasta nahi banta. Purane data aur rollback ki compatibility jaancho.',
          ],
        },
        {
          q: 'NFR ko architecture ka asli driver kyun kehte hain?',
          choices: [
            'Latency, scale aur durability ki maapi shartein design ke tradeoffs tay karti hain',
            'Feature list poori ho toh latency aur availability ko alag naapna zaroori nahi',
            'p99 ka target likh diya toh payment ke business niyam alag rakhna zaroori nahi',
            'Zyada services jod do toh har SLO sudhrega, dependency ka kharcha dekhna nahi',
          ],
          answer: 0,
          explain: 'FR batati hain system kya karega. NFR batati hain kitni jaldi, kitne load par aur kitna bharosemand kaam chahiye. Wahi feature 10 rps aur 5,000 rps par alag design maang sakta hai. Business niyam aur NFR dono chahiye.',
          choiceExplanations: [
            'FR batati hain system kya karega. NFR batati hain kitni jaldi, kitne load par aur kitna bharosemand kaam chahiye. Wahi feature 10 rps aur 5,000 rps par alag design maang sakta hai. Business niyam aur NFR dono chahiye.',
            'Feature chalna quality target poora hona nahi. Tail latency aur availability alag jaancho.',
            'p99 speed ka target hai. Payment do baar na kate, alag correctness ka niyam hai.',
            'Har service network aur failure ka boj jod sakti hai. Component count se SLO saabit nahi hota.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Review',
    instructions: 'Review ke sawaal tumhare kaam karne ka tareeka dikhate hain. 🎤',
    questions: [
      {
        q: '"Ek design review mein tum kya dhoondte ho?"',
        choices: [
          'Numbers, assumptions, failure aur rollout ki jaanch ka saboot dhoondta hoon',
          'Saaf naming aur saaf diagram dekhta hoon — saaf design hi capacity ka saboot hai',
          'Har box mein jaana naam dekhkar queries aur workload ki tulna chhod deta hoon',
          'Demo ki average latency dekhkar p99 aur failure ke checks poore maan leta hoon',
        ],
        answer: 0,
        explain: 'NFR ke numbers, likhe assumptions, bottleneck ka saboot aur har dependency ka timeout/fallback dekho. Migration, rollback aur alerts ka plan bhi jaancho. Har baat check ho sake; sirf design achha lagna kaafi nahi.',
        choiceExplanations: [
          'NFR ke numbers, likhe assumptions, bottleneck ka saboot aur har dependency ka timeout/fallback dekho. Migration, rollback aur alerts ka plan bhi jaancho. Har baat check ho sake; sirf design achha lagna kaafi nahi.',
          'Saaf presentation padhne mein madad karti hai. Capacity aur failure handling ka alag saboot chahiye.',
          'Popular tools ka fit access pattern, niyam aur workload se jaanchna padega.',
          'Average dheemi requests chhipa sakta hai. Tail latency aur load/failure ke nateeje bhi dekho.',
        ],
      },
      {
        q: '"Design achha hai. Naya design production mein kaise le jaoge?"',
        choices: [
          'Compatible badlaav chhote hisson mein chalaao; metrics aur rollback jaancho',
          'Staging pass hui toh seedha sab traffic bhejo; production mein comparison chhodo',
          'Destructive schema change karo; dikkat ho toh flag se har data wapas laao',
          'Blue-green switch karo; business data ka milaan aur stop trigger chhod do',
        ],
        answer: 0,
        explain: 'Purane aur naye code/data ko saath chalne layak rakho. Chhote traffic se error, latency aur business metric milaao. Stop aur rollback trigger pehle tay karo. Flag traffic palat sakta hai; mita data ya bahar ka charge apne aap wapas nahi aata.',
        choiceExplanations: [
          'Purane aur naye code/data ko saath chalne layak rakho. Chhote traffic se error, latency aur business metric milaao. Stop aur rollback trigger pehle tay karo. Flag traffic palat sakta hai; mita data ya bahar ka charge apne aap wapas nahi aata.',
          'Production ka data, load aur dependencies staging se alag ho sakte hain. Gradual rollout ka saboot chahiye.',
          'Flag routing badalta hai. Mita ya incompatible data bachne ke liye migration aur recovery ka plan chahiye.',
          'Blue-green deployment ka tareeka hai. Business outcome aur data ka milaan phir bhi jaancho.',
        ],
      },
    ],
  },
  success: [
    'Ek dohraane laayak design dhaancha chala sakte ho',
    'FR aur NFR alag kar sakte ho, numbers ke saath',
    '10x ka sawaal poochh ke bottleneck naam se nikaal sakte ho',
    'Har design ke saath migration aur rollback ka plan maangte ho',
  ],
  homework: `Apne kaam ka koi ek system lo aur system par review ka dhaancha chalao — 20 minute mein.
    Sabse zaroori: "10x traffic par sabse pehle kya tootega?" Agar jawab nahi pata,
    toh ek load test lagao. Aur likho ki rollback mein kitna waqt lagta hai.`,
  cards: [
    { front: 'Design ka kram?', back: 'FR → NFR → estimates → API → data model → components → tradeoffs → <b>failure modes</b>. Log kadam 6 (boxes) se shuru karte hain — isiliye boxes se shuru karne walon ka design bina karan ka rehta hai.' },
    { front: 'FR vs NFR?', back: '<b>FR</b> = kya karta hai (har design mein mumkin). <b>NFR</b> = kaisa (p99 200ms, 99.9%, 5000 rps, kabhi kho na sake). <b>NFR hi architecture banate hain.</b>' },
    { front: '10x par kya tootega?', back: 'DB connection pool · thread pool · downstream rate limit · hot partition · queue capacity · file descriptors. <b>CPU,IO ya network bhi first bottleneck ho sakte hain</b> — isiliye "CPU 10% par timeout" itna aam hai.' },
    { front: 'Review mein sabse zyada kya skip hota hai?', back: '<b>Failure modes.</b> Happy path banana majedaar hai; "har dependency gir jaaye toh kya" boring. Par production ka 90% waqt wahin jaata hai.' },
    { front: 'Do sawaal jo chhoot jaate hain?', back: '<b>"Migration plan kya hai?"</b> (migration plan ke bina design ek kalpana hai) aur <b>"rollback mein kitna waqt?"</b> (20 min = har change 20 min ka risk; 20 sec = tez chal sakte ho).' },
    { front: 'Production mein kaise le jaayein?', back: 'Flag ke peechhe → <b>shadow traffic</b> se compare → 1%→10%→100% → har step par error rate + ek <b>business metric</b> (silent data bugs error rate par nahi dikhte).' },
  ],
},

/* =====================================================================
   L10 — FINAL BOSS: khaali page se poora design
   ===================================================================== */

{
  id: 'boss-shapes',
  icon: '👑',
  title: 'FINAL BOSS — Khaali Page Se',
  badge: 'Architect Mahaguru',
  objectives: [
    'Ek problem mein saare shapes pehchano',
    'Har shape ka failure mode pehle se naam lo',
    'Design ko chalaake dikhao — anumaan se nahi, maap se',
    'Poore app ka nichod ek jagah',
  ],
  lesson: [
    `<h3>👑 Aakhri imtihaan</h3>
     <p>App tumne parts se shuru kiya tha — ek request ka safar, ek API ka contract,
     ek index, ek timeout. Phir tumne parts ko <b>shapes</b> mein pehchana.
     Ab dono ek saath.</p>
     <p class="tip">🍽️ <b>Problem:</b> Ek food delivery system. Users nearby restaurants
     dekhte hain, order dete hain, order ek pipeline se guzarta hai (accept → cook →
     pickup → deliver), aur order live track hota hai. 8 PM par ek shehar mein
     8,000 requests/second aate hain — aur unmein se aadhe <b>ek hi ilaake</b> se.</p>
     <h3>🧩 Pehle shapes ginno</h3>
     <table>
       <tr><th>Hissa</th><th>Shape</th><th>Failure mode jo pehle se pata hai</th></tr>
       <tr><td>Nearby restaurants</td><td>Geo + read-heavy</td><td>Hot cell (8 PM, ek ilaaka)</td></tr>
       <tr><td>Menu aur listing</td><td>Read-heavy</td><td>Cache stampede, hot key</td></tr>
       <tr><td>Order ka lifecycle</td><td>Workflow orchestration</td><td>Beech mein fail → compensating action</td></tr>
       <tr><td>Payment</td><td>Transactional / ledger</td><td>Double charge, reconciliation</td></tr>
       <tr><td>Live tracking</td><td>Realtime fanout</td><td>Reconnect storm, offline gap</td></tr>
       <tr><td>"Order accept hua" ka SMS</td><td>Notification</td><td>Duplicate, 8 PM ka burst</td></tr>
       <tr><td>Restaurant search</td><td>Search</td><td>Indexing lag</td></tr>
     </table>
     <p>Saat shapes. Aur dhyaan do — tumne kuch <b>naya</b> nahi seekha.
     Har failure mode tumhe pehle se pata hai, aur har ek ka ilaaj bhi.
     Yahi pattern pehchanne ka poora faayda hai.</p>
     <h3>🎯 Ab design chalaake dikhao</h3>
     <p>Neeche ek chalta hua system hai jo abhi <b>naive</b> hai: koi cache nahi,
     koi timeout nahi, pool chhota, aur ek hot cell. Tumhara kaam:
     bottleneck <b>maap ke</b> nikaalo aur ek-ek karke theek karo —
     bilkul waise jaise tumne poore app mein seekha.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'BOSS Mission — 8 PM ka peak',
      goal: "Food-delivery API par 8000 rps ka peak naapo. Alag prayog mein ek cell par 40,000 rps ki padhai copies se baanto. Phir COUNT, cache, timeout, fallback aur pool — har badlaav ka naapa hua asar jaancho.",
      sys: {
        name: 'delivery-api',
        slo: { p99Ms: 300, availability: 99.9 },
        db: {
          bufferPoolMB: 4096,
          tables: {
            orders: {
              rows: 4200000, rowBytes: 200, pk: 'id',
              cols: ['id', 'user_id', 'restaurant_id', 'status', 'total', 'created_at'],
              indexes: [
                { name: 'orders_pkey', cols: ['id'], unique: true },
                { name: 'ix_orders_created', cols: ['created_at'] },
              ],
            },
          },
        },
        pool: { size: 50, acquireTimeoutMs: 10000 },
        app: { instances: 4, cpuMsPerReq: 5 },
        api: { pagination: 'offset', countTotal: true, defaultSort: 'created_at', primaryTable: 'orders' },
        deps: { restaurant_svc: { p50: 12, p99: 30, errorRate: 0 } },
      },
      tasks: T_BOSS_SHAPES,
      success: SD.allTasks(T_BOSS_SHAPES),
      successText: "API ka load aur ek cell ki garam key alag-alag naap hain. countTotal=false, jitter wala cache, single-flight, restaurant ka timeout/fallback aur pool 300 ke baad 8000 rps ka load chala. SLO panel naape gaye load ka budget dikhata hai. Key ki copies cell ko naqshe par todne ka saboot nahi.",
      solution: [
        "estimate --users 8000000 --rps 8000 --bytes 1024",
        "load --rps 8000 --duration 8",
        "trace GET /api/v1/orders",
        "sim set api.countTotal false",
        "cache hotkey --key cell:te7ud9 --rps 40000",
        "cache hotkey --key cell:te7ud9 --rps 40000 --replicas 8",
        "sim add cache --ttl 60 --jitter 20",
        "cache coalesce --misses 5000 --on",
        "sim add timeout restaurant_svc 300",
        "sim add fallback restaurant_svc 'cached restaurant list'",
        "sim scale pool 300",
        "load --rps 8000 --duration 8",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.countTotal === false && s.sys.api.cache?.jitterPct > 0 && s.sys.deps.restaurant_svc?.timeoutMs === 300 && !!s.sys.deps.restaurant_svc.fallback && s.sys.pool.size === 300 && m.current(s, 'load', r => r.rps === 8000 && !r.saturated); },
      hints: [
        'Pehle peak ka `estimate` nikalo, phir naive system par `load` chalao. Har fix ko measured kharch se jodna hai; shuru mein pool badhaana wajah chhupa dega.',
        '`sim set api.countTotal false` count ka kharch hataata hai. `sim add cache --ttl <seconds> --jitter <percent>` ke saath `cache coalesce --misses <count> --on` lagao; service time ghatne par pool badhaakar same peak naapo.',
        'Poora raasta — har command alag Enter se chalao:\nestimate --users 8000000 --rps 8000 --bytes 1024\nload --rps 8000 --duration 8\ntrace GET /api/v1/orders\nsim set api.countTotal false\ncache hotkey --key cell:te7ud9 --rps 40000\ncache hotkey --key cell:te7ud9 --rps 40000 --replicas 8\nsim add cache --ttl 60 --jitter 20\ncache coalesce --misses 5000 --on\nsim add timeout restaurant_svc 300\nsim add fallback restaurant_svc \'cached restaurant list\'\nsim scale pool 300\nload --rps 8000 --duration 8\nslo --availability 99.9',
      ],
    },
    {
      type: 'design',
      title: 'BOSS Canvas — Poora design',
      instructions: 'Ab khaali page se. Har slot ka sahi chunav — aur galton ka why zaroor padho.',
      brief: `<b>Food delivery, ek shehar, 8 PM peak.</b> 8,000 rps, aadha traffic ek ilaake se.
        Order kabhi kho na sake, payment double na ho, aur live tracking chale.
        Food delivery poore app ke saare tracks ek saath maangta hai.`,
      requirements: ['8,000 rps peak', 'p99 &lt; 300ms', 'Order kabhi kho na sake', 'Double charge kabhi nahi'],
      pass: 17,
      slots: [
        {
          id: 'nearby', label: 'Nearby restaurants', icon: '📍',
          options: [
            { id: 'cell', label: "Radius dhakne wale cells, phir asli doori jaancho", score: 3, why: 'Spatial index ya radius dhakne wale cells se candidates lo, phir haversine se asli doori jaancho. B-tree kuch ranges mein madad kar sakta hai; radius ka fit actual plan se jaancho.' },
            { id: 'between', label: "Lat/lng ka bounding box hi final radius maano", score: -3, why: 'Bounding box radius ka mota chhanna hai, final circle nahi. Composite B-tree lamba scan kar sakta hai; later column index mein filter ho sakta hai aur kuch plans skip scan le sakte hain. Pakki 10,000-row hadd nahi.' },
            { id: 'all', label: "Har request par saari locations ki doori nikaalo", score: -1, why: 'Har request par sab restaurants ki doori nikaalna O(n) kaam hai. Chhote data par chal sakta hai; target load aur multi-city data par cost naapo.' },
          ],
        },
        {
          id: 'hotcell', label: '8 PM: aadha traffic ek cell se', icon: '🔥',
          options: [
            { id: 'split', label: "Hot cells chhote karo; reads ki copies baanto", score: 3, why: 'Density aur request skew dekhkar hot cell ko finer cells mein todo, ya read copies/local cache se traffic baanto. Fixed grid kuch workloads par fit ho sakti hai; har jagah galat nahi.' },
            { id: 'more', label: "Key routing wahi rakho; bas naye nodes jodo", score: -2, why: 'Agar cell ki key ek owner par jaati hai, naye nodes bina routing ya replication badle hot key nahi baantte. Asli key mapping jaancho.' },
            { id: 'nothing', label: "Sirf shared cache lagao; hot-cell load mat naapo", score: -3, why: 'Shared cache ki ek hot key ek node ki hadd tak pahunch sakti hai. Cache capacity, read copies aur routing bina unlimited load nahi sambhalta.' },
          ],
        },
        {
          id: 'order', label: 'Order ka lifecycle', icon: '🔄',
          options: [
            { id: 'saga', label: "Durable orchestrator se state aur recovery rakho", score: 3, why: 'Payment, restaurant aur delivery ke beech state aur retry/recovery ka record ek jagah rehta hai. Orchestrator atke order ki jaanch aasan karta hai; idempotency aur compensation ke niyam phir bhi chahiye.' },
            { id: '2pc', label: "Gateway ke support bina 2PC transaction thopo", score: -2, why: '2PC mein har participant ko protocol support karna hota hai. Diya gateway participant nahi hai. Prepared transaction coordinator ki recovery tak resources rok sakti hai.' },
            { id: 'chain', label: "Events se choreography aur compensation chalaao", score: 0, why: 'Observed choreography aur compensation valid ho sakti hai. Kai events aur owners ke flow mein tracing aur recovery ka taal-mel badhta hai; sirf chhe steps hone se design galat nahi.' },
          ],
        },
        {
          id: 'pay', label: 'Payment', icon: '💰',
          options: [
            { id: 'idem', label: "Ledger, stable payment key aur records ka milaan", score: 3, why: 'Stable key aur atomic ledger posting repeat payment ka asar rokne mein madad karte hain. Reconciliation chhoote ya alag records pakadti hai. Broker ka exactly-once vaada external gateway par apne aap nahi lagta.' },
            { id: 'retry', label: "Sirf balance badlo; timeout par naya charge karo", score: -3, why: 'Timeout par naya charge karne se do baar paisa kat sakta hai. Sirf balance badalne se har payment ka itihaas nahi bachta; posting aur retry key chahiye.' },
          ],
        },
        {
          id: 'track', label: 'Live tracking', icon: '🔌',
          options: [
            { id: 'sse', label: "Alag SSE/socket gateways; connections ko naapo", score: 2, why: 'Connections ek alag capacity dimension hain — gateway sirf sockets rakhe, logic peechhe. Pub/sub isliye ki user aur driver do alag gateways par hote hain.' },
            { id: 'poll', label: "Har client se har teen second status mangaao", score: 0, why: '50,000 active orders × 20 polls/min ÷ 60 = lagbhag 16,667 rps, sirf tracking ke liye. Polling valid ho sakti hai; isi load, interval aur capacity par gateway se kharcha milaao.' },
            { id: 'db', label: "Har ping hot SQL path par save aur read karo", score: -3, why: 'Current location ke tez updates ko geo projection mein rakh sakte ho. Har ping SQL mein likhne ka kharcha naapo; required trip history alag durable pipeline mein rakho. Purani location har kaam ke liye bekaar nahi.' },
          ],
        },
        {
          id: 'fail', label: 'Restaurant service dheemi ho gayi', icon: '🛡️',
          options: [
            { id: 'full', label: "Timeout, breaker, safe fallback aur alag pool", score: 3, why: 'Timeout wait baandhta hai, breaker repeated failures par jaldi jawab deta hai, aur alag pool baaki kaam bachaata hai. Safe stale fallback sirf manzoor reads par do; payment ya order success jhooth mat dikhaao.' },
            { id: 'retry', label: "Jawab aane tak bina hadd retries karte raho", score: -3, why: 'Unlimited retries dheemi restaurant service ka load aur badha sakti hain. Retry budget, backoff aur jitter chahiye; waiting requests bhi resources leti hain.' },
            { id: 'to', label: "Sirf wait ki hadd rakho, phir error de do", score: 1, why: 'Timeout zaroori wait ki hadd hai. Kharaab dependency par baar-baar timeout ka kharcha reh sakta hai; breaker aur safe fallback ka fit jaancho.' },
          ],
        },
      ],
      verdicts: {
        great: '👑 <b>Architect Mahaguru.</b> Saat shapes, saat failure modes, aur har ek ka ilaaj — sab pehle se pata tha. Yahi poore app ka nichod hai.',
        ok: '💪 Bahut kuch sahi hai. Jahan galti hui, usi hisse mein ek shape ka failure mode chhoot gaya — chhoote failure mode ka why padho, chhoota hua exact incident kisi na kisi din aata hai.',
        bad: '🤔 Dobara shuru karo: pehle har hisse ka <b>shape</b> likho, phir hisse ka known failure mode. Ilaaj apne aap saamne aa jaayega.',
      },
    },
    {
      type: 'quiz',
      title: 'BOSS — Poore app ka nichod',
      questions: [
        {
          q: 'Naya system design shuru kar rahe ho. Sabse pehle kya saaf karoge?',
          choices: [
            'Scope, user ka safar aur sahi nateeje ke niyam saaf karo; phir shapes pehchaano',
            'Storage brand pehle chuno — brand se hi queries aur consistency ka design nikalta hai',
            'Services ka diagram pehle pakka karo; order aur payment ke niyam baad mein dekho',
            'Peak ka andaaza ek baar lagaao; latency aur success ka target baad mein chhod do',
          ],
          answer: 0,
          explain: 'Pehle samjho kaunsa user kaam poora karega aur kaunse niyam tootne nahi chahiye. Workload ka shape jaane-pehchaane failure ke sawaal deta hai. Queries aur load se components chuno; naam bhar se sahi design nahi banta.',
          choiceExplanations: [
            'Pehle samjho kaunsa user kaam poora karega aur kaunse niyam tootne nahi chahiye. Workload ka shape jaane-pehchaane failure ke sawaal deta hai. Queries aur load se components chuno; naam bhar se sahi design nahi banta.',
            'Storage ka fit queries, durability aur consistency se niklega. Brand pehle lock karna ulta kram hai.',
            'Payment aur order ke niyam service boundaries ko disha dete hain. Diagram ko pehle pakka mat maano.',
            'Scale estimate zaroori hai, par target latency aur success bina designs ki sahi tulna nahi hogi.',
          ],
        },
        {
          q: '"CPU 10%, memory theek, health green — par requests timeout kar rahi hain." Sabse pehle kya dekhoge?',
          choices: [
            'Trace mein waits aur metrics mein pool, network aur doosri limits jaancho',
            'CPU 10% hai toh network sahi maano; sirf app instances badhaao',
            'Health green hai toh DB sahi maano; sirf client timeout lamba karo',
            'Memory theek hai toh resource queue chhodo; sirf CPU profiling karo',
          ],
          answer: 0,
          explain: 'Low CPU, theek memory aur green probe se timeout ka karan pakka nahi hota. Pool acquire, locks, disk, network aur downstream waits trace mein jaancho. Health check dependency ko chhoota bhi hai ya nahi, dekho. Pool wait 96% hai ya kuch aur, actual trace bataayega.',
          choiceExplanations: [
            'Low CPU, theek memory aur green probe se timeout ka karan pakka nahi hota. Pool acquire, locks, disk, network aur downstream waits trace mein jaancho. Health check dependency ko chhoota bhi hai ya nahi, dekho. Pool wait 96% hai ya kuch aur, actual trace bataayega.',
            'Network wait ke dauraan CPU kam ho sakta hai. Low CPU network ke theek hone ka saboot nahi.',
            'Probe poora request path na jaanchta ho sakta hai. Timeout badhaane se bheed aur badh sakti hai.',
            'Pool, lock ya quota ki queue memory theek hone par bhi ban sakti hai. Wait ka saboot pehle lo.',
          ],
        },
        {
          q: 'Ek naya pattern add karne se pehle ka sawaal?',
          choices: [
            'Kaunsa dard ya bharose layak forecast hai, aur pattern ka poora boj kya hai?',
            'Sabse door ka scale socho; likelihood aur aaj ka kharcha naapna chhod do',
            'Badi company ka pattern lo — badi company ka chuna pattern har workload par chalta hai',
            'Team ko naya tool pasand hai; production mein owner aur recovery baad mein dekho',
          ],
          answer: 0,
          explain: 'Pattern ek faayde ke badle naya kharcha laata hai. Asli dard ya saboot wala forecast, team ka kaam aur failure ka risk milaao. Seekhna prototype ki wajah ho sakta hai; production ka boj bhi sahi thaharaao.',
          choiceExplanations: [
            'Pattern ek faayde ke badle naya kharcha laata hai. Asli dard ya saboot wala forecast, team ka kaam aur failure ka risk milaao. Seekhna prototype ki wajah ho sakta hai; production ka boj bhi sahi thaharaao.',
            'Forecast kaam aata hai. Bina likelihood aur target ke maximum scale complexity ko bekaar badha sakta hai.',
            'Doosri company ki queries, team aur guarantees alag ho sakti hain. Apne fit ka saboot chahiye.',
            'Interest seekhne mein madad karta hai. Production mein ownership, failure aur kharche ka plan bhi chahiye.',
          ],
        },
        {
          q: 'Happy-path design taiyaar hai. Failure review mein ab kya jaanchoge?',
          choices: [
            'Dependency failures aur overload par timeout, recovery aur alert jaancho',
            'Sirf component diagram saaf karo; test ke bina arrows ko recovery ka proof maano',
            'Sirf code style par sahmati lo; resource limits ka review baad ke liye chhodo',
            'Sirf database ki popularity dekho; traffic aur data-loss budget ki jaanch chhodo',
          ],
          answer: 0,
          explain: 'Happy path poora ho toh overload aur dependency fail hone ka raasta jaancho. Timeout, retry ki hadd, safe fallback aur recovery ka saboot chahiye. Production ke waqt ka koi pakka hissa failure mein jaata hai, aisa number bina data mat maano.',
          choiceExplanations: [
            'Happy path poora ho toh overload aur dependency fail hone ka raasta jaancho. Timeout, retry ki hadd, safe fallback aur recovery ka saboot chahiye. Production ke waqt ka koi pakka hissa failure mein jaata hai, aisa number bina data mat maano.',
            'Diagram saaf padhne mein madad karta hai. Arrows se failure safety saabit nahi hoti.',
            'Code style capacity aur recovery ki jaanch ki jagah nahi leta.',
            'Popular DB bhi apne workload ki limits aur failure handling maangta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'FINAL Round — Architect',
    instructions: 'Aakhri chaar sawaal. Aakhri sawaal poore app ka saar hain. 🎤👑',
    questions: [
      {
        q: '"Ek line mein — achha system design kya hai?"',
        choices: [
          'Har faisla zaroorat ke saboot se nikle, aur faayde ke saath kharcha saaf ho',
          'Sabse zyada scale ka design chuno, bhale product ko extra capacity na chahiye',
          'Sabse naye tools ka design chuno, bhale team recovery sambhaal na sake',
          'Sabse kam boxes ka design chuno, bhale zaroori safety check chhoot jaaye',
        ],
        answer: 0,
        explain: 'Zaroorat ka saboot bataata hai component kyun chahiye. Likha kharcha bataata hai doosra raasta kyun nahi chuna. Simple design achha default hai; correctness, scale aur recovery ki zaroorat phir bhi poori honi chahiye.',
        choiceExplanations: [
          'Zaroorat ka saboot bataata hai component kyun chahiye. Likha kharcha bataata hai doosra raasta kyun nahi chuna. Simple design achha default hai; correctness, scale aur recovery ki zaroorat phir bhi poori honi chahiye.',
          'Bina zaroorat extra scale ka kharcha aur complexity aa sakti hai.',
          'Naye tool ka naam fit ya recovery ka saboot nahi. Team ka chalane ka boj bhi gino.',
          'Kam boxes ka faayda tab hai jab niyam bachein. Zaroori safety hataana simplicity ka goal nahi.',
        ],
      },
      {
        q: '"Tumhare design ka sabse kamzor hissa kya hai?"',
        choices: [
          'Asli failure, kitne users par asar aur jaldi pakadne ka signal bataao',
          'Sab tests green bol do; kisi khaas failure aur asar ka naam mat lo',
          '"Aur testing chahiye" — itna kehna hi kamzor hissa batane ke liye kaafi hai',
          'Abhi limit ka andaaza chhodo; production outage par bottleneck dhoond lena',
        ],
        answer: 0,
        explain: 'Kamzori ko naam do: kaunsa resource ya dependency, kitne users ka kaam rukega aur alert ka signal kya hoga. Phir load/failure test aur recovery ka plan bataao. Sirf aur tests kehna kamzori ko saaf nahi karta.',
        choiceExplanations: [
          'Kamzori ko naam do: kaunsa resource ya dependency, kitne users ka kaam rukega aur alert ka signal kya hoga. Phir load/failure test aur recovery ka plan bataao. Sirf aur tests kehna kamzori ko saaf nahi karta.',
          'Green tests tested cases ka saboot hain. Untested failure ka mechanism aur asar phir bhi samjhaao.',
          'Test ki hypothesis chahiye: kaunsi limit ya failure, expected nateeja aur signal kya hai?',
          'Load aur failure tests se users ko nuksaan se pehle limits dhoond sakte ho.',
        ],
      },
      {
        q: '"Tumhara design production mein 6 mahine chala. Ab kya dekhoge?"',
        choices: [
          'Traffic, data aur cost ko assumptions se milaao; bekaar components ka review karo',
          'Sirf naye users ki ginti dekho; request ka load aur p99 ko chhod do',
          'Sirf band bugs gino; durability aur monthly kharcha naapna chhod do',
          'Purana design chal gaya toh rakho; badle access patterns ka review chhod do',
        ],
        answer: 0,
        explain: '6 mahine ke data se traffic shape, data growth, latency aur kharche ke assumptions jaancho. Kaunsa component ab bhi kaam ka hai, dekho. Hataane se pehle bacha hua kaam, data migration aur rollback ka plan banao.',
        choiceExplanations: [
          '6 mahine ke data se traffic shape, data growth, latency aur kharche ke assumptions jaancho. Kaunsa component ab bhi kaam ka hai, dekho. Hataane se pehle bacha hua kaam, data migration aur rollback ka plan banao.',
          'Users ki ginti request rate, skew, data retention ya tail latency nahi bataati.',
          'Band bugs ki ginti se bachi correctness, cost aur capacity ka poora pata nahi chalta.',
          'Purana fit badle workload ka proof nahi. Assumptions dobara jaancho.',
        ],
      },
      {
        q: '"Ek junior ko system design sikhana ho toh sabse pehle kya sikhaoge?"',
        choices: [
          'Roz ki misaal se problem, sahi nateeje ka niyam aur tradeoff poochhna sikhaao',
          'Pehle tools ke naam yaad karaao — naam yaad hon toh problem khud samajh aa jaati hai',
          'Pehle CAP ka slogan yaad karaao; partition aur guarantee ka case mat do',
          'Pehle har app ko microservices mein todo; team aur workload baad mein dekho',
        ],
        answer: 0,
        explain: 'Dukaan ya order ki misaal se poochho: kaam kya hai, kya galat nahi hona chahiye, aur overload par kya hoga? Phir pattern ka naam aur kharcha jodo. Vocabulary zaroori hai; misaal aur practice se samajh banti hai.',
        choiceExplanations: [
          'Dukaan ya order ki misaal se poochho: kaam kya hai, kya galat nahi hona chahiye, aur overload par kya hoga? Phir pattern ka naam aur kharcha jodo. Vocabulary zaroori hai; misaal aur practice se samajh banti hai.',
          'Naam bina use-case ke ratta ban sakta hai. Pehle dard aur phir tool ka fit dikhaao.',
          'CAP ke liye network partition aur required guarantee ka context chahiye. Slogan akela design nahi sikhaata.',
          'Service boundaries faayda aur kharcha dono laati hain. Har chhote app ka same default mat banaao.',
        ],
      },
    ],
  },
  success: [
    'Ek problem mein saare shapes pehchaan sakte ho',
    'Har shape ka failure mode pehle se bol sakte ho',
    'Bottleneck maap ke nikaal sakte ho, anumaan se nahi',
    'Har faisle ki keemat bol sakte ho',
    '👑 Tum System Gurukul ke Architect Mahaguru ho',
  ],
  homework: `Aakhri homework, aur sabse asli: apne kaam ka ek system chuno aur uspar
    poora dhaancha chalao — shapes ginno, har ek ka failure mode likho, "10x par kya tootega"
    ka jawab maap ke nikaalo, aur ek cheez dhoondo jo ab <b>hatai</b> ja sakti hai.
    Phir design ka page apni team ko dikhao. Yahi asli design review hai.`,
  cards: [
    { front: 'Design ka pehla kadam?', back: 'Har hisse ka <b>shape</b> likho. Naam ke saath shape ka known failure mode aata hai — aur wahi agla sawaal hai. Scale estimate doosra kadam hai.' },
    { front: 'Food delivery mein kitne shapes?', back: 'Saat — geo, read-heavy, workflow, ledger, realtime fanout, notification, search. Aur har failure mode pehle se pata hai. Yahi patterns ka poora faayda hai.' },
    { front: '"CPU 10% par timeout" — pehla kadam?', back: '<b>Concurrency limits</b> dekho, CPU nahi. Ek <code>trace</code> lo — 96% waqt aksar <code>pool.acquire()</code> mein hota hai. Health green isliye hai ki health check ne DB chhua hi nahi.' },
    { front: 'Naya pattern add karne se pehle?', back: '"Naya pattern kis cheez ko theek kar raha hai, jo <b>abhi</b> toota hua hai?" aur "pattern ki keemat kya hai?" Keemat na bata sako toh samjha nahi — naam seekha hai.' },
    { front: 'Achha system design ek line mein?', back: 'Jismein har faisla ek <b>maapi hui zaroorat</b> se aaya ho, aur har faisle ki <b>keemat likhi</b> ho.' },
    { front: '6 mahine baad kya dekhein?', back: 'Kaunse <b>anumaan galat</b> nikle, aur ab kya <b>hataya</b> ja sakta hai. Jo engineer sirf jodta hai, sirf jodne wale engineer ka system har saal bhaari hota jaata hai.' },
  ],
},
]);

/* =====================================================================
   L7.5 — Technology chooser  (Hello Interview: Key Technologies)
   ===================================================================== */
SD.registerLevelsAfter('shapes', 'antipattern', [
{
  id: 'chooser',
  icon: '🧰',
  title: 'Kaunsa Aujaar Kab — Aur Aujaar Ka Galat Istemaal',
  badge: 'Tool Tapasvi',
  objectives: [
    'Har technology ek <b>kaam</b> ke liye hai, sab kaam ke liye nahi',
    'Har ek ka jaana-pehchana galat istemaal',
    'Interview mein "NoSQL for scale" jaisi baatein kyun kaatti hain',
    'Ek default stack, aur default stack se hatne ke saaf karan',
  ],
  lesson: [
    `<h3>📖 Aujaaron ka naksha</h3>
     <table>
       <tr><th>Aujaar</th><th>Kis kaam ke liye</th><th>❌ Galat istemaal</th></tr>
       <tr><td><b>Postgres / MySQL</b></td><td>Transactions, joins, constraints — <b>default</b></td><td>Ismein 4 GB videos mat rakho; crore rows par analytics mat chalao</td></tr>
       <tr><td><b>Cassandra / Scylla</b></td><td>Bhaari writes, time-series, known access pattern</td><td>Ad-hoc queries mat maango; joins hai hi nahi; partition key baad mein nahi badal sakte</td></tr>
       <tr><td><b>DynamoDB</b></td><td>Predictable key-value at scale, zero ops</td><td>Access pattern <b>pehle</b> socho — warna scans par bill aur latency dono phatenge</td></tr>
       <tr><td><b>Redis</b></td><td>Cache, counters, rate limit, locks, sorted sets, pub/sub</td><td>Source of truth mat banao (memory hai); ek key par crore rps mat daalo</td></tr>
       <tr><td><b>Elasticsearch</b></td><td>Full-text search, facets, fuzzy</td><td>Source of truth mat banao; tezi se badalne wala data (daam) mat rakho</td></tr>
       <tr><td><b>Kafka</b></td><td>Durable log, replay, kai consumers, ordering by key</td><td>Sirf background jobs ke liye mat lagao; sync request path mein mat daalo</td></tr>
       <tr><td><b>SQS / RabbitMQ</b></td><td>Background jobs, retries, DLQ</td><td>Replay mat maango; "kai teams ko wahi data" mat maango</td></tr>
       <tr><td><b>S3 / blob</b></td><td>Bytes — files, media, backups, data lake</td><td>Database mat banao; usme "query" karne ki koshish mat karo</td></tr>
       <tr><td><b>ClickHouse / BigQuery</b></td><td>OLAP — crore rows par aggregate</td><td>Single-row updates mat karo; ClickHouse / BigQuery ko OLTP ki jagah mat use karo</td></tr>
       <tr><td><b>CDN</b></td><td>Static + rarely-changing dynamic, edge par</td><td>Personalized responses bina <code>Vary</code>/cache-key ke mat cache karo</td></tr>
     </table>`,
    `<h3>🎯 Ek default stack — aur default stack se hatne ke karan</h3>
     <p>Zyadatar systems ki shuruaat aisi honi chahiye:</p>
     <pre>Postgres    +    Redis    +    S3    +    ek queue
(sab kuch)    (cache/lock)   (bytes)   (background jobs)</pre>
     <p>Aur default stack ke baad, sirf tab hato jab ek <b>maapa hua</b> karan ho:</p>
     <table>
       <tr><th>Maapi hui dikkat</th><th>Toh aujaar jodo</th></tr>
       <tr><td>Full-text search par LIKE full scan kar raha hai</td><td>Elasticsearch</td></tr>
       <tr><td>Kai teams ko wahi events chahiye, ya replay chahiye</td><td>Kafka</td></tr>
       <tr><td>Analytics queries OLTP DB ka buffer pool dho rahi hain</td><td>Columnar store (ClickHouse/BigQuery)</td></tr>
       <tr><td>Ek table ka write rate ek machine se bahar ja raha hai</td><td>Cassandra / sharding</td></tr>
       <tr><td>Users door hain aur latency physics ki hadd par hai</td><td>CDN / regional deployment</td></tr>
     </table>
     <p class="tip">🎯 Dhyaan do ki har row mein baayen taraf ek <b>maapi hui cheez</b> hai —
     "shayad aage chal ke" nahi. Maapi hui dikkaton ki table ek permission slip hai: jab maapi hui dikkat
     sach mein ho rahi ho, tab naya aujaar lena bilkul sahi hai. Dikkat maapne se pehle naya aujaar
     sirf complexity hai jiska koi kharidaar nahi.</p>
     <h3>🗣️ Interview mein kya nahi bolna</h3>
     <table>
       <tr><th>❌ Khaali daava</th><th>✅ Daave ki jagah</th></tr>
       <tr><td>"Scale ke liye NoSQL chahiye"</td><td>"Is table ka write rate X hai jo ek node se bahar hai, aur access pattern hamesha by user_id — isliye Cassandra"</td></tr>
       <tr><td>"Mere data mein relationships hain isliye SQL"</td><td>"Mujhe multi-row transactions aur ad-hoc joins chahiye — isliye Postgres"</td></tr>
       <tr><td>"Redis laga denge"</td><td>"Cache ki key, data ka structure (sorted set), key ka TTL, aur miss par kya hota hai"</td></tr>
       <tr><td>"Kafka laga denge"</td><td>"Mujhe replay aur teen independent consumers chahiye — warna SQS kaafi thi"</td></tr>
     </table>
     <p>Farak hai ki daayen taraf har jawab mein ek <b>zaroorat</b> hai
     jisse aujaar ka chunav nikla. Baayen taraf sirf aujaar ka naam hai.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Zaroorat → aujaar',
      pairs: [
        { left: '"Order banao aur inventory ghatao — dono ya koi nahi"', right: 'Postgres (multi-row transaction)', explain: 'Atomicity across rows. Yahi relational DB ka sabse mazboot gun hai, aur yahi cheez zyadatar NoSQL mein nahi milti.' },
        { left: '"Aakhri 30 din ke sensor readings, by device"', right: 'Cassandra / time-series DB', explain: 'Bhaari append, kabhi update nahi, aur read hamesha range-scan by (device, time). Partition key saaf hai — Cassandra isi shape ke liye bana hai.' },
        { left: '"Top 100 players ka leaderboard, live"', right: 'Redis sorted set', explain: '<code>ZADD</code>/<code>ZREVRANGE</code> — O(log n) insert aur O(log n + k) top-k. SQL mein yahi kaam <code>ORDER BY score LIMIT 100</code> hai jo har baar chalti hai; Redis mein structure hi ordered rehta hai.' },
        { left: '"Product name aur description mein dhoondo, typo ke saath"', right: 'Elasticsearch', explain: 'Inverted index + analyzers + fuzzy matching. LIKE se fuzzy search ho hi nahi sakta, aur GIN se fuzzy/relevance nahi milta.' },
        { left: '"Order events analytics, ML aur fraud teenon ko chahiye"', right: 'Kafka', explain: 'Ek data, teen <b>independent</b> consumers, har ek ka apna offset. Queue mein events consumers ke beech baant liye jaate.' },
        { left: '"User ke uploaded videos"', right: 'S3 + CDN', explain: 'Bytes object storage mein, metadata DB mein, delivery CDN se. DB mein BLOB rakhna buffer pool aur backups dono kha jaata hai.' },
        { left: '"Pichhle saal ka revenue by region by month"', right: 'ClickHouse / BigQuery', explain: 'Saari rows, thodi columns, aggregate. Row store ko har row ki har column padhni padegi; columnar sirf 3 columns padhega aur 10x compress karega.' },
      ],
    },
    {
      type: 'bins',
      title: 'Statement — sahi ya kaatne laayak?',
      instructions: 'Design review mein tum kya kehte?',
      bins: [
        { id: 'ok', label: '✅ Chalega' },
        { id: 'push', label: '🔍 Isko kaato' },
      ],
      items: [
        { text: '"Scale ke liye NoSQL use karenge"', bin: 'push', explain: 'Postgres bhi bahut achha scale karta hai. Sawaal <b>kya</b> scale nahi kar raha — writes? dataset size? ek hot partition? Har ek ka ilaaj alag hai, aur kuch ka ilaaj NoSQL hai hi nahi.' },
        { text: '"Is table ka write rate 80k/sec hai jo ek node se bahar hai, aur read hamesha (device_id, time) range hai — isliye Cassandra"', bin: 'ok', explain: 'Ismein number hai, access pattern hai, aur chunav us se nikla hai. Yahi ek achhe technology decision ka shape hai.' },
        { text: '"Redis laga denge speed ke liye"', bin: 'push', explain: 'Kaunsi key? Kaunsa data structure? TTL? Miss par kya? Invalidate kaun karega? Aur agar Redis gir jaaye toh DB kitna load lega? "Redis laga denge" abhi ek design nahi hai.' },
        { text: '"Mere data mein relationships hain isliye SQL"', bin: 'push', explain: 'NoSQL mein bhi relationships rakhi ja sakti hain (denormalize karke ya application join se). Asli karan hona chahiye: <b>multi-row transactions</b> aur <b>ad-hoc queries</b> — aisi cheezein relational DB sabse aasani se deta hai.' },
        { text: '"Search ke liye Elasticsearch, par source of truth Postgres rahega aur sync CDC se hoga"', bin: 'ok', explain: 'Aujaar bhi sahi, aur aujaaron ka aapas ka <b>rishta</b> bhi saaf hai — kaun source hai, data kaise pahunchega. Rishte wala hissa hi log bhool jaate hain.' },
        { text: '"Har cheez ke liye microservices, taaki independently scale ho"', bin: 'push', explain: 'Kaun sa hissa alag scale kar raha hai? Aur kya problem <b>scaling</b> ka hai ya <b>team</b> ka? Microservices ka asli faayda organizational hai — aur microservices ki keemat har call ka network call ban jaana hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Chunav ki samajh',
      questions: [
        {
          q: "Naye product ka default stack kaise choose karoge?",
          choices: [
            'Zaroorat aur team dekhkar sabse chhota sambhalne layak stack chuno',
            'DB ke saath Redis aur queue pehle lo, bhale kaam abhi tay na ho',
            'Pehle Kafka aur Cassandra lo, access pattern baad mein tay kar lo',
            'Pehle serverless chuno, state aur quota ki jaanch baad mein kar lo',
          ],
          answer: 0,
          explain: 'Pehle queries, data bachne ka vaada, load aur team dekho. Kam components se zaroorat poori ho toh chalane ka boj kam rehta hai. Cache, queue ya alag store ka apna karan hona chahiye.',
          choiceExplanations: [
            'Pehle queries, data bachne ka vaada, load aur team dekho. Kam components se zaroorat poori ho toh chalane ka boj kam rehta hai. Cache, queue ya alag store ka apna karan hona chahiye.',
            'Cache aur queue naya failure aur monitoring jodte hain. Kaam tay ho tab jodo.',
            'Stream ya wide-column store access pattern se chuno. Pehle tool chunna ulta kram hai.',
            'Serverless mein bhi state, quota, cold start aur kharcha tay karna padta hai.',
          ],
        },
        {
          q: 'Redis mein asal record rakhna hai. Sabse pehle kya jaanchoge?',
          choices: [
            'Persistence, failover aur memory ki hadd apne data-loss budget se milaao',
            'RDB file mil gayi toh har ACK wala write bhi us file mein bacha hua hai',
            'Replica up dikhe toh crash recovery ka test chhodo, replica kaafi hai',
            'Redis naam dekho aur reject karo, persistence ki settings mat jaancho',
          ],
          answer: 0,
          explain: 'Redis RDB/AOF se data save kar sakta hai. Kitne writes crash ya failover par kho sakte hain, config aur recovery test se jaancho. Aam in-memory setup ki memory hadd dekho; tiering wale products alag ho sakte hain. Asal record rakhna requirement aur guarantee ka faisla hai.',
          choiceExplanations: [
            'Redis RDB/AOF se data save kar sakta hai. Kitne writes crash ya failover par kho sakte hain, config aur recovery test se jaancho. Aam in-memory setup ki memory hadd dekho; tiering wale products alag ho sakte hain. Asal record rakhna requirement aur guarantee ka faisla hai.',
            'RDB snapshot ke baad aaye writes file mein na hon. ACK milna snapshot mein save hona nahi.',
            'Replica up hone se har write durable nahi hota. Replication lag aur failover par loss jaancho.',
            'Redis ka naam akela chunav nahi. Required durability aur memory budget se contract milaao.',
          ],
        },
        {
          q: 'Interview mein "Kafka use karunga" bola. Sabse achha follow-up jawab?',
          choices: [
            'Replay, retention aur alag consumers chahiye; simple queue se tulna ki hai',
            'Traffic kaafi zyada hai; bas throughput ka naam Kafka chunne ko kaafi hai',
            'Badi companies Kafka leti hain; bas popularity apna fit saabit karti hai',
            'Durable likha hai; bas durability se queue aur log ka farak mit jaata hai',
          ],
          answer: 0,
          explain: 'Kafka ka karan kaam se jodo: purane events dobara padhna, kitne din rakhna aur har consumer ka apna offset. Sirf jobs baantni hon toh simple queue se kharcha aur recovery milaao. High throughput akela replay ya ordering ki zaroorat nahi batata.',
          choiceExplanations: [
            'Kafka ka karan kaam se jodo: purane events dobara padhna, kitne din rakhna aur har consumer ka apna offset. Sirf jobs baantni hon toh simple queue se kharcha aur recovery milaao. High throughput akela replay ya ordering ki zaroorat nahi batata.',
            'Traffic ki ginti ke saath replay, ordering aur chalane ka boj bhi jaanchna hai.',
            'Popular tool ki doosri company wali zaroorat apne app se alag ho sakti hai.',
            'Queue jobs baant sakti hai; log mein alag consumers apne offsets se padhte hain. Durability akeli farak nahi mitaati.',
          ],
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Stack chuno',
      instructions: 'Ek naya product. Har zaroorat ke liye sahi aujaar chuno.',
      brief: `Ek B2B SaaS analytics product. Users apna data upload karte hain (CSV, tak 2 GB),
        dashboard par aggregates dekhte hain, apne records search karte hain,
        aur team members ko email alerts jaate hain. Abhi 200 customers hain.`,
      requirements: ['200 customers (abhi)', 'Uploads 2 GB tak', 'Dashboard p95 &lt; 2s', 'Ek chhoti team'],
      pass: 11,
      slots: [
        {
          id: 'core', label: 'Core data (users, orgs, settings)', icon: '🗄️',
          options: [
            { id: 'pg', label: "Postgres: transactions aur joins ka core", score: 3, why: 'Transactions, constraints aur joins core data ko fit hain. Chhoti team ek DB se shuru kar sakti hai. 200 ya 10,000 customers akela capacity ka saboot nahi; query load naapo.' },
            { id: 'dynamo', label: "DynamoDB: keys se core data ka model", score: -1, why: 'Managed key-value kaam aa sakta hai, par keys aur indexes pehle sochne padte hain. Badalti ad-hoc queries wale product mein modelling ka boj badh sakta hai; zero-ops guarantee nahi.' },
            { id: 'mongo', label: "MongoDB: documents mein core data rakho", score: 0, why: 'Document model bhi valid ho sakta hai; transactions ki seema jaancho. Sirf flexible schema ki wajah se alag DB laane se pehle Postgres JSONB ka fit dekho.' },
          ],
        },
        {
          id: 'upload', label: '2 GB CSV uploads', icon: '📤',
          options: [
            { id: 's3', label: "Seedha object store upload; baad mein parse", score: 3, why: '2 GB bytes app se nahi guzarte. Parsing ko size aur concurrency ki hadd wale background workers mein karo; upload aur processing status alag dikhaao.' },
            { id: 'proxy', label: "App se upload; request mein hi CSV parse", score: -3, why: 'Upload aur parsing request ko lamba karte hain; network, socket aur CPU ka boj badhta hai. Timeout par duplicate kaam bhi ho sakta hai. Shared API ki capacity jaanchni padegi.' },
          ],
        },
        {
          id: 'analytics', label: 'Dashboard aggregates', icon: '📊',
          options: [
            { id: 'pg2', label: "Pehle Postgres aggregate plan ko naapo", score: 2, why: 'Pehle Postgres aggregate query aur materialized view ko p95 < 2s target par naapo. Fit mile toh alag sync pipeline bachegi. Customer count akela analytics load nahi batata.' },
            { id: 'ch', label: "Abhi alag columnar store sync karke chalaao", score: -1, why: 'Columnar store faayda de sakta hai, par abhi DB ki measured hadd nahi di. Chhoti team ke liye sync aur recovery ka naya boj sahi thaharaana padega.' },
            { id: 'sparkq', label: "Sirf nightly distributed batch se dashboard", score: -2, why: 'Nightly batch se updates agle run tak ruk sakte hain aur cluster ka boj badhega. Dashboard ki taazgi ki shart jaancho; p95 latency aur freshness alag hain.' },
          ],
        },
        {
          id: 'search', label: 'Records mein search', icon: '🔍',
          options: [
            { id: 'gin', label: "Pehle Postgres full-text GIN ko jaancho", score: 2, why: 'Simple full-text search par Postgres GIN ko pehle naapo. DB ke saath search field update ho toh alag async index pipeline nahi chahiye. Snapshot aur read replica ki taazgi phir bhi jaancho.' },
            { id: 'es', label: "Abhi alag search engine aur CDC chalaao", score: -1, why: 'Alag engine ranking aur facets mein faayda de sakta hai. Di hui simple search ke liye cluster, CDC aur lag ka extra boj pehle sahi thaharaao.' },
            { id: 'like', label: "Bina khaas index ke substring LIKE chalaao", score: -2, why: 'Unanchored LIKE bina suitable index zyada data scan kar sakta hai. Shabd search ke liye full-text GIN, substring ke liye trigram jaancho. Har GIN index har LIKE ko tez nahi karta.' },
          ],
        },
        {
          id: 'email', label: 'Email alerts', icon: '📬',
          options: [
            { id: 'queue', label: "Durable queue se email, retries aur DLQ", score: 2, why: 'Kaam lo, karo, retry, DLQ. Yahan replay ya kai consumers ki koi zaroorat nahi — isliye sabse simple aujaar sahi aujaar hai.' },
            { id: 'kafka', label: "Har email ke liye Kafka log chalaao", score: -2, why: 'Ek chhoti team ke liye ek poora cluster, sirf emails bhejne ke liye. Kafka ke teenon gun (replay, kai consumers, ordering) yahan use hi nahi ho rahe.' },
            { id: 'sync', label: "Request poori hone se pehle email bhejo", score: -2, why: 'Provider slow ho toh request bhi rukti hai. Email ko background queue mein bhejo; retry par dobara email jaane ka khatra sambhaalo.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Boring stack, saaf karan. Har aujaar ek asli zaroorat se aaya, "aage chal ke" se nahi.',
        ok: '👍 Zyadatar sahi. Ek-do jagah tum aaj ki keemat ek kal ki problem ke liye chuka rahe ho.',
        bad: '🤔 200 customers hain. Har chunav se pehle poochho: "chuna gaya aujaar kis cheez ko theek kar raha hai, jo ABHI toota hua hai?"',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Technology choice',
    instructions: 'Har naam ke saath ek karan. 🎤',
    questions: [
      {
        q: '"SQL ya NoSQL?"',
        choices: [
          'Queries, transactions, load aur chalane ka boj dekhkar store milaao',
          'Data structured hai toh SQL lo — data ka shape akela store tay kar deta hai',
          'Traffic badhega toh NoSQL lo, hot keys aur partition ki jaanch chhod do',
          'Dono stores saath lo, copies ka sync apne aap sahi chalega maan lo',
        ],
        answer: 0,
        explain: 'SQL ya NoSQL ka naam requirement ka jawab nahi. Kaunsi query, kaunsi atomic shart, kitna load aur kaisa failover chahiye, pehle bataao. Structured data dono mein ho sakta hai. Har product ki transaction aur query seema alag jaancho.',
        choiceExplanations: [
          'SQL ya NoSQL ka naam requirement ka jawab nahi. Kaunsi query, kaunsi atomic shart, kitna load aur kaisa failover chahiye, pehle bataao. Structured data dono mein ho sakta hai. Har product ki transaction aur query seema alag jaancho.',
          'Structured data NoSQL mein bhi aa sakta hai. Transactions aur query ka fit bhi dekho.',
          'NoSQL mein hot partitions aur capacity limits rehti hain. Traffic ki ginti se akela store nahi chunta.',
          'Do copies ke beech lag, missing updates aur recovery ka kaam badhta hai. Sync ka plan chahiye.',
        ],
      },
      {
        q: '"Tumne 5 alag technologies chuni hain. Koi dikkat?"',
        choices: [
          'Har component ka maapa faayda, owner aur recovery ka kaam dikhaao',
          'Managed service ka badge dikhaao; quota aur client recovery ki baat chhodo',
          'Har tool ko apne kaam ka best bolo — best tools milkar sabse mazboot system banate hain',
          'Paanch components ka SLO alag gino; request ki dependencies mat jodo',
        ],
        answer: 0,
        explain: 'Har store naya upgrade, failure aur data milaan ka kaam la sakta hai. Har component ki zaroorat, owner aur recovery samjhaao. Request jin components par tikti hai, poore raaste ki latency aur availability jaancho.',
        choiceExplanations: [
          'Har store naya upgrade, failure aur data milaan ka kaam la sakta hai. Har component ki zaroorat, owner aur recovery samjhaao. Request jin components par tikti hai, poore raaste ki latency aur availability jaancho.',
          'Managed service bhi quota, outage aur client retry ka kaam chhodti hai. Owner phir bhi chahiye.',
          'Alag tools ka faayda integration aur recovery ke kharche se milaao.',
          'Ek request kai components par tike toh end-to-end SLO dependencies se badalta hai.',
        ],
      },
    ],
  },
  success: [
    'Har aam technology ka kaam aur technology ka galat istemaal bata sakte ho',
    'Ek default stack se shuru karke maape hue karan par hat sakte ho',
    '"NoSQL for scale" jaisi baaton ko kaat sakte ho',
    'Har chunav ke saath ek zaroorat bol sakte ho',
  ],
  homework: `Apne system ke saare data stores aur infra pieces list karo.
    Har ek ke saamne likho: (1) kaunsi zaroorat se aaya, (2) aujaar laane ki zaroorat aaj bhi hai?,
    (3) kya aujaar ka kaam kisi doosre maujood system se ho sakta hai?
    Agar do systems ek jaisa kaam kar rahe hain, ek hataane ka case ban gaya.`,
  cards: [
    { front: 'Default stack?', back: '<b>Postgres + Redis + S3 + ek queue.</b> Default stack se hato sirf jab koi <b>maapi hui</b> cheez majboor kare — "aage chal ke" ek karan nahi hai.' },
    { front: 'Redis source of truth?', back: '<b>Nahi.</b> Memory-first — dataset RAM mein aana hi padega, aur crash par aakhri kuch second ke writes ja sakte hain. Cache/counters/locks/sorted sets ke liye bemisaal.' },
    { front: '"Scale ke liye NoSQL" — kya kaato?', back: 'Poochho <b>kya</b> scale nahi kar raha: writes? dataset size? hot partition? Postgres bhi bahut achha scale karta hai. Karan hona chahiye: write rate + access pattern.' },
    { front: 'Kafka vs SQS?', back: 'Kafka tabhi jab <b>replay</b>, <b>kai independent consumers</b>, ya <b>key-wise ordering</b> chahiye. Warna SQS simple aur sasti hai.' },
    { front: 'Elasticsearch kab?', back: 'Jab full-text/fuzzy/facets chahiye <b>aur</b> Postgres GIN dab raha ho. Aur hamesha: source of truth DB, sync CDC se, badalne wala data (daam) index mein nahi.' },
    { front: '5 alag technologies ka nuksaan?', back: 'Har ek = ek aur failure mode + upgrade + on-call + ek aur jagah jahan data alag ho sakta hai. Pehle poochho: <b>kaunsi 2 hataayi ja sakti hain?</b>' },
  ],
},
]);

})();
