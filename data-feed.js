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
                 choices: ["Changes and impact timeline correlate","5xx se DDoS cause proven maan lo","Only CPU dashboard se cause choose karo","First customer report ko root cause bolo"], answer: 0,
                 explain: 'Cloudflare ka apna postmortem yahi kehta hai. Outage ka trigger <b>code deploy</b> nahi tha, ek <b>permission change</b> tha — isliye "kya deploy hua" ka jawab sirf code tak mat rakho. Config, permission, flag, migration — sab deploy hain.',
                 wrongHints: [
                   'DDoS ka shak yahin par team ko mehenga pada — flickering failure attack jaisi dikhti hai, par attack thi nahi.',
                   'Customer-wise cut kaam ka hai, par outage har customer par tha — cut se koi pattern nahi milta.',
                   'CPU aur memory bilkul theek the. Process panic kar raha tha, thak nahi raha tha.',
                 ] , choiceExplanations: ["Cloudflare ka apna postmortem yahi kehta hai. Outage ka trigger <b>code deploy</b> nahi tha, ek <b>permission change</b> tha — isliye \"kya deploy hua\" ka jawab sirf code tak mat rakho. Config, permission, flag, migration — sab deploy hain.","Attack plausible hai; traffic and change evidence se distinguish karo.","CPU symptom hai; config, permissions and network failures bhi inspect karo.","Report impact signal hai; mechanism and timeline abhi verify karni hai."] } },
        { t: '11:35', event: 'Sewa <b>apne aap theek</b> ho gayi — us baar file ek purane ClickHouse node se bani thi.', metrics: { err: 4, served: 96, feat: 60 }, tone: 'warn' },
        { t: '11:40', event: 'Aur dobara gir gayi. Har 5 minute par file ya to kharab node se ban rahi hai ya theek node se.', metrics: { err: 58, served: 42, feat: 240 }, tone: 'bad',
          ask: { q: "Failure repeats every 5 minutes. What hypothesis-driven check is useful?",
                 choices: ["Inspect periodic jobs and artifacts","5 minute pattern seattack proven maano","5 minute pattern se autoscaler proven maano","5 minute pattern se one bad node proven maano"], answer: 0,
                 explain: "Periodic failure suggests checking periodic jobs, rolling artifact generation, autoscale or time-based load. In this Cloudflare case alternating query results generated good/bad files. The symptom alone does not prove that mechanism.",
                 wrongHints: [
                   'Attack ka shak team ne bhi kiya — aur usi shak par kaafi waqt gaya. Attack itna theek 5-minute period nahi rakhta.',
                   'Autoscaler chal raha tha par saaf tha; instances healthy the, process panic kar raha tha.',
                   'Ek kharab node hota toh sirf uske requests girte, poora network nahi.',
                 ] , choiceExplanations: ["Periodic failure suggests checking periodic jobs, rolling artifact generation, autoscale or time-based load. In this Cloudflare case alternating query results generated good/bad files. The symptom alone does not prove that mechanism.","Periodic failure internal generation bhi ho sakti hai; attack evidence chahiye.","Scaling events and saturation correlate kiye bina conclusion premature hai.","Node routing and artifact versions inspect karke hypothesis test karo."] } },
        { t: '13:05', event: 'Workers KV ko kharab raaste se <b>bypass</b> kiya gaya — asar thoda kam hua.', metrics: { err: 34, served: 66, feat: 240 }, tone: 'warn' },
        { t: '14:30', event: 'Sahi feature file manually daali gayi aur naye file generation ko rok diya gaya. <b>Core traffic chal pada.</b>', metrics: { err: 3, served: 97, feat: 60 }, tone: 'ok',
          ask: { q: 'Aage aisa dobara na ho — sabse zaroori ek badlav kaunsa hai?',
                 choices: ["Validate; reject bad; keep last good","Only limit 200 ko 2000 kar dena enough","Only permission rollback future proof hai","expect replaces unwrap so panic cannot ho"], answer: 0,
                 explain: 'Limit badhana sirf agli baar ka waqt aage khiskata hai — 2000 bhi ek din chhota pad sakta hai. Permission change <b>sahi</b> tha. Asli fix wahi hai jo Cloudflare ne likha: <b>config ko input maano</b> — validate karo, bound lagao, aur naya config kharab ho toh aakhri accha config chalne do.',
                 wrongHints: [
                   'Limit badhana ek naya bada number chunna hai, problem nahi hatana. Aur 2000 rows wali file bhi kabhi ban sakti hai.',
                   'Permission change security ke liye sahi tha. Sahi kaam rokna galat sabak hai.',
                   '<code>expect()</code> se message accha aata hai, par process phir bhi panic karta hai. Outage ka size wahi rehta hai.',
                 ] , choiceExplanations: ["Limit badhana sirf agli baar ka waqt aage khiskata hai — 2000 bhi ek din chhota pad sakta hai. Permission change <b>sahi</b> tha. Asli fix wahi hai jo Cloudflare ne likha: <b>config ko input maano</b> — validate karo, bound lagao, aur naya config kharab ho toh aakhri accha config chalne do.","Higher limit invalid producer/consumer contract ko fix nahi karta.","Rollback mitigation hai; future malformed input still possible.","expect on Err bhi panic karta hai; message clearer hona recovery nahi."] } },
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
        { id: 'file', why: 'Feature file par koi <b>row-count ya schema check</b> nahi hai. Yahi woh jagah hai jahan poora outage 30 second mein ruk sakta tha: "rows 60 se 240 ho gayin? file mat bhejo, alert karo."' },
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
          choices: ["Validate bounds; version; safe last-good policy","Latest file ko validation bina accept karo","Every changed checksum ko valid maan lo","Internal producer ko trusted infinite input do"],
          answer: 0,
          explain: 'Checksum alert accha hai par sirf <b>batata</b> hai, <b>rokta</b> nahi. Cloudflare ka apna remediation shabd yahi tha: apne generate kiye config files ko usi tarah harden karo jaise user-generated input ko. Aur galat config par <b>purane config par rehna</b> outage ko alert mein badal deta hai.',
         choiceExplanations: ["Checksum alert accha hai par sirf <b>batata</b> hai, <b>rokta</b> nahi. Cloudflare ka apna remediation shabd yahi tha: apne generate kiye config files ko usi tarah harden karo jaise user-generated input ko. Aur galat config par <b>purane config par rehna</b> outage ko alert mein badal deta hai.","Latest malformed artifact whole fleet ko break kar sakta hai.","Checksum integrity/change detect karta hai; schema/semantic validity nahi.","Internal components bhi bad config generate kar sakte hain."] },
        {
          q: '200 features ki limit thi, istemaal 60 tha. Yeh limit "surakshit" kyun lagti thi, aur asli dikkat kya thi?',
          choices: ["Exceeding resource limit must fail safely","2000 limit alone every future input safe","Dynamic allocation alone total memory bound","Preallocation makes validation unnecessary"],
          answer: 0,
          explain: 'Koi bhi number ek din chhota pad sakta hai. Farak isse padta hai ki number tootne par kya hota hai: <b>panic</b> (poora outage) ya <b>degrade</b> (alert + purani file). Pre-allocation ek bilkul jaayaz performance optimization hai — galti sirf uske failure mode mein thi.',
         choiceExplanations: ["Koi bhi number ek din chhota pad sakta hai. Farak isse padta hai ki number tootne par kya hota hai: <b>panic</b> (poora outage) ya <b>degrade</b> (alert + purani file). Pre-allocation ek bilkul jaayaz performance optimization hai — galti sirf uske failure mode mein thi.","Any finite limit exceed ho sakti hai; failure handling define karo.","Dynamic memory still exhaustion/DoS risk rakhti hai.","Preallocated capacity needs length/schema validation."] },
        {
          q: 'Outage har 5 minute par aa-ja raha tha. Team ko attack ka shak kyun hua?',
          choices: ["Alternating good/bad files attack jaisa flicker","Postmortem confirmed malicious DDoS traffic","Only old attack alert caused permission change","Attack likelihood proves no need artifact diff"],
          answer: 0,
          explain: 'ClickHouse nodes ek-ek karke update ho rahe the, isliye har 5-minute wale generation par sikka uchhalta tha: accha node ya kharab node. Sabak: <b>flapping failure</b> dekho toh generator ka period dhoondo — 5 minute ka cycle Bot Management ki 5-minute file thi.',
         choiceExplanations: ["ClickHouse nodes ek-ek karke update ho rahe the, isliye har 5-minute wale generation par sikka uchhalta tha: accha node ya kharab node. Sabak: <b>flapping failure</b> dekho toh generator ka period dhoondo — 5 minute ka cycle Bot Management ki 5-minute file thi.","Cloudflare reported incident was not caused by attack.","Permission rollout and query metadata change were trigger.","Artifact contents/version timeline causal evidence deti hai."] },
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
        choices: ["Generate; validate; version; canary; safe fallback","Generate then push everywhere before any check","Latest filename overwrites only recovery copy","Restart fleet to validate config in production"],
        answer: 0,
        explain: 'Chaar cheezein zaroori hain: <b>validation</b> (kharab artifact bane hi nahi), <b>versioning</b> (wapas jaana ho sake), <b>staged rollout</b> (blast radius chhota), aur <b>last-known-good fallback</b> (kharab artifact aa bhi jaaye toh service chalti rahe). Option 2 mein chaaron mein se ek bhi nahi hai — aur wahi Cloudflare wala aakaar hai.',
       choiceExplanations: ["Chaar cheezein zaroori hain: <b>validation</b> (kharab artifact bane hi nahi), <b>versioning</b> (wapas jaana ho sake), <b>staged rollout</b> (blast radius chhota), aur <b>last-known-good fallback</b> (kharab artifact aa bhi jaaye toh service chalti rahe). Option 2 mein chaaron mein se ek bhi nahi hai — aur wahi Cloudflare wala aakaar hai.","Producer validation and bounded canary reduce blast radius.","Keep recoverable last-known-good/version history.","Restarting invalid config can spread outage instead of isolate."] },
      {
        q: '"Tumhare service mein ek hardcoded limit hai. Interviewer poochhta hai — limit kitni honi chahiye?"',
        choices: ["Limit behavior and evidence before sizing","Always 10x current usage means forever safe","Remove limit and memory becomes unlimited","Configurable limit requires no monitoring"],
        answer: 0,
        explain: 'Yeh jawab interviewer ko batata hai ki tum limit ko ek <b>reliability</b> ka sawaal maante ho, ek <b>tuning</b> ka nahi. 10x rakhna aur limit config se lena dono theek ideas hain, par dono mein bhi limit tootne par kya hoga — wahi asli sawaal reh jaata hai.',
       choiceExplanations: ["Yeh jawab interviewer ko batata hai ki tum limit ko ek <b>reliability</b> ka sawaal maante ho, ek <b>tuning</b> ka nahi. 10x rakhna aur limit config se lena dono theek ideas hain, par dono mein bhi limit tootne par kya hoga — wahi asli sawaal reh jaata hai.","Unexpected producer/schema changes headroom exceed kar sakte hain.","Physical resource bounds and input budgets still apply.","Config changes themselves can fail; bounds and saturation monitor karo."] },
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
          ask: { q: "Global CPU spike occurs together. What is a defensible first diagnostic?",
                 choices: ["Correlate global changes and traffic evidence","Simultaneous CPU means deploy definitely","Traffic cannot change across regions together","Network issue can never raise local CPU"], answer: 0,
                 explain: "Sudden correlated CPU saturation motivates checking global deployments/config and traffic changes. A large attack or shared-client behavior can also correlate globally; deploy is a hypothesis, not proven by simultaneity alone.",
                 wrongHints: [
                   'DDoS itna ekdum aur itna saman har jagah nahi hota — aur DDoS mein traffic badhta hai, CPU-per-request nahi.',
                   'Upstream failure mein traffic gir jaata, CPU bhi gir jaata. Yahan CPU chad gaya — matlab kaam zyada ho raha hai.',
                   'Memory leak dheere aata hai aur machine-dar-machine aata hai. Yeh ek second mein har jagah hua.',
                 ] , choiceExplanations: ["Sudden correlated CPU saturation motivates checking global deployments/config and traffic changes. A large attack or shared-client behavior can also correlate globally; deploy is a hypothesis, not proven by simultaneity alone.","Common attack/traffic events bhi correlated global symptoms la sakte hain.","Global events, shared clients or attack traffic correlate ho sakta hai.","Retries/reconnects/spin can raise CPU after network failure."] } },
        { t: '13:45', event: 'Pehla PagerDuty alert. <b>Detection: 3 minute.</b>', metrics: { cpu: 99, served: 4 }, tone: 'bad' },
        { t: '14:00', event: 'WAF ko culprit pehchana gaya. Team ko apne hi internal tools tak pahunchne mein dikkat aa rahi hai — woh tools bhi Cloudflare ke peeche hain.', metrics: { cpu: 99, served: 5 }, tone: 'bad',
          ask: { q: "Cloudflare 2019 known bad WAF execution identified. Safe mitigation decision?",
                 choices: ["Known bad WAF path ko safe kill switch se stop","Always disable every security control on5 xx","Fix regex live before restoring any capacity","Move traffic to same poisoned global config"], answer: 0,
                 explain: "In the reported incident disabling known-bad WAF execution was mitigation. General incidents require explicit security/availability risk assessment and a tested independent kill switch. Do not teach disabling all security as universal response to5 xx.",
                 wrongHints: [
                   'Sahi soch, par dheemi. Us waqt kaunsa rule kharab hai yeh nishchit nahi tha — poora WAF band karna ek hi kadam mein pakka tha.',
                   'Naya deploy karna usi tez raaste ka istemaal hai jo abhi outage kar chuka hai. Girte hue system par naya code mat bhejo.',
                   'CPU har datacenter par 100% tha — shift karne ke liye koi khaali datacenter tha hi nahi.',
                 ] , choiceExplanations: ["In the reported incident disabling known-bad WAF execution was mitigation. General incidents require explicit security/availability risk assessment and a tested independent kill switch. Do not teach disabling all security as universal response to5 xx.","Mitigation incident-specific security/product tradeoff needs owner approval.","Known reversible mitigation faster ho sakti hai; repair then controlled rollout.","Same artifact all regions mein ho toh reroute enough nahi."] } },
        { t: '14:07', event: 'WAF poori duniya par band. <b>CPU turant normal.</b>', metrics: { cpu: 34, served: 88 }, tone: 'ok' },
        { t: '14:09', event: 'Traffic poori tarah normal. Kul outage: <b>27 minute</b>.', metrics: { cpu: 31, served: 100 }, tone: 'ok',
          ask: { q: 'Detection 3 minute mein hui par recovery 25 minute mein. Aage sabse zyada waqt kaunsa badlav bachayega?',
                 choices: ["Independent tested mitigation path improve karo","Only faster alert removes 25 min recovery cost","Only more on call removes access dependency","Only RE2 creates an emergency control plane"], answer: 0,
                 explain: 'Alert pehle hi 3 minute mein aa gaya tha — wahan bachane ko sirf 2 minute hain. <b>22 minute</b> "kya karein aur kaise band karein" mein gaye. RE2 is <b>khaas</b> bug ko rokta hai (aur Cloudflare ne kiya bhi), par agla bug kisi aur shakl mein aayega — kill switch har shakl par kaam karta hai.',
                 wrongHints: [
                   'Detection pehle hi 3 minute thi. 27 mein se sirf 3 wahan the — bachat 2 minute ki hogi, 22 ki nahi.',
                   'RE2 bilkul sahi fix hai aur Cloudflare ne kiya — par RE2 sirf regex-shakl ke bug rokta hai. Kill switch har shakl par chalta hai.',
                   'Log kam nahi the. Faisla aur pahunch (access) ki der thi, haath ki nahi.',
                 ] , choiceExplanations: ["Alert pehle hi 3 minute mein aa gaya tha — wahan bachane ko sirf 2 minute hain. <b>22 minute</b> \"kya karein aur kaise band karein\" mein gaye. RE2 is <b>khaas</b> bug ko rokta hai (aur Cloudflare ne kiya bhi), par agla bug kisi aur shakl mein aayega — kill switch har shakl par kaam karta hai.","Detection 3 min already small; recovery path dominant given data.","Extra responders bhi same broken tools/access path par block ho sakte hain.","Linear-time engine recurrence risk helps; kill-switch access is separate."] } },
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
        q: 'Tumhari team kehti hai "hamara deploy staged hai — 5% canary, phir global". Ek aur sawaal poochho jiske bina yeh dawa adhoori hai. Kaunsa?',
        choices: ["Bake time vs detection and workload coverage","Canary percentage alone proves safe rollout","One region proves every customer query tested","Rollback exists so canary observation irrelevant"],
        answer: 0,
        explain: 'Canary ka percentage sirf aadhi baat hai. Canary tabhi kaam karta hai jab uspar <b>itni der</b> ruko ki problem <b>dikh</b> jaaye. 5% canary par 30 second rukna aur seedha global jaana — woh technically staged hai, par practically global deploy hai. Baaki teenon sawaal bhi acche hain, par bina <code>bake ≥ alert</code> ke woh sab bekaar hain.',
       choiceExplanations: ["Canary ka percentage sirf aadhi baat hai. Canary tabhi kaam karta hai jab uspar <b>itni der</b> ruko ki problem <b>dikh</b> jaaye. 5% canary par 30 second rukna aur seedha global jaana — woh technically staged hai, par practically global deploy hai. Baaki teenon sawaal bhi acche hain, par bina <code>bake ≥ alert</code> ke woh sab bekaar hain.","Signal observe hone se pehle promote karo toh canary protection weak hai.","Representative load, rare paths and region-specific behavior cover karo.","Rollback helps, but detection and safe trigger still needed."] },
    },
    {
      type: 'quiz',
      title: 'Regex, rollout, kill switch',
      questions: [
        {
          q: "Catastrophic backtracking risk ke liye stronger default defense?",
          choices: ["Linear-time engine plus pattern/input budgets","Review alone mathematically bounds all regex","Input cap alone makes any size safe","Timeout guarantees no CPU is consumed"],
          answer: 0,
          explain: "RE2 and Rust regex use algorithms that avoid catastrophic backtracking for supported syntax. Pattern compilation, size and input budgets still matter. Linear-in-input matching does not mean unbounded inputs or patterns consume no resources.",
         choiceExplanations: ["RE2 and Rust regex use algorithms that avoid catastrophic backtracking for supported syntax. Pattern compilation, size and input budgets still matter. Linear-in-input matching does not mean unbounded inputs or patterns consume no resources.","Humans pathological cases miss kar sakte hain.","Chosen max input can still be too expensive for backtracking.","Timeout bounds duration when supported; CPU work still consumed."] },
        {
          q: 'WAF rules ko normal code ke staged rollout se bahar kyun rakha gaya tha — aur woh faisla galat kyun tha?',
          choices: ["Fast lane lacked equivalent safety gates","Data rules inherently cannot be tested","Every employee had unrestricted prod deploy","Normal staged pipeline did not yet exist"],
          answer: 0,
          explain: 'Tez raasta rakhna <b>sahi</b> faisla tha — security response mein minutes matter karte hain. Galti tez raaste par safety net na hona thi. Tez raaste ke liye safety alag dikhti hai: chhota canary + chhota bake + <b>ek-click kill switch</b>, na ki lamba staged pipeline.',
         choiceExplanations: ["Tez raasta rakhna <b>sahi</b> faisla tha — security response mein minutes matter karte hain. Galti tez raaste par safety net na hona thi. Tez raaste ke liye safety alag dikhti hai: chhota canary + chhota bake + <b>ek-click kill switch</b>, na ki lamba staged pipeline.","Rules are executable behavior; resource and semantic tests possible hain.","That specific access claim postmortem evidence se establish nahi hua.","Cloudflare described normal staged pipeline and WAF bypass."] },
        {
          q: 'Cloudflare ki team ko apne hi internal tools tak pahunchne mein dikkat hui, kyunki woh tools bhi Cloudflare ke peeche the. Is class ki problem ka naam aur ilaaj?',
          choices: ["Emergency access shares failing dependency","Only add replicas to same broken path","Only breaker creates independent admin access","Only jitter fixes unreachable admin auth"],
          answer: 0,
          explain: 'Yeh Roblox ke 73-ghante wale outage mein bhi hua tha (observability Consul par nirbhar thi) aur Slack ke January 2021 outage mein bhi (dashboards usi network par the jo saturate ho gaya tha). Sawaal hamesha ek hi hai: <b>"jab X gire, kya main X ke bina X ko theek kar sakta hoon?"</b>',
         choiceExplanations: ["Yeh Roblox ke 73-ghante wale outage mein bhi hua tha (observability Consul par nirbhar thi) aur Slack ke January 2021 outage mein bhi (dashboards usi network par the jo saturate ho gaya tha). Sawaal hamesha ek hi hai: <b>\"jab X gire, kya main X ke bina X ko theek kar sakta hoon?\"</b>","Replicas with same artifact/config/failure can all fail together.","Breaker may contain requests; out-of-band control path separately design karo.","Jitter reduces bursts; dependency absence/reachability fix nahi."] },
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
        choices: ["Bounded fast canary; budgets; independent kill","Skip all checks becauseattacks move fast","Two reviewers replace runtime resource tests","Only one daily publish meets seconds response"],
        answer: 0,
        explain: 'Sawaal ki shart <b>"seconds mein"</b> hai — 30-minute staged pipeline us shart ko hi tod deta hai, isliye woh jawab requirement fail karta hai. Tez raaste ki safety alag dikhti hai: chhota bake + kill switch + resource budget test. Aur "CPU budget ka test" hi woh cheez hai jo Cloudflare ke paas nahi thi.',
       choiceExplanations: ["Sawaal ki shart <b>\"seconds mein\"</b> hai — 30-minute staged pipeline us shart ko hi tod deta hai, isliye woh jawab requirement fail karta hai. Tez raaste ki safety alag dikhti hai: chhota bake + kill switch + resource budget test. Aur \"CPU budget ka test\" hi woh cheez hai jo Cloudflare ke paas nahi thi.","Fast response needs tailored automated safeguards, not unbounded blast radius.","Review valuable, but runtime pathological inputs can escape it.","Daily window given rapid threat-response requirement meet nahi karti."] },
      {
        q: '"Tum kaise decide karoge ki alerting mein invest karein ya rollback automation mein?"',
        choices: ["Break incident time into detection and mitigation","Always split budget exactly 50/50","Always alert first regardless of current delay","Always rollback first regardless of safe path"],
        answer: 0,
        explain: 'Yeh jawab data se chalta hai, raay se nahi. Cloudflare ke case mein detect 3 minute tha aur mitigate 25 — wahan alerting mein invest karna sirf 2 minute bachaata. Kisi doosri team ke paas ulta ho sakta hai. <b>Pehle naapo, phir kharcho.</b>',
       choiceExplanations: ["Yeh jawab data se chalta hai, raay se nahi. Cloudflare ke case mein detect 3 minute tha aur mitigate 25 — wahan alerting mein invest karna sirf 2 minute bachaata. Kisi doosri team ke paas ulta ho sakta hai. <b>Pehle naapo, phir kharcho.</b>","Observed bottleneck and risk determine useful investment.","If detection already fast, recovery bottleneck may dominate.","If cause/detection weak, unsafe rollback automation can hurt."] },
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
          ask: { q: "Partition healed; two writable histories diverged. First safety goal?",
                 choices: ["Fence writers; preserve histories; reconcile branches","Old primary automatically wins once link returns","Both writable histories safely merge by timestamp","Delete smaller branch to restore graphs fast"], answer: 0,
                 explain: "Given divergent writes, stop/fence unsafe writers, preserve both histories and reconcile authoritative business events. Do not discard a branch or trust timestamp LWW blindly; external effects may already exist.",
                 wrongHints: [
                   'Purana primary promote karne se West Coast ke naye writes gum ho jaayenge — tumne ek data loss ko doosre data loss se badal diya.',
                   'Dono ko chalne dena reconcile ka kaam har second bada karta hai. Split brain mein "baad mein dekh lenge" sabse mehenga jumla hai.',
                   'Last-write-wins values ke liye hai. Ek issue comment "purana" hone se galat nahi ho jaata — woh ek event hai, ek value nahi.',
                 ] , choiceExplanations: ["Given divergent writes, stop/fence unsafe writers, preserve both histories and reconcile authoritative business events. Do not discard a branch or trust timestamp LWW blindly; external effects may already exist.","Old primary may lack newer writes committed elsewhere.","Clock order cannot infer correct merge of divergent business effects.","Blind delete risks user data loss; capture and reconcile intent first."] } },
        { t: '23:13', event: 'Status <b>red</b>. GitHub ne faisla liya: <b>consistency pehle</b>. Webhooks aur Pages builds rok diye gaye.', metrics: { consist: 60, service: 40, queue: 900 }, tone: 'bad',
          ask: { q: 'Webhooks rokne ka faisla kyun liya gaya — jabki webhooks rokne se hazaaron integrations toot rahe hain?',
                 choices: ["Pause downstream effects from inconsistent state","Webhook sent can always be fully recalled","Delivery backlog alone proves payload invalid","Stop hooks means every stored event deleted"], answer: 0,
                 explain: 'Yeh <b>irreversible side effect</b> ka niyam hai. Ek galat page dikhana wapas liya ja sakta hai — refresh karo, sahi dikh jaayega. Ek galat webhook kisi doosre system mein deploy trigger kar sakta hai, ya kisi ka CI chala sakta hai. Jab data par shak ho, sabse pehle <b>bahar jaane wale</b> effects roko: webhooks, emails, payments, notifications.',
                 wrongHints: [
                   'Load ek chinta thi par mukhya wajah nahi. GitHub ne data ki sachai ki baat ki, capacity ki nahi.',
                   'Webhook service chal rahi thi — usko jaan-boojh kar roka gaya tha.',
                   'Baad mein bhejna hi hua (50 lakh events), par wajah speed nahi, <b>sahi data</b> thi.',
                 ] , choiceExplanations: ["Yeh <b>irreversible side effect</b> ka niyam hai. Ek galat page dikhana wapas liya ja sakta hai — refresh karo, sahi dikh jaayega. Ek galat webhook kisi doosre system mein deploy trigger kar sakta hai, ya kisi ka CI chala sakta hai. Jab data par shak ho, sabse pehle <b>bahar jaane wale</b> effects roko: webhooks, emails, payments, notifications.","Receiver may already act; external side effect may be irreversible.","Backlog can be healthy queued work; payload truth requires state evidence.","Pausing outbound delivery can preserve pending jobs for later replay."] } },
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
        { text: '🔁 Orphan writes ko authoritative state par replay karo', explain: 'Ab woh 954 writes wapas laaye jaate hain. Yahi wajah hai ki webhooks pehle roke gaye the — replay ke baad hi sachai poori hoti hai.' },
        { text: '📬 Ruki hui queues drain karo — webhooks aur builds', explain: 'Sabse aakhir mein. 50 lakh webhooks aur 80,000 Pages builds tabhi bheje gaye jab data poora sahi ho gaya.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Failover, split brain aur RTO',
      questions: [
        {
          q: '43 second ka partition itna mehenga kyun tha, jabki 43 second bahut chhota waqt hai?',
          choices: ["Divergent writes outlive short network failure","43 seconds means replication bytes corrupted","43 seconds always breaks any Raft quorum","Partition duration alone predicts data loss"],
          answer: 0,
          explain: 'Yeh split brain ka dil hai. Agar purana primary sach mein <b>mar</b> jaata, koi writes hote hi nahi aur failover saaf rehta. Sabse khatarnaak failure "down" nahi hoti — sabse khatarnaak failure <b>"cut off but alive"</b> hoti hai, kyunki alive node kaam karta rehta hai.',
         choiceExplanations: ["Yeh split brain ka dil hai. Agar purana primary sach mein <b>mar</b> jaata, koi writes hote hi nahi aur failover saaf rehta. Sabse khatarnaak failure \"down\" nahi hoti — sabse khatarnaak failure <b>\"cut off but alive\"</b> hoti hai, kyunki alive node kaam karta rehta hai.","Network separation primarily creates availability/visibility issue, not proven corruption.","Quorum depends membership, reaching majority and protocol, not universal 43s.","Write acceptance, fencing and recovery semantics determine consequences."] },
        {
          q: "Single writer failover ki essential safety property?",
          choices: ["Prove old writer fenced before promoting","Only longer timeout guarantees one writer","Only manual operator guarantees no split brain","Async replication means no fencing ever needed"],
          answer: 0,
          explain: "Single-writer promotion needs proof old authority cannot continue conflicting writes:resource-enforced fencing, correct lease/protocol or other proven mechanism. Longer timeout/manual promotion alone is no proof; failure model and storage participation matter.",
         choiceExplanations: ["Single-writer promotion needs proof old authority cannot continue conflicting writes:resource-enforced fencing, correct lease/protocol or other proven mechanism. Longer timeout/manual promotion alone is no proof; failure model and storage participation matter.","Longer timeout changes detection delay; old writer can remain live.","Human can promote without fencing too; protocol matters.","Async copies may diverge if two authorities accept writes."] },
        {
          q: 'GitHub ne 24 ghante degraded rehna chuna. Interview mein is faisle ko kaise bologe?',
          choices: ["Protect accepted user data while recovery proceeds","CAP universally requires choosing CP","Availability always out weighs every data invariant","They proved no alternative design exists"],
          answer: 0,
          explain: 'Sabse achha jawab faisle ko <b>business</b> se jodta hai. Ek code hosting platform ke liye "tumhara push gum ho gaya" bharosa hamesha ke liye todta hai; "GitHub aaj dheema tha" bhool jaate hain. Kisi analytics dashboard ke liye ulta sahi hota. CAP partition mein chunav <b>majboor</b> karta hai, par kaunsa chuno — woh tumhara product tay karta hai, theorem nahi.',
         choiceExplanations: ["Sabse achha jawab faisle ko <b>business</b> se jodta hai. Ek code hosting platform ke liye \"tumhara push gum ho gaya\" bharosa hamesha ke liye todta hai; \"GitHub aaj dheema tha\" bhool jaate hain. Kisi analytics dashboard ke liye ulta sahi hota. CAP partition mein chunav <b>majboor</b> karta hai, par kaunsa chuno — woh tumhara product tay karta hai, theorem nahi.","CAP describes constraints; business requirements choose acceptable contract.","Lost accepted writes may hurt more than temporary degraded features.","Postmortem explains chosen recovery, not impossibility of alternatives."] },
        {
          q: 'Apna RTO (recovery time) naapne ka sahi tareeka kya hai?',
          choices: ["Full restore and app recovery drill time measure","Backup size divided bandwidth equals actual RTO","Vendor number is production proof","Old small restore proves largest current restore"],
          answer: 0,
          explain: 'GitHub ke apne shabd the: waqt <b>"decompress, checksum, prepare, and load"</b> mein gaya. Sirf network se divide karna in charon mein se teen kadam bhool jaata hai. Restore drill ek aisi cheez hai jo lagbhag har team skip karti hai — aur usi din pata chalta hai ki RTO ka anumaan aadha tha.',
         choiceExplanations: ["GitHub ke apne shabd the: waqt <b>\"decompress, checksum, prepare, and load\"</b> mein gaya. Sirf network se divide karna in charon mein se teen kadam bhool jaata hai. Restore drill ek aisi cheez hai jo lagbhag har team skip karti hai — aur usi din pata chalta hai ki RTO ka anumaan aadha tha.","Download, decrypt, load, index, replay and verification add time.","Local data, hardware, keys andprocedures may differ.","Data growth and dependencies change recovery times."] },
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
        q: "Network partition par database promotion evaluate karte waqt key condition?",
        choices: ["Promotion gated by authority/fencing proof","Every network timeout proves old leader dead","Manual failover never needs same safeguards","Merge conflicting writes after effects safely"],
        answer: 0,
        explain: "Failover policy depends durability, replication position and authority transfer. Promotion must prevent conflicting old writes according to provenprotocol; lease expiry alone without stale holder fencing may not stop external effects. Manual vsautomatic is not main safety boundary.",
       choiceExplanations: ["Failover policy depends durability, replication position and authority transfer. Promotion must prevent conflicting old writes according to provenprotocol; lease expiry alone without stale holder fencing may not stop external effects. Manual vsautomatic is not main safety boundary.","Unreachable old leader may still serve another network segment.","Safety requirement old writer exclusion persists with human operation.","Payments, webhooks and other irreversible effects may not merge safely."] },
      {
        q: '"Recovery ke dauraan kya tum stale data serve karoge?"',
        choices: ["Classify read freshness and irreversible effects","Every stale response harmless if labeled","Never serve any unaffected read only resource","Always replay webhooks from unverified branch"],
        answer: 0,
        explain: 'Yeh jawab <b>reversible</b> aur <b>irreversible</b> mein farak karta hai — aur wahi farak GitHub ke poore faisle ka aadhaar tha. Stale read refresh se theek ho jaata hai. Stale webhook kisi doosre system mein deploy trigger kar sakta hai, aur woh wapas nahi liya ja sakta.',
       choiceExplanations: ["Yeh jawab <b>reversible</b> aur <b>irreversible</b> mein farak karta hai — aur wahi farak GitHub ke poore faisle ka aadhaar tha. Stale read refresh se theek ho jaata hai. Stale webhook kisi doosre system mein deploy trigger kar sakta hai, aur woh wapas nahi liya ja sakta.","Money, permissions or inventory risk can make stale reads unacceptable.","Some operations can safely degrade; requirements decide scope.","Outbound effects should use verified authoritative state."] },
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
        { t: '03:47', event: 'Poora fleet <b>OS ki max thread limit</b> paar kar gaya. Shard-map cache ban hi nahi paaya. Servers ke paas routing ka naksha nahi bacha.', metrics: { threads: 122, ok: 6 }, tone: 'bad',
          ask: { q: 'Capacity BADHANE se outage hua. Aisa kaunsa design ganit hai jahan "zyada servers" cheezein kharab kar sakta hai?',
                 choices: ["All-to-all grows fleet wide work","Every new server reduces existing work","Only new hosts do membership updates","O(N²)overall means no per node growth"], answer: 0,
                 explain: 'Yeh us class ki problem hai jise "har node har node ko jaanta hai" kehte hain — gossip, full mesh connections, per-peer threads, ya har node par poori membership table. Aise design mein <b>capacity add karna ek global change hai</b>, local nahi.',
                 wrongHints: [
                   'Naye servers bilkul theek the. Problem naye servers mein nahi thi — problem poore fleet ke ganit mein thi.',
                   'Load distribution theek thi. Servers request lene se pehle hi shard-map na bana paane ki wajah se bekaar the.',
                   'Warm-up ek chinta thi (recovery mein), par 03:47 ki failure thread limit thi, warm-up nahi.',
                 ] , choiceExplanations: ["Yeh us class ki problem hai jise \"har node har node ko jaanta hai\" kehte hain — gossip, full mesh connections, per-peer threads, ya har node par poori membership table. Aise design mein <b>capacity add karna ek global change hai</b>, local nahi.","Membership/connection changes can impose work on every existing host.","Old hosts must learn/connect/coordinate with new membership too.","All to all hasO(N)neighbors per node andO(N²)aggregate links."] } },
        { t: '05:15', event: 'Root cause pehchana gaya: memory nahi, <b>OS ka thread limit</b>. Ab servers ko wapas laana hai.', metrics: { threads: 118, ok: 8 }, tone: 'bad',
          ask: { q: 'Fleet wapas laana hai. Sabhi servers ek saath chalu kar dein?',
                 choices: ["Staged warm recovery with admission limits","Start all nodes means zero recovery contention","Thread limit increase creates infinite resources","Shrink fleet then unbounded restart is enough"], answer: 0,
                 explain: 'AWS ne servers <b>kuch sau prati ghanta</b> ki raftaar se wapas laaye, aur apne postmortem mein wajah likhi: bahut tez laane se cache banane aur requests serve karne ke beech contention ho jaata aur "very few resources being available to handle incoming requests" bachte. <b>Recovery ki raftaar bhi ek design faisla hai.</b>',
                 wrongHints: [
                   'Cold cache wale servers ek saath chalu karna thundering herd banata hai — recovery ulta lamba ho jaata hai.',
                   'Thread limit badhana zaroori tha, par usse cache-banane vs serve-karne ka contention khatam nahi hota.',
                   'Fleet chhota karna capacity kam kar deta hai — aur load toh utna hi hai jitna tha.',
                 ] , choiceExplanations: ["AWS ne servers <b>kuch sau prati ghanta</b> ki raftaar se wapas laaye, aur apne postmortem mein wajah likhi: bahut tez laane se cache banane aur requests serve karne ke beech contention ho jaata aur \"very few resources being available to handle incoming requests\" bachte. <b>Recovery ki raftaar bhi ek design faisla hai.</b>","Concurrent bootstrap and serving can share already exhausted resources.","Threads consume OSresources/memory and coordination; limits not only constraint.","Cold start work and offered load still need explicit bounds."] } },
        { t: '10:23', event: 'Kinesis poori tarah recover. Kul <b>20 ghante</b> — bada hissa dheeri, controlled recovery mein.', metrics: { threads: 84, ok: 100 }, tone: 'ok' },
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
          answer: 84631600,
          steps: [
            'Ek server par threads = fleet ke baaki server = 9,200 − 1 = 9,199',
            'Poore fleet mein = 9,200 × 9,199 = 84,630,800 ≈ 8.5 crore threads',
            'Fleet 10% badhao (10,120 servers) → 10,120 × 10,119 = 10.2 crore threads',
            'Yaani servers 10% badhe, par threads lagbhag 21% badhe — O(N²) ka asar',
          ],
          lesson: '🎯 Yahi wajah hai ki O(N²) topology mein "thoda sa capacity add karna" jaisa kuch hota hi nahi. Servers 10% badhe toh threads 21% badhte hain — aur woh badhotri <b>har</b> server par hoti hai, sirf naye par nahi.',
        },
        {
          q: 'Har OS thread ko lagbhag <b>8 KB</b> ka stack chahiye. Ek server par 9,199 threads hain. Sirf thread stacks ke liye us ek server par kitni memory chahiye?',
          unit: 'MB',
          given: ['Threads per server: 9,199', 'Har thread ka stack: 8 KB'],
          answer: 74,
          steps: [
            '9,199 threads × 8 KB = 73,592 KB',
            '73,592 KB ÷ 1024 = lagbhag 72 MB — chalo 74 MB maan lo',
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
            'AWS ka asli outage 20 ghante ka tha — yaani yeh anumaan bilkul sahi paimane par hai',
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
          q: "Cell-based architecture ka conditional blast-radius benefit?",
          choices: ["Independent cells can bound shared failures","Any cell guarantees exactly 1/N users impacted","Cells automatically share every dependency safely","Cells eliminate routing and rebalancing work"],
          answer: 0,
          explain: "Cells bound blast radius only where independent capacity/dependencies exist. Impact is tenant/load share, not necessarily exactly 1/Nusers. Shared control plane or downstream can cross cell boundaries; test isolation.",
         choiceExplanations: ["Cells bound blast radius only where independent capacity/dependencies exist. Impact is tenant/load share, not necessarily exactly 1/Nusers. Shared control plane or downstream can cross cell boundaries; test isolation.","Tenant distribution may be unequal; impact can be more/less than 1/N.","Shared control plane/auth/storage can remain common failure domains.","Cell ownership, placement and migration need design."] },
        {
          q: 'Tumhare paas CPU, memory, disk aur network par alerts hain. AWS ka outage phir bhi nahi pakda jaata. Kaunse alerts missing hain?',
          choices: ["Monitor thread, FD, PID and port saturation","CPU low proves OSresource pools cannot fill","MoreRAM guarantees unlimited process IDs","All application pools covered by CPU alert"],
          answer: 0,
          explain: 'Kinesis ke servers ke paas CPU tha, memory thi — par <b>threads</b> khatam ho gaye the. Yeh poori ek category hai: OS-level counters jo kisi default dashboard par nahi hote. File descriptor exhaustion Slack ke January 2021 outage mein bhi hua tha. In par alert lagao — <b>limit ke 70% par</b>, 100% par nahi.',
         choiceExplanations: ["Kinesis ke servers ke paas CPU tha, memory thi — par <b>threads</b> khatam ho gaye the. Yeh poori ek category hai: OS-level counters jo kisi default dashboard par nahi hote. File descriptor exhaustion Slack ke January 2021 outage mein bhi hua tha. In par alert lagao — <b>limit ke 70% par</b>, 100% par nahi.","Bounded handles/processes/connections may exhaust at low CPU.","PID/FD/kernel limits can be configured independently of free RAM.","Queue/pool resource counts are separate from CPU utilization."] },
        {
          q: '"Zyada capacity add karne se system gir gaya" — is class ki aur kaunsi sthiti hai?',
          choices: ["Cold-start clients can overload recovering backend","Any scale out always creates same outage","Capacity growth mathematically implies data loss","Warm cache has no dependency on request load"],
          answer: 0,
          explain: 'Dono ek hi parivaar ke hain: <b>"madad karne ki koshish ne nuksaan badha diya"</b>. Kinesis mein capacity add karne se poore fleet ka thread ganit toota. Recovery mein sab servers ek saath chalu karne se cache-banane aur serve-karne ke beech contention hota. Isiliye recovery hamesha <b>throttled</b> honi chahiye — servers ko batches mein laao, cache pehle warm karo.',
         choiceExplanations: ["Dono ek hi parivaar ke hain: <b>\"madad karne ki koshish ne nuksaan badha diya\"</b>. Kinesis mein capacity add karne se poore fleet ka thread ganit toota. Recovery mein sab servers ek saath chalu karne se cache-banane aur serve-karne ke beech contention hota. Isiliye recovery hamesha <b>throttled</b> honi chahiye — servers ko batches mein laao, cache pehle warm karo.","Scale out can help with proper quotas, warmup and admission.","Overload risk and durability failure are separate claims.","Cache warmup often loads origin and competes with live requests."] },
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
    { front: 'O(N²) topology ka khatra?', back: '"Har node har node ko jaanta hai" (gossip, full mesh, per-peer threads, poori membership table) mein <b>capacity add karna ek GLOBAL change hai</b>. Servers 10% badhe = threads 21% badhe, har server par.' },
    { front: 'Kaunse alerts lagbhag har team bhool jaati hai?', back: 'OS-level counters: <b>thread count, file descriptors, PIDs, ephemeral ports, connection table</b>. Yeh CPU ya memory badhaye bina khatam ho jaate hain. Alert limit ke <b>70%</b> par lagao.' },
    { front: 'Recovery ki raftaar kaisi honi chahiye?', back: '<b>Throttled.</b> AWS ne servers 400/ghanta ki raftaar se laaye — kyunki har server chalu hote hi cache banane aur requests serve karne, dono ke liye ladta hai. Ek saath sab chalu karna recovery ULTA lamba karta hai.' },
    { front: 'Cell-based architecture ka asli faayda?', back: '<b>Blast radius</b> — ek cell girne par 1/N users prabhavit. Bonus: capacity badhana "naya cell" ban jaata hai, isliye purane cells ka ganit chhoota hi nahi.' },
  ],
  interview: {
    title: 'Interview Round — Fleet design',
    instructions: 'Scale ka sawaal aksar yahin par gehra hota hai. 🎤',
    questions: [
      {
        q: "Every node keeps full membership table.500 to5000 nodes. What can infer safely?",
        choices: ["Measure membership storage vs all-to-all work","Full table alone proves exactly quadratic CPU","Ten times nodes guarantees linear throughput","Caching removes every update propagation cost"],
        answer: 0,
        explain: "Full membership table isO(N)storage per node, orO(N²)aggregate replicated metadata. Messages/connections/CPU depend protocol; all-to-all topology can bequadratic, but not implied solelybytable. Measure updates and bootstrap work before choosing cells/hierarchy.",
       choiceExplanations: ["Full membership table isO(N)storage per node, orO(N²)aggregate replicated metadata. Messages/connections/CPU depend protocol; all-to-all topology can bequadratic, but not implied solelybytable. Measure updates and bootstrap work before choosing cells/hierarchy.","O(N)per node data alone does not implyO(N²)CPU; protocol matters.","Coordination, hotspots and shared resources can change scaling.","Membership changes require consistent invalidation/propagation too."] },
      {
        q: '"Poora fleet gir gaya hai. Recovery plan batao."',
        choices: ["Batch recovery; warm; verify; cap incoming work","Restart everything immediately at full user load","Discard region without checking spare capacity","Wait complete root cause before any safe relief"],
        answer: 0,
        explain: 'Do cheezein saath honi chahiye: <b>supply side throttling</b> (servers batches mein) aur <b>demand side control</b> (admission control), warna pehla batch hi poore load ko jhelne ki koshish mein mar jaayega. AWS ne pehla kiya; Slack ne January 2021 mein load balancer ka panic mode chalaya — wahi doosra hissa hai.',
       choiceExplanations: ["Do cheezein saath honi chahiye: <b>supply side throttling</b> (servers batches mein) aur <b>demand side control</b> (admission control), warna pehla batch hi poore load ko jhelne ki koshish mein mar jaayega. AWS ne pehla kiya; Slack ne January 2021 mein load balancer ka panic mode chalaya — wahi doosra hissa hai.","Bootstrap and served traffic may overwhelm recovering dependencies.","Other region can lack capacity/data freshness or share failure cause.","Safe reversible mitigation can precede full causal analysis."] },
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
          ask: { q: 'Consul dheema hai, services unhealthy ho rahi hain, aur Consul ke andar ka haal dikh nahi raha. Yeh aakhri baat kyun sabse mehengi hai?',
                 choices: ["Discovery failure also blinds monitoring path","Metrics cache always fixes live visibility","More dashboards remove discovery dependency","Same dependency healthy in another tab"], answer: 0,
                 explain: 'Roblox ke apne remediation ki <b>pehli</b> line yahi thi: telemetry aur Consul ke beech ki circular dependency hatao. Root cause milne mein lagbhag <b>46 ghante</b> lage — kyunki jis system ka andar dekhna tha, uska andar dekhne ka zariya bhi wahi system tha.',
                 wrongHints: [
                   'Dashboard dheema hona nateeja hai, wajah nahi — aur intezaar karne se 46 ghante lag gaye.',
                   'Data kho jaana bura hai, par asli dikkat "abhi kya ho raha hai" na dikh paana thi.',
                   'Alert noise ek alag problem hai. Yahan alerts the hi nahi kyunki unka raasta bhi Consul se hokar jaata tha.',
                 ] , choiceExplanations: ["Roblox ke apne remediation ki <b>pehli</b> line yahi thi: telemetry aur Consul ke beech ki circular dependency hatao. Root cause milne mein lagbhag <b>46 ghante</b> lage — kyunki jis system ka andar dekhna tha, uska andar dekhne ka zariya bhi wahi system tha.","Cached old metrics may help context, but no live scrape path restored.","Dashboards still cannot fetch unreachable/discovery blocked targets.","UI duplication does not create independent backend access."] } },
        { t: '28 Oct 19:00', event: 'Hardware upgrade poora — <b>128-core</b> servers. <b>Koi sudhaar nahi.</b> (Baad mein pata chala: NUMA par channel contention aur BADH gayi thi.)', metrics: { kv: 1900, players: 30, vis: 20 }, tone: 'bad' },
        { t: '29 Oct 02:00', event: 'Pehli recovery koshish: Consul ka state snapshot se reset kiya gaya, iptables se load roka gaya. Thoda sudhaar dikha.', metrics: { kv: 700, players: 15, vis: 30 }, tone: 'warn' },
        { t: '29 Oct 04:00', event: 'iptables hatate hi cluster <b>turant dobara</b> degrade ho gaya.', metrics: { kv: 1850, players: 12, vis: 20 }, tone: 'bad',
          ask: { q: 'Roblox ne bahar ka SAARA player load hata diya, phir bhi cluster theek nahi hua. Yeh kya bata raha hai?',
                 choices: ["Inspect internal churn after external load removed","No external load proves all hardware broken","No external load proves snapshot corrupt","Load removal must immediately fix any system"], answer: 0,
                 explain: 'Yahi <b>death spiral</b> ki pehchaan hai. Roblox ne apne postmortem mein saaf likha ki bahar ka load hatane se bhi internal service churn itna tha ki cluster pathologically toota raha. Isliye spiral todne ka tareeka alag hai: <b>internal churn</b> kaato — non-essential clients band karo, backoff lagao, ya usi feature ko band karo jo contention paida kar raha hai.',
                 wrongHints: [
                   'Hardware badla gaya tha (128-core servers) aur usse haalat ULTA kharab hui — NUMA par contention aur badh gayi.',
                   'Snapshot theek tha. Reset ke baad thoda sudhaar bhi dikha — par internal churn wapas aate hi cluster gira.',
                   'iptables ne bahar ka traffic sach mein rok diya tha. Load andar se aa raha tha.',
                 ] , choiceExplanations: ["Yahi <b>death spiral</b> ki pehchaan hai. Roblox ne apne postmortem mein saaf likha ki bahar ka load hatane se bhi internal service churn itna tha ki cluster pathologically toota raha. Isliye spiral todne ka tareeka alag hai: <b>internal churn</b> kaato — non-essential clients band karo, backoff lagao, ya usi feature ko band karo jo contention paida kar raha hai.","Hardware fault requires direct evidence; internal control load may remain.","Corruption needs checks/restore evidence, not only overload symptom.","Internal retry/health/discovery loops can sustain overload."] } },
        { t: '30 Oct 12:00', event: '<b>Root cause mila:</b> ek din pehle chalu kiya gaya Consul streaming feature. Aur uske neeche BoltDB ka freelist bug — 4.2 GB file mein sirf 489 MB asli data.', metrics: { kv: 1800, players: 10, vis: 35 }, tone: 'warn',
          ask: { q: 'Root cause mil gaya. Ab pehla kadam kya — streaming band karna ya BoltDB theek karna?',
                 choices: ["Known reversible feature mitigation first assess","Always change storage engine live first","Always perform both changes without attribution","Always replace hardware before reducingload"], answer: 0,
                 explain: 'Roblox ne 15:51 par streaming band kiya aur KV write latency <b>2 second se 300 ms</b> par aa gayi. BoltDB ka fix (bbolt) unke roadmap par Q1 2022 mein tha — <b>outage ke dauraan nahi</b>. Niyam: outage mein woh badlav chuno jo <b>ek flag</b> ho, <b>turant palat</b> sake, aur <b>chhota</b> ho.',
                 wrongHints: [
                   'BoltDB asli underlying bug tha, par usko badalna ek software upgrade hai. Girte hue cluster par upgrade karna naya khatra hai.',
                   'Ek saath do badlav karne par pata hi nahi chalega kis-se sudhaar aaya — aur ek bigad gaya toh dono wapas lene padenge.',
                   'Hardware pehle hi badla ja chuka tha aur usse haalat kharab hui thi.',
                 ] , choiceExplanations: ["Roblox ne 15:51 par streaming band kiya aur KV write latency <b>2 second se 300 ms</b> par aa gayi. BoltDB ka fix (bbolt) unke roadmap par Q1 2022 mein tha — <b>outage ke dauraan nahi</b>. Niyam: outage mein woh badlav chuno jo <b>ek flag</b> ho, <b>turant palat</b> sake, aur <b>chhota</b> ho.","Live engine upgrade during incident may add more risk than flag rollback.","Concurrent changes complicate causal attribution and rollback.","Extra cores may worsen shared lock contention; cause-specific evidence needed."] } },
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
        { id: 'telemetry', why: 'Yahi sabse mehengi galti thi. Telemetry Consul se service discovery karta tha, isliye Consul girte hi <b>Consul ke andar dekhne ka raasta bhi gaya</b>. Root cause milne mein lagbhag 46 ghante lage. Monitoring hamesha us system se <b>swatantra</b> honi chahiye jise woh monitor karta hai.' },
        { id: 'services', why: 'Bina backoff ke retry hi <b>death spiral ka indhan</b> hai. Bahar ka saara load hatane par bhi 400+ services ka apna re-discovery churn cluster ko toota rakhne ke liye kaafi tha. Har client par exponential backoff + jitter + circuit breaker chahiye.' },
        { id: 'boltdb', why: 'Purane log entries delete hone par bhi BoltDB ki disk jagah kam nahi hoti thi. Freelist <b>7.8 MB</b> ka ho gaya aur woh poora freelist <b>har 16 KB ke append</b> par dobara likha jaata tha — 4.2 GB file mein asli data sirf 489 MB. Fix: bbolt.' },
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
              explain: 'Bahar ka traffic rokna theek soch hai aur usse thoda dabav kam hota hai — par agar yeh death spiral hai toh isse spiral rukega nahi. Chalo dekhte hain kya hota hai.' },
            { text: "Check changes and internal load", good: true, next: 'n3',
              explain: 'Sahi. Roblox ka trigger ek din pehle chalu kiya gaya Consul streaming flag tha. Spiral mein sabse pehla sawaal hamesha "kya badla" hota hai.' },
            { text: "Scale hardware before contention evidence", good: false, next: 'n2',
              explain: 'Roblox ne bilkul yahi kiya — 128-core servers. Haalat <b>ULTA kharab</b> hui, kyunki NUMA par channel contention aur badh gayi. Bade servers contention ka ilaaj nahi hain.' },
          ],
        },
        n2: {
          text: `⏱️ <b>02:40</b> — Bahar ka traffic poora ruka hua hai. Cluster
            phir bhi theek nahi ho raha. Latency ab bhi 3 second. Ab kya samajh
            aaya?`,
          choices: [
            { text: "Trace internal retry load", good: true, next: 'n3',
              explain: 'Bilkul. Jab bahar ka load hatane se kuch nahi hota, tab yeh <b>death spiral</b> hai — load internal hai. Ab ilaaj bhi internal hoga.' },
            { text: "Wait without new evidence", good: false, next: 'n2b',
              explain: 'Death spiral apne aap nahi sambhalti — usi ka toh naam spiral hai. Roblox ne 46 ghante is umeed mein bhi gaanwaye.' },
          ],
        },
        n2b: {
          text: `😰 <b>04:00</b> — Kuch nahi badla. Ab bhi 3 second. Aur ab
            observability dashboard bhi nahi khul raha — woh bhi service discovery
            se hokar jaata hai.`,
          choices: [
            { text: "Find independent observability path", good: true, next: 'n3',
              explain: 'Der se hi sahi, sahi nishkarsh. Aur dashboard ka na khulna apne aap mein ek bada sabak hai: monitoring us system par nirbhar nahi honi chahiye jise woh monitor karti hai.' },
          ],
        },
        n3: {
          text: `🔍 <b>03:10</b> — Deploy log mila: <b>kal shaam</b> ek naya
            "streaming" mode flag chalu kiya gaya tha, aur usi din routing nodes
            50% badhaye gaye the. Ab kya karoge?`,
          choices: [
            { text: "Test known reversible flag rollback", good: true, next: 'n4',
              explain: 'Sahi. Outage ke dauraan woh badlav chuno jo <b>ek flag</b> ho, <b>turant palat</b> sake aur <b>chhota</b> ho. Roblox ne 30 Oct 15:51 par yahi kiya — latency 2 second se 300 ms par aa gayi.' },
            { text: "Upgrade storage engine immediately", good: false, next: 'n3b',
              explain: 'Do badlav hue the — aur tumne bada, dheema wala chuna. Nodes hatana capacity kam karta hai aur usme minutes lagte hain. Flag ek second mein palat sakta hai.' },
            { text: "Change both at once;no attribution", good: false, next: 'n3b',
              explain: 'Roblox ke case mein BoltDB ka freelist bug asli underlying wajah tha — par uska fix (bbolt) unke roadmap par <b>Q1 2022</b> mein tha, outage ke dauraan nahi. Girte hue cluster par upgrade karna naya khatra hai.' },
          ],
        },
        n3b: {
          text: `⏳ <b>03:45</b> — Us raaste par 35 minute gaye aur latency waisi
            hi hai. Doosra badlav abhi bhi chalu hai.`,
          choices: [
            { text: "Reassess unchanged feature path", good: true, next: 'n4',
              explain: 'Ab sahi. Sabak: jab do badlav shak ke daayre mein hon, pehle woh palto jo <b>sabse sasta aur sabse tez</b> palat sakta hai.' },
          ],
        },
        n4: {
          text: `📉 <b>03:20</b> — Latency 3 second se 280 ms par. Cluster stable
            hai. Par services abhi bhi unhealthy hain aur unke cache thande hain.
            Sab kuch ek saath chalu kar dein?`,
          choices: [
            { text: "Batch recovery;warm;limit arrivals", good: true, next: 'end',
              explain: 'Roblox ne 31 October ko DNS steering se players ko dheere-dheere wapas laaya. AWS ne Kinesis ke servers 400/ghanta ki raftaar se laaye. <b>Recovery ki raftaar bhi ek design faisla hai.</b>' },
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
              explain: 'Yahi sabak sabse mehenga hota hai: recovery ki raftaar khud ek design faisla hai. Thake hue system ko ek saath poora load dena usko dobara giraata hai.' },
          ],
        },
        end: {
          end: true,
          text: `✅ <b>Spiral toot gaya.</b> Tumne teen kaam sahi kram mein kiye:
            <b>1.</b> "Kya badla" poochha — code se pehle flags aur config bhi gine.
            <b>2.</b> Sabse sasta, sabse tez palatne wala badlav pehle palta.
            <b>3.</b> Recovery ko throttle kiya — batches, warm cache, dheere users.
            <br><br>Aur do cheezein aage ke liye likh lo: monitoring ko us system
            se swatantra karo jise woh monitor karti hai, aur har internal client
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
          q: "External traffic removed but cluster still churns. Which evidence supports death spiral?",
          choices: ["Internal feedback churn sustains impaired state","High CPU alone uniquely identifies death spiral","Latency growth alone proves retries caused it","Error 50%alone identifies one specific cause"],
          answer: 0,
          explain: "Persistent internal retry/discovery/health churn can maintain positive feedback after external traffic stop. Need request source and contention/queue evidence; high CPU or error fraction alone not unique diagnosis.",
         choiceExplanations: ["Persistent internal retry/discovery/health churn can maintain positive feedback after external traffic stop. Need request source and contention/queue evidence; high CPU or error fraction alone not unique diagnosis.","CPU saturation has many possible causes.","Latency increase can comefromload, IO, locks or network.","Error ratio measures impact, not feedback mechanism."] },
        {
          q: 'Roblox ne 128-core servers par upgrade kiya aur haalat ULTA kharab hui. Kyun?',
          choices: ["More cores can worsen contended synchronization","More cores always slow every Consul build","NUMAalone proves a storage corruption bug","New hardware cannot change scheduling behavior"],
          answer: 0,
          explain: 'Yeh ek gehra sabak hai: <b>contention ka ilaaj hardware nahi hai</b>. Jab bahut saare threads ek hi lock ya channel ke liye lad rahe hon, aur cores badhane ka matlab hai aur zyada ladne wale. NUMA par cross-socket cache coherency traffic isko aur bigadta hai. Contention ka ilaaj contention kam karna hai — concurrency structure badlo.',
         choiceExplanations: ["Yeh ek gehra sabak hai: <b>contention ka ilaaj hardware nahi hai</b>. Jab bahut saare threads ek hi lock ya channel ke liye lad rahe hon, aur cores badhane ka matlab hai aur zyada ladne wale. NUMA par cross-socket cache coherency traffic isko aur bigadta hai. Contention ka ilaaj contention kam karna hai — concurrency structure badlo.","Effect depends workload, lock implementation and memory topology.","NUMAcontention and durable data corruption different claims hain.","More cores/sockets affect cache locality, scheduling and lock contention."] },
        {
          q: 'Tumhara monitoring us system se service discovery karta hai jise woh monitor karta hai. Isko theek karne ka sabse seedha tareeka?',
          choices: ["Independent scrape/discovery fallback path","Only retain old metrics for longer duration","Only move dashboard UI to another region","Only clone dashboards using same data source"],
          answer: 0,
          explain: 'Sawaal hamesha ek hi hai: <b>"jab X gire, kya main X ke bina X ko dekh sakta hoon?"</b> Doosre region mein le jaana madad karta hai <b>sirf tab</b> jab discovery ka raasta bhi alag ho — warna region badalne se circular dependency nahi badalti. Roblox ke remediation ki pehli line yahi thi.',
         choiceExplanations: ["Sawaal hamesha ek hi hai: <b>\"jab X gire, kya main X ke bina X ko dekh sakta hoon?\"</b> Doosre region mein le jaana madad karta hai <b>sirf tab</b> jab discovery ka raasta bhi alag ho — warna region badalne se circular dependency nahi badalti. Roblox ke remediation ki pehli line yahi thi.","Historical data does not restore missing live target discovery.","Backend discovery dependency can still be same failing system.","Clones using same failed path share outage."] },
        {
          q: "Evidence implicates feature flag vsstoragebug. How choose first mitigation?",
          choices: ["Rank mitigation by evidence, risk and reversibility","Any flag flip always safer regardless of effect","Root cause label means live engine upgrade first","Parallel every change to maximize speed"],
          answer: 0,
          explain: "Choose evidenced mitigation with acceptable blast radius and fast safe rollback. A known reversible flag often better than live engine upgrade, but flags are not intrinsically always safe. Preserve evidence and attribute changes.",
         choiceExplanations: ["Choose evidenced mitigation with acceptable blast radius and fast safe rollback. A known reversible flag often better than live engine upgrade, but flags are not intrinsically always safe. Preserve evidence and attribute changes.","Some flags are destructive/wide-scope; understand intended effect.","Findingbug does not prove safest immediate repair path.","Uncontrolled changes add uncertainty and rollback risk."] },
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
        choices: ["Internal retry/discovery load can sustain spiral","One symptom proves hardware must be replaced","One symptom proves all data is corrupt","Blocking ingress stops every internal request"],
        answer: 0,
        explain: 'Is jawab mein teen cheezein hain jo interviewer dhoondhta hai: <b>naam</b> (death spiral), <b>mechanism</b> (internal churn), aur <b>ilaaj</b> (churn kaato, bahar ka load nahi). Ek hi test se pata chal jaata hai — traffic roko; agar theek na ho toh load andar ka hai.',
       choiceExplanations: ["Is jawab mein teen cheezein hain jo interviewer dhoondhta hai: <b>naam</b> (death spiral), <b>mechanism</b> (internal churn), aur <b>ilaaj</b> (churn kaato, bahar ka load nahi). Ek hi test se pata chal jaata hai — traffic roko; agar theek na ho toh load andar ka hai.","Hardware metrics/diagnostics needed before replacement conclusion.","Persistent outage may be contention ratherthan data corruption.","Services, health checks and control loops keepgenerating internal work."] },
      {
        q: '"Ek chhota feature flag production mein ek hi din mein 73 ghante ka outage kaise ban sakta hai?"',
        choices: ["Shared coordination bottleneck plus feedback","One flag inherently creates 73 hours of failure","Flag timing proves all writes deleted","Security exploit required for shared contention"],
        answer: 0,
        explain: 'Yeh jawab <b>amplification</b> ki kahani batata hai: chhota trigger → shared dependency dheemi → clients zyada requests bhejte hain → aur dheemi. Aur uske saath 73 ghante ka doosra hissa bhi jud jaata hai: <b>observability ki circular dependency</b>, jiski wajah se root cause 46 ghante tak nahi mila.',
       choiceExplanations: ["Yeh jawab <b>amplification</b> ki kahani batata hai: chhota trigger → shared dependency dheemi → clients zyada requests bhejte hain → aur dheemi. Aur uske saath 73 ghante ka doosra hissa bhi jud jaata hai: <b>observability ki circular dependency</b>, jiski wajah se root cause 46 ghante tak nahi mila.","Recovery time depends state, recovery steps and dependencies, not flag identity alone.","Data loss requires evidence; reported problem was coordinated service failure.","Performance/concurrency bugs can trigger without attacker."] },
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
        { text: 'Same region, alag AZ ka round trip', bin: 'single', explain: 'Lagbhag <b>1-2 ms</b>. Multi-AZ replication ka yahi kharcha hai — aur yeh itna kam hai ki high availability ke liye hamesha worth it hai.' },
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
          q: "Estimate 2 xwrong nikla. Decision impact kaise judge karoge?",
          choices: ["Check whether 2x changes design headroom","Every 2x error always harmless","Every 20%error fails any interview","Exact digits make assumptions unnecessary"],
          answer: 0,
          explain: "Order-of-magnitude estimates guide architecture, but 2 xerror can matter when near capacity/cost threshold. Record assumptions and sensitivity; recompute if decision would change. No universal 2 xalwaysfine/100 xonlybadrule.",
         choiceExplanations: ["Order-of-magnitude estimates guide architecture, but 2 xerror can matter when near capacity/cost threshold. Record assumptions and sensitivity; recompute if decision would change. No universal 2 xalwaysfine/100 xonlybadrule.","Near capacity,2x can change topology/cost; check sensitivity.","Estimation aims justified scale reasoning, not one universal error cutoff.","Precise arithmetic cannot rescue wrong traffic/size assumptions."] },
        {
          q: 'Tumhara page 3 sequential cross-continent calls karta hai. Sabse bada sudhaar kya hai?',
          choices: ["Remove, batch or safelyparallelize serial RTTs","Compression removes speed-of-light delay","Faster CPU eliminates propagation latency","Smaller JSON removes every handshake round trip"],
          answer: 0,
          explain: 'Payload, compression aur CPU — teenon <b>0 ms</b> bachaate hain jab bottleneck round trips hai. 3 × 130 ms = 390 ms sirf light ke chalne ka waqt hai. Cross-region par design ka sawaal "kitna data" nahi, <b>"kitne round trips"</b> hota hai.',
         choiceExplanations: ["Payload, compression aur CPU — teenon <b>0 ms</b> bachaate hain jab bottleneck round trips hai. 3 × 130 ms = 390 ms sirf light ke chalne ka waqt hai. Cross-region par design ka sawaal \"kitna data\" nahi, <b>\"kitne round trips\"</b> hota hai.","Payload shrink helps transmission, not all fixed propagation delay.","Network propagation remains even with zero processing time.","Handshake count/reuse and geographic routing determine fixed RTT cost."] },
        {
          q: '"CPU 10% hai par timeouts aa rahe hain." Little\'s Law se kya nikalta hai?',
          choices: ["Match measured concurrency with pool bounds","Low CPU proves network alone is cause","Little law identifies exact blocked dependency","Addingconnections always raises throughput"],
          answer: 0,
          explain: "Little’sLaw relates steady-state average in-flight L, arrival rate lambda and average timeW using consistent boundary/units. Compare pool capacity and measured wait spans, but the law alone cannot name bottleneck; low CPU can reflect several wait sources.",
         choiceExplanations: ["Little’sLaw relates steady-state average in-flight L, arrival rate lambda and average timeW using consistent boundary/units. Compare pool capacity and measured wait spans, but the law alone cannot name bottleneck; low CPU can reflect several wait sources.","Locks, pools, IO and downstream waits can allcoexist with low CPU.","L=lambda*W constrains averages; trace actual waits for root cause.","More connections can raise DB contention without more capacity."] },
        {
          q: "New data 1 PB/day. Storage decision ka defensible next step?",
          choices: ["Object size, access and retention drive storage","1 PB/day means every object cannot useDB","Volume alone picks cheapest cloud provider","Weekly backup guarantees acceptable data loss"],
          answer: 0,
          explain: "1 PB/day implies large volume but storage choice still depends object sizes, access patterns, retention, durability and cost. Media objects commonly fit object storage withDBmetadata; never database blanket claim unsupported.",
         choiceExplanations: ["1 PB/day implies large volume but storage choice still depends object sizes, access patterns, retention, durability and cost. Media objects commonly fit object storage withDBmetadata; never database blanket claim unsupported.","SomeblobDB/data engine choices can fit; binary absolute unsupported.","Cost includes requests, egress, retention, durability and operations.","RPO/business requirements determine backup/log strategy."] },
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
    { front: 'Chaar latency paimane?', back: '<b>&lt;1 ms</b>: memory (100 ns), SSD random (100 µs), same-AZ RTT (0.5 ms) · <b>1-10 ms</b>: cross-AZ, indexed row, 1 MB SSD sequential · <b>10-100 ms</b>: disk seek, Mumbai↔Singapore, 1 MB @ 1 Gbps · <b>100 ms+</b>: cross-continent RTT, cold start, naya TLS handshake.' },
    { front: 'Little\'s Law?', back: '<code>L = lambda × W</code>. 50,000 rps × 40 ms = <b>2,000 concurrent</b>. Pool 200 ka hua toh 1,800 queue mein khadi hain — aur queue mein khadi request <b>CPU nahi jalati</b>, isliye CPU 10% dikhta hai.' },
  ],
  interview: {
    title: 'Interview Round — Estimation',
    instructions: 'Har system design interview ka doosra kadam. 🎤',
    questions: [
      {
        q: "1 billion events/day. What capacity conclusion can you justify?",
        choices: ["11574/s average; measure bytes, peaks and work","1B/day alone proves Postgres impossible","QPS alone proves Kafka mandatory","Shards remove need for durability analysis"],
        answer: 0,
        explain: "1 billion events/day /86400s =11574 events/s average. Peak, bytes/event, write work, indexes, durability and hardware determine capacity. Postgres struggling or Kafka mandatory cannot be inferred from count alone; benchmark representative design candidates.",
       choiceExplanations: ["1 billion events/day /86400s =11574 events/s average. Peak, bytes/event, write work, indexes, durability and hardware determine capacity. Postgres struggling or Kafka mandatory cannot be inferred from count alone; benchmark representative design candidates.","Capacity depends query shape, hardware, batching and durability.","A stream/log may fit, but required retention/consumers matter too.","Shards still need replication, backup and failure contracts."] },
      {
        q: '"Tum apne users ko duniya bhar mein 100 ms se kam latency dena chahte ho. Kya yeh mumkin hai?"',
        choices: ["Terminate at sufficiently local compute/data","HTTP3 eliminates all geographic delay","100 ms is impossible at every location","Faster CPU removes every WAN round trip"],
        answer: 0,
        explain: 'Yeh jawab physics ko design se jodta hai. HTTP/3 handshake ke round trips bachaata hai (accha hai), par doori nahi ghataata. Asli jawab hamesha ek hi hai: <b>request ko user ke paas hi khatam karo</b> — edge cache, region-local read replica, ya local write with async replication.',
       choiceExplanations: ["Yeh jawab physics ko design se jodta hai. HTTP/3 handshake ke round trips bachaata hai (accha hai), par doori nahi ghataata. Asli jawab hamesha ek hi hai: <b>request ko user ke paas hi khatam karo</b> — edge cache, region-local read replica, ya local write with async replication.","Protocol changes cannot remove propagation distance.","Local edge/regional operation can meet 100 ms for suitable requests.","WAN RTT remains even if processing time becomes negligible."] },
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
        q: "Vector index exceeds RAM; recall 97%. How choose first memory optimization?",
        choices: ["Benchmark quantization memory/recall tradeoff","Int8 guarantees only 1%recall loss","efSearch lower shrinks stored graph 4x","Shard first without checking quality budget"],
        answer: 0,
        explain: "Float32 to int8 reduces raw vector payload from 4 to1 byte/dimension, not necessarily total index RAM 4x. Graph, metadata and retained float rerank data matter. Recall drop must be measured; no guaranteed 1-2%loss. Compare quantization, graph parameters and sharding against requirements.",
       choiceExplanations: ["Float32 to int8 reduces raw vector payload from 4 to1 byte/dimension, not necessarily total index RAM 4x. Graph, metadata and retained float rerank data matter. Recall drop must be measured; no guaranteed 1-2%loss. Compare quantization, graph parameters and sharding against requirements.","Recall loss depends data, embedding, query distribution and settings.","efSearch mainly changes search work/recall, not stored graph size.","Quantization may be cheaper, but sharding can be valid if quality/memory demands."] },
    },
    {
      type: 'match',
      title: 'Vector search ki shabdavali',
      instructions: 'Har shabd ko uske asli matlab se milao.',
      pairs: [
        { left: 'Recall@10', right: 'Top-10 jawabon mein se kitne SACH mein sabse paas wale the — ANN ka asli quality metric', explain: 'Latency ke bina recall bekaar hai aur recall ke bina latency jhoothi hai. Vector system ki har baat in dono ke jode mein hoti hai.' },
        { left: 'efSearch', right: 'Search ke waqt kitne candidates dekhe jaate hain — har query ka kharcha, latency par seedha asar', explain: 'Yeh woh knob hai jo tum production mein badalte ho. Latency budget toote toh sabse pehle efSearch dekho.' },
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
          q: "500k vectors for RAG. What index-selection approach is defensible?",
          choices: ["Benchmark exact Flat vs ANN baseline","500 k vectors always exact search in 1 ms","HNSW automatically gives 100%recall","IVF needs no training or search settings"],
          answer: 0,
          explain: "Flat search gives exact nearest neighbors under chosen metric and is a useful quality/latency baseline.500 k vectors may or may not meet target latency/QPS depending dimension, hardware, batching and concurrency. Benchmark Flat vs ANN before selecting a winner.",
         choiceExplanations: ["Flat search gives exact nearest neighbors under chosen metric and is a useful quality/latency baseline.500 k vectors may or may not meet target latency/QPS depending dimension, hardware, batching and concurrency. Benchmark Flat vs ANN before selecting a winner.","Dimension, hardware, query batch and concurrency determine runtime.","ANN approximate recall needs evaluation against exact ground truth.","IVF requires trained coarse partitioning and probe tuning."] },
        {
          q: "Product-code search poor. What diagnostic/retrieval hypothesis is useful?",
          choices: ["Compare lexical matching, filters and embeddings","Product code misses prove model too small","IncreaseefSearch fixes every exact token issue","Index age alone proves relevance failure"],
          answer: 0,
          explain: "For exact product names/codes, hybrid lexical and vector retrieval is a useful hypothesis. Verify indexed membership, query filters, analyzers and labeled relevance first. Poor results alone do not prove only-vector retrieval is the root cause.",
         choiceExplanations: ["For exact product names/codes, hybrid lexical and vector retrieval is a useful hypothesis. Verify indexed membership, query filters, analyzers and labeled relevance first. Poor results alone do not prove only-vector retrieval is the root cause.","Representation/query matching can matter independent of model size.","Search effort cannot recover lexical distinctions missing in embeddings.","Check membership, freshness, query/analyzer and ranking separately."] },
        {
          q: 'RAG pipeline ka p99 3 second hai. Sabse pehle kya naapoge?',
          choices: ["Trace embed, retrieve, rerank and generation","LLM size alone proves critical path","Vector search always dominates total latency","Only network RTT can cause 3 second tail"],
          answer: 0,
          explain: 'Anumaan lagbhag hamesha "LLM dheema hai" hota hai, aur naap aksar kuch aur batata hai. Typical numbers: embedding 10-30 ms, vector search 5-50 ms, <b>rerank 50-200 ms</b>, LLM first token 200-800 ms. Cross-encoder rerank par 100 candidates bhejna chhupa hua sabse bada kharcha hota hai.',
         choiceExplanations: ["Anumaan lagbhag hamesha \"LLM dheema hai\" hota hai, aur naap aksar kuch aur batata hai. Typical numbers: embedding 10-30 ms, vector search 5-50 ms, <b>rerank 50-200 ms</b>, LLM first token 200-800 ms. Cross-encoder rerank par 100 candidates bhejna chhupa hua sabse bada kharcha hota hai.","Stage timing needs measurement; queueing/reranking can dominate.","Generation, embedding, retrieval or rerank may dominate different pipelines.","CPU/GPU queues, token counts and dependency waits also matter."] },
        {
          q: "Binary candidate retrieval plus float rerank:accurate tradeoff?",
          choices: ["Cheap candidates then precise rerank evaluate","Rerank recovers documents never retrieved","Binary makes total system RAM always 32 xless","Binary quantization guarantees full recall"],
          answer: 0,
          explain: "Binary candidate generation plus precise reranking can trade memory/speed and recall. Rerank cannot retrieve missing candidates; candidate set recall bounds final recall.32x describes raw float32-to1 bit vector payload, not total index/system RAM when graphs and full precision copies remain.",
         choiceExplanations: ["Binary candidate generation plus precise reranking can trade memory/speed and recall. Rerank cannot retrieve missing candidates; candidate set recall bounds final recall.32x describes raw float32-to1 bit vector payload, not total index/system RAM when graphs and full precision copies remain.","Candidate recall bounds reranking; missing relevant documents cannot return.","Graph, metadata and retained float vectors reduce total-memory savings.","Compression loses information; quality is empirical and workload-specific."] },
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
        q: "100 million vectors, p99 target 50 ms. Defensible design process?",
        choices: ["Benchmark index, compression, shards and recall","AnyHNSW setting guarantees 50 ms p99","GPU Flat automatically meets every budget","RAG context can contain all 100 million docs"],
        answer: 0,
        explain: "100 million documents and 50 ms p99 require specified dimensions, QPS, filters, hardware and recall target. Benchmark ANN/quantization, partitioning and lexical fusion; measure candidate recall and end-to-end latency. No single HNSW recipe guarantees the target.",
       choiceExplanations: ["100 million documents and 50 ms p99 require specified dimensions, QPS, filters, hardware and recall target. Benchmark ANN/quantization, partitioning and lexical fusion; measure candidate recall and end-to-end latency. No single HNSW recipe guarantees the target.","Dimension, QPS, filters, hardware and data distribution matter.","Full scan cost grows with vectors/dimensions and concurrent queries.","Context budget, cost and relevance need retrieval/selection."] },
      {
        q: "Vector index 300 GB. How choose compression vs sharding?",
        choices: ["Profile memory components then test quality/cost","Int8 guarantees total 300 GBbecomes 75 GB","Sharding always costs more than compression","Dimension truncation preserves every embedding"],
        answer: 0,
        explain: "Separate vector payload, graph, IDs, metadata and rerank storage before choosing compression or shards. Evaluate recall/latency/cost under representative queries. Quantization can help, but total RAM savings and sharding economics are implementation-specific.",
       choiceExplanations: ["Separate vector payload, graph, IDs, metadata and rerank storage before choosing compression or shards. Evaluate recall/latency/cost under representative queries. Quantization can help, but total RAM savings and sharding economics are implementation-specific.","Vector payload may shrink 4x, but graph/IDs/metadata and rerank vectors remain.","Quality constraints, hardware and index capabilities can justify sharding.","Dimension reduction requires compatible model/projection and quality evaluation."] },
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
        q: "Strong same-data writes requested at20 ms worldwide. What is the tradeoff?",
        choices: ["One global write scope cannot outrun WAN","Regional row locality guarantees 20 ms anywhere","Spanner makes cross planet coordination free","Global systems cannot provide strong consistency"],
        answer: 0,
        explain: "A write requiring remote coordination cannot complete faster than its required network/protocol path. Home-region row locality helps local access, but crossregion transactions and region-survival quorum can still add WAN latency. Strong consistency is possible; uniform 20 ms worldwide writes tosamecontended data are not guaranteed.",
       choiceExplanations: ["A write requiring remote coordination cannot complete faster than its required network/protocol path. Home-region row locality helps local access, but crossregion transactions and region-survival quorum can still add WAN latency. Strong consistency is possible; uniform 20 ms worldwide writes tosamecontended data are not guaranteed.","Home-region placement helps local access, but survival/crossregion operations still cost.","Coordinating distant replicas still pays propagation and protocol costs.","Strong consistency exists with latency/availability tradeoffs."] },
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
        { text: 'User ka profile aur uski settings', bin: 'regional', explain: 'Ek user ka data lagbhag hamesha ek hi user padhta aur likhta hai. Home region dena isko <b>tez aur strong</b> dono bana deta hai.' },
        { text: 'Kisi user ke orders aur unka history', bin: 'regional', explain: 'Wahi tark — order ka maalik ek user hai, aur woh user ek region mein hai. Order ka home region user ka home region hai.' },
        { text: 'Ek chat room ke messages', bin: 'regional', explain: 'Room ko ek home region do (aam taur par jahan zyadatar members hain). Members alag regions se aayenge, par sabhi ek hi jagah likhenge — isliye ordering saaf rehti hai.' },
        { text: 'Product catalog aur unke daam', bin: 'global', explain: 'Bahut zyada padha jaata hai, bahut kam likha jaata hai, aur har jagah <b>ek jaisa</b> chahiye. Write dheema ho toh chalega; read har region mein tez hona chahiye.' },
        { text: 'Feature flags aur configuration', bin: 'global', explain: 'Har region ko chahiye, kabhi-kabhi badalta hai. Yahan "purana config chal raha hai" ek asli khatra hai — isliye replication lag par alert hona chahiye.' },
        { text: 'Currency exchange rates', bin: 'global', explain: 'Har jagah ek jaisa, har jagah tez padha jaata hai. Thodi si staleness (seconds) aam taur par sweekar hoti hai — aur uska business asar likh kar rakhna chahiye.' },
        { text: 'Rate limiting ke counters', bin: 'local', explain: 'Inko cross-region sync karna sabse mehengi galtiyon mein se ek hai. Har region apna counter rakhe aur limit ko regions mein baant do. Thodi si dheela-dhaali sehna, har request par cross-region call se sasta hai.' },
        { text: 'Session cache aur temporary state', bin: 'local', explain: 'Session usi region mein rehta hai jahan user hai. Cross-region session replication mehenga hai aur uska faayda lagbhag kabhi zaroorat mein nahi aata — user region badle toh dobara login karwa lo.' },
        { text: 'Debug logs aur metrics ka raw data', bin: 'local', explain: 'Volume bahut bada hai aur egress ka bill bhaari. Raw data local rakho, sirf <b>aggregate</b> central bhejo. Yeh cross-region bill ki sabse aam wajahon mein se ek hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Multi-region ke faisle',
      questions: [
        {
          q: "Crossregion write quorum:accurate latency cost statement?",
          choices: ["Remote quorum adds WAN coordination","Every interregion RTT is exactly 130 ms","Quorum needs every replica on every write","More replicas eliminate network propagation"],
          answer: 0,
          explain: "Write latency includes required consensus acknowledgments and log durability. Crossregion replication/survival settings can require WAN round trips; not every topology needs every region, and interregion RTT is not universally 130 ms.",
         choiceExplanations: ["Write latency includes required consensus acknowledgments and log durability. Crossregion replication/survival settings can require WAN round trips; not every topology needs every region, and interregion RTT is not universally 130 ms.","Nearby regions can be far faster; geography and topology vary.","Majority/consensus protocol and replication placement determine required acknowledgments.","Replica count cannot eliminate distance to required participants."] },
        {
          q: "Regional-by-row write latency depends on what?",
          choices: ["Locality plus survival goal determines quorum","Regional-by-row means zero crossregion copies","Regional-by-row always only eventual reads","Table label alone proves local-only writes"],
          answer: 0,
          explain: "Regional-by-row places row home and can localize common transactions. Actual replica/quorum placement depends survival goal and database configuration; region-survival can still require cross-region ACKs. Global uniqueness, foreignkeys or crossregion transactions can add coordination.",
         choiceExplanations: ["Regional-by-row places row home and can localize common transactions. Actual replica/quorum placement depends survival goal and database configuration; region-survival can still require cross-region ACKs. Global uniqueness, foreignkeys or crossregion transactions can add coordination.","Region survivability may require replicas/acks in other regions.","Locality and consistency are separate guarantees; strong transactions possible.","Foreignkeys, unique constraints, transactions and survival placement affect work."] },
        {
          q: 'Regional-by-row ki keemat kahan chukani padti hai?',
          choices: ["Crossregion queries or moves still coordinate","Every local read necessarily gets slower","Regional rows guarantee no failover recovery","All row movement is metadata-only"],
          answer: 0,
          explain: 'Single-user path <b>tez</b> ho jaata hai — wahi to poora faayda hai. Keemat <b>cross-region analytics</b> par aati hai. Aam ilaaj: aise sawaalon ko async kar do (har region apna aggregate bheje) ya ek alag analytics store rakho jahan sab data ikattha hota hai.',
         choiceExplanations: ["Single-user path <b>tez</b> ho jaata hai — wahi to poora faayda hai. Keemat <b>cross-region analytics</b> par aati hai. Aam ilaaj: aise sawaalon ko async kar do (har region apna aggregate bheje) ya ek alag analytics store rakho jahan sab data ikattha hota hai.","Home-region locality is intended to make local access efficient.","Survival and recovery depend configured replication/placement, not label alone.","Moving row home can transfer data and coordinate ownership."] },
        {
          q: "Multi-region rate limiter:choose strict global quota vs local budgets how?",
          choices: ["Strict global quota vs latency/overshoot choose","Counter synchronization inherently impossible","Local quotas guarantee exact global cap","Every limiter must block for 130 ms exactly"],
          answer: 0,
          explain: "Strict global quota may require coordination, budget leases orescrow; regional allowances can lower common path latency with bounded overshoot. Choose per business risk and verify failure behavior. Synchronization is not inherently wrong, and RTT is topology-specific.",
         choiceExplanations: ["Strict global quota may require coordination, budget leases orescrow; regional allowances can lower common path latency with bounded overshoot. Choose per business risk and verify failure behavior. Synchronization is not inherently wrong, and RTT is topology-specific.","Coordinated counters/escrow/leases are feasible with different costs.","Independent regional counters need budget allocation/protocol to bound overshoot.","Geography, topology and caching/lease design change latency."] },
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
        q: "Multi-region migration first classify which data properties?",
        choices: ["Classify ownership, consistency and failure goals","Replicate every datum identically by default","Never replicate any session or raw log","Route writes before planning data authority"],
        answer: 0,
        explain: "Classify each dataset by owner, access locality, consistency, residency, durability, RPO/RTO and failure behavior. Sessions, counters and logs may or may not replicate depending on contract; never replicate blanket rule incorrect.",
       choiceExplanations: ["Classify each dataset by owner, access locality, consistency, residency, durability, RPO/RTO and failure behavior. Sessions, counters and logs may or may not replicate depending on contract; never replicate blanket rule incorrect.","Different data types have different locality, privacy and recovery needs.","Sessions/logs may require durability or crossregion access under contract.","Authority, replication and routing must work together to prevent conflicts."] },
      {
        q: "Region fails. What determines service/data outcome?",
        choices: ["Per-data survival, RPO/RTO and failover test","Regional-by-row always loses home-region data","Global table always remains writable anywhere","Session loss is always harmless to users"],
        answer: 0,
        explain: "Region failure outcome depends actual replica placement, survival goal, quorum, routing and spare capacity. Regional-by-row label alone does not define data loss or availability. Session/counter state may be durable orvaluable; explicitly test failure contract.",
       choiceExplanations: ["Region failure outcome depends actual replica placement, survival goal, quorum, routing and spare capacity. Regional-by-row label alone does not define data loss or availability. Session/counter state may be durable orvaluable; explicitly test failure contract.","Region survival settings may preserve availability/data through outage.","Quorum and routing availability still apply; global label not magic.","Sessions/payment workflows may make loss costly; define recovery contract."] },
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
        q: "Tiny canary regression needs more samples. How choose exposure/time?",
        choices: ["Choose detection delta, samples and exposure risk","Bigger canary always safer for every regression","Automatic rollback removes sample requirement","Exactly 2 hour wait mathematically universal"],
        answer: 0,
        explain: "Canary sizing balances detectable regression, required sample confidence, time and blast exposure. Increasingtraffic or waiting longer both valid; acceptingcoarserdelta requires documented risk decision. Given 2 hours is scenario estimate, not universal statistical constant.",
       choiceExplanations: ["Canary sizing balances detectable regression, required sample confidence, time and blast exposure. Increasingtraffic or waiting longer both valid; acceptingcoarserdelta requires documented risk decision. Given 2 hours is scenario estimate, not universal statistical constant.","Larger exposure improves samples but increases potential harmed users.","Rollback needs reliable detection, thresholds and safe reversibility.","Timing depends baseline rate, traffic, confidence and chosen effect size."] },
    },
    {
      type: 'order',
      title: 'Ek surakshit release ka kram',
      instructions: 'Ek naye feature ko production tak le jaane ke kadam sahi kram mein lagao.',
      steps: [
        { text: '📦 Code deploy karo — par feature FLAG ke peeche, band halat mein', explain: 'Deploy aur release ko alag karna hi poora aadhaar hai. Code chal raha hai par kuch kar nahi raha, isliye deploy khud mein ek non-event ban jaata hai.' },
        { text: '👤 Flag sirf apni team ke liye kholo (internal dogfood)', explain: 'Pehla asli traffic tumhara apna hona chahiye. Yahi Cloudflare ka "DOG" stage hai — agar feature yahan toota, kisi customer ne dekha hi nahi.' },
        { text: '📊 Success aur guardrail metrics tay karo — aur unke threshold likho', explain: 'Rollout se PEHLE likho ki "kharab" kaisa dikhta hai. Baad mein tay karoge toh har graph ko dekhkar dil kahega "shayad theek hai".' },
        { text: '🐤 1-5% par kholo aur SAMPLES ka ganit chala kar itni der ruko', explain: 'Bake time alert time se bada hona chahiye, aur samples itne hone chahiye ki tumhara delta shor se alag dikh sake. Percentage akela kuch nahi kehta.' },
        { text: '🤖 Automatic rollback ki shart chalu karo — guardrail toote toh khud band ho', explain: 'Raat 3 baje insaan ko jagane, context dene aur sahi button dabwane mein 20 minute jaate hain. Machine ko sirf ek shart chahiye.' },
        { text: '📈 Dheere-dheere badhao — 5% → 25% → 50% → 100%, har kadam par bake', explain: 'Har kadam par naye tarah ke users aate hain (alag device, alag region, alag data). 5% par jo nahi toota woh 50% par toot sakta hai.' },
        { text: '🧹 Flag hatao aur purana raasta delete karo', explain: 'Yeh kadam lagbhag hamesha chhoot jaata hai. Bhoole hue flags apne aap mein ek outage class hain — kyunki unke combinations kabhi test nahi hote.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Rollout ke faisle',
      questions: [
        {
          q: 'Canary ka asli sawaal kya hai?',
          choices: ["Sample evidence and coverage support detection","Traffic 1%alone proves representative coverage","Ten minutes alone proves tiny deltas absent","One canary region covers all failure shapes"],
          answer: 0,
          explain: 'Percentage aur minute dono <b>samples</b> ke liye sirf inputs hain — samples = rps × canary% × minute. 1% canary par 10,000 rps ki service 2 minute mein 12,000 samples deti hai; 100 rps ki service 120 deti hai. Ek jaisa percentage, ek jaisa waqt, aur bilkul alag suraksha.',
         choiceExplanations: ["Percentage aur minute dono <b>samples</b> ke liye sirf inputs hain — samples = rps × canary% × minute. 1% canary par 10,000 rps ki service 2 minute mein 12,000 samples deti hai; 100 rps ki service 120 deti hai. Ek jaisa percentage, ek jaisa waqt, aur bilkul alag suraksha.","1%at low traffic may produce insufficient events and omit rare cohorts.","Required samples and event frequency determine observation duration.","Regions, tenants, data shapes and scale effects may differ."] },
        {
          q: "Deploy and feature-release separation ka actual benefit and limit?",
          choices: ["Separate code delivery from feature exposure","Disabled code cannot ever affect runtime","Flag rollback reverses every schema change","Feature flags make build rollback unnecessary"],
          answer: 0,
          explain: "Separating deployment from release allows controlled feature exposure and quick disable when compatible. Disabled code can still have initialization/migration effects; feature flag does not replace build rollback, data repair or safe defaults. Exact seconds propagation must betested.",
         choiceExplanations: ["Separating deployment from release allows controlled feature exposure and quick disable when compatible. Disabled code can still have initialization/migration effects; feature flag does not replace build rollback, data repair or safe defaults. Exact seconds propagation must betested.","Initialization, shared paths or migrations can run even when feature off.","Data changes and external effects need explicit rollback/repair plan.","Flag systems can fail; build rollback and compatibility still matter."] },
        {
          q: "Automatic rollback ka benefit under what assumptions?",
          choices: ["Fast tested rollback can reduce response delay","Automation is safe without pre tested rollback","Rollback always completes under 1 second","False positive signals have no user cost"],
          answer: 0,
          explain: "Automatic rollback can reduce human response delay when reliable signals and safe rollback path are tested. It can also worsen failure under false positives or incompatible data transitions. Exact 20 minutes human or 1 second machine claims are scenario examples.",
         choiceExplanations: ["Automatic rollback can reduce human response delay when reliable signals and safe rollback path are tested. It can also worsen failure under false positives or incompatible data transitions. Exact 20 minutes human or 1 second machine claims are scenario examples.","Automated destructive/incompatible rollback can worsen outage.","Propagation, data state and external dependencies affect recovery time.","False rollback can drop work or trigger instability; guardrails needed."] },
        {
          q: "Old feature flags remove karne ka design reason?",
          choices: ["Flag combinations add maintenance and test cost","Every flag doubles reachable states exactly","Old flags cannot affect deployed execution","Deletingflag without usage check always safe"],
          answer: 0,
          explain: "Independent binary flags have up to2^N combinations; constraints/dependencies reduce reachable states. Stale flags add maintenance, test and unexpected branching cost. Retire with usage, compatibility and audit checks.",
         choiceExplanations: ["Independent binary flags have up to2^N combinations; constraints/dependencies reduce reachable states. Stale flags add maintenance, test and unexpected branching cost. Retire with usage, compatibility and audit checks.","Dependencies mutually-exclusive flags can reduce reachable combinations.","Legacy branches/config can still change code paths.","Remove after known rollout/compatibility and consumer checks."] },
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
        choices: ["Predefine metrics, delta, coverage and stop rule","No pager alone proves no regression","Team sees no complaints so canary passes","Only mean latency is sufficient for all SLOs"],
        answer: 0,
        explain: 'Baaki teenon jawab <b>na dikhne</b> ko safalta maan lete hain — par chhota regression waise bhi nahi dikhta, chahe woh maujood ho. Sahi jawab do cheezein pehle se tay karta hai: <b>kya naapna hai</b> aur <b>kitne samples chahiye</b>.',
       choiceExplanations: ["Baaki teenon jawab <b>na dikhne</b> ko safalta maan lete hain — par chhota regression waise bhi nahi dikhta, chahe woh maujood ho. Sahi jawab do cheezein pehle se tay karta hai: <b>kya naapna hai</b> aur <b>kitne samples chahiye</b>.","Detector maylack sensitivity or representative workload.","Low volume or hidden errors may not produce reports quickly.","Tail, error, business and cohort effects may matter."] },
      {
        q: '"Tumhara canary saaf tha, par 100% par jaate hi system gir gaya. Kya hua hoga?"',
        choices: ["Inspect sampling, coverage, scale and rollout diff","Clean canary means release cannot be causal","Canary must be production-identical in all ways","Only monitoring bug can explain difference"],
        answer: 0,
        explain: 'Teesri wajah sabse dilchasp hai aur sabse zyada bhooli jaati hai: <b>kuch failures 5% par mumkin hi nahi hain</b>. Connection pool 100% par hi bharta hai, cache working set 100% par hi phatta hai, aur hot partition tabhi banta hai jab poora traffic aaye. Canary ek statistical tool hai — woh <b>scale-dependent</b> failures nahi pakad sakta.',
       choiceExplanations: ["Teesri wajah sabse dilchasp hai aur sabse zyada bhooli jaati hai: <b>kuch failures 5% par mumkin hi nahi hain</b>. Connection pool 100% par hi bharta hai, cache working set 100% par hi phatta hai, aur hot partition tabhi banta hai jab poora traffic aaye. Canary ek statistical tool hai — woh <b>scale-dependent</b> failures nahi pakad sakta.","Canarycould miss scale/non representative/rare-path regressions.","Isolation and load differ by design; prove relevant representativeness.","Exposure, bottlenecks, configuration and data differences also plausible."] },
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
          lesson: "🎯 Yeh number lagbhag hamesha logon ko chaunkata hai. 100 crore requests ka <b>compute</b> sirf $2,222 hai. Bill $258,000 ka hai. Baaki $255,000 kahan gaya? Storage, database, egress, NAT, cross-AZ, managed services — <b>is scenario mein given compute line item total bill explain nahi karta;actual largest cost inspect karo</b>.",
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
        { id: 'origin', why: 'CDN ke bina saara video egress <b>origin</b> se jaata hai. 1 PB/mahina par woh $50,000 hai. CDN 90%+ offload karta hai aur origin ka egress lagbhag khatam kar deta hai — yahan CDN ka case latency nahi, <b>bill</b> hai.' },
        { id: 'nat', why: 'S3 ki calls NAT Gateway se ja rahi hain, aur NAT <b>har GB</b> par charge karta hai. <b>VPC endpoint</b> (S3/DynamoDB gateway endpoint) NAT ko poori tarah bypass kar deta hai — yeh lagbhag muft ka sudhaar hai aur bahut kam teams karti hain.' },
        { id: 'mesh', why: 'Ek request par 6 internal calls, aur AZ ka koi dhyan nahi — matlab lagbhag do-tihai calls <b>cross-AZ</b> hain, jispar <b>dono taraf</b> charge hota hai. Zone-aware routing yahi bill aadha kar deta hai. Aur 6 calls ka matlab har request par 6 network hops bhi hai.' },
        { id: 'logs', why: 'Production mein DEBUG level par har request ka poora body bhejna — managed logging services per-GB ingest charge karti hain, aur yeh line item aksar database se bada ho jaata hai. INFO par jao, bodies sample karo, aur raw logs saste object storage mein rakho.' },
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
          q: "Users 2x, bill 3x. Which conclusion is defensible?",
          choices: ["Decompose workload, unit prices and unit cost","Super linear algorithm proven by bill alone","Provider prices cannot explain bill changes","Users and requests always scale proportionally"],
          answer: 0,
          explain: "Users 2 xandbill 3x suggests normalized unit cost investigation, but does not prove super linear algorithm. Usage/user, payload, features, retention, provider prices and tier steps can change cost. Attribute spendbefore choosing architectural fix.",
         choiceExplanations: ["Users 2 xandbill 3x suggests normalized unit cost investigation, but does not prove super linear algorithm. Usage/user, payload, features, retention, provider prices and tier steps can change cost. Attribute spendbefore choosing architectural fix.","Usage mix, features, retention, price changes and fixed tiers also matter.","Pricing/discount/currency changes can affect billed amount.","Requests/user, bytes/request and activity mix can change."] },
        {
          q: "Compute$2222, total$258000. Which diagnostic is useful?",
          choices: ["Reconcile all billed line items to usage","Compute can never dominate any product bill","Reserved instances fix NATandegress charges","Autoscale directly reduces all logging fees"],
          answer: 0,
          explain: "Given compute only$2222 of$258000, total must be reconciled to actual billed network, storage, managed services, logs and other usage. Compute can dominate other products; do notteach universal compute-never-dominatesrule.",
         choiceExplanations: ["Given compute only$2222 of$258000, total must be reconciled to actual billed network, storage, managed services, logs and other usage. Compute can dominate other products; do notteach universal compute-never-dominatesrule.","CPU/GPU-heavy services can be compute-dominated; given line items decide.","Compute reservations do not automatically discount network/service charges.","Log volume/retention/sampling need their own controls."] },
        {
          q: "LLMfeature cost optimize karne ka evidence-based first step?",
          choices: ["Measure token mix, model price and quality","Output tokens always exactly 5x input price","Cheapestmodel always lowest cost per task","Promptshortening always preserves task quality"],
          answer: 0,
          explain: "Use current provider/model pricing and measured input/output/cached tokens, retries and quality. Output/input price ratios are not universally 5x. Compare prompt/output limits, caching, routing, batching or cheaper models againsttask success and latency.",
         choiceExplanations: ["Use current provider/model pricing and measured input/output/cached tokens, retries and quality. Output/input price ratios are not universally 5x. Compare prompt/output limits, caching, routing, batching or cheaper models againsttask success and latency.","Input/output ratios differ by provider, model, cache tier and pricing date.","More retries/poor quality can raise effective task cost.","Removing needed context can reduce quality and increase retries."] },
        {
          q: 'Cost per request ko ek design metric maanne ka sabse bada faayda kya hai?',
          choices: ["Unit cost makes workload tradeoffs measurable","Unit cost alone proves best design quality","Lower cost guarantees correct business results","All requests have identical resource footprint"],
          answer: 0,
          explain: 'Baaki teenon asli faayde hain, par woh <b>finance</b> ke faayde hain. Engineering ka faayda yeh hai ki ek extra service call, ek extra fan-out, ya ek cache hit rate ka sudhaar — sab ek hi paimane par tulne lagte hain. Aur wahi paimana product se bhi jud jaata hai: "kya har naya user apne kharche se zyada laata hai?"',
         choiceExplanations: ["Baaki teenon asli faayde hain, par woh <b>finance</b> ke faayde hain. Engineering ka faayda yeh hai ki ek extra service call, ek extra fan-out, ya ek cache hit rate ka sudhaar — sab ek hi paimane par tulne lagte hain. Aur wahi paimana product se bhi jud jaata hai: \"kya har naya user apne kharche se zyada laata hai?\"","Correctness, reliability, latency and capacity still constraints.","Cheap wrong or unreliable outcomes do not meet requirements.","Endpoints/tenants/payloads differ; segment cost by useful work."] },
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
    { front: 'Compute kitna hota hai bill mein?', back: "Workload-dependent:GPU/CPU heavy services mein compute biggest ho sakta hai.Is scenario ke line items mein 100 crore requests × 200 ms CPU = sirf $2,222. Bill $258,000 ka. Baaki sab data ka raasta hai — egress, NAT, cross-AZ, log ingest, managed services." },
    { front: 'LLM per-call cost?', back: '<code>(input tokens ÷ 1M × input rate) + (output tokens ÷ 1M × output rate)</code>. Output aksar input se <b>5x mehenga</b> — isliye pehla optimization "jawab chhota karo" hai, phir caching.' },
    { front: 'Unit economics ka test?', back: 'Users 2x → bill <b>1.6x</b> = sehatmand · bill 2x = chinta · bill <b>3x</b> = khatra. Cost per request badhna matlab kahin <b>super-linear</b> kaam hai (N+1, fan-out, cross-AZ, O(N²)) — bill se pehle <b>design</b> ki problem.' },
  ],
  interview: {
    title: 'Interview Round — Cost',
    instructions: 'Senior rounds mein "keemat kya hai" lagbhag hamesha poochha jaata hai. 🎤',
    questions: [
      {
        q: '"Tumhara design accha hai. Iski keemat kya hai?"',
        choices: ["Workload-based compute, storage, network model","Cloud calculator alone proves production spend","Finance alone owns architecture cost impact","Only current instance bill predicts 10x cost"],
        answer: 0,
        explain: 'Yeh sawaal sirf paise ka nahi hai — interviewer dekh raha hai ki tum apne design ke <b>parinaam</b> jaante ho ya nahi. Sabse achha jawab yeh bhi batata hai ki <b>kaunsa hissa scale par tez badhega</b>, kyunki wahi ek din architecture badalne par majboor karega.',
       choiceExplanations: ["Yeh sawaal sirf paise ka nahi hai — interviewer dekh raha hai ki tum apne design ke <b>parinaam</b> jaante ho ya nahi. Sabse achha jawab yeh bhi batata hai ki <b>kaunsa hissa scale par tez badhega</b>, kyunki wahi ek din architecture badalne par majboor karega.","Calculator needs accurate assumptions and omitted request/network/storage costs.","Engineering design determines resource usage and amplification.","Shared limits, tiers and nonlinear work can change cost shape."] },
      {
        q: '"Hamara bill users se tez badh raha hai. Kahan se shuru karoge?"',
        choices: ["Normalize unit cost and workload changes","Always buy reservations before usage audit","Always delete biggest item without ownership","User count alone is exact billing denominator"],
        answer: 0,
        explain: "Sabse bada line item dhoondhna theek hai par woh <b>lakshan</b> hai. Asli sawaal hai \"per request kaam kab badha\" — kyunki bill growth design,usage mix,retention,pricing and discount changes se aa sakta hai;attribution verify karo. Reserved instances aur cleanup ek baar ki bachat hain; woh <b>dhaal</b> nahi badalte.",
       choiceExplanations: ["Sabse bada line item dhoondhna theek hai par woh <b>lakshan</b> hai. Asli sawaal hai \"per request kaam kab badha\" — kyunki bill growth design,usage mix,retention,pricing and discount changes se aa sakta hai;attribution verify karo. Reserved instances aur cleanup ek baar ki bachat hain; woh <b>dhaal</b> nahi badalte.","Commitments lock spend; first verify bottleneck, waste and stable demand.","Data/workload ownership and durability policy needed before deletion.","Active user behavior, requests, bytes and features determine actual work."] },
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
        { id: 'flags', why: 'Flags seconds mein poore fleet par jaate hain, bina bake aur bina canary ke. Yeh <b>Cloudflare 2019</b> ka WAF wala raasta hai — tez raasta rakhna theek hai, par uspar <b>bake ≥ alert time</b> aur ek-click kill switch chahiye.' },
        { id: 'cfg', why: 'Ek generated file jo seedha proxies padhte hain, bina schema aur row-count check ke. Yeh <b>Cloudflare 2025</b> ki zanjeer hai — config ek <b>input</b> hai. Bound lagao, aur file kharab lage toh <b>aakhri acchi file</b> par raho.' },
        { id: 'db', why: 'Auto-failover bina <b>fencing</b> ke. Yeh <b>GitHub 2018</b> hai: 30 second ka partition purane primary ko maarta nahi, sirf <b>kaat</b> deta hai — aur woh zinda primary writes leta rehta hai. Lease ya STONITH ke bina failover split brain ko design mein daal dena hai.' },
        { id: 'disc', why: 'Bina backoff ke immediate retry hi <b>death spiral ka indhan</b> hai. Yeh <b>Roblox 2021</b> hai: discovery dheemi hui, services ne aur zyada poochha, aur wahi extra load dheemapan badhata gaya. Har client par exponential backoff + jitter + circuit breaker chahiye.' },
        { id: 'mon', why: 'Monitoring apne targets <b>service discovery</b> se dhoondhta hai — yaani discovery girte hi visibility bhi gayi. Yeh <b>Roblox ka 46-ghante wala andhera</b> hai aur <b>Slack 2021</b> bhi (dashboards usi saturated network par the). Monitoring ka raasta hamesha alag hona chahiye.' },
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
          ask: { q: "Resource graphs healthy but 5 xx18%. Defensible first diagnostic?",
                 choices: ["Changes plus endpoint impact and dependency trace","Healthy CPU rules out all backend problems","Only attacker can create 18%errors","Last change correlation alone proves causation"], answer: 0,
                 explain: "Correlate recent code/config/permission/flag/migration/capacity changes with endpoint/dependency impact.5xx cause cannot be deduced from healthy CPU memory alone; change analysis and request tracing both valid first steps.",
                 wrongHints: [
                   'Achha sawaal hai par woh lakshan batata hai, wajah nahi. Aur "kaunsa endpoint" ka jawab aksar "sab" hota hai.',
                   'Database dekhna zaroori hai — par pehle yeh jaan lo ki kya badla, warna tum har graph ek-ek karke dekhoge.',
                   'Attack ka anumaan lagbhag hamesha der karwaata hai. Pehle apne badlav dekho, phir bahar dekho.',
                 ] , choiceExplanations: ["Correlate recent code/config/permission/flag/migration/capacity changes with endpoint/dependency impact.5xx cause cannot be deduced from healthy CPU memory alone; change analysis and request tracing both valid first steps.","Pools, quotas, locks, IO or network can fail with CPU headroom.","Code, config, dependency and traffic changes can cause errors.","Use timeline, artifact diffs, reproduction and safe mitigation evidence."] } },
        { t: '22:02', event: 'Deploy log: pichhle 2 ghante mein <b>koi code deploy nahi</b>. Ek permission change hua tha analytics warehouse par, 21:40 par.', metrics: { err: 22, ok: 78 }, tone: 'bad' },
        { t: '22:08', event: 'Error rate achanak <b>0.3%</b> par gir gaya. Sab normal dikh raha hai.', metrics: { err: 0.3, ok: 100 }, tone: 'ok' },
        { t: '22:18', event: 'Aur phir se <b>21%</b>. Team mein koi kehta hai "shayad koi attack hai".', metrics: { err: 21, ok: 79 }, tone: 'bad',
          ask: { q: "10 minute error cycle. What does it justify investigating?",
                 choices: ["Check periodic generator and routing hypotheses","10 minute error cycle proves one exact generator","Autoscale cannot produce periodic failures","Periodic errors prove no traffic relationship"], answer: 0,
                 explain: "Periodic error suggests scheduled generation, refresh, autoscaling/routing oscillation or periodic traffic. Inspect timestamps and artifact/routing versions; one pattern does not prove one generator mechanism.",
                 wrongHints: [
                   'Attack itna theek 10-minute period nahi rakhta. Yeh shak Cloudflare ki team ko bhi mehenga pada tha.',
                   'Autoscaler chal raha hai par instances healthy hain — failure request handle karte waqt ho rahi hai.',
                   'Ek kharab node hota toh error rate 21% par sthir rehta, aa-ja nahi raha hota.',
                 ] , choiceExplanations: ["Periodic error suggests scheduled generation, refresh, autoscaling/routing oscillation or periodic traffic. Inspect timestamps and artifact/routing versions; one pattern does not prove one generator mechanism.","Need job/artifact/version evidence; other periodic mechanisms possible.","Feedback scaling can oscillate under some policies.","Cron clients, burst traffic and coordinated refresh can be periodic."] } },
        { t: '22:25', event: 'Pricing config pipeline mili — har 10 minute par ek file banti hai, aur uski query analytics warehouse se columns padhti hai. 21:40 ke permission change ke baad rows <b>doguni</b> ho gayi hain.', metrics: { err: 21, ok: 79 }, tone: 'bad',
          ask: { q: 'Wajah mil gayi. Ab pehla kadam — permission change wapas lena ya kuch aur?',
                 choices: ["Stop bad generation; pin proven good artifact","Trigger rollback always impossible mitigation","Restart always repairs malformed config contract","New proxy release before any reversible relief"], answer: 0,
                 explain: 'Permission change <b>sahi</b> tha — woh security ke liye kiya gaya tha, aur usko palatna doosri team ka sahi kaam todna hai. Naya code deploy karna girte hue system par naya khatra hai. <b>Generation rok kar aakhri acchi file par pin karna</b> teenon kasoutiyon par khara utarta hai: chhota, turant palat sakta hai, aur naya khatra nahi laata.',
                 wrongHints: [
                   'Trigger tha, par galat nahi tha. Sahi kaam ko palatna sabak bhi galat sikhaata hai — asli kadi validation ki kami thi.',
                   'Outage ke dauraan naya code deploy karna ek naya khatra hai. Aur usme minutes lagenge, jabki file pin karna seconds ka kaam hai.',
                   'Restart karne par service wahi kharab file dobara padh legi — 10 minute baad phir wahi haal.',
                 ] , choiceExplanations: ["Permission change <b>sahi</b> tha — woh security ke liye kiya gaya tha, aur usko palatna doosri team ka sahi kaam todna hai. Naya code deploy karna girte hue system par naya khatra hai. <b>Generation rok kar aakhri acchi file par pin karna</b> teenon kasoutiyon par khara utarta hai: chhota, turant palat sakta hai, aur naya khatra nahi laata.","Permission rollback may also help; choose smallest safe evidenced action.","Restart may reload the same bad artifact or spread failure.","Safer reversible mitigation can restore before permanent code fix."] } },
        { t: '22:29', event: 'Config generation ruka, aakhri acchi file pin ho gayi. Error rate <b>0.2%</b>. Payments normal.', metrics: { err: 0.2, ok: 100 }, tone: 'ok',
          ask: { q: 'Outage khatam. Postmortem mein kaunsa action item sabse zaroori hai?',
                 choices: ["Validate bounds; safe last-good fallback","Only promise teamwill pay more attention","Only ask upstream team to warn us forever","Only add alerts without response semantics"], answer: 0,
                 explain: 'Baaki teenon <b>iraade</b> hain, action items nahi. "Aur alerts" kabhi nahi rukta aur kisi kadi ko nahi todta. "Pehle bataya karo" insaani process par tikta hai aur teen mahine mein bhool jaata hai. Sirf pehla vikalp ek naam wali kadi todta hai: <b>kharab file ban hi nahi sakti, aur ban bhi gayi toh padhi nahi jaayegi.</b>',
                 wrongHints: [
                   'Alert ne yahan kaam kiya hi tha — 21:55 par baja. Problem detection ki nahi thi.',
                   'Communication behtar karna accha hai, par yeh design fix nahi hai — aur agli baar badlav kisi teesri team se aayega.',
                   'Team ne theek diagnose kiya. Training ka masla nahi tha.',
                 ] , choiceExplanations: ["Baaki teenon <b>iraade</b> hain, action items nahi. \"Aur alerts\" kabhi nahi rukta aur kisi kadi ko nahi todta. \"Pehle bataya karo\" insaani process par tikta hai aur teen mahine mein bhool jaata hai. Sirf pehla vikalp ek naam wali kadi todta hai: <b>kharab file ban hi nahi sakti, aur ban bhi gayi toh padhi nahi jaayegi.</b>","Intent without enforceable mechanism/test does not break causal chain.","Human coordination useful but cannot replace input validation.","Detection without containment/recovery still permits impact."] } },
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
          q: "Trigger, amplifier, blind spot:which belong to design improvement?",
          choices: ["Design can reduce trigger, amplifier and blind spot","Only amplifiers count as system design","Only monitoring team owns all observability","Trigger prevention alone eliminates all failures"],
          answer: 0,
          explain: "Design includes safer triggers, bounded amplification, independent observability and tested recovery. Monitoring architecture is design too; prevention, detection and mitigation worktogether. One universal amplifier-only rule oversimplifies incident learning.",
         choiceExplanations: ["Design includes safer triggers, bounded amplification, independent observability and tested recovery. Monitoring architecture is design too; prevention, detection and mitigation worktogether. One universal amplifier-only rule oversimplifies incident learning.","Safer changes and independent observability architecture are design too.","Application architecture affects telemetry dependencies and coverage.","Unexpected failures still need bounded impact and tested recovery."] },
        {
          q: 'Ek naye system ka review kar rahe ho. Ek hi sawaal poochh sakte ho. Kaunsa?',
          choices: ["Ask failure outcome and recovery assumptions","One question guarantees every design review complete","Scale alone proves correctness and resilience","p99 alone proves no data-loss exposure"],
          answer: 0,
          explain: 'Baaki teen sawaal <b>sehatmand haalat</b> ke baare mein hain. Outage sehatmand haalat mein nahi hota. Ek hi sawaal — "jab yeh galat nikle tab kya" — bounds, fallback, fencing, backoff aur kill switch, sab ko ek saath saamne le aata hai.',
         choiceExplanations: ["Baaki teen sawaal <b>sehatmand haalat</b> ke baare mein hain. Outage sehatmand haalat mein nahi hota. Ek hi sawaal — \"jab yeh galat nikle tab kya\" — bounds, fallback, fencing, backoff aur kill switch, sab ko ek saath saamne le aata hai.","Review also needs scope, capacity, security, cost and invariants.","Capacity does not ensure safe partial failure/retries.","Fast responses can still commit wrong or lost business effects."] },
        {
          q: 'Postmortem mein time to detect aur time to mitigate ko alag likhna kyun zaroori hai?',
          choices: ["Different delays point to different controls","Both intervals same remedy in every incident","SLAtimeautomatically identifies root cause","Different teams must always own each interval"],
          answer: 0,
          explain: 'Cloudflare 2019 saaf udaharan hai: detect 3 minute, mitigate 25. Agar postmortem sirf "27 minute ka outage" likhta, team monitoring par paisa lagati aur sirf 2 minute bachte. Alag likhne se saaf dikha ki asli kaam <b>kill switch</b> par tha.',
         choiceExplanations: ["Cloudflare 2019 saaf udaharan hai: detect 3 minute, mitigate 25. Agar postmortem sirf \"27 minute ka outage\" likhta, team monitoring par paisa lagati aur sirf 2 minute bachte. Alag likhne se saaf dikha ki asli kaam <b>kill switch</b> par tha.","Detection, decision, access and execution bottlenecks need different improvements.","SLA impact duration does not locate detection versus recovery bottleneck.","Ownership depends organization; learning goal is causal timeline."] },
        {
          q: "Postmortem action quality ka defensible test?",
          choices: ["Concrete mechanism with owner and verification","Deadline alone proves action preventsrecurrence","Owner alone proves mechanism is correct","More alerts without signal or response is enough"],
          answer: 0,
          explain: "Good action names causal mechanism, expected behavior, owner, priority/time box and verification. Owner/deadline are valuable but not enough; more alerts can be good if specific actionable signal and response are defined.",
         choiceExplanations: ["Good action names causal mechanism, expected behavior, owner, priority/time box and verification. Owner/deadline are valuable but not enough; more alerts can be good if specific actionable signal and response are defined.","Time bound action can still be ineffective; name causal link and test.","Accountability matters, but need specific corrective behavior.","Alert must reliably detect actionable condition and runbook response."] },
        {
          q: 'Is poore track ka sabse zyada dohraya gaya sabak kaunsa hai?',
          choices: ["Recovery and telemetry avoid shared failures","Every dependency should never be used by tools","Automatic failover must always be prohibited","More headroom eliminates all config failures"],
          answer: 0,
          explain: 'Yeh sabak <b>teen</b> alag postmortems mein aaya: Cloudflare 2019 (team apne hi internal tools tak nahi pahunch paayi), Roblox 2021 (telemetry Consul par nirbhar thi — 46 ghante ka andhera), Slack 2021 (dashboards usi saturated network par the). Sawaal hamesha ek: <b>"jab X gire, kya main X ke bina X ko dekh aur theek kar sakta hoon?"</b>',
         choiceExplanations: ["Yeh sabak <b>teen</b> alag postmortems mein aaya: Cloudflare 2019 (team apne hi internal tools tak nahi pahunch paayi), Roblox 2021 (telemetry Consul par nirbhar thi — 46 ghante ka andhera), Slack 2021 (dashboards usi saturated network par the). Sawaal hamesha ek: <b>\"jab X gire, kya main X ke bina X ko dekh aur theek kar sakta hoon?\"</b>","Independence is risk-based; trace critical shared failure paths.","Safe automatic failover possible with correct authority/durability protocol.","Headroom does not validate malformed artifacts or safe recovery."] },
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
        choices: ["Impact, timeline, mechanism, evidence and lessons","Only claim personalheroics with no user impact","Onlydramatic scale matters in incident story","Skipuncertainties to make explanation confident"],
        answer: 0,
        explain: 'Yeh dhaancha teen cheezein ek saath dikhata hai jo interviewer dhoondhta hai: <b>maapne ki aadat</b> (numbers), <b>system ki soch</b> (zanjeer, ek doshi nahi), aur <b>seekhne ki aadat</b> (fix jo kadi todta hai). Outage ka size maayne nahi rakhta — vishleshan ki gehrai rakhti hai.',
       choiceExplanations: ["Yeh dhaancha teen cheezein ek saath dikhata hai jo interviewer dhoondhta hai: <b>maapne ki aadat</b> (numbers), <b>system ki soch</b> (zanjeer, ek doshi nahi), aur <b>seekhne ki aadat</b> (fix jo kadi todta hai). Outage ka size maayne nahi rakhta — vishleshan ki gehrai rakhti hai.","Team coordination and measurable outcomes matter more than credit claim.","Small incidents canteach strong correctness/recovery lessons.","Clearly distinguish observed facts from unresolved hypotheses."] },
      {
        q: '"Tum apni team mein reliability kaise badhaoge?"',
        choices: ["Prioritize measured risks and verify safeguards","Alert count alone measures reliability improvement","Test coverage percent alone proves userSLOs","On call rotation alone removes shared bottlenecks"],
        answer: 0,
        explain: 'Baaki teenon madad karte hain par teenon <b>saamanya</b> hain. Sabse achha jawab dikhata hai ki tumne apne hi incidents mein <b>pattern</b> dhoondha hai — aur pattern hamesha amplifier mein hota hai, trigger mein nahi. Ek "jab yeh galat nikle tab kya hoga" wala checklist har naye design par woh sabak lagata hai.',
       choiceExplanations: ["Baaki teenon madad karte hain par teenon <b>saamanya</b> hain. Sabse achha jawab dikhata hai ki tumne apne hi incidents mein <b>pattern</b> dhoondha hai — aur pattern hamesha amplifier mein hota hai, trigger mein nahi. Ek \"jab yeh galat nikle tab kya hoga\" wala checklist har naye design par woh sabak lagata hai.","Noise and unactionable alerts can hurt response; measure outcomes.","Coverage does not guarantee relevant load/failure cases or invariants.","Operational structure helps, but technical failure mechanisms still need change."] },
    ],
  },
},
]);
})();
