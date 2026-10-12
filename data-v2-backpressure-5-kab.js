/* =====================================================================
   🛡️ Playlist · 1 Resilience — Backpressure · level 5: KAB
   Kise rokein, kise "na" bolein, kya gira dein. Line kitni badi, "kab aana hai" kitna, aur crash se pehle kaise pata chale.
   Har number docker-labs/15-backpressure ke asli run se hai: tools/queue.js (ex1), tools/hint.js (ex2), tools/chat.js (ex4).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'who', icon: '❓', label: 'bhejne wala', x: 135, y: 105 },
  { id: 'line', icon: '📥', label: 'bhari line', x: 455, y: 105 },
  { id: 'what', icon: '⚖️', label: 'faisla', x: 760, y: 105 },
];

VISUALS['bp-kab'] = {
  t: 'Bhari line ka sahi jawab bhejne wale par tika hai: ruk sakta hai · nahi rukega · data jiski keemat taazgi hai',
  html: SD.viz.svg(NODES, [{ from: 'who', to: 'line' }, { from: 'line', to: 'what' }], {
    nodes: { who: { tone: 'acc', badge: 'program? insaan? location?' }, line: { tone: 'slow', badge: 'hadd par' }, what: { tone: 'ok', badge: 'roko · "na" bolo · girao' } },
    flows: [{ from: 'who', to: 'line', label: 'kaam', tone: 'acc' }, { from: 'line', to: 'what', label: '?', tone: 'slow' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'bp-kab',
  icon: '⚖️',
  group: '🌊 Backpressure',
  title: 'Backpressure 5 · Kab — kise rokein, kise "na" bolein, kya gira dein',
  badge: 'Faisla Ustaad',
  objectives: [
    'Kis bhejne wale ko rokna hai, kise turant "na" bolna hai, aur kaunsa data girana theek hai?',
    'Line kitni badi rakhein — aur crash se pehle kaise pata chale ki line badh rahi hai?',
    '"Kab aana hai" (Retry-After) kitna rakhein? Bahut kam ya bahut zyada ho toh kya hota hai?',
    'Screen par aane wali bheed (live chat, live feed) ke saath kya karein?',
  ],
  lesson: [
    `<h3>⚖️ Ek hi raat, teen tarah ka data</h3>
     <p>Baarish wali raat KhanaKart mein teen cheezein ek saath badh gayi:</p>
     <ul>
       <li><b>Orders</b> — customers se. Har order ke peeche paisa hai.</li>
       <li><b>Riders ki location</b> — har rider ke phone se, har second.</li>
       <li><b>Raat ki report</b> — ek program jo din bhar ke orders padh ke hisaab banata hai.</li>
     </ul>
     <p>Teeno ke raaste mein ek dheemi kadi hai. Teeno ko <b>ek hi jawab</b> doge toh do galat honge:</p>
     <pre>orders ko gira diya       → paisa kata, khaana nahi aaya
location ko rok diya      → map par rider purani jagah par dikhta raha
report ko "na" bol diya   → hisaab adhoora, jabki report ruk sakti thi</pre>
     <p class="tip">👉 Is level mein pehle tum faisla karoge. Phir number dekhenge: line kitni badi, "kab aana hai" kitna, aur crash se pehle kaise pata chale.</p>`,
  ],
  stages: [
    /* ---------------- 1. pehle socho ---------------- */
    {
      type: 'bins',
      title: 'Roko, "na" bolo, ya girao?',
      instructions: 'KhanaKart ki nau situations. Har ek mein line bhar gayi hai. Sahi jawab wale bin mein daalo. Pehle apna jawab socho, phir daalo.',
      bins: [
        { id: 'block', label: '✋ Bhejne wale ko roko — woh ruk sakta hai' },
        { id: 'no', label: '🚪 Turant "na" bolo, aur batao kab aana hai' },
        { id: 'drop', label: '🗑️ Gira do — purana ya extra' },
      ],
      items: [
        { text: 'Customer "Order place" dabata hai; order-service ki line bhari hai', bin: 'no', explain: 'Customer ruk nahi sakta, aur order girana jhooth hai. Paisa kaatne se <b>pehle</b> turant bolo "abhi bahut bheed hai", aur phone ko batao kab try karna hai.' },
        { text: 'Raat ka program din bhar ke orders padh ke report wale database mein likh raha hai; database dheema hai', bin: 'block', explain: 'Program ko jaldi nahi, aur koi insaan intezaar nahi kar raha. Likhne ko <code>await</code> ke peeche rakho: program database ki raftaar par chalega. Kuch nahi girega.' },
        { text: 'Riders ke phone har second location bhejte hain; map wali service peeche reh gayi', bin: 'drop', explain: 'Purani location kisi kaam ki nahi. Sabse purana girao: line hamesha taaza rahegi. Lab: line ka sabse purana kaam 2 s purana (naya girane par 10 s).' },
        { text: 'Restaurant partner 120 MB ki report download kar raha hai; partner ka internet dheema hai', bin: 'block', explain: 'File ruk sakti hai. <code>pipeline()</code>: reader utna hi padhega jitna writer bhej paaye. Lab: writer ke andar 120 MB ki jagah 1 MB.' },
        { text: 'Ek partner company ka system KhanaKart ki API ko bahut tezi se bula raha hai', bin: 'no', explain: 'Kisi aur ka program tumhare haath mein nahi; use rok nahi sakte, sirf bata sakte ho. <code>429</code> + <code>Retry-After</code>.' },
        { text: 'Match ki raat app ki live chat: har second 5,000 messages, sab screen par dikhane hain', bin: 'drop', explain: 'Koi insaan 5,000 messages/second padh nahi sakta. Har frame mein naye kuch dikhao, baaki chhodo. Lab: 47 fps; sab dikhane ki zid par 5 fps.' },
        { text: 'Kafka se orders padhne wala consumer; consumer ke aage ka database dheema ho gaya', bin: 'block', explain: 'Yeh consumer khud maangta hai (<code>poll()</code>). Dheema ho toh kam maange, ya <code>pause()</code> kare. Messages Kafka mein surakshit hain; girane ya "na" bolne ki zaroorat nahi.' },
        { text: 'Payment company ka system payment ka nateeja bhej raha hai; KhanaKart ki service bhari hai', bin: 'no', explain: 'Saaf "na" do (503 ya 429): aise systems fail hone par dobara bhejte hain. Sabse bura: "200 OK" bol ke chupchaap gira dena — tab payment company maan legi ki khabar pahunch gayi.' },
        { text: 'Har request par ek log line likhi jaati hai; log bhejne wali line bhar gayi', bin: 'drop', explain: 'Log ke liye customer ki request ko rokna ya fail karna ulta nuksaan hai. Extra log girao — par ginti rakho ki kitne gire.' },
      ],
    },

    /* ---------------- 2. faisla likh ke rakho ---------------- */
    {
      type: 'cards',
      title: '📋 Faisla — likh ke rakho',
      goal: 'Paanch chhote cards. Har card ek hi sawaal ka jawab deta hai. Number lab ke hain.',
      steps: [
        {
          title: '1. Pehla sawaal: bhejne wala kaun hai?',
          say: `<div class="dr-scroll"><table>
              <tr><th>Bhejne wala</th><th>Bhari line ka jawab</th><th>Kyun</th></tr>
              <tr><td>Program jo ruk sakta hai: raat ka kaam, file, stream, queue se padhne wala</td><td><b>Roko</b> — <code>await</code>, <code>pipeline()</code>, ya consumer khud maange</td><td>Kuch nahi girta. Raftaar apne aap kaam karne wale ki ho jaati hai</td></tr>
              <tr><td>Insaan, ya kisi aur ka system</td><td><b>Turant "na"</b> + kab aana hai — <code>429</code> + <code>Retry-After</code></td><td>Yeh bhejne wala rukega nahi. Rokoge toh ruke hue requests tumhare andar jama honge</td></tr>
              <tr><td>Data jiski keemat taazgi hai: location, bhaav, live feed</td><td><b>Purana ya extra girao</b> — ginti ke saath</td><td>Purana data der se nahi, galat hota hai</td></tr>
            </table></div>
            Aur jo data kho bhi nahi sakta aur jiska bhejne wala ruk bhi nahi sakta? Use line mein rakho — par line <b>disk par</b> ho (Kafka jaisi), memory mein nahi. Disk wali line bhi bhar sakti hai, isliye us par bhi nazar chahiye.`,
        },
        {
          title: '2. Line kitni badi rakhein?',
          say: `Line ko ginti mein nahi, <b>seconds</b> mein socho:
            <pre>hadd = kaam karne wale ki raftaar × jitna intezaar manzoor hai</pre>
            Lab: kaam karne wala 2,000/second, hadd 20,000 → line ka aakhri kaam <b>10 second</b> rukta hai (lab mein naapa: sabse purana kaam 10 s purana). Tumhara user 2 second se zyada nahi rukega? Toh hadd 4,000.<br><br>
            Line ka kaam <b>thodi der ki tezi</b> sokhna hai. 20,000 ki line 8,000/second ke farak ko 2.5 second tak sokh sakti hai (20,000 ÷ 8,000). Farak 2.5 second se lamba chala toh line bharegi — aur wahi sawaal: bhari ho toh kya?`,
        },
        {
          title: '3. Crash se pehle kaise pata chale?',
          say: `Level 1 mein dashboard hara tha: error 0. Error dekhne se line nahi dikhti. Line ke teen number dekho:
            <ol>
              <li>Line kitni <b>lambi</b> hai. (Kafka mein is lambai ka naam <b>consumer lag</b> hai.)</li>
              <li>Line kitni <b>tezi se badh</b> rahi hai.</li>
              <li>Line ka <b>sabse purana</b> kaam kitna purana hai.</li>
            </ol>
            Lab: 10 s par 78,560 · 20 s par 1,57,360 · 30 s par 2,36,000. Yaani har second ~7,900 badh rahi hai.
            <pre>kitni der mein bharegi = (hadd − abhi ki lambai) ÷ badhne ki raftaar</pre>`,
          ask: {
            q: 'Do queues hain. Queue A 90% bhari hai aur ghanton se utni hi hai. Queue B 30% bhari hai aur har second 5% badh rahi hai. Pehle kis par daudoge?',
            choices: [
              'B par — 14 second mein bhar jaayegi (70 ÷ 5). A tiki hui hai',
              'A par — 90% zyada khatarnaak hai',
              'Dono barabar hain',
              'Kisi par nahi — jab tak error na aaye',
            ],
            answer: 0,
            hint: 'Upar wala formula B par lagao: hadd 100%, abhi 30%, raftaar 5% har second.',
            explain: 'Lambai batati hai ki abhi kahan ho. <b>Badhne ki raftaar</b> batati hai ki kitna samay bacha hai. Alert dono par lagao — sirf lambai par nahi.',
          },
        },
        {
          title: '4. "Kab aana hai" kitna rakhein?',
          say: `Lab: 150 phones → app-api → order-service (ek saath 44, ~200 orders/second). app-api 429 ke saath alag-alag <code>Retry-After</code> bhejta hai. Har baar orders ~2,990 hi poore hue. Badla yeh:
            <div class="dr-scroll"><table>
              <tr><th>app-api ka jawab</th><th>Ek order par requests</th><th>150 mein se kitne phones ka ek bhi order nahi laga</th></tr>
              <tr><td>429, bina Retry-After</td><td>179–209</td><td>0</td></tr>
              <tr><td>Retry-After 50 ms</td><td>11.6–11.7</td><td>0–2</td></tr>
              <tr><td>Retry-After 250 ms</td><td>3.1</td><td>13–24</td></tr>
              <tr><td>Retry-After 1000 ms</td><td>1.5</td><td>66–78</td></tr>
              <tr><td>Retry-After 3000 ms</td><td>1.2</td><td>89–99</td></tr>
            </table></div>
            (Teen run ka dayra.) Retry-After badhane se <b>bekaar requests ghat-ti hain</b>. Par <b>baari bigadti hai</b>: jis phone ka order abhi laga, wahi phone agla order usi pal bhejta hai jis pal jagah bani. Jo phone bahar ruka tha, woh laut-ta hai toh jagah phir bhari milti hai.<br><br>
            Do seekh:
            <ol>
              <li>Retry-After utna rakho jitni der mein jagah sach mein banegi: <b>line ÷ raftaar</b>. Yahan 44 ÷ 200 ≈ 0.2 second.</li>
              <li>Retry-After bheed kam karta hai, <b>baari nahi deta</b>. Jahan baari zaroori ho, wahan intezaar karne walon ki apni line chahiye (pehle aaya, pehle paya).</li>
            </ol>
            ⚠️ Lab ke phones lalchi hain: order lagte hi agla bhej dete hain. Asli customers aisa nahi karte, toh asli farak isse chhota hoga. Disha yahi rahegi.`,
        },
        {
          title: '5. Kab yeh kaafi nahi, kab zaroori nahi — aur kal subah kya karoon?',
          say: `<b>Kaafi nahi:</b> agar farak roz ka hai (har shaam kaam karne wala peeche), toh backpressure sirf yeh tay karta hai ki takleef <b>kisko</b> ho. Asli ilaaj tab kaam karne wale ko tez karna ya badhana hai. (Badhane se pehle dekho ki kaam karne wale ke aage kya hai: das consumers ek hi dheeme database par likhenge toh database aur dheema hoga.)<br><br>
            <b>Zaroori nahi:</b> agar bhejne wale ki raftaar pakki pata hai aur us raftaar par line kabhi hadd tak nahi pahunch sakti (jaise har minute ek chhoti file), toh kuch alag karne ki zaroorat nahi. Bas yeh "pakka pata hai" likha hua ho — andaza nahi.<br><br>
            <b>Kal subah:</b> apne system ki har line ki list banao — queue, array, thread pool, connection pool, stream. Har line ke aage teen cheezein likho: <b>hadd kya hai</b>, <b>bhari ho toh kya hota hai</b>, aur <b>kisko pata chalta hai</b>. Jis line ke aage teeno khaane khaali hain, wahi agla incident hai.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> har cheez jo kaam leti hai, ek sawaal ka jawab likh ke rakhe: <b>"jab main na sambhal paun, tab kya?"</b><br>Jawab bhejne wale par tika hai: program (roko), insaan ya doosre ka system ("na" + kab aana hai), ya taazgi wala data (purana girao). Hadd seconds mein socho, aur line ki badhne ki raftaar par alert lagao.',
    },

    /* ---------------- 3. naapi hui galti: Retry-After ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — "kab aana hai" kitna?',
      project: '15-backpressure',
      exercise: 'ex2-propagation',
      goal: 'A (150 workers = phones) → B (app-api) → C (order-service). Pehle dekho jab B sirf 503 aage badhata hai. Phir ek hi command se chhe jawab aazmao: 503, khaali 429, aur 429 ke saath chaar alag Retry-After.',
      why: '<code>services/c.js</code> = order-service (ek saath 4 kaam + 40 ki line; bhari → 503). <code>services/b.js</code> = app-api. <code>tools/client.js</code> = 150 phones. <code>tools/hint.js</code> B ka jawab chalte-chalte badalta hai aur har baar client chalata hai. Number har run mein thode alag aayenge; tarteeb wahi rahegi.',
      steps: [
        { text: 'Services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/15-backpressure && PROPAGATE=0 npm start ex2-propagation', expect: 'ex2-propagation\nC → :4853  (~200 kaam/s, line max 40)\nB → :4852  (PROPAGATE=0)' },
        { text: 'Doosre terminal mein: 150 phones, 15 second. B sirf 503 aage badha raha hai. Teesri line batati hai ki kaam workers mein kaise banta.', cmd: 'node tools/client.js', expect: "A: 72166 requests bheje → 2757 kaam poore (26.2 tries per success) | p50 274 ms p99 6932 ms\nB: C ko 72166 bheje, C ne 69409 thukraye (bekaar kaam), 0 ko 429 bina C chhue | C: 2757 kiye, 69409 rejected\nA ke 150 workers: ek worker ke kaam — sabse kam 1, beech wala 17, sabse zyada 52 | jin workers ka ek bhi kaam poora nahi hua: 0 | ek kaam par sabse lamba intezaar 14.0 s" },
        { text: 'Ab chhe jawab ek ke baad ek (~95 s). "tries/kaam" aur "khaali haath workers" wale khaane dekho.', cmd: 'node tools/hint.js', expect: "A (150 workers) → B → C (~200 kaam/s, ek saath 44) · har tareeka 15 s\n\nC bhara ho toh B ka jawab                 A ne bheje   kaam poore   tries/kaam   C ne thukraye   B ne 429 diye   ek worker ke kaam: kam / beech / zyada   khaali haath workers   sabse lamba intezaar\n503 aage badha diya (koi signal nahi)          73571         2745         26.8           70826               0                              3 / 17 / 46                      0                 12.0 s\n429, par Retry-After nahi                     602805         2975        202.6               0          599830                             12 / 20 / 30                      0                  5.4 s\n429 + Retry-After 50 ms                        34719         2985         11.6               0           31734                              0 / 20 / 49                      1                 15.0 s\n429 + Retry-After 250 ms                        9391         2990          3.1               0            6401                              0 / 17 / 68                     24                 15.3 s\n429 + Retry-After 1000 ms                       4622         2990          1.5               0            1632                               0 / 5 / 68                     66                 15.9 s\n429 + Retry-After 3000 ms                       3568         2988          1.2               0             580                               0 / 0 / 68                     96                 18.4 s" },
      ],
      observe: {
        q: 'Retry-After 250 ms se 3000 ms karne par ek kaam par requests 3.1 se 1.2 ho gayi. Toh 3000 ms behtar kyun nahi hai?',
        choices: [
          'Kyunki 150 mein se 96 workers ka ek bhi kaam nahi hua (250 ms par 24). Bekaar requests ghati, par baari bigad gayi. Retry-After utna ho jitni der mein jagah sach mein banti hai',
          'Kyunki 3000 ms par kul kaam bahut kam ho gaya',
          'Kyunki 3000 ms par C ne phir "na" bolna shuru kar diya',
          '3000 ms hi behtar hai — jitna zyada rukwao utna achha',
        ],
        answer: 0,
        explain: 'Kul kaam har baar lagbhag barabar raha (~2,990). Farak baari ka hai: jo andar hain woh andar hi rehte hain, jo bahar ruke hain woh aur der se lautte hain.',
      },
      lesson: 'Khaali 429 downstream ko bachata hai par bheed nahi hatata. Retry-After bheed hatata hai par baari nahi deta. Dono ke number dekh ke chuno.',
    },

    /* ---------------- 4. naapi hui galti: screen par bheed ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — screen par bheed: sab dikhao, ya chuno?',
      project: '15-backpressure',
      exercise: 'ex4-chat',
      goal: 'Match ki raat KhanaKart ke app ki live chat: 5,000 messages har second. Screen ek hi hai, aur use har second 60 baar taaza hona hai. Teen tareeke aazmao.',
      why: '<code>tools/chat.js</code> browser nahi hai: yeh browser ke akele dhaage (main thread) ki nakal Node mein karta hai. Ek message dikhana = 0.2 ms ka kaam; har screen update ke baad 1 ms. Saath mein har 50 ms par ek "click" — taaki dikhe ki page ungli ka jawab kitni der mein deta hai. Koi service nahi chalani.',
      steps: [
        { text: 'Teeno tareeke ek ke baad ek (~16 s).', cmd: 'cd docker-labs/15-backpressure && node tools/chat.js', expect: "5000 messages/s · ek message 0.2 ms + har DOM update par 1 ms layout · 60 fps = 16.7 ms/frame · 5 s\n\ntareeka                            fps   sabse lamba frame   click ki der (p99)   message kitna purana dikha (p99)   dikhaye / chhode / abhi line mein\nhar message turant (apna layout)    61        17 ms              1 ms              4131 ms                     4116 / 0 / 20874\nframe mein ek baar, sab              5       393 ms            341 ms               408 ms                     23200 / 0 / 0\nframe mein ek baar, naye 20         47        22 ms              6 ms                11 ms                     4740 / 20230 / 0" },
        { text: 'Sirf "frame mein naye 20" dobara. Aakhri khaane mein dekho: kitne dikhaye, kitne chhode.', cmd: 'node tools/chat.js --mode cap', expect: "5000 messages/s · ek message 0.2 ms + har DOM update par 1 ms layout · 60 fps = 16.7 ms/frame · 5 s\n\ntareeka                            fps   sabse lamba frame   click ki der (p99)   message kitna purana dikha (p99)   dikhaye / chhode / abhi line mein\nframe mein ek baar, naye 20         47        22 ms              6 ms                11 ms                     4720 / 20235 / 0" },
      ],
      observe: {
        q: '"Frame mein naye 20" ne 20,230 messages chhod diye — lagbhag 81%. Phir bhi yahi tareeka sabse achha kyun hai?',
        choices: [
          'Screen ek insaan ke liye hai jo 5,000 messages/second padh nahi sakta. Page smooth raha (47 fps), click 6 ms mein chala, aur jo dikha woh taaza tha (11 ms)',
          'Kyunki chhode hue messages baad mein dikh jaate hain',
          'Kyunki is tareeke mein sabse zyada messages dikhe',
          'Yeh sabse achha nahi hai — har message dikhna chahiye',
        ],
        answer: 0,
        explain: '"Har message turant": page smooth, par chat 4.1 second peeche aur 20,874 messages line mein — bina hadd ki line. "Sab ek frame mein": 5 fps, click 341 ms — page atka hua. "Naye 20": hadd + girana.',
      },
      lesson: 'Frontend bhi ek consumer hai, aur uski raftaar tay hai: har second 60 frame. Har frame mein kaam ki hadd rakho; baaki chhodo, ya "+N aur" likh do.',
    },

    /* ---------------- 5. sach ya galatfehmi ---------------- */
    {
      type: 'bins',
      title: '🧠 Sach ya galatfehmi?',
      instructions: 'Lines aur backpressure ke baare mein log aksar kuch baatein galat samajhte hain. Har baat ko sahi bin mein daalo.',
      bins: [
        { id: 'true', label: '✅ Sach' },
        { id: 'myth', label: '❌ Galatfehmi' },
      ],
      items: [
        { text: '"Queue badi kar do, samasya khatam."', bin: 'myth', explain: 'Badi line sirf der badhati hai. Slow motion: memory 20 → 5.0 s par crash, 22 gayab. Memory 40 → 10.0 s par crash, 42 gayab.' },
        { text: '"Koi error nahi aa raha, matlab sab theek hai."', bin: 'myth', explain: 'Lab: line 30 s mein 2,36,000 tak gayi, error 0. Process marne tak dashboard hara tha. Line ki lambai aur badhne ki raftaar dekho.' },
        { text: '"Node ka write() false lautaye toh data nahi liya gaya."', bin: 'myth', explain: 'Liya gaya. false sirf "ruk ja" hai. Slow motion: nishaan 4 par tha, writer ke andar 9 pahunch gaye.' },
        { text: '"Backpressure lagane se system dheema ho jaata hai."', bin: 'myth', explain: 'Raftaar hamesha sabse dheemi kadi ki thi. Lab: streams ke teeno tareeke 8.0 s mein khatam. Backpressure tay karta hai ki ruka hua kaam kahan rahe.' },
        { text: '"Data girana hamesha galat hai."', bin: 'myth', explain: 'Location, bhaav, live feed mein purana girana safai hai. Lab ki chat: 81% chhodne par 47 fps; sab dikhane par 5 fps.' },
        { text: '"429 bhej diya, kaam ho gaya."', bin: 'myth', explain: 'Bina Retry-After ke client turant laut-ta hai. Lab: ek order par 202.6 requests; Retry-After 250 ms ke saath 3.1.' },
        { text: '"Ek saath sirf 10 kaam chalenge" likh diya, toh backpressure ho gaya.', bin: 'myth', explain: 'Baaki kaam kahan khade hain? Agar baaki kaam ki line par hadd nahi, toh wahi kahani. Slow motion: line ki hadd 8 thi, par 16 ruke hue orders order-service ke andar jama ho gaye.' },
        { text: '"Ruk ja" ko wahan tak pahunchna chahiye jahan se kaam paida hota hai.', bin: 'true', explain: 'Beech ki ek bhi kadi chup rahi toh line usi kadi ke andar banti hai. Lab: 503 sirf aage badhane par ek order par 26.8 requests.' },
        { text: 'Jahan kaam chupchaap girta ho, wahan gire hue kaam ki ginti dashboard par honi chahiye.', bin: 'true', explain: 'Bhejne wale ko "le liya" hi milta hai. Lab: 2,16,740 kaam gire, aur bhejne wale ko ek baar bhi pata nahi chala.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — kab aur kitna',
    instructions: 'Yahan faisla aur uski wajah bolni hai — number ke saath. 🎤',
    questions: [
      {
        q: '"Flash sale mein order API par 10 guna traffic aayega. Beech mein ek queue laga dein?"',
        choices: [
          'Queue thodi der ki tezi sokh sakti hai, lagataar 10 guna nahi. Queue par hadd rakho (seconds mein socho), bhari hone par darwaze par hi 429 + Retry-After do — paisa kaatne se pehle — aur line ki lambai aur badhne ki raftaar par alert lagao',
          'Haan — badi queue sab sambhal legi',
          'Nahi — queue hamesha buri hoti hai',
          'Queue ki hadd hata do taaki koi order mana na ho',
        ],
        answer: 0,
        explain: 'Lab: 8,000/second ke farak par 20,000 ki line 2.5 second mein bhar jaati hai. Bina hadd ke: 30 s mein 2,36,000, aur memory hadd 100 MB par process ~36 s mein mar gaya.',
      },
      {
        q: '"429 ke saath Retry-After mein kya value bhejein?"',
        choices: [
          'Utni, jitni der mein jagah sach mein banegi: abhi ki line ÷ kaam ki raftaar. Bahut kam → client baar-baar aata hai. Bahut zyada → jo bahar ruke hain woh peeche reh jaate hain',
          'Hamesha 60 second — surakshit rehta hai',
          '0 — client jaldi aa jaaye',
          'Koi bhi — client waise bhi nahi maanta',
        ],
        answer: 0,
        explain: 'Lab (teen run): bina Retry-After ek order par 179–209 requests. 250 ms: 3.1. 3000 ms: 1.2 — par 150 mein se 89–99 phones ka ek bhi order nahi laga.',
      },
      {
        q: '"Dashboard par live events 5,000/second aa rahe hain aur browser atak raha hai. Kya karoge?"',
        choices: [
          'Har frame mein kaam ki hadd: naye kuch dikhao, baaki chhodo ya "+N aur" likho. Har event ko turant dikhana line ko bina hadd badhata hai; sab ko ek frame mein dikhana page ko jaam kar deta hai',
          'Sab events ek saath dikha do, har frame mein',
          'Har event aate hi turant dikhao',
          'User ko bada computer lene ko bolo',
        ],
        answer: 0,
        explain: 'Lab: har message turant → chat 4.1 s peeche, 20,874 line mein. Sab ek frame mein → 5 fps, click 341 ms. Frame mein naye 20 → 47 fps, click 6 ms.',
      },
    ],
  },
  success: [
    'Har bhari line ke liye pehle poochhte ho: bhejne wala kaun hai — program, insaan, ya taazgi wala data',
    'Line ki hadd seconds mein soch sakte ho, aur bata sakte ho ki kitni der mein bharegi',
    'Retry-After ka sauda number ke saath bata sakte ho: bekaar requests banaam baari',
  ],
  cards: [
    { front: 'Roko, "na" bolo, ya girao — kaise chunein?', back: 'Bhejne wala <b>program</b> jo ruk sakta hai → roko (await / pipeline / pull). <b>Insaan ya doosre ka system</b> → turant "na" + Retry-After. <b>Taazgi wala data</b> (location, bhaav, feed) → purana ya extra girao, ginti ke saath.' },
    { front: 'Line ki hadd kaise tay karein?', back: 'Seconds mein: hadd = kaam karne wale ki raftaar × jitna intezaar manzoor. Lab: 2,000/s × 10 s = 20,000. Line thodi der ki tezi ke liye hai: 8,000/s ka farak 20,000 ki line ko 2.5 s mein bhar deta hai.' },
    { front: 'Crash se pehle line kaise pakdein?', back: 'Error se nahi (lab: error 0). Teen number: lambai, <b>badhne ki raftaar</b>, sabse purane kaam ki umar. Kitni der mein bharegi = (hadd − abhi) ÷ badhne ki raftaar.' },
    { front: 'Retry-After: bahut kam / bahut zyada?', back: 'Lab: bina → ek order par 179–209 requests. 250 ms → 3.1. 3000 ms → 1.2, par 150 mein se 89–99 phones ka ek bhi order nahi laga. Rakho: line ÷ raftaar. Baari chahiye toh alag line.' },
    { front: 'Screen par 5,000 messages/second?', back: 'Har frame mein hadd (naye 20), baaki chhodo. Lab: 47 fps, click 6 ms. Sab dikhao → 5 fps. Har message turant → 4.1 s peeche.' },
  ],
},
]);

})();
