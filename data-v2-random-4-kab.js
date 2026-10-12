/* =====================================================================
   🛡️ Playlist · 1 Resilience — Randomness · level 4: KAB
   Sikka kahan uchhaalein, kahan nahi. Wahi auzaar teen jagah: retries, server chunna, leader chunna.
   Number asli run se hain: docker-labs/41-load-balancing (tools/algos.js, tools/slowmo.js, tools/mini.js),
   docker-labs/09-raft (tools/election.js) aur docker-labs/37-retries (slow motion — Retries levels mein padha ja chuka).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'many', icon: '👥', label: 'bahut saare', x: 135, y: 105 },
  { id: 'same', icon: '⏰', label: 'ek hi pal, ek hi niyam', x: 455, y: 105 },
  { id: 'herd', icon: '🐑', label: 'jhund', x: 775, y: 105 },
];

VISUALS['rn-kab'] = {
  t: 'Jhund tab banta hai jab bahut saare, ek hi jaankari par, ek hi niyam se, ek hi pal par chalte hain — random in chaar mein se ek cheez todta hai',
  html: SD.viz.svg(NODES, [{ from: 'many', to: 'same' }, { from: 'same', to: 'herd' }], {
    nodes: { many: { tone: 'acc', badge: 'phones · requests · nodes' }, same: { tone: 'slow', badge: 'yahan random milao' }, herd: { tone: 'bad', badge: 'sab ek hi jagah' } },
    flows: [{ from: 'many', to: 'same', label: 'sab', tone: 'acc' }, { from: 'same', to: 'herd', label: 'saath', tone: 'bad' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rn-kab',
  icon: '⚖️',
  group: '🎲 Randomness',
  title: 'Randomness 4 · Kab — sikka kahan uchhaalein, kahan nahi',
  badge: 'Sikka Panch',
  objectives: [
    'Retries, server chunna, leader chunna — teeno mein jhund ek hi wajah se kyun bana?',
    'Kahan random milana hai, kahan taaza jaankari dekhni hai, aur kahan random bilkul nahi chahiye?',
    'Random ki keemat kya hai?',
    'Load balancer ka tareeka kis situation mein kaunsa?',
  ],
  lesson: [
    `<h3>🐑 Teen incidents, ek hi wajah</h3>
     <p>KhanaKart ke teen alag incidents:</p>
     <ul>
       <li><b>payment-service</b> 1.4 second ke liye giri — aur phir baar-baar girti rahi. Saare phones ek saath laute.</li>
       <li><b>menu-service</b> mein ek server par dher laga, phir doosre par. Saari requests ne wahi "sabse khaali" server chuna.</li>
       <li>Ek <b>cluster</b> ko naya leader chunna tha. 10 second tak koi leader nahi bana.</li>
     </ul>
     <pre>lab (leader chunna): paanch nodes, sab ka intezaar barabar
10 s mein koi leader nahi · 103–105 elections · har baar vote bant gaye</pre>
     <p>Teeno mein kisi ne galat kaam nahi kiya. Sab ne <b>wahi sahi kaam, ek hi pal par</b> kiya.</p>
     <p class="tip">👉 Is level mein pehle tum faisla karoge: sikka kahan uchhaalna hai. Phir number: random kya deta hai, aur kya leta hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Sikka uchhaalein — ya nahi?',
      instructions: 'Nau situations. Har ek ke liye sahi bin chuno. Pehle apna jawab socho, phir daalo.',
      bins: [
        { id: 'rand', label: '🎲 Random milao' },
        { id: 'look', label: '👀 Taaza jaankari dekho (ya do mein se behtar)' },
        { id: 'same', label: '📌 Hamesha wahi — random nahi' },
      ],
      items: [
        { text: 'Sau phones ki call ek hi pal fail hui. Sab ko 2 second baad dobara bhejna hai', bin: 'rand', explain: 'Sab 2 second baad ek saath lautenge. Intezaar mein random milao, taaki phones alag-alag pal par lautein. (Retries levels: 6 mein se 0 order → 6 mein se 6.)' },
        { text: 'Paanch nodes ko naya leader chunna hai. Sab ka intezaar ka samay barabar rakha gaya hai', bin: 'rand', explain: 'Sab ek saath jaagenge aur sab khud ko vote denge. Har node ka intezaar random ho. Lab: barabar samay → 10 s mein koi leader nahi.' },
        { text: 'Das hazaar cache entries ek hi pal par bani thi, aur sab 5 minute baad expire hongi', bin: 'rand', explain: '5 minute baad das hazaar requests ek saath database par jaayengi. Har entry ke expiry mein thoda random milao.' },
        { text: 'Har server par ek job theek raat 12:00:00 par chalta hai aur wahi database kholta hai', bin: 'rand', explain: 'Sab servers ek hi second mein database par. Har server par shuru hone ka samay thoda alag (random) rakho.' },
        { text: 'Load balancer ke paas har server ka CPU hai — par 10 second purana', bin: 'look', explain: 'Purani jaankari par "sabse khaali" chunoge toh jhund. Load balancer ki apni ginti dekho, ya do random servers mein se behtar lo. Lab: line 92–106 → 29–32.' },
        { text: 'Paanch servers mein se ek ki disk dheemi ho gayi; load balancer baari-baari bhej raha hai', bin: 'look', explain: 'Baari-baari andha hai: dheeme server ko barabar hissa. Load balancer ki apni ginti dheeme server ko khud pehchaan leti hai. Lab: line 91–113 → 0–1.' },
        { text: 'User ka cart ek server ki memory mein rakha hai. Us user ki agli request aayi', bin: 'same', explain: 'Random server par bheja toh cart nahi milega. Is user ko hamesha wahi server chahiye.' },
        { text: 'Ek hi order ke saare events ko hamesha usi kram mein chalna hai jis kram mein events hue', bin: 'same', explain: 'Ek order ke events alag-alag workers par random gaye toh kram bigdega. Ek order → hamesha ek hi worker.' },
        { text: 'Testing: dekhna hai ki koi bhi ek server achanak band ho jaaye toh system kya karta hai', bin: 'rand', explain: 'Kaunsa server, kis pal — random. Tabhi aise raaste dikhte hain jinke baare mein kisi ne socha nahi tha. Is tareeke ka naam: chaos engineering.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain.',
      steps: [
        {
          title: '1. Jhund kab banta hai?',
          say: `Chaar cheezein ek saath hon: <b>bahut saare</b> · <b>ek hi jaankari ya ek hi ghadi</b> · <b>ek hi niyam</b> · <b>ek hi pal</b>.
            <div class="dr-scroll"><table>
              <tr><th>Kahan</th><th>Kya ek jaisa tha</th><th>Random kahan mila</th><th>Lab ka nateeja</th></tr>
              <tr><td>Retries</td><td>sab ek saath fail hue, sab ne utna hi intezaar kiya</td><td>intezaar mein</td><td>6 mein se 0 order → 6 mein se 6</td></tr>
              <tr><td>Server chunna</td><td>sab ko wahi "sabse khaali" dikha</td><td>kis server ko dekhna hai, is faisle mein (do sikke)</td><td>line 92–106 → 29–32</td></tr>
              <tr><td>Leader chunna</td><td>sab ka intezaar barabar</td><td>har node ke intezaar mein</td><td>10 s mein koi leader nahi → 273–882 ms mein leader</td></tr>
            </table></div>
            Random in chaar mein se <b>ek</b> cheez todta hai: "ek hi pal", ya "ek hi faisla". Itna kaafi hai.`,
        },
        {
          title: '2. Random ki keemat kya hai?',
          say: `<ul>
              <li><b>Akela random andha hai.</b> "Koi bhi ek" dheeme server ko barabar hissa deta hai. Lab: line 139–152.</li>
              <li><b>Random barabar nahi baant-ta.</b> Lab, paanch ek jaise servers: baari-baari ne 480 / 480 / 480 / 480 / 480 di; "koi bhi ek" ne 502 / 456 / 488 / 436 / 518.</li>
              <li><b>Random bhi kabhi takraata hai.</b> Leader chunne wale lab ke ek run mein ek baar 882 ms lage — do round. Baaki baar 273–544 ms.</li>
              <li><b>Random ko dobara banana mushkil hai.</b> Kal ka bug aaj nahi dikhta. Isliye test mein random ka beej tay rakhte hain — is course ke slow motion isi wajah se har baar wahi output dete hain.</li>
            </ul>`,
          ask: {
            q: 'Random intezaar ke saath bhi ek baar leader banne mein do round lage. Kya random fail ho gaya?',
            choices: [
              'Nahi. Random takraav ko kam karta hai, khatam nahi. Do nodes kabhi-kabhi paas-paas ka samay chun lete hain; agle round mein dono naya random samay chunte hain, aur baat sulajh jaati hai',
              'Haan — random timeout bekaar hai',
              'Haan — sab ka samay barabar kar dena chahiye',
              'Yeh lab ki galti hai; asli systems mein kabhi nahi hota',
            ],
            answer: 0,
            hint: 'Barabar samay ke saath kya hua tha: kitne second, kitne elections? Aur random ke saath sabse bura kya tha?',
            explain: 'Barabar samay: 10 s mein 103–105 elections, koi leader nahi — takraav har baar, hamesha ke liye. Random samay: sabse bura 882 ms. Random ka vaada "kabhi nahi" nahi, "baar-baar nahi" hai.',
          },
        },
        {
          title: '3. Random kab bilkul nahi?',
          say: `<ul>
              <li><b>Jab wahi jagah chahiye.</b> User ka cart, ya kisi cheez ka cache jis server par hai — request wahin jaani chahiye. Yahan "hamesha wahi" (hash) chahiye, sikka nahi.</li>
              <li><b>Jab kram zaroori hai.</b> Ek order ke events hamesha ek hi worker par.</li>
              <li><b>Jab pakka barabar bantwara chahiye aur sab ek jaise hain.</b> Tab baari-baari kaafi hai, aur random se zyada barabar.</li>
            </ul>
            Aur ek ulti galti: <b>jahan taaza jaankari sasti mil sakti hai, wahan random pehla ilaaj nahi</b>. Load balancer ki apni ginti muft hai — pehle apni ginti.`,
        },
        {
          title: '4. Load balancer ka tareeka kaise chunein?',
          say: `<div class="dr-scroll"><table>
              <tr><th>Situation</th><th>Tareeka</th><th>Lab: sabse lambi line</th></tr>
              <tr><td>Servers ek jaise, requests lagbhag ek jaisi</td><td>baari-baari</td><td>8–9</td></tr>
              <tr><td>Servers ya requests alag-alag; ek hi load balancer</td><td>sabse kam load wala, <b>apni ginti</b> se</td><td>ek dheema: 0–1 (baari-baari: 91–113)</td></tr>
              <tr><td>Load ki jaankari purani hai, ya kai load balancers hain</td><td><b>do mein se behtar</b></td><td>purani jaankari: 29–32 (sabse khaali: 92–106)</td></tr>
              <tr><td>Grahak ko hamesha wahi server chahiye</td><td>hash</td><td>—</td></tr>
            </table></div>
            <b>Kal subah:</b> apne load balancer ki config kholo. Teen cheezein likho: tareeka kaunsa hai (kuch nahi likha toh shayad baari-baari), load ki jaankari kahan se aati hai, aur yeh jaankari kitni purani hoti hai.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> random wahan milao jahan <b>bahut saare ek saath ek jaisa faisla</b> lete hain. Jahan taaza jaankari mil sakti hai, pehle taaza jaankari dekho. Aur jahan "hamesha wahi" chahiye, wahan random bilkul nahi.',
    },

    /* ---------------- 3. wahi auzaar, doosri jagah: leader chunna ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — leader chunna: barabar intezaar banaam random intezaar',
      project: '09-raft',
      exercise: 'ex1-election',
      goal: 'Paanch nodes ka cluster. Leader ko maaro aur naapo ki naya leader kitni der mein banta hai. Pehle har node ka intezaar random (300–600 ms); phir sab ka barabar.',
      why: 'Jab leader ki khabar aani band hoti hai, har node kuch der intezaar karta hai, phir khud ko ummeedvaar bana ke vote maangta hai. Leader banne ke liye 5 mein se 3 vote chahiye. <code>services/raft-node.js</code> yahi karta hai (seekhne wala chhota Raft — production ke liye nahi). Barabar intezaar wale run mein nodes ki ghadiyan jaan-boojh ke ek hi taal par rakhi gayi hain, taaki takraav har baar ho.',
      steps: [
        { text: 'Paanch nodes chalao (ek terminal mein).', cmd: 'cd docker-labs/09-raft && npm start ex1-election', expect: 'ex1-election\n  raft-node 1 → http://localhost:4901\n  raft-node 2 → http://localhost:4902\n  …' },
        { text: 'Doosre terminal mein: leader ko teen baar maaro. Har baar naya leader kitni der mein bana?', cmd: 'node tools/election.js', expect: "pehla leader: node 5 (term 1)\n  node 5 maara → node 4 leader  476 ms mein   (term +1)\n  node 4 maara → node 5 leader  439 ms mein   (term +1)\n  node 5 maara → node 3 leader  434 ms mein   (term +1)\nRANDOM timeouts → average failover: 450 ms" },
        { text: 'Pehle terminal mein Ctrl+C, phir sab ka intezaar barabar karke dobara. Tool 10 second tak leader ka intezaar karega.', cmd: 'SAME_TIMEOUT=1 npm start ex1-election\nSAME_TIMEOUT=1 node tools/election.js', expect: "10 s mein KOI leader nahi bana — term 21 tak pahunch gaye, kul 104 elections (har baar vote bant gaye)\nSAME timeouts → sab ek saath candidate, sab khud ko vote, kisi ko majority nahi ❌" },
      ],
      observe: {
        q: 'Barabar intezaar ke saath 10 second mein 104 elections hue aur koi leader nahi bana. Har election mein kya hua hoga?',
        choices: [
          'Paanchon nodes ek hi pal jaage, paanchon ne khud ko vote diya, kisi ko 3 vote nahi mile. Phir sab ne utna hi intezaar kiya aur phir ek saath jaage',
          'Nodes ek doosre tak pahunch hi nahi paaye',
          'Leader bana tha, par turant mar gaya',
          'Vote ginne mein galti hui',
        ],
        answer: 0,
        explain: 'Wahi jhund: bahut saare, ek hi ghadi, ek hi niyam, ek hi pal. Random intezaar mein ek node baaki se pehle jaagta hai, vote maangta hai, aur baaki nodes usi node ko vote de dete hain.',
      },
      lesson: 'Retries mein random ne phones ko alag-alag pal par lautaya. Yahan random ne nodes ko alag-alag pal par jagaya. Auzaar wahi hai.',
    },

    /* ---------------- 4. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Random aur load balancing ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Random sabse achha load balancing tareeka hai."', bin: 'myth', explain: 'Random jhund nahi banata, par andha hai. Lab: ek dheeme server ke saath line 139–152. Load balancer ki apni ginti ke saath: 0–1.' },
        { text: '"Sabse khaali server ko bhejna hamesha sabse samajhdaar hai."', bin: 'myth', explain: 'Tabhi, jab jaankari taaza ho. Lab: 0.5 s purani jaankari → line 92–106; baari-baari, bina jaankari → 8–9.' },
        { text: '"Baari-baari requests barabar baant-ta hai, toh bojh bhi barabar hai."', bin: 'myth', explain: 'Ginti barabar, bojh nahi. Lab: dheeme server ko bhi 480 requests; dheeme server ki line 91–113.' },
        { text: '"Random intezaar ho toh leader chunne mein kabhi takraav nahi hota."', bin: 'myth', explain: 'Kabhi-kabhi hota hai, par sulajh jaata hai. Lab: ek baar 882 ms aur do round. Barabar intezaar: 10 s mein koi leader nahi.' },
        { text: '"Jitne zyada servers dekh ke chuno, utna achha."', bin: 'myth', explain: 'Sab ko dekhna = "sabse khaali" = jhund. Lab (ek hi purana haal, 1,000 requests): sab ko dekho → 0 / 1000 / 0. Do ko dekho → 0 / 694 / 306.' },
        { text: '"Do mein se behtar" kabhi sabse bhare server ko nahi chunta.', bin: 'true', explain: 'Sabse bhara server jis bhi jodi mein ho, jodi ka doosra server zyada khaali hota hai. Lab: S1 (sabse bhara) ko 1,000 mein se 0.' },
        { text: 'Load balancer apni ginti se dheeme server ko pehchaan leta hai — bina kisi ke bataye.', bin: 'true', explain: 'Dheeme server ki requests der tak lauti nahi, toh dheeme server ki ginti oonchi rehti hai. Lab: dheeme server ko 201–245 requests (baari-baari mein 480).' },
        { text: 'Jhund ke liye ek jaisi jaankari aur ek jaisa niyam, dono chahiye. Ek tod do, jhund toot jaata hai.', bin: 'true', explain: 'Jaankari taaza karo (apni ginti) — ya faisle mein random milao (do sikke). Lab mein dono ne kaam kiya.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — kab aur kahan',
    instructions: 'Yahan pattern pehchaanna hai, aur pattern ki hadd bhi. 🎤',
    questions: [
      {
        q: '"Distributed systems mein randomness kahan-kahan jaan-boojh ke daali jaati hai, aur kyun?"',
        choices: [
          'Jahan bahut saare hisse ek saath ek jaisa faisla lete hain: retry ke intezaar mein (jitter), server chunne mein (do random mein se behtar), leader chunne ke intezaar mein, cache expiry aur scheduled jobs ke samay mein, aur failure testing mein. Maqsad har jagah ek: sab ek hi pal par ek hi jagah na pahunchein',
          'Sirf password aur encryption mein',
          'Kahin nahi — distributed systems mein sab kuch pakka hona chahiye',
          'Sirf load testing mein',
        ],
        answer: 0,
        explain: 'Lab: retries 6 mein se 0 → 6 mein se 6 order. Server chunna: line 92–106 → 29–32. Leader chunna: 10 s mein koi nahi → 273–882 ms.',
      },
      {
        q: '"Raft jaise algorithm mein election timeout random kyun hota hai?"',
        choices: [
          'Taaki leader ke jaane par saare followers ek hi pal ummeedvaar na banein. Barabar timeout ho toh sab ek saath khud ko vote dete hain aur kisi ko majority nahi milti — baar-baar. Random timeout mein ek node pehle jaagta hai aur baaki nodes usi node ko vote de dete hain',
          'Taaki hacker timeout ka andaza na laga sake',
          'Taaki network ka bojh kam ho',
          'Kyunki ghadiyan kabhi sahi nahi hoti',
        ],
        answer: 0,
        explain: 'Lab: barabar timeout → 10 s mein 103–105 elections, koi leader nahi. Random (300–600 ms) → teen run mein ausat 374–557 ms.',
      },
      {
        q: '"Kab tum random load balancing NAHI lagaoge?"',
        choices: [
          'Jab grahak ko hamesha wahi server chahiye (session, cache) — tab hash. Jab servers ya requests ek jaisi na hon — tab load dekhne wala tareeka (apni ginti, ya do mein se behtar), kyunki akela random dheeme server ko barabar hissa deta hai',
          'Kabhi nahi — random hamesha theek hai',
          'Jab servers 10 se zyada hon',
          'Jab traffic kam ho',
        ],
        answer: 0,
        explain: 'Lab: ek dheeme server ke saath random ki line 139–152; load balancer ki apni ginti ke saath 0–1.',
      },
    ],
  },
  success: [
    'Jhund ki chaar shartein bata sakte ho, aur teen jagah dikha sakte ho jahan random jhund ko todta hai',
    'Random ki keemat bata sakte ho: andha, na-barabar, kabhi-kabhi takraav, dobara banana mushkil',
    'Load balancer ka tareeka situation dekh ke chun sakte ho — number ke saath',
  ],
  cards: [
    { front: 'Jhund kab banta hai?', back: 'Bahut saare · ek hi jaankari ya ghadi · ek hi niyam · ek hi pal. Random ek cheez todta hai. Retries: 6 mein se 0 → 6. Server chunna: line 92–106 → 29–32. Leader: 10 s mein koi nahi → 273–882 ms.' },
    { front: 'Random ki keemat?', back: 'Akela random andha hai (dheeme server: line 139–152); barabar nahi baant-ta; kabhi-kabhi takraata hai (ek baar 882 ms); dobara banana mushkil — test mein beej tay rakho.' },
    { front: 'Random kab nahi?', back: 'Wahi jagah chahiye (cart, cache → hash) · kram zaroori hai · pakka barabar bantwara chahiye aur sab ek jaise hain (baari-baari). Aur jahan taaza jaankari muft hai, pehle taaza jaankari.' },
    { front: 'Load balancer: kaunsa tareeka kab?', back: 'Ek jaise servers → baari-baari. Alag-alag servers/requests → sabse kam load wala, apni ginti se. Purani jaankari ya kai load balancers → do mein se behtar. Wahi server chahiye → hash.' },
    { front: 'Barabar election timeout mein kya hota hai?', back: 'Sab ek saath ummeedvaar, sab khud ko vote, kisi ko majority nahi — baar-baar. Lab: 10 s, 103–105 elections, koi leader nahi. Random (300–600 ms): ausat 374–557 ms.' },
  ],
},
]);

})();
