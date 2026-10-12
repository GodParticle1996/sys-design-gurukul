/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Slack

   Source: "How Slack Keeps 5 Million Live Connections Open at Once"
   (Akhil Sharma) + Slack ka engineering blog aur Mike Demmer / Bing Wei
   ke infrastructure talks.

   4 levels:
     st-slack-boot   — snapshot ka phoolna, reconnect storm, Flannel
     st-slack-fanout — store-then-send, channel server, edge fan-out, presence
     st-slack-shard  — workspace se sharding, hot shard, Vitess, shared channels
     st-slack-queue  — 2016 ka job-queue deadlock, Kafka + Redis, cells, Nebula
   ===================================================================== */
(function () {

VISUALS['st-slack-boot'] = {
  t: 'Boot: pehle poora snapshot, phir Flannel',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Purana boot</span>
        <div class="dg-flow">
          <span class="dg-pill">📱 app</span><span class="dg-arrow">→</span>
          <span class="dg-pill bad" data-hs="snap">📦 poora snapshot (~100 MB)</span><span class="dg-arrow">→</span>
          <span class="dg-pill">🔌 WebSocket updates</span>
        </div>
        <div class="dg-cap">Har user, har channel, har membership — chahe tumhe zaroorat ho
          ya na ho. 9 baje sab ek saath maangte hain: <b>reconnect storm</b>.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Flannel ke baad</span>
        <div class="dg-flow">
          <span class="dg-pill">📱 app</span><span class="dg-arrow">→</span>
          <span class="dg-pill good" data-hs="flannel">🧣 Flannel (edge cache)</span><span class="dg-arrow">→</span>
          <span class="dg-pill">🔌 events + missing data injected</span>
        </div>
        <div class="dg-cap">Client lagbhag khaali boot hota hai. Flannel har event ke
          saath woh metadata <b>jod deta hai</b> jo client ke paas nahi hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">cache</span><span class="cmd">sirf sawaal ka jawab</span><span class="q">aam cache yahin rukta hai</span></div>
      <div class="dg-rung g"><span class="lv">Flannel</span><span class="cmd">stream ko EDIT karta hai</span><span class="q">event mein us user ka profile chipka deta hai jo client ne kabhi load hi nahi kiya</span></div>
      <div class="dg-rung g"><span class="lv">natija</span><span class="cmd">purane clients bina badle chalte rahe</span><span class="q">backend naya model, client wahi — dono alag-alag migrate hue</span></div>
    </div>
    <div class="dg-cap">32,000 users ke workspace par startup payload lagbhag <b>44×</b> chhota ho gaya.</div>`,
};

VISUALS['st-slack-fanout'] = {
  t: 'Message: pehle likho, phir baanto',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">⌨️ send</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="write">💾 workspace shard par LIKHO</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="cs">📡 channel server (kaun subscribe hai?)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="edge">🌍 ek copy per edge</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">📱 nazdeeki clients</span>
    </div>
    <div class="dg-cap">Agar pehle bhej diya aur write fail ho gaya, toh screen par ek aisa
      message hai jo hua hi nahi. Isliye <b>store, phir send</b>.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">📡 Pub/sub</span>
        <div class="dg-cap">Channel server ke paas live map hai: kaunsa client kis channel
          par hai. Busy channel sirf apne sunne walon ka kaam banata hai.</div></div>
      <div class="dg-box is-accent"><span class="bx-label">🌍 Edge fan-out</span>
        <div class="dg-cap">Ek sheher mein 100 log? Lambi doori par <b>ek</b> copy, aur
          copies wahan banti hain jahan bandwidth sasti hai.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🧯 Replay buffer</span>
        <div class="dg-cap">Fan-out ke beech crash? Jo bheja nahi gaya woh buffer mein hai —
          restart par adhoora kaam dobara chalta hai. Message der se aayega, gayab nahi hoga.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-cap"><b>Presence</b> (hara dot) ka sabak: pehle har badlav sabko bheja
      jaata tha. Ab client sirf un logon ki presence subscribe karta hai jo <b>screen par
      dikh rahe hain</b> — presence events lagbhag <b>5×</b> kam ho gaye.</div>`,
};

VISUALS['st-slack-shard'] = {
  t: 'Workspace se sharding — aur hot shard',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🔎 kaunsa workspace?</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="lookup">🗺️ lookup table</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="shard">🗄️ us workspace ka shard (MySQL)</span>
    </div>
    <div class="dg-cap">Ek company ka poora data ek shard par — isliye lagbhag har query
      ka pehla sawaal ek hi hai: "yeh company kis database par hai?"</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔥 Hot shard</span>
        <div class="dg-node is-bad" data-hs="hot"><span class="ni">🏢</span><span class="nl">1 lakh logon ki company</span><span class="ns">poora bhaar ek shard par</span></div>
        <div class="dg-cap">Do hi raaste bachte hain, aur dono kharab: haath se workspaces
          idhar-udhar karte raho, ya hamesha bada machine kharidte raho.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Vitess</span>
        <div class="dg-cap">MySQL wahi rehta hai, upar ek layer aa jaati hai jo routing aur
          sharding sambhalti hai — ab ek hi workspace ka data <b>kai shards</b> par bat
          sakta hai, aur app ko pata bhi nahi chalta.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-cap">Aur jab product boundary ko todta hai — <b>Enterprise Grid</b> aur
      <b>shared channels</b> — toh ek channel do workspaces mein hota hai. Maalik kaun?
      Kiska keyspace? Kiska real-time tier fan-out karega? <b>Jo boundary faayda thi, wahi
      ab tax hai.</b></div>`,
};

VISUALS['st-slack-queue'] = {
  t: '2016: queue dono taraf se jam ho gayi',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">database dheema hua</span><span class="q">background jobs ko DB chahiye — workers dheeme ho gaye</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">aane wale &gt; jaane wale</span><span class="q">backlog banna shuru</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">3</span><span class="cmd">backlog RAM mein hai</span><span class="q">Redis in-memory — backlog badha toh memory bhari</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">4</span><span class="cmd">memory khatam</span><span class="q">naye jobs accept nahi — yeh apne aap mein data loss hai</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">5</span><span class="cmd">exit bhi jam</span><span class="q">job NIKALNE ke liye bhi thodi memory chahiye thi — aur woh bachi hi nahi</span></div>
      <div class="dg-rung" style="border-left-color:var(--bad)"><span class="lv">6</span><span class="cmd">dequeue O(n)</span><span class="q">queue jitni lambi, nikalna utna dheema — theek us waqt jab lambi thi</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">📥 job</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="kafka">🪵 Kafka (disk par durable buffer)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="bridge">🌉 bridge service</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="redis">⚡ Redis (scheduling + execution)</span>
    </div>
    <div class="dg-cap">Kafka ko Redis ki jagah nahi — <b>Redis ke aage</b> lagaya gaya.
      Kafka log ka kaam achha karta hai (ordered stream, disk), Redis task scheduling ka.
      Job Kafka mein "done" tabhi hota hai jab woh Redis mein pahunch chuka ho.</div>`,
};

/* =====================================================================
   LEVEL 1 — BOOT aur FLANNEL
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-slack-boot',
  icon: '🧣',
  title: 'Slack — 100 MB ka boot, aur uska ilaaj',
  badge: 'Boot Bachao',
  objectives: [
    'Snapshot + stream ka classic model aur uski seema',
    'Reconnect storm — sabse bada response, sabse bure waqt par',
    'Flannel: cache jo stream mein missing data inject karta hai',
    'Backend aur client ko alag-alag migrate karna',
  ],
  lesson: [
    `<h3>🔌 5 lakh nahi — 50 lakh live connections</h3>
     <p>Slack ek simple chat app dikhta hai, par weekday peak par uske paas <b>50 lakh se
     zyada WebSocket connections</b> ek saath khule rehte hain. Har client ko sirf uske
     kaam ke events chahiye, turant.</p>
     <p>Do problem hain: <b>delivery</b> (message aaya toh kin connections tak jaana hai)
     aur <b>boot</b> (subah Slack kholte hi poora workspace kaise load ho).</p>
     <h3>📦 Boot ka classic model</h3>
     <p>Client ko do cheezein chahiye: abhi ki state (users, channels, memberships, unread
     counts) aur uske baad ka live stream. Slack ne wahi kiya jo kitaab kehti hai:
     <code>rtm.start</code> se ek snapshot, phir WebSocket par updates.</p>
     <p>Chhoti team ke liye yeh shandaar tha. Par snapshot company ke saath badhta gaya:
     har naya employee ek profile, har naya channel metadata, har membership aur unread
     count. Ek 10,000 logon ki company mein payload dasiyon MB — aur sabse badi
     organizations mein client lagbhag <b>100 MB</b> download karta tha, phir usse parse
     karke local state banata tha.</p>
     <h3>⚡ Aur uska sabse bura din: reconnect storm</h3>
     <p>Socho 9 baje subah — poori company ek saath kaam shuru karti hai. Ya ek network
     blip se hazaron clients ek saath disconnect hote hain aur ek saath wapas aate hain.
     Har client wahi <b>sabse bada response</b> maangta hai, theek us waqt jab system
     pehle se dabaav mein hai.</p>
     <p class="tip">🎯 Soch galat nahi thi (snapshot + stream aaj bhi sahi hai). Problem
     yeh thi ki <b>snapshot itna bada ho gaya ki use ek object ke roop mein banana hi
     mehenga tha</b>.</p>`,
    `<h3>🧣 Flannel — cache jo jawab dena hi nahi, stream badalna jaanti hai</h3>
     <p>Slack ne ek edge cache banaya: <b>Flannel</b> (naam? jis din naam chahiye tha, ek
     engineer flannel shirt pehne tha). Woh users ke nazdeek data centers mein chalta hai
     aur workspace metadata ki in-memory copy rakhta hai — users, channels, bots.</p>
     <p>Ab client lagbhag <b>khaali</b> boot hota hai aur jo chahiye woh Flannel se maangta
     hai — nazdeek cache se kuch milliseconds mein.</p>
     <p>Par asli chaal aage hai: <b>Flannel real-time connection ke raaste mein baitha
     hai</b>. Har event Flannel se hokar client tak jaata hai. Maan lo ek message aata hai
     jisme aise user ka mention hai jise client ne kabhi load hi nahi kiya. Purane model
     mein woh profile snapshot mein pehle se hoti. Naye model mein nahi hai — toh Flannel
     event ko dekhta hai, cache se woh profile nikalta hai, aur <b>event ke saath chipka
     kar</b> aage bhejta hai. Client ko sab kuch pehle se mil jaata hai.</p>
     <h3>🎁 Bonus jo asal mein sabse badi jeet thi</h3>
     <p>Purane clients yeh maan kar likhe gaye the ki "mere paas sab kuch pehle se hai".
     Naye model mein data lazily aata hai — matlab har platform ka client dobara likhna
     padta, coordinated releases ke saath.</p>
     <p>Par Flannel ke rehte <b>client badalna zaroori hi nahi tha</b>: jab client ko
     kisi cheez ki zaroorat hoti, Flannel usse pehle hi de deta tha. Purane clients waise
     hi chalte rahe jaise purana architecture zinda ho, jabki backend poori tarah naye
     model par chala gaya. Infra team aur client team <b>alag-alag</b> migrate kar sake —
     koi risky "sab ek saath" release nahi.</p>
     <p>Nateeja: 32,000 users ke workspace par startup payload lagbhag <b>44×</b> chhota,
     aur reconnect storm ka bhaar distributed edge caches ne liya, core systems ne nahi.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — boot ka bill',
      goal: 'Snapshot model ka kharcha apne haath se nikalo.',
      problems: [
        {
          q: 'Ek workspace mein 10,000 users hain aur har user ka metadata lagbhag 2 KB hai. Sirf users ka snapshot kitne MB ka hua?',
          unit: 'MB', given: ['10,000 users', '2 KB per user'],
          answer: 20, tol: 0.3,
          steps: ['10,000 × 2 KB = 20,000 KB', '≈ 20 MB — aur yeh sirf users hain, channels/memberships alag'],
          lesson: 'Snapshot linear badhta hai org ke saath, chahe user ko us data ka 1% hi chahiye.',
        },
        {
          q: '9 baje 8,000 clients ek saath boot karte hain aur har snapshot 20 MB ka hai. Total kitna GB banana aur bhejna padega?',
          unit: 'GB', given: ['8,000 clients', '20 MB each'],
          answer: 160, tol: 0.3,
          steps: ['8,000 × 20 MB = 1,60,000 MB = 160 GB', 'Aur yeh sab kuch minuton mein'],
          lesson: 'Reconnect storm ka matlab: sabse bada response, sabse zyada baar, sabse bure waqt par.',
        },
        {
          q: 'Flannel ke baad payload 44× chhota ho gaya. Wahi 8,000 clients ab kitna GB maangenge?',
          unit: 'GB', given: ['160 GB', '44× chhota'],
          answer: 3.6, tol: 0.4,
          steps: ['160 / 44 ≈ 3.6 GB', 'Aur woh bhi edge caches se, core se nahi'],
          lesson: 'Do faayde ek saath: kam data, aur woh bhi users ke paas se.',
        },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Boot model lab',
      instructions: 'Org size, boot model aur edge caching badlo. Reconnect storm ka asar dekho.',
      goal: 'Aisi setting dhoondho jahan boot payload <b>3 MB se kam</b> ho, storm ke waqt core par load <b>30% se kam</b> rahe, aur client ko missing data ke liye <b>alag round trips na karne padein</b>.',
      scenario: `Ek bade customer ki org hai. Subah 9 baje sab ek saath Slack kholte hain.
        Tumhe boot ka model chunna hai.`,
      knobs: [
        { id: 'users', label: 'Org mein users', min: 1000, max: 60000, step: 1000, value: 40000, unit: '',
          note: 'Snapshot ka size seedha isse juda hai.' },
        { id: 'model', label: 'Boot model (0 = poora snapshot · 1 = lazy · 2 = lazy + stream injection)', min: 0, max: 2, step: 1, value: 0, unit: '',
          note: 'Lazy = jo chahiye woh maango. Injection = Flannel event ke saath hi bhej de.' },
        { id: 'edge', label: 'Edge cache locations', min: 1, max: 12, step: 1, value: 1, unit: '',
          note: 'Storm ka bhaar kitni jagah bat sakta hai.' },
      ],
      readouts: k => {
        const m = bootModel(k);
        return [
          { label: 'Boot payload', value: m.payloadMB + ' MB', tone: m.payloadMB <= 3 ? 'ok' : 'bad' },
          { label: 'Storm mein core par load', value: m.corePct + '%', tone: m.corePct <= 30 ? 'ok' : 'bad' },
          { label: 'Missing data ke liye extra round trips', value: m.extraTrips, tone: m.extraTrips === 'nahi' ? 'ok' : 'warn' },
          { label: 'Pehli screen dikhne mein', value: m.firstPaint + ' ms', tone: m.firstPaint <= 800 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = bootModel(k);
        return [
          { label: 'Payload', pct: Math.min(100, (m.payloadMB / 120) * 100), text: m.payloadMB + ' MB', tone: m.payloadMB <= 3 ? 'ok' : 'bad' },
          { label: 'Core load (storm)', pct: m.corePct, text: m.corePct + '%', tone: m.corePct <= 30 ? 'ok' : 'bad' },
          { label: 'First paint', pct: Math.min(100, (m.firstPaint / 6000) * 100), text: m.firstPaint + ' ms', tone: m.firstPaint <= 800 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = bootModel(k);
        if (k.model === 0) return { ok: false, text: `Poora snapshot: <b>${m.payloadMB} MB</b> per client, aur storm mein core par <b>${m.corePct}%</b> load. Yeh model org ke saath phoolta hai.` };
        if (k.model === 1 && m.extraTrips !== 'nahi') return { ok: false, text: `Lazy boot se payload <b>${m.payloadMB} MB</b> ho gaya, par ab client ko har naye user/channel ke liye alag request karni padti hai — event aur uska data do alag raaston se aate hain.` };
        if (m.corePct > 30) return { ok: false, text: `Model theek hai par sirf <b>${k.edge}</b> edge location hai — storm ka bhaar phir bhi core par (<b>${m.corePct}%</b>) aa raha hai.` };
        return { ok: true, text: `Yahi Flannel ka model hai: lazy boot (<b>${m.payloadMB} MB</b>), missing data event ke saath inject, aur storm <b>${k.edge}</b> edge locations mein bat gaya — core par sirf <b>${m.corePct}%</b>.` };
      },
      check: k => { const m = bootModel(k); return m.payloadMB <= 3 && m.corePct <= 30 && m.extraTrips === 'nahi'; },
      lesson: `Boot ka sawaal "kitna data" nahi, <b>"kis waqt aur kahan se"</b> hai.
        Flannel ne teenon badle: kitna (kam), kab (jab chahiye), kahan se (edge).`,
      quiz: {
        q: 'Flannel ko sirf cache kehna galat kyun hai?',
        choices: [
          'Kyunki woh real-time stream ke raaste mein baith kar events ko badalta hai — client jo maangne wala hai woh pehle hi jod deta hai',
          'Kyunki woh disk par data rakhta hai',
          'Kyunki woh database ke saamne nahi hai',
          'Kyunki woh sirf metadata rakhta hai',
        ],
        answer: 0,
        explain: 'Aam cache sawaal ka jawab deta hai. Flannel jawab ko bina sawaal ke bhej deta hai — isi se purane clients bina badle naye backend par chal gaye.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — snapshot boot vs lazy + injection',
      project: '06-slack',
      exercise: 'ex1-boot-payload',
      goal: 'Teen boot models chala kar payload, first paint aur reconnect storm ka asar naapo.',
      why: `Lab mein ek workspace service hai aur ek edge cache. <code>BOOT=full</code>
        poora snapshot bhejta hai, <code>BOOT=lazy</code> khaali boot karta hai aur client
        alag se data maangta hai, <code>BOOT=inject</code> mein edge har event ke saath
        missing metadata jod deta hai.`,
      steps: [
        { text: 'Full snapshot mode chalao (20,000 users ka workspace).', cmd: 'cd docker-labs/06-slack && npm start ex1-boot-payload', expect: 'ex1-boot-payload\n  workspace → http://localhost:4601  (BOOT=full · 20,000 users)' },
        { text: 'Ek client boot karo.', cmd: 'node tools/boot.js --clients 1', expect: 'BOOT=full   clients: 1   payload/client: 2.78 MB   extra lookups/client: 0   p99 boot: 88 ms' },
        { text: 'Reconnect storm chalao (200 clients ek saath).', cmd: 'node tools/boot.js --clients 200', expect: 'BOOT=full   clients: 200   payload/client: 2.78 MB   p99 boot: 14150 ms   failed boots: 86   core sent: 556.4 MB' },
        { text: 'Lazy mode chalao aur wahi storm.', cmd: 'BOOT=lazy npm start ex1-boot-payload && node tools/boot.js --clients 200', expect: 'BOOT=lazy   clients: 200   payload/client: 0.00 MB   extra lookups/client: 30   p99 boot: 2939 ms   failed boots: 0   core requests: 6396' },
        { text: 'Ab injection on karke dobara.', cmd: 'BOOT=inject npm start ex1-boot-payload && node tools/boot.js --clients 200', expect: 'BOOT=inject clients: 200   payload/client: 0.00 MB   extra lookups/client: 0   p99 boot: 367 ms   failed boots: 0   core requests: 400' },
      ],
      observe: {
        q: 'Lazy mode mein payload toh gir gaya par har client ne 30 extra lookups kiye (core par 6,396 requests). Injection ne woh 0 kaise kar diye?',
        choices: [
          'Edge ne event bhejte waqt hi woh metadata saath jod diya jo client ke paas nahi tha — client ko poochhne ki naubat hi nahi aayi',
          'Client ne data cache kar liya',
          'Injection mode ne poora snapshot bhej diya',
          'Lookups background mein chale gaye',
        ],
        answer: 0,
        explain: 'Yahi Flannel ka core idea hai: cache ko stream ke raaste mein rakho aur zaroorat se pehle data bhej do.',
      },
      lesson: 'Lazy loading akeli adhoori hai — usse "zaroorat se pehle bhej do" ke saath milao, warna tum ek bada request ko kai chhote requests mein badal dete ho.',
    },
  ],
  interview: {
    title: 'Interview Round — client boot',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "App ka initial load 40 MB hai. Kya karoge?"',
        choices: [
          'Boot ko lazy karo, aur jo data events ke liye chahiye woh event ke saath hi bhejo — taaki lazy loading kai chhoti requests na ban jaaye',
          'Payload compress kar do',
          'Snapshot ko cache kar lo browser mein',
          'Boot ko background mein kar do',
        ],
        answer: 0,
        explain: 'Compression aur caching madad karte hain par payload phir bhi org ke saath badhta hai. Slack ne model hi badla.',
      },
      {
        q: 'Interviewer: "Backend ka data model badalna hai par purane mobile clients saalon tak chalenge. Kya karoge?"',
        choices: [
          'Beech mein ek layer rakho jo purane clients ko wahi shakal deti rahe jo woh expect karte hain, jabki backend naye model par chala jaaye',
          'Sab clients ko force update karo',
          'Dono models backend mein rakho aur version header se switch karo',
          'Naye model ko sirf naye clients ke liye rakho',
        ],
        answer: 0,
        explain: 'Flannel ne yahi kiya: purane clients ko lagta raha ki unke paas sab kuch pehle se hai, jabki backend lazy model par chala gaya.',
      },
    ],
  },
  success: [
    'Main boot payload ko lazy + injection se chhota kar sakta hoon',
    'Main reconnect storm ka bhaar edge par daal sakta hoon',
    'Main client aur backend ki migration alag-alag chala sakta hoon',
  ],
  homework: `<p>Apne app ka pehla load dekho: kitne KB aate hain aur usme se kitna user ko
    pehli screen par chahiye? Jo baaki hai, uske saamne likho — "yeh kab chahiye hoga?"
    Har aisi cheez lazy ho sakti hai, <b>agar</b> tum use zaroorat ke waqt bina extra
    round trip ke bhej sako.</p>`,
  cards: [
    { front: 'Slack ka boot model?', back: 'Pehle: snapshot (rtm.start) + WebSocket stream. Snapshot org ke saath badhta gaya — badi orgs mein ~100 MB. 9 baje sab ek saath maangein = reconnect storm.' },
    { front: 'Flannel kya karta hai?', back: 'Edge cache jo real-time stream ke RAASTE MEIN baitha hai: client lagbhag khaali boot hota hai, aur Flannel har event ke saath woh metadata inject kar deta hai jo client ke paas nahi hai.' },
    { front: 'Flannel ka chhupa hua faayda?', back: 'Purane clients bina badle naye backend par chal gaye — infra aur client teams alag-alag migrate kar sake, koi "sab ek saath" release nahi.' },
    { front: 'Reconnect storm kya hai?', back: 'Hazaron clients ek saath (9 baje ya network blip ke baad) sabse bada response maangte hain — theek us waqt jab system pehle se dabaav mein hai.' },
  ],
},
]);

function bootModel(k) {
  const fullMB = +((k.users * 2048) / 1e6).toFixed(1);
  if (k.model === 0) return { payloadMB: fullMB, corePct: Math.min(100, 40 + Math.round(fullMB)), extraTrips: 'nahi', firstPaint: 300 + Math.round(fullMB * 40) };
  const lazyMB = +(0.3 + k.users / 200000).toFixed(1);
  const corePct = Math.max(6, Math.round(70 / k.edge));
  if (k.model === 1) return { payloadMB: lazyMB, corePct, extraTrips: 'haan (per event)', firstPaint: 420 };
  return { payloadMB: lazyMB, corePct, extraTrips: 'nahi', firstPaint: 320 };
}

/* =====================================================================
   LEVEL 2 — STORE THEN SEND, FAN-OUT, PRESENCE
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-slack-fanout',
  icon: '📡',
  title: 'Slack — pehle likho, phir baanto',
  badge: 'Fanout Faqeer',
  objectives: [
    'Store-then-send: likhna aur bhejna do alag kaam hain',
    'Channel server ka subscription map — pub/sub ka asli faayda',
    'Ek copy per edge — lambi doori par bandwidth bachana',
    'Replay buffer aur presence subscriptions',
  ],
  lesson: [
    `<h3>💾 Pehla niyam: message kho mat jaana</h3>
     <p>Tum enter dabate ho. Slack ka web app sabse pehle ek hi cheez sochta hai:
     <b>yeh message kho na jaaye</b>. Isliye woh pehle message ko tumhare workspace ke
     database mein likhta hai. Likhne ke <b>baad</b> hi distribution shuru hoti hai.</p>
     <p>Agar Slack pehle bhej deta aur write fail ho jaata, toh logon ki screen par ek
     aisa message hota jo <b>officially hua hi nahi</b>. Isliye niyam hai: <b>store, phir
     send</b>.</p>
     <h3>📡 Ab ek message ko kai messages banna hai</h3>
     <p>Channel ke har online member ko ek copy chahiye, aksar kai devices par, duniya ke
     alag-alag kono mein. Yeh kaam <b>channel server</b> ka hai, jiske paas ek live map
     hota hai: kaunsa client kaunse channel par subscribe hai.</p>
     <p>Message aaya toh woh har connected user ko broadcast nahi hota — sirf us channel
     ke subscribers ko jaata hai. Classic pub/sub. Faayda: <b>busy channel sirf apne
     sunne walon ka kaam banata hai</b>, poore system ka nahi.</p>
     <h3>🌍 Doosra scaling trap: ek hi sheher mein 100 copies</h3>
     <p>Maan lo ek sheher mein 100 log us channel par hain. Channel server 100 copies
     lambi doori par nahi bhejta — woh <b>ek</b> copy us edge location tak bhejta hai, aur
     final fan-out edge par hota hai, jahan bandwidth sasti hai.</p>
     <h3>🧯 Aur agar beech mein crash ho jaaye?</h3>
     <p>Channel server un messages ka buffer rakhta hai jo usne le liye hain par abhi
     poori tarah deliver nahi kiye. Fan-out ke beech crash hua toh restart par woh adhoora
     kaam <b>replay</b> hota hai. Server failure message ko <b>der</b> kar sakti hai,
     <b>gayab</b> nahi.</p>`,
    `<h3>🟢 Presence — sabse chhota data, sabse bada traffic</h3>
     <p>Naam ke aage hara dot. Chhoti si cheez, par din bhar badalti rehti hai: laptop
     khola — hara, band kiya — khaali. Poori company mein yeh hazaron logon ka
     jhilmilana hai, aur har jhilmilahat ek announcement hai.</p>
     <p>Seedha tareeka — "sabko sab batao" — system ko un messages se bhar deta hai jo
     asal mein messages hain hi nahi.</p>
     <p>Slack ne broadcast band kar diya. Tumhari screen par ek waqt mein kuch hi log
     dikhte hain: current channel, recent DMs. Teen channel door kisi ka idle hona
     tumhe dikh hi nahi raha, aur usse tumhe farq bhi nahi padta. Isliye client sirf
     <b>screen par dikhne walon</b> ki presence subscribe karta hai, aur scroll karte hi
     purani subscriptions chhod kar nayi le leta hai.</p>
     <p>Ek hi badlav se clients tak pahunchne wale presence events lagbhag <b>5×</b> kam
     ho gaye.</p>
     <p class="tip">🎯 Yaad rakhne wali line: <b>jo data screen par nahi hai, use bhejna
     hi mat</b>. Subscription ko UI se jodo.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Message ka safar — sahi kram',
      instructions: 'Enter dabane se lekar doosre user ki screen tak — sahi kram lagao.',
      steps: [
        { text: 'Message workspace ke shard par likha jaata hai', explain: 'Store-then-send: pehle durable write, uske baad hi distribution.' },
        { text: 'Channel server dekhta hai ki us channel par kaun-kaun subscribe hai', explain: 'Live subscription map — broadcast nahi, sirf sunne walon ko.' },
        { text: 'Har edge location par ek copy bheji jaati hai', explain: 'Lambi doori par ek copy — sau copies nahi.' },
        { text: 'Edge apne nazdeeki clients ko fan-out karta hai', explain: 'Copies wahan banti hain jahan bandwidth sasti hai.' },
        { text: 'Flannel event ke saath missing metadata (jaise mention kiye gaye user ka profile) jod deta hai', explain: 'Client ko render karne ke liye alag request nahi karni padti.' },
        { text: 'Background jobs chalte hain: link preview, search index, notification ka faisla', explain: 'Yeh sab message dikhne ke baad hota hai — warna UI dheemi lagti.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Fan-out lab — copies kahan banein',
      instructions: 'Channel ka size, edge locations aur model badlo. Long-haul traffic aur latency dekho.',
      goal: 'Aisa model chuno jo bade channel par bhi tike — long-haul (lambi doori) par bheje gaye messages <b>15 se kam</b> aur delivery p99 <b>250 ms se kam</b>.',
      scenario: `Ek bade channel mein message aaya hai. Members duniya bhar mein baithe
        hain. Tum tay karoge ki copies kahan banengi.`,
      knobs: [
        { id: 'members', label: 'Channel ke online members', min: 10, max: 5000, step: 10, value: 3000, unit: '',
          note: 'Company-wide announcement channel bada hota hai.' },
        { id: 'edges', label: 'Edge locations', min: 1, max: 15, step: 1, value: 3, unit: '',
          note: 'Members in edges par bate hue hain.' },
        { id: 'model', label: 'Model (0 = har client ko origin se · 1 = ek copy per edge, fan-out edge par)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Doosra model long-haul traffic ko edges ki ginti tak le aata hai.' },
      ],
      readouts: k => {
        const m = fanoutModel(k);
        return [
          { label: 'Long-haul messages', value: m.longHaul.toLocaleString('en-IN'), tone: m.longHaul <= 15 ? 'ok' : 'bad' },
          { label: 'Delivery p99', value: m.p99 + ' ms', tone: m.p99 <= 250 ? 'ok' : 'bad' },
          { label: 'Edge par bane copies', value: m.edgeCopies.toLocaleString('en-IN'), tone: 'ok' },
          { label: 'Origin ka kaam', value: m.originWork, tone: k.model === 1 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = fanoutModel(k);
        return [
          { label: 'Long-haul', pct: Math.min(100, (m.longHaul / 2000) * 100), text: m.longHaul + '', tone: m.longHaul <= 15 ? 'ok' : 'bad' },
          { label: 'Delivery p99', pct: Math.min(100, (m.p99 / 1500) * 100), text: m.p99 + ' ms', tone: m.p99 <= 250 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = fanoutModel(k);
        if (k.model === 0) return { ok: false, text: `Har client ko origin se bhejne par <b>${m.longHaul.toLocaleString('en-IN')}</b> copies lambi doori par ja rahi hain, aur p99 <b>${m.p99} ms</b> hai. Bandwidth wahan kharch ho rahi hai jahan sabse mehengi hai.` };
        if (m.longHaul > 15) return { ok: false, text: `Edge fan-out on hai par <b>${k.edges}</b> edges ke saath long-haul <b>${m.longHaul}</b> hai — thoda kam edges chuno ya members ka batwara dekho.` };
        if (m.p99 > 250) return { ok: false, text: `Long-haul sirf <b>${m.longHaul}</b>, par ek-ek edge par ~<b>${Math.round(k.members / k.edges).toLocaleString('en-IN')}</b> members — edge khud bottleneck hai, p99 <b>${m.p99} ms</b>. Aur edges jodo.` };
        return { ok: true, text: `Sahi: origin se sirf <b>${m.longHaul}</b> copies (har edge ko ek), aur <b>${m.edgeCopies.toLocaleString('en-IN')}</b> copies wahin banin jahan bandwidth sasti hai — p99 <b>${m.p99} ms</b>.` };
      },
      check: k => { const m = fanoutModel(k); return k.model === 1 && m.longHaul <= 15 && m.p99 <= 250; },
      lesson: `Fan-out ka sawaal "kitni copies" nahi, <b>"copies kahan banengi"</b> hai.
        Ek copy mehengi link par bhejo aur baaki sasti link par banao.`,
      quiz: {
        q: 'Replay buffer ka kaam kya hai?',
        choices: [
          'Fan-out ke beech crash hone par adhoore delivery ko restart ke baad poora karna — message der se aaye, gayab na ho',
          'Purane messages ko search ke liye rakhna',
          'Slow clients ke liye rate limiting',
          'Duplicate messages rokna',
        ],
        answer: 0,
        explain: 'Store-then-send message ko DB mein bachata hai; replay buffer usse delivery ke beech kho jaane se bachata hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — fan-out, crash aur presence',
      project: '06-slack',
      exercise: 'ex2-fanout-presence',
      goal: 'Broadcast vs subscription fan-out compare karo, crash ke beech replay dekho, aur presence subscriptions ka asar naapo.',
      why: `Lab mein ek channel server aur teen "edge" nodes hain. Tum
        <code>FANOUT=broadcast|subs</code>, <code>EDGE=0|1</code> aur
        <code>PRESENCE=all|visible</code> badal sakte ho.`,
      steps: [
        { text: 'Broadcast mode chalao (har connected client ko bhejo, har ek ko alag copy).', cmd: 'cd docker-labs/06-slack && npm start ex2-fanout-presence', expect: 'ex2-fanout-presence\n  edge-sim       → http://localhost:4604  (2000 clients · 3 regions)\n  channel-server → http://localhost:4603  (FANOUT=broadcast EDGE=0)' },
        { text: '#general (300 members) mein 5 messages bhejo.', cmd: 'node tools/fanout.js --messages 5', expect: 'FANOUT=broadcast EDGE=0   delivered: 10,000   bekaar (non-members): 8,500   long-haul copies: 10,000   time: 19253 ms' },
        { text: 'Subscription + edge fan-out on karo.', cmd: 'FANOUT=subs EDGE=1 npm start ex2-fanout-presence && node tools/fanout.js --messages 5', expect: 'FANOUT=subs      EDGE=1   delivered: 1,500   bekaar (non-members): 0   long-haul copies: 15   time: 379 ms' },
        { text: 'Fan-out ke beech channel server maar do aur replay dekho (edge-sim chalu rehna chahiye).', cmd: 'node tools/crash-mid-fanout.js', expect: '💥 channel-server crashed after 120/300 deliveries\nrestart → 1 adhoore message(s) replay ho rahe hain\nfinal delivered: 300/300   lost: 0   duplicate deliveries (client ne dedupe kiye): 120' },
        { text: 'Presence ke dono modes naapo (formula-simulation).', cmd: 'PRESENCE=all node tools/presence.js --users 2000 && PRESENCE=visible node tools/presence.js --users 2000', expect: 'PRESENCE=all      users: 2000   status badlav: 6000   events sent: 12,36,000\nPRESENCE=visible  users: 2000   status badlav: 6000   events sent: 2,58,000   (≈4.8× kam)' },
      ],
      observe: {
        q: 'Crash test mein 120 duplicate deliveries hui par 0 message kho gaya. Yeh kis design choice ka natija hai?',
        choices: [
          'Replay buffer at-least-once delivery deta hai — duplicate sasta hai, kho jaana mehenga',
          'Channel server ne transaction use kiya',
          'Client ne message dobara maanga',
          'Database ne rollback kiya',
        ],
        answer: 0,
        explain: 'Distributed delivery mein exactly-once nahi milta. Isliye at-least-once + client-side dedupe chuna jaata hai.',
      },
      lesson: 'Delivery design ka sabse zaroori sawaal: <b>kho jaana kitna mehenga hai, aur duplicate kitna sasta?</b>',
    },
  ],
  interview: {
    title: 'Interview Round — realtime delivery',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Chat message ka flow design karo."',
        choices: [
          'Pehle durable write, phir subscription map se sirf channel ke online members ko fan-out, ek copy per edge, aur beech mein crash ke liye replay buffer',
          'Message ko sab connected clients ko broadcast kar do, client filter kar lega',
          'Message ko sirf memory mein rakho aur turant bhej do, DB write background mein',
          'Har client ko 1 second par poll karne do',
        ],
        answer: 0,
        explain: 'Broadcast bandwidth barbaad karta hai; "send pehle, write baad mein" aise messages dikhata hai jo hue hi nahi.',
      },
      {
        q: 'Interviewer: "Presence (online status) 50 lakh connections par kaise karoge?"',
        choices: [
          'Client sirf un logon ki presence subscribe kare jo uski screen par hain, aur scroll par subscription badle',
          'Har badlav sabko broadcast karo, data chhota hai',
          'Har 30 second par poori list poll karo',
          'Presence ko database mein rakho aur har render par query karo',
        ],
        answer: 0,
        explain: 'Presence ka data chhota hai par event rate bahut bada — isliye subscription ko UI se jodna hi ilaaj hai (Slack: ~5× kami).',
      },
    ],
  },
  success: [
    'Main store-then-send ka kaaran samjha sakta hoon',
    'Main fan-out ko edge par le jaakar long-haul traffic ghata sakta hoon',
    'Main presence jaise high-rate events ko subscription se control kar sakta hoon',
  ],
  homework: `<p>Apne system ka koi "sabko batao" wala event dhoondho (typing indicator,
    online status, counter update). Gino: ek badlav par kitne clients ko message jaata
    hai? Ab poochho: unme se kitno ki screen par woh cheez abhi dikh rahi hai?</p>`,
  cards: [
    { front: 'Store-then-send kyun?', back: 'Pehle durable write, phir delivery. Warna write fail hone par logon ki screen par aisa message reh jaata hai jo officially hua hi nahi.' },
    { front: 'Channel server ka kaam?', back: 'Live map rakhna ki kaunsa client kis channel par subscribe hai, aur message sirf un subscribers ko bhejna (pub/sub) — broadcast nahi.' },
    { front: 'Edge fan-out ka faayda?', back: 'Ek sheher ke 100 members ke liye lambi doori par ek hi copy jaati hai; final copies edge par banti hain jahan bandwidth sasti hai.' },
    { front: 'Replay buffer?', back: 'Accept ho chuke par poori tarah deliver na hue messages ka buffer. Fan-out ke beech crash par restart adhoora kaam replay karta hai — message der se aata hai, kho-ta nahi.' },
    { front: 'Presence ka ilaaj?', back: 'Sirf screen par dikhne walon ki presence subscribe karo aur scroll par subscriptions badlo — Slack ke clients tak pahunchne wale presence events ~5× kam ho gaye.' },
  ],
},
]);

function fanoutModel(k) {
  if (k.model === 0) return { longHaul: k.members, edgeCopies: 0, p99: 120 + Math.round(k.members / 8), originWork: k.members + ' copies' };
  const per = Math.max(1, Math.round(k.members / k.edges));
  return { longHaul: k.edges, edgeCopies: k.members, p99: 60 + Math.round(per / 25), originWork: k.edges + ' copies' };
}


/* =====================================================================
   LEVEL 3 — WORKSPACE SE SHARDING aur HOT SHARD
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-slack-shard',
  icon: '🗄️',
  title: 'Slack — jis boundary ne bachaya, usi ne pakda',
  badge: 'Shard Sipahi',
  objectives: [
    'Workspace se sharding — sabse simple model aur uski seema',
    'Hot shard: ek customer, ek shard, aur do kharab raaste',
    'Vitess: routing app ke code se nikaal kar ek layer mein',
    'Enterprise Grid aur shared channels — boundary ka tax',
  ],
  lesson: [
    `<h3>🗄️ Storage jaan-boojh kar boring rakhi gayi</h3>
     <p>Slack ka storage MySQL hai — kuch fancy nahi. Data ek machine se bahut zyada hai,
     isliye sharded hai. Sawaal sirf ek tha: <b>kaat-ne ka tareeka kya ho?</b></p>
     <p>Slack ne workspace chuna. Poori company ka data ek shard par, aur ek chhoti lookup
     table yaad rakhti hai ki kaunsa workspace kis shard par hai. Isliye lagbhag har query
     ek hi sawaal se shuru hoti hai: <b>"yeh company kis database par hai?"</b> — aur wahan
     pahunchte hi sab kuch ek jagah mil jaata hai.</p>
     <p>Yeh saalon shandaar chala. Phir bahut badi companies aayin — ek hi workspace mein
     laakh log, sab ek saath messages bhejte hue.</p>
     <h3>🔥 Hot shard</h3>
     <p>"Ek workspace = ek shard" ka matlab hai ki us bade customer ka poora bhaar ek hi
     shard par hai, jabki uske bagal wala shard do chhoti teams ke saath aaram se baitha
     hai. Aur us company ko do machines par nahi baant sakte — poora design hi is baat par
     khada hai ki workspace ek shard par rehta hai.</p>
     <pre>Raasta 1: workspaces ko haath se idhar-udhar karte raho
          →  yeh kaam kabhi khatam nahi hota

Raasta 2: hamesha bada machine kharido
          →  ek din chhat aa hi jaayegi</pre>
     <p class="tip">🎯 Yahi is video ka sabse bada sabak hai: <b>tumhari isolation ki
     ikai tumhari sabse badi jeet bhi hai aur tumhari sabse sakht deewar bhi</b>. Ek hi
     faisle se Slack ko saaf sharding mili, hot shard mila, aur aage shared-channel ka
     dard bhi.</p>`,
    `<h3>🧭 Vitess — sharding ko application se baahar nikalna</h3>
     <p>Raasta Vitess se nikla — YouTube mein bana system jo MySQL ke <b>upar</b> baithta
     hai. Data neeche wahi saadha MySQL rehta hai; Vitess data ka batwara aur routing
     sambhalta hai.</p>
     <table>
       <tr><th>Pehle</th><th>Vitess ke saath</th></tr>
       <tr><td>App ko pata hona chahiye ki data kahan hai</td><td>App query karta hai, Vitess dhoondhta hai ki kis shard par jaana hai</td></tr>
       <tr><td>Sharding logic application code mein</td><td>Sharding logic us layer mein jo isi ke liye bani hai</td></tr>
       <tr><td>Ek workspace = ek database (sakht)</td><td>Ek bade customer ka data kai shards par bat sakta hai</td></tr>
       <tr><td>Rebalance = code + data dono badlo</td><td>Rebalance bina application ka sharding logic badle</td></tr>
     </table>
     <p>Neeche wahi MySQL hai — bas upar ek samajhdaar layer hai jo tay karti hai ki
     kaunsi row kahan jaayegi. Coarse, fixed, per-team sharding se Slack fine-grained
     sharding par chala gaya.</p>
     <h3>🕸️ Aur phir product ne boundary hi tod di</h3>
     <p>Abhi tak sab kuch ek maanyata par tika tha: <b>workspace ek band dabba hai</b> —
     uske log aur uske channels sirf apne se matlab rakhte hain. Isi se storage, caching
     aur fan-out sab aasan the.</p>
     <p>Do features jaan-boojh kar us maanyata ko todte hain:</p>
     <ul>
       <li><b>Enterprise Grid</b> — kai workspaces ko ek organization mein jodna.</li>
       <li><b>Shared channels</b> — ek channel do workspaces ke andar ek saath, aur kabhi
       woh do workspaces do alag companies ke.</li>
     </ul>
     <p>Ab har simplification sawaal ban jaati hai: channel ka <b>maalik</b> kaun hai?
     Uska data kiske keyspace mein file hoga? Message aaye toh kiska real-time tier
     fan-out karega, jab members do alag edge caches ke peechhe hain?</p>
     <p>Slack ka baad ka bahut saara kaam edge cache aur real-time tier ko us duniya ke
     liye dobara banana tha jahan channel aur uske log <b>ek workspace se bade</b> ho
     sakte hain. <b>Saaf boundary tohfa bhi thi aur tax bhi.</b></p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Sharding review — teen galtiyan',
      brief: `Ek B2B product ne workspace se sharding ki hai. Customers mein 5 logon ki
        teams bhi hain aur 80,000 logon ki ek company bhi. Teen aisi jagah pakdo jo
        aage mehengi padengi.`,
      goal: 'Teen flaws par click karo — sahi boxes ka tark bhi khulega.',
      nodes: [
        { id: 'map', label: 'Shard map', sub: 'workspace → shard, ek chhoti table', row: 0 },
        { id: 'hash', label: 'Routing', sub: 'shard = hash(workspace) % 16, code mein', row: 0 },
        { id: 'big', label: 'Enterprise tenant', sub: '80,000 users, sab shard-7 par', row: 1 },
        { id: 'cache', label: 'Edge cache', sub: 'workspace ke hisaab se metadata', row: 1 },
        { id: 'shared', label: 'Shared channel', sub: 'do workspaces mein ek channel — owner tay hi nahi', row: 1 },
        { id: 'mysql', label: 'MySQL shards', sub: '16 shards, normal replication', row: 2 },
      ],
      flaws: [
        { id: 'hash', why: 'Shard number code mein hardcoded hai (`% 16`). Shard badhane par har row ka thikana badal jaata hai aur code + data dono migrate karne padte hain. Mapping data honi chahiye, code nahi.' },
        { id: 'big', why: 'Hot shard: 80,000 users ka poora bhaar ek shard par, aur use split karne ka koi raasta nahi. Ya to hamesha haath se rebalance karo, ya hamesha bada machine kharido.' },
        { id: 'shared', why: 'Shared channel ka koi maalik tay nahi hai — kis shard par likhega, kiska fan-out chalega, kiske permissions lagenge? Boundary todne wale features ko design mein pehle se jagah chahiye.' },
      ],
      fine: {
        map: 'Shard map ek table mein rakhna bilkul sahi hai — isi se workspace move ho sakta hai bina code badle.',
        cache: 'Workspace ke hisaab se edge cache rakhna theek hai; dard tab shuru hota hai jab ek channel do workspaces mein aa jaata hai.',
        mysql: 'Boring MySQL galat nahi hai — Slack ne bhi wahi rakha. Badlav sirf upar ki routing layer mein aaya (Vitess).',
      },
      lesson: `Sharding ke teen sawaal: <b>mapping data hai ya code?</b>, <b>sabse bada
        tenant kya karega?</b>, aur <b>jis din product boundary todega tab kya hoga?</b>`,
    },
    {
      type: 'bins',
      title: 'Boundary ka tohfa aur boundary ka tax',
      instructions: 'Har cheez ko sahi dabbe mein daalo — kya yeh workspace boundary ka faayda hai ya uski keemat?',
      bins: [
        { id: 'gift', label: '🎁 Boundary ka faayda' },
        { id: 'tax', label: '🧾 Boundary ka tax' },
      ],
      items: [
        { text: 'Lagbhag har query ek hi shard par poori ho jaati hai', bin: 'gift', explain: 'Poori company ka data ek jagah — na cross-shard join, na scatter-gather.' },
        { text: 'Ek bade customer ka poora bhaar ek shard par aa jaata hai', bin: 'tax', explain: 'Hot shard — aur us customer ko baant-na design ke khilaaf hai.' },
        { text: 'Cache aur fan-out ka reasoning simple rehta hai', bin: 'gift', explain: 'Ek workspace = ek duniya, isliye edge cache aur subscriptions saaf rehte hain.' },
        { text: 'Shared channel ka maalik tay karna mushkil ho jaata hai', bin: 'tax', explain: 'Ek channel do workspaces mein — kiska keyspace, kiska real-time tier?' },
        { text: 'Naya customer sirf ek shard par rakh dena kaafi hai', bin: 'gift', explain: 'Placement ka faisla ek hi baar, ek hi jagah.' },
        { text: 'Enterprise Grid ke liye edge cache aur real-time tier dobara banane pade', bin: 'tax', explain: 'Boundary todte hi purani simplifications sawaal ban jaati hain.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — hot shard aur routing layer',
      project: '06-slack',
      exercise: 'ex3-hot-shard',
      goal: 'Workspace-sharded store par ek monster tenant daalo, phir routing layer se usse kai shards par baanto — bina application code badle.',
      why: `Lab mein 8 shards hain aur ek routing layer. <code>ROUTING=code</code> mein
        shard number application mein calculate hota hai; <code>ROUTING=layer</code> mein
        ek mapping service tay karti hai, aur bade tenant ke liye range-based split kar
        sakti hai.`,
      steps: [
        { text: 'Router chalao (8 shards, code routing).', cmd: 'cd docker-labs/06-slack && npm start ex3-hot-shard', expect: 'ex3-hot-shard\n  shard-router → http://localhost:4607  (ROUTING=code · 8 shards)' },
        { text: 'Traffic chalao: 200 chhote workspaces + 1 monster.', cmd: 'node tools/shard-load.js --for 3', expect: 'ROUTING=code  hottest shard: 62% of load   monster p99: 477 ms   others p99: 467 ms\n   per-shard queries: 197 · 197 · 216 · 2397 · 215 · 216 · 197 · 215' },
        { text: 'Shard count badhane ka asar dekho, aur code routing mein monster ko baantne ki koshish karo.', cmd: 'node tools/rehash.js --to 16 && node tools/split-tenant.js', expect: 'hash % 8 → hash % 16: 23% rows ka thikana badal gaya  (poora data migration chahiye)\n❌ code routing mein split ke liye application code badalna padega' },
        { text: 'Ab routing layer on karo aur monster ko 4 shards mein split karo.', cmd: 'ROUTING=layer npm start ex3-hot-shard && node tools/split-tenant.js --tenant monster --into 4', expect: 'mapping updated: channels 0-24 → shard-3, channels 25-49 → shard-5, channels 50-74 → shard-6, channels 75-99 → shard-7\nrows moved: 2,47,500   app code changed: 0 lines' },
        { text: 'Wahi load dobara chalao.', cmd: 'node tools/shard-load.js --for 3', expect: 'ROUTING=layer hottest shard: 20% of load   monster p99: 18 ms   others p99: 18 ms' },
      ],
      observe: {
        q: 'Code routing mein `% 16` karne par 23% rows (sab tenants mein bikhre) ka thikana badal gaya, aur monster ko baanta hi nahi ja saka. Mapping layer mein sirf monster ke chune hue rows hile, aur code ki 0 lines badli. Kyun?',
        choices: [
          'Kyunki modulo hashing har key ka thikana formula se nikaalta hai — formula badla toh sabka thikana badla. Mapping table mein sirf wahi entry badalti hai jo tum badalte ho',
          'Kyunki mapping layer tez hai',
          'Kyunki mapping layer ne data compress kiya',
          'Kyunki 16 shards zyada hain',
        ],
        answer: 0,
        explain: 'Yahi wajah hai ki Slack ne routing ko application se hata kar ek layer mein daala, aur Instagram ne logical shards + mapping table chuna.',
      },
      lesson: 'Sharding ka sabse zaroori faisla: <b>mapping ek data hai ya ek formula?</b> Data badla ja sakta hai, formula sabko hila deta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — sharding',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Ek customer itna bada ho gaya ki uska shard dab raha hai. Options?"',
        choices: [
          'Routing ko application se hata kar ek layer mein lao taaki us ek tenant ka data fine-grained tarike se kai shards par bat sake',
          'Us customer ke liye bada server le lo',
          'Uske purane messages delete kar do',
          'Us customer ko rate limit kar do',
        ],
        answer: 0,
        explain: 'Bada server ek din khatam ho jaayega aur rate limit customer ko sazaa hai. Slack ne Vitess se "ek workspace = ek shard" ka bandhan toda.',
      },
      {
        q: 'Interviewer: "Tumhara product ab cross-tenant collaboration deta hai. Data model par kya asar?"',
        choices: [
          'Har woh simplification sawaal ban jaati hai jo "sab kuch ek tenant ke andar hai" par tiki thi — ownership, keyspace, fan-out aur permissions sabko dobara design karna padta hai',
          'Kuch khaas nahi, bas ek join aur lag jaayega',
          'Sirf UI badalta hai',
          'Naya tenant bana do jisme dono log ho',
        ],
        answer: 0,
        explain: 'Slack ke Enterprise Grid aur shared channels ne exactly yahi kiya — aur uske baad edge cache aur real-time tier dobara banana pada.',
      },
    ],
  },
  success: [
    'Main shard key ke faayde aur uske tax dono likh sakta hoon',
    'Main routing ko application se hata kar layer mein daal sakta hoon',
    'Main hot shard ko pehchaan kar uske do kharab raaste bata sakta hoon',
  ],
  homework: `<p>Apne system ka shard key likho. Ab do sawaal: (1) sabse bada tenant kitna
    bada ho sakta hai, aur kya woh ek shard mein samaayega? (2) agar kal product do
    tenants ko ek saath kaam karne de, toh kaunsi cheez pehle tootegi?</p>`,
  cards: [
    { front: 'Slack ka shard key?', back: 'Workspace. Poori company ka data ek shard par, aur ek lookup table batati hai kaunsa workspace kahan hai — isliye har query ka pehla sawaal "yeh company kis DB par hai?"' },
    { front: 'Hot shard kya hai?', back: 'Ek bahut bada tenant jiska poora bhaar ek shard par aa jaata hai, aur jise design ke hisaab se baanta nahi ja sakta. Do kharab raaste: hamesha manual rebalancing, ya hamesha bada machine.' },
    { front: 'Vitess ne kya badla?', back: 'MySQL wahi raha, par routing aur sharding upar ki layer mein chali gayi — ab ek workspace ka data kai shards par bat sakta hai aur rebalancing ke liye application code badalna nahi padta.' },
    { front: 'Boundary ka tax?', back: 'Enterprise Grid aur shared channels ne "workspace ek band dabba hai" wali maanyata todi — ownership, keyspace aur fan-out sab dobara design karne pade.' },
  ],
},
]);

/* =====================================================================
   LEVEL 4 — 2016 KA QUEUE DEADLOCK, KAFKA + REDIS, CELLS, NEBULA
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-slack-queue',
  icon: '🧨',
  title: 'Slack — queue jo dono taraf se jam ho gayi',
  badge: 'Queue Qaatil',
  objectives: [
    'Backlog + in-memory queue = memory exhaustion',
    'Woh do galtiyan jinhone slow-down ko outage banaya',
    'Kafka ko Redis ki jagah nahi, Redis ke AAGE lagana',
    'Cells, edge drain aur Nebula — blast radius aur connectivity',
  ],
  lesson: [
    `<h3>🧵 Message dikhne ke baad ka kaam</h3>
     <p>Tum message bhejte ho aur woh turant dikhta hai. Par uske peechhe kaafi dheema
     kaam bachta hai: link ka preview laana, kise notification bhejni hai yeh tay karna,
     message ko search index mein daalna, security checks chalana. Agar Slack tumhe yeh
     sab hone tak rukwata, app sust lagti.</p>
     <p>Isliye Slack turant result dikhata hai aur dheema kaam <b>background job queue</b>
     par daal deta hai. Pehla version Redis par tha — in-memory, isliye bahut tez, jo ek
     queue ke liye bilkul theek hai. Par RAM seemit hoti hai.</p>
     <h3>💥 2016 — zanjeer ki har kadi</h3>
     <pre>1. Database dheema hua
2. Background jobs ko DB chahiye → workers dheeme ho gaye
3. Jobs aane ki raftaar > khatam hone ki raftaar → BACKLOG
4. Backlog RAM mein hai (Redis) → memory bharne lagi
5. Memory khatam → naye jobs accept nahi ho paaye
   (yeh apne aap mein DATA LOSS hai — asli kaam floor par gir raha tha)</pre>
     <p>Aur outage yahan se shuru hua. Jis data structure par queue bani thi, usme
     <b>job nikaalne ke liye bhi thodi memory</b> chahiye thi — aur memory bachi hi nahi
     thi. Queue <b>dono taraf se jam</b> ho gayi: na andar aa sakta tha, na bahar ja
     sakta tha. Jo kaam jagah khaali karta (job hatana), wahi kaam karne ke liye jagah
     nahi thi.</p>
     <p>Doosri galti: us structure par job nikaalna <b>O(n)</b> tha. Queue jitni lambi,
     nikalna utna dheema — theek us waqt jab queue sabse lambi thi aur speed sabse zyada
     zaroori thi.</p>
     <p class="tip">🎯 Ek slow database ko poora outage banane ke liye do "boring" cheezein
     kaafi thin: <b>ek dequeue jo memory maangta hai</b>, aur <b>ek dequeue jo O(n)
     hai</b>. Data structure ka chunaav bhi architecture hai.</p>`,
    `<h3>🪵 Fix: Kafka ko Redis ke AAGE lagao</h3>
     <p>Kafka ek durable log hai — append-only, disk par. Jo cheez Redis ko le doobi
     (backlog ka memory mein hona), Kafka usi ke liye bana hai.</p>
     <p>Aasan raasta hota: Redis hata do, sab Kafka par. Slack ne aisa <b>nahi</b> kiya.
     Kafka ek log hai — ordered stream rakhne mein achha, par ek queue ka asli kaam
     (individual tasks schedule karna aur yeh pakka karna ki ek task do baar na chale)
     usse achha nahi hota. Redis woh pehle se achha kar raha tha.</p>
     <pre>Kafka  →  har job ka durable record (disk par, bada backlog aaram se)
Redis  →  jo jobs abhi chal rahe hain, unki scheduling
Bridge →  do chhoti Go services: ek Kafka mein likhti hai, doosri Kafka se
          padh kar Redis ko deti hai — aur job Kafka mein "done" tabhi hota hai
          jab woh Redis mein SAFE pahunch chuka ho</pre>
     <p>Ab 2016 dobara nahi ho sakta: Redis bhar jaaye ya bigad jaaye, toh jobs floor par
     nahi girte — woh disk par Kafka mein aaram se intezaar karte hain.</p>
     <p class="tip">🎯 Sabak: har cheez ko ek hi tool se mat karwao. Log ko log ka kaam
     do, queue ko queue ka. Beech mein ek chhota bridge likho jo handoff ko safe banaye.</p>`,
    `<h3>🧱 Aur do cheezein jo Slack ne apne liye banayin</h3>
     <p><b>Cells aur edge drain:</b> Slack apna infra alag-alag availability zones mein
     <b>cells</b> ki tarah chalata hai — ek cell ka fail hona usi cell tak simta rehta
     hai. Koi region ya edge location kharab ho toh ek automatic <b>edge drain</b> DNS
     ghuma kar naye connections ko agle healthy location par bhej deta hai, aur users
     wahin reconnect ho jaate hain. Niyam: <b>failure ke liye design karo, aur blast
     radius ko baandh do</b>.</p>
     <p><b>Nebula:</b> Slack ke hazaron servers kai cloud providers aur dasiyon locations
     mein hain, aur har host ko har host se <b>encrypted</b> baat karni hoti hai. Kuch
     off-the-shelf fit nahi hua, toh unhone apna encrypted overlay mesh banaya aur open
     source kar diya:</p>
     <ul>
       <li>Har host ko ek <b>certificate</b> milta hai jo naam + ek flat overlay IP +
       group ko jodta hai. Ek hi address se machine kahin bhi mil jaati hai — na routing
       tables, na "yeh kis cloud mein hai".</li>
       <li><b>Lighthouse</b> ek halka discovery node hai jo jaanta hai kaun abhi kahan
       hai (torrent ke seed nodes jaisa). Woh traffic nahi uthata — sirf do hosts ka
       parichay karwa deta hai, NAT ke peechhe wale hosts ka bhi.</li>
       <li>Handshake <b>Noise protocol framework</b> par (wahi design jo Signal ke
       peechhe hai — unhone apni crypto nahi likhi), aur uske baad traffic seedha
       peer-to-peer encrypted UDP tunnel par.</li>
     </ul>
     <p>Aur ek chhoti si baat jo bahut logon ko chaunkati hai: Slack ka core web app ek
     bada <b>monolith</b> hai, Hack mein (Facebook ka PHP). Tez aur specialised hisse —
     real-time servers, edge caches, queue plumbing, Nebula — <b>Go</b> mein hain.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 2016 ka queue outage',
      instructions: 'Timeline chalao aur faisle ke mod par sahi call lo.',
      incident: 'Slack — background job queue, 2016',
      goal: 'Dekho ki ek dheema database poore outage mein kaise badla, aur kahan rok sakte the.',
      speedMs: 1800,
      metrics: [
        { id: 'backlog', label: 'Queue backlog', unit: 'k jobs', max: 500, dir: 'lower' },
        { id: 'mem', label: 'Redis memory', unit: '%', max: 100, dir: 'lower' },
        { id: 'lost', label: 'Gire hue jobs', unit: 'k', max: 200, dir: 'lower' },
      ],
      frames: [
        { t: 'T+0', event: 'Sab normal. Workers jobs utha rahe hain, backlog lagbhag zero.', metrics: { backlog: 2, mem: 30, lost: 0 } },
        { t: 'T+5m', event: 'Database dheema hua. Background jobs ko DB chahiye — <b>workers dheeme</b> ho gaye.', metrics: { backlog: 40, mem: 44, lost: 0 }, tone: 'warn',
          ask: { q: 'Is waqt sabse zaroori metric kaunsa hai?',
                 choices: [
                   'Jobs aane ki rate vs khatam hone ki rate — kyunki uska farq hi backlog banata hai',
                   'Average job latency',
                   'Worker CPU',
                   'Redis hit rate',
                 ], answer: 0,
                 explain: 'Queue ka poora khel arrival rate aur drain rate ke farq ka hai. Woh farq jab tak positive hai, backlog badhta hi rahega.',
                 wrongHints: [
                   'Job latency badhegi zaroor, par woh batati nahi ki backlog kitni tezi se bhar raha hai.',
                   'CPU kam ho sakta hai — workers DB ka intezaar kar rahe hain.',
                   'Redis abhi theek hai; problem uski memory ki taraf badh rahi hai.',
                 ] } },
        { t: 'T+18m', event: 'Backlog RAM mein jama ho raha hai. Redis memory <b>78%</b>.', metrics: { backlog: 210, mem: 78, lost: 0 }, tone: 'warn' },
        { t: 'T+26m', event: 'Redis memory poori. Naye jobs <b>accept nahi</b> ho rahe — asli kaam floor par gir raha hai.', metrics: { backlog: 300, mem: 100, lost: 38 }, tone: 'bad',
          ask: { q: 'Naye jobs drop ho rahe hain. Sabse pehle kya karoge?',
                 choices: [
                   'Jobs ko kisi durable jagah (disk-backed log) par bhejo taaki woh kho na jaayein, phir drain par kaam karo',
                   'Redis ko restart karo taaki memory khaali ho',
                   'Workers badha do',
                   'Queue ko flush kar do',
                 ], answer: 0,
                 explain: 'Data loss sabse mehengi cheez hai. Jobs ko durable buffer mein le jao — Slack ka permanent fix bhi yahi bana (Kafka Redis ke aage).',
                 wrongHints: [
                   'Restart matlab jo backlog RAM mein hai woh bhi gaya — loss aur bada.',
                   'Workers badhane se DB par aur dabaav padega, aur DB pehle se dheema hai.',
                   'Flush karna jaan-boojh kar data phenkna hai.',
                 ] } },
        { t: 'T+31m', event: 'Aur bura: job <b>nikaalne</b> ke liye bhi thodi memory chahiye thi. Queue dono taraf se <b>jam</b>.', metrics: { backlog: 330, mem: 100, lost: 96 }, tone: 'bad' },
        { t: 'T+40m', event: 'Dequeue <b>O(n)</b> hai — queue jitni lambi, nikalna utna dheema. Drain rate aur gir gaya.', metrics: { backlog: 360, mem: 100, lost: 150 }, tone: 'bad',
          ask: { q: 'Is outage ka asli sabak kya hai?',
                 choices: [
                   'Boring implementation details (memory chahne wala dequeue, O(n) dequeue) hi ek slow database ko poora outage bana dete hain',
                   'Redis queue ke liye galat choice hai',
                   'Database ko kabhi dheema nahi hona chahiye',
                   'Background jobs nahi hone chahiye',
                 ], answer: 0,
                 explain: 'Redis galat nahi tha — uske saamne durable buffer na hona aur us particular data structure ka vyavhaar galat tha.',
                 wrongHints: [
                   'Slack ne Redis rakha — usne sirf Kafka usse pehle laga diya.',
                   'Database dheema hoga hi kabhi na kabhi; system ko us din survive karna aana chahiye.',
                   'Background jobs ke bina UI sust ho jaati.',
                 ] } },
        { t: 'T+2h', event: 'Fix ke baad: Kafka Redis ke <b>aage</b> — backlog disk par, Redis sirf chal rahe kaam ke liye.', metrics: { backlog: 60, mem: 42, lost: 150 }, tone: 'ok' },
      ],
      lesson: `Queue ke teen sawaal hamesha poochho: <b>backlog kahan jama hoga</b>
        (RAM ya disk), <b>bhara hone par kya hoga</b> (drop, block, ya spill), aur
        <b>dequeue ka cost kya hai</b> (O(1) ya O(n))?`,
    },
    {
      type: 'match',
      title: 'Tool aur uska sahi kaam',
      pairs: [
        { left: '🪵 Kafka', right: 'Durable ordered log — bada backlog disk par sambhalna', explain: 'Jo cheez Redis ko le doobi (backlog memory mein), Kafka usi ke liye bana hai.' },
        { left: '⚡ Redis', right: 'Individual tasks ki scheduling aur execution', explain: 'Isi kaam mein woh pehle se achha tha, isliye use hataya nahi gaya.' },
        { left: '🌉 Bridge service', right: 'Kafka se Redis tak safe handoff — done tabhi jab dusri taraf pahunch jaaye', explain: 'Isi se koi job do systems ke beech gayab nahi hota.' },
        { left: '🧱 Cells', right: 'Failure ko ek hisse mein band rakhna', explain: 'Alag availability zones, jo zyadatar alag-alag girte hain.' },
        { left: '🚰 Edge drain', right: 'Kharab location se traffic apne aap hata dena (DNS)', explain: 'Naye connections agle healthy location par chale jaate hain.' },
        { left: '🕸️ Nebula', right: 'Har host se har host tak encrypted overlay network', explain: 'Certificate + flat overlay IP, lighthouse discovery, Noise handshake, peer-to-peer UDP.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — jam banao, phir durable buffer lagao',
      project: '06-slack',
      exercise: 'ex4-queue-jam',
      goal: '2016 wali zanjeer ko chhote paimane par dobara banao, phir durable log lagakar dekho ki loss kaise ruka.',
      why: `Lab mein ek bounded in-memory queue hai jiska dequeue memory maangta hai
        (<code>DEQUEUE_COST=1</code>) aur O(n) ho sakta hai (<code>DEQUEUE_ON=1</code>).
        Ek slow "database" workers ko dheema karti hai.`,
      steps: [
        { text: 'Queue + workers chalao (memory seema 4,000 jobs; dono bugs on).', cmd: 'cd docker-labs/06-slack && npm start ex4-queue-jam', expect: 'ex4-queue-jam\n  job-queue → http://localhost:4608  (MEM_LIMIT=4000 jobs · DEQUEUE_COST=1 · DEQUEUE_ON=1 · DURABLE=0)' },
        { text: 'DB 6× slow karo, 400 jobs/s bhejo, phir DB theek karke dekho.', cmd: 'node tools/jam.js --rps 400 --for 20 --slow-db 6', expect: 'in-memory   accepted: 4,987   REJECTED: 3,013   memory queue: 4,000/4,000\n   drain rate: 80/s shuru mein → 0/s aakhir mein   jammed pops: 6,127 (nikaalne ki jagah nahi)  ❌ dono taraf se jam\n   DB theek hone ke baad: backlog abhi bhi 4000 (60 s baad)' },
        { text: 'O(1) dequeue aur memory-free pop ke saath dobara.', cmd: 'DEQUEUE_ON=0 DEQUEUE_COST=0 npm start ex4-queue-jam && node tools/jam.js --rps 400 --for 20 --slow-db 6', expect: 'in-memory   accepted: 5,572   REJECTED: 2,428   memory queue: 3,920/4,000\n   drain rate: 80/s shuru mein → 83/s aakhir mein\n   DB theek hone ke baad: backlog khaali in 9 s' },
        { text: 'Ab durable log queue ke aage lagao.', cmd: 'DURABLE=1 npm start ex4-queue-jam && node tools/jam.js --rps 400 --for 20 --slow-db 6', expect: 'DURABLE=1   accepted: 8,000   REJECTED: 0   memory queue: 2,125/4,000   log backlog (disk): 4,228\n   drain rate: 80/s shuru mein → 82/s aakhir mein\n   DB theek hone ke baad: backlog khaali in 14 s' },
      ],
      observe: {
        q: 'O(1) dequeue karne ke baad jam toh khul gaya (9 s mein khaali), par phir bhi 2,428 jobs gire. Durable log lagate hi 0 gire. Kyun?',
        choices: [
          'O(1) sirf drain tez karta hai; capacity phir bhi RAM ki thi. Durable log backlog ko disk par le gaya, jahan jagah bahut zyada hai',
          'Durable log ne jobs compress kar diye',
          'O(1) dequeue ne memory leak theek kiya',
          'Durable log ne rate limit laga di',
        ],
        answer: 0,
        explain: 'Do alag problem: drain ki speed (data structure) aur backlog ki jagah (RAM vs disk). Slack ne dono theek kiye.',
      },
      lesson: 'Queue design mein pehla sawaal yeh nahi ki "kitni tez hai" — pehla sawaal yeh hai ki <b>bhar jaane par kya hoga</b>.',
    },
  ],
  interview: {
    title: 'Interview Round — queues aur blast radius',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "In-memory queue use kar rahe ho. Backlog badhne par kya hoga?"',
        choices: [
          'Memory limit tak jaake naye jobs girne lagenge — isliye aage ek durable log rakho aur in-memory queue ko chhota aur bounded rakho',
          'Kuch nahi, Redis bahut memory sambhal leta hai',
          'Autoscaling se workers badh jaayenge',
          'Queue apne aap disk par spill kar degi',
        ],
        answer: 0,
        explain: 'Yahi 2016 ka sabak hai. Durable log sabse aage, scheduling ke liye in-memory queue peechhe.',
      },
      {
        q: 'Interviewer: "Toh purana queue system hata kar sab kuch Kafka par le jaayein?"',
        choices: [
          'Nahi — Kafka log ka kaam achha karta hai, par per-task scheduling aur dobara na chalne ki guarantee queue ka kaam hai. Dono rakho aur beech mein ek safe handoff bridge likho',
          'Haan, ek hi system rakhna hamesha behtar hai',
          'Haan, Kafka mein sab kuch ho jaata hai',
          'Nahi, Kafka slow hai',
        ],
        answer: 0,
        explain: 'Slack ne yahi socha aur Redis ko rakha — kyunki rewrite ka risk tha aur faayda kuch nahi tha.',
      },
    ],
  },
  success: [
    'Main queue ke bharne par hone wale vyavhaar ko design kar sakta hoon',
    'Main durable log + in-memory scheduler wala model bana sakta hoon',
    'Main cells aur edge drain se blast radius baandh sakta hoon',
  ],
  homework: `<p>Apne system ki har queue ke saamne teen jawab likho: (1) backlog kahan
    jama hoga — RAM ya disk? (2) bhar jaane par kya hoga — drop, block ya spill? (3)
    dequeue ka cost O(1) hai ya O(n)? Jiska jawab na pata ho, use aaj hi naapo.</p>`,
  cards: [
    { front: '2016 ka Slack outage — zanjeer?', back: 'DB dheema → workers dheeme → arrival > drain → backlog RAM mein (Redis) → memory full → naye jobs drop (data loss) → job nikaalne ke liye bhi memory chahiye thi → queue dono taraf jam → O(n) dequeue ne drain aur dheema kiya.' },
    { front: 'Fix kya tha?', back: 'Kafka ko Redis ke AAGE (jagah nahi) — backlog disk par durable, Redis sirf chal rahe tasks ke liye. Do chhoti Go bridge services, aur job Kafka mein done tabhi jab Redis mein safe pahunch jaaye.' },
    { front: 'Kafka aur Redis ka batwara kyun?', back: 'Kafka = ordered durable log (bada backlog). Redis = per-task scheduling aur "ek task do baar na chale". Sab kuch ek tool se karwana rewrite ka risk tha bina faayde ke.' },
    { front: 'Nebula kya hai?', back: 'Slack ka apna encrypted overlay mesh: har host ko certificate (naam + flat overlay IP + group), lighthouse discovery nodes, Noise protocol handshake, phir peer-to-peer encrypted UDP — NAT ke peechhe bhi.' },
    { front: 'Cells + edge drain?', back: 'Infra alag availability zones mein cells ki tarah, taaki failure ek cell tak simta rahe; kharab region/edge par automatic DNS drain naye connections ko agle healthy location par bhej deta hai.' },
  ],
},
]);

})();
