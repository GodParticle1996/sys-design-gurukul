/* =====================================================================
   🛡️ Playlist · 1 Resilience — Disaster Recovery · level 5: KAB
   Kis service ke liye kaunsa tareeka, kis keemat par; teen cheezein jo ek doosre ki jagah nahi le sakti
   (backup · lagataar copy · purane version); sach ya galatfehmi.
   Number asli run se hain: docker-labs/40-disaster-recovery — tools/dr.js (ex1), tools/syncrepl.js (ex2),
   aur slow motion (tools/slowmo-galti.js). Lab mein samay chhota kiya gaya hai; kram asli hai.
   "AWS ka whitepaper" = AWS ka "Disaster Recovery of Workloads on AWS" (official; is lab mein AWS chalaya nahi gaya).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'bk', icon: '💾', label: 'backup & restore', x: 225, y: 65 },
  { id: 'pl', icon: '🕯️', label: 'pilot light', x: 665, y: 65 },
  { id: 'ws', icon: '🔥', label: 'warm standby', x: 225, y: 220 },
  { id: 'aa', icon: '⚡', label: 'active-active', x: 665, y: 220 },
];

VISUALS['dr-kab'] = {
  t: 'Chaar tareeke, ek hi sauda: region B mein jitna zyada pehle se chalu, wapsi utni tez — aur roz ka kharcha utna zyada. (Number lab ke hain; lab mein samay chhota hai)',
  html: SD.viz.svg(NODES, [{ from: 'bk', to: 'pl' }, { from: 'pl', to: 'ws', dashed: true }, { from: 'ws', to: 'aa' }], {
    nodes: {
      bk: { tone: 'ok', badge: '16.3 s band · sasta' }, pl: { tone: 'acc', badge: '6.4 s band' },
      ws: { tone: 'slow', badge: '4.0 s band' }, aa: { tone: 'bad', badge: '1.5 s band · mehenga' },
    },
    flows: [],
  }, { w: 890, h: 305 }),
};

const START2 = '[region A] :5191\n[region B] :5192';

SD.registerLevels('sdd-resil', [
{
  id: 'dr-kab',
  icon: '⚖️',
  group: '🌋 Disaster Recovery',
  title: 'Disaster Recovery 5 · Kab — kaunsa tareeka, kis keemat par',
  badge: 'Aafat Panch',
  objectives: [
    'Kis service ke liye backup kaafi hai, aur kis ke liye doosra region pehle se chalu chahiye?',
    'Tareeka chunne se pehle business se kaunse do number likhwane hain?',
    'Backup, lagataar copy aur purane version: yeh teen ek doosre ki jagah kyun nahi le sakte?',
    'Paanch aam galatfehmiyan kaunsi hain, aur har ek ka naapa hua jawab kya hai?',
  ],
  lesson: [
    `<h3>⚖️ Tareeka baad mein. Pehle do number.</h3>
     <p>Har service ke liye do sawaal hain. Jawab engineer nahi, business deta hai:</p>
     <pre>kitni der band reh sakte hain?   → wapsi ka lakshya (RTO)
kitna data kho sakte hain?       → data ka lakshya (RPO)</pre>
     <p>Engineer ka kaam: har jawab ki keemat dikhana.</p>
     <pre>lab (50 orders/second, region A gaya; teen run):
backup & restore   → 16.3–16.4 s band · 50 orders gaye · region B mein aam din: sirf backup
pilot light        → 6.4–6.5 s band   · 5 orders gaye  · DB chalu, app band
warm standby       → 4.0–4.5 s band   · 5 orders gaye  · DB + chhota app
active-active      → 1.0–1.5 s band   · 2–3 orders gaye · poora region</pre>
     <p>Lab mein samay chhota kiya gaya hai: jo kaam yahan second leta hai, asli duniya mein woh kaam kahin zyada samay leta hai. Kram wahi rehta hai.</p>
     <p class="tip">👉 Is level mein pehle tum faisla karoge: aath services, teen jagah. Phir number.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Is service ke liye kaunsa tareeka?',
      instructions: 'KhanaKart ki aath services. Har ek ke liye do sawaal socho: kitni der band reh sakti hai, aur kitna data kho sakta hai? Phir sahi bin mein daalo.',
      bins: [
        { id: 'bk', label: '💾 Backup & restore — ghanton band chalega' },
        { id: 'mid', label: '🔥 Pilot light / warm standby — minute mein wapas' },
        { id: 'top', label: '⚡ Active-active, ya "pehle copy" — band rehna ya data khona manzoor nahi' },
      ],
      items: [
        { text: 'Andar ka report tool: mahine mein ek baar chalta hai. Ek din band rahe, toh koi nahi poochhega', bin: 'bk', explain: 'Band rehne ka samay ghanton mein chalega → sabse sasta tareeka kaafi hai. Lab: region B mein aam din sirf backup rakha tha; wapsi mein 16.3–16.4 s lage — sabse zyada, par is tool ke liye chalega.' },
        { text: 'Analytics ka data warehouse: reports kal subah bhi ban sakti hain, aur data asli database se dobara bhara ja sakta hai', bin: 'bk', explain: 'Dono number dheele hain: band rehna chalega, aur khoya data dobara ban sakta hai. Doosre region mein roz kuch chalu rakhna yahan paisa barbaad hai.' },
        { text: 'Purane orders ke bill (PDF): grahak kabhi-kabhi download karta hai. Bill dobara banaye ja sakte hain', bin: 'bk', explain: 'Kuch ghante "bill abhi nahi mil raha" dikhana chal jaayega, aur bill dobara ban sakte hain. Backup kaafi.' },
        { text: 'Order lene wali service: band rahi toh har minute ki kamaai jaati hai. Business: "5 minute se zyada band nahi"', bin: 'mid', explain: 'Minute wali wapsi → region B mein DB pehle se chalu chahiye. Lab: pilot light 6.4–6.5 s, warm standby 4.0–4.5 s — backup ke 16.3–16.4 s ke saamne.' },
        { text: 'Restaurant ka dashboard (naye orders dikhata hai): 10 minute band raha, toh restaurant phone se kaam chala lega', bin: 'mid', explain: 'Ghante nahi chalenge, par kuch minute chalenge. Beech ka tareeka: DB ki lagataar copy, aur app jo jaldi chalu ho sake.' },
        { text: 'Live tracking ("rider kahan hai"): 2 minute band raha toh grahak pareshan. Purani location kho jaaye, toh koi farak nahi', bin: 'mid', explain: 'Do number alag-alag socho. Band rehna mehenga hai (minute). Khoya data sasta hai: location har kuch second mein nayi aa jaati hai. Isliye yahan "pehle copy" ki zaroorat nahi.' },
        { text: 'Login service: band hui toh koi bhi kuch nahi kar sakta — grahak, restaurant, rider, sab ruk jaate hain', bin: 'top', explain: 'Jis service par sab nirbhar hain, us service ke band rehne ka har second sabse mehenga hai. Lab: active-active 1.0–1.5 s — lagbhag sirf gadbad ka pata chalne ka samay.' },
        { text: 'Payments ka hisaab: ek bhi entry nahi kho sakti', bin: 'top', explain: 'Yahan sawaal data ka hai, aur jawab zero. Zero sirf "pehle copy, phir ho gaya" se milta hai. Lab: is tareeke mein 0 kho gaye ("pehle ho gaya" mein 5). Keemat: har entry 2 ms ki jagah 45 ms.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain. Jahan "AWS ka whitepaper" likha hai, woh AWS ki official documentation se hai (is lab mein AWS chalaya nahi gaya).',
      steps: [
        {
          title: '1. Pehle do number — business se likhwao',
          say: `<b>RTO</b> = service band hone se wapas chalu hone tak, zyada se zyada kitni der manzoor hai.<br>
            <b>RPO</b> = aakhri surakshit copy kitni purani ho sakti hai — yaani kitna data khona manzoor hai.<br><br>
            AWS ka whitepaper dono ke baare mein ek hi baat kehta hai: yeh number <b>organization tay karta hai</b>. Engineer in numbers ko chunta nahi; engineer batata hai ki har number ki keemat kya hai.<br><br>
            Wahi whitepaper yeh bhi kehta hai: lakshya banate waqt gadbad ka <b>pata chalna</b>, khabar pahunchna aur faisla lena — sab gino. Lab mein yeh dikha: sabse tez tareeke mein poori wapsi (1.0–1.5 s) lagbhag sirf pata chalne ka samay thi (health check 500 ms × 3).`,
          ask: {
            q: 'Business maangta hai: "Zero second band, zero data khoye, kharcha kam." Engineer agla kaam kya karega?',
            choices: [
              'Har lakshya ki keemat aur aafat ka matlab samjhaakar business se faisla karwayega',
              'Active-active ki tez wapsi dikhaakar copy aur kharche ka sawaal baad mein rakhega',
              'Roz ka sasta backup chun lega aur phir backup ke hisaab se business ke lakshya likhega',
              'Zero wale lakshya mushkil batayega aur service ki wapsi par aage baat rok dega',
            ],
            answer: 0,
            hint: 'Har chhote nuksaan ke liye lab mein kaunsa alag intezaam chahiye tha?',
            explain: 'Pehle poochho kis aafat se bachna hai aur service kitni der ruk sakti hai, kitna data khona manzoor hai. Phir taiyaari, copy aur roz ke kharche ke tradeoffs dikhao. Business pehle kya zaroori hai, tay kare; engineer bina naap literal zero ka vaada na kare. Active-active bhi apne aap zero loss ya muft wapsi nahi deta.',
            choiceExplanations: [
              'Pehle poochho kis aafat se bachna hai aur service kitni der ruk sakti hai, kitna data khona manzoor hai. Phir taiyaari, copy aur roz ke kharche ke tradeoffs dikhao. Business pehle kya zaroori hai, tay kare; engineer bina naap literal zero ka vaada na kare. Active-active bhi apne aap zero loss ya muft wapsi nahi deta.',
              'Tez routing akeli copy ki guarantee aur kharcha nahi samjhati. Dono business ke faisle ka hissa hain.',
              'Tareeka lakshya poora karne ke liye chunta hai. Saste tareeke ko sahi dikhane ke liye lakshya baad mein badalna theek nahi.',
              'Literal zero ka vaada na karna theek hai. Phir bhi business ke saath kaam ke recovery targets tay karne hain.',
            ],
          },
        },
        {
          title: '2. Chaar tareeke, ek table',
          say: `Lab (50 orders/second, teen run):
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Region B mein aam din (= roz ka kharcha)</th><th>Orders fail hote rahe</th><th>"Ho gaya" wale orders gaye</th></tr>
              <tr><td>Backup & restore</td><td>sirf backup</td><td>16.3–16.4 s</td><td>50</td></tr>
              <tr><td>Pilot light</td><td>DB chalu, app band</td><td>6.4–6.5 s</td><td>5</td></tr>
              <tr><td>Warm standby</td><td>DB + chhota app</td><td>4.0–4.5 s</td><td>5</td></tr>
              <tr><td>Active-active</td><td>poora region</td><td>1.0–1.5 s</td><td>2–3</td></tr>
            </table></div>
            AWS ka whitepaper in chaaron ko isi kram mein rakhta hai: backup banane ki "kam keemat aur kam mushkil" se lekar kai chalu regions wale "zyada mushkil" tareekon tak. Aur active-active ko whitepaper sabse mushkil aur sabse mehenga tareeka kehta hai.`,
          ask: {
            q: 'Pilot light aur warm standby ke recorded runs mein 5–5 orders khoye. Warm standby ka roz ka zyada kharcha kya laaya?',
            choices: [
              'App pehle se chalu mila, toh wapsi tez hui; copy ka intezaam wahi raha',
              'App pehle se chalu mila, toh har naya order B mein bina der ke copy hua',
              'App pehle se chalu mila, toh galti ka DELETE B par jaane se ruk gaya',
              'App pehle se chalu mila, toh failover ka samay naapna baaki nahi raha',
            ],
            answer: 0,
            hint: 'Table mein band rehne aur khoye orders ke khaane alag-alag milao.',
            explain: 'README ke teen runs mein pilot light ki recovery 6.4–6.5 s aur warm standby ki 4.0–4.5 s thi. Copy ka intezaam wahi tha; dono mein 5 orders khoye. Roz chalta chhota app traffic pehle lena shuru kar saka, poori capacity ke liye scale up phir bhi laga. Lab ke seconds AWS ka vaada nahi hain.',
            choiceExplanations: [
              'README ke teen runs mein pilot light ki recovery 6.4–6.5 s aur warm standby ki 4.0–4.5 s thi. Copy ka intezaam wahi tha; dono mein 5 orders khoye. Roz chalta chhota app traffic pehle lena shuru kar saka, poori capacity ke liye scale up phir bhi laga. Lab ke seconds AWS ka vaada nahi hain.',
              'App khulne se copy ka fasla nahi ghata. Data ki taazgi copy aur "ho gaya" ke niyam se aati hai.',
              'Chalta app galat badlaav ko nahi pehchaanta. Replicator DELETE ko bhi B tak pahuncha sakta hai.',
              'Taiyaari samay ghata sakti hai; kitna ghata, failover drill mein phir bhi naapna padega.',
            ],
          },
        },
        {
          title: '3. Teen cheezein, teen alag kaam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Cheez</th><th>Kis se bachati hai</th><th>Kis se nahi</th></tr>
              <tr><td>Lagataar copy (doosre region mein)</td><td>region ke jaane se</td><td>galti se: galat DELETE bhi copy ho jaati hai</td></tr>
              <tr><td>Purane backup (alag-alag samay ke)</td><td>galti se: galti se pehle ka haal wapas</td><td>aakhri backup ke baad ka data nahi milta</td></tr>
              <tr><td>Purane version (har badlav ka pichhla roop)</td><td>galti se, ek-ek cheez ke liye</td><td>region ke jaane se nahi — jab tak version bhi doosri jagah na hon</td></tr>
            </table></div>
            Slow motion: 7.75 s par kisi ne galti se saare orders mita diye. 8.00 s par yahi DELETE region B tak pahunch gayi: B ke 14 orders bhi gaye. 6.00 s wale backup se 12 orders wapas aaye; 4 nahi mile (#13–#16), kyunki woh us backup ke baad likhe gaye the.<br><br>
            AWS ka whitepaper: lagataar copy kuch tarah ki aafat se bachati hai, par data ke bigadne ya mitne se shayad nahi — jab tak saath mein versioning ya point-in-time recovery na ho.`,
          ask: {
            q: 'Team replica rakhkar purane backup band karna chahti hai. Recovery ki taiyaari mein kya kahoge?',
            choices: [
              'Purana saaf haal bhi bachao, taaki galat badlaav copy hone par data lauta sako',
              'Copy ka fasla aur ghata do, taaki taaza replica purane backup ki jagah le sake',
              'B ka app aur bada kar do, taaki galat badlaav replica ke orders ko na mita sake',
              'B ko sirf padhne ke liye kholo, taaki copy ka DELETE DB par lag hi na sake',
            ],
            answer: 0,
            hint: 'Dono DB mein galat badlaav lag gaya ho, toh galti se pehle ka haal kahan milega?',
            explain: 'Replica taaza haal rakhta hai; taaza haal mein galti bhi ho sakti hai. Galti se pehle ke point par lautne ke liye saaf backup ya bache purane versions chahiye. Lab ke model mein DELETE B tak bhi gaya; 6.00 s wale snapshot se 12 purane orders mile, #13–#16 nahi mile.',
            choiceExplanations: [
              'Replica taaza haal rakhta hai; taaza haal mein galti bhi ho sakti hai. Galti se pehle ke point par lautne ke liye saaf backup ya bache purane versions chahiye. Lab ke model mein DELETE B tak bhi gaya; 6.00 s wale snapshot se 12 purane orders mile, #13–#16 nahi mile.',
              'Jaldi copy galti bhi jaldi pahuncha sakti hai. Taaza replica apne aap purane waqt ka haal nahi rakhta.',
              'App ki capacity replication ke badlaav ka matlab nahi badalti. B ka bada app bhi DELETE ko rokne ka niyam nahi hai.',
              'Clients ko read-only dene se replication ka apply nahi rukta. Replica doosri taraf se aaya DELETE phir bhi laga sakta hai.',
            ],
          },
        },
        {
          title: '4. Jo wapsi chala ke nahi dekhi, woh tayyari nahi',
          say: `Teen baatein jo kaagaz par nahi dikhti:
            <ul>
              <li><b>Restore chala ke dekho.</b> "Backup hai" ek daava hai. Wapsi ka samay tabhi pata chalta hai jab restore chalao aur ghadi dekho. (Chaos Engineering wale levels: daava nahi, saboot.)</li>
              <li><b>Wapas jaana alag kaam hai.</b> Failover ke baad naye orders region B mein hain; region A ka data purana hai. Router apne aap wapas gaya toh do jagah likhna shuru ho sakta hai. Isliye wapsi ek insaan tay karta hai: pehle data milao, phir traffic badlo.</li>
              <li><b>Apne aap failover: sambhal ke.</b> AWS ka whitepaper (pilot light jaise tareekon ke baare mein) kehta hai: health check ya alarm se apne aap shuru hone wala failover "caution" ke saath istemaal karo — aur saari achhi aadatein apnane par bhi wapsi ka samay aur khoya data zero se zyada hi rahenge.</li>
            </ul>
            <b>Kal subah:</b> apni ek service chuno. Do number likho. Phir poochho: aakhri baar restore kab chala ke dekha gaya?`,
          ask: {
            q: 'Roz ka backup banta hai, par restore kabhi nahi chala. Service lautne ke asal samay ke baare mein kya keh sakte hain?',
            choices: [
              'Abhi naapa nahi gaya; poora restore chalaakar service lautne ka samay dekho',
              'Backup banne mein jitna samay laga, service lautne ka samay utna maan lo',
              'Business ne jitna samay diya, service lautne ka naap bhi utna hi maan lo',
              'Storage ka uptime achha hai, toh service lautne ka samay uptime se tay maan lo',
            ],
            answer: 0,
            hint: 'Lakshya ka number aur ghadi se naapa hua number kab ek hi maana jaa sakta hai?',
            explain: 'RTO business ka lakshya ho sakta hai, par asal recovery ka samay bina restore drill ke sabit nahi. Backup padhna, DB aur app banana, traffic lautana aur kaam chalna saath naapna padega. Backup banana aur poori service wapas chalana alag raaste hain.',
            choiceExplanations: [
              'RTO business ka lakshya ho sakta hai, par asal recovery ka samay bina restore drill ke sabit nahi. Backup padhna, DB aur app banana, traffic lautana aur kaam chalna saath naapna padega. Backup banana aur poori service wapas chalana alag raaste hain.',
              'Backup banne ka samay restore ka naap nahi. App aur data lautane mein alag kaam lag sakta hai.',
              'Business ka likha samay lakshya hai. Lakshya likhne se asal recovery utne samay mein poori hone ka saboot nahi milta.',
              'Storage ka milna poori service tayyar hone ke barabar nahi. App, data aur routing ka kaam bhi baaki ho sakta hai.',
            ],
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> pehle do number, phir tareeka. Wapsi ka samay aur khoya data do alag knob hain. Lagataar copy, purane backup aur purane version teen alag kaam karte hain. Aur jo wapsi chala ke nahi dekhi, us par bharosa mat karo.',
    },

    /* ---------------- 3. naapo: "ho gaya" pehle ya copy pehle ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — zero khoye data ki keemat',
      project: '40-disaster-recovery',
      exercise: 'ex2-sync-async',
      goal: 'Asli raftaar: do regions, 50 orders/second seedhe region A ko. Region A 2.5 s par chala jaata hai. Chaar rows: "pehle ho gaya" aur "pehle copy" — dono ek baar aam din mein, ek baar tab jab region B 2 second tak mil hi nahi raha.',
      why: '<code>services/region.js</code> = ek region (copy ka niyam <code>lib/replicator.js</code> se). Dono Node processes hain; Docker nahi chahiye. A se B ke raaste mein 40 ms ki nakli doori rakhi gayi hai. Number har run mein thode alag aa sakte hain; tarteeb wahi rahegi.',
      steps: [
        { text: 'Dono regions chalao (ek terminal mein, chalta chhod do). Lines ka kram alag ho sakta hai.', cmd: 'cd docker-labs/40-disaster-recovery && npm start ex2-sync-async', expect: START2 },
        { text: 'Doosre terminal mein: chaaron rows (~15 s). "kho gaye" aur "fail" wale khaane dekho.', cmd: 'node tools/syncrepl.js', expect: "50 orders/s · A se B tak nakli round trip 40 ms · region A 2.5 s par khatam · B-down rows: B 1 s se 3 s tak unreachable\n\nsetup                              median     p99   \"ho gaya\" par kho gaye   B unreachable mein fail   sabse badi waiting list   kill par waiting list\nasync (copy har 300 ms)               2 ms    4 ms          5 / 125                    —                        18                        5\nsync (B ka jawab, phir \"ho gaya\")    45 ms   46 ms          0 / 123                    —                         0                        0\nasync + B 2 s unreachable             2 ms    4 ms         81 / 126               0 / 75                        81                       81\nsync + B 2 s unreachable            542 ms  546 ms           0 / 48              75 / 75                         0                        0" },
        { text: 'Chaaron tareeke phir se dekhne hon (level 4 wala lab): pehla terminal band karo (Ctrl+C), yeh chalao, phir doosre terminal mein: node tools/dr.js (~1 minute).', cmd: 'npm start ex1-dr-tiers' },
      ],
      observe: {
        q: 'Recorded sync runs mein B theek tha toh koi "ho gaya" wala order nahi khoya. B unreachable hua toh kill se pehle ke 75/75 orders fail. Farak kya tha?',
        choices: [
          'Sync ko B ka jawab chahiye; B ka raasta band ho toh A ki sehat akeli kaafi nahi',
          'Doosre run mein copy ki ghadi dheemi thi; wahi har sync order ka jawab rok rahi thi',
          'Doosre run mein DNS purana tha; wahi A mein rakhe "ho gaya" wale orders mita raha tha',
          'Doosre run mein A ki capacity kam thi; B tak ka raasta pehle jitna theek chal raha tha',
        ],
        answer: 0,
        explain: '75 orders B ke blackout shuru hone se A ko kill karne se pehle bheje gaye the. A tab theek tha, par sync write ko B ka jawab nahi mila. Isliye 75/75 fail hue. "Ho gaya" na mile toh order "ho gaya mila, par B mein nahi" wali ginti mein nahi aata. Ginti recorded lab runs ki hai. Async mein B band hone ke dauraan ke 0/75 fail hue, par A jaate waqt 80–81 "ho gaya" wale orders ki copy B mein nahi thi.',
        choiceExplanations: [
          '75 orders B ke blackout shuru hone se A ko kill karne se pehle bheje gaye the. A tab theek tha, par sync write ko B ka jawab nahi mila. Isliye 75/75 fail hue. "Ho gaya" na mile toh order "ho gaya mila, par B mein nahi" wali ginti mein nahi aata. Ginti recorded lab runs ki hai. Async mein B band hone ke dauraan ke 0/75 fail hue, par A jaate waqt 80–81 "ho gaya" wale orders ki copy B mein nahi thi.',
          'Sync har write ki copy ka jawab dekhta hai; everyMs ki ghadi ka intezaar nahi karta. Badla hua hissa B ka raasta hai.',
          'Tool seedhe A par orders bhejta hai. DNS cache DB mein order mitane ka kaam nahi karta.',
          'A ko kam capacity dene ka farak nahi kiya gaya. Doosre run mein B unreachable kiya gaya tha.',
        ],
      },
      lesson: 'Zero khoya data muft nahi hai: har order doosre region ka intezaar karta hai, aur doosre region ki gadbad pehle region ki gadbad ban jaati hai.',
    },

    /* ---------------- 4. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Disaster recovery ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Backup hai, toh hum bache hue hain."', bin: 'myth', explain: 'Backup data bachata hai, samay nahi: sab kuch dobara banana padta hai. Lab: 16.3–16.4 s orders fail hote rahe (baaki tareekon se kai guna), aur aakhri backup ke baad ke 50 orders gaye.' },
        { text: '"Region B mein lagataar copy hai, toh backup ki zaroorat nahi."', bin: 'myth', explain: 'Copy galti ko bhi copy karti hai. Slow motion: galat DELETE 8.00 s par region B tak pahunch gayi (B ke 14 orders gaye). Purane backup se 12 wapas aaye.' },
        { text: '"Active-active mein data kabhi nahi khota."', bin: 'myth', explain: 'Active-active mein bhi copy "ho gaya" ke baad hoti hai. Lab: 2–3 orders gaye (teen run). AWS ka whitepaper is tareeke ke liye "near-zero RPO" kehta hai — zero nahi.' },
        { text: '"Failover turant hota hai."', bin: 'myth', explain: 'Pehle gadbad ka pata chalna padta hai, phir region B ko tayyar hona padta hai, phir grahak ko naya pata milna chahiye. Lab: sabse tez tareeke mein bhi 1.0–1.5 s orders fail hote rahe.' },
        { text: '"Pehle copy, phir ho gaya" lagane ki koi keemat nahi hai.', bin: 'myth', explain: 'Har order doosre region ka chakkar lagata hai: lab mein 2 ms → 45 ms. Aur region B na mile toh orders fail: 75 mein se 75.' },
        { text: 'Wapsi ke samay mein gadbad ka pata chalne ka samay bhi gina jaata hai.', bin: 'true', explain: 'AWS ka whitepaper: pata chalna, khabar dena, faisla lena — sab planning mein gino. Lab: active-active ki poori wapsi (1.0–1.5 s) lagbhag sirf pata chalne ka samay thi.' },
        { text: 'Galat DELETE lagataar copy ke saath doosre region tak bhi pahunch jaati hai.', bin: 'true', explain: 'Copy ke liye DELETE bhi bas ek badlav hai. Slow motion: galti 7.75 s par, region B mein 8.00 s par. Isliye purane backup ya purane version alag se chahiye.' },
        { text: 'Ek hi company ki do services ke liye do alag tareeke chunna theek hai.', bin: 'true', explain: 'Tareeka service ke do number se tay hota hai, company se nahi. Report tool ke liye backup kaafi hai; login service ke liye nahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — design karo',
    instructions: 'Yahan poora design chahiye, aur har hisse ki wajah. 🎤',
    questions: [
      {
        q: 'Order service: RTO 5 minute, RPO kuch second. Roz ka kharcha bhi ginna hai. Kaunsa plan pehle jaanchoge?',
        choices: [
          'B ki copy aur app ka drill karo; dono lakshya naapo, purane backup bhi rakho',
          'Roz ka backup aur zaroorat par naya B; paanch minute ka vaada bina drill kar do',
          'Sync active-active har service par; lakshya aur kharcha milaye bina final kar do',
          'Sirf DNS failover lagao; aafat ke baad B ka data aur app banne ko kaafi maan lo',
        ],
        answer: 0,
        explain: 'Kuch second ka RPO chahiye toh copy ka lag naapna padega. Pilot light mein app boot samet 5 minute ka target poora ho, toh pilot light kaam aa sakta hai; warna warm standby bhi jaancho. Detection aur DNS/client cache gino, purane backup rakho aur failover/restore chala ke naapo. Lab ke chhote seconds se production ka paanch-minute target sabit nahi hota.',
        choiceExplanations: [
          'Kuch second ka RPO chahiye toh copy ka lag naapna padega. Pilot light mein app boot samet 5 minute ka target poora ho, toh pilot light kaam aa sakta hai; warna warm standby bhi jaancho. Detection aur DNS/client cache gino, purane backup rakho aur failover/restore chala ke naapo. Lab ke chhote seconds se production ka paanch-minute target sabit nahi hota.',
          'Roz ka backup kuch second ke data gap ka vaada nahi karta. Restore ki raftaar bina drill ke paanch minute maan nahi sakte.',
          'Sync active-active kaam kar sakta hai, par har service ka pehla final jawaab nahi. Data loss ki hadd, latency aur kharcha milana baaki hai.',
          'DNS sirf pata badalta hai. B ka taaza data, chalta app aur capacity apne aap nahi banata.',
        ],
      },
      {
        q: 'Doosre region mein taaza replica hai. Phir purane backup ya versions kis nuksaan ke liye rakhoge?',
        choices: [
          'Galat badlaav dono taraf lag jaaye, toh galti se pehle ka saaf haal laane ke liye',
          'Replica ka kaam dobara karne ke liye, kyunki replica aur history ek hi bachav hain',
          'Sirf copy ka roz ka kharcha ghatane ke liye, kyunki restore ki jaanch baaki nahi',
          'Sirf grahak ko galat likhne se rokne ke liye, kyunki read-only replica delete nahi leta',
        ],
        answer: 0,
        explain: 'Replica region ke jaane par kaam aa sakta hai, par delete ya kharab badlaav bhi copy kar sakta hai. Saaf purana backup ya version galti se pehle ka data lauta sakta hai. Lab mein 16 purane orders mit gaye; saaf snapshot se 12 laute, 4 nahi mile. Recovery ka raasta chalaakar dekhna phir bhi zaroori hai.',
        choiceExplanations: [
          'Replica region ke jaane par kaam aa sakta hai, par delete ya kharab badlaav bhi copy kar sakta hai. Saaf purana backup ya version galti se pehle ka data lauta sakta hai. Lab mein 16 purane orders mit gaye; saaf snapshot se 12 laute, 4 nahi mile. Recovery ka raasta chalaakar dekhna phir bhi zaroori hai.',
          'Taaza copy aur purana haal alag bachav hain. Taaza replica galti ke baad ka haal bhi rakh sakta hai.',
          'History ka maqsad kharcha ghatana bhar nahi. Backup padhkar data lauta sakte hain ya nahi, jaanchna zaroori hai.',
          'Read-only clients ko likhne se rokta hai. Replication ka apply delete ko phir bhi replica tak la sakta hai.',
        ],
      },
      {
        q: 'Active-active ki wapsi tez dikhi. Har service ke liye chunne se pehle kaunsa sawaal poochhoge?',
        choices: [
          'RTO/RPO, roz ka kharcha aur do jagah ke writes milana service ko manzoor hai?',
          'Routing tez hai toh data bachne ka vaada bhi poora maan kar design rok sakte hain?',
          'Do regions chalte hain toh copy ke jawab ka intezaar kiye bina zero loss maan lein?',
          'Dono apps chalte hain toh purane backup aur wapsi ka alag plan hataya ja sakta hai?',
        ],
        answer: 0,
        explain: 'Active-active ko service ke lakshya aur roz ke kharche se milao. Do jagah writes hon toh takraate badlaav ka niyam chahiye. Async copy ho toh "ho gaya" ke baad bhi copy baaki reh sakti hai. Galti ke liye history aur failure ke baad wapsi ka plan bhi chahiye; tez routing akeli poora DR design nahi.',
        choiceExplanations: [
          'Active-active ko service ke lakshya aur roz ke kharche se milao. Do jagah writes hon toh takraate badlaav ka niyam chahiye. Async copy ho toh "ho gaya" ke baad bhi copy baaki reh sakti hai. Galti ke liye history aur failure ke baad wapsi ka plan bhi chahiye; tez routing akeli poora DR design nahi.',
          'Routing ki raftaar data ki tikau copy aur sahi writes ka saboot nahi. Copy ka vaada alag jaancho.',
          'Do active regions ka matlab har order dono mein pahunch chuka nahi. Async copy ke beech A ka order akela reh sakta hai.',
          'Galti active regions tak bhi pahunch sakti hai. History aur recovery/failback ka plan phir bhi kaam aata hai.',
        ],
      },
    ],
  },
  success: [
    'Kisi bhi service ke liye do number poochh ke bata sakte ho ki kaunsa tareeka kaafi hai — aur kaunsa zaroorat se zyada',
    'Bata sakte ho ki lagataar copy, purane backup aur purane version teen alag kaam kyun karte hain',
    'Bata sakte ho ki zero khoye data ki keemat kya hai, aur wapsi chala ke kyun naapni chahiye',
  ],
  cards: [
    { front: 'Tareeka chunne se pehle kaunse do number?', back: 'RTO: kitni der band reh sakte hain. RPO: kitna data kho sakte hain. Dono business tay karta hai; engineer keemat dikhata hai. Pata chalne ka samay bhi RTO mein gino.' },
    { front: 'Chaar tareeke — lab ke number?', back: 'Backup 16.3–16.4 s · pilot light 6.4–6.5 s · warm standby 4.0–4.5 s · active-active 1.0–1.5 s. Orders gaye: 50 · 5 · 5 · 2–3. Region B mein jitna zyada chalu, utna tez, utna mehenga.' },
    { front: 'Replica hai — backup kyun?', back: 'Replica region ke jaane se bachati hai; galti ko copy kar deti hai. Slow motion: DELETE 8.00 s par B tak. Galti se pehle ka haal: purana backup (12 wapas) ya purana version.' },
    { front: 'Zero khoye data ki keemat?', back: '"Pehle copy, phir ho gaya": har order 2 ms → 45 ms. Aur region B na mile toh orders fail (75 mein se 75), chahe region A theek ho.' },
    { front: '"Backup hai" kab sach hai?', back: 'Jab restore chala ke dekha ho aur samay naapa ho. Jo wapsi kabhi chalayi nahi, us par bharosa mat karo. Aur failover ke baad wapas jaana ek insaan tay kare — pehle data milao.' },
  ],
},
]);

})();
