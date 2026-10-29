(() => {
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

7 characters base62         →  62⁷ ≈ 3.52 trillion = 35.2 KHARAB codes   ✅ kaafi hai</pre>
     <p class="tip">🎯 Yeh estimate ek line mein poora design bata deta hai:
     <b>40 writes/sec</b> ka matlab hai write path ka koi sawaal hi nahi —
     representative query, durability aur failure budget ke saath capacity benchmark karo. Saara design <b>read path</b> ka hai.</p>
     <h3>🔑 Short code — teen tareeke</h3>
     <table>
       <tr><th></th><th>Kaise</th><th>Dikkat</th></tr>
       <tr><td><b>Random</b></td><td>7 random characters</td><td>Har insert par "yeh code hai kya?" lookup — aur space bharne par collisions badhte jaate hain</td></tr>
       <tr><td><b>Hash</b></td><td>md5(url) ke pehle 7</td><td>Wahi URL = wahi code (kabhi feature, kabhi bug). Aur collisions phir bhi handle karne padte hain</td></tr>
       <tr><td><b>Counter</b></td><td>badhta counter → base62</td><td>Codes predictable ho sakte hain; authorization mandatory. Obfuscation aur cryptographic secrecy alag hain</td></tr>
     </table>
     <p><b>Is deterministic-allocation lab mein counter fit hai</b>, aur wajah gehri hai: durable disjoint allocation aur unreused namespace mein random-code collision retries nahi,
     isliye har write par woh existence-check <b>hai hi nahi</b>. Aur jo counter tum
     use karoge (Snowflake ya DB sequence) woh sortable hai — matlab index bhi khush.</p>
     <p>Reversible mapping collision behavior preserve karti hai if mapping one-to-one ho: mod 62⁷ multiplication mein multiplier ko modulus se coprime hona hoga (odd hona alone enough nahi; factor 31 bhi avoid karo). Simple arithmetic scramble secrecy/authorization nahi. Full 64-bit Snowflake ko 7 base62 characters mein losslessly fit nahi kar sakte; width aur capacity alag calculate karo.</p>`,
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
            { id: 'counter', label: "Durable disjoint counter then base62", score: 3, why: "Durable disjoint counter unreused bounded namespace mein random collision retries avoid karta hai. UNIQUE constraint still prudent hai; width capacity se derive karo. Scrambling alone guessing-resistant security guarantee nahi." },
            { id: 'random', label: "Random code+unique insert retry", score: -1, why: "Random code + atomic UNIQUE insert/retry bhi correct design ho sakta hai. Pehle SELECT required nahi; woh race bhi kar sakta hai. Is lab ka preference deterministic collision-free allocation hai; random width occupancy aur threat model se choose karo." },
            { id: 'hash', label: "Truncated URL hash;no collision test", score: -2, why: 'Do problems: wahi URL hamesha wahi code dega (do alag users, do alag campaigns — ek hi link), aur collisions phir bhi handle karne padenge kyunki 7 characters mein hash truncate ho raha hai.' },
          ],
        },
        {
          id: 'read', label: 'Redirect path', icon: '⚡',
          options: [
            { id: 'cache', label: "Cache miss to indexed source", score: 3, why: '95%+ hit rate seedha aata hai kyunki links ka access bahut skewed hai. Aur redirect path par bas ek key lookup rehta hai — "embarrassingly simple".' },
            { id: 'db', label: "Indexed source on every redirect", score: 0, why: '12,000 rps par ek Postgres ise kar bhi lega — par p99 50ms ka SLO aur 99.99% ki shart cache ke bina bahut naazuk ho jaati hai. Yahan cache lagbhag muft ka faayda hai.' },
            { id: 'join', label: "Sync click UPDATE on every redirect", score: -3, why: "Tumne 12,000 reads/sec ko 12,000 <b>writes</b>/sec bana diya — aur woh sab ek hi row par (hot row contention). Low-latency redirect mein bounded async event common choice hai;durable handoff/loss policy define karo." },
          ],
        },
        {
          id: 'status', label: 'Redirect ka status code', icon: '↩️',
          options: [
            { id: '302', label: "302;explicit cache/reuse policy", score: 2, why: 'Har click tumhare server se guzarta hai — isliye analytics milti hai aur destination badla ja sakta hai. Jab analytics product ka hissa ho, yeh extra load ek <b>feature</b> hai.' },
            { id: '301', label: "301 permanently cache mapping", score: -1, why: 'Server load kam ho jaata hai (browser khud cache kar leta hai) — par isi wajah se <b>click count khatam</b> ho jaata hai, aur link ka destination kabhi badla nahi ja sakta. Requirements mein analytics likha hai.' },
          ],
        },
        {
          id: 'viral', label: 'Ek link viral ho gaya — 50k rps', icon: '🔥',
          options: [
            { id: 'local', label: "Local cache;safe replica reads", score: 3, why: 'Local cache 99.9% traffic app ki memory se hi de deta hai (aur 1 second ki staleness ek redirect ke liye bilkul bekaar cheez hai). Copies bache hue traffic ko nodes par baant deti hain.' },
            { id: 'nodes', label: "Add shards;keep hot key on one", score: -2, why: 'Ek key hamesha <b>ek</b> node par hash hoti hai. 20 nodes hon ya 200, woh key ek hi node par jalegi.' },
            { id: 'rate', label: "Throttle this popular public link", score: -3, why: 'Yeh traffic asli users ka hai — tum apne hi product ko band kar rahe ho. Rate limit abuse ke liye hai, popularity ke liye nahi.' },
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
      success: SD.allTasks(T_BITLY),
      successText: `Poora design ek ratio se nikla: <b>100:1</b>.
        Write path itna chhota hai ki uspar sochna bhi bekaar tha; saara kaam
        read path par tha. Aur viral link koi naya problem nahi tha —
        woh wahi <b>hot key</b> thi jo tum pehle se jaante ho.`,
      solution: [
        "estimate --users 100000000 --rps 12000 --bytes 500",
        "id bench --type uuid4 --rows 1000000",
        "id bench --type snowflake --rows 1000000",
        "load --rps 12000 --duration 8",
        "sim add cache --ttl 300 --jitter 20",
        "cache hotkey --key url:aX9k2Lq --rps 50000",
        "cache hotkey --key url:aX9k2Lq --rps 50000 --replicas 8",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.cache?.jitterPct > 0 && m.latest(s, 'cache', 'hotkey')?.rps === 50000 && m.latest(s, 'cache', 'hotkey')?.hot === false; },
      hints: [
        "Pehle observation: Traffic ka andaaza lagao. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Us viral link ko phailao. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nestimate --users 100000000 --rps 12000 --bytes 500\nid bench --type uuid4 --rows 1000000\nid bench --type snowflake --rows 1000000\nload --rps 12000 --duration 8\nsim add cache --ttl 300 --jitter 20\ncache hotkey --key url:aX9k2Lq --rps 50000\ncache hotkey --key url:aX9k2Lq --rps 50000 --replicas 8",
      ],
    },
    {
      type: 'quiz',
      title: 'Shortener ke faisle',
      questions: [
        {
          q: "Unique counter allocation accepted hai. Random code generation ke comparison mein advantage?",
          choices: ["Unique counter avoids random collision retries","Base62 encoding makes codes unguessable","Random codes inherently cannot be unique","Counter removes every persistence invariant"],
          answer: 0,
          explain: "Durable disjoint counter allocation plus one-to-one base62 encoding avoids random-code collision retries while namespace is not exhausted/reused. Random code plus atomic collision retry is valid alternative. Predictability, availability and counter recovery are tradeoffs.",
         choiceExplanations: ["Durable disjoint counter allocation plus one-to-one base62 encoding avoids random-code collision retries while namespace is not exhausted/reused. Random code plus atomic collision retry is valid alternative. Predictability, availability and counter recovery are tradeoffs.","Base62 is reversible encoding; predictability still needs threat modeling.","Random code plus atomic unique constraint and retry can be correct too.","Counter allocation must be durable, non overlapping and not reset/reused."] },
        {
          q: 'Click analytics chahiye. Redirect ke waqt kya karoge?',
          choices: ["Bounded async analytics on redirect path","Sync DB increment has zero tail cost","Queue means click events cannot be lost","Analytics throughput can ignore backlog"],
          answer: 0,
          explain: "Latency-sensitive redirects commonly emit bounded async analytics. Define whether lossy best-effort or durable handoff is required; queue overload/recovery policy matters. Sync update can be valid if SLO/correctness needs justify it; never universal prohibition nahi.",
         choiceExplanations: ["Latency-sensitive redirects commonly emit bounded async analytics. Define whether lossy best-effort or durable handoff is required; queue overload/recovery policy matters. Sync update can be valid if SLO/correctness needs justify it; never universal prohibition nahi.","Synchronous dependencyadds latency/failure coupling; measure contract tradeoff.","Durable handoff, backpressure and event loss policy still required.","Consumer lag and retention determine event availability and freshness."] },
        {
          q: "Sequential allocation se 6 billion unique URLs. Minimum fixed base62 code width?",
          choices: ["6 base62 characters enough for 6 billion","5 base62 characters enough for 6 billion","4 base62 characters enough for 6 billion","3 base62 characters enough for 6 billion"],
          answer: 0,
          explain: "62^5=916132832<6 billion;62^6=56800235584>6 billion. Minimum fixed width is 6 base62 characters for sequential unique allocation over 6 billion values. Random code collision risk requires separate birthday/uniqueness analysis.",
         choiceExplanations: ["62^5=916132832<6 billion;62^6=56800235584>6 billion. Minimum fixed width is 6 base62 characters for sequential unique allocation over 6 billion values. Random code collision risk requires separate birthday/uniqueness analysis.","62^5=916132832, less than 6 billion.","62^4=14776336, far below 6 billion.","62^3=238328, far below 6 billion."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — URL Shortener',
    instructions: 'Sabse aam pehla system design sawaal. 🎤',
    questions: [
      {
        q: '"Bitly design karo." Pehla kaam?',
        choices: ["Scope retention, ratio and redirect SLO","Choose hash before deciding custom aliases","Read heavy means writes need no durability","Choose 15 services before user requirements"],
        answer: 0,
        explain: 'Ek sawaal ne poora design tay kar diya. 100:1 ka matlab hai: cache par focus, redirect path ko simple rakho, aur analytics ko async karo. Agar ratio ulta hota (write-heavy), toh yeh bilkul alag system hota. Isiliye "shape pehchano" pehla kadam hai.',
       choiceExplanations: ["Ek sawaal ne poora design tay kar diya. 100:1 ka matlab hai: cache par focus, redirect path ko simple rakho, aur analytics ko async karo. Agar ratio ulta hota (write-heavy), toh yeh bilkul alag system hota. Isiliye \"shape pehchano\" pehla kadam hai.","Collision, security and product constraints should guide ID design.","Losing URL mappings breaks redirects; read heavy still needs reliable writes.","Topology without requirements adds unsupported complexity."] },
      {
        q: '"Custom alias chahiye — /my-campaign. Ab kya badla?"',
        choices: ["Atomic alias uniqueness and reserved policy","Check then insert is race free at low latency","Hash custom alias and ignore requested spelling","Counter generation prevents human alias clash"],
        answer: 0,
        explain: 'Yeh follow-up dekhta hai ki tum <b>race conditions</b> pehchante ho. "Pehle check karo phir insert karo" wahi check-then-act bug hai — do requests ek saath wahi alias le sakti hain. Sahi jawab: unique index par insert karo aur constraint violation ko 409 mein badal do. Aur reserved paths ka dhyaan ek asli production detail hai.',
       choiceExplanations: ["Yeh follow-up dekhta hai ki tum <b>race conditions</b> pehchante ho. \"Pehle check karo phir insert karo\" wahi check-then-act bug hai — do requests ek saath wahi alias le sakti hain. Sahi jawab: unique index par insert karo aur constraint violation ko 409 mein badal do. Aur reserved paths ka dhyaan ek asli production detail hai.","Two concurrent requests can both see alias unused.","Custom alias is user chosen public name; hashing changes requested contract.","Counter uniqueness does not stop two people choosing/my-campaign."] },
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
    { front: 'Short code kaise banayein?', back: "<b>Durable disjoint counter → optional one-to-one mapping → base62.</b> Namespace reuse/exhaustion guard karo; no separate SELECT needed, UNIQUE still useful. 7 chars ≈ 3.52 trillion = 35.2 kharab codes. Encoding/scramble authorization replace nahi karte." },
    { front: 'Click analytics kaise?', back: '<b>Async event</b> — redirect critical path par sync analytics cost avoid/measure karo;async durability/loss policy explicit ho. Warna 12k reads/sec = 12k writes/sec ek hi row par (hot row).' },
    { front: '301 vs 302?', back: "301 heuristically cacheable permanent redirect hai;302 temporary,but explicit cache headers se cache ho sakta hai.Destination change/analytics needs se status aur cache policy choose karo;every302 always hits server nahi." },
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
            { id: 'zset', label: "Redis sorted-set projection", score: 3, why: 'Structure hi jawab hai. Score update, top-K aur <b>rank</b> — teenon O(log n). Rank yahan ek gin-ti nahi, ek lookup hai.' },
            { id: 'sql', label: "SQL score index and rank query", score: -1, why: 'Top-100 toh chal jaayega, par 10k updates/sec index ke ek hi hisse par hot spot banate hain — aur "meri rank" ke liye <code>COUNT(*) WHERE score &gt; ?</code> har baar lakhon rows ginega.' },
            { id: 'sort', label: "Re-sort all scores each request", score: -3, why: '50 lakh entries ka sort har request par — 50,000 rps par yeh pehle second mein hi khatam.' },
          ],
        },
        {
          id: 'rank', label: '"Meri rank kya hai"', icon: '📊',
          options: [
            { id: 'zrank', label: "ZREVRANK for exact score rank", score: 3, why: 'Sorted set har node ke saath "neeche kitne hain" rakhta hai, isliye rank gini nahi jaati, <b>padhi</b> jaati hai. Yahi is structure ka sabse bada faayda hai.' },
            { id: 'count', label: "SQL COUNT above current score", score: -3, why: 'Har call par lakhon rows. Aur yeh sawaal <b>har player</b> poochhta hai — yaani sabse mehengi query sabse zyada chalti hai.' },
            { id: 'approx', label: "Bucketed approximate rank", score: 1, why: 'Bahut bade scale (5 crore+) par yeh sahi raasta hai — par 50 lakh par ZREVRANK exact bhi de deta hai aur sasta bhi hai. Complexity tab lo jab zaroorat ho.' },
          ],
        },
        {
          id: 'windows', label: 'Daily / weekly / all-time', icon: '🗓️',
          options: [
            { id: 'keys', label: "Separate window keys;periodic expiry", score: 2, why: 'Har window apni key, TTL se purane apne aap saaf. Teen writes ek update par — par har ek O(log n) hai, aur Redis ke liye yeh kuch bhi nahi.' },
            { id: 'query', label: "One score set without time history", score: -2, why: 'Sorted set score par sorted hai, time par nahi — "aaj ke scores" filter karne ka koi sasta tareeka hai hi nahi. Window alag key hi honi chahiye.' },
          ],
        },
        {
          id: 'durable', label: 'Redis gir gaya toh', icon: '💾',
          options: [
            { id: 'source', label: "Durable scores;rebuild projection", score: 2, why: 'Sahi rishta: DB source of truth, Redis ek tez read structure. Redis gira toh leaderboard thodi der ke liye gaya, <b>scores nahi</b>. Rebuild ek job hai.' },
            { id: 'aof', label: "Only AOF without recovery drill", score: -1, why: 'AOF asli hai par woh Redis ko source of truth bana deta hai — aur tab dataset RAM ki hadd mein bandha hai aur crash par aakhri kuch second ke writes ja sakte hain. Game scores ke liye woh risk lene ki koi wajah nahi.' },
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
          q: "Given SQLexact-rank query COUNT(score>mine) large matches scan karti hai. Expensive operation?",
          choices: ["Exact around-me rank can scan many scores","Top 100 always scans entireSQLtable","Score update alwaysO(N)without exception","Insert player always recomputes all ranks"],
          answer: 0,
          explain: "Given exact rank via COUNT score-greater for frequently queried players, rank can scan many entries. SQLindex/topK and score updates can be efficient; precise cost depends query shape, distribution and engine. Rank projection/approximation tradeoffs evaluate karo.",
         choiceExplanations: ["Given exact rank via COUNT score-greater for frequently queried players, rank can scan many entries. SQLindex/topK and score updates can be efficient; precise cost depends query shape, distribution and engine. Rank projection/approximation tradeoffs evaluate karo.","Matching ordered index can serve topK efficiently.","Index and data layout determine update work; universal claim unsupported.","Materialized rank policy is design choice, not mandatory every insert."] },
        {
          q: 'Redis sorted set rank ko O(log n) mein kaise deta hai?',
          choices: ["Rank-aware skip list spans support traversal","Memory alone makes every operationO(1)","Sorted set stores no ordering metadata","One huge array means every rank constant"],
          answer: 0,
          explain: "Redis ordinary sorted set implementation hash lookup+skip list uses rank spans for logarithmic rank traversal; small set compact encodings may differ. Being in RAM alone O(1)rank theorem nahi.",
         choiceExplanations: ["Redis ordinary sorted set implementation hash lookup+skip list uses rank spans for logarithmic rank traversal; small set compact encodings may differ. Being in RAM alone O(1)rank theorem nahi.","Memory reduces IOcost; algorithmic work still depends data structure.","Scores/order and spans support efficient rank operations.","Sorted array updates can require shifting; implementation contract differs."] },
        {
          q: '5 crore players ho gaye. Sabse pehle kya karoge?',
          choices: ["Exactness, topK and update needs clarify","Cluster automatically shards global rank","More memory removes every global merge","Cached rankstays exact after all updates"],
          answer: 0,
          explain: 'Sharding ek sorted set ko todna mushkil hai (global ordering chahiye). Par isse pehle: rank 4,82,391 aur 4,84,100 mein <b>player ke liye</b> koi farak nahi. Exactness sirf top ke paas maayne rakhti hai. Yeh sawaal poochhna — "kya yahan exact chahiye?" — aksar engineering ka aadha kaam bacha deta hai.',
         choiceExplanations: ["Sharding ek sorted set ko todna mushkil hai (global ordering chahiye). Par isse pehle: rank 4,82,391 aur 4,84,100 mein <b>player ke liye</b> koi farak nahi. Exactness sirf top ke paas maayne rakhti hai. Yeh sawaal poochhna — \"kya yahan exact chahiye?\" — aksar engineering ka aadha kaam bacha deta hai.","Global rank across shards needs aggregation/order design.","RAMcapacity is one constraint; CPU/skew/global queries remain.","Score changes can invalidate cached relative ranks."] },
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
        q: "Realtime leaderboard ke Redis projection ka accurate contract?",
        choices: ["Sorted set projection plus durable score events","Sorted set makes all range queriesO(logN)","SQLcan never implement any leaderboard","Redis alone removes recovery and score audit"],
        answer: 0,
        explain: "RedisZADD/ZRANK/ZREVRANK logarithmic operations hain; ZRANGE returning M members isO(logN+M). Durable score authority/event log and rebuild plan define karo. SQL other options SLO/workload meet kar sakte hain; tool name alone required answer nahi.",
       choiceExplanations: ["RedisZADD/ZRANK/ZREVRANK logarithmic operations hain; ZRANGE returning M members isO(logN+M). Durable score authority/event log and rebuild plan define karo. SQL other options SLO/workload meet kar sakte hain; tool name alone required answer nahi.","Range returning M members costsO(logN+M), notjustlogN.","Relational index/window/aggregates can fit some workloads.","Durable authority/rebuild strategy andanti-cheat/business rules still needed."] },
      {
        q: '"Ab 5 crore players. Kya badlega?"',
        choices: ["Revisit exact rank and partitioned tradeoffs","Any 5 crore set must use Cassandra","TopKcache alone computes every exact rank","Sharding sorted set automatically ranks globally"],
        answer: 0,
        explain: 'Sorted set ko shard karna mushkil hai kyunki rank ke liye <b>global ordering</b> chahiye — har shard ka apna order poore leaderboard ki rank nahi deta. Isliye achha jawab pehle <b>requirement</b> kaatta hai, phir structure. "Top-K alag karo" bhi mazboot hai: 99% reads sirf top 100 ke hain.',
       choiceExplanations: ["Sorted set ko shard karna mushkil hai kyunki rank ke liye <b>global ordering</b> chahiye — har shard ka apna order poore leaderboard ki rank nahi deta. Isliye achha jawab pehle <b>requirement</b> kaatta hai, phir structure. \"Top-K alag karo\" bhi mazboot hai: 99% reads sirf top 100 ke hain.","Cardinality alone does not choose engine; bytes, updates and SLOs matter.","TopKanswers topK; arbitrary exact rank needs more information.","Cross shard exact rank merging requires additional structure/work."] },
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
      success: SD.allTasks(T_ADCLICK),
      successText: `Yeh system paise ka hai, isliye har faisla thoda alag hua:
        event time (processing time nahi), dedup laazmi, aur ek <b>doosra</b> exact
        pass jo raat ko chalta hai. Aur hot partition wahi purana shape tha —
        Super Bowl ad ne wahi kiya jo airport wali cell ne kiya tha.`,
      solution: [
        "stream window --size 60 --events 1000000 --late 4",
        "stream window --size 60 --watermark 10 --events 1000000 --late 4",
        "stream window --size 60 --watermark 30 --events 1000000 --late 4",
        "stream partitions --partitions 12 --consumers 20",
        "stream partitions --partitions 12 --consumers 12",
        "bloom --items 10000000 --fp 0.01",
        "cache hotkey --key ad:sb2026 --rps 400000",
        "cache hotkey --key ad:sb2026 --rps 400000 --replicas 32",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'stream', 'window')?.watermark === 30 && m.latest(s, 'stream', 'window')?.dropped === 0 && m.latest(s, 'stream', 'partitions')?.idle === 0 && m.latest(s, 'cache', 'hotkey')?.rps === 400000 && m.latest(s, 'cache', 'hotkey')?.hot === false; },
      hints: [
        "Pehle observation: Bina watermark ke minute-window — late clicks kho jaayenge. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Us ad ki key ko todo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nstream window --size 60 --events 1000000 --late 4\nstream window --size 60 --watermark 10 --events 1000000 --late 4\nstream window --size 60 --watermark 30 --events 1000000 --late 4\nstream partitions --partitions 12 --consumers 20\nstream partitions --partitions 12 --consumers 12\nbloom --items 10000000 --fp 0.01\ncache hotkey --key ad:sb2026 --rps 400000\ncache hotkey --key ad:sb2026 --rps 400000 --replicas 32",
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
            { id: 'kafka', label: "Retained log;independent subscribers", score: 3, why: 'Durable buffer, replay (billing dispute par bahut kaam ka), aur ad-wise partitioning se aggregation bina coordination ke ho jaati hai. Aur agar processor gir jaaye toh events wahin rehte hain.' },
            { id: 'db', label: "Synchronous per-click DB insert", score: -3, why: '10 lakh inserts/sec. Aur processor girne par backpressure ka koi rasta nahi — ingest API hi gir jaayegi.' },
            { id: 'sqs', label: "Worker queue with delete-on-consume", score: -1, why: 'Ingest ke liye chal jaayega, par consume karte hi events chale jaate hain — billing dispute par replay nahi kar sakte, aur ek hi data par doosra consumer (fraud detection) nahi laga sakte.' },
          ],
        },
        {
          id: 'time', label: 'Kis waqt se ginna', icon: '⏱️',
          options: [
            { id: 'event', label: "Event time;explicit late-event policy", score: 3, why: 'Click jab HUA tab ka minute. Mobile clicks late aate hain, aur processing time se ginne par campaign ke aakhri minute ke clicks agle minute mein chale jaate hain — jo seedha bill galat karta hai.' },
            { id: 'proc', label: "Processing time;ignore event clock", score: -2, why: 'Aasan hai aur <b>galat</b> hai. Aur galti random nahi hoti — woh un users par padti hai jinka network kharab hai, yaani systematically kuch advertisers ko nuksaan.' },
          ],
        },
        {
          id: 'dedup', label: 'Duplicate clicks', icon: '🔁',
          options: [
            { id: 'both', label: "Exact click-ID dedupe;Bloom hint", score: 3, why: 'At-least-once delivery matlab duplicates aayenge hi. Bloom sasta pehla filter hai, par "shayad dekha hai" par <b>exact check laazmi</b> — warna ek asli click gir sakta hai, aur woh kisi ka paisa hai.' },
            { id: 'bloomonly', label: "Bloom-positive means discard", score: -2, why: 'False positive ka matlab yahan ek asli click ko duplicate samajh ke <b>girana</b> hai. Analytics mein chalta, billing mein nahi.' },
            { id: 'none', label: "Count every repeated delivery", score: -3, why: 'Consumer crash + offset commit na hona roz ki baat hai. Aur duplicates ka matlab advertiser ko dugna bill — woh dispute banta hai.' },
          ],
        },
        {
          id: 'exact', label: 'Billing ke liye numbers', icon: '💰',
          options: [
            { id: 'lambda', label: "Live view plus exact reconciliation", score: 3, why: 'Do alag zarooratein, do alag paths. Dashboard ko turant chahiye (thodi galti manzoor), billing ko <b>sahi</b> chahiye (der manzoor). Ek hi pipeline se dono maangna hi galti hai.' },
            { id: 'stream', label: "Only uncorrected streaming totals", score: -1, why: 'Chal sakta hai — par jo events watermark ke baad aaye woh bill mein kabhi nahi aayenge, aur uska koi correction path bhi nahi. Aur dispute par tumhare paas "dobara gin lo" ka koi rasta nahi.' },
            { id: 'batch', label: "Only daily result;no live view", score: -1, why: 'Numbers sahi honge par dashboard 24 ghante purana — jo requirement (&lt; 1 min) ke bilkul khilaaf hai. Advertisers live campaign band nahi kar paayenge.' },
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
          choices: ["Auditable exactness, dedupe and correction","Approximate count alone can invoice allmoney","Watermark alone proves all clicks complete","Replicas eliminate duplicate event effects"],
          answer: 0,
          explain: 'Yeh wahi purana sawaal hai — <b>galat jawab kitna mehenga hai?</b> — aur yahan jawab "kisi ka paisa" hai. Ek analytics dashboard mein ±1% bilkul theek hai; yahan woh ek dispute hai. Isliye teen alag faisle badalte hain, aur teenon usi ek line se aate hain.',
         choiceExplanations: ["Yeh wahi purana sawaal hai — <b>galat jawab kitna mehenga hai?</b> — aur yahan jawab \"kisi ka paisa\" hai. Ek analytics dashboard mein ±1% bilkul theek hai; yahan woh ek dispute hai. Isliye teen alag faisle badalte hain, aur teenon usi ek line se aate hain.","Approximation can be acceptable for analytics, but billing invariant must explicitly allow it.","Late events beyond watermark still possible; reconciliation needed.","Replicas durably copy duplicate effects; dedupe must be designed."] },
        {
          q: 'Partition key <code>ad_id</code> chuna. Kaunsa khatra bacha hai?',
          choices: ["Viral ad can concentrate partition work","Good hash means eachad equal request load","Same key preserves global cross-ad order","More consumers split one partition automatically"],
          answer: 0,
          explain: 'Yeh wahi shape hai jo tum teen baar dekh chuke ho: hot <b>key</b> (cache), hot <b>cell</b> (geo), hot <b>partition</b> (yahan). Aur ilaaj bhi teenon jagah wahi hai — <b>todo ya replicate karo</b>. Isiliye patterns pehchanna kaam ka hai: naya problem sirf naya libaas pehne hue hai.',
         choiceExplanations: ["Yeh wahi shape hai jo tum teen baar dekh chuke ho: hot <b>key</b> (cache), hot <b>cell</b> (geo), hot <b>partition</b> (yahan). Aur ilaaj bhi teenon jagah wahi hai — <b>todo ya replicate karo</b>. Isiliye patterns pehchanna kaam ka hai: naya problem sirf naya libaas pehne hue hai.","Uniform hash keys do not imply uniform key popularity.","One key ordering is local, not global acrossallads.","Classic group parallelism bounded by partition assignments."] },
        {
          q: "Watermark 10 sse 60s; billing correctness ke liye kya assess karoge?",
          choices: ["Delay vs late data; reconcile billing truth","60 swatermark means no late clicks exist","Longer watermark makes memory use zero","Any watermark removes deduplication need"],
          answer: 0,
          explain: "Longer watermark allowance tolerates more out-of-order delay but retains state and delays finality. Events bound ke baadarrivekar sakte hain. Billing requires auditable definitions, dedupe and correction/reconciliation; nightly batch one possible implementation, mandatory not only correct way.",
         choiceExplanations: ["Longer watermark allowance tolerates more out-of-order delay but retains state and delays finality. Events bound ke baadarrivekar sakte hain. Billing requires auditable definitions, dedupe and correction/reconciliation; nightly batch one possible implementation, mandatory not only correct way.","Source/backpressure/network delays can exceed 60 seconds.","Longer waiting typically retains more window state.","Late arrival and duplicate event identity are separate issues."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Ad Click Aggregator',
    instructions: 'Yeh streaming ka sabse aam interview sawaal hai. 🎤',
    questions: [
      {
        q: '"10 lakh clicks/sec, minute-wise counts. Design bolo."',
        choices: ["Event time pipeline with dedupe and hot key plan","Oneadkey guarantees balanced partitions","Minute GROUP BY has zero retained data cost","Raw archive makes online counters exact alone"],
        answer: 0,
        explain: 'Char cheezein isme hain: sahi <b>partition key</b>, <b>event time + watermark</b>, <b>dedup</b> (kyunki at-least-once), aur <b>correction path</b>. Redis counters ka jawab galat nahi hai aur chhote scale par bilkul sahi hai — par usme replay, audit aur late-event handling teenon nahi hain.',
         choiceExplanations: ["Char cheezein isme hain: sahi <b>partition key</b>, <b>event time + watermark</b>, <b>dedup</b> (kyunki at-least-once), aur <b>correction path</b>. Redis counters ka jawab galat nahi hai aur chhote scale par bilkul sahi hai — par usme replay, audit aur late-event handling teenon nahi hain.","Popularads may need salting/partial aggregation and merge.","Windowed/grouped queries require work, state and retention.","Archive permits recompute; online pipeline still needs correctness contracts."] },
      {
        q: '"Advertiser keh raha hai humara count unke count se 3% kam hai. Kya karoge?"',
        choices: ["Reconcile definitions, time bounds and click IDs","Accept provider number without raw evidence","Adjust 3%without root cause or audit trail","Assume every difference caused by watermark"],
        answer: 0,
        explain: 'Yeh wahi reconciliation hai jo tumne ledger level mein seekha tha, ab streaming par. Aur is system mein 3% ke do sabse sambhaavit karan pehle se pata hain: <b>late events</b> jo watermark ke baad aaye, aur <b>dedup</b> jisne kuch asli clicks gira diye. Isiliye raw events rakhna sirf "achha hota hai" nahi — woh iss baatcheet ka <b>ekmatr</b> saboot hai.',
       choiceExplanations: ["Yeh wahi reconciliation hai jo tumne ledger level mein seekha tha, ab streaming par. Aur is system mein 3% ke do sabse sambhaavit karan pehle se pata hain: <b>late events</b> jo watermark ke baad aaye, aur <b>dedup</b> jisne kuch asli clicks gira diye. Isiliye raw events rakhna sirf \"achha hota hai\" nahi — woh iss baatcheet ka <b>ekmatr</b> saboot hai.","Counterpart can differ on filters, timezone, fraud policy or errors.","Blind adjustment can hide missing/duplicate events andfinancial risk.","Dedup, ingestion loss, definitions and clock boundaries also affect counts."] },
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
      success: SD.allTasks(T_TICKET),
      successText: `Do alag problems, do alag ilaaj:
        <b>contention</b> ka jawab reservation (hold + TTL) tha,
        <b>flash crowd</b> ka jawab admission control tha.
        Dhyaan do ki lock lagane se load kam nahi hua, aur admission control se
        double booking nahi ruki — <b>har problem ko uska apna ilaaj chahiye tha</b>.`,
      solution: [
        "book seat A14 --concurrent 2",
        "book reset",
        "sim set booking.mode reservation",
        "book hold A14 --ttl 600",
        "book seat A14 --concurrent 1",
        "load --rps 50000 --duration 8",
        "sim add admission --max-rps 3000 --queue 8",
        "sim add cache --ttl 2 --jitter 20",
        "load --rps 50000 --duration 8",
      ],
      verify: s => { const m = SD.mission; return s.sys.booking?.mode === 'reservation' && s.sys.booking.holds.A14 === 600 && s.sys.api.admission?.maxRps === 3000 && s.sys.api.cache?.ttlSec === 2 && m.current(s, 'load', r => r.rps === 50000 && !r.saturated); },
      hints: [
        "Pehle observation: Bina kisi protection ke ek seat par do log — double booking. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab load dobara — ab system khada rehna chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nbook seat A14 --concurrent 2\nbook reset\nsim set booking.mode reservation\nbook hold A14 --ttl 600\nbook seat A14 --concurrent 1\nload --rps 50000 --duration 8\nsim add admission --max-rps 3000 --queue 8\nsim add cache --ttl 2 --jitter 20\nload --rps 50000 --duration 8",
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
            { id: 'room', label: "Bounded waiting room with ETA", score: 3, why: 'Load bhi sambhal gaya aur user ko <b>sach</b> pata chal gaya. Aur yeh retry storm bhi rokta hai: jab number dikh raha ho toh log refresh nahi maarte.' },
            { id: 'scale', label: "Prescale;no admission guard", score: 0, why: 'Pre-scaling zaroori hai (autoscaling 10 second mein kuch nahi kar sakti) — par akela kaafi nahi. 5 lakh log 200 seats ke liye hain; capacity ka koi bhi number us ganit ko nahi badal sakta.' },
            { id: 'shed', label: "Reject excess with no waiting UX", score: -1, why: 'System toh bach jaayega, par 5 lakh log 503 dekh ke turant refresh karenge — aur load 3x ho jaayega. 503 ke saath kam se kam Retry-After chahiye; waiting room usse kaafi behtar hai.' },
          ],
        },
        {
          id: 'hold', label: 'Seat pakadna', icon: '🎟️',
          options: [
            { id: 'res', label: "Atomic owned hold with expiry", score: 3, why: 'Atomic check-and-set (NX) se double booking mumkin hi nahi, aur TTL (EX) se abandoned checkout apne aap wapas. Lock milliseconds ka, asar 10 minute ka.' },
            { id: 'lock', label: "DB lock across human checkout", score: -3, why: '10 minute ka DB lock — woh connection, woh transaction, woh row sab block. Aur browser band ho gaya toh lock timeout tak baitha rahega.' },
            { id: 'opt', label: "Retry optimistic claim at payment", score: -1, why: 'Double booking toh ruk jaayegi, par user <b>payment ke baad</b> haarega. Woh sabse bura experience hai, aur refund flow bhi banana padega.' },
          ],
        },
        {
          id: 'map', label: 'Seat map (5 lakh log dekh rahe hain)', icon: '👀',
          options: [
            { id: 'cache', label: "Bounded stale map;incremental updates", score: 3, why: '5 lakh log <b>ek hi</b> seat map dekh rahe hain — woh ek key hai, aur cache uska sabse sahi jawab. Thodi staleness bilkul theek: user bik chuki seat par click karega aur turant pata chal jaayega.' },
            { id: 'live', label: "Read full source map each request", score: -3, why: '5 lakh log × har few second = DB par lagataar hazaaron queries, aur woh <b>usi</b> DB par jispar booking chal rahi hai. Read path booking ko gira dega.' },
            { id: 'ws', label: "Broadcast full map per connection", score: -1, why: 'Updates ke liye push sahi hai, par 5 lakh connections is ek page ke liye bahut bhaari hain — aur initial map toh phir bhi cache se hi aana chahiye.' },
          ],
        },
        {
          id: 'confirm', label: 'Payment ke baad confirm', icon: '✅',
          options: [
            { id: 'txn', label: "Atomic guarded sale;stable payment ID", score: 3, why: 'Teenon ek saath ya koi nahi. Aur idempotency key isliye ki payment webhook do baar aa sakta hai — bina uske do bookings ban jaayengi.' },
            { id: 'steps', label: "Seat then booking as separate writes", score: -2, why: 'Beech mein crash = seat sold par booking row nahi (ya ulta). Yeh woh data corruption hai jo mahino baad support ticket ban ke aata hai.' },
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
          choices: ["Admission limits load; atomic holds still needed","Waiting room means seats cannot race","Queue ticket itself reserves every seat","One user batch prevents all repeat requests"],
          answer: 0,
          explain: 'Yeh is level ki sabse zaroori baat hai: <b>ek problem ka ilaaj doosre ko theek nahi karta</b>. Waiting room 5 lakh logon mein se har second sirf 3,000 andar bhejta hai — par andar aaye log bhi ek hi front-row seat par ek saath click kar sakte hain. Load aur contention do alag axes hain.',
         choiceExplanations: ["Yeh is level ki sabse zaroori baat hai: <b>ek problem ka ilaaj doosre ko theek nahi karta</b>. Waiting room 5 lakh logon mein se har second sirf 3,000 andar bhejta hai — par andar aaye log bhi ek hi front-row seat par ek saath click kar sakte hain. Load aur contention do alag axes hain.","Admitted users may concurrently request same available seat.","Admissionright and seat inventory claim separate invariants hain.","Retries, multi tab and concurrent clients still possible."] },
        {
          q: "TTLhold ke3 min baad payment confirmed; what must atomic confirmation validate?",
          choices: ["Validate hold owner, expiry and payment intent","Payment success makes expired hold owned","Webhook redelivery always creates new sale","TTLremaining means no database guard needed"],
          answer: 0,
          explain: "Payment confirmation validate hold owner, state, expiry and payment intent with atomic idempotent transition. Payment provider is external; local DB transaction alone charge atomic nahi. Expired reassigned seat with payment needs explicit refund/rebooking policy.",
         choiceExplanations: ["Payment confirmation validate hold owner, state, expiry and payment intent with atomic idempotent transition. Payment provider is external; local DB transaction alone charge atomic nahi. Expired reassigned seat with payment needs explicit refund/rebooking policy.","Seat may have beenreclaimed; reconcile/refund or retry under business policy.","Stable payment/booking IDs must make duplicate webhooks idempotent.","Concurrent expiration/reassignment needs atomic state transition."] },
        {
          q: "Map 2 seconds stale; claim seat already sold. Correctness boundary?",
          choices: ["Stale map acceptable if claim validates early","Cached map means sellingtwice acceptable","Instant map alone prevents transaction race","Late payment failure can stay hidden"],
          answer: 0,
          explain: "Bounded stale availability display acceptable if product contract permits and claim atomically validates before committing payment. Cannot promise noUXcost; measure conflict rate and clear feedback. Double booking prevention UIstalenessse independent invariant hai.",
         choiceExplanations: ["Bounded stale availability display acceptable if product contract permits and claim atomically validates before committing payment. Cannot promise noUXcost; measure conflict rate and clear feedback. Double booking prevention UIstalenessse independent invariant hai.","Display staleness and authoritative booking invariants different contracts hain.","Concurrent users cans ee same fresh available seat; atomic claim still needed.","Payment/booking mismatch needs visible recovery/reconciliation."] },
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
            { t: "Inspect stale hold age and expiry", good: true, next: 't2', explain: 'Sahi shak. Yeh reservation pattern ka classic failure hai: hold ban gaya, user chala gaya, aur hold kabhi wapas nahi aaya. Seat "kisi ke paas" hai par kisi ke paas nahi.' },
            { t: "Assume payment errors hid all seats", good: false, explain: 'Payment fail hona normal hai — par uske baad seat <b>wapas</b> aani chahiye thi. Sawaal yeh hai ki woh wapas kyun nahi aayi.' },
            { t: "Assume map cache explains all seats", good: false, explain: 'Cache 2 second stale ho sakta hai, ghanton nahi. Aur asli booking check cache se nahi hota — yeh unavailability kahin aur se aa rahi thi.' },
          ],
        },
        t2: {
          text: 'Holds Redis mein bane the — par code ne TTL ke bina SET kiya tha. Turant kya?',
          choices: [
            { t: "Reclaim stale holds;enforce TTL", good: true, next: 't3', explain: 'Do kadam: abhi ka nuksaan roko (stuck holds release), aur wajah band karo. Aur aage ke liye: hold banane ka ek hi helper function ho jisme TTL parameter <b>required</b> ho — taaki koi ise bhool hi na sake.' },
            { t: "Flush entire shared Redis database", good: false, explain: 'Isme woh holds bhi chale jaayenge jo abhi asli checkouts ke hain — aur woh log payment karke aayenge aur unki seat ja chuki hogi.' },
            { t: "Add TTL only to future hold writes", good: false, explain: 'Toh 70 seats hamesha ke liye atki rahengi. Purane holds ko bhi saaf karna hi hoga.' },
          ],
        },
        t3: {
          text: 'Theek ho gaya. Ab aisa dobara na ho, iske liye kya monitor karoge?',
          choices: [
            { t: "Hold-age and invariant alerts", good: true, next: 'end', explain: 'Yeh us tarah ka metric hai jo <b>chup-chaap failures</b> pakadta hai. Yahan kuch fail nahi hua tha — koi error nahi, koi 500 nahi. Bas inventory gayab ho rahi thi. Aur ek business metric: "available seats" vs "sold seats" ka farak.' },
            { t: "Only aggregate Redis memory", good: false, explain: 'Woh badhega zaroor, par bahut dheere aur bahut baad mein — tab tak show ho chuka hoga.' },
            { t: "Only total HTTP error rate", good: false, explain: 'Yahi is bug ki khoobi thi — <b>error rate bilkul saaf tha</b>. Har request 200 laut rahi thi. Isiliye technical metrics se yeh kabhi nahi dikhta.' },
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
        choices: ["Burst admission plus authoritative atomic hold","RedisTTLalone guarantees every booking once","Only autoscale eliminates same-seat conflict","Queue everyone without deadline or capacity cap"],
        answer: 0,
        explain: "Separate overload admission from seat correctness. Waiting room/pre warm protect capacity; atomic durable hold owner/expiry and idempotent payment confirmation protect inventory. Redis SET NX EX alone all failure cases proof nahi; fencing/authority/recovery test needed.",
       choiceExplanations: ["Separate overload admission from seat correctness. Waiting room/pre warm protect capacity; atomic durable hold owner/expiry and idempotent payment confirmation protect inventory. Redis SET NX EX alone all failure cases proof nahi; fencing/authority/recovery test needed.","Expired lease/staleholder/payment races need durable authoritative guards.","More instances do not serialize one hot seat invariant.","Unbounded waiting grows memory and expired work; honest ETA/backpressure needed."] },
      {
        q: "Browser crash leaves hold behind. Required expiry behavior?",
        choices: ["Expired hold must be reclaimable by policy","DBexpiry column physically deletes itself","TTLalone guarantees cleanup exact instant","Browser exit is authoritative cancellation"],
        answer: 0,
        explain: "Abandoned hold expires logically and must be reclaimable. Redis expiry or DB expiry checks/reaper depending on implementation provideit; DB timestamp alone auto-delete nahi. Confirm and cleanup must use atomic owner/state/expiry guards.",
       choiceExplanations: ["Abandoned hold expires logically and must be reclaimable. Redis expiry or DB expiry checks/reaper depending on implementation provideit; DB timestamp alone auto-delete nahi. Confirm and cleanup must use atomic owner/state/expiry guards.","DBexpiry field needs query filter/reclaim worker or transactional expiry logic.","SomeTTLsystems clean lazily; validity check must respect expiry.","Crash/unreliable client exit can omit cancellation signal."] },
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
            { id: 'store', label: "Persist message then push", score: 3, why: 'Push ek <b>optimization</b> hai, source of truth nahi. Yeh kram offline users, reconnects, multi-device aur "message kho gaya" — chaaron ek saath hal karta hai.' },
            { id: 'push', label: "Push then best-effort persist", score: -3, why: 'Store fail hua toh message <b>dikha</b> par save nahi hua — aur refresh par gayab. Yeh exact bug Realtime level ke incident mein tha.' },
            { id: 'both', label: "Push and persist independently", score: -1, why: 'Tez lagta hai par ab do natije ho sakte hain: push chala gaya aur store fail. Kram hi guarantee deta hai — parallel usse tod deta hai.' },
          ],
        },
        {
          id: 'group', label: 'Group message (1000 members)', icon: '👥',
          options: [
            { id: 'read', label: "One shared conversation body", score: 3, why: 'Chat mein read:write ratio <b>kam</b> hai — ek message 20 log padhte hain. 1000 inbox writes karna bekaar hai. (Notification ka chhota event alag se fanout hota hai.)' },
            { id: 'write', label: "One inbox body per recipient", score: -1, why: 'Feed ke liye sahi hai (jahan read:write 1000:1 hai), chat ke liye nahi. 100 crore messages/din × average group size = storage aur write amplification dono phat jaate hain.' },
          ],
        },
        {
          id: 'sync', label: 'Multi-device sync', icon: '📱',
          options: [
            { id: 'cursor', label: "Per-device cursor and gap fetch", score: 3, why: 'Koi alag sync system chahiye hi nahi. Wahi mechanism jo offline user ke liye tha, multi-device ko bhi cover karta hai — aur receipts bhi wahi cursors hain.' },
            { id: 'perdevice', label: "Duplicate history for each device", score: -2, why: '3 devices = 3x storage aur 3x writes, aur ab unhe aapas mein consistent bhi rakhna hai. Cursor ek number hai; copies ek poora system hain.' },
          ],
        },
        {
          id: 'conn', label: 'Connection layer', icon: '🔌',
          options: [
            { id: 'gw', label: "Dedicated socket gateway tier", score: 2, why: 'Connections ek alag capacity dimension hain — 10 crore ÷ 50k = 2,000 nodes, chahe koi kuch bhej hi na raha ho. Logic peechhe, aur pub/sub isliye ki do users do alag gateways par hote hain.' },
            { id: 'app', label: "Co-located API and socket tier", score: -1, why: 'Ab tum connections aur business logic ko ek saath scale kar rahe ho — jabki unki zaroorat bilkul alag-alag badhti hai. Aur har app deploy 10 crore reconnects trigger karega.' },
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
          q: "Chat vsfeed fanout strategy ka real decision basis?",
          choices: ["Compare recipient count, history and read ratio","Every chat must use read fanout always","Every feed must use write fanout always","Realtime transport decides storage fanout"],
          answer: 0,
          explain: "Chat/feed fanout choice reader/write ratio, group-size, popularity, offline history, encryption and delivery contract se choose karo. Shared conversation log common chat pattern; write fanout and in boxes also valid. Feed hybrid fanout common; universal chat read/feed write rule nahi.",
         choiceExplanations: ["Chat/feed fanout choice reader/write ratio, group-size, popularity, offline history, encryption and delivery contract se choose karo. Shared conversation log common chat pattern; write fanout and in boxes also valid. Feed hybrid fanout common; universal chat read/feed write rule nahi.","Small groups, large channels, offline in boxes or encryption can change tradeoff.","Celebrity fanout and inactive users often favor hybrid strategies.","Transport delivery and durable layout separate design choices hain."] },
        {
          q: "Monotonic per-conversation read state ke liye compact model?",
          choices: ["Per-conversation monotonic read cursor","One global cursor always covers all chats","Cursor counts prove user read every message","Cursor works without stable message ordering"],
          answer: 0,
          explain: "Per-user per-conversation last_read cursor compact hai jab read-state prefix/monotonic semantics fit karein. It assumes consistent message ordering; per message exceptions or privacy/product needs alternatives require kar sakte hain.",
         choiceExplanations: ["Per-user per-conversation last_read cursor compact hai jab read-state prefix/monotonic semantics fit karein. It assumes consistent message ordering; per message exceptions or privacy/product needs alternatives require kar sakte hain.","Different conversation orderings need separate scoped cursors.","Cursor is defined read state; attention/display and sparse unread semantics differ.","Message order and cursor comparison must be consistent and stable."] },
        {
          q: '2,000 gateway nodes ka deploy karna hai. Kya dhyaan rakhoge?',
          choices: ["Drain in batches; bound jittered reconnects","Blue green prevents any connection reconnect","Night deploy has zero global online users","Restart all gateways to finish faster always"],
          answer: 0,
          explain: 'Yeh un cheezon mein se hai jo design mein likhni padti hain, ops par chhodi nahi ja saktin. Ek gateway node par 50,000 connections hain; ek batch restart = laakhon reconnects, aur har reconnect mein auth + subscriptions + backlog fetch hai. Bina jitter ke woh ek self-inflicted DDoS hai.',
         choiceExplanations: ["Yeh un cheezon mein se hai jo design mein likhni padti hain, ops par chhodi nahi ja saktin. Ek gateway node par 50,000 connections hain; ek batch restart = laakhon reconnects, aur har reconnect mein auth + subscriptions + backlog fetch hai. Bina jitter ke woh ek self-inflicted DDoS hai.","Connection handoff/draining still needed; traffic switching can trigger reconnects.","Global users/timezones and sessions persist overnight.","Simultaneous auth/catch up bursts can overload remaining dependencies."] },
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
        choices: ["Durable message; authorized cursor gap recovery","Broadcast only makes offline history reliable","Push provider ACK equals recipient read","UnorderedrandomIDs always chronologicalcursor"],
        answer: 0,
        explain: 'Yeh jawab ek saath chaar cheezein hal karta hai: offline users, reconnects, multi-device sync, aur "message kho gaya". Aur woh aakhri clause — "push ek optimization hai" — hi dikhata hai ki tumne guarantee kahan rakhi hai.',
       choiceExplanations: ["Yeh jawab ek saath chaar cheezein hal karta hai: offline users, reconnects, multi-device sync, aur \"message kho gaya\". Aur woh aakhri clause — \"push ek optimization hai\" — hi dikhata hai ki tumne guarantee kahan rakhi hai.","Offline/disconnected recipients need retained message history.","Push delivery/status and app read receipts separate contracts hain.","Cursor needs stable order; randomuniqueID alone not chronological."] },
      {
        q: "Given shared conversation log chosen hai;1000 members. Body write and metadata cost?",
        choices: ["Chosen shared log:one body plus metadata work","Every chat architecture has exactly one write","Recipient inbox metadata has zero storage cost","One body write means delivery to all guaranteed"],
        answer: 0,
        explain: "Given chosen shared conversation log design, message body once write ho sakti hai. Member delivery metadata, encryption, cursors, notifications and replication additional writes create kar sakte hain. Every WhatsApp-like architecture exactly one write universal claim nahi.",
       choiceExplanations: ["Given chosen shared conversation log design, message body once write ho sakti hai. Member delivery metadata, encryption, cursors, notifications and replication additional writes create kar sakte hain. Every WhatsApp-like architecture exactly one write universal claim nahi.","Write fanout is valid alternative; architecture assumptions determine cost.","Delivery/push/encryption/receipt metadata can fanout with recipients.","Durable log write does not ensure every offline/blocked recipient receivesit."] },
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
  100 crore ghante/din × ~1 GB/ghanta  =  100 crore GB/din
                                       ≈  1 EB/din =1000 PB/din
                                       ≈  ~92.6 Tbps average (decimal units)

Given global traffic mein distributed CDN delivery origin load aur distance reduce karti hai. Byte hit ratio, origin-shield load, player startup SLO aur egress price separately measure karo; single origin ka workload benchmark ke bina universal impossibility claim mat banao.</pre>
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
     <p>Video popularity often skewed hoti hai; <b>95% byte hit ratio is scenario ka assumption</b> hai, universal production fact nahi. Same delivery volume/shield boundary par byte hits 95% se 90% girne par origin bytes 5% se 10%, yani <b>dugna</b> hote hain. CDN delivery, origin egress, regional prices aur requests ka bill separately model karo.</p>
     <h3>👁️ View count</h3>
     <p>100 crore views/din roughly 11,574 average events/sec across the platform hain. Ek viral video ka per-key skew alag measure karo; platform total ko automatically ek row ka load mat maano. Per-event updates write cost add karte hain; hot-key aggregation helpful ho sakti hai.</p>
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
            { id: 'presigned', label: "Scoped direct multipart upload", score: 3, why: 'Bytes app server se guzarte hi nahi, aur multipart se 5 GB upload resumable ho jaata hai (mobile par yeh zaroori hai). App 40ms kaam karta hai.' },
            { id: 'proxy', label: "Proxy upload through API tier", score: -3, why: 'Ek 5 GB upload dheeme network par 20 minute ek concurrency slot pakadta hai. Kuch upload ek saath = poori API down.' },
          ],
        },
        {
          id: 'transcode', label: 'Transcoding', icon: '⚙️',
          options: [
            { id: 'queue', label: "Idempotent queued worker pipeline", score: 3, why: 'Minute-ghante ka kaam, isliye async. Queue burst sambhaalti hai, workers alag scale karte hain (CPU-bound), aur status API user ko sach dikhata hai.' },
            { id: 'sync', label: "Transcode inside upload request", score: -3, why: 'Ek 4K video ka transcode ghanta le sakta hai. Request cycle mein woh mumkin hi nahi, aur retry par poora kaam dobara.' },
            { id: 'lazy', label: "Transcode on first viewer request", score: -1, why: 'Chalak idea hai aur lambe-tail videos ke liye kuch platforms yahi karte hain — par pehle viewer ko minute bhar wait karna padega. Aam raaste ke liye galat; sirf ek optimization ho sakta hai.' },
          ],
        },
        {
          id: 'deliver', label: 'Playback', icon: '🌍',
          options: [
            { id: 'cdn', label: "CDN segments;bounded origin miss", score: 3, why: "Given 92.6 Tbps global delivery mein CDN/cache origin work reduce karta hai. 95% byte hits lab assumption hai; total delivery egress, origin miss load, regional pricing aur startup SLO separately measure karo." },
            { id: 'origin', label: "Direct object storage playback", score: -2, why: 'S3 durable hai par woh CDN nahi — har viewer ko us region tak jaana padega (door ke logon ke liye buffering), aur egress bill kai guna.' },
            { id: 'app2', label: "Stream via application servers", score: -3, why: 'Ek 2-ghante ka video ek slot ko 2 ghante ke liye pakad lega. Wahi upload wali galti, ab read side par.' },
          ],
        },
        {
          id: 'views', label: 'View count', icon: '👁️',
          options: [
            { id: 'stream', label: "Stream;batch view projection", score: 3, why: "100 crore/day roughly 11,574 platform events/sec hain; ek viral video ka share hot-key load decide karta hai. UI approximate count tolerate kar sakti hai; billing/abuse metrics ko separate correctness contract chahiye." },
            { id: 'db', label: "DB row increment per view", score: -3, why: 'Ek hi row par 12,000 writes/sec — lock contention, replication lag, aur woh row poore DB ko dheema kar degi.' },
            { id: 'redis', label: "Redis increments;periodic flush", score: 1, why: 'Bahut behtar hai aur chhote scale par bilkul sahi. Par Redis ke girne par kuch counts ja sakte hain, aur monetization ke liye chahiye wala exact count phir bhi alag pipeline maangta hai.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Teen alag systems, teen alag scaling axes — aur bytes kabhi app server se nahi guzre. Yahi is design ka aakaar hai.',
        ok: '👍 Zyadatar sahi. Ek jagah bytes ya writes wahan ja rahe hain jahan unhe nahi jaana chahiye.',
        bad: '🤔 Egress ka hisaab dobara padho: ~92.6 Tbps. Us number ke baad har chunav apne aap saaf ho jaata hai.',
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
        { text: 'Video delivery (playback)', bin: 'net', explain: '~92.6 Tbps. Isiliye CDN hi poora design hai, aur hit rate hi bill hai.' },
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
          choices: ["Fetch playable initial segments then adapt","Whole 2 GBmustarrive before playback","CDN alone determines codec startup buffer","Adaptive player always starts lowest quality"],
          answer: 0,
          explain: "Segmented media and manifest player ko playable initial segments se start karte hain, then bandwidth/buffer policy quality adapt karti hai. Exact segment length, initial quality and startup 2 seconds scenario-specific hain; not always lowest quality.",
         choiceExplanations: ["Segmented media and manifest player ko playable initial segments se start karte hain, then bandwidth/buffer policy quality adapt karti hai. Exact segment length, initial quality and startup 2 seconds scenario-specific hain; not always lowest quality.","Segmented streaming permits play before full asset download.","Manifest, codec, keyframes, network and buffer policy also matter.","Initial quality selection depends bandwidth estimate/player policy; not always lowest."] },
        {
          q: "Constant byte volume:CDN byte hit 95%to90%. Origin miss bytes?",
          choices: ["Origin byte demand doubles if other factors fixed","Total viewer byte demand necessarily doubles","Origin rate increases exactly 5%relative","Higher miss rate guarantees no latency change"],
          answer: 0,
          explain: "Assume unchanged viewer traffic, byte hit definition and shielding:95%hit means 5%origin miss;90%hit means 10%, so origin bytes double. Request hit ratio and byte hit ratio differ kar sakte hain; originSLO capacity separately monitor.",
         choiceExplanations: ["Assume unchanged viewer traffic, byte hit definition and shielding:95%hit means 5%origin miss;90%hit means 10%, so origin bytes double. Request hit ratio and byte hit ratio differ kar sakte hain; originSLO capacity separately monitor.","Same view traffic staysconstant; miss fraction changes origin share.","5%to10%is 100%relative increase.","Miss latency/shielding/capacity affect user tail; cannot guarantee unchanged."] },
        {
          q: '100 crore views/din. Count kaise rakhoge?',
          choices: ["Aggregate stable event IDs; batch materialization","One hot DB row handles any view rate linearly","Redis INCR alone dedupes every retried view","Approximate UI count fits all billing invariants"],
          answer: 0,
          explain: '12,000 writes/sec ek hi row par lock contention aur replication lag dono banata hai. Aur "1.2M views" mein exactness ka koi mol hi nahi — yeh <b>approximate ke liye perfect</b> jagah hai. (Redis INCR chhote scale par sahi hai, par is scale par bhi woh aggregate pipeline hi ban jaata hai.)',
         choiceExplanations: ["12,000 writes/sec ek hi row par lock contention aur replication lag dono banata hai. Aur \"1.2M views\" mein exactness ka koi mol hi nahi — yeh <b>approximate ke liye perfect</b> jagah hai. (Redis INCR chhote scale par sahi hai, par is scale par bhi woh aggregate pipeline hi ban jaata hai.)","Single hot row has serialization/lock/throughput limits.","INCR repeat applies increment twice unless deduped.","Billing exactness/attribution requirements may differ from UI approximation."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Video platform',
    instructions: 'Yahan numbers pehle bolna hi jeet hai. 🎤',
    questions: [
      {
        q: "1 billion watch hours/day*1 GB/hour. Decimal daily egress and average bandwidth?",
        choices: ["1 EB/day egress, about 92.6 Tbps average","100 PB/day egress, about 9.26 Tbps average","10 PB/day egress, about 0.926 Tbps average","1 PB/day egress, about 0.0926 Tbps average"],
        answer: 0,
        explain: "Decimal units:1 billion watch hours/day*1 GB/hour=1 billion GB/day=1 EB/day=1000 PB/day. Average bits/s=(10^18 bytes*8)/86400~92.6 Tbps. Peak, bitrate, overhead and cache miss fraction se origin and CDN budget separately derive karo.",
       choiceExplanations: ["Decimal units:1 billion watch hours/day*1 GB/hour=1 billion GB/day=1 EB/day=1000 PB/day. Average bits/s=(10^18 bytes*8)/86400~92.6 Tbps. Peak, bitrate, overhead and cache miss fraction se origin and CDN budget separately derive karo.","1 billion hours*1 GB=1 billion GB=1 EB decimal, not 100 PB.","10 PB factor 100 too low for given watch hours/bitrate.","1 PB factor 1000 too low; units must beexplicit."] },
      {
        q: '"Ek video achanak viral ho gaya. Kya hoga?"',
        choices: ["Cold-edge misses need shield/coalescing budget","CDN 95%means origin never receives spikes","Every viral video necessarily crashes origin","Add workers eliminates bandwidth ceiling"],
        answer: 0,
        explain: 'Yeh <b>cache stampede</b> hai, ab CDN ke paimane par — aur uska naam "origin shield" hai: edges pehle ek middle layer se poochhte hain, jo ek hi origin request banati hai. Yeh bilkul wahi single-flight/coalescing hai jo tumne cache level mein dekha tha, sirf ek layer upar.',
       choiceExplanations: ["Yeh <b>cache stampede</b> hai, ab CDN ke paimane par — aur uska naam \"origin shield\" hai: edges pehle ek middle layer se poochhte hain, jo ek hi origin request banati hai. Yeh bilkul wahi single-flight/coalescing hai jo tumne cache level mein dekha tha, sirf ek layer upar.","Hit ratio aggregate can hide cold object burst across many edges.","Shielding, pre warm and bounded origin can absorb some bursts.","Origin bandwidth/provider limits may remain dominant."] },
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
    { front: 'Video platform ka pehla number?', back: '<b>Egress.</b> 100 crore watch-hours/din ×1GB/hour≈1EB/day≈<b>92.6Tbps</b>. Yeh ek number bata deta hai ki poora design CDN ke around hai.' },
    { front: 'Teen alag systems?', back: '<b>Upload</b> (bandwidth-bound, presigned URL) · <b>Transcode</b> (CPU-bound, queue + worker fleet) · <b>Deliver</b> (egress-bound, CDN). Teenon alag scale karte hain.' },
    { front: 'Playback 2 second mein kaise?', back: "<b>Chunks + adaptive bitrate.</b> Player initial bitrate/device/network policy se chunk choose karta hai, buffer aur throughput se adapt karta hai. Playback whole file download se pehle shuru ho sakti hai; full watch mein poora selected rendition stream ho sakta hai." },
    { front: 'CDN hit rate 95% → 90%?', back: "Same volume aur byte-hit/shield boundary par origin bytes <b>dugna</b> (5% → 10%). Request hit ratio alone bytes prove nahi karti. Origin capacity, delivery latency aur egress cost bhi monitor karo." },
    { front: 'View count (100 crore/din)?', back: "Stream → windowed aggregate → periodic update. 100 crore/day ≈ 11,574 events/sec platform-wide; per-video skew hot row decide karta hai. UI freshness/approximation policy explicit rakho; billing metrics separate hain." },
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
     <pre>1. query radius cover karne wali cells se candidates lo   (geo)
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
     node/partition par hai. Ilaaj wahi teen: <b>cell ko finer spatial resolution par
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
      success: SD.allTasks(T_UBER),
      successText: `👑 <b>Architect Mahaguru.</b><br><br>
        Saat shapes, saat failure modes — aur tumne ek bhi <b>naya</b> nahi seekha.
        Geohash prefix wahi B-tree prefix tha. Hot cell wahi hot key thi.
        Driver matching wahi reservation pattern tha. Pool wahi Little's Law thi.<br><br>
        <b>Yahi is poore app ka nichod hai:</b> naye systems naye nahi hote —
        woh un hi shapes ke naye libaas hote hain. Pattern ka naam lo,
        uska known failure dhoondo, aur phir <b>maap ke</b> theek karo.<br><br>
        Boxes koi bhi bana leta hai. Tradeoff bolna, bottleneck maapna,
        aur "iski keemat yeh hai" keh paana — wahi architect banata hai. 🏛️`,
      solution: [
        "estimate --users 1000000 --rps 25000 --bytes 512",
        "GET /api/v1/drivers?geohash=te7ud9&limit=20",
        "CREATE INDEX ix_geo ON drivers(geohash, updated_at)",
        "GET /api/v1/drivers?geohash=te7ud9&limit=20",
        "ring show",
        "ring set vnodes 150",
        "cache hotkey --key cell:te7ud9 --rps 60000",
        "cache hotkey --key cell:te7ud9 --rps 60000 --replicas 16",
        "book seat driver:8891 --concurrent 2",
        "book reset",
        "sim set booking.mode reservation",
        "book hold driver:8891 --ttl 15",
        "book seat driver:8891 --concurrent 1",
        "load --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'",
        "sim add timeout pricing 200",
        "sim add fallback pricing \"last known surge multiplier\"",
        "sim add admission --max-rps 8000 --queue 5",
        "sim scale pool 200",
        "load --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'",
        "slo --availability 99.95",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'drivers', ['geohash', 'updated_at']) && s.sys.ring?.vnodes === 150 && s.sys.booking?.mode === 'reservation' && s.sys.booking.holds['driver:8891'] === 15 && s.sys.deps.pricing?.timeoutMs === 200 && !!s.sys.deps.pricing.fallback && s.sys.api.admission?.maxRps === 8000 && s.sys.pool.size === 200 && m.current(s, 'load', r => r.rps === 25000 && !r.saturated); },
      hints: [
        "Pehle observation: Peak ka andaaza lagao. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: SLO budget check karo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nestimate --users 1000000 --rps 25000 --bytes 512\nGET /api/v1/drivers?geohash=te7ud9&limit=20\nCREATE INDEX ix_geo ON drivers(geohash, updated_at)\nGET /api/v1/drivers?geohash=te7ud9&limit=20\nring show\nring set vnodes 150\ncache hotkey --key cell:te7ud9 --rps 60000\ncache hotkey --key cell:te7ud9 --rps 60000 --replicas 16\nbook seat driver:8891 --concurrent 2\nbook reset\nsim set booking.mode reservation\nbook hold driver:8891 --ttl 15\nbook seat driver:8891 --concurrent 1\nload --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'\nsim add timeout pricing 200\nsim add fallback pricing \"last known surge multiplier\"\nsim add admission --max-rps 8000 --queue 5\nsim scale pool 200\nload --rps 25000 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'\nslo --availability 99.95",
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
            { id: 'mem', label: "Fresh geo state plus durable stream", score: 3, why: 'Yeh <b>current state</b> hai, history nahi — 20 second purana location bekaar hai. In-memory store 1.5 crore writes/min sambhaal leta hai; aur stream analytics/trip-history ke liye alag se sab rakh leta hai.' },
            { id: 'db', label: "Append all pings to serving SQL", score: -3, why: '1.5 crore writes/min. Aur uska 99.99% data agle ping par bekaar ho jaata hai. Durable store yahan bilkul galat aujaar hai.' },
            { id: 'kafka', label: "Only stream;no geo query projection", score: -2, why: 'Kafka ek log hai, ek <b>lookup</b> store nahi. "Is cell mein abhi kaun hai" ka jawab usse nikalna matlab poora stream padhna. Stream ke saath ek materialized state chahiye.' },
          ],
        },
        {
          id: 'nearby', label: 'Nearby drivers', icon: '🗺️',
          options: [
            { id: 'cell', label: "Radius-cover cells;exact distance", score: 3, why: '2D range query par index chalta hi nahi. Cell prefix se candidates (mota chhanna), phir haversine/ETA se rank (baarik chhanna). Padosi cells isliye ki boundary par sabse paas wala chhoot na jaaye.' },
            { id: 'between', label: "Composite B-tree bounding box", score: -3, why: 'Composite index pehli range ke baad ruk jaata hai — poori latitude patti padhni padegi. Yeh chhote data par chalta hai aur peak par marta hai.' },
          ],
        },
        {
          id: 'hotcell', label: '8 PM, baarish — ek cell par sab', icon: '🔥',
          options: [
            { id: 'split', label: "Finer cells;planned read replicas", score: 3, why: 'Hot key ka wahi ilaaj, geo par. Aur adaptive grid rakho — ghani jagah ke cells chhote, taaki yeh apne aap sambhal jaaye.' },
            { id: 'nodes', label: "More nodes;unchanged hot routing", score: -2, why: 'Ek cell ka data ek hi node par hash hota hai. Nodes badhane se woh cell nahi bantegi — baaki nodes khaali baithe rahenge.' },
          ],
        },
        {
          id: 'match', label: 'Driver matching', icon: '🤝',
          options: [
            { id: 'hold', label: "Atomic owner/expiry offer;safe accept", score: 3, why: 'Reservation pattern, ab 15 second ka. Hold ke bina ek driver 5 riders ko offer ho jaayega aur chaar ko "mil gaya… nahi mila" dikhega. TTL isliye ki driver phone na uthaye toh woh atka na rahe.' },
            { id: 'first', label: "Broadcast offer;first accept wins", score: -2, why: 'Chalak lagta hai aur kai systems yeh karte hain — par bina hold ke driver ko ek saath kai offers dikhenge, aur har reject/timeout par rider ka wait badhta jaayega. Aur double-assignment ka race bacha rehta hai.' },
            { id: 'lock', label: "DB lock while driver decides", score: -2, why: 'Driver 15-20 second le sakta hai. Utni der DB lock pakadna us row par sabko rokta hai — aur agar driver ka network gaya toh lock timeout tak atka rahega.' },
          ],
        },
        {
          id: 'track', label: 'Live tracking', icon: '🔌',
          options: [
            { id: 'gw', label: "Socket gateways and pub/sub", score: 2, why: 'Connections ek alag capacity dimension hain. Gateway sirf sockets rakhe; rider aur driver do alag gateways par honge, isliye beech mein pub/sub.' },
            { id: 'poll', label: "Client polls every3seconds", score: 0, why: 'Simple aur bharosemand — par 50,000 active rides × 20 polls/min = ~16,000 rps sirf tracking ke liye. Ek ride ke doraan yeh mehenga pad jaata hai.' },
          ],
        },
        {
          id: 'pay', label: 'Fare aur payment', icon: '💰',
          options: [
            { id: 'ledger', label: "Ledger;stable intent;reconcile", score: 3, why: 'Ride complete = service di ja chuki hai, use <b>reverse nahi</b> kiya ja sakta. Isliye payment failure ek alag recovery flow hai, aur ledger + reconciliation dono zaroori hain.' },
            { id: 'update', label: "Mutable balance;blind retries", score: -3, why: 'Bina idempotency key ke retry double charge hai. Aur balance column itihaas mita deta hai — dispute par tumhare paas koi jawab nahi.' },
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
          q: "Frequent driver locations ke current query and history layers kaise choose karoge?",
          choices: ["Fresh geo projection; durable history by need","AnyDBuse for location is categoricallywrong","Current state cannot require crash recovery","Kafka alone provides nearest-neighbor lookup"],
          answer: 0,
          explain: "Current geo projection often low latency state-store fit hai; history/audit/safety and crash recovery durability requirements se choose karo. DB cannot store locations blanket claim nahi. Actual update rate, schema, IO and query shape benchmark karo.",
         choiceExplanations: ["Current geo projection often low latency state-store fit hai; history/audit/safety and crash recovery durability requirements se choose karo. DB cannot store locations blanket claim nahi. Actual update rate, schema, IO and query shape benchmark karo.","Spatial DB can fit measured workloads; blanket technology ban unsupported.","Recovery/audit/safety requirements can demand retained updates.","Queryable geo state index/projection still needed."] },
        {
          q: 'Matching mein hold (TTL) na lagayein toh?',
          choices: ["Atomic assignment and expiring offers needed","TTLalone guarantees no driver double assignment","NoTTLguarantees every ride double books","Longer hold always improves match latency"],
          answer: 0,
          explain: "Exclusive assignment requires authoritative state transitions; offer expiry and abandonment cleanup handle karti hai. TTL alone old holder/retried accept stale claim fence nahi karta. Version/owner validation and payment/ride workflow reconciliation chahiye.",
         choiceExplanations: ["Exclusive assignment requires authoritative state transitions; offer expiry and abandonment cleanup handle karti hai. TTL alone old holder/retried accept stale claim fence nahi karta. Version/owner validation and payment/ride workflow reconciliation chahiye.","Authoritative claim/fencing/state transitions still protect owner races.","Leak/stale offer and double assignment are different failure modes.","Long hold can block driver availability and hurt match success."] },
        {
          q: 'Ride complete ho gayi par payment fail ho gaya. Kya karoge?',
          choices: ["Durable payment recovery and explicit debtpolicy","Cancel completed physical ride to undo service","Silently drop failed payment record forever","Retry with new payment key until success"],
          answer: 0,
          explain: 'Yeh saga ki sabse zaroori seekh hai: <b>har kadam compensate nahi ho sakta</b>. Kuch cheezein asli duniya mein ho chuki hain (gaadi chal chuki hai, driver ka waqt laga hai) aur unhe undo karne ka koi tareeka hai hi nahi. Un jagahon par tumhe ek <b>forward recovery</b> chahiye, rollback nahi.',
         choiceExplanations: ["Yeh saga ki sabse zaroori seekh hai: <b>har kadam compensate nahi ho sakta</b>. Kuch cheezein asli duniya mein ho chuki hain (gaadi chal chuki hai, driver ka waqt laga hai) aur unhe undo karne ka koi tareeka hai hi nahi. Un jagahon par tumhe ek <b>forward recovery</b> chahiye, rollback nahi.","Completed ride cannot be physically undone; compensating business actions needed.","Lostreceivable breaks reconciliation/accounting and audit.","New intent keys may duplicate charges after ambiguous timeout."] },
        {
          q: 'Poore app ka nichod, ek line mein?',
          choices: ["Classify, measure and state tradeoffs","Always maximize scale before definingneed","Newest pattern wins without failure analysis","Simplestdiagram winsdespite wrong outcomes"],
          answer: 0,
          explain: 'Teen aadatein, aur teenon dohrayi ja sakti hain. <b>Naam</b> se tumhe checklist milti hai. <b>Maap</b> se tumhe sach milta hai (aur bottleneck lagbhag kabhi CPU nahi hota). <b>Keemat</b> se pata chalta hai ki tumne chuna hai, yaad nahi kiya. Baaki sab vocabulary hai. 👑',
         choiceExplanations: ["Teen aadatein, aur teenon dohrayi ja sakti hain. <b>Naam</b> se tumhe checklist milti hai. <b>Maap</b> se tumhe sach milta hai (aur bottleneck lagbhag kabhi CPU nahi hota). <b>Keemat</b> se pata chalta hai ki tumne chuna hai, yaad nahi kiya. Baaki sab vocabulary hai. 👑","Prematurescale can add cost without user benefit.","Pattern fit, cost and failure handling need evidence.","Simplicity must still meet correctness and SLO requirements."] },
      ],
    },
  ],
  interview: {
    title: 'FINAL Round — Architect',
    instructions: 'Aakhri do sawaal. 🎤👑',
    questions: [
      {
        q: '"Uber design karo." Pehle 60 second mein kya bologe?',
        choices: ["Clarify ride scope then matching invariants","Start 15 services before source/user needs","StartNoSQLbecausecompany is large","Treat map display as atomic driver assignment"],
        answer: 0,
        explain: 'Pehle 60 second mein tum do cheezein dikha rahe ho: ki tumne problem ka <b>aakaar</b> samajh liya, aur ki tum jaante ho ki <b>sabse mushkil hissa kaunsa hai</b>. Woh doosri baat hi seniority ka signal hai — junior candidates aksar sabse aasan hisse se shuru karte hain aur waqt wahin khatam kar dete hain.',
       choiceExplanations: ["Pehle 60 second mein tum do cheezein dikha rahe ho: ki tumne problem ka <b>aakaar</b> samajh liya, aur ki tum jaante ho ki <b>sabse mushkil hissa kaunsa hai</b>. Woh doosri baat hi seniority ka signal hai — junior candidates aksar sabse aasan hisse se shuru karte hain aur waqt wahin khatam kar dete hain.","Service topology follows ownership/access/scale constraints.","Large user count alone does not pick data model or engine.","Location candidates and exclusive assignment different contracts hain."] },
      {
        q: '"Tumhare is design ka sabse kamzor hissa kya hai?"',
        choices: ["Name assignment failure, scope and recovery","Single city fallback automatically consistent","Active hold count proves no duplicate assignments","Assume Redis failure means allcities lost"],
        answer: 0,
        explain: 'Achha jawab teen cheezein rakhta hai: ek <b>asli</b> kamzori (koi nakli chhoti si nahi), uska <b>blast radius</b>, aur uska <b>detection</b>. "Koi kamzori nahi" ka matlab hai tumne socha hi nahi. Har design mein kamzori hai — architect woh hai jo jaanta hai ki woh kahan hai aur uska pata kaise chalega. 👑',
       choiceExplanations: ["Achha jawab teen cheezein rakhta hai: ek <b>asli</b> kamzori (koi nakli chhoti si nahi), uska <b>blast radius</b>, aur uska <b>detection</b>. \"Koi kamzori nahi\" ka matlab hai tumne socha hi nahi. Har design mein kamzori hai — architect woh hai jo jaanta hai ki woh kahan hai aur uska pata kaise chalega. 👑","Fallback requires authoritative ownership/fencing and tested handoff.","Invariant checks and assignment IDs detect duplicates; count alone insufficient.","Blast scope depends deployment/routing; verify isolation instead ofassuming."] },
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

})();
