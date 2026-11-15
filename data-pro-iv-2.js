/* =====================================================================
   System Gurukul — 🎤 Interview Designs (track pro-iv), hissa 2
   Levels: iv-ratelimiter (distributed rate limiter service), iv-typeahead.
   api track ka 'ratelimit' level ek service ke andar ki baat hai; yahan 20 gateway nodes ka saajha hisaab.
   ===================================================================== */
(() => {
SD.registerLevels('pro-iv', [
/* ---------------------------------------------------------------- I3 */
{
  id: 'iv-ratelimiter',
  icon: '🚦',
  title: 'Design: Rate limiter service — 20 servers, ek hisaab',
  badge: 'Hadd Hakim',
  objectives: [
    'Local limit vs saajhi limit: 20 gateway nodes par "100 per minute" kaise',
    'Algorithm: token bucket vs sliding window counter',
    'Redis + Lua: check aur ghatana ek hi atomic kadam kyun',
    'Redis gira toh: fail open ya fail closed',
  ],
  lesson: [
    `<h3>🎡 Misaal: mele ke jhoole</h3>
     <p>Har aadmi ko 10 jhoole. Mele mein 20 ticket counter.</p>
     <p>Har counter apna alag hisaab rakhe? Ek aadmi 20 counters ghoom ke 200 jhoole le lega.</p>
     <p>Ek saajha register rakho? Sahi hisaab, par har ticket par register tak daud.</p>
     <p class="tip">🎯 <b>Asli baat:</b> distributed rate limiting = saajha counter (jaise Redis), ya har node ko hadd ka hissa.
       Pehla sahi aur thoda dheema; doosra tez par load uneven ho toh galat.</p>`,
    `<h3>🔢 ChaiPay API ke numbers</h3>
     <pre>1 lakh API keys (merchants) · har key: 100 requests / minute
Kul traffic: 50,000 rps · 20 gateway nodes</pre>
     <table>
       <tr><th>Tareeka</th><th>Faayda</th><th>Keemat</th></tr>
       <tr><td><b>Local</b>: har node 100 ÷ 20 = 5/min</td><td>Koi network call nahi</td><td>Load balancer uneven ho toh ek merchant ko jaldi 429</td></tr>
       <tr><td><b>Central Redis</b></td><td>Sahi saajha hisaab</td><td>Har request par ek Redis call (~1 ms); 50,000 ops/s ka Redis load</td></tr>
       <tr><td><b>Hybrid</b>: node Redis se 10-10 tokens ek saath le</td><td>Redis calls ~10 guna kam</td><td>Hadd thodi dheeli: node par bache tokens</td></tr>
     </table>
     <p>Memory? Har key ki bucket ~100 bytes → 1 lakh keys × 100 B = <b>~10 MB</b>. Chhota.</p>`,
    `<h3>🧮 Algorithm</h3>
     <table>
       <tr><th>Algorithm</th><th>Kaise</th><th>Dikkat</th></tr>
       <tr><td>Fixed window</td><td>Har minute ka counter</td><td>Minute ki border par 2× burst</td></tr>
       <tr><td>Sliding window log</td><td>Har request ka timestamp</td><td>Memory bhaari (100 timestamps per key)</td></tr>
       <tr><td>Sliding window counter</td><td>Pichhle aur is minute ka weighted jod</td><td>Thoda andaaza, par sasta aur smooth</td></tr>
       <tr><td>Token bucket</td><td>Bucket mein tokens, ek raftaar se bharte</td><td>Burst ki ijaazat — kabhi feature, kabhi bug</td></tr>
     </table>
     <h3>⚛️ Race aur atomic</h3>
     <p>Do nodes ek saath padhte hain: tokens = 1. Dono "allow" kar dete hain. Ilaaj: <b>padhna aur ghatana ek atomic kadam</b> — Redis par Lua script (poora script ek saath chalta hai).</p>`,
    `<h3>💥 Redis gira toh?</h3>
     <ul>
       <li><b>Fail open</b> (jaane do) + har node par local backup limit: aam APIs ke liye. Rate limiter ki wajah se poora API band nahi hona chahiye.</li>
       <li><b>Fail closed</b> (roko): OTP ya mehenge APIs par, jahan bina hadd ka traffic paisa jalata hai.</li>
       <li>Redis call par chhota timeout (jaise 5 ms): limiter khud latency ka bottleneck na bane.</li>
     </ul>
     <p>Jawab: <code>429 Too Many Requests</code> + <code>Retry-After</code>, taaki client sahi samay par dobara aaye.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — limiter ka kharcha',
      goal: 'Rate limiter ka bojh khud gino.',
      problems: [
        {
          q: '1 lakh API keys, har key ki bucket Redis mein ~100 bytes. Kul kitne MB? (1 MB = 10 lakh bytes maano)',
          unit: 'MB',
          given: ['1,00,000 keys', '100 bytes per key', '1 MB = 10,00,000 bytes'],
          answer: 10,
          tol: 0.05,
          steps: ['1,00,000 × 100 = 1,00,00,000 bytes', '1,00,00,000 ÷ 10,00,000 = 10 MB'],
          lesson: 'Memory chhoti hai. Asli kharcha har request par Redis ki call hai.',
        },
        {
          q: '50,000 rps, har request par ek Redis call. Ek Redis node 1 lakh simple ops/second (model). Node kitne PERCENT busy?',
          unit: '%',
          given: ['50,000 ops/s', 'node ki capacity 1,00,000 ops/s'],
          answer: 50,
          tol: 0.05,
          steps: ['50,000 ÷ 1,00,000 = 0.5 = 50%'],
          lesson: 'Ek node chal jaata hai, par failure ke liye replica aur peak ke liye jagah chahiye.',
        },
        {
          q: 'Local limit: 100 per minute ko 20 nodes mein baraabar baanta. Har node par kitni limit?',
          unit: 'requests/min',
          given: ['100 per minute', '20 nodes'],
          answer: 5,
          tol: 0.05,
          steps: ['100 ÷ 20 = 5'],
          lesson: 'Merchant ki saari requests ek node par aa gayi toh 5 ke baad 429 — jabki hadd 100 thi. Local hisaab uneven load par galat.',
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Rate limiter service',
      instructions: 'Har slot par sahi chunav. Galat options ka "kyun" bhi padho.',
      brief: `ChaiPay API: 1 lakh merchants, har merchant 100 requests/minute, kul 50,000 rps, 20 gateway nodes.
        Limiter ki wajah se API dheema ya band nahi hona chahiye.`,
      requirements: ['Saajhi hadd: 100/min per merchant', 'Limiter latency kam', 'Redis gire toh API chale', 'Client ko saaf jawab'],
      pass: 11,
      slots: [
        {
          id: 'where', label: 'Hisaab kahan', icon: '🧠',
          options: [
            { id: 'redis', label: 'Central Redis, Lua script se atomic check', score: 3, why: 'Saajha aur sahi. Lua se padhna aur ghatana ek kadam.' },
            { id: 'local', label: 'Har node apni memory mein, limit ÷ 20', score: -1, why: 'Tez, par uneven load par merchant ko jaldi 429.' },
            { id: 'db', label: 'Postgres row par har request UPDATE', score: -2, why: '50,000 updates/sec ka DB load; popular keys par locks aur latency. Benchmark chahiye.' },
          ],
        },
        {
          id: 'algo', label: 'Algorithm', icon: '🧮',
          options: [
            { id: 'bucket', label: 'Token bucket: rate + chhota burst', score: 3, why: 'Do numbers per key, burst ki saaf hadd. Ya sliding window counter — dono theek.' },
            { id: 'fixed', label: 'Fixed window: har minute naya counter', score: -1, why: 'Sasta, par minute ki border par 2× burst.' },
            { id: 'log', label: 'Har request ka timestamp list mein', score: -1, why: 'Sliding log mein har request ka timestamp; counter se zyada memory, exact ratio storage par nirbhar.' },
          ],
        },
        {
          id: 'fail', label: 'Redis gira toh', icon: '💥',
          options: [
            { id: 'open', label: 'Aam API fail open + local limit; OTP closed', score: 3, why: 'API chalta rahe; mehenge flows par rok. Redis call par chhota timeout.' },
            { id: 'closed', label: 'Sab APIs fail closed: Redis nahi toh 503', score: -2, why: 'Limiter ka outage poore API ka outage ban gaya.' },
            { id: 'wait', label: 'Redis ka intezaar karo, bina timeout ke', score: -3, why: 'Har request latakti hai; threads bhar jaate hain.' },
          ],
        },
        {
          id: 'reply', label: 'Hadd paar hone par jawab', icon: '📨',
          options: [
            { id: '429', label: '429 + Retry-After + bache tokens ke headers', score: 3, why: 'Client jaanta hai kab dobara aana hai.' },
            { id: '200', label: '200 OK, aur body mein error ka message likho', score: -2, why: 'Clients aur monitoring safal samjhenge.' },
            { id: '500', label: '500 Internal Server Error', score: -2, why: 'Server ki galti nahi, client ki hadd hai. 500 se retries ki baarish.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Saajha atomic hisaab, sahi algorithm, Redis girne par samajhdaar faisla, aur saaf 429. Yahi classic jawab hai.',
        ok: '👍 Zyadatar sahi. Ek chunav limiter ko hi problem bana deta hai.',
        bad: '🤔 Yaad karo: limiter API ko bachaane ke liye hai — uski wajah se API band ho toh ulta hua.',
      },
    },
    {
      type: 'quiz',
      title: 'Rate limiter ke deep-dive sawaal',
      questions: [
        {
          q: 'Do gateway nodes ne ek saath padha: tokens = 1. Dono ne request allow kar di. Ilaaj?',
          choices: [
            'Redis par Lua: tokens padho, jaancho aur ghatao, ek atomic kadam mein',
            'Dono nodes ke beech 10 ms ka random delay daal do; takraav kam hoga',
            'Har node apna alag Redis rakhe; takraav hi nahi hoga',
            'Tokens 1 ki jagah 2 se shuru karo; ek extra request chal jaayegi',
          ],
          answer: 0,
          explain: 'Race "padho, phir likho" ke beech hai. Lua script Redis par ek saath chalta hai, beech mein koi doosra command nahi ghus sakta.',
          choiceExplanations: [
            'Race "padho, phir likho" ke beech hai. Lua script Redis par ek saath chalta hai, beech mein koi doosra command nahi ghus sakta.',
            'Delay race ko kam karta hai, khatam nahi. Aur har request dheemi.',
            'Alag Redis = alag hisaab = wapas local limit ki dikkat.',
            'Hadd galat ho gayi; race wahi rahi.',
          ],
        },
        {
          q: 'Redis 2 minute ke liye down. Payments API par limiter kya kare?',
          choices: [
            'Fail open, har node par local backup limit; OTP jaise flows fail closed',
            'Sab requests 503; jab tak Redis na aaye, koi hisaab nahi toh koi request nahi',
            'Limiter hata do aur Redis aane ke baad sab merchants ka hisaab dobara ginna',
            'Redis ki har call par 30 second ka timeout rakho; Redis aa hi jaayega',
          ],
          answer: 0,
          explain: 'Limiter suraksha ka kaam karta hai, par uski wajah se payments band nahi hone chahiye. Local backup limit badi baarish rokta hai. Mehenge ya abuse wale flows par roko.',
          choiceExplanations: [
            'Limiter suraksha ka kaam karta hai, par uski wajah se payments band nahi hone chahiye. Local backup limit badi baarish rokta hai. Mehenge ya abuse wale flows par roko.',
            'Limiter ka outage poore payments ka outage ban gaya.',
            'Purana hisaab dobara ginne ka faayda nahi; requests ja chuki hain.',
            '30 second ka timeout har request ko latka dega.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Rate limiter',
    instructions: 'Classic rate limiter ke sawaal. 🎤',
    questions: [
      {
        q: 'Rate limiter kahan lagaoge?',
        choices: [
          'Gateway par, auth ke baad: key pata ho, aur service tak bekaar request na pahunche',
          'Har microservice ke andar alag-alag, taaki har team apni hadd khud tay kare',
          'Database ke andar, kyunki aakhir mein load wahi uthata hai',
          'Client app mein; app khud ginti rakhe aur zyada request na bheje',
        ],
        answer: 0,
        explain: 'Gateway par ek jagah, auth ke baad (key ya user pata ho). Bekaar request andar aane se pehle ruk jaati hai. Kuch mehenge endpoints ke liye service mein alag hadd bhi ho sakti hai.',
        choiceExplanations: [
          'Gateway par ek jagah, auth ke baad (key ya user pata ho). Bekaar request andar aane se pehle ruk jaati hai. Kuch mehenge endpoints ke liye service mein alag hadd bhi ho sakti hai.',
          'Alag-alag hisaab, alag bugs. Aur request service tak pahunch ke resources kha chuki.',
          'DB tak pahunchte-pahunchte poora stack load utha chuka hota hai.',
          'Hamlawar client ka code nahi chalata. Client limit sirf suvidha hai.',
        ],
      },
      {
        q: 'Token bucket ya sliding window counter — kab kya?',
        choices: [
          'Bucket jab burst ki ijaazat chahiye; sliding counter jab smooth hadd chahiye',
          'Token bucket har haal mein behtar; sliding window purana tareeka hai',
          'Sliding counter har haal mein behtar; token bucket mein race hoti hai',
          'Dono ek hi cheez hain; bas alag companies alag naam dete hain',
        ],
        answer: 0,
        explain: 'Token bucket thodi der ka burst deta hai (bucket bhari ho toh). Sliding window counter minute bhar mein smooth hadd rakhta hai. Race dono mein atomic kadam se hi jaati hai.',
        choiceExplanations: [
          'Token bucket thodi der ka burst deta hai (bucket bhari ho toh). Sliding window counter minute bhar mein smooth hadd rakhta hai. Race dono mein atomic kadam se hi jaati hai.',
          'Dono aaj chalte hain; product ki zaroorat tay karti hai.',
          'Race algorithm ki nahi, padhne-likhne ke kram ki hai. Atomic kadam dono ko chahiye.',
          'Burst ka bartaav alag hai.',
        ],
      },
    ],
  },
  success: [
    'Local aur central limit ka trade-off bolna',
    'Atomic check-and-decrement se race rokna',
    'Redis girne par fail open/closed ka faisla karna',
  ],
  homework: `Redis (Docker) mein ek chhota Lua script likho: key ke tokens padho, time ke hisaab se bharo, ek ghatao, aur 0 ho toh 0 lautao.
    Do terminals se ek saath 100 requests bhejo. Script ke bina (GET phir SET) aur script ke saath — kitni zyada requests allow hui?`,
  cards: [
    { front: 'Local vs central limit?', back: 'Local tez, uneven load par galat. Central (Redis) sahi, har request par ek call.' },
    { front: 'Race kaise rokein?', back: 'Lua mein refill, token check aur decrement ek saath. Akela INCR token bucket nahi banata.' },
    { front: 'Redis gira?', back: 'Aam APIs fail open + local backup limit; OTP jaise flows fail closed. Chhota timeout.' },
    { front: 'Hadd paar ka jawab?', back: '429 + Retry-After (+ bache tokens ke headers).' },
  ],
},

/* ---------------------------------------------------------------- I4 */
{
  id: 'iv-typeahead',
  icon: '🔎',
  title: 'Design: Typeahead — har akshar par suggestion',
  badge: 'Akshar Anuyayi',
  objectives: [
    'Har keystroke ek request: QPS kitna, aur latency 100 ms ke andar',
    'Prefix → top-k: trie ya pehle se bani prefix table',
    'Offline aggregation: kal ki searches se aaj ke suggestions',
    'Debounce, edge cache, aur trending ke liye tez raasta',
  ],
  lesson: [
    `<h3>📚 Misaal: library ka librarian</h3>
     <p>Tum likhte ho "Har…" aur librarian turant bolta hai: "Harry Potter, Harivansh Rai…"</p>
     <p>Woh har baar poori library nahi ghoomta. Usne pehle se har shuruaati akshar ke liye top kitaabon ki list bana rakhi hai.</p>
     <p class="tip">🎯 <b>Asli baat:</b> prefix ka jawab <b>pehle se nikaal ke</b> rakho (precompute). Query ke waqt sirf ek lookup.
       Bina sahi index aur bounded results ke <code>LIKE 'har%'</code> mehenga ho sakta hai. Latency benchmark se jaancho.</p>`,
    `<h3>🔢 Numbers (kalpanik)</h3>
     <pre>1 crore daily users × 5 searches/din × ~3 requests per search (debounce ke baad)
= 15 crore requests/din
÷ 86,400 sec ≈ 1,736 rps average  ·  peak (4×) ≈ 6,944 rps
Latency budget: 100 ms (user type kar raha hai)</pre>
     <h3>🌳 Data structure</h3>
     <ul>
       <li><b>Trie</b>: har node ek prefix; node par us prefix ke top-10 pehle se rakho.</li>
       <li><b>Prefix table</b> (key-value): <code>"har" → [10 suggestions]</code>. Shard prefix ke hisaab se.</li>
       <li>Har prefix nahi: lambai ki hadd (jaise 15 akshar), aur sirf woh queries jinki ginti hadd se upar.</li>
     </ul>`,
    `<h3>🏭 Pipeline</h3>
     <pre>search logs → queue → har ghante batch: query ki ginti → har prefix ka top-10
            → nayi prefix table → purani se swap (ek jhatke mein)
Trending: pichhle 10 min ki ginti (streaming) → batch top-10 ke saath merge</pre>
     <p><b>Client par:</b> debounce (100–200 ms ruko), purani request cancel, haal ke prefixes ka local cache.</p>
     <p><b>Edge/CDN cache:</b> chhote, sabke liye ek jaise prefixes ("a", "ha") — personalization na ho toh.</p>
     <p><b>Filter:</b> gaali ya galat suggestions ki blocklist — build par bhi, serve par bhi (turant hatane ke liye).</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — typeahead ka load',
      goal: 'Har keystroke ka bojh khud gino.',
      problems: [
        {
          q: '1 crore users × 5 searches/din × 3 requests per search. Kul requests/din — CRORE mein?',
          unit: 'crore',
          given: ['1 crore users', '5 searches/din', '3 requests per search'],
          answer: 15,
          tol: 0.05,
          steps: ['1 crore × 5 = 5 crore searches', '5 crore × 3 = 15 crore requests'],
          lesson: 'Debounce na ho toh har akshar ek request — 3 ki jagah 6–8.',
        },
        {
          q: '15 crore requests/din. Average kitne requests per second? (1 din = 86,400 second)',
          unit: 'rps',
          given: ['15,00,00,000 requests', '86,400 second'],
          answer: 1736,
          tol: 0.05,
          steps: ['15,00,00,000 ÷ 86,400 ≈ 1,736'],
          lesson: 'Average chhota lagta hai. Peak par plan karo.',
        },
        {
          q: 'Peak = average × 4. Peak rps kitna?',
          unit: 'rps',
          given: ['average ≈ 1,736 rps', 'peak = 4×'],
          answer: 6944,
          tol: 0.05,
          steps: ['1,736 × 4 ≈ 6,944'],
          lesson: 'Lagbhag 7,000 rps aur 100 ms. Memory lookup ek vikalp hai; index aur search engine ko bhi benchmark karo.',
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Typeahead',
      instructions: 'Har slot par sahi chunav. Galat options ka "kyun" bhi padho.',
      brief: `1 crore daily users, peak ~7,000 rps, har suggestion 100 ms ke andar.
        Trending searches (breaking news) jaldi dikhen.`,
      requirements: ['p99 100 ms', 'Peak ~7,000 rps', 'Trending jaldi', 'Galat suggestions turant hatein'],
      pass: 11,
      slots: [
        {
          id: 'store', label: 'Prefix ka jawab kahan se', icon: '🌳',
          options: [
            { id: 'pre', label: 'Pehle se bani prefix → top-10 table, memory mein', score: 3, why: 'Query par ek lookup. 100 ms mein aaram se.' },
            { id: 'like', label: "SQL: LIKE 'har%' ORDER BY count, har keystroke par", score: -3, why: 'Index na ho toh scan aur sort mehenga. Sahi index se prefix search chal sakti hai; benchmark karo.' },
            { id: 'fts', label: 'Har keystroke par full-text search query chalao', score: -1, why: 'Search engine chal sakta hai, par har akshar par ranking mehengi. Precompute sasta.' },
          ],
        },
        {
          id: 'update', label: 'Suggestions kaise badlein', icon: '🏭',
          options: [
            { id: 'batch', label: 'Har ghante batch + trending ka streaming raasta', score: 3, why: 'Sthir top-10 batch se; breaking news minton mein streaming se.' },
            { id: 'live', label: 'Har search par trie ko turant badlo, locks ke saath', score: -2, why: 'Har search par write aur lock — read path dheema.' },
            { id: 'month', label: 'Mahine mein ek baar poori table dobara banao', score: -1, why: 'Sasta, par trending mahine baad dikhega.' },
          ],
        },
        {
          id: 'client', label: 'Client par', icon: '📱',
          options: [
            { id: 'debounce', label: 'Debounce + purani request cancel + local cache', score: 3, why: 'Debounce requests ghataata hai. Cancel ke saath request ID jaancho; purana jawab screen na badle.' },
            { id: 'every', label: 'Har akshar par turant request bhejo, bina ruke', score: -2, why: 'Requests do-teen guna, aur purane jawab der se aakar ulat-pulat.' },
            { id: 'enter', label: 'Sirf Enter dabane par suggestion maango', score: -2, why: 'Ye typeahead hi nahi raha.' },
          ],
        },
        {
          id: 'cache', label: 'Cache', icon: '🌍',
          options: [
            { id: 'edge', label: 'Chhote, sabke liye same prefixes CDN/edge par', score: 3, why: '"a", "ha" jaise prefixes sabse zyada aate hain; edge par sasta aur tez.' },
            { id: 'none', label: 'Koi cache nahi; har request origin tak jaaye', score: -1, why: 'Sabse popular prefixes ka bojh bina wajah origin par.' },
            { id: 'user', label: 'Har user ka cache hamesha ke liye, kabhi expire nahi', score: -2, why: 'Trending aur hataaye gaye suggestions kabhi update nahi honge.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Precompute, batch + streaming, debounce aur edge cache. Har keystroke sasta aur tez.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh read path dheema karta hai ya trending der se laata hai.',
        bad: '🤔 Yaad karo: 7,000 rps aur 100 ms. Har keystroke par bhaari kaam nahi chal sakta.',
      },
    },
    {
      type: 'quiz',
      title: 'Typeahead ke deep-dive sawaal',
      questions: [
        {
          q: 'Breaking news: "chandrayaan" ki searches 10 minute mein 100 guna. Ghante wale batch mein nahi aaya. Kya karoge?',
          choices: [
            'Streaming raasta: pichhle 10 minute ki ginti batch top-10 se merge',
            'Batch ko har minute chalao; poori table har minute dobara banao',
            'Kuch nahi; agle ghante batch mein apne aap aa jaayega',
            'Editor haath se har trending shabd table mein daale',
          ],
          answer: 0,
          explain: 'Batch sthir aur sasta hai, streaming tez. Dono ka merge: lambi ginti + taaza uchhal. Ise lambda-jaisa dhaancha bhi kehte hain.',
          choiceExplanations: [
            'Batch sthir aur sasta hai, streaming tez. Dono ka merge: lambi ginti + taaza uchhal. Ise lambda-jaisa dhaancha bhi kehte hain.',
            'Poori table har minute banana bahut mehenga aur risky swap.',
            'Ek ghante baad news purani ho chuki hogi.',
            'Haath se kaam scale nahi hota aur der lagti hai.',
          ],
        },
        {
          q: 'Ek gaali wala suggestion top-10 mein aa gaya. Turant kaise hataoge?',
          choices: [
            'Serve ke waqt blocklist filter turant; agle build mein bhi hatao',
            'Agle ghante ke batch ka intezaar karo; table dobara banegi',
            'Poori typeahead service band kar do jab tak table saaf na ho',
            'Us shabd ki searches ko DB se mita do, taaki ginti kam ho',
          ],
          answer: 0,
          explain: 'Serve-time filter minton mein lagta hai. Build-time filter agli table ko saaf rakhta hai. Dono parat.',
          choiceExplanations: [
            'Serve-time filter minton mein lagta hai. Build-time filter agli table ko saaf rakhta hai. Dono parat.',
            'Ek ghanta bahut lamba hai — screenshot aur bharosa dono ja chuke.',
            'Ek shabd ke liye poora feature band — zaroorat se bada ilaaj.',
            'Logs mitaana itihaas badalta hai, aur agle din phir aa sakta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Typeahead',
    instructions: 'Classic typeahead ke sawaal. 🎤',
    questions: [
      {
        q: 'Personalized suggestions chahiye (har user ke liye alag). Design mein kya badlega?',
        choices: [
          'Global top-k candidates + user history se re-rank; edge par sirf global hissa',
          'Har user ki alag poori prefix table banao; 1 crore tables',
          'Personalization client par: app saari history se khud suggestion banaaye',
          'Edge cache mein har user ka personalized jawab rakho',
        ],
        answer: 0,
        explain: 'Global candidates cache mein rakho. User history se re-rank karo. Shared cache mein personalized jawab tabhi rakho jab user isolation aur cache key sahi ho.',
        choiceExplanations: [
          'Global candidates cache mein rakho. User history se re-rank karo. Shared cache mein personalized jawab tabhi rakho jab user isolation aur cache key sahi ho.',
          '1 crore tables ka storage aur build bahut bhaari.',
          'Client par poori history aur ranking — bhaari, aur doosre devices par nahi.',
          'User identity cache key mein na ho toh jawab doosre user ko mil sakta hai. Sahi isolation se edge caching mumkin hai.',
        ],
      },
      {
        q: 'Trie ko kai machines par kaise baantoge?',
        choices: [
          'Prefix range se shard; garam prefixes ki replicas',
          'Random baanto; har query sab machines se poochhe',
          'Ek hi badi machine; trie baantna mumkin nahi',
          'Har akshar ki alag machine: 26 machines, bas',
        ],
        answer: 0,
        explain: 'Prefix se shard: ek query ek shard par jaati hai. Kuch prefixes ("s", "a") bahut garam — unki replicas ya aur barik shard.',
        choiceExplanations: [
          'Prefix se shard: ek query ek shard par jaati hai. Kuch prefixes ("s", "a") bahut garam — unki replicas ya aur barik shard.',
          'Har query sab machines par = fan-out ka tax.',
          'Badi machine ki hadd aur ek failure point.',
          'Akshar baraabar nahi hote; "s" wala shard "x" se kai guna bhaari.',
        ],
      },
    ],
  },
  success: [
    'Typeahead ka QPS aur latency budget nikaalna',
    'Precompute + batch + streaming ka dhaancha bolna',
    'Debounce, edge cache aur blocklist jaise deep dives sambhalna',
  ],
  homework: `Kisi search box mein dheere-dheere type karo aur browser ke Network tab mein requests gino.
    Har akshar par request gayi ya debounce hai? Purani request cancel hui? Jawab kitne ms mein aaya?`,
  cards: [
    { front: 'Typeahead ka dil?', back: 'Prefix → top-k pehle se nikaal ke rakho. Query par sirf lookup.' },
    { front: 'Trending kaise?', back: 'Ghante ka batch + pichhle minton ki streaming ginti ka merge.' },
    { front: 'Client par kya?', back: 'Debounce, purani request cancel, local cache.' },
    { front: 'Galat suggestion?', back: 'Serve-time blocklist turant; build-time filter agli table ke liye.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['iv-ratelimiter'] = {
  t: '20 gateway nodes, ek saajha hisaab',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🏪 merchant key</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🚪 gateway (20 nodes)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧠 Redis + Lua<br><small>padho + ghatao, ek kadam</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">✅ allow</span><span class="dg-arrow">/</span>
      <span class="dg-pill bad">429 + Retry-After</span>
    </div>
    <div class="dg-cap">Redis gira: aam APIs fail open + local backup limit; OTP jaise flows fail closed. Memory ~10 MB (1 lakh keys).</div>`,
};
VISUALS['iv-typeahead'] = {
  t: 'Prefix ka jawab pehle se',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 "har" (debounce)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🌍 edge cache</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🌳 prefix table: "har" → top-10</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">📜 search logs</span><span class="dg-arrow">→</span>
      <span class="dg-pill">⏰ har ghante batch</span><span class="dg-arrow">+</span>
      <span class="dg-pill gold">⚡ trending (10 min)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">nayi table, swap</span>
    </div>
    <div class="dg-cap">Peak ~7,000 rps, 100 ms. Blocklist serve par bhi, build par bhi.</div>`,
};

SD.addScenes({
  'iv-ratelimiter': {
    intro: 'Sharma Sweets ki API key: <b>100 requests/minute</b>. Requests 20 gateway nodes par bikhri hain.',
    nodes: [
      { id: 'm', col: 0, row: 0, icon: '🍬', label: 'Sharma Sweets', sub: '100/min ki hadd' },
      { id: 'g1', col: 1, row: 0, icon: '🚪', label: 'gateway node 1' },
      { id: 'g2', col: 1, row: 1, icon: '🚪', label: 'gateway node 2' },
      { id: 'redis', col: 2, row: 0, icon: '🧠', label: 'Redis', sub: 'bucket: 1 token' },
      { id: 'api', col: 3, row: 1, icon: '⚙️', label: 'payments-api' },
    ],
    steps: [
      { from: 'm', to: 'g1', label: 'request 99', say: 'Sharma Sweets ki 99vi request node 1 par.' },
      { from: 'm', to: 'g2', label: 'request 100', say: 'Usi pal 100vi request node 2 par. Bucket mein sirf 1 token bacha hai.' },
      { from: 'g1', to: 'redis', label: 'GET → 1', tone: 'bad', say: 'Purana code: node 1 padhta hai — tokens 1. Node 2 bhi padhta hai — tokens 1.' },
      { at: ['redis'], set: { redis: { tone: 'bad', sub: '2 allow, 1 token tha' } }, say: 'Dono nodes allow kar dete hain. Hadd toot gayi: padhne aur ghatane ke beech race.' },
      { from: 'g2', to: 'redis', label: 'Lua: padho + ghatao', tone: 'good', set: { redis: { tone: 'good', sub: 'atomic: 1 allow, 1 deny' } }, say: 'Ilaaj: Lua script. Redis poora script ek saath chalata hai. Ek node ko token, doosre ko 0.' },
      { from: 'g1', to: 'api', label: 'allow', tone: 'good', say: 'Token wali request payments-api tak jaati hai.' },
      { at: ['g2'], set: { g2: { tone: 'gold', sub: '429 + Retry-After' } }, say: 'Doosri request ko 429 aur Retry-After: kab dobara aana hai, saaf.' },
      { at: ['redis'], say: 'Redis gira toh? Aam API fail open aur har node par local backup limit. OTP jaise mehenge flows fail closed.' },
    ],
  },
  'iv-typeahead': {
    intro: 'Riya search box mein <b>"har"</b> type kar rahi hai. Jawab 100 ms ke andar chahiye.',
    nodes: [
      { id: 'riya', col: 0, row: 0, icon: '📱', label: 'Riya', sub: '"h" → "ha" → "har"', tone: 'accent' },
      { id: 'edge', col: 1, row: 0, icon: '🌍', label: 'Edge cache' },
      { id: 'table', col: 2, row: 0, icon: '🌳', label: 'Prefix table', sub: 'har → top-10' },
      { id: 'logs', col: 2, row: 1, icon: '📜', label: 'Search logs' },
      { id: 'batch', col: 3, row: 1, icon: '🏭', label: 'Ghante ka batch' },
      { id: 'trend', col: 3, row: 0, icon: '⚡', label: 'Trending (10 min)' },
    ],
    steps: [
      { at: ['riya'], set: { riya: { tone: 'accent', sub: 'debounce 150 ms' } }, say: 'Har key ke baad timer dobara shuru: 150 ms ka pause mile toh request. Tez typing mein sirf "har" jaata hai. Bheji gayi purani requests cancel karo; request ID bhi jaancho.' },
      { from: 'riya', to: 'edge', label: '"har"', say: 'Chhota, sabke liye same prefix edge cache par mil sakta hai.' },
      { from: 'edge', to: 'table', label: 'miss → lookup', say: 'Miss par prefix table: "har" ke top-10 pehle se nikaale hue. Ek lookup, kuch ms.' },
      { at: ['riya'], set: { riya: { tone: 'good', sub: 'Harry Potter…' } }, say: 'Riya ko suggestions 100 ms ke andar.' },
      { from: 'logs', to: 'batch', label: 'ginti', say: 'Peeche: har search log mein. Har ghante batch har prefix ka top-10 dobara nikaalta hai.' },
      { from: 'batch', to: 'table', label: 'nayi table, swap', tone: 'good', say: 'Nayi table ek jhatke mein purani ki jagah leti hai.' },
      { from: 'trend', to: 'table', label: 'breaking news merge', tone: 'gold', say: 'Breaking news ke liye pichhle 10 minute ki ginti batch top-10 ke saath merge hoti hai.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-iv-ratelimiter', levels: 'iv-ratelimiter', guide: {
    title: 'Har node ka apna hisaab ya saajha register?',
    misaal: 'Mele ke 20 counters apna-apna hisaab rakhein toh ek aadmi 200 jhoole le lega. Saajha register sahi hai, par har ticket par daud.',
    asli: 'Distributed limit ke liye saajha counter (Redis) aur atomic check-and-decrement. Limiter khud outage na bane.',
    points: [
      '<b>Atomic:</b> padhna + ghatana ek kadam (Lua).',
      '<b>Algorithm:</b> token bucket (burst) ya sliding counter (smooth).',
      '<b>Failure:</b> aam API fail open + local limit; mehenge flows closed.',
    ],
    use: 'Kai gateway nodes par ek merchant/user ki saajhi hadd chahiye.',
    avoid: 'GET aur SET alag-alag karke hadd lagaana.',
    mistake: 'Redis down par poora API band kar dena.',
    compare: [
      { choice: 'Central Redis', when: 'Hadd sahi honi chahiye aur ~1 ms manzoor hai', tradeoff: 'Saajha aur sahi; har request par network call aur Redis ka bojh' },
      { choice: 'Local + token lease', when: 'Latency bahut tight ya traffic bahut bada', tradeoff: 'Kam calls; hadd thodi dheeli, nodes par bache tokens' },
    ],
    followup: 'ChaiPay do regions mein hai. Ek merchant ki hadd dono regions mein saajhi kaise rakhoge?',
    sources: [
      'retry',
      { title: 'Stripe — Scaling your API with rate limiters', url: 'https://stripe.com/blog/rate-limiters' },
      { title: 'Cloudflare — How we built rate limiting capable of scaling to millions of domains', url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/' },
    ],
  } },
  { id: 'pro-iv-typeahead', levels: 'iv-typeahead', guide: {
    title: 'Query par dhoondho ya pehle se nikaal ke rakho?',
    misaal: 'Librarian ne har shuruaati akshar ki top kitaabon ki list pehle se bana rakhi hai, isliye turant bata deta hai.',
    asli: 'Typeahead har keystroke par 100 ms ka sawaal hai. Prefix ke top-k pehle se bano; trending ke liye tez streaming raasta.',
    points: [
      '<b>Precompute:</b> prefix → top-10, memory mein.',
      '<b>Update:</b> ghante ka batch + trending streaming.',
      '<b>Client:</b> debounce, cancel, local cache; edge cache global prefixes ka.',
    ],
    use: 'Search box, address autocomplete, product search jahan har akshar par jawab chahiye.',
    avoid: "Har keystroke par LIKE 'har%' ya bhaari ranking.",
    mistake: 'Personalized jawab ko shared CDN cache key par rakhna.',
    compare: [
      { choice: 'Precomputed prefix table', when: 'Suggestions sabke liye milte-julte, latency tight', tradeoff: 'Lookup tez; build pipeline aur storage chahiye' },
      { choice: 'Query-time search engine', when: 'Bahut personal ya filter-bhari queries', tradeoff: 'Lachila; har keystroke par mehenga aur dheema' },
    ],
    followup: 'Hindi aur English dono mein suggestions chahiye ("chai" Roman mein aur Devanagari mein bhi). Prefix table mein kya badlega?',
    sources: [
      { title: 'Elasticsearch — Completion suggester', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html' },
    ],
  } },
);
})();
