/* =====================================================================
   System Gurukul — 📟 Observability aur Kharcha (track pro-obs), hissa 3
   Levels: obs-bill (cost show/tag mission), obs-unit (unit cost + levers mission).
   Numbers perfsim-pro.js ke cost model se (₹ lakh / mahina, kalpanik).
   ===================================================================== */
(() => {
const T_BILL = [
  { text: 'Bill dekho — kaunsa feature kitna kha raha hai, pata chala?',
    check: s => s.records.some(r => r.kind === 'cost' && r.view === 'resource' && r.tags === false) },
  { text: 'Har server, DB aur bucket par team + feature ka tag lagao',
    check: s => s.sys.cost.tags === true },
  { text: 'Bill dobara: feature ke hisaab se',
    check: s => SD.mission.current(s, 'cost', r => r.view === 'feature') },
];
const fixedAll = s => ['statement-pdf', 'reco', 'analytics-export'].every(f => s.sys.cost.fixed[f] === true);
const T_UNIT = [
  { text: 'Bill feature ke hisaab se dekho',
    check: s => s.records.some(r => r.kind === 'cost' && r.view === 'feature') },
  { text: 'Pehle ek payment ka kharcha naapo',
    check: s => s.records.some(r => r.kind === 'cost-unit' && r.total === 36) },   /* ₹36 lakh sirf kisi fix se pehle hi milta hai */
  { text: 'Statement PDF ka kharcha sahi lever se ghatao',
    check: s => s.sys.cost.fixed['statement-pdf'] === true },
  { text: 'Recommendations ka kharcha sahi lever se ghatao',
    check: s => s.sys.cost.fixed.reco === true },
  { text: 'Analytics export ka kharcha sahi lever se ghatao',
    check: s => s.sys.cost.fixed['analytics-export'] === true },
  { text: 'Dobara naapo: ₹0.08 se kam har payment',
    check: s => SD.mission.current(s, 'cost-unit', r => r.perUnit < 0.08) },
];

SD.registerLevels('pro-obs', [
/* ---------------------------------------------------------------- O5 */
{
  id: 'obs-bill',
  icon: '🧾',
  title: 'Cloud bill do guna — kaun kha raha hai?',
  badge: 'Bill ka Jasoos',
  objectives: [
    'Resource ke hisaab se bill ("compute ₹20 lakh") feature nahi batata',
    '<b>Tags</b>: team + feature + env har resource par',
    'Saajha kharcha (shared DB, network) kaise baantein',
    '<b>Showback</b> (bill dikhao) vs <b>chargeback</b> (budget se kaato)',
  ],
  lesson: [
    `<h3>💡 Misaal: ghar ka bijli bill</h3>
     <p>Bill ₹3,000 se ₹6,000 ho gaya. Meter ek hi hai. AC? Geyser? Naya fridge?</p>
     <p>Har plug par chhota meter (sub-meter) lagaya. Pata chala: naya geyser din bhar chalu rehta hai.</p>
     <p class="tip">🎯 <b>Asli baat:</b> cloud bill batata hai "compute ₹20 lakh, database ₹9 lakh". Ye nahi batata ki <b>kaunse feature</b> ne kharcha kiya.
       Resource par <b>tag</b> (team, feature, env) maalik batata hai. Saajhe resource ka usage alag naapna padta hai.</p>`,
    `<h3>📈 ChaiPay: ₹18 lakh se ₹36 lakh</h3>
     <p>Do mahine mein bill do guna. Isi beech teen naye features aaye: <b>Statement PDF</b>, <b>Recommendations</b>, <b>Analytics export</b>.</p>
     <p>Bina tags: "compute badha". Bas. CFO (finance ke zimmedaar) ke sawaal ka jawab nahi.</p>
     <p><b>Tagging ka niyam:</b></p>
     <ul>
       <li>Har resource par zaroori tags: <code>team</code>, <code>feature</code>, <code>env</code> (prod/staging/dev).</li>
       <li>Bina tag ka resource ban hi na sake — deploy pipeline ya cloud policy rok de.</li>
       <li>"Untagged %" ko ek number ki tarah roz dekho.</li>
       <li>AWS billing mein tags ko cost allocation (kharcha team ya feature ko dena) ke liye activate karna padta hai. Activation ki list mein tag aane mein 24 ghante tak lag sakte hain. Activate hone mein 24 ghante aur lag sakte hain. Tags lagne ke baad ka bill saaf milta hai; purane mahinon ke liye provider ke niyam dekho.</li>
     </ul>`,
    `<h3>🔀 Saajha kharcha aur showback</h3>
     <p>Ek Postgres sab features use karte hain. Uska tag ek hi hai: <code>platform</code>. Kaise baantein?</p>
     <ul>
       <li><b>Usage se:</b> har feature ka CPU time ya queries — sabse sahi, par naapna padta hai.</li>
       <li><b>Fixed hissa:</b> 40/30/30 — aasaan, par galat ho sakta hai.</li>
     </ul>
     <table>
       <tr><th></th><th>Matlab</th><th>Kab</th></tr>
       <tr><td><b>Showback</b></td><td>Team ko uska bill dikhao; paisa nahi katta</td><td>Pehla kadam; tags abhi pakke nahi</td></tr>
       <tr><td><b>Chargeback</b></td><td>Team ke budget se kaato</td><td>Tags aur baantne ke niyam par sab raazi</td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — bill kaun kha raha hai?',
      goal: 'ChaiPay ka cloud bill do mahine mein ₹18 lakh se ₹36 lakh. CFO poochh rahe hain: kaun kha raha hai? Bill dekho, har resource par tag lagao, aur bill dobara feature ke hisaab se dekho.',
      sys: { name: 'chaipay-cloud' },
      placeholder: 'cost show | tag …',
      tasks: T_BILL,
      success: SD.allTasks(T_BILL),
      verify: s => s.sys.cost.tags === true && SD.mission.current(s, 'cost', r => r.view === 'feature'),
      solution: [
        'cost show',
        'cost tag on',
        'cost show',
      ],
      successText: 'Bill feature ke hisaab se toota: Statement PDF ₹8 lakh, Recommendations ₹8 lakh, Analytics export ₹5 lakh — teeno naye features. Agle level mein in teeno ka kharcha ghataoge aur ek payment ki keemat naapoge. Numbers kalpanik model ke hain.',
      hints: [
        'Pehle bill dekho. Kya pata chalta hai ki kaunsa feature kharcha kar raha hai?',
        '`cost show` bill dikhata hai. `cost tag on` har resource par team aur feature ka tag lagata hai. Tag ke baad wahi bill dobara dekho.',
        'Poora raasta — har command alag Enter se chalao:\ncost show\ncost tag on\ncost show',
      ],
    },
    {
      type: 'match',
      title: 'Kaunsa kharcha kaise baantein?',
      pairs: [
        { left: 'Statement PDF ke apne servers', right: 'Seedha feature tag: statement-pdf', explain: 'Resource sirf ek feature ka hai. Tag se seedha hisaab.' },
        { left: 'Saajha Postgres jo sab features use karte hain', right: 'Usage se baanto: CPU time ya queries', explain: 'Ek tag sab nahi bata sakta. Har feature ka hissa usage se naapo.' },
        { left: 'Data transfer (egress) ka bada bill', right: 'Kis service ne bheja: flow logs, CDN reports', explain: 'Network ka kharcha resource tag par aksar saaf nahi dikhta. Bhejne wale ko flow logs se dhoondho.' },
        { left: 'Dev environment jo raat bhar chalu rehta hai', right: 'env tag + raat ko band karne ka schedule', explain: 'env=dev tag se pehchano, aur kaam ke ghanton ke baad band karo.' },
        { left: 'Ek purani disk jiska koi tag nahi', right: 'Untagged report: maalik dhoondho ya mitao', explain: 'Untagged resources ka maalik dhoondho. Resource ka istemaal aur retention jaancho. Zimmedaar team ki manzoori ke baad hi hatao; snapshot akela deletion ka saboot nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Bill ke faisle',
      questions: [
        {
          q: 'Tags lag gaye, par bill ka 30% abhi bhi untagged hai. Kya karoge?',
          choices: [
            'Naye resources bina tag ke ban na sakein; purane ka maalik dhoondho; untagged % roz dekho',
            'Untagged 30% ko saari teams mein baraabar baant do; hisaab apne aap poora ho jaayega',
            'Saare untagged resources turant mita do; jinke kaam ke the, woh khud bata denge',
            '30% chhod do; 70% tagged hai, CFO ke sawaal ka jawab dene ke liye kaafi hai',
          ],
          answer: 0,
          explain: 'Untagged hissa wahi jagah hai jahan chhupa kharcha rehta hai. Naye resources ko policy se roko, purane ke maalik dhoondho, aur untagged % ko ek target ki tarah ghatao.',
          choiceExplanations: [
            'Untagged hissa wahi jagah hai jahan chhupa kharcha rehta hai. Naye resources ko policy se roko, purane ke maalik dhoondho, aur untagged % ko ek target ki tarah ghatao.',
            'Baraabar baantne se jo team kharcha kar rahi hai, uska pata kabhi nahi chalega.',
            'Bina jaanch mitaane se production ki disk ya backup ja sakta hai.',
            'Sabse bada naya kharcha usi 30% mein chhupa ho sakta hai.',
          ],
        },
        {
          q: 'Showback ya chargeback — ChaiPay pehle kya kare?',
          choices: [
            'Showback: pehle teams ko unka bill dikhao; tags pakke hon tab chargeback',
            'Chargeback: team ke budget se paisa katega tabhi team dhyaan degi',
            'Dono nahi; cloud ka bill finance ka kaam hai, engineers ka nahi',
            'Chargeback, par sirf platform team par; baaki teams ko chhod do',
          ],
          answer: 0,
          explain: 'Galat tags ke saath paisa kaatna jhagde paida karta hai. Showback se teams apna kharcha dekhti hain aur tags sudharte hain. Jab sab hisaab par raazi hon, tab chargeback.',
          choiceExplanations: [
            'Galat tags ke saath paisa kaatna jhagde paida karta hai. Showback se teams apna kharcha dekhti hain aur tags sudharte hain. Jab sab hisaab par raazi hon, tab chargeback.',
            'Kachche tags par paisa kaatoge toh team hisaab se ladegi, kharche se nahi.',
            'Kharcha engineering ke faislon se banta hai. Engineers ko dikhna chahiye.',
            'Ek team par bojh daalna kharche ka asli maalik nahi dikhata.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Cloud cost',
    instructions: 'FinOps ke production sawaal. 🎤',
    questions: [
      {
        q: 'Cloud bill achanak do guna. Pehle 30 minute mein kya karoge?',
        choices: [
          'Bill ko service aur tag se todo; roz ke graph mein jump ka din; us din ke deploys dekho',
          'Saare servers ka size aadha kar do; bill turant aadha ho jaayega, baad mein dekhenge',
          'Cloud provider ko email karo ki bill galat hai; aksar unki galti hoti hai',
          'Agle mahine ka intezaar karo; ek mahine ka uchhal kabhi-kabhi apne aap theek hota hai',
        ],
        answer: 0,
        explain: 'Pehle kahan aur kab: kaunsi service ya tag, aur kis din se. Us din ka deploy ya config badlaav aksar jawab hai. Andhe cuts se outage ho sakta hai.',
        choiceExplanations: [
          'Pehle kahan aur kab: kaunsi service ya tag, aur kis din se. Us din ka deploy ya config badlaav aksar jawab hai. Andhe cuts se outage ho sakta hai.',
          'Bina jaane size aadha karne se production gir sakta hai, aur asli wajah bachi rahegi.',
          'Provider ki galti kam hoti hai; pehle apna data dekho.',
          'Har din ka kharcha jud raha hai. Intezaar mehenga hai.',
        ],
      },
      {
        q: 'Platform team ka shared Kafka cluster 6 teams use karti hain. Kharcha kaise baantoge?',
        choices: [
          'Usage se: har team ke bytes in/out ya partitions; pehle showback',
          'Baraabar 6 hisson mein; sab teams ek hi cluster use karti hain',
          'Saara kharcha platform team par; cluster unka hai, bill bhi unka',
          'Jo team sabse zyada shikayat kare, use zyada hissa do',
        ],
        answer: 0,
        explain: 'Saajhe resource ka hissa usage se naapo: bytes, partitions ya storage. Pehle showback se dikhao, taaki teams sudhaar sakein.',
        choiceExplanations: [
          'Saajhe resource ka hissa usage se naapo: bytes, partitions ya storage. Pehle showback se dikhao, taaki teams sudhaar sakein.',
          'Ek team 80% traffic bhej rahi ho toh baraabar baantna baaki teams ke saath nainsaafi hai.',
          'Platform team kharche ki maalik nahi, use karne wali teams hain. Bill wahan dikhna chahiye.',
          'Hissa data se tay ho, shikayat se nahi.',
        ],
      },
    ],
  },
  success: [
    'Tags se bill ko feature ke hisaab se todna',
    'Saajhe kharche ko usage se baantna',
    'Showback se shuru karke chargeback tak jaana',
  ],
  homework: `Apne cloud account (ya kisi demo account) mein dekho: kitne resources par team/feature tag hai?
    Ek "untagged resources" ki list nikaalo. Sabse mehenge 3 untagged resource kiske hain?`,
  cards: [
    { front: 'Tags kyun?', back: 'Bill ko feature/team ke hisaab se todne ke liye. Bina tag: sirf "compute badha".' },
    { front: 'Zaroori tags?', back: 'team, feature, env. Bina tag ka resource ban hi na sake.' },
    { front: 'Saajha DB ka kharcha?', back: 'Usage se baanto: CPU time ya queries per feature.' },
    { front: 'Showback vs chargeback?', back: 'Showback: bill dikhao. Chargeback: budget se kaato — tags pakke hone ke baad.' },
  ],
},

/* ---------------------------------------------------------------- O6 */
{
  id: 'obs-unit',
  icon: '💹',
  title: 'Unit cost — ek payment kitne ka?',
  badge: 'Paise ka Paimana',
  objectives: [
    'Kul bill nahi, <b>ek payment ka kharcha</b>: unit economics',
    'Teen levers: <b>cache</b> (dobara kaam mat karo), <b>rightsize</b> (khaali servers), <b>CDN</b> (network)',
    'Har lever ki keemat: purana data, peak par dheemapan, invalidation',
    'Terminal: ₹0.12 se ₹0.08 se neeche',
  ],
  lesson: [
    `<h3>🍵 Misaal: chai ki dukaan</h3>
     <p>Mahine ka kharcha ₹60,000 se ₹1,20,000. Achha ya bura?</p>
     <p>Agar cup bhi do guna se zyada bike, toh achha. Asli number hai: <b>ek cup ka kharcha</b>.</p>
     <p class="tip">🎯 <b>Asli baat:</b> unit cost = ek hi period ka kul kharcha ÷ business ikaiyon ki ginti (payments, orders, active users).
       Bill badhe aur unit cost gire = achhi growth. Bill badhe aur unit cost bhi badhe = kuch phool raha hai.</p>`,
    `<h3>🧮 ChaiPay ka hisaab (kalpanik model)</h3>
     <pre>Pichhla mahina: ₹18 lakh ÷ 2.5 crore payments = ₹0.072 har payment
Is mahine:      ₹36 lakh ÷ 3 crore payments   = ₹0.12 har payment</pre>
     <p>Payments 20% badhe, kharcha 100%. Unit cost 0.072 se 0.12 — is model mein <b>naye features</b> ka kharcha badha. Sirf unit cost badhne se wajah saabit nahi hoti.</p>`,
    `<h3>🔧 Teen levers — kharche ki kism se milao</h3>
     <table>
       <tr><th>Feature</th><th>Kharcha kahan</th><th>Lever</th><th>Keemat</th></tr>
       <tr><td>Statement PDF (₹8 lakh)</td><td>Compute: har download par PDF dobara ban raha</td><td><b>cache</b>: mahine ka PDF ek baar banao, storage mein rakho</td><td>Storage; refund aaye toh PDF dobara banana</td></tr>
       <tr><td>Recommendations (₹8 lakh)</td><td>Compute + DB: servers 70% waqt khaali</td><td><b>rightsize</b>: chhote servers + autoscaling</td><td>Scale-up mein der; peak par p99 jaancho</td></tr>
       <tr><td>Analytics export (₹5 lakh)</td><td>Network: badi files seedhe origin se</td><td><b>cdn</b>: compression + CDN</td><td>CDN ka bill; private files ki access jaanch; cache invalidation</td></tr>
     </table>
     <p class="tip">⚠️ Bachat tabhi bachat hai jab SLO na toote. Rightsize ke baad p99 2 second ho gaya? Woh bachat nahi, outage hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — ek payment ₹0.08 se sasta',
      goal: 'Tags pehle se lage hain. Bill feature ke hisaab se dekho aur ek payment ka kharcha naapo. Phir teen naye features ka kharcha sahi lever se ghatao, aur dobara naapo. Lakshya: ₹0.08 se kam har payment.',
      sys: { name: 'chaipay-cloud', cost: { tags: true } },
      placeholder: 'cost show | unit | fix …',
      tasks: T_UNIT,
      success: SD.allTasks(T_UNIT),
      verify: s => fixedAll(s) && SD.mission.current(s, 'cost-unit', r => r.perUnit < 0.08),
      solution: [
        'cost show',
        'cost unit',
        'cost fix statement-pdf --lever cache',
        'cost fix reco --lever rightsize',
        'cost fix analytics-export --lever cdn',
        'cost unit',
      ],
      successText: '₹36 lakh se ₹23 lakh; ek payment ₹0.12 se ₹0.077. Har lever kharche ki kism se mila: dobara ka kaam → cache, khaali servers → rightsize, network → CDN. Asli system mein har badlaav ke baad p99 aur SLO bhi jaancho.',
      hints: [
        'Pehle bill feature ke hisaab se dekho aur ek payment ki keemat naapo. Har naye feature ka kharcha kahan hai: compute, database ya network?',
        '`cost fix <feature> --lever cache|rightsize|cdn`: cache dobara ka kaam bachata hai, rightsize khaali servers ghatata hai, cdn network ka kharcha. `cost unit` ek payment ka kharcha naapta hai.',
        'Poora raasta — har command alag Enter se chalao:\ncost show\ncost unit\ncost fix statement-pdf --lever cache\ncost fix reco --lever rightsize\ncost fix analytics-export --lever cdn\ncost unit',
      ],
    },
    {
      type: 'quiz',
      title: 'Unit cost ke faisle',
      questions: [
        {
          q: 'Bill do guna hua, payments teen guna. Achhi khabar ya buri?',
          choices: [
            'Achhi: ek payment ka kharcha ghata; kul bill nahi, unit cost dekho',
            'Buri: bill do guna hai; kharcha turant aadha karna padega',
            'Buri: bill aur payments ek hi raftaar se hi badhne chahiye',
            'Kuch nahi keh sakte; bill ka payments se koi rishta hi nahi',
          ],
          answer: 0,
          explain: 'Unit cost = bill ÷ payments. 2 ÷ 3 ≈ 0.67 — har payment pehle se ~33% sasta. Scale par unit cost girna healthy hai.',
          choiceExplanations: [
            'Unit cost = bill ÷ payments. 2 ÷ 3 ≈ 0.67 — har payment pehle se ~33% sasta. Scale par unit cost girna healthy hai.',
            'Bill do guna, kaam teen guna. Kharcha aadha karne se shayad SLO toote.',
            'Scale par fixed kharche baant jaate hain, isliye bill payments se dheere badh sakta hai. Ye achha hai.',
            'Zyadatar kharcha traffic se hi aata hai. Rishta hai, isliye unit cost kaam ka number hai.',
          ],
        },
        {
          q: 'Recommendations ke servers aadhe karke ₹4 lakh bache. Par p99 300 ms se 2 second. Ab?',
          choices: [
            'Bachat thodi wapas lo jab tak SLO na toote; chhote kadam mein rightsize',
            'Bachat rakho; recommendations optional hai, 2 second chalega',
            'Servers aur aadhe karo; users ko dheemapan ki aadat pad jaayegi',
            'p99 ka alert band karo; bill ka lakshya poora ho gaya hai',
          ],
          answer: 0,
          explain: 'SLO todne wali bachat asli bachat nahi — conversion aur bharosa girta hai. Chhote kadam mein rightsize karo aur har kadam par p99 naapo.',
          choiceExplanations: [
            'SLO todne wali bachat asli bachat nahi — conversion aur bharosa girta hai. Chhote kadam mein rightsize karo aur har kadam par p99 naapo.',
            'Optional feature bhi page ko dheema kar sakta hai agar timeout aur fallback na ho.',
            'Users aadat nahi daalte, chhod dete hain.',
            'Alert band karna problem chhupata hai.',
          ],
        },
        {
          q: 'Statement PDF cache kar diya. Ek refund ke baad mahine ka statement badal gaya. Kya chahiye?',
          choices: [
            'Refund par us mahine ka PDF invalidate karke dobara banao',
            'Kuch nahi; PDF ek baar ban gaya toh mahine bhar wahi chalega',
            'Cache hata do; har download par PDF dobara banao, jaise pehle',
            'User ko bolo ki naya PDF agle mahine milega',
          ],
          answer: 0,
          explain: 'Cache ki keemat invalidation hai. Jo event statement badalta hai (refund, chargeback), wahi us mahine ka PDF dobara banwaaye.',
          choiceExplanations: [
            'Cache ki keemat invalidation hai. Jo event statement badalta hai (refund, chargeback), wahi us mahine ka PDF dobara banwaaye.',
            'Galat statement financial document hai — merchant ka hisaab bigad jaayega.',
            'Ek event ke liye poori bachat chhodna zaroori nahi. Sirf badla hua PDF dobara banao.',
            'Merchant ko sahi statement abhi chahiye.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Unit economics',
    instructions: 'Design mein kharche ke sawaal. 🎤',
    questions: [
      {
        q: 'Design interview mein "is design ka kharcha?" poochha. Kya bologe?',
        choices: [
          'Bade hisson ka mahine ka andaaza, phir ek request ka kharcha; sabse bada lever',
          'Kharcha baad ki baat hai; pehle design chalna chahiye, bill baad mein dekhenge',
          'Sirf servers gino; network aur storage ka kharcha bahut chhota hota hai',
          'Ek number bol do jo sunne mein theek lage; interviewer jaanch nahi sakta',
        ],
        answer: 0,
        explain: 'Bade hisse (compute, storage, egress) ka mahine ka andaaza, phir ek request ya ek user ka kharcha. Phir batao kaunsa lever sabse zyada bachata hai aur uski keemat.',
        choiceExplanations: [
          'Bade hisse (compute, storage, egress) ka mahine ka andaaza, phir ek request ya ek user ka kharcha. Phir batao kaunsa lever sabse zyada bachata hai aur uski keemat.',
          'Kharcha design ka hissa hai. Mehenga design scale par band ho sakta hai.',
          'Video jaise systems mein egress sabse bada kharcha ho sakta hai.',
          'Andaaza hi sahi, par hisaab ke saath. Bina hisaab ka number kamzor jawab hai.',
        ],
      },
      {
        q: 'Kharcha ghatane ka pehla niyam kya hai?',
        choices: [
          'Sabse bada kharcha pehle; lever kharche ki kism se milao; SLO jaancho',
          'Har cheez par 10% kaato; sab teams ko baraabar bojh uthana chahiye',
          'Sabse purani service pehle band karo; purana code mehenga hota hai',
          'Reserved/committed discount le lo; architecture badalne ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Bada kharcha pehle (sabse zyada bachat). Lever kism se: compute → cache/rightsize, network → CDN/compression. Har badlaav ke baad SLO. Discounts rate ghatate hain; bekaar kaam aur capacity ki barbaadi alag ghatao.',
        choiceExplanations: [
          'Bada kharcha pehle (sabse zyada bachat). Lever kism se: compute → cache/rightsize, network → CDN/compression. Har badlaav ke baad SLO. Discounts rate ghatate hain; bekaar kaam aur capacity ki barbaadi alag ghatao.',
          'Baraabar kaat se chhote kharche wali team dukhi, bade kharche wali theek. Data se chalo.',
          'Umar kharche ka paimana nahi. Bill dekho.',
          'Commitment discount usi kharche par lagta hai. Bekaar kaam ka discount bhi bekaar kharcha hai.',
        ],
      },
    ],
  },
  success: [
    'Unit cost se bill ko business ke saath padhna',
    'Kharche ki kism se sahi lever chunna',
    'Bachat ko SLO ke saath jaanchna',
  ],
  homework: `Apne kisi project ka mahine ka andaazan kharcha likho (server, DB, storage, network).
    Use mahine ke users ya requests se bhaag do. Ek request kitne paise ki? Sabse bada hissa kaunsa, aur usko kaunsa lever chhota karega?`,
  cards: [
    { front: 'Unit cost?', back: 'Kul kharcha ÷ business ikai (payments, users). Trend dekho; naye features aur SLO ki keemat bhi jodo.' },
    { front: 'Dobara ka kaam?', back: 'Cache: ek baar banao, rakh lo. Keemat: invalidation.' },
    { front: 'Khaali servers?', back: 'Rightsize + autoscaling. Keemat: scale-up mein der — p99 jaancho.' },
    { front: 'Network ka bill?', back: 'Compression + CDN. Keemat: CDN invalidation, signed URLs.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['obs-bill'] = {
  t: 'Ek meter se sub-meter tak',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ Bina tags</span>
        <div class="dg-cap">Compute ₹20 lakh · Database ₹9 lakh · Network ₹7 lakh. Kaunsa feature? Pata nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ team + feature + env tags</span>
        <div class="dg-cap">Payments ₹15 lakh · Statement PDF ₹8 lakh · Recommendations ₹8 lakh · Analytics export ₹5 lakh.</div>
      </div>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">tags</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">showback (dikhao)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">chargeback (kaato)</span>
    </div>
    <div class="dg-cap">Kalpanik model ke numbers. Saajha DB ka kharcha usage se baanto.</div>`,
};
VISUALS['obs-unit'] = {
  t: 'Ek payment: ₹0.12 se ₹0.077',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">₹36 lakh ÷ 3 crore = ₹0.12</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">PDF: cache (−₹6 lakh)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">Reco: rightsize (−₹4 lakh)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">Export: CDN (−₹3 lakh)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">₹23 lakh ÷ 3 crore ≈ ₹0.077</span>
    </div>
    <div class="dg-cap">Lever kharche ki kism se: dobara ka kaam → cache, khaali servers → rightsize, network → CDN. Har kadam ke baad SLO jaancho.</div>`,
};

SD.addScenes({
  'obs-bill': {
    intro: 'ChaiPay ka cloud bill do mahine mein <b>₹18 lakh se ₹36 lakh</b>. CFO poochh rahe hain: kaun kha raha hai?',
    nodes: [
      { id: 'bill', col: 0, row: 0, icon: '🧾', label: 'Cloud bill', sub: '₹36 lakh' },
      { id: 'res', col: 1, row: 0, icon: '🗂️', label: 'Resource view', sub: 'compute ₹20 lakh' },
      { id: 'tags', col: 1, row: 1, icon: '🏷️', label: 'Tags', sub: 'team · feature · env' },
      { id: 'feat', col: 2, row: 1, icon: '📊', label: 'Feature view' },
      { id: 'cfo', col: 3, row: 1, icon: '👔', label: 'CFO', sub: 'kaun kha raha hai?' },
    ],
    steps: [
      { from: 'bill', to: 'res', label: 'cost show', say: 'Bill resource ke hisaab se: compute ₹20 lakh, database ₹9 lakh, network ₹7 lakh. Feature ka naam kahin nahi.' },
      { at: ['res'], set: { res: { tone: 'bad', sub: 'untagged: 100%' } }, say: 'Saare resources untagged. Kaunsa naya feature kitna kha raha hai, pata nahi.' },
      { from: 'bill', to: 'tags', label: 'cost tag on', tone: 'good', say: 'Har server, DB aur bucket par tag: team, feature, env. Bina tag ka naya resource ban hi na sake.' },
      { from: 'tags', to: 'feat', label: 'feature ke hisaab se', tone: 'good', set: { feat: { tone: 'good', sub: 'PDF ₹8 · Reco ₹8 lakh' } }, say: 'Ab bill feature ke hisaab se: Payments ₹15 lakh, Statement PDF ₹8 lakh, Recommendations ₹8 lakh, Analytics export ₹5 lakh.' },
      { from: 'feat', to: 'cfo', label: 'showback', tone: 'gold', say: 'Teams ko unka bill dikhao (showback). Tags pakke hon tab budget se kaato (chargeback).' },
      { at: ['tags'], say: 'Saajha Postgres ka ek hi tag hai. Postgres ka kharcha usage se baanto: har feature ka CPU time ya queries.' },
    ],
  },
  'obs-unit': {
    intro: 'Ek payment ka kharcha: <b>₹36 lakh ÷ 3 crore = ₹0.12</b>. Lakshya: ₹0.08 se kam.',
    nodes: [
      { id: 'unit', col: 0, row: 0, icon: '💹', label: 'Unit cost', sub: '₹0.12 / payment' },
      { id: 'pdf', col: 1, row: 0, icon: '📄', label: 'Statement PDF', sub: '₹8 lakh · compute' },
      { id: 'reco', col: 2, row: 0, icon: '🎯', label: 'Recommendations', sub: '₹8 lakh · khaali' },
      { id: 'exp', col: 3, row: 0, icon: '📦', label: 'Analytics export', sub: '₹5 lakh · network' },
      { id: 'slo', col: 2, row: 1, icon: '⏱️', label: 'SLO check', sub: 'p99 jaancho' },
    ],
    steps: [
      { from: 'unit', to: 'pdf', label: 'cache', tone: 'good', set: { pdf: { tone: 'good', sub: '₹8 → ₹2 lakh' } }, say: 'Statement PDF har download par dobara ban raha tha. Mahine ka PDF ek baar banao aur rakh lo. Keemat: refund aaye toh dobara banana.' },
      { from: 'pdf', to: 'reco', label: 'rightsize', tone: 'good', set: { reco: { tone: 'good', sub: '₹8 → ₹4 lakh' } }, say: 'Recommendations ke servers 70% waqt khaali. Chhote servers aur autoscaling.' },
      { from: 'reco', to: 'slo', label: 'p99 theek?', tone: 'gold', say: 'Rightsize ke baad p99 jaancho. SLO toota toh bachat nahi, outage hai.' },
      { from: 'reco', to: 'exp', label: 'cdn', tone: 'good', set: { exp: { tone: 'good', sub: '₹5 → ₹2 lakh' } }, say: 'Badi export files seedhe origin se ja rahi thi. Model mein compression aur CDN se kharcha kam. Asli bill mein CDN delivery bhi jodo; private exports ki access jaancho.' },
      { at: ['unit'], set: { unit: { tone: 'good', sub: '₹0.077 / payment' } }, say: '₹23 lakh ÷ 3 crore ≈ ₹0.077. Har lever kharche ki kism se mila.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-obs-bill', levels: 'obs-bill', guide: {
    title: 'Ek meter ya har plug par sub-meter?',
    misaal: 'Bijli ka bill do guna; ek meter se pata nahi chalta kaunsa appliance. Har plug par sub-meter lagaya toh naya geyser pakda gaya.',
    asli: 'Tags bill ko feature aur team ke hisaab se todte hain. Bina tags ke bill sirf resource ki kism batata hai.',
    points: [
      '<b>Zaroori tags:</b> team, feature, env; bina tag resource na bane.',
      '<b>Saajha kharcha:</b> usage se baanto.',
      '<b>Showback pehle:</b> tags pakke hon tab chargeback.',
    ],
    use: 'Bill badha aur koi nahi jaanta kis feature se.',
    avoid: 'Kachche tags par team ke budget se paisa mat kaato.',
    mistake: 'Untagged 30% ko baraabar baant dena — asli kharcha chhup jaata hai.',
    compare: [
      { choice: 'Showback', when: 'Tags naye hain, teams ko kharcha dikhana hai', tradeoff: 'Jhagda kam, seekhne ka mauka; par paisa nahi katta toh dhyaan kam' },
      { choice: 'Chargeback', when: 'Tags aur baantne ke niyam par sab raazi', tradeoff: 'Teams kharche ki maalik; galat tags par jhagde' },
    ],
    followup: 'Shared Kubernetes cluster par 30 teams ke pods hain. Node ka kharcha teams mein kaise baantoge?',
    sources: [
      { title: 'FinOps Foundation — Allocation capability', url: 'https://www.finops.org/framework/capabilities/allocation/' },
      { title: 'AWS Billing — Organizing and tracking costs using cost allocation tags', url: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html' },
    ],
  } },
  { id: 'pro-obs-unit', levels: 'obs-unit', guide: {
    title: 'Kul bill ghatao ya ek payment ka kharcha?',
    misaal: 'Chai ki dukaan ka kharcha do guna, par cup teen guna bike — dukaan achha kar rahi hai. Asli number ek cup ka kharcha hai.',
    asli: 'Unit cost bill ko business se jodta hai. Kharcha ghatao toh sabse bade hisse se, aur lever kharche ki kism se milao.',
    points: [
      '<b>Dobara ka kaam:</b> cache; keemat invalidation.',
      '<b>Khaali servers:</b> rightsize + autoscaling; p99 jaancho.',
      '<b>Network:</b> compression + CDN; invalidation aur signed URLs.',
    ],
    use: 'Bill badh raha ho aur jaanna ho ki growth se ya phoole hue design se.',
    avoid: 'SLO todne wali bachat ko bachat mat gino.',
    mistake: 'Har team par 10% ka andha cut.',
    compare: [
      { choice: 'Architecture lever (cache, rightsize, CDN)', when: 'Kaam bekaar ho raha hai ya khaali resources hain', tradeoff: 'Badi bachat; code aur testing ka kaam, invalidation ka risk' },
      { choice: 'Commitment discount', when: 'Load sthir hai aur design theek hai', tradeoff: 'Code nahi badalta; rate kam hota hai, par commitment aur bekaar usage ka risk rehta hai' },
    ],
    followup: 'Recommendations ka kharcha ghata, par conversion 2% gira. Unit cost ke saath kaunsa number aur dekhoge?',
    sources: [
      'blobs',
      { title: 'FinOps Foundation — Unit Economics capability', url: 'https://www.finops.org/framework/capabilities/unit-economics/' },
      { title: 'AWS Well-Architected — Cost Optimization Pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html' },
    ],
  } },
);
})();
