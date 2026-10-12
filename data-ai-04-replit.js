/* =====================================================================
   TRACK — 🤖 AI Companies · Replit Agent: poora computer, undo button ke saath

   Source: "The INSANE Engineering Behind REPLIT Agents" (Akhil Sharma).
   Core faisla: agent ko halka sandbox nahi, ek POORA environment — aur
   use surakshit banane ke liye isolation + reversibility + dev/prod ki deewar.
   Docker lab: docker-labs/29-replit
   ===================================================================== */
(function () {

VISUALS['replit-full-env'] = {
  t: 'Halka sandbox vs poora environment',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🧪 Halka sandbox</span>
        <div class="dg-cap">WebAssembly Python / strict container. Tez, sasta, safe — par <b>package install nahi,
          DB nahi, server nahi</b>. Code interpreter jaise tools yahi hain. Asli app nahi ban sakta.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🖥️ Poora environment</span>
        <div class="dg-cap">Asli Linux box: shell, files, DB, network — wahi workspace jo insaan ko milta hai.
          Kaam ki ikaai: <b>"chalta hua app ship karo"</b>, sirf "code likho" nahi.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Isolation</span><span class="q">dushman maan ke — har breakout koshish fail ho</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">Snapshot</span><span class="q">har kadam ulta ho sake</span></div>
      <div class="dg-rung"><span class="lv">3</span><span class="cmd">Agent loop</span><span class="q">reason → act → observe, insaan wale tools</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">Deployment</span><span class="q">dev ka kachra prod tak nahi</span></div>
    </div>`,
};

VISUALS['replit-isolation'] = {
  t: 'Sabse mazboot deewar — udhaar lo',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🤖 agent (dev env)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧱 container + kernel features + hypervisor</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">☁️ har customer ka APNA GCP project</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">🧪 Dev — aazaadi</span>
        <div class="dg-cap">Agent packages install kare, DB fork kare, galti kare, rollback kare.
          Dev DB production se <b>architecture se alag</b>.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🚀 Prod — guarantee</span>
        <div class="dg-cap">Cloud Run, per-customer project, Google DDoS + WAF, autoscale. Bandh, predictable.
          <b>Yahin AI ki aazaadi khatam, platform ki guarantee shuru.</b></div></div>
    </div>`,
};

VISUALS['replit-undo'] = {
  t: 'Ek "undo" button, teen parton ke neeche',
  html: `
    <div class="dg-stack">
      <div class="dg-node is-good"><span class="ni">📁</span><span class="nl">File system — copy-on-write</span><span class="ns">snapshot = ek marker, constant time (1 MB ho ya 1 GB). Lab: 200 MB project, 5.7 ms</span></div>
      <div class="dg-node is-accent"><span class="ni">🌿</span><span class="nl">Code — har kadam par auto git commit</span><span class="ns">immutable backup remote — poora FS mit jaaye tab bhi history</span></div>
      <div class="dg-node is-gold"><span class="ni">🐘</span><span class="nl">Database — forkable Postgres</span><span class="ns">fork parent se data share karta hai jab tak likha na jaaye; rollback = fork phenko</span></div>
    </div>
    <div class="dg-cap">User ko ek button dikhta hai. Neeche: FS blocks wapas, git revert, DB fork discard — milliseconds mein.
      <b>Reversibility hi autonomy ko mumkin banati hai.</b></div>`,
};

SD.registerLevels('ai', [
/* =====================================================================
   1. replit-full-env
   ===================================================================== */
{
  id: 'replit-full-env',
  icon: '🖥️',
  title: 'Replit Agent — AI ko poora computer do',
  badge: 'Workspace Wala',
  objectives: [
    'Halka sandbox vs poora environment — kaam ki ikaai kya hai',
    'Paanch vaade: isolation, sasta spin-up, reversibility, isolated deploy, agent + infra ek system',
    '"Agent hi user hai" — insaan wale tools kyun',
    'Chaar layers: isolation → snapshot → agent loop → deployment',
  ],
  lesson: [
    `<h3>🧑‍🍳 Recipe likhne wala vs khaana banane wala</h3>
     <p>2024 tak zyadatar AI coding tools recipe likhte the: code likha, tum copy karke apni machine par
     chalao. Replit Agent khaana banata hai: ek prompt ("calorie tracker bana do") → code likhta hai,
     packages install karta hai, database khada karta hai, chalata hai, test karta hai, deploy karta hai
     → <b>public URL</b>.</p>
     <p>Iske liye use chahiye <b>apna poora environment</b> — asli Linux box, shell, file system, DB,
     network. Har user ke liye ek, roz hazaron, alag-alag, poori tarah recoverable, aur kaam khatam hote
     hi gayab.</p>
     <table>
       <tr><th></th><th>🧪 Halka sandbox</th><th>🖥️ Poora environment</th></tr>
       <tr><td>Kya hai</td><td>WebAssembly Python / strict container</td><td>Poora workstation, session bhar AI ka</td></tr>
       <tr><td>Kar sakta hai</td><td>Code chalana, calculation</td><td>Packages, DB, lambe servers, deploy</td></tr>
       <tr><td>Kharcha</td><td>Lagbhag muft</td><td>Asli compute, cold start</td></tr>
       <tr><td>Kaam ki ikaai</td><td>"Code generate karo"</td><td>"Chalta hua app ship karo"</td></tr>
     </table>
     <p class="tip">🎯 Design ka pehla sawaal: <b>kaam ki ikaai kya hai?</b> Agar jawab "app ship karna" hai,
     toh halka sandbox kitna bhi safe ho, kaam ka nahi.</p>`,
    `<h3>🤝 Paanch vaade</h3>
     <ol>
       <li><b>Isolation dushman maan ke</b> — agent ajeeb commands chalayega, random packages install
       karega; user bhi use host scan karne ko keh sakta hai. Har baar fail hona chahiye.</li>
       <li><b>Sasta aur tez shuru</b> — 2 minute ka provisioning nahi; roz hazaron.</li>
       <li><b>Poori reversibility</b> — agent files mitayega, DB bigaadega, build todega.</li>
       <li><b>Deploy bhi utna hi alag</b> jitna dev.</li>
       <li><b>Agent aur infra ek system</b> — loop ko environment ke hisaab se design karo.</li>
     </ol>
     <h3>🙋 "Agent hi user hai"</h3>
     <p>Agent ke tools bilkul wahi hain jo ek insaan Replit developer ke paas hain: files, shell, packages,
     DB tables, server chalana, errors padhna, deploy. Kyun?</p>
     <ul>
       <li>Model insaanon ke shell/FS/package manager istemaal par train hua hai — naye custom primitives
       usne kabhi dekhe hi nahi.</li>
       <li>Wahi infra jo saalon se insaan use kar rahe hain — uske failure modes pata hain.</li>
       <li>Har action UI mein dikhta hai ("X install kiya, Y banaya, Z chalaya") → user beech mein rok sakta hai.</li>
     </ul>
     <p>Loop: <b>ReAct</b> — socho → tool chalao → nateeja dekho → dohrao. Baad mein multi-agent (planning,
     coding, debugging, deploy agents) — par core wahi.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Halka sandbox kaafi ya poora environment chahiye?',
      instructions: 'Har task ke liye chuno.',
      bins: [
        { id: 'light', label: '🧪 Halka sandbox kaafi' },
        { id: 'full', label: '🖥️ Poora environment chahiye' },
      ],
      items: [
        { text: 'CSV ka average nikaal ke chart banao', bin: 'light', explain: 'Sirf calculation — koi server, koi DB nahi.' },
        { text: 'Login ke saath ek todo app banao aur public URL do', bin: 'full', explain: 'Packages, DB, lamba server, deploy — asli software.' },
        { text: 'Regex test karo 20 strings par', bin: 'light', explain: 'Chhota, stateless kaam.' },
        { text: 'Postgres migration likh ke chala ke dekho ki data sahi hai', bin: 'full', explain: 'Asli DB chahiye, aur galti par rollback bhi.' },
        { text: 'Flask API banao jo Stripe webhook receive kare', bin: 'full', explain: 'Lamba chalne wala server + network — halke sandbox mein nahi.' },
        { text: 'Math expression simplify karo', bin: 'light', explain: 'Code interpreter ka classic kaam.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Agent design ki samajh',
      questions: [
        {
          q: 'Replit ne agent ke liye naye custom tools banane ki jagah insaan wale tools (shell, files, packages) kyun diye?',
          choices: [
            'Model insaanon ke inhi tools par train hua hai, infra ke failure modes pehle se pata hain, aur user har action samajh sakta hai',
            'Naye tools banana mehenga tha',
            'Insaan wale tools tez hain',
            'Google ne kaha tha',
          ],
          answer: 0,
          explain: 'Agent = insaan jaisa user. Model ka training, infra ki maturity, aur user ka bharosa — teeno isse aate hain.',
        },
        {
          q: 'Kisi agent system ka design kis sawaal se shuru karna chahiye (video)?',
          choices: [
            '"Jab agent galti karega tab kya hoga?" aur "kaunsi isolation guarantee chahiye?"',
            '"Sabse bada model kaunsa hai?"',
            '"UI kaisa dikhega?"',
            '"Kitne tools chahiye?"',
          ],
          answer: 0,
          explain: 'Video ki line: agent = intelligence ki patli layer, isolation + reversibility + ops ke mote stack par.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — coding agent platform',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara agent sirf code likhta hai, user khud chalata hai. Replit jaisa banana hai. Pehla kadam?"',
        choices: [
          'Kaam ki ikaai badlo: agent ko har session ka poora, isolated, reversible environment do — phir loop ko us environment ke hisaab se design karo',
          'Model ko bada karo',
          'User ki machine par agent chala do',
          'Ek shared server par sab users ke agents',
        ],
        answer: 0,
        explain: 'User ki machine = unki files ka risk; shared server = ek agent doosre ko chhu sakta hai.',
      },
      {
        q: 'Interviewer: "Poore environment ki keemat?"',
        choices: [
          'Asli compute (halke sandbox se kahin mehenga), cold start ki nichli hadd, aur surface area — snapshot engine galat = data loss, isolation galat = security incident',
          'Koi keemat nahi',
          'Sirf storage',
          'Sirf network',
        ],
        answer: 0,
        explain: 'Video: powerful capability ka tax roz, hamesha.',
      },
    ],
  },
  success: [
    'Main halka sandbox aur poora environment kaam ki ikaai se chun sakta hoon',
    'Main agent platform ke paanch vaade aur chaar layers bata sakta hoon',
    'Main samjha sakta hoon ki agent ko insaan wale tools kyun',
  ],
  homework: `<p>Ek AI feature socho jo tumhari team bana sakti hai. Likho: kaam ki ikaai kya hai? Halka sandbox
    kaafi hai ya poora environment? Aur paanch vaadon mein se kaunsa sabse mushkil hoga — kyun?</p>`,
  cards: [
    { front: 'Replit Agent ka core faisla?', back: 'Agent ko halka sandbox nahi, poora environment (Linux, shell, files, DB, network) — kyunki kaam ki ikaai "chalta hua app ship karo" hai.' },
    { front: 'Agent platform ki chaar layers?', back: 'Isolation → snapshot (reversibility) → agent loop (ReAct, insaan wale tools) → deployment (isolated prod).' },
    { front: 'Agent ko insaan wale tools kyun?', back: 'Model inhi par train hua; infra ke failure modes pata; user har action samajh ke rok sakta hai.' },
  ],
},

/* =====================================================================
   2. replit-isolation
   ===================================================================== */
{
  id: 'replit-isolation',
  icon: '🧱',
  title: 'Dushman maan ke isolation — aur dev/prod ki deewar',
  badge: 'Deewar Udhaar Lene Wala',
  objectives: [
    'Hostile threat model aur defense in depth',
    '"Kisi aur ki sabse mazboot deewar udhaar lo" — per-customer GCP project',
    'Dev aur prod ke beech ki boundary: AI ki aazaadi kahan khatam',
    'Lab: forkable DB — fork mein DROP TABLE, prod safe',
  ],
  lesson: [
    `<h3>🏢 Heroku 2015 vs Replit 2024</h3>
     <p>2015 ke hosting platform ka threat model: developers achhe hain, bas <b>galti</b> ek se doosre tak na
     phaile. Replit ka threat model: agent ajeeb commands chalayega, aur user bhi use <b>jaan-boojh ke</b>
     breakout, host scan, pivot karne ko keh sakta hai. Isliye <b>defense in depth</b>: har environment ek
     Linux container — apna file system, process tree, network namespace, resource limits — plus kernel
     features, hypervisor-level boundaries, hardened syscall boundary. Video: "yeh sirf table stakes hain."</p>
     <h3>☁️ Sabse mazboot deewar udhaar lo</h3>
     <p>Deploy ke waqt har customer — free tier bhi — ko <b>apna Google Cloud project</b> milta hai. Bhaari
     cheez hai (apni billing, apna quota), par yeh GCP ki sabse mazboot tenant boundary hai, jise Google ka
     infra enforce karta hai — wahi deewar jo Google ko uske customers se alag karti hai aur jis par duniya
     bhar ke researchers attack karte hain.</p>
     <p class="tip">🎯 Apni deewar banane se behtar hai woh deewar istemaal karo jiski <b>sabse zyada testing
     duniya karti hai</b>.</p>`,
    `<h3>🚧 Dev = aazaadi, Prod = guarantee</h3>
     <p>Dev environment flexible hai — agent packages install kare, DB fork kare, galti kare, rollback kare.
     Prod bandh hai — Cloud Run, per-customer project, Google DDoS protection + WAF, autoscale. Beech ki
     deewar hi woh jagah hai jahan <b>AI ki aazaadi khatam hoti hai aur platform ki guarantee shuru</b>.
     Agent ka dev ka kachra prod tak nahi pahunchta → isi liye agent ko itni aazaadi di ja sakti hai.</p>
     <p>Aur database: <b>dev DB production se architecture se alag</b>. Agent kabhi prod data ko chhoota hi
     nahi. Dev mein bhi DB ek <b>fork</b> hai — lab 29 ka ex3 yahi dikhata hai:</p>
     <pre>production users table: 500,000 rows
fork banaya: 0.005 ms, overlay mein 0 rows (kuch copy nahi hua)
agent (fork mein): DROP TABLE users
  fork mein users: 0      production mein users: 500,000  ✅</pre>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Agent platform ke chhed',
      instructions: 'Ek startup ka agent platform. Chaar jagah deewar kamzor hai — pakdo.',
      brief: `Startup ne coding agent launch kiya. Har user ko container milta hai. Deploy ek shared
        Kubernetes cluster par hota hai. Security review tumhare haath mein.`,
      goal: 'Chaar aisi cheezein pakdo jahan ek user/agent ki galti ya badmaashi doosron tak ya prod tak pahunch sakti hai.',
      nodes: [
        { id: 'deploy', label: '🚀 Deploy', sub: 'sab customers ke apps ek hi shared k8s namespace mein', row: 0 },
        { id: 'db', label: '🐘 Database', sub: 'agent dev mein "tez testing" ke liye production DB ka read-write user use karta hai', row: 0 },
        { id: 'container', label: '📦 Dev container', sub: 'har user ka alag container, resource limits ke saath', row: 1 },
        { id: 'net', label: '🌐 Network', sub: 'dev containers ek hi flat network par, ek dusre ko dekh sakte hain', row: 1 },
        { id: 'snap', label: '📸 Snapshots', sub: 'sirf raat ko ek backup', row: 2 },
        { id: 'ui', label: '🪟 Action log', sub: 'har agent action UI mein dikhta hai', row: 2 },
      ],
      flaws: [
        { id: 'deploy', why: 'Shared namespace = ek customer ka app doosre ke secrets/services tak. Replit har customer ko apna GCP project deta hai — sabse mazboot tenant boundary udhaar lo.' },
        { id: 'db', why: 'Agent ko prod DB = uski har galti prod par. Dev DB architecture se alag ho, aur wahan bhi fork (lab: fork mein DROP TABLE, prod 500,000 rows safe).' },
        { id: 'net', why: 'Flat network = ek bigda environment doosron ko scan/attack kar sakta hai. Har environment ka apna network namespace, dusron tak raasta band.' },
        { id: 'snap', why: 'Raat ka ek backup = din bhar ki galti ka koi undo nahi. Agent ko har kadam par snapshot chahiye (CoW se constant-time).' },
      ],
      fine: {
        container: 'Har user ka alag container + resource limits sahi shuruaat hai (table stakes) — bas akela kaafi nahi.',
        ui: 'Har action UI mein dikhana bilkul sahi — user beech mein rok sakta hai aur bharosa banta hai.',
      },
      lesson: `🎯 Har cheez par poochho: <b>agar agent sabse bura kaam kare, toh kaunsi deewar use rokti hai?</b>
        Aur jahan ho sake, apni deewar banane ki jagah sabse zyada test hui deewar udhaar lo.`,
    },
    {
      type: 'docker',
      title: '🐳 Lab — forkable database',
      project: '29-replit',
      exercise: 'ex3',
      goal: 'Production table ka fork banao, agent se fork mein DROP TABLE chalwao, aur dekho prod par kya hua.',
      why: `<code>tools/forkdb.js</code> ek copy-on-write overlay hai: fork sirf apne badlaav (writes + tombstones)
        rakhta hai; padhte waqt pehle overlay, phir parent. Replit ka forkable Postgres isi soch par hai.`,
      steps: [
        { text: 'Tool chalao (koi server nahi).', cmd: 'cd docker-labs/29-replit && node tools/forkdb.js', expect: 'production users table: 500,000 rows\nfork banaya: 0.005 ms, overlay mein 0 rows (kuch copy nahi hua)' },
        { text: 'Output ka aakhri hissa dekho — DROP TABLE ke baad.', cmd: 'node tools/forkdb.js | tail -4', expect: '  fork mein users: 0      production mein users: 500,000  ✅ asli data ko haath bhi nahi laga' },
      ],
      observe: {
        q: 'Fork banana 0.005 ms mein kaise hua jab table mein 5 lakh rows hain?',
        choices: [
          'Fork kuch copy nahi karta — sirf parent ka reference; sirf badlaav overlay mein likhe jaate hain (copy-on-write)',
          'Rows compress ho gayin',
          'Fork background mein copy hua',
          'Table asli mein chhoti thi',
        ],
        answer: 0,
        explain: 'CoW ka poora jaadu: jo nahi badla woh share hota hai. Isi liye har agent kaam ke liye fork muft hai.',
      },
      lesson: 'Agent ko prod ka access nahi, fork do. Fork muft hai, aur sabse buri galti bhi fork tak simit.',
    },
  ],
  interview: {
    title: 'Interview Round — multi-tenant agent isolation',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Har customer ke deploy ke liye alag cloud project — bahut bhaari nahi?"',
        choices: [
          'Bhaari hai (provisioning, quota, billing, cleanup automate karna padta hai), par yeh cloud ki sabse mazboot tenant boundary hai jo duniya bhar mein test hoti hai — apni deewar se behtar',
          'Haan, ek shared cluster behtar hai',
          'Sirf paid customers ko',
          'Projects ka koi faayda nahi',
        ],
        answer: 0,
        explain: 'Trade-off: operational kharcha vs sabse zyada tested boundary.',
      },
      {
        q: 'Interviewer: "Agent ko production DB kab dena chahiye?"',
        choices: [
          'Kabhi seedha nahi — dev DB architecture se alag, wahan bhi fork; prod mein badlaav sirf deploy/migration ke review wale raaste se',
          'Jab agent trusted ho jaaye',
          'Read-only de do',
          'Raat ko',
        ],
        answer: 0,
        explain: 'Read-only bhi sensitive data ka leak raasta hai. Dev/prod ki deewar hi autonomy ko mumkin banati hai.',
      },
    ],
  },
  success: [
    'Main hostile threat model ke liye defense in depth design kar sakta hoon',
    'Main "sabse mazboot deewar udhaar lo" ka tark de sakta hoon',
    'Main dev/prod boundary aur forkable DB ka faayda samjha sakta hoon',
  ],
  homework: `<p>Apne system mein koi jagah dhoondho jahan "dev" wala kaam "prod" ki cheez chhoo sakta hai
    (shared DB user, shared bucket, shared secrets). Likho: uske beech ki deewar kya hai, aur kya use
    kisi mazboot, pehle se tested boundary (alag account/project) se badal sakte ho?</p>`,
  cards: [
    { front: 'Replit ka threat model?', back: 'Hostile: agent ajeeb commands chalayega, user breakout/scan/pivot maang sakta hai. Isliye defense in depth: container + kernel features + hypervisor + hardened syscalls.' },
    { front: '"Sabse mazboot deewar udhaar lo"?', back: 'Har customer (free bhi) ka apna GCP project — Google ka infra enforce karta hai, duniya bhar mein tested.' },
    { front: 'Dev/prod boundary kyun?', back: 'Dev mein AI ki aazaadi (install, fork, galti, rollback); prod bandh (Cloud Run, WAF, autoscale). Dev DB prod se alag — agent prod data chhoota hi nahi.' },
  ],
},

/* =====================================================================
   3. replit-undo
   ===================================================================== */
{
  id: 'replit-undo',
  icon: '↩️',
  title: 'Undo button — reversibility se autonomy',
  badge: 'Undo Ustaad',
  objectives: [
    '30 kadam ke task mein galtiyan jud-ti hain',
    'Teen parton ka snapshot: CoW file system, auto git, forkable DB',
    'Lab: full copy vs CoW snapshot (asli disk par)',
    'Rollback + retry aur parallel sampling ki keemat',
  ],
  lesson: [
    `<h3>📉 Galtiyan jud-ti hain</h3>
     <p>Agent ka ek kadam 95% baar sahi hai. Achha lagta hai. Par 30 kadam ka task? Kahin na kahin kuch
     tootega — file mitegi, schema bigdega, dependency takrayegi. Bina undo ke, agent us tooti haalat ke
     upar kaam karta rehta hai: galti ke upar galti. Lab 29 (ex2) mein:</p>
     <pre>har kadam ka risk   tareeka        poore sahi bane
      5%           no-undo          38.9%
      5%           rollback         71.0%
     15%           no-undo           6.8%
     15%           rollback         32.0%</pre>
     <p>Rollback: test fail → saaf haalat par wapas → wahi kadam dobara. Same compute, <b>dugne</b> sahi
     projects. Jo bachte hain woh wo galtiyan hain jo tests ne pakdi hi nahi — isliye rollback utna hi achha
     jitna "kuch toota?" batane wala test.</p>
     <h3>🧩 Teen parton ka snapshot</h3>
     <ul>
       <li><b>File system — copy-on-write</b>: snapshot = ek marker; aage ke writes naye blocks mein, purane
       blocks wahi. Snapshot ka time constant (1 MB ho ya 1 GB) → har kadam par snapshot.</li>
       <li><b>Code — auto git commit</b> har kaam ke kadam par (user ko git chhoona bhi nahi padta), aur ek
       <b>immutable backup remote</b> — poora FS mit jaaye tab bhi history.</li>
       <li><b>Database — forkable Postgres</b>: chalte DB ko CoW karna seedha nahi (live connections, WAL);
       isliye snapshot = fork jo parent se data share karta hai jab tak likha na jaaye. Rollback = fork phenko.</li>
     </ul>`,
    `<h3>📏 Lab 29: asli disk par snapshots</h3>
     <pre>project   mode   pehla snapshot   10 snapshots ke baad disk   baad ke snapshots (avg)   rollback
 200 MB  full       324 ms      1973.1 MB                676.4 ms               478 ms, 200 files
 200 MB  cow     1541.6 ms       202.2 MB                  5.7 ms               187 ms,   5 files</pre>
     <p>Full copy: har snapshot poora project (676 ms, 10 snapshots = ~2 GB). CoW: pehla mehenga (sab hash),
     uske baad <b>5.7 ms</b> aur sirf badle blocks. Snapshot itna sasta ho tabhi agent <b>har</b> kadam se
     pehle le sakta hai.</p>
     <h3>🍴 Parallel sampling</h3>
     <p>Fork sasta hai → ek mushkil kadam ke liye 3 alag tareeke ek saath try karo, jo kaam kare woh rakho.
     Model ka non-determinism faayda ban jaata hai. Lab: retry ka intezaar nahi (rounds kam), par compute
     <b>~3×</b> — aur chhupi galtiyan wahi ki wahi, kyunki forks bhi tests se behtar nahi dekh sakte.</p>
     <p class="tip">🎯 Video ki sabse zaroori line: <b>reversibility hi autonomy ko mumkin banati hai.</b>
     User agent ko tabhi aazaadi deta hai jab use pata ho ki ek button se sab wapas.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — full copy vs copy-on-write snapshots',
      project: '29-replit',
      exercise: 'ex1-snapshots',
      goal: '1 MB aur 200 MB project par 10 kadam, har kadam se pehle snapshot — full copy vs CoW. Phir agent project todta hai → rollback.',
      why: `<code>services/workspace.js</code> asli disk par project banata hai. <code>cow</code> = files 64 KB
        blocks mein, har block ka naam uska SHA-256, snapshot = sirf "kaunse blocks" ki list, aur na badli file
        dobara hash bhi nahi hoti (dirty tracking).`,
      steps: [
        { text: 'Workspace service chalao.', cmd: 'cd docker-labs/29-replit && npm start ex1-snapshots', expect: 'ex1-snapshots\n[workspace] :5071 data=…/data' },
        { text: 'Chaaron combinations chalao.', cmd: 'node tools/snapshots.js', expect: '   1 MB  full      15.8 ms         9.9 MB                 18.1 ms                17.6 ms, 200 files, 5 → 0\n   1 MB  cow       19.3 ms         1.3 MB                  1.9 ms                 4.6 ms,   5 files, 5 → 0\n 200 MB  full       324 ms      1973.1 MB                676.4 ms               478.3 ms, 200 files, 5 → 0\n 200 MB  cow     1541.6 ms       202.2 MB                  5.7 ms               187.5 ms,   5 files, 5 → 0' },
      ],
      observe: {
        q: 'CoW ka PEHLA snapshot full copy se bhi dheema (1541 vs 324 ms). Phir bhi CoW kyun jeeta?',
        choices: [
          'Pehla ek baar ka kharcha hai; uske baad har snapshot 5.7 ms aur disk 10× kam — agent har kadam par snapshot le sakta hai',
          'Pehla snapshot galat naapa gaya',
          'CoW sirf chhote projects par jeet-ta hai',
          'Full copy mein data loss hota hai',
        ],
        answer: 0,
        explain: 'Mehenga kaam ek baar, sasta kaam har baar — wahi asymmetry jo YouTube ke transcode mein bhi hai.',
      },
      lesson: 'Snapshot ki keemat tay karti hai ki woh kitni baar liya ja sakta hai — aur wahi tay karta hai ki undo kitna kaam ka hai.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — 30 kadam: no-undo vs rollback vs 3 forks',
      project: '29-replit',
      exercise: 'ex2',
      goal: '1,000 agent runs, har kadam mein 5% ya 15% risk — kitne projects poore sahi bane?',
      why: `<code>tools/agent.js</code>: tests 80% galtiyan pakadte hain. <code>no-undo</code> pakdi galti ko
        aage-aage theek karne ki koshish karta hai (50/50). <code>rollback</code> snapshot par wapas jaake
        dobara. <code>rollback+3</code> har kadam ke 3 forks ek saath.`,
      steps: [
        { text: 'Simulation chalao — 5% risk wali rows dekho.', cmd: 'cd docker-labs/29-replit && node tools/agent.js', expect: '      5%           no-undo          38.9%                       31.2                31.2\n      5%           rollback         71.0%                       31.2                31.2\n      5%           rollback+3       74.8%                       30.0                90.0' },
        { text: 'Ab 15% risk wali rows — galtiyan kitni tezi se judti hain?', cmd: 'node tools/agent.js | grep "15%"', expect: '     15%           no-undo           6.8%                       33.7                33.7\n     15%           rollback         32.0%                       33.9                33.9\n     15%           rollback+3       35.1%                       30.0                90.1' },
      ],
      observe: {
        q: '3 parallel forks ne sahi projects sirf 71% → 74.8% kiye, par compute 3× kar diya. Kyun?',
        choices: [
          'Bachi hui galtiyan woh hain jo tests pakadte hi nahi — forks bhi unhe nahi dekh sakte. Forks ka asli faayda wall-clock (retry ka intezaar nahi) hai',
          'Forks mein bug hai',
          'Forks ek dusre ko overwrite karte hain',
          '3 bahut kam hain, 30 chahiye',
        ],
        answer: 0,
        explain: 'Rollback ki limit test ki limit hai. Behtar tests > zyada forks.',
      },
      lesson: 'Undo galtiyon ko "jama" hone se rokta hai. Par kaunsi galti hai, yeh test batata hai.',
    },
  ],
  interview: {
    title: 'Interview Round — reversibility',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Agent ke liye undo design karo — files, code, DB."',
        choices: [
          'FS: copy-on-write snapshots har kadam par; code: auto git commits + immutable remote; DB: fork per session/kadam, rollback = fork discard — user ko ek button',
          'Raat ka backup',
          'Agent se kehna "galti mat karo"',
          'Har kadam ke baad poora folder zip',
        ],
        answer: 0,
        explain: 'Teen alag state, teen alag tareeke, ek button.',
      },
      {
        q: 'Interviewer: "Snapshot engine mein bug ho toh?"',
        choices: [
          'Data loss — isliye snapshot engine ko "perfect" hona padta hai; yeh poore platform ka sabse zaroori, sabse zyada test hone wala hissa',
          'Koi baat nahi, dobara snapshot le lenge',
          'User ko pata nahi chalega',
          'Agent khud theek kar lega',
        ],
        answer: 0,
        explain: 'Video: surface area ka kharcha — snapshot galat = data loss, isolation galat = security incident.',
      },
    ],
  },
  success: [
    'Main samjha sakta hoon ki lambe agent tasks mein galtiyan kaise jud-ti hain',
    'Main teen parton ka snapshot design kar sakta hoon',
    'Main lab ke numbers se CoW aur rollback ka faayda dikha sakta hoon',
  ],
  homework: `<p>Apne sabse lambe automated process (deploy script, data migration, batch job) ke liye likho:
    beech mein tootne par "wapas kahan jaate ho"? Agar jawab "shuru se" ya "manually theek karte hain" hai,
    toh ek checkpoint/snapshot kahan lagaoge?</p>`,
  cards: [
    { front: 'Agent ke liye undo ke teen part?', back: 'FS: copy-on-write snapshot (constant time). Code: auto git commit + immutable remote. DB: forkable Postgres (fork discard = rollback).' },
    { front: 'Lab 29: 200 MB par full vs CoW?', back: 'Full: har snapshot 676 ms, 10 snapshots ~2 GB. CoW: pehla 1.5 s, phir 5.7 ms, disk 202 MB.' },
    { front: 'Lab 29: 5% risk par no-undo vs rollback?', back: '38.9% vs 71.0% projects poore sahi — same compute. 3 forks: 74.8% par 3× compute.' },
  ],
},
]);

})();
