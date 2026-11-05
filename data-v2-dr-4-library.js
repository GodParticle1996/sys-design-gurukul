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
  title: 'Disaster Recovery 4 · Setup — AWS mein chaar tareeke',
  badge: 'Cloud Sipahi',
  objectives: [
    'Lab ke chaar mode (B mein kuch nahi · DB · DB + chhota app · poora region) ko AWS ki documentation kya naam deti hai?',
    'Pilot light aur warm standby mein farak kya hai — documentation ke apne shabdon mein?',
    'Route 53 ke health check ki default settings se pata chalne ka hisaab kitna banta hai, aur lab ke router se kitna alag?',
    'S3 replication mein DELETE destination tak pahunchta hai ya nahi — aur replication backup ki jagah kyun nahi le sakti?',
  ],
  lesson: [
    `<h3>☁️ Lab ka router 1.50 s mein jaan leta tha. Route 53 ke defaults kya kehte hain?</h3>
     <p><b>Poora level AWS ki official documentation se hai. Is lab mein AWS chalaya nahi gaya.</b> Jo number lab ke apne run se hain, un par "lab" likha hai.</p>
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
      goal: '<b>Cards AWS ki official documentation se hain; is lab mein AWS chalaya nahi gaya.</b> Chaar chhote cards. Jo number lab ke hain, un par "lab" likha hai. Source: <a href="https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" target="_blank" rel="noopener">AWS DR whitepaper</a>.',
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
              <li>Backup kitni baar liya, isi ginti se tay hota hai ki kitna naya data wapas mil sakega.</li>
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
            q: 'B aam din traffic nahi leta. B ka DB aur chhota poora app chalu hain, sab deploy hai. Poora traffic lene ki taiyaari mein kya baaki hai?',
            choices: [
              'Warm standby: chalti hui app ki capacity badhao, taaki poora traffic le sake',
              'Pilot light: band app ko chalu karo, phir capacity badhao taaki traffic le sake',
              'Backup restore: DB pehle banao, phir snapshot laao taaki app traffic le sake',
              'Active-active: dono taraf chal rahe traffic ka A wala hissa bhi B ko de do',
            ],
            answer: 0,
            hint: 'B par kaunsa kaam pehle se ho chuka hai: app chalu karna, ya sirf capacity badhana?',
            explain: 'AWS warm standby ko chhoti capacity par poora chalta system batata hai. App pehle se deployed aur chalu hai; poori capacity ke liye scale up baaki hai. Pilot light ko requests lene se pehle kuch chalu ya deploy karna padta hai. B aam din traffic nahi le raha, toh active-active nahi diya gaya.',
            choiceExplanations: [
              'AWS warm standby ko chhoti capacity par poora chalta system batata hai. App pehle se deployed aur chalu hai; poori capacity ke liye scale up baaki hai. Pilot light ko requests lene se pehle kuch chalu ya deploy karna padta hai. B aam din traffic nahi le raha, toh active-active nahi diya gaya.',
              'Pilot light mein poora chalta app abhi tayyar nahi. Sawaal mein B ka app pehle se poora chalu hai.',
              'B ka DB pehle se chalu aur data ki copy le raha hai. DB banana aur snapshot se shuru karna is setup ka baaki kaam nahi.',
              'Active-active mein B aam din bhi production traffic leta hai. Sawaal mein B abhi standby hai.',
            ],
          },
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
      goal: '<b>Cards AWS ki official documentation se hain; is lab mein AWS chalaya nahi gaya.</b> Teen cards. Hisaab naapa hua number nahi hai. Sources: <a href="https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html" target="_blank" rel="noopener">health check defaults</a> · <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html" target="_blank" rel="noopener">kai checkers ka faisla</a> · <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html" target="_blank" rel="noopener">TTL</a>.',
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
            <b>Number sirf fasla × hadd ka hisaab hai.</b> Actual detection ka samay ya upper limit nahi. Route 53 kai jagahon ke checkers ke results jodta hai. Check kis pal fail hua aur response mein kitni der lagi, dono bhi farak daalte hain. Lab ka ek router Route 53 ki poori vyavastha nahi chalata.`,
          ask: {
            q: 'Route 53 defaults ke liye 30 s ko 3 se guna kiya. Nikle hue 90 s ko kis tarah samjhoge?',
            choices: [
              'Settings ka mota hisaab hai; apne setup ka poora failover naapna padega',
              'Grahak lautne ka pakka waqt hai; har cache 90 second par B ka pata le lega',
              'Endpoint badalne ki pakki hadd hai; har checker 90 second mein faisla kar lega',
              'App lautne ka poora budget hai; B ko tayyar karna bhi 90 second mein ho lega',
            ],
            answer: 0,
            hint: 'Hisaab mein kaunsi do settings hain? Poore grahak ke order tak aur kaunse kaam baaki hain?',
            explain: '30 s default interval aur 3 default lagataar fail ki ginti hai. Guna karna sirf mota hisaab hai: actual detection ka naap, neeche ki hadd ya upar ki hadd nahi. Kai checkers ke nateeje judte hain; check ka pal aur jawab ki der alag hain. B ki taiyaari aur DNS cache bhi poori wapsi mein gino.',
            choiceExplanations: [
              '30 s default interval aur 3 default lagataar fail ki ginti hai. Guna karna sirf mota hisaab hai: actual detection ka naap, neeche ki hadd ya upar ki hadd nahi. Kai checkers ke nateeje judte hain; check ka pal aur jawab ki der alag hain. B ki taiyaari aur DNS cache bhi poori wapsi mein gino.',
              'Har resolver ya grahak ke cache ki ghadi alag hai. 90 s ka guna cache khatam hone ka pal nahi batata.',
              'Kai checkers ka mila hua faisla aur response ki der ginti ko badal sakte hain. 90 s pakki detection deadline nahi.',
              'Interval aur threshold B ki machines, app ya restore ka samay tay nahi karte. Poora app lautna alag se naapna padega.',
            ],
          },
        },
        {
          title: '3. Failover ke baad bhi grahak purane pate par: TTL',
          say: `Level 2 mein dekha: B tayyar ho tab bhi grahak purane pate par reh sakta hai. Documentation ke mutabiq lamba TTL ho toh DNS resolver purana jawab zyada der cache mein rakhta hai. Naya IP der se asar karta hai.<br><br>
            Lab ke model mein yaad grahak ke paas thi; documentation recursive resolvers ke cache ki baat karti hai. Dono jagah sawaal ek hi hai: purana pata kitni der yaad rakha jaata hai.<br><br>
            Lab ka model (asli DNS nahi): TTL 6 s → 27 orders fail; TTL 1 s → 8 orders. Sabse der se lauta grahak: jawab badalne ke 5.50 s baad, ya 0.50 s baad. Model mein grahak TTL ko theek utna hi maante hain. Asli resolver ya app TTL se zyada der yaad rakhte hain ya nahi, lab ne nahi dekha.`,
          ask: {
            q: 'Health check se jude failover record ke TTL par Route 53 documentation ka mashwara kya hai?',
            choices: [
              '60 s ya kam rakho, taaki resolver purane pate ko zyada der yaad na rakhe',
              '300 s ya zyada rakho, taaki resolver failover par naya pata jaldi le sake',
              '0 s hi rakho, kyunki bina zero TTL ke record ka health check nahi chalta',
              'Pehle wala TTL rakho, kyunki health check cache ka purana jawab mita deta hai',
            ],
            answer: 0,
            hint: 'Record ka jawab badalne ke baad resolver naya jawab kab poochhta hai?',
            explain: 'Route 53 documentation health check wale failover record ke liye TTL 60 s ya kam kehti hai. Chhota TTL resolver ko jaldi dobara poochhne deta hai. Failover turant hone ki guarantee phir bhi nahi; apne clients aur resolvers ka bartav naapna padega.',
            choiceExplanations: [
              'Route 53 documentation health check wale failover record ke liye TTL 60 s ya kam kehti hai. Chhota TTL resolver ko jaldi dobara poochhne deta hai. Failover turant hone ki guarantee phir bhi nahi; apne clients aur resolvers ka bartav naapna padega.',
              'Lamba TTL purana jawab zyada der rakhne deta hai. DNS ka naya pata asar karne mein aur der lag sakti hai.',
              'Health check chalne ke liye TTL zero karna zaroori nahi. Documentation 60 s ya kam ka mashwara deti hai.',
              'Health check cached jawab ko turant nahi mitata. TTL purana jawab badalne ke samay par asar daalta hai.',
            ],
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> RTO mein pata chalna aur purane DNS cache ka intezaar bhi gino. 30 × 3 = 90 s rough hisaab hai; apne setup ka measured failover samay alag se naapo.',
    },

    /* ---------------- 3. S3 aur Aurora ---------------- */
    {
      type: 'cards',
      title: '🗄️ S3 aur Aurora: copy, delete aur backup',
      goal: '<b>Cards AWS ki official documentation se hain; is lab mein AWS chalaya nahi gaya.</b> Chaar cards. Sources: <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html" target="_blank" rel="noopener">S3 delete rules</a> · <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html" target="_blank" rel="noopener">versioning</a> · <a href="https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html" target="_blank" rel="noopener">Aurora failover</a>.',
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
              <tr><td><code>Filter</code> element nahi diya (S3 aise rule ko V1 maanta hai)</td><td>User ke action se bane markers <b>replicate hote hain</b>. Lifecycle action se bane markers nahi.</td></tr>
            </table></div>
            Do aur vaakya, alag-alag:
            <ul>
              <li>Delete marker replication on ho, toh markers destination mein copy hote hain, aur S3 aise behave karta hai jaise object dono buckets mein delete hua.</li>
              <li>Delete request mein object version ID di ho, toh source mein sirf diya hua version delete hota hai, par deletion destination mein replicate nahi hoti.</li>
            </ul>`,
          ask: {
            q: 'Same-account S3 setup mein X ke rule mein Filter hai, Y mein nahi. Dono matching objects user ne bina version ID delete kiye. Marker replication alag se on nahi. Marker kahan copy hoga?',
            choices: [
              'Sirf Y mein; bina Filter ke purane format mein user ka marker bhi copy hota hai',
              'Dono ke destination mein; user ke marker par Filter ka hona koi farak nahi daalta',
              'Sirf X ke destination mein; naye format mein user ka marker khud copy ho jaata hai',
              'Kisi destination mein nahi; user ka marker sirf source par rakhne ka niyam hota hai',
            ],
            answer: 0,
            hint: 'Rule ka format pehchaano, phir har format ka user-delete wala niyam lagao.',
            explain: 'Y mein Filter nahi, toh S3 purana V1 format maanta hai: user se bane delete markers copy hote hain, lifecycle wale nahi. X ke Filter wale naye format mein marker replication default se band hai. Non-tag-based rule mein marker replication alag se on kar sakte hain. Matching objects aur baaki replication setup sahi maana gaya hai.',
            choiceExplanations: [
              'Y mein Filter nahi, toh S3 purana V1 format maanta hai: user se bane delete markers copy hote hain, lifecycle wale nahi. X ke Filter wale naye format mein marker replication default se band hai. Non-tag-based rule mein marker replication alag se on kar sakte hain. Matching objects aur baaki replication setup sahi maana gaya hai.',
              'Filter hone se format badalta hai. X ke naye format mein marker replication default se band hai.',
              'Naye format mein marker khud copy nahi hota. Alag se on karna padega; X mein on nahi hai.',
              'User ke marker ka V1 niyam alag hai. Y mein matching object ka user-created marker destination mein copy hota hai.',
            ],
          },
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
              <li>Kitna data gaya, failure ke waqt Regions ke beech replication lag par nirbhar hai.</li>
            </ul>
            Planned <b>switchover</b> alag hai: pehle secondary ko sync karte hain, isliye RPO 0. Unplanned failover ko zero data loss ki guarantee mat do.<br><br>
            Lab mein replication lag ka kaam <code>waiting</code> list karti thi: failure ke pal par jitne order waiting mein, utne gaye. Copy har 300 ms par bhi 5 orders gaye (lab, asli raftaar, teen run).`,
          ask: {
            q: 'Aurora Global Database ke unplanned failover mein khoye data ka andaaza kis cheez se lagta hai?',
            choices: [
              'Failure ke pal par Regions ke beech copy kitni peeche reh gayi thi',
              'Failure ke pal par roz ka backup banne mein kitni der lag rahi thi',
              'Failure ke pal par B ke app mein kitni khaali CPU capacity bachi thi',
              'Failure ke pal par DNS ke checks ke beech kitna fasla rakha gaya tha',
            ],
            answer: 0,
            hint: 'A ke jaane par kaunsa data B mein abhi nahi pahunchta? Backup banana aur live copy alag rakho.',
            explain: 'Aurora documentation unplanned failover mein failure ke waqt ka cross-region replication lag batati hai. Secondary tak na pahunchi writes kho sakti hain. Planned switchover alag hai: pehle secondary ko sync karte hain. Switchover ka RPO 0 unplanned failover par lagu mat karo.',
            choiceExplanations: [
              'Aurora documentation unplanned failover mein failure ke waqt ka cross-region replication lag batati hai. Secondary tak na pahunchi writes kho sakti hain. Planned switchover alag hai: pehle secondary ko sync karte hain. Switchover ka RPO 0 unplanned failover par lagu mat karo.',
              'Roz ka backup banne ka waqt live global replication ki taazgi nahi batata. Dono alag raaste hain.',
              'App ki khaali CPU se failure ke pal par DB ki kaunsi writes pahunchi thi, pata nahi chalta.',
              'DNS check ka fasla detection par asar daalta hai. DB ki copy kitni peeche hai, DNS settings copy ki deri ka naap nahi hain.',
            ],
          },
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
        q: 'Lab ki table mein B ki roz ki taiyaari aur recovery ka samay saath dekho. Chaar strategies ka kaunsa sauda dikhta hai?',
        choices: [
          'B mein zyada pehle se chalu rakhne par wapsi tez hui; roz ka kharcha badha',
          'B mein zyada pehle se chalu rakhne par data ki har copy turant pahunch gayi',
          'B mein zyada pehle se chalu rakhne par app dobara banane ka kaam bhi badha',
          'B mein zyada pehle se chalu rakhne par roz ke kharche ka farak hi nahi raha',
        ],
        answer: 0,
        explain: 'README ke teen recorded runs mein recovery 16.3–16.4 s, 6.4–6.5 s, 4.0–4.5 s aur 1.0–1.5 s rahi. Zyada taiyaari se baad ka kaam ghata, par chalte resources ka kharcha roz hai. Lab ke chhote seconds AWS ki performance ya SLA nahi hain. Copy ki guarantee aur kai writers ka data milana alag faisle hain.',
        choiceExplanations: [
          'README ke teen recorded runs mein recovery 16.3–16.4 s, 6.4–6.5 s, 4.0–4.5 s aur 1.0–1.5 s rahi. Zyada taiyaari se baad ka kaam ghata, par chalte resources ka kharcha roz hai. Lab ke chhote seconds AWS ki performance ya SLA nahi hain. Copy ki guarantee aur kai writers ka data milana alag faisle hain.',
          'B ki taiyaari badli, copy ka vaada alag hai. Active-active mein bhi recorded runs mein 2–3 "ho gaya" wale orders khoye.',
          'Pehle se chalta app dobara banane ka kaam bachata hai. Chhoti capacity ko badhana phir bhi baaki ho sakta hai.',
          'Chalta DB, chhota app ya poora region roz resources leta hai. Aafat na aaye tab bhi taiyaari ki keemat hai.',
        ],
      },
      lesson: 'B mein jitna zyada pehle se chalu rakhoge, RTO utna chhota aur roz ka kharcha utna zyada; AWS ke chaar naam isi kram ke chaar mode hain.',
    },
  ],
  interview: {
    title: 'Interview Round — documentation padhna',
    instructions: 'Interviewer dekhna chahta hai ki tum AWS ke naam, defaults aur documentation ke vaakya sahi padhte ho — aur hisaab ko naapa hua number nahi batate. 🎤',
    questions: [
      {
        q: 'RTO target 30 s hai. Failover Route 53 health check se hoga, settings defaults hain. Plan mein pehle kya jaanchoge?',
        choices: [
          'Detection, B ki taiyaari aur DNS cache naapoge; defaults se poora target sabit nahi',
          'Threshold 3 ko teen second maanoge; bache hue waqt mein B taiyaar karna kaafi hai',
          'Fast interval par target poora maanoge; das second ke check se tees par sab lautega',
          'Threshold 10 par target poora maanoge; zyada check se band region jaldi pata chalega',
        ],
        answer: 0,
        explain: 'Default interval 30 s aur threshold 3 hai; 90 s ka mota guna 30 s ka RTO sabit nahi karta. Fast interval 10 s ka bhi 30 s wala guna end-to-end guarantee nahi; Fast ka extra charge hai. Detection, B ki capacity aur DNS/client cache samet apna failover chala ke naapo.',
        choiceExplanations: [
          'Default interval 30 s aur threshold 3 hai; 90 s ka mota guna 30 s ka RTO sabit nahi karta. Fast interval 10 s ka bhi 30 s wala guna end-to-end guarantee nahi; Fast ka extra charge hai. Detection, B ki capacity aur DNS/client cache samet apna failover chala ke naapo.',
          'Threshold 3 lagataar checks ki ginti hai, teen second nahi. B ki taiyaari aur DNS ka waqt bhi ginna hai.',
          'Fast interval detection ka ek hissa badalta hai. Kai checkers, B ki taiyaari aur cache ke saath poora target naapna padega.',
          'Zyada lagataar failures maangne se faisla aam taur par der se aata hai. Threshold 10 tez recovery ka saboot nahi.',
        ],
      },
      {
        q: 'Source ke objects galti se delete hue. S3 replication lagi hai. Destination ka data bacha ya nahi, kaise jaanchoge?',
        choices: [
          'Rule ka format, marker ki setting aur version ID wala delete alag-alag dekho',
          'Replication lagi hai toh har delete destination mein bhi hua, yahi maan lo',
          'Destination alag bucket hai toh har tarah ke delete se data bacha, yahi maan lo',
          'User ke delete ko lifecycle wala niyam do; dono ke markers ek jaise copy hote hain',
        ],
        answer: 0,
        explain: 'Filter wale naye format mein marker default se copy nahi hota; alag se on ho sakta hai. V1 mein user ke markers copy hote hain, lifecycle ke nahi. Version ID dekar kiya delete destination ka wahi version nahi mitata. Marker lagna aur purana version permanently mitna alag hain. Recovery ke liye bache versions ya saaf purana backup bhi jaancho.',
        choiceExplanations: [
          'Filter wale naye format mein marker default se copy nahi hota; alag se on ho sakta hai. V1 mein user ke markers copy hote hain, lifecycle ke nahi. Version ID dekar kiya delete destination ka wahi version nahi mitata. Marker lagna aur purana version permanently mitna alag hain. Recovery ke liye bache versions ya saaf purana backup bhi jaancho.',
          'S3 har delete mirror nahi karta. Marker aur version ID wale delete ke documented niyam alag hain.',
          'Alag bucket hona har delete se bachne ka vaada nahi. Configuration ke mutabiq marker destination tak pahunch sakta hai.',
          'V1 mein user ke delete marker copy hote hain, lifecycle wale nahi. Dono ka niyam ek nahi hai.',
        ],
      },
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
