/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · Google Search: 200 ms mein poora web

   Source: "How Google Searches 100 Billion Pages in 200 ms" (Akhil Sharma) —
   GFS, MapReduce, Bigtable, PageRank papers aur "The Tail at Scale".
   (🧩 Patterns → Search level mein inverted index ki buniyaad hai; yahan
    Google ke paimane ki kahani.)
   Docker lab: docker-labs/26-google-search
   ===================================================================== */
(function () {

VISUALS['gs-index'] = {
  t: 'Search pehle hi ho chuki hai',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">📄 Forward index (page → words)</span>\n        <div class=\"dg-cap\">\"Kin pages mein coffee hai?\" — har page kholo. 100 PB par query ke waqt namumkin.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">📚 Inverted index (word → pages)</span>\n        <div class=\"dg-cap\">Kitaab ke peeche ki index jaisa. \"coffee\" → pages ki sorted list (positions + field ke saath).</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">✂️ tokenize + normalize</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">📖 lexicon (term → list kahan)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill gold\">📜 posting list (delta + varint)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">⏭️ skip pointers se AND</span>\n    </div>\n    <div class=\"dg-cap\">Lab 26: 62 MB → 17.7 MB (3.5×). \"common AND rare\": 1,41,752 → 14,696 comparisons.</div>",
};

VISUALS['gs-crawl'] = {
  t: 'Web ko index karna ≠ web ko rakhna',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🌱 seed URLs</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📋 prioritized frontier</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🤖 fetch (robots.txt, crawl budget)</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">🖥️ JS render (dusra pass)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🔗 naye links + canonical</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🔭</span><span class="nl">30+ trillion URLs dekhe</span><span class="ns">zyadatar duplicate, spam, auto-generated, mare links, anant calendars</span></div>
      <div class="dg-node is-good"><span class="ni">📦</span><span class="nl">Saikdon arab rakhe</span><span class="ns">canonicalization: 10 URL, ek page → ek baar</span></div>
      <div class="dg-node is-accent"><span class="ni">⏱️</span><span class="nl">Change rate se recrawl</span><span class="ns">news homepage har kuch minute, 2009 ka page kabhi-kabhi</span></div>
    </div>`,
};

VISUALS['gs-fanout'] = {
  t: 'Ek query, 1,000 machines, aur sabse dheemi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">✍️ query rewrite (spelling, synonyms, entity)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🌳 root → mixers → leaves (doc shards)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🔀 merge wapas upar</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">🐌</span><span class="nl">100 shards, single</span><span class="ns">lab: 1% stragglers → median query 93 ms</span></div>
      <div class="dg-node is-good"><span class="ni">🪞</span><span class="nl">Hedged (p95 ke baad backup)</span><span class="ns">median 14 ms, sirf 3% extra</span></div>
      <div class="dg-node is-gold"><span class="ni">✌️</span><span class="nl">Double (hamesha dono)</span><span class="ns">9 ms, par 100% extra load</span></div>
    </div>
    <div class="dg-cap">Fan-out par <b>tail latency hi tumhari latency hai</b>.</div>`,
};

VISUALS['gs-rank'] = {
  t: 'Sab par sasta, kuch par mehenga',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">arabon</span><span class="cmd">Retrieval — BM25 + WAND</span><span class="q">shards par, sasta aur mota-mota; jo top-k tak pahunch hi nahi sakte unhe skip</span></div>
      <div class="dg-rung g"><span class="lv">~saikdon</span><span class="cmd">Ranking — saikdon signals + ML</span><span class="q">PageRank, intent, freshness, speed, language, BERT…</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🚶 PageRank</span>
        <div class="dg-cap">Random surfer links par click karta hai, kabhi-kabhi (damping) random page par kood jaata hai.
          Lab: link farm ne junk page #1 kar diya; damping ke baad #2; TrustRank seeds se #1646.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🤖 AI Overviews</span>
        <div class="dg-cap">LLM ko aaj ka nahi pata aur woh gadh leta hai → pehle RETRIEVE (poora search stack), phir citations ke
          saath summary = grounding / RAG planet scale par. Retrieval aur zaroori ho gaya.</div></div>
    </div>`,
};

SD.registerLevels('planet', [
/* =====================================================================
   1. gs-index
   ===================================================================== */
{
  id: 'gs-index',
  icon: '📚',
  title: 'Google Search — jawab pehle se tayyar hai',
  badge: 'Index Ustaad',
  objectives: [
    '"Saara bhaari kaam query se PEHLE" — 100 PB ki physics',
    'Forward vs inverted index; tokenize, lexicon, posting list',
    'Delta + varint compression',
    'Skip pointers se AND intersection — lab mein',
  ],
  lesson: [
    `<h3>⏳ 200 ms mein 100 PB nahi padh sakte</h3>
     <p>Index mein 100 arab+ pages, 100+ PB. Query ke waqt itna padhna tuning nahi, <b>physics</b> ka sawaal hai. Toh
     search asal mein <b>din/hafte pehle</b> ho chuki hai. Ek line: <b>saara bhaari kaam query se pehle, kabhi uske
     dauraan nahi.</b></p>
     <h3>📚 Kitaab ke peeche ki index</h3>
     <p><b>Forward index</b> (page → uske words) "kin pages mein coffee hai?" ke liye bekaar — sab pages kholne padenge.
     <b>Inverted index</b> (word → pages) wahi hai jo kitaab ke peeche hota hai:</p>
     <ul>
       <li><b>Tokenize</b> — terms, lowercase, normalize/stem (running/ran/run).</li>
       <li><b>Lexicon</b> — term → uski list disk par kahan.</li>
       <li><b>Posting list</b> — doc IDs + positions + field (title, heading). Positions se "coffee grinder" phrase aur
       bikhre hue words mein farq.</li>
     </ul>`,
    "<h3>🗜️ Compression = RAM mein fit ya nahi</h3>\n     <p>Doc IDs sorted hain → ID ki jagah <b>pichhle se farq</b> (gap/delta) likho → chhote numbers → variable-byte /\n     group varint. Doc IDs aise baanto ki milte-julte achhe pages paas hon (gaps aur chhote). 100 PB par compression ka\n     matlab: fast memory mein fit hoga ya nahi.</p>\n     <h3>⏭️ Skip pointers</h3>\n     <p>\"coffee grinder\" = do posting lists ka <b>intersection</b>. Chhoti list ke har doc ke liye lambi list mein\n     signposts se chhalaang lagao (doc 9 lakh par seedha), phir chhota search.</p>\n     <pre>lab 26 (ex1) — 2 lakh docs, 1.6 crore postings:\nposting lists: raw 62.0 MB → delta+varint 17.7 MB (3.5×)\nAND                           bina skip     skip pointers\nbahut common + bahut common    1,56,250        9,06,304   ← dono badi: seedha merge behtar!\ncommon + rare                  1,41,752          14,696   ← 9.6× kam\nrare + rare                       2,673           7,281</pre>\n     <p class=\"tip\">🎯 Skip pointers tab jeet-te hain jab ek list chhoti ho. Dono badi hon toh seedha merge. Asli engines\n     list sizes dekh ke tareeka chunte hain.</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — inverted index: compression aur intersection',
      project: '26-google-search',
      exercise: 'ex1',
      goal: '2 lakh documents ka index banao — posting lists kitni chhoti hoti hain, aur AND query mein skip pointers kab kaam aate hain.',
      why: `<code>tools/index.js</code>: Zipf jaisa corpus (kuch shabd bahut common). Posting list raw 4-byte ints vs delta + varint.
        AND: seedha merge vs √n skip pointers + block ke andar binary search. Koi server nahi.`,
      steps: [
        { text: 'Index banao aur compression dekho.', cmd: 'cd docker-labs/26-google-search && node tools/index.js | head -4', expect: '200,000 documents, 5000 shabd, 16,262,112 postings\n\nposting lists: raw 4-byte ints 62.0 MB  →  delta + varint 17.7 MB  (3.5x chhota)' },
        { text: 'AND queries dekho.', cmd: 'node tools/index.js | tail -6', expect: 'bahut common + bahut common       118035 × 102778          156250                  906304          64563\ncommon + rare                     141391 × 1693            141752                   14696          1276\nrare + rare                         1410 × 1275              2673                    7281          11' },
      ],
      observe: {
        q: 'Do bahut common shabdon ke AND par skip pointers ne kaam 6× BADHA diya. Kyun?',
        choices: ["Dense similar lists favored linear merge","Skips universally reduce all comparisons","Only corrupted posting data explains cost","More common terms require less work"],
        answer: 0,
        explain: 'Algorithm input ki shakal dekh ke chuno — ek hi tareeka har jagah best nahi.',
       choiceExplanations: ["Algorithm input ki shakal dekh ke chuno — ek hi tareeka har jagah best nahi.","Skip/galloping overhead input density and gaps par depend karta hai.","Measured algorithm cost difference corruption prove nahi.","Common terms large posting lists create karte hain."] },
      lesson: 'Index ka design = compression (kya fit hoga) + intersection strategy (kitna kaam per query).',
    },
    {
      type: 'order',
      title: 'Ek page index tak',
      instructions: 'Crawl hue page ka inverted index mein aane ka kram.',
      steps: [
        { text: 'Page ka text nikaalo (HTML/JS render ke baad)', explain: 'Asli content pehle chahiye.' },
        { text: 'Tokenize + lowercase + normalize/stem', explain: '"Running" aur "run" ek term.' },
        { text: 'Har term ke liye (doc ID, positions, field) nikaalo', explain: 'Positions phrase search ke liye, field (title) ranking ke liye.' },
        { text: 'Term ki posting list mein sorted jagah par jodo', explain: 'Sorted doc IDs = delta encoding mumkin.' },
        { text: 'Delta + varint se compress, skip pointers lagao', explain: 'Chhota = RAM mein fit; skips = tez AND.' },
        { text: 'Lexicon update: term → list ka naya pata', explain: 'Query ke waqt pehla lookup yahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — inverted index',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Posting lists RAM mein fit nahi ho rahi."',
        choices: ["Delta compression and access-aware tiers","Only JSON encoding improves compactness","Drop all rare terms without relevance eval","RAM purchase removes all future growth"],
        answer: 0,
        explain: "Lab: 3.5× chhota sirf delta+varint se.",
       choiceExplanations: ["Lab: 3.5× chhota sirf delta+varint se.","Verbose encodings posting-id deltas ka compact structure waste kar sakti hain.","Rare terms relevant retrieval signal ho sakte hain.","Capacity additions cost and growth limits retain karti hain."] },
      {
        q: 'Interviewer: "AND query dheemi hai jab ek shabd bahut common hai."',
        choices: ["Small-list drive, skip/gallop long list","Drop common terms regardless of meaning","Cache every possible query forever","Every pair best handled by same merge"],
        answer: 0,
        explain: 'Lab: 1,41,752 → 14,696 comparisons.',
       choiceExplanations: ["Lab: 1,41,752 → 14,696 comparisons.","Common term query semantics affect kar sakta hai.","Query space and freshness cache limits rakhte hain.","Relative list sizes/density input strategy decide karte hain."] },
    ],
  },
  success: [
    'Main samjha sakta hoon ki search query se pehle kyun "ho chuki" hai',
    'Main inverted index ke hisse aur delta+varint compression bata sakta hoon',
    'Main skip pointers kab kaam aate hain, lab se dikha sakta hoon',
  ],
  homework: `<p>Apne DB mein ek column jiske saath LIKE/IN wali queries chalti hain (tags, keywords) — woh asal mein ek inverted
    index maang raha hai. Likho: forward (row → tags) aur inverted (tag → rows) mein se abhi kaunsa hai, aur doosra banane se
    kaunsi query kitni tez hogi?</p>`,
  cards: [
    { front: 'Google ka search ka siddhant?', back: 'Saara bhaari kaam query se pehle — 100 PB query ke waqt padhna physics mein namumkin. Query ek lookup ban jaaye.' },
    { front: 'Delta + varint?', back: "Sorted doc IDs ki jagah gaps likho → chhote numbers → varint mein zyadatar 1 byte. Lab: 62 MB → 17.7 MB." },
    { front: 'Skip pointers kab?', back: "Jab ek list chhoti ho: chhalaang + chhota search (lab 9.6× kam). Dono badi ho toh seedha merge behtar." },
  ],
},

/* =====================================================================
   2. gs-crawl
   ===================================================================== */
{
  id: 'gs-crawl',
  icon: '🕷️',
  title: 'Crawler — web ko padhna, par sab rakhna nahi',
  badge: 'Frontier Fakir',
  objectives: [
    'Prioritized frontier, robots.txt, crawl budget',
    'Canonicalization aur JS rendering ka dusra pass',
    'Change rate se recrawl; "index karna ≠ rakhna"',
    'GFS/MapReduce/Bigtable/Borg aur Caffeine (incremental)',
  ],
  lesson: [
    `<h3>🕷️ Googlebot ka kaam</h3>
     <p>Page laao → links nikaalo → <b>prioritized frontier</b> mein daalo (FIFO nahi — zaroori aur jaldi badalne wale
     pehle) → hamesha chalta raho. Niyam:</p>
     <ul>
       <li><b>robots.txt</b> maano; har site ki raftaar tay (<b>crawl budget</b>) — kisi ka server mat giraao.</li>
       <li><b>Sitemaps</b> se madad.</li>
       <li><b>Canonicalization</b> — 10 URLs, ek hi page (tracking params, http/https, mobile) → ek baar rakho.</li>
       <li>Aaj ka web JavaScript maangta hai → headless Chrome-jaisa rendering, aksar baad mein <b>dusra pass</b> (mehenga).</li>
       <li>Har page ki <b>badalne ki raftaar</b> ka andaaza → news homepage har kuch minute, 2009 ka blog kabhi-kabhi.</li>
     </ul>
     <p>1999: 5 crore pages ≈ ek mahina. 2012: wahi kaam ek minute se kam. 30 trillion+ unique URLs dekhe (kuch kehte
     100T+), rakhe saikdon arab — baaki duplicate, spam, auto-generated, mare links, anant calendars. <b>Web ko index
     karna ≠ web ko rakhna.</b></p>`,
    `<h3>🏗️ Infra jo yahin paida hua</h3>
     <table>
       <tr><th>Zaroorat</th><th>Jo bana</th></tr>
       <tr><td>Petabytes ki files</td><td>GFS → Colossus</td></tr>
       <tr><td>Parallel processing</td><td>MapReduce</td></tr>
       <tr><td>Index store</td><td>Bigtable</td></tr>
       <tr><td>Cluster manager</td><td>Borg (→ Kubernetes ki prerna)</td></tr>
     </table>
     <p><b>Anchor text</b> <b>target</b> page par index hota hai — isliye ek page un shabdon par bhi rank kar sakta hai jo
     us page par likhe hi nahi ("click here" wale links bhi kuch batate hain).</p>
     <h3>⚡ Batch se incremental</h3>
     <p>Pehle index batch mein dobara banta tha → naya page agle pass ka intezaar karta tha. ~2010 <b>Caffeine</b>,
     <b>Percolator</b> par — incremental, chhote transactions → minutes. Precompute ka nuksaan: <b>index hamesha ek
     snapshot</b> hai; freshness apna alag, hamesha chalne wala system hai (breaking news / live scores ke fast paths).</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Rakhein ya chhodein?',
      instructions: 'Crawler ko ye mila. Index mein rakhna chahiye?',
      bins: [
        { id: 'keep', label: '📦 Rakho (index karo)' },
        { id: 'drop', label: '🗑️ Chhodo / merge karo' },
      ],
      items: [
        { text: 'example.com/shoes?utm_source=ad — wahi page jo example.com/shoes', bin: 'drop', explain: 'Canonicalization — ek page, ek baar.' },
        { text: 'Naya news article jo abhi publish hua', bin: 'keep', explain: 'Fresh aur unique — jaldi index karo.' },
        { text: 'calendar.example.com/2071/06/14 — anant calendar ka ek din', bin: 'drop', explain: 'Crawler trap — anant auto-generated pages.' },
        { text: 'Spam page jo 10,000 keywords repeat karta hai', bin: 'drop', explain: 'Rakhna = ranking ko zeher.' },
        { text: 'Kisi chhoti library ka unique documentation page', bin: 'keep', explain: 'Long tail — kam log par sirf yahi jawab.' },
        { text: '404 wala link', bin: 'drop', explain: 'Mara link — frontier se hatao.' },
      ],
    },
    {
      type: 'estimate',
      title: 'Napkin math — crawl ka paimana',
      goal: 'Crawler ki raftaar aur recrawl ka bojh nikaalo.',
      problems: [
        {
          q: '500 arab pages har mahine ek baar recrawl. Crawler ko per SECOND kitne pages?',
          unit: 'pages/sec', given: ['5 × 10^11 pages', '30 din = 25,92,000 sec'],
          answer: 192901, tol: 0.3,
          steps: ["5e11 / 2.592e6 ≈ 1.93 lakh pages/sec"],
          lesson: 'Aur yeh sirf ek baar/mahina — news jaisi jagah har kuch minute. Isi liye change-rate se priority.',
        },
        {
          q: 'Agar 1% pages (fast movers) har 10 minute recrawl hon, 500 arab mein se — woh akele kitne pages/sec?',
          unit: 'pages/sec', given: ['1% × 5 × 10^11 = 5 × 10^9', 'har 600 sec'],
          answer: 8333333, tol: 0.3,
          steps: ['5e9 / 600 ≈ 83 lakh pages/sec', 'Isliye "fast mover" ki pehchaan bahut sahi honi chahiye — galat andaaza = barbaad crawl'],
          lesson: 'Recrawl ka budget change-rate ke andaaze par tika hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — web crawler',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Crawler kisi chhoti site ko gira deta hai."',
        choices: ["Per-host robots/rate/backoff policy","Only global worker count decrease","Only schedule all crawls at night","Ignore site errors after 200response"],
        answer: 0,
        explain: "Per-host queues and adaptive request budgets site overload reduce karte hain. RFC 9309 robots rules honor karo; crawl-delay nonstandard hai aur every crawler support nahi karta. Latency, errors, Retry-After and operator guidance se polite rate adjust karo.",
       choiceExplanations: ["Per-host queues and adaptive request budgets site overload reduce karte hain. RFC 9309 robots rules honor karo; crawl-delay nonstandard hai aur every crawler support nahi karta. Latency, errors, Retry-After and operator guidance se polite rate adjust karo.","Global bound one small host par concentrated load still allow kar sakta hai.","Time alone host capacity or availability guarantee nahi.","Errors, latency and owner policy rate adaptation inform karte hain."] },
      {
        q: 'Interviewer: "Naye pages search mein aane mein din lagte hain."',
        choices: ["Measure crawl-to-index lag, incremental path","Only more crawler threads before diagnosis","Daily full index satisfies minute freshness","Submit endpoint proves page searchable"],
        answer: 0,
        explain: 'Caffeine ka sabak: batch pass ka intezaar hi der hai.',
       choiceExplanations: ["Caffeine ka sabak: batch pass ka intezaar hi der hai.","Slow stage parsing/indexing/publishing ho sakti hai, not fetch alone.","Daily cadence minute-level contract meet nahi karti.","Receipt and indexed/searchable state distinct hain."] },
    ],
  },
  success: [
    'Main prioritized frontier aur politeness samjha sakta hoon',
    'Main canonicalization aur "index ≠ rakhna" ka tark de sakta hoon',
    'Main batch se incremental indexing ka faayda bata sakta hoon',
  ],
  homework: `<p>Apne product mein koi "crawler" dhoondho — sync job, scraper, webhook poller, recon script. Kya woh sab kuch ek hi
    raftaar se dobara padhta hai? Change-rate ke hisaab se priority lagao toh kitna kaam bachega?</p>`,
  cards: [
    { front: 'Prioritized frontier?', back: 'FIFO nahi — zaroori aur jaldi badalne wale URLs pehle; har host ka crawl budget; change-rate ka andaaza se recrawl.' },
    { front: '"Index karna ≠ rakhna"?', back: '30T+ URLs dekhe, saikdon arab rakhe — duplicate (canonicalization), spam, auto-generated, mare links, anant calendars hatao.' },
    { front: 'Caffeine/Percolator?', back: '~2010: batch rebuild se incremental indexing (chhote transactions) → naya page minutes mein. Par index hamesha snapshot — freshness alag system.' },
  ],
},

/* =====================================================================
   3. gs-fanout
   ===================================================================== */
{
  id: 'gs-fanout',
  icon: '🌳',
  title: 'Fan-out — 1,000 machines aur sabse dheemi',
  badge: 'Tail Tamer',
  objectives: [
    'Document vs term sharding — Google document se kyun',
    'Query rewrite aur scatter-gather tree',
    'Tail at scale: hedged aur tied requests',
    'Tiering, replication aur result cache',
  ],
  lesson: [
    `<h3>🗂️ Shabd se baanto ya page se?</h3>
     <table>
       <tr><th></th><th>Term-partitioned (shabd se)</th><th>Document-partitioned (page se)</th></tr>
       <tr><td>Shard mein</td><td>Kuch shabdon ki poori lists</td><td>Kuch pages ka poora chhota index</td></tr>
       <tr><td>Query chhooti</td><td>Kam shards</td><td><b>Har</b> shard</td></tr>
       <tr><td>Parallelism / ranking</td><td>Kam; bade shabd ek shard par bhaari</td><td>Zyada; har shard apne pages ko khud score kare</td></tr>
     </table>
     <p>Google <b>document</b> se baantta hai: hazaron slices, har ek complete chhota inverted index. Har shard bas
     "mere pages mein se kaun match karta hai" batata hai.</p>
     <h3>🌳 Scatter-gather tree</h3>
     <p>Pehle <b>query rewrite</b>: spelling, variants/synonyms ("speed up slow laptop" ≈ "make my computer faster"),
     Knowledge Graph se entity ("jaguar top speed" = janwar). Phir root → mixers → leaves (shards) → jawab wapas upar
     merge. Ek query ≈ <b>1,000 machines</b>.</p>`,
    "<h3>🐌 1,000 ka intezaar = sabse dheeme ka intezaar</h3>\n     <p>Aam shard 5 ms, par kabhi GC pause, busy hardware, slow disk → 50 ms. 1,000 mein se ek bhi dheema = poori query\n     dheemi. \"The Tail at Scale\" (Dean & Barroso) ke ilaaj:</p>\n     <ul>\n       <li><b>Hedged</b> — jawab p95 tak nahi aaya toh dusre replica ko bhi bhejo, pehla jawab lo.</li>\n       <li><b>Tied</b> — dono replicas ko bhejo par unhe ek dusre ka pata ho; jo shuru kare woh doosre ko cancel kare → do\n       baar ka kharcha nahi.</li>\n     </ul>\n     <pre>lab 26 (ex2-fanout) — leaf ~4 ms, 1% requests +50.. 150 ms:\nshards  mode      p50     p99     leaf requests per query\n    1   single     4 ms    96 ms    1.0\n  100   single    93 ms   157 ms  100.0        ← 63% queries mein kam se kam ek straggler\n  100   hedged    14 ms    78 ms  103.5 (3% extra)\n  100   double     9 ms    66 ms  200.0 (100% extra)</pre>\n     <h3>🏎️ Aur tez kaise</h3>\n     <ul>\n       <li>Serving index <b>RAM + flash</b> mein (disk seek budget kha jaata hai).</li>\n       <li><b>Tiering</b> — popular high-quality pages ka chhota tier sabse tez storage mein; long tail sasta, sirf zaroorat par.</li>\n       <li>Poora stack duniya bhar mein <b>replicate</b> (~8.5 arab searches/din): paas, throughput, survival.</li>\n       <li>Measured repeated queries ke liye bounded <b>result cache</b>; identity, permissions, personalization aur freshness key/policy mein include karo. Historical query-share percentage current workload ki guarantee nahi.</li>\n     </ul>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — tail at scale',
      project: '26-google-search',
      exercise: 'ex2-fanout',
      goal: '1 shard vs 100 shards; single vs hedged vs double — median/p99 aur extra load.',
      why: "<code>services/leaf.js</code>: aam request ~4 ms (lognormal), 1% \"straggler\" +50.. 150 ms. <code>services/root.js</code> 100 shards\n        par ek saath bhejta hai aur sabka intezaar karta hai. Hedged = 10 ms (≈p95) baad dusre replica ko bhi.",
      steps: [
        { text: 'Leaf + root chalao.', cmd: 'cd docker-labs/26-google-search && npm start ex2-fanout', expect: 'ex2-fanout\n[leaf] :5021 straggler=1%\n[root] :5022 hedge after 10 ms' },
        { text: 'Fan-out tool chalao.', cmd: 'node tools/fanout.js', expect: '    1   single        4 ms     96 ms    112 ms   1.0 (0% extra)\n  100   single       93 ms    157 ms    159 ms   100.0 (0% extra)\n  100   hedged       14 ms     78 ms     78 ms   103.5 (3% extra)\n  100   double        9 ms     66 ms    113 ms   200.0 (100% extra)' },
      ],
      observe: {
        q: '1 shard par 1% stragglers median mein dikhte bhi nahi (4 ms). 100 shards par median 93 ms kyun?',
        choices: ["Independent leaf tails amplify under fanout","Each leaf becomes 100x slower necessarily","Median guarantees no individual straggler","One shard mean equals query p99"],
        answer: 0,
        explain: "Independent 1%slow leaves aur 100-leaf wait-for-all query mein at least one slow leaf chance 1-0.99^100 roughly 63% hai. Independence/correlation and full latency distributions matter; leaf quantiles simply add nahi kar sakte.",
       choiceExplanations: ["Independent 1%slow leaves aur 100-leaf wait-for-all query mein at least one slow leaf chance 1-0.99^100 roughly 63% hai. Independence/correlation and full latency distributions matter; leaf quantiles simply add nahi kar sakte.","Fanout maximum changes aggregate distribution without changing leaf speed.","Median hides rare slow events.","Means and quantiles cannot be substituted or simply added."] },
      lesson: 'Hedging: sirf dheeme ke liye backup — 3% extra load mein median 93 → 14 ms.',
    },
    {
      type: 'quiz',
      title: 'Fan-out ki samajh',
      questions: [
        {
          q: 'Tied requests hedged se behtar kab?',
          choices: ["Queue-aware duplicate cancellation","Cancellation guarantees exactly one start","Tied requests need only one replica","Network speed alone ensures safe cancel"],
          answer: 0,
          explain: "Tied requests queued replicas coordinate cancellation to reduce redundant execution. Race conditions can still start both copies; idempotency, cancellation support and load budget required hain. Hedging effectiveness measured queue/service shape par depend karti hai.",
         choiceExplanations: ["Tied requests queued replicas coordinate cancellation to reduce redundant execution. Race conditions can still start both copies; idempotency, cancellation support and load budget required hain. Hedging effectiveness measured queue/service shape par depend karti hai.","Cancellation races may let both requests start; idempotency/load budgets matter.","Redundant dispatch requires alternative execution capacity.","Queue behavior and coordination determine useful savings."] },
        {
          q: "Measured search workload mein most normalized queries repeat hoti hain. Bounded result cache kab useful hai?",
          choices: ["Measured repeated queries enable bounded cache","Cache replaces entire document index","All personalized users share one response","Every query remains fresh forever"],
          answer: 0,
          explain: "Repeated eligible queries bounded cache se serve ho sakti hain. Cache key identity, permissions, personalization and query options include kare; invalidation/freshness budget needed hai. Historical percentage ko current universal Google fact mat maano.",
         choiceExplanations: ["Repeated eligible queries bounded cache se serve ho sakti hain. Cache key identity, permissions, personalization and query options include kare; invalidation/freshness budget needed hai. Historical percentage ko current universal Google fact mat maano.","Misses and changing corpus still need retrieval/indexing.","Cache key must respect identity, permissions and personalization.","Invalidation, freshness and TTL policies constrain reuse."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — scatter-gather',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamari search 50 shards par jaati hai; p50 theek hai par p99 kharab."',
        choices: ["Inspect leaf tails and bound redundant work","Leaf p99 always equals query median","More timeout removes slowest leaf work","Every request should hedge immediately"],
        answer: 0,
        explain: "Fanout increases probability of at least one slow leaf; 50 independent leaves with 1%slow chance give roughly 39.5%, not automatically a slow median. Trace leaf causes, deadlines, partial-result contract and bounded hedging evaluate karo.",
       choiceExplanations: ["Fanout increases probability of at least one slow leaf; 50 independent leaves with 1%slow chance give roughly 39.5%, not automatically a slow median. Trace leaf causes, deadlines, partial-result contract and bounded hedging evaluate karo.","Aggregate percentile depends fanout count and dependence, not a universal equality.","Timeout changes waiting budget; bottleneck may remain.","Unbounded hedging amplifies load precisely during overload."] },
      {
        q: 'Interviewer: "Document sharding mein har query har shard par jaati hai. Term sharding kyun nahi?"',
        choices: ["Term locality vs hot terms and ranking merge","Term sharding mathematically impossible","Document sharding has no query fanout","Term count alone defines best design"],
        answer: 0,
        explain: 'Har faisle ki keemat: document sharding = har query ka fan-out.',
       choiceExplanations: ["Har faisle ki keemat: document sharding = har query ka fan-out.","Term sharding possible hai; load/skew and score combination tradeoffs hain.","Document sharding commonly scatters query to many partitions.","Query distribution, storage layout and scoring model decide fit."] },
    ],
  },
  success: [
    'Main document vs term sharding ka trade-off bata sakta hoon',
    'Main tail at scale lab ke numbers se samjha sakta hoon',
    'Main hedged/tied requests, tiering aur result cache ka kaam bata sakta hoon',
  ],
  homework: "<p>Apne system ka koi fan-out dhoondho (ek request → N services/shards). Har ek ka p99 nikaalo. Ab hisaab lagao:\n    agar har ek 1% baar dheema hai toh poori request kitne % baar dheemi hogi? (1 − 0.99^N)</p>",
  cards: [
    { front: 'Google document se shard kyun?', back: 'Har shard ek complete chhota index, apne pages khud score kare — parallelism + ranking. Keemat: har query har shard par (~1,000 machines).' },
    { front: 'Tail at scale (lab)?', back: '1% stragglers: 1 shard par median 4 ms; 100 shards par median 93 ms (63% queries mein straggler). Hedged: 14 ms, sirf 3% extra.' },
    { front: 'Hedged vs tied?', back: 'Hedged: p95 ke baad dusre replica ko bhi, pehla jawab lo. Tied: dono ko bhejo, jo shuru kare woh doosre ko cancel — double kaam nahi.' },
  ],
},

/* =====================================================================
   4. gs-rank
   ===================================================================== */
{
  id: 'gs-rank',
  icon: '🏆',
  title: 'Ranking — sasta sab par, mehenga kuch par',
  badge: 'Rank Rakshak',
  objectives: [
    'Do phase: retrieval (BM25 + WAND) phir ranking',
    'PageRank: random surfer aur damping — aur link farms',
    'Saikdon signals + ML (RankBrain, BERT)',
    'AI Overviews = grounding / RAG planet scale par',
  ],
  lesson: [
    "<h3>🪜 Do phase</h3>\n     <ol>\n       <li><b>Retrieval</b> — shards par, sasta aur mota-mota. BM25: shabd kitni baar aur kahan aaya. Dynamic pruning\n       (<b>WAND</b> / Block-Max WAND): jo chunks top-k tak pahunch hi nahi sakte unhe skip.</li>\n       <li><b>Ranking</b> — bache kuch saikdon par mehenga aur saavdhan.</li>\n     </ol>\n     <p><b>\"Sab par sasta, kuch par mehenga.\"</b></p>\n     <h3>🚶 PageRank — random surfer</h3>\n     <p>Link = vote; important pages ke vote zyada bhaari. Socho ek surfer hamesha links par click karta hai, aur kabhi-kabhi\n     (<b>damping</b>, ~15%) bore hoke kisi bhi random page par kood jaata hai. PageRank = surfer kitni baar us page par\n     pahunchta hai. Web graph par baar-baar ghumao jab tak numbers tik na jaayein. Faisla web khud karta hai — fake karna\n     mushkil (par namumkin nahi).</p>\n     <pre>lab 26 (ex3) — 10,000 asli pages + 300 page ka link farm + \"cheap-pills.biz\":\nd = 0.99                      farm ke paas 5.2% rank   target #1\nd = 0.85 (paper wala)         3.0%                     target #2\nd = 0.85 + TrustRank seeds    0.1%                     target #1646</pre>\n     <p>Damping farm ke jaal ko chhota karta hai, par 300 nakli pages phir bhi junk ko top 2 mein le aaye. Teleport sirf\n     bharosemand seeds par → farm tak rank pahunchti hi nahi.</p>",
    `<h3>🧠 Aaj: saikdon signals</h3>
     <p>PageRank ab <b>saikdon</b> signals mein se ek hai: intent match, freshness, speed, location, language, device… aur ML:
     RankBrain (2015, pehla ML signal), neural matching, BERT (2019 — query ko bhasha ki tarah: "change a tire" ↔ "replacing a
     flat"). Retrieval lagbhag solved engineering hai; ranking SEO ke saath <b>kabhi na khatam hone wali jung</b>.</p>
     <h3>🤖 AI Overviews — RAG planet scale par</h3>
     <p>LLM akela aaj ki baat nahi jaanta aur gadh leta hai. Isliye AI Overviews / AI Mode pehle <b>poora search stack</b>
     chalate hain (crawl, index, fan-out, retrieve, rank), phir citations ke saath summary likhte hain = <b>grounding</b>.
     Retrieval ab <b>aur</b> zaroori ho gaya.</p>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Tez jawab = pehle se diya hua jawab.</li>
       <li>Fan-out par tail latency hi latency hai.</li>
       <li>Retrieval aur ranking alag.</li>
       <li>Dohraaya kaam dhoondho, ek baar karo (cache index jitna zaroori).</li>
       <li>Precomputed = purana → freshness apna hamesha ka system.</li>
     </ol>
     <p class="tip">🎯 Har design par sawaal: <b>"kya yeh kaam pehle se karke request ko ek lookup bana sakta hoon?"</b></p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — do phase kyun',
      goal: 'Sasta-sab-par, mehenga-kuch-par ka hisaab.',
      problems: [
        {
          q: '1 crore candidate pages, mehenga ranking model 50 µs per page. Sab par chalao toh kitne SECOND?',
          unit: 'second', given: ['1,00,00,000 pages', '50 µs'],
          answer: 500, tol: 0.3,
          steps: ['1e7 × 50e-6 = 500 s', 'Budget 200 ms — namumkin'],
          lesson: 'Isliye pehle sasta BM25 + WAND.',
        },
        {
          q: 'BM25 se top 500 bache. Mehenga model un par kitne ms?',
          unit: 'ms', given: ['500 pages', '50 µs'],
          answer: 25, tol: 0.3,
          steps: ['500 × 50 µs = 25 ms'],
          lesson: 'Do phase: dono milke budget mein.',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — PageRank aur link farm',
      project: '26-google-search',
      exercise: 'ex3',
      goal: "10,000 asli pages + 300 page ka link farm — damping 0.99, 0.85 aur TrustRank seeds par junk page ki position.",
      why: `<code>tools/pagerank.js</code>: preferential attachment se asli web; farm ke pages sirf ek dusre ko aur target ko link karte hain;
        asli web se sirf 3 galti ke links farm mein. Power iteration (500 rounds). Koi server nahi.`,
      steps: [
        { text: 'PageRank chalao.', cmd: 'cd docker-labs/26-google-search && node tools/pagerank.js', expect: 'd = 0.99 (lagbhag koi teleport nahi)       5.2 %            #1                  page 0 (#2)\nd = 0.85 (Google paper wala)               3.0 %            #2                  page 0 (#1)\nd = 0.85 + TrustRank seeds                 0.1 %            #1646               page 0 (#1)' },
        { text: 'Tool ka nishkarsh padho.', cmd: 'node tools/pagerank.js | tail -3', expect: 'Fix: teleport sirf bharosemand pages par (TrustRank) → farm tak rank pahunchti hi bahut kam hai → target #1600+.' },
      ],
      observe: {
        q: 'Sirf 3 asli links farm mein jaate hain, phir bhi target #1 kaise ho gaya?',
        choices: ["Link structure concentrates rank in toy farm","Three links prove content is highest quality","Damping means link farms cannot bias rank","Any high rank proves algorithm corruption"],
        answer: 0,
        explain: 'Isi liye damping aur trust — aur isi liye links aaj bas ek signal hain.',
       choiceExplanations: ["Isi liye damping aur trust — aur isi liye links aaj bas ek signal hain.","Link quantity/structure content quality establish nahi karti.","Teleportation limits trapping but manipulative links can still influence scores.","Adversarial graph structure simple ranking objective exploit kar sakti hai."] },
      lesson: 'Jo signal khareeda ja sake, use akele mat tolo — bharose ki jaddon se naapo.',
    },
  ],
  interview: {
    title: 'Interview Round — ranking system',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Product search mein ML ranking lagani hai par latency budget 100 ms."',
        choices: ["Cheap candidates, expensive bounded rerank","Full expensive model on every product","Fixed nightly ranking for every user","Only larger model meets latency target"],
        answer: 0,
        explain: 'Sab par sasta, kuch par mehenga.',
       choiceExplanations: ["Sab par sasta, kuch par mehenga.","Full catalog reranking too many expensive evaluations demand kar sakti hai.","Static list freshness/personalization needs miss kar sakti hai.","Model size latency budget guarantee nahi; pipeline measurement chahiye."] },
      {
        q: 'Interviewer: "LLM se answers de rahe hain, galat facts aa rahe hain."',
        choices: ["Ground, verify support and evaluate failures","Retrieved context guarantees true answer","Temperature zero guarantees factuality","Cache converts wrong fact to correct"],
        answer: 0,
        explain: "Retrieved context candidate evidence deta hai, guaranteed truth nahi. Answer claims ko trusted sources se support-check, freshness/authorization validate aur representative failures evaluate karo. Product-specific current internal pipeline infer mat karo.",
       choiceExplanations: ["Retrieved context candidate evidence deta hai, guaranteed truth nahi. Answer claims ko trusted sources se support-check, freshness/authorization validate aur representative failures evaluate karo. Product-specific current internal pipeline infer mat karo.","Retrieval can return wrong/outdated sources and model misread kar sakta hai.","Determinism correctness guarantee nahi.","Caching erroneous answer repeat kar sakti hai."] },
    ],
  },
  success: [
    'Main retrieval aur ranking ke do phase numbers se samjha sakta hoon',
    'Main PageRank, damping aur link farm ka khel lab se dikha sakta hoon',
    'Main AI Overviews ko grounding/RAG ki tarah samjha sakta hoon',
  ],
  homework: `<p>Apne product ki kisi ranked list ke liye likho: phase 1 (sasta) kya hai, phase 2 (mehenga) kya hai? Kaunsa ranking
    signal "khareeda" ja sakta hai (fake reviews, fake likes)? Use kis bharosemand cheez se tolo?</p>`,
  cards: [
    { front: 'Retrieval vs ranking?', back: 'Retrieval: shards par sasta (BM25 + WAND pruning) → saikdon candidates. Ranking: unhi par mehenga ML + saikdon signals.' },
    { front: 'PageRank aur damping?', back: 'Random surfer links par click, ~15% baar random jump. Link farm jaal hai (lab: junk #1); damping se #2; TrustRank seeds se #1646.' },
    { front: 'AI Overviews = ?', back: 'Grounding / RAG planet scale par: pehle poora search stack se retrieve, phir citations ke saath summary. Retrieval aur zaroori.' },
  ],
},
]);

})();
