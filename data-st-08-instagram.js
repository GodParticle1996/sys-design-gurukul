/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Instagram

   Source: "How Instagram Scaled Postgres to 2 Billion Users" (Akhil Sharma).
   Is video ka gehra database wala hissa — logical shards, snowflake ids,
   partial/functional indexes, logical replication — SQL Gurukul ke
   🔬 Database Internals track mein hands-on hai (asli Postgres par).
   Yahan us kahani ka system-design wala faisla hai.
   ===================================================================== */
(function () {

VISUALS['st-insta-postgres'] = {
  t: 'Boring technology + sahi architecture',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">2010</span><span class="cmd">3 engineers · EC2 + S3 · EK Postgres</span><span class="q">users, photos ka metadata, comments, likes, follow graph — sab ek jagah</span></div>
      <div class="dg-rung"><span class="lv">2011</span><span class="cmd">1 crore users</span><span class="q">infra abhi bhi simple</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">2012</span><span class="cmd">2.7 crore users · 2 TB Postgres</span><span class="q">sabse bade rentable instance ki memory ke kareeb, disk I/O saturated</span></div>
      <div class="dg-rung g"><span class="lv">faisla</span><span class="cmd">database mat badlo — SHARD karo</span><span class="q">problem Postgres ki nahi thi, us paimane ki thi</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🚧 Deewar 1 — connections</span>
        <div class="dg-cap">Har Postgres connection lagbhag <b>1.3 MB</b>. 50 app servers ×
          30 connections = 1,500 connections ≈ <b>2 GB RAM</b>, aur database ne abhi tak
          koi kaam kiya hi nahi. Ilaaj: pooler (PgBouncer) — 1,500 → ~30 asli connections.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🧩 Deewar 2 — ek machine kaafi nahi</span>
        <div class="dg-cap">Standard salaah: NoSQL par chale jao. Instagram ne dekha ki
          walls Postgres ki nahi, <b>paimane ki</b> thin — Cassandra par jaane se
          horizontal partitioning gayab nahi hota, bas doosri abstraction ke peechhe
          chhup jaata hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="logical">🧮 hazaron LOGICAL shards (schemas)</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="map">🗺️ mapping table</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="phys">🖥️ kuch PHYSICAL nodes</span>
    </div>
    <div class="dg-cap">Data ka batwara hamesha ke liye tay (hazaron logical shards), par
      "kaunsa logical shard kis machine par hai" sirf ek <b>mapping</b> hai — aur mapping
      badalna ek config change hai, data rewrite nahi.</div>`,
};

SD.registerLevels('stories', [
{
  id: 'st-insta-postgres',
  icon: '🐘',
  title: 'Instagram — database mat badlo, architecture badlo',
  badge: 'Boring Tech Baba',
  objectives: [
    'Connection ka chhupa hua bill aur pooler ka kaam',
    '"Switch mat karo, shard karo" — aur uska tark',
    'Logical shards vs physical nodes: mapping hi architecture hai',
    'Complexity budget — naya infra kab lena chahiye',
  ],
  lesson: [
    `<h3>🐘 2010: teen engineers, ek Postgres</h3>
     <p>Instagram launch hua toh architecture sharminda kar dene wali had tak simple tha:
     EC2 par app, photos S3 par, aur baaki sab — user accounts, photo metadata, comments,
     likes, follow graph — <b>ek Postgres</b> mein. Na microservices, na Kafka, na kuch
     fancy.</p>
     <p>2011 mein 1 crore users, phir bhi infra simple. 2012 mein jab Facebook ne kharida,
     woh <b>2.7 crore users</b> par the, ek <b>2 TB</b> Postgres ke saath, aur team abhi
     bhi chhoti thi.</p>
     <p>Phir single-database setup chatakne laga: 2 TB us waqt ke sabse bade rentable
     instance ki memory ke kareeb tha aur disk I/O saturated tha. Vertical scaling ka
     raasta khatam.</p>
     <h3>🚧 Deewar 1 — connections (jise koi nahi dekhta)</h3>
     <p>Pehli deewar data ke size ki nahi thi. Har Postgres connection lagbhag <b>1.3 MB</b>
     leta hai. Django servers lagatar connections banate the — 50 app servers, har ek ke
     paas 30 connections = <b>1,500 connections ≈ 2 GB RAM</b>, aur database ne abhi koi
     kaam kiya hi nahi tha.</p>
     <p>Ilaaj chhota tha: ek <b>connection pooler</b> (PgBouncer) jo app aur Postgres ke
     beech baith kar 1,500 aane wale connections ko <b>~30 asli connections</b> par
     multiplex kar de. Ab woh memory wahi kare jo usse karna chahiye — pages cache karna,
     sort karna, query plan banana.</p>
     <p class="tip">🎯 Video ki salaah: agar tum aaj meaningful load par Postgres chala
     rahe ho aur saamne pooler nahi hai, toh <b>is hafte ka sabse zyada faayde ka kaam
     wahi hai</b>.</p>`,
    `<h3>🧭 Deewar 2 — aur wahan sabse bada faisla</h3>
     <p>Ab standard salaah aati hai: "relational databases horizontally scale nahi karte,
     NoSQL par jao." Instagram ne Cassandra aur MongoDB ko sach mein evaluate kiya, aur
     phir bhi Postgres par ruke. Unka tark:</p>
     <ul>
       <li>Jo deewarein woh dekh rahe the, woh <b>Postgres ki</b> nahi thin — us
       <b>paimane ki</b> thin. Koi bhi database us workload par wahi deewarein deta.</li>
       <li>Cassandra par jaane se <b>horizontal partitioning gayab nahi hota</b> — woh bas
       ek doosri abstraction ke peechhe chala jaata hai.</li>
       <li>Aur switch karne ke baad wapas aana lagbhag namumkin hai — kashti jalane wali
       baat.</li>
     </ul>
     <p>Isliye unhone database badalne ke bajaye <b>Postgres ko horizontal banaya</b>:
     sharding. Par sharding ka <b>tareeka</b> hi woh cheez hai jo pichhle dashak ke sabse
     zyada copy kiye gaye patterns mein se ek ban gaya.</p>
     <h3>🧮 Logical shards ≠ physical machines</h3>
     <p>2010 ke aam sharding mein log seedha machines ke baare mein sochte the: 16 servers,
     har ek ke paas 1/16 users; grow karna ho toh servers jodo aur data reshuffle karo.</p>
     <p>Instagram ne beech mein ek layer daal di:</p>
     <pre>hazaron LOGICAL shards  (Postgres mein har ek ek SCHEMA — tables ka apna namespace)
     ↓  mapping table
kuch PHYSICAL nodes     (shuruaat mein saare logical shards EK hi machine par)</pre>
     <p>Application sirf itna poochhta hai: "is user ka logical shard kaunsa hai?" aur us
     schema par query karta hai. Use pata bhi nahi hota ki woh schema kis machine par hai.</p>
     <p>Ab growth ka matlab badal jaata hai: node 7 95% bhar gaya? Naya node 16 khada
     karo, node 7 ke <b>aadhe logical shards</b> streaming replication se copy karo, aur
     phir <b>mapping table update</b> kar do — "shard 1920-2047 ab node 16 par". Data
     waisa ka waisa, schema waise ke waise, application code waisa ka waisa. Sirf mapping
     badla.</p>
     <p class="tip">🎯 Ek line yaad rakho: <b>data ka batwara aur data ka thikana alag
     cheezein hain.</b> Batwara hamesha ke liye tay karo (hazaron logical shards), thikane
     ko data banao (mapping table) — phir growth ek config change ban jaata hai.</p>
     <p>(Shard key user id tha — ek user ka sab kuch ek shard par. Uski keemat: "jinhe
     main follow karta hoon unki photos" jaisi query 50 shards se data laakar app mein
     merge karti hai. Har sharded system yeh sauda kisi na kisi shakal mein karta hai.
     Aur snowflake-style ids, partial/functional indexes aur logical replication —
     woh sab SQL Gurukul ke 🔬 Database Internals track mein asli Postgres par hain.)</p>`,
    `<h3>🧰 Complexity budget — "boring" ka asli matlab</h3>
     <p>Har team ke paas <b>complexity ka ek budget</b> hota hai. Har naya infrastructure
     us budget se kaat-ta hai: uske nakhre seekhne padte hain, operational expertise
     banani padti hai, team ko train karna padta hai, us cheez ke liye hire karna padta
     hai. Yeh kharche balance sheet par nahi dikhte, par asli hote hain.</p>
     <p>Boring technology — Postgres, Linux, memcached, nginx — lagbhag muft mein aati
     hai: team pehle se jaanti hai, internet par har sawaal ka jawab hai, failure modes
     kitaabon mein likhe hain, aur tooling 15+ saal purani hai.</p>
     <table>
       <tr><th>Naya infra lo jab…</th><th>Naya infra mat lo jab…</th></tr>
       <tr><td>Problem sach mein nayi ho — planet-scale graph traversal, vector search, real-time time-series</td><td>Problem sirf "bahut saare users" ho — yeh nayi problem nahi hai</td></tr>
     </table>
     <p class="tip">🎯 Video ki sabse teekhi line: <b>zyadatar teams galat database nahi
     chunti — woh database bahut jaldi badal deti hain, jabki asli fix apne maujooda
     database ko behtar samajhna tha.</b></p>
     <p>Aakhri baat, imaandaari se: aaj ka Instagram Postgres par nahi chalta. Facebook
     acquisition ke baad Meta ne usse apne internal infra mein jod liya, aur social graph
     ab TAO se serve hota hai. Par jo <b>architecture pattern</b> unhone banaya — logical
     shards + mapping, aur database ke andar snowflake ids — aaj bhi copy hota hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Nayi problem ya bas "bahut saare users"?',
      instructions: 'Har sthiti ko sahi dabbe mein daalo — kya iske liye naya infra chahiye?',
      bins: [
        { id: 'new', label: '🆕 Sach mein nayi problem (naya tool jayaz)' },
        { id: 'scale', label: '📈 Bas paimana bada hai (maujooda tool samjho)' },
      ],
      items: [
        { text: '10 crore documents par semantic similarity search chahiye', bin: 'new', explain: 'Vector search relational engine ka kaam nahi hai — yahan specialised store jayaz hai.' },
        { text: 'Table 2 TB ki ho gayi hai aur queries dheemi hain', bin: 'scale', explain: 'Bada table purani problem hai: index, pooling, partitioning, sharding. Instagram yahin par ruka aur Postgres par hi kaam kiya.' },
        { text: 'Rozana 50 lakh events ka real-time time-series rollup chahiye', bin: 'new', explain: 'Time-series ke liye bane engines yahan sach mein alag kaam karte hain.' },
        { text: '1,500 connections se database ki RAM khatam ho rahi hai', bin: 'scale', explain: 'Connections sambhalna ek pooler ka kaam hai, naye database ka nahi.' },
        { text: 'Poore planet par 6-hop friend-of-friend traversal chahiye', bin: 'new', explain: 'Yahi wajah hai ki Meta ne aage chal kar TAO banaya.' },
        { text: 'Peak par writes ek machine se zyada ho gaye hain', bin: 'scale', explain: 'Sharding ka classic case — aur sharding kisi bhi database mein karni hi padegi, naam chahe jo ho.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Logical shards lab',
      instructions: 'Logical shards ki ginti, physical nodes aur growth ka tareeka badlo.',
      goal: "Naya node jodne par <b>15% ya kam rows copy</b> hon, busiest-node load <b>70% ya kam</b>, aur application routing code na badle. Logical keys stable rahengi; selected shards ka physical data move phir bhi hota hai.",
      scenario: `Tumhare paas ek badhta hua product hai. Aaj 4 database machines hain.
        Agle saal shayad 12 chahiye. Sawaal: data ka batwara kaise tay karoge?`,
      knobs: [
        { id: 'logical', label: 'Logical shards', min: 4, max: 4096, step: 4, value: 4, unit: '',
          note: 'Batwara hamesha ke liye tay hota hai — isliye shuruaat mein hi bada rakho.' },
        { id: 'nodes', label: 'Physical nodes', min: 1, max: 24, step: 1, value: 4, unit: '',
          note: 'Aaj kitni machines par woh logical shards baithe hain.' },
        { id: 'style', label: 'Mapping (0 = formula, jaise hash % nodes · 1 = mapping table)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Formula badla toh sabka thikana badal jaata hai.' },
      ],
      readouts: k => {
        const m = shardMapModel(k);
        return [
          { label: 'Naya node jodne par rows move', value: m.movedPct + '%', tone: m.movedPct <= 15 ? 'ok' : 'bad' },
          { label: 'Sabse bhaari node par load', value: m.hotPct + '%', tone: m.hotPct <= 70 ? 'ok' : 'bad' },
          { label: 'Growth par app code', value: m.codeChange ? 'badalna padega' : 'nahi badlega', tone: m.codeChange ? 'bad' : 'ok' },
          { label: 'Har node par logical shards', value: m.perNode + '', tone: m.perNode >= 4 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = shardMapModel(k);
        return [
          { label: 'Rows moved (node jodne par)', pct: Math.min(100, m.movedPct), text: m.movedPct + '%', tone: m.movedPct <= 15 ? 'ok' : 'bad' },
          { label: 'Hot node load', pct: Math.min(100, m.hotPct), text: m.hotPct + '%', tone: m.hotPct <= 70 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = shardMapModel(k);
        if (k.style === 0) return { ok: false, text: `Formula-based mapping: node jodte hi <b>${m.movedPct}%</b> rows ka thikana badal jaata hai aur sharding logic application code mein hai. Yahi woh raasta hai jo har growth par migration bana deta hai.` };
        if (m.movedPct > 15) return { ok: false, text: `Mapping table hai par sirf <b>${k.logical}</b> logical shards — har node par <b>${m.perNode}</b>. Move karne ke liye itne bade tukde bachte hain ki rebalancing mein <b>${m.movedPct}%</b> data hilta hai. Logical shards bahut zyada banao.` };
        if (m.hotPct > 70) return { ok: false, text: `Load <b>${m.hotPct}%</b> hai — nodes badhao ya shards ka batwara dekho.` };
        return { ok: true, text: `Yahi Instagram ka model hai: <b>${k.logical}</b> logical shards <b>${k.nodes}</b> nodes par, mapping ek table mein — naya node jodne par sirf <b>${m.movedPct}%</b> rows hilti hain aur application code bilkul nahi badalta.` };
      },
      check: k => { const m = shardMapModel(k); return m.movedPct <= 15 && m.hotPct <= 70 && !m.codeChange; },
      lesson: `Sharding ka sabse bada faisla shard key ke baad yeh hai: <b>thikana formula
        hai ya data?</b> Formula sabko hila deta hai; mapping table sirf utna hilata hai
        jitna tum chaho.`,
      quiz: {
        q: 'Instagram ne shuruaat mein hazaron logical shards ek hi machine par kyun rakhe?',
        choices: [
          'Batwara baad mein badalna mehenga hai — aaj hi bahut tukde banao, machines zaroorat par jodo',
          'Har schema ke liye alag physical server zaroori hai, toh shuru mein ek machine par hi rakhna pada',
          'Backup tool ne itne shards banane par majboor kiya, kyunki tool sirf chhote tukde le sakta tha',
          'Postgres ek se zyada machine par chal hi nahi sakta, isliye saare shards ek machine par the',
        ],
        answer: 0,
        explain: 'Logical shard ki pehchaan aur physical jagah alag rakhne se baad mein shards move karna aasan hai. Bahut saare schemas ka metadata aur maintenance ka kharcha bhi hai — logical shards bilkul muft nahi.',
        choiceExplanations: [
          'Logical shard ki pehchaan aur physical jagah alag rakhne se baad mein shards move karna aasan hai. Bahut saare schemas ka metadata aur maintenance ka kharcha bhi hai — logical shards bilkul muft nahi.',
          'Kai schemas ek hi machine par reh sakte hain — wahi toh shuruaat thi.',
          'Shard count batwara ke plan se aaya, backup tool se nahi.',
          'Postgres kai machines par chalta hai — baad mein shards wahi gaye.',
        ],
      },
    },
    {
      type: 'design',
      title: 'Scale-up plan banao',
      instructions: 'Har slot mein ek option. Review par har option ka tark milega.',
      brief: `Tumhari Postgres 1.8 TB ki ho gayi hai, peak par CPU 80%, aur team 6 logon
        ki hai. Product team aur features maang rahi hai. Agla kadam kya hoga?`,
      requirements: [
        'Team chhoti hai — operational bhaar sochna zaroori hai',
        'Growth agle 2 saal mein 5× hoga',
        'Downtime minimum',
        'Wapas laut-ne ka raasta khula rahe',
      ],
      pass: 9,
      slots: [
        {
          id: 'first', label: 'Sabse pehla kadam', icon: '🚦',
          options: [
            { id: 'pool', label: "Queries aur pooling naapo, sasta headroom lo", score: 4, why: 'Sabse sasta aur sabse zyada asar. Instagram ki pehli deewar connections thi — 1,500 connections ≈ 2 GB RAM, bina koi kaam kiye.' },
            { id: 'shard', label: "Rukawat dekhe bina pehle hi shard kar do", score: -1, why: 'Sharding ka operational bhaar bada hai. Video ka takeaway: "zaroorat padne tak shard mat karo" — Instagram ne 2.7 crore users tak intezaar kiya.' },
            { id: 'nosql', label: "Rukawat dekhe bina engine hi badal do", score: -3, why: 'Walls paimane ki hain, database ki nahi; aur switch ke baad wapas aana lagbhag namumkin hai.' },
          ],
        },
        {
          id: 'shape', label: 'Jab sharding karni pade', icon: '🧮',
          options: [
            { id: 'logical', label: "Logical shards + jagah ki mapping table", score: 4, why: 'Batwara hamesha ke liye tay, thikana badalne layak. Growth data rewrite nahi, config change ban jaata hai.' },
            { id: 'modulo', label: "Machine count se modulo karke baanto", score: -3, why: 'N badla toh lagbhag sab rows ka thikana badal jaata hai — har growth ek poora data migration ban jaata hai.' },
            { id: 'range', label: "Har machine ko user-ID ki fixed range", score: 0, why: 'Simple hai par naye users hamesha aakhri node par girte hain — naya hot spot banta rehta hai.' },
          ],
        },
        {
          id: 'ids', label: 'Primary keys', icon: '🔑',
          options: [
            { id: 'snowflake', label: "Time-sortable IDs, shard ka hissa saath", score: 3, why: 'Sharded duniya mein auto-increment collide karta hai, aur baad mein billions rows ka id format badalna bahut mehenga hai. Video: ID format pehle din se tay karo.' },
            { id: 'auto', label: "Har shard ka apna local counter, bas", score: -2, why: 'Har shard 1, 2, 3 dega — do alag rows ki ek hi id. Aur migration billions rows par hoti hai.' },
            { id: 'uuid', label: "Random IDs + order ke liye alag field", score: 0, why: 'Collide nahi karta, par bada hai, random hai (index churn) aur UUID se waqt ka pata nahi chalta — isliye "latest" queries ke liye alag index chahiye.' },
          ],
        },
      ],
      verdicts: {
        great: '🎉 Yahi Instagram ka raasta hai: pehle pooler aur queries, phir logical shards + mapping, aur ids pehle din se sortable.',
        ok: '👍 Chal jaayega, par ek jagah aage jaake mehengi migration aayegi.',
        bad: '⚠️ Is plan mein ya bahut jaldi naya infra aa gaya hai, ya growth har baar data migration bunega.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — scaling a relational database',
    instructions: 'Teen sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Postgres 2 TB ki ho gayi hai. NoSQL par jaayein?"',
        choices: [
          'Pehle naapo deewar kya hai — connections, indexes ya machine; sharding har DB mein',
          'Haan — 2 TB ke baad relational model kaam ka nahi rehta, NoSQL hi aage ka raasta hai',
          'Haan — NoSQL par jaate hi sharding apne aap ho jaati hai, kuch karna hi nahi padta',
          'Nahi — Postgres har workload ke liye hamesha sabse behtar hai, kabhi mat badlo',
        ],
        answer: 0,
        explain: 'Instagram ne parakh ke bhi Postgres chuna, kyunki deewarein scale ki thi, database ki nahi. Switch karne se partitioning gayab nahi hoti, sirf abstraction badalti hai.',
        choiceExplanations: [
          'Instagram ne parakh ke bhi Postgres chuna, kyunki deewarein scale ki thi, database ki nahi. Switch karne se partitioning gayab nahi hoti, sirf abstraction badalti hai.',
          '2 TB relational DB ke liye koi chhat nahi. Asli deewar naapo.',
          'NoSQL mein bhi partition key aur rebalancing ka kaam rehta hai.',
          '"Hamesha" galat hai — kuch workloads ke liye doosra engine sahi ho sakta hai.',
        ],
      },
      {
        q: 'Interviewer: "Sharding ke baad growth kaise sambhaloge?"',
        choices: [
          'Bahut saare logical shards; mapping table se thikana badlo — naya node = copy + mapping',
          'Code mein shard count ki constant badlo — har jagah naya modulo, aur kaam ho gaya',
          'Har growth par saari keys rehash karo — har baar naya batwara, data bhi barabar',
          'Har saal ek bade host par chale jaao — bada host hi scaling ka sabse seedha jawab',
        ],
        answer: 0,
        explain: 'Instagram ka pattern: partitioning aur placement alag rakho. Growth data rewrite nahi, config change ban jaati hai.',
        choiceExplanations: [
          'Instagram ka pattern: partitioning aur placement alag rakho. Growth data rewrite nahi, config change ban jaati hai.',
          'Modulo badla toh lagbhag har row ka thikana badal jaata hai.',
          'Har baar rehash matlab har baar poora data migration.',
          'Bade host ki bhi chhat hai, aur har shift ek bada kaam.',
        ],
      },
      {
        q: 'Interviewer: "Naya specialised database kab lena chahiye?"',
        choices: [
          'Jab access pattern sach mein naya ho (vector search, graph) aur naapa hua gap dikhe',
          'Jab data 1 TB paar kar jaaye — bytes ki ginti hi naye database ka signal hai',
          'Jab team kuch naya seekhna chahe — nayi technology se team ki raftaar badhti hai',
          'Jab ek query dheemi lage — dheemi query ka matlab engine hi badalne ka waqt hai',
        ],
        answer: 0,
        explain: 'Complexity budget: har naya tool seekhne, chalane, sikhane aur hire karne ka kharcha maangta hai. Sirf "bahut saare users" naya problem nahi hai.',
        choiceExplanations: [
          'Complexity budget: har naya tool seekhne, chalane, sikhane aur hire karne ka kharcha maangta hai. Sirf "bahut saare users" naya problem nahi hai.',
          'Size akela naya access pattern nahi. Bade data ke liye sharding hai.',
          'Seekhne ki ichha production ki zaroorat nahi.',
          'Ek dheemi query ke liye index ya query theek karo, engine nahi.',
        ],
      },
    ],
  },
  success: [
    'Main scaling ki deewar pehchaan kar sahi ilaaj chun sakta hoon',
    'Main logical aur physical sharding ko alag rakh sakta hoon',
    'Main complexity budget ke hisaab se naya infra lene ka faisla kar sakta hoon',
  ],
  homework: `<p>Apne database par teen numbers nikaalo: (1) kitne connections khule rehte
    hain aur woh kitni RAM le rahe hain, (2) sabse badi table ka size, (3) peak par CPU.
    Ab likho — agla kadam pooler hai, index hai, partitioning hai ya sharding? Aur jo bhi
    chuno, uske saamne likho ki uske baad kaunsi deewar aayegi.</p>
    <p>Hands-on chahiye? SQL Gurukul ke 🔬 <b>Database Internals</b> track mein yahi
    cheezein asli Postgres par hain — connection storm, logical shards ko ek machine se
    doosri par le jaana, aur snowflake-style ids.</p>`,
  cards: [
    { front: 'Instagram ki pehli scaling deewar?', back: 'Connections — har Postgres connection ~1.3 MB; 50 servers × 30 connections = 1,500 ≈ 2 GB RAM bina kisi kaam ke. Ilaaj: PgBouncer se 1,500 → ~30 asli connections.' },
    { front: '"Shard karo, switch mat karo" ka tark?', back: 'Deewarein Postgres ki nahi, paimane ki thin; Cassandra par jaane se horizontal partitioning gayab nahi hoti, bas chhup jaati hai; aur switch ke baad wapas aana lagbhag namumkin hai.' },
    { front: 'Logical vs physical shards?', back: 'Hazaron logical shards (Postgres schemas) hamesha ke liye tay; mapping table batati hai kaunsa logical shard kis machine par hai. Growth = replication + mapping update, data rewrite nahi.' },
    { front: 'Complexity budget?', back: 'Har naya infra seekhne, chalane, train karne aur hire karne ka kharcha maangta hai. Naya tool tabhi lo jab problem sach mein nayi ho — "bahut saare users" nayi problem nahi hai.' },
  ],
},
]);

function shardMapModel(k) {
  const perNode = Math.max(1, Math.floor(k.logical / k.nodes));
  const hotPct = Math.min(100, Math.round(100 / k.nodes + 18));
  if (k.style === 0) return { movedPct: Math.round(100 - 100 / (k.nodes + 1)), hotPct, codeChange: true, perNode };
  /* Balanced, equal-size logical shards: the new node needs roughly 1/(N+1)
     of existing data. More shards improve granularity; they do not make the
     physical copy disappear. This excludes replicas and unequal shard sizes. */
  const movedShards = Math.ceil(k.logical / (k.nodes + 1));
  const movedPct = Math.min(100, Math.round(1000 * movedShards / k.logical) / 10);
  return { movedPct, hotPct, codeChange: false, perNode };
}

})();
