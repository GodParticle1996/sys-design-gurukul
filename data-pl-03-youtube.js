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
  html: "\n    <div class=\"dg-flow\">\n      <span class=\"dg-pill\">📱 upload (10–50 MB chunks, resumable)</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill\">🌐 paas ka Google edge</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill acc\">📬 queue</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill gold\">⚙️ transcode ladder</span><span class=\"dg-arrow\">→</span>\n      <span class=\"dg-pill good\">📦 dozens of files, ISP ke paas</span>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-grid\">\n      <div class=\"dg-node\"><span class=\"ni\">📐</span><span class=\"nl\">9 resolutions</span><span class=\"ns\">144p … 1080p … 4K … 8K</span></div>\n      <div class=\"dg-node\"><span class=\"ni\">🎞️</span><span class=\"nl\">× 3 codecs</span><span class=\"ns\">H. 264 (purane phones), VP9, AV1</span></div>\n      <div class=\"dg-node is-good\"><span class=\"ni\">▶️</span><span class=\"nl\">Play dabana</span><span class=\"ns\">lagbhag muft — sab pehle se bana, pehle se paas</span></div>\n    </div>",
};

VISUALS['yt-transcode'] = {
  t: '2 ghante ki movie, 12 machines',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">🐢 Ek machine</span>\n        <div class=\"dg-cap\">Poori movie ek ke baad ek. Lab: 2.20 s (toy units); VP9 (~5× CPU) 10.84 s.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">⚡ 10-min chunks, 12 machines</span>\n        <div class=\"dg-cap\">Lab: 0.25 s (8.8× tez). Seams par encoder ko pichhle frames chahiye → chunks ko thoda\n          <b>overlap</b> karo, stitch par kaat do: kharab units 60 → 5, kharcha +0.8%.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-cap\">Aur jab CPU bhi kam pade: Google ka apna chip — <b>Argos VCU</b> (~2015 ke baad): video ke mutabik ~20–33× compute-efficient,\n      4K hours mein, din mein nahi.</div>",
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
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">⏱️ Spanner TrueTime</span>\n        <div class=\"dg-cap\">Ghadi ek interval deti hai [earliest, latest] (kuch ms). <b>Commit wait</b>: uncertainty khatam hone tak\n          \"done\" mat bolo → baad wala write hamesha bada timestamp. Lab: NTP 39.7% ulta order; TrueTime 0%, keemat ~14 ms/write.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🏠 Google Global Cache</span>\n        <div class=\"dg-cap\">Cache servers ISPs ke ANDAR, 1,300+ shehar. Popular pehle se push, kam-dekhe pehli request par pull.\n          ISP ka faayda: bahar ka transit bachta hai. Popular par hit rate ~98–99%.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-cap\">Aur aakhri meter: <b>QUIC</b> (HTTP/3) — TCP ka head-of-line blocking nahi, connection jaldi → video jaldi shuru.</div>",
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
    "<h3>🍛 Shaadi ka khaana</h3>\n     <p>Shaadi mein khaana ek baar, subah se, bade bartano mein banta hai — taaki 500 mehmaan aayein toh bas parosna ho.\n     YouTube bhi yahi karta hai: roz ~1 arab ghante dekhe jaate hain, ~500 ghante video <b>har minute</b> upload hota\n     hai. Mushkil kaam delivery nahi, <b>upload ke baad</b> ka hai. Siddhant: <b>compute once, serve forever</b> —\n     saara bhaari kaam upload par, taaki \"play\" dabana lagbhag muft ho (bytes pehle se bane, pehle se paas).</p>\n     <h3>📱 Kamzor link, badi file</h3>\n     <p>Client file ko ~10–50 MB ke <b>chunks</b> mein kaatta hai → <b>resumable</b> upload (toota sirf wahi chunk\n     dobara) → sabse paas ka Google edge → storage mein jodo → queue mein message → worker pool job uthata hai.</p>\n     <pre>lab 21 (link average 30 MB par toot-ta hai, 5 trials):\n64 MB:  blob     link par average 209 MB (3.3× file), kabhi 1.2×, kabhi 6.5×\n        chunked  link par 67 MB (1.0×), hamesha\n256 MB: blob     40 koshish, 1,032 MB bheje — PHIR BHI poora nahi ❌\n        chunked  275 MB (1.1×), 7.6 s ✅</pre>",
    "<h3>🪜 Transcode ladder</h3>\n     <p>Ek upload, ek format. Dekhne wale: 4K TV gigabit par … 6 saal purana Android 3G par … laptop … smart fridge.\n     Isliye ek 8K upload se:</p>\n     <ul>\n       <li><b>~9 resolutions</b>: 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p (4K), 4320p (8K)</li>\n       <li><b>× codecs</b>: H. 264 (purane devices), VP9, AV1</li>\n       <li><b>+ audio tracks</b> → darjanon files</li>\n     </ul>\n     <p>Codec ka sauda: behtar compression = zyada compute. Video ke mutabik VP9 encode ~5× H. 264 ka compute, aur AV1\n     VP9 se ~30% aur chhota par encode aur bhi bhaari. Bandwidth (har view par) bachane ke liye compute (ek baar)\n     kharch karo — kyunki view karodon baar hote hain.</p>\n     <p class=\"tip\">🎯 <b>Asymmetry</b>: mehenga kaam ek baar, sasta kaam karodon baar. Jahan \"ek baar\" aur \"karodon\n     baar\" ka farq ho, us data ka kaam pehle karo.</p>",
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
          'Link ~30 MB par toot-ta hai — 256 MB ek baar mein bina toote jaana lagbhag namumkin, har baar shuru se',
          'Server ne har sahi chunk ko reject kiya, isliye 40 koshishon mein bhi file poori nahi hui',
          'File ka format pakka kharab tha — kharab file kitni bhi baar bhejo, poori nahi hogi',
          '40 se zyada koshishein karo toh poora hona pakka — retries badhao, file jaldi poori',
        ],
        answer: 0,
        explain: "Chance ≈ e^(−256/30) ≈ 0.02%. Chunks mein har tukde ka chance ~87% — aur toota sirf wahi dobara.",
        choiceExplanations: [
          'Chance ≈ e^(−256/30) ≈ 0.02%. Chunks mein har tukde ka chance ~87% — aur toota sirf wahi dobara.',
          'Server ne kuch reject nahi kiya — link beech mein toota.',
          'File theek thi — chunks mein wahi file poori pahunchi.',
          'Har koshish ka chance 0.02% hi rehta hai. 1,000 koshishon mein bhi kul chance sirf ~18%, aur har koshish 256 MB phoonkti hai.',
        ],
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
          steps: ["7,20,000 × 27 ≈ 1.94 crore", 'Roz ~2 crore ghante ka encode'],
          lesson: 'CPU se itna encode mehenga — isi liye Google ne apna video chip (Argos VCU) banaya.',
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
          'Resumable chunks — server batata kaunse aa gaye, toota chunk hi dobara, aakhir mein hash jaancho',
          'Timeout ko aur lamba kar do — lambe timeout mein toota link bhi upload poora kar lega',
          'Upload compress karo — chhoti file aadhe raaste nahi tootegi, resume ki zaroorat nahi',
          'Har loss par poori file shuru se bhejo — retries mein bytes ka kharcha kuch khaas nahi badhta',
        ],
        answer: 0,
        explain: 'Lab: 256 MB blob 40 koshishon mein ek baar bhi poora nahi; chunks 1.1× bytes mein poore. Resume se pehle pahunche chunks bach jaate hain — retry, hash aur expiry ke niyam saaf rakho.',
        choiceExplanations: [
          'Lab: 256 MB blob 40 koshishon mein ek baar bhi poora nahi; chunks 1.1× bytes mein poore. Resume se pehle pahunche chunks bach jaate hain — retry, hash aur expiry ke niyam saaf rakho.',
          'Timeout toote connection ko nahi jodta.',
          'Chhoti file bhi beech mein toot sakti hai.',
          'Har nayi koshish poore 256 MB phir bhejti hai. Lab mein 40 koshishein, ek bhi poori nahi — bytes ka dher lag gaya.',
        ],
      },
      {
        q: 'Interviewer: "Video ko play time par transcode karein (on-the-fly)? Storage bachega."',
        choices: [
          'Popular videos ke liye nahi — encode ek baar, view karodon baar; long tail ke kuch formats lazy',
          'Har video ke har format ko upload par hi bana do — storage ki fikar hi nahi',
          'Har view par wahi content dobara encode karo — storage bachega, CPU ka sawaal nahi',
          'Sirf storage ka daam policy tay kare — storage sasta toh sab pehle, mehenga toh sab lazy',
        ],
        answer: 0,
        explain: 'Long tail: kam dekhe videos par mehenga kaam kam karo; popular par sab pehle. On-the-fly har view par CPU aur latency.',
        choiceExplanations: [
          'Long tail: kam dekhe videos par mehenga kaam kam karo; popular par sab pehle. On-the-fly har view par CPU aur latency.',
          'Kam dekhe videos ke har format ka kharcha kabhi wapas nahi aata.',
          'Karodon views par baar-baar encode bahut mehenga hai.',
          'CPU, latency aur views bhi policy ka hissa hain.',
        ],
      },
    ],
  },
  success: [
    'Main compute-once-serve-forever asymmetry samjha sakta hoon',
    'Main resumable chunked upload design kar sakta hoon',
    'Main transcode ladder aur codec ka compute/bandwidth sauda bata sakta hoon',
  ],
  homework: `<p>Apne system mein ek "karodon baar padha, ek baar likha" wala data dhoondho (product page, report, thumbnail,
    config). Kya data ka bhaari kaam har read par hota hai? Likho: agar data likhte waqt pehle se bana diya jaaye toh
    har read par kitna bachega.</p>`,
  cards: [
    { front: 'YouTube ka siddhant?', back: 'Compute once, serve forever — saara bhaari kaam upload par (chunks, transcode, placement), taaki play dabana lagbhag muft ho.' },
    { front: 'Resumable upload?', back: "10–50 MB chunks; toota sirf wahi chunk dobara. Lab: 64 MB blob avg 3.3× bytes, chunks 1.0×; 256 MB blob 40 koshish mein bhi fail." },
    { front: 'Transcode ladder?', back: "~9 resolutions (144p…8K) × codecs (H. 264, VP9, AV1) + audio → darjanon files. VP9 ~5× H. 264 compute (video ke mutabik)." },
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
    "<h3>🧵 Ek darzi vs 12 darzi</h3>\n     <p>2 ghante ki movie ek machine par encode karo toh ghanton. Isliye: movie ko ~10-min <b>chunks</b> mein kaato,\n     12 machines par ek saath, phir <b>order mein jodo</b>.</p>\n     <p>Dikkat: encoder ko <b>pados ke frames</b> chahiye (rate control, lookahead). Chunk ki shuruaat mein encoder \"thanda\"\n     hota hai → seams par quality girti hai. Ilaaj: chunks thoda <b>overlap</b> karo — pichhle chunk ke kuch frames bhi\n     encode karo taaki encoder garam ho, phir stitch par extra frames kaat do.</p>\n     <pre>lab 21 (ex2) — 7,200 units (1 unit = 1 sec video), asli CPU burn, 14-core laptop:\nH. 264   1 machine                 2.20 s     kharab units    5\nH. 264  12 machines, no overlap    0.25 s     kharab units   60   ← har seam par 5\nH. 264  12 machines, overlap 5     0.24 s     kharab units    5   (+55 units extra = +0.8%)\nVP9     1 machine                10.84 s\nVP9    12 machines, overlap 5     1.09 s</pre>",
    `<h3>🔩 Jab CPU bhi kam pade — apna chip</h3>
     <p>~2015 ke baad Google ne <b>Argos VCU</b> (video coding unit) banaya: video ke mutabik ~20–33× zyada
     compute-efficient (design aur banane ka kharcha jod ke); ek chip mein ~10 encoder cores, har ek 4K real-time;
     ek card par 2 chips (GPU jaisa). Ek analysis ke mutabik ~1 crore CPUs jitna kaam. 4K ab ghanton mein, dinon
     mein nahi. (Dropbox ne storage ke liye yahi kiya — jab problem badi aur khaas ho, stack khud banao.)</p>
     <h3>📉 Long tail</h3>
     <p>Zyadatar videos bahut kam dekhe jaate hain. Mehenga kaam sirf maang wali videos par karo: popular videos ko zyada
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
          'Movie ki sabse pehli shuruaat — pehle koi frame hi nahi jisse encoder garam ho',
          'Saare distributed chunks kharab ho gaye the — overlap ne sirf kuch bachaye',
          'Har worker ki ghadi aage-peechhe thi, isliye 5 units ki timing galat ho gayi',
          'Stitching mein hamesha artifacts aate hain — chahe overlap kitna bhi ho',
        ],
        answer: 0,
        explain: "Baaki 11 seams overlap ne theek kiye; 60 → 5, sirf +0.8% extra encode.",
        choiceExplanations: [
          'Baaki 11 seams overlap ne theek kiye; 60 → 5, sirf +0.8% extra encode.',
          '60 mein se 55 theek hue — saare kharab nahi.',
          'Lab mein ghadi ka koi role nahi.',
          'Overlap ne 11 seams ke artifacts hata diye.',
        ],
      },
      lesson: 'Parallel karo, seams ki keemat thode extra kaam se chukao.',
    },
    {
      type: 'match',
      title: 'Faisla aur faisle ki wajah',
      instructions: 'Har faisle ko sahi wajah se jodo.',
      pairs: [
        { left: '✂️ Movie ko 10-min chunks mein', right: '12 machines ek saath — ghanton ki jagah minute', explain: "Lab: 8.8× tez." },
        { left: '🔁 Chunks mein thoda overlap', right: 'Seams par encoder garam — glitch nahi', explain: "Lab: 60 → 5 kharab units, +0.8% kaam." },
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
          'Chunked parallel transcode (GOP par kaato, overlap); chhoti resolutions pehle',
          'Hamesha ek bada worker rakho — bada server akela 4K ko jaldi khatam kar dega',
          'Sirf maximum resolution ghata do — 4K hi nahi toh 6 ghante ka sawaal nahi',
          'Adhoora, kharab output turant publish kar do — user ko jaldi kuch toh dikhe',
        ],
        answer: 0,
        explain: 'Parallelism + priority: pehle jo jaldi chahiye. Queue se workers par.',
        choiceExplanations: [
          'Parallelism + priority: pehle jo jaldi chahiye. Queue se workers par.',
          'Ek bade worker ki bhi chhat hai — parallel tukde zyada tez.',
          'Users 4K maangte hain — feature kaatna ilaaj nahi.',
          'Kharab output user ka bharosa todta hai.',
        ],
      },
      {
        q: 'Interviewer: "AV1 har video ke liye encode karein?"',
        choices: [
          'Popular par haan (bachat views se guna); long tail par shayad nahi',
          'Har video ko abhi har codec chahiye — AV1 bhi sabke liye turant banao',
          'Sirf pixel count economics tay karta hai — 8K ho toh AV1 banao, warna kabhi nahi',
          'Long-tail videos par AV1 namumkin hai — kam views wale videos AV1 mein encode hi nahi hote',
        ],
        answer: 0,
        explain: 'Mehenga kaam sirf us video par jahan maang hai.',
        choiceExplanations: [
          'Mehenga kaam sirf us video par jahan maang hai.',
          'Kam views par AV1 ka mehenga encode wapas nahi aata.',
          'Views aur delivery ka kharcha pixel count se zyada maayne rakhta hai.',
          'Mumkin hai — bas aksar faayde ka nahi.',
        ],
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
    { front: 'Parallel transcoding ki seam problem?', back: "Encoder ko pados ke frames chahiye; chunk ki shuruaat thandi → quality girti. Ilaaj: overlap karo, stitch par kaato. Lab: 60 → 5 kharab units, +0.8%." },
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
     <p>YouTube ne MySQL ko nahi chhoda — MySQL ke chaaron taraf <b>Vitess</b> (Go) banaya: poora fleet app ko ek DB
     jaisa dikhe. Open source; Slack, Square, GitHub jaise log use karte hain.</p>`,
    "<h3>🚪 vtgate + 🛡️ vttablet</h3>\n     <p><b>vtgate</b> = front door/router: query dekh ke batata hai kaunsa shard. <b>vttablet</b> = har MySQL ke saath\n     baitha bodyguard:</p>\n     <ol>\n       <li><b>Pooling</b> — 10,000 app connections → ~100 asli.</li>\n       <li><b>Query safety</b> — LIMIT jodna, jaane-maane bure patterns block, lambi query kill.</li>\n       <li><b>Consolidation (dedup)</b> — ek jaisi SELECT pehle se chal rahi hai → nayi DB tak mat bhejo, chalti query ka jawab\n       baanto (1,000 → 1).</li>\n     </ol>\n     <pre>lab 21 (ex3) — DB max_connections=500, 2,000 clients × 5 same SELECT (viral video):\nseedha DB     2,400 ok, 7,600 error (too many connections), DB RSS 570 MB\nvttablet     10,000 ok, 0 error, DB par sirf 20 connections aur 6 queries, RSS 69 MB\nvttablet (consolidation band)  10,000 queries, 10.3 s, p50 2,048 ms\nintern ki SELECT * bina LIMIT: seedha 2,001 ms DB block; vttablet ne LIMIT joda → 21 ms</pre>\n     <p><b>Live resharding</b> (automated): naye shards → copy + sync rakho → verify → <b>pehle reads</b> switch →\n     <b>phir writes</b> → kisi bhi kadam par wapas. (Wahi anushasan jo Dropbox ki migration mein.)</p>",
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
          'Pool ne DB bachaya (20 connections), par 10,000 queries 20 ki line mein khadi — line lambi',
          'Pool ka matlab saari queries turant chalti hain — p50 2 sec network ki wajah se tha',
          'Connection limit hi overload ka ilaaj saabit hai — p50 2 sec theek nateeja hai',
          'Ek jaisi reads ko jodna namumkin hai — isliye consolidation ka koi faayda nahi tha',
        ],
        answer: 0,
        explain: 'Pool DB ki concurrency baandhta hai, duplicate query demand nahi hata-ta. Queue ka delay aane aur service ke pattern par nirbhar hai; 10,000 × 20 ms / 20 = 10 s poori line khaali hone ka ideal waqt hai, p50 ka seedha formula nahi. Consolidation same query ko 1 bana ke line hi khatam kar deta tha.',
        choiceExplanations: [
          'Pool DB ki concurrency baandhta hai, duplicate query demand nahi hata-ta. Queue ka delay aane aur service ke pattern par nirbhar hai; 10,000 × 20 ms / 20 = 10 s poori line khaali hone ka ideal waqt hai, p50 ka seedha formula nahi. Consolidation same query ko 1 bana ke line hi khatam kar deta tha.',
          'Pool sirf 20 ko saath chalne deta hai — baaki line mein.',
          'Errors 0 the, par 2 sec p50 users ke liye bura hai.',
          'Consolidation ne hi ek jaisi queries jodi thi.',
        ],
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
          'Proxy par in-flight dedup + cache, aur pool DB connections ko bounded rakhe',
          'Sirf replicas badhao — 50 replicas par wahi query baant do, dedup ki zaroorat nahi',
          'Har request ka timeout badha do — lamba timeout 50,000/sec bhi sambhal lega',
          'Popular video ke saare users ko rok do — viral video par bheed hi nahi aayegi',
        ],
        answer: 0,
        explain: 'Lab: 10,000 ek jaisi requests → sirf 6 DB queries.',
        choiceExplanations: [
          'Lab: 10,000 ek jaisi requests → sirf 6 DB queries.',
          'Replicas wahi kaam baar-baar karte hain — dedup sasta hai.',
          'Timeout se DB par bojh kam nahi hota.',
          'Viral video product ki jeet hai — users rokna galat.',
        ],
      },
      {
        q: 'Interviewer: "Resharding mein pehle writes switch karein?"',
        choices: [
          'Nahi — pehle replicas jaancho, reads switch, phir gated writes; har kadam rollback',
          'Haan — writes pehle switch karo, replication jaanchna baad mein, jaldi khatam',
          'Dono raaste ek saath badal do — reads aur writes saath, rollback ki zaroorat nahi',
          'Koi bhi read result sahi aaya toh parity pakki — ek read sahi toh saara data sahi',
        ],
        answer: 0,
        explain: 'Sabse kam risk wala kadam pehle: reads galat hon toh bina data bigaade wapas aa sakte ho.',
        choiceExplanations: [
          'Sabse kam risk wala kadam pehle: reads galat hon toh bina data bigaade wapas aa sakte ho.',
          'Bina jaanche writes switch karna data ko do jagah bata deta hai.',
          'Ek saath dono badle aur galat hua toh wapas aana mushkil.',
          'Ek read sample hai — poori parity ka saboot nahi.',
        ],
      },
    ],
  },
  success: [
    'Main MySQL ki chaar deewarein aur Vitess ka jawab samjha sakta hoon',
    'Main pooling, query safety aur consolidation ka alag-alag asar lab se bata sakta hoon',
    'Main live resharding ke kadam sahi order mein bata sakta hoon',
  ],
  homework: `<p>Apne DB ke top 5 queries (by count) nikaalo. Kya koi ek hi query same parameters ke saath ek second mein
    sainkdon baar aati hai? Aisi query par consolidation ya cache kitna bachayega? Aur kya koi query bina LIMIT ke chal sakti hai?</p>`,
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
    "<h3>⏰ Kisne pehle likha?</h3>\n     <p>Riya ne pehle ex ko apni photos ki list (ACL) se hataya (Frankfurt DC), phir nayi photo daali (Mumbai DC).\n     Sach mein pehla kaam pehle hua. Par agar Mumbai ki ghadi 15 ms peeche hai, toh photo ka timestamp ACL wale se\n     <b>chhota</b> — kisi snapshot mein photo dikhe aur ex abhi bhi list mein. Ghadiyan ms tak khisakti hain; NTP ke\n     baad bhi ~100 ms tak ka farq reh sakta hai → timestamp se order tay nahi kar sakte.</p>\n     <h3>⌛ TrueTime + commit wait</h3>\n     <p>Spanner ke data centers mein atomic clocks + GPS. TrueTime ek number nahi, ek <b>interval</b> deta hai:\n     [earliest, latest]. Replication/transaction protocol ke saath <b>commit wait</b> timestamp ke liye\n     <code>TT.after(commit_timestamp)</code> enforce karta hai. Wait replication work se overlap ho sakta hai;\n     lab ka fixed2-epsilon cost ek simplified model hai, every real write ka latency formula nahi.</p>\n     <pre>lab 21 (ex4) — 10,000 jode (T1 phir T2, alag DCs):\nNTP ghadi, seedha timestamp        3,973 ulte (39.7%)   extra wait 0\nNTP ghadi, chhoti skew (±10 ms)    1,398 ulte (14.0%)   0\nTrueTime (±7 ms) + commit wait         0              14 ms/write\nNTP-size ε (±50 ms) + commit wait      0             100 ms/write</pre>",
    `<h3>🏠 Google Global Cache — ISP ke andar</h3>
     <p>Cache servers <b>ISPs ke andar</b> — 1,300+ shehar, 200+ desh. Popular videos pehle se <b>push</b>; kam dekhe
     videos pehli request par <b>pull</b> (miss → upar ke bade cache se → copy rakh lo). ISP ka faayda: bahar ka
     transit mehenga, andar ka traffic sasta → "offload", dono jeete. Popular par hit rate ~98–99%. YouTube ka server
     tumhara IP/ISP dekh ke tumhe tumhare ISP ke cache par bhejta hai.</p>
     <h3>🚀 QUIC</h3>
     <p>TCP loss same connection ke later bytes ko block kar sakta hai. QUIC (HTTP/3) cross-stream transport blocking avoid karta hai;
     same ordered stream ke missing bytes phir bhi wait karwa sakte hain. Handshake/resumption benefit network conditions par measure karo.</p>
     <h3>📋 Paanch sabak</h3>
     <ol>
       <li>Mehenga kaam ek baar — common path sasta.</li>
       <li>Boring tools scale karte hain agar tum boring tools ke chaaron taraf banao (MySQL + Vitess).</li>
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
        chhota. Commit wait = TT.now().latest par timestamp, phir tab tak ruko jab tak TT.now().earliest timestamp se aage na nikle.`,
      steps: [
        { text: 'Simulation chalao.', cmd: 'cd docker-labs/21-youtube && node tools/truetime.js', expect: 'NTP ghadi, seedha timestamp                3973 (39.7%)            0\nNTP ghadi, chhoti skew (±10 ms)            1398 (14.0%)            0\nTrueTime (±7 ms) + commit wait                0 (0.0%)            14.0 ms\nNTP-size ε (±50 ms) + commit wait             0 (0.0%)            100.0 ms' },
        { text: 'Ek asli misaal dekho.', cmd: 'node tools/truetime.js | grep -A1 Misaal', expect: 'Misaal: T1 (Frankfurt) ts=1369.9, T2 (Mumbai) ts=1359.7 — asli mein T2 16.5 ms BAAD hua,\n        par timestamp kehta hai PEHLE. Snapshot ts=1364.8 par: photo dikhi, ex abhi bhi ACL mein.' },
      ],
      observe: {
        q: 'NTP-size ε ke saath bhi commit wait ne 0 violations diye. Toh atomic clocks kyun?',
        choices: [
          'Sahi dono mein; wait ε ke saath badhta — NTP ε par 100 ms, TrueTime par ~14 ms',
          'NTP ka naam hi clock bound ka saboot hai — atomic clocks sirf dikhawe ke liye',
          'Atomic clocks hone se Paxos jaise consensus ki zaroorat hi khatam ho jaati hai',
          'Har commit hamesha theek 2ε wait karta hai — clock badlo toh bhi wait wahi',
        ],
        answer: 0,
        explain: 'Lab maane gaye ε bounds ka wait cost milati hai. Spanner TT.after(commit timestamp) aur replication/transaction protocol use karta hai; asli wait hamesha theek 2ε nahi, aur NTP ka naam trusted bound ki guarantee nahi.',
        choiceExplanations: [
          'Lab maane gaye ε bounds ka wait cost milati hai. Spanner TT.after(commit timestamp) aur replication/transaction protocol use karta hai; asli wait hamesha theek 2ε nahi, aur NTP ka naam trusted bound ki guarantee nahi.',
          'Bound pe bharosa chahiye — NTP ka naam kaafi nahi.',
          'Spanner Paxos bhi chalata hai — clock consensus ki jagah nahi.',
          'Wait ε par nirbhar hai — chhota ε, chhota wait.',
        ],
      },
      lesson: 'Verified uncertainty bounds commit-wait budget shape karti hain. Real wait transaction/replication work se overlap ho sakta hai; lab fixed wait ek simplification hai.',
    },
    {
      type: 'quiz',
      title: 'Delivery ki samajh',
      questions: [
        {
          q: 'ISP apne network ke andar Google ka cache kyun lagne deta hai?',
          choices: [
            'Bahar ka transit mehenga, andar ka sasta — video andar se aaye toh ISP ka paisa bache',
            'Saare private peer caches gair-kanooni hain — isliye ISP ko kanoon ke tehet lagana padta',
            'Cache lagate hi Google ko ISP ke saare credentials mil jaate hain — wahi sauda hai',
            'Cache lagne se har miss muft ho jaata hai — miss par bhi koi transit nahi lagta',
          ],
          answer: 0,
          explain: 'Dono ka faayda = offload; user ko speed milti hai. Isliye 1,300+ shehar.',
          choiceExplanations: [
            'Dono ka faayda = offload; user ko speed milti hai. Isliye 1,300+ shehar.',
            'Peer caches kanooni hain aur aam hain.',
            'Cache ko ISP ke credentials nahi milte.',
            'Miss par video upar ke cache se aata hai — transit lagta hai.',
          ],
        },
        {
          q: 'Kam dekhe videos ke liye GGC kya karta hai?',
          choices: [
            'Pull — pehli request par miss, upar ke cache se laao aur rakh lo; popular pehle se push',
            'Har mumkin video pehle se local rakhta hai — har video ki copy har sheher mein',
            'Pehli miss ko hamesha ke liye reject karta hai — kam dekha video kabhi nahi chalta',
            'Ek byte cache mein aa gaya toh poora video cache mein maana jaata hai',
          ],
          answer: 0,
          explain: 'Push jahan maang pakki, pull jahan anishchit — long tail ka hisaab, tiered cache ke saath.',
          choiceExplanations: [
            'Push jahan maang pakki, pull jahan anishchit — long tail ka hisaab, tiered cache ke saath.',
            'Har video har sheher mein rakhne ki jagah nahi.',
            'Miss par video upar se aata hai — reject nahi hota.',
            'Video tukdon mein cache hota hai — ek byte poora video nahi.',
          ],
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
          'Sirf ghadiyon par nahi — consensus/transaction protocol, aur bounded clocks + commit wait',
          'UTC format mein likho — UTC hone se saari wall clocks ek doosre se mil jaati hain',
          'HLC laga do — HLC akela poore DB ko linearizable bana deta hai',
          'NTP chalao — NTP ke naam se hi saari clock errors khatam ho jaati hain',
        ],
        answer: 0,
        explain: 'Wall-clock timestamps akele distributed writes ko externally consistent nahi banate. Consensus/transaction protocol aur, jahan use ho, verified bounded-uncertainty clocks + commit wait chahiye. HLC order mein madad karta hai, linearizability ki guarantee nahi.',
        choiceExplanations: [
          'Wall-clock timestamps akele distributed writes ko externally consistent nahi banate. Consensus/transaction protocol aur, jahan use ho, verified bounded-uncertainty clocks + commit wait chahiye. HLC order mein madad karta hai, linearizability ki guarantee nahi.',
          'UTC sirf format hai — ghadiyon ka skew wahi rehta hai.',
          'HLC madad hai, akela guarantee nahi.',
          'NTP mein bhi skew hota hai — ms tak.',
        ],
      },
      {
        q: 'Interviewer: "Video start time kam karna hai mobile par."',
        choices: [
          'Paas ke caches (kam RTT), chhota pehla chunk, aur adaptive bitrate — QUIC bhi madad',
          'QUIC laga do — QUIC har tarah ki blocking hamesha ke liye khatam kar deta hai',
          'Playback se pehle poora video download karo — phir beech mein kabhi nahi rukega',
          'Sirf backend ke CPU cores badhao — zyada cores se mobile par video jaldi shuru',
        ],
        answer: 0,
        explain: 'Paas ke caches aur chhota chalne layak pehla chunk shuruaat tez karte hain. QUIC TCP ke cross-stream HOL blocking se bachata hai; ek stream ke andar khoye bytes ka intezaar phir bhi ho sakta hai. 0-RTT shartein aur replay ki seemaon par nirbhar hai.',
        choiceExplanations: [
          'Paas ke caches aur chhota chalne layak pehla chunk shuruaat tez karte hain. QUIC TCP ke cross-stream HOL blocking se bachata hai; ek stream ke andar khoye bytes ka intezaar phir bhi ho sakta hai. 0-RTT shartein aur replay ki seemaon par nirbhar hai.',
          'Ek stream ke andar khoye bytes ka intezaar QUIC mein bhi hai.',
          'Poora download shuruaat ko aur dheema karta hai.',
          'Mobile par dikkat network ki hai, backend CPU ki nahi.',
        ],
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
    { front: 'TrueTime commit wait?', back: "TrueTime uncertainty interval transaction/replication protocol ke saath use hota hai. Commit acknowledgement TT.after(commit timestamp) wait satisfy karta hai; wait overlap ho sakta hai. Toy ±7 ms model14ms wait dikhata hai, every real commit formula nahi." },
    { front: 'Google Global Cache?', back: 'ISPs ke andar cache (1,300+ shehar); popular push, rare pull; ISP ka transit bachta hai; popular par ~98–99% hit.' },
    { front: 'QUIC ka faayda?', back: 'Streams alag — ek packet khoya toh sab nahi rukte (TCP HOL nahi); tez connection setup → video jaldi shuru.' },
  ],
},
]);

})();
