/* =====================================================================
   TRACK — 🏢 Real Company Stories · Notion: sab kuch ek block

   Source: "NOTION's Database Design" (Akhil Sharma).
   Tree ko SQL mein kaise rakhein (adjacency list + recursive CTE, closure
   table, materialized path) — woh 🐘 SQL Gurukul ke 🔬 Database Internals
   track ke "db-trees" level mein asli Postgres/MySQL par hai.
   Docker lab: docker-labs/31-notion
   ===================================================================== */
(function () {

VISUALS['notion-blocks'] = {
  t: 'Ek hi cheez: block',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-accent"><span class="ni">🆔</span><span class="nl">id</span><span class="ns">UUID</span></div>
      <div class="dg-node is-accent"><span class="ni">🏷️</span><span class="nl">type</span><span class="ns">paragraph, to-do, image, page, DB row… sirf rendering badalta hai</span></div>
      <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">properties</span><span class="ns">JSON blob</span></div>
      <div class="dg-node is-good"><span class="ni">⬇️</span><span class="nl">content[]</span><span class="ns">children ki ordered list (render)</span></div>
      <div class="dg-node is-gold"><span class="ni">⬆️</span><span class="nl">parent</span><span class="ns">upar ka pointer (permissions, ownership)</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill good">create</span><span class="dg-pill good">update</span><span class="dg-pill good">delete</span><span class="dg-pill good">move</span>
      <span class="dg-arrow">= poori API</span>
      <span class="dg-pill acc">naya block type = sirf renderer, koi schema migration nahi</span>
    </div>
    <div class="dg-cap">200 arab+ blocks, laakhon workspaces. Database badla ja sakta hai; 200 arab rows ki <b>shakal</b> hamesha ke liye.</div>`,
};

VISUALS['notion-permissions'] = {
  t: 'Do ped, ek hi data',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">⬇️ Render tree</span>
        <div class="dg-cap">Page ke <code>content[]</code> arrays ke saath NEECHE chalo, order mein. Inline mention bhi yahan ek jagah par.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">⬆️ Permission tree</span>
        <div class="dg-cap"><code>parent</code> pointers ke saath UPAR chalo, workspace root tak; pehli explicit grant/deny jeet-ti hai.
          Ek block ≈ 4–5 lookups; ek page = hazaron blocks.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Lab 31: 2,001 blocks — har block ka poora walk 17,346 lookups, page-level memo 4,003. Aur ek toggle drag kiya (parent badla)
      → <b>2,000 salary blocks</b> ek aise user ko dikhne lage jise HR page par access nahi tha.</div>`,
};

VISUALS['notion-scale'] = {
  t: 'Workspace se shard, CDC se lake',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">2021</span><span class="cmd">~20 arab blocks, ek Postgres</span><span class="q">+ basic replication</span></div>
      <div class="dg-rung a"><span class="lv">2023</span><span class="cmd">96 Postgres × 5 = 480 logical shards</span><span class="q">hash(workspace_id) → shard (Instagram jaisa logical/physical)</span></div>
      <div class="dg-rung g"><span class="lv">2024</span><span class="cmd">200 arab+ blocks</span><span class="q">har 6–12 mahine dugna</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🐘 Postgres (sach)</span><span class="dg-arrow">→ logical replication (CDC) →</span>
      <span class="dg-pill acc">🌊 pipeline</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🏞️ Apache Hudi (columnar, object storage)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🤖 AI, 🔍 search, 📊 dashboards</span>
    </div>`,
};

SD.registerLevels('stories', [
/* =====================================================================
   1. notion-blocks
   ===================================================================== */
{
  id: 'notion-blocks',
  icon: '🧱',
  title: 'Notion — sab kuch ek block, jaan-boojh ke',
  badge: 'Block Brahma',
  objectives: [
    'Ek hi data type: block — aur uske paanch hisse',
    'Composability, chaar operations ki API, bina migration naye types',
    'Data model ke faisle sabse lambe jeete hain',
    'Tree ki keemat — har layer par',
  ],
  lesson: [
    `<h3>🧱 LEGO ki eent</h3>
     <p>Aam software mein document, DB rows, wiki pages — alag objects, alag schemas, alag storage, alag APIs, UI par jode hue. Notion mein
     paragraph, checkbox, image, DB row, page, workspace — <b>sab ek hi cheez: block</b>. Sirf <code>type</code> field batata hai ki
     kaise dikhana hai. 2016 ka soch-samajh ke liya faisla, karz nahi. Aaj 200 arab+ blocks.</p>
     <pre>block = { id (UUID), type, properties (JSON), content: [child ids], parent, metadata (created/edited/owner) }</pre>
     <h3>🎁 Isse kya milta hai</h3>
     <ul>
       <li><b>Composability</b> — kuch bhi kisi ke bhi andar: page mein DB, toggle ke andar to-do, table cell ke andar, DB row ke
       andar. Har parent-child rishta ek hi operation.</li>
       <li><b>Ek API, chaar kaam</b>: create / update / delete / move. Bold = update properties; indent = move (re-parent); page
       delete = block delete. Endpoints ka dhamaka nahi.</li>
       <li><b>Bina schema migration naye types</b> — code block, math, AI summary = type register + frontend renderer. Backend aur schema
       wahi. Competitors nakal karne ke liye apne hi data model se ladte hain.</li>
     </ul>`,
    `<h3>🧾 Keemat — har layer par</h3>
     <p>Data ab <b>ped (tree/forest)</b> hai, relational nahi:</p>
     <ul>
       <li><b>Permissions</b> — inherited, ancestors ki taraf walk (agla level).</li>
       <li><b>Search</b> — index se pehle tree ko recursively flatten.</li>
       <li><b>E2E encryption</b> lagbhag namumkin — backend ko rishte traverse karne padte hain.</li>
       <li><b>Migration</b> — 200 arab rows ek dhaanche mein = hamesha ka vaada.</li>
       <li><b>Onboarding</b> — indirection, sochne ka bojh.</li>
     </ul>
     <p class="tip">🎯 <b>Data model ke faisle sab kuch se lamba jeete hain.</b> Database ya framework badla ja sakta hai; 200 arab rows ki
     shakal nahi. Har powerful abstraction ka hamesha ka tax hai.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'User ka kaam → block operation',
      instructions: 'Notion mein har user action chaar operations mein se kaunsa hai?',
      pairs: [
        { left: '🅱️ Text bold kiya', right: 'update — properties badli', explain: 'Style bhi properties ka hissa.' },
        { left: '➡️ Bullet ko indent kiya', right: 'move — naya parent (re-parent)', explain: 'Indent = tree mein ek level neeche.' },
        { left: '🗑️ Poora page delete', right: 'delete — ek block (children uske saath)', explain: 'Page bhi bas ek block.' },
        { left: '➕ Page mein naya database', right: 'create — type=database block', explain: 'DB bhi block, page ke andar.' },
        { left: '🧮 Naya "math equation" type launch', right: 'Sirf type + renderer — schema migration nahi', explain: 'Extensibility bina backend badle.' },
      ],
    },
    {
      type: 'bins',
      title: 'Block model ka faayda ya keemat?',
      instructions: 'Har cheez ko sahi dabbe mein daalo.',
      bins: [
        { id: 'gain', label: '🎁 Faayda' },
        { id: 'tax', label: '🧾 Keemat (hamesha ka tax)' },
      ],
      items: [
        { text: 'Table cell ke andar to-do list', bin: 'gain', explain: 'Composability.' },
        { text: 'Har page load par permission ke liye ancestors ki walk', bin: 'tax', explain: 'Inherited permissions ka kharcha.' },
        { text: 'Naya block type bina DB migration', bin: 'gain', explain: 'Extensibility.' },
        { text: 'Search se pehle tree flatten', bin: 'tax', explain: 'Ped ko index ke liye seedha karna padta hai.' },
        { text: 'E2E encryption lagbhag namumkin', bin: 'tax', explain: 'Backend ko rishte dekhne hain.' },
        { text: 'Ek hi API — create/update/delete/move', bin: 'gain', explain: 'Endpoints ka dhamaka nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — flexible data model',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Notes app jahan kuch bhi kisi ke andar ho sake — data model?"',
        choices: [
          'Unified block: id, type, properties (JSON), ordered children, parent pointer — chaar operations; keemat: permissions/search tree walks, isliye memo/cache aur workspace sharding',
          'Har cheez ki alag table',
          'Ek bada JSON document per page',
          'Graph database',
        ],
        answer: 0,
        explain: 'Notion ka tareeka — aur uski keemat pehle se pata.',
      },
      {
        q: 'Interviewer: "Kaunsa faisla sabse mushkil se badalta hai?"',
        choices: [
          'Data model — arabon rows ki shakal; DB ya framework badla ja sakta hai',
          'Programming language',
          'Cloud provider',
          'UI framework',
        ],
        answer: 0,
        explain: '"Data model decisions outlive everything."',
      },
    ],
  },
  success: [
    'Main block model ke hisse aur faayde bata sakta hoon',
    'Main block model ki har layer par keemat gin sakta hoon',
    'Main samjha sakta hoon ki data model ke faisle sabse lambe kyun jeete hain',
  ],
  homework: `<p>Apne product ke 3 alag "object types" lo (jaise post, comment, attachment). Agar sab ek unified type hote, toh kya aasaan hota
    (naye features, ek API) aur kya mehenga (permissions, queries)? Ek table banao.</p>`,
  cards: [
    { front: 'Notion ka block?', back: '{ id, type, properties (JSON), content[] (children), parent, metadata }. Paragraph se workspace tak sab block.' },
    { front: 'Block model ke teen faayde?', back: 'Composability (kuch bhi kisi ke andar), chaar operations ki API, bina schema migration naye types.' },
    { front: 'Block model ki keemat?', back: 'Permissions (ancestor walks), search (tree flatten), E2E lagbhag namumkin, migration hamesha ka vaada, onboarding bojh.' },
  ],
},

/* =====================================================================
   2. notion-permissions
   ===================================================================== */
{
  id: 'notion-permissions',
  icon: '🔏',
  title: 'Permissions — ancestors ki taraf chalna',
  badge: 'Parent Pointer Pandit',
  objectives: [
    'Inherited permissions — har block ke liye upar ki walk',
    'Render tree vs permission tree — do pointer systems',
    'Move: content badla ya parent bhi?',
    'Lab: 2,000 blocks par walk, memo, aur ek drag se leak',
  ],
  lesson: [
    `<h3>🔑 Owner column nahi, vansh-vriksh</h3>
     <p>Aam app: <code>owner_id</code> column, ek index lookup. Notion: permissions <b>inherited</b> — top page share kiya toh har nested
     block aur subpage bhi. Ek block dekhne ke liye: parent → parent → … → workspace root tak, har level par explicit grant/deny
     (explicit jeet-ta hai). Ek block ≈ 4–5 lookups; ek page = hazaron blocks → permission ka hisaab <b>system ka sabse mehenga
     kaam</b>, aur model mein hi bana hua.</p>
     <pre>lab 31 (ex1-blocks) — Team Wiki page, ~2,000 nested blocks:
naive (har block ka poora walk)   DB lookups 17,346   379 ms
memo (page ke andar yaad rakho)   DB lookups  4,003    84 ms</pre>
     <h3>🌳🌳 Do ped</h3>
     <ul>
       <li><b>Render tree</b> — page ke <code>content[]</code> ke saath <b>neeche</b>, order mein.</li>
       <li><b>Permission tree</b> — <code>parent</code> pointers ke saath <b>upar</b>.</li>
     </ul>
     <p>Hamesha same nahi: kisi aur page ka inline mention render tree mein ek jagah dikhta hai, par uski permissions wahan se aati
     hain jahan woh <b>rehta</b> hai. Isliye do pointer systems — <code>content[]</code> (neeche, rendering) aur <code>parent_id</code>
     (upar, permissions/ownership) — alag index, alag cache.</p>`,
    `<h3>🚚 Move ke do matlab</h3>
     <ul>
       <li>Sirf <code>content[]</code> badlo → dikhne ki jagah badli, permissions wahi.</li>
       <li><code>parent</code> bhi badlo → dono badle — ab <b>naye</b> ancestors ki permissions lagengi.</li>
     </ul>
     <pre>lab 31 — aman ko HR page par access nahi:
HR → Salaries page: aman ko 0 blocks; Team Wiki mein aman ko 2001
riya ne ek toggle (salaries-b0 + andar ka sab) Salaries se Team Wiki mein drag kiya
ab aman ko Team Wiki mein 4001 blocks → 2000 salary wale blocks aman ko dikh rahe hain!</pre>
     <p>Content ek byte nahi badla — sirf parent. Isliye move ek <b>permission event</b> hai: UI warning, audit log, cache invalidation.</p>
     <p class="tip">🎯 <b>Jo cheezein alag hain unhe alag rakho, chahe dikhne mein ek jaisi lagein</b> — do traversal directions = do pointer systems.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — permission walk, memo, aur ek drag',
      project: '31-notion',
      exercise: 'ex1-blocks',
      goal: 'Team Wiki (~2,000 blocks) kholo — har block ka ancestor walk vs page-level memo; phir ek toggle drag karke dekho kaun kya dekh sakta hai.',
      why: `<code>services/blocks.js</code>: har block padhna = ek "DB lookup" (20 µs asli wait). Permission kahin likhi nahi — ancestors mein
        pehli <code>share</code> jahan mile. <code>POST /move</code> parent badalta hai.`,
      steps: [
        { text: 'Block store chalao.', cmd: 'cd docker-labs/31-notion && npm start ex1-blocks', expect: 'ex1-blocks\n[blocks] :5091 — 4004 blocks' },
        { text: 'Page load + move chalao.', cmd: 'node tools/pageload.js', expect: 'A) permission check: har block ke liye poora ancestor walk vs page-level memo\n   naive  dikhe 2001 blocks   DB lookups  17346   379.2 ms\n   memo   dikhe 2001 blocks   DB lookups   4003   84.2 ms\n…\nC) block MOVE karna permission badal deta hai\n   ab aman ko Team Wiki mein 4001 blocks dikhe → 2000 salary wale blocks ab aman ko dikh rahe hain!' },
      ],
      observe: {
        q: 'Memo ne lookups 17,346 → 4,003 kaise kiye?',
        choices: [
          'Ek page ke saare blocks ke ancestors lagbhag wahi hain — ek baar jo pata chala (is ancestor par permission kya hai) woh yaad rakho, dobara upar mat chalo',
          'Blocks kam ho gaye',
          'Cache DB mein tha',
          'Permission check hata diya',
        ],
        answer: 0,
        explain: 'Page-level memo — aur isi liye permission results aggressively cache hote hain (aur move par invalidate).',
      },
      lesson: 'Inherited permissions = ancestor walks; memo/cache zaroori, aur har re-parent ek permission event.',
    },
    {
      type: 'quiz',
      title: 'Do ped ki samajh',
      questions: [
        {
          q: 'Inline mention (dusre page ka link) ki permission kahan se aati hai?',
          choices: [
            'Us page ke apne ancestors se jahan woh rehta hai — render tree mein jagah se nahi',
            'Jis page mein mention hai uske ancestors se',
            'Workspace se hamesha',
            'Mention karne wale se',
          ],
          answer: 0,
          explain: 'Isi liye render aur permission ke liye alag pointers.',
        },
        {
          q: 'Move karte waqt sirf content[] badla, parent nahi — kya hua?',
          choices: [
            'Block naye page par dikhta hai par permissions purani jagah ki — dikhne wale log wahi',
            'Permissions badal gayi',
            'Block delete',
            'Kuch nahi',
          ],
          answer: 0,
          explain: 'Dono pointers badlo toh dono badlenge (lab ka leak).',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — hierarchical permissions',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Nested folders ke saath inherited permissions — fast kaise?"',
        choices: [
          'Parent pointers se ancestor walk + per-request/page memo + permission cache (ancestor → grants), re-parent/share change par invalidate; ya closure table/materialized path se ancestors ek query mein',
          'Har file par saari permissions copy',
          'Permissions check mat karo reads par',
          'Har request par poora tree load',
        ],
        answer: 0,
        explain: 'SQL Gurukul ka db-trees level: recursive CTE, closure table, materialized path.',
      },
      {
        q: 'Interviewer: "User ne private doc ek shared folder mein drag kiya — kya karoge?"',
        choices: [
          'Move = permission event: pehle warning ("ab X log dekh payenge"), audit log, aur permission caches invalidate',
          'Kuch nahi',
          'Drag band',
          'Admin approval hamesha',
        ],
        answer: 0,
        explain: 'Lab: ek drag = 2,000 blocks ka leak.',
      },
    ],
  },
  success: [
    'Main inherited permissions ki ancestor walk aur uska kharcha samjha sakta hoon',
    'Main render tree aur permission tree ka farq bata sakta hoon',
    'Main move ko permission event ki tarah design kar sakta hoon',
  ],
  homework: `<p>Apne product mein koi hierarchy dhoondho (folders, orgs → teams → projects, categories). Permission kahan tay hoti hai — har
    item par, ya upar se inherit? Ek item ko ek parent se doosre mein le jaane par kya hota hai? Kya user ko pata chalta hai?</p>`,
  cards: [
    { front: 'Notion permissions kaise?', back: 'Inherited: block se parent → … → workspace tak walk, pehli explicit grant/deny. Ek block ~4–5 lookups; page = hazaron blocks.' },
    { front: 'Render tree vs permission tree?', back: 'Render: content[] neeche, order mein. Permission: parent upar. Mention render mein kahin, permission apni jagah se — isliye do pointer systems.' },
    { front: 'Lab 31: move?', back: 'Toggle ka parent badla → 2,000 salary blocks aise user ko dikhe jise HR access nahi tha. Move = permission event.' },
  ],
},

/* =====================================================================
   3. notion-scale
   ===================================================================== */
{
  id: 'notion-scale',
  icon: '📈',
  title: '20 arab se 200 arab — workspace shards aur data lake',
  badge: 'Shard aur Lake Wala',
  objectives: [
    'Do problems: operational (ek primary) aur analytics (bade scans)',
    'Shard key = access ki natural ikaai: workspace',
    '480 logical shards / 96 physical',
    'CDC → Hudi data lake; lab mein analytics ka asar',
  ],
  lesson: [
    `<h3>📈 Har 6–12 mahine dugna</h3>
     <p>2021: ~20 arab blocks ek Postgres par (basic replication ke saath). 2024: 200 arab+, har 6–12 mahine dugna. Do problems:</p>
     <ol>
       <li><b>Operational</b> — ek primary par 200 arab rows: memory mein fit nahi, indexes bahut bade, planner ke galat faisle → <b>shard</b>.</li>
       <li><b>Analytics</b> — search, AI, dashboards ko bade scans chahiye; prod par nahi chala sakte → <b>data lake</b>.</li>
     </ol>
     <h3>🔑 Shard key = access ki natural ikaai</h3>
     <p>Tum ek workspace mein kaam karte ho; permission checks, search — sab workspace ke andar. Toh <b>workspace</b> ke saare blocks ek
     shard par: <code>hash(workspace_id) → shard</code> → ek request, ek shard. 2023: <b>96 Postgres instances × 5 = 480 logical
     shards</b> (Instagram jaisa logical/physical alag — hosts jodo/rebalance bina rehash).</p>
     <p>Shart: cross-workspace query ("Bitcoin mention karne wale saare pages") = 480 shards par scatter. Shard key yeh maanta hai ki
     aisi queries kam hain. (Instagram ne user chuna, Notion ne workspace — dono ne apna access pattern encode kiya.)</p>
     <pre>lab 31 — 32 shards, ek page load:
shard by block id  → 22 / 32 shards chhuye
shard by workspace →  1 / 32</pre>`,
    `<h3>🏞️ Production queries serve karta hai, lake sawaalon ka jawab deta hai</h3>
     <p>Postgres sach hai; har block change Postgres <b>logical replication (CDC)</b> se pakda jaata hai → pipeline → <b>Apache Hudi</b>
     (object storage par transactional layer, incremental upserts) → <b>columnar</b> format → AI embeddings, search index, analytics
     dashboards wahan se padhte hain.</p>
     <pre>lab 31 (ex2-lake) — live reads ~1 ms CPU, analytics scan 3 sec CPU:
koi analytics nahi           p50  6 ms   p99 14 ms
scan PRIMARY par             p50 20 ms   p99 27 ms
scan LAKE (CDC copy) par     p50  6 ms   p99 16 ms</pre>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Data model ke faisle sab kuch se lamba jeete hain.</li>
       <li>Powerful abstraction ka hamesha ka kharcha.</li>
       <li>Do traversal directions → do pointer systems.</li>
       <li>Shard key access pattern encode karta hai (Notion: workspace, Instagram: user).</li>
       <li>Operational aur analytical kaam alag.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — shard key aur data lake',
      project: '31-notion',
      exercise: 'ex2-lake',
      goal: 'Live reads chal rahe hain; analytics ka 3 sec scan primary par vs CDC lake par — users ka p50/p99 dekho. (Shard key wala hissa ex1-blocks mein.)',
      why: `<code>services/db.js</code> do baar chalta hai: <code>primary</code> (5092) aur <code>lake</code> (5093). Scan 10 ms ke tukdon mein CPU khaata
        hai; same process mein live reads ko line mein lagna padta hai.`,
      steps: [
        { text: 'Primary + lake chalao.', cmd: 'cd docker-labs/31-notion && npm start ex2-lake', expect: 'ex2-lake\n[db primary] :5092\n[db lake] :5093' },
        { text: 'Teen phases chalao.', cmd: 'node tools/lake.js', expect: 'koi analytics nahi                 live reads  2588   p50   6 ms   p99   14 ms\nanalytics scan PRIMARY par         live reads  3005   p50  20 ms   p99   27 ms\nanalytics scan LAKE (CDC copy) par live reads  2562   p50   6 ms   p99   16 ms' },
      ],
      observe: {
        q: 'Lake par scan chalne se primary ke users par lagbhag asar kyun nahi?',
        choices: [
          'Scan alag machine/process (CDC copy) par CPU khaata hai — primary ke live reads us CPU ke liye line mein nahi lagte',
          'Lake tez hai',
          'Scan chhota tha',
          'Reads cache se aaye',
        ],
        answer: 0,
        explain: 'Operational aur analytical kaam alag — CDC unhe jodne ka raasta.',
      },
      lesson: 'Production queries serve kare, analytics lake mein — CDC se taaza, primary se door.',
    },
    {
      type: 'bins',
      title: 'Primary par ya lake par?',
      instructions: 'Notion ke liye har query kahan chalni chahiye?',
      bins: [
        { id: 'prod', label: '🐘 Postgres (production shard)' },
        { id: 'lake', label: '🏞️ Data lake (CDC copy)' },
      ],
      items: [
        { text: 'User ne page khola — blocks dikhao', bin: 'prod', explain: 'Live, ek workspace, ek shard.' },
        { text: '"Pichhle mahine kitne blocks bane, workspace wise" dashboard', bin: 'lake', explain: 'Bada scan — columnar lake.' },
        { text: 'AI ke liye saare pages ke embeddings banana', bin: 'lake', explain: 'Poora data padhna — prod par nahi.' },
        { text: 'Block ka text edit save', bin: 'prod', explain: 'Write — source of truth.' },
        { text: 'Workspace search index banana/update', bin: 'lake', explain: 'CDC stream se incremental — prod par scan nahi.' },
        { text: 'Permission check page load par', bin: 'prod', explain: 'Live request ka hissa.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — sharding a collaborative app',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Notion jaisa app — shard key kya?"',
        choices: [
          'Workspace/tenant — access ki natural ikaai; ek page load ek shard; logical shards bahut (480) physical kam (96) taaki rebalance bina rehash; cross-workspace queries scatter ya lake mein',
          'Block id hash',
          'User id',
          'Created date',
        ],
        answer: 0,
        explain: 'Lab: block-id sharding = 22 shards per page; workspace = 1.',
      },
      {
        q: 'Interviewer: "Analytics team prod DB par queries chala rahi hai."',
        choices: [
          'CDC (logical replication) → pipeline → columnar lake (Hudi/Iceberg); analytics, AI, search wahan se; prod sirf live queries',
          'Read replica hi kaafi hamesha',
          'Raat ko chalao',
          'Analytics band',
        ],
        answer: 0,
        explain: 'Lab: primary par scan → p50 6 → 20 ms.',
      },
    ],
  },
  success: [
    'Main operational aur analytics problems alag kar sakta hoon',
    'Main access pattern se shard key chun sakta hoon',
    'Main CDC → data lake ka design aur uska faayda lab se dikha sakta hoon',
  ],
  homework: `<p>Apne sabse bade table ke liye likho: sabse aam query kis "ikaai" ke andar rehti hai (user, tenant, workspace, order)? Wahi
    shard key ka pehla ummeedwar hai. Aur kaunsi queries us ikaai ke paar jaati hain — woh scatter karegi ya lake mein jaani chahiye?</p>`,
  cards: [
    { front: 'Notion shard key?', back: 'Workspace — hash(workspace_id) → shard; 2023: 96 Postgres × 5 = 480 logical shards. Cross-workspace query = scatter.' },
    { front: 'Notion data lake?', back: 'Postgres logical replication (CDC) → pipeline → Apache Hudi (columnar, object storage) → AI, search, dashboards.' },
    { front: 'Lab 31: analytics kahan?', back: 'Primary par scan: live p50 6 → 20 ms. Lake par: 6 ms, primary ko pata bhi nahi.' },
  ],
},
]);

})();
