/* =====================================================================
   "System Design and Architecture" playlist (Software Developer Diaries) — BATCH 1: resilience
   User ka niyam: topic pehle se app mein hai → purana level BADHAO (SD.extendLevel); naya level sirf naye topic ka.
     resil/retries     ← #46 retry short, #49 retries + jitter, #55 retry storm, #60 (randomness) — lab 37
     resil/breaker     ← #19 circuit breaker — lab 38
     resil/bulkhead    ← #43 noisy neighbour — lab 39
     resil/backpressure← #27 backpressure — lab 15 (ex3-streams, ex4-chat)
     resil/replication ← #59 disaster recovery tiers — lab 40
     flow/networking   ← #60 random load balancing — lab 41
     resil/chaos (NAYA, slo ke baad) ← #60 Chaos Monkey — lab 42
     resil/observability ← #12 health endpoints (poora lab KubeGurukul ke probes level mein) — sirf card
   Har number docker-labs ke ASLI run se (README mein wahi output). ⚠️ data-ext-episodes.js ke BAAD load ho.
   ===================================================================== */
(function () {

/* =====================================================================
   1. resil/retries — jitter, storm, layers (lab 37)
   ===================================================================== */
SD.extendLevel('retries', {
  objectives: [
    '<b>Asli naap (lab 37):</b> 200 clients — bina jitter 120 ne haar maani, jitter ke saath 0–1 · retry storm ne service 5 baar giraya · har layer par retry = 27×',
  ],
  lesson: [
    `<h3>🎲 Jitter, storm aur 27 guna — asli naap (lab 37)</h3>
     <p><b>Misaal:</b> railway reservation ka counter 10 baje khula. 200 log ek saath pahunche, counter ek waqt mein 10 ko hi le sakta hai.
     "Sab log theek 5 minute baad wapas aana" (backoff, bina jitter) → 5 minute baad phir wahi 190 ki bheed. "Har koi 0 se 5 minute ke
     beech kabhi bhi aaye" (jitter) → bheed bikhar jaati hai aur counter lagatar chalta hai.</p>
     <pre>200 clients ek saath · gateway ek waqt mein 10 charges · har client max 8 koshish
turant (bina ruke)          → 148 ne haar maani
exp backoff, bina jitter    → 120 ne haar maani, aakhri charge 5.3 s
exp ±20% (Kafka jaisa)      →   0 ne haar maani, 3.5 s
full jitter                 →   1, 2.5 s
equal jitter                →   0, 2.7 s    (hamesha ek floor intezaar)
decorrelated jitter         →   1, 2.1 s    (sabse kam calls: 782)</pre>
     <p>(Random wali lines har run mein thodi badalti hain; "bina jitter" wali line har run mein wahi aati hai.)</p>
     <ol>
       <li><b>Retry storm:</b> service crash → 2 s mein restart → saari atki retries ek saath → phir crash. Lab: turant retry = <b>5 crash</b>,
         har user action par 19.5 calls. Backoff + jitter + 3 koshish ka cap → sirf pehla crash.</li>
       <li><b>Server ki taraf se bachav:</b> bhare hone par crash ki jagah <code>503 + Retry-After</code> — naive clients ne bhi header maana,
         27 requests shed, <b>0 doosra crash, 0 user errors</b>.</li>
       <li><b>Retry budget:</b> retries ≤ asli requests ka 10% → bina backoff ke bhi storm nahi (AWS SDK retry quota, Envoy retry budget).
         Keemat: budget khatam hote hi user ko error.</li>
       <li><b>Layers:</b> client, A, B teeno "3 koshish" → C band ho toh C par <b>27×</b>. Chhoti gadbad (30%) mein wahi setup sirf 1.36×
         dikhta hai — isi liye har team laga deti hai. Retry sirf edge par.</li>
     </ol>
     <table>
       <tr><th>❌ Aam galatfehmi</th><th>✅ Sach</th></tr>
       <tr><td>"1 s, 2 s, 3 s — exponential backoff"</td><td>Woh <b>linear</b> hai. Exponential = 1, 2, 4, 8 s</td></tr>
       <tr><td>"600 ms base: 1,200 ms, phir 1,400 ms"</td><td>600 × 2¹ = 1,200 · 600 × 2² = <b>2,400</b> · 600 × 2³ = 4,800 ms</td></tr>
       <tr><td>"Retry-After 503 aur 420 par"</td><td><b>429</b> (Too Many Requests) aur 503. 420 Twitter ka purana mazaak tha</td></tr>
     </table>
     <p class="tip">🎯 <b>Asli baat:</b> backoff "kab" badhata hai, jitter "sab ek saath" todta hai, cap "kab tak" rokta hai, budget "kitna"
     rokta hai. Chaaron chahiye — aur retry sirf ek layer par.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🔁 Retries</b> (paanch levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 200 clients, ek gateway: kaunsa jitter?',
      project: '37-retries',
      exercise: 'ex1-jitter',
      goal: '200 clients ek hi pal mein charge bhejte hain; gateway ek waqt mein 10. Chhe retry tareeke — kitne haar maante hain, kitni der lagti hai?',
      why: '<code>services/gateway.js</code>: ek waqt mein 10 charges (50 ms har ek), bhara ho toh turant 503. Har client max 8 koshish.',
      steps: [
        { text: 'Gateway chalao.', cmd: 'cd docker-labs/37-retries && npm start ex1-jitter', expect: 'ex1-jitter\n[gateway] :5161 CAP=10 WORK=50ms' },
        { text: 'Chhe tareeke ek ke baad ek.', cmd: 'node tools/jitter.js',
          expect: [
            'tareeka                     gateway par calls   503 mile   charge ho gaye   haar maani   aakhri charge (ms)',
            'turant (bina ruke)               1374         1322           52/200        148            428',
            'exp backoff, bina jitter         1320         1240           80/200        120           5272',
            'exp ±20% (Kafka jaisa)            981          781          200/200          0           3541',
            'full jitter                       996          797          199/200          1           2518',
            'equal jitter                      949          749          200/200          0           2734',
            'decorrelated jitter               782          583          199/200          1           2137',
          ].join('\n') },
      ],
      observe: {
        q: 'Exp backoff (bina jitter) mein intezaar badhta gaya, phir bhi 120 clients ne haar kyun maani?',
        choices: [
          'Sab ek hi pal mein fail hue, isliye sab ek hi pal mein wapas aaye — har lehar mein gateway ne phir sirf 10 liye',
          'Backoff ka cap bahut chhota tha',
          'Gateway ne jaan-boojh ke unhe roka',
          'Network dheema tha',
        ],
        answer: 0,
        explain: 'Backoff intezaar badhata hai, bheed nahi todta. Jitter (random intezaar) se har client alag pal mein aata hai — 0–1 ne haar maani.',
      },
      lesson: 'Retry = backoff + jitter + cap. Jitter ke bina backoff sirf bheed ko aage khiskata hai.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — retry storm aur 3 × 3 × 3',
      project: '37-retries',
      exercise: 'ex2-storm',
      goal: 'Naazuk service t=2s par crash hoti hai. Chaar tarah ke clients — kaun use dobara-dobara girata hai? Phir teen layers ka retry band service par.',
      why: '<code>services/fragile.js</code>: 40 se zyada requests ek saath → crash · 2 s down · 3 s thandi. <code>services/hop.js</code>: A → B → C.',
      steps: [
        { text: 'Naazuk service chalao.', cmd: 'cd docker-labs/37-retries && npm start ex2-storm' },
        { text: 'Chaar client tareeke (har ek ~12 s).', cmd: 'node tools/storm.js',
          expect: [
            'clients ka tareeka                   crash (pehla forced)   theek hua (s)   server par calls   503 (shed)   actions safal   user ko error   calls / action',
            'turant retry, koi limit nahi               5                15.1           20213          0         988/1038          0        19.5',
            'exp backoff + jitter, 3 koshish            1                 7.0            6879          0        5007/5605        598        1.2',
            'turant retry, par Retry-After maano        1                 7.0            8665         27        4787/4787          0        1.8',
            'retry budget (10%), turant                 1                 7.0            6113          0        4990/5994       1004        1.0',
          ].join('\n') },
        { text: 'Teen layers (naya exercise, alag terminal mein `npm start ex3-layers`).', cmd: 'node tools/layers.js',
          expect: [
            '=== C poori tarah band (100% 503) · 100 user requests ===',
            'har layer 3 koshish (client, A, B)        300           900          2700            27×',
            'sirf edge par 3 koshish (client)          300           300           300             3×',
            'koi retry nahi                            100           100           100             1×',
          ].join('\n') },
      ],
      observe: {
        q: '"Turant retry, par Retry-After maano" wale clients bhi turant retry karte the. Phir service doosri baar kyun nahi giri?',
        choices: [
          'Server bhara hone par crash hone ke bajaye 503 + Retry-After: 1 bolta tha, aur clients ne woh maana — restart ke pal sirf 27 requests shed hui',
          'Clients ki ginti kam thi',
          'Service ki capacity zyada thi',
          'Retry-After ne restart tez kar diya',
        ],
        answer: 0,
        explain: 'Load shedding + Retry-After server ki taraf ka bachav hai — client kaisa bhi ho. Crash hone se pehle "baad mein aana" bolna.',
      },
      lesson: 'Storm todne ke teen raaste: client (backoff + jitter + cap), server (shed + Retry-After), budget (retries ≤ 10%). Retry sirf edge par.',
    },
  ],
  interview: [
    { q: 'Interviewer: "Payment gateway rate limit par 429 de raha hai. Humare 1,000 workers exponential backoff se retry karte hain, phir bhi aadhe fail. Kyun?"',
      choices: [
        'Backoff mein jitter nahi — sab workers ek hi pal mein fail hote hain aur ek hi pal mein lautte hain. Full/decorrelated jitter + Retry-After maano + retry cap',
        'Backoff ka base chhota hai',
        'Gateway kharab hai',
        'Workers badha do',
      ],
      answer: 0,
      explain: 'Lab 37: bina jitter 120/200 ne haar maani; kisi bhi jitter ke saath 0–1.' },
  ],
  cards: [
    { front: 'Full jitter vs equal jitter?', back: 'Full: random(0, base × 2ⁿ) — sabse bikhra. Equal: aadha fixed + aadha random — hamesha ek floor intezaar (jab API turant retry na le).' },
    { front: 'Retry storm todne ke teen raaste?', back: 'Client: backoff + jitter + cap · Server: crash se pehle 503 + Retry-After · Budget: retries ≤ asli requests ka ~10%. Lab 37: 5 crash → 1.' },
    { front: 'Har layer par 3 retries — kitna bojh?', back: '3 × 3 × 3 = 27× us service par jo pehle se band hai (lab 37). Retry sirf edge par, andar turant fail.' },
  ],
});

/* =====================================================================
   2. resil/breaker — kisko bachata, kya ginta, khulne ke baad (lab 38)
   ===================================================================== */
SD.extendLevel('breaker', {
  objectives: [
    '<b>Asli naap (lab 38):</b> timeout A ko bachata hai, breaker A aur B dono ko · 4xx gine toh breaker khud outage · naive reset aur sirf trial calls dono flapping, slow start se theek',
  ],
  lesson: [
    `<h3>🔌 Breaker ke teen sawaal — asli naap (lab 38)</h3>
     <p><b>Misaal:</b> ghar ka MCB. Short circuit par trip hota hai taaki wiring na jale. Par MCB har us baar trip ho jab koi galat switch
     dabaaye (4xx), toh poora ghar andhere mein. Aur bijli aate hi saare AC ek saath on kiye (naive half-open) toh MCB turant phir trip.</p>
     <ol>
       <li><b>Kisko bachata hai?</b> B ka <code>/recs</code> latka (har call 5 s), A ke 20 workers:
         <pre>koi bachav nahi     → /profile (B se koi matlab nahi) p99 9.2 s, 360/600 error
sirf timeout 300 ms → /profile theek, par latke B par 300 calls → B 3 baar bojh se gira
timeout + breaker   → /profile theek, B par sirf 30 calls, B ek baar bhi nahi gira</pre></li>
       <li><b>Kya gino?</b> Purane app version ki kharab requests par B 400 deta tha (B theek tha). 4xx bhi failure gina → breaker khula →
         naye app ke users ko 90 mein se 3 price mile. Sirf 5xx + timeout gina → 90/90. Aur <code>/recs</code> band, <code>/price</code> theek:
         poore B ka ek breaker → <code>/price</code> bhi band (144/150 roki); har endpoint ka alag → 0 roki.</li>
       <li><b>Khulne ke baad?</b> B thanda uthta hai (pehle 3 s mein kam bojh jhel sakta hai), A par 200 req/s:
         <pre>naive: timer → seedha closed     → B 3 baar phir gira, breaker 7 baar khula
half-open: 3 trial calls         → B 3 baar phir gira, 7 baar khula (naive jitna hi bura; trials sirf "zinda hai?" poochhte hain)
trials + slow start (3 s ramp)   → B 0 baar gira, 7.0 s par theek, 6× zyada live jawab</pre></li>
     </ol>
     <table>
       <tr><th>❌ Aam galatfehmi</th><th>✅ Asli state machine</th></tr>
       <tr><td>Closed → <b>half-open</b> → open; half-open mein "aadhi requests"</td>
           <td>Closed → <b>OPEN</b> (failure rate hadd se upar) → timer khatam → HALF-OPEN (kuch trial calls) → safal: CLOSED (behtar: slow start ke saath) · ek fail: phir OPEN</td></tr>
     </table>
     <p class="tip">🎯 <b>Asli baat:</b> breaker dependency ki <b>bimaari</b> gine (5xx, timeout, connection error), har <b>resource</b> ka alag
     ho, aur band hone ke baad traffic <b>dheere</b> lautaye. Fallback ki seedhi: doosra replica → cache (lab mein /home cache se chalta
     raha) → default. Apne hi process ke andar ke calls par breaker nahi, aur har HTTP call par bhi nahi — sirf bahar ki dependencies par.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🔌 Circuit Breaker</b> (paanch levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — B latka: A ka unrelated endpoint kyun mara?',
      project: '38-circuit-breaker',
      exercise: 'ex1-cascade',
      goal: 'B ka /recs 6 second ke liye latak jaata hai. Koi bachav nahi, sirf timeout, aur timeout + breaker — A ke /profile ka kya hua, aur B ka?',
      why: '<code>services/a.js</code>: 20 workers ka pool (Java threads jaisa), breaker (20 calls mein ≥ 50% fail → 2 s open), cache fallback. <code>services/b.js</code>: /recs latak / band ho sakta hai.',
      steps: [
        { text: 'A aur B chalao.', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex1-cascade', expect: 'ex1-cascade\n[B] :5172\n[A] :5171 → B http://localhost:5172' },
        { text: 'Teen tareeke (har ek 12 s).', cmd: 'node tools/cascade.js',
          expect: [
            'tareeka                     /profile p50   /profile p99   /profile error   /home: live / cache / error   latke B ko calls   B bojh se gira   B theek → live wapas     A ki line (max)',
            'koi bachav nahi                 10 ms      9226 ms        360/600       241 /    0 / 359               41              0      run khatam tak nahi           200',
            'sirf timeout (300 ms)            7 ms         9 ms          0/600       107 /  493 / 0                300              3                  1140 ms           0',
            'timeout + circuit breaker        7 ms         9 ms          0/600       243 /  357 / 0                 30              0                  1120 ms           0',
          ].join('\n') },
      ],
      observe: {
        q: 'Sirf timeout ke saath A bach gaya (/profile theek). Phir breaker kyun chahiye?',
        choices: [
          'Timeout ke saath bhi A latke B par 300 calls phenkta raha — B par latki requests jama hui aur B 3 baar gira. Breaker ne calls 30 kar di aur B bacha',
          'Timeout se /profile dheema tha',
          'Breaker timeout se tez hai',
          'Breaker ke bina cache nahi chalta',
        ],
        answer: 0,
        explain: 'Timeout A ko bachata hai, breaker B ko bhi — bimaar dependency ko saans lene ka waqt deta hai.',
      },
      lesson: 'Pehle timeout (A ke workers bachao), phir breaker (B ko bachao), aur fallback (user ko kuch toh dikhao).',
    },
    {
      type: 'docker',
      title: '🐳 Lab — kya gino, aur khulne ke baad kya',
      project: '38-circuit-breaker',
      exercise: 'ex3-half-open',
      goal: 'Do galtiyan jo breaker ko hi outage banati hain (4xx ginna, ek breaker poore B ke liye) — phir teen half-open niyam thande B par.',
      steps: [
        { text: 'A aur B chalao.', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex3-half-open' },
        { text: 'Kya gino, kiske liye.', cmd: 'node tools/counting.js',
          expect: [
            'breaker kya ginta hai               naye app ki price requests   safal   breaker ne roki   breaker khula (baar)',
            '4xx bhi failure                                90               3           87               3',
            'sirf 5xx + timeout                             90              90            0               0',
            'breaker kiske liye                  price requests   safal   breaker ne roki   /home: cache se',
            'poore B ka ek breaker                     150          6          144           150',
            'har endpoint ka alag breaker              150        150            0           150',
          ].join('\n') },
        { text: 'Half-open ke teen niyam.', cmd: 'node tools/halfopen.js',
          expect: [
            'half-open niyam                    B phir gira (bojh se)   B poora theek (s)   /home: live / cache   breaker khula (baar)',
            'naive: timer → seedha closed               3                19.6            269 / 2531            7',
            'half-open: 3 trial calls                   3                19.9            283 / 2517            7',
            'trials + slow start (3 s ramp)             0                 7.0           1666 / 1134            2',
          ].join('\n') },
      ],
      observe: {
        q: 'Half-open ke 3 trial calls safal hue, breaker band hua — phir bhi B 3 baar kyun gira (naive reset jitna hi)?',
        choices: [
          'Trials sirf "B zinda hai?" poochhte hain. Band hote hi poora 200 req/s ek saath thande B par — B abhi garam nahi hua tha',
          'Trial calls ne B ko thaka diya',
          'Breaker ka timer galat tha',
          'A ka pool chhota tha',
        ],
        answer: 0,
        explain: 'Isi liye slow start: band hone ke baad 3 s mein 10% → 100% traffic (Envoy / load balancers ka slow start mode). Lab: sirf trials → B 3 baar gira (19.9 s), trials + slow start → 0 baar (7.0 s).',
      },
      lesson: 'Breaker 5xx/timeout gine, har endpoint ka alag ho, aur band hone ke baad traffic dheere lautaye.',
    },
  ],
  interview: [
    { q: 'Interviewer: "Ek purana mobile app version galat requests bhej raha hai (400s). Usi din humara breaker khul gaya aur sab users ko error. Kyun?"',
      choices: [
        'Breaker 4xx ko bhi failure gin raha tha — client ki galti ko dependency ki bimaari samjha. Sirf 5xx, timeout, connection error gino',
        'Dependency sach mein down thi',
        'Breaker ka threshold chhota tha',
        'Mobile app ko block karo',
      ],
      answer: 0,
      explain: 'Lab 38: 4xx gine → naye app ke 87/90 price requests roki; sirf 5xx gine → 90/90.' },
  ],
  cards: [
    { front: 'Timeout vs circuit breaker?', back: 'Timeout A ke workers bachata hai. Breaker bimaar B par calls rok ke B ko bhi bachata hai (lab 38: 300 vs 30 calls, B 3 baar vs 0 baar gira).' },
    { front: 'Breaker kya gine?', back: '5xx, timeout, connection error. 4xx nahi (client ki galti). Aur har endpoint / resource ka alag breaker.' },
    { front: 'Half-open ke baad slow start kyun?', back: 'Trials "zinda hai?" poochhte hain, "poora bojh utha sakta hai?" nahi. Lab 38: naive 3 baar phir gira, sirf trials bhi 3 baar, trials + slow start 0.' },
  ],
});

/* =====================================================================
   3. resil/bulkhead — noisy neighbour (lab 39)
   ===================================================================== */
SD.extendLevel('bulkhead', {
  objectives: [
    '<b>Noisy neighbour (lab 39):</b> ek line mein shaant tenants 40% fail · quota bachata hai par capacity bekaar · fair queuing dono · autoscale ki trigger window · batch job ka bulkhead',
  ],
  lesson: [
    `<h3>🔊 Padosi ka shor — asli naap (lab 39)</h3>
     <p><b>Misaal:</b> ek hi ATM ke saamne line. Ek dukaandaar apne 50 cards leke aaya aur sab ek ke baad ek chala raha hai. Baaki log bas
     ₹500 nikaalne aaye the — par sab uske peeche. Galti kisi ki nahi, bas line ek hi thi.</p>
     <p>Shared service: 4 workers = 200 req/s. Tenant A t=2–7s par 400 req/s; B aur C shaant (30 req/s har ek):</p>
     <pre>niyam                         B+C p50   p99       error      A: safal / 429 / 503
ek line (FIFO)                  93 ms   1031 ms    233/578      1376 /    0 / 790
har tenant quota 80/s           22 ms    322 ms      0/580       721 / 1453 / 0
fair queuing (baari-baari)      24 ms     41 ms      0/580      1046 /    0 / 1121</pre>
     <ol>
       <li><b>Ek line:</b> A ki bheed ne line bhar di → B, C ki <b>40% requests fail</b>, jinhone kuch galat nahi kiya.</li>
       <li><b>Quota (throttling):</b> B, C bach gaye — par A ke 1,453 requests 429 se laute jabki machine mein jagah thi.</li>
       <li><b>Fair queuing:</b> har tenant ki apni line, workers baari-baari → B, C ka p99 41 ms <b>aur</b> A ko quota se zyada (1,046).</li>
       <li><b>Autoscale kaafi?</b> Naye workers t=10.1 s par aaye — tab tak ki <b>trigger window</b> mein B, C ki 354/472 fail (75%).
         Fair queuing ke saath: 0. Isolation pehle, autoscale uske upar.</li>
       <li><b>Cleanup cron din mein chal gaya</b> (100 ms ke chunks): users ki line mein → user p50 ~20 → 141 ms · low priority → 42 ms
         (chalta chunk rok nahi sakte) · low priority + <b>max 1 worker</b> → 22 ms (batch ka bulkhead) · off-peak → kam log prabhavit.</li>
     </ol>
     <p class="tip">🎯 <b>Asli baat:</b> noisy neighbour bulkhead ka hi sawaal hai — "ek tenant / ek kaam kitna le sakta hai?" Kubernetes mein
     yahi requests/limits aur QoS classes (Guaranteed / Burstable / BestEffort) hain — KubeGurukul ka Scheduler level.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🔊 Noisy Neighbour</b> (paanch levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek tenant ka shor, sabki neend kharab',
      project: '39-noisy-neighbor',
      exercise: 'ex1-fairness',
      goal: 'Shared service par ek shor karne wala tenant aur do shaant. FIFO vs quota vs fair queuing; phir autoscale ki trigger window; phir din mein chala cleanup job.',
      why: '<code>services/shared.js</code>: 4 workers × 20 ms = 200 req/s. Policy <code>POST /config</code> se. Tools open-loop load bhejte hain (jaise asli users).',
      steps: [
        { text: 'Service chalao.', cmd: 'cd docker-labs/39-noisy-neighbor && npm start ex1-fairness', expect: 'ex1-fairness\n[shared] :5181 · 4 workers × 20 ms' },
        { text: 'Teen niyam (har ek 10 s).', cmd: 'node tools/tenants.js',
          expect: [
            'niyam                         B+C (shaant) p50   p99       error      A: safal / 429 / 503',
            'ek line (FIFO)                   93 ms   1031 ms    233/578      1376 /    0 / 790   (A ne bheje 2166)',
            'har tenant quota 80/s            22 ms    322 ms      0/580       721 / 1453 / 0   (A ne bheje 2174)',
            'fair queuing (baari-baari)       24 ms     41 ms      0/580      1046 /    0 / 1121   (A ne bheje 2167)',
          ].join('\n') },
        { text: 'Autoscale ki trigger window.', cmd: 'node tools/autoscale.js',
          expect: [
            'setup                          naye workers kab   B+C error (scale se pehle / baad)   B+C p99 (pehle / baad)   A safal / bheje',
            'ek line + autoscale               t=10.1s           354/472  /    0/342                1032 ms / 513 ms         3500 / 4171',
            'fair queuing, autoscale nahi   kabhi nahi             0/814  /    -                  41 ms / -         2162 / 4168',
            'fair queuing + autoscale          t=10.1s             0/470  /    0/346                  39 ms / 32 ms         3058 / 4183',
          ].join('\n') },
        { text: 'Cleanup job din mein.', cmd: 'node tools/batch.js',
          expect: [
            'job kab / kaise                          users p50 (job ke dauraan)   users p99   users error   job khatam hone mein',
            'peak par, users ki line mein                 141 ms                 166 ms        0/1070    10 s mein 189/300',
            'peak par, low priority                        42 ms                 100 ms        0/1073    10 s mein 184/300',
            'peak par, low priority + max 1 worker         22 ms                  24 ms        0/1068    10 s mein 100/300',
            'off-peak par (users 20 req/s)                 73 ms                 119 ms        0/164     8.4 s',
          ].join('\n') },
      ],
      observe: {
        q: 'Autoscale ne naye workers t=10.1 s par de diye. Phir bhi ek line wale setup mein B aur C ki 354/472 requests kyun fail hui?',
        choices: [
          'Bheed t=2 s par aayi, naye workers 8 s baad (3 s pehchaan + 5 s boot) — us trigger window mein ek line A ne bhar rakhi thi',
          'Autoscaler kharab tha',
          'B aur C ne quota tod diya',
          'Naye workers dheeme the',
        ],
        answer: 0,
        explain: 'Autoscale hamesha der se aata hai. Fair queuing ne window ko bekaar kiya: B, C ko 0 error — scale se pehle bhi.',
      },
      lesson: 'Tenants ko alag lines (fair queuing) ya quotas; batch job ko concurrency cap; autoscale uske upar — uske badle nahi.',
    },
    {
      type: 'bins',
      title: 'Noisy neighbour — kaunsa ilaaj?',
      instructions: 'Har situation ke liye sabse theek pehla ilaaj chuno.',
      bins: [
        { id: 'fair', label: '⚖️ Fair queuing / per-tenant line' },
        { id: 'quota', label: '🚦 Per-tenant quota (429)' },
        { id: 'cap', label: '🧵 Batch ka concurrency cap / low priority' },
      ],
      items: [
        { text: 'Ek tenant kabhi-kabhi burst karta hai; baaki ko tez jawab chahiye, par machine khaali ho toh burst wale ko bhi do', bin: 'fair', explain: 'Fair queuing khaali capacity burst wale ko deta hai, par shaant tenants ki line alag rehti hai (lab: B+C p99 41 ms, A ko 1,046).' },
        { text: 'Free plan wale tenants contract se 100 req/s tak hi le sakte hain', bin: 'quota', explain: 'Yeh business ka niyam hai — quota (token bucket) + 429 + Retry-After.' },
        { text: 'Raat ka fraud-cleanup job galti se din mein chal gaya', bin: 'cap', explain: 'Low priority + max 1 worker → users ko pata bhi nahi chala (lab: 22 ms), job dheema chala.' },
        { text: 'Ek bada customer ne API se 10 lakh records ek saath maang liye, baaki customers dheeme ho gaye', bin: 'fair', explain: 'Us customer ki requests uski apni line mein — dheema sirf wahi hoga.' },
        { text: 'Report export har tenant ek din mein sirf 5 baar chala sakta hai', bin: 'quota', explain: 'Mehnga operation, gini hui ijaazat — quota.' },
        { text: 'Search index rebuild peak hours mein bhi chalana zaroori hai', bin: 'cap', explain: 'Rebuild ko gine chune workers do (bulkhead) — users ka hissa surakshit.' },
      ],
    },
  ],
  cards: [
    { front: 'Noisy neighbour ke teen ilaaj (lab 39)?', back: 'Quota (bachata, par capacity bekaar) · fair queuing (shaant p99 41 ms + burst wale ko bacha hissa) · batch ka concurrency cap.' },
    { front: 'Autoscale noisy neighbour ka ilaaj hai?', back: 'Akele nahi — trigger window (pehchaan + boot, lab mein 8 s) mein 75% errors. Pehle isolation, phir autoscale.' },
  ],
});

/* =====================================================================
   4. resil/backpressure — chaar raaste, Node streams, frontend (lab 15 ex3/ex4)
   ===================================================================== */
SD.extendLevel('backpressure', {
  objectives: [
    '<b>Chaar raaste (lab 15 ex3/ex4):</b> control, buffer (hamesha bounded), drop, ignore — Node streams ka <code>write()</code>/<code>drain</code> aur frontend chat ki bheed',
  ],
  lesson: [
    `<h3>☕ Chaar raaste — aur code mein kaise dikhte hain (lab 15)</h3>
     <p><b>Misaal:</b> chai ki tapri. Chai banane wala (producer) dugni raftaar se cup bhar raha hai, bartan dhone wala (consumer) aadhi
     raftaar se. Chaar raaste: banane wale ko bolo "ruk ja" (<b>control</b>) · gande cup ka dher lagne do — par jagah limited (<b>buffer</b>) ·
     kuch cup phenk do (<b>drop</b>) · kuch mat karo, jab pata ho ki dher kabhi jagah se bada nahi hoga (<b>ignore</b>).</p>
     <pre>ex3 — tez reader → dheema writer (~16 MB/s), 120 MB:
write() ka jawab nazarandaaz     writer mein 120 MB jama · extra memory 129 MB · 8.5 s
pause() / drain par resume()     writer mein   1 MB jama · extra memory  44 MB · 8.0 s
stream.pipeline()                writer mein   1 MB jama · extra memory  49 MB · 7.9 s

ex4 — chat: 5,000 messages/s, ek message 0.2 ms + har DOM update par 1 ms layout, 60 fps:
har message turant               61 fps · click 1 ms   · chat 4.1 s peeche, 20,892 line mein
frame mein ek baar, sab           5 fps · click 341 ms · har frame bhaari → aur bhaari
frame mein ek baar, naye 20      47 fps · click 7 ms   · 11 ms purana, 80% chhode</pre>
     <ol>
       <li><b>Control:</b> Node mein <code>write()</code> <b>false</b> lautaye toh <code>reader.pause()</code>, writer <code>'drain'</code> kare toh
         <code>resume()</code> — ya seedha <code>pipeline(reader, writer)</code>. Raftaar wahi (sabse dheemi kadi ki), bas RAM nahi bharti.</li>
       <li><b>Buffer:</b> hamesha hadd ke saath. "Har message turant" wale page mein kuch toot-ta nahi dikhta — bas line bina hadd badhti hai.</li>
       <li><b>Drop:</b> jab data chhodna manzoor ho (chat, telemetry samples) — sabse sasta ilaaj. Koi insaan 5,000 messages/s padh bhi nahi sakta.</li>
       <li><b>Ignore:</b> tabhi jab producer ki raftaar pata ho aur buffer ki hadd saabit ho. Warna yeh "unbounded queue" ka doosra naam hai.</li>
     </ol>
     <p class="tip">🎯 <b>Asli baat:</b> backpressure kaam dheema nahi karta — kaam ki raftaar hamesha sabse dheemi kadi ki thi. Backpressure bas yeh
     tay karta hai ki farak <b>kahan</b> jama ho: producer ke ruk-ne mein, hadd wali line mein, ya phenke gaye data mein.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🌊 Backpressure</b> (paanch levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — Node streams aur chat ki bheed',
      project: '15-backpressure',
      exercise: 'ex3-streams',
      goal: 'Tez reader, dheema writer: write() ka jawab nazarandaaz vs drain vs pipeline() — memory dekho. Phir 5,000 messages/s wali chat teen tareekon se dikhao.',
      why: 'Dono sirf tools hain — koi service nahi chalani. <code>tools/streams.js</code> har mode alag process mein chalata hai taaki memory ka hisaab saaf rahe.',
      steps: [
        { text: 'Streams — teen tareeke.', cmd: 'cd docker-labs/15-backpressure && node tools/streams.js',
          expect: [
            'tareeka                               writer mein sabse zyada jama   process ki extra memory (peak)   kul samay',
            'write() ka jawab nazarandaaz                120 MB                    129 MB                8.5 s',
            'pause() / drain par resume()                  1 MB                     44 MB                8.0 s',
            'stream.pipeline()                             1 MB                     49 MB                7.9 s',
          ].join('\n') },
        { text: 'Chat — teen tareeke.', cmd: 'node tools/chat.js',
          expect: [
            'tareeka                            fps   sabse lamba frame   click ki der (p99)   message kitna purana dikha (p99)   dikhaye / chhode / abhi line mein',
            'har message turant (apna layout)    61        18 ms              1 ms              4131 ms                     4098 / 0 / 20892',
            'frame mein ek baar, sab              5       390 ms            341 ms               406 ms                     23060 / 0 / 0',
            'frame mein ek baar, naye 20         47        22 ms              7 ms                11 ms                     4720 / 20155 / 100',
          ].join('\n') },
      ],
      observe: {
        q: 'Teeno streams modes ~8 s mein khatam hue. Toh write() ka jawab maanne se kya bacha?',
        choices: [
          'RAM — nazarandaaz karne par poori 120 MB file writer ki line mein jama hui; drain/pipeline mein 1 MB. Badi file par process out-of-memory se marta',
          'Samay — drain wala tez tha',
          'CPU — pipeline kam CPU leta hai',
          'Kuch nahi, teeno barabar hain',
        ],
        answer: 0,
        explain: 'Raftaar hamesha dheeme writer ki thi (~16 MB/s). Backpressure sirf yeh tay karta hai ki farak RAM mein jama hoga ya producer rukega.',
      },
      lesson: 'Node mein pipeline() use karo; frontend mein har frame ek hadd (aur baaki chhodo ya "+N aur" dikhao).',
    },
  ],
  cards: [
    { front: 'Node streams mein backpressure?', back: 'write() false → reader.pause(); writer "drain" → resume(). Ya pipeline(reader, writer). Lab 15: nazarandaaz karne par 120 MB jama, drain/pipeline mein 1 MB.' },
    { front: 'Chat mein 5,000 messages/s — kya karein?', back: 'Har frame ek hadd (jaise naye 20), baaki chhodo. Lab 15: 47 fps, 11 ms purana. "Sab dikhao" → 5 fps; "har message turant" → chat 4 s peeche.' },
  ],
});

/* =====================================================================
   5. resil/replication — disaster recovery ki chaar seedhiyan (lab 40)
   ===================================================================== */
SD.extendLevel('replication', {
  objectives: [
    '<b>Disaster recovery (lab 40):</b> backup & restore → pilot light → warm standby → active-active — RTO, RPO aur region B ka idle kharcha',
  ],
  lesson: [
    `<h3>🌪️ Region gaya — ab kitni der, kitna data? (lab 40)</h3>
     <p><b>Misaal:</b> dukaan jal gayi. (1) Sirf bahi-khate ki photocopy doosre shehar mein — nayi dukaan kiraye par lo, saaman lao, likhna
     shuru karo: <b>ghante</b>. (2) Godaam mein saaman taiyaar, par shutter band — kholo, staff bulao: <b>das-bees minute</b>. (3) Doosri chhoti
     dukaan chalu, ek staff — grahak bhejo, staff badhao: <b>kuch minute</b>. (4) Do poori dukaanen dono chalu: <b>turant</b> — aur dugna kiraya.</p>
     <ul>
       <li><b>RTO</b> (Recovery Time Objective) = kitni der mein wapas chalu. <b>RPO</b> (Recovery Point Objective) = kitna data khona manzoor.</li>
       <li>Business Continuity Plan (sabse bada) ⊃ Disaster Recovery Plan · Incident Response Plan sirf cyber attacks ke liye.</li>
     </ul>
     <p>50 orders/s, t=4s par region A khatam (health check 500 ms × 3 = 1.5 s mein pata):</p>
     <pre>strategy                  aam din region B mein                  RTO     fail orders   "ho gaya" par kho gaye
backup & restore          sirf S3 snapshots (har 3 s)            16.3 s      680          50
pilot light               DB (replica) chalu, app band            6.4 s      283           5
warm standby              DB + chhota app (25%)                   4.0 s      112           5
multi-site active-active  poora region, aadha traffic             1.5 s       36           3</pre>
     <p>(Teen run: RTO 16.3–16.4 / 6.4–6.5 / 4.0–4.5 / 1.0–1.5 s; kho gaye 50 / 5 / 5 / 2–3.)</p>
     <p>(Samay chhota kiya: lab ke 15 s provisioning = asli ghante. Kram aur kaaran asli.)</p>
     <ol>
       <li><b>RTO kisse banta hai?</b> Pata chalna (1.5 s) + region B ko jo banana / boot / scale karna ho.</li>
       <li><b>RPO kisse?</b> Aakhri snapshot se ab tak (50 orders) — ya replication ka lag (2–5). Async mein zero ka bharosa nahi.</li>
       <li><b>Warm standby ki chhupi keemat:</b> chhota app → scale-up ke 3 s tak aadhe orders fail.</li>
       <li><b>Replication ≠ backup ≠ versioning:</b> galat DELETE replication se region B tak bhi pahunchta hai (lab 32). S3 versioning purana
         version rakhti hai; backup account compromise se nahi bachata — woh security ka alag kaam hai.</li>
     </ol>
     <p class="tip">🎯 <b>Asli baat:</b> pehle business se RTO/RPO likhwao, phir sabse sasti strategy chuno jo usme fit ho — aur use saal mein
     do baar sach mein chala ke dekho (game day). Jo failover kabhi chala nahi, woh chalega bhi nahi.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — region A khatam: chaar DR strategies',
      project: '40-disaster-recovery',
      exercise: 'ex1-dr-tiers',
      goal: '50 orders/s chal rahe hain, t=4s par region A gayab. Chaar strategies mein naapo: kitni der orders fail (RTO), kitne "ho gaya" orders kho gaye (RPO).',
      why: '<code>services/router.js</code> = Route 53 jaisa (health check + failover) + S3 bucket. <code>services/region.js</code> do copies: A (primary), B (DR).',
      steps: [
        { text: 'Router + do regions chalao.', cmd: 'cd docker-labs/40-disaster-recovery && npm start ex1-dr-tiers' },
        { text: 'Chaar strategies (backup wali ~20 s, baaki ~10 s).', cmd: 'node tools/dr.js',
          expect: [
            'strategy                    aam din B mein chalu               fail hote rahe (RTO)   fail orders   "ho gaya" par kho gaye (RPO)',
            'backup & restore            sirf S3 snapshots (har 3 s)            16.3 s             680            50 / 295',
            'pilot light                 DB (replica) chalu, app band            6.4 s             283             5 / 295',
            'warm standby                DB + chhota app (25%)                   4.0 s             112             5 / 370',
            'multi-site active-active    poora region, aadha traffic             1.5 s              36             3 / 331',
          ].join('\n') },
      ],
      observe: {
        q: 'Active-active mein bhi 3 orders kho gaye jinhe "ho gaya" bola ja chuka tha. Kyun?',
        choices: [
          'Replication async hai — A ne order save karke "ho gaya" bola, par woh 300 ms ke lag mein B tak pahunchne se pehle A gayab',
          'Router ne orders gira diye',
          'Region B mein jagah nahi thi',
          'Health check galat tha',
        ],
        answer: 0,
        explain: 'Async replication mein RPO kabhi zero nahi. Zero chahiye toh har write par doosre region ka intezaar (sync / quorum) — har order par ek poora cross-region RTT.',
      },
      lesson: 'RTO = pata chalna + banana/boot/scale. RPO = snapshot ka antar ya replication lag. Kharcha ulta chalta hai.',
    },
    {
      type: 'bins',
      title: 'Kaunsi DR strategy?',
      instructions: 'Business ki zaroorat dekh kar sabse sasti theek strategy chuno.',
      bins: [
        { id: 'backup', label: '💾 Backup & restore' },
        { id: 'pilot', label: '🕯️ Pilot light' },
        { id: 'warm', label: '🔥 Warm standby' },
        { id: 'active', label: '🌍 Active-active' },
      ],
      items: [
        { text: 'Company ki andar ki wiki — ek din band rahe toh chalega', bin: 'backup', explain: 'RTO ghante chalega → sirf snapshots, region B mein kuch nahi chalana.' },
        { text: 'Raat ka analytics batch — kal subah tak data chahiye', bin: 'backup', explain: 'Dobara chala sakte ho; ghante ka RTO theek.' },
        { text: 'B2B SaaS — contract mein 1 ghanta RTO, 5 minute RPO', bin: 'pilot', explain: 'DB replica chalu (RPO chhota), app band (kharcha kam), failover par boot.' },
        { text: 'E-commerce checkout — kuch minute ka outage bardasht, par us se zyada nahi', bin: 'warm', explain: 'Chhota app pehle se chalu — minutes mein serve, phir scale.' },
        { text: 'Payments / trading — seconds ka outage bhi karodon ka', bin: 'active', explain: 'Dono regions hamesha serve karte hain. Sabse mehnga — aur conflicts ka hisaab bhi chahiye.' },
        { text: 'Global app jiske users do mahadweepon mein hain — latency bhi ghatani hai', bin: 'active', explain: 'Geo-routing se dono regions pehle se kaam aate hain; DR muft mein.' },
      ],
    },
  ],
  interview: [
    { q: 'Interviewer: "Humara DR plan: raat ko backup doosre region mein. Region gaya toh kitni der mein wapas?"',
      choices: [
        'Ghante — region B mein kuch chal hi nahi raha: machines, DB, network banana + restore. RPO = aakhri backup se ab tak ka data. RTO/RPO business se poochh ke pilot light / warm standby socho',
        'Minutes, backup tez hota hai',
        'Turant, cloud khud failover karta hai',
        'Kabhi nahi, backup se region wapas nahi aata',
      ],
      answer: 0,
      explain: 'Lab 40: backup & restore — RTO 16.3 s (asli: ghante), 50 orders kho gaye; pilot light 6.4 s / 5; active-active 1.5 s / 3.' },
  ],
  cards: [
    { front: 'RTO vs RPO?', back: 'RTO = kitni der mein wapas chalu. RPO = kitna data khona manzoor. Dono business tay karta hai, phir sabse sasti strategy jo fit ho.' },
    { front: 'DR ki chaar seedhiyan (sasti → mehngi)?', back: 'Backup & restore (ghante) → pilot light (DB chalu, app band) → warm standby (chhota app chalu) → active-active (dono poore). Lab 40: RTO 16.3 / 6.4 / 4.0 / 1.5 s.' },
  ],
});

/* =====================================================================
   6. flow/networking — load balancing algorithms (lab 41)
   ===================================================================== */
SD.extendLevel('networking', {
  objectives: [
    '<b>Load balancing algorithms (lab 41):</b> round robin, random, least connections, resource-based, power of two choices — dheema backend aur purani jaankari par kaun tik-ta hai',
  ],
  lesson: [
    `<h3>🎯 Request kis server par jaaye? (lab 41)</h3>
     <p><b>Misaal:</b> toll plaza ke 5 counter. Round robin = har gaadi agle counter par. Random = aankh band karke koi bhi. Least connections =
     jiski line abhi sabse chhoti. Resource-based purani jaankari par = 5 minute purani CCTV dekh ke "sabse khaali" — aur saari gaadiyan usi
     par. Power of two choices = koi do counter dekho, unme se chhoti line wala.</p>
     <pre>5 backends (4 workers), 90% requests 10 ms + 10% 200 ms, 300 req/s:
                                    sab ek jaise              backend 5 teen guna dheema
                                    p99      sabse lambi line  p99       sabse lambi line
round robin                          204 ms       9           3000 ms        113
random                               204 ms      12           2865 ms        150
least connections (apni ginti)       204 ms       0            205 ms          1
resource-based (heartbeat 500 ms)    629 ms      92           2202 ms        123   ← herding
power of two choices (500 ms)        246 ms      29            494 ms         25
power of two choices (apni ginti)    204 ms       1            602 ms          2</pre>
     <ol>
       <li><b>Sab machines ek jaisi:</b> round robin / random theek (random sasta hai: koi ginti nahi rakhni padti).</li>
       <li><b>Ek machine dheemi</b> (kharab disk, noisy neighbour VM): round robin / random dheeme backend ko barabar hissa dete rehte hain → round robin ka p99 1.8–3.0 second (teen run).
         Least connections khud sambhalta hai — dheeme par requests der tak andar rehti hain, ginti badi dikhti hai.</li>
       <li><b>Purani jaankari par "sabse kam load":</b> sab ek hi "sabse khaali" ko chunte hain → wahi backend bhar jaata hai → agli baar doosra. Ginti mein
         har backend ko lagbhag barabar milta hai (476 / 486 / 485 / 464 / 489) — par dher mein: ek ki line 92–106. Ise <b>herding</b> kehte hain.</li>
       <li><b>Power of two choices:</b> do random mein se behtar — herding nahi, har baar saare backends dekhne ki zaroorat nahi. Envoy
         (<code>LEAST_REQUEST</code>, 2 choices) aur NGINX (<code>random two least_conn</code>) yahi karte hain.</li>
     </ol>
     <table>
       <tr><th>❌ Aam galatfehmi</th><th>✅ Sach</th></tr>
       <tr><td>"Random sabse accha — normal distribution sab barabar kar deta hai"</td><td>Sirf jab machines aur requests ek jaisi hon. Ek dheemi machine par random ka p99 2.7–3.0 s; least-conn / P2C (apni ginti) 0.2–0.6 s</td></tr>
     </table>
     <p class="tip">👉 Yahi sab slow motion mein, ek-ek request: <b>🛡️ Playlist · 1 Resilience → 🎲 Randomness</b> (chaar levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — chhe load balancing algorithms',
      project: '41-load-balancing',
      exercise: 'ex1-algorithms',
      goal: '5 backends par chhe algorithms: pehle sab ek jaise, phir backend 5 teen guna dheema. Kaun dheeme backend ko pehchaanta hai, kaun purani jaankari par phisalta hai?',
      why: '<code>services/lb.js</code>: <code>POST /config {algo}</code>. Resource-based aur ek P2C backends ki 500 ms purani heartbeat dekhte hain.',
      steps: [
        { text: 'LB + 5 backends chalao.', cmd: 'cd docker-labs/41-load-balancing && npm start ex1-algorithms' },
        { text: 'Dono scenarios (har ek ~1 minute).', cmd: 'node tools/algos.js',
          expect: [
            '=== backend 5 teen guna dheema · 300 req/s · 8 s ===',
            'algorithm                                p50       p99      sabse lambi line   requests har backend (1…5)',
            'round robin                                13 ms   3000 ms        113           480 / 480 / 480 / 480 / 480',
            'random                                     14 ms   2865 ms        150           510 / 489 / 463 / 458 / 480',
            'least connections (LB ki apni ginti)       13 ms    205 ms          1           529 / 572 / 511 / 575 / 213',
            'resource-based (heartbeat 500 ms)         335 ms   2202 ms        123           485 / 485 / 612 / 480 / 338',
            'power of two choices (wahi 500 ms)         14 ms    494 ms         25           552 / 514 / 539 / 509 / 286',
            'power of two choices (LB ki apni ginti)    13 ms    602 ms          2           525 / 565 / 545 / 525 / 240',
          ].join('\n') },
      ],
      observe: {
        q: 'Resource-based ke paas har backend ka load tha, phir bhi resource-based ki sabse lambi line (123) round robin (113) jitni buri kyun rahi?',
        choices: [
          'Load ki jaankari 500 ms purani thi: har request usi backend par gayi jo 500 ms pehle sabse khaali tha — agli heartbeat tak sab usi par (herding)',
          'Heartbeat galat number bhej rahi thi',
          'Backend 5 band tha',
          'Resource-based random chunta hai',
        ],
        answer: 0,
        explain: 'Purani jaankari par "sabse accha" chunna herding banata hai. Power of two choices wahi jaankari par bhi line 123 se 25 kar deta hai (sab ek jaise: 92 se 29).',
      },
      lesson: 'Default: least-request / P2C (LB ki apni taaza ginti). Random / round robin tabhi jab machines aur requests ek jaisi hon.',
    },
  ],
  cards: [
    { front: 'Power of two choices kya hai?', back: 'Do random backends, unme se kam load wala. Herding se bachata hai, saare backends dekhne ki zaroorat nahi. Envoy LEAST_REQUEST, NGINX "random two least_conn".' },
    { front: 'Round robin kab toot-ta hai?', back: 'Ek backend dheema ho (ya requests ka size alag ho) — usse bhi barabar hissa. Lab 41: dheeme backend ki line 91–113; least-conn mein 0–1.' },
  ],
});

/* =====================================================================
   7. resil/observability — health checks (poora lab KubeGurukul mein)
   ===================================================================== */
SD.extendLevel('observability', {
  cards: [
    { front: 'Health check mein DB check karna chahiye?', back: 'Liveness mein kabhi nahi: DB ki gadbad = saare pods restart (lab 43: 3 restart, /orders DB ke 4.0–5.0 s baad theek). Readiness mein shared DB = saare pods ek saath bahar: DB band ke dauraan /home sirf 17.5–19.5% safal. Dono sawaal DB ko na chhuein → /home 100%. Poora topic: 🛡️ Playlist · 1 Resilience → 🩺 Health Checks.' },
  ],
});

/* =====================================================================
   8. NAYA LEVEL resil/chaos — Chaos Engineering (lab 42), slo ke baad
   ===================================================================== */
VISUALS['chaos'] = {
  t: 'Chaos experiment — jaan-boojh kar todo, chhote daayre mein',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Steady state</span><span class="q">"normal" ka number: success rate, p99, orders/min</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Hypothesis</span><span class="q">"ek instance mare toh bhi success ≥ 99.9% rahega"</span></div>
      <div class="dg-rung a"><span class="lv">3</span><span class="cmd">Inject</span><span class="q">🐒 instance maaro · latency daalo · dependency band — chhote blast radius mein</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Observe + abort</span><span class="q">steady state tooti? turant rok do · kami likho · theek karo · dobara</span></div>
    </div>
    <div class="dg-cap">Lab 42: 1 instance 62.3% · 3 instances bina health check 87.4% · + health check 97.1% · + retry 100% — monkey wahi, taiyaari alag.</div>`,
};

SD.registerLevelsAfter('resil', 'slo', [
{
  id: 'chaos',
  icon: '🐒',
  title: 'Chaos Engineering — Jaan-Boojh Kar Todo',
  badge: 'Chaos Chela',
  objectives: [
    'Chaos Monkey kya hai, aur yeh <b>production</b> mein kyun chalaya jaata hai',
    'Chaos experiment ka dhaancha: steady state → hypothesis → inject → observe → abort',
    'Blast radius chhota rakhna, game day, aur "band karo" button',
    'Lab: har redundancy ki kami (health check, retry) monkey kaise pakadta hai',
  ],
  lesson: [
    `<h3>😵 Problem pehle: "humare paas 3 copies hain"</h3>
     <p><b>Misaal:</b> fire drill. Building mein fire extinguisher, emergency exit, alarm — sab lage hain. Par drill kabhi nahi hui. Jis din
     sach mein aag lagi, pata chala exit par taala hai aur alarm ki battery nikli hui thi. Drill ka kaam aag lagana nahi — <b>kami pehle
     dikhana</b> hai.</p>
     <p>Lab 42: 🐒 har 4 s ek random instance maara (2 s mein wapas), 100 req/s:</p>
     <pre>setup                              safal     fail   sabse lamba error ka daur
1 instance                         62.25%     604          2009 ms
3 instances, health check nahi     87.44%     201             0 ms   ← errors bikhre (har teesri request)
3 + health check                   97.13%      46             0 ms
3 + health check + retry          100.00%       0             0 ms</pre>
     <p>(Teen run: health check wale setup mein 44–46 fail, 97.13–97.25% safal. Monkey har setup mein 3 baar maarta hai.)</p>
     <ol>
       <li><b>"3 copies" kaafi thi?</b> Nahi — load balancer mare hue instance ko bhi har teesri request bhejta raha (12.6% fail). Errors bikhre
         hue the, isliye dashboard par "thoda noise" dikhta, users ko error.</li>
       <li><b>Health check ne kya kiya?</b> Mara instance 300–600 ms mein rotation se bahar (do health check, 300 ms ke fasle par) — sirf us window ki requests gayi.</li>
       <li><b>Retry ne?</b> Us window mein bhi fail request doosre instance par → 0 fail.</li>
     </ol>
     <p><b>Chaos Monkey</b> (Netflix): ek scheduler jo kaam ke ghanton mein production ke random instances band karta hai. Maqsad saza nahi —
     engineers ko majboor karna ki har service ek instance ke marne ko jhel sake. Staging mein asli traffic, asli config, asli dependencies
     nahi hote — isliye asli jawab production se hi milta hai.</p>`,
    `<h3>🧪 Experiment ka dhaancha — "todo" nahi, "saabit karo"</h3>
     <ol>
       <li><b>Steady state:</b> "normal" ko number mein likho — success rate, p99, orders per minute (SLO level wale SLIs).</li>
       <li><b>Hypothesis:</b> "ek instance mare toh bhi success ≥ 99.9% rahega." Tootna nahi, <b>tikna</b> saabit karna hai.</li>
       <li><b>Inject:</b> instance band, latency daalo, dependency band, disk bhar do, clock aage — asli duniya ki galtiyan.</li>
       <li><b>Chhota blast radius:</b> pehle staging / ek cell / 1% traffic. Error budget (SLO level) batata hai kitna risk le sakte ho.</li>
       <li><b>Observe + abort:</b> steady state tooti → turant band karo ("stop" button pehle se). Kami likho, theek karo, dobara chalao.</li>
     </ol>
     <table>
       <tr><th>Auzaar</th><th>Kya karta hai</th></tr>
       <tr><td>Chaos Monkey (Netflix)</td><td>random instances band</td></tr>
       <tr><td>Gremlin · AWS Fault Injection Service</td><td>CPU, latency, network, dependency — control ke saath</td></tr>
       <tr><td>LitmusChaos · Chaos Mesh</td><td>Kubernetes par pods / network / IO faults</td></tr>
       <tr><td>Game day</td><td>team milkar ek failure chalati hai aur runbook jaanchti hai</td></tr>
     </table>
     <p class="tip">🎯 <b>Asli baat:</b> resilience ka har pattern (health check, retry, breaker, bulkhead, failover) sirf tab tak "hai" jab tak koi
     use chala ke na dekhe. Chaos engineering usi ka regular imtihaan hai — chhote daayre mein, abort button ke saath.</p>
     <p class="tip">👉 Yahi topic problem se code tak, slow motion mein: <b>🛡️ Playlist · 1 Resilience → 🐒 Chaos Engineering</b> (chaar levels).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — chaos monkey: kaunsi kami pakdi?',
      project: '42-chaos',
      exercise: 'ex1-monkey',
      goal: 'Monkey har 4 s ek random instance maarta hai. Chaar setup: 1 instance, 3 bina health check, + health check, + retry — success rate naapo.',
      why: '<code>services/lb.js</code>: round robin + (optional) health check har 300 ms + (optional) retry doosre instance par. <code>tools/monkey.js</code> = 🐒.',
      steps: [
        { text: 'LB + 3 app instances chalao.', cmd: 'cd docker-labs/42-chaos && npm start ex1-monkey' },
        { text: 'Chaar setup (har ek 16 s).', cmd: 'node tools/monkey.js',
          expect: [
            'setup                              safal          fail   sabse lamba error ka daur   monkey ne maara',
            '1 instance                         62.25%      604          2009 ms             #1 #1 #1',
            '3 instances, health check nahi     87.44%      201             0 ms             #1 #3 #3',
            '3 + health check                   97.13%       46             0 ms             #2 #1 #1',
            '3 + health check + retry          100.00%        0             0 ms             #2 #1 #3',
          ].join('\n') },
      ],
      observe: {
        q: '3 instances the, phir bhi bina health check 201 requests (12.6%) fail kyun hui?',
        choices: [
          'Load balancer mare hue instance ko bhi round robin mein har teesri request bhejta raha — use pata hi nahi tha ki instance mara hai',
          'Baaki do instances bhi dheeme ho gaye',
          'Monkey ne teeno ek saath maare',
          'Retry ki wajah se bojh badha',
        ],
        answer: 0,
        explain: 'Redundancy tabhi kaam ki jab koi mare hue ko pehchaane (health check) aur fail request ko doosre par bheje (retry). Monkey ne dono kami dikha di.',
      },
      lesson: 'Chaos ka kaam kami dikhana hai: har setup "kaam karta hai" jab tak kuch toote nahi.',
    },
    {
      type: 'order',
      title: 'Chaos experiment — sahi kram',
      instructions: 'Ek achhe chaos experiment ke kadam sahi kram mein lagao.',
      steps: [
        { text: 'Steady state ko number mein likho (success rate, p99, orders/min)', explain: 'Bina "normal" ke number ke pata hi nahi chalega ki kuch toota.' },
        { text: 'Hypothesis likho: "ek instance mare toh success ≥ 99.9% rahega"', explain: 'Maqsad tikna saabit karna hai, tootna nahi.' },
        { text: 'Blast radius chuno: staging / ek cell / 1% traffic, aur abort button taiyaar', explain: 'Error budget batata hai kitna risk manzoor hai.' },
        { text: 'Failure inject karo (instance band, latency, dependency band)', explain: 'Asli duniya jaisi galti — sabse aam wali se shuru.' },
        { text: 'Steady state dekho — tooti toh turant abort', explain: 'Experiment kabhi incident nahi banna chahiye.' },
        { text: 'Kami likho, theek karo, experiment dobara chalao (phir dheere-dheere automate)', explain: 'Jo kami mili woh ab regression test hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Chaos ki samajh',
      questions: [
        { q: 'Chaos Monkey production mein kyun, staging mein kyun nahi?', choices: ['Staging mein asli traffic, config aur dependencies nahi hote — asli jawab production se milta hai (chhote blast radius ke saath)', 'Production sasta hai', 'Staging mein monkey nahi chalta', 'Netflix ke paas staging nahi tha'], answer: 0, explain: 'Shuruaat staging / game day se theek hai; par asli bharosa production ke chhote, kaabu wale experiments se aata hai.' },
        { q: 'Experiment ke beech steady state toot gayi (success 97%). Kya karo?', choices: ['Turant abort, kami likho, theek karke dobara', 'Experiment poora hone do', 'Blast radius badhao', 'SLO badal do'], answer: 0, explain: 'Chaos experiment kabhi incident nahi banna chahiye — abort button pehle se.' },
        { q: 'Lab 42 mein "3 instances, health check nahi" ke errors "sabse lamba error ka daur 0 ms" kyun dikhate hain?', choices: ['Errors lagatar nahi, bikhre hue the — har teesri request (round robin) mare instance par', 'Koi error nahi tha', 'Monkey ne kuch nahi maara', 'Health check chal raha tha'], answer: 0, explain: 'Bikhre errors dashboards par "noise" jaise dikhte hain — isi liye yeh kami chhup jaati hai. Success rate dekho, sirf spikes nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Chaos Engineering',
    instructions: 'SRE / platform round. 🎤',
    questions: [
      { q: 'Interviewer: "Humare paas har service ke 3 replicas hain. Chaos engineering ki zaroorat kyun?"',
        choices: [
          'Replicas hona aur replicas ka kaam aana alag hai — bina health check / retry ke mara replica bhi traffic khata hai (lab 42: 3 replicas par bhi 12.6% fail). Chaos yahi saabit karta hai',
          'Zaroorat nahi, 3 replicas kaafi hain',
          'Sirf compliance ke liye',
          'Replicas 5 kar do',
        ],
        answer: 0, explain: 'Monkey ne dikhaya: redundancy ka faayda health check + retry ke saath hi.' },
      { q: 'Interviewer: "Pehla chaos experiment kaise shuru karoge?"',
        choices: [
          'Steady state ka number + hypothesis, staging ya ek chhota cell, abort button, sabse aam failure (ek instance band) — phir dheere badhao',
          'Seedha production mein poora region band',
          'Bina bataye friday shaam',
          'Pehle saare tools khareedo',
        ],
        answer: 0, explain: 'Chhota blast radius, saaf hypothesis, turant abort — aur jo seekha use theek karke dobara.' },
    ],
  },
  success: [
    'Main chaos experiment ka dhaancha (steady state → hypothesis → inject → observe → abort) samjha sakta hoon',
    'Main bata sakta hoon ki 3 replicas hone par bhi errors kyun aate hain (lab 42)',
    'Main pehla chhota, surakshit chaos experiment plan kar sakta hoon',
  ],
  homework: `<p>Apne system ka ek "humare paas backup hai" wala hissa chuno (replica, failover, retry, breaker). Ek experiment likho:</p>
    <pre>Steady state : checkout success ≥ 99.9%, p99 &lt; 400 ms
Hypothesis   : payment service ka ek pod mare toh steady state bani rahegi
Blast radius : staging, phir 1 cell / 1% traffic
Inject       : kubectl delete pod &lt;payment-pod&gt;   (ya latency 500 ms)
Abort        : success &lt; 99.5% → turant rok do
Seekha       : …</pre>`,
  cards: [
    { front: 'Chaos Monkey kya hai?', back: 'Netflix ka tool (2011) jo production mein random instances band karta hai — taaki har service ek instance ke marne ko jhelne ke liye bani ho.' },
    { front: 'Chaos experiment ke kadam?', back: 'Steady state (number) → hypothesis ("tikega") → chhota blast radius + abort button → inject → observe / abort → kami theek → dobara.' },
    { front: 'Lab 42 ka sabak?', back: '1 instance 62% · 3 bina health check 87% · + health check 96.9% · + retry 100%. Monkey wahi, taiyaari alag.' },
  ],
},
]);

})();
