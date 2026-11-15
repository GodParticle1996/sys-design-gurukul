/* =====================================================================
   System Gurukul — 🔐 Security aur Multi-tenancy (track pro-sec), hissa 3
   Levels: sec-noisy (tenant load + quota mission), sec-secrets.
   ===================================================================== */
(() => {
const T_NOISY = [
  { text: '1 tareekh ka load chalao — baaki merchants ka dashboard p99 kitna?',
    check: s => s.records.some(r => r.kind === 'tenant-load' && r.othersP99 >= 1000) },
  { text: 'MegaMart ka hissa bandho (quota 40% ya kam), ya MegaMart ko alag replica do',
    check: s => (s.sys.tenancy.quota.mega > 0 && s.sys.tenancy.quota.mega <= 40) || s.sys.tenancy.replica.mega === true },
  { text: 'Load dobara: baaki merchants ka p99 200 ms ke andar',
    check: s => SD.mission.current(s, 'tenant-load', r => r.othersP99 <= 200) },
];

SD.registerLevels('pro-sec', [
/* ---------------------------------------------------------------- S5 */
{
  id: 'sec-noisy',
  icon: '📢',
  title: 'Noisy neighbour — ek bada merchant sabko dheema kare',
  badge: 'Padosi Panch',
  objectives: [
    '1 tareekh: MegaMart ki report se 39,999 merchants ka dashboard 10 second',
    'Kaun shor kar raha hai — per-tenant naap',
    'Teen ilaaj: quota, alag replica ya cell, aur report ko queue mein daalna',
    'Terminal: quota laga ke baaki merchants ko bachao — aur keemat gino',
  ],
  lesson: [
    `<h3>🚰 Misaal: society ka ek pani ka tank</h3>
     <p>40 flats, ek tank. Ek flat ne swimming pool bharne ke liye motor chala di. Baaki 39 flats ke nal sookhe.</p>
     <p>Ilaaj do tarah ke: har flat ke nal par ek hadd (<b>quota</b>), ya pool wale flat ka <b>alag tank</b>.</p>
     <p class="tip">🎯 <b>Asli baat:</b> saajhe resource (DB ka CPU, connections, queue) par ek tenant ka bhaari kaam sabki latency badha deta hai.
       Isse <b>noisy neighbour</b> kehte hain. Pichhla level data ka isolation tha; ye level <b>performance</b> ka isolation hai.</p>`,
    `<h3>📅 ChaiPay ki 1 tareekh</h3>
     <p>MegaMart (50 lakh orders) mahine ki report chalata hai. Report DB ka <b>80% CPU</b> khaati hai.
       Baaki 39,999 merchants ke dashboards ko <b>30%</b> chahiye. Kul maang <b>110%</b>.</p>
     <p>100% se upar ka matlab: har query line mein. Sharma Sweets ka chhota dashboard bhi <b>10 second</b>.</p>
     <p><b>Kaun shor kar raha hai, kaise pata chale?</b> Har query ke log mein <code>merchant_id</code>. DB time ko merchant ke hisaab se jodo aur top 10 dekho.
       (40,000 merchants ko metric label banana mehenga hai — observability track mein dekhoge.)</p>`,
    `<h3>🛠️ Ilaaj aur unki keemat</h3>
     <table>
       <tr><th>Ilaaj</th><th>Kya karta hai</th><th>Keemat</th></tr>
       <tr><td><b>Quota</b> (CPU ya parallel queries ki hadd)</td><td>Bada tenant apne hisse se zyada nahi le sakta</td><td>MegaMart ki report dheemi (15 → 60 min)</td></tr>
       <tr><td><b>Alag replica / cell</b></td><td>Bade tenant ka bhaari padhna alag machine par</td><td>Har mahine server ka kharcha; replica par data thoda purana</td></tr>
       <tr><td><b>Per-tenant rate limit</b> (API par)</td><td>Ek tenant ki requests ki hadd</td><td>Burst wale tenant ko 429</td></tr>
       <tr><td><b>Report queue mein</b>, raat ko</td><td>Bhaari kaam bheed ke samay se hata do</td><td>Report turant nahi milti</td></tr>
     </table>
     <p class="tip">⚖️ Fair share ka matlab "sab baraabar" nahi. MegaMart zyada paisa deta hai toh uska hissa bhi bada ho sakta hai — par contract mein likha ho, aur baaki tenants ka SLO na toote.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — 1 tareekh ko baaki merchants bachao',
      goal: '1 tareekh hai. MegaMart ki mahine ki report chal rahi hai. Pehle load chala ke dekho baaki merchants ka dashboard kitna dheema hai. Phir MegaMart ka hissa bandho (ya alag replica do), aur load dobara chalao.',
      sys: {},
      tasks: T_NOISY,
      success: SD.allTasks(T_NOISY),
      verify: s => ((s.sys.tenancy.quota.mega > 0 && s.sys.tenancy.quota.mega <= 40) || s.sys.tenancy.replica.mega === true) && SD.mission.current(s, 'tenant-load', r => r.othersP99 <= 200),
      solution: [
        'tenant load',
        'tenant quota mega --cpu 20',
        'tenant load',
      ],
      successText: 'Baaki 39,999 merchants ka dashboard wapas tez. Keemat dekho: quota se MegaMart ki report 15 se 60 minute ho gayi. Alag replica se report tez rehti, par har mahine server ka kharcha. Asli faisla SLO aur contract se hota hai.',
      hints: [
        'Pehle load chala ke dekho: baaki merchants ka p99 kitna hai, aur DB ka CPU kaun kha raha hai?',
        '`tenant load` 1 tareekh ka ghanta chalata hai. `tenant quota <tenant> --cpu <5-80>` ek tenant ka CPU hissa bandhta hai. `tenant replica <tenant>` bade tenant ko alag read replica deta hai.',
        'Poora raasta — har command alag Enter se chalao:\ntenant load\ntenant quota mega --cpu 20\ntenant load',
      ],
    },
    {
      type: 'quiz',
      title: 'Noisy neighbour ke faisle',
      questions: [
        {
          q: 'Quota ke baad MegaMart ki report 15 se 60 minute ho gayi. MegaMart naraaz hai. Sahi jawab?',
          choices: [
            'Report ko raat ki queue ya alag replica par bhejo; dashboards ka SLO pehle',
            'Quota hata do; sabse bada grahak sabse zaroori hai, baaki intezaar karein',
            'Baaki merchants ko bolo ki 1 tareekh ko dashboard thoda kam kholein',
            'DB ka CPU double karo; maang 110% hai, 220% par sab theek ho jaayega',
          ],
          answer: 0,
          explain: 'MegaMart ki zaroorat bhi sahi hai: report time par chahiye. Usse alag raasta do — raat ki queue, ya paid alag replica. Baaki 39,999 merchants ka SLO toote bina.',
          choiceExplanations: [
            'MegaMart ki zaroorat bhi sahi hai: report time par chahiye. Usse alag raasta do — raat ki queue, ya paid alag replica. Baaki 39,999 merchants ka SLO toote bina.',
            'Ek grahak ke liye 39,999 grahakon ka dashboard 10 second — churn aur support tickets ka bada bill.',
            'Grahak ka vyavhaar badalna tumhare haath mein nahi. System ko hi isolation dena hoga.',
            'Bada DB kuch der madad karega, par report jitna CPU mile utna kha sakti hai. Agla bada tenant phir wahi karega. Isolation ka sawaal bacha rahega.',
          ],
        },
        {
          q: 'Kaun sa tenant shor kar raha hai — kaise pata karoge?',
          choices: [
            'Har query ke log mein merchant_id; DB time merchant ke hisaab se jod ke top 10',
            'DB ka kul CPU graph dekho; jo spike dikhe, wahi saara jawab de deta hai',
            'Sabse bade merchant ko seedha block karo; aksar wahi shor karta hai',
            'Har merchant ka alag metric label banao; 40,000 time series sasti hain',
          ],
          answer: 0,
          explain: 'Kul CPU batata hai ki dikkat hai; kiski wajah se, ye per-tenant hisaab batata hai. Logs ya query stats mein merchant_id jodo aur top N nikaalo.',
          choiceExplanations: [
            'Kul CPU batata hai ki dikkat hai; kiski wajah se, ye per-tenant hisaab batata hai. Logs ya query stats mein merchant_id jodo aur top N nikaalo.',
            'Kul graph mein sab merchants mile hue hain. Spike dikhta hai, maalik nahi.',
            'Andaaze se block karna galat grahak ko saza de sakta hai. Pehle naapo.',
            'Har label value ek nayi time series hai. 40,000 merchants × har metric = monitoring ka bill aur dheemi queries.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Noisy neighbour',
    instructions: 'Multi-tenant SaaS mein performance isolation. 🎤',
    questions: [
      {
        q: 'Multi-tenant SaaS mein noisy neighbour kaise rokoge?',
        choices: [
          'Per-tenant limits (rate, concurrency), bade tenants ko alag cell, per-tenant naap',
          'Sabke liye DB bada karte raho; jitna bada server, utni kam dikkat aati hai',
          'Tenants ko random shards par daalo; load apne aap baraabar ho jaayega',
          'Bade tenant ko Enterprise plan bech do; mehenga plan load kam karta hai',
        ],
        answer: 0,
        explain: 'Teen parat: tenant ki hadd (rate limit, concurrency, quota), bade ya khaas tenants ke liye alag cell, aur per-tenant naap taaki pata chale kaun shor kar raha hai.',
        choiceExplanations: [
          'Teen parat: tenant ki hadd (rate limit, concurrency), bade ya khaas tenants ke liye alag cell, aur per-tenant naap taaki pata chale kaun shor kar raha hai.',
          'Bada server shor ko der se aane deta hai, rokta nahi. Kharcha badhta jaata hai.',
          'Random shard average baraabar karta hai. Ek bada tenant apne shard ke saare padosiyon ko phir bhi dheema karega.',
          'Plan ka naam load nahi badalta. Mehenga plan alag resources ke saath ho tab kaam ka hai.',
        ],
      },
      {
        q: '"Cell-based architecture" kya hai, aur kab?',
        choices: [
          'Poore stack ki chhoti copy; har cell mein kuch tenants; ek cell ki aag doosre tak nahi',
          'Har microservice ko alag container mein chalana; container hi cell kehlata hai',
          'Database table ko cells (rows aur columns) mein baantna, spreadsheet jaisa',
          'Mobile network ke cell towers ke hisaab se users ko alag servers par bhejna',
        ],
        answer: 0,
        explain: 'Cell = app + DB + queue ki poori chhoti copy. Router batata hai ki tenant kis cell mein hai. Bura deploy ya noisy tenant sirf ek cell ko chhoota hai. Keemat: zyada copies chalana aur routing layer.',
        choiceExplanations: [
          'Cell = app + DB + queue ki poori chhoti copy. Router batata hai ki tenant kis cell mein hai. Bura deploy ya noisy tenant sirf ek cell ko chhoota hai. Keemat: zyada copies chalana aur routing layer.',
          'Container ek process ko alag karta hai. Cell poore stack ko — DB samet.',
          'Ye database ka layout hai, isolation ka design nahi.',
          'Naam milta-julta hai, par cell architecture network towers ki baat nahi karta.',
        ],
      },
    ],
  },
  success: [
    'Noisy neighbour ko per-tenant naap se pakadna',
    'Quota, alag replica/cell aur queue mein se chunna',
    'Isolation ki keemat (dheemi report, server ka kharcha) bolna',
  ],
  homework: `Apne kisi project mein ek saajha resource chuno (DB, queue, thread pool).
    Socho: ek user 10 guna load bheje toh baaki users ka p99 kya hoga? Ek hadd (rate limit ya concurrency) kahan lagaoge, aur limit paar hone par user ko kya jawab doge?`,
  cards: [
    { front: 'Noisy neighbour?', back: 'Saajhe resource par ek tenant ka bhaari kaam baaki sab ki latency badha deta hai.' },
    { front: 'Quota ki keemat?', back: 'Bade tenant ka kaam dheema (report 15 → 60 min). Baaki tenants ka SLO bachta hai.' },
    { front: 'Cell?', back: 'Poore stack ki chhoti copy, kuch tenants ke saath. Ek cell ki dikkat doosre cell tak nahi jaati.' },
    { front: 'Kaun shor kar raha hai?', back: 'Logs ya query stats mein merchant_id; DB time ka top 10. Metric label mat banao — 40,000 series.' },
  ],
},

/* ---------------------------------------------------------------- S6 */
{
  id: 'sec-secrets',
  icon: '🗝️',
  title: 'Secrets — git mein key leak ho gayi',
  badge: 'Chaabi Chaukidaar',
  objectives: [
    'Leak hui key: pehle <b>rotate aur revoke</b>, phir history saaf — kram kyun',
    'Secrets kahan rakhein: code, .env, secrets manager, chhoti umar ke credentials',
    '<b>Envelope encryption</b>: data key + master key (KMS)',
    '<b>Least privilege</b>: har service ki apni chhoti chaabi',
  ],
  lesson: [
    `<h3>🔑 Misaal: ghar ki chaabi WhatsApp group mein</h3>
     <p>Galti se ghar ki chaabi ki photo 200 logon ke group mein bhej di. Message "delete for everyone" kar diya.</p>
     <p>Par jinhone dekh li, unke paas copy hai. Pehla kaam: <b>taala badlo</b>. Phir message hatao.</p>
     <p class="tip">🎯 <b>Asli baat:</b> leak hui secret ko <b>chori hui</b> maano. Pehle naya secret banao aur purana radd karo (rotate + revoke).
       Git history saaf karna baad ka kaam hai. Public repos ko bots lagatar scan karte hain; key minton mein mil sakti hai.</p>`,
    `<h3>🏦 Secrets kahan rakhein?</h3>
     <table>
       <tr><th>Jagah</th><th>Haal</th></tr>
       <tr><td>Code mein <code>API_KEY = "sk_live_…"</code></td><td>❌ Har clone, har fork, har CI log mein</td></tr>
       <tr><td><code>.env</code> file repo mein (private repo bhi)</td><td>❌ Saare devs, CI, backups — sabke paas copy</td></tr>
       <tr><td>Deploy par secrets manager se env var</td><td>⚠️ Theek; par lambi umar ki key, aur crash dump ya debug page mein dikh sakti hai</td></tr>
       <tr><td>Workload identity: service ka role 1 ghante ka credential leta hai</td><td>✅ Chori hua credential jaldi bekaar; rotation apne aap</td></tr>
     </table>
     <p><b>Least privilege:</b> <code>payout-service</code> ka DB user sirf payouts table par likhe. Reports ka user sirf padhe. Ek admin user sab services mein = ek leak, poora DB.</p>`,
    `<h3>🧅 Envelope encryption</h3>
     <p>Data ko ek <b>data key (DEK)</b> se encrypt karo. DEK ko <b>master key</b> se encrypt (wrap) karke data ke saath rakho.
       Master key KMS (key management service) ke andar rehti hai — bahar aati hi nahi.</p>
     <ul>
       <li>Master key rotate? Sirf DEKs dobara wrap. Poora data dobara encrypt nahi.</li>
       <li>Har tenant ki alag DEK? Tenant ne "mera data mita do" kaha — uski DEK mita do. Backups ka data bhi padhne layak nahi (<b>crypto-shredding</b>).</li>
       <li>DB ka disk chori? Wrapped DEK bekaar, jab tak KMS se unwrap na ho — aur KMS har unwrap ka log rakhta hai.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'order',
      title: '🚨 Live payment key public repo mein — sahi kram',
      instructions: 'Developer ne .env commit kiya. Repo 40 minute public raha. Kaam ko sahi kram mein lagao.',
      steps: [
        { text: 'Gateway mein naya key banao (purani abhi chalu hai)', explain: 'Rotation ka pehla hissa. Naya key tayaar ho, tabhi purani band karne par services nahi rukengi.' },
        { text: 'Naya key secrets manager mein daalo; services reload karke naya key lein', explain: 'Minton ka kaam. Services naye key par aa gayi, ab purani key ki zaroorat kisi ko nahi.' },
        { text: 'Purani key radd karo — chori hui key ab bekaar', explain: 'Asli suraksha yahi hai. Agar logs mein chor abhi key chala raha dikhe, toh purani key turant radd karo, chahe thodi der payouts rukein.' },
        { text: 'Logs mein dekho: purani key se in 40 minute mein kaunsi calls hui', explain: 'Kya kisi ne refund ya payout chalaya? Nuksaan ginna aur zaroorat ho toh gateway ko report karna.' },
        { text: 'Git history se file hatao, force push; forks aur caches ka dhyaan rakho', explain: 'Ye safai hai, suraksha nahi. Key pehle hi radd ho chuki hai, isliye ab jaldi nahi.' },
        { text: 'Pre-commit secret scanning aur push protection chalu karo', explain: 'Agli baar commit hi na ho. Tool ek galti pakad leta hai jo insaan thakaan mein karta hai.' },
      ],
    },
    {
      type: 'bins',
      title: 'Ye tareeka kaisa hai?',
      instructions: 'Har aadat ko sahi dabbe mein daalo.',
      bins: [
        { id: 'bad', label: '❌ Mat karo' },
        { id: 'meh', label: '⚠️ Kaam chalau' },
        { id: 'good', label: '✅ Sahi tareeka' },
      ],
      items: [
        { text: 'Gateway key code mein: const API_KEY = "sk_live_…"', bin: 'bad', explain: 'Har clone, fork aur CI log mein key. Rotate karne ke liye code deploy.' },
        { text: '.env file repo mein commit; "repo toh private hai"', bin: 'bad', explain: 'Private repo bhi saare devs, CI aur backups tak jaata hai. Ek laptop chori = key chori.' },
        { text: 'Deploy par secrets manager se env var; 90 din mein rotate', bin: 'meh', explain: 'Code se bahar hai — achha. Par key lambi umar ki hai, aur env vars crash dumps ya debug pages mein dikh sakte hain.' },
        { text: 'Service ka role 1 ghante ka DB credential leti hai', bin: 'good', explain: 'Chori hua credential ek ghante mein bekaar. Rotation apne aap.' },
        { text: 'Naye developer ko secrets Slack DM mein bhej diye', bin: 'bad', explain: 'Chat history mein secrets saalon rehte hain, search mein aate hain.' },
        { text: 'Har tenant ki data key, KMS ki master key se wrap', bin: 'good', explain: 'Envelope encryption. Master key KMS se bahar nahi aati; tenant ki key mita ke data crypto-shred.' },
        { text: 'Saari services ek hi admin DB user share karti hain', bin: 'bad', explain: 'Ek service leak = poora DB. Har service ka alag user, kam permissions.' },
        { text: 'Logs mein Authorization header mask karke likhte hain', bin: 'good', explain: 'Logs bahut logon tak jaate hain. Token aur keys kabhi poore mat likho.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Secrets ke faisle',
      questions: [
        {
          q: 'Key public repo mein 40 minute rahi. Commit hata ke force push kar diya. Ab?',
          choices: [
            'Key ko chori hui maano: rotate aur revoke karo, purani key ki calls logs mein dekho',
            'Force push se history mit gayi; ab koi copy nahi bachi, koi khatra nahi',
            'Repo private kar do; private repo mein rakhi key surakshit rehti hai',
            'Code mein variable ka naam badal do; bots purane naam se hi dhoondhte hain',
          ],
          answer: 0,
          explain: '40 minute mein bots, forks aur caches copy le sakte hain. Force push sirf tumhari history badalta hai, doosron ki copies nahi. Purani key radd karna hi pakka ilaaj hai.',
          choiceExplanations: [
            '40 minute mein bots, forks aur caches copy le sakte hain. Force push sirf tumhari history badalta hai, doosron ki copies nahi. Purani key radd karna hi pakka ilaaj hai.',
            'Clones, forks aur scanner bots ke paas copy reh sakti hai. History mitane se unki copy nahi mitti.',
            'Leak ho chuki key private karne se wapas nahi aati. Aage ke liye bhi private repo secrets ki jagah nahi.',
            'Scanners key ka pattern pehchaante hain (jaise sk_live_), variable ka naam nahi.',
          ],
        },
        {
          q: 'Envelope encryption ka sabse bada faayda?',
          choices: [
            'Master key KMS se bahar nahi aati; rotate par sirf data keys dobara wrap',
            'Data do baar encrypt hota hai, isliye todna do guna mushkil ho jaata hai',
            'Saara data KMS ke andar rehta hai; app ke paas data hota hi nahi',
            'Data key aur master key ek hi chaabi hai; bas do naam diye gaye hain',
          ],
          answer: 0,
          explain: 'Bada data local data key se tez encrypt hota hai. Master key sirf chhoti data keys ko wrap karti hai aur KMS mein rehti hai. Rotation sasta, aur har unwrap ka audit log.',
          choiceExplanations: [
            'Bada data local data key se tez encrypt hota hai. Master key sirf chhoti data keys ko wrap karti hai aur KMS mein rehti hai. Rotation sasta, aur har unwrap ka audit log.',
            'Data ek hi baar encrypt hota hai (data key se). Doosri parat sirf data key par hai.',
            'KMS keys rakhta hai, bada data nahi. Data tumhare DB ya storage mein hi rehta hai.',
            'Do alag chaabiyan hain — yahi poora idea hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Secrets aur encryption',
    instructions: 'Production secrets ke design sawaal. 🎤',
    questions: [
      {
        q: 'Microservices ko DB password kaise doge?',
        choices: [
          'Secrets manager ya workload identity se chhoti umar ke credentials; har service alag',
          'Ek config server par saare passwords plain text; sab services wahin se padh lein',
          'Docker image mein bake kar do; image private registry mein surakshit hai',
          'Kubernetes Secret mein base64 kar do; base64 password ko encrypt kar deta hai',
        ],
        answer: 0,
        explain: 'Credential ki umar chhoti, scope chhota, aur har service ka alag. Leak ho toh ek service, kuch der. Rotation apne aap.',
        choiceExplanations: [
          'Credential ki umar chhoti, scope chhota, aur har service ka alag. Leak ho toh ek service, kuch der. Rotation apne aap.',
          'Ek jagah saare plain text passwords = ek leak, sab kuch. Access control aur audit bhi nahi.',
          'Image har node, cache aur registry mein copy hoti hai. Rotate karne ke liye nayi image banani padegi.',
          'base64 encoding hai, encryption nahi. Kubernetes Secret ko etcd encryption aur RBAC ke saath hi surakshit maano.',
        ],
      },
      {
        q: 'Tenant ne kaha "mera saara data mita do", backups mein bhi. Kaise?',
        choices: [
          'Har tenant ki alag data key; key mita do, backups ka data bhi padhne layak nahi',
          'Har backup ko kholo, us tenant ki rows hatao, aur backup dobara bana do',
          'Backups mein se kuch mitaya hi nahi ja sakta; tenant ko mana kar do',
          'Tenant ki rows par deleted = true laga do; data dikhna band ho jaayega',
        ],
        answer: 0,
        explain: 'Crypto-shredding: data encrypted hai aur key ab nahi hai, toh backups mein pada data bhi bekaar. Kanoon kuch records rakhne ko kahe (jaise tax), toh woh hissa alag niyam se.',
        choiceExplanations: [
          'Crypto-shredding: data encrypted hai aur key ab nahi hai, toh backups mein pada data bhi bekaar. Kanoon kuch records rakhne ko kahe (jaise tax), toh woh hissa alag niyam se.',
          'Saikdon backups kholna mehenga aur galti wala kaam. Ek bhi chhoota toh vaada toota.',
          'Mitaane ka raasta design se banta hai. Crypto-shredding yahi karta hai.',
          'Soft delete se data DB aur backups mein pada rehta hai. Ye mitaana nahi, chhupana hai.',
        ],
      },
    ],
  },
  success: [
    'Leak par pehle rotate/revoke, phir safai',
    'Chhoti umar ke credentials aur least privilege chunna',
    'Envelope encryption aur crypto-shredding samjhana',
  ],
  homework: `Apne kisi purane repo par ek secret scanner chalao (jaise gitleaks ya trufflehog, local machine par).
    Kuch mila? Toh woh key radd karo — history saaf karna baad mein.
    Phir socho: tumhari app ka DB user kitni tables par likh sakta hai, aur kitni par likhna zaroori hai?`,
  cards: [
    { front: 'Key leak — pehla kaam?', back: '<b>Rotate + revoke.</b> History saaf karna baad mein; copies pehle hi ban chuki hongi.' },
    { front: 'Secrets kahan?', back: 'Secrets manager ya workload identity. Code, .env repo aur chat mein nahi.' },
    { front: 'Envelope encryption?', back: 'Data → data key (DEK); DEK → master key (KMS mein). Rotate sasta, unwrap ka audit.' },
    { front: 'Crypto-shredding?', back: 'Tenant ki data key mita do. Backups mein pada encrypted data bhi bekaar.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['sec-noisy'] = {
  t: 'Ek tank, 40,000 nal — hadd lagao ya alag tank do',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Bina hadd: maang 110%</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="ni">🏬</span><span class="nl">MegaMart report</span><span class="ns">80% CPU</span></div>
          <div class="dg-node"><span class="ni">🍬</span><span class="nl">39,999 merchants</span><span class="ns">30% CPU → p99 10 s</span></div>
        </div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ Quota 20%: maang 50%</span>
        <div class="dg-stack">
          <div class="dg-node is-gold"><span class="ni">🏬</span><span class="nl">MegaMart report</span><span class="ns">20% CPU → 60 min</span></div>
          <div class="dg-node is-good"><span class="ni">🍬</span><span class="nl">39,999 merchants</span><span class="ns">30% CPU → p99 180 ms</span></div>
        </div>
      </div>
    </div>
    <div class="dg-cap">Doosra raasta: MegaMart ko alag replica (report tez, +₹1.2 lakh/mahina). Model ke numbers; asli DB par naapo.</div>`,
};
VISUALS['sec-secrets'] = {
  t: 'Leak ka kram, aur envelope encryption',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">💥 key public repo mein</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">1. naya key</span><span class="dg-arrow">→</span>
      <span class="dg-pill">2. services tak</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">3. purani radd</span><span class="dg-arrow">→</span>
      <span class="dg-pill">4. logs: nuksaan gino</span><span class="dg-arrow">→</span>
      <span class="dg-pill">5. history saaf</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">6. scanning chalu</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">📄 data</span><span class="dg-arrow">→ DEK se encrypt →</span>
      <span class="dg-pill">🔒 data + wrapped DEK</span><span class="dg-arrow">← DEK ko wrap ←</span>
      <span class="dg-pill good">🏦 KMS master key<br><small>bahar nahi aati</small></span>
    </div>`,
};

SD.addScenes({
  'sec-noisy': {
    intro: '1 tareekh. MegaMart ki mahine ki report aur 39,999 merchants ke dashboards — <b>ek hi primary DB</b>.',
    nodes: [
      { id: 'mega', col: 0, row: 0, icon: '🏬', label: 'MegaMart report', sub: '50 lakh rows' },
      { id: 'db', col: 2, row: 0, icon: '🗄️', label: 'Saajha primary DB', sub: 'CPU 0%' },
      { id: 'others', col: 0, row: 1, icon: '🍬', label: '39,999 merchants', sub: 'dashboards' },
      { id: 'quota', col: 1, row: 1, icon: '🚦', label: 'tenant quota', sub: 'abhi koi hadd nahi' },
      { id: 'replica', col: 3, row: 0, icon: '🗄️', label: 'Alag replica', sub: '+₹1.2 lakh/mahina' },
    ],
    steps: [
      { from: 'mega', to: 'db', label: 'report: 80% CPU', tone: 'bad', set: { db: { tone: 'bad', sub: 'CPU maang 80%' } }, say: 'MegaMart ki report 50 lakh rows padhti hai aur DB ka 80% CPU kha jaati hai.' },
      { from: 'others', to: 'db', label: 'dashboards: 30% CPU', set: { db: { tone: 'bad', sub: 'maang 110% — line' } }, say: 'Baaki 39,999 merchants ke dashboards ko 30% chahiye. Kul maang 110%: har query line mein.' },
      { at: ['others'], set: { others: { tone: 'bad', sub: 'p99 10 second' } }, say: 'Sharma Sweets ka chhota sa dashboard bhi 10 second. Galti Sharma Sweets ki nahi, padosi ki hai.' },
      { at: ['quota'], set: { quota: { tone: 'gold', sub: 'MegaMart: max 20%' } }, say: 'Ilaaj 1: quota. MegaMart ki queries DB ka zyada se zyada 20% CPU le sakti hain.' },
      { from: 'mega', to: 'quota', label: 'line mein ruko', say: 'MegaMart ki report ab hadd ke andar chalti hai. Hadd se zyada maangi gayi query line mein rukti hai.' },
      { at: ['db', 'others'], set: { db: { tone: 'good', sub: 'maang 50%' }, others: { tone: 'good', sub: 'p99 180 ms' } }, say: 'Kul maang 50%. Baaki merchants ka dashboard wapas 180 ms.' },
      { at: ['mega'], set: { mega: { tone: 'gold', sub: 'report 15 → 60 min' } }, say: 'Keemat: MegaMart ki report 15 se 60 minute. MegaMart naraaz ho sakta hai.' },
      { at: ['replica'], set: { replica: { tone: 'good', sub: 'report yahan, tez' } }, say: 'Ilaaj 2: MegaMart ko alag replica. Report tez rehti hai, primary bacha. Keemat: har mahine server ka kharcha, aur replica par data thoda purana.' },
    ],
  },
  'sec-secrets': {
    intro: 'Developer ne galti se <code>.env</code> commit kiya. Andar payment gateway ki <b>live key</b>. Repo public tha.',
    nodes: [
      { id: 'dev', col: 0, row: 0, icon: '👩‍💻', label: 'Developer', sub: 'git push' },
      { id: 'repo', col: 1, row: 0, icon: '📂', label: 'Public repo', sub: '.env andar' },
      { id: 'bot', col: 2, row: 0, icon: '🤖', label: 'Scanner bot', sub: 'internet par', tone: 'bad' },
      { id: 'gw', col: 3, row: 0, icon: '🏦', label: 'Payment gateway' },
      { id: 'vault', col: 1, row: 1, icon: '🗄️', label: 'Secrets manager' },
      { id: 'svc', col: 2, row: 1, icon: '⚙️', label: 'payout-service' },
    ],
    steps: [
      { from: 'dev', to: 'repo', label: 'git push (.env)', tone: 'bad', say: 'Commit mein .env file chali gayi. Andar sk_live_ se shuru hone wali key.' },
      { from: 'repo', to: 'bot', label: 'key mili', tone: 'bad', say: 'Public repos ko bots lagatar scan karte hain. Key minton mein kisi aur ke paas ho sakti hai.' },
      { from: 'bot', to: 'gw', label: 'refund API?', tone: 'bad', say: 'Chori hui key se koi refund ya payout chala sakta hai. Har minute khatra hai.' },
      { from: 'gw', to: 'vault', label: 'naya key', tone: 'good', set: { gw: { tone: 'gold', sub: 'naya key bana' } }, say: 'Rotation shuru: gateway mein naya key banao. Naya key secrets manager mein jaata hai, code ya repo mein nahi.' },
      { from: 'vault', to: 'svc', label: 'reload', tone: 'good', say: 'payout-service naya key padhti hai. Ab purani key ki zaroorat kisi service ko nahi.' },
      { at: ['gw', 'bot'], set: { gw: { tone: 'good', sub: 'purani key radd' }, bot: { tone: '', sub: 'key bekaar' } }, say: 'Purani key radd. Chori hui key ab bekaar. Chor abhi key chala raha ho toh ye kadam sabse pehle, chahe payouts thodi der rukein.' },
      { at: ['repo'], set: { repo: { tone: 'gold', sub: 'history saaf' } }, say: 'Ab git history saaf karo. Ye safai hai, suraksha nahi: copies pehle hi ban chuki hongi.' },
      { at: ['dev'], set: { dev: { tone: 'good', sub: 'pre-commit scanning' } }, say: 'Aage ke liye: pre-commit secret scanning aur push protection. Galti commit tak pahunche hi nahi.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-sec-noisy', levels: 'sec-noisy', guide: {
    title: 'Hadd lagao ya alag tank do?',
    misaal: 'Society ke tank se ek flat pool bhar raha hai; baaki nal sookhe. Har nal par hadd lagao, ya pool wale flat ko alag tank do.',
    asli: 'Saajhe resource par ek tenant ka bhaari kaam baaki tenants ki latency badhata hai. Performance isolation bhi data isolation jitna zaroori hai.',
    points: [
      '<b>Naapo:</b> per-tenant DB time, top N; kul graph kaafi nahi.',
      '<b>Quota:</b> sasta; bade tenant ka kaam dheema.',
      '<b>Alag replica/cell:</b> tez; har mahine ka kharcha aur routing.',
    ],
    use: 'Ek tenant ka load baaki tenants ke p99 ko tod raha ho.',
    avoid: 'Sirf bada server lekar shor ko der se aane dena.',
    mistake: '40,000 tenants ko metric label banana — monitoring ka bill aur dheemi queries.',
    compare: [
      { choice: 'Quota / concurrency limit', when: 'Bade tenant ka kaam der se ho sakta hai', tradeoff: 'Koi naya server nahi; bada tenant naraaz ho sakta hai' },
      { choice: 'Alag replica ya cell', when: 'Bada tenant zyada paisa deta hai aur tez kaam chahiye', tradeoff: 'Tez aur alag; server ka kharcha, routing aur replica lag' },
    ],
    followup: 'MegaMart ki report raat 2 baje queue mein chali gayi, par 3 merchants bhi raat ko bhaari export chalaate hain. Ab kya?',
    sources: [
      { title: 'Azure Architecture Center — Noisy Neighbor antipattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/antipatterns/noisy-neighbor/noisy-neighbor' },
      { title: 'AWS — Reducing the scope of impact with cell-based architecture', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html' },
    ],
  } },
  { id: 'pro-sec-secrets', levels: 'sec-secrets', guide: {
    title: 'Pehle taala badlo, phir message hatao',
    misaal: 'Chaabi ki photo group mein chali gayi. Message mitane se copies nahi mitti; taala badalna hi asli ilaaj hai.',
    asli: 'Leak hui secret ko chori hui maano: rotate aur revoke pehle. Aage ke liye chhoti umar ke credentials, least privilege aur envelope encryption.',
    points: [
      '<b>Kram:</b> naya key → services tak → purani radd → nuksaan gino → history saaf → scanning.',
      '<b>Umar:</b> 1 ghante ka credential leak hone par jaldi bekaar.',
      '<b>Envelope:</b> master key KMS mein; data keys wrap; crypto-shredding.',
    ],
    use: 'Kisi bhi API key, DB password ya signing key ko services tak pahunchana ho.',
    avoid: 'Secrets code, repo (private bhi), chat ya Docker image mein mat rakho.',
    mistake: 'Force push ke baad key ko surakshit maan lena.',
    compare: [
      { choice: 'Secrets manager se env var', when: 'Purani app, workload identity nahi hai', tradeoff: 'Code se bahar; par lambi umar ki key aur dumps mein dikhne ka khatra' },
      { choice: 'Workload identity, chhote credentials', when: 'Cloud ya Kubernetes par service identity mil sakti hai', tradeoff: 'Leak jaldi bekaar; setup aur identity ka dhaancha chahiye' },
    ],
    followup: 'Signing key leak hui jisse saare JWT bante hain. Rotate karoge toh sab users logout honge. Kaise karoge?',
    sources: [
      { title: 'OWASP — Secrets Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html' },
      { title: 'AWS KMS — Envelope encryption', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html#enveloping' },
      { title: 'GitHub — About push protection (secret scanning)', url: 'https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection' },
    ],
  } },
);
})();
