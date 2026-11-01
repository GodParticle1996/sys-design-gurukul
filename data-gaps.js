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
  { text: 'Chunk dedup ka index kitna bada hoga — bloom filter se naapo',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.fpRate < 2) },
  { text: 'Chunk id sortable chuno (index khush rahe)',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.sortable === true) },
  { text: 'Metadata API par peak load — yahi asli service hai',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 8000) },
  { text: 'Metadata cache lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache') },
  { text: 'Ek shared link viral ho gaya',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us file ki key ko phailao',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Ek badi file = bahut saare chunks — protocol ka farak dekho',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'compare' && r.assets >= 40) },
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
  { text: 'Ab partitions theek karo',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle === 0) },
  { text: 'Ek bada domain saara traffic khaa raha hai',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us domain ko todo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Thande connection ka kharcha dekho (DNS + TCP + TLS)',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === false) },
  { text: 'Ab warm connection — farak dekho',
    check: s => s.records.some(r => r.kind === 'net' && r.op === 'trace' && r.warm === true) },
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
     <p>Sabse aam galti yeh hai ki upload backend par jaata hai aur backend
     usko S3 par daalta hai. Us design mein har byte <b>do baar</b> chalti hai
     aur tumhare app servers bandwidth ke liye khareede jaate hain.</p>
     <pre>❌ Client → App Server → S3            (har byte do baar, app server bottleneck)
✅ Client → App Server: "mujhe upload karna hai"
   App Server → Client: presigned URL
   Client → S3 seedha                  (app server sirf permission deta hai)
   S3 → App Server: notification       (metadata update)</pre>
     <p class="tip">🎯 Yeh pattern har jagah dikhta hai — YouTube upload,
     Instagram photo, resume upload, sab. Is large-file design mein app metadata aur authorization sambhalta hai; bytes direct storage par jaati hain. Presigned URL bearer capability hai: <b>shortest practical expiry</b>, scoped key/method, checksum aur renewal/resume design karo. Fixed one-minute expiry universal rule nahi; credentials pehle expire ho sakte hain.</p>`,
    `<h3>🧩 Chunking — ek design, teen faayde</h3>
     <p>File ko 5-10 MB ke chunks mein todo aur har chunk ka
     <b>fingerprint</b> (SHA-256) nikalo. Ek hi faisla teen problem hal karta hai:</p>
     <table>
       <tr><td><b>Resumable</b></td><td>network toota? sirf woh chunks bhejo jo abhi tak nahi gaye</td></tr>
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
            { id: 'presigned', label: 'Direct blob upload; app metadata/permissions sambhale', score: 3, why: 'Direct upload app data-plane traffic bachata hai. Authorization, metadata finalization, integrity checks aur signed-capability expiry still design karni hain.' },
            { id: 'proxy', label: 'Proxy upload; app bytes aur metadata dono sambhale', score: -3, why: 'Har byte <b>do baar</b> chalti hai aur app servers bandwidth ke liye khareede jaate hain. 50 GB ki file par ek hi upload poora server bhar deta hai. Yeh sabse aam aur sabse mehengi galti hai.' },
            { id: 'db', label: 'Database BLOB; file bytes aur metadata saath rakho', score: -3, why: 'Database BLOB support possible hai, par is 50-GB-file workload mein backup/replication/storage path costly ho sakta hai. Object storage bytes aur indexed DB metadata intentional separation hai.' },
          ],
        },
        {
          id: 'chunk', label: 'Badi files kaise', icon: '🧩',
          options: [
            { id: 'cdc', label: 'Content-defined chunks; fingerprint se reuse karo', score: 3, why: 'Ek hi faisla teen cheezein deta hai: resumable upload, dedup, aur parallel transfer. Aur rolling-hash boundaries ki wajah se file ke beech mein badlav sirf <b>aas-paas ke</b> chunks badalta hai.' },
            { id: 'fixed', label: 'Fixed-size chunks; offset aur fingerprint rakho', score: 1, why: 'Resumable aur parallel mil jaata hai, aur poori-file dedup bhi. Par file ke <b>shuru</b> mein ek byte jodne se saare boundaries khisak jaate hain aur poori file dobara upload hoti hai — delta sync yahin marta hai.' },
            { id: 'whole', label: 'Single upload request; final file checksum rakho', score: -3, why: '50 GB ki ek request ka matlab hai: network toota toh shuru se, koi progress nahi, koi dedup nahi, aur koi parallelism nahi. Har load balancer aur proxy ka timeout bhi is raaste mein aayega.' },
          ],
        },
        {
          id: 'sync', label: 'Change device tak kaise pahunche', icon: '🔄',
          options: [
            { id: 'both', label: 'Push plus durable cursor catch-up aur reconciliation', score: 3, why: 'Live push low latency deta hai; durable cursor-based catch-up missing interval recover karta hai. Retention, cursor expiry, dedupe aur authorization explicit chahiye.' },
            { id: 'push', label: 'WebSocket push; reconnect par next live event suno', score: -1, why: 'Is option mein no history/cursor recovery hai. Disconnect interval ke changes miss ho sakte hain; reconnect par sirf naye events sunna enough nahi.' },
            { id: 'poll', label: 'Five-minute polling; har cycle full metadata padho', score: 0, why: 'Bharosemand hai aur simple hai — par 5 minute ki deri collaboration ke liye bahut zyada hai. Aur karodon devices ka polling khud ek load problem ban jaata hai.' },
          ],
        },
        {
          id: 'meta', label: 'Metadata aur sharing', icon: '🗂️',
          options: [
            { id: 'nosql', label: 'Indexed file metadata + indexed user/file mapping', score: 3, why: 'Do sawaal alag-alag tez rehte hain: "is file ka access kise hai" aur "is user ko kaunsi files dikhti hain". Alag mapping table dono ko index se seedha jawab deti hai.' },
            { id: 'array', label: 'File document array; users ke liye no reverse index', score: -2, why: '"Mujhe kaunsi files shared hui hain" ka jawab ab poore collection ka scan hai. Aur ek popular file par woh array badhta jaata hai — ek hi document par write contention.' },
            { id: 'acl', label: 'Remote permission service; mapping schema baad mein', score: 0, why: 'Saaf hai aur bade systems mein hota bhi hai — par har file operation par ek extra network hop jodta hai. Chhote paimane par yeh extra hop ki keemat wasool nahi hoti.' },
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
      successText: `Dhyan do ki mission mein <b>file ki bytes</b> kahin naapi hi
        nahi gayin — kyunki woh bytes tumhare servers se guzarti hi nahi. Asli
        service <b>metadata</b> hai, aur uske teen dabav yahi the: dedup ka index,
        peak read load, aur ek viral shared link.`,
      solution: [
        "estimate --users 500000000 --rps 12000 --bytes 500",
        "bloom --items 100000000 --fp 0.01",
        "id bench --type ulid --rows 1000000",
        "load --rps 12000 --duration 8",
        "sim add cache --ttl 300 --jitter 20",
        "cache hotkey --key file:qtr-report --rps 50000",
        "cache hotkey --key file:qtr-report --rps 50000 --replicas 8",
        "net compare --assets 60",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.cache?.jitterPct > 0 && m.latest(s, 'cache', 'hotkey')?.rps === 50000 && m.latest(s, 'cache', 'hotkey')?.hot === false; },
      hints: [
        "Pehle observation: Traffic aur storage ka andaaza lagao. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ek badi file = bahut saare chunks — protocol ka farak dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nestimate --users 500000000 --rps 12000 --bytes 500\nbloom --items 100000000 --fp 0.01\nid bench --type ulid --rows 1000000\nload --rps 12000 --duration 8\nsim add cache --ttl 300 --jitter 20\ncache hotkey --key file:qtr-report --rps 50000\ncache hotkey --key file:qtr-report --rps 50000 --replicas 8\nnet compare --assets 60",
      ],
    },
    {
      type: 'quiz',
      title: 'File storage ke faisle',
      questions: [
        {
          q: 'Presigned URL ka sabse bada faayda kya hai?',
          choices: ["Bytes direct object storage; app authorization sambhale","Presigned access se application authorization hat jaaye","Direct upload se storage/network billing zero ho jaaye","Signed URL se file integrity check unnecessary ho jaaye"],
          answer: 0,
          explain: "Authorized client direct transfer se app data-plane bandwidth bottleneck avoid kar sakti hai; metadata/finalization validate karo. Capability issue karne se pehle access control chahiye. Storage requests, storage capacity aur network costs remain karte hain. Checksum, size/type aur finalized upload validate karna separate hai.",
         choiceExplanations: ["Authorized client direct transfer se app data-plane bandwidth bottleneck avoid kar sakti hai; metadata/finalization validate karo.","Capability issue karne se pehle access control chahiye.","Storage requests, storage capacity aur network costs remain karte hain.","Checksum, size/type aur finalized upload validate karna separate hai."] },
        {
          q: 'Content-defined chunking fixed-size chunking se behtar kyun hai?',
          choices: ["Local insert ke baad later chunk boundaries resync kar sakti","Content-defined method har workload mein CPU faster hai","Content-defined method fingerprints ke bina match karta","Fixed chunks insert ke baad offsets automatically reset karte"],
          answer: 0,
          explain: "Content-defined boundaries file content par depend karti hain, isliye insertion ke baad later region mein dedup reuse improve ho sakta hai. Rolling fingerprint ka extra CPU bhi hota hai. Boundary/content matching hash/fingerprint semantics maangte hain. Fixed offsets insertion ke baad shifted content ko misalign karte hain.",
         choiceExplanations: ["Content-defined boundaries file content par depend karti hain, isliye insertion ke baad later region mein dedup reuse improve ho sakta hai.","Rolling fingerprint ka extra CPU bhi hota hai.","Boundary/content matching hash/fingerprint semantics maangte hain.","Fixed offsets insertion ke baad shifted content ko misalign karte hain."] },
        {
          q: 'Sync ke liye sirf websocket push kaafi kyun nahi hai?',
          choices: ["Push ke saath durable cursor-based catch-up chahiye","WebSocket reliable transport offline history store karta","Reconnect se server missed changes khud replay karega","Polling add karte hi consumer progress durable ho jaati"],
          answer: 0,
          explain: "Disconnected interval ke events durable change history/cursor se recover karo; catch-up polling ya streaming replay dono ho sakte hain. TCP/WebSocket disconnected clients ke liye application history nahi store karte. Replay explicit server retention/offset protocol maangta hai. Delivery transport alone stored cursor/dedup guarantee nahi.",
         choiceExplanations: ["Disconnected interval ke events durable change history/cursor se recover karo; catch-up polling ya streaming replay dono ho sakte hain.","TCP/WebSocket disconnected clients ke liye application history nahi store karte.","Replay explicit server retention/offset protocol maangta hai.","Delivery transport alone stored cursor/dedup guarantee nahi."] },
        {
          q: 'Presigned URL ki expiry kitni honi chahiye?',
          choices: ["Least practical TTL; resume/renew aur threat model dekho","Har workload ke liye fixed one-minute TTL standard hai","Long-lived bearer URL ko user login jitna safe maano","Expiry se pehle credential expiry ko ignore kar sakte"],
          answer: 0,
          explain: "Presigned URL bearer capability hai; short practical lifetime choose karo, renewal/resume design karo. Credential lifetime aur policy earlier expire kar sakti hain. Universal minute-based TTL requirement nahi. URL leak holder ko scoped capability de sakta hai. Temporary signing credentials ki expiry URL lifetime cap karti hai.",
         choiceExplanations: ["Presigned URL bearer capability hai; short practical lifetime choose karo, renewal/resume design karo. Credential lifetime aur policy earlier expire kar sakti hain.","Universal minute-based TTL requirement nahi.","URL leak holder ko scoped capability de sakta hai.","Temporary signing credentials ki expiry URL lifetime cap karti hai."] },
      ],
    },
  ],
  success: [
    'Presigned URL wala raasta bata sakte ho aur uski wajah bhi',
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
    { front: 'Presigned URL ki expiry?', back: '<b>Minute mein</b>, din mein nahi. Presigned URL ek <b>bearer token</b> hai — jiske paas URL hai uske paas access hai. Resume ke liye client naya URL maang sakta hai.' },
  ],
  interview: {
    title: 'Interview Round — File Storage',
    instructions: 'Dropbox / Google Drive wala classic sawaal. 🎤',
    questions: [
      {
        q: '"Dropbox design karo." Pehla design faisla kya hai?',
        choices: ["Transfer path, metadata aur permissions pehle define karo","Database brand pehle choose; transfer contracts baad mein","Shard count pehle freeze; workload requirements baad mein","Sync channel choose; data correctness contract baad mein"],
        answer: 0,
        explain: "Large-file transfer ke data/control paths define karna early high-impact decision hai; direct signed upload ek common option hai. Technology name requirements ka substitute nahi. Shard sizing traffic/data evidence se aati hai. Notifications reliable source-of-truth/catch-up ko replace nahi karti.",
       choiceExplanations: ["Large-file transfer ke data/control paths define karna early high-impact decision hai; direct signed upload ek common option hai.","Technology name requirements ka substitute nahi.","Shard sizing traffic/data evidence se aati hai.","Notifications reliable source-of-truth/catch-up ko replace nahi karti."] },
      {
        q: "S3 multipart upload mein 50 GB file ke 40 GB parts pahunchne ke baad connection toota. Ab kya?",
        choices: ["Upload ID/parts verify; missing parts retry, phir complete","Stored part list ignore karke complete object upload karo","App server client ke missing bytes background mein banaye","Multipart endpoint ko arbitrary byte-offset PUT bhej do"],
        answer: 0,
        explain: "S3 multipart upload mein upload ID aur uploader-ke-recorded part numbers/ETags preserve karo. ListParts verification se progress reconcile karo, missing parts retry karo; completion request maintained upload records se banao. Already successful parts reuse kiye ja sakte hain. Server unreceived bytes invent nahi kar sakta. Multipart parts aur arbitrary resumable byte-offset protocol alag contracts hain.",
       choiceExplanations: ["S3 multipart upload mein upload ID aur uploader-ke-recorded part numbers/ETags preserve karo. ListParts verification se progress reconcile karo, missing parts retry karo; completion request maintained upload records se banao.","Already successful parts reuse kiye ja sakte hain.","Server unreceived bytes invent nahi kar sakta.","Multipart parts aur arbitrary resumable byte-offset protocol alag contracts hain."] },
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

10,000,000,000 pages ÷ 3,750 ÷ 86,400 ÷ 5 din  =  lagbhag 8 machines</pre>
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
       <tr><td>Sawaal</td><td>"yeh URL pehle crawl hua?"</td><td>"yeh PAGE pehle dekha?"</td></tr>
       <tr><td>Kab</td><td>queue mein daalne se PEHLE</td><td>fetch karne ke BAAD</td></tr>
       <tr><td>Kaise</td><td>URL normalize karo, phir hash → index/bloom</td><td>content ka hash (ya simhash, near-duplicate ke liye)</td></tr>
       <tr><td>Kyun zaroori</td><td>ek hi page baar-baar fetch na ho</td><td>ek hi content alag URLs par milta hai (session ids, tracking params, mirrors)</td></tr>
     </table>
     <p>Content dedup ke bina crawler apni storage ka bada hissa <b>ek hi page ke
     alag-alag URLs</b> par kharch kar deta hai — aur woh baad mein har downstream
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
            { id: 'domain', label: 'Durable frontier + shared per-domain rate budget', score: 3, why: 'Domain owner/shared atomic rate budget aggregate dispatch coordinate karta hai. Durable scheduling, lease recovery aur failure races test karo; queue ya Redis ka naam alone guarantee nahi.' },
            { id: 'plain', label: 'Plain FIFO frontier + independent worker throttles', score: -2, why: 'Ek popular domain ke hazaaron URLs queue mein aas-paas honge, aur saare workers ek saath us domain par toot padenge. Politeness worker ke andar nahi, <b>queue</b> mein lagti hai.' },
            { id: 'db', label: 'Database URL table + unlocked SELECT and dispatch', score: -1, why: 'Database-backed queue valid ho sakti hai, par is option mein unlocked SELECT duplicate dispatch aur no shared rate budget chhodta hai. Atomic claiming, indexing, partitioning aur domain scheduling chahiye.' },
          ],
        },
        {
          id: 'dedup', label: 'Dedup', icon: '🔁',
          options: [
            { id: 'both', label: 'URL before enqueue + content hash after fetch', score: 3, why: 'Do alag problem, do alag jagah. URL dedup ek hi page ko baar-baar fetch hone se rokta hai; content dedup un pages ko pakadta hai jo alag URL par ek jaisa content dete hain (session id, tracking params, mirrors).' },
            { id: 'url', label: 'URL before enqueue; fetched payload sab store karo', score: 0, why: 'Zaroori hissa hai par aadha. Bina content dedup ke storage ka bada hissa ek hi page ke alag-alag URLs par jaayega — aur woh gandagi har downstream system mein bhi pahunchegi.' },
            { id: 'none', label: 'Raw links enqueue; payload equality skip kar do', score: -3, why: 'Web par ek hi content darjan URLs par milta hai (tracking params, session ids, http/https, www/non-www, mirrors). Bina dedup ke crawler apne hi loops mein ghoomta rahega.' },
          ],
        },
        {
          id: 'dns', label: 'DNS', icon: '🌐',
          options: [
            { id: 'cache', label: 'TTL-aware DNS cache + resolver sizing + reuse', score: 3, why: 'TTL-aware cache repeat lookups kam karti hai; measured resolver sizing aur connection reuse lookup/handshake work reduce karte hain. Exact gain trace aur origin mix se validate karo.' },
            { id: 'default', label: 'Default DNS config; resolver capacity skip karo', score: -2, why: 'Default resolver sufficient ho sakta hai, par bina capacity/cache/latency measurement usko sufficient assume karna evidence nahi. Is scale par resolver QPS aur error behavior test karo.' },
            { id: 'prefetch', label: 'One DNS prefetch; later expiry/refetch skip karo', score: 0, why: 'Achhi soch hai aur bade crawlers karte bhi hain — par domains ki list crawl ke dauraan hi badhti hai, isliye prefetch akela kaafi nahi. Cache ke saath jodo, cache ki jagah nahi.' },
          ],
        },
        {
          id: 'trap', label: 'Traps aur infinite space', icon: '🕳️',
          options: [
            { id: 'depth', label: 'Depth limit plus per-domain page/time budgets', score: 3, why: 'Depth, page aur time budgets exploration bound karte hain. Infinite combinations shallow bhi ho sakti hain; depth limit alone enough nahi. Coverage loss ko measure karo.' },
            { id: 'detect', label: 'URL pattern detection; crawl budget hata do', score: 0, why: 'Kaam karta hai aur bade crawlers isko bhi rakhte hain — par yeh mehenga aur naazuk hai, aur naye trap patterns hamesha aate rahenge. Pehle sasta guard (depth + budget) lagao, phir smart detection.' },
            { id: 'none', label: 'Robots allow/disallow; crawl budget hata do', score: -2, why: 'robots.txt <b>ijazat</b> ke baare mein hai, <b>anantata</b> ke baare mein nahi. Ek calendar page jo har agli tareekh ka link deta hai, woh robots.txt mein allowed ho sakta hai aur phir bhi tumhara crawler hamesha ke liye usi mein ghoomta rahega.' },
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
      goal: `Paimana nikalo, dedup ka index naapo, frontier ke partitions theek
             karo, ek bade domain ka hot partition sambhaalo, aur DNS/handshake
             ka kharcha dekho.`,
      sys: SD.sys.txn({
        name: 'crawler-frontier',
        slo: { p99Ms: 500, availability: 99 },
        api: { countTotal: false, pagination: 'cursor' },
      }),
      tasks: T_CRAWLER,
      success: SD.allTasks(T_CRAWLER),
      successText: `Dhyan do ki kahin bhi "aur machines daalo" jawab nahi tha.
        Crawler ke chaaron dabav — dedup ka index, partition ka balance, ek bada
        domain, aur DNS ka handshake — <b>coordination</b> ke dabav hain,
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
        "Pehle observation: Crawl ka paimana nikalo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab warm connection — farak dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nestimate --users 10000000 --rps 3750 --bytes 2000000\nbloom --items 1000000000 --fp 0.01\nhll --items 1000000000\nstream partitions --partitions 6 --consumers 8\nstream partitions --partitions 12 --consumers 8\ncache hotkey --key domain:wikipedia.org --rps 50000\ncache hotkey --key domain:wikipedia.org --rps 50000 --replicas 8\nnet trace --rtt 40\nnet trace --rtt 40 --warm",
      ],
    },
    {
      type: 'quiz',
      title: 'Crawler ke faisle',
      questions: [
        {
          q: '10 arab pages ke liye sirf 8 machines kaafi nikleen. Is number ka asli sabak kya hai?',
          choices: ["Bandwidth floor nikla; bottleneck ab measure karna hai","Eight machines measured production sufficiency proof hain","DNS har crawler mein CPU/network se pehle limit hai","Storage/parser cost nominal NIC rate mein include hai"],
          answer: 0,
          explain: "Eight machines stated NIC/utilization assumptions ka estimate hai; bandwidth, CPU parsing, storage, domain mix aur DNS separately validate karo. Calculation benchmark nahi. Bottleneck workload aur actual measurement par depend hai. NIC throughput parser/storage capacity prove nahi karti.",
         choiceExplanations: ["Eight machines stated NIC/utilization assumptions ka estimate hai; bandwidth, CPU parsing, storage, domain mix aur DNS separately validate karo.","Calculation benchmark nahi.","Bottleneck workload aur actual measurement par depend hai.","NIC throughput parser/storage capacity prove nahi karti."] },
        {
          q: 'Politeness (1 req/sec/domain) worker ke andar lagane mein kya galat hai?',
          choices: ["Per-domain budget workers ke across coordinate karo","Har worker ka local 1/s global limit enforce karega","Worker count badhe toh domain ki allowed rate badhe","robots.txt allow ho toh concurrency unlimited rakh do"],
          answer: 0,
          explain: "Shared scheduler/partition owner ya coordinated limit all workers ka aggregate domain budget enforce kar sakti hai. N local independent budgets aggregate N/s ho sakte hain. Domain ki agreed/requested politeness worker count se nahi badalti. Allowed crawling bhi bounded respectful request behavior maangta hai.",
         choiceExplanations: ["Shared scheduler/partition owner ya coordinated limit all workers ka aggregate domain budget enforce kar sakti hai.","N local independent budgets aggregate N/s ho sakte hain.","Domain ki agreed/requested politeness worker count se nahi badalti.","Allowed crawling bhi bounded respectful request behavior maangta hai."] },
        {
          q: 'URL dedup ke baad bhi content dedup kyun chahiye?',
          choices: ["Different URLs same content return kar sakte hain","URL equality se content identity already prove hoti","Content hash robots policy check ko replace karta hai","Content hash fetch bandwidth pehle se bacha deta hai"],
          answer: 0,
          explain: "Fetch ke baad content fingerprint duplicate/mirror/variant URLs ke same payload identify kar sakta hai. Distinct normalized URLs bhi same page serve kar sakti hain. Content equality access/robots policy nahi. Post-fetch dedup already spent fetch bandwidth recover nahi karta.",
         choiceExplanations: ["Fetch ke baad content fingerprint duplicate/mirror/variant URLs ke same payload identify kar sakta hai.","Distinct normalized URLs bhi same page serve kar sakti hain.","Content equality access/robots policy nahi.","Post-fetch dedup already spent fetch bandwidth recover nahi karta."] },
        {
          q: 'Crawler traps se bachne ka sabse sasta ilaaj kya hai?',
          choices: ["Depth aur per-domain budget se exploration bound karo","robots.txt allow ho toh every generated URL follow karo","Content hash ko infinite unique calendar ka cap maano","One global FIFO se per-domain trap detect maan lo"],
          answer: 0,
          explain: "Budgets/depth/url-pattern controls crawl frontier finite rakhte hain; coverage tradeoff aur content semantics monitor karo. Robots policy infinite URL space ko necessarily bound nahi karti. Calendar genuinely distinct content generate kar sakta hai. Queue ordering trap budget enforce nahi karti.",
         choiceExplanations: ["Budgets/depth/url-pattern controls crawl frontier finite rakhte hain; coverage tradeoff aur content semantics monitor karo.","Robots policy infinite URL space ko necessarily bound nahi karti.","Calendar genuinely distinct content generate kar sakta hai.","Queue ordering trap budget enforce nahi karti."] },
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
    { front: 'Politeness kahan lagti hai?', back: 'Aggregate per-domain dispatch coordinate karo: partition owner/shared atomic rate budget ek option hai. 500 independent local 1/s budgets 500/s bhej sakte hain. Durable claiming, retries aur scheduler races test karo.' },
    { front: 'Do dedup kaunse?', back: '<b>URL dedup</b> — queue mein daalne se pehle (normalize + hash). <b>Content dedup</b> — fetch ke baad (content hash / simhash). Ek hi content darjan URLs par milta hai: tracking params, session ids, mirrors.' },
    { front: 'DNS ka kharcha kitna?', back: 'Universal percentage nahi. DNS lookup latency/cache misses aur resolver QPS trace karo; TTL-aware resolver cache, capacity/redundancy aur connection reuse evaluate karo. Arbitrary TTL overrun safe assumption nahi.' },
    { front: 'Crawler traps ka sasta ilaaj?', back: '<b>Max depth</b> (seed se 15-20 hop) + <b>per-domain page budget</b>. robots.txt ijazat ke baare mein hai, anantata ke baare mein nahi — calendar page allowed bhi ho sakta hai aur anant bhi.' },
  ],
  interview: {
    title: 'Interview Round — Web Crawler',
    instructions: 'Yeh sawaal estimation aur coordination dono test karta hai. 🎤',
    questions: [
      {
        q: '"Web crawler design karo, 10 arab pages 5 din mein." Pehla kaam?',
        choices: ["Rate, bytes aur domain constraints ka estimate banao","Eight machines freeze karo; parser/storage test chhod do","Database schema finalize; throughput baad mein estimate","Global FIFO banaao; domain scheduling baad mein jodo"],
        answer: 0,
        explain: "10b pages/5 days ke rate, payload, CPU/storage aur politeness assumptions calculate karke design bottlenecks identify karo. Nominal NIC estimate capacity guarantee nahi. Access/storage volume schema design ko inform karte hain. Politeness owner scheduling architectural requirement hai.",
       choiceExplanations: ["10b pages/5 days ke rate, payload, CPU/storage aur politeness assumptions calculate karke design bottlenecks identify karo.","Nominal NIC estimate capacity guarantee nahi.","Access/storage volume schema design ko inform karte hain.","Politeness owner scheduling architectural requirement hai."] },
      {
        q: '"Tumhara crawler ek hi site par toot pada aur unhone tumhein block kar diya. Kya galat tha?"',
        choices: ["Aggregate domain budget aur routing ownership check karo","Sirf user-agent rename karo; aggregate rate wahi rakho","Sirf workers badhao; har worker apni rate maane","Sirf robots allow dekho; arrival burst ignore karo"],
        answer: 0,
        explain: "Multiple workers ke local limits site-wide limit multiply kar sakte hain; global/domain-owned scheduling aur site policy inspect karo. Identity label abusive aggregate traffic fix nahi karti. More independent workers violation amplify kar sakte hain. Allowed URLs aur acceptable aggregate rate different concerns hain.",
       choiceExplanations: ["Multiple workers ke local limits site-wide limit multiply kar sakte hain; global/domain-owned scheduling aur site policy inspect karo.","Identity label abusive aggregate traffic fix nahi karti.","More independent workers violation amplify kar sakte hain.","Allowed URLs aur acceptable aggregate rate different concerns hain."] },
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
    'Cell-based architecture: kyun, aur uski asli keemat',
    'Shuffle sharding — kam cells mein bahut chhota blast radius',
    'Cell fail hone par uska load kahan jaayega — spare ya shed',
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
     Yahi "baat nahi karte" wali baat unki poori taakat hai.</p>
     <h3>💰 Cells ki asli keemat</h3>
     <table>
       <tr><th>Kya milta hai</th><th>Kya dena padta hai</th></tr>
       <tr><td>Blast radius 1/N</td><td>N control planes, N deploy targets, N monitoring dashboards</td></tr>
       <tr><td>Capacity add karna local ho jaata hai (naya cell)</td><td>Har cell mein alag se spare capacity</td></tr>
       <tr><td>Deploy bhi cell-dar-cell ho sakta hai</td><td>Routing layer chahiye: "yeh customer kaunse cell mein hai?"</td></tr>
       <tr><td>Ek cell ka data doosre cell tak nahi rista</td><td>Cross-cell query ab ek fan-out hai</td></tr>
     </table>
     <p class="tip">🎯 Cells <b>zyada</b> operational kaam hain, kam nahi — aur
     seedhe-seedhe tez ya saste bhi nahi. Poora faayda ek hi jagah hai: failure
     ka daayra. Isliye cells us system par lagao jiska <b>girna sabse mehenga</b>
     hai, har system par nahi.</p>`,
    `<h3>🎲 Shuffle sharding — full overlap aur partial exposure</h3>
     <p>8 cells aur uniform random two-cell assignments lo. Ek poison tenant apne <b>dono assigned cells</b> ko unhealthy bana deta hai. Doosra tenant tab poori tarah unavailable hai jab uska <b>exact same pair</b> ho; partial-overlap tenant surviving cell use kar sakta hai, agar retries aur headroom tested hon.</p>
     <pre>C(8,2) = 28 distinct pairs
Exact same pair share = 1/28 = 3.6%
Ek named cell se assigned tenants = 2/8 = 25%
Sirf ek cell down: full pair loss = 0%, par 25% tenants exposed</pre>
     <p class="tip">🎯 <b>3.6% exact-pair full loss</b> single-cell blast radius nahi. Two-cell poison scenario mein partial degradation aur shared dependency failure alag metrics hain. Uniform assignment mathematical assumption hai; actual placement skew, retry success aur survivor capacity measure karo.</p>
     <h3>🪣 Aur ek sawaal jo hamesha chhoot jaata hai</h3>
     <p>Ek cell gira. Uske users ka traffic <b>kahan jaayega?</b> Do hi jawab hain:</p>
     <pre>1. SPARE se absorb karo  →  har cell mein 100/(N-1) % extra capacity chahiye
                             8 cells par woh lagbhag 14% extra hai

2. SHED kar do            →  un users ko saaf 503 + Retry-After
                             (baaki cells surakshit rehte hain)</pre>
     <p>Teesra jawab — "dekh lenge" — asal mein pehla wala hai, bas bina plan ke.
     Aur bina spare ke woh traffic baaki cells ko bhi le dooba deta hai, yaani
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
          note: 'Ek cell gira toh uska load baaki cells par jaayega — usko absorb karne ke liye.' },
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
      instructions: 'Yeh "cell-based" architecture kehlaata hai — par ismein char cheezein blast radius ko wapas 100% bana deti hain. Chaaron pakdo.',
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
        { id: 'router', why: 'Global router khud ek <b>single point of failure</b> hai — woh gira toh saare 8 cells zinda hote hue bhi kisi kaam ke nahi. Router ko sabse simple, sabse sthir cheez rakho (DNS ya static mapping), aur uska apna failure mode <b>fail-static</b> ho: naya mapping na mil paaye toh purana chalta rahe.' },
        { id: 'cfg', why: 'Ek hi config service se saare cells live padh rahe hain — yaani ek kharab config ek saath 8 cells par. Yeh <b>Cloudflare 2025</b> wali kadi hai, bas cells ke andar. Config bhi <b>cell-dar-cell</b> jaani chahiye, aur har cell ke paas aakhri acchi copy honi chahiye.' },
        { id: 'deploy', why: 'Ek saath saare cells par deploy karne se cells ka poora maqsad khatam ho jaata hai. Deploy <b>cell-dar-cell</b> hona chahiye, beech mein bake ke saath — pehla cell, phir do, phir baaki. Cells ka sabse bada rozana faayda yahi hai: har release ka blast radius 1/N.' },
        { id: 'auth', why: 'Har cell har request par shared auth service par ja raha hai — yaani auth service gira toh saare cells gire. Ya toh auth ko har cell ke andar rakho (apni replica ke saath), ya token ko <b>self-verifiable</b> banao (signed JWT), taaki cell ko har request par bahar jaana hi na pade.' },
      ],
      fine: {
        cells: 'Cells ka dhaancha bilkul sahi hai — har cell ka apna LB, compute aur database hona hi asli isolation deta hai. Galti cells mein nahi, un <b>shared cheezon</b> mein hai jo unke beech ki deewar mein chhed karti hain.',
        obs: 'Per-cell dashboards aur alerts bilkul sahi hain, aur cells ke saath yeh zaroori bhi hain — warna ek cell ka degradation poore fleet ke average mein chhup jaayega. Yeh un kam cheezon mein se hai jo cells ke saath <b>behtar</b> ho jaati hain.',
      },
      lesson: `🎯 Cells banane ke baad asli kaam <b>shared cheezein dhoondhna</b>
        hai. Ek hi sawaal poochho har component par: "kya yeh cell ke ANDAR hai,
        ya cells ke BEECH mein?" Jo beech mein hai, wahi blast radius wapas 100%
        kar deta hai — aur woh aksar woh cheezein hoti hain jo "sirf config hai"
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
    { front: 'Shuffle sharding kya hai?', back: 'Uniform two-cell assignment mein exact pair overlap <b>1/C(8,2)=3.6%</b>. Poison tenant dono assigned cells ko unhealthy kare toh identical pair full lose karti hai. Single-cell loss par 2/8=25% tenants exposed hain; alternate capacity/retries determine degradation.' },
    { front: 'Single-cell exposure aur exact pair overlap?', back: 'Uniform one-cell assignment ka share <b>1/N</b>; pair assignment mein named cell exposure <b>2/N</b>, exact pair overlap <b>1/C(N,2)</b>. Alag fault scenarios ko same blast-radius number mat bolo.' },
    { front: 'Cell gira — uska load kahan?', back: 'Do hi imaandar jawab: <b>spare</b> (8 cells par ~14% extra per cell) ya <b>shed</b> (saaf 503 + Retry-After). "Dekh lenge" ka matlab hai baaki cells bhi girenge.' },
    { front: 'Cells ke baad sabse zaroori kaam?', back: '<b>Shared cheezein dhoondhna</b> — config store, auth service, global router, deploy pipeline. Har component par ek sawaal: "cell ke ANDAR hai ya cells ke BEECH mein?"' },
  ],
  interview: {
    title: 'Interview Round — Blast radius',
    instructions: 'Reliability rounds mein yeh sawaal seedha aata hai. 🎤',
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
   jabki B ke hisaab se lock abhi bhi uska hai. DONO likhte hain.

3. LAST-WRITE-WINS SE DATA LOSS
   Do writes, do alag machines. Jiski ghadi AAGE thi, woh "jeet" gaya —
   chahe uska write pehle hua ho. Naya data chup-chaap gaayab.</pre>`,
    `<h3>🔢 Logical clocks — samay ki jagah KRAM</h3>
     <p>Asli sawaal aksar "kab hua" nahi hota, <b>"pehle kya hua"</b> hota hai.
     Aur uske liye ghadi ki zaroorat hi nahi.</p>
     <table>
       <tr><th>Tareeka</th><th>Kya deta hai</th><th>Keemat</th></tr>
       <tr><td><b>Lamport clock</b></td><td>ek badhta hua counter — agar A ne B ko kaaran diya toh A ka number chhota hoga</td><td>ulta sach nahi: chhota number matlab "pehle hua" zaroori nahi</td></tr>
       <tr><td><b>Vector clock</b></td><td>bata deta hai ki do events <b>concurrent</b> the ya ek doosre par nirbhar</td><td>size nodes ke saath badhta hai; conflicts app ko suljhhane padte hain</td></tr>
       <tr><td><b>Hybrid (HLC)</b></td><td>physical time + logical counter; causal ordering support karta hai</td><td>concurrent writes ka semantic winner ya linearizability alone decide nahi karta</td></tr>
       <tr><td><b>TrueTime (Spanner)</b></td><td>ghadi ke saath uski <b>anishchitta</b> bhi deta hai; commit us anishchitta ka intezaar karta hai</td><td>khaas hardware (atomic clocks + GPS) chahiye</td></tr>
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
      instructions: 'Har kaam ko us cheez mein daalo jispar woh sach mein tikna chahiye.',
      bins: [
        { id: 'mono', label: '⏱️ Monotonic clock' },
        { id: 'wall', label: '🕰️ Wall clock' },
        { id: 'logical', label: '🔢 Logical clock / version' },
      ],
      items: [
        { text: 'Request ka timeout naapna', bin: 'mono', explain: 'Duration ka har naap monotonic clock par hona chahiye. Wall clock NTP correction par peeche ja sakti hai aur tumhara elapsed time <b>rinatmak</b> ho jaayega.' },
        { text: 'Circuit breaker ka "kitni der se khula hai"', bin: 'mono', explain: 'Yeh bhi ek duration hai. Wall clock par bana breaker NTP correction ke baad ya toh turant band ho jaayega ya hamesha khula rahega.' },
        { text: 'Rate limiter ka window', bin: 'mono', explain: 'Window ek beeta hua samay hai. Wall clock peeche jaane par window "reset" ho jaati hai aur user ko muft mein doguna quota mil jaata hai.' },
        { text: 'Log line par timestamp likhna', bin: 'wall', explain: 'Yahan wall clock hi chahiye — insaan ko "kab hua" jaanna hai, aur usko doosre systems ke logs se milana hai. Skew se woh milana thoda tedha hota hai, par kaam ka rehta hai.' },
        { text: 'User ko "2 ghante pehle" dikhana', bin: 'wall', explain: 'Yeh display hai, decision nahi. Thodi si galti se koi nuksaan nahi hota, aur user ki apni ghadi se milna zaroori hai.' },
        { text: 'Certificate ki expiry check karna', bin: 'wall', explain: 'Expiry ek absolute samay hai jispar sab sehmat hote hain. Isiliye badi ghadi ki galti par TLS toot-ta hai — aur wahi <code>x509: certificate has expired</code> wala outage banti hai.' },
        { text: 'Concurrent writes ka version/causal conflict detect karna', bin: 'logical', explain: 'Yahan wall clock <b>data loss</b> ka kaaran ban jaati hai: jiski machine ki ghadi aage thi woh jeet gaya, chahe uska write pehle hua ho. Version vector concurrency detect kar sakta hai; HLC timestamp ordering deta hai, semantic conflict policy app ko chahiye.' },
        { text: 'Distributed lock ki maalikana haq', bin: 'logical', explain: 'Wall clock expiry par bana lock do jagah ja sakta hai (ek node ki ghadi aage, doosri peeche). Sahi tareeka <b>fencing token</b> hai — ek badhta hua number jo storage khud check karta hai.' },
        { text: 'Replicated data mein event ka kram', bin: 'logical', explain: '"Pehle kya hua" ek <b>kram</b> ka sawaal hai, samay ka nahi. Lamport causal order preserve karta hai par converse nahi; vector concurrency identify kar sakta hai; HLC physical time + logical counter use karta hai. Inmein se koi app merge/invariant policy replace nahi karta.' },
      ],
    },
    {
      type: 'order',
      title: 'Clock skew wala bug — kram lagao',
      instructions: 'Ek raat ke incident ke kadam sahi kram mein lagao.',
      steps: [
        { text: '🕰️ Ek node par NTP fail ho gaya aur uski ghadi dheere-dheere 4 second aage khisak gayi', explain: 'Skew achanak nahi aata — woh dheere badhta hai, aur isiliye lambe samay tak koi alert nahi bajta. NTP <b>offset</b> par alert hona chahiye, sirf NTP process zinda hai ya nahi uspar nahi.' },
        { text: '🔒 Us node ne ek distributed lock liya jiski expiry WALL CLOCK par thi', explain: 'Uski ghadi 4 second aage hai, isliye woh maanta hai ki purana lock khatam ho chuka hai — jabki lock ke asli maalik ke hisaab se lock abhi bhi uska hai.' },
        { text: '✍️ Do nodes ek hi record par ek saath likhne lage', explain: 'Ab lock do jagah hai. Yeh wahi <b>split brain</b> hai jo GitHub 2018 mein tha, bas trigger network nahi, ghadi thi.' },
        { text: '🏆 Last-write-wins ne aage wali ghadi ka write chuna — bhale hi woh PEHLE hua tha', explain: 'Yahin data chup-chaap khota hai. Koi error nahi, koi alert nahi — bas naya data purane se "haar" gaya kyunki uske timestamp par ek dheemi ghadi thi.' },
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
    'Wall clock aur monotonic clock ka farak aur unka sahi istemaal jaante ho',
    'Clock skew ke teen bug pehchan sakte ho',
    'Fencing token se lock ko ghadi se swatantra kar sakte ho',
    'Last-write-wins ka nuksaan-aadharit faisla le sakte ho',
  ],
  homework: `Apne codebase mein <code>System.currentTimeMillis()</code>,
    <code>Date.now()</code>, <code>time.time()</code> ya inke jaise call dhoondho
    aur har ek ke saamne likho: yeh "kab hua" naap raha hai ya "kitna beeta"?
    Doosra wala har call ek chhupa hua bug hai — usko monotonic clock par le jao
    (<code>performance.now()</code>, <code>System.nanoTime()</code>,
    <code>time.monotonic()</code>).`,
  cards: [
    { front: 'Wall clock vs monotonic clock?', back: '<b>Wall</b> = "kab hua" (peeche ja sakti hai — NTP, leap second). <b>Monotonic</b> = "kitna beeta" (kabhi peeche nahi jaati, machines ke beech tulna nahi ho sakti). Duration, timeout, breaker, rate limit — sab <b>monotonic</b> par.' },
    { front: 'Clock skew ke teen bug?', back: '<b>1.</b> Negative duration (wall clock peeche gayi) · <b>2.</b> Lock do jagah (wall-clock expiry + skew) · <b>3.</b> Last-write-wins se chup-chaap data loss (aage wali ghadi jeet gayi).' },
    { front: 'Distributed lock ka sahi tareeka?', back: '<b>Fencing token</b> — har lock ke saath ek badhta hua number, aur <b>storage khud</b> purane number wale write ko reject karti hai. Paused owner ka stale write reject ho sakta hai only if resource token atomically validates kare. Token service correctness, lease liveness aur duplicate effects ke liye idempotency still chahiye.' },
    { front: 'Last-write-wins kab theek?', back: '✅ ek user ki setting, cache entry, presence (nuksaan chhota) · ❌ paise, inventory, order status, collaborative doc — wahan "haara" write = <b>khoya hua data</b>. Vikalp: append-only events, ya conflict app ke saamne rakho.' },
    { front: 'Spanner ka TrueTime idea?', back: 'TrueTime current uncertainty interval deta hai. Spanner timestamp/quorum protocol aur commit wait (TT.after(commit timestamp)) se external consistency achieve karta hai. Uncertainty variable hai; universal fixed 7 ms wait nahi.' },
  ],
  interview: {
    title: 'Interview Round — Time in distributed systems',
    instructions: 'Yeh sawaal seedha depth check karta hai. 🎤',
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
