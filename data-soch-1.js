/* =====================================================================
   🧠 Soch Akhada — scenarios 1: Data (7) + API (4)
   Shape aur niyam: soch.js ka header aur EXTENDING.md §11.
   Kahani: ChaiPay (UPI wallet). Services: wallet-api, pay-api, api-gateway.
   Database: pg-primary + pg-replica-1 / pg-replica-2. Users: Riya, Aman.
   Har `a` list mein PEHLA jawab sahi hai (renderer shuffle karta hai).
   ===================================================================== */
(function () {
SD.registerScenarios([

/* ---------------------------------------------------------------- DATA */
{
  id: 'stale-balance', icon: '💸', title: 'Paise pahunch gaye, par balance purana dikha', topic: 'data', hard: 2,
  levels: ['replication', 'eventual'],
  story: 'Riya ne Aman ko ₹100 bheje. <code>wallet-api</code> ne write <code>pg-primary</code> par kiya aur Riya ko "Success" dikha. Aman ne turant app kholi. Aman ko purana balance dikha. 2 second baad refresh karne par sahi balance dikha.',
  facts: [
    'Saare <b>write</b>: <code>pg-primary</code>. Saare <b>read</b>: <code>pg-replica-1</code> aur <code>pg-replica-2</code>.',
    'Replication async hai. Aam din mein replica 200 ms se 2 second peeche rehta hai.',
    'Paisa kahin khoya nahi: <code>pg-primary</code> mein Riya aur Aman, dono ka balance sahi hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Aman ko purana balance kyun dikha?', a: [
      ['Read us replica se hua jahan naya write abhi pahuncha nahi tha', 'Async replication mein <code>pg-primary</code> pehle commit karta hai; replica ko copy thodi der baad milti hai. Is beech ka read purana data deta hai. Is deri ka naam <b>replication lag</b> hai.'],
      ['Transfer ka write <code>pg-primary</code> par chupchaap fail ho gaya tha', 'Haalaat mein likha hai ki <code>pg-primary</code> mein dono balance sahi hain, aur 2 second baad sahi balance dikha. Write fail hota toh sahi balance kabhi nahi dikhta.'],
      ['Aman ke phone ne purana balance apne paas cache kar rakha tha', 'Aman ne app abhi kholi thi aur request server tak gayi thi. Jawab replica se aaya, aur replica peeche tha.'],
    ] },
    { t: 'Hal chuno', q: 'Product ka niyam: paise bhejne ya paane ke turant baad <b>dono</b> logon ko sahi balance dikhe. Purani history aur offers thode purane chal sakte hain. Kaunsa hal sahi hai?', a: [
      ['Balance wale read <code>pg-primary</code> se karo; baaki read replica par rahein', 'Sirf woh read primary par jaata hai jise taaza data chahiye. Replica ka fayda (read ka bojh baantna) baaki screens ke liye bana rehta hai.'],
      ['Sirf Riya (bhejne wali) ke read 5 second tak <code>pg-primary</code> par bhejo', 'Riya ke liye theek hai. Lekin Aman ne koi write nahi kiya, toh Aman ka read phir bhi replica par jaayega aur purana balance dikhega.'],
      ['Replica ki ginti 2 se badhakar 6 kar do taaki lag kam ho jaaye', 'Zyada replica lag kam nahi karte. Har replica utna hi peeche rehta hai, isliye purana read phir bhi hoga.'],
    ] },
    { t: 'Keemat', q: 'Balance ke read ab <code>pg-primary</code> par jaate hain. Ab kis cheez par nazar rakhni hogi?', a: [
      ['<code>pg-primary</code> par read ka bojh: balance screen sabse zyada khulti hai', 'Primary par ab write ke saath balance ke read bhi aate hain. CPU aur connection pool dekhna padega. Bojh zyada ho toh sirf "abhi-abhi transfer hua" wale users ke read primary par bhejo.'],
      ['Replica ka lag badh jaayega kyunki replica par read kam ho gaye hain', 'Lag is baat se banta hai ki replica write kitni jaldi apply karta hai. Read kam hone se lag badhta nahi.'],
      ['Transfer ke write ruk jaayenge kyunki read ab primary par lock lenge', 'Saada SELECT write ko block nahi karta (Postgres MVCC). Asar CPU aur connections par padta hai, lock par nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Zaroori read primary se', how: 'Jis screen ko taaza data chahiye (balance), uska read <code>pg-primary</code> par.', cost: 'Primary par read ka bojh badhta hai.', when: 'Sirf kuch screens ko taaza data chahiye.' },
    { n: 'Apna write turant dikhna (read-your-writes)', how: 'Jis user ne abhi likha, uske read kuch second primary par.', cost: 'Sirf likhne wale ko fayda. Doosre user (Aman) ko nahi.', when: 'Profile edit jaisi cheez: "mera badlaav mujhe dikhe".' },
    { n: 'Replica ko rukwana (LSN wait)', how: 'Write ke baad primary ki log position lo. Read tab tak ruke jab tak replica wahan na pahunche.', cost: 'Read ruk sakta hai; code mein position sambhalni padti hai.', when: 'Replica par hi padhna hai aur lag chhota hai.' },
    { n: 'Synchronous replication', how: 'Primary tab tak "commit" nahi bolta jab tak replica likh na le.', cost: 'Har write dheema. Replica band ho toh write atak sakte hain.', when: 'Data khona bilkul manzoor nahi.' },
  ],
  twist: { q: 'Diwali ki raat <code>pg-replica-2</code> 30 second peeche chala gaya. History screen replica se padhti hai, aur log 30 second purani history dekh rahe hain.', a: [
    ['Jo replica tay hadd (jaise 5 second) se zyada peeche ho, use read se hata do', 'App ya load balancer har replica ka lag naapta hai. Hadd paar hote hi us replica ko read milna band; lag theek hote hi wapas. Is tarah "kitna purana data dikh sakta hai" ki ek pakki hadd ban jaati hai.'],
    ['Raat khatam hone tak saare read <code>pg-primary</code> par bhej do', 'Diwali ki raat <code>pg-primary</code> pehle se sabse zyada bojh mein hai. Poora read bojh daalne se primary gir sakta hai, aur tab write bhi band ho jaayenge.'],
    ['Kuch mat karo; history ka 30 second purana hona koi samasya nahi hai', 'Bina hadd ke 30 second kal 5 minute ban sakta hai, aur kisi ko pata nahi chalega. Hadd aur alert dono chahiye.'],
  ] },
  asli: 'Replica ka read sasta hai, lekin thoda purana ho sakta hai. Har screen ke liye poochho: "kitna purana data chalega?" Jahan jawab zero hai, wahan primary se padho.',
  say: 'Async replication mein replica peeche rehta hai, isliye replica ka read purana ho sakta hai. Main read ko do hisson mein baantunga: jise taaza data chahiye (balance) wo primary se, baaki replica se. Replica ke lag par ek hadd aur alert rakhunga.',
},
{
  id: 'cache-stampede', icon: '🐘', title: 'Har 60 second par database 100% CPU', topic: 'data', hard: 2,
  levels: ['stampede', 'caching'],
  story: 'ChaiPay ki home screen "Aaj ke offers" dikhati hai. Offers Redis ki key <code>offers:today</code> mein cache hain, TTL 60 second. Raat 8 baje har 60 second par <code>offers-db</code> ka CPU 100% chhoota hai aur home screen 4 second leti hai.',
  facts: [
    'Home screen: 20,000 request har second.',
    '<code>offers:today</code> banane wali query 800 ms leti hai.',
    'Key expire hote hi, nayi key banne tak, har request ko cache miss milta hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Har 60 second par <code>offers-db</code> kyun dab jaata hai?', a: [
      ['Key expire hote hi hazaaron request ek saath wahi query DB par chalate hain', 'Nayi key banne mein 800 ms lagte hain. Utni der mein lagbhag 16,000 request aate hain; sabko miss milta hai aur sab wahi bhaari query chalate hain. Iska naam <b>cache stampede</b> hai.'],
      ['Redis ki memory bhar gayi hai, isliye Redis key ko baar-baar nikaal deta hai', 'Tab gadbad theek har 60 second par nahi hoti. Yahan taal TTL (60 second) se mil rahi hai.'],
      ['Offers ki query par index nahi hai, isliye wahi query 800 ms le rahi hai', 'Query dheemi zaroor hai. Lekin ek baar chale toh DB aaram se seh leta hai. Dikkat ek saath hazaaron baar chalna hai.'],
    ] },
    { t: 'Hal chuno', q: 'Kaunsa hal stampede ko jad se rokta hai?', a: [
      ['Miss par sirf ek request query chalaye; baaki usi jawab ka intezaar karein', 'Ise <b>single-flight</b> (ya lock-on-miss) kehte hain. DB par ek hi query jaati hai, chahe 16,000 request ko miss mile.'],
      ['Key ka TTL 60 second se badhakar 10 minute kar do taaki key kam baar expire ho', 'Stampede kam baar hoga, lekin jab hoga tab utna hi bada hoga. Aur offers 10 minute purane dikhenge.'],
      ['<code>offers-db</code> ko dugni CPU aur dugni RAM wali badi machine par le jao', '16,000 bhaari query ek saath koi bhi machine nahi sehti. Kharcha dugna, samasya wahi.'],
    ] },
    { t: 'Keemat', q: 'Single-flight lag gaya. Ab kaunsa naya khatra dekhna hoga?', a: [
      ['Query chalane wala request atak jaaye toh intezaar wale sab atak jaayenge', 'Isliye lock par timeout zaroori hai. Aur intezaar wale request ko purana (stale) jawab de dena behtar hai, khaali haath rokne se.'],
      ['Redis mein keys ki ginti dugni ho jaayegi aur Redis ki memory bhar jaayegi', 'Lock ke liye sirf ek chhoti key judti hai. Memory par asar na ke barabar hai.'],
      ['Offers ab update hi nahi honge kyunki key par lock laga rahega', 'Lock sirf query chalne tak rehta hai (yahan lagbhag 800 ms). Uske baad key naye data ke saath likhi jaati hai.'],
    ] },
  ],
  fixes: [
    { n: 'Single-flight (lock-on-miss)', how: 'Miss par ek hi request DB jaata hai; baaki rukte hain.', cost: 'Lock par timeout sambhalna padta hai.', when: 'Ek bahut garam key, bhaari query.' },
    { n: 'Purana do, peeche se naya banao', how: 'Expire ke baad bhi purana jawab do; background mein key dobara banao (stale-while-revalidate).', cost: 'User ko thodi der purana data dikhta hai.', when: 'Thoda purana data chalta hai (offers, feed).' },
    { n: 'TTL mein random farak (jitter)', how: 'Har key ka TTL thoda alag: 60 second ± 10%.', cost: 'Ek akeli garam key par madad nahi karta.', when: 'Bahut saari keys ek saath bani hon.' },
    { n: 'Pehle se garam rakhna (pre-warm)', how: 'Ek job key ko expire hone se pehle dobara bana deti hai.', cost: 'Ek job sambhalni padti hai.', when: 'Gini-chuni, bahut garam keys.' },
  ],
  twist: { q: 'Ab home screen par 5 lakh alag keys hain (har sheher ke offers). Deploy ke baad saari keys ek saath bani thi, isliye saari ek saath expire hoti hain.', a: [
    ['Har key ke TTL mein thoda random farak (jitter) jod do', 'Keys alag-alag waqt par expire hongi. DB par bojh ek jhatke ki jagah poore minute mein phail jaayega.'],
    ['Saari keys ka TTL ek saath badhakar 1 ghanta kar do', 'Saari keys phir bhi ek saath expire hongi; bas 1 ghante baad. Jhatka utna hi bada rahega.'],
    ['Deploy sirf raat 3 baje karo jab traffic kam hota hai', 'Keys ka expire hona TTL se chalta hai. Din mein bhi saari keys har TTL par ek saath expire hongi.'],
  ] },
  asli: 'Cache ka khatra "miss" nahi hai. Khatra hai ek saath hazaaron miss. Bhaari query ke saamne hamesha poochho: "key expire hone ke pal mein kitne request aayenge?"',
  say: 'Garam key expire hote hi saare request DB par girte hain; ise cache stampede kehte hain. Main miss par single-flight lagaunga taaki ek hi request query chalaye, baaki ko purana jawab doonga, aur bahut saari keys ke TTL mein jitter jodunga.',
},
{
  id: 'stale-offer-cache', icon: '🏷️', title: 'Merchant ne cashback ghataya, app 10 minute purana dikhati rahi', topic: 'data', hard: 2,
  levels: ['cache-invalidation', 'caching'],
  story: 'Merchant "Sharma Sweets" ne ChaiPay dashboard par cashback 10% se 5% kiya. <code>merchant-api</code> ne <code>merchant-db</code> update kar diya. Lekin user app 10 minute tak 10% dikhati rahi, aur 300 logon ne 10% maankar payment kiya.',
  facts: [
    'User app cashback Redis ki key <code>merchant:&lt;id&gt;</code> se padhti hai. TTL 10 minute.',
    'Update ke waqt koi bhi code is cache key ko nahi chhoota.',
    'Merchant din mein 2–3 baar hi offer badalte hain.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'App 10 minute tak purana cashback kyun dikhati rahi?', a: [
      ['Update <code>merchant-db</code> mein gaya, par cache ki purani key TTL tak zinda rahi', 'Database aur cache do alag jagah hain. Database badla, cache ko kisi ne bataya nahi. Cache apne TTL (10 minute) tak purana jawab deta raha.'],
      ['<code>merchant-db</code> ka update commit hi nahi hua tha, isliye purana data dikha', 'Dashboard par naya 5% dikh raha tha aur 10 minute baad app mein bhi aa gaya. Update commit hua tha.'],
      ['User app ka purana version chal raha tha jo naya cashback nahi samajhta', '10 minute baad wahi app sahi cashback dikhane lagi. App ka version nahi, cache ka TTL wajah hai.'],
    ] },
    { t: 'Hal chuno', q: 'Offer badalte hi user ko naya cashback dikhna chahiye. Sabse surakshit hal kaunsa hai?', a: [
      ['Database update ke turant baad us merchant ki cache key delete kar do', 'Agla read miss paata hai, database se naya data laata hai aur cache mein bhar deta hai. Is tareeke ko <b>cache-aside invalidation</b> kehte hain.'],
      ['Database update ke turant baad cache mein naya value seedha likh do', 'Do update ek saath aayein toh purana value baad mein likha ja sakta hai, aur cache galat reh jaata hai. Delete zyada surakshit hai.'],
      ['Cache key ka TTL 10 minute se ghatakar sirf 1 second kar do', 'Cache lagbhag bekaar ho jaata hai: har second database par read. Aur 1 second ki galat khidki phir bhi bachi rehti hai.'],
    ] },
    { t: 'Keemat', q: 'Ab update ke baad key delete hoti hai. Phir bhi kis halat mein purana data cache mein laut sakta hai?', a: [
      ['Delete se theek pehle shuru hua ek read purana data cache mein likh de', 'Read ne database se purana value padha. Tabhi update aur delete hue. Phir read ne purana value cache mein likh diya. Isiliye chhota TTL "safety net" ki tarah rakhte hain, ya delete thodi der baad dobara karte hain.'],
      ['Merchant ek hi din mein teen se zyada baar apna offer badal de', 'Har update apni delete khud karta hai. Update ki ginti se cache galat nahi hota.'],
      ['Do user ek hi second mein us merchant ka page ek saath khol lein', 'Dono read database se wahi naya data paate hain aur cache mein wahi likhte hain. Isse purana data nahi lautta.'],
    ] },
  ],
  fixes: [
    { n: 'Write par key delete', how: 'Database update ke baad cache key delete; agla read naya data bharta hai.', cost: 'Delete fail ho ya race ho toh purana data reh sakta hai.', when: 'Aam halat. Sabse pehle yahi.' },
    { n: 'Chhota TTL (safety net)', how: 'Key apne aap kuch der mein expire ho jaati hai.', cost: 'TTL jitni der purana data dikh sakta hai.', when: 'Hamesha, delete ke saath jodkar.' },
    { n: 'Change-log se delete (CDC)', how: 'Ek worker database ke badlaav padhta hai aur key delete karta hai.', cost: 'Ek aur system chalana padta hai; thodi deri.', when: 'Kai services ek hi data cache karti hain.' },
  ],
  twist: { q: 'Delete call Redis tak pahunchi hi nahi (network mein gadbad). <code>merchant-api</code> ne error ko ignore kar diya.', a: [
    ['TTL chhota rakho, aur fail hui delete ko queue se dobara chalao', 'TTL hadd tay karta hai ki purana data kitni der dikhega. Queue wali retry us der ko aur chhota karti hai.'],
    ['Database ka update bhi rollback kar do taaki dono purane rahein', 'Merchant ka sahi badlaav sirf isliye kho jaayega ki cache tak baat nahi pahunchi. Cache database ka malik nahi hai.'],
    ['Cache hata do aur har read seedha database se karo', 'Ek chhoti gadbad ke liye poora cache hatane se database par 100% read ka bojh aa jaata hai.'],
  ] },
  asli: 'Cache database ki copy hai, aur copy ko khud pata nahi chalta ki asli badal gaya. Har cache ke liye likho: "data badle toh is key ko kaun, kab hatayega?"',
  say: 'Yahan cache invalidation gayab thi. Main write ke baad key delete karunga (cache-aside), chhota TTL safety net ki tarah rakhunga, aur fail hui delete ko retry karunga. Value seedha likhne ki jagah delete isliye, kyunki do update ki race mein delete surakshit hai.',
},
{
  id: 'hot-shard', icon: '🔥', title: 'Aath mein se ek shard jal raha hai', topic: 'data', hard: 3,
  levels: ['sharding', 'conshash'],
  story: 'ChaiPay ka <code>txn-db</code> 8 shards mein banta hai. Shard key <code>merchant_id</code> hai. IPL final ki raat merchant "DreamTeam11" akela 40% transactions la raha hai. Shard 3 (jahan DreamTeam11 hai) 95% CPU par hai. Baaki 7 shards 15% par hain.',
  facts: [
    'Shard = <code>hash(merchant_id) % 8</code>. Ek merchant ke saare rows ek hi shard par.',
    'Bojh zyadatar <b>write</b> ka hai (naye payments).',
    'Sabse aam query: "is merchant ke aaj ke transactions".',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Sirf shard 3 kyun garam hai?', a: [
      ['Ek hi merchant itna bada hai ki uski key akeli ek shard ko bhar deti hai', 'Hash keys ko barabar baantta hai, bojh ko nahi. Ek key ka saara bojh ek hi shard par girta hai. Ise <b>hot key</b> kehte hain.'],
      ['Hash function kharab hai aur zyada merchants ko shard 3 par bhej raha hai', 'Baaki 7 shards barabar 15% par hain. Gadbad ek merchant ki hai, hash function ki nahi.'],
      ['8 shards kam pad gaye hain kyunki poora data bahut bada ho gaya hai', 'Tab saare shards garam hote. Yahan sirf ek shard garam hai.'],
    ] },
    { t: 'Hal chuno', q: 'Agle mahine ke liye pakka hal chahiye. Kaunsa hal DreamTeam11 ka bojh sach mein baantta hai?', a: [
      ['Shard key mein ek hissa aur jodo: <code>merchant_id + din</code>', 'DreamTeam11 ke rows ab din ke hisaab se alag shards par jaate hain. Aur "aaj ke transactions" wali query phir bhi ek hi shard par jaati hai.'],
      ['Shards 8 se 16 kar do, shard key wahi <code>merchant_id</code> rakho', 'DreamTeam11 phir bhi poora ek hi shard par rahega. Wo shard utna hi garam rahega.'],
      ['Shard 3 ke saath teen read replica jod do taaki bojh bante', 'Bojh write ka hai. Replica read baantte hain, write nahi.'],
    ] },
    { t: 'Keemat', q: 'Shard key ab <code>merchant_id + din</code> hai. Kaunsi query ab mehengi ho gayi?', a: [
      ['"Is merchant ke pichhle 90 din" — ab kai shards se data jodna padega', '90 din matlab 90 alag keys, jo kai shards par hain. Har shard se jawab mangao, phir jodo. Ise <b>scatter-gather</b> kehte hain.'],
      ['"Is merchant ke aaj ke transactions" — ab saare 8 shards par jaayegi', 'Aaj ka din ek hi key hai, isliye query ek hi shard par jaati hai. Yahi is key ka fayda hai.'],
      ['"Naya payment likhna" — ab har write do shards par likha jaayega', 'Har row ki ek hi key hai, isliye ek hi shard. Write dugna nahi hota.'],
    ] },
  ],
  fixes: [
    { n: 'Milee-jule shard key', how: '<code>merchant_id + din</code>: ek merchant ka data kai shards par.', cost: 'Lambi avadhi wali query kai shards par jaati hai.', when: 'Queries zyadatar ek chhoti avadhi ki hain.' },
    { n: 'Bade merchant ka apna shard', how: 'Ek routing table: "DreamTeam11 → shard 9".', cost: 'Routing table sambhalni padti hai.', when: 'Sirf 1–2 bahut bade merchant hain.' },
    { n: 'Write ko queue se likhna', how: 'Payments pehle queue mein, phir shard par tay raftaar se.', cost: 'Data thodi der baad dikhta hai.', when: 'Bojh ka jhatka chhota hai (ek match).' },
  ],
  twist: { q: 'Product team kehti hai: merchant dashboard par "pichhle 90 din ka total" turant dikhna chahiye.', a: [
    ['Har din ka total ek alag chhoti table mein pehle se jodkar rakho', 'Dashboard 90 chhote rows padhta hai, crore rows nahi. Ise pre-aggregation kehte hain.'],
    ['Shard key wapas sirf <code>merchant_id</code> kar do taaki ek shard ho', 'Garam shard wali samasya wapas aa jaayegi.'],
    ['Dashboard ke har load par saare shards se 90 din ke rows mangao', 'Har load par crore rows ka scatter-gather: dheema aur mehenga.'],
  ] },
  asli: 'Shard key do sawalon ka jawab hai: "bojh barabar bantega?" aur "meri aam query ek hi shard par jaayegi?" Ek sawal bhoolte hi ya garam shard milta hai ya scatter-gather.',
  say: 'Yeh hot key ki samasya hai: hash keys ko baantta hai, bojh ko nahi. Main shard key ko merchant_id + din banaunga taaki bada merchant kai shards par bante aur aaj wali query ek shard par rahe. Lambi report ke liye roz ka total pehle se jodkar rakhunga.',
},
{
  id: 'pool-exhaust', icon: '🚰', title: 'CPU 12% hai, phir bhi 30% request timeout', topic: 'data', hard: 2,
  levels: ['pool'],
  story: 'Somvaar subah <code>wallet-api</code> ke 30% request 5 second baad timeout ho rahe hain. Dashboard par <code>wallet-api</code> ka CPU 12% hai aur <code>pg-primary</code> ka 20%. Kal raat ek naya endpoint live hua tha: "mahine ka statement PDF".',
  facts: [
    '<code>wallet-api</code> ka database connection pool: 20 connection.',
    'Statement PDF wali query 8 second leti hai.',
    'Subah 9 baje 25 log ek saath statement download kar rahe the.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'CPU khaali hai, phir bhi request timeout kyun ho rahe hain?', a: [
      ['Dheemi statement queries ne pool ke saare 20 connection pakad rakhe hain', '25 dheemi queries, 20 connection: saare connection 8-8 second ke liye busy. Tez request connection ke intezaar mein hi timeout ho jaate hain. CPU khaali hai kyunki sab intezaar kar rahe hain, kaam nahi.'],
      ['<code>pg-primary</code> par bojh zyada hai aur wo nayi queries ko mana kar raha hai', '<code>pg-primary</code> ka CPU 20% hai. Database ke paas jagah hai. Line database par nahi, pool par lagi hai.'],
      ['<code>wallet-api</code> ke servers kam hain, isliye request server par atak rahe hain', '<code>wallet-api</code> ka CPU 12% hai. Servers ke paas kaam karne ki jagah hai; unhe connection nahi mil raha.'],
    ] },
    { t: 'Hal chuno', q: 'Aaj hi, kam se kam badlaav mein, tez requests ko bachana hai. Kya karoge?', a: [
      ['Statement queries ko apna alag chhota pool do, jaise 4 connection', 'Dheemi queries ab sirf apne 4 connection rok sakti hain. Baaki 16 connection tez requests ke liye bache rehte hain. Is deewar ko <b>bulkhead</b> kehte hain.'],
      ['Connection pool ko 20 se badhakar seedha 200 connection kar do', 'Ab 200 dheemi queries ek saath database par chal sakti hain, aur database sach mein dab jaayega. Postgres har connection ke liye memory bhi leta hai.'],
      ['<code>wallet-api</code> ke servers dugne kar do taaki zyada request sambhlein', 'Har naya server apna 20 ka pool laata hai. Dheemi queries har pool ko waise hi bhar dengi.'],
    ] },
    { t: 'Keemat', q: 'Statement ko 4 connection ka alag pool mil gaya. Statement download karne walon ke saath ab kya hoga?', a: [
      ['Paanchve aadmi ko line mein rukna padega ya "thodi der mein try karo" milega', 'Yahi keemat hai: dheema feature apni line mein rukta hai aur poori app ko nahi rokta. Agla kadam: PDF ko background job banao aur tayyar hone par user ko batao.'],
      ['Statement ki query ab 8 second ki jagah lagbhag 2 second mein chalegi', 'Pool query ko tez nahi karta. Pool sirf tay karta hai ki ek saath kitni queries chalein.'],
      ['Statement mein kuch transactions gayab honge kyunki connection kam hain', 'Connection ki ginti data ke sahi ya galat hone par koi asar nahi daalti.'],
    ] },
  ],
  fixes: [
    { n: 'Alag pool (bulkhead)', how: 'Dheeme kaam ka apna chhota pool.', cost: 'Dheeme kaam ki line lambi ho sakti hai.', when: 'Ek dheema feature sabko rok raha ho.' },
    { n: 'Query par timeout', how: 'Main pool par hadd: 2 second se lambi query kaat do.', cost: 'Lambi lekin sahi query bhi kat jaati hai.', when: 'Hamesha, safety net ki tarah.' },
    { n: 'Background job + replica', how: 'PDF peeche se banta hai aur read replica se padhta hai.', cost: 'User ko turant nahi milta; notification chahiye.', when: 'Bhaari report, export, PDF.' },
  ],
  twist: { q: 'Team ne <code>wallet-api</code> ke servers 4 se 40 kar diye. Ab <code>pg-primary</code> "too many connections" de raha hai.', a: [
    ['Beech mein connection pooler (jaise PgBouncer) lagao jo DB connection baante', '40 servers × 20 = 800 connection. Pooler app ke sainkdon connection ko database ke thode se connection par chalata hai.'],
    ['<code>pg-primary</code> par <code>max_connections</code> ko badhakar seedha 5,000 connection kar do', 'Postgres mein har connection ek process aur memory leta hai. 5,000 connection par database khud dheema ho jaata hai.'],
    ['Har server ka pool 20 se ghatakar sirf 1 connection kar do taaki kul 40 hon', 'Ek server ek waqt mein ek hi query chala paayega. Request server ke andar hi line mein lag jaayenge.'],
  ] },
  asli: '"CPU khaali, phir bhi timeout" ka matlab lagbhag hamesha ek line hai jo dikh nahi rahi: connection pool, thread pool ya lock. Pehle poochho: "request kis cheez ka intezaar kar raha hai?"',
  say: 'CPU kam aur timeout zyada ho toh main pool ka wait time dekhunga. Yahan dheemi queries ne saare connection rok liye the. Main dheeme kaam ko alag pool doonga (bulkhead), query timeout lagaunga, aur PDF ko background job bana doonga.',
},
{
  id: 'migration-lock', icon: '🔒', title: 'Ek ALTER TABLE ne 25 minute payments rok diye', topic: 'data', hard: 3,
  levels: ['migrations'],
  story: 'Dopahar 2 baje ek developer ne <code>transactions</code> table par migration chalaya: <code>ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT</code>. Usi pal se har payment latak gaya. 25 minute baad sab apne aap theek ho gaya.',
  facts: [
    '<code>transactions</code> table mein 40 crore rows hain.',
    'Postgres mein column ka type badalne par poori table dobara likhi jaati hai.',
    'Table dobara likhte waqt us par poora lock rehta hai: read aur write, dono rukte hain.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Payments 25 minute kyun latke rahe?', a: [
      ['Migration ne poori table par lock liya aur 40 crore rows dobara likhe', 'Jab tak table dobara likhi ja rahi thi, koi bhi read ya write us table ko chhoo nahi sakta tha. Payments fail nahi hue; payments lock ke khulne ka intezaar kar rahe the.'],
      ['Migration ne database ki disk bhar di, isliye naye payments ruk gaye', 'Disk bharti toh error aata aur 25 minute baad apne aap theek nahi hota. Yahan requests latki thi aur lock khulte hi chal padi.'],
      ['Naya column type app ke code se nahi mila, isliye payments fail hue', 'Type na milta toh error turant aata, aur migration ke baad bhi aata rehta. Yahan migration khatam hote hi sab theek ho gaya.'],
    ] },
    { t: 'Hal chuno', q: 'Agli baar wahi badlaav bina payments roke kaise karoge?', a: [
      ['Naya column jodo, dono mein likho, thode-thode rows copy karo, phir switch', 'Is tareeke ka naam <b>expand → backfill → switch → contract</b> hai. Har kadam chhota hai, lamba lock nahi leta, aur har kadam se wapas lauta ja sakta hai.'],
      ['Wahi ALTER raat 3 baje chalao jab traffic sabse kam hota hai, phir so jao', 'UPI raat ko bhi chalta hai. 25 minute ka poora band raat ko bhi band hi hai. Aur beech mein fail hua toh subah tak pata nahi chalega.'],
      ['ALTER chalane se pehle <code>pg-primary</code> ko dugni badi machine par le jao', 'Table shaayad 25 ki jagah 15 minute mein likhi jaaye. Lock phir bhi poore waqt rahega.'],
    ] },
    { t: 'Keemat', q: 'Expand → backfill → switch wale tareeke ki keemat kya hai?', a: [
      ['Kuch din tak code ko purana aur naya, dono column sambhalne padte hain', 'Ek ALTER ki jagah 3–4 deploy: dono mein likhna, copy jaanchna, switch karna, purana column hatana. Badle mein zero downtime milta hai.'],
      ['Backfill ke dauraan table ke saare read galat amount lautate rahenge', 'Switch hone tak saare read purane column se hi chalte hain. Purana column poore waqt sahi rehta hai.'],
      ['Table ka size hamesha ke liye dugna ho jaata hai aur kam nahi hota', 'Purana column hatane ke baad jagah wapas mil jaati hai. Extra jagah sirf beech ke dino mein lagti hai.'],
    ] },
  ],
  fixes: [
    { n: 'Expand → backfill → switch → contract', how: 'Naya column, dono mein write, chhote batch mein copy, phir read badlo, phir purana hatao.', cost: 'Kai deploy; kuch din do column.', when: 'Badi table, band karna manzoor nahi.' },
    { n: 'Online schema-change tool', how: 'Tool ek chhaya table banata hai, data copy karta hai, phir table badal deta hai (jaise gh-ost, MySQL ke liye).', cost: 'Extra disk; tool seekhna padta hai.', when: 'Tool us database ke liye maujood ho.' },
    { n: 'Seedha ALTER, tay band-waqt mein', how: 'Users ko pehle batao, phir ALTER chalao.', cost: 'Utni der service band.', when: 'Chhoti table, ya band hona manzoor.' },
  ],
  twist: { q: 'Backfill job ek batch mein 10 lakh rows update kar rahi hai. <code>pg-replica-1</code> 5 minute peeche chala gaya.', a: [
    ['Batch chhota karo (jaise 5,000 rows) aur har batch ke baad lag dekho', 'Chhota batch = chhota transaction. Replica saath chal paata hai. Lag hadd se upar jaaye toh job khud ruk jaaye.'],
    ['Backfill poora hone tak replica par replication ko rok kar rakho', 'Replica aur peeche chala jaayega, aur primary gire toh taaza copy nahi hogi.'],
    ['Batch 10 lakh se 1 crore rows karo taaki job jaldi khatam ho jaaye', 'Bada batch = bada transaction: lag aur badhega, aur rows par lock lamba rahega.'],
  ] },
  asli: 'Badi table par "ek command" wala badlaav khatarnaak hai. Schema ka badlaav bhi ek deploy hai: chhote kadam, har kadam se wapsi ka raasta.',
  say: 'Postgres mein column type badalna poori table dobara likhta hai aur poora lock leta hai. 40 crore rows par main expand-backfill-switch-contract karunga: naya column, dual write, chhote batch mein backfill replica lag dekhte hue, phir read switch, phir purana column hatana.',
},
{
  id: 'nplus1-screen', icon: '🔁', title: 'Ek screen, 51 queries', topic: 'data', hard: 1,
  levels: ['nplus1'],
  story: 'ChaiPay ki "Recent transactions" screen 50 transactions dikhati hai, har ek ke saath merchant ka naam. Screen 1.8 second leti hai. Database ke log mein ek screen load par 51 queries dikhti hain.',
  facts: [
    'Query 1: user ke 50 transactions (12 ms).',
    'Phir 50 baar: <code>SELECT * FROM merchants WHERE id = ?</code>. Har query database mein 2 ms leti hai.',
    '<code>wallet-api</code> aur database alag region mein hain: ek aana-jaana (round trip) 30 ms.',
  ],
  steps: [
    { t: 'Asli wajah', q: '1.8 second kahan ja rahe hain?', a: [
      ['Har transaction ke liye merchant ki alag query: 50 baar network ka aana-jaana', '50 × (30 ms network + 2 ms query) ≈ 1.6 second. Query tez hai; waqt aane-jaane mein ja raha hai. Is pattern ka naam <b>N+1 query</b> hai.'],
      ['<code>merchants</code> table par <code>id</code> ka index nahi hai, isliye lookup dheema', 'Har merchant query 2 ms mein chal rahi hai, yaani index hai. Waqt database ke andar nahi, network mein ja raha hai.'],
      ['Pehli query 50 transactions laane mein hi zyadatar waqt le leti hai', 'Pehli query sirf 12 ms leti hai.'],
    ] },
    { t: 'Hal chuno', q: 'Sabse seedha hal kaunsa hai?', a: [
      ['50 merchant ids ek hi query mein mangao: <code>WHERE id IN (...)</code>', 'Ab sirf 2 aana-jaana: transactions, phir saare merchants. Lagbhag 75 ms.'],
      ['Merchant ki 50 queries ko 50 threads mein ek saath chala do', 'Waqt ghatega, lekin ek screen ke liye 50 database connection chahiye. Connection pool turant khaali ho jaayega.'],
      ['Database ko zyada CPU wali badi machine par le jao', 'Database ka CPU bottleneck nahi hai. Waqt 50 baar ke aane-jaane mein ja raha hai.'],
    ] },
    { t: 'Keemat', q: 'Ab ek <code>IN (...)</code> query hai. Kal kisi ne screen ko 50 se 5,000 transactions par kar diya. Kya dekhna hoga?', a: [
      ['IN list 5,000 ids ki ho jaayegi: query bhaari aur jawab bada', 'Ids ko tukdon mein bhejo (jaise 500-500) aur page size par hadd lagao.'],
      ['Queries wapas 5,001 ho jaayengi, pehle jaisi N+1 samasya', 'IN query ek hi rehti hai, chahe list kitni bhi lambi ho. Samasya ginti ki nahi, query ke size ki hai.'],
      ['<code>merchants</code> table par lock lag jaayega aur write rukenge', 'Saada SELECT write ko block nahi karta.'],
    ] },
  ],
  fixes: [
    { n: 'Ek batch query (IN)', how: 'Saare ids ek query mein.', cost: 'Bahut lambi list ko tukdon mein todna padta hai.', when: 'Sabse aam hal.' },
    { n: 'JOIN', how: 'Transactions aur merchants ek hi query mein jodo.', cost: 'Dono table ek hi database mein hone chahiye.', when: 'Dono table saath rehte hain.' },
    { n: 'Merchant ka cache', how: 'Naam aur logo cache mein; kam badalte hain.', cost: 'Badlaav par cache hatana padta hai.', when: 'Wahi merchants baar-baar aate hain.' },
  ],
  twist: { q: 'Merchant ka data ab alag <code>merchant-service</code> ke paas hai, apne alag database mein. JOIN mumkin nahi.', a: [
    ['<code>merchant-service</code> se batch API maango: ek call mein 50 ids', 'N+1 HTTP par bhi wahi samasya hai. Hal bhi wahi: ek call mein saare ids, aur upar se cache.'],
    ['<code>wallet-api</code> se <code>merchant-service</code> ka database seedha padh lo', '<code>merchant-service</code> apna schema badlega toh <code>wallet-api</code> toot jaayega. Service ki deewar isi ke liye hai.'],
    ['50 HTTP call ek-ek karke karo aur timeout badhakar 10 second kar do', '50 baar ka aana-jaana wapas. Ek dheemi call poori screen ko rok degi.'],
  ] },
  asli: 'Tez query bhi dheemi screen bana sakti hai agar wo 50 baar chale. Query ka waqt nahi, <b>query ki ginti × aane-jaane ka waqt</b> naapo.',
  say: 'Yeh N+1 hai: list ki ek query, phir har row ke liye ek aur. Main ids ko ek IN query ya JOIN mein laaunga. Agar data doosri service ke paas hai toh batch API maangunga aur upar se cache lagaunga.',
},

/* ----------------------------------------------------------------- API */
{
  id: 'double-debit', icon: '💳', title: '₹500 ka payment, account se ₹1,000 kate', topic: 'api', hard: 2,
  levels: ['idempotency', 'retries'],
  story: 'Riya ne metro mein ₹500 ka payment kiya. Network kamzor tha. App 10 second ruki, phir "Dobara koshish karo" dikhaya. Riya ne button dabaya. Payment ho gaya, lekin Riya ke account se ₹1,000 kate.',
  facts: [
    'Pehli request <code>pay-api</code> tak pahunchi aur ₹500 kat gaye. Sirf jawab raaste mein kho gaya.',
    'App ne wahi <code>POST /payments</code> dobara bheji.',
    '<code>pay-api</code> ke liye dono request do alag naye payment the.',
  ],
  steps: [
    { t: 'Asli wajah', q: '₹1,000 kyun kate?', a: [
      ['Pehla payment safal tha; jawab khoya, aur retry ne naya payment bana diya', 'Client ko pata nahi chal sakta ki request khoyi ya jawab khoya. Dono halat mein client ko bas "koi jawab nahi" dikhta hai. Server ke paas dono request ko jodne ka koi tareeka nahi tha.'],
      ['<code>pay-api</code> ne ek hi request ko apne andar do baar chala diya tha', 'Haalaat mein likha hai ki app ne request dobara bheji. Server tak do alag request pahunchi.'],
      ['Bank ne apni taraf se ek hi payment ko galti se do baar kaat diya', '<code>pay-api</code> ne khud do payment banaye. Bank ne wahi kiya jo use bheja gaya.'],
    ] },
    { t: 'Hal chuno', q: 'Retry surakshit kaise banega?', a: [
      ['App har payment ke saath ek unique key bheje; server wahi key dobara na kaate', 'Is key ko <b>idempotency key</b> kehte hain. Pehli baar server key aur nateeja save karta hai. Wahi key dobara aaye toh server purana nateeja lauta deta hai, paisa dobara nahi kaatta.'],
      ['App se "Dobara koshish karo" button hata do; user khud naya payment kare', 'User khud dobara payment karega, aur wahi do baar kataa hoga. Bas ab haath se.'],
      ['Server ek minute ke andar same amount ka doosra payment block kar de', 'Riya sach mein ₹500 ki do cheezein kharide toh sahi payment bhi rukega. Aur 61 second baad ka retry nikal jaayega.'],
    ] },
    { t: 'Keemat', q: 'Idempotency key lagane mein sabse naazuk hissa kaunsa hai?', a: [
      ['Key ka check aur paisa kaatna, dono ek hi transaction mein hone chahiye', 'Warna do request ek saath aayein toh dono ko "key nahi mili" dikhega aur dono paisa kaat denge. Key par unique constraint lagao aur usi transaction mein paisa kaato.'],
      ['Key ko hamesha ke liye rakhna padta hai, isliye database bharta jaata hai', 'Retry kuch second ya ghanton mein aate hain. Key ko 24 ghante se kuch din rakhna kaafi hai.'],
      ['Key banane ke liye app ko har baar server se ek extra call karni padti hai', 'Key app khud banati hai (ek random UUID). Server ko poochhne ki zaroorat nahi.'],
    ] },
  ],
  fixes: [
    { n: 'Idempotency key', how: 'Client ki unique key; server key + nateeja save karta hai.', cost: 'Ek table, aur check + kaam ek transaction mein.', when: 'Har "paisa ya state badalne wali" POST.' },
    { n: 'Kudrati key par unique constraint', how: 'Jaise <code>order_id</code>: ek order ka ek hi payment.', cost: 'Sirf wahan jahan aisi key pehle se hai.', when: 'Order, booking, invoice.' },
    { n: 'Retry se pehle status poochhna', how: 'App pehle <code>GET</code> se poochhe: "mera pichhla payment hua?"', cost: 'Ek extra call; do request ki race phir bhi bachi.', when: 'Sahaayak ki tarah, akela nahi.' },
  ],
  twist: { q: 'Dono request 5 ms ke farak se do alag servers par pahunchi. Pehli request abhi chal rahi hai.', a: [
    ['Doosri ko "pehli abhi chal rahi hai" bolo (409 ya intezaar); paisa mat kaato', 'Pehli request key ko "chal raha hai" likhkar insert karti hai. Unique constraint doosri ko rok deta hai.'],
    ['Doosri ko turant "safal" bata do, bina yeh jaanche ki pehli ka kya hua', 'Pehli request abhi fail bhi ho sakti hai. Tab user ko jhootha "safal" dikhega.'],
    ['Dono ko chalne do aur baad mein ek payment ka refund user ko kar do', 'User ka paisa kuch din atka rahega, aur support team par bojh aayega.'],
  ] },
  asli: 'Network par "jawab nahi aaya" ka matlab "kaam nahi hua" nahi hota. Jo request paisa ya state badalti hai, use aisa banao ki do baar aane par bhi asar ek baar ho.',
  say: 'Timeout par client nahi jaan sakta ki payment hua ya nahi, isliye retry hoga hi. Main POST ko idempotent banaunga: client ek idempotency key bhejega, server key par unique constraint ke saath usi transaction mein paisa kaatega, aur wahi key dobara aane par purana nateeja lautayega.',
},
{
  id: 'deep-offset', icon: '📄', title: 'Page 1 turant, page 40,000 par timeout', topic: 'api', hard: 1,
  levels: ['offset-pain', 'cursor'],
  story: 'ChaiPay merchant dashboard par "Saare transactions" ki list hai. Page 1 turant khulta hai. Ek bada merchant page 40,000 kholta hai, aur wo page 9 second leta hai, kabhi timeout.',
  facts: [
    'API: <code>GET /transactions?page=40000&amp;size=50</code>.',
    'SQL: <code>ORDER BY created_at DESC LIMIT 50 OFFSET 1999950</code>.',
    'Is merchant ke 2.4 crore rows hain. <code>created_at</code> par index hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Page 40,000 itna dheema kyun hai?', a: [
      ['Database pehle 20 lakh rows padhkar phenkta hai, phir aakhri 50 deta hai', 'OFFSET ka matlab "itne rows chhod do" hai. Chhodne ke liye bhi database ko un rows tak chalkar jaana padta hai. Page jitna gehra, kaam utna zyada.'],
      ['Page 40,000 ka purana data disk ke kisi dheeme hisse par rakha hua hai', 'Dheemapan OFFSET ke saath seedha badhta hai: page 20,000 lagbhag aadha waqt leta hai. Wajah ginti hai, disk ki jagah nahi.'],
      ['LIMIT 50 bahut bada hai; LIMIT 10 karne par page turant khulega', 'Database phir bhi 20 lakh rows chhodega. 50 ki jagah 10 rows lautane se farak na ke barabar hai.'],
    ] },
    { t: 'Hal chuno', q: 'Har page ko ek jaisa tez kaise banaoge?', a: [
      ['Pichhle page ki aakhri row ka pata bhejo: <code>WHERE created_at &lt; ?</code>', 'Index seedha us jagah pahunch jaata hai aur agle 50 rows deta hai. Is "pata" ko <b>cursor</b> kehte hain (keyset pagination).'],
      ['<code>created_at</code> ke index ko dobara banao aur OFFSET wahi rakho', 'Index pehle se hai aur sort bacha raha hai. Phir bhi database ko 20 lakh entries par chalna padta hai.'],
      ['Poori list ek hi baar mein bhej do aur paging app ke andar karo', '2.4 crore rows ka jawab na network sehta hai, na browser.'],
    ] },
    { t: 'Keemat', q: 'Cursor wali paging mein kya kho jaata hai?', a: [
      ['"Seedha page 40,000 par jao" wala button ab nahi ban sakta', 'Cursor sirf "agla" aur "pichhla" jaanta hai. Door jaane ke liye tareekh ka filter do: "1 March ke transactions dikhao".'],
      ['Har page ab pehle se dheema khulega kyunki cursor ko decode karna padta hai', 'Cursor decode karna kuch microsecond ka kaam hai. Har page lagbhag page 1 jitna tez khulta hai.'],
      ['Naya transaction aane par list mein wahi rows dobara dikhne lagengi', 'Yeh samasya OFFSET ki hai, jahan naye row aane par poori list khisak jaati hai. Cursor ek tay jagah se aage padhta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Cursor (keyset) paging', how: '<code>WHERE (created_at, id) &lt; (?, ?) LIMIT 50</code>.', cost: 'Seedha kisi page number par nahi ja sakte.', when: 'Lambi list, "aur dikhao" wali screen.' },
    { n: 'OFFSET paging', how: '<code>LIMIT 50 OFFSET n</code>.', cost: 'Gehra page dheema; list khisakti hai.', when: 'Chhota data, kuch hi page.' },
    { n: 'Tareekh ka filter', how: 'User tareekh chunta hai; index seedha wahan jaata hai.', cost: 'UI badalna padta hai.', when: 'User ko purana data dhoondhna ho.' },
  ],
  twist: { q: 'Do transactions ka <code>created_at</code> bilkul ek jaisa hai, aur ek row list se gayab ho gayi.', a: [
    ['Cursor mein <code>created_at</code> ke saath <code>id</code> bhi rakho', 'Jab do rows ka waqt same ho toh <code>id</code> kram tay karta hai. Tab koi row na chhootti hai, na dobara aati hai.'],
    ['<code>created_at</code> ko second ki jagah minute tak gol kar do', 'Ab aur zyada rows ka waqt ek jaisa hoga, aur aur zyada rows gayab hongi.'],
    ['Page size ko 50 se badhakar 51 kar do', 'Yeh tukka hai. Ek jaise waqt wali rows page ki seema par phir bhi chhootengi.'],
  ] },
  asli: 'OFFSET "chhodo" kehta hai, lekin database ke liye chhodna bhi kaam hai. Lambi list mein "kahan tak padha tha" yaad rakho, "kitne chhodne hain" nahi.',
  say: 'OFFSET gehre page par dheema hota hai kyunki database chhode gaye rows bhi padhta hai. Main keyset pagination use karunga: cursor mein created_at aur id, taaki index seedha us jagah pahunche. Seedha page number par jaane ki jagah tareekh ka filter doonga.',
},
{
  id: 'rate-limit-nat', icon: '🚦', title: 'Hostel ke 3,000 students block, bot farm aaram se', topic: 'api', hard: 2,
  levels: ['ratelimit'],
  story: 'Bots rokne ke liye ChaiPay ne <code>api-gateway</code> par limit lagayi: har IP se 100 request per minute. Agle din ek hostel ke 3,000 students ko "429 Too Many Requests" milne laga. Aur ek bot farm, jo 5,000 alag IP use karta hai, aaram se chal raha hai.',
  facts: [
    'Hostel ka saara traffic ek hi public IP se nikalta hai (NAT).',
    'Bot har IP se sirf 50 request per minute bhejta hai.',
    'Har login user ke paas <code>user_id</code> hai; har app install ke paas <code>device_id</code>.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Limit galat logon ko kyun rok rahi hai?', a: [
      ['IP ek insaan nahi hai: 3,000 log ek IP par, aur ek bot 5,000 IP par', 'Limit us cheez par lagni chahiye jise rokna hai. IP ke peeche hazaaron asli log ho sakte hain, aur ek hamlavar hazaaron IP badal sakta hai.'],
      ['100 request per minute ki limit bahut kam hai; sabke liye badhani hogi', 'Limit badhane se hostel shaayad theek ho jaaye, lekin bot farm ko aur khuli chhoot mil jaayegi.'],
      ['<code>api-gateway</code> requests ko galat gin raha hai aur jaldi block kar deta hai', 'Ginti sahi hai: hostel ke IP se sach mein 100 se zyada request aa rahe hain. Galat cheez gini ja rahi hai.'],
    ] },
    { t: 'Hal chuno', q: 'Limit kis cheez par lagani chahiye?', a: [
      ['Login ke baad <code>user_id</code> par; login se pehle <code>device_id</code> aur IP par', 'Har asli user ko apni limit milti hai, chahe wo kisi bhi IP ke peeche ho. Bot ko har account ke liye alag limit mein rehna padta hai.'],
      ['IP par hi rakho, bas limit ko 100 se badhakar 10,000 per minute kar do', 'Hostel theek ho jaayega. Lekin bot farm ab 5,000 IP × 10,000 = 5 crore request per minute bhej sakta hai.'],
      ['Hostel ke IP ko ek "allow list" mein daal do jise limit na lage', 'Har college, office aur mobile network NAT use karta hai. List kabhi khatam nahi hogi, aur us IP ke peeche bhi bot ho sakta hai.'],
    ] },
    { t: 'Keemat', q: 'Limit ab <code>user_id</code> par hai. Hamlavar ab kya karega?', a: [
      ['Naye account ya nakli device id banakar har ek ki limit alag se use karega', 'Isliye signup par alag sakht limit chahiye, aur IP par ek dheeli limit peeche se rakhni chahiye.'],
      ['Kuch nahi kar paayega; user-wise limit ke baad hamla mumkin nahi', 'Koi ek limit poori suraksha nahi deti. Hamlavar us cheez ko badal deta hai jis par limit lagi hai.'],
      ['Gateway ko dheema kar dega, kyunki ab har request par database lookup hoga', '<code>user_id</code> login token ke andar hota hai. Gateway ko database se poochhna nahi padta.'],
    ] },
  ],
  fixes: [
    { n: 'User par limit', how: 'Ginti ki key = <code>user_id</code>.', cost: 'Nakli accounts se bacha ja sakta hai.', when: 'Login ke baad ki har API.' },
    { n: 'IP par dheeli limit', how: 'Bahut oonchi hadd, sirf baadh rokne ke liye.', cost: 'NAT ke peeche ke log phans sakte hain agar hadd kam ho.', when: 'Peeche ki suraksha, login se pehle.' },
    { n: 'Device + captcha', how: 'Shak hone par captcha; device id par ginti.', cost: 'Asli user ko kabhi-kabhi rukawat.', when: 'Signup, login, OTP.' },
  ],
  twist: { q: '<code>api-gateway</code> ke 12 servers hain. Har server apni ginti alag rakhta hai, isliye ek user 100 ki jagah 1,200 request kar paata hai.', a: [
    ['Ginti ek saajha store (jaise Redis) mein rakho jise saare servers padhein', 'Ab saare servers ek hi ginti dekhte hain. Keemat: har request par Redis ki ek chhoti call.'],
    ['Har server par limit ko 100 se ghatakar lagbhag 8 request kar do', 'Load balancer barabar na baante toh asli user 9th request par hi block ho jaayega.'],
    ['Har user ko hamesha ek hi gateway server par bhejo (sticky routing)', 'Server gire ya naye server judein toh ginti zero se shuru hoti hai, aur load balancer uljhta hai.'],
  ] },
  asli: 'Rate limit ka pehla sawal "kitni limit?" nahi hai. Pehla sawal hai: "kis cheez ko gin rahe hain?" Wahi gino jise rokna hai.',
  say: 'IP par limit NAT ke peeche ke asli users ko rokti hai aur IP badalne wale bot ko nahi. Main login ke baad user_id par limit lagaunga, signup par alag sakht limit, IP par ek dheeli limit, aur ginti Redis mein rakhunga taaki saare gateway servers ek hi ginti dekhein.',
},
{
  id: 'breaking-change', icon: '🧨', title: 'Field ka naam badla, 60% Android users ka balance ₹0', topic: 'api', hard: 1,
  levels: ['versioning'],
  story: '<code>wallet-api</code> team ne response ka field <code>balance</code> hatakar <code>balance_paise</code> kar diya. Web app usi din update ho gayi. Lekin 60% Android users purani app par hain, aur un sabko balance "₹0" dikh raha hai.',
  facts: [
    'Android app update karna user ke haath mein hai. 30 din baad bhi 20% log purane version par rehte hain.',
    'Purani app <code>balance</code> field padhti hai. Field na mile toh app 0 dikhati hai.',
    'Kisi ka paisa gaya nahi hai; sirf screen galat hai.',
  ],
  steps: [
    { t: 'Asli wajah', q: 'Purani app mein balance ₹0 kyun dikh raha hai?', a: [
      ['Server ne wo field hata diya jise purane clients abhi bhi padhte hain', 'API ek vaada hai. Server ek din mein badal jaata hai; mobile app mahino tak purani rehti hai. Purana field hatana purane clients ke saath vaada todna hai.'],
      ['Android app mein bug hai jo sahi balance ko bhi zero dikha deta hai', 'App ka 0 dikhana kamzor code hai, lekin app kal tak theek chal rahi thi. Badlaav server ne kiya.'],
      ['<code>wallet-api</code> ka deploy aadha hi hua tha, kuch servers purane the', 'Tab kuch request sahi aur kuch galat hote. Yahan har purani app ko har baar ₹0 dikh raha hai.'],
    ] },
    { t: 'Hal chuno', q: 'Yeh badlaav surakshit tareeke se kaise karna tha?', a: [
      ['Naya field jodo aur purana bhi bhejte raho; purana tab hatao jab koi na padhe', 'Field jodna surakshit hai: purane clients naye field ko andekha kar dete hain. Field hatana ya uska matlab badalna asurakshit hai.'],
      ['Saare Android users se zabardasti app update karwa do (force update)', 'Update turant nahi hota, aur payment karte waqt user atak jaata hai. Har chhote badlaav par aisa nahi kar sakte.'],
      ['Purana field wapas lao aur naya field hata do, pehle jaisa kar do', 'Aaj ki aag bujhegi, lekin nayi web app toot jaayegi. Aur badlaav kabhi ho hi nahi paayega.'],
    ] },
    { t: 'Keemat', q: 'Dono field saath bhejne ki keemat kya hai?', a: [
      ['Purana field kab hatana hai, yeh jaanne ke liye client version naapne padenge', 'App har request ke saath apna version bhejti hai. Dashboard dikhata hai ki purana field kitne log padh rahe hain. Tab ek tareekh tay hoti hai.'],
      ['Response ka size dugna ho jaayega aur mobile data zyada lagega', 'Ek number field judne se response par na ke barabar farak padta hai.'],
      ['Database mein balance do baar store karna padega, ek-ek column mein', 'Response ka field aur database ka column alag cheezein hain. Server ek hi value se dono field bana sakta hai.'],
    ] },
  ],
  fixes: [
    { n: 'Jodo, hatao mat (additive)', how: 'Naya field saath mein; purana chalta rahe.', cost: 'Kuch mahine do field; hatane ki tareekh yaad rakhni padti hai.', when: 'Chhota badlaav: field ka naam, naya field.' },
    { n: 'Naya version <code>/v2</code>', how: 'Naya shape naye raaste par; <code>/v1</code> chalta rahe.', cost: 'Do versions chalane aur test karne ka kharcha.', when: 'Bada badlaav jo jodkar nahi ho sakta.' },
    { n: 'Force update', how: 'Purani app ko khulne se rok do.', cost: 'User pareshaan; turant nahi hota.', when: 'Sirf suraksha ki gambhir galti par.' },
  ],
  twist: { q: 'Ab poora response ka shape badalna hai: nested object aur alag error format. Field jodne se kaam nahi chalega.', a: [
    ['Naya version <code>/v2</code> banao; <code>/v1</code> ko ek tay tareekh tak chalne do', 'Purane clients <code>/v1</code> par chalte rehte hain. Naye clients <code>/v2</code> par jaate hain. Usage zero ke paas aane par <code>/v1</code> band hota hai.'],
    ['<code>/v1</code> ko usi din band karo aur sabko <code>/v2</code> par bhej do', 'Purani apps <code>/v2</code> ka shape nahi samajhti. Sab ek saath toot jaayengi.'],
    ['<code>/v1</code> ka shape chupchaap badal do aur release note likh do', 'Purani app release note nahi padhti. Wahi ₹0 wali ghatna, aur badi.'],
  ] },
  asli: 'Server tum ek din mein badal sakte ho, client nahi. Isliye API mein <b>jodna</b> surakshit hai, <b>hatana aur badalna</b> nahi.',
  say: 'Mobile clients mahino purane rehte hain, isliye main API mein sirf additive badlaav karunga: naya field jodunga, purana chalta rahega, aur client version ka usage dekhkar purana hataunga. Poora shape badalna ho toh /v2, aur /v1 ek tay tareekh tak.',
},

]);
})();
