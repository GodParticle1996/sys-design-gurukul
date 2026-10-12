/* =====================================================================
   TRACK — 🤖 AI Companies · TikTok: 3 swipe mein pehchaan

   Source: "How TikTok Makes 1 Billion Predictions Per Second" (Akhil Sharma),
   ByteDance ka Monolith paper (2022) ke aadhaar par.
   Core faisla: batch retraining ki jagah REAL-TIME ONLINE LEARNING.
   Docker lab: docker-labs/28-tiktok
   ===================================================================== */
(function () {

VISUALS['tt-feedback-loop'] = {
  t: 'Duniya aur model ke beech ka gap',
  html: `
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🎬</span><span class="nl">Netflix</span><span class="ns">~15,000 titles · 1 faisla / 2 ghante · taste hafton mein badle</span></div>
      <div class="dg-node"><span class="ni">🎵</span><span class="nl">Spotify</span><span class="ns">taste mahino mein badalta hai</span></div>
      <div class="dg-node is-bad"><span class="ni">📱</span><span class="nl">TikTok</span><span class="ns">~1 crore nayi videos/din · 10 min mein 20 faisle · taste SESSION ke andar badle</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🌙 Batch (raat ko retrain)</span>
        <div class="dg-cap">Aaj cricket chahiye, model kal tak "cooking wala banda" samjhega. Lab 28: 20 mein <b>0.3</b> hit.</div></div>
      <div class="dg-box is-good"><span class="bx-label">⚡ Online (har swipe se seekho)</span>
        <div class="dg-cap">Kuch skips ke andar model samajh jaata hai. Lab 28: 20 mein <b>11.2</b> hit, 6th video tak samjha.</div></div>
    </div>`,
};

VISUALS['tt-embeddings'] = {
  t: 'Har user ki apni row — cuckoo hashing',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔀 Fixed hashed table</span>
        <div class="dg-cap">row = hash(user) % size. Table bhari → do users ek row share karte hain → ek hi "taste".
          Lab: users jitni rows par bhi <b>63%</b> users kisi aur ke saath share.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🐦 Cuckoo table</span>
        <div class="dg-cap">Do hash functions = har key ki do jagah. Jagah bhari → purane ko uski dusri jagah dhakelo.
          <b>0% sharing</b>, lookup hamesha 2 jagah.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🆕 naya user</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🎚️ frequency filter (kaafi interactions?)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🐦 cuckoo table</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">⌛ 30 din inactive → expire</span>
    </div>`,
};

VISUALS['tt-pipeline'] = {
  t: 'Model standard hai, pipeline mushkil hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">📤 features topic (recommend karte waqt)</span><span class="dg-arrow">+</span>
      <span class="dg-pill acc">👆 actions topic (1–30 sec baad)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🔗 Flink join (recommendation id se, window ke saath)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🏋️ training PS</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🧪 Training parameter servers</span>
        <div class="dg-cap">Lagatar update, thoda messy chalega — experiment ki jagah.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🚀 Serving parameter servers</span>
        <div class="dg-cap">&lt;200 ms, bharosemand. Har kuch minute mein <b>jaanche hue</b> params ka sync.
          Training gire, serving jawab deta rehta hai.</div></div>
    </div>`,
};

VISUALS['tt-ranking'] = {
  t: 'Arabon se 20 tak — do kadam',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">∞</span><span class="cmd">Saari videos</span><span class="q">arabon — har request par sabko score karna namumkin (200 ms mein)</span></div>
      <div class="dg-rung a"><span class="lv">~500</span><span class="cmd">Candidate generation (retrieval)</span><span class="q">tez, andaaza — user embedding se kuch sau candidates</span></div>
      <div class="dg-rung g"><span class="lv">~20</span><span class="cmd">Fine ranking + multi-objective score</span><span class="q">watch, like, share, completion — business weights ke saath</span></div>
    </div>
    <div class="dg-cap">Signal: <b>tumhara angootha</b>. 15 sec ki video poori dekhi = mazboot haan. 1 sec mein scroll = mazboot na.
      Like fake kar sakte ho, dekha hua fake nahi.</div>`,
};

SD.registerLevels('ai', [
/* =====================================================================
   1. tt-feedback-loop
   ===================================================================== */
{
  id: 'tt-feedback-loop',
  icon: '⚡',
  title: 'TikTok — feedback loop ki speed hi model hai',
  badge: 'Swipe Samajhdar',
  objectives: [
    'Non-stationary data: taste session ke andar badalta hai',
    'Batch retraining vs online learning — alag architectures',
    'TikTok ki problem ki shakal Netflix/Spotify se kaise alag hai',
    'Lab: taste flip par nightly batch vs online update',
  ],
  lesson: [
    `<h3>🍳 → 🏏 Ek session, do taste</h3>
     <p>Tum 20 cooking videos dekhte ho. Phir galti se ek cricket highlight aata hai, tum poora dekh lete
     ho, phir ek aur. Tumhara taste <b>isi session mein</b> badal gaya. Agar model raat ko retrain hota
     hai, woh kal tak tumhe cooking dikhata rahega — aur tum tab tak app band kar chuke hoge.</p>
     <p>Video ka dawa: TikTok naye user ka taste ~30–40 minute scroll mein samajh leta hai; Netflix ko
     din, Spotify ko hafte lagte hain. Wajah smart data scientists nahi, ek <b>architectural bet</b>:
     batch retraining ki jagah <b>real-time online learning</b>.</p>
     <table>
       <tr><th></th><th>Netflix</th><th>TikTok</th></tr>
       <tr><td>Catalog</td><td>~15,000 titles, hafte mein thode naye</td><td>~1 crore nayi videos roz (lagbhag anant)</td></tr>
       <tr><td>Faisle</td><td>~1 har 2 ghante</td><td>~20 har 10 minute</td></tr>
       <tr><td>Video ki umar</td><td>saalon</td><td>4 ghante pehle hot, ab mari hui</td></tr>
       <tr><td>Taste badalta hai</td><td>hafton mein</td><td>session ke andar</td></tr>
     </table>`,
    `<h3>🏗️ "Batch ko zyada baar chala do" kaam kyun nahi karta</h3>
     <p>Batch pipeline: din bhar ka data jama karo → raat ko poora model train → subah deploy. Isko har
     ghante chalao toh bhi har baar poora data, poori training, poora deploy — mehenga aur phir bhi
     ghante bhar peeche.</p>
     <p>Online learning alag architecture hai: har action (dekha/skip kiya) ek chhota training example
     ban ke <b>turant</b> model ke parameters thode se hilata hai, aur naye parameters kuch minute mein
     serving tak pahunchte hain. Yeh wahi pattern hai jo fraud detection, ad ranking, dynamic pricing
     mein kaam aata hai — jahan bhi data <b>non-stationary</b> ho (sach badalta rehta ho).</p>
     <h3>📏 Lab 28 mein naapa</h3>
     <pre>model              agle 20 videos mein poore dekhe   model kab samjha
nightly batch         0.3 / 20                     aaj kabhi nahi
online (lr 0.05)      2.6 / 20                     video #17.9
online (lr 0.2)      11.2 / 20                     video #6.4</pre>
     <p class="tip">🎯 Video ka pehla sabak: <b>feedback loop ki speed, model ki sophistication se zyada
     maayne rakhti hai.</b> Seedha model jo har minute seekhe, us fancy model ko hara deta hai jo raat
     ko seekhe.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Online learning chahiye ya batch kaafi?',
      instructions: 'Kis problem mein sach itni jaldi badalta hai ki online learning ka kharcha jayaz hai?',
      bins: [
        { id: 'online', label: '⚡ Online / real-time chahiye' },
        { id: 'batch', label: '🌙 Batch (raat ko) kaafi' },
      ],
      items: [
        { text: 'Short-video feed jahan taste session mein badalta hai', bin: 'online', explain: 'TikTok ka case — 20 faisle 10 minute mein.' },
        { text: 'Card fraud jahan attackers har ghante naya pattern try karte hain', bin: 'online', explain: 'Fraud non-stationary hai — kal ka model aaj ka attack nahi jaanta.' },
        { text: 'Movie recommendation, catalog hafte mein thoda badalta hai', bin: 'batch', explain: 'Netflix jaisa: faisle kam, catalog dheema — batch sasta aur kaafi.' },
        { text: 'Monthly churn prediction report', bin: 'batch', explain: 'Report mahine ki hai — minute-level freshness ka koi faayda nahi.' },
        { text: 'Ride-hailing surge pricing', bin: 'online', explain: 'Demand minute-minute badalti hai (baarish shuru, match khatam).' },
        { text: 'Product search ke liye spelling correction model', bin: 'batch', explain: 'Bhasha itni jaldi nahi badalti — hafte mein ek baar kaafi.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — taste achaanak badla',
      project: '28-tiktok',
      exercise: 'ex3',
      goal: 'Ek user jiska taste pehli video se badal gaya — nightly batch vs online update, agle 20 videos mein kitne hit.',
      why: `<code>tools/tasteflip.js</code>: kal tak user sirf cooking dekhta tha. Aaj sirf cricket. Model 90%
        apni pasand dikhata hai, 10% explore. Batch model aaj nahi badalta; online model har swipe ke baad
        user ka vector thoda hilata hai. 500 users ka average.`,
      steps: [
        { text: 'Simulation chalao (koi server nahi chahiye).', cmd: 'cd docker-labs/28-tiktok && node tools/tasteflip.js', expect: 'nightly batch         0.3 / 20                     aaj kabhi nahi\nonline (lr 0.05)      2.6 / 20                     video #17.9 (96% users)\nonline (lr 0.2)      11.2 / 20                     video #6.4 (99% users)' },
        { text: '<code>lr</code> 0.05 aur 0.2 ka farq dekho — "kitni jaldi yakeen karein".', cmd: 'node tools/tasteflip.js | tail -3', expect: 'lr = "kitni jaldi yakeen karein" — chhota lr der se samjha (#17.9), bada lr jaldi (#6.4).' },
      ],
      observe: {
        q: 'Batch model ko 20 mein sirf 0.3 hit mile. Woh 0.3 bhi kahan se aaye?',
        choices: [
          '10% explore se — kabhi-kabhi random cricket video aa gayi. Model khud kuch nahi seekha',
          'Batch model ne dheere-dheere seekha',
          'User ne cooking bhi dekhi',
          'Bug hai',
        ],
        answer: 0,
        explain: 'Batch model aaj poore din frozen hai. Explore hi ek raasta tha — aur online model usi explore se seekhta hai.',
      },
      lesson: 'Online learning = explore se mila signal turant istemaal. Batch mein wahi signal kal tak pada rehta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — recommendation freshness',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara feed model raat ko retrain hota hai. Naye users 2 din mein chale jaate hain. Kya karoge?"',
        choices: [
          'Online learning — actions ko stream se turant training mein, user embeddings ko minute-level par update, aur naye params ko kuch minute mein serving tak sync',
          'Retraining har ghante chala do',
          'Bada model lagao',
          'Naye users ko popular videos dikhao, hamesha',
        ],
        answer: 0,
        explain: 'Batch ko zyada baar chalana alag architecture nahi hai — har baar poora kaam, phir bhi peeche.',
      },
      {
        q: 'Interviewer: "Online learning ka sabse bada nuksaan?"',
        choices: [
          'Lagatar training = lagatar fail hone wala production system (crash, sync lag, Kafka backlog) aur reproducibility khatam — 5 minute pehle wala model ab hai hi nahi',
          'Yeh mehenga GPU maangta hai',
          'Yeh sirf chhote models par chalta hai',
          'Koi nuksaan nahi',
        ],
        answer: 0,
        explain: 'Video: "a continuously training production model is a continuously failing production model".',
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki kab data non-stationary hai aur online learning jayaz hai',
    'Main samjha sakta hoon ki batch ko zyada baar chalana online learning kyun nahi hai',
    'Main lab se nightly vs online ka farq numbers mein dikha sakta hoon',
  ],
  homework: `<p>Apne product ki ek ML (ya rule-based) cheez lo — search ranking, fraud rule, recommendation.
    Likho: (1) sach kitni jaldi badalta hai (minute/din/mahina)? (2) model kitni der peeche chalta hai?
    Agar (2) > (1), toh tumhara model hamesha kal ki duniya ke liye faisla kar raha hai.</p>`,
  cards: [
    { front: 'TikTok ka core architectural bet?', back: 'Batch retraining ki jagah real-time online learning — har action se turant seekhna, params kuch minute mein serving tak.' },
    { front: 'Batch ko har ghante chala dena online learning kyun nahi?', back: 'Har baar poora data, poori training, poora deploy — mehenga aur phir bhi ghanta bhar peeche. Online = alag architecture (stream → chhote updates → sync).' },
    { front: 'Lab 28: taste flip par batch vs online?', back: 'Nightly batch: 0.3/20 hit (sirf explore se). Online lr 0.2: 11.2/20, 6th video tak samjha.' },
  ],
},

/* =====================================================================
   2. tt-embeddings
   ===================================================================== */
{
  id: 'tt-embeddings',
  icon: '🐦',
  title: 'Embedding table — arabon rows, koi share na kare',
  badge: 'Cuckoo Karigar',
  objectives: [
    'Embedding kya hai aur table itni badi kyun',
    'Fixed-size hashed table ka chhupa nuksaan: collisions',
    'Cuckoo hashing — collisionless table',
    'Expiry aur frequency filter se memory bounded',
  ],
  lesson: [
    `<h3>🧭 Embedding = taste ka pata</h3>
     <p>Har user aur har video ek <b>vector</b> hai — kuch sau numbers — jo "is bande ko kya pasand hai"
     ya "yeh video kis tarah ki hai" batata hai. Paas-paas ke vectors = milta-julta taste.</p>
     <p>1 arab+ users, arabon videos → table ki arabon rows. Ek machine mein fit nahi, aur har second
     <b>badhti</b> hai (naye users, nayi videos). Isliye yeh parameter servers mein bikhri hoti hai.</p>
     <h3>🔀 Fixed-size table ka chupa dhokha</h3>
     <p>Aam TensorFlow embedding tables fixed-size hoti hain: <code>row = hash(user) % size</code>.
     Table bhari → do alag users (video ki misaal: Akhil aur Yuki) <b>ek hi row</b> share karte hain →
     model dono ko ek hi insaan samajhta hai → dono ko ek hi feed. Koi error nahi aata — bas quality
     chupchaap girti hai, aur log chale jaate hain.</p>
     <p>Lab 28 mein 10 lakh users:</p>
     <pre>table   500000 rows:  86.5% users kisi aur ke saath row share karte hain
table  1000000 rows:  63.2%   ← users jitni rows, phir bhi!
table  4000000 rows:  22.2%   ← 4× memory, phir bhi 1 mein se 5</pre>`,
    `<h3>🐦 Cuckoo hashing — koyal ki tarah dhakelo</h3>
     <p>Koyal apna anda doosri chidiya ke ghonsle mein daalti hai aur uska anda bahar dhakel deti hai.
     Cuckoo hashing yahi karta hai:</p>
     <ol>
       <li>Har key ki <b>do sambhav jagah</b> (do hash functions).</li>
       <li>Pehli jagah khaali → baith jao. Bhari → wahan baithe ko <b>dhakelo</b>.</li>
       <li>Dhakela hua apni <b>dusri</b> jagah jaata hai; wahan bhi koi hai toh use dhakelta hai… jab tak
       sabko ghar na mil jaaye.</li>
     </ol>
     <p>Nateeja: <b>koi do users ek row share nahi karte</b>, aur lookup hamesha sirf 2 jagah dekhna.
     Lab: 20 lakh rows (load 50%), 0% sharing, average 0.27 dhakke — par 50% load ke paas kabhi-kabhi
     lambi chain (366), isliye table ko isse zyada nahi bharte.</p>
     <h3>⌛ Memory bounded rakhne ke do jugaad</h3>
     <ul>
       <li><b>Expiry</b> — har row par "last seen". 30 din se nahi aaya → row hatao; wapas aaya toh dobara
       seekh lo (hamesha rakhne se sasta). Lab: 10 lakh mein se 3.7 lakh hi active → <b>63% memory bachi</b>.</li>
       <li><b>Frequency filter</b> — bahut kam interactions wale ko table mein daalo hi mat jab tak ek
       threshold paar na ho. Ek baar aaya, kabhi nahi lauta — uske liye row kyun?</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Cuckoo insert — kadam sahi order mein',
      instructions: 'Naya user "riya" table mein daalna hai. Uski pehli jagah par "aman" baitha hai.',
      steps: [
        { text: 'h1(riya) nikaalo — pehli jagah', explain: 'Har key ki do sambhav jagah hain; pehle pehli dekho.' },
        { text: 'Jagah par aman baitha hai → riya ko wahan baithao, aman ko nikaalo', explain: 'Yahi "dhakka" hai — naya andar, purana bahar.' },
        { text: 'Aman ki DUSRI jagah nikaalo (h2 ya h1, jo abhi wali nahi thi)', explain: 'Dhakela hua key apni doosri sambhav jagah par jaata hai.' },
        { text: 'Wahan koi hai toh use dhakelo, warna aman wahan baith jaaye', explain: 'Chain tab tak chalti hai jab tak sabko ghar na mil jaaye.' },
        { text: 'Chain bahut lambi ho (limit paar) → table badhao / rehash', explain: 'Load 50% ke paas chains lambi hoti hain — yahi signal hai ki table chhoti pad rahi hai.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — hashed vs cuckoo vs expiry',
      project: '28-tiktok',
      exercise: 'ex1',
      goal: '10 lakh users ke liye teen tables banao aur gino: kitne users kisi anjaan ke saath taste share karte hain, aur expiry se kitni memory bachti hai.',
      why: `<code>tools/embeddings.js</code> asli hash functions se table bharta hai. Har embedding 16 floats
        (64 bytes) — asli mein kuch sau hote hain, ratio wahi rehta hai.`,
      steps: [
        { text: 'Tool chalao.', cmd: 'cd docker-labs/28-tiktok && node tools/embeddings.js', expect: 'A) fixed-size hashed table\n   table  1000000 rows ( 61 MB):  63.2% users kisi aur ke saath row share karte hain\nB) cuckoo hash table (load 50%, 2 jagah per key)\n   table 2000000 rows (122 MB): 0% sharing (har user ki apni row), avg dhakke 0.27, sabse lambi chain 366, fail 0\nC) expiry — 30 din se inactive users hatao\n   372,554 / 1,000,000 users pichhle 30 din mein aaye → table 61 MB → 23 MB (63% memory bachi)' },
        { text: 'Users 20 lakh karke dekho — ratios wahi, par cuckoo ki chain?', cmd: 'node tools/embeddings.js --users 2000000', expect: '   table  2000000 rows (122 MB):  63.2% users kisi aur ke saath row share karte hain\n   table 4000000 rows (244 MB): 0% sharing (har user ki apni row), avg dhakke 0.27, sabse lambi chain 501, fail 1' },
      ],
      observe: {
        q: 'Fixed table mein users jitni hi rows hon (1:1), tab bhi 63% users share kyun karte hain?',
        choices: [
          'Hash random jagah deta hai — kuch rows mein 2-3 aa jaate hain aur kuch khaali rehti hain (birthday problem). 1:1 ka matlab "har ek ki apni" nahi',
          'Hash function kharab hai',
          'Table chhoti hai',
          'Users duplicate hain',
        ],
        answer: 0,
        explain: 'Random jagah = takraav pakka. 1 − 1/e ≈ 63% — isi liye collision-free ke liye cuckoo jaisa structure chahiye.',
      },
      lesson: 'Collision ka nuksaan error nahi, chupchaap giri hui quality hai. Isliye "har user ki apni row" ek design faisla hai.',
    },
  ],
  interview: {
    title: 'Interview Round — embedding tables',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Embedding table memory bahut kha rahi hai. Kya karoge?"',
        choices: [
          'Expiry (inactive users hatao, wapas aane par dobara seekho) + frequency filter (ek-baar wale ko table mein mat daalo) — table ko sirf zinda users jitna rakho',
          'Table chhoti karke hash karo',
          'Embedding size aadha kar do sabka',
          'Purane users ka data delete kar do hamesha ke liye',
        ],
        answer: 0,
        explain: 'Hash karke chhota karna collisions laata hai — quality chupchaap girti hai.',
      },
      {
        q: 'Interviewer: "Cuckoo hashing ka ek risk?"',
        choices: [
          'Load 50% ke paas displacement chains lambi ho jaati hain — insert dheema/fail; isliye load limit rakho aur zaroorat par table badhao',
          'Lookup dheema hai',
          'Collisions hote hain',
          'Sirf strings par chalta hai',
        ],
        answer: 0,
        explain: 'Lab mein average 0.27 dhakke, par sabse lambi chain 366 — yahi warning sign hai.',
      },
    ],
  },
  success: [
    'Main embedding table ke collisions ka chupa nuksaan samjha sakta hoon',
    'Main cuckoo insert ke kadam bata sakta hoon',
    'Main expiry + frequency filter se memory bounded rakh sakta hoon',
  ],
  homework: `<p>Apne system mein koi bhi "hash karke fixed buckets" wali cheez dhoondho — rate limiter
    buckets, feature hashing, cache shards. Poochho: agar do alag cheezein ek bucket mein gir gayin toh
    kya chupchaap galat hoga? Wahan collision ka nuksaan likho.</p>`,
  cards: [
    { front: 'Fixed-size embedding table ka nuksaan?', back: 'Hash collisions: do users ek row share → model dono ko ek insaan samajhta hai → quality chupchaap girti hai. Lab: 1:1 rows par bhi 63% share.' },
    { front: 'Cuckoo hashing?', back: 'Har key ki do jagah; bhari ho toh purane ko uski dusri jagah dhakelo. Collision-free, lookup 2 jagah. Load ~50% ke paas chains lambi.' },
    { front: 'Expiry + frequency filter?', back: 'Expiry: N din inactive → row hatao, wapas aane par dobara seekho (lab: 63% memory bachi). Frequency filter: kam interactions wale ko table mein daalo hi mat.' },
  ],
},

/* =====================================================================
   3. tt-pipeline
   ===================================================================== */
{
  id: 'tt-pipeline',
  icon: '🔗',
  title: 'Training example ka safar — pipeline hi asli kaam',
  badge: 'Join Jaadugar',
  objectives: [
    'Features aur action alag waqt par aate hain — streaming join',
    'Window: kab "negative" maan lein, aur late actions ka kya',
    'Training aur serving ko alag rakho, beech mein sync',
    'Relaxed consistency — speed ke liye kya chhodna padta hai',
  ],
  lesson: [
    `<h3>🧩 Ek example, do hisse, do waqt</h3>
     <p>Training example = <b>features</b> (video dikhate waqt kya pata tha: category, creator, us pal ki
     popularity) + <b>action</b> (poora dekha? 2 sec mein scroll? like? share?). Features turant log hote
     hain; action 1–30 second baad aata hai (rewatch ho toh aur baad mein).</p>
     <pre>Kafka topic 1: features  (recommendation id ke saath, dikhate waqt)
Kafka topic 2: actions   (jab user kuch kare)
Flink join:    features ko recommendation id se cache karo → action aaye toh jodo → example
Window:        tay waqt tak action nahi aaya → NEGATIVE ("dekha nahi") emit karo</pre>
     <p>Video ki line: <b>"model standard hai; pipeline mushkil hai."</b></p>
     <h3>⏱️ Window ka dilemma (lab 28 ka asli run)</h3>
     <pre>window    positive   negative   LATE (galat negative)
  500 ms      130       1870          746 (85.2%)
 2000 ms      695       1305          163 (19.0%)
 9000 ms      902       1098            0 (0.0%)    ← par memory ~5×, aur example 9 sec der se</pre>
     <p>Chhoti window: model jaldi seekhta hai, par 85% positives "user ko pasand nahi aaya" ban gaye —
     <b>galat sabak</b>. Badi window: labels sahi, par der aur memory. Beech ka raasta + late actions ke
     liye correction.</p>`,
    `<h3>🧪 Training alag, 🚀 serving alag</h3>
     <p>Training model lagatar badalta hai — messy, adhoora, experiment wala. Serving model ko har request
     200 ms se kam mein, bharose se, arabon baar jawab dena hai. Dono ek hi cheez hon toh video ki line
     lagti hai: <b>"serving ki reliability ki nichli hadd, training ke experiment ki upari hadd ban jaati
     hai."</b></p>
     <p>Isliye do alag parameter server groups, aur beech mein <b>parameter sync</b> har kuch minute:
     sirf jaanche hue params serving tak. Training gire toh serving purane params se jawab deta rehta
     hai — <b>bharosemand hissa kabhi bharose-kam hisse par synchronously depend nahi karta</b>.</p>
     <h3>🐢 Relaxed consistency</h3>
     <p>Hazaron training workers. Agar har update strict order mein ho, sab sabse dheeme worker ki raftaar
     se chalenge — real-time khatam. Isliye workers kuch second purane params par gradient nikaal lete
     hain, aur parameter servers strict ordering enforce nahi karte. ML ka nuksaan chhota; speed hi toh
     poora point hai.</p>
     <p class="tip">🎯 Strict consistency tab sahi jab speed maayne na rakhe. Yahan speed hi product hai —
     toh jaan-boojh ke consistency chhodi. <b>Tay karo ki kaunsi consistency chhod rahe ho.</b></p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Join window chuno',
      instructions: 'Window aur late-correction badlo — dekho labels kitne sahi aur model kitna taaza.',
      goal: 'Galat negatives <b>10% se kam</b>, example ki der <b>5 sec se kam</b>, aur joiner memory <b>limit (1,300) ke andar</b>.',
      scenario: `Actions ka delay: 80% ka 0.2–2 sec, 20% ka 2–8 sec. Tum join window aur "late action
        aaye toh correction bhejo" tay karte ho.`,
      knobs: [
        { id: 'win', label: 'Join window (sec)', min: 0.5, max: 10, step: 0.5, value: 0.5, unit: ' s', note: 'Itni der action ka intezaar, phir negative.' },
        { id: 'fix', label: 'Late action par correction (0 = nahi, 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Late positive aaye toh trainer ko "pichhla negative galat tha" bhejo.' },
      ],
      readouts: k => {
        const m = joinModel(k);
        return [
          { label: 'Galat negatives (positives ka %)', value: m.wrong + '%', tone: m.wrong < 10 ? 'ok' : 'bad' },
          { label: 'Example trainer tak kitni der mein', value: m.delay + ' s', tone: m.delay < 5 ? 'ok' : 'bad' },
          { label: 'Joiner memory (pending examples)', value: m.mem + '', tone: m.mem <= 1300 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = joinModel(k);
        return [
          { label: 'Galat negatives', pct: m.wrong, text: m.wrong + '%', tone: m.wrong < 10 ? 'ok' : 'bad' },
          { label: 'Memory', pct: Math.min(100, m.mem / 16), text: m.mem + '', tone: m.mem <= 1300 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = joinModel(k);
        if (m.wrong >= 10) return { ok: false, text: `<b>${m.wrong}%</b> positives galat label ke saath trainer tak — model ulta seekh raha hai. Window badhao ya late correction chalu karo.` };
        if (m.delay >= 5) return { ok: false, text: `Labels sahi, par example <b>${m.delay} sec</b> der se — "real-time" ka faayda ghat raha hai.` };
        if (m.mem > 1300) return { ok: false, text: `Joiner <b>${m.mem}</b> pending examples pakde baitha hai — memory limit paar.` };
        return { ok: true, text: `Window <b>${k.win} s</b> + late correction: galat negatives <b>${m.wrong}%</b>, der <b>${m.delay} s</b>, memory <b>${m.mem}</b>. Jaldi seekho, galti baad mein sudhaaro.` };
      },
      check: k => { const m = joinModel(k); return m.wrong < 10 && m.delay < 5 && m.mem <= 1300; },
      lesson: `Window akela dono cheezein nahi de sakta — chhota = galat labels, bada = der + memory.
        <b>Late correction</b> hi beech ka raasta kholta hai.`,
      quiz: {
        q: 'Late correction na ho toh chhoti window ka asli nuksaan?',
        choices: [
          'Positives ko negative bol diya — model sikhta hai ki user ko woh pasand nahi aaya jo use pasand aaya tha',
          'Memory zyada lagti hai',
          'Example der se aata hai',
          'Koi nuksaan nahi',
        ],
        answer: 0,
        explain: 'Galat label galat sabak hai — aur woh chupchaap hota hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — streaming join aur window',
      project: '28-tiktok',
      exercise: 'ex2-join',
      goal: '2,000 impressions, 45% asli positives, delayed actions — alag-alag window par labels kitne sahi?',
      why: `<code>services/joiner.js</code> features ko recommendation id se pakad ke rakhta hai; action aaya →
        positive; window khatam → negative; window ke baad action → <b>LATE</b> (label galat ja chuka).`,
      steps: [
        { text: 'Joiner chalao.', cmd: 'cd docker-labs/28-tiktok && npm start ex2-join', expect: 'ex2-join\n[joiner] :5051 window=3000 ms' },
        { text: 'Chaar windows par stream chalao.', cmd: 'node tools/stream.js', expect: '  500 ms      130       1870          746 (85.2%)              876                321\n 2000 ms      695       1305          163 (19.0%)              858                917\n 5000 ms      796       1204           94 (10.6%)              890                1516\n 9000 ms      902       1098            0 (0.0%)              902                1472' },
      ],
      observe: {
        q: '5 sec window par bhi 10.6% galat negatives kyun?',
        choices: [
          '20% actions 2–8 sec mein aate hain — unme se 5 sec ke baad wale (~10%) window chook jaate hain',
          'Joiner mein bug hai',
          'Network slow hai',
          'Positive hi kam the',
        ],
        answer: 0,
        explain: 'Window hamesha delay distribution ki poonch kaatti hai. Poonch ka ilaaj correction hai, anant window nahi.',
      },
      lesson: 'Streaming join ka faisla = labels ki sachchai vs model ki taazgi vs memory. Teeno ek saath dekho.',
    },
  ],
  interview: {
    title: 'Interview Round — real-time training pipeline',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Training cluster crash ho gaya. Users ko kya dikhega?"',
        choices: [
          'Kuch nahi badlega — serving alag parameter servers se purane (aakhri synced) params par jawab deta rahega; bas model thoda kam taaza',
          'Feed band ho jaayegi',
          'Random videos dikhenge',
          'Error page',
        ],
        answer: 0,
        explain: 'Training aur serving ke beech buffer (sync) isi liye hai.',
      },
      {
        q: 'Interviewer: "Features aur actions ko kaise jodoge?"',
        choices: [
          'Do topics; recommendation id se stream join, window ke baad negative emit, late actions ke liye correction, aur unmatched features ko age-out',
          'Raat ko dono tables ka SQL join',
          'Client hi dono ek saath bheje',
          'Actions ko features ke bina train karo',
        ],
        answer: 0,
        explain: 'Raat ka join = batch. Client par bharosa = action baad mein hota hai, features pehle.',
      },
    ],
  },
  success: [
    'Main features + actions ka streaming join design kar sakta hoon',
    'Main join window ka trade-off numbers se samjha sakta hoon',
    'Main training/serving split aur relaxed consistency ka tark de sakta hoon',
  ],
  homework: `<p>Apne system mein koi aisi jagah dhoondho jahan "event A" aur "event B" alag waqt par aate
    hain aur unhe jodna padta hai (order + payment, click + conversion, request + response log). Likho:
    window kitni hai, late event par kya hota hai, aur galat join ka nuksaan kise hota hai.</p>`,
  cards: [
    { front: 'TikTok training example ke do hisse?', back: 'Features (dikhate waqt, turant) + action (1–30 sec baad). Do Kafka topics, Flink join recommendation id se.' },
    { front: 'Join window ka trade-off (lab)?', back: '500 ms: 85% positives galat negative. 9 sec: 0% galat par der + ~5× memory. Ilaaj: beech ki window + late correction.' },
    { front: 'Training aur serving alag kyun?', back: 'Serving ko bharosemand <200 ms chahiye, training messy experiment hai. Beech mein param sync; training gire toh serving purane params par chalta rahe.' },
    { front: 'Relaxed consistency kyun?', back: 'Strict ordering = sab sabse dheeme worker ki speed se. Kuch second purane params par gradient chalta hai — ML nuksaan chhota, speed hi point hai.' },
  ],
},

/* =====================================================================
   4. tt-ranking
   ===================================================================== */
{
  id: 'tt-ranking',
  icon: '🎯',
  title: 'Arabon videos se 20 tak — ranking aur angoothe ke signal',
  badge: 'Angootha Padhne Wala',
  objectives: [
    'Do-kadam serving: candidate generation → fine ranking',
    'Multi-objective score — business weights se product chalana',
    'Implicit signals (completion, rewatch) vs explicit (like)',
    'Is poore system ki operational keemat',
  ],
  lesson: [
    `<h3>🪜 200 ms mein arabon ko score nahi kar sakte</h3>
     <p>Har request par arabon videos ko bhaari model se score karna namumkin. Isliye do kadam:</p>
     <ol>
       <li><b>Candidate generation (retrieval)</b> — arabon se kuch sau, tez aur andaaze se. TikTok ka
       <b>Deep Retrieval</b>: ek learned tree jo user embedding se candidates tak le jaata hai.</li>
       <li><b>Fine ranking</b> — un kuch sau par bhaari model: kitna chance hai ki user dekhega, like,
       share, comment karega, poora dekhega.</li>
     </ol>
     <h3>⚖️ Multi-objective score</h3>
     <p>Aakhri score in sab predictions ka <b>weighted sum</b> hai, business weights ke saath: share ≈
     5× like; lambi video ka poora dekhna chhoti se zyada. Product team weights badal ke diversity,
     quality, kam repetition jaisi cheezein chala sakti hai — <b>model retrain kiye bina</b>.</p>`,
    `<h3>👍 Like jhooth bol sakta hai, angootha nahi</h3>
     <table>
       <tr><th>Signal</th><th>Matlab</th></tr>
       <tr><td>15 sec video poori dekhi</td><td>Mazboot haan</td></tr>
       <tr><td>10 sec mein se 7 sec</td><td>Lagbhag utna hi mazboot</td></tr>
       <tr><td>15 mein se 1 sec, scroll</td><td>Mazboot na</td></tr>
       <tr><td>Rewatch</td><td>Kam hota hai — isliye bahut bhaari weight</td></tr>
       <tr><td>Scroll ki speed, pause, comments kholna, creator profile</td><td>Dense chhote signals</td></tr>
     </table>
     <p>Implicit signals <b>ghane</b> hain (ek session mein hazaron), explicit (like) <b>virle</b>. Video
     ki line: <b>"mind nahi padh raha, angootha padh raha hai."</b></p>
     <h3>💸 Keemat</h3>
     <ul>
       <li>Online learning loop, collisionless tables, streaming joins — sab TensorFlow ke primitives se
       khud banaya aur hamesha maintain karna.</li>
       <li>Lagatar training = lagatar tootne wala system: training crash, sync lag, Kafka backlog, Flink
       drops — sab automatic pakadna aur theek karna, warna quality chupchaap girti hai.</li>
       <li><b>Reproducibility gayi</b>: 5 minute pehle jo model galat recommend kar raha tha, woh ab hai
       hi nahi — incident ka root cause dhoondhna mushkil.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa signal kitna bharosemand?',
      instructions: 'Har signal ko sahi dabbe mein daalo.',
      bins: [
        { id: 'strongpos', label: '💚 Mazboot haan' },
        { id: 'strongneg', label: '💔 Mazboot na' },
        { id: 'weak', label: '🤷 Kamzor / virla' },
      ],
      items: [
        { text: '15 sec ki video poori dekhi', bin: 'strongpos', explain: 'Completion sabse bharosemand implicit signal hai.' },
        { text: 'Video dobara (rewatch) dekhi', bin: 'strongpos', explain: 'Rewatch kam hota hai — isliye bahut bhaari weight.' },
        { text: '1 sec mein scroll kar diya', bin: 'strongneg', explain: 'Angootha ne turant na bola.' },
        { text: 'Like kiya', bin: 'weak', explain: 'Explicit par virla — aur kabhi-kabhi sirf aadat. Implicit se kam ghana.' },
        { text: 'Video share ki', bin: 'strongpos', explain: 'Share virla hai par bahut mazboot — isi liye multi-objective mein ~5× like.' },
        { text: 'App khula chhod ke chale gaye, video loop mein chalti rahi', bin: 'weak', explain: 'Watch time lamba par bharosa kam — isliye pause, interaction jaise saath ke signals dekhne padte hain.' },
      ],
    },
    {
      type: 'estimate',
      title: 'Napkin math — kyun do kadam?',
      goal: 'Numbers se dekho ki ek kadam mein sabko score karna kyun namumkin hai.',
      problems: [
        {
          q: '1 arab videos, ek fine-ranking score = 10 microseconds. Ek request par sab videos ko score karne mein kitne SECOND?',
          unit: 'second', given: ['1,00,00,00,000 videos', '10 µs per score'],
          answer: 10000, tol: 0.3,
          steps: ['1e9 × 10e-6 s = 10,000 s', '≈ 2.8 ghante — ek swipe ke liye!'],
          lesson: 'Budget 200 ms hai. Isliye pehle kuch sau candidates.',
        },
        {
          q: '500 candidates × 10 µs — fine ranking mein kitne MILLISECOND?',
          unit: 'ms', given: ['500 candidates', '10 µs per score'],
          answer: 5, tol: 0.3,
          steps: ['500 × 10 µs = 5,000 µs', '= 5 ms — budget mein aaram se'],
          lesson: 'Retrieval sasta aur andaaze wala, ranking mehenga aur sahi — dono milke 200 ms mein.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — feed ranking',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Product chahta hai feed mein zyada diversity. Model retrain karoge?"',
        choices: [
          'Pehle multi-objective weights/rules se — diversity ya repetition penalty score mein jodo; retrain ki zaroorat nahi, turant A/B test',
          'Haan, naya model diversity ke liye',
          'Random videos mix kar do',
          'Users se poochho',
        ],
        answer: 0,
        explain: 'Multi-objective scoring isi liye hai: product ke knobs bina retrain.',
      },
      {
        q: 'Interviewer: "Likes kam hain, toh model kya seekhega?"',
        choices: [
          'Implicit signals — completion rate, rewatch, scroll speed — ghane aur fake karna mushkil; likes sirf ek virla signal',
          'Kuch nahi, likes chahiye',
          'Users ko like karne ke liye force karo',
          'Sirf popular videos dikhao',
        ],
        answer: 0,
        explain: '"Mind nahi, angootha padh raha hai."',
      },
    ],
  },
  success: [
    'Main two-stage retrieval + ranking ka tark numbers se de sakta hoon',
    'Main implicit aur explicit signals ki taakat samjha sakta hoon',
    'Main online learning system ki operational keemat bata sakta hoon',
  ],
  homework: `<p>Apne product ki kisi list (search results, feed, recommendations) ke liye likho: (1)
    candidate kahan se aate hain aur kitne? (2) ranking kin signals se hoti hai — kitne implicit, kitne
    explicit? (3) agar product "X zyada dikhao" bole toh kya retrain chahiye ya ek weight?</p>`,
  cards: [
    { front: 'Serving ke do kadam?', back: 'Candidate generation (arabon → kuch sau, tez andaaza; TikTok: Deep Retrieval tree) → fine ranking (bhaari model, multi-objective score).' },
    { front: 'Multi-objective score ka faayda?', back: 'Watch, like, share, completion ka weighted sum (share ≈ 5× like). Product weights badal ke feed chala sakta hai — bina retrain.' },
    { front: 'Implicit vs explicit signals?', back: 'Implicit (completion, rewatch, scroll speed) ghane aur fake karna mushkil; explicit (like) virle. "Angootha padh raha hai."' },
  ],
},
]);

/* Toy model — lab 28 ke delay distribution se (80%: 0.2–2 s, 20%: 2–8 s) */
function joinModel(k) {
  const w = k.win;
  const fracShort = w >= 2 ? 1 : Math.max(0, (w - 0.2) / 1.8);
  const fracLong = w <= 2 ? 0 : Math.min(1, (w - 2) / 6);
  const missed = 0.8 * (1 - fracShort) + 0.2 * (1 - fracLong);
  const wrong = Math.round(100 * missed * (k.fix ? 0.25 : 1));      // correction 3/4 galat labels sudhaar deta hai (baad mein)
  const delay = +(w + (k.fix ? 0.3 : 0)).toFixed(1);
  const mem = Math.round(150 * w + (k.fix ? 250 : 0));
  return { wrong, delay, mem };
}

})();
