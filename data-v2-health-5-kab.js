/* =====================================================================
   🛡️ Playlist · 1 Resilience — Health Checks · level 5: KAB
   Kaunsi cheez kis sawaal mein jaaye, kaunsi kisi mein nahi; chaar naapi hui galtiyan; sach ya galatfehmi.
   Number asli run se hain: docker-labs/43-health-checks — tools/dbblip.js (ex1), tools/probeload.js (ex2),
   tools/slowstart.js (ex3), tools/rollout.js (ex4), aur slow motion tools.
   Kubernetes, AWS, Envoy aur Spring Boot ke baare mein jo "documentation" likha hai, woh unki official documentation se
   hai (is lab mein chalaye nahi gaye).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'in', icon: '🫀', label: 'app atak gaya', x: 150, y: 105 },
  { id: 'self', icon: '🚦', label: 'abhi nahi le sakta', x: 455, y: 105 },
  { id: 'out', icon: '🗄️', label: 'bahar ki cheez giri', x: 750, y: 105 },
];

VISUALS['hc-kab'] = {
  t: 'Teen alag haalat, teen alag jagah: atka hua app → "zinda ho?" · abhi kaam nahi le sakta → "traffic bhejein?" · bahar ki cheez giri → request ka jawab',
  html: SD.viz.svg(NODES, [], {
    nodes: { in: { tone: 'bad', badge: '"zinda ho?" → restart' }, self: { tone: 'slow', badge: '"traffic bhejein?" → roko' }, out: { tone: 'acc', badge: 'request mein 503' } },
    flows: [],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'hc-kab',
  icon: '⚖️',
  group: '🩺 Health Checks',
  title: 'Health Checks 5 · Kab — kaunsi cheez kis sawaal mein',
  badge: 'Sehat Panch',
  objectives: [
    'Kaunsi gadbad "zinda ho?" mein dikhni chahiye, kaunsi "traffic bhejein?" mein — aur kaunsi dono mein nahi?',
    'Readiness mein shared DB rakhna kab theek hai, kab nahi?',
    'Health ke sawaalon ka DB par kitna bojh padta hai?',
    'Chaar aam galtiyan kaunsi hain, aur har galti ka naapa hua nateeja kya hai?',
  ],
  lesson: [
    `<h3>⚖️ Har gadbad ka ek hi sawaal: is gadbad ka ilaaj kya hai?</h3>
     <p>Health checker ke paas do hi auzaar hain: <b>restart</b> aur <b>traffic rokna</b>. Kisi cheez ko health ke jawab mein rakhne se pehle poochho: is gadbad ka ilaaj in dono mein se koi hai?</p>
     <pre>gadbad pod ke ANDAR hai, khud theek nahi hogi   → restart ilaaj hai        → "zinda ho?"
pod theek hai, bas ABHI kaam nahi le sakta      → traffic rokna ilaaj hai  → "traffic bhejein?"
gadbad pod ke BAHAR hai (DB, doosri service)    → dono ilaaj nahi          → request ke jawab mein batao</pre>
     <pre>lab (DB 5 second band, teen run):
DB ko "zinda ho?" mein rakha            → 3 restart · /orders DB ke 4.0–5.0 s baad theek
DB ko "traffic bhejein?" mein rakha     → DB band ke dauraan /home sirf 17.5–19.5% safal
DB ko request ke jawab mein rakha       → /home 100% safal · /orders DB ke 0.0 s baad theek</pre>
     <p class="tip">👉 Is level mein pehle tum faisla karoge: aath gadbadiyan, teen jagah. Phir number.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'App ki gadbad kahan dikhni chahiye?',
      instructions: 'Aath gadbadiyan. Har ek ke liye socho: is gadbad ka ilaaj restart hai, traffic rokna hai, ya dono nahi? Phir sahi bin mein daalo.',
      bins: [
        { id: 'live', label: '🫀 "Zinda ho?" mein (fail = restart)' },
        { id: 'ready', label: '🚦 "Traffic bhejein?" mein (fail = traffic band)' },
        { id: 'req', label: '📨 Health mein nahi — request ke jawab mein' },
      ],
      items: [
        { text: 'App atak gaya hai: kisi bhi request ka jawab nahi ja raha, aur atki haalat khud theek nahi hogi', bin: 'live', explain: 'Gadbad pod ke andar hai, aur restart hi ilaaj hai. "Zinda ho?" ka jawab aayega hi nahi → checker restart karega.' },
        { text: 'App ke do hisse ek doosre ka intezaar kar rahe hain (deadlock). Process chal raha hai, par kaam nahi ho raha', bin: 'live', explain: 'Process zinda dikhta hai, isliye sirf "process chal raha hai?" kaafi nahi. Kubernetes ki documentation liveness ki yahi misaal deti hai: chal raha hai, par aage nahi badh pa raha.' },
        { text: 'App abhi-abhi khula hai aur apna cache bhar raha hai. 20 second mein tayyar ho jaayega', bin: 'ready', explain: 'Pod theek hai, bas abhi kaam nahi le sakta. Traffic roko, restart mat karo. (Boot hi lamba ho, toh "shuru ho gaye?" wala sawaal bhi lagao.)' },
        { text: 'App ko band hone ka signal (SIGTERM) mil chuka hai', bin: 'ready', explain: 'Naya traffic nahi chahiye — par restart bhi nahi. Lab: "traffic mat bhejo" + 2 s tak jawab → har deploy par 0 fail (turant band: 75).' },
        { text: 'Is ek pod par abhi itna kaam hai ki pod nayi requests nahi sambhal sakta. Thodi der mein khaali ho jaayega', bin: 'ready', explain: 'Gadbad sirf is ek pod ki hai aur thodi der ki hai. Baaki pods kaam sambhal lenge. Restart se chalta kaam bhi jaayega.' },
        { text: 'Shared database 5 second ke liye band hai', bin: 'req', explain: 'Restart se DB theek nahi hota. Traffic rokoge toh saare pods ek saath bahar. Jis page ko DB chahiye, wahi page 503 de. Lab: /home 100% safal.' },
        { text: 'Payment company ki API dheemi chal rahi hai', bin: 'req', explain: 'Gadbad pod ke bahar hai. Ilaaj request ke raaste mein hai: timeout, aur baar-baar fail ho toh circuit breaker (Circuit Breaker levels).' },
        { text: 'Cache server band hai. App cache ke bina bhi chal sakta hai — dheema, par chalta hai', bin: 'req', explain: 'App kaam kar sakta hai, toh "traffic mat bhejo" kehna galat hoga. Cache ke bina dheere jawab do.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain.',
      steps: [
        {
          title: '1. Teen sawaal: kya rakhein, kya nahi',
          say: `<div class="dr-scroll"><table>
              <tr><th>Sawaal</th><th>Fail hone par</th><th>Jawab mein rakho</th><th>Mat rakho</th></tr>
              <tr><td>"Shuru ho gaye?"</td><td>chhoot khatam hone par restart</td><td>app khul gaya?</td><td>—</td></tr>
              <tr><td>"Zinda ho?"</td><td>restart</td><td>sirf itna: app jawab de pa raha hai</td><td>DB, cache, doosri service — jo bhi pod ke bahar hai</td></tr>
              <tr><td>"Traffic bhejein?"</td><td>traffic band</td><td>pod ka apna haal: khul gaya · tayyar hai · band nahi ho raha</td><td>shared cheez — jab tak app us cheez ke bina kuch bhi na kar sake</td></tr>
            </table></div>
            Jo cheez kisi sawaal mein nahi gayi, us cheez ki gadbad <b>request ke jawab</b> mein dikhti hai: 503, timeout, ya fallback.`,
        },
        {
          title: '2. Readiness mein shared DB: kab haan?',
          say: 'Spring Boot ki documentation is faisle ko "judgement call" kehti hai. Do sawaal faisla karte hain: app us cheez ke bina kya kar sakta hai, aur aage kaunsa load balancer khada hai.',
          ask: {
            q: 'Ek service ka har page DB maangta hai; DB ke bina service sirf error deti hai. Aage AWS Application Load Balancer hai. Readiness mein DB ka yaad rakha jawab rakhna kaisa hai?',
            choices: [
              'Theek ho sakta hai — har page ko DB chahiye; yaad aur load balancer ki deri phir bhi naapo',
              'Theek tabhi hai jab DB liveness mein bhi ho; app restart se DB lautne ka samay kam ho jaayega',
              'Theek hai aur wapsi ki deri bhi mitegi; fail open purane health jawab ko taaza kar dega',
              'Fayda nahi ho sakta — readiness mein app ke bahar ki cheez ka jawab rakhna hi mana hai',
            ],
            answer: 0,
            hint: 'Level 2 mein dikkat /home thi, jise DB chahiye hi nahi tha. Is service mein aisa koi page hai?',
            explain: 'Har page DB ke bina error deta ho toh readiness mein DB rakhna theek ho sakta hai. Par yaad ka purana jawab, check ki baari aur load balancer ki hadd samjho. ALB sab unhealthy hon toh traffic bhej sakta hai; Fail open ka matlab health ka jawab taaza ho jaana nahi.',
            choiceExplanations: [
              'Har page DB ke bina error deta ho toh readiness mein DB rakhna theek ho sakta hai. Par yaad ka purana jawab, check ki baari aur load balancer ki hadd samjho. ALB sab unhealthy hon toh traffic bhej sakta hai; Fail open ka matlab health ka jawab taaza ho jaana nahi.',
              'Readiness ka DB check liveness mein jodna zaroori nahi. Pods restart karne se shared DB theek nahi hota.',
              'Fail open traffic bhejne ka niyam badalta hai. DB ki yaad, check ki baari aur healthy maanne ki hadd phir bhi alag hain.',
              'Readiness mein zaroori backend check kiya jaa sakta hai. Faisla DB ke bina app ke kaam aur load balancer ke bartav se karo.',
            ],
          },
        },
        {
          title: '3. Health ke sawaalon ka bill',
          say: `Sawaal muft nahi hote. Lab: 5 pods, har pod ka <code>/readyz</code> har second 4 jagah se khulta hai. App par asli traffic <b>zero</b>.
            <div class="dr-scroll"><table>
              <tr><th>/readyz kaise jawab deta hai</th><th>DB queries/second (5 pods)</th><th>100 pods par (andaaza)</th></tr>
              <tr><td>Har sawaal par DB se poochh ke</td><td>18.5</td><td>~370</td></tr>
              <tr><td>Yaad se (har 2 s ek baar)</td><td>2.5</td><td>~50</td></tr>
              <tr><td>DB ko chhuta hi nahi</td><td>0</td><td>0</td></tr>
            </table></div>
            Aur check ka bojh sabse bure waqt par padta hai: jab DB pehle se dheema ho.`,
        },
        {
          title: '4. Chaar galtiyan, chaar number',
          say: `<div class="dr-scroll"><table>
              <tr><th>Galti</th><th>Lab ne kya naapa</th></tr>
              <tr><td>"Zinda ho?" mein DB</td><td>DB 5 s band → 3 restart; /orders DB ke 4.0–5.0 s baad theek</td></tr>
              <tr><td>"Traffic bhejein?" mein shared DB (fail open ke bina)</td><td>DB band ke dauraan /home sirf 17.5–19.5% safal</td></tr>
              <tr><td>Boot ke samay ka andaaza (delay 10 s, boot 12 s)</td><td>2 restart; READY kabhi nahi</td></tr>
              <tr><td>SIGTERM par turant band</td><td>har deploy par 75 requests fail</td></tr>
            </table></div>
            <b>Kal subah:</b> apni ek service kholo. Dekho ki liveness ka raasta kisi DB ya doosri service ko chhuta hai ya nahi. Chhuta ho, toh sabse pehle yahi theek karo.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> health ke jawab mein wahi rakho jiska ilaaj checker ke paas hai. Pod ke andar ki atki hui haalat → "zinda ho?". Pod ka "abhi nahi" → "traffic bhejein?". Pod ke bahar ki gadbad → request ka jawab.',
    },

    /* ---------------- 3. naapo: DB ki gadbad, paanch setup ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — DB ki 5 second ki gadbad, paanch setup',
      project: '43-health-checks',
      exercise: 'ex1-deep-shallow',
      goal: 'Asli raftaar: 3 pods (boot 6 s), har page par 40 requests/second, 22 second. DB 6 s se 11 s tak band. "pod restarts" aur "/home (DB band ke dauraan)" wale khaane dekho.',
      why: '<code>services/cluster.js</code> = chhota cluster: har pod ek alag Node process hai, aur checker (<code>lib/checker.js</code>) asli Kubernetes ke niyam se probes chalata hai. <code>services/pod.js</code> = app. <code>services/db.js</code> = shared DB. Asli Kubernetes nahi hai; niyam wahi hain. Number har run mein thode alag aayenge.',
      steps: [
        { text: 'DB aur cluster chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/43-health-checks && npm start ex1-deep-shallow', expect: 'ex1-deep-shallow\n[db] :5222\n[cluster] :5221 · kubelet + endpoints + Service' },
        { text: 'Doosre terminal mein: paanchon setup, ek ke baad ek (~2.5 minute).', cmd: 'node tools/dbblip.js', expect: "3 pods (boot 6 s) · 40/s /home + 40/s /orders · 22 s · DB t=6s–11s band\n\nprobe setup                        /home safal   /home (DB band ke dauraan)   /orders safal   pod restarts   DB wapas → /orders theek\nliveness DB check karta hai           59.0%           19.5%                  54.5%          3           5.0 s baad\nsirf readiness DB check karta hai     77.3%           19.5%                  72.8%          0           0.9 s baad\nreadiness yaad se (DB har 2 s)        72.6%           39.5%                  63.6%          0           3.0 s baad\nreadiness DB check + LB fail-open    100.0%          100.0%                  77.3%          0           0.0 s baad\ndono shallow, app khud degrade       100.0%          100.0%                  77.3%          0           0.0 s baad" },
      ],
      observe: {
        q: 'Pehli aur aakhri row mein DB utni hi der band tha. Pehli mein 3 restart hue aur /orders DB ke 5.0 second baad theek hui; aakhri mein 0 restart, aur 0.0 second. Farak kahan se aaya?',
        choices: [
          'Pehle liveness DB se poochhti thi; aakhri setup mein DB ke saath pods restart nahi hue',
          'Pehle DB zyada der band tha; aakhri setup mein DB jaldi lautkar pods ko fail hone se bacha gaya',
          'Pehle DB ka jawab der se aaya; aakhri setup ne fail requests dobara bhejkar kaam kiya',
          'Pehle pods ki ginti kam thi; aakhri setup mein zyada pods ne band DB ka bojh sambhaala',
        ],
        answer: 0,
        explain: 'Dono run mein DB utni hi der band tha. Pehle liveness ne DB ka fail dekhkar teeno pods restart karwaaye; DB aane ke baad bhi pods boot ho rahe the. Aakhri setup mein health DB ko nahi chhooti thi, toh restart aur dobara boot ki deri nahi judi. DB band tha tab /orders dono mein fail hui.',
        choiceExplanations: [
          'Dono run mein DB utni hi der band tha. Pehle liveness ne DB ka fail dekhkar teeno pods restart karwaaye; DB aane ke baad bhi pods boot ho rahe the. Aakhri setup mein health DB ko nahi chhooti thi, toh restart aur dobara boot ki deri nahi judi. DB band tha tab /orders dono mein fail hui.',
          'DB ki gadbad ki muddat dono baar barabar thi. Farak health ke jawab se pods restart hone ka tha.',
          'Dono run mein fail requests dobara bhejne ki setting nahi badli. Health aur restart ka badla niyam nateeja samjhaata hai.',
          'Dono setup mein teen pods hain. Band shared DB ka kaam zyada pods se nahi hota.',
        ],
      },
      lesson: 'Restart sirf us gadbad ka ilaaj hai jo pod ke andar ho.',
    },

    /* ---------------- 4. naapo: teen aur galtiyan ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — bill, dheema boot, aur deploy',
      project: '43-health-checks',
      exercise: 'ex2-probe-load',
      goal: 'Wahi cluster chalta rehne do (pichhle lab ka pehla terminal). Teen tools, teen galtiyan: health ke sawaalon ka bill, boot ka andaaza, aur band hone ka tareeka.',
      why: 'Chaaron exercises ek hi cluster par chalti hain: <code>npm start ex2-probe-load</code>, <code>ex3-startup</code> ya <code>ex4-graceful</code> — teeno wahi do services chalate hain. Number har run mein thode alag aayenge; tarteeb wahi rahegi.',
      steps: [
        { text: 'Cluster band ho, toh pehle chalao.', cmd: 'npm start ex2-probe-load', expect: 'ex2-probe-load\n[db] :5222\n[cluster] :5221 · kubelet + endpoints + Service' },
        { text: 'Bill: har pod ka /readyz har second 4 jagah se (~40 s).', cmd: 'node tools/probeload.js', expect: "5 pods · har pod ka /readyz har second 4 baar (kubelet + LB + mesh + monitoring) · 10 s · app traffic 0\n\nreadiness                        DB queries/second (sirf probes se)   100 pods par (andaaza)\ndeep — har probe par DB                18.5                            370\ncached — har 2 s ek DB check            2.5                            50\nshallow — DB nahi                       0.0                            0" },
        { text: 'Dheema boot: chaar setting (~100 s).', cmd: 'node tools/slowstart.js', expect: "1 pod · 25 s dekha · liveness har 2 s, ek fail = restart · CrashLoopBackOff 0, 1, 2, 4 s (asli: 10, 20, 40 s …)\n\nsetup                                  pehli baar READY   restarts   25 s par haal\nliveness delay 5 s, boot 8 s           kabhi nahi          4     CrashLoopBackOff\nliveness delay 10 s, boot 8 s               8.1 s          0     Running, READY\nliveness delay 10 s, boot 12 s         kabhi nahi          2     Running, NOT READY\nstartupProbe (1 s × 30), boot 12 s         12.1 s          0     Running, READY" },
        { text: 'Deploy: SIGTERM par do tareeke (~25 s).', cmd: 'node tools/rollout.js', expect: "3 pods · rolling restart (maxSurge 1) · 100 req/s /home · Service ko khabar ~1 s der se\n\nSIGTERM par app kya karta hai                 requests   fail   rollout mein laga\nturant exit                                     1018     75     6.2 s\nreadiness 503 + 2 s drain, phir exit            1018      0     6.2 s" },
      ],
      observe: {
        q: 'Rollout wale tool mein dono baar utni hi requests gayi. Ek baar 75 fail hui, ek baar 0. Dono mein app ko SIGTERM mila tha. Farak?',
        choices: [
          'Doosre run mein app khabar pahunchne tak jawab deta raha; phir tay samay par band hua',
          'Doosre run mein app ne SIGTERM ko chhod diya; purane pods band hone ke bajaay chalte rahe',
          'Doosre run mein app par requests dheere aayi; load balancer ko list badalne ka waqt mila',
          'Doosre run mein load balancer turant badla; purana app phir bhi signal par band hua',
        ],
        answer: 0,
        explain: 'Lab mein Service ko khabar lagbhag 1 s der se milti hai. Turant band app par purani list se aayi requests fail hui. Doosra app 2 s tak jawab deta raha, phir band hua. Recorded run mein 75 se 0 fail hue; 2 s har platform ke liye pakka samay nahi.',
        choiceExplanations: [
          'Lab mein Service ko khabar lagbhag 1 s der se milti hai. Turant band app par purani list se aayi requests fail hui. Doosra app 2 s tak jawab deta raha, phir band hua. Recorded run mein 75 se 0 fail hue; 2 s har platform ke liye pakka samay nahi.',
          'App ne signal maana: readiness ne mana kiya aur 2 second baad app band hua. Signal ko chhodkar chalte rehna repair nahi tha.',
          'Dono run mein requests ki raftaar 100/s thi. Traffic dheema nahi hua; app ke band hone ka tareeka badla.',
          'Service ki khabar ki deri dono mein lagbhag 1 second thi. App ne doosre run mein port kuch der khula rakha.',
        ],
      },
      lesson: 'Sawaal saste rakho, shuruaat ke liye alag sawaal rakho, aur band hote waqt khabar pahunchne tak jawab dete raho.',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Health checks ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Health check jitna gehra ho, utna achha: DB, cache, sab check kar lo."', bin: 'myth', explain: 'Gehra check jis cheez ko chhuta hai, us cheez ki gadbad saare pods tak pahunchti hai. Lab: liveness mein DB → 3 restart.' },
        { text: '"Pod ko restart karne se zyadatar gadbad theek ho jaati hai."', bin: 'myth', explain: 'Sirf aisi gadbad jo pod ke andar ho. DB ki gadbad par restart ne outage lamba kiya: /orders DB ke 4.0–5.0 s baad theek (restart ke bina: 0.9 s).' },
        { text: '"/readyz mein DB ka jawab yaad rakh lo, toh shared DB wali dikkat khatam."', bin: 'myth', explain: 'Yaad bill ghatati hai (18.5 → 2.5 queries/second). Par saare pods phir bhi ek saath bahar jaate hain, aur wapsi der se hoti hai: DB ke 2.0–3.0 s baad.' },
        { text: '"initialDelaySeconds badha do — startup probe ki zaroorat nahi."', bin: 'myth', explain: 'Delay ek andaaza hai. Lab: delay 10 s theek chala jab boot 8 s tha; boot 12 s hua toh 2 restart. Startup probe ke saath: 0 restart.' },
        { text: '"SIGTERM par /readyz 503 kar diya — ab app turant band ho sakta hai."', bin: 'myth', explain: '503 kehna khabar bhejna hai; khabar ko pahunchne mein waqt lagta hai. Slow motion: 0.5 s ruke → 14 mein se 1 fail; 2 s ruke → 0.' },
        { text: 'Liveness probe mein DB ya kisi doosri service ka check nahi hona chahiye.', bin: 'true', explain: 'Spring Boot ki documentation bhi yahi kehti hai: liveness bahar ki cheezon par nirbhar na ho, warna us cheez ke girne par saare instances restart ho sakte hain. Lab ne yahi naapa.' },
        { text: 'Kuch load balancer tab saare pods ko traffic bhej dete hain, jab ek bhi pod healthy na ho.', bin: 'true', explain: 'Fail open. AWS load balancer aisa karta hai; Envoy panic threshold (default 50%) ke neeche. Slow motion: /home 26 mein se 26 safal.' },
        { text: 'Jo process gadbad hone par khud crash ho jaata hai, us process ko liveness probe ki utni zaroorat nahi.', bin: 'true', explain: 'Kubernetes ki documentation: process khud crash ho sakta ho, toh liveness probe zaroori nahi — container band hote hi Kubernetes restartPolicy ke hisaab se container ko dobara chala deta hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — design karo',
    instructions: 'Yahan poora design chahiye, aur har hisse ki wajah. 🎤',
    questions: [
      {
        q: '"Ek nayi service ke health checks design karo. Service ek shared database aur ek payment API use karti hai, aur boot mein 20–40 second leti hai."',
        choices: [
          'Liveness app tak rakho, readiness ka kaam socho; shuruaat, bahari gadbad aur band hona bhi sambhaalo',
          'Liveness aur readiness dono se DB aur payment API poochho; boot aur band hona bhi probes par chhod do',
          'Liveness ko lamba delay do aur baaki probes hatao; boot aur deploy dono ka intezaar delay de dega',
          'Health ke raaste jaldi jawab dein toh bas hai; DB aur payment ki request par alag hadd mat rakho',
        ],
        answer: 0,
        explain: 'Liveness ko DB aur payment API se alag rakho. Readiness mein app kya kar sakta hai, sochkar jawab do. 20–40 s boot ke liye naape hue sabse lambe samay se zyada shuruaat ki chhoot rakho, par chhoot seemit ho. Bahari calls ka intezaar seemit rakho aur fail ka jawab sambhaalo. Band hote waqt khabar pahunchne aur chalte kaam poore hone ka samay do.',
        choiceExplanations: [
          'Liveness ko DB aur payment API se alag rakho. Readiness mein app kya kar sakta hai, sochkar jawab do. 20–40 s boot ke liye naape hue sabse lambe samay se zyada shuruaat ki chhoot rakho, par chhoot seemit ho. Bahari calls ka intezaar seemit rakho aur fail ka jawab sambhaalo. Band hote waqt khabar pahunchne aur chalte kaam poore hone ka samay do.',
          'Shared DB ya payment API liveness mein fail ho toh saare pods restart ho sakte hain. Probes khud boot ki chhoot aur band hone ki sahi settings nahi chunte.',
          'Tay delay boot ka andaaza hai. Delay traffic rukne ki khabar aur chalte kaam poore hone ka samay sambhaalne ki jagah nahi leta.',
          'Tez health jawab se user ki DB ya payment request apne aap nahi bachti. Bahari call ki waqt ki hadd aur fail ka jawab alag chahiye.',
        ],
      },
      {
        q: '"Readiness check mein DB tha. DB 30 second ke liye gaya, aur poori site band ho gayi — un pages samet jinhe DB nahi chahiye. Kaise theek karoge?"',
        choices: [
          'Readiness ko pod ke haal se do; DB maangne wale pages DB ki gadbad ka jawab khud dein',
          'Readiness ko aur jaldi poochho; DB fail par poora pod traffic se baahar rakhna jaari rahe',
          'Pods ki ginti badhao; DB fail par har naye pod ko bhi traffic se baahar rakhna jaari rahe',
          'DB ko liveness mein daalo; DB fail par pods restart honge aur saare pages jaldi lautenge',
        ],
        answer: 0,
        explain: 'DB ke bina chalne wale pages bachaane hain toh poore pod ki readiness ko shared DB par nirbhar rakhna dobara socho. DB maangne wale pages 503 dein ya kaam ke mutaabik purana data dikhaayein. Aage ke load balancer ka asli bartav bhi jaancho; fail open har jagah nahi hota.',
        choiceExplanations: [
          'DB ke bina chalne wale pages bachaane hain toh poore pod ki readiness ko shared DB par nirbhar rakhna dobara socho. DB maangne wale pages 503 dein ya kaam ke mutaabik purana data dikhaayein. Aage ke load balancer ka asli bartav bhi jaancho; fail open har jagah nahi hota.',
          'Jaldi poochhne se DB ka fail jaldi dikhega. Shared DB par nirbhar jawab phir bhi saare pods ko bahar karega.',
          'Naye pods bhi band shared DB dekhkar mana karenge. Sirf pods ki ginti badhaane se /home jaise pages nahi bachenge.',
          'Pods restart karne se shared DB ki gadbad theek hone ka bharosa nahi. Ulta pods ke dobara khulne ka intezaar bhi jud sakta hai.',
        ],
      },
      {
        q: '"Liveness probe kab kaam ka hai?"',
        choices: [
          'App chal raha ho par aisa atke ki khud na nikle; restart se nikal sake toh liveness kaam ki hai',
          'DB pal bhar dheema ho toh app restart karna ho; bahar ka intezaar liveness mein bhi ginna chahiye',
          'App thodi der naya kaam na le sake; traffic rokne ke liye liveness fail karwaana chahiye',
          'App ko khulne mein der lage toh baar-baar restart karna ho; liveness se boot tez karna chahiye',
        ],
        answer: 0,
        explain: 'App ka loop atak jaaye aur restart se nikal sake toh liveness kaam aa sakti hai. Par health ka raasta atki hui haalat ko pehchaan bhi sake, tabhi fayda hai. Har gadbad par process khud band ho jaata ho toh liveness probe ki zaroorat kam ho sakti hai.',
        choiceExplanations: [
          'App ka loop atak jaaye aur restart se nikal sake toh liveness kaam aa sakti hai. Par health ka raasta atki hui haalat ko pehchaan bhi sake, tabhi fayda hai. Har gadbad par process khud band ho jaata ho toh liveness probe ki zaroorat kam ho sakti hai.',
          'Bahar ka DB pal bhar dheema hone par app restart karna DB ka ilaaj nahi. Liveness mein DB jodne se aur pods gir sakte hain.',
          'App abhi kaam na le sake toh readiness se traffic rok sakte ho. Liveness fail ka kaam restart hai.',
          'Sahi boot ko poora hone ki chhoot chahiye. Startup probe boot bachata hai; baar-baar restart se boot phir shuru hoga.',
        ],
      },
    ],
  },
  success: [
    'Kisi bhi gadbad ke liye bata sakte ho: liveness mein, readiness mein, ya request ke jawab mein — aur kyun',
    'Readiness mein shared cheez rakhne ka faisla do sawaalon se kar sakte ho: app us cheez ke bina kya kar sakta hai, aur aage kaunsa load balancer hai',
    'Chaar aam galtiyan aur har galti ka naapa hua nateeja bata sakte ho',
  ],
  cards: [
    { front: 'Kaunsi gadbad kis sawaal mein?', back: 'Pod ke andar, khud theek nahi hogi → <b>"zinda ho?"</b> (restart). Pod theek, abhi nahi le sakta → <b>"traffic bhejein?"</b>. Pod ke bahar (DB, doosri service) → <b>request ka jawab</b> (503, timeout, breaker).' },
    { front: 'Readiness mein shared DB: kab theek?', back: 'Jab app us DB ke bina sirf error hi de sakta ho (strict dependency). Tab bhi yaad rakho: DB girte hi saare pods ek saath bahar honge, aur wapsi der se hogi. Load balancer fail open kare toh sab bahar hone par bhi traffic chalta rehta hai — par fail open shart nahi, alag faisla hai. Lab: yaad se 2.0–3.0 s · health mein DB nahi 0.0 s.' },
    { front: 'Health ke sawaalon ka bill?', back: 'Lab, 5 pods × 4 poochhne wale: har sawaal par DB 18.5 q/s · yaad se 2.5 · DB nahi 0. 100 pods par andaaza: ~370 / ~50 / 0.' },
    { front: 'Chaar galtiyan?', back: 'Liveness mein DB (3 restart) · readiness mein shared DB (/home 17.5–19.5%) · boot ka andaaza (2 restart) · SIGTERM par turant band (75 fail har deploy).' },
    { front: 'Liveness probe kab chahiye?', back: 'Jab app "chal raha hai par kaam nahi ho raha" wali haalat mein phans sakta ho (deadlock). Process khud crash ho jaata ho, toh utna zaroori nahi (Kubernetes docs).' },
  ],
},
]);

})();
