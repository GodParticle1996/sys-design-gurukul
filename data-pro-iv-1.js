/* =====================================================================
   System Gurukul — 🎤 Interview Designs (track pro-iv), hissa 1
   Levels: iv-framework, iv-feed (fanout mission + design canvas).
   Purane levels (builds, shapes) ki buniyaad par: yahan interview ke andaaz mein poore designs.
   ===================================================================== */
(() => {
SD.tracks.push({
  id: 'pro-iv',
  icon: '🎤',
  name: 'Interview Designs — classic sawaal',
  blurb: 'System design interview ke classic sawaal, interview ke andaaz mein: 45 minute ka dhaancha, news feed, rate limiter service, typeahead, notification system, UPI jaisa payment, distributed KV store, aur ek mock interview. Har level: requirements → numbers → design canvas → interviewer ke twists. Do terminal missions (fanout, quorum).',
  certTitle: 'INTERVIEW ISHWAR',
  certSub: 'Certificate of System Design Interviews',
  motto: 'Pehle sawaal, phir numbers, phir boxes — aur har box ki keemat.',
  formula: 'Interview = scope + numbers + design + bottleneck ka deep dive + trade-off',
  alwaysUnlocked: true,
  freeOrder: true,   /* har design alag sawaal hai — koi bhi pehle khol sakte ho */
});

const fanLatest = s => SD.mission.latest(s, 'fanout');
const T_FEED = [
  { text: 'Write fanout chalao: inbox copies aur celebrity lag dekho',
    check: s => s.records.some(r => r.kind === 'fanout' && r.mode === 'write' && r.celebLagMin > 0) },
  { text: 'Read fanout chalao: feed khulne ka p99 dekho',
    check: s => s.records.some(r => r.kind === 'fanout' && r.mode === 'read' && r.feedMs > 200) },
  { text: 'Hybrid, par threshold celebrities ke followers se upar — kya hua?',
    check: s => s.records.some(r => r.kind === 'fanout' && r.mode === 'hybrid' && r.celebLagMin > 0) },
  { text: 'Hybrid sahi threshold ke saath: feed p99 200 ms ke andar, celebrity lag zero',
    check: s => { const r = fanLatest(s); return !!r && r.mode === 'hybrid' && r.feedMs <= 200 && r.celebLagMin === 0; } },
];

SD.registerLevels('pro-iv', [
/* ---------------------------------------------------------------- I1 */
{
  id: 'iv-framework',
  icon: '🧭',
  title: 'Interview ka dhaancha — 45 minute kaise baantein',
  badge: 'Interview Navigator',
  objectives: [
    'Paanch hisse: requirements → entities → API → high-level design → deep dive',
    '<b>Functional</b> vs <b>non-functional</b> — aur numbers sirf wahan jahan design badle',
    'Interviewer ka hint pakadna; har faisle ke saath keemat bolna',
    'Aam galtiyan: seedha boxes, buzzwords, ek jagah atakna',
  ],
  lesson: [
    `<h3>🍛 Misaal: shaadi ka khana</h3>
     <p>Halwai seedha masala nahi daalta. Pehle poochhta hai: kitne log? veg ya non-veg? kab?</p>
     <p>Phir menu, phir kaun kya laayega, phir rasoi ka naksha, aur aakhir mein sabse mushkil dish (dum biryani) par poora dhyaan.</p>
     <p>Bina poochhe shuru kiya toh 500 logon ke liye 50 ka khana.</p>
     <p class="tip">🎯 <b>Asli baat:</b> interview mein design se pehle sawaal. Har hissa ek time box.
       Interviewer dekhta hai ki tum <b>kaise sochte ho</b>, sirf ye nahi ki aakhri diagram kya bana.</p>`,
    `<h3>⏱️ 45 minute ka bantwara (lagbhag)</h3>
     <table>
       <tr><th>Hissa</th><th>Samay</th><th>Kya</th></tr>
       <tr><td>Requirements</td><td>~5 min</td><td>Functional + non-functional, scope tay</td></tr>
       <tr><td>Core entities</td><td>~2 min</td><td>User, Post, Follow… kaunse "naam" system mein hain</td></tr>
       <tr><td>API</td><td>~5 min</td><td>POST /posts, GET /feed — har entity ka raasta</td></tr>
       <tr><td>High-level design</td><td>~10–15 min</td><td>Boxes + data ka flow, har functional requirement poori</td></tr>
       <tr><td>Deep dive</td><td>~10–15 min</td><td>Non-functional: bottleneck, scale, failure, trade-off</td></tr>
     </table>
     <p>Ye Hello Interview se prerit bantwara hai. Hello Interview deep dive ke liye ~10 min aur optional data flow ke liye ~5 min batata hai. Yahan bacha samay wrap-up aur sawaalon ke liye rakho. Har company ka format alag ho sakta hai.</p>`,
    `<h3>📋 Functional vs non-functional</h3>
     <p><b>Functional</b> = user kya kar sakta hai: "post karo", "feed dekho", "follow karo".</p>
     <p><b>Non-functional</b> = kitna tez, kitna bada, kitna pakka: "feed p99 200 ms", "5 crore daily users", "naya post 1 minute mein dikhe toh chalega".</p>
     <p><b>Numbers kab?</b> Jab number design badle. Read:write ratio 100:1? Poora dhyaan read path par. Storage 3 TB ya 3 PB? Ek DB ya sharding. Bekaar numbers samay khaate hain.</p>`,
    `<h3>🗣️ Bolne ka tareeka</h3>
     <ul>
       <li>Har faisle par: "<b>X chuna kyunki …; keemat …</b>".</li>
       <li>Interviewer ka sawaal ("agar ek user ke 5 crore followers hon?") = deep dive ka darwaza. Bhaago mat, ghuso.</li>
       <li>20 minute ek box par? Ruk ke poochho: "aur gehra jaaun ya aage badhun?"</li>
     </ul>
     <p><b>Aam galtiyan:</b> bina poochhe boxes, har technology ka naam (buzzwords), numbers jo kisi faisle mein kaam na aayein, aur trade-off na bolna.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: '45 minute ke hisse — sahi kram',
      instructions: '"Design a news feed" — kaam ko sahi kram mein lagao.',
      steps: [
        { text: 'Functional requirements poochho: post, follow, feed', explain: 'Scope pehle. Kya banana hai, kya nahi.' },
        { text: 'Non-functional + woh numbers jo design badlein', explain: '5 crore users, feed p99 200 ms, read-heavy — ye faisle chalaate hain.' },
        { text: 'Core entities likho: User, Post, Follow', explain: 'Do minute ka kaam. API aur data model inhi se banenge.' },
        { text: 'API: POST /posts, GET /feed?cursor=', explain: 'Har functional requirement ka ek raasta.' },
        { text: 'High-level design: boxes aur data ka flow', explain: 'Har functional requirement design mein poori hoti dikhe.' },
        { text: 'Deep dive: celebrity fanout, cache, failure — trade-off ke saath', explain: 'Non-functional requirements yahan poori hoti hain. Interviewer ke hint yahin le jaate hain.' },
      ],
    },
    {
      type: 'bins',
      title: 'News feed — kaunsi requirement kis dabbe mein?',
      instructions: 'Functional, non-functional, ya is interview ke scope se bahar?',
      bins: [
        { id: 'fn', label: '🧩 Functional' },
        { id: 'nfn', label: '📏 Non-functional' },
        { id: 'out', label: '🚫 Scope se bahar' },
      ],
      items: [
        { text: 'User text aur photo ke saath post kar sakta hai', bin: 'fn', explain: 'User ka kaam. Functional.' },
        { text: 'Feed 200 ms ke andar khule (p99)', bin: 'nfn', explain: 'Kitna tez — non-functional. Deep dive mein cache aur fanout isi se tay honge.' },
        { text: 'User doosre users ko follow kar sakta hai', bin: 'fn', explain: 'User ka kaam. Follow graph design ka hissa.' },
        { text: '5 crore daily active users', bin: 'nfn', explain: 'Paimana. Sharding aur fanout ka hisaab isi se.' },
        { text: 'Naya post 1 minute mein followers ki feed mein (eventual theek)', bin: 'nfn', explain: 'Consistency ki shart. 1 minute ki chhoot se async fanout mumkin.' },
        { text: 'Ads ka bidding system', bin: 'out', explain: 'Alag bada system. Interviewer na maange toh bahar rakho, aur ye bolo.' },
        { text: 'Live video streaming', bin: 'out', explain: 'Alag problem. Scope chhota rakhna bhi ek hunar hai.' },
        { text: 'Feed mein naye posts upar dikhen', bin: 'fn', explain: 'Feed kaisa dikhe — user ke kaam ka hissa.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Interview ke faisle',
      questions: [
        {
          q: 'Interviewer: "Design Twitter." Tumhara pehla jawab?',
          choices: [
            'Kuch sawaal: kaunse features, kitne users, kitni latency; phir scope tay karo',
            'Seedha boxes: load balancer, app servers, Cassandra aur Redis bana do',
            'Microservices ki list se shuru: user-service, tweet-service, feed-service',
            'Bata do ki asli Twitter kis language mein bana hai aur kaunsa DB use karta hai',
          ],
          answer: 0,
          explain: 'Twitter bahut bada hai. 45 minute mein sab nahi banega. Sawaalon se scope chhota karo: tweet, follow, timeline. Phir numbers.',
          choiceExplanations: [
            'Twitter bahut bada hai. 45 minute mein sab nahi banega. Sawaalon se scope chhota karo: tweet, follow, timeline. Phir numbers.',
            'Bina requirements ke boxes = andaaze ka design. Interviewer sochega tumne poochha hi nahi.',
            'Services requirements ka nateeja hain. Pehle kaam samjho.',
            'Interview tumhari soch ka hai, Twitter ki history ka nahi.',
          ],
        },
        {
          q: 'Deep dive mein interviewer: "Agar ek user ke 5 crore followers hon?" Ye kya hai?',
          choices: [
            'Hint hai: fanout ka bottleneck; hybrid push/pull ka trade-off batao',
            'Edge case hai; aise users kam hote hain, unhe chhod ke aage badho',
            'Scale ka sawaal hai; bas servers 10 guna kar do, kaam ho jaayega',
            'Trick hai; aise user ko follow karne ki limit laga do, bas',
          ],
          answer: 0,
          explain: 'Interviewer tumhe sabse dilchasp bottleneck ki taraf le ja raha hai. Celebrity ka ek post = 5 crore inbox writes. Push, pull aur hybrid ka trade-off bolo.',
          choiceExplanations: [
            'Interviewer tumhe sabse dilchasp bottleneck ki taraf le ja raha hai. Celebrity ka ek post = 5 crore inbox writes. Push, pull aur hybrid ka trade-off bolo.',
            'Celebrities kam hain par traffic ka bada hissa unhi ka. Chhodna = interview ka sabse achha hissa chhodna.',
            'Servers badhane se ek post ke 5 crore writes ka dhaancha nahi badalta.',
            'Product ko limit nahi chahiye; design ko sambhalna hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Dhaancha',
    instructions: 'Interview ke andaaz ke sawaal. 🎤',
    questions: [
      {
        q: '20 minute se tum ek hi box par ho, interviewer chup hai. Kya karoge?',
        choices: [
          'Ruk ke poochho: "is hisse mein aur gehra jaaun ya aage badhun?"',
          'Usi box par bolte raho; chup ka matlab interviewer khush hai',
          'Turant naya topic shuru karo, bina bataye, taaki samay bache',
          'Interviewer se kaho ki woh khud bataye ki design mein kya chahiye',
        ],
        answer: 0,
        explain: 'Interview ek baatcheet hai. Ek chhota sawaal tumhe sahi disha deta hai aur dikhata hai ki tum samay ka dhyaan rakhte ho.',
        choiceExplanations: [
          'Interview ek baatcheet hai. Ek chhota sawaal tumhe sahi disha deta hai aur dikhata hai ki tum samay ka dhyaan rakhte ho.',
          'Chup ka matlab kuch bhi ho sakta hai. Andaaze par 20 minute aur mat do.',
          'Achanak topic badalna bikhra hua lagta hai. Bata ke badlo.',
          'Disha poochhna theek hai, par design tumhe chalaana hai.',
        ],
      },
      {
        q: 'Numbers (estimation) kab nikalne chahiye?',
        choices: [
          'Jab number design badle: read:write ratio, storage, peak QPS',
          'Shuru mein saare numbers, chahe kisi faisle mein kaam na aayein',
          'Numbers ki zaroorat nahi; design dekh ke sab samajh aa jaata hai',
          'Sirf aakhir mein, summary slide ki tarah, sab ek saath',
        ],
        answer: 0,
        explain: 'Number ka kaam faisla karwana hai. "40 writes/sec" ke saath har write ka kaam bhi dekho. Ek write crore followers tak jaaye toh bojh bada hai. Jo number kisi faisle mein kaam na aaye, woh samay ki barbaadi.',
        choiceExplanations: [
          'Number ka kaam faisla karwana hai. "40 writes/sec" ke saath har write ka kaam bhi dekho. Ek write crore followers tak jaaye toh bojh bada hai. Jo number kisi faisle mein kaam na aaye, woh samay ki barbaadi.',
          'Bekaar numbers 10 minute kha jaate hain aur kuch tay nahi karte.',
          'Bina numbers ke ek DB ya sharding ka faisla andaaza hai.',
          'Aakhir mein numbers aaye toh faisle pehle hi andaaze par ho chuke.',
        ],
      },
    ],
  },
  success: [
    'Interview ko paanch hisson mein baantna',
    'Requirements ko functional aur non-functional mein todna',
    'Hint ko deep dive mein badalna aur trade-off bolna',
  ],
  homework: `Ek dost ke saath 45 minute ka mock karo: "Design a URL shortener". Ek ghadi rakho aur har hisse ka samay likho.
    Kahan zyada samay gaya? Kaunsa number kisi faisle mein kaam aaya, kaunsa nahi?`,
  cards: [
    { front: 'Interview ke paanch hisse?', back: 'Requirements → core entities → API → high-level design → deep dive.' },
    { front: 'Functional vs non-functional?', back: 'Functional: user kya kar sakta hai. Non-functional: kitna tez, bada, pakka.' },
    { front: 'Numbers kab?', back: 'Jab number design badle: ratio, storage, peak QPS.' },
    { front: 'Interviewer ka "agar…?"', back: 'Deep dive ka darwaza. Bottleneck pehchano aur trade-off bolo.' },
  ],
},

/* ---------------------------------------------------------------- I2 */
{
  id: 'iv-feed',
  icon: '📰',
  title: 'Design: News Feed — push, pull ya dono?',
  badge: 'Feed Farmaan',
  objectives: [
    'Numbers: 5 crore users, 200 dost, 1 crore posts/din, 100 celebrities',
    '<b>Fanout on write</b> (push) vs <b>on read</b> (pull) — kaam kab hota hai',
    'Celebrity problem aur <b>hybrid</b>',
    'Terminal: teeno tareeke chala ke naapo',
  ],
  lesson: [
    `<h3>📮 Misaal: dakiya</h3>
     <p><b>Push:</b> dakiya har chitthi har ghar tak pahuncha deta hai. Bhejte waqt mehnat; padhna aasaan — chitthi ghar par hai.</p>
     <p><b>Pull:</b> sab chitthiyan post office mein. Padhne wala khud jaake dhoondhe. Bhejna aasaan, padhna mehenga.</p>
     <p>Ek film star ki chitthi 50 lakh gharon mein? Push wale dakiya ka poora din khatam.</p>
     <p class="tip">🎯 <b>Asli baat:</b> feed ka kaam ya toh <b>post karte waqt</b> (har follower ki inbox mein copy) ya <b>feed kholte waqt</b> (doston ke posts jodo) hota hai. Kaam khatam nahi hota, sirf jagah badalta hai.</p>`,
    `<h3>🔢 Numbers (kalpanik)</h3>
     <pre>5 crore daily users · aam user ke 200 dost
Aam users ke posts: 1 crore / din
Celebrities: 100 × 50 lakh followers × 20 posts / din

Push (write fanout):
  aam:   1 crore × 200          =   200 crore inbox copies / din
  celeb: 100 × 20 × 50 lakh     = 1,000 crore inbox copies / din
  kul:                            1,200 crore / din ≈ 1.4 lakh writes / second (average)

Pull (read fanout):
  0 inbox copies; har feed khulne par 200 doston ke latest posts jodo</pre>
     <p>Push mein celebrity ka ek post = 50 lakh writes — followers ki feed mein der se pahunchta hai. Pull mein feed kholna mehenga aur dheema.</p>`,
    `<h3>🧩 Hybrid</h3>
     <p>Aam users ke posts <b>push</b>. Celebrities (threshold jitne ya zyada followers) ke posts <b>pull</b> — feed kholte waqt jode jaate hain.</p>
     <pre>POST /posts → posts DB → queue → fanout workers → har follower ki feed cache (Redis list, ~500 post ids)
GET /feed   → apni feed cache + jin celebrities ko follow karte ho unke latest posts
            → post ids se post data (post cache) → rank → jawab</pre>
     <p><b>Threshold</b> celebrities ke followers se <b>baraabar ya neeche</b> hona chahiye, warna celebrities bhi push ho jaayengi.</p>
     <p>Asli system mein threshold apne cluster ki naap se chuno: jitne followers tak ka push 1–2 second mein ho jaaye.
       First Principles ke level "Instagram 2 · Kaise" ke model mein ye lagbhag 1 lakh followers aata hai.
       Threshold neeche karo toh likhna sasta, par har feed read par zyada celebrity lists judti hain.</p>
     <p>Aur chhote sudhaar: lambe samay se inactive users ko push mat karo; feed cache mein sirf ids rakho, poora post nahi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — teeno fanout naapo',
      goal: 'Feed ka model chalao. Pehle write fanout aur read fanout dono naapo. Phir hybrid try karo — pehle galat threshold (celebrities ke 50 lakh followers se upar), phir sahi threshold. Lakshya: feed p99 200 ms ke andar aur celebrity post turant.',
      sys: { name: 'feed-service' },
      placeholder: 'fanout --mode …',
      tasks: T_FEED,
      success: SD.allTasks(T_FEED),
      verify: s => { const r = fanLatest(s); return !!r && r.mode === 'hybrid' && r.feedMs <= 200 && r.celebLagMin === 0; },
      solution: [
        'fanout --mode write',
        'fanout --mode read',
        'fanout --mode hybrid --celeb-threshold 10000000',
        'fanout --mode hybrid --celeb-threshold 1000000',
      ],
      successText: 'Hybrid: aam users push, celebrities pull. Inbox copies 1,200 crore se 200 crore, feed p99 60 ms, celebrity post turant. Threshold celebrities ke followers ke baraabar ya neeche hona chahiye. Latency ke numbers model ke chune hue hain.',
      hints: [
        'Pehle dono seedhe tareeke naapo: write aur read. Phir hybrid mein threshold badal ke dekho ki celebrities kis taraf jaati hain.',
        '`fanout --mode write|read|hybrid [--celeb-threshold <followers>]`. Hybrid mein threshold jitne ya zyada followers wale users pull hote hain. Celebrities ke 50 lakh followers hain.',
        'Poora raasta — har command alag Enter se chalao:\nfanout --mode write\nfanout --mode read\nfanout --mode hybrid --celeb-threshold 10000000\nfanout --mode hybrid --celeb-threshold 1000000',
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — News Feed',
      instructions: 'Har slot par sahi chunav. Galat options ka "kyun" bhi padho.',
      brief: `5 crore daily users, aam user ke 200 dost, 100 celebrities × 50 lakh followers.
        Feed p99 200 ms, naya post 1 minute ke andar dikhe toh chalega.`,
      requirements: ['Feed p99 200 ms', '1,200 crore inbox copies/din se bachna', 'Celebrity post jaldi dikhe', 'Storage kaabu mein'],
      pass: 11,
      slots: [
        {
          id: 'fanout', label: 'Fanout ka tareeka', icon: '📮',
          options: [
            { id: 'hybrid', label: 'Hybrid: aam users push, celebrities pull', score: 3, why: 'Dono ka sasta hissa. Threshold celebrities ke followers ke baraabar ya neeche.' },
            { id: 'push', label: 'Sab push: har post har follower tak', score: -2, why: 'Celebrity ka ek post 50 lakh writes; 1,200 crore copies/din aur der.' },
            { id: 'pull', label: 'Sab pull: feed kholte waqt sab jodo', score: -1, why: 'Likhna sasta, par har feed par 200 doston ka merge — p99 200 ms mushkil.' },
          ],
        },
        {
          id: 'store', label: 'Feed kahan rakhein', icon: '🧠',
          options: [
            { id: 'ids', label: 'Har user ki Redis list: ~500 post ids', score: 3, why: 'Chhoti, tez, aur sirf ids — post badle toh ek jagah badlo.' },
            { id: 'full', label: 'Har inbox mein poora post (text + photo URL)', score: -1, why: 'Har copy bhaari; post edit ya delete par crore jagah badlaav.' },
            { id: 'sql', label: 'Har feed par SQL join: follows × posts', score: -2, why: 'Har feed khulne par bhaari join; 5 crore users par DB ghutne tek dega.' },
          ],
        },
        {
          id: 'hydrate', label: 'Post ids se post data', icon: '💧',
          options: [
            { id: 'cache', label: 'Post cache (id → post), miss par posts DB', score: 3, why: 'Popular posts cache mein garam. Ek batch read mein sab ids.' },
            { id: 'each', label: 'Har id ke liye alag DB query, ek-ek karke', score: -2, why: '500 ids = 500 queries. N+1 ka dard.' },
            { id: 'none', label: 'Data mat lao; client khud har id maange', score: -1, why: 'Client par sau calls — mobile par dheema aur bhaari.' },
          ],
        },
        {
          id: 'inactive', label: '6 mahine se gayab users', icon: '😴',
          options: [
            { id: 'skip', label: 'Push mat karo; lautne par pull se feed banao', score: 3, why: 'Bekaar writes bachti hain. Lautne par ek baar ka kharcha.' },
            { id: 'always', label: 'Unhe bhi har post push karte raho, sabki tarah', score: -1, why: 'Crore bekaar writes aur storage — jo kabhi padhi nahi jaayengi.' },
            { id: 'delete', label: 'Unka account aur follows mita do', score: -3, why: 'User lautega toh sab gayab. Product ka nuksaan.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Hybrid fanout, ids ki feed, cache se hydration, aur inactive users ka hisaab. Yahi classic jawab hai — keemat ke saath.',
        ok: '👍 Zyadatar sahi. Ek chunav kisi ek jagah kaam ko phula raha hai.',
        bad: '🤔 Numbers dobara dekho: 1,200 crore copies vs 200 crore, aur har feed par 200 doston ka merge.',
      },
    },
    {
      type: 'quiz',
      title: 'Feed ke deep-dive sawaal',
      questions: [
        {
          q: 'Ek celebrity ne post delete kiya. Pull hone se pehle kuch followers ki feed cache mein id pahunch chuki thi. Kya karoge?',
          choices: [
            'Hydration par post "deleted" mile toh chhod do; cache baad mein saaf',
            'Turant 50 lakh followers ki feed cache se ek-ek karke id mitao',
            'Kuch nahi; delete hua post feed mein dikhna theek hai',
            'Delete hone hi mat do; post ek baar gaya toh wapas nahi',
          ],
          answer: 0,
          explain: 'Ids feed mein, data post cache/DB mein. Hydration par deleted post chhod do. Post cache bhi invalidate karo ya deletion marker jaancho; purana cached post serve na ho. Feed ids ki safai baad mein ho sakti hai.',
          choiceExplanations: [
            'Ids feed mein, data post cache/DB mein. Hydration par deleted post chhod do. Post cache bhi invalidate karo ya deletion marker jaancho; purana cached post serve na ho. Feed ids ki safai baad mein ho sakti hai.',
            '50 lakh writes ek delete ke liye — wahi push ka dard ulta.',
            'Delete kiya post dikhana privacy aur legal problem ho sakti hai.',
            'Users ko delete ka haq chahiye. Design ko sambhalna hai.',
          ],
        },
        {
          q: 'User 6 mahine baad lauta. Uski feed cache khaali hai. Kya karoge?',
          choices: [
            'Pull se feed dobara banao: doston ke latest posts jodo, phir cache bharo',
            'Khaali feed dikhao; dheere-dheere naye posts aayenge toh bhar jaayegi',
            'Pichhle 6 mahine ke saare posts dobara us user ko push karo',
            'User ko bolo ki feed kal tak taiyaar hogi',
          ],
          answer: 0,
          explain: 'Cache miss par pull ek baar ka kharcha hai. Isi se inactive users ko push na karna sasta padta hai.',
          choiceExplanations: [
            'Cache miss par pull ek baar ka kharcha hai. Isi se inactive users ko push na karna sasta padta hai.',
            'Lautne wale user ko khaali feed = woh phir chala jaayega.',
            '6 mahine ke saare posts push karna bekaar writes; latest kuch sau kaafi hain.',
            'Feed seconds mein ban sakti hai. Intezaar karwana zaroori nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — News Feed',
    instructions: 'Classic feed ke sawaal. 🎤',
    questions: [
      {
        q: 'Push vs pull — ek line mein trade-off?',
        choices: [
          'Push: likhna mehenga, padhna tez; pull: likhna sasta, padhna mehenga',
          'Push har haal mein behtar; pull sirf chhote apps mein chalta',
          'Pull har haal mein behtar; push mein data kho jaata hai',
          'Dono mein koi farak nahi; sirf naam ka fark hai',
        ],
        answer: 0,
        explain: 'Kaam ya toh write par ya read par. Read-heavy feed (log likhne se zyada padhte hain) mein push zyadatar achha — celebrities ko chhod ke. Isliye hybrid.',
        choiceExplanations: [
          'Kaam ya toh write par ya read par. Read-heavy feed (log likhne se zyada padhte hain) mein push zyadatar achha — celebrities ko chhod ke. Isliye hybrid.',
          'Celebrity ke 50 lakh followers par push ka kharcha bahut.',
          'Push mein durability ke liye durable queue, retries aur recovery chahiye.',
          'Kaam kab hota hai — yahi poora farak hai.',
        ],
      },
      {
        q: 'Feed ko ranking (sirf time nahi, relevance) chahiye. Design mein kya badlega?',
        choices: [
          'Candidates feed cache se, phir ranking service score kare; top N lautao',
          'Har post ka score likhte waqt ek baar tay karo; kabhi mat badlo',
          'Ranking client par karo; server sab posts bhej de',
          'Ranking ke liye har feed par poora ML model training chalao',
        ],
        answer: 0,
        explain: 'Do kadam: candidate generation (feed cache + celebrity pull se kuch sau posts) aur ranking (model se score). Score read time par, kyunki user aur samay ke hisaab se badalta hai.',
        choiceExplanations: [
          'Do kadam: candidate generation (feed cache + celebrity pull se kuch sau posts) aur ranking (model se score). Score read time par, kyunki user aur samay ke hisaab se badalta hai.',
          'Relevance user aur samay par nirbhar hai; likhte waqt ka score purana pad jaata hai.',
          'Saare candidates bhejna bandwidth leta hai. Client par model chal sakta hai; yahan server ranking se candidates kam bhejte hain.',
          'Training offline hoti hai; feed par sirf model ka istemaal (inference).',
        ],
      },
    ],
  },
  success: [
    'Feed ke numbers se fanout ka kharcha nikaalna',
    'Push, pull aur hybrid ka trade-off bolna',
    'Delete, inactive users aur ranking jaise deep dives sambhalna',
  ],
  homework: `Instagram ya X par ek celebrity ka naya post dekho, aur ek dost ka. Kaun pehle dikha?
    Socho: dono ki feed tak pahunchne ka raasta alag kyun ho sakta hai? Apna hybrid threshold kya rakhoge, aur kyun?`,
  cards: [
    { front: 'Fanout on write?', back: 'Post karte hi har follower ki inbox mein id. Padhna tez; celebrity par mehenga.' },
    { front: 'Fanout on read?', back: 'Feed kholte waqt doston ke posts jodo. Likhna sasta; padhna dheema.' },
    { front: 'Hybrid threshold?', back: 'Celebrities ke followers ke baraabar ya neeche, taaki celebrities pull hon.' },
    { front: 'Feed cache mein kya?', back: 'Sirf post ids (~500). Data post cache se, deleted post hydration par chhoot jaata hai.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['iv-framework'] = {
  t: '45 minute: paanch hisse',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">Requirements<br><small>~5 min</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">Entities<br><small>~2 min</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">API<br><small>~5 min</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">High-level<br><small>~10–15 min</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">Deep dive<br><small>~10–15 min</small></span>
    </div>
    <div class="dg-cap">Functional requirements high-level design mein poori hon; non-functional deep dive mein. Har faisle ke saath keemat.</div>`,
};
VISUALS['iv-feed'] = {
  t: 'Hybrid feed: aam users push, celebrities pull',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">✍️ POST /posts</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🗄️ posts DB</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📨 queue → fanout workers</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🧠 feed cache (ids)</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">📱 GET /feed</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">feed cache</span><span class="dg-arrow">+</span>
      <span class="dg-pill gold">⭐ celebrity posts (pull)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">💧 post cache se data</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🏅 rank</span>
    </div>
    <div class="dg-cap">Inbox copies: push 1,200 crore/din, hybrid 200 crore/din (kalpanik numbers).</div>`,
};

SD.addScenes({
  'iv-framework': {
    intro: 'Interviewer: <b>"Design a news feed."</b> Ghadi chalu: 45 minute.',
    nodes: [
      { id: 'req', col: 0, row: 0, icon: '📋', label: 'Requirements', sub: '~5 min' },
      { id: 'ent', col: 1, row: 0, icon: '🧩', label: 'Core entities', sub: '~2 min' },
      { id: 'api', col: 2, row: 0, icon: '🔌', label: 'API', sub: '~5 min' },
      { id: 'hld', col: 3, row: 0, icon: '🗺️', label: 'High-level design', sub: '~10–15 min' },
      { id: 'deep', col: 3, row: 1, icon: '🔬', label: 'Deep dive', sub: '~10–15 min' },
      { id: 'iv', col: 1, row: 1, icon: '🧑‍💼', label: 'Interviewer' },
    ],
    steps: [
      { at: ['req'], set: { req: { tone: 'accent', sub: 'post, follow, feed' } }, say: 'Pehle sawaal: kaunse features? Post, follow, feed. Kitne users, kitna tez? 5 crore users, feed p99 200 ms.' },
      { from: 'req', to: 'ent', label: 'naam chuno', say: 'Core entities: User, Post, Follow. Do minute ka kaam.' },
      { from: 'ent', to: 'api', label: 'raaste', say: 'API: POST /posts aur GET /feed?cursor=. Har functional requirement ka ek raasta.' },
      { from: 'api', to: 'hld', label: 'boxes + flow', say: 'High-level design: posts DB, queue, fanout workers, feed cache. Har feature poora hota dikhe.' },
      { from: 'iv', to: 'deep', label: '"5 crore followers?"', tone: 'gold', bend: 40, say: 'Interviewer ka hint deep dive ka darwaza hai. Celebrity fanout ka bottleneck aur hybrid ka trade-off.' },
      { at: ['deep'], set: { deep: { tone: 'good', sub: 'trade-off bola' } }, say: 'Har faisle par bolo: X chuna kyunki…, keemat…. Aakhir mein jo hissa chhoota, us hisse ka naam bhi lo.' },
    ],
  },
  'iv-feed': {
    intro: 'Aam user ke 200 dost. Celebrity ke <b>50 lakh followers</b>. Feed p99 200 ms.',
    nodes: [
      { id: 'aman', col: 0, row: 0, icon: '🙋', label: 'Aman (aam user)', sub: '200 dost' },
      { id: 'star', col: 0, row: 1, icon: '⭐', label: 'Celebrity', sub: '50 lakh followers' },
      { id: 'workers', col: 1, row: 0, icon: '⚙️', label: 'Fanout workers' },
      { id: 'inbox', col: 2, row: 0, icon: '🧠', label: 'Feed cache', sub: 'har user: post ids' },
      { id: 'posts', col: 1, row: 1, icon: '🗄️', label: 'Posts DB + cache' },
      { id: 'reader', col: 3, row: 0, icon: '📱', label: 'Riya feed kholti' },
    ],
    steps: [
      { from: 'aman', to: 'workers', label: 'naya post', say: 'Aman post karta hai. Fanout workers 200 doston ki feed cache mein post id daalte hain (push).' },
      { from: 'workers', to: 'inbox', label: '200 copies', tone: 'good', say: 'Aam user ke liye push sasta: 200 copies. Riya ki feed mein Aman ka post pehle se pada hai.' },
      { from: 'star', to: 'workers', label: 'push? 50 lakh!', tone: 'bad', set: { workers: { tone: 'bad', sub: '50 lakh writes' } }, say: 'Celebrity ko bhi push kiya toh ek post = 50 lakh writes. Followers tak der se pahunchta hai.' },
      { from: 'star', to: 'posts', label: 'sirf ek baar likho', tone: 'good', set: { workers: { tone: '', sub: '' } }, say: 'Hybrid: celebrity ka post sirf posts DB mein. Followers ki feed mein copy nahi.' },
      { from: 'reader', to: 'inbox', label: 'GET /feed', say: 'Riya feed kholti hai: apni feed cache se ids.' },
      { from: 'reader', to: 'posts', label: '+ celebrity posts', tone: 'gold', bend: -40, say: 'Saath mein jin celebrities ko Riya follow karti hai, unke latest posts pull. Phir post cache se data aur ranking.' },
      { at: ['reader'], set: { reader: { tone: 'good', sub: 'p99 ~60 ms (model)' } }, say: 'Inbox copies 1,200 crore se 200 crore/din. Feed tez, celebrity post turant.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-iv-framework', levels: 'iv-framework', guide: {
    title: 'Seedha boxes ya pehle sawaal?',
    misaal: 'Halwai pehle poochhta hai kitne log aur kya khana, phir masala daalta hai. Bina poochhe 500 logon ke liye 50 ka khana banta hai.',
    asli: 'Interview ke paanch hisse — requirements, entities, API, high-level, deep dive — har ek time box ke saath. Numbers sirf jahan design badle.',
    points: [
      '<b>Scope:</b> functional + non-functional pehle.',
      '<b>High-level:</b> har functional requirement poori dikhe.',
      '<b>Deep dive:</b> hint pakdo, trade-off bolo.',
    ],
    use: 'Har system design interview ki shuruaat.',
    avoid: 'Bina requirements ke technology ke naam ginaana.',
    mistake: 'Ek box par 20 minute atakna bina interviewer se poochhe.',
    compare: [
      { choice: 'Dhaanche ke saath chalna', when: 'Interviewer khula sawaal deta hai', tradeoff: 'Samay ka dhyaan, kuch nahi chhoot-ta; kabhi-kabhi thoda mechanical lagta hai' },
      { choice: 'Interviewer ke peeche chalna', when: 'Interviewer khud ek hisse mein le jaaye', tradeoff: 'Unki dilchaspi poori hoti hai; baaki hisse chhoot sakte hain — bata do' },
    ],
    followup: 'Interviewer ne kaha "requirements skip karo, seedha design karo." Ab kya karoge?',
    sources: [
      { title: 'Hello Interview — System Design in a Hurry: Delivery framework', url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery' },
    ],
  } },
  { id: 'pro-iv-feed', levels: 'iv-feed', guide: {
    title: 'Kaam likhte waqt karein ya padhte waqt?',
    misaal: 'Dakiya har ghar chitthi pahunchaaye (push) ya log post office aake dhoondhein (pull)? Film star ki chitthi 50 lakh gharon mein — dakiya ka din khatam.',
    asli: 'Feed ka kaam ya write par hota hai ya read par. Hybrid aam users ko push aur celebrities ko pull karta hai.',
    points: [
      '<b>Push:</b> padhna tez; celebrity par writes ka pahaad.',
      '<b>Pull:</b> likhna sasta; har feed par merge.',
      '<b>Hybrid:</b> threshold celebrities ke followers ke baraabar ya neeche.',
    ],
    use: 'Social feed, activity feed, notification inbox jaise read-heavy systems.',
    avoid: 'Inbox mein poora post copy mat karo; sirf ids.',
    mistake: 'Threshold itna ooncha rakhna ki celebrities bhi push ho jaayein.',
    compare: [
      { choice: 'Fanout on write (push)', when: 'Followers kam, padhna bahut', tradeoff: 'Feed tez; bade accounts par crore writes aur der' },
      { choice: 'Fanout on read (pull)', when: 'Bade accounts ya kam padhe jaane wale feeds', tradeoff: 'Writes sasti; feed kholna dheema aur mehenga' },
    ],
    followup: 'Ek aam user achanak viral hua aur 10 lakh followers ho gaye. Woh push se pull mein kab aur kaise jaayega?',
    sources: [
      { title: 'InfoQ — Timelines at Scale (Twitter, Raffi Krikorian)', url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/' },
    ],
  } },
);
})();
