/* =====================================================================
   🛡️ Playlist · 1 Resilience — Disaster Recovery · level 2: KAISE
   Doosre region mein kya chalu rakhein (chaar tareeke); "ho gaya" pehle ya copy pehle; failover ke baad bhi purana pata;
   aur galti bhi copy ho jaati hai.
   Har step docker-labs/40-disaster-recovery ke asli run se hai: `node tools/slowmo.js`, `node tools/slowmo-sync.js`,
   `node tools/slowmo-dns.js` (yeh ek MODEL hai — asli DNS nahi), `node tools/slowmo-galti.js`;
   asli raftaar = tools/dr.js (ex1), tools/syncrepl.js (ex2). Lab mein samay chhota kiya gaya hai; kram asli hai.
   ===================================================================== */
(function () {

const NODES = [
  { id: 'rt', icon: '🧭', label: 'router', x: 130, y: 180 },
  { id: 'a', icon: '🏙️', label: 'region A', x: 445, y: 80 },
  { id: 'b', icon: '🏝️', label: 'region B', x: 445, y: 280 },
  { id: 's3', icon: '🗄️', label: 'backup', x: 750, y: 180, kind: 'db' },
];
const EDGES = [{ from: 'rt', to: 'a' }, { from: 'rt', to: 'b' }, { from: 'a', to: 's3' }, { from: 's3', to: 'b' }, { from: 'a', to: 'b', dashed: true }];
const VIZ = { w: 890, h: 365, focus: ['a', 'b', 's3'] };   // phone par dono region hamesha dikhein; router ki baat vars table mein hai

VISUALS['dr-kaise'] = {
  t: 'Region B mein jitna zyada pehle se chalu, wapsi utni tez — aur roz ka kharcha utna zyada',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { rt: { tone: 'ok', badge: 'baari-baari: A, B' }, a: { tone: 'ok', badge: 'poora chalu' }, b: { tone: 'ok', badge: 'poora chalu' }, s3: { tone: 'idle', badge: '' } },
    flows: [{ from: 'rt', to: 'a', label: '#1', tone: 'ok' }, { from: 'rt', to: 'b', label: '#2', tone: 'ok' }, { from: 'a', to: 'b', tone: 'acc' }],   // label nahi: region A ke badge par chadh jaata
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'dr-kaise',
  icon: '🧭',
  group: '🌋 Disaster Recovery',
  title: 'Disaster Recovery 2 · Kaise — doosre region mein kya chalu rakhein',
  badge: 'Region Rakhwala',
  objectives: [
    'Region B mein jitna zyada pehle se chalu, wapsi utni tez. Is rishte mein khoya data kahan aata hai?',
    '"Ho gaya" copy se pehle bolein ya baad mein — dono ki keemat kya hai?',
    'Failover ho chuka hai. Phir bhi kuch grahakon ke orders kyun fail hote rehte hain?',
    'Region theek hai, par kisi ne galti se sab mita diya. Lagataar copy isse kyun nahi bachati?',
  ],
  lesson: [
    `<h3>🧭 Do alag knob, ek hi din</h3>
     <p>Pichhle level ka hisaab (slow motion, region A 4.00 s par gaya):</p>
     <pre>sirf backup (har 3 s), B mein kuch nahi   → 7.50 s baad chale · 14 fail · 3 orders kho gaye
copy har 1 s, B ka DB chalu (app band)    → 4.50 s baad chale ·  8 fail · 1 order kho gaya</pre>
     <p>Do cheezein alag-alag badli thi: <b>copy kitni jaldi jaati hai</b> (isse khoya data ghata), aur <b>region B mein kitna pehle se chalu hai</b> (isse wapsi tez hui).</p>
     <p>Is level mein dono knob ko aakhir tak ghumayenge — aur dekhenge ki har kadam ki keemat kya hai.</p>
     <p class="tip">👉 Chaar slow motion hain. Har ek mein ek hi sawaal poochhte rehna: <b>isse kaunsa nuksaan ghata, aur iske liye roz kya dena pada?</b></p>`,
  ],
  stages: [
    /* ---------------- 1. chaar tareeke ---------------- */
    {
      type: 'dryrun',
      title: '👣 Chaar tareeke, ek hi aafat',
      goal: 'Wahi orders, wahi 4.00 s par region A ka jaana, wahi copy (har 1 s). Ab region B mein aur zyada cheezein pehle se chalu hain. Dekho <b>orders kitni jaldi phir chale</b> — aur <b>kya nahi badla</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'bday', label: 'Aam din region B mein kya chalu' },
        { id: 'back', label: 'Orders phir se chale (A ke jaane ke baad)' },
        { id: 'fail', label: 'Fail hue orders' },
        { id: 'lost', label: '"Ho gaya" mila, par kho gaye' },
      ],
      steps: [
        {
          clock: 'teesra tareeka',
          say: 'Pichhle level mein region B ka DB chalu tha, par app band. Failover ke baad app ko chalu hone mein 3 second lage.<br><br>Agla sujhaav: <b>"B mein ek chhota app bhi pehle se chalu rakho."</b> Chhota, kyunki bada app roz ka poora kharcha hai. Yeh chhota app 1 second mein <b>1 hi order</b> le sakta hai; failover ke 2 second baad is app ko bada kiya jaa sakta hai.',
          nodes: { rt: { tone: 'ok', badge: 'sab A par' }, a: { tone: 'ok', badge: 'chal raha hai' }, b: { tone: 'idle', badge: 'DB + chhota app' }, s3: { tone: 'idle', badge: '' } },
          vars: { bday: 'DB + ek chhota app', back: '?', fail: '?', lost: '?' },
          ask: {
            q: 'Lab mein orders har 0.5 s par aate hain. B ka chhota app 1 s mein ek order leta hai. B bada hone tak kya dikhega?',
            choices: [
              'Ek order chalega, agla fail hoga; B abhi poora traffic nahi le sakta',
              'Dono orders chalenge; app khula hai toh poora traffic apne aap le sakta hai',
              'Dono orders fail honge; chhota app bada hone se pehle koi order nahi le sakta',
              'Dono orders rukenge; router extra orders jama karke baad mein bhej sakta hai',
            ],
            answer: 0,
            hint: 'Ek second mein kitne orders aate hain? B ek second mein kitne orders le sakta hai?',
            explain: 'Lab mein B failover par pehla order leta hai. Agla order aadhe second baad aata hai, par chhota app ek second se pehle agla order nahi leta. B bada hone tak ek order chalta hai, agla fail: #12 safal, #13 fail, #14 safal, #15 fail.',
            choiceExplanations: [
              'Lab mein B failover par pehla order leta hai. Agla order aadhe second baad aata hai, par chhota app ek second se pehle agla order nahi leta. B bada hone tak ek order chalta hai, agla fail: #12 safal, #13 fail, #14 safal, #15 fail.',
              'App chalu hona aur poore traffic ki capacity hona alag hain. Abhi B aane wale aadhe orders hi le sakta hai.',
              'Chhota app kuch kaam kar sakta hai. Lab mein B bada hone se pehle #12 aur #14 safal hote hain.',
              'Lab ka router extra orders jama nahi karta. B ki capacity na mile toh order fail hota hai.',
            ],
          },
        },
        {
          clock: '5.50–7.50 s',
          say: 'Failover hote hi region B ne orders lena shuru kar diya — par aadhe. Kul fail: #10, #11 (router ko pata chalne se pehle), aur #13, #15 (chhote app ki wajah se). <b>4 orders.</b><br><br>Kho gaya: #9 — wahi jo pichhli baar khoya tha.',
          flows: [{ from: 'rt', to: 'b', label: '#13 ✗', tone: 'slow' }],
          nodes: { rt: { tone: 'slow', badge: 'sab B par' }, a: { tone: 'bad', badge: 'gaya' }, b: { tone: 'slow', badge: 'chhota app: aadhe' } },
          vars: { back: '3.50 s baad (poori tarah)', fail: '4 (#10, #11, #13, #15)', lost: '1 (#9)' },
        },
        {
          clock: 'chautha tareeka',
          say: 'Aakhri kadam: <b>dono region poore chalu</b>, aur router aam din bhi orders baari-baari dono ko bhejta hai: #1 → A, #2 → B, #3 → A… Dono region ek-doosre ko har 1 second par copy bhejte hain.',
          flows: [{ from: 'rt', to: 'a', label: '#9', tone: 'ok' }, { from: 'rt', to: 'b', label: '#10', tone: 'ok' }],
          nodes: { rt: { tone: 'ok', badge: 'baari-baari: A, B' }, a: { tone: 'ok', badge: 'poora chalu' }, b: { tone: 'ok', badge: 'poora chalu' } },
          vars: { bday: 'poora region, aadha traffic', back: '?', fail: '?', lost: '?' },
          ask: {
            q: 'A 4.00 s par gaya. Router ko 5.50 s par pata chalega. #10 B ki baari par aur #11 A ki baari par aate hain. Kya hoga?',
            choices: [
              '#10 safal hoga aur #11 fail; router abhi dono regions mein baari ghuma raha hai',
              'Dono safal honge; pehla order A par fail hote hi router saara traffic B ko dega',
              'Dono fail honge; A ka jawab na mile toh router B ki baari ko bhi rok deta hai',
              '#10 fail hoga aur #11 safal; router fail order ko agle region par phir bhejta hai',
            ],
            answer: 0,
            hint: 'Health check ka faisla abhi baaki hai. Dono orders apni baari par kis region ko milenge?',
            explain: 'Router ko abhi A ke jaane ka pata nahi, toh baari-baari wala niyam chalta hai. B theek hai, isliye #10 safal. #11 band A par jaata hai, isliye fail. Lab har nakaam request ko B par dobara nahi bhejta.',
            choiceExplanations: [
              'Router ko abhi A ke jaane ka pata nahi, toh baari-baari wala niyam chalta hai. B theek hai, isliye #10 safal. #11 band A par jaata hai, isliye fail. Lab har nakaam request ko B par dobara nahi bhejta.',
              'Router pehle nakaam order se saara traffic nahi badalta. Router teen lagataar nakaam health checks ka intezaar karta hai.',
              'B theek chal raha hai. A ka fail hona B ki baari ko nahi rokta.',
              'Lab mein har nakaam order ko agle region par phir bhejne ka niyam nahi hai. B ki baari ka #10 bhi safal hota hai.',
            ],
          },
        },
        {
          clock: 'chaaron ek saath',
          say: `Slow motion ke chaaron tareeke (region A 4.00 s par gaya; router ko 5.50 s par pata chala):
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Aam din region B mein chalu</th><th>Phir se chale</th><th>Fail</th><th>Kho gaye</th></tr>
              <tr><td>Sirf backup (har 3 s)</td><td>kuch nahi</td><td>7.50 s baad</td><td>14</td><td>3</td></tr>
              <tr><td>Copy har 1 s + B ka DB</td><td>DB</td><td>4.50 s baad</td><td>8</td><td>1</td></tr>
              <tr><td>Copy + B mein chhota app</td><td>DB + chhota app</td><td>3.50 s baad</td><td>4</td><td>1</td></tr>
              <tr><td>Dono region poore chalu</td><td>poora region</td><td>1.50 s baad</td><td>1</td><td>1</td></tr>
            </table></div>
            Upar se neeche: wapsi tez hoti gayi, aur "aam din B mein chalu" badhta gaya.`,
          nodes: { rt: { tone: 'ok', badge: 'chaar tareeke' }, a: { tone: 'bad', badge: 'gaya' }, b: { tone: 'ok', badge: 'kitna chalu?' } },
          vars: { bday: 'kuch nahi → DB → DB + chhota app → poora', back: '7.50 → 4.50 → 3.50 → 1.50 s', fail: '14 → 8 → 4 → 1', lost: '3 → 1 → 1 → 1' },
          ask: {
            q: 'Aakhri teen tareekon mein B ki taiyaari badhi, par khoya order #9 hi raha. Kaunsa intezaam nahi badla tha?',
            choices: [
              'Har ek second par copy gayi; B ka app bada karne se copy jaldi nahi pahunchi',
              'B ka app har baar utna hi chhota raha; app bada hone se hi naya data bach sakta tha',
              'Router har baar utna hi ruka; router jaldi badalta toh gayi copy phir mil jaati',
              'A ke orders boot hone par hatte rahe; B chalu karne se naya data phir mit jaata tha',
            ],
            answer: 0,
            hint: 'Table ke saath copy ki ghadi bhi dekho. B ki taiyaari badli, par copy ka fasla badla tha?',
            explain: 'Teenon slow-motion runs mein copy har 1 s par thi. #9 copy ke baad aaya aur A ke saath gaya. B mein app chalu ya bada karne se traffic jaldi sambhla, par #9 ki copy pehle nahi gayi. Data ki taazgi aur app ki taiyaari alag cheezein hain.',
            choiceExplanations: [
              'Teenon slow-motion runs mein copy har 1 s par thi. #9 copy ke baad aaya aur A ke saath gaya. B mein app chalu ya bada karne se traffic jaldi sambhla, par #9 ki copy pehle nahi gayi. Data ki taazgi aur app ki taiyaari alag cheezein hain.',
              'B ka app badla tha: band, chhota, phir poora. Data ka nuksaan copy ka samay badle bina wahi raha.',
              'Router ko jaldi pata chalna aage ke traffic ko bacha sakta hai. A ke saath ja chuka #9 router wapas nahi la sakta.',
              'B ka app boot hone se pehle ke orders nahi mitte. #9 B tak pahuncha hi nahi tha.',
            ],
          },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein chaaron tareeke, asli raftaar par: 50 orders/second, region A 4 second par gaya. (Teen run. Lab ke second asli duniya ke ghanton aur minuton ki jagah hain.)
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Aam din B mein chalu</th><th>Fail hote rahe</th><th>Fail orders</th><th>Kho gaye</th></tr>
              <tr><td>Sirf backup</td><td>kuch nahi</td><td>16.3–16.4 s</td><td>680–689</td><td>50</td></tr>
              <tr><td>Copy + B ka DB</td><td>DB</td><td>6.4–6.5 s</td><td>283–286</td><td>5</td></tr>
              <tr><td>Copy + chhota app</td><td>DB + chhota app</td><td>4.0–4.5 s</td><td>112–133</td><td>5</td></tr>
              <tr><td>Dono region poore chalu</td><td>poora region</td><td><b>1.0–1.5 s</b></td><td><b>25–37</b></td><td>2–3</td></tr>
            </table></div>
            Aakhri row mein bhi "kho gaye" zero nahi hai.`,
          nodes: { rt: { tone: 'ok', badge: 'lab: 1.0–1.5 s' }, b: { tone: 'ok', badge: 'lab: 2–3 kho gaye' } },
          vars: { bday: 'lab: chaaron', back: 'lab: 16.3–16.4 s → 1.0–1.5 s', fail: 'lab: 680–689 → 25–37', lost: 'lab: 50 → 2–3' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> wapsi ka samay = <b>pata chalna</b> + region B ko jo <b>banana, chalu karna ya bada karna</b> pade. B mein jitna zyada pehle se chalu, yeh samay utna kam — aur roz ka kharcha utna zyada. Khoya data ek alag knob se ghat-ta hai: copy ki raftaar se.',
    },

    /* ---------------- 2. "ho gaya" pehle ya copy pehle ---------------- */
    {
      type: 'dryrun',
      title: '⏳ "Ho gaya" pehle, ya copy pehle?',
      goal: 'Ab doosra knob aakhir tak. Region A se region B tak ek chakkar mein 0.20 second lagte hain. Dekho ki "ho gaya" kab bola jaata hai — aur region A ke jaate hi kaun khota hai.',
      vars: [
        { id: 'how', label: 'Tareeka' },
        { id: 'ack', label: '"Ho gaya" kehne mein' },
        { id: 'lost', label: 'A gaya: "ho gaya" mila, par B mein nahi' },
        { id: 'bdown', label: 'B tak pahunchna band (A theek): fail hue' },
      ],
      steps: [
        {
          clock: 'ek line ka farak',
          say: 'Ab tak region A order rakhte hi "ho gaya" keh deta tha, aur copy baad mein jaati thi. Isiliye jo orders "raaste mein" the, yeh orders A ke saath gaye.<br><br>Sujhaav: <b>"Ho gaya" tabhi bolo jab region B ne order rakh liya ho.</b>',
          vars: { how: '—', ack: '—', lost: '—', bdown: '—' },
          ask: {
            q: 'B tak ek chakkar 0.20 s leta hai. Ab B ke jawab ke baad hi "ho gaya" bolna hai. Roz ke orders par kya asar padega?',
            choices: [
              'Har order B ke jawab tak rukega; B na mile toh A theek hote hue bhi order fail hoga',
              'Har order pehle jitni jaldi chalega; bas B mein copy rakhne ka roz ka kharcha badhega',
              'Har order pehle se jaldi chalega; B ki copy se A mein order rakhna ab bach jaayega',
              'Har order ko turant jawab milega; B ka jawab baad mein copy ki ghadi par dekhenge',
            ],
            answer: 0,
            hint: '"Ho gaya" ke liye ab kis jawab ki zaroorat hai? B ka jawab na aaye toh kya poora nahi hoga?',
            explain: '"Ho gaya" se pehle B ka jawab chahiye, toh tay ghadi wale model mein har safal order 0.20 s rukta hai. B ka jawab na aaye toh A safal nahi keh sakta. Do keematein hain: har order par intezaar aur B ke raaste par nirbharta.',
            choiceExplanations: [
              '"Ho gaya" se pehle B ka jawab chahiye, toh tay ghadi wale model mein har safal order 0.20 s rukta hai. B ka jawab na aaye toh A safal nahi keh sakta. Do keematein hain: har order par intezaar aur B ke raaste par nirbharta.',
              'Copy ka kharcha akela farak nahi. Ab grahak ka jawab bhi B ke jawab tak rukega.',
              'Lab mein B ka jawab milne ke baad A order apne paas bhi rakhta hai. B ka chakkar extra intezaar hai.',
              'Turant "ho gaya" aur baad mein copy purana tareeka tha. Naye niyam mein B ka jawab pehle chahiye.',
            ],
          },
        },
        {
          clock: 'pehle "ho gaya"',
          say: `Pehle purana tareeka. Is baar region A 3.10 s par jaata hai:
            <pre>3.00 s  📦 copy shuru: A → B   #5, #6
3.00 s  #7  aaya → "ho gaya" ✓ turant   A mein: 7 · B mein: 4 · raaste mein: 3
3.10 s  💥 region A gaya — "ho gaya" mil chuka par B tak nahi pahunche: #5–#7 (copy raaste mein thi: #5, #6 · list mein the: #7)</pre>
            Har "ho gaya" turant mila (0.00 s). Par <b>3 orders</b> kho gaye: do jinki copy raaste mein thi, aur ek jo abhi list mein tha.`,
          vars: { how: 'pehle "ho gaya", copy baad mein', ack: '0.00 s (turant)', lost: '3 (#5–#7)' },
        },
        {
          clock: 'pehle copy',
          say: `Ab naya tareeka:
            <pre>0.00 s  #1  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)
0.20 s  #1  → "ho gaya" ✓ (0.20 s baad)   A mein: 1 · B mein: 1 · raaste mein: 0</pre>
            Har order 0.20 second ruka. "Raaste mein" hamesha 0.<br><br>3.00 s par #7 aaya aur B ke jawab ka intezaar karne laga. 3.10 s par region A gaya.`,
          vars: { how: 'pehle copy, phir "ho gaya"', ack: '0.20 s (har order)', lost: '?' },
          ask: {
            q: 'A ke jaane tak #7 ka jawab nahi mila tha. "Ho gaya mila, par B mein nahi" wali ginti mein #7 aayega?',
            choices: [
              'Nahi; #7 ko "ho gaya" nahi mila, toh #7 "ho gaya" wale khoye orders mein nahi aata',
              'Haan; grahak ne #7 bhej diya tha, toh bhejna hi "ho gaya" milne ke barabar hai',
              'Haan; #7 aane ke baad A chala gaya, toh #7 ko "ho gaya" mila hua maan sakte hain',
              'Nahi; jawab na milna pakka saboot hai ki #7 B mein kisi haal mein nahi pahunch saka',
            ],
            answer: 0,
            hint: 'Khoye orders ki ginti ke liye do shartein dekho. #7 ke baare mein kaunsi shart maloom hai?',
            explain: 'Lab mein khoya order tab gina jaata hai jab "ho gaya" mila, par order B mein nahi. #7 ko "ho gaya" nahi mila, toh #7 ginti mein nahi aata. Asli app mein jawab na milne se order ka asar na hona pakka nahi hota; status dekho ya wahi order number dekar dobara bhejo, taaki do orders na ban jaayein.',
            choiceExplanations: [
              'Lab mein khoya order tab gina jaata hai jab "ho gaya" mila, par order B mein nahi. #7 ko "ho gaya" nahi mila, toh #7 ginti mein nahi aata. Asli app mein jawab na milne se order ka asar na hona pakka nahi hota; status dekho ya wahi order number dekar dobara bhejo, taaki do orders na ban jaayein.',
              'Grahak ka order bhejna aur server ka "ho gaya" kehna alag hain. Ginti ke liye server ka safal jawab chahiye.',
              'A ke jaane se #7 apne aap "ho gaya" wala order nahi ban jaata. #7 ka safal jawab nahi mila.',
              'Jawab kho sakta hai jabki order doosri taraf pahunch chuka ho. Bina status jaanche naya order bhejne se do orders ban sakte hain.',
            ],
          },
        },
        {
          clock: 'B tak pahunchna band',
          say: 'Ab doosri keemat. Region A <b>bilkul theek</b> hai. Par 2.00 s se 4.00 s tak region B tak pahunchna band ho gaya (network ki gadbad).',
          vars: { lost: '0', bdown: '?' },
          ask: {
            q: '"Pehle copy" wale lab mein B 2 s tak nahi milta, A theek hai. B band hone ke dauraan aaye orders ka kya hoga?',
            choices: [
              'B ka jawab na milne par orders fail honge; A akela "ho gaya" nahi keh sakta',
              'A theek hone par orders safal honge; B ka jawab na mile toh bhi farak nahi padta',
              'Orders router mein jama honge; B lautne par router sabko safal jawab de sakta hai',
              'Orders A mein safal honge; B ka jawab na mile toh A purane tareeke par lautega',
            ],
            answer: 0,
            hint: 'Order safal kehne ke liye dono regions mein se kis-kis ka kaam poora hona chahiye?',
            explain: 'Lab mein A har order ke liye B ka jawab maangta hai. B nahi milta toh 0.40 s ke tay intezaar ke baad #5–#8 fail hote hain. A theek hai, par B ka jawab milne ki shart poori nahi hui. Lab chupke se "pehle ho gaya" par nahi laut-ta.',
            choiceExplanations: [
              'Lab mein A har order ke liye B ka jawab maangta hai. B nahi milta toh 0.40 s ke tay intezaar ke baad #5–#8 fail hote hain. A theek hai, par B ka jawab milne ki shart poori nahi hui. Lab chupke se "pehle ho gaya" par nahi laut-ta.',
              'A ki sehat B ke jawab ki jagah nahi le sakti. "Pehle copy" ka niyam B ka jawab maangta hai.',
              'Lab ke router mein orders bachakar baad mein chalane ki queue nahi hai. Har order ka apna nakaam jawab aata hai.',
              'Mode apne aap nahi badalta. B ke jawab ke bina "ho gaya" bolna naya vaada tod dega.',
            ],
          },
        },
        {
          clock: 'dono tareeke, dono gadbad',
          say: `<div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>"Ho gaya" kehne mein</th><th>A gaya: kho gaye</th><th>B tak pahunchna band: fail</th></tr>
              <tr><td>Pehle "ho gaya", copy baad mein</td><td>0.00 s</td><td>3 (#5–#7)</td><td><b>0</b></td></tr>
              <tr><td>Pehle copy, phir "ho gaya"</td><td>0.20 s</td><td><b>0</b></td><td>4 (#5–#8)</td></tr>
            </table></div>
            Pehle tareeke mein B ke band rehne ke dauraan koi order fail nahi hua — par "raaste mein" ki list <b>7</b> tak badh gayi. Region A usi pal chala jaata, toh saaton jaate.`,
          vars: { how: 'dono', ack: '0.00 s banaam 0.20 s', lost: '3 banaam 0', bdown: '0 banaam 4' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi, asli raftaar par: 50 orders/second, region B tak ek chakkar 40 ms (nakli), region A 2.5 second par gaya. (Teen run.)
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Ek order ka beech ka samay</th><th>Kho gaye</th><th>B tak pahunchna band: fail</th></tr>
              <tr><td>Pehle "ho gaya"</td><td>2 ms</td><td>5</td><td>0 / 75</td></tr>
              <tr><td>Pehle copy</td><td>45 ms</td><td><b>0</b></td><td><b>75 / 75</b></td></tr>
            </table></div>
            Ek aur naap: "pehle ho gaya" wale tareeke mein jab region A theek usi waqt gaya jab B tak pahunchna band tha, tab <b>80–81 orders</b> kho gaye (aam din: 5).`,
          vars: { how: 'lab: dono', ack: 'lab: 2 ms banaam 45 ms', lost: 'lab: 5 banaam 0', bdown: 'lab: 0 banaam 75 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> zero khoya data muft nahi hai. "Pehle copy" mein har order doosre region ka chakkar lagata hai, aur doosre region ki har gadbad pehle region ki gadbad ban jaati hai.<br>"Pehle copy" ka naam: <b>synchronous replication</b>. "Pehle ho gaya" ka naam: <b>asynchronous replication</b>.',
    },

    /* ---------------- 3. purana pata ---------------- */
    {
      type: 'dryrun',
      title: '🧭 Failover ho gaya, par grahak purane pate par',
      goal: 'Ab tak router beech mein khada tha aur ek pal mein badal jaata tha. Asli duniya mein aisa aksar nahi hota. <b>Yeh slow motion ek model hai, asli DNS nahi</b> — par baat wahi hai. Region B yahan pehle se tayyar hai.',
      vars: [
        { id: 'ttl', label: 'Grahak pata kitni der yaad rakhta hai' },
        { id: 'g', label: 'Har grahak kab phir safal hua' },
        { id: 'total', label: 'Kul fail hue orders' },
      ],
      steps: [
        {
          clock: 'pata, aur uski yaad',
          say: 'Asli duniya mein grahak ka phone pehle poochhta hai: "KhanaKart kahan hai?" Jawab mein ek <b>pata</b> milta hai. Phone yeh pata kuch der <b>yaad</b> rakhta hai, aur us dauraan dobara nahi poochhta.<br><br>Failover ka matlab yahan: "KhanaKart kahan hai?" ka jawab badal ke region B ho gaya. Jawab 5.50 s par badla.',
          vars: { ttl: '6 second', g: '—', total: '—' },
          ask: {
            q: 'Model mein grahak-1 ne 5.00 s par A ka pata liya, 6 s ke liye. DNS 5.50 s par B ho gaya. Grahak kab naya pata poochhega?',
            choices: [
              '11.00 s par; grahak chhe second purana jawab rakhne ke baad dobara poochhega',
              '5.50 s par; DNS mein naya jawab aate hi grahak ka rakha hua pata badal jaayega',
              '6.00 s par; chhe second ki yaad sab grahakon mein ek hi ghadi par khatam hogi',
              '5.00 s par; A ka nakaam jawab grahak ko turant rakha hua pata hatane ko kahega',
            ],
            answer: 0,
            hint: 'Jawab milne ka pal aur jawab yaad rakhne ki muddat jodo.',
            explain: 'Model mein grahak 5.00 s par mila pata 6 s rakhta hai: 5 + 6 = 11.00 s. 11.00 s par dobara poochhkar B milta hai. DNS ka jawab badalne se rakha hua jawab turant nahi badalta. Model asli DNS, resolver ya phone ka naapa hua bartav nahi hai.',
            choiceExplanations: [
              'Model mein grahak 5.00 s par mila pata 6 s rakhta hai: 5 + 6 = 11.00 s. 11.00 s par dobara poochhkar B milta hai. DNS ka jawab badalne se rakha hua jawab turant nahi badalta. Model asli DNS, resolver ya phone ka naapa hua bartav nahi hai.',
              'Naya DNS jawab grahak ke paas apne aap nahi pahunchta. Grahak ko dobara poochhna padega.',
              'Yaad ka samay har grahak ke jawab lene se gino. Grahak-1 ne jawab 5.00 s par liya tha.',
              'Model mein nakaam request par pata bhoolne ka niyam nahi hai. Grahak yaad ka samay poora hone tak A par jaata hai.',
            ],
          },
        },
        {
          clock: 'lambi yaad (6 s)',
          say: `Teen grahak, teeno ne alag-alag pal par pata poochha tha:
            <ul>
              <li><b>grahak-2</b> ne 7.00 s par dobara poochha → B. 5 orders fail.</li>
              <li><b>grahak-3</b> ne 9.00 s par → B. 9 orders fail.</li>
              <li><b>grahak-1</b> ne 11.00 s par → B. 13 orders fail.</li>
            </ul>
            Kul <b>27 orders</b> fail. Region B poore waqt tayyar baitha tha.`,
          vars: { g: '7.00 s · 9.00 s · 11.00 s', total: '27' },
        },
        {
          clock: 'chhoti yaad (1 s)',
          say: `Wahi sab, par phone pata sirf 1 second yaad rakhta hai:
            <div class="dr-scroll"><table>
              <tr><th>Yaad</th><th>Kul fail</th><th>Sabse der se lauta grahak</th></tr>
              <tr><td>6 second</td><td>27</td><td>jawab badalne ke 5.50 s baad</td></tr>
              <tr><td>1 second</td><td><b>8</b></td><td>jawab badalne ke 0.50 s baad</td></tr>
            </table></div>
            Chhoti yaad mein bhi 8 orders fail hue. In 8 mein se 6 us waqt ke hain jab jawab badla hi nahi tha (region A 4.00 s par gaya; jawab 5.50 s par badla). Pata chalne ka samay yaad chhoti karne se nahi ghat-ta.`,
          vars: { ttl: '6 s banaam 1 s', g: 'jawab badalne ke 5.50 s baad banaam 0.50 s baad', total: '27 banaam 8' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> wapsi ke samay mein ek teesri cheez bhi judti hai: <b>grahak kitni der purana pata yaad rakhta hai</b>. Region B tayyar ho tab bhi, purane pate wale grahak fail hote rehte hain. Is yaad ki muddat ka naam: <b>TTL</b>.',
    },

    /* ---------------- 4. galti bhi copy ho jaati hai ---------------- */
    {
      type: 'dryrun',
      title: '🧨 Galti bhi copy ho jaati hai',
      goal: 'Is baar koi region nahi jaata. Region A bilkul theek hai. Bas ek insaan se galti hoti hai. Dekho ki lagataar copy is galti ke saath kya karti hai.',
      vars: [
        { id: 'a', label: 'Region A mein orders' },
        { id: 'b', label: 'Region B (lagataar copy) mein' },
        { id: 's3', label: 'Purane backup' },
        { id: 'back', label: 'Wapas aaye' },
      ],
      steps: [
        {
          clock: '7.75 s',
          say: 'Region A mein 16 orders hain. Region B mein har 1 second par copy jaati hai: abhi 14 pahunche hain.<br><br>7.75 s par kisi ne region A par galat command chala di: <b>"saare orders mita do."</b> Region A mein ab 0 orders.',
          vars: { a: '0 (pehle 16 the)', b: '14', s3: 'koi nahi', back: '—' },
          ask: {
            q: 'A par "saare orders mita do" chala. B mein abhi 14 orders hain. Lab ki agli copy 8.00 s par kya karegi?',
            choices: [
              'Mitane ka badlaav B par bhi lagega; B mein rakhe purane orders bhi mit jaayenge',
              'B alag region hai toh purane orders bachenge; mitane ka badlaav sirf A par rahega',
              'B mitane ko galti samajhkar rokega; sirf naye orders ko B mein aane diya jaayega',
              'B copy ki ghadi band kar dega; mitane ka badlaav aane par agla batch ruk jaayega',
            ],
            answer: 0,
            hint: 'Copy mein sirf naye orders jaate hain, ya A par kiya gaya har badlaav?',
            explain: 'Lab ka replicator order jodne aur orders mitane, dono ko badlaav maanta hai. 8.00 s ki copy mein mitane ka badlaav B tak jaata hai; purane 14 orders nahi bachte. Alag region galat command se apne aap nahi bachata. S3 ke delete-marker niyam alag hain; agle setup level mein configuration dekhenge.',
            choiceExplanations: [
              'Lab ka replicator order jodne aur orders mitane, dono ko badlaav maanta hai. 8.00 s ki copy mein mitane ka badlaav B tak jaata hai; purane 14 orders nahi bachte. Alag region galat command se apne aap nahi bachata. S3 ke delete-marker niyam alag hain; agle setup level mein configuration dekhenge.',
              'Alag region A ki machines ke jaane se bacha sakta hai. A ka bheja mitane ka badlaav phir bhi B par lagta hai.',
              'Replicator ko command chalane wale ki niyat pata nahi. Lab mein galti pehchaan kar rokne ka niyam nahi hai.',
              'Mitane ka badlaav copy band karne ka signal nahi. Agla batch B par aam badlaav ki tarah lagta hai.',
            ],
          },
        },
        {
          clock: 'sirf copy thi',
          say: 'Galti 10.25 s par pakdi gayi. Tab tak purane orders na region A mein the, na region B mein.<br><br>Region ke jaane se copy bachati hai. Par is baar region gaya hi nahi tha — aur copy ne galti ko poori wafadaari se doosri jagah pahuncha diya.',
          vars: { b: '0 (8.00 s par mit gaye)', back: '0 — 16 orders gaye' },
        },
        {
          clock: 'copy + purane backup',
          say: `Wahi sab, par saath mein har 3 second ka backup bhi hai — aur purane backup <b>rakhe jaate hain</b>, mitaye nahi jaate:
            <pre>10.25 s  🔎 galti pakdi gayi. S3 mein 3 snapshot hain: 3.00 s (6 order) · 6.00 s (12 order) · 9.00 s (2 order)</pre>`,
          vars: { a: '0 (pehle 16 the)', b: '0', s3: '3.00 s (6) · 6.00 s (12) · 9.00 s (2)', back: '?' },
          ask: {
            q: 'Galti 7.75 s par hui. Backup 3.00, 6.00 aur 9.00 s ke hain. Galti se pehle ke zyada se zyada orders kaise lautayoge?',
            choices: [
              '6.00 s wala backup laao; galti se pehle ka sabse naya saaf haal milta hai',
              '9.00 s wala backup laao; sabse naya backup mit chuke orders bhi laata hai',
              '3.00 s wala backup laao; sabse purana backup sabse kam data khone deta hai',
              'Teenon backup mila do; kaunse orders sahi hain, backup khud chun leta hai',
            ],
            answer: 0,
            hint: 'Galti se pehle kaunsa backup sabse baad mein bana?',
            explain: '6.00 s galti se pehle ka aakhri backup hai: #1–#12 wapas milte hain. 9.00 s wale backup mein mitane ke baad ka haal hai. 3.00 s wale mein kam purane orders hain. Bina alag jaanch ke backup mila dene se sahi haal apne aap nahi banta.',
            choiceExplanations: [
              '6.00 s galti se pehle ka aakhri backup hai: #1–#12 wapas milte hain. 9.00 s wale backup mein mitane ke baad ka haal hai. 3.00 s wale mein kam purane orders hain. Bina alag jaanch ke backup mila dene se sahi haal apne aap nahi banta.',
              '9.00 s ka backup galti ke baad bana. Purane orders mitne ke baad ka naya data purane orders wapas nahi laata.',
              '3.00 s tak sirf #1–#6 backup mein the. 6.00 s wala saaf backup #7–#12 bhi bacha sakta hai.',
              'Backup sahi aur galat badlaav khud nahi chunta. Milane ke liye order aur mitane ke niyam alag se tay karne padenge.',
            ],
          },
        },
        {
          clock: 'nateeja',
          say: `<div class="dr-scroll"><table>
              <tr><th>Bachav</th><th>Wapas aaye (16 mein se)</th><th>Nahi mil sake</th></tr>
              <tr><td>Sirf lagataar copy</td><td>0</td><td>16</td></tr>
              <tr><td>Lagataar copy + purane backup</td><td><b>12</b></td><td>4 (#13–#16)</td></tr>
            </table></div>
            #13 se #16 isliye nahi mile ki yeh 6.00 s ke backup ke baad likhe gaye the.`,
          vars: { s3: '6.00 s wala chalaya', back: '12 wapas · 4 nahi mile (#13–#16)' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> lagataar copy <b>region ke jaane</b> se bachati hai. Purane backup <b>galti</b> se bachate hain. Yeh do alag kaam hain; ek doosre ki jagah nahi le sakta.',
    },

    /* ---------------- 5. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — teen slow motion, apni machine par',
      project: '40-disaster-recovery',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi chalao: chhota app, "pehle copy" jab B tak pahunchna band ho, aur galti ke baad backup se wapsi.',
      why: '<code>lib/replicator.js</code> = copy ka niyam; <code>lib/failover.js</code> = router ka faisla. Chaaron slow motion tools yahi do files chalate hain. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Ghadi tay hai, isliye tumhara output dry run se milega. <code>--fast</code> lagao toh tool bina ruke chalta hai.',
      steps: [
        { text: 'Region B mein chhota app. 6.00 s aur 7.00 s wali lines dekho.', cmd: 'cd docker-labs/40-disaster-recovery && node tools/slowmo.js --mode warm', expect: "region A gaya · har 0.5 s par ek order · router har 0.5 s par A ko poochhta hai, lagataar 3 \"nahi\" → B par · A 4.00 s par gaya\nghadi nakli aur tay hai · copy: backup mein har 3 s, baaki mein har 1 s · B banane / boot / bada karne mein 6 / 3 / 2 s\n\n=== warm standby — B ka DB + chhota app (1 s mein 1 order) · failover ke baad 2 s mein bada ===\n    0.00 s  #1  → A ✓   A mein: 1 · B tak pahunche: 0 · raaste mein: 1\n    0.50 s  🩺 router ne A se poochha: theek ✓ (aage har 0.5 s par; sirf badlav dikhega)\n    0.50 s  #2  → A ✓   A mein: 2 · B tak pahunche: 0 · raaste mein: 2\n    1.00 s  📦 copy: A → B   #1, #2 (2 order)\n    1.00 s  #3  → A ✓   A mein: 3 · B tak pahunche: 2 · raaste mein: 1\n    1.50 s  #4  → A ✓   A mein: 4 · B tak pahunche: 2 · raaste mein: 2\n    2.00 s  📦 copy: A → B   #3, #4 (2 order)\n    2.00 s  #5  → A ✓   A mein: 5 · B tak pahunche: 4 · raaste mein: 1\n    2.50 s  #6  → A ✓   A mein: 6 · B tak pahunche: 4 · raaste mein: 2\n    3.00 s  📦 copy: A → B   #5, #6 (2 order)\n    3.00 s  #7  → A ✓   A mein: 7 · B tak pahunche: 6 · raaste mein: 1\n    3.50 s  #8  → A ✓   A mein: 8 · B tak pahunche: 6 · raaste mein: 2\n    4.00 s  📦 copy: A → B   #7, #8 (2 order)\n    4.00 s  #9  → A ✓   A mein: 9 · B tak pahunche: 8 · raaste mein: 1\n    4.00 s  💥 region A gaya — jo orders sirf A mein the (raaste mein), woh ab kabhi nahi pahunchenge: #9\n    4.50 s  🩺 A ✗ (lagataar fail 1/3)\n    4.50 s  #10 → A ✗ (A band hai)\n    5.00 s  🩺 A ✗ (lagataar fail 2/3)\n    5.00 s  #11 → A ✗ (A band hai)\n    5.50 s  🩺 A ✗ (lagataar fail 3/3) → FAILOVER: router ne B ko \"activate\" kaha, ab saara traffic B par\n    5.50 s  🚀 B ka chhota app chal raha hai (1 s mein 1 order) — 2 s mein bada hoga (7.50 s par)\n    5.50 s  #12 → B ✓   B mein: 9\n    6.00 s  #13 → B ✗ (B ka chhota app: 1 s mein 1 hi order)\n    6.50 s  #14 → B ✓   B mein: 10\n    7.00 s  #15 → B ✗ (B ka chhota app: 1 s mein 1 hi order)\n    7.50 s  📈 B bada ho gaya: ab poori capacity\n    7.50 s  #16 → B ✓   B mein: 11\n    8.00 s  #17 → B ✓   B mein: 12\n    8.50 s  #18 → B ✓   B mein: 13\n    9.00 s  #19 → B ✓   B mein: 14\n    9.50 s  #20 → B ✓   B mein: 15\n   10.00 s  #21 → B ✓   B mein: 16\n   10.50 s  #22 → B ✓   B mein: 17\n   11.00 s  #23 → B ✓   B mein: 18\n   11.50 s  #24 → B ✓   B mein: 19\n   12.00 s  #25 → B ✓   B mein: 20\n   12.50 s  #26 → B ✓   B mein: 21\n   13.00 s  #27 → B ✓   B mein: 22\n   nateeja → A 4.00 s par gaya · router ko pata 5.50 s par · orders phir se safal: 7.50 s par (A ke 3.50 s baad)\n             fail hue: 4 order (#10, #11, #13, #15) · \"ho gaya\" mila par B mein nahi: #9 (1 order)\n             aam din B mein: DB + ek chhota app (aadha traffic le sakta hai) — hamesha chalu" },
        { text: '"Pehle copy", aur B tak pahunchna 2 second ke liye band. Region A theek hai — phir bhi dekho #5 se #8 ka kya hua.', cmd: 'node tools/slowmo-sync.js --mode sync-b-down', expect: "pehle \"ho gaya\" ya pehle copy? · har 0.5 s par ek order · A se B tak ek chakkar 0.20 s (nakli) · async mein copy har 1 s\n\n=== sync — B 2 s ke liye unreachable ===\n    0.00 s  #1  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    0.20 s  #1  → \"ho gaya\" ✓ (0.20 s baad)   A mein: 1 · B mein: 1 · raaste mein: 0\n    0.50 s  #2  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    0.70 s  #2  → \"ho gaya\" ✓ (0.20 s baad)   A mein: 2 · B mein: 2 · raaste mein: 0\n    1.00 s  #3  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    1.20 s  #3  → \"ho gaya\" ✓ (0.20 s baad)   A mein: 3 · B mein: 3 · raaste mein: 0\n    1.50 s  #4  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    1.70 s  #4  → \"ho gaya\" ✓ (0.20 s baad)   A mein: 4 · B mein: 4 · raaste mein: 0\n    2.00 s  💥 B tak pahunchna band (unreachable) — 2.00 s ke liye; A bilkul theek hai\n    2.00 s  #5  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    2.40 s  #5  → ✗ FAIL (0.40 s baad): B ka jawab nahi aaya · \"ho gaya\" NAHI bola   A mein: 4 · B mein: 4 · raaste mein: 0\n    2.50 s  #6  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    2.90 s  #6  → ✗ FAIL (0.40 s baad): B ka jawab nahi aaya · \"ho gaya\" NAHI bola   A mein: 4 · B mein: 4 · raaste mein: 0\n    3.00 s  #7  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    3.40 s  #7  → ✗ FAIL (0.40 s baad): B ka jawab nahi aaya · \"ho gaya\" NAHI bola   A mein: 4 · B mein: 4 · raaste mein: 0\n    3.50 s  #8  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    3.90 s  #8  → ✗ FAIL (0.40 s baad): B ka jawab nahi aaya · \"ho gaya\" NAHI bola   A mein: 4 · B mein: 4 · raaste mein: 0\n    4.00 s  ✅ B wapas\n    4.00 s  #9  aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    4.20 s  #9  → \"ho gaya\" ✓ (0.20 s baad)   A mein: 5 · B mein: 5 · raaste mein: 0\n    4.50 s  #10 aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    4.70 s  #10 → \"ho gaya\" ✓ (0.20 s baad)   A mein: 6 · B mein: 6 · raaste mein: 0\n    5.00 s  #11 aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    5.20 s  #11 → \"ho gaya\" ✓ (0.20 s baad)   A mein: 7 · B mein: 7 · raaste mein: 0\n    5.50 s  #12 aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    5.70 s  #12 → \"ho gaya\" ✓ (0.20 s baad)   A mein: 8 · B mein: 8 · raaste mein: 0\n    6.00 s  #13 aaya → B ko bheja; jawab ka intezaar … (A mein abhi nahi rakha)\n    6.20 s  #13 → \"ho gaya\" ✓ (0.20 s baad)   A mein: 9 · B mein: 9 · raaste mein: 0\n   nateeja → \"ho gaya\" mila: 9 order · ho gaya kehne mein: har baar 0.20 s\n             A poora waqt theek raha · sabse badi waiting list: 0 order (A usi pal jaata toh itne order jaate) · fail hue: 4 order (#5–#8) — A ne inhe rakha hi nahi" },
        { text: 'Galti, aur backup se wapsi. 10.25 s wali teen lines dekho.', cmd: 'node tools/slowmo-galti.js --mode backup', expect: "galti bhi copy ho jaati hai · har 0.5 s par ek order · A poora waqt theek · 7.75 s par A par \"saare orders mita do\" · replica ko copy har 1 s\n\n=== replica + backup — B ko har 1 s par copy, S3 mein har 3 s par snapshot (jama hote jaate hain) ===\n    0.00 s  #1  → A ✓   A mein: 1 · B mein: 0 · raaste mein: 1\n    0.50 s  #2  → A ✓   A mein: 2 · B mein: 0 · raaste mein: 2\n    1.00 s  📦 copy: A → B   #1, #2 (2 badlav)\n    1.00 s  #3  → A ✓   A mein: 3 · B mein: 2 · raaste mein: 1\n    1.50 s  #4  → A ✓   A mein: 4 · B mein: 2 · raaste mein: 2\n    2.00 s  📦 copy: A → B   #3, #4 (2 badlav)\n    2.00 s  #5  → A ✓   A mein: 5 · B mein: 4 · raaste mein: 1\n    2.50 s  #6  → A ✓   A mein: 6 · B mein: 4 · raaste mein: 2\n    3.00 s  📦 copy: A → B   #5, #6 (2 badlav)\n    3.00 s  📸 snapshot #1: A → S3   6 order (#1–#6)\n    3.00 s  #7  → A ✓   A mein: 7 · B mein: 6 · raaste mein: 1\n    3.50 s  #8  → A ✓   A mein: 8 · B mein: 6 · raaste mein: 2\n    4.00 s  📦 copy: A → B   #7, #8 (2 badlav)\n    4.00 s  #9  → A ✓   A mein: 9 · B mein: 8 · raaste mein: 1\n    4.50 s  #10 → A ✓   A mein: 10 · B mein: 8 · raaste mein: 2\n    5.00 s  📦 copy: A → B   #9, #10 (2 badlav)\n    5.00 s  #11 → A ✓   A mein: 11 · B mein: 10 · raaste mein: 1\n    5.50 s  #12 → A ✓   A mein: 12 · B mein: 10 · raaste mein: 2\n    6.00 s  📦 copy: A → B   #11, #12 (2 badlav)\n    6.00 s  📸 snapshot #2: A → S3   12 order (#1–#12)\n    6.00 s  #13 → A ✓   A mein: 13 · B mein: 12 · raaste mein: 1\n    6.50 s  #14 → A ✓   A mein: 14 · B mein: 12 · raaste mein: 2\n    7.00 s  📦 copy: A → B   #13, #14 (2 badlav)\n    7.00 s  #15 → A ✓   A mein: 15 · B mein: 14 · raaste mein: 1\n    7.50 s  #16 → A ✓   A mein: 16 · B mein: 14 · raaste mein: 2\n    7.75 s  🗑️ GALTI: kisi ne A par \"saare orders mita do\" (DELETE) chala diya → A mein: 0 (pehle 16 the) · B mein abhi 14; DELETE copy ke intezaar mein hai\n    8.00 s  📦 copy: A → B   #15, #16, 🗑️ DELETE (3 badlav)\n    8.00 s  ☠️ DELETE B tak bhi pahunch gayi: B ke saare orders gaye (14 → 0) — B ne galti ko bhi sahi badlav maana\n    8.00 s  #17 → A ✓   A mein: 1 · B mein: 0 · raaste mein: 1\n    8.50 s  #18 → A ✓   A mein: 2 · B mein: 0 · raaste mein: 2\n    9.00 s  📦 copy: A → B   #17, #18 (2 badlav)\n    9.00 s  📸 snapshot #3: A → S3   2 order (#17, #18) — galti ke BAAD ka haal\n    9.00 s  #19 → A ✓   A mein: 3 · B mein: 2 · raaste mein: 1\n    9.50 s  #20 → A ✓   A mein: 4 · B mein: 2 · raaste mein: 2\n   10.00 s  📦 copy: A → B   #19, #20 (2 badlav)\n   10.00 s  #21 → A ✓   A mein: 5 · B mein: 4 · raaste mein: 1\n   10.25 s  🔎 galti pakdi gayi. S3 mein 3 snapshot hain: 3.00 s (6 order) · 6.00 s (12 order) · 9.00 s (2 order)\n   10.25 s  🛟 restore: sabse naya snapshot (9.00 s) galti ke BAAD ka hai, wapas nahi chalega. Galti se pehle ka aakhri: 6.00 s wala → 12 order wapas (#1–#12)\n   10.25 s     nahi mil sakte: #13–#16 (4 order) — 6.00 s ke baad likhe gaye the, kisi snapshot mein gaye hi nahi\n   10.50 s  #22 → A ✓   A mein: 18 · B mein: 4 · raaste mein: 14\n   11.00 s  📦 copy: A → B   #21, #1–#12, #22 (14 badlav)\n   11.00 s  #23 → A ✓   A mein: 19 · B mein: 18 · raaste mein: 1\n   nateeja → galti (7.75 s) se pehle 16 orders · galti ke turant baad A mein 0 · B mein bhi 0 (8.00 s par DELETE B tak pahunchi)\n             S3 se wapas aaye: 12 order · nahi mil sake: #13–#16 (4 order) · 11.00 s par A mein 19, B mein 18 (restore + naye orders)" },
        { text: 'Purana pata (model): lambi aur chhoti yaad.', cmd: 'node tools/slowmo-dns.js' },
      ],
      observe: {
        q: 'Doosre slow motion mein A poora waqt theek tha. Phir bhi #5–#8 fail hue. Kaunsi zaroorat poori nahi ho paayi?',
        choices: [
          'A ko "ho gaya" se pehle B ka jawab chahiye tha, par B tak raasta band tha',
          'A ko order rakhne ke liye zyada capacity chahiye thi, par A ka app chhota tha',
          'Router ko B ka app pehle chalu karna tha, par orders galti se B par ja rahe the',
          'Copy ki ghadi ko pehla batch chalana tha, par har naya order ghadi taal raha tha',
        ],
        answer: 0,
        explain: '"Pehle copy" mein A safal jawab dene se pehle B ka jawab leta hai. B do second tak nahi milta, toh tay ghadi wale run mein #5–#8 fail hote hain. A ki sehat akeli kaafi nahi: order ki raah mein B ka jawab bhi chahiye.',
        choiceExplanations: [
          '"Pehle copy" mein A safal jawab dene se pehle B ka jawab leta hai. B do second tak nahi milta, toh tay ghadi wale run mein #5–#8 fail hote hain. A ki sehat akeli kaafi nahi: order ki raah mein B ka jawab bhi chahiye.',
          'Run mein badli cheez B tak pahunchna hai. A ki capacity kam hone ka koi nishaan nahi.',
          'Orders seedhe A ke "pehle copy" wale raaste se jaate hain. B ko grahak ka order lene wala app chalu karna zaroori nahi.',
          'Har order apni copy ka jawab dekhta hai. Naye orders copy ki ghadi ko aage nahi taalte.',
        ],
      },
      lesson: 'Har bachav ek nuksaan ghatata hai aur ek keemat maangta hai. Pehle likho ki kaunsa nuksaan kitna manzoor hai.',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum har bachav ki keemat bhi bata sakte ho. 🎤',
    questions: [
      {
        q: 'A akela poora chala jaaye, phir bhi "ho gaya" wale orders bachne chahiye. Kaunsa vaada aur kaunsi keemat dekhoge?',
        choices: [
          '"Ho gaya" se pehle B mein surakshit copy; har order par B ka jawab bhi chahiye',
          'Har minute B mein naya backup; beech ke orders A ke safal jawab se bach jaayenge',
          'B mein app ki capacity badhao; wahi copy ka fasla rakhne par bhi data bach jaayega',
          'Router ko pehle fail par badlo; A ki na bheji copy bhi jaldi B ko mil jaayegi',
        ],
        answer: 0,
        explain: 'A ke jaane ke baad bachne wali surakshit copy "ho gaya" se pehle chahiye. Synchronous replication mein B ka jawab grahak ke jawab se pehle aata hai. Har order par doosre region ka intezaar judta hai; B na mile toh A theek hote hue bhi writes fail ho sakti hain. Lab memory mein orders rakhta hai; production mein B ka jawab tikau storage mein copy rakhne ka saboot hai ya nahi, jaanchna padega.',
        choiceExplanations: [
          'A ke jaane ke baad bachne wali surakshit copy "ho gaya" se pehle chahiye. Synchronous replication mein B ka jawab grahak ke jawab se pehle aata hai. Har order par doosre region ka intezaar judta hai; B na mile toh A theek hote hue bhi writes fail ho sakti hain. Lab memory mein orders rakhta hai; production mein B ka jawab tikau storage mein copy rakhne ka saboot hai ya nahi, jaanchna padega.',
          'Backup ke do chakkaron ke beech A par akele rakhe orders kho sakte hain. Ek minute bhi zero loss ka vaada nahi hai.',
          'B ka bada app traffic sambhalega. App ka size A se na pahunchi copy ki jagah nahi le sakta.',
          'Jaldi routing badalne se aage ke orders bach sakte hain. A ke saath ja chuka data router nahi bana sakta.',
        ],
      },
      {
        q: 'B ka DB dono tareekon mein chalu hai. Ek mein app band, doosre mein chhota app chalu. Copy wahi hai. Kya farak padega?',
        choices: [
          'Chhota app turant kuch traffic lega; poora traffic lene ke liye bada karna padega',
          'Chhota app turant saara traffic lega; copy ki taazgi se capacity bhi badh jaayegi',
          'Band app bhi turant kuch traffic lega; DB chalu ho toh app chalana baaki nahi rahta',
          'Chhota app data ka nuksaan ghata dega; wahi copy ab har order ko turant bacha legi',
        ],
        answer: 0,
        explain: 'Warm standby mein chhota par chalta app hai: failover par kuch traffic turant le sakta hai, phir scale up chahiye. Pilot light mein requests lene se pehle app chalu ya deploy karna padta hai. Wahi copy schedule ho toh app ki taiyaari se data loss apne aap nahi ghat-ta; chalte app ka roz ka kharcha judta hai.',
        choiceExplanations: [
          'Warm standby mein chhota par chalta app hai: failover par kuch traffic turant le sakta hai, phir scale up chahiye. Pilot light mein requests lene se pehle app chalu ya deploy karna padta hai. Wahi copy schedule ho toh app ki taiyaari se data loss apne aap nahi ghat-ta; chalte app ka roz ka kharcha judta hai.',
          'Chhote app ki capacity seemit hai. Data ki taazgi app ki capacity nahi badhati.',
          'DB chalu hona app chalu hone ke barabar nahi. Band app pehle chalana padega.',
          'App ka size badalne se copy ka samay nahi badla. Wahi orders copy ke intezaar mein reh sakte hain.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki wapsi ka samay aur khoya data do alag knob se kyun badalte hain',
    '"Pehle ho gaya" aur "pehle copy" — dono ki keemat number ke saath bata sakte ho',
    'Samjha sakte ho ki failover ke baad bhi orders kyun fail hote hain, aur lagataar copy galti se kyun nahi bachati',
  ],
  cards: [
    { front: 'Do alag knob?', back: '<b>Copy ki raftaar</b> → khoya data. <b>Doosre region mein kitna chalu</b> → wapsi ka samay. Slow motion: fail 14 → 8 → 4 → 1, par kho gaye 3 → 1 → 1 → 1.' },
    { front: '"Pehle copy" (synchronous) ki keemat?', back: 'Har order par doosre region ka chakkar (slow motion: 0.20 s; lab: 45 ms banaam 2 ms). Aur B tak pahunchna band ho toh A theek hote hue bhi orders fail (lab: 75 / 75).' },
    { front: 'Fail hona aur kho jaana — farak?', back: '<b>Fail:</b> grahak ko error dikha — grahak jaanta hai ki order pakka nahi hua, aur dobara koshish kar sakta hai (wahi order number dekar, taaki do order na banein). <b>Kho gaya:</b> grahak ko "ho gaya" dikha, par order kahin nahi. Doosra zyada bura hai: grahak ko pata hi nahi.' },
    { front: 'Failover ke baad bhi orders fail kyun?', back: 'Grahak purana pata yaad rakhta hai (TTL). Model: 6 s ki yaad → 27 fail; 1 s → 8. Pata chalne ka samay (1.50 s) yaad chhoti karne se nahi ghat-ta.' },
    { front: 'Copy hai toh backup kyun?', back: 'Copy galti ko bhi copy kar deti hai: "sab mita do" 8.00 s par B tak pahuncha → 16 gaye. Purane backup se 12 wapas aaye. Copy = region ke jaane se bachav; backup = galti se bachav.' },
  ],
},
]);

})();
