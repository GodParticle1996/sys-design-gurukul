/* =====================================================================
   TRACK — 🌍 Planet-scale Infra · YouTube: mehenga kaam ek baar, sasta karodon baar

   Source: "How YOUTUBE Delivers 1 Billion Hours a Day" (Akhil Sharma).
   (🏗️ Poore Systems Banao → "Video Platform" level khaali page se design hai;
    yeh levels YouTube ke ASLI infra ki kahani hain.)
   Docker lab: docker-labs/21-youtube
   ===================================================================== */
(function () {

VISUALS['yt-upload'] = {
  t: 'Compute once, serve forever',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 upload (10–50 MB chunks, resumable)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🌐 paas ka Google edge</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">📬 queue</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">⚙️ transcode ladder</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">📦 dozens of files, ISP ke paas</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">📐</span><span class="nl">9 resolutions</span><span class="ns">144p … 1080p … 4K … 8K</span></div>
      <div class="dg-node"><span class="ni">🎞️</span><span class="nl">× 3 codecs</span><span class="ns">H.264 (purane phones), VP9, AV1</span></div>
      <div class="dg-node is-good"><span class="ni">▶️</span><span class="nl">Play dabana</span><span class="ns">lagbhag muft — sab pehle se bana, pehle se paas</span></div>
    </div>`,
};

VISUALS['yt-transcode'] = {
  t: '2 ghante ki movie, 12 machines',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🐢 Ek machine</span>
        <div class="dg-cap">Poori movie ek ke baad ek. Lab: 2.20 s (toy units); VP9 (~5× CPU) 10.84 s.</div></div>
      <div class="dg-box is-good"><span class="bx-label">⚡ 10-min chunks, 12 machines</span>
        <div class="dg-cap">Lab: 0.25 s (8.8× tez). Seams par encoder ko pichhle frames chahiye → chunks ko thoda
          <b>overlap</b> karo, stitch par kaat do: kharab units 60 → 5, kharcha +0.8%.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Aur jab CPU bhi kam pade: Google ka apna chip — <b>Argos VCU</b> (~2015 ke baad): video ke mutabik ~20–33× compute-efficient,
      4K hours mein, din mein nahi.</div>`,
};

VISUALS['yt-vitess'] = {
  t: 'Boring MySQL, uske chaaron taraf Vitess',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🧑‍💻 app servers (hazaron connections)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🚪 vtgate (kaunsa shard?)</span><span class="dg-arrow">→</span>
      <span class="dg-pill gold">🛡️ vttablet (har MySQL ke saath)</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🐬 MySQL</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-good"><span class="ni">🏊</span><span class="nl">Pooling</span><span class="ns">lab: 2,000 connections → DB par 20; refused 7,600 → 0</span></div>
      <div class="dg-node is-good"><span class="ni">🧲</span><span class="nl">Consolidation</span><span class="ns">same SELECT chal raha hai → usi ka jawab; 10,000 → 6 DB queries</span></div>
      <div class="dg-node is-good"><span class="ni">🛑</span><span class="nl">Query safety</span><span class="ns">LIMIT jodo, lambi query kill — intern ki galti 2 s → 21 ms</span></div>
    </div>`,
};

VISUALS['yt-deliver'] = {
  t: 'Duniya bhar mein order, aur ISP ke andar cache',
  html: `
    <div class="dg-split">
      <div class="dg-box is-gold"><span class="bx-label">⏱️ Spanner TrueTime</span>
        <div class="dg-cap">Ghadi ek interval deti hai [earliest, latest] (kuch ms). <b>Commit wait</b>: uncertainty khatam hone tak
          "done" mat bolo → baad wala write hamesha bada timestamp. Lab: NTP 39.7% ulta order; TrueTime 0%, keemat ~14 ms/write.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🏠 Google Global Cache</span>
        <div class="dg-cap">Cache servers ISPs ke ANDAR, 1,300+ shehar. Popular pehle se push, kam-dekhe pehli request par pull.
          ISP ka faayda: bahar ka transit bachta hai. Popular par hit rate ~98–99%.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Aur aakhri meter: <b>QUIC</b> (HTTP/3) — TCP ka head-of-line blocking nahi, connection jaldi → video jaldi shuru.</div>`,
};

SD.registerLevels('planet', [
/* =====================================================================
   1. yt-upload
   ===================================================================== */
{
  id: 'yt-upload',
  icon: '📤',
  title: 'YouTube — upload par saara bhaari kaam',
  badge: 'Upload Ustaad',
  objectives: [
    '"Compute once, serve forever" — asymmetry',
    'Resumable chunked upload — kamzor link par',
    'Transcode ladder: resolutions × codecs',
    'Lab: 64 MB aur 256 MB upload, blob vs chunks',
  ],
  lesson: [
    `<h3>🍛 Shaadi ka khaana</h3>
     <p>Shaadi mein khaana ek baar, subah se, bade bartano mein banta hai — taaki 500 mehmaan aayein toh bas parosna ho.
     YouTube bhi yahi karta hai: roz ~1 arab ghante dekhe jaate hain, ~500 ghante video <b>har minute</b> upload hota
     hai. Mushkil kaam delivery nahi, <b>upload ke baad</b> ka hai. Siddhant: <b>compute once, serve forever</b> —
     saara bhaari kaam upload par, taaki "play" dabana lagbhag muft ho (bytes pehle se bane, pehle se paas).</p>
     <h3>📱 Kamzor link, badi file</h3>
     <p>Client file ko ~10–50 MB ke <b>chunks</b> mein kaatta hai → <b>resumable</b> upload (toota sirf wahi chunk
     dobara) → sabse paas ka Google edge → storage mein jodo → queue mein message → worker pool job uthata hai.</p>
     <pre>lab 21 (link average 30 MB par toot-ta hai, 5 trials):
64 MB:  blob     link par average 209 MB (3.3× file), kabhi 1.2×, kabhi 6.5×
        chunked  link par 67 MB (1.0×), hamesha
256 MB: blob     40 koshish, 1,032 MB bheje — PHIR BHI poora nahi ❌
        chunked  275 MB (1.1×), 7.6 s ✅</pre>`,
    `<h3>🪜 Transcode ladder</h3>
     <p>Ek upload, ek format. Dekhne wale: 4K TV gigabit par … 6 saal purana Android 3G par … laptop … smart fridge.
     Isliye ek 8K upload se:</p>
     <ul>
       <li><b>~9 resolutions</b>: 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p (4K), 4320p (8K)</li>
       <li><b>× codecs</b>: H.264 (purane devices), VP9, AV1</li>
       <li><b>+ audio tracks</b> → darjanon files</li>
     </ul>
     <p>Codec ka sauda: behtar compression = zyada compute. Video ke mutabik VP9 encode ~5× H.264 ka compute, aur AV1
     VP9 se ~30% aur chhota par encode aur bhi bhaari. Bandwidth (har view par) bachane ke liye compute (ek baar)
     kharch karo — kyunki view karodon baar hote hain.</p>
     <p class="tip">🎯 <b>Asymmetry</b>: mehenga kaam ek baar, sasta kaam karodon baar. Jahan "ek baar" aur "karodon
     baar" ka farq ho, wahan kaam pehle karo.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — kamzor link par upload',
      project: '21-youtube',
      exercise: 'ex1-upload',
      goal: 'Ek hi file, kamzor link: poori file ek request mein (blob) vs 4 MB chunks (resumable). Link par kitne bytes gaye aur kitna waqt?',
      why: `<code>services/edge.js</code> har connection ke liye ek random "maut ka point" chunta hai (average 30 MB) aur link speed
        ~80 MB/s rakhta hai. SHA-256 se poori file verify hoti hai. <code>GET /have/:id</code> = kaunse chunks pahunch gaye.`,
      steps: [
        { text: 'Edge chalao.', cmd: 'cd docker-labs/21-youtube && npm start ex1-upload', expect: 'ex1-upload\n[edge] :4961 — link average 30 MB par toot-ta hai, ~80 MB/s' },
        { text: '64 MB, 5 trials.', cmd: 'node tools/upload.js', expect: 'average:\n  blob     link par 209 MB (3.3x file)   2.7 s   6.2 baar toota\n  chunked  link par 67 MB (1.0x file)   0.9 s   2.0 baar toota' },
        { text: '256 MB, ek trial.', cmd: 'node tools/upload.js --mb 256 --trials 1', expect: '#1 blob     requests  40   link toota  40 baar   link par gaye 1032 MB (4.0x)   time 12.8 s   sha256 nahi mila ❌\n#1 chunked  requests  73   link toota   9 baar   link par gaye  275 MB (1.1x)   time 7.6 s   sha256 MATCH ✅' },
      ],
      observe: {
        q: '256 MB blob 40 koshish mein bhi poora kyun nahi hua?',
        choices: [
          'Link average 30 MB par toot-ta hai — 256 MB ek baar mein bina toote bhejne ka chance lagbhag zero; har baar shuru se',
          'Server ne mana kiya',
          'File kharab thi',
          'Timeout chhota tha',
        ],
        answer: 0,
        explain: 'Chance ≈ e^(−256/30) ≈ 0.02%. Chunks mein har tukde ka chance ~87% — aur toota sirf wahi dobara.',
      },
      lesson: 'Kamzor link par bada kaam chhote, dobara chalane layak tukdon mein karo — progress kabhi mat khoo.',
    },
    {
      type: 'estimate',
      title: 'Napkin math — upload ka paimana',
      goal: 'YouTube ke upload side ka bojh khud nikaalo.',
      problems: [
        {
          q: '~500 ghante video har MINUTE upload hota hai. Ek din mein kitne ghante?',
          unit: 'ghante', given: ['500 ghante/min', '1,440 min/din'],
          answer: 720000, tol: 0.3,
          steps: ['500 × 1,440 = 7,20,000 ghante', '≈ 82 saal ka video — ROZ'],
          lesson: 'Har ghanta ~9 resolutions × kai codecs mein transcode — isi liye transcode hi asli bojh hai.',
        },
        {
          q: 'Har upload ghante ke ~27 versions (9 res × 3 codecs) banein. Roz kitne "video-ghante" transcode?',
          unit: 'ghante', given: ['7,20,000 ghante/din', '27 versions'],
          answer: 19440000, tol: 0.3,
          steps: ['7,20,000 × 27 ≈ 1.94 crore', 'Roz ~2 crore ghante ka encode'],
          lesson: 'CPU se yeh mehenga — isi liye Google ne apna video chip (Argos VCU) banaya.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — video upload',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Mobile users ke bade video uploads aadhe raaste fail hote hain."',
        choices: [
          'Resumable chunked upload — client chunks bheje, server "kaunse aa gaye" batane wala endpoint, toota sirf wahi chunk dobara; aakhir mein poori file ka hash verify',
          'Timeout badhao',
          'File size limit lagao',
          'Upload ko compress karo',
        ],
        answer: 0,
        explain: 'Lab: 256 MB blob kabhi poora nahi, chunks 1.1× bytes mein poore.',
      },
      {
        q: 'Interviewer: "Video ko play time par transcode karein (on-the-fly)? Storage bachega."',
        choices: [
          'Popular videos ke liye nahi — asymmetry: encode ek baar, view karodon baar; on-the-fly har view par CPU aur latency. Long-tail ke liye kuch formats lazy ho sakte hain',
          'Haan, hamesha on-the-fly',
          'Nahi, storage sasta hai isliye sab pehle',
          'Sirf 4K on-the-fly',
        ],
        answer: 0,
        explain: 'Long tail: kam dekhe videos par mehenga kaam kam karo; popular par sab pehle.',
      },
    ],
  },
  success: [
    'Main compute-once-serve-forever asymmetry samjha sakta hoon',
    'Main resumable chunked upload design kar sakta hoon',
    'Main transcode ladder aur codec ka compute/bandwidth sauda bata sakta hoon',
  ],
  homework: `<p>Apne system mein ek "karodon baar padha, ek baar likha" wala data dhoondho (product page, report, thumbnail,
    config). Kya uska bhaari kaam har read par hota hai? Likho: agar use likhte waqt pehle se bana diya jaaye toh
    har read par kitna bachega.</p>`,
  cards: [
    { front: 'YouTube ka siddhant?', back: 'Compute once, serve forever — saara bhaari kaam upload par (chunks, transcode, placement), taaki play dabana lagbhag muft ho.' },
    { front: 'Resumable upload?', back: '10–50 MB chunks; toota sirf wahi chunk dobara. Lab: 64 MB blob avg 3.3× bytes, chunks 1.0×; 256 MB blob 40 koshish mein bhi fail.' },
    { front: 'Transcode ladder?', back: '~9 resolutions (144p…8K) × codecs (H.264, VP9, AV1) + audio → darjanon files. VP9 ~5× H.264 compute (video ke mutabik).' },
  ],
},

/* =====================================================================
   2. yt-transcode
   ===================================================================== */
{
  id: 'yt-transcode',
  icon: '⚙️',
  title: 'Transcode — tukdon mein, aur apne chip par',
  badge: 'Chunk Chalane Wala',
  objectives: [
    'Parallel chunked transcoding aur seams ki problem',
    'Overlap: thoda extra kaam, koi glitch nahi',
    'Codec ka compute vs bandwidth sauda',
    'Argos VCU aur long-tail ka hisaab',
  ],
  lesson: [
    `<h3>🧵 Ek darzi vs 12 darzi</h3>
     <p>2 ghante ki movie ek machine par encode karo toh ghanton. Isliye: movie ko ~10-min <b>chunks</b> mein kaato,
     12 machines par ek saath, phir <b>order mein jodo</b>.</p>
     <p>Dikkat: encoder ko <b>pados ke frames</b> chahiye (rate control, lookahead). Chunk ki shuruaat mein woh "thanda"
     hota hai → seams par quality girti hai. Ilaaj: chunks thoda <b>overlap</b> karo — pichhle chunk ke kuch frames bhi
     encode karo taaki encoder garam ho, phir stitch par woh frames kaat do.</p>
     <pre>lab 21 (ex2) — 7,200 units (1 unit = 1 sec video), asli CPU burn, 14-core laptop:
H.264   1 machine                 2.20 s     kharab units    5
H.264  12 machines, no overlap    0.25 s     kharab units   60   ← har seam par 5
H.264  12 machines, overlap 5     0.24 s     kharab units    5   (+55 units extra = +0.8%)
VP9     1 machine                10.84 s
VP9    12 machines, overlap 5     1.09 s</pre>`,
    `<h3>🔩 Jab CPU bhi kam pade — apna chip</h3>
     <p>~2015 ke baad Google ne <b>Argos VCU</b> (video coding unit) banaya: video ke mutabik ~20–33× zyada
     compute-efficient (design aur banane ka kharcha jod ke); ek chip mein ~10 encoder cores, har ek 4K real-time;
     ek card par 2 chips (GPU jaisa). Ek analysis ke mutabik ~1 crore CPUs jitna kaam. 4K ab ghanton mein, dinon
     mein nahi. (Dropbox ne storage ke liye yahi kiya — jab problem badi aur khaas ho, stack khud banao.)</p>
     <h3>📉 Long tail</h3>
     <p>Zyadatar videos bahut kam dekhe jaate hain. Mehenga kaam wahan karo jahan maang hai: popular videos ko zyada
     formats, zyada jagah, zyada optimization; kam dekhe videos ke liye conservative.</p>
     <p class="tip">🎯 Parallelism ka niyam: <b>tukde karo, par seams ki keemat pehchaano</b> aur use thode se extra
     kaam se chuka do.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 12 machines par ek movie',
      project: '21-youtube',
      exercise: 'ex2',
      goal: 'Movie ko chunks mein kaat ke asli worker processes par chalao — time, seams par kharab units, aur overlap ka kharcha.',
      why: `<code>tools/transcode.js</code> asli child processes fork karta hai; har "unit" par asli CPU burn. Encoder ki shuruaat ke
        5 units "kachhe" (warm-up). Overlap = pichhle 5 units bhi encode karke kaat do. Toy encoder — ratio dekho, number nahi.`,
      steps: [
        { text: 'Transcode tool chalao.', cmd: 'cd docker-labs/21-youtube && node tools/transcode.js', expect: 'H.264              1       1        0        2.20 s     2.17 s        5 / 7200          +0 units\nH.264             12      12        0        0.25 s     2.42 s       60 / 7200          +0 units\nH.264             12      12        5        0.24 s     2.33 s        5 / 7200          +55 units\nVP9 (~5x CPU)     12      12        5        1.09 s    11.92 s        5 / 7200          +55 units' },
        { text: 'Sirf VP9 ka farq dekho (1 vs 12 machines).', cmd: 'node tools/transcode.js | grep VP9', expect: 'VP9 (~5x CPU)      1       1        0       10.84 s    10.81 s        5 / 7200          +0 units\nVP9 (~5x CPU)     12      12        5        1.09 s    11.92 s        5 / 7200          +55 units' },
      ],
      observe: {
        q: 'Overlap ke saath bhi 5 kharab units kyun bache?',
        choices: [
          'Movie ki sabse pehli shuruaat — uske pehle koi frame hai hi nahi jisse encoder garam ho',
          'Overlap chhota tha',
          'Ek machine fail hui',
          'Stitch mein bug',
        ],
        answer: 0,
        explain: 'Baaki 11 seams overlap ne theek kiye; 60 → 5, sirf +0.8% extra encode.',
      },
      lesson: 'Parallel karo, seams ki keemat thode extra kaam se chukao.',
    },
    {
      type: 'match',
      title: 'Faisla aur uski wajah',
      instructions: 'Har faisle ko uski wajah se jodo.',
      pairs: [
        { left: '✂️ Movie ko 10-min chunks mein', right: '12 machines ek saath — ghanton ki jagah minute', explain: 'Lab: 8.8× tez.' },
        { left: '🔁 Chunks mein thoda overlap', right: 'Seams par encoder garam — glitch nahi', explain: 'Lab: 60 → 5 kharab units, +0.8% kaam.' },
        { left: '🎞️ VP9/AV1 (mehenga encode)', right: 'Har view par bandwidth kam — views karodon hain', explain: 'Compute ek baar, bandwidth har baar.' },
        { left: '🔩 Argos VCU chip', right: 'CPU se ~20–33× efficient (video ke mutabik)', explain: 'Problem badi aur khaas — stack khud banao.' },
        { left: '📉 Kam dekhe videos par kam formats', right: 'Long tail — mehenga kaam maang ke hisaab se', explain: 'Popular = zyada formats/cache; rare = conservative.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — transcoding pipeline',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "4K upload process hone mein 6 ghante lagte hain. Tez karo."',
        choices: [
          'Chunked parallel transcoding (GOP/scene boundaries par kaato, thoda overlap), queue se workers par; jaldi dikhane ke liye pehle chhoti resolutions publish, bhaari baad mein',
          'Bada server',
          'Resolution kam karo',
          'User ko 6 ghante wait karne do',
        ],
        answer: 0,
        explain: 'Parallelism + priority: pehle jo jaldi chahiye.',
      },
      {
        q: 'Interviewer: "AV1 har video ke liye encode karein?"',
        choices: [
          'Popular videos ke liye haan (bandwidth bachat views se guna); long tail ke liye shayad nahi — encode ka kharcha views se wapas nahi aata',
          'Haan, sab',
          'Nahi, koi nahi',
          'Sirf 8K',
        ],
        answer: 0,
        explain: 'Mehenga kaam wahan jahan maang hai.',
      },
    ],
  },
  success: [
    'Main parallel chunked transcoding aur seams ka ilaaj samjha sakta hoon',
    'Main codec choice ko compute vs bandwidth sauda ki tarah dekh sakta hoon',
    'Main long-tail ke hisaab se kaam baant sakta hoon',
  ],
  homework: `<p>Lab 21 ke <code>lib/encode-worker.js</code> mein <code>WARMUP</code> 5 se 20 karo aur transcode chalao. Bina overlap
    kitne kharab units? Overlap bhi 20 karo — extra kaam kitna %? Yahi warm-up vs overlap ka sauda hai.</p>`,
  cards: [
    { front: 'Parallel transcoding ki seam problem?', back: 'Encoder ko pados ke frames chahiye; chunk ki shuruaat thandi → quality girti. Ilaaj: overlap karo, stitch par kaato. Lab: 60 → 5 kharab units, +0.8%.' },
    { front: 'Argos VCU?', back: 'Google ka video chip: video ke mutabik ~20–33× compute-efficient; ~10 encoder cores/chip, har ek 4K real-time; 4K hours mein.' },
    { front: 'Long tail ka niyam?', back: 'Zyadatar videos kam dekhe jaate hain — popular par zyada formats/cache/optimization, rare par conservative.' },
  ],
},

/* =====================================================================
   3. yt-vitess
   ===================================================================== */
{
  id: 'yt-vitess',
  icon: '🐬',
  title: 'Vitess — boring MySQL ko planet-scale banao',
  badge: 'Vitess Vaidya',
  objectives: [
    'Metadata relational hai — MySQL ki chaar deewarein',
    'vtgate (router) aur vttablet (har MySQL ka bodyguard)',
    'Pooling, query safety, query consolidation',
    'Live resharding: pehle reads, phir writes',
  ],
  lesson: [
    `<h3>🐬 Title, views, likes, comments — sab relational</h3>
     <p>Video ki bytes GGC/storage mein, par <b>metadata</b> — title, channel, view count, likes, comments aur replies,
     playlists, subscriptions, history — sab rishton wala data hai → <b>MySQL</b> (boring, jaise Instagram par Postgres).
     Deewarein:</p>
     <ul>
       <li><b>Connections</b> — har connection memory, hazaron app servers.</li>
       <li><b>Ek machine ki chhat</b>.</li>
       <li><b>Sharding ka dard</b> — app ko pata hona chahiye kaunsa shard.</li>
       <li><b>Failover</b> — detect, promote, reroute, data na khoye, raat 3 baje page na aaye.</li>
     </ul>
     <p>YouTube ne MySQL ko nahi chhoda — uske chaaron taraf <b>Vitess</b> (Go) banaya: poora fleet app ko ek DB
     jaisa dikhe. Open source; Slack, Square, GitHub jaise log use karte hain.</p>`,
    `<h3>🚪 vtgate + 🛡️ vttablet</h3>
     <p><b>vtgate</b> = front door/router: query dekh ke batata hai kaunsa shard. <b>vttablet</b> = har MySQL ke saath
     baitha bodyguard:</p>
     <ol>
       <li><b>Pooling</b> — 10,000 app connections → ~100 asli.</li>
       <li><b>Query safety</b> — LIMIT jodna, jaane-maane bure patterns block, lambi query kill.</li>
       <li><b>Consolidation (dedup)</b> — ek jaisi SELECT pehle se chal rahi hai → nayi DB tak mat bhejo, usi ka jawab
       baanto (1,000 → 1).</li>
     </ol>
     <pre>lab 21 (ex3) — DB max_connections=500, 2,000 clients × 5 same SELECT (viral video):
seedha DB     2,400 ok, 7,600 error (too many connections), DB RSS 570 MB
vttablet     10,000 ok, 0 error, DB par sirf 20 connections aur 6 queries, RSS 69 MB
vttablet (consolidation band)  10,000 queries, 10.3 s, p50 2,048 ms
intern ki SELECT * bina LIMIT: seedha 2,001 ms DB block; vttablet ne LIMIT joda → 21 ms</pre>
     <p><b>Live resharding</b> (automated): naye shards → copy + sync rakho → verify → <b>pehle reads</b> switch →
     <b>phir writes</b> → kisi bhi kadam par wapas. (Wahi anushasan jo Dropbox ki migration mein.)</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 2,000 app connections, ek MySQL',
      project: '21-youtube',
      exercise: 'ex3-vttablet',
      goal: 'Seedha DB vs vttablet ke through: kitne errors, DB par kitne connections aur queries, memory, aur ek bina-LIMIT query ka asar.',
      why: `<code>services/db.js</code>: max_connections 500, har connection 1 MB (asli Buffer), query 20 ms, bina LIMIT comments query
        2,000 ms. <code>services/vttablet.js</code>: pool 20, consolidation, LIMIT guard. <code>CONSOLIDATE=0</code> se dedup band.`,
      steps: [
        { text: 'DB + vttablet chalao.', cmd: 'cd docker-labs/21-youtube && npm start ex3-vttablet', expect: 'ex3-vttablet\n[db] :4971 max_connections=500\n[vttablet] :4972 pool=20 consolidate=true guard=true' },
        { text: 'Seedha DB par.', cmd: 'node tools/clients.js --via direct', expect: '  app ko jawab: 2400 ok, 7600 error (E Too many connections)   latency p50 21 ms p99 36 ms\n  DB: peak connections 500, refused 1520, queries chali 2400, RSS 570 MB\n  intern ki query (bina LIMIT): jawab mila in 2001 ms  → DB par slow queries 1' },
        { text: 'vttablet ke through (naya start).', cmd: 'node tools/clients.js --via vttablet', expect: '  app ko jawab: 10000 ok, 0 error    latency p50 31 ms p99 38 ms\n  DB: peak connections 20, refused 0, queries chali 6, RSS 69 MB\n  vttablet: consolidated 9994 (DB tak gaye hi nahi), pool 20\n  intern ki query (bina LIMIT): jawab mila in 21 ms  → DB par slow queries 0 (vttablet ne LIMIT 10000 joda: 1)' },
        { text: 'Consolidation band karke.', cmd: 'CONSOLIDATE=0 npm start ex3-vttablet\nnode tools/clients.js --via vttablet', expect: 'via=vttablet  2000 clients × 5 same SELECT = 10000 queries  (10.3 s)\n  app ko jawab: 10000 ok, 0 error    latency p50 2048 ms p99 2070 ms\n  DB: peak connections 20, refused 0, queries chali 10000, RSS 79 MB' },
      ],
      observe: {
        q: 'Consolidation band karne par errors 0 rahe par p50 2 sec kyun ho gaya?',
        choices: [
          'Pool ne DB ko bachaya (20 connections), par 10,000 queries ab 20 connections ki line mein — 10,000 × 20 ms / 20 = 10 sec. Consolidation ne same query ko 1 bana ke line hi khatam kar di thi',
          'DB crash hua',
          'Network slow tha',
          'Pool chhota tha',
        ],
        answer: 0,
        explain: 'Pooling DB ko bachata hai; consolidation kaam hi kam karta hai. Viral content par dono chahiye.',
      },
      lesson: 'Boring DB ke saamne ek smart bodyguard: pool, dedup, aur galat query ka rok.',
    },
    {
      type: 'order',
      title: 'Live resharding ke kadam',
      instructions: 'Ek shard ko do mein todna hai, bina downtime. Sahi order?',
      steps: [
        { text: 'Naye target shards banao', explain: 'Khaali ghar pehle.' },
        { text: 'Data copy + lagatar sync (binlog/stream) chalu', explain: 'Copy ke dauraan aaye writes bhi pahunchte rahein.' },
        { text: 'Verify — row counts/checksums milao', explain: 'Bina saboot ke switch = umeed.' },
        { text: 'Pehle READS naye shards par', explain: 'Reads galat ho toh wapas lena aasaan — data nahi bigadta.' },
        { text: 'Phir WRITES naye shards par', explain: 'Sabse risky kadam aakhir mein, jab reads se bharosa ban chuka ho.' },
        { text: 'Purana shard kuch din rakho, phir hatao', explain: 'Wapas jaane ka raasta khula rakho.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — scaling MySQL',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Viral video par ek hi row ki SELECT 50,000/sec aa rahi hai."',
        choices: [
          'Query consolidation (in-flight dedup) proxy par + cache; pool DB connections ko bounded rakhe — 50,000 identical requests DB par kuch hi queries banein',
          'Read replicas 50 kar do',
          'DB ko bada karo',
          'Rate limit users',
        ],
        answer: 0,
        explain: 'Lab: 10,000 identical → 6 DB queries.',
      },
      {
        q: 'Interviewer: "Resharding mein pehle writes switch karein?"',
        choices: [
          'Nahi — pehle reads (galat ho toh bina data bigaade wapas), phir writes; har kadam par rollback raasta',
          'Haan, writes pehle',
          'Dono ek saath',
          'Downtime lekar',
        ],
        answer: 0,
        explain: 'Sabse kam risk wala kadam pehle.',
      },
    ],
  },
  success: [
    'Main MySQL ki chaar deewarein aur Vitess ka jawab samjha sakta hoon',
    'Main pooling, query safety aur consolidation ka alag-alag asar lab se bata sakta hoon',
    'Main live resharding ke kadam sahi order mein bata sakta hoon',
  ],
  homework: `<p>Apne DB ke top 5 queries (by count) nikaalo. Kya koi ek hi query same parameters ke saath ek second mein
    sainkdon baar aati hai? Wahan consolidation ya cache kitna bachayega? Aur kya koi query bina LIMIT ke chal sakti hai?</p>`,
  cards: [
    { front: 'vtgate vs vttablet?', back: 'vtgate = router (kaunsa shard). vttablet = har MySQL ka bodyguard: pooling, query safety (LIMIT, kill), consolidation.' },
    { front: 'Lab 21: 2,000 clients seedha vs vttablet?', back: 'Seedha: 7,600 errors, 570 MB. vttablet: 0 errors, DB par 20 connections, 10,000 requests → 6 queries, 69 MB.' },
    { front: 'Live resharding ka order?', back: 'Naye shards → copy + sync → verify → pehle reads → phir writes → purana kuch din rakho.' },
  ],
},

/* =====================================================================
   4. yt-deliver
   ===================================================================== */
{
  id: 'yt-deliver',
  icon: '🌐',
  title: 'Duniya bhar mein order, aur ISP ke andar video',
  badge: 'TrueTime Tapasvi',
  objectives: [
    'Ghadiyan kyun jhooth bolti hain — order ki problem',
    'Spanner TrueTime aur commit wait',
    'Google Global Cache: ISP ke andar cache, push vs pull',
    'QUIC aur paanch sabak',
  ],
  lesson: [
    `<h3>⏰ Kisne pehle likha?</h3>
     <p>Riya ne pehle ex ko apni photos ki list (ACL) se hataya (Frankfurt DC), phir nayi photo daali (Mumbai DC).
     Sach mein pehla kaam pehle hua. Par agar Mumbai ki ghadi 15 ms peeche hai, toh photo ka timestamp ACL wale se
     <b>chhota</b> — kisi snapshot mein photo dikhe aur ex abhi bhi list mein. Ghadiyan ms tak khisakti hain; NTP ke
     baad bhi ~100 ms tak ka farq reh sakta hai → timestamp se order tay nahi kar sakte.</p>
     <h3>⌛ TrueTime + commit wait</h3>
     <p>Spanner ke data centers mein atomic clocks + GPS. TrueTime ek number nahi, ek <b>interval</b> deta hai:
     [earliest, latest] (kuch ms). <b>Commit wait</b>: commit ko tab tak "done" mat bolo jab tak uncertainty beet na
     jaaye → baad mein kahin bhi hone wala write <b>pakka</b> bada timestamp paayega. Keemat: har write par kuch ms.
     Video: Google ne <b>physics badal di</b> (jaise apna chip); baaki logon ne software mein nakal ki.</p>
     <pre>lab 21 (ex4) — 10,000 jode (T1 phir T2, alag DCs):
NTP ghadi, seedha timestamp        3,973 ulte (39.7%)   extra wait 0
NTP ghadi, chhoti skew (±10 ms)    1,398 ulte (14.0%)   0
TrueTime (±7 ms) + commit wait         0              14 ms/write
NTP-size ε (±50 ms) + commit wait      0             100 ms/write</pre>`,
    `<h3>🏠 Google Global Cache — ISP ke andar</h3>
     <p>Cache servers <b>ISPs ke andar</b> — 1,300+ shehar, 200+ desh. Popular videos pehle se <b>push</b>; kam dekhe
     videos pehli request par <b>pull</b> (miss → upar ke bade cache se → copy rakh lo). ISP ka faayda: bahar ka
     transit mehenga, andar ka traffic sasta → "offload", dono jeete. Popular par hit rate ~98–99%. YouTube ka server
     tumhara IP/ISP dekh ke tumhe tumhare ISP ke cache par bhejta hai.</p>
     <h3>🚀 QUIC</h3>
     <p>TCP mein ek packet khoya toh peeche ke sab ruke (head-of-line blocking) — kamzor mobile par dard. QUIC (→ HTTP/3)
     mein streams alag chalte hain aur connection jaldi banta hai → video jaldi shuru; Google ne rebuffering mein bada
     giraav report kiya.</p>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Mehenga kaam ek baar — common path sasta.</li>
       <li>Boring tools scale karte hain agar tum unke chaaron taraf banao (MySQL + Vitess).</li>
       <li>Pooling, query safety, duplicate kaam jodo.</li>
       <li>Problem badi aur khaas ho toh stack khud banao (VCU, atomic clocks).</li>
       <li>Planet scale ka sabse mushkil kaam: <b>order par sehmati</b> — hardware + latency se chukao, ya consistency chhodo.</li>
     </ol>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — TrueTime vs NTP',
      project: '21-youtube',
      exercise: 'ex4',
      goal: '10,000 jode writes alag DCs mein — kitne "ulte order" aur commit wait ki keemat kitni?',
      why: `<code>tools/truetime.js</code>: har DC ki ghadi random aage/peeche. Violation = baad wale write ka timestamp pehle wale se
        chhota. Commit wait = TT.now().latest par timestamp, phir tab tak ruko jab tak TT.now().earliest usse aage na nikle.`,
      steps: [
        { text: 'Simulation chalao.', cmd: 'cd docker-labs/21-youtube && node tools/truetime.js', expect: 'NTP ghadi, seedha timestamp                3973 (39.7%)            0\nNTP ghadi, chhoti skew (±10 ms)            1398 (14.0%)            0\nTrueTime (±7 ms) + commit wait                0 (0.0%)            14.0 ms\nNTP-size ε (±50 ms) + commit wait             0 (0.0%)            100.0 ms' },
        { text: 'Ek asli misaal dekho.', cmd: 'node tools/truetime.js | grep -A1 Misaal', expect: 'Misaal: T1 (Frankfurt) ts=1369.9, T2 (Mumbai) ts=1359.7 — asli mein T2 16.5 ms BAAD hua,\n        par timestamp kehta hai PEHLE. Snapshot ts=1364.8 par: photo dikhi, ex abhi bhi ACL mein.' },
      ],
      observe: {
        q: 'NTP-size ε ke saath bhi commit wait ne 0 violations diye. Toh atomic clocks kyun?',
        choices: [
          'Correctness dono mein, par keemat ε ke saath badhti hai — NTP ε par har write 100 ms mehenga, TrueTime par ~14 ms. Atomic clocks ne wait chhota kiya',
          'NTP wala galat hai',
          'Atomic clocks tez compute karte hain',
          'Zaroorat nahi thi',
        ],
        answer: 0,
        explain: 'Commit wait = 2ε. ε chhota karna hi asli jaadu hai.',
      },
      lesson: 'Order ki guarantee ki keemat ghadi ki uncertainty ke barabar hai — use hardware se ghatao.',
    },
    {
      type: 'quiz',
      title: 'Delivery ki samajh',
      questions: [
        {
          q: 'ISP apne network ke andar Google ka cache kyun lagne deta hai?',
          choices: [
            'Bahar ka transit mehenga hai, andar ka traffic sasta — video andar se aaye toh ISP ka paisa bachta hai, user ko speed milti hai',
            'Google paise deta hai',
            'Kanoon hai',
            'Security ke liye',
          ],
          answer: 0,
          explain: 'Dono ka faayda = offload. Isi liye 1,300+ shehar.',
        },
        {
          q: 'Kam dekhe videos ke liye GGC kya karta hai?',
          choices: [
            'Pull — pehli request par miss, upar ke bade cache se laao aur copy rakh lo; popular pehle se push',
            'Kabhi cache nahi karta',
            'Sab pehle se push',
            'User ko origin par bhejta hai hamesha',
          ],
          answer: 0,
          explain: 'Push jahan maang pakki, pull jahan anishchit — long tail ka hisaab.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — global consistency',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Multi-region DB mein writes ko timestamp se order karenge. Theek?"',
        choices: [
          'Sirf ghadiyon par bharosa karke nahi — skew se ulte order; ya bounded-uncertainty clocks + commit wait (Spanner), ya hybrid logical clocks / consensus se order',
          'Haan, NTP kaafi hai',
          'Server ki ghadi hamesha sahi hoti hai',
          'Timestamps UTC mein hon toh theek',
        ],
        answer: 0,
        explain: 'Lab: NTP ±50 ms par 39.7% ulte.',
      },
      {
        q: 'Interviewer: "Video start time kam karna hai mobile par."',
        choices: [
          'Edge/ISP caches (kam RTT), QUIC (tez handshake, no HOL blocking), aur pehle chhoti resolution se shuru karke adaptive bitrate',
          'Bada server',
          'Video compress karo zyada',
          'Pehle poora download',
        ],
        answer: 0,
        explain: 'Paas + tez handshake + chhota pehla tukda.',
      },
    ],
  },
  success: [
    'Main ghadiyon ki problem aur TrueTime commit wait samjha sakta hoon',
    'Main GGC ka push/pull aur ISP ka faayda bata sakta hoon',
    'Main YouTube ke paanch sabak apne system par laga sakta hoon',
  ],
  homework: `<p>Apne system mein koi jagah dhoondho jahan "kaunsa pehle hua" timestamp se tay hota hai (last-write-wins,
    event ordering, audit log). Do machines ki ghadi 50 ms alag ho toh kya galat ho sakta hai? Ek misaal likho.</p>`,
  cards: [
    { front: 'TrueTime commit wait?', back: 'Ghadi interval deti hai [earliest, latest]; commit ko tab tak "done" mat bolo jab tak uncertainty beet na jaaye → baad ka write pakka bada timestamp. Lab: 39.7% ulte → 0, keemat ~14 ms/write.' },
    { front: 'Google Global Cache?', back: 'ISPs ke andar cache (1,300+ shehar); popular push, rare pull; ISP ka transit bachta hai; popular par ~98–99% hit.' },
    { front: 'QUIC ka faayda?', back: 'Streams alag — ek packet khoya toh sab nahi rukte (TCP HOL nahi); tez connection setup → video jaldi shuru.' },
  ],
},
]);

})();
