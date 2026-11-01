/* =====================================================================
   TRACK 8 — 📡 The Feed: Asli Posts, Asli Outages

   Yeh track feed se banta hai. Do kism ka content hai:
     1. PUBLIC POSTMORTEMS — Cloudflare, GitHub, AWS, Roblox, Slack ne
        khud jo likha, uske asli timeline aur asli numbers ke saath.
     2. FEED-DRIVEN TOPICS — vector search, multi-region, progressive
        rollout, cost-per-request, napkin math.

   Naya post aaye toh yahi track badhta hai. Naya level yahan add karo,
   VISUALS mein uska diagram daalo, aur `node validate.js` chalao.

   ✍️ LIKHNE KA NIYAM (ADHD): "yeh / woh / uska / isse / wahan" ko kisi
   pehle bataye hue naam ki jagah mat likho — naam DOBARA likho. Har
   vaakya apne aap mein poora padha jaana chahiye.

   ⚠️ Poori file IIFE ke andar hai: data-flow.js apne top level par
   `const allOf` declare karti hai, aur games.js `const el` — do script
   ek hi naam ko top level par `const` nahi kar sakte.
   ===================================================================== */
(function () {

/* =====================================================================
   F1 — Cloudflare, 18 November 2025: config bhi ek INPUT hai
   ===================================================================== */
SD.registerLevels('feed', [
{
  id: 'pm-config',
  icon: '🧨',
  title: 'Postmortem — Config bhi INPUT hai',
  badge: 'Config Chowkidar',
  objectives: [
    'Ek permission change poore internet ko kaise le doobi',
    'Hardcoded limit + unwrap() = panic',
    'Outage jo har 5 minute par on-off hota raha — aur team ko attack laga',
    'Apne hi banaye config ko user input ki tarah validate karna',
  ],
  lesson: [
    `<h3>📰 Feed se: Cloudflare ka apna postmortem, 18 November 2025</h3>
     <p>18 November 2025 ko Cloudflare ka core network gir gaya. Cloudflare ne khud
     jo postmortem likha, uska pehla vaakya yaad rakhne layak hai:
     <b>outage kisi attack se nahi hua</b>. Outage ek <b>database permission change</b> se hua.</p>
     <h3>🔗 Zanjeer — har kadi apne aap mein bilkul safe thi</h3>
     <pre>1. ClickHouse mein ek PERMISSION change hua (security behtar karne ke liye)
   Pehle: user ko sirf 'default' database ke columns dikhte the
   Ab:    user ko 'r0' database ke columns BHI dikhne lage

2. Bot Management har 5 minute par ek FEATURE FILE banata hai
   Us file ki query mein database ka naam filter nahi tha
   Ab additional schema metadata aaya → query rows more than double hui

3. Proxy (FL2) us feature file ko memory mein pehle se jagah dekar padhta hai
   Us pre-allocation ki HARDCODED limit thi: 200 features
   Asli istemaal: lagbhag 60 features  →  limit "kabhi nahi lagegi" lagti thi

4. Generated feature file 200 se upar chali gayi  →  Rust code mein
   Result::unwrap() ek Err par chala  →  PANIC  →  5xx</pre>
     <p class="tip">🎯 Har kadi alag se dekho toh sab theek hai. Permission change
     sahi tha. Feature file roz banti thi. 200 ki limit teen guna headroom thi.
     Outage <b>kisi ek kadi</b> se nahi hua — outage <b>zanjeer</b> se hua.</p>
     <h3>💡 Asli sabak: config ek INPUT hai</h3>
     <p>Cloudflare ne apne remediation mein khud likha: apne banaye hue config
     files ko <b>usi tarah</b> validate karo jaise user ke bheje hue input ko
     karte ho. Team ne user input par to hamesha bounds-check lagaya tha, par
     apne hi generate kiye config par nahi.</p>
     <p>Har team yahi galti karti hai. Tumhara code sochta hai: "yeh file toh
     humne hi banayi hai, isme galat kya ho sakta hai." Jawab: <b>bahut kuch</b>.
     Feature file ko banane wali query aur file ko padhne wala proxy do alag
     services hain, do alag teams ki hain, aur beech mein koi contract test nahi tha.</p>`,
    `<h3>🌀 Sabse mehenga hissa: outage FLICKER kar raha tha</h3>
     <p>ClickHouse cluster ke nodes ek-ek karke update ho rahe the. Matlab har
     5 minute par feature file ya to <b>kharab</b> node se banti thi ya
     <b>theek</b> node se. Nateeja: Cloudflare girta, phir apne aap theek ho
     jaata, phir girta.</p>
     <pre>11:05  permission change deploy hua
11:20  pehli network failures — 5xx shuru
       ... har 5 minute par: theek → kharab → theek → kharab ...
13:04  Workers KV ko core proxy bypass karaya; asar kam hua
14:30  sahi feature file wapas daali gayi — core traffic chal pada
17:06  sab systems normal</pre>
     <p>Us flickering ne team ko <b>galat raaste</b> par bhej diya. Ek service
     jo apne aap theek ho jaaye aur phir apne aap gir jaaye — woh bilkul ek
     bade DDoS attack jaisi dikhti hai. Cloudflare ke engineers ne shuru mein
     attack hi socha, aur us shak par kaafi waqt gaya.</p>
     <p class="tip">🎯 Yahan se ek niyam nikalta hai: <b>intermittent failure ko
     attack maan lena bahut aasan hai</b>. Jab koi cheez apne aap theek ho jaaye,
     sabse pehle poochho — "pichhle 30 minute mein kya-kya <b>deploy</b> hua,
     chahe woh code na ho?" Config, permission, feature flag, DB migration —
     sab deploy hain.</p>
     <h3>🔒 Aur ek chhoti si cheez: unwrap()</h3>
     <p>Rust mein <code>unwrap()</code> ka matlab hai "mujhe pura yakeen hai ki
     yahan error nahi aayega". Jab yakeen galat nikla, process panic kar gaya.
     Ek graceful degradation — jaise "feature file kharab hai, purani file
     istemaal karo" — outage ko ek metric alert mein badal deti.</p>
     <table>
       <tr><th>Jo hua</th><th>Jo hona chahiye tha</th></tr>
       <tr><td>File > 200 features → panic → 5xx</td><td>File > 200 features → log + alert + purani file par rehna</td></tr>
       <tr><td>Config generate karne wali query ka koi test nahi</td><td>Generated file ka schema + row-count check, deploy se pehle</td></tr>
       <tr><td>Config poore fleet par ek saath</td><td>Config bhi staged: 1% → 10% → 100%</td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 18 November 2025',
      instructions: "Timeline chalao. Jahan sawaal aaye, wahan replay rukega. Timeline source-based hai; chart percentages aur intermediate feature counts illustrative teaching values hain.",
      incident: 'Cloudflare — 18 Nov 2025',
      goal: 'Poori timeline dekho aur teen faisle ke mod par sahi call lo.',
      speedMs: 2000,
      metrics: [
        { id: 'err', label: '5xx error rate', unit: '%', max: 100, dir: 'lower' },
        { id: 'served', label: 'Traffic sahi se serve hua', unit: '%', max: 100, dir: 'higher' },
        { id: 'feat', label: 'Feature file ki rows', unit: '', max: 300, dir: 'lower' },
      ],
      frames: [
        { t: '11:00', event: 'Sab normal. Bot Management ki feature file mein lagbhag <b>60</b> features hain, limit <b>200</b> hai.', metrics: { err: 0, served: 100, feat: 60 } },
        { t: '11:05', event: 'ClickHouse par ek <b>permission change</b> deploy hua — security behtar karne ke liye. Users ab <code>r0</code> database ke columns bhi dekh sakte hain.', metrics: { err: 0, served: 100, feat: 60 }, note: 'Is kadam ka Bot Management se koi dikhta hua rishta nahi tha.' },
        { t: '11:15', event: "Feature query database filter ke bina additional schema metadata laa rahi hai. Source ke mutabik query rows more than double hui; intermediate chart count illustrative hai.", metrics: { err: 0, served: 100, feat: 140 }, tone: 'warn' },
        { t: '11:20', event: 'File <b>200 se upar</b> nikal gayi. FL2 proxy ne pre-allocated jagah se zyada padha, <code>unwrap()</code> ek Err par chala — <b>panic</b>. 5xx phailne lage.', metrics: { err: 62, served: 38, feat: 240 }, tone: 'bad',
          ask: { q: "Ek network par ek saath 5xx phat gaye hain. Sabse pehla sawaal kya poochhoge?",
                 choices: [
                   'Pichhle badlav aur 5xx shuru hone ka waqt milao: code, config, permission sab dekho',
                   '5xx badhe hain, toh attack maan kar traffic rokne ki taiyaari shuru karo',
                   'CPU ka graph saaf mile, toh naye config aur permission ki jaanch chhod do',
                   'Pehli customer report ko wajah maano, aur bas customer ka account dekho',
                 ], answer: 0,
                 explain: '5xx kai wajah se aa sakte hain. Badlav aur asar ka waqt milao, phir logs se wajah jaancho. Cloudflare mein permission change trigger tha; sirf code deploy dekhna kaafi nahi tha.',
                 wrongHints: [
                   'DDoS ka shak yahin par team ko mehenga pada — flickering failure attack jaisi dikhti hai, par attack thi nahi.',
                   'Customer-wise cut kaam ka hai, par outage har customer par tha — cut se koi pattern nahi milta.',
                   'CPU aur memory bilkul theek the. Process panic kar raha tha, thak nahi raha tha.',
                 ] , choiceExplanations: [
                   '5xx kai wajah se aa sakte hain. Badlav aur asar ka waqt milao, phir logs se wajah jaancho. Cloudflare mein permission change trigger tha; sirf code deploy dekhna kaafi nahi tha.',
                   'Attack ka shak ho sakta hai; 5xx akele attack ka saboot nahi hain.',
                   'CPU theek hone par bhi config galat ya process crash ho sakta hai.',
                   'Report se asar pata chalta hai; failure ki wajah alag se dhoondhni hai.',
                 ],
               } },
        { t: '11:35', event: 'Sewa <b>apne aap theek</b> ho gayi — us baar file ek purane ClickHouse node se bani thi.', metrics: { err: 4, served: 96, feat: 60 }, tone: 'warn' },
        { t: '11:40', event: 'Aur dobara gir gayi. Har 5 minute par file ya to kharab node se ban rahi hai ya theek node se.', metrics: { err: 58, served: 42, feat: 240 }, tone: 'bad',
          ask: { q: 'Failure har 5 minute par laut raha hai. Kaunsi jaanch se shuru karoge?',
                 choices: [
                   'Har 5 minute chalne wali jobs aur banti files ka waqt failure se milao',
                   'Har 5 minute ka cycle attack ka saboot maano aur traffic block karo',
                   'Har 5 minute ka cycle dekh kar autoscaler ko wajah maan kar rok do',
                   'Har 5 minute girne par ek server kharab maano aur server badal do',
                 ], answer: 0,
                 explain: 'Har 5 minute ka cycle periodic jobs, config refresh ya scaling ki jaanch ka clue hai. Cloudflare mein alag query results se acchi aur kharab files ban rahi thi. Cycle akele wajah pakki nahi karta.',
                 wrongHints: [
                   'Attack ka shak team ne bhi kiya — aur usi shak par kaafi waqt gaya. Attack itna theek 5-minute period nahi rakhta.',
                   'Autoscaler chal raha tha par saaf tha; instances healthy the, process panic kar raha tha.',
                   'Ek kharab node hota toh sirf uske requests girte, poora network nahi.',
                 ] , choiceExplanations: [
                   'Har 5 minute ka cycle periodic jobs, config refresh ya scaling ki jaanch ka clue hai. Cloudflare mein alag query results se acchi aur kharab files ban rahi thi. Cycle akele wajah pakki nahi karta.',
                   'Attack bhi jaancho, par cycle internal job se bhi aa sakta hai.',
                   'Scaling events aur failure ka waqt milaye bina autoscaler ko dosh dena jaldi hai.',
                   'Routing aur file versions jaancho; cycle akele ek kharab server ka saboot nahi hai.',
                 ],
               } },
        { t: '13:05', event: 'Workers KV ko kharab raaste se <b>bypass</b> kiya gaya — asar thoda kam hua.', metrics: { err: 34, served: 66, feat: 240 }, tone: 'warn' },
        { t: '14:30', event: 'Sahi feature file manually daali gayi aur naye file generation ko rok diya gaya. <b>Core traffic chal pada.</b>', metrics: { err: 3, served: 97, feat: 60 }, tone: 'ok',
          ask: { q: 'Aage aisa dobara na ho — sabse zaroori ek badlav kaunsa hai?',
                 choices: [
                   'Config jaancho, bounds lagao; kharab file aaye toh aakhri acchi copy rakho',
                   'Limit 200 se 2000 kar do; nayi files ki jaanch baad ke kaam mein rakho',
                   'Permission change wapas lo; file padhne wala code jaisa hai chalne do',
                   'unwrap() ki jagah expect() lagao; error message saaf karne par dhyaan do',
                 ], answer: 0,
                 explain: 'Nayi file ka schema aur size jaancho. Limit toote toh file reject karo aur surakshit fallback lo. Badi limit ya saaf panic message se kharab input sambhalne ka raasta nahi banta.',
                 wrongHints: [
                   'Limit badhana ek naya bada number chunna hai, problem nahi hatana. Aur 2000 rows wali file bhi kabhi ban sakti hai.',
                   'Permission change security ke liye sahi tha. Sahi kaam rokna galat sabak hai.',
                   '<code>expect()</code> se message accha aata hai, par process phir bhi panic karta hai. Outage ka size wahi rehta hai.',
                 ] , choiceExplanations: [
                   'Nayi file ka schema aur size jaancho. Limit toote toh file reject karo aur surakshit fallback lo. Badi limit ya saaf panic message se kharab input sambhalne ka raasta nahi banta.',
                   '2000 ki limit bhi toot sakti hai; invalid file ko sambhalna abhi baaki hai.',
                   'Rollback turant asar ghata sakta hai; agli kharab file ka raasta phir bhi khula hai.',
                   'expect() bhi Err par panic karta hai. Saaf message recovery nahi hai.',
                 ],
               } },
        { t: '17:06', event: 'Saare downstream systems normal. Kul asar: lagbhag <b>6 ghante</b>.', metrics: { err: 0, served: 100, feat: 60 }, tone: 'ok' },
      ],
      lesson: `💡 <b>Teen baatein saath yaad rakho.</b>
        <b>1.</b> Config ek input hai — apne hi banaye config par bhi bounds lagao.
        <b>2.</b> Limit toote toh <b>degrade</b> karo, panic mat karo: aakhri accha
        config chalta rehna chahiye. <b>3.</b> Jab failure ka period kisi cron ya
        refresh interval se mile, sabse pehle usi generator ko dekho — 5 minute ka
        cycle Bot Management ki 5-minute file thi.`,
    },
    {
      type: 'archdiff',
      title: 'Yahi pipeline, teen chhupi hui galtiyan',
      instructions: 'Neeche wahi config pipeline hai. Teen box galat hain — click karke pakdo.',
      brief: `Ek Bot Management feature pipeline. ClickHouse se query chalti hai,
        har 5 minute par ek feature file banti hai, aur duniya bhar ke proxies
        us file ko padhte hain.`,
      goal: 'Teen galtiyan pakdo. Har box par click karne se uska faisla khulta hai — sahi box bhi kuch sikhata hai.',
      nodes: [
        { id: 'ch', label: '🗃️ ClickHouse', sub: 'features ka source data', row: 0 },
        { id: 'query', label: '🔎 Generator query', sub: 'SELECT ... FROM system.columns — koi database filter nahi', row: 0 },
        { id: 'file', label: '📄 Feature file', sub: 'har 5 min banti hai — koi row-count check nahi', row: 1 },
        { id: 'dist', label: '📦 Distribution', sub: 'file ek saath poore fleet par jaati hai', row: 1 },
        { id: 'proxy', label: '⚡ FL2 proxy', sub: '200 features pre-allocate, phir unwrap()', row: 2 },
        { id: 'metrics', label: '📊 Metrics', sub: '5xx rate par alert lagta hai', row: 2 },
      ],
      flaws: [
        { id: 'query', why: 'Query mein database ka filter nahi hai. Permission badalte hi wahi column do database se aane laga aur rows doguni ho gayin. <b>Generator query hamesha explicit honi chahiye</b> — "jo dikhe sab le lo" ek din zyada dikha dega.' },
        { id: 'file', why: 'Feature file par koi <b>row-count ya schema check</b> nahi hai. Yahi jagah thi jahan outage shuru hote hi ruk sakta tha: "rows 60 se 240 ho gayin? file mat bhejo, alert karo."' },
        { id: 'proxy', why: 'Do galtiyan ek saath: <b>hardcoded 200</b> ki limit, aur limit toot-ne par <code>unwrap()</code> se <b>panic</b>. Panic ki jagah "purani achhi file par raho" hota toh outage ek alert bhar hota.' },
      ],
      fine: {
        ch: 'ClickHouse ne kuch galat nahi kiya. Permission change security ke liye sahi tha, aur ClickHouse ne bilkul wahi lautaya jo query ne maanga.',
        dist: 'Ek saath poore fleet par bhejna yahan asli galti nahi thi — Cloudflare ko config <b>tezi</b> se phailana hi hota hai (threat response ke liye). Staged rollout achha hoga, par pehla fix validation hai: kharab file kabhi banni hi nahi chahiye thi.',
        metrics: '5xx par alert bilkul laga aur 11:20 par turant bhi baja. Detection kaam kar gaya — diagnosis atki, kyunki failure har 5 minute par aata-jaata tha.',
      },
      lesson: `🎯 Teenon galtiyan ek hi line par hain: <b>banane wala</b> (query),
        <b>artifact</b> (file), aur <b>padhne wala</b> (proxy). Beech mein kahin bhi
        ek bound-check hota toh outage ruk jaata. Jab do teams ek file ke zariye
        baat karti hain, woh file ek <b>API</b> hai — aur har API par validation
        chahiye.`,
    },
    {
      type: 'quiz',
      title: 'Config-as-input ke sabak',
      questions: [
        {
          q: 'Tumhari service ek internal config file padhti hai jo koi doosri team har ghante generate karti hai. Kaunsa niyam sabse zaroori hai?',
          choices: [
            'Schema aur size jaancho; galat nayi file par aakhri accha config chalao',
            'Har ghante latest file lo; internal team ki jaanch par bharosa rakho',
            'Checksum badle toh alert bhejo; nayi file ko turant istemaal kar lo',
            'File seedhi padho; local copy hatakar purane config ka jhanjhat ghatao',
          ],
          answer: 0,
          explain: 'Internal team bhi galat config bana sakti hai. Schema, size aur row bounds jaancho. Nayi file reject ho toh aakhri acchi copy par rehne ki policy rakho; purani copy ka istemaal bhi service ke niyamon ke andar ho.',
          choiceExplanations: [
            'Internal team bhi galat config bana sakti hai. Schema, size aur row bounds jaancho. Nayi file reject ho toh aakhri acchi copy par rehne ki policy rakho; purani copy ka istemaal bhi service ke niyamon ke andar ho.',
            'Producer ki jaanch kaam ki hai, par consumer ke bounds bhi bachane padte hain.',
            'Checksum badlav ya bytes ki gadbad bata sakta hai; sahi schema aur meaning ki guarantee nahi deta.',
            'Local acchi copy hata di toh nayi kharab file par fallback mushkil hoga.',
          ],
        },
        {
          q: '200 features ki limit thi, istemaal lagbhag 60 tha. Limit surakshit kyun lagi, aur asli kami kya thi?',
          choices: [
            '60 ke muqaable 200 bada laga; asli kami limit tootne par panic thi',
            '60 ke muqaable 200 chhota tha; bas limit 2000 karna zaroori tha',
            'Limit code mein thi; config se number aate hi failure sambhal jaata',
            'Memory pehle reserve hui thi; dynamic memory lete hi risk hat jaata',
          ],
          answer: 0,
          explain: '200 mein lagbhag teen guna headroom tha. Phir bhi file badi ho sakti thi. Pre-allocation jaayaz hai; limit tootne par panic ki jagah file reject karne aur fallback ka raasta chahiye.',
          choiceExplanations: [
            '200 mein lagbhag teen guna headroom tha. Phir bhi file badi ho sakti thi. Pre-allocation jaayaz hai; limit tootne par panic ki jagah file reject karne aur fallback ka raasta chahiye.',
            'Badi limit kuch jagah degi, par galat input aur limit tootne ka raasta baaki rahega.',
            'Number config se lena tuning aasan karta hai; failure kaise sambhalega, code ko phir bhi tay karna hai.',
            'Dynamic allocation bhi memory khatam kar sakta hai. Input bounds ki zaroorat rehti hai.',
          ],
        },
        {
          q: 'Outage har 5 minute par aa-ja raha tha. Team ko attack ka shak kyun hua?',
          choices: [
            'Acchi aur kharab files se service gir-uth rahi thi; attack jaisa asar dikha',
            'Postmortem ne DDoS traffic pakda tha; attack se service baar-baar gir rahi thi',
            'Attack ka alert aaya tha; alert ke kaaran ClickHouse permission badli gayi',
            'Failure laut aaya tha; purani file par recovery ne config ko dosh se chhuda diya',
          ],
          answer: 0,
          explain: 'Rolling permission change ke dauraan query kabhi purane aur kabhi badle node se chali. File ke saath service ka haal badalta tha. Girna aur khud theek hona attack jaisa laga; asal trigger config banane ke raaste mein tha.',
          choiceExplanations: [
            'Rolling permission change ke dauraan query kabhi purane aur kabhi badle node se chali. File ke saath service ka haal badalta tha. Girna aur khud theek hona attack jaisa laga; asal trigger config banane ke raaste mein tha.',
            'Cloudflare ne bataya ki incident attack se nahi hua tha.',
            'Permission change ne query ko extra metadata dikhaya; attack alert trigger nahi tha.',
            'Purani acchi file par recovery config ke shak ko badhati hai; agla kharab version phir asar kar sakta hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Ek "safe" permission change se outage tak ki poori zanjeer bata sakte ho',
    'Apne generate kiye config par bounds aur fallback lagana jaante ho',
    'Limit tootne par panic vs degrade ka farak bol sakte ho',
    'Flapping failure ko generator ke period se jod sakte ho',
  ],
  homework: `Apne system mein ek aisi config ya data file dhoondo jo koi doosri
    team ya koi job generate karti hai. Do sawaal poochho: (1) uska size ya row
    count achanak double ho jaaye toh tumhara code kya karega? (2) kya tumhare
    paas "aakhri acchi copy" par rehne ka raasta hai? Agar dono ke jawab nahi
    hain, tumhare paas Cloudflare wali zanjeer maujood hai.`,
  cards: [
    { front: 'Cloudflare 18 Nov 2025 — trigger kya tha?', back: "Ek <b>ClickHouse permission change</b>. Feature-file query mein database filter nahi tha, isliye extra metadata rows aayi aur generated file 200-feature limit paar kar gayi, aur FL2 proxy ka <code>unwrap()</code> <b>panic</b> kar gaya." },
    { front: 'Config-as-input ka niyam?', back: 'Apne banaye config ko <b>user input</b> ki tarah validate karo: schema, row bounds, size. Aur naya config galat ho toh <b>aakhri acche config</b> par raho — panic mat karo.' },
    { front: 'Limit ka asli sawaal kya hai?', back: 'Number nahi — <b>failure mode</b>. 200 ho ya 2000, sawaal yeh hai ki limit tootne par <b>panic</b> hota hai ya <b>degrade</b>. Panic = outage. Degrade = alert.' },
    { front: 'Service har 5 minute par gir aur uth rahi hai — pehla shak?', back: 'Koi cheez <b>periodically generate</b> ho rahi hai aur uske do version hain. Failure ka period kisi cron/refresh interval se mile toh seedha usi <b>generator</b> ko dekho — attack mat maano.' },
    { front: '"Kya deploy hua?" mein kya-kya ginte ho?', back: 'Sirf code nahi — <b>config, permission, feature flag, DB migration, index, IAM policy</b>. Cloudflare ka trigger code deploy tha hi nahi.' },
  ],
  interview: {
    title: 'Interview Round — Config pipeline',
    instructions: 'Yeh sawaal ab har senior round mein aata hai. 🎤',
    questions: [
      {
        q: '"Ek internal config file duniya bhar ke servers padhte hain. Tum kaise design karoge?"',
        choices: [
          'File jaancho aur version do; chhote rollout ke saath acchi copy bachao',
          'File jaancho aur latest naam par likho; purana version saath hi hatao',
          'File ka version rakho; sab servers par pehle bhejo, jaanch baad mein karo',
          'Har server restart karo; kharab file mile toh poora fleet wapas chalao',
        ],
        answer: 0,
        explain: 'Generator aur consumer dono par jaanch rakho. Version se rollback, chhote rollout se kam asar, aur aakhri acchi copy se fallback milta hai. Koi ek check har galti nahi pakadta.',
        choiceExplanations: [
          'Generator aur consumer dono par jaanch rakho. Version se rollback, chhote rollout se kam asar, aur aakhri acchi copy se fallback milta hai. Koi ek check har galti nahi pakadta.',
          'Purani copy hata di toh validation se chhuti galti par rollback ka raasta kho sakta hai.',
          'Jaanch se pehle fleet par bhejna kharab file ko sab servers tak pahuncha sakta hai.',
          'Sab servers ek saath restart karna kharab config ka asar aur phaila sakta hai.',
        ],
      },
      {
        q: '"Tumhare service mein ek hardcoded limit hai. Interviewer poochhta hai — limit kitni honi chahiye?"',
        choices: [
          'Pehle limit tootne ka raasta tay karo; phir load dekh kar number chuno',
          'Aaj ke load ka 10x chuno; limit tootne ka kaam agli review tak rakho',
          'Dynamic memory chuno; input size ki limit hatakar code seedha rakho',
          'Limit config se lo; badalne mein aasani ko hi kaafi suraksha maano',
        ],
        answer: 0,
        explain: 'Limit sizing aur failure handling dono chahiye. Pehle tay karo ki bound tootne par reject, degrade ya fallback kaise hoga. Phir measured load, headroom aur alerts se number chuno.',
        choiceExplanations: [
          'Limit sizing aur failure handling dono chahiye. Pehle tay karo ki bound tootne par reject, degrade ya fallback kaise hoga. Phir measured load, headroom aur alerts se number chuno.',
          '10x headroom bhi anjaane input ya schema badlav se bhar sakta hai.',
          'Physical memory limited hai; input ka budget phir bhi chahiye.',
          'Config se limit badal sakte ho, par galat config aur saturation ko dekhna phir bhi zaroori hai.',
        ],
      },
    ],
  },
},
]);

})();

/* =====================================================================
   F2 — Cloudflare, 2 July 2019: ek regex, aur poori duniya
   F3 — GitHub, 21 October 2018: 43 second, 24 ghante
   ===================================================================== */
(function () {
SD.registerLevels('feed', [
{
  id: 'pm-regex',
  icon: '🐌',
  title: 'Postmortem — Ek regex, poori duniya',
  badge: 'Rollout Rakshak',
  objectives: [
    'Catastrophic backtracking — ek regex CPU 100% kaise karta hai',
    'Kyun WAF rule "code deploy" nahi maana gaya, aur wahi galti thi',
    'Staged rollout ka asli ganit: blast radius vs deploy speed',
    'Kill switch ka matlab — aur uska khud par nirbhar na hona',
  ],
  lesson: [
    `<h3>📰 Feed se: Cloudflare ka apna postmortem, 2 July 2019</h3>
     <p>2 July 2019 ko Cloudflare ka poora HTTP traffic 27 minute ke liye ruk gaya.
     Wajah ek WAF rule tha — theek se kahein toh us rule ke andar ka ek
     <b>regular expression</b>.</p>
     <pre>.*(?:.*=.*)</pre>
     <p>Yeh chhota sa hissa poore outage ki jad hai. Do <code>.*</code> ek hi
     text ke liye aapas mein lad rahe hain. Regex engine backtracking karta hai:
     pehla <code>.*</code> jitna le sakta hai leta hai, phir peeche hatta hai,
     phir doosra <code>.*</code> koshish karta hai, phir peeche hatta hai —
     aur combinations <b>exponentially</b> badhte jaate hain.</p>
     <table>
       <tr><th>Input</th><th>Regex engine ke kadam</th></tr>
       <tr><td><code>x=x</code></td><td>23</td></tr>
       <tr><td><code>x=xxxxxxxxxxxxxxxxxxxx</code> (20 x)</td><td><b>555</b></td></tr>
       <tr><td>thoda aur lamba</td><td>lakhon — CPU khatam</td></tr>
     </table>
     <p class="tip">🎯 Ise <b>catastrophic backtracking</b> kehte hain, aur yeh
     ek asli attack class bhi hai — ReDoS. Bachne ka pakka tareeka: aisa regex
     engine use karo jo <b>linear time</b> guarantee kare (RE2, Rust ka regex
     crate). Cloudflare ne outage ke baad wahi kiya.</p>`,
    `<h3>🚀 Asli galti regex nahi thi — deploy tha</h3>
     <p>Cloudflare ke paas normal code ke liye ek poora staged rollout tha:
     <b>DOG</b> (sirf Cloudflare ka apna traffic) → <b>PIG</b> (test customers)
     → <b>Canary</b> (chhota hissa) → global.</p>
     <p>Par WAF rules us raaste se nahi jaate the. WAF rules Quicksilver se
     <b>seconds mein poori duniya</b> par jaate the — kyunki naye attack ka
     jawab turant dena hota hai. Wahi tez raasta us din outage ka raasta ban gaya.</p>
     <pre>13:42  rule global deploy hua (seconds mein har machine par)
13:45  pehla PagerDuty alert
14:00  WAF ko culprit pehchana gaya
14:02  "poori duniya par WAF band karo" ka prastav
14:07  WAF global band  →  CPU normal
14:09  traffic normal
14:52  WAF wapas chalu (test ke baad)</pre>
     <p>Detection sirf <b>3 minute</b> mein ho gayi. Fix apply karne mein
     <b>25 minute</b> lage. Yeh farak hamesha yaad rakho — zyadatar outage
     "pata nahi chala" se nahi, "pata chal gaya par band karne ka button
     dhoondhne mein waqt laga" se lambe hote hain.</p>
     <h3>🔌 Kill switch, aur uska apna jaal</h3>
     <p>Cloudflare ke postmortem mein ek aur baat hai jo aksar chhoot jaati hai:
     us din team ko apne hi internal tools tak pahunchne mein dikkat hui, kyunki
     woh tools bhi Cloudflare ke peeche the. Jab tumhara emergency button usi
     system par chalta hai jo gira hua hai, tumhare paas emergency button hai hi nahi.</p>
     <p class="tip">🎯 Do niyam yahan se: (1) har tez raaste (WAF, feature flag,
     config push) ke paas apna <b>global kill switch</b> ho. (2) Us kill switch ka
     raasta girne wale system se <b>alag</b> ho.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 2 July 2019',
      instructions: 'Timeline chalao aur teen mod par faisla lo.',
      incident: 'Cloudflare — 2 Jul 2019',
      goal: 'Dekho ki detection sirf 3 minute mein hui, par recovery 25 minute mein — aur samjho ki farak kahan gaya.',
      speedMs: 1800,
      metrics: [
        { id: 'cpu', label: 'Proxy CPU', unit: '%', max: 100, dir: 'lower' },
        { id: 'served', label: 'HTTP traffic serve hua', unit: '%', max: 100, dir: 'higher' },
      ],
      frames: [
        { t: '13:40', event: 'Sab normal. WAF rules Quicksilver ke zariye <b>seconds</b> mein poore network par jaate hain — naye attacks ka jawab dene ke liye.', metrics: { cpu: 32, served: 100 } },
        { t: '13:42', event: 'Ek naya WAF rule deploy hua. Rule ke andar ka regex hai <code>.*(?:.*=.*)</code> — do nested <code>.*</code>.', metrics: { cpu: 58, served: 92 }, tone: 'warn' },
        { t: '13:43', event: '<b>Catastrophic backtracking.</b> HTTP/HTTPS serve karne wale saare CPU lagbhag <b>100%</b> par. Proxy, CDN aur WAF — teenon thap.', metrics: { cpu: 99, served: 4 }, tone: 'bad',
          ask: { q: 'Duniya bhar mein CPU achanak badha hai. Pehli jaanch kaise karoge?',
                 choices: [
                   'Global deploy aur traffic badlav ka waqt CPU spike se milao',
                   'CPU ek saath badha, toh naya deploy hi wajah maan lo',
                   'Regions ek saath gire, toh traffic ki jaanch chhod do',
                   'CPU badha, toh network failure ko jaanch se hata do',
                 ], answer: 0,
                 explain: 'Ek saath CPU badhna global config, deploy ya traffic ki jaanch ka clue hai. Attack ya shared client behavior bhi kai regions par ek saath asar kar sakta hai; waqt milna akele cause ka saboot nahi hai.',
                 wrongHints: [
                   'DDoS itna ekdum aur itna saman har jagah nahi hota — aur DDoS mein traffic badhta hai, CPU-per-request nahi.',
                   'Upstream failure mein traffic gir jaata, CPU bhi gir jaata. Yahan CPU chad gaya — matlab kaam zyada ho raha hai.',
                   'Memory leak dheere aata hai aur machine-dar-machine aata hai. Yeh ek second mein har jagah hua.',
                 ] , choiceExplanations: [
                   'Ek saath CPU badhna global config, deploy ya traffic ki jaanch ka clue hai. Attack ya shared client behavior bhi kai regions par ek saath asar kar sakta hai; waqt milna akele cause ka saboot nahi hai.',
                   'Deploy ek shak hai. Traffic ya doosri shared dependency bhi wajah ho sakti hai.',
                   'Attack aur global events kai regions ka traffic saath badal sakte hain.',
                   'Network failure ke baad retries aur reconnects bhi CPU badha sakte hain.',
                 ],
               } },
        { t: '13:45', event: 'Pehla PagerDuty alert. <b>Detection: 3 minute.</b>', metrics: { cpu: 99, served: 4 }, tone: 'bad' },
        { t: '14:00', event: 'WAF ko culprit pehchana gaya. Team ko apne hi internal tools tak pahunchne mein dikkat aa rahi hai — woh tools bhi Cloudflare ke peeche hain.', metrics: { cpu: 99, served: 5 }, tone: 'bad',
          ask: { q: 'Cloudflare 2019 mein WAF ka kharab raasta pehchaan liya. Ab asar kaise ghataoge?',
                 choices: [
                   'Kharab WAF raasta roko; security risk dekh kar tested switch chalao',
                   'Sab security checks band karo; WAF ke saath baaki checks bhi hatao',
                   'Pehle regex repair karo; tab tak chalti mitigation ko roke rakho',
                   'Traffic doosre region bhejo; config har region mein wahi rehne do',
                 ], answer: 0,
                 explain: 'Is incident mein kharab WAF execution band karne se traffic lauta. Mitigation chunte waqt security aur availability dono ka risk dekho. Emergency switch ka raasta kharab service se alag aur pehle se tested hona chahiye.',
                 wrongHints: [
                   'Sahi soch, par dheemi. Us waqt kaunsa rule kharab hai yeh nishchit nahi tha — poora WAF band karna ek hi kadam mein pakka tha.',
                   'Naya deploy karna usi tez raaste ka istemaal hai jo abhi outage kar chuka hai. Girte hue system par naya code mat bhejo.',
                   'CPU har datacenter par 100% tha — shift karne ke liye koi khaali datacenter tha hi nahi.',
                 ] , choiceExplanations: [
                   'Is incident mein kharab WAF execution band karne se traffic lauta. Mitigation chunte waqt security aur availability dono ka risk dekho. Emergency switch ka raasta kharab service se alag aur pehle se tested hona chahiye.',
                   'Kharab WAF raasta pehchana gaya hai; bina wajah doosre security checks hatana risk badhaata hai.',
                   'Repair mein waqt lag sakta hai. Maujood surakshit mitigation pehle asar ghata sakti hai.',
                   'Wahi kharab config doosre region mein bhi hai; reroute akela madad nahi karega.',
                 ],
               } },
        { t: '14:07', event: 'WAF poori duniya par band. <b>CPU turant normal.</b>', metrics: { cpu: 34, served: 88 }, tone: 'ok' },
        { t: '14:09', event: 'Traffic poori tarah normal. Kul outage: <b>27 minute</b>.', metrics: { cpu: 31, served: 100 }, tone: 'ok',
          ask: { q: 'Alert 3 minute mein aaya, WAF deploy ke 25 minute baad band hua. Kis badlav par pehle dhyaan doge?',
                 choices: [
                   'Emergency switch ka alag raasta banao aur recovery drill chalao',
                   'Alert 3 se 1 minute karo; recovery ke raaste ko abhi chhod do',
                   'On-call log badhao; internal tools ka wahi raasta rehne do',
                   'RE2 lagao; emergency access ki taiyaari ko kaafi samajh lo',
                 ], answer: 0,
                 explain: '13:42 deploy se 13:45 alert tak 3 minute lage. WAF 14:07 par band hua: alert ke baad 22 minute aur. Tested recovery aur alag access path der ghata sakte hain; kill switch ki bhi apni seema hoti hai.',
                 wrongHints: [
                   'Detection pehle hi 3 minute thi. 27 mein se sirf 3 wahan the — bachat 2 minute ki hogi, 22 ki nahi.',
                   'RE2 bilkul sahi fix hai aur Cloudflare ne kiya — par RE2 sirf regex-shakl ke bug rokta hai. Kill switch har shakl par chalta hai.',
                   'Log kam nahi the. Faisla aur pahunch (access) ki der thi, haath ki nahi.',
                 ] , choiceExplanations: [
                   '13:42 deploy se 13:45 alert tak 3 minute lage. WAF 14:07 par band hua: alert ke baad 22 minute aur. Tested recovery aur alag access path der ghata sakte hain; kill switch ki bhi apni seema hoti hai.',
                   'Tez alert madad karega, par diye gaye times mein zyada der alert ke baad lagi.',
                   'Zyada log bhi kharab access path par atak sakte hain; drills aur access sudhaaro.',
                   'RE2 backtracking ka risk ghataata hai; RE2 se emergency access ka raasta nahi banta.',
                 ],
               } },
        { t: '14:52', event: 'WAF poori tarah wapas chalu — testing ke baad.', metrics: { cpu: 33, served: 100 }, tone: 'ok' },
      ],
      lesson: `💡 Do numbers hamesha alag-alag naapo: <b>time to detect</b> aur
        <b>time to mitigate</b>. Cloudflare ka detect 3 minute tha aur mitigate
        25 minute — matlab paisa monitoring mein nahi, <b>kill switch</b> mein
        lagana tha. Aur kill switch ka raasta girne wale system se alag rakho,
        warna emergency mein button tak pahunch hi nahi paoge.`,
    },
    {
      type: 'tradeoff',
      title: 'Staged rollout ka ganit',
      instructions: 'Teen knob ghumao. Blast radius, deploy speed aur detection — teenon ek doosre se jude hain.',
      goal: 'Aisi settings dhoondho jahan blast radius 5% ya kam ho, kharab rule bake ke DAURAAN pakda jaaye, aur bake 15 minute se zyada na ho (warna threat response bekaar ho jaayega).',
      scenario: `Cloudflare ko WAF rules <b>tez</b> chahiye — naya attack aaye toh
        minutes matter karte hain. Par 2 July 2019 ko wahi teji poori duniya par
        ek kharab regex le gayi. Ab tum rollout policy tay karo.`,
      knobs: [
        { id: 'canary', label: 'Pehle stage par kitna traffic', min: 1, max: 100, step: 1, value: 100, unit: '%',
          note: 'Chhota canary = kam nuksaan, par kharab rule pakadne ke liye kam signal.' },
        { id: 'bake', label: 'Bake time (global jaane se pehle intezaar)', min: 0, max: 30, step: 1, value: 0, unit: ' min',
          note: '2019 mein bake time 0 tha — rule seconds mein poore network par gaya.' },
        { id: 'alarm', label: 'Alert firing time (monitoring ki sensitivity)', min: 1, max: 15, step: 1, value: 10, unit: ' min',
          note: 'Tez alert mehenga hai: zyada false positive aur zyada noise.' },
      ],
      readouts: k => {
        const caught = k.bake >= k.alarm;
        const blast = caught ? k.canary : 100;
        const mins = caught ? k.alarm : k.alarm + 5;   /* global ho gaya toh 5 min manual rollback */
        return [
          { label: 'Blast radius', value: blast + '% traffic', tone: blast <= 5 ? 'ok' : blast <= 25 ? 'warn' : 'bad' },
          { label: 'Outage ki lambai', value: mins + ' min', tone: mins <= 10 ? 'ok' : mins <= 20 ? 'warn' : 'bad' },
          { label: 'Customer-minutes', value: Math.round(blast * mins) + '', tone: blast * mins <= 60 ? 'ok' : blast * mins <= 300 ? 'warn' : 'bad' },
          { label: 'Threat response deri', value: k.bake + ' min', tone: k.bake <= 15 ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const caught = k.bake >= k.alarm;
        const blast = caught ? k.canary : 100;
        const mins = caught ? k.alarm : k.alarm + 5;
        return [
          { label: 'Blast radius', pct: blast, text: blast + '%', tone: blast <= 5 ? 'ok' : blast <= 25 ? 'warn' : 'bad' },
          { label: 'Nuksaan (customer-minutes)', pct: Math.min(100, (blast * mins) / 15), text: Math.round(blast * mins) + '', tone: blast * mins <= 60 ? 'ok' : 'bad' },
          { label: 'Naya rule global hone mein', pct: Math.min(100, (k.bake / 30) * 100), text: k.bake + ' min', tone: k.bake <= 15 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const caught = k.bake >= k.alarm;
        if (!caught) return { ok: false, text: `Bake time <b>${k.bake} min</b> hai par alert <b>${k.alarm} min</b> mein aata hai — kharab rule bake khatam hone ke BAAD pakda jaayega, yaani global ho chuka hoga. Yahi 2 July 2019 ka aakaar hai.` };
        if (k.canary > 5) return { ok: false, text: `Rule bake ke dauraan pakda toh jaayega, par pehla stage <b>${k.canary}%</b> traffic hai — utne customers phir bhi girenge. Canary 5% ya kam karo.` };
        if (k.bake > 15) return { ok: false, text: `Blast radius theek hai, par bake <b>${k.bake} min</b> ka hai. WAF ka poora maqsad naye attack ka turant jawab dena hai — 15 minute se zyada intezaar security ko tod deta hai.` };
        return { ok: true, text: `Canary <b>${k.canary}%</b>, bake <b>${k.bake} min</b>, alert <b>${k.alarm} min</b> — kharab rule canary hi mein pakda jaayega, sirf ${k.canary}% traffic par asar hoga, aur accha rule ${k.bake} minute mein global ho jaayega.` };
      },
      check: k => k.bake >= k.alarm && k.canary <= 5 && k.bake <= 15,
      lesson: `🎯 Yahan asli seekh <b>ek shart</b> hai: <code>bake time ≥ alert time</code>.
        Agar tumhara bake time tumhare alert se chhota hai, tumhara staged rollout
        sirf dikhawa hai — kharab change bake khatam hone se pehle pakda hi nahi
        jaayega, aur phir woh global chala jaayega. Aur is shart ka doosra pehlu
        yeh hai: <b>tez alert ka faayda seedha safety mein badalta hai</b>, kyunki
        tez alert chhota bake time allow karta hai, aur chhota bake time hi
        security team ko woh teji deta hai jiske liye WAF banaya gaya tha.`,
      quiz: {
        q: 'Team kehti hai: 5% canary, phir global. Rollout ki safety jaanchne ke liye kya poochhoge?',
        choices: [
          'Canary kitni der chalta hai, kya load milta hai, alert kab aata hai?',
          '5% traffic mil gaya, toh canary ka waqt kaafi maan sakte hain?',
          'Ek region ka test hai, toh baaki workloads bhi cover maan lein?',
          'Rollback button hai, toh canary ka observation chhota rakh lein?',
        ],
        answer: 0,
        explain: 'Canary ko relevant load aur problem dikhne ka waqt chahiye. Fault saamne aane, metric banne aur alert lagne tak ruko. Bake time alert delay se chhota hua toh kharab change global pahunch sakta hai.',
        choiceExplanations: [
          'Canary ko relevant load aur problem dikhne ka waqt chahiye. Fault saamne aane, metric banne aur alert lagne tak ruko. Bake time alert delay se chhota hua toh kharab change global pahunch sakta hai.',
          'Percentage se asar ka daayra pata chalta hai, observation ka waqt nahi.',
          'Ek region ka load rare paths aur doosre regions ka behavior zaroori nahi dikhaye.',
          'Rollback se pehle problem pakadni aur safe trigger chahiye; button akela observation ki jagah nahi leta.',
        ],
      },
    },
    {
      type: 'quiz',
      title: 'Regex, rollout, kill switch',
      questions: [
        {
          q: 'Regex ke backtracking se CPU bharne ka risk ghataane ka mazboot default kya hai?',
          choices: [
            'Linear-time engine lo; pattern aur input ka size bhi seemit rakho',
            'Code review karao; runtime par regex ka kharcha alag se mat naapo',
            'Input ki ek cap rakho; har allowed regex ko cap se safe maano',
            'Regex timeout lagao; timeout ke andar CPU ka budget khula rakho',
          ],
          answer: 0,
          explain: 'RE2 aur Rust regex supported patterns ko catastrophic backtracking ke bina match karte hain. Pattern ka size, compilation aur input ke budgets phir bhi chahiye. Linear time ka matlab muft ya unlimited kaam nahi hai.',
          choiceExplanations: [
            'RE2 aur Rust regex supported patterns ko catastrophic backtracking ke bina match karte hain. Pattern ka size, compilation aur input ke budgets phir bhi chahiye. Linear time ka matlab muft ya unlimited kaam nahi hai.',
            'Review kaam ka hai, par reviewer mehenga worst case chhod sakta hai.',
            'Chuni hui cap ke andar bhi backtracking mehengi ho sakti hai.',
            'Timeout tak CPU lagta rehta hai. Timeout aur CPU/input budgets saath chahiye.',
          ],
        },
        {
          q: 'WAF rules normal staged rollout se alag kyun jaate the, aur safety mein kya kami thi?',
          choices: [
            'Attack response ke liye tez raasta tha; resource test aur stages kam the',
            'Rules data the; data hone se rules ki performance test ho nahi sakti thi',
            'Har employee seedha deploy karta tha; review ki koi prakriya nahi thi',
            'Normal code ka staged pipeline bana nahi tha; rules seedhe jaate the',
          ],
          answer: 0,
          explain: 'Naye attacks ka jawab jaldi chahiye tha, isliye WAF rules normal staged pipeline se alag jaate the. Review aur tests the, par runaway CPU test aur gradual rollout ki suraksha kam thi. Tez raaste ko bhi apne safety checks chahiye.',
          choiceExplanations: [
            'Naye attacks ka jawab jaldi chahiye tha, isliye WAF rules normal staged pipeline se alag jaate the. Review aur tests the, par runaway CPU test aur gradual rollout ki suraksha kam thi. Tez raaste ko bhi apne safety checks chahiye.',
            'Rules request processing badalte hain; behavior aur resource usage dono test ho sakte hain.',
            'Postmortem mein approved PR aur CI tests ka zikr hai; unrestricted access wali wajah sahi nahi hai.',
            'Normal code ke liye DOG, PIG aur canary stages pehle se the.',
          ],
        },
        {
          q: 'Internal tools bhi Cloudflare ke peeche the, isliye outage mein tools kholna mushkil tha. Kami aur ilaaj kya hai?',
          choices: [
            'Emergency tools bhi kharab service par tike the; alag access path chahiye',
            'Emergency tools ki copies badhao; sab copies wahi kharab proxy use karein',
            'Request par breaker lagao; admin tools ka network jaisa hai rehne do',
            'Retries mein gap badhao; admin login ka wahi dependency path rehne do',
          ],
          answer: 0,
          explain: 'Jis service ko repair karna hai, emergency tools bhi wahi service maangte hain: dependency ka chakkar ban gaya. Alag network, auth aur hosting ka tested raasta rakho; shared failure points bhi jaancho.',
          choiceExplanations: [
            'Jis service ko repair karna hai, emergency tools bhi wahi service maangte hain: dependency ka chakkar ban gaya. Alag network, auth aur hosting ka tested raasta rakho; shared failure points bhi jaancho.',
            'Sab copies ka access wahi kharab proxy maange toh copies bhi pahunch se bahar ho sakti hain.',
            'Breaker load rok sakta hai; admin tools ke liye alag pahunch khud banani padegi.',
            'Retry ka gap load ghata sakta hai; toot chuke access path ka ilaaj alag hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Catastrophic backtracking samjha sakte ho aur linear-time engine ka case bana sakte ho',
    'Time-to-detect aur time-to-mitigate alag-alag naapte ho',
    'Rollout policy ki asli shart bol sakte ho: bake time >= alert time',
    'Kill switch ke raaste ko girne wale system se alag rakhna jaante ho',
  ],
  homework: `Apne deploy pipeline se do numbers nikalo: (1) kharab change ke liye
    tumhara alert kitne minute mein bajta hai, (2) tumhara canary kitne minute
    tak rukta hai. Agar doosra number pehle se chhota hai, tumhara staged rollout
    kaagaz par hai. Teesra sawaal: aaj raat 3 baje tumhara sabse tez raasta
    (feature flag ya config push) band karna ho, toh kitne click lagenge aur
    kya woh click girne wale system se guzarta hai?`,
  cards: [
    { front: 'Catastrophic backtracking kya hai?', back: 'Nested quantifiers (<code>.*(?:.*=.*)</code>) mein regex engine ke kadam <b>exponentially</b> badhte hain — <code>x=x</code> par 23 kadam, 20 x par 555, thoda aur lamba par lakhon. Ilaaj: <b>linear-time engine</b> (RE2 / Rust regex).' },
    { front: 'Cloudflare 2019 — detect vs mitigate?', back: 'Detect <b>3 minute</b> (13:42 deploy → 13:45 alert). Mitigate <b>25 minute</b> (→ 14:07 WAF global off). Sabak: paisa monitoring mein nahi, <b>kill switch</b> mein lagao.' },
    { front: 'Staged rollout ki asli shart?', back: '<code>bake time ≥ alert firing time</code>. Bake alert se chhota hua toh kharab change canary ke <b>baad</b> pakda jaayega — yaani global ho chuka hoga. Percentage akela kaafi nahi.' },
    { front: 'Outage mein pehla kadam — mitigate ya root cause?', back: '<b>Mitigate.</b> Cloudflare ne poora WAF global band kiya, ek kharab rule dhoondha nahi. Bleeding pehle rukti hai; root cause 14:52 tak wait kar sakta hai.' },
    { front: 'Emergency ka raasta kahan hona chahiye?', back: 'Girne wale system se <b>alag</b> — alag network path, alag auth, alag hosting. Sawaal: "jab X gire, kya main X ke bina X theek kar sakta hoon?"' },
  ],
  interview: {
    title: 'Interview Round — Rollout safety',
    instructions: 'Deploy safety ka sawaal ab har staff+ round mein hai. 🎤',
    questions: [
      {
        q: '"Tumhein ek aisa system chahiye jo security rules SECONDS mein duniya bhar par bhej sake. Safety kaise banaoge?"',
        choices: [
          'Resource test, chhota canary aur tested alag kill switch saath rakho',
          'Attack tez badalta hai; review ke baad seedha global publish karo',
          'Do reviewers rakho; runtime par CPU aur time ki jaanch hata do',
          'Publish roz ek baar karo; urgent attack bhi agli window tak roko',
        ],
        answer: 0,
        explain: 'Tez response ke liye checks bhi usi speed ke hisaab se banao: resource tests, relevant load wala chhota canary aur independent kill switch. Observation ka waqt detection se milao; seconds mein safety prove na ho toh speed aur risk ka faisla saaf rakho.',
        choiceExplanations: [
          'Tez response ke liye checks bhi usi speed ke hisaab se banao: resource tests, relevant load wala chhota canary aur independent kill switch. Observation ka waqt detection se milao; seconds mein safety prove na ho toh speed aur risk ka faisla saaf rakho.',
          'Review akele runtime resource usage aur global asar nahi sambhalta.',
          'Do reviewers bhi pathological inputs chhod sakte hain; runtime budget test ka alag kaam hai.',
          'Roz ki window naye attack ka seconds mein jawab dene ki shart poori nahi karti.',
        ],
      },
      {
        q: '"Tum kaise decide karoge ki alerting mein invest karein ya rollback automation mein?"',
        choices: [
          'Detect aur mitigate ka waqt alag naapo; risk dekh kar paisa lagao',
          'Budget aadha-aadha baanto; barabar kharcha hi sahi priority maano',
          'Alerting ko pehle sudhaaro; recovery ki deri se priority mat badlo',
          'Rollback pehle automate karo; cause aur safe trigger baad mein dekho',
        ],
        answer: 0,
        explain: 'Pichhle incidents mein detection aur recovery ki der alag naapo. Jahan delay aur risk zyada hai, sudhaar se zyada faayda mil sakta hai. Cloudflare mein alert jaldi aaya, par mitigation tak pahunchne mein zyada waqt laga.',
        choiceExplanations: [
          'Pichhle incidents mein detection aur recovery ki der alag naapo. Jahan delay aur risk zyada hai, sudhaar se zyada faayda mil sakta hai. Cloudflare mein alert jaldi aaya, par mitigation tak pahunchne mein zyada waqt laga.',
          'Barabar budget observed delay aur risk ko nazarandaaz kar sakta hai.',
          'Detection pehle se tez ho toh recovery ki der badi priority ho sakti hai.',
          'Bina sahi detection aur safe trigger ke automatic rollback naya nuksaan kar sakta hai.',
        ],
      },
    ],
  },
},

{
  id: 'pm-split',
  icon: '🪓',
  title: 'Postmortem — 43 second, 24 ghante',
  badge: 'Split-Brain Sipahi',
  objectives: [
    '43 second ka network partition 24 ghante ka outage kaise bana',
    'Automatic failover ka chhupa hua kharcha — split brain',
    'Availability aur data consistency ke beech ka asli faisla',
    'Recovery ka waqt backup restore ke I/O se aata hai, code se nahi',
  ],
  lesson: [
    `<h3>📰 Feed se: GitHub ka apna postmortem, 21 October 2018</h3>
     <p>21 October 2018 ko raat 22:52 UTC par GitHub ke US East Coast network hub
     aur unke primary datacenter ke beech ka link <b>43 second</b> ke liye toota.
     Routine optical equipment maintenance ke dauraan toota. Link 43 second baad
     wapas aa gaya.</p>
     <p>GitHub agle <b>24 ghante 11 minute</b> tak degraded raha.</p>
     <h3>🔀 43 second mein kya hua</h3>
     <pre>22:52:00  East Coast hub ↔ primary DC ka link toota
22:52:xx  Orchestrator (Raft par bana) ne primary DC mein leadership khoyi
          West Coast + East Coast cloud nodes ne apna quorum banaya
          Orchestrator ne failover chala diya:
            → US WEST COAST ka cluster ab writes le raha hai
22:52:43  link WAPAS aa gaya

   ...aur ab dono taraf aise writes hain jo doosri taraf hain hi nahi.
   East Coast ke ek busy cluster mein lagbhag 954 writes aise the
   jo West Coast tak kabhi pahunche hi nahi.</pre>
     <p class="tip">🎯 Yeh <b>split brain</b> hai. Failover khud "galat" nahi
     tha — Orchestrator ne bilkul wahi kiya jo uske liye likha gaya tha. Dikkat
     yeh thi ki 43 second itne chhote the ki purana primary <b>mara hi nahi</b>,
     bas kat gaya tha — aur us dauraan usne writes le liye.</p>`,
    `<h3>⚖️ Ab asli faisla: kya serve karein?</h3>
     <p>GitHub ke paas do raaste the:</p>
     <table>
       <tr><th>Raasta</th><th>Milta kya hai</th><th>Keemat</th></tr>
       <tr><td>Jaldi failback karo</td><td>Sewa turant normal</td><td>East Coast ke woh 954 writes <b>gum</b> ho jaate — kisi ka issue, comment, ya push chala jaata</td></tr>
       <tr><td>Consistency pehle</td><td>Ek bhi user ka data nahi khota</td><td><b>24 ghante</b> degraded sewa</td></tr>
     </table>
     <p>GitHub ne doosra raasta chuna, aur apne postmortem mein saaf likha:
     <i>"We believe that the extended degradation of service was worth ensuring
     the consistency of our users' data."</i></p>
     <p>Us faisle ke saath do aur faisle aaye: webhooks rok diye gaye
     (<b>50 lakh se zyada</b> events queue mein bhar gaye) aur GitHub Pages ke
     builds rok diye gaye (<b>80,000</b> queue mein). Kyunki adhoore data par
     webhook bhejna matlab galat sachai ko duniya bhar mein push karna —
     aur woh wapas nahi liya ja sakta.</p>
     <h3>🐢 24 ghante gaye kahan?</h3>
     <p>Code likhne mein nahi. GitHub ne likha ki zyadatar waqt
     <b>"decompress, checksum, prepare, and load large backup files"</b> mein
     gaya. Backups remote cloud storage mein the, aur data <b>terabytes</b> mein tha.</p>
     <p class="tip">🎯 Yeh sabse zyada nazarandaaz kiya jaane wala number hai.
     Sab log RPO (kitna data kho sakta hai) poochhte hain. Bahut kam log RTO ka
     asli number naapte hain: <b>tumhara sabse bada database backup se wapas aane
     mein kitne ghante lega — network, decompress aur load milaakar?</b> Jis din
     zaroorat padegi, wahi number tumhara outage hoga.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 21-22 October 2018',
      instructions: 'Timeline chalao. Do faisle ke mod par tumhein call leni hai.',
      incident: 'GitHub — 21 Oct 2018',
      goal: 'Dekho ki 43 second ka partition 24 ghante kaise bana, aur wahan kaunsa faisla jaan-boojh kar liya gaya tha.',
      speedMs: 1900,
      metrics: [
        { id: 'consist', label: 'Data consistency ka bharosa', unit: '%', max: 100, dir: 'higher' },
        { id: 'service', label: 'Sewa poori tarah chal rahi', unit: '%', max: 100, dir: 'higher' },
        { id: 'queue', label: 'Ruke hue webhooks', unit: 'k', max: 5000, dir: 'lower' },
      ],
      frames: [
        { t: '22:52', event: 'Routine optical maintenance. East Coast hub ↔ primary DC ka link <b>43 second</b> ke liye toota.', metrics: { consist: 100, service: 100, queue: 0 }, tone: 'warn' },
        { t: '22:52', event: 'Orchestrator (Raft) ne primary DC mein leadership khoyi. West Coast ne quorum banaya aur <b>failover chala diya</b> — ab West Coast writes le raha hai.', metrics: { consist: 60, service: 80, queue: 40 }, tone: 'bad' },
        { t: '22:52:43', event: 'Link <b>wapas aa gaya</b>. Par ab dono taraf aise writes hain jo doosri taraf nahi hain — East Coast ke ek cluster mein lagbhag <b>954</b> orphan writes.', metrics: { consist: 35, service: 70, queue: 300 }, tone: 'bad',
          ask: { q: 'Link laut aaya, par dono taraf alag writes hain. Sabse pehle kya bachana hai?',
                 choices: [
                   'Conflicting writes roko; dono histories bachao aur writes ka milaan karo',
                   'Link laut aaya hai; purane primary ko seedha authority wapas de do',
                   'Dono taraf likhte raho; timestamps se sahi history chun lena kaafi hai',
                   'Chhoti history hata do; badi history ko poora data maan kar chalao',
                 ], answer: 0,
                 explain: 'Unsafe writers ko rok kar dono histories bachao. Phir business events ka milaan karo. Timestamp ya branch ka size sahi history nahi chunta; webhooks jaise bahar ke effects bhi ho chuke ho sakte hain.',
                 wrongHints: [
                   'Purana primary promote karne se West Coast ke naye writes gum ho jaayenge — tumne ek data loss ko doosre data loss se badal diya.',
                   'Dono ko chalne dena reconcile ka kaam har second bada karta hai. Split brain mein "baad mein dekh lenge" sabse mehenga jumla hai.',
                   'Last-write-wins values ke liye hai. Ek issue comment "purana" hone se galat nahi ho jaata — woh ek event hai, ek value nahi.',
                 ] , choiceExplanations: [
                   'Unsafe writers ko rok kar dono histories bachao. Phir business events ka milaan karo. Timestamp ya branch ka size sahi history nahi chunta; webhooks jaise bahar ke effects bhi ho chuke ho sakte hain.',
                   'Purane primary ke paas doosri taraf accepted writes nahi bhi ho sakte hain.',
                   'Timestamps se pata nahi chalta ki conflicting business actions ka sahi nateeja kya hai.',
                   'Chhoti history mein bhi valid user writes ho sakte hain; bina milaan delete karna data loss hai.',
                 ],
               } },
        { t: '23:13', event: 'Status <b>red</b>. GitHub ne faisla liya: <b>consistency pehle</b>. Webhooks aur Pages builds rok diye gaye.', metrics: { consist: 60, service: 40, queue: 900 }, tone: 'bad',
          ask: { q: 'Webhooks rokne ka faisla kyun liya gaya — jabki webhooks rokne se hazaaron integrations toot rahe hain?',
                 choices: [
                   'Galat state se bahar actions na jaayein; verified data tak delivery roko',
                   'Webhook bhej do; galat nikle toh receiver se poora action wapas le lo',
                   'Queue badh rahi hai; backlog ko payload galat hone ka saboot maano',
                   'Delivery roko; pending events mita kar queue bhi saath khaali kar do',
                 ], answer: 0,
                 explain: 'Galat webhook receiver par CI ya deploy chala sakta hai. Bhejne ke baad action poori tarah wapas lena mushkil ho sakta hai. Jis data ki sachai pakki nahi, data se nikle bahar ke actions roko aur pending kaam bachao.',
                 wrongHints: [
                   'Load ek chinta thi par mukhya wajah nahi. GitHub ne data ki sachai ki baat ki, capacity ki nahi.',
                   'Webhook service chal rahi thi — usko jaan-boojh kar roka gaya tha.',
                   'Baad mein bhejna hi hua (50 lakh events), par wajah speed nahi, <b>sahi data</b> thi.',
                 ] , choiceExplanations: [
                   'Galat webhook receiver par CI ya deploy chala sakta hai. Bhejne ke baad action poori tarah wapas lena mushkil ho sakta hai. Jis data ki sachai pakki nahi, data se nikle bahar ke actions roko aur pending kaam bachao.',
                   'Receiver action kar chuka ho sakta hai; webhook recall se action zaroori nahi ultega.',
                   'Backlog valid pending work bhi ho sakta hai. Payload ki sachai state se jaancho.',
                   'Delivery pause aur stored events delete karna alag kaam hain; pending events recovery ke liye bachao.',
                 ],
               } },
        { t: '00:05', event: 'Backup restore shuru. Backups remote cloud storage mein hain, data <b>terabytes</b> mein.', metrics: { consist: 65, service: 40, queue: 1800 }, tone: 'warn' },
        { t: '11:12', event: 'East Coast primaries restore ho gaye. Zyadatar waqt <b>decompress, checksum, prepare, load</b> mein gaya — code likhne mein nahi.', metrics: { consist: 90, service: 65, queue: 4200 }, tone: 'warn' },
        { t: '23:03', event: 'Poori recovery. Kul: <b>24 ghante 11 minute</b>. Ek bhi user ka data nahi khoya. <b>50 lakh</b> webhooks aur <b>80,000</b> Pages builds queue se nikaale gaye.', metrics: { consist: 100, service: 100, queue: 0 }, tone: 'ok' },
      ],
      lesson: `💡 Teen cheezein saath yaad rakho. <b>1.</b> 43 second ka partition
        24 ghante ka outage ban sakta hai — kyunki nuksaan partition ki lambai se
        nahi, us dauraan liye gaye <b>writes</b> se aata hai. <b>2.</b> "Consistency
        chuno ya availability" kaagaz ka sawaal nahi hai; GitHub ne 24 ghante
        degraded rehna chuna aur likh kar wajah batayi. <b>3.</b> Recovery ka waqt
        <b>backup restore ke I/O</b> se aata hai — apna asli restore time naapo,
        anumaan mat lagao.`,
    },
    {
      type: 'order',
      title: 'Split brain ke baad — sahi kram',
      instructions: 'Failover ho chuka hai aur dono taraf writes hain. Recovery ke kadam sahi kram mein lagao.',
      steps: [
        { text: '✋ Ek taraf writes ROKO — ek hi cluster ko authority do', explain: 'Sabse pehla kadam hamesha "aur nuksaan band karo" hai. Jab tak dono taraf writes ho rahe hain, reconcile karne ka kaam har second bada ho raha hai.' },
        { text: '📤 Bahar jaane wale side effects roko — webhooks, emails, notifications', explain: 'Bheja hua webhook wapas nahi liya ja sakta. Jab data par shak ho, irreversible effects sabse pehle rokte hain. GitHub ne 50 lakh events queue mein rakhe.' },
        { text: '🔍 Pata karo kaunse writes kis taraf hain — diff nikaalo', explain: 'Reconciliation se pehle sachai ka naksha chahiye. GitHub ke ek busy cluster mein lagbhag 954 aise writes the jo West Coast tak kabhi pahunche hi nahi.' },
        { text: '💾 Backups se authoritative state restore karo', explain: 'Yahi sabse lamba kadam hai — decompress, checksum, prepare, load. GitHub ke 24 ghante mein se zyadatar waqt yahin gaya.' },
        { text: '🔁 Orphan writes ko authoritative state par replay karo', explain: 'Ab 954 orphan writes ka milaan karke writes ko wapas laaya jaata hai. Yahi wajah hai ki webhooks pehle roke gaye the — replay ke baad hi sachai poori hoti hai.' },
        { text: '📬 Ruki hui queues drain karo — webhooks aur builds', explain: 'Sabse aakhir mein. 50 lakh webhooks aur 80,000 Pages builds tabhi bheje gaye jab data poora sahi ho gaya.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Failover, split brain aur RTO',
      questions: [
        {
          q: '43 second ka partition itna mehenga kyun tha, jabki 43 second bahut chhota waqt hai?',
          choices: [
            'Link jaldi lauta, par dono taraf ke writes ka milaan lamba chala',
            'Link toota, toh replication ke bytes corrupt ho gaye honge',
            '43 second ka gap tha, toh Raft quorum tootna hi wajah thi',
            '43 second ka gap tha, toh utne waqt ka user data khona tay tha',
          ],
          answer: 0,
          explain: 'Chhota partition bhi alag accepted writes chhod sakta hai. Link theek hone se histories apne aap nahi judti. Purane primary ka zinda rehkar likhna risk badhaata hai; crash ke baad bhi replication lag alag jaanchna padta hai.',
          choiceExplanations: [
            'Chhota partition bhi alag accepted writes chhod sakta hai. Link theek hone se histories apne aap nahi judti. Purane primary ka zinda rehkar likhna risk badhaata hai; crash ke baad bhi replication lag alag jaanchna padta hai.',
            'Network separation bytes corrupt hone ka saboot nahi hai.',
            'Quorum majority tak pahunch aur membership par depend karta hai; 43 second koi universal limit nahi.',
            'Data loss write acceptance, replication aur recovery par depend karta hai; duration akela nateeja nahi bataata.',
          ],
        },
        {
          q: 'Single-writer database mein failover ki zaroori safety shart kya hai?',
          choices: [
            'Naya writer bane toh purana writer conflicting writes kar na sake',
            'Timeout lamba rakho; purane writer ko alag se rokna zaroori nahi',
            'Manual promotion karo; insaan ka faisla writer ko rokne ke barabar hai',
            'Async copy rakho; purane writer ka chalna replication sambhaal lega',
          ],
          answer: 0,
          explain: 'Purane writer ko conflicting writes se rokna fencing hai. Storage ya proven protocol ko purani authority ke writes reject karne chahiye. Sirf timeout ya manual faisla purane writer ke rukne ka saboot nahi hai.',
          choiceExplanations: [
            'Purane writer ko conflicting writes se rokna fencing hai. Storage ya proven protocol ko purani authority ke writes reject karne chahiye. Sirf timeout ya manual faisla purane writer ke rukne ka saboot nahi hai.',
            'Lamba timeout detection badalta hai; purana writer zinda rehkar likh sakta hai.',
            'Insaan bhi purane writer ko roke bina promotion kar sakta hai.',
            'Async copy writer ki authority nahi rokti; do writers se copies alag ho sakti hain.',
          ],
        },
        {
          q: 'GitHub ne 24 ghante degraded rehna chuna. Interview mein is faisle ko kaise bologe?',
          choices: [
            'Accepted user data bachane ko recovery ke dauraan sewa ghataayi',
            'CAP ne GitHub ko CP chunne ka seedha hukm diya tha',
            'Jaldi sewa laana hi product ka niyam tha; data baad mein dekhna tha',
            'Lambi recovery ne sabit kiya ki koi doosra design mumkin nahi tha',
          ],
          answer: 0,
          explain: 'GitHub ne accepted user data ko priority di aur kuch features degraded rakhe. Faisla business ki data-integrity zaroorat se juda tha. CAP constraints bataata hai; product ke liye kaunsa behavior sahi hai, theorem tay nahi karta.',
          choiceExplanations: [
            'GitHub ne accepted user data ko priority di aur kuch features degraded rakhe. Faisla business ki data-integrity zaroorat se juda tha. CAP constraints bataata hai; product ke liye kaunsa behavior sahi hai, theorem tay nahi karta.',
            'CAP sab systems ko CP chunne ka hukm nahi deta; partition mein guarantees ki seema bataata hai.',
            'GitHub ne data integrity ko site usability aur recovery time se upar rakha.',
            'Postmortem chosen recovery samjhaata hai; har alternative design ko namumkin nahi bataata.',
          ],
        },
        {
          q: 'Apna recovery-time target (RTO) meet hota hai ya nahi, kaise jaanchoge?',
          choices: [
            'Full restore, replication aur app checks ki drill ka waqt naapo',
            'Backup size ko network speed se baanto; wahi recovery time likho',
            'Vendor ki restore speed lo; production RTO poora maan lo',
            'Purane chhote restore ka waqt lo; bade DB par wahi hisaab rakho',
          ],
          answer: 0,
          explain: 'RTO recovery ka target hai. Target meet hota hai ya nahi, full recovery drill se jaancho: transfer, decompress, prepare, load, catch-up aur app verification. Sirf download time ya vendor number poora restore nahi naapta.',
          choiceExplanations: [
            'RTO recovery ka target hai. Target meet hota hai ya nahi, full recovery drill se jaancho: transfer, decompress, prepare, load, catch-up aur app verification. Sirf download time ya vendor number poora restore nahi naapta.',
            'Decompress, load, replay aur verification mein bhi waqt lagta hai.',
            'Apne data, hardware, keys aur procedure ka waqt vendor se alag ho sakta hai.',
            'Data growth aur dependency badlav ke baad purani chhoti drill ka waqt kaafi saboot nahi.',
          ],
        },
      ],
    },
  ],
  success: [
    'Split brain ko "cut off but alive" ke roop mein samjha sakte ho',
    'Fencing ko failover ki asli shart bata sakte ho',
    'Irreversible side effects (webhooks/emails) ko pehle rokna jaante ho',
    'RTO ko restore drill se naapte ho, anumaan se nahi',
  ],
  homework: `Do sawaal apni team se poochho. (1) Agar hamara primary 43 second ke
    liye network se kat jaaye par zinda rahe, kya woh us dauraan writes le sakta
    hai? Agar haan, tumhare paas GitHub wali sthiti maujood hai. (2) Hamare sabse
    bade database ko backup se poora wapas laane mein kitne ghante lagenge —
    aur kya kisi ne woh drill kabhi chalaya hai?`,
  cards: [
    { front: 'GitHub Oct 2018 — trigger?', back: '<b>43 second</b> ka network partition (routine optical maintenance). Orchestrator ne West Coast par failover kar diya; link wapas aane par dono taraf aise writes the jo doosri taraf nahi the — ek cluster mein lagbhag <b>954</b> orphan writes.' },
    { front: 'Split brain ka dil kya hai?', back: 'Purana primary <b>mara nahi</b> tha — sirf <b>kat</b> gaya tha, aur zinda tha, isliye writes leta raha. Sabse khatarnaak failure "down" nahi, <b>"cut off but alive"</b> hoti hai.' },
    { front: 'Split brain ka asli ilaaj?', back: '<b>Fencing</b> (STONITH / lease). Naya primary tabhi bane jab purana primary writes lena band kar chuka ho. Sirf timeout badhana har chhote partition par outage lamba karta hai.' },
    { front: 'Data par shak ho toh sabse pehle kya rokte ho?', back: '<b>Bahar jaane wale (irreversible) side effects</b> — webhooks, emails, payments, notifications. Galat page refresh se theek ho jaata hai; bheja hua webhook wapas nahi aata. GitHub ne 50 lakh events roke.' },
    { front: 'GitHub ke 24 ghante kahan gaye?', back: 'Code mein nahi — <b>backup restore ke I/O</b> mein: decompress, checksum, prepare, load (terabytes, remote cloud storage se). Apna RTO <b>restore drill</b> se naapo.' },
  ],
  interview: {
    title: 'Interview Round — Failover design',
    instructions: 'Yeh sawaal seedha "senior ya nahi" tay karta hai. 🎤',
    questions: [
      {
        q: 'Network partition par database promote karne se pehle kaunsi shart jaanchoge?',
        choices: [
          'Replication ka haal jaancho; purane writer ke writes rok kar promote karo',
          'Network timeout ko primary ke marne ka saboot maano aur promote karo',
          'Manual approval le lo; purane writer ka writes lena chalne do',
          'Naya primary chalao; conflicting effects ka milaan recovery mein kar lo',
        ],
        answer: 0,
        explain: 'Promotion mein data durability, replication position aur writer ki authority saath jaancho. Purana writer conflicting writes na kar sake. Sirf lease expiry dekhna kaafi nahi jab stale holder ke writes resource par reject nahi hote.',
        choiceExplanations: [
          'Promotion mein data durability, replication position aur writer ki authority saath jaancho. Purana writer conflicting writes na kar sake. Sirf lease expiry dekhna kaafi nahi jab stale holder ke writes resource par reject nahi hote.',
          'Primary unreachable ho sakta hai, phir bhi kisi aur network segment ko serve kar sakta hai.',
          'Manual approval ke saath bhi purani authority rokne ka mechanism chahiye.',
          'Payment ya webhook ke bahar ho chuke actions ko safe merge karna mumkin na bhi ho.',
        ],
      },
      {
        q: '"Recovery ke dauraan kya tum stale data serve karoge?"',
        choices: [
          'Read ka freshness risk jaancho; doubtful state se bahar actions roko',
          'Purane data par label laga do; har tarah ka stale read chala do',
          'Ek hissa kharab hai, toh unaffected read-only resources bhi rok do',
          'Integrations chalte rakho; unverified branch se webhooks bhejte raho',
        ],
        answer: 0,
        explain: 'Kuch reads purane data ke saath safely chal sakte hain; money, permission ya inventory ke liye aisa read khatarnak ho sakta hai. Bahar ke actions verified state se nikalo. Freshness aur effect ka risk product se tay hota hai.',
        choiceExplanations: [
          'Kuch reads purane data ke saath safely chal sakte hain; money, permission ya inventory ke liye aisa read khatarnak ho sakta hai. Bahar ke actions verified state se nikalo. Freshness aur effect ka risk product se tay hota hai.',
          'Label se data fresh nahi hota; purani permission ya balance ka asar phir bhi galat ho sakta hai.',
          'Unaffected resources ka safe read product ki sharton ke andar chal sakta hai.',
          'Unverified branch ka webhook galat downstream action chala sakta hai.',
        ],
      },
    ],
  },
},
]);
})();

/* =====================================================================
   F4 — AWS Kinesis, 25 November 2020: capacity badhane se outage
   F5 — Roblox, 28-31 October 2021: 73 ghante ka death spiral
   ===================================================================== */
(function () {
SD.registerLevels('feed', [
{
  id: 'pm-thread',
  icon: '🧵',
  title: 'Postmortem — Capacity badhane se outage',
  badge: 'Fleet Ganitagya',
  objectives: [
    'O(N²) fleet topology — har server har doosre server ko jaanta hai',
    'Woh limit jo kisi dashboard par nahi thi: OS ka thread count',
    'Recovery dheere kyun karni padi — aur teji nuksaan kyun karti',
    'Cell-based architecture: blast radius ko design se chhota karna',
  ],
  lesson: [
    `<h3>📰 Feed se: AWS ka apna postmortem, 25 November 2020</h3>
     <p>Thanksgiving se ek din pehle AWS us-east-1 mein Kinesis gir gaya, aur
     uske saath Cognito, CloudWatch, Lambda, EventBridge, ECS aur EKS bhi
     prabhavit hue. Poori recovery mein <b>20 ghante</b> lage.</p>
     <p>Trigger kya tha? <b>Kinesis ke front-end fleet mein capacity badhayi gayi thi.</b>
     Zyada capacity. Wahi outage ban gayi.</p>
     <h3>🧵 Ganit jo kisi ne nahi dekha</h3>
     <p>Kinesis ka front-end fleet authentication, throttling aur request routing
     karta hai. Har front-end server ek <b>shard-map cache</b> rakhta hai — poore
     back-end ka naksha. Us naksha ko banane ke liye har front-end server
     <b>fleet ke har doosre server</b> ke liye ek OS thread banata hai.</p>
     <pre>Fleet mein N servers  →  har server par lagbhag N threads
Fleet ka kul thread count  →  N × N  =  O(N²)

N badhao 10%  →  har server par threads 10% badhe
                 aur woh badhotri POORE fleet par ek saath hui</pre>
     <p class="tip">🎯 Yahi sabse dhokebaaz hissa hai: capacity add karna har
     server par threads badha deta hai — sirf naye servers par nahi, <b>saare</b>
     servers par. Isliye poora fleet <b>ek saath</b> OS ki maximum thread limit
     paar kar gaya. Ek bhi server ke paas kaam karne laayak shard-map nahi bacha.</p>
     <p>AWS ne apne postmortem mein saaf likha ki wajah memory nahi thi —
     <b>"the new capacity had caused all of the servers in the fleet to exceed
     the maximum number of threads allowed by an operating system configuration."</b></p>`,
    `<h3>🐢 Recovery dheere kyun karni padi?</h3>
     <p>Seedha jawab lagta hai: "sab servers wapas chalu kar do". AWS ne jaan-boojh
     kar aisa nahi kiya. Front-end server chalu hote hi do kaam ek saath maangta hai:
     apna shard-map cache <b>banana</b>, aur incoming requests <b>serve karna</b>.
     Bahut saare servers ek saath chalu karo toh dono kaam aapas mein lad-te hain
     aur kisi ke liye bhi resources nahi bachte.</p>
     <p>Isliye AWS ne servers <b>kuch sau prati ghanta</b> ki raftaar se wapas
     laaye. 20 ghante ka bada hissa wahin gaya.</p>
     <h3>🧊 Fix: cell-based architecture</h3>
     <p>AWS ke remediation mein sabse zaroori cheez thread limit badhana nahi thi
     (woh bhi kiya gaya). Sabse zaroori cheez thi <b>cellularization</b> —
     fleet ko chhote-chhote swatantra cells mein todna.</p>
     <table>
       <tr><th></th><th>Ek bada fleet</th><th>Kai chhote cells</th></tr>
       <tr><td>Thread ganit</td><td>N × N — N badhne par har server par asar</td><td>har cell mein sirf uske apne servers</td></tr>
       <tr><td>Blast radius</td><td><b>100%</b></td><td><b>1 / cell count</b></td></tr>
       <tr><td>Capacity add karna</td><td>poore fleet ka ganit badalta hai</td><td>naya <b>cell</b> jodo — purane cells chhoote hi nahi</td></tr>
     </table>
     <p class="tip">🎯 Cell-based architecture ka asli faayda scale nahi hai —
     <b>blast radius</b> hai. Aur uske saath ek aur faayda muft milta hai:
     capacity badhane ka matlab "naya cell banao" ho jaata hai, aur naya cell
     banane se purane cells ka ganit badalta hi nahi.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 25 November 2020',
      instructions: 'Timeline chalao aur do faisle lo.',
      incident: 'AWS Kinesis — 25 Nov 2020',
      goal: 'Samjho ki capacity badhana kaise outage bana, aur recovery dheere kyun karni padi.',
      speedMs: 2000,
      metrics: [
        { id: 'threads', label: 'Threads per server (OS limit ka %)', unit: '%', max: 130, dir: 'lower' },
        { id: 'ok', label: 'Front-end servers jo route kar paa rahe', unit: '%', max: 100, dir: 'higher' },
      ],
      frames: [
        { t: '02:44', event: 'Kinesis front-end fleet mein <b>capacity add</b> shuru — routine kaam.', metrics: { threads: 88, ok: 100 } },
        { t: '03:20', event: 'Naye servers fleet mein aa rahe hain. Har front-end server har <b>doosre</b> server ke liye ek thread banata hai — isliye threads <b>har</b> server par badh rahe hain, sirf naye par nahi.', metrics: { threads: 97, ok: 100 }, tone: 'warn' },
        { t: '05:15', event: 'Capacity add 03:47 tak poora hua; 05:15 par pehle error alarms. Poora fleet <b>OS ki max thread limit</b> paar kar gaya. Shard-map cache ban hi nahi paaya. Servers ke paas routing ka naksha nahi bacha.', metrics: { threads: 122, ok: 6 }, tone: 'bad',
          ask: { q: 'Capacity BADHANE se outage hua. Aisa kaunsa design ganit hai jahan "zyada servers" cheezein kharab kar sakta hai?',
                 choices: [
                   'Har server ke peers badhe; per-server aur poore fleet ke threads badhe',
                   'Naye servers aate hi purane servers ke threads ka count ghat gaya',
                   'Nayi membership ka kaam bas naye servers ko karna padta tha',
                   'Kul threads O(N²) hue, par har server par thread count wahi raha',
                 ], answer: 0,
                 explain: 'Kinesis mein har front-end apne peers ke liye threads rakhta tha. Fleet badhne se purane servers ke peers bhi badhe. Har server par lagbhag O(N), poore fleet mein O(N²) threads; sirf membership table se CPU ka yahi ganit tay nahi hota.',
                 wrongHints: [
                   'Naye servers bilkul theek the. Problem naye servers mein nahi thi — problem poore fleet ke ganit mein thi.',
                   'Load distribution theek thi. Servers request lene se pehle hi shard-map na bana paane ki wajah se bekaar the.',
                   'Warm-up ek chinta thi (recovery mein), par 05:15 ki failure thread limit thi, warm-up nahi.',
                 ] , choiceExplanations: [
                   'Kinesis mein har front-end apne peers ke liye threads rakhta tha. Fleet badhne se purane servers ke peers bhi badhe. Har server par lagbhag O(N), poore fleet mein O(N²) threads; sirf membership table se CPU ka yahi ganit tay nahi hota.',
                   'Naya peer aane par purane front-end ko bhi communication threads banane the.',
                   'Purane members ko bhi naye peers ki jaankaari aur threads chahiye the.',
                   'Peers badhte hain, isliye per-server threads bhi lagbhag N ke saath badhte hain.',
                 ],
               } },
        { t: '09:39', event: 'Root cause pehchana gaya: memory nahi, <b>OS ka thread limit</b>. Ab servers ko wapas laana hai.', metrics: { threads: 118, ok: 8 }, tone: 'bad',
          ask: { q: 'Fleet wapas laana hai. Sabhi servers ek saath chalu kar dein?',
                 choices: [
                   'Chhote batches laao; cache aur health jaancho, incoming kaam seemit rakho',
                   'Poora fleet saath laao; cold start ko requests ke saath race karne do',
                   'Thread limit badhao; cache banana aur serving ka load khula rehne do',
                   'Fleet chhota karo; ab bache servers ko poora traffic ek saath de do',
                 ], answer: 0,
                 explain: 'Bootstrap aur request serving shared resources lete hain. Dono par ek saath zyada kaam recovery ko phir gira sakta hai. AWS ne kuch sau servers prati ghanta laaye; raftaar health aur headroom dekh kar chuno.',
                 wrongHints: [
                   'Cold cache wale servers ek saath chalu karna thundering herd banata hai — recovery ulta lamba ho jaata hai.',
                   'Thread limit badhana zaroori tha, par usse cache-banane vs serve-karne ka contention khatam nahi hota.',
                   'Fleet chhota karna capacity kam kar deta hai — aur load toh utna hi hai jitna tha.',
                 ] , choiceExplanations: [
                   'Bootstrap aur request serving shared resources lete hain. Dono par ek saath zyada kaam recovery ko phir gira sakta hai. AWS ne kuch sau servers prati ghanta laaye; raftaar health aur headroom dekh kar chuno.',
                   'Saath cold start aur full traffic se resources par contention badh sakta hai.',
                   'Thread headroom madad karta hai; cache build aur serving ke resources phir bhi limited hain.',
                   'Chhota fleet bhi bootstrap aur traffic se bhar sakta hai; recovery aur arrivals ko bound karo.',
                 ],
               } },
        { t: '22:23', event: 'Kinesis poori tarah recover. Kul <b>20 ghante</b> — bada hissa dheeri, controlled recovery mein.', metrics: { threads: 84, ok: 100 }, tone: 'ok' },
        { t: '22:31', event: 'Downstream services bhi normal: Cognito 14:18, Lambda 10:36, EventBridge/ECS/EKS 16:15, CloudWatch 22:31.', metrics: { threads: 84, ok: 100 }, tone: 'ok' },
      ],
      lesson: `💡 Do baatein. <b>1.</b> "Har node har node ko jaanta hai" wala koi
        bhi design O(N²) hai — usme capacity add karna ek <b>global</b> change hai,
        aur wahi Kinesis ko le dooba. <b>2.</b> Recovery ki raftaar bhi ek design
        faisla hai: thak chuke system ko ek saath sab kuch dene se woh dobara
        girta hai. Dheeri, controlled recovery aksar sabse tez recovery hoti hai.`,
    },
    {
      type: 'estimate',
      title: 'Napkin math — thread ka ganit',
      instructions: 'Pehle apna andaaza likho, phir asli calculation khulegi. Sahi hone ka matlab hai sahi paimana.',
      goal: 'Teen numbers nikalo jo bataate hain ki O(N²) topology mein capacity badhana kyun khatarnaak hai.',
      problems: [
        {
          q: 'Front-end fleet mein <b>9,200</b> servers hain. Har server fleet ke har doosre server ke liye ek OS thread banata hai. Poore fleet mein kul kitne threads honge?',
          unit: 'threads',
          given: ['Fleet size: 9,200 servers', 'Har server: fleet ke har doosre server ke liye 1 thread'],
          answer: 84630800,
          steps: [
            'Ek server par threads = fleet ke baaki server = 9,200 − 1 = 9,199',
            'Poore fleet mein = 9,200 × 9,199 = 84,630,800 ≈ 8.5 crore threads',
            'Fleet 10% badhao (10,120 servers) → 10,120 × 10,119 = 10.2 crore threads',
            'Yaani servers 10% badhe, par threads lagbhag 21% badhe — O(N²) ka asar',
          ],
          lesson: '🎯 Yahi wajah hai ki O(N²) topology mein "thoda sa capacity add karna" jaisa kuch hota hi nahi. Servers 10% badhe toh kul threads ~21% badhte hain — aur <b>har</b> server par ~10%, sirf naye par nahi.',
        },
        {
          q: 'Har OS thread ko lagbhag <b>8 KB</b> ka stack chahiye. Ek server par 9,199 threads hain. Sirf thread stacks ke liye us ek server par kitni memory chahiye?',
          unit: 'MB',
          given: ['Threads per server: 9,199', 'Har thread ka stack: 8 KB'],
          answer: 74,
          steps: [
            '9,199 threads × 8 KB = 73,592 KB',
            '73,592 KB ÷ 1000 ≈ 74 MB (÷ 1024 karo toh ~72 MiB — dono lagbhag barabar)',
            'Memory ki drishti se 74 MB kuch bhi nahi hai — ek 64 GB machine par 0.1%',
            'Isiliye MEMORY monitoring ne kuch nahi bataya. Limit memory ki thi hi nahi — limit OS ke THREAD COUNT ki thi',
          ],
          lesson: '🎯 Yeh sabse zaroori sabak hai. Memory graph bilkul saaf tha, CPU graph bhi saaf tha — aur phir bhi fleet mar gaya. <b>Har limit ek dashboard par nahi hoti.</b> File descriptors, thread count, PIDs, inodes, ephemeral ports, connection table — in sab par alert hona chahiye, sirf CPU aur memory par nahi.',
        },
        {
          q: 'Recovery ke dauraan front-end servers sirf <b>400 prati ghanta</b> ki raftaar se wapas laaye ja sakte the. 9,200 servers wapas laane mein kitne ghante lagenge?',
          unit: 'ghante',
          given: ['Wapas laane hain: 9,200 servers', 'Safe raftaar: 400 servers/ghanta'],
          answer: 23,
          steps: [
            '9,200 ÷ 400 = 23 ghante',
            'AWS ka asli outage lagbhag 20 ghante chala — 9,200 aur 400 misaal ke numbers hain, par anumaan usi paimane ka hai',
            'Ab ulta sawaal poochho: recovery ko 2 ghante karna ho toh raftaar 4,600/ghanta chahiye',
            'Par woh raftaar cache-banane aur serve-karne ke beech contention paida karti hai — yaani recovery ULTA lamba ho jaata',
          ],
          lesson: '🎯 Yahan se ek number nikalta hai jo lagbhag koi team nahi jaanti: <b>tumhara fleet cold start se poora wapas aane mein kitna waqt lega</b>. Us number ko naapo. Agar woh number ghanton mein hai, toh tumhara asli RTO woh hai — chahe tumhara code kitni bhi jaldi deploy ho jaaye.',
        },
      ],
    },
    {
      type: 'quiz',
      title: 'Fleet topology aur blast radius',
      questions: [
        {
          q: 'Chhote cells banane se failure ka daayra kab ghat sakta hai?',
          choices: [
            'Independent capacity aur dependencies se ek cell ka asar rok sakte hain',
            'N cells bana do; har failure mein theek 1/N users hi prabhavit honge',
            'Cells ki storage aur control plane shared ho, toh bhi isolation poora hai',
            'Cells bana do; routing aur users ko baantne ka kaam khud ho jaayega',
          ],
          answer: 0,
          explain: 'Cell ka faayda tab hai jab failure ke raaste bhi alag hon. Shared control plane ya storage kai cells gira sakti hai. Users aur load barabar na ho toh asar theek 1/N nahi hoga; isolation test karo.',
          choiceExplanations: [
            'Cell ka faayda tab hai jab failure ke raaste bhi alag hon. Shared control plane ya storage kai cells gira sakti hai. Users aur load barabar na ho toh asar theek 1/N nahi hoga; isolation test karo.',
            'Cell mein users aur load ki hissedaari alag ho sakti hai; 1/N ek special case hai.',
            'Shared dependency ka failure cells ki boundary paar kar sakta hai.',
            'Placement, routing aur migration ko design aur operate karna padta hai.',
          ],
        },
        {
          q: 'Tumhare paas CPU, memory, disk aur network par alerts hain. AWS ka outage phir bhi nahi pakda jaata. Kaunse alerts missing hain?',
          choices: [
            'Threads, file descriptors, PIDs aur ports ke count aur limits dekho',
            'CPU kam ho, toh OS ke handles aur threads ko safe maan lo',
            'RAM badhao; PID aur thread limits ki jaanch ki zaroorat nahi',
            'CPU alert ko sab app pools ki saturation ka proxy maan lo',
          ],
          answer: 0,
          explain: 'Thread count, file descriptors, PIDs aur ports ki apni limits hoti hain. CPU ya free RAM se akeli limit ka haal nahi milta. Growth aur recovery ke liye headroom dekh kar alert lagao; 70% har system ka fixed niyam nahi hai.',
          choiceExplanations: [
            'Thread count, file descriptors, PIDs aur ports ki apni limits hoti hain. CPU ya free RAM se akeli limit ka haal nahi milta. Growth aur recovery ke liye headroom dekh kar alert lagao; 70% har system ka fixed niyam nahi hai.',
            'Handle ya thread limit kam CPU par bhi bhar sakti hai.',
            'Kernel aur configured limits free RAM se alag ho sakti hain.',
            'Queue aur connection pools CPU se pehle bhar sakte hain; counts alag naapo.',
          ],
        },
        {
          q: '"Zyada capacity add karne se system gir gaya" — is class ki aur kaunsi sthiti hai?',
          choices: [
            'Cold-cache clients ek saath laute; warmup ne recovering backend bhar diya',
            'Scale-out hua; server jodne se har service mein waisa hi outage hota hai',
            'Capacity badhi; coordination ka kharcha data loss ka pakka saboot hai',
            'Cache warm hai; ab origin load request rate se alag ho chuka hai',
          ],
          answer: 0,
          explain: 'Recovery mein clients cache bharne ko backend par ek saath aa sakte hain. Startup ka kaam aur live requests saath naap kar batches aur admission limits tay karo. Har scale-out kharab nahi hota, aur overload akele data loss ka saboot nahi.',
          choiceExplanations: [
            'Recovery mein clients cache bharne ko backend par ek saath aa sakte hain. Startup ka kaam aur live requests saath naap kar batches aur admission limits tay karo. Har scale-out kharab nahi hota, aur overload akele data loss ka saboot nahi.',
            'Headroom aur bounded coordination ke saath scale-out madad kar sakta hai.',
            'Overload risk aur accepted data khona do alag claims hain.',
            'Misses, expiry aur request rate se warm cache ka origin load bhi badal sakta hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'O(N²) topology pehchan sakte ho aur uska capacity-add ka khatra bata sakte ho',
    'CPU/memory ke alawa OS-level limits par alert lagana jaante ho',
    'Recovery ki raftaar ko ek design faisla maante ho',
    'Cell-based architecture ka asli faayda (blast radius) bol sakte ho',
  ],
  homework: `Apne sabse bade fleet mein ek sawaal poochho: kya koi bhi node baaki
    saare nodes ka kuch (connection, thread, membership entry) rakhta hai? Agar
    haan, toh ek chart banao — nodes 2x karne par woh cheez kitni badhti hai.
    Doosra kaam: apne servers par <code>ulimit -n</code> aur thread count par
    alert lagao, limit ke <b>70%</b> par.`,
  cards: [
    { front: 'AWS Kinesis Nov 2020 — trigger?', back: '<b>Capacity add karna.</b> Har front-end server har doosre server ke liye ek OS thread banata hai, isliye fleet badhne par threads <b>har</b> server par badhe aur poora fleet ek saath OS ki max thread limit paar kar gaya.' },
    { front: 'O(N²) topology ka khatra?', back: '"Har node har node ko jaanta hai" (gossip, full mesh, per-peer threads, poori membership table) mein <b>capacity add karna ek GLOBAL change hai</b>. Servers 10% badhe = kul threads ~21% badhe, har server par ~10%.' },
    { front: 'Kaunse alerts lagbhag har team bhool jaati hai?', back: 'OS-level counters: <b>thread count, file descriptors, PIDs, ephemeral ports, connection table</b>. Yeh CPU ya memory badhaye bina khatam ho jaate hain. Alert limit ke <b>70%</b> par lagao.' },
    { front: 'Recovery ki raftaar kaisi honi chahiye?', back: '<b>Throttled.</b> AWS ne servers kuch sau prati ghanta ki raftaar se laaye — kyunki har server chalu hote hi cache banane aur requests serve karne, dono ke liye ladta hai. Ek saath sab chalu karna recovery ULTA lamba karta hai.' },
    { front: 'Cell-based architecture ka asli faayda?', back: '<b>Blast radius</b> — ek cell girne par 1/N users prabhavit. Bonus: capacity badhana "naya cell" ban jaata hai, isliye purane cells ka ganit chhoota hi nahi.' },
  ],
  interview: {
    title: 'Interview Round — Fleet design',
    instructions: 'Scale ka sawaal aksar yahin par gehra hota hai. 🎤',
    questions: [
      {
        q: 'Har node poora member table rakhta hai. Fleet 500 se 5000 nodes hua. Kya sahi nateeja nikaaloge?',
        choices: [
          'Metadata ka O(N) per-node size aur protocol ka kaam alag naapo',
          'Poora member table hai, toh CPU ka O(N²) hona pakka hai',
          'Nodes 10x hain, toh service throughput bhi theek 10x hoga',
          'Table cache karo, toh membership update ka network kharcha hat jaayega',
        ],
        answer: 0,
        explain: 'Full membership table ka storage har node par O(N), poore fleet mein O(N²) hai. CPU, messages aur connections protocol par depend karte hain. 500 se 5000 nodes par table lagbhag 10x hogi; har resource ka cost alag naapo.',
        choiceExplanations: [
          'Full membership table ka storage har node par O(N), poore fleet mein O(N²) hai. CPU, messages aur connections protocol par depend karte hain. 500 se 5000 nodes par table lagbhag 10x hogi; har resource ka cost alag naapo.',
          'Table ka size CPU ya message protocol ko akela tay nahi karta.',
          'Coordination, hotspots aur shared bottlenecks se throughput ka scaling badal sakta hai.',
          'Cache ko membership badlav pahunchana aur stale entries sambhalna phir bhi padta hai.',
        ],
      },
      {
        q: '"Poora fleet gir gaya hai. Recovery plan batao."',
        choices: [
          'Batches laao, warmup aur health jaancho; incoming kaam cap karo',
          'Poora fleet restart karo; full user load se health test kar lo',
          'Doosre region bhejo; spare capacity aur shared failure ko chhod do',
          'Root cause ki poori report tak ruko; safe relief bhi rok kar rakho',
        ],
        answer: 0,
        explain: 'Recovering capacity aur incoming demand saath control karo. Pehla batch poore traffic se bhar gaya toh recovery atak sakti hai. Warmup, readiness aur load dekh kar batch badhao; safe mitigation poori root-cause report se pehle ho sakti hai.',
        choiceExplanations: [
          'Recovering capacity aur incoming demand saath control karo. Pehla batch poore traffic se bhar gaya toh recovery atak sakti hai. Warmup, readiness aur load dekh kar batch badhao; safe mitigation poori root-cause report se pehle ho sakti hai.',
          'Bootstrap aur full serving load shared dependencies ko phir bhar sakte hain.',
          'Doosre region ki capacity, data freshness aur failure cause pehle jaancho.',
          'Reversible aur samajhi hui mitigation full analysis se pehle asar ghata sakti hai.',
        ],
      },
    ],
  },
},

{
  id: 'pm-spiral',
  icon: '🌀',
  title: 'Postmortem — 73 ghante ka death spiral',
  badge: 'Spiral Todne Wala',
  objectives: [
    'Death spiral: woh outage jo bahar ka load hatane par bhi nahi rukti',
    'Observability ka apne monitored system par nirbhar hona',
    'Do bug ek saath — contention aur BoltDB ka freelist',
    'Spiral todne ka ek hi tareeka: internal churn ko kaato',
  ],
  lesson: [
    `<h3>📰 Feed se: Roblox ka apna postmortem, October 2021</h3>
     <p>28 October se 31 October 2021 tak Roblox <b>73 ghante</b> band raha —
     5 crore roz ke players ke liye. 18,000+ servers, 170,000 containers.
     Aur poora outage ek hi system par tika tha: <b>Consul</b>.</p>
     <h3>🧨 Do badlav, ek din pehle</h3>
     <pre>27 October (ek din pehle):
   • Consul ka naya STREAMING feature chalu kiya gaya
     (CPU aur bandwidth kam karne ke liye — mahino pehle
      chhote workloads par safal ho chuka tha)
   • Traffic routing nodes 50% badha diye gaye</pre>
     <p>Streaming mein purane long-polling se <b>kam</b> concurrency control
     elements (Go channels) the. Bahut zyada read <b>aur</b> write ek saath aane
     par ek hi channel par bhaari contention ho gaya. Aur dual-socket NUMA
     servers (128-core) par woh contention aur badh gaya.</p>
     <h3>🗄️ Doosra bug: BoltDB ka freelist</h3>
     <p>Consul apne Raft write-ahead log ke liye BoltDB use karta hai. Roblox ke
     workload par ek pathological bug khula: purane log entries delete hone par
     bhi BoltDB ki disk par jagah <b>kabhi kam nahi hoti</b>. Free pages ka
     freelist <b>7.8 MB</b> ka ho gaya — aur woh poora freelist <b>har 16 KB
     ke log append par dobara likha jaata tha</b>.</p>
     <pre>Database file: 4.2 GB   ·   asli data: 489 MB   ·   bekaar: 3.8 GB
Normal KV write latency: 300 ms se kam
Outage ke dauraan:      2 second

2 second ki latency  →  TCP buffers bhar gaye
                     →  leader election fail hone lagi</pre>`,
    `<h3>🌀 Death spiral — outage jo apne aap chalti rahi</h3>
     <p>Yeh sabse zaroori hissa hai. Roblox ne bahar ka <b>saara</b> player load
     hata diya — aur cluster phir bhi theek nahi hua.</p>
     <pre>1. Streaming contention se Consul dheema hua
2. Dheema Consul se service discovery atki
3. Services ko apni dependencies nahi mili → khud ko UNHEALTHY mark kiya
4. Nomad (scheduling) aur Vault (secrets) — dono Consul par nirbhar — thap
5. Internal services ne Consul ko aur zyada discovery requests bhejin
6. Us extra load ne contention aur badha di  →  kadam 1 par wapas</pre>
     <p class="tip">🎯 Death spiral ki pehchaan yeh hai: <b>bahar ka load hatane
     se kuch nahi hota</b>. Kyunki spiral ko chalane wala load bahar se nahi,
     <b>andar</b> se aa raha hai — services ka apna retry aur re-discovery churn.
     Isliye spiral todne ka tareeka bhi alag hai: internal churn kaato (backoff,
     circuit breaker, ya seedha services band karo), sirf traffic mat roko.</p>
     <h3>🙈 Aur sabse mehenga hissa: observability</h3>
     <p>Roblox ka monitoring khud Consul par nirbhar tha. Consul gira, toh
     Consul ke andar ka haal dekhne ka raasta bhi gaya. Root cause 30 October
     ko 12:00 baje mila — outage shuru hone ke <b>lagbhag 46 ghante baad</b>.
     Us din 15:51 par streaming band kiya gaya aur KV write latency
     <b>2 second se 300 ms</b> par aa gayi.</p>
     <p>Roblox ke apne remediation ki pehli line yahi hai: telemetry aur Consul
     ke beech ki <b>circular dependency hatao</b> — monitoring system usi cheez
     par nirbhar nahi hona chahiye jise woh monitor karta hai.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 28-31 October 2021',
      instructions: 'Teen din ka replay. Teen faisle tumhein lene hain.',
      incident: 'Roblox — 28-31 Oct 2021',
      goal: 'Dekho ki bahar ka load hatane par bhi cluster theek kyun nahi hua — aur spiral akhir toota kaise.',
      speedMs: 2100,
      metrics: [
        { id: 'kv', label: 'Consul KV write latency', unit: 'ms', max: 2000, dir: 'lower' },
        { id: 'players', label: 'Players jo khel paa rahe', unit: '%', max: 100, dir: 'higher' },
        { id: 'vis', label: 'Consul ke andar ki visibility', unit: '%', max: 100, dir: 'higher' },
      ],
      frames: [
        { t: '27 Oct', event: 'Do badlav ek saath: Consul ka naya <b>streaming</b> feature chalu, aur traffic routing nodes <b>50% badhe</b>. Sab normal dikhta hai.', metrics: { kv: 280, players: 100, vis: 100 } },
        { t: '28 Oct 13:37', event: 'Vault degrade hone laga. Investigation shuru. Consul ki KV write latency chad rahi hai.', metrics: { kv: 900, players: 92, vis: 45 }, tone: 'warn' },
        { t: '28 Oct 16:35', event: 'Player count <b>aadha</b>. Services apni dependencies nahi dhoondh paa rahe aur khud ko unhealthy mark kar rahe hain.', metrics: { kv: 1800, players: 48, vis: 20 }, tone: 'bad',
          ask: { q: 'Consul dheema hai aur monitoring bhi nahi dikh rahi. Monitoring ka jaana diagnosis ko kyun mushkil karta hai?',
                 choices: [
                   'Consul girte hi monitoring ka raasta bhi gaya; diagnosis mushkil hua',
                   'Purane metrics cache mein hain; live Consul ki visibility laut aayegi',
                   'Dashboard ki copies badhao; discovery ka wahi raasta kaafi rahega',
                   'Doosre tab mein dashboard kholo; backend access theek ho jaayega',
                 ], answer: 0,
                 explain: 'Monitoring bhi Consul par tiki thi. Consul unhealthy hua toh live telemetry ka raasta bhi kamzor hua. Circular dependency ne diagnosis mushkil kiya; 46 ghante ki poori der ko ek hi wajah se nahi jodna chahiye.',
                 wrongHints: [
                   'Dashboard dheema hona nateeja hai, wajah nahi — aur intezaar karne se 46 ghante lag gaye.',
                   'Data kho jaana bura hai, par asli dikkat "abhi kya ho raha hai" na dikh paana thi.',
                   'Alert noise ek alag problem hai. Yahan alerts the hi nahi kyunki unka raasta bhi Consul se hokar jaata tha.',
                 ] , choiceExplanations: [
                   'Monitoring bhi Consul par tiki thi. Consul unhealthy hua toh live telemetry ka raasta bhi kamzor hua. Circular dependency ne diagnosis mushkil kiya; 46 ghante ki poori der ko ek hi wajah se nahi jodna chahiye.',
                   'Purane metrics context dete hain; current targets aur live readings ka raasta nahi banaate.',
                   'Same failing discovery wali copies bhi live data nahi laa sakti hain.',
                   'Tab badalne se backend ki dependency nahi badalti.',
                 ],
               } },
        { t: '28 Oct 19:00', event: 'Hardware upgrade poora — <b>128-core</b> servers. <b>Koi sudhaar nahi.</b> (Baad mein pata chala: NUMA par channel contention aur BADH gayi thi.)', metrics: { kv: 1900, players: 30, vis: 20 }, tone: 'bad' },
        { t: '29 Oct 02:00', event: 'Pehli recovery koshish: Consul ka state snapshot se reset kiya gaya, iptables se load roka gaya. Thoda sudhaar dikha.', metrics: { kv: 700, players: 15, vis: 30 }, tone: 'warn' },
        { t: '29 Oct 04:00', event: 'iptables hatate hi cluster <b>turant dobara</b> degrade ho gaya.', metrics: { kv: 1850, players: 12, vis: 20 }, tone: 'bad',
          ask: { q: 'Bahar ka player load hata diya, par cluster theek nahi hua. Ab kya jaanchoge?',
                 choices: [
                   'Internal retries aur discovery requests ka load aur contention jaancho',
                   'Bahar ka load gaya, toh hardware replacement ko pakka hal maano',
                   'Bahar ka load gaya, toh snapshot corrupt hone ka nateeja nikaalo',
                   'Ingress band hai, toh ab requests ka source dekhna chhod do',
                 ], answer: 0,
                 explain: 'Bahar ka load rokne ke baad bhi internal clients ka retry aur discovery churn chal sakta hai. Request sources aur locks/queues dekh kar feedback loop jaancho. Outage ka bane rehna akela death spiral ya corruption prove nahi karta.',
                 wrongHints: [
                   'Hardware badla gaya tha (128-core servers) aur usse haalat ULTA kharab hui — NUMA par contention aur badh gayi.',
                   'Snapshot theek tha. Reset ke baad thoda sudhaar bhi dikha — par internal churn wapas aate hi cluster gira.',
                   'iptables ne bahar ka traffic sach mein rok diya tha. Load andar se aa raha tha.',
                 ] , choiceExplanations: [
                   'Bahar ka load rokne ke baad bhi internal clients ka retry aur discovery churn chal sakta hai. Request sources aur locks/queues dekh kar feedback loop jaancho. Outage ka bane rehna akela death spiral ya corruption prove nahi karta.',
                   'Hardware fault ke liye diagnostics chahiye; internal load bhi kaafi ho sakta hai.',
                   'Snapshot ki integrity alag checks se pata chalegi; persistent overload corruption ka proof nahi.',
                   'Health checks, retries aur control loops ingress ke bina bhi requests bhejte hain.',
                 ],
               } },
        { t: '30 Oct 12:00', event: '<b>Root cause mila:</b> ek din pehle chalu kiya gaya Consul streaming feature. Aur uske neeche BoltDB ka freelist bug — 4.2 GB file mein sirf 489 MB asli data.', metrics: { kv: 1800, players: 10, vis: 35 }, tone: 'warn',
          ask: { q: 'Streaming par contention ka evidence mila hai. Pehli mitigation kaise chunoge?',
                 choices: [
                   'Streaming rollback ka risk jaancho; safe ho toh feature pehle band karo',
                   'BoltDB ko live upgrade karo; rollback ke chhote raaste ko chhod do',
                   'Flag aur storage dono badlo; kis badlav ka asar hua alag mat naapo',
                   'Hardware badlo; known contention ke raaste ko filhaal chalta rakho',
                 ], answer: 0,
                 explain: 'Streaming path par evidence tha aur feature disable karna storage upgrade se chhota badlav tha. Roblox ne streaming band ki, KV writes ka p50 300 ms hua. Slow leaders ko alag sambhala gaya; BoltDB ki poori wajah incident ke baad mili.',
                 wrongHints: [
                   'BoltDB asli underlying bug tha, par usko badalna ek software upgrade hai. Girte hue cluster par upgrade karna naya khatra hai.',
                   'Ek saath do badlav karne par pata hi nahi chalega kis-se sudhaar aaya — aur ek bigad gaya toh dono wapas lene padenge.',
                   'Hardware pehle hi badla ja chuka tha aur usse haalat kharab hui thi.',
                 ] , choiceExplanations: [
                   'Streaming path par evidence tha aur feature disable karna storage upgrade se chhota badlav tha. Roblox ne streaming band ki, KV writes ka p50 300 ms hua. Slow leaders ko alag sambhala gaya; BoltDB ki poori wajah incident ke baad mili.',
                   'Live storage upgrade naya risk la sakta hai; evidenced reversible mitigation pehle asar ghata sakti hai.',
                   'Saath badlav se cause aur rollback ka nateeja samajhna mushkil hota hai.',
                   'Is incident mein bade NUMA servers contention aur badha chuke the; known bottleneck par kaam karo.',
                 ],
               } },
        { t: '30 Oct 15:51', event: '<b>Streaming band.</b> KV write latency 2 second se <b>300 ms</b> par. Cluster stable hone laga.', metrics: { kv: 300, players: 12, vis: 80 }, tone: 'ok' },
        { t: '31 Oct 10:00', event: 'Cache layer healthy, services restart ho gayin. Players ko <b>DNS steering</b> se dheere-dheere wapas laaya ja raha hai.', metrics: { kv: 290, players: 55, vis: 100 }, tone: 'ok' },
        { t: '31 Oct 16:45', event: '<b>100% players wapas.</b> Kul outage: 73 ghante.', metrics: { kv: 280, players: 100, vis: 100 }, tone: 'ok' },
      ],
      lesson: `💡 Teen sabak. <b>1.</b> Death spiral ki pehchaan: bahar ka load
        hatane se kuch nahi hota, kyunki spiral ka indhan internal churn hai —
        ilaaj internal churn kaatna hai. <b>2.</b> Monitoring kabhi bhi us system
        par nirbhar nahi honi chahiye jise woh monitor karta hai; Roblox ko root
        cause 46 ghante mein mila kyunki dekhne ka raasta bhi gira hua tha.
        <b>3.</b> Outage ke dauraan woh badlav chuno jo <b>ek flag</b> ho aur
        <b>turant palat</b> sake — streaming band karna, BoltDB badalna nahi.`,
    },
    {
      type: 'archdiff',
      title: 'Roblox ka platform — chaar galtiyan',
      instructions: 'Neeche wahi dhaancha hai. Chaar box galat hain — click karke pakdo.',
      brief: `Ek platform jahan service discovery, scheduling, secrets aur
        monitoring — sab ek hi Consul cluster par tike hain.`,
      goal: 'Chaar galtiyan pakdo. Har box ka faisla click par khulta hai — sahi box bhi apni wajah batata hai.',
      nodes: [
        { id: 'consul', label: '🗺️ Consul (ek cluster)', sub: 'service discovery + KV store + health checks — sab kuch', row: 0 },
        { id: 'boltdb', label: '💾 BoltDB', sub: 'Raft WAL — freelist har 16 KB append par dobara likhta hai', row: 0 },
        { id: 'nomad', label: '📦 Nomad', sub: 'container scheduling — Consul par nirbhar', row: 1 },
        { id: 'vault', label: '🔐 Vault', sub: 'secrets — Consul par nirbhar', row: 1 },
        { id: 'telemetry', label: '📊 Telemetry', sub: 'metrics + dashboards — Consul se service discovery karta hai', row: 2 },
        { id: 'services', label: '⚙️ 400+ services', sub: 'Consul dheema ho toh retry karti rehti hain, bina backoff', row: 2 },
      ],
      flaws: [
        { id: 'consul', why: 'Ek hi Consul cluster par service discovery, KV store aur health checks — <b>sab kuch</b>. Ek cluster girne par poora platform gira. Roblox ka apna fix: critical services ke liye <b>alag Consul clusters</b>, aur KV data ko Consul se hatakar theek storage mein le jaana.' },
        { id: 'telemetry', why: 'Yahi sabse mehengi galti thi. Telemetry Consul se service discovery karta tha, isliye Consul girte hi <b>Consul ke andar dekhne ka raasta bhi gaya</b>. Root cause milne mein lagbhag 46 ghante lage. Monitoring hamesha us system se <b>swatantra</b> honi chahiye jise monitoring dekhti hai.' },
        { id: 'services', why: 'Bina backoff ke retry hi <b>death spiral ka indhan</b> hai. Bahar ka saara load hatane par bhi 400+ services ka apna re-discovery churn cluster ko toota rakhne ke liye kaafi tha. Har client par exponential backoff + jitter + circuit breaker chahiye.' },
        { id: 'boltdb', why: 'Purane log entries delete hone par bhi BoltDB ki disk jagah kam nahi hoti thi. Freelist <b>7.8 MB</b> ka ho gaya aur poora freelist <b>har 16 KB ke append</b> par dobara likha jaata tha — 4.2 GB file mein asli data sirf 489 MB. Fix: bbolt.' },
      ],
      fine: {
        nomad: 'Nomad ka Consul par nirbhar hona ek jaayaz design hai — scheduler ko service discovery chahiye hi. Galti Nomad mein nahi, us <b>ek</b> Consul cluster mein thi jispar baaki sab bhi tika tha.',
        vault: 'Vault ka Consul ko storage backend banana ek aam aur supported pattern hai. Yahan bhi galti Vault ki nahi — galti yeh thi ki wahi Consul cluster discovery, KV aur health checks bhi chala raha tha.',
      },
      lesson: `🎯 Chaaron galtiyan alag-alag layer par hain: <b>ek shared cluster</b>
        (blast radius), <b>storage engine ka bug</b> (BoltDB freelist),
        <b>observability ki circular dependency</b> (46 ghante ka andhera), aur
        <b>bina backoff ke retry</b> (spiral ka indhan). Sirf ek ko theek karne se
        outage phir bhi hota — bas thoda chhota.`,
    },
    {
      type: 'incident',
      title: 'Incident — tumhara apna spiral',
      instructions: 'Raat 2 baje. Tumhara service discovery cluster dheema hai. Faisle lo.',
      pager: '<b>#sre-oncall</b> — 02:14 AM<br>service-discovery: p99 latency <b>3 s</b> (normal 200 ms). 47% services khud ko <b>unhealthy</b> bata rahi hain.',
      start: 'n1',
      nodes: {
        n1: {
          text: `🚨 <b>02:14</b> — Alerts phat rahe hain. Service discovery ki
            latency 200 ms se 3 second par. Aadhi services khud ko unhealthy mark
            kar chuki hain. Tumne pehla kaam kya kiya?`,
          choices: [
            { text: "Stop only outside traffic", good: false, next: 'n2',
              explain: 'Bahar ka traffic rokna dabav ghata sakta hai — par internal churn chalta raha toh death spiral rukna pakka nahi. Chalo dekhte hain kya hota hai.' },
            { text: "Check changes and internal load", good: true, next: 'n3',
              explain: 'Sahi. Roblox ka trigger ek din pehle chalu kiya gaya Consul streaming flag tha. Spiral mein sabse pehla sawaal hamesha "kya badla" hota hai.' },
            { text: "Scale hardware before contention evidence", good: false, next: 'n2',
              explain: 'Roblox ne bilkul yahi kiya — 128-core servers. Haalat <b>ULTA kharab</b> hui, kyunki NUMA par channel contention aur badh gayi. Is workload mein bade NUMA servers contention ka ilaaj nahi bane.' },
          ],
        },
        n2: {
          text: `⏱️ <b>02:40</b> — Bahar ka traffic poora ruka hua hai. Cluster
            phir bhi theek nahi ho raha. Latency ab bhi 3 second. Ab kya samajh
            aaya?`,
          choices: [
            { text: "Trace internal retry load", good: true, next: 'n3',
              explain: 'Bilkul. Jab bahar ka load hatane se kuch nahi hota, tab <b>death spiral</b> ka shak hai; request sources aur contention se internal load jaancho. Ab ilaaj bhi internal hoga.' },
            { text: "Wait without new evidence", good: false, next: 'n2b',
              explain: 'Bina naye evidence wait karna internal feedback loop nahi kaatta. Roblox ki 46 ghante ki diagnosis ko sirf intezaar se jodna sahi nahi.' },
          ],
        },
        n2b: {
          text: `😰 <b>04:00</b> — Kuch nahi badla. Ab bhi 3 second. Aur ab
            observability dashboard bhi nahi khul raha — dashboard bhi service discovery
            se hokar jaata hai.`,
          choices: [
            { text: "Find independent observability path", good: true, next: 'n3',
              explain: 'Der se hi sahi, sahi nishkarsh. Aur dashboard ka na khulna apne aap mein ek bada sabak hai: monitoring ka emergency raasta monitored service se alag chalna chahiye.' },
          ],
        },
        n3: {
          text: `🔍 <b>03:10</b> — Deploy log mila: <b>kal shaam</b> ek naya
            "streaming" mode flag chalu kiya gaya tha, aur usi din routing nodes
            50% badhaye gaye the. Ab kya karoge?`,
          choices: [
            { text: "Test known reversible flag rollback", good: true, next: 'n4',
              explain: 'Sahi. Outage ke dauraan aisa evidenced badlav chuno jo <b>ek flag</b> ho, <b>turant palat</b> sake aur <b>chhota</b> ho. Roblox ne 30 Oct 15:51 par yahi kiya — latency 2 second se 300 ms par aa gayi.' },
            { text: "Upgrade storage engine immediately", good: false, next: 'n3b',
              explain: 'Live storage upgrade bada badlav hai aur naya risk la sakta hai. Evidence wale reversible flag rollback ka risk pehle jaancho.' },
            { text: "Change both at once;no attribution", good: false, next: 'n3b',
              explain: 'Roblox ke case mein BoltDB ka freelist bug asli underlying wajah tha — par bbolt upgrade Roblox ke roadmap par <b>Q1 2022</b> mein tha, outage ke dauraan nahi. Girte hue cluster par upgrade karna naya khatra hai.' },
          ],
        },
        n3b: {
          text: `⏳ <b>03:45</b> — Storage upgrade ke raaste par 35 minute gaye aur latency waisi
            hi hai. Doosra badlav abhi bhi chalu hai.`,
          choices: [
            { text: "Reassess unchanged feature path", good: true, next: 'n4',
              explain: 'Ab sahi. Sabak: jab do badlav shak ke daayre mein hon, pehle evidence wala badlav palto jo <b>sabse sasta aur sabse tez</b> palat sakta hai.' },
          ],
        },
        n4: {
          text: `📉 <b>03:20</b> — Latency 3 second se 280 ms par. Cluster stable
            hai. Par services abhi bhi unhealthy hain aur services ke cache thande hain.
            Sab kuch ek saath chalu kar dein?`,
          choices: [
            { text: "Batch recovery;warm;limit arrivals", good: true, next: 'end',
              explain: 'Roblox ne 31 October ko DNS steering se players ko dheere-dheere wapas laaya. AWS ne Kinesis ke servers kuch sau prati ghanta ki raftaar se laaye. <b>Recovery ki raftaar bhi ek design faisla hai.</b>' },
            { text: "Restart full fleet at full load", good: false, next: 'n4b',
              explain: 'Thande cache wali saari services ek saath chalu karna thundering herd banata hai — abhi-abhi sambhle cluster par sabse bada dabav.' },
          ],
        },
        n4b: {
          text: `💥 <b>03:35</b> — Sab kuch ek saath chalu hua, thande cache ne
            ek saath discovery requests bheji, aur latency wapas 2 second par.
            Cluster dobara gir gaya.`,
          choices: [
            { text: "Pause herd;resume bounded waves", good: true, next: 'end',
              explain: 'Yahi sabak sabse mehenga hota hai: recovery ki raftaar khud ek design faisla hai. Thake hue system ko ek saath poora load dena recovering system ko dobara gira sakta hai.' },
          ],
        },
        end: {
          end: true,
          text: `✅ <b>Spiral toot gaya.</b> Tumne teen kaam sahi kram mein kiye:
            <b>1.</b> "Kya badla" poochha — code se pehle flags aur config bhi gine.
            <b>2.</b> Sabse sasta, sabse tez palatne wala badlav pehle palta.
            <b>3.</b> Recovery ko throttle kiya — batches, warm cache, dheere users.
            <br><br>Aur do cheezein aage ke liye likh lo: monitoring ko us system
            se swatantra karo jise monitoring dekhti hai, aur har internal client
            par exponential backoff + jitter lagao. Backoff ke bina retry hi
            spiral ka indhan hai.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Death spiral pehchano',
      questions: [
        {
          q: 'Bahar ka load ruka hai. Kaunsa evidence death spiral ke shak ko mazboot karta hai?',
          choices: [
            'Internal retries badhe, contention badha, aur retries phir badh gaye',
            'CPU 100% par hai; CPU ka graph akele death spiral pakka karta hai',
            'Latency badh rahi hai; retry logs ke bina retries ko wajah maano',
            'Errors 50% hain; error ratio se feedback loop ka cause tay karo',
          ],
          answer: 0,
          explain: 'Death spiral ka saboot feedback loop hai: internal requests load badhaati hain, slow response aur retries laata hai. Sources, queues aur contention ka evidence milao. High CPU, latency ya error ratio akela unique diagnosis nahi.',
          choiceExplanations: [
            'Death spiral ka saboot feedback loop hai: internal requests load badhaati hain, slow response aur retries laata hai. Sources, queues aur contention ka evidence milao. High CPU, latency ya error ratio akela unique diagnosis nahi.',
            'High CPU compute, lock contention ya kai aur wajah se ho sakta hai.',
            'Latency I/O, locks ya network se bhi badh sakti hai; retries ka evidence chahiye.',
            'Error fraction asar naapta hai; internal feedback mechanism alag jaancho.',
          ],
        },
        {
          q: 'Roblox ne 128-core servers par upgrade kiya aur haalat ULTA kharab hui. Kyun?',
          choices: [
            'NUMA par shared channel ki contention badhi; cores se kaam nahi banta',
            'Zyada cores se har Consul workload ka dheema hona zaroori tha',
            'NUMA servers aaye, toh stored data corrupt hone ka saboot mil gaya',
            'Naya hardware hai, toh scheduling ya cache locality ka asar nahi hoga',
          ],
          answer: 0,
          explain: 'Is workload mein threads ek shared channel par lad rahe the. Dual-socket NUMA hardware par contention aur badhi. Zyada cores har workload ko slow nahi karte; synchronization aur memory access ka pattern maayne rakhta hai.',
          choiceExplanations: [
            'Is workload mein threads ek shared channel par lad rahe the. Dual-socket NUMA hardware par contention aur badhi. Zyada cores har workload ko slow nahi karte; synchronization aur memory access ka pattern maayne rakhta hai.',
            'Nateeja workload, implementation aur memory topology par depend karta hai.',
            'Contention aur durable data corruption alag baatein hain; NUMA akele corruption ka proof nahi.',
            'Cores aur sockets scheduling, locality aur shared resources par asar daal sakte hain.',
          ],
        },
        {
          q: 'Monitoring ko targets Consul se milte hain, aur monitoring Consul ko hi dekhti hai. Seedha sudhaar kya hai?',
          choices: [
            'Live monitoring ke liye alag discovery ya static fallback path rakho',
            'Purane metrics zyada der rakho; live discovery ka wahi raasta rakho',
            'Dashboard doosre region bhejo; discovery ka backend wahi rehne do',
            'Backup dashboard banao; data laane ki wahi failing dependency rakho',
          ],
          answer: 0,
          explain: 'Monitored system girne par bhi metrics tak pahunch chahiye. Alag discovery ya static emergency targets madad karte hain. Sirf UI ki copy ya region badalna kaafi nahi jab live data ka raasta wahi ho.',
          choiceExplanations: [
            'Monitored system girne par bhi metrics tak pahunch chahiye. Alag discovery ya static emergency targets madad karte hain. Sirf UI ki copy ya region badalna kaafi nahi jab live data ka raasta wahi ho.',
            'History diagnosis mein madad karti hai; live target discovery phir bhi toot sakti hai.',
            'Doosre region ka UI bhi same failed backend par atak sakta hai.',
            'Dashboard copy independent collection aur access ka raasta nahi banaati.',
          ],
        },
        {
          q: 'Feature flag aur storage bug dono shak mein hain. Pehli mitigation kaise chunoge?',
          choices: [
            'Evidence, asar aur palatne ki aasani se mitigation ki priority chuno',
            'Feature flag hai, toh asar jaane bina safe rollback maan lo',
            'Storage mein bug mila, toh live engine upgrade ko pehla hal maano',
            'Sab shak wale changes saath karo; speed ko hi priority banao',
          ],
          answer: 0,
          explain: 'Known bad path ki mitigation evidence se chuno. Chhota aur tested reversible badlav aksar behtar hota hai, par har flag safe nahi. Data, blast radius aur rollback ka haal samajh kar change karo aur nateeja naapo.',
          choiceExplanations: [
            'Known bad path ki mitigation evidence se chuno. Chhota aur tested reversible badlav aksar behtar hota hai, par har flag safe nahi. Data, blast radius aur rollback ka haal samajh kar change karo aur nateeja naapo.',
            'Kuch flags data ya wide behavior badalte hain; flag hona safe hone ka saboot nahi.',
            'Bug ki pehchaan se live upgrade sabse safe immediate action tay nahi hota.',
            'Uncontrolled saath changes se attribution aur rollback dono mushkil hote hain.',
          ],
        },
      ],
    },
  ],
  success: [
    'Death spiral ko internal-load test se pehchan sakte ho',
    'Observability ki circular dependency dhoondh aur todh sakte ho',
    'Contention ka ilaaj hardware nahi hai — yeh bata sakte ho',
    'Outage ke dauraan sabse sasta, sabse tez palatne wala badlav chunte ho',
  ],
  homework: `Do drill chalao. (1) Apne monitoring stack ka raasta kagaz par likho —
    kya woh kisi bhi aise system se hokar jaata hai jise woh monitor karta hai?
    (2) Apne top 5 internal clients ka retry config dekho: kya har ek par
    exponential backoff aur jitter hai? Jispar nahi hai, wahi tumhare spiral ka
    indhan hai.`,
  cards: [
    { front: 'Death spiral ki pehchaan?', back: 'Bahar ka <b>saara</b> load hatane par bhi system theek nahi hota — spiral ka indhan <b>internal</b> retry aur re-discovery churn hai. Test chalaya ja sakta hai: traffic roko aur dekho.' },
    { front: 'Roblox 2021 — asli trigger?', back: 'Ek din pehle chalu kiya gaya <b>Consul streaming</b> flag (kam Go channels → bhaari contention), plus <b>BoltDB freelist</b> bug (7.8 MB freelist har 16 KB append par dobara likha jaata tha; 4.2 GB file mein 489 MB data).' },
    { front: 'Contention ka ilaaj bade servers hain?', back: '<b>Nahi.</b> Roblox ne 128-core servers laaye aur haalat ULTA kharab hui — dual-socket NUMA par ek hi channel ki contention aur badh gayi. Contention ka ilaaj <b>concurrency structure badalna</b> hai.' },
    { front: 'Observability ka pehla niyam?', back: 'Monitoring us system par <b>nirbhar na ho</b> jise woh monitor karti hai. Roblox ko root cause milne mein 46 ghante lage kyunki Consul ke andar dekhne ka raasta bhi Consul se hokar jaata tha.' },
    { front: 'Outage ke dauraan kaunsa badlav pehle?', back: 'Woh jo <b>chhota</b> ho, <b>turant palat</b> sake, aur <b>naya khatra</b> na laaye. Roblox ne streaming flag band kiya (2s → 300ms); BoltDB ka fix Q1 2022 tak rakha.' },
  ],
  interview: {
    title: 'Interview Round — Cascading failure',
    instructions: 'Yeh sawaal principal-level rounds ka favourite hai. 🎤',
    questions: [
      {
        q: '"Tumhara cluster gir gaya hai aur bahar ka saara traffic rokne par bhi theek nahi ho raha. Kya chal raha hai?"',
        choices: [
          'Internal retry-discovery loop ka shak hai; sources aur contention jaancho',
          'Load hata diya, toh hardware hi kharab hai; servers badalna shuru karo',
          'Load hata diya, toh data corrupt hai; snapshot turant replace karo',
          'Ingress band hai, toh internal requests bhi ruk chuki hongi; wait karo',
        ],
        answer: 0,
        explain: 'Internal health checks, retries aur discovery load outage ko chala sakte hain. Sources aur contention ka evidence mile toh churn kaato, backoff lagao ya non-essential clients roko. Persistent failure akela cause prove nahi karta.',
        choiceExplanations: [
          'Internal health checks, retries aur discovery load outage ko chala sakte hain. Sources aur contention ka evidence mile toh churn kaato, backoff lagao ya non-essential clients roko. Persistent failure akela cause prove nahi karta.',
          'Hardware diagnostics ke bina replacement ka nateeja jaldi hai.',
          'Stored data ki integrity alag se jaancho; overload bhi bana reh sakta hai.',
          'Ingress rokne par bhi service-to-service aur control requests chal sakti hain.',
        ],
      },
      {
        q: 'Ek feature flag se Roblox ka 73 ghante ka outage kaise bana?',
        choices: [
          'Shared Consul dheema hua; internal churn aur kam telemetry se recovery lambi hui',
          'Flag ka size chhota tha; chhota flag hi 73 ghante ka fixed delay laata hai',
          'Flag chalu hua tha; timing se sab stored writes mitne ka proof milta hai',
          'Shared channel par contention thi; attacker ke bina aisa ho nahi sakta',
        ],
        answer: 0,
        explain: 'Flag ne shared streaming path ka behavior badla. Slow discovery, internal churn, monitoring dependency aur cold recovery ne asar badhaya. 73 ghante total recovery ka nateeja tha, kisi flag ki fixed duration nahi.',
        choiceExplanations: [
          'Flag ne shared streaming path ka behavior badla. Slow discovery, internal churn, monitoring dependency aur cold recovery ne asar badhaya. 73 ghante total recovery ka nateeja tha, kisi flag ki fixed duration nahi.',
          'Recovery time state, diagnosis aur dependency recovery par depend karta hai.',
          'Timing akele data loss ka saboot nahi; source ne service failure aur contention samjhaayi.',
          'Performance aur concurrency bugs attacker ke bina bhi trigger ho sakte hain.',
        ],
      },
    ],
  },
},
]);
})();

/* =====================================================================
   F6 — Napkin math: paimane ka hunar
   F7 — Vector search: RAG ke neeche ka asli system
   ===================================================================== */
(function () {
SD.registerLevels('feed', [
{
  id: 'napkin',
  icon: '🧮',
  title: 'Napkin Math — paimane ka hunar',
  badge: 'Napkin Nawab',
  objectives: [
    'Roz ke volume se QPS nikalna — do second mein',
    'Woh chaar latency paimane jo dil se yaad hone chahiye',
    'Physics ki seema: cross-region RTT ko koi optimize nahi kar sakta',
    'Little\'s Law se concurrency aur server count nikalna',
  ],
  lesson: [
    `<h3>🎯 Estimation ka asli hunar exact number nahi hai</h3>
     <p>System design mein estimation ka maqsad sahi jawab nikalna nahi hai.
     Maqsad hai <b>sahi paimana</b> nikalna — kyunki design ka faisla paimane
     se badalta hai, decimal se nahi.</p>
     <table>
       <tr><th>Nateeja</th><th>Design par asar</th></tr>
       <tr><td>40 writes/sec</td><td>Ek Postgres. Write path par sochna hi galti hai.</td></tr>
       <tr><td>4,000 writes/sec</td><td>Ab schema, index aur batching par sochna padega.</td></tr>
       <tr><td>400,000 writes/sec</td><td>Ab yeh ek stream hai, database nahi. Kafka + LSM.</td></tr>
     </table>
     <p>In teenon ke beech ka farak <b>100x</b> ka hai. Isliye tumhara andaaza
     2x galat ho toh koi farak nahi padta — 100x galat ho toh tumne galat system
     bana diya.</p>
     <h3>⏱️ Do numbers jo har baar kaam aate hain</h3>
     <pre>1 din  =  86,400 second   →  yaad rakhne ke liye:  ~100,000 second
1 mahina = 2.6 million second

Isliye:  10 lakh (1M) events/din   →  lagbhag 12 /sec
         1 crore (10M) events/din  →  lagbhag 120 /sec
         100 crore (1B) events/din →  lagbhag 12,000 /sec</pre>
     <p class="tip">🎯 Sirf yeh ek line — <b>"1 din lagbhag 100,000 second"</b> —
     tumhein interview mein aadha estimation muft mein de deti hai. Roz ka volume
     lakh se divide karo, bas.</p>`,
    `<h3>🌍 Woh seema jo koi optimize nahi kar sakta</h3>
     <p>Fiber mein roshni lagbhag <b>200,000 km/sec</b> chalti hai (vacuum se
     dheemi, kyunki glass ka refractive index). Isliye do sheher ke beech ka
     minimum round trip <b>physics</b> se tay hota hai:</p>
     <pre>RTT (minimum)  =  2 × doori ÷ 200,000 km/s

Mumbai ↔ Chennai      ~1,000 km   →   ~10 ms
Mumbai ↔ Singapore    ~4,000 km   →   ~40 ms
Mumbai ↔ Virginia    ~13,000 km   →   ~130 ms
London ↔ Sydney      ~17,000 km   →   ~170 ms</pre>
     <p>Asli RTT hamesha isse zyada hota hai (routers, switches, non-direct fiber
     path), par <b>kam kabhi nahi</b> ho sakta. Jab koi kahe "cross-region call ko
     optimize kar dunga", jawab yeh hai: <b>speed of light par tumhara koi zor nahi</b>.
     Sirf ek hi ilaaj hai — <b>call hi mat karo</b> (cache karo, replicate karo,
     ya us data ko paas le aao).</p>
     <h3>🔢 Little's Law — teen number, ek formula</h3>
     <pre>L  =  λ × W

L  =  ek waqt mein andar kitne requests (concurrency)
λ  =  arrival rate (requests/sec)
W  =  har request ka time (seconds)</pre>
     <p>Yahi formula tumhein pool size, thread count aur server count deta hai.
     50,000 rps aur 40 ms per request ka matlab hai <b>2,000 requests ek saath
     andar</b>. Agar tumhara pool 200 ka hai, toh 1,800 requests <b>queue mein
     khade</b> hain — aur wahi woh sthiti hai jahan CPU 10% dikhta hai aur
     timeouts aate rehte hain.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Chhe napkin problems',
      instructions: 'Har sawaal par pehle apna andaaza likho. Sahi ka matlab hai sahi paimana — exact number nahi.',
      goal: 'Chhe numbers nikalo. Har ek ke baad poori calculation khulegi taaki tareeka yaad rahe.',
      problems: [
        {
          q: 'Ek photo app par roz <b>50 crore (500 million)</b> photos upload hoti hain. Average upload QPS kitna hai?',
          unit: 'uploads/sec',
          given: ['Roz: 500 million uploads', '1 din = 86,400 second'],
          answer: 5787,
          steps: [
            '500,000,000 ÷ 86,400 = 5,787 uploads/sec',
            'Shortcut: 1 din ko 100,000 second maano → 500M ÷ 100k = 5,000 — kaafi paas',
            'Peak aksar average ka 2-3x hota hai → lagbhag 12,000-17,000 uploads/sec peak',
          ],
          lesson: '🎯 Yaad rakhne wali ek line: <b>1 din lagbhag 100,000 second</b>. Roz ka volume 1 lakh se divide karo aur QPS mil gaya. Interview mein calculator nahi hota, yeh shortcut hota hai.',
        },
        {
          q: 'Har photo <b>2 MB</b> ki hai. Roz kitna naya storage chahiye?',
          unit: 'TB/din',
          given: ['Roz: 500 million photos', 'Har photo: 2 MB'],
          answer: 1000,
          steps: [
            '500,000,000 × 2 MB = 1,000,000,000 MB',
            '1,000,000,000 MB ÷ 1,000,000 = 1,000 TB = 1 PB roz',
            'Saal bhar mein: 365 PB. Paanch saal: lagbhag 1.8 EB',
            'Replication 3x ke saath: roz 3 PB',
          ],
          lesson: '🎯 Yeh number turant ek design faisla deta hai: 1 PB roz ka matlab hai photos <b>kabhi</b> database mein nahi ja sakti. Blob storage (S3/GCS) + database mein sirf <b>metadata</b>. Aur replication 3x hamesha yaad rakho — storage ka andaaza usse guna hota hai.',
        },
        {
          q: 'Read:write ratio <b>100:1</b> hai aur peak average ka <b>3x</b>. Peak par photos serve karne ke liye kitni bandwidth chahiye?',
          unit: 'GB/sec',
          given: ['Average uploads: 5,787/sec', 'Read:write = 100:1', 'Peak = 3x average', 'Har photo: 2 MB'],
          answer: 3472,
          tol: 0.4,
          steps: [
            'Average reads = 5,787 × 100 = 578,700 reads/sec',
            'Peak reads = 578,700 × 3 = 1,736,100 reads/sec',
            '1,736,100 × 2 MB = 3,472,200 MB/sec = lagbhag 3,472 GB/sec',
            'Bits mein: 3,472 GB/s × 8 = lagbhag 27.8 Tbps',
          ],
          lesson: '🎯 27.8 Tbps koi origin server nahi de sakta — aur yahi is calculation ka poora maqsad hai. Yeh number kehta hai: <b>CDN optional nahi hai, CDN hi architecture hai</b>. Origin sirf cache miss dekhta hai. Ek number ne poora design tay kar diya.',
        },
        {
          q: 'Mumbai se Virginia ki doori lagbhag <b>13,000 km</b> hai. Fiber mein roshni <b>200,000 km/sec</b> chalti hai. Minimum round trip time kitna hai?',
          unit: 'ms',
          given: ['Doori: 13,000 km (ek taraf)', 'Fiber mein speed: 200,000 km/sec'],
          answer: 130,
          tol: 0.3,
          steps: [
            'Ek taraf ka waqt = 13,000 ÷ 200,000 = 0.065 sec = 65 ms',
            'Round trip = 65 × 2 = 130 ms',
            'Asli RTT hamesha isse ZYADA hota hai (routers, switches, ghumavdar fiber) — lagbhag 180-220 ms',
            'Par 130 ms se KAM kabhi nahi ho sakta — yeh physics hai',
          ],
          lesson: '🎯 Jab koi kahe "main cross-region call optimize kar dunga", jawab yeh hai: <b>speed of light par tumhara zor nahi hai</b>. Sirf teen ilaaj hain — call hi mat karo (cache), data paas le aao (replicate), ya call ko async kar do. Chautha koi raasta nahi hai.',
        },
        {
          q: 'Ek page load Mumbai se Virginia par <b>3 sequential</b> API calls karta hai. Sirf network ki wajah se minimum page latency kitni hogi?',
          unit: 'ms',
          given: ['Har cross-region RTT: lagbhag 130 ms (minimum)', 'Calls sequential hain — ek ke baad doosra'],
          answer: 390,
          tol: 0.3,
          steps: [
            '3 × 130 ms = 390 ms — sirf network ka waqt',
            'Server ka processing time abhi joda hi nahi hai',
            'Agar teenon calls PARALLEL hoti: 130 ms (sabse dheemi wali)',
            'Agar teenon ek hi request mein aa jaatin (batch/GraphQL): 130 ms',
          ],
          lesson: '🎯 Yahi wajah hai ki cross-region par <b>sequential calls ka count</b> sabse zaroori number ban jaata hai. Har extra sequential hop ek poora RTT jodta hai. Design ka sawaal "kitna data" nahi, <b>"kitne round trips"</b> ban jaata hai.',
        },
        {
          q: 'Tumhari service <b>50,000 rps</b> leti hai aur har request lagbhag <b>40 ms</b> leti hai. Ek waqt mein kitni requests andar (in flight) hongi?',
          unit: 'concurrent requests',
          given: ['Arrival rate: 50,000 rps', 'Har request: 40 ms = 0.04 sec', 'Little\'s Law: L = lambda x W'],
          answer: 2000,
          steps: [
            'L = 50,000 × 0.04 = 2,000 concurrent requests',
            'Agar har server 250 concurrent handle karta hai → 8 servers chahiye',
            'Agar tumhara connection pool 200 ka hai → 1,800 requests QUEUE mein khadi hain',
            'Queue mein khadi request CPU nahi jalati — isliye CPU 10% dikhega aur timeouts aate rahenge',
          ],
          lesson: '🎯 Little\'s Law ek hi formula se pool size, thread count aur server count deta hai. Aur uska sabse mehenga sabak yeh hai: <b>CPU 10% par timeout</b> ka matlab lagbhag hamesha queueing hai, capacity nahi. Woh queue kahan hai — pool, thread, ya socket backlog — wahi asli sawaal hai.',
        },
      ],
    },
    {
      type: 'bins',
      title: 'Latency ke chaar paimane',
      instructions: 'Har cheez ko uske paimane mein daalo. Yaad exact number nahi, PAIMANA rakhna hai.',
      bins: [
        { id: 'sub', label: '⚡ 1 ms se kam' },
        { id: 'single', label: '🏃 1-10 ms' },
        { id: 'tens', label: '🚶 10-100 ms' },
        { id: 'hundreds', label: '🐢 100 ms se zyada' },
      ],
      items: [
        { text: 'Main memory se ek value padhna', bin: 'sub', explain: 'Lagbhag <b>100 nanosecond</b>. Yaani 1 ms mein tum 10,000 memory reads kar sakte ho — isliye in-memory kaam ki ginti aksar bekaar hoti hai.' },
        { text: 'SSD se ek random 4 KB read', bin: 'sub', explain: 'Lagbhag <b>100 microsecond</b> = 0.1 ms. SSD memory se 1000x dheemi hai, par spinning disk se 100x tez.' },
        { text: 'Same availability zone ka round trip', bin: 'sub', explain: 'Lagbhag <b>0.5 ms</b>. Isliye same-AZ calls "lagbhag muft" maani jaati hain — par 100 aisi calls phir bhi 50 ms hain.' },
        { text: 'Same region, alag AZ ka round trip', bin: 'single', explain: 'Lagbhag <b>1-2 ms</b>. Multi-AZ replication ka yahi kharcha hai — aur kharcha itna kam hai ki high availability ke liye hamesha worth it hai.' },
        { text: 'Index par ek row database se laana', bin: 'single', explain: 'Lagbhag <b>1-5 ms</b> (cache hit par kam). Agar tumhari simple query 50 ms le rahi hai, toh index nahi lag raha ya N+1 chal raha hai.' },
        { text: 'SSD se 1 MB sequential padhna', bin: 'single', explain: 'Lagbhag <b>1 ms</b>. Sequential read random read se bahut tez hai — yahi wajah hai ki LSM trees aur columnar storage itne tez hote hain.' },
        { text: 'Spinning disk ka ek seek', bin: 'tens', explain: 'Lagbhag <b>10 ms</b>. Ek seek = 100 SSD reads ka waqt. Isiliye B-tree ki depth kam rakhna kabhi itna zaroori tha.' },
        { text: 'Mumbai se Singapore ka round trip', bin: 'tens', explain: 'Lagbhag <b>35-40 ms</b>. Asia ke andar ka cross-region call — mehenga hai par sehne laayak, agar sequential na ho.' },
        { text: '1 MB ko 1 Gbps link par bhejna', bin: 'tens', explain: 'Lagbhag <b>8 ms</b> (8 megabit ÷ 1 gigabit/sec). Bade payloads ka kharcha latency mein dikhta hai, CPU mein nahi.' },
        { text: 'Mumbai se Virginia ka round trip', bin: 'hundreds', explain: 'Lagbhag <b>130 ms minimum</b> (physics), asli mein 180-220 ms. Cross-continent sequential calls ka matlab hai seconds mein page load.' },
        { text: 'Thanda container start hona', bin: 'hundreds', explain: 'Lagbhag <b>200 ms se 1 second</b>. Yahi wajah hai ki serverless par cold start itna bada mudda hai, aur pre-warming ek asli strategy hai.' },
        { text: 'Naya cross-continent TCP + TLS handshake', bin: 'hundreds', explain: 'Lagbhag <b>400 ms</b> — TCP ka 1 RTT + TLS 1.3 ka 1 RTT, aur har RTT ~200 ms. Purane TLS 1.2 par ek RTT aur: ~600 ms. Isliye connection pooling aur keep-alive itne bade jeet hain: pehli request ke baad handshake hai hi nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Paimane ke sawaal',
      questions: [
        {
          q: 'Estimate 2x galat nikla. Design par asar kaise jaanchoge?',
          choices: [
            'Dekho 2x se capacity, cost ya design ka faisla badalta hai ya nahi',
            '2x galti hai, toh design par farq padne ki jaanch ki zaroorat nahi',
            '20% se badi galti hai, toh har interview mein jawab fail hi hoga',
            'Digits exact hain, toh traffic aur size ki assumptions sahi hi hongi',
          ],
          answer: 0,
          explain: 'Estimation paimana samjhaati hai, par threshold ke paas 2x bhi design badal sakta hai. Assumptions likho, range dekh kar sensitivity jaancho. Decision badle toh number aur dhyaan se naapo.',
          choiceExplanations: [
            'Estimation paimana samjhaati hai, par threshold ke paas 2x bhi design badal sakta hai. Assumptions likho, range dekh kar sensitivity jaancho. Decision badle toh number aur dhyaan se naapo.',
            'Capacity ya budget ki seema paas ho toh 2x error maayne rakhta hai.',
            'Har question ka ek universal error cutoff nahi; tareeka aur justified assumptions zaroori hain.',
            'Sahi division galat traffic ya object-size assumption ko sahi nahi banaata.',
          ],
        },
        {
          q: 'Tumhara page 3 sequential cross-continent calls karta hai. Sabse bada sudhaar kya hai?',
          choices: [
            'Calls hataao, batch karo ya dependencies allow karein toh parallel karo',
            'Payload compress karo; propagation ka RTT bhi usi ratio mein ghatega',
            'CPU tez karo; door ke server tak signal pahunchne ka waqt hat jaayega',
            'JSON chhota karo; connection ke handshake round trips bhi hat jaayenge',
          ],
          answer: 0,
          explain: 'RTT dominant ho toh sequential round trips ghataana bada sudhaar de sakta hai. Payload aur CPU ka apna cost hai, par distance ka propagation delay rehta hai. Teen 130 ms serial RTTs ka model 390 ms hai; parallel tabhi jab calls independent hon.',
          choiceExplanations: [
            'RTT dominant ho toh sequential round trips ghataana bada sudhaar de sakta hai. Payload aur CPU ka apna cost hai, par distance ka propagation delay rehta hai. Teen 130 ms serial RTTs ka model 390 ms hai; parallel tabhi jab calls independent hon.',
            'Compression transfer cost ghata sakti hai, fixed propagation RTT ko usi ratio se nahi.',
            'Faster processing ke baad bhi network par signal ko distance tay karna hai.',
            'Payload size handshake count nahi chunta; reuse aur protocol ko alag jaancho.',
          ],
        },
        {
          q: '"CPU 10% hai par timeouts aa rahe hain." Little\'s Law se kya nikalta hai?',
          choices: [
            'Average in-flight ko pool limits se milao; wait spans bhi naapo',
            'Low CPU dekh kar network ko timeouts ki ek hi wajah maan lo',
            'L = lambda x W se exact blocked dependency ka naam mil jaayega',
            'Connections badha do; har pool mein throughput saath badhega',
          ],
          answer: 0,
          explain: 'Little\'s Law stable averages mein L = lambda x W deta hai; boundary aur units same rakho. Measured concurrency aur pool occupancy/wait se bottleneck jaancho. Law akela dependency ka naam nahi bataata; low CPU ke kai wait sources ho sakte hain.',
          choiceExplanations: [
            'Little\'s Law stable averages mein L = lambda x W deta hai; boundary aur units same rakho. Measured concurrency aur pool occupancy/wait se bottleneck jaancho. Law akela dependency ka naam nahi bataata; low CPU ke kai wait sources ho sakte hain.',
            'Locks, disk, pools aur downstream wait bhi low CPU ke saath timeouts laa sakte hain.',
            'Formula averages jodta hai; exact cause ke liye actual wait traces chahiye.',
            'Zyada connections DB contention badha sakte hain; backend capacity bhi jaancho.',
          ],
        },
        {
          q: 'Roz 1 PB naya data aata hai. Storage chunne ka sahi agla kadam kya hai?',
          choices: [
            'Object size, access, retention aur durability se store ka fit jaancho',
            '1 PB roz hai, toh har tarah ke database ko choice se hata do',
            'Daily bytes se provider chuno; requests aur egress ko count mat karo',
            'Hafte ka backup rakho; business ka acceptable data loss meet ho jaayega',
          ],
          answer: 0,
          explain: '1 PB/day bada volume hai, par storage object size aur access se bhi chunta hai. Media blobs ke liye object store aur metadata DB aam fit hain. Retention, durability, cost aur query needs benchmark se jaancho; count akela store tay nahi karta.',
          choiceExplanations: [
            '1 PB/day bada volume hai, par storage object size aur access se bhi chunta hai. Media blobs ke liye object store aur metadata DB aam fit hain. Retention, durability, cost aur query needs benchmark se jaancho; count akela store tay nahi karta.',
            'Kuch DB ya data engines aise workloads fit kar sakte hain; blanket ban ka saboot count nahi deta.',
            'Requests, egress, retention, operations aur durability bhi cost badalte hain.',
            'Backup interval business ke RPO aur log/recovery strategy se tay hota hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Roz ke volume se QPS do second mein nikaal sakte ho',
    'Chaar latency paimane dil se bata sakte ho',
    'Cross-region RTT ko physics ki seema maante ho, optimization ka target nahi',
    'Little\'s Law se concurrency, pool size aur server count nikaal sakte ho',
  ],
  homework: `Apni sabse busy service ke liye teen number likho: (1) roz kitne
    requests, (2) uska QPS (roz ÷ 100,000), (3) L = lambda x W se concurrency.
    Ab teesre number ko apne connection pool ke size se milao. Agar concurrency
    pool se badi hai, tumhare paas ek chhupi hui queue hai — aur ek din woh
    "CPU 10% par timeout" bankar saamne aayegi.`,
  cards: [
    { front: 'Roz ka volume se QPS ka shortcut?', back: '<b>1 din lagbhag 100,000 second.</b> Roz ka volume 1 lakh se divide karo. 1M/din ≈ 12/sec · 10M/din ≈ 120/sec · 1B/din ≈ 12,000/sec.' },
    { front: 'Estimation 2x galat — kitna bura?', back: 'Bilkul theek. Maqsad <b>paimana</b> hai. 40 vs 4,000 vs 400,000 writes/sec teen alag systems hain — un beech 100x ka farak hai. 2x tumhein usi bucket mein rakhta hai.' },
    { front: 'Cross-region RTT ka minimum?', back: '<code>2 × doori ÷ 200,000 km/s</code>. Mumbai↔Virginia (13,000 km) = <b>130 ms minimum</b>. Ilaaj sirf teen: call mat karo (cache), data paas laao (replicate), ya async kar do.' },
    { front: 'Chaar latency paimane?', back: '<b>&lt;1 ms</b>: memory (100 ns), SSD random (100 µs), same-AZ RTT (0.5 ms) · <b>1-10 ms</b>: cross-AZ, indexed row, 1 MB SSD sequential, 1 MB @ 1 Gbps (8 ms) · <b>10-100 ms</b>: disk seek, Mumbai↔Singapore · <b>100 ms+</b>: cross-continent RTT, cold start, naya TLS handshake.' },
    { front: 'Little\'s Law?', back: '<code>L = lambda × W</code>. 50,000 rps × 40 ms = <b>2,000 concurrent</b>. Pool 200 ka hua toh 1,800 queue mein khadi hain — aur queue mein khadi request <b>CPU nahi jalati</b>, isliye CPU 10% dikhta hai.' },
  ],
  interview: {
    title: 'Interview Round — Estimation',
    instructions: 'Har system design interview ka doosra kadam. 🎤',
    questions: [
      {
        q: '1 billion events/day se capacity ke baare mein kya keh sakte ho?',
        choices: [
          'Average ~11,574/s hai; peak, bytes aur write ka kaam naapo',
          '1 billion/day hai, toh Postgres ka fail hona pakka samjho',
          'Events ka QPS pata hai, toh Kafka zaroori hone ka nateeja nikaalo',
          'Shards jod do; durability aur recovery ka hisaab poora maan lo',
        ],
        answer: 0,
        explain: '1 billion ko 86,400 se baanto: lagbhag 11,574 events/s average. Peaks, bytes, indexes, batching, durability aur hardware capacity badalte hain. Representative workload se candidates naapo; QPS akela Postgres ya Kafka ka verdict nahi deta.',
        choiceExplanations: [
          '1 billion ko 86,400 se baanto: lagbhag 11,574 events/s average. Peaks, bytes, indexes, batching, durability aur hardware capacity badalte hain. Representative workload se candidates naapo; QPS akela Postgres ya Kafka ka verdict nahi deta.',
          'Postgres capacity query shape, batching, hardware aur durability par depend karti hai.',
          'Stream ya log ka fit retention aur consumers se bhi juda hai; event count se mandatory nahi hota.',
          'Shards ko bhi replication, backup aur failure contract chahiye.',
        ],
      },
      {
        q: 'Duniya bhar ke users ko 100 ms se kam latency deni hai. Design mein kya zaroori hoga?',
        choices: [
          'Sufficiently paas compute/data par request poori karo; guarantees bhi dekho',
          'HTTP/3 lagao; duniya bhar ka geographic delay protocol hata dega',
          '100 ms kahin bhi mumkin nahi; local users bhi 100 ms se tez nahi ho sakte',
          'CPU bahut tez rakho; ek door region se sab users ko target mil jaayega',
        ],
        answer: 0,
        explain: 'Door ke ek origin se kuch users ke liye WAN propagation hi 100 ms budget paar kar sakti hai. Paas cache, replica ya compute madad kar sakta hai; write consistency aur freshness ki shartein saath jaancho. Protocol distance nahi hataata.',
        choiceExplanations: [
          'Door ke ek origin se kuch users ke liye WAN propagation hi 100 ms budget paar kar sakti hai. Paas cache, replica ya compute madad kar sakta hai; write consistency aur freshness ki shartein saath jaancho. Protocol distance nahi hataata.',
          'HTTP/3 kuch handshake round trips bachaata hai; signal ki physical distance rehti hai.',
          'Local edge ya regional operation suitable request ko 100 ms se kam de sakta hai.',
          'CPU tez hone par bhi door ke users ka WAN RTT rehta hai.',
        ],
      },
    ],
  },
},

{
  id: 'vectors',
  icon: '🧬',
  title: 'Vector Search — RAG ke neeche ka system',
  badge: 'Vector Vaidya',
  objectives: [
    'ANN kya hai — aur "approximate" ka asli matlab',
    'HNSW ke teen knob: M, efConstruction, efSearch',
    'Quantization:raw payload savings vs measured quality,total memory separately',
    'RAG ka asli bottleneck retrieval hai, model nahi',
  ],
  lesson: [
    `<h3>🧬 Vector search ek nayi cheez nahi hai — ek nayi query hai</h3>
     <p>Normal database poochhta hai: <b>"jiska user_id = 7 ho"</b>. Vector
     database poochhta hai: <b>"jo is point ke sabse paas ho"</b>. Query ka
     aakaar badalte hi index ka aakaar bhi badal jaata hai — B-tree yahan
     bekaar hai, kyunki 768 dimensions mein "sorted order" jaisi koi cheez
     hai hi nahi.</p>
     <pre>Text  →  embedding model  →  768 numbers ka ek vector
Query →  embedding model  →  768 numbers ka ek vector
Match →  jinke vectors sabse paas hain (cosine ya dot product)</pre>
     <h3>🎯 "Approximate" ka matlab kya hai</h3>
     <p>Exact nearest neighbour nikalne ke liye har vector se doori naapni padegi
     — 10 crore vectors par har query <b>10 crore</b> comparisons. Isliye asli
     systems <b>ANN</b> (Approximate Nearest Neighbour) use karte hain:
     99% sahi jawab, 1000x kam kaam mein.</p>
     <table>
       <tr><th>Tareeka</th><th>Kaise</th><th>Kab</th></tr>
       <tr><td><b>Flat</b> (brute force)</td><td>har vector se doori</td><td>10 lakh se kam vectors — aur 100% recall chahiye</td></tr>
       <tr><td><b>IVF</b></td><td>vectors ko clusters mein baanto, sirf paas ke clusters dekho</td><td>memory kam chahiye, index build tez chahiye</td></tr>
       <tr><td><b>HNSW</b></td><td>ek layered graph — upar lambi chhalaang, neeche chhote kadam</td><td>sabse aam chunav: sabse achhi recall-vs-latency</td></tr>
     </table>
     <p class="tip">🎯 HNSW ko samajhne ka sabse aasan tareeka: woh ek
     <b>skip list</b> hai jo graph ban gaya. Sabse upar wali layer mein bahut kam
     points hain aur unke beech lambe links — isliye search wahan se "zoom in"
     karti hai. Har neeche wali layer mein points zyada aur links chhote.
     Aakhri layer par tumhara jawab hai.</p>`,
    `<h3>🎛️ Teen knob jo sab kuch tay karte hain</h3>
     <table>
       <tr><th>Knob</th><th>Kaam</th><th>Badhane par</th></tr>
       <tr><td><b>M</b></td><td>har node ke kitne neighbours</td><td>recall behtar · <b>memory bahut zyada</b> · latency par kam asar</td></tr>
       <tr><td><b>efConstruction</b></td><td>index BANATE waqt kitne candidates</td><td>recall behtar · index build dheema · graph quality se search recall/effort par indirect asar</td></tr>
       <tr><td><b>efSearch</b></td><td>SEARCH ke waqt kitne candidates</td><td>recall behtar · <b>latency seedhi badhti hai</b></td></tr>
     </table>
     <p>Sabse zaroori farak: <b>efConstruction</b> ek baar ka kharcha hai (index
     banate waqt), <b>efSearch</b> har query ka kharcha hai. Isliye
     efConstruction udaar dil se bada rakho, aur efSearch ko latency budget ke
     hisaab se tune karo.</p>
     <h3>🗜️ Quantization — memory ka asli hal</h3>
     <p>10 crore vectors × 768 dimensions × 4 bytes (float32) = <b>307 GB</b>,
     sirf vectors ke liye. Graph ka overhead alag. Yeh RAM mein rakhna mehenga hai.</p>
     <pre>float32   768 × 4 = 3,072 bytes/vector    →  307 GB   ·  recall baseline
int8      768 × 1 =   768 bytes/vector    →   77 GB   ·  recall change workload par benchmark karo
binary    768 ÷ 8 =    96 bytes/vector    →   10 GB   ·  recall bahut kam</pre>
     <p class="tip">🎯 Binary quantization akela istemaal nahi hota — usse
     <b>rerank</b> ke saath jodte hain: binary se 1000 candidates tez nikalo,
     phir un 1000 ko float32 se dobara score karo. Raw binary vector payload 32x smaller hai; graph, metadata aur retained float vectors extra RAM lete hain. Candidate recall final quality bound karti hai; rerank missing candidate recover nahi karta.</p>
     <h3>🐌 RAG ka asli bottleneck</h3>
     <p>Log samajhte hain ki RAG mein waqt LLM leta hai. Naapo toh alag tasveer
     milti hai: <b>embedding</b> (10-30 ms) + <b>vector search</b> (5-50 ms) +
     <b>rerank</b> (50-200 ms) + <b>LLM first token</b> (200-800 ms). Rerank aksar
     search se <b>zyada</b> mehenga hota hai, aur usi par sabse kam dhyan jaata hai.</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'HNSW tuning — teen knob, teen seemayein',
      instructions: 'Knobs ghumao. Recall, latency aur RAM — teenon ek saath badalte hain.',
      goal: "Recall <b>95% ya zyada</b>, p99 latency <b>10 ms ya kam</b>, aur index RAM <b>120 GB ya kam</b> rakho.",
      scenario: `<b>10 crore</b> documents, har ek 768-dimension ka vector.
        Product ki shart: search p99 <b>10 ms</b> se kam, recall <b>95%+</b>,
        aur index ek hi machine group mein aana chahiye — yaani <b>120 GB</b> se kam RAM.`,
      knobs: [
        { id: 'M', label: 'M — har node ke neighbours', min: 4, max: 64, step: 4, value: 8, unit: '',
          note: 'Bada M recall badhata hai par graph ka memory overhead seedha badhta hai.' },
        { id: 'ef', label: 'efSearch — search ke waqt candidates', min: 10, max: 500, step: 10, value: 10, unit: '',
          note: 'Har query ka kharcha. Recall aur latency dono isse seedhe jude hain.' },
        { id: 'q', label: 'Quantization (0 = float32, 1 = int8, 2 = binary)', min: 0, max: 2, step: 1, value: 0, unit: '',
          note: 'float32 = 3072 bytes/vector · int8 = 768 · binary = 96.' },
      ],
      readouts: k => {
        const m = vecModel(k);
        return [
          { label: 'Recall', value: m.recall.toFixed(1) + '%', tone: m.recall >= 95 ? 'ok' : m.recall >= 90 ? 'warn' : 'bad' },
          { label: 'p99 latency', value: m.lat.toFixed(1) + ' ms', tone: m.lat <= 10 ? 'ok' : m.lat <= 20 ? 'warn' : 'bad' },
          { label: 'Index RAM', value: m.gb.toFixed(0) + ' GB', tone: m.gb <= 120 ? 'ok' : m.gb <= 250 ? 'warn' : 'bad' },
          { label: 'RAM ka mahina kharcha (mota anumaan)', value: '$' + Math.round(m.gb * 5).toLocaleString(), tone: m.gb * 5 <= 600 ? 'ok' : 'warn' },
        ];
      },
      bars: k => {
        const m = vecModel(k);
        return [
          { label: 'Recall (target 95%)', pct: Math.max(0, Math.min(100, m.recall)), text: m.recall.toFixed(1) + '%', tone: m.recall >= 95 ? 'ok' : 'bad' },
          { label: 'Latency (budget 10 ms)', pct: Math.min(100, (m.lat / 25) * 100), text: m.lat.toFixed(1) + ' ms', tone: m.lat <= 10 ? 'ok' : 'bad' },
          { label: 'RAM (budget 120 GB)', pct: Math.min(100, (m.gb / 350) * 100), text: m.gb.toFixed(0) + ' GB', tone: m.gb <= 120 ? 'ok' : 'bad' },
        ];
      },
      verdict: k => {
        const m = vecModel(k);
        const bad = [];
        if (m.recall < 95) bad.push(`recall <b>${m.recall.toFixed(1)}%</b> hai (chahiye 95%+) — efSearch badhao ya M badhao`);
        if (m.lat > 10) bad.push(`p99 <b>${m.lat.toFixed(1)} ms</b> hai (budget 10 ms) — efSearch ghatao ya quantization chalu karo`);
        if (m.gb > 120) bad.push(`index <b>${m.gb.toFixed(0)} GB</b> le raha hai (budget 120 GB) — quantization hi is number ko sach mein ghataata hai`);
        if (!bad.length) return { ok: true, text: `M=<b>${k.M}</b>, efSearch=<b>${k.ef}</b>, ${['float32', 'int8', 'binary'][k.q]} — recall ${m.recall.toFixed(1)}%, p99 ${m.lat.toFixed(1)} ms, RAM ${m.gb.toFixed(0)} GB. Teenon shart poori.` };
        return { ok: false, text: bad.join(' &nbsp;·&nbsp; ') };
      },
      check: k => { const m = vecModel(k); return m.recall >= 95 && m.lat <= 10 && m.gb <= 120; },
      lesson: `🎯 Teen knob, par woh teen alag cheezein control karte hain — aur
        yahi is lab ka poora sabak hai. <b>efSearch</b> recall aur latency ka
        tradeoff hai (har query par). <b>M</b> recall aur memory ka tradeoff hai.
        <b>Quantization</b> akela aisa knob hai jo <b>RAM ko sach mein</b> ghataata
        hai — M ya efSearch ghatane se RAM par lagbhag koi asar nahi padta.
        Isliye jab RAM budget toote, sabse pehle quantization dekho; jab latency
        budget toote, sabse pehle efSearch dekho. Galat knob ghumana sabse aam
        galti hai.`,
      quiz: {
        q: 'Index RAM se bada hai aur recall 97% hai. Pehli memory optimization kaise chunoge?',
        choices: [
          'Vector, graph aur metadata ka RAM naapo; quantization ki recall test karo',
          'Int8 se recall bas 1% ghategi; 97% starting score kaafi proof hai',
          'efSearch ghataao; stored graph ka size bhi seedha chaar guna ghatega',
          'Quality budget jaane bina shard kar do; compression ko check mat karo',
        ],
        answer: 0,
        explain: 'Float32 se int8 raw vector payload 4 se 1 byte/dimension hota hai. Total RAM mein graph, metadata aur retained float copies bhi hain. Recall loss measure karo; quantization, M aur shards ko quality/latency budget se milao.',
        choiceExplanations: [
          'Float32 se int8 raw vector payload 4 se 1 byte/dimension hota hai. Total RAM mein graph, metadata aur retained float copies bhi hain. Recall loss measure karo; quantization, M aur shards ko quality/latency budget se milao.',
          'Recall loss data, model aur queries par depend karta hai; 1% guarantee nahi.',
          'efSearch search work aur temporary memory badal sakta hai; stored graph ko 4x chhota nahi karta.',
          'Sharding valid ho sakti hai, par memory components aur quality budget se cheaper option bhi mil sakta hai.',
        ],
      },
    },
    {
      type: 'match',
      title: 'Vector search ki shabdavali',
      instructions: 'Har shabd ko uske asli matlab se milao.',
      pairs: [
        { left: 'Recall@10', right: 'Top-10 jawabon mein se kitne SACH mein sabse paas wale the — ANN ka asli quality metric', explain: 'Latency ke bina recall bekaar hai aur recall ke bina latency jhoothi hai. Vector system ki har baat in dono ke jode mein hoti hai.' },
        { left: 'efSearch', right: 'Search ke waqt kitne candidates dekhe jaate hain — har query ka kharcha, latency par seedha asar', explain: 'Production mein tum efSearch hi badalte ho. Latency budget toote toh sabse pehle efSearch dekho.' },
        { left: 'efConstruction', right: 'Index BANATE waqt kitne candidates — ek baar ka kharcha, search par koi asar nahi', explain: 'Isko udaar dil se bada rakho. Index build ek baar hota hai; recall hamesha ke liye behtar ho jaati hai.' },
        { left: 'Quantization', right: 'Har vector ko kam bytes mein rakhna (float32 → int8 → binary) — RAM par sabse bada asar', explain: "Raw vector bytes int8 mein 4x, binary mein 32x shrink ho sakte hain. Graph M, metadata, precision copies aur sharding bhi memory budget affect karte hain." },
        { left: 'Reranking', right: 'ANN se laaye gaye candidates ko ek mehenge, sahi model se dobara score karna', explain: 'Yahi binary quantization ko istemaal laayak banata hai: binary se 1000 candidates tez nikalo, phir un 1000 ko float32 ya cross-encoder se rerank karo.' },
        { left: 'Hybrid search', right: 'Vector similarity aur keyword (BM25) dono ka natija milana', explain: 'Vector search "matlab" pakadta hai par exact naam, product code aur rare shabd chhod deta hai. Zyadatar asli systems dono chalate hain.' },
        { left: 'IVF', right: 'Vectors ko clusters mein baantna aur sirf paas ke clusters mein dhoondhna', explain: 'HNSW se kam memory leta hai aur index build tez hai, par usi recall par latency aksar zyada hoti hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Vector systems ke faisle',
      questions: [
        {
          q: 'RAG ke liye 5 lakh vectors hain. Index kaise chunoge?',
          choices: [
            'Flat ko exact baseline banao; ANN se quality, latency aur QPS milao',
            '5 lakh vectors hain, toh exact search har machine par 1 ms mein hogi',
            'HNSW chuno; approximate graph bhi 100% recall ka vaada deta hai',
            'IVF chuno; clusters ke liye training ya search settings ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'Flat chosen metric par exact nearest neighbors ka baseline hai. 5 lakh vectors par time dimension, hardware, batching aur concurrency se badlega. ANN aur Flat ko representative queries se naapo; count se fixed winner nahi nikalta.',
          choiceExplanations: [
            'Flat chosen metric par exact nearest neighbors ka baseline hai. 5 lakh vectors par time dimension, hardware, batching aur concurrency se badlega. ANN aur Flat ko representative queries se naapo; count se fixed winner nahi nikalta.',
            'Data dimension, hardware aur concurrent load runtime badalte hain.',
            'HNSW approximate hai; recall exact baseline ke against measure karni hai.',
            'IVF mein coarse clusters train karte hain aur search par probe settings tune karte hain.',
          ],
        },
        {
          q: 'Product codes ki search kharab hai. Pehli useful jaanch kya hogi?',
          choices: [
            'Exact code matching aur vector results milao; indexed data aur filters jaancho',
            'Product code miss hua, toh embedding model chhota hone ka proof hai',
            'efSearch badhao; har exact token ki representation khud theek ho jaayegi',
            'Index purana hai, toh relevance failure ka ek hi cause pakka ho gaya',
          ],
          answer: 0,
          explain: 'Product codes ke liye lexical-plus-vector hybrid search useful hypothesis hai. Pehle document index mein hai, filters sahi hain aur code ka token match hota hai ya nahi, jaancho. Poor results akele sirf-vector root cause prove nahi karte.',
          choiceExplanations: [
            'Product codes ke liye lexical-plus-vector hybrid search useful hypothesis hai. Pehle document index mein hai, filters sahi hain aur code ka token match hota hai ya nahi, jaancho. Poor results akele sirf-vector root cause prove nahi karte.',
            'Model size ke alawa token representation, filters aur retrieval settings bhi cause ho sakte hain.',
            'Zyada search effort embedding mein missing distinction wapas nahi banaata.',
            'Freshness, membership, token handling aur ranking ko alag jaancho.',
          ],
        },
        {
          q: 'RAG pipeline ka p99 3 second hai. Sabse pehle kya naapoge?',
          choices: [
            'Embedding, search, rerank aur generation ke timings aur queues alag naapo',
            'LLM ka size dekho; model size hi critical-path delay pakka bataata hai',
            'Vector search ko cause maano; har RAG pipeline mein wahi dominant hota hai',
            'Network RTT ko cause maano; 3-second tail ka doosra source nahi hota',
          ],
          answer: 0,
          explain: 'Har stage ko trace karo, saath mein queue time aur end-to-end tail bhi naapo. Rerank mehenga ho sakta hai; generation ya doosri dependency bhi dominant ho sakti hai. Example timings universal p99 budget nahi hain.',
          choiceExplanations: [
            'Har stage ko trace karo, saath mein queue time aur end-to-end tail bhi naapo. Rerank mehenga ho sakta hai; generation ya doosri dependency bhi dominant ho sakti hai. Example timings universal p99 budget nahi hain.',
            'Size se akeli latency nahi milti; serving load, queues aur token counts bhi maayne rakhte hain.',
            'Alag pipelines mein generation, embedding, search ya rerank ka kharcha badalta hai.',
            'CPU/GPU queues, locks aur downstream wait bhi long tail bana sakte hain.',
          ],
        },
        {
          q: 'Binary retrieval ke baad float rerank ka sahi tradeoff kya hai?',
          choices: [
            'Binary candidates ko rerank karo; candidate recall aur total RAM naapo',
            'Rerank se missing documents wapas aayenge; candidates ka recall chhod do',
            'Binary se poore system ki RAM 32x ghategi; float copies bhi rehne do',
            'Binary se full recall pakki hai; compression ke quality tests hata do',
          ],
          answer: 0,
          explain: 'Binary candidate generation aur precise rerank useful tradeoff ho sakta hai. Rerank sirf retrieved candidates ko score karta hai; missing neighbor laa nahi sakta. 32x raw vector bytes ka ratio hai, total graph-plus-float memory ka nahi.',
          choiceExplanations: [
            'Binary candidate generation aur precise rerank useful tradeoff ho sakta hai. Rerank sirf retrieved candidates ko score karta hai; missing neighbor laa nahi sakta. 32x raw vector bytes ka ratio hai, total graph-plus-float memory ka nahi.',
            'Candidate set mein document nahi hai toh reranking se document result mein nahi aa sakta.',
            'Graph, metadata aur float copies rakhne par total saving raw payload se kam ho sakti hai.',
            'Compression information ghataati hai; quality workload par measure karni hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'ANN aur exact search ka farak aur unka break-even bata sakte ho',
    'HNSW ke teen knob aur unke alag-alag tradeoffs jaante ho',
    'Quantization + rerank wala do-charan aakaar samjha sakte ho',
    'RAG pipeline ko kadam-dar-kadam naapte ho, anumaan nahi lagate',
  ],
  homework: `Agar tumhare paas koi vector search chal raha hai, teen number nikalo:
    index ka RAM, p99 search latency, aur recall@10. Agar recall ka number kisi
    ke paas nahi hai, wahi sabse zaroori kaam hai — bina recall ke latency ka
    number jhootha hai, kyunki khaali jawab hamesha tez aata hai.`,
  cards: [
    { front: 'HNSW kya hai, ek line mein?', back: 'Ek <b>skip list jo graph ban gaya</b>. Upar ki layers mein kam points aur lambe links (zoom in), neeche ki layers mein zyada points aur chhote links. Search upar se shuru hoti hai aur neeche jawab par khatam.' },
    { front: 'M vs efConstruction vs efSearch?', back: '<b>M</b> = neighbours per node (recall ↑, <b>memory ↑↑</b>) · <b>efConstruction</b> = build-time candidates (<b>ek baar</b> ka kharcha) · <b>efSearch</b> = search-time candidates (<b>har query</b> ka kharcha, latency ↑).' },
    { front: 'RAM budget toot raha hai — kaunsa knob?', back: '<b>Quantization.</b> float32 3072 B → int8 768 B (4x) → binary 96 B (32x) per 768-dim vector. M ghatana sirf graph overhead (M×8 B) chhoota hai; efSearch ka RAM par asar hai hi nahi.' },
    { front: 'Binary quantization akela kyun nahi?', back: "Recall bahut girti hai. Isliye <b>do charan</b>: binary se bahut saare candidates tez nikalo → un candidates ko float32/cross-encoder se <b>rerank</b> karo. Raw payload 32x smaller; total memory and candidate recall measure karo. Rerank missing candidate restore nahi karta." },
    { front: 'Vector search ka blind spot?', back: '<b>Exact tokens</b> — model number, SKU, error code, naam. Vectors <b>matlab</b> pakadte hain, isliye "iPhone 15" aur "iPhone 14" unke liye lagbhag ek hain. Ilaaj: <b>hybrid search</b> (vector + BM25).' },
    { front: 'RAG ka chhupa hua bottleneck?', back: '<b>Rerank</b> — aksar 50-200 ms, jo vector search (5-50 ms) se zyada hai. Har kadam alag naapo: embedding, search, rerank, LLM first token.' },
  ],
  interview: {
    title: 'Interview Round — Vector search',
    instructions: 'Yeh sawaal ab lagbhag har AI product team ke round mein hai. 🎤',
    questions: [
      {
        q: '10 crore vectors aur p99 target 50 ms hai. Design kaise shuru karoge?',
        choices: [
          'QPS, filters aur recall target lekar indexes, compression aur shards naapo',
          'Koi HNSW config lagao; 10 crore vectors par 50 ms p99 mil hi jaayega',
          'GPU Flat chuno; hardware se har concurrency par budget poora hoga',
          'Saare documents context mein do; retrieval ka quality budget khatam hoga',
        ],
        answer: 0,
        explain: 'Dimension, QPS, filters, hardware aur recall target saaf karo. ANN, compression, partitioning aur lexical matching ke candidates benchmark karo. Candidate recall aur end-to-end latency saath dekho; ek HNSW recipe har case nahi jeetti.',
        choiceExplanations: [
          'Dimension, QPS, filters, hardware aur recall target saaf karo. ANN, compression, partitioning aur lexical matching ke candidates benchmark karo. Candidate recall aur end-to-end latency saath dekho; ek HNSW recipe har case nahi jeetti.',
          'HNSW latency settings, data distribution, QPS aur filters par depend karti hai.',
          'Full scan cost vectors, dimensions aur concurrent queries se badhta hai.',
          'Context size, cost aur relevance ke liye retrieval aur selection chahiye.',
        ],
      },
      {
        q: 'Vector index 300 GB hai. Compression ya sharding kaise chunoge?',
        choices: [
          'Memory ke parts alag naapo; recall, latency aur cost se dono compare karo',
          'Int8 karo; total 300 GB ka index pakka 75 GB mein aa jaayega',
          'Compression pehle karo; sharding har setup mein zyada mehengi hoti hai',
          'Dimensions seedhi kaato; har embedding ki quality same bani rahegi',
        ],
        answer: 0,
        explain: 'Vector payload, graph, IDs, metadata aur rerank copies ka RAM alag naapo. Phir representative queries par quality, latency aur cost dekho. Compression aur sharding ka fit implementation aur requirements se tay hota hai.',
        choiceExplanations: [
          'Vector payload, graph, IDs, metadata aur rerank copies ka RAM alag naapo. Phir representative queries par quality, latency aur cost dekho. Compression aur sharding ka fit implementation aur requirements se tay hota hai.',
          'Raw vector payload 4x chhota ho sakta hai; graph aur retained data wahi reh sakte hain.',
          'Quality requirements, hardware aur index capabilities se sharding better bhi ho sakti hai.',
          'Dimension reduction ko compatible model/projection aur quality evaluation chahiye.',
        ],
      },
    ],
  },
},
]);

/* HNSW ka mota model — asli curves ke aakaar par bana hai, exact benchmark nahi.
   10 crore vectors, 768 dimensions. */
function vecModel(k) {
  const N = 100e6, DIM = 768;
  const bytesPerVec = [DIM * 4, DIM * 1, DIM / 8][k.q];      /* float32 | int8 | binary */
  const gb = (N * (bytesPerVec + k.M * 8)) / 1e9;            /* vectors + graph neighbours */
  let recall = 100 - 25 * Math.pow(k.ef, -0.45);             /* efSearch ka asar */
  recall -= Math.max(0, 16 - k.M) * 1.2;                     /* chhota M recall todta hai */
  recall -= [0, 1.5, 12][k.q];                               /* quantization ka nuksaan */
  const latMul = [1, 0.7, 0.35][k.q];                        /* kam bytes = tez distance */
  const lat = 0.15 * Math.pow(k.ef, 0.7) * (1 + k.M / 64) * latMul;
  return { gb, recall: Math.max(0, Math.min(100, recall)), lat };
}

})();

/* =====================================================================
   F8 — Multi-region: physics ke saath sauda
   F9 — Progressive rollout: canary ka ganit
   F10 — Cost per request: har design faisle ka bill
   ===================================================================== */
(function () {
SD.registerLevels('feed', [
{
  id: 'multiregion',
  icon: '🌍',
  title: 'Multi-Region — physics ke saath sauda',
  badge: 'Region Rachnakar',
  objectives: [
    '"Active-active" ke teen bilkul alag matlab',
    'Cross-region quorum ka asli daam: har write par ek poora RTT',
    'Regional-by-row: tez BHI aur strong BHI — par sirf single-home data par',
    'Region girne par kya hota hai — aur kis design mein kya bacha rehta hai',
  ],
  lesson: [
    `<h3>🌍 "Active-active" ek shabd hai, teen alag systems hain</h3>
     <p>Jab koi kahe "hamara system multi-region active-active hai", teen bilkul
     alag cheezon mein se koi ek ho sakti hai — aur teenon ke tradeoffs alag hain.</p>
     <table>
       <tr><th>Aakaar</th><th>Write kahan</th><th>Consistency</th><th>Region girne par</th></tr>
       <tr><td><b>Ek global primary</b></td><td>hamesha ek hi region</td><td>strong</td><td>writes <b>band</b> jab tak failover na ho</td></tr>
       <tr><td><b>Cross-region quorum</b><br><small>(Spanner, CockroachDB)</small></td><td>majority regions ki ack</td><td>strong</td><td>chalta rehta hai (3+ regions par)</td></tr>
       <tr><td><b>Regional-by-row</b><br><small>(har row ka apna home region)</small></td><td>us row ke home region mein</td><td>strong <b>us row ke liye</b></td><td>sirf us region ke rows ruke</td></tr>
       <tr><td><b>Async multi-primary</b></td><td>har region local</td><td><b>eventual</b> + conflicts</td><td>chalta rehta hai</td></tr>
     </table>
     <h3>⏱️ Quorum ka asli daam</h3>
     <p>Cross-region quorum ka matlab hai ki har write ko majority regions se ack
     chahiye. Yaani har write mein <b>kam se kam ek poora inter-region RTT</b> hai.</p>
     <pre>Teen regions ek hi continent par (~30 ms RTT):
   write p99  =  local kaam (5 ms)  +  30 ms  =  ~35 ms       theek hai

Teen regions duniya bhar mein (~130 ms RTT):
   write p99  =  5 ms  +  130 ms  =  ~135 ms                  bahut zyada</pre>
     <p class="tip">🎯 Yahi wajah hai ki asli global systems <b>quorum ko ek
     continent ke andar rakhte hain</b> aur continents ke beech async replication
     use karte hain. Duniya bhar ka synchronous quorum kaagaz par sundar hai aur
     production mein har write par 130 ms hai.</p>`,
    `<h3>📍 Regional-by-row — sabse kam samjha jaane wala hal</h3>
     <p>Sabse achha jawab aksar "poore database ko multi-region banao" nahi hota.
     Sabse achha jawab hota hai: <b>har row ko ek home region do</b>.</p>
     <pre>user_id 7  →  home region: ap-south-1 (Mumbai)
user_id 9  →  home region: us-east-1  (Virginia)

Mumbai ka user apna data Mumbai se padhta aur likhta hai  →  5 ms, strong
Virginia ka user apna data Virginia se                     →  5 ms, strong
Mumbai gira  →  sirf Mumbai wale rows ruke, Virginia chalta raha</pre>
     <p>Home-region transaction low latency strong ho sakti hai <b>when required quorum local ho</b>.Region-survival replicas,global constraints aur cross-region transactions WAN coordination addkar sakte hain;regional-by-row label guarantee nahi.</p>
     <p class="tip">🎯 Keemat kahan hai? Do jagah. <b>Ek:</b> jo data kisi ek user
     ka nahi hai (global config, product catalog, leaderboard) usko alag treat
     karna padta hai — "global table" banakar, jahan writes dheeme aur reads har
     jagah tez hote hain. <b>Do:</b> aisi query jo kai regions ke rows ek saath
     maange (jaise "saare countries ka total") ab ek cross-region fan-out hai.</p>
     <h3>🧭 Faisle ka sahi kram</h3>
     <pre>1. Kya data user-wise BAANTA ja sakta hai?     → haan: regional-by-row
2. Kya woh data har jagah ek jaisa chahiye?    → global table with explicit freshness/write-quorum contract
3. Kya writes ko strong + multi-region chahiye? → quorum, PAR ek continent mein
4. Kya stale read chalega?                     → local replica se padho, sabse tez</pre>
     <p>Zyadatar teams kadam 3 se shuru karti hain, aur wahi sabse mehenga kadam hai.</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Multi-region ka sauda',
      instructions: 'Chaar knob ghumao. Har combination ka apna latency, availability aur staleness hai.',
      goal: "Write p99 <b>50 ms ya kam</b>, read p99 <b>20 ms ya kam</b>, aur kisi ek poore region ke outage ke baad <b>50% se zyada users</b> likh sakein. Model mein users home regions mein barabar bante hain.",
      scenario: `Teaching model:users selected regions mein barabar distributed hain.
        Har user apne home-region rows padhta/likhta hai. Regional-by-row mode mein
        quorum home region ke andar hai;home-region outage par us region ke rows unavailable
        hain. Production region-survival quorum/global constraints WAN coordination add kar sakte hain.`,
      knobs: [
        { id: 'regions', label: 'Kitne regions', min: 1, max: 5, step: 1, value: 1, unit: '',
          note: 'Zyada regions = zyada availability, par quorum ka RTT bhi badta hai.' },
        { id: 'spread', label: 'Phailav (0 = ek continent, 1 = duniya bhar)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Ek continent ka inter-region RTT ~30 ms; duniya bhar ka ~130 ms.' },
        { id: 'write', label: 'Write strategy (0 = ek global primary, 1 = cross-region quorum, 2 = regional-by-row)', min: 0, max: 2, step: 1, value: 0, unit: '',
          note: 'Regional-by-row: har row ka apna home region — is lab ke zone-survival/home-region-only model meincommon writes local;region-survival orcrossregiontransactions require coordination.' },
        { id: 'read', label: 'Read strategy (0 = primary se strong, 1 = local replica se)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Local replica sabse tez hai, par data thoda purana ho sakta hai.' },
      ],
      readouts: k => {
        const m = mrModel(k);
        return [
          { label: 'Write p99', value: Math.round(m.write) + ' ms', tone: m.write <= 50 ? 'ok' : m.write <= 100 ? 'warn' : 'bad' },
          { label: 'Read p99', value: Math.round(m.read) + ' ms', tone: m.read <= 20 ? 'ok' : m.read <= 60 ? 'warn' : 'bad' },
          { label: 'Ek region gira toh', value: m.survive === 'yes' ? 'sab likhte rahenge' : m.survive === 'partial' ? 'sirf us region ke users ruke' : 'writes BAND', tone: m.survive === 'yes' ? 'ok' : m.survive === 'partial' ? 'warn' : 'bad' },
          { label: 'Read kitna purana ho sakta hai', value: m.stale ? '~' + m.stale + ' ms' : 'bilkul taaza', tone: m.stale ? 'warn' : 'ok' },
        ];
      },
      bars: k => {
        const m = mrModel(k);
        return [
          { label: 'Write p99 (budget 50 ms)', pct: Math.min(100, (m.write / 160) * 100), text: Math.round(m.write) + ' ms', tone: m.write <= 50 ? 'ok' : 'bad' },
          { label: 'Read p99 (budget 20 ms)', pct: Math.min(100, (m.read / 160) * 100), text: Math.round(m.read) + ' ms', tone: m.read <= 20 ? 'ok' : 'bad' },
          { label: 'Inter-region RTT', pct: Math.min(100, (m.rtt / 160) * 100), text: m.rtt + ' ms', tone: m.rtt <= 40 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = mrModel(k);
        const bad = [];
        if (m.write > 50) bad.push(`write p99 <b>${Math.round(m.write)} ms</b> hai — ${k.write === 1 ? 'cross-region quorum har write par ek poora RTT jodta hai' : 'remote users ko global primary tak jaana padta hai'}`);
        if (m.read > 20) bad.push(`read p99 <b>${Math.round(m.read)} ms</b> hai — strong read primary se aata hai, aur primary door hai`);
        if (m.survive === 'no') bad.push(k.regions < 3 && k.write === 1 ? 'quorum ke liye kam se kam <b>3 regions</b> chahiye' : 'ek region girte hi <b>writes band</b> ho jaayenge');
        if (m.survive === 'partial' && k.regions < 3) bad.push('2 equal regions mein ek outage ke baad sirf50%users bachte hain;goal majority ka hai,so kam se kam3home regions chahiye');
        if (!bad.length) {
          const names = ['ek global primary', 'cross-region quorum', 'regional-by-row'];
          return { ok: true, text: `<b>${k.regions} regions</b> ${k.spread ? 'duniya bhar mein' : 'ek continent par'}, ${names[k.write]}, reads ${k.read ? 'local replica se' : 'primary se strong'} — write ${Math.round(m.write)} ms, read ${Math.round(m.read)} ms, aur ek region girne par ${m.survive === 'yes' ? 'sab' : 'zyadatar'} users likhte rahenge.` };
        }
        return { ok: false, text: bad.join(' &nbsp;·&nbsp; ') };
      },
      check: k => { const m = mrModel(k); return m.write <= 50 && m.read <= 20 && (m.survive === 'yes' || (m.survive === 'partial' && k.regions >= 3)); },
      lesson: `🎯 Is lab mein ek se zyada jeetne wale raaste hain, aur wahi asli
        sabak hai. <b>Regional-by-row</b> duniya bhar phaile hue regions par bhi
        given labassumptions ke andarhome-region writeslocal aurstrong hain;home-region outageaffectedrows stopkarti hai.Production mein survivalgoal/quorum/globalconstraints secoordination differkarti hai.
        <b>Cross-region quorum</b> bhi jeet sakta hai, par sirf tab jab regions
        <b>ek hi continent</b> par hon — duniya bhar ka quorum har write par
        130 ms hai. Aur <b>ek global primary</b> kabhi nahi jeetta: woh region
        girte hi saare writes band kar deta hai.`,
      quiz: {
        q: 'Duniya bhar se same data par strong writes 20 ms mein chahiye. Kya tradeoff samjhaaoge?',
        choices: [
          'Same data ki remote coordination WAN path ka waqt le sakti hai',
          'Row ka home region hai, toh duniya bhar mein 20 ms writes pakki hain',
          'Spanner chuno, toh required cross-planet coordination ka delay hat jaata hai',
          'Strong consistency kisi global system mein mil hi nahi sakti',
        ],
        answer: 0,
        explain: 'Strong write ko jitne remote participants chahiye, path ka network aur protocol cost dena padega. Row locality local access madad karti hai; region survival aur cross-region transaction phir bhi WAN ACK maang sakte hain. Same contended data par worldwide 20 ms guaranteed nahi.',
        choiceExplanations: [
          'Strong write ko jitne remote participants chahiye, path ka network aur protocol cost dena padega. Row locality local access madad karti hai; region survival aur cross-region transaction phir bhi WAN ACK maang sakte hain. Same contended data par worldwide 20 ms guaranteed nahi.',
          'Home region local users ko paas laata hai; har location ya survival goal ka same latency vaada nahi.',
          'Spanner ki strong consistency remote voting aur propagation ko muft nahi banaati.',
          'Strong consistency mumkin hai, par latency aur availability tradeoffs ke saath.',
        ],
      },
    },
    {
      type: 'bins',
      title: 'Kaunsa data kis strategy mein?',
      instructions: 'Har tarah ke data ko uski sahi multi-region strategy mein daalo.',
      bins: [
        { id: 'regional', label: '📍 Regional-by-row (home region)' },
        { id: 'global', label: '🌐 Global table (har jagah replica)' },
        { id: 'local', label: '🏠 Sirf local (replicate hi mat karo)' },
      ],
      items: [
        { text: 'User ka profile aur user ki settings', bin: 'regional', explain: 'Ek user ka data lagbhag hamesha ek hi user padhta aur likhta hai. Home region dena isko <b>tez aur strong</b> dono bana deta hai.' },
        { text: 'Kisi user ke orders aur orders ki history', bin: 'regional', explain: 'Wahi tark — order ka maalik ek user hai, aur user ek region mein hai. Order ka home region user ka home region hai.' },
        { text: 'Ek chat room ke messages', bin: 'regional', explain: 'Room ko ek home region do (aam taur par jahan zyadatar members hain). Members alag regions se aayenge, par sabhi ek hi jagah likhenge — isliye ordering saaf rehti hai.' },
        { text: 'Product catalog aur products ke daam', bin: 'global', explain: 'Bahut zyada padha jaata hai, bahut kam likha jaata hai, aur har jagah <b>ek jaisa</b> chahiye. Write dheema ho toh chalega; read har region mein tez hona chahiye.' },
        { text: 'Feature flags aur configuration', bin: 'global', explain: 'Har region ko chahiye, kabhi-kabhi badalta hai. Yahan "purana config chal raha hai" ek asli khatra hai — isliye replication lag par alert hona chahiye.' },
        { text: 'Currency exchange rates', bin: 'global', explain: 'Har jagah ek jaisa, har jagah tez padha jaata hai. Thodi si staleness (seconds) aam taur par sweekar hoti hai — aur staleness ka business asar likh kar rakhna chahiye.' },
        { text: 'Rate limiting ke counters', bin: 'local', explain: 'Rate-limit counters ko cross-region sync karna sabse mehengi galtiyon mein se ek hai. Har region apna counter rakhe aur limit ko regions mein baant do. Thodi si dheela-dhaali sehna, har request par cross-region call se sasta hai.' },
        { text: 'Session cache aur temporary state', bin: 'local', explain: 'Session usi region mein rehta hai jahan user hai. Cross-region session replication mehenga hai aur replication ka faayda lagbhag kabhi zaroorat mein nahi aata — user region badle toh dobara login karwa lo.' },
        { text: 'Debug logs aur metrics ka raw data', bin: 'local', explain: 'Volume bahut bada hai aur egress ka bill bhaari. Raw data local rakho, sirf <b>aggregate</b> central bhejo. Raw logs bhejna cross-region bill ki sabse aam wajahon mein se ek hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Multi-region ke faisle',
      questions: [
        {
          q: 'Cross-region write quorum ki latency ka sahi kharcha kya hai?',
          choices: [
            'Required remote voting ACKs aur durable log ka waqt write mein aayega',
            'Har pair of regions ka RTT theek 130 ms hai, doori chahe jo bhi ho',
            'Quorum ke liye har write par saari replicas ki ACK zaroori hoti hai',
            'Replicas badha do, toh required participants ka propagation delay hat jaayega',
          ],
          answer: 0,
          explain: 'Quorum replica placement aur consensus protocol se tay hota hai, sirf regions ki ginti se nahi. Required remote ACKs WAN time jod sakti hain. Geography, durability aur failure goal actual write latency badalte hain.',
          choiceExplanations: [
            'Quorum replica placement aur consensus protocol se tay hota hai, sirf regions ki ginti se nahi. Required remote ACKs WAN time jod sakti hain. Geography, durability aur failure goal actual write latency badalte hain.',
            'Paas regions ka RTT kaafi kam ho sakta hai; 130 ms universal number nahi.',
            'Consensus quorum required voting set hai; har replica ki ACK zaroori nahi.',
            'Zyada replicas distance nahi hataati; required voting placement phir bhi jaancho.',
          ],
        },
        {
          q: 'Regional-by-row ki write latency kin cheezon par depend karti hai?',
          choices: [
            'Row locality, replica placement aur survival goal quorum tay karte hain',
            'Regional-by-row hai, toh row ki doosre regions mein copies hoti hi nahi',
            'Regional-by-row hai, toh reads sirf eventual consistency waali ho sakti hain',
            'Table par locality label hai, toh har write ka local-only hona prove hai',
          ],
          answer: 0,
          explain: 'Row ka home region common access ko localize kar sakta hai. Actual quorum survival goal aur DB configuration par hai. Region survival, global uniqueness aur cross-region transactions WAN coordination jod sakte hain.',
          choiceExplanations: [
            'Row ka home region common access ko localize kar sakta hai. Actual quorum survival goal aur DB configuration par hai. Region survival, global uniqueness aur cross-region transactions WAN coordination jod sakte hain.',
            'Region failure survive karne ke liye doosre regions mein copies aur ACKs chahiye ho sakte hain.',
            'Locality aur consistency alag guarantees hain; strong transactions bhi mumkin hain.',
            'Label akela foreign keys, global constraints aur quorum placement nahi bataata.',
          ],
        },
        {
          q: 'Regional-by-row ki keemat kahan chukani padti hai?',
          choices: [
            'Cross-region query aur row-home move mein coordination lag sakti hai',
            'Har local read regional-by-row se zaroor pehle se dheemi ho jaati hai',
            'Row ka home region hai, toh failover recovery ki zaroorat nahi hoti',
            'Row ka home badlo, toh sirf metadata badlega; data transfer nahi hota',
          ],
          answer: 0,
          explain: 'Locality common user path ko tez kar sakti hai. Kai regions ka data maangne ya ownership move karne mein network aur coordination cost aa sakti hai. Analytics ko async aggregates ya alag store fit ho sakta hai; freshness ka contract saaf rakho.',
          choiceExplanations: [
            'Locality common user path ko tez kar sakti hai. Kai regions ka data maangne ya ownership move karne mein network aur coordination cost aa sakti hai. Analytics ko async aggregates ya alag store fit ho sakta hai; freshness ka contract saaf rakho.',
            'Home-region locality ka maqsad local access sasta karna hai; har read slow nahi hoti.',
            'Recovery actual replicas aur survival configuration se tay hoti hai.',
            'Row home move mein data transfer aur authority coordination bhi ho sakti hai.',
          ],
        },
        {
          q: 'Multi-region rate limiter mein strict global cap ya local budgets kaise chunoge?',
          choices: [
            'Strict quota aur latency ka risk dekho; local budgets ka protocol jaancho',
            'Global counters sync ho hi nahi sakte; coordination ka koi design nahi',
            'Har region ko poori global limit do; total cap apne aap wahi rahegi',
            'Har limiter ko 130 ms block hona hi padega; local budget bekaar hai',
          ],
          answer: 0,
          explain: 'Strict cap coordinated counters ya carefully allocated budgets se enforce ho sakti hai. Local budgets common path tez karte hain, par allocation, window, transfer aur failure behavior saaf chahiye. Kuch designs overshoot allow karte hain; business risk se chuno.',
          choiceExplanations: [
            'Strict cap coordinated counters ya carefully allocated budgets se enforce ho sakti hai. Local budgets common path tez karte hain, par allocation, window, transfer aur failure behavior saaf chahiye. Kuch designs overshoot allow karte hain; business risk se chuno.',
            'Counters, leases ya escrow budgets coordinate karna mumkin hai; har option ki cost alag hai.',
            'Har region ko full global allowance dene se aggregate cap exceed ho sakti hai.',
            'RTT topology par depend karta hai; leased ya preallocated budgets per-request WAN call bacha sakte hain.',
          ],
        },
      ],
    },
  ],
  success: [
    '"Active-active" ke chaar alag aakaar bata sakte ho',
    'Cross-region quorum ka per-write RTT kharcha jaante ho',
    'Regional-by-row ko pehla vikalp maante ho, aakhri nahi',
    'Har data type ke liye sahi replication strategy chun sakte ho',
  ],
  homework: `Apne database ki sabse badi table lo aur ek sawaal poochho: kya har
    row ka koi <b>ek maalik</b> hai (ek user, ek tenant, ek room)? Agar haan, toh
    tumhare paas regional-by-row ka raasta khula hai. Ab doosri list banao — woh
    tables jinka koi ek maalik nahi (config, catalog, rates). Wahi tumhari
    "global tables" hain, aur wahi multi-region ka asli kaam hai.`,
  cards: [
    { front: '"Active-active" ke chaar aakaar?', back: '<b>Ek global primary</b> (strong, region gire toh writes band) · <b>cross-region quorum</b> (strong, har write par 1 RTT) · <b>regional-by-row</b> (strong + local, har row ka home region) · <b>async multi-primary</b> (eventual + conflicts).' },
    { front: 'Cross-region quorum ka daam?', back: 'Har write par <b>kam se kam ek poora inter-region RTT</b>. Ek continent (~30 ms) par theek; duniya bhar (~130 ms) par bahut zyada. Isliye quorum ek continent ke andar rakho, continents ke beech async.' },
    { front: 'Regional-by-row tez kyun hai?', back: 'Cross-region coordination <b>hai hi nahi</b> — har row ek region ki hai, isliye write poori tarah local hai. Sabse achha optimization kaam tez karna nahi, kaam <b>hataana</b> hota hai.' },
    { front: 'Regional-by-row ki keemat?', back: 'Do jagah: (1) jo data kisi ek user ka nahi (config, catalog) usko <b>global table</b> banana padta hai, (2) kai regions ke rows maangne wali query ab <b>cross-region fan-out</b> hai.' },
    { front: 'Rate limit counters multi-region mein?', back: '<b>Local rakho.</b> Global limit ko regions mein baant do (1000 rps → 4 × 250). Har request par cross-region sync = har request par 130 ms, aur rate limiter ka maqsad hi sasta hona hai.' },
  ],
  interview: {
    title: 'Interview Round — Multi-region',
    instructions: 'Senior aur staff rounds ka pakka sawaal. 🎤',
    questions: [
      {
        q: 'Multi-region migration se pehle data ki kaunsi properties baant kar likhoge?',
        choices: [
          'Owner, locality, consistency, durability aur recovery needs alag likho',
          'Har data type ko same replication aur same consistency default do',
          'Session aur raw logs ka replication har product mein mana kar do',
          'Writes regions mein bhejo; data authority ka faisla routing ke baad karo',
        ],
        answer: 0,
        explain: 'Har dataset ke owner, access locality, consistency, residency, durability aur recovery targets likho. Sessions, counters aur logs ke contracts alag ho sakte hain. Classification ke baad replication, authority aur routing saath design karo.',
        choiceExplanations: [
          'Har dataset ke owner, access locality, consistency, residency, durability aur recovery targets likho. Sessions, counters aur logs ke contracts alag ho sakte hain. Classification ke baad replication, authority aur routing saath design karo.',
          'Data types ki locality, privacy aur recovery needs alag ho sakti hain.',
          'Session ya logs ko cross-region durability aur access chahiye ho sakta hai.',
          'Authority aur routing alag design hue toh conflicting writes aur wrong failover ka risk hai.',
        ],
      },
      {
        q: 'Ek region fail hua. Service aur data ka outcome kaise tay karoge?',
        choices: [
          'Placement, quorum, spare capacity aur RPO/RTO ki failover drill dekho',
          'Regional-by-row label hai, toh home-region failure mein data khona tay hai',
          'Global table hai, toh quorum ke bina bhi har region write le sakta hai',
          'Session data gaya, toh user ya payment workflow ko nuksaan nahi hoga',
        ],
        answer: 0,
        explain: 'Region failure ka outcome actual copies, quorum, routing aur spare capacity se nikalta hai. Data loss aur downtime ko RPO/RTO targets ke against drill karo. Locality ya global label akela availability ka vaada nahi hai.',
        choiceExplanations: [
          'Region failure ka outcome actual copies, quorum, routing aur spare capacity se nikalta hai. Data loss aur downtime ko RPO/RTO targets ke against drill karo. Locality ya global label akela availability ka vaada nahi hai.',
          'Survival settings data aur availability ko home-region failure mein bacha sakti hain.',
          'Global table ko bhi required quorum aur reachability chahiye.',
          'Sessions ya counters valuable workflow state ho sakte hain; loss ka contract saaf chahiye.',
        ],
      },
    ],
  },
},

{
  id: 'rollout',
  icon: '🎚️',
  title: 'Progressive Rollout — canary ka ganit',
  badge: 'Canary Ganitagya',
  objectives: [
    'Canary ka asli sawaal: kitne SAMPLES chahiye, kitna percent nahi',
    'Chhota regression pakadne ka daam — blast radius ya waqt',
    'Automatic rollback ke bina detection aadha system hai',
    'Feature flag aur deploy ka farak — aur dono ka apna kill switch',
  ],
  lesson: [
    `<h3>🎚️ "5% canary" apne aap mein kuch nahi kehta</h3>
     <p>Har team kehti hai "hamara rollout staged hai — 5% canary, phir global".
     Par 5% ek <b>percentage</b> hai, aur canary ka kaam <b>statistics</b> hai.
     Asli sawaal yeh hai: <b>us 5% par kitne requests aayenge, aur kya utne
     requests mein tumhara regression dikhega?</b></p>
     <pre>Baseline error rate: 0.1%
Naya code error rate: 0.12%   (yaani 0.02 percentage-point ka badhav)

Kya 500 requests mein yeh farak dikhega?   Nahi — shor mein doob jaayega.
Kya 4 lakh requests mein dikhega?           Haan.</pre>
     <p>Yaani tumhara canary tab tak bekaar hai jab tak usne <b>utne samples</b>
     na dekh liye hon jitne us farak ko shor se alag karne ke liye chahiye.</p>
     <h3>📐 Formula jo yaad rakhne laayak hai</h3>
     <pre>n  ≈  16 × p × (1 − p) ÷ delta²

n     =  har taraf kitne samples chahiye
p     =  baseline rate (jaise 0.001 = 0.1% errors)
delta =  jitna farak pakadna hai (fraction mein)</pre>
     <p>0.1% baseline par 0.02 percentage-point ka farak pakadne ke liye:
     <code>16 × 0.001 × 0.999 ÷ (0.0002)² ≈ 4,00,000</code> samples chahiye.
     20,000 rps ke 5% canary par woh <b>1,000 rps</b> hai, yaani lagbhag
     <b>400 second</b> — saat minute.</p>
     <p class="tip">🎯 Yahan se ek asuvidhajanak sach nikalta hai:
     <b>chhota regression pakadne ke liye ya toh canary bada karo ya bake time
     lamba karo</b>. Teesra raasta nahi hai. Statistics blast radius maangti hai.</p>`,
    `<h3>🔀 Deploy aur feature flag — do alag cheezein</h3>
     <table>
       <tr><th></th><th>Deploy</th><th>Feature flag</th></tr>
       <tr><td>Kya badalta hai</td><td>chal raha code</td><td>chal rahe code ka <b>vyavhaar</b></td></tr>
       <tr><td>Palatne ka waqt</td><td>minutes (naya build)</td><td><b>seconds</b></td></tr>
       <tr><td>Kis par lagta hai</td><td>machines</td><td>users, tenants, ya requests</td></tr>
       <tr><td>Khatra</td><td>rollback ke dauraan version skew</td><td>flag ka combination test nahi hua hota</td></tr>
     </table>
     <p>Sabse achha aakaar dono ko alag rakhta hai: <b>code deploy karo jo bandh
     (off) ho</b>, phir flag se dheere-dheere kholo. Ab deploy aur release do alag
     ghatnayein hain, aur dono ka apna kill switch hai.</p>
     <h3>🤖 Detection ke bina rollback aadha hai — aur ulta bhi sach hai</h3>
     <p>Cloudflare ke 2019 outage mein detection <b>3 minute</b> mein ho gayi thi
     aur mitigation mein <b>25 minute</b> lage. Agar rollback automatic hota —
     "error rate baseline se 3 sigma upar gaya toh canary khud band ho jaaye" —
     toh woh 27-minute outage lagbhag 5-minute ka hota.</p>
     <p class="tip">🎯 Automatic rollback ka sabse bada faayda raat 3 baje dikhta
     hai. Us waqt insaan ko jagana, usko context dena, aur usse sahi button
     dabwana — teenon mein minutes lagte hain. Machine ko sirf ek shart chahiye.</p>`,
  ],
  stages: [
    {
      type: 'tradeoff',
      title: 'Canary ka statistical ganit',
      instructions: 'Knobs ghumao. Dhyan do ki chhota farak pakadne ki keemat kahan chukani padti hai.',
      goal: 'Aisi settings dhoondho jahan 0.02 percentage-point ka error badhav 15 minute ke andar pakda jaa sake, canary 5% se zyada na ho, aur automatic rollback chalu ho.',
      scenario: `Tumhari service <b>20,000 rps</b> leti hai. Baseline error rate
        <b>0.1%</b> hai. Tum ek naya version canary par bhejna chahte ho aur
        chhote se chhota regression bhi pakadna chahte ho.`,
      knobs: [
        { id: 'canary', label: 'Canary par traffic', min: 1, max: 20, step: 1, value: 20, unit: '%',
          note: 'Chhota canary = kam nuksaan, par kam samples — yaani chhota farak nahi dikhega.' },
        { id: 'delta', label: 'Kitna chhota farak pakadna hai', min: 0.01, max: 0.20, step: 0.01, value: 0.20, unit: ' pp',
          note: 'pp = percentage point. Chhota farak pakadna chaugna mehenga hai (delta ka square).' },
        { id: 'auto', label: 'Automatic rollback (0 = nahi, 1 = haan)', min: 0, max: 1, step: 1, value: 0, unit: '',
          note: 'Detection ke bina rollback bekaar hai — aur rollback ke bina detection bhi.' },
      ],
      readouts: k => {
        const m = canaryModel(k);
        return [
          { label: 'Canary par rps', value: Math.round(m.rps).toLocaleString(), tone: 'ok' },
          { label: 'Samples chahiye', value: Math.round(m.n).toLocaleString(), tone: 'ok' },
          { label: 'Farak dikhne mein waqt', value: m.min < 60 ? m.min.toFixed(1) + ' min' : '> 1 ghanta', tone: m.min <= 15 ? 'ok' : m.min <= 40 ? 'warn' : 'bad' },
          { label: 'Mitigate hone mein waqt', value: k.auto ? '~1 min (automatic)' : '~20 min (insaan)', tone: k.auto ? 'ok' : 'bad' },
        ];
      },
      bars: k => {
        const m = canaryModel(k);
        return [
          { label: 'Detect hone ka waqt (budget 15 min)', pct: Math.min(100, (m.min / 45) * 100), text: m.min.toFixed(1) + ' min', tone: m.min <= 15 ? 'ok' : 'bad' },
          { label: 'Blast radius (budget 5%)', pct: (k.canary / 20) * 100, text: k.canary + '%', tone: k.canary <= 5 ? 'ok' : 'bad' },
          { label: 'Kitna chhota farak pakad paoge', pct: 100 - (k.delta / 0.20) * 100, text: k.delta.toFixed(2) + ' pp', tone: k.delta <= 0.02 ? 'ok' : 'warn' },
        ];
      },
      verdict: k => {
        const m = canaryModel(k);
        const bad = [];
        if (k.delta > 0.02) bad.push(`tum sirf <b>${k.delta.toFixed(2)} pp</b> se bada farak pakad paoge — usse chhota regression canary se nikal kar global chala jaayega`);
        if (m.min > 15) bad.push(`itne chhote farak ke liye <b>${m.min.toFixed(1)} minute</b> lagenge — canary bada karo, kyunki samples sirf traffic se aate hain`);
        if (k.canary > 5) bad.push(`canary <b>${k.canary}%</b> hai — regression pakadne se pehle utne users girenge`);
        if (!k.auto) bad.push('automatic rollback <b>band</b> hai — detection ke baad bhi insaan ke jagne aur samajhne mein 20 minute jaayenge');
        if (!bad.length) return { ok: true, text: `Canary <b>${k.canary}%</b> par <b>${Math.round(m.rps).toLocaleString()} rps</b> — <b>${k.delta.toFixed(2)} pp</b> ka farak <b>${m.min.toFixed(1)} minute</b> mein dikh jaayega, aur automatic rollback usse ek minute mein band kar dega.` };
        return { ok: false, text: bad.join(' &nbsp;·&nbsp; ') };
      },
      check: k => { const m = canaryModel(k); return k.delta <= 0.02 && m.min <= 15 && k.canary <= 5 && k.auto === 1; },
      lesson: `🎯 Is lab ka poora nichod ek line hai: <b>canary ka percentage nahi,
        samples matter karte hain</b>. Aur samples sirf do cheezon se aate hain —
        <b>zyada traffic</b> (bada canary) ya <b>zyada waqt</b> (lamba bake).
        Teesra raasta hai hi nahi. Isliye jab koi kahe "hum 1% canary par 2 minute
        rukte hain", ganit chala kar dekho: 1% par 2 minute mein kitne samples
        aaye, aur kya utne mein tumhara regression dikh sakta tha? Zyadatar
        teams ke liye jawab hai — nahi.`,
      quiz: {
        q: 'Chhota regression pakadne ko aur samples chahiye. Exposure aur waqt kaise chunoge?',
        choices: [
          'Meaningful delta aur sample need tay karo; exposure aur waqt ka risk milao',
          'Canary bada karo; zyada traffic har regression ke liye safer hi hota hai',
          'Automatic rollback lagao; detection ke liye samples ab zaroori nahi',
          'Theek 2 ghante bake karo; har traffic aur delta ka same wait hota hai',
        ],
        answer: 0,
        explain: 'Canary sizing mein detectable delta, samples, coverage aur harmed traffic ka risk saath chuno. Zyada traffic ya lamba observation sample laa sakta hai. Bada delta accept karna business risk ka likha hua faisla hona chahiye.',
        choiceExplanations: [
          'Canary sizing mein detectable delta, samples, coverage aur harmed traffic ka risk saath chuno. Zyada traffic ya lamba observation sample laa sakta hai. Bada delta accept karna business risk ka likha hua faisla hona chahiye.',
          'Bade canary se samples badhte hain, par potentially affected users bhi badhte hain.',
          'Rollback ko reliable signal aur safe return path chahiye; detection ka sample need nahi hatta.',
          'Required time traffic, baseline, effect size aur statistical design par depend karta hai.',
        ],
      },
    },
    {
      type: 'order',
      title: 'Ek surakshit release ka kram',
      instructions: 'Ek naye feature ko production tak le jaane ke kadam sahi kram mein lagao.',
      steps: [
        { text: '📦 Code deploy karo — par feature FLAG ke peeche, band halat mein', explain: 'Deploy aur release ko alag karna hi poora aadhaar hai. Code chal raha hai par kuch kar nahi raha, isliye deploy khud mein ek non-event ban jaata hai.' },
        { text: '👤 Flag sirf apni team ke liye kholo (internal dogfood)', explain: 'Pehla asli traffic tumhara apna hona chahiye. Yahi Cloudflare ka "DOG" stage hai — agar feature yahan toota, kisi customer ne dekha hi nahi.' },
        { text: '📊 Success aur guardrail metrics tay karo — aur har metric ka threshold likho', explain: 'Rollout se PEHLE likho ki "kharab" kaisa dikhta hai. Baad mein tay karoge toh har graph ko dekhkar dil kahega "shayad theek hai".' },
        { text: '🐤 1-5% par kholo aur SAMPLES ka ganit chala kar itni der ruko', explain: 'Bake time alert time se bada hona chahiye, aur samples itne hone chahiye ki tumhara delta shor se alag dikh sake. Percentage akela kuch nahi kehta.' },
        { text: '🤖 Automatic rollback ki shart chalu karo — guardrail toote toh khud band ho', explain: 'Raat 3 baje insaan ko jagane, context dene aur sahi button dabwane mein 20 minute jaate hain. Machine ko sirf ek shart chahiye.' },
        { text: '📈 Dheere-dheere badhao — 5% → 25% → 50% → 100%, har kadam par bake', explain: 'Har kadam par naye tarah ke users aate hain (alag device, alag region, alag data). 5% par jo nahi toota, 50% par toot sakta hai.' },
        { text: '🧹 Flag hatao aur purana raasta delete karo', explain: 'Flag hataane ka kadam lagbhag hamesha chhoot jaata hai. Bhoole hue flags apne aap mein ek outage class hain — kyunki bhoole hue flags ke combinations kabhi test nahi hote.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Rollout ke faisle',
      questions: [
        {
          q: 'Canary ka asli sawaal kya hai?',
          choices: [
            'Samples, relevant workload aur detection rule se evidence poora hai ya nahi',
            '1% traffic hai, toh rare users aur data shapes bhi cover maan sakte hain',
            '10 minute chale, toh har chhota delta absent hone ka proof mil gaya',
            'Ek region green hai, toh sab regions ke failure shapes cover ho gaye',
          ],
          answer: 0,
          explain: 'Samples = rps x canary fraction x seconds. 10,000 rps ka 1% do minute mein 12,000 samples hai; 100 rps ka 1% sirf 120. Relevant state/cohorts aur chosen detection rule bhi chahiye; percentage akela safety nahi bataata.',
          choiceExplanations: [
            'Samples = rps x canary fraction x seconds. 10,000 rps ka 1% do minute mein 12,000 samples hai; 100 rps ka 1% sirf 120. Relevant state/cohorts aur chosen detection rule bhi chahiye; percentage akela safety nahi bataata.',
            'Low traffic par 1% mein events kam honge; rare cohorts chhoot sakte hain.',
            'Time akela event count, coverage ya required power ka proof nahi.',
            'Region, tenant, data aur scale effects alag ho sakte hain.',
          ],
        },
        {
          q: 'Deploy aur feature release alag karne ka faayda aur limit kya hai?',
          choices: [
            'Code delivery aur feature exposure alag karo; dono ke rollback test karo',
            'Feature off hai, toh initialization ya migration ka koi effect nahi',
            'Flag band karo, toh schema aur bahar ke actions bhi poore reverse honge',
            'Feature flags hain, toh purane build par rollback rakhna extra kaam hai',
          ],
          answer: 0,
          explain: 'Separate delivery aur exposure se controlled release aur compatible case mein quick disable milta hai. Off code bhi initialization ya migration chala sakta hai. Flags build rollback, data repair aur safe defaults ki jagah nahi lete; propagation test karo.',
          choiceExplanations: [
            'Separate delivery aur exposure se controlled release aur compatible case mein quick disable milta hai. Off code bhi initialization ya migration chala sakta hai. Flags build rollback, data repair aur safe defaults ki jagah nahi lete; propagation test karo.',
            'Shared paths, initialization aur migrations feature off hote hue bhi chal sakte hain.',
            'Data aur external effects ko alag repair ya compensation chahiye ho sakta hai.',
            'Flag system khud fail ho sakta hai; build compatibility aur rollback bhi chahiye.',
          ],
        },
        {
          q: 'Automatic rollback kab response ki der ghataa sakta hai?',
          choices: [
            'Reliable signals aur tested safe path ho, toh human response ki der ghategi',
            'Rollback automate ho, toh compatibility test ki zaroorat nahi rehti',
            'Rollback trigger hote hi har setup mein 1 second se kam lagega',
            'False alert par rollback ho, toh users ko koi extra cost nahi hoti',
          ],
          answer: 0,
          explain: 'Automation on-call ko jagne aur context lene ki der ghata sakti hai. Signal galat ya rollback incompatible ho toh automation nuksaan badha sakti hai. Timings aur data transitions ko actual path ki drill se jaancho.',
          choiceExplanations: [
            'Automation on-call ko jagne aur context lene ki der ghata sakti hai. Signal galat ya rollback incompatible ho toh automation nuksaan badha sakti hai. Timings aur data transitions ko actual path ki drill se jaancho.',
            'Destructive ya incompatible rollback automation se aur jaldi galat asar kar sakta hai.',
            'Propagation, state aur dependencies recovery time badalti hain.',
            'False rollback useful work rok sakta hai ya instability laa sakta hai.',
          ],
        },
        {
          q: 'Purane feature flags hataane ka design reason kya hai?',
          choices: [
            'Purane branches aur flag combinations test aur maintenance ka kaam badhaate hain',
            'Har flag reachable states ko exactly double karta hai, dependencies chahe jo hon',
            'Purane flag ki branch deployed code ko ab prabhavit kar hi nahi sakti',
            'Flag delete karo; usage aur compatibility ka check zaroori nahi hota',
          ],
          answer: 0,
          explain: 'N independent binary flags ke 2^N possible combinations hain; constraints se reachable states kam ho sakte hain. Stale branches maintenance aur unexpected behavior badhaati hain. Usage aur compatibility dekh kar flags retire karo.',
          choiceExplanations: [
            'N independent binary flags ke 2^N possible combinations hain; constraints se reachable states kam ho sakte hain. Stale branches maintenance aur unexpected behavior badhaati hain. Usage aur compatibility dekh kar flags retire karo.',
            'Mutually exclusive flags aur dependencies combinations ko constrain kar sakti hain.',
            'Legacy config aur branch kisi cohort ka behavior ab bhi badal sakti hai.',
            'Consumers, rollout state aur compatibility jaane bina deletion unsafe ho sakta hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Canary ka sawaal percentage se badalkar samples par le ja sakte ho',
    'n = 16p(1-p)/delta² se detection ka waqt nikaal sakte ho',
    'Deploy aur release ko alag rakhte ho',
    'Automatic rollback ko detection ka zaroori jodidar maante ho',
  ],
  homework: `Apni service ka rps aur error rate lo. Ab ganit chalao: tumhare
    canary par, tumhare bake time mein, kitne samples aate hain? Aur us sample
    count par kitna chhota regression dikh sakta hai? Zyadatar teams ke liye
    jawab chaunkane wala hota hai — unka canary sirf bade, saaf failures pakadta
    hai, aur wahi failures waise bhi test mein pakde jaate.`,
  cards: [
    { front: 'Canary ka asli sawaal?', back: '<b>Kitne samples</b> — percentage nahi. samples = rps × canary% × minute. Chhota regression pakadne ke liye samples chahiye, aur samples sirf <b>zyada traffic</b> ya <b>zyada waqt</b> se aate hain. Teesra raasta nahi.' },
    { front: 'Sample size ka formula?', back: '<code>n ≈ 16 × p × (1−p) ÷ delta²</code>. 0.1% baseline par 0.02 pp ka farak pakadne ke liye lagbhag <b>4 lakh</b> samples. Delta aadha karo toh samples <b>chaar guna</b>.' },
    { front: 'Deploy vs feature flag?', back: '<b>Deploy</b> = chalta code badalta hai, minutes mein palatta hai, version skew ka khatra. <b>Flag</b> = vyavhaar badalta hai, <b>seconds</b> mein palatta hai. Sahi aakaar: band halat mein deploy karo, phir flag se kholo.' },
    { front: 'Automatic rollback kyun?', back: 'Raat 3 baje insaan ko jagana + context + sahi button = 20 minute. Cloudflare 2019: detect 3 min, mitigate 25 min. Machine ko sirf <b>ek shart</b> chahiye.' },
    { front: 'Purane flags ka khatra?', back: '10 flags = <b>1,024 combinations</b>, jinme se tum 3 test karte ho. Bhoole hue flags apni ek poori outage class hain. Rollout ka aakhri kadam hamesha <b>flag hatao</b> hai.' },
  ],
  interview: {
    title: 'Interview Round — Progressive delivery',
    instructions: 'Platform aur infra rounds ka pakka sawaal. 🎤',
    questions: [
      {
        q: '"Tum kaise tay karoge ki canary safal raha?"',
        choices: [
          'Metrics, relevant cohorts, delta, sample need aur stop rule pehle likho',
          'Pager nahi baja, toh naye version mein regression hona mumkin nahi',
          'Team ko complaints nahi mili, toh low-volume canary ko pass kar do',
          'Mean latency same hai, toh errors aur tail SLOs bhi meet maan lo',
        ],
        answer: 0,
        explain: 'Pehle tay karo: kya naapna hai, kitna farq important hai, kaunse users/states cover honge aur kab stop karoge. Phir valid statistical rule aur observation chalao. Signal na dikhna akela success ka proof nahi.',
        choiceExplanations: [
          'Pehle tay karo: kya naapna hai, kitna farq important hai, kaunse users/states cover honge aur kab stop karoge. Phir valid statistical rule aur observation chalao. Signal na dikhna akela success ka proof nahi.',
          'Detector ki sensitivity ya representative load kam ho sakti hai.',
          'Low volume aur hidden failures se complaints der se ya kabhi nahi aati hain.',
          'Tail, errors aur business metrics mean ke saath alag fail ho sakte hain.',
        ],
      },
      {
        q: '"Tumhara canary saaf tha, par 100% par jaate hi system gir gaya. Kya hua hoga?"',
        choices: [
          'Samples, state/cohorts, scale aur actual rollout diff ki jaanch karo',
          'Canary green tha, toh release ko cause ki list se hata sakte hain',
          'Canary har baat mein production-identical hona chahiye, warna test bekaar hai',
          'Monitoring bug hi cause hai; config aur full-load effects ko chhod do',
        ],
        answer: 0,
        explain: 'Canary rare path, relevant state ya full-load contention miss kar sakta hai. Connection pools, hot partitions aur cache working set scale par badal sakte hain. Scale-shaped load tests aur staged expansion madad karte hain; canary har aisa bug zaroor nahi chhodta.',
        choiceExplanations: [
          'Canary rare path, relevant state ya full-load contention miss kar sakta hai. Connection pools, hot partitions aur cache working set scale par badal sakte hain. Scale-shaped load tests aur staged expansion madad karte hain; canary har aisa bug zaroor nahi chhodta.',
          'Green canary ki sample aur scope limits ho sakti hain; rollout cause reh sakta hai.',
          'Isolation aur load alag hote hain; failure-relevant properties ko representative banaao.',
          'Config, data, exposure aur resource limits bhi difference samjha sakte hain.',
        ],
      },
    ],
  },
},

{
  id: 'unitcost',
  icon: '💸',
  title: 'Cost per Request — har faisle ka bill',
  badge: 'Unit-Cost Ustaad',
  objectives: [
    'Cost per request nikalna — aur usko ek design metric maanna',
    'Cloud bill ke teen chhupe hue rakshas: egress, NAT, cross-AZ',
    'LLM feature ka per-call kharcha aur uska scale par asar',
    'Unit economics: scale par cost per request girna chahiye, badhna nahi',
  ],
  lesson: [
    `<h3>💸 Ek number jo har architecture behes khatam kar deta hai</h3>
     <p>"Yeh design behtar hai" ek raay hai. "Yeh design per million requests
     $21 ka hai aur woh $84 ka" ek <b>tathya</b> hai. Cost per request
     architecture ko raay se nikaal kar ganit mein le aata hai.</p>
     <pre>Cost per request  =  mahine ka bill  ÷  mahine ke requests

Udaharan:  $258,000/mahina  ÷  1,200 crore requests
        =  $0.0000215 per request
        =  $21.50 per million requests</pre>
     <p>Ab har design faisla is number se naapa ja sakta hai. Ek extra
     cross-service call jodne ka matlab kya hai? Cache hit rate 80% se 95%
     karne ka faayda kitne dollar ka hai? In sawaalon ke jawab ab <b>numbers</b>
     mein hain.</p>
     <h3>👹 Teen chhupe hue rakshas</h3>
     <table>
       <tr><th>Rakshas</th><th>Kaise chhupta hai</th><th>Ilaaj</th></tr>
       <tr><td><b>Egress</b> (data bahar bhejna)</td><td>compute ke bill mein nahi dikhta, alag line item hai — aur cloud se BAHAR jaane par sabse mehenga</td><td>CDN (origin se egress lagbhag khatam), compression, aur data ko wahin rakho jahan compute hai</td></tr>
       <tr><td><b>NAT Gateway</b></td><td>har GB par charge — aur private subnet ki har outbound call usi se jaati hai</td><td>VPC endpoints (S3, DynamoDB) — woh NAT ko bypass karte hain</td></tr>
       <tr><td><b>Cross-AZ traffic</b></td><td>DONO taraf charge hota hai, aur microservices ke beech ki chatter aksar random AZ mein jaati hai</td><td>zone-aware routing — jahan tak ho sake usi AZ mein rakho</td></tr>
     </table>
     <p class="tip">🎯 Teenon rakshason mein ek baat samaan hai: teenon
     <b>per-GB</b> charge hain aur teenon <b>architecture</b> se aate hain,
     istemaal se nahi. Instance chhota karne se teenon mein se koi kam nahi hota.</p>`,
    `<h3>🤖 LLM features ka naya ganit</h3>
     <p>LLM call ka kharcha tokens se aata hai, requests se nahi — aur input aur
     output ka daam alag hota hai.</p>
     <pre>Ek call:  2,000 input tokens + 500 output tokens
Daam:     input $3 / million · output $15 / million

per call  =  (2,000 ÷ 1M × $3) + (500 ÷ 1M × $15)
          =  $0.006 + $0.0075
          =  $0.0135

10 lakh calls roz  →  $13,500 roz  →  lagbhag $4 lakh mahina</pre>
     <p>Do baatein turant dikhti hain. <b>Ek:</b> output tokens input se
     <b>5x mehenge</b> hain, isliye "chhota jawab do" ek asli cost optimization
     hai. <b>Do:</b> yeh lagbhag hamesha compute se bada kharcha hota hai —
     ek LLM feature ka bill uske servers ke bill se kai guna hota hai.</p>
     <h3>📉 Unit economics — asli test</h3>
     <p>Sirf bill dekhna galat hai; bill toh badhega hi agar product badh raha
     hai. Asli sawaal hai: <b>kya cost per request scale par gir raha hai?</b></p>
     <pre>Sehatmand:  users 2x  →  bill 1.6x   →  cost/request GIRA   ✅
Chinta:     users 2x  →  bill 2x     →  cost/request wahi     ⚠️
Khatra:     users 2x  →  bill 3x     →  cost/request BADHA    🚨</pre>
     <p>Teesri line ka matlab hai ki tumhare architecture mein kahin
     <b>super-linear</b> kaam hai — N+1 queries, fan-out, cross-AZ chatter, ya
     O(N²) topology. Woh bill se pehle <b>design</b> ki problem hai.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Bill ka napkin math',
      instructions: 'Char cost problems. Pehle andaaza, phir poori calculation.',
      goal: 'Char numbers nikalo jo bataate hain ki cloud bill kahan se aata hai.',
      problems: [
        {
          q: 'Tumhara AWS bill <b>$3.1 million/saal</b> hai aur mahine mein <b>1,200 crore (12 billion)</b> requests aati hain. Per million requests ka kharcha kitna hai?',
          unit: '$ per million requests',
          given: ['Saal ka bill: $3,100,000', 'Mahine ke requests: 12 billion'],
          answer: 21.5,
          steps: [
            'Mahine ka bill = $3,100,000 ÷ 12 = $258,333',
            'Per request = $258,333 ÷ 12,000,000,000 = $0.0000215',
            'Per million = $0.0000215 × 1,000,000 = $21.50',
            'Ab har design faisla is number se naapa ja sakta hai',
          ],
          lesson: '🎯 Yeh ek number har architecture behes khatam kar deta hai. "Yeh design behtar hai" ek raay hai; "$21.50 vs $84 per million" ek <b>tathya</b> hai. Har team ko yeh number pata hona chahiye, aur zyadatar teams ko nahi hota.',
        },
        {
          q: 'Har request lagbhag <b>200 ms CPU</b> leti hai. vCPU-hour ka daam <b>$0.04</b> hai. <b>100 crore (1 billion)</b> requests ka compute kharcha kitna hai?',
          unit: '$',
          given: ['1 billion requests', 'Har request: 0.2 vCPU-second', 'vCPU-hour: $0.04'],
          answer: 2222,
          steps: [
            '1,000,000,000 × 0.2 sec = 200,000,000 vCPU-seconds',
            '200,000,000 ÷ 3,600 = 55,556 vCPU-hours',
            '55,556 × $0.04 = lagbhag $2,222',
            "Given CPU time/price mein per million compute $2.22; actual largest bill item workload par depend hai",
          ],
          lesson: "🎯 Yeh number lagbhag hamesha logon ko chaunkata hai. 100 crore requests ka <b>compute</b> sirf $2,222 hai — poore mahine ke 1,200 crore requests ka lagbhag $26,700. Bill $258,000 ka hai. Baaki ~$231,000 kahan gaya? Storage, database, egress, NAT, cross-AZ, managed services — <b>compute bill ka chhota hissa hai; sabse bada kharcha line items mein dhoondo</b>.",
        },
        {
          q: 'Tum <b>1 PB (10 lakh GB)</b> data mahine mein internet par bhejte ho. Egress ka daam <b>$0.05/GB</b> hai. Mahine ka egress bill kitna hai?',
          unit: '$/mahina',
          given: ['Egress: 1 PB = 1,000,000 GB per mahina', 'Daam: $0.05 per GB'],
          answer: 50000,
          steps: [
            '1,000,000 GB × $0.05 = $50,000 per mahina',
            'Saal ka: $600,000 — sirf data bahar bhejne ka',
            'CDN se 90% offload karo → origin egress 100,000 GB → $5,000',
            'CDN ka apna bill hai (aksar $0.01-0.02/GB), par kul kharcha phir bhi lagbhag aadha ya kam',
          ],
          lesson: '🎯 Egress bill ka woh hissa hai jo kisi CPU graph par nahi dikhta. Aur yeh <b>architecture</b> se aata hai, istemaal se nahi — instance chhota karne se egress kam nahi hota. CDN ka asli case aksar latency nahi, <b>bill</b> hota hai.',
        },
        {
          q: 'Ek LLM feature: har call mein <b>2,000 input</b> + <b>500 output</b> tokens. Input $3/million tokens, output $15/million. Roz <b>10 lakh</b> calls par roz ka kharcha kitna hai?',
          unit: '$/din',
          given: ['Per call: 2,000 input + 500 output tokens', 'Input: $3 per million tokens', 'Output: $15 per million tokens', 'Roz: 1,000,000 calls'],
          answer: 13500,
          steps: [
            'Input per call = 2,000 ÷ 1,000,000 × $3 = $0.006',
            'Output per call = 500 ÷ 1,000,000 × $15 = $0.0075',
            'Per call kul = $0.0135',
            '1,000,000 calls × $0.0135 = $13,500 roz = lagbhag $4,05,000 mahina',
          ],
          lesson: "🎯 Do cheezein turant dikhti hain. <b>Ek:</b> given illustrative price table mein output tokenprice5x hai;current provider/model price verify karo, isliye \"jawab chhota rakho\" ek asli cost optimization hai (aur latency bhi behtar karta hai). <b>Do:</b> $4 lakh mahina lagbhag hamesha us feature ke servers ke bill se kai guna hai — LLM feature ka bill compute ka nahi, tokens ka hota hai.",
        },
      ],
    },
    {
      type: 'archdiff',
      title: 'Bill ke rakshas dhoondho',
      instructions: 'Yeh architecture chalti hai aur tez bhi hai — par bill bahut zyada aata hai. Char cost galtiyan pakdo.',
      brief: `Ek video-sharing app jo theek chal rahi hai. Latency achhi hai,
        uptime achha hai. Par cost per request pichhle saal mein <b>teen guna</b>
        ho gaya hai, jabki users sirf <b>dogune</b> hue.`,
      goal: 'Char cost galtiyan pakdo. Har box par click karke uska bill dekho.',
      nodes: [
        { id: 'origin', label: '🎬 Origin servers', sub: 'saara video seedha yahin se serve hota hai — koi CDN nahi', row: 0 },
        { id: 's3', label: '🪣 S3 (blob storage)', sub: 'videos aur thumbnails yahan padte hain', row: 0 },
        { id: 'nat', label: '🚪 NAT Gateway', sub: 'private subnet ki HAR outbound call yahin se jaati hai — S3 bhi', row: 1 },
        { id: 'mesh', label: '🕸️ 8 microservices', sub: 'ek request 6 internal calls karti hai, AZ ka koi dhyan nahi', row: 1 },
        { id: 'logs', label: '📜 Logging', sub: 'DEBUG level, har request ka poora body, managed logging service par', row: 2 },
        { id: 'rds', label: '🗄️ RDS Multi-AZ + read replica', sub: 'metadata ka database', row: 2 },
      ],
      flaws: [
        { id: 'origin', why: 'CDN ke bina saara video egress <b>origin</b> se jaata hai. 1 PB/mahina par origin egress $50,000 hai (given $0.05/GB). CDN 90%+ offload karta hai aur origin ka egress lagbhag khatam kar deta hai — yahan CDN ka case latency nahi, <b>bill</b> hai.' },
        { id: 'nat', why: 'S3 ki calls NAT Gateway se ja rahi hain, aur NAT <b>har GB</b> par charge karta hai. <b>VPC endpoint</b> (S3/DynamoDB gateway endpoint) NAT ko poori tarah bypass kar deta hai — lagbhag muft ka sudhaar hai aur bahut kam teams karti hain.' },
        { id: 'mesh', why: 'Ek request par 6 internal calls, aur AZ ka koi dhyan nahi — matlab lagbhag do-tihai calls <b>cross-AZ</b> hain, jispar <b>dono taraf</b> charge hota hai. Zone-aware routing yahi bill aadha kar deta hai. Aur 6 calls ka matlab har request par 6 network hops bhi hai.' },
        { id: 'logs', why: 'Production mein DEBUG level par har request ka poora body bhejna — managed logging services per-GB ingest charge karti hain, aur logging ka line item aksar database se bada ho jaata hai. INFO par jao, bodies sample karo, aur raw logs saste object storage mein rakho.' },
      ],
      fine: {
        s3: 'S3 par blobs rakhna bilkul sahi hai — videos database mein kabhi nahi jaani chahiye. S3 ka storage rate sasta hai; asli kharcha <b>usse bahar</b> nikalne (egress) mein hai, aur uska ilaaj CDN hai, S3 hataana nahi.',
        rds: 'Multi-AZ + read replica ek jaayaz kharcha hai — woh availability aur read scaling khareedta hai. Yeh "bill" hai, "bekaar bill" nahi. Cost optimization ka matlab availability bechna nahi hota.',
      },
      lesson: `🎯 Chaaron galtiyan <b>per-GB</b> charges hain — egress, NAT,
        cross-AZ, log ingest. Aur chaaron <b>architecture</b> se aati hain,
        istemaal se nahi: instance chhota karne se in chaaron mein se ek bhi kam
        nahi hoti. Isliye cloud bill kam karne ka pehla kadam instance size nahi,
        <b>data ka raasta</b> hota hai — data kahan se kahan ja raha hai, aur
        kitni baar.`,
    },
    {
      type: 'quiz',
      title: 'Unit economics',
      questions: [
        {
          q: 'Users 2x aur bill 3x hua. Kaunsa nateeja sahi hai?',
          choices: [
            'Requests, work per user, prices aur line-item growth alag karke dekho',
            'Bill 3x hai, toh algorithm super-linear hone ka pakka saboot hai',
            'Provider prices bill ko badal nahi sakte; cause sirf architecture hai',
            'Users 2x hain, toh requests aur bytes bhi exactly 2x honge',
          ],
          answer: 0,
          explain: 'Users 2x aur bill 3x investigation ka signal hai. Requests/user, payload, features, retention, price aur tier changes bhi bill badalte hain. Spend ko useful work se normalize aur attribute karo, phir architecture ka hal chuno.',
          choiceExplanations: [
            'Users 2x aur bill 3x investigation ka signal hai. Requests/user, payload, features, retention, price aur tier changes bhi bill badalte hain. Spend ko useful work se normalize aur attribute karo, phir architecture ka hal chuno.',
            'Usage mix, price aur capacity tiers se bhi bill badh sakta hai; algorithm akela prove nahi hota.',
            'Prices, discounts aur currency billing ko badal sakte hain.',
            'User behavior, request count aur bytes per request badal sakte hain.',
          ],
        },
        {
          q: '100 crore requests ka compute $2,222 hai — poore mahine (1,200 crore) ka ~$26,700. Bill $258,000 hai. Pehli useful jaanch?',
          choices: [
            'Actual billed line items ko network, storage, logs aur usage se milao',
            'Compute kisi product ka bada kharcha ho hi nahi sakta, isliye chhod do',
            'Compute reservation lo; NAT aur egress charges bhi apne aap ghat jaayenge',
            'Autoscaling tune karo; har logging fee seedha usi ratio se ghat jaayegi',
          ],
          answer: 0,
          explain: 'Poore mahine ka compute ~$26,700 hai, aur bill $258,000. Baaki ~$231,000 actual line items se milao: network, storage, logs, managed services. Doosre workloads CPU/GPU-heavy ho sakte hain; is example se compute ka universal share nahi nikalta.',
          choiceExplanations: [
            'Poore mahine ka compute ~$26,700 hai, aur bill $258,000. Baaki ~$231,000 actual line items se milao: network, storage, logs, managed services. Doosre workloads CPU/GPU-heavy ho sakte hain; is example se compute ka universal share nahi nikalta.',
            'CPU/GPU-heavy product mein compute bada item ho sakta hai; actual bill dekho.',
            'Compute commitments network aur managed-service fees ko automatically discount nahi karte.',
            'Log volume, retention aur sampling ke apne controls hote hain.',
          ],
        },
        {
          q: 'LLM feature ka cost ghataane se pehle kya naapoge?',
          choices: [
            'Token mix, model rates, retries aur task quality saath naapo',
            'Output ka rate har model mein input se exactly 5x hi hota hai',
            'Sabse sasta model hoga, toh successful task bhi sabse sasta hoga',
            'Prompt chhota karo; zaroori context ghate tab bhi quality same rahegi',
          ],
          answer: 0,
          explain: 'Provider/model ki relevant current rate table aur measured input, output, cached tokens aur retries lo. Quality aur latency meet karte options ka per-successful-task cost compare karo. 5x ratio yahan example hai, universal price nahi.',
          choiceExplanations: [
            'Provider/model ki relevant current rate table aur measured input, output, cached tokens aur retries lo. Quality aur latency meet karte options ka per-successful-task cost compare karo. 5x ratio yahan example hai, universal price nahi.',
            'Rates model, cache tier aur pricing date se badalte hain.',
            'Sasta model zyada retries ya failures de toh useful task ka cost badh sakta hai.',
            'Zaroori context kaatne se quality gir aur retries badh sakti hain.',
          ],
        },
        {
          q: 'Cost per request ko ek design metric maanne ka sabse bada faayda kya hai?',
          choices: [
            'Same useful work par cost aur architecture ke tradeoffs compare kar sakte hain',
            'Unit cost kam hai, toh reliability aur design quality bhi prove ho gayi',
            'Sasta result hai, toh business correctness ki shart bhi poori ho gayi',
            'Har endpoint aur tenant ki request ka resource cost ek jaisa hota hai',
          ],
          answer: 0,
          explain: 'Unit cost extra calls, fan-out aur cache ke badlav ka measurable comparison deta hai. Useful work aur quality bar same rakho. Correctness, reliability aur latency ko cost ke saath meet karna hai.',
          choiceExplanations: [
            'Unit cost extra calls, fan-out aur cache ke badlav ka measurable comparison deta hai. Useful work aur quality bar same rakho. Correctness, reliability aur latency ko cost ke saath meet karna hai.',
            'Cost ek metric hai; reliability aur performance ki alag constraints hain.',
            'Cheap par wrong output business requirement meet nahi karta.',
            'Payload, endpoint aur tenant ke hisaab se request cost badal sakta hai.',
          ],
        },
      ],
    },
  ],
  success: [
    'Cost per request nikaal sakte ho aur design faisle usse naap sakte ho',
    'Egress, NAT aur cross-AZ ko architecture ka kharcha maante ho',
    'LLM feature ka per-call ganit kar sakte ho',
    'Cost per request ke badhne ko ek design signal padh sakte ho',
  ],
  homework: `Teen number nikalo: (1) pichhle mahine ka bill, (2) pichhle mahine ke
    requests, (3) dono ka bhaag — tumhara cost per million requests. Ab wahi teen
    number chhe mahine pehle ke liye nikalo. Agar cost per request badha hai,
    ek line kharch ki nahi, <b>design</b> ki hai — aur usko dhoondhna hi asli kaam hai.`,
  cards: [
    { front: 'Cost per request ka formula?', back: '<code>mahine ka bill ÷ mahine ke requests</code>. $258,000 ÷ 12 billion = $0.0000215 = <b>$21.50 per million</b>. Ab har design faisla ek hi paimane par tulta hai.' },
    { front: 'Cloud bill ke teen chhupe rakshas?', back: '<b>Egress</b> (data bahar — ilaaj CDN) · <b>NAT Gateway</b> (har GB — ilaaj VPC endpoints) · <b>cross-AZ</b> (dono taraf charge — ilaaj zone-aware routing). Teenon per-GB hain aur teenon <b>architecture</b> se aate hain.' },
    { front: 'Compute kitna hota hai bill mein?', back: "Workload par depend karta hai: GPU/CPU-heavy services mein compute sabse bada ho sakta hai. Is scenario mein 100 crore requests × 200 ms CPU = sirf $2,222 (poore mahine ke 1,200 crore requests ka ~$26,700). Bill $258,000 ka. Baaki sab data ka raasta hai — egress, NAT, cross-AZ, log ingest, managed services." },
    { front: 'LLM per-call cost?', back: '<code>(input tokens ÷ 1M × input rate) + (output tokens ÷ 1M × output rate)</code>. Output aksar input se <b>5x mehenga</b> — isliye pehla optimization "jawab chhota karo" hai, phir caching.' },
    { front: 'Unit economics ka test?', back: 'Users 2x → bill <b>1.6x</b> = sehatmand · bill 2x = chinta · bill <b>3x</b> = khatra. Cost per request badhna matlab kahin <b>super-linear</b> kaam hai (N+1, fan-out, cross-AZ, O(N²)) — bill se pehle <b>design</b> ki problem.' },
  ],
  interview: {
    title: 'Interview Round — Cost',
    instructions: 'Senior rounds mein "keemat kya hai" lagbhag hamesha poochha jaata hai. 🎤',
    questions: [
      {
        q: 'Tumhare design ki keemat kya hai?',
        choices: [
          'Workload ke hisaab se compute, storage, network aur services ka model banao',
          'Cloud calculator chalao; estimate ko actual production spend ka proof maano',
          'Finance ko hand over karo; architecture ka resource cost engineering ka kaam nahi',
          'Aaj ka instance bill lo; 10x users par wahi ratio har line item par lagega',
        ],
        answer: 0,
        explain: 'Workload assumptions ke saath bill components aur scale par growth likho. Calculator useful hai, par usage, prices aur omitted costs ka input sahi chahiye. Measurements se model milao; tiers aur bottlenecks cost curve badal sakte hain.',
        choiceExplanations: [
          'Workload assumptions ke saath bill components aur scale par growth likho. Calculator useful hai, par usage, prices aur omitted costs ka input sahi chahiye. Measurements se model milao; tiers aur bottlenecks cost curve badal sakte hain.',
          'Calculator ki accuracy assumptions aur complete line items par depend karti hai.',
          'Engineering decisions resource use aur request amplification badalte hain.',
          'Fixed tiers, shared limits aur badalta workload linear extrapolation tod sakte hain.',
        ],
      },
      {
        q: '"Hamara bill users se tez badh raha hai. Kahan se shuru karoge?"',
        choices: [
          'Useful work ka unit cost aur price/usage badlav ka time series milao',
          'Usage audit se pehle reservations lo; commitment hi growth ka seedha hal hai',
          'Sabse bada item delete karo; owner aur durability need ko baad mein dekho',
          'User count ko exact billing denominator maano; activity mix same hi hoga',
        ],
        answer: 0,
        explain: 'Bill growth ko requests, bytes, useful tasks, retention aur rate changes se attribute karo. Phir waste, commitments ya architecture ka fix chuno. Cleanup aur discounts recurring unit cost bhi badal sakte hain; measured cause se action tay karo.',
        choiceExplanations: [
          'Bill growth ko requests, bytes, useful tasks, retention aur rate changes se attribute karo. Phir waste, commitments ya architecture ka fix chuno. Cleanup aur discounts recurring unit cost bhi badal sakte hain; measured cause se action tay karo.',
          'Demand aur waste jaane bina commitment se spend lock ho sakta hai.',
          'Owner, data policy aur workload need jaane bina deletion data ya service tod sakta hai.',
          'Active use, payload aur feature mix se work per user badal sakta hai.',
        ],
      },
    ],
  },
},
]);

/* Multi-region ka mota model. RTT ke numbers asli aankdon ke aas-paas hain. */
function mrModel(k) {
  const R = k.regions;
  const rtt = k.spread ? [0, 120, 130, 140, 150][R - 1] : [0, 25, 30, 35, 40][R - 1];
  let write, survive;
  if (k.write === 0) { write = 5 + rtt * (R - 1) / R; survive = 'no'; }            /* ek global primary */
  else if (k.write === 1) { write = 5 + rtt; survive = R >= 3 ? 'yes' : 'no'; }    /* cross-region quorum */
  else { write = 5; survive = R >= 2 ? 'partial' : 'no'; }                          /* regional-by-row */
  const read = k.read === 1 ? 5 : (k.write === 2 ? 5 : 5 + rtt * (R - 1) / R);
  const stale = k.read === 1 ? Math.round(rtt / 2 + 50) : 0;
  return { rtt, write, read, survive, stale };
}

/* Canary sample-size ka model: n ~ 16 p(1-p) / delta^2 */
function canaryModel(k) {
  const TOTAL_RPS = 20000, P = 0.001;              /* 0.1% baseline error rate */
  const d = k.delta / 100;                          /* percentage points -> fraction */
  const n = (16 * P * (1 - P)) / (d * d);
  const rps = TOTAL_RPS * (k.canary / 100);
  return { n, rps, min: n / rps / 60 };
}

})();

/* =====================================================================
   F11 — BOSS: teen post, ek outage
   ===================================================================== */
(function () {
SD.registerLevels('feed', [
{
  id: 'boss-feed',
  icon: '👑',
  title: 'BOSS — Teen post, ek outage',
  badge: 'Incident Insaan',
  objectives: [
    'Har postmortem ka common aakaar pehchano — trigger, amplifier, blind spot',
    'Ek anjaan outage ko sirf sawaalon se todo',
    'Mitigate pehle, root cause baad mein — har baar',
    'Apna khud ka postmortem likhna: kya, kyun, aur ab kya badlega',
  ],
  lesson: [
    `<h3>👑 Paanch outage, ek hi dhaancha</h3>
     <p>Is track ke paanchon postmortem alag companies ke hain, alag saalon ke hain,
     aur alag technologies ke hain. Phir bhi paanchon ka <b>aakaar ek hi</b> hai.</p>
     <table>
       <tr><th>Outage</th><th>Trigger (chhota)</th><th>Amplifier (bada)</th><th>Blind spot</th></tr>
       <tr><td>Cloudflare 2025</td><td>ClickHouse permission change</td><td>hardcoded 200 limit + panic</td><td>config par koi validation nahi</td></tr>
       <tr><td>Cloudflare 2019</td><td>ek WAF regex</td><td>global deploy, bina bake ke</td><td>WAF ka apna kill switch nahi</td></tr>
       <tr><td>GitHub 2018</td><td>43 second ka partition</td><td>bina fencing ke failover</td><td>restore time kabhi naapa nahi gaya</td></tr>
       <tr><td>AWS Kinesis 2020</td><td>capacity add karna</td><td>O(N²) thread topology</td><td>thread count par koi alert nahi</td></tr>
       <tr><td>Roblox 2021</td><td>streaming flag</td><td>internal retry churn</td><td>monitoring khud Consul par</td></tr>
     </table>
     <p class="tip">🎯 Yeh teen column har outage mein hote hain, aur teenon ka
     ilaaj alag hai. <b>Trigger</b> rokna lagbhag namumkin hai — chhote badlav
     hamesha hote rahenge. <b>Amplifier</b> hi asli design ka kaam hai: bounds,
     staging, fencing, backoff. Aur <b>blind spot</b> monitoring ka kaam hai.</p>
     <h3>🧭 Anjaan outage todne ke chaar sawaal</h3>
     <pre>1. "Pichhle 30 minute mein kya DEPLOY hua?"
      code, config, permission, feature flag, migration, capacity — sab

2. "Kya failure ka koi PERIOD hai?"
      har 5 minute? phir kisi cron/refresh generator ko dekho

3. "Bahar ka load hataane par kya theek ho jaata hai?"
      nahi → death spiral, load andar se aa raha hai

4. "Kya main is system ko is system ke BINA dekh sakta hoon?"
      nahi → tumhari visibility bhi gir chuki hai, alag raasta chahiye</pre>`,
    `<h3>✍️ Postmortem likhne ka dhaancha</h3>
     <p>Achha postmortem doshi nahi dhoondhta. Achha postmortem <b>zanjeer</b>
     dikhata hai — kyunki har kadi apne aap mein sahi lagti thi.</p>
     <pre>1. ASAR      kitne users, kitni der, kya nahi chala   (numbers mein)
2. TIMELINE  har kadam ka waqt — deploy, alert, diagnosis, mitigation
3. ZANJEER   trigger → amplifier → blast radius, har kadi ka apna karan
4. DO NUMBER time to detect  aur  time to mitigate, alag-alag
5. AB KYA    har fix ke saamne likho: yeh kaunsi KADI todta hai</pre>
     <p>Paanchwa point sabse zyada chhoota jaata hai. "Aur alerts lagayenge" ek
     action item nahi hai. "Feature file ke row count par bound lagayenge taaki
     kharab file ban hi na sake" — <b>yeh</b> action item hai, kyunki woh ek
     naam wali kadi todta hai.</p>
     <p class="tip">🎯 Aur ek aakhri baat: <b>time to detect</b> aur <b>time to
     mitigate</b> hamesha alag likho. Cloudflare 2019 mein detect 3 minute tha
     aur mitigate 25 — us farak ne bata diya ki paisa monitoring mein nahi,
     kill switch mein lagana tha. Agar tum dono ko ek number ("27 minute") mein
     mila doge, woh seekh gayab ho jaayegi.</p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Boss part 1 — paanch galtiyan, ek platform',
      instructions: 'Ek naya platform. Isme is track ke paanch alag-alag sabak toote hue hain. Paanchon pakdo.',
      brief: `Ek payments platform. Sab kuch "best practice" jaisa dikhta hai —
        multi-region hai, monitoring hai, staged deploys hain, service discovery hai.
        Phir bhi is design mein paanch aisi kadiyaan hain jo tumne is track mein
        toot-te dekhi hain.`,
      goal: 'Paanch galtiyan pakdo. Har box ka faisla click par khulta hai.',
      nodes: [
        { id: 'flags', label: '🎚️ Feature flag service', sub: 'flags seconds mein poore fleet par — koi bake, koi canary nahi', row: 0 },
        { id: 'cfg', label: '📄 Pricing config pipeline', sub: 'har 10 min ek file banti hai, seedha proxies padhte hain', row: 0 },
        { id: 'lb', label: '⚖️ Load balancer', sub: 'health check fail hone par node hatata hai', row: 0 },
        { id: 'db', label: '🗄️ Primary DB + auto-failover', sub: 'health check 30 sec fail ho toh doosre region par promote', row: 1 },
        { id: 'disc', label: '🗺️ Service discovery', sub: 'sab services yahi use karti hain — retry immediate, bina backoff', row: 1 },
        { id: 'mon', label: '📊 Monitoring stack', sub: 'apne targets service discovery se dhoondhta hai', row: 2 },
        { id: 'cdn', label: '🌐 CDN', sub: 'static assets aur API responses (cacheable wale)', row: 2 },
      ],
      flaws: [
        { id: 'flags', why: 'Flags seconds mein poore fleet par jaate hain, bina bake aur bina canary ke. Wahi <b>Cloudflare 2019</b> ka WAF wala raasta — tez raasta rakhna theek hai, par uspar <b>bake ≥ alert time</b> aur ek-click kill switch chahiye.' },
        { id: 'cfg', why: 'Ek generated file jo seedha proxies padhte hain, bina schema aur row-count check ke. Wahi <b>Cloudflare 2025</b> ki zanjeer — config ek <b>input</b> hai. Bound lagao, aur file kharab lage toh <b>aakhri acchi file</b> par raho.' },
        { id: 'db', why: 'Auto-failover bina <b>fencing</b> ke. Wahi <b>GitHub 2018</b>: 30 second ka partition purane primary ko maarta nahi, sirf <b>kaat</b> deta hai — aur zinda purana primary writes leta rehta hai. Lease ya STONITH ke bina failover split brain ko design mein daal dena hai.' },
        { id: 'disc', why: 'Bina backoff ke immediate retry hi <b>death spiral ka indhan</b> hai. Wahi <b>Roblox 2021</b>: discovery dheemi hui, services ne aur zyada poochha, aur wahi extra load dheemapan badhata gaya. Har client par exponential backoff + jitter + circuit breaker chahiye.' },
        { id: 'mon', why: 'Monitoring apne targets <b>service discovery</b> se dhoondhta hai — yaani discovery girte hi visibility bhi gayi. Wahi <b>Roblox ka 46-ghante wala andhera</b> aur <b>Slack 2021</b> bhi (dashboards usi saturated network par the). Monitoring ka raasta hamesha alag hona chahiye.' },
      ],
      fine: {
        lb: 'Health check par node hataana bilkul sahi hai. Ek chetavni zaroor yaad rakho: agar <b>saare</b> nodes fail ho jayein toh sab hataane se poori service marti hai — isliye acche load balancers "panic mode" rakhte hain (Slack ne January 2021 mein wahi chalaya tha). Par design khud sahi hai.',
        cdn: 'CDN yahan bilkul sahi jagah par hai — woh latency bhi behtar karta hai aur origin ka egress bill bhi lagbhag khatam kar deta hai. Yeh un kam cheezon mein se hai jo performance aur cost dono jeet-ti hain.',
      },
      lesson: `🎯 Paanchon galtiyan alag layer par hain par ek hi sawaal ka jawab
        na dene se aati hain: <b>"jab yeh cheez galat nikle, tab kya hoga?"</b>
        Flag galat nikla — kitni der mein pata chalega aur kaise band hoga?
        Config file galat bani — kya woh proxies tak pahunchegi? Primary kat gaya
        par zinda hai — kya woh phir bhi likh sakta hai? Discovery dheemi hui —
        clients kya karenge? Discovery gira — kya main dekh paunga?`,
    },
    {
      type: 'replay',
      title: 'Boss part 2 — anjaan outage',
      instructions: 'Yeh kisi public postmortem se nahi hai. Sirf tumhare sawaal hain.',
      incident: 'Tumhara platform — aaj raat',
      goal: 'Bina kisi diye hue jawab ke, sirf sahi sawaalon se outage todo.',
      speedMs: 2200,
      metrics: [
        { id: 'err', label: 'Payment API error rate', unit: '%', max: 100, dir: 'lower' },
        { id: 'ok', label: 'Payments safal', unit: '%', max: 100, dir: 'higher' },
      ],
      frames: [
        { t: '21:40', event: 'Sab normal. Ek routine kaam chal raha hai — analytics team ne apne warehouse par permissions saaf kiye.', metrics: { err: 0.2, ok: 100 } },
        { t: '21:55', event: 'Payment API par 5xx <b>18%</b> par. Alert baja. CPU, memory, disk — teenon saaf hain.', metrics: { err: 18, ok: 82 }, tone: 'warn',
          ask: { q: 'CPU, memory aur disk theek hain, par 5xx 18% hai. Pehli useful jaanch kya hai?',
                 choices: [
                   'Naye badlav, affected endpoints aur dependency traces ka waqt milao',
                   'CPU theek hai, toh backend ke pools aur locks ki jaanch chhod do',
                   '18% errors hain, toh attacker ko root cause maan kar traffic roko',
                   'Aakhri change pehle aaya, toh correlation ko hi cause ka proof maano',
                 ], answer: 0,
                 explain: 'Code, config, permission, flags, migration aur capacity changes ka timeline impact se milao. Endpoint aur request traces se mechanism jaancho. Healthy CPU/memory pools, locks, network ya malformed config ko cause se nahi hataate.',
                 wrongHints: [
                   'Achha sawaal hai par woh lakshan batata hai, wajah nahi. Aur "kaunsa endpoint" ka jawab aksar "sab" hota hai.',
                   'Database dekhna zaroori hai — par pehle yeh jaan lo ki kya badla, warna tum har graph ek-ek karke dekhoge.',
                   'Attack ka anumaan lagbhag hamesha der karwaata hai. Pehle apne badlav dekho, phir bahar dekho.',
                 ] , choiceExplanations: [
                   'Code, config, permission, flags, migration aur capacity changes ka timeline impact se milao. Endpoint aur request traces se mechanism jaancho. Healthy CPU/memory pools, locks, network ya malformed config ko cause se nahi hataate.',
                   'Backend pool, quota ya I/O failure CPU headroom ke saath bhi aa sakti hai.',
                   'Code, config, dependency aur traffic changes bhi 18% errors laa sakte hain.',
                   'Timeline clue hai; artifact diff, reproduction aur safe mitigation ka evidence bhi chahiye.',
                 ],
               } },
        { t: '22:02', event: 'Deploy log: pichhle 2 ghante mein <b>koi code deploy nahi</b>. Ek permission change hua tha analytics warehouse par, 21:40 par.', metrics: { err: 22, ok: 78 }, tone: 'bad' },
        { t: '22:08', event: 'Error rate achanak <b>0.3%</b> par gir gaya. Sab normal dikh raha hai.', metrics: { err: 0.3, ok: 100 }, tone: 'ok' },
        { t: '22:18', event: 'Aur phir se <b>21%</b>. Team mein koi kehta hai "shayad koi attack hai".', metrics: { err: 21, ok: 79 }, tone: 'bad',
          ask: { q: 'Errors 10-minute cycle mein aa rahe hain. Kya jaanchna sahi hai?',
                 choices: [
                   'Periodic jobs, config versions, scaling aur routing ka waqt jaancho',
                   '10-minute cycle se ek specific generator ko cause pakka maan lo',
                   'Autoscale periodic nahi ho sakta; scaling events ko list se hata do',
                   'Errors periodic hain, toh request traffic ka role ab nahi ho sakta',
                 ], answer: 0,
                 explain: 'Periodic errors scheduled jobs, refresh, traffic ya scaling/routing oscillation ki jaanch ka clue hain. Timestamps aur file versions milao. Pattern akele ek generator ya attacker ka proof nahi hai.',
                 wrongHints: [
                   'Attack itna theek 10-minute period nahi rakhta. Yeh shak Cloudflare ki team ko bhi mehenga pada tha.',
                   'Autoscaler chal raha hai par instances healthy hain — failure request handle karte waqt ho rahi hai.',
                   'Ek kharab node hota toh error rate 21% par sthir rehta, aa-ja nahi raha hota.',
                 ] , choiceExplanations: [
                   'Periodic errors scheduled jobs, refresh, traffic ya scaling/routing oscillation ki jaanch ka clue hain. Timestamps aur file versions milao. Pattern akele ek generator ya attacker ka proof nahi hai.',
                   'Generator ke actual versions aur run times se evidence chahiye; periodicity akeli kaafi nahi.',
                   'Kuch scaling policies feedback ke kaaran oscillate kar sakti hain.',
                   'Cron clients, bursts aur coordinated refresh bhi periodic traffic bana sakte hain.',
                 ],
               } },
        { t: '22:25', event: 'Pricing config pipeline mili — har 10 minute par ek file banti hai, aur uski query analytics warehouse se columns padhti hai. 21:40 ke permission change ke baad rows <b>doguni</b> ho gayi hain.', metrics: { err: 21, ok: 79 }, tone: 'bad',
          ask: { q: 'Wajah mil gayi. Ab pehla kadam — permission change wapas lena ya kuch aur?',
                 choices: [
                   'Bad generation roko; verified acchi file par safe pin ka risk jaancho',
                   'Permission rollback ho hi nahi sakta; trigger ko palatna galat hi hai',
                   'Service restart karo; malformed file ka contract khud sahi ho jaayega',
                   'Naya proxy release pehle banao; reversible relief ko abhi wait karao',
                 ], answer: 0,
                 explain: 'Verified acchi file par pin karke bad generation rokna chhoti mitigation ho sakti hai. File ki validity aur stale-pricing risk jaancho. Permission rollback bhi option ho sakta hai; evidence aur side effects se safest available action chuno.',
                 wrongHints: [
                   'Trigger tha, par galat nahi tha. Sahi kaam ko palatna sabak bhi galat sikhaata hai — asli kadi validation ki kami thi.',
                   'Outage ke dauraan naya code deploy karna ek naya khatra hai. Aur usme minutes lagenge, jabki file pin karna seconds ka kaam hai.',
                   'Restart karne par service wahi kharab file dobara padh legi — 10 minute baad phir wahi haal.',
                 ] , choiceExplanations: [
                   'Verified acchi file par pin karke bad generation rokna chhoti mitigation ho sakti hai. File ki validity aur stale-pricing risk jaancho. Permission rollback bhi option ho sakta hai; evidence aur side effects se safest available action chuno.',
                   'Trigger rollback bhi valid mitigation ho sakti hai; doosre effects aur evidence dekh kar chuno.',
                   'Restart wahi kharab config phir load kar sakta hai; contract repair nahi hota.',
                   'Safe reversible relief permanent fix se pehle asar ghata sakti hai.',
                 ],
               } },
        { t: '22:29', event: 'Config generation ruka, aakhri acchi file pin ho gayi. Error rate <b>0.2%</b>. Payments normal.', metrics: { err: 0.2, ok: 100 }, tone: 'ok',
          ask: { q: 'Outage khatam. Postmortem mein kaunsa action item sabse zaroori hai?',
                 choices: [
                   'Schema/size bounds aur safe fallback ka behavior likho, owner aur test do',
                   'Team zyada dhyaan degi, bas isi iraade ko action complete maan lo',
                   'Upstream team warn karegi, isi agreement se bad config ka risk hal hai',
                   'Alert count badhao; detected bad file par response ko define mat karo',
                 ], answer: 0,
                 explain: 'Action causal chain ka behavior badle: invalid file reject ho, known-good fallback policy ho aur verification test ho. Owner aur completion criteria likho. Alerts aur coordination useful hain jab actionable mechanism aur response saaf ho.',
                 wrongHints: [
                   'Alert ne yahan kaam kiya hi tha — 21:55 par baja. Problem detection ki nahi thi.',
                   'Communication behtar karna accha hai, par yeh design fix nahi hai — aur agli baar badlav kisi teesri team se aayega.',
                   'Team ne theek diagnose kiya. Training ka masla nahi tha.',
                 ] , choiceExplanations: [
                   'Action causal chain ka behavior badle: invalid file reject ho, known-good fallback policy ho aur verification test ho. Owner aur completion criteria likho. Alerts aur coordination useful hain jab actionable mechanism aur response saaf ho.',
                   'Dhyaan dene ka iraada enforceable mechanism aur test ki jagah nahi leta.',
                   'Human coordination help karti hai; consumer ko input bounds phir bhi chahiye.',
                   'Alert tab kaam ka hai jab signal aur containment/recovery response tay ho.',
                 ],
               } },
      ],
      lesson: `👑 Tumne outage bina kisi diye hue jawab ke toda — sirf chaar
        sawaalon se: <b>kya deploy hua</b> (code se aage dekhkar),
        <b>kya koi period hai</b> (generator dhoondhkar), <b>kaunsa kadam sabse
        sasta aur sabse tez palatta hai</b>, aur <b>kaunsa action item ek naam
        wali kadi todta hai</b>. Yahi chaar sawaal is poore track ka nichod hain.`,
    },
    {
      type: 'quiz',
      title: 'Boss part 3 — sabak jodo',
      questions: [
        {
          q: 'Trigger, amplifier aur blind spot mein design improvement kahan hoti hai?',
          choices: [
            'Trigger, amplification aur visibility/recovery sab par design sudhaaro',
            'Design ka kaam bas amplifier hai; trigger aur telemetry alag baat hain',
            'Observability sirf monitoring team ki hai; app design ka role nahi',
            'Trigger ko roko; baaki failure paths ka design phir zaroori nahi',
          ],
          answer: 0,
          explain: 'Safer changes trigger ka risk, bounds/staging amplifier aur independent telemetry blind spots ghata sakte hain. Recovery ka tested raasta bhi design hai. Prevention, detection aur mitigation saath kaam karte hain.',
          choiceExplanations: [
            'Safer changes trigger ka risk, bounds/staging amplifier aur independent telemetry blind spots ghata sakte hain. Recovery ka tested raasta bhi design hai. Prevention, detection aur mitigation saath kaam karte hain.',
            'Input contracts aur safe rollout triggers bhi design se sudharte hain.',
            'Telemetry ki dependencies aur coverage application architecture se judti hain.',
            'Unexpected failures aa sakti hain; impact bound aur recovery phir bhi chahiye.',
          ],
        },
        {
          q: 'Naye system ke failure review ka ek useful starting question kya hoga?',
          choices: [
            'Failure hua toh outcome kya hoga, aur recovery kin assumptions par tiki hai?',
            'Ek hi review question poochh liya, toh har risk aur requirement cover ho gayi',
            'Maximum scale poochho; capacity se correctness aur resilience dono prove hain',
            'p99 poochho; fast reply se data-loss risk bhi safe prove ho jaata hai',
          ],
          answer: 0,
          explain: 'Failure outcome ka sawaal bounds, fallback, fencing, retries aur emergency access kholta hai. Useful starting question hai; full review mein invariants, capacity, security, latency aur cost bhi chahiye.',
          choiceExplanations: [
            'Failure outcome ka sawaal bounds, fallback, fencing, retries aur emergency access kholta hai. Useful starting question hai; full review mein invariants, capacity, security, latency aur cost bhi chahiye.',
            'Ek question complete review ki guarantee nahi deta; system scope aur requirements bhi dekhni hain.',
            'Scale target meet hone par bhi partial failure ya retry se wrong effects ho sakte hain.',
            'Fast response galat write ya unsafe durability ka risk chhupa sakta hai.',
          ],
        },
        {
          q: 'Postmortem mein time to detect aur time to mitigate ko alag likhna kyun zaroori hai?',
          choices: [
            'Detection aur response ke alag delays alag controls ki taraf le jaate hain',
            'Har incident mein detection aur mitigation ko same fix ki zaroorat hoti hai',
            'SLA duration se root cause aur recovery bottleneck khud nikal aate hain',
            'Dono intervals likhne ka matlab dono ki owner teams alag honi hi chahiye',
          ],
          answer: 0,
          explain: 'Detection, diagnosis, decision, access aur execution ke times alag likho. Cloudflare 2019 mein alert deploy ke 3 minute baad aur WAF off 25 minute baad hua. Timings se pata chalta hai ki kaunse delay ka sudhaar faayda dega.',
          choiceExplanations: [
            'Detection, diagnosis, decision, access aur execution ke times alag likho. Cloudflare 2019 mein alert deploy ke 3 minute baad aur WAF off 25 minute baad hua. Timings se pata chalta hai ki kaunse delay ka sudhaar faayda dega.',
            'Fast alert ke baad bhi access ya rollback atak sakta hai; controls alag chahiye.',
            'Total impact duration se beech ka bottleneck pata nahi chalta.',
            'Ownership organization par depend karti hai; maqsad causal timeline samajhna hai.',
          ],
        },
        {
          q: 'Postmortem action ki quality kaise jaanchoge?',
          choices: [
            'Causal mechanism, expected behavior, owner aur verification saaf ho',
            'Deadline likhi hai, toh action recurrence ko rokega, test extra hai',
            'Owner assign hai, toh correction ka mechanism bhi sahi prove hai',
            'Aur alerts lagao; specific signal aur response ka kaam baad mein dekho',
          ],
          answer: 0,
          explain: 'Achha action known causal path ko address karta hai aur expected behavior test karne deta hai. Owner, priority aur deadline follow-through laate hain. Specific signal aur runbook wale alerts bhi valid action ho sakte hain.',
          choiceExplanations: [
            'Achha action known causal path ko address karta hai aur expected behavior test karne deta hai. Owner, priority aur deadline follow-through laate hain. Specific signal aur runbook wale alerts bhi valid action ho sakte hain.',
            'Time par complete hua action ineffective bhi ho sakta hai; behavior verify karna hai.',
            'Accountability zaroori hai, par corrective mechanism aur evidence phir bhi chahiye.',
            'Actionable condition aur response ke bina alert count protection prove nahi karta.',
          ],
        },
        {
          q: 'Is poore track ka sabse zyada dohraya gaya sabak kaunsa hai?',
          choices: [
            'Critical telemetry aur recovery ke shared failure paths dhoondh kar kaato',
            'Har tool ko har shared dependency se hata do; risk review ka kaam poora',
            'Automatic failover mana karo; authority protocol ka benefit nahi hota',
            'Headroom badhao; malformed config ka failure path bhi khud safe ho jaayega',
          ],
          answer: 0,
          explain: 'Emergency mein system ko dekhne aur repair karne ka path reachable hona chahiye. Critical network, auth aur discovery dependencies ka common failure jaancho. Independence ko actual risks se test karo; sirf alag dashboard banaana kaafi nahi.',
          choiceExplanations: [
            'Emergency mein system ko dekhne aur repair karne ka path reachable hona chahiye. Critical network, auth aur discovery dependencies ka common failure jaancho. Independence ko actual risks se test karo; sirf alag dashboard banaana kaafi nahi.',
            'Absolute share-nothing mushkil ho sakta hai; critical common failure paths aur fallback pehchaano.',
            'Correct authority transfer aur durability ke saath safe automatic failover possible hai.',
            'Headroom malformed input validate nahi karta aur broken recovery path nahi banaata.',
          ],
        },
      ],
    },
  ],
  success: [
    'Kisi bhi postmortem ko trigger / amplifier / blind spot mein tod sakte ho',
    'Anjaan outage ko chaar sawaalon se diagnose kar sakte ho',
    'Mitigation ke liye sabse sasta, sabse tez palatne wala kadam chunte ho',
    'Aisa postmortem likh sakte ho jiske action items naam wali kadiyaan todte hain',
  ],
  homework: `Apni team ka aakhri postmortem kholo aur usko teen column mein
    likho — trigger, amplifier, blind spot. Phir har action item ke saamne likho
    ki woh kaunsi kadi todta hai. Jis action item ke saamne kuch nahi likh paoge,
    woh ek iraada hai, fix nahi — aur woh agli baar bhi nahi bachayega.`,
  cards: [
    { front: 'Har outage ke teen hisse?', back: '<b>Trigger</b> (chhota, aksar sahi kaam) → <b>amplifier</b> (design ki kadi jo usse bada karti hai) → <b>blind spot</b> (jiski wajah se diagnosis atki). Design ka kaam <b>amplifier</b> hai — trigger rokna namumkin hai.' },
    { front: 'Anjaan outage ke chaar sawaal?', back: '1. Pichhle 30 min mein kya <b>deploy</b> hua (code + config + permission + flag + migration + capacity)? 2. Failure ka koi <b>period</b> hai? 3. Bahar ka load hatane par theek hota hai? 4. Kya main is system ko iske <b>bina</b> dekh sakta hoon?' },
    { front: 'Mitigation ka kadam kaise chunte ho?', back: 'Teen kasautiyan: <b>chhota</b> ho, <b>turant palat</b> sake, aur <b>naya khatra</b> na laaye. Isiliye flag band karna &gt; naya code deploy karna &gt; upgrade karna.' },
    { front: 'Achha action item kaisa hota hai?', back: 'Ek <b>naam wali kadi</b> todta hai — "row-count bound lagao taaki kharab file ban hi na sake". Bura action item ek <b>iraada</b> hai — "aur alerts lagayenge", "zyada dhyan denge".' },
    { front: 'Track ka sabse dohraya gaya sabak?', back: 'Emergency ka raasta girne wale system se <b>alag</b> ho. Cloudflare 2019 (apne tools), Roblox 2021 (telemetry Consul par — 46 ghante andhera), Slack 2021 (dashboards saturated network par) — teenon.' },
  ],
  interview: {
    title: 'Interview Round — Incident review',
    instructions: 'Staff aur principal rounds mein aksar aakhri sawaal yahi hota hai. 🎤',
    questions: [
      {
        q: '"Mujhe ek outage ke baare mein batao jispar tumne kaam kiya."',
        choices: [
          'User impact, timeline, mechanism, evidence aur verified fixes batao',
          'Apna root-cause credit batao; user impact aur team ka role chhodo',
          'Sabse dramatic outage chuno; scale hi engineering learning dikhata hai',
          'Uncertainty hata do; confident story mein unresolved hypotheses mat rakho',
        ],
        answer: 0,
        explain: 'Impact numbers, timeline aur causal chain ko evidence ke saath batao. Detection aur mitigation alag dikhao; fixes ka verification aur open uncertainty saaf rakho. Chhota incident bhi gehri learning dikha sakta hai.',
        choiceExplanations: [
          'Impact numbers, timeline aur causal chain ko evidence ke saath batao. Detection aur mitigation alag dikhao; fixes ka verification aur open uncertainty saaf rakho. Chhota incident bhi gehri learning dikha sakta hai.',
          'Team coordination aur measured outcomes sirf credit claim se zyada useful evidence hain.',
          'Incident ka size understanding ki quality tay nahi karta.',
          'Observed fact aur unresolved hypothesis alag rakhne se reasoning assess ho sakti hai.',
        ],
      },
      {
        q: '"Tum apni team mein reliability kaise badhaoge?"',
        choices: [
          'Pichhle risks ko prioritize karo; safeguards aur user outcomes verify karo',
          'Alert count badhao; zyada alerts reliability improve hone ka proof hain',
          'Test coverage percent badhao; user SLO meet hone ka proof mil jaayega',
          'On-call rotation badlo; shared bottleneck ka technical risk hal ho jaayega',
        ],
        answer: 0,
        explain: 'Incidents aur near misses se trigger, amplifier, blind spots aur recovery gaps dhoondho. Priority dekar safeguards lagao aur drills/user metrics se verify karo. Alerts, tests aur on-call changes ka faayda actual outcome se naapo.',
        choiceExplanations: [
          'Incidents aur near misses se trigger, amplifier, blind spots aur recovery gaps dhoondho. Priority dekar safeguards lagao aur drills/user metrics se verify karo. Alerts, tests aur on-call changes ka faayda actual outcome se naapo.',
          'Noisy ya unactionable alerts response ko aur mushkil bana sakte hain.',
          'Line coverage relevant fault cases aur business invariants cover hona prove nahi karti.',
          'Rotation useful ho sakti hai; shared technical bottleneck ko alag badalna padta hai.',
        ],
      },
    ],
  },
},
]);
})();
