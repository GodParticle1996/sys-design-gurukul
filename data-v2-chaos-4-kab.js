/* =====================================================================
   🛡️ Playlist · 1 Resilience — Chaos Engineering · level 4: KAB
   Prayog kab chalana hai, kab pehle kuch theek karna hai, kab bilkul nahi; kaunsi chot pehle; andaaza kis naap par;
   sach ya galatfehmi.
   Number asli run se hain: docker-labs/42-chaos — tools/monkey.js (ex1), tools/faults.js (ex2),
   tools/experiment.js (ex3, zombie aur slow dono fault ke saath).
   "Principles of Chaos Engineering" ke vaakya principlesofchaos.org se hain (wahan jaisa likha hai).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'q', icon: '🧪', label: 'prayog?', x: 150, y: 180 },
  { id: 'go', icon: '✅', label: 'chalao — chhota', x: 680, y: 65 },
  { id: 'fix', icon: '🔧', label: 'pehle theek karo', x: 680, y: 180 },
  { id: 'no', icon: '⛔', label: 'abhi nahi', x: 680, y: 290 },
];

VISUALS['ch-kab'] = {
  t: 'Har prayog se pehle teen sawaal: naap, andaaza aur chot wapas lene ka tareeka tayyar hai? Jo kami pata hai, woh theek ho chuki? Aaj ka din theek hai?',
  html: SD.viz.svg(NODES, [{ from: 'q', to: 'go' }, { from: 'q', to: 'fix' }, { from: 'q', to: 'no' }], {
    nodes: { q: { tone: 'acc', badge: 'teen sawaal' }, go: { tone: 'ok', badge: 'button ke saath' }, fix: { tone: 'slow', badge: 'naap · rollback' }, no: { tone: 'bad', badge: 'incident · sale' } },
    flows: [],
  }, { w: 890, h: 365, focus: ['go', 'fix', 'no'] }),
};

const START = '[app] :5212\n[app] :5213\n[app] :5214\n[lb] :5211 → 3 apps';

SD.registerLevels('sdd-resil', [
{
  id: 'ch-kab',
  icon: '⚖️',
  group: '🐒 Chaos Engineering',
  title: 'Chaos 4 · Kab — kahan todna hai, kahan bilkul nahi',
  badge: 'Chaos Panch',
  objectives: [
    'Prayog kab chalana chahiye, kab pehle kuch theek karna chahiye, aur kab bilkul nahi?',
    'Kaunsi chot pehle deni chahiye — aur "mar gaya" wali chot par rukna kyun galat hai?',
    'Andaaza tik gaya. Kya hypothesis tikne ka matlab hai ki grahak ko kuch mehsoos nahi hua?',
    'Paanch aam galatfehmiyan kaunsi hain, aur har ek ka naapa hua jawab kya hai?',
  ],
  lesson: [
    `<h3>⚖️ Todne se pehle: kya seekhne ko milega, aur kis keemat par?</h3>
     <p>Chaos prayog ka maqsad ek <b>anjaani</b> kami dhoondhna hai, <b>kam se kam</b> nuksaan mein. Is baat se teen sawaal nikalte hain:</p>
     <pre>kami pehle se pata hai?                  → todne se kuch naya nahi milega   → pehle theek karo
naap, andaaza ya rollback nahi hai?      → ye prayog nahi, outage hoga     → pehle theek karo
system abhi hi bimaar hai, ya din bhaari? → nuksaan badhega, seekh nahi      → abhi nahi</pre>
     <pre>lab (asli raftaar, teen run):
wahi chot, rokne ke niyam ke saath   → 17 requests giri
wahi chot, niyam ke bina             → 200 requests giri
ek instance pehle se bimaar          → aam din ka naap 68% → prayog shuru hi nahi hua</pre>
     <p class="tip">👉 Is level mein pehle tum faisla karoge: aath haalat, teen jagah. Phir number.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Prayog abhi chalayein?',
      instructions: 'Aath haalat. Har ek ke liye socho: prayog chalana chahiye, pehle kuch theek karna chahiye, ya aaj bilkul nahi? Phir sahi bin mein daalo.',
      bins: [
        { id: 'go', label: '✅ Haan — chalao (chhota daayra, rokne ke niyam ke saath)' },
        { id: 'fix', label: '🔧 Pehle ye theek karo' },
        { id: 'no', label: '⛔ Abhi nahi' },
      ],
      items: [
        { text: 'Staging mein pehli baar: teen mein se ek instance band karna. Naap, andaaza aur rokne ka niyam likhe hue hain', bin: 'go', explain: 'Yahi shuruaat hai: sabse aasaan chot, sabse chhota daayra. Lab mein isi chot ne "health check nahi hai" wali kami dikhayi: 201 requests giri.' },
        { text: 'Production mein, 1% traffic par, din ke waqt. Team ko khabar hai, rokne ka niyam laga hai, aur staging mein yahi prayog pass ho chuka hai', bin: 'go', explain: 'Principles of Chaos Engineering: system alag mahaul aur alag traffic mein alag chalta hai, isliye asli traffic par prayog sabse bharosemand hai — aur nuksaan ka daayra chhota rakhna prayog karne wale ki zimmedari hai.' },
        { text: 'Safal requests ka pratishat kahin dikhta hi nahi: na dashboard, na alarm', bin: 'fix', explain: 'Naap ke bina na aam din ka haal pata chalega, na rokne ka niyam chalega. Prayog ke code ki pehli hi line measure() bulati hai.' },
        { text: 'Chot dene ka tareeka tayyar hai. Chot wapas lene ka tareeka "baad mein dekhenge"', bin: 'fix', explain: 'Rollback ke bina "roko" ka koi matlab nahi: naap girta rahega. Pehle rollback likho, aur use akele chala ke dekho.' },
        { text: 'Team ko pata hai ki health check nahi laga. Phir bhi: "ek instance maar ke dekhte hain, kya hota hai"', bin: 'fix', explain: 'Jo kami pehle se pata hai, us kami ko tod ke dekhne se kuch naya nahi seekhoge — sirf grahak ka nuksaan hoga. Pehle health check lagao; phir prayog se parkho ki health check sach mein kaam karta hai.' },
        { text: 'Andaaza likha nahi gaya: "tod ke dekhte hain"', bin: 'fix', explain: 'Andaaze ke bina faisla nahi ho sakta: tika ya toota? Pehle number likho, jaise "kam se kam 95% requests safal".' },
        { text: 'Abhi ek incident chal raha hai: checkout dheema hai', bin: 'no', explain: 'Aam din ka haal hi kharab hai. Lab: chot se pehle ka naap 68% aaya → faisla "shuru hi mat karo", chot di hi nahi gayi.' },
        { text: 'Aaj saal ki sabse badi sale hai', bin: 'no', explain: 'Aaj har giri hui request sabse mehengi hai, aur team ka dhyan kahin aur hai. Prayog sale se pehle ke hafton mein karo — taaki sale ke din tak kami theek ho chuki ho.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain (asli raftaar, teen run).',
      steps: [
        {
          title: '1. Kaunsi chot pehle?',
          say: `Sabse aasaan chot se shuru karo, phir chot badlo. Lab mein teen chot, teen setup (ek instance 4 second bimaar; us dauraan 133 requests ki baari us instance ki thi):
            <div class="dr-scroll"><table>
              <tr><th>Chot</th><th>Sirf health check</th><th>+ retry</th><th>+ asli requests dekh ke hatana</th></tr>
              <tr><td>1. Mar gaya</td><td>12 giri</td><td>0 giri</td><td>0 giri</td></tr>
              <tr><td>2. Dheema</td><td><b>133–134</b> giri</td><td>0 giri, par <b>133</b> requests dheemi</td><td>0 giri, 36 dheemi</td></tr>
              <tr><td>3. Aadha-zinda</td><td><b>133</b> giri</td><td>0 giri; bimaar instance tak 133</td><td>0 giri; bimaar instance tak 4</td></tr>
            </table></div>
            ("Dheemi" = 200 ms se zyada.) Dheemi requests ke baad ki chot is lab mein nahi hai: database ya kisi doosri service ka dheema ya band hona. Database ya service ke dheeme hone ki chot Circuit Breaker aur Health Checks wale levels mein naapi gayi hai.`,
          ask: {
            q: 'Ek team ne "mar gaya" wali chot chalayi. Health check + retry ke saath 0 requests giri. Team: "hum resilient hain, kaam khatam." Agla kadam kya hona chahiye?',
            choices: [
              'Chot badlo — ab dheema, phir aadha-zinda instance; mara hua instance sabse aasaan bimaari hai',
              'Kaam khatam — 0 requests giri, toh system har tarah ki kharabi aaram se seh lega',
              'Sirf wahi "mar gaya" wali chot dohrate raho — doosri kharabi parkhne ki zaroorat nahi',
              'Ek saath teeno instances band karo — sabse badi chot se hi asli taakat dikhegi',
            ],
            answer: 0,
            hint: 'Table ki pehli row aur doosri row ka "sirf health check" wala khaana dekho.',
            explain: 'Mara hua instance sabse aasaan bimaari hai — health check mare hue instance ko pakad leta hai. Lab mein agli do chot (dheema, aadha-zinda) ne nayi kami dikhayi jo pehli chot mein dikhi hi nahi. Principles of Chaos Engineering bhi yahi kehta hai: asli duniya ki alag-alag ghatnayein aazmao — server ka marna, galat jawab, traffic ka uchhaal.',
            choiceExplanations: [
              'Mara hua instance sabse aasaan bimaari hai — health check mare hue instance ko pakad leta hai. Lab mein agli do chot (dheema, aadha-zinda) ne nayi kami dikhayi jo pehli chot mein dikhi hi nahi. Principles of Chaos Engineering bhi yahi kehta hai: asli duniya ki alag-alag ghatnayein aazmao — server ka marna, galat jawab, traffic ka uchhaal.',
              '0 sirf "mar gaya" wali chot ke liye tha. Table ki doosri row: dheema instance, sirf health check → 133–134 giri.',
              'Wahi chot dohrana kaam ka hai — timing aur load se nateeja badal sakta hai. Par sirf instance band karne se dheema aur aadha-zinda haal nahi parkhe jaate.',
              'Teeno band = poora outage, aur kuch naya nahi seekhoge. Daayra chhota rakho, chot ka prakaar badlo.',
            ],
          },
        },
        {
          title: '2. Andaaza kis naap par?',
          say: `Wahi prayog, par chot "dheema instance" (andaaza: kam se kam 95% requests safal):
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Faisla</th><th>Requests giri</th></tr>
              <tr><td>Sirf health check, rokne ka niyam laga</td><td>ABORT (1.0 s par)</td><td>34</td></tr>
              <tr><td>Health check + retry</td><td><b>hypothesis tika</b></td><td>0</td></tr>
            </table></div>
            Doosri row: prayog <b>pass</b>. Par isi setup, isi chot ke liye pichhli table kya kehti thi? 133 requests ko 200 ms se zyada laga, aur sabse dheemi 1% ko 515–517 ms ya zyada laga (aam din ka median: 14 ms).`,
          ask: {
            q: 'Prayog pass hua, jabki har teesre grahak ne aadha second intezaar kiya. Dono baatein sach kaise?',
            choices: [
              'Andaaza sirf "safal %" dekhta tha — retry ne har request safal ki, samay naap mein tha hi nahi',
              'Prayog mein bug tha — naap ne dheemi requests ko gina hi nahi, isliye 100% aaya',
              'Dheemi requests asli nahi thi — lab ne sirf dikhane ke liye dheemi requests chhapi',
              'Retry ne requests ko tez kar diya, isliye kisi ko sach mein intezaar nahi karna pada',
            ],
            answer: 0,
            hint: 'measure() kya lautata tha? Us sankhya mein samay kahin hai?',
            explain: 'Andaaze mein safal % ke saath samay bhi rakho: jaise "kam se kam 99% requests 200 ms ke andar". Lab ke darj runs mein sabse dheemi 1% ko 515–517 ms ya zyada laga (p99), aur 133 requests 200 ms se dheemi thi. Safal % akela deri nahi batata. Ek aur baat: dheemi chot pakadne mein bhi der lagi — rokne ka niyam 1.0 s par chala (34 giri), jabki aadhe-zinda instance par 0.5 s par (17 giri). Timeout hone tak fail dikhta hi nahi.',
            choiceExplanations: [
              'Andaaze mein safal % ke saath samay bhi rakho: jaise "kam se kam 99% requests 200 ms ke andar". Lab ke darj runs mein sabse dheemi 1% ko 515–517 ms ya zyada laga (p99), aur 133 requests 200 ms se dheemi thi. Safal % akela deri nahi batata. Ek aur baat: dheemi chot pakadne mein bhi der lagi — rokne ka niyam 1.0 s par chala (34 giri), jabki aadhe-zinda instance par 0.5 s par (17 giri). Timeout hone tak fail dikhta hi nahi.',
              'Naap ne dheemi requests bhi gini — safal ki tarah, kyunki retry ke baad jawab safal tha. Naap mein samay tha hi nahi.',
              'Dheemi requests asli thi: 133 requests ko 200 ms se zyada laga; sabse dheemi 1% ko 515–517 ms ya zyada.',
              'Retry tez nahi karta — pehle 500 ms ka timeout jhelta hai, phir doosre instance par jaata hai.',
            ],
          },
        },
        {
          title: '3. Chalane se pehle: chhah sawaal',
          say: `<ol>
              <li><b>Naap dikhta hai?</b> Safal %, samay — kahin, abhi.</li>
              <li><b>Aam din ka naap kya hai?</b> Number mein. Aaj steady state ka number theek hai?</li>
              <li><b>Andaaza likha hai?</b> "Is chot ke dauraan bhi kam se kam ___."</li>
              <li><b>Rokne ki hadd kya hai?</b> "___ se neeche gaya toh turant roko."</li>
              <li><b>Chot wapas kaise loge?</b> Akele chala ke dekha?</li>
              <li><b>Daayra kitna hai?</b> Kitne instances, kitna traffic, kitni der. Team ko khabar hai?</li>
            </ol>
            Chhah mein se ek bhi "nahi" → pehle wahi kami theek karo.`,
          ask: {
            q: 'Sawaal 4 (rokne ki hadd) aur sawaal 5 (chot wapas) mein se ek hi ho, toh?',
            choices: [
              'Dono saath chahiye — hadd jaldi rukwaati hai, rollback lagi hui chot hataata hai',
              'Hadd kaafi hai — naap girte hi prayog ruk jaata hai, aur chot apne aap hat jaayegi',
              'Rollback kaafi hai — aakhir mein chot wapas aa hi jaayegi, beech mein rokna zaroori nahi',
              'Chot chhoti ho toh dono ke bina bhi chalega — chhota prayog khud hi kam nuksaan karta hai',
            ],
            answer: 0,
            hint: 'Code yaad karo: break kis line ke baad aata hai, aur break ke baad kaunsi line chalti hai?',
            explain: 'Hadd kharab naap par jaldi rokne ka faisla karti hai; rollback chot hataata hai. Sirf rollback ho toh chot tay waqt ke baad hategi — par nuksaan badhne par jaldi nahi. Lab ke darj runs: dono saath → 0.5 s aur 17 giri; hadd ke bina → 6.0 s aur 200 giri (lagbhag 12 guna).',
            choiceExplanations: [
              'Hadd kharab naap par jaldi rokne ka faisla karti hai; rollback chot hataata hai. Sirf rollback ho toh chot tay waqt ke baad hategi — par nuksaan badhne par jaldi nahi. Lab ke darj runs: dono saath → 0.5 s aur 17 giri; hadd ke bina → 6.0 s aur 200 giri (lagbhag 12 guna).',
              'Hadd sirf loop todti hai. Chot hatane ka kaam rollback ka hai — rollback na ho toh chot lagi rehti hai.',
              'Bina hadd ke chot poori der chalti hai. Lab: rokne ke niyam ke bina 200 giri, saath mein 17.',
              'Chhota daayra kaam ka hai, par hadd aur rollback ki jagah nahi leta. Chhoti chot bhi lagi reh jaaye toh outage hai.',
            ],
          },
        },
        {
          title: '4. Principles of Chaos Engineering — aur kal subah',
          say: `principlesofchaos.org par paanch "advanced principles" likhe hain. Sab naam lab se hain:
            <div class="dr-scroll"><table>
              <tr><th>Principle</th><th>Seedhe shabdon mein</th><th>Lab mein</th></tr>
              <tr><td>Build a Hypothesis around Steady State Behavior</td><td>aam din ka naap, phir us par andaaza</td><td>"kam se kam 95% safal"</td></tr>
              <tr><td>Vary Real-world Events</td><td>chot badlo</td><td>mar gaya · dheema · aadha-zinda</td></tr>
              <tr><td>Run Experiments in Production</td><td>asli traffic par hi asli raasta dikhta hai</td><td>— (lab mein production nahi hai)</td></tr>
              <tr><td>Automate Experiments to Run Continuously</td><td>haath se chalana tikta nahi; apne aap, lagataar</td><td>monkey ka <code>start()</code></td></tr>
              <tr><td>Minimize Blast Radius</td><td>nuksaan ka daayra chhota rakho</td><td>17 banaam 200 requests</td></tr>
            </table></div>
            Wahi page ye bhi kehta hai: aam din ke haal ko bigaadna jitna mushkil nikle, system par bharosa utna zyada. Yaani bina tootne wala prayog bekaar nahi gaya.<br><br>
            <b>Kal subah:</b> apni ek service chuno. Likho: aam din ka naap, ek andaaza, rokne ki hadd. Staging mein ek instance band karo. Jo dikhe, likh lo.`,
          ask: {
            q: 'Us page par "abort" ya "stop condition" jaisa koi shabd nahi hai. Lab ka rokne ka niyam in paanch mein se kis principle ka hissa hai?',
            choices: [
              'Minimize Blast Radius — rokne ka niyam kami nahi chhupata, bas nuksaan ka daayra chhota rakhta hai',
              'Vary Real-world Events — rokne ka niyam batata hai ki agli baar kaunsi chot deni hai',
              'Run Experiments in Production — rokne ka niyam ho tabhi production mein prayog ki ijaazat',
              'Automate Experiments to Run Continuously — rokne ka niyam prayog ko baar-baar chalata hai',
            ],
            answer: 0,
            hint: 'Rokne ke niyam ne lab mein kya badla: kami, ya giri hui requests ki ginti?',
            explain: 'Lab: rokne ke niyam ke saath aur bina, dono baar andaaza toota — yaani kami dono baar dikhi. Farak sirf giri hui requests ka tha: 17 banaam 200.',
            choiceExplanations: [
              'Lab: rokne ke niyam ke saath aur bina, dono baar andaaza toota — yaani kami dono baar dikhi. Farak sirf giri hui requests ka tha: 17 banaam 200.',
              'Chot chunna alag faisla hai. Rokne ka niyam chot nahi badalta — chot ki der aur nuksaan chhota karta hai.',
              'Production ke liye rokne ka niyam zaroori hai, sahi. Par lab mein rokne ke niyam ne sirf nuksaan ka daayra badla: 17 banaam 200.',
              'Baar-baar chalana samay ka faisla hai. Rokne ka niyam ek prayog ke andar nuksaan rokta hai.',
            ],
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> aasaan chot se shuru karo, par wahin ruko mat. Andaaze mein grahak ka har mehsoos hone wala asar likho. Aur chhah sawaal mein se ek bhi "nahi" ho, toh prayog nahi — pehle tayyari.',
    },

    /* ---------------- 3. naapo: monkey ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — monkey, chaar setup',
      project: '42-chaos',
      exercise: 'ex1-monkey',
      goal: 'Asli raftaar: teen instances ke aage ek load balancer, 100 requests/second, 16 second. Monkey har 4 second par ek random instance maarta hai (instance 2 second mein wapas aata hai). Chaar setup; monkey har setup mein wahi karta hai.',
      why: '<code>services/lb.js</code> = load balancer (niyam <code>lib/rotation.js</code> se). <code>services/app.js</code> = ek instance. Chaaron Node processes hain; Docker nahi chahiye. Monkey ka shikaar har run mein alag hota hai, isliye number thode alag aa sakte hain; tarteeb wahi rahegi.',
      steps: [
        { text: 'Load balancer aur teen instances chalao (ek terminal mein, chalta chhod do). Lines ka kram alag ho sakta hai.', cmd: 'cd docker-labs/42-chaos && npm start ex1-monkey', expect: START },
        { text: 'Doosre terminal mein: chaaron setup, ek ke baad ek (~70 s). "fail" wala khaana dekho.', cmd: 'node tools/monkey.js', expect: "🐒 har 4 s ek random instance maara (2 s mein wapas) · 100 req/s · 16 s · beej: nahi (victim random)\n\nsetup                              safal          fail   sabse lamba error ka daur   monkey ne maara\n1 instance                         62.25%      604          2009 ms             #1 #1 #1\n3 instances, health check nahi     87.44%      201             0 ms             #1 #3 #3\n3 + health check                   97.13%       46             0 ms             #2 #1 #1\n3 + health check + retry          100.00%        0             0 ms             #2 #1 #3" },
        { text: 'Ab tay beej ke saath. Aakhri khaana dekho: teeno 3-instance setup mein monkey wahi instances, usi kram mein maarega (#3 #1 #2).', cmd: 'node tools/monkey.js --seed 3' },
      ],
      observe: {
        q: 'Doosri aur teesri row mein monkey ne utni hi baar maara (teen baar). Doosri mein 201 requests giri, teesri mein 44–46. Farak kahan se aaya?',
        choices: [
          'Teesri row mein health check tha — mara instance do fail par bahar, bas beech wali giri',
          'Teesri row mein monkey ne kamzor instance chuna, jiske marne se kam nuksaan hua',
          'Teesri row mein requests kam bheji gayi, isliye mare hue instance tak kam pahunchi',
          'Teesri row mein instances zyada the, isliye ek instance ke marne ka hissa chhota raha',
        ],
        answer: 0,
        explain: 'Doosri row mein load balancer poore 2 second tak har teesri request mare hue instance ko bhejta raha. Teesri mein sirf pata chalne tak ki requests giri. Chauthi row mein retry bhi hai: beech ki giri hui request agle instance par dobara gayi → 0 giri. Aur pehli row (ek hi instance): har maut par poora andhera — 603–604 giri.',
        choiceExplanations: [
          'Doosri row mein load balancer poore 2 second tak har teesri request mare hue instance ko bhejta raha. Teesri mein sirf pata chalne tak ki requests giri. Chauthi row mein retry bhi hai: beech ki giri hui request agle instance par dobara gayi → 0 giri. Aur pehli row (ek hi instance): har maut par poora andhera — 603–604 giri.',
          'Teeno instances ek jaise hain — koi kamzor nahi. Har maut ka asar ek jaisa.',
          'Har row mein 100 req/s, 16 second. Requests barabar thi.',
          'Doosri aur teesri dono row mein 3 instances the.',
        ],
      },
      lesson: 'Monkey har setup mein wahi karta hai. Badalta hai system ka jawab — aur system ka jawab hi naapna hai.',
    },

    /* ---------------- 4. naapo: chot aur prayog ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — teen chot, phir poora prayog',
      project: '42-chaos',
      exercise: 'ex2-faults',
      goal: 'Wahi services chalti rehne do (pichhle lab ka pehla terminal). Teen tools: teen chot × teen setup; poora prayog rokne ke niyam ke saath aur bina; phir wahi prayog dheeme instance par.',
      why: 'Teeno exercises ek hi services par chalti hain: <code>npm start ex1-monkey</code>, <code>ex2-faults</code> ya <code>ex3-experiment</code> — teeno wahi chaar processes chalate hain. Number har run mein thode alag aa sakte hain; tarteeb wahi rahegi.',
      steps: [
        { text: 'Services band hon, toh pehle chalao.', cmd: 'npm start ex2-faults', expect: START },
        { text: 'Teen chot × teen setup (~100 s). "fail" aur "dheemi" wale khaane dekho.', cmd: 'node tools/faults.js', expect: "💥 instance 2 par fault 3 s se 7 s tak · 100 req/s · 10 s · number fault ke 4 s mein shuru hui requests ke\n\nfault   setup                                     safal      fail   median      p99   dheemi   kharab tak\ncrash   health check hi                           97.00%      12    14 ms    16 ms        0          12\ncrash   health check + retry                     100.00%       0    14 ms    16 ms        0          11\ncrash   health check + retry + passive ejection  100.00%       0    14 ms    16 ms        0           2\nslow    health check hi                           66.50%     134    14 ms   503 ms      134         134\nslow    health check + retry                     100.00%       0    14 ms   517 ms      133         133\nslow    health check + retry + passive ejection  100.00%       0    14 ms   515 ms       36          36\nzombie  health check hi                           66.75%     133    14 ms    15 ms        0         133\nzombie  health check + retry                     100.00%       0    15 ms    28 ms        0         133\nzombie  health check + retry + passive ejection  100.00%       0    14 ms    24 ms        0           4" },
        { text: 'Poora prayog, saat baar (~1 minute). Chot: aadha-zinda instance. "fault chala" aur "fail" wale khaane dekho.', cmd: 'node tools/experiment.js', expect: "🔬 fault: zombie (instance 2) · 100 req/s · hypothesis ≥ 95% safal · abort rule < 80% · har 500 ms par naap, 6 s tak\n\nsetup                                         abort rule   faisla                        steady   kharab   fault chala   fail\nhealth check hi                               laga hai     ABORT (0.5 s par)              100%      68%         0.5 s     17\nhealth check hi                               nahi         hypothesis toota               100%      66%         6.0 s    200\nhealth check + retry                          laga hai     hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry                          nahi         hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry + passive ejection       laga hai     hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry + passive ejection       nahi         hypothesis tika                100%     100%         6.0 s      0\nhealth check hi · instance 3 pehle se zombie  laga hai     shuru hi mat karo               68%        —         0.0 s      0" },
        { text: 'Wahi prayog, chot: dheema instance (~1 minute). Teesri row ka faisla dekho.', cmd: 'node tools/experiment.js --fault slow', expect: "🔬 fault: slow (instance 2) · 100 req/s · hypothesis ≥ 95% safal · abort rule < 80% · har 500 ms par naap, 6 s tak\n\nsetup                                         abort rule   faisla                        steady   kharab   fault chala   fail\nhealth check hi                               laga hai     ABORT (1.0 s par)              100%      67%         1.0 s     34\nhealth check hi                               nahi         hypothesis toota               100%      66%         6.0 s    200\nhealth check + retry                          laga hai     hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry                          nahi         hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry + passive ejection       laga hai     hypothesis tika                100%     100%         6.0 s      0\nhealth check + retry + passive ejection       nahi         hypothesis tika                100%     100%         6.0 s      0\nhealth check hi · instance 3 pehle se zombie  laga hai     shuru hi mat karo               68%        —         0.0 s      0" },
      ],
      observe: {
        q: 'Aakhri tool ki teesri row (health check + retry) ka faisla "hypothesis tika" aaya. Par pehle tool ki table mein isi setup, isi chot ke "dheemi" wale khaane mein 133 likha tha. Dono sach kaise?',
        choices: [
          'Andaaza sirf safal % dekhta tha — retry ne request safal ki, par pehle 500 ms ka timeout jhela',
          'Doosre tool mein instance utna dheema tha hi nahi, isliye prayog aaram se pass ho gaya',
          'Pehle tool ki ginti galat hai — retry wali requests ko galti se dheemi gin liya gaya',
          'Retry ne timeout hata diya, isliye prayog mein kisi request ko intezaar nahi karna pada',
        ],
        answer: 0,
        explain: 'Isliye "prayog pass hua" ke saath hamesha poochho: kaunsa naap pass hua? Aur aakhri tool ki pehli row bhi dekho: rokne ka niyam 1.0 s par chala — aadhe-zinda instance ke 0.5 s se der mein, kyunki timeout hone tak fail dikhta nahi.',
        choiceExplanations: [
          'Isliye "prayog pass hua" ke saath hamesha poochho: kaunsa naap pass hua? Aur aakhri tool ki pehli row bhi dekho: rokne ka niyam 1.0 s par chala — aadhe-zinda instance ke 0.5 s se der mein, kyunki timeout hone tak fail dikhta nahi.',
          'Dono tool mein wahi chot (slow) aur wahi setup tha.',
          'Ginti sahi hai: retry hui requests ne sach mein 500 ms ka timeout jhela — p99 515–517 ms.',
          'Retry timeout nahi hatata. Pehle timeout, phir doosre instance par koshish.',
        ],
      },
      lesson: 'Andaaza usi cheez ko bachata hai jo naapi ja rahi hai. Samay bhi naapo.',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Chaos engineering ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Teen copies hain, toh ek ke marne se kuch nahi hoga."', bin: 'myth', explain: 'Copies kaafi nahi; load balancer ko pata bhi chalna chahiye ki ek copy mar gayi. Lab: 3 instances, health check nahi → 201 requests giri (87.44% safal).' },
        { text: '"Health check laga hai, toh har bimaar instance pakda jaayega."', bin: 'myth', explain: 'Health check wahi jaanta hai jo instance apne baare mein kehta hai. Lab (sirf health check): dheema → 133–134 giri, aadha-zinda → 133. Instance list se kabhi nahi hata.' },
        { text: '"Chaos engineering ka matlab hai production mein kuch bhi tod dena."', bin: 'myth', explain: 'Prayog ka dhancha hota hai: naapo → andaaza → ek chot → nazar → roko → wapas lo. Lab: rokne ke niyam ke saath 17 requests giri, bina 200.' },
        { text: '"Retry laga diya — ab dheema instance koi dikkat nahi."', bin: 'myth', explain: 'Retry request ko bachata hai, samay ko nahi. Lab: dheema + retry → 0 giri, par 133 requests ko 200 ms se zyada laga (sabse dheemi 1%: 515–517 ms).' },
        { text: '"Andaaza tik gaya, matlab grahak ko kuch mehsoos nahi hua."', bin: 'myth', explain: 'Andaaza ek hi naap ke baare mein hota hai. Lab: dheeme instance par "kam se kam 95% safal" wala andaaza tik gaya (0 giri) — jabki 133 requests dheemi thi.' },
        { text: 'Dheema instance mare hue instance se zyada nuksaan kar sakta hai.', bin: 'true', explain: 'Lab (sirf health check): mar gaya → 12 requests giri; dheema → 133–134. Mara hua instance health check ko dikhta hai; dheema nahi dikhta.' },
        { text: 'Staging mein pass hua prayog production mein fail ho sakta hai.', bin: 'true', explain: 'Principles of Chaos Engineering: system alag mahaul aur alag traffic mein alag chalta hai. Isliye staging pehla kadam hai, aakhri nahi.' },
        { text: 'Rokne ke niyam aur chot wapas lene ke tareeke ke bina prayog nahi chalana chahiye.', bin: 'true', explain: 'Lab: wahi chot, wahi kami — 17 banaam 200 giri hui requests (lagbhag 12 guna).' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — faisla karo',
    instructions: 'Yahan poora faisla chahiye, aur har hisse ki wajah. 🎤',
    questions: [
      {
        q: '"Tumhari team chaos engineering shuru karna chahti hai. Pehle kuch mahino ka plan batao."',
        choices: [
          'Pehle naap aur chot wapas lene ki taiyaari; phir staging mein chhoti chot, phir dheere badhao',
          'Pehle hi din production mein random instances band karne wala tool chala do — seekh wahin hai',
          'Sirf staging mein, saal mein ek baar — production ko kabhi mat chhuo, khatra bahut hai',
          'Saari possible chot ki list banao, aur pehle hafte hi sab ek saath chala do',
        ],
        answer: 0,
        explain: 'Pehle tayyari: naap (safal %, samay) dikhna chahiye, aur chot wapas lene ka tareeka. Phir staging mein sabse aasaan chot (ek instance band), likhe hue andaaze aur rokne ke niyam ke saath. Jo kami mile, theek karo, aur wahi prayog dobara. Phir chot badlo (dheema, aadha-zinda). Phir production mein chhote daayre par. Aakhir mein apne aap, lagataar. Lab ne yahi kram dikhaya: "mar gaya" ne health check ki kami dikhayi (201 giri); health check + retry ke baad "dheema" ne nayi kami dikhayi (133 dheemi requests).',
        choiceExplanations: [
          'Pehle tayyari: naap (safal %, samay) dikhna chahiye, aur chot wapas lene ka tareeka. Phir staging mein sabse aasaan chot (ek instance band), likhe hue andaaze aur rokne ke niyam ke saath. Jo kami mile, theek karo, aur wahi prayog dobara. Phir chot badlo (dheema, aadha-zinda). Phir production mein chhote daayre par. Aakhir mein apne aap, lagataar. Lab ne yahi kram dikhaya: "mar gaya" ne health check ki kami dikhayi (201 giri); health check + retry ke baad "dheema" ne nayi kami dikhayi (133 dheemi requests).',
          'Bina naap aur rollback ke production mein chot = andhera. Kami dikhegi, par na samajh aayegi, na rukegi.',
          'System roz badalta hai — saal bhar purana nateeja aaj ka saboot nahi. Aur asli traffic production mein hi hai.',
          'Sab chot ek saath doge toh pata hi nahi chalega ki kaunsi chot se kya toota.',
        ],
      },
      {
        q: '"Ek chaos experiment ne production mein asli outage kar diya. Kya galat hua hoga, aur aage kaise bachoge?"',
        choices: [
          'Rokne ka niyam, rollback aur daayra jaancho — aage chhota daayra aur pehle se parkha rollback',
          'Chaos engineering band kar do — prayog hi outage ki wajah tha, toh prayog hi mat karo',
          'Agli baar wahi prayog raat mein chalao, taaki kam log dekhein aur shikayat kam ho',
          'Rokne ki hadd neeche kar do, aur outage ko "test pass" gin lo — kami toh dikh gayi',
        ],
        answer: 0,
        explain: 'Teen cheezein dekho. Rokne ka niyam tha — aur sahi naap par tha? Chot wapas lene ka tareeka chala? Daayra kitna bada tha? Aage: chhota daayra, rokne ka niyam jo naap girte hi chale, rollback jo pehle akele parkha gaya ho — aur aam din ka naap kharab ho toh prayog shuru hi nahi. Lab: rokne ke niyam ke saath chot 0.5 s chali (17 giri); niyam ke bina 6.0 s (200 giri). Aur aam din ka naap 68% tha → prayog shuru hi nahi hua.',
        choiceExplanations: [
          'Teen cheezein dekho. Rokne ka niyam tha — aur sahi naap par tha? Chot wapas lene ka tareeka chala? Daayra kitna bada tha? Aage: chhota daayra, rokne ka niyam jo naap girte hi chale, rollback jo pehle akele parkha gaya ho — aur aam din ka naap kharab ho toh prayog shuru hi nahi. Lab: rokne ke niyam ke saath chot 0.5 s chali (17 giri); niyam ke bina 6.0 s (200 giri). Aur aam din ka naap 68% tha → prayog shuru hi nahi hua.',
          'Prayog band karne se kami gayab nahi hoti — bas outage asli raat mein, bina taiyaari ke aayega.',
          'Raat mein kam log dikhenge, par wajah wahi rahegi. Pehle dekho niyam aur rollback kyun nahi chale.',
          'Nateeja dekh ke hadd badalna andaaze ke saath beimaani hai. Hadd pehle tay hoti hai.',
        ],
      },
      {
        q: '"Prayog pass ho gaya. Kya ab hum keh sakte hain ki system resilient hai?"',
        choices: [
          'Sirf us ek chot aur us naap ke liye — chot badlo, naap mein samay rakho, aur baar-baar chalao',
          'Haan — prayog pass matlab system resilient hai, ab dobara chalane ki zaroorat nahi',
          'Nahi — prayog kabhi kuch saabit nahi karte, isliye pass ya fail se farak nahi padta',
          'Haan, agar prayog production mein chala ho — production ka pass har chot ko cover karta hai',
        ],
        answer: 0,
        explain: 'Sirf us ek chot ke liye, aur sirf us naap ke hisaab se jo andaaze mein tha. Chot badlo, aur naap mein samay bhi rakho. Phir prayog ko lagataar chalao, kyunki system roz badalta hai. Lab: dheeme instance par safal % wala andaaza tik gaya (hypothesis tika, 0 giri), jabki darj runs mein sabse dheemi 1% ko 515–517 ms ya zyada laga (p99; median 14 ms).',
        choiceExplanations: [
          'Sirf us ek chot ke liye, aur sirf us naap ke hisaab se jo andaaze mein tha. Chot badlo, aur naap mein samay bhi rakho. Phir prayog ko lagataar chalao, kyunki system roz badalta hai. Lab: dheeme instance par safal % wala andaaza tik gaya (hypothesis tika, 0 giri), jabki darj runs mein sabse dheemi 1% ko 515–517 ms ya zyada laga (p99; median 14 ms).',
          'Pass sirf us chot aur us naap ka hai. Lab: safal % wala andaaza tika, par sabse dheemi 1% ko 515–517 ms ya zyada laga.',
          'Prayog bharosa deta hai — par sirf us chot, us naap ke daayre tak. Bekaar nahi, seemit hai.',
          'Production asli jagah hai, par ek chot ka pass doosri chot ka saboot nahi.',
        ],
      },
    ],
  },
  success: [
    'Kisi bhi haalat ke liye bata sakte ho: prayog chalao, pehle theek karo, ya abhi nahi — aur kyun',
    'Bata sakte ho ki chot kis kram mein deni hai, aur "mar gaya" par rukna kyun galat hai',
    'Bata sakte ho ki andaaze mein sirf safal % rakhna kyun kaafi nahi',
  ],
  cards: [
    { front: 'Prayog chalane se pehle chhah sawaal?', back: 'Naap dikhta hai? Aam din ka naap? Andaaza likha? Rokne ki hadd? Chot wapas kaise (parkha hua)? Daayra + team ko khabar? Ek bhi "nahi" → pehle wahi kami theek karo.' },
    { front: 'Kaunsi chot pehle?', back: 'Mar gaya → dheema → aadha-zinda → jis par service nirbhar hai. Lab (sirf health check): 12 · 133–134 · 133 requests giri.' },
    { front: 'Andaaza tik gaya = sab theek?', back: 'Nahi. Andaaza ek naap ka hota hai. Lab: dheema + retry → safal 100%, prayog pass — par 133 requests 200 ms se dheemi. Samay bhi naapo.' },
    { front: 'Kab bilkul nahi?', back: 'Jab system pehle se bimaar ho (lab: naap 68% → "shuru hi mat karo"), ya din bhaari ho. Aur jo kami pata hai, use todna nahi — pehle theek karna.' },
    { front: 'Rokne ka niyam kya badalta hai?', back: 'Kami nahi — sirf nuksaan ka daayra. Lab: 17 banaam 200 giri hui requests. Principle: Minimize Blast Radius.' },
  ],
},
]);

})();
