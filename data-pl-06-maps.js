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
  html: "\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">📱 ~2 arab phones (anonymous position + speed)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">🧲 map matching (HMM)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill\">🌊 streaming aggregation per segment</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill gold\">🔮 history curve + GNN forecast</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">🗓️ time-dependent routing</span>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-cap\">Sadak ka weight ek number nahi, <b>waqt ka function</b> hai: pehli sadak nikalne ke waqt ki speed par, agli sadak\n      us waqt ki speed par jab tum wahan pahunchoge. Lab: \"abhi wali speed\" ki galti 18: 30 par <b>24.6 min</b> (33%); time-dependent ~8 min.</div>",
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
     <div class="dg-cap">"Mere paas kya hai?" — S2: hierarchical cell IDs ke descendant ranges contiguous hote hain; nearby coordinates ke IDs hamesha nearby nahi →
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
    "<h3>🛣️ Insaan kaise sochta hai</h3>\n     <p>\"Mohalle se nikal ke highway, highway se manzil ke paas exit.\" <b>Contraction hierarchies</b> yahi karti hain:\n     <b>shortcut edges</b> jodo (poora highway stretch ek hop mein), sadkon ko rank karo (galiyan neeche, highways upar),\n     search upar chadhta hai, shortcuts par chalta hai, neeche utarta hai — aur <b>dono taraf se</b> (bidirectional),\n     beech mein milte hain. Laakhon kadam → kuch hazaar.</p>\n     <p><b>Par:</b> shortcuts travel times se bane hain, aur travel times din bhar badalte hain (highway 2 baje 8 min, 6 baje\n     25 min) → shortcuts <b>purane</b> ho jaate hain. Precompute = tez, live traffic = sahi. Yahi tension agle level mein.</p>\n     <pre>lab 24 (300×300 grid = 90,000 junctions) — sheher ke aar-paar:\ndijkstra  ETA 27.24 min   junctions dekhe  65,260   18.8 ms\nastar     ETA 27.24 min   junctions dekhe   9,196    4.5 ms\nbidir     ETA 27.24 min   junctions dekhe  46,153   18.4 ms\noverlay   ETA 27.24 min   junctions dekhe   2,513    6.0 ms</pre>\n     <p>Chaaron ka jawab <b>bilkul same</b> — farq sirf mehnat ka. (Imaandari: is grid mein har cell ke border bahut hain,\n     isliye overlay ke edge relaxations zyada dikhte hain; asli sadkon mein cell se nikalne ke raaste kam hote hain.)</p>",
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
        choices: ["Equal f-scores and tie rule explored plateau","Every A* always explores entire map","A* correctness proved broken by node count","Smaller grid makes heuristic inadmissible"],
        answer: 0,
        explain: "Is uniform grid and tie rule mein many cells same A* f-score share karti hain, so broad plateau expand hui. Different admissible heuristics/tie-breaking can change node count; A* ka universal full-grid behavior nahi.",
       choiceExplanations: ["Is uniform grid and tie rule mein many cells same A* f-score share karti hain, so broad plateau expand hui. Different admissible heuristics/tie-breaking can change node count; A* ka universal full-grid behavior nahi.","Different heuristic/tie-break rules fewer expansions kar sakti hain.","Many expansions inefficient ho sakti hain, wrong path ka proof nahi.","Grid size alone admissibility decide nahi karti."] },
      lesson: 'Sab algorithms same jawab dete hain — design ka kaam hai "kitna kaam", aur woh query se pehle le jaana.',
    },
    {
      type: 'quiz',
      title: 'Graph search ki samajh',
      questions: [
        {
          q: 'Contraction hierarchies ki kamzori?',
          choices: ["Shortcuts ke metrics refresh karo","All hierarchies return wrong routes","No hierarchy supports reverse search","Dynamic traffic can never be integrated"],
          answer: 0,
          explain: 'Precompute = tez par purana; live = sahi par dheema — yahi tension.',
         choiceExplanations: ["Precompute = tez par purana; live = sahi par dheema — yahi tension.","Updated/customizable hierarchies valid paths return kar sakti hain.","Bidirectional hierarchy search established technique hai.","Customization separates reusable topology from changing weights."] },
        {
          q: 'Bidirectional search kyun kam kaam karta hai?',
          choices: ["Meet searches reduce some explored region","Two CPUs are logically required","Half work guaranteed on every graph","Bidirectional always removes heuristic need"],
          answer: 0,
          explain: "Simple 2D geometric intuition mein two smaller fronts less area explore kar sakte hain. Actual graph topology, edge weights, stopping condition and heuristic determine work; exactly half universal guarantee nahi.",
         choiceExplanations: ["Simple 2D geometric intuition mein two smaller fronts less area explore kar sakte hain. Actual graph topology, edge weights, stopping condition and heuristic determine work; exactly half universal guarantee nahi.","Algorithm one CPU par interleaved bhi run ho sakta hai.","Topology, weights and stopping criteria actual expansion count affect karte hain.","Heuristics complementary ho sakti hain, not automatically redundant."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — routing engine',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Poore desh ka routing 100 ms mein, live traffic ke saath."',
        choices: ["Topology reuse aur fresh cost metric","All origin/destination pairs cache forever","Only local Dijkstra with no measurements","Only highways, ignore access roads"],
        answer: 0,
        explain: "Finite graph par possible origin/destination pairs quadratic ho sakte hain; every pair cache karna expensive/stale ho sakta hai. Structural preprocessing aur bounded caching complementary tools hain.",
       choiceExplanations: ["Finite graph par possible origin/destination pairs quadratic ho sakte hain; every pair cache karna expensive/stale ho sakta hai. Structural preprocessing aur bounded caching complementary tools hain.","Pair count and changing traffic exhaustive caching expensive banate hain.","Full local search continent-scale latency budget miss kar sakti hai.","Start/end access and legal turn constraints required hain."] },
      {
        q: 'Interviewer: "A* ka heuristic kaisa ho?"',
        choices: ["Lower-bound heuristic, reopen if needed","Overestimate cost arbitrarily for optimality","Random estimate without bound","Past ETA always lower bound hoti"],
        answer: 0,
        explain: "Optimal A* lower-bound (admissible) heuristic maangta hai. Closed-set graph search mein consistency or reopening logic bhi important hai. Straight-line distance divided by a valid maximum speed is one lower-bound example.",
       choiceExplanations: ["Optimal A* lower-bound (admissible) heuristic maangta hai. Closed-set graph search mein consistency or reopening logic bhi important hai. Straight-line distance divided by a valid maximum speed is one lower-bound example.","Unbounded overestimate optimal path prune kar sakta hai.","Random value admissibility establish nahi karta.","Past traffic can be slower than current; estimate overstate kar sakti hai."] },
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
    "<h3>🧱 Dhaancha shakal se, numbers aakhir mein</h3>\n     <p><b>CRP</b> (Customizable Route Planning) do cheezein alag karta hai:</p>\n     <ul>\n       <li><b>Topology</b> — kaunsi sadak kisse judi. Lagbhag kabhi nahi badalta → bhaari preprocessing <b>ek baar</b>.</li>\n       <li><b>Cost</b> — abhi ka travel time. Har kuch minute → <b>sasta</b> pass.</li>\n     </ul>\n     <p>Naksha ko kuch levels par <b>cells</b> mein baanto. Har cell ke liye har entry border se har exit border tak ki cost\n     pehle se nikaalo — cell ek <b>summary</b> ban jaata hai. Desh ke aar-paar raasta: apni gali se cell border → cell-to-cell\n     border crossings par kood → manzil ki gali. Cells alag machines par bhi ho sakte hain.</p>\n     <p>Traffic badla? <b>Sirf us cell</b> ke border costs dobara.</p>\n     <pre>lab 24 — manzil ke aas-paas jam (676 sadkein 12× dheemi):\njam se pehle ETA 15.31 min\npurane overlay se ETA 19.17 min   ← galat, shortcuts purane\nasli (Dijkstra, live) 20.25 min\nsirf wo cell dobara:   56 border nodes,    13 ms → ETA 20.25\npoora naksha dobara: 22,400 border nodes, 1,226 ms → ETA 20.25   (94× mehenga, jawab same)</pre>",
    "<h3>⚖️ \"Sabse tez\" ek chunaav hai</h3>\n     <p>Wahi structure, alag cost function:</p>\n     <ul>\n       <li><b>Eco-friendly routing</b> — har edge ke liye ML andaaza: kitna fuel/energy (chadhaai, traffic, engine: petrol /\n       hybrid / EV).</li>\n       <li><b>Tolls avoid</b>, <b>highways avoid</b>, <b>kam turns</b> — sab alag cost functions, <b>same</b> cells par.</li>\n     </ul>\n     <p>Sabse tez ≠ sabse efficient → multi-objective. Maps eco raasta tab offer karta hai jab uska extra time lagbhag zero ho.</p>\n     <p class=\"tip\">🎯 <b>Jo dheere badalta hai use jo tezi se badalta hai us se alag karo.</b> Tab tezi wala hissa sasta ho\n     jaata hai — yahan 1.2 sec se 13 ms.</p>",
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
        q: "Purane overlay ne 19.17 min kyun bataya jabki asli 20.25 tha — jam toh usi cell mein tha?",
        choices: ["Overlay cost had stale traffic summary","Live edges must all be missing","Any changed estimate means wrong Dijkstra","Cell topology must have vanished"],
        answer: 0,
        explain: 'Isi liye cost layer har kuch minute customize hoti hai — structure wahi, numbers taaze.',
       choiceExplanations: ["Isi liye cost layer har kuch minute customize hoti hai — structure wahi, numbers taaze.","Shortcuts stale ho sakti hain even when local live edges available hon.","Search old weights par correct ho sakti hai, real-time estimate still stale.","Metric update topology deletion imply nahi karta."] },
      lesson: "Traffic ka update = ek cell ka kaam (13 ms), poore naksha ka nahi (1.2 s).",
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
        choices: ["Topology separate, costs customize","Delay all traffic inputs until rebuild","Only add servers without profiling","Every query ignore all precomputation"],
        answer: 0,
        explain: 'Lab: 94× sasta, jawab same.',
       choiceExplanations: ["Lab: 94× sasta, jawab same.","Slower refresh freshness requirement violate karta hai.","Capacity can help, but repeated metric-independent work remains.","Full live search may exceed query latency/capacity budget."] },
      {
        q: 'Interviewer: "Eco routing kaise joden bina naya routing engine banaye?"',
        choices: ["Validate eco cost model on shared topology","Avoid highways means lowest fuel always","User choice supplies missing cost model","New graph mandatory for every metric"],
        answer: 0,
        explain: 'Cost function ek chunaav hai.',
       choiceExplanations: ["Cost function ek chunaav hai.","Fuel slope, speed, stops and vehicle efficiency se vary karta hai.","Choice meaningful tab jab alternatives ka modeled cost available ho.","Many road/turn constraints reused with a new metric ho sakti hain."] },
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
    { front: 'CRP ka idea?', back: "Metric-independent partition/topology reuse; traffic/cost metric separately customize. Course ka one-level overlay affected cell recompute dikhata hai. Real multilevel indexes mein affected higher-level shortcuts bhi refresh ho sakte hain." },
    { front: 'Lab 24: jam ke baad?', back: "Ek cell dobara: 13 ms; poora naksha: 1,226 ms (94×) — jawab bilkul same (ETA 20.25)." },
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
    "<h3>📱 Sadak par sensor nahi, jeb mein</h3>\n     <p>Traffic numbers <b>phones</b> se aate hain: anonymous position + speed. Ek sadak par saikdon phones 10 km/h par = jam.\n     Bheed hi sensor hai. 2020 mein Berlin ke artist Simon Weckert ne 99 phones ek laal gaadi mein bhar ke khaali sadak par\n     ghumaye — Maps ne wahan jam dikha diya.</p>\n     <h3>🧲 Map matching</h3>\n     <p>GPS kuch metre galat hota hai — galat sadak, building, nadi. Ek point anishchit hai, par <b>points ki lakeer</b> nahi.\n     <b>Hidden Markov Model</b> sabse sambhav sadkon ka kram chunta hai → blue dot sadak se chipka, aur speed sahi segment ko\n     milti hai (teen sadkon mein bikhri nahi).</p>\n     <h3>🔮 40 minute ki drive mein \"abhi\" kam maayne rakhta hai</h3>\n     <p><b>History</b>: har segment laakhon baar chala hai → roz ka speed curve (weekdays 5: 30 dheema, Sunday subah khaali) =\n     baseline. Kamzori: aaj aam din nahi, aur ek highway ka jam feeders mein phailta hai → DeepMind ke <b>supersegments + graph\n     neural network</b>: node aur uske padosi dekho → phailte jam jaldi pakdo; history baseline ko aaj ke area-wide flow se modo.</p>",
    "<h3>🗓️ Time-dependent routing</h3>\n     <p>Raaste ko <b>samay mein aage</b> chalo: pehli sadak nikalne ke waqt ki speed par, uska time jodo, agli sadak <b>us</b>\n     waqt ki speed par jab tum wahan pahunchoge… Edges numbers nahi, <b>arrival time ke functions</b> hain. ETA = predicted\n     segment times ka jod, predicted palon par. Chalte-chalte lagatar recheck; crash → segment cost ucchla → reroute. Closures,\n     construction, crash reports — kai Waze (Google ka) se. Aur alternatives sach mein alag hon, ek hi sadak ke 10 roop nahi.</p>\n     <pre>lab 24 (ex2) — shaam ka rush, seekha hua curve vs aaj ka asli (peak 9 min late):\nnikalne ka time   \"abhi wali speed\"   time-dependent   asli     static ki galti   TD ki galti\n     17: 00             52.3 min          70.0 min      69.9      -17.6 min        +0.1\n     18: 30             99.4 min          66.8 min      74.7      +24.6 min        -7.9</pre>\n     <h3>🌊 Pipeline</h3>\n     <p>Arabon anonymous pings → edge → map matching → per-segment <b>streaming</b> aggregation (rolling windows, raat ka batch\n     nahi) → har segment ki abhi ki speed → sirf badle cells ka customization → serving fleet → edge cache. Query ko milta hai:\n     pakka structure + ≤ do minute purani cost layer. Hot path turant, update path ko thoda peeche rehne ki chhoot — dono alag.</p>\n     <p class=\"tip\">⚖️ Keemat: bina history wali ghatna (taaza crash, toofan) par forecast aatmavishwas se galat; aur ~2 arab\n     phones ki location — anonymization hi tay karta hai ki yeh manzoor hai bhi ya nahi.</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — "abhi wali speed" vs time-dependent ETA',
      project: '24-google-maps',
      exercise: 'ex2',
      goal: "16: 00 se 20: 00 tak har aadhe ghante nikalo — static ETA aur time-dependent ETA ki asli safar se galti.",
      why: "<code>tools/eta.js</code>: 30 sadkein, har ek free-flow mein 1.2 min. Maps ke paas SEEKHA hua curve (peak 18: 15), aaj ka asli\n        traffic thoda alag (peak 18: 24, thoda zyada) — isliye time-dependent bhi perfect nahi. Koi server nahi.",
      steps: [
        { text: 'ETA tool chalao.', cmd: 'cd docker-labs/24-google-maps && node tools/eta.js', expect: '     17:00               52.3 min          70.0 min         69.9 min      -17.6 min    +0.1 min\n     18:30               99.4 min          66.8 min         74.7 min      +24.6 min    -7.9 min\n\nSabse buri galti 18:30 par: 24.6 min (33%).' },
        { text: 'Aakhri lines padho.', cmd: 'node tools/eta.js | tail -4', expect: 'Time-dependent ki sabse buri galti: -8.3 min — aur wo bhi sirf isliye ki aaj ka peak seekhe hue curve se 9 min late tha.' },
      ],
      observe: {
        q: "18: 30 par \"abhi wali speed\" ne 24.6 min ZYADA kyun bataya?",
        choices: ["Departure snapshot missed later easing","All travel speeds permanently constant","GPS error only possible ETA cause","Delay always worsens throughout trip"],
        answer: 0,
        explain: 'Weight ek number nahi, waqt ka function hai — pahunchne ke waqt ki speed lagao.',
       choiceExplanations: ["Weight ek number nahi, waqt ka function hai — pahunchne ke waqt ki speed lagao.","Question traffic changing time ke saath model karta hai.","Prediction assumptions alone difference explain kar sakti hain.","After-peak congestion ease ho sakta hai."] },
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
        choices: ["Arrival-time estimates + live updates","Current speed fixed for entire trip","Same promised ETA for every customer","All-day average hides rush hour shape"],
        answer: 0,
        explain: 'Lab: static ki galti 33% tak, time-dependent ~8 min.',
       choiceExplanations: ["Lab: static ki galti 33% tak, time-dependent ~8 min.","Long trip later traffic conditions traverse karti hai.","Distance, departure time and live traffic vary karte hain.","Daily mean temporal structure and uncertainty hide karta hai."] },
      {
        q: 'Interviewer: "99 phones ek gaadi mein — fake jam. Kaise bachoge?"',
        choices: ["Multiple signals + adversarial checks","Every same-speed group is malicious","Only one sensor type is sufficient","GNN label guarantees authentic traffic"],
        answer: 0,
        explain: 'Crowd sensor tabhi achha jab crowd asli ho — anomalies pakdo.',
       choiceExplanations: ["Crowd sensor tabhi achha jab crowd asli ho — anomalies pakdo.","Real buses, convoys and queues correlated movement rakh sakte hain.","Single-source manipulation/failure broader estimate distort kar sakti hai.","Model name ground truth or robustness guarantee nahi."] },
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
    { front: 'Time-dependent routing?', back: "Edge weight = arrival time ka function. Lab: static ETA 18: 30 par 24.6 min galat (33%); time-dependent ~8 min." },
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
    "<h3>🧩 Tiles — quadtree</h3>\n     <p>Duniya ko squares mein kaato; har zoom level par ek tile 4 mein toot-ta hai = <b>quadtree</b>. Sirf woh kuch tiles\n     (~9) bhejo jo screen par hain, tumhare paas cache.</p>\n     <table>\n       <tr><th></th><th>🖼️ Raster tiles</th><th>✏️ Vector tiles</th></tr>\n       <tr><td>Kya</td><td>Tayyar images</td><td>Instructions: line, park, building</td></tr>\n       <tr><td>Kaun banata hai</td><td>Server</td><td>Phone ka GPU</td></tr>\n       <tr><td>Ghumana / 3D / smooth zoom</td><td>Nahi</td><td>Haan</td></tr>\n       <tr><td>Style badla</td><td>Duniya ki har image dobara</td><td>Bas naye rules</td></tr>\n       <tr><td>Size</td><td>Bada</td><td>Chhota (kamzor network ke liye achha)</td></tr>\n     </table>\n     <p class=\"tip\">🎯 <b>Kaam wahan karo jahan sasta ho</b> — device rendering server work shift karti hai; battery, data, compatibility aur client compute free nahi.</p>",
    `<h3>📍 "Mere paas coffee"</h3>
     <p>Lat/long 2 dimensions hain — aam DB index (B-tree) ek dimension mein sort karta hai. <b>S2</b>: ek space-filling
     (Hilbert-style) ordering hierarchy ke descendant cells ko contiguous ID ranges deti hai. Region covering se
     <b>64-bit cell ranges</b> scan karo, phir exact distance filter lagao. Nearby points different cell/face boundaries par
     distant IDs rakh sakte hain; geometric nearness aur numeric nearness identical nahi.</p>
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
        choices: ["Hierarchy cells map to contiguous ID ranges","Nearby points always neighboring IDs","Hilbert curve encrypts coordinates","Space curve removes all false positives"],
        answer: 0,
        explain: "S2 hierarchy mein a cell ke descendant IDs contiguous range form karte hain. Nearby coordinates ka ID difference small hona guaranteed nahi, especially cell/face boundaries par. Region covering and final geometry filtering use karo.",
       choiceExplanations: ["S2 hierarchy mein a cell ke descendant IDs contiguous range form karte hain. Nearby coordinates ka ID difference small hona guaranteed nahi, especially cell/face boundaries par. Region covering and final geometry filtering use karo.","Boundary-near points can have distant curve indexes.","Spatial ordering encryption/privacy mechanism nahi.","Covering ranges need geometric filtering at boundaries."] },
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
        choices: ["Cell cover index plus exact distance filter","Only cell-key change is accurate position","Any prefix cell equals exact circle","Compute distance to every driver first"],
        answer: 0,
        explain: "S2/geohash covering cells candidate IDs reduce karti hain; exact radius distance filter then apply karo. H3 neighbor/cell lookups different encoding use karte hain, universal Hilbert range assumption nahi. Same cell ke andar moving driver ke coordinates bhi update karo.",
       choiceExplanations: ["S2/geohash covering cells candidate IDs reduce karti hain; exact radius distance filter then apply karo. H3 neighbor/cell lookups different encoding use karte hain, universal Hilbert range assumption nahi. Same cell ke andar moving driver ke coordinates bhi update karo.","Within-cell movement stored coordinates still update karne honge.","Covering cells radius ke bahar candidates include kar sakti hain.","Spatial index candidate set reduce karta hai before exact distance math."] },
      {
        q: "Dark map mein labels, road classes aur contrast independently style karne hain; existing raster tiles hain. Long-term flexible approach?",
        choices: ["Vector geometry with semantic style rules","CSS invert preserves every map contrast","Every vector tile has zero render cost","New server alone changes old pixels"],
        answer: 0,
        explain: "Vector tiles geometry and semantic styles separate karti hain. Raster CSS filtering quick approximation ho sakti hai, but independent road/label styling and validated contrast limited hain; raster rerender is another valid tradeoff.",
       choiceExplanations: ["Vector tiles geometry and semantic styles separate karti hain. Raster CSS filtering quick approximation ho sakti hai, but independent road/label styling and validated contrast limited hain; raster rerender is another valid tradeoff.","Raster filters approximate dark mode but labels/roads colors distort kar sakte hain.","Client rendering CPU/GPU and style validation still required hain.","Server capacity without rerender/style logic imagery semantics nahi badalti."] },
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
    { front: 'S2 ka jaadu?', back: 'Hierarchical cells ke descendant IDs contiguous ranges banate hain. Region ko cells se cover karo, candidate ranges scan karo aur exact geometry filter lagao. Nearby points ke ID difference par universal bound nahi. Lab: 10 lakh → 264 rows.' },
    { front: 'Maps ke paanch sabak?', back: 'Dheema vs tez badlaav alag; react nahi predict; users sensor; kai dimensions ek key; kaam wahan jahan sasta.' },
  ],
},
]);

})();
