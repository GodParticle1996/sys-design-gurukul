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
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash') },
  { text: 'Ab wahi query — 1000 se kam rows examined honi chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined < 1000);
    } },
  { text: 'Ab hot cell: airport par surge — ek cell par 40,000 rps',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us cell ko todo — load bant jaana chahiye',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
];
const T_REVIEW = [
  { text: 'Aaj ke numbers estimate karo',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Aaj ka load chalao (500 rps) — system theek hona chahiye',
    check: s => s.records.some(r => r.kind === 'load' && r.rps <= 1000 && r.saturated === false) },
  { text: 'Ab 10x load daalo — kuch toota hoga',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 5000 && r.saturated === true) },
  { text: 'metrics se dekho ki sabse pehle kya toota',
    check: s => s.records.some(r => r.kind === 'metrics') },
  { text: 'Ek trace lo — waqt kahan ja raha hai',
    check: s => s.records.some(r => r.kind === 'trace') },
  { text: 'Bottleneck theek karo',
    check: s => s.records.some(r => r.kind === 'sim' && (r.op === 'scale' || r.op === 'add')) },
  { text: 'Ab 10x dobara — ab saturated nahi hona chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && (r.op === 'scale' || r.op === 'add'));
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps >= 5000 && r.saturated === false);
    } },
];
const T_BOSS_SHAPES = [
  { text: 'Peak ka andaaza lagao',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Naive design par 8,000 rps chalao — woh girega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 8000 && r.saturated === true) },
  { text: 'trace se dekho ki waqt kahan ja raha hai',
    check: s => s.records.some(r => r.kind === 'trace') },
  { text: 'Sabse bada kharch: har request par COUNT(*) — use band karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /countTotal/.test(r.path) && r.value === false) },
  { text: 'Ab geo ka hot cell pehchano — ek cell par saara load',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us cell ko todo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Read path ko cache do — TTL par jitter ke saath',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache' && r.cfg && r.cfg.jitterPct > 0) },
  { text: 'Ek key ke ek-saath miss ko single-flight se samet lo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'coalesce' && r.on === true && r.dbQueries === 1) },
  { text: 'Downstream par timeout lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'timeout') },
  { text: 'Aur ek fallback — taaki uske girne par bhi jawab mile',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'fallback') },
  { text: 'Ab pool badhao — service time ghatane ke BAAD',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool') },
  { text: 'Ab 8,000 rps dobara — ab system khada rehna chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps >= 8000 && r.saturated === false);
    } },
  { text: 'SLO check karo — error budget bacha hai?',
    check: s => s.records.some(r => r.kind === 'slo') },
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
     load balancer, service, DB, cache, queue. Woh boxes shayad sahi bhi hon, par unke
     peechhe koi soch nahi hoti. Poochho "cache kyun?" toh jawab aata hai "scale ke liye".</p>
     <p>Ek chhota sa kadam sab badal deta hai: <b>boxes banane se pehle problem ka
     naam lo.</b></p>
     <pre>"Yeh ek READ-HEAVY problem hai jisme ek REALTIME FANOUT hissa hai."</pre>
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
    `<h3>🗺️ 12 shapes aur unke jaane-pehchane failure modes</h3>
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
     recommendation (explore). Har hisse ko uske apne shape se design karo —
     ek hi hathoda sab par mat chalao.</p>
     <p class="tip">🎯 Yeh 12 naam yaad karne ki cheez nahi hain. Inka faayda yeh hai ki
     naam ke saath <b>failure mode</b> aata hai. Jaise hi tum bolo "yeh realtime fanout
     hai", agla sawaal khud aa jaata hai: "offline user ka kya hoga?" — aur wahi sawaal
     asli design hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Is problem ka shape kya hai?',
      instructions: 'Har system ko uske MUKHYA shape mein daalo.',
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
        { text: 'Group chat mein message bhejna', bin: 'fan', explain: 'Ek message → N members ko turant. Aur asli sawaal: jo member offline hai uska kya? Yahi is shape ka signature failure mode hai.' },
        { text: 'Application logs ingest karna — 2 TB/din', bin: 'write', explain: 'Bhaari append, kabhi update nahi, aur read pattern "aakhri ek ghanta" hota hai. Kafka + object storage + retention policy.' },
        { text: 'News homepage — sabko lagbhag ek jaisa dikhta hai', bin: 'read', explain: 'Ek hi content laakhon ko. Yahan precompute + CDN itna kaam kar dete hain ki backend lagbhag idle rehta hai.' },
        { text: 'Refund — merchant se paise wapas user ke wallet mein', bin: 'txn', explain: 'Do systems ke beech paisa. Idempotency, ledger entries, aur reconciliation job — teenon zaroori. Yeh workflow bhi hai, par uska DIL transactional hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Shape → uska jaana-pehchana failure mode',
      pairs: [
        { left: 'Search & filtering', right: 'Indexing lag — "maine save kiya, search mein nahi dikh raha"', explain: 'Search index lagbhag hamesha <b>async</b> bharta hai. Yeh bug nahi hai, design hai — par user ko dikhna chahiye ("indexing ho raha hai") warna woh dobara save karega.' },
        { left: 'Geo / spatial', right: 'Hot cell — airport par surge, ek cell mein saare drivers', explain: 'Geo data <b>uniformly</b> nahi bikhra hota. Aadha shehar ek cell mein aa jaata hai. Cell size fixed rakhna hi galti hai — adaptive grid ya cell splitting chahiye.' },
        { left: 'Notification', right: '9:00 AM par 50 lakh notifications ek saath', explain: 'Sabne "subah 9 baje" chuna. Ilaaj: schedule ko jaan-boojh ke <b>stagger</b> karo (±15 min jitter) aur user ke timezone se baandho.' },
        { left: 'File & media', right: 'App server ke through 4 GB video proxy karna', explain: 'Upload app ke through jaane ka matlab hai poore upload ke doraan ek thread + ek connection block. Ilaaj: presigned URL se client seedha object storage par likhe.' },
        { left: 'Distributed coordination', right: 'Split brain — do nodes ek saath "main leader hoon" maante hain', explain: 'Network partition mein purana leader ko pata hi nahi chalta ki uska lease khatam ho gaya. Ilaaj: fencing token — har write ke saath ek badhta hua number, aur storage purana number reject kare.' },
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
            'Naam ke saath uske jaane-pehchane failure modes aate hain — aur wahi agle sawaal ban jaate hain',
            'Interview mein achha lagta hai',
            'Diagram banana aasan ho jaata hai',
            'Team ko samjhaana aasan hota hai',
          ],
          answer: 0,
          explain: 'Naam ek <b>checklist unlock</b> karta hai. "Realtime fanout" bolte hi khud pooch loge: offline user ka kya? connection storm par kya? fanout write par ya read par? Bina naam ke tum wahi 3 boxes banaate ho jo pichhli baar banaye the.',
        },
        {
          q: 'Instagram ka shape kya hai?',
          choices: [
            'Kai shapes ek saath — read-heavy (feed) + media (photos) + realtime fanout (notifications) + recommendation (explore). Har hissa apne shape se design hoga',
            'Read-heavy',
            'Media storage',
            'Social graph',
          ],
          answer: 0,
          explain: 'Yahi woh baat hai jo "pattern rat lena" aur "pattern samajhna" ko alag karti hai. Asli systems mein 2–3 shapes hote hain, aur har hisse ka <b>alag</b> failure mode hota hai. Ek hi hathoda sab par chalane se hi log photos ko DB mein daal dete hain.',
        },
        {
          q: 'Chaar classification sawaalon ke baad, paanchva sawaal jo sabse zyada matter karta hai?',
          choices: [
            '"Yahan galat jawab kitna mehenga hai?" — yeh caching, consistency aur transactions teenon ka jawab de deta hai',
            '"Kitne users honge?"',
            '"Budget kitna hai?"',
            '"Team kitni badi hai?"',
          ],
          answer: 0,
          explain: 'Ek feed mein 30 second purana post dikhna theek hai — isliye wahan aggressive caching aur eventual consistency chalti hai. Ek wallet mein purana balance dikhna theek nahi — isliye wahan cache ek <b>khatra</b> hai. Ek hi sawaal ne dono systems ka poora data layer decide kar diya.',
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — "Design Twitter" ka pehla kadam',
      instructions: 'Boxes se pehle: har hisse ka shape aur uska sabse zaroori decision chuno.',
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
            { id: 'rh', label: 'Read-heavy fanout', score: 3, why: 'Sahi. Ek tweet likha jaata hai, laakhon baar padha jaata hai. Read:write ~1000:1. Isliye poora design read path ke around banega — aur likhne par extra kaam karna manzoor hai.' },
            { id: 'wh', label: 'Write-heavy', score: -2, why: 'Tweets ki sankhya reads ke saamne kuch bhi nahi hai. Is naam se tum galat cheez optimize karoge — ingest pipeline banaoge jabki dard timeline read mein hai.' },
            { id: 'tx', label: 'Transactional', score: -3, why: 'Tweet kho jaana bura hai par vittiya nuksaan nahi. Yahan strong consistency ki keemat chukane ki koi wajah nahi — aur woh keemat latency mein chukani padti.' },
          ],
        },
        {
          id: 'fanout', label: 'Timeline kab banega', icon: '📡',
          options: [
            { id: 'hybrid', label: 'Write par fanout — par celebs ke liye read par', score: 3, why: 'Yahi asli jawab hai. Aam user ke liye write par fanout (200 inboxes likhna sasta hai, aur read turant ho jaata hai). Celeb ke liye woh 5 crore writes ban jaata — isliye celeb tweets read par merge hote hain. Twitter yahi karta hai.' },
            { id: 'write', label: 'Hamesha write par fanout', score: -1, why: 'Aam users ke liye sahi, par ek celeb ka tweet 5 crore inbox writes bana dega — ek tweet se poora cluster ruk jaayega. Yeh "celebrity problem" is shape ka signature failure mode hai.' },
            { id: 'read', label: 'Hamesha read par banao', score: -1, why: 'Har timeline load par 200 logon ki latest tweets fetch aur merge karni padengi — p99 200ms lagbhag namumkin. Read-heavy system mein kaam <b>write</b> par karo, read par nahi.' },
          ],
        },
        {
          id: 'media', label: 'Tweet ke saath images', icon: '🖼️',
          options: [
            { id: 'obj', label: 'Object storage + CDN, DB mein sirf URL', score: 3, why: 'Sahi — yeh ek alag shape (media) hai aur use alag design chahiye. DB mein sirf metadata; bytes S3 par, aur users ke paas CDN se.' },
            { id: 'blob', label: 'DB mein BLOB column', score: -3, why: 'Yeh classic galti hai. Images DB ka buffer pool kha jaayengi (jisse asli queries slow hongi), backup ka size 100x ho jaayega, aur replication lag chad jaayega. DB metadata ke liye hai, bytes ke liye nahi.' },
            { id: 'fs', label: 'App server ki local disk', score: -2, why: 'Instance ephemeral hai — restart par gaya. Aur do instances ka data alag ho jaayega. Yeh sirf single-server duniya mein chalta hai.' },
          ],
        },
        {
          id: 'cost', label: 'Galat jawab ki keemat', icon: '⚖️',
          options: [
            { id: 'eventual', label: 'Timeline 5 second purana ho toh chalega', score: 2, why: 'Sahi soch. Yeh ek line poore data layer ko khol deti hai: aggressive caching, async fanout, read replicas — sab manzoor ho jaate hain kyunki thodi purani timeline se kisi ka nuksaan nahi.' },
            { id: 'strong', label: 'Har follower ko turant, guaranteed', score: -2, why: 'Yeh 5 crore synchronous writes maangta hai. Tumne apne aap par woh shart laga li jiski business ko zaroorat hi nahi thi — aur uski keemat latency aur availability dono mein chukani padti hai.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Tumne boxes banane se pehle <b>shapes</b> pehchaan liye — aur isi wajah se hybrid fanout khud saamne aa gaya, yaad karne ki zaroorat nahi padi.',
        ok: '👍 Theek hai, par ek decision ne tumhe galat direction mein dhakela. Har option ka "why" padho — asli seekh wahi hai.',
        bad: '🤔 Yeh shapes ka sawaal tha, components ka nahi. Dobara socho: kaun sa hissa read-heavy hai, kaun sa media, aur galat jawab kahan mehenga hai.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Pattern pehchaan',
    instructions: 'Pehle 60 second mein pattern bol dena hi aadha jawab hai. 🎤',
    questions: [
      {
        q: '"Design Uber Eats." Tumhara pehla vaakya kya hoga?',
        choices: [
          '"Isme teen shapes hain: geo (nearby restaurants/riders), workflow orchestration (order ka lifecycle), aur realtime fanout (live tracking). Main pehle order workflow se shuru karta hoon."',
          '"Main services, DB aur queue se shuru karta hoon."',
          '"Kitne users honge?"',
          '"Main microservices architecture use karunga."',
        ],
        answer: 0,
        explain: 'Pehla vaakya batata hai ki tum problem ko <b>samajh</b> rahe ho ya template chala rahe ho. Shapes bol dene ke baad har agla decision apne aap justified hai — aur interviewer bhi jaan jaata hai ki kis hisse par gehra jaana hai. (Scale poochhna bhi sahi hai, par woh <b>doosra</b> sawaal hai.)',
      },
      {
        q: '"Yeh problem read-heavy hai — aage kya poochhoge?"',
        choices: [
          '"Source of truth kya hai, kya cache hoga aur kis key par, cache miss par kya hota hai, aur stale data kitna manzoor hai" — read-heavy shape ki apni checklist',
          '"Kaunsa cache use karein — Redis ya Memcached?"',
          '"Kitne read replicas chahiye?"',
          '"CDN laga dete hain"',
        ],
        answer: 0,
        explain: 'Baaki teenon <b>jawab</b> hain bina sawaal ke. Shape ki checklist tumhe sahi kram mein le jaati hai: pehle source of truth, phir kya-kahan cache, phir miss ka rasta, phir staleness ka budget. Tool ka naam (Redis vs Memcached) sabse aakhir mein aata hai aur sabse kam matter karta hai.',
      },
    ],
  },
  success: [
    'Chaar sawaalon se 30 second mein pattern bol sakte ho',
    '12 shapes aur unke failure modes jaante ho',
    'Ek system mein kai shapes pehchaan sakte ho',
    '"Galat jawab kitna mehenga hai" se data layer decide kar sakte ho',
  ],
  homework: `Apne kaam ka system lo aur use tod ke likho: har hissa kaunsa shape hai.
    Phir har shape ke saamne uska jaana-pehchana failure mode likho —
    aur poochho "hum uske liye tayyar hain?"`,
  cards: [
    { front: 'Boxes se pehle kya?', back: 'Problem ka <b>naam</b>. "Yeh read-heavy hai jisme realtime fanout ka hissa hai." Naam ke saath uske failure modes aate hain — aur wahi agle sawaal hain.' },
    { front: 'Classification ke 4 sawaal?', back: '1. Read ya write zyada? 2. Turant ya thodi der mein? 3. Serve ya process? 4. Ek user ya laakhon tak fanout?' },
    { front: 'Paanchva (sabse zaroori) sawaal?', back: '<b>"Galat jawab kitna mehenga hai?"</b> Feed mein purana post = theek. Wallet mein purana balance = nahi. Ek sawaal ne caching, consistency aur transactions teenon tay kar diye.' },
    { front: 'Ek system = ek shape?', back: 'Nahi — aksar 2–3. Instagram = read-heavy + media + realtime fanout + recommendation. Har hisse ko uske apne shape se design karo.' },
    { front: 'Twitter timeline ka asli jawab?', back: '<b>Hybrid fanout</b> — aam user ke liye write par (200 inboxes sasta), celeb ke liye read par merge (warna 5 crore writes). Yeh "celebrity problem" ka standard hal hai.' },
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
     <p>Yeh 10,000 rows tak theek chalti hai. 50 lakh par yeh <b>full table scan</b> hai —
     aur index laga dene se bhi kuch nahi hota. Kyun? Kyunki B-tree ek <b>sorted</b>
     dhaancha hai. Woh "w se shuru hone wale" jaldi dhoondh sakta hai, par
     "jisme kahin bhi wireless ho" ke liye use har row dekhni hi padegi.
     <code>LIKE 'wireless%'</code> index use karta hai; <code>LIKE '%wireless%'</code>
     nahi kar sakta — aur yeh farak sirf ek <code>%</code> ka hai.</p>
     <h3>🔄 Inverted index — table ko ulta kar do</h3>
     <pre>NORMAL index:   row → uske shabd
   doc 12  →  "wireless bluetooth headphones"
   doc 47  →  "wireless mouse"

INVERTED index: shabd → un rows ki list
   "wireless"   →  [12, 47, 88, 301, ...]
   "bluetooth"  →  [12, 205, ...]
   "headphones" →  [12, 99, ...]</pre>
     <p>Ab "wireless bluetooth" ki search do sorted lists ka <b>intersection</b> hai —
     aur woh microseconds ka kaam hai, chahe crore documents hon.
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
     woh ek <b>bhasha</b> ka faisla hai. Hindi ke liye stemming alag hogi, aur
     "iphone 15" ko "iphone" + "15" mein todna sahi hai ya nahi, yeh product decide
     karta hai, database nahi.</p>`,
    `<h3>⏳ Indexing lag — is shape ka signature bug</h3>
     <p>Search index lagbhag hamesha <b>alag</b> system hai (Elasticsearch), aur usme
     data <b>async</b> pahunchta hai:</p>
     <pre>POST /products  →  Postgres (source of truth)  ✅ 200 OK
                        ↓ (event / CDC)
                   Elasticsearch                  ⏳ 2–30 second
GET /search?q=... →  abhi tak nahi mila            😕</pre>
     <p>User ne product save kiya, list mein dikh raha hai, par search mein nahi.
     Woh soch le<b>ga</b> ki save nahi hua — aur dobara save karega. Ab tumhare paas
     duplicate hai.</p>
     <p>Ilaaj bug fix karna nahi hai — yeh design hai. Ilaaj <b>UX</b> hai:</p>
     <table>
       <tr><td>Apna banaya hua item</td><td>Search bypass karke seedha DB se dikhao ("read your own writes")</td></tr>
       <tr><td>Saaf signal</td><td>"Indexing... kuch second mein search mein aayega"</td></tr>
       <tr><td>Monitor</td><td>Indexing lag ek <b>SLI</b> ho — p99 lag par alert</td></tr>
     </table>
     <p class="tip">🎯 Aur sabse zaroori niyam: <b>search index kabhi source of truth
     nahi hota</b>. Woh kisi bhi din poora dobara banaya ja sakta hona chahiye —
     kyunki mapping badalne par, corruption par, ya version upgrade par woh dobara
     banega hi. Agar koi data sirf Elasticsearch mein hai, toh woh data ek din
     chala jaayega.</p>
     <h3>🎯 Relevance — engineering nahi, product</h3>
     <p>"Sahi natija" ka jawab database ke paas nahi hai. Ranking signals mila ke bante hain:</p>
     <pre>score = text_match × w1        (shabd kitne mile — BM25)
      + popularity × w2        (kitne log kharidte hain)
      + recency   × w3         (naya maal upar)
      + personalization × w4   (isne pehle kya dekha)
      + business  × w5         (stock hai? margin?)</pre>
     <p>Weights product/data science tay karte hain, aur woh <b>A/B test</b> se badalte
     hain. Isliye search ka sabse zaroori infra CTR logging hai — bina click data ke
     relevance sudhaari hi nahi ja sakti.</p>`,
  ],
  stages: [
    {
      type: 'quiz',
      title: 'Search ki buniyaad',
      questions: [
        {
          q: "LIKE '%wireless%' par index kaam kyun nahi karta?",
          choices: [
            'B-tree sorted hai — woh "shuru mein kya hai" se dhoondta hai. Beech mein match ke liye har row dekhni hi padegi',
            'LIKE hamesha slow hota hai',
            'Text columns par index nahi banta',
            'Index bana hi nahi tha',
          ],
          answer: 0,
          explain: "Yahi wajah hai ki <code>LIKE 'wireless%'</code> (aage wildcard) index use karta hai par <code>LIKE '%wireless%'</code> nahi. Sorted dhaanche mein tum shuruaat se navigate karte ho — jab shuruaat hi unknown ho, toh navigate karne ko kuch bacha hi nahi. Isi ek <code>%</code> ke liye inverted index ka poora alag system chahiye.",
        },
        {
          q: 'User ne product save kiya, list mein dikh raha hai, search mein nahi. Kya karoge?',
          choices: [
            'Yeh expected hai — indexing async hai. Apne khud ke items search bypass karke DB se dikhao, aur UI par "indexing" ka signal do',
            'Indexing ko synchronous kar do',
            'Search index turant refresh karo',
            'Bug file karo',
          ],
          answer: 0,
          explain: 'Sync indexing karne se har write ab Elasticsearch par nirbhar ho jaayegi — ES down hua toh <b>writes</b> band. Tumne ek search problem ko availability problem bana diya. Sahi hal UX mein hai: user ko apna kaam turant dikhe (read-your-own-writes), aur baaki duniya ko kuch second baad.',
        },
        {
          q: 'Search index kabhi source of truth kyun nahi hona chahiye?',
          choices: [
            'Woh kisi bhi din dobara banaya jaayega — mapping change, corruption, ya version upgrade par. Sirf wahan rakha data ek din chala jaayega',
            'Elasticsearch reliable nahi hai',
            'Woh mehenga hai',
            'Usme transactions nahi hain',
          ],
          answer: 0,
          explain: 'Reindexing search ki normal zindagi ka hissa hai — naya analyzer, naya field, naya version. Har reindex ka matlab hai "sab kuch source se dobara bharo". Isliye ES ko hamesha ek <b>derived</b> store maano: woh gir jaaye toh search band ho, <b>data</b> nahi jaana chahiye.',
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
        { text: 'Punctuation aur stopwords hatao', explain: '"the", "a", "is" har document mein hain — woh filter karne mein madad nahi karte, sirf index phulaate hain. (Par "to be or not to be" jaisi phrase search ke liye kabhi-kabhi rakhne padte hain.)' },
        { text: 'Stemming — shabd ko uske mool tak lao', explain: '"headphones" → "headphone", "running" → "run". Isse "headphone" search karne par "headphones" bhi milta hai. Har bhasha ka apna stemmer hota hai.' },
        { text: 'Synonyms lagao', explain: '"earphone" → "headphone", "mobile" → "phone". Yeh poori tarah <b>product</b> ka faisla hai — aur ise galat karne se search "kuch bhi" dikhane lagta hai.' },
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
            { t: 'Indexing lag metric dekho — index kitna peechhe hai', good: true, next: 's2', explain: 'Sahi. Do jagah ka data alag hai, aur unke beech ek async pipeline hai. Pehla sawaal hamesha "pipeline kitni peechhe hai" hona chahiye.' },
            { t: 'Poora index dobara banao', good: false, explain: 'Sale ke beech mein full reindex ghante le sakta hai aur us doraan search aur bhi bura ho jaayega. Pehle maapo ki lag kitna hai — shayad woh khud pakad lega.' },
            { t: 'Search cache clear karo', good: false, explain: 'Agar cache hota toh product page bhi purana dikhata. Yahan farak <b>do systems</b> ke beech hai, cache aur origin ke beech nahi.' },
          ],
        },
        s2: {
          text: 'Indexing lag 47 minute hai (normally 3 second). Queue mein 12 lakh events pade hain. Ab?',
          choices: [
            { t: 'Consumers scale karo, aur UI par search results ke daam ko product page se live fetch karo', good: true, next: 's3', explain: 'Do kadam ek saath: pipeline ka backlog kam karo, aur us beech user ko sahi daam dikhao. Search ka kaam <b>dhoondna</b> hai; daam jaisi badalne wali cheez search index se dikhana hi risk tha.' },
            { t: 'Sirf consumers scale karo aur intezaar karo', good: false, explain: 'Backlog kam ho jaayega, par tab tak users galat daam dekhte rahenge — aur sale ke beech woh seedha revenue aur bharosa ka nuksaan hai.' },
            { t: 'Search band kar do', good: false, explain: 'Sale ke din search band karna backlog se bada nuksaan hai. Degrade karo, bandh mat karo.' },
          ],
        },
        s3: {
          text: 'Backlog saaf ho gaya. Root cause: sale shuru hote hi 12 lakh price updates ek saath aaye. Permanent fix?',
          choices: [
            { t: 'Badalne wale fields (daam, stock) search index se hataao — sirf filter/rank ke liye rakho, dikhaao live source se. Aur bulk updates ko throttle karo', good: true, next: 'end', explain: 'Asli seekh: search index mein woh data mat rakho jo <b>tezi se badalta</b> hai aur jiska galat hona mehenga hai. Daam se filter karna theek hai (thodi galti chalti hai), par daam <b>dikhana</b> live source se hona chahiye. Aur bulk updates ko hamesha throttle karo warna woh realtime updates ko peechhe dhakel dete hain.' },
            { t: 'Hamesha ke liye zyada consumers rakho', good: false, explain: 'Yeh peak ke liye har waqt paisa jalaana hai, aur agli baar 12 lakh ki jagah 50 lakh updates aayenge. Capacity backlog ka jawab hai, <b>design</b> ka nahi.' },
            { t: 'Indexing ko synchronous kar do', good: false, explain: 'Ab har price update Elasticsearch par nirbhar ho gaya — ES slow hua toh <b>catalog writes</b> slow. Tumne search ka problem availability ka problem bana diya.' },
          ],
        },
        end: {
          end: true,
          text: 'Backlog saaf. Daam ab live source se dikh rahe hain.',
          summary: `<b>Seekh:</b> Search index mein woh data mat rakho jo <b>tezi se badalta</b> hai
            aur jiska galat hona mehenga hai.
            <br><br>• Daam se <b>filter</b> karna theek hai (thodi galti chalti hai)
            <br>• Daam <b>dikhana</b> live source se hona chahiye
            <br>• Bulk updates ko throttle karo — warna woh realtime updates ko peechhe dhakel dete hain
            <br>• Indexing lag ek <b>SLI</b> ho, alert ke saath — warna yeh chup-chaap badhta hai`,
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
            { id: 'es', label: 'Alag search engine (Elasticsearch/OpenSearch)', score: 3, why: 'Sahi. Inverted index, analyzers, relevance scoring aur aggregations — yeh sab OLTP DB ka kaam hi nahi hai. Aur search ka load main DB se poori tarah alag ho jaata hai.' },
            { id: 'like', label: "Postgres LIKE '%...%'", score: -3, why: '5 crore rows par har search ek full table scan hai. Aur woh scan buffer pool bhi dho dega, jisse tumhari <b>baaki</b> queries bhi slow ho jaayengi. Yeh sirf prototype tak chalta hai.' },
            { id: 'gin', label: 'Postgres full-text (GIN index)', score: 1, why: 'Vaajib chunav — agar tum already Postgres par ho aur relevance simple hai toh yeh ek poora system bachaa deta hai. Par 5 crore products + custom ranking + facets par yeh dab jaata hai. "Chhote se shuru karo" ka sahi jawab, is scale ka nahi.' },
          ],
        },
        {
          id: 'sync', label: 'Data index tak kaise pahunche', icon: '🔄',
          options: [
            { id: 'cdc', label: 'DB se CDC/outbox → queue → indexer', score: 3, why: 'Sahi. Write path DB par khatam hota hai (source of truth), aur index usse derive hota hai. Agar indexer gir jaaye toh events queue mein bache rehte hain — kuch kho nahi sakta.' },
            { id: 'dual', label: 'App dono jagah likhe (dual write)', score: -2, why: 'Do systems mein ek saath likhne ka koi atomic tareeka nahi hai. DB write chal gaya aur ES write fail ho gaya — ab woh product hamesha ke liye search se gayab hai, aur kisi ko pata bhi nahi chalega.' },
            { id: 'cron', label: 'Har 10 min ek cron full sync', score: -1, why: 'Chalega par bhaari hai: 10 minute ka lag, aur har run poora dataset chhuta hai. Seller ko apna product 10 minute baad dikhna aaj ke standard par kharab UX hai.' },
          ],
        },
        {
          id: 'price', label: 'Daam kahan se dikhega', icon: '💰',
          options: [
            { id: 'live', label: 'Filter search se, DIKHANA live source se', score: 3, why: 'Sahi — aur yeh woh sabak hai jo log incident ke baad seekhte hain. Daam se filter karne mein thodi galti chalti hai; daam <b>dikhane</b> mein nahi. Isliye ranking/filter index se, aur final display ek live batch fetch se.' },
            { id: 'idx', label: 'Search index se hi dikhao', score: -2, why: 'Daam ghante-ghante badalta hai aur index async hai. Sale ke din yeh seedha "galat daam dikha" wala incident ban jaata hai.' },
          ],
        },
        {
          id: 'own', label: 'Seller ko apna naya product', icon: '👤',
          options: [
            { id: 'bypass', label: 'Uske apne products DB se dikhao (search bypass)', score: 2, why: 'Read-your-own-writes. Sasta, aur woh exact confusion khatam kar deta hai jo duplicate submissions banata hai.' },
            { id: 'wait', label: 'Wait karne do, kuch second ki hi baat hai', score: -1, why: '"Kuch second" backlog ke waqt 47 minute ban jaate hain. Aur user tab tak maan lega ki save hi nahi hua — woh dobara submit karega.' },
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
    instructions: 'Yeh shape "async" ke around ghoomta hai. 🎤',
    questions: [
      {
        q: '"Elasticsearch poora chala gaya. Kya hoga?"',
        choices: [
          'Search band, par site chalti rahegi — kyunki ES derived hai, source nahi. Degrade karo: category browse aur direct links kaam karein, aur index source se dobara ban sake',
          'Site down ho jaayegi',
          'Backup se restore karenge',
          'Search DB par fallback karega',
        ],
        answer: 0,
        explain: 'Poora sawaal isi par hai ki tumne ES ko <b>derived</b> maana ya nahi. Agar catalog writes ES par depend karte hain, toh ES ka girna ek company-wide outage hai. Agar nahi, toh yeh ek degraded feature hai. (Aur "DB par fallback" attractive lagta hai par woh girti hui site par full scans chalane jaisa hai — aksar cheezein aur bigadta hai.)',
      },
      {
        q: '"Search results kharab hain. Debug kaise karoge?"',
        choices: [
          'Pehle alag karunga: document index mein hai hi nahi (indexing problem), ya hai par rank neeche hai (relevance problem). Dono ke tools bilkul alag hain',
          'Ranking weights tune karunga',
          'Aur data add karunga',
          'ML model lagaunga',
        ],
        answer: 0,
        explain: 'Yeh <b>pehla</b> kaanta hai aur log ise aksar skip kar dete hain. "Missing" ka matlab hai analyzer/pipeline/mapping dekho. "Neeche rank" ka matlab hai scoring aur signals dekho. Bina alag kiye tum ranking weights tune karte reh jaoge jabki document index mein hai hi nahi.',
      },
    ],
  },
  success: [
    "Bata sakte ho ki LIKE '%x%' par index kyun bekaar hai",
    'Inverted index aur analysis pipeline samjha sakte ho',
    'Indexing lag ko design maan ke uska UX bana sakte ho',
    'Search ko derived store ki tarah treat karte ho',
  ],
  homework: `Apne product mein koi search box dhoondo. Poochho: (1) woh kis par chalta hai,
    (2) data wahan kaise pahunchta hai, (3) indexing lag ka koi metric hai?
    Aur ek test: ek naya item banao aur ginti karo ki search mein aane mein kitne second lage.`,
  cards: [
    { front: "LIKE '%x%' par index kyun nahi chalta?", back: 'B-tree <b>sorted</b> hai — navigate shuruaat se hota hai. Beech ka match unknown shuruaat hai, isliye har row dekhni padti hai. <code>LIKE \'x%\'</code> chalta hai.' },
    { front: 'Inverted index kya hai?', back: 'Table ka ulta: <b>shabd → document ids ki sorted list</b>. Multi-word search = lists ka intersection. Lucene/Elasticsearch/GIN sab yahi hain.' },
    { front: 'Analysis pipeline ke kadam?', back: 'lowercase → tokenize → punctuation/stopwords → stemming → synonyms → postings. <b>Query bhi isi pipeline se</b> guzarni chahiye.' },
    { front: 'Indexing lag ka ilaaj?', back: 'Bug nahi, design hai. Ilaaj UX mein: apne items DB se dikhao (read-your-own-writes) + "indexing" signal + lag par SLI/alert.' },
    { front: 'Search index source of truth?', back: '<b>Kabhi nahi.</b> Woh reindex hoga hi (mapping/version/corruption). Sirf wahan rakha data ek din chala jaayega.' },
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
    'Upload ke baad ka processing pipeline aur uska status',
    'Storage tiering — purana data sasta hona chahiye',
  ],
  lesson: [
    `<h3>📖 Ek 4 GB video, ek app server</h3>
     <p>Sabse seedha design yeh lagta hai:</p>
     <pre>client → POST /upload → app server → S3</pre>
     <p>Aur yeh chhoti files par kaam bhi karta hai. Par ab hisaab lagao: ek 4 GB video
     ek dheeme mobile network se aa rahi hai — 12 minute lagenge. Un 12 minute mein
     us request ne <b>ek thread pakad rakha hai</b>, aur aksar ek DB connection bhi
     (kyunki handler ne pehle hi le liya tha). 50 log ek saath upload kar rahe hain
     toh tumhara poora pool khatam — aur baaki poori API, jiska upload se koi lena-dena
     nahi, timeout karne lagti hai.</p>
     <p>Yaad aaya? Yeh bilkul wahi <b>connection pool exhaustion</b> hai jo tumne
     Resilience track mein dekha tha — CPU 10%, health green, sab timeout.
     Wajah alag hai, shape wahi hai.</p>
     <h3>✅ Presigned URL — bytes ko backend se bahar nikaal do</h3>
     <pre>1. client → POST /uploads          "mujhe ek 4GB mp4 daalna hai"
2. app   → S3 se signed URL banao (5 min valid, size cap, content-type fix)
        → 201 { upload_url, file_id }        ← 40 ms mein khatam
3. client → PUT <upload_url>  (SEEDHA S3 par — app server beech mein hai hi nahi)
4. S3    → event: "file aa gaya"
5. app   → metadata row, phir processing (thumbnail, transcode, scan)</pre>
     <p>Ab app server ne 40 ms kaam kiya, 12 minute nahi. Bytes kabhi tumhare
     process se guzre hi nahi. Aur bonus: S3 khud resumable/multipart upload
     deta hai, jo tumhe warna khud banana padta.</p>
     <p class="tip">🎯 Signed URL ko <b>tight</b> banao: chhoti expiry (5–15 min),
     ek hi key ke liye, <code>Content-Length</code> ki max limit, aur
     <code>Content-Type</code> fix. Warna woh ek "koi bhi kuch bhi upload kar de"
     wala darwaza ban jaata hai — aur uska bill tumhara hai.</p>`,
    `<h3>🗄️ Bytes kahan, metadata kahan</h3>
     <table>
       <tr><th></th><th>Object storage (S3)</th><th>Database</th></tr>
       <tr><td>Kya rakhein</td><td>Asli bytes</td><td>id, owner, size, type, status, created_at, s3_key</td></tr>
       <tr><td>Kyun</td><td>Sasta, unlimited, CDN-friendly</td><td>Query, join, permission, transaction</td></tr>
     </table>
     <p>DB mein BLOB rakhne ka anjaam: buffer pool bytes se bhar jaata hai (isliye
     tumhari <b>asli</b> queries slow hoti hain), backup ka size 100x, replication lag,
     aur ek din woh migration jo koi nahi karna chahta.</p>
     <h3>⚙️ Upload ke baad — status ek first-class cheez hai</h3>
     <pre>uploaded → scanning → processing → ready
                  ↓            ↓
               rejected      failed</pre>
     <p>Transcode aur thumbnail banane mein minute lagte hain. Isliye upload API
     <b>202 Accepted</b> jaisa vyavhaar kare aur ek status endpoint de. UI ko
     "processing..." dikhana chahiye — nahi toh user ek toota hua video dekhega
     aur samjhega upload fail ho gaya. (Yeh wahi async pattern hai jo tumne
     API track mein dekha tha.)</p>
     <h3>💸 Tiering — purana data sasta hona chahiye</h3>
     <table>
       <tr><td>0–30 din</td><td>Standard</td><td>aksar dekha jaata hai</td></tr>
       <tr><td>30–90 din</td><td>Infrequent Access</td><td>sasta store, mehenga read</td></tr>
       <tr><td>90+ din</td><td>Glacier / Archive</td><td>bahut sasta, ghanton mein milta hai</td></tr>
     </table>
     <p class="tip">🎯 Yeh lifecycle rule <b>din 1</b> par likho. Baad mein yeh
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
        { text: 'Client app se poochhta hai: "mujhe yeh file daalni hai"', explain: 'Sirf metadata jaata hai — naam, size, type. Bytes abhi kahin nahi ja rahe.' },
        { text: 'App permission check karta hai aur quota dekhta hai', explain: 'Yahi ek jagah hai jahan tum "nahi" keh sakte ho. Ek baar signed URL de diya, toh tumhara control khatam.' },
        { text: 'App ek signed URL banata hai — chhoti expiry, size cap, content-type fix', explain: 'Signature mein yeh sab shartein bandhi hoti hain. Isliye client unhe badal nahi sakta — S3 khud reject kar dega.' },
        { text: 'Client SEEDHA object storage par PUT karta hai', explain: 'Yahan poora faayda hai: 4 GB bytes tumhare app server se guzre hi nahi. Aur multipart/resume S3 khud sambhaalta hai.' },
        { text: 'Object storage se event aata hai: "file aa gaya"', explain: 'Client par bharosa mat karo ("maine daal diya") — woh jhooth bol sakta hai ya beech mein mar sakta hai. Sach storage se aana chahiye.' },
        { text: 'App metadata row banata hai (status = uploaded)', explain: 'Ab file DB mein "maujood" hai. Isse pehle woh ek adhoora, orphan object tha.' },
        { text: 'Background worker: scan, thumbnail, transcode — phir status = ready', explain: 'Minute ka kaam hai, isliye async. Aur beech ka status UI ko dikhna chahiye, warna user samjhega upload toot gaya.' },
      ],
    },
    {
      type: 'bins',
      title: 'Yeh cheez kahan rakhein?',
      instructions: 'Object storage mein ya database mein?',
      bins: [
        { id: 'obj', label: '🪣 Object storage' },
        { id: 'db', label: '🗄️ Database' },
      ],
      items: [
        { text: 'Original 4 GB video file', bin: 'obj', explain: 'Bytes hamesha object storage mein. Sasta, unlimited, aur CDN seedha usse serve kar sakta hai.' },
        { text: 'Video ka owner, title aur visibility', bin: 'db', explain: 'Yeh query aur permission ka data hai — ispar joins, filters aur transactions chahiye.' },
        { text: '480p / 720p / 1080p transcoded versions', bin: 'obj', explain: 'Yeh bhi bytes hain. DB mein sirf unke keys aur "kaun-kaun ready hai" rehta hai.' },
        { text: 'Upload ka status (uploaded → processing → ready)', bin: 'db', explain: 'Yeh state machine hai jispar tum query karoge ("saare stuck uploads dikhao"). Object storage query karne ke liye nahi bana.' },
        { text: 'Thumbnail images', bin: 'obj', explain: 'Chhoti hain isliye DB mein rakhne ka lalach hota hai — par woh crore ho jaati hain aur buffer pool kha jaati hain. Bytes = object storage, apwaad nahi.' },
        { text: 'Video par kitne views aaye', bin: 'db', explain: 'Badalta hua counter — DB ya ek counter store. Object storage immutable objects ke liye hai, badalte numbers ke liye nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Media ki samajh',
      questions: [
        {
          q: 'Upload app server ke through jaane par kya toota hai?',
          choices: [
            'Har upload poore duration ke liye ek thread (aur aksar ek DB connection) pakde rakhta hai — 50 slow uploads poora pool kha jaate hain aur baaki API bhi timeout karne lagti hai',
            'Bandwidth cost badh jaata hai',
            'Upload slow ho jaata hai',
            'Memory bhar jaati hai',
          ],
          answer: 0,
          explain: 'Yeh wahi shape hai jo tumne pool exhaustion mein dekha tha: <b>CPU 10%, health green, phir bhi sab timeout</b>. Ek dheema client tumhara sabse mehenga resource — concurrency slot — minute bhar ke liye pakad leta hai. Presigned URL us slot ko 40ms ka bana deta hai.',
        },
        {
          q: 'Signed URL par kya-kya shartein bandhoge?',
          choices: [
            'Chhoti expiry (5–15 min) + ek specific key + max Content-Length + fix Content-Type',
            'Sirf expiry',
            'Kuch nahi, URL secret hai',
            'IP address bandho',
          ],
          answer: 0,
          explain: 'Signed URL ek <b>capability</b> hai — jiske paas hai woh wahi kar sakta hai jo signature mein likha hai. Bina size cap ke koi 500 GB daal dega aur bill tumhara. Bina content-type ke koi HTML upload karke tumhare domain par XSS chala dega. Har shart ek darwaza band karti hai.',
        },
        {
          q: '"File aa gaya" ka sach kahan se aana chahiye?',
          choices: [
            'Object storage ke event se — client se nahi. Client jhooth bol sakta hai ya beech mein mar sakta hai',
            'Client ke confirmation call se',
            'Dono se',
            'Ek polling job se',
          ],
          answer: 0,
          explain: 'Client ka "ho gaya" ek <b>ummeed</b> hai, saboot nahi. Woh beech mein crash ho sakta hai, network gir sakta hai, ya woh jhooth bol sakta hai. Storage ka event hi ekmatr bharosemand signal hai. (Polling bhi chalega par woh mehenga aur der wala hai.)',
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
            { id: 'signed', label: 'Presigned URL — client seedha storage par', score: 3, why: 'Sahi. App server 40ms kaam karta hai, bytes uske paas se guzarte hi nahi. Multipart aur resume storage khud deta hai.' },
            { id: 'proxy', label: 'App server ke through stream karo', score: -3, why: 'Har upload poore duration ke liye ek concurrency slot pakdta hai. 50 slow uploads = pool khatam = poori API down. Yeh presigned URL ka poora karan hai.' },
            { id: 'chunk', label: 'App par chunked upload API khud banao', score: -1, why: 'Kaam karega, par tum multipart, resume, retry aur cleanup khud likh rahe ho — jo S3 muft mein deta hai. Aur bytes phir bhi tumhare server se guzar rahe hain.' },
          ],
        },
        {
          id: 'store', label: 'Bytes kahan', icon: '🪣',
          options: [
            { id: 's3', label: 'Object storage + DB mein metadata', score: 3, why: 'Standard aur sahi. Bytes sasti, unlimited, CDN-ready jagah par; metadata wahan jahan query aur permission chalti hai.' },
            { id: 'blob', label: 'DB mein BLOB', score: -3, why: 'Buffer pool bytes se bhar jaayega (asli queries slow), backup 100x, replication lag. Aur ek din woh migration karni hi padegi.' },
            { id: 'disk', label: 'App servers ki local disk', score: -3, why: 'Instance ephemeral hai aur do instances ka data alag ho jaayega. Yeh sirf ek server wali duniya mein chalta hai.' },
          ],
        },
        {
          id: 'proc', label: 'Transcoding', icon: '⚙️',
          options: [
            { id: 'async', label: 'Queue + workers, aur status API', score: 3, why: 'Transcoding minute leti hai — woh request cycle ka kaam hai hi nahi. Queue burst sambhaalti hai, workers alag scale hote hain, aur status UI ko sach dikhata hai.' },
            { id: 'sync', label: 'Upload request mein hi kar lo', score: -3, why: 'Request minute tak latki rahegi, gateway timeout karega, aur retry par poora kaam dobara. Yeh async ka textbook case hai.' },
          ],
        },
        {
          id: 'serve', label: 'Playback', icon: '🌍',
          options: [
            { id: 'cdn', label: 'CDN se, signed URLs ke saath', score: 2, why: 'Video badi aur immutable hai — CDN ke liye ideal. Signed URL private content ko bhi CDN se serve karne deta hai, aur origin par load lagbhag zero rehta hai.' },
            { id: 'origin', label: 'Seedha object storage se', score: 0, why: 'Kaam karega par har viewer ko origin region tak jaana padega — door ke users ke liye buffering, aur egress bill zyada. CDN yahan lagbhag muft ki jeet hai.' },
            { id: 'app', label: 'App server ke through proxy', score: -3, why: 'Wahi galti, ab read side par. Ek 2-ghante ka video stream ek slot ko 2 ghante ke liye pakad lega.' },
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
          'Presigned URL se client seedha S3 par; DB mein sirf key aur status; storage event par metadata; resize async; CDN se serve',
          'POST /upload par file lo, resize karo, S3 par daalo, URL laut do',
          'Base64 karke JSON body mein bhejo',
          'DB ke BLOB column mein rakho',
        ],
        answer: 0,
        explain: 'Chhoti profile photos par doosra option bhi <b>chal jaata hai</b> — aur yeh bolna theek hai ("1 MB tak proxy karna manzoor hai"). Par interviewer dekhna chahta hai ki tum jaante ho kab woh tootta hai aur agla kadam kya hai. (Base64 size 33% badha deta hai aur poori file memory mein rakhta hai — woh kabhi sahi nahi hai.)',
      },
      {
        q: '"Storage bill har mahine badhta ja raha hai. Kya karoge?"',
        choices: [
          'Lifecycle rules — 30 din baad IA, 90 din baad archive; orphan objects saaf karo (jinka DB mein koi row nahi); aur purane transcoded versions ki retention tay karo',
          'Sab kuch archive kar do',
          'Zyada compress karo',
          'Purana data delete kar do',
        ],
        answer: 0,
        explain: 'Do cheezein log bhool jaate hain. Ek: <b>orphan objects</b> — failed uploads aur delete hui rows ke bytes jo storage mein pade rehte hain; ek reconciliation job unhe pakadta hai. Do: <b>transcoded copies</b> — har video ke 3-4 versions, jinme se 1080p shayad koi dekhta hi nahi. Aur "sab archive kar do" mein retrieval cost ka jaal hai — jo purana data phir bhi maanga jaata hai, uska archive se nikalna mehenga aur dheema hai.',
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
    { front: 'Upload app server se kyun na guzre?', back: 'Har upload poore duration ke liye ek <b>concurrency slot</b> (thread + aksar DB connection) pakadta hai. 50 slow uploads = pool khatam = poori API timeout. Wahi pool-exhaustion shape.' },
    { front: 'Presigned URL flow?', back: 'client poochhe → app permission check kare → signed URL de (chhoti expiry, size cap, content-type) → client SEEDHA storage par PUT → <b>storage ka event</b> → metadata row → async processing.' },
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
    `<h3>📖 Chaar tareeke, aur unka asli farak</h3>
     <table>
       <tr><th></th><th>Kaise</th><th>Kab</th></tr>
       <tr><td><b>Polling</b></td><td>Har 5s ek request</td><td>Update kabhi-kabhi. Sabse simple — aur aksar kaafi</td></tr>
       <tr><td><b>Long poll</b></td><td>Request tab tak rukti hai jab tak data na aaye</td><td>WebSocket na chal paaye tab ka fallback</td></tr>
       <tr><td><b>SSE</b></td><td>Ek-tarfa stream server → client</td><td>Notifications, live score, LLM ka token stream</td></tr>
       <tr><td><b>WebSocket</b></td><td>Do-tarfa, hamesha khula</td><td>Chat, collab editing, gaming — jahan client bhi bhejta hai</td></tr>
     </table>
     <p class="tip">🎯 Sabse aam over-engineering yahi hai: notifications ke liye
     WebSocket lagana. Agar data sirf server se client ki taraf jaata hai, toh
     <b>SSE</b> chuno — woh plain HTTP hai, isliye proxies, load balancers aur
     reconnect sab apne aap kaam karte hain. WebSocket tab lo jab client ko bhi
     wapas bolna ho.</p>
     <h3>🔢 Connection ek resource hai</h3>
     <p>Stateless HTTP mein request 40 ms rehti hai aur chali jaati hai. WebSocket
     <b>ghanton</b> tak rehta hai. Iska matlab:</p>
     <pre>10 lakh concurrent users
   ÷ 50,000 connections per node       ← memory + file descriptors ki hadd
   = 20 nodes SIRF connections ke liye

...aur woh 20 nodes tab bhi chahiye jab koi kuch bhej hi nahi raha.</pre>
     <p>Isliye realtime systems mein <b>connection layer</b> aur <b>business logic</b>
     alag scale hote hain. Gateway nodes sirf sockets rakhte hain; asli kaam peechhe
     hota hai, aur unke beech ek pub/sub baithta hai.</p>
     <pre>client ⇄ WS gateway (sirf sockets)  ⇄  pub/sub (Redis/Kafka)  ⇄  services</pre>
     <p>Yeh isliye zaroori hai ki user A gateway-3 par hai aur user B gateway-17 par.
     Bina pub/sub ke gateway-3 ko pata hi nahi ki B kahan hai.</p>`,
    `<h3>📴 Sabse bada sawaal: offline user</h3>
     <p>Realtime design ka 80% "message bhejna" nahi hai — woh aasan hai. Asli sawaal
     yeh hai: <b>jo connected nahi tha, use kya milega?</b></p>
     <pre>❌ sirf broadcast:  offline user ne message MISS kar diya, hamesha ke liye
✅ persist + push:  message pehle STORE hoto, phir connected logon ko push
                    reconnect par: "mere last_seen_id ke baad kya aaya?"</pre>
     <p>Isliye chat mein WebSocket sirf ek <b>tez raasta</b> hai, source of truth nahi.
     Message pehle DB/log mein likha jaata hai, phir push hota hai. Reconnect par
     client apna aakhri id bhejta hai aur gap bhar leta hai. Yeh design kar liya toh
     "message kho gaya" wale bugs khud khatam ho jaate hain.</p>
     <h3>🌩️ Reconnect storm</h3>
     <p>Ek gateway node restart hua. Uspar 50,000 connections the. Ab woh sab
     <b>ek saath</b> reconnect karenge — aur har reconnect sasta nahi hai:
     auth, subscription restore, aur "maine kya miss kiya" ka backlog fetch.</p>
     <p>Yeh bilkul wahi retry storm hai jo tumne Resilience track mein dekha tha,
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
        { left: 'LLM ka jawab token-by-token', right: 'SSE', explain: 'Server se client ek-tarfa stream — SSE isi ke liye bana hai. Isiliye lagbhag saari LLM APIs SSE par streaming deti hain, WebSocket par nahi.' },
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
            '"Jo user offline tha, use message kaise milega?" — isi se pata chalta hai ki message pehle STORE hota hai, phir push',
            'Kaunsa WebSocket library use karein',
            'Kitne connections per node',
            'Message encryption kaise hoga',
          ],
          answer: 0,
          explain: 'Connected users ko bhejna aasan hissa hai. Poora design us sawaal se nikalta hai jo offline user ke baare mein hai: message ko <b>durable</b> hona padega, use ek <b>order</b> chahiye (id/sequence), aur reconnect par gap bharne ka rasta chahiye. WebSocket sirf ek tez raasta hai — source of truth nahi.',
        },
        {
          q: 'Ek gateway node (50,000 connections) restart hua. Sabse bada khatra?',
          choices: [
            'Sabhi ek saath reconnect karenge — auth + subscription restore + backlog fetch, sab ek pal mein. Bina jitter ke yeh agla node bhi gira dega',
            'Messages kho jaayenge',
            'Users ko error dikhega',
            'Memory leak',
          ],
          answer: 0,
          explain: 'Reconnect sasta nahi hai — usme auth, subscriptions aur "maine kya miss kiya" ka fetch shaamil hai. 50,000 ek saath = ek self-inflicted DDoS. Ilaaj wahi hai jo retry storm ka tha: <b>exponential backoff + full jitter</b>, aur backlog fetch par limit.',
        },
        {
          q: 'Notification feature ke liye WebSocket chuna. Kya galat ho sakta hai?',
          choices: [
            'Zyada hai — data sirf ek taraf ja raha hai. SSE plain HTTP par chalta hai isliye proxies, LB aur auto-reconnect muft milte hain; WebSocket ke saath yeh sab khud sambhaalna padta hai',
            'WebSocket slow hai',
            'WebSocket secure nahi hai',
            'Kuch galat nahi',
          ],
          answer: 0,
          explain: 'WebSocket HTTP se "upgrade" hota hai, isliye kai corporate proxies, purane load balancers aur kuch mobile networks usse dikkat karte hain. SSE bas ek lambi HTTP response hai — infra ke liye woh normal traffic hai, aur browser khud reconnect karta hai. Ek-tarfa data ke liye woh kam kaam mein zyada bharosemand hai.',
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
          text: 'Refresh par bhi nahi dikhta — yeh bada clue hai. Ab?',
          choices: [
            { t: 'Check karo ki message DB mein hai bhi ya nahi', good: true, next: 'r2', explain: 'Sahi. "Refresh par bhi nahi" ka matlab hai yeh delivery ka problem nahi, <b>persistence</b> ka hai. Agar sirf live push toota hota toh refresh par dikh jaata.' },
            { t: 'WebSocket connection logs dekho', good: false, explain: 'Connection ki jaanch tab kaam aati hai jab message store hai par pahunch nahi raha. Yahan refresh par bhi nahi dikh raha — toh pehle dekho ki woh likha bhi gaya tha ya nahi.' },
            { t: 'Client ka code dekho', good: false, explain: 'Ho sakta hai, par sabse pehla aur sasta test yeh hai: message DB mein hai? Ek query se aadha search space kat jaata hai.' },
          ],
        },
        r2: {
          text: 'Message DB mein hai HI NAHI. Code: pehle sabko WebSocket par broadcast, phir async DB insert. Kya galat hai?',
          choices: [
            { t: 'Kram ulta hai — pehle persist karo, phir push. Abhi DB insert fail hone par message hamesha ke liye kho jaata hai', good: true, next: 'r3', explain: 'Bilkul. Broadcast pehle karne se connected users ko message dikh gaya, par woh kahin likha hi nahi gaya. DB insert fail hua toh kisi ko pata bhi nahi chala — aur refresh par message gayab. <b>Pehle store, phir push.</b>' },
            { t: 'Async insert ko sync kar do', good: false, explain: 'Sync karne se latency badhegi par asli galti kram ki hai, sync/async ki nahi. Agar tum pehle persist karke phir push karo toh async bhi bilkul theek hai.' },
            { t: 'DB insert par retry lagao', good: false, explain: 'Retry madad karega par yeh sirf khidki chhoti karta hai. Jab tak push persist se pehle hai, tab tak "dikha par save nahi hua" mumkin rahega.' },
          ],
        },
        r3: {
          text: 'Kram theek kar diya. Ab offline users ka kya — unka message kaise aayega?',
          choices: [
            { t: 'Har message ko ek badhta hua id do; reconnect par client apna last_seen_id bheje aur uske baad ka fetch kare (ek limit ke saath)', good: true, next: 'end', explain: 'Yahi is shape ka standard hal hai. Ab live push sirf ek <b>optimization</b> hai — sach hamesha store mein hai, aur client kabhi bhi gap bhar sakta hai. Limit isliye ki 3 din baad wapas aane wale ko 40,000 messages ek saath na bhejein.' },
            { t: 'Offline users ke liye messages queue mein rakho aur online hote hi bhej do', good: false, explain: 'Ab tumhe per-user queues ka state rakhna padega, jo bade paimane par mehenga hai. Aur agar user 3 mahine na aaye? Store + cursor (last_seen_id) wahi kaam bina alag infra ke karta hai.' },
            { t: 'Push notifications bhejo', good: false, explain: 'Woh alag feature hai (user ko batana). Yahan sawaal yeh hai ki app khulne par woh purane messages <b>dekhega</b> kaise.' },
          ],
        },
        end: {
          end: true,
          text: 'Ab message pehle store hota hai, phir push. Gayab hona band.',
          summary: `<b>Seekh:</b> WebSocket ek <b>tez raasta</b> hai — source of truth nahi.
            <br><br><b>Pattern:</b> <code>persist (id ke saath) → push → reconnect par last_seen_id se gap bharo</code>
            <br><br>Yeh ek design chaar problems hal karta hai: offline users, reconnects,
            multi-device sync, aur "message kho gaya". Delivery/read receipts bhi ismein
            natural roop se fit ho jaate hain — woh bas per-user cursors hain.
            <br><br><b>Limit lagana mat bhoolna:</b> 3 din baad wapas aane wale ko
            40,000 messages ek saath mat bhejo.`,
        },
      },
    },
    {
      type: 'fill',
      title: 'Realtime ke faisle',
      instructions: 'Sahi shabd chuno.',
      template: `Server se client ek-tarfa stream ke liye {0} chuno — woh plain HTTP hai.
        Do-tarfa chahiye tab {1}. Connections stateful hain isliye {2} layer ko
        business logic se alag scale karo. Aur node restart par sab ek saath
        wapas na aayein, iske liye client par {3} lagao.`,
      tokens: ['SSE', 'WebSocket', 'gateway', 'backoff + jitter', 'polling', 'cache'],
      blanks: [
        { answer: 'SSE', explain: 'Server-Sent Events plain HTTP par chalta hai — proxies, LB aur auto-reconnect sab muft. Notifications aur LLM streaming iska classic use hai.' },
        { answer: 'WebSocket', explain: 'Tab jab client bhi bhejta ho — chat, collab editing, gaming.' },
        { answer: 'gateway', explain: 'Gateway nodes sirf sockets rakhte hain (memory + FDs ki hadd). Business logic peechhe, aur beech mein pub/sub — kyunki do users do alag gateways par hote hain.' },
        { answer: 'backoff + jitter', explain: 'Warna 50,000 clients theek ek saath wapas aayenge aur agla node giraayenge. Yeh wahi retry storm hai jo Resilience track mein dekha tha.' },
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
          'Message pehle durable store mein ek badhte hue id ke saath likho, phir connected recipients ko push karo. Reconnect par client last_seen_id bhej ke gap bhare — push ek optimization hai, source of truth nahi',
          'WebSocket se sabko broadcast kar do',
          'Har user ke liye ek queue banao',
          'Push notifications bhejo',
        ],
        answer: 0,
        explain: 'Yahi ek jawab hai jo offline users, reconnects, multi-device sync aur "message kho gaya" — chaaron ko ek saath hal karta hai. Aur ismein delivery/read receipts bhi natural roop se fit ho jaate hain: woh bas per-user cursors hain.',
      },
      {
        q: '"1 crore concurrent connections chahiye. Kya sochoge?"',
        choices: [
          'Connection layer alag: ~50k connections/node par ~200 gateway nodes, jo sirf sockets rakhte hain; beech mein pub/sub; business logic alag scale; aur reconnect storms ke liye jitter + staggered restarts',
          'Bade servers lagayenge',
          'Load balancer scale karenge',
          'Kubernetes auto-scaling',
        ],
        answer: 0,
        explain: 'Asli baat yeh hai ki <b>connections khud ek capacity dimension hain</b> — woh CPU ya RPS se nahi bandhi. Woh nodes tab bhi chahiye jab koi kuch bhej hi na raha ho. Aur unka deployment sochna padta hai: 200 nodes ek saath restart karoge toh 1 crore reconnects ek saath aayenge — isliye rolling restart aur jitter design ka hissa hai, ops ka detail nahi.',
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
    { front: 'Realtime design ka sabse bada sawaal?', back: '<b>"Offline user ko message kaise milega?"</b> Isi se nikalta hai: pehle STORE karo (id ke saath), phir push. Reconnect par client last_seen_id se gap bhare.' },
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
    'Cell boundary ka problem aur uska hal',
  ],
  lesson: [
    `<h3>📖 Seedha jawab jo dhokha deta hai</h3>
     <pre>SELECT * FROM drivers
WHERE lat BETWEEN 19.05 AND 19.15
  AND lng BETWEEN 72.80 AND 72.90;</pre>
     <p>Yeh sahi lagta hai. Par yaad karo composite index ka niyam:
     <b>range column ke baad index ruk jaata hai</b>. Yahan
     <b>dono</b> columns range hain. Index <code>(lat, lng)</code> banao toh
     woh <code>lat</code> ki range tak chalega — yaani poori latitude patti ke
     saare drivers — aur phir <code>lng</code> se filter karne ke liye woh
     saari rows padhni padengi.</p>
     <pre>(lat, lng) index ke saath:
   lat 19.05–19.15 ki patti  →  poore desh ki us patti ke 4 lakh drivers
   phir lng se filter        →  bache 900
   yaani 4 lakh rows padh ke 900 nikale</pre>
     <p>Asli problem yeh hai: <b>B-tree ek-dimension ka hai</b>, aur jagah do-dimension ki.</p>
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
     <p class="tip">🎯 Kamaal ki baat: <b>paas ki jagah ka prefix bhi paas hota hai.</b>
     Isliye "5 km ke andar" ab ek prefix match ban jaata hai —
     <code>WHERE geohash LIKE 'te7ud%'</code> — aur yeh ek <b>B-tree prefix scan</b>
     hai, wahi jo tumne composite index level mein seekha tha.
     Do-dimension ka problem ek-dimension ka ban gaya.</p>
     <p>Ismein bhi behtar: <b>H3</b> (Uber) hexagons use karta hai. Hexagon mein har
     padosi ki doori ek jaisi hoti hai (square mein diagonal padosi door hota hai),
     isliye "nearby" ka hisaab saaf rehta hai.</p>`,
    `<h3>🔥 Hot cell — is shape ka signature failure</h3>
     <p>Geo data <b>kabhi</b> uniformly nahi bikhra hota. Aadha shehar 5% cells mein hai,
     aur 8 PM par airport wali ek cell mein poore region ka traffic aa jaata hai.</p>
     <pre>cell te7ud9  (airport, 8 PM)   ████████████  40,000 rps  🔥
cell te7uc2  (samundar)                        0 rps  😴</pre>
     <p>Yeh bilkul wahi <b>hot key</b> problem hai jo cache level mein tha —
     aur ilaaj bhi wahi shape rakhta hai:</p>
     <table>
       <tr><td>Cell ko todo</td><td>Hot cell ko chhote precision par split karo (5 → 7 characters)</td></tr>
       <tr><td>Replicate karo</td><td>Us cell ka data N copies mein, alag nodes par</td></tr>
       <tr><td>Adaptive grid</td><td>Density ke hisaab se cell size — ghani jagah chhote cells</td></tr>
     </table>
     <p>Isliye fixed grid size lagbhag hamesha galti hai. Manhattan aur Rajasthan
     ke liye ek hi cell size sahi ho hi nahi sakta.</p>
     <h3>🧩 Cell boundary ka problem</h3>
     <p>Tum cell <code>te7ud9</code> mein ho, bilkul uske kinare par. Sabse paas ka
     driver 50 meter door hai — par woh <b>bagal wale cell</b> mein hai. Sirf apni
     cell dekhoge toh woh milega hi nahi.</p>
     <pre>Ilaaj: apni cell + uske 8 padosi cells query karo (geohash ke neighbours)
       phir un candidates par ASLI doori nikaal ke sort karo</pre>
     <p class="tip">🎯 Yahi geo ka standard do-kadam design hai:
     <b>1. index se candidates chuno (mota chhanna), 2. unhi par sahi hisaab karo
     (baarik chhanna).</b> Index ka kaam 84 lakh ko 900 tak laana hai —
     "sabse paas kaun" ka sahi jawab uske baad nikalta hai.</p>`,
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
      success: allOf(T_GEO),
      successText: `Geohash ne do-dimension ka problem ek <b>prefix scan</b> bana diya —
        wahi B-tree jo tum pehle se jaante ho. Aur hot cell wahi hot key hai
        jo cache level mein mili thi: ek shape, do jagah. Isiliye patterns pehchanna
        zaroori hai — ilaaj aksar tumhe pehle se aata hota hai.`,
      hints: [
        'Pehle table dekho: show tables',
        "Bina index ke ek cell maango: GET /api/v1/drivers?geohash=te7ud9&limit=20",
        'Ab sahi index — equality pehle, sort baad mein: CREATE INDEX ix_geo ON drivers(geohash, updated_at)',
        "Wahi query dobara: GET /api/v1/drivers?geohash=te7ud9&limit=20",
        'Ab 8 PM, airport wali cell: cache hotkey --key cell:te7ud9 --rps 40000',
        'Us cell ko 8 hisson mein todo: cache hotkey --key cell:te7ud9 --rps 40000 --replicas 8',
      ],
    },
    {
      type: 'quiz',
      title: 'Geo ki samajh',
      questions: [
        {
          q: 'lat aur lng dono par BETWEEN lagane se index kyun kaam nahi karta?',
          choices: [
            'Composite index range column ke BAAD ruk jaata hai — pehli range ke baad doosra column sirf filter hai, index nahi',
            'Float columns par index nahi banta',
            'Do columns par index nahi bana sakte',
            'BETWEEN hamesha slow hai',
          ],
          answer: 0,
          explain: 'Yeh wahi niyam hai jo tumne composite index level mein seekha tha, ab geo par. <code>(lat,lng)</code> index <code>lat</code> ki poori patti tak le jaata hai — poore desh ki us latitude ke saare rows — aur uske baad <code>lng</code> ko rows padh-padh ke chhaanna padta hai. B-tree ek-dimension ka hai, aur jagah do-dimension ki.',
        },
        {
          q: 'Geohash ka sabse zaroori gun kaunsa hai?',
          choices: [
            'Paas ki jagah ka prefix bhi paas hota hai — isliye "nearby" ek B-tree prefix scan ban jaata hai',
            'Woh chhota hota hai',
            'Woh unique hota hai',
            'Woh reversible hai',
          ],
          answer: 0,
          explain: 'Yahi poori trick hai: geohash <b>locality</b> ko sorted order mein badal deta hai. Do-dimension ka problem ek-dimension ka ban jaata hai, aur uske baad tumhara normal B-tree wahi kaam kar deta hai jiske liye log poora spatial database laga lete hain.',
        },
        {
          q: 'Tum cell ke bilkul kinare par ho. Sabse paas ka driver bagal ki cell mein hai. Kya karoge?',
          choices: [
            'Apni cell + 8 padosi cells se candidates lo, phir unhi par asli doori nikaal ke sort karo',
            'Cell size bada kar do',
            'Radius badha do',
            'Kuch nahi — woh driver miss ho jaayega',
          ],
          answer: 0,
          explain: 'Yeh geo ka standard do-kadam design hai: <b>index se mota chhanna</b> (84 lakh → ~900 candidates), phir <b>asli hisaab</b> (haversine) sirf un candidates par. Cell bada karne se candidates bahut zyada ho jaate hain aur faayda khatam ho jaata hai.',
        },
        {
          q: '8 PM par airport wali cell par 40,000 rps aa raha hai. Yeh kaunsa problem hai?',
          choices: [
            'Hot key — bilkul wahi jo cache level mein tha. Ilaaj: cell ko chhoti precision par todo, ya us cell ka data replicate karo',
            'Naya problem hai, geo-specific',
            'Index ka problem hai',
            'Network ka problem hai',
          ],
          answer: 0,
          explain: 'Yahi patterns pehchanne ka asli faayda hai. "Ek partition par saara load" ka shape tumne cache mein dekha tha aur sharding mein bhi — aur ilaaj bhi wahi hai: <b>split ya replicate</b>. Naya problem sirf isliye lagta hai kyunki uska libaas alag hai.',
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
        { text: 'Driver locations Redis mein, DB mein sirf snapshot', bin: 'good', explain: 'Location har 4 second par update hoti hai — yeh ek <b>hot, ephemeral</b> data hai. Har update DB mein likhna write storm hai. Redis (GEO commands ke saath) yahan sahi jagah hai.' },
        { text: 'Sirf apni cell query karo, padosi cells chhodo', bin: 'bad', explain: 'Cell boundary ka problem: 50 meter door ka driver bagal ki cell mein hoga aur kabhi nahi milega. Hamesha 8 padosi cells bhi lo.' },
        { text: 'Har driver ping ko DB mein insert karo (4 sec par ek)', bin: 'bad', explain: '1 lakh drivers × 15 ping/min = 15 lakh writes/min, aur purana location ka koi mol nahi. Yeh ek <b>current state</b> hai, history nahi — use in-memory store mein rakho.' },
        { text: 'H3 hexagons use karna square cells ki jagah', bin: 'good', explain: 'Hexagon mein har padosi ki doori ek jaisi hoti hai; square mein diagonal padosi 1.41x door hota hai. Isse "nearby" ka hisaab aur cell-to-cell aggregation dono saaf rehte hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Geo',
    instructions: 'Yahan "hot cell" bolna hi tumhe alag kar deta hai. 🎤',
    questions: [
      {
        q: '"Uber jaisa \'nearby drivers\' design karo."',
        choices: [
          'Locations in-memory geo store mein (har 4s update), geohash/H3 cell se index; query = apni cell + 8 padosi, phir haversine se sort; hot cells ke liye adaptive precision + replication',
          'DB mein lat/lng par index, aur BETWEEN se query',
          'Saare drivers memory mein rakho aur har baar doori nikaalo',
          'PostGIS use kar lenge',
        ],
        answer: 0,
        explain: 'Do cheezein interviewer sun-na chahta hai: <b>cell-based indexing</b> (kyunki 2D range query index par kaam nahi karti) aur <b>hot cell</b> (kyunki geo data uniformly nahi bikhra). PostGIS bolna galat nahi hai — woh sach mein spatial indexes deta hai — par 4-second updates ke write rate par woh sahi jagah nahi hai; wahan in-memory store chahiye.',
      },
      {
        q: '"Location updates 1 lakh drivers se, har 4 second. Kahan store karoge?"',
        choices: [
          'In-memory geo store (Redis) — yeh current state hai, history nahi. DB mein sirf periodic snapshot ya trip ke ends. 15 lakh writes/min DB par bhejna hi galti hai',
          'Postgres mein, index ke saath',
          'Kafka mein',
          'Har update ek nayi row',
        ],
        answer: 0,
        explain: 'Sabse zaroori sawaal yeh hai: <b>kya yeh data durable hona chahiye?</b> Driver ka 20 second purana location bekaar hai. Woh ek <b>current state</b> hai jo tezi se badalta hai — durable store ke liye galat fit. (Kafka analytics/trip history ke liye sahi hai, par "nearby dhoondo" ka jawab dene ke liye nahi.)',
      },
    ],
  },
  success: [
    'Bata sakte ho ki 2D range query par index kyun nahi chalta',
    'Geohash/H3 se nearby ko prefix scan bana sakte ho',
    'Hot cell pehchaan ke split/replicate kar sakte ho',
    'Cell boundary ka do-kadam hal jaante ho',
  ],
  homework: `Apne shehar ka geohash nikaalo (koi bhi online tool). Dekho ki 5 characters
    par box kitna bada hai aur 7 par kitna. Phir socho: tumhare use case ke liye
    kaunsi precision sahi hai — aur peak par us cell mein kitne log honge?`,
  cards: [
    { front: 'lat/lng dono par BETWEEN — kya hota hai?', back: 'Composite index <b>pehli range ke baad ruk jaata hai</b>. Poori latitude patti padhni padti hai. B-tree 1D hai, jagah 2D.' },
    { front: 'Geohash ka kamaal?', back: 'Paas ki jagah ka <b>prefix bhi paas</b> hota hai. Isliye "nearby" = <code>LIKE \'te7ud%\'</code> = B-tree prefix scan. 2D problem 1D ban gaya.' },
    { front: 'Geo query ka do-kadam design?', back: '1. Index se <b>mota chhanna</b> (cell + 8 padosi → ~900 candidates). 2. Un par <b>asli doori</b> (haversine) nikaal ke sort. Index ka kaam sirf candidates dena hai.' },
    { front: 'Hot cell?', back: 'Geo data uniformly nahi bikhra — airport 8 PM par jalta hai. Yeh <b>wahi hot key</b> problem hai: cell ko chhoti precision par split karo ya replicate karo. Fixed grid size lagbhag hamesha galti hai.' },
    { front: 'Driver locations kahan store karein?', back: '<b>In-memory geo store</b> (Redis) — yeh current state hai, history nahi. 1 lakh drivers × 15 ping/min DB par bhejna write storm hai.' },
    { front: 'H3 hexagons kyun?', back: 'Hexagon mein har padosi ki doori <b>ek jaisi</b> hai; square mein diagonal 1.41x door hai. Isse nearby aur cell aggregation dono saaf rehte hain.' },
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
     <p>Yeh chalta hai. Par ab ek sawaal ka jawab do: <b>"3 tareekh ko dopahar
     2 baje iska balance kya tha?"</b> Jawab hai — pata nahi. Tumne purani value
     ke upar likh diya. Itihaas kahin nahi hai.</p>
     <p>Aur agla sawaal: <b>"balance 4,700 kyun hai?"</b> Jawab: pata nahi.
     Bas 4,700 hai.</p>
     <p>Isliye har asli financial system balance ko <b>store</b> nahi karta —
     woh <b>immutable entries</b> store karta hai aur balance unka sum hota hai:</p>
     <pre>entries (kabhi UPDATE nahi, kabhi DELETE nahi — sirf INSERT)
   id  account  amount   type      ref
   1   7        +5000    credit    topup_881
   2   7         -500    debit     order_912
   3   7         +200    credit    refund_912

balance(7) = SUM(amount) = 4700   ← hamesha derive hota hai</pre>
     <p class="tip">🎯 Ab har sawaal ka jawab hai: kab, kitna, kyun, kis wajah se.
     Yeh event sourcing ka sabse purana aur sabse aazmaaya hua roop hai —
     accountants isi ko 600 saal se chala rahe hain.</p>
     <h3>⚖️ Double-entry — paisa banta ya mitta nahi</h3>
     <p>Har transaction <b>do</b> entries banata hai: ek jagah se nikla, doosri jagah
     gaya. Aur system ka ek hi invariant hai:</p>
     <pre>user_wallet   -500
merchant       +500
             -------
SUM              0     ← poore system ka sum hamesha ZERO hona chahiye</pre>
     <p>Yeh sirf hisaab-kitaab nahi hai — yeh ek <b>checkable invariant</b> hai.
     Ek query jo poore system ka sum leti hai; agar woh kabhi zero nahi hai, toh
     kahin paisa bana ya mita hai. Yeh alert automatic ho sakta hai, aur woh bugs
     pakadta hai jo kisi test mein nahi milte.</p>
     <p>Performance ke liye ek <b>materialized balance</b> rakhna theek hai —
     par woh sirf ek cache hai, aur usse regularly entries ke sum se milaana padta hai.</p>`,
    `<h3>🔍 Reconciliation — "numbers match nahi kar rahe"</h3>
     <p>Yeh is shape ka signature failure mode hai. Tumhara ledger kehta hai
     ₹4,82,100 aaye. Payment gateway kehta hai ₹4,81,650. Kaun sahi hai?</p>
     <p>Jawab: <b>koi bhi nahi, jab tak tum milaao na.</b> Reconciliation ek roz ka
     job hai jo dono taraf ke records line-by-line milaata hai:</p>
     <pre>Teen tarah ke farak milte hain:
   1. Hamare paas hai, unke paas nahi  →  humne count kar liya, paisa aaya nahi?
   2. Unke paas hai, hamare paas nahi  →  webhook chhoot gaya / event kho gaya
   3. Dono ke paas, amount alag        →  fees, currency conversion, rounding</pre>
     <p>Teesra sabse aam hai aur sabse boring — aur isiliye log ise skip karte hain
     aur phir saal ke ant mein 40 lakh ka farak dhoondte hain.</p>
     <p class="tip">🎯 Distributed systems mein reconciliation optional nahi hai.
     Tum exactly-once delivery <b>nahi</b> kar sakte (yeh tumne dist track mein
     dekha), isliye kabhi na kabhi ek event double process hoga ya kho jaayega.
     Idempotency usse rokti hai; reconciliation <b>pakadti</b> hai. Dono chahiye.</p>
     <h3>🚫 Yahan cache aur eventual consistency kab khatra hain</h3>
     <table>
       <tr><th>Kaam</th><th>Stale chalega?</th></tr>
       <tr><td>Transaction history dikhana</td><td>✅ 30 second purana theek hai</td></tr>
       <tr><td>Dashboard par "kul kharch"</td><td>✅ minute bhar purana theek hai</td></tr>
       <tr><td><b>Kharch se pehle balance check</b></td><td>❌ <b>kabhi nahi</b> — yahan overdraft ban jaayega</td></tr>
       <tr><td>Refund ki eligibility</td><td>❌ nahi — double refund ban jaayega</td></tr>
     </table>
     <p>Yeh wahi "galat jawab kitna mehenga hai" wala sawaal hai. Yahan poora system
     eventual ho sakta hai — <b>siwaay us ek query ke jo paisa nikaalne se pehle
     chalti hai</b>. Woh primary se, ek transaction ke andar, aur account row par
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
        { text: 'Paise ko float/double mein store karna', bin: 'bad', explain: '0.1 + 0.2 ≠ 0.3 binary floating point mein. Paisa hamesha <b>integer</b> mein (paise/cents) ya decimal type mein rakho. Yeh galti chhoti si rounding se shuru hoti hai aur reconciliation ka sabse ganda din ban jaati hai.' },
        { text: 'Ledger entry ko baad mein UPDATE karna', bin: 'bad', explain: 'Entries <b>immutable</b> hain. Galti hui toh nayi <b>reversal</b> entry banao, purani ko badlo mat. Warna tumhara audit trail jhooth bolne lagta hai.' },
        { text: 'Har payment par idempotency key', bin: 'good', explain: 'Retries hongi hi — network timeout par client ko pata hi nahi chalta ki charge hua ya nahi. Key ke bina retry = double charge.' },
        { text: 'Roz reconciliation job jo gateway se milaata hai', bin: 'good', explain: 'Idempotency duplicates <b>rokti</b> hai; reconciliation kho gaye aur alag hue records <b>pakadti</b> hai. Distributed system mein dono chahiye.' },
        { text: 'Balance ko Redis se padhna (kharch se pehle)', bin: 'bad', explain: 'Stale balance = overdraft. History dikhane ke liye cache theek hai, par <b>paisa nikaalne se pehle</b> wala check primary se, transaction ke andar, lock ke saath hona chahiye.' },
        { text: 'Poore system ka SUM(amount) = 0 par alert', bin: 'good', explain: 'Double-entry ka invariant. Ek query jo poore system ki sehat batati hai — aur woh bugs pakadti hai jo kisi unit test mein nahi milte.' },
      ],
    },
    {
      type: 'order',
      title: 'Ek payment ka sahi kram',
      instructions: 'User ₹500 se order pay kar raha hai. Kadam sahi kram mein.',
      steps: [
        { text: 'Idempotency key ke saath request aayi — pehle dekho yeh key pehle dekhi hai kya', explain: 'Sabse pehla kadam. Agar key pehle se hai toh <b>wahi purana jawab</b> laut do — naya charge mat banao. Retry par yahi bachaata hai.' },
        { text: 'Transaction shuru karo aur account row par lock lo', explain: 'Bina lock ke do concurrent requests dono balance 500 padh lengi aur dono pass ho jaayengi — classic double-spend. <code>SELECT ... FOR UPDATE</code>.' },
        { text: 'Balance check karo — primary se, cache se nahi', explain: 'Yeh woh ek query hai jo kabhi stale nahi ho sakti. Baaki poora system eventual ho sakta hai, yeh nahi.' },
        { text: 'Do ledger entries likho: wallet −500, merchant +500', explain: 'Double-entry. Dono ek hi transaction mein, taaki aadha kabhi na ho. Sum zero rehta hai.' },
        { text: 'Idempotency key ko jawab ke saath store karo', explain: 'Usi transaction mein — warna commit ho jaayega par key save nahi hogi, aur retry double charge banayegi.' },
        { text: 'Commit', explain: 'Ab sab kuch atomic ho gaya: entries, balance ka asar, aur idempotency record — teenon saath.' },
        { text: 'Commit ke BAAD event publish karo (outbox se)', explain: 'Commit se pehle publish karna galat hai — transaction rollback ho gaya toh tumne ek jhooti event bhej di. Outbox pattern isi ke liye hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Ledger ki samajh',
      questions: [
        {
          q: 'Balance ko column mein store karne ka sabse bada nuksaan?',
          choices: [
            'Itihaas mit jaata hai — "3 tareekh ko balance kya tha" aur "4700 kyun hai" ka koi jawab nahi bachta',
            'Woh slow hota hai',
            'Woh zyada jagah leta hai',
            'Concurrency problem hoti hai',
          ],
          answer: 0,
          explain: 'Concurrency ka problem lock se hal ho jaata hai. Par khoya hua itihaas <b>wapas nahi aata</b>. Entries se derive karne par har number ka karan, waqt aur reference maujood rehta hai — aur audit, dispute, reconciliation teenon apne aap ho jaate hain.',
        },
        {
          q: 'Tumhara ledger ₹4,82,100 kehta hai, gateway ₹4,81,650. Pehla kadam?',
          choices: [
            'Line-by-line reconciliation — teen buckets banao: sirf hamare paas, sirf unke paas, dono par amount alag',
            'Gateway par bharosa karo, apna number theek kar lo',
            'Apne number par bharosa karo, unse baat karo',
            'Farak ko ek adjustment entry mein daal do',
          ],
          answer: 0,
          explain: 'Kul farak ek number hai — usse kuch pata nahi chalta. Buckets se <b>karan</b> milta hai: "sirf unke paas" = tumhara webhook chhoota, "sirf hamare paas" = tumne jaldi count kar liya, "amount alag" = fees/rounding. Har bucket ka fix alag hai. Aur farak ko adjustment mein daalna woh galti hai jo aage jaake crore ka ban jaati hai.',
        },
        {
          q: 'Paisa kis type mein store karoge?',
          choices: [
            'Integer (paise/cents) ya decimal — float kabhi nahi',
            'Float, woh aasan hai',
            'String',
            'Double precision',
          ],
          answer: 0,
          explain: 'Binary floating point 0.1 ko theek se rakh hi nahi sakta. Har operation ek chhoti si galti jodta hai, aur lakhon transactions ke baad woh reconciliation mein dikhne lagti hai — ek aisi galti jo har baar alag jagah dikhti hai. Integer paise mein rakho: ₹4,999.50 → <code>499950</code>.',
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
            { id: 'entries', label: 'Immutable entries; balance = SUM (+ materialized cache)', score: 3, why: 'Sahi. Itihaas bachta hai, har number ka karan hota hai, audit muft mein mil jaata hai. Materialized balance sirf speed ke liye — use entries se milaate raho.' },
            { id: 'col', label: 'balance column jise UPDATE karte hain', score: -3, why: 'Itihaas mit jaata hai. "Kal balance kya tha" aur "yeh number kyun hai" — dono ka jawab nahi bachta. Aur ek bug ke baad recovery ka koi rasta nahi.' },
            { id: 'both', label: 'Dono — entries bhi, aur balance column bhi source of truth', score: -1, why: 'Do source of truth = ek din woh alag ho jaayenge, aur tab tum nahi jaan paoge ki kaun sahi hai. Ek ko <b>derived</b> declare karo — phir mismatch par jawab saaf hai: entries jeetenge.' },
          ],
        },
        {
          id: 'concur', label: 'Do requests ek saath', icon: '🔒',
          options: [
            { id: 'lock', label: 'Transaction + account row par SELECT FOR UPDATE', score: 3, why: 'Double-spend ka seedha ilaaj. Row-level lock hai, isliye alag users ek doosre ko block nahi karte — sirf ek hi account par concurrent kharch serialize hote hain.' },
            { id: 'opt', label: 'Optimistic — version check, conflict par retry', score: 1, why: 'Chalta hai aur read-heavy par aksar behtar hai. Par ek hot account (jaise merchant ka) par retry storm ban sakta hai. Wallet ke liye pessimistic lock zyada seedha hai.' },
            { id: 'none', label: 'Balance padho, check karo, likh do', score: -3, why: 'Classic race condition: dono requests balance 500 padhengi, dono pass karengi, aur account −500 par chala jaayega. Yeh bug testing mein lagbhag kabhi nahi dikhta aur production mein roz dikhta hai.' },
          ],
        },
        {
          id: 'retry', label: 'Client ne timeout par retry kiya', icon: '🔁',
          options: [
            { id: 'idem', label: 'Idempotency key — usi transaction mein store', score: 3, why: 'Wahi key dobara aaye toh purana jawab laut do. Aur key ko <b>usi</b> transaction mein store karo — warna commit ho jaayega par key nahi, aur retry double charge banegi.' },
            { id: 'dedup', label: 'Amount + user + 5 min window se duplicate pakdo', score: -1, why: 'Kaam karega, par ek asli case tod dega: koi sach mein do baar ₹100 bhejna chahta ho. Guessing se dedup karna user ka valid kaam block karta hai. Key client deta hai, isliye woh iraade ko jaanta hai.' },
            { id: 'nothing', label: 'Kuch nahi — retry kam hi hote hain', score: -3, why: 'Timeout ka matlab yeh nahi ki charge nahi hua — matlab hai <b>tumhe pata nahi</b>. Client zaroor retry karega. Yeh double-charge ka sabse aam raasta hai.' },
          ],
        },
        {
          id: 'recon', label: 'Gateway se milaan', icon: '🔍',
          options: [
            { id: 'daily', label: 'Roz reconciliation job + teen buckets + mismatch par alert', score: 2, why: 'Idempotency duplicates rokti hai, reconciliation kho gaye records <b>pakadti</b> hai. Exactly-once mumkin nahi hai, isliye yeh optional nahi hai.' },
            { id: 'never', label: 'Zaroorat nahi — hamara code sahi hai', score: -2, why: 'Sawaal code ka nahi hai. Webhooks kho jaate hain, gateway timeouts hote hain, fees baad mein lagti hain. Bina reconciliation ke tumhe pata mahino baad chalega — ya kabhi nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Immutable entries + lock + idempotency + reconciliation. Yahi woh chaar cheezein hain jinke bina money system ek din chup-chaap galat ho jaata hai.',
        ok: '👍 Buniyaad theek hai, par ek jagah tumne woh maan liya jo distributed system mein maana nahi ja sakta.',
        bad: '🤔 Money mein "lagbhag sahi" jaisi koi cheez nahi hoti. Balance derive karo, lock lo, idempotent bano, aur milaate raho.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Ledger',
    instructions: 'Yahan har "shayad" mehenga hai. 🎤',
    questions: [
      {
        q: '"Do users ek hi wallet se ek saath kharch kar rahe hain. Kaise sambhaaloge?"',
        choices: [
          'Transaction ke andar account row par SELECT FOR UPDATE — check aur write dono lock ke andar. Ya optimistic locking version column ke saath, conflict par retry',
          'Application mein ek mutex laga dunga',
          'Balance check karke turant update kar dunga',
          'Queue mein daal ke ek-ek karke process karunga',
        ],
        answer: 0,
        explain: 'Application-level mutex sirf ek instance par kaam karta hai — do pods par woh bekaar hai. Queue chalti hai (aur kuch systems yahi karte hain) par woh har kharch mein latency jodti hai. Sabse seedha aur sahi jawab DB ka row lock hai: check aur write ek hi lock ke andar. Yeh <b>distributed</b> jawab hai, aur wahi maayne rakhta hai.',
      },
      {
        q: '"Ek event double process ho gaya aur user ko do baar credit mil gaya. Ab?"',
        choices: [
          'Ek reversal entry banao (purani ko badlo mat), root cause dhoondo (idempotency key thi?), aur reconciliation ko itna tez karo ki agli baar yeh ghanton mein pakda jaaye, mahino mein nahi',
          'Galat entry delete kar do',
          'Balance manually theek kar do',
          'Entry ka amount update kar do',
        ],
        answer: 0,
        explain: 'Entries <b>immutable</b> hain — delete ya update karna audit trail ko jhootha bana deta hai, aur regulated systems mein woh apne aap mein ek violation hai. Reversal entry sach batati hai: "yeh hua tha, aur yeh usko palta hai". Aur asli sawaal woh teesra hissa hai: ise kitni jaldi pakda gaya?',
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
    dekho ki woh ek column hai ya entries. Agar column hai, toh yeh sawaal poochho:
    "kal dopahar ise kya value thi, aur kyun?" Agar jawab nahi hai, wahi tumhara agla design hai.`,
  cards: [
    { front: 'Balance kaise rakhein?', back: 'Column mein <b>nahi</b> — <b>immutable entries</b> rakho, balance = SUM(amount). Itihaas, karan aur audit teenon muft milte hain. Materialized balance sirf cache hai.' },
    { front: 'Double-entry ka invariant?', back: 'Har transaction ki <b>do</b> entries; poore system ka <code>SUM(amount) = 0</code>. Ek query jo batati hai ki kahin paisa bana ya mita toh nahi. Uspar alert lagao.' },
    { front: 'Reconciliation ke teen buckets?', back: '1. Sirf hamare paas · 2. Sirf unke paas (webhook chhoota) · 3. Dono par amount alag (fees/rounding). Har bucket ka fix alag hai.' },
    { front: 'Idempotency vs reconciliation?', back: 'Idempotency duplicates <b>rokti</b> hai, reconciliation kho gaye/alag records <b>pakadti</b> hai. Exactly-once mumkin nahi — isliye dono chahiye.' },
    { front: 'Money mein cache kahan NAHI?', back: 'History/dashboard par theek. Par <b>kharch se pehle ka balance check</b> hamesha primary se, transaction ke andar, row lock ke saath — warna overdraft.' },
    { front: 'Paisa kis type mein?', back: '<b>Integer paise/cents</b> ya decimal. Float kabhi nahi — 0.1+0.2≠0.3, aur woh galti reconciliation mein hi dikhti hai.' },
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
    `<h3>📖 Woh candidate jo microservices samjha raha tha</h3>
     <p>Ek engineer microservices ke faayde bilkul sahi bata raha tha — independent
     deploys, fault isolation, alag scaling. Sab sahi. Phir usse ek 3-table wala CRUD
     app diya gaya, aur usne use <b>15 services</b> mein tod diya.</p>
     <p>Usne pattern <b>yaad</b> kar liya tha. Woh yeh nahi samajh paaya ki pattern
     kis dard ka ilaaj hai — aur uske badle mein kya keemat maangta hai.</p>
     <p class="tip">🎯 Har pattern ek <b>vyapaar</b> hai. Jab tak tum yeh nahi bata
     sakte ki woh kya <b>bigadta</b> hai, tab tak tumne use samjha nahi hai —
     bas uska naam seekha hai.</p>
     <table>
       <tr><th>Pattern</th><th>Kya hal karta hai</th><th>Kya banata hai</th></tr>
       <tr><td>Microservices</td><td>Team independence, alag scaling</td><td>Network har jagah, distributed debugging, data consistency ka jhanjhat</td></tr>
       <tr><td>Event sourcing</td><td>Poora itihaas, time travel, audit</td><td>Har query ke liye projections, schema evolution, "abhi state kya hai" mushkil</td></tr>
       <tr><td>CQRS</td><td>Read aur write alag scale</td><td>Do models, eventual consistency, aur uska UX</td></tr>
       <tr><td>Kafka</td><td>Durable log, replay, decoupling</td><td>Ek aur cluster chalana, partition/ordering ki samajh, ops ka boj</td></tr>
       <tr><td>Cache</td><td>Latency aur DB load</td><td>Invalidation, staleness, stampede, aur ek naya failure mode</td></tr>
       <tr><td>Sharding</td><td>Ek node ki hadd tod do</td><td>Cross-shard queries, rebalancing, hot shards, distributed transactions</td></tr>
     </table>
     <p>Daayen column ko padho. Woh galtiyan nahi hain — woh <b>keemat</b> hai.
     Aur keemat tabhi chukani chahiye jab baayan column ka dard sach mein ho raha ho.</p>`,
    `<h3>🥱 Boring SQL kab jeetta hai</h3>
     <p>Ek Postgres instance aaj ke hardware par:</p>
     <pre>~10,000 simple queries/sec
~5–10 TB tak aaram se
JSONB (document store), full-text search (GIN),
geo (PostGIS), pub/sub (LISTEN/NOTIFY), queues (SKIP LOCKED)</pre>
     <p>Yaani woh <b>ek hi box</b> mein document DB, search engine, geo store aur
     queue ka kaam kar deta hai — ek hi transaction, ek hi backup, ek hi cheez jise
     monitor karna hai. Zyadatar products isse kabhi bahar nikalte hi nahi.</p>
     <p>Aur jab tum use todte ho, tum sirf technology nahi jodte — tum
     <b>failure modes</b> jodte ho. Do systems ka matlab hai unke beech consistency,
     unka sync, unka alag-alag down hona, aur ek naya on-call rotation.</p>
     <h3>❓ Ek sawaal jo har chunav saaf kar deta hai</h3>
     <p class="tip">🎯 <b>"Yeh kis cheez ko theek kar raha hai, jo abhi sach mein
     toota hua hai?"</b></p>
     <p>Agar jawab mein "scale par..." ya "aage chal ke..." aata hai, toh abhi
     zaroorat nahi hai. Aaj ka dard chahiye, kal ka anumaan nahi.</p>
     <table>
       <tr><th>Ye sunte ho...</th><th>Toh yeh poochho</th></tr>
       <tr><td>"Kafka laga dete hain"</td><td>"Roz kitne events hain? Replay chahiye? 1000/din ke liye ek table kaafi hai."</td></tr>
       <tr><td>"Redis cache laga dete hain"</td><td>"Query abhi kitni slow hai? Data kitni baar badalta hai? Ek index se kaam ho jaayega?"</td></tr>
       <tr><td>"Yeh service alag kar dete hain"</td><td>"Alag deploy karna hai, ya alag scale? Ya bas code ganda lag raha hai?"</td></tr>
       <tr><td>"MongoDB behtar hai"</td><td>"Kaunsi query abhi mushkil hai? Schema sach mein badal raha hai ya humne design nahi kiya?"</td></tr>
       <tr><td>"Event sourcing karte hain"</td><td>"Audit chahiye ya time-travel? Sirf audit ke liye ek audit table kaafi hai."</td></tr>
     </table>
     <p>Yeh sawaal cynical nahi hai. Aadhe waqt jawab "haan, sach mein zaroorat hai"
     hoga — aur tab tum use <b>saaf iraade</b> ke saath laga rahe ho, aur uski keemat
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
        { text: 'Roz 1,000 background jobs — "Kafka laga dete hain"', bin: 'no', explain: '1000/din = 0.01/sec. Ek DB table + <code>SELECT FOR UPDATE SKIP LOCKED</code> ise haste-khelte kar dega, aur usme transactions bhi milte hain. Kafka ek aur cluster hai jise chalana padega.' },
        { text: '5 teams ek hi repo par, deploy ek doosre ko block kar rahe hain', bin: 'yes', explain: 'Yeh <b>asli</b> dard hai jo microservices hal karte hain — technical nahi, organizational. Yahi Conway\'s law ka sahi istemaal hai.' },
        { text: '20 GB data — "sharding kar dete hain"', bin: 'no', explain: '20 GB toh RAM mein aa jaata hai. Sharding cross-shard queries, rebalancing aur distributed transactions leke aati hai — ek aisi problem ke liye jo abhi hai hi nahi.' },
        { text: 'Regulator poora audit trail maangta hai — kisne kya badla, kab', bin: 'yes', explain: 'Yeh event sourcing/append-only ka asli case hai — ya kam se kam ek immutable audit table ka. Yahan requirement bahar se aayi hai, andar se anumaan nahi.' },
        { text: 'Ek query 8 second leti hai — "cache laga dete hain"', bin: 'no', explain: 'Pehle poochho <b>kyun</b> 8 second lag rahe hain. Aksar ek missing index use 20ms bana deta hai. Cache slow query ko chhupa deta hai aur uske saath invalidation, staleness aur ek naya failure mode le aata hai.' },
        { text: 'Search par LIKE full scan kar raha hai, 5 crore rows', bin: 'yes', explain: 'Yahan B-tree structurally kaam kar hi nahi sakta. Yeh algorithm ki hadd hai, tuning ki nahi — inverted index chahiye.' },
        { text: 'Ek Postgres, 40% CPU, sab theek — "MongoDB par shift karte hain"', bin: 'no', explain: 'Yahan koi problem statement hai hi nahi. Migration ka risk asli hai, faayda kalpanik. "Behtar hai" ek technology ka gun nahi — kisi zaroorat ke saamne hi behtar hota hai.' },
      ],
    },
    {
      type: 'match',
      title: 'Pattern → uski chhupi hui keemat',
      pairs: [
        { left: 'Microservices', right: 'Har function call ab ek network call hai — jo fail, dheemi ya duplicate ho sakti hai', explain: 'Monolith mein method call 0.001 ms leti hai aur kabhi fail nahi hoti. Service call 5 ms leti hai, timeout kar sakti hai, retry ho sakti hai, aur ab uske liye circuit breaker chahiye. Ek line ka change ab distributed systems ka problem hai.' },
        { left: 'Event sourcing', right: '"Abhi state kya hai" ke liye projections chahiye — har query ke liye ek', explain: 'Events se current state seedha nahi milti; use replay ya projection se banana padta hai. Aur jab business rule badalta hai toh purane events ka matlab bhi badalta hai — schema evolution yahan sabse mushkil hissa hai.' },
        { left: 'CQRS', right: 'Write ke turant baad read purana data de sakta hai — aur UX ko woh sambhaalna padta hai', explain: 'User ne save kiya, list refresh ki, purana data dikha. Yeh bug nahi hai, design hai — par usko dikhana padta hai (optimistic UI, ya "sync ho raha hai" ka signal).' },
        { left: 'Sharding', right: 'Cross-shard query aur transaction — dono lagbhag khatam', explain: 'Jo pehle ek JOIN tha, woh ab N queries + application mein merge hai. Aur do shards ke beech atomic transaction ke liye 2PC ya saga chahiye. Isiliye shard key ka chunav wapas nahi liya ja sakta.' },
        { left: 'Cache', right: 'Ek naya failure mode — aur woh "load-bearing" ban jaata hai', explain: '95% hit rate ka matlab hai cache girte hi DB par load 20x. Cache "optional speedup" lagta hai par chupke se woh cheez ban jaata hai jiske bina system khada hi nahi rehta.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Tradeoffs',
      questions: [
        {
          q: 'Kisi bhi technology chunav se pehle sabse achha sawaal?',
          choices: [
            '"Yeh kis cheez ko theek kar raha hai, jo abhi sach mein toota hua hai?"',
            '"Isse hum kitna scale kar sakte hain?"',
            '"Baaki companies kya use karti hain?"',
            '"Kya team ko yeh aata hai?"',
          ],
          answer: 0,
          explain: 'Yeh sawaal kaal ko aaj par le aata hai. "Scale par kaam aayega" ke jawab mein tum aaj complexity ki keemat chuka rahe ho ek aise problem ke liye jo shayad kabhi aaye hi na. (Team ki familiarity bhi <b>asli</b> aur zaroori factor hai — par woh doosra sawaal hai, pehla nahi.)',
        },
        {
          q: '3-table CRUD app ko 15 microservices mein todne se kya milta hai?',
          choices: [
            'Kuch nahi — 15 deployments, 15 monitors, network calls, distributed transactions, aur ek aisi debugging jo pehle ek stack trace thi',
            'Better scaling',
            'Fault isolation',
            'Team independence',
          ],
          answer: 0,
          explain: 'Woh teenon faayde <b>asli</b> hain — par woh tab milte hain jab tumhare paas alag teams, alag scaling needs, ya alag failure domains hon. Ek chhote app par tum sirf keemat chuka rahe ho, faayda mila hi nahi. Yahi "pattern jaanna vs samajhna" ka farak hai.',
        },
        {
          q: 'Ek query 8 second le rahi hai. "Redis cache laga dete hain" — kya galat hai?',
          choices: [
            'Cache slow query ko chhupa deta hai, hataata nahi — aur uske saath invalidation, staleness aur ek naya failure mode aata hai. Pehle dekho ki woh 8 second kyun lag rahe hain',
            'Redis mehenga hai',
            'Cache kaam nahi karega',
            'Kuch galat nahi',
          ],
          answer: 0,
          explain: 'Aksar woh 8 second ek missing index ya N+1 hote hain — aur woh fix karne se query 20ms ki ho jaati hai, <b>bina</b> kisi naye system ke. Cache ke baad tumhare paas ek slow query <b>aur</b> ek cache dono hain, aur cache miss par woh 8 second wapas aa jaate hain — aksar sabse bure waqt par.',
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
            { t: '"Har component kis cheez ko theek kar raha hai, jo abhi toota hua hai?"', good: true, next: 'a2', explain: 'Sahi sawaal, aur sahi tone — yeh design par hamla nahi hai, yeh uske karan poochh raha hai. Agar jawab "scale ke liye" hai toh baat aage badhegi; agar "asli dard" hai toh tum galat the aur seekh gaye.' },
            { t: '"Yeh over-engineering hai, sab hata do"', good: false, explain: 'Nateeja shayad sahi ho par tareeka galat hai. Bina karan poochhe reject karna engineer ko defensive bana deta hai — aur ho sakta hai koi requirement ho jo tumhe pata hi nahi.' },
            { t: '"Kitne users honge?" ', good: false, explain: 'Yeh already likha hai — 200. Sirf scale poochhna sawaal ko chhota kar deta hai; asli sawaal yeh hai ki har component kyun hai.' },
          ],
        },
        a2: {
          text: 'Jawab: "aage chal ke scale karna pad sakta hai, aur main naye tools seekhna chahta tha." Ab?',
          choices: [
            { t: '"Seekhne ki wajah asli hai — par production system uski jagah nahi. Chalo simple se shuru karte hain, aur main tumhe ek aisa hissa deta hoon jahan yeh sach mein chahiye"', good: true, next: 'a3', explain: 'Sabse achha review woh hai jo <b>dono</b> zaroorton ko maanta hai. Design theek ho gaya, aur engineer ko seekhne ka mauka bhi mila — bas sahi jagah par. Isse mentorship banti hai, resentment nahi.' },
            { t: '"Seekhna apne time par karo, yahan simple rakho"', good: false, explain: 'Technically sahi, par yeh engineer ko band kar deta hai. Seekhne ki bhookh ek achhi cheez hai — use kaatna nahi, redirect karna chahiye.' },
            { t: '"Theek hai, chalne do — seekh jaayega"', good: false, explain: 'Ab 200 users ka tool 6 services aur teen infra pieces par chal raha hai, jise koi na koi 3 saal tak maintain karega. "Seekhne" ki keemat team chukayegi.' },
          ],
        },
        a3: {
          text: 'Simple version kya hoga?',
          choices: [
            { t: 'Ek service, ek Postgres. Background jobs ke liye SKIP LOCKED wali table, search ke liye GIN index. Jab koi hissa sach mein dard de tab use alag karo', good: true, next: 'end', explain: 'Yeh <b>chhota</b> nahi hai — yeh sahi size ka hai. Ek deploy, ek backup, ek cheez monitor karne ko, aur ek transaction jisme sab kuch atomic hai. Aur agar kabhi search sach mein dabne lage, toh use nikaal ke Elasticsearch par le jaana ek din ka kaam hai — kyunki tumne interfaces saaf rakhe.' },
            { t: '3 services aur Postgres — beech ka raasta', good: false, explain: '"Beech ka raasta" aksar dono ka bura hissa hota hai: distributed system ki complexity, par uska koi faayda nahi. Ek se shuru karo aur <b>dard</b> ke hisaab se todo, anumaan ke hisaab se nahi.' },
            { t: 'Monolith par Kafka rakh lo', good: false, explain: 'Kafka is scale par sirf ek aur cluster hai jise chalana, monitor karna aur upgrade karna padega. 1000 jobs/din ke liye ek table kaafi hai.' },
          ],
        },
        end: {
          end: true,
          text: 'Design ek service + Postgres par aa gaya — aur engineer khush hai.',
          summary: `<b>Seekh:</b> Sabse achha design review <b>dono</b> zaroorton ko maanta hai —
            system ki, aur engineer ki.
            <br><br><b>Sawaal jo sab kholta hai:</b> "Yeh kis cheez ko theek kar raha hai,
            jo <b>abhi</b> sach mein toota hua hai?"
            <br><br>Jawab mein "aage chal ke" ya "seekhna chahta tha" aaye — dono asli wajah hain,
            par production system unki jagah nahi. Engineer ko seekhne ka mauka
            <b>wahan</b> do jahan woh cheez sach mein chahiye.
            <br><br><b>Aur yaad rakho:</b> "beech ka raasta" (3 services) aksar dono ka bura hissa
            hota hai — distributed complexity, bina uske faayde ke.`,
        },
      },
    },
  ],
  interview: {
    title: 'Interview Round — Tradeoffs',
    instructions: 'Yahan "nahi" bol paana sabse bada signal hai. 🎤',
    questions: [
      {
        q: '"Kab tum boring SQL database chunoge over ek naye distributed system ke?"',
        choices: [
          'Lagbhag hamesha, jab tak koi <b>maapa hua</b> dard na ho. Ek Postgres ~10k qps aur kai TB sambhaal leta hai, aur usme JSONB, full-text, geo aur queues bhi hain — ek transaction, ek backup, ek cheez monitor karne ko',
          'Jab data structured ho',
          'Jab team choti ho',
          'Kabhi nahi — modern systems distributed hone chahiye',
        ],
        answer: 0,
        explain: 'Yeh jawab isliye majboot hai kyunki isme <b>numbers</b> hain aur ek shart hai ("jab tak maapa hua dard na ho"). Yeh "main naye tools se darta hoon" nahi keh raha — yeh keh raha hai ki complexity ki keemat chukane se pehle uska karan hona chahiye.',
      },
      {
        q: '"Tumne kabhi aisa pattern hataya hai jo pehle add kiya tha?"',
        choices: [
          'Haan — aur asli seekh yeh thi ki hum us problem ke liye keemat chuka rahe the jo hamare paas thi hi nahi. Hataane ke baad system samajhne mein aasan ho gaya',
          'Nahi, hamare architecture decisions sahi rehte hain',
          'Nahi, hataana risky hai',
          'Haan, par woh galti nahi thi',
        ],
        answer: 0,
        explain: 'Yeh sawaal seniority ka test hai. Jo engineer kabhi kuch <b>hataata</b> nahi, woh sirf jodta hai — aur uska system har saal bhaari hota jaata hai. "Humne yeh nikaal diya kyunki uski keemat faayde se zyada thi" bolna un jawaabon mein hai jo interviewer sabse kam sunte hain aur sabse zyada pasand karte hain.',
      },
    ],
  },
  success: [
    'Har pattern ki chhupi hui keemat bata sakte ho',
    '"Yeh kya theek kar raha hai jo abhi toota hai" poochh sakte ho',
    'Jaante ho ki ek Postgres kitna kar leta hai',
    'Over-engineering ko bina engineer ko kaate rok sakte ho',
  ],
  homework: `Apne system ka koi ek component chuno — cache, queue, ya ek alag service.
    Likho: (1) yeh kis dard ke liye aaya tha, (2) woh dard aaj bhi hai?,
    (3) iski keemat kya hai (ops, failure modes, samajhne ka boj).
    Agar (2) ka jawab "nahi" hai — toh ek achha PR wahan chhupa hai.`,
  cards: [
    { front: 'Pattern samajhne ka test?', back: 'Tum bata sako ki woh kya <b>bigadta</b> hai. Sirf faayde bata paana = naam yaad hai, samajh nahi.' },
    { front: 'Technology chunav se pehle ka sawaal?', back: '<b>"Yeh kis cheez ko theek kar raha hai, jo abhi sach mein toota hua hai?"</b> Jawab mein "aage chal ke" aaye toh abhi zaroorat nahi.' },
    { front: 'Ek Postgres kitna kar leta hai?', back: '~10k simple qps, 5–10 TB, aur usme JSONB + full-text (GIN) + geo (PostGIS) + queue (SKIP LOCKED). Zyadatar products isse bahar nikalte hi nahi.' },
    { front: 'Microservices ki asli keemat?', back: 'Har method call ab ek <b>network call</b> hai — fail, dheemi, ya duplicate ho sakti hai. Ek stack trace ab distributed trace hai. Faayda organizational hai, technical nahi.' },
    { front: '8-second query par cache?', back: 'Pehle poochho <b>kyun</b> 8 second. Aksar missing index ya N+1. Cache slow query ko chhupata hai, hataata nahi — aur miss par woh 8 second sabse bure waqt par wapas aate hain.' },
    { front: 'Sharding se pehle?', back: '20 GB RAM mein aa jaata hai. Sharding cross-shard queries, rebalancing aur hot shards laati hai. Shard key ka faisla <b>wapas nahi</b> liya ja sakta.' },
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
     jo tum socho. Woh isliye nahi phisalte ki sawaal mushkil hai; woh isliye
     phisalte hain ki woh <b>jaana-pehchana</b> hai. Dimaag "arre yeh toh coffee shop
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
     <p>Yeh mazaak ki tulna nahi hai. Yeh bilkul wahi shape hai jo Uber, DoorDash,
     video transcoding, print jobs — har <b>task processing system</b> ka hai.</p>`,
    `<h3>🤔 Woh sawaal jinke jawab dukaan mein saaf dikhte hain</h3>
     <p><b>"Line bahut lambi ho jaaye toh?"</b><br>
     Dukaan do cheezein karti hai: kuch log line dekh ke chale jaate hain
     (<b>load shedding</b>), aur kabhi staff kehta hai "aaj sirf simple coffee"
     (<b>graceful degradation</b>). Aur agar tum honest ho toh entrance par likh doge
     "abhi 20 minute wait" — yeh <b>admission control</b> hai, aur woh customer ke
     liye bhi behtar hai jo intezaar nahi kar sakta.</p>
     <p><b>"Barista ne coffee banayi par customer aaya hi nahi?"</b><br>
     10 minute baad woh coffee phenk di jaati hai. Yeh <b>TTL + cleanup</b> hai —
     bina iske pending jobs ka dher lagta rehta hai.</p>
     <p><b>"Ek order beech mein gir gaya?"</b><br>
     Token slip abhi bhi customer ke paas hai. Woh dobara bolega, aur staff dekhega
     ki woh bana ya nahi. Yeh <b>idempotency</b> hai — token id se woh dobara nahi
     banayi jaayegi. Bina token ke woh do coffee bana dete.</p>
     <p><b>"Ek customer 30 coffee maang le?"</b><br>
     Woh poori dukaan ko block kar dega. Ilaaj: bade orders ke liye alag counter —
     yeh <b>bulkhead</b> hai. (Grocery store ka "10 items or less" lane bilkul yahi hai.)</p>
     <p class="tip">🎯 Yeh level ek trick sikhata hai jo interview aur asli kaam
     dono mein chalti hai: <b>jab design mein fans jao, use ek insaani cheez
     bana ke socho.</b> Warehouse, restaurant, post office, hospital ka ER —
     sabne apni scaling problems dashak pehle hal kar li hain, aur unke hal
     tumhe pehle se pata hain.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Dukaan → System',
      pairs: [
        { left: 'Counter par lambi line', right: 'Request queue + backpressure', explain: 'Queue burst ko sambhaalti hai. Par uski bhi ek hadd hai — line footpath tak pahunch gayi toh naye customers ko rokna hi padega. Unbounded queue ka matlab hai memory khatam aur sabko infinite wait.' },
        { left: '3 espresso machines, 8 baristas', right: 'Resource pool ka bottleneck', explain: 'Barista badhane se throughput nahi badhega — machines hi hadd hain. Bilkul waise hi jaise app instances badhane se kuch nahi hota agar DB connection pool 50 par atka hai.' },
        { left: 'Token number ka parcha', right: '202 Accepted + job id + status endpoint', explain: 'Order accept ho gaya, kaam abhi baaki hai. Customer ke paas ek reference hai jisse woh poochh sakta hai. Yeh async API ka poora contract hai.' },
        { left: '"Aaj sirf simple coffee milegi"', right: 'Graceful degradation', explain: 'Bandh karne se behtar hai kam menu. System mein: recommendations band, personalization band, par checkout chalta rahe.' },
        { left: 'Bade orders ke liye alag counter', right: 'Bulkhead', explain: 'Ek 30-coffee ka order poori line block na kare. Systems mein: bhaari kaam alag pool/queue mein — warna ek slow request type sab kuch le doobti hai.' },
        { left: '10 minute purani coffee phenk di jaati hai', right: 'TTL + orphan cleanup', explain: 'Har system mein woh kaam hota hai jiska koi intezaar nahi kar raha. Uske liye TTL ho, warna pending jobs jama hote rehte hain.' },
        { left: '"Doodh khatam ho gaya"', right: 'Dependency failure + fallback', explain: 'Dukaan band nahi hoti — black coffee milti rehti hai, aur menu par likh diya jaata hai. Yeh fallback + saaf signal hai.' },
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
            { id: 'async', label: '202 Accepted + order id, kitchen queue mein daalo', score: 3, why: 'Sahi. Accept karna (10ms) aur banana (4 minute) do alag cheezein hain. Customer ko turant confirmation aur ek id milti hai jisse woh status dekh sake.' },
            { id: 'sync', label: 'Coffee banne tak request rok ke rakho', score: -3, why: '4 minute ki HTTP request. Gateway timeout karega, mobile network girega, aur retry par doosra order ban jaayega. Yeh sync/async ka textbook case hai.' },
            { id: 'fire', label: 'Accept karke bhool jao, id mat do', score: -2, why: 'Ab customer ke paas poochhne ka koi tareeka nahi ("mera order kahan hai?"), aur tumhare paas idempotency ka koi anchor nahi. Job id async ka minimum hai.' },
          ],
        },
        {
          id: 'overload', label: 'Peak: 200 aa rahe, 60 ban rahe', icon: '🌊',
          options: [
            { id: 'admit', label: 'Honest ETA dikhao aur queue depth par naye orders rok do', score: 3, why: 'Admission control. "25 minute wait" dekh ke aadhe log abhi order nahi karenge — aur jo karenge unhe sahi ETA milega. Yeh dukaan bhi karti hai, aur yeh sabse imaandaar hal hai.' },
            { id: 'queue', label: 'Sabko lo, queue apne aap khaali hogi', score: -2, why: 'Queue kabhi khaali nahi hogi — 200 &gt; 60 hai. Peak ke ant tak wait ek ghante ka ho jaayega, log aayenge hi nahi, aur tumhare paas ban chuki thandi coffee ka dher hoga.' },
            { id: 'reject', label: 'Queue full par 503 do', score: 0, why: 'Kaam karega aur queue ko bounded rakhega — par ek naya sawaal khada hai: 503 dekh ke sab retry karenge. Retry-After ke bina yeh storm banta hai. Waiting room isse behtar hai kyunki woh customer ko <b>information</b> deta hai.' },
          ],
        },
        {
          id: 'notify', label: 'Coffee ready — customer ko batana', icon: '🔔',
          options: [
            { id: 'push', label: 'Push notification + app mein live status', score: 2, why: 'Do raaste isliye ki push kho sakta hai (permission off, network). App khulne par status hamesha sach dikhna chahiye.' },
            { id: 'poll', label: 'App har 5 second status poll kare', score: 1, why: 'Simple aur bharosemand — par app band ho toh kuch nahi. Ek dukaan mein 200 customers × 12 polls/min bhi kaafi load hai. Push + poll fallback behtar hai.' },
            { id: 'ws', label: 'Har customer ke liye WebSocket', score: -1, why: 'Ek-tarfa update ke liye zyada hai. Aur mobile app background mein jaate hi socket toot jaata hai — toh tumhe push chahiye hi hoga. Do systems, ek kaam.' },
          ],
        },
        {
          id: 'dup', label: 'Network gira, app ne retry kiya', icon: '🔁',
          options: [
            { id: 'idem', label: 'Client-generated order id (idempotency key)', score: 3, why: 'Wahi id dobara aaye toh wahi order laut do. Token slip wala hi idea — id se system jaanta hai ki yeh naya order hai ya wahi purana.' },
            { id: 'window', label: 'Same items + 2 min window = duplicate', score: -1, why: 'Do dost ek saath ek jaisi coffee order karein — ek reject ho jaayega. Guessing se dedup karna asli orders todta hai.' },
            { id: 'none', label: 'Kuch nahi — duplicate kam hi hote hain', score: -3, why: 'Mobile network par timeout roz ki baat hai. Yeh "customer se do baar paise liye" wala incident hai.' },
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
            'Jaani-pehchani cheez abstraction chhupa deti hai — dimaag "yeh toh coffee shop hai" bol ke pattern dhoondna band kar deta hai',
            'Sawaal bahut mushkil hai',
            'Usme technical detail nahi hai',
            'Woh coffee shop ke baare mein nahi jaante',
          ],
          answer: 0,
          explain: 'Yahi is sawaal ka poora point hai. Wahi log "Design Uber" par turant queues aur workers ki baat karte hain, par "coffee shop" par literal jawab dene lagte hain. Jargon hatne par pata chalta hai ki tumne pattern samjha tha ya sirf uska libaas pehchana tha.',
        },
        {
          q: 'Dukaan mein 8 baristas hain par 3 espresso machines. Ek aur barista rakhne se?',
          choices: [
            'Kuch nahi — bottleneck machines hain. Yeh wahi hai jaise app instances badhane se kuch na ho jab DB pool 50 par atka ho',
            'Throughput badhega',
            'Line chhoti hogi',
            'Quality behtar hogi',
          ],
          answer: 0,
          explain: 'Ek system utna hi tez hai jitna uska <b>sabse tang</b> hissa. Yeh sabse aam scaling galti hai: log woh cheez scale karte hain jo dikhti hai (app servers, baristas) na ki woh jo sach mein hadd hai (connection pool, machines). Pehle bottleneck dhoondo, phir scale karo.',
        },
        {
          q: 'Design mein fans jao toh sabse kaam ka trick?',
          choices: [
            'Use ek insaani cheez bana ke socho — dukaan, warehouse, post office. Unhone yeh problems dashakon pehle hal kar li hain',
            'Aur research karo',
            'Zyada components add karo',
            'Ek similar system copy karo',
          ],
          answer: 0,
          explain: 'Physical systems ne queueing, prioritization, batching aur degradation ke hal bahut pehle nikaal liye the — aur woh hal <b>intuitive</b> hain kyunki tumne unhe jiya hai. "Line lambi ho toh dukaan kya karti hai?" ka jawab tumhe pata hai. Wahi jawab system ka bhi hai.',
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
          '"Yeh ek task processing system hai — orders aate hain, limited resources par process hote hain, aur completion par notification jaata hai. Yaani wahi shape jo Uber, DoorDash ya video transcoding ka hai."',
          '"Pehle menu aur pricing ka schema banate hain."',
          '"Kitni dukaanein hain?"',
          '"POS system integration se shuru karta hoon."',
        ],
        answer: 0,
        explain: 'Pehle vaakye mein <b>abstraction</b> aana chahiye. Uske baad har decision apne aap justified hai — queue kyun, pool kyun, 202 kyun. Baaki teenon jawab detail mein utar jaate hain bina yeh bataye ki tum problem ko kis shape ka maan rahe ho.',
      },
      {
        q: '"Rush hour: 200 orders/min aa rahe hain, kitchen 60 bana sakti hai. Kya karoge?"',
        choices: [
          'Admission control + honest ETA. Queue depth se wait time dikhao aur ek hadd ke baad naye orders rok do — kyunki 200 &gt; 60 hai, queue kabhi khaali nahi hogi',
          'Queue mein sab le lo, dheere-dheere process hoga',
          'Zyada kitchen staff hire karo',
          'Orders reject kar do',
        ],
        answer: 0,
        explain: 'Yahan asli baat arithmetic hai: jab arrival rate service rate se hamesha zyada hai, toh queue <b>kabhi</b> khaali nahi hogi — woh sirf badhti jaayegi. Us halat mein customer ko intezaar karvana usse dhokha dena hai. Sabse imaandaar hal hai unhe sach batana, aur unhe faisla karne dena.',
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
    Uske 5 hisse likho aur unke system-naam do. Phir poochho: "yeh log overload
    kaise sambhaalte hain?" Uska jawab lagbhag hamesha tumhare system par bhi lagta hai.`,
  cards: [
    { front: 'Coffee shop asli mein kya hai?', back: 'Ek <b>task processing system</b> — orders (requests) → limited resources (pool) → completion notification. Wahi shape jo Uber/DoorDash/transcoding ka hai.' },
    { front: 'Senior engineers yahan kyun phisalte hain?', back: 'Jaani-pehchani cheez abstraction <b>chhupa</b> deti hai. Wahi log "Design Uber" par turant queues ki baat karte hain par "coffee shop" par literal jawab dete hain.' },
    { front: '8 baristas, 3 machines — barista badhao?', back: 'Kuch nahi hoga. Bottleneck <b>machines</b> hain. Wahi galti: app instances badhana jab DB pool 50 par atka ho. Pehle bottleneck dhoondo.' },
    { front: 'Token slip = ?', back: '<b>202 Accepted + job id + status endpoint</b>, aur woh id <b>idempotency</b> ka anchor bhi hai — dobara maangne par nayi coffee nahi banti.' },
    { front: '"10 items or less" lane = ?', back: '<b>Bulkhead.</b> Bada order poori line block na kare. Systems mein: bhaari kaam alag pool/queue mein.' },
    { front: 'Design mein fans jao toh?', back: 'Use ek <b>insaani cheez</b> bana ke socho — dukaan, warehouse, ER. Unhone queueing aur degradation dashakon pehle hal kiya, aur woh hal tumhe intuitively pata hain.' },
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
    'Har design ke saath uska rollback aur migration plan',
  ],
  lesson: [
    `<h3>📖 Ek hi kram, har baar</h3>
     <p>Achhe engineers har design ko naye siray se nahi sochte — unke paas ek
     <b>dhaancha</b> hota hai jo woh har baar chalate hain. Isse woh cheezein
     chhootni band ho jaati hain jo warna chhootti hain.</p>
     <pre>1. FR         system ko KYA karna hai (3–5 line, isse zyada nahi)
2. NFR        kitna, kitni jaldi, kitna bharosemand, kitna paisa
3. Estimate   traffic, data size, growth — mote numbers
4. API        entities → endpoints (5 minute, isse zyada nahi)
5. Data model access patterns → schema → indexes
6. Components services, queues, caches, stores
7. Tradeoffs  har bade faisle ka "kyun" aur uski keemat
8. Failure    10x par kya tootega, aur har hop gir jaaye toh kya</pre>
     <p class="tip">🎯 Log kadam 6 se shuru kar dete hain — boxes banane se.
     Aur isiliye unka design "sahi" ho ke bhi <b>bina karan</b> ka rehta hai.
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
     mumkin hai. "Order kabhi kho na sake, p99 200ms, 5000 rps" — yeh teen shartein
     milke tumhare aadhe faisle khud kar deti hain.</p>`,
    `<h3>🔟 "10x par kya sabse pehle tootega?"</h3>
     <p>Yeh ek sawaal poore review ka nichod hai. Aur uska jawab lagbhag hamesha
     un cheezon mein se ek hota hai jo <b>CPU se bahut pehle</b> khatam ho jaati hain:</p>
     <pre>DB connection pool      ← sabse aam
thread / worker pool
downstream rate limit
ek hot partition ya key
queue ki capacity
file descriptors
ek shared lock</pre>
     <p>Dhyaan do: <b>ek bhi CPU nahi hai.</b> Isiliye "CPU 10%, health green,
     phir bhi timeout" itna aam hai. 10x ka sawaal tumhe woh limit dhoondhne
     par majboor karta hai jo dashboard par nahi dikhti.</p>
     <h3>🔙 Do sawaal jo aksar chhoot jaate hain</h3>
     <p><b>"Migration plan kya hai?"</b> — greenfield design interview mein bhi aksar
     ek purana system hota hai. Uske bina design ek <b>kalpana</b> hai. Dual-write,
     backfill, verify, cutover — wahi kram jo tumne Data track mein seekha.</p>
     <p><b>"Rollback mein kitna waqt lagega?"</b> — yeh ek design ka gun hai, ops ka
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
        { text: 'Tradeoffs — har bade faisle ka kyun aur uski keemat', explain: 'Yahan tum dikhate ho ki tumne <b>chuna</b> hai, yaad nahi kiya. "Maine X chuna, kyunki Y; iski keemat Z hai."' },
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
      success: allOf(T_REVIEW),
      successText: `Tumne bottleneck <b>anumaan</b> se nahi, <b>maap</b> ke nikaala —
        aur woh CPU nahi tha. Yahi 10x wale sawaal ka poora faayda hai:
        woh tumhe woh hadd dhoondhne par majboor karta hai jo dashboard par
        nahi dikhti. Ab har design review mein yeh sawaal poochho.`,
      hints: [
        'Pehle mote numbers: estimate --users 12000000 --rps 500 --bytes 2048',
        'Aaj ka load: load --rps 500 --duration 8',
        'Ab 10x: load --rps 5000 --duration 8',
        'Kya toota, dekho: metrics',
        'Ek request ka waqt kahan ja raha hai: trace GET /api/v1/orders',
        'Pool hi hadd thi — use badhao: sim scale pool 200',
        'Ab 10x dobara: load --rps 5000 --duration 8',
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
        { text: 'User apne pichhle orders dekh sakta hai', bin: 'fr', explain: 'Feature — system kya karta hai. Yeh lagbhag har design mein mumkin hai, isliye ismein architecture ka koi ishara nahi hai.' },
        { text: 'Order list p99 200 ms se kam mein aaye', bin: 'nfr', explain: 'Yeh caching, indexing aur pagination ka faisla khud kar deta hai. NFR hi architecture banate hain.' },
        { text: 'Payment fail hone par order cancel ho jaaye', bin: 'fr', explain: 'Business rule — kya hona chahiye. (Iska <b>kaise</b> — saga, compensating transaction — ek design decision hai.)' },
        { text: 'System 99.95% uptime de', bin: 'nfr', explain: 'Saal mein ~4.4 ghante down. Yeh redundancy, multi-AZ aur failover ka faisla banata hai — aur woh sab paisa maangte hain.' },
        { text: 'Peak par 5,000 orders/second', bin: 'nfr', explain: 'Ek number jo poora capacity plan tay karta hai. "Bahut traffic" se koi design nahi banta; 5,000 rps se banta hai.' },
        { text: 'Refund 7 din ke andar ho sakta hai', bin: 'fr', explain: 'Business rule. (Par dhyaan do — isse ek NFR bhi nikalta hai: order data kam se kam 7 din turant milna chahiye.)' },
        { text: 'Order kabhi kho na sake — payment ke baad bhi nahi', bin: 'nfr', explain: 'Durability requirement, aur sabse mehenga. Isse outbox pattern, persistent queues aur replication sab justified ho jaate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Review ki samajh',
      questions: [
        {
          q: '"10x par kya sabse pehle tootega?" — jawab aksar kya hota hai?',
          choices: [
            'DB connection pool, thread pool, downstream rate limit, ya ek hot partition — CPU lagbhag kabhi nahi',
            'CPU',
            'Memory',
            'Network bandwidth',
          ],
          answer: 0,
          explain: 'Isiliye "CPU 10%, health green, phir bhi timeout" itna aam hai. Jo cheezein pehle khatam hoti hain woh <b>concurrency limits</b> hain, compute nahi — aur woh dashboard par nahi dikhti. 10x ka sawaal tumhe unhe naam se dhoondhne par majboor karta hai.',
        },
        {
          q: 'Design review mein sabse zyada kaunsa kadam skip hota hai?',
          choices: [
            'Failure modes — "har dependency gir jaaye toh kya" aur "10x par kya tootega"',
            'API design',
            'Data model',
            'Component diagram',
          ],
          answer: 0,
          explain: 'Design ka happy path banana majedaar hai; failure modes sochna boring hai. Par production ka 90% waqt failure modes mein hi jaata hai — aur yahi ek kadam junior aur senior design ko alag karta hai.',
        },
        {
          q: 'NFR ko architecture ka asli driver kyun kehte hain?',
          choices: [
            '"User order de sakta hai" har design mein mumkin hai. "Kabhi kho na sake + p99 200ms + 5000 rps" tumhare aadhe faisle khud kar deta hai',
            'Kyunki woh maapne laayak hain',
            'Kyunki business unhe maangta hai',
            'Kyunki woh mushkil hote hain',
          ],
          answer: 0,
          explain: 'Functional requirements batati hain ki tum <b>kya</b> bana rahe ho; non-functional batati hain ki woh <b>kaisa</b> hoga. Ek CRUD app aur ek global payment system ki FR lagbhag ek jaisi ho sakti hai — unhe alag NFR banate hain.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Review',
    instructions: 'Yeh sawaal tumhare kaam karne ka tareeka dikhate hain. 🎤',
    questions: [
      {
        q: '"Ek design review mein tum kya dhoondte ho?"',
        choices: [
          'Numbers ke saath NFR, likhe hue assumptions, 10x par pehla bottleneck, har dependency ka timeout + fallback, migration plan, aur rollback ka waqt',
          'Code quality aur naming',
          'Kya architecture patterns sahi use hue hain',
          'Kya diagram saaf hai',
        ],
        answer: 0,
        explain: 'Yeh list isliye achhi hai ki har item <b>check</b> ki ja sakti hai — "achha lag raha hai" nahi. Aur ismein woh cheezein hain jo baad mein sabse mehengi padti hain: chhupi hui assumptions, ansocha bottleneck, aur woh migration jiska plan kabhi bana hi nahi.',
      },
      {
        q: '"Design achha hai. Ise production mein kaise le jaoge?"',
        choices: [
          'Feature flag ke peechhe; shadow traffic se compare; 1% → 10% → 100%; har step par error rate + ek business metric; aur rollback ek flag door',
          'Staging mein test karke deploy kar denge',
          'Ek maintenance window mein',
          'Blue-green deployment',
        ],
        answer: 0,
        explain: 'Yeh sawaal aksar aakhir mein aata hai aur log iske liye tayyar nahi hote. Do cheezein isme khaas hain: <b>shadow traffic</b> (asli requests dono raaston par, jawab compare, bina user ko dikhaye) aur <b>business metric</b> — kyunki silent data bugs error rate par dikhte hi nahi.',
      },
    ],
  },
  success: [
    'Ek dohraane laayak design dhaancha chala sakte ho',
    'FR aur NFR alag kar sakte ho, numbers ke saath',
    '10x ka sawaal poochh ke bottleneck naam se nikaal sakte ho',
    'Har design ke saath migration aur rollback ka plan maangte ho',
  ],
  homework: `Apne kaam ka koi ek system lo aur uspar yeh dhaancha chalao — 20 minute mein.
    Sabse zaroori: "10x traffic par sabse pehle kya tootega?" Agar jawab nahi pata,
    toh ek load test lagao. Aur likho ki rollback mein kitna waqt lagta hai.`,
  cards: [
    { front: 'Design ka kram?', back: 'FR → NFR → estimates → API → data model → components → tradeoffs → <b>failure modes</b>. Log kadam 6 (boxes) se shuru karte hain — isiliye unka design bina karan ka rehta hai.' },
    { front: 'FR vs NFR?', back: '<b>FR</b> = kya karta hai (har design mein mumkin). <b>NFR</b> = kaisa (p99 200ms, 99.9%, 5000 rps, kabhi kho na sake). <b>NFR hi architecture banate hain.</b>' },
    { front: '10x par kya tootega?', back: 'DB connection pool · thread pool · downstream rate limit · hot partition · queue capacity · file descriptors. <b>CPU lagbhag kabhi nahi</b> — isiliye "CPU 10% par timeout" itna aam hai.' },
    { front: 'Review mein sabse zyada kya skip hota hai?', back: '<b>Failure modes.</b> Happy path banana majedaar hai; "har dependency gir jaaye toh kya" boring. Par production ka 90% waqt wahin jaata hai.' },
    { front: 'Do sawaal jo chhoot jaate hain?', back: '<b>"Migration plan kya hai?"</b> (bina uske design ek kalpana hai) aur <b>"rollback mein kitna waqt?"</b> (20 min = har change 20 min ka risk; 20 sec = tez chal sakte ho).' },
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
     <p>Yeh app tumne parts se shuru kiya tha — ek request ka safar, ek API ka contract,
     ek index, ek timeout. Phir tumne unhe <b>shapes</b> mein pehchana.
     Ab dono ek saath.</p>
     <p class="tip">🍽️ <b>Problem:</b> Ek food delivery system. Users nearby restaurants
     dekhte hain, order dete hain, order ek pipeline se guzarta hai (accept → cook →
     pickup → deliver), aur woh live track hota hai. 8 PM par ek shehar mein
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
     <h3>🎯 Ab isse chalaake dikhao</h3>
     <p>Neeche ek chalta hua system hai jo abhi <b>naive</b> hai: koi cache nahi,
     koi timeout nahi, pool chhota, aur ek hot cell. Tumhara kaam:
     bottleneck <b>maap ke</b> nikaalo aur ek-ek karke theek karo —
     bilkul waise jaise tumne poore app mein seekha.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'BOSS Mission — 8 PM ka peak',
      goal: `Ek food delivery system, 8 PM ka peak, 8,000 rps — aur aadha traffic ek cell se.
             <b>Har cheez maapo, phir theek karo.</b> Yeh poore app ka nichod hai.`,
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
      success: allOf(T_BOSS_SHAPES),
      successText: `👑 <b>Architect Mahaguru.</b><br><br>
        Tumne saat shapes pehchane, har ek ka failure mode pehle se naam liya,
        aur phir har fix ko <b>chalaake</b> saabit kiya — anumaan se nahi.
        Yahi poore System Gurukul ka nichod hai:
        <b>pehle pattern ka naam lo, phir uska known failure dhoondo,
        phir maap ke theek karo.</b><br><br>
        Boxes koi bhi bana leta hai. Tradeoff bolna, bottleneck maapna,
        aur "iski keemat yeh hai" keh paana — wahi architect banata hai.`,
      hints: [
        'Pehle mote numbers: estimate --users 8000000 --rps 8000 --bytes 1024',
        'Naive design par peak load: load --rps 8000 --duration 8',
        'Waqt kahan ja raha hai: trace GET /api/v1/orders',
        'Sabse bada kharch har request par COUNT(*) hai: sim set api.countTotal false',
        'Ab geo ka hot cell: cache hotkey --key cell:te7ud9 --rps 40000',
        'Us cell ko todo: cache hotkey --key cell:te7ud9 --rps 40000 --replicas 8',
        'Read path par cache — jitter ke saath: sim add cache --ttl 60 --jitter 20',
        'Ek key ke ek-saath miss: cache coalesce --misses 5000 --on',
        'Downstream ko baandho: sim add timeout restaurant_svc 300',
        "Aur uske girne par bhi jawab: sim add fallback restaurant_svc 'cached restaurant list'",
        'Ab jaake pool badhao: sim scale pool 300',
        'Ab peak dobara: load --rps 8000 --duration 8',
        'Aur budget check: slo --availability 99.9',
      ],
    },
    {
      type: 'design',
      title: 'BOSS Canvas — Poora design',
      instructions: 'Ab khaali page se. Har slot ka sahi chunav — aur galton ka why zaroor padho.',
      brief: `<b>Food delivery, ek shehar, 8 PM peak.</b> 8,000 rps, aadha traffic ek ilaake se.
        Order kabhi kho na sake, payment double na ho, aur live tracking chale.
        Yeh poore app ke saare tracks ek saath maangta hai.`,
      requirements: ['8,000 rps peak', 'p99 &lt; 300ms', 'Order kabhi kho na sake', 'Double charge kabhi nahi'],
      pass: 17,
      slots: [
        {
          id: 'nearby', label: 'Nearby restaurants', icon: '📍',
          options: [
            { id: 'cell', label: 'Geohash/H3 cell index + padosi cells + asli doori se sort', score: 3, why: 'Sahi. 2D range query par index chalta hi nahi — cell prefix se candidates lo (mota chhanna), phir un par haversine (baarik chhanna). Aur padosi cells isliye ki boundary par sabse paas wala chhoot na jaaye.' },
            { id: 'between', label: 'lat/lng par BETWEEN, dono par index', score: -3, why: 'Composite index pehli range ke baad ruk jaata hai — poori latitude patti padhni padegi. Yeh 10,000 rows tak chalta hai aur uske baad nahi.' },
            { id: 'all', label: 'Saare restaurants memory mein, har baar doori nikaalo', score: -1, why: 'Ek shehar mein shayad chal bhi jaaye — par har request par har restaurant ka hisaab O(n) hai, aur multi-city par yeh khatam. Aur har instance ko poora dataset chahiye.' },
          ],
        },
        {
          id: 'hotcell', label: '8 PM: aadha traffic ek cell se', icon: '🔥',
          options: [
            { id: 'split', label: 'Us cell ko chhoti precision par todo + uska data replicate karo', score: 3, why: 'Hot key ka wahi ilaaj, geo par. Fixed grid size lagbhag hamesha galti hai — density ke hisaab se cell chhoti karo, aur us cell ka cached data N copies mein rakho.' },
            { id: 'more', label: 'Aur cache nodes add karo', score: -2, why: 'Ek cell hamesha <b>ek</b> node par hash hoti hai. Nodes badhane se woh cell nahi bantegi — baaki nodes khaali baithe rahenge aur wahi ek jalta rahega.' },
            { id: 'nothing', label: 'Kuch nahi, cache sambhaal lega', score: -3, why: 'Cache ek key ka load ek node par le jaata hai — woh hot cell ko <b>banata</b> hai, hataata nahi.' },
          ],
        },
        {
          id: 'order', label: 'Order ka lifecycle', icon: '🔄',
          options: [
            { id: 'saga', label: 'Orchestrated saga + har step ka compensating action', score: 3, why: 'Order kai services chhoota hai (payment, restaurant, delivery) aur beech mein fail ho sakta hai. Orchestrator ek jagah state rakhta hai, isliye "order kahan atka hai" ka jawab hota hai — choreography mein woh sawaal sabse mushkil ho jaata hai.' },
            { id: '2pc', label: 'Distributed transaction (2PC)', score: -2, why: '2PC ke liye saare participants ka ek saath zinda hona zaroori hai, aur coordinator girne par locks latke reh jaate hain. Third-party payment gateway par toh yeh mumkin hi nahi.' },
            { id: 'chain', label: 'Har service agla event fire kare (choreography)', score: 0, why: 'Chalta hai aur loosely coupled hai — par 6 steps ke baad koi nahi bata sakta ki poora flow kya hai. Aur "yeh order 40 min se atka hai, kyun?" ka jawab dhoondhna mushkil ho jaata hai. Chhote flows ke liye theek, is ke liye nahi.' },
          ],
        },
        {
          id: 'pay', label: 'Payment', icon: '💰',
          options: [
            { id: 'idem', label: 'Idempotency key + immutable ledger entries + roz reconciliation', score: 3, why: 'Teenon chahiye: key duplicates rokti hai, entries itihaas aur audit deti hain, reconciliation kho gaye/alag records pakadti hai. Exactly-once mumkin nahi — isliye "roko + pakdo" dono lagte hain.' },
            { id: 'retry', label: 'Fail par retry, balance column update karo', score: -3, why: 'Bina idempotency key ke retry <b>double charge</b> hai. Aur balance column itihaas mita deta hai — dispute par tumhare paas koi jawab nahi bachega.' },
          ],
        },
        {
          id: 'track', label: 'Live tracking', icon: '🔌',
          options: [
            { id: 'sse', label: 'SSE/WebSocket alag gateway layer par, beech mein pub/sub', score: 2, why: 'Connections ek alag capacity dimension hain — gateway sirf sockets rakhe, logic peechhe. Pub/sub isliye ki user aur driver do alag gateways par hote hain.' },
            { id: 'poll', label: 'App har 3 second location poll kare', score: 0, why: 'Simple aur bharosemand — par 8 PM par 50,000 active orders × 20 polls/min = 16,000 rps sirf tracking ke liye. Ek delivery ke doraan yeh mehenga pad jaata hai.' },
            { id: 'db', label: 'Har location ping DB mein insert karo', score: -3, why: 'Driver locations <b>current state</b> hain, history nahi. Har ping DB mein daalna write storm hai — aur 20 second purana location ka koi mol hi nahi. In-memory geo store chahiye.' },
          ],
        },
        {
          id: 'fail', label: 'Restaurant service dheemi ho gayi', icon: '🛡️',
          options: [
            { id: 'full', label: 'Timeout + breaker + cached list ka fallback', score: 3, why: 'Teenon milke kaam karte hain: timeout tumhare threads bachaata hai, breaker fail-fast karta hai (taaki har request 300ms na gawaaye), aur fallback user ko phir bhi kuch dikhata hai. Ek bhi missing ho toh baaki adhoore reh jaate hain.' },
            { id: 'retry', label: 'Retry karo jab tak jawab na mile', score: -3, why: 'Dheeme downstream par retry usse aur dabata hai — yeh retry storm hai. Aur tumhare threads bhi utne hi der latke rehte hain.' },
            { id: 'to', label: 'Sirf timeout', score: 1, why: 'Zaroori hai par akela kaafi nahi: har request phir bhi 300ms gawaayegi aur error degi. Breaker us gawaai ko rokta hai, aur fallback error ko jawab mein badal deta hai.' },
          ],
        },
      ],
      verdicts: {
        great: '👑 <b>Architect Mahaguru.</b> Saat shapes, saat failure modes, aur har ek ka ilaaj — sab pehle se pata tha. Yahi poore app ka nichod hai.',
        ok: '💪 Bahut kuch sahi hai. Jahan galti hui, wahan ek shape ka failure mode chhoot gaya — uska why padho, woh exact incident kisi na kisi din aata hai.',
        bad: '🤔 Dobara shuru karo: pehle har hisse ka <b>shape</b> likho, phir uska known failure mode. Ilaaj apne aap saamne aa jaayega.',
      },
    },
    {
      type: 'quiz',
      title: 'BOSS — Poore app ka nichod',
      questions: [
        {
          q: 'Ek design problem par sabse pehla kadam?',
          choices: [
            'Har hisse ka shape likho — kyunki naam ke saath uska known failure mode aata hai',
            'Components ka diagram banao',
            'Database chuno',
            'Scale estimate karo',
          ],
          answer: 0,
          explain: 'Poore is track ka yahi ek vaakya hai. Shape ka naam ek <b>checklist unlock</b> karta hai. Scale estimate karna zaroori hai — par woh <b>doosra</b> kadam hai; pehle yeh jaano ki problem kis aakaar ki hai.',
        },
        {
          q: '"CPU 10%, memory theek, health green — par requests timeout kar rahi hain." Sabse pehle kya dekhoge?',
          choices: [
            'Concurrency limits — DB connection pool, thread pool, downstream rate limit. Ek trace lo aur dekho ki waqt kahan wait mein ja raha hai',
            'CPU profiling',
            'Network latency',
            'Garbage collection',
          ],
          answer: 0,
          explain: 'Health check green isliye hai kyunki usne DB chhua hi nahi. CPU 10% isliye hai kyunki threads <b>wait</b> kar rahe hain, kaam nahi kar rahe. Jo cheezein CPU se pehle khatam hoti hain woh concurrency limits hain — aur ek trace turant dikha deta hai ki 96% waqt <code>pool.acquire()</code> mein ja raha hai.',
        },
        {
          q: 'Ek naya pattern add karne se pehle ka sawaal?',
          choices: [
            '"Yeh kis cheez ko theek kar raha hai, jo abhi sach mein toota hua hai?" — aur "iski keemat kya hai?"',
            '"Yeh kitna scale karega?"',
            '"Baaki log kya use karte hain?"',
            '"Team ko aata hai?"',
          ],
          answer: 0,
          explain: 'Har pattern ek vyapaar hai. Agar tum uski <b>keemat</b> nahi bata sakte, toh tumne use samjha nahi — bas uska naam seekha hai. Aur agar dard aaj nahi hai, toh complexity ki keemat aaj chukane ki koi wajah nahi.',
        },
        {
          q: 'Design ka sabse zyada skip kiya jaane wala kadam?',
          choices: [
            'Failure modes — "10x par kya tootega" aur "har dependency gir jaaye toh kya"',
            'API design',
            'Data modeling',
            'Estimation',
          ],
          answer: 0,
          explain: 'Happy path banana majedaar hai, failure modes sochna boring. Par production ka lagbhag saara waqt failure modes mein jaata hai — aur yahi ek kadam junior aur senior design ko alag karta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'FINAL Round — Architect',
    instructions: 'Aakhri chaar sawaal. Yeh poore app ka saar hain. 🎤👑',
    questions: [
      {
        q: '"Ek line mein — achha system design kya hai?"',
        choices: [
          'Woh jismein har faisla ek maapi hui zaroorat se aaya ho, aur har faisle ki keemat likhi hui ho',
          'Woh jo scale kar sake',
          'Woh jo modern patterns use kare',
          'Woh jo simple ho',
        ],
        answer: 0,
        explain: 'Ismein dono halves zaroori hain. "Maapi hui zaroorat" premature optimization rokti hai. "Keemat likhi hui" dikhati hai ki tumne <b>chuna</b> hai, yaad nahi kiya. Simplicity ek achha default hai, par woh apne aap mein manzil nahi — kabhi-kabhi problem sach mein mushkil hoti hai.',
      },
      {
        q: '"Tumhare design ka sabse kamzor hissa kya hai?"',
        choices: [
          'Ek asli kamzori naam se batao, uska blast radius bolo, aur kya monitor karoge yeh bhi — "sabse pehle X tootega, isliye maine uspar alert lagaya hai"',
          '"Koi kamzori nahi hai"',
          '"Zyada testing chahiye"',
          '"Scale par pata chalega"',
        ],
        answer: 0,
        explain: 'Yeh sawaal <b>parakhne</b> ke liye hota hai ki tum apne hi design ko critically dekh sakte ho ya nahi. "Koi kamzori nahi" ka matlab hai tumne socha hi nahi. Har design mein kamzori hai — seniority ka signal yeh hai ki tum jaante ho woh kahan hai, kitni buri hai, aur uska pata kaise chalega.',
      },
      {
        q: '"Tumhara design production mein 6 mahine chala. Ab kya dekhoge?"',
        choices: [
          'Kaunse anumaan galat nikle (traffic shape, data size, access pattern), kya cheez ab zaroorat se zyada complex hai, aur kaunsa hissa ab hataya ja sakta hai',
          'Kitna scale hua',
          'Kitne bugs aaye',
          'Team kitni khush hai',
        ],
        answer: 0,
        explain: 'Do cheezein isme khaas hain. Ek: <b>anumaan check karna</b> — design ke waqt tumne guess kiya tha, ab tumhare paas data hai. Do: <b>hataana</b>. Jo engineer sirf jodta hai uska system har saal bhaari hota jaata hai. "Yeh ab zaroori nahi, nikaal dete hain" un jawaabon mein hai jo sabse kam sune jaate hain.',
      },
      {
        q: '"Ek junior ko system design sikhana ho toh sabse pehle kya sikhaoge?"',
        choices: [
          'Boxes se pehle problem ka naam lena — aur har faisle ke saath uski keemat bolna',
          'CAP theorem',
          'Microservices architecture',
          'Kaunsa database kab use karein',
        ],
        answer: 0,
        explain: 'Yahi poore System Gurukul ka saar hai. Baaki sab <b>vocabulary</b> hai — zaroori, par uske baad ka. Naam lene se socha hua design banta hai; keemat bolne se pata chalta hai ki tumne samjha hai. Yeh do aadatein baaki sab kuch apne aap sikha deti hain. 👑',
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
    Phir woh page apni team ko dikhao. Yahi asli design review hai.`,
  cards: [
    { front: 'Design ka pehla kadam?', back: 'Har hisse ka <b>shape</b> likho. Naam ke saath uska known failure mode aata hai — aur wahi agla sawaal hai. Scale estimate doosra kadam hai.' },
    { front: 'Food delivery mein kitne shapes?', back: 'Saat — geo, read-heavy, workflow, ledger, realtime fanout, notification, search. Aur har failure mode pehle se pata hai. Yahi patterns ka poora faayda hai.' },
    { front: '"CPU 10% par timeout" — pehla kadam?', back: '<b>Concurrency limits</b> dekho, CPU nahi. Ek <code>trace</code> lo — 96% waqt aksar <code>pool.acquire()</code> mein hota hai. Health green isliye hai ki usne DB chhua hi nahi.' },
    { front: 'Naya pattern add karne se pehle?', back: '"Yeh kis cheez ko theek kar raha hai, jo <b>abhi</b> toota hua hai?" aur "iski keemat kya hai?" Keemat na bata sako toh samjha nahi — naam seekha hai.' },
    { front: 'Achha system design ek line mein?', back: 'Jismein har faisla ek <b>maapi hui zaroorat</b> se aaya ho, aur har faisle ki <b>keemat likhi</b> ho.' },
    { front: '6 mahine baad kya dekhein?', back: 'Kaunse <b>anumaan galat</b> nikle, aur ab kya <b>hataya</b> ja sakta hai. Jo engineer sirf jodta hai, uska system har saal bhaari hota jaata hai.' },
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
  title: 'Kaunsa Aujaar Kab — Aur Uska "Yeh Mat Karo"',
  badge: 'Tool Tapasvi',
  objectives: [
    'Har technology ek <b>kaam</b> ke liye hai, sab kaam ke liye nahi',
    'Har ek ka jaana-pehchana galat istemaal',
    'Interview mein "NoSQL for scale" jaisi baatein kyun kaatti hain',
    'Ek default stack, aur usse hatne ke saaf karan',
  ],
  lesson: [
    `<h3>📖 Aujaaron ka naksha</h3>
     <table>
       <tr><th>Aujaar</th><th>Kis kaam ke liye</th><th>❌ Yeh mat karo</th></tr>
       <tr><td><b>Postgres / MySQL</b></td><td>Transactions, joins, constraints — <b>default</b></td><td>Ismein 4 GB videos mat rakho; crore rows par analytics mat chalao</td></tr>
       <tr><td><b>Cassandra / Scylla</b></td><td>Bhaari writes, time-series, known access pattern</td><td>Ad-hoc queries mat maango; joins hai hi nahi; partition key baad mein nahi badal sakte</td></tr>
       <tr><td><b>DynamoDB</b></td><td>Predictable key-value at scale, zero ops</td><td>Access pattern <b>pehle</b> socho — warna scans par bill aur latency dono phatenge</td></tr>
       <tr><td><b>Redis</b></td><td>Cache, counters, rate limit, locks, sorted sets, pub/sub</td><td>Source of truth mat banao (memory hai); ek key par crore rps mat daalo</td></tr>
       <tr><td><b>Elasticsearch</b></td><td>Full-text search, facets, fuzzy</td><td>Source of truth mat banao; tezi se badalne wala data (daam) mat rakho</td></tr>
       <tr><td><b>Kafka</b></td><td>Durable log, replay, kai consumers, ordering by key</td><td>Sirf background jobs ke liye mat lagao; sync request path mein mat daalo</td></tr>
       <tr><td><b>SQS / RabbitMQ</b></td><td>Background jobs, retries, DLQ</td><td>Replay mat maango; "kai teams ko wahi data" mat maango</td></tr>
       <tr><td><b>S3 / blob</b></td><td>Bytes — files, media, backups, data lake</td><td>Database mat banao; usme "query" karne ki koshish mat karo</td></tr>
       <tr><td><b>ClickHouse / BigQuery</b></td><td>OLAP — crore rows par aggregate</td><td>Single-row updates mat karo; ise OLTP ki jagah mat use karo</td></tr>
       <tr><td><b>CDN</b></td><td>Static + rarely-changing dynamic, edge par</td><td>Personalized responses bina <code>Vary</code>/cache-key ke mat cache karo</td></tr>
     </table>`,
    `<h3>🎯 Ek default stack — aur usse hatne ke karan</h3>
     <p>Zyadatar systems ki shuruaat yeh honi chahiye:</p>
     <pre>Postgres    +    Redis    +    S3    +    ek queue
(sab kuch)    (cache/lock)   (bytes)   (background jobs)</pre>
     <p>Aur uske baad, sirf tab hato jab ek <b>maapa hua</b> karan ho:</p>
     <table>
       <tr><th>Yeh maapa</th><th>Toh yeh jodo</th></tr>
       <tr><td>Full-text search par LIKE full scan kar raha hai</td><td>Elasticsearch</td></tr>
       <tr><td>Kai teams ko wahi events chahiye, ya replay chahiye</td><td>Kafka</td></tr>
       <tr><td>Analytics queries OLTP DB ka buffer pool dho rahi hain</td><td>Columnar store (ClickHouse/BigQuery)</td></tr>
       <tr><td>Ek table ka write rate ek machine se bahar ja raha hai</td><td>Cassandra / sharding</td></tr>
       <tr><td>Users door hain aur latency physics ki hadd par hai</td><td>CDN / regional deployment</td></tr>
     </table>
     <p class="tip">🎯 Dhyaan do ki har row mein baayen taraf ek <b>maapi hui cheez</b> hai —
     "shayad aage chal ke" nahi. Yeh table ek permission slip hai: jab woh cheez
     sach mein ho rahi ho, tab naya aujaar lena bilkul sahi hai. Us se pehle woh
     sirf complexity hai jiska koi kharidaar nahi.</p>
     <h3>🗣️ Interview mein kya nahi bolna</h3>
     <table>
       <tr><th>❌ Yeh</th><th>✅ Iski jagah</th></tr>
       <tr><td>"Scale ke liye NoSQL chahiye"</td><td>"Is table ka write rate X hai jo ek node se bahar hai, aur access pattern hamesha by user_id — isliye Cassandra"</td></tr>
       <tr><td>"Mere data mein relationships hain isliye SQL"</td><td>"Mujhe multi-row transactions aur ad-hoc joins chahiye — isliye Postgres"</td></tr>
       <tr><td>"Redis laga denge"</td><td>"Yeh key, yeh structure (sorted set), yeh TTL, aur miss par yeh hota hai"</td></tr>
       <tr><td>"Kafka laga denge"</td><td>"Mujhe replay aur teen independent consumers chahiye — warna SQS kaafi thi"</td></tr>
     </table>
     <p>Farak yeh hai ki daayen taraf har jawab mein ek <b>zaroorat</b> hai
     jisse woh chunav nikla. Baayen taraf sirf aujaar ka naam hai.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Zaroorat → aujaar',
      pairs: [
        { left: '"Order banao aur inventory ghatao — dono ya koi nahi"', right: 'Postgres (multi-row transaction)', explain: 'Atomicity across rows. Yahi relational DB ka sabse mazboot gun hai, aur yahi cheez zyadatar NoSQL mein nahi milti.' },
        { left: '"Aakhri 30 din ke sensor readings, by device"', right: 'Cassandra / time-series DB', explain: 'Bhaari append, kabhi update nahi, aur read hamesha range-scan by (device, time). Partition key saaf hai — Cassandra isi shape ke liye bana hai.' },
        { left: '"Top 100 players ka leaderboard, live"', right: 'Redis sorted set', explain: '<code>ZADD</code>/<code>ZREVRANGE</code> — O(log n) insert aur O(log n + k) top-k. Yeh SQL mein <code>ORDER BY score LIMIT 100</code> hai jo har baar chalti hai; Redis mein woh structure hi ordered rehta hai.' },
        { left: '"Product name aur description mein dhoondo, typo ke saath"', right: 'Elasticsearch', explain: 'Inverted index + analyzers + fuzzy matching. LIKE se yeh ho hi nahi sakta, aur GIN se fuzzy/relevance nahi milta.' },
        { left: '"Order events analytics, ML aur fraud teenon ko chahiye"', right: 'Kafka', explain: 'Ek data, teen <b>independent</b> consumers, har ek ka apna offset. Queue mein woh events baant liye jaate.' },
        { left: '"User ke uploaded videos"', right: 'S3 + CDN', explain: 'Bytes object storage mein, metadata DB mein, delivery CDN se. DB mein BLOB rakhna buffer pool aur backups dono kha jaata hai.' },
        { left: '"Pichhle saal ka revenue by region by month"', right: 'ClickHouse / BigQuery', explain: 'Saari rows, thodi columns, aggregate. Row store ko har row ki har column padhni padegi; columnar sirf 3 columns padhega aur 10x compress karega.' },
      ],
    },
    {
      type: 'bins',
      title: 'Yeh statement — sahi ya kaatne laayak?',
      instructions: 'Design review mein tum kya kehte?',
      bins: [
        { id: 'ok', label: '✅ Chalega' },
        { id: 'push', label: '🔍 Isko kaato' },
      ],
      items: [
        { text: '"Scale ke liye NoSQL use karenge"', bin: 'push', explain: 'Postgres bhi bahut achha scale karta hai. Sawaal <b>kya</b> scale nahi kar raha — writes? dataset size? ek hot partition? Har ek ka ilaaj alag hai, aur kuch ka ilaaj NoSQL hai hi nahi.' },
        { text: '"Is table ka write rate 80k/sec hai jo ek node se bahar hai, aur read hamesha (device_id, time) range hai — isliye Cassandra"', bin: 'ok', explain: 'Ismein number hai, access pattern hai, aur chunav us se nikla hai. Yahi ek achhe technology decision ka shape hai.' },
        { text: '"Redis laga denge speed ke liye"', bin: 'push', explain: 'Kaunsi key? Kaunsa data structure? TTL? Miss par kya? Invalidate kaun karega? Aur agar Redis gir jaaye toh DB kitna load lega? "Redis laga denge" abhi ek design nahi hai.' },
        { text: '"Mere data mein relationships hain isliye SQL"', bin: 'push', explain: 'NoSQL mein bhi relationships rakhi ja sakti hain (denormalize karke ya application join se). Asli karan hona chahiye: <b>multi-row transactions</b> aur <b>ad-hoc queries</b> — yeh cheezein sach mein sirf relational deta hai.' },
        { text: '"Search ke liye Elasticsearch, par source of truth Postgres rahega aur sync CDC se hoga"', bin: 'ok', explain: 'Aujaar bhi sahi, aur uska <b>rishta</b> bhi saaf hai — kaun source hai, data kaise pahunchega. Yeh doosra hissa hi log bhool jaate hain.' },
        { text: '"Har cheez ke liye microservices, taaki independently scale ho"', bin: 'push', explain: 'Kaun sa hissa alag scale kar raha hai? Aur kya problem <b>scaling</b> ka hai ya <b>team</b> ka? Microservices ka asli faayda organizational hai — aur uski keemat har call ka network call ban jaana hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Chunav ki samajh',
      questions: [
        {
          q: 'Ek naye product ka default stack kya hona chahiye?',
          choices: [
            'Postgres + Redis + S3 + ek queue — aur usse tabhi hato jab koi MAAPI hui cheez tumhe majboor kare',
            'Microservices + Kafka + Cassandra',
            'Jo team ko aata ho',
            'Serverless sab kuch',
          ],
          answer: 0,
          explain: 'Yeh boring stack 90% products ko unke kaam ke aakhir tak le jaata hai — aur usme <b>ek</b> cheez monitor karni hai, <b>ek</b> backup lena hai, aur ek transaction mein sab kuch atomic hai. (Team ki familiarity bhi ek asli aur wajib factor hai — par woh <b>doosra</b> sawaal hai, pehla nahi.)',
        },
        {
          q: '"Redis ko source of truth bana lete hain, woh persist bhi karta hai" — kya galat hai?',
          choices: [
            'Persistence hai par woh memory-first hai: dataset RAM se bada nahi ho sakta, aur crash par aakhri kuch second ke writes ja sakte hain (AOF ke config par nirbhar)',
            'Redis persist nahi karta',
            'Redis slow hai',
            'Kuch galat nahi',
          ],
          answer: 0,
          explain: 'Redis ka RDB/AOF asli hai — par uska poora design <b>memory-first</b> hai. Do cheezein isse durable store banne se rokti hain: dataset ko RAM mein aana hi padega (mehenga, aur ek hadd hai), aur default fsync policy par crash mein aakhri kuch second ke writes ja sakte hain. Cache aur ephemeral state ke liye woh bemisaal hai; ledger ke liye nahi.',
        },
        {
          q: 'Interview mein "Kafka use karunga" bola. Sabse achha follow-up jawab?',
          choices: [
            '"Kyunki mujhe replay aur teen independent consumers chahiye — agar yeh nahi chahiye hote toh SQS simple aur sasti hoti"',
            '"Kyunki woh high throughput handle karta hai"',
            '"Kyunki woh industry standard hai"',
            '"Kyunki woh durable hai"',
          ],
          answer: 0,
          explain: 'Sabse majboot hissa woh aakhri clause hai: <b>"agar yeh nahi chahiye hote toh SQS"</b>. Woh dikhata hai ki tumne chunav <b>kiya</b> hai, default nahi maara — aur ki tum ulti disha bhi soch sakte ho. "High throughput" aur "industry standard" wale jawab batate hain ki tum naam jaante ho, karan nahi.',
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
            { id: 'pg', label: 'Postgres', score: 3, why: 'Transactions, constraints, joins, aur ek hi cheez chalani hai. 200 customers par yeh ek aasan jeet hai — aur agli 10,000 customers tak bhi chalega.' },
            { id: 'dynamo', label: 'DynamoDB', score: -1, why: 'Zero-ops achha hai, par ab tumhe har access pattern <b>pehle</b> design karna padega — aur ek naye product mein woh pattern har hafte badalte hain. Ad-hoc query ki azaadi yahan sabse zyada kaam ki cheez hai.' },
            { id: 'mongo', label: 'MongoDB', score: 0, why: 'Chalega. Par "schema flexible chahiye" aksar "humne schema socha nahi" ka doosra naam hota hai — aur Postgres ka JSONB wahi flexibility <b>transactions ke saath</b> de deta hai.' },
          ],
        },
        {
          id: 'upload', label: '2 GB CSV uploads', icon: '📤',
          options: [
            { id: 's3', label: 'Presigned URL se seedha S3, phir async parse', score: 3, why: 'Bytes app server se guzarte hi nahi, aur parsing ek background job hai. Yeh do faisle milke poore upload path ko sasta aur bharosemand bana dete hain.' },
            { id: 'proxy', label: 'App server ke through, phir DB mein', score: -3, why: 'Ek 2 GB upload minute bhar ek concurrency slot pakadta hai; kuch upload ek saath = poori API timeout. Aur raw CSV DB mein rakhna use dho dega.' },
          ],
        },
        {
          id: 'analytics', label: 'Dashboard aggregates', icon: '📊',
          options: [
            { id: 'pg2', label: 'Abhi Postgres — 200 customers par woh kaafi hai; materialized views se', score: 2, why: 'Sahi soch. Is size par alag OLAP store ek aisi problem ka hal hai jo abhi hai hi nahi. Materialized views bhaari queries ko pehle se compute kar deti hain. Jab woh dabne lage, <b>tab</b> ClickHouse.' },
            { id: 'ch', label: 'ClickHouse, abhi se', score: -1, why: 'Aage kaam aayega — par abhi ek aur system chalana, ek aur sync pipeline, aur ek chhoti team ke liye ek aur on-call. Yeh "maapa hua karan" wala test paas nahi karta.' },
            { id: 'sparkq', label: 'Spark job har raat', score: -2, why: 'Dashboard ko raat purana data dikhega, aur poora ek batch cluster maintain karna padega — 200 customers ke liye.' },
          ],
        },
        {
          id: 'search', label: 'Records mein search', icon: '🔍',
          options: [
            { id: 'gin', label: 'Postgres full-text (GIN index)', score: 2, why: 'Is scale par bilkul sahi. Ek aur system nahi, ek aur sync pipeline nahi, aur data hamesha taaza. Jab relevance tuning aur facets sach mein chahiye ho, tab Elasticsearch.' },
            { id: 'es', label: 'Elasticsearch, abhi se', score: -1, why: 'Uska asli faayda (relevance, facets, fuzzy at scale) abhi zaroorat mein nahi hai — par uski keemat (cluster, CDC pipeline, indexing lag ka UX) abhi se chukani padegi.' },
            { id: 'like', label: "LIKE '%...%'", score: -2, why: 'Aaj chalega aur ek din achanak nahi chalega — aur woh din bina warning ke aata hai. Kam se kam GIN index lagao, jo lagbhag muft hai.' },
          ],
        },
        {
          id: 'email', label: 'Email alerts', icon: '📬',
          options: [
            { id: 'queue', label: 'Ek simple queue (SQS ya DB table + SKIP LOCKED)', score: 2, why: 'Kaam lo, karo, retry, DLQ. Yahan replay ya kai consumers ki koi zaroorat nahi — isliye sabse simple aujaar sahi aujaar hai.' },
            { id: 'kafka', label: 'Kafka', score: -2, why: 'Ek chhoti team ke liye ek poora cluster, sirf emails bhejne ke liye. Kafka ke teenon gun (replay, kai consumers, ordering) yahan use hi nahi ho rahe.' },
            { id: 'sync', label: 'Request ke andar hi bhej do', score: -2, why: 'Email provider slow ya down hua toh tumhari API bhi. Yeh async ka textbook case hai.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Boring stack, saaf karan. Har aujaar ek asli zaroorat se aaya, "aage chal ke" se nahi.',
        ok: '👍 Zyadatar sahi. Ek-do jagah tum aaj ki keemat ek kal ki problem ke liye chuka rahe ho.',
        bad: '🤔 200 customers hain. Har chunav se pehle poochho: "yeh kis cheez ko theek kar raha hai, jo ABHI toota hua hai?"',
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
          '"Ye is par nirbhar hai ki mujhe kya chahiye — multi-row transactions aur ad-hoc queries? Postgres. Ek jaana-pehchana access pattern aur bhaari writes jo ek node se bahar hain? Cassandra. Ek hi jawab dono ke liye nahi hai."',
          '"NoSQL, kyunki humein scale chahiye"',
          '"SQL, kyunki data structured hai"',
          '"Dono use karenge"',
        ],
        answer: 0,
        explain: 'Yeh sawaal aksar ek <b>jaal</b> hota hai — interviewer dekhna chahta hai ki tum "SQL vs NoSQL" ke ratay hue points sunaate ho ya requirements par wapas jaate ho. Aur asli baat yeh hai ki "structured data" dono mein rakha ja sakta hai; farak <b>transactions, query flexibility aur write scaling</b> mein hai.',
      },
      {
        q: '"Tumne 5 alag technologies chuni hain. Koi dikkat?"',
        choices: [
          'Haan — har ek ka apna failure mode, apna scaling behaviour, apna on-call hai. Main pehle poochhunga ki kaunsi 2 ko hataya ja sakta hai, aur bachi hui har ek ke liye ek maapa hua karan chahiye',
          'Nahi, har ek apne kaam ke liye best hai',
          'Nahi, cloud sab manage kar deta hai',
          'Haan par woh zaroori hai',
        ],
        answer: 0,
        explain: 'Har naya system ek <b>multiplier</b> hai: ek aur cheez jo gir sakti hai, ek aur cheez jise upgrade karna hai, ek aur cheez jo naye engineer ko seekhni hai, aur ek aur jagah jahan data alag ho sakta hai. "Har ek apne kaam ke liye best hai" un jawaabon mein se hai jo local level par sahi hote hain aur system level par galat.',
      },
    ],
  },
  success: [
    'Har aam technology ka kaam aur uska "yeh mat karo" bata sakte ho',
    'Ek default stack se shuru karke maape hue karan par hat sakte ho',
    '"NoSQL for scale" jaisi baaton ko kaat sakte ho',
    'Har chunav ke saath ek zaroorat bol sakte ho',
  ],
  homework: `Apne system ke saare data stores aur infra pieces list karo.
    Har ek ke saamne likho: (1) kaunsi zaroorat se aaya, (2) woh zaroorat aaj bhi hai?,
    (3) kya iska kaam kisi doosre maujood system se ho sakta hai?
    Agar do systems ek jaisa kaam kar rahe hain, ek hataane ka case ban gaya.`,
  cards: [
    { front: 'Default stack?', back: '<b>Postgres + Redis + S3 + ek queue.</b> Isse hato sirf jab koi <b>maapi hui</b> cheez majboor kare — "aage chal ke" ek karan nahi hai.' },
    { front: 'Redis source of truth?', back: '<b>Nahi.</b> Memory-first — dataset RAM mein aana hi padega, aur crash par aakhri kuch second ke writes ja sakte hain. Cache/counters/locks/sorted sets ke liye bemisaal.' },
    { front: '"Scale ke liye NoSQL" — kya kaato?', back: 'Poochho <b>kya</b> scale nahi kar raha: writes? dataset size? hot partition? Postgres bhi bahut achha scale karta hai. Karan hona chahiye: write rate + access pattern.' },
    { front: 'Kafka vs SQS?', back: 'Kafka tabhi jab <b>replay</b>, <b>kai independent consumers</b>, ya <b>key-wise ordering</b> chahiye. Warna SQS simple aur sasti hai.' },
    { front: 'Elasticsearch kab?', back: 'Jab full-text/fuzzy/facets chahiye <b>aur</b> Postgres GIN dab raha ho. Aur hamesha: source of truth DB, sync CDC se, badalne wala data (daam) index mein nahi.' },
    { front: '5 alag technologies ka nuksaan?', back: 'Har ek = ek aur failure mode + upgrade + on-call + ek aur jagah jahan data alag ho sakta hai. Pehle poochho: <b>kaunsi 2 hataayi ja sakti hain?</b>' },
  ],
},
]);
