(() => {
/* =====================================================================
   GAP LEVELS — maujooda tracks ke BEECH mein daale gaye levels

   SD.registerLevelsAfter(trackId, afterId, levels) target level ke turant
   BAAD insert karta hai. Isliye:

   ⚠️ YEH FILE SABSE AAKHIR MEIN LOAD HONI CHAHIYE (app.js se pehle).
      Agar target track abhi register hua hi nahi hai toh registerLevelsAfter
      chupchaap append kar dega — aur boss level track ke aakhir mein nahi
      rahega. index.html mein script ka kram mat badalna.

   Source: is round mein The Feed track ke saath jo content aaya, uska woh
   hissa jo maujooda tracks mein sahi baithta hai.

   ✍️ LIKHNE KA NIYAM (ADHD): "yeh / woh / uska / isse / wahan" ko kisi
   pehle bataye hue naam ki jagah mat likho — naam DOBARA likho.
   ===================================================================== */
(function () {

/* =====================================================================
   BUILDS track mein do naye worked designs — youtube ke baad,
   boss-uber se pehle.
   ===================================================================== */
const T_DROPBOX = [
  { text: 'Traffic aur storage ka andaaza lagao',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: '10 crore chunks, 1% galti: Bloom filter (pehli chhanni) ka size naapo — "shayad hai" par content hash se pakki jaanch',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.items === 100000000 && r.fpRate <= 1.01) },
  { text: 'Metadata row key ke liye 10 lakh ULID inserts — ULID content hash ki jagah nahi leta',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.sortable === true && r.type === 'ulid' && r.rows === 1000000) },
  { text: "Metadata list par 12,000 rps ka load — system bhar jaata hai",
    check: s => s.records.some(r => r.kind === 'load' && r.rps === 12000 && r.saturated) },
  { text: "Metadata par cache lagao: TTL 300s, jitter 20%, hit-rate 1 (garam cache maan ke)",
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache' && s.sys.api.cache?.ttlSec === 300 && s.sys.api.cache.jitterPct === 20 && s.sys.api.cache.hitRate === 1) },
  { text: 'Ek shared link viral ho gaya',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'file:qtr-report key ki copies banao — 50,000 rps baanto',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1 && r.rps === 50000 && r === SD.mission.latest(s, 'cache', 'hotkey')) },
  { text: 'Ek badi file = bahut saare chunks — 60 chunks par protocol ka farak dekho',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'compare' && r.assets === 60) },
  { text: "12,000 rps ka metadata load dobara — system na bhare, backend errors zero", check: s => SD.mission.current(s, 'load', r => r.rps === 12000 && !r.saturated && r.errPct === 0) },
];

const T_CRAWLER = [
  { text: 'Crawl ka paimana nikalo',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'URL dedup ka index — bloom filter se naapo',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.fpRate < 2) },
  { text: 'Unique pages ginne ka sasta tareeka — HLL',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'hll') },
  { text: 'Frontier queue: consumers partitions se zyada — kuch khaali baithenge',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle > 0) },
  { text: 'Partitions aur consumers barabar karo — koi consumer khaali na baithe',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle === 0 && r === SD.mission.latest(s, 'stream', 'partitions')) },
  { text: 'Alag prayog: domain:wikipedia.org key par 50,000 rps',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'domain:wikipedia.org key ki copies banao (simulator crawl ki tameez — ek site par kitni raftaar — nahi dikhata)',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1 && r.rps === 50000 && r === SD.mission.latest(s, 'cache', 'hotkey')) },
  { text: 'Thande connection ka kharcha dekho (DNS + TCP + TLS)',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === false) },
  { text: 'Aakhri trace garam connection par ho — handshake ka farak dekho',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === true && r === SD.mission.latest(s, 'net', 'trace')) },
];

SD.registerLevelsAfter('builds', 'youtube', [
{
  id: 'dropbox',
  icon: '📦',
  title: 'Build #7 — File Storage & Sync',
  badge: 'Sync Shilpi',
  objectives: [
    'Large-file bytes ka direct path aur metadata ka control path alag karo',
    'Chunking + fingerprinting: resumable upload aur dedup, ek hi design se',
    'Content-defined chunking insertion ke baad dedup reuse kaise sudhaarti hai',
    'Low-latency push ke saath durable cursor-based catch-up kyun chahiye',
  ],
  lesson: [
    `<h3>📖 Requirements</h3>
     <pre>FUNCTIONAL
  • File upload / download, kisi bhi device se
  • File share karo doosre users ke saath
  • Har device par apne aap sync

NON-FUNCTIONAL
  • File 50 GB tak
  • Availability &gt; consistency  (file thodi der purani chalegi)
  • Upload resumable ho — network toote toh shuru se nahi
  • Sync mein change kabhi KHOYE nahi</pre>
     <h3>🚪 Sabse bada faisla: file app server se guzarti hi nahi</h3>
     <p>Sabse aam galti: upload backend par jaata hai aur backend
     usko S3 par daalta hai. Us design mein har byte <b>do baar</b> chalti hai
     aur tumhare app servers bandwidth ke liye khareede jaate hain.</p>
     <pre>❌ Client → App Server → S3            (har byte do baar, app server bottleneck)
✅ Client → App Server: "mujhe upload karna hai"
   App Server → Client: presigned URL
   Client → S3 seedha                  (app server sirf permission deta hai)
   S3 → App Server: notification       (metadata update)</pre>
     <p class="tip">🎯 Presigned URL ka pattern har jagah dikhta hai — YouTube upload,
     Instagram photo, resume upload, sab. Is large-file design mein app metadata aur authorization sambhalta hai; bytes direct storage par jaati hain. Presigned URL bearer capability hai: <b>shortest practical expiry</b>, scoped key/method, checksum aur renewal/resume design karo. Fixed one-minute expiry universal rule nahi; credentials pehle expire ho sakte hain.</p>`,
    `<h3>🧩 Chunking — ek design, teen faayde</h3>
     <p>File ko 5-10 MB ke chunks mein todo aur har chunk ka
     <b>fingerprint</b> (SHA-256) nikalo. Ek hi faisla teen problem hal karta hai:</p>
     <table>
       <tr><td><b>Resumable</b></td><td>network toota? sirf abhi tak na gaye chunks bhejo</td></tr>
       <tr><td><b>Dedup</b></td><td>fingerprint pehle se hai? chunk bhejna hi mat — bas reference jodo</td></tr>
       <tr><td><b>Parallel</b></td><td>kai chunks ek saath ja sakte hain, isliye upload tez</td></tr>
     </table>
     <h3>✂️ Fixed-size vs content-defined chunking</h3>
     <pre>Fixed-size (har 5 MB par kaato):
   file ke SHURU mein ek byte joda  →  saare chunk boundaries khisak gaye
                                    →  poori file dobara upload

Content-defined (rolling hash se boundary chuno):
   file ke shuru mein ek byte joda  →  sirf AAS-PAAS ke chunk badle
                                    →  baaki sab dedup ho gaye</pre>
     <p class="tip">🎯 Content-defined boundaries insertion ke baad resynchronize ho sakti hain, isliye later unchanged chunks reuse hote hain. Exact bytes changed content, chunk-size bounds aur algorithm par depend hain; fixed universal 10 MB claim nahi. Fingerprint matching, hash verification aur dedup authorization bhi chahiye.</p>
     <h3>🔄 Sync — live push aur durable catch-up</h3>
     <p>WebSocket low-latency notification de sakta hai, par disconnected interval ka history store nahi karta. Server par durable change log aur client ka last-applied cursor rakho.</p>
     <p>Reconnect par cursor se missing changes fetch/replay karo; duplicates aur expired cursors handle karo. Periodic polling ek recovery option hai; retained streaming replay bhi valid hai. Reliability <b>history + cursor + apply contract</b> se aati hai, transport name se nahi.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — File Storage & Sync',
      instructions: 'Har slot par sahi chunav — aur galat waalon ka why zaroor padho.',
      brief: `50 crore users, file 50 GB tak, upload resumable hona chahiye,
        aur har device par sync. Availability consistency se zyada zaroori hai.`,
      requirements: ['File 50 GB tak', 'Upload resumable', 'Har device par sync', 'Sharing ke saath permissions'],
      pass: 10,
      slots: [
        {
          id: 'path', label: 'File ka raasta', icon: '🚪',
          options: [
            { id: 'presigned', label: 'Bytes direct blob par; app permission aur metadata', score: 3, why: 'Direct upload app data-plane traffic bachata hai. Authorization, metadata finalization, integrity checks aur signed-capability expiry still design karni hain.' },
            { id: 'proxy', label: 'Bytes app se proxy; permission aur metadata bhi app', score: -3, why: 'Proxy mein bytes client se app aur app se storage jaati hain. App bandwidth, sockets aur buffers ka boj leta hai. 50 GB size akela server bharne ka proof nahi; rate aur concurrency naapo. Direct path shared API ka boj ghata sakta hai.' },
            { id: 'db', label: 'Bytes DB BLOB mein; metadata ke saath saath store', score: -3, why: 'Database BLOB support possible hai, par is 50-GB-file workload mein backup/replication/storage path costly ho sakta hai. Object storage bytes aur indexed DB metadata intentional separation hai.' },
          ],
        },
        {
          id: 'chunk', label: 'Badi files kaise', icon: '🧩',
          options: [
            { id: 'cdc', label: 'Content se chunks kaato; fingerprint se reuse karo', score: 3, why: 'Chunks aur fingerprinting se resume, dedup aur parallel transfer ban sakte hain. Content-defined boundaries insert ke baad aage resync ho sakti hain. Reuse ki had content aur algorithm par nirbhar hai; integrity aur permissions bhi jaancho.' },
            { id: 'fixed', label: 'Fixed size par chunks kaato; offset aur hash rakho', score: 1, why: 'Fixed chunks resume, parallel transfer aur matching chunks ka dedup de sakte hain. Shuru mein byte insert hua toh baad ke offsets content se misalign ho sakte hain aur reuse ghat sakta hai. Har file ka poora upload dobara hoga, pakka nahi.' },
            { id: 'whole', label: 'Ek request mein poori file; aakhri checksum rakho', score: -3, why: 'Ek lambi non-resumable request tootne par bytes dobara bhejni pad sakti hain; per-part retry nahi milta. Final checksum whole-file dedup mein madad kar sakta hai, par partial reuse/progress ke liye alag protocol chahiye.' },
          ],
        },
        {
          id: 'sync', label: 'Change device tak kaise pahunche', icon: '🔄',
          options: [
            { id: 'both', label: 'Push ke saath durable cursor catch-up aur milaan', score: 3, why: 'Live push low latency deta hai; durable cursor-based catch-up missing interval recover karta hai. Retention, cursor expiry, dedupe aur authorization explicit chahiye.' },
            { id: 'push', label: 'Socket reconnect par sirf naye live changes suno', score: -1, why: 'Is option mein no history/cursor recovery hai. Disconnect interval ke changes miss ho sakte hain; reconnect par sirf naye events sunna enough nahi.' },
            { id: 'poll', label: 'Har paanch minute poora metadata dobara padho', score: 0, why: 'Bharosemand hai aur simple hai — par 5 minute ki deri collaboration ke liye bahut zyada hai. Aur karodon devices ka polling khud ek load problem ban jaata hai.' },
          ],
        },
        {
          id: 'meta', label: 'Metadata aur sharing', icon: '🗂️',
          options: [
            { id: 'nosql', label: 'File metadata aur user/file mapping dono indexed', score: 3, why: 'Do sawaal alag-alag tez rehte hain: "is file ka access kise hai" aur "is user ko kaunsi files dikhti hain". Alag mapping table dono ko index se seedha jawab deti hai.' },
            { id: 'array', label: 'File document mein user array; reverse index nahi', score: -2, why: 'Reverse index bina user ko shared files dhoondne ke liye bahut documents scan karne pad sakte hain. Popular file ki user array badhkar ek document par contention la sakti hai. User/file queries ka index chahiye.' },
            { id: 'acl', label: 'Remote permission service; mapping ka plan baad mein', score: 0, why: 'Remote permission service valid ho sakti hai, par indexed mapping ka plan phir bhi chahiye. User ki visible files aur file ke allowed users ka access pattern pehle tay karo; network aur cache consistency ka kharcha bhi gino.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Bytes app server se nahi guzarti, chunking ne teen problem ek saath hal kiye, aur sync mein push aur poll dono hain. Yahi is problem ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh bytes ko app server se guzaar raha hai ya sync ki guarantee kamzor kar raha hai — dono production mein mehenge padte hain.',
        bad: '🤔 Is large-file workload ka direct byte path aur durable missing-change recovery check karo. WebSocket alone retained history/cursor protocol define nahi karta.',
      },
    },
    {
      type: 'terminal',
      title: 'Mission — sync ka asli bottleneck',
      goal: `Chunk dedup ka index naapo, metadata service par peak load daalo,
             ek viral shared link sambhaalo, aur bahut saare chunks ka protocol
             kharcha dekho.`,
      sys: SD.sys.txn({
        name: 'file-metadata',
        slo: { p99Ms: 150, availability: 99.9 },
        api: { countTotal: false, pagination: 'cursor' },
      }),
      tasks: T_DROPBOX,
      success: SD.allTasks(T_DROPBOX),
      successText: "Metadata par cache ke saath 12,000 rps sambhal gaye, aur viral file ki key ki copies ne bojh baanta. ULID sirf metadata row ki key hai; duplicate pehchaanne ka kaam content hash karta hai. Bloom ke \"shayad hai\" par pakki jaanch chahiye. File ke bytes ka upload/download simulator ne nahi naapa.",
      solution: [
        "estimate --users 500000000 --rps 12000 --bytes 500",
        "bloom --items 100000000 --fp 0.01",
        "id bench --type ulid --rows 1000000",
        "load --rps 12000 --duration 8",
        "sim add cache --ttl 300 --jitter 20 --hit-rate 1",
        "cache hotkey --key file:qtr-report --rps 50000",
        "cache hotkey --key file:qtr-report --rps 50000 --replicas 8",
        "net compare --assets 60",
        "load --rps 12000 --duration 8"
      ],
      verify: s => { const m = SD.mission; return s.sys.api.cache?.jitterPct > 0 && m.latest(s, 'cache', 'hotkey')?.rps === 50000 && m.latest(s, 'cache', 'hotkey')?.hot === false && m.current(s, 'load', r => r.rps === 12000 && !r.saturated && r.errPct === 0); },
      hints: [
        "Pehle metadata traffic ka estimate nikalo. Bloom filter chunks ki pehli chhanni ka size batata hai; \"shayad hai\" par content hash se pakki jaanch chahiye.",
        "`id bench --type ulid --rows <n>` metadata row ki key naapta hai — content hash ki jagah nahi leta. `sim add cache --ttl <s> --jitter <pct> --hit-rate <0-1>` ke baad load dobara chalao. Protocol ki tulna `net compare --assets <n>` se karo.",
        "Poora raasta — har command alag Enter se chalao:\nestimate --users 500000000 --rps 12000 --bytes 500\nbloom --items 100000000 --fp 0.01\nid bench --type ulid --rows 1000000\nload --rps 12000 --duration 8\nsim add cache --ttl 300 --jitter 20 --hit-rate 1\ncache hotkey --key file:qtr-report --rps 50000\ncache hotkey --key file:qtr-report --rps 50000 --replicas 8\nnet compare --assets 60\nload --rps 12000 --duration 8",
      ],
    },
    {
      type: 'quiz',
      title: 'File storage ke faisle',
      questions: [
        {
          q: 'Presigned URL ka sabse bada faayda kya hai?',
          choices: [
            'Bytes seedha object storage par; app permission aur metadata sambhaale',
            'Signed URL mil gaya toh app ki access-control jaanch baad mein bhi na karo',
            'Direct upload hai toh storage requests aur network ka kharcha zero maano',
            'URL signed hai toh uploaded file ka checksum aur final size mat jaancho',
          ],
          answer: 0,
          explain: 'Direct upload se file bytes app ki bandwidth nahi leti. App URL dene se pehle permission jaanche aur baad mein upload finalize kare. URL key/method/expiry tak scoped ho. Storage aur network ka bill rehta hai; size/type aur checksum ki jaanch alag hai.',
          choiceExplanations: [
            'Direct upload se file bytes app ki bandwidth nahi leti. App URL dene se pehle permission jaanche aur baad mein upload finalize kare. URL key/method/expiry tak scoped ho. Storage aur network ka bill rehta hai; size/type aur checksum ki jaanch alag hai.',
            'Signed permission dene se pehle caller ka haq jaanchna hai. URL leak ho toh holder allowed action kar sakta hai.',
            'App ka proxy traffic bachta hai. Storage capacity, API requests aur transfer ki cost nahi mitti.',
            'Signature allowed request ko baandhti hai. File ki expected bytes, size aur finalization bhi jaanchni hain.',
          ],
        },
        {
          q: 'Content-defined chunking fixed-size chunking se behtar kyun hai?',
          choices: [
            'Insert ke baad aage ki boundaries dobara mil sakti hain; chunks reuse hote hain',
            'Content-defined ka naam hai toh har file par CPU fixed chunks se kam lagega',
            'Rolling boundary mili toh content milaan ke liye fingerprint rakhna chhod do',
            'Fixed chunks mein insert ho toh offsets khud nayi jagah align ho jaayenge',
          ],
          answer: 0,
          explain: 'Fixed chunks position par katte hain. Shuru mein insert hua toh baad ka content shift ho sakta hai. Content-defined boundaries content se chunti hain aur aage resync ho sakti hain. Reuse kitna hoga, content aur algorithm par nirbhar hai; rolling fingerprint extra CPU leta hai.',
          choiceExplanations: [
            'Fixed chunks position par katte hain. Shuru mein insert hua toh baad ka content shift ho sakta hai. Content-defined boundaries content se chunti hain aur aage resync ho sakti hain. Reuse kitna hoga, content aur algorithm par nirbhar hai; rolling fingerprint extra CPU leta hai.',
            'Rolling fingerprint ka extra kaam hota hai. Har workload mein CPU kam hone ka vaada nahi.',
            'Boundary chunna aur same content verify karna alag kaam hain. Matching fingerprint aur integrity check chahiye.',
            'Fixed offsets content ke insert ke saath nahi sarakte. Same offset par alag bytes aa sakti hain.',
          ],
        },
        {
          q: 'Sync ke liye sirf websocket push kaafi kyun nahi hai?',
          choices: [
            'Disconnect ke changes durable history aur cursor se dobara fetch karo',
            'WebSocket ka reliable transport lo; offline history bhi transport rakh lega',
            'Socket reconnect ho gaya toh bina replay protocol missed files aa jaayengi',
            'Polling laga do; last-applied progress bina save kiye durable maan lo',
          ],
          answer: 0,
          explain: 'WebSocket live khabar deta hai. Laptop band tha toh beech ke changes ke liye durable history aur last-applied cursor chahiye. Polling ya retained stream replay dono recovery kar sakte hain. Retention, expired cursor, repeated changes aur permission ka niyam saaf ho.',
          choiceExplanations: [
            'WebSocket live khabar deta hai. Laptop band tha toh beech ke changes ke liye durable history aur last-applied cursor chahiye. Polling ya retained stream replay dono recovery kar sakte hain. Retention, expired cursor, repeated changes aur permission ka niyam saaf ho.',
            'Connected TCP/WebSocket delivery offline client ka application history store nahi karti.',
            'Reconnect sirf connection laata hai. Missed interval replay karne ka server/client protocol likhna padega.',
            'Polling transport ka chunav hai. Cursor save, apply aur repeat handling ka contract alag chahiye.',
          ],
        },
        {
          q: 'Presigned URL ki expiry kitni honi chahiye?',
          choices: [
            'Kaam poora karne layak chhoti expiry; renewal, resume aur credential life dekho',
            'Har upload ko fixed ek minute do; file size aur network ka waqt mat dekho',
            'Lamba bearer URL login jitna safe maano; logs ya sharing se leak mat socho',
            'URL ki expiry baaki hai toh temporary credential ki expiry nazarandaaz karo',
          ],
          answer: 0,
          explain: 'Presigned URL bearer permission hai: holder scoped action kar sakta hai. Kaam ke liye practical chhoti TTL do, resume/renewal ka raasta rakho. Temporary signing credentials ya policy URL se pehle access rok sakte hain. Har workload ka ek-minute standard nahi.',
          choiceExplanations: [
            'Presigned URL bearer permission hai: holder scoped action kar sakta hai. Kaam ke liye practical chhoti TTL do, resume/renewal ka raasta rakho. Temporary signing credentials ya policy URL se pehle access rok sakte hain. Har workload ka ek-minute standard nahi.',
            'File aur request ki needs badalti hain. Ek minute universal rule nahi; renew/resume ko design karo.',
            'URL logs, history ya sharing se leak ho sakta hai. Bearer link possession access de sakta hai.',
            'Signing credentials expire hue toh URL apni later expiry tak valid rehne ka vaada nahi.',
          ],
        },
      ],
    },
  ],
  success: [
    'Presigned URL wala raasta bata sakte ho aur raaste ki wajah bhi',
    'Chunking se milne wale teenon faayde ek saath samjha sakte ho',
    'Content-defined chunking ka delta-sync faayda bol sakte ho',
    'Durable history/cursor catch-up ko transport se alag reliability contract samjha sakte ho',
  ],
  homework: `Koi bhi file-upload wala product kholo aur browser ka Network tab
    dekho. Do cheezein dhoondho: kya upload request tumhare product ke domain par
    ja rahi hai ya seedha kisi storage domain par (presigned URL ka nishaan), aur
    kya file ek request mein ja rahi hai ya kai chunks mein.`,
  cards: [
    { front: 'File upload ka sabse bada faisla?', back: 'File <b>app server se guzarni hi nahi chahiye</b>. App server presigned URL deta hai, client seedha blob storage par upload karta hai. Proxy wale design mein har byte <b>do baar</b> chalti hai.' },
    { front: 'Chunking se kaunse teen faayde?', back: '<b>Resumable</b> (sirf bache hue chunks bhejo) · <b>Dedup</b> (fingerprint pehle se hai toh bhejo hi mat) · <b>Parallel</b> (kai chunks ek saath). Ek faisla, teen problem hal.' },
    { front: 'Content-defined vs fixed-size chunking?', back: 'File ke shuru mein ek byte jodo: fixed-size ke <b>saare boundaries khisak</b> jaate hain (poori file dobara), content-defined mein sirf <b>aas-paas</b> ke chunks badalte hain. Delta sync yahi banata hai.' },
    { front: 'Sync mein push aur poll dono kyun?', back: 'Push live latency reduce karta hai. Disconnect recovery ke liye durable change history, last-applied cursor aur replay/dedup contract chahiye. Periodic polling ya retained stream replay dono recovery mechanisms ho sakte hain.' },
    { front: 'Presigned URL ki expiry?', back: '<b>Minute mein</b>, din mein nahi. Presigned URL ek <b>bearer token</b> hai — URL rakhne wale ke paas access hai. Resume ke liye client naya URL maang sakta hai.' },
  ],
  interview: {
    title: 'Interview Round — File Storage',
    instructions: 'Dropbox / Google Drive wala classic sawaal. 🎤',
    questions: [
      {
        q: '"Dropbox design karo." Pehla design faisla kya hai?',
        choices: [
          'Bytes ka transfer, metadata aur permission ka contract pehle saaf karo',
          'Pehle DB brand pakka karo — brand se hi badi file ka transfer design nikalta hai',
          'Pehle shards ki ginti lock karo; users aur traffic ka estimate baad mein lo',
          'Pehle sync channel chuno; durable history aur file integrity ko baad mein chhodo',
        ],
        answer: 0,
        explain: 'User flow aur requirements saaf karke bade bytes aur app ke control path ko alag socho. Direct signed upload common fit hai; app permissions aur finalization sambhaale. Metadata access patterns, durable history aur load se stores aur sync ka raasta chuno.',
        choiceExplanations: [
          'User flow aur requirements saaf karke bade bytes aur app ke control path ko alag socho. Direct signed upload common fit hai; app permissions aur finalization sambhaale. Metadata access patterns, durable history aur load se stores aur sync ka raasta chuno.',
          'Brand requirements ka substitute nahi. Transfer, queries aur consistency pehle samjho.',
          'Shards ki ginti traffic, data aur hot keys se niklegi. Pehle number lock karna andaaza hai.',
          'Channel live delivery bataata hai. Durable history, apply aur integrity ka vaada alag chahiye.',
        ],
      },
      {
        q: 'S3 multipart: 50 GB file ke 40 GB parts aaye, connection toota. Bheje parts reuse kaise karoge?',
        choices: [
          'Purana upload ID aur recorded parts milaao; bache parts bhejkar complete karo',
          'Naya upload ID banao; purane ID ke 40 GB parts naye upload mein count kar lo',
          'Sirf 40 GB ki ListParts listing complete bhejo; expected 50 GB poori maan lo',
          'Multipart endpoint ko 40 GB ka offset do; part number aur ETag record chhod do',
        ],
        answer: 0,
        explain: 'Upload ID, part numbers aur returned ETags sambhaal kar rakho. ListParts se progress verify/reconcile karo; missing ya failed parts bhejo. Completion apne maintained part records se banao, listing ko seedha completion input mat banao. Saare expected bytes aur checksum jaancho; successful parts dobara bhejna zaroori nahi.',
        choiceExplanations: [
          'Upload ID, part numbers aur returned ETags sambhaal kar rakho. ListParts se progress verify/reconcile karo; missing ya failed parts bhejo. Completion apne maintained part records se banao, listing ko seedha completion input mat banao. Saare expected bytes aur checksum jaancho; successful parts dobara bhejna zaroori nahi.',
          'Parts upload ID se jude hain. Naya ID puraane uploaded parts ka haq apne aap nahi leta.',
          '40 GB ke parts 50 GB ki expected file nahi banaate. Listing verification ke liye hai; expected complete part records chahiye.',
          'S3 multipart part-number aur upload-ID wala protocol hai. Arbitrary byte-offset PUT doosra contract hota hai.',
        ],
      },
    ],
  },
},

{
  id: 'crawler',
  icon: '🕷️',
  title: 'Build #8 — Web Crawler',
  badge: 'Crawl Karta',
  objectives: [
    'Politeness: per-domain rate limit, jabki kul throughput bahut zyada ho',
    'Do tarah ka dedup — URL ka aur CONTENT ka',
    'DNS, TLS, parsing aur storage mein actual bottleneck measure karo',
    'Crawler traps: infinite space se bachne ka sasta tareeka',
  ],
  lesson: [
    `<h3>📖 Requirements aur paimana</h3>
     <pre>FUNCTIONAL
  • Seed URLs se shuru karke links follow karo
  • Har page ka HTML store karo aur text nikalo
  • robots.txt maano

NON-FUNCTIONAL
  • 10 arab (10 billion) pages, 5 din mein
  • Har page lagbhag 2 MB
  • Politeness: ek domain par lagbhag 1 request/second
  • Fault tolerant — machine mare toh kaam na khoye</pre>
     <h3>🧮 Kitni machines chahiye?</h3>
     <pre>Ek network-optimized machine: 200 Gbps
   200 Gbps ÷ (2 MB × 8 bits) = lagbhag 12,500 pages/sec (theoretical)
   30% practical utilization    = lagbhag 3,750 pages/sec

10,000,000,000 pages ÷ 3,750 ÷ 86,400 ÷ 5 din  =  6.2 machines
failure aur re-crawl ka headroom jodo  →  lagbhag 8 machines</pre>
     <p class="tip">🎯 Rounded estimate <b>7–8 machines</b> ka bandwidth floor deta hai, measured sufficiency proof nahi. 10 billion × 2 MB lagbhag <b>20 PB</b> transfer hai. CPU parsing, storage writes, DNS/TLS latency aur actual domain mix separately benchmark karo; slowest resource real limit banega.</p>
     <h3>🚦 Politeness — asli seema</h3>
     <p>Ek domain par 1 request/second ka matlab hai ki wikipedia.org se tum roz
     sirf 86,400 pages le sakte ho, chahe tumhare paas 1000 machines hon.
     Throughput <b>domains ki sankhya</b> se aata hai, machines se nahi.</p>
     <pre>1 request/sec/domain × 20 lakh alag domains  =  20 lakh pages/sec (sambhavit)
Par un domains mein se zyadatar chhote hain — asli mix aisa hota hai:
   kuch hazaar bade domains (rate limit hi seema)
   crore chhote domains (phir bhi DNS, network aur server budgets lagu)</pre>
     <p>Isliye frontier queue ko <b>domain ke hisaab se</b> partition karna padta
     hai — har domain ka apna lock/delay, warna 8 machines ek hi site par toot padengi.</p>`,
    `<h3>🔁 Do alag dedup</h3>
     <table>
       <tr><th></th><th>URL dedup</th><th>Content dedup</th></tr>
       <tr><td>Sawaal</td><td>"kya URL pehle crawl hua?"</td><td>"kya PAGE pehle dekha?"</td></tr>
       <tr><td>Kab</td><td>queue mein daalne se PEHLE</td><td>fetch karne ke BAAD</td></tr>
       <tr><td>Kaise</td><td>URL normalize karo, phir hash → index/bloom</td><td>content ka hash (ya simhash, near-duplicate ke liye)</td></tr>
       <tr><td>Kyun zaroori</td><td>ek hi page baar-baar fetch na ho</td><td>ek hi content alag URLs par milta hai (session ids, tracking params, mirrors)</td></tr>
     </table>
     <p>Content dedup ke bina crawler apni storage ka bada hissa <b>ek hi page ke
     alag-alag URLs</b> par kharch kar deta hai — aur duplicate pages baad mein har downstream
     system (index, training data) mein bhi ghusta hai.</p>
     <h3>🌐 DNS — chhupa hua kharcha measure karo</h3>
     <p>Cache misses par DNS lookup, phir TCP/TLS setup har nayi origin ki latency aur resource cost badha sakte hain. Koi universal 70% figure nahi; traces se DNS time, resolver cache hit aur connection reuse dekho.</p>
     <pre>Thanda connection:  DNS  +  TCP handshake  +  TLS handshake  +  request
Warm connection:                                             request</pre>
     <p class="tip">🎯 TTL-aware caching resolver aur connection reuse test karo. Stale DNS sirf explicit bounded serve-stale policy mein use karo; arbitrary TTL overrun changed endpoints ko miss kara sakta hai. Resolver capacity/redundancy aur per-origin connection budget actual load se size karo.</p>
     <h3>🕳️ Traps</h3>
     <p>Kuch sites anant space bana deti hain — calendar jo har agli tareekh ka
     link deta hai, ya faceted search jo har filter combination ka URL banata hai.
     Sabse sasta ilaaj sabse purana hai: <b>max depth</b> (seed se 15-20 hop) aur
     per-domain page budget. Dono anumaan hain, par dono kaam karte hain.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — Web Crawler',
      instructions: 'Har slot par sahi chunav — galat waalon ka why zaroor padho.',
      brief: `10 arab pages, 5 din, har page ~2 MB. Politeness zaroori hai
        (1 req/sec/domain), robots.txt maanna hai, aur machine marne par kaam
        nahi khona chahiye.`,
      requirements: ['10 arab pages / 5 din', '1 request/sec/domain', 'robots.txt maano', 'Machine mare toh kaam na khoye'],
      pass: 10,
      slots: [
        {
          id: 'frontier', label: 'Frontier queue', icon: '📥',
          options: [
            { id: 'domain', label: 'Durable frontier aur shared per-domain rate budget', score: 3, why: 'Domain owner/shared atomic rate budget aggregate dispatch coordinate karta hai. Durable scheduling, lease recovery aur failure races test karo; queue ya Redis ka naam alone guarantee nahi.' },
            { id: 'plain', label: 'FIFO frontier; har worker ka apna rate timer', score: -2, why: 'Independent worker timers ek domain ka aggregate rate nahi ginte. Popular domain ke kai URLs alag workers ko milein toh site budget paar ho sakta hai. Shared scheduler ya coordinated worker budget chahiye; sirf queue mein hi limit lag sakti hai, aisa rule nahi.' },
            { id: 'db', label: 'DB URL table; unlocked SELECT se dispatch karo', score: -1, why: 'Database-backed queue valid ho sakti hai, par is option mein unlocked SELECT duplicate dispatch aur no shared rate budget chhodta hai. Atomic claiming, indexing, partitioning aur domain scheduling chahiye.' },
          ],
        },
        {
          id: 'dedup', label: 'Dedup', icon: '🔁',
          options: [
            { id: 'both', label: 'Enqueue se pehle URL; fetch ke baad content dedup', score: 3, why: 'Do alag problem, do alag jagah. URL dedup ek hi page ko baar-baar fetch hone se rokta hai; content dedup un pages ko pakadta hai jo alag URL par ek jaisa content dete hain (session id, tracking params, mirrors).' },
            { id: 'url', label: 'URL dedup karo; har fetched payload store karo', score: 0, why: 'URL dedup zaroori hai, par alag URLs same content de sakte hain. Duplicate payload storage aur downstream index/training mein bhi ja sakta hai; content dedup ka alag faayda hai.' },
            { id: 'none', label: 'Raw links enqueue; payload match ki jaanch chhodo', score: -3, why: 'Web par ek hi content darjan URLs par milta hai (tracking params, session ids, http/https, www/non-www, mirrors). Bina dedup ke crawler apne hi loops mein ghoomta rahega.' },
          ],
        },
        {
          id: 'dns', label: 'DNS', icon: '🌐',
          options: [
            { id: 'cache', label: 'TTL-aware DNS cache, resolver sizing aur reuse', score: 3, why: 'TTL-aware cache repeat lookups kam karti hai; measured resolver sizing aur connection reuse lookup/handshake work reduce karte hain. Exact gain trace aur origin mix se validate karo.' },
            { id: 'default', label: 'Default DNS lo; resolver capacity ka test chhodo', score: -2, why: 'Default resolver sufficient ho sakta hai, par bina capacity/cache/latency measurement usko sufficient assume karna evidence nahi. Is scale par resolver QPS aur error behavior test karo.' },
            { id: 'prefetch', label: 'Ek baar DNS prefetch; expiry par dobara na dekho', score: 0, why: 'Achhi soch hai aur bade crawlers karte bhi hain — par domains ki list crawl ke dauraan hi badhti hai, isliye prefetch akela kaafi nahi. Cache ke saath jodo, cache ki jagah nahi.' },
          ],
        },
        {
          id: 'trap', label: 'Traps aur infinite space', icon: '🕳️',
          options: [
            { id: 'depth', label: 'Depth limit aur per-domain page/time budget', score: 3, why: 'Depth, page aur time budgets exploration bound karte hain. Infinite combinations shallow bhi ho sakti hain; depth limit alone enough nahi. Coverage loss ko measure karo.' },
            { id: 'detect', label: 'URL pattern detect karo; crawl budget hata do', score: 0, why: 'Pattern detection traps pakad sakti hai, par har naye pattern ka proof nahi. Depth aur page/time budget sasta baseline guard hain; detection ko saath rakho, budget ki jagah nahi.' },
            { id: 'none', label: 'Sirf robots allow maano; crawl budget hata do', score: -2, why: 'robots.txt URL policy bataata hai, finite URL space ka vaada nahi. Allowed calendar har agle din ka alag link bana sakta hai. Depth ke saath page/time budget bhi chahiye.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Politeness queue mein hai, dedup dono jagah hai, DNS ko ek asli bottleneck maana, aur traps ke liye sasta guard lagaya. Yahi crawler ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh politeness ko worker par chhod raha hai ya DNS ko halke mein le raha hai — dono scale par saamne aate hain.',
        bad: '🤔 Do baaton par wapas jao: politeness queue ka kaam hai (worker ka nahi), aur DNS is problem ka sabse bada chhupa hua kharcha hai.',
      },
    },
    {
      type: 'terminal',
      title: 'Mission — crawler ke chaar dabav',
      goal: `Paimana aur Bloom sizing naapo; partitions aur handshake dekho. domain:wikipedia.org par 50000-rps read-key replication alag demo hai. Global domain crawl budget aur politeness simulator mein implement nahi hain.`,
      sys: SD.sys.txn({
        name: 'crawler-frontier',
        slo: { p99Ms: 500, availability: 99 },
        api: { countTotal: false, pagination: 'cursor' },
      }),
      tasks: T_CRAWLER,
      success: SD.allTasks(T_CRAWLER),
      successText: `Dhyan do ki kahin bhi "aur machines daalo" jawab nahi tha.
        Actual per-domain crawl limit shared scheduling authority mein enforce karni hogi. Read-key copies domain dispatch rate enforce nahi karti. Crawler ke dabav — dedup ka index, partition ka balance aur DNS — <b>coordination</b> ke dabav hain,
        capacity ke saath aate hain. Eight-machine NIC estimate actual CPU/storage/latency capacity prove nahi karta.`,
      solution: [
        "estimate --users 10000000 --rps 3750 --bytes 2000000",
        "bloom --items 1000000000 --fp 0.01",
        "hll --items 1000000000",
        "stream partitions --partitions 6 --consumers 8",
        "stream partitions --partitions 12 --consumers 8",
        "cache hotkey --key domain:wikipedia.org --rps 50000",
        "cache hotkey --key domain:wikipedia.org --rps 50000 --replicas 8",
        "net trace --rtt 40",
        "net trace --rtt 40 --warm",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'stream', 'partitions')?.idle === 0 && m.latest(s, 'cache', 'hotkey')?.rps === 50000 && m.latest(s, 'cache', 'hotkey')?.hot === false && m.latest(s, 'net', 'trace')?.warm === true; },
      hints: [
        "Crawl ka estimate aur Bloom/HLL ka size nikaal ke paimana samjho. Ek site par kul raftaar ki hadd ke liye ek saajha scheduler chahiye.",
        "`stream partitions --consumers <n>` se partitions aur consumers barabar karo. domain:wikipedia.org ki copies wala prayog scheduler ya crawl ki tameez nahi dikhata. `net trace` thande aur garam connection par chala ke handshake ka farak naapo.",
        'Poora raasta — har command alag Enter se chalao:\nestimate --users 10000000 --rps 3750 --bytes 2000000\nbloom --items 1000000000 --fp 0.01\nhll --items 1000000000\nstream partitions --partitions 6 --consumers 8\nstream partitions --partitions 12 --consumers 8\ncache hotkey --key domain:wikipedia.org --rps 50000\ncache hotkey --key domain:wikipedia.org --rps 50000 --replicas 8\nnet trace --rtt 40\nnet trace --rtt 40 --warm',
      ],
    },
    {
      type: 'quiz',
      title: 'Crawler ke faisle',
      questions: [
        {
          q: 'NIC ke assumptions se 7–8 machines ka estimate nikla. Asli sabak kya hai?',
          choices: [
            'Bandwidth ka andaaza mila; CPU, storage, DNS aur domain mix abhi naapne hain',
            '7–8 machines estimate mein aayi toh production mein bhi target pakka poora hoga',
            'DNS ko bottleneck maan lo; har crawler mein CPU aur network se pehle wahi rukega',
            'NIC rate mein parser aur storage ka kaam bhi shamil maano; alag test chhodo',
          ],
          answer: 0,
          explain: '200 Gbps NIC, 2 MB/page aur 30% use maan kar ek machine 3750 pages/sec deti hai. 10 billion/5 din ke liye lagbhag 6.17 machine-equivalents, yani kam se kam 7 ka sirf bandwidth model hai. Parsing, storage, politeness aur failures ki capacity alag naapo.',
          choiceExplanations: [
            '200 Gbps NIC, 2 MB/page aur 30% use maan kar ek machine 3750 pages/sec deti hai. 10 billion/5 din ke liye lagbhag 6.17 machine-equivalents, yani kam se kam 7 ka sirf bandwidth model hai. Parsing, storage, politeness aur failures ki capacity alag naapo.',
            'Estimate assumptions ka hisaab hai. Measured throughput aur failure headroom ka proof nahi.',
            'Kisi workload mein DNS, kisi mein CPU ya network limit ho sakti hai. Actual waits aur utilization dekho.',
            'NIC ka transfer rate parser CPU aur disk write rate nahi bataata. Dono ki capacity alag jaancho.',
          ],
        },
        {
          q: 'Politeness (1 req/sec/domain) worker ke andar lagane mein kya galat hai?',
          choices: [
            'Har domain ka kul budget sab workers ke across coordinate karo',
            'Har worker par apna 1/s timer rakho; workers ka total rate khud 1/s rahega',
            'Workers badhe toh site ki allowed rate bhi utni badhi maano',
            'robots.txt mein URL allowed mila toh per-domain burst ki hadd chhod do',
          ],
          answer: 0,
          explain: '500 independent workers har ek 1/s bhejein toh same domain ko 500/s mil sakta hai. Shared atomic budget ya ek domain owner aggregate dispatch baandhe. Durable claim aur owner recovery mein races jaancho. Site ka agreed budget worker count se nahi badalta.',
          choiceExplanations: [
            '500 independent workers har ek 1/s bhejein toh same domain ko 500/s mil sakta hai. Shared atomic budget ya ek domain owner aggregate dispatch baandhe. Durable claim aur owner recovery mein races jaancho. Site ka agreed budget worker count se nahi badalta.',
            'Local timers doosre workers ke requests nahi ginte. Aggregate local limits ka sum ho sakta hai.',
            'Site ki policy apne worker count se nahi badalti. Nayi capacity se domain budget mat badhaao.',
            'URL crawl karne ki permission request rate ka unlimited vaada nahi. Rate budget bhi maano.',
          ],
        },
        {
          q: 'URL dedup ke baad bhi content dedup kyun chahiye?',
          choices: [
            'Alag URLs same payload de sakte hain; fetch ke baad content bhi milaao',
            'Normalized URL match ho toh har waqt same content pakka maano',
            'Content hash mil gaya toh robots aur access ki policy ki jaanch chhodo',
            'Fetch ke baad hash milaao; pehle kharch hui bandwidth bhi bachi maan lo',
          ],
          answer: 0,
          explain: 'Do alag normalized URLs same page de sakte hain, jaise tracking params ya mirrors. Fetch ke baad hash/content match se duplicate payload ki storage aur downstream kaam ghata sakte ho. URL ka sameness content version ka proof nahi; spent fetch bandwidth wapas nahi aati.',
          choiceExplanations: [
            'Do alag normalized URLs same page de sakte hain, jaise tracking params ya mirrors. Fetch ke baad hash/content match se duplicate payload ki storage aur downstream kaam ghata sakte ho. URL ka sameness content version ka proof nahi; spent fetch bandwidth wapas nahi aati.',
            'Same URL par page waqt ke saath badal sakta hai. URL equality content equality nahi.',
            'Same payload se access ya robots permission saabit nahi hoti. Policy alag jaanchni hai.',
            'Post-fetch check se response pehle aa chuka. Bytes ka kharcha ho gaya; storage aur downstream work bach sakta hai.',
          ],
        },
        {
          q: 'Crawler traps se bachne ka sabse sasta ilaaj kya hai?',
          choices: [
            'Depth ke saath per-domain page/time budget rakho; coverage ka nuksaan naapo',
            'robots.txt allowed ho toh har generated URL follow karo; koi budget mat rakho',
            'Content hash lo; unique calendar pages ka anant space apne aap rukega',
            'Ek global FIFO rakho; order se per-domain trap ki limit lag gayi maano',
          ],
          answer: 0,
          explain: 'Infinite calendar ya filter combinations alag pages bana sakte hain. Page/time budgets exploration baandhte hain; depth akeli shallow infinite space nahi rokegi. Patterns se trap detection jod sakte ho, par budget hataana sahi nahi. Coverage aur missed useful pages bhi naapo.',
          choiceExplanations: [
            'Infinite calendar ya filter combinations alag pages bana sakte hain. Page/time budgets exploration baandhte hain; depth akeli shallow infinite space nahi rokegi. Patterns se trap detection jod sakte ho, par budget hataana sahi nahi. Coverage aur missed useful pages bhi naapo.',
            'Robots permission deti hai; URL space finite hone ka vaada nahi. Budget phir bhi chahiye.',
            'Har calendar page ka content alag ho sakta hai. Content dedup unique trap ko limit nahi deta.',
            'FIFO next URL ka kram hai. Domain ke total pages ya waqt ki hadd alag lagaani padegi.',
          ],
        },
      ],
    },
  ],
  success: [
    'Politeness ko queue ki zimmedari maante ho, worker ki nahi',
    'URL dedup aur content dedup ka farak bata sakte ho',
    'DNS ko crawler ka asli bottleneck pehchan sakte ho',
    'Infinite space se bachne ka sasta guard laga sakte ho',
  ],
  homework: `Kisi bade site ka <code>robots.txt</code> kholo (jaise
    <code>wikipedia.org/robots.txt</code>) aur dekho ki usme kya-kya disallow hai
    aur kya site ki published rate policy ya crawler-specific crawl-delay extension hai. <code>crawl-delay</code> RFC 9309 ka standard field nahi. Phir poochho: chosen per-domain budget par us site ko poora crawl karne mein kitne
    din lagenge?`,
  cards: [
    { front: 'Crawler ka asli bottleneck?', back: 'Bandwidth ya CPU nahi — <b>politeness aur DNS</b>. 10 arab pages sirf ~8 machines par ho jaate hain; poora design <b>coordination</b> ka hai, capacity ka nahi.' },
    { front: 'Politeness kahan lagti hai?', back: 'Domain par hone wale kul dispatch ko coordinate karo: partition owner/shared atomic rate budget ek option hai. 500 independent local 1/s budgets milkar 500/s bhej sakte hain. Durable claiming, retries aur scheduler races test karo.' },
    { front: 'Do dedup kaunse?', back: '<b>URL dedup</b> — queue mein daalne se pehle (normalize + hash). <b>Content dedup</b> — fetch ke baad (content hash / simhash). Ek hi content darjan URLs par milta hai: tracking params, session ids, mirrors.' },
    { front: 'DNS ka kharcha kitna?', back: 'Universal percentage nahi. DNS lookup latency/cache misses aur resolver QPS trace karo; TTL-aware resolver cache, capacity/redundancy aur connection reuse evaluate karo. Arbitrary TTL overrun safe assumption nahi.' },
    { front: 'Crawler traps ka sasta ilaaj?', back: '<b>Max depth</b> (seed se 15-20 hop) + <b>per-domain page budget</b>. robots.txt ijazat ke baare mein hai, anantata ke baare mein nahi — calendar page allowed bhi ho sakta hai aur anant bhi.' },
  ],
  interview: {
    title: 'Interview Round — Web Crawler',
    instructions: 'Web crawler ka sawaal estimation aur coordination dono test karta hai. 🎤',
    questions: [
      {
        q: '"Web crawler design karo, 10 arab pages 5 din mein." Pehla kaam?',
        choices: [
          'Required rate, payload aur domains ka budget nikalo; resources phir naapo',
          'NIC ki bandwidth se nodes gino — 8 nodes ka hisaab poori pipeline ki capacity hai',
          'Schema pehle poora lock karo; data volume aur throughput baad mein gino',
          'Global FIFO pehle banao; same-domain scheduling ka niyam baad mein socho',
        ],
        answer: 0,
        explain: '10 billion pages/5 din lagbhag 23,148 pages/sec hain. 2 MB/page se 20 PB payload banta hai. NIC, CPU parsing, disk, DNS/TLS aur per-domain policy ke assumptions likho. Phir load/trace se limits jaancho; machine count akela system ka proof nahi.',
        choiceExplanations: [
          '10 billion pages/5 din lagbhag 23,148 pages/sec hain. 2 MB/page se 20 PB payload banta hai. NIC, CPU parsing, disk, DNS/TLS aur per-domain policy ke assumptions likho. Phir load/trace se limits jaancho; machine count akela system ka proof nahi.',
          'Nominal bandwidth se node estimate milta hai, poori pipeline ki measured capacity nahi.',
          'Data volume aur access pattern schema/index ko disha denge. Estimate ko baad mein mat chhodo.',
          'Politeness aggregate scheduling ki shart hai. Global FIFO ke saath independent throttles proof nahi.',
        ],
      },
      {
        q: 'Crawlers ek site par saath pahunche aur site ne block kiya. Kya jaanchoge?',
        choices: [
          'Site policy, kul dispatch rate aur domain owner/routing ki jaanch karo',
          'Sirf user-agent badlo; wahi aggregate rate aur bursts bhejte raho',
          'Workers badhaao; har worker apna local timer rakhe, shared budget mat do',
          'Sirf robots mein allow dekho; server ke rate feedback ko chhod do',
        ],
        answer: 0,
        explain: 'Block ka karan evidence se jaancho. Kai independent local timers site par total rate badha sakte hain. Domain owner/shared budget, retries, policy aur server feedback milaao. URL allow hona rate ya burst allowed hone ka proof nahi.',
        choiceExplanations: [
          'Block ka karan evidence se jaancho. Kai independent local timers site par total rate badha sakte hain. Domain owner/shared budget, retries, policy aur server feedback milaao. URL allow hona rate ya burst allowed hone ka proof nahi.',
          'Identity label badalne se load nahi ghatta. Site policy aur aggregate behavior theek karna hai.',
          'Extra independent workers violation badha sakte hain. Same-domain budget shared hona chahiye.',
          'Allowed paths ke saath rate aur overload feedback bhi maano. Robots akela politeness ka proof nahi.',
        ],
      },
    ],
  },
},
]);

})();

/* =====================================================================
   RESIL track — blast radius aur cell-based architecture
   (shedding ke baad, flashcrowd se pehle)
   ===================================================================== */
(function () {
SD.registerLevelsAfter('resil', 'shedding', [
{
  id: 'blast',
  icon: '🧊',
  title: 'Blast Radius & Cells',
  badge: 'Cell Chitrakar',
  objectives: [
    'Blast radius ko ek design number banana, ek umeed nahi',
    'Cell-based architecture: kyun, aur cells ki asli keemat',
    'Shuffle sharding — kam cells mein bahut chhota blast radius',
    'Cell fail hone par cell ka load kahan jaayega — spare ya shed',
  ],
  lesson: [
    `<h3>🧊 "Kitne users girenge?" — ek design number</h3>
     <p>Availability ka sawaal aksar "kitni der" par atak jaata hai. Utna hi
     zaroori doosra sawaal hai: <b>"kitne users?"</b> Ek hi bade fleet par
     jawab hamesha <b>100%</b> hota hai, chahe tumhare paas kitne bhi replicas hon.</p>
     <pre>Ek bada fleet:      koi bhi poison request, koi bhi bad config,
                    koi bhi O(N²) ganit  →  100% users

10 alag cells:      wahi failure  →  10% users
                    aur baaki 90% ko pata bhi nahi chalta</pre>
     <p>Cell ek <b>poori swatantra copy</b> hai — apna load balancer, apni
     compute, apna database, apna cache. Cells aapas mein baat nahi karte.
     Yahi "baat nahi karte" wali baat cells ki poori taakat hai.</p>
     <h3>💰 Cells ki asli keemat</h3>
     <table>
       <tr><th>Kya milta hai</th><th>Kya dena padta hai</th></tr>
       <tr><td>Blast radius 1/N</td><td>N control planes, N deploy targets, N monitoring dashboards</td></tr>
       <tr><td>Capacity add karna local ho jaata hai (naya cell)</td><td>Har cell mein alag se spare capacity</td></tr>
       <tr><td>Deploy bhi cell-dar-cell ho sakta hai</td><td>Routing layer chahiye: "ye customer kaunse cell mein hai?"</td></tr>
       <tr><td>Ek cell ka data doosre cell tak nahi rista</td><td>Cross-cell query ab ek fan-out hai</td></tr>
     </table>
     <p class="tip">🎯 Cells <b>zyada</b> operational kaam hain, kam nahi — aur
     seedhe-seedhe tez ya saste bhi nahi. Poora faayda ek hi jagah hai: failure
     ka daayra. Isliye cells us system par lagao jiska <b>girna sabse mehenga</b>
     hai, har system par nahi.</p>`,
    `<h3>🎲 Shuffle sharding — full overlap aur partial exposure</h3>
     <p>8 cells aur uniform random two-cell assignments lo. Ek poison tenant apne <b>dono assigned cells</b> ko unhealthy bana deta hai. Doosra tenant tab poori tarah unavailable hai jab doosre tenant ka <b>exact same pair</b> ho; partial-overlap tenant surviving cell use kar sakta hai, agar retries aur headroom tested hon.</p>
     <pre>C(8,2) = 28 distinct pairs
Exact same pair share = 1/28 = 3.6%
Ek named cell se assigned tenants = 2/8 = 25%
Sirf ek cell down: full pair loss = 0%, par 25% tenants exposed</pre>
     <p class="tip">🎯 <b>3.6% exact-pair full loss</b> single-cell blast radius nahi. Two-cell poison scenario mein partial degradation aur shared dependency failure alag metrics hain. Uniform assignment mathematical assumption hai; actual placement skew, retry success aur survivor capacity measure karo.</p>
     <h3>🪣 Aur ek sawaal jo hamesha chhoot jaata hai</h3>
     <p>Ek cell gira. Gire cell ke users ka traffic <b>kahan jaayega?</b> Do hi jawab hain:</p>
     <pre>1. SPARE se absorb karo  →  har cell mein 100/(N-1) % extra capacity chahiye
                             8 cells par extra capacity lagbhag 14% hai

2. SHED kar do            →  un users ko saaf 503 + Retry-After
                             (baaki cells surakshit rehte hain)</pre>
     <p>Teesra jawab — "dekh lenge" — asal mein pehla wala hai, bas bina plan ke.
     Aur bina spare ke gire cell ka traffic baaki cells ko bhi le doobta hai, yaani
     cells ka poora faayda hi khatam.</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Cells, shuffle sharding aur spare',
      instructions: 'Pehle tenant-pair isolation dekho; phir alag single-cell-loss drill ki spare capacity check karo.',
      goal: 'Poison tenant ke poore assigned set fail hone par full-set overlap <b>5% tak</b> ho. Alag single-cell-loss drill mein uniformly redistributed load spare se absorb ho, aur cells <b>12 tak</b> hon. Partial degradation aur common dependencies is full-loss metric mein include nahi.',
      scenario: `Ek multi-tenant API. Aaj sab kuch ek hi bade fleet par hai,
        isliye fleet-wide fault sab customers ko affect kar sakta hai. Model mein poison tenant har assigned cell ko unhealthy karta hai; cells independent aur assignments uniform hain. Load-absorption metric separately one-cell failure ko model karta hai.`,
      knobs: [
        { id: 'cells', label: 'Kitne cells', min: 1, max: 20, step: 1, value: 1, unit: '',
          note: 'Har cell ek poori swatantra copy hai — apna LB, compute, DB, cache.' },
        { id: 'shuffle', label: 'Shuffle sharding (0 = ek customer ek cell, 1 = ek customer do cells)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Do cells par customer tabhi poori tarah girta hai jab DONO kharab hon.' },
        { id: 'spare', label: 'Har cell mein spare capacity', min: 0, max: 50, step: 5, value: 0, unit: '%',
          note: 'Ek cell gira toh gire cell ka load baaki cells par jaayega — load absorb karne ke liye spare chahiye.' },
      ],
      readouts: k => {
        const m = cellModel(k);
        return [
          { label: 'Poison tenant: exact full-set overlap', value: m.blast.toFixed(1) + '% customers', tone: m.blast <= 5 ? 'ok' : m.blast <= 15 ? 'warn' : 'bad' },
          { label: 'Ek cell ka load absorb hoga?', value: m.absorb ? 'haan, spare kaafi hai' : `nahi — ${m.need.toFixed(0)}% chahiye`, tone: m.absorb ? 'ok' : 'bad' },
          { label: 'Operational bojh', value: m.cells + ' control planes / deploy targets', tone: m.cells <= 12 ? 'ok' : 'bad' },
          { label: 'Capacity ka kharcha', value: '+' + k.spare + '% (spare)', tone: k.spare <= 25 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = cellModel(k);
        return [
          { label: 'Full-set overlap (cap 5%)', pct: Math.min(100, m.blast), text: m.blast.toFixed(1) + '%', tone: m.blast <= 5 ? 'ok' : 'bad' },
          { label: 'Spare (chahiye ' + m.need.toFixed(0) + '%)', pct: Math.min(100, (k.spare / 50) * 100), text: k.spare + '%', tone: m.absorb ? 'ok' : 'bad' },
          { label: 'Operational bojh (cap 12)', pct: (m.cells / 20) * 100, text: m.cells + ' cells', tone: m.cells <= 12 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = cellModel(k);
        const bad = [];
        if (m.blast > 5) bad.push(k.shuffle
          ? `exact-pair full-loss share <b>${m.blast.toFixed(1)}%</b> hai — C(${k.cells},2) abhi chhota hai; partial overlap isse alag hai`
          : `one-cell assignment full-loss share <b>${m.blast.toFixed(1)}%</b> hai. Pair assignment full-set overlap reduce kar sakti hai; partial degradation phir bhi assess karo`);
        if (!m.absorb) bad.push(`ek cell girne par uska load absorb karne ke liye <b>${m.need.toFixed(0)}%</b> spare chahiye, hai sirf ${k.spare}%`);
        if (m.cells > 12) bad.push(`<b>${m.cells} cells</b> ka matlab hai ${m.cells} control planes, deploy targets aur dashboards — operational bojh bahut zyada`);
        if (!bad.length) return { ok: true, text: `<b>${m.cells} cells</b>${k.shuffle ? ' + shuffle sharding' : ''}, <b>${k.spare}%</b> spare — poison tenant ke poore assigned set ka full-overlap share <b>${m.blast.toFixed(1)}%</b> hai. Separate single-cell-loss model mein spare uniformly rerouted load absorb karti hai; actual hotspot/routing constraints test karna baaki hai.` };
        return { ok: false, text: bad.join(' &nbsp;·&nbsp; ') };
      },
      check: k => { const m = cellModel(k); return m.blast <= 5 && m.absorb && m.cells <= 12; },
      lesson: `🎯 Dono drill alag rakho. Poison tenant ke assigned pair ka exact overlap <b>1/C(N,2)</b> hai; N=8 par 3.6%. Sirf ek named cell fail ho toh pair tenants ka <b>2/N</b> exposed hai, full pair loss zero under working alternate assumption. Separate uniform single-cell failover mein <b>100/(N-1)%</b> extra base-load headroom estimate hai. Skew, retry limits aur shared dependencies production result badal sakte hain.`,
      quiz: {
        q: 'Shuffle sharding se ek customer ka ek cell kharab ho gaya (doosra theek hai). Us customer ke saath kya hota hai?',
        choices: [
          'Doosra cell kaam kar sakta hai — bas routing/retry aur bachi capacity chahiye',
          'Doosra cell bacha hai, toh latency aur capacity bilkul pehle jaisi rahegi',
          'Customer apne aap kisi teesre, bina diye cell par chala jaayega, bina niyam',
          'Ek cell girte hi har shuffle wala customer poori tarah gir jaayega, hamesha',
        ],
        answer: 0,
        explain: 'Do diye cells mein se ek bacha ho, toh retry/routing aur bachi capacity ke saath service chal sakti hai — customer degrade hota hai, marta nahi. Capacity kitni bachi, workload par depend; naap ke dekho.',
        choiceExplanations: [
          'Do diye cells mein se ek bacha ho, toh retry/routing aur bachi capacity ke saath service chal sakti hai — customer degrade hota hai, marta nahi. Capacity kitni bachi, workload par depend; naap ke dekho.',
          'Ek cell gaya toh capacity ghat sakti hai — bachi capacity naapni padti hai.',
          'Teesra cell apne aap nahi milta — placement/recovery ka niyam khud likhna padta hai.',
          'Ek cell girne se customer ka poori tarah girna tay nahi. Doosre cell tak routing ya retry chale aur capacity bachi ho, toh service chalti hai; dono cells khona poori failure ka ek case hai.',
        ],
      },
    },
    {
      type: 'archdiff',
      title: 'Blast radius ke leak',
      instructions: 'Design "cell-based" architecture kehlaata hai — par design mein char cheezein blast radius ko wapas 100% bana deti hain. Chaaron pakdo.',
      brief: `Ek team ne apni service ko 8 cells mein baant diya. Har cell ka apna
        load balancer, compute aur database hai. Phir bhi pichhle do incidents
        mein <b>saare</b> customers gire.`,
      goal: 'Char aisi cheezein pakdo jo cells ke beech ki deewar tod deti hain.',
      nodes: [
        { id: 'router', label: '🧭 Global router', sub: 'ek hi service jo batati hai ki customer kaunse cell mein hai', row: 0 },
        { id: 'cells', label: '🧊 8 cells', sub: 'har ek ka apna LB, compute, DB, cache', row: 0 },
        { id: 'cfg', label: '📄 Shared config store', sub: 'saare cells ek hi config service se padhte hain, live', row: 1 },
        { id: 'deploy', label: '🚀 Deploy pipeline', sub: 'naya version ek saath saare 8 cells par jaata hai', row: 1 },
        { id: 'auth', label: '🔐 Shared auth service', sub: 'har request ka token yahi verify karti hai, har cell se', row: 2 },
        { id: 'obs', label: '📊 Per-cell dashboards', sub: 'har cell ke apne metrics aur alerts', row: 2 },
      ],
      flaws: [
        { id: 'router', why: 'Global router khud ek <b>single point of failure</b> hai — router gira toh saare 8 cells zinda hote hue bhi kisi kaam ke nahi. Router ko sabse simple, sabse sthir cheez rakho (DNS ya static mapping), aur router ka apna failure mode <b>fail-static</b> ho: naya mapping na mil paaye toh purana chalta rahe.' },
        { id: 'cfg', why: 'Ek hi config service se saare cells live padh rahe hain — yaani ek kharab config ek saath 8 cells par. Shared config <b>Cloudflare 2025</b> wali kadi hai, bas cells ke andar. Config bhi <b>cell-dar-cell</b> jaani chahiye, aur har cell ke paas aakhri acchi copy honi chahiye.' },
        { id: 'deploy', why: 'Ek saath saare cells par deploy karne se cells ka poora maqsad khatam ho jaata hai. Deploy <b>cell-dar-cell</b> hona chahiye, beech mein bake ke saath — pehla cell, phir do, phir baaki. Cells ka sabse bada rozana faayda yahi hai: har release ka blast radius 1/N.' },
        { id: 'auth', why: 'Har cell har request par shared auth service par ja raha hai — yaani auth service gira toh saare cells gire. Ya toh auth ko har cell ke andar rakho (apni replica ke saath), ya token ko <b>self-verifiable</b> banao (signed JWT), taaki cell ko har request par bahar jaana hi na pade.' },
      ],
      fine: {
        cells: 'Cells ka dhaancha bilkul sahi hai — har cell ka apna LB, compute aur database hona hi asli isolation deta hai. Galti cells mein nahi, un <b>shared cheezon</b> mein hai jo cells ke beech ki deewar mein chhed karti hain.',
        obs: 'Per-cell dashboards aur alerts bilkul sahi hain, aur cells ke saath per-cell alerts zaroori bhi hain — warna ek cell ka degradation poore fleet ke average mein chhup jaayega. Per-cell monitoring un kam cheezon mein se hai jo cells ke saath <b>behtar</b> ho jaati hain.',
      },
      lesson: `🎯 Cells banane ke baad asli kaam <b>shared cheezein dhoondhna</b>
        hai. Ek hi sawaal poochho har component par: "kya component cell ke ANDAR hai,
        ya cells ke BEECH mein?" Jo beech mein hai, wahi blast radius wapas 100%
        kar deta hai — aur beech wali cheezein aksar "sirf config hai" wali hoti hain
        ya "sirf auth hai" kehkar chhod di jaati hain.`,
    },
    {
      type: 'quiz',
      title: 'Blast radius ke faisle',
      questions: [
        {
          q: 'Cell-based architecture ka asli faayda kya hai?',
          choices: [
            'Alag-alag cells failure ko apne daayre mein rok sakte hain — kam customers par asar',
            'Cell naam dene se saajhi config ki outage bhi apne aap ruk jaati hai, bas',
            'Barabar cells se customers bhi pakka barabar baant jaate hain, bojh ke saath',
            'Cell design se latency aur kharcha dono ki behtari pakki ho jaati hai',
          ],
          answer: 0,
          explain: 'Seemit failure domains aur cell-dar-cell deploy asar ka daayra ghata sakte hain. "1/N" sirf barabar, alag-thalag placement ka model hai. Saajhi dependencies cells ke paar ja sakti hain, aur isolation ka apna kharcha hai.',
          choiceExplanations: [
            'Seemit failure domains aur cell-dar-cell deploy asar ka daayra ghata sakte hain. "1/N" sirf barabar, alag-thalag placement ka model hai. Saajhi dependencies cells ke paar ja sakti hain, aur isolation ka apna kharcha hai.',
            'Saajhi cheezein (config, auth) cells ke paar bhi gira sakti hain.',
            'Tenants ka bojh tedha ho sakta hai — barabar cells, barabar bojh nahi.',
            'Isolation ka apna kharcha hai (operations, capacity).',
          ],
        },
        {
          q: "8 cells se har customer ko random 2-cell pair milta hai. Do customers ka exact same pair hone ki probability?",
          choices: [
            '1/C(8,2) = 1/28 ≈ 3.6% — barabar random jodiyon par',
            'Ek cell girne ka chance bhi 1/28 — dono ek hi baat hain',
            'Thoda bhi overlap (ek cell saajha) hone ka chance bhi 1/28',
            'Poore fleet par kharab config ka asar bhi 1/28 customers par',
          ],
          answer: 0,
          explain: 'Do customers ko barabar random do-cell jodiyan milein, toh poori jodi same hone ka chance 1/C(8,2) = 1/28 ≈ 3.6%. Thoda overlap aur ek cell girne ka asar alag ginti hain.',
          choiceExplanations: [
            'Do customers ko barabar random do-cell jodiyan milein, toh poori jodi same hone ka chance 1/C(8,2) = 1/28 ≈ 3.6%. Thoda overlap aur ek cell girne ka asar alag ginti hain.',
            'Ek cell girne par asar un customers par hota hai jinke pair mein girne wala cell hai — lagbhag 2/8. Alag sawaal.',
            'Ek cell saajha hona poori jodi same hone se kahin zyada aam hai.',
            'Poore fleet ki config sab cells mein jaati hai — sab par asar, 1/28 nahi.',
          ],
        },
        {
          q: 'Ek cell gir gaya. Gire hue cell ke customers ka traffic kahan jaana chahiye?',
          choices: [
            'Baaki cells ki spare capacity ka plan, ya un customers ko saaf 503 + Retry-After',
            'Baaki cells bina kisi kharch ke saara bojh apne aap utha lenge, chinta nahi',
            'DNS badalte hi standby cell ka data bhi turant taaza ho jaayega, bas switch karo',
            'Naya cell pal bhar mein ban jaata hai — toh recovery ko turant hi samjho',
          ],
          answer: 0,
          explain: 'Barabar baantne par N−1 bache cells par 1/(N−1) extra bojh aata hai (8 cells par ~14%). Plan pehle se: spare capacity, ya saaf 503 + Retry-After. Teesra raasta "dekh lenge" hai — jo baaki cells ko bhi le doobta hai.',
          choiceExplanations: [
            'Barabar baantne par N−1 bache cells par 1/(N−1) extra bojh aata hai (8 cells par ~14%). Plan pehle se: spare capacity, ya saaf 503 + Retry-After. Teesra raasta "dekh lenge" hai — jo baaki cells ko bhi le doobta hai.',
            'Capacity muft nahi banti. 8 cells par barabar baantne mein har bache cell ko ~1/7 (≈14%) extra chahiye.',
            'Traffic modna data ki wapsi ki guarantee nahi.',
            'Naya cell banane, garam karne aur state laane mein waqt lagta hai.',
          ],
        },
        {
          q: 'Cells banane ke baad sabse zaroori kaam kya hai?',
          choices: [
            'Saajhi cheezein dhoondho — config store, auth, router, deploy pipeline',
            'Cells ke alag naam rakh do — alag naam se saajhi failures hat jaati hain',
            'Aur cells jod do — zyada cells se saajha auth bhi apne aap redundant',
            'Cells ke beech replication laga do — har fault apne aap alag ho jaayega',
          ],
          answer: 0,
          explain: 'Saajhi zaroori dependencies aur poore fleet ka rollout alag dikhte cells ko ek saath gira sakte hain. Jo cells ke beech saajha hai, wahi blast radius wapas 100% kar deta hai.',
          choiceExplanations: [
            'Saajhi zaroori dependencies aur poore fleet ka rollout alag dikhte cells ko ek saath gira sakte hain. Jo cells ke beech saajha hai, wahi blast radius wapas 100% kar deta hai.',
            'Naam badalne se dependencies nahi badalti.',
            'Saajhi service ko apna mazboot design chahiye — cells badhane se nahi aata.',
            'Replication isolation ka saboot nahi — galat badlaav bhi copy hota hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Blast radius ko ek design number ki tarah naap sakte ho',
    'Cell-based architecture ki keemat aur faayda dono bata sakte ho',
    'Shuffle sharding ka combinations wala ganit samjha sakte ho',
    'Gire hue cell ke load ka plan (spare ya shed) pehle se rakhte ho',
  ],
  homework: `Apni sabse zaroori service par ek sawaal ka jawab likho: "aaj ek
    kharab deploy kitne percent customers ko chhoo sakta hai?" Agar jawab 100%
    hai (aur zyadatar teams ke liye hai), toh doosra sawaal poochho: sabse chhota
    kadam kya hai jo usko 50% kar de? Aksar jawab poora cell-based architecture
    nahi, sirf <b>cell-dar-cell deploy</b> hota hai.`,
  cards: [
    { front: 'Cell-based architecture ka faayda?', back: 'Sirf <b>blast radius</b> — ek failure 1/N customers ko chhooti hai, aur har <b>release</b> ka blast radius bhi 1/N ho jaata hai. Cells zyada operational kaam hain, kam nahi; tez ya saste bhi nahi.' },
    { front: 'Shuffle sharding kya hai?', back: 'Uniform two-cell assignment mein exact pair overlap <b>1/C(8,2)=3.6%</b>. Poison tenant dono assigned cells ko unhealthy kare toh bilkul same pair wale tenants dono cells kho dete hain. Single-cell loss par 2/8=25% tenants par asar pad sakta hai. Kitni degradation hogi, alternate capacity/retries tay karte hain.' },
    { front: 'Single-cell exposure aur exact pair overlap?', back: 'Uniform one-cell assignment mein hissa <b>1/N</b> hai. Pair assignment mein kisi tay cell se jude tenants ka hissa <b>2/N</b>, exact pair overlap <b>1/C(N,2)</b> hai. Alag fault scenarios ko ek hi blast-radius number mat bolo.' },
    { front: 'Cell gira — cell ka load kahan?', back: 'Do hi imaandar jawab: <b>spare</b> (8 cells par ~14% extra per cell) ya <b>shed</b> (saaf 503 + Retry-After). "Dekh lenge" ka matlab hai baaki cells bhi girenge.' },
    { front: 'Cells ke baad sabse zaroori kaam?', back: '<b>Shared cheezein dhoondhna</b> — config store, auth service, global router, deploy pipeline. Har component par ek sawaal: "cell ke ANDAR hai ya cells ke BEECH mein?"' },
  ],
  interview: {
    title: 'Interview Round — Blast radius',
    instructions: 'Reliability rounds mein blast radius ka sawaal seedha aata hai. 🎤',
    questions: [
      {
        q: '"Ek kharab deploy tumhare kitne customers ko chhoo sakta hai?"',
        choices: [
          'Ek hi fleet par 100% — sabse sasta ilaaj cell-dar-cell deploy, poori architecture nahi',
          'Rollback tez hai, toh customers par asar zero ginna chahiye, chinta ki baat nahi',
          'Replicas ki ginti hi deploy ke blast radius ka sabse sahi naap hai, wahi dekho',
          'Rollout ka naam "staged" hai, toh asli pahunch dekhne ki zaroorat hi nahi',
        ],
        answer: 0,
        explain: 'Radius = kitne customers par asar; samay aur rollback ki raftaar alag naap hain. Fleet ka layout aur rollout ka saboot dekh ke number nikalo. Aaj ek fleet par 100% — aur ghatane ka sabse sasta kadam cell-dar-cell (ya batch-dar-batch) deploy hai.',
        choiceExplanations: [
          'Radius = kitne customers par asar; samay aur rollback ki raftaar alag naap hain. Fleet ka layout aur rollout ka saboot dekh ke number nikalo. Aaj ek fleet par 100% — aur ghatane ka sabse sasta kadam cell-dar-cell (ya batch-dar-batch) deploy hai.',
          'Tez rollback asar ka samay ghataata hai, daayra nahi. Pehle pal mein sab par asar.',
          'Wahi kharab deploy saare replicas par bhi chala jaata hai.',
          'Naam se kuch nahi — rollout ki asli ek-saath pahunch aur bake time dekho.',
        ],
      },
      {
        q: '"Cells banane ka faisla kab lena chahiye?"',
        choices: [
          'Jab ek failure ki keemat N cells chalane se zyada ho — sabse zaroori service par pehle',
          'Har nayi service ko pehle din se hi poore cells mein deploy karo, bina soche',
          'Users ki ek pakki ginti paar hote hi cells zaroori maan lo, wahi niyam hai',
          'Team ka size badhe tab — team size hi reliability ka asli lakshya hai',
        ],
        answer: 0,
        explain: 'Service kitni zaroori, failure ka itihaas, workload baanta ja sakta hai ya nahi, aur operations/capacity ka kharcha — yahi cells ka faisla karte hain. Sabse zaroori service par pehle, har service par nahi.',
        choiceExplanations: [
          'Service kitni zaroori, failure ka itihaas, workload baanta ja sakta hai ya nahi, aur operations/capacity ka kharcha — yahi cells ka faisla karte hain. Sabse zaroori service par pehle, har service par nahi.',
          'Shuruaat ki complexity tabhi theek, jab product ka risk complexity se bada ho.',
          'Koi pakki ginti nahi — failure ki keemat aur workload dekho.',
          'Team size kaam karne ki capacity hai, business ka asar nahi.',
        ],
      },
    ],
  },
},
]);

/* Cell / shuffle-sharding ka ganit */
function cellModel(k) {
  const n = k.cells;
  /* Poison tenant fails its full assigned set: exact set-overlap, not one-cell exposure. */
  const combos = n >= 2 ? (n * (n - 1)) / 2 : 1;
  const blast = n < 2 ? 100 : (k.shuffle ? 100 / combos : 100 / n);
  /* ek cell gira toh uska load baaki (n-1) cells par — utna spare chahiye */
  const need = n < 2 ? 100 : 100 / (n - 1);
  return { cells: n, blast: Math.min(100, blast), need, absorb: n >= 2 && k.spare >= need };
}

})();

/* =====================================================================
   DIST track — ghadiyan jhooth bolti hain
   (eventual ke baad, dbperservice se pehle)
   ===================================================================== */
(function () {
SD.registerLevelsAfter('dist', 'eventual', [
{
  id: 'clocks',
  icon: '🕰️',
  title: 'Ghadiyan Jhooth Bolti Hain',
  badge: 'Kaal Karta',
  objectives: [
    'Wall clock vs monotonic clock — kaunsa kis kaam ke liye',
    'Clock skew se aane wale teen asli bug',
    'Last-write-wins ka chhupa hua data loss',
    'Logical clocks: Lamport, vector, aur hybrid — kab kaunsa',
  ],
  lesson: [
    `<h3>🕰️ Do bilkul alag ghadiyan</h3>
     <table>
       <tr><th></th><th>Wall clock</th><th>Monotonic clock</th></tr>
       <tr><td>Kya batati hai</td><td>"abhi kya samay hai" (1970 se seconds)</td><td>"kitna samay <b>beeta</b>" (kisi bhi shuruaat se)</td></tr>
       <tr><td>Peeche ja sakti hai?</td><td><b>haan</b> — NTP correction, leap second, admin</td><td>kabhi nahi</td></tr>
       <tr><td>Machines ke beech tulna</td><td>ho sakti hai (par jhoothi)</td><td>ho hi nahi sakti</td></tr>
       <tr><td>Kis kaam ke liye</td><td>timestamps dikhane ke liye, logs ke liye</td><td><b>duration naapne ke liye</b>, timeouts ke liye</td></tr>
     </table>
     <p class="tip">🎯 Sabse aam bug: duration naapne ke liye wall clock ka
     istemaal. NTP ghadi 200 ms peeche kar de toh tumhara "elapsed time"
     <b>rinatmak</b> ho jaata hai — aur us number par bana har timeout, rate
     limiter aur circuit breaker ajeeb harkat karta hai.</p>
     <h3>💥 Teen asli bug</h3>
     <pre>1. NEGATIVE DURATION
   start = wallClock()   ... NTP ne ghadi peeche ki ...   end = wallClock()
   end − start  =  −150 ms   →  timeout ka ganit toot gaya

2. LOCK JO DO JAGAH HAI
   Lock ki expiry wall clock par hai. Node A ki ghadi 5 second aage hai,
   isliye A samajhta hai lock khatam ho gaya aur le leta hai —
   jabki B ke hisaab se lock abhi bhi B ka hai. DONO likhte hain.

3. LAST-WRITE-WINS SE DATA LOSS
   Do writes, do alag machines. AAGE wali ghadi ka write "jeet" gaya —
   chahe aage wali ghadi ka write pehle hua ho. Naya data chup-chaap gaayab.</pre>`,
    `<h3>🔢 Logical clocks — samay ki jagah KRAM</h3>
     <p>Asli sawaal aksar "kab hua" nahi hota, <b>"pehle kya hua"</b> hota hai.
     Aur kram jaanne ke liye ghadi ki zaroorat hi nahi.</p>
     <table>
       <tr><th>Tareeka</th><th>Kya deta hai</th><th>Keemat</th></tr>
       <tr><td><b>Lamport clock</b></td><td>ek badhta hua counter — agar A ne B ko kaaran diya toh A ka number chhota hoga</td><td>ulta sach nahi: chhota number matlab "pehle hua" zaroori nahi</td></tr>
       <tr><td><b>Vector clock</b></td><td>bata deta hai ki do events <b>concurrent</b> the ya ek doosre par nirbhar</td><td>size nodes ke saath badhta hai; conflicts app ko suljhhane padte hain</td></tr>
       <tr><td><b>Hybrid (HLC)</b></td><td>physical time + logical counter; causal ordering support karta hai</td><td>concurrent writes ka semantic winner ya linearizability alone decide nahi karta</td></tr>
       <tr><td><b>TrueTime (Spanner)</b></td><td>ghadi ke saath ghadi ki <b>anishchitta</b> bhi deta hai; commit us anishchitta ka intezaar karta hai</td><td>khaas hardware (atomic clocks + GPS) chahiye</td></tr>
     </table>
     <p class="tip">🎯 TrueTime <b>bounded uncertainty interval</b> expose karta hai; accurate clock infrastructure us interval ko useful rakhti hai. Spanner quorum/timestamp protocol ke saath commit wait karta hai jab tak <code>TT.after(commitTimestamp)</code> true na ho. Fixed 7 ms delay ya TrueTime alone linearizability ka proof nahi.</p>
     <h3>⚖️ Last-write-wins kab theek hai?</h3>
     <pre>✅ Theek:   ek hi user ki setting, cache entry, presence/status
            (nuksaan chhota, aur naya write jaldi aa jaata hai)

❌ Galat:   paise, inventory, order status, collaborative document
            (yahan "haar gaya" write ka matlab hai KHOYA hua data)</pre>
     <p>Conflict policy domain se choose karo: atomic constraints/transactions, compare-and-swap versions, append-only events ya explicit merge/conflict resolution. Append-only storage bhi invariant enforcement automatically nahi karta.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsi ghadi, kis kaam ke liye',
      instructions: 'Har kaam ko us cheez mein daalo jispar kaam sach mein tikna chahiye.',
      bins: [
        { id: 'mono', label: '⏱️ Monotonic clock' },
        { id: 'wall', label: '🕰️ Wall clock' },
        { id: 'logical', label: '🔢 Logical clock / version' },
      ],
      items: [
        { text: 'Request ka timeout naapna', bin: 'mono', explain: 'Duration ka har naap monotonic clock par hona chahiye. Wall clock NTP correction par peeche ja sakti hai aur tumhara elapsed time <b>rinatmak</b> ho jaayega.' },
        { text: 'Circuit breaker ka "kitni der se khula hai"', bin: 'mono', explain: 'Breaker ka khula rehna bhi ek duration hai. Wall clock par bana breaker NTP correction ke baad ya toh turant band ho jaayega ya hamesha khula rahega.' },
        { text: 'Rate limiter ka window', bin: 'mono', explain: 'Window ek beeta hua samay hai. Wall clock peeche jaane par window "reset" ho jaati hai aur user ko muft mein doguna quota mil jaata hai.' },
        { text: 'Log line par timestamp likhna', bin: 'wall', explain: 'Yahan wall clock hi chahiye — insaan ko "kab hua" jaanna hai, aur usko doosre systems ke logs se milana hai. Skew se logs milana thoda tedha hota hai, par kaam ka rehta hai.' },
        { text: 'User ko "2 ghante pehle" dikhana', bin: 'wall', explain: 'User ko samay dikhana display hai, decision nahi. Thodi si galti se koi nuksaan nahi hota, aur user ki apni ghadi se milna zaroori hai.' },
        { text: 'Certificate ki expiry check karna', bin: 'wall', explain: 'Expiry ek absolute samay hai jispar sab sehmat hote hain. Isiliye badi ghadi ki galti par TLS toot-ta hai — aur wahi <code>x509: certificate has expired</code> wala outage banti hai.' },
        { text: 'Concurrent writes ka version/causal conflict detect karna', bin: 'logical', explain: 'Yahan wall clock <b>data loss</b> ka kaaran ban jaati hai: aage wali ghadi ka write jeet gaya, chahe aage wali ghadi ka write pehle hua ho. Version vector concurrency detect kar sakta hai; HLC timestamp ordering deta hai, semantic conflict policy app ko chahiye.' },
        { text: 'Distributed lock ki maalikana haq', bin: 'logical', explain: 'Wall clock expiry par bana lock do jagah ja sakta hai (ek node ki ghadi aage, doosri peeche). Sahi tareeka <b>fencing token</b> hai — ek badhta hua number jo storage khud check karta hai.' },
        { text: 'Replicated data mein event ka kram', bin: 'logical', explain: '"Pehle kya hua" ek <b>kram</b> ka sawaal hai, samay ka nahi. Lamport causal order preserve karta hai par converse nahi; vector concurrency identify kar sakta hai; HLC physical time + logical counter use karta hai. Inmein se koi app merge/invariant policy replace nahi karta.' },
      ],
    },
    {
      type: 'order',
      title: 'Clock skew wala bug — kram lagao',
      instructions: 'Ek raat ke incident ke kadam sahi kram mein lagao.',
      steps: [
        { text: '🕰️ Ek node par NTP fail ho gaya aur node ki ghadi dheere-dheere 4 second aage khisak gayi', explain: 'Skew achanak nahi aata — skew dheere badhta hai, aur isiliye lambe samay tak koi alert nahi bajta. NTP <b>offset</b> par alert hona chahiye, sirf NTP process zinda hai ya nahi uspar nahi.' },
        { text: '🔒 Us node ne ek distributed lock liya jiski expiry WALL CLOCK par thi', explain: 'Lock lene wale node ki ghadi 4 second aage hai, isliye node maanta hai ki purana lock khatam ho chuka hai — jabki lock ke asli maalik ke hisaab se lock abhi bhi asli maalik ka hai.' },
        { text: '✍️ Do nodes ek hi record par ek saath likhne lage', explain: 'Ab lock do jagah hai. Do nodes ki likhai wahi <b>split brain</b> hai jo GitHub 2018 mein tha, bas trigger network nahi, ghadi thi.' },
        { text: '🏆 Last-write-wins ne aage wali ghadi ka write chuna — bhale hi chuna gaya write PEHLE hua tha', explain: 'Yahin data chup-chaap khota hai. Koi error nahi, koi alert nahi — bas naya data purane se "haar" gaya kyunki naye data ke timestamp par ek dheemi ghadi thi.' },
        { text: '🤷 Customer ne shikayat ki: "maine save kiya tha, par purana data dikh raha hai"', explain: 'Request errors zero hone par bhi stale/wrong values possible hain. Version comparison, invariant checks aur request traces se detect karo; controlled skew/concurrency test se reproduce karne ki koshish karo.' },
        { text: '🔧 Fix: lock par FENCING TOKEN, aur conflict ke liye version vector', explain: 'Fencing token ek badhta hua number hai jo storage khud check karti hai — purane token wala write reject ho jaata hai, ghadi chahe kuch bhi kahe. Aur version vector conflict ko chhupane ki jagah <b>saamne</b> le aata hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Ghadiyon ke faisle',
      questions: [
        {
          q: 'Timeout naapne ke liye wall clock use karne mein kya galat hai?',
          choices: [
            'Wall clock aage-peeche kood sakti hai (NTP, admin) — tab beeta hua samay galat ya ulta',
            'Wall clock har machine par ek jaisi hoti hai, isliye timeout ke liye sabse sahi hai',
            'NTP chal raha ho toh wall clock kabhi peeche nahi jaati — toh koi khatra hi nahi',
            'Wall clock ki precision kam hai — nanosecond wali ghadi kabhi peeche nahi koodti',
          ],
          answer: 0,
          explain: 'Beeta hua samay naapna ho (timeout, rate limiter, breaker) toh monotonic clock lo — monotonic clock sirf aage chalti hai. Wall clock ko NTP ya admin aage-peeche kar sakte hain, aur leap second bhi aata hai. Ghadi peeche koodi toh beeta samay ulta (negative) ho jaata hai aur timeout ka ganit toot jaata hai. Wall clock tareekh-samay likhne ke liye hai, duration naapne ke liye nahi.',
          choiceExplanations: [
            'Beeta hua samay naapna ho (timeout, rate limiter, breaker) toh monotonic clock lo — monotonic clock sirf aage chalti hai. Wall clock ko NTP ya admin aage-peeche kar sakte hain, aur leap second bhi aata hai. Ghadi peeche koodi toh beeta samay ulta (negative) ho jaata hai aur timeout ka ganit toot jaata hai. Wall clock tareekh-samay likhne ke liye hai, duration naapne ke liye nahi.',
            'Machines ki wall clock mein farak hota hai, aur ek hi machine ki ghadi bhi koodti hai. Duration ke liye monotonic clock chahiye.',
            'NTP theek karte waqt ghadi ko peeche bhi khiska sakta hai (step). Sync hona monotonic hone ki guarantee nahi.',
            'Precision batati hai ghadi kitna baareek ginti hai. Peeche koodna alag baat hai — baareek ghadi bhi kood sakti hai.',
          ],
        },
        {
          q: 'Distributed lock ki expiry wall clock par rakhna khatarnaak kyun hai?',
          choices: [
            'Lease khatam hone ke baad bhi purana holder likh sakta hai — storage par fencing token chahiye',
            'TTL bahut lamba rakh do toh purana holder kabhi khatra nahi banta — bas itna kaafi hai',
            'Lock server linearizable ho toh client ka ruk jaana (GC pause) bhi khatam ho jaata hai',
            'Lock service ki replicas badha do toh storage apne aap purane holder ko rok deta hai',
          ],
          answer: 0,
          explain: 'Ghadiyon ka farak, lamba GC pause ya network ki der — client maan ke chalta hai ki lock abhi bhi mila hua hai, jabki lease kab ki khatam ho chuki. Tab do jagah se likhai hoti hai. Ilaaj: har lock ke saath badhta number (fencing token), aur storage khud purana number thukra de. Lamba TTL khatra nahi mitata, bas lock chhootne mein der lagata hai.',
          choiceExplanations: [
            'Ghadiyon ka farak, lamba GC pause ya network ki der — client maan ke chalta hai ki lock abhi bhi mila hua hai, jabki lease kab ki khatam ho chuki. Tab do jagah se likhai hoti hai. Ilaaj: har lock ke saath badhta number (fencing token), aur storage khud purana number thukra de. Lamba TTL khatra nahi mitata, bas lock chhootne mein der lagata hai.',
            'Pause kitna lamba hoga, koi nahi jaanta. Lamba TTL khatra nahi mitata — bas lock chhootne mein der lagti hai.',
            'Server ki consistency client ke pause ko nahi rok sakti. Ruka hua client jaagte hi purane bharose par likh deta hai.',
            'Lock ki replicas lock service ko mazboot banati hain, storage ko nahi. Storage ko token khud check karna padta hai.',
          ],
        },
        {
          q: 'Last-write-wins kab theek hai aur kab nahi?',
          choices: [
            'Jab haara hua write chupchaap kho jaana manzoor ho — jaise presence; paisa ya stock nahi',
            'User settings mein hamesha theek — setting ka koi bhi badlav kho jaaye, kabhi farak nahi',
            'Presence ko balance ki tarah jod do — har update jodne se koi bhi update nahi khota',
            'Ek se zyada region hon toh LWW hamesha galat — sirf region ki ginti se faisla hota hai',
          ],
          answer: 0,
          explain: 'LWW mein ek saath aaye do writes mein se ek chupchaap phenka jaata hai. Jahan phenka gaya write manzoor hai (presence, cache entry, aksar user setting), LWW theek hai. Paise, stock, order status ya saath mil ke likhe document mein haara hua write = khoya hua data. Har field ke liye alag soch ke tay karo.',
          choiceExplanations: [
            'LWW mein ek saath aaye do writes mein se ek chupchaap phenka jaata hai. Jahan phenka gaya write manzoor hai (presence, cache entry, aksar user setting), LWW theek hai. Paise, stock, order status ya saath mil ke likhe document mein haara hua write = khoya hua data. Har field ke liye alag soch ke tay karo.',
            'Kuch settings bhi zaroori hoti hain — jaise 2FA on karna. 2FA on karne ka badlav kho jaaye toh nuksaan hai.',
            'Presence ek haalat hai (online ya offline), jodne wali sankhya nahi. Paise ki tarah jodna presence par lagta hi nahi.',
            'Region ki ginti akele faisla nahi karti. Faisla is baat se hota hai ki haara hua write kho jaana manzoor hai ya nahi.',
          ],
        },
        {
          q: 'Spanner ne clock ki problem kaise hal ki?',
          choices: [
            'TrueTime se ghadi ki anishchitta jaani; commit dikhane se pehle timestamp beetne diya',
            'Atomic clock se har machine ki ghadi bilkul sahi kar di — galti zero, rukna bhi nahi',
            'Physical ghadi hata ke sirf Lamport ginti lagayi — asli samay ka kaam hi khatam kiya',
            'Saare commits ek hi region mein ek line se karwa diye — ghadi ka sawaal hi khatam',
          ],
          answer: 0,
          explain: 'Spanner ne ghadi ko perfect banane ki koshish nahi ki. TrueTime ek samay nahi, ek range deta hai: "abhi samay X aur Y ke beech hai". Spanner commit timestamp chunta hai, aur commit dikhane se pehle tab tak rukta hai jab tak TT.after(timestamp) sach na ho jaaye (commit-wait) — taaki baad wala commit hamesha baad ka timestamp paaye. Intezaar replication ke saath-saath chal sakta hai. Atomic clock aur GPS range ko chhota rakhte hain, zero nahi karte.',
          choiceExplanations: [
            'Spanner ne ghadi ko perfect banane ki koshish nahi ki. TrueTime ek samay nahi, ek range deta hai: "abhi samay X aur Y ke beech hai". Spanner commit timestamp chunta hai, aur commit dikhane se pehle tab tak rukta hai jab tak TT.after(timestamp) sach na ho jaaye (commit-wait) — taaki baad wala commit hamesha baad ka timestamp paaye. Intezaar replication ke saath-saath chal sakta hai. Atomic clock aur GPS range ko chhota rakhte hain, zero nahi karte.',
            'Atomic clock bhi galti zero nahi karti — bas range chhoti rakhti hai. Isliye commit-wait phir bhi chahiye.',
            'TrueTime asli (physical) samay hi deta hai, galti ki seema ke saath. Lamport ginti asli samay nahi batati.',
            'Spanner kai regions mein likhta hai. Ek region mein sab kuch daalna Spanner ka tareeka nahi.',
          ],
        },
      ],
    },
  ],
  success: [
    'Wall clock aur monotonic clock ka farak aur dono clocks ka sahi istemaal jaante ho',
    'Clock skew ke teen bug pehchan sakte ho',
    'Fencing token se lock ko ghadi se swatantra kar sakte ho',
    'Last-write-wins ka nuksaan-aadharit faisla le sakte ho',
  ],
  homework: `Apne codebase mein <code>System.currentTimeMillis()</code>,
    <code>Date.now()</code>, <code>time.time()</code> ya inke jaise call dhoondho
    aur har ek ke saamne likho: call "kab hua" naap raha hai ya "kitna beeta"?
    Doosra wala har call ek chhupa hua bug hai — usko monotonic clock par le jao
    (<code>performance.now()</code>, <code>System.nanoTime()</code>,
    <code>time.monotonic()</code>).`,
  cards: [
    { front: 'Wall clock vs monotonic clock?', back: '<b>Wall</b> = "kab hua" (peeche ja sakti hai — NTP, leap second). <b>Monotonic</b> = "kitna beeta" (kabhi peeche nahi jaati, machines ke beech tulna nahi ho sakti). Duration, timeout, breaker, rate limit — sab <b>monotonic</b> par.' },
    { front: 'Clock skew ke teen bug?', back: '<b>1.</b> Negative duration (wall clock peeche gayi) · <b>2.</b> Lock do jagah (wall-clock expiry + skew) · <b>3.</b> Last-write-wins se chup-chaap data loss (aage wali ghadi jeet gayi).' },
    { front: 'Distributed lock ka sahi tareeka?', back: '<b>Fencing token</b> — har lock ke saath ek badhta hua number, aur <b>storage khud</b> purane number wale write ko reject karti hai. Ruke hue purane owner ka write tabhi reject hoga jab resource khud token ko atomic tareeke se jaanche. Token service ka sahi chalna, lease ka zinda rehna, aur duplicate asar ke liye idempotency — ye sab phir bhi chahiye.' },
    { front: 'Last-write-wins kab theek?', back: '✅ ek user ki setting, cache entry, presence (nuksaan chhota) · ❌ paise, inventory, order status, collaborative doc — in kaamon mein "haara" write = <b>khoya hua data</b>. Vikalp: append-only events, ya conflict app ke saamne rakho.' },
    { front: 'Spanner ka TrueTime idea?', back: 'TrueTime current uncertainty interval deta hai. Spanner timestamp/quorum protocol aur commit wait (TT.after(commit timestamp)) se external consistency achieve karta hai. Uncertainty variable hai; universal fixed 7 ms wait nahi.' },
  ],
  interview: {
    title: 'Interview Round — Time in distributed systems',
    instructions: 'Clocks ka sawaal seedha depth check karta hai. 🎤',
    questions: [
      {
        q: '"Do replicas par ek hi record ke do writes aaye. Kaunsa rakhoge?"',
        choices: [
          'Pehle tay karo kaunsa nuksaan manzoor hai, phir conflict pakdo aur domain ka niyam lagao',
          'Jiska timestamp naya hai wahi rakho — ghadi ka samay hi asli kram batata hai, hamesha',
          'Jo replica par baad mein pahuncha wahi rakho — pahunchne ka kram hi asli kram hota hai',
          'Dono values bina soche mila do — domain ke niyam aur shartein dekhne ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Pehla sawaal business ka hai: kaunsa write khona chalega? Mehenga ho toh conflict ko chhupao mat — version vector se pakdo, ya writes ko append-only events bana do. Ghadi ka kram asli kram nahi hota, network writes ko aage-peeche pahuncha sakta hai, aur bina soche merge se galat balance ban sakta hai.',
        choiceExplanations: [
          'Pehla sawaal business ka hai: kaunsa write khona chalega? Mehenga ho toh conflict ko chhupao mat — version vector se pakdo, ya writes ko append-only events bana do. Ghadi ka kram asli kram nahi hota, network writes ko aage-peeche pahuncha sakta hai, aur bina soche merge se galat balance ban sakta hai.',
          'Do machines ki ghadiyon mein farak hota hai. Naya timestamp ka matlab baad ka write nahi.',
          'Network writes ko aage-peeche pahuncha sakta hai. Pahunchne ka kram asli kram ka saboot nahi.',
          'Bina niyam ke merge se galat balance ya galat status ban sakta hai. Domain ka niyam chahiye.',
        ],
      },
      {
        q: '"Tumhara distributed lock kabhi do jagah ja sakta hai kya?"',
        choices: [
          'Ruka hua client jaag ke purane lock par likh sakta hai — storage khud token check kare',
          'Lock service consistent hai, toh purane client ka kaam ho hi nahi sakta — khatra zero',
          'TTL bahut lamba rakh do — lamba TTL har GC pause ko aaram se dhak leta hai, hamesha',
          'Lease khatam hote hi client ki chalti hui writes apne aap cancel ho jaati hain, sab',
        ],
        answer: 0,
        explain: 'Lock service bilkul sahi ho tab bhi: client GC pause mein ruka, lease khatam, lock kisi aur ko mila — phir pehla client jaag ke likh deta hai. Lock service nikal chuki write ko wapas nahi le sakti. Ilaaj: fencing token (har lock par badhta number) — storage atomically token jaanche aur purana token thukra de. Ek hi operation dobara aane ka asar rokne ke liye idempotency alag se chahiye; idempotency purane holder ki write nahi rokti.',
        choiceExplanations: [
          'Lock service bilkul sahi ho tab bhi: client GC pause mein ruka, lease khatam, lock kisi aur ko mila — phir pehla client jaag ke likh deta hai. Lock service nikal chuki write ko wapas nahi le sakti. Ilaaj: fencing token (har lock par badhta number) — storage atomically token jaanche aur purana token thukra de. Ek hi operation dobara aane ka asar rokne ke liye idempotency alag se chahiye; idempotency purane holder ki write nahi rokti.',
          'Lock service ki consistency client ke pause ko nahi rokti. Ruka hua client jaagte hi purane bharose par likhta hai.',
          'Pause kitna lamba hoga, pehle se pata nahi. Koi bhi TTL har pause ko dhakne ki guarantee nahi deta.',
          'Lease khatam hona lock service ke andar ka badlav hai. Network mein nikal chuki write wapas nahi aati.',
        ],
      },
    ],
  },
},
]);
})();

})();
