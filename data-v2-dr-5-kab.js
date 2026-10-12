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
            q: 'Business kehta hai: "Zero second band, zero data khoye — aur kharcha kam rakho." Kya jawab doge?',
            choices: [
              'Teeno saath nahi milte. Har number ki keemat dikhao: tez wapsi = region B mein roz zyada chalu; zero khoya data = har order doosre region ka chakkar lagaye. Phir business chune ki kis service ke liye kitna dena hai',
              '"Theek hai" — active-active laga do, sab mil jaayega',
              '"Yeh mumkin nahi" — aur baat khatam',
              'Sabse sasta tareeka lagao aur number baad mein dekho',
            ],
            answer: 0,
            hint: 'Lab ki table mein sabse tez tareeke mein bhi kitne orders gaye? Aur zero khoye orders wale tareeke mein har order ko kitna samay laga?',
            explain: 'Lab: active-active mein bhi 2–3 orders gaye aur 1.0–1.5 s orders fail hote rahe. "Pehle copy" mein 0 gaye — par har order 2 ms ki jagah 45 ms.',
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
            q: 'Pilot light aur warm standby, dono mein utne hi orders gaye (5). Phir warm standby ka zyada kharcha kya kharidta hai?',
            choices: [
              'Sirf samay. Warm standby mein app pehle se chal raha hai, isliye wapsi 6.4–6.5 s ki jagah 4.0–4.5 s. Khoya data copy ki raftaar se tay hota hai — aur copy dono mein ek jaisi thi',
              'Kam khoya data',
              'Kuch nahi: warm standby paisa barbaad hai',
              'Galti se bachav',
            ],
            answer: 0,
            hint: 'Table ke do khaane dekho: kaunsa khaana dono rows mein barabar hai, kaunsa alag?',
            explain: 'Do alag knob hain. Wapsi ka samay: region B mein kitna pehle se chalu hai. Khoya data: copy kitni jaldi-jaldi hoti hai, aur "ho gaya" copy se pehle bola jaata hai ya baad mein.',
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
            q: 'Team: "Region B mein lagataar copy chal rahi hai. Backup band kar dete hain — paisa bachega." Kya kahoge?',
            choices: [
              'Nahi. Copy region ke jaane se bachati hai, galti se nahi: galat DELETE kuch hi der mein region B tak bhi pahunch jaati hai. Galti se pehle ka haal sirf purana backup ya purana version de sakta hai',
              'Haan — copy hi backup hai',
              'Haan, agar copy tez ho',
              'Nahi — backup copy se tez hota hai',
            ],
            answer: 0,
            hint: 'Slow motion mein DELETE ke baad region B mein kitne orders bache the?',
            explain: 'Slow motion: 8.00 s par B ke saare orders gaye (14 → 0). Wapas sirf backup se aaye: 12. Copy tez karne se galti aur tez pahunchti hai.',
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
            q: 'Ek team ke paas roz ka backup hai. Restore kabhi chala ke nahi dekha gaya. Is team ki wapsi ka samay (RTO) kya hai?',
            choices: [
              'Kisi ko nahi pata. Wapsi ka samay naapa jaata hai: restore chalao, ghadi dekho. Ho sakta hai restore 6 ghante le — ya backup khule hi nahi',
              'Utna hi jitna backup lene mein lagta hai',
              'Zero — backup hai toh data turant mil jaayega',
              'Jitna business ne likha hai, utna hi',
            ],
            answer: 0,
            hint: 'Business ka likha number lakshya hai. Asli samay kaun batayega?',
            explain: 'Lab mein backup & restore ke 16.3–16.4 s isliye pata hain ki tool ne restore sach mein chalaya aur naapa. Us samay ka bada hissa "sab kuch dobara banana" tha — jo kaagaz par kabhi nahi dikhta.',
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
        q: 'Doosri row ("pehle copy") mein 0 orders kho gaye. Par chauthi row mein wahi tareeka: 75 mein se 75 orders fail. Region A dono baar theek chal raha tha. Yeh kaise?',
        choices: [
          '"Pehle copy" mein har order region B ke jawab ka intezaar karta hai. Region B nahi mila → order fail, chahe region A bilkul theek ho. Zero khoye data ki keemat: region B ki gadbad region A ki gadbad ban jaati hai',
          'Chauthi row mein region A dheema tha',
          'Chauthi row mein orders zyada the',
          '"Pehle copy" mein orders hamesha fail hote hain',
        ],
        answer: 0,
        explain: 'Teesri row ("pehle ho gaya", region B nahi mil raha): 0 orders fail — par list badhti gayi, aur region A usi beech gaya: 80–81 orders kho gaye. Ek tareeka data bachata hai, doosra chalte rehna. Dono saath nahi.',
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
        q: '"KhanaKart ki order service ke liye disaster recovery design karo. Business: 5 minute se zyada band nahi, aur zyada se zyada kuch second ke orders kho sakte hain."',
        choices: [
          'Wapsi minute mein, khoya data second mein → region B mein DB lagataar copy ke saath chalu (pilot light); 5 minute mein app chalu karna pakka na ho, toh chhota app pehle se chalta hua (warm standby). Health check + failover, aur pata chalne ka samay bhi gino. Galti ke liye alag se purane backup. Aur restore aur failover ko chala ke naapo',
          'Sirf roz ka backup — sabse sasta hai',
          'Active-active aur "pehle copy" — har service ke liye sabse surakshit',
          'Region B mein kuch mat rakho; cloud khud sambhal lega',
        ],
        answer: 0,
        explain: 'Lab: pilot light 6.4–6.5 s aur 5 orders; warm standby 4.0–4.5 s aur 5; backup 16.3–16.4 s aur 50. "Kuch second ke orders" manzoor hain, isliye "pehle copy" ki keemat (2 ms → 45 ms) dene ki zaroorat nahi.',
      },
      {
        q: '"Humare paas doosre region mein replica hai. Phir backup kyun chahiye?"',
        choices: [
          'Replica aur backup alag aafat ke liye hain. Replica region ke jaane se bachati hai. Par galti — galat DELETE, kharab deploy, hamla — replica tak bhi copy ho jaati hai. Galti se pehle ka haal sirf purana backup ya purana version de sakta hai',
          'Backup ki zaroorat nahi — replica kaafi hai',
          'Backup replica se tez hota hai',
          'Backup sirf kanooni wajah se rakha jaata hai',
        ],
        answer: 0,
        explain: 'Slow motion: DELETE 7.75 s par, region B mein 8.00 s par (14 → 0). Backup se 12 orders wapas; 4 nahi mile. AWS ka whitepaper bhi yahi kehta hai: lagataar copy ke saath versioning ya point-in-time recovery chahiye.',
      },
      {
        q: '"Active-active sabse tez hai. Har service ke liye wahi kyun nahi?"',
        choices: [
          'Teen wajah. Kharcha: poora doosra region roz chalta hai. Mushkil: do jagah likhna sambhalna padta hai. Aur phir bhi data zero nahi khota, jab tak copy "ho gaya" ke baad hoti hai. Jis service ke liye ghanton band rehna chalta hai, uske liye yeh paisa aur mehnat barbaad hai',
          'Koi wajah nahi — har service ke liye lagana chahiye',
          'Kyunki active-active sirf databases ke liye hota hai',
          'Kyunki active-active mein failover nahi hota',
        ],
        answer: 0,
        explain: 'Lab: active-active mein 1.0–1.5 s orders fail hote rahe aur 2–3 orders gaye — zero dono mein nahi. AWS ka whitepaper active-active ko sabse mushkil aur sabse mehenga tareeka kehta hai.',
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
