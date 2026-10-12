/* =====================================================================
   TRACK — 🏢 Real Company Stories · Stripe: rewrite nahi, tooling

   Source: "How STRIPE Processes 1.9 Trillion" (Akhil Sharma).
   Kahani Ruby monolith aur uske tooling ki hai (payments ke andar ki nahi).
   Docker lab: docker-labs/13-stripe
   ===================================================================== */
(function () {

VISUALS['stripe-no-rewrite'] = {
  t: 'Bottleneck language nahi, codebase hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔥 2010s ka playbook</span>
        <div class="dg-cap">Twitter: Ruby → Scala, phir microservices. "Language dheemi hai, likh do dobara."</div></div>
      <div class="dg-box is-good"><span class="bx-label">🧰 Stripe ~2017</span>
        <div class="dg-cap">~5 crore lines Ruby monolith, saikdon committers roz, peak 27,000 rps, 2025 mein $1.9T.
          "Codebase ko <b>tooling</b> se theek karo, rewrite se nahi." Migration ka budget → tooling ka budget.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent"><span class="ni">🧑‍🎓</span><span class="nl">Onboarding mushkil</span><span class="ns">types nahi → Sorbet</span></div>
      <div class="dg-node is-accent"><span class="ni">🔧</span><span class="nl">Refactor darawna</span><span class="ns">1,000 files door kya toota? → static analysis</span></div>
      <div class="dg-node is-accent"><span class="ni">🐢</span><span class="nl">Tests dheeme</span><span class="ns">sab chalte hain → selective tests</span></div>
    </div>`,
};

VISUALS['stripe-tooling'] = {
  t: 'Tooling jo judta jaata hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Sorbet (gradual types, C++)</span><span class="q">5 crore lines seconds mein check; types jahan faayda</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Selective test execution</span><span class="q">badla function → callers → unke callers → sirf woh tests (~5%)</span></div>
      <div class="dg-rung a"><span class="lv">3</span><span class="cmd">Fearless refactor</span><span class="q">ek Sunday: 37 lakh lines ek PR mein, agli subah sab chal raha tha</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Minions (in-house AI agents)</span><span class="q">Ruby + Sorbet par commercial agents se behtar</span></div>
    </div>
    <div class="dg-cap">Lab 13: aam change → 0.7% tests, 42 ms, har failing test pakda. Par sirf 60 dynamic calls (<code>send</code>) → 300 mein se
      91 changes mein failing test chhoota. <b>Graph ko trace hone layak rakhna hi shart hai.</b></div>`,
};

VISUALS['stripe-gil'] = {
  t: 'Ek process, ek core — toh processes badhao',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">🔒 GIL: ek process mein ek waqt ek thread Ruby chalata hai</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📤 non-zaroori kaam request path se bahar</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🧮 bahut saare processes + load balancer</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">1️⃣</span><span class="nl">1 process, sync extras</span><span class="ns">46 charges/s, p99 682 ms</span></div>
      <div class="dg-node is-gold"><span class="ni">📬</span><span class="nl">1 process, extras queue par</span><span class="ns">73/s</span></div>
      <div class="dg-node is-good"><span class="ni">8️⃣</span><span class="nl">8 processes</span><span class="ns">420/s, p99 142 ms</span></div>
    </div>
    <div class="dg-cap">Node ka single thread = Ruby ke GIL ki shakal. Language nahi badli, architecture badla.</div>`,
};

SD.registerLevels('stories', [
/* =====================================================================
   1. stripe-no-rewrite
   ===================================================================== */
{
  id: 'stripe-no-rewrite',
  icon: '💳',
  title: 'Stripe — 5 crore lines Ruby, aur rewrite nahi',
  badge: 'Rewrite Rokne Wala',
  objectives: [
    'Stripe ka paimana aur ulta faisla',
    '"Asal mein KYA mushkil hai?" — teen jawab, koi rewrite nahi maangta',
    'Productivity problem vs performance problem alag',
    'Rewrite ki chhupi keemat',
  ],
  lesson: [
    `<h3>💸 $1.9 trillion, ek Ruby monolith</h3>
     <p>2025 mein Stripe ke through <b>$1.9T</b> gaye (2024: $1.4T) — ek saajhe <b>Ruby monolith</b> se, ~5 crore lines (sabse
     bada jaana-maana Ruby codebase), saikdon log roz commit karte hain, peak 27,000 requests/sec.</p>
     <p>2010s ka playbook ulta tha: Twitter Ruby se Scala par gaya aur microservices mein toda. Stripe ne ~2017 mein kaha:
     <b>bottleneck language nahi, codebase hai — aur codebase ko tooling se theek karte hain, rewrite se nahi.</b> Jo budget
     migration mein jaata, woh tooling mein gaya.</p>
     <h3>🤔 Ruby ki sach mein kya dikkatein hain</h3>
     <ul>
       <li><b>GIL</b> — ek process mein ek waqt ek thread Ruby chalata hai.</li>
       <li><b>Dynamic typing</b> — typo ya missing method production mein runtime par phatta hai.</li>
       <li>Har operation par thoda dheema.</li>
       <li>Standard tooling medium codebases ke liye bana hai.</li>
     </ul>`,
    `<h3>🔍 "Asal mein KYA mushkil hai?"</h3>
     <p>Stripe ne "Ruby kharab hai" nahi kaha — poochha ki engineers ko <b>kya</b> mushkil lag raha hai:</p>
     <table>
       <tr><th>Takleef</th><th>Asli wajah</th><th>Ilaaj</th></tr>
       <tr><td>Naye log jaldi productive nahi</td><td>Types nahi, code padh ke samajhna mushkil</td><td>Sorbet — gradual types</td></tr>
       <tr><td>Refactor se darr</td><td>Static analysis nahi — 1,000 files door kya toota?</td><td>Type checker + call graph</td></tr>
       <tr><td>Tests ghanton</td><td>Har change par poora suite</td><td>Selective test execution</td></tr>
     </table>
     <p>Inme se <b>ek bhi</b> rewrite nahi maangta.</p>
     <h3>⚖️ Productivity ≠ performance</h3>
     <p>Sorbet <b>productivity</b> theek karta hai — code chalane ki speed nahi. Performance (GIL) alag problem hai, alag ilaaj
     ke saath (agla-agla level). Dono ko ek "rewrite" mein mila dena = do problems ke liye ek bahut mehenga, bahut lamba jawab.</p>
     <p class="tip">🎯 Video ka aakhri sabak: <b>boring choice jo das saal achhe se chalayi, exciting choice jo do saal chali, us
     se behtar hai</b> (Shopify, GitHub bhi isi raaste par).</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Productivity ya performance?',
      instructions: 'Har shikayat kis tarah ki problem hai?',
      bins: [
        { id: 'prod', label: '🧑‍💻 Productivity (insaanon ki speed)' },
        { id: 'perf', label: '⚡ Performance (code ki speed)' },
      ],
      items: [
        { text: 'Naye engineer ko 3 mahine lagte hain code samajhne mein', bin: 'prod', explain: 'Types, docs, code search — tooling ka kaam.' },
        { text: 'Charge API ka p99 400 ms hai', bin: 'perf', explain: 'Runtime ki problem — process model, request path.' },
        { text: 'Ek function rename karne se darr lagta hai', bin: 'prod', explain: 'Static analysis / type checker ka kaam.' },
        { text: 'CI 2 ghante chalta hai', bin: 'prod', explain: 'Selective tests — code ki speed se lena-dena nahi.' },
        { text: '16 cores hain par ek process ek hi use karta hai', bin: 'perf', explain: 'GIL — process-level parallelism.' },
        { text: 'Production mein NoMethodError aaya', bin: 'prod', explain: 'Types ne edit-time par pakda hota — engineer ki galti, runtime speed nahi.' },
      ],
    },
    {
      type: 'estimate',
      title: 'Napkin math — rewrite ki keemat',
      goal: 'Andaaza lagao ki 5 crore lines dobara likhna kitna bada kaam hai.',
      problems: [
        {
          q: '5 crore lines. Ek engineer saal mein ~50,000 lines tested production code "migrate" kare (bahut aashavaadi). Kitne engineer-saal?',
          unit: 'engineer-saal', given: ['5,00,00,000 lines', '50,000 lines/engineer/saal'],
          answer: 1000, tol: 0.3,
          steps: ['5e7 / 5e4 = 1,000 engineer-saal', '200 engineers = 5 saal — aur us beech business rukta nahi, code badhta rehta hai'],
          lesson: 'Rewrite ek chalti train ke pahiye badalna hai. Tooling usi train ko tez karta hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — rewrite ka faisla',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara Python monolith dheema aur ulajha hua hai. Go mein rewrite karein?"',
        choices: [
          'Pehle poochho asal mein kya mushkil hai — onboarding, refactor, tests (productivity) ya latency/throughput (performance); dono ke alag, sasta ilaaj; rewrite aakhri option',
          'Haan, Go tez hai',
          'Microservices mein tod do',
          'Kuch mat karo',
        ],
        answer: 0,
        explain: 'Stripe ka tareeka: problem ko naam do, phir sabse chhota ilaaj.',
      },
      {
        q: 'Interviewer: "Rewrite ki sabse chhupi keemat?"',
        choices: [
          'Business chalta rehta hai — do systems saath chalana, features dono mein, saalon ka hidden knowledge (edge cases) dobara seekhna',
          'Naye servers',
          'Nayi language seekhna',
          'Koi keemat nahi',
        ],
        answer: 0,
        explain: 'Purana code sirf code nahi, saalon ke sabak hai.',
      },
    ],
  },
  success: [
    'Main codebase bottleneck aur language bottleneck alag kar sakta hoon',
    'Main productivity aur performance problems ke alag ilaaj bata sakta hoon',
    'Main rewrite ki keemat ka andaaza laga sakta hoon',
  ],
  homework: `<p>Apni team se ek sawaal poochho: "codebase mein sabse zyada waqt kahan jaata hai?" Top 3 jawab likho. Har ek ke
    saamne likho: kya yeh rewrite se theek hoga, ya ek tool (types, search, selective CI, formatter) se?</p>`,
  cards: [
    { front: 'Stripe ka ~2017 ka faisla?', back: 'Bottleneck language nahi, codebase hai — tooling se theek karo, rewrite se nahi. 5 crore lines Ruby monolith, $1.9T (2025).' },
    { front: 'Stripe ki teen asli takleefein?', back: 'Onboarding (types nahi), refactoring (static analysis nahi), slow tests (sab chalte the). Koi rewrite nahi maangti.' },
    { front: 'Productivity vs performance?', back: 'Sorbet productivity theek karta hai (insaan). GIL performance hai (code) — alag ilaaj: process-level parallelism.' },
  ],
},

/* =====================================================================
   2. stripe-tooling
   ===================================================================== */
{
  id: 'stripe-tooling',
  icon: '🧰',
  title: 'Sorbet aur selective tests — tooling jo judta jaata hai',
  badge: 'Tooling Tapasvi',
  objectives: [
    'Gradual static types — Sorbet',
    'Selective test execution: reverse dependency graph',
    'Dynamic calls — graph ke andhe kone (lab)',
    'Tooling compound hota hai — aur lock-in bhi',
  ],
  lesson: [
    `<h3>🔎 Sorbet</h3>
     <p>Gradual static type checker (C++ mein): types wahan jahan faayda, baaki untyped chalega. Cores ke saath linearly scale —
     <b>5 crore lines seconds mein</b>. Edit karte waqt hi cross-module mismatch pakadta hai. March ke ek Sunday: <b>37 lakh
     lines ek PR mein</b> convert, agli subah sab chal raha tha. Types ke bina woh refactor sochne layak bhi nahi tha.</p>
     <h3>🎯 Selective test execution</h3>
     <p>Static analysis se call graph: badla hua function → use kaun bulata hai → unhe kaun… → <b>sirf woh tests</b> jo us
     subgraph ko chhoote hain. Stripe par ~5% suite, same safety. Microservices ke CI jaisa faayda ("sirf apne tests"),
     bina network boundaries, deploys aur distributed debugging ke.</p>
     <pre>lab 13 (3,000 functions, 1,500 tests):
change fn 1234 | all       | tests 1500 (100%) | 6068 ms | failed 10/10
change fn 1234 | selective | tests   10 (0.7%) |   42 ms | failed 10/10 | missed 0
change fn 57 (shared core) | selective | 452 tests (30.1%)</pre>`,
    `<h3>🕳️ Dynamic calls — graph ke andhe kone</h3>
     <p>Ruby ka <code>send</code> / metaprogramming: function ka naam string se banta hai — static analysis ko dikhta hi nahi.
     Selective runner ko woh raasta nahi dikhega, toh woh test nahi chalayega.</p>
     <pre>300 random changes:
dynamic edges 60 (static ka ~1%) → 91 changes mein failing test chhoota
dynamic edges  5                  →  4 changes
dynamic edges  0                  →  0</pre>
     <p>Isliye Stripe ki shart: <b>dependency graph itna saaf rakho ki trace ho sake</b>. Har <code>send</code> ek chhupa
     raasta hai; Sorbet ka asli kaam graph ko sach bolne layak banana hai.</p>
     <h3>🔗 Tooling judta hai</h3>
     <p>Sorbet → selective tests → 37 lakh line refactor → Minions (in-house AI coding agents; commercial agents TS/Python/Go
     par trained, Ruby + Sorbet par kamzor) useful. Aur rubyfmt (Rust mein, kai guna tez), build system, code search, Ruby runtime
     ke patches.</p>
     <p>⚖️ Keemat: type checker = saalon ka compiler kaam; Google/Facebook monorepo wale log hire kiye; aur <b>lock-in</b> — Ruby
     chhodna = das saal ka tooling aur gyaan migrate karna. Ek scale ke baad open-source tumhe fit nahi hota → tooling
     load-bearing infra ban jaata hai jo hamesha maintain karna hai.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 1,500 tests mein se sirf kaam ke',
      project: '13-stripe',
      exercise: 'ex1-selective-tests',
      goal: 'Ek function badlo — saare tests vs selective (reverse call graph). Phir dekho dynamic calls kya chhupa dete hain.',
      why: `<code>lib/repo.js</code> ek nakli monolith: 3,000 functions, 1,500 tests, 5,720 static calls aur kuch dynamic calls (Ruby
        <code>send</code> jaisa — static analysis ko nahi dikhta). <code>DYNAMIC_EDGES</code> se dynamic calls ki ginti badlo.`,
      steps: [
        { text: 'CI server chalao.', cmd: 'cd docker-labs/13-stripe && npm start ex1-selective-tests', expect: 'ex1-selective-tests\nci → http://localhost:4821   (3000 functions, 1500 tests, DYNAMIC_EDGES=60)' },
        { text: 'Ek aam function badlo.', cmd: 'node tools/ci.js --changed 1234', expect: 'change fn 1234 | all       | tests 1500 (100.0%) |  6068 ms | failed 10/10 | missed 0\nchange fn 1234 | selective | tests   10 (0.7%) |    42 ms | failed 10/10 | missed 0' },
        { text: '300 random changes ka average.', cmd: 'node tools/ci.js --sample 300', expect: '300 random changes | selective avg 1.1% of suite | changes jahan failing test chhoota: 91 (2628 tests)   [dynamic edges: 60]' },
        { text: 'Dynamic calls ghatao.', cmd: 'DYNAMIC_EDGES=5 npm start ex1-selective-tests\nnode tools/ci.js --sample 300', expect: '300 random changes | selective avg 1.1% of suite | changes jahan failing test chhoota: 4 (68 tests)     [dynamic edges: 5]' },
      ],
      observe: {
        q: 'Sirf 60 dynamic calls (static ka ~1%) se 91/300 changes mein failing test kyun chhoota?',
        choices: [
          'Ek chhupa raasta poore upstream subgraph ko andha kar deta hai — us raaste ke saare callers ke tests selective runner ko dikhte hi nahi',
          'Tests flaky the',
          'Selective runner mein bug',
          '60 bahut zyada hain',
        ],
        answer: 0,
        explain: 'Graph ek zanjeer hai — ek tooti kadi sab kuch chhupa deti hai.',
      },
      lesson: 'Selective testing ki taakat graph ki sachchai jitni hai. Dynamic calls kam karo, ya unhe graph mein declare karo.',
    },
    {
      type: 'quiz',
      title: 'Tooling ki samajh',
      questions: [
        {
          q: '"Gradual" typing ka faayda 5 crore line codebase mein?',
          choices: [
            'Ek saath sab type nahi karna padta — jahan faayda wahan pehle, baaki untyped chalega; dheere-dheere coverage badhao',
            'Types optional hain toh bekaar',
            'Gradual matlab dheema',
            'Sirf naye code mein',
          ],
          answer: 0,
          explain: 'Isi se 37 lakh lines ka ek-PR refactor mumkin hua — pehle se kaafi types the.',
        },
        {
          q: 'Stripe ke tooling ka lock-in kya hai?',
          choices: [
            'Ruby chhodna = das saal ka custom tooling (Sorbet, selective CI, Minions) aur gyaan bhi chhodna/migrate karna',
            'Ruby license',
            'Cloud vendor',
            'Koi lock-in nahi',
          ],
          answer: 0,
          explain: 'Jitna gehra invest, utna gehra lock-in — soch ke liya gaya sauda.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — monorepo CI',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Monorepo CI 90 minute leta hai. Microservices mein todein?"',
        choices: [
          'Pehle selective test execution — build/call graph se affected tests; graph ko traceable rakho (dynamic calls kam/declare); network boundaries ki keemat ke bina wahi faayda',
          'Haan, tod do',
          'Zyada CI machines',
          'Tests kam karo',
        ],
        answer: 0,
        explain: 'Lab: aam change par 0.7% tests.',
      },
      {
        q: 'Interviewer: "Selective CI ne ek bug miss kiya jo reflection se call hota tha."',
        choices: [
          'Graph ka blind spot — reflection/dynamic dispatch ko lint se pakdo, allowlist mein declare karo, aur periodic full runs rakho',
          'Selective CI band karo',
          'Reflection allowed hai, kuch nahi kar sakte',
          'Test dobara chalao',
        ],
        answer: 0,
        explain: 'Lab: 60 dynamic edges → 91/300 changes mein miss.',
      },
    ],
  },
  success: [
    'Main gradual typing aur selective test execution samjha sakta hoon',
    'Main dynamic calls ka blind spot lab se dikha sakta hoon',
    'Main tooling ke compound faayde aur lock-in dono gin sakta hoon',
  ],
  homework: `<p>Apne codebase mein reflection / <code>send</code> / <code>getattr</code> / string se bane imports gino. Har ek ek
    chhupa raasta hai jo refactor aur selective CI ko andha karta hai. Kitne hain, aur kaunse hataye ja sakte hain?</p>`,
  cards: [
    { front: 'Sorbet?', back: 'Gradual static type checker (C++): 5 crore lines seconds mein; types jahan faayda. Ek Sunday 37 lakh lines ek PR mein refactor.' },
    { front: 'Selective test execution?', back: 'Badla function → reverse call graph → sirf affected tests (~5% Stripe; lab 0.7%). Microservice CI ka faayda bina network ke.' },
    { front: 'Dynamic calls ka khatra (lab)?', back: '60 dynamic edges (~1%) → 300 mein se 91 changes mein failing test chhoota. Graph traceable rakhna shart hai.' },
  ],
},

/* =====================================================================
   3. stripe-gil
   ===================================================================== */
{
  id: 'stripe-gil',
  icon: '🔒',
  title: 'GIL — ek process, ek core',
  badge: 'Process Pahalwan',
  objectives: [
    'GIL kya hai aur 16 cores kyun kaam nahi aate',
    'Charge path: sync aur latency-sensitive',
    'Kaam request path se bahar, parallel kaam non-Ruby systems par',
    'Lab: 1 process vs N processes',
  ],
  lesson: [
    `<h3>🎤 Ek mic, bahut singers</h3>
     <p>Ruby ka <b>GIL</b> (Global Interpreter Lock): ek process mein ek waqt <b>ek</b> thread Ruby chalata hai — jaise stage par
     ek mic, singers baari-baari. Machine mein 16 cores hon, ek Ruby process ~1 core jitna kaam karega. Node ka JavaScript bhi
     ek process mein ek thread par chalta hai — wahi shakal.</p>
     <p>Charge ka raasta: fraud score, user auth, charge authorize, ledger update — Stripe ka <b>sabse latency-sensitive,
     sabse zaroori</b> system, synchronously Ruby mein.</p>
     <h3>🧮 Ilaaj: architecture, language nahi</h3>
     <ul>
       <li><b>Process-level parallelism</b> — bahut saare Ruby processes, har ek apna core; upar load balancer/orchestration.</li>
       <li><b>Request path se bahar</b> — receipt email, analytics, background jobs, queue processors, workers → alag systems
       (bahut saare non-Ruby).</li>
     </ul>`,
    `<h3>📏 Lab 13 (ex2-gil) — har charge ~12 ms CPU, extras 8 ms</h3>
     <pre>WORKERS=1 EXTRAS=sync    46 charges/s | p50 296 ms | p99 682 ms
WORKERS=1 EXTRAS=queue   73 charges/s | p50 189 ms | p99 399 ms
WORKERS=4 EXTRAS=queue  258 charges/s | p50  50 ms | p99 175 ms
WORKERS=8 EXTRAS=queue  420 charges/s | p50  30 ms | p99 142 ms   (14-core laptop)</pre>
     <p>Ek process ki chhat: 1000 ms ÷ (12 + 8) ms ≈ 50/s — 14 cores hone se koi farak nahi. Pehla kadam: jo charge ke liye
     zaroori nahi use bahar (46 → 73). Doosra: processes badhao (73 → 420). Code ki ek line nahi badli.</p>
     <p class="tip">🎯 GIL ke saath jeena "hamesha ka" hai: process-level concurrency, har gem typed ya untyped mark, aur
     dependency graph saaf. Par yeh <b>jaana-pehchaana</b> kharcha hai — rewrite ka nahi.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek thread, kai processes',
      project: '13-stripe',
      exercise: 'ex2-gil',
      goal: 'Charge API: 1 process (extras sync / queue) aur 4, 8 processes — throughput aur p99.',
      why: `<code>services/charge.js</code>: har <code>/charge</code> ~12 ms CPU. <code>EXTRAS=sync</code> = receipt + analytics (8 ms)
        request ke andar; <code>queue</code> = alag <code>receipt-worker</code> process ko job. <code>WORKERS</code> = Node cluster processes.`,
      steps: [
        { text: 'Ek process, extras sync.', cmd: 'cd docker-labs/13-stripe && WORKERS=1 EXTRAS=sync npm start ex2-gil\nnode tools/load.js --concurrency 16 --requests 800', expect: 'WORKERS=1 EXTRAS=sync   800 charges, concurrency 16:  46 charges/s | p50 296 ms | p99 682 ms' },
        { text: 'Extras queue par.', cmd: 'WORKERS=1 EXTRAS=queue npm start ex2-gil\nnode tools/load.js --concurrency 16 --requests 800', expect: 'WORKERS=1 EXTRAS=queue  800 charges, concurrency 16:  73 charges/s | p50 189 ms | p99 399 ms' },
        { text: '8 processes.', cmd: 'WORKERS=8 npm start ex2-gil\nnode tools/load.js --concurrency 16 --requests 800', expect: 'WORKERS=8 EXTRAS=queue  800 charges, concurrency 16: 420 charges/s | p50  30 ms | p99 142 ms' },
      ],
      observe: {
        q: '14 cores ki machine par 1 process ~50 charges/s par kyun ruka?',
        choices: [
          'Ek process ek waqt ek core — 1000 ms ÷ 20 ms per charge ≈ 50/s; baaki 13 cores khaali',
          'Network limit',
          'Disk slow',
          'Load tool dheema',
        ],
        answer: 0,
        explain: 'GIL/single-thread ki chhat. Cores tabhi kaam aate hain jab processes hon.',
      },
      lesson: 'Performance problem ka ilaaj: kaam path se hatao, processes badhao — language wahi.',
    },
    {
      type: 'bins',
      title: 'Charge ke raaste mein ya bahar?',
      instructions: 'Kaunsa kaam synchronous charge path mein zaroori hai?',
      bins: [
        { id: 'path', label: '💳 Charge path (sync)' },
        { id: 'off', label: '📤 Request path se bahar (async)' },
      ],
      items: [
        { text: 'Fraud score', bin: 'path', explain: 'Charge authorize karne se pehle chahiye.' },
        { text: 'Receipt email bhejna', bin: 'off', explain: 'Charge ho gaya — email 2 sec baad jaaye toh chalega.' },
        { text: 'Card authorize karna', bin: 'path', explain: 'Yahi toh charge hai.' },
        { text: 'Analytics event', bin: 'off', explain: 'Queue par — charge ko rokna nahi chahiye.' },
        { text: 'Ledger update', bin: 'path', explain: 'Paisa ka hisaab turant aur sahi.' },
        { text: 'Merchant ka webhook', bin: 'off', explain: 'Retry wala alag system — charge latency mein nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — single-threaded runtime',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Node API 32-core machine par 1 core use karta hai."',
        choices: [
          'Cluster/multiple processes (ya containers) + load balancer; CPU-heavy kaam worker threads/alag service; non-zaroori kaam queue par',
          'Bada single core CPU',
          'Go mein rewrite',
          'Async/await lagao',
        ],
        answer: 0,
        explain: 'async/await I/O ke liye hai, CPU ke liye nahi. Lab: 1 → 8 processes = 73 → 420/s.',
      },
      {
        q: 'Interviewer: "Checkout slow hai; handler mein PDF invoice banta hai."',
        choices: [
          'Invoice ko request path se bahar — queue + worker; checkout sirf zaroori kadam',
          'PDF library tez karo',
          'Timeout badhao',
          'Server bada karo',
        ],
        answer: 0,
        explain: 'Lab: extras queue par → 46 → 73/s ek hi process mein.',
      },
    ],
  },
  success: [
    'Main GIL/single-thread ki chhat ka hisaab laga sakta hoon',
    'Main request path se kaam hataane aur process-level parallelism ka faayda lab se dikha sakta hoon',
    'Main Stripe ke paanch sabak bata sakta hoon',
  ],
  homework: `<p>Apne sabse busy endpoint ke handler ke har kadam ko likho aur har ek ke saamne: "user ko jawab dene ke liye zaroori?"
    Jo zaroori nahi, unka time jodo — itna tum request path se hata sakte ho. Phir dekho tumhare process kitne cores use kar rahe hain.</p>`,
  cards: [
    { front: 'GIL ka asar?', back: 'Ek process mein ek waqt ek thread Ruby — 16 cores par bhi ~1 core. (Node ka single thread wahi shakal.)' },
    { front: 'Stripe GIL ke saath kaise?', back: 'Bahut saare Ruby processes + load balancer; parallel/background kaam request path se bahar, non-Ruby systems par.' },
    { front: 'Lab 13 (charge API)?', back: '1 process sync: 46/s; extras queue: 73/s; 4 processes: 258/s; 8 processes: 420/s, p99 682 → 142 ms.' },
  ],
},
]);

})();
