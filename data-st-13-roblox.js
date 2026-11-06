/* =====================================================================
   TRACK — 🏢 Real Company Stories · Roblox: laakhon chhote, phenkne layak servers

   Source: "How ROBLOX Handles 47 Million Concurrent Gamers" (Akhil Sharma).
   (Transcript mein "Royal Garden" = Grow a Garden, "Death Rails" = Dead Rails.)
   Oct 2021 ka 73 ghante ka outage 📡 The Feed → "73 ghante ka death spiral"
   level mein detail mein hai; yahan uske baad ka architecture.
   Docker lab: docker-labs/27-roblox
   ===================================================================== */
(function () {

VISUALS['rbx-instances'] = {
  t: 'Game server ko bada mat karo — upar ki layer ko',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">🏰 MMO (WoW, EVE)</span>\n        <div class=\"dg-cap\">Ek hamesha ki duniya, shards mein (kuch hazaar log har ek), ek game ke liye custom. EVE ek universe ~1 lakh peak.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🧩 Roblox</span>\n        <div class=\"dg-cap\">Laakhon games, alag developers. Har game session = ek chhota server (<b>instance</b>, 10–200 players),\n          ek session jeeta hai, aakhri player gaya toh band. Aug 2025: 4.7 crore ek saath.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-ladder\">\n      <div class=\"dg-rung\"><span class=\"lv\">🏢</span><span class=\"cmd\">Platform layer</span><span class=\"q\">accounts, inventory, Robux, friends — kabhi mat khoo</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">🎯</span><span class=\"cmd\">Matchmaking</span><span class=\"q\">kaunsa player kaunse instance mein</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">🎮</span><span class=\"cmd\">Laakhon instances (sandbox + Luau)</span><span class=\"q\">game state memory mein, instance ke saath marta hai</span></div>\n      <div class=\"dg-rung g\"><span class=\"lv\">🖥️</span><span class=\"cmd\">Apne physical servers</span><span class=\"q\">800,000+ · 24 edge DCs + 2 core DCs</span></div>\n    </div>",
};

VISUALS['rbx-luau'] = {
  t: 'Sandbox ek bhasha ki problem hai',
  html: "\n    <div class=\"dg-grid\">\n      <div class=\"dg-node is-good\"><span class=\"ni\">🧱</span><span class=\"nl\">Har script ka apna global table</span><span class=\"ns\">doosre scripts dikhte hi nahi</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">✂️</span><span class=\"nl\">Stdlib kaati</span><span class=\"ns\">system chhoone/bahar nikalne wale hisse hataye; ek GC hook bhi</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">🛡️</span><span class=\"nl\">Memory-safe implementation</span><span class=\"ns\">memory bug se native code chalana namumkin</span></div>\n      <div class=\"dg-node is-accent\"><span class=\"ni\">🏷️</span><span class=\"nl\">Gradual types</span><span class=\"ns\">9 saal ke bachche se pro studio tak; inference</span></div>\n      <div class=\"dg-node is-gold\"><span class=\"ni\">⚡</span><span class=\"nl\">Native codegen (2024)</span><span class=\"ns\">hot scripts → machine code, numeric 2–3× tez; types compiler ko madad</span></div>\n    </div>\n    <div class=\"dg-cap\">Lua 5.1 se fork (2019 ship, 2021 open source); interpreter C++ mein dobara — lagbhag LuaJIT jitni speed, consoles par bhi.</div>",
};

VISUALS['rbx-matchmaker'] = {
  t: 'Matchmaker hi asli product',
  html: "\n    <div class=\"dg-grid\">\n      <div class=\"dg-node\"><span class=\"ni\">📡</span><span class=\"nl\">1. Latency</span><span class=\"ns\">24 edge DCs mein sabse paas</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">👫</span><span class=\"nl\">2. Dost</span><span class=\"ns\">jahan dost pehle se khel rahe</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">⚖️</span><span class=\"nl\">3. Load</span><span class=\"ns\">bhara bahar; lagbhag-bhara bhi bura agar dost aane wale</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">📜</span><span class=\"nl\">4. Developer rules</span><span class=\"ns\">region se group ya mix</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">💰</span><span class=\"nl\">5. Naya vs purana</span><span class=\"ns\">naya server = paisa; aadhe-khaali hazaar mat kholo</span></div>\n    </div>\n    <div class=\"dg-cap\">&lt; 100 ms mein faisla. Lab 27 (20,000 joins): fill-first → ping 152 ms, 14% dost saath; smart → ping 38 ms, <b>100%</b> dost saath, utne hi servers.</div>",
};

VISUALS['rbx-cells'] = {
  t: 'Weekend ka time pata hai, size nahi',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">Mon</span><span class="cmd">Kya toota — review</span><span class="q">pichhle weekend ki seekh</span></div>
      <div class="dg-rung"><span class="lv">Tue</span><span class="cmd">Capacity planning</span><span class="q">kaunse games badh rahe hain</span></div>
      <div class="dg-rung a"><span class="lv">roz</span><span class="cmd">Chaos testing</span><span class="q">live system ke hisse maaro — containment sabit karo</span></div>
      <div class="dg-rung g"><span class="lv">Fri</span><span class="cmd">Weekend ki lehar ke liye extra</span><span class="q">+ public cloud mein burst cells</span></div>
    </div>
    <div class="dg-cap">Grow a Garden ne ~2 mahine mein platform peak dugna kiya; Dead Rails 0 → ~10 lakh lagbhag raaton-raat. Isliye backend
      bhi <b>cells</b> mein — aur cloud sirf burst ke liye.</div>`,
};

SD.registerLevels('stories', [
/* =====================================================================
   1. rbx-instances
   ===================================================================== */
{
  id: 'rbx-instances',
  icon: '🎮',
  title: 'Roblox — ek badi duniya nahi, laakhon chhote kamre',
  badge: 'Instance Ustaad',
  objectives: [
    'MMO shards vs Roblox instances',
    '"Game server ko mat badhao — upar ki layer ko"',
    'Game state vs platform state — kya marne do, kya kabhi nahi',
    'Lab: instance crash — kya gaya, kya bacha, kitne prabhavit',
  ],
  lesson: [
    "<h3>🌍 4.7 crore ek saath</h3>\n     <p>Aug 2025: 4.7 crore log ek saath (ek saal pehle peak ~1 crore) — zyadatar ek game (<b>Grow a Garden</b>) ne ~2 mahine mein\n     platform ka peak dugna kiya. WoW/Final Fantasy: ek shared duniya mein kuch hazaar; EVE Online ka ek universe ~1 lakh peak;\n     Roblox ~500× us se. Apni bhasha, apne hardware par apna cloud, aur ulta architecture.</p>\n     <h3>🏠 Ek bada mahal vs laakhon chhote kamre</h3>\n     <p>~15 saal pehle ka faisla: <b>game server ko bada mat karo — us layer ko karo jo tay karti hai kaunsa server kaunsa game\n     kin players ke liye.</b></p>\n     <ul>\n       <li><b>MMO</b>: ek hamesha ki duniya, shards mein bati (kuch hazaar har ek), ek game ke liye custom.</li>\n       <li><b>Roblox</b>: platform par laakhon games, alag rules/physics/size. Har game session = ek chhota server,\n       <b>instance</b> (kuch darjan players; developer 10–200 cap chunta hai), ek session jeeta hai (20 min se kuch ghante),\n       aakhri player gaya → band, resources wapas pool mein.</li>\n     </ul>\n     <p>Saikdon hazaar instances ek saath, aapas mein baat nahi karte, aur 4.7 crore ka koi global tracker nahi. Crash = sirf 40–100\n     log, seconds mein naye instance mein. Chhote phenkne layak servers → <b>coordination hi product ban jaata hai</b>.</p>",
    `<h3>💾 Kya marne do, kya kabhi nahi</h3>
     <table>
       <tr><th></th><th>🎮 Game state</th><th>🏢 Platform state</th></tr>
       <tr><td>Kya</td><td>Position, health, score</td><td>Account, inventory, Robux, friends, purchases</td></tr>
       <tr><td>Kahan</td><td>Instance ki memory</td><td>Core DCs</td></tr>
       <tr><td>Instance mara toh</td><td>Gaya — aur yahi sahi</td><td>Kabhi nahi khona</td></tr>
     </table>
     <p>Instance kabhi inventory apne paas nahi rakhta — platform layer se poochhta hai. Ek game mein hat kamaaya, doosre mein bhi hai.
     <b>Sirf zaroori state bachao, state bachane ke liye bani ek layer mein; baaki sasta aur phenkne layak.</b></p>
     <pre>lab 27 (ex2-crash) — 120 players, ek server SIGKILL:
3 instances × 40 → prabhavit 40, score gaya 40, hats bache 120/120
1 shard × 120    → prabhavit 120, score gaya 120, hats bache 120/120</pre>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — instance crash',
      project: '27-roblox',
      exercise: 'ex2-crash',
      goal: '120 players khel rahe hain, sabne ek hat kamaaya. Ek server SIGKILL — score (game state) aur hat (platform state) ka kya hua? Aur 3 chhote vs 1 bada?',
      why: `<code>services/fleet.js</code> asli instance processes chalata hai (ports 5040+). Score instance ki memory mein, hat
        <code>services/platform.js</code> mein. <code>POST /kill</code> = process SIGKILL.`,
      steps: [
        { text: 'Platform + fleet chalao.', cmd: 'cd docker-labs/27-roblox && npm start ex2-crash', expect: 'ex2-crash\n[platform] :5032 — inventory, hamesha ke liye\n[fleet] :5033' },
        { text: 'Crash test.', cmd: 'node tools/crash.js', expect: 'instances   3 server(s) × 40 players | crash → prabhavit  40 players, score gaya 40, hats bache 120/120\n           p0 naye instance :5043 mein: score 0 (naya match), inventory ["hat-5040-30"]\nshard       1 server(s) × 120 players | crash → prabhavit 120 players, score gaya 120, hats bache 120/120' },
      ],
      observe: {
        q: 'Score gaya par hat bacha. Kya score ko bhi bachana chahiye tha?',
        choices: [
          'Nahi — 10 minute ka match pakka banana mehenga aur bekaar; sirf hat, Robux jaisi platform state bachao',
          'Haan — match ka har tick purchase jitna hi pakka save ho, warna player naraaz ho jaayega',
          'Nahi — aur hat bhi temporary maano; crash par inventory bhi naye match ke saath nayi shuru ho',
          'Haan — runtime khud backup hai; crash ke baad naya instance purana score wapas laa deta hai',
        ],
        answer: 0,
        explain: 'Sirf wahi bachao jo bachna hi chahiye — ek layer mein. Player seconds mein naye match mein; hat aur Robux kabhi nahi khone chahiye.',
        choiceExplanations: [
          'Sirf wahi bachao jo bachna hi chahiye — ek layer mein. Player seconds mein naye match mein; hat aur Robux kabhi nahi khone chahiye.',
          'Har tick pakka save karna bahut mehenga hai, aur match ka score itna keemti nahi.',
          'Hat aur Robux paise se khareede gaye — inventory kabhi nahi khoni chahiye.',
          'Crash ke saath instance ki memory bhi gayi. Runtime backup nahi hai.',
        ],
      },
      lesson: 'Chhote instances = chhota blast radius; game state phenkne layak, platform state kabhi nahi.',
    },
    {
      type: 'bins',
      title: 'Instance mein ya platform mein?',
      instructions: 'Har data kahan rehna chahiye?',
      bins: [
        { id: 'inst', label: '🎮 Instance memory (marne do)' },
        { id: 'plat', label: '🏢 Platform (kabhi mat khoo)' },
      ],
      items: [
        { text: 'Player ki abhi ki position', bin: 'inst', explain: 'Har tick badalti — session ke saath jaaye.' },
        { text: 'Khareeda hua sword', bin: 'plat', explain: 'Paisa laga — kabhi nahi khona.' },
        { text: 'Is round ka score', bin: 'inst', explain: 'Round ke saath khatam.' },
        { text: 'Robux balance', bin: 'plat', explain: 'Economy — core DCs.' },
        { text: 'Friends list', bin: 'plat', explain: 'Har game mein chahiye.' },
        { text: 'Doosre player ki health bar', bin: 'inst', explain: 'Match ki haalat.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — game server architecture',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Multiplayer game platform — ek bada world ya kai chhote servers?"',
        choices: [
          'Sessions alag hain toh chhote per-session instances + matchmaking, aur pakki state alag platform layer mein',
          'Ek bada global world, bina kisi coordination ke — sab players ek hi jagah, sabse simple design',
          'P2P — har player ka client hi currency aur inventory ka maalik, server ki zaroorat hi nahi',
          'Har player ka apna poora world server — har player alag, toh koi kisi ko nahi gira sakta',
        ],
        answer: 0,
        explain: 'Roblox: "unit chhoti karo, bahut chalao." Blast radius chhota, scale by count.',
        choiceExplanations: [
          'Roblox: "unit chhoti karo, bahut chalao." Blast radius chhota, scale by count.',
          'Ek bada world ek galti se sabko gira deta hai, aur coordination bhaari hai.',
          'Client par currency ka maalik = cheating ka khula darwaaza.',
          'Multiplayer mein players ko saath khelna hai — alag world kaam ka nahi.',
        ],
      },
      {
        q: 'Interviewer: "Instance crash par player ki inventory?"',
        choices: [
          'Inventory instance mein kabhi nahi — platform service mein; instance sirf poochhe/likhe, idempotent grants',
          'Instance band hone se theek pehle shutdown hook mein inventory save karo — bas itna kaafi hai',
          'Har minute inventory ka snapshot lo — beech ka ek minute khona bhi chalega',
          'Client ka balance hi asli sach maano — client ke paas hai, toh crash ka asar hi nahi',
        ],
        answer: 0,
        explain: 'Lab: 120/120 hats bache. Crash mein shutdown hook chalta hi nahi — isliye inventory pehle se bahar rehni chahiye.',
        choiceExplanations: [
          'Lab: 120/120 hats bache. Crash mein shutdown hook chalta hi nahi — isliye inventory pehle se bahar rehni chahiye.',
          'Crash mein shutdown hook chalta hi nahi.',
          'Ek minute mein khareedi hui cheezein kho jaayengi — paise wali cheez ke liye galat.',
          'Client ko badla ja sakta hai — cheating.',
        ],
      },
    ],
  },
  success: [
    'Main MMO shards aur Roblox instances ka farq samjha sakta hoon',
    'Main game state vs platform state ka batwara kar sakta hoon',
    'Main lab se chhote instances ka blast radius dikha sakta hoon',
  ],
  homework: `<p>Apne system ki "kaam ki ikaai" dhoondho (request, session, job, tenant). Kya use chhota karke bahut saari copies chala
    sakte ho? Us ikaai ka kaunsa data marne diya ja sakta hai, aur kaunsa ek alag, durable layer mein jaana chahiye?</p>`,
  cards: [
    { front: 'Roblox ka core faisla?', back: 'Game server ko bada mat karo — upar ki layer (matchmaking) ko. Har session ek chhota instance (10–200 players), session ke baad band.' },
    { front: 'Game state vs platform state?', back: 'Game state (position, score) instance memory mein, instance ke saath mare — sahi. Platform state (inventory, Robux, friends) core DCs mein, kabhi nahi khona.' },
    { front: 'Lab 27: crash?', back: '3 × 40: 40 prabhavit; 1 × 120: 120 prabhavit. Dono mein hats 120/120 bache.' },
  ],
},

/* =====================================================================
   2. rbx-luau
   ===================================================================== */
{
  id: 'rbx-luau',
  icon: '🌙',
  title: 'Luau — laakhon anjaan developers ka code, surakshit',
  badge: 'Luau Lathait',
  objectives: [
    'Untrusted code server par AUR har player ke device par',
    'Sandbox bhasha ke andar: alag globals, kaati stdlib, memory safety',
    'Performance: C++ interpreter, native codegen',
    'Gradual types — safety aur speed dono',
  ],
  lesson: [
    "<h3>👧 9 saal ke bachche aur hackers — ek hi runtime</h3>\n     <p>Roblox par laakhon developers (bahut se bachche, kuch jaan-boojh ke dushman) ka code chalta hai — Roblox ke servers par\n     <b>aur</b> har player ke device par. Isliye apni bhasha: <b>Luau</b> — Lua 5.1 se fork, 2019 mein ship, 2021 mein open source.</p>\n     <h3>🛡️ Sandbox — bhasha mein hi</h3>\n     <ul>\n       <li><b>Har script ka apna global table</b> — doosre scripts ke globals dikhte hi nahi.</li>\n       <li><b>Stdlib kaati</b> — jo bhi hissa system chhoo sakta tha ya bahar nikal sakta tha, hataya; ek GC hook bhi (isolation + performance).</li>\n       <li><b>Memory-safe implementation</b> — dushman script memory bug se native code nahi chala sakta. Yahi sandbox asli attackers ke\n       saamne tikta hai.</li>\n     </ul>\n     <p class=\"tip\">🎯 Video ka sabak: <b>untrusted code chalana ho toh sandbox ek BHASHA ki problem hai</b>, poori gehrai tak — sirf\n     container ke upar ki deewar nahi. (Colab ne gVisor se OS level par kiya; Roblox ne language level par.)</p>",
    `<h3>⚡ Tez bhi chahiye</h3>
     <p>Stock Lua bahut dheema; LuaJIT consoles support nahi karta aur maintain karna mushkil. Toh interpreter <b>C++ mein dobara</b> —
     lagbhag LuaJIT jitni speed. 2024: servers par <b>native codegen</b> — hot scripts machine code ban jaate hain, numeric code
     2–3× tez.</p>
     <h3>🏷️ Gradual types</h3>
     <p>Users 9 saal ke bachche se professional studios tak → types optional, inference ke saath (Roblox ne paper bhi publish kiya).
     Aur ek twist: <b>type annotations compiler ko khilaate hain</b> → types performance ka tool bhi ban gaye.</p>`,
  ],
  stages: [
    {
      type: 'match',
      title: 'Kaunsa jugaad kis khatre ke liye?',
      instructions: 'Har Luau feature ko sahi kaam se jodo.',
      pairs: [
        { left: '🧱 Har script ka apna global table', right: 'Ek developer ka script doosre ka data/functions na chhed sake', explain: 'Isolation bhasha ke andar.' },
        { left: '✂️ Stdlib se system/IO hisse hataye', right: 'Script server ki files/network tak na pahunche', explain: 'Jo cheez hai hi nahi, use chura nahi sakte.' },
        { left: '🛡️ Memory-safe VM', right: 'Memory bug ke zariye native code chalana namumkin', explain: 'Asli attackers ke saamne tikne wala sandbox.' },
        { left: '🏷️ Gradual types', right: 'Bachche bina types, studios types ke saath — aur compiler ko hints', explain: 'Safety + speed.' },
        { left: '⚡ Native codegen', right: 'Hot scripts machine code — numeric 2–3× tez', explain: '2024, servers par.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Luau ki samajh',
      questions: [
        {
          q: 'Roblox ne LuaJIT kyun nahi liya?',
          choices: [
            'Consoles par JIT nahi chalta aur maintain karna mushkil — isliye apna tez C++ interpreter',
            'LuaJIT ka paid license zaroori tha, aur Roblox ke paas license ka budget nahi tha',
            'JIT har console par chalta tha, par LuaJIT dheema tha, isliye apna banaya',
            'Interpreter ko sandbox ki zaroorat nahi hoti, toh Roblox ne interpreter hi chuna',
          ],
          answer: 0,
          explain: 'Platform ki zaroorat (har device par chale) ne faisla kiya, aur apna interpreter poora control deta hai.',
          choiceExplanations: [
            'Platform ki zaroorat (har device par chale) ne faisla kiya, aur apna interpreter poora control deta hai.',
            'LuaJIT open source hai. License wajah nahi thi.',
            'Consoles par JIT allowed hi nahi hota.',
            'Anjaan code ke liye sandbox zaroori hai — Luau ka sandbox hi toh khaas hai.',
          ],
        },
        {
          q: 'Colab (gVisor) aur Roblox (Luau) ke sandbox mein farq?',
          choices: [
            'Colab ki deewar OS/syscall par (anjaan Python chale); Roblox ki bhasha par (sirf Luau, andar sab band)',
            'Dono mein koi bhi native code chal sakta hai — farq sirf naam ka hai, deewar ek jaisi',
            'Luau chalane se host ka kernel apne aap private ho jaata hai — OS ki deewar ki zaroorat nahi',
            'gVisor sirf source code ke types check karta hai — syscalls se gVisor ka koi lena-dena nahi',
          ],
          answer: 0,
          explain: 'Deewar kahan lagao — is par nirbhar hai ki kaunsa code chalana hai.',
          choiceExplanations: [
            'Deewar kahan lagao — is par nirbhar hai ki kaunsa code chalana hai.',
            'Luau native code nahi chalata — sirf Luau.',
            'Bhasha ki deewar ke saath bahar ki OS deewar bhi rakhte hain.',
            'gVisor syscalls ko beech mein pakad ke jaanchta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — user scripts',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare SaaS mein customers apne scripts (automation) chalayenge. Kaise?"',
        choices: [
          'Sandboxed language/VM ya WASM (CPU, memory, time limits) — aur bahar process/container ki deewar bhi',
          'Customer ka code app ke process mein hi eval() karo — sabse tez, aur alag setup bhi zero',
          'Customer ka Docker image chalao — image ka naam bharosemand hai toh security poori ho gayi',
          'Sirf code review karo — review ho gaya toh runtime par CPU ya memory limit ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Defense in depth — bhasha + OS dono.',
        choiceExplanations: [
          'Defense in depth — bhasha + OS dono.',
          'App ke process mein eval = customer ka code app ki saari permissions ke saath.',
          'Image ka naam security nahi; container ki deewar aur limits chahiye.',
          'Review runtime ki galti ya loop nahi rokta.',
        ],
      },
      {
        q: 'Interviewer: "Types optional rakhein ya zaroori?"',
        choices: [
          'Gradual — beginners bina types, bade codebases types ke saath; bharose wali boundaries par saaf types',
          'Optional types ko runtime validation maano — type likh diya toh galat data andar aa hi nahi sakta',
          'Annotations se sandbox laagu karo — type likhne se code ki permissions bhi tay ho jaati hain',
          'Sirf zaroori types — bina zaroori types ke koi bhi codebase bada ho hi nahi sakta',
        ],
        answer: 0,
        explain: 'Luau aur Sorbet dono ka tareeka. Inference madad karta hai, aur annotations compiler optimizations bhi dete hain.',
        choiceExplanations: [
          'Luau aur Sorbet dono ka tareeka. Inference madad karta hai, aur annotations compiler optimizations bhi dete hain.',
          'Optional types runtime par data nahi jaanchte.',
          'Types aur sandbox alag kaam hain.',
          'Beginners ke liye zaroori types rukawat hain — gradual dono ko jagah deta hai.',
        ],
      },
    ],
  },
  success: [
    'Main samjha sakta hoon ki untrusted code ke liye sandbox bhasha ki problem kyun hai',
    'Main Luau ke isolation aur performance jugaad bata sakta hoon',
    'Main gradual types ka dohra faayda samjha sakta hoon',
  ],
  homework: `<p>Apne product mein jahan bhi user ka diya "code" ya "expression" chalta hai (formulas, templates, filters, webhooks transforms),
    likho: user ka code kya-kya chhoo sakta hai? Kaunsi cheezein user ke code ki "stdlib" se hata sakte ho?</p>`,
  cards: [
    { front: 'Luau sandbox ke teen hisse?', back: 'Har script ka apna global table; stdlib se system/escape hisse hataye; memory-safe VM (memory bug se native code nahi).' },
    { front: 'Luau performance?', back: 'C++ interpreter (~LuaJIT speed, consoles par bhi); 2024 native codegen — numeric 2–3× tez; type annotations compiler ko hints.' },
    { front: '"Sandbox ek bhasha ki problem hai"?', back: 'Untrusted code ko bhasha ke andar hi band karo — globals, stdlib, memory safety — sirf bahar ki deewar nahi.' },
  ],
},

/* =====================================================================
   3. rbx-matchmaker
   ===================================================================== */
{
  id: 'rbx-matchmaker',
  icon: '🎯',
  title: 'Matchmaker — 100 ms mein paanch cheezon ka tol',
  badge: 'Match Mahaguru',
  objectives: [
    'Paanch factors: latency, dost, load, developer rules, naya vs purana',
    'Lab: 20,000 joins, teen policies',
    'Apna cloud: 800,000+ servers, 24 edge + 2 core DCs',
    'Metal par cloud jaisa ops: Nomad, Consul, Vault, MAAS',
  ],
  lesson: [
    "<h3>🎟️ \"Play\" dabaya — ab?</h3>\n     <p>Kisi instance mein daalo jismein jagah hai, ya naya kholo — aur placement ka faisla &lt; 100 ms mein, popular game par saikdon per second,\n     hazaron games ke liye. Paanch cheezein tolni hain:</p>\n     <ol>\n       <li><b>Latency</b> — 24 edge DCs mein sabse paas.</li>\n       <li><b>Dost</b> — jahan dost pehle se khel rahe.</li>\n       <li><b>Load</b> — bhara bahar; lagbhag-bhara bhi bura agar dost aane wale hain.</li>\n       <li><b>Developer rules</b> — region se group karo ya mix.</li>\n       <li><b>Naya vs purana</b> — naya server paisa; hazaron aadhe-khaali servers mat kholo.</li>\n     </ol>\n     <p>Galat faisla = lag, ya dost se alag → player chala gaya.</p>\n     <pre>lab 27 (ex1-matchmaker) — 20,000 players, 6 regions, 40% dosto ke group:\npolicy       instances   avg fill   avg ping   dost ek saath\nfill-first      500       100%      152 ms     14%\nnearest         502      99.6%       21 ms     70%\nsmart           502      99.6%       38 ms    100%</pre>\n     <p>Smart = latency limit + <b>party ke liye seats rok ke rakho</b> + pehle bhare instance bharo. Nearest se ping thoda zyada\n     (kabhi paas ke khaali server ki jagah thoda door ka aadha-bhara) — yahi roz ka trade-off.</p>",
    "<h3>🏗️ Apna cloud</h3>\n     <p>800,000+ apne servers; <b>24 edge DCs</b> players ke paas instances chalate hain; <b>2 core DCs</b> (website, recommendations,\n     economy, safety filters); apna global private network; edges core ke liye firewall bhi. Kyun? <b>Network ka kharcha</b> — is\n     workload ke liye public cloud networking apne hardware se ~10× tak mehenga. 2021 outage ke baad Virginia mein $400M ka naya DC.\n     Public cloud sirf <b>burst</b> ke liye.</p>\n     <p>Metal par cloud jaisa ops: HashiCorp <b>Nomad</b> (containers schedule), <b>Consul</b> (service discovery), <b>Vault</b>\n     (secrets), aur MAAS (metal as a service) ka apna Terraform provider → physical servers bhi infrastructure-as-code.</p>\n     <h3>🛡️ Safety bhi scale par</h3>\n     <p>Bachche + sab kuch user-generated (games, chat, images, sounds). Text filter ~2.5 lakh requests/sec — har message par bade model\n     ka inference, word list nahi; 300+ AI inference pipelines; GPU/CPU ka batwara kharche ke liye; apne hardware par (latency, privacy).</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 20,000 joins, teen matchmakers',
      project: '27-roblox',
      exercise: 'ex1-matchmaker',
      goal: 'Same arrival order, teen policies — kitne servers, kitne bhare, kitna ping, kitne dost saath?',
      why: `<code>services/matchmaker.js</code>: capacity 40. <code>fill-first</code> sirf bharta hai, <code>nearest</code> sirf latency,
        <code>smart</code> paanch cheezein (120 ms limit, party seats reserve, bhare ko pehle, region rule, naya mehenga).`,
      steps: [
        { text: 'Matchmaker chalao.', cmd: 'cd docker-labs/27-roblox && npm start ex1-matchmaker', expect: 'ex1-matchmaker\n[matchmaker] :5031 policy=smart' },
        { text: '20,000 joins, teen policies.', cmd: 'node tools/joins.js', expect: 'policy       instances   avg fill   avg ping   dost ek saath (groups)\nfill-first      500       100%      152 ms   568/3991 (14%)\nnearest         502      99.6%       21 ms   2778/3991 (70%)\nsmart           502      99.6%       38 ms   3991/3991 (100%)' },
      ],
      observe: {
        q: 'Nearest mein 30% groups kyun toot gaye jabki sab paas ke DC mein the?',
        choices: [
          'Party ke liye seats rok ke nahi rakhi — dost der se aaye, tab tak instance bhar chuka tha',
          'Nearest routing ne dosto ka region badal diya, isliye dost alag-alag DC mein gaye',
          'Smart mode ne latency zero kar di, isliye smart mein sab ek saath pahunch gaye',
          'Smart mode mein har server ka size dugna tha, isliye dosto ko jagah mil gayi',
        ],
        answer: 0,
        explain: 'Nearest policy ne der se aane wale dosto ke liye seats nahi rokhi. Instance lagbhag bhar gaya toh baad ke dost kahin aur gaye. Smart mode party size jitni seats thodi der ke liye rok leta hai.',
        choiceExplanations: [
          'Nearest policy ne der se aane wale dosto ke liye seats nahi rokhi. Instance lagbhag bhar gaya toh baad ke dost kahin aur gaye. Smart mode party size jitni seats thodi der ke liye rok leta hai.',
          'Sawaal kehta hai sab paas ke DC mein the — region nahi badla.',
          'Latency zero nahi hoti. Farq seats rokne se aaya.',
          'Server ka size dono modes mein same tha.',
        ],
      },
      lesson: 'Matchmaker ek real-time scheduler hai — har factor ka apna dukh, aur factors ka balance hi product.',
    },
    {
      type: 'tradeoff',
      title: 'Matchmaker ke knobs',
      instructions: 'Latency limit, party reservation aur "purana pehle" ka zor badlo.',
      goal: 'Avg ping <b>50 ms se kam</b>, dost saath <b>95%+</b>, aur servers <b>520 se kam</b> (paisa).',
      scenario: `20,000 players, har instance 40 ka. Tum matchmaker ke weights tay karte ho.`,
      knobs: [
        { id: 'lat', label: 'Max latency (ms)', min: 20, max: 300, step: 10, value: 300, unit: ' ms', note: 'Latency limit se zyada deri wale instance mein mat daalo.' },
        { id: 'reserve', label: 'Party ke liye seats rokna (0 = nahi, 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Pehla dost aaya toh group size ki seats rok lo.' },
        { id: 'packing', label: 'Bhare instance ko pehle bharne ka zor (0–10)', min: 0, max: 10, step: 1, value: 10, unit: '', note: 'Zyada = kam servers, par kabhi thoda door.' },
      ],
      readouts: k => {
        const m = mmModel(k);
        return [
          { label: 'Avg ping', value: m.ping + ' ms', tone: m.ping < 50 ? 'ok' : 'bad' },
          { label: 'Dost ek saath', value: m.friends + '%', tone: m.friends >= 95 ? 'ok' : 'bad' },
          { label: 'Servers khule', value: m.servers + '', tone: m.servers < 520 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = mmModel(k);
        return [
          { label: 'Ping', pct: Math.min(100, m.ping / 1.6), text: m.ping + ' ms', tone: m.ping < 50 ? 'ok' : 'bad' },
          { label: 'Dost saath', pct: m.friends, text: m.friends + '%', tone: m.friends >= 95 ? 'ok' : 'bad' },
          { label: 'Servers', pct: Math.min(100, (m.servers - 480) * 1.2), text: m.servers + '', tone: m.servers < 520 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = mmModel(k);
        if (m.ping >= 50) return { ok: false, text: `Ping <b>${m.ping} ms</b> — Mumbai ka player Sao Paulo mein. Latency limit kaso.` };
        if (m.friends < 95) return { ok: false, text: `Sirf <b>${m.friends}%</b> groups saath — dost aate hain toh instance bhar chuka hota hai. Party seats rok ke rakho.` };
        if (m.servers >= 520) return { ok: false, text: `<b>${m.servers}</b> servers — bahut aadhe-khaali instances khule (paisa). "Purana pehle" ka zor badhao.` };
        return { ok: true, text: `Ping <b>${m.ping} ms</b>, dost <b>${m.friends}%</b>, servers <b>${m.servers}</b> — lab ke "smart" jaisa balance.` };
      },
      check: k => { const m = mmModel(k); return m.ping < 50 && m.friends >= 95 && m.servers < 520; },
      lesson: `Teen knobs, teen dukh: latency limit <b>lag</b> rokti hai, reservation <b>dost alag</b> hone se, packing <b>paisa</b>. Ek kaso toh
        doosra dheela padta hai — tight latency + zyada packing kabhi-kabhi naya server maangti hai.`,
      quiz: {
        q: 'Matchmaker ko platform ka "asli SPOF" kyun kehte hain?',
        choices: [
          'Instance mara = 40 log; matchmaker mara = koi naya game shuru hi nahi — asar sab par',
          'Matchmaker ek hi physical server par chalna zaroori hai, toh server gira toh sab gaya',
          'Matchmaker poore game fleet se mehenga hai, isliye matchmaker girna sabse bada nuksaan',
          'Har matchmaker asal mein ek database hai, aur database hamesha SPOF hota hai',
        ],
        answer: 0,
        explain: 'Chhote instances ne blast radius ghataya — par coordination layer ki zimmedari badhi. Reliability ka dabav upar ki layer par.',
        choiceExplanations: [
          'Chhote instances ne blast radius ghataya — par coordination layer ki zimmedari badhi. Reliability ka dabav upar ki layer par.',
          'Matchmaker kai servers par chal sakta hai — par saajha hai, isliye asar bada.',
          'SPOF ka matlab asar hai, kharcha nahi.',
          'Matchmaker placement ka faisla karta hai, database nahi hai.',
        ],
      },
    },
  ],
  interview: {
    title: 'Interview Round — matchmaking',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Dost ek saath game join karein par alag servers mein chale jaate hain."',
        choices: [
          'Pehle member par party size jitni seats rok lo (TTL ke saath); baaki dost wahi instance',
          'Sabse paas wala instance chuno, chahe bhara ho — doori kam toh dost bhi khush',
          'Har dost ko random instance par bhejo — random se load barabar, dost baad mein mil lenge',
          'UI mein invite button do — invite bhej diya toh instance mein jagah bhi pakki',
        ],
        answer: 0,
        explain: 'Lab: nearest 70% → smart 100%. Lagbhag bhare instance mein party mat bhejo.',
        choiceExplanations: [
          'Lab: nearest 70% → smart 100%. Lagbhag bhare instance mein party mat bhejo.',
          'Bhare instance mein dost ke liye jagah nahi bachti.',
          'Random placement dosto ko pakka alag kar dega.',
          'Invite seat nahi rokta — instance phir bhi bhar sakta hai.',
        ],
      },
      {
        q: 'Interviewer: "Roblox public cloud par kyun nahi?"',
        choices: [
          'Is workload ka network kharcha cloud par ~10× tak — steady bada load apne metal par sasta; burst cloud par',
          'Public cloud bharosemand nahi hota — cloud ke servers apne aap girte rehte hain',
          'Apna hardware har workload ke liye hamesha sasta hota hai — cloud kabhi sasta nahi padta',
          'Security ke niyam cloud ka istemaal mana karte hain — game platform cloud par chal hi nahi sakta',
        ],
        answer: 0,
        explain: '"Cloud default hai, kanoon nahi — jaano sabse badi cost line kahan palatti hai."',
        choiceExplanations: [
          '"Cloud default hai, kanoon nahi — jaano sabse badi cost line kahan palatti hai."',
          'Cloud ki reliability theek hai; faisla kharche ka tha.',
          '"Hamesha" galat — chhote ya spiky load ke liye cloud sasta ho sakta hai.',
          'Aisa koi niyam nahi. Roblox burst ke liye cloud use karta hai.',
        ],
      },
    ],
  },
  success: [
    'Main matchmaker ke paanch factors aur factors ka trade-off bata sakta hoon',
    'Main lab se smart placement ka faayda dikha sakta hoon',
    'Main Roblox ke apne cloud ka tark de sakta hoon',
  ],
  homework: `<p>Apne system mein koi "placement" faisla dhoondho (request kis server par, job kis worker par, user kis shard par). Kitne factors
    tol rahe ho? Kaunsa factor chhoot raha hai jo users ko dukh deta hai (latency, saath rehna, kharcha)?</p>`,
  cards: [
    { front: 'Roblox matchmaker ke 5 factors?', back: 'Latency (24 edge DCs), dost, load (lagbhag-bhara bhi bura), developer rules, naya vs purana (naya = paisa). <100 ms mein.' },
    { front: 'Lab 27: matchmaker?', back: 'fill-first: ping 152 ms, 14% dost saath. nearest: 21 ms, 70%. smart: 38 ms, 100%, utne hi servers.' },
    { front: 'Roblox apna cloud kyun?', back: '800,000+ servers; public cloud networking is workload ke liye ~10× tak mehenga. Cloud sirf burst.' },
  ],
},

/* =====================================================================
   4. rbx-cells
   ===================================================================== */
{
  id: 'rbx-cells',
  icon: '🧊',
  title: 'Viral surge, cells aur hafte ka chakkar',
  badge: 'Surge Sipahi',
  objectives: [
    '2021 ke baad: backend bhi cells mein (detail 📡 Feed mein)',
    'Weekend ka time pata, size nahi — viral games',
    'Hafte ka chakkar: review, capacity, chaos, Friday',
    'Burst cells public cloud mein; trade-offs aur sabak',
  ],
  lesson: [
    `<h3>🧊 Instances wali soch, backend par</h3>
     <p>Oct 2021: <b>73 ghante</b> band — saari backend services ek Consul cluster ke through; ek naya Consul feature → bhaari contention →
     Consul ke andar ke DB (BoltDB) mein performance bug; monitoring bhi unhi systems par → din bhar aadhe andhe. (Poori kahani: 📡 The
     Feed → "73 ghante ka death spiral".)</p>
     <p>Jawab: <b>cellular architecture</b> — backend ko khud mein poore tukdon (cells) mein baanto; failure cell ke andar rahe. Wahi
     soch jo instances ki thi, ab backend par. Aur cells ka ek bonus: <b>public cloud mein burst</b> saaf-suthra — matchmaker cloud ke edge
     cells mein bhi waise hi players rakhta hai jaise apne.</p>
     <h3>📈 Time pata, size nahi</h3>
     <p>Weekend ka peak ghante tak pata hai. <b>Size</b> nahi — ek viral game platform ko dinon mein dugna kar sakta hai. Grow a Garden ne
     ~2 mahine mein peak dugna kiya; <b>Dead Rails</b> 0 → ~10 lakh concurrent lagbhag raaton-raat.</p>`,
    `<h3>🗓️ Hafte ka chakkar (public)</h3>
     <ul>
       <li><b>Monday</b> — kya toota, review.</li>
       <li><b>Tuesday</b> — capacity planning.</li>
       <li><b>Poore hafte chaos testing</b> — live system ke hisse maaro, sabit karo ki failure simit rehta hai.</li>
       <li><b>Friday</b> — weekend ki lehar ke liye extra provision.</li>
     </ul>
     <h3>⚖️ Trade-offs</h3>
     <ul>
       <li>Koi ek badi shared duniya nahi — design se.</li>
       <li><b>Matchmaker asli SPOF</b> — instance mara = 40 log; matchmaker mara = koi game shuru nahi. Reliability ka dabav upar gaya.</li>
       <li>Apna cloud = sab kuch apna (hardware, DCs, weekly grind, koi provider nahi jise phone karo).</li>
     </ul>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Kaam baantne ka tareeka ek tukde ke size se zyada maayne rakhta hai (unit chhoti, bahut chalao).</li>
       <li>Untrusted code → sandbox bhasha ki problem hai.</li>
       <li>Cloud default hai, kanoon nahi — sabse badi cost line kahan palatti hai, jaano.</li>
       <li>Chhota blast radius jaan-boojh ke (instances, cells) — aur sabke neeche ki <b>ek</b> saajhi cheez dhoondho.</li>
       <li>Failure ka vaada tab tak bekaar jab tak test na ho — prod mein bhi, par ijaazat ke saath, chhote daayre mein, aur rokne ka raasta tayyar rakh ke.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Viral weekend — capacity plan',
      instructions: 'Friday ki extra capacity, cloud burst cells aur chaos testing — Saturday ko ek game viral hua.',
      goal: 'Saturday ke surge mein <b>rejected joins 1% se kam</b>, hafte ka kharcha <b>₹100 (index) se kam</b>, aur ek cell girne par <b>max 10%</b> players prabhavit.',
      scenario: `Normal weekend peak 100 units. Saturday ko ek naya game viral: peak 180. Apni capacity poore hafte ka kharcha;
        cloud burst sirf zaroorat par, par per-unit mehenga aur quota max 60 units. Cells ki ginti tum tay karte ho.`,
      knobs: [
        { id: 'extra', label: 'Friday extra apni capacity (%)', min: 0, max: 100, step: 10, value: 0, unit: '%', note: 'Normal peak ke upar.' },
        { id: 'burst', label: 'Cloud burst cells (0 = band, 1 = chalu)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Matchmaker cloud cells mein bhi rakhe.' },
        { id: 'cells', label: 'Backend cells ki ginti', min: 1, max: 20, step: 1, value: 1, unit: '', note: 'Zyada cells = chhota blast radius, thoda overhead.' },
      ],
      readouts: k => {
        const m = rbxModel(k);
        return [
          { label: 'Saturday rejected joins', value: m.rejected + '%', tone: m.rejected < 1 ? 'ok' : 'bad' },
          { label: 'Hafte ka kharcha (index)', value: '₹' + m.cost, tone: m.cost < 100 ? 'ok' : 'bad' },
          { label: 'Ek cell gira toh prabhavit', value: m.blast + '%', tone: m.blast <= 10 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = rbxModel(k);
        return [
          { label: 'Rejected', pct: Math.min(100, m.rejected * 2.5), text: m.rejected + '%', tone: m.rejected < 1 ? 'ok' : 'bad' },
          { label: 'Kharcha', pct: Math.min(100, m.cost / 1.6), text: '₹' + m.cost, tone: m.cost < 100 ? 'ok' : 'bad' },
          { label: 'Blast radius', pct: m.blast, text: m.blast + '%', tone: m.blast <= 10 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = rbxModel(k);
        if (m.rejected >= 1) return { ok: false, text: `Saturday ko <b>${m.rejected}%</b> joins reject — viral game ke naye players wapas gaye. Burst chalu karo ya extra capacity.` };
        if (m.cost >= 100) return { ok: false, text: `Kharcha ₹<b>${m.cost}</b> — poore hafte ke liye 180 ka apna hardware rakhna mehenga. Viral hissa cloud burst se lo.` };
        if (m.blast > 10) return { ok: false, text: `Ek cell gira toh <b>${m.blast}%</b> players prabhavit. Cells badhao (2021 ka sabak).` };
        return { ok: true, text: `Rejected <b>${m.rejected}%</b>, kharcha ₹<b>${m.cost}</b>, blast radius <b>${m.blast}%</b>. Predictable hissa apna, viral hissa burst, aur cells chhote.` };
      },
      check: k => { const m = rbxModel(k); return m.rejected < 1 && m.cost < 100 && m.blast <= 10; },
      lesson: `Weekend ka time pata hai (Friday extra), size nahi (cloud burst). Aur cells failure ko simit rakhte hain — tabhi burst bhi saaf hota hai.`,
      quiz: {
        q: 'Cells hone se cloud burst aasaan kyun hota hai?',
        choices: [
          'Cell khud mein poora hai — cloud mein ek aur cell khada karo, matchmaker naye cell ko baaki jaisa maane',
          'Cells hone se DC aur cloud ke beech ki latency zero ho jaati hai, toh cell kahin bhi chala do',
          'Cells ke saath cloud ki capacity muft mil jaati hai — burst ka alag se koi bill nahi aata',
          'Cells aane se saare shared control planes gayab — matchmaker tak kuch bhi saajha nahi bachta',
        ],
        answer: 0,
        explain: 'Cell ka data plane khud mein poora ho toh wahi unit cloud mein bhi khadi ho sakti hai. Par matchmaker jaise saajhe hisse, capacity aur network phir bhi jaanchne padte hain.',
        choiceExplanations: [
          'Cell ka data plane khud mein poora ho toh wahi unit cloud mein bhi khadi ho sakti hai. Par matchmaker jaise saajhe hisse, capacity aur network phir bhi jaanchne padte hain.',
          'Latency doori se aati hai; cells latency nahi mitaate.',
          'Cloud ka burst bhi paise ka hai.',
          'Matchmaker jaisa control plane phir bhi saajha hai.',
        ],
      },
    },
    {
      type: 'order',
      title: 'Roblox ka hafta',
      instructions: 'Weekly reliability cycle sahi order mein.',
      steps: [
        { text: 'Monday: pichhle weekend mein kya toota — review', explain: 'Seekh pehle.' },
        { text: 'Tuesday: capacity planning — kaunse games badh rahe hain', explain: 'Trend dekho.' },
        { text: 'Hafte bhar: chaos testing — live system ke hisse maaro', explain: 'Containment ka vaada sabit karo.' },
        { text: 'Friday: weekend ki lehar ke liye extra capacity + burst tayyar', explain: 'Time pata hai, size nahi.' },
        { text: 'Weekend: viral surge par burst cells, matchmaker cloud cells mein bhi', explain: 'Predictable apna, anishchit cloud.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — surge capacity',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Kabhi-kabhi ek viral event se load 3× ho jaata hai, kab pata nahi."',
        choices: [
          'Baseline apne/reserved par; anishchit hissa cloud cells se burst; chaos tests se saabit karo',
          'Maan lo cloud mein anant on-demand capacity hamesha milegi — plan ki zaroorat hi nahi',
          'Event ke baad manually naye hosts order karo — viral load ke saath hosts aa jaayenge',
          'Load badhe toh users ko wapas bhej do — product ki priority dekhne ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Roblox ka mix: apna + burst + cells. Self-contained cells se burst aur failure dono simit rehte hain.',
        choiceExplanations: [
          'Roblox ka mix: apna + burst + cells. Self-contained cells se burst aur failure dono simit rehte hain.',
          'Cloud capacity bhi region mein khatam ho sakti hai — pehle se plan aur test chahiye.',
          'Hosts aane mein hafte lagte hain. Viral event ghanton mein aata hai.',
          'Kuch users ko rokna theek ho sakta hai, par product priority ke saath.',
        ],
      },
      {
        q: 'Interviewer: "Chaos testing production mein kyun?"',
        choices: [
          '"Failure cell ke andar rahega" ka vaada test ke bina bekaar — chhote, rok sakne wale prod tests',
          'Production mein roz random nuksaan karo — jitna zyada todoge, utna mazboot system',
          'Staging bekaar hai — sirf production test hi sach batata hai, staging ki zaroorat nahi',
          'Fault daalo par rollback ki zaroorat nahi — fault khud hi thodi der mein theek ho jaata hai',
        ],
        answer: 0,
        explain: 'Approved, simit experiments: hypothesis, asli jaisa baseline, chhota radius, abort ki hadd aur jaanchi hui cleanup. Production ek jagah hai, bina rok ke nuksaan maqsad nahi.',
        choiceExplanations: [
          'Approved, simit experiments: hypothesis, asli jaisa baseline, chhota radius, abort ki hadd aur jaanchi hui cleanup. Production ek jagah hai, bina rok ke nuksaan maqsad nahi.',
          'Bina hadd ka nuksaan users ko dukh deta hai — experiment simit ho.',
          'Staging bhi kaam ka hai; production test staging ki jagah nahi leta.',
          'Abort aur rollback ke bina experiment khud outage ban sakta hai.',
        ],
      },
    ],
  },
  success: [
    'Main 2021 ke baad cells ka tark aur burst ka link samjha sakta hoon',
    'Main viral surge ke liye capacity plan bana sakta hoon',
    'Main Roblox ke paanch sabak bata sakta hoon',
  ],
  homework: `<p>Apne system ki <b>ek</b> saajhi cheez dhoondho jiske neeche sab kuch hai (service discovery, config store, auth, DNS). Agar
    saajhi cheez 3 din band rahe toh kya hoga? Saajhi cheez ko cells mein kaise tod sakte ho, aur use chaos test kaise karoge?</p>`,
  cards: [
    { front: 'Roblox 2021 ke baad?', back: 'Backend bhi cells mein (failure cell ke andar) — aur cells se public cloud mein burst saaf. (Outage detail: Feed → death spiral.)' },
    { front: 'Roblox ka hafta?', back: 'Mon review, Tue capacity, roz chaos testing, Fri weekend ke liye extra. Time pata hai, size nahi (viral games).' },
    { front: 'Roblox ke paanch sabak?', back: 'Unit chhoti, bahut chalao; sandbox bhasha ki problem; cloud default hai kanoon nahi; blast radius chhota jaan-boojh ke; failure ka vaada test karo.' },
  ],
},
]);

/* Toy models — sirf trend dikhane ke liye */
function mmModel(k) {
  const ping = Math.round(k.lat * 0.18 + 12 + (10 - k.packing) * 0.4);
  const friends = Math.round(k.reserve ? 100 - Math.max(0, (k.packing - 8)) : 70 - k.packing * 2);
  const servers = Math.round(500 + (k.lat < 60 ? (60 - k.lat) * 0.8 : 0) + (10 - k.packing) * 6 + (k.reserve ? 2 : 0));
  return { ping, friends, servers };
}
function rbxModel(k) {
  const own = 100 * (1 + k.extra / 100);
  const surge = 180;
  const burstUsed = k.burst ? Math.min(60, Math.max(0, surge - own)) : 0;   // cloud quota: max 60 units
  const rejected = Math.max(0, Math.round(1000 * (surge - own - burstUsed) / surge) / 10);
  const cellOverhead = 1 + k.cells * 0.004;
  const cost = Math.round((own * 0.6 + burstUsed * 0.35) * cellOverhead);
  const blast = Math.round(100 / k.cells);
  return { rejected, cost, blast };
}

})();
