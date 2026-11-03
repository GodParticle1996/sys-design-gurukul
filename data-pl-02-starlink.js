/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · Starlink: network jo kabhi tikta nahi

   Source: "How STARLINK Works" (Akhil Sharma) — measurement studies, SpaceX
   FCC filings, engineers' talks, LEO literature. SpaceX kam publish karta
   hai — jo cheezein measurement se pata chalin, woh waise hi likhi hain.
   Correction: GEO tak roshni ~120 ms ek taraf (video mein "12 ms" bola gaya).
   Docker lab: docker-labs/19-starlink
   ===================================================================== */
(function () {

VISUALS['starlink-leo'] = {
  t: 'Doori ke badle raftaar — GEO vs LEO',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">🛰️ GEO — 35,786 km</span>\n        <div class=\"dg-cap\">24 ghante ka orbit, ek jagah \"ruka\" dikhta hai; ek satellite 1/3 duniya; dish fixed, handover nahi.\n          Par roshni ~120 ms ek taraf → physics RTT ~477 ms, asli ~600 ms. Calls aur games ke liye bekaar.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🚀 LEO — ~550 km</span>\n        <div class=\"dg-cap\">65× paas: ek taraf &lt; 2 ms, measured RTT 20–40 ms (zyada zameen ka network). Par 7.5 km/s par\n          bhaagta hai — ~95 min ka orbit, aasmaan minutes mein paar. Har user ke liye satellites ki TRAIN chahiye.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill acc\">📡 phased array (motor nahi, beam ms mein ghoomta)</span><span class=\"dg-arrow\">+</span>\n      <span class=\"dg-pill acc\">🗺️ ephemeris (sabki aane wali jagah)</span><span class=\"dg-arrow\">+</span>\n      <span class=\"dg-pill\">📍 apna GPS</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">🎯 dhoondhna nahi, HISAAB lagana</span>\n    </div>",
};

VISUALS['starlink-schedule'] = {
  t: 'Badlaav ko surprise nahi, schedule banao',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔍 Reactive (OSPF/BGP jaisa)</span>
        <div class="dg-cap">Link mara → hello/dead-interval ke baad pata chala → phir naya raasta dhoondho.
          Lab: har handover par ~1 sec ruka.</div></div>
      <div class="dg-box is-good"><span class="bx-label">📅 Scheduled (epoch)</span>
        <div class="dg-cap">Orbital mechanics DETERMINISTIC hai → topology pehle se nikaalo, schedule bhej do. Har 15 sec
          poora constellation ek saath switch. Lab: <b>0</b> stall, p99 3 ms.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🔷</span><span class="cmd">H3 hexagon cells</span><span class="q">ek beam ≈ ek cell; cell ke users beam share karte hain; "sold out" = us cell ke saare beams bhare</span></div>
      <div class="dg-rung a"><span class="lv">15 s</span><span class="cmd">Global replan</span><span class="q">≥25° upar, power, beams, gateway, desh ke licence, GEO exclusion zone</span></div>
      <div class="dg-rung g"><span class="lv">⚡</span><span class="cmd">Asli surprise</span><span class="q">mara sat / laser → agle plan se bahar (≤15 s)</span></div>
    </div>`,
};

VISUALS['starlink-lasers'] = {
  t: 'Aasmaan mein aaina se aasmaan mein network tak',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">🪞 Gen 1 — bent pipe</span>\n        <div class=\"dg-cap\">User → satellite → seedha neeche gateway. User aur gateway dono ko ek hi satellite dikhna chahiye →\n          sirf US/Europe jaisi zameen ke paas coverage; Pacific, poles, door ke jahaaz nahi.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🔦 2021+ — laser links</span>\n        <div class=\"dg-cap\">SpaceX (2024 talk): 9,000+ laser links, ~100 Gbps each, kuch 5,400 km tak, ~40 PB/din.\n          Same-plane links (aage/peeche) hafton tak locked = backbone; cross-plane links schedule par tootte-judte.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-cap\">Glass mein roshni ~2 lakh km/s, vacuum mein ~3 lakh (≈50% tez). Space raaste ka fixed ~1,100 km upar-neeche;\n      lab ka hisaab: ~2,757 km se lambe raaste par space jeet-ta hai (fiber seedha ho tab bhi). London → Singapore: 10.8 ms aage.</div>",
};

VISUALS['starlink-anchor'] = {
  t: 'Neeche sab badle, pehchaan ek jagah tikaao',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">💻 app (SSH)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📡 dish</span><span class="dg-arrow">⇄ tunnel (har epoch naya raasta) ⇄</span>
      <span class="dg-pill good">🏢 PoP (public IP yahin)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🌐 internet server</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">🔌</span><span class="nl">direct</span><span class="ns">lab: 7 server sessions (SSH 6 baar toota), 50% jawab</span></div>
      <div class="dg-node is-gold"><span class="ni">🔁</span><span class="nl">anchor + reactive</span><span class="ns">1 session, 99%, par har handover ~1 sec ruka</span></div>
      <div class="dg-node is-good"><span class="ni">📅</span><span class="nl">anchor + scheduled</span><span class="ns">1 session, 100%, 0 stall</span></div>
    </div>
    <div class="dg-cap">Wahi pattern jo Kubernetes Service (pods ke upar), cellular packet gateway aur load balancer mein hai.</div>`,
};

SD.registerLevels('planet', [
/* =====================================================================
   1. starlink-leo
   ===================================================================== */
{
  id: 'starlink-leo',
  icon: '🛰️',
  title: 'Starlink — paas aao, toh bhaagna padega',
  badge: 'Orbit Oonchai Wala',
  objectives: [
    'GEO vs LEO: doori ke badle raftaar aur complexity',
    'Phased array dish — beam motor se nahi, hisaab se ghoomta hai',
    'Ephemeris: dhoondhna nahi, pehle se pata',
    'Lab: GEO/LEO physics aur fiber vs vacuum',
  ],
  lesson: [
    "<h3>🧭 Internet maanta hai ki router hilte nahi</h3>\n     <p>Zameen ke internet mein routers ek jagah hain; OSPF/BGP kabhi-kabhi ke, anjaane badlaav dhoondh lete hain.\n     Starlink mein 7,000+ satellites ~27,000 km/h (7.5 km/s) par bhaag rahe hain, har ~95 min mein ek chakkar —\n     topology <b>kabhi tikti hi nahi</b>. Par ek raahat: orbital mechanics <b>deterministic</b> hai. Agle hafte\n     kaunsa satellite kahan hoga, kuch metre tak pata hai. Toh badlaav ko surprise ki jagah <b>schedule</b> bana do.</p>\n     <h3>🛰️ GEO vs LEO</h3>\n     <table>\n       <tr><th></th><th>GEO (35,786 km)</th><th>LEO (~550 km)</th></tr>\n       <tr><td>Aasmaan mein</td><td>Ek jagah ruka dikhta hai</td><td>Minutes mein paar</td></tr>\n       <tr><td>Coverage</td><td>1 satellite ≈ 1/3 duniya</td><td>Hazaron chahiye, har user ke liye ek \"train\"</td></tr>\n       <tr><td>Roshni (ek taraf)</td><td>~120 ms (video mein \"12 ms\" — galat)</td><td>&lt; 2 ms</td></tr>\n       <tr><td>RTT</td><td>physics ~477 ms, asli ~600 ms</td><td>measured 20–40 ms</td></tr>\n     </table>\n     <p class=\"tip\">🎯 Starlink ne <b>doori ke badle raftaar</b> li, aur <b>latency ke badle complexity</b>.</p>",
    "<h3>📡 Dish jo kabhi dhoondhti nahi</h3>\n     <p>Dish ek <b>phased array</b> hai — saikdon chhote antenna, unke signals mein timing ka farq daal ke beam\n     electronically milliseconds mein ghumaya jaata hai. Koi tracking motor nahi (ek motor sirf install ke waqt\n     jhukane ke liye).</p>\n     <p>Aur dish satellite <b>dhoondhti</b> nahi. Uske paas <b>ephemeris</b> hai (saare satellites ki aane wali jagah)\n     aur apna GPS → kahan point karna hai, yeh <b>hisaab</b> hai. Satellite ki raftaar se frequency khisakti hai\n     (Doppler, saikdon kHz, lagatar badalta) — woh bhi pehle se nikaal ke bhejne se pehle theek kar diya jaata hai.</p>\n     <h3>📏 Lab 19 (ex2) — physics pehle</h3>\n     <pre>GEO 35,786 km: 239 ms ek taraf  → round trip 477 ms (asli ~600 ms)\nLEO    550 km: 3.7 ms ek taraf  → round trip 7.3 ms (asli 20–40 ms)</pre>",
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — roshni ki raftaar',
      goal: 'Khud nikaalo ki GEO calls ke liye kyun kharab hai.',
      problems: [
        {
          q: 'GEO satellite 35,786 km upar. Tum → satellite → zameen ka station: roshni (3,00,000 km/s) ko kitne ms?',
          unit: 'ms', given: ['35,786 km upar', 'upar + neeche = 2 × 35,786 km', '3,00,000 km/s'],
          answer: 239, tol: 0.2,
          steps: ['2 × 35,786 = 71,572 km', "71,572 / 3,00,000 = 0.239 s = 239 ms — sirf ek taraf"],
          lesson: 'Jawab wapas aane mein bhi utna hi → ~477 ms sirf physics. Asli mein ~600 ms.',
        },
        {
          q: 'LEO 550 km par wahi hisaab — ek taraf kitne ms?',
          unit: 'ms', given: ['2 × 550 km', '3,00,000 km/s'],
          answer: 3.7, tol: 0.2,
          steps: ["1,100 / 3,00,000 = 0.0037 s", "≈ 3.7 ms"],
          lesson: '65× paas → ~65× kam physics latency. Asli RTT 20–40 ms zyadatar zameen ka network hai.',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — fiber vs vacuum',
      project: '19-starlink',
      exercise: 'ex2',
      goal: 'GEO/LEO ki physics latency, aur alag-alag shahron ke beech fiber vs space lasers — kaun jeet-ta hai?',
      why: `<code>tools/latency.js</code>: glass 2 lakh km/s, vacuum 3 lakh km/s, upar-neeche 2 × 550 km, orbit height par raasta
        10% lamba (assumption). <code>--route</code> = fiber seedhi line se kitna lamba bichha hai.`,
      steps: [
        { text: 'Default (fiber bilkul seedha — best case).', cmd: 'cd docker-labs/19-starlink && node tools/latency.js', expect: 'Mumbai → Delhi            1150        5.8 ms           7.9 ms    fiber by 2.1 ms\nLondon → Singapore       10880       54.4 ms          43.6 ms    space by 10.8 ms\n\nBreak-even: ~2757 km se lambe raaste par space jeetta hai (ek taraf ka time, route factor 1).' },
        { text: "Asli fiber seedha nahi bichhta — 1.3×.", cmd: 'node tools/latency.js --route 1.3', expect: 'London → Singapore       10880       70.7 ms          43.6 ms    space by 27.1 ms\n\nBreak-even: ~1296 km se lambe raaste par space jeetta hai (ek taraf ka time, route factor 1.3).' },
      ],
      observe: {
        q: 'Mumbai → Delhi par fiber jeeta, London → Singapore par space. Kyun?',
        choices: [
          'Space ka ~1,100 km upar-neeche fixed kharcha; lamba raasta ho toh vacuum ki speed jeet-ti',
          'Asli raasta theek great-circle hota hai, isliye lambe raaste par space hamesha seedha',
          'Vacuum mein queueing ka saara delay khatam ho jaata hai, isliye lambe raaste par jeeta',
          'Fiber ki speed sheher ki umar se tay hoti hai — Singapore ka fiber purana hai',
        ],
        answer: 0,
        explain: 'Lab idealized raaston ki lambai milati hai. Space ka fixed upar-neeche ka raasta chhote raaston ko nuksaan deta hai; lambe raaston par vacuum ki ~50% zyada raftaar faayda deti hai. Asli RTT ke liye naape hue raaste aur queues chahiye.',
        choiceExplanations: [
          'Lab idealized raaston ki lambai milati hai. Space ka fixed upar-neeche ka raasta chhote raaston ko nuksaan deta hai; lambe raaston par vacuum ki ~50% zyada raftaar faayda deti hai. Asli RTT ke liye naape hue raaste aur queues chahiye.',
          'Asli raaste great-circle se lambe hote hain — lab idealized hai.',
          'Queues routers mein hain — vacuum queues nahi hata-ta.',
          'Fiber mein roshni ki speed sheher ki umar se nahi badalti.',
        ],
      },
      lesson: 'Design physics se shuru karo: kaunsa medium, kitni doori, kitna fixed overhead.',
    },
  ],
  interview: {
    title: 'Interview Round — satellite internet',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "GEO internet par video calls kharab kyun lagti hain, bandwidth theek hote hue bhi?"',
        choices: [
          'Latency physics ki hai — 35,786 km upar-neeche ≈ 477 ms RTT; bandwidth nahi bachati',
          'Call ki latency sirf bandwidth tay karti hai — GEO ki bandwidth hi asal mein kam hai',
          'Codec ka purana version hi orbit wala delay samjhata hai — naya codec lagao',
          'Zyada spectrum do toh roshni tez chalti hai — GEO ko bas aur spectrum chahiye',
        ],
        answer: 0,
        explain: 'Bandwidth pipe ki chaudai hai, latency pipe ki lambai.',
        choiceExplanations: [
          'Bandwidth pipe ki chaudai hai, latency pipe ki lambai.',
          'Sawaal kehta hai bandwidth theek hai — dikkat doori ki hai.',
          'Codec 477 ms ki doori nahi mita sakta.',
          'Roshni ki speed spectrum se nahi badalti.',
        ],
      },
      {
        q: 'Interviewer: "LEO dish satellite ko track kaise karti hai?"',
        choices: [
          'Phased array beam electronically ghumata; ephemeris + GPS se pata satellite kahan hoga',
          'Har packet par poora aasmaan scan karke satellite dhoondhti hai, phir bhejti hai',
          'Sirf motor se ghoom ke tez handovers bhi pakad leti hai — beam ki zaroorat nahi',
          'Satellite zameen ke GPS coordinates badal deta hai, taaki dish ko seedha mile',
        ],
        answer: 0,
        explain: 'Deterministic duniya mein search ki jagah hisaab. Doppler bhi pehle se theek.',
        choiceExplanations: [
          'Deterministic duniya mein search ki jagah hisaab. Doppler bhi pehle se theek.',
          'Har packet par scan bahut dheema hai — orbit pehle se pata hai.',
          'Motor itni tez handovers ke liye bahut dheemi hai.',
          'Satellite zameen ke coordinates nahi badalta.',
        ],
      },
    ],
  },
  success: [
    'Main GEO aur LEO ka trade-off numbers se samjha sakta hoon',
    'Main phased array aur ephemeris ka "hisaab, dhoondh nahi" samjha sakta hoon',
    'Main fiber vs vacuum ka break-even nikaal sakta hoon',
  ],
  homework: "<p>Apne 2 sabse zaroori network raaste lo (users → servers, ya region → region). Doori nikaalo aur\n    fiber ki physics latency (doori × 1.3 / 2,00,000 km/s) likho. Ab asli measured latency se milao — farq kitna\n    hai aur kahan jaata hai (routing, queues, handshakes)?</p>",
  cards: [
    { front: 'GEO vs LEO latency?', back: "GEO 35,786 km: ~239 ms ek taraf, ~477 ms RTT physics (~600 ms asli). LEO 550 km: ~3.7 ms ek taraf, measured RTT 20–40 ms." },
    { front: 'Starlink dish satellite kaise dhoondhti hai?', back: 'Dhoondhti nahi — ephemeris (sabki aane wali jagah) + GPS se hisaab; phased array beam electronically ms mein ghumata hai; Doppler pehle se theek.' },
    { front: 'Fiber vs vacuum break-even?', back: "Glass ~2 lakh km/s, vacuum ~3 lakh. Space ka fixed ~1,100 km. Lab: ~2,757 km se lamba raasta → space tez (fiber 1.3× lamba ho toh ~1,300 km)." },
  ],
},

/* =====================================================================
   2. starlink-schedule
   ===================================================================== */
{
  id: 'starlink-schedule',
  icon: '📅',
  title: 'Har 15 second — poore aasmaan ka naya plan',
  badge: 'Epoch Engineer',
  objectives: [
    'Hexagon cells aur beams — "sold out" ka matlab',
    '15-second global replan aur uske niyam (GEO exclusion bhi)',
    'Epoch-based reconfiguration vs reactive routing',
    'Lab: reactive vs scheduled handover',
  ],
  lesson: [
    `<h3>🔷 Zameen = hexagons</h3>
     <p>Zameen ko hexagon cells mein baanta gaya hai (availability map Uber ke <b>H3</b> use karta hai). Har satellite
     ke paas gine-chune spot beams; ek beam ≈ ek cell; cell ke saare users us beam ki bandwidth share karte hain.
     Starlink asal mein <b>"zameen ke ek tukde ke upar beam ka access"</b> bechta hai. Kisi area mein "sold out" = us
     hexagon ke upar ke saare beams bhare — nakli kami nahi.</p>
     <h3>🗓️ Har 15 second, sab kuch dobara</h3>
     <p>Measurement studies ne dekha: latency 15-second boundaries par <b>kadam</b> leti hai, sab users ke liye ek
     saath, aur beech mein dheere-dheere khisakti hai. Matlab (anumaan): har 15 sec poora constellation <b>replan</b>
     hota hai — minute mein 4 baar, din mein 5,760. Ek global optimization jo dekhta hai:</p>
     <ul>
       <li>Satellite horizon se ≥25° upar ho</li>
       <li>Power budget aur beams ki ginti</li>
       <li>Gateway dikh raha ho</li>
       <li>Desh ke licence — kaunse raaste kanooni hain</li>
       <li><b>GEO exclusion zone</b> — GEO belt ki line-of-sight par aane se pehle transmit band (regulation ki "no-transmit line" pehle se nikaal ke uske aas-paas raasta)</li>
     </ul>`,
    "<h3>🎼 Surprise nahi, symphony</h3>\n     <p>Control plane zameen par, data plane aasmaan mein. Plan <b>pehle</b> baant diya jaata hai, lagu baad mein\n     hota hai → \"convergence\" ki jagah <b>schedule</b>. 15-second ke <b>epoch</b> par satellites, dishes, gateways\n     <b>ek saath</b> palatte hain — koi router aadha-purana, aadha-naya nahi rehta.</p>\n     <p class=\"tip\">🎯 Video ka contrast: Datadog 2023 mein sab kuch ek saath badla — <b>surprise</b> ki tarah.\n     Starlink sab kuch ek saath badalta hai — <b>jaan-boojh ke</b>. Asli surprise (mara satellite, fail laser) →\n     pakdo → <b>agle</b> plan se bahar (≤15 sec).</p>\n     <h3>📏 Lab 19 — 6 satellites, epoch 3 sec (asli 15), 20 sec ki SSH-jaisi session</h3>\n     <pre>mode        jawab   server sessions   har handover par ruka\nreactive     99%         1            ~0.9–1.0 sec (dead-interval + satellite search, 21 tries)\nscheduled   100%         1            0  (p99 3 ms, 0 search, 0 resend)\nscheduled + SURPRISE=1: 100%, 1 session, 2 baar ~1 sec (reactive fallback ne bachaya)</pre>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — reactive vs scheduled handover',
      project: '19-starlink',
      exercise: 'ex1-handover',
      goal: 'Satellite har epoch nazar se bahar jaata hai (link chup ho jaata hai). Dish ko pata kab chale — heartbeat marne par, ya schedule se pehle hi?',
      why: `<code>services/sky.js</code>: 6 satellites (TCP relays), epoch k mein sirf sat <code>k % 6</code> dikhta hai; bahar gaya
        toh link blackhole (koi FIN/RST nahi — asli radio jaisa). <code>DISH_MODE=reactive</code> 1 sec dead-interval,
        <code>scheduled</code> <code>GET /schedule</code> (ephemeris) se boundary ke 30 ms baad naya tunnel.`,
      steps: [
        { text: 'Reactive mode chalao aur session test karo.', cmd: 'cd docker-labs/19-starlink && DISH_MODE=reactive npm start ex1-handover\nnode tools/session.js --secs 20', expect: 'mode=reactive  20s  pings 199  jawab 198 (99%)  rtt p50 1 ms p99 894 ms\n  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0\n  stalls >400ms: 6  sabse lamba: 997 ms\n  dish: scheduled switches 0, reactive 6, satellite search tries 21, resent 51' },
        { text: 'Scheduled mode.', cmd: 'DISH_MODE=scheduled npm start ex1-handover\nnode tools/session.js --secs 20', expect: 'mode=scheduled  20s  pings 199  jawab 199 (100%)  rtt p50 1 ms p99 3 ms\n  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0\n  stalls >400ms: 0  sabse lamba: 0 ms\n  dish: scheduled switches 7, reactive 0, satellite search tries 0, resent 0' },
        { text: 'Achaanak satellite maut (schedule mein nahi).', cmd: 'SURPRISE=1 DISH_MODE=scheduled npm start ex1-handover\nnode tools/session.js --secs 24', expect: 'mode=scheduled  24s  pings 239  jawab 239 (100%)  rtt p50 1 ms p99 801 ms\n  stalls >400ms: 2  sabse lamba: 1100 ms   t=6.0s:1100ms t=17.8s:982ms\n  dish: scheduled switches 6, reactive 2, satellite search tries 10, resent 20' },
      ],
      observe: {
        q: 'Scheduled mode mein bhi reactive fallback kyun rakha?',
        choices: [
          'Schedule predictable badlaav ke liye — mara satellite surprise hai; fallback ne 2 baar bachaya',
          'Prediction se har failure pehle se pata hota hai, par fallback sirf dikhawe ke liye rakha',
          'Reactive raasta hone se schedule bekaar ho jaata hai — dono ek hi kaam karte hain',
          'Sirf ek fixed route rakho aur kabhi reconfigure mat karo — fallback ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Predictable → pehle se hisaab. Asli surprise → reactive. Dono ka apna kaam.',
        choiceExplanations: [
          'Predictable → pehle se hisaab. Asli surprise → reactive. Dono ka apna kaam.',
          'Satellite achaanak mar sakta hai — har failure pehle se pata nahi.',
          'Schedule roz ke badlaav sasta banata hai; reactive sirf surprise ke liye.',
          'Satellites lagataar chalte hain — fixed route kaam hi nahi karega.',
        ],
      },
      lesson: 'Jo badlaav pehle se pata hai, use surprise ki tarah handle karna = har baar bekaar ka downtime.',
    },
    {
      type: 'bins',
      title: 'Predictable ya surprise?',
      instructions: 'Kaunsa badlaav pehle se schedule ho sakta hai, kaunsa sirf reactive?',
      bins: [
        { id: 'plan', label: '📅 Pehle se compute/schedule karo' },
        { id: 'react', label: '🚨 Reactive (detect → react)' },
      ],
      items: [
        { text: 'Satellite 3 minute baad horizon ke neeche jaayega', bin: 'plan', explain: 'Orbital mechanics — metres tak pata.' },
        { text: 'TLS certificate 30 din mein expire', bin: 'plan', explain: 'Date pata hai — isko incident banana sirf laparwahi.' },
        { text: 'Ek satellite ka laser achaanak fail', bin: 'react', explain: 'Asli surprise — pakdo aur agle plan se bahar.' },
        { text: 'Roz shaam 8 baje traffic ka peak', bin: 'plan', explain: 'Traffic pattern predictable hai — capacity pehle se.' },
        { text: 'Maintenance window mein database failover', bin: 'plan', explain: 'Planned failover — schedule karo, surprise mat banao.' },
        { text: 'Kisi region ka fiber kat gaya', bin: 'react', explain: 'Anjaana — detect karke reroute.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — planned change',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare cluster mein nodes har raat rotate hote hain aur har baar 30 sec errors aate hain."',
        choices: [
          'Rotation predictable hai — pehle drain, naya ready, phir switch (make-before-break)',
          'Health probes tez karo — purana host marne ke baad jaldi pata chale, bas itna kaafi',
          'Saari fail hui requests retry kar lo — retry se 30 sec ke errors users ko dikhenge hi nahi',
          'Saari rotations hamesha ke liye band kar do — na rotation, na errors',
        ],
        answer: 0,
        explain: 'Starlink ka sabak: jo aane wala hai, use schedule banao. Readiness jaanch ke hi switch.',
        choiceExplanations: [
          'Starlink ka sabak: jo aane wala hai, use schedule banao. Readiness jaanch ke hi switch.',
          'Tez probe bhi purane host ke marne ke baad hi pakdega.',
          'Retry errors chhupata hai; non-idempotent request do baar ja sakti hai.',
          'Rotation security aur patching ke liye zaroori hai.',
        ],
      },
      {
        q: 'Interviewer: "Epoch-based reconfiguration ka faayda?"',
        choices: [
          'Versioned epochs — sab ek tay pal par naye plan par, beech ki aadhi-purani haalat kam',
          'Epoch number lagate hi sab ghadiyan bilkul perfect mil jaati hain',
          'Ek config update turant har jagah ek saath pahunch jaata hai — der ka sawaal nahi',
          'Versioning se fail hue node ko sambhalne ki zaroorat hi khatam ho jaati hai',
        ],
        answer: 0,
        explain: 'Epoch/version numbers galat routing haalat pakadne aur sambhalne mein madad karte hain. Clock sync, install barriers, simit overlap aur purane node ka fallback ke bina ek saath switch ya loop-free hona pakka nahi.',
        choiceExplanations: [
          'Epoch/version numbers galat routing haalat pakadne aur sambhalne mein madad karte hain. Clock sync, install barriers, simit overlap aur purane node ka fallback ke bina ek saath switch ya loop-free hona pakka nahi.',
          'Epoch number ghadiyan nahi milata — clock sync alag chahiye.',
          'Update pahunchne mein waqt lagta hai — isliye activation ka pal tay karte hain.',
          'Purana ya fail node phir bhi sambhalna padta hai.',
        ],
      },
    ],
  },
  success: [
    'Main beams aur cells ka "sold out" samjha sakta hoon',
    'Main 15-second replan aur epoch reconfiguration ka tark de sakta hoon',
    'Main lab se reactive vs scheduled handover ka farq dikha sakta hoon',
  ],
  homework: `<p>Apne system ke 3 "planned" badlaav likho jo abhi incident jaise handle hote hain (deploy, cert rotation,
    node replacement, failover drill). Har ek ke liye likho: kya pehle se pata hai, aur use "schedule" (pehle se
    sabko batao, make-before-break) kaise banayein.</p>`,
  cards: [
    { front: 'Starlink ka 15-second epoch?', back: 'Measurements: latency 15-sec boundaries par sabke liye ek saath kadam leti hai → har 15 sec global replan; satellites, dishes, gateways ek saath palatte hain.' },
    { front: 'Replan ke niyam?', back: '≥25° upar, power, beams, gateway visibility, desh ke licence, GEO exclusion zone (GEO belt ki line-of-sight se pehle transmit band).' },
    { front: 'Lab 19: reactive vs scheduled?', back: 'Reactive: 99%, har handover ~1 sec ruka, 21 search tries. Scheduled: 100%, 0 stall, p99 3 ms.' },
  ],
},

/* =====================================================================
   3. starlink-lasers
   ===================================================================== */
{
  id: 'starlink-lasers',
  icon: '🔦',
  title: 'Bent pipe se laser mesh tak',
  badge: 'Laser Link Lagane Wala',
  objectives: [
    'Gen 1 bent pipe ki seema — coverage zameen ke paas',
    'Optical inter-satellite links: same-plane vs cross-plane',
    'Vacuum vs glass: kab space jeet-ta hai',
    'Ek packet ka safar — Atlantic ke beech jahaaz se',
  ],
  lesson: [
    `<h3>🪞 Gen 1: aasmaan mein aaina</h3>
     <p>Pehle satellites "bent pipe" the: user ka signal upar, seedha neeche ek <b>gateway</b> (fiber se juda zameen ka
     station). Shart: user aur gateway dono ko <b>ek hi</b> satellite dikhe (footprint kuch hazaar km). Isliye shuru
     mein coverage sirf continental US/Europe jaisi jagah — Pacific, poles, door ke jahaaz nahi.</p>
     <h3>🔦 2021+: satellites ke beech lasers</h3>
     <p>SpaceX ki 2024 photonics talk ke mutabik: 9,000+ laser links, ~100 Gbps each, kuch 5,400 km tak, roz ~40 PB.
     Sub-microradian pointing (bahut door ki chhoti si jagah par nishana).</p>
     <p>Dhaancha: darjanon <b>orbital planes</b> (rings).</p>
     <ul>
       <li><b>Same-plane links</b> (aage/peeche wala satellite) — relative raftaar lagbhag zero, jaise formation mein
       gaadiyan → <b>hafton</b> tak locked → yahi <b>backbone</b>.</li>
       <li><b>Cross-plane links</b> khisakte rehte hain → schedule par tootte aur dobara judte hain (pehle se pata).</li>
       <li>Uttar ja rahe aur dakshin ja rahe planes ke crossing par raftaarein jud jaati hain → zyadatar avoid.</li>
     </ul>`,
    `<h3>⚡ Vacuum vs glass</h3>
     <p>Roshni glass mein ~2 lakh km/s, vacuum mein ~3 lakh — ~50% tez. Space raaste ka fixed ~1,100 km upar-neeche ka
     kharcha hai, isliye chhote raaston par fiber jeet-ta hai. ~3,000 km se lambe raaston par space aage (Mark Handley,
     UCL ke simulations: London–Singapore, New York–Tokyo par das ms se zyada). High-frequency traders isi ke liye
     paisa dete hain.</p>
     <h3>🚢 Ek packet — Atlantic ke beech jahaaz se</h3>
     <pre>dish (pehle se point) → satellite ~2 ms
→ neeche koi gateway nahi → same-plane lasers se aage, scheduled cross-plane handovers
→ Ireland ke kinare ek gateway → fiber
→ London PoP (NAT, public IP) → internet
…aur page ke beech scheduler ne tick kiya → naya raasta, wahi anchor, TLS ko pata bhi nahi</pre>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — laser backbone',
      goal: 'Laser mesh ka paimana aur vacuum ka faayda khud nikaalo.',
      problems: [
        {
          q: 'London → Singapore 10,880 km. Seedhe fiber (2,00,000 km/s) mein ek taraf kitne ms?',
          unit: 'ms', given: ['10,880 km', '2,00,000 km/s'],
          answer: 54.4, tol: 0.2,
          steps: ["10,880 / 2,00,000 = 0.0544 s", "= 54.4 ms (asli fiber isse bhi lamba bichha hota hai)"],
          lesson: 'Glass mein roshni 1/3 dheemi.',
        },
        {
          q: "Wahi raasta space se: (1,100 km upar-neeche + 10,880 × 1.1) / 3,00,000 km/s — kitne ms?",
          unit: 'ms', given: ['fixed 1,100 km', 'raasta 10% lamba', '3,00,000 km/s'],
          answer: 43.6, tol: 0.2,
          steps: ['1,100 + 11,968 = 13,068 km', "13,068 / 3,00,000 ≈ 0.0436 s = 43.6 ms"],
          lesson: "~11 ms aage — aur fiber 1.3× lamba ho toh ~27 ms. Trading ke liye yeh sona hai.",
        },
        {
          q: '9,000 laser links × 100 Gbps — kul kitne Tbps capacity (sab ek saath full ho toh)?',
          unit: 'Tbps', given: ['9,000 links', '100 Gbps each'],
          answer: 900, tol: 0.3,
          steps: ['9,000 × 100 = 9,00,000 Gbps', '= 900 Tbps (theoretical)'],
          lesson: 'Roz ~40 PB (SpaceX 2024) — aasmaan mein ek asli backbone.',
        },
      ],
    },
    {
      type: 'quiz',
      title: 'Laser mesh ki samajh',
      questions: [
        {
          q: 'Same-plane laser links backbone kyun bante hain?',
          choices: [
            'Aage-peechhe wale satellites ki relative raftaar lagbhag zero — link hafton locked',
            'Saare satellites zameen se barabar doori par hain, isliye har link backbone ban sakta hai',
            'Laser ko pointing ki koi shart nahi — kisi bhi satellite se turant jud jaata hai',
            'Cross-plane topology kabhi nahi badalti, isliye same-plane ki zaroorat hi kam hai',
          ],
          answer: 0,
          explain: 'Formation mein chalti gaadiyon ki tarah. Cross-plane links khisakte hain, isliye schedule par chalte hain.',
          choiceExplanations: [
            'Formation mein chalti gaadiyon ki tarah. Cross-plane links khisakte hain, isliye schedule par chalte hain.',
            'Doori nahi, relative raftaar link ko tikau banati hai.',
            'Laser ko bahut sateek pointing chahiye.',
            'Cross-plane links lagataar badalte hain.',
          ],
        },
        {
          q: 'Bent pipe mein Pacific ke beech ka jahaaz internet kyun nahi paata tha?',
          choices: [
            'User aur gateway dono ko ek hi satellite dikhna tha — beech samandar koi gateway nahi',
            'Satellites samandar ke upar se kabhi guzarte hi nahi — orbit sirf zameen ke upar',
            'Jahaaz ki dish chhoti thi — dish ka size hi tay karta hai gateway kitna door ho',
            'Internet ka source jahaaz ke andar hi hona chahiye tha — bahar se aa hi nahi sakta',
          ],
          answer: 0,
          explain: 'Lasers ne satellite-to-satellite raasta diya — ab gateway door bhi ho sakta hai.',
          choiceExplanations: [
            'Lasers ne satellite-to-satellite raasta diya — ab gateway door bhi ho sakta hai.',
            'Satellites poori duniya ke upar ghoomte hain.',
            'Dish satellite tak pahunchti hai; gateway ki doori ka sawaal alag.',
            'Internet bahar se hi aata hai — gateway ke raaste.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — space networking',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Mumbai se Delhi ke liye trading link — fiber ya LEO?"',
        choices: [
          'Is idealized lab mein fiber — ~1,150 km par space ka upar-neeche bhaari',
          'LEO har fiber se hamesha tez hai — doori kitni bhi ho, space hi jeet-ta hai',
          'GEO — GEO ka propagation floor sabse chhota hai, isliye trading ke liye best',
          'Sirf bandwidth dekh ke route chuno — trading mein latency ka koi farq nahi',
        ],
        answer: 0,
        explain: 'Lab ke idealized doori aur propagation assumptions mein fiber chuna gaya. Asli Mumbai-Delhi carrier ya Starlink SLA ka result nahi; asli raaste, access links, congestion aur tail RTT naapo. Space lambe (>~3,000 km) raaston par faayda deta hai.',
        choiceExplanations: [
          'Lab ke idealized doori aur propagation assumptions mein fiber chuna gaya. Asli Mumbai-Delhi carrier ya Starlink SLA ka result nahi; asli raaste, access links, congestion aur tail RTT naapo. Space lambe (>~3,000 km) raaston par faayda deta hai.',
          'Chhote raaste par space ka upar-neeche ka kharcha bhaari padta hai.',
          'GEO ka floor ~477 ms hai — sabse bada.',
          'Trading mein latency hi sab kuch hai.',
        ],
      },
      {
        q: 'Interviewer: "Laser mesh ka ek ops challenge?"',
        choices: [
          'Cross-plane links lagataar toot-te judte hain — routing schedule par, aur failure ka budget',
          'Topology hamesha ke liye static rakh sakte hain — satellites ek jagah ruke rehte hain',
          'Laser links ko judne mein koi waqt nahi lagta — acquisition delay hai hi nahi',
          'Har failure agle schedule tak intezaar karta hai — beech mein reroute ki zaroorat nahi',
        ],
        answer: 0,
        explain: 'Topology ko time-varying graph aur planned link schedule se model kar sakte hain. Achaanak failure, link acquisition aur fallback ka reactive raasta phir bhi chahiye.',
        choiceExplanations: [
          'Topology ko time-varying graph aur planned link schedule se model kar sakte hain. Achaanak failure, link acquisition aur fallback ka reactive raasta phir bhi chahiye.',
          'Satellites lagataar chalte hain — topology badalti rehti hai.',
          'Laser ko lock hone mein waqt lagta hai.',
          'Agle plan tak intezaar = utni der traffic kho jaata.',
        ],
      },
    ],
  },
  success: [
    'Main bent pipe aur laser mesh ka farq bata sakta hoon',
    'Main same-plane vs cross-plane links samjha sakta hoon',
    'Main vacuum vs glass ka hisaab laga sakta hoon',
  ],
  homework: "<p>Lab 19 ke <code>tools/latency.js</code> mein apne do shehar jodo (routes array mein ek line). Fiber aur space\n    dono ka hisaab dekho — aur <code>--route 1.3</code> ke saath bhi.</p>",
  cards: [
    { front: 'Bent pipe ki seema?', back: 'User aur gateway dono ko ek hi satellite dikhna chahiye — coverage sirf gateways ke aas-paas; samandar/poles nahi.' },
    { front: 'Starlink laser mesh (2024)?', back: '9,000+ laser links, ~100 Gbps each, kuch 5,400 km tak, ~40 PB/din. Same-plane = hafton locked backbone; cross-plane schedule par.' },
    { front: 'Vacuum vs glass?', back: 'Vacuum ~3 lakh km/s, glass ~2 lakh (50% tez). Space ka fixed ~1,100 km; ~3,000 km se lambe raaste par space aage.' },
  ],
},

/* =====================================================================
   4. starlink-anchor
   ===================================================================== */
{
  id: 'starlink-anchor',
  icon: '⚓',
  title: 'Churn ke upar pehchaan — PoP anchor',
  badge: 'Anchor Wala',
  objectives: [
    'Raasta har 15 sec badle toh SSH kyun nahi toot-ta',
    'Ground PoP anchor + tunnel — cellular gateway jaisa',
    'Sawtooth latency aur congestion control (CUBIC, BBR)',
    'Hamesha badalta fleet aur Starlink ke saath sabak',
  ],
  lesson: [
    "<h3>⚓ Tumhara IP zameen par rehta hai</h3>\n     <p>Agar har satellite badalne par tumhara public IP badalta, har TCP connection toot-ta — SSH, video call, sab.\n     Starlink mein tumhara IP ek zameen ke <b>PoP</b> (Seattle, Frankfurt, London…) par rehta hai. Dish ↔ PoP ek\n     private tunnel hai; tunnel ke <b>andar</b> ka raasta schedule par badalta hai, dono sire <b>fixed</b>.</p>\n     <p>Isi liye geolocation tumhe PoP ke sheher mein dikhata hai (Montana ke gaon mein ho toh \"Seattle\"). BGP ko wahi\n     prefixes wahi PoPs se dikhte hain. Yeh wahi idea hai jo mobile network ka packet gateway karta hai.</p>\n     <h3>📏 Lab 19 — direct vs anchor</h3>\n     <pre>mode        jawab   server sessions   har handover par\ndirect       50%         7            ~1.7 sec + naya login (SSH 6 baar toota)\nreactive     99%         1            ~1 sec ruka\nscheduled   100%         1            0</pre>\n     <p class=\"tip\">🎯 <b>Pehchaan (identity) ko churn ke upar rakho.</b> Kubernetes Service pods ke upar, load balancer\n     backends ke upar, cellular gateway towers ke upar — sab wahi pattern.</p>",
    "<h3>🪚 Sawtooth latency</h3>\n     <p>Latency trace ek repeat hone wala <b>sawtooth</b> hai: 20–60 ms, har 15 sec kadam, handover par kuch packets\n     loss. TCP ke liye dikkat:</p>\n     <ul>\n       <li><b>CUBIC</b> handover ke loss ko congestion samajh ke speed kaat deta hai.</li>\n       <li><b>BBR</b> ka min-RTT andaaza har 15 sec khisak jaata hai.</li>\n     </ul>\n     <p>Jahaaz, hawai jahaaz, mines jaise users ke liye: link <b>\"periodically changing\"</b> hai, \"unreliable\" nahi →\n     buffers, timeouts, congestion control usi hisaab se tune karo.</p>\n     <h3>🔄 Hardware badlo, software OTA</h3>\n     <p>Satellite ki umar ~5 saal; 550 km par hawa ka khinchaav mare satellites ko khud jala deta hai (self-cleaning).\n     v1.5 mein lasers, v2 mini mein zyada capacity → fleet hamesha <b>milajula</b>; scheduler har satellite ki\n     capability jaanta hai. 6 mahine mein ~50,000 automatic collision-avoidance maneuvers — har ek orbit badalta hai →\n     prediction update → pointing/Doppler/lasers/schedule dobara.</p>\n     <h3>📋 Paanch sabak</h3>\n     <ol>\n       <li>Predictable ko anjaane se alag karo — traffic pattern, maintenance, cert expiry, planned failover: pehle se compute.</li>\n       <li>Jab badlaav lagatar ho, use <b>synchronize</b> karo (epochs).</li>\n       <li>Identity churn ke upar rakho.</li>\n       <li>Future computable ho toh central planner; nahi toh distributed protocols.</li>\n       <li>Physics se shuru karo, aur <b>replacement ke liye</b> design karo.</li>\n     </ol>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — direct path vs PoP anchor',
      project: '19-starlink',
      exercise: 'ex1-handover',
      goal: 'Same 20 sec ki session — direct raasta (server connection satellite se bandha) vs PoP anchor. Server ne kitne alag sessions dekhe?',
      why: "<code>tools/session.js</code> har 100 ms <code>PING</code> bhejta hai; 1.5 sec jawab nahi → reconnect (SSH ServerAlive jaisa).\n        Server har TCP connection ko ek naya session maanta hai — session badla = SSH toota, login dobara.",
      steps: [
        { text: 'Direct mode.', cmd: 'cd docker-labs/19-starlink && DISH_MODE=direct npm start ex1-handover\nnode tools/session.js --secs 20', expect: 'mode=direct  20s  pings 199  jawab 100 (50%)  rtt p50 1 ms p99 2 ms\n  server sessions: 7  (1 = SSH kabhi nahi toota)   app reconnects: 6\n  stalls >400ms: 6  sabse lamba: 1802 ms' },
        { text: 'Anchor (scheduled) mode.', cmd: 'DISH_MODE=scheduled npm start ex1-handover\nnode tools/session.js --secs 20', expect: 'mode=scheduled  20s  pings 199  jawab 199 (100%)  rtt p50 1 ms p99 3 ms\n  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0' },
      ],
      observe: {
        q: 'Anchor mode mein satellite 7 baar badla, par server ko 1 hi session dikha. Kyun?',
        choices: [
          'Server ka TCP connection PoP se hai, satellite se nahi — neeche tunnel badla, IP/TCP wahi',
          'Satellite ka raasta saat baar bhi bilkul wahi raha, isliye session ek hi dikha',
          'Server ne alag-alag TCP sessions ko chupke se jod ke ek bana diya',
          'Kam pings ka matlab hai transport stable tha — pings se hi session ek bana',
        ],
        answer: 0,
        explain: 'Pehchaan ko churn ke upar ek fixed jagah tikao — yahi anchor ka kaam.',
        choiceExplanations: [
          'Pehchaan ko churn ke upar ek fixed jagah tikao — yahi anchor ka kaam.',
          'Satellite 7 baar badla — sawaal hi yahi kehta hai.',
          'Server sessions nahi jodta.',
          'Pings ki ginti session nahi banati.',
        ],
      },
      lesson: 'Jo cheez badalti rehti hai, uske upar ek stable anchor rakho — clients ko sirf anchor dikhe.',
    },
    {
      type: 'match',
      title: 'Wahi pattern, alag jagah',
      instructions: 'Har churn ko uske anchor se jodo.',
      pairs: [
        { left: '🛰️ Starlink satellites har 15 sec badalte', right: 'Ground PoP — public IP aur TCP wahan', explain: 'Tunnel andar badalta, sire fixed.' },
        { left: '📦 Kubernetes pods aate-jaate rehte', right: 'Service ka stable virtual IP / DNS', explain: 'Clients pod IPs nahi, Service dekhte hain.' },
        { left: '📱 Phone ek tower se doosre par', right: 'Cellular packet gateway (IP wahan anchor)', explain: 'Starlink ne yahi idea udhaar liya.' },
        { left: '🖥️ Backend servers deploy mein badalte', right: 'Load balancer ka stable address', explain: 'Deploy ke beech bhi clients ka pata wahi.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — mobility',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamari service ke backends har 10 min rotate hote hain, lambe WebSocket connections toot jaate hain."',
        choices: [
          'Stable proxy/gateway par connection khatam karo, ya drain + resume token se reconnect',
          'Timeout bada karo — lamba timeout backend badalne par bhi purani state bachaye rakhega',
          'Har WebSocket message bina soche retry karo — message pahunch hi jaayega',
          'Security rotation hamesha ke liye band kar do — na rotation, na tootna',
        ],
        answer: 0,
        explain: 'Pehchaan churn ke upar — Starlink PoP jaisa. Proxy backend badalne par andar ka raasta badle.',
        choiceExplanations: [
          'Pehchaan churn ke upar — Starlink PoP jaisa. Proxy backend badalne par andar ka raasta badle.',
          'Backend chala gaya toh timeout se state wapas nahi aati.',
          'Bina soche retry duplicate messages bhejta hai.',
          'Rotation security ke liye zaroori hai.',
        ],
      },
      {
        q: 'Interviewer: "Starlink par hamara bulk upload bahut dheema hai, loss thoda hai."',
        choices: [
          'Loss ki wajah naapo — handover ka loss CUBIC ko congestion lagta; CC tune karo',
          'Anant buffers laga do — bade buffers har tarah ka loss theek kar dete hain',
          'Sirf UDP chuno aur reliability hata do — loss ki koi fikar hi nahi bachegi',
          'Maan lo loss kabhi congestion nahi hota — har loss handover se hi aata hai',
        ],
        answer: 0,
        explain: 'Handover loss, congestion signals, RTT aur queues alag samjho. Congestion-control variants aur pacing tune karke milao; bade buffers ya BBR har jagah ka ilaaj nahi. App ki reliability bani rehni chahiye.',
        choiceExplanations: [
          'Handover loss, congestion signals, RTT aur queues alag samjho. Congestion-control variants aur pacing tune karke milao; bade buffers ya BBR har jagah ka ilaaj nahi. App ki reliability bani rehni chahiye.',
          'Bade buffers bufferbloat laate hain.',
          'Reliability hatane se data kho jaayega.',
          'Kuch loss asli congestion bhi hota hai.',
        ],
      },
    ],
  },
  success: [
    'Main PoP anchor ka design aur uska faayda samjha sakta hoon',
    'Main sawtooth latency ka TCP par asar bata sakta hoon',
    'Main Starlink ke paanch sabak apne system par laga sakta hoon',
  ],
  homework: `<p>Apne system mein ek jagah dhoondho jahan client ek badalti cheez ka pata yaad rakhta hai (pod IP, server
    hostname, leader ka address). Likho: kya uske upar ek stable anchor rakh sakte ho, aur tab failover/deploy par
    client ko kya dikhna band ho jaayega?</p>`,
  cards: [
    { front: 'Starlink mein SSH kyun nahi toot-ta?', back: 'Public IP zameen ke PoP par anchor hai; dish ↔ PoP tunnel ke andar ka raasta badalta hai, sire fixed. Lab: direct 7 sessions, anchor 1.' },
    { front: 'Sawtooth latency ka TCP par asar?', back: '20–60 ms, har 15 sec kadam + thoda loss. CUBIC loss ko congestion samjhe; BBR ka min-RTT khisake. Link periodic hai, unreliable nahi — tune karo.' },
    { front: 'Starlink ke paanch sabak?', back: 'Predictable ko pehle compute karo; lagatar badlaav synchronize karo (epochs); identity churn ke upar; computable future → central planner; physics se shuru, replacement ke liye design.' },
  ],
},
]);

})();
