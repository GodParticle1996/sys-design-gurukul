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
  { text: 'Ek viral link — dekho ki viral link ek cache node jala deta hai',
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
  { text: 'Ab partitions aur consumers ka milaan theek karo',
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
            { id: 'counter', label: "Pakka counter, alag range; phir base62 code", score: 3, why: "Durable disjoint counter unreused bounded namespace mein random collision retries avoid karta hai. UNIQUE constraint still prudent hai; width capacity se derive karo. Scrambling alone guessing-resistant security guarantee nahi." },
            { id: 'random', label: "Random code; UNIQUE insert par clash ho toh retry", score: -1, why: "Random code ko atomic UNIQUE insert karo; clash par retry valid hai. Pehle SELECT ka check race kar sakta hai. Is exercise mein counter ko collision retries bachaane ke liye preference di hai; random width occupancy aur guessing risk se chuno." },
            { id: 'hash', label: "URL hash chhota karo; collision ki jaanch chhodo", score: -2, why: 'Do problems: wahi URL hamesha wahi code dega (do alag users, do alag campaigns — ek hi link), aur collisions phir bhi handle karne padenge kyunki 7 characters mein hash truncate ho raha hai.' },
          ],
        },
        {
          id: 'read', label: 'Redirect path', icon: '⚡',
          options: [
            { id: 'cache', label: "Cache se redirect; miss par indexed DB lookup", score: 3, why: 'Skewed reads cache ko faayda de sakte hain, par 95% hit rate naapna padega. Miss par code ke index se source mapping lo; expiry aur revocation ki taazgi tay karo.' },
            { id: 'db', label: "Har redirect par indexed DB se mapping padho", score: 0, why: 'Indexed Postgres lookup 12,000 rps par chal sakta hai; hardware aur query par naapo. p99 50 ms aur 99.99% ke liye DB failure aur cache ke apne kharche dono milaao.' },
            { id: 'join', label: "Har redirect par click row sync update karo", score: -3, why: "Har redirect ke sync click update se 12,000 writes/sec jud sakti hain. Viral link ke counters ek row par takra sakte hain. Async event ki wait, loss policy aur recovery saaf rakho." },
          ],
        },
        {
          id: 'status', label: 'Redirect ka status code', icon: '↩️',
          options: [
            { id: '302', label: "302 redirect; cache reuse ka niyam saaf rakho", score: 2, why: '302 ke saath cache reuse ka niyam saaf rakho. Har click origin par dekhna zaroori ho toh response reuse roko, jaise no-store se; status code akela har click ka vaada nahi.' },
            { id: '301', label: "301 redirect; mapping ko lamba cache hone do", score: -1, why: '301 heuristic caching ki ijazat deta hai. Cache se serve clicks origin analytics mein chhoot sakte hain; destination badle toh purani mapping chal sakti hai. Cache policy ke bina kabhi badal nahi sakta kehna galat hai.' },
          ],
        },
        {
          id: 'viral', label: 'Ek link viral ho gaya — 50k rps', icon: '🔥',
          options: [
            { id: 'local', label: "Local cache aur safe read copies se load baanto", score: 3, why: 'Local cache viral key ki repeated reads app memory se de sakta hai; 99.9% hit rate guarantee nahi. Copies reads baant sakti hain. 1 second ki staleness updates ya abuse takedown ke budget mein fit honi chahiye.' },
            { id: 'nodes', label: "Shards jodo; hot key ka ek owner hi rakho", score: -2, why: 'Agar hot key ka ek owner hai toh naye shards akela load nahi baantte. Routing, read copies ya local cache badalna padega.' },
            { id: 'rate', label: "Popular link ke valid users par hi throttle lagaao", score: -3, why: 'Diya burst valid users ka hai. Capacity baantne ke bajaay popular link throttle karne se sahi redirects rukenge. Emergency overload mein admission ya abuse limits phir bhi zaroori ho sakti hain.' },
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
          q: 'Unique counter allocation tay hai. Random code ke muqaable kaunsa kaam bachta hai?',
          choices: [
            'Unique, pakka counter aur base62 se random collisions ki retries bachti hain',
            'Base62 mein badalte hi agla sequential code guess karna mushkil ho jaata hai',
            'Random code ke liye pehle SELECT lena hi padega; UNIQUE insert kaam nahi karega',
            'Counter se code nikla toh crash recovery aur namespace reuse ki jaanch chhod do',
          ],
          answer: 0,
          explain: 'Counter ka allocation durable aur alag ranges mein ho; namespace khatam ya reuse na ho. Base62 ek ID ko ek code deta hai, toh random collision retries nahi chahiye. Random code plus atomic UNIQUE insert/retry bhi sahi ho sakta hai. Counter ki predictability aur recovery ka kharcha rehta hai.',
          choiceExplanations: [
            'Counter ka allocation durable aur alag ranges mein ho; namespace khatam ya reuse na ho. Base62 ek ID ko ek code deta hai, toh random collision retries nahi chahiye. Random code plus atomic UNIQUE insert/retry bhi sahi ho sakta hai. Counter ki predictability aur recovery ka kharcha rehta hai.',
            'Base62 encoding ulat sakte ho. Sequential ID ko secret banaane ka vaada base62 nahi deta.',
            'Random code ko seedha UNIQUE insert karke clash par retry kar sakte ho. SELECT pehle lena zaroori nahi.',
            'Counter reset ya range reuse ho toh purane codes takra sakte hain. Durability aur namespace guard chahiye.',
          ],
        },
        {
          q: 'Click analytics chahiye. Redirect ke waqt kya karoge?',
          choices: [
            'Redirect par analytics ki wait baandho; event loss ya durable handoff ka niyam rakho',
            'Redirect se pehle DB mein click count +1 karo — ek chhota write redirect dheema nahi karta',
            'Queue ko event de diya toh delivery pakki maano; crash aur full queue mat jaancho',
            'Consumers ki backlog badhe toh chhod do; analytics ke liye retention mat socho',
          ],
          answer: 0,
          explain: 'Tez redirects ke liye analytics ka kaam aam taur par alag consumers karte hain. Event dene ki wait aur overload ka niyam rakho. Kuch clicks khona manzoor hai ya durable handoff chahiye, saaf karo. Sync update bhi SLO mein fit ho sakta hai; kharcha naapna padega.',
          choiceExplanations: [
            'Tez redirects ke liye analytics ka kaam aam taur par alag consumers karte hain. Event dene ki wait aur overload ka niyam rakho. Kuch clicks khona manzoor hai ya durable handoff chahiye, saaf karo. Sync update bhi SLO mein fit ho sakta hai; kharcha naapna padega.',
            'Sync write dependency aur wait jodti hai. Tail latency aur hot-row contention naapna padega.',
            'Event durable hua ya sirf memory mein tha? Queue full ho toh kya hoga? Handoff aur recovery saaf honi chahiye.',
            'Consumers peeche rahein toh data retention paar kar sakta hai. Lag aur event age par nazar chahiye.',
          ],
        },
        {
          q: 'Sequential allocation se 6 billion alag URLs rakhne hain. Base62 ki minimum fixed width?',
          choices: [
            '6 characters; 62 ki power 6 mein lagbhag 56.8 billion codes aate hain',
            '5 characters; 62 ki power 5 mein lagbhag 9.16 billion codes aate hain',
            '4 characters; 62 ki power 4 mein lagbhag 14.8 billion codes aate hain',
            '3 characters; 62 ki power 3 mein lagbhag 23.8 billion codes aate hain',
          ],
          answer: 0,
          explain: '62 ki power 5 = 916,132,832, yani lagbhag 0.916 billion. 62 ki power 6 = 56,800,235,584, yani lagbhag 56.8 billion. 6 billion alag IDs ke liye minimum fixed width 6 hai. Lesson ka 7-character code extra jagah deta hai. Random codes ka collision risk alag hisaab hai.',
          choiceExplanations: [
            '62 ki power 5 = 916,132,832, yani lagbhag 0.916 billion. 62 ki power 6 = 56,800,235,584, yani lagbhag 56.8 billion. 6 billion alag IDs ke liye minimum fixed width 6 hai. Lesson ka 7-character code extra jagah deta hai. Random codes ka collision risk alag hisaab hai.',
            '5 characters mein 0.916 billion codes aate hain, 9.16 billion nahi. 6 billion IDs fit nahi hoti.',
            '4 characters mein 14,776,336 codes aate hain, yani lagbhag 0.0148 billion. 6 billion se bahut kam.',
            '3 characters mein 238,328 codes aate hain, 23.8 billion nahi. Capacity ka scale galat hai.',
          ],
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
          'Alias, expiry aur retention saaf karo; read:write ratio aur redirect SLO poochho',
          'Hash ka algorithm (base62 ya MD5) sabse pehle chuno — design ka dil wahi hai',
          'Read-heavy bolkar writes ki durability chhod do; sirf redirect cache par dhyaan do',
          'Services ki ginti pehle pakki karo; scale aur user requirements baad mein poochho',
        ],
        answer: 0,
        explain: 'User ka kaam, URL ki retention aur redirect ka target saaf karo. 100:1 ratio read path par dhyaan dilaata hai; mappings ki durable writes phir bhi chahiye. Custom alias, expiry, analytics aur abuse ke niyam code aur cache ka design badal sakte hain.',
        choiceExplanations: [
          'User ka kaam, URL ki retention aur redirect ka target saaf karo. 100:1 ratio read path par dhyaan dilaata hai; mappings ki durable writes phir bhi chahiye. Custom alias, expiry, analytics aur abuse ke niyam code aur cache ka design badal sakte hain.',
          'Alias aur collision ke niyam ID strategy ko badal sakte hain. Algorithm pehle tay mat karo.',
          'URL mapping kho gayi toh redirect toota. Kam writes ki durability bhi zaroori hai.',
          'Services requirements ka nateeja hain. Ginti pehle chunne se faayda saabit nahi hota.',
        ],
      },
      {
        q: '"Custom alias chahiye — /my-campaign. Ab kya badla?"',
        choices: [
          'UNIQUE insert se alias reserve karo; clash par 409 aur reserved paths ka niyam',
          'Pehle alias khaali hai dekho; phir bina UNIQUE shart alag insert kar do',
          'Alias ka hash banao aur user ko hash wala path do; maanga hua naam chhod do',
          'Counter se naye links banaao; user ke maange alias ko alag se jaanchna chhod do',
        ],
        answer: 0,
        explain: 'Do requests same alias ko khaali dekh sakti hain. Atomic UNIQUE insert se ek request jeete; doosri ko 409 do. Case sensitivity, namespace aur admin/api/login jaise reserved paths ka niyam rakho.',
        choiceExplanations: [
          'Do requests same alias ko khaali dekh sakti hain. Atomic UNIQUE insert se ek request jeete; doosri ko 409 do. Case sensitivity, namespace aur admin/api/login jaise reserved paths ka niyam rakho.',
          'Check aur insert ke beech doosri request aa sakti hai. Low latency race nahi mitaati.',
          'Custom alias ka vaada user ke chune path ka hai. Hash dene se requested public path badal gaya.',
          'Counter auto-generated codes bachaata hai. Do users same custom alias phir bhi maang sakte hain.',
        ],
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
            { id: 'zset', label: "Redis sorted set mein scores ka derived view", score: 3, why: 'Sorted set mein single-player update aur rank O(log n) hain; top-K read O(log n + K). Structure frequent rank reads ko fit karta hai; actual latency aur memory naapo.' },
            { id: 'sql', label: "SQL score index aur rank query se model banao", score: -1, why: 'SQL score index top-100 read ko tez kar sakta hai. Update hotspot distribution par nirbhar hai; COUNT-based rank bahut entries gin sakti hai. Diye update/read rates par plan aur load test karo.' },
            { id: 'sort', label: "Har request par saare scores dobara sort karo", score: -3, why: 'Har request par 50 lakh scores sort karna O(n log n) kaam hai. 50,000 rps target par cost bhaari hogi; indexed ya rank-aware structure se tulna karo.' },
          ],
        },
        {
          id: 'rank', label: '"Meri rank kya hai"', icon: '📊',
          options: [
            { id: 'zrank', label: "ZREVRANK se score aur tie-order wali exact rank", score: 3, why: 'ZREVRANK rank-aware structure se member ki zero-based position deta hai. Equal scores reverse lexicographic member order mein aate hain; shared ranks chahiye hon toh alag rule banao.' },
            { id: 'count', label: "SQL se apne score se upar waale count karo", score: -3, why: 'Player se upar lakhon matches hon toh COUNT mehenga ho sakta hai. Har rank read ki frequency aur actual query plan naapo.' },
            { id: 'approx', label: "Score buckets se sirf approximate rank do", score: 1, why: 'Approximate rank tab valid hai jab product manzoor kare. Is exercise mein exact rank chahiye, isliye pehle ZREVRANK ka fit dekho; 5 crore ka koi universal cutoff nahi.' },
          ],
        },
        {
          id: 'windows', label: 'Daily / weekly / all-time', icon: '🗓️',
          options: [
            { id: 'keys', label: "Daily, weekly aur all-time ki alag score keys", score: 2, why: 'Daily, weekly aur all-time scores ki alag keys window reads aasan karti hain. Sirf purani daily/weekly keys ko expiry do; all-time ka TTL nahi. Teen updates ka load aur duplicate events sambhaalo.' },
            { id: 'query', label: "Bina time history ek hi total score set rakho", score: -2, why: 'Sorted set score par sorted hai, time par nahi — "aaj ke scores" filter karne ka koi sasta tareeka hai hi nahi. Window alag key hi honi chahiye.' },
          ],
        },
        {
          id: 'durable', label: 'Redis gir gaya toh', icon: '💾',
          options: [
            { id: 'source', label: "Durable scores se Redis view dobara banao", score: 2, why: 'Sahi rishta: DB source of truth, Redis ek tez read structure. Redis gira toh leaderboard thodi der ke liye gaya, <b>scores nahi</b>. Rebuild ek job hai.' },
            { id: 'aof', label: "Sirf AOF rakho; recovery drill chhod do", score: -1, why: 'AOF persistence deta hai, par config, fsync, replica lag aur failover se data-loss window badalti hai. Sirf AOF hone se recovery tested nahi. Diye durable-source design mein Redis ko rebuild karna saaf raasta hai.' },
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
          q: 'SQL ki COUNT(score > mera score) query bahut matches ginti hai. Kaunsa kaam mehenga hai?',
          choices: [
            'COUNT se apne score se upar ki bahut entries ginna mehenga ho sakta hai',
            'Top 100 ke liye score index ho tab bhi poori table sort karni padegi',
            'Ek score update par har doosre player ka score bhi badalna padega',
            'Naya player insert ho toh har rank ko usi waqt DB mein likhna padega',
          ],
          answer: 0,
          explain: 'Di hui COUNT query ko player se upar ke bahut scores ginne padte hain. Score index top-K read aur update mein madad kar sakta hai. Exact rank ka kharcha query, distribution aur DB plan par naapo; har operation full scan nahi.',
          choiceExplanations: [
            'Di hui COUNT query ko player se upar ke bahut scores ginne padte hain. Score index top-K read aur update mein madad kar sakta hai. Exact rank ka kharcha query, distribution aur DB plan par naapo; har operation full scan nahi.',
            'Matching score index top entries seedha de sakta hai. Har top-K read ko poora sort nahi chahiye.',
            'Ek player ka score badalne se doosre players ke score nahi badalte. Index update ka kharcha alag hai.',
            'Har rank ko alag store karna design ka faisla hai. Insert apne aap sab ranks ki writes nahi maangta.',
          ],
        },
        {
          q: 'Redis sorted set rank ko O(log n) mein kaise deta hai?',
          choices: [
            'Skip list ke span counts se kuch jumps mein rank jod sakte hain',
            'Data RAM mein hai, isliye kitne bhi players hon har kaam ek step leta hai',
            'Sirf score ke saath player ki ID rakhi hai, order ka koi record nahi chahiye',
            'Ek badi unsorted array rakhkar bina scan har player ki rank mil jaati hai',
          ],
          answer: 0,
          explain: 'Bade sorted set mein skip list ke jumps par span hota hai: jump kitni entries paar karta hai. Search ke dauraan spans jodkar rank nikalti hai, O(log n). Chhote sets ka compact encoding alag ho sakta hai. Sirf RAM mein hona algorithm ko O(1) nahi banaata.',
          choiceExplanations: [
            'Bade sorted set mein skip list ke jumps par span hota hai: jump kitni entries paar karta hai. Search ke dauraan spans jodkar rank nikalti hai, O(log n). Chhote sets ka compact encoding alag ho sakta hai. Sirf RAM mein hona algorithm ko O(1) nahi banaata.',
            'RAM disk wait ghata sakti hai. Kitne steps lagenge, data structure se tay hota hai.',
            'Rank ke liye ordering aur span jaisa structure chahiye. ID aur score ka lookup akela rank nahi deta.',
            'Unsorted array mein arbitrary rank ke liye doosre scores dekhne padenge. Order aur indexing ka record chahiye.',
          ],
        },
        {
          q: '5 crore players ho gaye. Sabse pehle kya karoge?',
          choices: [
            'Exact rank kin players ko chahiye, kitna update load hai aur kitna lag chalega?',
            'Redis cluster jodo; ek key ki poori global rank bina extra kaam bant jaayegi',
            'RAM badhaao; shards ke beech rank jodne ka kaam bhi apne aap hat jaayega',
            'Har player ki rank cache karo; doosron ke scores badlein toh invalidate mat karo',
          ],
          answer: 0,
          explain: 'Pehle product se exact rank, top-K aur taazgi ka vaada saaf karo. Kuch products mein baaki players ko percentile kaafi ho sakta hai; har player ke liye sach maan lena galat hai. Ek sorted set key ko cluster apne aap global rank ke saath nahi baantta.',
          choiceExplanations: [
            'Pehle product se exact rank, top-K aur taazgi ka vaada saaf karo. Kuch products mein baaki players ko percentile kaafi ho sakta hai; har player ke liye sach maan lena galat hai. Ek sorted set key ko cluster apne aap global rank ke saath nahi baantta.',
            'Ek key ka set aur shards ke beech global order alag problems hain. Rank aggregate karne ka plan chahiye.',
            'RAM capacity ki ek hadd hai. CPU, skew aur cross-shard rank ka kaam phir bhi reh sakta hai.',
            'Doosre players ka score badle toh cached rank purani ho sakti hai. Freshness aur invalidation chahiye.',
          ],
        },
      ],
    },
    {
      type: 'match',
      title: 'Redis structures',
      pairs: [
        { left: 'Leaderboard, top-K, rank', right: 'Sorted set (ZSET)', explain: 'Score par sorted, aur rank O(log n). Sorted set is problem ke liye hi bana hai.' },
        { left: 'Session data, user profile cache', right: 'Hash (HSET)', explain: 'Ek object ke fields alag-alag padhe/likhe ja sakte hain — poora JSON serialize karne se behtar.' },
        { left: '"Aaj kitne unique visitors"', right: 'HyperLogLog (PFADD)', explain: '12 KB mein, chahe kitne bhi ho. Aur PFMERGE se alag servers ke counts jud jaate hain.' },
        { left: 'Rate limiting — pichhle 60s mein kitni requests', right: 'Sorted set (timestamp as score) ya counter with TTL', explain: 'Sliding window ke liye ZSET mein timestamps rakh ke purane <code>ZREMRANGEBYSCORE</code> se hata do. Fixed window ke liye ek INCR + EXPIRE kaafi hai aur bahut sasta hai.' },
        { left: 'Distributed lock / seat hold', right: 'SET key val NX EX', explain: 'Atomic "sirf tab banao jab na ho" + apne aap expire. Reservation pattern ki ek line.' },
        { left: 'Recent activity feed (aakhri 100)', right: 'List (LPUSH + LTRIM)', explain: 'Aage se daalo, 100 par kaat do. Rolling buffer ka sabse sasta roop.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Leaderboard',
    instructions: 'Yahan structure ka naam lena hi aadha jawab hai. 🎤',
    questions: [
      {
        q: 'Realtime leaderboard mein Redis projection ka poora contract kya hoga?',
        choices: [
          'Sorted set se reads; durable scores ya log se Redis rebuild ka plan',
          'Top-K ki poori list bhi O(log n) hai — kitne bhi players lautao, kharcha wahi',
          'SQL mein leaderboard mumkin nahi bolo; access pattern aur indexes mat dekho',
          'Redis ko fast dekho; score audit aur crash ke baad recovery ka kaam chhodo',
        ],
        answer: 0,
        explain: 'ZADD ka single-player update aur ZREVRANK O(log n) hain. M players ki range read O(log n + M) hai. Durable score source ya event log se rebuild saaf karo. SQL bhi kuch workloads mein SLO poora kar sakta hai; tool ka naam akela saboot nahi.',
        choiceExplanations: [
          'ZADD ka single-player update aur ZREVRANK O(log n) hain. M players ki range read O(log n + M) hai. Durable score source ya event log se rebuild saaf karo. SQL bhi kuch workloads mein SLO poora kar sakta hai; tool ka naam akela saboot nahi.',
          'M players lautaane ka kaam bhi hai. Range read ka kharcha O(log n + M) hai.',
          'SQL score index, aggregates ya rank view se fit ho sakta hai. Actual load aur queries naapo.',
          'Tez projection lost scores ya cheating ki jaanch nahi suljhaati. Authority aur recovery ka plan chahiye.',
        ],
      },
      {
        q: '"Ab 5 crore players. Kya badlega?"',
        choices: [
          'Exact rank aur top-K ki zaroorat dobara jaancho; partition ka kharcha naapo',
          'Players 5 crore hue toh Cassandra pakka lo; queries aur update load chhodo',
          'Top-1000 cache banaao; poori list ki kisi bhi rank ka exact jawab mil jaayega',
          'Set ko shards mein baanto; har shard ki local rank ko seedha global rank bolo',
        ],
        answer: 0,
        explain: '5 crore players akela engine ka faisla nahi karta. Data ke bytes, updates, reads aur rank ki exactness dekho. Top-K ki alag read copy faayda de sakti hai. Arbitrary global rank ke liye shards ke paar scores/order jodne ka kaam chahiye.',
        choiceExplanations: [
          '5 crore players akela engine ka faisla nahi karta. Data ke bytes, updates, reads aur rank ki exactness dekho. Top-K ki alag read copy faayda de sakti hai. Arbitrary global rank ke liye shards ke paar scores/order jodne ka kaam chahiye.',
          'Cardinality ke saath memory, traffic, queries aur recovery dekho. Ek threshold akela Cassandra nahi chunta.',
          'Top-1000 mein baaki players ka poora order nahi hai. Top-K cache arbitrary exact rank nahi bataata.',
          'Har shard mein player ki position poore set ki position nahi. Cross-shard aggregation chahiye.',
        ],
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
     <pre>watermark 10s  →  jaldi natija, ~2.7% events chhoot gaye (simulator: 4% late)
watermark 60s  →  simulator mein 0 chhoote, par har number 1 minute der se
                  (asli stream mein kuch events phir bhi late aa sakte hain)</pre>
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
            { id: 'kafka', label: "Retained log se replay aur alag consumers", score: 3, why: 'Retained log billing dispute par replay aur alag consumers ko apne offsets deta hai. Processor rukne par events retention tak bachte hain; retention, durable ingest aur backlog par nazar chahiye.' },
            { id: 'db', label: "Har click seedha DB mein sync insert karo", score: -3, why: '10 lakh sync inserts/sec ko schema aur hardware par naapo. Slow DB ko ingest se sync baandhne par API wait badhega. Bounded buffer, admission aur recovery ka plan chahiye.' },
            { id: 'sqs', label: "Consume ke baad delete wali worker queue", score: -1, why: 'Delete-on-consume queue workers ko jobs baant sakti hai. ACK/delete ke baad retained history nahi; replay ya fraud ko independent copy dene ke liye alag archive/fanout chahiye.' },
          ],
        },
        {
          id: 'time', label: 'Kis waqt se ginna', icon: '⏱️',
          options: [
            { id: 'event', label: "Click ke event time se gino; late events sambhaalo", score: 3, why: 'Click jab HUA tab ka minute. Mobile clicks late aate hain, aur processing time se ginne par campaign ke aakhri minute ke clicks agle minute mein chale jaate hain — jo seedha bill galat karta hai.' },
            { id: 'proc', label: "Processor ke current waqt se click ka minute lo", score: -2, why: 'Is billing rule mein click hone ka minute chahiye. Processing time late mobile click ko agle minute mein rakh sakta hai; slow-network traffic par bias aa sakta hai.' },
          ],
        },
        {
          id: 'dedup', label: 'Duplicate clicks', icon: '🔁',
          options: [
            { id: 'both', label: "Click ID ka exact dedup; Bloom pehla chhanna", score: 3, why: 'At-least-once mein duplicates mumkin hain. Stable click ID se exact dedup karo. Bloom positive par exact store jaancho; false positive par asli click girna bill ko ghata sakta hai.' },
            { id: 'bloomonly', label: "Bloom positive ho toh bina exact check phenk do", score: -2, why: 'False positive ka matlab yahan ek asli click ko duplicate samajh ke <b>girana</b> hai. Analytics mein chalta, billing mein nahi.' },
            { id: 'none', label: "Har dobara delivery ko naya click gin lo", score: -3, why: 'Crash se offset commit chhoot gaya toh processed clicks dobara mil sakte hain. Dedup bina counts aur bill badh sakte hain; dugna bill har case mein zaroori nahi.' },
          ],
        },
        {
          id: 'exact', label: 'Billing ke liye numbers', icon: '💰',
          options: [
            { id: 'lambda', label: "Live view ke saath exact correction aur milaan", score: 3, why: 'Dashboard ki freshness aur exact bill ke liye correction alag zarooratein hain. Live stream plus raw-record reconciliation ek hal hai; exact streaming/recovery bhi valid ho sakti hai.' },
            { id: 'stream', label: "Sirf stream total; late corrections ka raasta nahi", score: -1, why: 'Label mein correction ka raasta nahi hai. Watermark ke baad chhoote events ya duplicate effects total mein galat reh sakte hain; replay aur milaan ke bina dispute sulajhna mushkil hai.' },
            { id: 'batch', label: "Sirf daily batch; live dashboard ka raasta nahi", score: -1, why: 'Numbers sahi honge par dashboard 24 ghante purana — jo requirement (&lt; 1 min) ke bilkul khilaaf hai. Advertisers live campaign band nahi kar paayenge.' },
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
          q: 'Is product mein billing exact click counts par hoti hai. Design mein kya chahiye?',
          choices: [
            'Billable click ki definition, dedup aur correction ka audit wala record chahiye',
            'Dashboard ka approximate total seedha invoice banao; exact milaan chhod do',
            'Watermark paar hote hi window ke saare clicks pakke aur poore ho jaate hain',
            'Replicas badhaao; ek event do baar process ho toh bhi effect ek hi maan lo',
          ],
          answer: 0,
          explain: 'Is product mein bill ke liye exact billable-click count chahiye. Kaunsa click, kaunsa time window aur duplicate ka niyam saaf karo. Raw records se correction aur reconciliation ho sake. Dashboard mein approximation tabhi chale jab product manzoor kare.',
          choiceExplanations: [
            'Is product mein bill ke liye exact billable-click count chahiye. Kaunsa click, kaunsa time window aur duplicate ka niyam saaf karo. Raw records se correction aur reconciliation ho sake. Dashboard mein approximation tabhi chale jab product manzoor kare.',
            'Approximate dashboard ka contract bill se alag hai. Manzoori bina approximate total ko invoice mat banao.',
            'Watermark time ki progress ka signal hai. Had se late clicks phir bhi aa sakte hain; correction ka plan chahiye.',
            'Replica galat ya duplicate effect bhi copy kar sakta hai. Deduplication alag design karni hai.',
          ],
        },
        {
          q: 'Partition key <code>ad_id</code> chuna. Kaunsa khatra bacha hai?',
          choices: [
            'Viral ad ka bahut traffic ek partition par jam sakta hai; skew naapo',
            'Achha hash chuno; har ad ke traffic ki popularity phir barabar ho jaayegi',
            'Same ad_id chuno; alag ads ke beech bhi ek global event order mil jaayega',
            'Consumers ki ginti badhaao; ek partition ke records apne aap kai workers baant lenge',
          ],
          answer: 0,
          explain: 'ad_id se ek ad ka kaam ek partition par jama ho sakta hai. 40% traffic ek ad ka ho toh hot partition banta hai. Zaroorat par ad ki key ke subkeys banao, partial counts jodo; poore ad ka single order chahiye ho toh tradeoff jaancho.',
          choiceExplanations: [
            'ad_id se ek ad ka kaam ek partition par jama ho sakta hai. 40% traffic ek ad ka ho toh hot partition banta hai. Zaroorat par ad ki key ke subkeys banao, partial counts jodo; poore ad ka single order chahiye ho toh tradeoff jaancho.',
            'Hash alag keys baant sakta hai, ek popular key ke requests ko barabar nahi karta.',
            'Ordering partition ke andar hai. Alag partitions ke ads ka global order nahi milta.',
            'Classic consumer group mein ek partition ek consumer ko assigned hota hai. Bina repartition ke extra consumers hot partition nahi baantte.',
          ],
        },
        {
          q: 'Watermark delay 10 s se 60 s kiya. Billing correctness ke liye kya jaanchoge?',
          choices: [
            'Kam late data chhoot sakta hai, par wait/state badhegi; billing ka milaan rakho',
            '60 s tak intezaar kiya toh aur late click aa hi nahi sakta, correction chhod do',
            'Zyada intezaar se purana state turant chhootega, memory ka kharcha zero maan lo',
            'Window der se band hogi, isliye duplicate click IDs bhi intezaar mein hat jaayenge',
          ],
          answer: 0,
          explain: 'Watermark delay 10 s se 60 s karne par der se aaye aur events window mein aa sakte hain. Natija der se mil sakta hai aur state zyada der tik sakti hai. 60 s ke baad bhi clicks aa sakte hain; bill ke liye definition, dedup aur correction ka record chahiye. Raat ka batch ek hal hai, akela hal nahi.',
          choiceExplanations: [
            'Watermark delay 10 s se 60 s karne par der se aaye aur events window mein aa sakte hain. Natija der se mil sakta hai aur state zyada der tik sakti hai. 60 s ke baad bhi clicks aa sakte hain; bill ke liye definition, dedup aur correction ka record chahiye. Raat ka batch ek hal hai, akela hal nahi.',
            'Network, source ya backpressure ki der 60 s paar kar sakti hai. Watermark late events na hone ka proof nahi.',
            'Zyada wait ka matlab state zyada der rakhna ho sakta hai. Memory zero hone ka nateeja nahi.',
            'Late arrival aur duplicate alag baatein hain. Same click ID do baar aa sakti hai.',
          ],
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
          'Retained log, event-time windows, dedup, hot-ad split aur correction path',
          'Har ad_id ko ek key rakho; hashing se har partition ka load barabar maano',
          'Minute GROUP BY query banao; raw data aur window state ka kharcha chhod do',
          'Raw events archive karo; online counter ko bina dedup exact maan lo',
        ],
        answer: 0,
        explain: 'Log se replay, event time se click ke minute ka count aur stable click_id se dedup rakho. Hot ad ki key todni pade toh partial counts merge karo. Raw records aur correction path se bill ka milaan ho. Sink mein retries se repeat counts bhi roko.',
        choiceExplanations: [
          'Log se replay, event time se click ke minute ka count aur stable click_id se dedup rakho. Hot ad ki key todni pade toh partial counts merge karo. Raw records aur correction path se bill ka milaan ho. Sink mein retries se repeat counts bhi roko.',
          'Viral ad ek key par bahut traffic la sakta hai. Hash key popularity nahi mitaata.',
          'Grouped count mein data, scan aur state ka kharcha hai. Load aur retention ka plan chahiye.',
          'Archive dobara ginti ka source hai. Online pipeline ke duplicate aur late events alag sambhaalne hain.',
        ],
      },
      {
        q: 'Advertiser ka count apne count se 3% zyada hai. Jaanch kaise karoge?',
        choices: [
          'Click definition, time bounds aur raw IDs milaao; farak ko groups mein baanto',
          'Advertiser ka total sahi maano; raw records ka milaan kiye bina apna count badlo',
          'Seedha 3% adjustment jodo; karan aur audit ka record baad ke liye chhod do',
          'Sirf watermark badhaao; fraud filters aur dedup ke farak ko jaanchna chhod do',
        ],
        answer: 0,
        explain: 'Dono taraf billable click ki definition, timezone, time bounds aur fraud rules milaao. Phir raw click IDs se sirf apne, sirf advertiser ke aur alag fields wale records dhoondo. Ingest loss, late events aur dedup ko saboot se alag karo; 3% se karan pakka nahi hota.',
        choiceExplanations: [
          'Dono taraf billable click ki definition, timezone, time bounds aur fraud rules milaao. Phir raw click IDs se sirf apne, sirf advertiser ke aur alag fields wale records dhoondo. Ingest loss, late events aur dedup ko saboot se alag karo; 3% se karan pakka nahi hota.',
          'Advertiser ki definition ya logs bhi alag ho sakte hain. Evidence bina ek total ko sahi mat maano.',
          'Adjustment se total mil sakta hai, asli missing ya duplicate clicks chhip jaayenge.',
          'Watermark ek sambhaavit karan hai. Definitions, ingestion aur dedup bhi farak bana sakte hain.',
        ],
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
     <p>5 lakh log seat map dekh rahe hain, par sirf 200 seats bik sakti hain.
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
            { id: 'room', label: "Waiting room: capacity ki hadd aur honest ETA", score: 3, why: 'Waiting room se admission baandh sakte ho aur ETA user ko faisla lene deta hai. Refresh kam ho sakte hain, par retry storm ka vaada nahi; client backoff aur server limits bhi chahiye.' },
            { id: 'scale', label: "Sirf pre-scale karo; admission ki hadd mat rakho", score: 0, why: 'Pre-scaling zaroori hai (autoscaling 10 second mein kuch nahi kar sakti) — par akela kaafi nahi. 5 lakh log 200 seats ke liye hain; capacity ka koi bhi number us ganit ko nahi badal sakta.' },
            { id: 'shed', label: "Excess reject karo; wait ya retry ka signal na do", score: -1, why: 'Sirf 503 se wait ka pata nahi chalta. Users retry kar sakte hain; Retry-After, client backoff aur jitter do. Load kitna badhega, naapna padega.' },
          ],
        },
        {
          id: 'hold', label: 'Seat pakadna', icon: '🎟️',
          options: [
            { id: 'res', label: "Owner/token wala atomic hold, expiry ke saath", score: 3, why: 'Hold chhota atomic claim hai; expiry abandoned checkout ko reclaim karne deti hai. Redis NX EX akela double sale ka poora proof nahi. Final durable sale owner/token/state/expiry se guarded ho.' },
            { id: 'lock', label: "Human checkout tak DB row lock khula rakho", score: -3, why: '10 minute ka DB lock connection aur transaction resources rok sakta hai. Browser crash ke baad bhi server timeout ya rollback tak kharcha reh sakta hai.' },
            { id: 'opt', label: "Payment ke waqt optimistic seat claim retry karo", score: -1, why: 'Optimistic guarded sale double booking rok sakti hai. Par payment pehle hua aur claim haara toh refund/rebooking chahiye; pehle hold dene se conflict jaldi pata chal sakta hai.' },
          ],
        },
        {
          id: 'map', label: 'Seat map (5 lakh log dekh rahe hain)', icon: '👀',
          options: [
            { id: 'cache', label: "Hadd wala stale map, chhote status updates", score: 3, why: 'Same event ka map cache se serve karke reads ka boj ghata sakte ho. Staleness ka UX budget saaf ho; seat claim authority par atomically jaancho aur sold seat ka saaf jawab do.' },
            { id: 'live', label: "Har view par source se poora seat map padho", score: -3, why: '5 lakh viewers baar-baar full map DB se padhein toh read load booking ke saath resources baantega. Exact query rate polling interval se nikalo; cache aur partial updates ka fit dekho.' },
            { id: 'ws', label: "Har connection par poora map broadcast karo", score: -1, why: 'Updates ke liye push sahi hai, par 5 lakh connections is ek page ke liye bahut bhaari hain — aur initial map toh phir bhi cache se hi aana chahiye.' },
          ],
        },
        {
          id: 'confirm', label: 'Payment ke baad confirm', icon: '✅',
          options: [
            { id: 'txn', label: "Guarded DB sale aur booking, stable payment ID", score: 3, why: 'Seat sale, booking aur stable payment ID local DB transaction mein saath likho; durable hold owner/token/expiry jaancho. External payment aur Redis release ko DB transaction ke andar atomic mat maano; retries aur recovery ka plan chahiye.' },
            { id: 'steps', label: "Seat sale aur booking ko alag writes mein karo", score: -2, why: 'Alag writes ke beech crash ho toh sold seat ki booking missing ho sakti hai. Local DB mein guarded sale aur booking saath commit karo.' },
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
            'Waiting room load baandhta hai; ek seat par race ke liye atomic claim chahiye',
            'Waiting room mein token mil gaya toh pasand ki seat bhi reserve ho gayi',
            'Ek batch andar aaya toh same seat ke do requests ab saath nahi aa sakte',
            'Queue ka order sahi hai toh retries par nayi booking banna alag risk nahi',
          ],
          answer: 0,
          explain: 'Waiting room capacity par admission baandhta hai. Andar aaye users same seat saath maang sakte hain. Authoritative hold aur final sale ko owner, expiry aur state ki atomic shart se bachao. Load aur contention alag problems hain.',
          choiceExplanations: [
            'Waiting room capacity par admission baandhta hai. Andar aaye users same seat saath maang sakte hain. Authoritative hold aur final sale ko owner, expiry aur state ki atomic shart se bachao. Load aur contention alag problems hain.',
            'Queue token andar aane ka haq hai, seat ka claim nahi. Seat inventory alag bachaani hai.',
            'Batch ke do users, tabs ya retries same seat ek saath maang sakte hain.',
            'Queue order duplicate retry ko naya business effect banaane se nahi rokta. Stable IDs chahiye.',
          ],
        },
        {
          q: '10-minute hold ke 3 minute baad payment confirmed aaya. Final sale par kya jaanchoge?',
          choices: [
            'Hold ka owner, token, state, expiry aur payment intent atomically jaancho',
            'Payment success ho toh expired hold bhi sahi maano; seat ka owner mat dekho',
            'Webhook dobara aaye toh nayi booking banao — har webhook ek naya payment hota hai',
            'Redis mein TTL baaki dikhe toh DB ki sale shart chhodo; cache kaafi maano',
          ],
          answer: 0,
          explain: 'Final sale par durable authority mein hold ka owner/token, expiry aur state jaancho. Stable payment/booking ID se transition idempotent ho. External charge local DB transaction mein apne aap nahi aata. Hold chhoot gaya aur charge ho gaya toh refund/rebooking ka saaf raasta chahiye.',
          choiceExplanations: [
            'Final sale par durable authority mein hold ka owner/token, expiry aur state jaancho. Stable payment/booking ID se transition idempotent ho. External charge local DB transaction mein apne aap nahi aata. Hold chhoot gaya aur charge ho gaya toh refund/rebooking ka saaf raasta chahiye.',
            'Expiry ke baad seat doosre hold ko mil sakti hai. Payment success purana haq wapas nahi deta.',
            'Repeated webhook same payment ka ho sakta hai. Stable ID se purana result do, doosri booking mat banao.',
            'Cache check aur DB write ke beech expiry ya sale ho sakti hai. Authoritative atomic guard chahiye.',
          ],
        },
        {
          q: 'Map 2 second purana tha; click par seat sold nikli. Correctness kahan bachaoge?',
          choices: [
            'Map ki staleness bound ho; payment se pehle authoritative claim jaanche',
            'Map cached hai toh same seat do logon ko bechna bhi acceptable maan lo',
            'Map instant taaza dikhao; final sale par atomic check ki zaroorat chhod do',
            'Charge ke baad seat na mile toh chhupaao; sirf map refresh karwa do',
          ],
          answer: 0,
          explain: 'Product manzoor kare toh map 2 second purana ho sakta hai. Claim ko authority par atomically jaancho aur conflict jaldi saaf dikhaao. Conflict rate aur UX ka nuksaan naapo. Payment ke baad mismatch ho toh recovery dikhaani hai; stale map double sale ki ijazat nahi.',
          choiceExplanations: [
            'Product manzoor kare toh map 2 second purana ho sakta hai. Claim ko authority par atomically jaancho aur conflict jaldi saaf dikhaao. Conflict rate aur UX ka nuksaan naapo. Payment ke baad mismatch ho toh recovery dikhaani hai; stale map double sale ki ijazat nahi.',
            'Display stale hona aur seat ko do baar bechna alag baatein hain. Sale invariant phir bhi bachna chahiye.',
            'Do users same fresh map dekhkar ek seat maang sakte hain. Instant map race nahi mitaata.',
            'User ka paisa aur booking alag hon toh visible refund/rebooking aur reconciliation chahiye.',
          ],
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
          text: '70 seats kabhi bike hi nahi, par seats "unavailable" dikh rahi thi. Pehla shak?',
          choices: [
            { t: "Purane holds ki age aur expiry jaancho", good: true, next: 't2', explain: 'Hold bana, checkout chhoota aur hold release nahi hua — stale hold ka seedha shak hai. Authority mein hold age, owner, payment state aur expiry milaao.' },
            { t: "Bina hold jaanche payment errors ko wajah maano", good: false, explain: 'Payment fail hone ke baad expiry/recovery se seat milni chahiye. Sirf payment errors ko wajah maan lene se atke hold ki jaanch chhootegi.' },
            { t: "Bina source jaanche map cache ko wajah maano", good: false, explain: 'Map cache stale ho sakta hai, isliye cache aur authoritative seat state milaao. Cache ki configured taazgi jaanche bina saari unavailable seats ko cache ka masla mat maano.' },
          ],
        },
        t2: {
          text: 'Holds Redis mein bane the — par code ne TTL ke bina SET kiya tha. Turant kya?',
          choices: [
            { t: "Purane holds jaanchkar release; TTL rule lagao", good: true, next: 't3', explain: 'Purane holds ko owner, age aur payment state se jaanchkar guarded release/reclaim karo. Naye holds mein expiry required ho; TTL ke basic helper ke saath authority aur tests bhi rakho.' },
            { t: "Shared Redis ka poora DB flush karke saaf karo", good: false, explain: 'Poora Redis flush karne se active holds aur doosra shared data bhi mit sakta hai. Paying customers aur naye holders takra sakte hain; targeted owner-guarded reclaim chahiye.' },
            { t: "Sirf naye holds par TTL lagao; purane rehne do", good: false, explain: 'Nayi TTL writes purane non-expiring holds ko nahi badalti. Purane atke holds ko alag jaanchkar reclaim karo.' },
          ],
        },
        t3: {
          text: 'Holds theek ho gaye. Bina-expiry hold ka bug pakadne ke liye kya monitor karoge?',
          choices: [
            { t: "Hold age, expiry aur inventory milaan par alert", good: true, next: 'end', explain: 'Hold age aur missing/expired TTL ko alert banao. Available, valid-held aur sold inventory ka milaan karo; saaf HTTP 200 ke bawajood stuck inventory pakad sakte ho.' },
            { t: "Sirf Redis ki total memory ka graph dekhte raho", good: false, explain: 'Aggregate memory se hold ki validity nahi pata chalti. Chhote holds ka stale hona memory graph mein chhip sakta hai; age aur expiry seedhe dekho.' },
            { t: "Sirf HTTP error rate ka alert kaafi maan lo", good: false, explain: 'Diye bug mein requests 200 de rahi thi, isliye HTTP error rate akela signal nahi. Hold-age, missing TTL aur inventory invariant ke metrics chahiye.' },
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
          'Burst ko waiting room se baandho; seat ko durable atomic hold aur sale se bachao',
          'Redis hold ka TTL lo; expiry aur final sale ki authority ki jaanch chhod do',
          'App instances badhaao — zyada instances se same seat ka takraav kam ho jaata hai',
          'Sab log queue mein le lo; wait ki deadline aur service capacity mat baandho',
        ],
        answer: 0,
        explain: 'Flash crowd ke liye admission, pre-scale aur cached map dekho. Seat correctness ke liye durable owner/token/expiry aur atomic sale chahiye. Payment retries ko stable IDs se sambhaalo. Redis NX EX ek basic lease hai; failover aur stale holder ke against authority/recovery bhi jaancho.',
        choiceExplanations: [
          'Flash crowd ke liye admission, pre-scale aur cached map dekho. Seat correctness ke liye durable owner/token/expiry aur atomic sale chahiye. Payment retries ko stable IDs se sambhaalo. Redis NX EX ek basic lease hai; failover aur stale holder ke against authority/recovery bhi jaancho.',
          'Expiry ya failover par stale holder bacha ho sakta hai. TTL akela har sale ko ek baar nahi karaata.',
          'Zyada instances same hot seat par aur race la sakte hain. Sale ka shared atomic guard chahiye.',
          'Capacity se tez arrivals aur unlimited wait backlog badhaate hain. ETA aur deadline chahiye.',
        ],
      },
      {
        q: 'Browser crash hua, hold bach gaya. Expiry par system ka kya vaada hona chahiye?',
        choices: [
          'Expired hold reclaim ho sake; cleanup aur confirm owner/state guard se chalein',
          'DB mein expires_at column likho — DB row ko theek us pal delete kar deta hai',
          'TTL set karo; har storage system usi pal physical cleanup karega maan lo',
          'Browser exit signal ko cancel ka final proof lo; server expiry ki zaroorat chhodo',
        ],
        answer: 0,
        explain: 'Browser crash ka signal bharose layak nahi. Hold ki logical expiry par seat reclaim ho sake. Redis expiry ya DB expiry check/reaper implementation ke hisaab se use karo. Cleanup aur confirm stale hold ke token se naya hold na badlein; owner/state/expiry atomic jaancho.',
        choiceExplanations: [
          'Browser crash ka signal bharose layak nahi. Hold ki logical expiry par seat reclaim ho sake. Redis expiry ya DB expiry check/reaper implementation ke hisaab se use karo. Cleanup aur confirm stale hold ke token se naya hold na badlein; owner/state/expiry atomic jaancho.',
          'DB timestamp akela row delete nahi karta. Query, transactional reclaim ya cleanup worker chahiye.',
          'Kuch TTL systems lazily saaf karte hain. Logical validity expiry se tay ho, sirf row dikhne se nahi.',
          'Crash par exit request na aaye. Expiry server ke normal flow ka hissa honi chahiye.',
        ],
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
            { id: 'store', label: "Pehle message pakka store, phir push karo", score: 3, why: 'Push tez delivery ka raasta hai, asal record durable store hai. Offline aur multi-device recovery ke liye ordered history, permission aur cursor gap fetch bhi chahiye.' },
            { id: 'push', label: "Pehle push karo, baad mein best-effort save", score: -3, why: 'Store fail hua toh live message dikha par history mein save nahi hua. Refresh par message gayab ho sakta hai — Realtime incident ka bug.' },
            { id: 'both', label: "Push aur store alag-alag parallel chalaao", score: -1, why: 'Independent push/store mein push chal sakta hai aur store fail. Save hone se pehle durable acceptance ka vaada nahi de sakte.' },
          ],
        },
        {
          id: 'group', label: 'Group message (1000 members)', icon: '👥',
          options: [
            { id: 'read', label: "Conversation mein ek shared message body", score: 3, why: 'Diye shared-log model mein body ek baar likhti hai; members conversation se fetch karte hain. 1000 recipients ki notifications aur metadata alag costs hain. Har chat ke liye read fanout ka universal rule nahi.' },
            { id: 'write', label: "Har recipient ki inbox mein body ki copy", score: -1, why: 'Har inbox mein body ki copy likhne se storage aur write amplification badhti hai. Kuch delivery ya encryption contracts mein layout valid ho sakta hai; is exercise ke shared-log choice se costs milaao.' },
          ],
        },
        {
          id: 'sync', label: 'Multi-device sync', icon: '📱',
          options: [
            { id: 'cursor', label: "Har device ka cursor aur history gap fetch", score: 3, why: 'Ordered history ka per-device cursor offline aur multi-device gap fill mein reuse ho sakta hai. Device keys, membership aur delivered/read state phir bhi alag define karo.' },
            { id: 'perdevice', label: "Har device ke liye poori history ki copy", score: -2, why: 'Har device ki poori body copy se teen devices par body storage/writes lagbhag 3x ho sakti hain. Encryption aur metadata ka cost alag hai; shared history aur cursor copies ka boj ghata sakte hain.' },
          ],
        },
        {
          id: 'conn', label: 'Connection layer', icon: '🔌',
          options: [
            { id: 'gw', label: "Sockets ke liye alag gateway tier scale karo", score: 2, why: '50k sockets/node ek example maapi capacity ho toh 10 crore ke liye 2000 raw nodes chahiye; headroom alag. Message rate, heartbeats aur auth/catch-up bhi load test karo.' },
            { id: 'app', label: "API aur sockets ek hi tier mein scale karo", score: -1, why: 'API aur sockets ek tier mein rakhna valid ho sakta hai, par independent scaling mushkil ho sakti hai. Har deploy 10 crore reconnects zaroor laayega, aisa nahi; drain aur batches ka plan jaancho.' },
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
          q: 'Chat aur feed ke fanout ka chunav kis baat se karoge?',
          choices: [
            'Group size, read:write ratio, offline history aur encryption ka kharcha milaao',
            'Chat naam hai toh har group ka read fanout lo; group size dekhna chhod do',
            'Feed naam hai toh har user ka write fanout lo; celebrity skew chhod do',
            'WebSocket chuna hai, toh storage ka fanout bhi WebSocket se tay ho gaya',
          ],
          answer: 0,
          explain: 'Fanout ka faisla recipients, reads, history aur delivery/encryption ke niyam se niklega. Shared conversation log chat ka ek common raasta hai; per-recipient inbox bhi valid ho sakti hai. Feed mein celebrity aur aam users ke liye hybrid fit ho sakta hai. Transport aur storage alag chuno.',
          choiceExplanations: [
            'Fanout ka faisla recipients, reads, history aur delivery/encryption ke niyam se niklega. Shared conversation log chat ka ek common raasta hai; per-recipient inbox bhi valid ho sakti hai. Feed mein celebrity aur aam users ke liye hybrid fit ho sakta hai. Transport aur storage alag chuno.',
            'Chhote groups, bade channels aur encrypted device delivery ki costs alag ho sakti hain. Har chat ka same rule nahi.',
            'Celebrity ke crore followers par inbox writes bhaari ho sakti hain. Read ya hybrid ka fit jaancho.',
            'WebSocket live connection hai. Durable data ka layout aur offline history alag faisle hain.',
          ],
        },
        {
          q: 'Har conversation mein read state aage badhta hai. Kam data mein kaise rakhoge?',
          choices: [
            'Har user aur conversation ka aage badhta last-read cursor rakho',
            'Sab conversations ka ek global last-read cursor rakho — ek number sab chats ke liye',
            'Client ka cursor badha toh user ne har shabd padha, proof wahi maan lo',
            'Random message IDs compare karo; stable ordering ki alag zaroorat chhod do',
          ],
          answer: 0,
          explain: 'Agar read state ek conversation ke lagataar prefix ki tarah hai toh per-user last-read cursor compact hai. Message order stable ho aur cursor sirf aage badhe. Sparse unread markers, privacy ya alag read rules hon toh model badalna padega. Cursor attention ka saboot nahi.',
          choiceExplanations: [
            'Agar read state ek conversation ke lagataar prefix ki tarah hai toh per-user last-read cursor compact hai. Message order stable ho aur cursor sirf aage badhe. Sparse unread markers, privacy ya alag read rules hon toh model badalna padega. Cursor attention ka saboot nahi.',
            'Alag conversations ka apna message order hai. Ek global value har chat ka read state nahi bataati.',
            'Cursor app ke defined read signal ko record karta hai. Screen ya aankhon ki actual attention prove nahi hoti.',
            'Cursor comparison ko stable order chahiye. Random unique ID akeli chronological order nahi deti.',
          ],
        },
        {
          q: '2,000 gateway nodes ka deploy karna hai. Kya dhyaan rakhoge?',
          choices: [
            'Chhote batches drain karo; jitter, admission aur backlog fetch ki hadd rakho',
            'Blue-green switch karo; purane sockets bina drain apne aap bachenge maan lo',
            'Sirf raat ko deploy karo — raat mein users nahi hote, toh reconnect ki bheed nahi',
            'Saare gateways ek saath restart karo; catch-up ke extra load ko mat naapo',
          ],
          answer: 0,
          explain: 'Gateways restart hon toh clients auth, subscription aur gap fetch karte hain. 50k sockets/node ek example capacity hai; load test se naapo. Drain aur chhote batches ke saath client backoff/jitter do. Server admission aur catch-up ki hadd se reconnect burst sambhaalo.',
          choiceExplanations: [
            'Gateways restart hon toh clients auth, subscription aur gap fetch karte hain. 50k sockets/node ek example capacity hai; load test se naapo. Drain aur chhote batches ke saath client backoff/jitter do. Server admission aur catch-up ki hadd se reconnect burst sambhaalo.',
            'Traffic switch purane sockets migrate nahi karta. Drain, handoff ya reconnect ka plan phir bhi chahiye.',
            'Alag timezones aur background sessions rehte hain. Raat ko zero users maan lena galat hai.',
            'Ek saath restart auth aur catch-up ki lehar la sakta hai. Nateeja remaining capacity par naapo.',
          ],
        },
      ],
    },
    {
      type: 'order',
      title: 'Ek message ka safar',
      instructions: 'Sahi kram mein rakho.',
      steps: [
        { text: 'Client message bhejta hai (apne client_message_id ke saath)', explain: 'Client-generated id se retry safe ho jaata hai: network timeout par client dobara bhejega, aur server usi id se duplicate pehchan lega.' },
        { text: 'Server conversation ke liye ek monotonic id deta hai', explain: 'Badhti id hi ordering aur cursors dono ki neev hai. Per-conversation sequence rakhna global ordering se kahin sasta hai.' },
        { text: 'Message durable store mein likha jaata hai', explain: '<b>Yahin commit hota hai.</b> Commit ke baad message "hai" — chahe push ho ya na ho. Client ko ack yahan se milta hai, push se nahi.' },
        { text: 'Abhi connected members ko push', explain: 'Push ek optimization hai. Push fail ho jaaye toh koi baat nahi — reconnect par gap bhar jaayega.' },
        { text: 'Offline members ke liye push notification', explain: 'Alag channel (APNs/FCM), aur usme poora message nahi — sirf ek signal. E2E encryption ho toh server message padh hi nahi sakta.' },
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
          'Durable message aur stable order rakho; permission jaanch ke cursor se gap bharo',
          'Sirf online sockets par broadcast karo; offline history broadcast se ban jaayegi',
          'Push provider ka ACK lo; recipient ne message padh liya, wahi proof maano',
          'Random IDs sort karo; same conversation ka order aur gaps khud milenge maan lo',
        ],
        answer: 0,
        explain: 'Message durable store mein ordered ID ke saath rakho, phir push karo. Device conversation ke cursor se retained gap fetch kare; membership aur permission har fetch par jaancho. Retention, duplicate sends aur device/read state bhi define karo. Push akela history nahi bachaata.',
        choiceExplanations: [
          'Message durable store mein ordered ID ke saath rakho, phir push karo. Device conversation ke cursor se retained gap fetch kare; membership aur permission har fetch par jaancho. Retention, duplicate sends aur device/read state bhi define karo. Push akela history nahi bachaata.',
          'Offline recipient ko broadcast nahi mila. Retained history aur recovery ka raasta chahiye.',
          'Provider ACK aur app ka received/read signal alag hain. ACK user ke padhne ka proof nahi.',
          'Random uniqueness order ki guarantee nahi. Gap fetch ke liye stable comparison chahiye.',
        ],
      },
      {
        q: 'Shared conversation log chuna; group mein 1000 members. Body aur metadata ka write cost?',
        choices: [
          'Shared log mein body ek baar; recipients ki metadata aur replication writes alag',
          'Har chat design mein total ek write hoti hai; storage ke aur writes mat gino',
          'Body shared hai toh inbox aur receipts ki metadata ko zero kharcha maan lo',
          'Body ek baar save ho gaya, matlab saare members tak delivery bhi ho gayi',
        ],
        answer: 0,
        explain: 'Diye shared conversation log mein ek logical body write ho sakti hai. Replication, encryption, delivery metadata, cursors aur notifications extra writes la sakte hain. Recipient inbox ek valid doosra design hai; total cost layout aur delivery contract se niklegi.',
        choiceExplanations: [
          'Diye shared conversation log mein ek logical body write ho sakti hai. Replication, encryption, delivery metadata, cursors aur notifications extra writes la sakte hain. Recipient inbox ek valid doosra design hai; total cost layout aur delivery contract se niklegi.',
          'Ek logical body write har architecture ki total writes nahi. Copies, metadata aur encryption ka kharcha badal sakta hai.',
          'Metadata bhi storage aur updates leti hai. Body share karne se har recipient ka kaam zero nahi hota.',
          'Body durable hona sab recipients tak delivery nahi. Offline, blocked ya expired history ka contract alag hai.',
        ],
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
            { id: 'presigned', label: "Ek upload ki scoped multipart permission do", score: 3, why: 'Bytes API se nahi guzarte. Scoped multipart upload se failed parts retry/resume kar sakte ho; client upload ID aur parts ka record rakhe. App ka 40 ms sirf example metadata time hai, capacity ka vaada nahi.' },
            { id: 'proxy', label: "Bade upload ke bytes API se proxy karo", score: -3, why: '5 GB ka slow upload kaafi der socket, buffers aur app bandwidth lega. Network speed aur concurrency par shared API ka asar naapo; har setup ka 20-minute ya down hone ka vaada nahi.' },
          ],
        },
        {
          id: 'transcode', label: 'Transcoding', icon: '⚙️',
          options: [
            { id: 'queue', label: "Queue se retry-safe workers mein transcode", score: 3, why: 'Minute-ghante ka kaam, isliye async. Queue burst sambhaalti hai, workers alag scale karte hain (CPU-bound), aur status API user ko sach dikhata hai.' },
            { id: 'sync', label: "Upload request ke andar video transcode", score: -3, why: '4K transcode lamba chal sakta hai. Request mein wait karne se timeout aur retry par duplicate kaam ho sakta hai. Background job ko retry-safe rakho.' },
            { id: 'lazy', label: "Pehle viewer ki request par transcode karo", score: -1, why: 'Chalak idea hai aur lambe-tail videos ke liye kuch platforms yahi karte hain — par pehle viewer ko minute bhar wait karna padega. Aam raaste ke liye galat; sirf ek optimization ho sakta hai.' },
          ],
        },
        {
          id: 'deliver', label: 'Playback', icon: '🌍',
          options: [
            { id: 'cdn', label: "CDN se segments; origin misses ko baandho", score: 3, why: "Given 92.6 Tbps global delivery mein CDN/cache origin work reduce karta hai. 95% byte hits lab assumption hai; total delivery egress, origin miss load, regional pricing aur startup SLO separately measure karo." },
            { id: 'origin', label: "Seedha object storage se playback do", score: -2, why: 'Object storage playback valid ho sakta hai, par distant users ka latency aur origin egress naapo. CDN se cache reuse mil sakta hai; har region mein kai guna sasta hone ki guarantee nahi.' },
            { id: 'app2', label: "Application servers se har segment stream", score: -3, why: 'Ek 2-ghante ka video ek slot ko 2 ghante ke liye pakad lega. Wahi upload wali galti, ab read side par.' },
          ],
        },
        {
          id: 'views', label: 'View count', icon: '👁️',
          options: [
            { id: 'stream', label: "View events stream mein jodo; batch update", score: 3, why: "100 crore/day roughly 11,574 platform events/sec hain; ek viral video ka share hot-key load decide karta hai. UI approximate count tolerate kar sakti hai; billing/abuse metrics ko separate correctness contract chahiye." },
            { id: 'db', label: "Har view par DB row ka counter badhaao", score: -3, why: '100 crore views/din lagbhag 11,574 events/sec poore platform ke hain, ek row ke nahi. Viral video ki hot row par sync increments contention bana sakte hain; actual skew aur capacity naapo.' },
            { id: 'redis', label: "Redis counters se periodic DB flush karo", score: 1, why: 'Redis increments aur periodic flush valid design ho sakta hai. Crash par unflushed counts ka loss, repeat events aur persistence settings jaancho. Monetization ka correctness contract alag poora karo; alag pipeline hi akela hal nahi.' },
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
        { text: 'Transcoding fleet', bin: 'cpu', explain: 'Har video ke 5-6 versions banane hain. Transcoding pure compute hai — aur isiliye transcoding ki alag fleet honi chahiye jo spot/preemptible instances par chal sake.' },
        { text: 'Original videos + saare transcoded versions', bin: 'store', explain: 'Har video ki 6 copies. Isliye lifecycle rules laazmi hain — purane, kam-dekhe jaane wale videos ki high-res copies archive ya delete ho sakti hain.' },
        { text: 'Upload ingest', bin: 'net', explain: 'Bytes andar aa rahe hain. Presigned URL se upload ka bojh S3 par chala jaata hai, tumhare servers par nahi.' },
        { text: 'Thumbnail generation', bin: 'cpu', explain: 'Transcoding ka chhota bhai — wahi worker fleet, wahi queue.' },
        { text: 'Video metadata (title, owner, views)', bin: 'store', explain: 'Metadata chhota structured data hai — ek normal DB ka kaam. Poore system mein metadata sabse sasta hissa hai, aur log yahin sabse zyada waqt lagate hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Video ke faisle',
      questions: [
        {
          q: 'Playback 2 second mein kaise shuru hota hai jabki video 2 GB ki hai?',
          choices: [
            'Manifest se playable pehle chunks lo; buffer aur speed se agle chunks ki quality chuno',
            'Playback ke liye pehle poore 2 GB lo; CDN ki speed se file aane ka wait chhota hoga',
            'CDN paas rakh do; codec, keyframes aur player buffer startup par asar nahi karte',
            'Har player sabse kam quality par hi shuru kare; network estimate ka role nahi hota',
          ],
          answer: 0,
          explain: 'Player manifest aur shuruaati playable chunks se start kar sakta hai; poori file aane ka wait nahi. Initial quality bandwidth estimate, device aur buffer policy se chunti hai. Segment length, codec aur keyframes bhi startup badalte hain. 2-second target actual load par jaancho.',
          choiceExplanations: [
            'Player manifest aur shuruaati playable chunks se start kar sakta hai; poori file aane ka wait nahi. Initial quality bandwidth estimate, device aur buffer policy se chunti hai. Segment length, codec aur keyframes bhi startup badalte hain. 2-second target actual load par jaancho.',
            'Segmented streaming mein shuruaati hissa aate hi play ho sakta hai. Poore 2 GB pehle aana zaroori nahi.',
            'CDN network distance ghata sakta hai. Decode aur buffering ki needs phir bhi rehti hain.',
            'Initial quality player ki policy aur estimate se badalti hai. Sabse kam quality universal rule nahi.',
          ],
        },
        {
          q: 'Viewer byte volume same hai. CDN byte hits 95% se 90% hue. Origin miss bytes?',
          choices: [
            'Origin miss bytes dugne: viewer volume same, miss share 5% se 10% hua',
            'Viewer ke total bytes dugne: sirf cache hit girne se demand bhi 2x hui',
            'Origin miss bytes 5% relative badhe: 5 se 10 bas paanch ka farak hai',
            'Origin miss bytes same rahe: cache hit badle par miss share nahi badalta',
          ],
          answer: 0,
          explain: 'Same viewer byte volume aur same shield boundary par 95% byte hits ka matlab 5% miss. 90% hits par 10% miss. 10/5 = 2, toh origin miss bytes dugne. Requests ka hit ratio aur bytes ka hit ratio alag ho sakte hain; capacity aur latency alag naapo.',
          choiceExplanations: [
            'Same viewer byte volume aur same shield boundary par 95% byte hits ka matlab 5% miss. 90% hits par 10% miss. 10/5 = 2, toh origin miss bytes dugne. Requests ka hit ratio aur bytes ka hit ratio alag ho sakte hain; capacity aur latency alag naapo.',
            'Diya viewer volume same hai. Sirf origin se aane wala hissa badla.',
            '5% se 10% paanch percentage points hai, par purane miss bytes ke muqaable 100% increase hai.',
            'Same volume mein hit share gire toh miss share badhega. 5% aur 10% same nahi.',
          ],
        },
        {
          q: '100 crore views/din. Count kaise rakhoge?',
          choices: [
            'Events jodkar batches mein counts update; UI aur billing ka contract alag',
            'Har view ek hi DB row par increment karo; viral skew ka load mat naapo',
            'Redis INCR har retry par karo; repeat event ko naya count banne se bachao mat',
            'UI ka approximate count invoice mein bhi use karo; bill ka milaan chhod do',
          ],
          answer: 0,
          explain: '100 crore views/din lagbhag 11,574 events/sec platform-wide hain; ek video ka load share alag hai. Stream se views jodkar batches mein projection update kar sakte ho. Dobara aaye events aur lost increments ka niyam saaf ho. UI ko kitna purana ya approximate count manzoor hai, billing se alag tay karo.',
          choiceExplanations: [
            '100 crore views/din lagbhag 11,574 events/sec platform-wide hain; ek video ka load share alag hai. Stream se views jodkar batches mein projection update kar sakte ho. Dobara aaye events aur lost increments ka niyam saaf ho. UI ko kitna purana ya approximate count manzoor hai, billing se alag tay karo.',
            'Platform total sab ek video ki row par nahi aata. Viral row ka contention phir bhi naapna hai; ek row unlimited rate nahi leti.',
            'INCR dobara chala toh count dobara badhega. Repeat event ka asar rokne ka alag intezaam chahiye.',
            'UI aur invoice ka exactness contract alag ho sakta hai. Product ki manzoori aur audit ke bina reuse mat karo.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Video platform',
    instructions: 'Yahan numbers pehle bolna hi jeet hai. 🎤',
    questions: [
      {
        q: '1 billion watch-hours/din, 1 GB/hour. Decimal daily egress aur average bandwidth?',
        choices: [
          '1 EB/din, yani 1000 PB/din; average lagbhag 92.6 Tbps',
          '100 PB/din, yani 0.1 EB/din; average lagbhag 9.26 Tbps',
          '10 PB/din, yani 0.01 EB/din; average lagbhag 0.926 Tbps',
          '1 PB/din, yani 0.001 EB/din; average lagbhag 0.0926 Tbps',
        ],
        answer: 0,
        explain: 'Decimal units mein 1 billion hours × 1 GB/hour = 1 billion GB = 1 EB = 1000 PB/din. Bits/sec ke liye 10 ki power 18 bytes × 8 / 86,400 = lagbhag 92.6 Tbps. Peak, overhead aur origin ke miss share ka budget alag niklega.',
        choiceExplanations: [
          'Decimal units mein 1 billion hours × 1 GB/hour = 1 billion GB = 1 EB = 1000 PB/din. Bits/sec ke liye 10 ki power 18 bytes × 8 / 86,400 = lagbhag 92.6 Tbps. Peak, overhead aur origin ke miss share ka budget alag niklega.',
          'Diye hours aur rate se 1000 PB milte hain. 100 PB ka jawab factor 10 chhota hai.',
          '10 PB factor 100 chhota hai. GB/day se PB/day ka conversion dobara jaancho.',
          '1 PB factor 1000 chhota hai. Decimal units mein 1 billion GB ek EB hai.',
        ],
      },
      {
        q: '"Ek video achanak viral ho gaya. Kya hoga?"',
        choices: [
          'Cold edges par misses ka burst naapo; shielding aur coalescing se origin bachao',
          '95% aggregate hits dekhkar origin par spike aana namumkin maan lo',
          'Video viral hua toh origin pakka girega; cached copies aur headroom chhod do',
          'Transcode workers badhaao — zyada CPU se origin ki bandwidth bhi badh jaati hai',
        ],
        answer: 0,
        explain: 'Viral video ke cold chunks par kai edges origin ko saath poochh sakte hain. Shield ek beech ka cache hai; coalescing same object ke ek saath misses jod sakti hai. Cache key, region, expiry aur headroom matter karte hain. Shield akela har request ko ek global fetch nahi banaata.',
        choiceExplanations: [
          'Viral video ke cold chunks par kai edges origin ko saath poochh sakte hain. Shield ek beech ka cache hai; coalescing same object ke ek saath misses jod sakti hai. Cache key, region, expiry aur headroom matter karte hain. Shield akela har request ko ek global fetch nahi banaata.',
          'Aggregate hit rate cold-object bursts chhipa sakta hai. Origin miss rate aur concurrent fetches dekho.',
          'Warm cache, shielding aur headroom se kuch bursts sambhal sakte hain. Viral hona outage ka proof nahi.',
          'Transcode CPU aur delivery bandwidth alag resources hain. Ek ko badhaane se doosri hadd nahi mitti.',
        ],
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
       <tr><td>Driver locations</td><td>Write-heavy, ephemeral</td><td>1.5 crore writes/min DB par = storm</td></tr>
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
            { id: 'mem', label: "Taaza geo state aur durable history ka stream", score: 3, why: 'Current query ko taaza geo projection chahiye. 1.5 crore updates/min kisi bhi memory store ka automatic vaada nahi; shard/skew, hardware aur recovery par naapo. Required trip/safety history durable stream se alag rakh sakte ho.' },
            { id: 'db', label: "Har ping serving SQL mein append karte raho", score: -3, why: '250,000 updates/sec ko serving SQL mein append karne ka kharcha naapna padega. History aur crash recovery durable retention maang sakte hain; durable store ko blanket galat mat maano. Query projection alag rakho.' },
            { id: 'kafka', label: "Sirf stream log; geo query ka view na banao", score: -2, why: 'Kafka log events rakh sakta hai; nearby query ke liye current geo index/materialized state chahiye. Stream log ka naam akela lookup interface nahi deta.' },
          ],
        },
        {
          id: 'nearby', label: 'Nearby drivers', icon: '🗺️',
          options: [
            { id: 'cell', label: "Radius dhakne wale cells, phir asli doori jaancho", score: 3, why: 'Radius ko dhakne wale cells se candidates lo; asli distance se filter aur ETA se rank karo. Spatial DB indexes bhi valid hain; har 2D query unindexed nahi. Boundary aur location taazgi jaancho.' },
            { id: 'between', label: "B-tree bounding box ko final nearby list maano", score: -3, why: 'Bounding box radius ka approximate cover hai. Composite B-tree lambi patti scan kar sakta hai, par later conditions index mein check ya kuch plans mein skip scan ho sakte hain. Exact radius filter aur actual plan jaancho.' },
          ],
        },
        {
          id: 'hotcell', label: '8 PM, baarish — ek cell par sab', icon: '🔥',
          options: [
            { id: 'split', label: "Hot cell finer karo; read copies ka plan rakho", score: 3, why: 'Hot-cell skew naapo. Finer cells ya read replicas se kaam baant sakte ho; write load, query scatter aur taazgi ki cost bhi dekho. Adaptive grid khud sab problems nahi suljhaati.' },
            { id: 'nodes', label: "Naye nodes jodo; hot key ki routing wahi rakho", score: -2, why: 'Agar hot cell ka ek owner hai toh naye nodes bina routing ya replication badle load nahi baantte. Actual key mapping aur read/write share jaancho.' },
          ],
        },
        {
          id: 'match', label: 'Driver matching', icon: '🤝',
          options: [
            { id: 'hold', label: "Owner/version wala expiring offer; guarded accept", score: 3, why: '15-second offer ki expiry driver ko abandoned request se free karti hai. Accept par durable authority owner/version/state jaanche; stale hold ka accept nayi assignment na badle.' },
            { id: 'first', label: "Hold bina offers; accept par race chhod do", score: -2, why: 'Broadcast/first-accept model valid ho sakta hai, par option mein accept race ka guard chhoota hai. Exclusive assignment ke liye authoritative atomic transition phir bhi chahiye. Offer UX aur wait bhi naapo.' },
            { id: 'lock', label: "Driver ke faisle tak DB row lock khula rakho", score: -2, why: 'Driver 15-20 second le sakta hai. Utni der DB lock pakadna us row par sabko rokta hai — aur agar driver ka network gaya toh lock timeout tak atka rahega.' },
          ],
        },
        {
          id: 'track', label: 'Live tracking', icon: '🔌',
          options: [
            { id: 'gw', label: "Socket gateways aur pub/sub se live updates", score: 2, why: 'Connections ek alag capacity dimension hain. Gateway sirf sockets rakhe; rider aur driver do alag gateways par honge, isliye beech mein pub/sub.' },
            { id: 'poll', label: "Har client teen second par tracking poll kare", score: 0, why: '50,000 rides × 20 polls/min ÷ 60 = lagbhag 16,667 rps sirf tracking ke liye. Polling valid ho sakti hai; required interval, capacity aur connection cost se tulna karo.' },
          ],
        },
        {
          id: 'pay', label: 'Fare aur payment', icon: '💰',
          options: [
            { id: 'ledger', label: "Ledger, stable payment intent aur records milaao", score: 3, why: 'Ride complete = service di ja chuki hai, use <b>reverse nahi</b> kiya ja sakta. Isliye payment failure ek alag recovery flow hai, aur ledger + reconciliation dono zaroori hain.' },
            { id: 'update', label: "Sirf balance badlo; timeout par naya charge karo", score: -3, why: 'Bina stable intent ke ambiguous timeout ki retry do charges bana sakti hai. Sirf balance badalne se payment posting ka itihaas nahi bachta; ledger aur reconciliation chahiye.' },
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
          q: 'Frequent driver locations ki current query aur history ke stores kaise chunoge?',
          choices: [
            'Taaza geo projection se queries; history aur crash recovery ki zaroorat alag tay karo',
            'Location baar-baar badle toh kisi DB mein rakhna galat maano; load test chhod do',
            'Current state naam hai toh crash par khona acceptable maano; safety rule mat poochho',
            'Kafka log rakho; materialized geo view bina nearest driver seedha mil jaayega',
          ],
          answer: 0,
          explain: 'Taaza locations ke liye low-latency geo projection fit ho sakti hai. Trip history, safety, audit aur crash recovery kitni durability maangte hain, alag tay karo. 10 lakh drivers/4 s = 250,000 updates/sec. DB ya memory store ki capacity actual schema aur hardware par naapo.',
          choiceExplanations: [
            'Taaza locations ke liye low-latency geo projection fit ho sakti hai. Trip history, safety, audit aur crash recovery kitni durability maangte hain, alag tay karo. 10 lakh drivers/4 s = 250,000 updates/sec. DB ya memory store ki capacity actual schema aur hardware par naapo.',
            'Spatial DB valid ho sakti hai. Update rate, queries aur durability ke saath fit benchmark karo.',
            'Current state ko bhi recovery ki zaroorat ho sakti hai. Naam se data-loss budget decide nahi hota.',
            'Log se current searchable state banana alag kaam hai. Nearest-driver query ko geo index/projection chahiye.',
          ],
        },
        {
          q: 'Matching ke hold aur accept flow ko kya pakka karna chahiye?',
          choices: [
            'Offer expire ho sake; accept par owner, version aur state atomically jaancho',
            'Sirf TTL lagao; expired holder ka accept nayi assignment ko badalne do',
            'Har offer pending rakho; cleanup aur expiry ka koi server rule mat banao',
            'Hold ko jitna lamba ho badhaao; blocked driver ka match wait mat naapo',
          ],
          answer: 0,
          explain: 'Offer ki expiry abandoned driver ko free karne ka raasta deti hai. Exclusive assignment ko durable authority par owner/version/state ke atomic check se bachao. TTL akela stale accept ya retried assignment nahi rokta. Hold ki lambai wait aur match success se milaao.',
          choiceExplanations: [
            'Offer ki expiry abandoned driver ko free karne ka raasta deti hai. Exclusive assignment ko durable authority par owner/version/state ke atomic check se bachao. TTL akela stale accept ya retried assignment nahi rokta. Hold ki lambai wait aur match success se milaao.',
            'Expiry ke baad driver nayi ride ko mil sakta hai. Purane accept ka version/token reject karna hai.',
            'Abandoned offer availability rok sakta hai. Expiry aur guarded cleanup normal flow mein chahiye.',
            'Lamba hold driver ko block karke doosre matches dheeme kar sakta hai. Har workload mein latency better nahi.',
          ],
        },
        {
          q: 'Ride complete ho gayi par payment fail ho gaya. Kya karoge?',
          choices: [
            'Payment ka pending record bachao; same intent se recovery aur policy ke hisaab se debt',
            'Ride completed ko cancelled likho; service aur payment dono undo hue maan lo',
            'Failed payment ka record hataao; agle din milaan mein failure dikhna band kar do',
            'Har retry ko nayi payment key do; ambiguous timeout par bhi naya charge karo',
          ],
          answer: 0,
          explain: 'Ride ki service pehle di ja chuki hai; status badalne se safar undo nahi hota. Payment intent aur pending amount durable rakho. Provider ka result milaao, stable key se retry/recovery karo; outstanding balance aur agli ride ka niyam product policy tay kare. Service aur charge ka milaan chahiye.',
          choiceExplanations: [
            'Ride ki service pehle di ja chuki hai; status badalne se safar undo nahi hota. Payment intent aur pending amount durable rakho. Provider ka result milaao, stable key se retry/recovery karo; outstanding balance aur agli ride ka niyam product policy tay kare. Service aur charge ka milaan chahiye.',
            'Physical ride wapas nahi hoti. Cancellation label payment ka recovery record nahi banaata.',
            'Receivable aur audit record mitne se unpaid ride chhip sakti hai. Reconciliation ke liye evidence chahiye.',
            'Pehla charge timeout ke bawajood hua ho sakta hai. Nayi key se retry double charge bana sakti hai.',
          ],
        },
        {
          q: 'Poore app ka nichod, ek line mein?',
          choices: [
            'Problem ka shape pehchaano, bottleneck naapo aur har faisle ka kharcha bataao',
            'Pehle maximum scale banao; actual users aur cost ka sawaal baad mein dekho',
            'Sabse naya pattern chuno; failure aur recovery ka fit popular tool par chhod do',
            'Sabse chhota diagram chuno; correctness ka guard hat jaaye toh bhi simple rakho',
          ],
          answer: 0,
          explain: 'Naam se failure ki checklist milti hai. Measurement se asli limit milti hai; CPU bhi bottleneck ho sakta hai. Tradeoff bataane se saaf hota hai ki faayde ke badle kya kharcha liya. Scope, business niyam aur recovery ka saboot design ko poora banate hain.',
          choiceExplanations: [
            'Naam se failure ki checklist milti hai. Measurement se asli limit milti hai; CPU bhi bottleneck ho sakta hai. Tradeoff bataane se saaf hota hai ki faayde ke badle kya kharcha liya. Scope, business niyam aur recovery ka saboot design ko poora banate hain.',
            'Bina zaroorat maximum scale complexity aur cost jod sakta hai. Actual load aur forecast ka saboot chahiye.',
            'Novelty workload fit aur recovery prove nahi karti. Har pattern ke failure aur kharche jaancho.',
            'Simplicity achha default hai, par required correctness aur SLO chhodne ki wajah nahi.',
          ],
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
          'Ride ka scope aur niyam saaf karo; matching mein geo aur exclusive claim dikhaao',
          'Pehle 15 services ka diagram pakka karo; user journey aur owner baad mein dekho',
          'Users bahut hain toh pehle NoSQL lo — user count se hi DB ka chunav ho jaata hai',
          'Map par driver dikh gaya toh assignment pakka maano; final atomic claim chhod do',
        ],
        answer: 0,
        explain: 'User ka ride flow, scale aur exclusive driver assignment ka niyam saaf karo. Locations, nearby search, matching, workflow, tracking aur payment ke shapes pehchaano. Scope mein matching central ho toh geo candidate aur atomic claim se shuru karo; ek fixed opening har interview ka rule nahi.',
        choiceExplanations: [
          'User ka ride flow, scale aur exclusive driver assignment ka niyam saaf karo. Locations, nearby search, matching, workflow, tracking aur payment ke shapes pehchaano. Scope mein matching central ho toh geo candidate aur atomic claim se shuru karo; ek fixed opening har interview ka rule nahi.',
          'Service boundaries ownership, queries aur load se niklein. Ginti pehle pakki mat karo.',
          'Large user count data model ya DB brand akela nahi chunta. Required queries aur guarantees chahiye.',
          'Nearby map candidates deta hai. Ek driver ko ek active ride milna authoritative atomic transition hai.',
        ],
      },
      {
        q: 'Ride-hailing design ka sabse kamzor hissa kaise samjhaaoge?',
        choices: [
          'Assignment failure, affected users aur tested ownership/recovery ka raasta bataao',
          'City fallback ka naam do; old aur new dispatch owners ka handoff mat jaancho',
          'Active hold count normal dikhaao; assignment IDs ka milaan chhod do',
          'Redis gira toh sab cities giri — ek shared Redis ka matlab poore desh ka outage',
        ],
        answer: 0,
        explain: 'Kamzori ka mechanism, kitne riders/drivers par asar aur detection bataao. Assignment IDs aur invariants se duplicate pakdo. Fallback mein ek owner ka haq, stale writer ka bachav aur tested handoff chahiye. Blast radius routing/isolation ke saboot se bolo; city boundary ka andaaza kaafi nahi.',
        choiceExplanations: [
          'Kamzori ka mechanism, kitne riders/drivers par asar aur detection bataao. Assignment IDs aur invariants se duplicate pakdo. Fallback mein ek owner ka haq, stale writer ka bachav aur tested handoff chahiye. Blast radius routing/isolation ke saboot se bolo; city boundary ka andaaza kaafi nahi.',
          'Fallback mein purana owner ab bhi likh sakta hai. Authoritative ownership aur guarded handoff test karo.',
          'Normal count ke saath ek driver ki do assignments ho sakti hain. IDs aur invariant checks chahiye.',
          'Impact deployment aur routing se tay hoga. Sab cities ya ek city maan lene ke bajaay isolation jaancho.',
        ],
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

})();
