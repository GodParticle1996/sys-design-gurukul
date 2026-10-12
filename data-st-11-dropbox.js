/* =====================================================================
   TRACK — 🏢 Real Company Stories · Dropbox: exabyte ko AWS se ghar laana

   Source: "Dropbox Moved 600 PB Off AWS" (Akhil Sharma).
   ⚠️ Video ke kuch numbers aapas mein nahi milte. Public record: Magic Pocket
   2015–16, ~500 PB / ~90% user data move hua; S-1 ke mutabik 2 saal mein infra
   kharcha $74.6M kam. Isliye yahan "video ke mutabik" + gol numbers.
   (🏗️ Poore Systems Banao → Dropbox level product design hai; yeh infra ka
    build-vs-buy hai.) Docker lab: docker-labs/14-dropbox
   ===================================================================== */
(function () {

VISUALS['dropbox-rent-own'] = {
  t: 'Size nahi, shakal faisla karti hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">☁️ Cloud sasta jab…</span>
        <div class="dg-cap">Chhota, anishchit, upar-neeche hota load. Cloud <b>elasticity</b> bechta hai — aur uska margin har GB,
          har CPU-ghante mein chhupa hai.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🏗️ Apna sasta jab…</span>
        <div class="dg-cap">Bahut bada + steady + khaas: capacity pata, growth predictable, access pattern pata. Tab tum us
          elasticity ka paisa de rahe ho jo use hi nahi karte.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">10 PB</span><span class="cmd">cloud $2.8M vs apna $41M</span><span class="q">fixed kharcha (team, DCs, bijli) bahut bada</span></div>
      <div class="dg-rung a"><span class="lv">100 PB</span><span class="cmd">cloud $28M vs apna $50M</span><span class="q">abhi bhi cloud</span></div>
      <div class="dg-rung g"><span class="lv">500 PB</span><span class="cmd">cloud $141M vs apna $90M</span><span class="q">apna — ~$51M/saal bachat (lab 14, khilona model)</span></div>
    </div>`,
};

VISUALS['dropbox-erasure'] = {
  t: '3 copies vs 6+4 tukde',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">📑 3× replication</span>
        <div class="dg-cap">1 GB rakhne ke liye 3 GB disk. Repair sasta: ek copy uthao, likh do. Lab: 60 MB disk, repair 6 MB padha.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🧩 Reed-Solomon 6+4</span>
        <div class="dg-cap">6 data + 4 parity; koi bhi 6 se file wapas; 4 tak kho sakte ho. 1.67× disk. Lab: 33.3 MB,
          4 disks mare → 20/20 bache; par 5 mare → 0/20; repair 20 MB padha.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">🔥 garam data → replication</span>
      <span class="dg-pill gold">🧊 thanda (zyadatar) → erasure coding</span>
      <span class="dg-pill acc">🏠 SMR disks — sirf sequential writes (lab: random = 127× write amplification)</span>
    </div>`,
};

VISUALS['dropbox-magic-migration'] = {
  t: 'Chalte trak ke pahiye badalna — chaar kadam',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Dual write</span><span class="q">naye writes dono jagah; purana (S3) hi sach</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Dual read / shadow compare</span><span class="q">user ko purana jawab, naye se chupchaap milao</span></div>
      <div class="dg-rung a"><span class="lv">3</span><span class="cmd">Backfill</span><span class="q">mahino tak 24/7 purana data copy</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Cutover</span><span class="q">naya primary, purana backup, palatne ka raasta khula → hafton stable → retire</span></div>
    </div>
    <div class="dg-cap">~2.5 saal (2015–17), jab data roz ~1 PB badh raha tha (video ke mutabik). Teams kadam 2 chhod ke ya kadam 3 mein
      jaldi karke fail hoti hain.</div>`,
};

SD.registerLevels('stories', [
/* =====================================================================
   1. dropbox-rent-own
   ===================================================================== */
{
  id: 'dropbox-rent-own',
  icon: '📦',
  title: 'Dropbox — jab sab cloud ki taraf, woh ghar ki taraf',
  badge: 'Kiraya Hisaabi',
  objectives: [
    'Cloud elasticity bechta hai — margin har GB mein',
    'Size nahi, workload ki SHAKAL faisla karti hai',
    'Fixed kharcha aur break-even — lab ke numbers',
    'Asli sawaal: kya hum yeh team bana ke rakh sakte hain?',
  ],
  lesson: [
    `<h3>🏠 Kiraye ka ghar vs apna ghar</h3>
     <p>Kuch mahino ke liye naye sheher mein ho, pata nahi kab tak rukoge — kiraya samajhdaari hai. 30 saal ek hi jagah, family
     badi, pata hai kitne kamre chahiye — tab kiraya har mahine us "kabhi bhi chhod sakte ho" ki keemat hai jo tumhe chahiye hi
     nahi.</p>
     <p>2015 mein sab AWS ki taraf ja rahe the. Dropbox ulta chala. AWS fail nahi hua tha — <b>hisaab</b> tha: unke paimane aur
     unke workload ki <b>shakal</b> par apna metal har saal das-das million dollar bachata hai (aaj ke andaaze $100M+/saal).
     (AWS phir bhi dusri cheezon ke liye; 2022 mein naye regions ke liye AWS badhaya — ek region ke liye Europe mein DC banana
     bekaar.)</p>
     <h3>☁️ Cloud kya bechta hai</h3>
     <p><b>Elasticity</b> — kal 10× chahiye toh mil jaayega. Iska margin har GB aur har CPU-ghante mein pakka hai. Chhota /
     anishchit / upar-neeche → cloud sasta. Bahut bada + steady + khaas (capacity pata, growth predictable, access pattern
     pata) → tum elasticity ka paisa de rahe ho jo use nahi karte.</p>`,
    `<h3>🧮 Hisaab (video ke mutabik)</h3>
     <ul>
       <li>S3 list ~2¢/GB-mahina; aadha exabyte aadhe daam par bhi ≈ $50M/saal <b>sirf pade rehne ka</b>.</li>
       <li>+ <b>egress</b> ~9¢/GB — har rakha byte kabhi na kabhi download hota hai.</li>
       <li>+ per-request PUT/GET/LIST, + replication (chhupa hua), + AWS ka margin.</li>
       <li>Apna banaya ≈ 1/2 se 1/3. <b>Par sirf paimane par</b> — fixed kharche (staff, jagah, bijli contracts, network
       providers) bahut bade volume maangte hain; 10 PB par hisaab ulta.</li>
     </ul>
     <pre>lab 14 (ex3-cost, khilona model — list price × 50% chhoot vs $40M fixed + hardware):
 10 PB  → cloud $2.8M   · apna $41.0M  → CLOUD sasta
100 PB  → cloud $28.2M  · apna $50.0M  → CLOUD sasta
500 PB  → cloud $141.0M · apna $90.1M  → APNA sasta: $50.9M/saal bachat</pre>
     <h3>👷 Asli sawaal: kya tum yeh kar sakte ho?</h3>
     <p>Magic Pocket ek peedhi ka project tha: kai jagah DCs (bijli, redundant fiber), custom hardware, naya storage stack (jo
     S3 karta tha — erasure coding, durability, ops), aadha exabyte live migrate (zero downtime/loss), aur hamesha ki ops team.
     Bachat tabhi jab <b>poora karo</b>; 3 saal baad chhoda = khazana gaya. Unhone Google/Facebook/Microsoft/AWS ki storage teams
     se log liye. Asli sawaal: <b>"kya hum ek multi-year hyperscaler-grade team bana ke tika sakte hain?"</b> — zyadatar companies
     ka jawab <b>nahi</b> hona chahiye.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — rent vs own ka break-even',
      project: '14-dropbox',
      exercise: 'ex3-cost',
      goal: '10, 100, 500 PB par cloud vs apna kharcha — kahan palatta hai?',
      why: `<code>tools/cost.js</code> ek khilona model hai: cloud = video ke list prices × chhoot; apna = $40M/saal fixed + hardware
        (1.67× erasure coding ke saath). Apne numbers daal ke khelo — <b>pattern</b> pakdo, number nahi.`,
      steps: [
        { text: '10 PB aur 500 PB par chalao (default: 30% data har mahine download).', cmd: 'cd docker-labs/14-dropbox && node tools/cost.js --pb 10 && node tools/cost.js --pb 500', expect: '10 PB, egress 30%/mahina, chhoot 50%\n  cloud (S3 + egress) : $2.8M / saal\n  apna (fixed $40M + hardware) : $41.0M / saal\n  → CLOUD sasta: apna banane mein $38.2M / saal zyada\n500 PB …\n  → APNA sasta: $50.9M / saal bachat' },
        { text: 'Ab shakal badlo: sirf 5% data har mahine download ho (egress kam).', cmd: 'node tools/cost.js --pb 500 --egress 0.05', expect: '500 PB, egress 5%/mahina, chhoot 50%\n  cloud (S3 + egress) : $73.5M / saal\n  apna (fixed $40M + hardware) : $90.1M / saal\n  → CLOUD sasta: apna banane mein $16.6M / saal zyada' },
      ],
      observe: {
        q: 'Same 500 PB — par egress 30% se 5% hote hi cloud sasta kyun ho gaya?',
        choices: [
          'Cloud bill ka bada hissa egress tha; kam download = cloud sasta — size same, SHAKAL badli. Isliye faisla size se nahi, workload ki shakal se',
          'Hardware sasta hua',
          'Chhoot badh gayi',
          'Model mein bug',
        ],
        answer: 0,
        explain: 'Dropbox ke users har file kabhi na kabhi download karte hain — unki shakal mein egress bhaari tha.',
      },
      lesson: 'Rent vs own: fixed kharcha ÷ volume vs cloud ka margin. Shakal (steady, pata hua) aur size dono chahiye.',
    },
    {
      type: 'bins',
      title: 'Is workload ke liye — cloud ya apna?',
      instructions: 'Dropbox ka niyam: "jo competitive advantage de use own karo, baaki rent karo."',
      bins: [
        { id: 'cloud', label: '☁️ Cloud (rent)' },
        { id: 'own', label: '🏗️ Apna (own)' },
      ],
      items: [
        { text: 'Exabyte-scale user files, steady growth, pata hua access pattern', bin: 'own', explain: 'Dropbox ka Magic Pocket case.' },
        { text: 'Europe mein ek naya region, abhi chhota', bin: 'cloud', explain: 'Ek region ke liye DC banana bekaar — 2022 mein Dropbox ne AWS badhaya.' },
        { text: 'Black Friday par 10× traffic wala e-commerce frontend', bin: 'cloud', explain: 'Elasticity hi toh chahiye.' },
        { text: 'Startup ka pehla saal, 20 TB', bin: 'cloud', explain: 'Fixed kharcha baantne ko volume nahi.' },
        { text: 'ML experiments, kabhi 1000 GPU, kabhi 0', bin: 'cloud', explain: 'Upar-neeche — cloud ki shakal.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — build vs buy',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Cloud bill $5M/saal hai. Apne data center mein jaayein?"',
        choices: [
          'Pehle shakal dekho (steady vs spiky), fixed kharche (team, DC, bijli) ka hisaab, aur kya hum saalon tak execute kar sakte hain; $5M par aksar cloud + optimization (reserved, tiering) behtar',
          'Haan, apna hamesha sasta',
          'Nahi, cloud hamesha',
          'Hybrid kar do bina hisaab',
        ],
        answer: 0,
        explain: 'Lab: 10 PB par cloud $2.8M vs apna $41M.',
      },
      {
        q: 'Interviewer: "Dropbox ki migration ka sabse bada risk?"',
        choices: [
          'Execution — multi-year project; beech mein chhoda toh sab paisa gaya; hyperscaler-grade team chahiye',
          'AWS naraaz',
          'Hardware delivery',
          'Koi risk nahi',
        ],
        answer: 0,
        explain: 'Bachat sirf poora karne par.',
      },
    ],
  },
  success: [
    'Main cloud ke elasticity margin ko samjha sakta hoon',
    'Main size aur shakal se rent vs own ka faisla kar sakta hoon',
    'Main execution risk ko hisaab mein jod sakta hoon',
  ],
  homework: `<p>Apne cloud bill ki top 3 lines lo. Har ek ke liye: load steady hai ya spiky? Kitna predictable? Agar koi line bahut badi aur
    steady hai, toh use cloud mein hi sasta kaise karoge (reserved capacity, tiering, egress kam)?</p>`,
  cards: [
    { front: 'Cloud kya bechta hai?', back: 'Elasticity — aur uska margin har GB/CPU-ghante mein. Spiky/chhota → cloud sasta; bada + steady + khaas → tum bina use ki elasticity ka paisa dete ho.' },
    { front: 'Rent vs own break-even (lab 14)?', back: '10 PB: cloud $2.8M vs apna $41M; 500 PB: cloud $141M vs apna $90M. Fixed kharcha (team, DC, bijli) ko bada volume chahiye.' },
    { front: 'Dropbox ka asli sawaal?', back: '"Kya hum multi-year hyperscaler-grade team bana ke tika sakte hain?" Bachat sirf poora karne par; zyadatar ka jawab nahi.' },
  ],
},

/* =====================================================================
   2. dropbox-erasure
   ===================================================================== */
{
  id: 'dropbox-erasure',
  icon: '🧩',
  title: 'Erasure coding aur SMR — apna stack, apne jugaad',
  badge: 'Parity Pandit',
  objectives: [
    'Magic Pocket ki layers — har layer ek kaam',
    '3× replication vs Reed-Solomon 6+4 (asli GF(256) lab)',
    'Garam data replication, thanda erasure coding',
    'SMR disks: sirf sequential writes ke liye',
  ],
  lesson: [
    `<h3>🧱 Layers</h3>
     <pre>block storage API → sharded, replicated METADATA (har block kahan hai)
                   → placement → racks of custom storage servers (kai DCs mein)</pre>
     <p>API ko hardware nahi pata, metadata ko placement nahi pata, placement ko machines nahi pata — har layer ek kaam.</p>
     <h3>🧩 3 copies vs 6+4 tukde</h3>
     <p>Replication 3×: 1 GB rakhne ke liye 3 GB disk. <b>Reed-Solomon erasure coding</b>: file ko K data chunks + M parity
     chunks mein; <b>koi bhi K</b> se file wapas; M tak kho sakte ho. Video: K=6, M=4 zones ke paar → 10/6 = <b>1.67×</b>.</p>
     <pre>lab 14 (ex1-erasure) — asli Reed-Solomon, 10 "disks", 20 files × 1 MB:
disk par:  3× replication 60.0 MB (3.00×)   |   6+4 EC 33.3 MB (1.67×)
disks mare | replication | EC
     4     |   16/20     | 20/20
     5     |   14/20     |  0/20     ← EC "sab ya kuch nahi" girta hai → chunks alag ZONES mein
repair (ek disk gayi): replication 6.0 MB padha | EC 20.0 MB padha</pre>`,
    `<h3>🔥🧊 Tiering</h3>
     <p>EC ki keemat: repair mein 6 chunks laao + GF(256) ka hisaab (lab: 6 MB vs 20 MB padha). Isliye <b>garam</b> data (abhi
     likha, baar-baar padha) replication par, <b>thanda</b> (zyadatar) EC par. Aur yeh tabhi mumkin hai jab <b>stack tumhara</b>
     ho — apne K, M, apne zones.</p>
     <h3>🏠 SMR — khaprail wali disk</h3>
     <p>Spinning disks sasti per GB — "likho ek baar, kabhi-kabhi padho" ke liye. <b>SMR</b> (shingled magnetic recording)
     tracks ko chhat ki khaprail ki tarah ek-doosre par chadha deta hai → zyada capacity. Par beech ki track badlo toh uske upar
     ki sab dobara likhni padti hain.</p>
     <pre>lab 14 (ex2-smr) — band 256 tracks, 10,000 writes:
sequential → 1.0 tracks likhi per badlaav
random     → 127.5 tracks likhi per badlaav</pre>
     <p>Dropbox ka data sequential/kabhi nahi badalta → SMR ka nuksaan zero. Custom chassis "Diskotech" SMR ke saath — video ke
     mutabik ~1.4 PB per 4U, off-the-shelf se ~2× density. AWS general-purpose hai (customers random writes karte hain) — woh yeh
     nahi kar sakta.</p>
     <p class="tip">🎯 <b>Apna stack aise jugaad kholta hai jo cloud nahi de sakta</b> (SMR, apne EC parameters).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 3 copies vs 6+4 chunks (asli Reed-Solomon)',
      project: '14-dropbox',
      exercise: 'ex1-erasure',
      goal: '20 files dono tareeke se rakho, 1–5 disks maaro, SHA-256 se check karo kitni bachi; phir repair ka kharcha.',
      why: `<code>lib/rs.js</code> asli Reed-Solomon hai (GF(2⁸), systematic Cauchy matrix) — koi library nahi, ~80 lines.
        <code>services/disks.js</code> 10 "disks" (<code>data/disk-N</code>) chalata hai.`,
      steps: [
        { text: 'Disks chalao.', cmd: 'cd docker-labs/14-dropbox && npm start ex1-erasure', expect: 'ex1-erasure\ndisks → http://localhost:4841   (10 disks: data/disk-0 … disk-9)' },
        { text: 'Durability test.', cmd: 'node tools/durability.js', expect: '  disk par — 3× replication: 60.0 MB (3.00×)   |   6+4 erasure coding: 33.3 MB (1.67×)\n         4 | 16/20                       | 20/20\n         5 | 14/20                       |  0/20\n  3× replication: 6.0 MB   |   6+4 erasure coding: 20.0 MB  (har khoye chunk ke liye 6 chunks padho)' },
      ],
      observe: {
        q: '5 disks mare toh EC ki saari 20 files gayi, replication ki 14 bachi. Toh EC kharab hai?',
        choices: [
          'Nahi — EC 4 tak har file bachata hai par 5 par sab gira deta hai; isliye chunks alag zones mein rakhte hain taaki ek saath 5 girna lagbhag namumkin ho. Jagah 60 → 33 MB',
          'Haan, EC kharab',
          'Replication hamesha behtar',
          'Bug',
        ],
        answer: 0,
        explain: 'Failure domains ke hisaab se chunks bikhero — tab EC jagah bhi bachata hai aur durability bhi deta hai.',
      },
      lesson: 'EC = jagah ki bachat + zone-aware placement. Repair ka kharcha zyada → garam data replication par.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — SMR write amplification',
      project: '14-dropbox',
      exercise: 'ex2-smr',
      goal: 'Shingled disk par sequential vs random writes — ek track badalne par kitni tracks dobara likhni padti hain?',
      why: `<code>tools/smr.js</code>: band = 256 tracks; beech ki track badli toh uske upar chadhi sab dobara. 10,000 writes. Koi server nahi.`,
      steps: [
        { text: 'SMR simulation.', cmd: 'cd docker-labs/14-dropbox && node tools/smr.js', expect: 'band = 256 tracks, 10,000 writes\n  sequential → har 1 track ke badlaav par 1.0 tracks disk par likhi gayi (write amplification)\n  random     → har 1 track ke badlaav par 127.5 tracks disk par likhi gayi (write amplification)' },
        { text: 'Aakhri line padho — SMR ka faayda kitna?', cmd: 'node tools/smr.js | tail -1', expect: '  (normal CMR disk par dono = 1.0 — par SMR mein wahi disk ~20–25% zyada data rakhti hai)' },
      ],
      observe: {
        q: 'AWS apne general S3 fleet par SMR ka yeh faayda kyun nahi utha sakta jaisa Dropbox ne uthaya?',
        choices: [
          'General-purpose customers random writes karte hain — SMR par 127× amplification; Dropbox ka apna data likho-ek-baar hai aur stack unka apna',
          'AWS ke paas SMR nahi',
          'SMR mehenga hai',
          'Kanoon',
        ],
        answer: 0,
        explain: 'Workload ki shakal pata ho toh hardware usi ke liye chuno.',
      },
      lesson: 'Apna stack + pata hua workload = aise hardware jugaad jo shared platform nahi kar sakta.',
    },
  ],
  interview: {
    title: 'Interview Round — durable storage',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Petabytes storage, 3× replication bahut mehenga."',
        choices: [
          'Cold data par erasure coding (jaise 6+4, ~1.67×) failure domains/zones mein bikhra; hot data replication par; repair bandwidth ka budget',
          '2× replication',
          'Compression',
          'Backups hata do',
        ],
        answer: 0,
        explain: 'Lab: 60 → 33.3 MB, 4 disk failure tak sab safe.',
      },
      {
        q: 'Interviewer: "EC ka nuksaan?"',
        choices: [
          'Repair mein K chunks padhne padte hain (zyada network) + CPU; aur M+1 failures par sab gaya — isliye zone placement aur tiering',
          'Koi nuksaan nahi',
          'Read dheema hamesha',
          'Sirf SSD par',
        ],
        answer: 0,
        explain: 'Lab: repair 6 MB (replication) vs 20 MB (EC).',
      },
    ],
  },
  success: [
    'Main replication aur erasure coding ka trade-off lab se samjha sakta hoon',
    'Main hot/cold tiering aur zone placement ka tark de sakta hoon',
    'Main SMR ka faayda aur shart bata sakta hoon',
  ],
  homework: `<p>Lab 14 ke "Khud try karo" #1 karo: <code>K = 10, M = 4</code>. Jagah kitni bachi, repair mein kitna padhna pada, aur 5
    disks marne par kya hua? Is ek number se EC parameters chunne ka sauda likho.</p>`,
  cards: [
    { front: 'Reed-Solomon 6+4?', back: '6 data + 4 parity chunks, koi bhi 6 se file wapas, 4 tak kho sakte ho. 1.67× vs replication 3×. Lab: 4 disks mare → 20/20; 5 → 0/20.' },
    { front: 'EC ki keemat?', back: 'Repair mein 6 chunks padho + GF math (lab: 20 MB vs 6 MB). Isliye garam data replication, thanda EC.' },
    { front: 'SMR?', back: 'Tracks khaprail ki tarah chadhe → zyada capacity; random write = upar ki sab dobara (lab 127×). Sirf likho-ek-baar data ke liye.' },
  ],
},

/* =====================================================================
   3. dropbox-magic-migration
   ===================================================================== */
{
  id: 'dropbox-magic-migration',
  icon: '🚚',
  title: 'Aadha exabyte live migrate — chaar kadam',
  badge: 'Migration Marmagya',
  objectives: [
    'Dual write → shadow read → backfill → cutover',
    'Teams kahan fail hoti hain',
    'Build vs buy har workload ke liye, baar-baar',
    'Paanch sabak',
  ],
  lesson: [
    `<h3>🚂 Chalti train ke pahiye</h3>
     <p>2015–2017, ~2.5 saal, jab data (video ke mutabik) roz ~1 PB badh raha tha. Na downtime, na loss:</p>
     <ol>
       <li><b>Dual write</b> — naye writes dono jagah; purana (S3) hi sach.</li>
       <li><b>Dual read / shadow compare</b> — user ko purana jawab, naye se chupchaap milao; farq log karo.</li>
       <li><b>Backfill</b> — jobs S3 scan karke purana data copy karein — mahino, 24/7.</li>
       <li><b>Cutover</b> — naya primary, purana backup, <b>wapas palatne ka raasta</b> khula → hafton stable → dual write band →
       purana retire.</li>
     </ol>
     <p>Teams fail hoti hain jab <b>kadam 2</b> chhod dete hain (naye system par bharosa bina saboot ke) ya <b>kadam 3</b> mein
     jaldi karte hain (backfill ne production ko dabaya ya kuch chhoota). (Wahi anushasan jo 💾 Data → Migrations aur
     📺 YouTube ki live resharding mein.)</p>`,
    `<h3>🧭 Build vs buy — har workload, baar-baar</h3>
     <p>Dropbox ne sab kuch ghar nahi laaya: storage <b>build</b>; naye regions <b>buy</b>; metadata/search/pipelines/ML mix.
     Niyam: <b>"jo competitive advantage de use own karo, baaki sab rent karo"</b> — aur yeh faisla samay ke saath dobara karo.</p>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Size se zyada <b>shakal</b> maayne rakhti hai.</li>
       <li>Cloud elasticity ka paisa leta hai.</li>
       <li>Faisla per workload, aur dobara-dobara.</li>
       <li>Infra projects migration mein marte hain — transition ka budget rakho.</li>
       <li>Apna stack aise optimizations kholta hai jo cloud nahi de sakta (SMR, apne EC parameters).</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Magic Pocket migration — sahi kram',
      instructions: 'Aadha exabyte S3 se apne storage par, bina downtime.',
      steps: [
        { text: 'Naya storage stack khada karo, chhote test data par jalao', explain: 'Pehle naya ghar mazboot ho.' },
        { text: 'Dual write: naye writes dono jagah, S3 hi source of truth', explain: 'Aage ka data dono jagah — purana sach.' },
        { text: 'Shadow read: user ko S3 ka jawab, naye se chupchaap compare', explain: 'Bharosa saboot se — yeh kadam chhodna sabse aam galti.' },
        { text: 'Backfill: purana data mahino tak copy, throttle ke saath', explain: 'Production ko dabaye bina, 24/7.' },
        { text: 'Cutover: naya primary, S3 backup, palatne ka raasta khula', explain: 'Risky kadam tab jab saboot jama ho.' },
        { text: 'Hafton stable → dual write band → S3 retire', explain: 'Wapas jaane ka raasta tab band karo jab zaroorat na rahe.' },
      ],
    },
    {
      type: 'incident',
      title: '🚨 Backfill ke beech — "downloads dheeme hain"',
      instructions: 'Migration ke teesre mahine. Sahi kadam chuno.',
      pager: `<b>#storage-migration</b> — 11:20 AM<br>
        Users ke downloads ka p99 800 ms se 4 sec ho gaya.<br>
        Backfill jobs abhi 40 Gbps par S3 se copy kar rahe hain, naye storage ke disks 95% busy.<br>
        Shadow compare mein 0.02% mismatches — kal tak 0 tha.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Backfill ko throttle/pause karo — user traffic pehle', good: true, next: 'mismatch', explain: 'Backfill user-facing traffic ke saath disks share kar raha hai. Bleeding roko — backfill kal bhi ho sakta hai, user ka download abhi.' },
            { t: 'Cutover jaldi kar do taaki backfill khatam ho', good: false, explain: 'Mismatches badh rahe hain aur disks bhare hain — ab cutover sabse bada risk.' },
            { t: 'Aur disks mangwao', good: false, explain: 'Hafton lagenge. Abhi user dukhi hain.' },
            { t: 'Shadow compare band karo taaki load kam ho', good: false, explain: 'Saboot ka ekmaatra source band — andhe ho jaoge.' },
          ],
        },
        mismatch: {
          sitrep: '✅ Backfill 10 Gbps par throttle. Download p99 wapas 900 ms.',
          text: 'Ab 0.02% mismatches ka kya?',
          choices: [
            { t: 'Cutover roko; mismatched objects ki list nikaalo, pattern dhoondho (kaunsi write path/size/time), fix karke dobara compare', good: true, next: 'fix', explain: 'Shadow read isi ke liye hai — cutover se pehle galti pakadna.' },
            { t: '0.02% chhota hai, ignore karo', good: false, explain: 'Aadhe exabyte ka 0.02% = bahut saari files. Dropbox ka vaada "kabhi mat khoo" hai.' },
            { t: 'S3 ko dobara primary banao hamesha ke liye', good: false, explain: 'Bahut jaldi haar. Pehle wajah dhoondho.' },
          ],
        },
        fix: {
          text: 'Aage ke liye kya lagaoge?',
          choices: [
            { t: 'Backfill ka automatic throttle user latency ke hisaab se + mismatch rate par cutover gate (0 ho tabhi aage)', good: true, next: 'end', explain: 'Backfill "background" hai — use user traffic ke aage jhukna chahiye. Aur cutover ek data-driven gate ho, calendar nahi.' },
            { t: 'Backfill raat ko hi', good: false, explain: 'Global users — koi "raat" nahi. Latency-based throttle behtar.' },
          ],
        },
        end: {
          end: true,
          text: 'Downloads theek, mismatches ki wajah mili, cutover gate laga.',
          summary: `<b>Seekh:</b> Migration ka backfill "background" kaam hai — use user traffic ke aage jhukna chahiye.
            <br><br>• <b>Throttle</b> user latency/disk busy par apne aap.
            <br>• <b>Shadow compare</b> hi cutover ka saboot — mismatch 0 ho tabhi aage.
            <br>• <b>Cutover gate</b> number se tay ho, calendar se nahi — aur palatne ka raasta khula rahe.`,
        },
      },
    },
  ],
  interview: {
    title: 'Interview Round — live storage migration',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "500 PB ek storage se doosre mein, bina downtime — plan?"',
        choices: [
          'Dual write → shadow read compare → throttled backfill → gated cutover (palatne ka raasta) → stable → retire',
          'Ek weekend maintenance window',
          'Sab copy karke switch',
          'Naye users naye storage par, purane purane par hamesha',
        ],
        answer: 0,
        explain: 'Dropbox ka 2.5 saal ka raasta.',
      },
      {
        q: 'Interviewer: "Shadow read ka kya faayda jab user ko purana jawab hi milta hai?"',
        choices: [
          'Naye system par bina user risk ke saboot — mismatch pakadna, latency naapna — cutover se pehle',
          'Koi faayda nahi',
          'Cache garam karna',
          'Load test',
        ],
        answer: 0,
        explain: 'Yeh kadam chhodna sabse aam wajah hai migrations ke fail hone ki.',
      },
    ],
  },
  success: [
    'Main live storage migration ke chaar kadam sahi kram mein bata sakta hoon',
    'Main backfill ko user traffic ke aage jhukna sikhana samjha sakta hoon',
    'Main build vs buy ko per-workload faisla ki tarah dekh sakta hoon',
  ],
  homework: `<p>Apne kisi pichhle ya aane wale migration ke liye likho: dual write kahan, shadow compare kaise naapoge (kaunsa mismatch
    metric), backfill ka throttle kis signal par, aur cutover gate kya hoga (number, date nahi).</p>`,
  cards: [
    { front: 'Magic Pocket migration ke kadam?', back: 'Dual write (S3 sach) → shadow read compare → backfill (mahino, throttled) → cutover (palatne ka raasta) → stable → retire.' },
    { front: 'Migrations kahan fail hoti hain?', back: 'Shadow compare chhod ke (bina saboot bharosa) ya backfill mein jaldi (production dabaya / data chhoota).' },
    { front: 'Dropbox ka build vs buy niyam?', back: 'Jo competitive advantage de use own karo, baaki rent — har workload ke liye, samay ke saath dobara.' },
  ],
},
]);

})();
