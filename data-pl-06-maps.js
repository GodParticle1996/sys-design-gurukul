/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · Google Maps: naksha dheere, traffic har second

   Source: "How Google Maps Knows There's Traffic Before You Get There"
   (Akhil Sharma) — Google research (planet-scale routing), DeepMind ETA
   (graph neural networks), Maps blog, S2 geometry library.
   Docker lab: docker-labs/24-google-maps
   ===================================================================== */
(function () {

VISUALS['maps-graph'] = {
  t: 'Naksha ek graph hai — aur Dijkstra ek failta daayra',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">💧</span><span class="nl">Dijkstra</span><span class="ns">paani daalo — har taraf failta hai. Lab: 65,260 junctions</span></div>
      <div class="dg-node is-gold"><span class="ni">🧭</span><span class="nl">A*</span><span class="ns">"compass wala Dijkstra" — manzil ki taraf. Lab: 9,196</span></div>
      <div class="dg-node is-good"><span class="ni">🛣️</span><span class="nl">Hierarchies / cells</span><span class="ns">gali → highway shortcut → gali. Lab (overlay): 2,513</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Nodes = chauraahe, edges = sadak ke tukde, weight = travel time. LA → SF (~400 mile) par Dijkstra San Diego,
      registaan, aadha Nevada — laakhon chauraahe nigal leta hai. Query ke waqt koi search continent ko ms mein nahi
      todta → <b>kaam query se pehle le jaao</b>.</div>`,
};

VISUALS['maps-crp'] = {
  t: 'Topology (naksha) alag, cost (traffic) alag',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🗺️ Topology — saal mein kabhi badle</span>
        <div class="dg-cap">Kaunsi sadak kisse judi. Naksha ko cells mein baanto (kuch levels), har cell ke border nodes tay.
          Bhaari preprocessing <b>ek baar</b>.</div></div>
      <div class="dg-box is-gold"><span class="bx-label">🚗 Cost — har minute badle</span>
        <div class="dg-cap">Har cell ke andar border-to-border travel time. Traffic badla → sirf <b>us cell</b> ke numbers dobara.
          Lab: poora naksha 1,226 ms vs ek cell 13 ms (94×).</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🏘️ apni gali → cell border</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">⏭️ cell-to-cell border shortcuts</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🏘️ manzil ki gali</span>
    </div>`,
};

VISUALS['maps-traffic'] = {
  t: 'Phones hi sensor hain — aur traffic ka bhavishya',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 ~2 arab phones (anonymous position + speed)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧲 map matching (HMM)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🌊 streaming aggregation per segment</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">🔮 history curve + GNN forecast</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🗓️ time-dependent routing</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Sadak ka weight ek number nahi, <b>waqt ka function</b> hai: pehli sadak nikalne ke waqt ki speed par, agli sadak
      us waqt ki speed par jab tum wahan pahunchoge. Lab: "abhi wali speed" ki galti 18:30 par <b>24.6 min</b> (33%); time-dependent ~8 min.</div>`,
};

VISUALS['maps-tiles-s2'] = {
  t: 'Phone naksha banata hai, ek number "paas" batata hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🖼️ Raster tiles</span>
        <div class="dg-cap">Tayyar images. Ghuma nahi sakte, 3D nahi, style badlo toh duniya ki har image dobara banao.</div></div>
      <div class="dg-box is-good"><span class="bx-label">✏️ Vector tiles</span>
        <div class="dg-cap">Instructions (line, park, building) — phone ka GPU banata hai. Rotate, tilt, smooth zoom, chhote bhi.
          Kaam wahan jahan sasta: user ke device par.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">"Mere paas kya hai?" — S2: space-filling (Hilbert) curve zameen par saanp ki tarah; paas ki jagahon ko paas ke number →
      har jagah ek sortable 64-bit key → range scan. Lab: 10 lakh jagahein, full scan 10 lakh rows vs Hilbert key <b>264 rows</b>, same jawab.</div>`,
};

SD.registerLevels('planet', [
/* =====================================================================
   1. maps-graph
   ===================================================================== */
{
  id: 'maps-graph',
  icon: '🧭',
  title: 'Google Maps — raasta dhoondhna ek graph ka sawaal',
  badge: 'Raasta Rishi',
  objectives: [
    'Naksha = graph, raasta = sabse sasta path',
    'Dijkstra ka failta daayra, A* ka compass',
    'Contraction hierarchies — shortcuts aur bidirectional',
    'Lab: 90,000 junctions par chaar algorithms',
  ],
  lesson: [
    `<h3>🔮 "23 minute" mein bhavishya chhupa hai</h3>
     <p>Maps jo "23 minute" dikhata hai, usme woh jam bhi shaamil hai jisme tum 20 minute baad us sadak par fasoge jahan
     abhi pahunche hi nahi. Maps <b>bhavishya</b> ke khilaaf raasta nikaalta hai — 2 arab+ users, 250+ desh, saikdon
     crore sadak ke tukde, ek second mein.</p>
     <p>Ek line: <b>naksha lagbhag nahi badalta, traffic har second badalta hai</b> → do alag problems. Tika hua naksha =
     bhaari precomputed structure. Badalta traffic = patli live layer, lagatar taaza aur aage ka forecast.</p>
     <h3>💧 Dijkstra — paani daalo</h3>
     <p>Chauraahe = nodes, sadak ke tukde = edges, weight = travel time. Dijkstra aisa hai jaise start par paani daalo — har
     taraf barabar failta hai jab tak manzil tak na pahunche. LA → SF (~400 mile) par San Diego, registaan, aadha Nevada —
     <b>laakhon</b> chauraahe dekh leta hai.</p>
     <p><b>A*</b> = "compass wala Dijkstra": manzil ki seedhi doori ka andaaza jodo → search manzil ki taraf jhukta hai.
     Medium doori par madad, par jab asli raasta saikdon mile ghoomta ho toh kamzor.</p>`,
    `<h3>🛣️ Insaan kaise sochta hai</h3>
     <p>"Mohalle se nikal ke highway, highway se manzil ke paas exit." <b>Contraction hierarchies</b> yahi karti hain:
     <b>shortcut edges</b> jodo (poora highway stretch ek hop mein), sadkon ko rank karo (galiyan neeche, highways upar),
     search upar chadhta hai, shortcuts par chalta hai, neeche utarta hai — aur <b>dono taraf se</b> (bidirectional),
     beech mein milte hain. Laakhon kadam → kuch hazaar.</p>
     <p><b>Par:</b> shortcuts travel times se bane hain, aur travel times din bhar badalte hain (highway 2 baje 8 min, 6 baje
     25 min) → shortcuts <b>purane</b> ho jaate hain. Precompute = tez, live traffic = sahi. Yahi tension agle level mein.</p>
     <pre>lab 24 (300×300 grid = 90,000 junctions) — sheher ke aar-paar:
dijkstra  ETA 27.24 min   junctions dekhe  65,260   18.8 ms
astar     ETA 27.24 min   junctions dekhe   9,196    4.5 ms
bidir     ETA 27.24 min   junctions dekhe  46,153   18.4 ms
overlay   ETA 27.24 min   junctions dekhe   2,513    6.0 ms</pre>
     <p>Chaaron ka jawab <b>bilkul same</b> — farq sirf mehnat ka. (Imaandari: is grid mein har cell ke border bahut hain,
     isliye overlay ke edge relaxations zyada dikhte hain; asli sadkon mein cell se nikalne ke raaste kam hote hain.)</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek raasta, chaar tareeke',
      project: '24-google-maps',
      exercise: 'ex1-routing',
      goal: '90,000 junctions ke grid par teen raaste — Dijkstra, A*, bidirectional, cell-overlay: kitne junctions dekhe, kitna time.',
      why: `<code>services/maps.js</code> 300×300 road graph memory mein rakhta hai (har 10va row/column highway). Overlay = cell 15×15,
        border-to-border shortcuts pehle se. Service start hone mein ~1–4 sec (overlay banta hai).`,
      steps: [
        { text: 'Maps service chalao.', cmd: 'cd docker-labs/24-google-maps && npm start ex1-routing', expect: 'ex1-routing\n[maps] graph 300x300 = 90000 junctions | overlay cell=15: 22400 border nodes, 1232000 shortcuts, ~1100 ms\n[maps] :5001' },
        { text: 'Teen raaste, chaar algorithms.', cmd: 'node tools/route.js', expect: 'sheher ke aar-paar (20,150 → 280,160)\n  dijkstra  ETA 27.24 min   junctions dekhe  65260   edge relax  260444    18.8 ms\n  astar     ETA 27.24 min   junctions dekhe   9196   edge relax   36759     4.5 ms\n  bidir     ETA 27.24 min   junctions dekhe  46153   edge relax  184151    18.4 ms\n  overlay   ETA 27.24 min   junctions dekhe   2513   edge relax  131808       6 ms' },
      ],
      observe: {
        q: '"Poore naksha ke aar-paar" (0,0 → 299,299) par A* ne bhi saare 90,000 junctions dekhe. Kyun?',
        choices: [
          'Manzil ekdum kone mein hai — har junction "raaste mein" hai, compass kuch kaat hi nahi paata. A* tab chamakta hai jab manzil ek taraf ho aur baaki duniya door',
          'A* galat chala',
          'Heuristic galat hai',
          'Grid chhota hai',
        ],
        answer: 0,
        explain: 'Isi liye continent-scale ke liye query-time search kaafi nahi — structure pehle banao.',
      },
      lesson: 'Sab algorithms same jawab dete hain — design ka kaam hai "kitna kaam", aur woh query se pehle le jaana.',
    },
    {
      type: 'quiz',
      title: 'Graph search ki samajh',
      questions: [
        {
          q: 'Contraction hierarchies ki kamzori?',
          choices: [
            'Shortcuts travel times se bane hain — traffic badalte hi purane; poora dobara banana mehenga',
            'Galat raasta dete hain',
            'Chhote sheher mein kaam nahi karte',
            'Bidirectional nahi ho sakte',
          ],
          answer: 0,
          explain: 'Precompute = tez par purana; live = sahi par dheema — yahi tension.',
        },
        {
          q: 'Bidirectional search kyun kam kaam karta hai?',
          choices: [
            'Do chhote daayre (start aur manzil se) ek bade daayre se kam area dhakte hain — beech mein milte hain',
            'Do CPU use karta hai',
            'Heuristic lagata hai',
            'Kam edges hain',
          ],
          answer: 0,
          explain: 'Area ∝ r²: do r/2 ke daayre = aadha area.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — routing engine',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Poore desh ka routing 100 ms mein, live traffic ke saath."',
        choices: [
          'Topology se structure pehle (hierarchy/cells), cost layer alag aur har kuch minute customize; query = local search + precomputed shortcuts, bidirectional',
          'Har query par Dijkstra, bade servers',
          'Raaste pehle se cache har jode ke liye',
          'Sirf highways par route',
        ],
        answer: 0,
        explain: 'Jode anant hain — cache nahi, structure.',
      },
      {
        q: 'Interviewer: "A* ka heuristic kaisa ho?"',
        choices: [
          'Admissible — asli cost se kabhi zyada nahi (seedhi doori / max speed); warna galat raasta',
          'Jitna bada utna tez',
          'Random',
          'Pichhle raaste ka time',
        ],
        answer: 0,
        explain: 'Lab ka heuristic: Manhattan doori / sabse tez speed.',
      },
    ],
  },
  success: [
    'Main naksha ko graph ki tarah model kar sakta hoon',
    'Main Dijkstra, A*, bidirectional aur hierarchy ka farq lab se dikha sakta hoon',
    'Main precompute vs live ki tension samjha sakta hoon',
  ],
  homework: `<p>Lab mein <code>tools/route.js</code> ke trips array mein ek bahut chhota raasta jodo (jaise 100,100 → 110,105). Kaunsa
    algorithm jeeta? Chhote raaston par overlay ka faayda kyun kam hota hai?</p>`,
  cards: [
    { front: 'Dijkstra vs A*?', back: 'Dijkstra har taraf failta daayra (lab: 65,260 junctions); A* manzil ki taraf compass (9,196). Kone-se-kone par A* bhi sab dekhta hai.' },
    { front: 'Contraction hierarchies?', back: 'Shortcut edges (poora highway ek hop), sadkon ka rank, upar chadho-shortcut-neeche utro, bidirectional. Kamzori: travel time badle toh shortcuts purane.' },
    { front: 'Maps ki core line?', back: 'Naksha lagbhag nahi badalta, traffic har second — do alag problems: bhaari precomputed structure + patli live, forecast wali layer.' },
  ],
},

/* =====================================================================
   2. maps-crp
   ===================================================================== */
{
  id: 'maps-crp',
  icon: '🧩',
  title: 'Customizable Route Planning — naksha pehle, numbers baad mein',
  badge: 'Cell Customizer',
  objectives: [
    'Topology vs cost ka batwara',
    'Cells aur border summaries',
    'Jam aaya → sirf ek cell dobara',
    'Cost function ek chunaav hai — eco routing, tolls',
  ],
  lesson: [
    `<h3>🧱 Dhaancha shakal se, numbers aakhir mein</h3>
     <p><b>CRP</b> (Customizable Route Planning) do cheezein alag karta hai:</p>
     <ul>
       <li><b>Topology</b> — kaunsi sadak kisse judi. Lagbhag kabhi nahi badalta → bhaari preprocessing <b>ek baar</b>.</li>
       <li><b>Cost</b> — abhi ka travel time. Har kuch minute → <b>sasta</b> pass.</li>
     </ul>
     <p>Naksha ko kuch levels par <b>cells</b> mein baanto. Har cell ke liye har entry border se har exit border tak ki cost
     pehle se nikaalo — cell ek <b>summary</b> ban jaata hai. Desh ke aar-paar raasta: apni gali se cell border → cell-to-cell
     border crossings par kood → manzil ki gali. Cells alag machines par bhi ho sakte hain.</p>
     <p>Traffic badla? <b>Sirf us cell</b> ke border costs dobara.</p>
     <pre>lab 24 — manzil ke aas-paas jam (676 sadkein 12× dheemi):
jam se pehle ETA 15.31 min
purane overlay se ETA 19.17 min   ← galat, shortcuts purane
asli (Dijkstra, live) 20.25 min
sirf wo cell dobara:   56 border nodes,    13 ms → ETA 20.25
poora naksha dobara: 22,400 border nodes, 1,226 ms → ETA 20.25   (94× mehenga, jawab same)</pre>`,
    `<h3>⚖️ "Sabse tez" ek chunaav hai</h3>
     <p>Wahi structure, alag cost function:</p>
     <ul>
       <li><b>Eco-friendly routing</b> — har edge ke liye ML andaaza: kitna fuel/energy (chadhaai, traffic, engine: petrol /
       hybrid / EV).</li>
       <li><b>Tolls avoid</b>, <b>highways avoid</b>, <b>kam turns</b> — sab alag cost functions, <b>same</b> cells par.</li>
     </ul>
     <p>Sabse tez ≠ sabse efficient → multi-objective. Maps eco raasta tab offer karta hai jab uska extra time lagbhag zero ho.</p>
     <p class="tip">🎯 <b>Jo dheere badalta hai use jo tezi se badalta hai us se alag karo.</b> Tab tezi wala hissa sasta ho
     jaata hai — yahan 1.2 sec se 13 ms.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — jam ke baad kitna dobara?',
      project: '24-google-maps',
      exercise: 'ex1-routing',
      goal: 'Manzil ke paas jam — purana overlay kitna galat, aur theek karne mein ek cell vs poora naksha kitna mehenga.',
      why: `<code>POST /jam</code> ek ilaake ki sadkein 12× dheemi karta hai (ek cell ke andar). <code>POST /recompute</code>
        mode <code>cell</code> (sirf wo cell ke border-to-border numbers) ya <code>full</code> (poora overlay).`,
      steps: [
        { text: 'Maps service chalao (agar band hai).', cmd: 'cd docker-labs/24-google-maps && npm start ex1-routing', expect: '[maps] :5001' },
        { text: 'Jam tool chalao.', cmd: 'node tools/jam.js', expect: 'jam se pehle: ETA 15.31 min\n\nManzil ke aas-paas ke ilaake mein jam: 676 sadkein 12x dheemi (cell 210)\n  purane overlay se ETA: 19.17 min  ← galat, shortcuts purane hain\n  asli (Dijkstra, live weights): 20.25 min\n\n  sirf wo cell dobara: 56 border nodes, 13 ms → ETA 20.25 min\n  poora naksha dobara: 22400 border nodes, 1226 ms → ETA 20.25 min\n\n  ek cell ka kaam poore naksha se 94x sasta — aur natija bilkul same.' },
      ],
      observe: {
        q: 'Purane overlay ne 19.17 min kyun bataya jabki asli 20.25 tha — jam toh usi cell mein tha?',
        choices: [
          'Cell ke andar ki border-to-border shortcuts jam se pehle ki thin; route ka jo hissa shortcuts se chala, usme jam dikha hi nahi (sirf live edges wala hissa dikha)',
          'Dijkstra galat tha',
          'Jam do cells mein tha',
          'Overlay ne raasta badal diya',
        ],
        answer: 0,
        explain: 'Isi liye cost layer har kuch minute customize hoti hai — structure wahi, numbers taaze.',
      },
      lesson: 'Traffic ka update = ek cell ka kaam (13 ms), poore naksha ka nahi (1.2 s).',
    },
    {
      type: 'match',
      title: 'Wahi naksha, alag sawaal',
      instructions: 'Har user ki zaroorat ko cost function se jodo.',
      pairs: [
        { left: '⏱️ "Jaldi pahunchna hai"', right: 'Edge weight = predicted travel time', explain: 'Default.' },
        { left: '🌱 "Petrol bachao"', right: 'Edge weight = ML andaaza: fuel/energy (chadhaai, traffic, engine type)', explain: 'Eco routing — tab offer jab extra time ~zero.' },
        { left: '💸 "Toll nahi dena"', right: 'Toll edges ki cost bahut badi', explain: 'Structure same, numbers alag.' },
        { left: '🛵 "Scooter hai, highway nahi"', right: 'Highway edges band / mehenge', explain: 'Vehicle ke hisaab se cost.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — live routing',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Har 2 minute traffic update aata hai. Poora routing index dobara banta hai (20 min). Kya karein?"',
        choices: [
          'Topology aur cost alag karo (CRP): cells + border summaries ek baar; traffic update par sirf affected cells ke border costs customize',
          'Update har 20 min par',
          'Bade servers',
          'Live Dijkstra har query',
        ],
        answer: 0,
        explain: 'Lab: 94× sasta, jawab same.',
      },
      {
        q: 'Interviewer: "Eco routing kaise joden bina naya routing engine banaye?"',
        choices: [
          'Wahi cells/topology; naya cost function (fuel per edge ka model) se ek alag customization — dono costs par query, multi-objective choice',
          'Naya graph',
          'Sirf highways avoid',
          'User ko khud chunne do raasta',
        ],
        answer: 0,
        explain: 'Cost function ek chunaav hai.',
      },
    ],
  },
  success: [
    'Main topology aur cost ka batwara samjha sakta hoon',
    'Main cells + border summaries se routing aur ek-cell update bata sakta hoon',
    'Main alag cost functions ko same structure par chala sakta hoon',
  ],
  homework: `<p>Apne system mein koi precomputed cheez dhoondho jo "thodi si" badli par poori dobara banti hai (search index, report,
    recommendations). Kya usme "dhaancha" aur "numbers" alag ho sakte hain, taaki sirf badla hissa dobara bane?</p>`,
  cards: [
    { front: 'CRP ka idea?', back: 'Topology (dheema) se cells + border structure ek baar; cost (traffic) har kuch minute sirf affected cells mein customize.' },
    { front: 'Lab 24: jam ke baad?', back: 'Ek cell dobara: 13 ms; poora naksha: 1,226 ms (94×) — jawab bilkul same (ETA 20.25).' },
    { front: 'Cost function ek chunaav?', back: 'Wahi structure par fastest, eco (fuel model), toll-free, no-highway — sab alag customizations.' },
  ],
},

/* =====================================================================
   3. maps-traffic
   ===================================================================== */
{
  id: 'maps-traffic',
  icon: '🚦',
  title: 'Traffic — phones sensor, history bhavishya',
  badge: 'Jam Jyotishi',
  objectives: [
    'Phones hi traffic sensors — aur laal gaadi wala artist',
    'Map matching: GPS ka jhooth HMM se theek',
    'History curves + GNN se forecast',
    'Time-dependent routing — lab mein ETA ki galti',
  ],
  lesson: [
    `<h3>📱 Sadak par sensor nahi, jeb mein</h3>
     <p>Traffic numbers <b>phones</b> se aate hain: anonymous position + speed. Ek sadak par saikdon phones 10 km/h par = jam.
     Bheed hi sensor hai. 2020 mein Berlin ke artist Simon Weckert ne 99 phones ek laal gaadi mein bhar ke khaali sadak par
     ghumaye — Maps ne wahan jam dikha diya.</p>
     <h3>🧲 Map matching</h3>
     <p>GPS kuch metre galat hota hai — galat sadak, building, nadi. Ek point anishchit hai, par <b>points ki lakeer</b> nahi.
     <b>Hidden Markov Model</b> sabse sambhav sadkon ka kram chunta hai → blue dot sadak se chipka, aur speed sahi segment ko
     milti hai (teen sadkon mein bikhri nahi).</p>
     <h3>🔮 40 minute ki drive mein "abhi" kam maayne rakhta hai</h3>
     <p><b>History</b>: har segment laakhon baar chala hai → roz ka speed curve (weekdays 5:30 dheema, Sunday subah khaali) =
     baseline. Kamzori: aaj aam din nahi, aur ek highway ka jam feeders mein phailta hai → DeepMind ke <b>supersegments + graph
     neural network</b>: node aur uske padosi dekho → phailte jam jaldi pakdo; history baseline ko aaj ke area-wide flow se modo.</p>`,
    `<h3>🗓️ Time-dependent routing</h3>
     <p>Raaste ko <b>samay mein aage</b> chalo: pehli sadak nikalne ke waqt ki speed par, uska time jodo, agli sadak <b>us</b>
     waqt ki speed par jab tum wahan pahunchoge… Edges numbers nahi, <b>arrival time ke functions</b> hain. ETA = predicted
     segment times ka jod, predicted palon par. Chalte-chalte lagatar recheck; crash → segment cost ucchla → reroute. Closures,
     construction, crash reports — kai Waze (Google ka) se. Aur alternatives sach mein alag hon, ek hi sadak ke 10 roop nahi.</p>
     <pre>lab 24 (ex2) — shaam ka rush, seekha hua curve vs aaj ka asli (peak 9 min late):
nikalne ka time   "abhi wali speed"   time-dependent   asli     static ki galti   TD ki galti
     17:00             52.3 min          70.0 min      69.9      -17.6 min        +0.1
     18:30             99.4 min          66.8 min      74.7      +24.6 min        -7.9</pre>
     <h3>🌊 Pipeline</h3>
     <p>Arabon anonymous pings → edge → map matching → per-segment <b>streaming</b> aggregation (rolling windows, raat ka batch
     nahi) → har segment ki abhi ki speed → sirf badle cells ka customization → serving fleet → edge cache. Query ko milta hai:
     pakka structure + ≤ do minute purani cost layer. Hot path turant, update path ko thoda peeche rehne ki chhoot — dono alag.</p>
     <p class="tip">⚖️ Keemat: bina history wali ghatna (taaza crash, toofan) par forecast aatmavishwas se galat; aur ~2 arab
     phones ki location — anonymization hi tay karta hai ki yeh manzoor hai bhi ya nahi.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — "abhi wali speed" vs time-dependent ETA',
      project: '24-google-maps',
      exercise: 'ex2',
      goal: '16:00 se 20:00 tak har aadhe ghante nikalo — static ETA aur time-dependent ETA ki asli safar se galti.',
      why: `<code>tools/eta.js</code>: 30 sadkein, har ek free-flow mein 1.2 min. Maps ke paas SEEKHA hua curve (peak 18:15), aaj ka asli
        traffic thoda alag (peak 18:24, thoda zyada) — isliye time-dependent bhi perfect nahi. Koi server nahi.`,
      steps: [
        { text: 'ETA tool chalao.', cmd: 'cd docker-labs/24-google-maps && node tools/eta.js', expect: '     17:00               52.3 min          70.0 min         69.9 min      -17.6 min    +0.1 min\n     18:30               99.4 min          66.8 min         74.7 min      +24.6 min    -7.9 min\n\nSabse buri galti 18:30 par: 24.6 min (33%).' },
        { text: 'Aakhri lines padho.', cmd: 'node tools/eta.js | tail -4', expect: 'Time-dependent ki sabse buri galti: -8.3 min — aur wo bhi sirf isliye ki aaj ka peak seekhe hue curve se 9 min late tha.' },
      ],
      observe: {
        q: '18:30 par "abhi wali speed" ne 24.6 min ZYADA kyun bataya?',
        choices: [
          'Nikalte waqt peak hai, par safar ke dauraan traffic khul raha hai — static ETA maanta hai ki abhi ki dheemi speed poore raaste rahegi',
          'Sadak band thi',
          'GPS galat tha',
          'Bug',
        ],
        answer: 0,
        explain: 'Weight ek number nahi, waqt ka function hai — pahunchne ke waqt ki speed lagao.',
      },
      lesson: 'ETA "abhi" se nahi, "jab tum wahan pahunchoge" se nikalti hai.',
    },
    {
      type: 'order',
      title: 'Ek GPS ping ka safar',
      instructions: 'Phone ka ek ping traffic layer tak kaise pahunchta hai?',
      steps: [
        { text: 'Phone anonymous position + speed bhejta hai', explain: 'Bheed hi sensor.' },
        { text: 'Edge par aata hai, pichhle pings ke saath ek trail', explain: 'Ek point anishchit, trail nahi.' },
        { text: 'Map matching (HMM) — sabse sambhav sadak sequence', explain: 'Speed sahi segment ko.' },
        { text: 'Per-segment streaming aggregation (rolling window)', explain: 'Raat ka batch nahi — lagatar.' },
        { text: 'History baseline + GNN se aane wale time ka forecast', explain: '"Abhi" se zyada "tab" maayne rakhta hai.' },
        { text: 'Badle cells ka customization → serving fleet → edge cache', explain: 'Query ko ≤ 2 min purani cost layer.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — ETA prediction',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Delivery app ki ETA shaam ko 20 minute galat aati hai."',
        choices: [
          'Time-dependent ETA: har segment ki speed us waqt ki jab rider wahan pahunchega — history curves + aaj ka live flow; aur chalte-chalte recompute',
          'Abhi ki speed se ETA',
          'Fixed 30 min bol do',
          'Average speed poore din ki',
        ],
        answer: 0,
        explain: 'Lab: static ki galti 33% tak, time-dependent ~8 min.',
      },
      {
        q: 'Interviewer: "99 phones ek gaadi mein — fake jam. Kaise bachoge?"',
        choices: [
          'Signals mix karo: history, padosi segments ka flow (GNN), phone ka movement pattern (sab same speed, same raasta), aur alag sources (Waze reports) — ek hi source par andha bharosa nahi',
          'Phones block karo',
          'Kuch nahi kar sakte',
          'Sirf taxis ka data lo',
        ],
        answer: 0,
        explain: 'Crowd sensor tabhi achha jab crowd asli ho — anomalies pakdo.',
      },
    ],
  },
  success: [
    'Main phones-as-sensors aur map matching ka kaam samjha sakta hoon',
    'Main history + GNN forecast aur time-dependent routing bata sakta hoon',
    'Main lab se static vs time-dependent ETA ki galti dikha sakta hoon',
  ],
  homework: `<p>Apne system mein koi "abhi ke number" par bana andaaza dhoondho (ETA, queue wait, delivery slot, capacity forecast).
    Kya woh maanta hai ki abhi ki haalat poore waqt rahegi? History curve se usko kaise sudhaar sakte ho?</p>`,
  cards: [
    { front: 'Traffic data kahan se?', back: 'Phones — anonymous position + speed; bheed hi sensor. (Simon Weckert: 99 phones laal gaadi mein → fake jam.)' },
    { front: 'Map matching?', back: 'GPS metres galat; points ki trail par Hidden Markov Model sabse sambhav sadak sequence chunta hai → speed sahi segment ko.' },
    { front: 'Time-dependent routing?', back: 'Edge weight = arrival time ka function. Lab: static ETA 18:30 par 24.6 min galat (33%); time-dependent ~8 min.' },
  ],
},

/* =====================================================================
   4. maps-tiles-s2
   ===================================================================== */
{
  id: 'maps-tiles-s2',
  icon: '🗺️',
  title: 'Tiles, S2 aur "mere paas kya hai"',
  badge: 'Hilbert Hakim',
  objectives: [
    'Quadtree tiles; raster se vector tiles',
    'Kaam wahan jahan sasta — phone naksha banata hai',
    'S2: 2-D ko 1-D key banao, range scan karo',
    'Geocoding aur machine-built map; paanch sabak',
  ],
  lesson: [
    `<h3>🧩 Tiles — quadtree</h3>
     <p>Duniya ko squares mein kaato; har zoom level par ek tile 4 mein toot-ta hai = <b>quadtree</b>. Sirf woh kuch tiles
     (~9) bhejo jo screen par hain, tumhare paas cache.</p>
     <table>
       <tr><th></th><th>🖼️ Raster tiles</th><th>✏️ Vector tiles</th></tr>
       <tr><td>Kya</td><td>Tayyar images</td><td>Instructions: line, park, building</td></tr>
       <tr><td>Kaun banata hai</td><td>Server</td><td>Phone ka GPU</td></tr>
       <tr><td>Ghumana / 3D / smooth zoom</td><td>Nahi</td><td>Haan</td></tr>
       <tr><td>Style badla</td><td>Duniya ki har image dobara</td><td>Bas naye rules</td></tr>
       <tr><td>Size</td><td>Bada</td><td>Chhota (kamzor network ke liye achha)</td></tr>
     </table>
     <p class="tip">🎯 <b>Kaam wahan karo jahan sasta ho</b> — arab phones ke GPU muft hain.</p>`,
    `<h3>📍 "Mere paas coffee"</h3>
     <p>Lat/long 2 dimensions hain — aam DB index (B-tree) ek dimension mein sort karta hai. <b>S2</b>: ek space-filling
     (Hilbert jaisa) curve zameen par (cube ke faces par) saanp ki tarah ghoomta hai, taaki paas ki jagahon ko paas ke
     number milein → har jagah <b>ek sortable 64-bit number</b> → "paas kya hai" = kuch <b>range scans</b>. Kai dimensions
     ko ek key mein chapta karo.</p>
     <pre>lab 24 (ex3) — 10 lakh jagahein, 2 km ke andar:
full scan     10,00,000 rows    113 mile   9 ms
Hilbert key         264 rows    113 mile   3 ms   (16 cells) — 3,788× kam rows, same jawab</pre>
     <p><b>Geocoding</b> (text → point), <b>reverse geocoding</b> (point → jagah), "coffee near me" = spatial index + ranking
     (doori, rating, match, popularity) saikdon crore jagahon par.</p>
     <h3>🛰️ Naksha kaun banata hai?</h3>
     <p>Satellite + aerial images; Street View cars (crore miles) → ML signs, speed limits, lane markings padhta hai; sarkari
     data (boundaries, addresses); users/Local Guides ke sudhaar; pixels se models sadkein nikaalte hain → road graph
     zyadatar <b>machine-built</b>. Kuch bhi ek baar nahi banta — models retrain, graph rebuild, cars hamesha.</p>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Dheere badalne wale ko tezi se badalne wale se alag karo.</li>
       <li>React mat karo, predict karo.</li>
       <li>Users sensor ho sakte hain.</li>
       <li>Kai dimensions ko ek key mein chapta karo.</li>
       <li>Kaam wahan karo jahan sasta ho (phones naksha banate hain).</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 10 lakh jagahein, "2 km ke andar"',
      project: '24-google-maps',
      exercise: 'ex3',
      goal: 'Full scan vs Hilbert-curve key ke range scans — kitni rows padhi, jawab same hai ya nahi.',
      why: `<code>tools/nearby.js</code>: 65,536 × 65,536 grid par 10 lakh random jagahein, har ek ka Hilbert key, sorted. Query ke square
        ko level-cells mein todo — har level-cell Hilbert curve par CONTIGUOUS hota hai → kuch range scans. Koi server nahi.`,
      steps: [
        { text: 'Tool chalao.', cmd: 'cd docker-labs/24-google-maps && node tools/nearby.js', expect: 'tareeka         rows padhi        mile      time\nfull scan       1,000,000       113    9 ms\nHilbert key           264       113    3 ms   (16 cells, level 8)\n\nrows 3788x kam, jawab bilkul same (113 = 113).' },
        { text: 'Radius 5 km karke dekho.', cmd: 'node tools/nearby.js --radius 5', expect: 'full scan       1,000,000       737    5 ms\nHilbert key         1,546       737    2 ms   (25 cells, level 7)\n\nrows 647x kam, jawab bilkul same (737 = 737).' },
      ],
      observe: {
        q: 'Hilbert curve ki kaunsi khoobi is trick ko mumkin banati hai?',
        choices: [
          'Paas ki jagahon ko lagbhag paas ke number milte hain, aur ek poora level-cell curve par contiguous hota hai — isliye square = kuch "BETWEEN a AND b" range scans',
          'Hilbert curve compress karta hai',
          'Woh random order deta hai',
          'Woh sirf chhote shehron mein kaam karta hai',
        ],
        answer: 0,
        explain: 'Yahi S2 karta hai, gol zameen par (cube ke 6 faces).',
      },
      lesson: '2-D problem ko 1-D bana do — phir har database ka B-tree tumhara geo index hai.',
    },
    {
      type: 'bins',
      title: 'Kaam kahan karein?',
      instructions: 'Maps ki har cheez — server par ya user ke device par?',
      bins: [
        { id: 'server', label: '🏢 Server / pehle se (precompute)' },
        { id: 'device', label: '📱 User ka device' },
      ],
      items: [
        { text: 'Naksha draw karna (roads, buildings) vector instructions se', bin: 'device', explain: 'Phone ka GPU — rotate, tilt, zoom sab local.' },
        { text: 'Cells ke border-to-border costs', bin: 'server', explain: 'Poore traffic data ki zaroorat — server par, har kuch minute.' },
        { text: 'Map ko 3D tilt/rotate', bin: 'device', explain: 'Vector tiles ka faayda — server ko kuch nahi karna.' },
        { text: 'Road graph ko satellite images se nikaalna', bin: 'server', explain: 'Bhaari ML, ek baar (aur baar-baar update).' },
        { text: 'Chalte waqt blue dot ko sadak par chipkana (turant)', bin: 'device', explain: 'Local map matching se smooth — server tak round trip bina.' },
        { text: 'Traffic forecast (GNN)', bin: 'server', explain: 'Poore area ka data chahiye.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — geo systems',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Ride app mein 5 km ke andar ke drivers dhoondhne hain, 10 lakh drivers."',
        choices: [
          'Geo cells (S2/geohash/H3) ki 1-D key par index; query ke circle ko covering cells mein todo → range scans; drivers ki location update par sirf cell key badlo',
          'Har driver ki doori nikaalo',
          'Lat par index, phir long filter',
          'Sab drivers memory mein, loop',
        ],
        answer: 0,
        explain: 'Lab: 10 lakh → 264 rows.',
      },
      {
        q: 'Interviewer: "Dark mode naksha chahiye. Raster tiles hain."',
        choices: [
          'Raster mein har zoom ki har tile dobara render karni padegi — vector tiles par sirf style rules badlo, phone draw karega',
          'CSS filter lagao',
          'Naye servers',
          'Sirf ek zoom level',
        ],
        answer: 0,
        explain: 'Kaam wahan jahan sasta — aur style data ko pixels se alag rakho.',
      },
    ],
  },
  success: [
    'Main quadtree tiles aur vector vs raster ka farq samjha sakta hoon',
    'Main S2/Hilbert se 2-D search ko range scans mein badal sakta hoon',
    'Main Maps ke paanch sabak apne system par laga sakta hoon',
  ],
  homework: `<p>Apne DB mein koi "location" ya 2-D query dhoondho (lat/long, time + price, x/y). Kya use ek 1-D key (geohash, S2 cell,
    Morton/Hilbert) se B-tree range scan banaya ja sakta hai? Pehle aur baad ki rows padhne ka andaaza likho.</p>`,
  cards: [
    { front: 'Vector vs raster tiles?', back: 'Raster = tayyar images (no rotate, style badla toh sab dobara). Vector = instructions, phone GPU draw kare: rotate/tilt/zoom, chhote, restyle aasaan.' },
    { front: 'S2 ka jaadu?', back: 'Hilbert-style curve zameen par; paas ki jagahon ke paas ke numbers; har jagah ek 64-bit key → range scans. Lab: 10 lakh → 264 rows.' },
    { front: 'Maps ke paanch sabak?', back: 'Dheema vs tez badlaav alag; react nahi predict; users sensor; kai dimensions ek key; kaam wahan jahan sasta.' },
  ],
},
]);

})();
