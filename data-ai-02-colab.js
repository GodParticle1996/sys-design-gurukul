/* =====================================================================
   TRACK — 🤖 AI Companies · Google Colab: muft GPU, anjaan code

   Source: "How Google Gives Away Free GPUs" (Akhil Sharma).
   Ek hi faisla do problems sulajhata hai: har session ek PHENKNE LAYAK
   sandbox — security (anjaan ka code) bhi, economics (muft GPU) bhi.
   Docker lab: docker-labs/12-colab
   ===================================================================== */
(function () {

VISUALS['colab-isolation'] = {
  t: 'Container, VM, aur beech ka raasta (gVisor)',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">📦</span><span class="nl">Container</span>
        <span class="ns">apni files/processes dikhte hain, par saare containers ka EK host kernel.<br>Ek kernel bug = poori building</span></div>
      <div class="dg-node is-gold"><span class="ni">🖥️</span><span class="nl">Poori VM</span>
        <span class="ns">apna kernel — sabse mazboot.<br>Par boot, reserved RAM/CPU: laakhon 10-min muft sessions ke liye bhaari</span></div>
      <div class="dg-node is-good"><span class="ni">🛡️</span><span class="nl">gVisor</span>
        <span class="ns">user-space "application kernel" (Sentry, Go mein).<br>Code ki syscall Sentry pakadta hai; host kernel tak sirf chhota, jaancha hua set</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🐍 notebook code</span><span class="dg-arrow">→ syscall →</span>
      <span class="dg-pill acc">🛡️ Sentry (emulate)</span><span class="dg-arrow">→ chhota set →</span>
      <span class="dg-pill good">🐧 host kernel</span>
    </div>
    <div class="dg-cap">Bahar nikalne ke liye ab <b>do alag taale</b> todne padenge: Sentry ka bug AUR host kernel ka alag bug.
      Tax sirf syscall par lagta hai — isliye ML (matrix math) ke liye lagbhag muft, database ke liye bhaari.</div>`,
};

VISUALS['colab-disposable'] = {
  t: 'Recipe hamesha ki, rasoi udhaar ki',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">📓 Notebook (.ipynb) — durable</span>
        <div class="dg-cap">Drive mein JSON: cells, code, outputs. Yeh <b>recipe</b> hai — kal bhi wahi.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🍳 Runtime — phenkne layak</span>
        <div class="dg-cap">Variables, <code>pip install</code>, downloaded files. Yeh <b>udhaar ki rasoi</b> hai —
          disconnect / idle / time limit par <b>delete</b>, pause nahi.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">📍</span><span class="cmd">Jagah mein chhota</span><span class="q">gVisor sandbox — bahar nikalna do taale todna</span></div>
      <div class="dg-rung g"><span class="lv">⏳</span><span class="cmd">Samay mein chhota</span><span class="q">har session saaf image se, khatam hote hi machine delete — pair jamaane ki jagah nahi</span></div>
    </div>`,
};

VISUALS['colab-rationing'] = {
  t: 'GPU = library ki kitaab, ghar ki nahi',
  html: `
    <div class="dg-stack">
      <div class="dg-node is-good"><span class="ni">👩‍🎓</span><span class="nl">Interactive user (abhi code likh raha hai)</span><span class="ns">sabse pehle GPU</span></div>
      <div class="dg-node is-gold"><span class="ni">😴</span><span class="nl">Tab khula, 90 min se koi cell nahi</span><span class="ns">GPU wapas pool mein</span></div>
      <div class="dg-node is-gold"><span class="ni">⏰</span><span class="nl">12 ghante ho gaye</span><span class="ns">free tier ki hadd — lambi training paid tier par</span></div>
      <div class="dg-node is-bad"><span class="ni">⛏️</span><span class="nl">Mining / hosting / remote desktop</span><span class="ns">pakdo, throttle ya band</span></div>
    </div>
    <div class="dg-cap">Lab 12 (150 GPUs, ek din): bina niyam 412 students ko GPU mila hi nahi, 46% GPU-time khule tabs ne pakda.
      Colab jaise niyam: har interactive user ko 5 minute ke andar GPU. <b>Scale par scheduler hi product hai.</b></div>`,
};

SD.registerLevels('ai', [
/* =====================================================================
   1. colab-isolation
   ===================================================================== */
{
  id: 'colab-isolation',
  icon: '🛡️',
  title: 'Colab — anjaan ka code, apni machine par',
  badge: 'Sandbox Sipahi',
  objectives: [
    'Container vs poori VM vs gVisor — kaunsa kitna bachata hai, kitne mein',
    'Syscall kya hai aur sandbox ka tax kahan lagta hai',
    '"Workload faisla karta hai, benchmark nahi"',
    'Threat model ke hisaab se isolation chunna',
  ],
  lesson: [
    `<h3>😬 Problem: laakhon anjaan log, tumhari machines par, apna code</h3>
     <p>Colab mein koi bhi login karke apna Python chala sakta hai — Google ke hardware par, muft GPU
     ke saath, bina kisi review ke. Woh code files mita sakta hai, network scan kar sakta hai, crypto
     mine kar sakta hai. Do mushkil sawaal ek saath:</p>
     <ul>
       <li><b>Security</b> — anjaan code ko band kaise rakhein?</li>
       <li><b>Economics</b> — muft GPU dene ka paisa kaise bachayein?</li>
     </ul>
     <p>Google ka jawab ek hi faisla hai: <b>har session ek phenkne layak sandbox</b>. Pehle security
     wala hissa.</p>
     <h3>📨 Syscall = darwaaze ke neeche se parchi</h3>
     <p>Program khud disk, network ya memory nahi chhoota. Jab bhi use kuch "asli" karna ho — file
     kholni ho, packet bhejna ho — woh kernel ko ek parchi bhejta hai: <b>system call (syscall)</b>.
     Isolation ka poora khel isi parchi ke raaste ka hai.</p>
     <table>
       <tr><th></th><th>📦 Container</th><th>🖥️ VM</th><th>🛡️ gVisor</th></tr>
       <tr><td>Kernel</td><td>Sab containers ka ek hi host kernel</td><td>Har VM ka apna</td><td>User-space "Sentry" beech mein</td></tr>
       <tr><td>Escape ke liye</td><td>Ek kernel bug</td><td>Hypervisor bug</td><td>Sentry bug + alag host kernel bug</td></tr>
       <tr><td>Kharcha</td><td>Sabse sasta</td><td>Boot + reserved RAM/CPU</td><td>Sirf syscalls par tax</td></tr>
       <tr><td>Kiske liye</td><td>Apna bharosemand code</td><td>Paranoid / multi-tenant bhaari</td><td>Anjaan code, container ki keemat par</td></tr>
     </table>`,
    `<h3>🛡️ gVisor ka jugaad</h3>
     <p>gVisor (open source) ek <b>application kernel</b> hai jo user space mein chalta hai. Uska
     hissa <b>Sentry</b> Linux ka bada hissa Go mein dobara likhta hai (memory-safe). Notebook ka code
     syscall karta hai → Sentry beech mein pakad leta hai → khud emulate karta hai → host kernel tak
     sirf ek <b>chhota, fixed, jaancha hua</b> set pahunchta hai. Aur Sentry khud bhi sandbox mein,
     kam privileges ke saath.</p>
     <p>Bahar nikalne ke liye attacker ko ab <b>do alag taale</b> todne padenge — Sentry ka bug aur
     host kernel ka alag bug. Dono ka code alag hai, toh ek bug doosre ka darwaaza nahi kholta.</p>
     <h3>💸 Tax kahan lagta hai? Workload batata hai</h3>
     <p>Har syscall ab ek extra hop hai. Jo software <b>bahut syscalls</b> karta hai (database, load
     balancer — video: ~10–30% dheema) usko dard hota hai. Colab ka kaam? Matrix math — hot loop mein
     OS ko pukaar hi nahi, aur GPU asli accelerator par poori speed se chalta hai. Sandbox code ke
     <b>chaaron taraf</b> hai, math ke <b>andar</b> nahi.</p>
     <p>Lab 12 mein yahi naapa (toy sentry, ek TCP hop):</p>
     <pre>compute (matrix math, 4 syscalls):  direct 1750 ms   sentry 1610 ms   ← farq noise hai
io (4,050 chhoti file ops):         direct  680 ms   sentry 5787 ms   ← 8–11× dheema</pre>
     <p class="tip">🎯 "Sandbox X% dheema karta hai" — yeh sawaal adhoora hai. Poora sawaal: <b>kis
     kaam ko?</b> Wahi deewar database ke liye bhaari, ML ke liye lagbhag muft.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Kaunsa isolation kiske liye?',
      instructions: 'Har halat ko sahi isolation se jodo.',
      pairs: [
        { left: '🏢 Apni team ke microservices, apne CI se bane images', right: 'Container — bharosemand code, sabse sasta', explain: 'Threat model chhota hai: code tumhara hai. Container ki halki deewar kaafi hai.' },
        { left: '🐍 Laakhon anjaan logon ke notebooks, muft', right: 'gVisor — VM jaisi deewar, container ki keemat', explain: 'Anjaan code par ek kernel bug poori building hai; poori VM har 10-min session ke liye bahut bhaari.' },
        { left: '🏦 Alag-alag bank customers ke bhaari workloads ek hardware par', right: 'Poori VM (ya microVM) — sabse mazboot deewar', explain: 'Paranoid threat model aur lambe sessions — boot ka kharcha chal jaata hai.' },
        { left: '🗄️ Database jo har second hazaron syscalls karta hai', right: 'Sandbox ka tax bhaari — dhyan se naapo', explain: 'Syscall-heavy kaam par gVisor jaisi deewar ~10–30% (video) — yahan workload faisla karta hai.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — sandbox ka tax kis kaam par?',
      project: '12-colab',
      exercise: 'ex1-syscall-tax',
      goal: 'Ek hi "sentry" ke through compute aur IO kaam chalao, aur dekho tax kahan lagta hai.',
      why: `<code>services/sentry.js</code> gVisor ke Sentry ka khilona hai: code file operation seedha OS
        se nahi karta, sentry ko message bhejta hai; sentry check karke khud karta hai. Asli gVisor
        isse kahin tez hai — numbers ka size mat pakdo, <b>pattern</b> pakdo.`,
      steps: [
        { text: 'Sentry chalao.', cmd: 'cd docker-labs/12-colab && npm start ex1-syscall-tax', expect: 'ex1-syscall-tax\nsentry → tcp://localhost:4811  (sirf data/ ke andar write/read/unlink)' },
        { text: 'Compute kaam — seedha aur sentry ke through.', cmd: 'node tools/workload.js --kind compute --mode direct && node tools/workload.js --kind compute --mode sentry', expect: 'kind=compute mode=direct syscalls=   4  time= 1750 ms\nkind=compute mode=sentry syscalls=   4  time= 1610 ms' },
        { text: 'IO kaam — 4,050 chhoti file operations.', cmd: 'node tools/workload.js --kind io --mode direct && node tools/workload.js --kind io --mode sentry', expect: 'kind=io      mode=direct syscalls=4050  time=  680 ms\nkind=io      mode=sentry syscalls=4050  time= 5787 ms' },
      ],
      observe: {
        q: 'Compute par sentry ka farq noise jitna, IO par 8–11×. Colab ke liye iska matlab?',
        choices: [
          'Colab ka kaam compute-bound hai (matrix math, GPU) — hot loop mein syscalls hi nahi, isliye mazboot deewar lagbhag muft',
          'Sandbox hamesha 10× dheema karta hai',
          'Colab ko sandbox nahi lagana chahiye',
          'IO kaam hamesha tez hota hai',
        ],
        answer: 0,
        explain: 'Tax sirf syscall par lagta hai. Jis kaam mein syscalls kam, uspar deewar ki keemat kam.',
      },
      lesson: 'Isolation ki keemat workload se naapo, benchmark se nahi.',
    },
  ],
  interview: {
    title: 'Interview Round — untrusted code chalana',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Online code judge banana hai — users ka C++ code chalega. Isolation?"',
        choices: [
          'Container akela nahi (shared kernel); gVisor ya microVM jaisi mazboot deewar, bina network, CPU/memory/time limits, aur har run ke baad sandbox phenk do',
          'Docker container mein chala do, kaafi hai',
          'Code ko pehle ek AI se check karwa lo',
          'Sirf bharosemand users ko allow karo',
        ],
        answer: 0,
        explain: 'Anjaan code ka threat model = kernel bug bhi. Deewar + limits + disposability.',
      },
      {
        q: 'Interviewer: "gVisor lagane se hamari API 25% dheemi hui. Kya galat hua?"',
        choices: [
          'Kuch galat nahi — API server syscall-heavy hai (network, files); tax wahi lagta hai. Poochho: kya is service ka threat model is deewar ko justify karta hai?',
          'gVisor mein bug hai',
          'Server chhota hai',
          'Sandbox ko GPU chahiye',
        ],
        answer: 0,
        explain: 'Workload faisla karta hai. Bharosemand code ke liye container kaafi ho sakta hai.',
      },
    ],
  },
  success: [
    'Main container, VM aur gVisor ka farq syscall ke raaste se samjha sakta hoon',
    'Main bata sakta hoon ki sandbox ka tax kis workload par lagta hai',
    'Main threat model ke hisaab se isolation chun sakta hoon',
  ],
  homework: `<p>Apne 3 services lo aur har ek ke liye likho: (1) code kiska hai — tumhara, customer ka,
    anjaan ka? (2) woh syscall-heavy hai ya compute-heavy? Ab har ek ke liye isolation chuno aur ek
    line mein tark likho. Lab 12 ke "Khud try karo" #3 bhi karo: 10 file ops ko ek message mein batch
    karo — sentry ka tax kitna gira?</p>`,
  cards: [
    { front: 'Container ki kamzori?', back: 'Saare containers ek hi host kernel share karte hain — ek kernel bug = container escape = poori building.' },
    { front: 'gVisor kya karta hai?', back: 'User-space "application kernel": Sentry (Go) code ki syscalls pakad ke khud emulate karta hai; host kernel tak sirf chhota jaancha hua set. Escape = do alag bugs.' },
    { front: 'Sandbox tax kahan lagta hai?', back: 'Sirf syscalls par. DB/load balancer (syscall-heavy): ~10–30% (video). ML/matrix math: lagbhag zero. Lab: compute noise, IO 8–11×.' },
  ],
},

/* =====================================================================
   2. colab-disposable
   ===================================================================== */
{
  id: 'colab-disposable',
  icon: '♻️',
  title: 'Phenkne layak session — jagah aur samay dono mein chhota',
  badge: 'Disposable Dost',
  objectives: [
    'Blast radius jagah mein (sandbox) aur samay mein (delete) — dono',
    'Notebook (durable recipe) vs runtime (udhaar ki rasoi)',
    'Base image mein pehle se kya pakaayein',
    'Untrusted output ko browser mein kaise dikhayein — alag origin ke iframe',
  ],
  lesson: [
    `<h3>⏳ Samay bhi ek deewar hai</h3>
     <p>gVisor ne <b>jagah</b> chhoti ki. Colab <b>samay</b> bhi chhota karta hai: har session ek saaf
     base image se shuru hota hai, aur disconnect, idle ya time limit par machine <b>delete</b> hoti
     hai — pause nahi. "Disconnect and delete runtime" button yahi hai.</p>
     <p>Attacker ke liye iska matlab: kuch bhi tika ke rakhne ki jagah nahi. Na backdoor, na chhupi
     file, na agle user ka intezaar. Har session ek naya kamra, aur jaate hi kamra gira diya.</p>
     <h3>📓 Recipe vs 🍳 rasoi</h3>
     <p>Isliye Colab do cheezon ko ekdum alag rakhta hai:</p>
     <ul>
       <li><b>Notebook</b> (<code>.ipynb</code>, Drive mein JSON) — cells, code, outputs. <b>Durable.</b>
       Kal bhi wahi.</li>
       <li><b>Runtime</b> — variables, <code>pip install</code>, downloaded files. <b>Phenkne layak.</b>
       Isi liye har session mein <code>pip install</code> dobara karna padta hai.</li>
     </ul>
     <p>"Your runtime was disconnected" koi web glitch nahi — door ki machine gayab ho gayi. Datasets,
     models, logs chahiye toh Drive mount karo — durable jagah par rakho.</p>`,
    `<h3>🍞 Base image — jo roz chahiye, pehle se pakaa lo</h3>
     <p>Agar har session delete hoga, toh har session ka shuru hona sasta hona chahiye. Base image mein
     frameworks, GPU drivers, data libraries pehle se — taaki user ko 10 minute install na karna pade.
     Jo kam log use karte hain woh <code>pip install</code> se.</p>
     <h3>🖼️ Browser bhi ek deewar</h3>
     <p>Notebook ke outputs mein HTML, JavaScript, widgets ho sakte hain — anjaan user ka banaya hua.
     Colab unhe <b>sandboxed iframe</b> mein, ek <b>alag origin</b> par dikhata hai. Taaki kisi notebook
     ka JavaScript tumhare Google account ki cookies ya Drive tak na pahunche.</p>
     <h3>🔁 Ek cell ka poora safar</h3>
     <pre>Shift+Enter → hamesha khula connection → runtime (saaf image, gVisor, shayad GPU)
→ syscalls Sentry ko, math GPU par → output wapas stream
→ alag-origin iframe mein render → notebook Drive mein autosave
→ idle → poori machine wapas pool mein</pre>
     <p class="tip">🎯 Pattern jo har jagah kaam aata hai: <b>kaam ki ikaai ko phenkne layak banao</b>
     (safe bhi, sasta bhi), aur <b>durable ko disposable se alag rakho</b>.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Recipe ya rasoi?',
      instructions: 'Session delete hone ke baad kya bachega?',
      bins: [
        { id: 'durable', label: '📓 Bachega (durable)' },
        { id: 'gone', label: '🍳 Jaayega (runtime ke saath)' },
      ],
      items: [
        { text: 'Notebook ke cells aur unka code', bin: 'durable', explain: '.ipynb Drive mein JSON ki tarah save hota hai.' },
        { text: 'Python variable jisme training ka model hai (save nahi kiya)', bin: 'gone', explain: 'Variables runtime ki memory mein the — machine gayi, woh gaye.' },
        { text: '<code>pip install transformers</code>', bin: 'gone', explain: 'Har session saaf base image se — install dobara.' },
        { text: 'Drive mount karke usme likha model checkpoint', bin: 'durable', explain: 'Drive durable jagah hai — isi liye bade datasets/models wahan rakho.' },
        { text: '/content mein download ki hui CSV', bin: 'gone', explain: 'Runtime ki local disk bhi machine ke saath jaati hai.' },
        { text: 'Cell ka output (chart) jo notebook mein save hua', bin: 'durable', explain: 'Outputs notebook file ka hissa hain.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Disposable ki samajh',
      questions: [
        {
          q: 'Session khatam hone par machine PAUSE karne ki jagah DELETE kyun?',
          choices: [
            'Security (attacker ke liye tika rehne ki jagah nahi) aur economics (GPU turant pool mein wapas) — ek hi faisle se dono',
            'Delete karna pause se tez hai',
            'Pause Linux mein nahi hota',
            'Users ko delete pasand hai',
          ],
          answer: 0,
          explain: 'Samay mein chhota blast radius + recycle hone wala GPU. Yahi Colab ka core faisla hai.',
        },
        {
          q: 'Notebook ka JavaScript output alag origin ke iframe mein kyun?',
          choices: [
            'Taaki anjaan notebook ka code tumhare account ki cookies/Drive tak na pahunche',
            'Taaki output jaldi load ho',
            'Taaki GPU use ho',
            'Iframe mein chart sundar dikhta hai',
          ],
          answer: 0,
          explain: 'Browser bhi ek deewar hai. Same origin par hota toh notebook ka script tumhare naam se kaam kar sakta tha.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — ephemeral environments',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "CI runners mein ek build ne malware chhoda jo agle builds mein secrets chura raha tha. Fix?"',
        choices: [
          'Har job ek naye, saaf, phenkne layak runner par — job ke baad delete. Durable cheezein (cache, artifacts) alag, jaanchi hui jagah',
          'Antivirus laga do',
          'Runner ko har hafte reboot karo',
          'Sirf senior engineers builds chalayein',
        ],
        answer: 0,
        explain: 'Samay mein blast radius: kuch tik hi na paaye. Colab ka hi pattern.',
      },
      {
        q: 'Interviewer: "Users shikayat karte hain ki har session mein 5 min install lagta hai."',
        choices: [
          'Aam cheezein base image mein pehle se pakao; kam use wali on-demand; data/model Drive jaisi durable jagah se mount',
          'Machines delete karna band kar do',
          'Users ko ek hi machine hamesha de do',
          'Install ko background mein chupa do',
        ],
        answer: 0,
        explain: 'Disposable tabhi chalta hai jab shuru hona sasta ho.',
      },
    ],
  },
  success: [
    'Main blast radius ko jagah aur samay dono mein chhota karne ka design bata sakta hoon',
    'Main durable aur disposable state ko alag kar sakta hoon',
    'Main untrusted output dikhane ka surakshit tareeka samjha sakta hoon',
  ],
  homework: `<p>Apne system mein ek "lambi umar" wali cheez dhoondho jo phenkne layak ho sakti hai —
    CI runner, dev environment, batch worker, preview environment. Likho: use disposable banane mein
    kya todna padega (kaunsi state kahin aur le jaani hogi), aur kya milega (security + recycling).</p>`,
  cards: [
    { front: 'Colab ka core faisla?', back: 'Har session ek phenkne layak sandbox: saaf image se shuru, khatam hote hi delete. Security (tika rehne ki jagah nahi) + economics (GPU recycle) dono.' },
    { front: 'Notebook vs runtime?', back: 'Notebook (.ipynb, Drive) = durable recipe. Runtime (variables, pip installs, local files) = udhaar ki rasoi, session ke saath gayab.' },
    { front: 'Untrusted HTML/JS output kaise dikhayein?', back: 'Sandboxed iframe, alag origin par — taaki script tumhare account ki cookies/data tak na pahunche.' },
  ],
},

/* =====================================================================
   3. colab-rationing
   ===================================================================== */
{
  id: 'colab-rationing',
  icon: '🎟️',
  title: 'Muft GPU ka rashan — scheduler hi product hai',
  badge: 'Rashan Raja',
  objectives: [
    'GPU pool ek library hai: idle reclaim aur time cap',
    'Abuse (mining, hosting) ko pakadna — aur niyam chhupa ke kyun rakhte hain',
    'Paid tiers kaise free tier ko chalate hain',
    'Lab mein naapna: niyam badle toh kaun GPU paata hai',
  ],
  lesson: [
    `<h3>📚 GPU library ki kitaab hai</h3>
     <p>Muft GPU tabhi chal sakta hai jab ek GPU bahut logon ke kaam aaye. Colab GPUs ko ek <b>shared
     pool</b> maanta hai — library ki kitaab ki tarah: padh lo, lauta do.</p>
     <ul>
       <li><b>Idle reclaim</b> — ~90 minute tak koi cell nahi chala → GPU wapas pool mein.</li>
       <li><b>Hard cap</b> — free tier mein ~12 ghante. Do din ki training free pool ka kaam nahi.</li>
       <li><b>Priority</b> — jo abhi sach mein code likh raha hai (interactive), use pehle.</li>
       <li><b>Abuse</b> — SSH server, remote desktop, hamesha-on web service, file hosting, torrents,
       crypto mining → throttle ya band. Detection ke niyam <b>chhupe</b> rehte hain — batana matlab
       unse bachne ka tareeka batana.</li>
     </ul>
     <p class="tip">🎯 "Runtime disconnected after idle" koi bug nahi — <b>rashan</b> hai.</p>
     <h3>💳 Paid tiers — free ka khaata</h3>
     <p>Pro, Pro+, pay-as-you-go compute units, Colab Enterprise: priority, behtar GPUs, lambe
     runtimes, background execution. Do kaam hote hain: paise se free tier ka kharcha chalta hai, aur
     bhaari users (lambi training) <b>free pool se bahar</b> chale jaate hain. Free tier = funnel +
     goodwill, ek soch-samajh ke liya gaya ghaata.</p>`,
    `<h3>📏 Lab 12 — ek din, 150 GPUs</h3>
     <p>900 interactive users (thoda kaam, phir tab khula chhod diya), 40 trainers (10–30 ghante),
     30 miners (24 ghante 100% GPU). Teen policies:</p>
     <pre>policy | interactive 5 min mein GPU | kabhi nahi mila | avg wait | GPU time: kaam / idle pakda / miner / khaali
none   |                      12.6% |             412 |  319 min | 29.1% / 46.4% / 19.2% / 5.2%
idle   |                      20.7% |              19 |   74 min | 45%   / 30.3% / 19.2% / 5.4%
colab  |                       100% |               0 |    0 min | 41.9% / 33.5% /  0.8% / 23.7%</pre>
     <ul>
       <li><b>none</b>: GPU ka <b>46%</b> waqt khule tabs ne pakda, 19% miners ne khaaya. 412 students ko
       din bhar GPU mila hi nahi.</li>
       <li><b>idle reclaim</b> akela: "kabhi nahi mila" 412 → 19.</li>
       <li><b>Colab ke saare niyam</b>: har interactive user ko 5 minute ke andar GPU.</li>
     </ul>
     <p>Aur 100 GPUs par? Colab niyam bhi sabko turant nahi de paate (12.2% in 5 min, avg 48 min wait) —
     par koi khaali haath nahi lauta. Isi liye free tier <b>"no guarantees"</b> kehta hai, aur paid tier
     usi line mein aage ki jagah bechta hai.</p>
     <p class="tip">🎯 Hardware wahi, niyam badle — aur 412 log se 0. <b>Scale par scheduler hi product hai.</b></p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Rashan ke niyam',
      instructions: 'Idle timeout, time cap aur abuse detection badlo — dekho kaun GPU paata hai.',
      goal: 'Aisi setting dhoondho jahan interactive users ka wait <b>10 min se kam</b>, "khule tab" wala waste <b>40% se kam</b>, aur ek normal user ka kaam beech mein <b>na toote</b> (idle timeout ≥ 45 min).',
      scenario: `Tumhare paas 150 GPUs hain aur ek din mein 900 students, 40 lambi trainings,
        30 miners. Niyam tum banao.`,
      knobs: [
        { id: 'idle', label: 'Idle timeout (minute)', min: 15, max: 480, step: 15, value: 480, unit: ' min', note: 'Itni der koi cell nahi → GPU wapas. Chhota = zyada recycling, par chai peene gaye user ka runtime gaya.' },
        { id: 'cap', label: 'Free tier ki hadd (ghante)', min: 2, max: 48, step: 2, value: 48, unit: ' h', note: 'Lambi training free pool ko rokti hai.' },
        { id: 'abuse', label: 'Abuse detection (0 = band, 1 = chalu)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Miners ko pakdo.' },
      ],
      readouts: k => {
        const m = colabModel(k);
        return [
          { label: 'Interactive user ka avg wait', value: m.wait + ' min', tone: m.wait <= 10 ? 'ok' : 'bad' },
          { label: 'GPU-time jo khule tabs ne pakda', value: m.idlePct + '%', tone: m.idlePct < 40 ? 'ok' : 'bad' },
          { label: 'GPU-time miners ka', value: m.minerPct + '%', tone: m.minerPct < 5 ? 'ok' : 'warn' },
          { label: 'Chai peene gaye user ka runtime gaya?', value: k.idle < 45 ? 'haan 😠' : 'nahi', tone: k.idle < 45 ? 'bad' : 'ok' },
        ];
      },
      bars: k => {
        const m = colabModel(k);
        return [
          { label: 'Wait (min)', pct: Math.min(100, m.wait / 3.2), text: m.wait + ' min', tone: m.wait <= 10 ? 'ok' : 'bad' },
          { label: 'Idle waste', pct: m.idlePct, text: m.idlePct + '%', tone: m.idlePct < 40 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = colabModel(k);
        if (k.idle < 45) return { ok: false, text: `Idle timeout <b>${k.idle} min</b> bahut chhota — user chai peene gaya aur variables gaye. Recycling achhi, par product toot gaya.` };
        if (m.wait > 10) return { ok: false, text: `Interactive users <b>${m.wait} min</b> wait kar rahe hain. Dekho kaun GPU pakde baitha hai: khule tabs (${m.idlePct}%) ya miners (${m.minerPct}%)?` };
        if (m.idlePct >= 40) return { ok: false, text: `Khule tabs ab bhi GPU ka <b>${m.idlePct}%</b> pakde hain. Idle timeout chhota karo.` };
        return { ok: true, text: `Wait <b>${m.wait} min</b>, idle waste <b>${m.idlePct}%</b>, miners <b>${m.minerPct}%</b>. Yahi Colab ka balance hai — aur lambi training paid tier ki taraf.` };
      },
      check: k => { const m = colabModel(k); return k.idle >= 45 && m.wait <= 10 && m.idlePct < 40; },
      lesson: `Teen niyam, teen alag chor: idle timeout <b>khule tab</b> pakadta hai, time cap <b>lambi training</b>,
        abuse detection <b>miners</b>. Ek niyam doosre ka kaam nahi karta.`,
      quiz: {
        q: 'Abuse detection ke niyam public kyun nahi kiye jaate?',
        choices: [
          'Niyam batana = unse bachne ka tareeka batana; yeh cat-and-mouse ka khel hai',
          'Google ko khud nahi pata',
          'Legal wajah se',
          'Niyam bahut lambe hain',
        ],
        answer: 0,
        explain: 'Security by obscurity akela kaafi nahi, par detection ke thresholds chhupana abuse ko mehenga banata hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — ek din, 150 GPUs, teen policies',
      project: '12-colab',
      exercise: 'ex2-gpu-pool',
      goal: 'Same users, same GPUs — sirf scheduling ke niyam badlo aur dekho kaun GPU paata hai.',
      why: `<code>lib/pool-sim.js</code> ek poora din (1,440 minute) chalata hai, seeded random — har run
        same number. Policies: <code>none</code>, <code>idle</code> (90 min idle reclaim),
        <code>colab</code> (idle + 12 h cap + miner pakdo + interactive pehle).`,
      steps: [
        { text: 'Pool simulator chalao.', cmd: 'cd docker-labs/12-colab && npm start ex2-gpu-pool', expect: 'ex2-gpu-pool\npool → http://localhost:4812/simulate?policy=none|colab' },
        { text: '150 GPUs par teeno policies.', cmd: 'node tools/pool-report.js', expect: 'none   |                      12.6% |             412 |  319 min | 29.1% / 46.4% / 19.2% / 5.2% | 0\nidle   |                      20.7% |              19 |   74 min | 45% / 30.3% / 19.2% / 5.4% | 617\ncolab  |                       100% |               0 |    0 min | 41.9% / 33.5% / 0.8% / 23.7% | 770' },
        { text: 'Kami ho toh? 100 GPUs.', cmd: 'node tools/pool-report.js --gpus 100', expect: 'colab  |                      12.2% |               0 |   48 min | 46.9% / 48.4% / 1.3% / 3.4% | 701' },
      ],
      observe: {
        q: '100 GPUs par Colab niyam bhi sirf 12.2% users ko 5 min mein GPU dete hain. Product ke liye iska matlab?',
        choices: [
          'Free tier "no guarantees" kehta hai — aur paid tier usi line mein aage ki jagah bechta hai',
          'Colab ke niyam kaam nahi karte',
          'Aur GPUs khareedna hi ek raasta hai',
          'Idle timeout hata dena chahiye',
        ],
        answer: 0,
        explain: 'Kami mein bhi koi khaali haath nahi lauta (avg 48 min) — par guarantee nahi. Priority hi paid product hai.',
      },
      lesson: 'Hardware wahi, niyam badle — "kabhi GPU nahi mila" 412 se 0. Scheduler hi product hai.',
    },
  ],
  interview: {
    title: 'Interview Round — shared GPU pool',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Company ke 80 GPUs, 300 data scientists. Log GPU pakad ke baithe rehte hain. Design?"',
        choices: [
          'Pool + idle reclaim (utilization se, sirf time se nahi) + max session length + lambi training alag queue/cluster par; notebooks/checkpoints durable storage par taaki reclaim se kaam na khoye',
          'Har data scientist ko ek GPU de do',
          'Pehle aao pehle pao',
          'GPU ke liye Slack par request',
        ],
        answer: 0,
        explain: 'Colab ka pattern: rashan + interactive priority + bhaari kaam alag. Aur reclaim tabhi theek hai jab durable state alag ho.',
      },
      {
        q: 'Interviewer: "Idle timeout 15 minute kar dein? Utilization badhega."',
        choices: [
          'Utilization badhega par users ka kaam bar-bar tootega (variables gaye) — metric sudhra, product bigda. Timeout ko user behaviour se tay karo aur checkpoint aasaan banao',
          'Haan, jitna chhota utna accha',
          'Nahi, timeout hona hi nahi chahiye',
          'Timeout se koi farq nahi padta',
        ],
        answer: 0,
        explain: 'Har rashan ka niyam kisi ko dukh deta hai — sawaal hai kisko aur kitna.',
      },
    ],
  },
  success: [
    'Main shared GPU pool ke liye rashan ke niyam design kar sakta hoon',
    'Main samjha sakta hoon ki paid tiers free tier ko kaise chalate hain',
    'Main lab ke numbers se "scheduler hi product hai" dikha sakta hoon',
  ],
  homework: `<p>Lab 12 ke "Khud try karo" chalao: (1) idle reclaim 90 → 30 min — "idle pakda" kitna gira,
    aur kitne users ka runtime kaam ke beech gaya? (2) miners 30 → 100 — <code>colab</code> policy
    kitna sambhalti hai? Dono ke numbers apne notes mein likho.</p>`,
  cards: [
    { front: 'Colab GPU rashan ke teen niyam?', back: 'Idle ~90 min → reclaim; free tier ~12 h hadd; abuse (mining, hosting, remote desktop) pakdo. Plus interactive users ko priority.' },
    { front: 'Lab 12: bina niyam vs Colab niyam (150 GPUs)?', back: 'none: 412 users ko GPU mila hi nahi, 46% GPU-time khule tabs ne pakda. colab: har interactive user ko 5 min ke andar.' },
    { front: 'Paid tiers ka do-tarfa kaam?', back: 'Paisa free tier ka kharcha chalata hai, aur bhaari users (lambi training) free pool se bahar chale jaate hain.' },
  ],
},
]);

/* Toy model — lab 12 ke numbers ke aas-paas, sirf trend dikhane ke liye */
function colabModel(k) {
  const idleFactor = Math.min(1, k.idle / 480);
  const idlePct = Math.round(10 + 38 * idleFactor);
  const minerPct = k.abuse ? 1 : 19;
  const trainerPct = Math.round(4 + 14 * Math.min(1, k.cap / 48));
  const busy = idlePct + minerPct + trainerPct;
  const wait = Math.max(0, Math.round(Math.pow(Math.max(0, busy - 25), 1.35) * 1.4));
  return { idlePct, minerPct, trainerPct, wait };
}

})();
