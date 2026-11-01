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
          choices: [
            'P chunne ki cheez nahi — network tootega hi; asli sawaal hai, toote network mein C ya A',
            'Kuch galat nahi — teen mein se koi bhi do chuno, teesri chhod do, yahi CAP theorem hai',
            'C, A aur P teen alag switch hain — product team koi bhi do on karke teesra band kare',
            'CAP har normal request ki latency bhi tay karta hai — partition ho ya na ho, hamesha',
          ],
          answer: 0,
          explain: 'CAP sirf partition ke waqt ki baat hai: network toota ho toh ya har read taaza aur ek jaisa milega (C), ya har zinda node jawab dega (A). Network ka tootna tumhare haath mein nahi, toh P "chunne" ka sawaal hi nahi. Normal din ka latency vs consistency wala tradeoff alag hai (PACELC).',
          choiceExplanations: [
            'CAP sirf partition ke waqt ki baat hai: network toota ho toh ya har read taaza aur ek jaisa milega (C), ya har zinda node jawab dega (A). Network ka tootna tumhare haath mein nahi, toh P "chunne" ka sawaal hi nahi. Normal din ka latency vs consistency wala tradeoff alag hai (PACELC).',
            'P chhodna mumkin nahi — network tum chaho ya na chaho, kabhi na kabhi tootega. Toh asli chunav C aur A ke beech hai.',
            'Partition koi feature nahi jise band kar sako. Network ka tootna bahar ki ghatna hai, product ka switch nahi.',
            'CAP sirf partition ke waqt ki baat karta hai. Normal din ki latency ka tradeoff PACELC ka "else" hissa hai.',
          ],
        },
        {
          q: '"Hum ek AP system hain" — is baat mein kya adhoora hai?',
          choices: [
            'Faisla har operation ka alag hai — catalog thoda purana chal jaata hai, balance nahi',
            'AP ka matlab hai har read hamesha ke liye galat — AP system par koi bharosa nahi',
            'AP kehna kaafi hai — AP system mein har business niyam apne aap safe rehta hai',
            'Kuch adhoora nahi — ek app ke saare endpoints ek hi consistency niyam par chalte hain',
          ],
          answer: 0,
          explain: '"AP" ek label hai, poora jawab nahi. Kaunsa operation, kaunsa niyam, kis failure mein? Catalog thoda purana dikhe toh chal jaata hai; balance ya stock jaise niyam ke liye coordination ya reservation chahiye ho sakta hai. Poori app ek hi consistency switch par nahi chalti.',
          choiceExplanations: [
            '"AP" ek label hai, poora jawab nahi. Kaunsa operation, kaunsa niyam, kis failure mein? Catalog thoda purana dikhe toh chal jaata hai; balance ya stock jaise niyam ke liye coordination ya reservation chahiye ho sakta hai. Poori app ek hi consistency switch par nahi chalti.',
            'AP ka matlab hai partition mein bhi jawab dena, chahe thoda purana ho. Purana data baad mein theek ho jaata hai — hamesha galat nahi rehta.',
            'AP sirf availability ka vaada hai. "Balance negative na ho" jaise niyam ke liye alag intezaam chahiye.',
            'Ek hi app mein catalog aur payment ki zaroorat alag hai. Har operation ka faisla alag hota hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — CAP',
    instructions: 'Yahan theory ratna aasan hai — apply karna alag baat hai. 🎤',
    questions: [
      {
        q: '"CAP theorem samjhao aur batao apne system mein kya chunoge."',
        choices: [
          'Partition mein har operation apna C ya A chunega, aur normal din ka latency tradeoff bhi',
          'CA chununga — accha network kharid lo, toh partition kabhi aayega hi nahi, chinta khatam',
          'Har operation AP — paise wale operation bhi, kyunki availability sabse upar hoti hai',
          'Har operation CP — catalog ke reads bhi, kyunki purana data kabhi nahi dikhna chahiye',
        ],
        answer: 0,
        explain: 'Pehle batao CAP kya kehta hai: partition ke waqt C (har read taaza) ya A (har zinda node jawab de). Phir har operation ka contract: kaunsa niyam kabhi nahi tootna chahiye, kahan thoda purana chalega. Aur PACELC ka "else": normal din mein bhi replica se padhna (tez, thoda purana) ya primary se (taaza, dheema). "Checkout CP, catalog AP" accha shuru hai, par niyam dekh ke tay karo, ratke nahi.',
        choiceExplanations: [
          'Pehle batao CAP kya kehta hai: partition ke waqt C (har read taaza) ya A (har zinda node jawab de). Phir har operation ka contract: kaunsa niyam kabhi nahi tootna chahiye, kahan thoda purana chalega. Aur PACELC ka "else": normal din mein bhi replica se padhna (tez, thoda purana) ya primary se (taaza, dheema). "Checkout CP, catalog AP" accha shuru hai, par niyam dekh ke tay karo, ratke nahi.',
          'Network kitna bhi accha ho, kabhi na kabhi tootega. CA ka matlab partition ko nazarandaaz karna hai.',
          'Paisa do baar kharch ho jaaye toh theek karna bahut mehenga hai. Har operation AP nahi chal sakta.',
          'Catalog thoda purana dikhe toh kisi ka nuksaan nahi. Har read CP karna bina wajah availability khona hai.',
        ],
      },
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
          choices: [
            'Do jagah alag jawab dikha toh user ka kitna nuksaan, aur theek karna kitna mehenga?',
            'Data kitna bada hai — bade data par eventual, chhote data par strong consistency lo',
            'Users kitne hain — zyada users par eventual, kam users par strong consistency lo',
            'Sabse tez jawab kaun deta hai — jo tareeka sabse tez hai, wahi sahi consistency hai',
          ],
          answer: 0,
          explain: 'Galat ya purana jawab dikhne ki keemat poochho. View count thoda galat? Kisi ko farak nahi. Double booking? Refund, maafi, bharosa gaya. Overdraft? Asli paisa gaya. Theek karne ki keemat jitni badi, consistency utni strong chahiye.',
          choiceExplanations: [
            'Galat ya purana jawab dikhne ki keemat poochho. View count thoda galat? Kisi ko farak nahi. Double booking? Refund, maafi, bharosa gaya. Overdraft? Asli paisa gaya. Theek karne ki keemat jitni badi, consistency utni strong chahiye.',
            'Data ka size nahi batata ki galat jawab kitna nuksaan karega. Chhota sa balance bhi strong consistency maangta hai.',
            'Users ki ginti scale ka sawaal hai. Galat jawab ki keemat har user ke liye wahi rehti hai.',
            'Tez jawab galat bhi ho sakta hai. Speed aur sahi hona alag cheezein hain.',
          ],
        },
        {
          q: 'Read-your-own-writes kyun sabse zaroori pattern hai?',
          choices: [
            'User ko apna kiya hua badlav turant dikhna chahiye — nahi toh lagta hai app toot gayi',
            'Read-your-own-writes se baaki sab users ko bhi har badlav turant dikhne lagta hai',
            'Read-your-own-writes har baar sabse tez replica chunta hai, aur saare reads tez replica se',
            'Read-your-own-writes ke baad conflicts sambhalne ki zaroorat poori khatam ho jaati hai',
          ],
          answer: 0,
          explain: 'Doosron ka data 2 second purana ho toh user ko pata bhi nahi chalta. Par apna hi badlav gayab dikhe toh saaf bug lagta hai — user button dobara dabata hai, aur duplicate ban jaate hain. Eventual consistency ki zyaadatar shikayatein bas read-your-own-writes se khatam ho jaati hain.',
          choiceExplanations: [
            'Doosron ka data 2 second purana ho toh user ko pata bhi nahi chalta. Par apna hi badlav gayab dikhe toh saaf bug lagta hai — user button dobara dabata hai, aur duplicate ban jaate hain. Eventual consistency ki zyaadatar shikayatein bas read-your-own-writes se khatam ho jaati hain.',
            'Read-your-own-writes sirf likhne wale user ki guarantee hai. Baaki users ko badlav thodi der baad dikhta hai.',
            'Read-your-own-writes taaza jagah se padhta hai — primary, ya pakad chuka replica. Sabse tez replica purana bhi ho sakta hai.',
            'Do users ek saath ek hi cheez badlein toh conflict phir bhi aata hai. Conflict ka niyam alag se chahiye.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Eventual Consistency',
    instructions: 'Yahan UX ki baat karna bada plus hai. 🎤',
    questions: [
      {
        q: 'Primary par write commit ho gaya, par user ko agle read mein purani value dikhi. Kaise pata karoge kya hua?',
        choices: [
          'Read kahan se aaya, dekho — peeche chal raha replica ya purana cache, trace aur version se',
          'Row primary par commit ho chuki hai, toh purana read ho hi nahi sakta — UI ka bug hai',
          'User se refresh karwao — refresh hamesha seedha taaze replica tak pahuncha deta hai',
          'DB ka CPU kam hai, toh database theek hai — dikkat zaroor client ke UI mein hogi',
        ],
        answer: 0,
        explain: 'Commit primary par hua, par read peeche chal rahe replica ya purane cache se aa sakta hai. Read kis jagah se aaya, kaunsa version tha — trace se pakdo. Ilaaj: likhne ke baad us user ke reads primary se, ya session mein write ki position rakho aur sirf utna pakad chuke replica se padho. "Kuch second primary se padho" kaam chalata hai, par pakki guarantee nahi.',
        choiceExplanations: [
          'Commit primary par hua, par read peeche chal rahe replica ya purane cache se aa sakta hai. Read kis jagah se aaya, kaunsa version tha — trace se pakdo. Ilaaj: likhne ke baad us user ke reads primary se, ya session mein write ki position rakho aur sirf utna pakad chuke replica se padho. "Kuch second primary se padho" kaam chalata hai, par pakki guarantee nahi.',
          'Commit hone ke baad bhi replica ya cache purani value de sakte hain. Commit taaze read ki guarantee nahi.',
          'Refresh phir kisi peeche chal rahe replica par ja sakta hai. Taaze read ka intezaam server ko karna hai.',
          'CPU kam hona replica ke lag ke baare mein kuch nahi batata. Pehle read ka source dekho.',
        ],
      },
      {
        q: '"Eventual consistency use karoge? Toh user ka anubhav (UX) kaise sambhaloge?"',
        choices: [
          'Pending state saaf dikhao, user ko apna likha turant dikhe, aur conflict ka niyam tay karo',
          'Data aane tak koi status mat dikhao — user ko kuch pata hi na chale, bas intezaar kare',
          'Har conflict mein jo baad mein likha gaya wahi jeete — chupchaap, bina kisi check ke',
          'Optimistic UI laga do — screen par turant dikh gaya toh server ko check ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Teen cheezein: (1) pending ya ho gaya — status saaf dikhao; (2) user ko apna likha turant dikhe (read-your-own-writes); (3) do log ek saath badlein toh kya hoga — version check karke 409, ya merge ka niyam. Optimistic UI accha hai, par aakhri faisla server ka. Last-write-wins tab chalta hai jab business ko chupchaap overwrite manzoor ho.',
        choiceExplanations: [
          'Teen cheezein: (1) pending ya ho gaya — status saaf dikhao; (2) user ko apna likha turant dikhe (read-your-own-writes); (3) do log ek saath badlein toh kya hoga — version check karke 409, ya merge ka niyam. Optimistic UI accha hai, par aakhri faisla server ka. Last-write-wins tab chalta hai jab business ko chupchaap overwrite manzoor ho.',
          'Kuch na dikhe toh user button dobara dabata hai, aur duplicate bante hain. Pending state saaf dikhni chahiye.',
          'Chupchaap overwrite mein kisi ka badlav bina bataye kho jaata hai. Business ko manzoor ho tabhi chalega.',
          'Screen par dikhna sirf andaaza hai. Server ko phir bhi check karna hai — aur mana kare toh UI wapas lautana padega.',
        ],
      },
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
          choices: [
            'Schema aur resources jud jaate hain — ek migration ya bhari query dono services ko chhoo sakti hai',
            'Shared table se API ki latency kabhi nahi badhti — toh is design mein koi nuksaan hi nahi',
            'Shared schema ke saath do writes kabhi aapas mein takra hi nahi sakti — race poori khatam',
            'Alag apps hain toh deploy apne aap alag-alag hota hai — table shared ho tab bhi, hamesha',
          ],
          answer: 0,
          explain: 'Do services ek table mein likhti hain toh schema dono ka saajha contract ban jaata hai: column badalne ke liye dono teams ko saath chalna padta hai, aur ek service ki bhari query doosri ko dheema kar sakti hai. Har baar sab kuch nahi tootega — backward-compatible migration aur saaf ownership se risk sambhal sakte ho — par aazadi kam ho jaati hai.',
          choiceExplanations: [
            'Do services ek table mein likhti hain toh schema dono ka saajha contract ban jaata hai: column badalne ke liye dono teams ko saath chalna padta hai, aur ek service ki bhari query doosri ko dheema kar sakti hai. Har baar sab kuch nahi tootega — backward-compatible migration aur saaf ownership se risk sambhal sakte ho — par aazadi kam ho jaati hai.',
            'Shared table latency ki koi guarantee nahi deta. Ek service ki bhari query table ko doosri service ke liye bhi dheema kar sakti hai.',
            'Do services ek hi row par likhein toh race aur aasan ho jaati hai. Saajha schema race nahi rokta.',
            'Code alag ho tab bhi schema saajha hai. Ek column badla toh doosri service ka deploy bhi saath karna pad sakta hai.',
          ],
        },
        {
          q: 'Doosri service ka private data chahiye. Service ki seema na toote, aisa default tareeka kya hai?',
          choices: [
            'Data ki maalik service ki API se poochho, ya maalik ke events se apni copy (read model) banao',
            'Maalik service ki table se seedha SELECT karo — sirf padhna hai, toh koi judaav nahi banta',
            'Maalik service ke DB ki replica bana lo — replica milte hi schema bhi tumhara ho jaata hai',
            'Ek shared library bana do — library hi tay karegi ki data kitna taaza hai, aur bas',
          ],
          answer: 0,
          explain: 'Seedha SELECT ya DB replica, dono chhupe contract hain — tum doosri service ke andar ke schema par tik gaye; maalik ne column badla, tumhara code toota. API ya documented events maalik ka public vaada hain. Events se apni copy (read model) banao toh copy ka schema tumhara hai — apni queries ke hisaab se bana sakte ho.',
          choiceExplanations: [
            'Seedha SELECT ya DB replica, dono chhupe contract hain — tum doosri service ke andar ke schema par tik gaye; maalik ne column badla, tumhara code toota. API ya documented events maalik ka public vaada hain. Events se apni copy (read model) banao toh copy ka schema tumhara hai — apni queries ke hisaab se bana sakte ho.',
            'Padhna bhi judaav hai. Maalik service column ka naam badle toh tumhari query toot jaayegi.',
            'Replica mein schema maalik ka hi rehta hai. Replica sirf copy hai, ownership nahi.',
            'Library code baant-ti hai, data ki taazgi nahi. Taazgi data ka source tay karta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Data Ownership',
    instructions: 'Yeh microservices ka sabse discriminating sawaal hai. 🎤',
    questions: [
      {
        q: '"Har service ka apna DB kyun hona chahiye?"',
        choices: [
          'Apni migration, apna deploy, failure baandha hua — par services ke beech JOIN aur ACID mehenge',
          'Alag DB se services ke beech ACID transaction muft mil jaata hai — koi naya kaam nahi lagta',
          'Alag DB hamesha zyada throughput deta hai — jitne zyada DB, speed bhi utni hi zyada',
          'Jitni entities (tables), utne service DB — bas entity ki ginti dekh ke faisla karo',
        ],
        answer: 0,
        explain: 'Apna DB = apni migration, apna deploy, aur ek DB girne par sirf ek service par asar. Shared writable DB se bana "distributed monolith" network ki der aur aadhi-adhuri failure deta hai, aazadi nahi. Keemat: services ke beech JOIN aur ACID transaction chale jaate hain — read model ya saga lagana padta hai. Har service ke andar local ACID waisa hi rehta hai. Shared DB beech ke daur mein, ya soch-samajh ke, chal bhi sakta hai.',
        choiceExplanations: [
          'Apna DB = apni migration, apna deploy, aur ek DB girne par sirf ek service par asar. Shared writable DB se bana "distributed monolith" network ki der aur aadhi-adhuri failure deta hai, aazadi nahi. Keemat: services ke beech JOIN aur ACID transaction chale jaate hain — read model ya saga lagana padta hai. Har service ke andar local ACID waisa hi rehta hai. Shared DB beech ke daur mein, ya soch-samajh ke, chal bhi sakta hai.',
          'Ulta: alag DBs ke beech transaction ke liye saga ya outbox jaisa naya kaam chahiye.',
          'Throughput query aur load par depend karta hai. Alag DB ka faayda ownership hai, speed ki guarantee nahi.',
          'Service ki seema business ownership se banti hai. Ek service ke paas kai tables ho sakti hain.',
        ],
      },
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
          choices: [
            'Jab calls bahut ho jaayein ya data bada ho — 50,000 users ke liye 50,000 calls nahi chalengi',
            'Jab services alag languages mein likhi hon — alag language mein API call ho hi nahi sakti',
            'Teen calls par hi — teen se zyada calls wala har page hamesha toot jaata hai, bina shart',
            'Kabhi nahi — API composition mein beech ki koi call kabhi fail hi nahi hoti, pakka',
          ],
          answer: 0,
          explain: 'Do alag hadd: (1) tail latency — har extra call poore jawab ki sabse dheemi 1% (p99) ko badhati hai; (2) data ka size — bade result ke liye har item par ek call namumkin. API composition 2–3 calls aur ek record ke liye accha hai.',
          choiceExplanations: [
            'Do alag hadd: (1) tail latency — har extra call poore jawab ki sabse dheemi 1% (p99) ko badhati hai; (2) data ka size — bade result ke liye har item par ek call namumkin. API composition 2–3 calls aur ek record ke liye accha hai.',
            'API HTTP ya gRPC se chalti hai — language ka farak nahi padta.',
            'Teen calls koi jaadui hadd nahi. Composition tab toot-ti hai jab calls aur der ka jod budget se bahar jaaye.',
            'Har call fail ho sakti hai. Composition mein ek call fail hui toh poora jawab adhoora.',
          ],
        },
        {
          q: 'Read model consumer ko idempotent kyun hona chahiye?',
          choices: [
            'Ek hi event dobara aa sakta hai — dobara aane par data par asar dobara nahi hona chahiye',
            'Idempotency se purane event ka kram apne aap theek ho jaata hai — version check bekaar',
            'Upsert likh do — upsert mein ginti badhana (increment) bhi apne aap ek hi baar hota hai',
            'Broker dobara bhejte waqt event ki ID badal deta hai — isliye har aaya event naya hai',
          ],
          answer: 0,
          explain: 'Delivery at-least-once hai: wahi event dobara aa sakta hai. Consumer event ID, version check ya natural idempotency se dekhe ki asar dobara na ho. Upsert "set" ke liye theek hai, par "count + 1" dobara chala toh ginti do baar badhegi. Aur purana event baad mein aaye toh version check alag se chahiye.',
          choiceExplanations: [
            'Delivery at-least-once hai: wahi event dobara aa sakta hai. Consumer event ID, version check ya natural idempotency se dekhe ki asar dobara na ho. Upsert "set" ke liye theek hai, par "count + 1" dobara chala toh ginti do baar badhegi. Aur purana event baad mein aaye toh version check alag se chahiye.',
            'Idempotency dobara aane ka ilaaj hai, kram ka nahi. Purana event baad mein aaye toh version check chahiye.',
            'Upsert ke andar "count + 1" dobara chale toh ginti do baar badhegi. Event ID yaad rakhna padega.',
            'Dobara bheja gaya event wahi event hai, wahi ID ke saath. ID se hi duplicate pakda jaata hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Cross-service Queries',
    instructions: 'Microservices ka sabse practical sawaal. 🎤',
    questions: [
      {
        q: "Microservices mein cross-domain data join kaise design karoge?",
        choices: [
          'Join kahan ho, data kitna taaza chahiye, maalik kaun — phir composition, read model ya index',
          'Services ke beech join namumkin hai — aisi har screen ko product se hi hata do, bas',
          'Har service ke saare fields pehle se har jagah copy kar do — zaroorat ho ya na ho',
          'Har lautaayi row ke liye ek API call karo — hamesha, chahe rows kitni bhi hon',
        ],
        answer: 0,
        explain: 'JOIN namumkin nahi, bas ek DB ke andar nahi hota. Pattern chuno: 2–3 services aur ek record → API composition; baar-baar chalne wali query → events se read model (CQRS); sirf 2–3 fields → local copy; khuli search → search index. Har pattern ki keemat bolo: calls ki ginti, data kitna purana, permissions, aur chalane ka kharcha.',
        choiceExplanations: [
          'JOIN namumkin nahi, bas ek DB ke andar nahi hota. Pattern chuno: 2–3 services aur ek record → API composition; baar-baar chalne wali query → events se read model (CQRS); sirf 2–3 fields → local copy; khuli search → search index. Har pattern ki keemat bolo: calls ki ginti, data kitna purana, permissions, aur chalane ka kharcha.',
          'Join hota hai — bas pattern se: composition, read model, local copy ya search index.',
          'Har field har jagah copy karna bekaar ka kharcha aur purane data ka risk hai. Zaroorat ke hisaab se copy karo.',
          'Har row par ek call = hazaar rows par hazaar calls. Bade result ke liye read model chahiye.',
        ],
      },
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
     <p><b>Practical niyam: steps ki ginti nahi, flow ki complexity dekho.</b>
     Bahut shaakhein, retries aur compensations? Orchestration poora flow
     ek jagah rakhta hai. Choreography chhote, saaf flows mein sundar hai —
     bade flows mein tracing aur documented flow ke bina <b>samajh se bahar</b>.</p>
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
        { text: '6 steps with compensations aur conditional branches', bin: 'orch', explain: 'Compensations aur shaakhon wale lambe flow mein orchestrator poora flow ek jagah rakhta hai. Choreography mein flow events mein bikhra hota hai.' },
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
        { q: '6 steps, compensations aur shaakhon wale flow ke liye kya chuno?', target: 'orch', explain: 'Orchestration — shaakhein, retries aur compensations ek jagah dikhte hain. Steps ki ginti akele niyam nahi; flow ki complexity dekho.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Saga ki samajh',
      questions: [
        {
          q: 'Saga mein "isolation nahi hai" ka kya matlab hai?',
          choices: [
            'Beech ki halat sabko dikhti hai — order ban chuka, payment abhi nahi hua, aur sab dekh rahe',
            'Saga ke andar har service ka local transaction bhi atomic nahi hota — har step adhoora',
            'Saga data encrypt nahi karta — isliye koi bhi kisi ka bhi data padh sakta hai',
            'Compensation beech ki har halat chhupa leta hai — kisi ko kabhi kuch nahi dikhta',
          ],
          answer: 0,
          explain: 'ACID ka "I" (isolation) kehta hai ki beech ki halat kisi ko nahi dikhti. Saga mein har step apna local commit kar deta hai, toh adhoori halat sabko dikh sakti hai. Isliye state saaf rakho (pending, confirmed, cancelled) aur UI mein dikhao.',
          choiceExplanations: [
            'ACID ka "I" (isolation) kehta hai ki beech ki halat kisi ko nahi dikhti. Saga mein har step apna local commit kar deta hai, toh adhoori halat sabko dikh sakti hai. Isliye state saaf rakho (pending, confirmed, cancelled) aur UI mein dikhao.',
            'Har step ka local transaction poora atomic hota hai. Poore saga mein beech ki halat nahi chhupti — dikkat wahi hai.',
            'Isolation ka encryption se koi lena-dena nahi. Matlab hai: beech ki halat doosre transactions ko dikhna.',
            'Compensation baad mein asar ulta karta hai. Tab tak beech ki halat sab dekh chuke hote hain.',
          ],
        },
        {
          q: 'Compensating action aur rollback mein farak?',
          choices: [
            'Rollback aisa karta hai jaise kuch hua hi nahi; compensation naya action hai jo asar ulta kare',
            'Compensation hamesha pehle SQL ka ulta SQL hai — business ka alag niyam nahi chahiye',
            'Aakhri service ka rollback pehle wali services ke committed badlav bhi hata deta hai',
            'Compensation pehle ki committed haalat doosre readers se chhupa deti hai, rollback jaisa',
          ],
          answer: 0,
          explain: 'Rollback DB ko pehle jaisa kar deta hai, jaise kuch hua hi nahi. Compensation ek naya kaam hai jo asar ulta karta hai — refund charge ko mitata nahi, statement par alag dikhta hai. Kuch cheezein ulti hoti hi nahi: bheja hua email wapas nahi aata; email ka "compensation" ek doosra email hai.',
          choiceExplanations: [
            'Rollback DB ko pehle jaisa kar deta hai, jaise kuch hua hi nahi. Compensation ek naya kaam hai jo asar ulta karta hai — refund charge ko mitata nahi, statement par alag dikhta hai. Kuch cheezein ulti hoti hi nahi: bheja hua email wapas nahi aata; email ka "compensation" ek doosra email hai.',
            'Compensation business ka niyam hai — refund ulta INSERT nahi, apna alag record hai (fees ke saath bhi ho sakta hai).',
            'Local rollback sirf usi service ke uncommitted kaam ko hataata hai. Doosri services ka commit ho chuka kaam waisa hi rehta hai.',
            'Compensation baad mein chalta hai. Beech ki haalat tab tak doosre dekh chuke hote hain.',
          ],
        },
        {
          q: 'Saga mein bahut shaakhein, retries aur compensations hain. Coordination ka kaunsa faisla kaam aayega?',
          choices: [
            'Orchestrator — poora flow ek jagah likha ho, toh branch, retry aur recovery saaf dikhein',
            'Chaar step ho gaye, toh choreography bilkul galat — chaar ke baad choreography mana hai',
            'Orchestrator laga do — orchestrator se aadhi-adhuri failure hamesha ke liye khatam',
            'Choreography mein tracing ho hi nahi sakti — events ka koi bhi nishaan nahi milta',
          ],
          answer: 0,
          explain: 'Bahut shaakhon, retries aur recovery wale flow mein orchestration madad karta hai: poora flow ek jagah likha hai, toh debug aur badlav aasan. Choreography bhi sahi hai jab events saaf hon aur ownership, tracing, recovery tay ho. "Teen ya chaar step" koi pakki seema nahi.',
          choiceExplanations: [
            'Bahut shaakhon, retries aur recovery wale flow mein orchestration madad karta hai: poora flow ek jagah likha hai, toh debug aur badlav aasan. Choreography bhi sahi hai jab events saaf hon aur ownership, tracing, recovery tay ho. "Teen ya chaar step" koi pakki seema nahi.',
            'Step ki ginti akele faisla nahi karti. Choreography chhote aur saaf flows mein badhiya chalti hai.',
            'Orchestrator flow ko saaf karta hai, failure nahi mitata. Steps phir bhi fail honge — recovery likhni padegi.',
            'Choreography mein bhi correlation ID aur tracing se flow dikh sakta hai. Bas zyada mehnat lagti hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Saga',
    instructions: 'Distributed transactions ka standard sawaal. 🎤',
    questions: [
      {
        q: '"Order flow mein 4 services hain. Transaction kaise handle karoge?"',
        choices: [
          'Har service ka local transaction, compensation, idempotent steps aur saaf state — durable saga',
          'Har RPC ke aaspaas try-catch laga do — sab milkar ek transaction ban jaayega, bas',
          '4 services hain toh ek hi orchestrator zaroori — har 4-service flow ka yahi niyam hai',
          '2PC laga do — 2PC har provider ke saath, har haal mein kaam karta hai, bina dikkat',
        ],
        answer: 0,
        explain: 'Poore jawab mein chaar cheezein: saga (har service ka local transaction + compensation), coordination ka faisla aur kyun (orchestration ya choreography), idempotent steps (retries hongi), aur isolation nahi hai — isliye pending/confirmed/cancelled state dikhao. Saga ki state durable rakho taaki crash ke baad flow aage chal sake.',
        choiceExplanations: [
          'Poore jawab mein chaar cheezein: saga (har service ka local transaction + compensation), coordination ka faisla aur kyun (orchestration ya choreography), idempotent steps (retries hongi), aur isolation nahi hai — isliye pending/confirmed/cancelled state dikhao. Saga ki state durable rakho taaki crash ke baad flow aage chal sake.',
          'try-catch ek process ke andar hai. Doosri service mein commit ho chuka kaam try-catch wapas nahi la sakta.',
          'Orchestrator ya choreography — faisla flow ki complexity se hota hai, services ki ginti se nahi.',
          'Payment gateway jaise bahar ke providers 2PC mein hissa nahi lete. Aur coordinator girne par 2PC atak jaata hai.',
        ],
      },
      {
        q: '"Compensating action likha nahi ja sakta toh?"',
        choices: [
          'Ulta na hone wala step aakhir mein rakho, aur galti par sudhaar (correction) ka plan banao',
          '2PC laga do — 2PC bheja hua email bhi poori tarah wapas le aata hai, bina nishaan',
          'Us step ko async kar do — async ho gaya toh recovery ki koi zaroorat hi nahi rehti',
          'Business ko zaroori ho tab bhi us step ko skip karo — na rahega step, na dikkat',
        ],
        answer: 0,
        explain: 'Jo step ulta nahi ho sakta (email, SMS, shipping), aise step ko saga mein aakhir mein rakho — aakhri step ke baad fail hone wala kuch bacha hi nahi. Aur jahan ulta karna namumkin ho, ek naya sudhaar action rakho — jaise "hamari galti" wala email. Async karna theek hai, par async step ka bhi recovery plan chahiye.',
        choiceExplanations: [
          'Jo step ulta nahi ho sakta (email, SMS, shipping), aise step ko saga mein aakhir mein rakho — aakhri step ke baad fail hone wala kuch bacha hi nahi. Aur jahan ulta karna namumkin ho, ek naya sudhaar action rakho — jaise "hamari galti" wala email. Async karna theek hai, par async step ka bhi recovery plan chahiye.',
          '2PC network ke bahar gaye email ko wapas nahi la sakta. Bheja hua email bheja hi rehta hai.',
          'Async step bhi fail ho sakta hai. Retry, dead letter aur sudhaar ka plan phir bhi chahiye.',
          'Zaroori step chhodne se business ka nateeja galat hota hai. Step rehna chahiye — bas sahi jagah par.',
        ],
      },
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
          choices: [
            'Dono ek saath pakke nahi hote — beech mein crash hua toh order DB mein, par event kabhi nahi gaya',
            'Kafka publish fail ho toh DB ka save apne aap wapas ho jaata hai — koi dikkat hi nahi',
            'try-catch laga do — beech mein process crash ho tab bhi catch sab kuch sambhal lega',
            'Pehle publish karo, phir save — kram ulat do, dono apne aap atomic ban jaayenge',
          ],
          answer: 0,
          explain: 'Save aur publish do alag systems mein do alag kaam hain. Beech mein process mara toh order DB mein hai, par event kabhi nahi gaya — aur koi error bhi nahi aata. Order safal dikhta hai, user ko confirmation milta hai, aur warehouse ko kabhi pata nahi chalta. Aisa bug mahino chupchaap chal sakta hai.',
          choiceExplanations: [
            'Save aur publish do alag systems mein do alag kaam hain. Beech mein process mara toh order DB mein hai, par event kabhi nahi gaya — aur koi error bhi nahi aata. Order safal dikhta hai, user ko confirmation milta hai, aur warehouse ko kabhi pata nahi chalta. Aisa bug mahino chupchaap chal sakta hai.',
            'DB ka commit ho chuka hai. Kafka ki failure DB ko wapas nahi le jaati.',
            'Process mar jaaye toh catch chalta hi nahi. Crash ka gap try-catch se nahi bharta.',
            'Kram ulatne se gap ulta ho jaata hai: event chala gaya, par order save nahi hua.',
          ],
        },
        {
          q: 'Outbox pattern asal mein kya pakka karta hai?',
          choices: [
            'Order aur event ka irada ek saath commit hota hai; relay event dobara bhi bhej sakta hai',
            'Network par har event theek ek hi baar jaayega — duplicate kabhi nahi aayega',
            'Har tarah ke event hamesha ek global kram mein pahunchenge, saare topics mein',
            'Outbox ke baad disk kharab ho tab bhi event kabhi nahi khoyega — pakki guarantee',
          ],
          answer: 0,
          explain: 'Outbox order aur "event bhejna hai" wali row ko ek hi DB transaction mein pakka karta hai. Relay baad mein row padh ke publish karta hai aur fail hone par dobara koshish karta hai — isliye event dobara bhi ja sakta hai (at-least-once); consumers ko duplicate sambhalne hain. DB ya backup khona, galat retention ya hamesha ke liye ruka relay — in sab se outbox nahi bachata.',
          choiceExplanations: [
            'Outbox order aur "event bhejna hai" wali row ko ek hi DB transaction mein pakka karta hai. Relay baad mein row padh ke publish karta hai aur fail hone par dobara koshish karta hai — isliye event dobara bhi ja sakta hai (at-least-once); consumers ko duplicate sambhalne hain. DB ya backup khona, galat retention ya hamesha ke liye ruka relay — in sab se outbox nahi bachata.',
            'Relay publish ke baad crash ho toh event dobara jaata hai. Outbox at-least-once deta hai, exactly-once nahi.',
            'Kafka sirf ek partition ke andar kram rakhta hai. Outbox poore system ka global kram nahi deta.',
            'Outbox DB par hi tika hai. DB ya backup kho gaya toh outbox row bhi kho jaati hai.',
          ],
        },
        {
          q: 'Outbox table ke saath ek zaroori maintenance kaam?',
          choices: [
            'Bheji ja chuki rows samay par saaf karo, aur na bheji rows ka backlog dekhte raho',
            'Har din reindex chalao — bloat ka saboot ho ya na ho, roz reindex zaroori hai',
            'Na bheji rows delete kar do — backlog chhota karne ka sabse aasan tareeka hai',
            'Kuch nahi — har database mein outbox rows apne aap expire ho jaati hain, hamesha',
          ],
          answer: 0,
          explain: 'Har business write ke saath outbox mein ek row aati hai, toh table tezi se badhti hai. Bina cleanup ke mahino mein crore rows, aur relay ki query bhi dheemi. Bheji gayi rows ke liye retention job lagao (jaise 7 din), aur na bheji rows ki ginti aur umar par alert rakho — badhta backlog matlab relay atka hai.',
          choiceExplanations: [
            'Har business write ke saath outbox mein ek row aati hai, toh table tezi se badhti hai. Bina cleanup ke mahino mein crore rows, aur relay ki query bhi dheemi. Bheji gayi rows ke liye retention job lagao (jaise 7 din), aur na bheji rows ki ginti aur umar par alert rakho — badhta backlog matlab relay atka hai.',
            'Reindex tab karo jab bloat dikhe. Roz bina wajah reindex kharcha hai, ilaaj nahi.',
            'Na bheji rows ke events abhi gaye hi nahi. Delete kiya toh events hamesha ke liye kho jaayenge.',
            'Zyaadatar databases rows apne aap delete nahi karte. Retention job khud likhni padti hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Outbox',
    instructions: 'Event-driven systems ka pakka sawaal. 🎤',
    questions: [
      {
        q: '"Order save karke Kafka par event bhejna hai. Atomic kaise banaoge?"',
        choices: [
          'Order aur outbox row ek DB transaction mein; relay baad mein publish kare, consumer dedupe kare',
          'Pehle Kafka par publish karo, aur phir order commit ho jaane ki ummeed rakho, bas',
          'try-catch laga do — try-catch broker tak pahunchne ka kaam bhi atomic bana deta hai',
          'DB ka local transaction apne aap Kafka ko bhi apne andar le leta hai, default mein',
        ],
        answer: 0,
        explain: 'Teen hisse: pattern (order + outbox row ek hi DB transaction mein), relay (polling ya CDC se outbox padh ke publish), aur imaandaar guarantee — at-least-once, isliye consumers idempotent. Aakhri hissa hi seniority dikhata hai: bahut log maan lete hain ki outbox exactly-once deta hai.',
        choiceExplanations: [
          'Teen hisse: pattern (order + outbox row ek hi DB transaction mein), relay (polling ya CDC se outbox padh ke publish), aur imaandaar guarantee — at-least-once, isliye consumers idempotent. Aakhri hissa hi seniority dikhata hai: bahut log maan lete hain ki outbox exactly-once deta hai.',
          'Publish ho gaya aur order commit fail hua, toh event aise order ka hai jo bana hi nahi.',
          'Process crash par catch nahi chalta. Aur try-catch do systems ko ek transaction nahi banata.',
          'DB transaction sirf DB ke andar ka kaam sambhalta hai. Kafka DB transaction ke bahar hai.',
        ],
      },
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
          q: 'Koi kehta hai "humein exactly-once milta hai". Sabse pehle kya jaanchoge?',
          choices: [
            'Exactly-once kis seema tak hai — kaunse reads, writes aur effects vaade ke andar hain',
            'Kafka transaction on karo — bahar ka email bhi transaction mein apne aap aa jaata hai',
            'Network retry hua matlab processing hamesha do baar hui — doosra nateeja hai hi nahi',
            'Broker ki har guarantee bekaar hoti hai — exactly-once sirf ek marketing shabd hai',
          ],
          answer: 0,
          explain: 'Exactly-once hamesha ek seema ke andar hota hai. Kafka transactions Kafka se padh ke Kafka mein likhne wale raaste ko bachate hain; bahar ka payment ya email us seema mein apne aap nahi aata. Bahar ke effects ke liye stable ID, provider ka saath, aur dedupe ya reconciliation chahiye.',
          choiceExplanations: [
            'Exactly-once hamesha ek seema ke andar hota hai. Kafka transactions Kafka se padh ke Kafka mein likhne wale raaste ko bachate hain; bahar ka payment ya email us seema mein apne aap nahi aata. Bahar ke effects ke liye stable ID, provider ka saath, aur dedupe ya reconciliation chahiye.',
            'Kafka transaction sirf Kafka ke andar ke reads aur writes ko jodta hai. Email bhejna bahar ka effect hai.',
            'Retry ka matlab hai dobara bheja gaya. Processing do baar hui ya nahi, dedupe par depend karta hai.',
            'Guarantee apni seema ke andar sach mein kaam karti hai. Bas seema jaanni padti hai.',
          ],
        },
        {
          q: 'Side-effect aur dedupe id alag-alag likhne mein kya problem hai?',
          choices: [
            'Beech mein crash hua toh kaam ho chuka par ID nahi likhi — agli baar kaam dobara hoga',
            'Ek hi function mein dono writes likhe hain, toh dono milkar apne aap atomic hain',
            'Dedupe ID baad mein kabhi bhi likh do — kitni bhi der se likho, hamesha safe hai',
            'Broker ka ACK chhooti hui dedupe ID ko baad mein apne aap theek kar deta hai',
          ],
          answer: 0,
          explain: 'Dual-write ki dikkat naye roop mein: kaam aur dedupe ID alag-alag likhe, toh beech ka crash kaam ko bina ID ke chhod deta hai. Message dobara aaya, ID mili nahi, kaam dobara. Kaam aur ID ek hi transaction mein likho.',
          choiceExplanations: [
            'Dual-write ki dikkat naye roop mein: kaam aur dedupe ID alag-alag likhe, toh beech ka crash kaam ko bina ID ke chhod deta hai. Message dobara aaya, ID mili nahi, kaam dobara. Kaam aur ID ek hi transaction mein likho.',
            'Ek function mein hona ek transaction hona nahi. Do alag writes ke beech crash ho sakta hai.',
            'ID likhne se pehle crash hua toh dobara aaya message pakda nahi jaayega.',
            'ACK broker ko batata hai ki message mil gaya. Tumhari dedupe table ACK se nahi bharti.',
          ],
        },
        {
          q: 'Message dobara aaye tab bhi state ka asar ek hi rahe — sabse simple tareeka?',
          choices: [
            'Value SET karo (status = shipped), BADHAO mat — dobara chale toh bhi wahi nateeja',
            'Ginti badhana (count + 1) apne aap idempotent hai — dobara chale toh farak nahi',
            'SET likh do — SET se har bahar ka action (email, charge) bhi ek hi baar hota hai',
            'Dobara chalne par kuch nahi badalta, toh permission check ki zaroorat bhi nahi',
          ],
          answer: 0,
          explain: '"status = shipped" do baar chalao, nateeja wahi. "count + 1" do baar chalao, ginti do baar badhi. Toh jahan ho sake, chahi hui value SET karo. Version ya shart (precondition) aur bahar ke actions phir bhi alag se bachane padte hain. Sabse sasta tareeka workload par depend karta hai.',
          choiceExplanations: [
            '"status = shipped" do baar chalao, nateeja wahi. "count + 1" do baar chalao, ginti do baar badhi. Toh jahan ho sake, chahi hui value SET karo. Version ya shart (precondition) aur bahar ke actions phir bhi alag se bachane padte hain. Sabse sasta tareeka workload par depend karta hai.',
            'count + 1 do baar chala toh ginti do baar badhegi. Increment idempotent nahi.',
            'SET sirf DB ki value ke liye idempotent hai. Email ya charge jaise bahar ke action ko alag se bachana padta hai.',
            'Idempotent hona aur permission do alag baatein hain. Har request ki permission jaanchni padti hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Exactly-Once',
    instructions: 'Yeh sawaal bahut se strong engineers ko fansaata hai. 🎤',
    questions: [
      {
        q: 'Bahar ke business effects (charge, email) par "exactly-once" kaise pakka karoge?',
        choices: [
          'Effect ki seema tay karo; effect aur dedupe record saath likho, ya provider ki key',
          'Broker ka exactly-once switch on karo — bahar ke effects bhi apne aap ek baar honge',
          'Likhne se pehle ACK bhej do — ACK pehle gaya toh data kabhi nahi khoyega, pakka',
          'Pehle effect likho, dedupe record baad mein async bhar do — itna kaafi hai, bas',
        ],
        answer: 0,
        explain: 'Pehle tay karo: kaunsa effect, kis failure tak, ek hi baar. Broker ke transactions Kafka ke andar madad karte hain. Apne store ke liye effect aur dedupe record ek hi transaction mein likho; bahar ke provider ke liye provider ki idempotency key aur recovery chahiye. "Message kitni baar aaya" aur "business effect kitni baar hua" do alag daawe hain.',
        choiceExplanations: [
          'Pehle tay karo: kaunsa effect, kis failure tak, ek hi baar. Broker ke transactions Kafka ke andar madad karte hain. Apne store ke liye effect aur dedupe record ek hi transaction mein likho; bahar ke provider ke liye provider ki idempotency key aur recovery chahiye. "Message kitni baar aaya" aur "business effect kitni baar hua" do alag daawe hain.',
          'Broker ka switch broker ki seema ke andar kaam karta hai. Bahar ka email ya charge seema ke bahar hai.',
          'Likhne se pehle ACK aur phir crash = message gaya, kaam nahi hua. Yahi data loss hai.',
          'Effect aur dedupe ke beech crash hua toh dobara aaya message effect dobara karega.',
        ],
      },
      {
        q: 'Consumer payment provider se charge karte waqt crash hua, aur message dobara aaya. Safe design?',
        choices: [
          'Provider ko stable payment ID (idempotency key) bhejo, aur atke charge ka nateeja jaancho',
          'Apni DB mein ek row likh do — local row se provider ka charge bhi atomic ho jaata hai',
          'Charge se pehle SELECT karke dekho ki pehle hua ya nahi — har race ruk jaayegi',
          'Broker ki exactly-once guarantee payment provider ke charge ko bhi dhak leti hai',
        ],
        answer: 0,
        explain: 'Charge bahar ke provider par hota hai, toh local DB transaction charge ko atomic nahi bana sakta. Har payment ki ek stable ID (idempotency key ya payment intent) provider ko bhejo: dobara aayi request par provider pehla nateeja lautata hai. Apni taraf durable recovery state rakho, aur timeout jaisa adhoora nateeja provider se poochh ke milao (reconcile).',
        choiceExplanations: [
          'Charge bahar ke provider par hota hai, toh local DB transaction charge ko atomic nahi bana sakta. Har payment ki ek stable ID (idempotency key ya payment intent) provider ko bhejo: dobara aayi request par provider pehla nateeja lautata hai. Apni taraf durable recovery state rakho, aur timeout jaisa adhoora nateeja provider se poochh ke milao (reconcile).',
          'Local row sirf tumhari DB ke andar hai. Provider ka charge DB transaction mein nahi aata.',
          'SELECT aur charge ke beech doosra worker bhi wahi SELECT kar sakta hai. Dono charge kar denge.',
          'Broker ki guarantee broker tak hai. Payment provider broker ki seema ke bahar hai.',
        ],
      },
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
          choices: [
            'Har baar sab rows se poochhna — reminder_at ek baar likh lo, phir sirf due rows uthao',
            'Cron kam baar chalao — bas cron ki frequency badalne se kharcha theek ho jaayega',
            'Table ko shard kar do — shard karte hi har full scan apne aap sasta ho jaata hai',
            'SELECT mein aur columns jod do — zyada columns se scan ka kaam kam ho jaata hai',
          ],
          answer: 0,
          explain: 'Asli galti access pattern ki hai: har ghante poore 2 crore rows se poochhna "kya tumhara waqt aa gaya?". Sahi design mein jawab pehle se likha hai — reminder_at ek baar calculate karke store karo, us par index lagao, aur worker sirf due rows uthaye (WHERE reminder_at <= now()). Akela index kaafi nahi agar query phir bhi sab rows chhooti hai. Deep pagination wali seekh yahan bhi wahi hai.',
          choiceExplanations: [
            'Asli galti access pattern ki hai: har ghante poore 2 crore rows se poochhna "kya tumhara waqt aa gaya?". Sahi design mein jawab pehle se likha hai — reminder_at ek baar calculate karke store karo, us par index lagao, aur worker sirf due rows uthaye (WHERE reminder_at <= now()). Akela index kaafi nahi agar query phir bhi sab rows chhooti hai. Deep pagination wali seekh yahan bhi wahi hai.',
            'Kam baar chalane se har run phir bhi 2 crore rows chhoota hai, aur reminders der se jaate hain.',
            'Shard karne se scan baant jaata hai, kam nahi hota. Kul kaam utna hi rehta hai.',
            'Zyada columns padhne se kaam badhta hai, ghatta nahi. Dikkat rows ki ginti hai.',
          ],
        },
        {
          q: 'Scheduled system ko cron se kya alag banata hai?',
          choices: [
            'Har schedule badal sakta hai — update, cancel aur crash ke baad recovery aani chahiye',
            'Cron kisi bhi process ko bharose se shuru kar hi nahi sakta — cron toota hua hai',
            'Schedule records ko timezone ki kabhi zaroorat nahi — sab UTC mein apne aap theek',
            'Timer bana diya toh kaam pakka ek hi baar chalega — timer khud guarantee hai',
          ],
          answer: 0,
          explain: 'Cron ek fixed niyam hai: "roz 9 baje script chalao". Scheduled work har entity ka alag aur badalne wala hai: "is bill ko 25 tareekh ko reminder chahiye — jab tak kuch badal na jaaye". User pehle pay kar de, due date badal jaaye, ya user reminders band kar de — schedule ko update, cancel aur recompute hona aana chahiye. Aur waqt timezone ke saath likho.',
          choiceExplanations: [
            'Cron ek fixed niyam hai: "roz 9 baje script chalao". Scheduled work har entity ka alag aur badalne wala hai: "is bill ko 25 tareekh ko reminder chahiye — jab tak kuch badal na jaaye". User pehle pay kar de, due date badal jaaye, ya user reminders band kar de — schedule ko update, cancel aur recompute hona aana chahiye. Aur waqt timezone ke saath likho.',
            'Cron fixed kaam ke liye bharose layak hai. Farak per-entity aur badalte schedule ka hai.',
            '"25 tareekh subah 9 baje" kis timezone mein? User ke timezone ke bina reminder galat waqt jaayega.',
            'Timer chalne ke baad crash ho sakta hai, aur kaam dobara chal sakta hai. Ek baar ke liye idempotency chahiye.',
          ],
        },
        {
          q: '50 lakh notifications theek 9:00 AM par bhejne ka nateeja?',
          choices: [
            'Khud ki banayi bheed — apna system, provider ki rate limit aur quota ek saath bharenge',
            'Kuch nahi — notifications async hain, aur async kaam ka koi kharcha hi nahi hota',
            'Queue laga do — queue lagate hi provider ka quota anant ho jaata hai, koi hadd nahi',
            'Sabko ek hi waqt dena traffic ko apne aap random bana deta hai — bheed nahi lagti',
          ],
          answer: 0,
          explain: 'Ek hi pal par 50 lakh = khud ki banayi flash crowd. Apna system, notification provider ki rate limit aur saajha quota — sab ek saath. Aur poori tarah tumhare haath mein thi! 9:00 se 9:30 tak bikher do (stagger): kisi user ko farak nahi padta, aur system aaram se chalta hai.',
          choiceExplanations: [
            'Ek hi pal par 50 lakh = khud ki banayi flash crowd. Apna system, notification provider ki rate limit aur saajha quota — sab ek saath. Aur poori tarah tumhare haath mein thi! 9:00 se 9:30 tak bikher do (stagger): kisi user ko farak nahi padta, aur system aaram se chalta hai.',
            'Async ka matlab baad mein, muft nahi. Kaam utna hi hai, bas line mein khada hai.',
            'Queue bheed ko line mein laga deti hai, par provider ki hadd wahi rehti hai. Line lambi hoti jaayegi.',
            'Ek hi waqt matlab sab ek pal par — bilkul ulta. Random bikherna alag se karna padta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Scheduling',
    instructions: 'Yeh sawaal "20M cards, reminders" ke roop mein aata hai. 🎤',
    questions: [
      {
        q: '"2 crore credit cards hain, har ek par due date se 5 din pehle reminder bhejna hai. Design karo."',
        choices: [
          'Har bill par reminder_at likho (timezone ke saath), index se due jobs uthao, claim aur dedupe',
          'Har card ka apna in-memory timer — process restart ho toh timer bhi naye sire se chalu',
          'Har ghante saari rows scan karo — 2 crore rows ka kharcha hamesha ek jaisa chhota rehta',
          'Kafka ke normal topics mein daal do — normal topic koi bhi delay apne aap de deta hai',
        ],
        answer: 0,
        explain: 'Accha jawab access pattern se shuru hota hai: "baar-baar dhoondo mat, ek baar likh lo" — reminder_at timezone ke saath store, index par due jobs ka seek. Phir scale: user_id se partition, 30 minute mein stagger. Phir correctness: worker job claim kare, send idempotent ho. Jawab kisi ek technology par nahi tikta — sawaal pattern ka hai.',
        choiceExplanations: [
          'Accha jawab access pattern se shuru hota hai: "baar-baar dhoondo mat, ek baar likh lo" — reminder_at timezone ke saath store, index par due jobs ka seek. Phir scale: user_id se partition, 30 minute mein stagger. Phir correctness: worker job claim kare, send idempotent ho. Jawab kisi ek technology par nahi tikta — sawaal pattern ka hai.',
          'Memory ka timer restart par gayab. 2 crore timers memory mein rakhna bhi bhaari hai — schedule durable chahiye.',
          'Har ghante 2 crore rows chhoona hi asli galti hai. Data badhega toh kharcha bhi badhega.',
          'Kafka ka normal topic delay nahi deta — message turant padhne ke liye taiyaar hota hai. Delay alag se banana padta hai.',
        ],
      },
      {
        q: "Payment event reminder send ke saath race kar sakta hai. Kya karoge?",
        choices: [
          'Payment par pending reminder cancel karo, aur bhejte waqt bill ki haalat dobara jaancho',
          'Sirf cancel event bhej do — cancel event akela har race ko hamesha ke liye khatam karta',
          'Bill pay ho chuka ho tab bhi reminder bhejna sahi hai — reminder toh reminder hi hai',
          'Schedule delete karo, aur audit log ki koi zaroorat nahi — record rakhna bekaar hai',
        ],
        answer: 0,
        explain: 'Schedule zinda cheez hai: payment event aate hi pending reminder cancel karo. Par cancel aur send ek saath chal sakte hain — isliye bhejne se theek pehle bhi jaancho ki bill abhi bhi unpaid hai (version ke saath). Jo reminder pehle hi nikal chuka, us case ka business niyam tay karo. Delete karna ya cancelled mark karna — audit aur retention ki zaroorat dekh ke chuno.',
        choiceExplanations: [
          'Schedule zinda cheez hai: payment event aate hi pending reminder cancel karo. Par cancel aur send ek saath chal sakte hain — isliye bhejne se theek pehle bhi jaancho ki bill abhi bhi unpaid hai (version ke saath). Jo reminder pehle hi nikal chuka, us case ka business niyam tay karo. Delete karna ya cancelled mark karna — audit aur retention ki zaroorat dekh ke chuno.',
          'Cancel aur send ek hi pal par chal sakte hain. Bhejte waqt dobara jaanchna zaroori hai.',
          'Paid bill par reminder user ko dara deta hai aur bharosa todta hai. Bhejne se pehle haalat jaancho.',
          'Audit ki zaroorat business tay karta hai. Delete se pehle record rakhne ka niyam dekho.',
        ],
      },
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
          choices: [
            'Ruka hua process (GC pause) jaag ke, lock khatam hone ke baad bhi purane bharose par likhta hai',
            'Redis bahut tez hai, isliye Redis ki lease kabhi expire hi nahi hoti — lock atka rehta hai',
            'GC pause aate hi process ka bheja hua remote kaam apne aap wapas ho jaata hai, poora',
            'Ghadi ka timeout khud saabit kar deta hai ki resource ka maalik kaun hai — bas itna',
          ],
          answer: 0,
          explain: 'Kisi ek implementation ka bug nahi — har TTL wala lock is dikkat mein hai. Process ko pata hi nahi chalta ki beech mein kitni der ruka tha (GC pause, network freeze). Lock expire hua, kisi aur ko mila, aur pehla process jaag ke maanta rehta hai ki lock abhi bhi mila hua hai. Isliye fencing token: faisla storage kare, process nahi.',
          choiceExplanations: [
            'Kisi ek implementation ka bug nahi — har TTL wala lock is dikkat mein hai. Process ko pata hi nahi chalta ki beech mein kitni der ruka tha (GC pause, network freeze). Lock expire hua, kisi aur ko mila, aur pehla process jaag ke maanta rehta hai ki lock abhi bhi mila hua hai. Isliye fencing token: faisla storage kare, process nahi.',
            'TTL ka kaam hi expire hona hai. Dikkat expire hone ke baad purane holder ke likhne ki hai.',
            'Pause bheje hue kaam ko wapas nahi laata. Jaag ke process aur likh deta hai.',
            'Timeout ka matlab sirf "itni der ho gayi". Maalik kaun hai, storage ko token se jaanchna padta hai.',
          ],
        },
        {
          q: 'Kai workers ek hi order ship kar sakte hain. Safe claim aur shipment ka design?',
          choices: [
            'Shart wala atomic UPDATE se claim (WHERE status = \'paid\'), aur shipment ka idempotent irada',
            'Ek DB update ho gaya, toh bahar ka package bhi pakka ek hi baar jaayega — guarantee hai',
            'Queue par ek hi consumer rakho — ek consumer kabhi crash nahi hota, toh dikkat khatam',
            'App ki memory mein ek flag rakho — memory ka flag har restart ke baad bhi bacha rehta',
          ],
          answer: 0,
          explain: 'UPDATE ... SET status = \'shipping\' WHERE id = ? AND status = \'paid\' — kai workers mein se ek hi jeetega; 0 rows mile toh kisi aur ne le liya. Lock se simple aur bharosemand. Par package bhejna bahar ka effect hai: shipment ka irada outbox mein likho, carrier ko stable ID ke saath bhejo, aur reconcile karo. Akela DB claim har package ek baar jaane ki guarantee nahi.',
          choiceExplanations: [
            'UPDATE ... SET status = \'shipping\' WHERE id = ? AND status = \'paid\' — kai workers mein se ek hi jeetega; 0 rows mile toh kisi aur ne le liya. Lock se simple aur bharosemand. Par package bhejna bahar ka effect hai: shipment ka irada outbox mein likho, carrier ko stable ID ke saath bhejo, aur reconcile karo. Akela DB claim har package ek baar jaane ki guarantee nahi.',
            'DB claim sirf DB ke andar ek winner chunta hai. Carrier ko bheja gaya package bahar ka effect hai — stable ID aur reconcile chahiye.',
            'Ek consumer bhi crash hota hai, aur message dobara aata hai. Dedupe phir bhi chahiye.',
            'Memory ka flag restart par gayab. Aur doosri machine ka worker flag ko dekh hi nahi sakta.',
          ],
        },
        {
          q: 'Redis ka TTL lease duplicate rokne ke liye kab theek hai?',
          choices: [
            'Best-effort kaam mein, jahan do baar chal jaana bhi chal jaaye — jaise cache warming',
            'Har jagah — har lease wala lock linearizable writes ki pakki guarantee deta hai',
            'Payment mein bhi — akela TTL purane holder ko hamesha ke liye rok deta hai',
            'Kahin nahi — Redis ka koi bhi istemaal apne aap mein galat hi hota hai, hamesha',
          ],
          answer: 0,
          explain: 'Redis lease best-effort duplicate rokne ke liye kaam ka hai: cache warming, ek hi report do baar banne se bachna — do baar chal gaya toh bas thoda kharcha. Correctness (paisa, stock) ke liye resource par fencing ya atomic guard chahiye, aur failover, ghadi aur pause ke assumptions jaancho. "Hamesha" ya "kabhi nahi" se behtar: guarantee saaf likho.',
          choiceExplanations: [
            'Redis lease best-effort duplicate rokne ke liye kaam ka hai: cache warming, ek hi report do baar banne se bachna — do baar chal gaya toh bas thoda kharcha. Correctness (paisa, stock) ke liye resource par fencing ya atomic guard chahiye, aur failover, ghadi aur pause ke assumptions jaancho. "Hamesha" ya "kabhi nahi" se behtar: guarantee saaf likho.',
            'Lease sirf "shayad akela" deta hai. Ruka hua purana holder phir bhi likh sakta hai.',
            'TTL purane holder ko nahi rokta — bas lock chhodta hai. Paise ke liye fencing ya atomic guard chahiye.',
            'Best-effort kaam ke liye Redis lease bilkul theek hai. Bas correctness ka bharosa mat rakho.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Locks',
    instructions: 'Yahan skepticism dikhana seniority ka signal hai. 🎤',
    questions: [
      {
        q: '"Distributed lock kaise implement karoge?"',
        choices: [
          'Pehle niyam poochho — DB ki atomic shart kaafi hai? Warna lock aur fencing token',
          'Redis SETNX + TTL — SETNX TTL ke saath akela har niyam ki guarantee deta hai',
          'Quorum wali lease le lo — quorum ke baad fencing ki zaroorat hi nahi rehti',
          'Accha library chun lo — library chunte hi failure ka hisaab lagana khatam',
        ],
        answer: 0,
        explain: 'Accha jawab pehle sawaal ko challenge karta hai: lock chahiye bhi? Aksar DB unique constraint, shart wala UPDATE ya partitioning se kaam ho jaata hai. Sach mein chahiye toh fencing token ke saath, aur leader election ke liye quorum wala system (etcd, ZooKeeper). Bina fencing ke Redis SETNX par correctness tikana ek asli production bug hai, jo bahut companies ne dekha hai.',
        choiceExplanations: [
          'Accha jawab pehle sawaal ko challenge karta hai: lock chahiye bhi? Aksar DB unique constraint, shart wala UPDATE ya partitioning se kaam ho jaata hai. Sach mein chahiye toh fencing token ke saath, aur leader election ke liye quorum wala system (etcd, ZooKeeper). Bina fencing ke Redis SETNX par correctness tikana ek asli production bug hai, jo bahut companies ne dekha hai.',
          'SETNX + TTL best-effort hai. Ruka hua purana holder TTL ke baad bhi likh sakta hai.',
          'Quorum lease ko pause nahi rokta. Purana holder jaag ke likhe toh storage ko token se rokna padega.',
          'Library ke saath bhi pause, failover aur retries tumhari zimmedari hain. Hisaab lagana padta hai.',
        ],
      },
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
            { id: 'plain', label: "Saada POST — koi stable operation ID nahi", score: -3,
              why: 'Retry par duplicate order aur duplicate charge. Client jaan hi nahi sakta ki request pahunchi thi ya jawab kho gaya.' },
            { id: 'idem', label: "POST + stable operation ID (Idempotency-Key)", score: 3,
              why: 'Sahi. Key unique constraint ke saath, response ke SAATH store karo, aur dobara aane par wahi response lauta do.' },
            { id: 'dedupe', label: "Body ka hash — ek jaisi body ek hi order maano", score: -1,
              why: 'Toota hua — do alag users theek same order de sakte hain. Do jaayaz orders hain, duplicate nahi.' },
          ],
        },
        {
          id: 'event', label: 'Event publish', icon: '📤',
          note: 'Order bana, ab baaki services ko batana hai',
          options: [
            { id: 'dual', label: "Pehle DB commit, phir alag se event publish", score: -3,
              why: 'Dual write. Beech mein crash = order DB mein hai par event kabhi nahi gaya. Silent inconsistency, koi error nahi.' },
            { id: 'outbox', label: "Order aur outbox row ek hi commit mein", score: 3,
              why: "Dono rows ek durable DB transaction mein commit hoti hain. Relay recover karke retry kare aur retention preserve ho toh pending event publish ho sakta hai; relay lag, retries aur dedupe monitor karo." },
            { id: 'sync', label: "Save ke baad har service ko sync RPC call", score: -2,
              why: 'Order ki availability sabhi services ka GUNA ban jaayegi. Ek service down = order fail, jabki order toh ban sakta tha.' },
          ],
        },
        {
          id: 'flow', label: 'Multi-service flow', icon: '🧩',
          note: 'order → inventory → payment → shipping · retries, timeouts aur compensations ek jagah dikhne chahiye',
          options: [
            { id: '2pc', label: "Har jagah 2PC — saare systems ek transaction mein", score: -3,
              why: 'Blocking. Coordinator prepare ke baad mare toh sab locks pakde latke rehte hain. Availability sabse kamzor participant jaisi.' },
            { id: 'orch', label: "Durable orchestrator wali saga, compensation ke saath", score: 3,
              why: 'Sahi. Durable orchestrator flow, retries, timeouts aur recovery ek jagah rakhta hai — brief yahi maangta hai. Har step ka compensation likha hua. (Sirf 4 steps hona orchestration ki shart nahi.)' },
            { id: 'choreo', label: "Events ki choreography, recovery ke saath", score: 1,
              why: 'Choreography bhi sahi ho sakti hai, agar event contracts, correlation IDs aur recovery saaf hon. Par brief poora flow ek jagah dekhna chahta hai — choreography mein tracing aur documented flow alag se banana padega.' },
          ],
        },
        {
          id: 'consumer', label: 'Consumers', icon: '♻️',
          note: 'Broker at-least-once deliver karta hai',
          options: [
            { id: 'plain2', label: "Har delivery ko bina dekhe process karo", score: -3,
              why: 'At-least-once delivery mein duplicates aa sakte hain. Har delivery ko naya kaam maanoge toh stock reservation ya charge dobara ho sakta hai.' },
            { id: 'idem2', label: "Dedupe record aur local effect ek transaction mein", score: 3,
              why: 'Sahi, aur "ek transaction mein" wala hissa zaroori hai — warna tumne dual write dobara bana diya.' },
            { id: 'check', label: "Pehle padh ke jaancho, phir effect — bina guard", score: -1,
              why: 'Check-then-act race: SELECT aur effect ke beech doosra consumer bhi aa sakta hai. Dedupe ke liye unique key aur local effect ek transaction mein rakho; domain ke hisaab se shart wala atomic UPDATE bhi kaam aa sakta hai.' },
          ],
        },
        {
          id: 'query', label: '"Delhi ke pending orders"', icon: '🔎',
          note: 'Roz 10,000 baar, cross-service data',
          options: [
            { id: 'compose', label: "Har user ke liye ek API call (composition)", score: -2,
              why: 'Delhi mein 50,000 users hain → 50,000 calls. N+1 ka distributed roop. Composition 2-3 calls tak theek hai.' },
            { id: 'cqrs', label: "Order events se bana apna read model (CQRS)", score: 3,
              why: 'Sahi. order_summary (order_id, user_city, status) — ek query, 5 ms. Freshness bech ke query speed khareedi.' },
            { id: 'shared', label: "User service ki private table se seedha JOIN", score: -3,
              why: 'Cross-service DB access. Distributed monolith — user-service ka schema badla toh tum chup-chaap tootoge.' },
          ],
        },
        {
          id: 'payfail', label: 'Payment service dheemi hai', icon: '🛡️',
          note: 'Down nahi — p99 8 second',
          options: [
            { id: 'wait', label: "Payment API par bina hadd intezaar", score: -3,
              why: 'p99 8 second ka matlab har request 8 second nahi. Par dheemi ya atki calls bina timeout ke in-flight requests aur connections jama kar sakti hain — pool bhara toh poora order service atak sakta hai, jabki payment sirf DHEEMI thi.' },
            { id: 'guards', label: "Budget wale attempts + durable pending state", score: 3,
              why: 'Sahi. Timeout intezaar baandhta hai, breaker koshish rokta hai, bulkhead blast radius baandhta hai — aur order kho nahi raha, baad mein process hoga.' },
            { id: 'retry', label: "Payment safal hone tak bina hadd retries", score: -3,
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
        choices: [
          'Stable operation ID, outbox, saga, idempotent consumers aur payment ka reconcile',
          'Sab services ko sync call karo aur retry lagao — order kabhi nahi khoyega',
          '2PC lagao — 2PC bahar ki payment API ko bhi transaction mein le aata hai',
          'Outbox laga do — outbox har tarah ka data loss poori tarah khatam karta hai',
        ],
        answer: 0,
        explain: 'Har layer ka apna guard: Idempotency-Key (client ka retry), outbox (dual write), saga orchestration (kai services ka flow), idempotent consumer (at-least-once ke duplicates), read model (services ke aar-paar query), aur payment provider ke saath key + reconcile (adhoora jawab). Har guard alag failure rokta hai.',
        choiceExplanations: [
          'Har layer ka apna guard: Idempotency-Key (client ka retry), outbox (dual write), saga orchestration (kai services ka flow), idempotent consumer (at-least-once ke duplicates), read model (services ke aar-paar query), aur payment provider ke saath key + reconcile (adhoora jawab). Har guard alag failure rokta hai.',
          'Sync calls mein ek service dheemi ya down = order fail. Aur bina key ke retry double charge karta hai.',
          'Bahar ke payment providers 2PC mein hissa nahi lete. 2PC providers tak nahi pahunchta.',
          'Outbox DB par tika hai — DB ya backup khoya toh event bhi gaya. Aur payment ka adhoora jawab alag dikkat hai.',
        ],
      },
      {
        q: "Distributed failures ke liye useful design principle?",
        choices: [
          'Kaam hua ya nahi, aksar pata nahi chalta — state saaf aur durable, retry safe rakho',
          'Sab kuch hamesha async kar do — async kaam mein failure ka sawaal hi nahi uthta',
          'Distributed system mein kuch bhi coordinate karna namumkin hai — koshish bekaar',
          'Eventual consistency har business niyam ko hamesha apne aap poora karti hai',
        ],
        answer: 0,
        explain: 'Distributed failure mein aksar pata hi nahi chalta ki kaam hua ya nahi (timeout, crash). Isliye state durable aur saaf rakho, har kadam idempotent banao, retries seemit aur safe, aur sab kuch observable. Coordination aur transactions mumkin hain — "sirf eventual" wala naara har jagah sahi nahi.',
        choiceExplanations: [
          'Distributed failure mein aksar pata hi nahi chalta ki kaam hua ya nahi (timeout, crash). Isliye state durable aur saaf rakho, har kadam idempotent banao, retries seemit aur safe, aur sab kuch observable. Coordination aur transactions mumkin hain — "sirf eventual" wala naara har jagah sahi nahi.',
          'Async bhi fail hota hai — bas baad mein. Retry, dedupe aur monitoring phir bhi chahiye.',
          'Consensus, transactions aur locks se coordination hota hai. Bas keemat samajh ke.',
          'Eventual consistency mein beech mein niyam toot sakta hai (jaise overdraft). Kuch niyam strong check maangte hain.',
        ],
      },
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
            { t: "Isolation jaancho; seat ka claim atomic UPDATE se karo", good: true, next: 'c2', explain: 'Sahi. Zyadatar DBs ka default <b>READ COMMITTED</b> hai, jo is race ko nahi rokta: dono SELECT successful, dono ko "free" mila. Transaction <b>atomicity</b> deta hai, <b>mutual exclusion</b> nahi. Mutual exclusion ke liye lock ya shart wala UPDATE chahiye.' },
            { t: "Har pod ke process mein local mutex laga do, bas itna", good: false, explain: 'Mutex sirf <b>ek process</b> ke andar kaam karta hai. Do pods par mutex bilkul bekaar hai — aur galti chalak hai, kyunki local testing (ek process) mein mutex kaam karta dikhta hai.' },
            { t: "Takraati writes ko bina kisi shart ke dobara chalao", good: false, explain: 'Retry tab kaam aata hai jab kuch <b>fail</b> ho. Yahan dono requests successful thi — bas natija galat tha. Retry se kuch nahi badlega.' },
          ],
        },
        c2: {
          text: 'FOR UPDATE laga diya, double booking band. Par ab checkout page par timeouts aa rahe hain.',
          choices: [
            { t: "Dekho: row lock ke andar payment call toh nahi chal rahi", good: true, next: 'c3', explain: 'Yahi hota hai. Lock ke andar ek 2-second ka external call matlab us seat par sab 2 second ruke. Lock sirf DB ke kaam ke around ho — network call hamesha lock ke <b>bahar</b>.' },
            { t: "Lock ka timeout badha do, aur users ko zyada der rukne do", good: false, explain: 'Lamba timeout errors kam dikhayega, par intezaar aur lamba — user ke liye aur bura. Asli sawaal: lock itni der pakda kyun ja raha hai?' },
            { t: "Bina saboot ke DB connection pool bada kar do, bas itna", good: false, explain: 'Connections yahan hadd nahi hain — <b>lock</b> hadd hai. Sab usi ek row ka intezaar kar rahe hain; 500 connections bhi ek-ek karke hi chalenge.' },
          ],
        },
        c3: {
          text: 'Payment call lock ke bahar kar di. Par ab payment ke doraan seat kisi aur ko chali jaati hai.',
          choices: [
            { t: "Seat par expire hone wala hold; confirm par maalik jaancho", good: true, next: 'end', explain: 'Yahi asli hal hai. Hold ek <b>chhoti</b> transaction hai (lock milliseconds ka), par hold ka asar 10 minute rehta hai — aur TTL se abandoned checkouts apne aap saaf ho jaate hain. Ab teenon problems ek saath hal hain: race, lock ka waqt, aur user ka waqt.' },
            { t: "Bahar ki payment poori hone tak DB ka row lock pakde rakho", good: false, explain: 'Wapas wahi problem — ek DB lock minute bhar latka hua, poore us row par. Aur agar user ka browser band ho gaya toh lock timeout tak baitha rahega.' },
            { t: "Seat kiski hai, jaanche bina pehle hi user ka paisa kaat lo", good: false, explain: 'Ab tumne paisa le liya aur seat na milne ka risk user par daal diya. Refund flow, support tickets, aur bharosa — teenon ka nuksaan.' },
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
          q: 'READ COMMITTED mein pehle saada SELECT (seat free hai?), phir UPDATE — bina kisi guard ke. Booking safe hai?',
          choices: [
            'Do transactions dono "free" padh sakti hain — FOR UPDATE ya shart wala UPDATE chahiye',
            'Transaction hai toh do SELECT apne aap ek line mein chalenge — dono free nahi padhenge',
            'Duplicate ke baad rollback ho jaayega, toh dono bookings apne aap safe ho jaayengi',
            'Sirf SERIALIZABLE hi reservation bacha sakta hai — aur koi tareeka hai hi nahi',
          ],
          answer: 0,
          explain: 'READ COMMITTED mein dono transactions ek hi pal par seat "free" padh sakti hain, aur dono UPDATE kar deti hain. Transaction atomicity deta hai, mutual exclusion nahi. Bachav: SELECT ... FOR UPDATE, shart wala atomic UPDATE (WHERE status = \'free\'), ya SERIALIZABLE + retry.',
          choiceExplanations: [
            'READ COMMITTED mein dono transactions ek hi pal par seat "free" padh sakti hain, aur dono UPDATE kar deti hain. Transaction atomicity deta hai, mutual exclusion nahi. Bachav: SELECT ... FOR UPDATE, shart wala atomic UPDATE (WHERE status = \'free\'), ya SERIALIZABLE + retry.',
            'Transaction do SELECT ko line mein nahi lagata. READ COMMITTED mein dono ek saath "free" padh lete hain.',
            'Dono commit ho chuke toh rollback kaun karega? Galti ke baad rollback ka koi raasta nahi.',
            'SERIALIZABLE ek tareeka hai, akela nahi. FOR UPDATE ya shart wala UPDATE bhi bachata hai.',
          ],
        },
        {
          q: 'Hot row (sabse popular seat) par optimistic locking kya karega?',
          choices: [
            'Zyaadatar takraayenge aur retry karenge — bekaar kaam aur badhta hua bojh',
            'Optimistic hot row par hamesha jeet-ta hai — koi rukta nahi, sab tez chalta',
            'Pessimistic laga do — pessimistic se intezaar aur deadlock dono khatam',
            'Har haari hui compare ko hamesha retry karte raho, jab tak jeet na jaaye',
          ],
          answer: 0,
          explain: 'Hot row par sab ek hi row badalna chahte hain. Optimistic mein ek jeet-ta hai, baaki haar ke retry karte hain — bekaar kaam aur bojh badhta hai (retry storm). Line, pessimistic claim ya admission control madad karte hain. Kaunsa tez hai, workload aur transaction ki lambai par depend karta hai — naap ke dekho, aur retry ki hadd rakho.',
          choiceExplanations: [
            'Hot row par sab ek hi row badalna chahte hain. Optimistic mein ek jeet-ta hai, baaki haar ke retry karte hain — bekaar kaam aur bojh badhta hai (retry storm). Line, pessimistic claim ya admission control madad karte hain. Kaunsa tez hai, workload aur transaction ki lambai par depend karta hai — naap ke dekho, aur retry ki hadd rakho.',
            'Takraav zyada ho toh optimistic mein zyaadatar haarte hain. Haarne wale ka kaam bekaar jaata hai.',
            'Pessimistic mein log line mein rukte hain, aur deadlock bhi ho sakta hai. Intezaar khatam nahi hota.',
            'Bina hadd retry khud bheed badhata hai. Retry ki hadd chahiye.',
          ],
        },
        {
          q: 'Reservation mein TTL na ho toh?',
          choices: [
            'Chhode gaye checkout seats pakde rehte hain — "sold out" dikhega, seats khaali hongi',
            'TTL ke bina har seat apne aap do logon ko bik jaati hai — double booking pakki',
            'DB lock ka timeout hi reservation ki business expiry hai — dono ek hi cheez hain',
            'Checkout lamba chala toh seat hamesha ke liye pehle user ki ho jaati hai, bas',
          ],
          answer: 0,
          explain: 'Sabse chalak failure, kyunki kuch fail hi nahi hota: na error, na alert — bas inventory dheere-dheere gayab. User cart chhod ke chala gaya, hold pada raha. TTL hold ko ek vaada banata hai (10 minute ke liye), kabza nahi.',
          choiceExplanations: [
            'Sabse chalak failure, kyunki kuch fail hi nahi hota: na error, na alert — bas inventory dheere-dheere gayab. User cart chhod ke chala gaya, hold pada raha. TTL hold ko ek vaada banata hai (10 minute ke liye), kabza nahi.',
            'Hold double booking nahi karta — ulta seat rok ke rakhta hai. Dikkat seat ka atak jaana hai.',
            'DB lock milliseconds ka hota hai; reservation minutes ki business expiry. Dono alag.',
            'Atka hold kharid nahi hai. Bina TTL ke seat bas fansi rehti hai — na bikti, na chhootti.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Contention',
    instructions: 'Ticket booking lagbhag har interview mein aata hai. 🎤',
    questions: [
      {
        q: '"Ticketmaster design karo. Ek popular concert, 50,000 log ek saath."',
        choices: [
          'Chhota atomic hold + TTL, aage waiting room (admission), aur payment lock ke bahar',
          'User ke payment page bhar DB ka lock pakde rakho — seat apne aap safe rahegi',
          'Akela Redis lease double-sell ki pakki guarantee de deta hai — aur kuch nahi',
          'Popular seat par bina hadd retries chalne do — koi na koi toh jeetega hi',
        ],
        answer: 0,
        explain: 'Do cheezein saath chahiye. (1) Reservation: seat par chhota atomic hold + TTL (DB mein status + expiry, ya Redis SET NX EX), confirm par maalik jaancho, payment lock ke bahar. (2) Waiting room: 50,000 log ek saath aa rahe hain — sabko seedha DB tak jaane dena hi outage hai. Resilience track wala flash-crowd admission control yahi hai.',
        choiceExplanations: [
          'Do cheezein saath chahiye. (1) Reservation: seat par chhota atomic hold + TTL (DB mein status + expiry, ya Redis SET NX EX), confirm par maalik jaancho, payment lock ke bahar. (2) Waiting room: 50,000 log ek saath aa rahe hain — sabko seedha DB tak jaane dena hi outage hai. Resilience track wala flash-crowd admission control yahi hai.',
          'Payment page par user minute laga sakta hai. Itni der DB lock = baaki sab atke.',
          'Redis lease best-effort hai. Confirm par DB mein maalik ki jaanch phir bhi chahiye.',
          'Ek seat par bina hadd retries = retry storm. Admission control se bheed pehle hi roko.',
        ],
      },
      {
        q: '"Optimistic ya pessimistic — kaise chunoge?"',
        choices: [
          'Takraav kitna hai, kaam kitni der chalta hai — dekh ke chuno; insaan ka waqt ho toh hold',
          'Pessimistic har row par hamesha tez hota hai — har jagah pessimistic hi lagao',
          'Optimistic har failure mein zyada safe hai — har jagah optimistic hi lagao',
          'DB ka brand dekh ke chuno — brand hi tay karta hai app ki locking, aur kuch nahi',
        ],
        answer: 0,
        explain: 'Takraav, transaction ki lambai, isolation aur retry ki keemat milao. Kam takraav (alag rows) → optimistic, koi rukta nahi. Hot row → pessimistic ya line. Beech mein insaan ka waqt (checkout ke minute) ho toh DB lock nahi — durable reservation, expiry aur maalik ki jaanch.',
        choiceExplanations: [
          'Takraav, transaction ki lambai, isolation aur retry ki keemat milao. Kam takraav (alag rows) → optimistic, koi rukta nahi. Hot row → pessimistic ya line. Beech mein insaan ka waqt (checkout ke minute) ho toh DB lock nahi — durable reservation, expiry aur maalik ki jaanch.',
          'Kam takraav par pessimistic bekaar mein sabko rokta hai. Hamesha tez nahi.',
          'Hot row par optimistic sabko retry karwata hai. Safe hai, par bojh badhata hai.',
          'Brand se zyada workload tay karta hai. Har DB mein dono tareeke chal sakte hain.',
        ],
      },
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
          q: 'Kafka ke ek consumer group (classic model) mein 6 partitions aur 10 consumers hain. Kitne kaam karenge?',
          choices: [
            'Zyada se zyada 6 kaam karenge, 4 khaali — ek partition ek hi consumer ko milta hai',
            'Saare 10 kaam karenge — har consumer ko har partition ka thoda hissa milega',
            'Kafka group ko mana kar dega — partitions se zyada consumers allowed hi nahi',
            '4 consumers aur jodne se throughput theek 10/6 guna badh jaayega, pakka',
          ],
          answer: 0,
          explain: 'Classic consumer group mein ek partition ek waqt mein group ke ek hi consumer ko milta hai. 6 partitions, 10 consumers: zyada se zyada 6 kaam par, 4 khaali (standby jaise). Alag groups apna-apna poora data padh sakte hain. Kafka ke naye protocols (jaise share groups) ke niyam alag hain — version dekh lo.',
          choiceExplanations: [
            'Classic consumer group mein ek partition ek waqt mein group ke ek hi consumer ko milta hai. 6 partitions, 10 consumers: zyada se zyada 6 kaam par, 4 khaali (standby jaise). Alag groups apna-apna poora data padh sakte hain. Kafka ke naye protocols (jaise share groups) ke niyam alag hain — version dekh lo.',
            'Classic group mein partition baanta nahi jaata. Ek partition, ek consumer.',
            'Kafka mana nahi karta. Extra consumers bas khaali baithte hain.',
            'Khaali consumers kaam nahi karte. Throughput partitions ki ginti par tika hai.',
          ],
        },
        {
          q: 'Kafka mein ordering ka guarantee kahan tak hai?',
          choices: [
            'Ek partition ke log ke andar — jinka kram zaroori hai, ek hi key par bhejo',
            'Saare topics mein ek global kram — har event poore Kafka mein kram se hai',
            'Consumer group alag-alag partitions ke beech bhi kram pakka rakhta hai',
            'Kai workers saath chalein tab bhi har effect log ke kram mein hi hota hai',
          ],
          answer: 0,
          explain: 'Kafka ka partition ek kram wala log hai. Jin events ka kram zaroori hai (jaise ek user ke events), aise events ek hi key (jaise user_id) se bhejo — sab ek partition mein jaayenge. Par consumer ke andar parallel workers, retries ya sink ki der effects ka kram badal sakte hain. Aur partitions ki ginti badli toh key ka partition badal sakta hai.',
          choiceExplanations: [
            'Kafka ka partition ek kram wala log hai. Jin events ka kram zaroori hai (jaise ek user ke events), aise events ek hi key (jaise user_id) se bhejo — sab ek partition mein jaayenge. Par consumer ke andar parallel workers, retries ya sink ki der effects ka kram badal sakte hain. Aur partitions ki ginti badli toh key ka partition badal sakta hai.',
            'Kram sirf partition ke andar hai. Topics ya partitions ke beech koi global kram nahi.',
            'Consumer group partitions baant-ta hai, partitions ke beech kram nahi banata.',
            'Parallel workers aur retries effects ko aage-peeche kar sakte hain. Log ka kram effect ka kram nahi.',
          ],
        },
        {
          q: 'Watermark mein late events ki chhoot 30 second kar di. Kya sauda hua?',
          choices: [
            'Zyada late events pakde jaayenge, par window ka pakka nateeja der se aur state zyada',
            'Har event theek 30 second der se process hoga — har request par pakki 30 s der',
            'Watermark ke baad ab koi late event aa hi nahi sakta — guarantee mil gayi',
            'Lamba watermark memory ka istemaal bhi har haal mein ghata deta hai, hamesha',
          ],
          answer: 0,
          explain: 'Watermark andaaza hai ki event time kahan tak pahunch gaya. Chhoot badhaoge toh zyada late events sahi window mein ginenge, par window ka pakka (final) nateeja der se aayega aur windows ki state zyada der memory mein rahegi. Har event theek 30 s ruke, aisa nahi. Watermark ke baad bhi events aa sakte hain — aise events ke liye allowed lateness ya correction ka niyam rakho.',
          choiceExplanations: [
            'Watermark andaaza hai ki event time kahan tak pahunch gaya. Chhoot badhaoge toh zyada late events sahi window mein ginenge, par window ka pakka (final) nateeja der se aayega aur windows ki state zyada der memory mein rahegi. Har event theek 30 s ruke, aisa nahi. Watermark ke baad bhi events aa sakte hain — aise events ke liye allowed lateness ya correction ka niyam rakho.',
            'Der window ke final nateeje mein aati hai, har event par pakki 30 s nahi.',
            'Watermark ek andaaza hai. Watermark ke baad bhi late event aa sakta hai.',
            'Lamba watermark windows ko zyada der khula rakhta hai — memory badhti hai, ghatti nahi.',
          ],
        },
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
        q: '1 million clicks/sec, har minute ki ginti chahiye. Event time, duplicates aur skew ke saath design?',
        choices: [
          'Event-time windows, hot key ka ilaaj, click ID se dedupe, aur late events ka niyam',
          'Bloom filter ne "dekha hua" kaha toh click pakka duplicate hai — seedha phenk do',
          'ad_id se partition karo — ad_id akela kabhi koi garam (hot) partition nahi banne deta',
          'Kafka mein aa gaya toh har report apne aap exactly-once sahi ho jaati hai, bas',
        ],
        answer: 0,
        explain: 'Clicks Kafka mein (key = ad_id), stream processor event-time ki 1-minute windows mein gine, watermark se late events sambhale, aur nateeja OLAP store mein. Bahut popular ad ek partition ko garam kar dega — key ko tod ke (salting) gino aur baad mein jodo. Duplicates ke liye click ID se dedupe. Bloom filter kabhi-kabhi naye click ko bhi "dekha hua" bata deta hai (false positive) — chhoti galti manzoor ho tabhi lagao, warna pakka check.',
        choiceExplanations: [
          'Clicks Kafka mein (key = ad_id), stream processor event-time ki 1-minute windows mein gine, watermark se late events sambhale, aur nateeja OLAP store mein. Bahut popular ad ek partition ko garam kar dega — key ko tod ke (salting) gino aur baad mein jodo. Duplicates ke liye click ID se dedupe. Bloom filter kabhi-kabhi naye click ko bhi "dekha hua" bata deta hai (false positive) — chhoti galti manzoor ho tabhi lagao, warna pakka check.',
          'Bloom filter ka "haan" galat bhi ho sakta hai (false positive). Asli naya click phenk doge.',
          'Ek bahut popular ad ka saara traffic ek partition par jaata hai. ad_id hi hot partition banata hai.',
          'Kafka mein aana sirf pehla kadam hai. Dedupe, late events aur sink mein likhne ka niyam alag se chahiye.',
        ],
      },
      {
        q: 'Replay ho sake aur kai subscribers padh sakein, aisa event log chahiye. Kafka vs SQS ka mazboot tark?',
        choices: [
          'Kafka ka log rakha rehta hai: replay ho sakta hai, aur kai alag groups apna data padhte',
          'SQS FIFO kisi bhi tarah ka group-wise kram de hi nahi sakta — sirf Kafka deta hai',
          'Kafka har workload mein SQS se sasta padta hai — kharche ka sawaal hi nahi uthta',
          'SQS mein replay na hone ki wajah sirf kam throughput hai — retention se lena-dena nahi',
        ],
        answer: 0,
        explain: 'Kafka ka log retention tak rakha rehta hai: naya consumer purana data padh sakta hai (replay), aur kai consumer groups ek hi stream apne-apne offset se padhte hain. SQS mein receive ke baad message kuch der invisible hota hai; kaam poora hone par consumer message delete karta hai — delete hua message offset ki tarah peeche ja ke dobara nahi padh sakte. SQS FIFO bhi message group ke andar kram deta hai. Replay, retention, redrive aur kharcha milao; "SQS hamesha kam scalable ya sasta" sahi daawa nahi.',
        choiceExplanations: [
          'Kafka ka log retention tak rakha rehta hai: naya consumer purana data padh sakta hai (replay), aur kai consumer groups ek hi stream apne-apne offset se padhte hain. SQS mein receive ke baad message kuch der invisible hota hai; kaam poora hone par consumer message delete karta hai — delete hua message offset ki tarah peeche ja ke dobara nahi padh sakte. SQS FIFO bhi message group ke andar kram deta hai. Replay, retention, redrive aur kharcha milao; "SQS hamesha kam scalable ya sasta" sahi daawa nahi.',
          'SQS FIFO message group ke andar kram deta hai. Asli farak kram ka nahi — replay ka hai.',
          'Kharcha workload par depend karta hai. Chhote kaam ke liye SQS aksar sasta aur aasan hota hai.',
          'Replay ka farak retention aur delete ka hai, throughput ka nahi. Consumer ke delete karne ke baad message offset se dobara nahi padh sakte.',
        ],
      },
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
