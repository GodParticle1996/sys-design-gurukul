/* =====================================================================
   🛡️ Playlist · 1 Resilience — Disaster Recovery · level 4: LIBRARY (AWS ki documentation)
   Wahi chaar tareeke, AWS ke naam ke saath: DR whitepaper ke chaar naam, Route 53 ka health check aur TTL,
   S3 ke delete markers aur versioning, Aurora Global Database.
   Kya documentation se hai, kya lab se:
     - AWS ki har baat: AWS ke official pages se (exact quote aur URL topic ke FACTS.md mein). Is lab mein AWS CHALAYA NAHI GAYA.
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
     <p><b>Yeh poora level AWS ki official documentation par hai. Is lab mein AWS chalaya nahi gaya.</b> AWS ke quote <i>italic</i> mein hain. Jo number lab ke apne run se hain, un par "lab" likha hai.</p>
     <p>Level 1 se 3 mein tumne region B ke chaar tareeke dekhe, aur router ka "lagataar 3 fail" wala niyam. AWS ki documentation inhi cheezon ko naam aur default settings deti hai. Default = jo setting tumne likhi nahi, par jo phir bhi lagu hoti hai.</p>
     <ul>
       <li><b>Lab ka router:</b> 0.5 s × 3 = 1.50 s (lab, slow motion mein naapa).</li>
       <li><b>Route 53, jo setting likhi nahi:</b> 30 s × 3 = 90 s tak — <b>hisaab</b>, documentation ke defaults se. Naapa hua nahi.</li>
     </ul>
     <p class="tip">👉 Is level mein teen jagah: AWS ke chaar naam, Route 53 ke health check aur TTL, aur S3 / Aurora ke delete aur replication.</p>`,
  ],
  stages: [
    /* ---------------- 1. AWS ke chaar naam ---------------- */
    {
      type: 'cards',
      title: '☁️ AWS ke chaar naam — jo tumne lab mein dekha',
      goal: '<b>Yeh AWS ki official documentation (DR whitepaper) se hai; is lab mein AWS chalaya nahi gaya.</b> Chaar chhote cards. AWS ke quote <i>italic</i> mein hain. Jo number lab ke hain, un par "lab" likha hai.',
      steps: [
        {
          title: '1. Lab ke chaar mode ko AWS mein kya kehte hain?',
          say: `Level 1 se tum region B mein chaar cheezein rakh ke dekh chuke ho. AWS ki documentation inhi chaar ko naam deti hai:
            <div class="dr-scroll"><table>
              <tr><th>Lab mein B mein aam din</th><th>AWS ka naam</th><th>Lab ka RTO (slow motion)</th></tr>
              <tr><td>kuch nahi, sirf S3 snapshots</td><td>Backup and restore</td><td>7.50 s</td></tr>
              <tr><td>DB chalu, app band</td><td>Pilot light</td><td>4.50 s</td></tr>
              <tr><td>DB + chhota app</td><td>Warm standby</td><td>3.50 s</td></tr>
              <tr><td>poora region, aadha traffic</td><td>Multi-site active/active</td><td>1.50 s</td></tr>
            </table></div>
            Whitepaper ki pehli line:<br>
            <i>Disaster recovery strategies available to you within AWS can be broadly categorized into four approaches, ranging from the low cost and low complexity of making backups to more complex strategies using multiple active Regions.</i><br><br>
            Matlab: chaar tareeke, sasta aur saral (backups) se lekar zyada complex (kai active Regions) tak. Lab ke seconds lab ke hain, AWS ke nahi. Documentation kharche aur complexity ka kram kehti hai.`,
        },
        {
          title: '2. Sabse sasta tareeka: B mein kuch nahi. Documentation kya kehti hai?',
          say: `Lab ke backup mode mein region B mein kuch nahi tha. Failover ke baad B banane mein 6.00 s lage (slow motion), phir S3 se restore. Documentation (Backup and restore) mein teen baatein hain:
            <ul>
              <li><i>In addition to data, you must redeploy the infrastructure, configuration, and application code in the recovery Region.</i><br>Lab mein: B mein machines aur DB banana.</li>
              <li><i>Any data stored in the disaster recovery Region as backups must be restored at time of failover.</i><br>Lab mein: S3 se restore.</li>
              <li><i>How often you run your backup will determine your achievable recovery point (which should align to meet your RPO).</i><br>Lab mein: backup har 3 s par, kho gaye 3 orders (#7–#9).</li>
            </ul>`,
        },
        {
          title: '3. Pilot light ya warm standby? Documentation ka apna fark',
          say: `Lab mein dono mein B ka DB chalu tha. Farak: pilot light mein app band, warm standby mein chhota app chalu.<br><br>
            Documentation ke mutabiq: pilot light mein databases jaisi cheezein hamesha on rehti hain, par application servers "switched off" hote hain. Warm standby mein production environment ki ek chhoti par poori tarah chalti copy doosre Region mein hoti hai.<br><br>
            Dono ka fark whitepaper ke apne shabdon mein:<br>
            <i>The distinction is that pilot light cannot process requests without additional action taken first, whereas warm standby can handle traffic (at reduced capacity levels) immediately. The pilot light approach requires you to “turn on” servers, possibly deploy additional (non-core) infrastructure, and scale up, whereas warm standby only requires you to scale up (everything is already deployed and running).</i><br><br>
            Lab ke slow motion mein: pilot light ka app 3.00 s mein boot hua (RTO 4.50 s). Warm standby ka chhota app 2.00 s mein bada hua (RTO 3.50 s).`,
          ask: {
            q: 'Region B mein DB chalu hai, aur ek chhota par poora chalta app bhi: sab deploy ho chuka hai. Failover par documentation ke mutabiq kya karna baaki hai?',
            choices: [
              'Warm standby ka kaam: sirf scale up — sab kuch pehle se deployed aur chal raha hai',
              'Pilot light ka kaam: servers "turn on" karna, shayad aur infrastructure deploy karna, phir scale up',
              'Backup and restore ka kaam: infrastructure, configuration aur application code recovery Region mein dobara deploy karna',
              'Multi-site active/active ka kaam: kuch nahi — recovery time zero hai',
            ],
            answer: 0,
            hint: 'Documentation ka fark dekho: "turn on" karna padta hai, ya sirf "scale up"? B mein app pehle se chal raha hai ya band hai?',
            explain: `Documentation: warm standby <i>only requires you to scale up (everything is already deployed and running)</i>. "Turn on" karna pilot light ka kaam hai; dobara deploy karna backup and restore ka. Multi-site active/active mein bhi documentation recovery time <i>near zero</i> likhti hai, zero nahi.`,
          },
        },
        {
          title: '4. Sabse mehenga tareeka: kya data phir bhi jaata hai?',
          say: `Lab ke active-active mode mein B pehle se poora chal raha tha, aur aadha traffic le raha tha. Documentation (Multi-site active/active):
            <ul>
              <li><i>This approach is the most complex and costly approach to disaster recovery, but it can reduce your recovery time to near zero for most disasters with the correct technology choices and implementation (however data corruption may need to rely on backups, which usually results in a non-zero recovery point).</i></li>
              <li><i>Asynchronous data replication with this strategy enables near-zero RPO.</i></li>
            </ul>
            Dhyaan do: "near zero", zero nahi. Lab ne dikhaya: copy async hai, toh <code>waiting</code> list ban sakti hai (level 3).<br><br>
            Lab: slow motion mein #9 kho gaya, RTO 1.50 s. Asli raftaar (teen run): RTO 1.0–1.5 s, 2–3 orders kho gaye.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> AWS ke chaar naam wahi chaar mode hain jo tumne lab mein dekhe. Pilot light aur warm standby ka fark ek vaakya mein: pilot light mein pehle servers "turn on" karne padte hain, warm standby mein sirf scale up. Aur sabse mehenge tareeke mein bhi documentation RPO "near-zero" likhti hai, zero nahi.',
    },

    /* ---------------- 2. Route 53: health check, hisaab, TTL ---------------- */
    {
      type: 'cards',
      title: '🧭 Route 53: health check, hisaab aur TTL',
      goal: '<b>Yeh AWS ki official documentation se hai; is lab mein AWS chalaya nahi gaya.</b> Teen cards. Jahan documentation ke number se hisaab nikala hai, wahan "hisaab" likha hai. Hisaab naapa hua number nahi hota. Lab ke naape hue number alag likhe hain.',
      steps: [
        {
          title: '1. RTO ki ginti mein pata chalna bhi aata hai?',
          say: `AWS ki paribhasha (whitepaper):<br>
            <b>RTO</b>: <i>the maximum acceptable delay between the interruption of service and restoration of service</i><br>
            <b>RPO</b>: <i>the maximum acceptable amount of time since the last data recovery point</i><br>
            Dono ke baare mein documentation kehti hai: <i>is defined by the organization</i>. Yaani business tay karta hai.<br><br>
            RTO ek "delay" hai jo service ruk jaane se shuru hota hai. Isliye pata chalne ka samay bhi RTO mein judta hai. Documentation bhi kehti hai ki objectives tay karte waqt in cheezon ko hisaab mein lo:<br>
            <i>incident detection, notification, escalation, discovery and declaration</i><br><br>
            Lab mein pilot light ka RTO 4.50 s = 1.50 s pata chalna + 3.00 s B ka app boot. Par lab mein "pata chalna" sirf router ka health check tha. Khabar dena, aage badhana, declare karna lab mein the hi nahi.`,
        },
        {
          title: '2. Route 53 ka health check: kitni der mein pata chalega?',
          say: `Lab ka router Route 53 jaisa kaam karta tha: "har 0.5 s par poochho, lagataar 3 fail". Route 53 ka health check bhi do number leta hai (API reference):
            <ul>
              <li><b>RequestInterval</b>: kitni der par poochho. Default <b>30 seconds</b>. Valid range 10 se 30.</li>
              <li><b>FailureThreshold</b>: lagataar kitne health check pass ya fail hon, tab Route 53 endpoint ki status badalta hai. Default <b>3</b>. Valid range 1 se 10.</li>
            </ul>
            Alag se: <i>If you choose Fast (10 seconds) for the value of Request interval, an additional charge applies.</i>
            <div class="dr-scroll"><table>
              <tr><th>Kaun</th><th>Fasla × hadd</th><th>Pata chalne mein</th></tr>
              <tr><td>Lab ka router</td><td>0.5 s × 3</td><td>1.50 s (lab, slow motion) · RTO 1.0–1.5 s (lab, active-active, asli raftaar, teen run)</td></tr>
              <tr><td>Route 53, defaults</td><td>30 s × 3</td><td>90 s tak (<b>hisaab</b>)</td></tr>
              <tr><td>Route 53, Fast (10 s), threshold 3</td><td>10 s × 3</td><td>30 s tak (<b>hisaab</b>)</td></tr>
            </table></div>
            Hisaab ka matlab: fasla × lagataar fail. Naapa hua nahi. Jo pages humne padhe, unmein DNS failover ka detection ya propagation samay seconds mein likha nahi mila. Lab ka 0.5 s × 3 lab ke router ka apna chhota roop hai, Route 53 ka number nahi.`,
          ask: {
            q: 'Route 53 health check mein tumne RequestInterval aur FailureThreshold, dono ke baare mein kuch nahi likha. Hisaab se pata chalne mein lagbhag kitna samay lagega?',
            choices: [
              'Lagbhag 90 second tak: 30 s ka fasla × 3 lagataar fail. Hisaab hai — documentation ne detection ka samay seconds mein nahi bataya',
              'Lagbhag 30 second — ek hi fasla',
              'Lagbhag 1.5 second — jaise lab ke router mein',
              'Lagbhag 3 second — threshold hi toh 3 hai',
            ],
            answer: 0,
            hint: 'Lagataar kitne health check fail hone chahiye? Do check ke beech kitna fasla hai? (Dono default hain.)',
            explain: `Hisaab: <code>RequestInterval</code> 30 s × <code>FailureThreshold</code> 3 = 90 s tak. Naapa hua nahi. Lab ka 0.5 s × 3 lab ke router ka apna chhota roop hai. Aur savdhani (whitepaper): <i>Automatically initiated failover based on health checks or alarms should be used with caution.</i> Documentation: best practices ke saath bhi recovery time aur recovery point zero se zyada honge.`,
          },
        },
        {
          title: '3. Failover ke baad bhi grahak purane pate par: TTL',
          say: `Level 2 mein dekha: B tayyar ho tab bhi grahak purane pate par reh sakta hai. Route 53 ki documentation (failover record ka TTL):<br>
            <i>However, if you specify a longer value for TTL, it takes longer for changes to the record (for example, a new IP address) to take effect.</i><br>
            <i>Recursive resolvers use the values in their cache for longer periods before they ask Route 53 for the latest information.</i><br><br>
            Lab ke model mein yaad grahak ke paas thi; documentation recursive resolvers ke cache ki baat karti hai. Dono jagah sawaal ek hi hai: purana pata kitni der yaad rakha jaata hai.<br><br>
            Lab ka model (asli DNS nahi): TTL 6 s → 27 orders fail; TTL 1 s → 8 orders. Sabse der se lauta grahak: jawab badalne ke 5.50 s baad, ya 0.50 s baad. Model mein grahak TTL ko theek utna hi maante hain. Asli resolver ya app TTL se zyada der yaad rakhte hain ya nahi, yeh humne nahi dekha.`,
          ask: {
            q: 'Failover wale record ko health check se jodna hai. Documentation TTL ke baare mein kya kehti hai?',
            choices: [
              '60 seconds ya kam, taaki clients health status ke badlav par jaldi badlein',
              'Lamba TTL rakho (5 minute ya zyada): kam DNS queries, aur failover ke liye bhi lamba TTL behtar',
              'TTL ka failover se koi lena-dena nahi — health check hi sab sambhalta hai',
              'TTL 0 hona chahiye, tabhi failover chalta hai',
            ],
            answer: 0,
            hint: 'Lamba TTL ho toh purana pata cache mein kitni der rehta hai? Failover ke baad grahak ko naya pata kab milega?',
            explain: `Documentation: <i>If you're associating this record with a health check, specify a TTL of 60 seconds or less so clients respond quickly to changes in health status.</i> Lamba TTL ka matlab hai badlav der se asar karta hai.`,
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> RTO mein pata chalna bhi judta hai, aur pata chalne ka samay do number se banta hai: fasla × hadd. Route 53 mein bhi wahi do number hain — bas defaults badi hain (hisaab: 30 s × 3 = 90 s tak; naapa nahi). Aur failover ke baad bhi grahak TTL tak purane pate par reh sakta hai: lamba TTL matlab badlav der se asar karta hai.',
    },

    /* ---------------- 3. S3 aur Aurora ---------------- */
    {
      type: 'cards',
      title: '🗄️ S3 aur Aurora: copy, delete aur backup',
      goal: '<b>Yeh AWS ki official documentation se hai; is lab mein AWS (S3, Aurora) chalaya nahi gaya.</b> Chaar cards. Lab ka replica ek chhota model tha — S3 ya Aurora nahi. Jahan S3 ya Aurora ka naam hai, wahan sirf documentation ki baat hai.',
      steps: [
        {
          title: '1. Replication akela backup kyun nahi?',
          say: `Lab ke slow motion 4 mein replica DELETE bhi copy kar deta tha: 8.00 s par B ke 14 orders gaye. AWS ki documentation (whitepaper) kehti hai:<br>
            <i>If a file or files are deleted or corrupted on the primary storage device, those destructive changes can be replicated to the secondary storage device.</i><br>
            <i>Instead, a point-in-time backup is also required as part of a DR strategy.</i><br><br>
            Aur:<br>
            <i>Continuous data replication protects you against some types of disaster, but it may not protect you against data corruption or destruction unless your strategy also includes versioning of stored data or options for point-in-time recovery.</i><br><br>
            Lab mein point-in-time backup ka kaam snapshot ne kiya: 12 orders wapas aaye, #13–#16 (4 orders) nahi.`,
        },
        {
          title: '2. S3 mein DELETE copy hota hai ya nahi?',
          say: `Lab ka replica DELETE copy kar deta tha. S3 ki documentation:<br>
            <i>By default, when S3 Replication is enabled and an object is deleted in the source bucket, Amazon S3 adds a delete marker in the source bucket only.</i> (Versioning wale bucket mein delete par S3 object ko permanently hatane ki jagah ek <b>delete marker</b> lagata hai.) Documentation: marker ka sirf source bucket mein lagna destination buckets ke data ko accidental ya malicious deletions se bachata hai.<br><br>
            Par phir: <i>If you're not using the latest replication configuration XML version, delete operations affect replication differently.</i> Yaani jawab <b>configuration ke version</b> par nirbhar hai:
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
            q: 'Do team ne S3 replication lagayi. Team X ke rule mein <code>Filter</code> element hai (latest version). Team Y ke rule mein <code>Filter</code> element nahi hai. Dono ke source bucket mein ek user ne ek object delete kiya, version ID diye bina. Delete marker replication kisi ne alag se on nahi kiya. Documentation ke mutabiq, delete marker kiske destination bucket mein replicate hoga?',
            choices: [
              'Sirf Team Y ke: <code>Filter</code> element na ho toh S3 ise V1 maanta hai, aur user ke action se bane delete markers replicate karta hai. Team X ke destination mein marker default mein nahi aata',
              'Dono ke — delete marker hamesha replicate hota hai',
              'Kisi ke bhi nahi — delete marker kabhi replicate nahi hota',
              'Sirf Team X ke — latest version mein sab kuch replicate hota hai',
            ],
            answer: 0,
            hint: 'Table dekho: <code>Filter</code> element na ho toh S3 kaunsa version maanta hai, aur us version ki delete marker wali line kya kehti hai?',
            explain: `Latest version: <i>Amazon S3 does not replicate the delete marker by default</i>. <code>Filter</code> element na ho: <i>it replicates delete markers that resulted from user actions</i>. Lifecycle action wale markers nahi. Isliye "S3 delete copy karta hai ya nahi" ek line ka jawab nahi hai: configuration ka version dekhna padta hai.`,
          },
        },
        {
          title: '3. S3 Versioning: galti se kaun bachata hai?',
          say: `Lab mein galti (DELETE) se bachaya snapshot ne. S3 mein galti se bachne ka ek tareeka versioning hai (S3 Versioning ka page):<br>
            <i>Versioning-enabled buckets can help you recover objects from accidental deletion or overwrite. For example, if you delete an object, Amazon S3 inserts a delete marker instead of removing the object permanently.</i><br><br>
            Dhyaan do:<br>
            <i>By default, S3 Versioning is disabled on buckets, and you must explicitly enable it.</i><br><br>
            Whitepaper ek aur baat yaad dilati hai: galti ke baad wapsi ka point galti se pehle ka hota hai — <i>the recovery point will always be at some point before the disaster was discovered</i>. Lab mein: galti 7.75 s par hui, 10.25 s par pakdi gayi, aur restore 6.00 s ke snapshot se aaya.`,
        },
        {
          title: '4. Ek database ka feature: kitna data jaata hai?',
          say: `AWS ke database ka ek feature, Aurora Global Database, data ko doosre AWS Regions mein replicate karta hai. Documentation ke vaakya:
            <ul>
              <li><i>After any write operation, Aurora replicates data to the secondary AWS Regions using dedicated infrastructure, with latency typically under a second.</i></li>
              <li><i>For Aurora Global Database, RTO can be in the order of minutes.</i></li>
              <li><i>For an Aurora global database, RPO is typically measured in seconds.</i> Wajah: <i>This data loss is usually due to asynchronous replication lag.</i></li>
              <li><i>The amount of data loss depends on the Aurora global database replication lag across the AWS Regions at the time of the failure.</i></li>
            </ul>
            Lab mein replication lag ka kaam <code>waiting</code> list karti thi: failure ke pal par jitne order waiting mein, utne gaye. Copy har 300 ms par bhi 5 orders gaye (lab, asli raftaar, teen run).`,
          ask: {
            q: 'Aurora Global Database ki documentation ke mutabiq, failure ke baad kitna data gaya — is nuksaan ki matra kis par nirbhar hai?',
            choices: [
              'Failure ke waqt Regions ke beech replication lag par',
              'Backup kitni baar chalta hai us par — jaise har ghante',
              'Primary database ke size par',
              'Kitne secondary Regions hain us par',
            ],
            answer: 0,
            hint: 'Lab mein kho gaye orders kis cheez ne tay kiye the? Copy ke intezaar mein jo list thi, usne.',
            explain: `Documentation: <i>The amount of data loss depends on the Aurora global database replication lag across the AWS Regions at the time of the failure.</i> Lab mein replication lag ka kaam <code>waiting</code> list karti thi (level 3 ka <code>pending()</code>).`,
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> copy aur backup alag cheezein hain — AWS ki documentation bhi kehti hai ki point-in-time backup alag se chahiye. S3 mein DELETE ka copy hona replication configuration ke version par nirbhar hai, isliye "delete copy hota hai ya nahi" ka jawab ek line mein nahi aata. Versioning default mein band hoti hai. Aur database mein bhi nuksaan replication lag par nirbhar hai: lab mein <code>waiting</code> list, Aurora ki documentation mein replication lag.',
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
        choices: [
          'Jaise-jaise B mein aam din zyada chalta hai, RTO chhota hota jaata hai. Keemat: B ka roz ka kharcha, chahe aafat aaye ya na aaye',
          'RTO chaaron mein lagbhag ek jaisa hai, farak sirf kharche mein hai',
          'B mein jitna zyada chalu, RTO utna bada — kyunki zyada cheezein chalu karni padti hain',
          'Multi-site active-active mein bhi kuch order kho gaye, isliye multi-site sabse kharab tareeka hai',
        ],
        answer: 0,
        explain: 'Teen run mein RTO: 16.3–16.4 s → 6.4–6.5 s → 4.0–4.5 s → 1.0–1.5 s. AWS ki documentation kharche aur complexity ka wahi kram kehti hai: backups sabse sasta aur saral, kai active Regions sabse complex. Multi-site mein bhi 2–3 orders kho gaye, par multi-site ka RTO sabse chhota hai.',
      },
      lesson: 'B mein jitna zyada pehle se chalu rakhoge, RTO utna chhota aur roz ka kharcha utna zyada; AWS ke chaar naam isi kram ke chaar mode hain.',
    },
  ],
  interview: {
    title: 'Interview Round — documentation padhna',
    instructions: 'Interviewer dekhna chahta hai ki tum AWS ke naam, defaults aur documentation ke vaakya sahi padhte ho — aur hisaab ko naapa hua number nahi batate. 🎤',
    questions: [
      {
        q: '"Humare service ka RTO target 30 second hai. Failover Route 53 health check se hoga, aur hamne health check ki settings mein kuch likha nahi. Kya dikkat hai?"',
        choices: [
          'Hisaab: default RequestInterval 30 s aur FailureThreshold 3 → 30 × 3 = 90 s tak, sirf pata chalne mein. Target 30 s ka hai, toh B ko chalane ka samay jodne se pehle hi target se zyada. (Hisaab hai; documentation ne detection ka samay seconds mein nahi bataya.) Interval ko Fast (10 seconds) karo toh hisaab 30 s: poora target pata chalne mein hi gaya, aur Fast ka alag charge lagta hai. Isliye target, health check ki settings aur B kitna pehle se chalu hai — teeno saath tay karo',
          'Koi dikkat nahi — Route 53 failover turant kar deta hai',
          'Default threshold 3 second hai, toh 30 second ke andar aaraam se aa jaayega',
          'FailureThreshold ko 10 kar do — jitna zyada, utna accha',
        ],
        answer: 0,
        explain: 'Lab: router 0.5 s × 3 = 1.50 s (slow motion), aur asli raftaar mein active-active ka RTO 1.0–1.5 s (teen run) — par lab ka router apna chhota roop hai, Route 53 nahi. Route 53 ke 90 s aur 30 s hisaab hain (documentation ke defaults aur Fast (10 seconds) se). Threshold 10 karne se hisaab 30 × 10 = 300 s tak ho jaata: pata chalna aur der se.',
      },
      {
        q: '"Humne S3 replication laga di hai. Kisi ne galti se source bucket ke objects delete kar diye. Kya destination bucket mein data bacha rahega?"',
        choices: [
          'Documentation ke mutabiq jawab replication configuration ke version par nirbhar hai. Latest version (rule mein Filter element): delete marker default mein replicate nahi hota — jab tak delete marker replication jodi na ho. Filter element na ho (V1): user ke delete se bane markers replicate hote hain, lifecycle wale nahi. Version ID dekar delete karne par deletion destination tak nahi jaati. Aur replication akela backup nahi: documentation versioning ya point-in-time recovery bhi chahti hai',
          'Nahi. Replication har badlav copy karti hai, DELETE bhi — jaise lab ke replica mein tha',
          'Haan, hamesha. S3 replication delete markers kabhi replicate nahi karti',
          'Nahi. Delete marker sirf tab replicate hota hai jab object lifecycle action se delete ho',
        ],
        answer: 0,
        explain: `Documentation: latest version mein <i>Amazon S3 does not replicate the delete marker by default</i>; V1 mein <i>it replicates delete markers that resulted from user actions</i>. Lab ka replica har badlav copy karta tha (8.00 s par B ke 14 orders gaye) — lab ka replica chhota model tha, S3 nahi.`,
      },
    ],
  },
  success: [
    'AWS ke chaar naam (backup and restore · pilot light · warm standby · multi-site active/active) lab ke chaar mode se jod sakte ho, aur pilot light aur warm standby ka documented fark bata sakte ho',
    'Route 53 health check ke do number (RequestInterval, FailureThreshold) se pata chalne ka hisaab laga sakte ho — aur jaante ho ki hisaab naapa hua number nahi hota, aur Route 53 ka bataya hua samay bhi nahi',
    'S3 mein DELETE ka replicate hona configuration ke version ke hisaab se alag hai, aur replication ke saath versioning ya point-in-time recovery chahiye — documentation ke shabdon mein bata sakte ho',
  ],
  cards: [
    { front: 'AWS ke chaar naam, lab ke chaar mode? (docs)', back: 'Backup and restore (B mein kuch nahi) · Pilot light (DB chalu, app band) · Warm standby (DB + chhota app) · Multi-site active/active (poora region). Documentation kharche aur complexity ka kram kehti hai: backups sabse sasta aur saral, kai active Regions sabse complex. Lab RTO (slow motion): 7.50 · 4.50 · 3.50 · 1.50 s.' },
    { front: 'Pilot light aur warm standby mein farak? (docs)', back: 'Pilot light: servers "switched off"; request lene se pehle "turn on", shayad aur infrastructure deploy, phir scale up. Warm standby: scaled down par poori tarah chalti copy; reduced capacity par turant traffic le sakta hai, sirf scale up.' },
    { front: 'Route 53 health check ke defaults, hisaab aur TTL? (docs)', back: 'RequestInterval 30 s (valid 10–30) · FailureThreshold 3 (valid 1–10). Hisaab: 30 × 3 = 90 s tak; Fast (10 seconds) par 10 × 3 = 30 s tak (extra charge). Hisaab hai, Route 53 ka bataya samay nahi. Lab ka router: 0.5 s × 3 = 1.50 s. Health check wale record ka TTL: 60 seconds ya kam.' },
    { front: 'S3 mein DELETE destination tak jaata hai? (docs)', back: 'Configuration ke version par nirbhar. Latest (Filter element): delete marker default mein replicate nahi (jod sakte ho). Filter nahi (V1): user ke delete ke markers replicate, lifecycle ke nahi. Version ID dekar delete: destination tak nahi. Versioning default mein disabled.' },
    { front: 'Replication backup ki jagah kyun nahi le sakti? (docs)', back: 'Delete aur corruption jaise destructive changes secondary par bhi replicate ho sakte hain. Documentation: versioning ya point-in-time recovery bhi chahiye. Lab: 8.00 s par B ke 14 orders gaye; snapshot se 12 wapas aaye, #13–#16 nahi.' },
  ],
},
]);

})();
