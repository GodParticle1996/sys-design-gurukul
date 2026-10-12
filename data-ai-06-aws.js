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
          Ek message khoya → hamesha ke liye galat. Lab: storm par 9,772 msgs/sec, drift 108 hamesha.</div></div>
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
  html: `
    <div class="dg-grid">
      <div class="dg-node is-gold"><span class="ni">🧪</span><span class="nl">Testing</span><span class="ns">kuch raaste chala ke dekhe. Scale par 1-in-a-billion raasta ek aam dopahar ko chalta hai</span></div>
      <div class="dg-node is-good"><span class="ni">📐</span><span class="nl">TLA+ model checking</span><span class="ns">har reachable state dekhta hai — DynamoDB replication bug, sabse chhota failing trace 35 kadam</span></div>
      <div class="dg-node is-good"><span class="ni">🔏</span><span class="nl">Zelkova</span><span class="ns">IAM/S3 policy → math → SMT solver: "kya KOI bhi request is bucket ko public bana sakti hai?"</span></div>
    </div>
    <div class="dg-cap">Zelkova hi IAM Access Analyzer, S3 Block Public Access aur console ke "Public" badge ke peeche hai.</div>`,
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
    `<h3>🛒 Yeh aam shopping list nahi</h3>
     <p>Amazon ka capex ~$200B saal (roz $0.5B se zyada), zyadatar AWS. 2016 mein James Hamilton ne kaha
     tha: AWS har din itni capacity jodta hai jitni 2004 ke poore Amazon (ek $7B company) ko chalane ke
     liye chahiye thi. Aur yeh servers "khareedna" nahi — apne servers, apne CPUs (Graviton), apne routers,
     apna fiber aur undersea cables mein hissa, data center ke andar apna transport (TCP nahi).</p>
     <p>Kyun? Vendor ka saamaan hazaron machines ke liye bana hai. <b>Laakhon</b> par jo kharche aur failure
     rates dikhte nahi the, woh bahut bade ho jaate hain → khud banana sasta.</p>
     <p class="tip">Ek mithak bhi: "AWS retail ke khaali servers kiraye par dene se bana" — galat. Holiday peak
     par woh servers wapas chahiye hote. Asli wajah: andar ki takleef, har team infra dobara bana rahi thi;
     Bezos ka mandate — mazboot internal services; phir woh hunar bech diya.</p>
     <h3>🎲 Failure ek RATE hai</h3>
     <p>Ek machine par 1-in-a-million/din wali galti shayad kabhi na dikhe. 10 lakh machines par wahi galti
     <b>roz</b> hoti hai. Werner Vogels: <b>"Everything fails all the time."</b> Design ka sawaal "kya yeh
     fail hoga?" nahi, "yeh roz kitni baar fail hoga, aur tab kya?"</p>`,
    `<h3>🖥️ Nitro — overhead ko CPU se hatao</h3>
     <p>Pehle dashak AWS Xen hypervisor chalata tha — virtual networking, storage emulation, management, sab
     customer ke CPU par. Yeh overhead × crore machines = <b>poore data centers</b> sirf Xen chala rahe the.</p>
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
          lesson: 'Roz 27 disks — yeh incident nahi, ek routine hai. Isliye replacement aur repair automatic hone chahiye.',
        },
        {
          q: 'Hypervisor har machine ka 10% CPU khata hai. 20 lakh machines par kitni machines ka CPU sirf hypervisor par?',
          unit: 'machines', given: ['10% overhead', '20,00,000 machines'],
          answer: 200000, tol: 0.3,
          steps: ['20,00,000 × 0.10 = 2,00,000', 'Poore data centers jitna — yahi Nitro ki wajah'],
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
            'Agar har problem par insaan ko login karna pade, ops team fleet ke saath badhegi — woh bottleneck ban jaata hai. Tay APIs automate ho sakte hain',
            'SSH dheema hai',
            'SSH mehenga hai',
            'Koi scaling faayda nahi, sirf security',
          ],
          answer: 0,
          explain: 'Video ka sabak: aise systems mat banao jinhe badhne ke liye insaan badhane padein.',
        },
        {
          q: '"AWS retail ke khaali servers kiraye se bana" — yeh galat kyun?',
          choices: [
            'Holiday peak par retail ko woh servers wapas chahiye hote — asli wajah andar ki takleef aur mazboot internal services ka hunar tha',
            'Kyunki retail ke paas servers nahi the',
            'Kyunki AWS pehle bana, retail baad mein',
            'Kyunki servers purane the',
          ],
          answer: 0,
          explain: 'Achha mithak, par economics ulta hai.',
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
          'Failure ko rate maan ke design: automatic detection, replacement, repair; har operational kaam ek tay, authenticated API; SSH ek emergency raasta, aadat nahi',
          '10× zyada ops engineers',
          'Behtar hardware jo fail na ho',
          'Har machine par monitoring agent aur on-call',
        ],
        answer: 0,
        explain: 'Ops ko fleet ke saath linearly mat badhne do.',
      },
      {
        q: 'Interviewer: "Khud hardware banana kab samajhdaari hai?"',
        choices: [
          'Jab scale itna bada ho ki vendor ke chhupe kharche (overhead %, failure modes) × fleet, khud banane ki keemat se zyada ho jaayein — aur problem tumhare liye khaas ho',
          'Hamesha',
          'Kabhi nahi',
          'Jab team badi ho',
        ],
        answer: 0,
        explain: 'Dropbox (storage) aur AWS (Nitro) — dono ne yahi hisaab lagaya.',
      },
    ],
  },
  success: [
    'Main failure ko rate ki tarah soch ke design kar sakta hoon',
    'Main scale par chhote kharchon ka hisaab laga sakta hoon',
    'Main no-SSH ops ka security aur scaling tark de sakta hoon',
  ],
  homework: `<p>Apne system ka ek "kabhi-kabhi" wala failure lo (disk bhari, cert expire, process OOM). Uska rate
    nikaalo (mahine mein kitni baar per machine) aur fleet size se guna karo. Agar jawab "hafte mein kai baar"
    aaye toh woh incident nahi, automation ka kaam hai.</p>`,
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
    '"Jab yeh fail hoga toh failure kaisa dikhega?" — Hamilton ka sawaal',
    'Single-chip switches aur Clos fabric',
    'TCP ki teen maanyataein data center mein kyun galat',
    'SRD: multipath, no ordering, µs retransmit — lab mein tail latency',
  ],
  lesson: [
    `<h3>🔧 "Kitne failures hamare hain?"</h3>
     <p>James Hamilton ka sawaal: <b>jab yeh fail hoga, failure kaisa dikhega, aur uske kitne hisse hamare
     control mein hain?</b> Bade chassis routers (Cisco/Juniper) sophisticated tareeke se fail hote hain —
     diagnose karne mein hafta. 10 routers ke liye theek, hazaron ke liye nahi.</p>
     <p>AWS ke routers: <b>ek commodity switching chip</b>, kam features, jo simple tareeke se fail ho —
     "chal raha hai ya mara hua". Aur unhe <b>Clos fabric</b> mein lagao: ek jaise switches ki layers, beech
     mein bahut saare barabar raaste; badhna ho toh aur boxes jodo. Upar se apna global backbone aur undersea
     cables mein hissa → regions ke beech traffic public internet par nahi.</p>
     <h3>🚗 TCP ki teen maanyataein</h3>
     <table>
       <tr><th>TCP maanta hai</th><th>Data center ki haqeeqat</th></tr>
       <tr><td>Ek raasta</td><td>Hazaron raaste khaali pade hain</td></tr>
       <tr><td>Order mein delivery (ek ruka toh sab ruke)</td><td>Head-of-line blocking tail latency khaata hai</td></tr>
       <tr><td>Loss recovery ms mein</td><td>RTT µs mein — recovery delivery se ~8,000× lamba</td></tr>
     </table>`,
    `<h3>🌊 SRD — Scalable Reliable Datagram</h3>
     <p>Ek flow ko <b>64 raaston</b> par bikher do. Order ki parwah mat karo — upar wali layer packets jod legi.
     Khoya packet <b>microseconds</b> mein kisi dusre raaste se dobara. Congestion control sirf Amazon ke apne
     network ke liye tuned. Ek link mara = 1/64 capacity kam, aur baaki 63 par µs mein retransmit.</p>
     <h3>📏 Lab 20 (ex3) — 1,000 flows × 1 MB, 64 raaste, raasta #0 kharab</h3>
     <pre>kharabi             protocol    p50        p99        max
sab theek           TCP         89 µs      89 µs      89 µs
1 raasta 1% loss    TCP         89 µs      1.09 ms    3.09 ms
1 raasta 1% loss    SRD         89 µs      110 µs     110 µs
1 raasta dead 20ms  TCP         89 µs      31.09 ms   31.09 ms
1 raasta dead 20ms  SRD         110 µs     110 µs     110 µs</pre>
     <p>p50 dono ka <b>same</b>. Farq sirf unlucky flows mein: TCP ka flow ek raaste par hash hota hai (ECMP) →
     1/64 flows kharab raaste par → ms tak ruke. SRD mein har flow ka thoda hissa kharab raaste par → sab ~20 µs
     dheeme, koi ms tak nahi. (Model ki assumptions tool ke upar likhi hain; Linux ka default RTO min 200 ms
     lagao toh TCP p99 200 ms.)</p>
     <p class="tip">🎯 Kisi bhi technology ke peeche ki <b>maanyataein</b> poochho. TCP internet ke liye bana
     tha; data center ki physics alag hai.</p>`,
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
          'Tail ke liye — 1/64 unlucky flows jo kharab raaste par hash hue, woh ms (ya 200 ms) tak ruke. Badi training/storage mein sabse dheema flow hi poore kaam ki speed tay karta hai',
          'p50 behtar karne ke liye',
          'Bandwidth badhane ke liye',
          'Encryption ke liye',
        ],
        answer: 0,
        explain: 'Fan-out wale kaam mein (ek step = hazaron flows) p99 hi asli latency hai.',
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
        { left: '🌍 Regions ke beech public internet', right: 'Apna global backbone + undersea cables mein hissa', explain: 'Jo raasta tumhara nahi, uske failure bhi tumhare nahi — control ke bahar.' },
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
          'Unlucky flows — ECMP hash se kharab/congested link par gaye flows aur TCP ka HOL blocking + RTO; multipath spraying / RTO tuning / flow-level load balancing',
          'Average bandwidth badhao',
          'Packets bade karo',
          'Compression lagao',
        ],
        answer: 0,
        explain: 'Tail ki wajah aksar ek chhota hissa hota hai — aur fan-out use poora kaam bana deta hai.',
      },
      {
        q: 'Interviewer: "Feature-rich router ya simple switch?"',
        choices: [
          'Scale par simple — failure modes kam aur predictable; features upar software mein; redundancy fabric (bahut raaste) se',
          'Hamesha feature-rich',
          'Jo sasta ho',
          'Jo vendor recommend kare',
        ],
        answer: 0,
        explain: 'Hamilton ka sawaal: failure kaisa dikhega aur kitna hamara control mein?',
      },
    ],
  },
  success: [
    'Main Hamilton ka "failure kaisa dikhega" sawaal kisi bhi component par laga sakta hoon',
    'Main TCP ki maanyataein aur SRD ke jawab samjha sakta hoon',
    'Main lab se dikha sakta hoon ki multipath tail latency kaise bachata hai',
  ],
  homework: `<p>Apne system ki koi ek purani maanyata dhoondho jo naye environment mein galat ho sakti hai
    (jaise "network reliable hai", "clock sahi hai", "disk tez hai"). Likho: yeh maanyata kahan se aayi, aur
    tumhare environment mein iski jagah kya sach hai?</p>`,
  cards: [
    { front: 'Hamilton ka network sawaal?', back: '"Jab yeh fail hoga, failure kaisa dikhega, aur kitna hamare control mein?" → simple single-chip switches + Clos fabric.' },
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
    'Delta sync ki do bimaariyan: bure din zyada kaam, khoya message = hamesha drift',
    'Constant work: Route 53 health checks',
    'EBS 2011: re-mirroring storm aur ek shared metadata DB',
    'Physalia: har volume ka apna chhota database',
  ],
  lesson: [
    `<h3>☕ Barista vs coffee machine</h3>
     <p>Barista: order aaya toh banaya, nahi toh baitha. Shaant din aaram, rush hour mein pagal. Coffee machine:
     har minute ek cup, chahe koi pee ya na pee. "Wasteful" — par rush hour mein bhi wahi kaam.</p>
     <p><b>Delta sync</b> barista hai: sirf badlaav bhejo. Do bimaariyan:</p>
     <ul>
       <li>Shaant din kuch kaam nahi, <b>bure din hazaron updates</b> — thik tab jab system pehle se pareshan hai.</li>
       <li>Ek update khoya → <b>hamesha ke liye drift</b>. Koi dobara nahi bhejta.</li>
     </ul>
     <p><b>Route 53 health checks</b> coffee machine hain: har kuch second ek service <b>har</b> health check ki
     <b>poori</b> state ek <b>fixed-size</b> file mein S3 par likhti hai; har DNS server poori file le jaata hai.
     0 badlaav ho ya 1,00,000 — same kaam. Kuch galat ya chhoot gaya? Agli file sab overwrite kar deti hai.</p>
     <pre>lab 20 (10,000 checks, t=4 par 10,000 ek saath badle):
delta     peak 9,772 msgs/sec per DNS server   drift (1% messages khoye): ~108 hamesha
constant  hamesha 1 msg (10 KB)/sec             drift: 0</pre>
     <p class="tip">🎯 <b>Jo cheez fail nahi honi chahiye, uska kaam predictable rakho.</b> Sabse bura din =
     sabse shaant din.</p>`,
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
shared DB    storm ke dauraan: AZ-A 56%, AZ-B 58%, AZ-C 55%   ← jinka kuch nahi bigda, woh bhi dukhi
cells        storm ke dauraan: AZ-A 32%, AZ-B 100%, AZ-C 100% ← dard sirf wahan jahan aag lagi</pre>
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
        q: 'Delta mein storm ke baad drift ~108 hamesha kyun reh gaya?',
        choices: [
          '1% messages khoye aur koi unhe dobara nahi bhejta — jab tak woh check phir se na badle, DNS server galat jawab deta rahega',
          'DNS server slow tha',
          'Storm abhi chal raha hai',
          'Checks galat the',
        ],
        answer: 0,
        explain: 'Constant work mein har file poori state hai — koi bhi galti agli file mein apne aap theek.',
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
          'Dard sirf wahan jahan aag lagi — AZ-B aur AZ-C 100%. Blast radius ek jaana-pehchaana number ban gaya, poora region nahi',
          'Cells tez hain',
          'Cells mein capacity zyada hai',
          'AZ-A ka data kam tha',
        ],
        answer: 0,
        explain: 'Kul capacity same thi. Cells ne dukh ko baanta nahi, simit kiya.',
      },
      lesson: '"Guaranteed bottleneck" ko chhote tukdon mein todo aur jiska kaam hai uske paas rakho.',
    },
  ],
  interview: {
    title: 'Interview Round — control plane design',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "10,000 edge servers ko config push karni hai. Delta ya full?"',
        choices: [
          'Jo cheez fail nahi honi chahiye uske liye constant work — har cycle poori fixed-size config, servers khud le jaayein; bura din = shaant din, aur drift apne aap theek',
          'Delta, kyunki kam bytes',
          'Har badlaav par sabko push',
          'Raat ko ek baar',
        ],
        answer: 0,
        explain: 'Kam bytes aur predictable kaam mein se, control plane ke liye predictable jeetta hai.',
      },
      {
        q: 'Interviewer: "Metadata DB overload ho raha hai. Bada instance le lein?"',
        choices: [
          'Pehle poochho kya yeh sabka saajha girne ka point hai — agar haan, toh chhote cells mein todo (per tenant/volume/AZ), jiska data uske paas',
          'Haan, bada instance',
          'Cache laga do',
          'Read replicas',
        ],
        answer: 0,
        explain: 'EBS 2011 ka sabak: bada DB wahi bimari bada kar deta hai.',
      },
    ],
  },
  success: [
    'Main delta sync aur constant work ka trade-off lab ke numbers se samjha sakta hoon',
    'Main EBS 2011 ki kahani aur Physalia ka jawab bata sakta hoon',
    'Main shared bottleneck ko cells mein todne ka design de sakta hoon',
  ],
  homework: `<p>Apne system mein ek "barista" dhoondho — koi cheez jo sirf badlaav par kaam karti hai (config push,
    cache invalidation, feature flags). Likho: bure din uska kaam kitna badhta hai, aur ek message kho jaaye toh
    kya hota hai? Kya use "har N second poori state" mein badal sakte ho?</p>`,
  cards: [
    { front: 'Constant work?', back: 'Har cycle poori state ek fixed-size file mein; consumers poori file lete hain. 0 ya 1 lakh badlaav — same kaam; galti agli file mein theek. (Route 53 health checks)' },
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
    `<h3>🎯 Testing = kuch raaste chala ke dekhna</h3>
     <p>Tests kuch raaste chalate hain. Scale par 1-in-a-billion raasta ek aam dopahar ko chal jaata hai — aur
     woh raasta tumhare test mein kabhi nahi tha.</p>
     <h3>📐 TLA+ — har mumkin haalat</h3>
     <p>TLA+ mein system ka <b>design</b> (code nahi) likhte hain — states aur transitions — aur model checker
     <b>har reachable state</b> dekhta hai. AWS ne DynamoDB replication mein aisa bug pakda jiska sabse
     chhota failing trace <b>35 kadam</b> ka tha. Koi insaan ya random test 35 kadam ka woh khaas order nahi
     dhoondhta.</p>
     <h3>🔏 Zelkova — "kya KOI bhi request?"</h3>
     <p>IAM/S3 policy ko math ke formula mein badlo, phir SMT solver (theorem prover) se poochho: <b>"kya koi
     bhi request is bucket ko public bana sakti hai?"</b> Jawab "haan" ho toh solver misaal bhi deta hai. Yahi
     IAM Access Analyzer, S3 Block Public Access aur console ke "Public" badge ke peeche hai.</p>
     <p class="tip">🎯 Test poochhta hai "yeh request kya karti hai?". Proof poochhta hai "<b>koi bhi</b> request
     kya kar sakti hai?"</p>`,
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
        { text: '"Replication protocol mein kabhi do leaders ek saath commit kar sakte hain?"', bin: 'proof', explain: 'Har interleaving — TLA+ jaisa model checker.' },
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
          q: 'DynamoDB ka bug 35 kadam lamba trace tha. Isse kya pata chalta hai?',
          choices: [
            'Kuch bugs sirf ek bahut khaas, lambe order mein dikhte hain — random testing unhe lagbhag kabhi nahi pakdegi, par scale par woh order kabhi na kabhi chalega',
            'DynamoDB kharab hai',
            'TLA+ dheema hai',
            'Bug chhota tha',
          ],
          answer: 0,
          explain: 'Isi liye design level par model checking — code se pehle.',
        },
        {
          q: 'Zelkova kis sawaal ka jawab deta hai jo test nahi de sakta?',
          choices: [
            '"Kya koi bhi request ye kar sakti hai?" — saari mumkin requests par, math se',
            '"Kya yeh request fast hai?"',
            '"Kya policy ka JSON valid hai?"',
            '"Kitne users ne bucket padha?"',
          ],
          answer: 0,
          explain: 'Test ek request chalata hai; SMT solver saari requests ka ek saath jawab deta hai.',
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
          'Nahi — pehle design ko TLA+ (ya aisa model) mein likh ke model check karo; phir tests aur chaos. Rare interleavings tests se nahi milte',
          'Haan, 100% coverage kaafi',
          'Production mein dekh lenge',
          'Code review kaafi',
        ],
        answer: 0,
        explain: 'Scale par "rare" roz hota hai.',
      },
      {
        q: 'Interviewer: "Hamare 5,000 S3 buckets mein koi public toh nahi?"',
        choices: [
          'Policies ko automated reasoning se check karo (jaise IAM Access Analyzer / Block Public Access) — "koi bhi request" ka jawab; manual review scale nahi karta',
          'Har bucket ko ek anonymous request se test karo',
          'Team se poochho',
          'Naam mein "public" wale dekho',
        ],
        answer: 0,
        explain: 'Ek request test karna ek raasta hai; policy mein aur raaste ho sakte hain.',
      },
    ],
  },
  success: [
    'Main test aur proof ka farq "yeh request" vs "koi bhi request" se samjha sakta hoon',
    'Main TLA+ aur Zelkova ka kaam bata sakta hoon',
    'Main AWS ke saath sabak ek VM launch ki kahani mein jod sakta hoon',
  ],
  homework: `<p>Apne system ka ek invariant likho jo kabhi toot-na nahi chahiye ("ek order do baar charge nahi hoga",
    "koi bucket public nahi"). Phir likho: abhi use kaun check karta hai — test, review, ya kuch nahi? Aur
    kya "saari mumkin haalaton" par check karne ka koi tareeka hai?</p>`,
  cards: [
    { front: 'TLA+ model checking?', back: 'Design ko states + transitions mein likho; checker har reachable state dekhta hai. DynamoDB replication bug: sabse chhota failing trace 35 kadam.' },
    { front: 'Zelkova?', back: 'IAM/S3 policy → math → SMT solver: "kya KOI bhi request bucket public kar sakti hai?" IAM Access Analyzer, Block Public Access ke peeche.' },
    { front: 'Test vs proof?', back: 'Test: "yeh request kya karti hai?" Proof: "koi bhi request kya kar sakti hai?" Scale par rare raaste roz chalte hain.' },
  ],
},
]);

})();
