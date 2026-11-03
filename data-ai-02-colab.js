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
  html: "\n    <div class=\"dg-grid\">\n      <div class=\"dg-node is-bad\"><span class=\"ni\">📦</span><span class=\"nl\">Container</span>\n        <span class=\"ns\">apni files/processes dikhte hain, par saare containers ka EK host kernel.<br>Reachable host vulnerability/config flaw isolation risk</span></div>\n      <div class=\"dg-node is-gold\"><span class=\"ni\">🖥️</span><span class=\"nl\">Poori VM</span>\n        <span class=\"ns\">apna kernel — sabse mazboot.<br>Par boot, reserved RAM/CPU: laakhon 10-min muft sessions ke liye bhaari</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">🛡️</span><span class=\"nl\">gVisor</span>\n        <span class=\"ns\">user-space \"application kernel\" (Sentry, Go mein).<br>Code ki syscall Sentry pakadta hai; host kernel tak sirf chhota, jaancha hua set</span></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">🐍 notebook code</span><span class=\"dg-arrow\">→ syscall →</span>\n      <span class=\"dg-pill acc\">🛡️ Sentry (emulate)</span><span class=\"dg-arrow\">→ chhota set →</span>\n      <span class=\"dg-pill good\">🐧 host kernel</span>\n    </div>\n    <div class=\"dg-cap\">gVisor host syscall exposure kam karke defense layers add karta hai. Escape ke liye exact vulnerability chain configuration and attack surface par depend karti hai; fixed two-bug guarantee nahi.\n      Tax sirf syscall par lagta hai — isliye ML (matrix math) ke liye lagbhag muft, database ke liye bhaari.</div>",
};

VISUALS['colab-disposable'] = {
  t: 'Recipe hamesha ki, rasoi udhaar ki',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">📓 Notebook (.ipynb) — durable</span>\n        <div class=\"dg-cap\">Drive mein JSON: cells, code, outputs. Yeh <b>recipe</b> hai — kal bhi wahi.</div></div>\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">🍳 Runtime — phenkne layak</span>\n        <div class=\"dg-cap\">Variables, <code>pip install</code>, downloaded files. Yeh <b>udhaar ki rasoi</b> hai —\n          disconnect / idle / time limit par <b>delete</b>, pause nahi.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-ladder\">\n      <div class=\"dg-rung\"><span class=\"lv\">📍</span><span class=\"cmd\">Jagah mein chhota</span><span class=\"q\">gVisor: host syscall exposure ghataane ki extra boundary</span></div>\n      <div class=\"dg-rung g\"><span class=\"lv\">⏳</span><span class=\"cmd\">Samay mein chhota</span><span class=\"q\">har session saaf image se, khatam hote hi machine delete — pair jamaane ki jagah nahi</span></div>\n    </div>",
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
    "<h3>😬 Problem: laakhon anjaan log, tumhari machines par, apna code</h3>\n     <p>Colab mein koi bhi login karke apna Python chala sakta hai — Google ke hardware par, muft GPU\n     ke saath, bina kisi review ke. Woh code files mita sakta hai, network scan kar sakta hai, crypto\n     mine kar sakta hai. Do mushkil sawaal ek saath:</p>\n     <ul>\n       <li><b>Security</b> — anjaan code ko band kaise rakhein?</li>\n       <li><b>Economics</b> — muft GPU dene ka paisa kaise bachayein?</li>\n     </ul>\n     <p>Google ka jawab ek hi faisla hai: <b>har session ek phenkne layak sandbox</b>. Pehle security\n     wala hissa.</p>\n     <h3>📨 Syscall = darwaaze ke neeche se parchi</h3>\n     <p>Program ordinary mapped user memory directly load/store kar sakta hai. File open, network operations aur address-space management jaise privileged services kernel interface se jaate hain: <b>system calls</b>.\n     Isolation ka poora khel isi parchi ke raaste ka hai.</p>\n     <table>\n       <tr><th></th><th>📦 Container</th><th>🖥️ VM</th><th>🛡️ gVisor</th></tr>\n       <tr><td>Kernel</td><td>Sab containers ka ek hi host kernel</td><td>Har VM ka apna</td><td>User-space \"Sentry\" beech mein</td></tr>\n       <tr><td>Escape ke liye</td><td>Reachable host-kernel/runtime/config flaw</td><td>Guest/host or hypervisor escape path</td><td>Sandbox/host/config attack path; fixed bug-count nahi</td></tr>\n       <tr><td>Kharcha</td><td>Sabse sasta</td><td>Boot + reserved RAM/CPU</td><td>Workload/platform-dependent syscall, memory, network aur runtime overhead</td></tr>\n       <tr><td>Kiske liye</td><td>Apna bharosemand code</td><td>Paranoid / multi-tenant bhaari</td><td>Anjaan code, container ki keemat par</td></tr>\n     </table>",
    "<h3>🛡️ gVisor ka jugaad</h3>\n     <p>gVisor (open source) ek <b>application kernel</b> hai jo user space mein chalta hai. Uska\n     hissa <b>Sentry</b> Linux ka bada hissa Go mein dobara likhta hai (memory-safe). Notebook ka code\n     syscall karta hai → Sentry beech mein pakad leta hai → khud emulate karta hai → host kernel tak\n     sirf ek <b>chhota, fixed, jaancha hua</b> set pahunchta hai. Aur Sentry khud bhi sandbox mein,\n     kam privileges ke saath.</p>\n     <p>Application kernel host interfaces ko restrict karke defense in depth deta hai. Actual escape chain implementation, host/config privileges, platform aur exposed services par depend karti hai. Har escape ke liye exactly two independent bugs required hain: yeh guarantee nahi.</p>\n     <h3>💸 Tax kahan lagta hai? Workload batata hai</h3>\n     <p>gVisor syscall transitions, memory, networking and filesystem paths par workload/platform-dependent overhead laata hai. CPU-heavy user-space loops aur syscall-heavy work alag behavior dikha sakte hain. Video ke percentages historical examples hain, universal ratio nahi. Is Node lab mein real gVisor ya GPU acceleration benchmark nahi hua.</p>\n     <p>Lab 12 mein yahi naapa (toy sentry, ek TCP hop):</p>\n     <pre>compute (matrix math, 4 syscalls):  direct 1750 ms   sentry 1610 ms   ← farq noise hai\nio (4,050 chhoti file ops):         direct  680 ms   sentry 5787 ms   ← 8–11× dheema</pre>\n     <p class=\"tip\">🎯 \"Sandbox X% dheema karta hai\" — yeh sawaal adhoora hai. Poora sawaal: <b>kis\n     kaam ko?</b> Representative database/ML workload, runtime platform, memory/network paths aur security assumptions ke saath measure karo; ML overhead zero assume mat karo.</p>",
  ],
  stages: [
    {
      type: 'match',
      title: 'Kaunsa isolation kiske liye?',
      instructions: 'Har halat ko sahi isolation se jodo.',
      pairs: [
        { left: '🏢 Apni team ke microservices, apne CI se bane images', right: 'Container — bharosemand code, sabse sasta', explain: 'Threat model chhota hai: code tumhara hai. Container ki halki deewar kaafi hai.' },
        { left: '🐍 Laakhon anjaan logon ke notebooks, muft', right: "gVisor — application-kernel boundary, measured overhead", explain: "Threat model se container/application-kernel/VM boundary choose karo. Startup, compatibility and resource cost measure karo; equal protection/cost universal nahi." },
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
        khilone se kahin tez hai — numbers ka size mat pakdo, <b>pattern</b> pakdo.`,
      steps: [
        { text: 'Sentry chalao.', cmd: 'cd docker-labs/12-colab && npm start ex1-syscall-tax', expect: 'ex1-syscall-tax\nsentry → tcp://localhost:4811  (sirf data/ ke andar write/read/unlink)' },
        { text: 'Compute kaam — seedha aur sentry ke through.', cmd: 'node tools/workload.js --kind compute --mode direct && node tools/workload.js --kind compute --mode sentry', expect: 'kind=compute mode=direct syscalls=   4  time= 1750 ms\nkind=compute mode=sentry syscalls=   4  time= 1610 ms' },
        { text: 'IO kaam — 4,050 chhoti file operations.', cmd: 'node tools/workload.js --kind io --mode direct && node tools/workload.js --kind io --mode sentry', expect: 'kind=io      mode=direct syscalls=4050  time=  680 ms\nkind=io      mode=sentry syscalls=4050  time= 5787 ms' },
      ],
      observe: {
        q: 'Compute par sentry ka farq noise jitna, IO par 8–11×. Colab ke liye lab ka matlab?',
        choices: [
          'Colab ka kaam compute-bound hai (matrix math) — hot loop mein syscalls kam, deewar ka tax bhi kam',
          'Har sandbox ka tax hamesha 10× hota hai — Colab ko bhi har kaam par 10× dheema chalna padega',
          'Notebooks compute-bound hote hain, isliye Colab ko file ya IO ki fikar hi nahi karni',
          'Compute par sandbox ka kharcha hamesha bilkul zero hota hai, kisi bhi platform par',
        ],
        answer: 0,
        explain: 'Is chhote TCP-sentry experiment mein baar-baar file operations extra round trips se mehenge hue; compute ka farq noise tha. Asli gVisor ka overhead platform, syscall/memory/network raaston aur workload par nirbhar hai — lab gVisor ka benchmark nahi.',
        choiceExplanations: [
          'Is chhote TCP-sentry experiment mein baar-baar file operations extra round trips se mehenge hue; compute ka farq noise tha. Asli gVisor ka overhead platform, syscall/memory/network raaston aur workload par nirbhar hai — lab gVisor ka benchmark nahi.',
          'Compute par farq noise jitna tha — 10× sirf IO par.',
          'Kai notebooks data padhte-likhte hain. IO wala kaam bhi hota hai.',
          'Lab ka toy setup hai. Asli platform par kuch na kuch overhead hota hai.',
        ],
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
          'Container akela nahi (shared kernel) — gVisor/microVM, bina network, CPU/memory/time limits, har run phenko',
          'Docker image ka naam bharosemand ho toh container hi kaafi — image se isolation poori ho jaati hai',
          'Code pehle ek AI se review karwa lo — AI ne theek kaha toh hostile code bhi safe ho jaata hai',
          'Sirf bharosemand users ko allow karo — checkbox par tick hai toh user ka code bhi bharosemand',
        ],
        answer: 0,
        explain: 'Anjaan code ka threat model = kernel bug bhi. Deewar + limits + phenkne layak run.',
        choiceExplanations: [
          'Anjaan code ka threat model = kernel bug bhi. Deewar + limits + phenkne layak run.',
          'Container kernel share karta hai — kernel bug se bahar nikla ja sakta hai.',
          'AI review chhupa hua hamla chhod sakta hai.',
          'User ka account hack ho sakta hai — checkbox deewar nahi.',
        ],
      },
      {
        q: 'Interviewer: "gVisor lagane se hamari API 25% dheemi hui. Kya galat hua?"',
        choices: [
          'Shayad kuch galat nahi — API syscall-heavy hai; profile karo, threat model se deewar tolo',
          'Ek run mein 25% dheema hua, toh gVisor mein bug pakka hai — bug report karke gVisor hatao',
          'GPU jod do — GPU aate hi network aur file syscalls ka saara kharcha API se hat jaayega',
          'Threat review ke bina sandbox band kar do — 25% speed security se zyada zaroori hai',
        ],
        answer: 0,
        explain: 'Asli jaisa workload profile karo: syscall transitions, filesystem/network ka raasta, memory aur CPU overhead alag naapo. Risk aur compatibility se isolation chuno; ek 25% ka naap bug ya universal tax prove nahi karta.',
        choiceExplanations: [
          'Asli jaisa workload profile karo: syscall transitions, filesystem/network ka raasta, memory aur CPU overhead alag naapo. Risk aur compatibility se isolation chuno; ek 25% ka naap bug ya universal tax prove nahi karta.',
          'Ek naap se bug saabit nahi hota — syscall-heavy kaam par tax normal hai.',
          'GPU network aur file ke syscalls nahi hata-ta.',
          'Threat model dekhe bina deewar hatana khatra badhata hai.',
        ],
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
    { front: 'Container ki kamzori?', back: "Containers host kernel share kar sakte hain; reachable kernel/runtime vulnerabilities and misconfiguration isolation risk hain. Har kernel bug exploitable escape nahi; privileges and defense layers matter karte hain." },
    { front: 'gVisor kya karta hai?', back: "User-space application kernel guest syscall interface implement karke host exposure reduce karta hai. Independent sandboxing layers useful hain, lekin escape ka fixed two-bug rule nahi; configuration and implementation threat model verify karo." },
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
        { text: 'Notebook ke cells aur cells ka code', bin: 'durable', explain: '.ipynb Drive mein JSON ki tarah save hota hai.' },
        { text: 'Python variable jisme training ka model hai (save nahi kiya)', bin: 'gone', explain: 'Variables runtime ki memory mein the — machine gayi, variables bhi gaye.' },
        { text: '<code>pip install transformers</code>', bin: 'gone', explain: 'Har session saaf base image se — install dobara.' },
        { text: 'Drive mount karke usme likha model checkpoint', bin: 'durable', explain: 'Drive durable jagah hai — isliye bade datasets/models Drive par rakho.' },
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
            'Security (attacker ke tikne ki jagah nahi) aur economics (GPU turant pool mein) — ek faisla, do faayde',
            'Pause karne se machine ki state apne aap mit jaati hai, toh pause aur delete ek hi baat',
            'Delete karne se user ki Drive wali notebooks bhi mit jaati hain, isliye delete hi saaf hai',
            'Machine delete karne se har tarah ka attack hamesha ke liye namumkin ho jaata hai',
          ],
          answer: 0,
          explain: 'Samay mein chhota blast radius + recycle hone wala GPU. Yahi Colab ka core faisla hai.',
          choiceExplanations: [
            'Samay mein chhota blast radius + recycle hone wala GPU. Yahi Colab ka core faisla hai.',
            'Pause state ko rakhta hai — attacker bhi bacha rehta hai.',
            'Drive wali notebooks alag durable jagah par hain — delete se bachi rehti hain.',
            'Delete tikne ki jagah chheenta hai; session ke andar ka hamla phir bhi ho sakta hai.',
          ],
        },
        {
          q: 'Notebook ka JavaScript output alag origin ke iframe mein kyun?',
          choices: [
            'Taaki anjaan notebook ka script tumhare account ki cookies aur Drive tak na pahunche',
            'Iframe tag lagate hi har tarah ka access hamesha band — origin ka koi lena-dena nahi',
            'Same origin par script apne aap safe hota hai, iframe sirf chart sundar dikhane ke liye',
            'Iframe mein GPU acceleration milti hai, isliye output iframe ke andar tez render hota hai',
          ],
          answer: 0,
          explain: 'Browser bhi ek deewar hai. Same origin par hota toh notebook ka script tumhare naam se kaam kar sakta tha.',
          choiceExplanations: [
            'Browser bhi ek deewar hai. Same origin par hota toh notebook ka script tumhare naam se kaam kar sakta tha.',
            'Same-origin iframe parent ki cookies tak pahunch sakta hai — alag origin chahiye.',
            'Same origin script tumhare naam se kaam kar sakta hai — safe nahi.',
            'Iframe ka GPU se koi lena-dena nahi.',
          ],
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
          'Har job ek naye, saaf runner par, job ke baad delete; cache aur artifacts alag, jaanchi hui jagah',
          'Runner ko har hafte reboot karo — reboot ke saath disk par tika malware bhi chala jaayega',
          'Runner par antivirus laga do — antivirus har build ke beech tika malware hamesha pakad lega',
          'Sirf senior engineers builds chalayein — senior ka likha build hamesha bharosemand hota hai',
        ],
        answer: 0,
        explain: 'Samay mein blast radius: kuch tik hi na paaye. Colab ka hi pattern.',
        choiceExplanations: [
          'Samay mein blast radius: kuch tik hi na paaye. Colab ka hi pattern.',
          'Hafte bhar tak malware agle builds ke secrets churata rahega.',
          'Antivirus naya malware chhod sakta hai.',
          'Malware dependency se aaya ho sakta hai — senior bhi nahi rok paayenge.',
        ],
      },
      {
        q: 'Interviewer: "Users shikayat karte hain ki har session mein 5 min install lagta hai."',
        choices: [
          'Aam packages base image mein pehle se pakao; kam wale on-demand; data/model durable jagah se mount',
          'Har user ko apna permanent GPU host de do — packages ek baar install, phir kabhi nahi',
          'Wahi gande runners hamesha rakho — install pehle se pada hai, toh dobara nahi karna',
          'Install ka intezaar sirf UI mein chhupa do — sundar loading spinner dikhao, waqt wahi rahe',
        ],
        answer: 0,
        explain: 'Phenkne layak session tabhi chalta hai jab shuru hona sasta ho.',
        choiceExplanations: [
          'Phenkne layak session tabhi chalta hai jab shuru hona sasta ho.',
          'Permanent GPU host bahut mehenga hai aur attacker ko tikne deta hai.',
          'Gande runner pichhle user ka kachra aur khatra rakhte hain.',
          'Chhupane se 5 minute kam nahi hote.',
        ],
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
    "<h3>📏 Lab 12 — ek din, 150 GPUs</h3>\n     <p>900 interactive users (thoda kaam, phir tab khula chhod diya), 40 trainers (10–30 ghante),\n     30 miners (24 ghante 100% GPU). Teen policies:</p>\n     <pre>policy | interactive 5 min mein GPU | kabhi nahi mila | avg wait | GPU time: kaam / idle pakda / miner / khaali\nnone   |                      12.6% |             412 |  319 min | 29.1% / 46.4% / 19.2% / 5.2%\nidle   |                      20.7% |              19 |   74 min | 45%   / 30.3% / 19.2% / 5.4%\ncolab  |                       100% |               0 |    0 min | 41.9% / 33.5% /  0.8% / 23.7%</pre>\n     <ul>\n       <li><b>none</b>: GPU ka <b>46%</b> waqt khule tabs ne pakda, 19% miners ne khaaya. 412 students ko\n       din bhar GPU mila hi nahi.</li>\n       <li><b>idle reclaim</b> akela: \"kabhi nahi mila\" 412 → 19.</li>\n       <li><b>Colab ke saare niyam</b>: har interactive user ko 5 minute ke andar GPU.</li>\n     </ul>\n     <p>Aur 100 GPUs par? Colab niyam bhi sabko turant nahi de paate (12.2% in 5 min, avg 48 min wait) —\n     par koi khaali haath nahi lauta. Isi liye free tier <b>\"no guarantees\"</b> kehta hai, aur paid tier\n     usi line mein aage ki jagah bechta hai.</p>\n     <p class=\"tip\">🎯 Hardware wahi, niyam badle — aur 412 log se 0. <b>Scale par scheduler hi product hai.</b></p>",
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Rashan ke niyam',
      instructions: 'Idle timeout, time cap aur abuse detection badlo — dekho kaun GPU paata hai.',
      goal: "Interactive wait <b>10 min ya kam</b>, idle-tab waste <b>40% se kam</b>, aur normal user ke liye idle timeout <b>45 min ya zyada</b> rakho.",
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
          'Niyam bata diye toh bachna aasan — detection ki hadd badalte rehna padta hai, cat-and-mouse',
          'Chhupi hadd hi akeli defense hai — niyam chhupe hain toh aur kisi layer ki zaroorat nahi',
          'Chhupe niyam ki koi audit ho hi nahi sakti, isliye Google niyam public nahi karta',
          'Niyam public hote hi enforcement bilkul bekaar ho jaata — koi bhi rok nahi lagti',
        ],
        answer: 0,
        explain: 'Security by obscurity akela kaafi nahi, par detection ki hadd chhupana abuse ko mehenga banata hai.',
        choiceExplanations: [
          'Security by obscurity akela kaafi nahi, par detection ki hadd chhupana abuse ko mehenga banata hai.',
          'Obscurity akeli kaafi nahi — baaki layers bhi chahiye.',
          'Andar ki audit chhupe niyam ki bhi ho sakti hai.',
          'Public niyam bhi kuch rokte hain — bas bachna aasan ho jaata hai.',
        ],
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
        q: "100 GPUs par Colab niyam bhi sirf 12.2% users ko 5 min mein GPU dete hain. Product ke liye 12.2% ka matlab?",
        choices: [
          'Lab kami dikhata hai — muft tier par guarantee mat maano; pakki capacity ke liye vaada chahiye',
          'Saari paid requests ko GPU ki pakki guarantee hai — paid hote hi line ki koi fikar nahi',
          'Ek simulation se aaj ka Colab pricing saabit ho gaya — asli daam bhi yahi hain',
          'Idle reclaim hamesha band kar do — reclaim hi users ko GPU milne se rok raha hai',
        ],
        answer: 0,
        explain: 'Lab ek simulated GPU pool ka result hai, aaj ke Colab SLA ya pricing ka saboot nahi. Priority scheduling intezaar ghata sakti hai; pakki capacity ke liye saaf service commitment chahiye.',
        choiceExplanations: [
          'Lab ek simulated GPU pool ka result hai, aaj ke Colab SLA ya pricing ka saboot nahi. Priority scheduling intezaar ghata sakti hai; pakki capacity ke liye saaf service commitment chahiye.',
          'Paid tier line mein aage jagah deta hai — guarantee nahi.',
          'Simulation andaaza hai, aaj ke daam nahi.',
          'Reclaim GPU wapas pool mein laata hai — reclaim band toh aur kam GPU.',
        ],
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
          'Pool + quota + idle reclaim (utilization se) + durable checkpoints; lambi training alag',
          'Har data scientist ke liye ek dedicated GPU reserve — koi line nahi, koi jhagda nahi',
          'Pehle aao pehle pao — jo pehle aaya, GPU hamesha pehle aane wale ka, chhode tab tak',
          'Slack par request karo — team manually GPU baant degi, scheduler ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Colab ka pattern: rashan + interactive priority + bhaari kaam alag. Reclaim tabhi theek hai jab durable state alag ho.',
        choiceExplanations: [
          'Colab ka pattern: rashan + interactive priority + bhaari kaam alag. Reclaim tabhi theek hai jab durable state alag ho.',
          '80 GPUs aur 300 log — har ek ko dedicated mumkin hi nahi.',
          'GPU pakad ke baithna hi toh dikkat thi.',
          'Manual baantna dheema hai aur raat ko koi jawab nahi deta.',
        ],
      },
      {
        q: 'Interviewer: "Idle timeout 15 minute kar dein? Utilization badhega."',
        choices: [
          'Utilization badhega par users ka kaam baar-baar tootega — timeout user behaviour se tay karo',
          'Haan — sabse chhota timeout hi sabse accha, kyunki utilization hi asli metric hai',
          'Timeout ka users par koi asar nahi — variables wapas aa jaate hain, kaam waisa hi',
          'Sirf RAM utilization dekh ke timeout tay karo — user kya kar raha hai, farq nahi',
        ],
        answer: 0,
        explain: 'Har rashan ka niyam kisi ko dukh deta hai — sawaal hai kisko aur kitna. Checkpoint aasaan banao.',
        choiceExplanations: [
          'Har rashan ka niyam kisi ko dukh deta hai — sawaal hai kisko aur kitna. Checkpoint aasaan banao.',
          'Metric sudhra, product bigda — utilization akela lakshya nahi.',
          'Timeout par session ke variables mit jaate hain — kaam tootta hai.',
          'User ka kaam dekhe bina timeout galat users ko kaatega.',
        ],
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
