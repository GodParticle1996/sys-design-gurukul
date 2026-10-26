/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · Gmail: ek bhi mail na khoye

   Source: "How Gmail Handles 44 Trillion Emails a Year" (Akhil Sharma) —
   Google ke Spanner aur storage write-ups ke aadhaar par.
   Docker lab: docker-labs/22-gmail
   ===================================================================== */
(function () {

VISUALS['gmail-state'] = {
  t: 'Email file nahi, ek state machine hai',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">📁 Folder</span>\n        <div class=\"dg-cap\">Ek mail = ek jagah. Do folders mein chahiye → copy ya reference. Archive = mail ko uthake doosri jagah\n          likho. Lab: 5,000 archive = <b>10.7 MB</b> likha.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🏷️ Label</span>\n        <div class=\"dg-cap\">Label = metadata. Ek hi record par work + important + travel. Archive = sirf \"inbox\" label hatao —\n          mail hilta hi nahi. Lab: <b>254 KB</b> (42× kam).</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">📩 mail aaya</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">👀 khola = WRITE (unread → read)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">⭐ star / 🏷️ label / 📦 archive = aur writes</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">📱💻 har device par wahi sach</span>\n    </div>",
};

VISUALS['gmail-consistency'] = {
  t: '"Delivered" kab bolein?',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">⚡ Ack pehle, replicate baad mein</span>\n        <div class=\"dg-cap\">Ek copy likhi → \"delivered\" → background mein doosri site. Beech mein site giri → mail gaya,\n          bhejne wale ko lagta hai pahunch gaya. Lab: <b>20 mails kho gaye</b>.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🛡️ Kai sites par commit, phir ack</span>\n        <div class=\"dg-cap\">Dono sites par likha → tab \"delivered\". Lab: <b>0 khoye</b>, keemat ~1.2 ms (localhost; asli mein ek\n          cross-region round trip).</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-ladder\">\n      <div class=\"dg-rung\"><span class=\"lv\">🌍</span><span class=\"cmd\">Spanner</span><span class=\"q\">globally distributed + strongly consistent + ACID + scale</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">⏱️</span><span class=\"cmd\">TrueTime + commit wait</span><span class=\"q\">bina central referee ke order par sehmati</span></div>\n      <div class=\"dg-rung g\"><span class=\"lv\">👤</span><span class=\"cmd\">Partition by user</span><span class=\"q\">tumhara mailbox = ek shard; ek request, ek jagah</span></div>\n    </div>",
};

VISUALS['gmail-search-hot'] = {
  t: '2 arab private indexes, aur garam-thanda data',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🔍 Web search</span>
        <div class="dg-cap">Ek bahut bada SAAJHA index. 5 minute purana chal jaata hai.</div></div>
      <div class="dg-box is-accent"><span class="bx-label">📬 Gmail search</span>
        <div class="dg-cap">~2 arab ALAG, private indexes, har ek hamesha badhta hua. Mail aate hi searchable — raat ka batch nahi.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-stack">
      <div class="dg-node is-good"><span class="ni">🔥</span><span class="nl">Hot metadata</span><span class="ns">subject, sender, labels, read flag, thread, index — tez, mehenga, strongly consistent DB (ms)</span></div>
      <div class="dg-node is-gold"><span class="ni">🧊</span><span class="nl">Cold bodies + attachments</span><span class="ns">10 MB PDF, photos — sasta, ghana bulk storage; mail kholne par hi lao</span></div>
    </div>`,
};

VISUALS['gmail-delivery'] = {
  t: 'SMTP retry karta hai — receiver yaad rakhta hai',
  html: "\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">📤 sender MTA</span><span class=\"dg-arrow\">→ mail →</span>\n      <span class=\"dg-pill acc\">📥 Gmail: durable write + spam check + filters + index + push</span><span class=\"dg-arrow\">→ \"250 OK\" →</span>\n      <span class=\"dg-pill bad\">❓ ACK raaste mein gum</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill\">📤 dobara bhejo</span>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-grid\">\n      <div class=\"dg-node is-good\"><span class=\"ni\">🆔</span><span class=\"nl\">Message-ID se dedup</span><span class=\"ns\">lab: 114 duplicates → 0</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">📎</span><span class=\"nl\">Attachment fingerprint</span><span class=\"ns\">10,000 × 5 MB = 48.83 GB → ek 5 MB object + refcount</span></div>\n      <div class=\"dg-node is-gold\"><span class=\"ni\">🗑️</span><span class=\"nl\">Delete ≠ jagah khaali</span><span class=\"ns\">aakhri reference jaane par hi bytes free</span></div>\n    </div>",
};

SD.registerLevels('planet', [
/* =====================================================================
   1. gmail-state
   ===================================================================== */
{
  id: 'gmail-state',
  icon: '📬',
  title: 'Gmail — email ek zinda database hai',
  badge: 'Label Lagane Wala',
  objectives: [
    '2004 ka vaada aur uske teen mushkil kaam',
    'Email = state machine: mail kholna bhi ek write hai',
    'Folders vs labels — "Inbox" ek query hai',
    'Lab: folder-move vs label ka kharcha',
  ],
  lesson: [
    "<h3>🎁 1 April 2004 — mazaak jaisa vaada</h3>\n     <p>Gmail ne 1 GB muft diya (us waqt Hotmail se ~500× zyada) — log April Fool samjhe. Vaada: har mail hamesha\n     rakho, kabhi delete/sort na karna pade, kuch bhi turant dhoondh lo — 1.8 arab logon ke liye, exabytes mein,\n     ek byte bhi na khoye, do devices kabhi alag sach na dikhayein.</p>\n     <p>Pehla version ek engineer ne ek din mein banaya tha: Google Groups ka search code ek mailbox par laga diya.\n     Yaani Gmail \"email jisme search jodi gayi\" nahi, <b>\"tumhare email par lagi search\"</b> tha. Isse teen mushkil\n     kaam nikle:</p>\n     <ul>\n       <li>Hamesha badhta storage</li>\n       <li>Har user ka apna private index, real time mein taaza</li>\n       <li>Mailbox ek zinda database — state kabhi na khoye, kabhi alag na dikhe</li>\n     </ul>\n     <h3>🔄 Text rakhna aasaan, STATE mushkil</h3>\n     <p>Read/unread, starred, archived, labels, thread, draft. Mail <b>kholna</b> bhi ek write hai (unread flag). Aur\n     yeh writes laptop, phone, tablet, browser se ek saath aati hain — sab jagah wahi sach dikhna chahiye. Video:\n     <b>\"files passive hain, email active hai.\"</b> Har mail ek record, har action ek transaction. Do cheezein par\n     koi samjhauta nahi: <b>durability</b> (log dheemapan maaf karte hain, gayab mail nahi) aur <b>consistency</b>.</p>",
    `<h3>🏷️ Folders nahi, labels</h3>
     <p>Folder ek jagah hai — ek mail ek folder mein; do mein chahiye toh copy. Label <b>metadata</b> hai — ek hi record
     par work + important + receipts + travel. Many-to-many.</p>
     <ul>
       <li><b>Archive kuch hilata nahi</b> — sirf "inbox" label hat-ta hai.</li>
       <li><b>Inbox ek QUERY hai</b>: "inbox label wale mails, naye pehle". Har screen usi ek collection par ek query.</li>
     </ul>
     <p>Isse storage aur organization alag ho gaye.</p>
     <pre>lab 22 — 5,000 mails, sab archive:
tareeka        rows likhe   bytes likhe
folder-move       5000      10,757,786
label             5000         253,893     ← 42× kam
ek hi mail teen jagah: {"labels":["archive","inbox","work","starred"]}</pre>
     <p class="tip">🎯 Video ka pehla sabak: <b>product ka faisla, bhes badla hua architecture ka faisla hai.</b>
     "Label, folder nahi" ek UX faisla lagta hai — par usne storage, sync aur search sab tay kar diya.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Write hai ya sirf read?',
      instructions: 'Gmail ke liye kaunsa kaam database mein WRITE hai?',
      bins: [
        { id: 'write', label: '✍️ Write (state badli)' },
        { id: 'read', label: '👀 Sirf read' },
      ],
      items: [
        { text: 'Unread mail kholna', bin: 'write', explain: 'Unread → read flag badla. Aur yeh har device par dikhna chahiye.' },
        { text: 'Inbox scroll karna', bin: 'read', explain: 'Inbox ek query hai — sirf padhna.' },
        { text: 'Mail par star lagana', bin: 'write', explain: 'Ek label/flag jodna.' },
        { text: 'Mail archive karna', bin: 'write', explain: 'Inbox label hataana — chhota metadata write, mail hilta nahi.' },
        { text: 'Search "invoice march"', bin: 'read', explain: 'Index par query.' },
        { text: 'Draft mein ek shabd type karna', bin: 'write', explain: 'Draft autosave bhi state hai — doosre device par dikhna chahiye.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — folder-move vs label',
      project: '22-gmail',
      exercise: 'ex1-ack',
      goal: '5,000 mails archive karo — poora record nayi jagah likhne (folder) vs sirf label hataane mein kitne bytes likhe?',
      why: `<code>services/store.js</code> ek mail store hai jahan labels metadata hain. <code>tools/labels.js</code> dono tareeke
        chalata hai aur <code>GET /q?label=inbox</code> se Inbox ek query ki tarah padhta hai.`,
      steps: [
        { text: 'Stores + frontend chalao.', cmd: 'cd docker-labs/22-gmail && npm start ex1-ack', expect: 'ex1-ack\n[store site-a] :4981\n[store site-b] :4982\n[frontend] :4983 ACK=after' },
        { text: 'Labels tool chalao.', cmd: 'node tools/labels.js', expect: 'folder-move            5000          10757786           0 mails\nlabel                  5000            253893           0 mails\n\nek hi mail teen jagah: {"id":"m1","subject":"Sale 1","labels":["archive","inbox","work","starred"]}' },
      ],
      observe: {
        q: 'Rows dono mein 5,000 — phir bhi bytes 42× alag kyun?',
        choices: ["Toy move rewrites body; label updates metadata","Labels eliminate every storage write","Folder semantics require full body rewrite","Compression alone explains changed writes"],
        answer: 0,
        explain: "Is lab ka naive folder-move implementation full body rewrites karta hai. Labels lightweight references change karti hain. Efficient folder design bhi metadata references move kar sakta hai; 42x is toy comparison, universal folder law nahi.",
       choiceExplanations: ["Is lab ka naive folder-move implementation full body rewrites karta hai. Labels lightweight references change karti hain. Efficient folder design bhi metadata references move kar sakta hai; 42x is toy comparison, universal folder law nahi.","Label changes still metadata write karti hain.","Efficient folder implementation references update kar sakti hai.","Question changed data model/write path compare karta hai."] },
      lesson: 'Jo cheez baar-baar badalti hai (organization), use us cheez se alag rakho jo nahi badalti (content).',
    },
  ],
  interview: {
    title: 'Interview Round — mailbox data model',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Email app ka data model — folders ya labels?"',
        choices: ["Many labels, shared immutable content","Every folder must copy full body","Labels make all permission rules free","One table per view always required"],
        answer: 0,
        explain: 'Lab: 42× kam writes, aur ek mail kai jagah bina copy.',
       choiceExplanations: ["Lab: 42× kam writes, aur ek mail kai jagah bina copy.","Folders references se model ho sakte hain; payload copying required nahi.","Label visibility/ownership still explicit permissions maangti hai.","Views metadata/query model se derive ho sakti hain."] },
      {
        q: 'Interviewer: "Mail kholna write kyun maante ho? Read hi toh hai."',
        choices: ["Read flag ki persistent mutation","GET payload means no side effect ever","Only analytics count can change","Flags need no cross-device contract"],
        answer: 0,
        explain: '"Email active hai" — har action state machine ka ek kadam.',
       choiceExplanations: ["\"Email active hai\" — har action state machine ka ek kadam.","UI open action additional mutation invoke kar sakta hai.","Product read/unread state user-visible behavior hai.","Other devices need chosen consistency and durable update behavior."] },
    ],
  },
  success: [
    'Main email ko state machine ki tarah dekh sakta hoon',
    'Main labels-as-metadata aur inbox-as-query samjha sakta hoon',
    'Main lab se folder vs label ka kharcha dikha sakta hoon',
  ],
  homework: `<p>Apne product mein koi "folder" jaisi cheez dhoondho (category, status bucket, project folder). Kya use label
    (metadata + query) banane se move/copy ke writes bachenge? Aur kya ek cheez ko kai jagah dikhana aasaan hoga?</p>`,
  cards: [
    { front: 'Gmail ke teen mushkil kaam?', back: 'Hamesha badhta storage; har user ka private real-time index; mailbox ek zinda DB jiska state kabhi na khoye, kabhi alag na dikhe.' },
    { front: 'Labels vs folders?', back: "Label = metadata (many-to-many); archive = inbox label hatao, mail hilta nahi; Inbox ek query. Lab: 10.7 MB vs 254 KB (42×)." },
    { front: '"Files passive, email active"?', back: 'Mail kholna, star, label, archive, draft — sab writes, kai devices se ek saath. Har action ek transaction.' },
  ],
},

/* =====================================================================
   2. gmail-consistency
   ===================================================================== */
{
  id: 'gmail-consistency',
  icon: '🛡️',
  title: 'Durable aur consistent — "delivered" ka asli matlab',
  badge: 'Pakka Pahunchane Wala',
  objectives: [
    'Ack pehle vs kai sites par commit ke baad ack',
    'Strong consistency kyun — eventual yahan kyun nahi chalta',
    'Spanner, TrueTime aur partition by user',
    'CAP mein Gmail consistency chunta hai',
  ],
  lesson: [
    "<h3>✉️ \"Delivered\" bol diya, phir mail gaya</h3>\n     <p>Laakhon disks — kuch har ghante marti hain. Replication toh chahiye, par sawaal: <b>write kab poora maana\n     jaaye?</b> Agar ek copy likh ke \"delivered\" bol diya aur doosri copy background mein bhej rahe ho, toh beech mein ek\n     pal hai jab sirf ek copy hai. Us pal site giri → bhejne wale ko \"pahunch gaya\" dikha, aur mail <b>kabhi nahi\n     milega</b>. Email ka sabse bura failure.</p>\n     <p>Durable raasta: kai machines (behtar ho alag jagah) par commit, <b>phir</b> ack. Keemat: latency.</p>\n     <pre>lab 22 (ex1-ack) — 200 mails, mail #120 ke baad site A giri:\nack mode   \"delivered\" bola   site B par   KHO GAYE   ack latency\nbefore          120               100          20       4.85 ms\nafter           120               120           0       6.09 ms</pre>\n     <h3>🔁 Eventual consistency yahan kyun nahi?</h3>\n     <p>Phone par padha → 2 sec baad laptop par bhi \"read\" dikhna chahiye. Desktop par label lagaya → phone par. Eventual\n     consistency ka matlab: delete kiya mail 30 sec ke liye wapas dikhe, unread count ooper-neeche. Mail ke liye\n     manzoor nahi → <b>strong consistency</b>.</p>",
    `<h3>🌍 Spanner — "teen mein se do" ko toda</h3>
     <p>Purani kahawat: strong consistency, global distribution, scale — teen mein se do chuno. <b>Spanner</b> (Gmail
     isi par, exabytes) ne teeno diye: globally distributed, strongly consistent, poore ACID transactions. Order ke liye
     ghadiyan chahiye → DCs mein atomic clocks + GPS → <b>TrueTime</b> interval (kuch ms) → <b>commit wait</b>: timestamp
     har jagah "beet" chuka ho tab visible → bina central referee ke external consistency. (YouTube level mein iska lab.)</p>
     <h3>👤 Partition by user</h3>
     <p>Tumhara mailbox ek band potli hai jise zyadatar sirf tum chhoote ho → ek chunk. Logical mailbox physical jagah
     se alag (bade hon toh move — Instagram jaisa). Instagram feed ko 200 shards chhoone padte hain; tumhare mailbox ki
     request <b>ek</b> shard par.</p>
     <h3>⚖️ CAP mein Gmail ka faisla</h3>
     <p>Kai DCs/regions mein copies; ek <b>leader</b> writes coordinate karta hai; write tab poora jab kaafi copies
     maan lein. DC offline → doosri up-to-date copy leader, koi loss nahi. Partition aaye toh Gmail <b>consistency</b>
     chunta hai: kuch mailboxes thodi der ke liye unavailable — galat ya gayab mail se behtar.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ack pehle vs ack baad mein',
      project: '22-gmail',
      exercise: 'ex1-ack',
      goal: '200 mails, #120 ke baad site A giri — kitne mails "delivered" bol ke bhi kho gaye?',
      why: `<code>services/frontend.js</code>: <code>ACK=before</code> = site A par likh ke turant delivered, site B ko 80 ms baad
        background mein. <code>ACK=after</code> = dono sites par likhne ke baad hi delivered.`,
      steps: [
        { text: 'Stores + frontend chalao.', cmd: 'cd docker-labs/22-gmail && npm start ex1-ack', expect: 'ex1-ack\n[frontend] :4983 ACK=after' },
        { text: 'Dono modes chalao.', cmd: 'node tools/ack.js', expect: 'ack mode        user ko "delivered" bola   site B par asli mails   KHO GAYE   ack latency\nbefore                   120                      100           20      4.85 ms\nafter                    120                      120            0      6.09 ms' },
      ],
      observe: {
        q: '"before" mode mein 20 mails kho gaye, par sender ko error kyun nahi mila?',
        choices: ["Ack se pehle remote durability missing","Sender retry necessarily caused loss","Remote site confirmed every write","Network reorder deleted durable copies"],
        answer: 0,
        explain: 'Ack ek vaada hai. Jo vaada tum nibha nahi sakte (sirf ek copy), woh mat karo.',
       choiceExplanations: ["Ack ek vaada hai. Jo vaada tum nibha nahi sakte (sirf ek copy), woh mat karo.","Retry duplicate risk ho sakta hai; given loss crash window se hai.","Remote durable ack hota toh described failure scope mein loss contract different hota.","Network ordering alone already durable data delete nahi karti."] },
      lesson: '"Delivered" tabhi bolo jab durability ki shart poori ho — ~1 ms ki keemat 20 khoye mails se sasti hai.',
    },
    {
      type: 'quiz',
      title: 'Consistency ki samajh',
      questions: [
        {
          q: "Is mailbox lab ke eventual-consistency mode mein user-visible problem kya hai?",
          choices: ["Stale deletes and unread-state reversals","Only more disk space use hota","Only slower text rendering issue","Every operation must share one model"],
          answer: 0,
          explain: "Stale deletion/read-state replicas contradictory UI de sakti hain. Required consistency per operation define karo; entire current Gmail service ke every subsystem ko one universal strong-consistency contract assign mat karo.",
         choiceExplanations: ["Stale deletion/read-state replicas contradictory UI de sakti hain. Required consistency per operation define karo; entire current Gmail service ke every subsystem ko one universal strong-consistency contract assign mat karo.","Consistency user-visible mailbox state affect kar sakti hai.","Rendering speed and stale state semantics separate hain.","Search, counters and message mutations different contracts choose kar sakte hain."] },
        {
          q: 'Partition by user ka sabse bada faayda?',
          choices: ["Mailbox locality limits common read fanout","All global queries become single-shard","User key guarantees equal-sized tenants","Same shard guarantees authorization"],
          answer: 0,
          explain: 'Jo data saath padha jaata hai, woh saath rakho.',
         choiceExplanations: ["Jo data saath padha jaata hai, woh saath rakho.","Cross-user/admin queries still multiple shards touch kar sakti hain.","Large or hot mailboxes skew create kar sakte hain.","Colocation access control enforce nahi karti."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — durable writes',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Payment/mail jaisi cheez — client ko success kab bhejein?"',
        choices: ["Ack matches declared durability contract","Queue acceptance means workflow complete","Async write before durability is final","All workloads need same replication count"],
        answer: 0,
        explain: "Success acknowledgement chosen durability/failure-domain contract se match honi chahiye. Accepted queue work and completed payment/mail delivery different promises hain. Replication count, recovery objectives and latency budget explicit specify karo.",
       choiceExplanations: ["Success acknowledgement chosen durability/failure-domain contract se match honi chahiye. Accepted queue work and completed payment/mail delivery different promises hain. Replication count, recovery objectives and latency budget explicit specify karo.","Accepted request aur completed business operation alag states ho sakti hain.","Failure before durable write acknowledged data lose kar sakti hai.","Required failure domains and recovery objectives vary karte hain."] },
      {
        q: "Is lab mein strict mailbox mutation consistency required hai aur replicas partitioned hain. Kya tradeoff acceptable hai?",
        choices: ["Strict operation may wait or reject partition","Both sides write, strict single order free","Any stale reply satisfies strict freshness","Read-only label means network healed"],
        answer: 0,
        explain: "Strict operation ko quorum/authority unavailable hone par wait ya reject karna pad sakta hai. Product can separately offer clearly stale read-only behavior; CAP choice entire service ke every operation ka universal label nahi.",
       choiceExplanations: ["Strict operation ko quorum/authority unavailable hone par wait ya reject karna pad sakta hai. Product can separately offer clearly stale read-only behavior; CAP choice entire service ke every operation ka universal label nahi.","Partitioned independent writes strict invariant/order conflict kar sakti hain.","Stale data chosen freshness contract violate kar sakta hai.","Read-only serving degraded availability choice hai, healing proof nahi."] },
    ],
  },
  success: [
    'Main ack-before aur ack-after ka farq lab ke numbers se samjha sakta hoon',
    'Main strong consistency, Spanner aur partition by user ka tark de sakta hoon',
    'Main CAP mein Gmail ka faisla bata sakta hoon',
  ],
  homework: `<p>Apne system mein "success" kab bheja jaata hai, woh dhoondho (API response, event publish). Us pal data kitni
    jagah durable hota hai? Agar jawab "ek jagah" hai, toh likho: woh machine usi pal gire toh user ko kya pata chalega?</p>`,
  cards: [
    { front: 'Ack-before ka khatra?', back: 'Ek copy likh ke "delivered" → background replication se pehle site giri → mail gaya, sender ko lagta hai pahunch gaya. Lab: 20 khoye.' },
    { front: 'Gmail strong consistency kyun?', back: 'Eventual = delete kiya mail wapas dikhe, unread count flicker. Mail mein manzoor nahi. Spanner + TrueTime se global strong consistency.' },
    { front: 'Gmail CAP mein kya chunta hai?', back: 'Consistency — partition mein kuch mailboxes thodi der unavailable, galat/gayab mail se behtar. Leader + majority commit, failover bina loss.' },
  ],
},

/* =====================================================================
   3. gmail-search-hot
   ===================================================================== */
{
  id: 'gmail-search-hot',
  icon: '🔥',
  title: '2 arab private search engines aur garam-thanda data',
  badge: 'Hot-Cold Hakeem',
  objectives: [
    'Web search vs Gmail search — ek shared vs arabon private indexes',
    'Freshness: mail aate hi searchable',
    'Hot metadata vs cold bodies — storage ko use ke hisaab se',
    'Lazy fetch aur active mailboxes ka cache',
  ],
  lesson: [
    `<h3>🔍 Ek bada index vs 2 arab chhote</h3>
     <p>Web search ek bahut bada <b>saajha</b> index hai. Gmail mein ~<b>2 arab private</b> indexes — har ek diwaar se
     band (tumhara mail koi aur search na kar sake), har ek hamesha badhta hua. Mushkil "ek index bada banana" nahi,
     <b>arab indexes ko sasta chalana</b> hai.</p>
     <p>Aur freshness: web ka index 5 minute peeche chal jaata hai. Email aate hi searchable chahiye ("OTP wala mail
     dhoondho") → raat ka batch nahi, <b>real-time per-user indexing</b>.</p>
     <h3>🔥 Garam vs 🧊 thanda</h3>
     <p>Mailbox mein do tarah ka data:</p>
     <table>
       <tr><th></th><th>🔥 Hot metadata</th><th>🧊 Cold content</th></tr>
       <tr><td>Kya</td><td>Subject, sender, labels, read flag, thread position, index entries</td><td>Body, 10 MB PDF, photos, videos</td></tr>
       <tr><td>Size</td><td>Chhota</td><td>Bada</td></tr>
       <tr><td>Kitni baar</td><td>Har screen par</td><td>Sirf mail kholne par</td></tr>
       <tr><td>Kahan</td><td>Tez, mehenga, strongly consistent DB (ms)</td><td>Sasta, ghana bulk storage</td></tr>
     </table>`,
    `<h3>🦥 Lazy fetch</h3>
     <p>Gmail kholo → sirf hot metadata ki query (haal ka ek tukda). Body tab laao jab <b>woh</b> mail kholo. Active
     mailboxes serving layer ke paas cache. Yahi Dropbox ka tiering bhi hai: jo baar-baar chahiye woh mehenge tez tier
     mein, baaki sasta.</p>
     <p>Kyun zaroori? Gmail "sab hamesha rakho" ka vaada karta hai — duniya ke email ka ek bada hissa, zyadatar kabhi
     dobara nahi khula. Agar sab tez storage mein rakha toh kharcha pahaad. Agar sab sasta storage mein toh har screen
     dheemi.</p>
     <p class="tip">🎯 <b>Storage ko use se milao.</b> Ek hi cheez ke do hisse ho sakte hain jinka use bilkul alag hai —
     unhe alag jagah rakho.</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Garam-thanda batwara',
      instructions: 'Kitna data tez tier mein rakho, body kab laao — kharcha aur inbox ki speed dekho.',
      goal: 'Inbox load <b>200 ms se kam</b>, storage kharcha <b>₹40 per user/saal se kam</b>, aur mail kholne par body <b>1 sec se kam</b> mein.',
      scenario: "Ek average mailbox: 15 GB (99% bodies/attachments, 1% metadata). Tez tier ₹20/GB/saal, sasta tier ₹1.5/GB/saal.\n        Tum tay karo kya tez tier mein jaata hai.",
      knobs: [
        { id: 'hotpct', label: 'Data ka kitna % tez tier mein', min: 1, max: 100, step: 1, value: 100, unit: '%', note: '1% = sirf metadata; 100% = sab kuch.' },
        { id: 'lazy', label: 'Body kab laao (0 = inbox ke saath, 1 = mail kholne par)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Lazy fetch.' },
        { id: 'recent', label: 'Haal ke mails ki bodies bhi tez tier mein (din)', min: 0, max: 90, step: 15, value: 0, unit: ' din', note: 'Jo abhi aaye, woh zyada khule jaate hain.' },
      ],
      readouts: k => {
        const m = gmailModel(k);
        return [
          { label: 'Inbox load', value: m.inbox + ' ms', tone: m.inbox < 200 ? 'ok' : 'bad' },
          { label: 'Storage kharcha / user / saal', value: '₹' + m.cost, tone: m.cost < 40 ? 'ok' : 'bad' },
          { label: 'Mail kholne par body (p90)', value: m.open + ' ms', tone: m.open < 1000 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = gmailModel(k);
        return [
          { label: 'Kharcha', pct: Math.min(100, m.cost / 3.2), text: '₹' + m.cost, tone: m.cost < 40 ? 'ok' : 'bad' },
          { label: 'Inbox load', pct: Math.min(100, m.inbox / 20), text: m.inbox + ' ms', tone: m.inbox < 200 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = gmailModel(k);
        if (m.cost >= 40) return { ok: false, text: `₹<b>${m.cost}</b> per user — 1.8 arab users × yeh = pahaad. Bodies ko sasta tier mein bhejo.` };
        if (m.inbox >= 200) return { ok: false, text: `Inbox <b>${m.inbox} ms</b> — har screen par bodies bhi kheench rahe ho. Lazy fetch chalu karo.` };
        if (m.open >= 1000) return { ok: false, text: `Mail kholne par <b>${m.open} ms</b> — haal ke mails ki bodies tez tier mein rakho, wahi sabse zyada khulte hain.` };
        return { ok: true, text: `Inbox <b>${m.inbox} ms</b>, kharcha ₹<b>${m.cost}</b>, body <b>${m.open} ms</b>. Metadata garam, haal ki bodies garam, baaki thanda — yahi Gmail ka tareeka.` };
      },
      check: k => { const m = gmailModel(k); return m.inbox < 200 && m.cost < 40 && m.open < 1000; },
      lesson: `Teen knob, teen alag cheezein: <b>tier</b> kharcha tay karta hai, <b>lazy fetch</b> inbox ki speed, aur
        <b>haal ke mails</b> kholne ki speed. Use ke hisaab se batwara.`,
      quiz: {
        q: 'Sab kuch tez tier mein rakhna (100%) kyun galat hai jab speed sabse achhi hai?',
        choices: ["Cold bodies ka low reuse vs premium cost","Fast tier violates message consistency","Search requires every body in RAM","More storage always lowers latency"],
        answer: 0,
        explain: 'Storage ko use se milao — "sab hamesha" ke vaade ke saath yeh zaroori hai.',
       choiceExplanations: ["Storage ko use se milao — \"sab hamesha\" ke vaade ke saath yeh zaroori hai.","Storage temperature consistency protocol ka direct definition nahi.","Indexes and selective fetch bodies ko separate kar sakte hain.","Capacity, cache locality and latency economics independently measure karo."] },
    },
    {
      type: 'quiz',
      title: 'Search ki samajh',
      questions: [
        {
          q: 'Gmail search web search se mushkil kyun?',
          choices: ["Private scope and fresh mutable indexes","Email must be longer than web pages","Web search needs no access control","One global index is always impossible"],
          answer: 0,
          explain: 'Isolation + freshness + scale ek saath.',
         choiceExplanations: ["Isolation + freshness + scale ek saath.","Document length alone indexing difficulty explain nahi karti.","Public/private search products authorization constraints vary karte hain.","Global filtered index valid architecture ho sakti hai; tradeoffs evaluate karo."] },
        {
          q: 'Mail aate hi searchable kyun hona chahiye?',
          choices: ["OTP/ticket workflow needs fresh search","Backup policy requires instant indexing","Spam filter cannot operate without search","Every search product needs zero lag"],
          answer: 0,
          explain: 'Freshness product ki zaroorat se tay hoti hai.',
         choiceExplanations: ["Freshness product ki zaroorat se tay hoti hai.","Backup recovery and search visibility separate contracts hain.","Spam classification and user search independent pipelines ho sakte hain.","Freshness requirement actual user task se derive karo."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — storage tiering',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara chat app har message ke attachments bhi primary DB mein rakhta hai. DB bahut mehenga ho gaya."',
        choices: ["Hot metadata, durable blob pointer, lazy fetch","Only enlarge primary DB indefinitely","Delete attachments without retention policy","Compress bodies, ignore storage access shape"],
        answer: 0,
        explain: 'Gmail/Dropbox ka garam-thanda pattern.',
       choiceExplanations: ["Gmail/Dropbox ka garam-thanda pattern.","Vertical capacity can buy time; large blobs and small metadata differ in access needs.","Retention/ownership policy preserve karni hogi.","Compression useful hai; transactional hot-set isolation still assess karo."] },
      {
        q: "Mailbox-local access dominant aur fresh search required hai. Private indexes ko scale karne ka is design mein locality-focused option?",
        choices: ["Mailbox-local index with incremental updates","Global filter index has zero tradeoffs","Night batch meets instant-search target","Inactive mailbox search permanently off"],
        answer: 0,
        explain: "Mailbox-local partitions co-locate state and index. Global index with strict authorization is also possible; partition locality, freshness, hot-user skew and operational overhead compare karo, global filter ko automatically privacy leak mat maano.",
       choiceExplanations: ["Mailbox-local partitions co-locate state and index. Global index with strict authorization is also possible; partition locality, freshness, hot-user skew and operational overhead compare karo, global filter ko automatically privacy leak mat maano.","Global design can work but isolation, locality and fanout need explicit analysis.","Batch refresh required freshness miss kar sakti hai.","Cold storage slower ho sakti hai; data/search availability contract preserve karo."] },
    ],
  },
  success: [
    'Main Gmail search ki mushkil (isolation + freshness + scale) samjha sakta hoon',
    'Main hot/cold split aur lazy fetch design kar sakta hoon',
    'Main storage ko use ke hisaab se baant sakta hoon',
  ],
  homework: `<p>Apne sabse bade table ke columns do list mein baanto: har screen par chahiye (hot) vs kabhi-kabhi (cold). Cold
    columns ka size kitna %? Unhe alag storage mein bhejne se primary DB kitna chhota hoga?</p>`,
  cards: [
    { front: 'Gmail search ki mushkil?', back: '~2 arab private indexes, har ek hamesha badhta, mail aate hi searchable. Ek bada index nahi — arabon chhote, sasta chalana.' },
    { front: 'Hot vs cold (Gmail)?', back: 'Hot: subject, sender, labels, flags, thread, index — tez consistent DB. Cold: bodies, attachments — sasta bulk storage, kholne par lazy fetch.' },
    { front: '"Storage ko use se milao"?', back: 'Jo har screen par chahiye woh tez tier; jo kabhi-kabhi woh sasta. Ek cheez ke do hisse alag jagah ho sakte hain.' },
  ],
},

/* =====================================================================
   4. gmail-delivery
   ===================================================================== */
{
  id: 'gmail-delivery',
  icon: '📨',
  title: 'Mail aana — SMTP retries, dedup aur refcount',
  badge: 'Message-ID Mahant',
  objectives: [
    'Ack se pehle Gmail kya-kya karta hai',
    'SMTP "at least once" → Message-ID se idempotent delivery',
    'Attachment dedup + refcount — delete karne par jagah kyun nahi chhoot-ti',
    'Gmail vs WhatsApp: mushkil hissa kahan rahe',
  ],
  lesson: [
    `<h3>📥 "250 OK" se pehle</h3>
     <p>Doosra mail server SMTP se mail bhejta hai. Gmail "OK" bolne se pehle: durable replicated write, spam/security
     checks, filters aur labels, index update, devices ko push. Sender ko saaf "OK" nahi mila → woh <b>dobara</b> poora
     mail bhejta hai (SMTP ka niyam). Scale par ACK raaste mein khote rehte hain → <b>duplicates lagatar</b>.</p>
     <p>Ilaaj: <b>idempotent delivery</b> — har mail ka <code>Message-ID</code> yaad rakho; dobara aaya toh "ye toh pehle
     hi aa chuka" → mailbox mein dobara nahi.</p>
     <pre>lab 22 (ex2-smtp) — 500 mails, 20% ACK kho jaate hain:
Message-ID check   retry hue   inbox mein   DUPLICATE
nahi                  114         614          114
haan                  146         500            0</pre>
     <p class="tip">🎯 SMTP mein uncertain acknowledgement ke baad retry duplicates la sakti hai; retries finite hote hain, universal delivery guarantee nahi. Receiver ka dedup/effect atomic contract repeated processing ko control karta hai.</p>`,
    "<h3>📎 5 MB PDF, 10,000 logon ko</h3>\n     <p>HR ne 10,000 employees ko 5 MB PDF bheja; newsletter crore logon ko. Content ka <b>fingerprint</b> (hash) lo,\n     ek baar store karo, har mailbox usi saajhi copy ka reference rakhe (WhatsApp videos jaisa). \"Sab hamesha rakho\" ke\n     vaade ke saath yeh zaroorat hai, luxury nahi.</p>\n     <pre>lab 22 (ex3-attachments):\ndedup   10,000 logon ke baad   1 delete → chhoota   baaki 9,999 delete → chhoota\nnahi         48.83 GB                5 MB               48.82 GB\nhaan          5 MB                   0 MB                5 MB</pre>\n     <p>Isi liye bada mail delete karne par storage turant nahi chhoot-ta — jagah <b>aakhri reference</b> jaane par hi\n     khaali hoti hai.</p>\n     <h3>⚖️ Gmail vs WhatsApp — mushkil hissa kahan?</h3>\n     <p>WhatsApp lagbhag kuch nahi rakhta → chhote sasta simple servers, mushkil hissa arab phones par. Gmail sab rakhta\n     hai → hamesha chadhta data pahaad (zyadatar kabhi nahi khulta), strong consistency ki latency, aur hamesha ki\n     complexity (global DB, atomic clocks, per-user real-time indexes, failover). Video ka sawaal: <b>\"mushkil hissa\n     kahan rehna chahiye?\"</b></p>\n     <h3>📋 Paanch sabak</h3>\n     <ol>\n       <li>Product faisla = bhes badla architecture faisla.</li>\n       <li>\"Sab rakho\" ya \"kuch mat rakho\" — jaldi tay karo.</li>\n       <li>Storage ko use se milao (hot/cold).</li>\n       <li>Galat hona maaf nahi → strong consistency ki keemat do.</li>\n       <li>Boring guarantees sabse zaroori — sirf tootne par dikhti hain.</li>\n     </ol>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ACK kho gaye, mail dobara aaye',
      project: '22-gmail',
      exercise: 'ex2-smtp',
      goal: '500 mails, 20% ACK raaste mein gum — Message-ID check ke bina aur saath inbox mein kitne duplicate?',
      why: `<code>services/mx.js</code> mail le leta hai par 20% baar "250 OK" gum kar deta hai (connection tod ke). Bhejne wala retry karta hai.
        <code>IDEMPOTENT=1</code> → Message-ID dekh ke dobara nahi daalta.`,
      steps: [
        { text: 'MX server chalao.', cmd: 'cd docker-labs/22-gmail && npm start ex2-smtp', expect: 'ex2-smtp\n[mx] :4984 idempotent=false lose_ack=0.2' },
        { text: 'Dono modes.', cmd: 'node tools/smtp.js', expect: 'Message-ID check   bheje   retry hue   receiver ke inbox mein   DUPLICATE\nnahi                 500         114                    614         114\nhaan                 500         146                    500           0' },
      ],
      observe: {
        q: 'Mail toh pahunch gaya tha, phir sender ne dobara kyun bheja?',
        choices: ["Lost final ack left sender uncertain","SMTP transport guarantees no duplicates","Received bytes prove final sender ack","Retry means sender implementation broken"],
        answer: 0,
        explain: 'At-least-once ka yahi matlab hai. Dedup receiver ka kaam.',
       choiceExplanations: ["At-least-once ka yahi matlab hai. Dedup receiver ka kaam.","Final reply loss ke baad retry duplicate delivery create kar sakta hai.","Receiver processing and sender observing success different events hain.","Uncertain outcome retry protocol behavior ka part hai."] },
      lesson: 'Retry wale duniya mein har receiver ko idempotent hona chahiye — ek pehchaan (Message-ID) se.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — 10,000 logon ko same attachment',
      project: '22-gmail',
      exercise: 'ex3-attachments',
      goal: '5 MB PDF 10,000 mailboxes mein — dedup ke bina aur saath storage, aur delete karne par kitna chhoota.',
      why: `<code>services/blobstore.js</code>: <code>DEDUP=1</code> → content ka SHA-256 hi naam; same file dobara aayi toh sirf refcount++;
        delete = refcount−−, 0 hone par hi bytes free.`,
      steps: [
        { text: 'Blobstore chalao.', cmd: 'cd docker-labs/22-gmail && npm start ex3-attachments', expect: 'ex3-attachments\n[blobstore] :4985 dedup=true' },
        { text: 'Dono modes.', cmd: 'node tools/attach.js', expect: 'nahi         48.83 GB   10000 object(s)        5 MB        48.82 GB\nhaan             5 MB   1 object(s)            0 MB            5 MB' },
      ],
      observe: {
        q: 'Dedup mode mein ek banda delete kare toh 0 MB kyun chhoota?',
        choices: ["Other references still retain shared blob","Delete necessarily failed silently","Every ref deletion frees full object","Logical quota equals physical bytes always"],
        answer: 0,
        explain: 'Saajhi copy ka matlab: kisi ek ka delete sirf uska reference hataata hai.',
       choiceExplanations: ["Saajhi copy ka matlab: kisi ek ka delete sirf uska reference hataata hai.","Reference removal successful ho sakta hai without deleting shared bytes.","Remaining references object alive rakhte hain.","Logical ownership and physical dedup accounting separate hain."] },
      lesson: 'Content-addressed dedup: storage 10,000× kam — aur "delete = jagah khaali" ki maanyata toot jaati hai.',
    },
  ],
  interview: {
    title: 'Interview Round — delivery semantics',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Webhook provider same event 2–3 baar bhejta hai. Kaise sambhaloge?"',
        choices: ["Atomic dedup plus business effect contract","Mark seen before effect, no recovery","Only timestamp window deduplicates","Queue name prevents duplicate processing"],
        answer: 0,
        explain: "Dedup identity check and same-store effect ko one atomic transaction mein commit karo. External effects ke liye idempotency contract/outbox/recovery use karo. Pehle mark-seen aur baad mein unprotected effect crash par work lose kar sakta hai.",
       choiceExplanations: ["Dedup identity check and same-store effect ko one atomic transaction mein commit karo. External effects ke liye idempotency contract/outbox/recovery use karo. Pehle mark-seen aur baad mein unprotected effect crash par work lose kar sakta hai.","Crash after mark-seen before effect permanently work skip kar sakta hai.","Different events same window mein aa sakte hain; retries late bhi ho sakti hain.","Queue redelivery possible hai; consumer transaction/idempotency chahiye."] },
      {
        q: 'Interviewer: "Users complain karte hain ki bade mails delete karne par storage quota kam nahi hota."',
        choices: ["Logical quota, shared physical refcounts","User quota only final ref par reduce","Delete every shared blob immediately","Quota and storage must match exactly"],
        answer: 0,
        explain: 'Logical (user ka) aur physical (disk ka) size alag cheezein hain.',
       choiceExplanations: ["Logical (user ka) aur physical (disk ka) size alag cheezein hain.","User-visible accounting per-user references se policy ke mutabik update ho sakti hai.","Immediate shared deletion other users ka content lose kar sakti hai.","Dedup and retention logical/physical byte counts separate banate hain."] },
    ],
  },
  success: [
    'Main Message-ID se idempotent delivery design kar sakta hoon',
    'Main content dedup aur refcount ka asar samjha sakta hoon',
    'Main "mushkil hissa kahan rahe" ke hisaab se Gmail aur WhatsApp ka farq bata sakta hoon',
  ],
  homework: `<p>Apne system ka ek endpoint lo jise koi retry kar sakta hai (payment, webhook, order create). Kya usme ek unique
    request/event ID hai? Agar same request 3 baar aaye toh kya 3 baar kaam hoga? Idempotency key ka design likho.</p>`,
  cards: [
    { front: 'SMTP duplicates kyun?', back: 'ACK raaste mein khoya → sender poora mail dobara bhejta hai (at-least-once). Lab: 20% ACK loss → 114 duplicates; Message-ID dedup → 0.' },
    { front: 'Attachment dedup?', back: "Content hash = naam; same file dobara → refcount++. Lab: 10,000 × 5 MB = 48.83 GB → 5 MB. Delete par jagah aakhri reference par hi." },
    { front: 'Gmail vs WhatsApp?', back: 'WhatsApp kuch nahi rakhta → server sasta, mushkil phones par. Gmail sab rakhta → data pahaad, strong consistency, global DB. "Mushkil hissa kahan rahe?"' },
  ],
},
]);

/* Toy model — 15 GB mailbox, 1% metadata. Tez tier ₹20/GB/saal, sasta ₹1.5/GB/saal. */
function gmailModel(k) {
  const size = 15, meta = 0.15;
  const hotGB = Math.max(meta, size * k.hotpct / 100) + (k.recent / 90) * 0.9;
  const coldGB = Math.max(0, size - hotGB);
  const cost = Math.round(hotGB * 20 + coldGB * 1.5);
  const inbox = k.lazy ? 90 : 90 + Math.round(1200 * (1 - Math.min(1, k.hotpct / 100)) + 150);
  const hotBodies = Math.min(1, k.hotpct / 100 + (k.recent > 0 ? 0.6 + k.recent / 300 : 0));
  const open = Math.round(120 * hotBodies + 1800 * (1 - hotBodies));
  return { cost, inbox, open };
}

})();
