(() => {
/* =====================================================================
   TRACK 5 — Distributed Data & Consistency
   cap · eventual · dbperservice · querying · saga · outbox ·
   exactlyonce · scheduling · locks · boss-dist
   ===================================================================== */

const T_SCHED = [
  { text: 'Polling wali query ka plan dekho — poori table scan',
    check: s => s.records.some(r => r.kind === 'explain' && !r.indexUsed && r.rowsExamined > 1000000) },
  { text: 'reminder_at par index banao',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols.includes('reminder_at')) },
  { text: 'Ab scheduled-event wali query ka plan dekho',
    check: s => { const i = s.records.findIndex(r => r.kind === 'index' && r.op === 'create');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'explain' && r.indexUsed); } },
  { text: 'Due reminders uthao — 5000 se kam rows chhuni chahiye',
    check: s => s.records.some(r => r.kind === 'explain' && r.indexUsed && r.rowsExamined < 5000) },
];

const T_ONCE = [
  { text: 'Idempotency on karo',
    check: s => s.records.some(r => r.kind === 'sim' && /idempotency/.test(r.path || '') && r.value === true) },
  { text: 'Ek message process karo (dedupe key ke saath)',
    check: s => s.records.some(r => r.kind === 'http' && r.idem === 'new') },
  { text: 'Wahi message dobara aaya — duplicate NAHI banna chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.idem === 'replay') },
];

const T_BOSS_DIST = [
  { text: 'Order banao — idempotency key ke saath',
    check: s => s.records.some(r => r.kind === 'sim' && /idempotency/.test(r.path || '') && r.value === true) },
  { text: 'Client ne retry kiya — duplicate order nahi banna chahiye',
    check: s => s.records.some(r => r.kind === 'http' && r.idem === 'replay') },
  { text: 'Read model ke liye index banao (cross-service query)',
    check: s => s.records.some(r => r.kind === 'index' && r.op === 'create' && r.cols.length >= 2) },
  { text: 'Read model query ka plan dekho — ek tez query honi chahiye',
    check: s => s.records.some(r => r.kind === 'explain' && r.indexUsed) },
];

SD.registerLevels('dist', [

/* ===================================================================== */
{
  id: 'cap',
  icon: '🌐',
  title: 'CAP — Partition Mein Tum Kya Chunoge?',
  badge: 'Tradeoff Reader',
  objectives: [
    'P optional nahi hai — asli sawaal C ya A ka hai',
    'CP aur AP kahan-kahan sahi hain',
    '<b>PACELC</b> — normal din ka faisla',
    'Yeh faisla <b>per-operation</b> hai, per-system nahi',
  ],
  lesson: [
    `<h3>📖 "Teen mein se do" wali baat adhoori hai</h3>
     <p>CAP ko aksar aise padhaya jaata hai: "Consistency, Availability,
     Partition tolerance — teen mein se do chuno." Yeh galat framing hai.</p>
     <p><b>P optional nahi hai.</b> Network toot-ta <b>hai</b> — cable kate,
     switch mare, ek datacenter alag ho jaaye. Tum "P nahi chunte" nahi kar
     sakte; woh tumhare saath ho jaata hai.</p>
     <p>Toh asli sawaal yeh hai:</p>
     <pre>"Jab partition ho jaaye, tab tum kya karoge?"

CP → ERROR do          "abhi nahi bata sakta"
AP → PURANA data do    "shayad thoda purana hai"</pre>
     <table>
       <tr><th>CP sahi hai jahan</th><th>AP sahi hai jahan</th></tr>
       <tr><td>bank balance</td><td>product catalog</td></tr>
       <tr><td>inventory / aakhri seat</td><td>social feed</td></tr>
       <tr><td>permissions</td><td>recommendations</td></tr>
       <tr><td>unique username</td><td>analytics dashboards</td></tr>
     </table>
     <p>Dhyaan do: yeh dono cheezein <b>ek hi app</b> mein ho sakti hain.
     Isliye "hum ek AP system hain" bolna adhoora hai — <b>faisla
     per-operation hota hai</b>.</p>`,
    `<h3>🔬 PACELC — jo har din kaam aata hai</h3>
     <pre>if (P)artition  → (A)vailability ya (C)onsistency
(E)lse          → (L)atency ya (C)onsistency</pre>
     <p>Doosra hissa zyada kaam ka hai, kyunki partition <b>kabhi-kabhi</b>
     hota hai — par latency-vs-consistency ka faisla tumhe <b>har request
     par</b> lena padta hai:</p>
     <pre>Replica se padhun?   tez (2 ms) par shayad 500 ms purana
Primary se padhun?   sahi par dheema, aur primary par load</pre>
     <p>Yeh wahi read-after-write wala sawaal hai jo Data track mein tha —
     bas ab uska naam pata hai.</p>
     <p class="tip">🎯 Interview mein CAP ka naam lena aasan hai. Farak
     <b>PACELC</b> aur <b>per-operation</b> wali baat se padta hai:
     "checkout ke liye main CP chunuunga, catalog ke liye AP — aur normal
     din mein catalog replica se padhunga kyunki wahan latency zyada matter
     karti hai."</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'CP ya AP?',
      instructions: 'Har operation ke liye partition ke waqt kya chunoge?',
      bins: [
        { id: 'cp', label: '🔒 CP — error do' },
        { id: 'ap', label: '🟢 AP — purana data do' },
      ],
      items: [
        { text: 'ATM se paisa nikalna', bin: 'cp', explain: 'Purana balance = overdraft. Do ATM se ek saath nikaal liya toh bank ka paisa gaya. Yahan error dena hi sahi hai.' },
        { text: 'Product catalog dikhana', bin: 'ap', explain: 'Product ka description 30 second purana ho toh kya farak? Kuch na dikhane se hazaar guna behtar hai.' },
        { text: 'Concert ki aakhri seat book karna', bin: 'cp', explain: 'Double booking ek asli business problem hai — refund, apology, reputation. Error dena sasta hai.' },
        { text: 'Social media feed', bin: 'ap', explain: 'Ek post 10 second baad dikhe toh kisi ko farak nahi padta. Feed ka na dikhna bahut bura hai.' },
        { text: 'User ki permissions check karna', bin: 'cp', explain: 'Nikaale gaye employee ka access purana data se abhi bhi chal jaaye — yeh security incident hai.' },
        { text: '"Aapke liye" recommendations', bin: 'ap', explain: 'Purani recommendations bilkul theek hain. Yeh optional feature hai — iski wajah se page nahi girna chahiye.' },
        { text: 'Naya username register karna', bin: 'cp', explain: 'Uniqueness ke liye ek hi sach chahiye. Partition mein do log ek naam le lenge — aur baad mein us conflict ko theek karna bahut mushkil hai.' },
        { text: 'View count dikhana', bin: 'ap', explain: '"1.2M views" aur "1.19M views" mein koi farak nahi. Approximate hona bilkul theek hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'CAP par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'cap',
      questions: [
        { q: 'Kaunsa hissa OPTIONAL nahi hai?', target: 'p', explain: 'Partition tolerance. Network toot-ta HAI — tum "P nahi chunte" nahi kar sakte. Isliye asli sawaal C ya A ka hai.' },
        { q: 'Normal din ke faisle (partition ke bina) ka framework?', target: 'pacelc', explain: 'PACELC. Else branch: Latency ya Consistency — "replica se padhun (tez, purana) ya primary se (sahi, dheema)?" Yeh har din ka sawaal hai.' },
        { q: 'CAP ke baare mein sabse aam galtfehmi kaunsi hai?', target: 'perop', explain: 'Ki yeh poore system ka faisla hai. Woh PER-OPERATION hota hai — ek hi app mein balance CP aur catalog AP ho sakta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'CAP ki samajh',
      questions: [
        {
          q: '"Teen mein se do chuno" wali baat mein kya galat hai?',
          choices: ["Partition: linearizability vs availability","P ko ignore karne se network safe","CAP every normal request latency bataye","C, A, P teen independent product toggles"],
          answer: 0,
          explain: "CAP partitions ke dauraan linearizable consistency aur every non failed-node request availability ki tension define karta hai. Partition occurrence optional product feature nahi. Normal operation mein latency/consistency tradeoffs separate hain.",
         choiceExplanations: ["CAP partitions ke dauraan linearizable consistency aur every non failed-node request availability ki tension define karta hai. Partition occurrence optional product feature nahi. Normal operation mein latency/consistency tradeoffs separate hain.","Distributed network partition possibility product checkbox se remove nahi hoti.","CAP partition behavior theorem hai; normal-operation latency separate tradeoff.","P event ke dauraan linearizability aur total availability simultaneously guarantee impossible."] },
        {
          q: '"Hum ek AP system hain" — is baat mein kya adhoora hai?',
          choices: ["Operation and failure scope define karo","AP means every read permanently wrong","AP proves every business invariant safe","One app ka every endpoint same policy"],
          answer: 0,
          explain: "AP label alone operation/invariant/failure model specify nahi karta. Catalog staleness acceptable ho sakti hai; money operations coordination, reservations or other protocols require kar sakti hain. Whole app ek uniform consistency checkbox nahi.",
         choiceExplanations: ["AP label alone operation/invariant/failure model specify nahi karta. Catalog staleness acceptable ho sakti hai; money operations coordination, reservations or other protocols require kar sakti hain. Whole app ek uniform consistency checkbox nahi.","Availability-oriented operation eventual convergence support kar sakti hai.","Some invariants coordination require karte hain; AP label enough nahi.","Different operations risk/consistency requirements alag rakh sakti hain."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — CAP',
    instructions: 'Yahan theory ratna aasan hai — apply karna alag baat hai. 🎤',
    questions: [
      {
        q: '"CAP theorem samjhao aur batao apne system mein kya chunoge."',
        choices: ["Partition behavior aur operation contract bolo","Always choose CA by buying better network","Always choose AP for all money operations","Always choose CP for all catalog reads"],
        answer: 0,
        explain: "Partition ke waqt CAP consistency vs availability contract explain karo. Normal operation mein latency/consistency bhi tradeoff ho sakti hai(PACELC). Checkout automatically CP and catalog automatically AP universal rule nahi; business invariants and operation guarantees specify karo.",
       choiceExplanations: ["Partition ke waqt CAP consistency vs availability contract explain karo. Normal operation mein latency/consistency bhi tradeoff ho sakti hai(PACELC). Checkout automatically CP and catalog automatically AP universal rule nahi; business invariants and operation guarantees specify karo.","Better network partition probability reduce karta hai; theorem waive nahi karta.","Money invariants may need coordination/reservations/escrow contract.","Catalog reads may tolerate stale results; universal CP mandate nahi."] },
    ],
  },
  success: [
    'Bata sakte ho ki P optional kyun nahi hai',
    'CP aur AP operations mein baant sakte ho',
    'PACELC ka else-branch samjha sakte ho',
    'Per-operation soch apply kar sakte ho',
  ],
  homework: `Apne product ke 10 operations list karo. Har ek ke saamne CP ya AP likho.
    Phir dekho: kya tumhara system unhe waise hi treat karta hai? Aksar sab kuch
    ek hi tarah handle hota hai — jo kisi ek group ke liye galat hai.`,
  cards: [
    { front: 'CAP ka sahi framing?', back: '<b>P optional nahi hai</b> — network toot-ta hai. Asli sawaal: <b>partition ke waqt C chunoge ya A?</b> "Teen mein se do" adhoora hai.' },
    { front: 'CP vs AP kahan?', back: '<b>CP:</b> balance, inventory, permissions, unique username. <b>AP:</b> catalog, feed, recommendations, view counts.' },
    { front: 'PACELC?', back: 'if <b>P</b>artition → A ya C; <b>E</b>lse → <b>L</b>atency ya <b>C</b>onsistency. Doosra hissa roz kaam aata hai: "replica se padhun ya primary se?"' },
    { front: 'CAP ki sabse aam galatfehmi?', back: 'Ki yeh <b>poore system</b> ka faisla hai. Woh <b>per-operation</b> hota hai — ek hi app mein balance CP aur catalog AP.' },
  ],
},

/* ===================================================================== */
{
  id: 'eventual',
  icon: '⏳',
  title: 'Eventual Consistency — Asli Kaam UX Mein Hai',
  badge: 'UX Consistency',
  objectives: [
    '"System sahi tha, UX galat tha"',
    'Chaar UX patterns jo eventual consistency ko chhupa dete hain',
    'Kahan eventual bilkul nahi chalega',
    'Read-your-own-writes',
  ],
  lesson: [
    `<h3>📖 Ek bug jo bug nahi tha</h3>
     <pre>t0  user ne profile photo badli     → primary par likha ✅
t1  page reload                     → replica se padha, PURANI photo
t2  "save nahi hua?" → dobara upload → ab do photos 😡
t3  2 second baad sab sync           → par user ja chuka hai</pre>
     <p>System ne kuch galat nahi kiya. Replication lag 2 second tha, jo
     bilkul normal hai. <b>Galti UX mein thi</b> — user ko woh state dikhayi
     gayi jo uske apne action se mel nahi khaati thi.</p>
     <p>Eventual consistency ki asli mushkil technical nahi, <b>product</b>
     ki hai. Aur uske chaar standard ilaaj hain.</p>`,
    `<h3>🔬 Chaar UX patterns</h3>
     <p><b>1. Read-your-own-writes.</b> Sabse zaroori. User ko <b>apna</b>
     data hamesha fresh dikhna chahiye; doosron ka thoda purana chalega.
     Implementation: write ke baad kuch second us user ke reads primary se
     (sticky), ya session mein write timestamp rakho aur replica ko utna
     catch-up karne do.</p>
     <p><b>2. Optimistic UI.</b> UI mein turant dikha do (jaise woh ho gaya),
     background mein confirm karo. Fail ho toh saaf batao aur wapas lo.
     WhatsApp ka single-tick isi ka roop hai.</p>
     <p><b>3. Pending state dikhao.</b> Chhupao mat — batao.</p>
     <pre>"Processing…"  ·  "Sync ho raha hai"  ·  "2 ghante purana data"</pre>
     <p><b>4. Version / conflict handling.</b> Do log ek saath edit karein
     toh kya? Last-write-wins sabse aasan hai aur sabse zyada data khota hai.
     Behtar: version check karke <code>409 Conflict</code>, ya merge.</p>
     <h3>🚫 Kahan eventual NAHI chalega</h3>
     <pre>❌ Paisa nikaalna       do ATM, purana balance = overdraft
❌ Aakhri seat/item     double booking
❌ Permissions revoke   nikaala hua user abhi bhi andar
❌ Unique username      do log, ek naam</pre>
     <p class="tip">🎯 In sab mein ek baat common hai: <b>galti ko baad mein
     theek karna mehenga ya namumkin hai.</b> Yahi asli test hai —
     "agar do jagah alag jawab mila, toh usse theek karna kitna mehenga hoga?"
     Sasta hai toh eventual chalega. Mehenga hai toh strong chahiye.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Problem se UX pattern',
      instructions: 'Har halat ko sahi pattern se jodo.',
      pairs: [
        { left: '📸 User ne photo badli, reload par purani dikhi', right: 'Read-your-own-writes — apna data primary se', explain: 'Sabse zaroori pattern. Apna data hamesha fresh; doosron ka replica se chalega.' },
        { left: '❤️ Like button dabaya, 300ms baad update hua', right: 'Optimistic UI — turant dikha do, background mein confirm', explain: 'User ko turant feedback milta hai. Fail ho toh saaf batao aur wapas lo.' },
        { left: '📤 Bulk import chal raha hai, user confuse hai', right: 'Pending state dikhao — "Processing…"', explain: 'State chhupao mat. Ek user jo jaanta hai ki kaam chal raha hai, woh dobara try nahi karega.' },
        { left: '✍️ Do log ek hi document edit kar rahe hain', right: 'Version check → 409 Conflict ya merge', explain: 'Last-write-wins sabse aasan hai aur sabse zyada data khota hai. Version se conflict dikhta hai.' },
        { left: '💰 Balance dikhana — purana ho toh overdraft', right: 'Strong consistency — primary se padho', explain: 'Yahan eventual bilkul nahi. Galti ko baad mein theek karna mehenga hai.' },
        { left: '📊 View count 1.2M ya 1.19M', right: 'Eventual bilkul theek — approximate chalega', explain: 'Yahan strong consistency ki koi zaroorat nahi. Iske liye lock lagana barbaadi hogi.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Eventual consistency ke patterns',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'eventual',
      questions: [
        { q: 'Sabse zaroori pattern kaunsa hai?', target: 'own', explain: 'Read-your-own-writes — apna data primary se. Doosron ka thoda purana chalega, par apna action turant dikhna chahiye.' },
        { q: 'Bulk kaam chal raha hai — user ko kya dikhao?', target: 'pending', explain: 'Pending state — "Processing…". State chhupao mat. Jo user jaanta hai ki kaam chal raha hai woh dobara try nahi karega.' },
        { q: 'Kahan eventual consistency bilkul nahi chalegi?', target: 'money', explain: 'Paisa nikaalna — do ATM, purana balance, overdraft. In sab mein galti ko baad mein theek karna mehenga ya namumkin hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Eventual ki samajh',
      questions: [
        {
          q: 'Eventual consistency chalegi ya nahi — sabse achha test kya hai?',
          choices: ["Staleness/conflict ka user cost assess karo","Only dataset size se consistency chuno","Only client count se consistency chuno","Only fastest response ko correctness bolo"],
          answer: 0,
          explain: 'Yeh test har case mein kaam karta hai. View count galat? Kisi ko farak nahi. Double booking? Refund + apology + reputation. Overdraft? Asli paisa. <b>Reconciliation ki keemat</b> hi batati hai ki consistency kitni strong chahiye.',
         choiceExplanations: ["Yeh test har case mein kaam karta hai. View count galat? Kisi ko farak nahi. Double booking? Refund + apology + reputation. Overdraft? Asli paisa. <b>Reconciliation ki keemat</b> hi batati hai ki consistency kitni strong chahiye.","Large and small datasets dono stronger/weaker contracts need kar sakte hain.","User count topology influence karta hai; invariant risk separate hai.","Low latency wrong financial outcome ko acceptable nahi banati."] },
        {
          q: 'Read-your-own-writes kyun sabse zaroori pattern hai?',
          choices: ["Apna saved change user ko visible ho","It makes every other user linearizable","It guarantees fastest replica every time","It removes need for conflict handling"],
          answer: 0,
          explain: 'Doosron ka data 2 second purana ho toh user ko pata bhi nahi chalega. Par <b>apna</b> data purana dikhna ek saaf "bug" jaisa lagta hai — aur user woh action dobara karega, jisse duplicate ban jaayenge. Yahi woh ek pattern hai jo lagbhag har eventual-consistency complaint ko khatam kar deta hai.',
         choiceExplanations: ["Doosron ka data 2 second purana ho toh user ko pata bhi nahi chalega. Par <b>apna</b> data purana dikhna ek saaf \"bug\" jaisa lagta hai — aur user woh action dobara karega, jisse duplicate ban jaayenge. Yahi woh ek pattern hai jo lagbhag har eventual-consistency complaint ko khatam kar deta hai.","Read-your-writes session guarantee global linearizability nahi.","Freshness preserve karne ko primary/wait routing latency add kar sakti hai.","Concurrent writers/conflicts phir bhi possible hain."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Eventual Consistency',
    instructions: 'Yahan UX ki baat karna bada plus hai. 🎤',
    questions: [
      {
        q: "Primary write committed; user next read par old value dekhta hai. Kaise distinguish karoge?",
        choices: ["Trace replica lag and cache freshness","Committed DB row rules out stale reads","Refresh always guarantees current replica","Low DB CPU proves client UI bug"],
        answer: 0,
        explain: "Primary commit ke baad lagging replica or cache stale data serve kar sakta hai. Read source/version/trace verify karo. Primary read or causal replication position proof stronger session freshness dega; fixed sticky seconds strict guarantee nahi.",
       choiceExplanations: ["Primary commit ke baad lagging replica or cache stale data serve kar sakta hai. Read source/version/trace verify karo. Primary read or causal replication position proof stronger session freshness dega; fixed sticky seconds strict guarantee nahi.","Primary commit asynchronous replica visibility prove nahi karta.","Refresh same lagging replica/cache se serve ho sakta hai.","CPU metric read version/source identify nahi karta."] },
      {
        q: '"Eventual consistency use karoge? Uska UX kaise handle karoge?"',
        choices: ["Pending state; session freshness; conflict policy","Only hide all status until data appears","Every conflict silently last-write wins","Optimistic UI means server need not validate"],
        answer: 0,
        explain: "Pending/completed state explicit do, session freshness if required design karo, and concurrent updates ke conflict/merge policy define karo. OptimisticUI useful but server authority replace nahi.409 version conflict common contract hai, LWWkabhi valid ho sakta hai if business accepts.",
       choiceExplanations: ["Pending/completed state explicit do, session freshness if required design karo, and concurrent updates ke conflict/merge policy define karo. OptimisticUI useful but server authority replace nahi.409 version conflict common contract hai, LWWkabhi valid ho sakta hai if business accepts.","Invisible pending state users ko repeated actions/duplicates ki taraf le jaati hai.","LWW business-important updates discard kar sakta hai; explicit policy needed.","Optimistic feedback server correctness/authorization replace nahi karta."] },
    ],
  },
  success: [
    'Bata sakte ho ki galti UX mein thi, system mein nahi',
    'Chaaron UX patterns apply kar sakte ho',
    'Reconciliation-cost test se consistency chun sakte ho',
    'Read-your-own-writes implement kar sakte ho',
  ],
  homework: `Apne app mein ek aisa flow dhoondo jahan user kuch save karke turant use dekhta hai.
    10 baar tez-tez try karo. Ek baar bhi purana data dikha? Toh tumhare paas
    read-after-write bug hai — aur woh users ko dikh raha hai.`,
  cards: [
    { front: 'Eventual consistency ki asli mushkil?', back: '<b>Product/UX</b> ki hai, technical nahi. "System sahi tha, UX galat tha" — user ko woh state dikhi jo uske apne action se mel nahi khaati thi.' },
    { front: '4 UX patterns?', back: '<b>1.</b> Read-your-own-writes <b>2.</b> Optimistic UI <b>3.</b> Pending state dikhao <b>4.</b> Version check → 409 (last-write-wins data khota hai).' },
    { front: 'Consistency chunne ka test?', back: '"Do jagah alag jawab mila toh usse <b>theek karna kitna mehenga</b> hoga?" Sasta → eventual. Mehenga/namumkin → strong.' },
    { front: 'Eventual kahan NAHI?', back: 'Paisa nikaalna · aakhri seat · permissions revoke · unique username. Sab mein galti ko baad mein theek karna mehenga ya namumkin hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'dbperservice',
  icon: '🗃️',
  title: 'DB per Service — Aazadi ki Keemat',
  badge: 'Data Owner',
  objectives: [
    'Shared DB = distributed monolith',
    '"Sirf padhenge" bhi coupling hai',
    'Kya khota hai: JOIN, transaction, referential integrity',
    'Kahan se shuru karo',
  ],
  lesson: [
    `<h3>📖 Ek niyam jo zyadatar galtiyan rok deta hai</h3>
     <p><b>Ek service, ek data ka maalik.</b> Baaki sab uske paas
     <b>API</b> ya <b>events</b> se aayein — table se kabhi nahi.</p>
     <pre>❌ order-service  → orders table ← inventory-service   (dono likh rahe hain)
✅ order-service     → orders table
   inventory-service → inventory table
   (baat karne ke liye API ya events)</pre>
     <p>Shared writable table ka nateeja:</p>
     <table>
       <tr><th>Problem</th><th>Asar</th></tr>
       <tr><td>Ek migration = sab services ka coordination</td><td>independent deploy khatam</td></tr>
       <tr><td>Ek slow query = sab down</td><td>blast radius = poora system</td></tr>
       <tr><td>Schema ka maalik koi nahi</td><td>badalne se sab darte hain — schema jam jaata hai</td></tr>
     </table>
     <p>Tumne network latency, partial failure aur deployment complexity
     <b>khareed li</b> — aur independence <b>mili hi nahi</b>. Yahi
     <b>distributed monolith</b> hai.</p>`,
    `<h3>🔬 "Hum sirf PADHENGE" — yeh bhi coupling hai</h3>
     <p>Yeh sabse aam samjhauta hai, aur woh dheere-dheere marta hai:</p>
     <pre>reporting-service → orders table (sirf SELECT)

order-service ne column rename kiya
  → reporting-service toot gaya
  → aur order-service ko pata bhi nahi tha</pre>
     <p>Read-only access ek <b>chhupa hua contract</b> banata hai jise
     kisi ne likha hi nahi. Behtar vikalp:</p>
     <pre>1. API se poochho          (simple, par fan-out latency)
2. Event se apni COPY rakho (read model — apna schema, apna control)
3. Analytics ke liye ek data pipeline / warehouse</pre>
     <h3>⚠️ Kya khota hai</h3>
     <pre>• JOIN                → API composition ya read model
• ACID transaction    → saga + compensating actions
• Foreign key         → ab tum "orphan" rows handle karoge
• "SELECT COUNT(*)"   → ab woh N services ka sawaal hai</pre>
     <p class="tip">🎯 <b>Shuru kahan se:</b> ek DB, par <b>per-module alag
     schema/tables</b> aur cross-module foreign key nahi. Yeh "modular
     monolith" wala rasta hai — aage service nikaalni ho toh line pehle se
     khinchi hui hai, aur aaj tumhe saga nahi likhna pad raha.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Yeh coupling hai?',
      instructions: 'Har situation ko sahi bin mein daalo.',
      bins: [
        { id: 'ok', label: '✅ Theek hai' },
        { id: 'bad', label: '⚠️ Coupling — theek karo' },
      ],
      items: [
        { text: 'order-service aur inventory-service dono orders table mein likhte hain', bin: 'bad', explain: 'Distributed monolith. Ek migration dono ko todegi, aur deploy independent nahi rahe.' },
        { text: 'reporting-service orders table se sirf SELECT karta hai', bin: 'bad', explain: 'Read-only bhi coupling hai — ek chhupa hua contract jise kisi ne likha nahi. Column rename hote hi reporting toot jaayega.' },
        { text: 'order-service events publish karta hai, baaki sunte hain', bin: 'ok', explain: 'Event ek explicit contract hai (schema ke saath). Yahi sahi tareeka hai.' },
        { text: 'inventory-service API se order details maangta hai', bin: 'ok', explain: 'API bhi explicit contract hai — versioned, documented, aur owner ko pata hai ki kaun use kar raha hai.' },
        { text: 'analytics-service ek data warehouse se padhta hai (pipeline se bhara hua)', bin: 'ok', explain: 'Analytics ke liye sahi pattern. Prod tables se seedha padhna prod ko bhi khatre mein daalta hai.' },
        { text: 'Ek DB, par har module ka apna schema aur koi cross-schema FK nahi', bin: 'ok', explain: 'Modular monolith — bilkul valid starting point. Boundary khinchi hui hai par aaj saga nahi likhna pad raha.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Data ownership',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'dbperservice',
      questions: [
        { q: 'Sabse zaroori niyam kaunsa hai?', target: 'own', explain: 'Ek service, ek data ka maalik. Baaki API ya events se pahunchein — table se kabhi nahi.' },
        { q: '"Hum sirf padhenge" mein kya problem hai?', target: 'read', explain: 'Woh bhi coupling hai — ek chhupa hua contract jise kisi ne likha nahi. Schema badle toh tum tootoge aur owner ko pata bhi nahi chalega.' },
        { q: 'Chhoti team ko kahan se shuru karna chahiye?', target: 'start', explain: 'Ek DB, par per-module alag schema aur cross-module FK nahi. Boundary khinchi hui hai par aaj saga nahi likhna pad raha.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Ownership ki samajh',
      questions: [
        {
          q: 'Do services ek hi table mein likhti hain. Sabse bada nuksaan?',
          choices: ["Schema and resource coupling badh sakti","Shared table guarantees no API latency","Shared schema prevents any write race","Separate apps guarantee independent deploy"],
          answer: 0,
          explain: "Shared writable schema migration ownership and resource coupling create kar sakta hai. Every migration all services block kare or guaranteed every query cascade universal nahi; backward compatible changes and ownership policy can manage risk.",
         choiceExplanations: ["Shared writable schema migration ownership and resource coupling create kar sakta hai. Every migration all services block kare or guaranteed every query cascade universal nahi; backward compatible changes and ownership policy can manage risk.","Network calls may remain; shared DB adds own shared-resource path.","Concurrent writes still need constraints and transaction discipline.","Shared writable schema changes affect multiple applications."] },
        {
          q: "Doosri service ka privately owned data consume karna hai. Boundary-preserving default?",
          choices: ["Owned API or documented event read model","Read-only SQL cannot couple schema","Replica grants service schema ownership","Shared library defines data freshness"],
          answer: 0,
          explain: 'Read-only access aur DB replica dono <b>chhupe hue contracts</b> hain — tum uske internal schema par depend kar gaye. Event se apni copy banane ka faayda yeh hai ki <b>tumhara schema tumhara hai</b>: use apne query patterns ke hisaab se shape kar sakte ho.',
         choiceExplanations: ["Read-only access aur DB replica dono <b>chhupe hue contracts</b> hain — tum uske internal schema par depend kar gaye. Event se apni copy banane ka faayda yeh hai ki <b>tumhara schema tumhara hai</b>: use apne query patterns ke hisaab se shape kar sakte ho.","Private schema can change; readers become hidden consumers.","Replica copy ownership/authorization contract automatically nahi deta.","Code reuse transport/consistency/ownership decide nahi karta."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Data Ownership',
    instructions: 'Yeh microservices ka sabse discriminating sawaal hai. 🎤',
    questions: [
      {
        q: '"Har service ka apna DB kyun hona chahiye?"',
        choices: ["Ownership isolation vs distributed costs","Separate DB makes cross-service ACID free","Separate DB guarantees higher throughput","Entity count alone defines service DBs"],
        answer: 0,
        explain: "Database-per-service ownership, deployment autonomy and blast-radius goals serve kar sakta hai. Shared DB transitional or intentional valid ho sakta hai withdiscipline. SeparateDB cross-service joins/transactions ko additional coordination/read model problem banata hai; local ACID still available.",
       choiceExplanations: ["Database-per-service ownership, deployment autonomy and blast-radius goals serve kar sakta hai. Shared DB transitional or intentional valid ho sakta hai withdiscipline. SeparateDB cross-service joins/transactions ko additional coordination/read model problem banata hai; local ACID still available.","Independent local transactions do not make one cross-service transaction automatic.","Workload, resources and query distribution decide throughput.","Boundaries ownership/invariants/team scaling se justify hoti hain."] },
    ],
  },
  success: [
    'Distributed monolith pehchaan sakte ho',
    'Bata sakte ho ki read-only access bhi coupling kyun hai',
    'API, events aur read model mein chun sakte ho',
    'Modular monolith ka rasta jaante ho',
  ],
  homework: `Apne system mein pata karo: kya koi service doosri ki table seedha chhuti hai
    (padhna bhi)? Har aise case ke liye likho ki uski jagah API chahiye ya event.
    Yeh list tumhare architecture debt ka sabse imaandaar naksha hai.`,
  cards: [
    { front: 'Data ownership ka niyam?', back: '<b>Ek service, ek data ka maalik.</b> Baaki API ya events se pahunchein — table se kabhi nahi.' },
    { front: 'Shared writable DB?', back: '<b>Distributed monolith</b> — ek migration = sab ka coordination, ek slow query = sab down. Network latency mili, aazadi nahi.' },
    { front: '"Sirf padhenge" theek hai?', back: 'Nahi — woh bhi coupling hai. Ek <b>chhupa hua contract</b> jise kisi ne likha nahi. Schema badle toh tum tootoge aur owner ko pata bhi nahi chalega.' },
    { front: 'DB per service ki keemat?', back: '<b>JOIN</b> → API composition/read model · <b>ACID transaction</b> → saga · <b>FK</b> → orphan rows handle karo · <b>COUNT(*)</b> → ab N services ka sawaal.' },
    { front: 'Shuru kahan se?', back: '<b>Ek DB, per-module alag schema, koi cross-module FK nahi.</b> Boundary khinchi hui hai par aaj saga nahi likhna pad raha.' },
  ],
},

/* ===================================================================== */
{
  id: 'querying',
  icon: '🔎',
  title: 'Services ke Aar-Paar Query — JOIN Gaya, Ab Kya?',
  badge: 'Read Modeler',
  objectives: [
    'API composition · CQRS read model · local copy · search index',
    'Kaunsa kab — aur har ek ki keemat',
    'N+1 ka distributed roop',
    'Read model ko event se bharna',
  ],
  lesson: [
    `<h3>📖 "Delhi ke users ke pending orders"</h3>
     <p>Monolith mein yeh ek JOIN hai, 5 ms. Services mein:</p>
     <pre>❌ Naive:
   user-service se Delhi ke users lo    → 50,000 users
   har user ke liye order-service call  → 50,000 calls 💀

Yeh N+1 ka distributed roop hai — aur yahan har "query"
ek network call hai, isliye 100x zyada mehengi.</pre>
     <p>Chaar asli vikalp hain:</p>
     <table>
       <tr><th>Pattern</th><th>Kaise</th><th>Keemat</th></tr>
       <tr><td><b>API composition</b></td><td>gateway N services call kare, app mein jode</td><td>fan-out tail latency; bade datasets par kaam nahi karta</td></tr>
       <tr><td><b>CQRS read model</b></td><td>events se ek denormalized view table</td><td>thoda stale; extra storage; ek aur cheez maintain karni hai</td></tr>
       <tr><td><b>Local copy</b></td><td>sirf zaroori fields apni DB mein</td><td>duplicate data; sync logic</td></tr>
       <tr><td><b>Search index</b></td><td>sab kuch ek index mein</td><td>ek aur system; consistency lag</td></tr>
     </table>`,
    `<h3>🔬 CQRS read model — sabse zyada kaam ka</h3>
     <pre>-- order-service ke paas ek DENORMALIZED view:
CREATE TABLE order_summary (
  order_id, user_id, user_city, user_name,   ← user-service se aaya
  status, total, created_at
);

-- events se bharo:
UserMoved      → UPDATE order_summary SET user_city = ...
OrderCreated   → INSERT ...
OrderShipped   → UPDATE status = ...

-- ab woh query:
SELECT * FROM order_summary
WHERE user_city = 'Delhi' AND status = 'pending';   → ek query, 5 ms ✅</pre>
     <p><b>Jo tum bech rahe ho:</b> freshness (data kuch second purana ho
     sakta hai) aur storage. <b>Jo khareed rahe ho:</b> ek tez, simple query
     jo tumhare apne schema mein hai.</p>
     <p>Aur ek chhupa hua faayda: read model ka schema <b>tumhara</b> hai.
     Tum use exactly apne query patterns ke hisaab se shape kar sakte ho —
     doosri service ke schema ke hisaab se nahi.</p>
     <h3>🧭 Kaise chuno</h3>
     <pre>2-3 services, chhota data, kabhi-kabhi           → API composition
baar-baar chalne wali query, bada data           → CQRS read model
sirf 2-3 fields chahiye (naam, city)             → un fields ki local copy
arbitrary search + facets + typo tolerance       → search index</pre>
     <p class="tip">🎯 Sabse aam galti: har cross-service query ke liye
     API composition use karna. Woh 2-3 calls tak theek hai — uske baad
     tail latency aur fan-out failures tumhe kha jaate hain.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Query se pattern',
      instructions: 'Har zaroorat ko sahi pattern se jodo.',
      pairs: [
        { left: '📄 Order detail page — order + user + payment', right: 'API composition — 3 calls, jodo', explain: '2-3 services aur ek hi record. Composition simple hai aur yahan bilkul theek hai.' },
        { left: '🔍 "Delhi ke pending orders" — roz 10,000 baar', right: 'CQRS read model — denormalized view table', explain: 'Baar-baar chalne wali cross-service query. Read model ise ek 5ms query bana deta hai.' },
        { left: '👤 Order list mein bas user ka naam dikhana hai', right: 'Local copy — sirf woh field event se sync karo', explain: 'Poora user object nahi chahiye. Sirf naam apni table mein rakho aur UserRenamed event se update karo.' },
        { left: '🔎 "laptop" search + brand/price facets', right: 'Search index (Elasticsearch)', explain: 'Arbitrary search, facets aur relevance — yeh transactional DB ka kaam nahi hai.' },
        { left: '📊 "Pichhle saal ka revenue by region"', right: 'Data warehouse / analytics pipeline', explain: 'Analytical query — prod services se kabhi nahi. Pipeline se warehouse mein bhejo.' },
        { left: '⚡ 50,000 users ke orders ek page par', right: 'Read model — composition yahan tootegi', explain: '50,000 API calls namumkin hai. Yeh classic case hai jahan composition kaam nahi karti.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Cross-service query patterns',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'querying',
      questions: [
        { q: 'Baar-baar chalne wali cross-service query ke liye?', target: 'cqrs', explain: 'CQRS read model — events se ek denormalized view table. Ek tez query, aur schema tumhara apna.' },
        { q: '2-3 services aur ek record ke liye sabse simple?', target: 'composition', explain: 'API composition — gateway calls kare aur app mein jode. Simple hai, par 2-3 calls se aage fan-out tail kha jaata hai.' },
        { q: 'Sirf user ka naam chahiye, poora object nahi?', target: 'replica', explain: 'Un fields ki local copy — event se sync karo. Poora object copy karne ki zaroorat nahi.' },
      ],
    },
    {
      type: 'order',
      title: 'Read model banane ke kadam',
      instructions: 'Ek CQRS read model banane ka sahi kram.',
      steps: [
        { text: 'Query likho jo tumhe chahiye — pehle sawaal, phir schema', explain: 'Read model poori tarah query-driven hota hai. "Delhi ke pending orders" — basisi ke liye table banao.' },
        { text: 'Denormalized table design karo — jo columns query mein chahiye', explain: 'Yahan normalization ka koi matlab nahi. Yeh table ek query ka jawab hai, sach ka source nahi.' },
        { text: 'Source services se zaroori events subscribe karo', explain: 'OrderCreated, OrderShipped, UserMoved. Har event ek update banega.' },
        { text: 'Consumer likho — idempotent, kyunki at-least-once', explain: 'Events dobara aayenge. Upsert use karo (INSERT ... ON CONFLICT UPDATE), blind INSERT nahi.' },
        { text: 'Backfill karo — purane data se table bharo', explain: 'Events sirf aage ka data denge. Purane orders ke liye ek one-time backfill chahiye, warna table adhoori rahegi.' },
        { text: 'Lag monitor karo — read model kitna peeche hai', explain: 'Yeh sabse zaroori metric hai. Lag badhna matlab users purana data dekh rahe hain — aur yeh chup-chaap hota hai.' },
        { text: 'Rebuild ka rasta rakho — events se poora dobara banao', explain: 'Bug ya schema change par read model ko phenk ke dobara banana aana chahiye. Iske bina har galti hamesha ke liye reh jaati hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Querying ki samajh',
      questions: [
        {
          q: 'API composition kab tootegi?',
          choices: ["Fanout and data volume exceed budget","Different languages prevent API calls","Three calls always break any page","API composition needs no partial failures"],
          answer: 0,
          explain: 'Do alag limits: <b>tail latency</b> (har extra call p99 badhati hai — Foundations track yaad hai?) aur <b>cardinality</b> (bade result set ke liye per-item call namumkin hai). Composition 2-3 calls aur ek record ke liye hai.',
         choiceExplanations: ["Do alag limits: <b>tail latency</b> (har extra call p99 badhati hai — Foundations track yaad hai?) aur <b>cardinality</b> (bade result set ke liye per-item call namumkin hai). Composition 2-3 calls aur ek record ke liye hai.","Wire contract languages ko decouple karta hai.","Small bounded fanout can fit SLO; budget and dependency behavior matter.","Every remote call can fail/timeout independently."] },
        {
          q: 'Read model consumer ko idempotent kyun hona chahiye?',
          choices: ["Redelivery must not repeat state effects","Idempotency fixes stale-event ordering","Upsert always means increment safely deduped","Broker redelivery changes event identity"],
          answer: 0,
          explain: "At-least-once delivery same event redeliver kar sakti hai. Consumer eventID/conditional state/natural idempotency se duplicate effect avoid kare. Blindupsert alone increment/ordering problem solve nahi; stale event version check alag chahiye.",
         choiceExplanations: ["At-least-once delivery same event redeliver kar sakti hai. Consumer eventID/conditional state/natural idempotency se duplicate effect avoid kare. Blindupsert alone increment/ordering problem solve nahi; stale event version check alag chahiye.","Duplicate and out-of-order handling separate concerns hain.","Increment-on-upsert duplicate event par twice increment kar sakta hai.","Stable event ID same logical delivery identify kare; new ID dedupe todti hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Cross-service Queries',
    instructions: 'Microservices ka sabse practical sawaal. 🎤',
    questions: [
      {
        q: "Microservices mein cross-domain data join kaise design karoge?",
        choices: ["Join location freshness and ownership choose","Every cross-service join inherently impossible","Replicate all fields before any query need","Always call one API per returned row"],
        answer: 0,
        explain: "Cross-service JOIN impossible nahi; data ownership and freshness preserve karne ke liye API composition, owned read model, query federation or local projection choose karo. Fanout, staleness, authorization and operational cost define karo.",
       choiceExplanations: ["Cross-service JOIN impossible nahi; data ownership and freshness preserve karne ke liye API composition, owned read model, query federation or local projection choose karo. Fanout, staleness, authorization and operational cost define karo.","Composition/read-model/query engines valid join strategies hain.","Unneeded replication adds lag, schema and access-management burden.","Per-row callsN+1 latency/load laati hain; bounded batch/projection evaluate karo."] },
    ],
  },
  success: [
    'Chaaron patterns aur unki keemat jaante ho',
    'Situation ke hisaab se pattern chun sakte ho',
    'Read model bana sakte ho — backfill aur rebuild ke saath',
    'Distributed N+1 pehchaan sakte ho',
  ],
  homework: `Apne system ki ek cross-service query dhoondo. Ginti karo ki woh kitne network
    calls karti hai. Agar 3 se zyada hain, toh ek read model ka design likho:
    kaunsi table, kaunse events, aur backfill kaise karoge.`,
  cards: [
    { front: 'Cross-service query ke 4 patterns?', back: '<b>API composition</b> (2-3 calls, ek record) · <b>CQRS read model</b> (baar-baar chalne wali query) · <b>local copy</b> (2-3 fields) · <b>search index</b> (arbitrary search).' },
    { front: 'API composition kab tootegi?', back: 'Jab <b>calls badhein</b> (tail latency) ya <b>dataset bada ho</b> (50,000 users = 50,000 calls). Yeh N+1 ka distributed roop hai.' },
    { front: 'CQRS read model?', back: 'Events se ek <b>denormalized view table</b>. Tum <b>freshness</b> bech ke <b>query speed</b> khareedte ho — aur schema tumhara apna hota hai.' },
    { front: 'Read model banane ke zaroori kadam?', back: 'Query pehle → denormalized table → events subscribe → <b>idempotent upsert</b> → <b>backfill</b> → <b>lag monitor</b> → <b>rebuild ka rasta</b>.' },
  ],
},

/* ===================================================================== */
{
  id: 'saga',
  icon: '🧩',
  title: 'Saga — ROLLBACK Gaya, Ab Compensate Karo',
  badge: 'Saga Sutradhar',
  objectives: [
    '2PC kyun use nahi hota',
    'Compensating actions — har kadam ka ulta',
    'Choreography vs orchestration',
    'Saga mein <b>isolation nahi</b> hai',
  ],
  lesson: [
    `<h3>📖 2PC pehle — aur woh kyun nahi chalta</h3>
     <p>Do-phase commit ka vaada achha hai: coordinator sabse "ready?"
     poochhta hai, sab "haan" bolein toh sab commit karte hain.</p>
     <p>Par ek problem hai jo use microservices ke liye lagbhag bekaar bana
     deti hai: <b>woh blocking hai</b>. Coordinator prepare ke <b>baad</b>
     mar gaya, toh participants apne locks pakde <b>latke</b> rehte hain —
     aur unhe pata bhi nahi ki commit karna hai ya rollback.</p>
     <p>Nateeja: tumhari availability <b>sabse kamzor participant</b> jaisi
     ho jaati hai. Aur 5 services mein se koi ek toh hamesha kharab hoti hi
     hai.</p>
     <h3>🧩 Saga — chhote local transactions ki shrinkhala</h3>
     <pre>1. order banao (pending)      ↩️ order cancel karo
2. stock reserve karo          ↩️ stock chhod do
3. payment charge karo         ↩️ refund karo
4. shipping banao              ↩️ shipping cancel karo</pre>
     <p>Har kadam ek <b>local</b> transaction hai (apni DB mein, apna ACID)
     aur har kadam ka apna <b>compensating action</b> hai. Step 3 fail hua?
     → 2 aur 1 ko ulta karo.</p>`,
    `<h3>🔬 Choreography vs Orchestration</h3>
     <table>
       <tr><th>💃 Choreography</th><th>🎭 Orchestration</th></tr>
       <tr><td>har service event sunta aur publish karta hai</td><td>ek orchestrator har kadam bulata hai</td></tr>
       <tr><td>✅ decoupled, koi central point nahi</td><td>✅ poora flow EK jagah dikhta hai</td></tr>
       <tr><td>✅ nayi service jodna aasan</td><td>✅ state, retry, timeout sab ek jagah</td></tr>
       <tr><td>❌ flow <b>kahin likha hi nahi</b> hai</td><td>❌ ek aur component</td></tr>
       <tr><td>❌ debugging 6 services ke logs mein</td><td>❌ halka coupling</td></tr>
     </table>
     <p><b>Practical niyam: 3 se zyada steps? Orchestration lo.</b>
     Choreography chhote flows mein sundar hai aur bade flows mein
     <b>samajh se bahar</b> — kyunki koi ek jagah nahi hoti jahan poora flow
     likha ho.</p>
     <h3>⚠️ Saga mein ISOLATION nahi hai</h3>
     <p>Yeh sabse zaroori baat hai. ACID mein "I" isolation hai — beech ki
     halat kisi ko nahi dikhti. Saga mein <b>dikhti hai</b>:</p>
     <pre>Step 2 ke baad, step 3 se pehle:
  → order EXIST karta hai (pending)
  → stock reserved hai
  → payment nahi hua
  → aur yeh sab doosron ko DIKH raha hai</pre>
     <p>Isliye:</p>
     <pre>• State explicit rakho: pending → confirmed → cancelled
• UI mein bhi dikhao — "payment processing…"
• Kuch cheezein ULTI nahi hoti — email chala gaya toh gaya
  (ilaaj: "hamari galti" wala doosra email)</pre>
     <p class="tip">🎯 Isiliye saga design karte waqt sabse zaroori sawaal
     yeh hai: <b>"beech mein fail hua toh user ko kya dikhega?"</b></p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Saga ka rollback',
      instructions: 'Payment step fail ho gaya. Compensating actions sahi kram mein lagao.',
      steps: [
        { text: 'Payment fail hua — saga ne failure detect kiya', explain: 'Orchestrator (ya event) ko pata chala. Ab compensating actions ULTE kram mein chalenge.' },
        { text: 'Stock reservation chhodo (step 2 ka ulta)', explain: 'Sabse aakhri safal step pehle undo hota hai. Warna stock blocked reh jaayega aur doosre customers ko "out of stock" dikhega.' },
        { text: 'Order ko cancelled mark karo (step 1 ka ulta)', explain: 'Order DELETE nahi karte — <b>cancelled</b> mark karte hain. Audit trail chahiye, aur user ko bhi dikhna chahiye ki kya hua.' },
        { text: 'User ko batao ki payment fail hua aur kya karna hai', explain: 'Saga mein isolation nahi hai — user ne shayad "order placed" dekh liya tha. Use saaf batao, chup mat raho.' },
        { text: 'Poora saga ek trace_id ke saath log karo', explain: 'Kal koi poochhega "yeh order cancel kyun hua?". Bina saga-level trace ke jawab 4 services ke logs mein dhoondhna padega.' },
      ],
    },
    {
      type: 'bins',
      title: 'Choreography ya Orchestration?',
      instructions: 'Har situation ke liye sahi approach chuno.',
      bins: [
        { id: 'choreo', label: '💃 Choreography' },
        { id: 'orch', label: '🎭 Orchestration' },
      ],
      items: [
        { text: '2 steps: order bana → email bhejo', bin: 'choreo', explain: 'Chhota flow, ek event kaafi hai. Yahan orchestrator banana over-engineering hai.' },
        { text: '6 steps with compensations aur conditional branches', bin: 'orch', explain: '3 se zyada steps par choreography samajh se bahar ho jaati hai — poora flow kahin likha hi nahi hota.' },
        { text: 'Naye services ko bina purana code chhue jodna hai', bin: 'choreo', explain: 'Choreography ka sabse bada faayda: naya subscriber jodo, publisher ko pata bhi nahi chalega.' },
        { text: 'Business team poochhti hai "order abhi kis step par hai?"', bin: 'orch', explain: 'Orchestrator ke paas explicit state hoti hai. Choreography mein yeh jawab dena bahut mushkil hai.' },
        { text: 'Analytics events — kai consumers, koi flow nahi', bin: 'choreo', explain: 'Pure pub-sub. Yahan koi saga hai hi nahi — bas events broadcast ho rahe hain.' },
        { text: 'Har step par retry, timeout aur alag compensation chahiye', bin: 'orch', explain: 'Yeh sab state machine ka kaam hai. Ek jagah rakhna hi practical hai — 6 services mein bikhraana nahi.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Saga par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'saga',
      questions: [
        { q: '2PC microservices mein kyun use nahi hota?', target: '2pc', explain: 'Woh blocking hai — coordinator prepare ke baad mar jaaye toh participants locks pakde latke rehte hain. Availability sabse kamzor participant jaisi ho jaati hai.' },
        { q: 'Saga ki sabse badi kami kaunsi hai?', target: 'isolation', explain: 'Isolation nahi hai — beech ki halat doosron ko DIKHTI hai. Isliye state explicit rakho aur UI mein bhi dikhao.' },
        { q: '6 steps wale flow ke liye kya chuno?', target: 'orch', explain: 'Orchestration. 3 se zyada steps par choreography mein poora flow kahin likha hi nahi hota — debugging 6 services ke logs mein.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Saga ki samajh',
      questions: [
        {
          q: 'Saga mein "isolation nahi hai" ka kya matlab hai?',
          choices: ["Intermediate committed states visible ho sakti","Saga local transactions cannot be atomic","Saga encrypt nahi karta isliye no isolation","Compensation hides all intermediate state"],
          answer: 0,
          explain: 'ACID ka "I" ka matlab hai beech ki halat kisi ko nahi dikhti. Saga mein har step commit ho jaata hai, isliye adhoori state <b>public</b> hai. Isliye state explicit rakhna (pending/confirmed/cancelled) aur UI mein dikhana zaroori hai.',
         choiceExplanations: ["ACID ka \"I\" ka matlab hai beech ki halat kisi ko nahi dikhti. Saga mein har step commit ho jaata hai, isliye adhoori state <b>public</b> hai. Isliye state explicit rakhna (pending/confirmed/cancelled) aur UI mein dikhana zaroori hai.","Each step localACID transaction use kar sakti hai.","Isolation concerns concurrent visibility, not encryption.","Compensation later action hai; already observed intermediate states undo nahi hoti."] },
        {
          q: 'Compensating action aur rollback mein farak?',
          choices: ["Compensation new semantic reversal action","Compensation time ko literally rewind kare","Both automatically undo sent emails","Rollback only one specific DB brand kare"],
          answer: 0,
          explain: 'Yeh farak bahut practical hai. Refund <b>charge ka rollback nahi</b> hai — woh ek naya transaction hai jo statement par dikhta hai. Aur bheja hua email wapas nahi aata; uska "compensation" ek doosra email hai. Saga design karte waqt yeh soch bahut zaroori hai.',
         choiceExplanations: ["Yeh farak bahut practical hai. Refund <b>charge ka rollback nahi</b> hai — woh ek naya transaction hai jo statement par dikhta hai. Aur bheja hua email wapas nahi aata; uska \"compensation\" ek doosra email hai. Saga design karte waqt yeh soch bahut zaroori hai.","New action ke own failures/audit history exist hain.","External email received ho chuki toh physically unsend guaranteed nahi.","Rollback transaction mechanism many storage engines mein milta hai."] },
        {
          q: "Manybranches, retries and compensations wala saga. Kaunsa coordination decision useful?",
          choices: ["Complex coordination favors explicit workflow","Four steps makes choreography invalid","Orchestrator removes all partial failures","Choreography has zero operational tracing"],
          answer: 0,
          explain: "Orchestration complex branching, recovery and explicit global workflow mein helpful hai. Choreography decoupled events ke liye valid hai if ownership/tracing/recovery clear. Three/four steps universal cutoff nahi.",
         choiceExplanations: ["Orchestration complex branching, recovery and explicit global workflow mein helpful hai. Choreography decoupled events ke liye valid hai if ownership/tracing/recovery clear. Three/four steps universal cutoff nahi.","Step count heuristic hai; ownership/dependencies/observability matter karte hain.","Coordinator bhi fail/retry/recover karega; durable state needed.","Choreography tracing possible hai, par global flow reconstruct/manage harder ho sakta hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Saga',
    instructions: 'Distributed transactions ka standard sawaal. 🎤',
    questions: [
      {
        q: '"Order flow mein 4 services hain. Transaction kaise handle karoge?"',
        choices: ["Local transactions plus durable saga policy","Try-catch across RPC makes one transaction","Any 4 services must use same orchestrator","2PC always works across every provider"],
        answer: 0,
        explain: 'Poore jawab mein chaar cheezein hain: <b>saga</b> (pattern), <b>orchestration + kyun</b> (4 steps), <b>idempotent steps</b> (retries hongi), aur <b>isolation nahi hai</b> (isliye state dikhao). Aakhri wali baat sabse kam log bolte hain aur sabse zyada matter karti hai.',
       choiceExplanations: ["Poore jawab mein chaar cheezein hain: <b>saga</b> (pattern), <b>orchestration + kyun</b> (4 steps), <b>idempotent steps</b> (retries hongi), aur <b>isolation nahi hai</b> (isliye state dikhao). Aakhri wali baat sabse kam log bolte hain aur sabse zyada matter karti hai.","In-memory exception handling committed remote effects rollback nahi karti.","Orchestration common option hai; fixed service count mandatory decision nahi.","Participants/protocol support and availability constraints matter karte hain."] },
      {
        q: '"Compensating action likha nahi ja sakta toh?"',
        choices: ["Order irreversible effects; plan recovery","2PC makes sent email fully reversible","Async effect loses all recovery needs","Skip business-required irreversible step"],
        answer: 0,
        explain: 'Yeh practical soch dikhati hai. <b>Irreversible steps ko aakhir mein rakhna</b> ek classic saga design technique hai — agar email aakhri step hai toh uske baad kuch fail hi nahi ho sakta. Aur jo sach mein irreversible hai (email chala gaya), uska ilaaj ek naya action hai, undo nahi.',
       choiceExplanations: ["Yeh practical soch dikhati hai. <b>Irreversible steps ko aakhir mein rakhna</b> ek classic saga design technique hai — agar email aakhri step hai toh uske baad kuch fail hi nahi ho sakta. Aur jo sach mein irreversible hai (email chala gaya), uska ilaaj ek naya action hai, undo nahi.","Email delivery external side effect hai;2PC universal reversal tool nahi.","Async jobs need durable handoff, status, retry and compensation/correction policy.","Product requirements satisfy karne ko workflow redesign/recovery chahiye."] },
    ],
  },
  success: [
    'Bata sakte ho ki 2PC kyun use nahi hota',
    'Saga aur compensating actions design kar sakte ho',
    'Choreography aur orchestration mein chun sakte ho',
    'Saga ki isolation ki kami handle kar sakte ho',
  ],
  homework: `Apne system ka ek multi-service flow lo. Har step ke saamne uska compensating
    action likho. Jinke saamne kuch nahi likh paaye — woh irreversible steps hain.
    Kya woh flow ke AAKHIR mein hain? Agar nahi, toh unhe wahan le jao.`,
  cards: [
    { front: '2PC microservices mein kyun nahi?', back: 'Woh <b>blocking</b> hai — coordinator prepare ke baad mare toh participants locks pakde latke rehte hain. Availability <b>sabse kamzor participant</b> jaisi ho jaati hai.' },
    { front: 'Saga?', back: 'Chhote <b>local</b> transactions ki shrinkhala, har ek ka apna <b>compensating action</b>. Step 3 fail? → 2 aur 1 ko ulta karo.' },
    { front: 'Choreography vs Orchestration?', back: '<b>Choreography</b>: events, decoupled, par flow kahin likha nahi. <b>Orchestration</b>: ek jagah flow + state + retry. <b>3 se zyada steps? Orchestration.</b>' },
    { front: 'Saga ki sabse badi kami?', back: '<b>Isolation nahi hai</b> — beech ki halat doosron ko dikhti hai. Isliye state explicit rakho (pending/confirmed/cancelled) aur UI mein dikhao.' },
    { front: 'Compensation vs Rollback?', back: 'Rollback = "kuch hua hi nahi". Compensation = ek <b>naya action</b> jo asar ulta karta hai. Refund charge ka rollback nahi hai; bheja hua email wapas nahi aata.' },
  ],
},

/* ===================================================================== */
{
  id: 'outbox',
  icon: '📤',
  title: 'Outbox — "DB Mein Likha Par Event Nahi Gaya"',
  badge: 'Dual Write Slayer',
  objectives: [
    'Dual write kyun atomic nahi ho sakta',
    'Outbox pattern — dono ek transaction mein',
    'Relay: polling vs CDC',
    'Outbox at-least-once deta hai, exactly-once nahi',
  ],
  lesson: [
    `<h3>📖 Sabse chhupa hua data-loss bug</h3>
     <pre>db.save(order)          ✅
kafka.publish(event)    ❌ crash!

→ order DB mein HAI
→ event kabhi nahi gaya
→ inventory ko pata hi nahi
→ warehouse ko pata hi nahi
→ koi error nahi, koi alert nahi — bas SILENT inconsistency</pre>
     <p>Kram ulta karo toh ulta problem: event chala gaya aur order bana hi
     nahi — ab downstream services ek aise order par kaam kar rahi hain jo
     exist nahi karta.</p>
     <p><b>Do alag systems ko ek saath atomic likhna namumkin hai.</b>
     Yeh koi library ya framework theek nahi kar sakta — yeh distributed
     systems ka basic sach hai.</p>
     <h3>✅ Outbox — trick yeh hai ki DOOSRA system hi na ho</h3>
     <pre>BEGIN;
  INSERT INTO orders (...);
  INSERT INTO outbox (event_type, payload);   ← USI DB mein
COMMIT;                                        ← ATOMIC ✅

-- alag process (relay):
loop:
  rows = SELECT * FROM outbox WHERE sent = false LIMIT 100;
  publish(rows);
  UPDATE outbox SET sent = true WHERE id IN (...);</pre>
     <p>Ab dono writes <b>ek hi database</b> mein hain, isliye ek hi
     transaction mein aa jaate hain. Ya dono hue, ya dono nahi.</p>`,
    `<h3>🔬 Relay: polling ya CDC</h3>
     <table>
       <tr><th>Polling</th><th>CDC (Debezium)</th></tr>
       <tr><td>simple — ek loop</td><td>DB ka transaction log padhta hai</td></tr>
       <tr><td>latency = poll interval</td><td>bahut kam latency</td></tr>
       <tr><td>DB par thoda load</td><td>DB par lagbhag zero load</td></tr>
       <tr><td>koi extra system nahi</td><td>ek aur system chalana padega</td></tr>
     </table>
     <p>Polling se shuru karo. CDC tab jab latency ya DB load sach mein
     problem ban jaaye.</p>
     <h3>⚠️ Outbox exactly-once NAHI deta</h3>
     <p>Dhyaan se dekho:</p>
     <pre>publish(event)   ✅
crash!           💥
UPDATE sent=true  ← nahi hua

→ restart par event DOBARA jaayega</pre>
     <p>Yeh at-least-once hai. Outbox ka vaada yeh <b>nahi</b> hai ki event
     ek hi baar jaayega — uska vaada hai ki event <b>kabhi kho nahi
     sakta</b>. Duplicates handle karna consumers ka kaam hai
     (agla level).</p>
     <p class="tip">🎯 Do aur baatein: <b>(1)</b> outbox table ko regularly
     saaf karo (purane sent rows delete) warna woh anant badhegi.
     <b>(2)</b> Agar order matter karta hai toh relay ko per-key ordering
     rakhni padegi — parallel publish se events out-of-order ja sakte hain.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Outbox ka flow',
      instructions: 'Sahi kram lagao.',
      steps: [
        { text: 'Ek transaction kholo', explain: 'Sab kuch isi ke andar hoga — yahi poora point hai.' },
        { text: 'Business data likho (order INSERT)', explain: 'Normal kaam. Ab tak kuch naya nahi.' },
        { text: 'Usi transaction mein outbox row INSERT karo', explain: 'Yahi trick hai — event ko ek MESSAGE ki tarah nahi, ek DB ROW ki tarah treat karo. Ab woh usi atomic unit ka hissa hai.' },
        { text: 'COMMIT — ab dono ya toh hue, ya dono nahi', explain: 'Atomicity mil gayi bina distributed transaction ke. Yeh outbox ka poora jaadu hai.' },
        { text: 'Alag relay process outbox se unsent rows padhe', explain: 'Polling ya CDC. Request path se poori tarah alag — isliye publish ki latency user ko nahi lagti.' },
        { text: 'Broker par publish karo', explain: 'Fail ho toh koi baat nahi — row abhi bhi outbox mein hai aur agle loop mein dobara koshish hogi.' },
        { text: 'Row ko sent mark karo', explain: 'Publish ke baad aur mark ke pehle crash ho toh event <b>dobara</b> jaayega. Isliye consumers ko idempotent hona hi hoga.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Outbox par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'outbox',
      questions: [
        { q: 'Outbox ka asli jaadu kahan hai?', target: 'tx', explain: 'Order aur outbox row EK transaction mein — kyunki dono USI DB mein hain. Ab koi distributed transaction chahiye hi nahi.' },
        { q: 'Outbox kya guarantee deta hai?', target: 'atleast', explain: "Atomic durable outbox committed intent preserve karti hai. Retrying relay recovery/retention assumptions ke andar at-least-once handoff de sakta hai; publish ke baad mark se pehle crash redelivery la sakta hai. Consumer idempotency aur backlog monitoring chahiye." },
        { q: 'Polling ki jagah kam-latency ka option?', target: 'cdc', explain: 'CDC (Debezium) — DB ka transaction log padhta hai. Kam latency, DB par kam load, par ek aur system chalana padega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Outbox ki samajh',
      questions: [
        {
          q: 'db.save() ke baad kafka.publish() karne mein kya problem hai?',
          choices: ["DB commit and publish can diverge","Kafka publish failure rolls DB back","Try-catch survives crash between operations","Publishing first makes both automatically atomic"],
          answer: 0,
          explain: 'Sabse khatarnak baat yeh hai ki isme <b>koi error nahi</b> aata. Order safal dikhta hai, user ko confirmation milta hai, aur inventory/warehouse ko kabhi pata nahi chalta. Yeh bug mahino chup-chaap chal sakta hai.',
         choiceExplanations: ["Sabse khatarnak baat yeh hai ki isme <b>koi error nahi</b> aata. Order safal dikhta hai, user ko confirmation milta hai, aur inventory/warehouse ko kabhi pata nahi chalta. Yeh bug mahino chup-chaap chal sakta hai.","CommittedDB transaction independent broker failure se undo nahi hoti.","Process crash exception handler run hi nahi karta.","Publish first opposite inconsistency create kar sakta hai."] },
        {
          q: "Outbox pattern actually kis boundary ko durable banata hai?",
          choices: ["Durable handoff; relay may redeliver","Exactly one network delivery guaranteed","All event types globally ordered forever","Disk loss impossible by outbox design"],
          answer: 0,
          explain: "Outbox domain write and intent row ko one DB transaction mein durable banata hai. Relay/recovery assumptions ke andar publish retryable hai; duplicates possible. Database/backup loss, retention bugs and relay permanent failure se absolute event never lost theorem nahi.",
         choiceExplanations: ["Outbox domain write and intent row ko one DB transaction mein durable banata hai. Relay/recovery assumptions ke andar publish retryable hai; duplicates possible. Database/backup loss, retention bugs and relay permanent failure se absolute event never lost theorem nahi.","Relay publish/mark crash window duplicatesla sakti hai.","Ordering requires aggregate sequence, relay and partition contracts.","DB durability, backups and relay liveness operational assumptions hain."] },
        {
          q: 'Outbox table ke saath ek zaroori maintenance kaam?',
          choices: ["Sent-row retention and backlog monitor","Every day reindex without bloat evidence","Delete unsent rows to shrink backlog","Outbox rows auto expire in every DB"],
          answer: 0,
          explain: 'Outbox ek <b>high-write</b> table hai — har business write ke saath ek row. Bina cleanup ke woh mahino mein crore rows tak pahunch jaati hai, aur woh relay ki query ko bhi dheema karti hai. Ek retention job (jaise 7 din) zaroori hai.',
         choiceExplanations: ["Outbox ek <b>high-write</b> table hai — har business write ke saath ek row. Bina cleanup ke woh mahino mein crore rows tak pahunch jaati hai, aur woh relay ki query ko bhi dheema karti hai. Ek retention job (jaise 7 din) zaroori hai.","Reindex frequency measuredbloat/engine behavior se justify karo.","Unsent rows delete karna event loss hai; investigate delivery backlog.","Cleanup/retention explicit job orDBpolicy se configure hoti hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Outbox',
    instructions: 'Event-driven systems ka pakka sawaal. 🎤',
    questions: [
      {
        q: '"Order save karke Kafka par event bhejna hai. Atomic kaise banaoge?"',
        choices: ["Order plus outbox same DB transaction","Publish first then hope order commit","Try-catch guarantees atomic broker handoff","Local transaction spans broker by default"],
        answer: 0,
        explain: 'Sahi jawab mein teen hisse hain: <b>pattern</b> (outbox), <b>mechanism</b> (relay), aur <b>guarantee ki imaandaar baat</b> (at-least-once, isliye idempotent consumers). Aakhri hissa hi seniority dikhata hai — kyunki bahut log sochte hain ki outbox exactly-once de deta hai.',
       choiceExplanations: ["Sahi jawab mein teen hisse hain: <b>pattern</b> (outbox), <b>mechanism</b> (relay), aur <b>guarantee ki imaandaar baat</b> (at-least-once, isliye idempotent consumers). Aakhri hissa hi seniority dikhata hai — kyunki bahut log sochte hain ki outbox exactly-once de deta hai.","FailedDBcommit event for nonexistent order leave kar sakta hai.","Crash window and network ambiguity handler se eliminate nahi hote.","Different systems coordinated protocol bina one local transaction nahi share karte."] },
    ],
  },
  success: [
    'Dual write ka problem samjha sakte ho',
    'Outbox pattern implement kar sakte ho',
    'Polling aur CDC mein chun sakte ho',
    'Jaante ho ki outbox at-least-once deta hai',
  ],
  homework: `Apne code mein dhoondo: kahan tum DB mein likhne ke baad koi event, webhook ya
    external call karte ho? Har aisi jagah ek potential dual-write bug hai.
    Ginti karo — aur socho ki agar beech mein crash ho toh kya hoga.`,
  cards: [
    { front: 'Dual write ka problem?', back: '<code>db.save()</code> + <code>kafka.publish()</code> ek atomic unit nahi hain. Beech mein crash = data hai par event nahi gaya — <b>aur koi error bhi nahi milta</b>.' },
    { front: 'Outbox pattern?', back: 'Business data aur event row <b>USI DB</b> mein, <b>ek transaction</b> mein. Phir ek alag relay outbox se publish kare. Doosra system hi nahi raha, isliye atomicity mil gayi.' },
    { front: 'Outbox kya guarantee deta hai?', back: "<b>Durable intent + retrying relay.</b> Eventual handoff relay recovery, retention aur durable DB par depend hai. Publish ke baad mark se pehle crash redelivery kar sakta hai; consumers idempotent aur lag/retention monitored ho." },
    { front: 'Polling vs CDC?', back: '<b>Polling</b>: simple, latency = interval. <b>CDC</b> (Debezium): DB ka transaction log, kam latency, par ek aur system. <b>Polling se shuru karo.</b>' },
    { front: 'Outbox ka maintenance?', back: 'Purane sent rows <b>regularly delete</b> karo — woh ek high-write table hai aur bina cleanup ke crore rows tak pahunch jaati hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'exactlyonce',
  icon: '♻️',
  title: 'Exactly-Once ka Scope — Delivery aur Business Effects',
  badge: 'Dedupe Master',
  objectives: [
    "ACK missing ho toh broker ko effect ambiguous ho sakta hai;cooperating durable state se resolve karo",
    'Delivery vsprocessing scope;transactional exactly-once ki boundaries',
    'Idempotent consumer: unique key + ek transaction',
    'Naturally idempotent operations design karna',
  ],
  lesson: [
    `<h3>📖 Ek sawaal jiska jawab hai hi nahi</h3>
     <pre>1. consumer ne message process kiya       ✅
2. ack bhejne se PEHLE crash            💥
3. broker ko pata nahi: kaam hua ya nahi?</pre>
     <p>Broker ke liye dono halat <b>bilkul ek jaisi</b> dikhti hain:
     "message bheja, ack nahi mila". Uske paas do hi vikalp hain:</p>
     <pre>Dobara bhejo  → at-least-once → DUPLICATES
Mat bhejo     → at-most-once  → DATA LOSS</pre>
     <p>Sirf broker ACK ke basis par effect ambiguous hai.<b>Scoped transactional processing</b> additional shared durable state aur cooperating sink se stronger outcome de sakti hai. Two Generals ko every exactly-once implementation impossible proof mat banao.</p>
     <h3>✅ Toh log "exactly-once" kaise karte hain?</h3>
     <pre>at-least-once delivery + idempotent processing = effectively-once</pre>
     <p>Duplicates <b>aayenge</b>. Bas unka koi asar nahi hoga.</p>`,
    `<h3>🔬 Idempotent consumer — teen kadam</h3>
     <pre>1. Har message mein ek unique id ho (producer deta hai)
2. processed_ids table par UNIQUE constraint
3. Side-effect AUR id, DONO ek transaction mein</pre>
     <pre>BEGIN;
  INSERT INTO processed_ids (msg_id) VALUES (?);  -- duplicate? fail
  UPDATE orders SET status = 'shipped' WHERE ...;
COMMIT;</pre>
     <p>Teesra kadam sabse zaroori hai. Agar tum pehle side-effect karo aur
     phir alag se id likho, toh tumne <b>dual write ka problem dobara bana
     diya</b> — beech mein crash ho toh kaam ho chuka hai par id nahi likhi
     gayi, aur agli baar woh dobara ho jaayega.</p>
     <p>Aur dhyaan do: <b>app-level check nahi chalega</b>:</p>
     <pre>❌ if not exists(msg_id): process()      ← race condition
✅ INSERT ... ON CONFLICT DO NOTHING     ← atomic</pre>
     <h3>💡 Sabse sasti idempotency: design se</h3>
     <p>Kabhi-kabhi operation <b>khud hi</b> idempotent ho sakti hai:</p>
     <pre>✅ SET status = 'shipped'      kitni baar bhi chalao, wahi natija
❌ counter = counter + 1       har baar badhega

✅ SET balance = 5000          absolute
❌ balance = balance - 100     relative</pre>
     <p class="tip">🎯 Jahan ho sake, operation ko <b>"value SET karo"</b>
     banao, <b>"value BADHAO"</b> nahi. Pure desired-state SET ko repeat karne par same state mil sakti hai. Concurrent newer updates, preconditions aur triggers/external effects ko still guard karo; SET alone every business workflow idempotent nahi banata.</p>
     <h3>⚠️ "Hamara broker exactly-once deta hai"</h3>
     <p>Supported Kafka transactions read-process-write boundary protect karti hain. External sink/payment/email ko offsets aur effects ke atomic commit, provider idempotency ya recoverable reconciliation mein cooperate karna hoga. Broker toggle alone external once-only effect prove nahi karta.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '♻️ Duplicate ko bekaar banao',
      goal: 'Ek message consumer hai jo payments process karta hai. Idempotency on karo aur prove karo ki wahi message dobara aane par duplicate nahi banta.',
      sys: SD.sys.payments(),
      tasks: T_ONCE,
      success: SD.allTasks(T_ONCE),
      successText: `Yahi <b>effectively-once</b> hai: delivery at-least-once rahi
        (message dobara aaya), par <b>processing idempotent</b> thi, isliye asar ek hi baar hua.
        <br><br>Teen cheezein zaroori hain:
        <br>• Message mein ek <b>unique id</b> ho (producer deta hai)
        <br>• <code>processed_ids</code> par <b>UNIQUE constraint</b> — app check race condition hai
        <br>• Side-effect aur id <b>ek hi transaction</b> mein — warna tumne dual write dobara bana diya`,
      solution: [
        "sim set api.idempotency true",
        "POST /v1/payments -H 'Idempotency-Key: msg-9001'",
        "POST /v1/payments -H 'Idempotency-Key: msg-9001'",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.idempotency === true && !!s.sys.seenKeys['msg-9001'] && m.current(s, 'http', r => r.idem === 'replay' && r.key === 'msg-9001'); },
      hints: [
        "Pehle observation: Idempotency on karo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Wahi message dobara aaya — duplicate NAHI banna chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim set api.idempotency true\nPOST /v1/payments -H 'Idempotency-Key: msg-9001'\nPOST /v1/payments -H 'Idempotency-Key: msg-9001'",
      ],
    },
    {
      type: 'bins',
      title: 'Naturally idempotent hai?',
      instructions: 'Har operation ko sahi bin mein daalo.',
      bins: [
        { id: 'yes', label: '✅ Khud hi idempotent' },
        { id: 'no', label: '⚠️ Dedupe key chahiye' },
      ],
      items: [
        { text: "UPDATE orders SET status = 'shipped' WHERE id = 812", bin: 'yes', explain: 'Absolute value set kar raha hai. Kitni baar bhi chalao, wahi natija. Sabse sasti idempotency.' },
        { text: 'UPDATE counters SET views = views + 1', bin: 'no', explain: 'Relative change — har baar badhega. Ya dedupe key lagao, ya design badal ke absolute value set karo.' },
        { text: 'INSERT INTO payments (...) VALUES (...)', bin: 'no', explain: 'Har baar naya row. Yahan unique constraint (idempotency key par) hi bacha sakta hai.' },
        { text: "UPDATE users SET email = 'a@b.com' WHERE id = 5", bin: 'yes', explain: 'Absolute set. 5 baar chalao, email wahi rahega.' },
        { text: 'Email bhejna', bin: 'no', explain: 'Har call ek naya email. Dedupe key zaroori hai — warna user ko 3 baar wahi email jaayega.' },
        { text: "DELETE FROM sessions WHERE id = 'abc'", bin: 'yes', explain: 'Doosri baar 0 rows delete honge. Natija wahi hai — session gaya. DELETE naturally idempotent hai.' },
        { text: 'Stock se 1 item kam karna', bin: 'no', explain: 'Relative change. Duplicate = stock do baar kam. Yahan dedupe key ya conditional update (WHERE reserved_by IS NULL) chahiye.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Exactly-once ka sach',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'exactlyonce',
      questions: [
        { q: 'Asli formula kya hai?', target: 'formula', explain: 'at-least-once delivery + idempotent processing = effectively-once. "Exactly-once" delivery hoti hi nahi.' },
        { q: 'Dedupe key ko kaise store karein?', target: 'unique', explain: 'DB UNIQUE constraint par — app-level "pehle check karo" ek race condition hai, aur concurrency hi asli scenario hai.' },
        { q: 'Side-effect aur dedupe id kahan hone chahiye?', target: 'same', explain: 'EK hi transaction mein. Alag karoge toh dual write ka problem dobara bana doge — kaam ho gaya par id nahi likhi.' },
        { q: '"Hamara broker exactly-once deta hai" — isme kya adhoora hai?', target: 'claim', explain: "Supported Kafka transactional read-process-write path ka scope inspect karo. External sink ko offsets/effect atomicity ya idempotent recovery mein cooperate karna hoga; broker setting alone payment/email effect protect nahi karti." },
      ],
    },
    {
      type: 'quiz',
      title: 'Exactly-once ki samajh',
      questions: [
        {
          q: "Exactly-once guarantee evaluate karne ka correct approach?",
          choices: ["Exactly-once claim ka boundary inspect karo","Kafka transaction controls any external email","Network retries prove processing twice always","Every broker guarantee inherently useless"],
          answer: 0,
          explain: "Exactly-once processing guarantees boundary specific hain. Kafka transactions supported Kafka read-process-write paths protect kar sakti hain; external payment/email effects automatically included nahi. Ambiguous remote effects ke liye stable IDs, cooperation and dedupe/reconciliation needed.",
         choiceExplanations: ["Exactly-once processing guarantees boundary specific hain. Kafka transactions supported Kafka read-process-write paths protect kar sakti hain; external payment/email effects automatically included nahi. Ambiguous remote effects ke liye stable IDs, cooperation and dedupe/reconciliation needed.","Kafka transactional guarantees external effects automatically include nahi karti.","Duplicates possible hain; idempotency effect duplicate hone se bacha sakti hai.","Scoped transactions/durability/order valuable contracts provide karte hain."] },
        {
          q: 'Side-effect aur dedupe id alag-alag likhne mein kya problem hai?',
          choices: ["Crash can leave effect without dedupe record","Two writes same code means atomic","Persist dedupe later always safe hota","Broker ACK repairs missing dedupe record"],
          answer: 0,
          explain: 'Yeh sabse aam implementation bug hai. Log dedupe table bana lete hain par use side-effect se alag transaction mein likhte hain — aur phir sochte hain ki woh protected hain. <b>Dono ek transaction mein hone chahiye.</b>',
         choiceExplanations: ["Yeh sabse aam implementation bug hai. Log dedupe table bana lete hain par use side-effect se alag transaction mein likhte hain — aur phir sochte hain ki woh protected hain. <b>Dono ek transaction mein hone chahiye.</b>","Code proximity atomic durability boundary nahi.","Effect ke baad crash redelivery par duplicate effect karwa sakta hai.","ACK state aur consumer business DB automatically one commit nahi."] },
        {
          q: "Repeated delivery par state effect idempotent banane ka simple pattern?",
          choices: ["Desired-state SET repeat effect ko limit kare","Increment naturally idempotent hota hai","SET guarantees every external action once","No-op retry means authorization optional"],
          answer: 0,
          explain: "Pure desired state SET repeat operation effect idempotent bana sakta hai; increment generally nahi. Version/preconditions and external triggers still need guarding. Most cheap strategy workload/invariant par depend karti hai; one universal winner nahi.",
         choiceExplanations: ["Pure desired state SET repeat operation effect idempotent bana sakta hai; increment generally nahi. Version/preconditions and external triggers still need guarding. Most cheap strategy workload/invariant par depend karti hai; one universal winner nahi.","Repeated increment state change har attempt mein repeat karta hai.","Repeated SET ke triggers/external effects separate guard require kar sakte hain.","Every attempt ko applicable auth and preconditions enforce karne honge."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Exactly-Once',
    instructions: 'Yeh sawaal bahut se strong engineers ko fansaata hai. 🎤',
    questions: [
      {
        q: "External business effects ke liye exactly-once outcome kaise assess karoge?",
        choices: ["Define effect boundary; dedupe atomically","Only broker toggle external effects once","ACK before write guarantees no data loss","Write effect then async dedupe sufficient"],
        answer: 0,
        explain: "Define exactly-once effect and failure boundary. Supported broker transactions useful hain; external store effect+dedupe record atomic transaction or provider idempotency/recovery protocol chahiye. Delivery count aur business effect count different claims hain.",
       choiceExplanations: ["Define exactly-once effect and failure boundary. Supported broker transactions useful hain; external store effect+dedupe record atomic transaction or provider idempotency/recovery protocol chahiye. Delivery count aur business effect count different claims hain.","External store/provider integration atomicity/cooperation require karti hai.","Crash after ACK before write business work lose kar sakta hai.","Crash between effect and dedupe duplicate effect cause kar sakta hai."] },
      {
        q: "Consumer payment provider ko charge karte waqt crash hua; message redeliver hua. Safe design?",
        choices: ["Provider idempotency or recoverable payment ID","Local DB row makes remote charge atomic","SELECT then charge prevents all races","Broker guarantee includes payment provider"],
        answer: 0,
        explain: "External payment ke liye stable provider idempotency key/payment intent aur durable recovery state design karo. Local DB dedupe record with local ledger transaction local duplicates protect kar sakta hai; remote charge automatically atomic nahi. Ambiguous timeout reconcile karo.",
       choiceExplanations: ["External payment ke liye stable provider idempotency key/payment intent aur durable recovery state design karo. Local DB dedupe record with local ledger transaction local duplicates protect kar sakta hai; remote charge automatically atomic nahi. Ambiguous timeout reconcile karo.","Local transaction external provider charge automatically enlist nahi karti.","Concurrent workers dono absent dekhkar charge kar sakte hain.","Broker cannot enforce provider effect without cooperating contract."] },
    ],
  },
  success: [
    'Delivery count vsbusiness effect aur transactional guarantee ka scope samjha sakte ho',
    'Idempotent consumer ke teen kadam implement kar sakte ho',
    'Naturally idempotent operations design kar sakte ho',
    'Broker ke exactly-once claim ki seema jaante ho',
  ],
  homework: `Apne har message consumer ko dekho: agar wahi message dobara aa jaaye toh kya hoga?
    Jinke jawab mein "duplicate charge / duplicate email / galat count" hai,
    unme dedupe key aur ek transaction chahiye — aaj.`,
  cards: [
    { front: 'Exactly-once kyun namumkin?', back: 'Crash ke baad "kaam hua ya nahi" pata karna namumkin hai — dono halat ek jaisi dikhti hain. Do vikalp: <b>at-least-once</b> (duplicates) ya <b>at-most-once</b> (data loss).' },
    { front: 'Asli formula?', back: '<b>at-least-once delivery + idempotent processing = effectively-once.</b> Duplicates aayenge — bas unka koi asar nahi hoga.' },
    { front: 'Idempotent consumer ke 3 kadam?', back: '<b>1.</b> Message mein unique id <b>2.</b> <code>processed_ids</code> par UNIQUE constraint <b>3.</b> side-effect + id <b>ek hi transaction</b> mein (warna dual write dobara).' },
    { front: 'Sabse sasti idempotency?', back: 'Design se: <b>"value SET karo"</b> (<code>SET status = shipped</code>), "value BADHAO" nahi. Koi extra table, koi constraint nahi lagti.' },
    { front: '"Broker exactly-once deta hai"?', back: 'Kafka transactions supported Kafka read-process-write boundary protect karti hain.External sink/payment/email ko cooperating transaction,idempotency ya reconciliation contract chahiye.' },
  ],
},

/* =====================================================================
   L8 — Distributed scheduling  ⭐ MARQUEE
   ===================================================================== */
{
  id: 'scheduling',
  icon: '⏰',
  title: 'Scheduled Work — 2 Crore Rows Scan Mat Karo',
  badge: 'Time Keeper',
  objectives: [
    'Polling vs scheduled event — access pattern ka farak',
    'Time buckets / timer wheel',
    'Schedule ko <b>badalne</b> layak banana',
    'Partition aur stagger',
  ],
  lesson: [
    `<h3>📖 Wahi bimari, naya roop</h3>
     <p>2 crore credit cards. Har card par reminder bhejna hai — due date se
     5 din pehle, user ke timezone mein. Sabse aam design:</p>
     <pre>-- har ghante:
SELECT * FROM cards
WHERE due_date - INTERVAL '5 days' BETWEEN now() AND now() + 1 hour;

→ 2 CRORE rows scan
→ 50,000 reminders mile
→ har ghante, hamesha</pre>
     <p>Yeh <b>bilkul wahi bimari</b> hai jo deep pagination mein thi:
     jawab ke liye <b>poora dataset chhuna</b>. Aur ilaaj bhi wahi hai —
     <b>access pattern badlo</b>.</p>
     <h3>⚡ Sawaal ulta karo</h3>
     <p>Har bill se poochhna band karo ki "tera waqt aa gaya?". Uski jagah
     <b>ek baar hisaab karo aur likh lo</b>:</p>
     <pre>-- jab bill aaye YA due date badle:
reminder_at = due_date - 5 days   (user ke timezone mein)
INSERT/UPDATE reminders (user_id, bill_id, reminder_at, status)

-- worker (har minute):
SELECT * FROM reminders
WHERE reminder_at <= now() AND status = 'pending'
ORDER BY reminder_at
LIMIT 1000;                        ← index par ek SEEK</pre>
     <p>2 crore scan ki jagah <b>50,000 due rows par seedha seek</b>.
     Aur yeh ek B-tree index par range scan hai — bilkul wahi cheez jo
     cursor pagination karti hai.</p>`,
    `<h3>🔬 Scale par: buckets, partitions, stagger</h3>
     <p><b>Time buckets / timer wheel:</b></p>
     <pre>agle 1 minute ke reminders  → in-memory / fast queue
agle 5 minute ke            → doosra bucket
usse aage                    → durable storage mein pade rahein

Worker sirf paas wale bucket ko dekhta hai.</pre>
     <p>Technology (delayed queue, sorted set, timer wheel, ya bas ek index)
     se zyada <b>access pattern</b> matter karta hai.</p>
     <p><b>Partition karo:</b> <code>user_id</code>, date, ya region se —
     taaki kai workers alag-alag partitions par bina takraav ke kaam karein.
     (Aur isse distributed lock ki zaroorat bhi khatam ho jaati hai —
     ek partition, ek worker.)</p>
     <p><b>Stagger karo:</b> 50 lakh notifications theek 9:00 AM par mat
     bhejo. 9:00–9:30 mein phailao — warna tumne khud apne liye ek
     flash crowd bana liya (aur provider ki rate limit bhi paar kar doge).</p>
     <h3>🔄 Asli duniya badalti hai — yahi ise cron se alag banata hai</h3>
     <table>
       <tr><th>Kya hua</th><th>Schedule ka kya</th></tr>
       <tr><td>User ne pehle pay kar diya</td><td>pending reminder <b>cancel</b></td></tr>
       <tr><td>Bank ne due date badli</td><td><code>reminder_at</code> <b>recompute</b></td></tr>
       <tr><td>User ne reminders band kiye</td><td>future jobs <b>cancelled</b> mark</td></tr>
       <tr><td>Send fail hua</td><td>backoff ke saath <b>retry</b></td></tr>
       <tr><td>Worker crash hua</td><td>job dobara uthegi → <b>idempotent send</b> chahiye</td></tr>
     </table>
     <p class="tip">🎯 Aakhri wali sabse zaroori hai: <code>(user_id,
     bill_id, reminder_date)</code> par unique constraint. Warna ek user ko
     wahi reminder 3 baar jaayega — aur woh app uninstall karne ki wajah
     banta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '⏰ Polling se scheduled event par',
      goal: '2 crore cards wali table hai. Pehle polling wali query ka plan dekho, phir reminder_at par index banao aur dikhao ki ab kitni kam rows chhuni padti hain.',
      sys: SD.sys.reminders(),
      tasks: T_SCHED,
      success: SD.allTasks(T_SCHED),
      successText: `<b>2 crore rows scan → ek index seek.</b>
        <br><br>Aur dhyaan do ki yeh <b>bilkul wahi</b> insight hai jo pagination level mein tha:
        <br>• Deep offset: "2.4 crore rows skip mat karo — jahan chhoda tha wahin se lo"
        <br>• Scheduling: "2 crore cards scan mat karo — jo due hain unhe seedha uthao"
        <br><br>Dono mein galti <b>data ke size</b> mein nahi, <b>access pattern</b> mein thi.
        Technology (delayed queue, sorted set, timer wheel) uske baad ki baat hai.`,
      solution: [
        "EXPLAIN SELECT * FROM cards WHERE due_date > 2026",
        "CREATE INDEX ix_reminder ON cards(reminder_at)",
        "EXPLAIN SELECT * FROM cards WHERE reminder_at < 2026 ORDER BY reminder_at LIMIT 1000",
      ],
      verify: s => { const m = SD.mission; return m.index(s, 'cards', ['reminder_at']) && m.current(s, 'explain', r => r.table === 'cards' && r.indexUsed && r.rowsExamined < 5000); },
      hints: [
        "Pehle observation: Polling wali query ka plan dekho — poori table scan. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Due reminders uthao — 5000 se kam rows chhuni chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nEXPLAIN SELECT * FROM cards WHERE due_date > 2026\nCREATE INDEX ix_reminder ON cards(reminder_at)\nEXPLAIN SELECT * FROM cards WHERE reminder_at < 2026 ORDER BY reminder_at LIMIT 1000",
      ],
    },
    {
      type: 'order',
      title: 'Reminder system ka design',
      instructions: 'Sahi kram lagao.',
      steps: [
        { text: 'Bill aaya ya due date badli — reminder_at ek baar calculate karo', explain: 'due_date − 5 din, user ke timezone mein. Yeh hisaab ek baar hota hai, har ghante nahi.' },
        { text: 'reminders table mein store karo (status: pending)', explain: 'Ab system ko pata hai ki is bill ko kab dhyaan chahiye. Use har scan mein dobara dhoondhne ki zaroorat nahi.' },
        { text: 'reminder_at par index banao', explain: 'Isse worker ki query ek seek ban jaati hai. Technology se zyada yahi matter karta hai.' },
        { text: 'Worker due jobs uthaye — WHERE reminder_at <= now() LIMIT 1000', explain: '2 crore scan ki jagah due rows par seedha seek. Batch mein lo taaki ek query bahut badi na ho.' },
        { text: 'Partition karo — user_id ya date se', explain: 'Kai workers bina takraav ke chalein. Isse distributed lock ki zaroorat bhi khatam ho jaati hai: ek partition, ek worker.' },
        { text: 'Stagger karo — 9:00-9:30 mein phailao', explain: '50 lakh notifications theek 9:00 par bhejna apne liye flash crowd banana hai — aur provider ki rate limit bhi paar ho jaayegi.' },
        { text: 'Idempotent send — (user, bill, date) par unique constraint', explain: 'Workers crash hote hain, queues redeliver karti hain. Iske bina user ko wahi reminder 3 baar jaayega.' },
        { text: 'Reality change handle karo — pay/cancel/date change par update', explain: 'Yahi ise cron se alag banata hai. Schedule ek jeeti-jaagti cheez hai — user pehle pay kare toh reminder cancel hona chahiye.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Scheduling par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'scheduling',
      questions: [
        { q: 'Technology se zyada kya matter karta hai?', target: 'index', explain: 'Access pattern. reminder_at par index — chahe woh Postgres ho, Redis sorted set ho ya timer wheel. Sawaal hamesha "poora scan ya seedha seek" ka hai.' },
        { q: '50 lakh notifications 9:00 AM par bhejne mein kya problem hai?', target: 'stagger', explain: 'Tumne apne liye ek flash crowd bana liya — aur provider ki rate limit bhi paar ho jaayegi. 9:00-9:30 mein phailao.' },
        { q: 'Yeh cron se alag kyun hai?', target: 'change', explain: 'Asli duniya badalti hai — user pehle pay kar de, bank due date badle, user reminders band kare. Schedule ek jeeti-jaagti cheez hai.' },
        { q: 'Worker crash hua aur job dobara uthi — kya chahiye?', target: 'idem', explain: 'Idempotent send: (user_id, bill_id, reminder_date) par unique constraint. Warna user ko wahi reminder 3 baar jaayega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Scheduling ki samajh',
      questions: [
        {
          q: 'Har ghante 2 crore rows scan karne mein asli galti kya hai?',
          choices: ["Index scheduled due jobs instead of scan","Only changing cron frequency fixes cost","Sharding makes every full scan cheap","More columns in SELECT remove scan work"],
          answer: 0,
          explain: 'Index lagana <b>madad</b> karta hai par asli fix nahi hai — kyunki query abhi bhi "sab se poochh rahi hai" ki tera waqt aa gaya. Sahi design mein jawab <b>pehle se likha hua</b> hai (<code>reminder_at</code>) aur worker sirf due rows uthata hai. Yeh bilkul deep pagination wali seekh hai.',
         choiceExplanations: ["Index lagana <b>madad</b> karta hai par asli fix nahi hai — kyunki query abhi bhi \"sab se poochh rahi hai\" ki tera waqt aa gaya. Sahi design mein jawab <b>pehle se likha hua</b> hai (<code>reminder_at</code>) aur worker sirf due rows uthata hai. Yeh bilkul deep pagination wali seekh hai.","Frequency reduce delay badha sakti hai; per run full scan cost remains.","Scatter gather full scan can still expensive shared work ho sakta hai.","Projection bytes ghata sakti hai; due rows access path phir bhi chahiye."] },
        {
          q: 'Scheduled system ko cron se kya alag banata hai?',
          choices: ["Schedules need update, cancel and recovery","Cron cannot reliably start any process","Schedule records never need timezone","Timer creation alone guarantees once-only"],
          answer: 0,
          explain: 'Cron ek <b>fixed</b> shell hai: "roz 9 baje yeh chalao". Scheduled work <b>per-entity</b> aur <b>mutable</b> hai: "is bill ko 25 tareekh ko dhyaan chahiye — jab tak kuch badal na jaaye". Yeh farak poora design badal deta hai.',
         choiceExplanations: ["Cron ek <b>fixed</b> shell hai: \"roz 9 baje yeh chalao\". Scheduled work <b>per-entity</b> aur <b>mutable</b> hai: \"is bill ko 25 tareekh ko dhyaan chahiye — jab tak kuch badal na jaaye\". Yeh farak poora design badal deta hai.","Cron execution useful hai; business scheduling semantics separate hain.","Business due dates timezone/calendar changes se affected ho sakti hain.","Crashes, retries and cancel races require durable state/idempotency."] },
        {
          q: '50 lakh notifications theek 9:00 AM par bhejne ka nateeja?',
          choices: ["Synchronized sends can overload shared quota","All notifications are free because async","Queueing makes provider quota infinite","Identical send time randomizes all traffic"],
          answer: 0,
          explain: 'Yeh <b>self-inflicted</b> flash crowd hai — aur woh sabse bewakoofi wala type hai kyunki woh poori tarah tumhare control mein tha. 30 minute mein stagger karne se kisi user ko koi farak nahi padta aur tumhara system aaram se chalta hai.',
         choiceExplanations: ["Yeh <b>self-inflicted</b> flash crowd hai — aur woh sabse bewakoofi wala type hai kyunki woh poori tarah tumhare control mein tha. 30 minute mein stagger karne se kisi user ko koi farak nahi padta aur tumhara system aaram se chalta hai.","Async work still CPU, provider quota and network consume karta hai.","Queue buffer throughput limit replace nahi karti.","Same send time correlated burst banata hai; stagger with business constraints."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Scheduling',
    instructions: 'Yeh sawaal "20M cards, reminders" ke roop mein aata hai. 🎤',
    questions: [
      {
        q: '"2 crore credit cards hain, har ek par due date se 5 din pehle reminder bhejna hai. Design karo."',
        choices: ["Durable due-index jobs; claim and dedupe","Every card owns a non persistent timer","Hourly all-row scan has bounded constant cost","Kafka standard topics provide arbitrary delay"],
        answer: 0,
        explain: 'Sabse achha jawab <b>access pattern</b> se shuru hota hai ("dobara mat dhoondo, likh lo"), phir scale ki baatein (partition, stagger) aur correctness (idempotent) jodta hai. Aur woh kisi ek technology par nahi tikta — jo sahi hai, kyunki yeh pattern ka sawaal hai.',
       choiceExplanations: ["Sabse achha jawab <b>access pattern</b> se shuru hota hai (\"dobara mat dhoondo, likh lo\"), phir scale ki baatein (partition, stagger) aur correctness (idempotent) jodta hai. Aur woh kisi ek technology par nahi tikta — jo sahi hai, kyunki yeh pattern ka sawaal hai.","Process restart timers lose kar sakta hai; durable recovery chahiye.","Full scan cardinality ke saath work grow karta hai.","Kafka alone generic per message scheduled delivery API nahi; stream/scheduler design needed."] },
      {
        q: "Payment event reminder send ke saath race kar sakta hai. Kya karoge?",
        choices: ["Cancel pending; recheck eligibility at send","Only cancellation event removes every race","Already paid means notification still valid","Delete schedule then skip every audit log"],
        answer: 0,
        explain: "Payment event pending reminder cancel kare; sender eligibility/version last safe check bhi rakho. Cancel and send race already inflight notification allow kar sakti hai; business contract define karo. Deletion versus state change audit/retention requirement se choose karo.",
       choiceExplanations: ["Payment event pending reminder cancel kare; sender eligibility/version last safe check bhi rakho. Cancel and send race already inflight notification allow kar sakti hai; business contract define karo. Deletion versus state change audit/retention requirement se choose karo.","Send already inflight ho sakta hai; last safe check/version guard chahiye.","Reminder business meaning payment state se tied hai.","Deletion may erase recovery/evidence; state transition retention plan needed."] },
    ],
  },
  success: [
    'Polling aur scheduled event ka farak bata sakte ho',
    'Time buckets aur partitioning design kar sakte ho',
    'Schedule ko mutable bana sakte ho',
    'Stagger aur idempotent send lagate ho',
  ],
  homework: `Apne system mein koi periodic scan dhoondo ("har ghante saare X check karo").
    Poochho: kya jawab pehle se calculate karke store kiya ja sakta hai?
    Zyadatar cases mein jawab "haan" hota hai — aur woh ek full scan ko ek seek bana deta hai.`,
  cards: [
    { front: 'Polling vs scheduled event?', back: '<b>Polling:</b> har ghante 2 crore rows scan. <b>Scheduled:</b> <code>reminder_at</code> ek baar calculate karke store karo, phir due rows par seedha seek. Wahi seekh jo deep pagination mein thi.' },
    { front: 'Scale par 3 cheezein?', back: '<b>Time buckets</b> (agla 1 min / 5 min / baad mein) · <b>Partition</b> (user_id/date/region — lock ki zaroorat bhi khatam) · <b>Stagger</b> (9:00-9:30, apna flash crowd mat banao).' },
    { front: 'Cron se kya alag hai?', back: '<b>Reality badalti hai.</b> User pehle pay kare → cancel. Due date badle → recompute. Reminders band → cancel. Schedule ek <b>jeeti-jaagti</b> cheez hai.' },
    { front: 'Idempotent send?', back: '<code>(user_id, bill_id, reminder_date)</code> par unique constraint. Workers crash hote hain aur queues redeliver karti hain — warna wahi reminder 3 baar jaayega.' },
  ],
},

/* ===================================================================== */
{
  id: 'locks',
  icon: '🔒',
  title: 'Distributed Locks — Sabse Achha Lock Woh Jo Lagta Hi Nahi',
  badge: 'Lock Skeptic',
  objectives: [
    'Distributed lock kyun <b>toota hua</b> hai',
    'Fencing token',
    'Lock hataane ke tareeke (aur woh behtar kyun hain)',
    'Leader election aur split-brain',
  ],
  lesson: [
    `<h3>📖 Ek lock jo jhooth bol raha hai</h3>
     <pre>1. Worker A ne lock liya (TTL 30 s)        ✅
2. A ka GC pause / network freeze — 40 s   (A ko pata nahi)
3. Lock expire hua, B ne le liya           B kaam kar raha hai
4. A jaaga aur likhne laga                 💀 DONO likh rahe hain</pre>
     <p>A ko lagta hai uske paas lock hai. Woh <b>galat</b> hai — par
     jaan-ne ka koi tareeka nahi. Yeh Redis ya kisi bhi lock implementation
     ka bug nahi; yeh distributed systems ka sach hai: <b>process ko nahi
     pata ki woh kitni der ruka tha.</b></p>
     <h3>🔐 Fencing token — asli ilaaj</h3>
     <pre>lock lo   → token 33 mila
A freeze hua
B ne lock liya → token 34 mila
B ne likha (token 34) → storage ne accept kiya, ab max = 34
A jaaga, likhne aaya (token 33) → storage ne REJECT kiya ✅</pre>
     <p>Shart yeh hai ki <b>storage</b> ko token samajhna padega. Bina uske
     lock sirf "best effort" hai — aur us par correctness nahi tikni chahiye.</p>`,
    `<h3>🔬 Behtar: lock hi mat lo</h3>
     <p>Zyadatar cases mein design badal ke lock hataya ja sakta hai:</p>
     <table>
       <tr><th>Lock ki jagah</th><th>Kaise</th></tr>
       <tr><td><b>DB unique constraint</b></td><td>"sirf ek jeetega" — DB khud tay kar dega</td></tr>
       <tr><td><b>Conditional update</b></td><td><code>UPDATE ... WHERE status = 'pending'</code> — 0 rows mile toh kisi aur ne le liya</td></tr>
       <tr><td><b>Partition</b></td><td>ek key sirf ek worker ko — do worker same cheez chhuenge hi nahi</td></tr>
       <tr><td><b>Idempotency</b></td><td>do baar ho bhi jaaye toh koi nuksaan nahi</td></tr>
     </table>
     <p><b>Sabse achha distributed lock woh hai jiski zaroorat hi na pade.</b></p>
     <h3>👑 Leader election</h3>
     <p>Kabhi-kabhi sach mein ek "leader" chahiye — cron jobs, partition
     assignment, sequence generation. Yahan sabse bada khatra
     <b>split-brain</b> hai: network partition mein <b>do</b> leader ban
     sakte hain.</p>
     <p>Isliye leader election ke liye <b>quorum</b> (majority) chahiye —
     etcd, ZooKeeper, Consul. Ek simple "Redis mein key set kar do" wala
     leader lock split-brain se nahi bachata.</p>
     <p class="tip">🎯 Practical seedhi: <b>(1)</b> DB constraint /
     conditional update — sabse simple aur sabse strong. <b>(2)</b> Partition
     — lock ki zaroorat khatam. <b>(3)</b> etcd/ZooKeeper — jab sach mein
     leader chahiye. <b>(4)</b> Redis lock — sirf "best effort" kaam ke liye
     (cache warming, duplicate work kam karna).Strong correctness claim mein stale holder,failure model aur resource fencing test karo.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Lock chahiye ya nahi?',
      instructions: 'Har situation ke liye sahi tareeka chuno.',
      bins: [
        { id: 'db', label: '🗄️ DB constraint / conditional update' },
        { id: 'part', label: '🔀 Partition — lock ki zaroorat hi nahi' },
        { id: 'lock', label: '🔒 Sach mein distributed lock' },
      ],
      items: [
        { text: 'Ek order sirf ek baar ship ho', bin: 'db', explain: "Atomic conditional claim ek worker ko order own karne deta hai. Actual carrier shipment alag effect hai: stable shipment ID, durable outbox, idempotency aur reconciliation chahiye; status update alone physical once-only shipping prove nahi karta." },
        { text: '10 workers, 2 crore reminders process karne hain', bin: 'part', explain: 'user_id ya date se partition karo — har worker apna hissa lega. Do worker same reminder chhuenge hi nahi, isliye lock ki zaroorat khatam.' },
        { text: 'Ek username sirf ek user ko mile', bin: 'db', explain: "UNIQUE constraint chosen DB scope mein concurrent duplicate writes reject karti hai. Index maintenance, locking aur replicated commit ka cost hota hai; application-side check race se stronger invariant milta hai." },
        { text: 'Cluster mein sirf ek node nightly job chalaye', bin: 'lock', explain: 'Yeh sach mein leader election hai. Quorum-based (etcd/ZooKeeper) chahiye — warna split-brain mein do node job chala denge.' },
        { text: 'Ek cache key sirf ek baar refresh ho (stampede)', bin: 'lock', explain: 'Best-effort lock bilkul theek hai. Do baar refresh ho bhi jaaye toh sirf thodi extra query hai — correctness par koi asar nahi.' },
        { text: 'Ek payment sirf ek baar charge ho', bin: 'db', explain: "Local ledger effect aur idempotency record ek atomic transaction mein rakho. External payment provider ke liye stable operation ID, provider idempotency aur uncertain-outcome reconciliation chahiye; local UNIQUE alone remote charge ko atomic nahi banati." },
      ],
    },
    {
      type: 'hotspot',
      title: 'Locks par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'locks',
      questions: [
        { q: 'Toote hue lock ka asli ilaaj kya hai?', target: 'fence', explain: 'Fencing token — har lock ke saath ek badhta hua number, aur storage purane token ko REJECT kare. Bina iske lock sirf best-effort hai.' },
        { q: 'Usse bhi behtar kya hai?', target: 'avoid', explain: 'Lock hi mat lo — DB unique constraint, conditional update, ya partition. Sabse achha distributed lock woh hai jiski zaroorat hi na pade.' },
        { q: 'Leader election ka sabse bada khatra?', target: 'split', explain: 'Split-brain — network partition mein DO leader ban sakte hain. Isliye quorum (majority) chahiye, ek simple Redis key nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Locks ki samajh',
      questions: [
        {
          q: 'Distributed lock "toota hua" kyun kehte hain?',
          choices: ["Expired holder can resume stale writes","Redis speed makes leases never expire","GC pause automatically releases remote work","Clock timeout proves resource ownership"],
          answer: 0,
          explain: 'Yeh kisi implementation ka bug nahi — <b>koi bhi</b> TTL-based lock isse nahi bach sakta. Process apne aap ko "abhi bhi lock holder" maanta rahega. Isi liye fencing token chahiye: storage ko decide karne do, process ko nahi.',
         choiceExplanations: ["Yeh kisi implementation ka bug nahi — <b>koi bhi</b> TTL-based lock isse nahi bach sakta. Process apne aap ko \"abhi bhi lock holder\" maanta rahega. Isi liye fencing token chahiye: storage ko decide karne do, process ko nahi.","Finite lease expires even ifholder process paused.","Pausedprocess resume old critical section execute kar sakta hai.","Timeout/ownership knowledge need fencing/versionchecked at resource."] },
        {
          q: "Multiple workers one order ship kar sakte hain. Safe durable claim/effect design?",
          choices: ["Atomic claim plus idempotent shipment intent","One DB update proves external package once","One queue consumer can never crash","App memory flag survives every restart"],
          answer: 0,
          explain: "Atomic conditional update multiple workers se one winner choose kar sakta hai. Physical shipment external side effect hai; shipment intent outbox, stable carrierID/idempotency and reconciliation chahiye. Database claim alone every package once guarantee nahi.",
         choiceExplanations: ["Atomic conditional update multiple workers se one winner choose kar sakta hai. Physical shipment external side effect hai; shipment intent outbox, stable carrierID/idempotency and reconciliation chahiye. Database claim alone every package once guarantee nahi.","Carrier/shipping side effect own durableIDand recovery need karta hai.","Single consumer crash/retry can repeat side effect.","Process memory restart par lost ho sakti hai."] },
        {
          q: "RedisTTLlease ko duplicate suppression ke liye kab evaluate karoge?",
          choices: ["Best-effort duplicate suppression tolerates overlap","Every leased lock guarantees linearizable writes","TTL alone fences expired holders forever","Any Redis use is inherently incorrect"],
          answer: 0,
          explain: "Lease based duplicate suppression best-effort work mein useful ho sakta hai. Strong correctness requirements ke liye resource-level fencing/atomic guards, failover and clock/pause assumptions analyze karo. Redis universal always/never rule se better guarantee explicit hai.",
         choiceExplanations: ["Lease based duplicate suppression best-effort work mein useful ho sakta hai. Strong correctness requirements ke liye resource-level fencing/atomic guards, failover and clock/pause assumptions analyze karo. Redis universal always/never rule se better guarantee explicit hai.","Correctness depends on failure model, resource guard and protocol.","TTL expiration oldholder ko external resource write se nahi rokta.","Redis useful cache/coordination tool hai; required guarantee specify karo."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Locks',
    instructions: 'Yahan skepticism dikhana seniority ka signal hai. 🎤',
    questions: [
      {
        q: '"Distributed lock kaise implement karoge?"',
        choices: ["First invariant; then atomicity or fencing","SETNX TTL alone proves every invariant","Quorum lease removes need for stale fencing","Choosing library removes all failure analysis"],
        answer: 0,
        explain: 'Sabse achha jawab pehle <b>sawaal ko challenge</b> karta hai. "Redis SETNX" bina fencing token ke ek toota hua lock hai — aur us par correctness tikana ek asli production bug hai jo bahut companies ne dekha hai.',
       choiceExplanations: ["Sabse achha jawab pehle <b>sawaal ko challenge</b> karta hai. \"Redis SETNX\" bina fencing token ke ek toota hua lock hai — aur us par correctness tikana ek asli production bug hai jo bahut companies ne dekha hai.","Expired holder resume aur failover cases resource guard require karte hain.","Paused old holder ko external resource fence/version reject kare.","Library assumptions and participant failure behavior still understand/test karo."] },
    ],
  },
  success: [
    'Bata sakte ho ki distributed lock kyun toota hua hai',
    'Fencing token samjha sakte ho',
    'Lock ki jagah DB constraint ya partition use kar sakte ho',
    'Split-brain aur quorum jaante ho',
  ],
  homework: `Apne code mein har distributed lock dhoondo. Har ek ke saamne poochho:
    "agar yeh lock TOOT jaaye aur do process ek saath chalein toh kya hoga?"
    Agar jawab "data kharab ho jaayega" hai, toh usse ek DB constraint ya
    conditional update se replace karo.`,
  cards: [
    { front: 'Distributed lock kyun toota hua hai?', back: 'Process ko nahi pata ki woh kitni der ruka tha (GC pause, network freeze). Uska lock expire ho chuka ho sakta hai aur <b>usse pata bhi nahi chalega</b>.' },
    { front: 'Fencing token?', back: 'Har lock ke saath ek <b>badhta hua number</b>. Storage purane token wale write ko <b>reject</b> kare. Bina iske lock sirf best-effort hai.' },
    { front: 'Lock ki jagah kya?', back: '<b>DB unique constraint</b> · <b>conditional update</b> (<code>WHERE status=\'pending\'</code>) · <b>partition</b> (ek key, ek worker) · <b>idempotency</b>. Sabse achha lock woh jiski zaroorat na pade.' },
    { front: 'Split-brain?', back: 'Network partition mein <b>do leader</b> ban jaate hain. Isliye leader election ke liye <b>quorum</b> (etcd/ZooKeeper) chahiye — ek simple Redis key nahi.' },
    { front: 'Redis lock kahan theek hai?', back: '<b>Best-effort</b> kaam mein — cache warming, duplicate email kam karna. Poochho: "do baar ho gaya toh kya?" Jawab "kuch khaas nahi" hai toh theek hai. Strong correctness ke liye lease/failure assumptions aur resource-enforced fencing/atomic guards verify karo.' },
  ],
},

/* ===================================================================== */
{
  id: 'boss-dist',
  icon: '👑',
  title: 'FINAL BOSS — Poora Order System',
  badge: 'Architect Mahaguru',
  objectives: [
    'Paanchon tracks ko ek design mein lagao',
    'Har decision ka tradeoff bol sako',
    'Ek system jo sach mein tikega',
  ],
  lesson: [
    `<h3>👑 Aakhri imtihaan</h3>
     <p>Ek order system design karna hai. Isme poore app ka nichod aa jaata
     hai:</p>
     <pre>Foundations  → request flow, sync vs async, boundaries
API          → idempotency, pagination, errors, rate limit
Data         → index, cache, pool, read model
Resilience   → timeout, retry, breaker, DLQ, degradation
Distributed  → outbox, saga, idempotent consumers, CQRS</pre>
     <p>Neeche pehle design canvas hai, phir ek final mission.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: '🏗️ Order system design karo',
      instructions: 'Har slot par ek decision chuno, phir review karao.',
      brief: `Ek e-commerce ka <b>order system</b>. 4 services: order · inventory · payment · shipping.
        Mobile app network drop par retry karta hai. Business team ko "Delhi ke pending orders"
        wali query roz 10,000 baar chahiye. Peak par 2,000 orders/minute.`,
      requirements: [
        '4 services, alag databases',
        'Mobile retry karta hai — koi double charge nahi',
        '"Delhi ke pending orders" — roz 10,000 queries',
        'Koi order chup-chaap kho na jaaye',
        'Ek service down ho toh baaki chalti rahein',
      ],
      pass: 16,
      slots: [
        {
          id: 'submit', label: 'Order submit', icon: '📱',
          note: 'Mobile network drop par retry karta hai',
          options: [
            { id: 'plain', label: "POST without stable operation ID", score: -3,
              why: 'Retry par duplicate order aur duplicate charge. Client jaan hi nahi sakta ki request pahunchi thi ya jawab kho gaya.' },
            { id: 'idem', label: "POST with stable operation ID", score: 3,
              why: 'Sahi. Key unique constraint ke saath, response ke SAATH store karo, aur dobara aane par wahi response lauta do.' },
            { id: 'dedupe', label: "Body hash treats equal intents same", score: -1,
              why: 'Toota hua — do alag users theek same order de sakte hain. Woh do jaayaz orders hain, duplicate nahi.' },
          ],
        },
        {
          id: 'event', label: 'Event publish', icon: '📤',
          note: 'Order bana, ab baaki services ko batana hai',
          options: [
            { id: 'dual', label: "Commit DB then publish separately", score: -3,
              why: 'Dual write. Beech mein crash = order DB mein hai par event kabhi nahi gaya. Silent inconsistency, koi error nahi.' },
            { id: 'outbox', label: "Domain and outbox in one commit", score: 3,
              why: "Dono rows ek durable DB transaction mein commit hoti hain. Relay recover karke retry kare aur retention preserve ho toh pending event publish ho sakta hai; relay lag, retries aur dedupe monitor karo." },
            { id: 'sync', label: "Sync RPC fanout after local save", score: -2,
              why: 'Order ki availability sabhi services ka GUNA ban jaayegi. Ek service down = order fail, jabki order toh ban sakta tha.' },
          ],
        },
        {
          id: 'flow', label: 'Multi-service flow', icon: '🧩',
          note: 'order → inventory → payment → shipping',
          options: [
            { id: '2pc', label: "Cross-system2PC required everywhere", score: -3,
              why: 'Blocking. Coordinator prepare ke baad mare toh sab locks pakde latke rehte hain. Availability sabse kamzor participant jaisi.' },
            { id: 'orch', label: "Durable orchestrated saga policy", score: 3,
              why: 'Sahi. 4 steps hain, isliye orchestration — flow ek jagah dikhega, state/retry/timeout sab wahin. Har step ka compensation likha hua.' },
            { id: 'choreo', label: "Event choreography with recovery", score: 1,
              why: 'Chalega, par 4 steps par flow kahin likha hi nahi hoga. "Order kis step par atka hai?" ka jawab dena bahut mushkil ho jaayega.' },
          ],
        },
        {
          id: 'consumer', label: 'Consumers', icon: '♻️',
          note: 'Broker at-least-once deliver karta hai',
          options: [
            { id: 'plain2', label: "Process each delivery blindly", score: -3,
              why: 'Duplicate delivery par double stock reservation aur double charge. At-least-once ka matlab hai duplicates AAYENGI — yeh "agar" nahi, "kab" hai.' },
            { id: 'idem2', label: "Atomic dedupe and local effect", score: 3,
              why: 'Sahi, aur "ek transaction mein" wala hissa zaroori hai — warna tumne dual write dobara bana diya.' },
            { id: 'check', label: "Read-before-effect without guard", score: -1,
              why: 'Check-then-act race condition. Do retries ek saath aa sakti hain (aur aksar aati hain). Sirf DB constraint atomic hai.' },
          ],
        },
        {
          id: 'query', label: '"Delhi ke pending orders"', icon: '🔎',
          note: 'Roz 10,000 baar, cross-service data',
          options: [
            { id: 'compose', label: "Per-user fanout composition", score: -2,
              why: 'Delhi mein 50,000 users hain → 50,000 calls. Yeh N+1 ka distributed roop hai. Composition 2-3 calls tak theek hai.' },
            { id: 'cqrs', label: "Owned event-derived read model", score: 3,
              why: 'Sahi. order_summary (order_id, user_city, status) — ek query, 5 ms. Freshness bech ke query speed khareedi.' },
            { id: 'shared', label: "Direct JOIN on private user schema", score: -3,
              why: 'Cross-service DB access. Distributed monolith — user-service ka schema badla toh tum chup-chaap tootoge.' },
          ],
        },
        {
          id: 'payfail', label: 'Payment service dheemi hai', icon: '🛡️',
          note: 'Down nahi — p99 8 second',
          options: [
            { id: 'wait', label: "Unbounded wait on payment API", score: -3,
              why: 'Har request 8 s thread + connection pakde rahegi. Thread pool khatam, aur poora order service down — jabki payment sirf DHEEMI thi.' },
            { id: 'guards', label: "Budgeted attempts;durable pending state", score: 3,
              why: 'Sahi. Timeout intezaar baandhta hai, breaker koshish rokta hai, bulkhead blast radius baandhta hai — aur order kho nahi raha, baad mein process hoga.' },
            { id: 'retry', label: "Unlimited retries until payment succeeds", score: -3,
              why: 'Retry storm. Dheemi service ko aur maaroge, apna p99 badhaoge, aur threads lambe samay bandhak rakhoge.' },
          ],
        },
      ],
      verdicts: {
        great: 'Har decision production-grade hai. Patterns defined failure cases mein recovery improve karte hain;durability,external idempotency,reconciliation aur failure drills se actual guarantees verify karo.',
        ok: 'Design chal jaayega, par upar dekho — ek-do jagah tumne apne aap ko future incident de diya hai.',
        bad: 'Yeh system pehle bade spike ya pehli dheemi dependency par toot jaayega. Har option ka "why" padho — asli seekh wahi hai.',
      },
    },
    {
      type: 'terminal',
      title: '🏁 FINAL MISSION',
      goal: 'Order system ka core banao: idempotent order creation (mobile retry safe) aur cross-service query ke liye read model index. Prove karo ki dono kaam karte hain.',
      sys: SD.sys.payments({
        db: { tables: { order_summary: {
          rows: 8400000, rowBytes: 180, pk: 'order_id',
          cols: ['order_id', 'user_id', 'user_city', 'status', 'total', 'created_at'],
          indexes: [{ name: 'order_summary_pkey', cols: ['order_id'], unique: true }],
        } } },
        api: { primaryTable: 'order_summary', countTotal: false },
      }),
      tasks: T_BOSS_DIST,
      success: SD.allTasks(T_BOSS_DIST),
      successText: `🎉 <b>Poora app khatam.</b>
        <br><br>Tumne abhi do sabse zaroori cheezein saath mein kar li:
        <br>• <b>Idempotency</b> — mobile retry par double charge nahi
        <br>• <b>Read model + composite index</b> — cross-service query ek 5 ms query
        <br><br>Aur poore app ka nichod chaar line mein:
        <br><b>1.</b> Har request ka raasta jaano — aur jaano kaunsa hop <b>queue</b> banata hai
        <br><b>2.</b> API ki cost <b>bounded</b> rakho — mehenga sawaal poochhne hi mat do
        <br><b>3.</b> Pehle <b>access pattern</b>, phir schema aur index — aur har kadam par <b>naapo</b>
        <br><b>4.</b> Har remote call ek din fail hogi — <b>timeout, jitter, breaker, fallback, bulkhead, shed</b>
        <br><b>5.</b> Distributed system mein "ek saath" nahi hota, sirf "aakhir mein" —
        isliye sab kuch <b>idempotent, retryable, observable</b>.`,
      solution: [
        "sim set api.idempotency true",
        "POST /v1/orders -H 'Idempotency-Key: ord-8812'",
        "POST /v1/orders -H 'Idempotency-Key: ord-8812'",
        "CREATE INDEX ix_summary ON order_summary(user_city, status, created_at)",
        "EXPLAIN SELECT * FROM order_summary WHERE user_city = Delhi AND status = pending",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.idempotency === true && !!s.sys.seenKeys['ord-8812'] && m.index(s, 'order_summary', ['user_city', 'status', 'created_at']) && m.current(s, 'explain', r => r.table === 'order_summary' && !!r.indexUsed); },
      hints: [
        "Pehle observation: Order banao — idempotency key ke saath. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Read model query ka plan dekho — ek tez query honi chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim set api.idempotency true\nPOST /v1/orders -H 'Idempotency-Key: ord-8812'\nPOST /v1/orders -H 'Idempotency-Key: ord-8812'\nCREATE INDEX ix_summary ON order_summary(user_city, status, created_at)\nEXPLAIN SELECT * FROM order_summary WHERE user_city = Delhi AND status = pending",
      ],
    },
  ],
  interview: {
    title: '🎤 FINAL ROUND',
    instructions: 'Aakhri sawaal. Yahan poora app bolna hai.',
    questions: [
      {
        q: '"Ek order system design karo jo order kabhi na khoye aur double charge kabhi na kare."',
        choices: ["Stable intent; durable handoff; reconciliation","Sync calls plus retry ensure no loss","2PC covers non participating payment APIs","Outbox eliminates all possible data loss"],
        answer: 0,
        explain: 'Poore jawab mein har layer ka ek guard hai: <b>idempotency key</b> (client retry), <b>outbox</b> (dual write), <b>saga</b> (distributed transaction), <b>idempotent consumer</b> (at-least-once), <b>read model</b> (cross-service query). Har ek alag failure mode rokta hai.',
       choiceExplanations: ["Poore jawab mein har layer ka ek guard hai: <b>idempotency key</b> (client retry), <b>outbox</b> (dual write), <b>saga</b> (distributed transaction), <b>idempotent consumer</b> (at-least-once), <b>read model</b> (cross-service query). Har ek alag failure mode rokta hai.","RPC partial failure and timeout ambiguity persist with retries.","Provider must participate in protocol; many external APIs do not.","Durability and recovery assumptions still apply; outbox is not infinite reliability."] },
      {
        q: "Distributed failures ke liye useful design principle?",
        choices: ["Failure ambiguity needs durable explicit state","All work should always be asynchronous","Distributed systems cannot coordinate anything","Eventual consistency always satisfies invariants"],
        answer: 0,
        explain: "Distributed failure mein success/failure knowledge ambiguous ho sakti hai; durable explicit state, idempotency, safe bounded retry and observability useful hain. Coordination/transactions possible hain, universal only-eventual slogan inaccurate hai.",
       choiceExplanations: ["Distributed failure mein success/failure knowledge ambiguous ho sakti hai; durable explicit state, idempotency, safe bounded retry and observability useful hain. Coordination/transactions possible hain, universal only-eventual slogan inaccurate hai.","Some user flows need synchronous confirmation and stronger invariants.","Transactions, consensus and coordination exist with specific guarantees/cost.","Money/inventory constraints may require stronger protocol."] },
    ],
  },
  success: [
    'Ek poora distributed order system design kar sakte ho',
    'Har layer par sahi guard laga sakte ho',
    'Har decision ka tradeoff bol sakte ho',
    'Paanchon tracks ko ek saath use kar sakte ho',
  ],
  homework: `Apne system ka ek asli flow lo aur is app ki poori checklist se review karo:
    request path · API contract · index/cache/pool · timeout/retry/breaker/fallback ·
    idempotency/outbox/saga. Har "❌" ke saamne likho ki woh kis din incident banega.
    Woh list tumhare agle quarter ka roadmap hai.`,
  cards: [
    { front: 'Order system ke 5 guards?', back: '<b>Idempotency-Key</b> (client retry) · <b>Outbox</b> (dual write) · <b>Saga</b> (distributed transaction) · <b>Idempotent consumer</b> (at-least-once) · <b>Read model</b> (cross-service query).' },
    { front: 'Distributed systems ka nichod?', back: '"Ek saath" jaisi koi cheez nahi hoti, sirf <b>"aakhir mein"</b>. Isliye har cheez <b>idempotent</b>, <b>retryable</b> aur <b>observable</b> banao.' },
    { front: 'Poore app ka nichod?', back: '<b>1.</b> Request ka raasta jaano <b>2.</b> API ki cost bounded rakho <b>3.</b> Access pattern pehle, phir index — aur naapo <b>4.</b> Har remote call fail hogi: timeout+jitter+breaker+fallback+bulkhead+shed <b>5.</b> Idempotent, retryable, observable.' },
  ],
},
]);

/* =====================================================================
   L9.5 — Contention & reservations   (Hello Interview: "dealing with contention")
   ===================================================================== */
const T_CONT = [
  { text: 'Bina kisi lock ke ek seat par do log — double booking dekho',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.doubleBooked === true) },
  { text: 'Seats reset karo',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'reset') },
  { text: 'Pessimistic locking chalu karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'set' && /booking\.mode/.test(r.path) && r.value === 'pessimistic') },
  { text: 'Ab wahi do log — sirf ek jeetna chahiye',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.mode === 'pessimistic' && r.sold === 1 && r.rejected >= 1) },
  { text: 'Ab optimistic try karo',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.mode === 'optimistic' && r.sold === 1) },
  { text: 'Aur reservation: seat par TTL ke saath hold lagao',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'hold' && r.ok === true && r.ttl > 0) },
  { text: 'Dekho ki hold doosre khareedaar ko rok deta hai',
    check: s => s.records.some(r => r.kind === 'book' && r.op === 'seat' && r.blockedByHold === true) },
];

SD.registerLevelsAfter('dist', 'locks', [
{
  id: 'contention',
  icon: '🎟️',
  title: 'Contention — Ek Seat, Do Khareedaar',
  badge: 'Contention Vijeta',
  objectives: [
    'Check-then-act race — woh bug jo test mein kabhi nahi dikhta',
    'Pessimistic vs optimistic — aur hot row par kaun jeetta hai',
    'Reservation (hold + TTL) — checkout ke liye asli pattern',
    'Lock ke andar kabhi network call nahi',
  ],
  lesson: [
    `<h3>📖 Do lines ke beech ki khaali jagah</h3>
     <pre>seat = SELECT * FROM seats WHERE id = 'A1';   ← "khaali hai?"
if (seat.status == 'free') {                   ← "haan"
    UPDATE seats SET status='sold' WHERE id='A1';
}</pre>
     <p>Yeh code sahi <b>dikhta</b> hai. Aur 99.9% waqt sahi <b>chalta</b> bhi hai.
     Par jab do requests theek ek saath aayein:</p>
     <pre>request A: SELECT → "free"
request B: SELECT → "free"     ← A ne abhi tak UPDATE nahi kiya
request A: UPDATE → sold
request B: UPDATE → sold       ← ek hi seat, do log 💥</pre>
     <p class="tip">🎯 Ise <b>check-then-act race</b> kehte hain, aur yeh production
     bugs ki sabse chalak kism hai — kyunki woh testing mein lagbhag kabhi nahi dikhti
     (uske liye do requests ka <b>theek</b> ek saath aana zaroori hai), par
     jab traffic aata hai toh woh roz hoti hai. Aur uska nishaan hamesha ek hi hota
     hai: "yeh kaise ho sakta hai?"</p>
     <h3>🔒 Do tareeke, do alag soch</h3>
     <table>
       <tr><th></th><th>Pessimistic</th><th>Optimistic</th></tr>
       <tr><td>Soch</td><td>"takraav hoga hi" — pehle lock lo</td><td>"shayad na ho" — likhte waqt check karo</td></tr>
       <tr><td>SQL</td><td><code>SELECT … FOR UPDATE</code></td><td><code>UPDATE … WHERE version = ?</code></td></tr>
       <tr><td>Doosri request</td><td><b>rukti</b> hai</td><td>chalti rehti hai, phir <b>haar</b> jaati hai</td></tr>
       <tr><td>Kam contention</td><td>bekaar ka wait</td><td>✅ tez</td></tr>
       <tr><td>Zyada contention (hot row)</td><td>✅ ek-ek karke, saaf</td><td>❌ sab bar-bar retry karke haarte hain</td></tr>
     </table>
     <p>Optimistic mein version column badhta hai, aur haarne wali request ko
     <code>0 rows updated</code> milta hai — usse pata chal jaata hai ki woh haar gayi.
     Isliye "optimistic" ka matlab "bina protection" nahi hai; matlab hai
     "protection <b>likhne</b> ke pal par, padhne ke pal par nahi".</p>`,
    `<h3>🎟️ Reservation — asli duniya ka pattern</h3>
     <p>Ticket booking mein ek teesra problem hai jo dono locks hal nahi karte:
     user ko <b>payment karne ka waqt</b> chahiye. 3 minute. Us doraan seat
     kisi aur ko nahi jaani chahiye — par ek DB lock 3 minute tak pakde rakhna
     paagalpan hai (woh connection, woh transaction, woh row — sab block).</p>
     <pre>1. HOLD    seat par ek reservation banao, TTL 10 minute
2. PAY     user checkout karta hai (koi DB lock nahi latka hua)
3a. CONFIRM  payment ok → hold ko sale mein badlo
3b. EXPIRE   user chala gaya → TTL khatam → seat apne aap wapas</pre>
     <p class="tip">🎯 <b>TTL hi is pattern ka dil hai.</b> Uske bina abandoned
     checkouts dheere-dheere poora inventory kha jaate hain — aur woh dikhta bhi
     nahi, kyunki technically kuch "fail" nahi hua. Sold-out show jiske aadhe seats
     kisi ke cart mein pade hain, yeh usi ka natija hai.</p>
     <p>Redis mein yeh ek line hai — <code>SET seat:A1 user123 NX EX 600</code>:
     <code>NX</code> se woh tabhi banega jab pehle se na ho (atomic check-and-set),
     aur <code>EX</code> se woh apne aap mit jaayega.</p>
     <h3>⚠️ Do niyam jo mehenge padte hain</h3>
     <p><b>1. Lock ke andar kabhi network call mat karo.</b> Lock ka waqt =
     us row par sabka wait. Agar tumne lock ke andar payment gateway ko call kiya
     (2 second), toh us seat par sab 2 second ruke rehte hain. Lock sirf
     <b>DB operations</b> ke around ho.</p>
     <p><b>2. Lock ki umar hamesha bandhi ho.</b> Jo process lock leke crash ho gaya,
     uska lock hamesha ke liye nahi rehna chahiye. Redis mein TTL, DB mein
     transaction timeout, aur distributed lock mein <b>fencing token</b>
     (jo tumne pichhle level mein dekha) — taaki purana maalik wapas aake
     ganda na kar de.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Ek seat, do khareedaar',
      goal: `Pehle double booking <b>banao</b>, phir teen tareekon se rok ke dekho.`,
      sys: SD.sys.orders({ booking: { mode: 'none', seats: {}, holds: {} } }),
      tasks: T_CONT,
      success: SD.allTasks(T_CONT),
      successText: `Teen alag ilaaj, teen alag jagah ke liye:
        <b>pessimistic</b> jab hot row ho (sab ek hi seat maang rahe hain),
        <b>optimistic</b> jab takraav kam ho (tez, koi rukta nahi),
        aur <b>reservation</b> jab beech mein insaan ka waqt ho (checkout).
        Aur ek niyam jo teenon par lagta hai: <b>lock ke andar network call kabhi nahi</b>.`,
      solution: [
        "book seat A1 --concurrent 2",
        "book reset",
        "sim set booking.mode pessimistic",
        "book seat A1 --concurrent 2",
        "sim set booking.mode optimistic",
        "book reset",
        "book seat A1 --concurrent 2",
        "book hold B4 --ttl 600",
        "book seat B4 --concurrent 1",
      ],
      verify: s => { const m = SD.mission; return s.sys.booking?.mode === 'optimistic' && !!s.sys.booking.seats.A1 && s.sys.booking.holds.B4 === 600 && m.current(s, 'book', r => r.blockedByHold && r.seat === 'B4'); },
      hints: [
        "Pehle observation: Bina kisi lock ke ek seat par do log — double booking dekho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Dekho ki hold doosre khareedaar ko rok deta hai. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nbook seat A1 --concurrent 2\nbook reset\nsim set booking.mode pessimistic\nbook seat A1 --concurrent 2\nsim set booking.mode optimistic\nbook reset\nbook seat A1 --concurrent 2\nbook hold B4 --ttl 600\nbook seat B4 --concurrent 1",
      ],
    },
    {
      type: 'bins',
      title: 'Kaunsa tareeka kahan',
      instructions: 'Har sthiti ke liye sahi contention control.',
      bins: [
        { id: 'pess', label: '🔒 Pessimistic' },
        { id: 'opt', label: '🔁 Optimistic' },
        { id: 'res', label: '🎟️ Reservation (TTL)' },
      ],
      items: [
        { text: 'Concert ki front-row seat — 50,000 log ek saath', bin: 'pess', explain: 'Ek hi hot row par bhaari contention. Optimistic mein lagbhag sab haarenge aur retry karenge — woh ek retry storm hai. Yahan queue lagwana (lock) hi saaf hai.' },
        { text: 'User apni profile edit kar raha hai', bin: 'opt', explain: 'Takraav lagbhag kabhi nahi hoga (do log ek hi profile ek saath kam hi edit karte hain). Version check se koi rukta nahi, aur jo dulrbh takraav ho use "kisi aur ne badal diya" dikha do.' },
        { text: 'Flight seat select ki, ab payment page par 5 minute', bin: 'res', explain: 'Beech mein <b>insaan ka waqt</b> hai. DB lock 5 minute nahi pakda ja sakta. Hold + TTL: seat surakshit, aur user chhod de toh apne aap wapas.' },
        { text: 'Warehouse mein inventory count ghatana', bin: 'pess', explain: 'Kai orders ek saath usi SKU ko chhoote hain aur oversell ka daam asli hai. <code>UPDATE … SET qty = qty - 1 WHERE qty > 0</code> bhi ek achha atomic hal hai — woh bhi ek tarah ka lock hi hai.' },
        { text: 'Ek shared document ka title badalna', bin: 'opt', explain: 'Contention kam, aur haarne ka nuksaan chhota ("kisi aur ne abhi badla, dobara dekho"). Yahan rukna ulta bekaar hai.' },
        { text: 'Cart mein daala hua limited-edition item', bin: 'res', explain: 'Wahi ticket wala shape: cart mein daalna = hold. Aur TTL laazmi hai, warna log cart mein cheezein daal ke bhool jaate hain aur stock chup-chaap khatam dikhta hai.' },
      ],
    },
    {
      type: 'incident',
      title: 'Incident — "Ek hi seat do logon ko bik gayi"',
      pager: '🚨 Support: "Do customers ke paas seat 14C ka ticket hai. Dono confirmed."',
      start: 'c1',
      nodes: {
        c1: {
          text: 'Code mein SELECT karke check hai, phir UPDATE. Transaction bhi hai. Phir kaise?',
          choices: [
            { t: "Check isolation;useatomic claim", good: true, next: 'c2', explain: 'Sahi. Zyadatar DBs ka default <b>READ COMMITTED</b> hai, jo yeh nahi rokta: dono SELECT successful, dono ko "free" mila. Transaction <b>atomicity</b> deta hai, <b>mutual exclusion</b> nahi. Uske liye lock chahiye.' },
            { t: "Local process mutex only", good: false, explain: 'Mutex sirf <b>ek process</b> ke andar kaam karta hai. Do pods par woh bilkul bekaar hai — aur yeh galti isliye chalak hai ki local testing (ek process) mein woh kaam karti hui dikhti hai.' },
            { t: "Retry racing writes unconditionally", good: false, explain: 'Retry tab kaam aata hai jab kuch <b>fail</b> ho. Yahan dono requests successful thi — bas natija galat tha. Retry se kuch nahi badlega.' },
          ],
        },
        c2: {
          text: 'FOR UPDATE laga diya, double booking band. Par ab checkout page par timeouts aa rahe hain.',
          choices: [
            { t: "Trace payment calls inside row lock", good: true, next: 'c3', explain: 'Yahi hota hai. Lock ke andar ek 2-second ka external call matlab us seat par sab 2 second ruke. Lock sirf DB ke kaam ke around ho — network call hamesha uske <b>bahar</b>.' },
            { t: "Raise lock timeout and wait longer", good: false, explain: 'Isse timeouts kam dikhenge par wait aur lamba ho jaayega — user ke liye woh aur bura hai. Sawaal yeh hai ki lock itni der pakda kyun ja raha hai.' },
            { t: "Raise DBpool without holder evidence", good: false, explain: 'Connections yahan hadd nahi hain — <b>lock</b> hadd hai. Sab usi ek row ka intezaar kar rahe hain; 500 connections bhi ek-ek karke hi chalenge.' },
          ],
        },
        c3: {
          text: 'Payment call lock ke bahar kar di. Par ab payment ke doraan seat kisi aur ko chali jaati hai.',
          choices: [
            { t: "Owned expiring hold;guarded confirm", good: true, next: 'end', explain: 'Yahi asli hal hai. Hold ek <b>chhoti</b> transaction hai (lock milliseconds ka), par uska asar 10 minute rehta hai — aur TTL se abandoned checkouts apne aap saaf ho jaate hain. Ab teenon problems ek saath hal hain: race, lock ka waqt, aur user ka waqt.' },
            { t: "Hold DB lock through external payment", good: false, explain: 'Wapas wahi problem — ek DB lock minute bhar latka hua, poore us row par. Aur agar user ka browser band ho gaya toh woh lock timeout tak baitha rahega.' },
            { t: "Charge before any seat ownership check", good: false, explain: 'Ab tumne paisa le liya aur seat na milne ka risk user par daal diya. Refund flow, support tickets, aur bharosa — teenon ka nuksaan.' },
          ],
        },
        end: {
          end: true,
          text: 'Hold + TTL laga. Double booking khatam, checkout tez, aur abandoned carts apne aap saaf.',
          summary: `<b>Seekh:</b> teen alag problems the, aur teenon ek hi galat jagah se aa rahe the.
            <br><br>• <b>Race</b> → transaction kaafi nahi; <code>FOR UPDATE</code> ya atomic conditional update chahiye
            <br>• <b>Lock ka waqt</b> → lock ke andar <b>kabhi</b> network call nahi
            <br>• <b>User ka waqt</b> → uske liye lock nahi, <b>reservation (hold + TTL)</b>
            <br><br><b>Aur TTL optional nahi hai:</b> uske bina abandoned checkouts chup-chaap
            poora inventory kha jaate hain — aur kuch "fail" na hone ki wajah se woh
            kisi dashboard par nahi dikhta.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Contention ki samajh',
      questions: [
        {
          q: "READ COMMITTED plain SELECT free-seat then UPDATE, without guard. Booking safe?",
          choices: ["Read-modify-write needs isolation or guard","Any transaction serializes concurrent SELECT","Rollback after duplicate makes both safe","Only SERIALIZABLE can protect reservation"],
          answer: 0,
          explain: "Given READ COMMITTED plain SELECT then UPDATE without guard, both transactions same seat free read kar sakti hain. SELECT FOR UPDATE, atomic conditional update orSERIALIZABLE with retry appropriate invariant protect kar sakte hain.",
         choiceExplanations: ["Given READ COMMITTED plain SELECT then UPDATE without guard, both transactions same seat free read kar sakti hain. SELECT FOR UPDATE, atomic conditional update orSERIALIZABLE with retry appropriate invariant protect kar sakte hain.","READ COMMITTED plain SELECT may read same available value in parallel.","Already committed/external effects may not undo automatically.","Row locking/atomic conditional update can enforce specific invariant too."] },
        {
          q: 'Hot row (sabse popular seat) par optimistic locking kya karega?',
          choices: ["High conflicts can waste optimistic retries","Optimistic always wins under hot contention","Pessimistic removes wait and all deadlocks","Every failed compare should retry forever"],
          answer: 0,
          explain: "High contention optimistic retries waste work and amplify load kar sakte hain; bounded queueing/pessimistic claim or admission useful ho sakte hain. Whichfaster depends workload, transaction duration and lock implementation; benchmark, avoid unbounded retry.",
         choiceExplanations: ["High contention optimistic retries waste work and amplify load kar sakte hain; bounded queueing/pessimistic claim or admission useful ho sakte hain. Whichfaster depends workload, transaction duration and lock implementation; benchmark, avoid unbounded retry.","Same hot row causes many version checks/retries; measure offered load.","Locks queue and can deadlock; timeout/order/admission still needed.","Bounded retry/backoff and admission needed to avoid amplification."] },
        {
          q: 'Reservation mein TTL na ho toh?',
          choices: ["Abandoned holds can leak available inventory","No TTL automatically double-books every seat","Lock timeout equals reservation business expiry","Long checkout means ownership forever"],
          answer: 0,
          explain: 'Yeh failure sabse chalak hai kyunki usme kuch <b>fail nahi hota</b>. Koi error nahi, koi alert nahi — bas inventory dheere-dheere gayab hoti jaati hai. TTL hi hold ko ek <b>vaada</b> banata hai, ek <b>kabza</b> nahi.',
         choiceExplanations: ["Yeh failure sabse chalak hai kyunki usme kuch <b>fail nahi hota</b>. Koi error nahi, koi alert nahi — bas inventory dheere-dheere gayab hoti jaati hai. TTL hi hold ko ek <b>vaada</b> banata hai, ek <b>kabza</b> nahi.","Leak/unreleasedhold and double booking are different failure modes.","Lock lifetime and business hold state are different contracts.","Reservation must have expiry/cancel/reclaim policy."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Contention',
    instructions: 'Ticket booking lagbhag har interview mein aata hai. 🎤',
    questions: [
      {
        q: '"Ticketmaster design karo. Ek popular concert, 50,000 log ek saath."',
        choices: ["Short atomic holds; TTL; admission; safe payment","Hold DB lock across user payment page","Redis lease alone guarantees no double-sell","Unlimited retries on one popular seat"],
        answer: 0,
        explain: 'Do cheezein ek saath chahiye. <b>Reservation</b> checkout ke waqt ko sambhaalta hai. Aur <b>waiting room</b> — kyunki 50,000 requests ek hi event ke liye ek saath aa rahi hain, aur unhe seedha DB tak jaane dena hi outage hai. Yeh wahi flash-crowd admission control hai jo tum Resilience track mein dekh chuke ho.',
       choiceExplanations: ["Do cheezein ek saath chahiye. <b>Reservation</b> checkout ke waqt ko sambhaalta hai. Aur <b>waiting room</b> — kyunki 50,000 requests ek hi event ke liye ek saath aa rahi hain, aur unhe seedha DB tak jaane dena hi outage hai. Yeh wahi flash-crowd admission control hai jo tum Resilience track mein dekh chuke ho.","Human/payment wait minutes-long DB locks hold resources and contention.","Lease expiry andstaleholder need authoritative guard and payment reconciliation.","Contention and deadline budget require bounded attempts/admission."] },
      {
        q: '"Optimistic ya pessimistic — kaise chunoge?"',
        choices: ["Contention and business duration decide","Pessimistic always faster for every row","Optimistic always safer under every failure","DB brand alone chooses application locking"],
        answer: 0,
        explain: "Contention, transaction duration, isolation aur retry cost compare karo. Short atomic claim mein optimistic guard ya pessimistic lock useful ho sakta hai. Human checkout ke minutes tak DB lock mat rakho; durable reservation, expiry aur ownership check use karo.",
       choiceExplanations: ["Contention, transaction duration, isolation aur retry cost compare karo. Short atomic claim mein optimistic guard ya pessimistic lock useful ho sakta hai. Human checkout ke minutes tak DB lock mat rakho; durable reservation, expiry aur ownership check use karo.","Low contention may not justify lock wait/coordination overhead.","Correctness requires valid state and failure handling in either strategy.","Isolation level, access pattern and contention also matter."] },
    ],
  },
  success: [
    'Check-then-act race pehchaan sakte ho',
    'Pessimistic vs optimistic contention rate se chun sakte ho',
    'Reservation (hold + TTL) pattern bana sakte ho',
    'Jaante ho ki lock ke andar network call kyun nahi',
  ],
  homework: `Apne code mein ek "check karke phir likho" wala hissa dhoondo —
    stock, seat, quota, ya "kya yeh naam liya hua hai". Poochho:
    (1) do requests ek saath aayein toh? (2) kya woh check <b>update ke andar</b>
    ho sakta hai (<code>WHERE qty > 0</code>)? (3) agar beech mein user ka waqt hai,
    toh kya wahan hold + TTL chahiye?`,
  cards: [
    { front: 'Check-then-act race?', back: 'SELECT "free" → UPDATE "sold", do requests ek saath = <b>dono</b> jeet gaye. Testing mein lagbhag kabhi nahi dikhta, production mein roz.' },
    { front: 'Transaction se race rukti hai?', back: '<b>Nahi.</b> Transaction <b>atomicity</b> deta hai, mutual exclusion nahi. Chahiye: <code>SELECT … FOR UPDATE</code>, ya condition ko update ke andar daalo (<code>WHERE status=\'free\'</code>).' },
    { front: 'Pessimistic vs optimistic?', back: 'Faisla <b>contention rate</b> se. Kam takraav → optimistic (koi rukta nahi). Hot row → pessimistic (optimistic wahan sabko retry karwaata hai = storm).' },
    { front: 'Reservation pattern?', back: '<b>HOLD (TTL) → PAY → CONFIRM/EXPIRE.</b> Redis: <code>SET seat:A1 user NX EX 600</code>. Lock milliseconds ka, asar 10 minute ka.' },
    { front: 'TTL ke bina hold?', back: 'Abandoned checkouts <b>chup-chaap</b> poora inventory kha jaate hain — koi error nahi, koi alert nahi, bas "sold out" jabki seats kisi ke cart mein hain.' },
    { front: 'Lock ka sunehra niyam?', back: '<b>Lock ke andar kabhi network call nahi.</b> Lock ka waqt = us row par sabka wait. Aur lock ki umar hamesha bandhi ho (TTL / timeout / fencing token).' },
  ],
},
]);

/* =====================================================================
   L7.5 — Streams: queue nahi, LOG
   ===================================================================== */
const T_STREAM = [
  { text: 'Bina watermark ke ek window chalao — late events kho jaayenge',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'window' && !r.watermark && r.dropped > 0) },
  { text: 'Ab watermark ke saath — kuch late events pakde jaane chahiye',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'window' && r.watermark > 0 && r.caught > 0) },
  { text: 'Log se replay karo — queue yeh kar hi nahi sakti',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'replay' && r.ok === true) },
  { text: 'Partitions se zyada consumers lagao — kuch khaali baithenge',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle > 0) },
  { text: 'Ab consumers ko partitions ke barabar ya kam karo',
    check: s => s.records.some(r => r.kind === 'stream' && r.op === 'partitions' && r.idle === 0) },
];

SD.registerLevelsAfter('dist', 'exactlyonce', [
{
  id: 'streams',
  icon: '🌊',
  title: 'Stream — Queue Nahi, Ek LOG',
  badge: 'Stream Sadhak',
  objectives: [
    'Queue aur log ka asli farak: <b>retention aur replay</b>',
    'Consumer groups — ek data, kai independent readers',
    'Partitions hi tumhari max parallelism hain',
    'Event time vs processing time, aur <b>watermark</b>',
  ],
  lesson: [
    `<h3>📖 "Kafka bhi toh queue hi hai na?" — nahi</h3>
     <table>
       <tr><th></th><th>Queue (SQS, RabbitMQ)</th><th>Log (Kafka, Kinesis)</th></tr>
       <tr><td>Padhne ke baad</td><td>message <b>delete</b></td><td>message <b>rehta hai</b> (retention tak)</td></tr>
       <tr><td>Kai consumers</td><td>message baant lete hain</td><td>har group ko <b>poora</b> data</td></tr>
       <tr><td>Replay</td><td>❌ mumkin nahi</td><td>✅ offset peeche karo</td></tr>
       <tr><td>Ordering</td><td>aksar nahi</td><td>✅ partition ke andar</td></tr>
       <tr><td>Position kaun rakhta hai</td><td>broker</td><td><b>consumer</b> (offset)</td></tr>
     </table>
     <p>Yeh sirf feature ka farak nahi — <b>soch</b> ka farak hai.
     Queue ek <b>to-do list</b> hai: kaam lo, karo, hatao.
     Log ek <b>itihaas</b> hai: sab kuch likha hai, aur har padhne wala apni
     jagah khud yaad rakhta hai.</p>
     <p>Isse jo cheezein mumkin ho jaati hain, woh queue mein ho hi nahi saktin:</p>
     <pre>• Naya feature banaya? Purana data usi log se replay kar lo
• Bug se galat aggregation bani? Offset peeche karo, dobara chalao
• Nayi team ko wahi events chahiye? Naya consumer group — purane par koi asar nahi
• Debugging? Woh exact event abhi bhi wahin pada hai</pre>
     <p class="tip">🎯 Aur ulta bhi sach hai: agar tumhe <b>sirf</b> "kaam lo aur karo"
     chahiye — background jobs, emails, thumbnails — toh queue simple, sasti aur
     kaafi hai. Kafka ka bill (cluster, partitions, offsets, rebalancing) tabhi
     jaayaz hai jab tumhe uska <b>log</b> wala gun chahiye.</p>`,
    `<h3>🔢 Partitions = parallelism ki hadd</h3>
     <pre>topic: orders   (6 partitions)

   partition 0 ──┐
   partition 1 ──┼─→ consumer A
   partition 2 ──┘
   partition 3 ──┐
   partition 4 ──┼─→ consumer B
   partition 5 ──┘

   consumer C, D  →  😴 khaali (partitions khatam)</pre>
     <p>Ek partition ek waqt mein <b>ek hi</b> consumer ko milta hai — warna
     ordering toot jaati. Isliye <b>partitions se zyada consumers bekaar hain</b>.</p>
     <p class="tip">🎯 Aur partition count baad mein badhana mehenga hai, kyunki
     <code>hash(key) % partitions</code> ka jawab badal jaata hai — yaani ek user ke
     naye events ab <b>alag</b> partition mein jaayenge, aur uske purane events se
     unka kram toot jaayega. Isliye partition count shuru mein hi soch ke chuno:
     aaj ki zaroorat se 2–3x.</p>
     <p><b>Ordering ka niyam:</b> kram sirf <b>ek partition ke andar</b> guarantee hai.
     Isliye jin cheezon ka kram matter karta hai unhe ek hi <b>key</b> par bhejo —
     jaise <code>user_id</code>. Tab us user ke saare events hamesha ek hi partition
     mein, hamesha sahi kram mein.</p>
     <h3>⏱️ Event time vs processing time</h3>
     <p>Ek event 8:59:58 par <b>hua</b>, par tumhare paas 9:00:03 par <b>pahuncha</b>
     (phone tunnel mein tha). Woh 8:59 wale minute mein ginna chahiye ya 9:00 mein?</p>
     <pre>Processing time se ginoge  →  aasan, par GALAT numbers
Event time se ginoge       →  sahi, par "window kab band karein?"</pre>
     <p><b>Watermark</b> isi ka jawab hai: "main maan raha hoon ki 10 second se
     purana koi event ab nahi aayega". Us waqt tak window khuli rehti hai.</p>
     <pre>Bada watermark  →  kam data khoya, par natija DER se
Chhota watermark →  natija jaldi, par late events chhoot gaye</pre>
     <p class="tip">🎯 Yeh <b>completeness vs latency</b> ka seedha tradeoff hai —
     aur iska jawab engineering nahi, <b>business</b> deta hai. Billing ke liye
     der manzoor hai, galti nahi. Live dashboard ke liye ulta hai.
     Aur teesra raasta bhi hai: pehle approximate number turant dikhao,
     phir baad mein correct karo (Lambda/Kappa architecture ka asli maksad).</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Windows, replay, partitions',
      goal: `Late events ka nuksaan naapo, watermark se bachao,
             phir replay aur partition parallelism dekho.`,
      sys: SD.sys.orders(),
      tasks: T_STREAM,
      success: SD.allTasks(T_STREAM),
      successText: `Teen cheezein jo queue de hi nahi sakti:
        <b>replay</b> (offset peeche), <b>kai independent consumers</b> (har group ka apna offset),
        aur <b>ordering</b> (partition ke andar). Aur ek tradeoff jo tumhe
        khud tay karna hoga: <b>watermark = completeness vs latency</b>.`,
      solution: [
        "stream window --size 60 --events 100000 --late 3",
        "stream window --size 60 --watermark 30 --events 100000 --late 3",
        "stream replay --from 0",
        "stream partitions --partitions 6 --consumers 10",
        "stream partitions --partitions 6 --consumers 6",
      ],
      verify: s => { const m = SD.mission; return m.latest(s, 'stream', 'partitions')?.idle === 0 && m.latest(s, 'stream', 'window')?.watermark === 30 && m.latest(s, 'stream', 'window')?.dropped === 0; },
      hints: [
        "Pehle observation: Bina watermark ke ek window chalao — late events kho jaayenge. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab consumers ko partitions ke barabar ya kam karo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nstream window --size 60 --events 100000 --late 3\nstream window --size 60 --watermark 30 --events 100000 --late 3\nstream replay --from 0\nstream partitions --partitions 6 --consumers 10\nstream partitions --partitions 6 --consumers 6",
      ],
    },
    {
      type: 'bins',
      title: 'Queue chahiye ya log?',
      instructions: 'Har kaam ke liye sahi aujaar.',
      bins: [
        { id: 'q', label: '📬 Queue kaafi hai' },
        { id: 'log', label: '🌊 Log (Kafka) chahiye' },
      ],
      items: [
        { text: 'Signup par welcome email bhejna', bin: 'q', explain: 'Kaam lo, karo, hatao. Koi replay nahi chahiye, koi doosra consumer nahi. Yahan Kafka lagana sirf ek aur cluster chalana hai.' },
        { text: 'User events — analytics, ML training, aur fraud detection teenon ko chahiye', bin: 'log', explain: 'Ek hi data, <b>teen independent</b> consumers. Queue mein woh events baant lete, teenon ko poora data milta hi nahi. Har group ka apna offset — yeh log ka core gun hai.' },
        { text: 'Image upload par thumbnail banana', bin: 'q', explain: 'Classic background job. Fail ho toh retry, baar-baar fail ho toh DLQ. Queue isi ke liye bani hai.' },
        { text: 'Order events, jinse baad mein naya read model banana pad sakta hai', bin: 'log', explain: 'CQRS/event sourcing. Naya projection banana matlab shuru se replay karna — aur woh sirf log de sakta hai.' },
        { text: 'Ek galat deploy ne 2 ghante ke events galat process kiye', bin: 'log', explain: 'Fix deploy karo, offset 2 ghante peeche karo, dobara chala do. Queue mein woh events consume ho chuke the — woh <b>wapas nahi aayenge</b>.' },
        { text: 'Ek batch job ko roz raat ko trigger karna', bin: 'q', explain: 'Ek message, ek consumer, ek kaam. Yahan Kafka ka ek bhi gun kaam nahi aa raha.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Streams ki samajh',
      questions: [
        {
          q: "Classic Kafka same consumer-group mein 6 partitions aur 10 consumers. Active parallelism?",
          choices: ["At most 6 active same-group consumers","All 10 each get part of every partition","Kafka rejects group with more consumers","Adding 4 guarantees throughput 10/6 gain"],
          answer: 0,
          explain: "Classic Kafka consumer group model mein one partition ek active consumer ko assign hota hai;6 partitions aur 10 eligible same group consumers mein maximum 6 active,4 idle. Different groups independent read kar sakte hain; new protocol/feature semantics scope check karo.",
         choiceExplanations: ["Classic Kafka consumer group model mein one partition ek active consumer ko assign hota hai;6 partitions aur 10 eligible same group consumers mein maximum 6 active,4 idle. Different groups independent read kar sakte hain; new protocol/feature semantics scope check karo.","Partition within a group assigned to one consumer at a time in this classic model.","Extra eligible consumers can beidle, not configuration error.","Parallelism bounded by partitions; downstream bottlenecks also matter."] },
        {
          q: 'Kafka mein ordering ka guarantee kahan tak hai?',
          choices: ["Within partition log; process order separate","Total global order across every topic","Consumer group gives cross-partition order","Concurrent workers preserve every effect order"],
          answer: 0,
          explain: "Kafka partition log ordered hai; partitioning by stable key related records same partition rakh sakta hai. Application parallelism, retries, sink side effect completion order log order se alag ho sakti hai; changing partition count routing affect kar sakta hai.",
         choiceExplanations: ["Kafka partition log ordered hai; partitioning by stable key related records same partition rakh sakta hai. Application parallelism, retries, sink side effect completion order log order se alag ho sakti hai; changing partition count routing affect kar sakta hai.","Partition logs do not define global single ordering across partitions.","Group assignment does not merge offsets into global order.","Parallel processing/retries need per key ordering guard if required."] },
        {
          q: "Out-of-orderness watermark allowance 30s kiya. Tradeoff?",
          choices: ["Lateness tolerance vs finality and state","30s makes every event exactly 30s later","Watermark guarantees no late event exists","Longer watermark reduces all memory use"],
          answer: 0,
          explain: "Watermark event time progress estimate hai. Larger out-of-orderness allowance finality delay and state retention badha sakti hai; exact 30 s per-request delay guarantee nahi. Events watermark ke baadarriveho sakte hain; allowed lateness/triggers/correction policy define karo.",
         choiceExplanations: ["Watermark event time progress estimate hai. Larger out-of-orderness allowance finality delay and state retention badha sakti hai; exact 30 s per-request delay guarantee nahi. Events watermark ke baadarriveho sakte hain; allowed lateness/triggers/correction policy define karo.","Processing/output timing depends on timestamp progress, window and triggers.","Events beyond lateness bound can still arrive; policy needed.","Waiting longer usually retains window state longer."] },
      ],
    },
    {
      type: 'match',
      title: 'Stream ke concepts',
      pairs: [
        { left: 'Offset', right: 'Consumer kahan tak padh chuka hai — usi ke paas rehta hai', explain: 'Yahi replay ko mumkin banata hai: offset ek number hai jise tum peeche kar sakte ho. Queue mein position broker ke paas hoti hai aur tum use badal nahi sakte.' },
        { left: 'Consumer group', right: 'Ek team jo milke topic padhti hai — apna alag offset rakhti hai', explain: 'Do groups = dono ko <b>poora</b> data, ek doosre se bilkul independent. Ek group ke andar partitions baant liye jaate hain.' },
        { left: 'Partition key', right: 'Kaunse events ek saath aur kram mein rahenge', explain: 'Yeh ek design decision hai, config nahi. <code>user_id</code> par bhejoge toh us user ka kram bacha rahega; random bhejoge toh nahi.' },
        { left: 'Retention', right: 'Log kitne din tak rakha jaayega', explain: 'Yeh tay karta hai ki tum kitna peeche replay kar sakte ho. 7 din common hai; kuch teams "hamesha" rakhti hain aur log ko hi source of truth bana leti hain.' },
        { left: 'Watermark', right: '"Itni der se purana event ab nahi aayega" ka anumaan', explain: 'Isi se window band hoti hai. Bada = zyada sahi par der se; chhota = jaldi par kuch chhoot gaya.' },
        { left: 'Tumbling window', right: 'Ek ke baad ek, bina overlap ke (0-60s, 60-120s)', explain: 'Sabse simple. Overlap chahiye toh sliding window (har 10s par pichhle 60s) — woh "aakhri ek minute mein" wale dashboards ke liye hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Streams',
    instructions: 'Yahan "Kafka lagayenge" ke aage jaana hai. 🎤',
    questions: [
      {
        q: "1 million clicks/sec minute aggregation:event time/dedupe/skew ka correct design?",
        choices: ["Event-time windows; skew; dedupe; late policy","Bloom positive means guaranteed duplicate","ad_id alone guarantees no hot partition","Kafka ingress means all reports exact once"],
        answer: 0,
        explain: "High rate aggregation requires bounded partitioned processing, event IDs/dedupe, late event policy, hot key handling and sink consistency. Bloom false positive unique valid click drop kar sakti hai; approximate error explicitly acceptable ho ya authoritative check use karo.",
       choiceExplanations: ["High rate aggregation requires bounded partitioned processing, event IDs/dedupe, late event policy, hot key handling and sink consistency. Bloom false positive unique valid click drop kar sakti hai; approximate error explicitly acceptable ho ya authoritative check use karo.","Bloom false positives can drop real events; authoritative dedupe/acceptable error needed.","Popular ad skew can overload one partition; salting/partial aggregation evaluate.","Reporting correctness needs producer IDs, transactions, late handling and sink semantics."] },
      {
        q: "Replayable multi-subscriber event log chahiye. Kafka vsSQS ka defensible argument?",
        choices: ["Replay and multiple independent projections","SQS FIFO cannot offer per-group ordering","Kafka always cheaper for every workload","SQS throughput alone makes replay impossible"],
        answer: 0,
        explain: "Retained Kafka log replay, multiple independent consumer groups and partition ordering ke liye useful hai. SQS FIFO message group ordering provide karta hai; queue/log retention, redrive, replay contracts and cost compare karo. SQS universally less scalable or cheaper claim nahi.",
       choiceExplanations: ["Retained Kafka log replay, multiple independent consumer groups and partition ordering ke liye useful hai. SQS FIFO message group ordering provide karta hai; queue/log retention, redrive, replay contracts and cost compare karo. SQS universally less scalable or cheaper claim nahi.","SQS FIFO message groups order delivery; processing guarantees still contract specific.","Cost depends on traffic, retention, operations and managed options.","Queue consumption and retained log replay different abstractions, not simple rate argument."] },
    ],
  },
  success: [
    'Queue aur log ka farak retention/replay se samjha sakte ho',
    'Consumer groups aur partition parallelism jaante ho',
    'Partition key ko ordering ka design decision maante ho',
    'Event time vs processing time aur watermark ka tradeoff bol sakte ho',
  ],
  homework: `Apne system ka koi ek queue dhoondo. Poochho:
    (1) kya kabhi kisi ne kaha "kaash hum woh events dobara process kar paate"?
    (2) kya do alag teams ko wahi events chahiye?
    Agar dono ka jawab "haan" hai, toh tumhe queue nahi <b>log</b> chahiye.
    Agar dono "nahi" hain, toh Kafka lagana sirf ek aur cluster hai.`,
  cards: [
    { front: 'Queue vs log?', back: '<b>Queue</b> = to-do list (padha ki gaya). <b>Log</b> = itihaas (retention tak rehta hai, har consumer ka apna offset). Log deta hai: <b>replay · kai independent consumers · ordering</b>.' },
    { front: 'Partitions ka matlab?', back: '<b>Max parallelism.</b> Ek partition = ek consumer (warna ordering tootti). Zyada consumers khaali baithenge. Aur partition count badhana <b>baad mein mehenga</b> — key→partition mapping badal jaata hai.' },
    { front: 'Kafka mein ordering?', back: 'Sirf <b>ek partition ke andar</b>. Isliye jin cheezon ka kram chahiye unhe ek hi <b>key</b> (jaise user_id) par bhejo. Global ordering = ek partition = zero parallelism.' },
    { front: 'Event time vs processing time?', back: 'Event <b>hua</b> kab vs tumhe <b>mila</b> kab. Processing time se ginna aasan par galat. Event time sahi — par phir "window kab band karein?"' },
    { front: 'Watermark?', back: '"Itni der se purana event ab nahi aayega" ka anumaan. <b>Bada</b> = zyada sahi, natija der se. <b>Chhota</b> = jaldi, par late events chhoote. <b>Completeness vs latency</b> — jawab business deta hai.' },
    { front: 'Kafka kab NAHI?', back: 'Jab sirf "kaam lo aur karo" chahiye — emails, thumbnails, nightly jobs. Wahan queue simple, sasti aur kaafi hai. Kafka ka bill tabhi jaayaz hai jab uska <b>log</b> wala gun chahiye.' },
  ],
},
]);

})();
