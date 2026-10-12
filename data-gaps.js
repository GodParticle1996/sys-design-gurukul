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
    'File kabhi bhi app server se hokar nahi jaani chahiye — presigned URL',
    'Chunking + fingerprinting: resumable upload aur dedup, ek hi design se',
    'Content-defined chunking kyun fixed-size se behtar hai',
    'Sync ka jhagda: websocket push + periodic poll, dono chahiye',
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
     Instagram photo, resume upload, sab. App server ka kaam <b>ijazat dena</b>
     hai, <b>bytes dhona</b> nahi. Aur presigned URL ki expiry <b>minute</b>
     mein rakho, din mein nahi.</p>`,
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
     <p class="tip">🎯 Content-defined chunking hi delta sync ko kaam ka banata
     hai. Ek 2 GB video file mein ek metadata tag badla — fixed-size chunking
     mein 2 GB dobara jaata hai, content-defined mein lagbhag 10 MB.</p>
     <h3>🔄 Sync — websocket aur polling, dono</h3>
     <p>Websocket se change turant push hota hai. Par websocket toot-ta hai —
     laptop band hua, network badla, phone sleep mein gaya. Isliye <b>saath mein</b>
     har kuch minute ka polling bhi chahiye, jo chhoote hue changes utha laaye.</p>
     <p>Yeh "push + periodic poll" wala jodi-pattern har reliable sync system
     mein hai. Push <b>latency</b> deta hai; poll <b>guarantee</b> deta hai.
     Akela push kabhi kaafi nahi hota.</p>`,
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
            { id: 'presigned', label: 'Client seedha blob storage par, presigned URL se', score: 3, why: 'App server sirf <b>ijazat</b> deta hai, bytes nahi dhota. Har byte ek hi baar chalti hai, aur app servers ko bandwidth ke liye scale karne ki zaroorat hi nahi rehti.' },
            { id: 'proxy', label: 'Client → app server → blob storage', score: -3, why: 'Har byte <b>do baar</b> chalti hai aur app servers bandwidth ke liye khareede jaate hain. 50 GB ki file par ek hi upload poora server bhar deta hai. Yeh sabse aam aur sabse mehengi galti hai.' },
            { id: 'db', label: 'File ko database mein BLOB ki tarah rakho', score: -3, why: 'Database bade objects ke liye bana hi nahi hai — backup, replication aur buffer pool sab tabaah ho jaate hain. Blobs blob storage mein, database mein sirf <b>metadata</b>.' },
          ],
        },
        {
          id: 'chunk', label: 'Badi files kaise', icon: '🧩',
          options: [
            { id: 'cdc', label: 'Content-defined chunking + har chunk ka fingerprint', score: 3, why: 'Ek hi faisla teen cheezein deta hai: resumable upload, dedup, aur parallel transfer. Aur rolling-hash boundaries ki wajah se file ke beech mein badlav sirf <b>aas-paas ke</b> chunks badalta hai.' },
            { id: 'fixed', label: 'Fixed 5 MB chunks + fingerprint', score: 1, why: 'Resumable aur parallel mil jaata hai, aur poori-file dedup bhi. Par file ke <b>shuru</b> mein ek byte jodne se saare boundaries khisak jaate hain aur poori file dobara upload hoti hai — delta sync yahin marta hai.' },
            { id: 'whole', label: 'Poori file ek hi request mein', score: -3, why: '50 GB ki ek request ka matlab hai: network toota toh shuru se, koi progress nahi, koi dedup nahi, aur koi parallelism nahi. Har load balancer aur proxy ka timeout bhi is raaste mein aayega.' },
          ],
        },
        {
          id: 'sync', label: 'Change device tak kaise pahunche', icon: '🔄',
          options: [
            { id: 'both', label: 'Websocket push + har kuch minute polling', score: 3, why: 'Push <b>latency</b> deta hai, poll <b>guarantee</b> deta hai. Websocket toot-ta hai (laptop band, network badla, phone sleep) — polling wahi chhoote hue changes uthata hai. Reliable sync mein dono hote hain.' },
            { id: 'push', label: 'Sirf websocket push', score: -1, why: 'Tez hai, par connection toot-ne par change <b>hamesha ke liye</b> chhoot jaata hai — aur user ko pata bhi nahi chalega. "Kabhi-kabhi ek file sync nahi hoti" wale bug isi se aate hain.' },
            { id: 'poll', label: 'Sirf polling, har 5 minute', score: 0, why: 'Bharosemand hai aur simple hai — par 5 minute ki deri collaboration ke liye bahut zyada hai. Aur karodon devices ka polling khud ek load problem ban jaata hai.' },
          ],
        },
        {
          id: 'meta', label: 'Metadata aur sharing', icon: '🗂️',
          options: [
            { id: 'nosql', label: 'Files table + alag SharedFiles table (user → file mapping)', score: 3, why: 'Do sawaal alag-alag tez rehte hain: "is file ka access kise hai" aur "is user ko kaunsi files dikhti hain". Alag mapping table dono ko index se seedha jawab deti hai.' },
            { id: 'array', label: 'File document ke andar hi shared users ka array', score: -2, why: '"Mujhe kaunsi files shared hui hain" ka jawab ab poore collection ka scan hai. Aur ek popular file par woh array badhta jaata hai — ek hi document par write contention.' },
            { id: 'acl', label: 'Har request par permission service se pooch lo', score: 0, why: 'Saaf hai aur bade systems mein hota bhi hai — par har file operation par ek extra network hop jodta hai. Chhote paimane par yeh extra hop ki keemat wasool nahi hoti.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Bytes app server se nahi guzarti, chunking ne teen problem ek saath hal kiye, aur sync mein push aur poll dono hain. Yahi is problem ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh bytes ko app server se guzaar raha hai ya sync ki guarantee kamzor kar raha hai — dono production mein mehenge padte hain.',
        bad: '🤔 Do baaton par wapas jao: file kabhi app server se nahi guzarni chahiye, aur akela websocket kabhi kaafi nahi hota.',
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
      success: allOf(T_DROPBOX),
      successText: `Dhyan do ki mission mein <b>file ki bytes</b> kahin naapi hi
        nahi gayin — kyunki woh bytes tumhare servers se guzarti hi nahi. Asli
        service <b>metadata</b> hai, aur uske teen dabav yahi the: dedup ka index,
        peak read load, aur ek viral shared link.`,
      hints: [
        'Pehle numbers: estimate --users 500000000 --rps 12000 --bytes 500',
        'Chunk dedup ka index kitna bada hoga: bloom --items 100000000 --fp 0.01',
        'Chunk id sortable chahiye: id bench --type ulid --rows 1000000',
        'Metadata API par peak load: load --rps 12000 --duration 8',
        'Metadata cache lagao: sim add cache --ttl 300 --jitter 20',
        'Ek shared link viral ho gaya: cache hotkey --key file:qtr-report --rps 50000',
        'Us key ko phailao: cache hotkey --key file:qtr-report --rps 50000 --replicas 8',
        'Ek badi file = bahut saare chunks: net compare --assets 60',
      ],
    },
    {
      type: 'quiz',
      title: 'File storage ke faisle',
      questions: [
        {
          q: 'Presigned URL ka sabse bada faayda kya hai?',
          choices: [
            'File ki bytes app server se guzarti hi nahi — app server sirf IJAZAT deta hai, isliye usko bandwidth ke liye scale karne ki zaroorat nahi rehti',
            'Security behtar ho jaati hai',
            'Upload tez ho jaata hai',
            'S3 ka bill kam aata hai',
          ],
          answer: 0,
          explain: 'Upload tez hona aur security dono <b>side effects</b> hain. Asli baat architecture ki hai: proxy wale design mein har byte <b>do baar</b> chalti hai aur app servers bandwidth ke hisaab se khareede jaate hain. Presigned URL us poore aayam ko hata deta hai.',
        },
        {
          q: 'Content-defined chunking fixed-size chunking se behtar kyun hai?',
          choices: [
            'File ke SHURU mein ek byte jodne par fixed-size ke saare boundaries khisak jaate hain (poori file dobara), jabki content-defined mein sirf aas-paas ke chunks badalte hain',
            'Content-defined chunks chhote hote hain',
            'Content-defined chunking tez hai',
            'Content-defined chunking mein fingerprint ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'Yeh <b>delta sync</b> ka poora khel hai. Ek 2 GB video mein ek metadata tag badla: fixed-size par 2 GB dobara jaata hai, content-defined par lagbhag 10 MB. Rolling hash boundary ko <b>content</b> se tay karta hai, position se nahi — isliye boundaries khisakti nahi.',
        },
        {
          q: 'Sync ke liye sirf websocket push kaafi kyun nahi hai?',
          choices: [
            'Websocket toot-ta hai (laptop band, network badla, phone sleep) aur us dauraan ka change HAMESHA ke liye chhoot jaata hai — polling woh chhoote hue changes uthata hai',
            'Websocket dheema hai',
            'Websocket mehenga hai',
            'Websocket sabhi devices par nahi chalta',
          ],
          answer: 0,
          explain: 'Push <b>latency</b> deta hai, poll <b>guarantee</b>. "Kabhi-kabhi ek file sync nahi hoti" wale bug lagbhag hamesha sirf-push wale design se aate hain — aur unhe reproduce karna bhi bahut mushkil hota hai, kyunki woh connection toot-ne par hi hote hain.',
        },
        {
          q: 'Presigned URL ki expiry kitni honi chahiye?',
          choices: [
            'Minute mein — presigned URL ek bearer token hai; jiske paas URL hai uske paas access hai, chahe woh user ho ya na ho',
            'Din mein, taaki user aaram se upload kar sake',
            'Kabhi expire na ho, warna resume tootega',
            'Ghante mein, yeh standard hai',
          ],
          answer: 0,
          explain: 'Presigned URL ke andar hi authorization hai — usme koi login check nahi hota. Woh URL logs mein, browser history mein, ya kisi screenshot mein ja sakta hai. Resumable upload ke liye lambi expiry ki zaroorat nahi hai: client naya presigned URL <b>maang</b> sakta hai jab purana khatam ho jaaye.',
        },
      ],
    },
  ],
  success: [
    'Presigned URL wala raasta bata sakte ho aur uski wajah bhi',
    'Chunking se milne wale teenon faayde ek saath samjha sakte ho',
    'Content-defined chunking ka delta-sync faayda bol sakte ho',
    'Push + poll wali jodi ko sync ki guarantee ke roop mein samjha sakte ho',
  ],
  homework: `Koi bhi file-upload wala product kholo aur browser ka Network tab
    dekho. Do cheezein dhoondho: kya upload request tumhare product ke domain par
    ja rahi hai ya seedha kisi storage domain par (presigned URL ka nishaan), aur
    kya file ek request mein ja rahi hai ya kai chunks mein.`,
  cards: [
    { front: 'File upload ka sabse bada faisla?', back: 'File <b>app server se guzarni hi nahi chahiye</b>. App server presigned URL deta hai, client seedha blob storage par upload karta hai. Proxy wale design mein har byte <b>do baar</b> chalti hai.' },
    { front: 'Chunking se kaunse teen faayde?', back: '<b>Resumable</b> (sirf bache hue chunks bhejo) · <b>Dedup</b> (fingerprint pehle se hai toh bhejo hi mat) · <b>Parallel</b> (kai chunks ek saath). Ek faisla, teen problem hal.' },
    { front: 'Content-defined vs fixed-size chunking?', back: 'File ke shuru mein ek byte jodo: fixed-size ke <b>saare boundaries khisak</b> jaate hain (poori file dobara), content-defined mein sirf <b>aas-paas</b> ke chunks badalte hain. Delta sync yahi banata hai.' },
    { front: 'Sync mein push aur poll dono kyun?', back: '<b>Push</b> = latency, <b>poll</b> = guarantee. Websocket toot-ta hai (laptop band, network badla) aur us dauraan ka change hamesha ke liye chhoot jaata hai. Sirf-push wale design "kabhi-kabhi sync nahi hota" wale bug dete hain.' },
    { front: 'Presigned URL ki expiry?', back: '<b>Minute mein</b>, din mein nahi. Presigned URL ek <b>bearer token</b> hai — jiske paas URL hai uske paas access hai. Resume ke liye client naya URL maang sakta hai.' },
  ],
  interview: {
    title: 'Interview Round — File Storage',
    instructions: 'Dropbox / Google Drive wala classic sawaal. 🎤',
    questions: [
      {
        q: '"Dropbox design karo." Pehla design faisla kya hai?',
        choices: [
          'File ki bytes app server se nahi guzregi — presigned URL se client seedha blob storage par jaayega, aur app server sirf metadata aur permissions sambhalega',
          'Kaunsa database use karenge',
          'Sharding kaise karenge',
          'Sync protocol kaunsa hoga',
        ],
        answer: 0,
        explain: 'Yeh pehla faisla poore design ka aakaar tay kar deta hai: uske baad tumhari service ek <b>metadata service</b> hai, ek file service nahi — aur uska scale, uska database aur uske bottleneck sab us ek line se nikalte hain.',
      },
      {
        q: '"50 GB ki file upload ho rahi thi aur 40 GB par network toot gaya. Ab kya?"',
        choices: [
          'Client server se poochta hai ki kaunse chunks pahunch chuke hain (multipart upload ki part list), aur sirf bache hue chunks bhejta hai — kyunki file pehle se chunks mein ja rahi thi',
          'Upload shuru se dobara hoga',
          'Server upload ko background mein poora karega',
          'Client 40 GB se aage byte-range se resume karega',
        ],
        answer: 0,
        explain: 'Byte-range resume theoretically theek lagta hai par usme server ko poori partial file ka state rakhna padta hai. <b>Chunks + part list</b> wala raasta simple hai, blob storage usko natively deta hai (multipart upload), aur wahi chunking dedup aur parallelism bhi muft mein de deti hai.',
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
    'DNS crawler ka sabse bada aur sabse chhupa hua bottleneck',
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
     <p class="tip">🎯 Sirf <b>8 machines</b>. Yeh number lagbhag hamesha logon ko
     chaunkata hai, aur wahi is problem ka asli sabak hai: crawler ka bottleneck
     <b>bandwidth ya CPU nahi</b> hai. Bottleneck <b>politeness</b> aur <b>DNS</b>
     hai — yaani coordination, capacity nahi.</p>
     <h3>🚦 Politeness — asli seema</h3>
     <p>Ek domain par 1 request/second ka matlab hai ki wikipedia.org se tum roz
     sirf 86,400 pages le sakte ho, chahe tumhare paas 1000 machines hon.
     Throughput <b>domains ki sankhya</b> se aata hai, machines se nahi.</p>
     <pre>1 request/sec/domain × 20 lakh alag domains  =  20 lakh pages/sec (sambhavit)
Par un domains mein se zyadatar chhote hain — asli mix aisa hota hai:
   kuch hazaar bade domains (rate limit hi seema)
   crore chhote domains (yahan koi seema nahi)</pre>
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
     <h3>🌐 DNS — chhupa hua sabse bada kharcha</h3>
     <p>Scale par DNS resolution crawler ke <b>70% tak</b> waqt kha sakta hai.
     Wajah seedhi hai: har naya domain ek naya DNS lookup hai, aur woh lookup
     network par jaata hai.</p>
     <pre>Thanda connection:  DNS  +  TCP handshake  +  TLS handshake  +  request
Warm connection:                                             request</pre>
     <p class="tip">🎯 Teen ilaaj: <b>DNS ko local cache karo</b> (aur TTL se
     zyada der rakho, crawler ke liye woh theek hai), <b>kai DNS providers</b>
     mein load baanto, aur <b>connection reuse</b> karo — ek hi domain ke kai
     pages ek hi connection par lo.</p>
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
            { id: 'domain', label: 'Distributed queue + per-domain lock aur delay', score: 3, why: 'Politeness ek <b>per-domain</b> shart hai, isliye woh queue mein hi honi chahiye. Domain ka lock (Redis mein) aur message ko delay karke wapas daalna — dono milkar 1 req/sec/domain guarantee dete hain, chahe kitne bhi workers hon.' },
            { id: 'plain', label: 'Ek simple FIFO queue, workers uthate rahenge', score: -2, why: 'Ek popular domain ke hazaaron URLs queue mein aas-paas honge, aur saare workers ek saath us domain par toot padenge. Politeness worker ke andar nahi, <b>queue</b> mein lagti hai.' },
            { id: 'db', label: 'URLs ek database table mein, workers SELECT karte rahein', score: -1, why: 'Chal jaata hai chhote paimane par, par 10 arab rows par yeh table ek contention hotspot ban jaata hai — har worker usi table par lock le raha hai. Queue exactly isi kaam ke liye bani hai.' },
          ],
        },
        {
          id: 'dedup', label: 'Dedup', icon: '🔁',
          options: [
            { id: 'both', label: 'URL dedup (queue se pehle) + content hash dedup (fetch ke baad)', score: 3, why: 'Do alag problem, do alag jagah. URL dedup ek hi page ko baar-baar fetch hone se rokta hai; content dedup un pages ko pakadta hai jo alag URL par ek jaisa content dete hain (session id, tracking params, mirrors).' },
            { id: 'url', label: 'Sirf URL dedup', score: 0, why: 'Zaroori hissa hai par aadha. Bina content dedup ke storage ka bada hissa ek hi page ke alag-alag URLs par jaayega — aur woh gandagi har downstream system mein bhi pahunchegi.' },
            { id: 'none', label: 'Dedup ki zaroorat nahi, links to unique hote hain', score: -3, why: 'Web par ek hi content darjan URLs par milta hai (tracking params, session ids, http/https, www/non-www, mirrors). Bina dedup ke crawler apne hi loops mein ghoomta rahega.' },
          ],
        },
        {
          id: 'dns', label: 'DNS', icon: '🌐',
          options: [
            { id: 'cache', label: 'Local DNS cache + kai providers + connection reuse', score: 3, why: 'Scale par DNS crawler ke <b>70% tak</b> waqt kha sakta hai. Local cache us kharche ko lagbhag khatam karta hai, kai providers rate limits se bachate hain, aur connection reuse ek hi domain ke kai pages ka handshake bacha leta hai.' },
            { id: 'default', label: 'System ka default resolver kaafi hai', score: -2, why: 'Har naya domain ek network round trip hai, aur ek hi resolver par 8 machines ka load usko throttle karwa dega. Yeh woh bottleneck hai jo latency graph mein "network dheema hai" jaisa dikhta hai.' },
            { id: 'prefetch', label: 'Sab domains ka DNS pehle se resolve kar lo', score: 0, why: 'Achhi soch hai aur bade crawlers karte bhi hain — par domains ki list crawl ke dauraan hi badhti hai, isliye prefetch akela kaafi nahi. Cache ke saath jodo, cache ki jagah nahi.' },
          ],
        },
        {
          id: 'trap', label: 'Traps aur infinite space', icon: '🕳️',
          options: [
            { id: 'depth', label: 'Max depth (15-20 hop) + per-domain page budget', score: 3, why: 'Dono anumaan hain aur dono kaam karte hain. Calendar aur faceted search jaise infinite spaces hamesha <b>gehre</b> hote hain, isliye depth limit unhe kaat deti hai — aur domain budget kisi ek site ko poora crawl kha jaane se rokta hai.' },
            { id: 'detect', label: 'Pattern detection se traps pehchano', score: 0, why: 'Kaam karta hai aur bade crawlers isko bhi rakhte hain — par yeh mehenga aur naazuk hai, aur naye trap patterns hamesha aate rahenge. Pehle sasta guard (depth + budget) lagao, phir smart detection.' },
            { id: 'none', label: 'robots.txt kaafi hai', score: -2, why: 'robots.txt <b>ijazat</b> ke baare mein hai, <b>anantata</b> ke baare mein nahi. Ek calendar page jo har agli tareekh ka link deta hai, woh robots.txt mein allowed ho sakta hai aur phir bhi tumhara crawler hamesha ke liye usi mein ghoomta rahega.' },
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
      success: allOf(T_CRAWLER),
      successText: `Dhyan do ki kahin bhi "aur machines daalo" jawab nahi tha.
        Crawler ke chaaron dabav — dedup ka index, partition ka balance, ek bada
        domain, aur DNS ka handshake — <b>coordination</b> ke dabav hain,
        capacity ke nahi. Isiliye 10 arab pages sirf 8 machines par ho jaate hain.`,
      hints: [
        'Paimana pehle: estimate --users 10000000 --rps 3750 --bytes 2000000',
        'URL dedup ka index: bloom --items 1000000000 --fp 0.01',
        'Unique pages ginne ka sasta tareeka: hll --items 1000000000',
        'Frontier ke consumers partitions se zyada: stream partitions --partitions 6 --consumers 8',
        'Ab partitions theek karo: stream partitions --partitions 12 --consumers 8',
        'Ek bada domain saara traffic khaa raha hai: cache hotkey --key domain:wikipedia.org --rps 50000',
        'Us domain ko todo: cache hotkey --key domain:wikipedia.org --rps 50000 --replicas 8',
        'Thanda connection ka kharcha: net trace --rtt 40',
        'Ab warm connection: net trace --rtt 40 --warm',
      ],
    },
    {
      type: 'quiz',
      title: 'Crawler ke faisle',
      questions: [
        {
          q: '10 arab pages ke liye sirf 8 machines kaafi nikleen. Is number ka asli sabak kya hai?',
          choices: [
            'Crawler ka bottleneck bandwidth ya CPU nahi hai — bottleneck POLITENESS aur DNS hai, yaani coordination, capacity nahi',
            'Machines bahut powerful ho gayi hain',
            'Estimate galat hai, aur machines chahiye hongi',
            '2 MB per page ka anumaan bahut kam hai',
          ],
          answer: 0,
          explain: 'Yeh estimate ka sabse achha istemaal hai: number khud se zyada zaroori woh <b>disha</b> hai jo number dikhata hai. 8 machines ka matlab hai ki poora design "aur capacity" ke baare mein nahi hai — poora design <b>per-domain scheduling</b>, <b>DNS</b> aur <b>dedup</b> ke baare mein hai.',
        },
        {
          q: 'Politeness (1 req/sec/domain) worker ke andar lagane mein kya galat hai?',
          choices: [
            'Har worker apna hisaab rakhega, par 8 machines ke 500 workers ek hi domain par ek saath aa sakte hain — politeness ek GLOBAL shart hai, isliye woh shared jagah (queue ya Redis lock) mein honi chahiye',
            'Worker ke andar rate limiting dheemi hoti hai',
            'Worker ke andar timer nahi chal sakta',
            'Politeness ki zaroorat hi nahi hai',
          ],
          answer: 0,
          explain: 'Yeh distributed rate limiting ka classic sawaal hai. Local counter tab tak theek hai jab tak ek hi process ho. Kai workers par woh <b>N guna</b> ho jaata hai — 500 workers × 1 req/sec = 500 req/sec ek hi domain par. Shared lock ya per-domain queue hi guarantee de sakta hai.',
        },
        {
          q: 'URL dedup ke baad bhi content dedup kyun chahiye?',
          choices: [
            'Ek hi content darjan alag URLs par milta hai — tracking params, session ids, http/https, www/non-www, mirrors. URL alag hai, page wahi hai',
            'URL dedup galtiyan karta hai',
            'Content dedup tez hota hai',
            'Content dedup se storage cost kam hoti hai, aur kuch nahi',
          ],
          answer: 0,
          explain: 'URL normalization bahut madad karta hai par sab kuch nahi pakad sakta — do bilkul alag URLs ek jaisa page de sakte hain. Storage bachana <b>ek</b> faayda hai; bada faayda yeh hai ki duplicate content har downstream system mein ghusta hai (search index, training data, embeddings).',
        },
        {
          q: 'Crawler traps se bachne ka sabse sasta ilaaj kya hai?',
          choices: [
            'Max depth (seed se 15-20 hop) + per-domain page budget — dono anumaan hain par dono infinite spaces ko kaat dete hain',
            'robots.txt ko dhyan se maano',
            'Machine learning se trap pages pehchano',
            'Har page ka content hash rakho',
          ],
          answer: 0,
          explain: 'robots.txt <b>ijazat</b> ke baare mein hai, anantata ke baare mein nahi — calendar page allowed ho sakta hai aur phir bhi anant ho sakta hai. Content hash duplicate pakadta hai par calendar ke har page ka content <b>alag</b> hota hai. Depth aur budget dono mote hathiyaar hain, aur isi wajah se dono kaam karte hain.',
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
    aur kya crawl-delay diya gaya hai. Phir ek sawaal poochho: agar tumhara
    crawler us crawl-delay ko maane, toh us site ko poora crawl karne mein kitne
    din lagenge?`,
  cards: [
    { front: 'Crawler ka asli bottleneck?', back: 'Bandwidth ya CPU nahi — <b>politeness aur DNS</b>. 10 arab pages sirf ~8 machines par ho jaate hain; poora design <b>coordination</b> ka hai, capacity ka nahi.' },
    { front: 'Politeness kahan lagti hai?', back: '<b>Queue mein</b>, worker ke andar nahi. 500 workers ka local counter = 500 req/sec ek hi domain par. Per-domain lock (Redis) + message delay hi global 1 req/sec guarantee deta hai.' },
    { front: 'Do dedup kaunse?', back: '<b>URL dedup</b> — queue mein daalne se pehle (normalize + hash). <b>Content dedup</b> — fetch ke baad (content hash / simhash). Ek hi content darjan URLs par milta hai: tracking params, session ids, mirrors.' },
    { front: 'DNS ka kharcha kitna?', back: 'Scale par crawler ke <b>70% tak</b> waqt. Teen ilaaj: <b>local DNS cache</b> (TTL se zyada der rakho), <b>kai providers</b>, aur <b>connection reuse</b> (ek domain ke kai pages ek connection par).' },
    { front: 'Crawler traps ka sasta ilaaj?', back: '<b>Max depth</b> (seed se 15-20 hop) + <b>per-domain page budget</b>. robots.txt ijazat ke baare mein hai, anantata ke baare mein nahi — calendar page allowed bhi ho sakta hai aur anant bhi.' },
  ],
  interview: {
    title: 'Interview Round — Web Crawler',
    instructions: 'Yeh sawaal estimation aur coordination dono test karta hai. 🎤',
    questions: [
      {
        q: '"Web crawler design karo, 10 arab pages 5 din mein." Pehla kaam?',
        choices: [
          'Machines ka number nikalo — 8 nikalta hai, aur wahi number bata deta hai ki design capacity ka nahi, per-domain scheduling aur DNS ka hai',
          'Frontier queue ka design shuru karo',
          'Storage ka schema banao',
          'Parsing pipeline design karo',
        ],
        answer: 0,
        explain: 'Estimate pehle karne ka poora faayda yahi hai: 8 machines ka jawab tumhein bata deta hai ki <b>kis cheez par</b> waqt lagana hai. Agar jawab 8,000 machines hota, design bilkul alag hota. Number pehle, design baad mein.',
      },
      {
        q: '"Tumhara crawler ek hi site par toot pada aur unhone tumhein block kar diya. Kya galat tha?"',
        choices: [
          'Politeness worker ke andar thi, queue mein nahi — har worker ne apna 1 req/sec maana, par 500 workers milkar 500 req/sec bhej rahe the',
          'robots.txt padha nahi gaya',
          'User-agent set nahi kiya gaya tha',
          'Crawl bahut tez tha, rate kam karna tha',
        ],
        answer: 0,
        explain: 'Baaki teenon galtiyan bhi asli hain, par yeh jawab <b>distributed</b> soch dikhata hai: local rate limit N workers par N guna ho jaata hai. Yahi galti API rate limiting, retry budgets aur circuit breakers mein bhi hoti hai — har jagah jahan seema <b>global</b> honi chahiye par lagayi <b>local</b> jaati hai.',
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
    `<h3>🎲 Shuffle sharding — sabse sundar trick</h3>
     <p>8 cells ke saath har customer ko ek cell dene par blast radius
     <b>12.5%</b> hai. Ab isko badlo: har customer ko <b>koi bhi do</b> cells
     do (uske dono cells random chune jaate hain).</p>
     <pre>8 cells mein se 2 chunne ke tareeke  =  C(8,2)  =  28

Ek customer poori tarah tabhi girta hai jab uske DONO cells kharab hon.
Do customers ka poora overlap hone ki sambhavna  =  1 / 28  =  3.6%</pre>
     <p>Yaani <b>utne hi 8 cells</b> par blast radius 12.5% se girkar
     <b>3.6%</b> ho gaya — bina ek bhi naya cell jode. Aur jinke sirf ek cell
     kharab hua, woh <b>degrade</b> hote hain, marte nahi — unka doosra cell
     kaam karta rehta hai.</p>
     <p class="tip">🎯 AWS is technique ko Route 53 aur kai services mein use
     karta hai. Ganit combinations ka hai, isliye faayda tezi se badhta hai:
     8 cells mein se 3 chuno toh C(8,3) = 56, yaani 1.8%.</p>
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
      instructions: 'Teen knob ghumao. Dekho ki shuffle sharding kitna kaam ka hai.',
      goal: 'Aisi settings dhoondho jahan ek failure 5% se kam customers ko poori tarah giraaye, ek cell ka load spare se absorb ho jaaye, aur cells 12 se zyada na hon (warna operational bojh sambhalna mushkil).',
      scenario: `Ek multi-tenant API. Aaj sab kuch ek hi bade fleet par hai,
        isliye koi bhi poison request ya kharab config <b>100%</b> customers ko
        le doobti hai.`,
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
          { label: 'Poora blast radius', value: m.blast.toFixed(1) + '% customers', tone: m.blast <= 5 ? 'ok' : m.blast <= 15 ? 'warn' : 'bad' },
          { label: 'Ek cell ka load absorb hoga?', value: m.absorb ? 'haan, spare kaafi hai' : `nahi — ${m.need.toFixed(0)}% chahiye`, tone: m.absorb ? 'ok' : 'bad' },
          { label: 'Operational bojh', value: m.cells + ' control planes / deploy targets', tone: m.cells <= 12 ? 'ok' : 'bad' },
          { label: 'Capacity ka kharcha', value: '+' + k.spare + '% (spare)', tone: k.spare <= 25 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = cellModel(k);
        return [
          { label: 'Blast radius (budget 5%)', pct: Math.min(100, m.blast), text: m.blast.toFixed(1) + '%', tone: m.blast <= 5 ? 'ok' : 'bad' },
          { label: 'Spare (chahiye ' + m.need.toFixed(0) + '%)', pct: Math.min(100, (k.spare / 50) * 100), text: k.spare + '%', tone: m.absorb ? 'ok' : 'bad' },
          { label: 'Operational bojh (cap 12)', pct: (m.cells / 20) * 100, text: m.cells + ' cells', tone: m.cells <= 12 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = cellModel(k);
        const bad = [];
        if (m.blast > 5) bad.push(k.shuffle
          ? `blast radius <b>${m.blast.toFixed(1)}%</b> hai — shuffle sharding chalu hai par cells kam hain, aur C(${k.cells},2) abhi chhota hai`
          : `blast radius <b>${m.blast.toFixed(1)}%</b> hai — har customer ek hi cell par hai, isliye woh cell girte hi customer poora gira. <b>Shuffle sharding</b> chalu karke dekho`);
        if (!m.absorb) bad.push(`ek cell girne par uska load absorb karne ke liye <b>${m.need.toFixed(0)}%</b> spare chahiye, hai sirf ${k.spare}%`);
        if (m.cells > 12) bad.push(`<b>${m.cells} cells</b> ka matlab hai ${m.cells} control planes, deploy targets aur dashboards — operational bojh bahut zyada`);
        if (!bad.length) return { ok: true, text: `<b>${m.cells} cells</b>${k.shuffle ? ' + shuffle sharding' : ''}, <b>${k.spare}%</b> spare — ek failure sirf <b>${m.blast.toFixed(1)}%</b> customers ko poori tarah giraayegi, aur us cell ka load baaki cells absorb kar lenge.` };
        return { ok: false, text: bad.join(' &nbsp;·&nbsp; ') };
      },
      check: k => { const m = cellModel(k); return m.blast <= 5 && m.absorb && m.cells <= 12; },
      lesson: `🎯 Do numbers is lab se nikalte hain. <b>Ek:</b> bina shuffle
        sharding ke 5% blast radius ke liye <b>20 cells</b> chahiye — aur 20
        control planes chalane ka bojh lagbhag har team ke liye bahut zyada hai.
        Shuffle sharding wahi 5% <b>8 cells</b> par de deta hai, kyunki ganit
        combinations ka hai: C(8,2) = 28. <b>Do:</b> spare capacity ek optional
        cheez nahi hai — bina spare ke ek cell ka gira hua load baaki cells ko
        bhi le doobta hai, aur tab cells ka poora faayda khatam ho jaata hai.`,
      quiz: {
        q: 'Shuffle sharding se ek customer ka ek cell kharab ho gaya (doosra theek hai). Us customer ke saath kya hota hai?',
        choices: [
          'Woh DEGRADE hota hai, marta nahi — uska doosra cell kaam karta rehta hai, bas capacity aadhi ho jaati hai',
          'Woh poori tarah gir jaata hai',
          'Usko apne aap teesre cell par bhej diya jaata hai',
          'Uska koi asar nahi hota',
        ],
        answer: 0,
        explain: 'Yeh shuffle sharding ka doosra, kam bola jaane wala faayda hai. Zyadatar failures mein customers <b>poori tarah nahi girte</b> — woh sirf aadhi capacity par aa jaate hain. Isiliye har cell mein spare capacity zaroori hai: aadhi capacity par bhi customer ka poora load sambhalna chahiye.',
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
            'Blast radius — ek failure sirf 1/N customers ko chhooti hai, aur uske saath deploy ka blast radius bhi 1/N ho jaata hai',
            'Performance behtar ho jaati hai',
            'Cost kam ho jaati hai',
            'Operations aasan ho jaate hain',
          ],
          answer: 0,
          explain: 'Cells asal mein <b>zyada</b> operational kaam hain (N control planes, N deploy targets, N dashboards) aur seedhe-seedhe tez ya saste bhi nahi. Poora faayda failure ke daayre mein hai — aur uska rozana roop yeh hai ki har <b>release</b> ka blast radius bhi 1/N ho jaata hai.',
        },
        {
          q: '8 cells hain aur blast radius 5% se kam chahiye. Bina naya cell jode kaise?',
          choices: [
            'Shuffle sharding — har customer ko 8 mein se koi bhi DO cells do. Poora overlap hone ki sambhavna 1/C(8,2) = 1/28 = 3.6%',
            'Har cell mein aur replicas daalo',
            'Cells ko chhota kar do',
            'Bina naya cell jode yeh mumkin nahi hai',
          ],
          answer: 0,
          explain: 'Bina shuffle sharding ke 5% blast radius ke liye <b>20 cells</b> chahiye. Shuffle sharding wahi 5% <b>8 cells</b> par de deta hai, kyunki ganit combinations ka hai — aur combinations tezi se badhte hain: 8 mein se 3 chuno toh C(8,3) = 56, yaani 1.8%.',
        },
        {
          q: 'Ek cell gir gaya. Uske customers ka traffic kahan jaana chahiye?',
          choices: [
            'Ya toh baaki cells ki SPARE capacity mein (8 cells par lagbhag 14% extra chahiye), ya un customers ko saaf 503 + Retry-After — teesra raasta "dekh lenge" hai, aur woh baaki cells ko bhi le doobta hai',
            'Apne aap baaki cells par redistribute ho jaayega',
            'Kisi bhi cell par, load balancer sambhal lega',
            'Ek naya cell turant bana do',
          ],
          answer: 0,
          explain: 'Bina plan ke redistribution hi cells ka poora faayda khatam karti hai: gira hua load baaki cells ko bhi thap kar deta hai, aur ek cell ka outage poora outage ban jaata hai. Do hi imaandar jawab hain — <b>spare rakho</b> ya <b>shed karo</b>. Aur dono mein se kaunsa, woh business ka faisla hai.',
        },
        {
          q: 'Cells banane ke baad sabse zaroori kaam kya hai?',
          choices: [
            'Shared cheezein dhoondhna — config store, auth service, router, deploy pipeline. Jo cells ke BEECH mein hai, wahi blast radius wapas 100% kar deta hai',
            'Har cell ka size barabar rakhna',
            'Cells ko alag regions mein daalna',
            'Cross-cell replication set up karna',
          ],
          answer: 0,
          explain: 'Cross-cell replication toh lagbhag ulta kaam hai — woh cells ko jodti hai, alag nahi karti. Cells banane ke baad asli kaam ek hi sawaal hai, har component par: <b>"yeh cell ke ANDAR hai ya cells ke BEECH mein?"</b> Beech waali cheezein hi agla outage layengi.',
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
    { front: 'Shuffle sharding kya hai?', back: 'Har customer ko N mein se <b>K cells</b> do (aam taur par K=2). Poora outage tabhi jab uske saare K cells kharab hon. 8 cells, K=2 → <b>1/C(8,2) = 3.6%</b> blast radius, bina naya cell jode.' },
    { front: 'Bina shuffle sharding 5% blast radius ke liye?', back: '<b>20 cells</b> — yaani 20 control planes, deploy targets aur dashboards. Shuffle sharding wahi 5% sirf <b>8 cells</b> par de deta hai.' },
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
          'Aaj 100%, kyunki ek hi fleet hai — aur usko ghatane ka sabse sasta kadam cell-dar-cell deploy hai, poora cell-based architecture nahi',
          'Kuch bhi nahi, hamara staged rollout hai',
          'Yeh depend karta hai ki deploy mein kya tha',
          '100%, par hamara rollback tez hai',
        ],
        answer: 0,
        explain: 'Yeh jawab do cheezein dikhata hai: tum apna asli number jaante ho (imaandari), aur tum jaante ho ki usko sudharne ka <b>sasta pehla kadam</b> kya hai. "Rollback tez hai" achha hai par woh blast radius nahi ghataata — woh sirf <b>duration</b> ghataata hai. Radius aur duration do alag numbers hain.',
      },
      {
        q: '"Cells banane ka faisla kab lena chahiye?"',
        choices: [
          'Jab ek failure ki keemat N control planes chalane ki keemat se zyada ho jaaye — yaani sabse zaroori service par pehle, har service par nahi',
          'Jitni jaldi ho sake, shuru se hi',
          'Jab scale bahut bada ho jaaye',
          'Jab team bade ho jaaye',
        ],
        answer: 0,
        explain: 'Cells ek <b>vyapaar</b> hain, ek best practice nahi: tum operational bojh dekar failure ka daayra khareedte ho. Isliye jawab hamesha <b>keemat ki tulna</b> hai. Aur usi tark se cells sabse pehle wahan lagte hain jahan ek ghante ka outage sabse mehenga padta hai.',
      },
    ],
  },
},
]);

/* Cell / shuffle-sharding ka ganit */
function cellModel(k) {
  const n = k.cells;
  /* shuffle sharding (K=2): poora outage tabhi jab customer ke DONO cells kharab hon */
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
       <tr><td><b>Hybrid (HLC)</b></td><td>wall clock jaisa dikhta hai (padha ja sakta hai) par kram ki guarantee deta hai</td><td>thodi si complexity — par aaj ka aam chunav yahi hai</td></tr>
       <tr><td><b>TrueTime (Spanner)</b></td><td>ghadi ke saath uski <b>anishchitta</b> bhi deta hai; commit us anishchitta ka intezaar karta hai</td><td>khaas hardware (atomic clocks + GPS) chahiye</td></tr>
     </table>
     <p class="tip">🎯 Spanner ka jawab sabse dilchasp hai: usne ghadi ko sahi
     karne ki koshish nahi ki — usne ghadi ki <b>galti ko naapa</b> aur commit
     ko utni der rukwa diya. "Mujhe nahi pata ki abhi kya samay hai, par mujhe
     pata hai ki main 7 ms se zyada galat nahi hoon" — aur wahi ek line poori
     external consistency de deti hai.</p>
     <h3>⚖️ Last-write-wins kab theek hai?</h3>
     <pre>✅ Theek:   ek hi user ki setting, cache entry, presence/status
            (nuksaan chhota, aur naya write jaldi aa jaata hai)

❌ Galat:   paise, inventory, order status, collaborative document
            (yahan "haar gaya" write ka matlab hai KHOYA hua data)</pre>
     <p>Galat wale case mein do hi imaandar raaste hain: writes ko
     <b>append-only events</b> bana do (kuch overwrite hi nahi hota), ya
     conflict ko <b>app ke saamne rakh do</b> ("do version hain, kaunsa
     rakhna hai?").</p>`,
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
        { text: 'Do concurrent writes mein se kaunsa naya hai', bin: 'logical', explain: 'Yahan wall clock <b>data loss</b> ka kaaran ban jaati hai: jiski machine ki ghadi aage thi woh jeet gaya, chahe uska write pehle hua ho. Version vector ya HLC chahiye.' },
        { text: 'Distributed lock ki maalikana haq', bin: 'logical', explain: 'Wall clock expiry par bana lock do jagah ja sakta hai (ek node ki ghadi aage, doosri peeche). Sahi tareeka <b>fencing token</b> hai — ek badhta hua number jo storage khud check karta hai.' },
        { text: 'Replicated data mein event ka kram', bin: 'logical', explain: '"Pehle kya hua" ek <b>kram</b> ka sawaal hai, samay ka nahi. Lamport, vector clock ya HLC — teenon kram dete hain bina ghadiyon par bharosa kiye.' },
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
        { text: '🤷 Customer ne shikayat ki: "maine save kiya tha, par purana data dikh raha hai"', explain: 'Yeh bug hamesha <b>customer</b> se pata chalta hai, monitoring se nahi — kyunki system ke hisaab se kuch fail hi nahi hua. Aur reproduce karna lagbhag namumkin hota hai.' },
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
            'Wall clock PEECHE ja sakti hai (NTP correction, leap second, admin) — aur tab elapsed time rinatmak ho jaata hai, jispar har timeout, rate limiter aur breaker ka ganit toot jaata hai',
            'Wall clock dheemi hoti hai',
            'Wall clock ki precision kam hoti hai',
            'Wall clock har machine par alag hoti hai',
          ],
          answer: 0,
          explain: 'Precision aur skew dono asli dikkatein hain, par asli khatra <b>peeche jaana</b> hai. Monotonic clock kabhi peeche nahi jaati — usko design hi isi liye kiya gaya hai. Niyam simple hai: <b>"kitna beeta"</b> ke liye monotonic, <b>"kab hua"</b> ke liye wall clock.',
        },
        {
          q: 'Distributed lock ki expiry wall clock par rakhna khatarnaak kyun hai?',
          choices: [
            'Do nodes ki ghadiyon mein farak ho toh ek node maan lega ki lock khatam ho gaya jabki doosre ke hisaab se lock abhi uska hai — dono likhenge. Sahi hal FENCING TOKEN hai',
            'Lock ki expiry bahut chhoti ho jaati hai',
            'Wall clock lock service par uplabdh nahi hoti',
            'Expiry ko sirf lock service hi check kar sakti hai',
          ],
          answer: 0,
          explain: 'Fencing token skew ki poori problem ko <b>hata</b> deta hai: har lock ke saath ek badhta hua number aata hai, aur <b>storage khud</b> purane number wale write ko reject kar deti hai. Ab ghadi kya kehti hai isse koi farak nahi padta — aur yahi cheez sahi failover ko bhi surakshit banati hai.',
        },
        {
          q: 'Last-write-wins kab theek hai aur kab nahi?',
          choices: [
            'Theek: ek user ki setting, cache entry, presence. Galat: paise, inventory, order status, collaborative document — wahan "haar gaya" write ka matlab KHOYA hua data hai',
            'Hamesha theek hai, yeh simple hai',
            'Hamesha galat hai, hamesha vector clock use karo',
            'Sirf single-region systems mein theek hai',
          ],
          answer: 0,
          explain: 'Sawaal hamesha <b>nuksaan</b> ka hai. Ek user ka theme setting "kho" jaaye toh woh dobara set kar dega. Ek payment ya inventory update kho jaaye toh koi usko pata bhi nahi chalega. Galat wale case mein do imaandar raaste hain: <b>append-only events</b> ya conflict ko <b>app ke saamne</b> rakh dena.',
        },
        {
          q: 'Spanner ne clock ki problem kaise hal ki?',
          choices: [
            'Ghadi ko sahi karne ki koshish nahi ki — uski GALTI ko naapa (TrueTime interval deta hai) aur commit ko utni der rukwa diya jitni anishchitta thi',
            'Atomic clocks se sab machines ki ghadi bilkul sahi kar di',
            'Wall clock hataakar sirf logical clocks use kiye',
            'Sab writes ek hi region mein karwa diye',
          ],
          answer: 0,
          explain: 'Farak sookshm par gehra hai. Spanner ye nahi kehta "meri ghadi sahi hai" — woh kehta hai <b>"main 7 ms se zyada galat nahi hoon"</b>, aur commit us 7 ms ka intezaar karta hai. Anishchitta ko chhupane ki jagah usko <b>naap kar uske saath jeena</b> — yeh distributed systems ka ek bahut kaam ka soch ka tareeka hai.',
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
    { front: 'Distributed lock ka sahi tareeka?', back: '<b>Fencing token</b> — har lock ke saath ek badhta hua number, aur <b>storage khud</b> purane number wale write ko reject karti hai. Ab ghadi kya kehti hai isse farak nahi padta.' },
    { front: 'Last-write-wins kab theek?', back: '✅ ek user ki setting, cache entry, presence (nuksaan chhota) · ❌ paise, inventory, order status, collaborative doc — wahan "haara" write = <b>khoya hua data</b>. Vikalp: append-only events, ya conflict app ke saamne rakho.' },
    { front: 'Spanner ka TrueTime idea?', back: 'Ghadi ko sahi karne ki jagah uski <b>galti naapo</b>: "main 7 ms se zyada galat nahi hoon". Commit us anishchitta ka <b>intezaar</b> karta hai. Anishchitta chhupao mat — naap kar uske saath jiyo.' },
  ],
  interview: {
    title: 'Interview Round — Time in distributed systems',
    instructions: 'Yeh sawaal seedha depth check karta hai. 🎤',
    questions: [
      {
        q: '"Do replicas par ek hi record ke do writes aaye. Kaunsa rakhoge?"',
        choices: [
          'Pehle poochunga ki nuksaan kya hai. Agar khoya hua write mehenga hai toh version vector se conflict SAAMNE laaunga ya writes ko append-only events bana dunga — timestamp se decide karna chup-chaap data loss hai',
          'Jiska timestamp naya hai woh',
          'Jo baad mein pahuncha woh',
          'Dono ko merge kar dunga',
        ],
        answer: 0,
        explain: 'Timestamp se decide karna <b>ghadi</b> par bharosa karna hai, aur ghadiyan jhooth bolti hain — jiski machine aage thi woh jeet jaata hai, chahe uska write pehle hua ho. Sabse achha jawab pehle <b>nuksaan</b> poochta hai, kyunki uske bina koi bhi conflict policy sahi ya galat nahi kahi ja sakti.',
      },
      {
        q: '"Tumhara distributed lock kabhi do jagah ja sakta hai kya?"',
        choices: [
          'Haan, agar expiry wall clock par hai — skew se ek node lock ko khatam maan lega jabki doosre ke hisaab se woh abhi uska hai. Isiliye lock ke saath FENCING TOKEN chahiye jise storage khud check kare',
          'Nahi, lock service consistency guarantee karti hai',
          'Nahi, agar TTL kaafi bada rakha jaaye',
          'Haan, par woh bahut rare hai',
        ],
        answer: 0,
        explain: 'Yeh jawab dikhata hai ki tum lock ko <b>guarantee</b> nahi, ek <b>optimization</b> maante ho. Lock service consistent ho sakti hai, par uska <b>client</b> GC pause ya skew ki wajah se apne lock ko zinda maan sakta hai. Isliye asli suraksha storage par hoti hai — fencing token, jise storage khud reject kar sakti hai.',
      },
    ],
  },
},
]);
})();
