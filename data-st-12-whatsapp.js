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
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🧵 Thread per connection</span>
        <div class="dg-cap">Har connection ka apna thread + stack (1–2 MB). 10 lakh = terabytes. OS das hazaar par haanfne lagta hai (C10K).
          Lab: Node worker thread ~5.4 MB → 20,000 = ~100 GB.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🪶 Erlang process / event loop</span>
        <div class="dg-cap">Erlang process = kuch sau bytes → laakhon ek machine par; har core ka ek scheduler; "reductions" se
          koi process core nahi pakad sakta. Lab: event loop par idle connection ~3.2 KB.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">XMPP (XML, lambe tags)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">FunXMPP (binary codes)</span>
      <span class="dg-pill acc">2G/3G par har byte keemti — chhota protocol ek feature hai</span>
    </div>`,
};

VISUALS['wa-contention'] = {
  t: '2 lakh se ~30 lakh connections — same hardware',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">✖️ Multiplication</span>
        <div class="dg-cap">Per-connection chhota kharcha × laakhon = bada. (OS se time maangna → CPU ka TSC padho; chhote memory
          chunks → huge pages.)</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🔒 Sharing</span>
        <div class="dg-cap">Koi bhi lock/counter/table jise sab chhoote = bheed. Global lock wala process linking → monitors;
          ek ETS table → <b>partitioned</b>; ek replication stream → per-table streams.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Lab 25 (asli threads, shared memory): ek taala — 8 threads par <b>0.4×</b> (dheema!); 256 taale — <b>4.2×</b>.</div>`,
};

VISUALS['wa-store-forward'] = {
  t: 'Dakghar, filing cabinet nahi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 Riya</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🗺️ registry: Aman kis server/process par?</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">online → push, bhool jao</span>
      <span class="dg-pill gold">offline → queue → wapas aaya → deliver → DELETE</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">✔️</span><span class="nl">1 grey</span><span class="ns">server ke paas</span></div>
      <div class="dg-node"><span class="ni">✔️✔️</span><span class="nl">2 grey</span><span class="ns">phone tak pahuncha</span></div>
      <div class="dg-node is-accent"><span class="ni">💙</span><span class="nl">2 blue</span><span class="ns">padh liya</span></div>
    </div>
    <div class="dg-cap">Media chat raaste se nahi: phone encrypt → alag blob storage → chat mein sirf pointer (URL + key + fingerprint).
      Forward hua meme ek baar store, laakh baar nahi.</div>`,
};

VISUALS['wa-e2e'] = {
  t: 'Server sirf band lifafe dekhta hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🔑</span><span class="cmd">Identity keys</span><span class="q">har device ki apni; server par sirf public keys</span></div>
      <div class="dg-rung a"><span class="lv">⚙️</span><span class="cmd">Double ratchet</span><span class="q">har message nayi key → ek key churi hui toh bhi pehle/baad ke nahi padh sakte</span></div>
      <div class="dg-rung a"><span class="lv">👥</span><span class="cmd">Sender keys (groups)</span><span class="q">ek baar encrypt, ek copy — lab: 1,000 members par 200 MB → 0.26 MB</span></div>
      <div class="dg-rung g"><span class="lv">💻</span><span class="cmd">Multi-device (2021)</span><span class="q">har device ki apni identity; user = devices ka set; har device ke liye alag encrypt</span></div>
    </div>`,
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
    `<h3>📉 50 log, 45 crore users</h3>
     <p>2014 mein Facebook ne WhatsApp $19B mein khareeda: ~45 crore users, ~50 log, ~30 engineers. Aaj 2 arab+ users, roz 100 arab+
     messages — wahi buniyaad. Ek server par ~20 lakh log ek saath. Server message aage deta hai aur <b>mita deta hai</b>. E2E
     encrypted. Siddhant: <b>kam se kam kaam</b> — server utna hi kare jitna zaroori, ek machine ko jitna ho sake kheencho, naye
     parts tabhi jab koi raasta na bache.</p>
     <h3>🔌 Chat server web server nahi hai</h3>
     <p>Web server: request aayi, jawab diya, connection gaya. Chat server: har online user ka <b>zinda connection</b>, zyadatar
     <b>chup</b> (phone jeb mein). Thread-per-connection mein har ek 1–2 MB → 10 lakh = terabytes; OS das hazaar par haanfta hai
     (C10K). Chahiye tha: per-connection kharcha ≈ 0.</p>
     <pre>lab 25 (ex1): 20,000 idle connections, ek Node process, ek event loop
  server RSS 47 MB → 109 MB = 3.2 KB per connection
lab 25: 200 asli worker threads → 5,427 KB per thread → 20,000 ke liye ~100 GB</pre>
     <p>(Imaandari: Node ka worker thread poora V8 isolate leta hai — C/Java ka thread sasta hai, par phir bhi KB nahi, MB.)</p>`,
    `<h3>☎️ Erlang — telephone exchange ki bhasha</h3>
     <p>Erlang Ericsson ne 1980s mein telephone switches ke liye banaya tha — laakhon calls, kabhi band nahi. Uska VM (<b>BEAM</b>):</p>
     <ul>
       <li><b>Process</b> = kuch sau bytes → laakhon ek machine par. Har user connection = ek process.</li>
       <li><b>Har core ka ek scheduler</b> (24 cores = 24).</li>
       <li><b>Reductions</b> se preemptive: ~har function call = 1 reduction; ~2,000 ke baad process ruk jaata hai → koi process core nahi
       pakad sakta; ek atka/dheema user doosron ko nahi rokta. Khaali scheduler doosron ka kaam chura leta hai.</li>
       <li>Processes memory share nahi karte, sirf <b>messages</b> — chat ki shakal hi yahi hai.</li>
     </ul>
     <p>Shuruaat open-source <b>ejabberd</b> (XMPP) se. XMPP = XML: angle brackets, dohraaye tags. India, Brazil, Indonesia mein 2G/3G par
     log → <b>FunXMPP</b>: binary codes, kahin kam bytes. <b>Chhota protocol dheeme network par ek feature hai.</b></p>`,
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
          'Idle connection bas ek socket + chhota buffer hai; koi apna stack/thread nahi — kaam tabhi jab data aaye',
          'Node memory compress karta hai',
          'Connections asli nahi the',
          'OS ne memory chhupa li',
        ],
        answer: 0,
        explain: 'Erlang ka process bhi isi soch ka — kuch sau bytes. Yahi 20 lakh connections per server ka raaz.',
      },
      lesson: 'Zinda par chup connections ke liye per-connection kharcha ~0 chahiye — thread nahi, event loop / halka process.',
    },
    {
      type: 'quiz',
      title: 'BEAM ki samajh',
      questions: [
        {
          q: 'Reductions ka faayda chat server mein?',
          choices: [
            'Koi ek dheema/atka user process core pakad ke baaki laakhon ko nahi rok sakta — ~2,000 reductions ke baad ruk ke baari aati hai',
            'Memory kam',
            'Network tez',
            'Encryption',
          ],
          answer: 0,
          explain: 'Preemptive scheduling = ek ki galti sabki latency nahi.',
        },
        {
          q: 'WhatsApp ne XMPP ko FunXMPP kyun banaya?',
          choices: [
            '2G/3G users ke liye bytes kam — XML ke lambe tags ki jagah binary codes',
            'Security',
            'XMPP band ho gaya',
            'Encryption ke liye',
          ],
          answer: 0,
          explain: 'Dheeme network par protocol ka size hi latency hai.',
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
          'Per-connection memory (event loop/lightweight processes, thread nahi), file descriptor limits, kernel buffers, heartbeat ka kharcha, aur ek dheema client doosron ko na roke',
          'Har connection ka thread, bada RAM',
          'Connections ko HTTP polling se badlo',
          'Load balancer hi kaafi',
        ],
        answer: 0,
        explain: 'Lab: 3.2 KB vs MBs per connection.',
      },
      {
        q: 'Interviewer: "Erlang jaisa niche language kyun chuna?"',
        choices: [
          'Problem ki shakal (laakhon halke, alag, message-passing wale connections + fault tolerance) se bilkul fit; keemat: kam engineers aur libraries',
          'Fashion',
          'Sasta',
          'Facebook ne kaha',
        ],
        answer: 0,
        explain: 'Core runtime problem ke hisaab se chuno.',
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
    { front: 'Erlang process kyun?', back: 'Kuch sau bytes → laakhon per machine; har core ka scheduler; reductions se preemption (koi core nahi pakad sakta); sirf message passing.' },
    { front: 'Lab 25: idle connection ka kharcha?', back: 'Event loop par ~3.2 KB; Node worker thread ~5.4 MB → 20,000 = ~100 GB.' },
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
    `<h3>🎯 Har fix = contention ka shikaar</h3>
     <p>2012 ka target: 10 lakh connections per server. Shuruaat ~2 lakh par, aur server girte rahe (bada football match khatam,
     bhookamp — sab ek saath message). 10 lakh paar, 20 lakh paar; Feb ke ek din ek server par peak <b>28 lakh</b> connections,
     5 lakh+ packets/sec, 2 lakh+ internal messages/sec — ek box par.</p>
     <p>Do dushman:</p>
     <ul>
       <li><b>Multiplication</b> — per-connection chhota kharcha × laakhon.</li>
       <li><b>Sharing</b> — koi bhi lock/counter/table jise sab chhoote = bheed.</li>
     </ul>
     <table>
       <tr><th>Mila</th><th>Fix</th></tr>
       <tr><td>Har baar OS se time maangna</td><td>CPU ka TSC seedha padho</td></tr>
       <tr><td>Kernel ki connection hash table mein takraav</td><td>Table badi (~5 lakh slots)</td></tr>
       <tr><td>Saikdon GB memory, TLB misses</td><td>Huge pages (bade chunks)</td></tr>
       <tr><td>Idle schedulers spin karke CPU kha rahe</td><td>Spinning band</td></tr>
       <tr><td>Process linking ek global lock leta tha</td><td>Halke monitors</td></tr>
       <tr><td>In-memory ETS table ek hotspot</td><td><b>Partitioned</b> — kai tukde</td></tr>
       <tr><td>DB replication ek stream se</td><td>Har table ki apni stream</td></tr>
     </table>
     <p>Video: "dark and grungy" kaam — aur <b>same hardware</b> par 2 lakh → ~30 lakh.</p>`,
    `<h3>🔒 Ek taala vs baante hue taale (lab 25, ex2)</h3>
     <pre>threads   one-lock ops/sec     partitioned (256 locks)
    1      2.57 M  (1.0x)          2.14 M  (1.0x)
    2      1.80 M  (0.7x)          4.09 M  (1.9x)
    4      1.43 M  (0.6x)          6.88 M  (3.2x)
    8      1.15 M  (0.4x)          9.02 M  (4.2x)</pre>
     <p>Ek taale par threads badhao toh kaam <b>ghata</b> — sab ek darwaaze par, upar se cache line ek core se doosre par bhaagti
     hai. Taale user ke hisaab se baanto → cores sach mein kaam aate hain. (Taale alag 64-byte cache lines par — ek line par
     rakhoge toh "false sharing" phir dheema kar deta hai.)</p>
     <h3>🗺️ Registry</h3>
     <p>Saikdon servers; Riya ka server ≠ Aman ka server. Distributed <b>registry</b>: har online user kis server aur kis process
     par → lookup → paar do → Aman ke socket par push. Cluster bhar mein 7 crore+ internal Erlang messages/sec.</p>`,
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
          'Sab ek hi taale ka intezaar karte hain aur taale ki cache line cores ke beech bhaagti rehti hai — kaam serial, upar se coordination ka kharcha',
          'Threads kam the',
          'CPU dheema',
          'Bug',
        ],
        answer: 0,
        explain: 'Sharing = bheed. WhatsApp ne ETS tables aur replication streams isi wajah se baante.',
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
          'Contention dhoondho — saajhe locks, counters, tables, allocators (profiler, lock stats); unhe partition/shard karo; false sharing ke liye padding',
          'Aur cores',
          'Bada clock speed',
          'Threads badhao',
        ],
        answer: 0,
        explain: 'Lab: ek taala = 0.4× at 8 threads.',
      },
      {
        q: 'Interviewer: "Scale up pehle, scale out baad mein — kyun?"',
        choices: [
          'Har nayi machine = 3 baje tootne wali ek aur cheez + coordination; ek machine ko contention hata ke 10× kheencho, phir faila o — par ek box gira toh bahut log ek saath, isliye tez failover',
          'Scale up hamesha sasta',
          'Scale out mumkin nahi',
          'Koi farq nahi',
        ],
        answer: 0,
        explain: 'WhatsApp: same hardware par 2 lakh → ~30 lakh.',
      },
    ],
  },
  success: [
    'Main multiplication aur sharing ke dushman pehchaan sakta hoon',
    'Main partitioned locks ka asar lab se dikha sakta hoon',
    'Main registry-based routing samjha sakta hoon',
  ],
  homework: `<p>Apne service ke code mein saajhi cheezein dhoondho: global mutex, singleton cache, ek hi DB row jise har request update
    kare (counter), ek hi queue. Har ek ke saamne likho: kya ise user/tenant/hash se baanta ja sakta hai?</p>`,
  cards: [
    { front: 'WhatsApp ke do dushman?', back: 'Multiplication (per-connection kharcha × laakhon) aur sharing (saajha lock/counter/table = bheed).' },
    { front: 'Grungy fixes ki misaal?', back: 'CPU TSC se time, badi kernel hash table, huge pages, spinning band, global-lock linking → monitors, ETS partitioned, per-table replication.' },
    { front: 'Lab 25: taale?', back: 'Ek taala: 8 threads par 0.4× (dheema). 256 taale: 4.2×.' },
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
    `<h3>📮 Dakghar, filing cabinet nahi</h3>
     <p>Recipient online → push karo aur <b>bhool jao</b>. Offline → Erlang ke apne DB (Mnesia) mein queue → wapas aaya → deliver →
     <b>delete</b>. Storage chhota rehta hai kyunki server sirf "raaste mein" wale messages rakhta hai.</p>
     <pre>lab 25 (ex3-store-forward) — Riya chat1 par, Aman chat2 par:
1) dono online: 3 messages live, "OK via chat2", registry mein stored 0
2) Aman offline: 5 messages → "OK queued", stored 5
3) Aman wapas (is baar chat1 par): 5 mile, stored 0 (5 store, 5 deliver hoke mitaaye)</pre>
     <h3>🖼️ Media chat ke raaste se nahi</h3>
     <p>Phone image <b>encrypt</b> karta hai → alag blob storage par upload → chat mein sirf ek chhota <b>pointer</b> (URL + decryption
     key + content fingerprint). Same file = same fingerprint → forward hua meme <b>ek baar</b> store, laakh baar nahi.</p>
     <p><b>Ticks</b>: 1 grey = server ke paas; 2 grey = phone tak pahuncha; 2 blue = padh liya. Server utna hi rakhta hai jitna "deliver
     hua? retry?" ke liye chahiye, phir chhod deta hai.</p>`,
    `<h3>💥 Let it crash</h3>
     <p>Anjaani error → process mar jaata hai → <b>supervisor</b> (supervisor trees) use milliseconds mein dobara shuru karta hai. Ek user
     ke liye second ka ek tukda. Self-healing = chhoti team isse chala paayi.</p>
     <h3>🔥 Hot code loading</h3>
     <p>Restart = laakhon connections tootein + reconnect storm. BEAM <b>chalte hue</b> module ka code badal deta hai.</p>
     <h3>🏋️ Scale up pehle</h3>
     <p>Har machine = raat 3 baje tootne wali ek aur cheez. Apna bare metal, FreeBSD (performance + poora stack tune). Coordination ke
     liye jo Erlang pehle se deta hai, woh — services ka minaar nahi.</p>
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
        Deliver hote hi queue se mitata hai. <code>services/chat.js</code> online recipient dusre server par ho toh wahan forward.`,
      steps: [
        { text: 'Registry + do chat servers chalao.', cmd: 'cd docker-labs/25-whatsapp && npm start ex3-store-forward', expect: 'ex3-store-forward\n[registry] :5013\n[chat1] :5011\n[chat2] :5012' },
        { text: 'Kahani chalao.', cmd: 'node tools/offline.js', expect: '1) Dono online (alag servers): Aman ko mile 3: ["riya live message 1","riya live message 2","riya live message 3"]\n   Riya ko ACKs: ["OK via chat2","OK via chat2","OK via chat2"]   registry mein stored: 0\n\n2) Aman ka phone band. Riya ne 5 bheje → ACKs ["OK queued","OK queued"]…   registry mein stored: 5\n\n3) Aman wapas (is baar chat1 par): READY ke saath mile 5: […]\n   registry mein ab stored: 0   (kabhi 5 store hue, 5 deliver hoke mitaaye)' },
      ],
      observe: {
        q: 'Deliver ke baad server se message mitane ka sabse bada faayda?',
        choices: [
          'Server storage users ke saath nahi, sirf "raaste mein" wale messages ke saath badhti hai — chhote, saste servers; history phone par',
          'Security ke liye hi',
          'Tez delivery',
          'Kanoon',
        ],
        answer: 0,
        explain: 'Keemat: history search/backup server se nahi — woh complexity phones par gayi.',
      },
      lesson: 'Dakiya sirf pahunchata hai, rakhta nahi — isse server chhote aur sasta.',
    },
    {
      type: 'match',
      title: 'Kaunsa mechanism kya bachata hai?',
      instructions: 'Har mechanism ko uske kaam se jodo.',
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
          'Client encrypt → blob store par upload (content hash se dedup) → chat message mein sirf pointer + key + hash; receiver pointer se download aur decrypt',
          'Photo chat message ke andar base64',
          'Server photo resize karke har recipient ko',
          'P2P hamesha',
        ],
        answer: 0,
        explain: 'Chat path chhota rakho; media alag, content-addressed.',
      },
      {
        q: 'Interviewer: "Server crash par users ke connections ka kya?"',
        choices: [
          'Process-level isolation + supervisors (ek connection ka crash sirf woh restart); machine gire toh clients reconnect + chhoote messages queue se kheenchein; tez failover',
          'Sab kho jaate hain',
          'Server kabhi crash nahi hota',
          'Users ko manually reconnect',
        ],
        answer: 0,
        explain: 'Build for failure.',
      },
    ],
  },
  success: [
    'Main store-and-forward aur uska storage faayda samjha sakta hoon',
    'Main media pointer, fingerprint dedup aur ticks bata sakta hoon',
    'Main let-it-crash aur hot code loading ka kaam samjha sakta hoon',
  ],
  homework: `<p>Apne system mein koi cheez dhoondho jo "deliver hone ke baad" bhi rakhi jaati hai par zaroori nahi (processed queue messages,
    purane notifications, temp uploads). Kya use deliver/ack par mitane se storage ghatega? Kaunsi cheez sach mein history chahiye?</p>`,
  cards: [
    { front: 'Store and forward?', back: 'Online → push, bhool jao. Offline → queue → deliver → delete. Lab: stored 5 → 0 after delivery. Server storage "raaste mein" wale messages jitni.' },
    { front: 'WhatsApp media flow?', back: 'Phone encrypt → alag blob storage → chat mein pointer (URL + key + fingerprint). Same file = ek copy.' },
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
    `<h3>✉️ Server sirf band lifafe dekhta hai</h3>
     <p>E2E itihaas ka sabse bada rollout (~1 arab log ek saath), <b>Signal protocol</b> par. Isne server ko aur <b>simple</b> bhi banaya —
     server sirf sealed envelopes dekhta hai; galti karne ko aur leak karne ko kam.</p>
     <ul>
       <li>Har device ki lambi <b>identity key</b>; server par sirf public keys.</li>
       <li>Phones ek hi secret nikaal lete hain bina use bheje.</li>
       <li><b>Double ratchet</b>: har message nayi key → <b>forward secrecy</b> — ek key churi hui toh bhi pehle ya baad ke messages nahi
       padh sakte.</li>
     </ul>
     <h3>👥 Groups — sender keys</h3>
     <p>Pairwise: 100 logon ke group mein ek message = 99 encryptions. <b>Sender keys</b>: har member apni key ek baar sabko baant-ta
     hai; phir encrypt ek baar, ek sealed copy bhejo. Kharcha key management par shift — koi join/leave kare toh rotate.</p>
     <pre>lab 25 (ex4) — asli AES-256-GCM, 200 messages × 1 KB:
1000 members   pairwise     199,800 encryptions   200.5 MB upload   4,475 ms
1000 members   sender key     1,199 encryptions     0.26 MB           28 ms   (+999 keys rotate on leave)</pre>`,
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
     <p class="tip">🎯 Paanch sabak: sabse sasta scaling = kam karo; core runtime problem ke hisaab se; scale up pehle; complexity wahan
     jahan sasti (devices); failure ke liye banao (let it crash).</p>`,
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
          'Key management mein — koi group chhode toh sabki sender keys rotate, taaki woh aage ke messages na padh sake',
          'Kahin nahi, muft hai',
          'Server ko keys pata hain',
          'Forward secrecy khatam',
        ],
        answer: 0,
        explain: 'Har message ka kharcha ghata, membership badalne ka kharcha badha.',
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
            'Ek message ki key churi hui toh bhi pehle aur baad ke messages nahi padhe ja sakte — har message nayi key (double ratchet)',
            'Messages aage forward ho sakte hain',
            'Server keys rakhta hai',
            'Backup encrypted hai',
          ],
          answer: 0,
          explain: 'Ratchet sirf aage ghoomta hai.',
        },
        {
          q: 'Multi-device se pehle web WhatsApp phone band hone par kyun band ho jaata tha?',
          choices: [
            'Keys sirf phone par thin — web sirf phone ka aaina tha; naye design mein har device ki apni identity key',
            'Server band',
            'Browser limit',
            'Bandwidth',
          ],
          answer: 0,
          explain: 'User = devices ka set, har device apna.',
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
          'Sender keys: har member ki key ek baar pairwise baanto, message ek baar encrypt, server fan-out; join/leave par rotation; bade groups mein rotation ka kharcha dhyan se',
          'Har member ko pairwise',
          'Server par decrypt karke re-encrypt',
          'E2E groups mein mumkin nahi',
        ],
        answer: 0,
        explain: 'Lab: 1,000 members par 200 MB → 0.26 MB.',
      },
      {
        q: 'Interviewer: "E2E ka system design par kya asar?"',
        choices: [
          'Server simple (sealed envelopes), par search/backup/sync/moderation server par nahi ho sakte → complexity clients par jaati hai',
          'Server mehenga',
          'Koi asar nahi',
          'Latency badhti hai bas',
        ],
        answer: 0,
        explain: '"Mushkil hissa kahan rahe?" — WhatsApp ne phones chune.',
      },
    ],
  },
  success: [
    'Main Signal protocol ke hisse (identity keys, ratchet, forward secrecy) samjha sakta hoon',
    'Main pairwise vs sender keys ka hisaab lab se dikha sakta hoon',
    'Main multi-device aur E2E ke trade-offs bata sakta hoon',
  ],
  homework: `<p>Apne product mein ek feature socho jo "server ko data dikhe" par tika hai (search, spam filter, backup). Agar data E2E ho
    jaaye, toh woh feature kahan chalega — client par? Kitna mushkil hoga?</p>`,
  cards: [
    { front: 'Double ratchet / forward secrecy?', back: 'Har message nayi key; ek key churi hui toh bhi pehle/baad ke messages safe.' },
    { front: 'Sender keys (lab 25)?', back: 'Key ek baar baanto, message ek baar encrypt. 1,000 members: 199,800 → 1,199 encryptions, 200 MB → 0.26 MB. Keemat: leave par rotation.' },
    { front: 'Multi-device (2021)?', back: 'Har device ki apni identity key; user = devices ka set; har device ke liye alag encrypt; history E2E sync, server andha.' },
  ],
},
]);

})();
