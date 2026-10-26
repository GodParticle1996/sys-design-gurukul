/* =====================================================================
   🛡️ Playlist · 1 Resilience — Disaster Recovery · level 4: LIBRARY (AWS ki documentation)
   Wahi chaar tareeke, AWS ke naam ke saath: DR whitepaper ke chaar naam, Route 53 ka health check aur TTL,
   S3 ke delete markers aur versioning, Aurora Global Database.
   Kya documentation se hai, kya lab se:
     - AWS ki har baat: AWS ke official pages se (quote aur URL lab ke README.md mein). Is lab mein AWS CHALAYA NAHI GAYA.
     - "hisaab" likha ho: documentation ke number se nikala hua hisaab, naapa hua nahi.
     - Lab ke number: docker-labs/40-disaster-recovery ke asli run se (slow motion: tools/slowmo*.js; asli raftaar: tools/dr.js).
     - Aakhri stage: tools/dr.js lab ke apne router aur regions par chalta hai. Woh AWS nahi hai.
   ===================================================================== */
(function () {

const HERO = [
  { id: 'lab', icon: '🧪', label: 'lab ke mode', x: 140, y: 105 },
  { id: 'aws', icon: '☁️', label: 'AWS ke naam', x: 445, y: 105 },
  { id: 'dflt', icon: '📖', label: 'defaults', x: 750, y: 105 },
];

VISUALS['dr-lib'] = {
  t: 'Wahi chaar tareeke, AWS ke naam ke saath. Naam aur defaults documentation se hain — is lab mein AWS chalaya nahi gaya',
  html: SD.viz.svg(HERO, [{ from: 'lab', to: 'aws' }, { from: 'aws', to: 'dflt' }], {
    nodes: { lab: { tone: 'ok', badge: 'chalaya aur naapa' }, aws: { tone: 'acc', badge: 'documentation se' }, dflt: { tone: 'slow', badge: 'hisaab, naapa nahi' } },
    flows: [{ from: 'lab', to: 'aws', label: 'naam', tone: 'acc' }, { from: 'aws', to: 'dflt', label: 'defaults', tone: 'slow' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'dr-lib',
  icon: '☁️',
  group: '🌋 Disaster Recovery',
  title: 'Disaster Recovery 4 · Setup — AWS mein yeh chaar tareeke',
  badge: 'Cloud Sipahi',
  objectives: [
    'Lab ke chaar mode (B mein kuch nahi · DB · DB + chhota app · poora region) ko AWS ki documentation kya naam deti hai?',
    'Pilot light aur warm standby mein farak kya hai — documentation ke apne shabdon mein?',
    'Route 53 ke health check ki default settings se pata chalne ka hisaab kitna banta hai, aur lab ke router se kitna alag?',
    'S3 replication mein DELETE destination tak pahunchta hai ya nahi — aur replication backup ki jagah kyun nahi le sakti?',
  ],
  lesson: [
    `<h3>☁️ Lab ka router 1.50 s mein jaan leta tha. Route 53 ke defaults kya kehte hain?</h3>
     <p><b>Yeh poora level AWS ki official documentation se hai. Is lab mein AWS chalaya nahi gaya.</b> Jo number lab ke apne run se hain, un par "lab" likha hai.</p>
     <p>Level 1 se 3 mein tumne region B ke chaar tareeke dekhe, aur router ka "lagataar 3 fail" wala niyam. AWS ki documentation inhi cheezon ko naam aur default settings deti hai. Default = jo setting tumne likhi nahi, par jo phir bhi lagu hoti hai.</p>
     <ul>
       <li><b>Lab ka router:</b> 0.5 s × 3 = 1.50 s (lab, slow motion mein naapa).</li>
       <li><b>Route 53, jo setting likhi nahi:</b> 30 s × 3 = lagbhag 90 s — sirf <b>hisaab</b>, documentation ke defaults se. Actual detection ka samay ya upper limit nahi.</li>
     </ul>
     <p class="tip">👉 Is level mein teen jagah: AWS ke chaar naam, Route 53 ke health check aur TTL, aur S3 / Aurora ke delete aur replication.</p>`,
  ],
  stages: [
    /* ---------------- 1. AWS ke chaar naam ---------------- */
    {
      type: 'cards',
      title: '☁️ AWS ke chaar naam — jo tumne lab mein dekha',
      goal: '<b>Yeh AWS ki official documentation se hai; is lab mein AWS chalaya nahi gaya.</b> Chaar chhote cards. Jo number lab ke hain, un par "lab" likha hai. Source: <a href="https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" target="_blank" rel="noopener">AWS DR whitepaper</a>.',
      steps: [
        {
          title: '1. Lab ke chaar mode ko AWS mein kya kehte hain?',
          say: `Level 1 se tum region B mein chaar cheezein rakh ke dekh chuke ho. AWS ki documentation inhi chaar ko naam deti hai:
            <div class="dr-scroll"><table>
              <tr><th>Lab mein B mein aam din</th><th>AWS ka naam</th><th>Lab ka RTO (slow motion)</th></tr>
              <tr><td>kuch nahi, sirf S3 jaisa local bucket</td><td>Backup and restore</td><td>7.50 s</td></tr>
              <tr><td>DB chalu, app band</td><td>Pilot light</td><td>4.50 s</td></tr>
              <tr><td>DB + chhota app</td><td>Warm standby</td><td>3.50 s</td></tr>
              <tr><td>poora region, aadha traffic</td><td>Multi-site active/active</td><td>1.50 s</td></tr>
            </table></div>
            Documentation ke mutabiq: backups se shuru karke kai active Regions tak chaar tareeke hain. Kharcha aur complexity badhte hain. Upar ke seconds lab ke hain, AWS ke nahi.`,
        },
        {
          title: '2. Sabse sasta tareeka: B mein kuch nahi. Documentation kya kehti hai?',
          say: `Lab ke backup mode mein region B mein kuch nahi tha. Failover ke baad B banane mein 6.00 s lage (slow motion), phir local bucket se restore. Documentation ke mutabiq:
            <ul>
              <li>Recovery Region mein infrastructure, configuration aur app code dobara deploy karna padta hai.</li>
              <li>Failover par backup se data restore karna padta hai.</li>
              <li>Backup kitni baar liya, usse tay hota hai ki kitna naya data wapas mil sakega.</li>
            </ul>
            Lab ke slow motion mein backup har 3 s par tha. #7–#9 snapshot mein nahi the: 3 orders kho gaye.`,
        },
        {
          title: '3. Pilot light ya warm standby? Documentation ka apna fark',
          say: `Lab mein dono mein B ka DB chalu tha. Farak: pilot light mein app band, warm standby mein chhota app chalu.<br><br>
            Documentation ke mutabiq:
            <ul>
              <li><b>Pilot light:</b> requests lene se pehle servers chalu karo. Kuch aur infrastructure deploy karna bhi pad sakta hai. Phir scale up.</li>
              <li><b>Warm standby:</b> chhoti capacity par traffic abhi le sakta hai. Sab deployed aur chal raha hai; full load ke liye scale up karo.</li>
            </ul>
            Lab ke slow motion mein: pilot light ka app 3.00 s mein boot hua (RTO 4.50 s). Warm standby ka chhota app 2.00 s mein bada hua (RTO 3.50 s).`,
          ask: {
            q: 'Region B mein DB chalu hai, aur ek chhota par poora chalta app bhi: sab deploy ho chuka hai. Failover par documentation ke mutabiq kya karna baaki hai?',
            choices: ["Warm standby: deployed app ko scale up karo","Pilot light: missing app pehle deploy/start karo","Backup restore: DB snapshot pehle restore karo","Active-active: B pehle se production load le raha"],
            answer: 0,
            hint: 'Documentation ka fark dekho: "turn on" karna padta hai, ya sirf "scale up"? B mein app pehle se chal raha hai ya band hai?',
            explain: "Given complete running scaled-down app warm standby ke description se match karti hai. Pilot light mein full working app ready nahi hoti. Already running replicated DB snapshot-restore-only design nahi. Scenario B ko active traffic serve karta nahi batata.",
           choiceExplanations: ["Given complete running scaled-down app warm standby ke description se match karti hai.","Pilot light mein full working app ready nahi hoti.","Already running replicated DB snapshot-restore-only design nahi.","Scenario B ko active traffic serve karta nahi batata."] },
        },
        {
          title: '4. Sabse mehenga tareeka: kya data phir bhi jaata hai?',
          say: `Lab ke active-active mode mein B pehle se poora chal raha tha, aur aadha traffic le raha tha. Documentation ke mutabiq:
            <ul>
              <li>In chaar strategies mein active/active sabse complex aur mehenga hai.</li>
              <li>Sahi technology aur implementation se kai disasters mein recovery time near zero ho sakta hai.</li>
              <li>Async copy se RPO near zero ho sakta hai. Data corruption mein backup phir bhi chahiye.</li>
            </ul>
            Dhyaan do: "near zero", zero nahi. Lab ne dikhaya: copy async hai, toh <code>waiting</code> list ban sakti hai (level 3).<br><br>
            Lab: slow motion mein #9 kho gaya, RTO 1.50 s. Asli raftaar (teen run): RTO 1.0–1.5 s, 2–3 orders kho gaye.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> pilot light mein traffic lene se pehle app chalu karo. Warm standby chhoti capacity par traffic le sakta hai. Active/active bhi zero data loss ki guarantee nahi.',
    },

    /* ---------------- 2. Route 53: health check, hisaab, TTL ---------------- */
    {
      type: 'cards',
      title: '🧭 Route 53: health check, hisaab aur TTL',
      goal: '<b>Yeh AWS ki official documentation se hai; is lab mein AWS chalaya nahi gaya.</b> Teen cards. Hisaab naapa hua number nahi hai. Sources: <a href="https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html" target="_blank" rel="noopener">health check defaults</a> · <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html" target="_blank" rel="noopener">kai checkers ka faisla</a> · <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html" target="_blank" rel="noopener">TTL</a>.',
      steps: [
        {
          title: '1. RTO ki ginti mein pata chalna bhi aata hai?',
          say: `Documentation ke mutabiq business do limits tay karta hai:
            <ul>
              <li><b>RTO:</b> service rukne se wapas chalne tak kitni der manzoor hai?</li>
              <li><b>RPO:</b> aakhri recovery point ke baad kitne waqt ka data khona manzoor hai?</li>
            </ul>
            RTO ki ghadi service rukte hi shuru hoti hai. Pata chalna, team ko khabar, escalation aur disaster declare karna bhi planning mein gino.<br><br>
            Lab mein pilot light ka RTO 4.50 s = 1.50 s pata chalna + 3.00 s B ka app boot. Par lab mein "pata chalna" sirf router ka health check tha. Khabar dena, aage badhana, declare karna lab mein the hi nahi.`,
        },
        {
          title: '2. Route 53 ka health check: kitni der mein pata chalega?',
          say: `Chowkidar har kuch der par dukaan dekhe; teen baar band mile tab khabar kare. Lab ka router bhi ek checker tha: har 0.5 s par poochho, lagataar 3 fail.<br><br>
            Route 53 ki documentation mein:
            <ul>
              <li><b>RequestInterval</b>: har checker ke checks ka fasla. Default <b>30 seconds</b>; doosra option <b>10 seconds</b>.</li>
              <li><b>FailureThreshold</b>: lagataar kitne health check pass ya fail hon, tab Route 53 endpoint ki status badalta hai. Default <b>3</b>. Valid range 1 se 10.</li>
            </ul>
            Fast (10 s) ka extra charge hai, documentation ke mutabiq.
            <div class="dr-scroll"><table>
              <tr><th>Kaun</th><th>Fasla × hadd</th><th>Lab ya hisaab?</th></tr>
              <tr><td>Lab ka router</td><td>0.5 s × 3</td><td>1.50 s (lab, slow motion) · RTO 1.0–1.5 s (lab, active-active, asli raftaar, teen run)</td></tr>
              <tr><td>Route 53, defaults</td><td>30 s × 3</td><td>lagbhag 90 s (<b>hisaab</b>)</td></tr>
              <tr><td>Route 53, Fast (10 s), threshold 3</td><td>10 s × 3</td><td>lagbhag 30 s (<b>hisaab</b>)</td></tr>
            </table></div>
            <b>Yeh sirf fasla × hadd ka hisaab hai.</b> Actual detection ka samay ya upper limit nahi. Route 53 kai jagahon ke checkers ke results jodta hai. Check kis pal fail hua aur response mein kitni der lagi, woh bhi farak daalte hain. Lab ka ek router yeh poori vyavastha nahi chalata.`,
          ask: {
            q: 'Route 53 ke defaults ka 30 s × 3 = 90 s wala hisaab kya batata hai?',
            choices: ["Rough settings estimate; measured failover guarantee nahi","Har client exactly 90 s par naya answer use karega","Endpoint health total 90 s mein guaranteed badlegi","Complete app recovery budget precisely 90 s hoga"],
            answer: 0,
            hint: 'Lagataar kitne health check fail hone chahiye? Do check ke beech kitna fasla hai? (Dono default hain.)',
            explain: "Interval × threshold planning intuition hai; distributed detection, recovery readiness aur caches actual result badalte hain. Client caches independent timing follow karte hain. Multiple checkers aur sampling phase detection ko affect karte hain. App recovery DNS detection se zyada steps include karti hai.",
           choiceExplanations: ["Interval × threshold planning intuition hai; distributed detection, recovery readiness aur caches actual result badalte hain.","Client caches independent timing follow karte hain.","Multiple checkers aur sampling phase detection ko affect karte hain.","App recovery DNS detection se zyada steps include karti hai."] },
        },
        {
          title: '3. Failover ke baad bhi grahak purane pate par: TTL',
          say: `Level 2 mein dekha: B tayyar ho tab bhi grahak purane pate par reh sakta hai. Documentation ke mutabiq lamba TTL ho toh DNS resolver purana jawab zyada der cache mein rakhta hai. Naya IP der se asar karta hai.<br><br>
            Lab ke model mein yaad grahak ke paas thi; documentation recursive resolvers ke cache ki baat karti hai. Dono jagah sawaal ek hi hai: purana pata kitni der yaad rakha jaata hai.<br><br>
            Lab ka model (asli DNS nahi): TTL 6 s → 27 orders fail; TTL 1 s → 8 orders. Sabse der se lauta grahak: jawab badalne ke 5.50 s baad, ya 0.50 s baad. Model mein grahak TTL ko theek utna hi maante hain. Asli resolver ya app TTL se zyada der yaad rakhte hain ya nahi, yeh humne nahi dekha.`,
          ask: {
            q: 'Failover wale record ko health check se jodna hai. Documentation TTL ke baare mein kya kehti hai?',
            choices: ["TTL 60 s ya kam recommend; cache delay ghataao","TTL 300 s ya zyada recommend; failover tez hoga","TTL ko fixed 0 rakho; isi se checks enable hote","TTL aur health configuration ko independent maano"],
            answer: 0,
            hint: 'Lamba TTL ho toh purana pata cache mein kitni der rehta hai? Failover ke baad grahak ko naya pata kab milega?',
            explain: "Route 53 failover-record guidance short TTL, 60 seconds or less, recommend karti hai; actual clients phir bhi measure karo. Longer cache retention new route adoption ko delay kar sakti hai. Zero TTL health-check enablement ki requirement nahi. TTL cached DNS answers ke update timing ko affect karta hai.",
           choiceExplanations: ["Route 53 failover-record guidance short TTL, 60 seconds or less, recommend karti hai; actual clients phir bhi measure karo.","Longer cache retention new route adoption ko delay kar sakti hai.","Zero TTL health-check enablement ki requirement nahi.","TTL cached DNS answers ke update timing ko affect karta hai."] },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> RTO mein pata chalna aur purane DNS cache ka intezaar bhi gino. 30 × 3 = 90 s rough hisaab hai; apne setup ka measured failover samay alag se naapo.',
    },

    /* ---------------- 3. S3 aur Aurora ---------------- */
    {
      type: 'cards',
      title: '🗄️ S3 aur Aurora: copy, delete aur backup',
      goal: '<b>Yeh AWS ki official documentation se hai; is lab mein AWS chalaya nahi gaya.</b> Chaar cards. Sources: <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html" target="_blank" rel="noopener">S3 delete rules</a> · <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html" target="_blank" rel="noopener">versioning</a> · <a href="https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html" target="_blank" rel="noopener">Aurora failover</a>.',
      steps: [
        {
          title: '1. Replication akela backup kyun nahi?',
          say: `Lab ke slow motion 4 mein replica DELETE bhi copy kar deta tha: 8.00 s par B ke 14 orders gaye.<br><br>
            Documentation ke mutabiq deletion ya corruption doosri copy tak bhi pahunch sakti hai. Sirf replication par mat ruko: purane waqt par lautne ke liye backup, versioning ya point-in-time recovery bhi chahiye.<br><br>
            Lab mein point-in-time backup ka kaam snapshot ne kiya: 12 orders wapas aaye, #13–#16 (4 orders) nahi.`,
        },
        {
          title: '2. S3 mein DELETE copy hota hai ya nahi?',
          say: `Lab ka replica DELETE copy kar deta tha. S3 mein version ID diye bina delete karne par ek <b>delete marker</b> lagta hai: object ko permanently hatane ki jagah "deleted" ka nishaan.<br><br>
            Documentation ka default: marker sirf source bucket mein lagta hai. Par jawab <b>replication configuration ke version</b> par nirbhar hai:
            <div class="dr-scroll"><table>
              <tr><th>Replication configuration</th><th>Delete marker</th></tr>
              <tr><td>Latest version (rule mein <code>Filter</code> element diya hai)</td><td>Default mein <b>replicate nahi</b> hota. Non-tag-based rules mein delete marker replication jod sakte ho.</td></tr>
              <tr><td><code>Filter</code> element nahi diya (S3 ise V1 maanta hai)</td><td>User ke action se bane markers <b>replicate hote hain</b>. Lifecycle action se bane markers nahi.</td></tr>
            </table></div>
            Do aur vaakya, alag-alag:
            <ul>
              <li>Delete marker replication on ho, toh markers destination mein copy hote hain, aur S3 aise behave karta hai jaise object dono buckets mein delete hua.</li>
              <li>Delete request mein object version ID di ho, toh source mein sirf diya hua version delete hota hai, par deletion destination mein replicate nahi hoti.</li>
            </ul>`,
          ask: {
            q: 'Same-account setup: X ke replication rule mein <code>Filter</code> hai; Y ke rule mein nahi. Dono mein user ne version ID diye bina object delete kiya. Delete marker replication alag se on nahi hai. Marker kiske destination tak jaayega?',
            choices: ["Y ke user delete markers; X par default disabled","Dono ke markers; Filter se behavior nahi badalta","X ke markers; latest format V1 ko supersede karta","Kisi ke markers nahi; replication sirf create leti"],
            answer: 0,
            hint: 'Table dekho: <code>Filter</code> element na ho toh S3 kaunsa version maanta hai, aur us version ki delete marker wali line kya kehti hai?',
            explain: "Filter-bearing latest format mein default marker replication off hai; V1 user-created markers replicate karta hai. Format/configuration yahan relevant distinction hai. Latest format opt-in marker rules require karta hai. V1 user marker behavior blanket no-delete rule ko galat banata hai.",
           choiceExplanations: ["Filter-bearing latest format mein default marker replication off hai; V1 user-created markers replicate karta hai.","Format/configuration yahan relevant distinction hai.","Latest format opt-in marker rules require karta hai.","V1 user marker behavior blanket no-delete rule ko galat banata hai."] },
        },
        {
          title: '3. S3 Versioning: galti se kaun bachata hai?',
          say: `Lab mein galti (DELETE) se bachaya snapshot ne. Documentation ke mutabiq S3 Versioning purane versions rakhti hai: accidental delete ya overwrite se wapas aa sakte ho.<br><br>
            Version ID diye bina DELETE ho toh marker lagta hai; purana version permanently nahi mitta. <b>Versioning default mein disabled hai.</b> Khud enable karni padti hai.<br><br>
            Lab mein galti 7.75 s par hui, 10.25 s par pakdi gayi. Restore galti se pehle ke 6.00 s wale snapshot se aaya.`,
        },
        {
          title: '4. Ek database ka feature: kitna data jaata hai?',
          say: `Aurora Global Database data doosre Regions mein copy karta hai. Documentation ke mutabiq:
            <ul>
              <li>RTO minutes ke paimaane par ho sakta hai.</li>
              <li>Unplanned failover mein RPO aam taur par seconds mein, zero se zyada hota hai.</li>
              <li>Kitna data gaya, yeh failure ke waqt Regions ke beech replication lag par nirbhar hai.</li>
            </ul>
            Planned <b>switchover</b> alag hai: pehle secondary ko sync karte hain, isliye RPO 0. Unplanned failover ko woh guarantee mat do.<br><br>
            Lab mein replication lag ka kaam <code>waiting</code> list karti thi: failure ke pal par jitne order waiting mein, utne gaye. Copy har 300 ms par bhi 5 orders gaye (lab, asli raftaar, teen run).`,
          ask: {
            q: 'Aurora Global Database ki documentation ke mutabiq, failure ke baad kitna data gaya — is nuksaan ki matra kis par nirbhar hai?',
            choices: ["Failure ke waqt cross-region replication lag","Primary backup ki daily creation duration","Secondary app instances ki available CPU","DNS health interval ka configured threshold"],
            answer: 0,
            hint: 'Lab mein kho gaye orders kis cheez ne tay kiye the? Copy ke intezaar mein jo list thi, usne.',
            explain: "Aurora unplanned cross-region failover mein outstanding replication lag lost data ko determine karta hai. Backup schedule live global replication lag ka same metric nahi. App CPU data already shipped ka direct measure nahi. Detection routing timing hai; outstanding replica bytes ka replacement nahi.",
           choiceExplanations: ["Aurora unplanned cross-region failover mein outstanding replication lag lost data ko determine karta hai.","Backup schedule live global replication lag ka same metric nahi.","App CPU data already shipped ka direct measure nahi.","Detection routing timing hai; outstanding replica bytes ka replacement nahi."] },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> purane waqt par lautne ka intezaam rakho. S3 ke DELETE ke liye configuration ka version dekho. Aurora ke unplanned failover mein replication lag se data ja sakta hai.',
    },

    /* ---------------- 4. ex1-dr-tiers: asli services par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — wahi chaar tareeke, asli services par',
      project: '40-disaster-recovery',
      exercise: 'ex1-dr-tiers',
      goal: 'Ab chaar tareeke ek hi tool mein, asli raftaar par: 50 orders/second, aur 4 second par region A khatam. <b>Yahan AWS nahi hai</b> — lab ke apne router, region A, region B (aur S3 jaisa ek bucket) tumhari machine par chalte hain. AWS ke naam sirf lab ke mode par lage hain.',
      why: 'Do terminal chahiye: ek mein services (chalti rehti hain), doosre mein tool. Docker nahi chahiye — sirf Node 18+ (docker-compose.yml lab mein hai, par chala ke nahi dekhi gayi). Neeche ka output teen run mein se ek ka hai; number har run mein thode badalte hain, kram wahi rehta hai.',
      steps: [
        { text: 'Pehle terminal mein services chalao (router, region A, region B). Services chalti rehti hain; band karne ke liye Ctrl+C.', cmd: 'cd docker-labs/40-disaster-recovery && npm start ex1-dr-tiers' },
        { text: 'Doosre terminal mein tool chalao. Chaaron tareeke ek-ek karke chalte hain, isliye kuch der lagegi. Table ke "aam din B mein chalu" aur "fail hote rahe (RTO)" columns saath padho.', cmd: 'cd docker-labs/40-disaster-recovery && node tools/dr.js', expect: "50 orders/s · t=4s par region A khatam · health check 500 ms × 3 = 1.5 s mein pata chalta hai\n\nstrategy                    aam din B mein chalu               fail hote rahe (RTO)   fail orders   \"ho gaya\" par kho gaye (RPO)\nbackup & restore            sirf S3 snapshots (har 3 s)            16.3 s             680            50 / 295\npilot light                 DB (replica) chalu, app band            6.4 s             283             5 / 295\nwarm standby                DB + chhota app (25%)                   4.0 s             112             5 / 370\nmulti-site active-active    poora region, aadha traffic             1.5 s              36             3 / 331" },
      ],
      observe: {
        q: 'Table ko upar se neeche padho: backup & restore, pilot light, warm standby, multi-site active-active. "Aam din B mein chalu" aur "fail hote rahe (RTO)" columns saath dekhne par kya dikhta hai?',
        choices: ["Zyada ready standby se RTO kam; ongoing cost badhe","Standby ready hone se RPO aur RTO dono zero honge","Ready app zyada ho toh recovery steps bhi zyada honge","Sab strategies ka measured recovery time same hoga"],
        answer: 0,
        explain: "Table preparedness aur recurring resource cost ke recovery-time tradeoff ko illustrate karti hai; no universal SLA. Data-copy acknowledgment aur conflicts separate concerns hain. Prestarted components generally start/deploy work reduce karte hain. Strategies ka purpose recovery readiness ka different balance hai.",
       choiceExplanations: ["Table preparedness aur recurring resource cost ke recovery-time tradeoff ko illustrate karti hai; no universal SLA.","Data-copy acknowledgment aur conflicts separate concerns hain.","Prestarted components generally start/deploy work reduce karte hain.","Strategies ka purpose recovery readiness ka different balance hai."] },
      lesson: 'B mein jitna zyada pehle se chalu rakhoge, RTO utna chhota aur roz ka kharcha utna zyada; AWS ke chaar naam isi kram ke chaar mode hain.',
    },
  ],
  interview: {
    title: 'Interview Round — documentation padhna',
    instructions: 'Interviewer dekhna chahta hai ki tum AWS ke naam, defaults aur documentation ke vaakya sahi padhte ho — aur hisaab ko naapa hua number nahi batate. 🎤',
    questions: [
      {
        q: '"Humare service ka RTO target 30 second hai. Failover Route 53 health check se hoga, aur hamne health check ki settings mein kuch likha nahi. Kya dikkat hai?"',
        choices: ["Full recovery measure karo; defaults 30 s prove nahi","Default threshold 3 ko 3-second recovery samjho","Fast check use karo; 30 s end-to-end guaranteed hai","Threshold 10 karo; detection speed improve hogi"],
        answer: 0,
        explain: "Default checks roughly 30 s interval aur threshold 3 hain; full RTO readiness plus DNS/client behavior se verify hota hai. Threshold failure count hai, seconds nahi. Fast interval bhi complete recovery guarantee nahi deta. Higher failure count aam taur par detection ko delay karta hai.",
       choiceExplanations: ["Default checks roughly 30 s interval aur threshold 3 hain; full RTO readiness plus DNS/client behavior se verify hota hai.","Threshold failure count hai, seconds nahi.","Fast interval bhi complete recovery guarantee nahi deta.","Higher failure count aam taur par detection ko delay karta hai."] },
      {
        q: '"Humne S3 replication laga di hai. Kisi ne galti se source bucket ke objects delete kar diye. Kya destination bucket mein data bacha rahega?"',
        choices: ["Rule format, marker config aur versioned delete dekho","Replication configured hai toh har delete mirror hogi","Destination alag hai toh har delete se safe rahega","Lifecycle marker hi user marker ki tarah replicate hai"],
        answer: 0,
        explain: "S3 deletion semantics operation aur replication rule version par depend karti hain; separate recovery/version protection review karo. Version-ID deletes aur markers ke documented rules different hain. Configuration-independent protection claim nahi kar sakte. Lifecycle-created markers ka default V1 behavior user deletes jaisa nahi.",
       choiceExplanations: ["S3 deletion semantics operation aur replication rule version par depend karti hain; separate recovery/version protection review karo.","Version-ID deletes aur markers ke documented rules different hain.","Configuration-independent protection claim nahi kar sakte.","Lifecycle-created markers ka default V1 behavior user deletes jaisa nahi."] },
    ],
  },
  success: [
    'AWS ke chaar naam (backup and restore · pilot light · warm standby · multi-site active/active) lab ke chaar mode se jod sakte ho, aur pilot light aur warm standby ka documented fark bata sakte ho',
    'Route 53 health check ke defaults ka rough hisaab laga sakte ho — aur jaante ho ki actual detection ya failover ka samay apne setup par naapna padta hai',
    'S3 mein DELETE ka replicate hona configuration ke version ke hisaab se alag hai, aur replication ke saath versioning ya point-in-time recovery chahiye — documentation ke shabdon mein bata sakte ho',
  ],
  cards: [
    { front: 'AWS ke chaar naam, lab ke chaar mode? (docs)', back: 'Backup and restore (B mein kuch nahi) · Pilot light (DB chalu, app band) · Warm standby (DB + chhota app) · Multi-site active/active (poora region). Documentation kharche aur complexity ka kram kehti hai: backups sabse sasta aur saral, kai active Regions sabse complex. Lab RTO (slow motion): 7.50 · 4.50 · 3.50 · 1.50 s.' },
    { front: 'Pilot light aur warm standby mein farak? (docs)', back: 'Pilot light: servers "switched off"; request lene se pehle "turn on", shayad aur infrastructure deploy, phir scale up. Warm standby: scaled down par poori tarah chalti copy; reduced capacity par turant traffic le sakta hai, sirf scale up.' },
    { front: 'Route 53 health check ke defaults, hisaab aur TTL? (docs)', back: 'RequestInterval 30 s (doosra option 10 s) · FailureThreshold 3 (1–10). Rough hisaab: 30 × 3 = 90 s; Fast par 10 × 3 = 30 s (extra charge). Detection ya failover ki guarantee nahi: kai checkers ke results judte hain. Health check wale record ka TTL: 60 s ya kam.' },
    { front: 'S3 mein DELETE destination tak jaata hai? (docs)', back: 'Configuration ke version par nirbhar. Latest (Filter element): delete marker default mein replicate nahi (jod sakte ho). Filter nahi (V1): user ke delete ke markers replicate, lifecycle ke nahi. Version ID dekar delete: destination tak nahi. Versioning default mein disabled.' },
    { front: 'Replication backup ki jagah kyun nahi le sakti? (docs)', back: 'Delete aur corruption jaise destructive changes secondary par bhi replicate ho sakte hain. Documentation: versioning ya point-in-time recovery bhi chahiye. Lab: 8.00 s par B ke 14 orders gaye; snapshot se 12 wapas aaye, #13–#16 nahi.' },
  ],
},
]);

})();
