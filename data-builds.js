/* =====================================================================
   TRACK 7 — Poore Systems Banao
   bitly · leaderboard · adclick · ticketmaster · whatsapp · youtube · boss-uber

   Har level ka shape ek jaisa hai:
     requirements → estimate → design canvas → simulator par bottleneck → incident
   Yeh app ka "ab khud banao" hissa hai.
   `allOf` data-flow.js mein define hai (script scope shared hai).
   ===================================================================== */

const T_BITLY = [
  { text: 'Traffic ka andaaza lagao',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Random short code ke liye har insert par collision check — id bench se dekho',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.sortable === false) },
  { text: 'Counter + base62 wala raasta (sortable id)',
    check: s => s.records.some(r => r.kind === 'id' && r.op === 'bench' && r.sortable === true) },
  { text: 'Redirect path par load — 5,000 rps',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 5000) },
  { text: 'Cache lagao — redirect 99% read hai',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache') },
  { text: 'Ek viral link — dekho ki woh ek cache node jala deta hai',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us viral link ko phailao',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
];

const T_ADCLICK = [
  { text: 'Bina watermark ke minute-window — late clicks kho jaayenge',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'window' && !r.watermark && r.dropped > 0) },
  { text: 'Watermark lagao — nuksaan kam hona chahiye',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'window' && r.watermark > 0 && r.caught > 0) },
  { text: 'Bada watermark aur bachaata hai — par natija der se',
    check: s => {
      const w = s.records.filter(r => r.kind === 'stream' && r.op === 'window' && r.watermark > 0);
      return w.length >= 2 && w.some(a => w.some(b => b.watermark > a.watermark && b.caught > a.caught));
    } },
  { text: 'Consumers partitions se zyada lagao — kuch khaali baithenge',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle > 0) },
  { text: 'Ab unhe theek karo',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle === 0) },
  { text: 'Dedup ke liye bloom filter ka size nikalo (1% false positive)',
    check: s => s.records.some(r => r.kind === 'probabilistic' && r.op === 'bloom' && r.fpRate < 2) },
  { text: 'Super Bowl ad — ek partition par 40% traffic',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us ad ki key ko todo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
];
const T_TICKET = [
  { text: 'Bina kisi protection ke ek seat par do log — double booking',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.doubleBooked === true) },
  { text: 'Seats reset karo',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'reset') },
  { text: 'Reservation mode chalu karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /booking\.mode/.test(r.path) && r.value === 'reservation') },
  { text: 'Seat par TTL ke saath hold lagao',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'hold' && r.ok === true && r.ttl > 0) },
  { text: 'Doosra khareedaar ab ruk jaana chahiye',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.blockedByHold === true) },
  { text: 'Ab on-sale ka load — system girega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 50000 && r.saturated === true) },
  { text: 'Waiting room (admission control) lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'admission') },
  { text: 'Seat map ko cache karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'cache') },
  { text: 'Ab load dobara — ab system khada rehna chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'add' && r.what === 'admission');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps >= 50000 && r.saturated === false);
    } },
];

const T_UBER = [
  { text: 'Peak ka andaaza lagao',
    check: s => s.records.some(r => r.kind === 'estimate') },
  { text: 'Bina geo index ke nearby query — full scan',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined > 500000) },
  { text: 'Geo index banao (geohash pehle)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash') },
  { text: 'Ab wahi query tez honi chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'index' && r.op === 'create' && r.cols[0] === 'geohash');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 200 && r.rowsExamined < 1000);
    } },
  { text: 'Location store ka distribution dekho',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'show') },
  { text: 'Virtual nodes se skew theek karo',
    check: s => s.records.some(r => r.kind === 'ring' && r.op === 'vnodes' && r.skew < 1.1) },
  { text: '8 PM, baarish — ek cell par saara load',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === true) },
  { text: 'Us cell ko todo',
    check: s => s.records.some(r => r.kind === 'cache' && r.op === 'hotkey' && r.hot === false && r.replicas > 1) },
  { text: 'Matching bina protection ke — ek driver do riders ko',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.doubleBooked === true) },
  { text: 'Reservation mode chalu karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /booking\.mode/.test(r.path) && r.value === 'reservation') },
  { text: 'Driver par 15s ka hold lagao',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'hold' && r.ok === true && r.ttl > 0) },
  { text: 'Doosra rider ab ruke',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.blockedByHold === true) },
  { text: 'Peak load — system girega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 20000 && r.saturated === true) },
  { text: 'Pricing service par timeout',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'timeout') },
  { text: 'Aur ek fallback',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'fallback') },
  { text: 'Waiting room lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'add' && r.what === 'admission') },
  { text: 'Aur ab pool badhao — service time ka kaam ho chukne ke BAAD',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'scale' && r.what === 'pool') },
  { text: 'Ab peak dobara — system khada rehna chahiye',
    check: s => {
      const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'add' && r.what === 'admission');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps >= 20000 && r.saturated === false);
    } },
  { text: 'SLO budget check karo',
    check: s => s.records.some(r => r.kind === 'slo') },
];

SD.registerLevels('builds', [

/* =====================================================================
   B1 — URL Shortener
   ===================================================================== */
{
  id: 'bitly',
  icon: '🔗',
  title: 'Build #1 — URL Shortener',
  badge: 'Shortener Shilpi',
  objectives: [
    'Short code banane ke teen tareeke — aur unka asli farak',
    '100:1 read:write ratio se poora design nikalna',
    'Redirect ka path "embarrassingly simple" rakhna',
    'Viral link = hot key',
  ],
  lesson: [
    `<h3>📖 Requirements — chhote rakho</h3>
     <pre>FUNCTIONAL
  • Lamba URL do → chhota code milo
  • Chhota code kholo → lambe URL par redirect
  • (optional) custom alias, expiry, click count

NON-FUNCTIONAL
  • Redirect p99 &lt; 50 ms      ← yahi asli requirement hai
  • 99.99% available            ← toota link = toota bharosa
  • Read : Write ≈ 100 : 1
  • Codes chhote hon (7 characters)</pre>
     <h3>🔢 Estimate</h3>
     <pre>10 crore naye URL / mahina  →  ~40 writes/sec
100:1 ratio                 →  ~4,000 reads/sec, peak ~12,000
5 saal ka data              →  6 arab URLs
har row ~500 bytes          →  ~3 TB

7 characters base62         →  62⁷ = 3.5 KHARAB codes   ✅ kaafi hai</pre>
     <p class="tip">🎯 Yeh estimate ek line mein poora design bata deta hai:
     <b>40 writes/sec</b> ka matlab hai write path ka koi sawaal hi nahi —
     ek Postgres uska 100x kar lega. Saara design <b>read path</b> ka hai.</p>
     <h3>🔑 Short code — teen tareeke</h3>
     <table>
       <tr><th></th><th>Kaise</th><th>Dikkat</th></tr>
       <tr><td><b>Random</b></td><td>7 random characters</td><td>Har insert par "yeh code hai kya?" lookup — aur space bharne par collisions badhte jaate hain</td></tr>
       <tr><td><b>Hash</b></td><td>md5(url) ke pehle 7</td><td>Wahi URL = wahi code (kabhi feature, kabhi bug). Aur collisions phir bhi handle karne padte hain</td></tr>
       <tr><td><b>Counter</b></td><td>badhta counter → base62</td><td>Codes guessable hain (<code>abc</code>, <code>abd</code>...) — par ek scramble se hal</td></tr>
     </table>
     <p><b>Counter jeetta hai</b>, aur wajah gehri hai: usme <b>collision mumkin hi nahi</b>,
     isliye har write par woh existence-check <b>hai hi nahi</b>. Aur jo counter tum
     use karoge (Snowflake ya DB sequence) woh sortable hai — matlab index bhi khush.</p>
     <p>Guessability ka ilaaj: counter ko base62 karne se pehle ek reversible
     scramble (jaise Feistel network ya multiply-by-large-odd-number mod 62⁷)
     laga do. Codes bikhre hue dikhenge, par collision ab bhi namumkin hai.</p>`,
    `<h3>🏗️ Design</h3>
     <pre>WRITE (40/sec — lagbhag kuch bhi chalega)
   POST /urls  →  counter se id  →  base62 encode  →  DB insert
                                                    →  cache mein daal do

READ (12,000/sec peak — yahan sab kuch hai)
   GET /{code} →  CACHE hit (95%+)  →  301/302 redirect
              →  miss  →  DB (code par index)  →  cache mein daalo</pre>
     <p>Redirect path par <b>kuch bhi</b> nahi hona chahiye jo zaroori na ho.
     Koi join nahi, koi auth nahi, koi analytics write nahi.
     Click count chahiye? Use <b>async</b> karo — ek event bhejo aur redirect
     turant lauta do. Warna tumne 12,000 reads/sec ko 12,000 writes/sec bana diya.</p>
     <h3>↩️ 301 ya 302?</h3>
     <table>
       <tr><td><b>301</b> Permanent</td><td>Browser cache kar leta hai → agli baar tumhare server tak aata hi nahi</td><td>Server par load kam, par <b>click count khatam</b> aur link kabhi badal nahi sakte</td></tr>
       <tr><td><b>302</b> Found</td><td>Har baar tumhare server se guzarta hai</td><td>Analytics milta hai aur destination badal sakte ho — par har click ek request hai</td></tr>
     </table>
     <p class="tip">🎯 Zyadatar shorteners <b>302</b> chunte hain — kyunki analytics
     unka product hai. Yeh ek achha udaharan hai ki "kam load" hamesha sahi jawab
     nahi hota; kabhi-kabhi woh load hi <b>business</b> hai.</p>
     <h3>🔥 Viral link</h3>
     <p>Ek link kisi bade account ne share kar diya — 50,000 rps ek hi code par.
     Yeh <b>hot key</b> hai (jo tum <code>eviction</code> level mein dekh chuke ho):
     cache cluster mein 20 nodes hon toh bhi woh key ek hi node par jaayegi.
     Ilaaj wahi: key ki N copies, aur uske upar 1-second ka <b>local</b> cache
     har app instance mein — jo 99.9% traffic wahin khaa jaata hai.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — URL Shortener',
      instructions: 'Har slot par sahi chunav — aur galat waalon ka why zaroor padho.',
      brief: `10 crore naye URL/mahina, 100:1 read ratio, redirect p99 &lt; 50ms,
        99.99% availability. Analytics (click count) product ka hissa hai.`,
      requirements: ['Redirect p99 &lt; 50ms', '99.99% up', '~12,000 reads/sec peak', 'Click analytics chahiye'],
      pass: 11,
      slots: [
        {
          id: 'code', label: 'Short code kaise bane', icon: '🔑',
          options: [
            { id: 'counter', label: 'Badhta counter → scramble → base62', score: 3, why: 'Collision <b>namumkin</b> hai, isliye har write par existence-check hai hi nahi. Code sabse chhota rehta hai, aur scramble se guessing bhi ruk jaati hai.' },
            { id: 'random', label: '7 random characters, collision par retry', score: -1, why: 'Chalega, par har insert par ek "yeh code hai kya?" lookup chahiye — aur jaise-jaise space bharta hai, retry badhte jaate hain. (Bloom filter usme se 99% lookups kaat sakta hai, par asli hal collision ko <b>khatam</b> karna hai.)' },
            { id: 'hash', label: 'md5(url) ke pehle 7 characters', score: -2, why: 'Do problems: wahi URL hamesha wahi code dega (do alag users, do alag campaigns — ek hi link), aur collisions phir bhi handle karne padenge kyunki 7 characters mein hash truncate ho raha hai.' },
          ],
        },
        {
          id: 'read', label: 'Redirect path', icon: '⚡',
          options: [
            { id: 'cache', label: 'Cache-aside; miss par code ke index se DB', score: 3, why: '95%+ hit rate seedha aata hai kyunki links ka access bahut skewed hai. Aur redirect path par bas ek key lookup rehta hai — "embarrassingly simple".' },
            { id: 'db', label: 'Har baar DB, index laga hai', score: 0, why: '12,000 rps par ek Postgres ise kar bhi lega — par p99 50ms ka SLO aur 99.99% ki shart cache ke bina bahut naazuk ho jaati hai. Yahan cache lagbhag muft ka faayda hai.' },
            { id: 'join', label: 'DB + har redirect par click count UPDATE', score: -3, why: 'Tumne 12,000 reads/sec ko 12,000 <b>writes</b>/sec bana diya — aur woh sab ek hi row par (hot row contention). Click count hamesha async: event bhejo, redirect turant lauta do.' },
          ],
        },
        {
          id: 'status', label: 'Redirect ka status code', icon: '↩️',
          options: [
            { id: '302', label: '302 Found', score: 2, why: 'Har click tumhare server se guzarta hai — isliye analytics milti hai aur destination badla ja sakta hai. Jab analytics product ka hissa ho, yeh extra load ek <b>feature</b> hai.' },
            { id: '301', label: '301 Permanent', score: -1, why: 'Server load kam ho jaata hai (browser khud cache kar leta hai) — par isi wajah se <b>click count khatam</b> ho jaata hai, aur link ka destination kabhi badla nahi ja sakta. Requirements mein analytics likha hai.' },
          ],
        },
        {
          id: 'viral', label: 'Ek link viral ho gaya — 50k rps', icon: '🔥',
          options: [
            { id: 'local', label: '1-second local cache + cache key ki N copies', score: 3, why: 'Local cache 99.9% traffic app ki memory se hi de deta hai (aur 1 second ki staleness ek redirect ke liye bilkul bekaar cheez hai). Copies bache hue traffic ko nodes par baant deti hain.' },
            { id: 'nodes', label: 'Cache cluster mein aur nodes daalo', score: -2, why: 'Ek key hamesha <b>ek</b> node par hash hoti hai. 20 nodes hon ya 200, woh key ek hi node par jalegi.' },
            { id: 'rate', label: 'Us code par rate limit lagao', score: -3, why: 'Yeh traffic asli users ka hai — tum apne hi product ko band kar rahe ho. Rate limit abuse ke liye hai, popularity ke liye nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Write path bhula diya (40/sec), read path par sab kuch, aur viral link ko hot key ki tarah treat kiya. Yahi is problem ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek chunav read path par kaam bada raha hai — aur wahi 12,000 rps par sabse mehenga padta hai.',
        bad: '🤔 Estimate wapas padho: 40 writes/sec vs 12,000 reads/sec. Poora design us ek ratio se nikalta hai.',
      },
    },
    {
      type: 'terminal',
      title: 'Mission — Shortener ka bottleneck',
      goal: `Code generation ke dono raaste naapo, phir redirect path ko
             12,000 rps aur ek viral link ke liye tayyar karo.`,
      sys: SD.sys.txn({
        name: 'shortener',
        slo: { p99Ms: 50, availability: 99.99 },
        api: { countTotal: false, pagination: 'cursor' },
      }),
      tasks: T_BITLY,
      success: allOf(T_BITLY),
      successText: `Poora design ek ratio se nikla: <b>100:1</b>.
        Write path itna chhota hai ki uspar sochna bhi bekaar tha; saara kaam
        read path par tha. Aur viral link koi naya problem nahi tha —
        woh wahi <b>hot key</b> thi jo tum pehle se jaante ho.`,
      hints: [
        'Pehle numbers: estimate --users 100000000 --rps 12000 --bytes 500',
        'Random code = har insert par lookup, aur random index: id bench --type uuid4 --rows 1000000',
        'Counter + base62 = sortable, koi lookup nahi: id bench --type snowflake --rows 1000000',
        'Ab redirect path par peak load: load --rps 12000 --duration 8',
        'Cache lagao — redirect 99% read hai: sim add cache --ttl 300 --jitter 20',
        'Ek viral link: cache hotkey --key url:aX9k2Lq --rps 50000',
        'Use phailao: cache hotkey --key url:aX9k2Lq --rps 50000 --replicas 8',
      ],
    },
    {
      type: 'quiz',
      title: 'Shortener ke faisle',
      questions: [
        {
          q: 'Counter-based codes random se behtar kyun hain?',
          choices: [
            'Collision mumkin hi nahi — isliye har write par "yeh code pehle se hai kya?" wala lookup HAI HI NAHI. Aur code sabse chhota rehta hai',
            'Woh tez generate hote hain',
            'Woh chhote dikhte hain',
            'Woh secure hain',
          ],
          answer: 0,
          explain: 'Random codes ke saath har insert ek read + ek write hai, aur space bharne par retries badhte jaate hain. Counter ke saath woh read <b>gayab</b> ho jaata hai. Yeh us tarah ka optimization hai jo sabse achha hota hai: kaam <b>tez</b> nahi kiya, kaam <b>hataya</b> diya.',
        },
        {
          q: 'Click analytics chahiye. Redirect ke waqt kya karoge?',
          choices: [
            'Ek event async bhejo (queue/stream) aur redirect turant lauta do — DB update redirect path par kabhi nahi',
            'DB mein click_count += 1 karo',
            'Redis counter badhao, phir redirect',
            'Analytics chhod do',
          ],
          answer: 0,
          explain: 'Sync DB update 12,000 reads/sec ko 12,000 writes/sec bana deta hai — <b>aur woh sab ek hi row par</b> (hot row contention). Redis counter <b>bahut behtar</b> hai aur kai systems yahi karte hain; par sabse saaf yeh hai ki redirect path par kuch bhi block na ho — event fire karo aur nikal jao.',
        },
        {
          q: '5 saal mein 6 arab URLs. Kitne characters chahiye?',
          choices: [
            '7 base62 characters = 3.5 kharab combinations — 6 arab ke liye bahut zyada, aur chhota bhi',
            '6 characters kaafi hain',
            '10 characters chahiye',
            'UUID use karo',
          ],
          answer: 0,
          explain: '62⁷ ≈ 3.5 × 10¹² hai, aur zaroorat 6 × 10⁹ ki — yaani 500x margin. (62⁶ ≈ 5.7 × 10¹⁰ bhi kaafi hota, par 7 par margin aaram se rehta hai.) Yeh us tarah ka calculation hai jo 30 second leta hai aur poore design ka ek sawaal hamesha ke liye band kar deta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — URL Shortener',
    instructions: 'Sabse aam pehla system design sawaal. 🎤',
    questions: [
      {
        q: '"Bitly design karo." Pehla kaam?',
        choices: [
          'Read:write ratio poochhna. 100:1 nikla toh poora design read path ka hai — write path itna chhota hai ki uspar waqt lagana hi galti hogi',
          'Database schema banana',
          'Hashing algorithm chunna',
          'Microservices decide karna',
        ],
        answer: 0,
        explain: 'Ek sawaal ne poora design tay kar diya. 100:1 ka matlab hai: cache par focus, redirect path ko simple rakho, aur analytics ko async karo. Agar ratio ulta hota (write-heavy), toh yeh bilkul alag system hota. Isiliye "shape pehchano" pehla kadam hai.',
      },
      {
        q: '"Custom alias chahiye — /my-campaign. Ab kya badla?"',
        choices: [
          'Ab collision mumkin hai (do log wahi alias maang sakte hain), toh unique constraint par insert karo aur DB ko decide karne do — check-then-insert race se bacho. Aur reserved words (admin, api, login) ki blocklist chahiye',
          'Kuch nahi badla',
          'Alias ko hash kar do',
          'Alias ko counter mein badal do',
        ],
        answer: 0,
        explain: 'Yeh follow-up dekhta hai ki tum <b>race conditions</b> pehchante ho. "Pehle check karo phir insert karo" wahi check-then-act bug hai — do requests ek saath wahi alias le sakti hain. Sahi jawab: unique index par insert karo aur constraint violation ko 409 mein badal do. Aur reserved paths ka dhyaan ek asli production detail hai.',
      },
    ],
  },
  success: [
    'Read:write ratio se poora design nikaal sakte ho',
    'Counter vs random vs hash ka asli farak bata sakte ho',
    'Redirect path ko simple rakhna jaante ho',
    'Viral link ko hot key ki tarah treat kar sakte ho',
  ],
  homework: `Koi bhi short link kholo aur browser ke Network tab mein dekho:
    301 aaya ya 302? Usse pata chal jaayega ki woh service analytics rakh rahi hai ya nahi.
    Phir code ki lambai gino aur hisaab lagao ki us space mein kitne links aa sakte hain.`,
  cards: [
    { front: 'Shortener ka pehla sawaal?', back: '<b>Read:write ratio.</b> 100:1 nikla → poora design read path ka hai; 40 writes/sec par write path pe sochna hi galti hai.' },
    { front: 'Short code kaise banayein?', back: '<b>Counter → scramble → base62.</b> Collision namumkin, isliye per-write existence lookup <b>hai hi nahi</b>. 7 chars = 3.5 kharab codes.' },
    { front: 'Click analytics kaise?', back: '<b>Async event</b> — redirect path par DB update kabhi nahi. Warna 12k reads/sec = 12k writes/sec ek hi row par (hot row).' },
    { front: '301 vs 302?', back: '<b>301</b> = browser cache karta hai → load kam, par analytics khatam aur destination kabhi nahi badal sakte. <b>302</b> = har click server se → analytics milti hai. Shorteners 302 chunte hain.' },
    { front: 'Viral link (50k rps ek code par)?', back: 'Hot key. <b>1-second local cache</b> (99.9% traffic wahin) + cache key ki N copies. Cache nodes badhane se kuch nahi hoga.' },
    { front: 'Custom alias ka chhupa hua bug?', back: '<b>Check-then-insert race.</b> Unique index par seedha insert karo aur violation ko 409 banao. Aur reserved words (admin, api, login) block karo.' },
  ],
},

/* =====================================================================
   B2 — Leaderboard / Top-K
   ===================================================================== */
{
  id: 'leaderboard',
  icon: '🏆',
  title: 'Build #2 — Leaderboard',
  badge: 'Rank Rachnakar',
  objectives: [
    '"Top 100" ke liye <code>ORDER BY … LIMIT</code> kyun nahi chalti',
    'Redis sorted set — structure hi jawab hai',
    '"Meri rank kya hai" — sabse mehenga sawaal',
    'Crore users par approximate rank kab theek hai',
  ],
  lesson: [
    `<h3>📖 Requirements</h3>
     <pre>FUNCTIONAL
  • Score update karo (game khatam hone par)
  • Top 100 dikhao
  • "Meri rank kya hai" batao
  • Daily / weekly / all-time leaderboards

NON-FUNCTIONAL
  • 50 lakh active players
  • Score updates: 10,000/sec peak
  • Top-100 read: 50,000/sec (har koi dekhta hai)
  • Realtime lagna chahiye (&lt; 1 second)</pre>
     <h3>❌ Seedha tareeka aur woh kyun tootta hai</h3>
     <pre>SELECT * FROM scores ORDER BY score DESC LIMIT 100;</pre>
     <p>Index laga hoga toh yeh <b>tez</b> bhi chalegi — top 100 lene ke liye
     index ke pehle 100 entries kaafi hain. Problem read mein nahi,
     <b>write</b> mein hai: 10,000 score updates/sec, aur har update ko
     <code>score</code> wale index mein apni jagah badalni padti hai —
     yaani B-tree mein delete + insert. Aur woh saare updates ek hi
     "top" hisse ke aas-paas ho rahe hain: <b>index hot spot</b>.</p>
     <p>Aur asli qatl doosra sawaal karta hai:</p>
     <pre>SELECT COUNT(*) FROM scores WHERE score > (mera score);   ← meri rank</pre>
     <p>Yeh <b>har baar</b> lakhon rows ginta hai. 50 lakh players ke saath
     yeh ek query poore DB ko rok deti hai — aur har player yeh sawaal
     poochhta hai.</p>`,
    `<h3>✅ Redis sorted set — structure hi jawab hai</h3>
     <pre>ZADD   leaderboard 4820 player:912      score update      O(log n)
ZREVRANGE leaderboard 0 99 WITHSCORES    top 100        O(log n + 100)
ZREVRANK  leaderboard player:912          meri rank      O(log n)
ZINCRBY   leaderboard 50 player:912       score badhao   O(log n)</pre>
     <p>Andar ek <b>skip list</b> hai jo hamesha sorted rehti hai, aur har node
     ke saath "mere neeche kitne hain" ka count. Isiliye <b>rank ek gin-ti nahi,
     ek lookup hai</b> — O(log n). Wahi sawaal jo SQL mein poore table ka scan
     tha, yahan microseconds ka hai.</p>
     <p class="tip">🎯 Yeh is track ka ek bada sabak hai: kabhi-kabhi jawab
     "query optimize karo" nahi hota — jawab <b>alag data structure</b> hota hai.
     Sorted set exactly is sawaal ke liye bana hai.</p>
     <h3>🗓️ Time windows</h3>
     <pre>leaderboard:daily:2026-09-04     TTL 48 ghante
leaderboard:weekly:2026-W36      TTL 14 din
leaderboard:alltime              koi TTL nahi</pre>
     <p>Score update par teenon mein <code>ZINCRBY</code> karo. Teen writes ek
     write ki jagah — par har ek O(log n) hai aur Redis 1 lakh ops/sec aaram se
     karta hai. Aur TTL se purane leaderboards apne aap saaf ho jaate hain.</p>
     <h3>📈 Aur jab 5 crore players ho jaayein?</h3>
     <p>Ek sorted set mein 5 crore entries = ~4 GB. Woh ek Redis instance mein
     aa toh jaayega, par ab woh ek <b>single point</b> hai jispar 50,000 rps hai.
     Do raaste:</p>
     <table>
       <tr><td><b>Top-K alag karo</b></td><td>Top 1000 ek chhote set mein (sab wahi dekhte hain), poori list alag</td><td>Read ka 99% ek chhote, replicated set se</td></tr>
       <tr><td><b>Rank ko approximate karo</b></td><td>Score buckets: "tum top 5% mein ho" / "rank ~48,200"</td><td>Exact rank sirf top 1000 ke liye, jahan woh sach mein matter karti hai</td></tr>
     </table>
     <p class="tip">🎯 Yeh doosra raasta ek product insight hai, engineering nahi:
     rank 4,82,391 aur 4,84,100 mein player ke liye <b>koi farak nahi</b> hai.
     Exactness sirf top ke paas maayne rakhti hai. Yeh poochhna
     — "kya yahan exact jawab chahiye?" — aksar poora scaling problem hi hata deta hai.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — Leaderboard',
      instructions: '50 lakh players, 10k updates/sec, 50k top-100 reads/sec.',
      brief: `Ek mobile game ka leaderboard. Har match ke baad score update hota hai.
        Players top 100 dekhte hain aur apni rank bhi. Daily, weekly aur all-time — teenon chahiye.`,
      requirements: ['50 lakh players', '10k score updates/sec', '50k top-100 reads/sec', '&lt; 1 second freshness'],
      pass: 10,
      slots: [
        {
          id: 'store', label: 'Leaderboard kis structure mein', icon: '🏆',
          options: [
            { id: 'zset', label: 'Redis sorted set (ZADD / ZREVRANGE / ZREVRANK)', score: 3, why: 'Structure hi jawab hai. Score update, top-K aur <b>rank</b> — teenon O(log n). Rank yahan ek gin-ti nahi, ek lookup hai.' },
            { id: 'sql', label: 'Postgres table with index on score', score: -1, why: 'Top-100 toh chal jaayega, par 10k updates/sec index ke ek hi hisse par hot spot banate hain — aur "meri rank" ke liye <code>COUNT(*) WHERE score &gt; ?</code> har baar lakhon rows ginega.' },
            { id: 'sort', label: 'Har request par saare scores memory mein sort karo', score: -3, why: '50 lakh entries ka sort har request par — 50,000 rps par yeh pehle second mein hi khatam.' },
          ],
        },
        {
          id: 'rank', label: '"Meri rank kya hai"', icon: '📊',
          options: [
            { id: 'zrank', label: 'ZREVRANK — O(log n) lookup', score: 3, why: 'Sorted set har node ke saath "neeche kitne hain" rakhta hai, isliye rank gini nahi jaati, <b>padhi</b> jaati hai. Yahi is structure ka sabse bada faayda hai.' },
            { id: 'count', label: 'COUNT(*) WHERE score > mera', score: -3, why: 'Har call par lakhon rows. Aur yeh sawaal <b>har player</b> poochhta hai — yaani sabse mehengi query sabse zyada chalti hai.' },
            { id: 'approx', label: 'Score buckets se approximate rank', score: 1, why: 'Bahut bade scale (5 crore+) par yeh sahi raasta hai — par 50 lakh par ZREVRANK exact bhi de deta hai aur sasta bhi hai. Complexity tab lo jab zaroorat ho.' },
          ],
        },
        {
          id: 'windows', label: 'Daily / weekly / all-time', icon: '🗓️',
          options: [
            { id: 'keys', label: 'Alag keys with TTL — teenon mein ZINCRBY', score: 2, why: 'Har window apni key, TTL se purane apne aap saaf. Teen writes ek update par — par har ek O(log n) hai, aur Redis ke liye yeh kuch bhi nahi.' },
            { id: 'query', label: 'Ek hi set, aur time se filter kar lo', score: -2, why: 'Sorted set score par sorted hai, time par nahi — "aaj ke scores" filter karne ka koi sasta tareeka hai hi nahi. Window alag key hi honi chahiye.' },
          ],
        },
        {
          id: 'durable', label: 'Redis gir gaya toh', icon: '💾',
          options: [
            { id: 'source', label: 'Scores DB mein bhi likho — Redis ek derived view hai jo rebuild ho sake', score: 2, why: 'Sahi rishta: DB source of truth, Redis ek tez read structure. Redis gira toh leaderboard thodi der ke liye gaya, <b>scores nahi</b>. Rebuild ek job hai.' },
            { id: 'aof', label: 'Redis persistence (AOF) hi kaafi hai', score: -1, why: 'AOF asli hai par woh Redis ko source of truth bana deta hai — aur tab dataset RAM ki hadd mein bandha hai aur crash par aakhri kuch second ke writes ja sakte hain. Game scores ke liye woh risk lene ki koi wajah nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Structure hi jawab tha — aur tumne Redis ko ek <b>derived</b> view rakha, source of truth nahi. Yahi dono cheezein is design ko sahi banati hain.',
        ok: '👍 Zyadatar theek. Ek chunav "meri rank" wale sawaal ko mehenga bana raha hai — aur woh sawaal sabse zyada poochha jaata hai.',
        bad: '🤔 Wapas socho: kaunsa <b>data structure</b> "top-K" aur "rank" dono ko O(log n) mein deta hai?',
      },
    },
    {
      type: 'quiz',
      title: 'Leaderboard ke faisle',
      questions: [
        {
          q: 'SQL mein leaderboard ka sabse mehenga sawaal kaunsa hai?',
          choices: [
            '"Meri rank kya hai" — COUNT(*) WHERE score > mera, har baar lakhon rows. Aur yeh sawaal har player poochhta hai',
            'Top 100 nikalna',
            'Score update karna',
            'Naya player add karna',
          ],
          answer: 0,
          explain: 'Top-100 sasta hai (index ke pehle 100 entries). Rank mehengi hai kyunki uske liye <b>ginna</b> padta hai. Aur cruel baat yeh hai ki sabse mehengi query sabse zyada chalti hai — har player apni rank dekhta hai. Sorted set isi ek sawaal ka jawab O(log n) mein de deta hai.',
        },
        {
          q: 'Redis sorted set rank ko O(log n) mein kaise deta hai?',
          choices: [
            'Skip list ke har node ke saath "mere neeche kitne hain" ka count rehta hai — isliye rank gini nahi jaati, padhi jaati hai',
            'Woh sab kuch cache karta hai',
            'Woh memory mein hai isliye tez hai',
            'Woh ek array rakhta hai',
          ],
          answer: 0,
          explain: 'Sirf "memory mein hai" wala jawab kaafi nahi — 50 lakh entries memory mein ginne mein bhi waqt lagta. Asli baat structure hai: skip list ke levels par span counts rakhe jaate hain, isliye traversal ke doraan rank <b>jud</b> jaati hai. Isi liye ise "data structure ka jawab" kehte hain, "storage ka jawab" nahi.',
        },
        {
          q: '5 crore players ho gaye. Sabse pehle kya karoge?',
          choices: [
            'Poochhunga ki exact rank sach mein chahiye kya — top 1000 ke liye haan, baaki ke liye "top 5% mein ho" ya approximate rank kaafi hai. Yeh product sawaal poore scaling problem ko hata sakta hai',
            'Redis cluster mein shard karo',
            'Aur memory daalo',
            'Rank cache karo',
          ],
          answer: 0,
          explain: 'Sharding ek sorted set ko todna mushkil hai (global ordering chahiye). Par isse pehle: rank 4,82,391 aur 4,84,100 mein <b>player ke liye</b> koi farak nahi. Exactness sirf top ke paas maayne rakhti hai. Yeh sawaal poochhna — "kya yahan exact chahiye?" — aksar engineering ka aadha kaam bacha deta hai.',
        },
      ],
    },
    {
      type: 'match',
      title: 'Redis structures',
      pairs: [
        { left: 'Leaderboard, top-K, rank', right: 'Sorted set (ZSET)', explain: 'Score par sorted, aur rank O(log n). Yeh is problem ke liye hi bana hai.' },
        { left: 'Session data, user profile cache', right: 'Hash (HSET)', explain: 'Ek object ke fields alag-alag padhe/likhe ja sakte hain — poora JSON serialize karne se behtar.' },
        { left: '"Aaj kitne unique visitors"', right: 'HyperLogLog (PFADD)', explain: '12 KB mein, chahe kitne bhi ho. Aur PFMERGE se alag servers ke counts jud jaate hain.' },
        { left: 'Rate limiting — pichhle 60s mein kitni requests', right: 'Sorted set (timestamp as score) ya counter with TTL', explain: 'Sliding window ke liye ZSET mein timestamps rakh ke purane <code>ZREMRANGEBYSCORE</code> se hata do. Fixed window ke liye ek INCR + EXPIRE kaafi hai aur bahut sasta hai.' },
        { left: 'Distributed lock / seat hold', right: 'SET key val NX EX', explain: 'Atomic "sirf tab banao jab na ho" + apne aap expire. Yeh reservation pattern ki ek line hai.' },
        { left: 'Recent activity feed (aakhri 100)', right: 'List (LPUSH + LTRIM)', explain: 'Aage se daalo, 100 par kaat do. Rolling buffer ka sabse sasta roop.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Leaderboard',
    instructions: 'Yahan structure ka naam lena hi aadha jawab hai. 🎤',
    questions: [
      {
        q: '"Realtime gaming leaderboard design karo, 50 lakh players."',
        choices: [
          'Redis sorted set — ZADD update, ZREVRANGE top-K, ZREVRANK rank, sab O(log n). Scores DB mein bhi (source of truth), Redis derived. Daily/weekly alag keys with TTL',
          'Postgres table with index on score',
          'Har minute ek batch job jo ranks compute kare',
          'Elasticsearch',
        ],
        answer: 0,
        explain: 'Do cheezein iss jawab ko poora banati hain: sahi <b>structure</b> (aur uske teenon operations ka naam), aur Redis ka <b>rishta</b> DB ke saath. Doosra hissa bhoolna sabse aam galti hai — tab Redis chupke se source of truth ban jaata hai aur ek din woh gir jaata hai.',
      },
      {
        q: '"Ab 5 crore players. Kya badlega?"',
        choices: [
          'Pehle poochhunga ki exact rank sabke liye chahiye kya. Top-1000 alag chhote set mein (jo 99% reads khaata hai aur replicate ho sakta hai), baaki ke liye bucketed/approximate rank. Us se poora sharding ka sawaal hi tal jaata hai',
          'Sorted set ko shard kar dunga',
          'Bade Redis instance par jaunga',
          'Cassandra par shift karunga',
        ],
        answer: 0,
        explain: 'Sorted set ko shard karna mushkil hai kyunki rank ke liye <b>global ordering</b> chahiye — har shard ka apna order poore leaderboard ki rank nahi deta. Isliye achha jawab pehle <b>requirement</b> kaatta hai, phir structure. "Top-K alag karo" bhi mazboot hai: 99% reads sirf top 100 ke hain.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki "meri rank" SQL mein kyun mehengi hai',
    'Sorted set ke teenon operations aur unki complexity jaante ho',
    'Redis ko derived view rakhte ho, source of truth nahi',
    'Approximate rank ka product argument bol sakte ho',
  ],
  homework: `Apne product mein koi ranking, top-N, ya "recent" list dhoondo.
    Dekho ki woh kis structure se aati hai. Agar woh har request par
    <code>ORDER BY … LIMIT</code> ya <code>COUNT(*)</code> hai, toh hisaab lagao
    ki data 100x hone par woh query kitni der legi.`,
  cards: [
    { front: 'Leaderboard ka sabse mehenga sawaal?', back: '<b>"Meri rank kya hai"</b> — SQL mein <code>COUNT(*) WHERE score &gt; ?</code>, har baar lakhon rows. Aur yeh sawaal <b>har</b> player poochhta hai.' },
    { front: 'Redis sorted set kya deta hai?', back: '<code>ZADD</code> update · <code>ZREVRANGE</code> top-K · <code>ZREVRANK</code> rank — <b>teenon O(log n)</b>. Skip list ke span counts se rank <b>gini nahi, padhi</b> jaati hai.' },
    { front: 'Daily/weekly/all-time?', back: '<b>Alag keys + TTL</b>, aur update par teenon mein ZINCRBY. Ek hi set mein time se filter karne ka koi sasta tareeka nahi (woh score par sorted hai, time par nahi).' },
    { front: 'Redis aur DB ka rishta?', back: 'DB <b>source of truth</b>, Redis ek <b>derived</b> read structure jo rebuild ho sake. Redis gira = leaderboard gaya, <b>scores nahi</b>.' },
    { front: '5 crore players par?', back: 'Pehle poochho: <b>exact rank sach mein chahiye?</b> Top-1000 alag set (99% reads), baaki approximate/bucketed. Sorted set shard karna mushkil hai — rank ke liye global ordering chahiye.' },
    { front: 'Bada sabak?', back: 'Kabhi-kabhi jawab "query optimize karo" nahi — jawab <b>alag data structure</b> hota hai.' },
  ],
},


/* =====================================================================
   B3 — Ad Click Aggregator
   ===================================================================== */
{
  id: 'adclick',
  icon: '📊',
  title: 'Build #3 — Ad Click Aggregator',
  badge: 'Stream Silpi',
  objectives: [
    'Event time vs processing time — paise wale system mein',
    'Partition key ka chunav = ordering ka design',
    'Duplicate clicks: at-least-once + dedup',
    'Fast approximate + slow exact — dono ek saath',
  ],
  lesson: [
    `<h3>📖 Requirements</h3>
     <pre>FUNCTIONAL
  • Har ad click record karo
  • Minute-wise, ad-wise counts
  • Advertisers ko dashboard (aakhri 1 min se leke 1 saal tak)
  • Billing isi data par hoti hai        ← yahi sab kuch badal deta hai

NON-FUNCTIONAL
  • 10 lakh clicks/sec peak
  • Dashboard freshness &lt; 1 minute
  • Counts SAHI hone chahiye (paisa hai)
  • Clicks kabhi kho na sakein</pre>
     <p class="tip">🎯 Woh ek line — <b>"billing isi data par hoti hai"</b> —
     poore design ka aakaar badal deti hai. Ek analytics dashboard mein
     ±1% galti chalti hai. Yahan har galti kisi ka <b>paisa</b> hai.
     Isiliye yahan approximate structures (HLL) galat jagah par hain, aur
     dedup + reconciliation zaroori ho jaate hain.</p>
     <h3>🏗️ Poora flow</h3>
     <pre>browser → ingest API → Kafka (partition by ad_id)
                              ↓
                    stream processor (Flink)
                    event-time tumbling windows, 1 min
                    watermark 10s
                              ↓
                    OLAP store (ClickHouse)  →  dashboard
                              ↓
                    raw events → S3  →  raat ko exact batch → correction</pre>
     <h3>🔑 Partition key: <code>ad_id</code></h3>
     <p>Kyun? Kyunki aggregation <b>ad ke hisaab se</b> hoti hai. Ek ad ke saare
     clicks ek hi partition mein jaayein toh ek hi consumer unhe gin sakta hai —
     bina kisi cross-partition coordination ke.</p>
     <p><b>Par ek khatra:</b> Super Bowl wala ad. Ek <code>ad_id</code> par
     traffic ka 40% — aur woh sab ek partition par. Yeh <b>hot partition</b> hai
     (wahi shape jo hot key aur hot cell mein tha). Ilaaj wahi:
     us ad ki key ko todo — <code>ad_id:0</code> se <code>ad_id:N</code> —
     aur dashboard par unhe jod do.</p>`,
    `<h3>⏱️ Event time — kyunki mobile late aata hai</h3>
     <p>Click 8:59:58 par hua, par phone tunnel mein tha aur event 9:00:03 par pahuncha.
     Woh kis minute ka hai?</p>
     <p><b>Processing time</b> se ginoge: 9:00 wale minute mein. Aasan, aur <b>galat</b> —
     advertiser ko uske campaign ke aakhri minute ka click agle minute mein dikhega,
     aur agar campaign 9:00 par khatam hua toh uska bill galat hoga.</p>
     <p><b>Event time</b> se ginoge: 8:59 mein. Sahi — par ab sawaal hai
     "8:59 wali window band kab karein?" Uska jawab <b>watermark</b> hai:
     "10 second se purana ab nahi aayega".</p>
     <pre>watermark 10s  →  jaldi natija, ~2% events chhoot gaye
watermark 60s  →  ~0.1% chhoote, par har number 1 minute der se</pre>
     <p class="tip">🎯 Billing ke liye jawab dono hai: <b>fast path</b> chhote
     watermark ke saath dashboard bharta hai (approximate, "abhi tak ~4,82,000"),
     aur <b>slow path</b> raat ko S3 ke raw events se poora exact hisaab karta hai
     jo billing mein jaata hai. Isi ko Lambda architecture kehte hain, aur
     iska asli maksad yahi hai: <b>speed aur correctness ek hi pipeline se maango mat</b>.</p>
     <h3>🔁 Duplicate clicks</h3>
     <p>Kafka at-least-once deta hai. Consumer crash hua, offset commit nahi hua,
     woh batch dobara process hoga — aur woh clicks <b>do baar</b> gine jaayenge.
     Paise wale system mein yeh manzoor nahi.</p>
     <pre>1. Har click ke saath ek client-generated click_id
2. Processor ek dedup window rakhta hai (aakhri 10 min ke ids)
   → bloom filter se pehla chhanna (sasta), phir exact set/store se pakka
3. Aur raat wala exact pass duplicates ko poori tarah saaf karta hai</pre>
     <p>Yahan bloom filter ka role dhyaan se samjho: woh "shayad dekha hai"
     kehta hai, aur uske baad <b>exact check</b> hota hai. Bina exact check ke
     woh ek asli click ko duplicate samajh ke <b>gira</b> sakta hai — aur woh
     kisi ka paisa hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Windows, watermarks, dedup',
      goal: `Late events ka nuksaan naapo, watermark se sudhaaro, partitions
             theek karo, aur dedup ka daam dekho.`,
      sys: SD.sys.orders({ name: 'ad-ingest' }),
      tasks: T_ADCLICK,
      success: allOf(T_ADCLICK),
      successText: `Yeh system paise ka hai, isliye har faisla thoda alag hua:
        event time (processing time nahi), dedup laazmi, aur ek <b>doosra</b> exact
        pass jo raat ko chalta hai. Aur hot partition wahi purana shape tha —
        Super Bowl ad ne wahi kiya jo airport wali cell ne kiya tha.`,
      hints: [
        'Bina watermark: stream window --size 60 --events 1000000 --late 4',
        'Chhota watermark: stream window --size 60 --watermark 10 --events 1000000 --late 4',
        'Bada watermark: stream window --size 60 --watermark 30 --events 1000000 --late 4',
        'Zyada consumers: stream partitions --partitions 12 --consumers 20',
        'Theek karo: stream partitions --partitions 12 --consumers 12',
        'Dedup window ka size: bloom --items 10000000 --fp 0.01',
        'Super Bowl ad: cache hotkey --key ad:sb2026 --rps 400000',
        'Key todo: cache hotkey --key ad:sb2026 --rps 400000 --replicas 32',
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Ad Click Aggregator',
      instructions: '10 lakh clicks/sec, minute-wise counts, aur billing isi par hai.',
      brief: `Ek ad network. 10 lakh clicks/sec peak. Advertisers minute-wise counts dekhte hain,
        aur mahine ke ant mein <b>bill</b> isi data se banta hai.`,
      requirements: ['10 lakh clicks/sec', 'Dashboard &lt; 1 min purana', 'Counts SAHI hon (billing)', 'Clicks kho na sakein'],
      pass: 12,
      slots: [
        {
          id: 'bus', label: 'Ingest ke baad kahan', icon: '🌊',
          options: [
            { id: 'kafka', label: 'Kafka, partition by ad_id', score: 3, why: 'Durable buffer, replay (billing dispute par bahut kaam ka), aur ad-wise partitioning se aggregation bina coordination ke ho jaati hai. Aur agar processor gir jaaye toh events wahin rehte hain.' },
            { id: 'db', label: 'Seedha DB mein insert', score: -3, why: '10 lakh inserts/sec. Aur processor girne par backpressure ka koi rasta nahi — ingest API hi gir jaayegi.' },
            { id: 'sqs', label: 'SQS queue', score: -1, why: 'Ingest ke liye chal jaayega, par consume karte hi events chale jaate hain — billing dispute par replay nahi kar sakte, aur ek hi data par doosra consumer (fraud detection) nahi laga sakte.' },
          ],
        },
        {
          id: 'time', label: 'Kis waqt se ginna', icon: '⏱️',
          options: [
            { id: 'event', label: 'Event time + watermark', score: 3, why: 'Click jab HUA tab ka minute. Mobile clicks late aate hain, aur processing time se ginne par campaign ke aakhri minute ke clicks agle minute mein chale jaate hain — jo seedha bill galat karta hai.' },
            { id: 'proc', label: 'Processing time', score: -2, why: 'Aasan hai aur <b>galat</b> hai. Aur galti random nahi hoti — woh un users par padti hai jinka network kharab hai, yaani systematically kuch advertisers ko nuksaan.' },
          ],
        },
        {
          id: 'dedup', label: 'Duplicate clicks', icon: '🔁',
          options: [
            { id: 'both', label: 'click_id + bloom se pehla chhanna + exact check', score: 3, why: 'At-least-once delivery matlab duplicates aayenge hi. Bloom sasta pehla filter hai, par "shayad dekha hai" par <b>exact check laazmi</b> — warna ek asli click gir sakta hai, aur woh kisi ka paisa hai.' },
            { id: 'bloomonly', label: 'Sirf bloom filter', score: -2, why: 'False positive ka matlab yahan ek asli click ko duplicate samajh ke <b>girana</b> hai. Analytics mein chalta, billing mein nahi.' },
            { id: 'none', label: 'Kuch nahi — duplicates kam hote hain', score: -3, why: 'Consumer crash + offset commit na hona roz ki baat hai. Aur duplicates ka matlab advertiser ko dugna bill — woh dispute banta hai.' },
          ],
        },
        {
          id: 'exact', label: 'Billing ke liye numbers', icon: '💰',
          options: [
            { id: 'lambda', label: 'Fast approximate dashboard + raat ko exact batch (S3 raw se)', score: 3, why: 'Do alag zarooratein, do alag paths. Dashboard ko turant chahiye (thodi galti manzoor), billing ko <b>sahi</b> chahiye (der manzoor). Ek hi pipeline se dono maangna hi galti hai.' },
            { id: 'stream', label: 'Sirf stream ka natija hi billing mein', score: -1, why: 'Chal sakta hai — par jo events watermark ke baad aaye woh bill mein kabhi nahi aayenge, aur uska koi correction path bhi nahi. Aur dispute par tumhare paas "dobara gin lo" ka koi rasta nahi.' },
            { id: 'batch', label: 'Sirf raat wala batch, dashboard bhi usi se', score: -1, why: 'Numbers sahi honge par dashboard 24 ghante purana — jo requirement (&lt; 1 min) ke bilkul khilaaf hai. Advertisers live campaign band nahi kar paayenge.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 "Billing isi data par hai" ne har faisla badla — event time, dedup, aur ek doosra exact pass. Yahi is problem ki asli pehchaan hai.',
        ok: '👍 Pipeline sahi hai. Ek jagah tum analytics ki tarah soch rahe ho, jabki yeh paisa hai.',
        bad: '🤔 Ek line dobara padho: <b>billing isi data par hoti hai</b>. Ab har chunav dobara dekho.',
      },
    },
    {
      type: 'quiz',
      title: 'Aggregator ke faisle',
      questions: [
        {
          q: '"Billing isi data par hoti hai" — isse kya-kya badal jaata hai?',
          choices: [
            'Event time laazmi, dedup laazmi, aur ek exact correction pass chahiye — approximate structures (HLL) yahan galat jagah par hain',
            'Kuch khaas nahi',
            'Bas zyada replicas chahiye',
            'Sirf dashboard tez hona chahiye',
          ],
          answer: 0,
          explain: 'Yeh wahi purana sawaal hai — <b>galat jawab kitna mehenga hai?</b> — aur yahan jawab "kisi ka paisa" hai. Ek analytics dashboard mein ±1% bilkul theek hai; yahan woh ek dispute hai. Isliye teen alag faisle badalte hain, aur teenon usi ek line se aate hain.',
        },
        {
          q: 'Partition key <code>ad_id</code> chuna. Kaunsa khatra bacha hai?',
          choices: [
            'Hot partition — ek viral/Super Bowl ad par traffic ka 40%, aur woh sab ek partition par. Ilaaj: us ad ki key todo (ad_id:0..N) aur dashboard par jod do',
            'Ordering toot jaayegi',
            'Consumers khaali baithenge',
            'Koi khatra nahi',
          ],
          answer: 0,
          explain: 'Yeh wahi shape hai jo tum teen baar dekh chuke ho: hot <b>key</b> (cache), hot <b>cell</b> (geo), hot <b>partition</b> (yahan). Aur ilaaj bhi teenon jagah wahi hai — <b>todo ya replicate karo</b>. Isiliye patterns pehchanna kaam ka hai: naya problem sirf naya libaas pehne hue hai.',
        },
        {
          q: 'Watermark 10s se 60s kiya. Billing ke liye yeh sahi hai?',
          choices: [
            'Behtar hai (kam events chhoote) par kaafi nahi — asli hal yeh hai ki billing stream ke natije par depend hi na kare, balki raat ke exact pass par ho',
            'Haan, ab sab sahi hai',
            'Nahi, watermark aur badhao',
            'Watermark ka billing se koi lena-dena nahi',
          ],
          answer: 0,
          explain: 'Watermark kitna bhi bada karo, woh ek <b>anumaan</b> hi rahega — aur kabhi na kabhi koi event uske baad aayega. Billing ke liye tumhe ek aisa raasta chahiye jiska jawab "sab kuch, chahe jitni der lage" ho. Isliye raw events S3 mein rakho aur raat ko poora hisaab karo. Stream dashboard ke liye hai, bill ke liye nahi.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Ad Click Aggregator',
    instructions: 'Yeh streaming ka sabse aam interview sawaal hai. 🎤',
    questions: [
      {
        q: '"10 lakh clicks/sec, minute-wise counts. Design bolo."',
        choices: [
          'Kafka (partition by ad_id) → Flink event-time tumbling windows with watermark → OLAP store → dashboard. Raw events S3 mein bhi, jahan se raat ko exact recompute ho. Dedup click_id se, aur hot ad ke liye key splitting',
          'Har click DB mein, phir GROUP BY',
          'Redis counters badhao',
          'Har ghante batch job',
        ],
        answer: 0,
        explain: 'Char cheezein isme hain: sahi <b>partition key</b>, <b>event time + watermark</b>, <b>dedup</b> (kyunki at-least-once), aur <b>correction path</b>. Redis counters ka jawab galat nahi hai aur chhote scale par bilkul sahi hai — par usme replay, audit aur late-event handling teenon nahi hain.',
        },
      {
        q: '"Advertiser keh raha hai humara count unke count se 3% kam hai. Kya karoge?"',
        choices: [
          'Reconciliation: unke raw logs aur hamare raw events (S3) ko click_id se milaao — teen buckets banao (sirf unke paas, sirf hamare paas, dono par alag). Watermark ke baad aaye events aur dedup dono ko alag-alag check karo',
          'Apne numbers par bharosa karo',
          'Unke numbers maan lo',
          'Difference ko adjust kar do',
        ],
        answer: 0,
        explain: 'Yeh wahi reconciliation hai jo tumne ledger level mein seekha tha, ab streaming par. Aur is system mein 3% ke do sabse sambhaavit karan pehle se pata hain: <b>late events</b> jo watermark ke baad aaye, aur <b>dedup</b> jisne kuch asli clicks gira diye. Isiliye raw events rakhna sirf "achha hota hai" nahi — woh iss baatcheet ka <b>ekmatr</b> saboot hai.',
      },
    ],
  },
  success: [
    'Event time vs processing time ka business asar bata sakte ho',
    'Partition key chun sakte ho aur hot partition sambhaal sakte ho',
    'At-least-once par dedup design kar sakte ho',
    'Fast approximate + slow exact ka do-path design bana sakte ho',
  ],
  homework: `Apne system mein koi counter ya metric dhoondo jispar koi <b>faisla</b> hota hai
    (billing, quota, SLA). Poochho: (1) woh event time se ginta hai ya processing time se?
    (2) duplicates aa sakte hain? (3) agar koi uske number par sawaal uthaye,
    toh tumhare paas raw data hai dobara ginne ke liye?`,
  cards: [
    { front: '"Billing isi data par hai" se kya badalta hai?', back: '<b>Event time</b> laazmi · <b>dedup</b> laazmi · ek <b>exact correction pass</b> chahiye. Approximate structures (HLL) yahan galat jagah hain.' },
    { front: 'Partition key ad_id — khatra?', back: '<b>Hot partition</b> (Super Bowl ad = 40% traffic ek partition par). Wahi shape jo hot key aur hot cell tha. Ilaaj wahi: key todo (<code>ad_id:0..N</code>) aur baad mein jod do.' },
    { front: 'Event time vs processing time?', back: 'Processing time aasan aur <b>galat</b> — aur galti systematically kharab network wale users par padti hai. Event time sahi, par window band karne ke liye <b>watermark</b> chahiye.' },
    { front: 'Duplicates kaise?', back: 'At-least-once = duplicates aayenge. <code>click_id</code> + <b>bloom se pehla chhanna</b> + <b>exact check</b>. Sirf bloom se ek asli click gir sakta hai — aur woh paisa hai.' },
    { front: 'Fast vs exact?', back: '<b>Do paths.</b> Stream → dashboard (turant, thodi galti manzoor). Raw events S3 → raat ko exact → billing. Ek hi pipeline se speed aur correctness dono maangna hi galti hai.' },
    { front: 'Count dispute aaye toh?', back: '<b>Reconciliation</b> raw events se — teen buckets (sirf unke, sirf hamare, dono par alag). Aur do sabse sambhaavit karan pehle se pata hain: <b>late events</b> aur <b>dedup</b>.' },
  ],
},


/* =====================================================================
   B4 — Ticketmaster
   ===================================================================== */
{
  id: 'ticketmaster',
  icon: '🎫',
  title: 'Build #4 — Ticket Booking',
  badge: 'Booking Balwan',
  objectives: [
    'Ek popular event = flash crowd + contention, ek saath',
    'Reservation (hold + TTL) ko poore flow mein baithana',
    'Waiting room — 5 lakh logon ko sach batana',
    'Seat map ka read path aur booking ka write path alag',
  ],
  lesson: [
    `<h3>📖 Requirements</h3>
     <pre>FUNCTIONAL
  • Events browse karo, seat map dekho
  • Seat select karo → checkout → confirm
  • Ek seat kabhi do logon ko na bike

NON-FUNCTIONAL
  • Normal din: 1,000 rps
  • Popular event on-sale: 5 LAKH log, 10 second ke andar   ← asli problem
  • Double booking: ZERO manzoor
  • Payment ke liye user ko 10 minute chahiye</pre>
     <p class="tip">🎯 Yeh design isliye mushkil hai ki ismein <b>do alag mushkil
     cheezein ek saath</b> hain: flash crowd (5 lakh log ek pal mein) aur contention
     (sab ek hi 200 seats ke liye lad rahe hain). Har ek ka ilaaj alag hai,
     aur ek ka ilaaj doosre ko theek nahi karta.</p>
     <h3>🚪 Pehla kadam: sabko andar mat aane do</h3>
     <p>5 lakh requests ko seedha booking service par bhejna outage ka doosra naam hai.
     Aur unme se zyadatar <b>koi seat le hi nahi paayenge</b> — sirf 200 seats hain.
     Isliye pehla component ek <b>waiting room</b> hai:</p>
     <pre>on-sale se pehle:  queue mein position lo (ek token)
on-sale par:       system ek-ek karke logon ko andar bhejta hai
                   (jitni capacity hai, utne)
andar aaya user:   uske paas 10 minute hain
baaki:             "tumhara number 42,318 hai, ~8 minute"</pre>
     <p>Yeh sirf technical bachaav nahi hai — yeh <b>imaandaari</b> hai.
     Bina iske sabko lagta hai woh line mein hain, sab refresh karte hain
     (aur retry se load 3x ho jaata hai), aur aakhir mein 4,99,800 logon ko
     "sold out" milta hai. Number dikhaane se log <b>faisla</b> kar sakte hain.</p>`,
    `<h3>🎟️ Booking flow — teen kadam, teen alag guarantee</h3>
     <pre>1. HOLD      seat par TTL ke saath reservation
             Redis: SET seat:evt42:A14 user:912 NX EX 600
             → NX se atomic "sirf tab jab khaali ho"
             → EX se abandoned checkout apne aap wapas

2. PAY       user checkout karta hai (10 minute)
             → yahan koi DB lock latka hua NAHI hai

3. CONFIRM   payment ok → transaction mein:
             seat status = 'sold', booking row, hold delete
             → payment fail/timeout → hold apne aap expire</pre>
     <p><b>Kyun teen kadam?</b> Ek DB lock 10 minute pakadna namumkin hai.
     Aur bina hold ke, user payment karke aaye aur seat ja chuki ho —
     woh sabse bura experience hai (paisa liya ya nahi, dono soorat mein).
     Hold ek <b>chhota</b> atomic operation hai jiska asar <b>lamba</b> hai.</p>
     <h3>👀 Seat map — read path bilkul alag</h3>
     <p>5 lakh log seat map dekh rahe hain, par sirf kuch hazaar book kar paayenge.
     Seat map ka read path booking se poori tarah alag hona chahiye:</p>
     <pre>seat map     →  cache se (1-2 second purana bilkul theek hai)
             →  websocket/SSE se "yeh seats abhi gayi" ka update
booking      →  seedha, atomic, primary par</pre>
     <p class="tip">🎯 Seat map ka thoda purana hona <b>bilkul theek</b> hai —
     user kisi aisi seat par click karega jo abhi bik gayi, aur use turant
     "yeh ja chuki, ek aur chuno" mil jaayega. Yeh ek achha error hai.
     Bura error tab hota hai jab woh <b>payment ke baad</b> pata chale.
     Isiliye ek achha design galtiyon ko <b>jaldi</b> aur <b>sasta</b> banata hai,
     unhe khatam karne ki koshish nahi karta.</p>
     <h3>🔥 Hot event ka data</h3>
     <p>Ek event par 5 lakh log — matlab us event ki saari rows hot hain.
     Agar tumne <code>event_id</code> par shard kiya hai toh woh poora shard jal raha hai.
     Ilaaj: popular events ko un ke <b>apne</b> resources do (dedicated cache,
     alag read replicas), aur seat map ko event ke hisaab se cache karo —
     kyunki 5 lakh log <b>ek hi</b> seat map dekh rahe hain, aur woh ek key hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — On-sale ka pehla minute',
      goal: `Contention aur flash crowd — dono ko alag-alag hal karo,
             aur dekho ki ek ka ilaaj doosre ko theek <b>nahi</b> karta.`,
      sys: {
        name: 'ticketing',
        slo: { p99Ms: 300, availability: 99.9 },
        db: {
          bufferPoolMB: 2048,
          tables: {
            seats: {
              rows: 2400000, rowBytes: 120, pk: 'id',
              cols: ['id', 'event_id', 'row_no', 'seat_no', 'status', 'held_until'],
              indexes: [
                { name: 'seats_pkey', cols: ['id'], unique: true },
                { name: 'ix_seats_event', cols: ['event_id', 'status'] },
              ],
            },
          },
        },
        pool: { size: 50, acquireTimeoutMs: 10000 },
        app: { instances: 8, cpuMsPerReq: 5 },
        api: { pagination: 'cursor', countTotal: false, defaultSort: 'id', primaryTable: 'seats' },
        deps: { inventory: { p50: 3, p99: 5, errorRate: 0 } },
        booking: { mode: 'none', seats: {}, holds: {} },
      },
      tasks: T_TICKET,
      success: allOf(T_TICKET),
      successText: `Do alag problems, do alag ilaaj:
        <b>contention</b> ka jawab reservation (hold + TTL) tha,
        <b>flash crowd</b> ka jawab admission control tha.
        Dhyaan do ki lock lagane se load kam nahi hua, aur admission control se
        double booking nahi ruki — <b>har problem ko uska apna ilaaj chahiye tha</b>.`,
      hints: [
        'Pehle bina kisi protection ke: book seat A14 --concurrent 2',
        'Saaf karo: book reset',
        'Ab reservation mode: sim set booking.mode reservation',
        'Seat par hold lagao: book hold A14 --ttl 600',
        'Doosra khareedaar ab ruk jaana chahiye: book seat A14 --concurrent 1',
        'Ab on-sale ka load: load --rps 50000 --duration 8',
        'Waiting room lagao: sim add admission --max-concurrent 3000 --queue 8',
        'Aur seat map ko cache karo: sim add cache --ttl 2 --jitter 20',
        'Ab dobara: load --rps 50000 --duration 8',
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Ticket booking',
      instructions: 'Popular event, 5 lakh log, 10 second, 200 seats.',
      brief: `Ek concert ka on-sale. 5 lakh log 10 second ke andar aayenge,
        par sirf 200 seats hain. Double booking bilkul manzoor nahi.
        Payment ke liye user ko 10 minute chahiye.`,
      requirements: ['5 lakh log, 10 second', 'Zero double booking', 'User ko 10 min checkout', 'Seat map live lage'],
      pass: 12,
      slots: [
        {
          id: 'gate', label: 'On-sale par 5 lakh log', icon: '🚪',
          options: [
            { id: 'room', label: 'Waiting room — position number ke saath, ek-ek karke andar', score: 3, why: 'Load bhi sambhal gaya aur user ko <b>sach</b> pata chal gaya. Aur yeh retry storm bhi rokta hai: jab number dikh raha ho toh log refresh nahi maarte.' },
            { id: 'scale', label: 'Pehle se 50x scale kar do', score: 0, why: 'Pre-scaling zaroori hai (autoscaling 10 second mein kuch nahi kar sakti) — par akela kaafi nahi. 5 lakh log 200 seats ke liye hain; capacity ka koi bhi number us ganit ko nahi badal sakta.' },
            { id: 'shed', label: 'Queue full par 503 do', score: -1, why: 'System toh bach jaayega, par 5 lakh log 503 dekh ke turant refresh karenge — aur load 3x ho jaayega. 503 ke saath kam se kam Retry-After chahiye; waiting room usse kaafi behtar hai.' },
          ],
        },
        {
          id: 'hold', label: 'Seat pakadna', icon: '🎟️',
          options: [
            { id: 'res', label: 'Redis SET NX EX — hold with TTL, phir confirm', score: 3, why: 'Atomic check-and-set (NX) se double booking mumkin hi nahi, aur TTL (EX) se abandoned checkout apne aap wapas. Lock milliseconds ka, asar 10 minute ka.' },
            { id: 'lock', label: 'DB row lock, checkout ke doraan pakde rakho', score: -3, why: '10 minute ka DB lock — woh connection, woh transaction, woh row sab block. Aur browser band ho gaya toh lock timeout tak baitha rahega.' },
            { id: 'opt', label: 'Optimistic — confirm par version check', score: -1, why: 'Double booking toh ruk jaayegi, par user <b>payment ke baad</b> haarega. Woh sabse bura experience hai, aur refund flow bhi banana padega.' },
          ],
        },
        {
          id: 'map', label: 'Seat map (5 lakh log dekh rahe hain)', icon: '👀',
          options: [
            { id: 'cache', label: 'Cache se (1-2s purana), upar se SSE se "yeh gayi" updates', score: 3, why: '5 lakh log <b>ek hi</b> seat map dekh rahe hain — woh ek key hai, aur cache uska sabse sahi jawab. Thodi staleness bilkul theek: user bik chuki seat par click karega aur turant pata chal jaayega.' },
            { id: 'live', label: 'Har request par DB se live seat status', score: -3, why: '5 lakh log × har few second = DB par lagataar hazaaron queries, aur woh <b>usi</b> DB par jispar booking chal rahi hai. Read path booking ko gira dega.' },
            { id: 'ws', label: 'Har user ke liye ek WebSocket jo poora map bheje', score: -1, why: 'Updates ke liye push sahi hai, par 5 lakh connections is ek page ke liye bahut bhaari hain — aur initial map toh phir bhi cache se hi aana chahiye.' },
          ],
        },
        {
          id: 'confirm', label: 'Payment ke baad confirm', icon: '✅',
          options: [
            { id: 'txn', label: 'Ek transaction: seat sold + booking row + hold delete; idempotency key ke saath', score: 3, why: 'Teenon ek saath ya koi nahi. Aur idempotency key isliye ki payment webhook do baar aa sakta hai — bina uske do bookings ban jaayengi.' },
            { id: 'steps', label: 'Ek-ek karke: pehle seat, phir booking, phir hold delete', score: -2, why: 'Beech mein crash = seat sold par booking row nahi (ya ulta). Yeh woh data corruption hai jo mahino baad support ticket ban ke aata hai.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Do alag problems, do alag ilaaj — aur read path ko write path se poori tarah alag rakha. Yahi is design ka dil hai.',
        ok: '👍 Buniyaad theek hai. Ek chunav user ko galti <b>der se</b> bata raha hai — aur der wali galti hamesha mehengi hoti hai.',
        bad: '🤔 Do cheezein alag karo: 5 lakh logon ka <b>load</b> (admission control), aur 200 seats ka <b>contention</b> (hold + TTL).',
      },
    },
    {
      type: 'quiz',
      title: 'Booking ke faisle',
      questions: [
        {
          q: 'Waiting room lagane ke baad bhi double booking ka khatra hai?',
          choices: [
            'Haan — admission control sirf LOAD kam karta hai. Andar aaye hue log phir bhi ek hi seat maang sakte hain; uske liye alag se atomic hold chahiye',
            'Nahi, ab sab safe hai',
            'Nahi, kyunki ek-ek karke andar aate hain',
            'Haan, par bahut kam',
          ],
          answer: 0,
          explain: 'Yeh is level ki sabse zaroori baat hai: <b>ek problem ka ilaaj doosre ko theek nahi karta</b>. Waiting room 5 lakh ko 3,000 concurrent bana deta hai — par woh 3,000 log bhi ek hi front-row seat par click kar sakte hain. Load aur contention do alag axes hain.',
        },
        {
          q: 'Hold ka TTL 10 minute hai. User 3 minute mein pay kar deta hai. Ab?',
          choices: [
            'Confirm karte waqt hold ko sold mein badlo — sab ek transaction mein, idempotency key ke saath (payment webhook do baar aa sakta hai)',
            'TTL khatam hone ka intezaar karo',
            'Hold delete karke naya booking row banao',
            'Hold ko permanent kar do',
          ],
          answer: 0,
          explain: 'Do cheezein zaroori hain. <b>Atomicity</b>: seat sold + booking row + hold delete — teenon ya koi nahi, warna beech ka crash corruption chhod jaata hai. Aur <b>idempotency</b>: payment providers webhooks dohraate hain, aur bina key ke woh doosri booking ban jaayegi.',
        },
        {
          q: 'Seat map 2 second purana hai. User ek bik chuki seat par click karta hai. Yeh problem hai?',
          choices: [
            'Nahi — use turant "yeh ja chuki, ek aur chuno" mil jaata hai. Bura tab hota jab yeh PAYMENT ke baad pata chalta',
            'Haan, seat map hamesha live hona chahiye',
            'Haan, isse users chale jaayenge',
            'Nahi, kyunki aisa kam hota hai',
          ],
          answer: 0,
          explain: 'Achha design galtiyon ko <b>khatam</b> karne ki koshish nahi karta — woh unhe <b>jaldi aur sasta</b> banata hai. 2-second stale map ka natija ek turant, saaf error hai. Live map ka natija DB par lagataar load hai — jo booking path ko hi gira sakta hai. Pehla sauda kahin behtar hai.',
        },
      ],
    },
    {
      type: 'incident',
      title: 'Incident — "Seats sold out, par hall aadha khaali tha"',
      pager: '📉 Show ke baad: 200 mein se sirf 130 log aaye. Par system ne "sold out" dikhaya tha.',
      start: 't1',
      nodes: {
        t1: {
          text: '70 seats kabhi bike hi nahi, par woh "unavailable" dikh rahi thi. Pehla shak?',
          choices: [
            { t: 'Holds jo kabhi expire nahi hue — TTL laga tha ya nahi?', good: true, next: 't2', explain: 'Sahi shak. Yeh reservation pattern ka classic failure hai: hold ban gaya, user chala gaya, aur hold kabhi wapas nahi aaya. Seat "kisi ke paas" hai par kisi ke paas nahi.' },
            { t: 'Payment gateway ne kuch transactions fail ki hongi', good: false, explain: 'Payment fail hona normal hai — par uske baad seat <b>wapas</b> aani chahiye thi. Sawaal yeh hai ki woh wapas kyun nahi aayi.' },
            { t: 'Seat map ka cache stale tha', good: false, explain: 'Cache 2 second stale ho sakta hai, ghanton nahi. Aur asli booking check cache se nahi hota — yeh unavailability kahin aur se aa rahi thi.' },
          ],
        },
        t2: {
          text: 'Holds Redis mein bane the — par code ne TTL ke bina SET kiya tha. Turant kya?',
          choices: [
            { t: 'Purane holds saaf karo (created_at se), aur code mein TTL laazmi karo', good: true, next: 't3', explain: 'Do kadam: abhi ka nuksaan roko (stuck holds release), aur wajah band karo. Aur aage ke liye: hold banane ka ek hi helper function ho jisme TTL parameter <b>required</b> ho — taaki koi ise bhool hi na sake.' },
            { t: 'Saara Redis flush kar do', good: false, explain: 'Isme woh holds bhi chale jaayenge jo abhi asli checkouts ke hain — aur woh log payment karke aayenge aur unki seat ja chuki hogi.' },
            { t: 'TTL sirf naye holds par lagao, purane rehne do', good: false, explain: 'Toh 70 seats hamesha ke liye atki rahengi. Purane holds ko bhi saaf karna hi hoga.' },
          ],
        },
        t3: {
          text: 'Theek ho gaya. Ab aisa dobara na ho, iske liye kya monitor karoge?',
          choices: [
            { t: 'Active holds ki ginti aur unki umar — aur "hold jo TTL se purana hai" par alert', good: true, next: 'end', explain: 'Yeh us tarah ka metric hai jo <b>chup-chaap failures</b> pakadta hai. Yahan kuch fail nahi hua tha — koi error nahi, koi 500 nahi. Bas inventory gayab ho rahi thi. Aur ek business metric: "available seats" vs "sold seats" ka farak.' },
            { t: 'Redis ka memory usage', good: false, explain: 'Woh badhega zaroor, par bahut dheere aur bahut baad mein — tab tak show ho chuka hoga.' },
            { t: 'Error rate', good: false, explain: 'Yahi is bug ki khoobi thi — <b>error rate bilkul saaf tha</b>. Har request 200 laut rahi thi. Isiliye technical metrics se yeh kabhi nahi dikhta.' },
          ],
        },
        end: {
          end: true,
          text: 'Stuck holds saaf, TTL laazmi, aur ab hold-age par alert hai.',
          summary: `<b>Seekh:</b> TTL is pattern ka <b>option nahi, definition</b> hai.
            Bina TTL ke "hold" ek permanent kabza ban jaata hai.
            <br><br><b>Aur teen cheezein jo yeh incident sikhata hai:</b>
            <br>• Yeh failure <b>error rate par dikhta hi nahi</b> — sab kuch 200 laut raha tha
            <br>• Isliye <b>business metric</b> chahiye: available vs sold ka farak
            <br>• Aur code mein TTL ko <b>bhoolne laayak</b> mat chhodo — ek hi helper ho
              jisme woh required parameter ho`,
        },
      },
    },
  ],
  interview: {
    title: 'Interview Round — Ticketmaster',
    instructions: 'Yeh sabse aam "contention" wala sawaal hai. 🎤',
    questions: [
      {
        q: '"Ticketmaster design karo. Ek popular concert, 5 lakh log."',
        choices: [
          'Do alag problems batata hoon: flash crowd (waiting room + pre-scale + cached seat map) aur contention (hold with TTL, atomic SET NX EX, phir transactional confirm with idempotency key)',
          'Sab requests ko queue mein daal dunga',
          'Har seat par pessimistic lock lagaunga',
          'Auto-scaling se handle ho jaayega',
        ],
        answer: 0,
        explain: 'Pehla vaakya hi sab bata deta hai: tumne <b>do alag</b> problems pehchane. Yeh design isliye mushkil hai ki log aksar sirf ek dekh paate hain — ya toh sirf scale ki baat karte hain, ya sirf locking ki. Dono ka ilaaj chahiye, aur ek doosre ko theek nahi karta.',
      },
      {
        q: '"Hold ke doraan user ka browser crash ho gaya. Kya hoga?"',
        choices: [
          'Kuch nahi karna padega — TTL expire hoga aur seat apne aap wapas aa jaayegi. Yahi TTL ka poora karan hai: hold ek VAADA hai, kabza nahi',
          'Cleanup job chalayenge',
          'User ko dobara aana padega',
          'Seat block rahegi',
        ],
        answer: 0,
        explain: 'Jawab ki khoobi yeh hai ki <b>kuch karna hi nahi padta</b> — recovery design mein hi bani hui hai. Yeh ek achhe distributed design ki nishani hai: failure ka handling ek alag cleanup path nahi, balki normal mechanism ka hissa hai. (Cleanup job wala jawab tab chahiye jab hold DB mein ho, Redis TTL mein nahi.)',
      },
    ],
  },
  success: [
    'Flash crowd aur contention ko alag-alag hal kar sakte ho',
    'Reservation flow (hold → pay → confirm) design kar sakte ho',
    'Read path (seat map) ko write path se alag rakh sakte ho',
    'Jaante ho ki TTL is pattern ki definition hai, option nahi',
  ],
  homework: `Kisi bhi booking flow mein (movie, flight, hotel) dekho ki seat select karne
    par kya hota hai. Timer dikhta hai? Woh timer hi hold ka TTL hai.
    Phir socho: agar tum tab browser band kar do, toh woh seat kab wapas aayegi —
    aur kaun use wapas laayega?`,
  cards: [
    { front: 'Ticketmaster mein do alag problems?', back: '<b>Flash crowd</b> (5 lakh log = waiting room + pre-scale + cached seat map) aur <b>contention</b> (200 seats = hold + TTL). Ek ka ilaaj doosre ko theek <b>nahi</b> karta.' },
    { front: 'Booking flow?', back: '<b>HOLD</b> (<code>SET seat NX EX 600</code> — atomic + auto-expire) → <b>PAY</b> (koi lock latka hua nahi) → <b>CONFIRM</b> (ek transaction + idempotency key).' },
    { front: 'Seat map ka read path?', back: 'Cache se (1-2s purana <b>bilkul theek</b>) + SSE se "yeh gayi" updates. 5 lakh log ek hi map dekh rahe hain — woh ek key hai. Live DB read booking path ko gira dega.' },
    { front: 'Stale seat map se galat click?', back: 'Achha error hai — turant "ye ja chuki" mil jaata hai. Bura error <b>payment ke baad</b> pata chalna hai. Achha design galtiyan <b>jaldi aur sasti</b> banata hai, khatam nahi karta.' },
    { front: 'Hold bina TTL ke?', back: 'Seats hamesha ke liye atak jaati hain — "sold out" jabki hall aadha khaali. Aur yeh <b>error rate par dikhta hi nahi</b> (sab 200 laut raha hai). Alert business metric par lagao.' },
    { front: 'Confirm par idempotency kyun?', back: 'Payment webhooks <b>dohraate</b> hain. Bina key ke woh doosri booking bana dega. Aur seat+booking+hold-delete teenon ek hi transaction mein.' },
  ],
},

/* =====================================================================
   B5 — WhatsApp / Chat
   ===================================================================== */
{
  id: 'whatsapp',
  icon: '💬',
  title: 'Build #5 — Chat',
  badge: 'Message Marmagya',
  objectives: [
    'Message pehle <b>store</b>, phir push — hamesha',
    'Ek user, kai devices — cursor se sab sync',
    'Group chat: fanout write par ya read par',
    'Delivery aur read receipts sirf cursors hain',
  ],
  lesson: [
    `<h3>📖 Requirements</h3>
     <pre>FUNCTIONAL
  • 1:1 aur group messages
  • Delivered / read receipts
  • Offline user online aake sab kuch paaye
  • Ek user ke kai devices

NON-FUNCTIONAL
  • 200 crore users, 10 crore concurrent
  • 100 crore messages/din
  • Message kabhi kho na sake
  • Delivery &lt; 1 second (online ho toh)</pre>
     <h3>🧱 Neev: store karo, phir push</h3>
     <pre>1. message aaya   →  ek monotonic id do (per conversation)
2. DURABLE store  →  DB / log mein likho          ← YAHAN commit hota hai
3. push           →  jo connected hain unhe bhejo  ← yeh ek OPTIMIZATION hai
4. reconnect      →  client apna last_seen_id bheje, gap bhar lo</pre>
     <p class="tip">🎯 Yeh ek kram chaar problems ek saath hal karta hai:
     offline users, reconnects, multi-device sync, aur "message kho gaya".
     Aur uska ulta — pehle push, phir store — wahi bug banata hai jo
     Realtime level ke incident mein tha: message <b>dikha</b> par
     <b>save nahi hua</b>.</p>
     <h3>📱 Multi-device — sirf ek aur cursor</h3>
     <p>Ek user ke 3 devices hain. Har device apna <code>last_seen_id</code> rakhta hai.
     Bas. Koi alag "device sync" system nahi chahiye — laptop 2 din baad khulega
     aur wahi gap-fill query chalayega jo har reconnect chalata hai.</p>
     <pre>conversation:abc
   message ids:  ... 8814, 8815, 8816, 8817
   phone   last_seen = 8817   (sab padh liya)
   laptop  last_seen = 8814   (3 messages baaki)
   tablet  last_seen = 8801   (16 baaki)</pre>
     <p>Aur receipts bhi wahi cheez hain: <b>delivered</b> = device ne message
     receive kar liya, <b>read</b> = user ne kholi. Dono per-user cursors hain
     jo aage badhte hain. Isiliye group mein "kitno ne padha" ek
     <code>COUNT(cursor >= message_id)</code> hai — koi alag data model nahi.</p>`,
    `<h3>👥 Group chat: fanout kahan</h3>
     <table>
       <tr><th></th><th>Write par fanout</th><th>Read par fanout</th></tr>
       <tr><td>Kya hota hai</td><td>Har member ke inbox mein copy</td><td>Ek copy; padhte waqt fetch</td></tr>
       <tr><td>Read</td><td>✅ ek query, turant</td><td>❌ conversations merge karo</td></tr>
       <tr><td>Write</td><td>❌ 1000 members = 1000 writes</td><td>✅ ek write</td></tr>
       <tr><td>Storage</td><td>❌ N copies</td><td>✅ ek copy</td></tr>
     </table>
     <p>Chat mein zyadatar systems <b>read par fanout</b> chunte hain, aur wajah
     social feeds se ulti hai: <b>group chat mein read:write ratio kam hota hai</b>.
     Ek message 20 log padhte hain, 5 crore nahi. Isliye 20 inbox writes karna
     bekaar hai jab ek conversation se padha ja sakta hai.</p>
     <p>Par ek cheez write par fanout karni hi padti hai: <b>notification</b>
     ("tumhare paas naya message hai") — kyunki woh push service tak jaana hai.
     Woh ek chhota event hai, poora message nahi.</p>
     <h3>🔌 Connection layer</h3>
     <pre>10 crore concurrent ÷ 50,000 per node = 2,000 gateway nodes
   → sirf sockets rakhte hain, koi business logic nahi
   → beech mein pub/sub (kaun kis gateway par hai)
   → L4 load balancer (persistent connections)</pre>
     <p class="tip">🎯 Aur inka deployment sochna design ka hissa hai:
     2,000 nodes ek saath restart karoge toh 10 crore reconnects ek saath aayenge.
     Rolling restart + client par backoff+jitter — yeh ops ka detail nahi,
     <b>design ki shart</b> hai.</p>
     <h3>🔐 End-to-end encryption ka asar</h3>
     <p>Agar E2E hai toh server message padh <b>nahi</b> sakta. Iska matlab:
     server-side search khatam, spam filtering khatam, aur multi-device ke liye
     har device ka apna key exchange chahiye. Yeh ek <b>product</b> faisla hai
     jiske engineering ke daam bahut bade hain — aur isse pehle poochhna chahiye,
     baad mein nahi.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — Chat',
      instructions: '10 crore concurrent, 100 crore messages/din, message kho na sake.',
      brief: `Ek chat app. 1:1 aur group (1000 members tak). Offline users
        wapas aake sab kuch paayein. Ek user ke kai devices. Receipts chahiye.`,
      requirements: ['10 crore concurrent', '100 crore msg/din', 'Message kho na sake', 'Multi-device sync'],
      pass: 11,
      slots: [
        {
          id: 'order', label: 'Message aane par kram', icon: '📥',
          options: [
            { id: 'store', label: 'Pehle durable store (id ke saath), phir push', score: 3, why: 'Push ek <b>optimization</b> hai, source of truth nahi. Yeh kram offline users, reconnects, multi-device aur "message kho gaya" — chaaron ek saath hal karta hai.' },
            { id: 'push', label: 'Pehle push (tez lagega), phir async store', score: -3, why: 'Store fail hua toh message <b>dikha</b> par save nahi hua — aur refresh par gayab. Yeh exact bug Realtime level ke incident mein tha.' },
            { id: 'both', label: 'Dono ek saath (parallel)', score: -1, why: 'Tez lagta hai par ab do natije ho sakte hain: push chala gaya aur store fail. Kram hi guarantee deta hai — parallel usse tod deta hai.' },
          ],
        },
        {
          id: 'group', label: 'Group message (1000 members)', icon: '👥',
          options: [
            { id: 'read', label: 'Ek copy conversation mein; padhte waqt fetch', score: 3, why: 'Chat mein read:write ratio <b>kam</b> hai — ek message 20 log padhte hain. 1000 inbox writes karna bekaar hai. (Notification ka chhota event alag se fanout hota hai.)' },
            { id: 'write', label: 'Har member ke inbox mein copy', score: -1, why: 'Feed ke liye sahi hai (jahan read:write 1000:1 hai), chat ke liye nahi. 100 crore messages/din × average group size = storage aur write amplification dono phat jaate hain.' },
          ],
        },
        {
          id: 'sync', label: 'Multi-device sync', icon: '📱',
          options: [
            { id: 'cursor', label: 'Har device ka apna last_seen_id; reconnect par gap fetch', score: 3, why: 'Koi alag sync system chahiye hi nahi. Wahi mechanism jo offline user ke liye tha, multi-device ko bhi cover karta hai — aur receipts bhi wahi cursors hain.' },
            { id: 'perdevice', label: 'Har device ke liye alag message copy', score: -2, why: '3 devices = 3x storage aur 3x writes, aur ab unhe aapas mein consistent bhi rakhna hai. Cursor ek number hai; copies ek poora system hain.' },
          ],
        },
        {
          id: 'conn', label: 'Connection layer', icon: '🔌',
          options: [
            { id: 'gw', label: 'Alag gateway nodes (sirf sockets) + pub/sub + L4 LB', score: 2, why: 'Connections ek alag capacity dimension hain — 10 crore ÷ 50k = 2,000 nodes, chahe koi kuch bhej hi na raha ho. Logic peechhe, aur pub/sub isliye ki do users do alag gateways par hote hain.' },
            { id: 'app', label: 'App servers hi WebSocket rakhein', score: -1, why: 'Ab tum connections aur business logic ko ek saath scale kar rahe ho — jabki unki zaroorat bilkul alag-alag badhti hai. Aur har app deploy 10 crore reconnects trigger karega.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Store-then-push, cursors, aur alag connection layer. Teen faisle jo baaki poora design apne aap tay kar dete hain.',
        ok: '👍 Zyadatar sahi. Ek chunav ek naya system bana raha hai jahan ek number (cursor) kaafi tha.',
        bad: '🤔 Ek line se shuru karo: <b>pehle store, phir push</b>. Uske baad reconnect, multi-device aur receipts sab ek hi mechanism se nikal aate hain.',
      },
    },
    {
      type: 'quiz',
      title: 'Chat ke faisle',
      questions: [
        {
          q: 'Chat mein read par fanout kyun, jabki Twitter feed mein write par?',
          choices: [
            'Read:write ratio ulta hai. Feed: ek tweet 5 crore log padhte hain (write par kaam karo). Chat: ek message 20 log padhte hain (write sasta rakho)',
            'Chat mein messages chhote hote hain',
            'Chat realtime hai',
            'Feed mein ordering matter karti hai',
          ],
          answer: 0,
          explain: 'Yeh dono design ek hi sawaal se nikalte hain: <b>kaam kahan karna sasta hai?</b> Jab ek write ko crore log padhenge, tab write par mehnat karna sahi hai. Jab 20 log padhenge, tab woh mehnat bekaar hai. Isliye "fanout on write" koi universal best practice nahi — woh ek ratio ka jawab hai.',
        },
        {
          q: 'Read receipts kaise store karoge?',
          choices: [
            'Per-user cursor — last_read_message_id. "Kitno ne padha" = COUNT(cursor >= message_id). Har message par per-user row nahi',
            'Har message par ek read_by array',
            'Har (message, user) jodi ke liye ek row',
            'Redis set mein',
          ],
          answer: 0,
          explain: 'Per-message-per-user row ka matlab hai 100 crore messages × group size rows — arbon rows sirf receipts ke liye. Cursor ek hi number hai per user per conversation, aur woh <b>monotonic</b> hai (sirf aage badhta hai) — isliye update bhi sasta hai aur race bhi nahi.',
        },
        {
          q: '2,000 gateway nodes ka deploy karna hai. Kya dhyaan rakhoge?',
          choices: [
            'Rolling restart chhote batches mein, aur client par backoff + full jitter — warna 10 crore reconnects ek saath aayenge aur bache hue nodes gir jaayenge',
            'Blue-green deployment',
            'Raat ko deploy karo',
            'Kuch khaas nahi',
          ],
          answer: 0,
          explain: 'Yeh un cheezon mein se hai jo design mein likhni padti hain, ops par chhodi nahi ja saktin. Ek gateway node par 50,000 connections hain; ek batch restart = laakhon reconnects, aur har reconnect mein auth + subscriptions + backlog fetch hai. Bina jitter ke woh ek self-inflicted DDoS hai.',
        },
      ],
    },
    {
      type: 'order',
      title: 'Ek message ka safar',
      instructions: 'Sahi kram mein rakho.',
      steps: [
        { text: 'Client message bhejta hai (apne client_message_id ke saath)', explain: 'Client-generated id se retry safe ho jaata hai: network timeout par client dobara bhejega, aur server usi id se duplicate pehchan lega.' },
        { text: 'Server conversation ke liye ek monotonic id deta hai', explain: 'Yeh id hi ordering aur cursors dono ki neev hai. Per-conversation sequence rakhna global ordering se kahin sasta hai.' },
        { text: 'Message durable store mein likha jaata hai', explain: '<b>Yahin commit hota hai.</b> Iske baad message "hai" — chahe push ho ya na ho. Client ko ack yahan se milta hai, push se nahi.' },
        { text: 'Jo members abhi connected hain unhe push', explain: 'Yeh ek optimization hai. Fail ho jaaye toh koi baat nahi — reconnect par gap bhar jaayega.' },
        { text: 'Jo offline hain unke liye push notification', explain: 'Alag channel (APNs/FCM), aur usme poora message nahi — sirf ek signal. E2E encryption ho toh server message padh hi nahi sakta.' },
        { text: 'Device reconnect par last_seen_id ke baad ka fetch karta hai', explain: 'Wahi ek mechanism offline users, multi-device sync aur kho gaye pushes — teenon ko cover karta hai. Aur limit lagana mat bhoolna.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Chat',
    instructions: 'Offline user ka sawaal hi is round ka dil hai. 🎤',
    questions: [
      {
        q: '"WhatsApp design karo. Message delivery kaise?"',
        choices: [
          'Pehle durable store (per-conversation monotonic id), phir connected recipients ko push. Reconnect par client last_seen_id bhej ke gap bhare. Push ek optimization hai, source of truth nahi',
          'WebSocket se sabko broadcast',
          'Har user ke liye ek queue',
          'Push notifications',
        ],
        answer: 0,
        explain: 'Yeh jawab ek saath chaar cheezein hal karta hai: offline users, reconnects, multi-device sync, aur "message kho gaya". Aur woh aakhri clause — "push ek optimization hai" — hi dikhata hai ki tumne guarantee kahan rakhi hai.',
      },
      {
        q: '"Group mein 1000 members hain. Ek message aaya. Kitne writes?"',
        choices: [
          'Ek — message conversation mein ek baar likha jaata hai. Members padhte waqt fetch karte hain. (Notification ka chhota event alag se fanout hota hai)',
          '1000 — har member ke inbox mein',
          '1000 + 1',
          'Depends on online users',
        ],
        answer: 0,
        explain: 'Yeh sawaal seedha yeh test karta hai ki tumne fanout ka faisla <b>ratio</b> se liya ya aadat se. Chat mein ek message 20 log padhte hain — 1000 inbox writes ka koi faayda nahi. (Aur agar interviewer poochhe "par read slow nahi hoga?" — jawab hai ki conversation par index se woh ek range scan hai.)',
      },
    ],
  },
  success: [
    'Store-then-push ka kram aur uska karan bata sakte ho',
    'Cursors se offline, multi-device aur receipts teenon hal kar sakte ho',
    'Group fanout ka faisla read:write ratio se le sakte ho',
    'Connection layer ko alag capacity dimension maante ho',
  ],
  homework: `Apne phone par ek chat app kholo jo 2 din se band tha.
    Dekho ki purane messages kaise aate hain — sab ek saath, ya paginated?
    Aur airplane mode mein message bhejo: woh "sending" par kitni der rukta hai,
    aur online hote hi kya hota hai? Wahi client-side queue + retry hai.`,
  cards: [
    { front: 'Chat ka neev wala niyam?', back: '<b>Pehle durable store (id ke saath), phir push.</b> Push ek optimization hai, source of truth nahi. Yeh kram offline + reconnect + multi-device + "message kho gaya" — chaaron hal karta hai.' },
    { front: 'Multi-device sync?', back: 'Har device ka apna <b>last_seen_id</b>. Bas. Koi alag sync system nahi — wahi gap-fill query jo har reconnect chalata hai.' },
    { front: 'Read receipts?', back: 'Per-user <b>cursor</b> (last_read_message_id), per-message row nahi. "Kitno ne padha" = <code>COUNT(cursor &gt;= message_id)</code>.' },
    { front: 'Group fanout — read ya write?', back: '<b>Read par</b> — chat mein ek message 20 log padhte hain (ratio kam). Feed mein <b>write par</b> — ek tweet crore log padhte hain. Ratio hi faisla hai.' },
    { front: 'Connection layer?', back: '10 crore ÷ 50k = <b>2,000 gateway nodes</b> sirf sockets ke liye, chahe koi kuch bhej na raha ho. Logic peechhe, beech mein pub/sub, aage L4 LB.' },
    { front: '2,000 nodes ka deploy?', back: '<b>Rolling restart + client backoff/jitter.</b> Warna 10 crore reconnects ek saath = self-inflicted DDoS. Yeh design ki shart hai, ops ka detail nahi.' },
  ],
},

/* =====================================================================
   B6 — YouTube / Video platform
   ===================================================================== */
{
  id: 'youtube',
  icon: '🎬',
  title: 'Build #6 — Video Platform',
  badge: 'Media Maharathi',
  objectives: [
    'Upload → transcode → deliver: teen alag systems',
    'Adaptive bitrate — ek video, kai versions',
    'CDN par 99% traffic, origin par 1%',
    'View count: exact ginna zaroori nahi',
  ],
  lesson: [
    `<h3>📖 Requirements aur numbers</h3>
     <pre>FUNCTIONAL
  • Video upload (tak 5 GB)
  • Kai resolutions mein dekho, network ke hisaab se badalta rahe
  • Search, recommendations, view counts

NON-FUNCTIONAL
  • 500 ghante video upload / minute
  • 100 crore ghante watch / din
  • Playback shuru &lt; 2 second
  • Global — har jagah</pre>
     <pre>Egress ka hisaab (yahi asli bill hai):
  100 crore ghante/din × ~1 GB/ghanta  =  10 crore GB/din
                                       ≈  100 PB/din
                                       ≈  ~10 Tbps average

Origin se yeh serve karna namumkin hai. Isliye poora design
CDN ke around banta hai — aur CDN hit rate hi sabse zaroori metric hai.</pre>
     <h3>🏗️ Teen alag systems</h3>
     <pre>1. UPLOAD      presigned URL → S3 (multipart, resumable)
               app server 40ms kaam karta hai, 12 minute nahi

2. TRANSCODE   S3 event → queue → worker fleet
               ek video → 240p/360p/480p/720p/1080p/4K
               + har ek ke 2-10 second ke CHUNKS + manifest
               → status: uploaded → processing → ready

3. DELIVER     CDN → (miss par) origin S3
               player manifest padh ke chunks maangta hai</pre>
     <p class="tip">🎯 Teenon <b>alag</b> scale karte hain aur alag failure modes
     rakhte hain. Upload bandwidth-bound hai, transcode CPU-bound hai, delivery
     egress-bound hai. Ek hi service mein teenon rakhne ka matlab hai ki
     ek viral video ki delivery uploads ko rok degi.</p>`,
    `<h3>📶 Adaptive bitrate — asli trick</h3>
     <p>Video ek file nahi hai. Woh <b>chunks</b> ka set hai — har resolution ke
     2-10 second ke tukde, aur ek <b>manifest</b> (HLS/DASH) jo unhe list karta hai.</p>
     <pre>manifest.m3u8
   240p  → chunk0.ts chunk1.ts chunk2.ts ...
   480p  → chunk0.ts chunk1.ts chunk2.ts ...
   1080p → chunk0.ts chunk1.ts chunk2.ts ...

Player har chunk ke baad apni speed naapta hai aur AGLA chunk
alag quality se maang sakta hai — beech mein, bina ruke.</pre>
     <p>Isiliye video buffer hone ki jagah <b>dhundhla</b> ho jaata hai.
     Aur isiliye playback 2 second mein shuru ho jaata hai: player sabse
     chhoti quality ka pehla chunk leta hai, dikhana shuru karta hai,
     aur phir upar chadhta hai.</p>
     <p class="tip">🎯 Chunking ka ek aur bada faayda: <b>seek</b>.
     Video ke beech mein click karo — player sirf woh chunk maangta hai,
     poori file nahi. Aur CDN ke liye har chunk ek alag cacheable object hai,
     isliye popular video ka <b>shuruaati</b> hissa hamesha cached rehta hai
     (jahan sabse zyada log dekhte hain).</p>
     <h3>🌍 CDN — jahan 99% traffic hai</h3>
     <table>
       <tr><td>Popular video ka chunk</td><td>CDN edge se — origin chhua hi nahi</td></tr>
       <tr><td>Purana/dulrbh video</td><td>CDN miss → origin S3 → cache mein</td></tr>
       <tr><td>Manifest</td><td>Chhota, chhoti TTL (quality options badal sakte hain)</td></tr>
     </table>
     <p>Video traffic bahut <b>skewed</b> hai: kuch hazaar videos poore traffic ka
     bada hissa khaate hain. Isliye CDN hit rate 95%+ hota hai — aur wahi ek number
     tumhara bandwidth bill tay karta hai. 95% se 90% girna matlab origin traffic
     <b>dugna</b>.</p>
     <h3>👁️ View count</h3>
     <p>100 crore views/din. Har view par ek DB update? Woh 12,000 writes/sec hai
     ek hi row par — aur woh row hot hai.</p>
     <pre>Sahi raasta:  view event → stream → windowed aggregate → periodic update
             UI par thoda purana count bilkul theek hai
             ("1.2M views" mein exactness ka koi mol nahi)</pre>
     <p>Yeh wahi sawaal hai: <b>galat jawab kitna mehenga hai?</b>
     View count par kuch nahi. Monetization ke liye jo count chahiye woh alag,
     dheema aur exact pipeline se aata hai — bilkul ad clicks jaisa.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — Video platform',
      instructions: '500 ghante/minute upload, 100 crore watch-hours/din.',
      brief: `Ek video platform. Users 5 GB tak videos daalte hain, duniya bhar mein
        kai resolutions mein dekhe jaate hain, aur playback 2 second mein shuru hona chahiye.`,
      requirements: ['5 GB uploads', 'Adaptive quality', 'Playback &lt; 2s', 'Global delivery'],
      pass: 12,
      slots: [
        {
          id: 'upload', label: 'Upload', icon: '📤',
          options: [
            { id: 'presigned', label: 'Presigned multipart URL — client seedha S3 par', score: 3, why: 'Bytes app server se guzarte hi nahi, aur multipart se 5 GB upload resumable ho jaata hai (mobile par yeh zaroori hai). App 40ms kaam karta hai.' },
            { id: 'proxy', label: 'App server ke through', score: -3, why: 'Ek 5 GB upload dheeme network par 20 minute ek concurrency slot pakadta hai. Kuch upload ek saath = poori API down.' },
          ],
        },
        {
          id: 'transcode', label: 'Transcoding', icon: '⚙️',
          options: [
            { id: 'queue', label: 'S3 event → queue → worker fleet, chunks + manifest, status API', score: 3, why: 'Minute-ghante ka kaam, isliye async. Queue burst sambhaalti hai, workers alag scale karte hain (CPU-bound), aur status API user ko sach dikhata hai.' },
            { id: 'sync', label: 'Upload complete hote hi wahin transcode', score: -3, why: 'Ek 4K video ka transcode ghanta le sakta hai. Request cycle mein woh mumkin hi nahi, aur retry par poora kaam dobara.' },
            { id: 'lazy', label: 'Jab koi dekhe tab transcode karo (lazy)', score: -1, why: 'Chalak idea hai aur lambe-tail videos ke liye kuch platforms yahi karte hain — par pehle viewer ko minute bhar wait karna padega. Aam raaste ke liye galat; sirf ek optimization ho sakta hai.' },
          ],
        },
        {
          id: 'deliver', label: 'Playback', icon: '🌍',
          options: [
            { id: 'cdn', label: 'CDN se chunks + manifest, origin par miss', score: 3, why: '10 Tbps origin se serve karna namumkin hai. Aur video traffic bahut skewed hai, isliye CDN hit rate 95%+ aata hai — wahi ek number poora bandwidth bill tay karta hai.' },
            { id: 'origin', label: 'Seedha S3 se', score: -2, why: 'S3 durable hai par woh CDN nahi — har viewer ko us region tak jaana padega (door ke logon ke liye buffering), aur egress bill kai guna.' },
            { id: 'app2', label: 'App server ke through stream', score: -3, why: 'Ek 2-ghante ka video ek slot ko 2 ghante ke liye pakad lega. Wahi upload wali galti, ab read side par.' },
          ],
        },
        {
          id: 'views', label: 'View count', icon: '👁️',
          options: [
            { id: 'stream', label: 'View event → stream → aggregate → periodic update', score: 3, why: '100 crore views/din = 12,000 writes/sec ek hot row par. Aur "1.2M views" mein exactness ka koi mol hi nahi — yeh approximate ke liye perfect jagah hai.' },
            { id: 'db', label: 'Har view par DB mein counter++', score: -3, why: 'Ek hi row par 12,000 writes/sec — lock contention, replication lag, aur woh row poore DB ko dheema kar degi.' },
            { id: 'redis', label: 'Redis INCR, periodically DB mein flush', score: 1, why: 'Bahut behtar hai aur chhote scale par bilkul sahi. Par Redis ke girne par kuch counts ja sakte hain, aur monetization ke liye chahiye wala exact count phir bhi alag pipeline maangta hai.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Teen alag systems, teen alag scaling axes — aur bytes kabhi app server se nahi guzre. Yahi is design ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek jagah bytes ya writes wahan ja rahe hain jahan unhe nahi jaana chahiye.',
        bad: '🤔 Egress ka hisaab dobara padho: ~10 Tbps. Us number ke baad har chunav apne aap saaf ho jaata hai.',
      },
    },
    {
      type: 'bins',
      title: 'Kaunsa hissa kis cheez se bandha hai',
      instructions: 'Har component ka asli bottleneck.',
      bins: [
        { id: 'net', label: '🌐 Bandwidth-bound' },
        { id: 'cpu', label: '🔥 CPU-bound' },
        { id: 'store', label: '💾 Storage-bound' },
      ],
      items: [
        { text: 'Video delivery (playback)', bin: 'net', explain: '~10 Tbps. Isiliye CDN hi poora design hai, aur hit rate hi bill hai.' },
        { text: 'Transcoding fleet', bin: 'cpu', explain: 'Har video ke 5-6 versions banane hain. Yeh pure compute hai — aur isiliye woh alag fleet honi chahiye jo spot/preemptible instances par chal sake.' },
        { text: 'Original videos + saare transcoded versions', bin: 'store', explain: 'Har video ki 6 copies. Isliye lifecycle rules laazmi hain — purane, kam-dekhe jaane wale videos ki high-res copies archive ya delete ho sakti hain.' },
        { text: 'Upload ingest', bin: 'net', explain: 'Bytes andar aa rahe hain. Presigned URL se yeh bojh S3 par chala jaata hai, tumhare servers par nahi.' },
        { text: 'Thumbnail generation', bin: 'cpu', explain: 'Transcoding ka chhota bhai — wahi worker fleet, wahi queue.' },
        { text: 'Video metadata (title, owner, views)', bin: 'store', explain: 'Yeh chhota structured data hai — ek normal DB ka kaam. Poore system mein yeh sabse sasta hissa hai, aur log yahin sabse zyada waqt lagate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Video ke faisle',
      questions: [
        {
          q: 'Playback 2 second mein kaise shuru hota hai jabki video 2 GB ki hai?',
          choices: [
            'Video chunks (2-10s) mein tuti hai. Player sabse chhoti quality ka pehla chunk leta hai, dikhana shuru karta hai, phir apni speed naap ke quality badhata hai',
            'Video compress hoti hai',
            'CDN se aata hai isliye tez hai',
            'Preloading hoti hai',
          ],
          answer: 0,
          explain: 'CDN madad karta hai par asli jawab <b>chunking + adaptive bitrate</b> hai. Poori file kabhi download hoti hi nahi. Aur isi wajah se seek bhi turant hota hai (sirf woh chunk chahiye) aur network kharab hone par video ruk-ruk ke chalne ki jagah <b>dhundhla</b> ho jaata hai.',
        },
        {
          q: 'CDN hit rate 95% se 90% ho gaya. Kya asar?',
          choices: [
            'Origin traffic DUGNA ho gaya (5% se 10%) — aur woh 10 Tbps ka 10% hai. Hit rate is system ka sabse zaroori ek number hai',
            '5% zyada latency',
            'Thoda zyada cost',
            'Kuch khaas nahi',
          ],
          answer: 0,
          explain: 'Yeh un hisaabon mein se hai jo intuition ko dhokha deta hai: hit rate mein 5 <b>point</b> ka farak origin load ko <b>dugna</b> kar deta hai. Isiliye CDN hit rate ek first-class SLI honi chahiye, aur uska girna (naya content, cache purge, TTL change) ek alert hona chahiye.',
        },
        {
          q: '100 crore views/din. Count kaise rakhoge?',
          choices: [
            'View events stream mein → windowed aggregate → periodic update. UI par thoda purana count bilkul theek hai; monetization ke liye alag exact pipeline',
            'Har view par DB counter++',
            'Redis INCR, har view par',
            'Har ghante COUNT(*) query',
          ],
          answer: 0,
          explain: '12,000 writes/sec ek hi row par lock contention aur replication lag dono banata hai. Aur "1.2M views" mein exactness ka koi mol hi nahi — yeh <b>approximate ke liye perfect</b> jagah hai. (Redis INCR chhote scale par sahi hai, par is scale par bhi woh aggregate pipeline hi ban jaata hai.)',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Video platform',
    instructions: 'Yahan numbers pehle bolna hi jeet hai. 🎤',
    questions: [
      {
        q: '"YouTube design karo." Pehla number kaunsa nikaaloge?',
        choices: [
          'Egress — 100 crore watch-hours/din × ~1 GB/ghanta ≈ 100 PB/din ≈ 10 Tbps. Yeh ek number bata deta hai ki poora design CDN ke around hai, aur CDN hit rate hi sabse zaroori metric hai',
          'Storage — kitne videos hain',
          'Upload rate',
          'Database size',
        ],
        answer: 0,
        explain: 'Ek estimate ne poore design ki disha tay kar di. Storage bada hai par woh <b>sasta aur aasan</b> hai (S3 par daal do). Egress bada <b>aur</b> mushkil hai — woh tumhara bill bhi hai aur tumhari architecture bhi. Achha estimate wahi hai jo agla kadam bata de.',
      },
      {
        q: '"Ek video achanak viral ho gaya. Kya hoga?"',
        choices: [
          'CDN uska bada hissa khud sambhaal lega (woh isi ke liye hai) — par pehle kuch minute mein har edge par miss hoga, aur woh saare misses origin par ek saath aayenge. Isliye origin par request coalescing/shielding chahiye',
          'CDN sab sambhaal lega',
          'Origin gir jaayega',
          'Aur servers add karenge',
        ],
        answer: 0,
        explain: 'Yeh <b>cache stampede</b> hai, ab CDN ke paimane par — aur uska naam "origin shield" hai: edges pehle ek middle layer se poochhte hain, jo ek hi origin request banati hai. Yeh bilkul wahi single-flight/coalescing hai jo tumne cache level mein dekha tha, sirf ek layer upar.',
      },
    ],
  },
  success: [
    'Upload/transcode/deliver ko teen alag systems ki tarah design kar sakte ho',
    'Adaptive bitrate aur chunking samjha sakte ho',
    'CDN hit rate ka bandwidth par asar bata sakte ho',
    'View count ko approximate rakhne ka karan bata sakte ho',
  ],
  homework: `Koi video kholo aur browser ke Network tab mein dekho: ek badi file aa rahi hai
    ya bahut saari chhoti (chunks)? Manifest (.m3u8 ya .mpd) dhoondo aur usme
    resolutions ki list dekho. Phir video ki quality manually badlo aur dekho ki
    agle chunks kis quality ke aate hain.`,
  cards: [
    { front: 'Video platform ka pehla number?', back: '<b>Egress.</b> 100 crore watch-hours/din ≈ 100 PB/din ≈ <b>10 Tbps</b>. Yeh ek number bata deta hai ki poora design CDN ke around hai.' },
    { front: 'Teen alag systems?', back: '<b>Upload</b> (bandwidth-bound, presigned URL) · <b>Transcode</b> (CPU-bound, queue + worker fleet) · <b>Deliver</b> (egress-bound, CDN). Teenon alag scale karte hain.' },
    { front: 'Playback 2 second mein kaise?', back: '<b>Chunks + adaptive bitrate.</b> Player sabse chhoti quality ka pehla chunk leta hai, dikhana shuru karta hai, phir speed naap ke chadhta hai. Poori file kabhi download nahi hoti.' },
    { front: 'CDN hit rate 95% → 90%?', back: 'Origin traffic <b>dugna</b> (5% → 10%). Hit rate is system ka sabse zaroori single number hai — use SLI banao aur uske girne par alert.' },
    { front: 'View count (100 crore/din)?', back: 'Stream → windowed aggregate → periodic update. Har view par DB counter = 12,000 writes/sec <b>ek hot row</b> par. "1.2M views" mein exactness ka koi mol nahi.' },
    { front: 'Video viral ho gaya?', back: 'CDN sambhaalega — par pehle minute mein har edge par miss, aur woh sab origin par ek saath. Ilaaj: <b>origin shield</b> = CDN ke paimane par request coalescing.' },
  ],
},

/* =====================================================================
   B7 — FINAL BOSS: Uber
   ===================================================================== */
{
  id: 'boss-uber',
  icon: '👑',
  title: 'FINAL BOSS — Ride Hailing',
  badge: 'Architect Mahaguru',
  objectives: [
    'Ek problem jisme <b>saat</b> shapes hain',
    'Matching — geo + contention ek saath',
    'Har hisse ka failure mode pehle se naam lo',
    'Poore app ka nichod, ek design mein',
  ],
  lesson: [
    `<h3>👑 Aakhri imtihaan</h3>
     <pre>FUNCTIONAL
  • Nearby drivers dikhao
  • Ride maango → driver match karo → dono ko batao
  • Live tracking (rider driver ko dekhe)
  • Ride khatam → fare → payment → receipt

NON-FUNCTIONAL
  • 10 lakh active drivers, har 4 second location bhejte hain
  • Peak (8 PM, baarish): ek shehar mein 50,000 ride requests/min
  • Ek driver do riders ko kabhi na mile
  • Match &lt; 10 second</pre>
     <h3>🧩 Shapes ginno — pehle</h3>
     <table>
       <tr><th>Hissa</th><th>Shape</th><th>Failure mode (pehle se pata hai)</th></tr>
       <tr><td>Driver locations</td><td>Write-heavy, ephemeral</td><td>15 lakh writes/min DB par = storm</td></tr>
       <tr><td>Nearby search</td><td>Geo</td><td>Hot cell (airport, 8 PM)</td></tr>
       <tr><td>Matching</td><td>Contention</td><td>Ek driver do riders ko</td></tr>
       <tr><td>Ride lifecycle</td><td>Workflow</td><td>Beech mein fail → compensation</td></tr>
       <tr><td>Live tracking</td><td>Realtime fanout</td><td>Reconnect storm</td></tr>
       <tr><td>Fare + payment</td><td>Ledger</td><td>Double charge, reconciliation</td></tr>
       <tr><td>Surge pricing</td><td>Stream / windowed</td><td>Late events, hot partition</td></tr>
     </table>
     <p><b>Saat shapes — aur tumne inme se ek bhi cheez nayi nahi seekhi.</b>
     Har failure mode ka naam tumhe pata hai, aur har ek ka ilaaj bhi.
     Yahi is poore app ka maksad tha.</p>`,
    `<h3>📍 Location pipeline — durable nahi, current</h3>
     <pre>10 lakh drivers × 15 ping/min = 1.5 crore writes/min

Galat:  har ping DB mein insert
Sahi:   in-memory geo store (Redis GEO / cell → drivers set)
        + async stream mein bhi bhejo (analytics, trip history ke liye)</pre>
     <p>Driver ka 20 second purana location <b>bekaar</b> hai. Yeh
     <b>current state</b> hai, history nahi — aur current state ke liye
     durable store galat aujaar hai.</p>
     <h3>🤝 Matching — geo aur contention ek saath</h3>
     <pre>1. rider ki cell + 8 padosi cells se candidates lo   (geo)
2. asli doori + ETA se rank karo                     (baarik chhanna)
3. top driver par HOLD lagao (TTL 15s)               (contention!)
4. driver ko offer bhejo
5a. accept  → ride banao, hold ko assignment mein badlo
5b. reject / 15s timeout → hold chhodo, agle driver par jao</pre>
     <p class="tip">🎯 Kadam 3 hi sabse zaroori hai, aur sabse zyada chhoota hai.
     Bina hold ke ek hi driver 5 riders ko ek saath offer ho jaayega —
     aur jo pehle accept karega uske alawa sabko "driver mil gaya... nahi mila"
     dikhega. Yeh bilkul wahi <b>reservation pattern</b> hai jo Ticketmaster mein tha,
     sirf yahan hold 15 second ka hai, 10 minute ka nahi.</p>
     <h3>🔥 Hot cell — 8 PM, baarish</h3>
     <p>Aadha shehar ek ilaake se ride maang raha hai. Us cell ka data ek hi
     node/partition par hai. Ilaaj wahi teen: <b>cell ko chhoti precision par
     todo</b>, <b>us cell ka data replicate karo</b>, aur adaptive grid rakho
     taaki ghani jagah ke cells chhote hon.</p>
     <h3>🔄 Ride lifecycle — workflow</h3>
     <pre>requested → matched → driver_arriving → in_progress → completed → paid
                  ↓            ↓                ↓
              cancelled    cancelled       cancelled (fare ke saath)</pre>
     <p>Har transition ka apna compensating action hai. Driver ne accept karke
     cancel kar diya? Rider ko wapas queue mein daalo aur driver ka rating record
     karo. Payment fail? Ride complete hai (service di ja chuki hai) — usse
     <b>reverse</b> nahi kar sakte; uske liye alag recovery flow chahiye.
     Yahi saga aur "compensating transaction" ka asli matlab hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'BOSS Mission — 8 PM, baarish',
      goal: `Saat shapes, ek system. <b>Har cheez maapo, phir theek karo</b> —
             aur dhyaan do ki har ilaaj tumhe pehle se aata hai.`,
      sys: {
        name: 'dispatch',
        slo: { p99Ms: 300, availability: 99.95 },
        db: {
          bufferPoolMB: 2048,
          tables: {
            drivers: {
              rows: 1000000, rowBytes: 160, pk: 'id',
              cols: ['id', 'driver_id', 'geohash', 'city', 'status', 'updated_at'],
              indexes: [{ name: 'drivers_pkey', cols: ['id'], unique: true }],
            },
          },
        },
        pool: { size: 50, acquireTimeoutMs: 10000 },
        app: { instances: 8, cpuMsPerReq: 5 },
        api: { pagination: 'cursor', countTotal: false, defaultSort: 'updated_at', primaryTable: 'drivers' },
        deps: { pricing: { p50: 8, p99: 20, errorRate: 0 } },
        booking: { mode: 'none', seats: {}, holds: {} },
      },
      tasks: T_UBER,
      success: allOf(T_UBER),
      successText: `👑 <b>Architect Mahaguru.</b><br><br>
        Saat shapes, saat failure modes — aur tumne ek bhi <b>naya</b> nahi seekha.
        Geohash prefix wahi B-tree prefix tha. Hot cell wahi hot key thi.
        Driver matching wahi reservation pattern tha. Pool wahi Little's Law thi.<br><br>
        <b>Yahi is poore app ka nichod hai:</b> naye systems naye nahi hote —
        woh un hi shapes ke naye libaas hote hain. Pattern ka naam lo,
        uska known failure dhoondo, aur phir <b>maap ke</b> theek karo.<br><br>
        Boxes koi bhi bana leta hai. Tradeoff bolna, bottleneck maapna,
        aur "iski keemat yeh hai" keh paana — wahi architect banata hai. 🏛️`,
      hints: [
        'Pehle numbers: estimate --users 1000000 --rps 25000 --bytes 512',
        'Bina index ke nearby query: GET /api/v1/drivers?geohash=te7ud9&limit=20',
        'Geo index banao: CREATE INDEX ix_geo ON drivers(geohash, updated_at)',
        'Ab wahi query: GET /api/v1/drivers?geohash=te7ud9&limit=20',
        'Locations kis node par hain, dekho: ring show',
        'Distribution theek karo: ring set vnodes 150',
        '8 PM, baarish — ek cell par saara load: cache hotkey --key cell:te7ud9 --rps 60000',
        'Us cell ko todo: cache hotkey --key cell:te7ud9 --rps 60000 --replicas 16',
        'Ab matching ka contention — bina protection ke: book seat driver:8891 --concurrent 2',
        'Reset karo: book reset',
        'Reservation mode: sim set booking.mode reservation',
        'Driver par 15s ka hold: book hold driver:8891 --ttl 15',
        'Doosra rider ab ruke: book seat driver:8891 --concurrent 1',
        "Ab peak load: load --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'",
        'Pricing service ko baandho: sim add timeout pricing 200',
        'Aur fallback: sim add fallback pricing "last known surge multiplier"',
        'Waiting room: sim add admission --max-concurrent 8000 --queue 5',
        'Ab jaake pool badhao: sim scale pool 200',
        "Peak dobara: load --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'",
        'Aur budget: slo --availability 99.95',
      ],
    },
    {
      type: 'design',
      title: 'BOSS Canvas — Poora ride hailing',
      instructions: 'Aakhri canvas. Har slot par sahi chunav — aur har why padho.',
      brief: `<b>10 lakh active drivers, 8 PM, baarish.</b> Ek shehar mein 50,000 ride
        requests/min. Har driver 4 second par location bhejta hai. Ek driver do riders
        ko kabhi na mile. Match 10 second ke andar.`,
      requirements: ['10 lakh drivers × 15 ping/min', '50k requests/min peak', 'Zero double-assignment', 'Match &lt; 10s'],
      pass: 16,
      slots: [
        {
          id: 'loc', label: 'Driver locations', icon: '📍',
          options: [
            { id: 'mem', label: 'In-memory geo store (cell → drivers), + async stream mein bhi', score: 3, why: 'Yeh <b>current state</b> hai, history nahi — 20 second purana location bekaar hai. In-memory store 1.5 crore writes/min sambhaal leta hai; aur stream analytics/trip-history ke liye alag se sab rakh leta hai.' },
            { id: 'db', label: 'Har ping DB mein insert', score: -3, why: '1.5 crore writes/min. Aur uska 99.99% data agle ping par bekaar ho jaata hai. Durable store yahan bilkul galat aujaar hai.' },
            { id: 'kafka', label: 'Sirf Kafka mein, wahin se query karo', score: -2, why: 'Kafka ek log hai, ek <b>lookup</b> store nahi. "Is cell mein abhi kaun hai" ka jawab usse nikalna matlab poora stream padhna. Stream ke saath ek materialized state chahiye.' },
          ],
        },
        {
          id: 'nearby', label: 'Nearby drivers', icon: '🗺️',
          options: [
            { id: 'cell', label: 'Geohash/H3 cell + 8 padosi, phir asli doori se rank', score: 3, why: '2D range query par index chalta hi nahi. Cell prefix se candidates (mota chhanna), phir haversine/ETA se rank (baarik chhanna). Padosi cells isliye ki boundary par sabse paas wala chhoot na jaaye.' },
            { id: 'between', label: 'lat/lng par BETWEEN with composite index', score: -3, why: 'Composite index pehli range ke baad ruk jaata hai — poori latitude patti padhni padegi. Yeh chhote data par chalta hai aur peak par marta hai.' },
          ],
        },
        {
          id: 'hotcell', label: '8 PM, baarish — ek cell par sab', icon: '🔥',
          options: [
            { id: 'split', label: 'Cell ko chhoti precision par todo + us cell ka data replicate', score: 3, why: 'Hot key ka wahi ilaaj, geo par. Aur adaptive grid rakho — ghani jagah ke cells chhote, taaki yeh apne aap sambhal jaaye.' },
            { id: 'nodes', label: 'Aur nodes add karo', score: -2, why: 'Ek cell ka data ek hi node par hash hota hai. Nodes badhane se woh cell nahi bantegi — baaki nodes khaali baithe rahenge.' },
          ],
        },
        {
          id: 'match', label: 'Driver matching', icon: '🤝',
          options: [
            { id: 'hold', label: 'Top driver par 15s ka hold (TTL), offer bhejo, timeout par agla', score: 3, why: 'Reservation pattern, ab 15 second ka. Hold ke bina ek driver 5 riders ko offer ho jaayega aur chaar ko "mil gaya… nahi mila" dikhega. TTL isliye ki driver phone na uthaye toh woh atka na rahe.' },
            { id: 'first', label: 'Sabko offer bhej do, jo pehle accept kare use de do', score: -2, why: 'Chalak lagta hai aur kai systems yeh karte hain — par bina hold ke driver ko ek saath kai offers dikhenge, aur har reject/timeout par rider ka wait badhta jaayega. Aur double-assignment ka race bacha rehta hai.' },
            { id: 'lock', label: 'DB lock driver row par jab tak accept na ho', score: -2, why: 'Driver 15-20 second le sakta hai. Utni der DB lock pakadna us row par sabko rokta hai — aur agar driver ka network gaya toh lock timeout tak atka rahega.' },
          ],
        },
        {
          id: 'track', label: 'Live tracking', icon: '🔌',
          options: [
            { id: 'gw', label: 'Alag gateway layer (sockets) + pub/sub, L4 LB', score: 2, why: 'Connections ek alag capacity dimension hain. Gateway sirf sockets rakhe; rider aur driver do alag gateways par honge, isliye beech mein pub/sub.' },
            { id: 'poll', label: 'App har 3 second location poll kare', score: 0, why: 'Simple aur bharosemand — par 50,000 active rides × 20 polls/min = ~16,000 rps sirf tracking ke liye. Ek ride ke doraan yeh mehenga pad jaata hai.' },
          ],
        },
        {
          id: 'pay', label: 'Fare aur payment', icon: '💰',
          options: [
            { id: 'ledger', label: 'Immutable ledger entries + idempotency key + roz reconciliation', score: 3, why: 'Ride complete = service di ja chuki hai, use <b>reverse nahi</b> kiya ja sakta. Isliye payment failure ek alag recovery flow hai, aur ledger + reconciliation dono zaroori hain.' },
            { id: 'update', label: 'Rider ka balance column update karo, fail par retry', score: -3, why: 'Bina idempotency key ke retry double charge hai. Aur balance column itihaas mita deta hai — dispute par tumhare paas koi jawab nahi.' },
          ],
        },
      ],
      verdicts: {
        great: '👑 <b>Architect Mahaguru.</b> Saat shapes, saat sahi ilaaj — aur har ek tumhe pehle se aata tha. Yahi is poore app ka maksad tha.',
        ok: '💪 Bahut kuch sahi hai. Jahan galti hui, wahan ek shape ka known failure mode chhoot gaya — uska why padho, woh exact incident kisi din aata hai.',
        bad: '🤔 Wapas shapes se shuru karo: har hisse ka naam likho, phir uska known failure mode. Ilaaj apne aap saamne aa jaayega.',
      },
    },
    {
      type: 'quiz',
      title: 'BOSS — Aakhri sawaal',
      questions: [
        {
          q: 'Driver locations DB mein kyun nahi?',
          choices: [
            'Woh CURRENT STATE hai, history nahi — 20 second purana location bekaar hai. 1.5 crore writes/min durable store par daalna galat aujaar chunna hai',
            'DB slow hai',
            'Locations bahut badi hain',
            'DB mein geo support nahi',
          ],
          answer: 0,
          explain: 'Sabse zaroori sawaal yeh hai: <b>kya yeh data durable hona chahiye?</b> Driver ka purana location kisi kaam ka nahi — woh ek badalti hui state hai. (Trip history alag cheez hai, aur woh stream mein jaati hai.) Aujaar ka chunav data ke <b>swabhav</b> se hota hai, uske size se nahi.',
        },
        {
          q: 'Matching mein hold (TTL) na lagayein toh?',
          choices: [
            'Ek driver kai riders ko offer ho jaayega, aur jo pehle accept kare uske alawa sabko "mil gaya... nahi mila" dikhega. Aur double-assignment ka race bhi bacha rehta hai',
            'Kuch khaas nahi',
            'Matching slow hogi',
            'Drivers confuse honge',
          ],
          answer: 0,
          explain: 'Yeh wahi <b>reservation pattern</b> hai jo Ticketmaster mein tha — sirf TTL 10 minute ki jagah 15 second hai. Aur TTL usi wajah se laazmi hai: driver phone na uthaye toh woh hold atka nahi rehna chahiye, warna woh driver kisi ko nahi milega.',
        },
        {
          q: 'Ride complete ho gayi par payment fail ho gaya. Kya karoge?',
          choices: [
            'Ride reverse nahi ho sakti — service di ja chuki hai. Ek alag recovery flow: retry, phir rider ke account par outstanding balance, phir agli ride se pehle settle',
            'Ride cancel kar do',
            'Driver ko paisa mat do',
            'Ride free kar do',
          ],
          answer: 0,
          explain: 'Yeh saga ki sabse zaroori seekh hai: <b>har kadam compensate nahi ho sakta</b>. Kuch cheezein asli duniya mein ho chuki hain (gaadi chal chuki hai, driver ka waqt laga hai) aur unhe undo karne ka koi tareeka hai hi nahi. Un jagahon par tumhe ek <b>forward recovery</b> chahiye, rollback nahi.',
        },
        {
          q: 'Poore app ka nichod, ek line mein?',
          choices: [
            'Pehle pattern ka NAAM lo (uske saath uska known failure aata hai), phir bottleneck MAAPO (anumaan mat lagao), phir har faisle ki KEEMAT bolo',
            'Hamesha scale ke liye design karo',
            'Modern patterns use karo',
            'Sab kuch simple rakho',
          ],
          answer: 0,
          explain: 'Teen aadatein, aur teenon dohrayi ja sakti hain. <b>Naam</b> se tumhe checklist milti hai. <b>Maap</b> se tumhe sach milta hai (aur bottleneck lagbhag kabhi CPU nahi hota). <b>Keemat</b> se pata chalta hai ki tumne chuna hai, yaad nahi kiya. Baaki sab vocabulary hai. 👑',
        },
      ],
    },
  ],
  interview: {
    title: 'FINAL Round — Architect',
    instructions: 'Aakhri do sawaal. 🎤👑',
    questions: [
      {
        q: '"Uber design karo." Pehle 60 second mein kya bologe?',
        choices: [
          '"Isme saat shapes hain: write-heavy locations, geo search, matching (contention), ride workflow, realtime tracking, ledger, aur surge (streaming). Main matching se shuru karta hoon kyunki wahi sabse mushkil hai — usme geo aur contention dono hain."',
          '"Main services aur database se shuru karta hoon"',
          '"Kitne users honge?"',
          '"Microservices architecture use karunga"',
        ],
        answer: 0,
        explain: 'Pehle 60 second mein tum do cheezein dikha rahe ho: ki tumne problem ka <b>aakaar</b> samajh liya, aur ki tum jaante ho ki <b>sabse mushkil hissa kaunsa hai</b>. Woh doosri baat hi seniority ka signal hai — junior candidates aksar sabse aasan hisse se shuru karte hain aur waqt wahin khatam kar dete hain.',
      },
      {
        q: '"Tumhare is design ka sabse kamzor hissa kya hai?"',
        choices: [
          'Matching ka hold — agar Redis gir jaaye toh double-assignment mumkin hai. Blast radius ek shehar tak seemit hai. Isliye main "active holds" par metric rakhunga aur matching ke liye ek local fallback (single-node dispatch per city) sochunga',
          '"Koi kamzori nahi hai"',
          '"Testing aur chahiye"',
          '"Scale par pata chalega"',
        ],
        answer: 0,
        explain: 'Achha jawab teen cheezein rakhta hai: ek <b>asli</b> kamzori (koi nakli chhoti si nahi), uska <b>blast radius</b>, aur uska <b>detection</b>. "Koi kamzori nahi" ka matlab hai tumne socha hi nahi. Har design mein kamzori hai — architect woh hai jo jaanta hai ki woh kahan hai aur uska pata kaise chalega. 👑',
      },
    ],
  },
  success: [
    'Ek problem mein saare shapes pehchaan sakte ho',
    'Har shape ka known failure mode pehle se naam le sakte ho',
    'Bottleneck maap ke nikaal sakte ho, anumaan se nahi',
    'Har faisle ki keemat bol sakte ho',
    '👑 Tum System Gurukul ke Architect Mahaguru ho',
  ],
  homework: `<b>Aakhri homework — aur sabse asli.</b><br><br>
    Apne kaam ka ek system chuno aur uspar poora dhaancha chalao:
    shapes ginno, har ek ka known failure mode likho,
    "10x par kya tootega" ka jawab <b>maap ke</b> nikaalo,
    har bade faisle ki keemat likho, aur ek cheez dhoondo jo ab <b>hataayi</b> ja sakti hai.
    <br><br>Phir woh page apni team ko dikhao. Yahi asli design review hai —
    aur yahi is poore app ka asli imtihaan. 🏛️`,
  cards: [
    { front: 'Uber mein kitne shapes?', back: '<b>Saat</b> — write-heavy locations, geo, contention (matching), workflow, realtime fanout, ledger, streaming (surge). Aur ek bhi naya nahi: har failure mode pehle se pata hai.' },
    { front: 'Driver locations kahan?', back: '<b>In-memory geo store</b> — yeh current state hai, history nahi. 1.5 crore writes/min durable store par daalna galat aujaar chunna hai. History alag se stream mein.' },
    { front: 'Matching kaise?', back: 'Cell + padosi se candidates → doori/ETA se rank → top driver par <b>15s ka hold (TTL)</b> → offer → timeout par agla. Reservation pattern, sirf TTL chhota.' },
    { front: 'Payment fail, ride complete?', back: 'Ride <b>reverse nahi ho sakti</b> — service di ja chuki hai. Forward recovery chahiye: retry → outstanding balance → agli ride se pehle settle. Har saga step compensate nahi hota.' },
    { front: 'Design ka sabse kamzor hissa poochha jaaye?', back: 'Ek <b>asli</b> kamzori batao + uska <b>blast radius</b> + uska <b>detection</b>. "Koi kamzori nahi" ka matlab hai tumne socha hi nahi.' },
    { front: '👑 Poore app ka nichod?', back: '<b>1.</b> Pattern ka <b>naam</b> lo — uske saath known failure mode aata hai. <b>2.</b> Bottleneck <b>maapo</b> — woh lagbhag kabhi CPU nahi hota. <b>3.</b> Har faisle ki <b>keemat</b> bolo — na bata sako toh samjha nahi, naam seekha hai.' },
  ],
},
]);
