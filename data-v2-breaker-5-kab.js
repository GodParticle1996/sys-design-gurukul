/* =====================================================================
   🛡️ Playlist · 1 Resilience — Circuit Breaker · level 5: KAB
   Kab breaker, kab retry, kab sirf timeout — aur teen galtiyan jo breaker ko hi outage bana deti hain.
   Har number docker-labs/38-circuit-breaker ke asli run se hai (ex1, ex2-counting, ex3-half-open, mini.js).
   ===================================================================== */
(function () {

/* teen dabbe: app-api → breaker → recs-service */
const NODES = [
  { id: 'api', icon: '🧩', label: 'app-api', x: 115, y: 105 },
  { id: 'brk', icon: '🔌', label: 'breaker', x: 440, y: 105 },
  { id: 'recs', icon: '🎯', label: 'recs-service', x: 760, y: 105 },
];
const EDGES = [{ from: 'api', to: 'brk' }, { from: 'brk', to: 'recs' }];
const VIZ = { w: 890, h: 215 };

VISUALS['cb-kab'] = {
  t: 'recs-service bilkul theek — phir bhi breaker ne 90 mein se 87 theek requests roki',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { api: { tone: 'ok', badge: 'naye app ki requests' }, brk: { tone: 'bad', badge: 'OPEN · 87 / 90 roki' }, recs: { tone: 'ok', badge: 'bilkul theek' } },
    flows: [{ from: 'api', to: 'brk', label: '/price', tone: 'acc' }, { from: 'brk', to: 'api', label: 'roki', tone: 'bad', back: true }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'cb-kab',
  icon: '⚖️',
  group: '🔌 Circuit Breaker',
  title: 'Breaker 5 · Kab — kahan lagayein, kahan nahi, aur teen galtiyan',
  badge: 'Faisla Ustaad',
  objectives: [
    'Kaunsi dikkat ke liye <b>breaker</b>, kaunsi ke liye <b>retry</b>, aur kaunsi ke liye sirf <b>timeout</b>?',
    'Breaker kahan bekaar hai — ya khud nuksaan karta hai?',
    'Kaunsi teen galtiyan breaker ko hi outage bana deti hain? (lab ke number ke saath)',
    'Breaker khulne ke baad traffic wapas kaise laayein, taaki service dobara na gire?',
  ],
  lesson: [
    `<h3>🔌 Breaker laga diya. Phir bhi outage — breaker ki wajah se.</h3>
     <p>KhanaKart ne recs-service ke saamne circuit breaker laga diya. Samajhdaar kaam. Tum pichhle levels mein dekh chuke ho ki breaker kyun chahiye, andar kaise chalta hai, code mein kaisa dikhta hai, aur library mein kaise lagta hai.</p>
     <p>Phir ek din KhanaKart ka <b>purana app version</b> galat requests bhejne lagta hai. recs-service un requests ko <b>400 Bad Request</b> deti hai. recs-service khud bilkul theek hai. (Lab mein recs-service ke do endpoints hain: <code>/recs</code> aur <code>/price</code>. Galat requests <code>/price</code> par aa rahi hain.)</p>
     <p>Naye app ke users ki requests bilkul sahi hain. Lab ka nateeja:</p>
     <pre>naye app ki 90 bilkul theek /price requests
  safal:            3
  breaker ne roki:  87
  breaker khula:    3 baar</pre>
     <p>recs-service theek thi. Breaker ne hi price band kar diya. Sirf <b>ek setting</b> galat thi.</p>
     <p class="tip">👉 Is level mein: pehle tum faisla karoge — kahan breaker, kahan kuch aur. Phir teen galtiyan lab mein chalaoge, jo breaker ko hi outage bana deti hain.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho: breaker ya kuch aur ---------------- */
    {
      type: 'bins',
      title: 'Breaker lagaoge — ya kuch aur?',
      instructions: 'KhanaKart ki aath situations. Har ek ko sahi bin mein daalo. Pehle apna jawab sochna, phir daalna. Kuch situations mein breaker galat auzaar hai.',
      bins: [
        { id: 'brk', label: '🔌 Breaker + fallback' },
        { id: 'other', label: '🛠️ Breaker nahi — kuch aur' },
      ],
      items: [
        {
          text: 'recs-service kabhi-kabhi der tak latak jaati hai. Har call bahut der leti hai, par error nahi deti.',
          bin: 'brk',
          explain: 'Latakna matlab dependency lagataar bimaar. Timeout workers bachata hai. Breaker latki calls bhejna band karta hai. Fallback (cache) user ko jawab deta hai. Level 1 ki kahani yahi thi.',
        },
        {
          text: 'KhanaKart ka payment provider kuch minute ke liye band hai. Doosra payment provider taiyaar khada hai.',
          bin: 'brk',
          explain: 'Breaker + fallback. Pehle provider ka breaker OPEN hota hai, aur fallback = payment doosre provider ko bhejna. Har payment pehle bimaar provider ko try karke timeout nahi khaayegi.',
        },
        {
          text: 'recs-service har roz apne deploy ke dauraan kuch minute 503 deti hai.',
          bin: 'brk',
          explain: 'Kuch minute lagataar 503 matlab dependency bimaar (5xx). Breaker OPEN hota hai, user ko cache milta hai. Deploy khatam hote hi trial calls jaati hain aur breaker CLOSED ho jaata hai.',
        },
        {
          text: 'Kabhi-kabhi, bilkul random, recs-service ki ek request fail ho jaati hai. Turant doosri koshish karne par chal jaati hai.',
          bin: 'other',
          explain: 'Retry with jitter. Ek akela blip window mein fail ka bahut chhota hissa hai, isliye breaker girega hi nahi (level 2: 2/6 = 33% par CLOSED raha). Retry sirf us ek fail hui request ko bacha leta hai.',
        },
        {
          text: 'Purane mobile app ki requests recs-service par 400 Bad Request laa rahi hain.',
          bin: 'other',
          explain: 'Dependency bimaar nahi hai. Client ki galti hai. Client theek karo, ya app-api par request pehle validate karo. 4xx ko kabhi failure mat gino — lab mein gina toh 90 theek requests mein se 87 roki gayi.',
        },
        {
          text: 'Apne hi process ke andar ek function call exception phenkta hai.',
          bin: 'other',
          explain: 'Function ka exception ek bug hai. Code theek karo. Breaker remote dependency ke liye hai — jahan call network par jaati hai aur dheemi ya bimaar ho sakti hai.',
        },
        {
          text: 'Ek endpoint din mein sirf kuch baar call hota hai.',
          bin: 'other',
          explain: 'Breaker ko faisla karne ke liye kaafi nateeje chahiye (kam se kam N calls). Itni kam calls mein window kabhi bharti hi nahi. Timeout kaafi hai: timeout har call ko akela bacha leta hai.',
        },
        {
          text: 'Festival ki raat app-api khud overload hai. recs-service bilkul theek jawab de rahi hai.',
          bin: 'other',
          explain: 'Dikkat tumhari apni service mein hai, dependency mein nahi. Breaker dependency ki bimaari pakadta hai. Yahan rate limiting, load shedding ya scaling chahiye.',
        },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Bins mein jo socha tha, ab saaf hisaab likhte hain.',
      steps: [
        {
          title: '1. Kaunsa auzaar, kis dikkat ke liye?',
          say: `🏠 <b>Ghar ki misaal:</b> doodhwale ka intezaar tum thodi der hi karte ho, phir aage badh jaate ho (<b>timeout</b>). Bulb ek baar jhapka toh switch dobara dabate ho (<b>retry</b>). Geyser lagataar kharab ho toh MCB girta hai (<b>breaker</b>). Aur geyser band ho toh gas par paani garam kar lete ho (<b>fallback</b>).<br><br>
            Ek dikkat, ek auzaar. Software mein bhi yahi hisaab hai:
            <div class="dr-scroll"><table>
              <tr><th>Dikkat</th><th>Auzaar</th><th>Kise bachata hai</th><th>Lab mein</th></tr>
              <tr><td>recs-service latak gayi</td><td>timeout</td><td>tumhare workers</td><td>/profile fail: 360 / 600 → 0 / 600</td></tr>
              <tr><td>recs-service lagataar bimaar hai</td><td>circuit breaker (timeout ke saath)</td><td>tumhe <b>aur</b> bimaar service ko</td><td>bimaar service ko calls: 300 → 30 · bimaar service giri: 3 baar → 0 baar</td></tr>
              <tr><td>Breaker OPEN hai — user ko kya dikhe?</td><td>fallback</td><td>user ka anubhav</td><td>/home: 357 jawab cache se, 0 error</td></tr>
              <tr><td>Kabhi-kabhi ek random blip</td><td>retry (jitter ke saath)</td><td>sirf fail hui ek request</td><td>Retries level mein dekha (yahan number nahi)</td></tr>
            </table></div>`,
          ask: {
            q: 'recs-service par sirf retry laga hai, breaker nahi. recs-service kai minute se bimaar hai. Retry kya karega?',
            choices: [
              'Har request bimaar recs-service ko ek ke bajay kai baar poochhegi. Bimaar service par bojh aur badhega',
              'Retry recs-service ko theek kar dega',
              'Bojh kam hoga, kyunki retry ruk-ruk ke bhejta hai',
              'Retry apne aap breaker ban jaata hai',
            ],
            answer: 0,
            hint: 'Retry har fail hui request ko dobara bhejta hai. Agar har request fail ho rahi ho, toh calls ki ginti kya hogi?',
            explain: 'Retry <b>ek blip</b> ke liye hai: wahi request dobara bhejo, chal jaayegi. Dependency lagataar bimaar ho toh har request kai baar jaati hai, aur bimaar service par bojh badhta hai. Aise haal mein breaker chahiye: pichhli calls dekh ke poochhna hi band kar do.',
          },
        },
        {
          title: '2. Breaker kab NAHI lagana?',
          say: `Stage 1 ke paanch "nahi" wale jawab, ek jagah:
            <div class="dr-scroll"><table>
              <tr><th>Situation</th><th>Breaker kyun nahi</th><th>Kya karein</th></tr>
              <tr><td>Kabhi-kabhi ek random blip</td><td>Fail ka hissa bahut chhota — breaker girega hi nahi</td><td>Retry + jitter</td></tr>
              <tr><td>Client 400 bhej raha hai</td><td>Dependency bimaar nahi, client ki galti hai</td><td>Client theek karo ya request validate karo. 4xx kabhi mat gino</td></tr>
              <tr><td>Apne process ka function exception de raha hai</td><td>Remote dependency nahi hai, exception ek bug hai</td><td>Code theek karo</td></tr>
              <tr><td>Endpoint din mein bahut kam baar chalta hai</td><td>Faisla karne jitne nateeje hi nahi aate</td><td>Timeout kaafi hai</td></tr>
              <tr><td>Tumhari apni service overload hai</td><td>Dependency theek hai, dikkat tumhari service mein hai</td><td>Rate limiting, load shedding ya scaling</td></tr>
            </table></div>
            Pehchaan ek hi hai: breaker tab, jab ek <b>remote dependency kuch der tak lagataar bimaar</b> rehti hai.`,
        },
        {
          title: '3. Setting bahut kam ya bahut zyada ho toh?',
          say: `Breaker ki paanch settings hain. Kisi ka bhi "bilkul sahi" number nahi hota. Dono taraf nuksaan hai, isliye apni service ke hisaab se napna padta hai.
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Bahut kam</th><th>Bahut zyada</th></tr>
              <tr><td>Fail limit (%)</td><td>Ek-do blip par hi breaker gir jaata hai. Bina wajah ke users ko fallback milta hai</td><td>Breaker der se girta hai. Tab tak latki calls bimaar service tak jaati rehti hain</td></tr>
              <tr><td>Kam se kam calls</td><td>Thode se nateeje par faisla: 1 mein se 1 fail = 100%. Jhootha alarm</td><td>Breaker der se girta hai. Kam traffic wale endpoint par window kabhi bharti hi nahi</td></tr>
              <tr><td>OPEN kitni der</td><td>Bimaar service ko saans nahi milti. Trial calls baar-baar bimaar service par jaati hain</td><td>Service theek hone ke baad bhi users ko fallback milta rehta hai. Lab: service 5.6 s par theek, pehla live jawab 7.0 s par</td></tr>
              <tr><td>Trial calls</td><td>Ek hi lucky call se breaker CLOSED ho sakta hai</td><td>Jaanch khud bojh ban jaati hai, aur CLOSED hone mein der lagti hai</td></tr>
              <tr><td>Timeout</td><td>Theek-thaak dheemi service ko bhi bimaar maan lete ho</td><td>Workers der tak phanse rehte hain (level 1 ka cascade). Breaker ko nateeja bhi der se milta hai</td></tr>
            </table></div>`,
        },
        {
          title: '4. Test: kaunsi setting badalni hai?',
          say: 'Ek scenario. recs-service har roz deploy ke dauraan kuch minute 503 deti hai. Breaker theek samay par khulta hai aur users ko cache milta hai.<br><br>Dikkat: deploy khatam ho jaata hai, recs-service theek ho jaati hai, phir bhi breaker der tak OPEN rehta hai. Users ko purana cache milta rehta hai.',
          ask: {
            q: 'Kaunsi setting ghatani chahiye?',
            choices: [
              'OPEN kitni der — kam karo, taaki trial calls jaldi jaayein',
              'Fail limit (%) — badha do',
              'Kam se kam calls — badha do',
              'Timeout — badha do',
            ],
            answer: 0,
            hint: 'Dikkat girne mein nahi hai, wapas uthne mein hai. Wapas uthne ka waqt kaunsa timer tay karta hai?',
            explain: 'OPEN ka timer. Jab tak timer poora nahi hota, trial call jaati hi nahi. Isliye breaker ko service ke theek hone ki khabar nahi milti. Lab mein yahi dikha: service 5.6 s par theek, pehla live jawab 7.0 s par. (Bahut chhota bhi mat karo: bimaar service ko saans chahiye.)',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> breaker sirf ek dikkat ka ilaaj hai — saamne wali service <b>kuch der tak lagataar</b> bimaar hai.<br>Ek blip ke liye retry. Ek dheemi call ke liye timeout. Apni overload ke liye rate limiting. Aur breaker ke saath hamesha timeout aur fallback.',
    },

    /* ---------------- 3. galti 1 aur 2: kya gino, ek breaker kis ke liye ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — galti 1 aur 2: kya gino, aur ek breaker kis ke liye',
      project: '38-circuit-breaker',
      exercise: 'ex2-counting',
      goal: 'Do galtiyan jo breaker ko hi outage bana deti hain. Lab mein recs-service ka naam <b>B</b> hai, app-api ka <b>A</b>. Output ke do hisse hain: <b>(a)</b> breaker kya ginta hai, <b>(b)</b> ek breaker kis ke liye.',
      why: '<code>tools/counting.js</code> har experiment mein breaker ki sirf ek setting badalta hai, baaki sab same. (a) mein purane app version ki 70% requests ko recs-service <b>400</b> deti hai — recs-service khud theek hai. (b) mein recs-service ka <code>/recs</code> band hai (503), par <code>/price</code> bilkul theek. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Dono services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex2-counting', expect: 'ex2-counting\n[B] :5172\n[A] :5171 → B http://localhost:5172' },
        { text: 'Doosre terminal mein experiment chalao (thoda waqt lagega). Do hisse aayenge: (a) aur (b). Har hisse mein do line hain — pehli galat setting, doosri sahi.', cmd: 'node tools/counting.js', expect: `=== (a) purana app version (70% traffic) B par 400 khata hai — B khud theek hai · 50 req/s /price · 6 s ===
breaker kya ginta hai               naye app ki price requests   safal   breaker ne roki   breaker khula (baar)
4xx bhi failure                                90               3           87               3
sirf 5xx + timeout                             90              90            0               0

=== (b) B ka /recs band (503), /price bilkul theek · 25 req/s /home + 25 req/s /price · 6 s ===
breaker kiske liye                  price requests   safal   breaker ne roki   /home: cache se
poore B ka ek breaker                     150          6          144           150
har endpoint ka alag breaker              150        150            0           150` },
      ],
      observe: {
        q: 'Hisse (b): /recs band tha, /price bilkul theek. "poore B ka ek breaker" wali line mein 150 mein se 144 /price requests kyun roki gayi?',
        choices: [
          '/recs ki failures ne us ek breaker ko OPEN kar diya. OPEN breaker recs-service (B) ko jaane wali har call rokta hai — /price ki bhi, jo bilkul theek thi',
          '/price bhi chupke se bimaar ho gaya tha',
          'Fallback cache mein /price ka jawab nahi tha',
          'Breaker ki window chhoti thi, isliye ginti galat ho gayi',
        ],
        answer: 0,
        explain: 'Ek breaker = ek ginti. /recs ki failures ne breaker ki window bhar di, breaker OPEN hua, aur OPEN mein <b>recs-service ki har call</b> ruki. Har endpoint ka alag breaker lagane par /price ka apna breaker CLOSED raha: 150 mein se 150 safal.',
      },
      lesson: 'Sirf dependency ki bimaari gino: <b>5xx, timeout, connection error</b> — 4xx nahi (warna 90 mein se 87 theek requests roki). Aur breaker <b>har endpoint / operation ka alag</b> rakho — poori service ka ek nahi (warna 150 mein se 144 roki).',
    },

    /* ---------------- 4. galti 3: khulne ke baad poora traffic ek saath ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — galti 3: breaker khulne ke baad saara traffic ek saath wapas',
      project: '38-circuit-breaker',
      exercise: 'ex3-half-open',
      goal: '🫓 <b>Tandoor ki misaal:</b> tandoor bujh gaya tha. Dobara jalaya, par abhi thanda hai. Pehle hi minute mein ek saath bahut saare rotis ka order daaloge toh tandoor phir bujh jaayega. Pehle thode, phir dheere-dheere zyada.<br><br>Lab mein recs-service (output mein <b>B</b>) 3 second ke liye band hoti hai, phir <b>thandi</b> wapas aati hai. app-api par har second 200 <code>/home</code> requests. Teen niyam ek ke baad ek chalenge.',
      why: 'Wapas aane ke baad recs-service (B) pehle 3 second mein ek saath sirf 5 se 50 requests jhel sakti hai (dheere-dheere badhta hai). Teen niyam: <b>naive</b> = timer poora hote hi seedha CLOSED. <b>3 trial calls</b> = HALF-OPEN mein 3 trial calls, teeno safal toh CLOSED. <b>trials + slow start</b> = trials ke baad bhi traffic ek saath nahi: 3 second mein 10% se 100% tak dheere-dheere. Jo requests us dauraan recs-service tak nahi jaati, un requests ko cache milta hai. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Dono services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex3-half-open', expect: 'ex3-half-open\n[B] :5172\n[A] :5171 → B http://localhost:5172' },
        { text: 'Doosre terminal mein teeno niyam chalao (thoda waqt lagega). Teen lines aayengi, ek-ek niyam ki.', cmd: 'node tools/halfopen.js', expect: `200 req/s /home · 14 s · B t=1s par 3 s ke liye band, phir 3 s thanda

half-open niyam                    B phir gira (bojh se)   B poora theek (s)   /home: live / cache   breaker khula (baar)
naive: timer → seedha closed               3                19.6            269 / 2531            7
half-open: 3 trial calls                   3                19.9            283 / 2517            7
trials + slow start (3 s ramp)             0                 7.0           1666 / 1134            2

Sirf ek (forced) outage ho toh B t=7 s par poora theek (3 s band + 3 s thanda).` },
      ],
      observe: {
        q: '"half-open: 3 trial calls" wali line dekho. Teeno trial calls safal hui aur breaker CLOSED hua. Phir bhi recs-service (B) 3 baar phir giri — naive jitna hi. Kyun?',
        choices: [
          'Trial calls sirf poochhti hain "recs-service zinda hai?". CLOSED hote hi poore 200 requests/second ek saath gaye, aur recs-service abhi thandi thi — itna bojh nahi utha saki',
          'Trial calls ki ginti kam thi — zyada rakhte toh recs-service nahi giri',
          'recs-service mein koi naya bug aa gaya tha',
          'Breaker ne trial calls ginna hi chhod diya',
        ],
        answer: 0,
        explain: 'Trial calls "zinda hai?" ki jaanch hain, "poora bojh utha sakti hai?" ki nahi. Is run mein naive aur 3 trial calls ek jaise bure the: 3 baar giri, 19.6 s aur 19.9 s, dono mein breaker 7 baar khula. Sirf slow start ne recs-service ko garam hone ka waqt diya: 0 baar giri, 7.0 s. (Is lab mein trial calls ki ginti badal ke nahi dekha. Par dikkat ginti ki nahi hai: trials bojh ki jaanch hain hi nahi.)',
      },
      lesson: 'Breaker CLOSED hone par poora traffic ek saath mat bhejo. Trial calls "zinda hai?" poochhti hain; <b>slow start</b> (3 second mein 10% se 100%) service ko garam hone deta hai. Lab: 3 trial calls akele — recs-service 3 baar phir giri, 283 live jawab. Trials + slow start — 0 baar giri, 1666 live jawab. (Istio ka <code>loadBalancer.warmup</code> naye endpoints ke liye yahi slow start hai.)',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Breaker ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        {
          text: 'Breaker ke states ka kram hai: CLOSED → HALF-OPEN → OPEN.',
          bin: 'myth',
          explain: 'Kram ulta hai: CLOSED → OPEN → HALF-OPEN. Pehle failures par OPEN (calls band). OPEN ka timer poora hone par HALF-OPEN (kuch trial calls). Phir trials safal → CLOSED, ek bhi fail → phir OPEN.',
        },
        {
          text: 'HALF-OPEN ka matlab hai aadhi requests jaati hain, aadhi ruki rehti hain.',
          bin: 'myth',
          explain: 'HALF-OPEN mein sirf kuch trial calls jaati hain (lab mein 2 ya 3). Baaki sab ruki rehti hain. "Aadha" koi hisaab nahi hai.',
        },
        {
          text: 'Breaker ka kaam sirf peeche wali bimaar service ko bachana hai.',
          bin: 'myth',
          explain: 'Aadhi sachchai. Pehle breaker tumhe bachata hai: roki gayi call ko fallback 0 ms mein mila, timeout wale raaste par 302 ms lage. Saath mein bimaar service ko bhi: calls 300 → 30, aur bimaar service 3 baar giri thi, ab 0 baar.',
        },
        {
          text: 'Timeout laga hai, toh breaker ki zaroorat nahi.',
          bin: 'myth',
          explain: 'Timeout sirf bulaane wale ko chhudata hai. Lab: sirf timeout → bimaar service ko 300 calls, bimaar service 3 baar giri. Timeout + breaker → 30 calls, 0 baar.',
        },
        {
          text: 'Breaker ko har error gina chahiye — 4xx bhi, taaki koi failure na chhoote.',
          bin: 'myth',
          explain: 'Sirf dependency ki bimaari gino: 5xx, timeout, connection error. 4xx gine toh lab mein 90 theek requests mein se 87 roki gayi, aur breaker 3 baar khula.',
        },
        {
          text: 'Circuit OPEN ka matlab hai calls beh rahi hain.',
          bin: 'myth',
          explain: 'OPEN = taar kata hua = calls band. CLOSED = calls beh rahi hain. Naam ulte lagte hain.',
        },
        {
          text: 'Fallback ke bina breaker sirf ek tez error hai.',
          bin: 'true',
          explain: 'Breaker bimaar service ko poochhna band karta hai. User ko kuch dena fallback ka kaam hai (cache, default, doosra provider). Lab: breaker ke saath /home par 357 jawab cache se aaye, 0 error.',
        },
        {
          text: 'Dependency theek ho gayi, phir bhi kuch der users ko fallback milta rahega.',
          bin: 'true',
          explain: 'OPEN ka bacha waqt, aur phir trial calls ka intezaar. Lab: recs-service 5.6 s par theek hui, pehla live jawab 7.0 s par.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — kab aur kya galat hota hai',
    instructions: 'Yahan "kab" aur "kyun" bolna hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Ek purane mobile app version ne 400 bhejna shuru kiya, aur usi din hamara breaker sabke liye khul gaya. Kaise?"',
        choices: [
          'Breaker 4xx ko bhi failure gin raha tha. Purane app ki 400s ne fail ka hissa hadd ke upar pahuncha diya, breaker OPEN hua, aur naye app ke users ki theek requests bhi ruk gayi. Ilaaj: sirf 5xx, timeout aur connection error gino',
          'Dependency down thi, 400 sirf dikhawa tha',
          'Breaker ka OPEN timer bahut chhota tha',
          'Naye app mein bug hoga',
        ],
        answer: 0,
        explain: 'Lab: 4xx bhi failure gino toh 90 theek requests mein se sirf 3 safal, 87 roki, breaker 3 baar khula. Sirf 5xx + timeout gino toh 90 / 90 safal. 400 client ki galti hai, dependency ki bimaari nahi.',
      },
      {
        q: '"Retry aur circuit breaker saath kaise chalte hain?"',
        choices: [
          'Retry ek request ke blip ke liye hai: jitter ke saath, do-teen koshish. Breaker lagataar bimaar dependency ke liye hai. Breaker OPEN ho toh retry bhi band, warna bimaar service par bojh phir badhega',
          'Dono ek hi kaam karte hain, ek kaafi hai',
          'Breaker OPEN ho tab bhi retry chalte rehne chahiye, taaki jaldi pata chale',
          'Retry breaker ko CLOSED rakhta hai',
        ],
        answer: 0,
        explain: 'Retry ek blip bacha leta hai (Retries level). Dependency lagataar bimaar ho toh har request kai baar jaati hai. Breaker ke saath bimaar service ko calls 300 se 30 reh gayi.',
      },
      {
        q: '"payment-service ke saare endpoints (charge, refund, status) ke liye ek hi breaker rakhein?"',
        choices: [
          'Nahi. Har endpoint / operation ka alag breaker. Ek endpoint ki failures poore breaker ko OPEN kar dengi, aur theek endpoints bhi ruk jaayenge',
          'Haan, ek hi — settings kam rehti hain',
          'Haan, bas fail limit bahut upar rakho',
          'Nahi, har user ka alag breaker',
        ],
        answer: 0,
        explain: 'Lab: /recs band tha, /price theek. Poore B ka ek breaker → 150 theek /price requests mein se 144 roki gayi. Har endpoint ka alag breaker → 0 roki.',
      },
    ],
  },
  success: [
    'Kisi bhi situation mein bata sakte ho: breaker, retry, timeout ya kuch aur — aur kyun',
    'Teen galtiyan pehchaan sakte ho (4xx ginna, ek breaker sabke liye, khulte hi poora traffic) — number ke saath',
    'Breaker ki paanch settings aur har ek ke bahut kam / bahut zyada ka nuksaan bata sakte ho',
  ],
  cards: [
    { front: 'Breaker, retry ya timeout — kaunsa kab?', back: 'Ek call dheemi → <b>timeout</b>. Kabhi-kabhi ek blip → <b>retry</b> (jitter ke saath). Dependency lagataar bimaar → <b>breaker</b> (timeout aur fallback ke saath). Lab: timeout se /profile 360 → 0 fail; breaker se bimaar service ko calls 300 → 30.' },
    { front: 'Breaker kab NAHI lagate?', back: 'Random blip (retry) · 4xx (client theek karo) · apne process ka function (bug) · bahut kam calls wala endpoint (timeout) · apni service overload (rate limiting / load shedding / scaling).' },
    { front: 'Kaunsi teen galtiyan breaker ko hi outage bana deti hain?', back: '1) 4xx ginna: 90 theek requests mein se 87 roki. 2) Poori service ka ek breaker: 150 mein se 144 roki. 3) Khulte hi poora traffic: service 3 baar phir giri. Ilaaj: sirf 5xx / timeout / connection error gino · har endpoint ka alag breaker · trials + slow start.' },
    { front: 'Trial calls kaafi kyun nahi?', back: 'Trial calls poochhti hain "zinda hai?", "poora bojh utha sakti hai?" nahi. Lab: naive mein recs-service 3 baar giri (19.6 s), 3 trial calls mein bhi 3 baar (19.9 s). Trials + slow start: 0 baar, 7.0 s, 1666 live jawab.' },
    { front: 'States ka asli kram?', back: 'CLOSED → OPEN → HALF-OPEN (phir CLOSED, ya ek trial fail toh phir OPEN). HALF-OPEN = aadhi requests nahi, sirf kuch trial calls. OPEN = calls band.' },
  ],
},
]);

})();
