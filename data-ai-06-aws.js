/* =====================================================================
   TRACK — 🤖 AI Companies · Amazon ka $200 billion: jab machines crore mein hon

   Source: "Why Amazon Spends $200 Billion a Year on Computers" (Akhil Sharma).
   Aadhaar: Amazon Builders Library, "Millions of Tiny Databases" (NSDI 2020,
   Physalia), SRD paper, Nitro whitepaper, re:Invent talks.
   Shuffle sharding ka lab ⚡ Resilience → Blast Radius level mein juda hai.
   Docker lab: docker-labs/20-aws
   ===================================================================== */
(function () {

VISUALS['aws-scale-rate'] = {
  t: 'Crore machines par "kabhi-kabhi" roz hota hai',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1 machine</span><span class="cmd">1-in-a-million/din ki galti</span><span class="q">shayad kabhi nahi dikhegi</span></div>
      <div class="dg-rung a"><span class="lv">10 lakh</span><span class="cmd">wahi galti</span><span class="q">ROZ ek baar</span></div>
      <div class="dg-rung g"><span class="lv">sabak</span><span class="cmd">Failure ek RATE hai, event nahi</span><span class="q">"Everything fails all the time" — Werner Vogels</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐢 Xen hypervisor (pehla dashak)</span>
        <div class="dg-cap">Networking, storage emulation, management — sab customer ke CPU par. Overhead × crore machines
          = poore data centers sirf Xen chala rahe the.</div></div>
      <div class="dg-box is-good"><span class="bx-label">⚡ Nitro</span>
        <div class="dg-cap">Annapurna Labs (~$350M, 2015) → networking, EBS, storage alag cards par; chhota hypervisor;
          security chip boot se pehle firmware jaanchta hai. Aur production hosts par <b>koi SSH nahi</b>.</div></div>
    </div>`,
};

VISUALS['aws-srd'] = {
  t: 'Ek raasta vs 64 raaste',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🚗 TCP</span>
        <div class="dg-cap">Ek flow = ek raasta. Order mein delivery: ek packet ruka toh peeche sab ruke (head-of-line).
          Loss recovery milliseconds mein — jabki data center ka RTT microseconds ka.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🌊 SRD</span>
        <div class="dg-cap">Ek flow 64 raaston par bikhra. Order ki parwah nahi (upar wali layer jod legi).
          Khoya packet µs mein kisi <b>dusre</b> raaste se. Dead link = 1/64 capacity kam, bas.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Lab 20: 64 mein se ek raasta 20 ms dead — TCP p99 <b>31 ms</b>, SRD <b>110 µs</b>. p50 dono ka same:
      farq sirf <b>tail</b> mein hai. Aur switches: ek commodity chip, kam features, "chalta hai ya mara hua" — Clos fabric
      mein bahut saare barabar raaste.</div>`,
};

VISUALS['aws-constant-work'] = {
  t: 'Barista vs coffee machine — aur chhote databases',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">☕ Delta sync (barista)</span>
        <div class="dg-cap">Shaant din: kuch kaam nahi. Bura din: hazaron badlaav — thik jab system pareshan hai.
          Ek message khoye toh copy galat reh sakti hai; naya update ya repair state mila sakta hai. Lab: storm par 9,772 msgs/sec, storm ke baad drift lagbhag 108.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🤖 Constant work (coffee machine)</span>
        <div class="dg-cap">Har few seconds POORI state ek fixed-size file mein; har DNS server poori file le jaata hai.
          0 badlaav ho ya 1 lakh — same kaam. Lab: hamesha 10 KB/sec, drift 0.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill bad">🗄️ EBS 2011: EK metadata DB sab volumes ke liye</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🧩 Physalia: har volume ka apna chhota 7-node Paxos cell, uske paas</span>
    </div>`,
};

VISUALS['aws-proofs'] = {
  t: 'Testing sample hai, proof poora',
  html: "\n    <div class=\"dg-grid\">\n      <div class=\"dg-node is-gold\"><span class=\"ni\">🧪</span><span class=\"nl\">Testing</span><span class=\"ns\">kuch raaste chala ke dekhe. Scale par 1-in-a-billion raasta ek aam dopahar ko chalta hai</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">📐</span><span class=\"nl\">TLA+ model checking</span><span class=\"ns\">bounded modeled states explore karta hai — DynamoDB replication bug, sabse chhota failing trace 35 kadam</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">🔏</span><span class=\"nl\">Zelkova</span><span class=\"ns\">IAM/S3 policy → math → SMT solver: \"kya KOI bhi request is bucket ko public bana sakti hai?\"</span></div>\n    </div>\n    <div class=\"dg-cap\">Zelkova hi IAM Access Analyzer, S3 Block Public Access aur console ke \"Public\" badge ke peeche hai.</div>",
};

SD.registerLevels('ai', [
/* =====================================================================
   1. aws-scale-rate
   ===================================================================== */
{
  id: 'aws-scale-rate',
  icon: '💰',
  title: 'Amazon ka $200 billion — failure ek rate hai',
  badge: 'Crore Machine Karigar',
  objectives: [
    'Scale par chhote kharche × crore machines = bada faisla',
    '"Failure event nahi, rate hai"',
    'Nitro: hypervisor ka kaam alag cards par',
    'Production par SSH nahi — security aur scaling dono',
  ],
  lesson: [
    "<h3>🛒 Ye aam shopping list nahi</h3>\n     <p>Amazon ka capex ~$200B saal (roz $0.5B se zyada), zyadatar AWS. 2016 mein James Hamilton ne kaha\n     tha: AWS har din itni capacity jodta hai jitni 2004 ke poore Amazon (ek $7B company) ko chalane ke\n     liye chahiye thi. Aur ye servers \"khareedna\" nahi — apne servers, apne CPUs (Graviton), apne routers,\n     apna fiber aur undersea cables mein hissa, data center ke andar apna transport (TCP nahi).</p>\n     <p>Kyun? Vendor ka saamaan hazaron machines ke liye bana hai. <b>Laakhon</b> par jo kharche aur failure\n     rates dikhte nahi the, ve kharche bahut bade ho jaate hain → khud banana sasta.</p>\n     <p class=\"tip\">Ek mithak bhi: \"AWS retail ke khaali servers kiraye par dene se bana\" — galat. Holiday peak\n     par retail ko apne servers wapas chahiye hote. Asli wajah: andar ki takleef, har team infra dobara bana rahi thi;\n     Bezos ka mandate — mazboot internal services; phir infra banane ka hunar bech diya.</p>\n     <h3>🎲 Failure ek RATE hai</h3>\n     <p>Ek machine par 1-in-a-million/din wali galti shayad kabhi na dikhe. 10 lakh machines par wahi galti\n     <b>roz</b> hoti hai. Werner Vogels: <b>\"Everything fails all the time.\"</b> Design ka sawaal \"kya system\n     fail hoga?\" nahi, \"system roz kitni baar fail hoga, aur tab kya?\"</p>",
    `<h3>🖥️ Nitro — overhead ko CPU se hatao</h3>
     <p>Pehle dashak AWS Xen hypervisor chalata tha — virtual networking, storage emulation, management, sab
     customer ke CPU par. Ye overhead × crore machines = <b>poore data centers</b> sirf Xen chala rahe the.</p>
     <p>2015: Annapurna Labs (~$350M) khareeda → <b>Nitro</b>: VPC networking, EBS, local storage ke liye alag
     cards; security chip jo boot se pehle firmware/software jaanchta hai; ek chhota hypervisor jo sirf batwara
     karta hai. Bare metal instance = Nitro, hypervisor ke bina. EC2 Mac = Mac mini, Thunderbolt se Nitro par.
     Wahi team aage chalkar Graviton (ARM CPUs).</p>
     <h3>🚫 Production par koi SSH nahi</h3>
     <p>Nitro hosts par koi interactive login nahi — AWS engineers ka bhi nahi. Kaam sirf chhote, authenticated,
     tay APIs se. Do faayde:</p>
     <ul>
       <li><b>Security</b> — koi galti se kuch nahi badal sakta; insider risk kam.</li>
       <li><b>Scaling</b> — agar har problem ke liye kisi ko SSH karna pade, toh ops team fleet ke saath
       badhti hai → wahi bottleneck. <b>Aise systems mat banao jinhe badhne ke liye insaan badhane padein.</b></li>
     </ul>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — rate ka khel',
      goal: 'Numbers se dekho ki "kabhi-kabhi" scale par "roz" kaise banta hai.',
      problems: [
        {
          q: 'Ek disk ka saalana failure rate 1% hai. 10 lakh disks ke fleet mein ROZ kitni disks marti hain?',
          unit: 'disks/din', given: ['1% per saal', '10,00,000 disks', '365 din'],
          answer: 27, tol: 0.3,
          steps: ['10,00,000 × 1% = 10,000 disks/saal', '10,000 / 365 ≈ 27 roz'],
          lesson: 'Roz 27 disks — ye incident nahi, ek routine hai. Isliye replacement aur repair automatic hone chahiye.',
        },
        {
          q: 'Hypervisor har machine ka 10% CPU khata hai. 20 lakh machines par kitni machines ka CPU sirf hypervisor par?',
          unit: 'machines', given: ['10% overhead', '20,00,000 machines'],
          answer: 200000, tol: 0.3,
          steps: ["20,00,000 × 0.10 = 2,00,000", 'Poore data centers jitna — yahi Nitro ki wajah'],
          lesson: 'Chhota kharcha × fleet = bada faisla. Scale par har % ka hisaab lagao.',
        },
      ],
    },
    {
      type: 'quiz',
      title: 'No-SSH ki samajh',
      questions: [
        {
          q: 'Production hosts par SSH band karne ka SCALING wala faayda?',
          choices: [
            'Har problem par login karna pade toh ops team fleet ke saath badhegi; tay APIs automate hote hain',
            'SSH ke packets ki latency hi fleet ki rukawat hai — SSH band toh fleet tez ho jaata hai',
            'API se kaam ho toh authentication ki zaroorat hi nahi — API khud bharosemand raasta hai',
            'SSH band matlab emergency mein bhi koi raasta nahi — aur yahi scaling ka faayda hai',
          ],
          answer: 0,
          explain: 'Video ka sabak: aise systems mat banao jinhe badhne ke liye insaan badhane padein. Nitro par AWS engineers ka bhi interactive login nahi; roz ka kaam aur emergency, dono tay aur authenticated raaston se hote hain.',
          choiceExplanations: [
            'Video ka sabak: aise systems mat banao jinhe badhne ke liye insaan badhane padein. Nitro par AWS engineers ka bhi interactive login nahi; roz ka kaam aur emergency, dono tay aur authenticated raaston se hote hain.',
            'SSH ki speed rukawat nahi — insaan ka login rukawat hai.',
            'API ko bhi authentication chahiye.',
            'Emergency ke liye bhi manzoor raaste rakhe jaate hain; bas interactive login nahi.',
          ],
        },
        {
          q: '"AWS retail ke khaali servers kiraye se bana" — mithak galat kyun?',
          choices: [
            'Holiday peak par retail ko servers wapas chahiye hote — asli wajah andar ki services ka hunar tha',
            'Retail ke paas koi servers the hi nahi — toh khaali servers ka sawaal hi nahi uthta',
            'AWS pehle bana aur retail baad mein — toh retail ke servers kiraye par dene ka sawaal nahi',
            'Khaali capacity thi, toh wahi origin ka pakka saboot hai — mithak sahi hai',
          ],
          answer: 0,
          explain: 'Achha mithak, par economics ulta hai. Cloud service ka economics alag hai.',
          choiceExplanations: [
            'Achha mithak, par economics ulta hai. Cloud service ka economics alag hai.',
            'Retail ke paas bahut servers the.',
            'Amazon retail AWS se kahin pehle tha.',
            'Peak par wahi servers retail ko chahiye — kiraye par dena mumkin nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — fleet at scale',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara fleet 100 se 10,000 machines hoga. Ops kaise sambhaloge?"',
        choices: [
          'Failure ko rate maano: automatic detection, replacement, repair; har kaam ek tay API',
          'Fleet ke anupaat mein log badhao — 100× machines toh 100× ops engineers bhi',
          'Aisa hardware lo jo kabhi fail na ho — hardware failure ko namumkin maan ke chalo',
          'Har machine par alerts lagao — alert aaya toh insaan aake khud theek karega',
        ],
        answer: 0,
        explain: 'Ops ko fleet ke saath seedhi line mein mat badhne do.',
        choiceExplanations: [
          'Ops ko fleet ke saath seedhi line mein mat badhne do.',
          'Log fleet ke saath badhe toh log hi rukawat ban jaate hain.',
          '10,000 machines par har din kuch girega — failure ek rate hai.',
          'Alert bina remediation ke insaan ko hi kaam deta hai.',
        ],
      },
      {
        q: 'Interviewer: "Khud hardware banana kab samajhdaari hai?"',
        choices: [
          'Jab scale itna bada ho ki vendor ke chhupe kharche × fleet, khud banane se zyada hon',
          'Jab team badi ho — badi team ko apni chips aur hardware design karni hi chahiye',
          'Sirf ek unit ke sticker price ko milao — sasta laga toh khud bana lo',
          'Vendor ka overhead hamesha R&D se zyada hota hai — toh khud banana hamesha sahi',
        ],
        answer: 0,
        explain: 'Dropbox (storage) aur AWS (Nitro) — dono ne yahi hisaab lagaya. Problem tumhare liye khaas bhi honi chahiye.',
        choiceExplanations: [
          'Dropbox (storage) aur AWS (Nitro) — dono ne yahi hisaab lagaya. Problem tumhare liye khaas bhi honi chahiye.',
          'Badi team se hardware banane ka hisaab nahi badalta.',
          'Sticker price se maintenance, failure aur R&D chhoot jaate hain.',
          'Chhote scale par vendor sasta padta hai.',
        ],
      },
    ],
  },
  success: [
    'Main failure ko rate ki tarah soch ke design kar sakta hoon',
    'Main scale par chhote kharchon ka hisaab laga sakta hoon',
    'Main no-SSH ops ka security aur scaling tark de sakta hoon',
  ],
  homework: `<p>Apne system ka ek "kabhi-kabhi" wala failure lo (disk bhari, cert expire, process OOM). Failure ka rate
    nikaalo (mahine mein kitni baar per machine) aur fleet size se guna karo. Agar jawab "hafte mein kai baar"
    aaye toh failure incident nahi, automation ka kaam hai.</p>`,
  cards: [
    { front: '"Failure ek rate hai" ka matlab?', back: '1-in-a-million/din × 10 lakh machines = roz ek baar. Design ka sawaal: roz kitni baar, aur tab kya automatic hoga?' },
    { front: 'Nitro kya hai?', back: 'Networking, EBS, storage ka kaam alag cards par; security chip boot se pehle jaanch; chhota hypervisor. Xen ka overhead customer CPU se hata.' },
    { front: 'Production par no-SSH ke do faayde?', back: 'Security (koi galti se kuch nahi badal sakta, insider risk kam) aur scaling (ops team fleet ke saath nahi badhti).' },
  ],
},

/* =====================================================================
   2. aws-srd
   ===================================================================== */
{
  id: 'aws-srd',
  icon: '🌊',
  title: 'Network — simple switches aur 64 raaston wala transport',
  badge: 'Raasta Bikherne Wala',
  objectives: [
    '"Jab ye fail hoga toh failure kaisa dikhega?" — Hamilton ka sawaal',
    'Single-chip switches aur Clos fabric',
    'TCP ki teen maanyataein data center mein kyun galat',
    'SRD: multipath, no ordering, µs retransmit — lab mein tail latency',
  ],
  lesson: [
    `<h3>🔧 "Kitne failures hamare hain?"</h3>
     <p>James Hamilton ka sawaal: <b>jab ye fail hoga, failure kaisa dikhega, aur failure ke kitne hisse hamare
     control mein hain?</b> Bade chassis routers (Cisco/Juniper) sophisticated tareeke se fail hote hain —
     diagnose karne mein hafta. 10 routers ke liye theek, hazaron ke liye nahi.</p>
     <p>AWS ke routers: <b>ek commodity switching chip</b>, kam features, jo simple tareeke se fail ho —
     "chal raha hai ya mara hua". Aur in switches ko <b>Clos fabric</b> mein lagao: ek jaise switches ki layers, beech
     mein bahut saare barabar raaste; badhna ho toh aur boxes jodo. Upar se apna global backbone aur undersea
     cables mein hissa → regions ke beech traffic public internet par nahi.</p>
     <h3>🚗 TCP ki teen maanyataein</h3>
     <table>
       <tr><th>TCP maanta hai</th><th>Data center ki haqeeqat</th></tr>
       <tr><td>Ek raasta</td><td>Hazaron raaste khaali pade hain</td></tr>
       <tr><td>Order mein delivery (ek ruka toh sab ruke)</td><td>Head-of-line blocking tail latency khaata hai</td></tr>
       <tr><td>Loss recovery ms mein</td><td>RTT µs mein — recovery delivery se ~8,000× lamba</td></tr>
     </table>`,
    "<h3>🌊 SRD — Scalable Reliable Datagram</h3>\n     <p>Ek flow ko <b>64 raaston</b> par bikher do. Order ki parwah mat karo — upar wali layer packets jod legi.\n     Khoya packet <b>microseconds</b> mein kisi dusre raaste se dobara. Congestion control sirf Amazon ke apne\n     network ke liye tuned. Ek link mara = 1/64 capacity kam, aur baaki 63 par µs mein retransmit.</p>\n     <h3>📏 Lab 20 (ex3) — 1,000 flows × 1 MB, 64 raaste, raasta #0 kharab</h3>\n     <pre>kharabi             protocol    p50        p99        max\nsab theek           TCP         89 µs      89 µs      89 µs\n1 raasta 1% loss    TCP         89 µs      1.09 ms    3.09 ms\n1 raasta 1% loss    SRD         89 µs      110 µs     110 µs\n1 raasta dead 20 ms  TCP         89 µs      31.09 ms   31.09 ms\n1 raasta dead 20 ms  SRD         110 µs     110 µs     110 µs</pre>\n     <p>p50 dono ka <b>same</b>. Farq sirf unlucky flows mein: TCP ka flow ek raaste par hash hota hai (ECMP) →\n     1/64 flows kharab raaste par → ms tak ruke. SRD mein har flow ka thoda hissa kharab raaste par → sab ~20 µs\n     dheeme, koi ms tak nahi. (Model ki assumptions tool ke upar likhi hain; Linux ka default RTO min 200 ms\n     lagao toh TCP p99 200 ms.)</p>\n     <p class=\"tip\">🎯 Kisi bhi technology ke peeche ki <b>maanyataein</b> poochho. TCP internet ke liye bana\n     tha; data center ki physics alag hai.</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — TCP vs SRD ki tail latency',
      project: '20-aws',
      exercise: 'ex3',
      goal: '64 raaston mein se ek kharab (1% loss / 20 ms dead) — TCP aur SRD ka p50, p99, max dekho.',
      why: `<code>tools/srd.js</code> ek chhota model hai (100 Gbps NIC, 5 µs latency, TCP RTO 1 ms DC-tuned, SRD
        retransmit 20 µs). <code>--rto-ms 200</code> se Linux default dekho. Koi server nahi chahiye.`,
      steps: [
        { text: 'Default (DC-tuned RTO 1 ms).', cmd: 'cd docker-labs/20-aws && node tools/srd.js', expect: '1 raasta 1% loss    TCP         89 µs      1.09 ms    3.09 ms    14\n1 raasta 1% loss    SRD         89 µs      110 µs     110 µs     0\n1 raasta dead 20ms  TCP         89 µs      31.09 ms   31.09 ms   10\n1 raasta dead 20ms  SRD         110 µs     110 µs     110 µs     0' },
        { text: 'Linux default RTO (200 ms) ke saath.', cmd: 'node tools/srd.js --rto-ms 200', expect: '1 raasta 1% loss    TCP         89 µs      200.09 ms  600.09 ms  14\n1 raasta dead 20ms  TCP         89 µs      200.09 ms  200.09 ms  10' },
      ],
      observe: {
        q: 'TCP ka p50 SRD jitna hi achha (89 µs). Toh SRD kis cheez ke liye bana?',
        choices: [
          'Tail ke liye — 1/64 unlucky flows kharab raaste par ruke; sabse dheema flow kaam rokta',
          'Median latency hi lakshya tha — SRD ko sirf p50 sudhaarne ke liye banaya gaya',
          'Encryption unlucky flows ko kha jaati hai — SRD ne encryption hata ke unlucky flows bachaye',
          'Average bandwidth theek hai toh tail ka sawaal hi nahi — SRD bandwidth ke liye bana',
        ],
        answer: 0,
        explain: 'Fan-out wale kaam mein (ek step = hazaron flows) p99 hi asli latency hai.',
        choiceExplanations: [
          'Fan-out wale kaam mein (ek step = hazaron flows) p99 hi asli latency hai.',
          'p50 dono ka 89 µs tha — lakshya tail tha.',
          'Encryption ka unlucky flows se koi lena-dena nahi.',
          'Average mein tail chhup jaati hai.',
        ],
      },
      lesson: 'Multipath + no ordering + µs retransmit = ek kharab raasta sirf ek chhota sa dent, jhatka nahi.',
    },
    {
      type: 'match',
      title: 'Maanyata aur ilaaj',
      instructions: 'Har maanyata ko AWS ke jawab se jodo.',
      pairs: [
        { left: '🔧 Bade routers sophisticated tareeke se fail hote hain', right: 'Ek commodity chip wale simple switches — "chalta ya mara"', explain: 'Hazaron devices par debug karne layak failure mode chahiye.' },
        { left: '🛣️ Badhne ke liye bada router chahiye', right: 'Clos fabric — ek jaise switches ki layers, aur boxes jodo', explain: 'Scale up nahi, scale out — network mein bhi.' },
        { left: '🚗 Ek flow = ek raasta', right: 'SRD: ek flow 64 raaston par bikhra', explain: 'Khaali pade raaste istemaal karo.' },
        { left: '📦 Order mein delivery zaroori', right: 'Transport order chhod de, upar wali layer jode', explain: 'Head-of-line blocking khatam.' },
        { left: '🌍 Regions ke beech public internet', right: 'Apna global backbone + undersea cables mein hissa', explain: 'Jo raasta tumhara nahi, us raaste ke failure bhi tumhare nahi — control ke bahar.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — data center networking',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Distributed training ke step ka p99 kharab hai jabki average theek. Network mein kya dekhoge?"',
        choices: [
          'Unlucky flows — ECMP hash se congested link par gaye flows, HOL blocking, RTO',
          'Sirf average bandwidth ka graph dekho — average theek hai toh poora network bhi theek hai',
          'Learning rate ko network ka knob maano — learning rate ghatao toh p99 sudhrega',
          'Retries band kar do — retries hi p99 badhaate hain, failure ka plan baad mein',
        ],
        answer: 0,
        explain: 'Tail ki wajah aksar ek chhota hissa hota hai — aur fan-out us chhote hisse ko poora kaam bana deta hai. Ilaaj: multipath spraying, RTO tuning, flow-level load balancing.',
        choiceExplanations: [
          'Tail ki wajah aksar ek chhota hissa hota hai — aur fan-out us chhote hisse ko poora kaam bana deta hai. Ilaaj: multipath spraying, RTO tuning, flow-level load balancing.',
          'Average theek tha — sawaal hi yahi hai.',
          'Learning rate network ki tail nahi badalta.',
          'Retries band karne se khoye packets kabhi nahi aayenge.',
        ],
      },
      {
        q: 'Interviewer: "Feature-rich router ya simple switch?"',
        choices: [
          'Scale par simple — failure kam aur predictable; features software mein, kai raaste',
          'Simple hardware kabhi fail hi nahi ho sakta — simple switch lo, failure ka plan zaroori nahi',
          'Jitne zyada features, utna mazboot network — feature-rich router hi resilience hai',
          'Jo sabse sasta mile wahi lo — switch ki khareed ka daam hi faisla karta hai',
        ],
        answer: 0,
        explain: 'Hamilton ka sawaal: failure kaisa dikhega aur kitna hamare control mein hai?',
        choiceExplanations: [
          'Hamilton ka sawaal: failure kaisa dikhega aur kitna hamare control mein hai?',
          'Simple switch bhi girta hai — bas predictable tareeke se.',
          'Zyada features = zyada anjaan failure modes.',
          'Sasta switch bhi anjaan tareeke se gir sakta hai.',
        ],
      },
    ],
  },
  success: [
    'Main Hamilton ka "failure kaisa dikhega" sawaal kisi bhi component par laga sakta hoon',
    'Main TCP ki maanyataein aur SRD ke jawab samjha sakta hoon',
    'Main lab se dikha sakta hoon ki multipath tail latency kaise bachata hai',
  ],
  homework: `<p>Apne system ki koi ek purani maanyata dhoondho jo naye environment mein galat ho sakti hai
    (jaise "network reliable hai", "clock sahi hai", "disk tez hai"). Likho: ye maanyata kahan se aayi, aur
    tumhare environment mein maanyata ki jagah kya sach hai?</p>`,
  cards: [
    { front: 'Hamilton ka network sawaal?', back: '"Jab ye fail hoga, failure kaisa dikhega, aur kitna hamare control mein?" → simple single-chip switches + Clos fabric.' },
    { front: 'TCP ki DC mein galat maanyataein?', back: 'Ek raasta (hazaron khaali), order zaroori (HOL blocking), ms recovery (RTT µs mein).' },
    { front: 'SRD?', back: 'Ek flow 64 raaston par, no ordering, µs retransmit dusre raaste se. Lab: ek raasta dead → TCP p99 31 ms, SRD 110 µs.' },
  ],
},

/* =====================================================================
   3. aws-constant-work
   ===================================================================== */
{
  id: 'aws-constant-work',
  icon: '☕',
  title: 'Constant work aur chhote databases',
  badge: 'Coffee Machine Wala',
  objectives: [
    'Delta sync ki do bimaariyan: bure din zyada kaam, khoye update ke baad drift pehchaanne aur sudhaarne ka raasta',
    'Constant work: Route 53 health checks',
    'EBS 2011: re-mirroring storm aur ek shared metadata DB',
    'Physalia: har volume ka apna chhota database',
  ],
  lesson: [
    "<h3>☕ Barista vs coffee machine</h3>\n     <p>Barista: order aaya toh banaya, nahi toh baitha. Shaant din aaram, rush hour mein pagal. Coffee machine:\n     har minute ek cup, chahe koi pee ya na pee. \"Wasteful\" — par rush hour mein bhi wahi kaam.</p>\n     <p><b>Delta sync</b> barista hai: sirf badlaav bhejo. Do bimaariyan:</p>\n     <ul>\n       <li>Shaant din kuch kaam nahi, <b>bure din hazaron updates</b> — thik tab jab system pehle se pareshan hai.</li>\n       <li>Ek update khoya toh copy <b>galat reh sakti hai</b>. Khoye update wale check ka agla successful update state mila sakta hai; check dobara na badle aur repair na ho, toh galti bani rehti hai.</li>\n     </ul>\n     <p><b>Route 53 health checks</b> coffee machine hain: har kuch second ek service <b>har</b> health check ki\n     <b>poori</b> state ek <b>fixed-size</b> file mein S3 par likhti hai; har DNS server poori file le jaata hai.\n     Is bounded-state example mein 0 ya1,00,000 changes par scheduled full-state transfer ka budget same rakha hai. Lost delta valid newer authoritative snapshot se repair ho sakti hai; corrupt source/config or missing delivery alag problem hain.</p>\n     <pre>lab 20 (10,000 checks, t=4 par 10,000 ek saath badle):\ndelta     peak 9,772 msgs/sec per DNS server   drift (1% messages khoye): storm ke baad ~108\nconstant  hamesha 1 msg (10 KB)/sec             drift: 0</pre>\n     <p class=\"tip\">🎯 <b>Jo cheez fail nahi honi chahiye, us cheez ka kaam predictable rakho.</b> Sabse bura din =\n     sabse shaant din.</p>",
    `<h3>🌪️ EBS, 21 April 2011, us-east-1</h3>
     <p>Ek routine network change ne EBS ka replication traffic ek kam-capacity backup network par bhej diya.
     Volumes ne apne replicas kho diye. Network wapas aaya toh sab volumes ne ek saath <b>re-mirror</b> shuru
     kiya — aur sab ek hi <b>shared control-plane DB</b> se poochh rahe the ki replicas kahan hain. DB gir gaya,
     recovery ruk gayi, dinon tak.</p>
     <p>Structural sabak: sab volumes ke metadata ke liye <b>ek</b> DB = ek saajhi girne ki jagah, jo growth ke
     saath aur buri hoti hai. Ilaaj bada DB nahi, <b>Physalia</b> ("Millions of Tiny Databases", NSDI 2020):
     <b>har volume ka apna chhota 7-node Paxos cell</b>, us volume ke client aur replicas ke paas (physically
     aur network topology mein). CP system (partition mein consistency pehle), aur availability chhotepan +
     paas hone se wapas jeeti.</p>
     <pre>lab 20 (ex4) — 1,500 volumes, AZ-A mein 300 ka re-mirror storm, kul DB capacity dono mein same:
shared DB    storm ke dauraan: AZ-A 56%, AZ-B 58%, AZ-C 55%   ← jin AZs ka kuch nahi bigda, un AZs ko bhi dard
cells        storm ke dauraan: AZ-A 32%, AZ-B 100%, AZ-C 100% ← dard sirf usi AZ mein jahan aag lagi</pre>
     <p>Cells mein AZ-A ko zyada dard — use sirf apne hisse ki capacity mili. Yahi trade-off hai: blast radius
     ek <b>jaana-pehchaana number</b>, poora region nahi.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — delta vs constant work',
      project: '20-aws',
      exercise: 'ex1-constant-work',
      goal: '10,000 health checks, t=4 par sab ek saath badle, 1% messages raaste mein kho jaate hain — har DNS server ka kaam aur drift dekho.',
      why: `<code>services/checks.js</code> sach rakhta hai. <code>SYNC=delta</code> har badlaav ek message; <code>SYNC=constant</code>
        har sec poori 10,000-byte file "S3" mein, DNS servers poori file le jaate hain.`,
      steps: [
        { text: 'Checks + 3 DNS servers chalao.', cmd: 'cd docker-labs/20-aws && npm start ex1-constant-work', expect: 'ex1-constant-work\n[checks] :4921 — 10000 health checks, SYNC=delta, DROP=0.01' },
        { text: 'Delta sync.', cmd: 'node tools/storm.js --sync delta', expect: '   4    10020       9772 msgs    180 KB         290   ← storm\n   5       10        156 msgs      3 KB         108\n  14       10         10 msgs      0 KB         109\npeak kaam: 9772 msgs/sec, 180 KB/sec per DNS server' },
        { text: 'Constant work.', cmd: 'node tools/storm.js --sync constant', expect: '   4    10010          1 msgs     10 KB           0   ← storm\n  14       10          1 msgs     10 KB           0\npeak kaam: 1 msgs/sec, 10 KB/sec per DNS server' },
      ],
      observe: {
        q: 'Delta mein storm ke baad bhi drift ~108 kyun bacha?',
        choices: [
          '1% deltas kho gaye aur koi repair nahi — check dobara na badle toh DNS galat jawab deta rahega',
          'Har replica aakhir mein khud missing update bana leta hai — 108 bas der se theek honge',
          'Storm khatam hote hi sab theek ho jaana chahiye tha — 108 lab ki ginti ki galti hai',
          'DNS ka TTL source ki values khud dobara bana leta hai — 108 jaldi gayab ho jaayenge',
        ],
        answer: 0,
        explain: 'Delta mode mein 1% messages kho gaye aur koi repair snapshot nahi chalta. Jis check ka update khoya aur baad mein dobara nahi badla, DNS par us check ki value galat bani rahi. Constant mode har second poori file deta hai, isliye drift 0.',
        choiceExplanations: [
          'Delta mode mein 1% messages kho gaye aur koi repair snapshot nahi chalta. Jis check ka update khoya aur baad mein dobara nahi badla, DNS par us check ki value galat bani rahi. Constant mode har second poori file deta hai, isliye drift 0.',
          'Replica khoya update khud nahi bana sakta.',
          'Storm ruka, par khoye messages wapas nahi aaye.',
          'TTL sirf cache ki umar hai — source value nahi banata.',
        ],
      },
      lesson: 'Delta sync mein galti yaad reh jaati hai; constant work mein har cycle ek naya, poora sach.',
    },
    {
      type: 'docker',
      title: '🐳 Lab — ek bada DB vs chhote cells',
      project: '20-aws',
      exercise: 'ex4-tiny-dbs',
      goal: 'Same kul capacity — ek shared metadata DB vs 12 chhote per-AZ cells. AZ-A mein re-mirror storm ke dauraan har AZ ki normal queries.',
      why: `<code>services/meta.js</code>: query 10 ms, 12 slots (shared: ek DB; cells: 12 DBs × 1 slot). Storm: 300 volumes
        "jagah do" poochhte hain, AZ-A mein sirf 30 jagah/sec, baaki 20 ms baad phir.`,
      steps: [
        { text: 'Metadata service chalao.', cmd: 'cd docker-labs/20-aws && npm start ex4-tiny-dbs', expect: 'ex4-tiny-dbs\n[meta] :4951 MODE=shared' },
        { text: 'Dono modes mein storm.', cmd: 'node tools/remirror.js', expect: 'storm ke dauraan (sec 4–13): AZ-A 56%, AZ-B 58%, AZ-C 55%  |  re-mirror 300/300 poore, aakhri 9.1 s mein\n…\nstorm ke dauraan (sec 4–13): AZ-A 32%, AZ-B 100%, AZ-C 100%  |  re-mirror 300/300 poore, aakhri 8.5 s mein' },
      ],
      observe: {
        q: 'Cells mein AZ-A ki normal queries 56% → 32% kharab hui. Phir bhi cells behtar kyun?',
        choices: [
          'Dard sirf AZ-A cell mein — AZ-B aur AZ-C 100%; blast radius ek jaana-pehchaana number',
          'Cells ne extra physical capacity bana di, isliye kul kaam ka bojh kam ho gaya',
          'Cells mein ek cell ka girna namumkin ho gaya — isliye AZ-A bhi bach gaya',
          'Ek cell ki saari requests ki tez hone ki guarantee hai, chahe cell bimaar ho',
        ],
        answer: 0,
        explain: 'Kul capacity same thi. Cells ne dukh ko baanta nahi, simit kiya.',
        choiceExplanations: [
          'Kul capacity same thi. Cells ne dukh ko baanta nahi, simit kiya.',
          'Capacity same thi — cells ne nayi machines nahi banayi.',
          'AZ-A ka cell 32% kharab hua — girna mumkin hai.',
          'AZ-A ki queries kharab hui — guarantee nahi.',
        ],
      },
      lesson: '"Guaranteed bottleneck" ko chhote tukdon mein todo aur har tukda kaam ke asli maalik ke paas rakho.',
    },
  ],
  interview: {
    title: 'Interview Round — control plane design',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "10,000 edge servers ko config push karni hai. Delta ya full?"',
        choices: [
          'Bounded snapshots, versioned pull — har cycle poori fixed config, servers khud le jaayein',
          'Sirf deltas bhejo — kam bytes, aur khoye delta ke liye repair snapshot ki zaroorat nahi',
          'Har badlaav par turant sabko global push — budget ki fikar nahi, jaldi pahunchna zaroori',
          'Bina hadd ki full files bhejo — file badi ho ya chhoti, poori file hamesha constant work',
        ],
        answer: 0,
        explain: 'Bounded control state ko tay cadence par version/checksum ke saath milana update storms ka kaam predictable rakhta hai. Bura din = shaant din, aur drift apne aap theek. Full snapshot har jagah best nahi; state size, bandwidth aur freshness tolo.',
        choiceExplanations: [
          'Bounded control state ko tay cadence par version/checksum ke saath milana update storms ka kaam predictable rakhta hai. Bura din = shaant din, aur drift apne aap theek. Full snapshot har jagah best nahi; state size, bandwidth aur freshness tolo.',
          'Khoya delta copy ko galat chhod sakta hai. Baad ka update galti zaroor sudhaarega, aisa bharosa nahi; isliye repair ka raasta rakho.',
          'Storm ke din global push sabse bada bojh banta hai.',
          'Constant work tabhi constant hai jab size bounded ho.',
        ],
      },
      {
        q: 'Interviewer: "Metadata DB overload ho raha hai. Bada instance le lein?"',
        choices: [
          'Pehle poochho kya DB sabka saajha girne ka point hai — haan toh chhote cells mein todo',
          'Hamesha ke liye bada metadata DB lo — har baar overload par instance aur bada',
          'Cache laga do — cache invalidation ki zaroorat nahi, metadata kabhi nahi badalta',
          'Har write problem ke liye read replicas jodo — replicas writes bhi baant lenge',
        ],
        answer: 0,
        explain: 'EBS 2011 ka sabak: bada DB wahi bimari bada kar deta hai. Cells per tenant/volume/AZ, data apne cell ke paas.',
        choiceExplanations: [
          'EBS 2011 ka sabak: bada DB wahi bimari bada kar deta hai. Cells per tenant/volume/AZ, data apne cell ke paas.',
          'Bada DB saajha point bana rehta hai — girega toh sab girenge.',
          'Metadata badalta hai — invalidation zaroori hai.',
          'Read replicas writes nahi baant-te.',
        ],
      },
    ],
  },
  success: [
    'Main delta sync aur constant work ka trade-off lab ke numbers se samjha sakta hoon',
    'Main EBS 2011 ki kahani aur Physalia ka jawab bata sakta hoon',
    'Main shared bottleneck ko cells mein todne ka design de sakta hoon',
  ],
  homework: `<p>Apne system mein ek "barista" dhoondho — koi cheez jo sirf badlaav par kaam karti hai (config push,
    cache invalidation, feature flags). Likho: bure din barista ka kaam kitna badhta hai, aur ek message kho jaaye toh
    kya hota hai? Kya barista ko "har N second poori state" mein badal sakte ho?</p>`,
  cards: [
    { front: 'Constant work?', back: "Bounded state ko version/checksum ke saath, har kuch der mein poore snapshot se milao. Kho gaya update agla sahi, naya, pakka snapshot theek kar deta hai; par kharab source ya na pahuncha snapshot nahi. Route53 wala course example ek purana bounded design hai." },
    { front: 'EBS 2011 root cause?', back: 'Network change → replicas chhoote → sab volumes ne ek saath re-mirror → sab ek shared control-plane DB se poochh rahe the → DB gira → dinon ka recovery.' },
    { front: 'Physalia?', back: 'Har EBS volume ka apna chhota 7-node Paxos cell, volume ke paas. Ek bada saajha DB ki jagah laakhon chhote — blast radius ek volume.' },
  ],
},

/* =====================================================================
   4. aws-proofs
   ===================================================================== */
{
  id: 'aws-proofs',
  icon: '📐',
  title: 'Testing kaafi nahi — proof karo',
  badge: 'Proof Pandit',
  objectives: [
    'Testing ek sample hai — scale par rare raaste roz chalte hain',
    'TLA+ model checking: har reachable state',
    'Zelkova: policy ko math banao',
    'Poore AWS ke sabak ek jagah',
  ],
  lesson: [
    "<h3>🎯 Testing = kuch raaste chala ke dekhna</h3>\n     <p>Tests kuch raaste chalate hain. Scale par 1-in-a-billion raasta ek aam dopahar ko chal jaata hai — aur\n     ye raasta tumhare test mein kabhi nahi tha.</p>\n     <h3>📐 TLA+ — har mumkin haalat</h3>\n     <p>TLA+ mein system ka <b>design</b> (code nahi) likhte hain — states aur transitions — aur model checker\n     <b>specified bounded model ki reachable states</b> explore karta hai, jab search successfully complete ho. AWS ne DynamoDB replication mein aisa bug pakda jiska sabse\n     chhota failing trace <b>35 kadam</b> ka tha. Random tests kuch aise bugs pakad sakte hain, par rare interleavings ki coverage establish karna mushkil hai.</p>\n     <h3>🔏 Zelkova — \"kya KOI bhi request?\"</h3>\n     <p>IAM/S3 policy ko math ke formula mein badlo, phir SMT solver (theorem prover) se poochho: <b>\"kya koi\n     bhi request is bucket ko public bana sakti hai?\"</b> Jawab \"haan\" ho toh solver misaal bhi deta hai. Yahi\n     IAM Access Analyzer, S3 Block Public Access aur console ke \"Public\" badge ke peeche hai.</p>\n     <p class=\"tip\">🎯 Test poochhta hai \"ye request kya karti hai?\". Proof poochhta hai \"<b>koi bhi</b> request\n     kya kar sakti hai?\"</p>",
    `<h3>🧵 Ek VM launch — poori kahani ek saath (video)</h3>
     <pre>shuffle-sharded control plane  → ek kharab customer sabko nahi gira sakta
Nitro-verified host            → boot se pehle firmware jaancha, koi SSH nahi
SRD multipath network          → ek link mara, 1/64 capacity
Physalia cell                  → volume ka metadata apne chhote cell mein
constant-work health checks    → bura din = shaant din
Zelkova-proved bucket policy   → "public?" ka math wala jawab
…aur beech mein kisi ne login nahi kiya</pre>
     <h3>📋 Saath sabak</h3>
     <ol>
       <li>Chhote kharche × crore machines — fleet se guna karo.</li>
       <li>Aise systems mat banao jinhe badhne ke liye insaan badhane padein.</li>
       <li>Bahut saare chhote, alag > ek bada, saajha.</li>
       <li>Technology ke peeche ki maanyataein poochho (TCP).</li>
       <li>Customers ko alag karo — shuffle sharding: hardware nahi, <b>assignment</b>.</li>
       <li>Jo fail nahi hona chahiye → predictable kaam (constant work).</li>
       <li>Testing ki seema hai → prove karo.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Test kaafi ya proof chahiye?',
      instructions: 'Kis sawaal ka jawab sirf "sab raaste" dekhne wala tool de sakta hai?',
      bins: [
        { id: 'test', label: '🧪 Test kaafi' },
        { id: 'proof', label: '📐 Proof / model checking chahiye' },
      ],
      items: [
        { text: '"Kya KOI bhi request is S3 bucket ko public padh sakti hai?"', bin: 'proof', explain: '"Koi bhi" = saari mumkin requests — Zelkova ka kaam.' },
        { text: '"Login page par galat password se error aata hai?"', bin: 'test', explain: 'Ek khaas raasta — test kaafi.' },
        { text: '"Replication protocol mein kabhi do leaders ek saath commit kar sakte hain?"', bin: 'proof', explain: "Specified model ki interleavings explore karo; bounds, liveness/fairness aur implementation mapping explicitly check karo." },
        { text: '"Is API ka response 200 ms se kam?"', bin: 'test', explain: 'Measurement/benchmark ka sawaal.' },
        { text: '"Kisi bhi crash order ke baad ledger ka total sahi rehta hai?"', bin: 'proof', explain: 'Crash kisi bhi kadam par — saari states dekhni padengi.' },
        { text: '"Naya button mobile par dikhta hai?"', bin: 'test', explain: 'UI test.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Proof ki samajh',
      questions: [
        {
          q: 'DynamoDB ka bug 35 kadam lamba trace tha. 35 kadam se kya pata chalta hai?',
          choices: [
            'Kuch bugs sirf khaas lambe order mein dikhte — random tests shayad hi pakdein, scale par chalega',
            'Random tests aise bugs ganit ke hisaab se kabhi pakad hi nahi sakte — bilkul namumkin hai',
            'TLA+ ka trace saabit karta hai ki bug production ke code mein pakka maujood hai',
            'Koi chhota test bhi poori correctness saabit kar deta hai — 35 kadam bekaar the',
          ],
          answer: 0,
          explain: 'Isliye design level par model checking — code se pehle.',
          choiceExplanations: [
            'Isliye design level par model checking — code se pehle.',
            'Namumkin nahi — bas bahut kam sambhavna.',
            'Model ka trace design ka bug dikhata hai; code mein hai ya nahi, alag se jaancho.',
            'Chhota test lambe order wala bug nahi dekhta.',
          ],
        },
        {
          q: 'Zelkova kis sawaal ka jawab deta hai jo test nahi de sakta?',
          choices: [
            '"Kya koi bhi request ye kar sakti hai?" — model ki gayi saari requests par, ganit se',
            '"Kya request abhi tez hai?" — policy ka response time naapna Zelkova ka kaam',
            '"Kya policy ka JSON valid hai?" — sirf grammar ki jaanch hi Zelkova karta hai',
            '"Kitne users ne bucket padha?" — purane access ki ginti hi Zelkova batata hai',
          ],
          answer: 0,
          explain: 'Automated reasoning policy ke matlab aur model kiye gaye request space par possible access dekhti hai. Identity setup, resource config aur bina model kiya vyavhaar alag se jaancho.',
          choiceExplanations: [
            'Automated reasoning policy ke matlab aur model kiye gaye request space par possible access dekhti hai. Identity setup, resource config aur bina model kiya vyavhaar alag se jaancho.',
            'Speed Zelkova ka sawaal nahi.',
            'JSON check koi bhi parser kar deta hai.',
            'Purane logs "kya ho sakta hai" nahi batate.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — correctness at scale',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Naya consensus-based replication protocol likh rahe hain. Sirf tests kaafi?"',
        choices: [
          'Model checking (TLA+) design par, phir implementation ke tests aur chaos',
          '100% line coverage kaafi hai — har line chali toh har mumkin interleaving bhi chal gayi',
          'Code review kaafi hai — achhe reviewers protocol ko saabit kar dete hain',
          'Production incidents hi testing hain — production mein dekh lenge kya tootta hai',
        ],
        answer: 0,
        explain: 'Model checking tay state/failure space mein counterexamples dhoondhti hai. Asli implementation, environment ki maan-ne wali baatein aur performance ke liye tests, review aur controlled fault injection bhi chahiye.',
        choiceExplanations: [
          'Model checking tay state/failure space mein counterexamples dhoondhti hai. Asli implementation, environment ki maan-ne wali baatein aur performance ke liye tests, review aur controlled fault injection bhi chahiye.',
          'Har line chalna har order chalna nahi hai.',
          'Review rare interleavings nahi pakadta.',
          'Production mein bug users ka data kha sakta hai.',
        ],
      },
      {
        q: 'Interviewer: "Hamare 5,000 S3 buckets mein koi public toh nahi?"',
        choices: [
          'Policies ko automated reasoning se jaancho (IAM Access Analyzer, Block Public Access)',
          'Har bucket ko ek anonymous GET bhejo — GET fail hua toh bucket pakka private',
          'Bucket ke naam mein "public" dhoondho — naam mein nahi toh bucket private',
          'Team se poochh lo — team ne kaha sab private, toh saboot ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Ek request test karna ek raasta hai; policy mein aur raaste ho sakte hain. Manual review 5,000 buckets par scale nahi karta.',
        choiceExplanations: [
          'Ek request test karna ek raasta hai; policy mein aur raaste ho sakte hain. Manual review 5,000 buckets par scale nahi karta.',
          'Ek GET doosre raaste (list, PUT, doosre principals) nahi jaanchta.',
          'Naam se permission tay nahi hoti.',
          'Bina saboot ka bharosa audit nahi hai.',
        ],
      },
    ],
  },
  success: [
    'Main test aur proof ka farq "ye request" vs "koi bhi request" se samjha sakta hoon',
    'Main TLA+ aur Zelkova ka kaam bata sakta hoon',
    'Main AWS ke saath sabak ek VM launch ki kahani mein jod sakta hoon',
  ],
  homework: `<p>Apne system ka ek invariant likho jo kabhi toot-na nahi chahiye ("ek order do baar charge nahi hoga",
    "koi bucket public nahi"). Phir likho: abhi use kaun check karta hai — test, review, ya kuch nahi? Aur
    kya "saari mumkin haalaton" par check karne ka koi tareeka hai?</p>`,
  cards: [
    { front: 'TLA+ model checking?', back: "Design ko states aur transitions mein likho; ek seemit, configured model ki poori search pahunch sakne wali har state dekh leti hai. Bina seema wala system ya asli source code apne aap prove nahi hota. DynamoDB replication bug: sabse chhota failing trace 35 kadam." },
    { front: 'Zelkova?', back: 'Supported IAM/S3 policy semantics ka solver analysis possible access classify karta hai. Identity/configuration context aur unmodeled behavior separately verify karo; solver answer complete system proof nahi.' },
    { front: 'Test vs proof?', back: 'Test: "ye request kya karti hai?" Proof: "koi bhi request kya kar sakti hai?" Scale par rare raaste roz chalte hain.' },
  ],
},
]);

})();
