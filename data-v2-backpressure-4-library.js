/* =====================================================================
   🛡️ Playlist · 1 Resilience — Backpressure · level 4: LIBRARY
   Wahi signal Node ke streams mein (write() ka false, 'drain', pipeline), aur wahi chaar jawab RabbitMQ aur Kafka mein.
   Streams wale steps docker-labs/15-backpressure ke asli run se hain: slow motion = `node tools/streams-slowmo.js`,
   asli raftaar = `node tools/streams.js` (ex3). Code ka tukda asli file se hai (validate.js milata hai).
   RabbitMQ aur Kafka wale cards unki official documentation se hain — is lab mein chalaye nahi gaye (cards mein likha hai).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'src', icon: '📄', label: 'report file', x: 135, y: 105 },
  { id: 'rdr', icon: '📖', label: 'reader', x: 455, y: 105 },
  { id: 'wtr', icon: '✍️', label: 'writer', x: 760, y: 105 },
];
const EDGES = [{ from: 'src', to: 'rdr' }, { from: 'rdr', to: 'wtr' }];
const VIZ = { w: 890, h: 215 };
/* writer ke andar: pehle 4 hadd ke andar, uske upar wale laal */
const inside = n => Array.from({ length: Math.max(4, n) }, (_, i) => (i >= n ? 'free' : i < 4 ? 'busy' : 'bad'));
const READ = { from: 'src', to: 'rdr', label: 'padho', tone: 'acc' };
const WRITE_OK = { from: 'rdr', to: 'wtr', label: 'write', tone: 'ok' };
const WRITE_NO = { from: 'rdr', to: 'wtr', label: 'write', tone: 'bad' };

VISUALS['bp-lib'] = {
  t: 'Node ka writer bolta hai "ruk ja" (false) aur "ab bhejo" (drain) — sunna tumhara kaam hai',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { src: { tone: 'idle', badge: 'padhna ruka hua' }, rdr: { tone: 'busy', badge: 'pause()' }, wtr: { tone: 'slow', badge: 'andar 4/4 · write() → false' } },
    flows: [{ from: 'wtr', to: 'rdr', label: 'false', tone: 'slow', back: true }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'bp-lib',
  icon: '📚',
  group: '🌊 Backpressure',
  title: 'Backpressure 4 · Library — wahi signal Node ke streams mein',
  badge: 'Drain Daroga',
  objectives: [
    'Node ka <code>write()</code> jab <code>false</code> lautata hai, toh data ka kya hota hai?',
    '<code>\'drain\'</code> kab aata hai — aur reader ko rokne se kaam dheema kyun nahi hota?',
    '<code>pipeline()</code> kya karta hai jo purana <code>pipe()</code> nahi karta?',
    'RabbitMQ aur Kafka mein bhari line ke wahi chaar jawab kis naam se milte hain — aur unke default kya hain?',
  ],
  lesson: [
    `<h3>📄 Ek report, 129 MB</h3>
     <p>KhanaKart ke restaurant partners mahine ke ant mein apni report download karte hain: saare orders, 120 MB ki file.</p>
     <p><b>report-service</b> file ko disk se padhti hai aur partner ko bhejti hai. Disk tez hai. Partner ka internet dheema hai.</p>
     <p>Code seedha hai: "tukda padho, bhej do. Tukda padho, bhej do."</p>
     <pre>lab: 120 MB ki file, dheema writer
writer ke andar jama:     120 MB   (poori file)
process ki memory chadhi: 129 MB   — ek download par</pre>
     <p>Mahine ki aakhri raat 20 partners ek saath download karte hain. Seedha hisaab: 20 × 129 MB ≈ 2.5 GB. report-service ke paas itni memory nahi hai.</p>
     <p>Yeh level 1 wali kahani hi hai: tez bhejne wala, dheema kaam karne wala, beech mein bina hadd ki line. Bas is baar line <b>Node ke andar</b> chhupi hai.</p>
     <p class="tip">👉 Node ke paas is samasya ka ilaaj pehle se hai, aur Node bolta bhi hai. Agle screen par suno ki Node kya bolta hai — 12 tukdon ke saath, slow motion mein.</p>`,
  ],
  stages: [
    /* ---------------- 1. slow motion: write() ka jawab ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — write() ka jawab',
      goal: 'Asli Node streams, bas raftaar chhoti: reader har 100 ms par ek tukda deta hai, writer ko ek tukde par 300 ms lagte hain. Dekho ki har <code>write()</code> kya <b>lautata</b> hai.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'how', label: 'Code ka tareeka' },
        { id: 'w', label: 'Writer ke andar (hadd 4)' },
        { id: 'ret', label: '<code>write()</code> ne lautaya' },
        { id: 'rd', label: 'Reader' },
        { id: 'src', label: 'Source se padhe gaye tukde' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'Report ke 12 tukde hain. <b>Reader</b> file se tukda padhta hai (tez). <b>Writer</b> use partner ke dheeme internet par likhta hai (dheema).<br><br>Writer ke andar ek chhoti line hai. Us line par ek nishaan hai: <b>4 tukde</b>. Node is nishaan ko <code>highWaterMark</code> kehta hai.<br><br>Jab bhi code <code>writer.write(tukda)</code> bulata hai, writer ek jawab lautata hai: <code>true</code> ya <code>false</code>.',
          nodes: { src: { tone: 'ok', badge: '12 tukde' }, rdr: { tone: 'ok', badge: 'har 100 ms par 1' }, wtr: { tone: 'ok', badge: '1 tukda = 300 ms' } },
          vars: { how: 'write() ka jawab nazarandaaz', w: inside(0), ret: '—', rd: 'chal raha', src: '0 / 12' },
        },
        {
          clock: '0.10–0.30 s',
          say: 'Tukde #1, #2, #3. Teeno baar <code>write()</code> → <b>true</b>. Writer ke andar: 1, 2, 3.',
          flows: [READ, WRITE_OK],
          nodes: { wtr: { tone: 'ok', badge: 'andar 3/4' } },
          vars: { w: inside(3), ret: 'true · true · true', src: '3 / 12' },
        },
        {
          clock: '0.40 s',
          say: 'Tukda #4. <code>write()</code> → <b>false</b>. Writer ke andar: 4/4.',
          flows: [READ, { from: 'wtr', to: 'rdr', label: 'false', tone: 'slow', back: true }],
          nodes: { wtr: { tone: 'slow', badge: 'andar 4/4 · false' } },
          vars: { w: inside(4), ret: '<b>false</b>', src: '4 / 12' },
          ask: {
            q: '<code>write(#4)</code> ne <code>false</code> lautaya. Tukda #4 ka kya hua?',
            choices: ["#4 accepted; false ab aur writes rokne ka signal hai","#4 rejected; same chunk ko drain ke baad resend karo","#4 acknowledged; downstream processing complete ho gayi","#4 copied back; reader ko chunk phir se emit karna hai"],
            answer: 0,
            hint: '<code>write(#4)</code> ke baad writer ke andar kitne tukde hain: 3 ya 4?',
            explain: "Is normal writable stream mein chunk #4 buffer ho gaya. false ka signal: agle chunks rok kar drain ka wait karo. highWaterMark threshold hai, hard memory limit nahi; errors/destroyed streams ke liye alag error handling chahiye.",
           choiceExplanations: ["Is normal writable stream mein chunk #4 buffer ho gaya. false ka signal: agle chunks rok kar drain ka wait karo. highWaterMark threshold hai, hard memory limit nahi; errors/destroyed streams ke liye alag error handling chahiye.","Normal writable stream mein false admission rejection nahi. Same chunk resend karna duplicate banayega.","Buffered acceptance durable completion acknowledgement nahi; callback/finish semantics alag dekho.","write() chunk ko reader ko return nahi karta; false future writes pause karne ka signal hai."] },
        },
        {
          clock: '0.50–1.20 s',
          say: 'Is code ne <code>false</code> ko dekha hi nahi. Reader bhejta raha: #5 se #12. Aathon baar <code>write()</code> → <b>false</b>.<br><br>Writer ke andar: 4, 5, 6, 6, 7, 8, 8, <b>9</b>. Nishaan 4 par tha.',
          flows: [READ, WRITE_NO],
          nodes: { rdr: { tone: 'bad', badge: 'false ko nahi suna' }, wtr: { tone: 'bad', badge: 'andar 9/4' } },
          vars: { w: inside(9), ret: 'false — 9 baar; kisi ne nahi suna', src: '12 / 12 (1.20 s tak sab padh liya)' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi code, 120 MB ki file, writer ka nishaan 1 MB:
            <ul>
              <li>Writer ke andar jama: <b>120 MB</b> — poori file.</li>
              <li>Process ki memory <b>129 MB</b> chadhi.</li>
            </ul>
            Node ki documentation yahi chetaavni deti hai: jab tak writer khaali na ho, <code>write()</code> bulate rahoge toh Node sab kuch memory mein rakhta jaayega — jab tak memory khatam na ho jaaye.`,
          nodes: { src: { tone: 'idle', badge: 'lab: 120 MB' }, rdr: { tone: 'bad', badge: 'lab: false ko nahi suna' }, wtr: { tone: 'bad', badge: 'lab: andar 120 MB' } },
          vars: { w: 'lab: 120 MB (nishaan 1 MB)', ret: 'lab: false — kisi ne nahi suna', src: 'lab: poori file turant padh li' },
        },
        {
          clock: 'dobara · 0.40 s',
          say: 'Ab wahi 12 tukde, par code <code>false</code> ko <b>sunta</b> hai.<br><br>#4: <code>write()</code> → false. Code turant <code>reader.pause()</code> bulata hai.',
          flows: [{ from: 'wtr', to: 'rdr', label: 'false', tone: 'slow', back: true }],
          nodes: { src: { tone: 'ok', badge: '12 tukde' }, rdr: { tone: 'busy', badge: 'pause()' }, wtr: { tone: 'slow', badge: 'andar 4/4 · false' } },
          vars: { how: 'false → pause() · \'drain\' → resume()', w: inside(4), ret: '<b>false</b> → reader.pause()', rd: '<b>RUKA</b>', src: '4 / 12' },
        },
        {
          clock: '0.45–1.05 s',
          say: 'Reader ruka hai. (Reader ne ek tukda — #5 — aur padh ke apne paas rakh liya. Uske baad file se padhna band.)<br><br>Writer likhta ja raha hai: 0.45 s par #1 likh diya → andar 3. 0.75 s → andar 2. 1.05 s → andar 1.',
          nodes: { src: { tone: 'idle', badge: 'padhna ruka hua' }, rdr: { tone: 'busy', badge: 'ruka · #5 haath mein' }, wtr: { tone: 'ok', badge: 'andar 1/4' } },
          vars: { w: inside(1), ret: '—', src: '5 / 12 — phir ruka' },
          ask: {
            q: 'Writer reader ko "ab bhejo" kab bolega? (Node is khabar ko <code>\'drain\'</code> kehta hai.)',
            choices: ["Buffer ka pending data drain ho: lab mein 0/4","Buffer threshold se ek neeche aaye: lab mein 3/4","Buffer aadha khaali ho: lab mein 2/4 par signal","Har write callback ho: buffer size se bina sambandh"],
            answer: 0,
            hint: 'Agar writer 3/4 par hi "ab bhejo" bol deta, toh agla hi tukda use phir 4/4 kar deta. Uske baad kya hota?',
            explain: 'Node ka writer tab tak chup rehta hai jab tak writer ki line <b>poori khaali</b> na ho jaaye. Warna reader har tukde par rukta-chalta-rukta. Tanki ki motor bhi "thoda khaali" par nahi, "kaafi khaali" par chalu hoti hai.',
           choiceExplanations: ["Node ka writer tab tak chup rehta hai jab tak writer ki line <b>poori khaali</b> na ho jaaye. Warna reader har tukde par rukta-chalta-rukta. Tanki ki motor bhi \"thoda khaali\" par nahi, \"kaafi khaali\" par chalu hoti hai.","Is writable flow ka drain buffered work nikalne ke baad signal karta hai; threshold cross-back ko per-chunk notification mat maano.","Aadha khaali hone ka custom hysteresis rule is Node stream mein configured nahi.","Write callbacks aur drain alag signals hain; callback per chunk ho sakta hai, drain producer resume ke liye hai."] },
        },
        {
          clock: '1.35–1.60 s',
          say: '1.35 s: writer khaali (0/4) → <code>\'drain\'</code> → code <code>reader.resume()</code> bulata hai.<br><br>Reader ke paas ruka hua #5 nikla: <code>write()</code> → true, andar 1. Phir #6 → 2, #7 → 3. 1.60 s par #8 → <b>false</b> → phir <code>pause()</code>.',
          flows: [READ, WRITE_OK],
          nodes: { src: { tone: 'ok', badge: 'phir padhna shuru' }, rdr: { tone: 'busy', badge: 'phir pause()' }, wtr: { tone: 'slow', badge: 'andar 4/4 · false' } },
          vars: { w: inside(4), ret: 'true · true · true · <b>false</b>', rd: 'chala, phir <b>RUKA</b>', src: '8 / 12' },
        },
        {
          clock: '3.75 s',
          say: 'Yahi chakkar teen baar chala. Writer ke andar kabhi <b>4 se zyada nahi</b>.<br><br>File ka aakhri tukda <b>2.80 s</b> par padha gaya. Pehle tareeke mein poori file 1.20 s mein padh li gayi thi. Yaani ab file bhi utni hi dheere padhi gayi jitna writer likh sakta tha.',
          nodes: { src: { tone: 'ok', badge: 'aakhri tukda 2.80 s par' }, rdr: { tone: 'ok', badge: 'teen baar ruka' }, wtr: { tone: 'ok', badge: 'sabse zyada 4/4' } },
          vars: { w: inside(0), ret: 'false ko har baar suna', rd: 'poora', src: '12 / 12 (2.80 s par)' },
          ask: {
            q: 'Pehle tareeke mein sab likhne mein 3.75 s lage the. Is baar reader teen baar ruka. Ab sab likhne mein kitna samay laga?',
            choices: ["Lagbhag 3.75 s; slow writer ab bhi bottleneck hai","Lagbhag 7.5 s; har pause processing ko bhi rokta","Lagbhag 1.2 s; source speed destination tak badhti","Lagbhag 0.3 s; sirf aakhri chunk ka delay ginte hain"],
            answer: 0,
            hint: 'Dono tareekon mein writer ek tukda kitni der mein likhta hai? Kya reader ke rukne se writer kabhi khaali baitha?',
            explain: 'Is lab mein backpressure ke saath total samay lagbhag same tha: writer bottleneck raha. Real workloads mein buffering, batching aur implementation overhead throughput/latency badal sakte hain. Backpressure sirf yeh tay karta hai ki ruka hua data <b>kahan</b> rahe: tumhari RAM mein, ya abhi file mein hi.',
           choiceExplanations: ["Is lab mein backpressure ke saath total samay lagbhag same tha: writer bottleneck raha. Real workloads mein buffering, batching aur implementation overhead throughput/latency badal sakte hain. Backpressure sirf yeh tay karta hai ki ruka hua data <b>kahan</b> rahe: tumhari RAM mein, ya abhi file mein hi.","Source pause ke dauraan writer queued chunks process karta rehta hai.","Reader tez hone se writer ki 300 ms/chunk service rate nahi badhti.","Saare 12 chunks writer ko process karne hain; sirf last delay nahi."] },
        },
        {
          clock: 'pipeline()',
          say: 'Yeh pause / drain wala code khud likhna zaroori nahi. Node mein ek function yahi sab karta hai:<pre>pipeline(reader, writer, done)</pre>Slow motion mein <code>pipeline()</code> ka trace pause/drain wale trace se <b>akshar-akshar</b> milta hai: andar sabse zyada 4, sab likhne mein 3.75 s.',
          nodes: { rdr: { tone: 'ok', badge: 'pipeline() khud rokta hai' }, wtr: { tone: 'ok', badge: 'sabse zyada 4/4' } },
          vars: { how: 'pipeline(reader, writer)' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab, 120 MB ki file, writer ka nishaan 1 MB:
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Writer ke andar sabse zyada</th><th>Process ki memory chadhi</th><th>Kul samay</th></tr>
              <tr><td><code>write()</code> ka jawab nazarandaaz</td><td>120 MB</td><td>129 MB</td><td>8.0 s</td></tr>
              <tr><td><code>false</code> → pause, <code>'drain'</code> → resume</td><td><b>1 MB</b></td><td>45 MB</td><td>8.0 s</td></tr>
              <tr><td><code>pipeline()</code></td><td><b>1 MB</b></td><td>49 MB</td><td>8.0 s</td></tr>
            </table></div>
            Samay teeno mein barabar. Farak sirf RAM ka hai.`,
          nodes: { src: { tone: 'idle', badge: 'lab: 120 MB' }, rdr: { tone: 'ok', badge: 'lab: writer ki raftaar par' }, wtr: { tone: 'ok', badge: 'lab: andar 1 MB' } },
          vars: { how: 'teeno', w: 'lab: 120 MB · 1 MB · 1 MB', ret: '—', rd: '—', src: 'lab: 120 MB, teeno mein 8.0 s' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> Node ke streams mein tanki wala gola pehle se laga hai. <code>write()</code> ka <code>false</code> = "ruk ja". <code>\'drain\'</code> = "ab bhejo".<br>Par Node zabardasti nahi karta: <code>false</code> ke baad bhi tukda le leta hai. Sunna tumhare code ka kaam hai — ya <code>pipeline()</code> ka.',
    },

    /* ---------------- 2. asli code: tools/streams.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 tools/streams.js — teeno tareeke, 9 line mein',
      goal: 'Lab ka asli-raftaar wala tool teeno tareeke inhi 9 line se chalata hai. Dekho ki 120 MB aur 1 MB ke beech code ka farak kitna chhota hai.',
      code: {
        title: 'docker-labs/15-backpressure/tools/streams.js',
        file: 'docker-labs/15-backpressure/tools/streams.js',
        from: 34,
        text: "  await new Promise(done => {\n    if (mode === 'pipeline') return pipeline(r, w, done);\n    r.on('data', c => {\n      const ok = w.write(c);\n      if (!ok && mode === 'drain') { r.pause(); w.once('drain', () => r.resume()); }\n    });\n    r.on('end', () => w.end());\n    w.on('finish', done);\n  });",
      },
      vars: [
        { id: 'mode', label: '<code>mode</code>' },
        { id: 'buf', label: 'Lab: writer ke andar sabse zyada' },
        { id: 'err', label: 'Beech mein galti ho toh' },
      ],
      steps: [
        {
          clock: 'har tukde par',
          line: [36, 37],
          say: 'Yahan <code>r</code> = reader, <code>w</code> = writer.<br><br>Line 36: reader jab bhi ek tukda deta hai, yeh function chalta hai.<br>Line 37: tukda writer ko likho, aur writer ka jawab <code>ok</code> mein rakho.',
          vars: { mode: '—', buf: '—', err: '—' },
        },
        {
          clock: 'mode = ignore',
          line: 38,
          say: 'Line 38 ki shart mein <code>mode === \'drain\'</code> hai. Mode <code>ignore</code> ho toh shart jhoothi → line 38 kuch nahi karti.<br><br><code>ok</code> mein <code>false</code> rakha hai. Use kisi ne padha hi nahi.<br><br>Yahan galti koi galat line likhne mein nahi hai. Galti <b>ek line na likhne</b> mein hai.',
          vars: { mode: 'ignore', buf: '<b>120 MB</b>' },
        },
        {
          clock: 'mode = drain',
          line: 38,
          say: `Line 38, teen kaam:
            <ol>
              <li><code>!ok</code> — writer ne "ruk ja" bola?</li>
              <li><code>r.pause()</code> — reader ko roko.</li>
              <li><code>w.once('drain', () =&gt; r.resume())</code> — writer jab "ab bhejo" bole, <b>ek baar</b> suno aur reader ko chalao.</li>
            </ol>`,
          vars: { mode: 'drain', buf: '<b>1 MB</b>' },
        },
        {
          clock: 'mode = pipeline',
          line: 35,
          say: 'Line 35: <code>pipeline(r, w, done)</code>. Line 36 se 41 ka poora kaam ek line mein — aur ek cheez zyada, jo agle step mein hai.',
          vars: { mode: 'pipeline', buf: '<b>1 MB</b>' },
          ask: {
            q: 'Node mein ek purana tareeka bhi hai: <code>reader.pipe(writer)</code>. <code>pipe()</code> bhi backpressure sambhalta hai. Maan lo writer beech mein fail ho gaya (disk bhar gayi). Reader ka kya hoga?',
            choices: ["Lab mein pipe reader chhodta; pipeline dono destroy kare","Dono reader destroy karein; error propagation same hai","Dono reader chhod dein; caller sab cleanup manually kare","Pipe poora process roke; pipeline sirf failed write roke"],
            answer: 0,
            hint: '<code>pipe()</code> sirf data aage badhata hai. Safai kaun karega?',
            explain: 'Lab ka slow motion (writer #3 par fail): <code>reader.pipe(writer)</code> → <code>reader.destroyed = false</code>. <code>pipeline(reader, writer)</code> → <code>reader.destroyed = true</code>.',
           choiceExplanations: ["Lab ka slow motion (writer #3 par fail): <code>reader.pipe(writer)</code> → <code>reader.destroyed = false</code>. <code>pipeline(reader, writer)</code> → <code>reader.destroyed = true</code>.","pipe() backpressure deta hai, par pipeline() jaisi composed error/cleanup guarantee nahi.","pipeline() error par participating streams ko destroy karta hai, success/finished-stream caveats ke saath.","Unhandled errors process affect kar sakte hain, lekin pipe ka contract process ko band karna nahi."] },
        },
        {
          clock: 'galti ho toh',
          line: 35,
          say: `Lab mein writer ko tukda #3 par fail karaya ("disk bhar gayi"):
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>writer</th><th>reader</th></tr>
              <tr><td><code>reader.pipe(writer)</code></td><td>band</td><td><b>khula reh gaya</b></td></tr>
              <tr><td><code>pipeline(reader, writer)</code></td><td>band</td><td>band</td></tr>
            </table></div>
            Khula reader = khuli file, khula database cursor, khula socket. Aise sau download fail hue toh sau cheezein khuli.<br><br>Isliye naye code mein <code>pipeline()</code>: backpressure bhi, safai bhi, aur galti ek hi jagah (<code>done</code>) milti hai.`,
          vars: { err: '<code>pipe()</code>: reader khula · <code>pipeline()</code>: dono band' },
        },
        {
          clock: 'nishaan na do toh?',
          line: 37,
          say: `Lab mein writer ka nishaan (<code>highWaterMark</code>) khud likha gaya hai: 1 MB. Na likho toh Node apna default lagata hai. Is machine par (Node v24.18.0):
            <pre>Node v24.18.0 · highWaterMark na do toh default: 65536 bytes · object mode mein 16 objects</pre>
            Node ki documentation ke history mein likha hai: v22.0.0 — "bump default highWaterMark". Aur Node ki apni backpressure guide abhi bhi 16 KB likhti hai.<br><br>Seekh: default <b>version ke saath badalta hai</b>. Jahan memory ka hisaab zaroori ho, nishaan khud likho.`,
          vars: { mode: '—', buf: 'default nishaan: 64 KB (is Node par)' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> 120 MB aur 1 MB ke beech ek line ka farak hai. Khud likhna ho toh: <code>false</code> → <code>pause()</code>, <code>\'drain\'</code> → <code>resume()</code>. Warna seedha <code>pipeline()</code>.',
    },

    /* ---------------- 3. wahi jawab, doosre tools mein ---------------- */
    {
      type: 'cards',
      title: '🗺️ Wahi chaar jawab — RabbitMQ aur Kafka mein',
      goal: 'Chaar chhote cards. Yeh cards RabbitMQ aur Kafka ki <b>official documentation</b> se hain; is lab mein yeh dono chalaye nahi gaye. Settings ke naam aur default wahin se hain.',
      steps: [
        {
          title: '1. RabbitMQ: queue bhar gayi toh?',
          say: `RabbitMQ ek alag server hai jo producer aur consumer ke beech line rakhta hai.<br><br>
            By default RabbitMQ ki queue par <b>koi hadd nahi</b>. Hadd tum lagate ho: <code>x-max-length</code> (kitne messages) ya <code>x-max-length-bytes</code>.<br><br>
            Bhari hone par kya ho, yeh <code>x-overflow</code> tay karta hai:
            <div class="dr-scroll"><table>
              <tr><th><code>x-overflow</code></th><th>Kya hota hai</th><th>Hamara naam</th></tr>
              <tr><td><code>drop-head</code> <b>(default)</b></td><td>Queue ka sabse purana message girta hai</td><td>sabse purana girao</td></tr>
              <tr><td><code>reject-publish</code></td><td>Naya message nahi liya jaata. Publisher ne "confirms" chalu kiye hon toh use <code>basic.nack</code> milta hai</td><td>"na" bolo</td></tr>
              <tr><td><code>reject-publish-dlx</code></td><td>Wahi, aur mana kiya hua message ek alag queue mein rakh liya jaata hai</td><td>"na" bolo + sambhaal ke rakho</td></tr>
            </table></div>`,
          ask: {
            q: 'Ek team ne orders wali queue par <code>x-max-length</code> lagaya, par <code>x-overflow</code> nahi likha. Queue bhar gayi. Kya hoga?',
            choices: ["Oldest ready messages drop/dead-letter; default drop-head","Publish nack ho; overflow default reject-publish samjho","Publish block ho; max-length ko upstream feedback maano","Consumer stop ho; ready messages RAM mein badhte rahein"],
            answer: 0,
            hint: 'Table mein kaunsi value ke aage "default" likha hai?',
            explain: "RabbitMQ max-length ka default front/oldest ready messages ko drop ya configured DLX par dead-letter karta hai. Unacknowledged messages is ready limit mein count nahi hote. Order admission ke liye appropriate reject-publish policy, confirms aur recovery strategy samjho; queue type/version support check karo.",
           choiceExplanations: ["RabbitMQ max-length ka default front/oldest ready messages ko drop ya configured DLX par dead-letter karta hai. Unacknowledged messages is ready limit mein count nahi hote. Order admission ke liye appropriate reject-publish policy, confirms aur recovery strategy samjho; queue type/version support check karo.","Nack ke liye reject-publish policy aur publisher confirms ka behavior configure/observe karo.","Max-length khud blocking producer protocol nahi banata.","Queue consumer ko stop karke cap enforce nahi karti; default oldest ready messages hataati hai."] },
        },
        {
          title: '2. RabbitMQ: consumer par bojh kaise rokein?',
          say: 'Consumer RabbitMQ ko bolta hai: "mere paas ek saath itne hi adhoore messages rakho." Is setting ka naam <b>prefetch</b> hai (<code>basic.qos</code>).<br><br>Jab tak consumer kisi message ko "ho gaya" (ack) nahi bolta, RabbitMQ us consumer ko prefetch se zyada nahi bhejta. Baaki messages queue mein rehte hain, consumer ki memory mein nahi.<br><br>Yeh "rok lo" hai — broker aur consumer ke beech.<br><br>⚠️ Documentation: prefetch <code>0</code> ka matlab <b>koi hadd nahi</b>.',
        },
        {
          title: '3. Kafka: yahan consumer khud maangta hai',
          say: `Ab tak producer kaam <b>dhakelta</b> tha (push). Kafka mein consumer khud <b>maangta</b> hai: <code>poll()</code> — "agle messages do" (pull).<br><br>
            Consumer dheema hai → <code>poll()</code> kam bulata hai → kam aata hai. Pull mein backpressure apne aap milta hai. Messages Kafka ki disk par rehte hain, consumer ki memory mein nahi.<br><br>
            Documentation ke default:
            <ul>
              <li><code>max.poll.records</code> = <b>500</b>: ek <code>poll()</code> mein zyada se zyada itne.</li>
              <li><code>max.poll.interval.ms</code> = <b>5 minute</b>: itni der tak <code>poll()</code> nahi bulaya toh Kafka us consumer ko mara hua maan leta hai aur us consumer ka kaam doosre consumer ko de deta hai.</li>
              <li><code>pause()</code> / <code>resume()</code>: consumer keh sakta hai "abhi is hisse se mat do".</li>
            </ul>
            Kafka ka <b>producer</b> bhi apne andar hadd rakhta hai: <code>buffer.memory</code> = 32 MB. Bhar gaya toh <code>send()</code> rukta hai — <code>max.block.ms</code> (60 second) tak — aur phir error deta hai. Pehle "rok lo", phir "na".`,
        },
        {
          title: '4. Ek nazar mein',
          say: `<div class="dr-scroll"><table>
              <tr><th>Bhari line ka jawab</th><th>Node streams</th><th>RabbitMQ</th><th>Kafka</th></tr>
              <tr><td>Rok lo</td><td><code>write()</code> ka <code>false</code> + <code>'drain'</code>; <code>pipeline()</code></td><td>prefetch</td><td>consumer kam <code>poll()</code> kare; producer ka <code>send()</code> rukta hai</td></tr>
              <tr><td>"Na" bolo</td><td>—</td><td><code>reject-publish</code> + confirms</td><td>producer: 60 s ke baad error</td></tr>
              <tr><td>Sabse purana girao</td><td>—</td><td><code>drop-head</code> (default)</td><td>—</td></tr>
              <tr><td>Hadd na likho toh</td><td>nishaan 64 KB — par sirf salaah</td><td>koi hadd nahi</td><td>producer buffer 32 MB</td></tr>
            </table></div>
            Naam har jagah alag hain. Sawaal har jagah wahi do: <b>line bhari ho toh kya</b>, aur <b>bhejne wale ko kaise pata chalega</b>.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> koi bhi naya tool uthao — queue, stream, broker — toh us tool ki documentation mein teen cheezein dhoondo: <b>hadd kahan likhte hain</b>, <b>bhari hone par default kya hai</b>, aur <b>bhejne wale ko kaise pata chalta hai</b>. Default aksar "koi hadd nahi" ya "chupchaap girao" hota hai.',
    },

    /* ---------------- 4. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — Node streams, pehle slow motion, phir asli raftaar',
      project: '15-backpressure',
      exercise: 'ex3-streams',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao: 12 tukde slow motion mein, phir 120 MB asli raftaar par.',
      why: '<code>tools/streams-slowmo.js</code> asli Node streams chalata hai (Readable, Writable, pipeline) — sirf ghadi dheemi hai, isliye tumhara output dry run se milega. <code>tools/streams.js</code> wahi teen tareeke 120 MB par chalata hai aur memory naapta hai. Koi service nahi chalani — sirf Node 18+.',
      steps: [
        { text: 'Pehle "jawab nazarandaaz". Har line mein write() ka jawab aur "writer ke andar" dekho.', cmd: 'cd docker-labs/15-backpressure && node tools/streams-slowmo.js --mode ignore', expect: "asli Node streams, slow motion · reader: har 100 ms par ek tukda (kul 12) · writer: ek tukda 300 ms, highWaterMark 4 tukde\nNode v24.18.0 · highWaterMark na do toh default: 65536 bytes · object mode mein 16 objects\n\n=== write() ka jawab nazarandaaz ===\n    0.10 s  #1: source se padha → write() → true  · writer ke andar 1/4\n    0.20 s  #2: source se padha → write() → true  · writer ke andar 2/4\n    0.30 s  #3: source se padha → write() → true  · writer ke andar 3/4\n    0.40 s  #4: source se padha → write() → false · writer ke andar 4/4   ← \"ruk ja\"\n    0.50 s  #5: source se padha → write() → false · writer ke andar 4/4   ← \"ruk ja\"\n    0.60 s  #6: source se padha → write() → false · writer ke andar 5/4   ← hadd ke upar\n    0.70 s  #7: source se padha → write() → false · writer ke andar 6/4   ← hadd ke upar\n    0.80 s  #8: source se padha → write() → false · writer ke andar 6/4   ← hadd ke upar\n    0.90 s  #9: source se padha → write() → false · writer ke andar 7/4   ← hadd ke upar\n    1.00 s  #10: source se padha → write() → false · writer ke andar 8/4   ← hadd ke upar\n    1.10 s  #11: source se padha → write() → false · writer ke andar 8/4   ← hadd ke upar\n    1.20 s  #12: source se padha → write() → false · writer ke andar 9/4   ← hadd ke upar\n   nateeja → writer ke andar sabse zyada: 9 (hadd 4) · source se aakhri tukda 1.20 s par padha · sab likhne mein 3.75 s" },
        { text: 'Ab "false par ruko, drain par chalo". Dhoondo: \'drain\' kis pal aata hai, aur us pal writer ke andar kitne hain.', cmd: 'node tools/streams-slowmo.js --mode drain', expect: "asli Node streams, slow motion · reader: har 100 ms par ek tukda (kul 12) · writer: ek tukda 300 ms, highWaterMark 4 tukde\nNode v24.18.0 · highWaterMark na do toh default: 65536 bytes · object mode mein 16 objects\n\n=== write() false → reader.pause() · 'drain' → reader.resume() ===\n    0.10 s  #1: source se padha → write() → true  · writer ke andar 1/4\n    0.20 s  #2: source se padha → write() → true  · writer ke andar 2/4\n    0.30 s  #3: source se padha → write() → true  · writer ke andar 3/4\n    0.40 s  #4: source se padha → write() → false · writer ke andar 4/4   ← \"ruk ja\"\n    0.40 s           reader.pause() — reader ruka\n    0.45 s           writer ne #1 likh diya · writer ke andar 3/4\n    0.50 s  #5: source se padha → reader ke andar ruka hua (write nahi hua)\n    0.75 s           writer ne #2 likh diya · writer ke andar 2/4\n    1.05 s           writer ne #3 likh diya · writer ke andar 1/4\n    1.35 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu\n    1.35 s  #5: reader ke andar se nikla → write() → true  · writer ke andar 1/4\n    1.40 s  #6: source se padha → write() → true  · writer ke andar 2/4\n    1.50 s  #7: source se padha → write() → true  · writer ke andar 3/4\n    1.60 s  #8: source se padha → write() → false · writer ke andar 4/4   ← \"ruk ja\"\n    1.60 s           reader.pause() — reader ruka\n    1.65 s           writer ne #5 likh diya · writer ke andar 3/4\n    1.70 s  #9: source se padha → reader ke andar ruka hua (write nahi hua)\n    1.95 s           writer ne #6 likh diya · writer ke andar 2/4\n    2.25 s           writer ne #7 likh diya · writer ke andar 1/4\n    2.55 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu\n    2.55 s  #9: reader ke andar se nikla → write() → true  · writer ke andar 1/4\n    2.60 s  #10: source se padha → write() → true  · writer ke andar 2/4\n    2.70 s  #11: source se padha → write() → true  · writer ke andar 3/4\n    2.80 s  #12: source se padha → write() → false · writer ke andar 4/4   ← \"ruk ja\"\n    2.80 s           reader.pause() — reader ruka\n    2.85 s           writer ne #9 likh diya · writer ke andar 3/4\n    3.15 s           writer ne #10 likh diya · writer ke andar 2/4\n    3.45 s           writer ne #11 likh diya · writer ke andar 1/4\n    3.75 s           writer khaali (writer ke andar 0/4) → 'drain' → reader phir chalu\n   nateeja → writer ke andar sabse zyada: 4 (hadd 4) · source se aakhri tukda 2.80 s par padha · sab likhne mein 3.75 s" },
        { text: 'Writer beech mein fail ho jaaye toh: pipe() vs pipeline().', cmd: 'node tools/streams-slowmo.js --mode error', expect: "asli Node streams, slow motion · reader: har 100 ms par ek tukda (kul 12) · writer: ek tukda 300 ms, highWaterMark 4 tukde\nNode v24.18.0 · highWaterMark na do toh default: 65536 bytes · object mode mein 16 objects\n\n=== writer #3 likhte hue fail ho jaaye — reader ka kya hota hai? ===\n   reader.pipe(writer)      → error mila: \"disk bhar gayi\" · writer.destroyed = true · reader.destroyed = false ← reader khula reh gaya (file / DB cursor / socket ka leak)\n   pipeline(reader, writer) → error mila: \"disk bhar gayi\" · writer.destroyed = true · reader.destroyed = true  ← dono band" },
        { text: 'Ab asli raftaar: 120 MB, teeno tareeke (~25 s).', cmd: 'node tools/streams.js', expect: "tez reader → dheema writer (~16 MB/s) · 120 MB · writer ka highWaterMark 1 MB\n\ntareeka                               writer mein sabse zyada jama   process ki extra memory (peak)   kul samay\nwrite() ka jawab nazarandaaz                120 MB                    129 MB                8.0 s\npause() / drain par resume()                  1 MB                     45 MB                8.0 s\nstream.pipeline()                             1 MB                     49 MB                8.0 s" },
      ],
      observe: {
        q: 'Asli raftaar par teeno tareeke 8.0 s mein khatam hue. Toh <code>write()</code> ka jawab sunne se kya bacha?',
        choices: ["Buffered memory ghati; writer throughput lagbhag same","Total processing time ghata; pauses writer tez karte","CPU kaam ghata; pipeline file bytes kam process karta","Durability badhi; buffered writes ab disk-acknowledged hain"],
        answer: 0,
        explain: 'Raftaar hamesha dheeme writer ki thi. Backpressure ne sirf yeh tay kiya ki ruka hua data RAM mein rahega ya file mein.',
       choiceExplanations: ["Raftaar hamesha dheeme writer ki thi. Backpressure ne sirf yeh tay kiya ki ruka hua data RAM mein rahega ya file mein.","Measured elapsed teeno cases mein 8 s tha; benefit memory bound karna tha.","Same bytes process hue; is experiment ne CPU reduction prove nahi ki.","Backpressure durability acknowledgement add nahi karta."] },
      lesson: 'Node mein data ek jagah se doosri jagah le jaana ho toh <code>pipeline()</code>. Khud <code>write()</code> bulao toh uska jawab padho.',
    },
  ],
  interview: {
    title: 'Interview Round — asli tools',
    instructions: 'Interviewer dekhna chahta hai ki tum default settings par bharosa nahi karte. 🎤',
    questions: [
      {
        q: '"Hamari Node service badi file download par out-of-memory se mar jaati hai. Kahan dekhoge?"',
        choices: ["write(false) handling aur pipeline cleanup trace karo","RAM dugni karo; streaming loop pehle jaisa chalao","HighWaterMark ghatao; false return ignore karte raho","GC force karo; pending write buffers collect karao"],
        answer: 0,
        explain: 'Lab: 120 MB ki file. Jawab nazarandaaz → writer ke andar 120 MB, memory 129 MB chadhi. pipeline() → 1 MB. Samay teeno mein 8.0 s.',
       choiceExplanations: ["Lab: 120 MB ki file. Jawab nazarandaaz → writer ke andar 120 MB, memory 129 MB chadhi. pipeline() → 1 MB. Samay teeno mein 8.0 s.","Extra RAM root cause ko postpone karegi; source unlimited enqueue karta rahega.","HighWaterMark advisory threshold hai. False ignore karoge toh small threshold hard cap nahi banega.","Pending useful buffers reachable hain; GC unhe safely discard nahi karega."] },
      {
        q: '"RabbitMQ ki queue par humne max-length lagaya. Ab kuch orders gayab ho jaate hain aur kahin koi error nahi. Kyun?"',
        choices: ["Overflow default aur DLX dekho; rejection/confirm policy chuno","Consumer acknowledgement timeout badhao; cap wahi rakho","Producer retries badhao; accepted publish ko loss-free maano","Queue cap dugni karo; overflow policy ko default rakho"],
        answer: 0,
        explain: 'RabbitMQ documentation: overflow ke teen jawab — drop-head (default), reject-publish, reject-publish-dlx. (Is lab mein RabbitMQ chalaya nahi gaya.)',
       choiceExplanations: ["RabbitMQ documentation: overflow ke teen jawab — drop-head (default), reject-publish, reject-publish-dlx. (Is lab mein RabbitMQ chalaya nahi gaya.)","Consumer timeout ready-message overflow policy nahi badalta.","Publisher confirm default drop-head se purane accepted messages ko bachane ki guarantee nahi.","Bada cap sustained overload ke drop behavior ko sirf postpone karega."] },
      {
        q: '"Hamara Kafka consumer ek batch par 6–7 minute lagata hai, aur consumer group baar-baar rebalance hota hai. Kya ho raha hai?"',
        choices: ["max.poll.interval.ms se batch duration compare karo","Session heartbeat interval se batch duration hi compare karo","Broker retention.ms badhao; poll loop pehle jaisa rakho","Partitions badhao; per-record processing time ignore karo"],
        answer: 0,
        explain: "Kafka 4.1 consumer docs mein max.poll.interval.ms default 300000 ms hai. Batch work deadline se lamba ho toh group progress fail ho sakti hai; static membership mein reassignment session timeout tak delay ho sakta hai. Smaller max.poll.records ya bounded worker processing + owner-thread pause/poll strategy consider karo. Kafka is lab mein run nahi kiya gaya.",
       choiceExplanations: ["Kafka 4.1 consumer docs mein max.poll.interval.ms default 300000 ms hai. Batch work deadline se lamba ho toh group progress fail ho sakti hai; static membership mein reassignment session timeout tak delay ho sakta hai. Smaller max.poll.records ya bounded worker processing + owner-thread pause/poll strategy consider karo. Kafka is lab mein run nahi kiya gaya.","Heartbeats alone application progress deadline ko replace nahi karte. Static-member behavior aur client protocol bhi check karo.","Retention stored log lifetime hai, consumer ke poll progress deadline ka setting nahi.","Parallelism help kar sakti hai par expensive batch ka max-poll violation pehle diagnose karo."] },
    ],
  },
  success: [
    'Bata sakte ho ki Node ka write() false kyun lautata hai, aur data ka kya hota hai',
    'Samjha sakte ho ki drain kab aata hai, aur reader ko rokne se samay kyun nahi badhta',
    'Kisi bhi queue ya broker ki documentation mein teen cheezein dhoondh sakte ho: hadd, bhari hone ka default, aur bhejne wale ko khabar',
  ],
  cards: [
    { front: 'Node ka write() false lautaye toh?', back: 'Tukda le liya gaya hai; false sirf "ab aur mat bhejo" hai. Reader ko pause() karo aur writer ke \'drain\' par resume() — ya pipeline() lagao. Lab: nazarandaaz karne par 120 MB jama, sunne par 1 MB.' },
    { front: '\'drain\' kab aata hai?', back: 'Jab writer ki line poori khaali ho jaaye (slow motion: andar 0/4) — nishaan se zara neeche aane par nahi.' },
    { front: 'Backpressure se kaam dheema hota hai?', back: 'Is measured lab mein total samay lagbhag same: slow motion 3.75 s, file run 8.0 s. Memory buffering ghati; general workloads mein batching/overhead throughput bhi badal sakte hain.' },
    { front: 'pipe() ya pipeline()?', back: 'pipeline(). Dono backpressure sambhalte hain, par galti par pipe() reader ko khula chhod deta hai (lab: reader.destroyed = false); pipeline() dono band karta hai.' },
    { front: 'RabbitMQ aur Kafka ke default? (docs)', back: 'RabbitMQ: queue par koi hadd nahi; hadd lagao toh overflow default drop-head (sabse purana chupchaap gira). Prefetch 0 = koi hadd nahi. Kafka: max.poll.records 500, max.poll.interval.ms 5 minute; producer buffer 32 MB, bharne par send() 60 s rukta hai phir error.' },
  ],
},
]);

})();
