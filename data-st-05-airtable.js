/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Airtable

   Source: "AIRTABLE — Why this $11 Billion Database Caps You at 50,000
   Rows" (Akhil Sharma) + Airtable ka apna engineering post
   "rewriting our database in Rust".

   3 levels:
     st-air-memory — base ek worker ki RAM mein · one-machine ceiling
     st-air-live   — live queries, per-view diffs, dependency graph
     st-air-rust   — runtime hi chhat thi · 1 writer/N readers · dual-run migration
   ===================================================================== */
(function () {

VISUALS['st-air-memory'] = {
  t: 'Ek base = ek worker ki memory',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🖱️ base kholo</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="sup">🎛️ supervisor (kaunsa worker?)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="worker">🧠 worker — poora base RAM mein</span>
    </div>
    <div class="dg-cap">Yeh database ke saamne laga cache nahi hai — <b>base khud memory
      mein rehta hai</b> aur wahin par kaam hota hai. Har base ka apna worker (single
      tenant), isliye ek customer ka bhaari kaam doosre ko nahi kha sakta.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Faayda</span>
        <div class="dg-cap">Koi round trip nahi. 1 lakh records filter karna, formula
          column recompute karna, linked tables par rollup — sab <b>RAM mein</b>.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🧱 Keemat — ek machine ki chhat</span>
        <div class="dg-cap">Base ko <b>ek hi machine</b> mein aana chahiye. Isi liye record
          limits hain — woh product ka nakhra nahi, ek machine ki RAM hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">aam backend</span><span class="cmd">I/O-bound</span><span class="q">DB, cache, network ka intezaar — CPU zyadatar khaali</span></div>
      <div class="dg-rung g"><span class="lv">Airtable worker</span><span class="cmd">CPU-bound</span><span class="q">intezaar kuch hai hi nahi — jo khatam hota hai woh CPU hai</span></div>
    </div>`,
};

VISUALS['st-air-live'] = {
  t: 'Ek write, kai live views — sirf DIFF bhejo',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Har view dobara chalao</span>
        <div class="dg-cap">1 write × 40 open views = 40 queries. 100 log dekh rahe hon
          toh 100. Yeh model bhaar ke saath phat jaata hai.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Incremental view maintenance</span>
        <div class="dg-cap">Poochho: <b>is ek write se har live query ka jawab kaise
          badla?</b> Har view ke liye ek chhota diff banao aur wahi bhejo.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">✏️ cell badla</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="graph">🕸️ dependency graph</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🧮 formulas · rollups · lookups</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="diff">📨 har view ko uska apna diff</span>
    </div>
    <div class="dg-cap">Records ek doosre par nirbhar hain (link, lookup, rollup, formula) —
      woh nirbharta ek <b>graph</b> hai. Graph memory mein hai, kyunki yeh pointer-chasing
      kaam database round trips ke saath bahut mehenga ho jaata.</div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box is-accent"><span class="bx-label">🔢 Fractional index</span>
        <div class="dg-cap">Row ko 2 aur 3 ke beech daalo → uski position <b>2.5</b>.
          Neeche wali saari rows ko dobara number nahi karna padta.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🧱 Batch primitives</span>
        <div class="dg-cap">Column ka type badla ya formula mein <code>NOW()</code> hai —
          ab poora column badalta hai, ek row nahi. Uske liye alag bulk operations chahiye.</div></div>
    </div>`,
};

VISUALS['st-air-rust'] = {
  t: 'Chhat hardware nahi thi — runtime thi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Pehle: TypeScript on Node</span>
        <div class="dg-cap">Ek main thread. Kaam CPU-bound hai, par baaki cores khaali.
          Parallel karna ho toh alag process → base ki <b>doosri copy</b> (kabhi
          dasiyon GB) aur har edit sab copies mein bhejni padegi.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Baad mein: Rust engine</span>
        <div class="dg-node is-good" data-hs="writer"><span class="ni">✍️</span><span class="nl">1 write thread</span><span class="ns">saare writes ek kram mein</span></div>
        <div class="dg-node is-accent" data-hs="readers"><span class="ni">👀</span><span class="nl">N read threads</span><span class="ns">MVCC snapshot — rukte nahi</span></div>
        <div class="dg-cap">Shared memory, ek dispatcher, aur asli database guarantees:
          transactions + MVCC, indexes, FK/unique constraints, triggers.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">step 1</span><span class="cmd">abstraction boundary</span><span class="q">product ek taraf, database doosri taraf — dono alag-alag chalte rahe</span></div>
      <div class="dg-rung"><span class="lv">step 2</span><span class="cmd">DUAL RUN</span><span class="q">har operation dono engines par · jawab apne aap compare</span></div>
      <div class="dg-rung"><span class="lv">step 3</span><span class="cmd">poore dataset ka diff</span><span class="q">har mismatch dekha, samjha, theek kiya gaya</span></div>
      <div class="dg-rung g"><span class="lv">step 4</span><span class="cmd">cutover</span><span class="q">jab farq bacha hi nahi, tab switch</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-cap">Aur ek faisla: <b>embeddings</b> (ek vector row se lagbhag 10×
      bada) core memory database mein nahi, alag vector store mein — aur unhe thoda
      <b>peechhe</b> rehne ki ijazat hai.</div>`,
};

/* =====================================================================
   LEVEL 1 — POORA BASE MEMORY MEIN
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-air-memory',
  icon: '🧠',
  title: 'Airtable — poora base ek machine ki RAM mein',
  badge: 'Memory Malik',
  objectives: [
    'Base = bounded world; ek base, ek worker, poori RAM mein',
    'Supervisor: kaunsa worker kis base ka maalik hai',
    'One-machine ceiling — record limits ka asli kaaran',
    'I/O-bound se CPU-bound ho jaana, aur us se scaling kaise badalti hai',
  ],
  lesson: [
    `<h3>📦 Airtable ka poora design ek cheez ke aas-paas hai: BASE</h3>
     <p>Base ek Airtable document hai — uski tables, fields, linked records aur views.
     Sabse mushkil baat yeh hai ki <b>base ka schema user runtime par banata hai</b>:
     table jodo, field jodo, uska type chuno, doosri table se link karo, formula likho.
     Aur phir bhi sab kuch aisa chale jaise woh schema pehle se socha gaya tha.</p>
     <p>Base kholte hi Airtable uske liye ek dedicated server deta hai — ek <b>worker</b>
     — aur worker <b>poora base memory mein</b> load kar leta hai aur wahin se sab serve
     karta hai. Dhyan do: yeh database ke saamne laga cache nahi hai. In-memory copy hi
     woh cheez hai jis par kaam hota hai.</p>
     <p>Ek chhota control service — <b>supervisor</b> — tay karta hai ki kaunsa worker
     kaunsa base rakhega, request sahi worker tak bhejta hai, aur workers ka lifecycle
     sambhalta hai.</p>
     <p class="tip">🎯 Yeh sirf speed ka faisla nahi hai — <b>noisy neighbour</b> ka bhi
     hai. Har base ka apna worker aur apni memory hai, isliye kisi ek enterprise ka
     monster base baaki sab ko nahi kha sakta.</p>`,
    `<h3>🧱 Aur yahin se ek chhat aa jaati hai</h3>
     <p>Agar base ek worker ki memory mein poora load hota hai, toh <b>base ko ek hi
     machine mein aana chahiye</b>. Ek base ko 10 servers par nahi phailaya ja sakta,
     kyunki live queries, dependency graph aur in-memory optimizations — sab ko poora
     base ek jagah chahiye.</p>
     <p>Isliye Airtable ke record limits product ka nakhra nahi hain. Performance lagbhag
     8 lakh records ke aas-paas girne lagti hai, aur top plans par bhi ceiling laakh ke
     order mein hi hai — <b>yeh woh number hai jo ek machine memory mein rakh kar bhi tez
     reh sakti hai</b>.</p>
     <p>Slack wali kahani yaad karo: wahan ek bahut bada workspace ek shard par atak gaya
     tha (hot shard) — woh <b>haadsa</b> tha. Airtable mein yeh haadsa nahi hai, yeh
     <b>chuna hua sauda</b> hai: in-memory speed ke badle ek machine ki seema.</p>
     <h3>🔥 Aur ek ulta-pulta natija: worker CPU-bound hai</h3>
     <p>Aam backend apni zindagi <b>intezaar</b> mein bitata hai — database se rows,
     cache se jawab, network se response. CPU beech mein khaali baitha rehta hai.</p>
     <p>Airtable mein intezaar hai hi nahi. 1 lakh records filter karna, formula column
     recompute karna, linked tables par rollup — sab <b>raw computation</b> hai. Isliye
     jo cheez pehle khatam hoti hai woh I/O nahi, <b>CPU</b> hai.</p>
     <table>
       <tr><th>I/O-bound system</th><th>CPU-bound system</th></tr>
       <tr><td>Scale karne ke liye zyada "intezaar karne ki jagah" chahiye — zyada connections, zyada (zyadatar khaali) machines</td><td>Scale karne ke liye asli processing chahiye — aur har core ka istemaal hona chahiye</td></tr>
     </table>
     <p>Yahi ek baat aage jaake Airtable ki sabse badi engineering decision bani — woh
     teesre level mein hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Yeh system I/O-bound hai ya CPU-bound?',
      instructions: 'Har lakshan ko sahi dabbe mein daalo.',
      bins: [
        { id: 'io', label: '⏳ I/O-bound ke lakshan' },
        { id: 'cpu', label: '🔥 CPU-bound ke lakshan' },
      ],
      items: [
        { text: 'CPU 20% par hai par p99 latency bahut kharab hai', bin: 'io', explain: 'Classic I/O-bound signature — machine wait kar rahi hai, thak nahi rahi.' },
        { text: 'Ek core 100% par hai aur baaki cores khaali', bin: 'cpu', explain: 'Yahi Airtable ka Node.js wala dard tha: kaam CPU ka hai par runtime ek hi thread par chala raha hai.' },
        { text: 'Connection pool badhane se throughput badh jaata hai', bin: 'io', explain: 'Pool tab madad karta hai jab aap intezaar kar rahe ho. CPU-bound system mein pool badhane se sirf queue lambi hoti hai.' },
        { text: '1 lakh rows par filter + rollup chalane mein 400 ms lagte hain, bina kisi network call ke', bin: 'cpu', explain: 'Koi round trip nahi — pura waqt calculation mein hai.' },
        { text: 'Latency ka zyadatar hissa "waiting on DB" spans mein hai', bin: 'io', explain: 'Trace dekh kar turant pata chal jaata hai.' },
        { text: 'Zyada cores wali machine par jaane se p99 seedha behtar hota hai', bin: 'cpu', explain: 'Par sirf tab jab runtime un cores ko use kar sake — warna bade machine ka faayda nahi milta.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'One-machine ceiling lab',
      instructions: 'Records, RAM aur architecture — teenon ghumao. Dekho record limit kahan se aati hai.',
      goal: 'Aisi setting dhoondho jahan base machine mein <b>aa jaaye</b>, filter query <b>300 ms se kam</b> mein chale, aur ek monster base baaki customers ko <b>dheema na kare</b>.',
      scenario: `Har record lagbhag <b>2 KB</b> memory leta hai (fields, formulas,
        indexes, dependency graph sab milakar). Worker machine ki RAM tumhare haath mein
        hai.`,
      knobs: [
        { id: 'records', label: 'Base mein records', min: 50000, max: 2000000, step: 50000, value: 1500000, unit: '',
          note: 'Airtable ki performance lagbhag 8 lakh ke baad girne lagti hai.' },
        { id: 'ram', label: 'Worker machine ki RAM', min: 2, max: 64, step: 2, value: 8, unit: ' GB',
          note: 'Base poora ismein aana chahiye.' },
        { id: 'shape', label: 'Architecture (0 = ek worker par kai bases · 1 = ek base = ek worker)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Shared worker sasta hai par noisy neighbour laata hai.' },
      ],
      readouts: k => {
        const m = airMemModel(k);
        return [
          { label: 'Base ka size', value: m.sizeGB + ' GB', tone: m.fits ? 'ok' : 'bad' },
          { label: 'Machine mein aata hai?', value: m.fits ? 'haan' : 'nahi — swap/OOM', tone: m.fits ? 'ok' : 'bad' },
          { label: 'Filter query', value: m.queryMs + ' ms', tone: m.queryMs <= 300 ? 'ok' : 'bad' },
          { label: 'Padosi base par asar', value: m.noisy ? 'dheema ho jaata hai' : 'koi asar nahi', tone: m.noisy ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = airMemModel(k);
        return [
          { label: 'RAM istemaal', pct: Math.min(100, (m.sizeGB / k.ram) * 100), text: m.sizeGB + ' / ' + k.ram + ' GB', tone: m.fits ? 'ok' : 'bad' },
          { label: 'Filter query', pct: Math.min(100, (m.queryMs / 1500) * 100), text: m.queryMs + ' ms', tone: m.queryMs <= 300 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = airMemModel(k);
        if (!m.fits) return { ok: false, text: `Base <b>${m.sizeGB} GB</b> ka hai par machine mein <b>${k.ram} GB</b> hai — base machine mein aata hi nahi. Yahi woh jagah hai jahan product mein "record limit" likhni padti hai.` };
        if (m.queryMs > 300) return { ok: false, text: `Base fit ho gaya par <b>${(k.records / 100000).toFixed(1)} lakh</b> records par filter <b>${m.queryMs} ms</b> le raha hai. In-memory hone ke baad bhi CPU ka kaam records ke saath badhta hai.` };
        if (m.noisy) return { ok: false, text: `Speed theek hai par ek worker par kai bases hain — ek bhaari base ne padosiyon ko dheema kar diya. Airtable ne isi liye ek base = ek worker rakha.` };
        return { ok: true, text: `Sahi: base <b>${m.sizeGB} GB</b> machine mein aa gaya, filter <b>${m.queryMs} ms</b>, aur har base apne worker par hai — koi padosi prabhavit nahi.` };
      },
      check: k => { const m = airMemModel(k); return m.fits && m.queryMs <= 300 && !m.noisy; },
      lesson: `In-memory architecture do cheezein ek saath deti hai: <b>speed</b> aur ek
        <b>sakht seema</b>. Agar tumhara data ek machine mein aata hai, yeh sauda shandaar
        hai; jis din nahi aata, us din poora model badalna padta hai.`,
      quiz: {
        q: 'Airtable ka record limit product ka faisla hai ya architecture ka?',
        choices: [
          'Architecture ka — base ko ek machine ki memory mein aana hai, isliye limit wahi hai jo ek machine tez rakh sakti hai',
          'Product ka — taaki log upgrade karein',
          'Database ka — Postgres ki row limit',
          'Browser ka — JavaScript ki array limit',
        ],
        answer: 0,
        explain: 'Browser ki bhi apni seema hai (client bhi ek copy rakhta hai), par asli chhat worker ki RAM hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — in-memory worker aur uski chhat',
      project: '05-airtable',
      exercise: 'ex1-in-memory-base',
      goal: 'Ek base ko do tareeke se serve karo — har request par store se padh kar, aur poora base memory mein rakh kar — aur latency + memory dono naapo.',
      why: `Lab ka worker <code>MODE=disk</code> mein har filter ke liye store se rows
        padhta hai; <code>MODE=memory</code> mein base ek baar load hota hai aur wahin se
        kaam hota hai. <code>RECORDS</code> se base ka size badla ja sakta hai.`,
      steps: [
        { text: 'Disk mode chalao (1 lakh records).', cmd: 'cd docker-labs/05-airtable && RECORDS=100000 npm start ex1-in-memory-base', expect: 'ex1-in-memory-base\n  worker → http://localhost:4501  (MODE=disk · 1,00,000 records)' },
        { text: 'Filter + rollup ka load chalao.', cmd: 'node tools/filter-load.js --queries 100', expect: 'MODE=disk   p50: 27 ms   p99: 474 ms   rss: 95 MB   (1,00,000 records)' },
        { text: 'Ab memory mode.', cmd: 'RECORDS=100000 MODE=memory npm start ex1-in-memory-base && node tools/filter-load.js --queries 100', expect: 'MODE=memory p50: 3 ms   p99: 65 ms   rss: 110 MB   (1,00,000 records)' },
        { text: 'Base ko bada karke chhat dekho.', cmd: 'RECORDS=1500000 MODE=memory npm start ex1-in-memory-base', expect: 'loading base…  15,00,000 records\n❌ worker refused: base ko ~5.1 GB chahiye, limit 4.0 GB (MAX_BASE_MB)\n   → yahi woh jagah hai jahan product mein "record limit" likhni padti hai' },
      ],
      observe: {
        q: 'Memory mode mein p50 27 ms se 3 ms ho gaya, par RSS 95 MB se 110 MB — aur 15 lakh records par worker ne mana kar diya. Yeh kis cheez ka sauda hai?',
        choices: [
          'Latency ke badle memory — aur us memory ki wajah se ek base ka size ek machine se bandh jaata hai',
          'CPU ke badle disk',
          'Sirf better caching, koi sauda nahi',
          'Network ke badle CPU',
        ],
        answer: 0,
        explain: 'Yahi Airtable ka core sauda hai: sab kuch RAM mein rakho (tez), par ab base ko ek machine mein aana hi hoga (seema).',
      },
      lesson: 'Har architecture ek cheez deta hai aur ek cheez le leta hai. In-memory speed deta hai aur <b>ek machine ki chhat</b> le leta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — in-memory systems',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Poora dataset memory mein rakhna kab sahi hai?"',
        choices: [
          'Jab dataset ek machine mein aata ho, kaam computation-heavy ho, aur tum us seema ko product ki limit ke roop mein maan sako',
          'Jab data chhota ho, warna kabhi nahi',
          'Hamesha — RAM sasti hai',
          'Sirf cache ke roop mein, source of truth kabhi nahi',
        ],
        answer: 0,
        explain: 'Airtable ne teeno shartein maanin aur record limit ko product ka hissa bana diya.',
      },
      {
        q: 'Interviewer: "Tumhara service CPU-bound nikla. Pehla kadam?"',
        choices: [
          'Dekho ki runtime saare cores use kar bhi sakta hai ya nahi — warna bada machine lene se kuch nahi hoga',
          'Connection pool badha do',
          'Cache laga do',
          'Autoscaling on kar do',
        ],
        answer: 0,
        explain: 'Yahi woh jagah hai jahan Airtable atka tha: kaam CPU ka tha par runtime ek hi thread par chal raha tha.',
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki system I/O-bound hai ya CPU-bound',
    'Main in-memory architecture ka faayda aur uski seema dono samjha sakta hoon',
    'Main per-tenant worker se noisy neighbour rokna samajh gaya hoon',
  ],
  homework: `<p>Apne sabse bhaari endpoint par ek trace dekho. Uske total time mein se
    kitna hissa "waiting" hai (DB, cache, HTTP) aur kitna "computing"? Jo bada hai, wahi
    tumhara asli bottleneck hai — aur dono ka ilaaj bilkul alag hai.</p>`,
  cards: [
    { front: 'Airtable ka "base" kya hai?', back: 'Ek Airtable document (tables, fields, links, views) — ek bounded world jiska schema user runtime par banata hai. Base kholne par ek dedicated worker use poora RAM mein load kar leta hai.' },
    { front: 'Supervisor ka kaam?', back: 'Tay karna ki kaunsa worker kis base ka maalik hai, request sahi worker tak bhejna, aur workers ka lifecycle sambhalna.' },
    { front: 'Record limit ka asli kaaran?', back: 'Base ko ek hi machine ki memory mein aana hai (live queries + dependency graph ko poora base ek jagah chahiye). Limit = jo ek machine tez rakh sakti hai.' },
    { front: 'I/O-bound vs CPU-bound?', back: 'Aam backend intezaar karta hai (CPU khaali). Airtable ka worker kuch wait nahi karta — filter, formula aur rollup raw compute hain, isliye CPU pehle khatam hota hai.' },
  ],
},
]);

function airMemModel(k) {
  const sizeGB = +(k.records * 2048 / 1e9).toFixed(2);
  const fits = sizeGB <= k.ram * 0.75;
  const queryMs = Math.max(4, Math.round(k.records / 4000));
  const noisy = k.shape === 0;
  return { sizeGB, fits, queryMs, noisy };
}

/* =====================================================================
   LEVEL 2 — LIVE VIEWS aur DEPENDENCY GRAPH
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-air-live',
  icon: '📡',
  title: 'Airtable — ek write, sabko sirf uska diff',
  badge: 'Diff Doot',
  objectives: [
    'Har open view ek live query hai',
    'Incremental view maintenance — query dobara chalane ke bajaye diff nikalna',
    'Dependency graph: formula, rollup, lookup ka chain',
    'Fractional indexing aur batch primitives',
  ],
  lesson: [
    `<h3>👀 Har khuli hui view ek live query hai</h3>
     <p>Ek hi base ko dus log dekh rahe hain: kisi ki view filtered hai, kisi ki sorted,
     koi kanban mein hai, koi grouped. In sab ka matlab hai ki base par <b>kai live
     queries</b> chal rahi hain.</p>
     <p>Seedha jawab yeh hoga: jab koi cell badle, har affected query dobara chala do.
     Airtable ke paimane par yeh aapda hai — ek write par darjanon (ya saikdon) queries
     dobara chalengi.</p>
     <p>Isliye Airtable ka engine woh karta hai jo aam databases nahi karte:
     <b>incremental view maintenance</b>. Sawaal badal jaata hai:</p>
     <pre>❌ "is view ka jawab kya hai?"        (poori query dobara)
✅ "is ek write se is view ka jawab KAISE BADLA?"   (sirf farq)</pre>
     <p>Naya record aaya: engine nikalta hai ki woh <b>tumhari</b> filtered view mein
     aayega (aur kis sorted position par), par <b>meri</b> view mein nahi. Phir woh ek
     chhota <b>diff</b> banata hai — "yeh row yahan daalo" — aur wahi bhejta hai.</p>
     <p class="tip">🎯 Real-time collaboration mehenga isliye nahi hoti ki data bada hai —
     mehenga tab hoti hai jab har change par poora jawab dobara banaya jaaye.</p>`,
    `<h3>🕸️ Dependency graph — ek cell sirf ek cell nahi hoti</h3>
     <p>Airtable sirf data store nahi karta, woh data se naya data <b>nikalta</b> hai:
     linked records, lookup fields, rollups, formulas. Matlab records ek doosre par
     nirbhar hain, aksar kai tables ke paar. Yeh nirbhartaayein ek <b>graph</b> banati hain.</p>
     <p>Ek value badli toh engine ko us graph par chal kar sab downstream cheezein dobara
     calculate karni padti hain: formulas, rollups, lookups, aur woh views jo un values ko
     dikha rahi hain. Isiliye graph memory mein rehta hai — yeh pointer-chasing kaam hai,
     aur database round trips ke saath yeh bahut mehenga ho jaata.</p>
     <pre>store karo → jo us par nirbhar hai sab recompute karo → clients ko diff bhejo</pre>
     <h3>🔢 Do chhoti par kaam ki cheezein</h3>
     <p><b>Fractional indexing:</b> row ko 2 aur 3 ke beech drag kiya? Uski position
     <b>2.5</b> ho jaati hai; agli baar 2.75. Sirf woh row likhi jaati hai jo hili —
     neeche ki hazaron rows dobara number nahi hoti.</p>
     <p><b>Batch primitives:</b> kuch changes ek row ko nahi, <b>poore column</b> ko
     chhoote hain — jaise formula jisme <code>NOW()</code> hai, ya column ka type badalna.
     Ek-ek row update karna bahut dheema hoga, isliye engine mein table ke bade hisse ko
     ek operation mein dobara likhne wale bulk primitives hain.</p>
     <p>Aur ek detail: browser bhi base ki apni copy rakhta hai aur server ke bheje diffs
     lagata hai — isliye scroll, sort aur view switch local hote hain aur kharab network
     par bhi turant lagte hain.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — 1 write ka bill',
      goal: 'Dono models ka kaam apne haath se gino.',
      problems: [
        {
          q: '40 log base khole hue hain, har ek ki apni view. Ek write par "har view dobara chalao" model mein kitni queries chalengi?',
          unit: 'queries', given: ['40 open views', '1 write'],
          answer: 40, tol: 0.3,
          steps: ['Har view ka jawab badal sakta hai, isliye sab dobara', '1 write = 40 queries'],
          lesson: 'Kaam viewers ke saath badhta hai, data ke saath nahi.',
        },
        {
          q: 'Base par roz 20,000 writes hain aur average 40 viewers. Usi model mein roz kitni queries?',
          unit: 'queries', given: ['20,000 writes', '40 viewers'],
          answer: 800000, tol: 0.3,
          steps: ['20,000 × 40 = 8,00,000 queries roz', 'Sirf views ko fresh rakhne ke liye'],
          lesson: 'Isi liye incremental view maintenance ek optimization nahi, zaroorat ban jaati hai.',
        },
        {
          q: 'Incremental model mein har write par har view ke liye ek chhota diff banta hai (query nahi). Agar diff banana query se 50× sasta ho, toh roz ka kaam kitna reh jaayega (query-equivalents mein)?',
          unit: 'query-equivalents', given: ['8,00,000 queries ka kaam', '50× sasta'],
          answer: 16000, tol: 0.4,
          steps: ['8,00,000 / 50 = 16,000 query-equivalents', 'Yaani lagbhag utna hi jitne writes hain'],
          lesson: 'Achhi incremental maintenance kaam ko "viewers × writes" se hata kar lagbhag "writes" par le aati hai.',
        },
      ],
    },
    {
      type: 'order',
      title: 'Ek edit ka safar — sahi kram',
      instructions: 'Row drag karke value badalne par andar kya-kya hota hai?',
      steps: [
        { text: 'Request us worker tak jaati hai jo is base ka maalik hai', explain: 'Supervisor ne pehle se tay kiya hua hai ki base kis worker ke paas hai.' },
        { text: 'Edit single write thread par, ek transaction ke andar apply hota hai', explain: 'Saare writes ek kram mein — isi se ordering aur consistency milti hai.' },
        { text: 'Row ki nayi position ek fractional index se milti hai (2 aur 3 ke beech = 2.5)', explain: 'Sirf hili hui row likhi jaati hai, baaki dobara number nahi hoti.' },
        { text: 'Dependency graph par chal kar formulas, rollups aur lookups recompute hote hain', explain: 'Ek cell ka badalna poore chain ko chhoo sakta hai.' },
        { text: 'Har khuli view ke liye uska apna chhota diff banta hai', explain: 'Poori view dobara nahi banti — sirf farq nikalta hai.' },
        { text: 'Diffs clients ko jaate hain aur browser apni local copy par lagata hai', explain: 'Isi liye screen turant badalti hai, chahe connection dheema ho.' },
        { text: 'Change durable storage mein likha jaata hai aur (agar AI features on hain) embedding baad mein refresh hoti hai', explain: 'RAM serving layer hai; durability disk par hai, aur embeddings jaan-boojh kar peechhe reh sakti hain.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Live views lab — kaam kis par nirbhar ho',
      instructions: 'Viewers, write rate aur model badlo. Har write par kitna kaam hota hai, dekho.',
      goal: 'Aisa model chuno jo viewers badhne par na phate — server ka kaam <b>40 units/second se kam</b> aur clients ko update <b>200 ms se kam</b> mein.',
      scenario: `Ek popular base hai. Kai log ek saath dekh rahe hain aur kuch log
        lagatar likh rahe hain. Tum tay karoge ki view fresh rakhne ka tareeka kya ho.`,
      knobs: [
        { id: 'viewers', label: 'Ek saath khuli views', min: 1, max: 100, step: 1, value: 60, unit: '',
          note: 'Har viewer ki apni filter/sort ho sakti hai.' },
        { id: 'writes', label: 'Writes per second', min: 1, max: 40, step: 1, value: 20, unit: '/s',
          note: 'Kitni tezi se data badal raha hai.' },
        { id: 'model', label: 'Model (0 = har view dobara chalao · 1 = diff bhejo)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Incremental view maintenance = diff.' },
      ],
      readouts: k => {
        const m = liveViewModel(k);
        return [
          { label: 'Server ka kaam', value: m.work + ' units/s', tone: m.work <= 40 ? 'ok' : 'bad' },
          { label: 'Client ko update', value: m.updateMs + ' ms', tone: m.updateMs <= 200 ? 'ok' : 'bad' },
          { label: 'Har write par kaam', value: m.perWrite + ' units', tone: m.perWrite <= 3 ? 'ok' : 'warn' },
          { label: 'Network par bheja gaya data', value: m.bytes, tone: k.model === 1 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = liveViewModel(k);
        return [
          { label: 'Server kaam', pct: Math.min(100, (m.work / 400) * 100), text: m.work + ' u/s', tone: m.work <= 40 ? 'ok' : 'bad' },
          { label: 'Update latency', pct: Math.min(100, (m.updateMs / 1500) * 100), text: m.updateMs + ' ms', tone: m.updateMs <= 200 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = liveViewModel(k);
        if (k.model === 0) return { ok: false, text: `"Har view dobara chalao" mein kaam = viewers × writes = <b>${m.work} units/s</b>. Viewers badhte hi yeh model phat jaata hai — jabki data utna hi hai.` };
        if (m.work > 40) return { ok: false, text: `Diff model mein bhi <b>${k.writes}/s</b> writes × <b>${k.viewers}</b> viewers ka thoda kaam hai: <b>${m.work} units/s</b>. Write rate ya viewers thode kam karo.` };
        if (m.updateMs > 200) return { ok: false, text: `Kaam theek hai par client ko update <b>${m.updateMs} ms</b> mein mil raha hai — 200 ms se zyada.` };
        return { ok: true, text: `Sahi: diffs ke saath kaam lagbhag writes ke saath badhta hai, viewers ke saath nahi — <b>${m.work} units/s</b>, update <b>${m.updateMs} ms</b>.` };
      },
      check: k => { const m = liveViewModel(k); return k.model === 1 && m.work <= 40 && m.updateMs <= 200; },
      lesson: `Real-time UI ka asli sawaal hai: <b>kaam kis cheez ke saath badhta hai?</b>
        Agar woh "viewers × writes" hai toh system viewers ke saath marega. Diff bhejne se
        woh lagbhag sirf "writes" par aa jaata hai.`,
      quiz: {
        q: 'Incremental view maintenance ka core sawaal kya hai?',
        choices: [
          '"Is ek write se har live query ka jawab kaise badla?" — poora jawab dobara banane ke bajaye sirf farq nikalna',
          '"Query ko kaise tez karein?"',
          '"Kaunsi views cache karein?"',
          '"Kitni der baad refresh karein?"',
        ],
        answer: 0,
        explain: 'Yahi sawaal Airtable ko har change par har view dobara chalane se bachata hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — dobara chalao vs diff bhejo',
      project: '05-airtable',
      exercise: 'ex2-live-views',
      goal: 'N viewers ke saath ek base par writes chalao — pehle "rerun" mode mein, phir "diff" mode mein — aur server ka kaam aur bheja gaya data naapo.',
      why: `Lab mein har viewer apni filter/sort ke saath subscribe karta hai.
        <code>VIEWS=rerun</code> har write par har view ki query dobara chalata hai;
        <code>VIEWS=diff</code> sirf badla hua hissa bhejta hai.`,
      steps: [
        { text: 'Rerun mode chalao.', cmd: 'cd docker-labs/05-airtable && npm start ex2-live-views', expect: 'ex2-live-views\n  base-worker → http://localhost:4502  (VIEWS=rerun · 20,000 rows)' },
        { text: 'Load chalao: 40 viewers, 20 writes/second, 5 second.', cmd: 'node tools/views.js --viewers 40 --wps 20 --for 5', expect: 'VIEWS=rerun viewers: 40   view queries run: 3,360   rows sent: 99,45,600   diffs sent: 0   write p99: 19 ms' },
        { text: 'Ab diff mode.', cmd: 'VIEWS=diff npm start ex2-live-views && node tools/views.js --viewers 40 --wps 20 --for 5', expect: 'VIEWS=diff  viewers: 40   view queries run: 40   rows sent: 1,19,024   diffs sent: 624   write p99: 4 ms\n(1.19 lakh mein se lagbhag sab shuruaati view-load; writes ke dauraan sirf 624 diffs)' },
        { text: 'Dependency chain ka asar dekho: ek cell badlo jispar formula, rollup aur lookup nirbhar hain.', cmd: 'node tools/deps.js', expect: 'changed: rows[4].qty\n  → formula line_total      (1 record)\n  → rollup  order_total     (1 record)\n  → lookup  customer_spend  (1 record)\nrecomputed: 3 records · views touched: 1 · rows sent: 1' },
      ],
      observe: {
        q: 'Diff mode mein 40 viewers hote hue bhi view queries 3,360 se 40 (sirf shuruaati load) aur rows 99 lakh se 1.19 lakh ho gaye. Kaam kahan gaya?',
        choices: [
          'Kaam hua hi nahi tha — rerun mode har viewer ke liye poora jawab dobara bana raha tha, jabki asli badlav sirf kuch rows ka tha',
          'Diff mode ne compression laga diya',
          'Viewers ne kam data maanga',
          'Writes kam ho gaye',
        ],
        answer: 0,
        explain: 'Incremental maintenance ka poora point yahi hai: kaam ko "viewers × writes" se hata kar lagbhag "writes" par le aana.',
      },
      lesson: 'Jab bhi koi UI "live" hona chahiye, poochho: har change par kaam <b>viewers ke saath</b> badhta hai ya <b>changes ke saath</b>?',
    },
  ],
  interview: {
    title: 'Interview Round — realtime views',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Collaborative app mein sabki screen live kaise rakhoge?"',
        choices: [
          'Har client ki subscription (filter/sort) yaad rakho, aur har write par sirf uska diff nikaal kar bhejo — poori query dobara mat chalao',
          'Har client ko 1 second par poll karne do',
          'Har write par sab clients ko poora dataset bhej do',
          'WebSocket par har write broadcast kar do, client khud filter kar le',
        ],
        answer: 0,
        explain: 'Broadcast karna server par sasta lagta hai par har client ko sab kuch bhejta hai aur client par kaam daalta hai. Diff dono taraf sasta hai.',
      },
      {
        q: 'Interviewer: "Drag-and-drop ordering kaise store karoge?"',
        choices: [
          'Fractional index — do padosiyon ke beech ka number (2 aur 3 ke beech 2.5), sirf hili hui row likho',
          'Har row ka integer position, aur move par neeche ki sab rows dobara number karo',
          'Linked list ke roop mein prev/next pointers',
          'Created timestamp se sort karo',
        ],
        answer: 0,
        explain: 'Renumbering ek chhote se UI action ko hazaron writes bana deti hai. Fractional indexing ek write mein kaam khatam karti hai (bas kabhi-kabhi rebalance chahiye).',
      },
    ],
  },
  success: [
    'Main live views ko incremental diffs se fresh rakh sakta hoon',
    'Main derived fields ke dependency graph ko samajh kar recompute plan bana sakta hoon',
    'Main ordering ke liye fractional index use kar sakta hoon',
  ],
  homework: `<p>Apne product ki ek "live" screen chuno. Likho: ek update aane par server
    kitna kaam karta hai — <b>ek baar</b>, ya <b>har viewer ke liye ek baar</b>? Agar
    doosra jawab hai, toh socho ki us screen ka diff kaisa dikhega.</p>`,
  cards: [
    { front: 'Incremental view maintenance kya hai?', back: 'Write aane par har live query ko dobara chalane ke bajaye yeh nikalna ki us write se har query ka jawab kaise badla, aur sirf woh diff bhejna.' },
    { front: 'Dependency graph kyun memory mein?', back: 'Formula → rollup → lookup ka chain pointer-chasing kaam hai; har hop par database round trip mehenga padta. Graph RAM mein ho toh recompute seedha chal jaata hai.' },
    { front: 'Fractional indexing?', back: 'Row ko 2 aur 3 ke beech daalo → position 2.5, phir 2.75. Sirf hili hui row likhi jaati hai — neeche ki rows dobara number nahi hoti.' },
    { front: 'Batch primitives kab chahiye?', back: 'Jab change poore column ko chhooye — NOW() wala formula, column type change. Row-by-row update bahut dheema hoga, isliye bulk rewrite operations chahiye.' },
  ],
},
]);

function liveViewModel(k) {
  if (k.model === 0) {
    const work = k.viewers * k.writes;
    return { work, updateMs: Math.min(3000, 40 + work * 8), perWrite: k.viewers, bytes: 'poore result sets' };
  }
  const work = Math.max(1, Math.round(k.writes * 1.4));
  return { work, updateMs: 18 + Math.round(k.viewers / 10), perWrite: 1.4, bytes: 'sirf diffs' };
}

/* =====================================================================
   LEVEL 3 — RUNTIME HI CHHAT THI (Rust rewrite + dual run)
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-air-rust',
  icon: '🦀',
  title: 'Airtable — jab bottleneck hardware nahi, runtime ho',
  badge: 'Rewrite Rishi',
  objectives: [
    'CPU-bound kaam + single-threaded runtime = deadlock jaisa halaat',
    'Ek write thread, N read threads, aur MVCC',
    'Live product ke neeche database badalna: boundary → dual run → diff → cutover',
    'Mehengi storage patli rakho — embeddings alag store mein aur thoda peechhe',
  ],
  lesson: [
    `<h3>🪤 Do shartein jo ek saath poori nahi ho rahi thin</h3>
     <p>Airtable ka engine TypeScript mein tha aur Node.js par chalta tha — yaani
     <b>ek main thread</b>. Kaam CPU-bound tha. Matlab ek core 100% par aur baaki cores
     lagbhag khaali.</p>
     <p>Node mein parallelism ke tareeke hain (alag process/worker), par yahan woh kaam
     nahi karte:</p>
     <pre>Shart 1: poora base memory mein hona chahiye (speed ke liye)
Shart 2: kai cores ko usi memory par kaam karna chahiye

Node mein har worker apni memory mein → base ki DOOSRI copy
   enterprise base kabhi dasiyon GB ka
   aur har edit ab har copy mein bhejni padegi</pre>
     <p class="tip">🎯 Airtable ki apni line: <b>bottleneck hardware nahi tha, programming
     model tha.</b> Jab yeh halat aaye toh bade machine lene se kuch nahi milta.</p>
     <h3>🦀 Rust rewrite — aur engine mein asli database guarantees</h3>
     <p>Airtable ne apne backend ka dil — poora in-memory database — <b>Rust</b> mein
     dobara likha (lagbhag teen saal ka kaam; pehle se chhote Rust hisse production mein
     the, isliye dono ko jodna aata tha).</p>
     <pre>base ka data SHARED MEMORY mein — kai threads saath padh sakte hain
1 write thread      — saare writes ek kram mein
N read threads      — queries parallel
1 dispatcher        — request ko sahi jagah bhejta hai</pre>
     <p>Aur kyunki ab woh sach mein ek database bana rahe the, unhone asli database
     guarantees bhi daalin: <b>transactions with MVCC</b> (readers aur writers ek doosre
     ko block na karein), indexes, foreign key aur uniqueness constraints, aur triggers.</p>
     <h3>✍️ Ek writer, kai readers</h3>
     <p>Do log ek hi cell ek saath badlein toh? Har base ka <b>ek hi write thread</b> hai.
     Har write usi lane se guzarti hai, ek-ek karke. Do edits sach mein ek saath ho hi
     nahi sakte — woh line mein lag jaate hain, aur baad wali jeet jaati hai. Base kabhi
     aadhe-adhoore state mein nahi jaata.</p>
     <p>Aur readers? Woh rukte nahi. MVCC ki wajah se read threads ek <b>consistent
     snapshot</b> par kaam karte rehte hain jabki write chal raha hota hai. Jaan-boojh kar
     chuna gaya batwara: <b>writes serialize (consistency), reads parallel
     (responsiveness)</b>.</p>`,
    `<h3>🔁 Live product ke neeche database badalna</h3>
     <p>Yeh sabse khatarnaak kaam hai jo koi software company kar sakti hai. Naya system
     thoda sa bhi alag vyavhaar kare toh tumhe performance bug nahi milta — tumhe
     <b>corrupt customer data</b> milta hai.</p>
     <pre>1. BOUNDARY   — product aur database ke beech ek layer daalo
                (ek taraf Airtable ki bhasha, doosri taraf database ke operations)
                → product TypeScript mein feature deta raha, naya engine Rust mein banta raha

2. DUAL RUN   — lambe samay tak har operation DONO engines par chala
                dono ke jawab apne aap compare hue
                mismatch mila toh usse samjha gaya

3. FULL DIFF  — tooling ne poore datasets ko lagatar compare kiya

4. CUTOVER    — jab farq bacha hi nahi, tab production traffic</pre>
     <p class="tip">🎯 Yeh wahi pattern hai jo Discord ke migration mein bhi tha aur
     50 TB wale migration mein bhi: <b>purana aur naya saath chalao, jawab compare karo,
     aur tabhi switch karo jab difference zero ho jaaye.</b></p>
     <h3>💾 RAM serving layer hai, durability alag</h3>
     <p>RAM volatile hai — bijli gayi toh sab gaya. Isliye durable copy disk par rehti
     hai; worker ko base ka maalik banne se pehle usse <b>load</b> karna padta hai. Aur
     yahin ek naya bottleneck paida hota hai: base memory mein aane ke baad bahut tez hai,
     par <b>usse memory mein laana</b> mehenga hai. Isliye Airtable ne replication,
     durable logs, snapshots aur faster recovery par kaam kiya — taaki "disk par hai" se
     "serve karne layak hai" ka waqt chhota rahe.</p>
     <h3>🤖 Aur ek naya dabaav: AI agents</h3>
     <p>Purana system insaanon ke hisaab se bana tha: insaan dheere type karta hai, kuch
     edits karta hai, kabhi-kabhi automation chalata hai. Ek agent aisa nahi karta — woh
     hazaron records padhta hai, bahut saare updates karta hai, ghanton chalta hai, aur
     akela nahi aata (organizations agents ka poora bedha chalate hain). <b>Human-scale
     interaction ko machine-scale interaction jhelna pada.</b></p>
     <h3>🧮 Embeddings alag store mein — aur peechhe rehne ki ijazat</h3>
     <p>AI search ke liye har row ka embedding chahiye. Par ek vector row se lagbhag
     <b>10× bada</b> ho sakta hai, aur memory Airtable ka sabse mehenga resource hai —
     yaani har base ki har row par woh keemat lag jaati.</p>
     <p>Isliye: operational data core database mein, embeddings ek alag <b>vector
     database</b> mein (Milvus, kyunki woh self-host ho sakta tha aur data Airtable ke
     apne infra mein rehta). Aur embeddings ko thoda <b>peechhe rehne ki ijazat</b> hai —
     embedding banane ke liye model call chahiye, jo user-facing transaction ke andar
     bahut dheema hai. Core DB strongly consistent, vector store eventually consistent.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Database rewrite ka plan banao',
      instructions: 'Har slot mein ek option chuno. Review par sab options ka tark khulega.',
      brief: `Tumhara in-memory engine CPU-bound hai aur runtime single-threaded. Product
        24×7 chal raha hai aur usme customers ka asli data hai. Tumhe engine badalna hai
        <b>bina data kharab kiye</b> aur <b>bina feature delivery roke</b>.`,
      requirements: [
        'Zero data loss — yeh sabse upar hai',
        'Feature delivery rukni nahi chahiye',
        'Har kadam rollback ho sake',
        'Naye engine ko saare cores use karne chahiye',
      ],
      pass: 10,
      slots: [
        {
          id: 'shape', label: 'Naye engine ka concurrency model', icon: '🧵',
          options: [
            { id: 'one-writer', label: 'Shared memory + 1 write thread + N read threads (MVCC snapshots)', score: 4, why: 'Airtable ka model: writes serialize hone se ordering aur consistency muft milti hai, aur MVCC ki wajah se readers rukte nahi. CPU-bound reads parallel ho jaate hain.' },
            { id: 'multi-writer', label: 'Kai write threads + fine-grained locks', score: -1, why: 'Zyada throughput ka vaada karta hai par deadlocks, lock ordering aur subtle races le aata hai — ek in-memory database ke liye yeh sabse mehenga raasta hai.' },
            { id: 'process', label: 'Kai processes, har ek ke paas base ki apni copy', score: -3, why: 'Yahi woh dead end hai jisne rewrite majboor kiya: dasiyon GB ki copies aur har edit ko har copy tak pahunchana.' },
          ],
        },
        {
          id: 'boundary', label: 'Product aur engine ke beech', icon: '🚪',
          options: [
            { id: 'layer', label: 'Ek abstraction layer — product ek taraf, engine ke operations doosri taraf', score: 3, why: 'Isi ne rewrite ko multi-year feature freeze banne se bachaya: product TypeScript mein chalta raha, engine alag banta raha.' },
            { id: 'direct', label: 'Product seedha naye engine ki API use kare', score: -2, why: 'Tab product aur engine ek saath badalne padte hain — har step par dono teams block.' },
            { id: 'fork', label: 'Product ka fork banao naye engine ke liye', score: -3, why: 'Do codebases, do sach, aur merge ka pahaad. Migration khatam hone se pehle dono alag ho chuke honge.' },
          ],
        },
        {
          id: 'verify', label: 'Kaise bharosa karoge ki naya engine sahi hai', icon: '🔍',
          options: [
            { id: 'dual', label: 'Dual run — har operation dono par, jawab apne aap compare, aur poore dataset ka lagatar diff', score: 4, why: 'Yahi Airtable ne kiya: production traffic tak pahunchne se pehle naya engine wahi workload laakhon baar chala chuka tha aur har mismatch theek ho chuka tha.' },
            { id: 'tests', label: 'Bahut saare unit aur integration tests likho', score: 1, why: 'Zaroori hai par kaafi nahi — asli data ke edge cases test suite mein nahi hote.' },
            { id: 'canary', label: 'Seedha 1% customers par naya engine chala do', score: 0, why: 'Behtar hai big-bang se, par un 1% ka data phir bhi daav par hai. Pehle shadow compare, phir canary.' },
          ],
        },
        {
          id: 'vectors', label: 'AI embeddings kahan rakhoge', icon: '🧮',
          options: [
            { id: 'sep', label: 'Alag vector store mein, aur unhe thoda peechhe rehne do', score: 3, why: 'Vector row se ~10× bada hota hai aur memory sabse mehengi cheez hai. Embedding banane ke liye model call chahiye — woh user-facing transaction mein nahi aa sakta.' },
            { id: 'inline', label: 'Core in-memory database mein hi rakho', score: -3, why: 'Har base ki har row par 10× memory ka bill — yahi cheez poori in-memory architecture ko tod deti.' },
            { id: 'sync', label: 'Alag store mein, par har write ke saath synchronously update karo', score: -1, why: 'Ab har edit ek model call ka intezaar karegi — product turant sust lagega.' },
          ],
        },
      ],
      verdicts: {
        great: '🎉 Yahi Airtable ka plan hai: ek writer + MVCC readers, ek boundary, dual run + diff, aur embeddings alag store mein.',
        ok: '👍 Theek hai, par ek jagah ya to verification kamzor hai ya memory ka bill badh jaayega.',
        bad: '⚠️ Is plan mein ya data daav par hai ya rewrite kabhi khatam nahi hoga.',
      },
    },
    {
      type: 'match',
      title: 'Faisla aur uski wajah',
      pairs: [
        { left: '🦀 Rust engine', right: 'CPU-bound kaam ko saare cores par chalana, bina base ki dusri copy banaye', explain: 'Node ka single thread hi chhat thi; alag process matlab dasiyon GB ki copy.' },
        { left: '✍️ Ek write thread', right: 'Saare writes ek kram mein — base kabhi aadhe state mein nahi', explain: 'Ordering aur consistency muft mein mil jaati hai, conflict resolution ki zaroorat hi nahi.' },
        { left: '👀 MVCC', right: 'Readers ko write ke dauraan bhi consistent snapshot', explain: 'Writes serialize hone ke baad bhi reads parallel rehte hain — responsiveness bachti hai.' },
        { left: '🚪 Abstraction boundary', right: 'Product feature deta raha jabki engine alag banta raha', explain: 'Warna rewrite ek multi-year feature freeze ban jaata.' },
        { left: '🔍 Dual run + diff', right: 'Naye engine ka bharosa production data par, bina risk ke', explain: 'Cutover tabhi hua jab jawabon mein farq bacha hi nahi.' },
        { left: '🧮 Alag vector store', right: 'Mehengi memory ko 10× bade embeddings se bachana', explain: 'Aur unhe eventually consistent rakhna, kyunki embedding ke liye model call chahiye.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — dual run karke engine badlo',
      project: '05-airtable',
      exercise: 'ex3-dual-run',
      goal: 'Purane aur naye engine ko saath chalao, har operation ke jawab compare karo, mismatch dhoondho, phir cutover karo.',
      why: `Lab mein do engines hain: <code>legacy</code> aur <code>next</code>.
        <code>next</code> mein jaan-boojh kar ek chhota bug hai (ek rounding rule alag hai).
        Dual-run mode har operation dono par chalata hai aur diff report banata hai.`,
      steps: [
        { text: 'Dono engines ke saath service chalao.', cmd: 'cd docker-labs/05-airtable && npm start ex3-dual-run', expect: 'ex3-dual-run\n  dual-api → http://localhost:4503  (PRIMARY=legacy · SHADOW=next · COMPARE=on)' },
        { text: '5,000 operations chalao aur diff report dekho.', cmd: 'node tools/dual-run.js --ops 5000', expect: 'primary=legacy   ops: 5000   mismatches: 213   (4.26%)\n  rollup(avg) rounding   ×88    e.g. avg: legacy=26.13 next=26.12\n  empty-cell in sum()    ×125   e.g. sum: legacy=23.37 next=null' },
        { text: 'Dono bug theek karo aur dobara chalao.', cmd: 'node tools/dual-run.js --ops 5000 --fix 1', expect: 'primary=legacy   ops: 5000   mismatches: 0   (0.00%)   ✅ dono engines ka jawab same' },
        { text: 'Ab cutover karo, chalao, aur rollback bhi test karo.', cmd: 'node tools/cutover.js --to next && node tools/dual-run.js --ops 1000 && node tools/cutover.js --to legacy', expect: '{"primary":"next"}\nprimary=next   ops: 1000   mismatches: 0   (0.00%)   ✅\n{"primary":"legacy"}   ← rollback ek flag mein' },
      ],
      observe: {
        q: 'Dual run ne 5,000 operations mein 213 mismatch pakde (rounding + khaali cell). Agar seedha cutover kar dete toh?',
        choices: [
          'Woh 37 galtiyan asli customer data mein likhi jaatin — aur galat value ke saath banaye gaye rollups/formulas ka pata lagana bahut mushkil hota',
          'Kuch nahi hota, 4% bahut kam hai',
          'Service crash ho jaati',
          'Latency badh jaati',
        ],
        answer: 0,
        explain: 'Woh 213 galat jawab asli customer data mein likhe jaate. Isi liye Airtable ne lambe samay tak dual run chalaya: database migration mein galti performance bug nahi, corrupt data hoti hai.',
      },
      lesson: 'Critical system badalne ka niyam: <b>purana aur naya saath chalao, jawab compare karo, aur tabhi switch karo jab farq zero ho jaaye.</b>',
    },
  ],
  interview: {
    title: 'Interview Round — rewrite aur migration',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Kab maanoge ki language/runtime hi bottleneck hai?"',
        choices: [
          'Jab kaam CPU-bound ho, profiling saaf ho, aur runtime us kaam ko cores par baant hi na sake bina data duplicate kiye',
          'Jab benchmark mein doosri language tez dikhe',
          'Jab team nayi language seekhna chahe',
          'Jab latency spike aaye',
        ],
        answer: 0,
        explain: 'Airtable ka case yahi tha: shared bade state par CPU-bound kaam, aur Node ka model us state ko cores mein baant nahi sakta tha.',
      },
      {
        q: 'Interviewer: "Live database ke neeche engine badalna hai. Sabse pehla kadam?"',
        choices: [
          'Product aur database ke beech ek abstraction boundary daalo, taaki dono alag-alag speed se chal sakein',
          'Naya engine banana shuru karo',
          'Feature freeze lo',
          'Naye engine par ek chhota customer chala do',
        ],
        answer: 0,
        explain: 'Boundary ke bina rewrite ya to product ko rok deta hai ya khud kabhi khatam nahi hota.',
      },
    ],
  },
  success: [
    'Main runtime-level bottleneck pehchaan sakta hoon',
    'Main single-writer + MVCC readers wala model samjha sakta hoon',
    'Main dual-run + diff wali safe migration plan kar sakta hoon',
  ],
  homework: `<p>Apne system ka koi critical component chuno jise tum badalna chahte ho.
    Ab likho: agar naya component 0.5% cases mein alag jawab de, toh tumhe kitni der mein
    pata chalega? Agar jawab "shayad kabhi nahi", toh pehle <b>compare</b> ka raasta
    banao, phir switch ka.</p>`,
  cards: [
    { front: 'Airtable ka asli bottleneck kya tha?', back: 'Hardware nahi — programming model. CPU-bound kaam single-threaded Node par tha, aur parallel karne ke liye base ki doosri copy chahiye thi (kabhi dasiyon GB).' },
    { front: 'Naye Rust engine ka concurrency model?', back: 'Shared memory + 1 write thread (saare writes ek kram mein) + N read threads (MVCC snapshot par, rukte nahi) + ek dispatcher. Saath mein indexes, constraints aur triggers.' },
    { front: 'Live database migration ke 4 kadam?', back: '(1) abstraction boundary, (2) dual run — har operation dono engines par + apne aap compare, (3) poore dataset ka lagatar diff, (4) cutover jab farq zero ho.' },
    { front: 'Embeddings alag store mein kyun?', back: 'Ek vector row se ~10× bada hota hai aur memory sabse mehenga resource hai. Alag vector DB (self-hosted), aur eventually consistent — kyunki embedding ke liye model call user-facing transaction mein nahi aa sakti.' },
  ],
},
]);

})();
