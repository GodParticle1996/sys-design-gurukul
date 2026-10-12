/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Discord

   Source: "DISCORD Stores 1 TRILLION Messages! Here's How." (Akhil Sharma)
   + Discord ke apne engineering posts (Cassandra se ScyllaDB migration,
   data services layer).

   3 levels:
     st-discord-model   — kabhi delete mat karo · channel se partitioning
     st-discord-hot     — hot partition, retry amplification, GC, coalescing
     st-discord-migrate — ScyllaDB par live migration aur uski keemat
   ===================================================================== */
(function () {

VISUALS['st-discord-model'] = {
  t: 'Ek sawaal ke liye bana data model',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc" data-hs="q">❓ "is channel ke latest messages do"</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="part">🗂️ partition key = channel</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="clust">🔢 clustering = message id (waqt)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">1 query · 1 partition · 1 node</span>
    </div>
    <div class="dg-cap">Data model = schema + access pattern ek saath. Storage usi sawaal ke
      aas-paas banaya gaya jo din mein hazaron baar poochha jaata hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box is-good"><span class="bx-label">✅ Co-location</span>
        <div class="dg-cap">Channel kholna = ek node ki ek partition. Na fan-out, na join.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Append-friendly</span>
        <div class="dg-cap">Messages sirf jud-te hain — update lagbhag kabhi nahi,
          delete kabhi nahi. Engine ko in-place rewrite karna hi nahi padta.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Linear scaling</span>
        <div class="dg-cap">Node jodo, data redistribute, capacity badhi — theory mein
          hamesha ke liye.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🪤 Andar chhupi maanyata</span>
        <div class="dg-cap">"Traffic channels par lagbhag barabar bata hoga."
          Asli Discord par: zyadatar channels chup, aur kuch channels par
          <b>ek saath laakhon log</b>.</div></div>
    </div>`,
};

VISUALS['st-discord-hot'] = {
  t: 'Hot partition aur uske do ilaaj',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">1</span><span class="cmd">ek channel viral</span><span class="q">us channel ki poori partition ek node par hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">2</span><span class="cmd">node dheema</span><span class="q">requests jama hone lagti hain, timeouts shuru</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">3</span><span class="cmd">clients RETRY</span><span class="q">doob-te node par aur load — amplification</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">4</span><span class="cmd">GC pause</span><span class="q">Java engine ka apna freeze, oopar se</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">5</span><span class="cmd">poore cluster mein latency</span><span class="q">ek channel ke "bade din" se network-wide slowdown</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🧲 Ilaaj 1 — request coalescing</span>
        <div class="dg-flow">
          <span class="dg-pill">10,000 requests</span><span class="dg-arrow">→</span>
          <span class="dg-pill acc" data-hs="ds">🦀 data services (Rust)</span><span class="dg-arrow">→</span>
          <span class="dg-pill good" data-hs="one">1 query</span>
        </div>
        <div class="dg-cap">Consistent hashing se ek channel ki saari requests ek hi
          instance par — tabhi unhe <b>merge</b> kiya ja sakta hai.</div></div>
      <div class="dg-box is-good"><span class="bx-label">⚙️ Ilaaj 2 — engine badlo</span>
        <div class="dg-cap">ScyllaDB: wahi query language, par C++ (GC nahi) aur
          <b>shard-per-core</b> — har core ka apna data aur memory.</div></div>
    </div>
    <div class="dg-cap">Do alag problem, do alag ilaaj: <b>traffic</b> ka ilaaj database
      ke aage, aur <b>engine</b> ka ilaaj database ke andar.</div>`,
};

VISUALS['st-discord-migrate'] = {
  t: '1 trillion messages, zero downtime',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">step 1</span><span class="cmd">DUAL WRITES</span><span class="q">har naya message dono databases mein — "abhi" sambhal gaya</span></div>
      <div class="dg-rung"><span class="lv">step 2</span><span class="cmd">backfill</span><span class="q">purana itihaas — off-the-shelf tool par 3 MAHINE ka anumaan</span></div>
      <div class="dg-rung g"><span class="lv">step 3</span><span class="cmd">apna migrator (Rust)</span><span class="q">bade contiguous ranges, high concurrency, aur progress ka CHECKPOINT</span></div>
      <div class="dg-rung g"><span class="lv">natija</span><span class="cmd">~32 lakh messages/second</span><span class="q">3 mahine ka kaam ~9 din mein</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">📉 Pehle → baad mein</span>
        <div class="dg-cap">177 Cassandra nodes → <b>72</b> ScyllaDB nodes (har node
          dogune se zyada data ke saath) · tail read latency 40–125 ms ke jhoole se
          <b>~50 ms</b> sthir · worst-case write <b>~5 ms</b>.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🧾 Keemat</span>
        <div class="dg-cap">Storage hamesha badhta rahega · data model 2017 se
          <b>tay</b> ho chuka tha (isliye Cassandra-compatible engine hi chun sakte the) ·
          aur coalescing layer ab hamesha ke liye unki zimmedari hai.</div></div>
    </div>`,
};

/* =====================================================================
   LEVEL 1 — EK SAWAAL KE LIYE BANA MODEL
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-discord-model',
  icon: '🗂️',
  title: 'Discord — "kabhi delete mat karo" ka poora bill',
  badge: 'Partition Pandit',
  objectives: [
    'Ek product faisla jo har technical faisle ka baap ban gaya',
    'Partition key = woh sawaal jo tum baar-baar poochhte ho',
    'Co-location, append-friendly writes, linear scaling — teen faayde',
    'Har data model ke andar ek chhupi maanyata hoti hai',
  ],
  lesson: [
    `<h3>🗃️ Ek faisla: message kabhi delete nahi hoga</h3>
     <p>Zyadatar chat products messages ko <b>kshanik</b> maante hain — purane messages
     archive ho jaate hain ya chupchap hat jaate hain. Discord ne ulta chuna: tumne jo
     bhi bheja, har server aur har channel mein, <b>sab abhi bhi wahin hai</b>, turant
     searchable, aur pehle message tak scroll karne layak.</p>
     <p>Yeh chhota product detail nahi hai. Iska matlab hai ki Discord ek messaging system
     nahi chala raha — woh <b>duniya ke sabse tezi se badhte databases mein se ek</b>
     chala raha hai: ek trillion messages paar, roz arabon naye, aur kuch bhi kabhi
     nahi hataya jaata.</p>
     <h3>📜 Do migrations — aur kahani ka spine</h3>
     <pre>2015: MongoDB, ek replica set — chhoti team ke liye bilkul sahi
      end-2015: ~10 crore messages, data + index memory mein aana band,
                latency anpredictable

2017: Cassandra — kitaabi sahi faisla
      bahut saare writes · sirf badhta data · node jodo, capacity badhao ·
      koi single point of failure nahi. Shuruaat: 12 nodes.

… 12 → dozens → ~100 → 177 nodes, aur team ki zindagi firefighting</pre>
     <p class="tip">🎯 Video ki spine line: <b>jo database tumhe ek arab rows tak le
     jaata hai, woh lagbhag kabhi wahi nahi hota jo ek trillion par tikta hai.</b>
     MongoDB shuruaat ke liye sahi tha, Cassandra scaling ke liye sahi tha — aur dono
     hamesha ke liye sahi nahi the.</p>`,
    `<h3>🗂️ Model ko ek hi sawaal ke liye banao</h3>
     <p>Discord se sabse zyada poochha jaane wala sawaal ek hi hai:
     <b>"is channel ke sabse naye messages do."</b> Isliye storage usi ke aas-paas bana:</p>
     <pre>PARTITION KEY   =  channel   (aur waqt ke buckets mein bata hua)
CLUSTERING KEY  =  message id — jisme waqt encoded hai, naya pehle</pre>
     <p>Matlab: ek query, ek partition, ek node — aur naye messages seedha upar se.</p>
     <table>
       <tr><th>Faayda</th><th>Kya milta hai</th></tr>
       <tr><td><b>Co-location</b></td><td>Channel kholna — product ka sabse aam kaam, jo din mein hazaron baar hota hai — database ka sabse sasta kaam ban gaya. Na fan-out, na cross-machine join.</td></tr>
       <tr><td><b>Append-friendly</b></td><td>Messages sirf jud-te hain; purane ko update karna lagbhag kabhi nahi hota aur delete kabhi nahi. Cassandra isi shakal ke liye bana hai — writes sasti appends, koi mehenga in-place rewrite nahi.</td></tr>
       <tr><td><b>Linear scaling</b></td><td>Capacity chahiye? Node jodo, data redistribute ho jaata hai. Na re-architecting, na data model badalna.</td></tr>
     </table>
     <h3>🪤 Har model ke andar ek maanyata chhupi hoti hai</h3>
     <p>Is design ke andar ek maanyata thi: <b>traffic channels par lagbhag barabar bata
     hoga</b>. Har channel thoda active, har partition lagbhag ek jaisi, har node par
     lagbhag barabar bhaar.</p>
     <p>Asli Discord aisa nahi chalta. Zyadatar channels chup rehte hain, aur kuch
     channels — game launch ke waqt ka public server, kisi celebrity ki community, koi
     viral moment — par <b>laakhon log ek saath</b> padhte aur likhte hain.</p>
     <p class="tip">🎯 Jab bhi koi data model dekho, poochho: <b>iske kaam karne ke liye
     kya sach hona chahiye?</b> Wahi vaakya tumhara agla outage hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Yeh model kis cheez ke liye bana hai?',
      instructions: 'Har operation ko sahi dabbe mein daalo — is model par woh sasta hai ya mehenga?',
      bins: [
        { id: 'cheap', label: '✅ Is model par sasta' },
        { id: 'costly', label: '❌ Is model par mehenga' },
      ],
      items: [
        { text: 'Ek channel ke latest 50 messages dikhao', bin: 'cheap', explain: 'Ek partition, ek node, clustering order pehle se sahi — yahi woh sawaal hai jiske liye model bana.' },
        { text: 'Naya message likho', bin: 'cheap', explain: 'Append — Cassandra/Scylla writes isi shakal ke liye sabse achhe hain.' },
        { text: 'Poore server par "kisne sabse zyada messages bheje" nikalo', bin: 'costly', explain: 'Yeh dusre axis (user) par sawaal hai — partition key channel hai, isliye poora scan ya alag table chahiye.' },
        { text: 'Ek viral channel ke latest messages, laakhon logon ko ek saath', bin: 'costly', explain: 'Sab ek hi partition aur ek hi node par — hot partition.' },
        { text: 'Kisi purane message ko edit karo', bin: 'costly', explain: 'Model append ke liye bana hai; random update us shakal se ulta hai (isliye Discord mein woh rare bhi hai).' },
        { text: 'Aur capacity chahiye — node jodo', bin: 'cheap', explain: 'Linear scaling: data redistribute ho jaata hai, model wahi rehta hai.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Partition key lab',
      instructions: 'Partition key aur traffic skew badlo. Dekho kaunsa model kab tootta hai.',
      goal: 'Aisi setting dhoondho jahan sabse bhaari node par load <b>25% se kam</b> ho aur channel kholne mein <b>2 se zyada partitions</b> na chhuni padein.',
      scenario: `10,000 channels, ek node par lagbhag 1,000 partitions. Traffic bahut
        uneven hai — kuch channels par bhaari bheed.`,
      knobs: [
        { id: 'skew', label: 'Sabse bade channel ka traffic hissa', min: 1, max: 60, step: 1, value: 45, unit: '%',
          note: 'Game launch ya viral moment par ek channel poora traffic kha sakta hai.' },
        { id: 'key', label: 'Partition key (0 = channel · 1 = channel + time bucket · 2 = random hash)', min: 0, max: 2, step: 1, value: 0, unit: '',
          note: 'Time bucket ek bade channel ko kai partitions mein baant deta hai.' },
        { id: 'buckets', label: 'Ek channel ke kitne time buckets active rehte hain', min: 1, max: 12, step: 1, value: 1, unit: '',
          note: 'Zyada buckets = load bata, par ek page ke liye zyada partitions.' },
      ],
      readouts: k => {
        const m = partitionModel(k);
        return [
          { label: 'Sabse bhaari node par load', value: m.hotPct + '%', tone: m.hotPct <= 25 ? 'ok' : 'bad' },
          { label: 'Ek page ke liye partitions', value: m.partsPerRead + '', tone: m.partsPerRead <= 2 ? 'ok' : 'bad' },
          { label: 'Latest messages ka order', value: m.ordered ? 'seedha mil jaata hai' : 'merge karna padta hai', tone: m.ordered ? 'ok' : 'warn' },
          { label: 'Hot partition ka khatra', value: m.hotPct > 25 ? 'zyada' : 'kam', tone: m.hotPct > 25 ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = partitionModel(k);
        return [
          { label: 'Hot node load', pct: Math.min(100, m.hotPct), text: m.hotPct + '%', tone: m.hotPct <= 25 ? 'ok' : 'bad' },
          { label: 'Partitions per read', pct: Math.min(100, (m.partsPerRead / 12) * 100), text: m.partsPerRead + '', tone: m.partsPerRead <= 2 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = partitionModel(k);
        if (k.key === 2) return { ok: false, text: `Random hash se load to barabar ho gaya, par ab ek channel ke messages har jagah bikhre hain — ek page ke liye <b>${m.partsPerRead}</b> partitions chhuni padti hain aur order merge karna padta hai. Product ka sabse aam kaam mehenga ho gaya.` };
        if (m.hotPct > 25) return { ok: false, text: `Sabse bhaari node par <b>${m.hotPct}%</b> traffic hai. Ek channel ki poori partition ek node par hai — yahi hot partition hai.` };
        if (m.partsPerRead > 2) return { ok: false, text: `Load to bata (<b>${m.hotPct}%</b>), par ek page ke liye <b>${m.partsPerRead}</b> partitions padhni pad rahi hain. Buckets thode kam karo.` };
        return { ok: true, text: `Balance mil gaya: channel + time bucket se load <b>${m.hotPct}%</b> par aa gaya aur ek page ke liye sirf <b>${m.partsPerRead}</b> partitions chahiye.` };
      },
      check: k => { const m = partitionModel(k); return m.hotPct <= 25 && m.partsPerRead <= 2; },
      lesson: `Partition key do cheezein ek saath tay karta hai: <b>ek read kitni jagah
        chhoo-egi</b> aur <b>load kitna barabar bantega</b>. Dono ko ek saath khush karna
        hi asli design hai.`,
      quiz: {
        q: 'Random hash partitioning load barabar kar deta hai. Discord ne usse kyun nahi chuna?',
        choices: [
          'Kyunki tab "is channel ke latest messages" wali sabse aam query kai partitions se data laakar merge karti — product ka sabse sasta kaam sabse mehenga ban jaata',
          'Kyunki hashing slow hai',
          'Kyunki Cassandra hash support nahi karta',
          'Kyunki messages ka order kho jaata',
        ],
        answer: 0,
        explain: 'Har partitioning scheme ka faisla access pattern se hota hai. Discord ka access pattern "ek channel, latest pehle" hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — partition key ka asar',
      project: '07-discord',
      exercise: 'ex1-partition-key',
      goal: 'Teen partition schemes par wahi workload chala kar dekho: reads kitni jagah jaate hain aur load kitna uneven hota hai.',
      why: `Lab mein ek chhota partitioned store hai (8 "nodes"). Tum
        <code>KEY=channel|channel-time|hash</code> badal sakte ho aur ek skewed traffic
        pattern chala sakte ho.`,
      steps: [
        { text: 'Store chalao (8 nodes, 10,000 channels, KEY=channel).', cmd: 'cd docker-labs/07-discord && npm start ex1-partition-key', expect: 'ex1-partition-key\n  store → http://localhost:4701  (8 nodes · 10,000 channels · KEY=channel)' },
        { text: 'Skewed traffic chalao (ek channel par 45% load).', cmd: 'node tools/skew.js --hot-share 45 --requests 3000', expect: 'KEY=channel       hottest node: 52.4% of load   p99: 571 ms   partitions per read: 1' },
        { text: 'Hash (message id) par switch karo.', cmd: 'KEY=hash npm start ex1-partition-key && node tools/skew.js --hot-share 45 --requests 3000', expect: 'KEY=hash          hottest node: 12.5% of load   p99: 3489 ms   partitions per read: 8' },
        { text: 'Ab channel + time bucket.', cmd: 'KEY=channel-time BUCKETS=4 npm start ex1-partition-key && node tools/skew.js --hot-share 45 --requests 3000', expect: 'KEY=channel-time  hottest node: 18.5% of load   p99: 324 ms   partitions per read: 2' },
      ],
      observe: {
        q: 'Hash partitioning ne load sabse achha bata, phir bhi woh sahi jawab kyun nahi hai?',
        choices: [
          'Kyunki har page ab 8 partitions se merge hota hai — sabse aam query ka kharcha 8 guna ho gaya',
          'Kyunki hash slow hai',
          'Kyunki data duplicate ho jaata hai',
          'Kyunki order galat aata hai aur theek nahi ho sakta',
        ],
        answer: 0,
        explain: 'Partitioning ka faisla hamesha do taraf se dekho: load ka batwara aur read ka kharcha.',
      },
      lesson: 'Partition key chunte waqt dono sawaal saath poochho: <b>load kitna barabar bantega</b> aur <b>ek aam read kitni partitions chhoo-egi</b>.',
    },
  ],
  interview: {
    title: 'Interview Round — data modelling',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Messages store karne ka data model batao."',
        choices: [
          'Partition key = channel (bade channels ke liye time bucket ke saath), clustering key = time-ordered message id — taaki sabse aam query ek partition se poori ho',
          'Ek hi table, primary key message id, aur channel par index',
          'User se partition karo, kyunki users zyada hain',
          'Random hash se partition karo taaki load barabar rahe',
        ],
        answer: 0,
        explain: 'Data model us sawaal ke aas-paas banta hai jo tum sabse zyada poochhte ho — aur skew ke liye ek escape hatch (time bucket) saath rakho.',
      },
      {
        q: 'Interviewer: "Tumhare data model ki chhupi maanyata kya hai?"',
        choices: [
          'Yeh ki traffic partitions par lagbhag barabar bata hoga — jo asli duniya mein aksar galat hota hai',
          'Yeh ki data kabhi delete nahi hoga',
          'Yeh ki nodes kabhi fail nahi honge',
          'Yeh ki queries hamesha index use karengi',
        ],
        answer: 0,
        explain: 'Har partitioned design ke andar "even distribution" wali maanyata hoti hai. Uske galat hone ka naam hai hot partition.',
      },
    ],
  },
  success: [
    'Main partition key ko access pattern se jod kar chun sakta hoon',
    'Main kisi bhi data model ki chhupi maanyata likh sakta hoon',
    'Main load balance aur read cost ke beech ka trade samajh gaya hoon',
  ],
  homework: `<p>Apne sabse bade table ka partition/shard key likho. Ab ek vaakya likho jo
    is roop mein ho: "yeh model tab tak theek hai jab tak ______ sach rahe." Phir poochho:
    aaj woh vaakya kitna sach hai?</p>`,
  cards: [
    { front: 'Discord ka core product faisla?', back: 'Message kabhi delete nahi hoga — sab kuch turant available. Isi se woh ek trillion+ messages wala, roz arabon badhta database chalate hain.' },
    { front: 'Discord ka partition/clustering key?', back: 'Partition = channel (time buckets ke saath), clustering = message id jisme waqt encoded hai. Isliye "latest messages" = ek query, ek partition, ek node.' },
    { front: 'Is model ke teen faayde?', back: 'Co-location (sabse aam kaam sabse sasta), append-friendly writes (koi in-place rewrite nahi), aur linear scaling (node jodo, data redistribute).' },
    { front: 'Us model ki chhupi maanyata?', back: 'Ki traffic channels par lagbhag barabar bata hoga. Asli duniya mein zyadatar channels chup aur kuch par laakhon log — yahi hot partition banata hai.' },
  ],
},
]);

function partitionModel(k) {
  if (k.key === 2) return { hotPct: 13, partsPerRead: 8, ordered: false };
  if (k.key === 0) return { hotPct: Math.max(12, k.skew), partsPerRead: 1, ordered: true };
  const hotPct = Math.max(12, Math.round(k.skew / k.buckets));
  return { hotPct, partsPerRead: Math.min(12, Math.max(1, Math.round(k.buckets / 2))), ordered: true };
}

/* =====================================================================
   LEVEL 2 — HOT PARTITION aur COALESCING
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-discord-hot',
  icon: '🔥',
  title: 'Discord — jab ek channel poora cluster le doobe',
  badge: 'Hotspot Haavi',
  objectives: [
    'Hot partition ka mechanism aur retry amplification',
    'GC pause — doosra, chhupa hua stall',
    'Request coalescing: 10,000 requests → 1 query',
    'Consistent hash routing ke bina coalescing kaam hi nahi karti',
  ],
  lesson: [
    `<h3>🔥 Ek channel ka bada din, poore cluster ka bura din</h3>
     <p>Model kehta tha: ek channel ka sab kuch ek partition mein, aur woh partition ek
     node par. Jab koi channel viral hota hai, uska poora bhaar <b>ek</b> node par aa
     jaata hai jabki uske padosi lagbhag khaali baithe hain. Isi ka naam hot partition
     hai.</p>
     <p>Aur hot partition chupchap fail nahi hota:</p>
     <pre>node dheema  →  requests jama  →  timeouts  →  clients RETRY
            →  doob-te node par AUR load  →  latency uske padosi resources tak
            →  poore system mein spikes</pre>
     <p>Engineers ko system-wide slowdown ka page milta tha, aur jaanch ke baad kaaran
     nikalta tha: <b>ek channel ka bada moment</b>.</p>
     <h3>🧊 Aur upar se: garbage collection</h3>
     <p>Cassandra Java mein hai. Discord ke paimane par garbage collector beech-beech mein
     node ko <b>rok</b> deta tha. Ab do alag-alag, unpredictable stalls ek doosre ke upar
     baith gaye: hot partition wale spikes aur GC wale pauses.</p>
     <p>Is dard ke saath Discord 177 Cassandra nodes tak pahunch gaya, aur team ka bada
     hissa sirf firefighting kar raha tha. Jo cheez "linear scale" karne wali thi, woh
     rozana ki emergency ban chuki thi.</p>
     <p class="tip">🎯 Yaad rakho: <b>average case nahi, worst case tumhari architecture
     tay karta hai</b> — kyunki is paimane par rare event kahin na kahin har waqt ho raha
     hota hai.</p>`,
    `<h3>🧲 Sabse zaroori insight: sirf database problem nahi thi</h3>
     <p>Pehla reflex hota hai — database badlo. Discord ne rukk kar socha: <b>traffic
     database se takra kaise raha hai</b>, woh bhi to problem hai. Duniya ka sabse achha
     database bhi tab dabega jab 10 lakh log ek hi channel ka data ek hi pal mein
     maangein.</p>
     <p>Isliye storage engine chhune se <b>pehle</b> unhone database ke aage ek layer
     lagayi — <b>data services layer</b> — aur uska sabse bada hathiyaar hai
     <b>request coalescing</b>:</p>
     <pre>Bina coalescing: 10,000 log ek popular channel kholte hain
                 →  10,000 ek jaisi queries, ek hi hot partition par

Coalescing ke saath: layer dekhti hai ki sab ek hi cheez maang rahe hain
                 →  DATABASE par 1 query
                 →  jawab aane par 10,000 waiting requests ko wahi jawab</pre>
     <p>Par yeh tabhi mumkin hai jab ek channel ki saari requests <b>ek hi jagah</b>
     pahunchein. Isliye routing <b>consistent hashing</b> par channel id se hoti hai —
     har channel ki request hamesha usi data-service instance par, jahan unhe merge kiya
     ja sake.</p>
     <h3>🦀 Aur yeh layer Rust mein kyun</h3>
     <p>Java nahi, Go bhi nahi — <b>Rust</b>. Wajah seedhi thi: Java ke GC pauses se woh
     itna jal chuke the ki unhe aisi language chahiye thi jisme garbage collector hai hi
     nahi, jahan concurrency par poora control ho, aur hot path ke beech mein koi random
     pause na aaye.</p>
     <p>Natija: viral channel ab database par hazaar guna spike nahi banata — lagbhag
     <b>ek</b> query banata hai, chahe kitne log dekh rahe hon.</p>
     <p class="tip">🎯 Yeh "dabaav mein achhi engineering" ka udaharan hai: unhone database
     ko doshi nahi thehraya, balki <b>do alag sawaal</b> alag kiye — "data kaise store
     karein" aur "traffic storage tak kaise pahunche" — aur doosre ka ilaaj alag se
     kiya.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — coalescing ka asar',
      goal: 'Numbers se dekho ki ek layer kitna kaam gayab kar deti hai.',
      problems: [
        {
          q: 'Ek viral channel ko ek hi second mein 10,000 log kholte hain. Bina coalescing ke database par kitni queries jaayengi?',
          unit: 'queries', given: ['10,000 concurrent requests', 'sab wahi data maang rahe hain'],
          answer: 10000, tol: 0.3,
          steps: ['Har request apni query bhejti hai', '10,000 queries — sab ek hi partition par'],
          lesson: 'Hot partition ka asli trigger duplicate demand hai, data ka size nahi.',
        },
        {
          q: 'Coalescing on hai aur data 100 ms tak "fresh" maana jaata hai. Us ek second mein database par kitni queries jaayengi?',
          unit: 'queries', given: ['1 second', '100 ms ka window', 'har window mein 1 query'],
          answer: 10, tol: 0.4,
          steps: ['1 second / 100 ms = 10 windows', 'Har window mein 1 query → 10 queries'],
          lesson: '10,000 se 10 — aur woh bhi bina kuch cache kiye, sirf duplicate demand merge karke.',
        },
        {
          q: 'Discord ne 177 Cassandra nodes se 72 ScyllaDB nodes par jaakar kitne PERCENT nodes kam kiye?',
          unit: '%', given: ['177 → 72'],
          answer: 59, tol: 0.3,
          steps: ['(177 − 72) / 177 ≈ 0.593', '≈ 59% kam nodes — aur har node par dogune se zyada data'],
          lesson: 'Engine badalna sirf latency ka faisla nahi tha, fleet size ka bhi tha.',
        },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Coalescing lab',
      instructions: 'Concurrency, routing aur coalescing badlo. Database par jaane wali queries dekho.',
      goal: 'Aisi setting dhoondho jahan database par <b>50 se kam</b> queries jaayein aur user ko jawab <b>200 ms se kam</b> mein mile.',
      scenario: `Ek viral channel par ek second mein hazaron log aa rahe hain. Ek query
        database par lagbhag <b>80 ms</b> leti hai.`,
      knobs: [
        { id: 'conc', label: 'Ek second mein requests', min: 100, max: 10000, step: 100, value: 6000, unit: '',
          note: 'Viral moment par yeh number bada hi hoga.' },
        { id: 'route', label: 'Routing (0 = random instance · 1 = consistent hash per channel)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Coalescing tabhi kaam karti hai jab ek channel ki requests ek jagah pahunchein.' },
        { id: 'merge', label: 'Coalescing (0 = off · 1 = on)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Ek hi cheez maangne wali requests ko merge karna.' },
      ],
      readouts: k => {
        const m = coalesceModel(k);
        return [
          { label: 'Database par queries', value: m.dbQueries.toLocaleString('en-IN'), tone: m.dbQueries <= 50 ? 'ok' : 'bad' },
          { label: 'User ko jawab', value: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : 'bad' },
          { label: 'Hot node par load', value: m.hotLoad + '%', tone: m.hotLoad <= 60 ? 'ok' : 'bad' },
          { label: 'Retry amplification', value: m.retries ? 'shuru ho gaya' : 'nahi', tone: m.retries ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = coalesceModel(k);
        return [
          { label: 'DB queries', pct: Math.min(100, (m.dbQueries / 2000) * 100), text: m.dbQueries.toLocaleString('en-IN'), tone: m.dbQueries <= 50 ? 'ok' : 'bad' },
          { label: 'Jawab', pct: Math.min(100, (m.p99 / 3000) * 100), text: m.p99 + ' ms', tone: m.p99 <= 200 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = coalesceModel(k);
        if (!k.merge) return { ok: false, text: `Coalescing off hai — <b>${m.dbQueries.toLocaleString('en-IN')}</b> ek jaisi queries usi hot partition par ja rahi hain. Node dheema hota hai, timeouts aate hain, clients retry karte hain, aur load aur badhta hai.` };
        if (!k.route) return { ok: false, text: `Coalescing on hai par routing random hai — ek channel ki requests alag-alag instances par bat gayin, isliye merge karne layak duplicate ek jagah mile hi nahi. DB par <b>${m.dbQueries.toLocaleString('en-IN')}</b> queries.` };
        return { ok: true, text: `Sahi combination: consistent hash routing + coalescing — <b>${m.dbQueries}</b> queries database tak gayin aur user ko jawab <b>${m.p99} ms</b> mein mila, chahe <b>${k.conc.toLocaleString('en-IN')}</b> log aaye hon.` };
      },
      check: k => { const m = coalesceModel(k); return m.dbQueries <= 50 && m.p99 <= 200; },
      lesson: `Coalescing aur routing ek jodi hain — <b>ek ke bina doosra bekaar</b> hai.
        Aur dono milkar wahi karte hain jo cache nahi karta: duplicate demand ko ek query
        mein badalna, bina data purana kiye.`,
      quiz: {
        q: 'Coalescing aur caching mein farq?',
        choices: [
          'Coalescing ek hi waqt par aa rahi ek jaisi requests ko merge karti hai (jawab utna hi taza rehta hai); cache purana jawab bhi de sakta hai',
          'Dono bilkul ek hi cheez hain',
          'Cache tez hai, coalescing dheemi',
          'Coalescing sirf writes ke liye hoti hai',
        ],
        answer: 0,
        explain: 'Isi liye dono saath use hote hain — coalescing thundering herd rokti hai, cache repeat demand rokta hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — hot partition, retry storm aur coalescing',
      project: '07-discord',
      exercise: 'ex2-coalescing',
      goal: 'Hot partition banao, client retries se amplification dekho, phir consistent-hash routing + coalescing se database par queries girate dekho.',
      why: `Lab mein ek slow "partition" hai (80 ms per query), teen data-service
        instances, aur ek load tool jo retries kar sakta hai. Tum
        <code>ROUTE=random|hash</code> aur <code>COALESCE=0|1</code> badal sakte ho.`,
      steps: [
        { text: 'Partition + teen data-service instances chalao (coalescing off).', cmd: 'cd docker-labs/07-discord && npm start ex2-coalescing', expect: 'ex2-coalescing\n  partition → http://localhost:4714  (8 concurrent · 80 ms per query)\n  data-service   → http://localhost:4711  (COALESCE=0)   … 4712, 4713' },
        { text: '3,000 clients ek hi channel ek saath kholte hain, bina retry ke.', cmd: 'node tools/herd.js --clients 3000 --retries 0', expect: 'ROUTE=random COALESCE=0   retries: 0   db queries: 2,417   p99: 1725 ms   failed: 2920' },
        { text: 'Ab client retries on karke amplification dekho.', cmd: 'node tools/herd.js --clients 3000 --retries 2', expect: 'ROUTE=random COALESCE=0   retries: 2   db queries: 7,505   p99: 9828 ms   failed: 2844   ← 3.1× queries' },
        { text: 'Coalescing on karo (routing abhi random).', cmd: 'COALESCE=1 npm start ex2-coalescing && node tools/herd.js --clients 3000 --retries 2', expect: 'ROUTE=random COALESCE=1   retries: 2   db queries: 9   p99: 1223 ms   failed: 0   merged in data-service: 2,991' },
        { text: 'Consistent hash routing bhi on karo.', cmd: 'ROUTE=hash node tools/herd.js --clients 3000 --retries 2', expect: 'ROUTE=hash   COALESCE=1   retries: 2   db queries: 8   p99: 2141 ms   failed: 0   merged in data-service: 4,179' },
      ],
      observe: {
        q: 'Retries ke saath database par 7,505 queries gayin aur 2,844 clients fail hue. Coalescing on karte hi sirf 9 queries aur 0 failures. Kya badla?',
        choices: [
          'Ek hi channel ki chal rahi query ko baaki requests ne share kar liya — duplicate demand database tak pahunchi hi nahi, isliye partition dooba nahi aur retries bhi nahi bane',
          'Coalescing ne data cache kar liya, isliye purana jawab mila',
          'Coalescing ne requests ko rate limit kar diya',
          'Database tez ho gaya',
        ],
        answer: 0,
        explain: 'Ek instance ke andar jo requests ek hi cheez maang rahi thin, woh ek hi query ka jawab share kar gayin ("merged: 2,991"). Aur routing? Random par har instance apni query bhejta hai — yahan 3 instances the isliye farq chhota (9 vs 8), par 100 instances par random routing 100 guna queries bhejti. Isi liye Discord channel id par consistent hashing karta hai.',
      },
      lesson: 'Thundering herd ke do hathiyaar: <b>wahan duplicate ko merge karo</b> (coalescing) aur <b>duplicate ko ek jagah laao</b> (consistent-hash routing) — jitne zyada instances, doosra utna zaroori.',
    },
  ],
  interview: {
    title: 'Interview Round — hotspot handling',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Ek key par bahut bheed hai aur woh node dab raha hai. Pehla kadam?"',
        choices: [
          'Database ke aage duplicate demand ko merge karo (single-flight/coalescing) aur us key ki requests ko ek hi jagah route karo',
          'Us node ko bada kar do',
          'Poore cluster mein nodes badha do',
          'Client se kaho ki kam requests bhejein',
        ],
        answer: 0,
        explain: 'Node badhane se ek key ka bhaar nahi bat-ta. Pehle duplicate demand khatam karo, phir storage par socho.',
      },
      {
        q: 'Interviewer: "Timeout ke baad clients retry karte hain. Kya khatra hai?"',
        choices: [
          'Retry amplification — jo node pehle se doob raha hai uspar aur load, isliye retries ko budget, jitter aur circuit breaker chahiye',
          'Koi khatra nahi, retry hamesha achhi hai',
          'Sirf duplicate writes ka khatra hai',
          'Latency thodi badh jaayegi, bas',
        ],
        answer: 0,
        explain: 'Discord ke hot partition ka ek bada hissa yahi tha: retries ne slow node ko aur gehra dhakel diya.',
      },
    ],
  },
  success: [
    'Main hot partition ke poore chain ko samjha sakta hoon',
    'Main coalescing + consistent hash routing ka combination design kar sakta hoon',
    'Main retry amplification pehchaan kar rok sakta hoon',
  ],
  homework: `<p>Apne system ki sabse popular key (channel, product, video, user) dhoondho.
    Ab poochho: agar ek hi second mein 10,000 log usi key ka data maangein, toh database
    par kitni queries jaayengi? Agar jawab 10,000 hai, tumhe coalescing chahiye.</p>`,
  cards: [
    { front: 'Hot partition ka chain?', back: 'Ek partition ek node par → viral channel → node dheema → timeouts → clients retry → aur load → padosi resources tak latency → system-wide slowdown.' },
    { front: 'Discord ne pehla ilaaj kahan kiya?', back: 'Database ke AAGE — data services layer with request coalescing. "Data kaise store karein" aur "traffic storage tak kaise pahunche" do alag sawaal hain.' },
    { front: 'Coalescing ki shart?', back: 'Consistent hashing se ek channel ki saari requests ek hi instance par pahunchein — tabhi duplicate requests merge ho sakti hain.' },
    { front: 'Rust kyun chuna?', back: 'Java ke GC pauses se bachne ke liye — koi garbage collector nahi, concurrency par poora control, aur hot path mein koi random freeze nahi.' },
  ],
},
]);

function coalesceModel(k) {
  const instances = 3;
  if (!k.merge) {
    const dbQueries = k.conc;
    return { dbQueries, p99: Math.min(9000, 80 + Math.round(k.conc * 0.8)), hotLoad: 100, retries: k.conc > 800 };
  }
  if (!k.route) {
    const dbQueries = Math.max(instances, Math.round(k.conc * 0.87));
    return { dbQueries, p99: Math.min(9000, 80 + Math.round(dbQueries * 1.2)), hotLoad: 92, retries: k.conc > 1500 };
  }
  return { dbQueries: Math.max(1, Math.round(k.conc / 260)), p99: 96, hotLoad: 7, retries: false };
}

/* =====================================================================
   LEVEL 3 — LIVE MIGRATION aur uski KEEMAT
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-discord-migrate',
  icon: '🚚',
  title: 'Discord — chalti hui duniya ke neeche database badalna',
  badge: 'Migration Mistri',
  objectives: [
    'ScyllaDB kyun — same query language, no GC, shard-per-core',
    'Dual writes se "abhi" sambhalna, backfill se "pehle"',
    'Apna migrator: checkpointing aur 3 mahine se 9 din',
    'Faisle ki lambi parchhai — locked data model aur permanent infrastructure',
  ],
  lesson: [
    `<h3>⚙️ Naya engine, wahi data model</h3>
     <p>Coalescing layer ne bahut dard kam kiya, par neeche 177 Cassandra nodes wahi the —
     wahi GC pauses, wahi hot partitions jab coalescing kaafi na pade, aur data roz
     badhta jaata tha. Bada cluster matlab zyada nodes sambhalna, zyada partitions jo
     garam ho sakti hain. <b>Woh problem ko scale kar rahe the, solve nahi.</b></p>
     <p>Isliye unhone woh faisla liya jo unke paimane par darawna hai: <b>database hi
     badal do</b> — trillions live messages, aur ek second ka downtime bhi manzoor nahi.</p>
     <p>Chuna gaya <b>ScyllaDB</b>, aur uski teen baatein exactly unke do dardon par fit
     baithti thin:</p>
     <table>
       <tr><th>Feature</th><th>Kyun maayne rakhta hai</th></tr>
       <tr><td>Wahi query language (Cassandra-compatible)</td><td>Data model bina poore redesign ke aa sakta tha</td></tr>
       <tr><td>C++ mein likha (koi GC nahi)</td><td>Random freeze wali poori category gayab</td></tr>
       <tr><td>Shard-per-core architecture</td><td>Har CPU core ka apna data aur memory — load uneven ho tab bhi zyada sthir</td></tr>
     </table>
     <p class="tip">🎯 Dhyan do — do alag problem, do alag layers: <b>traffic</b> ka ilaaj
     Rust coalescing layer (database ke aage), aur <b>engine</b> ka ilaaj C++ database
     (database ke andar).</p>`,
    `<h3>🚚 Migration ka plan</h3>
     <pre>ABHI ka data:
   DUAL WRITES on → har naya message Cassandra aur Scylla dono mein
   → naya database apne aap current rehta hai

PEHLE ka data:
   trillions historical messages backfill karne hain
   off-the-shelf (Spark-based) migrator: stable tha, par dheema
   → poora backfill ~3 MAHINE
   → yaani 3 mahine aur us cluster ko chalana jise woh hataana chahte the

Unka jawab:
   apna migrator, Rust mein, usi data-services framework par
   - Cassandra se BADE contiguous ranges padho
   - Scylla mein high concurrency ke saath likho
   - progress ka CHECKPOINT ek chhote local database mein
     → kuch fail ho toh wahin se shuru, shuruaat se nahi

   natija: ~32 lakh messages/second  →  backfill ~9 DIN mein poora</pre>
     <p>Mai 2022 mein switch hua: ScyllaDB primary store ban gaya.</p>
     <h3>📉 Pehle aur baad ka farq</h3>
     <pre>177 Cassandra nodes   →   72 ScyllaDB nodes  (har node par dogune se zyada data)
tail read latency 40–125 ms ka jhoola  →  lagbhag sthir ~50 ms
worst-case write latency               →  ~5 ms
aur sabse badi baat: rozana ki firefighting khatam</pre>`,
    `<h3>🧾 Ab keemat — kyunki senior engineer trade-offs nahi chhodta</h3>
     <p><b>1. Storage hamesha badhega.</b> "Kabhi delete nahi" ka matlab hai ki tum us
     data ko bhi hamesha rakhte ho jise sankhya ke hisaab se lagbhag koi nahi padhta —
     zyadatar reads haal ke messages ke hote hain. Par woh itihaas hi product ka vaada
     hai.</p>
     <p><b>2. Data model lock ho gaya.</b> Jab trillions messages channel se partitioned
     ho chuke hon, toh woh partitioning hi tumhari haqeeqat hai. Isi liye naya database
     <b>Cassandra-compatible</b> hi ho sakta tha — model dobara sochne ka option tha hi
     nahi. <b>2017 ke faisle ki parchhai saalon baad tak padti rahi.</b></p>
     <p><b>3. Layers ab hamesha ki zimmedari hain.</b> Data services layer, coalescing,
     consistent-hash routing, custom Rust tooling — yeh sab ab unka apna infrastructure
     hai jise hamesha maintain karna hai. Har taakatwar infra ka ek permanent tax hota
     hai.</p>
     <p class="tip">🎯 Video ka closing sabak: <b>scale par access pattern hi architecture
     hai</b> — aur khaas kar yeh baat ki data kitni <b>uneven</b> tarah padha aur likha
     jaata hai. Isliye design karte waqt sirf "average request kaisa dikhta hai" mat
     poochho, <b>"sabse extreme request kaisa dikhega"</b> bhi poochho.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Live migration ka sahi kram',
      instructions: 'Trillions messages, zero downtime — kaam kis kram mein hoga?',
      steps: [
        { text: 'Naye engine ko chuno jo maujooda data model ko bina redesign ke le sake', explain: 'Discord ke liye yeh shart hi sabse badi thi — model 2017 mein lock ho chuka tha.' },
        { text: 'Dual writes on karo — har naya write dono databases mein', explain: '"Abhi" ka data sambhal gaya; naya database apne aap current rehta hai.' },
        { text: 'Backfill ka anumaan lagao aur tool chuno', explain: 'Off-the-shelf tool 3 mahine keh raha tha — yahin par "apna likhein?" wala sawaal aata hai.' },
        { text: 'Migrator likho jo bade ranges padhe, concurrency se likhe, aur progress checkpoint kare', explain: 'Checkpointing ke bina koi bhi failure poora kaam dobara karwa deti.' },
        { text: 'Backfill chalao aur dono databases ke data ko verify karo', explain: 'Row counts aur sample comparisons — warna cutover andhera mein hoga.' },
        { text: 'Reads ko naye database par shift karo, phir primary badal do', explain: 'Mai 2022: ScyllaDB primary. Purana cluster kuch der safety net ki tarah rehta hai.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Backfill lab — 3 mahine ya 9 din',
      instructions: 'Concurrency, range size aur checkpointing badlo. Time aur risk dono dekho.',
      goal: 'Aisi setting dhoondho jahan backfill <b>15 din se kam</b> mein poora ho, source par load <b>60% se kam</b> rahe, aur ek failure par kaam <b>shuru se dobara</b> na karna pade (checkpoint se resume).',
      scenario: `Backfill karna hai <b>1 trillion</b> messages. Source cluster live traffic
        bhi serve kar raha hai — usse marna nahi hai.`,
      knobs: [
        { id: 'conc', label: 'Migrator concurrency', min: 1, max: 60, step: 1, value: 4, unit: '',
          note: 'Zyada concurrency = tez, par source par zyada load.' },
        { id: 'range', label: 'Ek baar mein kitna bada range', min: 1, max: 20, step: 1, value: 1, unit: '×',
          note: 'Bade contiguous ranges sequential reads dete hain — random lookups se bahut tez.' },
        { id: 'ckpt', label: 'Checkpointing (0 = nahi · 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Fail hone par kahan se shuru karoge?' },
      ],
      readouts: k => {
        const m = backfillModel(k);
        return [
          { label: 'Backfill poora hone mein', value: m.days + ' din', tone: m.days <= 15 ? 'ok' : 'bad' },
          { label: 'Rate', value: m.rate + ' lakh msg/s', tone: 'ok' },
          { label: 'Source par load', value: m.load + '%', tone: m.load <= 60 ? 'ok' : 'bad' },
          { label: 'Failure par dobara kaam', value: m.redoDays + ' din', tone: m.redoDays <= 1 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = backfillModel(k);
        return [
          { label: 'Backfill time', pct: Math.min(100, (m.days / 120) * 100), text: m.days + ' din', tone: m.days <= 15 ? 'ok' : 'bad' },
          { label: 'Source load', pct: Math.min(100, m.load), text: m.load + '%', tone: m.load <= 60 ? 'ok' : 'bad' },
          { label: 'Redo risk', pct: Math.min(100, (m.redoDays / 30) * 100), text: m.redoDays + ' din', tone: m.redoDays <= 1 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = backfillModel(k);
        if (!k.ckpt) return { ok: false, text: `Checkpointing nahi hai — beech mein kuch fail hua toh <b>${m.redoDays} din</b> ka kaam dobara. Multi-day migration mein failure hoga hi, sawaal sirf kab ka hai.` };
        if (m.load > 60) return { ok: false, text: `Concurrency <b>${k.conc}</b> ke saath source par <b>${m.load}%</b> load hai — woh cluster live traffic bhi serve kar raha hai. Thoda dheere chalo.` };
        if (m.days > 15) return { ok: false, text: `<b>${m.days} din</b> lag rahe hain. Bade ranges (sequential reads) aur thodi zyada concurrency se yeh tezi se girta hai.` };
        return { ok: true, text: `Achha plan: <b>${m.days} din</b>, rate <b>${m.rate} lakh msg/s</b>, source par sirf <b>${m.load}%</b> load, aur failure par sirf <b>${m.redoDays} din</b> ka kaam dobara.` };
      },
      check: k => { const m = backfillModel(k); return k.ckpt === 1 && m.days <= 15 && m.load <= 60; },
      lesson: `Migration ek first-class engineering problem hai. Teen knobs hamesha yaad
        rakho: <b>concurrency</b> (kitna tez), <b>range size</b> (sequential vs random),
        aur <b>checkpointing</b> (fail hone par kahan se shuru).`,
      quiz: {
        q: 'Discord ne off-the-shelf migrator chhod kar apna Rust migrator kyun likha?',
        choices: [
          'Kyunki 3 mahine ka backfill matlab 3 mahine aur us cluster ko chalana jise woh hataana chahte the — migration ka waqt khud ek risk hai',
          'Kyunki off-the-shelf tool kaam hi nahi karta tha',
          'Kyunki Rust unko pasand hai',
          'Kyunki data corrupt ho raha tha',
        ],
        answer: 0,
        explain: 'Tool stable tha, bas dheema tha. Migration jitni lambi chalegi, utni der do systems ka dard jhelna padega.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — dual write, backfill, checkpoint',
      project: '07-discord',
      exercise: 'ex3-live-migration',
      goal: 'Ek live store se doosre par data le jao: dual writes on karo, backfill chalao, beech mein maar do, aur resume karke verify karo.',
      why: `Lab mein do stores hain (<code>old</code> aur <code>new</code>) aur ek writer
        jo lagatar naye messages bana raha hai. Migrator ko tum checkpointing ke saath
        ya bina chala sakte ho.`,
      steps: [
        { text: 'Dono stores aur live writer chalao.', cmd: 'cd docker-labs/07-discord && npm start ex3-live-migration', expect: 'ex3-live-migration\n  old-store → http://localhost:4721  (4,00,000 historical messages)\n  new-store → http://localhost:4722  (khaali)\n  writer    → 500 msg/s old-store par' },
        { text: 'Dual writes on karo aur dekho naya store current ho gaya.', cmd: 'node tools/dual-on.js', expect: '{"dual":true}\nrecent window: old 1500 msgs · new 1500 msgs · missing 0  ✅ "abhi" sambhal gaya' },
        { text: 'Backfill bina checkpointing ke chalao, beech mein maar do, phir dobara chalao.', cmd: 'CKPT=0 node tools/backfill.js --kill-at 40 ; CKPT=0 node tools/backfill.js --kill-at 60', expect: 'backfill… 44.7% done (koi checkpoint nahi)\nkilled\nrestart → resuming from 0.0%   ⚠️ checkpoint nahi tha — 44.7% kaam DOBARA hoga' },
        { text: 'Lab dobara shuru karo (npm start), dual writes on karo, aur ab checkpointing ke saath wahi karo.', cmd: 'node tools/dual-on.js && CKPT=1 node tools/backfill.js --kill-at 40 ; CKPT=1 node tools/backfill.js', expect: 'backfill… 44.7% done (checkpoint saved at 44.7%)\nkilled\nrestart → resuming from 44.7%   ✅ checkpoint se\nbackfill complete: 2,22,750 rows is run mein copy hue   rate: 5,77,073 rows/s' },
        { text: 'Poora data compare karo aur naye store ko primary banao.', cmd: 'node tools/compare.js && node tools/promote.js', expect: 'full compare: old 4,03,150 · new 4,03,200 · missing in new 0  ✅\n{"primary":"new-store"}' },
      ],
      observe: {
        q: 'Checkpointing ne kya bachaya?',
        choices: [
          'Failure ke baad shuru se karne ka kaam — bade backfill mein failure hogi hi, isliye resume ki suvidha migration plan ka hissa honi chahiye',
          'Data corruption',
          'Source par load',
          'Duplicate rows',
        ],
        answer: 0,
        explain: 'Discord ke custom migrator ki yahi "clever operational bit" thi: progress ek chhote local database mein checkpoint karna.',
      },
      lesson: 'Har lambi migration ka pehla feature <b>resume</b> hona chahiye, speed baad mein.',
    },
  ],
  interview: {
    title: 'Interview Round — engine migration',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Trillions rows ka database badalna hai, zero downtime. Plan?"',
        choices: [
          'Dual writes se "abhi" sambhalo, checkpointed backfill se "pehle" laao, dono ko verify karo, phir reads shift karke primary badlo',
          'Raat ko dump-restore kar lo',
          'Naye database par sirf naya data rakho aur purana wahin chhod do',
          'Application ko dono databases se padhna sikha do, hamesha ke liye',
        ],
        answer: 0,
        explain: 'Dual writes + backfill + verify + cutover — yahi pattern Airtable, Jira aur 50 TB wale migration mein bhi dikhta hai.',
      },
      {
        q: 'Interviewer: "Tumhara purana data model naye database ke liye ideal nahi hai. Kya karoge?"',
        choices: [
          'Model ki keemat maano: aksar compatible engine chunna hi practical hota hai, kyunki trillions rows ka model badalna alag (aur bada) project hai',
          'Naye database ke liye model dobara design karo aur saath mein data transform karo',
          'Dono models rakho',
          'Migration mat karo',
        ],
        answer: 0,
        explain: 'Discord ne yahi kiya — Cassandra-compatible engine, taaki ek waqt par ek hi badi cheez badle. Model redesign apna alag project hota.',
      },
    ],
  },
  success: [
    'Main dual write + checkpointed backfill wali migration plan kar sakta hoon',
    'Main engine choice ko apne dard se jod kar justify kar sakta hoon',
    'Main ek purane data model ki "lambi parchhai" pehchaan sakta hoon',
  ],
  homework: `<p>Apne sabse bade table ka data model dekho aur likho: agar aaj tumhe
    database badalna pade, toh kaunse constraints tumhare saath aayenge (partition key,
    id format, query patterns)? Jo cheezein saath aayengi, wahi tumhare purane faislon
    ki parchhai hain.</p>`,
  cards: [
    { front: 'ScyllaDB kyun chuna?', back: 'Wahi query language (data model bina redesign ke aa gaya), C++ mein (koi GC pause nahi), aur shard-per-core (har core ka apna data/memory — uneven load par zyada sthir).' },
    { front: 'Migration ka plan?', back: 'Dual writes se "abhi" ka data dono jagah; trillions historical messages ke liye custom Rust migrator — bade contiguous ranges, high concurrency, aur progress ka checkpoint. 3 mahine ka anumaan → ~9 din, ~32 lakh msg/s.' },
    { front: 'Migration ke baad ke numbers?', back: '177 Cassandra → 72 Scylla nodes (har node par dogune se zyada data), tail read latency 40–125 ms se sthir ~50 ms, worst-case write ~5 ms, aur rozana ki firefighting khatam.' },
    { front: '"Kabhi delete nahi" ki teen keematein?', back: 'Storage hamesha badhta hai (aur woh data bhi rakhna padta hai jise koi nahi padhta); data model lock ho jaata hai (isliye compatible engine hi chun sakte the); aur coalescing/routing/tooling hamesha ke liye apni zimmedari ban jaate hain.' },
  ],
},
]);

function backfillModel(k) {
  const baseRate = 0.9;                                  /* lakh msg/s, ek worker, chhota range */
  const rate = +(baseRate * k.conc * (0.6 + k.range * 0.22)).toFixed(1);
  const days = Math.max(1, Math.round(1e12 / (rate * 1e5) / 86400));
  const load = Math.min(100, Math.round(k.conc * 1.6 + k.range * 0.8));
  const redoDays = k.ckpt ? 0 : Math.max(1, Math.round(days / 2));
  return { rate, days, load, redoDays };
}

})();
