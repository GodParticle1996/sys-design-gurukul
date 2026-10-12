/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · BitTorrent: demand hi supply hai

   Source: "BitTorrent's Architecture" (Akhil Sharma) — Bram Cohen ka paper
   "Incentives Build Robustness in BitTorrent", BEPs, Kademlia paper.
   Docker lab: docker-labs/18-bittorrent
   ===================================================================== */
(function () {

VISUALS['bt-swarm'] = {
  t: 'Server ki capacity fixed, swarm ki badhti hai',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🏢 Client-server</span>
        <div class="dg-cap">Ek uplink, 1,000 log = 1,000 tukde. Sabse zyada maang ke waqt hi server bhar jaata hai
          (flash crowd / "Slashdot effect"). Lab: 40 log, <b>63 sec</b>, origin ne 100% bheja.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🐝 Swarm</span>
        <div class="dg-cap">Har downloader upload bhi karta hai → capacity = sabke uplinks ka jod. Bheed aaye toh swarm
          <b>tez</b>. Lab: 40 log, <b>6.8 sec</b>, origin ka hissa 12%.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">📄 file → pieces</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧾 .torrent: har piece ka SHA-1</span><span class="dg-arrow">→</span>
      <span class="dg-pill">📋 tracker: sirf peers ki list</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🔍 har piece khud verify → turant aage serve</span>
    </div>`,
};

VISUALS['bt-rarest'] = {
  t: 'Sabse kam jiske paas, woh pehle',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">➡️ Sequential (0, 1, 2…)</span>
        <div class="dg-cap">Sabke paas wahi shuruaati pieces — trade karne ko kuch nahi. Aakhri pieces sirf seeder ke paas.
          Seeder gaya → "99% par atka". Lab: t=30 par bhi 110/128 pieces kisi ke paas nahi, 0/200 poore.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🎯 Rarest first</span>
        <div class="dg-cap">Jo piece sabse kam peers ke paas, woh pehle. Seeder har piece lagbhag ek baar bhejta hai.
          Lab: seeder t=20 par gaya, phir bhi <b>200/200</b> poore.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">shuru</span><span class="cmd">Pehla piece RANDOM</span><span class="q">trade karne ko kuch jaldi chahiye</span></div>
      <div class="dg-rung a"><span class="lv">beech</span><span class="cmd">Rarest first</span><span class="q">swarm ki sehat = apni sehat</span></div>
      <div class="dg-rung g"><span class="lv">aakhir</span><span class="cmd">Endgame mode</span><span class="q">aakhri blocks kai peers se ek saath — jo pehle aaye</span></div>
    </div>`,
};

VISUALS['bt-titfortat'] = {
  t: 'Jo mujhe deta hai, main use deta hoon',
  html: `
    <div class="dg-stack">
      <div class="dg-node is-good"><span class="ni">🤝</span><span class="nl">3 regular slots</span><span class="ns">jinse mujhe sabse zyada mila (har 10 sec dobara ranking)</span></div>
      <div class="dg-node is-accent"><span class="ni">🎲</span><span class="nl">1 optimistic slot</span><span class="ns">random peer (har 30 sec) — naye logon ka darwaaza + behtar partner dhoondhna</span></div>
      <div class="dg-node is-bad"><span class="ni">🚫</span><span class="nl">Baaki: choked</span><span class="ns">connection khula, par kuch nahi bhejte</span></div>
    </div>
    <div class="dg-cap">Lab 18 (200 peers, 20% free-riders): bina tit-for-tat free-rider honest se <b>pehle</b> khatam (71 vs 78 sec).
      Tit-for-tat: honest <b>67</b>, free-rider <b>87</b>. Optimistic slot hatao → 400 sec mein <b>0/200</b>.</div>`,
};

VISUALS['bt-dht'] = {
  t: 'Tracker ke bina: XOR distance se dhoondho',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">2001</span><span class="cmd">website + .torrent file + tracker</span><span class="q">tracker = technical aur legal SPOF</span></div>
      <div class="dg-rung a"><span class="lv">2005</span><span class="cmd">Mainline DHT (Kademlia)</span><span class="q">info hash ke sabse paas (XOR) wale nodes peers ki list rakhte hain</span></div>
      <div class="dg-rung g"><span class="lv">aaj</span><span class="cmd">Magnet link</span><span class="q">sirf 40-char info hash — metadata bhi peers se, hash se verify</span></div>
    </div>
    <div class="dg-cap">Lab 18: nodes 1,000 → 1,00,000 (100×), lookup rounds sirf 4.0 → 5.3. Har node 1 lakh mein se sirf 116 ko jaanta hai.
      <b>URL jagah ka pata hai; magnet content ka.</b></div>`,
};

SD.registerLevels('planet', [
/* =====================================================================
   1. bt-swarm
   ===================================================================== */
{
  id: 'bt-swarm',
  icon: '🐝',
  title: 'BitTorrent — jitni bheed, utni speed',
  badge: 'Swarm Sainik',
  objectives: [
    'Client-server ki fixed capacity vs swarm ki badhti capacity',
    'Pieces, .torrent, tracker, seeder/leecher',
    '"Sender ko nahi, content ko verify karo"',
    'Lab: 40 log — origin akela vs swarm, aur jhoothe peers',
  ],
  lesson: [
    `<h3>🏪 Ek dukaan vs mela</h3>
     <p>Ek dukaan par ek counter hai. 1,000 log aaye toh line lambi — aur sabse zyada log tab aate hain jab
     cheez sabse zyada chahiye (sale, naya patch, viral file). Isko <b>flash crowd</b> ya "Slashdot effect"
     kehte the: capacity pehle se tay, maang kabhi bhi.</p>
     <p>BitTorrent ne ulta kiya: har grahak thodi der baad khud bhi bechne lagta hai. Har downloader apni
     upload capacity <b>jodta</b> hai → capacity maang ke saath badhti hai → bheed aaye toh swarm <b>tez</b>.
     2004 mein CacheLogic ke mutabik BitTorrent internet traffic ka ~35% tha — bina company, bina data center,
     bina servers.</p>
     <h3>🧩 Hisse</h3>
     <ul>
       <li><b>Pieces</b> — file 256 KB–kuch MB ke tukdon mein. Alag peers se ek saath, aur verify hote hi
       <b>turant aage serve</b> — peer seconds mein source ban jaata hai, poora download khatam hone ka intezaar nahi.</li>
       <li><b>.torrent</b> — pieces ki list, har piece ka SHA-1, tracker ka pata.</li>
       <li><b>Tracker</b> — sirf peers ki list deta hai. File ka ek byte bhi nahi.</li>
       <li><b>Seeder</b> (saare pieces) / <b>leecher</b> (kuch) — sab milke <b>swarm</b>.</li>
     </ul>
     <p>Aaj bhi production mein: Twitter ne deploy 40 min → 12 sec kiya, Windows Update ka P2P, Uber Kraken
     (Docker images), Mistral ke model weights magnet link se.</p>`,
    `<h3>🔍 Anjaan logon se data — bharosa kaise?</h3>
     <p>Peers anjaan hain, badalte rehte hain — unhe authenticate nahi kar sakte. Toh <b>sender ko nahi,
     content ko verify karo</b>: aaya hua piece hash karo, .torrent ke hash se milao. Match → rakho aur
     aage do. Mismatch → phenko, kahin aur se maango, bhejne wale ko ban karo.</p>
     <p>Ek baar content verify hone laga, toh <b>koi bhi raasta</b> theek hai — mirror, cache, peer, dushman bhi.</p>
     <h3>📏 Lab 18 — 40 log, 2 MB file, asli bytes, asli SHA-1</h3>
     <pre>origin mode: 40/40 done, last at 63.0 s   origin ka upload: 1280 pieces (100%)
swarm mode:  40/40 done, last at  6.8 s   origin ka upload:  151 pieces (12%)
swarm, 80 log:              7.5 s         origin ka upload:  6%
swarm + 5 jhoothe peers:    6.9 s         143 corrupt pieces pakde, 143 bans, 0 file mein gaye</pre>
     <p>Log dugne kiye → time lagbhag wahi. Jhoothe peers ne ek-ek byte badla → hash ne pakda → time 6.8 → 6.9.
     <b>Hash check sasta hai, bharosa mehenga.</b></p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — flash crowd: origin akela vs swarm',
      project: '18-bittorrent',
      exercise: 'ex1-flash-crowd',
      goal: '40 log ek saath 2 MB file maangte hain. Pehle sirf origin se, phir swarm se. Phir 5 jhoothe peers jodo.',
      why: `<code>services/swarm.js</code> ek process mein 1 origin + N peers chalata hai, har peer ka apna HTTP port.
        Pieces ke asli bytes jaate hain; receiver har piece ka SHA-1 khud nikaalta hai. Origin 20 pieces/sec, peer 4/sec.`,
      steps: [
        { text: 'Tracker + swarm chalao.', cmd: 'cd docker-labs/18-bittorrent && npm start ex1-flash-crowd', expect: 'ex1-flash-crowd\n[tracker] :4881 — sirf peers ki list, file nahi\n[swarm] :4882 — origin :5000, peers :5001..  (32 pieces x 64 KB, origin 20/s, peer 4/s)' },
        { text: 'Sab sirf origin se.', cmd: 'node tools/flash.js --mode origin', expect: 'RESULT origin: 40/40 done, last at 63.0 s, p50 57.9 s\n  origin ka upload: 1280 pieces (100% of total)' },
        { text: 'Swarm.', cmd: 'node tools/flash.js --mode swarm', expect: 'RESULT swarm: 40/40 done, last at 6.8 s, p50 6.2 s\n  origin ka upload: 151 pieces (12% of total)' },
        { text: '5 jhoothe peers ke saath.', cmd: 'node tools/flash.js --mode swarm --malicious 5', expect: 'RESULT swarm: 35/35 done, last at 6.9 s, p50 6.5 s\n  SHA-1 mismatch: 143 pieces reject, 143 bans — koi kharab piece file mein nahi gaya' },
      ],
      observe: {
        q: 'Origin mode mein 44 sec tak ek bhi banda poora nahi hua. Swarm mein 6.8 sec mein sab. Asli farq kya hai?',
        choices: [
          'Origin mode mein capacity fixed (20 pieces/sec) aur 40 mein bati; swarm mein har peer 4 pieces/sec jodta hai — capacity maang ke saath badhti hai',
          'Swarm mein file chhoti thi',
          'Swarm mein compression tha',
          'Origin mode mein bug hai',
        ],
        answer: 0,
        explain: 'Demand hi supply ban gayi. Origin ne har piece ~5 baar bheja, baaki 88% peers ne ek dusre ko diya.',
      },
      lesson: 'Jab har grahak thoda bechne bhi lage, bheed tumhari dushman nahi, tumhari capacity hai.',
    },
    {
      type: 'quiz',
      title: 'Swarm ki samajh',
      questions: [
        {
          q: 'Tracker ke paas file ka kitna data hota hai?',
          choices: ['Kuch nahi — sirf peers ki list', 'Poori file', 'Pehla piece', 'Saare hashes aur pieces'],
          answer: 0,
          explain: 'Tracker "kaun kaun share kar raha hai" batata hai. Isi liye woh sasta hai — aur isi liye baad mein DHT se badla ja saka.',
        },
        {
          q: '"Content verify karo, sender nahi" ka sabse bada faayda?',
          choices: [
            'Data kisi bhi raaste se aa sakta hai — mirror, cache, anjaan peer — jab tak hash match hai, bharosa zaroori nahi',
            'Download tez hota hai',
            'Encryption milta hai',
            'Tracker ki zaroorat nahi rehti',
          ],
          answer: 0,
          explain: 'Content-addressing ka poora jaadu yahi hai — Docker images aur git objects bhi isi soch par hain.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — large file distribution',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "5 GB build artifact 10,000 servers par 5 minute mein pahunchana hai."',
        choices: [
          'P2P distribution (Twitter Murder / Uber Kraken jaisa): tracker/seed ek jagah, har server piece verify karke aage de, same-rack peers ko pehle — origin ka load lagbhag constant',
          'Ek bada S3 bucket, sab ek saath download',
          'rsync har server par ek-ek karke',
          '10,000 × 5 GB ka CDN plan',
        ],
        answer: 0,
        explain: '10,000 × 5 GB = 50 TB ek origin se 5 min mein namumkin; swarm mein origin ~har piece ek baar bhejta hai.',
      },
      {
        q: 'Interviewer: "Anjaan peers kharab data bhej dein toh?"',
        choices: [
          'Har piece ka hash pehle se trusted metadata mein; receiver khud verify kare, mismatch par phenke aur sender ko ban kare',
          'Sirf trusted peers se lo',
          'TLS laga do',
          'Poori file download karke end mein check karo',
        ],
        answer: 0,
        explain: 'TLS channel ko verify karta hai, content ko nahi. Aur end mein check = poora download bekaar.',
      },
    ],
  },
  success: [
    'Main client-server aur swarm ki capacity ka farq samjha sakta hoon',
    'Main content verification ka design bata sakta hoon',
    'Main lab ke numbers se flash crowd ka ilaaj dikha sakta hoon',
  ],
  homework: `<p>Apne system mein ek "flash crowd" wali cheez dhoondho — naya release, sale ki image, model weights,
    container image jo 1,000 nodes ek saath kheenchte hain. Likho: aaj origin par kitna load aata hai (nodes ×
    size), aur P2P ya same-rack sharing se kitna ghatega.</p>`,
  cards: [
    { front: 'BitTorrent ka core idea?', back: 'Har downloader upload bhi karta hai → capacity maang ke saath badhti hai. Lab: 40 log, origin akela 63 s vs swarm 6.8 s.' },
    { front: 'Tracker kya rakhta hai?', back: 'Sirf peers ki list. File ka koi byte nahi.' },
    { front: '"Content verify karo, sender nahi"?', back: 'Har piece ka SHA-1 .torrent mein; receiver khud hash karke milata hai. Mismatch → phenko + ban. Phir koi bhi raasta chalega.' },
  ],
},

/* =====================================================================
   2. bt-rarest
   ===================================================================== */
{
  id: 'bt-rarest',
  icon: '🎯',
  title: 'Kaunsa piece pehle? — rarest first',
  badge: 'Durlabh Dhoondhne Wala',
  objectives: [
    'Sequential download swarm ko kaise maarta hai ("99% par atka")',
    'Rarest first: apna faayda = swarm ka faayda',
    'Pehla piece random, aakhir mein endgame mode',
    'Lab: seeder jaldi chala gaya — kaunsi policy bachati hai',
  ],
  lesson: [
    `<h3>📚 Library ki aakhri kitaab</h3>
     <p>Socho ek library mein ek hi series ki 128 kitaabein hain aur sab log volume 1 se shuru karte hain. Sab
     volume 1-2-3 ke peeche bhaagte hain, ek dusre se exchange karne ko kuch nahi (sabke paas wahi hai), aur
     volume 128 sirf librarian ke paas. Librarian ghar chala gaya → volume 128 <b>kisi ke paas nahi</b> →
     sab "99% par atke".</p>
     <p>Yahi <b>sequential</b> piece selection ka haal hai:</p>
     <ul>
       <li>Sabke paas wahi shuruaati pieces → <b>trade karne ko kuch nahi</b>.</li>
       <li>Aakhri pieces sirf seeder ke paas → seeder par <b>hotspot</b>.</li>
       <li>Seeder gaya → aakhri pieces <b>duniya se gayab</b>.</li>
     </ul>
     <h3>🎯 Rarest first</h3>
     <p>Peers batate rehte hain ki unke paas kaunse pieces hain (have/bitfield). Client ginta hai ki kaunsa piece
     kitne peers ke paas hai, aur <b>sabse kam wala</b> pehle maangta hai. Nateeja: har piece ki availability
     barabar hoti jaati hai, seeder har piece lagbhag <b>ek baar</b> bhejta hai, aur seeder chala bhi jaaye toh
     swarm zinda. Sabse sundar baat: yeh <b>local</b> faisla hai (mujhe durlabh piece chahiye kyunki woh mujhe
     trade mein kaam aayega) jo <b>poore swarm</b> ki sehat banata hai.</p>`,
    `<h3>🎲 Do exception</h3>
     <ul>
       <li><b>Pehla piece random</b> — naye peer ke paas kuch nahi; jo bhi jaldi mile, le lo, taaki trade shuru ho.
       (Durlabh piece ka intezaar karoge toh der hogi.)</li>
       <li><b>Endgame mode</b> — aakhri kuch blocks kai peers se <b>ek saath</b> maango, jo pehle aaye woh lo, baaki
       cancel. Thoda duplicate traffic, par ek dheema peer poore download ko bandhak nahi bana sakta.</li>
     </ul>
     <h3>📏 Lab 18 (ex2) — 200 peers, 128 pieces, seeder 8 pieces/sec</h3>
     <p>Seeder ko har piece ek baar bhejne mein 16 sec lagte hain. Seeder alag-alag waqt par chala jaata hai:</p>
     <pre>policy       seeder gaya   pieces jo swarm se GAAYAB   peers jo poore hue
sequential   t=20             116 / 128                  0 / 200
sequential   t=30             110 / 128                  0 / 200
rarest       t=16               5 / 128                  0 / 200
rarest       t=20               0 / 128                200 / 200   (last t=71)
rarest       t=30               0 / 128                200 / 200</pre>
     <p class="tip">🎯 Trade-off: rarest-first <b>throughput</b> ke liye hai, <b>streaming</b> ke liye nahi — video
     dekhni ho toh shuruaati pieces pehle chahiye. BitTorrent ne jaan-boojh ke throughput chuna.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Ek peer ka safar — piece selection',
      instructions: 'Naya peer swarm mein aaya. Uski piece-picking policy sahi order mein lagao.',
      steps: [
        { text: 'Pehla piece: jo bhi jaldi mile — random', explain: 'Trade shuru karne ke liye kuch chahiye; durlabh ka intezaar mehenga.' },
        { text: 'Peers ke bitfields se har piece ki ginti (kitne paas hai)', explain: 'Rarest first ke liye pehle rarity pata honi chahiye.' },
        { text: 'Sabse kam availability wala piece maango (rarest first)', explain: 'Apna faayda (trade mein kaam aayega) + swarm ka faayda (availability barabar).' },
        { text: 'Har aaya piece hash se verify → turant dusron ko offer', explain: 'Verify hote hi tum source ho — poora download khatam hone ka intezaar nahi.' },
        { text: 'Aakhri kuch blocks: endgame — kai peers se ek saath, jo pehle aaye', explain: 'Ek dheema peer "99%" par atka na de.' },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — seeder jaldi chala gaya',
      project: '18-bittorrent',
      exercise: 'ex2',
      goal: 'Sequential vs rarest-first — seeder t=10/16/20/30 par chala jaaye toh kitne pieces swarm se gayab aur kitne peers poore.',
      why: `<code>lib/swarm.js</code> ek simulator hai (1 tick = 1 sec), pieces ke asli SHA-1 check ke saath. 200 peers,
        128 pieces, seeder 8 pieces/sec. Koi server nahi chahiye.`,
      steps: [
        { text: 'Simulation chalao.', cmd: 'cd docker-labs/18-bittorrent && node tools/rarest.js', expect: 'sequential   t=30           110 / 128                 0 / 200          —\nrarest       t=16             5 / 128                 0 / 200          —\nrarest       t=20             0 / 128               200 / 200          t=71' },
        { text: 'Sirf ek waqt dekho — seeder t=20 par gaya.', cmd: 'node tools/rarest.js --leave 20', expect: 'sequential   t=20          116 / 128                 0 / 200          —\nrarest       t=20            0 / 128               200 / 200          t=71' },
      ],
      observe: {
        q: 'Rarest-first mein t=16 par bhi 5 pieces gayab the, jabki seeder ko har piece ek baar bhejne mein 16 sec lagte hain. Kyun?',
        choices: [
          'Pehla piece random hota hai — shuru mein kuch duplicate pieces gaye, isliye 16 sec mein saare 128 alag pieces bahar nahi aa paaye',
          'Rarest first kaam nahi karta',
          'Hash check fail hua',
          'Seeder dheema tha',
        ],
        answer: 0,
        explain: 'Random first piece ki chhoti si keemat. 20 sec tak seeder rahe toh sab bach jaata hai.',
      },
      lesson: 'Har peer ka local faisla (rarest first) poore swarm ko seeder ke bina zinda rakhta hai.',
    },
  ],
  interview: {
    title: 'Interview Round — piece scheduling',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "P2P video streaming bana rahe hain. Rarest-first chalega?"',
        choices: [
          'Seedha nahi — streaming ko playback ke paas wale pieces pehle chahiye; mix karo: aage ki window mein sequential/deadline-based, baaki rarest-first',
          'Haan, hamesha',
          'Nahi, P2P streaming mumkin hi nahi',
          'Sirf sequential',
        ],
        answer: 0,
        explain: 'Rarest first throughput ke liye hai; streaming latency/order maangti hai.',
      },
      {
        q: 'Interviewer: "Endgame mode ka nuksaan?"',
        choices: [
          'Thoda duplicate traffic (ek hi block kai peers se) — jaan-boojh ke, taaki ek dheema peer poore download ko na roke',
          'Download dheema',
          'Hash check band ho jaata hai',
          'Seeder overload',
        ],
        answer: 0,
        explain: 'Wahi idea jo hedged requests mein hai: tail kaatne ke liye thoda extra kaam.',
      },
    ],
  },
  success: [
    'Main sequential selection ki teen bimaariyan bata sakta hoon',
    'Main rarest-first, random-first aur endgame ka kaam samjha sakta hoon',
    'Main lab se dikha sakta hoon ki seeder ke jaane ke baad swarm kyun bacha',
  ],
  homework: `<p>Lab mein <code>tools/rarest.js --leave 12,14,16,18</code> chalao. Rarest-first ke liye woh pal dhoondho
    jiske baad seeder chala jaaye toh bhi sab bach jaate hain. Us number ko seeder ki speed (8 pieces/sec) aur
    128 pieces se jodo.</p>`,
  cards: [
    { front: 'Sequential piece selection kyun bura?', back: 'Sabke paas wahi pieces (trade kuch nahi), aakhri pieces sirf seeder par (hotspot), seeder gaya → "99% par atka".' },
    { front: 'Rarest first?', back: 'Sabse kam peers ke paas wala piece pehle. Availability barabar, seeder har piece ~ek baar. Lab: seeder t=20 gaya, 200/200 poore; sequential 0/200.' },
    { front: 'Endgame mode?', back: 'Aakhri blocks kai peers se ek saath, jo pehle aaye woh lo, baaki cancel — dheema peer bandhak na banaye.' },
  ],
},

/* =====================================================================
   3. bt-titfortat
   ===================================================================== */
{
  id: 'bt-titfortat',
  icon: '🤝',
  title: 'Free riders aur tit-for-tat',
  badge: 'Lena-Dena Laal',
  objectives: [
    'Free riding: rational par swarm ke liye zeher',
    'Tit-for-tat choking — protocol mein hi saza aur inaam',
    'Optimistic unchoke: naye logon ka darwaaza, explore/exploit',
    'Lab: 20% free-riders ke saath aur bina',
  ],
  lesson: [
    `<h3>🍽️ Potluck jahan sab khaate hain, laata koi nahi</h3>
     <p>Upload karna kharcha hai (bandwidth), aur koi zabardasti nahi. Toh rational banda sirf download karega.
     2000 ki ek Gnutella study mein ~70% users ne kuch share nahi kiya aur top 1% hosts ne aadhe jawab diye —
     P2P network dheere-dheere client-server ban gaya, bina kisi guarantee ke.</p>
     <p>BitTorrent ke paas koi central authority nahi jo saza de. Toh saza <b>protocol</b> mein daali: game theory
     ka <b>tit-for-tat</b> (Axelrod ka prisoner's dilemma).</p>
     <h3>🔇 Choking</h3>
     <ul>
       <li>Har peer ke paas ~4 upload slots.</li>
       <li>Har 10 sec: jin peers ne mujhe sabse tez diya, unhe rank karo; top ko <b>unchoke</b> (bhejo), baaki
       <b>choke</b> (connection khula, par kuch nahi bhejte).</li>
       <li>Na reputation database, na moderator — sab apne aap.</li>
     </ul>`,
    `<h3>🚪 Par naya banda kya kare?</h3>
     <p>Naye peer ke paas 0 pieces → woh kuch upload nahi kar sakta → sab use choke karte hain → use pehla piece
     kabhi nahi milta. Bootstrap fail.</p>
     <p>Ilaaj: <b>optimistic unchoke</b> — har 30 sec ek slot kisi <b>random</b> peer ko, chahe usne kuch diya ho
     ya nahi. Do kaam: (1) naye logon ko pehla piece, (2) aise behtar partner dhoondhna jinhe tum abhi jaante hi
     nahi — <b>explore/exploit</b>.</p>
     <h3>📏 Lab 18 (ex3) — 200 peers, 128 pieces, 20% free-riders (0 upload)</h3>
     <pre>choke        honest peers p50   free-riders p50
none               78 sec             71 sec     ← free-rider honest se PEHLE!
titfortat          67 sec             87 sec

titfortat BINA optimistic unchoke (koi free-rider nahi): 400 sec mein 0/200 poore</pre>
     <p>Bina tit-for-tat, dene wale ko saza aur lene wale ko inaam. Tit-for-tat se honest tez, free-rider ko sirf
     optimistic slots ke tukde. Aur optimistic slot hatao → koi kisi ko pehla piece nahi deta → sirf seeder ke
     bharose → 400 sec mein koi poora nahi.</p>
     <p class="tip">🎯 <b>Incentives architecture ka hissa hain.</b> Jahan log apni marzi se kharcha karte hain,
     wahan protocol hi niyam hai.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — free riders vs tit-for-tat',
      project: '18-bittorrent',
      exercise: 'ex3',
      goal: '20% peers kuch upload nahi karte. Bina tit-for-tat aur tit-for-tat ke saath — honest aur free-riders kab khatam hote hain? Phir optimistic slot hatao.',
      why: `<code>tools/titfortat.js</code>: tit-for-tat mein har uploader 3 slots unhe deta hai jinse use sabse zyada
        mila, +1 optimistic slot random ko (har 3 tick badalta). Simulator, koi server nahi.`,
      steps: [
        { text: 'Simulation chalao.', cmd: 'cd docker-labs/18-bittorrent && node tools/titfortat.js', expect: 'none               78                 71\ntitfortat          67                 87\n\ntitfortat BINA optimistic unchoke (koi free-rider nahi): 400 sec mein 0/200 poore hue, p50 —' },
        { text: 'Aakhri line ka tark padho.', cmd: 'node tools/titfortat.js | tail -1', expect: '(naye peer ke paas dene ko kuch nahi → koi use unchoke nahi karta → optimistic slot hi naye logon ka darwaza hai)' },
      ],
      observe: {
        q: '"none" mein free-riders honest peers se pehle khatam kyun hue?',
        choices: [
          'Unka koi upload bandwidth kharch nahi hua aur uploaders random logon ko de rahe the — lena poora, dena zero. Dene walon ko saza mili',
          'Free-riders ke paas tez internet tha',
          'Simulator ka bug',
          'Free-riders kam the',
        ],
        answer: 0,
        explain: 'Bina incentive ke rational behaviour swarm ko kamzor karta hai.',
      },
      lesson: 'Tit-for-tat dene walon ko tez karta hai; optimistic unchoke naye logon ko ghusne deta hai.',
    },
    {
      type: 'match',
      title: 'Game theory ke hisse',
      instructions: 'Har mechanism ko uske kaam se jodo.',
      pairs: [
        { left: '🔇 Choke', right: 'Connection khula rakho, par bhejo mat — saza bina todfod ke', explain: 'Dobara unchoke karna sasta — rishte khatam nahi hote.' },
        { left: '🏅 Top ~3 ko unchoke (har 10 sec)', right: 'Jo mujhe tez deta hai, main use deta hoon', explain: 'Tit-for-tat — reputation DB ki zaroorat nahi.' },
        { left: '🎲 Optimistic unchoke (har 30 sec)', right: 'Naye peers ka bootstrap + behtar partner dhoondhna', explain: 'Explore/exploit — sirf exploit karoge toh naya kabhi nahi milega.' },
        { left: '📉 Gnutella 2000: ~70% ne kuch share nahi kiya', right: 'Incentive ke bina P2P client-server ban jaata hai', explain: 'Top 1% hosts ne aadhe jawab diye.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — incentives',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare internal P2P cache mein kuch nodes upload band kar dete hain (CPU bachane). Kya karein?"',
        choices: [
          'Protocol mein incentive: jo zyada deta hai use priority (tit-for-tat jaisa), naye nodes ke liye ek optimistic slot; aur upload ko sasta rakho (background class)',
          'Un nodes ko band kar do',
          'Sab nodes ko force karo',
          'P2P hata do',
        ],
        answer: 0,
        explain: 'Enforcement protocol mein — central police ke bina.',
      },
      {
        q: 'Interviewer: "Optimistic unchoke hata dein? Thoda bandwidth bachega."',
        choices: [
          'Nahi — naye peers kabhi pehla piece nahi paayenge (lab: 400 sec mein 0/200), aur behtar partner dhoondhne ka raasta band',
          'Haan, bandwidth zaroori hai',
          'Sirf raat ko hatao',
          'Koi farq nahi',
        ],
        answer: 0,
        explain: 'Explore band = system naye logon aur naye mauke ke liye andha.',
      },
    ],
  },
  success: [
    'Main free riding ka nuksaan aur tit-for-tat ka ilaaj samjha sakta hoon',
    'Main optimistic unchoke ko explore/exploit ki tarah dekh sakta hoon',
    'Main lab ke numbers se incentives ka asar dikha sakta hoon',
  ],
  homework: `<p>Apne team/system mein ek "free rider" problem dhoondho — shared cache jise sab padhte hain par bharta koi
    nahi, shared runbook jise koi update nahi karta, shared CI jise sab bhaari jobs se bhar dete hain. Likho: is
    system ke "protocol" mein kaunsa chhota incentive ya choke daal sakte ho?</p>`,
  cards: [
    { front: 'Tit-for-tat choking?', back: '~4 upload slots; har 10 sec jinse sabse tez mila unhe unchoke, baaki choke (connection khula, kuch nahi bhejte).' },
    { front: 'Optimistic unchoke?', back: 'Har 30 sec ek slot random peer ko — naye peers ka bootstrap + behtar partner dhoondhna (explore/exploit). Lab: hatao → 0/200 in 400 s.' },
    { front: 'Lab 18: free-riders (20%)?', back: 'None: free-rider 71 s, honest 78 s (ulta inaam). Tit-for-tat: honest 67 s, free-rider 87 s.' },
  ],
},

/* =====================================================================
   4. bt-dht
   ===================================================================== */
{
  id: 'bt-dht',
  icon: '🧲',
  title: 'Tracker ke bina — DHT, magnet aur shareef upload',
  badge: 'XOR Yatri',
  objectives: [
    'Tracker SPOF (technical + legal) → Kademlia DHT',
    'XOR distance aur log N lookup',
    'Magnet link: jagah nahi, content ka pata',
    'Bufferbloat aur uTP/LEDBAT; trade-offs (privacy, Sybil)',
  ],
  lesson: [
    `<h3>📋 Tracker bhi ek SPOF</h3>
     <p>Tracker file nahi rakhta, par woh gira toh naye log swarm dhoondh hi nahi sakte. Aur woh <b>legal</b> SPOF
     bhi hai — ek operator, ek IP, ek hosting bill, ek takedown notice.</p>
     <p>2005: <b>Mainline DHT</b>, Kademlia (2002 paper) par. Laakhon nodes ki ek distributed hash table: key =
     <b>info hash</b> (metadata ka SHA-1, 160-bit), value = peers ki list. Har node ki random 160-bit ID; jin
     nodes ki ID info hash ke <b>sabse paas</b> hai (XOR distance), woh uski peer list rakhte hain.</p>
     <h3>🧭 XOR distance se kaise pahunchein?</h3>
     <p>Har node har "distance range" (bucket) mein kuch hi nodes jaanta hai — paas wale zyada detail mein, door wale
     kam. Lookup: "tumhe target ke jo sabse paas nodes pata hain, batao" — 3 se ek saath poochho, jo naye paas wale
     mile unse poochho. Har jawab distance ka kam se kam ek bit aur "sahi" karta hai → <b>log N</b> rounds.</p>
     <pre>lab 18 (ex4):
nodes     har node kitne jaanta hai   avg rounds   avg messages   sahi node mila
1000            63 (6.30%)               4.0          11.0          100%
10000           89 (0.89%)               4.6          12.8          100%
100000         116 (0.12%)               5.3          14.8          100%</pre>`,
    `<h3>🧲 Magnet link</h3>
     <p><b>Metadata exchange</b> extension: peers .torrent ka metadata bhi tukdon mein bhej dete hain, jo info hash se
     verify hota hai. Toh ab sirf <b>40-character info hash</b> chahiye → magnet link.</p>
     <pre>2001: website + .torrent file + tracker
2005: DHT ne tracker ki jagah li
baad mein: metadata exchange ne .torrent ki jagah li → sirf magnet link</pre>
     <p class="tip">🎯 URL <b>jagah</b> ka pata hai ("yeh server, yeh path"). Magnet <b>content</b> ka pata hai
     ("yeh hash wali cheez, jahan bhi ho").</p>
     <h3>🛁 Bufferbloat aur shareef upload</h3>
     <p>TCP capacity dhoondhta hai loss aane tak speed badha ke. Ghar ke routers packet giraane ki jagah
     <b>buffer</b> karte hain → queue bharti hai. Darjanon BitTorrent TCP connections buffers bhare rakhte the →
     sabke packets (video call, game, web) seconds tak line mein. ~2009 <b>uTP</b>: timestamps se <b>queuing delay</b>
     naapo; ~100 ms target se upar → buffer bharne se pehle hi peeche hato. TCP ke aage jhuk jaata hai →
     "background" class. IETF ne ise <b>LEDBAT</b> banaya — Windows Update aur Apple updates yahi use karte hain.</p>
     <h3>⚖️ Trade-offs</h3>
     <ul>
       <li>Privacy nahi — swarm membership public, IPs dikhte hain.</li>
       <li>Throughput &gt; latency; availability maang ke saath (seeders gaye toh file gayi).</li>
       <li>Khuli membership → <b>Sybil attack</b>: hazaron nakli identities lookups ko bigaad sakti hain.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — Kademlia lookup',
      project: '18-bittorrent',
      exercise: 'ex4',
      goal: '1,000 se 1,00,000 nodes — har node kitne nodes jaanta hai aur lookup kitne rounds mein sahi node tak pahunchta hai.',
      why: `<code>tools/dht.js</code>: 32-bit IDs (asli mein 160-bit, idea wahi), k=8 per bucket, alpha=3. Har lookup ka
        jawab brute force se check hota hai ("sahi node mila").`,
      steps: [
        { text: 'Teen sizes par chalao.', cmd: 'cd docker-labs/18-bittorrent && node tools/dht.js', expect: '1000            63 (6.30%)            4.0            5           11.0         100.0%\n10000           89 (0.89%)            4.6            6           12.8         100.0%\n100000         116 (0.12%)            5.3            7           14.8         100.0%' },
        { text: 'Kam lookups se jaldi dekhna ho toh.', cmd: 'node tools/dht.js --nodes 10000 --lookups 100', expect: '10000           89 (0.89%)            4.6            6           12.8         100.0%' },
      ],
      observe: {
        q: 'Nodes 100× badhe (1,000 → 1 lakh), rounds sirf 4.0 → 5.3. Kyun?',
        choices: [
          'Har round XOR distance ka kam se kam ek bit sahi karta hai, aur har node paas ke nodes zyada detail mein jaanta hai — rounds log N ke saath badhte hain',
          'Bade network mein nodes tez hain',
          'Lookups cache ho gaye',
          'Simulation chhota tha',
        ],
        answer: 0,
        explain: 'log2(100×) ≈ 6.6 bits — par har round kai bits sahi kar deta hai (k=8, alpha=3).',
      },
      lesson: 'Har node thoda sa jaane, par sahi dhang se — toh bina kisi center ke bhi log N mein pata mil jaata hai.',
    },
    {
      type: 'quiz',
      title: 'DHT aur LEDBAT',
      questions: [
        {
          q: 'Magnet link mein sirf info hash hai. Metadata par bharosa kaise?',
          choices: [
            'Metadata peers se tukdon mein aata hai aur info hash se verify hota hai — hash hi pehchaan hai',
            'Magnet link encrypted hai',
            'Tracker verify karta hai',
            'Bharosa nahi kar sakte',
          ],
          answer: 0,
          explain: 'Content-addressing: naam hi saboot hai.',
        },
        {
          q: 'uTP/LEDBAT kis problem ko theek karta hai?',
          choices: [
            'Bufferbloat — bulk upload router ke buffers bhar deta tha, sabke calls/games seconds tak atakte; LEDBAT queuing delay dekh ke pehle hi peeche hat-ta hai',
            'Piece corruption',
            'Free riding',
            'Tracker downtime',
          ],
          answer: 0,
          explain: '"Har workload ko barabar mat ladao" — background ko jhukna chahiye.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — decentralized discovery',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Central registry ke bina 1 lakh nodes mein key ka owner kaise dhoondhoge?"',
        choices: [
          'Kademlia-style DHT: random IDs, XOR distance, k-buckets; iterative lookup parallel alpha ke saath — log N rounds',
          'Sab nodes ko broadcast',
          'Har node sabko jaane',
          'Ek random node se poochho',
        ],
        answer: 0,
        explain: 'Broadcast = N messages; sab jaane = N² memory. DHT: har node ~log N, lookup ~log N.',
      },
      {
        q: 'Interviewer: "Open DHT ka sabse bada security risk?"',
        choices: [
          'Sybil — ek attacker hazaron nakli IDs banake lookups ghere ya records poison kare; ID generation mehenga/bandha karna, kai raaston se verify',
          'DDoS',
          'Encryption ki kami',
          'Slow lookups',
        ],
        answer: 0,
        explain: 'Khuli membership ki keemat.',
      },
    ],
  },
  success: [
    'Main tracker se DHT tak ka safar aur uska kaaran bata sakta hoon',
    'Main XOR distance aur log N lookup samjha sakta hoon',
    'Main magnet link, LEDBAT aur BitTorrent ke trade-offs gin sakta hoon',
  ],
  homework: `<p>Apne system mein koi "jagah se pata" (URL, host:port) dhoondho jise "content se pata" (hash) se badalne par
    faayda ho — build artifacts, container images, static assets. Likho: kya milega (cache kahin se bhi, verify
    apne aap) aur kya chahiye (hash ka trusted source).</p>`,
  cards: [
    { front: 'Kademlia DHT?', back: 'Random IDs, XOR distance; key ke sabse paas nodes value rakhte hain; har node har distance-range mein k nodes jaanta hai. Lookup ~log N rounds (lab: 1k→100k nodes, 4.0→5.3).' },
    { front: 'Magnet link?', back: 'Sirf info hash (40 chars). DHT se peers, metadata exchange se .torrent — info hash se verify. URL = jagah; magnet = content.' },
    { front: 'uTP / LEDBAT?', back: 'Queuing delay naap ke (~100 ms target) buffer bharne se pehle peeche hat-na — bufferbloat ka ilaaj, background class. Windows/Apple updates.' },
  ],
},
]);

})();
