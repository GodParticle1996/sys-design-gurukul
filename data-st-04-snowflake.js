/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Snowflake

   Source: "How SNOWFLAKE Runs 5 BILLION Queries a Day With No Indexes"
   (Akhil Sharma) + Snowflake ka SIGMOD 2016 architecture paper aur
   NSDI 2020 paper (7 crore production queries ka data).

   2 levels (storage-engine wale hisse SQL Gurukul ke 🔬 Database
   Internals track mein hain — micro-partitions, pruning, immutability):
     st-snow-split      — shared-nothing ka dard aur storage/compute alag karna
     st-snow-warehouse  — virtual warehouses + network ko chhupane ke 4 tareeke
   ===================================================================== */
(function () {

VISUALS['st-snow-split'] = {
  t: 'Shared-nothing vs storage-compute alag',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔗 Shared-nothing (2000s ka standard)</span>
        <div class="dg-grid">
          <div class="dg-node" data-hs="node1"><span class="ni">🖥️</span><span class="nl">node 1</span><span class="ns">CPU + RAM + apni disk</span></div>
          <div class="dg-node" data-hs="node2"><span class="ni">🖥️</span><span class="nl">node 2</span><span class="ns">CPU + RAM + apni disk</span></div>
        </div>
        <div class="dg-cap">Data machine se <b>chipka</b> hua hai. Node jodo toh terabytes
          reshuffle karo (dinon ka kaam), aur ETL, dashboards, ad-hoc queries sab ek hi
          cluster par ladte hain.</div></div>
      <div class="dg-box is-good"><span class="bx-label">☁️ Snowflake — alag-alag</span>
        <div class="dg-node is-good" data-hs="s3"><span class="ni">🪣</span><span class="nl">object storage</span><span class="ns">har table yahin, ek hi copy</span></div>
        <div class="dg-node is-accent" data-hs="wh"><span class="ni">⚙️</span><span class="nl">virtual warehouse</span><span class="ns">stateless compute, seconds mein on/off</span></div>
        <div class="dg-cap">Compute ke paas koi data nahi hai. Isi liye woh aa-ja sakta
          hai, bada-chhota ho sakta hai, aur per-second bill ho sakta hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">2012 se pehle</span><span class="cmd">network dheema, disk local</span><span class="q">"data ke paas compute le jao" — bilkul sahi niyam tha</span></div>
      <div class="dg-rung"><span class="lv">2012</span><span class="cmd">S3 pakka hua · network tez hua · compute kiraye par</span><span class="q">purane niyam ki shart hi khatam ho gayi</span></div>
      <div class="dg-rung g"><span class="lv">faisla</span><span class="cmd">data door rakho, compute stateless</span><span class="q">storage aur compute apne-apne hisaab se badhte hain</span></div>
    </div>`,
};

VISUALS['st-snow-warehouse'] = {
  t: 'Door rakhe data ko paas jaisa banane ke 4 tareeke',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">KAM padho — pruning</span><span class="q">har file ke min/max metadata se 50,000 files → 200 files, bina kuch padhe</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">PATLA padho — columnar</span><span class="q">300 columns mein se sirf 3 — bache hue 200 files mein se bhi</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">PAAS se padho — local SSD cache</span><span class="q">consistent hashing se har file ka ek maalik node · miss par hi object storage</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">KUCH MAT padho — result cache</span><span class="q">wahi query, data nahi badla → jawab seedha cache se, warehouse jaga hi nahi</span></div>
    </div>
    <div class="dg-cap">Chaaron ek saath lagte hain. Isi liye "door ka data" practically
      local jaisa mehsoos hota hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🔄 Resize par cache ka kya</span>
        <div class="dg-cap">4 node se 8 node karte waqt terabytes shuffle karna sabse
          galat waqt hai (warehouse pehle se busy hai). Isliye <b>ownership turant</b>
          badalti hai aur <b>data baad mein</b>, jab queries naturally padhti hain.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🏃 Work stealing</span>
        <div class="dg-cap">Koi node slow (noisy neighbour, dheemi SSD)? Jo node pehle
          khatam kare, woh uski baaki files utha leta hai — query khud ko balance kar leti hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🧪 ETL warehouse</span>
      <span class="dg-pill">📊 BI warehouse</span>
      <span class="dg-pill">🔬 data science warehouse</span>
      <span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="same">🪣 wahi ek data</span>
    </div>
    <div class="dg-cap">Ek hi data, alag-alag compute. Isi liye bhaari ETL dashboards ko
      dheema nahi karta — woh dono ek hi CPU par hain hi nahi.</div>`,
};

/* =====================================================================
   LEVEL 1 — STORAGE aur COMPUTE ALAG
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-snow-split',
  icon: '☁️',
  title: 'Snowflake — data ko door bhej diya',
  badge: 'Disaggregation Dost',
  objectives: [
    'Shared-nothing ke teen permanent dard: rebalancing, contention, over-provisioning',
    '2012 mein kya badla jisse purana niyam expire ho gaya',
    'Compute stateless kar dena — elasticity uska natija hai',
    'Architecture economics ke peechhe chalti hai, fashion ke peechhe nahi',
  ],
  lesson: [
    `<h3>🏛️ Bees saal ka standard: shared-nothing</h3>
     <p>Snowflake se pehle lagbhag har data warehouse ek hi tarah bana tha. 20 machines
     ka cluster, data un sab mein bata hua, har machine apni <b>local disk</b> par apna
     hissa rakhe aur apne CPU se usse padhe. Query aayi toh kaam 20 hisson mein bat gaya,
     sab apna-apna scan karte hain, aur aakhir mein result jud jaata hai. Teradata,
     Vertica, Netezza, pehla Redshift, Hadoop — sab isi soch par bane the.</p>
     <p>Yeh soch us waqt bilkul sahi thi: <b>network dheema tha aur disk local thi</b>.
     Isliye industry ka niyam tha — <b>"data ko compute ke paas mat le jao, compute ko
     data ke paas le jao."</b></p>
     <h3>💔 Par is niyam ke saath teen dard hamesha ke liye aa jaate hain</h3>
     <table>
       <tr><th>Dard</th><th>Kyun</th></tr>
       <tr><td><b>Rebalancing</b></td><td>20 machines mein 5 aur jodo — ab data barabar nahi hai. Terabytes redistribute karna padta hai, jisme din lag sakte hain, aur us dauraan performance kharab rehti hai.</td></tr>
       <tr><td><b>Contention</b></td><td>ETL pipelines, BI dashboards, scheduled reports aur ad-hoc SQL — sab ek hi compute pool par ladte hain. Ek bhaari job sabko dheema kar deta hai.</td></tr>
       <tr><td><b>Over-provisioning</b></td><td>Cluster quarter-end ke peak ke hisaab se size hota hai. Baaki saal woh mehenga compute khaali baitha rehta hai — aur chhota karna matlab phir se data shuffle, isliye koi karta hi nahi.</td></tr>
     </table>
     <p class="tip">🎯 Teenon ka ek hi root cause hai: <b>storage aur compute ek doosre
     se welded hain</b>. Data machine se chipka hai, isliye machine badalna matlab data
     hilana.</p>`,
    `<h3>📅 2012 — teen cheezein badlin</h3>
     <p>Toh yeh sabko dikhta tha; alag kyun nahi kiya gaya? Kyunki pehle yeh
     <b>practical hi nahi</b> tha. 2012 ke aas-paas teen cheezein badlin:</p>
     <pre>1. Cloud object storage pakka ho gaya — S3: 11 nines durability,
   lagbhag unlimited capacity, aur itna sasta ki uske upar database banaya ja sake
2. Data center networks itne tez ho gaye ki network se padhna
   local disk se padhne ke kareeb aa gaya
3. Compute elastic ho gaya — servers kharido mat, minuton ke liye kiraye par lo
   aur phenk do</pre>
     <p>Zyadatar logon ko yeh "behtar infrastructure" lagi. Snowflake ke teen founders —
     Benoit Dageville aur Thierry Cruanes (dono Oracle mein ek dashak se zyada) aur
     Marcin Zukowski (Amsterdam mein sabse tez analytical query engines mein se ek bana
     chuke the) — ne isme kuch aur dekha. Unhe pata tha ki purana architecture <b>kyun</b>
     bana tha, aur ab woh kaaran zinda nahi the.</p>
     <p>Unka faisla seedha tha: <b>har byte object storage mein rakho, ek hi copy, aur
     compute ko poori tarah stateless bana do</b>. Jis cluster ke paas data hai hi nahi,
     woh seconds mein khada ho sakta hai, query chala sakta hai, aur gayab ho sakta hai.</p>
     <h3>🧱 Teen layers</h3>
     <pre>Storage  — S3 / Azure Blob / GCS. Har table yahin, aur sirf yahin.
Compute  — virtual warehouses: stateless machines, per-second kiraya.
Brain    — cloud services layer: metadata, query planning, transactions, security.</pre>
     <p>Aur turant sabne ek hi aitraz kiya: <b>"S3 slow hai, uske upar database kaise
     chalega?"</b> Uska jawab agle level mein hai — chaar tareeke, ek saath.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa dard kis architecture ka hai?',
      instructions: 'Har dard ko us architecture mein daalo jisme woh hota hai.',
      bins: [
        { id: 'shared', label: '🔗 Shared-nothing (storage + compute welded)' },
        { id: 'split', label: '☁️ Storage aur compute alag' },
      ],
      items: [
        { text: 'Naye node jodne par terabytes reshuffle karna padta hai', bin: 'shared', explain: 'Data machine se chipka hai, isliye machine jodna matlab data hilana.' },
        { text: 'ETL job dashboards ko dheema kar deta hai', bin: 'shared', explain: 'Sab ek hi compute pool par hain. Alag karne par har workload ka apna warehouse hota hai.' },
        { text: 'Har query ek network hop ki keemat deti hai', bin: 'split', explain: 'Data door hai. Isi liye pruning, columnar reads, local SSD cache aur result cache zaroori ho jaate hain.' },
        { text: 'Cluster quarter-end ke peak par size hota hai aur baaki saal khaali rehta hai', bin: 'shared', explain: 'Shrink karna matlab phir se shuffle, isliye koi shrink hi nahi karta.' },
        { text: 'Compute ko beech mein maar do toh sirf query jaati hai, data nahi', bin: 'split', explain: 'Warehouse ke paas data hai hi nahi — warehouse sirf ek kiraye ka engine hai.' },
        { text: 'Storage aur compute ko alag-alag badhaya ja sakta hai', bin: 'split', explain: 'Yahi disaggregation ka seedha faayda hai — ek doosre ka intezaar nahi karte.' },
      ],
    },
    {
      workload: {"peak":6,"hours":2},
      type: 'tradeoff',
      title: 'Cluster planning lab — welded vs alag',
      instructions: 'Workloads aur peak badlo. Dono models ka kharcha aur dard dekho.',
      goal: "Kam se kam <b>6x peak</b>, roz <b>2 hours</b> handle karo: workload contention nahi, monthly cost <b>200 units ya kam</b>, dashboard p99 <b>1,500 ms ya kam</b>.",
      scenario: `Teen workloads hain: raat ka ETL, din ke BI dashboards, aur kabhi-kabhi
        bhaari data science queries. Peak (quarter-end) baaki dinon se kai guna bada hai.`,
      knobs: [
        { id: 'peak', label: 'Peak kitna bada hai normal se', min: 1, max: 10, step: 1, value: 6, unit: '×',
          note: 'Quarter-end par demand kai guna ho jaati hai.' },
        { id: 'model', label: 'Model (0 = ek bada cluster · 1 = alag warehouses, elastic)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Ek cluster = sab workloads saath; elastic = har workload ka apna compute.' },
        { id: 'hours', label: 'Peak roz kitne ghante rehta hai', min: 1, max: 24, step: 1, value: 2, unit: ' h',
          note: 'Peak chhota ho toh hamesha uske liye provision karna sabse mehenga hai.' },
      ],
      readouts: k => {
        const m = snowCostModel(k);
        return [
          { label: 'Mahine ka kharcha', value: m.cost + ' units', tone: m.cost <= 200 ? 'ok' : 'bad' },
          { label: 'Workload ek doosre ko dheema karte hain?', value: m.contention ? 'haan' : 'nahi', tone: m.contention ? 'bad' : 'ok' },
          { label: 'Peak par dashboards ka p99', value: m.p99 + ' ms', tone: m.p99 <= 1500 ? 'ok' : 'bad' },
          { label: 'Khaali baitha compute', value: m.idlePct + '%', tone: m.idlePct <= 30 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = snowCostModel(k);
        return [
          { label: 'Kharcha', pct: Math.min(100, (m.cost / 500) * 100), text: m.cost + '', tone: m.cost <= 200 ? 'ok' : 'bad' },
          { label: 'Dashboards p99', pct: Math.min(100, (m.p99 / 6000) * 100), text: m.p99 + ' ms', tone: m.p99 <= 1500 ? 'ok' : 'bad' },
          { label: 'Idle compute', pct: m.idlePct, text: m.idlePct + '%', tone: m.idlePct <= 30 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = snowCostModel(k);
        if (k.model === 0) return { ok: false, text: `Ek hi cluster: teenon workloads ladte hain (dashboards p99 <b>${m.p99} ms</b>), aur cluster peak ke hisaab se size hai isliye <b>${m.idlePct}%</b> compute khaali baitha rehta hai. Kharcha <b>${m.cost}</b> units.` };
        if (m.cost > 200) return { ok: false, text: `Alag warehouses se contention khatam ho gaya, par peak <b>${k.peak}×</b> aur roz <b>${k.hours}h</b> chalne se kharcha <b>${m.cost}</b> units hai. Peak chhota ho toh elastic model ka faayda zyada dikhta hai.` };
        return { ok: true, text: `Sahi: har workload ka apna warehouse (koi contention nahi), aur compute sirf zaroorat ke waqt — kharcha <b>${m.cost}</b> units, idle <b>${m.idlePct}%</b>.` };
      },
      check: k => { const m = snowCostModel(k); return !m.contention && m.cost <= 200 && m.p99 <= 1500; },
      lesson: `Elastic compute ka faayda tab sabse bada hai jab <b>peak bada ho aur chhota
        ho</b> (kam ghante). Agar tumhara load 24 ghante flat hai, toh reserved capacity
        sasti bhi pad sakti hai — architecture economics ke peechhe chalti hai.`,
      quiz: {
        q: 'Snowflake per-second billing kyun de pata hai?',
        choices: [
          'Compute storage se alag hai — warehouse kabhi bhi chalu-band karo, data kahin nahi jaata',
          'S3 khud per-second charge karta hai, isliye Snowflake ko wahi billing aage deni padti hai',
          'Snowflake ki queries hamesha chhoti hoti hain, isliye ghante ki billing ka matlab hi nahi',
          'Snowflake ka invoice system itna advanced hai ki compute ka kharcha hi bill se hat jaata hai',
        ],
        answer: 0,
        explain: 'Compute ka jeevan storage se alag hai, isliye har warehouse alag se gina ja sakta hai. Standard warehouse per-second bill hota hai, par har start/resume par kam se kam 60 second. Pricing policy architecture se apne aap nahi nikalti — architecture sirf mauka deti hai.',
        choiceExplanations: [
          'Compute ka jeevan storage se alag hai, isliye har warehouse alag se gina ja sakta hai. Standard warehouse per-second bill hota hai, par har start/resume par kam se kam 60 second. Pricing policy architecture se apne aap nahi nikalti — architecture sirf mauka deti hai.',
          'Storage ka bill aur warehouse ke credits do alag cheezein hain.',
          'Query ki lambai billing ki unit tay nahi karti.',
          'Billing system kitna bhi accha ho, compute chalane ka kharcha rehta hai.',
        ],
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — ek pool vs alag pools',
      project: '04-snowflake',
      exercise: 'ex1-split-compute',
      goal: 'Ek hi compute pool par teen workloads chalao, phir alag pools par — queue time aur p99 compare karo.',
      why: `Lab mein ek chhota "query engine" hai jo files padhta hai. <code>MODE=one</code>
        mein saare workloads ek hi worker pool par jaate hain; <code>MODE=split</code>
        mein har workload ka apna pool hota hai.`,
      steps: [
        { text: 'Single pool mode chalao (storage alag, engine alag).', cmd: 'cd docker-labs/04-snowflake && npm start ex1-split-compute', expect: 'ex1-split-compute\n  storage → http://localhost:4400  (50,00,000 rows — compute se alag)\n  engine  → http://localhost:4401  (MODE=one · pool 4 workers)' },
        { text: 'Teenon workloads ek saath chalao.', cmd: 'node tools/workloads.js --for 4', expect: 'MODE=one   bi p99: 3122 ms   bi p50: 732 ms   ds p99: 5135 ms   etl queries: 69   (bi 414 queries)' },
        { text: 'Ab har workload ka apna pool.', cmd: 'MODE=split npm start ex1-split-compute && node tools/workloads.js --for 4', expect: 'MODE=split bi p99: 1008 ms   bi p50: 252 ms   ds p99: 293 ms   etl queries: 79   (bi 474 queries)' },
        { text: 'Chalti hui query ke beech warehouse maar do.', cmd: 'node tools/kill-warehouse.js', expect: 'warehouse killed mid-query → chalti query: LOST   engine up: nahi\nstorage mein rows: 50,00,000 (waisi ki waisi)  ✅ data compute mein tha hi nahi' },
      ],
      observe: {
        q: 'Warehouse maarne par sirf chalti hui query gayi, data nahi. Aisa kyun mumkin hai?',
        choices: [
          'Pakka data warehouse ke bahar object storage mein hai — warehouse sirf padhta hai',
          'Warehouse ki RAM mein data ki akeli pakki copy thi, aur RAM ne data bachaye rakha',
          'Har baar warehouse maarne par lab ne backup se poora data chupke se wapas laaya',
          'Ruki hui query apne aap dobara chal gayi, aur dobara chalne ne data bacha liya',
        ],
        answer: 0,
        explain: 'Pakka data compute node ke local cache se alag rehta hai, isliye node gaya toh data nahi gaya. Chalti query ka kya hoga (retry ya fail), alag baat hai.',
        choiceExplanations: [
          'Pakka data compute node ke local cache se alag rehta hai, isliye node gaya toh data nahi gaya. Chalti query ka kya hoga (retry ya fail), alag baat hai.',
          'RAM mein akeli copy hoti toh warehouse marte hi data bhi chala jaata.',
          'Shared storage aur har kill par restore alag designs hain. Lab mein restore nahi hua.',
          'Query ka dobara chalna pakke storage ki jagah nahi le sakta.',
        ],
      },
      lesson: 'Elasticity koi feature nahi hai — woh <b>statelessness ka natija</b> hai.',
    },
  ],
  interview: {
    title: 'Interview Round — warehouse architecture',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Storage aur compute alag karne ka sabse bada faayda?"',
        choices: [
          'Dono alag-alag badh sakte hain, aur compute disposable — rebalancing aur contention ka dard gaya',
          'Network ki latency poori tarah khatam ho jaati hai, kyunki data ab ek central jagah par hai',
          'Har query ka jawab turant aata hai, kyunki compute ko ab data ka intezaar nahi karna padta',
          'Storage ka kharcha zero ho jaata hai, kyunki object storage ka bill compute mein jud jaata hai',
        ],
        answer: 0,
        explain: 'Rebalancing, contention aur zaroorat se zyada machines — teenon dard ek hi jad se aate the: data machine se chipka tha.',
        choiceExplanations: [
          'Rebalancing, contention aur zaroorat se zyada machines — teenon dard ek hi jad se aate the: data machine se chipka tha.',
          'Door ka storage network latency aur cache miss ka kharcha laata hai.',
          'Query ka kaam, queue aur thanda cache phir bhi waqt lete hain.',
          'Storage ko replicate aur manage karne ka kharcha rehta hai.',
        ],
      },
      {
        q: 'Interviewer: "Toh har system ko aise hi banana chahiye?"',
        choices: [
          'Nahi — faisla us daur ki economics par tika tha; apne workload ka kharcha aur latency khud naapo',
          'Haan — cloud par ho toh yahi layout chuno, cloud mein storage alag rakhna hi sahi tareeka hai',
          'Haan — data ko compute ke paas rakhne ka koi kharcha nahi, toh har baar door rakhna hi behtar',
          'Nahi — shared-nothing jaisa purana layout ab bekaar hai, use kabhi mat chuno',
        ],
        answer: 0,
        explain: 'Video ka pehla takeaway: architecture economics ke peechhe chalti hai — sasta object storage, tez network, elastic compute. Shared-nothing 2005 mein sahi tha, 2012 ke baad shartein badli. Har inherited rule kisi aur ki shart ke liye bana tha.',
        choiceExplanations: [
          'Video ka pehla takeaway: architecture economics ke peechhe chalti hai — sasta object storage, tez network, elastic compute. Shared-nothing 2005 mein sahi tha, 2012 ke baad shartein badli. Har inherited rule kisi aur ki shart ke liye bana tha.',
          '"Cloud" ka label access pattern aur kharcha tay nahi karta.',
          'Data door rakhne mein network aur cache ka kharcha hai — locality ka kharcha bhulaya nahi ja sakta.',
          'Purana layout kisi naye workload mein bhi sahi ho sakta hai.',
        ],
      },
    ],
  },
  success: [
    'Main shared-nothing ke teen dard aur unka root cause bata sakta hoon',
    'Main stateless compute se milne wali elasticity samjha sakta hoon',
    'Main kisi bhi "best practice" ko uski original constraints se jod kar dekh sakta hoon',
  ],
  homework: `<p>Apne system ka koi ek "aisa hi hota hai" wala niyam chuno (jaise
    "database ke paas hi cache rakho", "worker aur storage ek hi machine par"). Ab likho:
    <b>woh niyam kis constraint ke liye bana tha?</b> Aur kya woh constraint aaj bhi
    sach hai?</p>`,
  cards: [
    { front: 'Shared-nothing ke teen dard?', back: '(1) node jodne par terabytes rebalancing, (2) sab workloads ek hi cluster par contention, (3) peak ke hisaab se over-provisioning (shrink karna bhi mehenga).' },
    { front: '2012 mein kya badla?', back: 'S3 pakka + sasta, datacenter network itna tez ki remote read ≈ local read, aur compute minuton ke liye kiraye par. Purane niyam ki shart hi khatam ho gayi.' },
    { front: 'Snowflake ki teen layers?', back: 'Storage (S3/Blob/GCS — har table yahin), virtual warehouses (stateless compute, per-second), cloud services layer (metadata, planning, transactions, security).' },
    { front: 'Standard warehouse billing aur stateless compute ka sambandh?', back: 'Durable source shared storage mein hai; compute par query/cache state ho sakti hai. Isliye woh seconds mein start/stop ho sakta hai. Elasticity statelessness ka natija hai.' },
  ],
},
]);

function snowCostModel(k) {
  if (k.model === 0) {
    const cost = Math.round(60 * k.peak);                  /* peak ke hisaab se poora cluster, 24x7 */
    const idlePct = Math.round(100 - (100 * k.hours) / 24);
    return { cost, contention: true, p99: 600 + k.peak * 700, idlePct };
  }
  const base = 45;                                          /* teen chhote warehouses, normal load */
  const burst = Math.round((k.peak - 1) * k.hours * 3.2);   /* peak sirf utne ghante */
  return { cost: base + burst, contention: false, p99: 340, idlePct: 8 };
}

/* =====================================================================
   LEVEL 2 — VIRTUAL WAREHOUSES aur DOOR KE DATA KO PAAS BANANA
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-snow-warehouse',
  icon: '⚙️',
  title: 'Snowflake — door ka data, paas jaisi speed',
  badge: 'Warehouse Wala',
  objectives: [
    'Virtual warehouse: t-shirt size, auto-suspend, auto-resume, per-second',
    'Network chhupane ke chaar tareeke — kam, patla, paas, aur bilkul nahi',
    'Lazy consistent hashing — resize par ownership pehle, data baad mein',
    'Work stealing — slow node se query ko nahi rukne dena',
  ],
  lesson: [
    `<h3>⚙️ Virtual warehouse kya hai</h3>
     <p>Virtual warehouse stateless machines ka ek cluster hai jo tumhari queries chalata
     hai. T-shirt sizes (XS se 6XL), seconds mein khada hota hai, idle hone par
     <b>auto-suspend</b>, query aate hi <b>auto-resume</b>, aur bill <b>per second</b>.</p>
     <p>Yeh sab isliye mumkin hai kyunki warehouse ke paas kuch rakha hi nahi hai. Tum
     chalti hui query ke beech warehouse maar do — query jaayegi, <b>data ka ek byte bhi
     nahi</b>, kyunki data kabhi wahan tha hi nahi.</p>
     <p>Isse data warehousing ka sabse purana dard mit gaya: ETL ek warehouse par, BI
     dashboards doosre par, data science teesre par — <b>ek hi data</b>, par alag CPUs.
     Monday morning ko sau analysts ek saath query chalayein toh warehouse apne aap aur
     clusters jod leta hai aur baad mein simat jaata hai.</p>`,
    `<h3>🪄 "Par S3 toh slow hai" — chaar jawab, ek saath</h3>
     <table>
       <tr><th>#</th><th>Tareeka</th><th>Kya karta hai</th></tr>
       <tr><td>1</td><td><b>Kam padho</b></td><td>Har file (micro-partition) ke har column ka min/max metadata. Query se pehle hi 50,000 files mein se sirf ~200 bachte hain — <b>storage ko chhue bina</b>.</td></tr>
       <tr><td>2</td><td><b>Patla padho</b></td><td>File ke andar data columnar hai. Query 300 mein se 3 columns maangti hai toh bache hue 200 files se bhi sirf woh 3 columns padhe jaate hain.</td></tr>
       <tr><td>3</td><td><b>Paas se padho</b></td><td>Har warehouse node ki local SSD cache. Files consistent hashing se baanti jaati hain — har file ka ek maalik node, duplicate nahi. Warm hone ke baad zyadatar reads local, S3 sirf misses ke liye.</td></tr>
       <tr><td>4</td><td><b>Kuch mat padho</b></td><td>Result cache. Wahi query, data nahi badla → jawab seedha cache se, warehouse ko jagaana bhi nahi padta.</td></tr>
     </table>
     <p class="tip">🎯 Ek bhi tareeka akela kaafi nahi hota. Chaaron ek saath lagte hain,
     tabhi "door ka data" local jaisa lagta hai. (Yeh SQL Gurukul ke 🔬 Database Internals
     track mein hands-on chalta hai — pruning aur columnar reads asli Postgres par.)</p>`,
    `<h3>🔄 Resize par cache ka kya hota hai</h3>
     <p>Warehouse 4 node se 8 node ho gaya. Seedha jawab hoga: cache rebalance karo, har
     node ko uske hisse ki files do. Par socho — resize <b>tab</b> hota hai jab warehouse
     pehle se busy hai. Yani terabytes network par ghumane ka <b>sabse galat waqt</b>.</p>
     <p>Isliye Snowflake rebalance karta hi nahi. Resize par sirf <b>ownership turant</b>
     badalti hai; cached data <b>baad mein</b>, apne aap khiskta hai — jaise-jaise queries
     naye assignment ke hisaab se files padhti aur cache karti hain. Unke NSDI 2020 paper
     mein isse <b>lazy consistent hashing</b> kaha gaya hai.</p>
     <h3>🏃 Aur agar ek node peechhe reh jaaye?</h3>
     <p>Data barabar bat jaane par bhi <b>kaam</b> barabar nahi hota — koi node noisy
     neighbour ki wajah se slow ho sakta hai, ya uski SSD dheemi ho sakti hai. Snowflake
     us node ka intezaar nahi karta: jo node apna kaam pehle khatam karta hai, woh slow
     node ki baaki files utha leta hai. Query <b>khud ko balance</b> kar leti hai —
     har query, har baar.</p>
     <p class="tip">🎯 Yeh do ideas kahin bhi kaam aate hain: (1) rebalancing ko
     <b>lazy</b> banao taaki woh peak par na ho, (2) kaam ko <b>steal</b> karne do taaki
     ek slow worker poori job ko na roke.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — chaar tareekon ka asar',
      goal: 'Har tareeke ka asar alag-alag naapo — phir dekho ki gunanfal kitna bada hai.',
      problems: [
        {
          q: 'Table mein 50,000 files hain. Pruning ke baad 200 bachte hain. Kitne PERCENT files padhi gayin?',
          unit: '%', given: ['50,000 files', '200 bache'],
          answer: 0.4, tol: 0.4,
          steps: ['200 / 50,000 = 0.004 = 0.4%', 'Yaani 99.6% table execution shuru hone se pehle hi hat gayi'],
          lesson: 'Sabse tez read woh hai jo karni hi na pade.',
        },
        {
          q: 'Bache hue files mein 300 columns hain par query sirf 3 maangti hai. Ab kitne PERCENT data padha jaayega (columnar storage)?',
          unit: '%', given: ['300 columns', '3 chahiye'],
          answer: 1, tol: 0.4,
          steps: ['3 / 300 = 1%', 'Pruning ke 0.4% ke upar yeh aur 1%'],
          lesson: 'Row storage mein tum poori row padhte ho chahe ek column chahiye — columnar mein sirf woh column.',
        },
        {
          q: 'Dono milakar: 50,000 files × 300 columns ke mukable, kitne guna kam data padha gaya? (0.4% ka 1%)',
          unit: 'guna kam', given: ['0.4% files', 'unme se 1% columns'],
          answer: 25000, tol: 0.5,
          steps: ['0.004 × 0.01 = 0.00004', '1 / 0.00004 = 25,000 guna kam'],
          lesson: 'Do "sirf thodi si" bachat gunanfal mein chaar aankon ka farq ban jaati hai — isi liye "door ka data" bhi tez lagta hai.',
        },
      ],
    },
    {
      workload: {"slow":3},
      type: 'tradeoff',
      title: 'Cache aur resize lab',
      instructions: 'Cache warm-up, resize ka tareeka aur straggler handling — teenon ghumao.',
      goal: "Ek node kam se kam <b>3x slow</b> rahe. Resize ke turant baad query <b>2,000 ms ya kam</b> aur resize network transfer <b>50 GB ya kam</b> rakho.",
      scenario: `Warehouse abhi busy hai aur tumne use 4 node se 8 node karne ka faisla
        liya. Cache mein lagbhag <b>400 GB</b> data hai.`,
      knobs: [
        { id: 'resize', label: 'Resize par cache (0 = turant rebalance · 1 = ownership pehle, data baad mein)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Lazy consistent hashing = data queries ke saath khiskta hai.' },
        { id: 'steal', label: 'Work stealing (0 = off · 1 = on)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Fast node slow node ka baaki kaam utha leta hai.' },
        { id: 'slow', label: 'Sabse slow node kitna slow hai', min: 1, max: 5, step: 1, value: 3, unit: '×',
          note: 'Noisy neighbour ya dheemi SSD.' },
      ],
      readouts: k => {
        const m = warehouseModel(k);
        return [
          { label: 'Resize ke baad query time', value: m.queryMs.toLocaleString('en-IN') + ' ms', tone: m.queryMs <= 2000 ? 'ok' : 'bad' },
          { label: 'Resize mein network par data', value: m.movedGB + ' GB', tone: m.movedGB <= 50 ? 'ok' : 'bad' },
          { label: 'Cache hit rate (resize ke turant baad)', value: m.hit + '%', tone: m.hit >= 50 ? 'ok' : 'warn' },
          { label: 'Slow node ne query roki?', value: m.blocked ? 'haan' : 'nahi', tone: m.blocked ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = warehouseModel(k);
        return [
          { label: 'Query time', pct: Math.min(100, (m.queryMs / 12000) * 100), text: m.queryMs + ' ms', tone: m.queryMs <= 2000 ? 'ok' : 'bad' },
          { label: 'Resize traffic', pct: Math.min(100, (m.movedGB / 400) * 100), text: m.movedGB + ' GB', tone: m.movedGB <= 50 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = warehouseModel(k);
        if (k.resize === 0) return { ok: false, text: `Turant rebalance karne se <b>${m.movedGB} GB</b> network par ghoom raha hai — bilkul us waqt jab warehouse pehle se busy hai. Query time <b>${m.queryMs.toLocaleString('en-IN')} ms</b>.` };
        if (m.blocked) return { ok: false, text: `Lazy resize se traffic bach gaya, par ek node <b>${k.slow}×</b> slow hai aur baaki uska intezaar kar rahe hain — query <b>${m.queryMs.toLocaleString('en-IN')} ms</b>. Work stealing on karo.` };
        return { ok: true, text: `Dono cheezein sahi: ownership turant badli (network par sirf <b>${m.movedGB} GB</b>), aur fast nodes ne slow node ka kaam utha liya — query <b>${m.queryMs.toLocaleString('en-IN')} ms</b>.` };
      },
      check: k => { const m = warehouseModel(k); return m.queryMs <= 2000 && m.movedGB <= 50; },
      lesson: `Do niyam: rebalancing ko <b>lazy</b> karo (woh hamesha sabse bure waqt par
        trigger hoti hai), aur kaam ko <b>steal</b> karne do (warna poori job sabse slow
        worker ki speed par chalti hai).`,
      quiz: {
        q: 'Work stealing ki asli zaroorat kab padti hai?',
        choices: [
          'Data barabar bata ho par nodes ki speed nahi — ek dheema node poori query rok leta hai',
          'Data barabar bat jaaye toh speed bhi barabar, toh stealing tabhi jab data bekaar bata ho',
          'Cache khaali ho tab — thande cache par saare tasks shuru se dobara chalaane padte hain',
          'Query chhoti ho tab — chhoti query par cluster ko dugna karke kaam jaldi khatam karo',
        ],
        answer: 0,
        explain: 'Barabar batwara sirf data ka hota hai, speed ka nahi. Ek node dheema hua toh baaki intezaar karte hain — isliye kaam chalte-chalte dobara baanta jaata hai.',
        choiceExplanations: [
          'Barabar batwara sirf data ka hota hai, speed ka nahi. Ek node dheema hua toh baaki intezaar karte hain — isliye kaam chalte-chalte dobara baanta jaata hai.',
          'Barabar bytes se CPU ya network ki speed barabar nahi hoti.',
          'Cache miss se saare tasks dobara shuru nahi hote.',
          'Chhoti query par zyada nodes taal-mel ka kharcha badhate hain.',
        ],
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — cache, resize aur straggler',
      project: '04-snowflake',
      exercise: 'ex2-cache-and-resize',
      goal: 'Local cache ka asar naapo, phir resize ko dono tareekon se karo, aur ek slow node daal kar work stealing on/off karke dekho.',
      why: `Lab mein ek chhota engine hai jo "object storage" (disk par files) se padhta
        hai aur nodes ke local cache rakhta hai. Tum resize ka mode aur stealing on/off
        kar sakte ho, aur ek node ko jaan-boojh kar slow kar sakte ho.`,
      steps: [
        { text: 'Cluster chalao (1024 files, 4 nodes, cache khaali).', cmd: 'cd docker-labs/04-snowflake && npm start ex2-cache-and-resize', expect: 'ex2-cache-and-resize\n  cluster → http://localhost:4402  (1024 files · 4 nodes · cache khaali)' },
        { text: 'Query do baar chalao — pehli cold, doosri warm.', cmd: 'node tools/query.js --repeat 2', expect: 'run 1 (cold): 768 ms   remote reads: 1024   local reads: 0      cache hit: 0%\nrun 2 (warm): 51 ms    remote reads: 0      local reads: 1024   cache hit: 100%' },
        { text: 'Ab turant-rebalance wala resize karo (4 → 8 nodes).', cmd: 'node tools/resize.js --to 8 --mode eager', expect: 'eager resize 4 → 8: upfront moved 512 blocks, resize time 621 ms\n   resize ke baad queries: 26 ms (hit 100%) → 26 ms → 24 ms' },
        { text: 'Reset karke lazy resize karo (ownership pehle, data baad mein).', cmd: 'node tools/reset.js && node tools/resize.js --to 8 --mode lazy', expect: 'lazy resize 4 → 8: upfront moved 0 blocks, resize time 5 ms\n   resize ke baad queries: 204 ms (hit 50%) → 25 ms (hit 100%) → 26 ms' },
        { text: 'Ek node ko 3× slow karo aur work stealing off/on karke query chalao.', cmd: 'node tools/straggler.js --slow 3 --steal off && node tools/straggler.js --slow 3 --steal on', expect: 'slow node 3×  steal=off → query 77 ms\nslow node 3×  steal=on  → query 31 ms' },
      ],
      observe: {
        q: 'Lazy resize mein upfront 0 blocks move hue (5 ms), phir bhi doosri query tak cache hit 100% ho gaya. Kaise?',
        choices: [
          'Naye maalik nodes ne file padhte waqt khud cache kar li — data queries ke saath khiska',
          'Resize se pehle poori cache ek saath copy ho gayi thi, bas lab ne 0 blocks dikhaye',
          'Purane nodes ne query ke result badal diye, isliye naye nodes par hit dikhne lage',
          'Raat ki background job ne chupke se saari files copy kar di, queries ka kaam nahi tha',
        ],
        answer: 0,
        explain: 'Lab sirf maalik ka record badalta hai; cache reads ke saath dheere-dheere bharti hai. Pehle se copy bachti hai, par network ka kaam gayab nahi hota — thande reads, bharne ki bandwidth aur baad ka skew dekhte raho.',
        choiceExplanations: [
          'Lab sirf maalik ka record badalta hai; cache reads ke saath dheere-dheere bharti hai. Pehle se copy bachti hai, par network ka kaam gayab nahi hota — thande reads, bharne ki bandwidth aur baad ka skew dekhte raho.',
          'Output saaf 0 blocks upfront dikhata hai — poori copy nahi hui.',
          'Maalik badalne aur cache bharne se query ka result nahi badalta.',
          'Cache doosri query se garam hui, kisi raat ki job se nahi.',
        ],
      },
      lesson: 'Rebalancing ka sawaal "kaise karein" se zyada <b>"kab karein"</b> hota hai. Lazy migration us "kab" ka sabse achha jawab hai.',
    },
  ],
  interview: {
    title: 'Interview Round — elastic compute',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Remote storage par bane system mein latency kaise chhupaoge?"',
        choices: [
          'Metadata se kam padho, columnar se patla, local cache se paas se — aur result cache se kabhi kuch nahi',
          'Sirf ek bahut bada cache laga do — har query poora scan kare, cache sab chhupa lega',
          'Har query mein poora remote data scan karo — network tez hai, toh latency dikhegi nahi',
          'Sirf queries ko batch mein chalao — batch mein wahi bytes baar-baar padhna sasta ho jaata hai',
        ],
        answer: 0,
        explain: 'Pruning, column reads, compression, local cache aur parallel I/O kharche ke alag hisse ghatate hain. Faayda apne workload aur thande cache par naapo — har technique ka faayda aankh band karke guna mat karo.',
        choiceExplanations: [
          'Pruning, column reads, compression, local cache aur parallel I/O kharche ke alag hisse ghatate hain. Faayda apne workload aur thande cache par naapo — har technique ka faayda aankh band karke guna mat karo.',
          'Cache thanda ya chhota ho sakta hai. Bekaar padhna phir bhi kharcha hai.',
          'Poora remote scan network aur bandwidth ka kharcha badhata hai.',
          'Batch karne se baar-baar padhe jaane wale bytes kam nahi hote.',
        ],
      },
      {
        q: 'Interviewer: "Cluster resize par cached data kaise handle karoge?"',
        choices: [
          'Maalik turant badlo, data queries ke saath dheere khiske — peak par data mat ghumao',
          'Resize par saari files turant naye nodes par copy karo, taaki cache hit kabhi na gire',
          'Har resize par poori cache flush karo, taaki naye nodes saaf shuruaat karein',
          'Peak load mein resize par poori rok lagao — sirf raat ko shaant waqt mein hi badlo',
        ],
        answer: 0,
        explain: 'Lazy consistent hashing ka poora point: mehenga kaam us waqt mat karo jab system pehle se dab raha ho.',
        choiceExplanations: [
          'Lazy consistent hashing ka poora point: mehenga kaam us waqt mat karo jab system pehle se dab raha ho.',
          'Peak par saari files copy karna network par aur bojh daalta hai.',
          'Flush kaam ki cache ko phenk deta hai.',
          'Shaant waqt ho sakta hai, par peak par capacity ki zaroorat poori rok se hal nahi hoti.',
        ],
      },
    ],
  },
  success: [
    'Main remote storage par latency chhupane ke chaar tareeke bata sakta hoon',
    'Main lazy rebalancing aur work stealing design kar sakta hoon',
    'Main per-workload compute isolation ka faayda samjha sakta hoon',
  ],
  homework: `<p>Apne system mein ek aisi jagah dhoondho jahan koi "rebalance" hota hai
    (shard move, cache warm-up, partition reassignment). Ab poochho: <b>woh rebalance kab
    trigger hota hai?</b> Agar jawab "jab load badhta hai" hai, toh woh sabse galat waqt
    hai — dekho ki use lazy kiya ja sakta hai ya nahi.</p>`,
  cards: [
    { front: 'Virtual warehouse kya hai?', back: 'Stateless machines ka cluster: t-shirt sizes, seconds mein start, idle par auto-suspend, query par auto-resume, standard warehouse compute ki per-second billing, start/resume par 60-second minimum ke saath. Node loss par running query fail/retry ho sakti hai; durable source storage alag rehta hai.' },
    { front: 'Remote storage par latency chhupane ke 4 tareeke?', back: '(1) kam padho — min/max pruning, (2) patla padho — columnar, (3) paas se padho — local SSD cache + consistent hashing, (4) kuch mat padho — result cache.' },
    { front: 'Lazy consistent hashing kya hai?', back: 'Resize par ownership turant badalta hai par cached data baad mein khiskta hai — queries jab naye assignment ke hisaab se padhti hain tab. Rebalancing peak par network nahi kha jaati.' },
    { front: 'Work stealing kyun?', back: 'Data barabar bat sakta hai, speed nahi. Slow node (noisy neighbour, dheemi SSD) poori query ko rok deta — isliye jo node khali ho jaaye woh uski baaki files utha leta hai.' },
  ],
},
]);

function warehouseModel(k) {
  const movedGB = k.resize === 0 ? 392 : 0;
  const hit = k.resize === 0 ? 96 : 46;
  const blocked = k.steal === 0 && k.slow >= 2;
  let queryMs = k.resize === 0 ? 8900 : 640;
  if (blocked) queryMs = Math.max(queryMs, 1500 * k.slow);
  return { movedGB, hit, blocked, queryMs };
}

})();
