/* =====================================================================
   🛡️ Playlist · 1 Resilience — Retries · level 5: KAB
   Kya dobara bhejna hai, kis layer par, aur retry khud kab ruk jaaye — aur aam galatfehmiyan.
   Har number docker-labs/37-retries ke asli run se hai (ex3-layers, ex2-storm, ex1-jitter, tools/slowmo.js).
   ===================================================================== */
(function () {

/* chaar dabbe: Asha ka phone → A (app-api) → B (orders) → C (payment) — lab ke ex3 mein inke naam A, B, C hain */
const NODES = [
  { id: 'phone', icon: '📱', label: 'Asha', x: 105, y: 105 },
  { id: 'a', icon: '🧩', label: 'A: app-api', x: 401, y: 105 },
  { id: 'b', icon: '🧾', label: 'B: orders', x: 702, y: 105 },
  { id: 'c', icon: '💳', label: 'C: payment', x: 1003, y: 105 },
];
const EDGES = [{ from: 'phone', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
const VIZ = { w: 1110, h: 215 };
const CHAIN = (t1, t2, t3) => [
  { from: 'phone', to: 'a', label: t1, tone: 'acc' }, { from: 'a', to: 'b', label: t2, tone: 'acc' }, { from: 'b', to: 'c', label: t3, tone: 'bad' },
];

VISUALS['rt-kab'] = {
  t: 'Teen layer, har layer par "3 koshish": ek Order place → band padi service par 27 calls',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { phone: { tone: 'idle', badge: '3 koshish' }, a: { tone: 'slow', badge: '3 koshish' }, b: { tone: 'slow', badge: '3 koshish' }, c: { tone: 'bad', badge: 'band · 27 calls' } },
    flows: CHAIN('× 3', '× 9', '× 27'),
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rt-kab',
  icon: '⚖️',
  group: '🔁 Retries',
  title: 'Retries 5 · Kab — kya dobara bhejein, kahan, aur kitna',
  badge: 'Retry Nyaayadhish',
  objectives: [
    'Kis jawab par dobara bhejna theek hai, aur kis par bilkul nahi?',
    'Har team ne "3 koshish" laga di — band padi service par 27 guna bojh kaise aa gaya?',
    'Retry ko khud kab ruk jaana chahiye (budget), aur breaker ke saath kaise chalta hai?',
    'Retry ke baare mein kaunsi aam baatein galat hain?',
  ],
  lesson: [
    `<h3>✖️ 3 × 3 × 3</h3>
     <p>KhanaKart mein ek order teen services se guzarta hai: <b>app-api → order-service → payment-service</b>.</p>
     <p>Teeno teams samajhdaar hain. Phone ka app fail hone par 3 baar koshish karta hai. app-api ki team ne bhi apne HTTP client mein "3 koshish" laga di. order-service ki team ne bhi.</p>
     <p>Ek din payment-service poori tarah band ho gayi. Lab mein 100 users ne ek-ek baar "Order place" dabaya:</p>
     <pre>band padi payment-service par calls:  2700
har ek "Order place" par:               27</pre>
     <p>Jo service pehle se giri hui thi, us par <b>27 guna</b> bojh. Kisi ek team ne galat nahi kiya — galti <b>jod</b> mein thi.</p>
     <p class="tip">👉 Is level mein: pehle tum faisla karoge ki kya dobara bhejna hai. Phir 27 kaise bana, yeh ek-ek call gin ke dekhenge. Phir: retry kab khud ruk jaaye.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Dobara bhejoge — ya nahi?',
      instructions: 'KhanaKart ke aath jawab. Har ek ko sahi bin mein daalo. Pehle apna jawab socho, phir daalo.',
      bins: [
        { id: 'yes', label: '🔁 Haan — ruk ke dobara bhejo' },
        { id: 'no', label: '🛑 Nahi — dobara bhejne se nahi badlega (ya nuksaan hoga)' },
      ],
      items: [
        { text: 'Menu dekhne ki request (GET /menu) par koi jawab nahi aaya — timeout', bin: 'yes', explain: 'Jawab hi nahi aaya: shayad ek blip tha. Aur menu <b>padhna</b> do baar ho jaaye toh kuch nahi bigadta. Random intezaar ke saath dobara bhejo.' },
        { text: '503 Service Unavailable, saath mein "Retry-After: 2"', bin: 'yes', explain: 'Server ne khud bataya: abhi nahi, 2 second baad. Utna to ruko hi (thoda random jod ke), phir bhejo.' },
        { text: '429 Too Many Requests', bin: 'yes', explain: 'Tum bahut tez bhej rahe ho. Dobara bhejna theek hai — par <b>ruk ke</b>. Retry-After mila ho toh wahi maano.' },
        { text: 'Order ka status dekhte waqt (GET /orders/123) connection beech mein toot gaya', bin: 'yes', explain: 'Jawab nahi aaya, aur status padhna dobara karne mein koi nuksaan nahi. Dobara bhejo.' },
        { text: '400 Bad Request — pincode galat format mein bheja gaya', bin: 'no', explain: 'Request hi galat hai. Wahi request 5 baar bhejoge toh 5 baar 400 milega. Request theek karo.' },
        { text: '401 Unauthorized — login token expire ho gaya', bin: 'no', explain: 'Wahi token dobara bhejne se wahi jawab aayega. Pehle naya token lo; phir woh ek <b>nayi</b> request hai.' },
        { text: '404 Not Found — yeh restaurant ab KhanaKart par nahi hai', bin: 'no', explain: 'Cheez hai hi nahi. Dobara poochhne se paida nahi ho jaayegi.' },
        { text: 'Paisa kaatne ki request (POST /payments) par timeout — pata nahi paisa kata ya nahi, aur request par koi pehchaan (Idempotency-Key) nahi hai', bin: 'no', explain: 'Ho sakta hai paisa kat chuka ho aur sirf jawab raaste mein kho gaya ho. Aise hi dobara bheja toh paisa <b>do baar</b> kat sakta hai. Pehle request ko pehchaan do (Idempotency-Key — API track ka Idempotency level), tab retry safe hai.' },
      ],
    },

    /* ---------------- 2. 27 kaise bana ---------------- */
    {
      type: 'dryrun',
      title: '✖️ Dry run — ek "Order place", 27 calls',
      goal: 'payment-service (C) poori tarah band hai. Har layer ka niyam: "fail ho toh kul 3 koshish". Asha ek baar "Order place" dabati hai. Har call gino.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'pc', label: 'Phone ki koshish (3 mein se)' },
        { id: 'ac', label: 'A ki koshish — phone ki is call ke andar' },
        { id: 'bc', label: 'B ki koshish — A ki is call ke andar' },
        { id: 'c', label: 'C (payment-service) par ab tak calls' },
      ],
      steps: [
        {
          clock: 'call 1',
          say: 'Asha "Order place" dabati hai. Phone → A → B → C. payment-service (C) band hai: <b>503</b>.<br><br>C par pehli call gin lo.',
          flows: CHAIN('1', '1', '1'),
          nodes: { c: { tone: 'bad', badge: 'band · 503' } },
          vars: { pc: '1', ac: '1', bc: '1', c: '1' },
        },
        {
          clock: 'B ki 3 koshish',
          say: 'B (order-service) ka niyam: 3 koshish. B do baar aur C ko call karta hai. Dono fail.<br><br>B haar maan leta hai aur A ko <b>503</b> lautata hai. Ab tak C par <b>3 calls</b>.',
          flows: CHAIN('1', '1', '× 3'),
          nodes: { b: { tone: 'slow', badge: '3 koshish → haar' } },
          vars: { bc: '3 → haar maan li', c: '3' },
          ask: {
            q: 'A (app-api) ko B se 503 mila. A ka niyam bhi "3 koshish" hai. A ki teeno koshishein poori hone tak C par kul kitni calls ho chuki hongi?',
            choices: ["9 calls: A ke 3 attempts each B ke 3 attempts chalate","5 calls: B ke 3 plus A ke2 additional attempts","3 calls: A retries lower dependency tak nahi pahunchti","6 calls: A aur B attempts counts sirf jod dete"],
            answer: 0,
            hint: 'A jab B ko dobara call karta hai, toh B ke liye woh ek nayi request hai. B phir se kitni baar C ko call karega?',
            explain: 'B ko yaad nahi ki abhi-abhi usne 3 baar koshish ki thi. A ki har call par B ka poora "3 koshish" phir chalta hai: 3 + 3 + 3 = <b>9</b>.',
           choiceExplanations: ["B ko yaad nahi ki abhi-abhi usne 3 baar koshish ki thi. A ki har call par B ka poora \"3 koshish\" phir chalta hai: 3 + 3 + 3 = <b>9</b>.","Each new A attempt B ka full retry loop dobara invoke karti hai.","A retry B ko reexecutes, jisse C fresh attempts dekhta hai.","Nested retries multiply; independent additive counts assumption wrong hai."] },
        },
        {
          clock: 'A ki 3 koshish',
          say: 'A do baar aur B ko call karta hai. Har baar B phir se 3 baar C ko call karta hai.<br><br>C par ab <b>9 calls</b>. A haar maan leta hai aur phone ko 503 lautata hai.',
          flows: CHAIN('1', '× 3', '× 9'),
          nodes: { a: { tone: 'slow', badge: '3 koshish → haar' }, b: { tone: 'slow', badge: 'har baar 3' } },
          vars: { ac: '3 → haar maan li', bc: 'har baar 3', c: '9' },
          ask: {
            q: 'Phone ka niyam bhi "3 koshish" hai. Asha ke ek "Order place" par C ko kul kitni calls jaayengi?',
            choices: ["27 calls: phone 3 times A3 times B3 attempts","11 calls: inner 9 plus phone 2 extra attempts","9 calls: phone retries inner work ko repeat na kare","12 calls: phone 3 ko inner 9 se sirf add karein"],
            answer: 0,
            hint: 'Phone ki ek koshish = C par 9 calls. Phone kitni koshish karega?',
            explain: 'Har layer apne se neeche wale ke bojh ko <b>guna</b> karti hai, jodti nahi: 3 × 3 × 3 = <b>27</b>.',
           choiceExplanations: ["Har layer apne se neeche wale ke bojh ko <b>guna</b> karti hai, jodti nahi: 3 × 3 × 3 = <b>27</b>.","Each phone attempt complete nested nine calls repeat karti hai.","Phone retry same downstream chain ko phir invoke karti hai.","Nested max attempts multiply, layer counts simply add nahi hote."] },
        },
        {
          clock: 'phone ki 3 koshish',
          say: 'Phone do baar aur bhejta hai. Har baar poora chakkar: A ki 3 koshish × B ki 3 koshish.<br><br>Asha ne ek baar button dabaya. Band padi payment-service par <b>27 calls</b> gayi. Asha ko phir bhi error hi mila.',
          flows: CHAIN('× 3', '× 9', '× 27'),
          nodes: { phone: { tone: 'bad', badge: '3 koshish → error' }, a: { tone: 'slow', badge: 'kul 9 calls B ko' }, c: { tone: 'bad', badge: 'band · 27 calls' } },
          vars: { pc: '3 → Asha ko error', ac: 'har baar 3', c: '27' },
        },
        {
          clock: 'asli lab',
          say: `Lab mein yahi teen layers, 100 users, C poori tarah band:
            <div class="dr-scroll"><table>
              <tr><th>Kaun retry karta hai</th><th>A par calls</th><th>B par calls</th><th>C par calls</th><th>C par, har user request par</th></tr>
              <tr><td>Har layer 3 koshish (phone, A, B)</td><td>300</td><td>900</td><td><b>2700</b></td><td><b>27×</b></td></tr>
              <tr><td>Sirf sabse bahar (phone) 3 koshish</td><td>300</td><td>300</td><td>300</td><td>3×</td></tr>
              <tr><td>Koi retry nahi</td><td>100</td><td>100</td><td>100</td><td>1×</td></tr>
            </table></div>
            Ginti hubahu wahi: 100 × 27 = 2700.`,
          flows: CHAIN('× 3', '× 9', '× 27'),
          vars: { pc: 'lab: 100 users', ac: 'lab: A par 300', bc: 'lab: B par 900', c: 'lab: 2700' },
        },
        {
          clock: 'ilaaj',
          say: 'Retry <b>ek hi layer</b> par rakho — sabse bahar, jahan user hai. Andar ki layers (A, B) fail hote hi turant 503 lauta dein.<br><br>Tab ek "Order place" par C ko <b>3 calls</b> jaati hain (lab: 300), 27 nahi. Aur un 3 ke beech phone random intezaar bhi karta hai.',
          flows: CHAIN('× 3', '× 3', '× 3'),
          nodes: { phone: { tone: 'ok', badge: '3 koshish (ruk-ruk ke)' }, a: { tone: 'ok', badge: 'turant fail lautao' }, b: { tone: 'ok', badge: 'turant fail lautao' }, c: { tone: 'bad', badge: 'band · sirf 3 calls' } },
          vars: { pc: '3', ac: '1 — retry nahi', bc: '1 — retry nahi', c: '3' },
        },
        {
          clock: 'yeh galti hoti kyun hai',
          say: `Kyunki chhoti gadbad mein har-layer retry <b>accha dikhta hai</b>. Lab: C thodi bimaar (har 10 mein se 3 requests par 503), 100 users:
            <div class="dr-scroll"><table>
              <tr><th>Kaun retry karta hai</th><th>User ko jawab mila</th><th>C par calls</th></tr>
              <tr><td>Har layer 3 koshish</td><td>100 mein se 100</td><td>136</td></tr>
              <tr><td>Sirf phone 3 koshish</td><td>100 mein se 98</td><td>135</td></tr>
              <tr><td>Koi retry nahi</td><td>100 mein se 73</td><td>100</td></tr>
            </table></div>
            Aam din par har-layer retry sabse accha number deta hai — isliye har team laga deti hai. Uska bill sirf us din aata hai jab C sach mein gir jaati hai. (Yeh hissa random hai: har run mein number thode alag aate hain.)`,
          flows: CHAIN('', '', ''),
          nodes: { phone: { tone: 'ok', badge: 'aam din: 100 / 100' }, a: { tone: 'idle', badge: '' }, b: { tone: 'idle', badge: '' }, c: { tone: 'slow', badge: '10 mein se 3 par 503' } },
          vars: { pc: 'lab: 100 users', ac: 'lab', bc: 'lab', c: 'lab: 136 (har layer) · 135 (sirf phone)' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> retry ka bojh layers mein <b>guna</b> hota hai, jodta nahi. Retry sirf ek layer par rakho — sabse bahar, jahan user hai aur jahan pata hai ki kitni der rukna theek hai. Andar ki layers turant fail lautayein.',
    },

    /* ---------------- 3. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai.',
      steps: [
        {
          title: '1. Kis jawab par kya karun?',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jawab</th><th>Dobara bhejun?</th><th>Kaise</th></tr>
              <tr><td>Jawab hi nahi aaya (timeout, connection toota)</td><td>Haan — agar dobara karne mein nuksaan na ho</td><td>Padhne wali request: seedha. Paisa / order banane wali: sirf Idempotency-Key ke saath</td></tr>
              <tr><td>503 Service Unavailable</td><td>Haan</td><td>Retry-After mila ho toh utna ruko; warna dugni hadd ke andar random</td></tr>
              <tr><td>429 Too Many Requests</td><td>Haan, ruk ke</td><td>Retry-After maano; kam baar bhejo</td></tr>
              <tr><td>500, 502, 504</td><td>Haan, kam baar</td><td>Dugni hadd ke andar random, 2–3 koshish</td></tr>
              <tr><td>400, 404, 422</td><td>Nahi</td><td>Request ya data theek karo</td></tr>
              <tr><td>401, 403</td><td>Nahi</td><td>Pehle naya token / sahi permission — phir nayi request</td></tr>
            </table></div>`,
        },
        {
          title: '2. Retry khud kab ruk jaaye?',
          say: `Koshish ki hadd ek request ko rokti hai. Par jab <b>sab</b> requests fail ho rahi hon, tab har request apni 3 koshish karegi — bojh phir bhi 3 guna.<br><br>
            Iske liye ek doosra brake hai: <b>retry budget</b>. Niyam: "retries, asli requests ke 10% se zyada nahi." Budget khatam → retry band, user ko seedha error.<br><br>
            Lab (asli raftaar, wahi deploy-crash):
            <div class="dr-scroll"><table>
              <tr><th>Clients ka tareeka</th><th>Crash</th><th>Calls / user action</th><th>Users ko error</th></tr>
              <tr><td>Turant retry, koi limit nahi</td><td>5</td><td>19.5</td><td>0 (par service theek hi nahi hui)</td></tr>
              <tr><td>Turant retry + budget 10%</td><td><b>1</b></td><td><b>1.0</b></td><td>1,004</td></tr>
            </table></div>
            Budget ne bina kisi intezaar ke storm rok diya. Keemat: us dauraan 1,004 users ko jaldi error mila.`,
          ask: {
            q: 'Budget ke saath 1,004 users ko error mila. Phir bhi budget lagana sahi kyun hai?',
            choices: ["Budget load bound kare; kuch fast failures recovery bachaye","Every user retry ho; outage duration ko secondary rakho","Budget capacity badha de; service same rate par faster ho","Error users stop forever; future retry traffic zero ho"],
            answer: 0,
            hint: 'Dono lines ka "Crash" khaana dekho. Bina budget ke service kab theek hui?',
            explain: 'Storm ke dauraan retries users ki madad nahi kar rahi hoti — service ko gira rahi hoti hain. Budget unhe rok ke service ko uthne deta hai. AWS ke SDK mein isi ka naam "retry quota" hai, gRPC mein "retry throttling".',
           choiceExplanations: ["Storm ke dauraan retries users ki madad nahi kar rahi hoti — service ko gira rahi hoti hain. Budget unhe rok ke service ko uthne deta hai. AWS ke SDK mein isi ka naam \"retry quota\" hai, gRPC mein \"retry throttling\".","Unbounded retries failures ko longer shared outage mein badal sakti hain.","Budget work create karna reduce karta hai, processing capacity upgrade nahi.","Caller future behavior guarantee nahi; budget ko server overload limits ke saath design karo."] },
        },
        {
          title: '3. Retry aur circuit breaker saath kaise chalte hain?',
          say: `Dono alag sawaal ka jawab dete hain:<br><br>
            <b>Retry:</b> "is <b>ek</b> request ko ek mauka aur doon?" — ek blip ke liye.<br>
            <b>Breaker:</b> "is <b>service</b> ko abhi poochhna hi chahiye?" — lagataar bimaari ke liye.<br><br>
            Kram: retry breaker ke <b>andar</b> se guzarta hai. Breaker OPEN ho toh retry ki call bhi turant ruk jaati hai — bimaar service tak nahi pahunchti. Aur har fail hui retry breaker ki window mein ek ✗ jodti hai.<br><br>
            Breaker ka poora kaam isi track ke "Breaker" levels mein hai.`,
        },
        {
          title: '4. Setting bahut kam ya bahut zyada ho toh?',
          say: `<div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Bahut kam</th><th>Bahut zyada</th></tr>
              <tr><td>Kitni koshish</td><td>Ek chhoti blip par bhi user ko error</td><td>Bimaar service par bojh, aur user der tak latka rehta hai</td></tr>
              <tr><td>Pehla intezaar (base)</td><td>Lagbhag turant retry: service ko uthne ka waqt nahi</td><td>Chhoti blip par bhi lamba intezaar (lab: p-retry ka 1000 ms → order 4.61 s par)</td></tr>
              <tr><td>Chhat (cap)</td><td>Hadd badh hi nahi paati: retries paas-paas rehti hain</td><td>Intezaar minutes tak (bina chhat: 512 second tak)</td></tr>
              <tr><td>Random</td><td>Sab ek saath lautte hain (slow motion: 3 crash)</td><td>Kisi ek user ko lamba intezaar (Dev: 4.22 s)</td></tr>
            </table></div>`,
          ask: {
            q: 'Ek team shikayat karti hai: "Restart ke baad traffic lehron mein aata hai — 1 second par ek deewar, 2 second par doosri, 4 second par teesri." Kaunsi setting galat hai?',
            choices: ["Jitter absent; same backoff phases request waves banaaye","Maximum attempts low; fewer retries phase align karein","Cap small; fixed 1,2,4 waves cap proof hain","Clock drift large; deterministic clients decorrelate hon"],
            answer: 0,
            hint: 'Lehrein theek 1, 2, 4 second par hain. Clients ke intezaar mein kya ek jaisa hai?',
            explain: 'Theek 1, 2, 4 second par deewar = bina random ka dugna intezaar. Lab mein yahi dikha: 200 clients, har lehar mein 10 jeete, 120 ne haar maan li.',
           choiceExplanations: ["Theek 1, 2, 4 second par deewar = bina random ka dugna intezaar. Lab mein yahi dikha: 200 clients, har lehar mein 10 jeete, 120 ne haar maan li.","Attempt count waves ki amplitude change kar sakta, exact common timing ka cause missing jitter hai.","Observed pre-cap exponential phase waves cap value prove nahi karti.","Large independent drift generally spread la sakti; stated aligned formula issue ko explain nahi."] },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> retry ke teen sawaal hain. <b>Kya</b> dobara bhejna hai: jawab nahi aaya / 503 / 429 — aur sirf tab, jab dobara karne mein nuksaan na ho. <b>Kahan:</b> ek hi layer par, sabse bahar. <b>Kab rukna hai:</b> koshish ki hadd, budget, aur breaker OPEN ho toh turant.',
    },

    /* ---------------- 4. lab: 27 khud gino ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — 3 × 3 × 3 khud gino',
      project: '37-retries',
      exercise: 'ex3-layers',
      goal: 'Teen services ki zanjeer (A → B → C). Pehle C poori tarah band, phir C thodi bimaar. Har layer par calls gino.',
      why: '<code>services/hop.js</code> ek kadi hai: neeche wali service fail ho toh N baar koshish karta hai. <code>tools/layers.js</code> teen setup chalata hai: har layer retry · sirf sabse bahar retry · koi retry nahi. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Teeno services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/37-retries && npm start ex3-layers', expect: 'ex3-layers\n[A] :5162 → http://localhost:5163\n[B] :5163 → http://localhost:5164\n[C] :5164 (aakhri)' },
        { text: 'Doosre terminal mein teeno setup chalao. Pehla hissa (C band) har run mein hubahu wahi aata hai; doosra hissa random hai.', cmd: 'node tools/layers.js', expect: `=== C poori tarah band (100% 503) · 100 user requests ===
tareeka                              A par calls   B par calls   C par calls   C par / user request
har layer 3 koshish (client, A, B)        300           900          2700            27×
sirf edge par 3 koshish (client)          300           300           300             3×
koi retry nahi                            100           100           100             1×

=== C thoda bimaar (30% requests par 503) · 100 user requests ===
tareeka                              user ko jawab mila   C par calls   C par / user request
har layer 3 koshish (client, A, B)        100/100            136           1.36×
sirf edge par 3 koshish (client)           98/100            135           1.35×
koi retry nahi                             73/100            100           1.00×

Retry EK layer par (sabse bahar, jahan user hai) — andar ki har layer par nahi. 3 × 3 × 3 = 27 guna bojh usi service par jo pehle se bimaar hai.` },
      ],
      observe: {
        q: 'Doosre hisse (C thodi bimaar) mein "har layer 3 koshish" sabse accha dikhta hai: 100 mein se 100 ko jawab. Phir bhi yeh setup galat kyun hai?',
        choices: ["Total outage par nested retries 27x; worst-case bhi test karo","Healthy-day 100% success permanent architecture proof hai","136 calls prove any retry wrong; all retries hatao","Single-layer retry guaranteed 100% result de; compare na karo"],
        answer: 0,
        explain: 'Setup ko uske aam din se nahi, uske sabse bure din se parkho. Sirf-phone wala retry aam din mein lagbhag utna hi accha hai (98/100), aur bure din C par 300 calls bhejta hai, 2700 nahi.',
       choiceExplanations: ["Setup ko uske aam din se nahi, uske sabse bure din se parkho. Sirf-phone wala retry aam din mein lagbhag utna hi accha hai (98/100), aur bure din C par 300 calls bhejta hai, 2700 nahi.","Best-day success catastrophic downstream load amplification hide kar sakti hai.","Some safe retries helpful ho sakti; failure-mode budget and layer placement evaluate karo.","Single layer lower amplification deti hai, guaranteed 100% success nahi."] },
      lesson: 'Retry ek hi layer par. Lab: har layer retry → band C par <b>2700</b> calls; sirf sabse bahar → <b>300</b>.',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Retry ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"1 second, 2 second, 3 second ruko" — yeh exponential backoff hai.', bin: 'myth', explain: 'Yeh linear hai (har baar utna hi badhta hai). Exponential = har baar dugna: 1, 2, 4, 8 second.' },
        { text: 'Exponential backoff laga diya toh retry storm nahi banega.', bin: 'myth', explain: 'Bina random ke sab clients ek saath lautte hain. Slow motion: 3 crash, 0 order. Lab: 200 mein se 120 ne haar maani. Random (jitter) chahiye.' },
        { text: 'Jitni zyada retries, utna bharosemand system.', bin: 'myth', explain: 'Zyada retries bimaar service par zyada bojh hain. Lab: turant retry → 5 crash, har action par 19.5 calls. Teen layers par 3-3 koshish → 27 guna.' },
        { text: 'Har failure par retry karna chahiye.', bin: 'myth', explain: '400, 401, 403, 404 par wahi request dobara bhejne se jawab nahi badalta. Aur paisa kaatne wali request bina Idempotency-Key ke dobara bhejna khatarnaak hai.' },
        { text: 'Server bhara ho toh use status 420 bhejna chahiye.', bin: 'myth', explain: 'Asli jode: 503 Service Unavailable ya 429 Too Many Requests, saath mein Retry-After. 420 koi maana hua "bhara hoon" status nahi hai.' },
        { text: 'Retry-After sirf 503 ke saath aata hai.', bin: 'myth', explain: '429 ke saath bhi aata hai, aur redirect (3xx) ke saath bhi. Value second mein ho sakti hai ya ek tareekh.' },
        { text: 'Retry sirf ek layer par hona chahiye — sabse bahar.', bin: 'true', explain: 'Andar ki layers par bhi retry ho toh bojh guna hota hai. Lab: har layer → band service par 2700 calls; sirf sabse bahar → 300.' },
        { text: 'Jitter ki wajah se kisi ek user ko zyada intezaar karna pad sakta hai.', bin: 'true', explain: 'Random kabhi lamba bhi chunta hai. Slow motion: Dev ka order 4.22 s par laga, jabki service 2.40 s se theek thi. Poori bheed ke liye phir bhi behtar: 6/6 order.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — kab aur kahan',
    instructions: 'Yahan faisla aur uski wajah bolni hai. 🎤',
    questions: [
      {
        q: "Gateway → A → B mein har layer maximum3 total attempts leti hai. B ke downstream failure par amplification kitni, aur policy kya?",
        choices: ["If3 total attempts per layer:27x; one retry owner chuno","Three layers ke 3 attempts add karo; total 9 calls","Three retries means three total calls; terminology same hai","Only DB retry hatao; other layers ko unlimited chalao"],
        answer: 0,
        explain: "Three layers each 3 total attempts worst-case 27 downstream calls. Agar 3 retries bola ho toh initial+3=4 attempts, same three layers 4^3=64 ho sakti hain. Ek intentional retry owner, aggregate budget/deadline aur safe-operation contract choose karo; blindly har hop par retries mat lagao.",
       choiceExplanations: ["Three layers each 3 total attempts worst-case 27 downstream calls. Agar 3 retries bola ho toh initial+3=4 attempts, same three layers 4^3=64 ho sakti hain. Ek intentional retry owner, aggregate budget/deadline aur safe-operation contract choose karo; blindly har hop par retries mat lagao.","Nested invocation multiplies attempts.","Three retries normally initial call ke alawa3, yani4 total attempts. Terms explicitly define karo.","Remaining layers bhi amplify kar sakti hain; max attempts/deadline aggregate budget chahiye."] },
      {
        q: '"Payment ki POST request par timeout aaya. Retry karein?"',
        choices: ["Documented idempotency contract ho; same key/body reuse","Timeout means charge hua nahi; fresh POST/key turant bhejo","Backoff 10 s se duplicate charge impossible ho jaata","POST retries block; existing payment status kabhi na poochho"],
        answer: 0,
        explain: "Idempotency-Key header alone enough nahi: endpoint ko durable dedup, scope, retention aur same-payload contract implement karna hota hai. Supported retry mein same logical operation ka same key/body use karo. Unknown commit outcome par documented status/reconciliation path follow karo; invented new key double charge kara sakti hai.",
       choiceExplanations: ["Idempotency-Key header alone enough nahi: endpoint ko durable dedup, scope, retention aur same-payload contract implement karna hota hai. Supported retry mein same logical operation ka same key/body use karo. Unknown commit outcome par documented status/reconciliation path follow karo; invented new key double charge kara sakti hai.","Timeout missing response batata hai; payment committed bhi ho sakti hai. New key duplicate operation ban sakti hai.","Delay duplicate side effects prevent nahi karta; server-side durable dedup/contract chahiye.","Status/reconciliation unknown outcome resolve kar sakti hai; every POST retry forever forbid necessary nahi."] },
      {
        q: '"Retry aur circuit breaker dono lagane ki kya zaroorat hai?"',
        choices: ["Retry per-operation blip; breaker repeated sickness guard","Both same state; retry loop breaker history replace kare","Breaker lagte hi every transient call retry forbid karo","Retry add hote hi dependency breaker always closed rakho"],
        answer: 0,
        explain: "Retry transient operation failure se recover karne ki bounded koshish hai; breaker dependency/operation failure pattern par further calls short-circuit karta hai. Per-attempt vs whole-operation breaker composition statistics badalti hai. Open rejection ko retry storm na banao; recovery probes aur caller deadline bounded rakho.",
       choiceExplanations: ["Retry transient operation failure se recover karne ki bounded koshish hai; breaker dependency/operation failure pattern par further calls short-circuit karta hai. Per-attempt vs whole-operation breaker composition statistics badalti hai. Open rejection ko retry storm na banao; recovery probes aur caller deadline bounded rakho.","Retry attempt counter shared health window/state machine ka replacement nahi.","Safe bounded retries aur breaker useful together ho sakte hain; composition and deadlines explicit rakho.","Repeated retries sickness amplify kar sakti hain; breaker open guard ko bypass nahi karna."] },
    ],
  },
  success: [
    'Kisi bhi jawab (timeout, 503, 429, 400, 401, 404, payment ka timeout) par bata sakte ho: dobara bhejna hai ya nahi, aur kyun',
    '27 guna bojh ka hisaab laga sakte ho, aur jaante ho retry kis layer par rakhna hai',
    'Retry budget aur breaker ka kaam bata sakte ho — retry kab khud ruk jaaye',
  ],
  cards: [
    { front: 'Kis jawab par retry, kis par nahi?', back: '<b>Haan:</b> jawab nahi aaya, 503, 429 (ruk ke), 5xx. <b>Nahi:</b> 400, 401, 403, 404. Aur paisa / order banane wali request: sirf Idempotency-Key ke saath.' },
    { front: 'Har layer par 3 retries — kya hota hai?', back: 'Bojh guna hota hai: 3 × 3 × 3 = <b>27</b>. Lab: 100 user requests → band service par 2700 calls. Retry sirf sabse bahar wali layer par (300 calls).' },
    { front: 'Retry budget kya hai?', back: 'Niyam: retries, asli requests ke ~10% se zyada nahi. Sab fail ho rahe hon toh retry band. Lab: crash 5 → 1, calls 19.5 → 1.0 per action; keemat: 1,004 users ko jaldi error.' },
    { front: 'Retry + breaker saath kaise?', back: 'Retry = ek request ki blip. Breaker = service ki lagataar bimaari. Retry breaker ke andar se guzarta hai; breaker OPEN ho toh retry bhi turant ruk jaata hai.' },
    { front: 'Payment ke timeout par retry?', back: 'Timeout = sirf jawab nahi aaya; paisa kata ya nahi, pata nahi. Retry tabhi, jab request par Idempotency-Key ho. Warna pehle status poochho.' },
  ],
},
]);

})();
