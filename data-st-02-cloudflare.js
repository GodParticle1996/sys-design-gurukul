/* =====================================================================
   TRACK 9 — 🏢 Real Company Stories · Cloudflare

   Source: "How Cloudflare Blocks 44 Million Attacks a Year While Its
   Engineers Sleep" (Akhil Sharma), Cloudflare ka engineering blog
   (Quicksilver, Pingora, Marek Majkowski ki DDoS series, Kenton Varda ka
   Workers material, Argo aur Keyless SSL ke posts).

   4 levels:
     st-cf-anycast  — ek IP, 330 sheher, aur attack ka apne aap patla ho jaana
     st-cf-fleet    — har server har kaam · Quicksilver ka poora data har machine par
     st-cf-defense  — dosd fingerprint + XDP par drop · free tier ka flywheel
     st-cf-edge     — V8 isolates, Spectre ke liye ghadi hatana, Pingora, Argo,
                      keyless SSL aur durable objects
   ===================================================================== */
(function () {

VISUALS['st-cf-anycast'] = {
  t: 'Anycast — ek hi IP, 330 sheher, attack apne aap patla',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Purana tareeka — scrubbing center</span>
        <div class="dg-flow">
          <span class="dg-pill bad" data-hs="bot">🤖 botnet</span><span class="dg-arrow">→</span>
          <span class="dg-pill" data-hs="scrub">🧽 scrubbing center</span><span class="dg-arrow">→</span>
          <span class="dg-pill">🏠 origin</span>
        </div>
        <div class="dg-cap">Attack detect karo, traffic ko scrubber par <b>reroute</b> karo
          (minute lagte hain), detour se sabki latency badhti hai, aur tumhari poori
          defense scrubbers ki capacity par ruk jaati hai.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Cloudflare — anycast</span>
        <div class="dg-flow">
          <span class="dg-pill bad">🤖 Tokyo bot</span><span class="dg-arrow">→</span>
          <span class="dg-pill good" data-hs="tokyo">🗼 Tokyo DC</span>
          <span class="dg-pill bad">🤖 Dubai bot</span><span class="dg-arrow">→</span>
          <span class="dg-pill good" data-hs="dubai">🏜️ Dubai DC</span>
        </div>
        <div class="dg-cap">Wahi IP har sheher se BGP par announce hoti hai. Har infected
          machine ka packet uske <b>apne nazdeeki</b> sheher mein girta hai —
          31.4 Tbps ka attack 330 sheharon mein <b>chhoti-chhoti spikes</b> ban jaata hai.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">BGP</span><span class="cmd">hi load balancer hai</span><span class="q">koi global steering brain nahi — matlab koi steering brain fail bhi nahi ho sakta</span></div>
      <div class="dg-rung"><span class="lv">naya sheher</span><span class="cmd">rack karo + route announce karo</span><span class="q">traffic apne aap aane lagta hai · koi migration nahi</span></div>
      <div class="dg-rung g"><span class="lv">1.1.1.1</span><span class="cmd">wahi chaal, apne product par</span><span class="q">ek address, har data center se announce</span></div>
    </div>`,
};

VISUALS['st-cf-fleet'] = {
  t: 'Ek jaisa fleet + Quicksilver — read ke liye koi network hop nahi',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Product-wise fleets</span>
        <div class="dg-grid">
          <div class="dg-node" data-hs="dnsfleet"><span class="ni">🔤</span><span class="nl">DNS fleet</span><span class="ns">idle 60%</span></div>
          <div class="dg-node is-bad" data-hs="waffleet"><span class="ni">🛡️</span><span class="nl">WAF fleet</span><span class="ns">120% — gir raha hai</span></div>
        </div>
        <div class="dg-cap">Har fleet ka apna forecasting, apna provisioning aur apna
          <b>stranded headroom</b>. Padosi khaali baithe hain par madad nahi kar sakte.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✅ Ek hi fleet</span>
        <div class="dg-node is-good" data-hs="any"><span class="ni">🧱</span><span class="nl">har server = poora stack</span><span class="ns">DNS · TLS · WAF · bots · Workers · DDoS</span></div>
        <div class="dg-cap">Capacity planning ka sawaal ek hi bachta hai:
          <b>"is sheher ko kitna compute chahiye?"</b></div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">💾 dashboard par Save</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="qs">⚡ Quicksilver</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🌍 har server par, seconds mein</span>
    </div>
    <div class="dg-cap">Har server <b>poora global dataset</b> rakhta hai (sau GB), engine
      LMDB (memory-mapped B-tree). Ek HTTP request Quicksilver se darjanon baar poochhti
      hai — har sawaal ek <b>local memory read</b>, microseconds mein.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Faayda</span>
        <div class="dg-cap">Write par poori keemat do, taaki har read muft ho.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">⚠️ Wahi teji, ulti taraf</span>
        <div class="dg-cap">Ek galat config bhi <b>seconds mein</b> har server tak
          pahunch jaata hai. Blast radius = poora fleet.</div></div>
    </div>`,
};

VISUALS['st-cf-defense'] = {
  t: 'Packet ka safar — kahan drop karoge?',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">📦 packet</span><span class="dg-arrow">→</span>
      <span class="dg-pill good" data-hs="xdp">⚡ XDP (NIC par hi)</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="iptables">🧱 iptables</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="tcp">🔗 TCP/IP stack</span><span class="dg-arrow">→</span>
      <span class="dg-pill" data-hs="app">🧠 application</span>
    </div>
    <div class="dg-cap">XDP par drop = kernel ne abhi memory allocate bhi nahi ki thi.
      Cloudflare ke hisaab se yeh iptables par drop karne se lagbhag <b>10× sasta</b> hai.
      Falsafa: <b>sabse sasta packet woh hai jise process karna hi na pade</b>.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">dosd</span><span class="cmd">har server par ek daemon</span><span class="q">apne hi NIC ke packets sample karta hai, statistical fingerprint banata hai</span></div>
      <div class="dg-rung"><span class="lv">local rule</span><span class="cmd">wahin drop rule install</span><span class="q">kisi central brain tak round trip nahi — warna latency</span></div>
      <div class="dg-rung"><span class="lv">global view</span><span class="cmd">poore network ka pattern</span><span class="q">jo sirf sab sheher milakar dikhta hai, woh yahan pakda jaata hai</span></div>
      <div class="dg-rung g"><span class="lv">Quicksilver</span><span class="cmd">fingerprint sab jagah</span><span class="q">seconds mein har server us attack ko pehchanne lagta hai</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-legend">
      <span><i class="dg-dot" style="background:var(--bad)"></i> 9 mein se 10 network attacks 10 minute ke andar khatam</span>
      <span><i class="dg-dot" style="background:var(--gold)"></i> 31.4 Tbps wala record attack — sirf 35 second</span>
    </div>
    <div class="dg-cap">Isiliye is defense mein koi insaan hai hi nahi — insaan keyboard tak
      pahunchne se pehle attack khatam ho chuka hota hai.</div>`,
};

VISUALS['st-cf-edge'] = {
  t: 'Edge par doosron ka code chalana — aur uske teen faisle',
  html: `
    <div class="dg-grid">
      <div class="dg-box is-bad"><span class="bx-label">🐘 VM</span>
        <div class="dg-cap">Majboot deewar, par start hone mein <b>second</b> aur
          har tenant ke liye bahut saari RAM.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">📦 Container</span>
        <div class="dg-cap">Halka, par cold start <b>sau milliseconds</b> aur
          har ek ke liye dasiyon MB.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🧩 V8 isolate</span>
        <div class="dg-cap">Ek hi process, hazaron isolates. Start <b>kuch ms</b>,
          memory <b>kuch MB</b> — container se ~100× tez start, ~1/10 memory.</div></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🤝 TLS ClientHello (SNI)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc" data-hs="warm">🔥 isolate load hona shuru</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🤝 handshake khatam</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">✅ worker pehle se garam</span>
    </div>
    <div class="dg-cap">Cold start gayab nahi hua — Cloudflare ne use us latency ke
      <b>andar chhupa diya</b> jo connection pehle se de raha tha.</div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🕰️ Spectre ka jawab: ghadi hi hata do</span>
        <div class="dg-cap"><code>Date.now()</code> code chalte waqt aage nahi badhta ·
          na threads, na shared memory · remote clock ka RTT nanosecond signal ko dubo
          deta hai. Shak ho toh us worker ko apne process mein alag kar do.</div></div>
      <div class="dg-box is-good"><span class="bx-label">📍 Durable object: ek hi copy</span>
        <div class="dg-cap">Poori duniya mein ek instance, requests ek ke baad ek.
          Na consensus, na quorum, na conflict resolution — reconcile karne ko kuch hai
          hi nahi.</div></div>
    </div>`,
};

/* =====================================================================
   LEVEL 1 — ANYCAST
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-cf-anycast',
  icon: '🌐',
  title: 'Cloudflare — ek IP jo har sheher mein hai',
  badge: 'Anycast Aadmi',
  objectives: [
    'Anycast: ek hi IP prefix har data center se BGP par announce',
    'Traffic slicing — bada attack apne aap chhote tukdon mein bant jaata hai',
    'Scrubbing center model ki teen keemat: deri, detour, aur capacity ki chhat',
    'Jo layer neeche pehle se kaam kar rahi hai, usse kaam karwana',
  ],
  lesson: [
    `<h3>🧭 Purana tareeka: ek IP = ek jagah</h3>
     <p>Traditional CDN har data center ko apni IP deta tha aur DNS se decide karta tha
     ki user ko kaunsi IP milegi. Uske liye ek <b>mapping system</b> chahiye tha — user
     kahan hai, kaunsa POP nazdeek hai, kaunsa healthy hai. Woh mapping system ek bada
     engineering project hota hai: banao, chalao, aur woh fail bhi ho sakta hai.</p>
     <h3>📡 Cloudflare ka faisla: anycast</h3>
     <p>Cloudflare ek hi IP prefix ko <b>har data center se</b> BGP par announce karta
     hai. Internet ke routers ko lagta hai ki yeh ek hi destination hai jo har taraf se
     pahunchne layak hai, aur har router use <b>sabse nazdeek route</b> par bhej deta
     hai. Tokyo ka user Tokyo pahunchta hai, Dubai ka user Dubai — bina kisi steering
     brain ke.</p>
     <table>
       <tr><th>Faayda</th><th>Kya matlab</th></tr>
       <tr><td>Global load balancer hi nahi chahiye</td><td>BGP hi load balancer hai</td></tr>
       <tr><td>Koi steering brain nahi</td><td>Jo cheez hai hi nahi, woh fail bhi nahi ho sakti</td></tr>
       <tr><td>Naya sheher jodna = servers rack karo + route announce karo</td><td>Koi migration nahi, traffic apne aap aane lagta hai</td></tr>
     </table>`,
    `<h3>🔪 Traffic slicing — defense jo routing se aati hai</h3>
     <p>Botnet duniya bhar ki hazaron infected machines hoti hain. Har machine ke packets
     usi niyam ko maante hain: <b>apne nazdeeki Cloudflare sheher mein jao</b>. Isliye
     31.4 Tbps ka attack Cloudflare ke liye ek jagah nahi girta — woh 330 sheharon mein
     bat kar chhoti-chhoti spikes ban jaata hai.</p>
     <pre>Attack:        31.4 Tbps   (record, late 2025 — sirf 35 second chala)
Network:      550+ Tbps capacity, 330+ sheher
Har sheher par: kuch gigabits — jise ek server bhi pehchaan kar drop kar sakta hai</pre>
     <p class="tip">🎯 Yahan koi "attack distribute" nahi kar raha. <b>Internet ki apni
     routing</b> attack ko patla kar deti hai, Cloudflare ka koi defense code chalne se
     pehle hi.</p>
     <h3>🤔 Purani soch: "anycast lambi TCP connections ke liye theek nahi"</h3>
     <p>Maana jaata tha ki anycast DNS ke liye theek hai (ek packet — sawaal, jawab,
     khatam) par HTTP ke liye nahi, kyunki TCP connection ki state ek hi machine ki
     memory mein hoti hai. Dar yeh tha ki beech mein route badal gaya toh packet kisi
     aur sheher mein chala jaayega jise us conversation ka pata hi nahi.</p>
     <p>Cloudflare ne asal mein naap kar dekha: internet ke routes un kuch second ke liye
     <b>kaafi sthir</b> rehte hain jitne ek connection ko chahiye. Jis dar par poori
     industry ruki hui thi, woh practice mein lagbhag hota hi nahi tha. Isiliye aaj
     1.1.1.1 se lekar HTTPS tak sab anycast par chalta hai.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — attack kitna bada, per-city kitna',
      goal: 'Apne haath se hisaab lagao ki "bahut bada" attack ek sheher ke liye kitna bada hai.',
      problems: [
        {
          q: '31.4 Tbps ka attack 330 sheharon mein barabar bat jaaye toh ek sheher par kitne Gbps aayenge?',
          unit: 'Gbps', given: ['31.4 Tbps = 31,400 Gbps', '330 sheher'],
          answer: 95, tol: 0.4,
          steps: ['31,400 / 330 ≈ 95 Gbps per sheher', 'Ek bade data center ke liye 95 Gbps sambhalne layak hai — yahi slicing ka poora point hai'],
          lesson: 'Attack ka number dara deta hai; per-location number faisla karne layak hota hai.',
        },
        {
          q: 'Attack 35 second chala. Agar koi insaan page hone ke baad 5 minute mein keyboard tak pahunche, toh attack khatam hone ke kitne second BAAD woh pahunchega?',
          unit: 'second', given: ['attack = 35 second', 'insaan = 300 second'],
          answer: 265, tol: 0.3,
          steps: ['300 − 35 = 265 second', 'Yaani insaan ke pahunchne tak ladai khatam ho chuki hoti hai'],
          lesson: 'Jab event human reaction time se chhota ho, defense automatic honi hi chahiye — dashboard sirf baad mein batata hai ki kya hua.',
        },
        {
          q: 'Cloudflare average 5,000 attacks/ghanta mitigate karta hai. Ek saal mein lagbhag kitne?',
          unit: 'attacks', given: ['5,000 per ghanta', '24 ghante × 365 din'],
          answer: 43800000, tol: 0.4,
          steps: ['5,000 × 24 = 1,20,000 roz', '1,20,000 × 365 ≈ 4.38 crore saal bhar mein'],
          lesson: 'Is paimane par "har attack par ek ticket" ka model chal hi nahi sakta.',
        },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Scrubbing center vs anycast slicing',
      instructions: 'Attack ka size aur defense ka model badlo. Dekho kaunsa model kab tootta hai.',
      goal: 'Aisi setting dhoondho jahan attack poora absorb ho jaaye (koi drop nahi), mitigation <b>1 second se kam</b> mein lage, aur acche traffic par extra latency <b>5 ms se kam</b> ho.',
      scenario: `Ek attack aa raha hai. Do model hain: <b>scrubbing centers</b> (kuch
        badi facilities, traffic reroute karke saaf karo) ya <b>anycast</b> (har
        location defense ka hissa).`,
      knobs: [
        { id: 'attack', label: 'Attack ka size', min: 1, max: 40, step: 1, value: 30, unit: ' Tbps',
          note: '2025 ka record 31.4 Tbps tha — 35 second ka.' },
        { id: 'model', label: 'Model (0 = scrubbing centers · 1 = anycast, har location)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Scrubbing = detect karo, reroute karo, saaf karo, aage bhejo.' },
        { id: 'sites', label: 'Kitni locations defense mein hain', min: 4, max: 340, step: 4, value: 4, unit: '',
          note: 'Scrubbing centers kuch hote hain; anycast mein har sheher shaamil hai.' },
      ],
      readouts: k => {
        const m = cfEdgeModel(k);
        return [
          { label: 'Per-location load', value: m.perSite + ' Gbps', tone: m.perSite <= 200 ? 'ok' : 'bad' },
          { label: 'Absorb hua ya nahi', value: m.absorbed ? 'poora absorb' : 'drop ho raha hai', tone: m.absorbed ? 'ok' : 'bad' },
          { label: 'Mitigation time', value: m.mitigateS + ' s', tone: m.mitigateS <= 1 ? 'ok' : 'bad' },
          { label: 'Acche traffic par extra latency', value: m.extraMs + ' ms', tone: m.extraMs <= 5 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = cfEdgeModel(k);
        return [
          { label: 'Per-location load', pct: Math.min(100, (m.perSite / 800) * 100), text: m.perSite + ' Gbps', tone: m.perSite <= 200 ? 'ok' : 'bad' },
          { label: 'Mitigation time', pct: Math.min(100, (m.mitigateS / 180) * 100), text: m.mitigateS + ' s', tone: m.mitigateS <= 1 ? 'ok' : 'bad' },
          { label: 'Detour latency', pct: Math.min(100, (m.extraMs / 60) * 100), text: m.extraMs + ' ms', tone: m.extraMs <= 5 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = cfEdgeModel(k);
        if (k.model === 0) return { ok: false, text: `Scrubbing model mein detection aur reroute hi <b>${m.mitigateS} second</b> le lete hain, aur acche traffic ko detour ki <b>${m.extraMs} ms</b> keemat har waqt deni padti hai. 35 second ka attack is model ke liye lagbhag invisible hai.` };
        if (!m.absorbed) return { ok: false, text: `Anycast hai par sirf <b>${k.sites}</b> locations — per-location <b>${m.perSite} Gbps</b> aa raha hai. Slicing ka faayda tab milta hai jab locations bahut saari hon.` };
        return { ok: true, text: `Sahi. <b>${k.sites}</b> locations par ${k.attack} Tbps bat kar per-location <b>${m.perSite} Gbps</b> reh gaya, mitigation <b>${m.mitigateS}s</b> aur acche traffic par extra latency <b>${m.extraMs} ms</b>.` };
      },
      check: k => { const m = cfEdgeModel(k); return m.absorbed && m.mitigateS <= 1 && m.extraMs <= 5; },
      lesson: `Anycast ka asli faayda sirf latency nahi hai — attack ka <b>apne aap bant
        jaana</b> hai. Aur yeh bantwara kisi code ne nahi, <b>internet ki routing</b> ne
        kiya. Jab neeche ki layer pehle se kuch kar rahi hai, us par kaam daalo.`,
      quiz: {
        q: 'Scrubbing center model mein "defense ki chhat" kya hai?',
        choices: [
          'Scrubbing centers ki total capacity — usse bada attack aaya toh kuch nahi kiya ja sakta',
          'Internet ka bandwidth',
          'Origin server ka CPU',
          'DNS ka TTL',
        ],
        answer: 0,
        explain: '20 Tbps ke scrubbers bana liye toh 20 Tbps hi tumhari chhat hai. Anycast mein chhat poore network ki capacity hai, aur har nayi location usse badha deti hai.',
      },
    },
    {
      type: 'bins',
      title: 'Kaun sa kaam kisne kiya?',
      instructions: 'Har cheez ko us layer mein daalo jo usse sach mein karti hai.',
      bins: [
        { id: 'bgp', label: '🌐 Internet ki routing (BGP/anycast)' },
        { id: 'cf', label: '🏢 Cloudflare ka apna code' },
      ],
      items: [
        { text: 'Tay karna ki Jakarta ka user kis data center mein jaayega', bin: 'bgp', explain: 'Koi mapping service nahi — router apne sabse chhote raaste par bhej deta hai.' },
        { text: 'Botnet ke attack ko sheharon mein baant dena', bin: 'bgp', explain: 'Har infected machine apne nazdeeki sheher mein girti hai. Slicing routing se hoti hai, defense code se nahi.' },
        { text: 'Data center ke andar healthy server chunna', bin: 'cf', explain: 'Yeh Unimog ka kaam hai — Cloudflare ka XDP-based load balancer.' },
        { text: 'Attack ka fingerprint banana aur drop rule lagana', bin: 'cf', explain: 'dosd daemon har server par — apne NIC ke packets sample karke.' },
        { text: 'Naye sheher ka traffic apne aap aana shuru ho jaana', bin: 'bgp', explain: 'Route announce karte hi aas-paas ka traffic khud aane lagta hai — koi migration nahi.' },
        { text: 'Har customer ki config har server par pahunchana', bin: 'cf', explain: 'Yeh Quicksilver hai — agla level.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — attack ko sheharon mein bant kar dekho',
      project: '02-cloudflare',
      exercise: 'ex1-anycast-slicing',
      goal: 'Ek hi attack ko do tareeke se chalao — sab ek origin par, aur anycast jaisa sheher-wise — aur drop rate compare karo.',
      why: `Lab mein 6 "sheher" chalte hain, har ek <b>700 rps</b> sambhal sakta hai
        (token bucket — usse zyada aaya toh drop). Tool 6,000 rps ka mix bhejta hai:
        95% bots aur 5% asli users. <code>MODE=single</code> mein sab ek sheher par
        jaate hain, <code>MODE=anycast</code> mein har client apne nazdeeki sheher mein.`,
      steps: [
        { text: 'Cheh sheher chalao.', cmd: 'cd docker-labs/02-cloudflare && npm start ex1-anycast-slicing', expect: 'ex1-anycast-slicing\n  city-1  → http://localhost:4201  (capacity 700 rps)\n  ... city-6 → http://localhost:4206' },
        { text: 'Attack + asli users ek jagah bhejo.', cmd: 'node tools/attack.js --rps 6000 --for 3', expect: 'MODE=single   city-1: 5362/s  city-2: 0/s  ... city-6: 0/s\nMODE=single   dropped: 83%   asli users serve hue: 29%' },
        { text: 'Ab wahi attack anycast ki tarah baant kar bhejo.', cmd: 'MODE=anycast node tools/attack.js --rps 6000 --for 3', expect: 'MODE=anycast  city-1: 892/s  city-2: 892/s  ... city-6: 892/s\nMODE=anycast  dropped: 0%   asli users serve hue: 100%' },
      ],
      observe: {
        q: 'Attack ka size dono baar same tha. Anycast mode mein drop 0% kaise ho gaya?',
        choices: [
          'Attack 6 locations mein bat gaya, isliye har location par load uski capacity ke andar reh gaya',
          'Anycast ne bots ko block kar diya',
          'Anycast mode mein requests cache hoti hain',
          'Bots ne kam traffic bheja',
        ],
        answer: 0,
        explain: 'Koi filtering nahi hui — sirf load ka batwara hua. Yahi traffic slicing hai.',
      },
      lesson: 'Defense hamesha "pehchaan kar rok do" nahi hoti. Kabhi-kabhi defense sirf <b>load ka aakaar badal dena</b> hoti hai.',
    },
  ],
  interview: {
    title: 'Interview Round — edge aur routing',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Global load balancing kaise karoge — ek mapping service ya anycast?"',
        choices: [
          'Anycast — routing hi steering kar degi, aur jo steering brain hai hi nahi woh fail bhi nahi ho sakta; par state wali cheezon ke liye route stability naapo',
          'Mapping service — usse zyada control milta hai',
          'DNS geo-routing — sabse simple',
          'Dono ek saath',
        ],
        answer: 0,
        explain: 'Cloudflare ka core tark: neeche ki layer (BGP) pehle se raasta chun rahi hai. Par yeh maan kar mat chalo — unhone route stability naap kar tab TCP par anycast chalaya.',
      },
      {
        q: 'Interviewer: "Tumhara DDoS plan kya hai?"',
        choices: [
          'Load ko itni locations mein baanto ki per-location share manageable ho, aur us share ko jitna jaldi ho sake (NIC ke paas) drop karo',
          'Ek bada scrubbing center bana lo',
          'Rate limit application layer par lagao',
          'Autoscaling on kar do',
        ],
        answer: 0,
        explain: 'Pehle aakaar badlo (slicing), phir sasta drop (XDP). Application layer par rate limit tab tak bahut mehengi hai — packet wahan tak pahunch hi nahi-na chahiye.',
      },
    ],
  },
  success: [
    'Main anycast aur DNS-based steering ka farq samjha sakta hoon',
    'Main traffic slicing se DDoS ka aakaar badalna samajh gaya hoon',
    'Main scrubbing model ki teen keemat (deri, detour, chhat) bata sakta hoon',
  ],
  homework: `<p>Apne system ka koi ek "global" component chuno (load balancer, DNS,
    CDN). Ab poochho: agar woh component ek din puri tarah fail ho jaaye toh kya hoga?
    Agar jawab "sab band" hai, toh dekho ki uska kaam neeche ki kisi layer se ho sakta
    hai ya nahi.</p>`,
  cards: [
    { front: 'Anycast kya hai?', back: 'Ek hi IP prefix har data center se BGP par announce karna. Router har packet ko sabse nazdeeki route par bhej deta hai — koi mapping system, koi steering brain nahi.' },
    { front: 'Traffic slicing kya hai?', back: 'Botnet ki har machine apne nazdeeki sheher mein girti hai, isliye 31.4 Tbps ka attack 330 sheharon mein chhoti spikes ban jaata hai. Bantwara internet ki routing karti hai, koi code nahi.' },
    { front: 'Scrubbing center model ki teen keemat?', back: '(1) detect + reroute mein minute lagte hain, (2) detour se acche traffic ki latency badhti hai, (3) scrubbers ki capacity hi defense ki chhat ban jaati hai.' },
    { front: 'Anycast + TCP ka purana dar?', back: 'Maana jaata tha ki beech mein route badalne se connection tootega. Cloudflare ne naapa: routes un kuch second ke liye sthir rehte hain jitne connection ko chahiye.' },
  ],
},
]);

function cfEdgeModel(k) {
  const perSite = Math.round((k.attack * 1000) / k.sites);
  if (k.model === 0) {
    /* scrubbing: detection + reroute mein waqt, aur detour ki latency har waqt */
    return { perSite: Math.round((k.attack * 1000) / Math.max(4, Math.min(k.sites, 12))), absorbed: k.attack <= 20, mitigateS: 180, extraMs: 38 };
  }
  return { perSite, absorbed: perSite <= 200, mitigateS: 0.3, extraMs: 0 };
}

/* =====================================================================
   LEVEL 2 — EK JAISA FLEET + QUICKSILVER
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-cf-fleet',
  icon: '🧱',
  title: 'Cloudflare — har server har kaam kar sakta hai',
  badge: 'Fleet Fakeer',
  objectives: [
    'Product-wise fleets ka chhupa hua kharcha: stranded headroom',
    'Homogeneous fleet — capacity planning ka sawaal ek hi bachta hai',
    'Quicksilver: poora global dataset har server par, LMDB par',
    'Write par keemat do, read muft karo — aur uski ulti keemat (blast radius)',
  ],
  lesson: [
    `<h3>🏗️ Sabse aam tareeka: har product ka apna fleet</h3>
     <p>Zyadatar companies infra ko product se baantti hain — search ka cluster, storage
     ka cluster, API ka cluster. Har cluster ka apna forecasting, apna provisioning aur
     apna khaali headroom hota hai. Jab ek product achanak popular hota hai, uska cluster
     dab jaata hai jabki padosi clusters khaali baithe rehte hain — unka hardware madad
     nahi kar sakta kyunki us par woh software chalta hi nahi.</p>
     <h3>🧱 Cloudflare ka ulta faisla</h3>
     <p>Cloudflare ke kisi bhi data center mein saare racks lagbhag ek jaise hain. Koi
     DNS fleet nahi, koi WAF fleet nahi, koi Workers fleet nahi. <b>Har server poora
     software stack chalata hai</b>: DNS caching, TLS termination, WAF, bot management,
     Workers aur DDoS defense. Koi bhi server kisi bhi customer ki koi bhi request poori
     kar sakta hai.</p>
     <table>
       <tr><th>Product-wise fleets</th><th>Ek jaisa fleet</th></tr>
       <tr><td>"CDN ko kitne server chahiye? WAF ko kitne? Workers ko kitne?"</td><td>"Is <b>sheher</b> ko kitna compute chahiye?"</td></tr>
       <tr><td>Naya product = naya fleet, naya deployment</td><td>Naya product = wahi fleet, pehle din se har location par</td></tr>
       <tr><td>Spike aane par padosi ki capacity bekaar</td><td>Spike poore sheher ki capacity udhaar le leti hai</td></tr>
     </table>
     <p>Data center ke andar traffic baantne ka kaam <b>Unimog</b> karta hai — Cloudflare
     ka load balancer jo XDP par bana hai (XDP agle level mein).</p>`,
    `<h3>⚡ Ek faisla jo doosra faisla majboor kar deta hai</h3>
     <p>Agar koi bhi server kisi bhi customer ko serve kar sakta hai, toh <b>har server
     ko har customer ki config pata honi chahiye</b> — certificates, DNS records,
     firewall rules, redirects, feature flags. Request handle karte waqt server ruk kar
     kisi doosri machine se nahi poochh sakta.</p>
     <p>Isi liye Cloudflare ne <b>Quicksilver</b> banaya (pehle off-the-shelf Kyoto
     Tycoon tha, jise unhone uski design limits se bahut aage dhakel diya tha). Do
     faisle ise alag banate hain:</p>
     <pre>1. Har server POORA global dataset rakhta hai — koi partitioning nahi,
   koi hot-key cache nahi. Sau GB ka data har machine par.
2. Storage engine LMDB — memory-mapped B-tree, bahut tez concurrent reads.</pre>
     <p>Ek HTTP request Quicksilver se darjanon sawaal poochhti hai: kaunsa TLS
     certificate? kaunse firewall rules? kaunsa origin? kaunse features on hain? Har
     sawaal ek <b>local memory read</b> hai — microseconds. Agar har sawaal ek network
     call hota, toh request apna zyadatar waqt config laane mein hi bita deti.</p>
     <p class="tip">🎯 Jira ka ulta model: wahan har tenant ka apna database hai, isliye
     har request pehle poochhti hai "yeh tenant rehta kahan hai?" (TCS). Cloudflare ne
     sawaal hi mita diya — jawab pehle se har server par maujood hai.</p>`,
    `<h3>⚖️ Keemat: wahi teji, ulti taraf</h3>
     <p>Quicksilver ka poora design "write par kharcha karo, read muft karo" hai. Jab
     koi dashboard par Save dabata hai, woh badlav duniya ke har server tak seconds mein
     pahunchta hai.</p>
     <p>Wahi teji DDoS ke waqt Cloudflare ki sabse badi taakat hai (naya attack
     fingerprint seconds mein har server par). Aur wahi teji sabse bada khatra bhi hai —
     ek galat config bhi seconds mein har server par pahunch jaata hai. Isi blast radius
     ka asli roop tumne Feed track ke 18 November 2025 wale postmortem mein dekha tha.</p>
     <p class="tip">🎯 Yeh tradeoff chhupa nahi hai, chuna hua hai: <b>ek jaisa fleet +
     tez global config = fungible capacity aur day-one global launch, par bad rollout
     bhi utni hi tezi se phailega</b>. Isiliye config ko bhi staged rollout chahiye.</p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Capacity plan review — teen galtiyan',
      brief: `Ek CDN startup ne apna infra plan banaya hai. Traffic har product mein
        alag-alag badhta hai. Teen aisi jagah pakdo jo aage jaake mehengi padengi.`,
      goal: 'Teen flaws dhoondho. Sahi boxes par click karoge toh unka tark bhi milega.',
      nodes: [
        { id: 'dns', label: 'DNS fleet', sub: '40 servers · peak par 30% use', row: 0 },
        { id: 'waf', label: 'WAF fleet', sub: '40 servers · peak par 110% — 5xx', row: 0 },
        { id: 'work', label: 'Workers fleet', sub: '20 servers · sirf 3 regions mein', row: 0 },
        { id: 'cfg', label: 'Config service', sub: 'har request par central lookup', row: 1 },
        { id: 'lb', label: 'LB', sub: 'har DC mein healthy servers par spread', row: 1 },
        { id: 'store', label: 'Config DB', sub: 'source of truth, ek region mein', row: 2 },
      ],
      flaws: [
        { id: 'waf', why: 'Product-wise fleets ka classic natija: WAF 110% par gir raha hai jabki DNS fleet 70% khaali hai. Ek jaisa fleet hota toh WAF spike poore sheher ki capacity udhaar le leta.' },
        { id: 'work', why: 'Sirf 3 regions mein Workers matlab naya product pehle din global nahi hai, aur har nayi location ke liye alag deployment plan chahiye. Cloudflare ka rule: naya product usi fleet par ship hota hai jo pehle se har jagah hai.' },
        { id: 'cfg', why: 'Har request par central config lookup = har request ke andar ek network round trip, aur config service down hone par poora edge bekaar. Config ko read-side par local kar do (Quicksilver model).' },
      ],
      fine: {
        dns: 'DNS fleet ka 30% par hona apne aap mein galti nahi — galti yeh hai ki us khaali capacity ko koi aur product use nahi kar sakta.',
        lb: 'Data center ke andar healthy servers par spread karna bilkul sahi hai — Cloudflare wahi Unimog se karta hai.',
        store: 'Config ka ek source of truth hona sahi hai. Sawaal sirf yeh hai ki READ kahan se ho — source se ya har server ki local copy se.',
      },
      lesson: `Homogeneous fleet ka faayda ek hi line mein: <b>capacity fungible ho jaati
        hai</b>. Aur uski shart bhi ek hi line mein: <b>har server ko har customer ki
        config locally chahiye</b>.`,
    },
    {
      type: 'tradeoff',
      title: 'Config distribution lab',
      instructions: 'Config kahan se padhi jaaye aur kitni tezi se phaile — dono knobs ghumao.',
      goal: 'Aisi setting dhoondho jahan request ke andar config ka kharcha <b>1 ms se kam</b> ho, config service down hone par bhi edge <b>chalta rahe</b>, aur ek kharab config ka blast radius <b>10% se kam</b> ho.',
      scenario: `Har request ko lagbhag <b>20 config lookups</b> chahiye (certificate,
        firewall rules, origin, feature flags). Tumhare paas 200 edge servers hain.`,
      knobs: [
        { id: 'where', label: 'Config kahan se padhi jaaye (0 = central service · 1 = har server par local copy)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Local copy = memory read. Central = network call.' },
        { id: 'rtt', label: 'Config service tak RTT', min: 1, max: 40, step: 1, value: 12, unit: ' ms',
          note: 'Same region mein kam, cross-region mein zyada.' },
        { id: 'stage', label: 'Naya config kitne percent par pehle jaaye', min: 1, max: 100, step: 1, value: 100, unit: '%',
          note: '100% matlab ek saath sab servers par — Cloudflare ki asli galti isi shakal ki thi.' },
      ],
      readouts: k => {
        const m = qsModel(k);
        return [
          { label: 'Request ke andar config ka waqt', value: m.perReq + ' ms', tone: m.perReq <= 1 ? 'ok' : m.perReq <= 20 ? 'warn' : 'bad' },
          { label: 'Config service down ho toh', value: m.survives ? 'edge chalta rahega' : 'poora edge bekaar', tone: m.survives ? 'ok' : 'bad' },
          { label: 'Kharab config ka blast radius', value: k.stage + '% servers', tone: k.stage <= 10 ? 'ok' : 'bad' },
          { label: 'Naya config sab par pahunchne mein', value: m.rollout, tone: 'ok' },
        ];
      },
      bars: k => {
        const m = qsModel(k);
        return [
          { label: 'Config ka waqt / request', pct: Math.min(100, (m.perReq / 300) * 100), text: m.perReq + ' ms', tone: m.perReq <= 1 ? 'ok' : 'bad' },
          { label: 'Blast radius', pct: k.stage, text: k.stage + '%', tone: k.stage <= 10 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = qsModel(k);
        if (k.where === 0) return { ok: false, text: `Central config: har request 20 lookups × ${k.rtt} ms = <b>${m.perReq} ms</b> sirf config mein, aur config service down hone par poora edge bekaar. Cloudflare ne isi liye read ko local kiya.` };
        if (k.stage > 10) return { ok: false, text: `Local copy se speed to mil gayi (<b>${m.perReq} ms</b>), par naya config ek saath <b>${k.stage}%</b> servers par ja raha hai. Jo cheez seconds mein sab ko theek kar sakti hai, wahi seconds mein sab ko tod bhi sakti hai.` };
        return { ok: true, text: `Yahi balance hai: read local (<b>${m.perReq} ms</b>), config service down hone par bhi edge chalta hai, aur naya config pehle sirf <b>${k.stage}%</b> par jaata hai.` };
      },
      check: k => { const m = qsModel(k); return m.perReq <= 1 && m.survives && k.stage <= 10; },
      lesson: `Do alag faisle hain aur dono chahiye: <b>read local karo</b> (speed aur
        availability) aur <b>write staged karo</b> (blast radius). Cloudflare ne pehla
        bahut pehle kiya, doosre ka sabak mehenga pada.`,
      quiz: {
        q: 'Quicksilver har server par poora dataset rakhta hai — koi partitioning nahi. Iska seedha faayda?',
        choices: [
          'Koi bhi server kisi bhi customer ko turant serve kar sakta hai, bina kisi lookup ke — "yeh tenant kahan hai" wala sawaal hi mit jaata hai',
          'Disk sasta padta hai',
          'Data consistency apne aap mil jaati hai',
          'Backups aasan ho jaate hain',
        ],
        answer: 0,
        explain: 'Homogeneous fleet ki shart yahi hai. Jira ne ulta raasta liya (per-tenant DB + TCS lookup) kyunki wahan isolation zyada zaroori thi.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — central config vs local config',
      project: '02-cloudflare',
      exercise: 'ex2-config-push',
      goal: 'Ek edge service ko do tareeke se chalao: har request par central config lookup, aur local replicated config. Latency aur failure behaviour dono naapo.',
      why: `Har request 20 config lookups karti hai. <code>CONFIG=central</code> mein woh
        20 network calls hain; <code>CONFIG=local</code> mein woh 20 memory reads hain
        aur ek pusher background mein updates bhejta rehta hai.`,
      steps: [
        { text: 'Central config mode chalao.', cmd: 'npm start ex2-config-push', expect: 'ex2-config-push\n  config-service → http://localhost:4210\n  edge-1         → http://localhost:4211  (CONFIG=central)\n  edge-2, edge-3 → 4212, 4213' },
        { text: 'Load bhejo aur latency dekho.', cmd: 'node tools/edge-load.js --rps 300 --for 4', expect: 'CONFIG=central  p50: 1467 ms   p99: 2352 ms   config calls: 19940   errors: 0%' },
        { text: 'Config service band karke dekho edge chalta hai ya nahi.', cmd: 'node tools/kill-config.js', expect: 'config service DOWN → CONFIG=central: ok 0/60, fail 60/60' },
        { text: 'Ab local config mode par jao aur load dobara bhejo.', cmd: 'CONFIG=local npm start ex2-config-push && node tools/edge-load.js --rps 300 --for 4', expect: 'edge-1: local copy ready (2000 sites)\nCONFIG=local    p50: 2 ms   p99: 4 ms   config calls: 0   errors: 0%' },
        { text: 'Config service phir band karo.', cmd: 'node tools/kill-config.js', expect: 'config service DOWN → CONFIG=local: ok 60/60, fail 0/60' },
      ],
      observe: {
        q: 'Config service band karne par local mode mein errors 0% kyun rahe?',
        choices: [
          'Read path ko config service ki zaroorat hi nahi thi — har edge ke paas poori copy pehle se thi; sirf naye updates aana ruka',
          'Edge ne config cache kar li thi jo 5 minute baad expire hoti',
          'Load tool ne retry kar liya',
          'Errors bas dikhe nahi',
        ],
        answer: 0,
        explain: 'Yahi "pay on write, free on read" ka asli faayda hai: read path ka koi runtime dependency hi nahi bachta.',
      },
      lesson: 'Har request ke andar ka har network call ek naya dependency hai. Config ko read path se hatana latency aur availability, dono theek karta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — fleet aur config',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Tum har machine par poora config dataset kab rakhoge?"',
        choices: [
          'Jab reads bahut zyada hon, dataset ek machine mein aa jaaye, aur read path par kisi network dependency ki gunjaish na ho',
          'Hamesha — local hamesha behtar hai',
          'Kabhi nahi — data duplicate karna galat hai',
          'Sirf tab jab config chhota ho, 1 MB se kam',
        ],
        answer: 0,
        explain: 'Cloudflare sau GB ka dataset har server par rakhta hai. Sawaal size ka nahi, <b>read/write ratio aur availability</b> ka hai.',
      },
      {
        q: 'Interviewer: "Ek jaise fleet ka sabse bada khatra?"',
        choices: [
          'Ek kharab rollout har server tak utni hi tezi se pahunchta hai jitni tezi se accha rollout — isliye config ko bhi staged bhejna padta hai',
          'Servers mehenge ho jaate hain',
          'Products ek doosre ka data dekh lete hain',
          'Debugging mushkil ho jaati hai',
        ],
        answer: 0,
        explain: 'Fungible capacity ka doosra pehlu poora fleet blast radius hai. Isiliye config bhi 1% → 10% → 100% jaana chahiye.',
      },
    ],
  },
  success: [
    'Main homogeneous fleet ka faayda aur uski shart dono bata sakta hoon',
    'Main config ko read path se hata kar latency aur availability sudhar sakta hoon',
    'Main tez global propagation ka blast radius pehchaan sakta hoon',
  ],
  homework: `<p>Apni service ki ek request lo aur gino: us request ke andar kitne
    network calls sirf <b>"mujhe pata karna hai ki kya karna hai"</b> ke liye hote hain
    (config, feature flag, tenant lookup, permission)? Har aisa call ek dependency hai.
    Dekho kitne local copy se hat sakte hain.</p>`,
  cards: [
    { front: 'Homogeneous fleet ka faayda?', back: 'Capacity fungible ho jaati hai — koi bhi server koi bhi product serve kar sakta hai. Planning ka sawaal ek hi bachta hai: "is sheher ko kitna compute chahiye?"' },
    { front: 'Quicksilver ke do radical faisle?', back: '(1) har server poora global dataset rakhta hai — koi partitioning nahi, (2) engine LMDB (memory-mapped B-tree) — taaki har config lookup local memory read ho.' },
    { front: 'Cloudflare vs Jira config model?', back: 'Cloudflare: config har server par replicate, lookup ka sawaal hi nahi. Jira: per-tenant DB, isliye har request pehle poochhti hai "tenant kahan rehta hai" (TCS + sidecars).' },
    { front: 'Tez global config ka ulta pehlu?', back: 'Jo cheez seconds mein sabko theek karti hai woh seconds mein sabko tod bhi sakti hai. Isliye config ko bhi staged rollout (1% → 10% → 100%) chahiye.' },
  ],
},
]);

function qsModel(k) {
  if (k.where === 0) return { perReq: 20 * k.rtt, survives: false, rollout: 'seconds' };
  return { perReq: 0.2, survives: true, rollout: 'seconds' };
}


/* =====================================================================
   LEVEL 3 — AUTONOMOUS DEFENSE (dosd + XDP) aur free tier ka flywheel
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-cf-defense',
  icon: '⚡',
  title: 'Cloudflare — insaan ke bina ladne wali defense',
  badge: 'Packet Pahredaar',
  objectives: [
    'dosd — har server apne hi NIC ke packets se attack ka fingerprint banata hai',
    'XDP par drop kyun ~10× sasta hai iptables se',
    'Jab attack 35 second ka ho, toh insaan loop mein ho hi nahi sakta',
    'Free tier ek sensor network — aur ek flywheel',
  ],
  lesson: [
    `<h3>⏱️ Pehle number dekho, phir design</h3>
     <pre>9 mein se 10 network-layer attacks   →  10 minute se kam chalte hain
7.3 Tbps wala attack                  →  poora payload 45 second mein
31.4 Tbps wala record attack (2025)   →  35 second</pre>
     <p>Ab socho: page aaya, engineer utha, laptop khola, VPN connect hua, dashboard
     dekha — 5 minute. Us waqt tak attack khatam ho chuka hai. Isliye Cloudflare ki
     defense mein <b>koi insaan hai hi nahi</b>. Engineers ko pata chalta hai ki record
     toota, apne hi dashboard se, baad mein.</p>
     <h3>🐕 dosd — detection wahin jahan packet giray</h3>
     <p>Har Cloudflare server par ek chhota daemon chalta hai: <b>dosd</b> (denial of
     service daemon). Woh apne hi network card se guzarte packets ko sample karta hai,
     unke characteristics se ek <b>statistical fingerprint</b> banata hai, aur us
     fingerprint se milte packets ke liye wahin drop rule laga deta hai.</p>
     <p>Dhyan do — koi central brain nahi poochha gaya. Central brain se poochhne ka
     matlab hota round trip, aur round trip ka matlab latency. Saath hi ek global
     detection layer poore network ka traffic dekhti hai (kuch patterns sirf tabhi
     dikhte hain jab sab sheher milakar dekhe jaayein), aur jab woh koi bharosemand
     fingerprint banati hai toh <b>Quicksilver</b> use seconds mein har server tak
     pahuncha deta hai.</p>`,
    `<h3>⚡ XDP — packet ko sabse sasti jagah par maaro</h3>
     <p>Linux mein eBPF se tum chhote verified programs kernel ke andar chala sakte ho.
     XDP (express data path) woh point hai jahan packet <b>sabse pehle</b> milta hai —
     network card se abhi aaya hai, kernel ne uske liye memory allocate bhi nahi ki,
     TCP/IP stack tak pahuncha hi nahi.</p>
     <p>Agar packet DDoS fingerprint se match karta hai toh Cloudflare use wahin gira
     deta hai. Na uska processing, na uski buffering. Cloudflare ke apne experience ke
     hisaab se yeh usi packet ko baad mein iptables se drop karne se lagbhag <b>10×
     sasta</b> hai.</p>
     <p class="tip">🎯 Falsafa: <b>sabse sasta packet woh nahi hai jise tum efficiently
     process karte ho — sabse sasta packet woh hai jise tumhe process karna hi na
     pade.</b> Yahi tark application-level rate limiting par bhi lagta hai: request
     jitni gehrai mein jaayegi, use rokna utna hi mehenga hoga.</p>`,
    `<h3>🎁 Free tier — kharcha nahi, sensor network</h3>
     <p>2017 se Cloudflare har plan par, free plan par bhi, <b>unmetered DDoS
     mitigation</b> deta hai. Competitors gigabit ke hisaab se bill karte hain. Yeh
     charity nahi hai, architecture ka natija hai:</p>
     <table>
       <tr><th>Kyun mumkin hai</th><th>Matlab</th></tr>
       <tr><td>Ek aur website protect karna lagbhag muft hai</td><td>Har server pehle se poora stack chalata hai; naya customer matlab Quicksilver mein ek config push</td></tr>
       <tr><td>Har free customer defense ko behtar karta hai</td><td>Lakhon chhoti sites naye attack patterns bade banks se pehle dekhti hain — ek hobby blog par seekha fingerprint seconds mein poore network par</td></tr>
       <tr><td>Free tier network ko sasta banata hai</td><td>Itna traffic hone par ISPs khud settlement-free peering karna chahte hain → transit cost kam → free tier affordable</td></tr>
     </table>
     <p>Yahi chaal 2014 mein bhi chali thi: Universal SSL ne har customer ko muft TLS
     certificate diya — Let's Encrypt se ek saal se zyada pehle. Cloudflare ka andaza
     hai ki isse internet par encrypted websites lagbhag <b>dogni</b> ho gayin. Mumkin
     isliye tha kyunki har server pehle se HTTPS handle karta tha — naya infra nahi
     lagana pada, bas config badli.</p>
     <p class="tip">🎯 Ek pattern teen baar: anycast ne routing ko load balancer bana
     diya, free tier ne chhoti sites ko sensor network bana diya, aur Argo ne telemetry
     ko routing product bana diya. <b>Scale ka byproduct hi naya product ban jaata
     hai.</b></p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Ek malicious packet ka safar — sahi kram',
      instructions: 'Packet aane se lekar poore network ke seekhne tak, kaam kis kram mein hota hai?',
      steps: [
        { text: 'Packet network card par aata hai — kernel ne abhi memory allocate bhi nahi ki', explain: 'Yahi woh jagah hai jahan drop karna sabse sasta hai.' },
        { text: 'XDP program packet ko dekhta hai aur maujooda drop rules se match karta hai', explain: 'eBPF program kernel ke andar, sabse pehle hook par.' },
        { text: 'Match nahi hua toh packet TCP/IP stack aur aage application tak jaata hai', explain: 'Yahan se har kadam mehenga hai — memory, context switch, processing.' },
        { text: 'dosd usi server par packets sample karke ek statistical fingerprint banata hai', explain: 'Detection wahin ho rahi hai jahan traffic gir raha hai — kisi central brain se poochhe bina.' },
        { text: 'Us server par nayi drop rule install ho jaati hai', explain: 'Ab aage se matching packets NIC par hi mar jaate hain.' },
        { text: 'Global detection layer poore network ka pattern dekh kar fingerprint confirm karti hai', explain: 'Kuch patterns sirf tab dikhte hain jab saare sheher ek saath dekhe jaayein.' },
        { text: 'Quicksilver us fingerprint ko seconds mein har server tak pahuncha deta hai', explain: 'Ek hobby blog par seekha pattern seconds mein ek bank ko bhi bacha raha hota hai.' },
      ],
    },
    {
      type: 'tradeoff',
      title: 'Drop point lab — kahan roko',
      instructions: 'Attack ka size aur drop ki jagah badlo. CPU aur acche users dono dekho.',
      goal: 'Aisi setting dhoondho jahan server ka CPU <b>70% se kam</b> rahe aur acche users ka p99 <b>50 ms se kam</b> ho.',
      scenario: `Ek server par <b>acche</b> users ke saath-saath attack traffic bhi aa
        raha hai. Tum tay karoge ki malicious packet kahan pakda jaaye: NIC par (XDP),
        firewall par (iptables), ya application ke andar.`,
      knobs: [
        { id: 'pps', label: 'Attack ka traffic', min: 100000, max: 3000000, step: 100000, value: 2000000, unit: ' pps',
          note: 'Packets per second, sirf is ek server par.' },
        { id: 'where', label: 'Drop kahan (0 = application · 1 = iptables · 2 = XDP)', min: 0, max: 2, step: 1, value: 0, unit: '',
          note: 'Jitna gehrai mein jaake rokoge, utna mehenga.' },
        { id: 'fp', label: 'Fingerprint kitna accurate hai', min: 50, max: 100, step: 5, value: 100, unit: '%',
          note: 'Kam accuracy = kuch malicious packets nikal jaate hain (aur galat drop bhi hota hai).' },
      ],
      readouts: k => {
        const m = dropModel(k);
        return [
          { label: 'CPU', value: m.cpu + '%', tone: m.cpu <= 70 ? 'ok' : 'bad' },
          { label: 'Acche users ka p99', value: m.p99 + ' ms', tone: m.p99 <= 50 ? 'ok' : 'bad' },
          { label: 'Ek packet ka kharcha', value: m.costUs + ' µs', tone: m.costUs <= 1 ? 'ok' : m.costUs <= 5 ? 'warn' : 'bad' },
          { label: 'Bach ke nikle packets', value: m.leaked.toLocaleString('en-IN') + ' pps', tone: m.leaked === 0 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = dropModel(k);
        return [
          { label: 'CPU', pct: Math.min(100, m.cpu), text: m.cpu + '%', tone: m.cpu <= 70 ? 'ok' : 'bad' },
          { label: 'Acche users ka p99', pct: Math.min(100, (m.p99 / 400) * 100), text: m.p99 + ' ms', tone: m.p99 <= 50 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = dropModel(k);
        if (k.where === 0) return { ok: false, text: `Application ke andar drop karne ka matlab hai har malicious packet ka poora safar: memory, TCP stack, parsing. CPU <b>${m.cpu}%</b>, acche users ka p99 <b>${m.p99} ms</b>.` };
        if (k.where === 1 && m.cpu > 70) return { ok: false, text: `iptables application se kaafi sasta hai, par is traffic (<b>${(k.pps / 1e6).toFixed(1)}M pps</b>) par bhi CPU <b>${m.cpu}%</b> hai. XDP par packet NIC se aage badhta hi nahi.` };
        if (m.cpu > 70 || m.p99 > 50) return { ok: false, text: `Abhi bhi bhaari: CPU <b>${m.cpu}%</b>, p99 <b>${m.p99} ms</b>. Traffic kam karo ya aur pehle drop karo.` };
        return { ok: true, text: `Sahi. <b>${(k.pps / 1e6).toFixed(1)}M pps</b> XDP par rukta hai — CPU <b>${m.cpu}%</b>, acche users ka p99 <b>${m.p99} ms</b>. Jo packet kabhi process hi nahi hua, uska kharcha lagbhag zero hai.` };
      },
      check: k => { const m = dropModel(k); return m.cpu <= 70 && m.p99 <= 50; },
      lesson: `Rate limiting ka ek hi asli sawaal hai: <b>request ko kis layer par roka
        ja sakta hai</b>. Har layer neeche jaane par kharcha kai guna badh jaata hai.`,
      quiz: {
        q: 'Application-level rate limiting kyun sabse mehengi hoti hai?',
        choices: [
          'Kyunki wahan tak pahunchne mein packet memory, TCP stack aur parsing — sab kuch le chuka hota hai',
          'Kyunki application code slow hota hai',
          'Kyunki rate limit ka logic complex hota hai',
          'Kyunki wahan Redis ki zaroorat padti hai',
        ],
        answer: 0,
        explain: 'Kharcha rate limit ke logic ka nahi hai — kharcha us poore safar ka hai jo packet ne wahan tak pahunchne mein kiya.',
      },
    },
    {
      type: 'quiz',
      title: 'Free tier ka ganit',
      questions: [
        {
          q: 'Cloudflare 2017 se free plan par bhi unmetered DDoS protection kyun de pata hai?',
          choices: [
            'Kyunki ek aur site protect karna lagbhag sirf ek config push hai — infra pehle se har jagah maujood hai',
            'Kyunki free users ka traffic kam hota hai',
            'Kyunki paid customers subsidy dete hain',
            'Kyunki free plan par mitigation kamzor hoti hai',
          ],
          answer: 0,
          explain: 'Homogeneous fleet + anycast + XDP pehle se hain. Marginal cost lagbhag zero hai — yahi baat business model banati hai.',
        },
        {
          q: 'Free tier defense ko behtar kaise banata hai?',
          choices: [
            'Lakhon chhoti sites naye attack patterns pehle dekhti hain; ek hobby blog par seekha fingerprint Quicksilver se seconds mein har customer ko bacha leta hai',
            'Free users bug reports bhejte hain',
            'Free traffic se machine learning model train hota hai raat mein',
            'Free tier se paid conversion hota hai',
          ],
          answer: 0,
          explain: 'Free tier ek global sensor network hai. Yeh "scale ka byproduct product ban gaya" wale pattern ka doosra roop hai.',
        },
        {
          q: 'Universal SSL (2014) is kahani mein kyun fit hota hai?',
          choices: [
            'Har server pehle se HTTPS karta tha, isliye lakhon sites ko muft TLS dena naya infra nahi, sirf config change tha',
            'Kyunki certificates sasti thin',
            'Kyunki Let\'s Encrypt ne madad ki',
            'Kyunki browsers ne majboor kiya',
          ],
          answer: 0,
          explain: 'Ek jaisa fleet hone ka seedha natija: naya global feature deploy ka kaam nahi, config ka kaam ban jaata hai.',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — jaldi drop karo, sasta drop karo',
      project: '02-cloudflare',
      exercise: 'ex3-early-drop',
      goal: 'Ek hi attack ko teen jagah rok kar dekho: application ke andar, middleware par, aur connection accept hone se pehle.',
      why: `Ek hi flood (4,000 bad + 200 good per second) teen jagah roka jaata hai:
        <code>DROP=app</code> (body parse + business logic ke baad),
        <code>DROP=middleware</code> (headers ke turant baad), aur
        <code>DROP=edge</code> (ek TCP filter par — application tak baat pahunchti hi nahi).`,
      steps: [
        { text: 'App-level drop se shuru karo.', cmd: 'npm start ex3-early-drop', expect: 'ex3-early-drop\n  guarded-service → http://localhost:4221  (DROP=app)\n  edge-filter     → tcp://localhost:4220  (FILTER=0)' },
        { text: 'Flood chalao.', cmd: 'node tools/flood.js --bad 4000 --good 200 --for 3', expect: 'DROP=app        good served: 600   blocked: 12000 (edge 0 · app 12000)   app ne poora kaam kiya: 12600 requests   throughput: 725/s' },
        { text: 'Middleware par drop karke dobara.', cmd: 'DROP=middleware npm start ex3-early-drop && node tools/flood.js --bad 4000 --good 200 --for 3', expect: 'DROP=middleware good served: 600   blocked: 12000 (edge 0 · app 12000)   app ne poora kaam kiya: 600 requests   throughput: 2984/s' },
        { text: 'Ab TCP filter par drop karo.', cmd: 'DROP=edge npm start ex3-early-drop && node tools/flood.js --bad 4000 --good 200 --for 3', expect: 'DROP=edge       good served: 600   blocked: 12000 (edge 12000 · app 0)   app ne poora kaam kiya: 600 requests   throughput: 2907/s' },
      ],
      observe: {
        q: 'Teeno modes wahi 12,000 requests reject kar rahe the. Phir throughput 725/s se ~2,900/s kaise ho gaya?',
        choices: [
          'Kyunki reject karne ka kharcha is baat par nirbhar hai ki request ne wahan tak pahunchne mein kitna kaam karwaya',
          'Edge mode kam requests reject karta hai',
          'App mode mein logging zyada thi',
          'TCP filter requests ko cache kar leta hai',
        ],
        answer: 0,
        explain: 'Yahi XDP ka tark chhote paimane par hai: jitni gehrai mein packet jaayega, use rokna utna mehenga hoga.',
      },
      lesson: 'Har defense ke saath ek sawaal poochho: "yeh request ko kis layer par rok raha hai?" Answer jitna neeche hoga, defense utni sasti hogi.',
    },
  ],
  interview: {
    title: 'Interview Round — abuse aur rate limiting',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Tumhari API par scraping bot aa rahe hain. Rate limiting kahan lagaoge?"',
        choices: [
          'Jitna upar ho sake — edge/CDN ya load balancer par, taaki bot ka packet app tak pahunche hi na; app-level limit sirf aakhri safety net ho',
          'Application mein, kyunki wahan business logic ka pata hota hai',
          'Database ke saamne, kyunki asli kharcha wahi hai',
          'Client side par, request bhejne se pehle',
        ],
        answer: 0,
        explain: 'Har layer neeche jaane par ek request ka kharcha kai guna badhta hai. App-level limit galat nahi hai, par woh pehli line nahi honi chahiye.',
      },
      {
        q: 'Interviewer: "Attack detect karne wala system kahan chalega — central ya har node par?"',
        choices: [
          'Dono — local detection turant reaction deti hai (koi round trip nahi), aur global layer woh patterns pakadti hai jo sirf poore network mein dikhte hain',
          'Sirf central — wahan poora data hota hai',
          'Sirf local — central bottleneck ban jaayega',
          'Kahin nahi, WAF vendor sambhal lega',
        ],
        answer: 0,
        explain: 'Cloudflare ka model yahi hai: dosd local, global detection upar, aur Quicksilver se fingerprint sab jagah.',
      },
    ],
  },
  success: [
    'Main bata sakta hoon ki request ko kis layer par rokna sabse sasta hai',
    'Main local + global detection ka combination design kar sakta hoon',
    'Main free tier jaise "byproduct se product" wale pattern pehchaan sakta hoon',
  ],
  homework: `<p>Apni service ka koi abusive traffic pattern socho (scraping, credential
    stuffing, spam signups). Ab likho ki aaj woh request kitne layers paar karti hai
    pakde jaane se pehle. Har layer ke saamne likho: "kya yahan pakda ja sakta tha?"</p>`,
  cards: [
    { front: 'dosd kya karta hai?', back: 'Har Cloudflare server par chalne wala daemon: apne hi NIC ke packets sample karta hai, attack ka statistical fingerprint banata hai, aur wahin drop rule lagata hai — bina kisi central brain se poochhe.' },
    { front: 'XDP par drop kyun sasta hai?', back: 'XDP woh jagah hai jahan packet NIC se abhi aaya hai — kernel ne memory allocate nahi ki, TCP/IP stack shuru nahi hua. Cloudflare ke hisaab se iptables se ~10× sasta.' },
    { front: 'Defense mein insaan kyun nahi?', back: '9/10 network attacks 10 minute se kam chalte hain; record 31.4 Tbps attack sirf 35 second. Insaan keyboard tak pahunchne se pehle attack khatam.' },
    { front: 'Free tier ka flywheel?', back: 'Ek aur site = config push (marginal cost ~0) → lakhon sites = global sensor network → zyada traffic = settlement-free peering = sasta network = free tier affordable.' },
  ],
},
]);

function dropModel(k) {
  const m = k.pps / 1e6;
  const cost = k.where === 2 ? 0.2 : k.where === 1 ? 2.5 : 30;   /* µs per packet */
  const cpu = Math.min(100, Math.round(m * cost * 20 + 8));
  const p99 = k.where === 2 ? 9 + Math.round(m * 2) : k.where === 1 ? 40 + Math.round(m * 90) : 300 + Math.round(m * 700);
  const leaked = Math.round(k.pps * (1 - k.fp / 100));
  return { cpu, p99, costUs: cost, leaked };
}

/* =====================================================================
   LEVEL 4 — EDGE PAR DOOSRON KA CODE
   ===================================================================== */
SD.registerLevels('stories', [
{
  id: 'st-cf-edge',
  icon: '🧩',
  title: 'Cloudflare — isolates, ghadi, aur "ek hi copy"',
  badge: 'Edge Kaarigar',
  objectives: [
    'V8 isolates vs VM vs container — density ka faisla',
    'Cold start ko TLS handshake ke andar chhupana',
    'Spectre ka jawab: ghadi hi hata do',
    'Cloudbleed → Rust aur Pingora ka shared connection pool',
    'Keyless SSL aur durable objects — "sab jagah copy" ke do apvaad',
  ],
  lesson: [
    `<h3>🧩 Doosron ka code, har server par</h3>
     <p>2017 mein Cloudflare ne tay kiya ki wahi servers jo traffic move aur defend karte
     hain, ab customers ka code bhi chalayenge. Problem: laakhon customers ka
     <b>untrusted</b> code, har server par, baaki sabke traffic ke bilkul bagal mein.</p>
     <table>
       <tr><th>Option</th><th>Deewar</th><th>Cold start</th><th>Memory</th></tr>
       <tr><td>Virtual machine</td><td>sabse majboot</td><td>second</td><td>bahut zyada</td></tr>
       <tr><td>Container</td><td>halki</td><td>sau ms</td><td>dasiyon MB</td></tr>
       <tr><td><b>V8 isolate</b></td><td>wahi jo Chrome tabs ke beech hai</td><td><b>kuch ms</b></td><td><b>kuch MB</b></td></tr>
     </table>
     <p>Cloudflare ke apne numbers: isolate container se lagbhag <b>100× tez</b> start
     hota hai aur <b>1/10 memory</b> leta hai. Asli wajah <b>density</b> hai — agar har
     worker sau MB khaaye toh ek server par kuch hi aayenge; kuch MB par hazaron rah
     sakte hain. Isi liye worker publish karne par woh <b>poore fleet</b> par chala
     jaata hai — "kaunse region mein chalayein" wala sawaal hi khatam.</p>
     <h3>🔥 Cold start ko chhupana</h3>
     <p>Jab browser TLS connection kholta hai, uska pehla message (ClientHello) mein
     <b>SNI</b> hota hai — yaani hostname. Handshake abhi poora nahi hua, HTTP request
     abhi bani hi nahi, par Cloudflare ko pata chal chuka hai ki kaunsa worker chahiye.
     Toh woh handshake ke dauraan hi isolate load karna shuru kar deta hai. Jab tak
     pehli HTTP request aati hai, worker garam hai.</p>
     <p class="tip">🎯 Cold start gayab nahi hua — woh us latency ke <b>andar chhup
     gaya</b> jo connection pehle se de raha tha. Yeh chaal sirf usi ko milti hai jo
     internet ke edge par baitha ho.</p>`,
    `<h3>🕰️ Spectre — aur "ghadi hi hata do" wala jawab</h3>
     <p>2018 mein Spectre aaya: yeh JavaScript ka bug nahi tha, <b>CPU</b> ka tha. Modern
     processor speculative execution karte hain — agla kaam andaze se pehle hi shuru kar
     dete hain. Andaza galat nikla toh result phenk diya jaata hai, par kuch nishaan CPU
     cache mein reh jaate hain. Attacker bahut chhote timing differences naap kar woh
     nishaan padh sakta hai.</p>
     <p>Industry ka jawab tha: har tenant ko alag process/VM do. Cloudflare Workers ka
     poora design ulta hai — hazaron isolates jaan-boojh kar ek hi process share karte
     hain. Toh Kenton Varda ne alag raasta liya:</p>
     <pre>Har Spectre attack ek TIMING attack hai.
Har timing attack ko ek GHADI chahiye.
   →  ghadi hi hata do.</pre>
     <table>
       <tr><th>Attacker ko chahiye</th><th>Workers mein kya hai</th></tr>
       <tr><td>Precise timer</td><td><code>Date.now()</code> tumhara code chalte waqt aage badhta hi nahi — sirf I/O par badalta hai</td></tr>
       <tr><td>Counter thread se apni ghadi banana</td><td>Na threads, na shared memory, na SharedArrayBuffer</td></tr>
       <tr><td>Remote server se time</td><td>Network RTT dasiyon ms ka hai — nanosecond ka signal usme doob jaata hai</td></tr>
     </table>
     <p>Yeh Spectre ko theoretically impossible nahi banata — bas itna dheema kar deta
     hai ki woh attack rehta hi nahi. Upar se safety net: koi worker Spectre jaisa
     vyavhaar dikhaye toh usse uske apne OS process mein alag kar diya jaata hai. Aur
     kyunki engine Google ka V8 hai, V8 ka har security fix ghanton mein poore fleet par
     chala jaata hai.</p>`,
    `<h3>🩸 Cloudbleed — shared-everything ka sabse bura din</h3>
     <p>Feb 2017: Google Project Zero ke Tavis Ormandy ne bataya ki Cloudflare ke edge
     software se server memory ke tukde HTTP responses mein leak ho rahe hain. Bug ek
     <b>C</b> HTML parser mein tha jo pages rewrite karne wale features use karte the;
     kuch kharab pages par woh apne buffer se aage padh jaata tha.</p>
     <p>Shared-everything architecture mein iska matlab bhayanak tha: jo memory ek
     customer ki request ke bagal mein padi thi, woh <b>kisi aur customer</b> ki ho
     sakti thi — cookies, auth tokens, POST body ke tukde. Aur kuch responses search
     engines ne cache kar liye, yaani leak hua data public ho gaya.</p>
     <p>Uske baad Cloudflare ne request path ka naya code <b>Rust</b> mein likhna shuru
     kiya. Sabse bada example <b>Pingora</b> hai — origin ki taraf nginx ki jagah
     (production 2022, open source 2024).</p>
     <pre>nginx:   kai independent worker processes, HAR EK ka apna connection pool
         → worker A ka garam connection worker B use nahi kar sakta
         → roz laakhon bekaar TCP + TLS handshakes

Pingora: ek multi-threaded process, EK shared connection pool
         → 8 trillion requests/din · ~70% kam CPU · ~2/3 kam memory</pre>
     <h3>🗺️ Argo aur keyless SSL — do aur ulte faisle</h3>
     <p><b>Argo:</b> BGP <b>valid</b> raasta dhoondhta hai, <b>tez</b> raasta nahi —
     usse latency aur congestion dikhte hi nahi. Cloudflare ke paas har second arabon
     requests ka live data hai, yaani internet ka asli latency map. Argo us map se abhi
     ka sabse tez raasta chunta hai, chahe iske liye request ko pehle Cloudflare ke
     kisi doosre sheher se guzarna pade. Beta ke 50,000 customers par average latency
     <b>~35% kam</b> aur connection timeouts <b>~27% kam</b>; OkCupid ko ek line code
     badle bina <b>36%</b> kam latency mili.</p>
     <p><b>Keyless SSL:</b> bank apni TLS private key kisi ko nahi de sakta. Insight yeh
     thi ki private key sirf handshake ke <b>ek</b> cryptographic operation mein chahiye.
     Toh Cloudflare poora handshake edge par karta hai aur sirf woh ek operation customer
     ke key server par bhejta hai (mTLS ke andar). Keemat: har naye handshake par ek
     extra round trip (session resumption par nahi), aur key server critical path par —
     isliye use stateless banaya gaya taaki kai instances load balancer ke peechhe chal
     sakein.</p>
     <p class="tip">🎯 Keyless SSL poori video ka apna pattern todta hai: har cheez "sab
     jagah copy karo" thi, yeh "ek hi jagah rakho aur round trip ki keemat do" hai.</p>
     <h3>📍 Durable objects — jab copy karna galat jawab ho</h3>
     <p>Workers KV duniya bhar replicate hota hai aur eventually consistent hai — read
     heavy cheezon ke liye badhiya. Par chat room, game lobby ya collaborative document
     mein hazaron log <b>ek hi state</b> badalte hain. Wahan copies nahi, <b>ek maalik</b>
     chahiye.</p>
     <p>Durable object = code + uski apni private storage, aur poori duniya mein uske
     ek hi instance ka hona. Us object id ki har request wahin jaati hai aur requests
     ek ke baad ek chalti hain. Na consensus, na quorum, na conflict resolution —
     reconcile karne ke liye doosri copy hai hi nahi. (Yeh Erlang wala actor model hi
     hai, JavaScript mein.)</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Multi-tenant edge runtime design karo',
      instructions: 'Har slot mein ek option chuno. Review par sab options ka tark khulega.',
      brief: `Tumhe ek platform banana hai jahan <b>laakhon</b> customers apna code
        upload karke edge par chala sakein. Har request 50 ms se kam mein jawab de,
        aur ek customer doosre ka data kabhi na dekh paaye.`,
      requirements: [
        'Ek server par hazaron tenants aane chahiye',
        'Cold start user ko dikhe nahi',
        'Ek tenant doosre ki memory na padh paaye',
        'Shared state wali features (chat room) bhi chahiye',
      ],
      pass: 11,
      slots: [
        {
          id: 'sandbox', label: 'Isolation ka tareeka', icon: '📦',
          options: [
            { id: 'isolate', label: 'V8 isolates — ek process, hazaron isolates', score: 4, why: 'Density ka faisla: kuch ms start, kuch MB memory. Isi wajah se worker poore fleet par push kiya ja sakta hai. Keemat: shared process, isliye Spectre jaise CPU-level attacks par alag se sochna padta hai.' },
            { id: 'container', label: 'Har tenant ke liye container', score: 0, why: 'Chalega, par sau ms cold start aur dasiyon MB per tenant. Laakhon tenants ke liye density kaafi nahi.' },
            { id: 'vm', label: 'Har tenant ke liye VM', score: -3, why: 'Sabse majboot deewar par second-bhar ka start aur bahut saari RAM. Edge par jahan hazaron tenants chahiye, yeh raasta band hai.' },
          ],
        },
        {
          id: 'cold', label: 'Cold start ka kya karoge', icon: '🔥',
          options: [
            { id: 'sni', label: 'TLS handshake ke SNI se pata karke handshake ke dauraan hi load karna shuru karo', score: 4, why: 'Cold start gayab nahi hota, woh us latency ke andar chhup jaata hai jo connection pehle se de raha tha. Yeh sirf edge par baithe system ko milta hai.' },
            { id: 'warm', label: 'Har tenant ka ek instance hamesha garam rakho', score: -2, why: 'Laakhon tenants × hamesha garam = memory ka pahaad. Yahi cheez density ko maar deti hai.' },
            { id: 'accept', label: 'Cold start rehne do, 200 ms theek hai', score: -1, why: 'Kabhi-kabhi theek hai — par 50 ms ka SLO diya ho toh pehli request hamesha fail karegi.' },
          ],
        },
        {
          id: 'timing', label: 'CPU-level (Spectre jaisa) leak se bachav', icon: '🕰️',
          options: [
            { id: 'noclock', label: 'Sandbox se precise ghadi hata do (time I/O par hi badle, na threads, na shared memory)', score: 4, why: 'Har timing attack ko ghadi chahiye. Ghadi hatane se attack theoretically khatam nahi hota, bas itna dheema ho jaata hai ki attack rehta nahi.' },
            { id: 'process', label: 'Har tenant ko apna OS process do', score: 1, why: 'Sabse seedha jawab, par density khatam. Cloudflare isse safety net ki tarah use karta hai — sirf un workers ke liye jo shaq paida karein.' },
            { id: 'ignore', label: 'Yeh CPU vendor ki problem hai, hum kuch nahi kar sakte', score: -3, why: 'Shared-process runtime chalane wale ke liye yeh jawab nahi hai — tumhare hazaron tenants ek hi memory space share kar rahe hain.' },
          ],
        },
        {
          id: 'origin', label: 'Origin se connections', icon: '🔗',
          options: [
            { id: 'pool', label: 'Ek multi-threaded process, ek shared connection pool', score: 3, why: 'Pingora ka faisla: har thread wahi garam connection use kar sakta hai — laakhon bekaar TCP+TLS handshakes bach jaate hain (~70% kam CPU).' },
            { id: 'perworker', label: 'Har worker process ka apna pool', score: -2, why: 'nginx ka purana model: worker A ka garam connection worker B use nahi kar sakta. Har din laakhon extra handshakes.' },
            { id: 'nopool', label: 'Har request par nayi connection', score: -3, why: 'Har request par TCP + TLS — origin par bhi bhaar, edge par bhi.' },
          ],
        },
        {
          id: 'state', label: 'Shared mutable state (chat room)', icon: '📍',
          options: [
            { id: 'single', label: 'Ek object ka poori duniya mein ek hi instance — sab requests wahin, ek ke baad ek', score: 4, why: 'Durable object model. Ek hi copy hai toh conflict resolution, quorum aur consensus ki zaroorat hi nahi — ordering apne aap mil jaati hai.' },
            { id: 'kv', label: 'Eventually consistent KV har region mein', score: -3, why: 'Read-heavy data ke liye badhiya, par do log duniya ke do kono se ek hi counter badhayein toh yeh galat jawab deta hai.' },
            { id: 'consensus', label: 'Har chat room ke liye ek consensus group', score: 0, why: 'Sahi hai par mehenga: har write par quorum. Jab ek hi maalik se kaam ban raha ho toh consensus ka kharcha kyun dena.' },
          ],
        },
      ],
      verdicts: {
        great: '🎉 Yahi Workers ka design hai: isolates, handshake mein chhupa cold start, ghadi hatao, shared pool, aur shared state ke liye ek hi maalik.',
        ok: '👍 Chal jaayega, par ek-do jagah density ya safety ki keemat zyada hai. Review mein har option ka tark padho.',
        bad: '⚠️ Is design mein ya density nahi bachegi ya tenants ek doosre ko dekh lenge.',
      },
    },
    {
      type: 'bins',
      title: 'Sab jagah copy karo — ya ek hi jagah rakho?',
      instructions: 'Har cheez ko us model mein daalo jo Cloudflare ne uske liye chuna.',
      bins: [
        { id: 'copy', label: '🌍 Sab jagah copy (read local)' },
        { id: 'one', label: '📍 Ek hi jagah (ek maalik)' },
      ],
      items: [
        { text: 'Customer ki firewall rules aur DNS records', bin: 'copy', explain: 'Quicksilver har server par poora dataset rakhta hai — read ke waqt koi network call nahi.' },
        { text: 'Naya DDoS fingerprint', bin: 'copy', explain: 'Ek jagah seekha pattern seconds mein har server par — isi liye free tier ek sensor network ban jaata hai.' },
        { text: 'Bank ki TLS private key', bin: 'one', explain: 'Keyless SSL: key customer ke HSM mein hi rehti hai; Cloudflare sirf ek crypto operation wahan bhejta hai.' },
        { text: 'Ek chat room ka live state', bin: 'one', explain: 'Durable object: poori duniya mein ek instance, requests ek ke baad ek — na consensus, na conflict resolution.' },
        { text: 'Worker ka code', bin: 'copy', explain: 'Publish karte hi poore fleet par — isolates itne halke hain ki yeh mumkin hai.' },
        { text: 'Ek collaborative document ka counter', bin: 'one', explain: 'Eventually consistent KV yahan galat jawab dega — do log duniya ke do kono se ek hi value badha rahe hain.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — density, shared pool aur ek maalik',
      project: '02-cloudflare',
      exercise: 'ex4-isolates-pool',
      goal: 'Teen cheezein naapo: per-tenant memory, per-worker pool vs shared pool ke handshakes, aur ek counter ko do tareeke se badhana.',
      why: `Lab mein "tenant runtime" ke do modes hain (heavy = har tenant ka apna
        process-jaisa sandbox, light = ek process mein kai sandboxes), origin client ke
        do modes (per-worker pool aur shared pool), aur counter ke do modes (replicated
        vs single-owner).`,
      steps: [
        { text: 'Runtime aur origin chalao.', cmd: 'cd docker-labs/02-cloudflare && npm start ex4-isolates-pool', expect: 'ex4-isolates-pool\n  origin   → http://localhost:4231  (har nayi connection par ~3 ms handshake)\n  runtime  → http://localhost:4230  (SANDBOX=light)' },
        { text: 'Bhaari sandboxes ke saath 500 tenants load karo.', cmd: 'SANDBOX=heavy npm start ex4-isolates-pool && node tools/tenants.js --tenants 500', expect: 'SANDBOX=heavy → 500 tenants: rss 1113 MB   cold start p50: 10.3 ms' },
        { text: 'Ab halke isolates ke saath wahi.', cmd: 'SANDBOX=light npm start ex4-isolates-pool && node tools/tenants.js --tenants 500', expect: 'SANDBOX=light → 500 tenants: rss 117 MB   cold start p50: 0.1 ms' },
        { text: 'Origin connections gino (per-worker pool vs ek shared pool).', cmd: 'node tools/pool.js --workers 4 --requests 2000', expect: 'per-worker pools → tcp connects: 32   handshake time: 576 ms   reused: 1968\nshared pool      → tcp connects:  8   handshake time:  24 ms   reused: 1992' },
        { text: 'Counter test: 200 clients, dono models.', cmd: 'node tools/counter.js --clients 200', expect: 'replicated (eventual) → expected 200, got 26   replicas: [26,24,22]   ❌ lost updates\nsingle owner          → expected 200, got 200   ✅' },
      ],
      observe: {
        q: 'Replicated counter 200 mein se sirf 26 kyun gina (replicas: 26, 24, 22)?',
        choices: [
          'Kai replicas ne ek hi purani value padh kar +1 kiya — bina ek maalik ke ordering hai hi nahi',
          'Kuch requests fail ho gayin',
          'Counter ne rate limit laga di',
          'Network slow tha',
        ],
        answer: 0,
        explain: 'Replication read-heavy data ke liye hai. Jab hazaron log EK hi state badal rahe hon, tab ek authoritative owner chahiye — yahi durable object ka tark hai.',
      },
      lesson: 'Ek hi platform mein dono model chahiye: config aur code <b>sab jagah copy</b>, aur shared mutable state ka <b>ek maalik</b>.',
    },
  ],
  interview: {
    title: 'Interview Round — multi-tenant runtime',
    instructions: 'Teen sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Untrusted code chalane ke liye VM, container ya isolate?"',
        choices: [
          'Density ke hisaab se chuno: hazaron tenants per server chahiye toh isolates, par tab CPU-level side channels ka alag jawab dena padega',
          'Hamesha VM — security sabse zaroori hai',
          'Hamesha container — industry standard hai',
          'Isolate, kyunki woh sabse tez hai',
        ],
        answer: 0,
        explain: 'Cloudflare ne isolates density ke liye chune aur uski keemat (shared process) ka jawab alag se diya — ghadi hata kar.',
      },
      {
        q: 'Interviewer: "Cold start kaise kam karoge?"',
        choices: [
          'Dekho ki request se PEHLE koi aisa signal milta hai kya (TLS SNI, connection open) jisse kaam shuru kiya ja sake — cold start ko maujooda latency ke andar chhupao',
          'Har instance hamesha garam rakho',
          'Runtime ko C++ mein likho',
          'Cache laga do',
        ],
        answer: 0,
        explain: 'Cloudflare SNI se hi jaan leta hai ki kaunsa worker chahiye aur handshake ke dauraan hi isolate load karna shuru kar deta hai.',
      },
      {
        q: 'Interviewer: "Hazaron users ek hi document edit kar rahe hain. Design?"',
        choices: [
          'Us document ke liye ek authoritative owner rakho jahan saare writes serialize hon — replication read side ke liye',
          'Har region mein ek copy aur last-write-wins',
          'Har edit ke liye distributed transaction',
          'Client side mein merge kar lo',
        ],
        answer: 0,
        explain: 'Durable object ka core tark: ek hi copy hone se ordering muft milti hai aur reconcile karne ko kuch bachta hi nahi.',
      },
    ],
  },
  success: [
    'Main isolate/container/VM ka faisla density ke hisaab se le sakta hoon',
    'Main shared mutable state aur read-heavy state ko alag-alag treat kar sakta hoon',
    'Main connection pooling ka asli kharcha (handshakes) naap sakta hoon',
  ],
  homework: `<p>Apne system ki ek aisi state dhoondho jise kai log ek saath badalte hain
    (counter, seat map, inventory, document). Ab poochho: aaj uska <b>ek maalik</b> hai
    ya kai copies? Agar kai copies hain, toh likho ki do log ek saath badlein toh kya
    hoga.</p>`,
  cards: [
    { front: 'V8 isolate vs container?', back: 'Isolate: ek process, hazaron isolates, ~kuch ms start, ~kuch MB memory (container se ~100× tez start, ~1/10 memory). Isi density ki wajah se worker poore fleet par push hota hai.' },
    { front: 'Cold start kahan chhupa?', back: 'TLS ClientHello ke SNI se pata chal jaata hai kaunsa worker chahiye, isliye handshake ke dauraan hi isolate load hona shuru — pehli HTTP request tak worker garam.' },
    { front: 'Spectre ka Cloudflare wala jawab?', back: 'Har timing attack ko ghadi chahiye → ghadi hata do: Date.now() sirf I/O par badalta hai, na threads, na SharedArrayBuffer, remote clock ka RTT signal dubo deta hai. Shaq ho toh worker ko apne process mein alag kar do.' },
    { front: 'Pingora ne nginx se kya theek kiya?', back: 'nginx ke har worker process ka apna connection pool tha — ek ka garam connection doosra use nahi kar sakta tha. Pingora: ek multi-threaded process, ek shared pool → 8 trillion req/din, ~70% kam CPU.' },
    { front: 'Keyless SSL ka core insight?', back: 'Private key sirf handshake ke EK crypto operation mein chahiye. Woh operation customer ke HSM par bhejo, baaki handshake edge par — key kabhi customer ka infra nahi chhodti.' },
    { front: 'Durable object kya hai?', back: 'Code + uski private storage, poori duniya mein ek instance. Us id ki har request wahin jaati hai, ek ke baad ek — na consensus, na quorum, na conflict resolution.' },
  ],
},
]);

})();
