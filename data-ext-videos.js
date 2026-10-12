/* =====================================================================
   Videos jo PURANE topics ko gehra karti hain

   User ka faisla: jo topic pehle se app mein hai, uske liye naya level
   mat banao — purane level ko hi badhao (SD.extendLevel). Jo topic
   bilkul naya hai (consensus/Raft), woh apne sahi track mein ghusta hai.

     dist/scheduling  ← "Distributed JOB Scheduler" (Akhil Sharma)
     dist/locks       ← "Concurrency Control" (Shrayansh) — synchronized ki seema
     dist/contention  ← "Concurrency Control" — optimistic vs pessimistic ka faisla
     data/migrations  ← "Migrating 50TB at 100k RPS" (FAANG Senior Engineer)
     dist/consensus + dist/consensus-split (NAYE, clocks ke baad)
                      ← "Distributed Consensus & Raft" (System design from first principles 9/15)

   ⚠️ Yeh file data-gaps.js ke BAAD load honi chahiye — `clocks` level
   wahin register hota hai, aur registerLevelsAfter ko target chahiye.
   ===================================================================== */
(function () {

/* =====================================================================
   1. dist/scheduling — scheduler khud kaise na mare
   ===================================================================== */
SD.extendLevel('scheduling', {
  objectives: [
    '<b>Scheduler khud</b> kaise na mare — leader election, lock TTL aur split brain',
    'Exactly-once kyun namumkin hai, aur at-least-once + idempotent jobs ka raasta',
    'Priority lanes, <code>FOR UPDATE SKIP LOCKED</code>, heartbeat + watchdog',
  ],
  lesson: [
    `<h3>🌙 Raat 3 baje — cron wali machine mar gayi</h3>
     <p>Aadhi raat ko woh machine band ho gayi jis par cron chal raha tha. Teen ghante tak
     na billing jobs chale, na invoice emails gaye, na exports bane, na cleanup hua. Cron ne
     kisi ko nahi bataya — na retry, na alert. Subah 8 baje ek customer ka email aaya:
     "meri invoice kahan hai?"</p>
     <p>Seedha "ilaaj" — scheduler do machines par chala do — ulta dard deta hai: ab
     <b>dono</b> machines wahi billing job chalayengi → double charge, duplicate emails,
     galat aggregates. Tum do buraiyon ke beech phanse ho: <b>single point of failure</b>
     ek taraf, <b>duplicate execution</b> doosri taraf.</p>
     <h3>🧱 Pehla niyam: exactly-once namumkin hai</h3>
     <p>Worker ne aadha kaam kiya aur bataane se pehle mar gaya. Scheduler ko pata hi nahi ki
     job hua ya nahi. Dobara chalaya → duplicate. Nahi chalaya → job kho gaya. <b>Teesra
     raasta hai hi nahi.</b></p>
     <p>Jo mil sakta hai woh hai <b>at-least-once + idempotent jobs</b>: email wala job pehle
     poochhe "yeh email ja chuka hai?", invoice wala poochhe "yeh invoice process ho chuka
     hai?". Yeh maan lene ke baad design aasan ho jaata hai — ab tum duplicates ko kam karte
     ho aur failure ko sambhalte ho, "exactly once" ka peechha nahi karte.</p>
     <h3>💥 Single-node scheduler ke teen tareeke marne ke</h3>
     <table>
       <tr><th>Failure</th><th>Kya hota hai</th><th>Ilaaj</th></tr>
       <tr><td>Dead scheduler</td><td>Machine mari, koi job fire hi nahi hua</td><td>Kai scheduler nodes + <b>leader election</b></td></tr>
       <tr><td>Slow job</td><td>Har 5 min ka job 7 min chala → agla run pehle ke upar</td><td>Job lock + heartbeat — chalta hua job reschedule ko rokta hai</td></tr>
       <tr><td>Lost job</td><td>Worker shuru karke mar gaya, scheduler ne ack dekha aur "done" maan liya</td><td>Job tabhi complete jab <b>completion signal</b> aaye; heartbeat se progress</td></tr>
     </table>`,
    `<h3>👑 Leader election — TTL wala lock</h3>
     <p>Teen scheduler nodes, par scheduling faisle sirf ek leta hai. Baaki hot standby.</p>
     <pre>leader:   Redis/etcd mein lock rakhta hai — TTL 30 s, har 10 s par renew
          SET scheduler-leader nodeA NX PX 30000      ← NX = sirf tab jab koi aur na ho
standby:  lock dekhte rehte hain
leader mara → 30 s baad lock expire → standbys race karte hain → ek jeet-ta hai</pre>
     <p><b>Failover ka waqt = lock ka TTL.</b> Chhota rakho, par itna chhota nahi ki ek
     network blip par leader badalta rahe.</p>
     <p class="tip">🎯 Sabse aam galti: jab renewal fail ho, purana leader <b>turant</b>
     scheduling band kare. Jo node abhi bhi khud ko leader samajh raha hai jabki naya leader
     ban chuka hai — wahi duplicate execution paida karta hai. (Yahi fencing token wala dard
     hai jo Locks level mein hai.)</p>
     <h3>🧾 Ek hi leader bhi do baar chala sakta hai</h3>
     <p>Clock skew, network retry, ya scheduling loop ka race — same leader bhi ek job do baar
     fire kar sakta hai. Ilaaj: har scheduled execution ki <b>idempotency key</b> =
     <code>hash(job_id + schedule window)</code>. Execution record insert karo; duplicate
     unique constraint se takra kar gir jaata hai (<code>ON CONFLICT DO NOTHING</code>).
     Window zaroori hai — dedupe <b>ek window ke andar</b> hota hai, hamesha ke liye nahi;
     agle ghante wahi job phir chalna chahiye.</p>
     <h3>🚦 Priority lanes + SKIP LOCKED</h3>
     <p>Backlog saaf hone ke baad flat queue mein critical billing job 500 thumbnail tasks ke
     peechhe phans jaata hai — flat queue mein <b>aane ka kram</b> decide karta hai, priority
     queue mein <b>ahmiyat</b>. Ek hi <code>jobs</code> table, priority column, aur worker poll:</p>
     <pre>SELECT id FROM jobs
 WHERE status = 'pending' AND run_at &lt;= now()
 ORDER BY priority, run_at
 LIMIT 1
 FOR UPDATE SKIP LOCKED;      ← kai workers bina takrav, koi do ek hi row nahi uthaate</pre>
     <h3>💓 Heartbeat + watchdog</h3>
     <p>Worker job ke beech mar gaya → row hamesha <code>status='running'</code> par atki.
     Isliye worker har 10 s par <code>last_heartbeat</code> update karta hai, aur ek
     <b>watchdog</b> har minute dekhta hai: <code>running</code> hai par heartbeat 60 s se
     purana? → wapas <code>pending</code>, <code>attempt_count + 1</code>. 60 s vs 10 s ka
     matlab 5 heartbeat chhootne ki chhoot — dheeme par zinda worker ko maara nahi jaata.
     <code>max_attempts</code> par pahunche toh dead letter.</p>
     <p class="tip">🎯 Kab yeh design kaafi nahi: 4 ghante ka job jisme checkpoints chahiye,
     10,000 sub-tasks ka fan-out/aggregate (Temporal, Step Functions), ya external API calls ki
     zanjeer jisme compensation chahiye (saga). Baaki cron-style kaam ke liye yahi kaafi hai —
     aur sabse mushkil hissa code nahi, <b>har job ko pehle din se idempotent banana</b> hai.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — raat 3 baje ka cron',
      instructions: 'Timeline chalao. Jahan sawaal aaye wahan rukega.',
      incident: 'Cron machine down — ek aam SaaS ki raat',
      goal: 'Dekho single scheduler kaise chupchaap marta hai, aur "do scheduler" wala jaldbaazi ka ilaaj kya karta hai.',
      speedMs: 1800,
      metrics: [
        { id: 'missed', label: 'Chhoote hue jobs', unit: '', max: 400, dir: 'lower' },
        { id: 'dup', label: 'Duplicate charges', unit: '', max: 200, dir: 'lower' },
      ],
      frames: [
        { t: '00:00', event: 'Ek hi machine par cron. Billing, invoices, exports, cleanup — sab wahin.', metrics: { missed: 0, dup: 0 } },
        { t: '00:07', event: 'Machine ki disk mar gayi. Cron process gaya. <b>Koi alert nahi.</b>', metrics: { missed: 4, dup: 0 }, tone: 'bad' },
        { t: '03:00', event: 'Teen ghante se koi job nahi chala.', metrics: { missed: 180, dup: 0 }, tone: 'bad',
          ask: { q: 'Is sthiti ka sabse bada system-design sabak kya hai?',
                 choices: [
                   'Scheduler khud ek single point of failure hai — aur uska marna chupchaap hota hai, isliye "job chala ya nahi" ka alag monitor chahiye',
                   'Disk better leni chahiye thi',
                   'Cron purani technology hai',
                   'Jobs kam karne chahiye the',
                 ], answer: 0,
                 explain: 'Machine kabhi bhi mar sakti hai. Asli galti yeh thi ki na koi standby tha, na koi "job pichhle 15 minute mein chala?" wala alert.',
                 wrongHints: ['Behtar disk bhi marti hai — sawaal yeh hai ki marne par kya hota hai.', 'Technology se farq nahi padta, design se padta hai.', 'Jobs zaroori the — invoices bhejni hi thin.'] } },
        { t: '08:00', event: 'Customer email: "meri invoice kahan hai?" Team ne jaldi mein <b>doosri machine par bhi</b> cron chala diya.', metrics: { missed: 320, dup: 0 }, tone: 'warn' },
        { t: '09:00', event: 'Ab dono machines ek hi billing job chala rahi hain.', metrics: { missed: 320, dup: 140 }, tone: 'bad',
          ask: { q: 'Duplicate charges rokne ke liye sabse sahi combination?',
                 choices: [
                   'Leader election (TTL lock, renewal fail par turant ruk jaana) + har execution ki idempotency key + idempotent billing job',
                   'Doosri machine band kar do, ek hi rakho',
                   'Billing job ko dheere chalao',
                   'Dono machines ke clock sync kar do',
                 ], answer: 0,
                 explain: 'Leader election do schedulers ko rokta hai, idempotency key ek leader ke double fire ko, aur idempotent job us bache hue kone ko jahan dono fail ho jaayein.',
                 wrongHints: ['Ek machine = wahi single point of failure jisse shuru hua tha.', 'Speed se duplicate nahi rukta.', 'Clock sync se dono schedulers ek hi waqt par ek hi kaam karenge — aur saaf duplicate.'] } },
        { t: 'Fix', event: 'Teen scheduler nodes, Redis lock (TTL 30 s), idempotency key per window, heartbeat + watchdog. Chhoote jobs wapas chale, <b>kisi ka double charge nahi</b>.', metrics: { missed: 0, dup: 0 }, tone: 'ok' },
      ],
      lesson: 'Scheduler ka design do buraiyon ke beech ka santulan hai: <b>kabhi na chalna</b> (single point of failure) aur <b>do baar chalna</b> (duplicate). Leader election pehla rokta hai, idempotency doosra.',
    },
    {
      type: 'tradeoff',
      title: 'Lease lab — TTL, renew aur watchdog',
      instructions: 'Teen timers ghumao. Failover ka waqt, false failover aur duplicate risk dekho.',
      goal: 'Aisi setting dhoondho jahan leader marne par failover <b>45 s se kam</b> ho, network blips par <b>bekaar leader change na ho</b>, aur dheema (par zinda) worker <b>maara na jaaye</b>.',
      scenario: `Network mein kabhi-kabhi <b>8 second</b> tak ke blips aate hain. Kuch jobs
        <b>40 second</b> tak GC pause ya bhaari query mein atak jaate hain par zinda rehte hain.`,
      knobs: [
        { id: 'ttl', label: 'Leader lock TTL', min: 5, max: 90, step: 5, value: 5, unit: ' s', note: 'Failover ka waqt = TTL.' },
        { id: 'renew', label: 'Renew har kitne second', min: 2, max: 30, step: 1, value: 4, unit: ' s', note: 'TTL ke andar kam se kam 2-3 renew hone chahiye.' },
        { id: 'watch', label: 'Watchdog timeout (heartbeat har 10 s)', min: 20, max: 180, step: 10, value: 20, unit: ' s', note: '40 s tak atakne wale zinda workers ka dhyan rakho.' },
      ],
      readouts: k => {
        const m = leaseModel(k);
        return [
          { label: 'Leader failover', value: k.ttl + ' s', tone: k.ttl <= 45 ? 'ok' : 'bad' },
          { label: 'Blip par bekaar leader change', value: m.flap ? 'haan' : 'nahi', tone: m.flap ? 'bad' : 'ok' },
          { label: 'Zinda worker ko maara (duplicate job)', value: m.killLive ? 'haan' : 'nahi', tone: m.killLive ? 'bad' : 'ok' },
          { label: 'Mare worker ka job wapas aane mein', value: k.watch + ' s', tone: k.watch <= 120 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = leaseModel(k);
        return [
          { label: 'Failover', pct: Math.min(100, (k.ttl / 90) * 100), text: k.ttl + ' s', tone: k.ttl <= 45 ? 'ok' : 'bad' },
          { label: 'Renew margin (TTL ÷ renew)', pct: Math.min(100, (m.margin / 6) * 100), text: m.margin.toFixed(1) + '×', tone: m.margin >= 2.5 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = leaseModel(k);
        if (m.flap) return { ok: false, text: `TTL <b>${k.ttl} s</b> aur renew har <b>${k.renew} s</b> — 8 s ke blip mein renewals chhoot jaate hain aur lock expire ho jaata hai. Leader bina wajah badlega aur beech mein do leader ho sakte hain.` };
        if (m.killLive) return { ok: false, text: `Watchdog <b>${k.watch} s</b> par maar deta hai, par kuch zinda jobs 40 s atakte hain — woh jobs dobara chalenge (duplicate).` };
        if (k.ttl > 45) return { ok: false, text: `Sab safe hai par leader marne par <b>${k.ttl} s</b> tak koi scheduling nahi hogi.` };
        return { ok: true, text: `Balance: TTL <b>${k.ttl} s</b> (failover), renew har <b>${k.renew} s</b> (${m.margin.toFixed(1)}× margin), watchdog <b>${k.watch} s</b>.` };
      },
      check: k => { const m = leaseModel(k); return !m.flap && !m.killLive && k.ttl <= 45; },
      lesson: 'Har lease-based system ke teen number hote hain: <b>TTL</b> (kitni der mein failover), <b>renew interval</b> (blip se kitna margin), aur <b>watchdog</b> (dheema vs mara hua). Teeno ko ek saath socho.',
      quiz: {
        q: 'Renew fail hone par purana leader kya kare?',
        choices: ['Turant scheduling band kare — naya leader ban chuka ho sakta hai', 'Agla renew try kare aur tab tak scheduling chalu rakhe', 'Lock ka TTL badha de', 'Doosre nodes ko message bheje'],
        answer: 0,
        explain: 'Khud ko leader samajhne wala purana node hi duplicate execution ka sabse bada source hai.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — leader election, idempotency aur watchdog',
      project: '08-scheduler',
      exercise: 'ex1-leader-election',
      goal: 'Teen scheduler nodes chalao, leader maaro, failover ka waqt naapo; phir dekho ki "zombie" leader bina fencing ke duplicate kaise banata hai, aur idempotency key usse kaise rokti hai.',
      why: `Lab mein ek chhota lock server (Redis jaisa, TTL ke saath), teen schedulers aur ek
        "billing" sink hai jo har charge ginta hai. Worker pool <code>SKIP LOCKED</code> jaisa
        claim karta hai, heartbeat bhejta hai, aur watchdog atke jobs wapas laata hai.`,
      steps: [
        { text: 'Teen schedulers + lock server (TTL 6 s) + billing chalao.', cmd: 'cd docker-labs/08-scheduler && npm start ex1-leader-election', expect: 'ex1-leader-election\n  lock-server → http://localhost:4801\n  billing     → http://localhost:4802  (IDEMP=0)\n  scheduler-a/b/c → 4811/4812/4813  (TTL 6000 ms · renew 2000 ms · STOP_ON_LOSS=1)\n  [b] LEADER bana (term 1)' },
        { text: 'Leader maaro aur failover naapo.', cmd: 'node tools/kill-leader.js', expect: 'leader: scheduler-b (term 1)\nscheduler-b maara → naya leader scheduler-a (term 2) 5.6 s mein   (TTL ke aas-paas)\nbilling: windows 5   double-charged: 0' },
        { text: 'Bug wala mode: renew fail hone par bhi purana leader chalta rahe. Leader ko 9 s ka "GC pause" do.', cmd: 'STOP_ON_LOSS=0 npm start ex1-leader-election && node tools/zombie.js', expect: 'khud ko leader maanne wale: a, b   lock holder: a\nbilling (IDEMP=0): windows 14   double-charged: 8   idempotency key ne roke: 0' },
        { text: 'Wahi bug, par billing mein idempotency key on.', cmd: 'STOP_ON_LOSS=0 IDEMP=1 npm start ex1-leader-election && node tools/zombie.js', expect: 'khud ko leader maanne wale: a, c   lock holder: c\nbilling (IDEMP=1): windows 15   double-charged: 0   idempotency key ne roke: 8' },
        { text: 'Ab sahi mode (STOP_ON_LOSS=1) bina idempotency ke.', cmd: 'STOP_ON_LOSS=1 npm start ex1-leader-election && node tools/zombie.js', expect: '[a] renew fail → scheduling BAND\nkhud ko leader maanne wale: b   lock holder: b\nbilling (IDEMP=0): windows 16   double-charged: 1' },
        { text: 'Bonus (ex2): priority lanes + worker crash + poison job + watchdog.', cmd: 'npm start ex2-heartbeat-watchdog && node tools/watchdog-run.js', expect: '💥 worker-w1 job 14 ke beech mara (heartbeat band)\nQUEUE=priority   pehle 5 complete: critical, critical, critical, high, high\ndone: 29   dead letter: 1   watchdog ne wapas daale: 3   dobara chale: 2' },
      ],
      observe: {
        q: 'STOP_ON_LOSS=1 (sahi mode) ke baad bhi ek double charge hua. Kyun, aur ilaaj kya hai?',
        choices: [
          'Pause se jaagne aur agle renew check ke beech ek chhoti khidki hai jisme purana node khud ko leader samajhta hai — isliye leader election ke saath idempotency key (ya fencing token) bhi chahiye',
          'Lock server mein bug hai',
          'TTL bahut bada tha',
          'Billing service ne galti se do baar likha',
        ],
        answer: 0,
        explain: 'Leader election kabhi 100% nahi hota — zombie leader ki khidki hamesha rehti hai. Output mein IDEMP=1 ne wahi 8 duplicates ko rok diya. Isi liye Locks level ka fencing token aur yahan ki idempotency key dono zaroori hain.',
      },
      lesson: 'Leader election <b>zyadatar</b> duplicates rokta hai; idempotency key <b>baaki</b> rokti hai. Dono saath chahiye.',
    },
  ],
  interview: [
    {
      q: 'Interviewer: "Distributed cron design karo — koi job miss na ho aur double na chale."',
      choices: [
        'Kai scheduler nodes + TTL lock se leader election (renewal fail par turant ruko), har execution ki idempotency key, idempotent jobs, heartbeat + watchdog se atke jobs wapas',
        'Ek bada reliable server aur uska backup',
        'Har node par cron, aur database mein "last run" check',
        'Kafka par sab jobs daal do',
      ],
      answer: 0,
      explain: 'Har hissa ek alag failure mode ka jawab hai — dead scheduler, double fire, aur lost job.',
    },
    {
      q: 'Interviewer: "Exactly-once guarantee de sakte ho?"',
      choices: [
        'Nahi — worker kaam karke bataane se pehle mar sakta hai. At-least-once + idempotent jobs hi practical guarantee hai',
        'Haan, transactions se',
        'Haan, Kafka exactly-once se',
        'Haan, agar retries band kar do',
      ],
      answer: 0,
      explain: 'Retries band karne se at-most-once milta hai (jobs khoenge). Exactly-once side-effects ke liye idempotency hi raasta hai.',
    },
  ],
  success: [
    'Main scheduler ke teen failure modes aur unke ilaaj bata sakta hoon',
    'Main lease TTL, renew aur watchdog timeout ko saath mein tune kar sakta hoon',
  ],
  cards: [
    { front: 'Scheduler ke teen failure modes?', back: '(1) dead scheduler → leader election, (2) slow job overlap → job lock + heartbeat, (3) lost job (shuru karke mara) → complete sirf completion signal par + watchdog.' },
    { front: 'Leader election ka failover time?', back: 'Lock ka TTL. Leader 30 s TTL rakh kar har 10 s renew karta hai; mara toh 30 s baad standby lock le leta hai. Renewal fail hote hi purana leader turant ruk jaaye.' },
    { front: 'Scheduled job ki idempotency key?', back: 'hash(job_id + schedule window) — execution record par unique constraint; duplicate ON CONFLICT DO NOTHING se gir jaata hai. Window ke andar dedupe, hamesha ke liye nahi.' },
    { front: 'Watchdog kaise kaam karta hai?', back: 'Worker har 10 s heartbeat likhta hai; watchdog har minute running + heartbeat > 60 s wali rows ko pending karta hai aur attempt_count badhata hai. max_attempts par dead letter.' },
  ],
  homework: `<p><b>Naya (video se):</b> apne cron jobs ki list banao aur har ek ke saamne
    likho — agar yeh job aaj do baar chal jaaye toh kya hoga? Jahan jawab "double charge"
    ya "double email" hai, wahan pehle idempotency, phir hi high availability.</p>`,
});

function leaseModel(k) {
  const margin = k.ttl / k.renew;
  const flap = margin < 2.5 || k.ttl <= 8;          /* 8 s blip TTL ke andar do renewals kha jaaye */
  const killLive = k.watch <= 40;                   /* 40 s atakne wale zinda job maare jaayenge */
  return { margin, flap, killLive };
}

/* =====================================================================
   2. dist/locks — synchronized ek hi process tak
   ===================================================================== */
SD.extendLevel('locks', {
  lesson: [
    `<h3>🧵 "synchronized laga do" — ek process tak hi</h3>
     <p>Low-level design interview mein seat booking ka sawaal aata hai: teen users ek hi seat
     book karte hain. Teeno <code>free</code> padhte hain, teeno <code>booked</code> likhte
     hain, teeno ko success — ek seat teen baar biki. Pehla jawab hota hai: critical section
     par <code>synchronized</code> (ya mutex) laga do.</p>
     <p>Ek process ke threads ke liye yeh sahi hai. Par service teen machines par chal rahi hai,
     load balancer ke peechhe — ab teen <b>alag processes</b> ek saath critical section mein hain,
     aur har process ka lock sirf apne threads ko rokta hai. Language-level lock distributed
     system mein <b>kuch nahi rokta</b>.</p>
     <p>Yahan se do raaste hain: <b>database ka lock/version</b> (jo sab processes share karte
     hain — Contention level) ya <b>distributed lock</b> (upar ka fencing wala sabak). Aur sahi
     shabd bhi yaad rakho: <b>optimistic/pessimistic concurrency control</b> — "locking" roz ki
     bol-chaal hai.</p>`,
  ],
  stages: [
    {
      type: 'quiz',
      title: 'synchronized kahan tak bachata hai?',
      questions: [
        {
          q: 'Booking service 3 machines par hai. Code mein critical section par synchronized hai. Double booking hogi?',
          choices: ['Haan — har machine ka lock sirf apne process ke threads ko rokta hai', 'Nahi, synchronized sab rokta hai', 'Sirf tab jab machines alag region mein hon', 'Sirf high load par'],
          answer: 0,
          explain: 'Teen processes = teen alag locks. Shared cheez (database row) par lock ya version chahiye.',
        },
        {
          q: 'Double booking rokne ka sabse seedha tareeka jab data ek database mein ho?',
          choices: ['Database ke andar — SELECT ... FOR UPDATE ya version column ke saath conditional UPDATE', 'Har machine par bada synchronized block', 'Ek hi machine par service chalao', 'Client side par button disable karo'],
          answer: 0,
          explain: 'Jo cheez sab processes share karte hain (DB row), wahi lock ya version ka sahi ghar hai. SQL Gurukul ke Database Internals track mein yeh asli MySQL/Postgres par chalta hai.',
        },
      ],
    },
  ],
  cards: [
    { front: 'synchronized distributed system mein kyun fail hota hai?', back: 'Woh sirf ek process ke threads ko rokta hai. Teen machines = teen processes = teen alag locks. Shared resource (DB row) par lock/version chahiye.' },
  ],
});

/* =====================================================================
   3. dist/contention — optimistic vs pessimistic ka asli faisla
   ===================================================================== */
SD.extendLevel('contention', {
  lesson: [
    `<h3>⚖️ Optimistic vs pessimistic — conflict rate faisla karta hai</h3>
     <p><b>Optimistic</b> (read committed par chalta hai): row padho aur uska <b>version</b> yaad
     rakho → kaam karo → likhte waqt check karo ki version wahi hai. Wahi hai → update +
     version + 1. Badal gaya → rollback aur <b>poora kaam dobara</b>.</p>
     <pre>UPDATE seats SET status = 'booked', version = version + 1
 WHERE id = 10 AND version = 7;      ← 0 rows affected = kisi aur ne pehle likh diya</pre>
     <p><b>Pessimistic</b> (repeatable read/serializable soch): locks transaction ke aakhir tak
     pakde rehte ho, isliye transactions line mein lagte hain. Aur ek naya khatra aata hai —
     <b>deadlock</b>:</p>
     <pre>T1: A padha (lock A) ... ab B likhna hai → B par T2 ka lock → ruka
T2: B padha (lock B) ... ab A likhna hai → A par T1 ka lock → ruka
→ dono hamesha ke liye ruke; engine ek ko maar kar rollback karta hai</pre>
     <p>Wahi workload optimistic par deadlock nahi karta — padhne ke baad locks turant chhoot
     jaate hain.</p>
     <table>
       <tr><th>Conflict kam (alag-alag rows)</th><th>Conflict zyada (ek hot row)</th></tr>
       <tr><td><b>Optimistic</b> — koi intezaar nahi, retry kabhi-kabhi</td><td><b>Pessimistic</b> — retry storm se line mein lagna sasta</td></tr>
     </table>
     <p class="tip">🎯 Video ki line: "optimistic hamesha best hai" — aisi raay kabhi mat rakho.
     Pehle poochho kaunsi anomaly manzoor hai (isolation level), phir conflict kitna hai.
     (Isolation levels aur anomalies asli MySQL/Postgres par SQL Gurukul ke 🔬 Database
     Internals track mein hain.)</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Optimistic vs pessimistic lab',
      instructions: 'Conflict rate aur tareeka badlo. Throughput, retries aur deadlocks dekho.',
      goal: 'Dono situations ke liye sahi tareeka chuno: aisi setting dhoondho jahan throughput <b>800/s se zyada</b> ho, retries <b>5% se kam</b> aur deadlocks <b>1% se kam</b> hon.',
      scenario: `Ek booking service. Kabhi traffic alag-alag seats par hota hai (conflict kam),
        kabhi ek hi hot event ki kuch seats par (conflict zyada).`,
      knobs: [
        { id: 'conflict', label: 'Conflict rate (kitne % transactions ek hi row par takraate hain)', min: 0, max: 60, step: 5, value: 40, unit: '%', note: 'Hot event par yeh bahut badh jaata hai.' },
        { id: 'mode', label: 'Tareeka (0 = optimistic/version · 1 = pessimistic/FOR UPDATE)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Optimistic = retry. Pessimistic = intezaar (aur deadlock ka khatra).' },
        { id: 'order', label: 'Locks ek hi kram mein lete ho? (0 = nahi · 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Sab transactions A pehle phir B — toh deadlock ka chakra ban hi nahi sakta.' },
      ],
      readouts: k => {
        const m = occModel(k);
        return [
          { label: 'Throughput', value: m.tps + '/s', tone: m.tps >= 800 ? 'ok' : 'bad' },
          { label: 'Retries (optimistic)', value: m.retryPct + '%', tone: m.retryPct <= 5 ? 'ok' : 'bad' },
          { label: 'Deadlocks (pessimistic)', value: m.deadPct + '%', tone: m.deadPct <= 1 ? 'ok' : 'bad' },
          { label: 'Lock ka intezaar', value: m.waitMs + ' ms', tone: m.waitMs <= 20 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = occModel(k);
        return [
          { label: 'Throughput', pct: Math.min(100, (m.tps / 1500) * 100), text: m.tps + '/s', tone: m.tps >= 800 ? 'ok' : 'bad' },
          { label: 'Wasted work', pct: Math.min(100, (m.retryPct + m.deadPct) * 2), text: (m.retryPct + m.deadPct) + '%', tone: (m.retryPct + m.deadPct) <= 5 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = occModel(k);
        if (k.mode === 0 && m.retryPct > 5) return { ok: false, text: `Conflict <b>${k.conflict}%</b> par optimistic mein <b>${m.retryPct}%</b> transactions dobara chal rahe hain — retry storm. Hot row par pessimistic sasta padta hai.` };
        if (k.mode === 1 && m.deadPct > 1) return { ok: false, text: `Pessimistic mein locks alag-alag kram mein liye ja rahe hain — <b>${m.deadPct}%</b> deadlocks. Sab transactions ek hi kram mein lock lein (jaise hamesha chhota id pehle).` };
        if (m.tps < 800) return { ok: false, text: `Throughput <b>${m.tps}/s</b> — conflict kam hai toh pessimistic ka intezaar bekaar hai; optimistic chuno.` };
        return { ok: true, text: `Sahi jodi: conflict <b>${k.conflict}%</b> par ${k.mode === 0 ? 'optimistic' : 'pessimistic (ordered locks ke saath)'} — throughput <b>${m.tps}/s</b>, wasted work <b>${m.retryPct + m.deadPct}%</b>.` };
      },
      check: k => { const m = occModel(k); return m.tps >= 800 && m.retryPct <= 5 && m.deadPct <= 1; },
      lesson: 'Faisla ek sawaal se: <b>kitne transactions ek hi row par takraate hain?</b> Kam → optimistic. Zyada → pessimistic, aur locks hamesha ek hi kram mein.',
      quiz: {
        q: 'Deadlock se bachne ka sabse sasta tareeka?',
        choices: ['Har transaction locks ek hi kram mein le (jaise id ke kram mein)', 'Lock timeout bahut bada kar do', 'Har transaction ko serializable kar do', 'Retry band kar do'],
        answer: 0,
        explain: 'Deadlock ek chakra hai — A ke baad B aur B ke baad A. Ek hi kram mein lock lene se chakra ban hi nahi sakta.',
      },
    },
  ],
  cards: [
    { front: 'Optimistic concurrency ka flow?', back: 'Row + version padho → kaam karo → UPDATE ... WHERE id=? AND version=? (version+1). 0 rows affected = kisi aur ne likh diya → rollback + retry. Deadlock nahi, par conflict par wasted work.' },
    { front: 'Pessimistic mein deadlock kaise banta hai?', back: 'T1 ne A lock kiya aur B chahiye; T2 ne B lock kiya aur A chahiye. Dono ruke. Engine ek ko rollback karta hai. Ilaaj: locks hamesha ek hi kram mein.' },
  ],
});

function occModel(k) {
  const c = k.conflict / 100;
  if (k.mode === 0) {
    const retryPct = Math.round(c * c * 100 * 1.1);              /* conflict jitna, retry us se tezi se badhta hai */
    const tps = Math.round(1400 * (1 - Math.min(0.9, retryPct / 100)));
    return { tps, retryPct, deadPct: 0, waitMs: 0 };
  }
  const deadPct = k.order ? 0 : Math.round(c * 20 * 10) / 10;
  const waitMs = Math.round(4 + c * 60);
  const tps = Math.round(1400 / (1 + c * 1.1) - (k.order ? 0 : deadPct * 20));
  return { tps, retryPct: 0, deadPct, waitMs };
}

/* =====================================================================
   4. data/migrations — 50 TB, 100k writes/second
   ===================================================================== */
SD.extendLevel('migrations', {
  objectives: [
    '<b>50 TB, 100k writes/sec</b> par migration ki physics — offline kyun namumkin',
    'Dual writes ka jaal, aur log (CDC) se replication',
    'Snapshot + log position, per-key ordering, idempotent events, shadow traffic, reverse CDC',
  ],
  lesson: [
    `<h3>🏋️ 50 TB, 100,000 writes/second — pehle physics</h3>
     <p>Ek monolith, 50 TB ka Oracle database, <b>1 lakh writes/second</b>. Kaam: microservices
     par le jao, <b>zero downtime, zero data loss</b>.</p>
     <pre>Offline dump: 10 Gbit link, poori tarah bhara (asal mein ho hi nahi sakta, disk I/O rokti hai)
   50 TB  →  lagbhag 11–12 ghante
   12 ghante × 1,00,000 writes/s  ≈  4.3 ARAB writes jo hue hi nahi
   → "yeh zero downtime nahi, company ka diwaaliya hai"</pre>
     <h3>🪤 Application-level dual writes — jaal</h3>
     <p>"App dono databases mein likh de" — sunne mein aasan. Par Oracle mein write safal,
     naye DB mein fail → ab do sach. Bina coordinator ke distributed transaction hai hi nahi
     (two generals). 100 ms ka network blip = <b>10,000</b> failed writes kisi buffer mein.
     Dual writes latency badhate hain, bugs laate hain, aur monolith ko aur naazuk banate hain.</p>
     <p class="tip">🎯 Ilaaj ka siddhant: <b>write hone ki ghatna ko data ke replication se alag
     karo</b>.</p>
     <h3>🪵 Log hi sach hai</h3>
     <p>Jay Kreps ka "The Log": jo table tum SQL se padhte ho woh ek <b>derived view</b> hai.
     Sach transaction log hai — Oracle ka redo log, Postgres ka WAL, MySQL ka binlog. Woh 1 lakh
     writes/second bas ek file mein appends hain. <b>Wahi stream poori strategy hai.</b></p>
     <pre>Debezium (CDC) → khud ko REPLICA dikhata hai, redo log tail karta hai (user ki tarah query nahi)
             → har change JSON/Avro event → KAFKA (100k/s ka dabaav sokhne wala durable buffer)
             → naya service apni raftaar se padhta hai</pre>`,
    `<h3>📸 50 TB ka itihaas kaise jaaye — snapshot + log position</h3>
     <p>Log mein sirf naye changes hain. Purana 50 TB? Debezium ka initial snapshot tables ko
     chunk-by-chunk padhta hai <b>aur saath mein yaad rakhta hai ki log mein woh kahan tha</b>.
     Snapshot mein din lagte hain; us dauraan naye writes Kafka mein jama hote rehte hain.
     Snapshot khatam → naya DB base data ke saath (par din bhar purana) → consumer <b>usi log
     position se</b> replay shuru karta hai jahan snapshot shuru hua tha → dheere-dheere "abhi"
     tak — master se ~500 ms peechhe.</p>
     <h3>🔢 Do details jo log bhool jaate hain</h3>
     <p><b>Ordering:</b> ek consumer 1 lakh/s nahi sambhal sakta → Kafka partitions. Par user A
     ne pehle profile badla aur phir password — yeh kram nahi tootna chahiye. Isliye <b>user id
     se partition karo</b>: ek user ke saare events ek partition mein, 100 consumers parallel.</p>
     <p><b>Idempotency:</b> Kafka ek message do baar de sakta hai. "balance = 50" do baar —
     theek. "balance mein se 10 ghatao" do baar — aafat. Isliye jahan ho sake <b>poori row ki
     state</b> bhejo, delta nahi.</p>
     <h3>🌿 Passengers ko shift karna — strangler + shadow</h3>
     <pre>1. Monolith ke aage proxy (Envoy/nginx) — shuru mein sab pass-through
2. SHADOW: proxy user ko monolith se jawab deta hai, aur usi request ki copy naye service
   ko async bhejta hai → (a) kya naya service 100k RPS jhel sakta hai? (b) jawab milte hain?
   monolith: balance 50, service: balance 0 → pipeline tooti hai — kisi user ko pata bhi nahi
3. Writes key se kaato: "user id 01 par khatam" → reads AUR writes naye service par
   1% → 10% → 50% → 100%. Ek user ke do master kabhi nahi.</pre>
     <p><b>Gotcha:</b> monolith ki koi purani report ya background job abhi bhi un 1% users ka
     data Oracle mein padhti hai — jo ab purana hai. Ilaaj: kuch waqt ke liye <b>reverse
     CDC</b> — naye DB se changes wapas Oracle mein. Galat lagta hai, par yeh ek asthaayi pul
     hai.</p>
     <p class="tip">🎯 Mindset: koi silver-bullet tool nahi ("bas Snowflake/CockroachDB le lo").
     Data ko <b>bucket nahi, stream</b> samjho. Har kadam <b>reversible</b> ho — proxy ka ek
     flag, milliseconds mein wapas. Aur Conway ka niyam: poori company ek team hai toh database
     bhi nahi tootega — ownership data ke saath bantni chahiye.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — 50 TB ki physics',
      goal: 'Numbers se khud dekho ki offline migration kyun namumkin hai.',
      problems: [
        {
          q: '50 TB ko 10 Gbit/s link par (poori speed, 1.25 GB/s) bhejne mein kitne GHANTE lagenge?',
          unit: 'ghante', given: ['50 TB = 50,000 GB', '10 Gbit/s = 1.25 GB/s'],
          answer: 11.1, tol: 0.3,
          steps: ['50,000 / 1.25 = 40,000 second', '40,000 / 3,600 ≈ 11.1 ghante — aur asal mein disk I/O isse bhi dheema karegi'],
          lesson: 'Sabse achhe case mein bhi aadha din.',
        },
        {
          q: 'Us 12 ghante ke downtime mein 1 lakh writes/second ke hisaab se kitne writes chhoot jaayenge?',
          unit: 'writes', given: ['1,00,000 writes/s', '12 ghante = 43,200 s'],
          answer: 4.32e9, tol: 0.3,
          steps: ['1,00,000 × 43,200 = 4,32,00,00,000', '≈ 4.3 arab writes'],
          lesson: 'Isliye offline migration yahan option hi nahi hai.',
        },
        {
          q: 'App-level dual writes mein 100 ms ka network blip. Kitne writes fail/buffer honge?',
          unit: 'writes', given: ['1,00,000 writes/s', '0.1 s'],
          answer: 10000, tol: 0.3,
          steps: ['1,00,000 × 0.1 = 10,000', 'Har blip = 10,000 writes kisi buffer mein — aur do sach ka khatra'],
          lesson: 'Dual writes ka dard ek din ka nahi, har blip ka hai.',
        },
      ],
    },
    {
      type: 'tradeoff',
      title: 'CDC pipeline lab — partitions, consumers aur ordering',
      instructions: 'Partition key, partitions aur consumers ghumao. Lag aur ordering dono dekho.',
      goal: 'Aisi setting dhoondho jahan consumer lag <b>2 second se kam</b> ho aur <b>kisi user ke events ka kram na toote</b>.',
      scenario: `CDC se <b>1,00,000 events/second</b> aa rahe hain. Ek consumer lagbhag
        <b>4,000 events/second</b> process kar sakta hai.`,
      knobs: [
        { id: 'parts', label: 'Kafka partitions', min: 1, max: 64, step: 1, value: 4, unit: '', note: 'Consumers partitions se zyada ho toh bekaar baithte hain.' },
        { id: 'cons', label: 'Consumers', min: 1, max: 64, step: 1, value: 4, unit: '', note: 'Har consumer ~4,000 events/s.' },
        { id: 'key', label: 'Partition key (0 = random · 1 = user id)', min: 0, max: 1, step: 1, value: 0, unit: '', note: 'Random = barabar load, par ek user ke events alag partitions mein.' },
      ],
      readouts: k => {
        const m = cdcModel(k);
        return [
          { label: 'Kaam karne wale consumers', value: m.active + '', tone: 'ok' },
          { label: 'Throughput', value: (m.tput / 1000).toFixed(0) + 'k/s', tone: m.tput >= 100000 ? 'ok' : 'bad' },
          { label: 'Consumer lag', value: m.lag, tone: m.tput >= 100000 ? 'ok' : 'bad' },
          { label: 'Per-user ordering', value: k.key === 1 ? 'bani rahegi' : 'toot sakti hai', tone: k.key === 1 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = cdcModel(k);
        return [
          { label: 'Throughput vs 100k/s', pct: Math.min(100, m.tput / 1000), text: (m.tput / 1000).toFixed(0) + 'k/s', tone: m.tput >= 100000 ? 'ok' : 'bad' },
          { label: 'Idle consumers', pct: Math.min(100, ((k.cons - m.active) / Math.max(1, k.cons)) * 100), text: (k.cons - m.active) + '', tone: k.cons > k.parts ? 'warn' : 'ok' },
        ];
      },
      verdict: k => {
        const m = cdcModel(k);
        if (k.key === 0) return { ok: false, text: 'Random partitioning se load toh barabar hai, par ek user ke "profile update" aur "password change" alag partitions mein jaa kar ulte kram mein lag sakte hain. User id se partition karo.' };
        if (m.tput < 100000) return { ok: false, text: `Sirf <b>${m.active}</b> consumers kaam kar rahe hain (${k.parts} partitions, ${k.cons} consumers) — throughput <b>${(m.tput / 1000).toFixed(0)}k/s</b>, lag badhta ja raha hai. Partitions aur consumers dono badhao.` };
        return { ok: true, text: `Sahi: user id se <b>${k.parts}</b> partitions, <b>${m.active}</b> kaam karte consumers — ${(m.tput / 1000).toFixed(0)}k/s, lag kaabu mein, har user ka kram bana rahega.` };
      },
      check: k => { const m = cdcModel(k); return k.key === 1 && m.tput >= 100000; },
      lesson: 'Parallelism ki hadd <b>partitions</b> hain (consumers usse zyada ho toh bekaar), aur ordering ki hadd <b>partition key</b> hai. Dono ek saath tay karo.',
      quiz: {
        q: 'Kafka ek event do baar de de. Kaunsa event safe hai?',
        choices: ['"balance = 50" (poori state)', '"balance mein se 10 ghatao" (delta)', 'Dono', 'Koi nahi'],
        answer: 0,
        explain: 'State wala event idempotent hai; delta wala nahi. Isliye CDC mein jahan ho sake poori row ki state bhejo.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — dual writes vs CDC, snapshot + replay, shadow cutover',
      project: '10-migration',
      exercise: 'ex1-dual-write-vs-cdc',
      goal: 'Ek source DB par lagatar writes chalao; pehle app-level dual writes mein failure inject karo, phir CDC (log tail) se replicate karo — aur dono mein drift gino.',
      why: `Lab mein ek "source" DB hai (50,000 rows) jo har write ko ek append-only log mein bhi
        likhta hai (redo log / WAL jaisa), aur ek "target" DB. Teen raaste: app dual writes (2% fail,
        1% retry-duplicate), CDC jo poori row ki <b>state</b> bhejta hai, aur CDC jo sirf <b>delta</b>
        bhejta hai — dono CDC mein 10% batches dobara aate hain (Kafka at-least-once).`,
      steps: [
        { text: 'Source + target chalao.', cmd: 'cd docker-labs/10-migration && npm start ex1-dual-write-vs-cdc', expect: 'ex1-dual-write-vs-cdc\n  source → http://localhost:5001  (50,000 rows · append-only log)\n  target → http://localhost:5002  (khaali)' },
        { text: 'App dual writes: 8 s tak 400 writes/s, phir har row compare.', cmd: 'node tools/scenario.js dual', expect: 'backfill: 50000 rows target mein\n  writer → band: 3200 writes, target par fail 62, dobara 31\ncompare: source 50000 rows · target 50000 rows · missing 0 · galat balance 93  ❌ drift' },
        { text: 'CDC — snapshot + log tail, poori row ki state, 10% redelivery.', cmd: 'node tools/scenario.js cdc-state', expect: 'cdc → snapshot shuru (log position …), 50000 rows\ncdc → snapshot done, ab log tail usi position se\ncompare: source 50000 rows · target 50000 rows · missing 0 · galat balance 0  ✅ match' },
        { text: 'Wahi CDC par sirf delta events ke saath.', cmd: 'node tools/scenario.js cdc-delta', expect: 'compare: source 50000 rows · target 50000 rows · missing 0 · galat balance 280  ❌ drift' },
        { text: 'Bonus (ex2): shadow compare + 1% → 100% cutover + rollback.', cmd: 'npm start ex2-shadow-cutover && node tools/shadow.js', expect: 'shift   0%   source se: 1000   target se: 0      shadow compare: 1000   mismatch: 0\nshift   1%   source se: 990    target se: 10     mismatch: 0\nshift  50%   source se: 485    target se: 515    mismatch: 0\nshift 100%   source se: 0      target se: 1000\nrollback → shift 0%  (2 ms, ek flag)' },
      ],
      observe: {
        q: 'CDC state mode 10% redelivery ke baad bhi 0 galat raha, par CDC delta mode 280 galat. Farq kya hai?',
        choices: ['State event ("balance = X", version ke saath) dobara aaye toh purana version ignore ho jaata hai; delta ("10 ghatao") dobara aaye toh do baar lag jaata hai', 'Delta mode dheema hai', 'State mode mein kam events the', 'Delta mode ne snapshot nahi liya'],
        answer: 0,
        explain: 'At-least-once delivery ke saath sirf idempotent events safe hain. Isiliye video kehta hai: jahan ho sake poori row ki state bhejo. Aur dual write (93 galat) mein toh "dobara padhne" ka koi raasta hi nahi — har fail permanent farq hai.',
      },
    },
  ],
  interview: [
    {
      q: 'Interviewer: "50 TB, 100k writes/sec wale DB ko zero downtime ke saath migrate karo."',
      choices: [
        'CDC se log tail karo (Kafka buffer), snapshot + log position se history, user id se partition, idempotent state events, shadow traffic se compare, key-wise 1%→100% cutover, aur zaroorat ho toh reverse CDC — har kadam proxy flag se reversible',
        'Weekend par dump-restore',
        'App mein dual writes aur ek nightly reconcile job',
        'Naya DB lo jo apne aap migrate kar de',
      ],
      answer: 0,
      explain: 'Offline physics se namumkin hai, dual writes consistency todti hain. Log ko sach maan kar replicate karo.',
    },
  ],
  success: [
    'Main bada online migration CDC + snapshot + shadow + percentage cutover se plan kar sakta hoon',
    'Main dual writes ka jaal aur uska ilaaj samjha sakta hoon',
  ],
  cards: [
    { front: '50 TB offline migration kyun nahi?', back: '10 Gbit perfect link par bhi ~11–12 ghante; 1 lakh writes/s par ≈ 4.3 arab writes chhootenge.' },
    { front: 'App-level dual writes ka jaal?', back: 'Ek DB mein safal, doosre mein fail → do sach. Coordinator ke bina distributed txn nahi; 100 ms blip = 10,000 failed writes. Write ki ghatna ko replication se alag karo — log/CDC.' },
    { front: 'Snapshot + log position?', back: 'Snapshot tables ko chunks mein padhta hai aur saath mein log position yaad rakhta hai; khatam hone par consumer usi position se replay karta hai — history + "abhi" bina gap ke.' },
    { front: 'CDC mein ordering aur idempotency?', back: 'User id se partition karo taaki ek user ke events kram mein rahein; events mein poori row ki state bhejo (delta nahi) taaki duplicate delivery safe ho.' },
    { front: 'Reverse CDC kab?', back: 'Jab kuch users naye service par shift ho gaye par monolith ki purani reports/jobs abhi bhi unka data padhti hain — naye DB se changes wapas purane mein, asthaayi pul ki tarah.' },
  ],
  homework: `<p><b>Naya (50 TB video se):</b> apne sabse bade table ke liye likho — offline dump
    kitne ghante lega, aur us dauraan kitne writes aayenge? Phir likho ki tumhare database
    ka "log" kya hai (binlog/WAL) aur usse kaunsa CDC tool padh sakta hai.</p>`,
});

function cdcModel(k) {
  const active = Math.min(k.parts, k.cons);
  const tput = active * 4000;
  const lag = tput >= 100000 ? '< 1 s' : 'badhta ja raha hai';
  return { active, tput, lag };
}

/* =====================================================================
   5. NAYE LEVELS — consensus (Raft), clocks ke baad
   ===================================================================== */
VISUALS['consensus'] = {
  t: 'Raft — ek leader, terms, quorum, replicated log',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🙂 follower</span><span class="dg-arrow">→ timeout (random 150–300 ms) →</span>
      <span class="dg-pill gold" data-hs="cand">🙋 candidate (term+1, khud ko vote)</span><span class="dg-arrow">→ majority →</span>
      <span class="dg-pill good" data-hs="leader">👑 leader (heartbeats)</span>
    </div>
    <div class="dg-cap">Sab ek hi timeout rakhte toh sab ek saath candidate bante aur vote bant jaate.
      <b>Random timeout</b> se pehla jaagne wala jeet jaata hai.</div>

    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">client: x = 10 → leader</span><span class="q">leader apne log mein UNCOMMITTED likhta hai</span></div>
      <div class="dg-rung"><span class="lv">2</span><span class="cmd">AppendEntries → followers</span><span class="q">followers apne log mein likh kar ack</span></div>
      <div class="dg-rung" style="border-left-color:var(--gold)"><span class="lv">3</span><span class="cmd">QUORUM ack (khud samet)</span><span class="q">5 mein se 3 — tabhi data "sach"</span></div>
      <div class="dg-rung g"><span class="lv">4</span><span class="cmd">COMMIT → apply → client ko success</span><span class="q">agli heartbeat followers ko batati hai "entry 100 committed"</span></div>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-accent" data-hs="term"><span class="bx-label">🗳️ Term = logical time</span>
        <div class="dg-cap">Apne se bada term dikha → tum purane ho → follower ban jao.
          Isi se purana leader naye ke baad hukm nahi de sakta.</div></div>
      <div class="dg-box is-good" data-hs="quorum"><span class="bx-label">🔢 Majority kyun</span>
        <div class="dg-cap">Kisi set ki do majorities hamesha kam se kam ek node par milti hain —
          isliye ek term mein do leader namumkin.</div></div>
    </div>`,
};

VISUALS['consensus-split'] = {
  t: 'Partition 2 | 3 — kaun commit kar sakta hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🏝️ Minority (node 1 = purana leader, node 2)</span>
        <div class="dg-cap">y = 20 → 2/5 ack → majority nahi → <b>commit nahi</b>. Client timeout.
          System jhooth nahi bolta — consistency, availability se pehle.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🏝️ Majority (node 3, 4, 5)</span>
        <div class="dg-cap">Naya term, node 3 leader. y = 30 → 3/5 ack → <b>committed</b>.</div></div>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">🔌 network theek</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">node 1 bada term dekhta hai</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">step down · y=20 phenka · y=30 copy</span>
    </div>

    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-box" data-hs="n3"><span class="bx-label">3 nodes</span><div class="dg-cap">quorum 2 · 1 failure</div></div>
      <div class="dg-box is-bad" data-hs="n4"><span class="bx-label">4 nodes</span><div class="dg-cap">quorum 3 · phir bhi 1 failure — paisa bekaar</div></div>
      <div class="dg-box is-good" data-hs="n5"><span class="bx-label">5 nodes</span><div class="dg-cap">quorum 3 · 2 failures — zyadatar companies yahin rukti hain</div></div>
    </div>
    <div class="dg-cap">Consensus <b>metadata</b> ke liye hai (kaun leader, DB ka address, maintenance flag) —
      comments aur clicks ke liye nahi.</div>`,
};

SD.registerLevelsAfter('dist', 'clocks', [
{
  id: 'consensus',
  icon: '🗳️',
  title: 'Consensus — paanch naazuk machines, ek sach',
  badge: 'Raft Rahi',
  objectives: [
    'Consensus mushkil kyun hai: partition, GC pause, latency',
    'Leader/follower, heartbeats aur <b>random</b> election timeouts',
    'Term = logical time; quorum = overlap wali majority',
    'Replicated log: uncommitted → quorum → committed → applied',
  ],
  lesson: [
    `<h3>☎️ Paanch kamre, tin-can telephone</h3>
     <p>Ek machine ho toh aasan hai — uski RAM hi sach hai. Par woh ek single point of failure
     hai. Toh paanch machines ko <b>ek jaisa</b> vyavhaar karna hai. Kyun mushkil?</p>
     <table>
       <tr><th>Tin-can ki duniya</th><th>Asli naam</th></tr>
       <tr><td>Dhaaga kat gaya</td><td>Network partition</td></tr>
       <tr><td>Ek aadmi 20 minute so gaya, phir aise utha jaise kuch hua hi nahi</td><td>GC pause</td></tr>
       <tr><td>Dhaaga bahut lamba — message 5 minute mein pahuncha</td><td>Latency</td></tr>
     </table>
     <p>Yahan maan ke chalte hain ki koi jhooth nahi bolta, bas bharosemand nahi hai (crash-stop
     model). Sab ek saath chillayein toh <b>split brain</b>: kamra 1-2 "$50,000" maanta hai,
     kamra 4-5 "$51,000", kamra 3 deewar dekh raha hai.</p>
     <p>Paxos is problem ka purana devta tha — itna mushkil ki uske lekhak ko baad mein
     "Paxos Made Simple" likhna pada. <b>Raft</b> (Stanford, 2013-14) ka ek hi maqsad tha:
     <b>samajh mein aaye</b>.</p>
     <h3>👑 Har byte par chunav nahi — ek leader</h3>
     <p>Har password change par paanch-node ka chunav karoge toh baat-cheet hi saara
     performance kha jaayegi. Isliye: <b>ek leader</b>, saare writes uske paas, followers bas
     copy karte hain. Leader hardcode nahi kar sakte (node 1 jal gaya toh sab ruk jaayega) —
     leader <b>apne aap</b> chuna jaata hai.</p>
     <p>Teen states: <b>follower</b> (sunta hai), <b>candidate</b> (leader banna chahta hai),
     <b>leader</b>. Sab follower se shuru hote hain. Leader har heartbeat par chillata hai
     "main abhi bhi raja hoon"; jab tak awaaz aati hai, followers chup.</p>
     <h3>🎲 Random timeout — ek chhoti chaal, bada asar</h3>
     <p>Agar sab followers 500 ms timeout rakhte, toh 501 ms par sab ek saath candidate bante
     aur vote bant jaate. Raft mein har node <b>random</b> timeout chunta hai (jaise 150–300 ms).
     Node 1 ka 175 ms pehle bajta hai → woh candidate: <b>term badhata hai, khud ko vote deta
     hai, sabse RequestVote maangta hai</b>.</p>`,
    `<h3>🗳️ Term — election ka saal</h3>
     <p>Distributed system mein deewar ki ghadi bekaar hai (Clocks level yaad karo). Raft
     <b>logical time</b> use karta hai: term 1, term 2, term 3. Agar tumhe apne se <b>bada
     term</b> dikha → tum purane ho → term update karo aur follower ban jao. Yahi rokta hai ki
     naya leader banne ke baad purana leader hukm deta rahe.</p>
     <p>Follower vote tab deta hai jab (1) is term mein pehle kisi ko vote nahi diya, aur (2)
     candidate ka log kam se kam uske jitna up-to-date hai.</p>
     <h3>🔢 Quorum — majority hi kyun</h3>
     <pre>5 nodes → quorum 3    3 nodes → quorum 2    100 nodes → quorum 51</pre>
     <p>Ek seedha ganit: <b>kisi set ki koi bhi do majorities kam se kam ek node par milti
     hain.</b> Tum 5 mein se 3 vote le lo aur main bhi 5 mein se 3 le loon — namumkin, koi ek
     node dono ko vote nahi de sakta ek hi term mein. Isliye ek term mein do leader nahi.</p>
     <h3>📜 Replicated log — data kab "sach" hota hai</h3>
     <pre>1. client: x = 10 → leader
2. leader apne log mein likhta hai — UNCOMMITTED (sirf prastaav)
3. AppendEntries → followers apne log mein likh kar ack
4. leader QUORUM ka intezaar (khud samet)
5. COMMIT → apni state machine par apply → client ko "success"
6. agli heartbeat → followers ko "entry 100 committed", woh bhi apply karte hain</pre>
     <p class="tip">🎯 Junior soch: "leader disk par likh ke done bol dega." Nahi — leader
     tabhi mara toh followers ko x = 10 pata hi nahi. Data tabhi sach hai jab <b>majority</b>
     ke paas pahunch jaaye. Yahi CAP ka C hai.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Leader election — sahi kram',
      instructions: 'Leader ki heartbeat ruk gayi. Aage kya-kya hota hai?',
      steps: [
        { text: 'Followers ko heartbeat aana band ho jaata hai', explain: 'Leader mara, ya uska network kata.' },
        { text: 'Sabse chhota random timeout wala follower pehle jaagta hai', explain: 'Random timeouts se sab ek saath candidate nahi bante.' },
        { text: 'Woh candidate banta hai: term + 1, khud ko vote', explain: 'Naya term = naya election saal.' },
        { text: 'Woh sabse RequestVote maangta hai', explain: 'Har node is term mein sirf ek vote de sakta hai.' },
        { text: 'Followers vote dete hain agar is term mein vote nahi diya aur candidate ka log up-to-date hai', explain: 'Purane log wala leader nahi ban sakta — warna committed data kho jaata.' },
        { text: 'Majority milte hi woh leader ban kar heartbeats bhejta hai', explain: 'Bade term ki heartbeat dekh kar baaki sab follower ban jaate hain.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Diagram par pehchano',
      visual: 'consensus',
      questions: [
        { q: 'Kaunsi cheez rokti hai ki purana leader naye leader ke baad bhi hukm de?', target: 'term', explain: 'Bada term dikhte hi purana leader samajh jaata hai ki woh hat chuka hai.' },
        { q: 'Ek term mein do leader namumkin kyun hain?', target: 'quorum', explain: 'Do majorities hamesha ek node par overlap karti hain, aur woh node ek term mein ek hi vote deta hai.' },
        { q: 'Kaun sa state khud ko vote deta hai aur term badhata hai?', target: 'cand', explain: 'Candidate — timeout ke baad.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — paanch nodes, ek leader',
      project: '09-raft',
      exercise: 'ex1-election',
      goal: '5-node Raft jaisa cluster chalao, leader maaro aur naya leader banne ka waqt dekho; phir sab ke timeouts barabar karke split votes dekho.',
      why: `Lab ek chhota Raft hai: <b>paanch alag Node processes</b> jo HTTP par RequestVote aur
        AppendEntries bhejte hain. Terms, random timeouts (300–600 ms), heartbeat (80 ms) aur quorum —
        sab asli logic se. (Seekhne ke liye; production mein etcd/ZooKeeper/KRaft.)`,
      steps: [
        { text: '5-node cluster chalao.', cmd: 'cd docker-labs/09-raft && npm start ex1-election', expect: 'ex1-election\n  raft-node 1 → http://localhost:4901 … raft-node 5 → :4905\n  [node 3] LEADER — term 1 (4/5 votes)' },
        { text: 'Teen baar leader maaro aur failover naapo.', cmd: 'node tools/election.js', expect: 'pehla leader: node 3 (term 1)\n  node 3 maara → node 1 leader  347 ms mein   (term +1)\n  node 1 maara → node 2 leader  407 ms mein   (term +1)\n  node 2 maara → node 3 leader  414 ms mein   (term +1)\nRANDOM timeouts → average failover: 389 ms' },
        { text: 'Ab sabka timeout barabar karke cluster dobara chalao.', cmd: 'SAME_TIMEOUT=1 npm start ex1-election && SAME_TIMEOUT=1 node tools/election.js', expect: '10 s mein KOI leader nahi bana — term 21 tak pahunch gaye, kul 105 elections (har baar vote bant gaye)\nSAME timeouts → sab ek saath candidate, sab khud ko vote, kisi ko majority nahi ❌' },
      ],
      observe: {
        q: 'Sab nodes ka timeout barabar karne par election mein kya hota hai?',
        choices: ['Sab ek saath candidate bante hain, sab khud ko vote dete hain, kisi ko majority nahi milti — output mein 10 s mein 105 elections aur koi leader nahi', 'Election tez ho jaata hai', 'Koi farq nahi', 'Do leader ban jaate hain'],
        answer: 0,
        explain: 'Isliye Raft random timeouts use karta hai — ek chhoti si chaal jiske bina cluster khud ko rok leta hai. (Do leader ek term mein quorum ki wajah se kabhi nahi bante.)',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Consensus',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Raft mein data kab committed maana jaata hai?"',
        choices: ['Jab leader ke log se woh entry majority nodes ke logs mein pahunch jaaye', 'Jab leader apni disk par likh de', 'Jab saare nodes ack karein', 'Jab client ack kare'],
        answer: 0,
        explain: 'Majority par pahunchne ke baad leader mar bhi jaaye toh naya leader (up-to-date log ki shart ki wajah se) woh entry rakhta hai.',
      },
      {
        q: 'Interviewer: "Election timeout random kyun hote hain?"',
        choices: ['Taaki sab followers ek saath candidate na bane aur vote na bante', 'Taaki security badhe', 'Taaki clock skew theek ho', 'Taaki leader zyada der chale'],
        answer: 0,
        explain: 'Ek chhoti si chaal jo split votes ko lagbhag khatam kar deti hai.',
      },
    ],
  },
  success: [
    'Main Raft ka leader election aur write path kram se samjha sakta hoon',
    'Main term aur quorum ka kaam bata sakta hoon',
  ],
  homework: `<p>Agar tum Kubernetes use karte ho: <code>etcdctl endpoint status --cluster -w table</code>
    chalao aur dekho — kaunsa member leader hai, current term kya hai, aur raft index kitna hai.
    (Wahi cheezein jo is level mein padhin.)</p>`,
  cards: [
    { front: 'Raft ke teen states?', back: 'Follower (sunta hai), candidate (timeout ke baad — term+1, khud ko vote, RequestVote), leader (majority mili — heartbeats bhejta hai).' },
    { front: 'Random election timeout kyun?', back: 'Sab ka timeout ek jaisa ho toh sab ek saath candidate bante hain aur vote bant jaate hain. Random (150–300 ms) se pehla jaagne wala jeet jaata hai.' },
    { front: 'Term kya hai?', back: 'Logical time / election ka saal. Apne se bada term dikhe toh tum purane ho → follower ban jao. Isi se purana leader hukm nahi de paata.' },
    { front: 'Majority quorum kyun?', back: 'Koi bhi do majorities kam se kam ek node par overlap karti hain — ek term mein do leader ya do alag committed values namumkin.' },
    { front: 'Raft write path?', back: 'Leader log mein uncommitted → AppendEntries → majority ack → commit + apply + client ko success → agli heartbeat followers ko commit batati hai.' },
  ],
},
{
  id: 'consensus-split',
  icon: '✂️',
  title: 'Consensus — jab network do tukde ho jaaye',
  badge: 'Quorum Qazi',
  objectives: [
    'Leader marna: ek timeout mein self-heal',
    'Partition mein purana leader minority mein — woh commit kyun nahi kar sakta',
    'Network theek hone par purana leader kaise hat-ta hai',
    'Kitne nodes: 3, 5, 7 — aur 4 kyun bekaar',
    'Consensus kab NAHI: metadata vs user data',
  ],
  lesson: [
    `<h3>💀 Scene 1: leader mar gaya</h3>
     <p>Paanch nodes, node 1 leader. Node 1 ki power cable gayi. Followers 2-5 ko heartbeat
     aana band. Unke random timers chal rahe hain; node 3 ka (180 ms) pehle bajta hai → woh
     agle term ka candidate → 2, 4, 5 ne is term mein kisi ko vote nahi diya aur node 3 up-to-date
     hai → 4 vote → <b>node 3 leader</b>. System lagbhag <b>200 ms</b> ke liye unavailable raha,
     aur bina kisi insaan ke khud theek ho gaya.</p>
     <h3>✂️ Scene 2: network do tukde — yahi architects ko sone nahi deta</h3>
     <p>Switch mara. Nodes 1-2 ek taraf, 3-4-5 doosri taraf. Split se pehle node 1 leader tha.</p>
     <pre>MINORITY (1, 2):
   client: y = 20 → node 1 (abhi bhi khud ko leader samajhta hai)
   node 1 → node 2 ko copy → ack
   2 acks (khud + node 2) = 2/5 → MAJORITY NAHI → commit nahi
   client ko kabhi "success" nahi milta → timeout
   → system JHOOTH NAHI BOLTA: consistency, availability se pehle

MAJORITY (3, 4, 5):
   node 1 ki awaaz nahi aati → election → node 3 naye term ka leader
   client: y = 30 → node 3 → 4 aur 5 ack → 3/5 → COMMITTED → success

NETWORK THEEK:
   node 1 dekhta hai: node 3 ki heartbeat, BADA term, lamba log
   → node 1 khud hat-ta hai, follower banta hai,
     apna uncommitted y = 20 phenk deta hai, node 3 se y = 30 copy karta hai</pre>
     <p class="tip">🎯 Split brain <b>sirf quorum ke niyam</b> se hal hua. Minority taraf
     <b>physically</b> kuch commit nahi kar sakti thi, jabki majority taraf business chalata
     raha.</p>`,
    `<h3>🔢 Kitne nodes? — odd numbers</h3>
     <table>
       <tr><th>Nodes</th><th>Quorum</th><th>Kitne failures jhel sakta hai</th></tr>
       <tr><td>3</td><td>2</td><td>1</td></tr>
       <tr><td><b>4</b></td><td>3</td><td><b>1</b> — 3 jitna hi, par mehenga aur dheema (zyada acks ka intezaar)</td></tr>
       <tr><td>5</td><td>3</td><td>2</td></tr>
       <tr><td>7</td><td>4</td><td>3</td></tr>
     </table>
     <p>Even numbers paisa bekaar hain. Zyadatar companies <b>5</b> par rukti hain: har extra
     node latency ka tax badhata hai, aur kisi ek dheeme node ke har write ko kheenchne ka mauka
     badhta hai.</p>
     <h3>🧰 Khud mat banao</h3>
     <p>Raft sahi likhna bahut mushkil hai — disk corruption, network reordering, membership
     changes ke hazaar kone. Isliye <b>coordination services</b> use hote hain:</p>
     <ul>
       <li><b>etcd</b> — Kubernetes ka dimaag (Raft). etcd ne consensus khoya toh poora cluster
       jam jaata hai.</li>
       <li><b>ZooKeeper</b> (ZAB) — Kafka isse partition leaders tay karta tha; Kafka 4.0 (2025)
       ne ZooKeeper poori tarah chhod kar apna Raft-based <b>KRaft</b> le liya.</li>
       <li><b>Google Spanner</b> — har shard ek Paxos group: sharded consensus.</li>
     </ul>
     <h3>🐢 Aur imaandaar chetavni</h3>
     <p>Consensus ek akele Postgres se <b>dheema</b> hai: har write par network hop, ack se
     pehle log ka <code>fsync</code>, aur saare writes ek leader CPU se — ek Raft group mein
     writes parallel nahi ho sakte. Isliye comments aur analytics clicks Raft mein nahi daalte.
     Consensus <b>metadata</b> ke liye hai: shard ka leader kaun hai, database ka address kya
     hai, maintenance mode on hai ya nahi — woh chhoti chaabiyan jo galat hon toh sab toot jaaye.
     Baaki ke liye eventual consistency.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — partition 2 | 3',
      instructions: 'Timeline chalao. Sawaal par rukega.',
      incident: '5-node Raft cluster — switch fail',
      goal: 'Dekho ki minority side kyun commit nahi karti aur network theek hone par kya hota hai.',
      speedMs: 1800,
      metrics: [
        { id: 'leaders', label: 'Khud ko leader maanne wale nodes', unit: '', max: 3, dir: 'lower' },
        { id: 'committed', label: 'Committed writes (majority side)', unit: '', max: 10, dir: 'higher' },
      ],
      frames: [
        { t: 'T0', event: 'Node 1 leader (term 2). Sab theek.', metrics: { leaders: 1, committed: 0 } },
        { t: 'T1', event: 'Switch fail: <b>{1, 2}</b> ek taraf, <b>{3, 4, 5}</b> doosri taraf.', metrics: { leaders: 1, committed: 0 }, tone: 'warn' },
        { t: 'T2', event: 'Client ne node 1 ko <code>y = 20</code> bheja. Node 2 ne ack kiya.', metrics: { leaders: 1, committed: 0 }, tone: 'warn',
          ask: { q: 'Node 1 y = 20 commit karega?',
                 choices: ['Nahi — 2/5 acks majority nahi hain; client ko timeout milega', 'Haan — woh leader hai', 'Haan — node 2 ne ack kiya', 'Aadha commit'],
                 answer: 0,
                 explain: 'Majority ke bina commit nahi. System jhooth bolne ke bajaye chup rehta hai — yahi consistency over availability hai.',
                 wrongHints: ['Leader hona kaafi nahi, quorum chahiye.', 'Do ack 5 ki majority nahi.', 'Raft mein "aadha commit" jaisa kuch nahi.'] } },
        { t: 'T3', event: '{3, 4, 5} ko heartbeat nahi aati. Node 3 <b>term 3</b> ka leader bana.', metrics: { leaders: 2, committed: 0 }, tone: 'warn' },
        { t: 'T4', event: 'Client ne node 3 ko <code>y = 30</code> bheja → 3/5 acks → <b>committed</b>.', metrics: { leaders: 2, committed: 1 }, tone: 'ok' },
        { t: 'T5', event: 'Network theek. Node 1 ko term 3 ki heartbeat dikhi.', metrics: { leaders: 2, committed: 1 }, tone: 'warn',
          ask: { q: 'Ab node 1 kya karega?',
                 choices: ['Bada term dekh kar follower banega, uncommitted y = 20 phenkega, aur node 3 se y = 30 copy karega', 'Node 3 se ladai karega', 'Apna y = 20 sab par thopega', 'Band ho jaayega'],
                 answer: 0,
                 explain: 'Term ka niyam purane leader ko hata deta hai, aur uncommitted entry kabhi "sach" thi hi nahi.',
                 wrongHints: ['Raft mein ladai nahi — bada term jeet-ta hai.', 'y = 20 kabhi committed nahi tha.', 'Node band nahi hota, sirf follower banta hai.'] } },
        { t: 'T6', event: 'Ek leader (node 3), sabka log <code>y = 30</code>. Split brain bina kisi insaan ke hal.', metrics: { leaders: 1, committed: 1 }, tone: 'ok' },
      ],
      lesson: 'Partition mein consensus <b>availability chhodta hai, consistency nahi</b>. Minority side ruk jaati hai; majority side chalti rehti hai; aur theek hone par term + log ka niyam sab ko ek sach par le aata hai.',
    },
    {
      type: 'tradeoff',
      title: 'Cluster size lab',
      instructions: 'Nodes ki ginti aur ek dheema node — failures aur latency dekho.',
      goal: 'Aisa cluster chuno jo <b>2 failures</b> jhel sake aur write latency <b>15 ms se kam</b> rahe.',
      scenario: 'Har ack ~2 ms ka network + fsync. Ek node kabhi-kabhi dheema (20 ms) ho jaata hai.',
      knobs: [
        { id: 'n', label: 'Nodes', min: 1, max: 9, step: 1, value: 4, unit: '', note: 'Even numbers par dhyan do.' },
        { id: 'slow', label: 'Kitne nodes dheeme hain', min: 0, max: 3, step: 1, value: 1, unit: '', note: 'Leader sabse tez majority ka intezaar karta hai.' },
      ],
      readouts: k => {
        const m = raftSizeModel(k);
        return [
          { label: 'Quorum', value: m.q + '', tone: 'ok' },
          { label: 'Failures jhel sakta hai', value: m.f + '', tone: m.f >= 2 ? 'ok' : 'bad' },
          { label: 'Write latency', value: m.lat + ' ms', tone: m.lat <= 15 ? 'ok' : 'bad' },
          { label: 'Paisa', value: k.n + ' machines', tone: k.n % 2 === 0 ? 'warn' : 'ok' },
        ];
      },
      bars: k => {
        const m = raftSizeModel(k);
        return [
          { label: 'Fault tolerance', pct: Math.min(100, (m.f / 4) * 100), text: m.f + ' failures', tone: m.f >= 2 ? 'ok' : 'bad' },
          { label: 'Write latency', pct: Math.min(100, (m.lat / 30) * 100), text: m.lat + ' ms', tone: m.lat <= 15 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = raftSizeModel(k);
        if (m.f < 2) return { ok: false, text: `<b>${k.n}</b> nodes = quorum <b>${m.q}</b> = sirf <b>${m.f}</b> failure. ${k.n % 2 === 0 ? 'Even number — ek kam node wala cluster utna hi jhelta, sasta aur tez.' : ''}` };
        if (m.lat > 15) return { ok: false, text: `Itne dheeme nodes ke saath majority tak pahunchne mein <b>${m.lat} ms</b> lag rahe hain — quorum mein dheema node aa gaya.` };
        return { ok: true, text: `<b>${k.n}</b> nodes: quorum ${m.q}, ${m.f} failures jhelta hai, write latency <b>${m.lat} ms</b>.` };
      },
      check: k => { const m = raftSizeModel(k); return m.f >= 2 && m.lat <= 15; },
      lesson: 'Odd numbers chuno. 3 = ek failure, 5 = do. Zyada nodes = zyada acks ka intezaar aur kisi dheeme node ke quorum mein aane ka zyada mauka.',
      quiz: {
        q: '4-node cluster 3-node se behtar kyun nahi?',
        choices: ['Quorum 3 ho jaata hai — failures phir bhi sirf 1, bas mehenga aur dheema', '4 nodes mein leader nahi banta', '4 nodes zyada failures jhelta hai', 'Farq nahi, dono same cost'],
        answer: 0,
        explain: 'Even number koi extra fault tolerance nahi deta.',
      },
    },
    {
      type: 'docker',
      title: '🐳 Lab — quorum aur partition',
      project: '09-raft',
      exercise: 'ex2-quorum-partition',
      goal: 'Writes ko quorum ke saath commit hote dekho, 2 nodes band karo (chalega), 3 band karo (ruk jaayega); phir cluster ko 2 | 3 mein baant kar dono taraf likho aur heal karo.',
      why: 'Wahi 5-node Raft — ab followers band karne aur network ko do tukdon mein baantne ke tools ke saath.',
      steps: [
        { text: 'Cluster chalao aur quorum test karo: 0, 2, phir 3 followers band.', cmd: 'cd docker-labs/09-raft && npm start ex2-quorum-partition && node tools/quorum.js', expect: 'leader: node 3 (term 1)\n  5/5 zinda                    → x=1: committed ✅ (6 ms)\n  2 followers band (3/5 zinda) → x=2: committed ✅ (5 ms)\n  3 followers band (2/5 zinda) → x=3: COMMIT NAHI ❌ — majority ka ack nahi mila (timeout)' },
        { text: 'Ab network ko 2 | 3 mein baanto (purana leader minority mein), dono taraf likho, phir heal.', cmd: 'node tools/partition.js', expect: 'leader: node 3 (term 1)   partition → {3,1} | {2,4,5}\n  minority: node 3 par y=20 → COMMIT NAHI ❌\n  majority: naya leader node 5 (term 2)\n  majority: node 5 par y=30 → committed ✅\n  partition ke dauraan khud ko leader maanne wale: node 3 (term 1), node 5 (term 2)\nheal ke baad har node ka log:  x=1, x=2, x=3, y=30   (y=20 kahin nahi)' },
      ],
      observe: {
        q: 'Heal hone ke baad minority side ka likha y = 20 kahan gaya?',
        choices: ['Phenk diya gaya — woh kabhi committed tha hi nahi; sab nodes majority wala y = 30 rakhte hain', 'Sab nodes par y = 20', 'Dono values rakhi gayin', 'Cluster band ho gaya'],
        answer: 0,
        explain: 'Uncommitted entry sach nahi hoti. Isliye client ko uska "success" kabhi mila hi nahi tha.',
      },
    },
  ],
  interview: {
    title: 'Interview Round — Partitions aur quorum',
    instructions: 'Teen sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "5-node Raft cluster 2 | 3 mein bat gaya. Kya hoga?"',
        choices: ['Majority side (3) leader chunti hai aur writes commit karti hai; minority side (2) koi write commit nahi kar sakti; heal par minority ke uncommitted entries hat jaati hain', 'Dono taraf leader, dono taraf writes', 'Cluster poora ruk jaata hai', 'Minority side jeet-ti hai kyunki purana leader wahan hai'],
        answer: 0,
        explain: 'Quorum ka niyam split brain ko physically namumkin bana deta hai.',
      },
      {
        q: 'Interviewer: "User comments ko Raft cluster mein store karein?"',
        choices: ['Nahi — consensus har write par network hop + fsync + single leader CPU leta hai; woh metadata ke liye hai. Comments ke liye sharded/eventually consistent store', 'Haan, consistency sabse zaroori hai', 'Haan, bas nodes badha do', 'Haan, agar 7 nodes ho'],
        answer: 0,
        explain: 'Consensus "chaabiyon" ke liye hai — kaun leader hai, kahan kya rehta hai.',
      },
      {
        q: 'Interviewer: "Apna Raft likhoge?"',
        choices: ['Nahi — etcd/ZooKeeper/KRaft jaise tested coordination service use karunga', 'Haan, 200 lines ka kaam hai', 'Haan, Paxos se aasan hai', 'Haan, library ki zaroorat nahi'],
        answer: 0,
        explain: 'Disk corruption, reordering aur membership changes ke edge cases hi asli kaam hain.',
      },
    ],
  },
  success: [
    'Main partition mein consensus ka vyavhaar kram se bata sakta hoon',
    'Main cluster size (3/5/7) aur uski keemat samjha sakta hoon',
    'Main bata sakta hoon ki consensus kis data ke liye hai aur kiske liye nahi',
  ],
  homework: `<p>Apne system mein aisi 3 "chaabiyan" dhoondho jo galat hon toh sab toot jaaye
    (leader kaun, config, feature flag). Likho ki aaj woh kahan rehti hain — aur kya woh jagah
    partition mein do alag jawab de sakti hai?</p>`,
  cards: [
    { front: 'Leader marne par Raft kitni der mein theek hota hai?', back: 'Lagbhag ek election timeout (~200 ms) — sabse pehle jaagne wala follower naye term ka candidate banta hai aur majority se leader.' },
    { front: 'Partition mein minority side ka leader?', back: 'Writes ko majority ack nahi milta, isliye kuch commit nahi hota — client timeout paata hai. Heal par bada term dekh kar woh follower banta hai aur uncommitted entries phenkta hai.' },
    { front: '4 nodes kyun nahi?', back: 'Quorum 3 — sirf 1 failure jhelta hai (3 nodes jitna), par mehenga aur dheema. Odd numbers chuno; zyadatar 5.' },
    { front: 'Consensus kiske liye?', back: 'Metadata — shard ka leader, DB address, maintenance flag. User data (comments, clicks) ke liye nahi: har write par hop + fsync + single leader.' },
    { front: 'etcd, ZooKeeper, KRaft, Spanner?', back: 'etcd = Kubernetes ka Raft store; ZooKeeper (ZAB) = purana Kafka coordinator; Kafka 4.0 (2025) ne apna Raft-based KRaft liya; Spanner = har shard ek Paxos group.' },
  ],
},
]);

function raftSizeModel(k) {
  const q = Math.floor(k.n / 2) + 1;
  const f = Math.max(0, k.n - q);
  /* leader ko (q-1) followers ke ack chahiye; sabse tez wale pehle aate hain */
  const fastFollowers = Math.max(0, (k.n - 1) - k.slow);
  const needSlow = Math.max(0, (q - 1) - fastFollowers);
  const lat = k.n === 1 ? 2 : (needSlow > 0 ? 22 : 4 + (q - 1));
  return { q, f, lat };
}

})();
