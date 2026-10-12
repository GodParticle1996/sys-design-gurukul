/* =====================================================================
   TRACK — 🏢 Real Company Stories · Prime Video: microservices se monolith

   Source: "Why Amazon Gave Up on Microservices" (Akhil Sharma) — Prime Video
   ka March 2023 blog (Video Quality Analysis), aur Werner Vogels ka jawab.
   Docker lab: docker-labs/16-prime-video
   ===================================================================== */
(function () {

VISUALS['prime-boundary-tax'] = {
  t: 'Boundary ka tax = payload × kitni baar',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🎞️ converter (decode)</span><span class="dg-arrow">→ PUT frames →</span>
      <span class="dg-pill gold">🪣 S3</span><span class="dg-arrow">→ GET × har detector →</span>
      <span class="dg-pill">🔍 detectors</span><span class="dg-arrow">↔</span>
      <span class="dg-pill bad">⚙️ Step Functions (har kadam ek transition)</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🛒 Checkout</span>
        <div class="dg-cap">Order id (bytes), ~20 transitions poori zindagi mein. Boundary ka tax = rounding error.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">📺 Har second video</span>
        <div class="dg-cap">Darjanon frames × har detector × har stream, ~4 transitions/sec. Account limit ~5% load par.
          Lab: 100 streams par 0.51× real-time, 22,501 throttled.</div></div>
    </div>`,
};

VISUALS['prime-replicate'] = {
  t: 'Tukde nahi, independence chahiye',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📡 streams</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧭 patla router (stream → copy)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">📦 poori pipeline ki copies (ek process: frames memory mein)</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">1️⃣</span><span class="nl">1 copy, 200 streams</span><span class="ns">0.88× real-time ❌</span></div>
      <div class="dg-node is-good"><span class="ni">2️⃣</span><span class="nl">2 copies</span><span class="ns">1.75× ✅</span></div>
      <div class="dg-node is-good"><span class="ni">4️⃣</span><span class="nl">4 copies</span><span class="ns">3.47× ✅</span></div>
    </div>
    <div class="dg-cap">Models RAM se bade (14.5 GB vs 8 GB)? Dobara microservices nahi — <b>same code, alag config</b>: har copy-type alag detectors
      load kare. "Replication se scale, configuration se specialize."</div>`,
};

VISUALS['prime-when-split'] = {
  t: 'Boundary kya khareedti hai?',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Boundary khareedti hai</span>
        <div class="dg-cap">Ownership — team apna build/deploy/operate kare; alag scaling; chhota blast radius.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">💸 Boundary ki keemat</span>
        <div class="dg-cap">Serialize → network → store → wapas padho → deserialize. Har crossing par. Busiest path par = sabse bada bill.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Prime Video ki pipeline: <b>ek team</b>, sab saath scale — boundaries ne kuch nahi khareeda, sirf kharcha. Vogels:
      "goal monolith ya microservices nahi — woh architecture jo workload ko fit kare."</div>`,
};

SD.registerLevels('stories', [
/* =====================================================================
   1. prime-boundary-tax
   ===================================================================== */
{
  id: 'prime-boundary-tax',
  icon: '📺',
  title: 'Prime Video — jab boundary hi sabse bada bill ho',
  badge: 'Boundary Bill Wala',
  objectives: [
    'Video Quality Analysis: kya aur kyun',
    'Serverless design: converter → S3 → detectors, Step Functions orchestration',
    'Microservice tax = payload size × crossings per second',
    'Lab: 5, 20, 100 streams — "mehenga nahi, pahunch hi nahi paaya"',
  ],
  lesson: [
    `<h3>🏈 Live stream mein pixel toote toh log chale jaate hain</h3>
     <p>Thursday Night Football jaise live streams — ek hi minute mein poori audience. Defects: <b>block corruption</b> (encoder ke
     glitch se pixel ke daabbe), video ruk jaaye par audio chale, audio-video sync khisak jaaye. Customers bug report nahi
     karte, <b>chale jaate hain</b>. Isliye Prime Video ka <b>Video Quality Analysis (VQA)</b> tool streams ko customer ki
     tarah dekhta hai aur detectors (kai ML) defects pakadte hain.</p>
     <h3>🧩 Pehla design — sab serverless</h3>
     <ol>
       <li><b>Media converter</b> — stream → frames + decrypted audio buffers.</li>
       <li><b>Defect detectors</b> — specialists: block corruption, freeze, A/V sync…</li>
       <li><b>Orchestration</b> — AWS <b>Step Functions</b> (managed state machine).</li>
     </ol>
     <p>Har 1 second video: converter decode → frames S3 mein upload → state machine tick → har detector S3 se frames download →
     analyse → report → tick → agla second. Sab managed, chhoti team hafton mein ship. March 2023 ke blog mein: isse
     monolith par gaye, infra bill <b>90% se zyada kam</b>.</p>`,
    `<h3>💥 Kya toota — do jagah</h3>
     <p><b>1. Step Functions</b> — keemat per state transition (~$25 per million — sasta dikhta hai). Har stream ke har second
     par ~4 transitions → 1 ghante ka stream = 3,600 × 4 = hazaron transitions, sab billed. Upar se <b>account limits</b> — expected
     load ke ~<b>5%</b> par takra gaye. Video: <b>"scale par mehenga nahi hua — scale tak pahunch hi nahi paaya."</b> (Step
     Functions checkout jaise business workflow ke liye bana hai: poori zindagi mein ~20 transitions.)</p>
     <p><b>2. S3 par frames</b> — decode ek baar (compute bachao) → frames S3 par → har detector padhe → network, storage aur S3
     requests ka kharcha phoot gaya. "Kharcha gayab nahi hota, jagah badalta hai." Aur 11-nines durability un frames ke liye jinki
     zindagi ~1 second hai — "table ke paar parchi dene ke liye bank ka vault".</p>
     <h3>🧾 Microservice tax</h3>
     <p>Process ke andar handoff = ek pointer, nanoseconds, muft. Boundary ke paar: serialize → network → store (durable,
     replicated) → wapas padho → deserialize. <b>Tax = payload size × kitni baar paar.</b> Order id = rounding error. Video frames
     × har stream × har detector = tabahi. Galti: <b>sabse busy raaste par service boundary</b>.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — boundary ka tax',
      project: '16-prime-video',
      exercise: 'ex1-boundary-tax',
      goal: 'Same kaam — "microservices" (store + orchestrator) vs "mono" (ek process) — 5, 20, 100 streams par real-time rahe ya nahi.',
      why: `Ek second video = 12 frames × 40 KB. <code>micro</code>: converter frames store mein PUT, har detector GET, har kadam par
        orchestrator transition (4 per video-second), account limit 200 transitions/s (asli limit badi — scale chhota, pattern wahi).
        <code>mono</code>: sab ek process mein, frame ek pointer.`,
      steps: [
        { text: 'Store + orchestrator chalao.', cmd: 'cd docker-labs/16-prime-video && npm start ex1-boundary-tax', expect: 'ex1-boundary-tax\nstore → :4861\norchestrator → :4862  (account limit 200 transitions/s)' },
        { text: 'Microservices mode, 5 aur 100 streams.', cmd: 'node tools/pipeline.js --mode micro --streams 5\nnode tools/pipeline.js --mode micro --streams 100', expect: 'mode=micro streams=5:   411 video-seconds in 8.3 s → har stream 9.91× real-time ✅   transitions 1644 (throttled 945)\nmode=micro streams=100: 471 video-seconds in 9.2 s → har stream 0.51× real-time ❌   transitions 1884 (throttled 22501)\n   network par 221 MB likha + 662 MB padha · PUT 5652 GET 16956' },
        { text: 'Monolith mode, 100 streams.', cmd: 'node tools/pipeline.js --mode mono --streams 100', expect: 'mode=mono  streams=100: 1409 video-seconds in 8.0 s → har stream 1.76× real-time ✅' },
      ],
      observe: {
        q: 'Micro mode mein total kaam ~50 video-seconds/sec par kyun atak gaya — chahe streams 5 hon ya 100?',
        choices: [
          'Orchestrator ki limit 200 transitions/s ÷ 4 transitions per video-second = 50 — busiest path par ek managed service ki chhat poore system ki chhat ban gayi',
          'Store dheema tha',
          'Detectors dheeme the',
          'Network full tha',
        ],
        answer: 0,
        explain: '"Pahunch hi nahi paaya" — throttle se pehle hi. Aur har frame 3 baar network par padha gaya.',
      },
      lesson: 'Har boundary ke liye poochho: kitna data paar karta hai aur kitni baar? Busiest path par boundary = sabse bada bill.',
    },
    {
      type: 'estimate',
      title: 'Napkin math — transitions ka hisaab',
      goal: 'Step Functions ka bill khud nikaalo.',
      problems: [
        {
          q: 'Ek stream, 1 ghanta, har second 4 transitions. Kitne transitions?',
          unit: 'transitions', given: ['3,600 sec', '4 per sec'],
          answer: 14400, tol: 0.2,
          steps: ['3,600 × 4 = 14,400 per stream-ghanta'],
          lesson: 'Checkout ki poori zindagi ~20 transitions. Yeh ek ghante mein 720 checkouts jitna.',
        },
        {
          q: '1,000 live streams, 3 ghante ka match. ~$25 per million transitions par kitne DOLLAR?',
          unit: '$', given: ['14,400 per stream-ghanta', '1,000 streams × 3 ghante', '$25 / 10 lakh'],
          answer: 1080, tol: 0.3,
          steps: ['14,400 × 3,000 = 4.32 crore transitions', '43.2 × $25 = $1,080 — sirf orchestration, har match'],
          lesson: 'Aur yeh tab jab limits pehle hi rok na dein. S3 PUT/GET alag.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — boundary cost',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara ML pipeline har frame ko S3 se detectors tak bhejta hai. Bill aasman par."',
        choices: [
          'Busiest path par boundary hatao — decode + detectors ek process mein, frames memory mein; scale ke liye poori pipeline ki copies',
          'S3 ki jagah sasta storage',
          'Frames compress karo',
          'Detectors kam karo',
        ],
        answer: 0,
        explain: 'Prime Video: 90%+ bill kam.',
      },
      {
        q: 'Interviewer: "Step Functions kab sahi hai?"',
        choices: [
          'Business workflows — kam transitions (checkout ~20 poori zindagi), human steps, retries; high-frequency data path ke liye nahi',
          'Hamesha',
          'Kabhi nahi',
          'Sirf video ke liye',
        ],
        answer: 0,
        explain: 'Tool galat nahi tha — galat jagah laga tha.',
      },
    ],
  },
  success: [
    'Main microservice tax ko payload × frequency se naap sakta hoon',
    'Main Prime Video ke do bottlenecks (transitions, S3 frames) samjha sakta hoon',
    'Main lab se "scale tak pahunch hi nahi paaya" dikha sakta hoon',
  ],
  homework: `<p>Apne system ke diagram par har arrow ke saath do number likho: payload size aur calls per second. Sabse bade guna-phal wale
    3 arrows dhoondho — yahi tumhare bill ki badi lines hain. Kya inme se koi same team ke do services ke beech hai?</p>`,
  cards: [
    { front: 'Prime Video VQA ka pehla design?', back: 'Converter → frames S3 mein → har detector S3 se padhe; Step Functions orchestration (~4 transitions/sec/stream).' },
    { front: 'Kya toota?', back: 'Step Functions account limits ~5% load par ("pahunch hi nahi paaya") + S3 par 1-second frames ka network/request kharcha.' },
    { front: 'Microservice tax?', back: 'Payload size × crossings per second. Order id = kuch nahi; video frames × streams × detectors = tabahi. Busiest path par boundary mat rakho.' },
  ],
},

/* =====================================================================
   2. prime-replicate
   ===================================================================== */
{
  id: 'prime-replicate',
  icon: '🧬',
  title: 'Monolith jo copies se scale hota hai',
  badge: 'Copy Karigar',
  objectives: [
    'Ek service, frames memory mein, orchestration = agli line',
    '"Scale ke liye independence chahiye, decomposition nahi"',
    'Same code, alag config — detector subsets',
    'Lab: 200 streams, 1/2/4 copies aur RAM budget',
  ],
  lesson: [
    `<h3>🔧 Fix</h3>
     <p>Converter + saare detectors <b>ek service</b> mein (ECS par). Frames memory mein rehte hain, orchestration ab ek aam control
     flow hai — "agli line".</p>
     <h3>📦 Monolith scale kaise?</h3>
     <p>Streams ek dusre se baat nahi karte — koi cross-stream join nahi, koi shared state nahi, koi coordination nahi. Toh poori
     pipeline ki <b>aur copies</b> chalao; ek patla routing layer stream ko copy par baant de.</p>
     <p class="tip">🎯 <b>"Scalability requires independence, not decomposition."</b> Tukde karna scale ka tareeka nahi; kaam ki
     ikaaiyon ka alag hona hai.</p>
     <pre>lab 16 (ex2-replicate) — 200 streams:
1 copy  (200 streams/copy): 0.88× real-time ❌
2 copies (100 each):         1.75× ✅
4 copies (50 each):          3.47× ✅</pre>`,
    `<h3>🧠 Models RAM se bade ho gaye</h3>
     <p>Detectors ki library badhti gayi; ML model weights RAM mein → ek instance sab nahi rakh sakta. Jawab microservices wapas
     nahi: <b>same code</b>, alag copies <b>alag detector subsets</b> load karein (audio-heavy / video / specialised).</p>
     <pre>6 detectors = 14.5 GB models, instance RAM = 8 GB:
copy-type 1: color-banding (3.5), block-corruption (3)
copy-type 2: av-sync (2.5), freeze (2), caption-sync (2), audio-clipping (1.5)</pre>
     <p><b>"Replication se scale, configuration se specialize."</b> Na classic monolith, na microservices — beech ka grey area.</p>
     <h3>🏆 Asli jeet</h3>
     <p>Bill 90%+ kam — par bada faayda: ab <b>saare</b> streams monitor karna afford ho gaya, sirf ek subset nahi. Maqsad
     economically mumkin ho gaya.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — copies se scale, config se specialize',
      project: '16-prime-video',
      exercise: 'ex2-replicate',
      goal: '200 streams ko 1, 2, 4 copies mein baanto; phir 6 detectors (14.5 GB) ko 8 GB instances mein config se baanto.',
      why: `<code>tools/replicas.js</code> poori mono pipeline ki copies chalata hai aur router streams baant-ta hai. <code>--detectors</code>
        RAM budget ke hisaab se copy-types banata hai (bin packing).`,
      steps: [
        { text: 'Copies ke saath chalao.', cmd: 'cd docker-labs/16-prime-video && node tools/replicas.js --streams 200 --copies 4 --detectors', expect: '200 streams, 1 copies (200 streams har copy): 1414 video-seconds in 8 s → har stream 0.88× real-time ❌\n200 streams, 2 copies (100 streams har copy): 2805 video-seconds in 8 s → har stream 1.75× real-time ✅\n200 streams, 4 copies (50 streams har copy):  5556 video-seconds in 8 s → har stream 3.47× real-time ✅' },
        { text: 'Detector config dekho.', cmd: 'node tools/replicas.js --streams 200 --copies 4 --detectors | tail -3', expect: '6 detectors = 14.5 GB models, instance RAM = 8 GB → sab ek copy mein nahi samaate. Config se baanto:\n  copy-type 1: DETECTORS=color-banding (3.5), block-corruption (3)\n  copy-type 2: DETECTORS=av-sync (2.5), freeze (2), caption-sync (2), audio-clipping (1.5)' },
      ],
      observe: {
        q: '2× copies = lagbhag 2× kaam. Yeh linear scaling kis shart par tiki hai?',
        choices: [
          'Streams independent hain — koi shared state/join/coordination nahi; router sirf baant-ta hai',
          'Copies ek dusre se frames share karti hain',
          'Monolith hamesha linear scale karta hai',
          'Bade instances',
        ],
        answer: 0,
        explain: 'Jahan independence nahi, wahan copies bhi linear nahi hongi.',
      },
      lesson: 'Independent units + patla router = monolith bhi horizontally scale.',
    },
    {
      type: 'quiz',
      title: 'Replication ki samajh',
      questions: [
        {
          q: 'Models RAM mein fit nahi hue toh Prime Video ne kya kiya?',
          choices: [
            'Same code ki copies, par config se alag detector subsets load — dobara services mein nahi toda',
            'Har detector ki alag microservice',
            'Bade instances',
            'Detectors hata diye',
          ],
          answer: 0,
          explain: '"Replication se scale, configuration se specialize."',
        },
        {
          q: 'Bill ke alawa asli jeet kya thi?',
          choices: [
            'Ab saare streams monitor karna afford ho gaya — maqsad hi economically mumkin hua',
            'Deploy tez hue',
            'Team chhoti hui',
            'Latency kam',
          ],
          answer: 0,
          explain: 'Architecture ne product ka dayra badha diya.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — scaling a monolith',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Monolith scale nahi hota, isliye microservices." Sahi?',
        choices: [
          'Nahi — agar kaam ki ikaaiyan independent hain (tenants, streams, jobs), poori pipeline ki copies + router se linear scale; tukde ownership ke liye karo, scale ke liye nahi',
          'Haan, bilkul',
          'Monolith sirf vertically scale',
          'Sirf read replicas se',
        ],
        answer: 0,
        explain: 'Lab: 1 → 4 copies = 0.88× → 3.47×.',
      },
      {
        q: 'Interviewer: "Ek copy mein saare models nahi aate."',
        choices: [
          'Copy-types banao — same binary, config se model subsets; router stream/kaam ko sahi copy-type par bheje',
          'Har model alag service',
          'Model chhote karo sabke',
          'Swap memory',
        ],
        answer: 0,
        explain: 'Bin packing by config.',
      },
    ],
  },
  success: [
    'Main independence aur decomposition ka farq samjha sakta hoon',
    'Main monolith ko copies + router se scale karne ka design de sakta hoon',
    'Main config-based specialization bata sakta hoon',
  ],
  homework: `<p>Apne system mein kaam ki ikaai dhoondho jo doosron se baat nahi karti (ek tenant, ek job, ek file). Kya poora pipeline us
    ikaai ke hisaab se copy karke scale ho sakta hai? Router kitna patla ho sakta hai?</p>`,
  cards: [
    { front: '"Scalability requires independence, not decomposition"?', back: 'Streams independent → poori pipeline ki copies + patla router. Lab: 200 streams, 1 copy 0.88× → 4 copies 3.47×.' },
    { front: 'Models RAM mein nahi aaye toh?', back: 'Same code, config se alag detector subsets (copy-types). "Replication se scale, configuration se specialize."' },
    { front: 'Prime Video ki asli jeet?', back: 'Bill 90%+ kam, aur ab SAARE streams monitor karna afford — maqsad mumkin hua.' },
  ],
},

/* =====================================================================
   3. prime-when-split
   ===================================================================== */
{
  id: 'prime-when-split',
  icon: '✂️',
  title: 'Kab todo, kab jodo — boundary kya khareedti hai',
  badge: 'Boundary Buddhimaan',
  objectives: [
    'Microservices ownership ke liye hain, performance ke liye nahi',
    'Merge ke baad ki keemat',
    'Cloud bill ko architecture diagram par rakho',
    'Vogels ka jawab aur paanch sabak',
  ],
  lesson: [
    `<h3>🔥 Flame war aur Vogels</h3>
     <p>Blog ~6 hafte chupchaap raha, phir internet par jung: "Amazon ne bhi microservices chhod diye!" Amazon CTO Werner Vogels ka
     jawab: maqsad <b>na monolith, na microservices</b> — maqsad woh architecture jo <b>workload ko fit</b> kare.</p>
     <h3>🧾 Boundary kya khareedti hai?</h3>
     <p>Microservices <b>ownership</b> ke baare mein hain: ek team apna build, deploy, operate kare; alag scaling; chhota blast
     radius. Performance ke baare mein nahi. Prime Video ki pipeline: <b>ek team</b>, sab saath scale → boundaries ne kuch nahi
     khareeda, sirf kharcha kiya.</p>
     <p><b>Har boundary ke liye do sawaal:</b> kitna data paar karta hai, aur kitni baar? Aur teesra: yeh boundary kaunsi ownership
     ya independence khareed rahi hai?</p>`,
    `<h3>⚖️ Merge ki keemat (imaandari se)</h3>
     <ul>
       <li><b>Coupled deploys</b> — ek detector badla = sab redeploy; blast radius bada.</li>
       <li><b>Capacity planning wapas</b> — EC2 ka hisaab khud, serverless ka auto-scale nahi.</li>
       <li><b>Kamzor isolation</b> — ek bhookha detector doosron ka CPU/RAM kha sakta hai.</li>
       <li><b>Config ki galtiyan</b> — kaunsi copy kaunse detectors load kare.</li>
     </ul>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Har boundary ki keemat hai: size × frequency.</li>
       <li>Cloud bill ko architecture diagram par rakho — bill ki sabse badi lines = sabse zaroori data flows.</li>
       <li>Serverless seekhne ke liye, dedicated infra jab load predictable ho.</li>
       <li>Wahan todo jahan teams ko independence chahiye.</li>
       <li>Units independent hon toh monolith replication se scale karta hai.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Todo ya saath rakho?',
      instructions: 'Har jodi ke liye — service boundary jayaz hai?',
      bins: [
        { id: 'split', label: '✂️ Todo (boundary kuch khareedti hai)' },
        { id: 'keep', label: '🧱 Saath rakho (boundary sirf kharcha)' },
      ],
      items: [
        { text: 'Payments aur search — alag teams, alag release cadence, alag scaling', bin: 'split', explain: 'Ownership + independent deploy + alag load — boundary ka asli faayda.' },
        { text: 'Video decode aur uske frame analyzers — ek team, har second MBs data', bin: 'keep', explain: 'Prime Video ka case — busiest path, ek team.' },
        { text: 'Checkout aur fraud check — fraud team alag, har order par chhota payload', bin: 'split', explain: 'Chhota payload, kam frequency, alag ownership — tax chhota, faayda bada.' },
        { text: 'Ek hi team ke do functions jo har request par 5 MB JSON paas karte hain', bin: 'keep', explain: 'Bada payload × har request, ownership same — sirf tax.' },
        { text: 'Public API gateway aur internal billing batch', bin: 'split', explain: 'Alag blast radius, alag scaling pattern.' },
      ],
    },
    {
      type: 'archdiff',
      title: 'Is design mein boundary kahan galat hai?',
      instructions: 'Ek image processing app ka design. Chaar boundaries sirf kharcha hain — pakdo.',
      brief: `Ek chhoti team (5 log) photo upload par thumbnails, face blur, watermark aur EXIF strip karti hai. Har kadam
        alag Lambda, beech mein har image S3 par, Step Functions orchestrate karta hai. Bill har mahine dugna.`,
      goal: 'Chaar aisi boundaries pakdo jo busiest path par hain aur kuch nahi khareedti.',
      nodes: [
        { id: 'thumb', label: '🖼️ thumbnail Lambda', sub: 'image S3 se padho, 5 sizes banao, S3 par likho', row: 0 },
        { id: 'blur', label: '🙈 face-blur Lambda', sub: 'original phir S3 se padho, blur, S3 par', row: 0 },
        { id: 'mark', label: '💧 watermark Lambda', sub: 'blurred S3 se padho, watermark, S3 par', row: 1 },
        { id: 'sfn', label: '⚙️ Step Functions', sub: 'har image ke har kadam par transition', row: 1 },
        { id: 'upload', label: '📤 Upload API', sub: 'users se image leta hai, auth, quota', row: 2 },
        { id: 'cdn', label: '🌍 CDN', sub: 'final images users ko serve', row: 2 },
      ],
      flaws: [
        { id: 'blur', why: 'Original ko dobara S3 se padhna — same bytes ek team ke andar do baar network par. Ek process mein decode ek baar, sab kadam memory mein.' },
        { id: 'mark', why: 'Blurred image S3 par likh ke phir padhna — ~1 second ki zindagi wale intermediate ke liye durable storage. "Bank ka vault parchi ke liye."' },
        { id: 'thumb', why: 'Alag Lambda ka matlab image dobara download/decode — ek pipeline process mein sab resize/blur/watermark ek decode se.' },
        { id: 'sfn', why: 'Har image × har kadam transition — high-frequency data path par per-transition billing aur account limits. Pipeline ke andar ordinary control flow.' },
      ],
      fine: {
        upload: 'Upload API ka alag rehna theek — auth/quota/public surface alag concern hai aur payload ek hi baar aata hai.',
        cdn: 'CDN bilkul sahi — final output ko users ke paas cache karna. Yeh boundary asli kaam khareedti hai (latency, offload).',
      },
      lesson: `🎯 Har arrow par likho: <b>payload × per second</b> aur <b>kaunsi ownership khareedi</b>. Bada guna-phal + koi ownership nahi = merge karo.`,
    },
  ],
  interview: {
    title: 'Interview Round — monolith vs microservices',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hum microservices mein kyun jaayein?"',
        choices: [
          'Agar teams ko independent build/deploy/operate chahiye aur alag scaling/blast radius — tab; performance ke liye nahi. Har boundary ka tax (size × frequency) pehle naapo',
          'Kyunki modern hai',
          'Kyunki tez hota hai',
          'Kyunki Amazon karta hai',
        ],
        answer: 0,
        explain: 'Vogels: architecture jo workload fit kare.',
      },
      {
        q: 'Interviewer: "Monolith mein merge ki keemat?"',
        choices: [
          'Coupled deploys, bada blast radius, capacity planning khud, kamzor isolation, config ki galtiyan — jaan-boojh ke liya sauda',
          'Koi keemat nahi',
          'Sirf deploy time',
          'Code bada',
        ],
        answer: 0,
        explain: 'Har faisle ka bill hota hai — naam lo.',
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki boundary kya khareedti hai aur kya kharch karti hai',
    'Main merge ke baad ki keemat gin sakta hoon',
    'Main cloud bill ko architecture diagram par rakh ke soch sakta hoon',
  ],
  homework: `<p>Apne cloud bill ki top 5 lines nikaalo aur har ek ko architecture diagram ke ek arrow ya box se jodo. Kya koi line kisi
    boundary (queue, S3 handoff, orchestrator, cross-AZ traffic) ki hai jise same team chalati hai?</p>`,
  cards: [
    { front: 'Microservices kis liye?', back: 'Ownership — team ka independent build/deploy/operate, alag scaling, chhota blast radius. Performance ke liye nahi.' },
    { front: 'Merge ki keemat?', back: 'Coupled deploys, bada blast radius, capacity planning khud, kamzor isolation, config galtiyan.' },
    { front: 'Vogels ka jawab?', back: 'Goal na monolith, na microservices — woh architecture jo workload ko fit kare.' },
  ],
},
]);

})();
