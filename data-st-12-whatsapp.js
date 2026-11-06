/* =====================================================================
   TRACK — 🏢 Real Company Stories · WhatsApp: 2 arab users, chhoti si team

   Source: "How WhatsApp Serves 2 Billion Users With a Tiny Team" (Akhil Sharma)
   — Rick Reed ke Erlang Factory talks, Meta ka multi-device write-up,
   WhatsApp encryption whitepaper.
   (🏗️ Poore Systems Banao → WhatsApp level khaali page se chat design hai;
    yeh WhatsApp ki asli kahani hai.) Docker lab: docker-labs/25-whatsapp
   ===================================================================== */
(function () {

VISUALS['wa-connections'] = {
  t: 'Laakhon phones, hamesha juda — par zyadatar chup',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">🧵 Thread per connection</span>\n        <div class=\"dg-cap\">Har connection ka apna thread + stack (1–2 MB). 10 lakh = terabytes. OS das hazaar par haanfne lagta hai (C10K).\n          Lab: Node worker thread ~5.4 MB → 20,000 = ~100 GB.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🪶 Erlang process / event loop</span>\n        <div class=\"dg-cap\">Erlang lightweight processes ka memory version/workload par depend karta hai; official 64-bit example ~2.6 KB process state hai, socket/mailbox extra. Reductions normal BEAM code schedule karti hain; blocking NIF alag risk. Lab idle socket ~3.2 KB RSS delta alag Node measurement hai.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">XMPP (XML, lambe tags)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">FunXMPP (binary codes)</span>\n      <span class=\"dg-pill acc\">2G/3G par har byte keemti — chhota protocol ek feature hai</span>\n    </div>",
};

VISUALS['wa-contention'] = {
  t: "Historical connection-scale optimization: ~2 lakh se ~30 lakh",
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">✖️ Multiplication</span>\n        <div class=\"dg-cap\">Per-connection chhota kharcha × laakhon = bada. (OS se time maangna → CPU ka TSC padho; chhote memory\n          chunks → huge pages.)</div></div>\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">🔒 Sharing</span>\n        <div class=\"dg-cap\">Koi bhi lock/counter/table jise sab chhoote = bheed. Global lock wala process linking → monitors;\n          ek ETS table → <b>partitioned</b>; ek replication stream → per-table streams.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-cap\">Lab 25 (asli threads, shared memory): ek taala — 8 threads par <b>0.4×</b> (dheema!); 256 taale — <b>4.2×</b>.</div>",
};

VISUALS['wa-store-forward'] = {
  t: 'Dakghar, filing cabinet nahi',
  html: "\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">📱 Riya</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">🗺️ registry: Aman kis server/process par?</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">online → push, bhool jao</span>\n      <span class=\"dg-pill gold\">offline → queue → wapas aaya → deliver → DELETE</span>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-grid\">\n      <div class=\"dg-node\"><span class=\"ni\">✔️</span><span class=\"nl\">1 grey</span><span class=\"ns\">server ke paas</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">✔️✔️</span><span class=\"nl\">2 grey</span><span class=\"ns\">phone tak pahuncha</span></div>\n      <div class=\"dg-node is-accent\"><span class=\"ni\">💙</span><span class=\"nl\">2 blue</span><span class=\"ns\">padh liya</span></div>\n    </div>\n    <div class=\"dg-cap\">Media chat raaste se nahi: phone encrypt → alag blob storage → chat mein sirf pointer (URL + key + fingerprint).\n      Existing encrypted media reference reuse ho sakta hai; fresh randomized encryption universal dedup guarantee nahi.</div>",
};

VISUALS['wa-e2e'] = {
  t: 'Server sirf band lifafe dekhta hai',
  html: "\n    <div class=\"dg-ladder\">\n      <div class=\"dg-rung\"><span class=\"lv\">🔑</span><span class=\"cmd\">Identity keys</span><span class=\"q\">har device ki apni; server par sirf public keys</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">⚙️</span><span class=\"cmd\">Double ratchet</span><span class=\"q\">deleted past keys protect karo; future recovery ke liye fresh entropy aur safe device chahiye</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">👥</span><span class=\"cmd\">Sender keys (groups)</span><span class=\"q\">ek baar encrypt, ek copy — lab: 1,000 members par 200 MB → 0.26 MB</span></div>\n      <div class=\"dg-rung g\"><span class=\"lv\">💻</span><span class=\"cmd\">Multi-device (2021)</span><span class=\"q\">har device ki apni identity; user = devices ka set; har device ke liye alag encrypt</span></div>\n    </div>",
};

SD.registerLevels('stories', [
/* =====================================================================
   1. wa-connections
   ===================================================================== */
{
  id: 'wa-connections',
  icon: '💬',
  title: 'WhatsApp — laakhon zinda connections, chhoti team',
  badge: 'Connection Kanjoos',
  objectives: [
    '"Do more with less" — WhatsApp ka siddhant',
    'Chat server ≠ web server: hamesha khule, zyadatar chup connections',
    'Erlang/BEAM: halke processes, schedulers, reductions',
    'Lab: 20,000 idle connections — event loop vs threads',
  ],
  lesson: [
    "<h3>📉 50 log, 45 crore users</h3>\n     <p>2014 mein Facebook ne WhatsApp $19B mein khareeda: ~45 crore users, ~50 log, ~30 engineers. Aaj 2 arab+ users, roz 100 arab+\n     messages — wahi buniyaad. Ek server par ~20 lakh log ek saath. Server message aage deta hai aur <b>mita deta hai</b>. E2E\n     encrypted. Siddhant: <b>kam se kam kaam</b> — server utna hi kare jitna zaroori, ek machine ko jitna ho sake kheencho, naye\n     parts tabhi jab koi raasta na bache.</p>\n     <h3>🔌 Chat server web server nahi hai</h3>\n     <p>Web server: request aayi, jawab diya, connection gaya. Chat server: har online user ka <b>zinda connection</b>, zyadatar\n     <b>chup</b> (phone jeb mein). Thread-per-connection ka stack/runtime budget large ho sakta hai; default stack reservation aur committed RSS alag hain. C10K historical challenge tha, modern OS ka fixed10k limit nahi\n     (C10K). Chahiye tha: per-connection kharcha ≈ 0.</p>\n     <pre>lab 25 (ex1): 20,000 idle connections, ek Node process, ek event loop\n  server RSS 47 MB → 109 MB = 3.2 KB per connection\nlab 25: 200 asli worker threads → 5,427 KB per thread → 20,000 ke liye ~100 GB</pre>\n     <p>(Imaandari: Node worker thread apna V8 isolate leta hai. Native/Java thread memory version, configured stack, virtual reservation and committed pages par depend karti hai; is Node RSS result ko every OS thread ka fixed cost mat banao.)</p>",
    "<h3>☎️ Erlang — telephone exchange ki bhasha</h3>\n     <p>Erlang Ericsson ne 1980s mein telephone switches ke liye banaya tha — laakhon calls, kabhi band nahi. Erlang ka VM (<b>BEAM</b>):</p>\n     <ul>\n       <li><b>Process</b> = version-dependent small heap/process state → laakhon ek machine par. Har user connection = ek process.</li>\n       <li><b>Normal schedulers</b> typically online logical CPU configuration se map karte hain; count runtime options se change ho sakta hai. Dirty CPU/IO scheduler pools separate hain.</li>\n       <li><b>Reductions</b> runtime work accounting se ordinary BEAM processes schedule/preempt hote hain. Exact budget version-dependent hai; work stealing balance help karta hai. Long blocking native NIF ya shared resource other users ko phir bhi affect kar sakta hai.</li>\n       <li>Ordinary process heaps isolated hote hain aur messages se communicate karte hain. ETS tables, off-heap binaries aur native resources shared state la sakte hain; har path private heap nahi.</li>\n     </ul>\n     <p>Shuruaat open-source <b>ejabberd</b> (XMPP) se. XMPP = XML: angle brackets, dohraaye tags. India, Brazil, Indonesia mein 2G/3G par\n     log → <b>FunXMPP</b>: binary codes, kahin kam bytes. <b>Chhota protocol dheeme network par ek feature hai.</b></p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 20,000 idle connections',
      project: '25-whatsapp',
      exercise: 'ex1-connections',
      goal: '20,000 phones ek chat server se jude hain, kuch bhej nahi rahe — server ki RAM kitni? Aur thread-per-connection hota toh?',
      why: `<code>services/chat.js</code> ek Node process, ek event loop. <code>tools/conns.js</code> 500-500 ke batches mein connections kholta hai.
        <code>tools/threads.js</code> asli worker threads banake per-thread memory naapta hai.`,
      steps: [
        { text: 'Registry + chat server chalao.', cmd: 'cd docker-labs/25-whatsapp && npm start ex1-connections', expect: 'ex1-connections\n[registry] :5013\n[chat1] :5011' },
        { text: '20,000 connections kholo.', cmd: 'node tools/conns.js --conns 20000', expect: '    5000 connections → server RSS 70 MB\n   20000 connections → server RSS 109 MB\n\n20000 idle connections, ek process, ek event loop:\n  server RSS 47 MB → 109 MB  = 3.2 KB per connection' },
        { text: 'Thread-per-connection ka kharcha naapo.', cmd: 'node tools/threads.js --threads 200', expect: '200 threads (har "connection" ka apna thread):\n  poore system ka RSS 45 MB → 1105 MB = 5427 KB per thread\n  20,000 connections ke liye extrapolate: 103.5 GB' },
      ],
      observe: {
        q: 'Idle connection event loop par itna sasta kyun?',
        choices: [
          'Idle connection bas ek socket + chhota buffer hai — apna thread ya stack nahi, kaam tab jab data aaye',
          'Har idle socket ki memory zero hoti hai — data nahi aa raha, toh memory ka koi kharcha hi nahi',
          'OS saare socket buffers compress kar deta hai, isliye 20,000 connections bhi chhote dikhte hain',
          'Idle sockets kernel ko dikhte hi nahi — kernel sirf un connections ko ginta hai jinpar data aaye',
        ],
        answer: 0,
        explain: 'Event-driven sockets aur halke Erlang processes alag OS-thread stacks se bachte hain. Asli memory mein runtime, mailbox, socket buffers aur workload sab aata hai. Erlang ki official 64-bit misaal 327 words (2,616 bytes) hai; connections ki khaas ginti ek purani configuration ka result thi.',
        choiceExplanations: [
          'Event-driven sockets aur halke Erlang processes alag OS-thread stacks se bachte hain. Asli memory mein runtime, mailbox, socket buffers aur workload sab aata hai. Erlang ki official 64-bit misaal 327 words (2,616 bytes) hai; connections ki khaas ginti ek purani configuration ka result thi.',
          'Har socket ka kuch kharcha hai — buffer aur bookkeeping. Kam hai, zero nahi.',
          'OS buffers compress nahi karta. Sasta isliye ki har connection ka thread nahi.',
          'Kernel har socket ka hisaab rakhta hai, data aaye ya na aaye.',
        ],
      },
      lesson: "Idle connection ka per-connection overhead low and bounded rakho; zero nahi. Event loop/lightweight process ke saath FDs, socket buffers, heartbeat and slow-client state measure karo.",
    },
    {
      type: 'quiz',
      title: 'BEAM ki samajh',
      questions: [
        {
          q: 'Reductions ka faayda chat server mein?',
          choices: [
            'Lamba Erlang kaam bhi beech mein baari chhodta hai, toh baaki laakhon processes ko samay milta hai',
            'Har process ki memory chhoti ho jaati hai, kyunki reductions purana data mita deti hain',
            'Network packets ka payload compress ho jaata hai, kyunki reductions bytes ghatati hain',
            'Har message ko apne aap encryption mil jaati hai, kyunki reductions keys badalti rehti hain',
          ],
          answer: 0,
          explain: 'Reductions aam BEAM execution ko scheduling points par rok kar baari badalti hain. Native NIFs/ports, shared resources aur lamba kaam phir bhi schedulers par asar daal sakte hain — latency ki koi anant guarantee nahi.',
          choiceExplanations: [
            'Reductions aam BEAM execution ko scheduling points par rok kar baari badalti hain. Native NIFs/ports, shared resources aur lamba kaam phir bhi schedulers par asar daal sakte hain — latency ki koi anant guarantee nahi.',
            'Reductions CPU ki baari ginti hain, memory nahi.',
            'Payload ka size protocol tay karta hai, reductions nahi.',
            'Encryption alag layer hai. Reductions scheduling ka kaam hai.',
          ],
        },
        {
          q: 'WhatsApp ne XMPP ko FunXMPP kyun banaya?',
          choices: [
            '2G/3G users ke liye kam bytes — XML ke lambe tags ki jagah chhote binary codes',
            'Binary format mein badalte hi messages apne aap encrypt ho gaye, alag kaam nahi',
            'Naye transport ne saare retries hata diye, isliye har message ek hi baar gaya',
            'Binary codes ne network ka RTT zero kar diya, toh phone par delay khatam ho gaya',
          ],
          answer: 0,
          explain: 'Compact binary encoding payload ke bytes ghatati hai. RTT, radio setup, congestion, parsing aur retransmissions bhi end-to-end latency mein judte hain.',
          choiceExplanations: [
            'Compact binary encoding payload ke bytes ghatati hai. RTT, radio setup, congestion, parsing aur retransmissions bhi end-to-end latency mein judte hain.',
            'Encoding aur encryption alag cheezein hain.',
            'Retries network ki dikkat se aate hain; format se nahi hat-te.',
            'Bytes kam hue, par RTT network ki doori se aata hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — connection server',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "10 lakh WebSocket connections ek box par chahiye. Kya dekhoge?"',
        choices: [
          'Har connection ki memory, FD limit, kernel buffers, heartbeats aur dheema client',
          'Sirf load balancer ki connection ginti — load balancer sambhal le toh box bhi sambhal lega',
          'Har idle connection ke liye ek OS thread — thread se har connection ka kaam alag aur saaf',
          'Sirf average response time dekho — average theek hai toh 10 lakh connections bhi theek',
        ],
        answer: 0,
        explain: 'Lab: event loop par 3.2 KB vs thread par MBs per connection. Aur ek dheema client doosron ko na roke — dheeme client ka bhi plan chahiye.',
        choiceExplanations: [
          'Lab: event loop par 3.2 KB vs thread par MBs per connection. Aur ek dheema client doosron ko na roke — dheeme client ka bhi plan chahiye.',
          'Box ki apni hadd hai — memory, FDs, buffers. Load balancer box ka kaam nahi karta.',
          'Har thread ka stack MBs ka hai — 10 lakh threads memory kha jaayenge.',
          'Average mein dheemi tail chhup jaati hai.',
        ],
      },
      {
        q: 'Interviewer: "Erlang jaisa niche language kyun chuna?"',
        choices: [
          'Problem ki shakal se fit — laakhon halke, alag processes + fault tolerance; keemat: kam log',
          'Erlang popular language hai — popular language se reliability apne aap mil jaati hai',
          'Erlang ka license sasta tha — kam license fees se fault tolerance bhi saath aa gaya',
          'Vendor ne Erlang suggest kiya — vendor ki pasand se CPU ka sabse accha istemaal hota',
        ],
        answer: 0,
        explain: 'Core runtime problem ke hisaab se chuno. Keemat bhi maano: kam engineers aur kam libraries.',
        choiceExplanations: [
          'Core runtime problem ke hisaab se chuno. Keemat bhi maano: kam engineers aur kam libraries.',
          'Erlang popular nahi — kam engineers hi toh keemat thi.',
          'Erlang open source hai. Fault tolerance runtime ke design se aati hai.',
          'Vendor ki pasand se performance tay nahi hoti.',
        ],
      },
    ],
  },
  success: [
    'Main chat server aur web server ka farq samjha sakta hoon',
    'Main BEAM ke processes, schedulers aur reductions bata sakta hoon',
    'Main lab se per-connection kharcha naap ke dikha sakta hoon',
  ],
  homework: `<p>Apne sabse zyada connections wale service ke liye nikaalo: kitne connections, har ek ka memory kharcha (RSS ÷ connections),
    aur kitne idle hain. 10× connections par kya tootega pehle — memory, file descriptors, ya CPU?</p>`,
  cards: [
    { front: 'WhatsApp ka siddhant?', back: '"Do more with less" — server kam se kam kare, ek machine ko jitna ho sake kheencho, naye parts tabhi jab raasta na bache. 2014: ~45 crore users, ~50 log.' },
    { front: 'Erlang process kyun?', back: "Erlang ke halke processes OS threads se bahut chhote hote hain. Official 64-bit misaal: 327 words = 2,616 bytes (233 words ka heap shaamil); mailbox, binaries aur socket buffers alag se. Aam BEAM kaam reductions se baari-baari chalta hai; lambe, unsafe NIFs ek alag khatra hain." },
    { front: 'Lab 25: idle connection ka kharcha?', back: "Event loop par ~3.2 KB; Node worker thread ~5.4 MB → 20,000 = ~100 GB." },
  ],
},

/* =====================================================================
   2. wa-contention
   ===================================================================== */
{
  id: 'wa-contention',
  icon: '🔓',
  title: '2 lakh se 30 lakh connections — taale todne ka kaam',
  badge: 'Taala Todne Wala',
  objectives: [
    'Do dushman: multiplication aur sharing',
    '"Dark and grungy" fixes ki list',
    'Partitioned locks — lab mein asli threads',
    'Registry: sender ka server ≠ receiver ka server',
  ],
  lesson: [
    "<h3>🎯 Har fix = contention ka shikaar</h3>\n     <p>2012 ka target: 10 lakh connections per server. Shuruaat ~2 lakh par, aur server girte rahe (bada football match khatam,\n     bhookamp — sab ek saath message). 10 lakh paar, 20 lakh paar; Feb ke ek din ek server par peak <b>28 lakh</b> connections,\n     5 lakh+ packets/sec, 2 lakh+ internal messages/sec — ek box par.</p>\n     <p>Do dushman:</p>\n     <ul>\n       <li><b>Multiplication</b> — per-connection chhota kharcha × laakhon.</li>\n       <li><b>Sharing</b> — koi bhi lock/counter/table jise sab chhoote = bheed.</li>\n     </ul>\n     <table>\n       <tr><th>Mila</th><th>Fix</th></tr>\n       <tr><td>Har baar OS se time maangna</td><td>CPU ka TSC seedha padho</td></tr>\n       <tr><td>Kernel ki connection hash table mein takraav</td><td>Table badi (~5 lakh slots)</td></tr>\n       <tr><td>Saikdon GB memory, TLB misses</td><td>Huge pages (bade chunks)</td></tr>\n       <tr><td>Idle schedulers spin karke CPU kha rahe</td><td>Spinning band</td></tr>\n       <tr><td>Process linking ek global lock leta tha</td><td>Halke monitors</td></tr>\n       <tr><td>In-memory ETS table ek hotspot</td><td><b>Partitioned</b> — kai tukde</td></tr>\n       <tr><td>DB replication ek stream se</td><td>Har table ki apni stream</td></tr>\n     </table>\n     <p>Video ka historical scale-up example ~2 lakh → ~30 lakh connections report karta hai. Hardware, runtime version, active/idle mix aur memory settings ke bina isko reproducible same-machine guarantee mat banao.</p>",
    "<h3>🔒 Ek taala vs baante hue taale (lab 25, ex2)</h3>\n     <pre>threads   one-lock ops/sec     partitioned (256 locks)\n    1      2.57 M  (1.0x)          2.14 M  (1.0x)\n    2      1.80 M  (0.7x)          4.09 M  (1.9x)\n    4      1.43 M  (0.6x)          6.88 M  (3.2x)\n    8      1.15 M  (0.4x)          9.02 M  (4.2x)</pre>\n     <p>Ek taale par threads badhao toh kaam <b>ghata</b> — sab ek darwaaze par, upar se cache line ek core se doosre par bhaagti\n     hai. Taale user ke hisaab se baanto → cores sach mein kaam aate hain. (Taale alag 64-byte cache lines par — ek line par\n     rakhoge toh \"false sharing\" phir dheema kar deta hai.)</p>\n     <h3>🗺️ Registry</h3>\n     <p>Saikdon servers; Riya ka server ≠ Aman ka server. Distributed <b>registry</b>: har online user kis server aur kis process\n     par → lookup → paar do → Aman ke socket par push. Cluster bhar mein 7 crore+ internal Erlang messages/sec.</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek taala vs 256 taale',
      project: '25-whatsapp',
      exercise: 'ex2',
      goal: 'Asli worker threads ek shared table update karte hain — ek global taala vs user ke hisaab se 256 taale. 1, 2, 4, 8 threads.',
      why: `<code>tools/contention.js</code>: SharedArrayBuffer + Atomics se spin locks; har operation taale ke andar thoda kaam (session update).
        Koi server nahi.`,
      steps: [
        { text: 'Contention benchmark chalao.', cmd: 'cd docker-labs/25-whatsapp && node tools/contention.js', expect: 'threads   one-lock ops/sec     partitioned (256 locks) ops/sec\n    1      2.57 M  (1.0x)          2.14 M  (1.0x)\n    8      1.15 M  (0.4x)          9.02 M  (4.2x)' },
        { text: 'Lamba run (numbers tikte hain?).', cmd: 'node tools/contention.js --ms 3000', expect: '    1      2.77 M  (1.0x)          2.60 M  (1.0x)\n    4      1.96 M  (0.7x)          8.79 M  (3.4x)\n    8      1.15 M  (0.4x)          8.53 M  (3.3x)\n(har run thoda alag — pattern wahi: ek taala girta hai, baante taale badhte hain)' },
      ],
      observe: {
        q: 'Ek taale par 8 threads 1 thread se bhi DHEEME kyun?',
        choices: [
          'Sab ek taale ka intezaar karte hain, aur taale ki cache line cores ke beech bhaagti rehti hai',
          'Extra threads ne network dheema kar diya, isliye har thread ka kaam ruk-ruk ke hua',
          'Har core ne alag kaam kiya, par alag kaam ko jodne mein zyada waqt lag gaya',
          '8 threads ka kharcha kam hona chahiye tha — lab mein ginti ki galti hai',
        ],
        answer: 0,
        explain: 'Kaam serial hua, upar se coordination ka kharcha. Sharing = bheed. WhatsApp ne ETS tables aur replication streams isi wajah se baante.',
        choiceExplanations: [
          'Kaam serial hua, upar se coordination ka kharcha. Sharing = bheed. WhatsApp ne ETS tables aur replication streams isi wajah se baante.',
          'Lab mein network tha hi nahi — sab memory mein.',
          'Ek taale par kaam alag nahi hota — sab line mein khade.',
          'Contention ka 0.4× asli hai, ginti ki galti nahi.',
        ],
      },
      lesson: 'Cores tabhi kaam aate hain jab koi saajha taala na ho — hotspot dhoondho aur baanto.',
    },
    {
      type: 'bins',
      title: 'Multiplication ya sharing?',
      instructions: 'Har WhatsApp fix kis dushman ke khilaaf tha?',
      bins: [
        { id: 'mult', label: '✖️ Multiplication (per-connection kharcha)' },
        { id: 'share', label: '🔒 Sharing (sab ek cheez chhoote)' },
      ],
      items: [
        { text: 'OS call ki jagah CPU ka TSC se time', bin: 'mult', explain: 'Har connection har baar time maangta tha — chhota × laakhon.' },
        { text: 'ETS table ko kai tukdon mein baanta', bin: 'share', explain: 'Ek table jise sab chhoote the.' },
        { text: 'Huge pages', bin: 'mult', explain: 'Har memory access ka TLB kharcha × saikdon GB.' },
        { text: 'Process linking ka global lock hataya', bin: 'share', explain: 'Global lock = sabki bheed.' },
        { text: 'Har table ki apni replication stream', bin: 'share', explain: 'Ek stream sab tables ke liye = ek darwaaza.' },
        { text: 'Kernel connection hash table badi ki', bin: 'share', explain: 'Chhoti table = buckets mein takraav = ek hi jagah par bheed.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — scaling one box',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "32 cores hain par throughput 8 cores ke baad nahi badhta."',
        choices: [
          'Saajhe locks, counters, tables dhoondho (profiler, lock stats) aur partition karo',
          'Thread count aur badhao — zyada threads hon toh 32 cores apne aap bhar jaayenge',
          'Aur cores lagao — 64 cores par throughput bhi seedha dugna ho jaayega',
          'Network bandwidth dugni karo — cores khaali hain toh rukawat network ki hi hogi',
        ],
        answer: 0,
        explain: 'Lab: ek taala = 8 threads par 0.4×. Saajhi cheez dhoondho aur baanto; false sharing ke liye padding.',
        choiceExplanations: [
          'Lab: ek taala = 8 threads par 0.4×. Saajhi cheez dhoondho aur baanto; false sharing ke liye padding.',
          'Zyada threads ek taale par aur bheed badhate hain.',
          'Rukawat taala hai — naye cores bhi wahi intezaar karenge.',
          'Cores khaali hain kyunki taale par ruke hain, network ki wajah se nahi.',
        ],
      },
      {
        q: 'Interviewer: "Scale up pehle, scale out baad mein — kyun?"',
        choices: [
          'Har nayi machine ek aur tootne wali cheez; pehle ek box kheencho, par tez failover rakho',
          'Ek bade box par failover ki zaroorat hi nahi — bada box girta nahi, toh backup bekaar hai',
          'Scale out mein coordination ka koi kharcha nahi — machines jodo, kaam seedha bat jaayega',
          'Vertical scaling ki koi chhat nahi — box ko jitna chahe utna bada karte raho',
        ],
        answer: 0,
        explain: 'Public story ke connection counts optimization ki misaal hain; exact hardware, version aur workload alag the. Lab ka shared-lock profile local saboot hai, poora WhatsApp nahi.',
        choiceExplanations: [
          'Public story ke connection counts optimization ki misaal hain; exact hardware, version aur workload alag the. Lab ka shared-lock profile local saboot hai, poora WhatsApp nahi.',
          'Bada box bhi girta hai — aur tab bahut log ek saath.',
          'Har nayi machine coordination aur failure ka kharcha laati hai.',
          'Har box ki ek chhat hai — CPU, memory, network.',
        ],
      },
    ],
  },
  success: [
    'Main multiplication aur sharing ke dushman pehchaan sakta hoon',
    'Main partitioned locks ka asar lab se dikha sakta hoon',
    'Main registry-based routing samjha sakta hoon',
  ],
  homework: `<p>Apne service ke code mein saajhi cheezein dhoondho: global mutex, singleton cache, ek hi DB row jise har request update
    kare (counter), ek hi queue. Har ek ke saamne likho: kya saajhi cheez ko user/tenant/hash se baanta ja sakta hai?</p>`,
  cards: [
    { front: 'WhatsApp ke do dushman?', back: 'Multiplication (per-connection kharcha × laakhon) aur sharing (saajha lock/counter/table = bheed).' },
    { front: 'Grungy fixes ki misaal?', back: 'CPU TSC se time, badi kernel hash table, huge pages, spinning band, global-lock linking → monitors, ETS partitioned, per-table replication.' },
    { front: 'Lab 25: taale?', back: "Ek taala: 8 threads par 0.4× (dheema). 256 taale: 4.2×." },
  ],
},

/* =====================================================================
   3. wa-store-forward
   ===================================================================== */
{
  id: 'wa-store-forward',
  icon: '📮',
  title: 'Dakghar — store and forward, let it crash',
  badge: 'Dakiya Dost',
  objectives: [
    'Online → push aur bhool jao; offline → queue, deliver, delete',
    'Media pointer + fingerprint; ticks ka matlab',
    'Let it crash + supervisors; hot code loading',
    'Persistent connection + push notification backup',
  ],
  lesson: [
    "<h3>📮 Dakghar, filing cabinet nahi</h3>\n     <p>Recipient online → push karo aur <b>bhool jao</b>. Offline → Erlang ke apne DB (Mnesia) mein queue → wapas aaya → deliver →\n     <b>delete</b>. Storage chhota rehta hai kyunki server sirf \"raaste mein\" wale messages rakhta hai.</p>\n     <pre>lab 25 (ex3-store-forward) — Riya chat1 par, Aman chat2 par:\n1) dono online: 3 messages live, \"OK via chat2\", registry mein stored 0\n2) Aman offline: 5 messages → \"OK queued\", stored 5\n3) Aman wapas (is baar chat1 par): 5 mile, stored 0 (5 store, 5 deliver hoke mitaaye)</pre>\n     <h3>🖼️ Media chat ke raaste se nahi</h3>\n     <p>Phone image <b>encrypt</b> karta hai → alag blob storage par upload → chat mein sirf ek chhota <b>pointer</b> (URL + decryption\n     key + content fingerprint). Same encrypted object reference reuse se forwarding bytes share ho sakti hain. Har fresh encryption ka ciphertext/fingerprint same hone ki guarantee nahi; scope, key distribution aur authorized access explicit hon.</p>\n     <p><b>Ticks</b>: 1 grey = server ke paas; 2 grey = phone tak pahuncha; 2 blue = padh liya. Server utna hi rakhta hai jitna \"deliver\n     hua? retry?\" ke liye chahiye, phir chhod deta hai.</p>",
    `<h3>💥 Let it crash</h3>
     <p>Anjaani error → process mar jaata hai → <b>supervisor</b> (supervisor trees) use milliseconds mein dobara shuru karta hai. Ek user
     ke liye second ka ek tukda. Self-healing = chhoti team WhatsApp chala paayi.</p>
     <h3>🔥 Hot code loading</h3>
     <p>Restart = laakhon connections tootein + reconnect storm. BEAM <b>chalte hue</b> module ka code badal deta hai.</p>
     <h3>🏋️ Scale up pehle</h3>
     <p>Har machine = raat 3 baje tootne wali ek aur cheez. Apna bare metal, FreeBSD (performance + poora stack tune). Coordination ke
     liye Erlang ke pehle se diye tareeke — services ka minaar nahi.</p>
     <h3>📱 Phone ki taraf</h3>
     <p>Ek persistent connection + heartbeats, kamzor mobile par; toota toh reconnect aur chhoote messages kheencho. OS background app
     maar deta hai → Apple/Google <b>push</b> app ko jagata hai → reconnect. Khula connection = turant; push = backup.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — offline queue aur dusre server se wapas aana',
      project: '25-whatsapp',
      exercise: 'ex3-store-forward',
      goal: 'Riya chat1 par, Aman chat2 par. Aman offline hota hai, phir chat1 se wapas aata hai — messages mile? Server par kya bacha?',
      why: `<code>services/registry.js</code> batata hai kaun kis server par online hai aur offline logon ka queue rakhta hai.
        Deliver hote hi queue se mitata hai. <code>services/chat.js</code> online recipient dusre server par ho toh us server ko forward.`,
      steps: [
        { text: 'Registry + do chat servers chalao.', cmd: 'cd docker-labs/25-whatsapp && npm start ex3-store-forward', expect: 'ex3-store-forward\n[registry] :5013\n[chat1] :5011\n[chat2] :5012' },
        { text: 'Kahani chalao.', cmd: 'node tools/offline.js', expect: '1) Dono online (alag servers): Aman ko mile 3: ["riya live message 1","riya live message 2","riya live message 3"]\n   Riya ko ACKs: ["OK via chat2","OK via chat2","OK via chat2"]   registry mein stored: 0\n\n2) Aman ka phone band. Riya ne 5 bheje → ACKs ["OK queued","OK queued"]…   registry mein stored: 5\n\n3) Aman wapas (is baar chat1 par): READY ke saath mile 5: […]\n   registry mein ab stored: 0   (kabhi 5 store hue, 5 deliver hoke mitaaye)' },
      ],
      observe: {
        q: 'Deliver ke baad server se message mitane ka sabse bada faayda?',
        choices: [
          'Server storage sirf "raaste mein" wale messages se badhti hai — history phone par, servers chhote',
          'Mitate hi delivery ka waqt zero ho jaata hai, kyunki server ke paas kuch dhoondhna nahi',
          'Server par backup ki zaroorat hamesha ke liye khatam, kyunki server par kuch rehta hi nahi',
          'Mitane se saara metadata bhi gayab — kisne kisko kab bheja, server ko kuch pata nahi',
        ],
        answer: 0,
        explain: 'Keemat: history ka search aur backup server se nahi hota — search aur backup phones par gaye.',
        choiceExplanations: [
          'Keemat: history ka search aur backup server se nahi hota — search aur backup phones par gaye.',
          'Delivery ka waqt network aur queue se aata hai, mitane se nahi.',
          'Raaste wale messages ko bhi crash se bachana padta hai.',
          'Message mitana aur metadata mitana alag cheezein hain.',
        ],
      },
      lesson: 'Dakiya sirf pahunchata hai, rakhta nahi — messages mitaane se server chhota aur sasta.',
    },
    {
      type: 'match',
      title: 'Kaunsa mechanism kya bachata hai?',
      instructions: 'Har mechanism ko sahi kaam se jodo.',
      pairs: [
        { left: '🧯 Supervisor tree', right: 'Crash hua process ms mein dobara — ek user ka hiccup, sabka nahi', explain: 'Let it crash.' },
        { left: '🔥 Hot code loading', right: 'Deploy bina restart — laakhon connections nahi toot-te', explain: 'Reconnect storm se bachav.' },
        { left: '📎 Media pointer + fingerprint', right: 'Bade files chat raaste se bahar, forward = ek copy', explain: 'Chat path chhota aur tez.' },
        { left: '🔔 Push notification', right: 'OS ne app maara toh bhi jagao aur reconnect karao', explain: 'Khula connection pehla raasta, push backup.' },
        { left: '📮 Offline queue', right: 'Offline recipient ke messages deliver tak, phir delete', explain: 'Store and forward.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — delivery pipeline',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Chat app mein photo bhejne ka flow?"',
        choices: [
          'Client encrypt karke blob store par upload; chat message mein sirf pointer + key + hash',
          'Har hop par plaintext photo resize karo — har recipient ko apne phone ke size mein mile',
          'Photo ko base64 bana ke chat message ke andar hi har recipient ko bhejo',
          'Har photo ko random encrypt karo — phir bhi same photo poori duniya mein ek hi baar store',
        ],
        answer: 0,
        explain: 'Encrypted blob alag raaste par; chat message chhota pointer, key aur hash le jaata hai. Wahi encrypted object dobara bheja ja sakta hai. Par alag-alag random encryption same photo ka alag ciphertext banati hai — global dedup maan ke mat chalo.',
        choiceExplanations: [
          'Encrypted blob alag raaste par; chat message chhota pointer, key aur hash le jaata hai. Wahi encrypted object dobara bheja ja sakta hai. Par alag-alag random encryption same photo ka alag ciphertext banati hai — global dedup maan ke mat chalo.',
          'Plaintext photo server par aayi toh end-to-end encryption toot gayi.',
          'Base64 photo ko ~33% bada karta hai aur chat ka raasta bhaari karta hai.',
          'Random encryption se same photo alag bytes banti hai — dedup nahi hota.',
        ],
      },
      {
        q: 'Interviewer: "Server crash par users ke connections ka kya?"',
        choices: [
          'Clients reconnect karein, chhoote messages queue se kheenchein, aur ack idempotent ho',
          'Supervisors poori machine ka girna chhupa lete hain — users ko kuch pata nahi chalta',
          'Client ki UI hi pakka message store hai — server gira toh UI mein sab bacha rehta hai',
          'Server crash hona namumkin bana do — achhe code mein crash hota hi nahi',
        ],
        answer: 0,
        explain: 'Build for failure. Process-level isolation + supervisors ek connection ka crash wahin rokte hain; machine giri toh reconnect + queue se replay.',
        choiceExplanations: [
          'Build for failure. Process-level isolation + supervisors ek connection ka crash wahin rokte hain; machine giri toh reconnect + queue se replay.',
          'Supervisors process restart karte hain; machine giri toh connections tootenge.',
          'Raaste wale messages server ki queue mein hain, UI mein nahi.',
          'Har system kabhi na kabhi girta hai. Girne ka plan chahiye.',
        ],
      },
    ],
  },
  success: [
    'Main store-and-forward aur store-and-forward ka storage faayda samjha sakta hoon',
    'Main media pointer, fingerprint dedup aur ticks bata sakta hoon',
    'Main let-it-crash aur hot code loading ka kaam samjha sakta hoon',
  ],
  homework: `<p>Apne system mein koi cheez dhoondho jo "deliver hone ke baad" bhi rakhi jaati hai par zaroori nahi (processed queue messages,
    purane notifications, temp uploads). Kya use deliver/ack par mitane se storage ghatega? Kaunsi cheez sach mein history chahiye?</p>`,
  cards: [
    { front: 'Store and forward?', back: 'Online → push, bhool jao. Offline → queue → deliver → delete. Lab: stored 5 → 0 after delivery. Server storage "raaste mein" wale messages jitni.' },
    { front: 'WhatsApp media flow?', back: "Phone encrypt karta hai → blob storage → server ke paas sirf pointer, key aur integrity ki jaankari. Pehle se encrypted object ka reference dobara use ho sakta hai; par har baar naye random ciphertext se poore system mein ek jaisi files pehchaanna (dedup) nahi ho sakta." },
    { front: 'Let it crash?', back: 'Anjaani error par process mare, supervisor ms mein restart kare — self-healing, isliye chhoti team.' },
  ],
},

/* =====================================================================
   4. wa-e2e
   ===================================================================== */
{
  id: 'wa-e2e',
  icon: '🔐',
  title: 'End-to-end encryption — groups, devices, calls',
  badge: 'Band Lifafa Baba',
  objectives: [
    'Signal protocol: identity keys, double ratchet, forward secrecy',
    'Groups: pairwise vs sender keys (lab: asli AES-GCM)',
    'Multi-device (2021): user = devices ka set',
    'Calls P2P, aur mushkil hissa kahan gaya — trade-offs',
  ],
  lesson: [
    "<h3>✉️ Server sirf band lifafe dekhta hai</h3>\n     <p>E2E itihaas ka sabse bada rollout (~1 arab log ek saath), <b>Signal protocol</b> par. Isne server ko aur <b>simple</b> bhi banaya —\n     server sirf sealed envelopes dekhta hai; galti karne ko aur leak karne ko kam.</p>\n     <ul>\n       <li>Har device ki lambi <b>identity key</b>; server par sirf public keys.</li>\n       <li>Phones ek hi secret nikaal lete hain bina use bheje.</li>\n       <li><b>Double Ratchet</b>: message keys evolve hoti hain. Secure deletion ke saath <b>forward secrecy</b> past messages protect karti hai.\n       Future compromise recovery fresh DH entropy aur uncompromised endpoints par depend karti hai; dono guarantees ek nahi.</li>\n     </ul>\n     <h3>👥 Groups — sender keys</h3>\n     <p>Pairwise: 100 logon ke group mein ek message = 99 encryptions. <b>Sender keys</b>: har member apni key ek baar sabko baant-ta\n     hai; phir encrypt ek baar, ek sealed copy bhejo. Kharcha key management par shift — koi join/leave kare toh rotate.</p>\n     <pre>lab 25 (ex4) — asli AES-256-GCM, 200 messages × 1 KB:\n1000 members   pairwise     199,800 encryptions   200.5 MB upload   4,475 ms\n1000 members   sender key     1,199 encryptions     0.26 MB           28 ms   (+999 keys rotate on leave)</pre>",
    `<h3>💻 Multi-device (2021)</h3>
     <p>Pehle web/desktop phone ka <b>aaina</b> the (keys sirf phone par) → phone band = sab band. Naya design: har companion device (4
     tak) ki <b>apni identity key</b> → user = devices ka set. Bhejna = har recipient device ke liye alag encrypt + apne dusre devices ke
     liye bhi; history, contacts, read state devices ke beech E2E sync — server phir bhi andha. Kai saal ka project. Server deliver ke
     baad ab bhi kuch nahi rakhta.</p>
     <h3>📞 Calls</h3>
     <p>Erlang backend setup karta hai (kaun, ring, key exchange); voice/video <b>peer-to-peer</b> encrypted; relay sirf jab dono
     sakht firewalls ke peeche (WebRTC jaisa).</p>
     <h3>⚖️ Trade-offs</h3>
     <ul>
       <li>Erlang niche — kam engineers, kam libraries (Rick Reed ne join se pehle Erlang nahi likhi thi); fayda sirf isliye ki fit lagbhag perfect tha.</li>
       <li>Scale-up ki chhat, aur ek server = 20 lakh log ek saath gire → tez failover zaroori.</li>
       <li>Server history search/restore nahi kar sakta → complexity <b>arab phones</b> par (isi liye multi-device sync dard tha).</li>
     </ul>
     <p class="tip">🎯 Paanch sabak: sabse sasta scaling = kam karo; core runtime problem ke hisaab se; scale up pehle; complexity sasti jagah par
     (devices); failure ke liye banao (let it crash).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — group encryption: pairwise vs sender key',
      project: '25-whatsapp',
      exercise: 'ex4',
      goal: '100 aur 1,000 members ke group mein 200 messages — kitne encryptions, kitne bytes upload, kitna time?',
      why: `<code>tools/groupcrypt.js</code> asli AES-256-GCM (Node <code>crypto</code>) se dono tareeke chalata hai. Koi server nahi.`,
      steps: [
        { text: 'Tool chalao.', cmd: 'cd docker-labs/25-whatsapp && node tools/groupcrypt.js', expect: '   100    pairwise        19800       19.9 MB               466 ms   kuch nahi\n   100    sender key        299       0.21 MB                 7 ms   99 naye key bhejo (rotate)\n  1000    pairwise       199800      200.5 MB              4475 ms   kuch nahi\n  1000    sender key       1199       0.26 MB                28 ms   999 naye key bhejo (rotate)' },
        { text: 'Bade messages (64 KB) par.', cmd: 'node tools/groupcrypt.js --members 100 --kb 64 --messages 50', expect: '   100    pairwise         4950      309.5 MB               359 ms   kuch nahi\n   100    sender key        149       3.13 MB                 3 ms   99 naye key bhejo (rotate)' },
      ],
      observe: {
        q: 'Sender key ki keemat kahan gayi?',
        choices: [
          'Membership badalne par — koi group chhode toh sabki sender keys dobara baantni padti hain',
          'Sender keys server ko messages padhne deti hain — keemat privacy mein chuki',
          'Ek baar key nikaal di toh hamesha ke liye muft — revocation ka koi kharcha nahi',
          'Har message ka encryption kharcha anant ho jaata hai, kyunki har member alag encrypt',
        ],
        answer: 0,
        explain: 'Har message ka kharcha ghata, membership badalne ka kharcha badha. Rotation isliye taaki chhodne wala member aage ke messages na padh sake.',
        choiceExplanations: [
          'Har message ka kharcha ghata, membership badalne ka kharcha badha. Rotation isliye taaki chhodne wala member aage ke messages na padh sake.',
          'Server ko sender key nahi milti — message phir bhi E2E hai.',
          'Revocation ka matlab hi rotation hai — muft nahi.',
          'Sender key mein message ek hi baar encrypt hota hai — kharcha ghata.',
        ],
      },
      lesson: 'Encryption ka design bhi fan-out ka design hai: ek baar encrypt, server fan-out kare — par padh na sake.',
    },
    {
      type: 'quiz',
      title: 'E2E ki samajh',
      questions: [
        {
          q: 'Forward secrecy ka matlab?',
          choices: [
            'Baad mein key chori hui toh bhi purane messages nahi padhe ja sakte — har message nayi key',
            'Har aane wali key hamesha ke liye chori se bachi rehti hai, chahe phone hi hack ho jaaye',
            'Server ke backups apne aap private ho jaate hain, kyunki keys aage badhti rehti hain',
            'Messages ko aage forward karna safe ho jaata hai — naam hi "forward" secrecy hai',
          ],
          answer: 0,
          explain: 'Forward secrecy baad ki chori se purane messages bachati hai, agar purani keys theek se mitayi gayi hon. Aage ke messages ka bachna alag property hai (post-compromise); Double Ratchet mein naya DH aur threat ki maan-ne wali baatein maayne rakhti hain.',
          choiceExplanations: [
            'Forward secrecy baad ki chori se purane messages bachati hai, agar purani keys theek se mitayi gayi hon. Aage ke messages ka bachna alag property hai (post-compromise); Double Ratchet mein naya DH aur threat ki maan-ne wali baatein maayne rakhti hain.',
            'Phone hack hua toh aage ki keys bhi khatre mein hain — wahi alag property hai.',
            'Backup ki privacy alag design hai.',
            '"Forward" ka matlab message forward karna nahi.',
          ],
        },
        {
          q: 'Multi-device se pehle web WhatsApp phone band hone par kyun band ho jaata tha?',
          choices: [
            'Keys sirf phone par thi — purana web bas phone ka aaina tha, phone band toh web band',
            'Browser mein crypto chal hi nahi sakti thi, isliye web ko har cheez phone se maangni padti',
            'Server har browser band hone par session khatam karta tha, phone se koi lena-dena nahi',
            'Network bandwidth phone se bandhi thi — phone band hua toh web ka internet bhi gaya',
          ],
          answer: 0,
          explain: 'Naye design mein user = devices ka set, har device ki apni identity key.',
          choiceExplanations: [
            'Naye design mein user = devices ka set, har device ki apni identity key.',
            'Browser mein crypto chalti hai — naya multi-device design yahi karta hai.',
            'Dikkat phone ke band hone se thi, browser ke band hone se nahi.',
            'Web ka internet alag tha. Keys phone par thi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — E2E messaging',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "E2E group chat 5,000 members ka — kaise?"',
        choices: [
          'Sender keys: har member ki key ek baar pairwise baanto, message ek baar encrypt, join/leave par rotation',
          'Saare members ko ek hi private key de do — ek key se sab padh lenge, rotation ki zaroorat nahi',
          'Server plaintext lekar har member ke liye dobara encrypt kare — server tez hai, kaam aasan',
          'Sirf transport TLS lagao — TLS bhi encryption hai, toh group chat apne aap E2E ho gaya',
        ],
        answer: 0,
        explain: 'Lab: 1,000 members par 200 MB → 0.26 MB. Bade groups mein rotation ka kharcha dhyan se.',
        choiceExplanations: [
          'Lab: 1,000 members par 200 MB → 0.26 MB. Bade groups mein rotation ka kharcha dhyan se.',
          'Ek private key sabke paas = ek leak se sab khula, aur hataya member bhi padh sakta hai.',
          'Server plaintext dekh le toh E2E khatam.',
          'TLS server tak hai — server par message khula hota hai.',
        ],
      },
      {
        q: 'Interviewer: "E2E ka system design par kya asar?"',
        choices: [
          'Server simple (band lifaafe), par search, backup aur sync ka kaam clients par chala jaata hai',
          'Server phir bhi saara content aaram se search kar sakta hai, bas thoda dheema',
          'E2E se identity verification muft mil jaata hai — kaun kaun hai, apne aap pakka',
          'Encryption metadata bhi mita deti hai — server ko kisne kab bheja, kuch pata nahi',
        ],
        answer: 0,
        explain: '"Mushkil hissa kahan rahe?" — WhatsApp ne phones chune.',
        choiceExplanations: [
          '"Mushkil hissa kahan rahe?" — WhatsApp ne phones chune.',
          'Server ke paas plaintext hi nahi — search mumkin nahi.',
          'Keys sahi insaan ki hain, alag se verify karna padta hai (safety number).',
          'Metadata (kisne, kab) server ko phir bhi dikhta hai.',
        ],
      },
    ],
  },
  success: [
    'Main Signal protocol ke hisse (identity keys, ratchet, forward secrecy) samjha sakta hoon',
    'Main pairwise vs sender keys ka hisaab lab se dikha sakta hoon',
    'Main multi-device aur E2E ke trade-offs bata sakta hoon',
  ],
  homework: `<p>Apne product mein ek feature socho jo "server ko data dikhe" par tika hai (search, spam filter, backup). Agar data E2E ho
    jaaye, toh chuna hua feature kahan chalega — client par? Kitna mushkil hoga?</p>`,
  cards: [
     { front: 'Double ratchet / forward secrecy?', back: 'Forward secrecy purani keys ko bachati hai — bas purani keys theek se delete hui hon. Aage ki recovery alag guarantee hai: naya DH randomness, bina hack hua device, aur protocol ki shartein — teeno chahiye.' },
    { front: 'Sender keys (lab 25)?', back: "Key ek baar baanto, message ek baar encrypt. 1,000 members: 199,800 → 1,199 encryptions, 200 MB → 0.26 MB. Keemat: leave par rotation." },
    { front: 'Multi-device (2021)?', back: 'Har device ki apni identity key; user = devices ka set; har device ke liye alag encrypt; history E2E sync, server andha.' },
  ],
},
]);

})();
