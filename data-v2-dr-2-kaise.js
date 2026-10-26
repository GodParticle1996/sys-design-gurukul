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
            q: 'Orders har 0.5 second par aate hain. B ka chhota app 1 second mein 1 hi order le sakta hai. Failover ke turant baad kya hoga?',
            choices: ["Alternate arrivals fail; standby 1/s hi serve karta","Saare arrivals pass; app live hona capacity proof hai","Saare arrivals fail; small standby koi work nahi karta","Router overflow ko lossless queue mein hold karta"],
            answer: 0,
            hint: '1 second mein kitne orders aate hain? Chhota app unme se kitne le sakta hai?',
            explain: "Offered 2/s versus single-order 1 s service lab schedule mein har doosra arrival capacity miss karta hai. Running aur sufficient capacity alag conditions hain. Small app apni available capacity par work kar sakta hai. Given router mein buffering rule nahi hai.",
           choiceExplanations: ["Offered 2/s versus single-order 1 s service lab schedule mein har doosra arrival capacity miss karta hai.","Running aur sufficient capacity alag conditions hain.","Small app apni available capacity par work kar sakta hai.","Given router mein buffering rule nahi hai."] },
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
            q: 'Region A 4.00 s par gaya; router ko 5.50 s par pata chalega. #10 (4.50 s) ki baari B ki hai, #11 (5.00 s) ki baari A ki. Dono ka kya hoga?',
            choices: ["#10 B par pass; #11 stale A route par fail","#10 aur #11 pass; failover pehle hi complete hai","#10 aur #11 fail; ek region gaya toh dono band","#10 fail; #11 A se B par automatically retry hoga"],
            answer: 0,
            hint: 'Pata chalne se pehle router kya badalta hai? Kuch nahi. Toh har order apni baari wale region par hi jaayega.',
            explain: "5.50 s detection se pehle round-robin assignment hi use hoti hai: B available hai, A nahi. Router ne threshold abhi complete nahi kiya. Region B healthy diya gaya hai. Is trace mein automatic per-request rerouting nahi hai.",
           choiceExplanations: ["5.50 s detection se pehle round-robin assignment hi use hoti hai: B available hai, A nahi.","Router ne threshold abhi complete nahi kiya.","Region B healthy diya gaya hai.","Is trace mein automatic per-request rerouting nahi hai."] },
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
            q: 'Aakhri teen tareekon mein "kho gaye" 1 par hi atka raha. Region B mein itna kuch chalu kiya — khoya data kyun nahi ghata?',
            choices: ["Copy interval same; standby readiness RTO badalti hai","Standby app size hi acknowledged data loss tay karta","Router speed hi completed replica data count tay karti","Standby boot delay data ko source par undo karta hai"],
            answer: 0,
            hint: 'Pichhle level mein khoya data 3 se 1 kab hua tha — B mein kuch chalu karne se, ya copy jaldi karne se?',
            explain: "Teeno runs ka async copy schedule same hai; standby deployment readiness recovery time ka independent axis hai. App scaling data replication freshness nahi badalti. Routing delay loss exposure affect kar sakti hai, par given identical copy loss ka cause interval hai. Boot delay earlier writes rollback nahi karta.",
           choiceExplanations: ["Teeno runs ka async copy schedule same hai; standby deployment readiness recovery time ka independent axis hai.","App scaling data replication freshness nahi badalti.","Routing delay loss exposure affect kar sakti hai, par given identical copy loss ka cause interval hai.","Boot delay earlier writes rollback nahi karta."] },
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
            q: 'Region B tak ek chakkar mein 0.20 second lagte hain. Is badlaav ki keemat kya hogi?',
            choices: ["Remote ACK wait; link failure writes block kar sakta","Sirf standby bill; primary write latency same rahegi","Faster ACK; remote copy local disk wait hata degi","Async queue jaisa; remote response wait nahi hoga"],
            answer: 0,
            hint: '"Ho gaya" ab kis cheez ka intezaar karega? Aur B ka jawab na mile toh?',
            explain: "Synchronous remote confirmation cross-region latency aur remote availability ko write path mein laati hai. Remote round trip acknowledgment se pehle complete karna hai. Extra dependency local wait ko magically remove nahi karti. Response wait remove karna synchronous contract badal deta hai.",
           choiceExplanations: ["Synchronous remote confirmation cross-region latency aur remote availability ko write path mein laati hai.","Remote round trip acknowledgment se pehle complete karna hai.","Extra dependency local wait ko magically remove nahi karti.","Response wait remove karna synchronous contract badal deta hai."] },
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
            q: '#7 B ke jawab ka intezaar kar raha tha jab region A gaya. Kya #7 "kho gaya"?',
            choices: ["Confirmed-loss metric mein nahi; ACK mila hi nahi","Confirmed-loss metric mein haan; client ne send kiya","Confirmed-loss metric mein haan; source unavailable tha","Confirmed-loss metric mein nahi; retry duplicate nahi hota"],
            answer: 0,
            hint: '"Kho gaya" ka matlab is topic mein kya tha: jise "ho gaya" mila, par jo B mein nahi hai. #7 ko kya mila?',
            explain: "Lab lost-confirmed metric acknowledged orders ginti hai. Unacknowledged outcome ko status/idempotency ke saath resolve karo; reply missing se effect absent prove nahi hota. Client send server confirmation nahi hai. Source failure alone unacknowledged operation ko confirmed nahi banati. Retry duplicate ho sakta hai; same idempotency key/status check chahiye.",
           choiceExplanations: ["Lab lost-confirmed metric acknowledged orders ginti hai. Unacknowledged outcome ko status/idempotency ke saath resolve karo; reply missing se effect absent prove nahi hota.","Client send server confirmation nahi hai.","Source failure alone unacknowledged operation ko confirmed nahi banati.","Retry duplicate ho sakta hai; same idempotency key/status check chahiye."] },
        },
        {
          clock: 'B tak pahunchna band',
          say: 'Ab doosri keemat. Region A <b>bilkul theek</b> hai. Par 2.00 s se 4.00 s tak region B tak pahunchna band ho gaya (network ki gadbad).',
          vars: { lost: '0', bdown: '?' },
          ask: {
            q: '"Pehle copy" wale tareeke mein, is 2 second ke dauraan aane wale orders ka kya hoga?',
            choices: ["Sync ACK nahi aayega; new orders fail honge","Primary healthy hai; sync ACK turant de sakta hai","Router durable buffer mein orders store karega","Two seconds ke baad har request auto-success hogi"],
            answer: 0,
            hint: '"Ho gaya" kis ke baad bola jaata hai? B ka jawab abhi mil sakta hai?',
            explain: "B unreachable hone par lab ka synchronous confirmation dependency complete nahi hota. Primary health required remote acknowledgment ko replace nahi karti. Router mein durable application queue nahi diya gaya. Client deadline aur retry policy ke bina later success promise nahi.",
           choiceExplanations: ["B unreachable hone par lab ka synchronous confirmation dependency complete nahi hota.","Primary health required remote acknowledgment ko replace nahi karti.","Router mein durable application queue nahi diya gaya.","Client deadline aur retry policy ke bina later success promise nahi."] },
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
            q: 'Grahak-1 ne pata 5.00 s par poochha tha (jawab: A) aur 6 second tak yaad rakhega. Jawab 5.50 s par badal ke B ho gaya. Grahak-1 ke orders kab tak fail honge?',
            choices: ["11.00 s tak cached A use hoga; phir refresh","5.50 s par cache push se turant B ban jaayega","6.00 s par fixed global cache expiry ho jaayegi","5.00 s par failed request DNS record delete karegi"],
            answer: 0,
            hint: 'Phone ne pata kab poochha tha? Aur kitni der yaad rakhega?',
            explain: "Given client 5.00 + 6 s tak old answer hold karta hai; lab ka modeled refresh 11.00 s par hai. DNS answer change ordinary client cache ko push invalidate nahi karta. TTL receipt time se count hota hai. HTTP/connect failure DNS cache deletion ka specified rule nahi.",
           choiceExplanations: ["Given client 5.00 + 6 s tak old answer hold karta hai; lab ka modeled refresh 11.00 s par hai.","DNS answer change ordinary client cache ko push invalidate nahi karta.","TTL receipt time se count hota hai.","HTTP/connect failure DNS cache deletion ka specified rule nahi."] },
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
            q: 'Region B mein abhi 14 orders hain. Agli copy 8.00 s par jaayegi. Region B ke orders ka kya hoga?',
            choices: ["Delete bhi replicate hogi; B ka data mit sakta","B region alag hai; application deletes isolate rahengi","Replica SQL intent samajhkar accidental delete rokega","Delete se replication subscription khud band hogi"],
            answer: 0,
            hint: 'Copy ka kaam kya hai: jo A mein hua, wahi B mein karna. Kya copy "sahi badlaav" aur "galti" mein farak jaanti hai?',
            explain: "Is generic lab replicator mein delete application change ki tarah ship hoti hai. S3 marker rules alag hain. Geographic isolation logical mutation propagation nahi rokta. Replicator user intent automatically infer nahi karta. Delete replication ko self-disable nahi karti.",
           choiceExplanations: ["Is generic lab replicator mein delete application change ki tarah ship hoti hai. S3 marker rules alag hain.","Geographic isolation logical mutation propagation nahi rokta.","Replicator user intent automatically infer nahi karta.","Delete replication ko self-disable nahi karti."] },
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
            q: 'Teen backup hain. Galti 7.75 s par hui thi. Kaunsa backup wapas chalaoge?',
            choices: ["6.00 s snapshot; last point before 7.75 s mistake","9.00 s snapshot; newest hone se deleted rows milengi","3.00 s snapshot; oldest se minimum loss milega","Teeno snapshots merge; correct rows khud identify hongi"],
            answer: 0,
            hint: 'Kis backup mein galti se pehle ka sabse zyada data hai?',
            explain: "Latest known clean snapshot minimal additional rollback ke saath pre-mistake state deta hai. Post-delete snapshot already unwanted state contain kar sakta hai. Older snapshot extra legitimate writes lose karega. Merge semantics aur conflict recovery explicit design chahiye.",
           choiceExplanations: ["Latest known clean snapshot minimal additional rollback ke saath pre-mistake state deta hai.","Post-delete snapshot already unwanted state contain kar sakta hai.","Older snapshot extra legitimate writes lose karega.","Merge semantics aur conflict recovery explicit design chahiye."] },
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
        q: 'Doosre slow motion mein region A poore waqt theek tha. Phir bhi 4 orders fail hue. Kyun?',
        choices: ["Remote confirmation missing thi; primary healthy tha","Primary app capacity kam thi; remote ACK available tha","Router ne B ko traffic diya; A writer use nahi hua","Replica delay primary ko process restart karwata hai"],
        answer: 0,
        explain: "Synchronous dependency unavailable ho toh otherwise healthy primary bhi ACK contract complete nahi kar sakti. Given failure remote connectivity ki hai. Write still A ke synchronous path par aati hai. Code remote wait ko process restart mein convert nahi karta.",
       choiceExplanations: ["Synchronous dependency unavailable ho toh otherwise healthy primary bhi ACK contract complete nahi kar sakti.","Given failure remote connectivity ki hai.","Write still A ke synchronous path par aati hai.","Code remote wait ko process restart mein convert nahi karta."] },
      lesson: 'Har bachav ek nuksaan ghatata hai aur ek keemat maangta hai. Pehle likho ki kaunsa nuksaan kitna manzoor hai.',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum har bachav ki keemat bhi bata sakte ho. 🎤',
    questions: [
      {
        q: '"Hume zero data loss chahiye: region jaaye toh ek bhi confirmed order na khoye. Kya karna hoga, aur keemat kya hai?"',
        choices: ["ACK se pehle durable remote copy; latency tradeoff","Minute backups; short interval zero loss guarantee","Standby app scale-up; copy schedule wahi rehne do","DNS threshold kam; source ACK policy wahi rakho"],
        answer: 0,
        explain: "Specified region-loss scope mein acknowledged writes ki surviving durable copy chahiye; synchronous path latency aur availability cost la sakta hai. Periodic async copies ke beech loss window rahegi. App capacity data acknowledgment durability change nahi karti. Fast detection unsent acknowledged data recover nahi karti.",
       choiceExplanations: ["Specified region-loss scope mein acknowledged writes ki surviving durable copy chahiye; synchronous path latency aur availability cost la sakta hai.","Periodic async copies ke beech loss window rahegi.","App capacity data acknowledgment durability change nahi karti.","Fast detection unsent acknowledged data recover nahi karti."] },
      {
        q: '"Do tareeke: (1) doosre region mein sirf DB chalu, app band. (2) doosre region mein DB aur ek chhota app chalu. Farak kya hai?"',
        choices: ["Warm app jaldi serve karega; small capacity limit hogi","Warm app zero data loss dega; replication same rahegi","Pilot-light app pehle se full traffic serve karta hai","Warm standby restore ke liye fresh deploy hi maangta hai"],
        answer: 0,
        explain: "Warm standby mein working scaled-down application hai; pilot light mein additional start/deploy steps hote hain. Same replication se RPO automatically improve nahi hota. Pilot light full working app ready hone ke barabar nahi. Already deployed app ko aam taur par scale karna hota hai, complete fresh deploy nahi.",
       choiceExplanations: ["Warm standby mein working scaled-down application hai; pilot light mein additional start/deploy steps hote hain.","Same replication se RPO automatically improve nahi hota.","Pilot light full working app ready hone ke barabar nahi.","Already deployed app ko aam taur par scale karna hota hai, complete fresh deploy nahi."] },
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
    { front: 'Fail hona aur kho jaana — farak?', back: '<b>Fail:</b> grahak ko error dikha; grahak jaanta hai. <b>Kho gaya:</b> grahak ko "ho gaya" dikha, par order kahin nahi. Doosra zyada bura hai.' },
    { front: 'Failover ke baad bhi orders fail kyun?', back: 'Grahak purana pata yaad rakhta hai (TTL). Model: 6 s ki yaad → 27 fail; 1 s → 8. Pata chalne ka samay (1.50 s) yaad chhoti karne se nahi ghat-ta.' },
    { front: 'Copy hai toh backup kyun?', back: 'Copy galti ko bhi copy kar deti hai: "sab mita do" 8.00 s par B tak pahuncha → 16 gaye. Purane backup se 12 wapas aaye. Copy = region ke jaane se bachav; backup = galti se bachav.' },
  ],
},
]);

})();
