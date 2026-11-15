/* =====================================================================
   System Gurukul — 🎤 Interview Designs (track pro-iv), hissa 4
   Levels: iv-kvstore (kv quorum mission), boss-iv (mock interview: 24 ghante wali Stories).
   ===================================================================== */
(() => {
/* Ek hi kram ka experiment, records ke kram se:
   W=1 par ₹500 → usi write ka R=1 stale read → uske baad naya write (W ≥ 2) → us naye write ka taaza read (write ka W + read ka R > 3).
   Config badalne ya `kv repair` se purana W=1 write "quorum write" nahi banta. */
const kvChain = s => {
  const R = s.records, kv = (r, op) => r.kind === 'kv' && r.op === op;
  const out = { p1: -1, g1: -1, p2: -1, g2: -1 };
  for (let i = 0; i < R.length && out.g1 < 0; i++) {
    if (!kv(R[i], 'put') || R[i].w !== 1 || R[i].value !== 500) continue;
    for (let j = i + 1; j < R.length; j++) {
      if (kv(R[j], 'get') && R[j].r === 1 && R[j].stale === true && R[j].latest === R[i].ver) { out.p1 = i; out.g1 = j; break; }
    }
  }
  if (out.g1 < 0) return out;
  let lastPut = -1;
  for (let i = out.g1 + 1; i < R.length; i++) if (kv(R[i], 'put')) lastPut = i;
  if (lastPut < 0 || R[lastPut].w < 2 || R[lastPut].ver !== s.sys.kv.latest) return out;
  out.p2 = lastPut;
  let lastGet = -1;
  for (let i = out.p2 + 1; i < R.length; i++) if (kv(R[i], 'get')) lastGet = i;
  const P = R[out.p2], G = R[lastGet];
  if (G && G.stale === false && G.ver === P.ver && P.w + G.r > 3) out.g2 = lastGet;
  return out;
};
const T_KV = [
  { text: 'W = 1 par Aman ka naya balance ₹500 likho',
    check: s => s.records.some(r => r.kind === 'kv' && r.op === 'put' && r.w === 1 && r.value === 500) },
  { text: 'R = 1 par padho — usi ₹500 write ke baad purana balance (stale read)',
    check: s => kvChain(s).g1 >= 0 },
  { text: 'Quorum lagao: R + W > N (jaise W = 2, R = 2)',
    check: s => s.sys.kv.w + s.sys.kv.r > s.sys.kv.n },
  { text: 'Stale read ke baad naya balance likho, W kam se kam 2',
    check: s => kvChain(s).p2 >= 0 },
  { text: 'Dobara padho: naye write ka balance mile (write ka W + read ka R > 3)',
    check: s => kvChain(s).g2 >= 0 },
];

SD.registerLevels('pro-iv', [
/* ---------------------------------------------------------------- I7 */
{
  id: 'iv-kvstore',
  icon: '🗄️',
  title: 'Design: Distributed KV store — Dynamo ki tarah',
  badge: 'Quorum Qazi',
  objectives: [
    'Partitioning: consistent hashing + virtual nodes (data track ki yaad)',
    'Replication N = 3; quorum: <b>R + W &gt; N</b> kyun',
    'Replica gira: hinted handoff, read repair, anti-entropy (Merkle tree)',
    'Conflicts: last-write-wins vs vector clocks',
  ],
  lesson: [
    `<h3>🗳️ Misaal: teen munshi, ek khaata</h3>
     <p>N = key ki replica copies. W = write poora maanne ke liye kitne replies; R = read par kitne replies chahiye. Ack ka matlab replica ka confirmation.</p>
     <p>Teen munshiyon ke paas ek hi khaate ki copy hai. Tumne naya hisaab sirf ek munshi ko bataya (W = 1). Phir doosre munshi se poochha (R = 1). Jawab: purana hisaab.</p>
     <p>Is model mein writes ek-ek karke hoti hain. W aur R ka niyam write se pehle tay hai; replicas wahi teen hain. Sirf config badalne se purana write zyada replicas par nahi pahunchta.</p>
     <p>Ab har nayi baat do munshiyon ko batao (W = 2) aur do se poochho (R = 2). Teen mein se do + do = kam se kam ek munshi dono baar common. Taaza jawab pakka.</p>
     <p class="tip">🎯 <b>Asli baat:</b> <b>R + W &gt; N</b> ho toh har read kam se kam ek aise replica ko chhoota hai jisne aakhri write dekha. Ise <b>quorum overlap</b> kehte hain.</p>`,
    `<h3>🏗️ Dhaancha</h3>
     <pre>client → koi bhi node (coordinator) → key ka hash → ring par agle N = 3 replicas
put: W replicas ka "ho gaya" (ack) aane tak ruko
get: R replicas se jawab, sabse naya version lo</pre>
     <table>
       <tr><th>Setting</th><th>Faayda</th><th>Keemat</th></tr>
       <tr><td>W = 1, R = 1</td><td>Sabse tez</td><td>Purana padh sakte ho</td></tr>
       <tr><td>W = 2, R = 2 (N = 3)</td><td>Overlap; ek replica gire tab bhi chale</td><td>Har call par 2 ka intezaar</td></tr>
       <tr><td>W = 3, R = 1</td><td>Read tez aur taaza</td><td>Ek replica gira toh writes band</td></tr>
     </table>
     <p>Partitioning ke liye consistent hashing aur virtual nodes — data track ke <code>conshash</code> level mein dekha tha.</p>`,
    `<h3>🩹 Replica gira toh?</h3>
     <ul>
       <li><b>Hinted handoff:</b> replica down hai toh write kisi aur node par "ye B ka hai" note ke saath. B lautne par saunp do. Availability bachti hai.</li>
       <li><b>Read repair:</b> read mein koi replica purana mila toh usi waqt taaza kar do.</li>
       <li><b>Anti-entropy:</b> peeche se replicas ka farak dhoondh ke milao. <b>Merkle tree</b> (hashes ka ped) se poora data bheje bina farak mil jaata hai.</li>
     </ul>
     <p>⚠️ Dynamo jaisa <b>sloppy quorum</b> (doosre node par likhna) availability badhata hai, par R + W &gt; N ka overlap tab pakka nahi rehta.</p>`,
    `<h3>⚔️ Conflicts</h3>
     <p>Network toota. Do clients ne alag replicas par ek hi key alag-alag likhi. Ab do versions.</p>
     <table>
       <tr><th>Tareeka</th><th>Kaise</th><th>Keemat</th></tr>
       <tr><td><b>Last-write-wins</b></td><td>Bada timestamp jeete</td><td>Aasaan; ek write chupchaap kho jaata hai, ghadiyon ka farak bhi</td></tr>
       <tr><td><b>Vector clocks</b></td><td>Dono versions client ko; client merge kare</td><td>Concurrent versions pehchaano; app merge kare. Galat merge se data kho ya hataaya item laut sakta hai</td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — stale read pakdo, quorum se theek karo',
      goal: 'Key <code>balance:aman</code> teen replicas (a, b, c) par hai, sab par ₹100. Abhi W = 1, R = 1. Naya balance likho aur turant padho. Phir quorum lagao (R + W &gt; N), naya balance likho aur dobara padho.',
      sys: { name: 'kv-store' },
      placeholder: 'kv put | get | config | status …',
      tasks: T_KV,
      success: SD.allTasks(T_KV),
      verify: s => s.sys.kv.w + s.sys.kv.r > s.sys.kv.n && T_KV[4].check(s),
      solution: [
        'kv put aman 500',
        'kv get aman',
        'kv config --w 2 --r 2',
        'kv put aman 700',
        'kv get aman',
      ],
      successText: 'W = 2, R = 2: har read kam se kam ek taaza replica tak pahuncha, isliye ₹700 mila. W = 1, R = 1 par ₹100 (stale) aaya tha. Keemat: har write aur read par 2 replicas ka intezaar, aur 2 replicas gire toh writes band.',
      hints: [
        'Pehle W = 1 par likho aur R = 1 par padho. Kya naya balance dikha? Phir R + W ko N se bada karo.',
        '`kv put aman <rupaye>` W replicas par likhta hai. `kv get aman` R replicas padhta hai (model sabse peeche wale replica pehle chunta hai). `kv config --w <1-3> --r <1-3>` quorum badalta hai. `kv status` replicas dikhata hai.',
        'Poora raasta — har command alag Enter se chalao:\nkv put aman 500\nkv get aman\nkv config --w 2 --r 2\nkv put aman 700\nkv get aman',
      ],
    },
    {
      type: 'quiz',
      title: 'KV store ke deep-dive sawaal',
      questions: [
        {
          q: 'N = 3, W = 3, R = 1. Ek replica gir gaya. Kya hoga?',
          choices: [
            'Writes fail honge (3 acks nahi milenge); reads chalte rahenge',
            'Kuch nahi badlega; system apne aap W ko 2 kar dega',
            'Reads fail honge, writes chalte rahenge kyunki W bada hai',
            'Dono band; ek replica girne se poora cluster rukta hai',
          ],
          answer: 0,
          explain: 'W = 3 ka matlab teeno replicas ka ack. Ek gira toh write poora nahi hota. R = 1 ke liye ek zinda replica kaafi. Isliye W = 2, R = 2 aam pasand: ek replica gire tab bhi dono chalte hain.',
          choiceExplanations: [
            'W = 3 ka matlab teeno replicas ka ack. Ek gira toh write poora nahi hota. R = 1 ke liye ek zinda replica kaafi. Isliye W = 2, R = 2 aam pasand: ek replica gire tab bhi dono chalte hain.',
            'Strict quorum apne aap W nahi ghataata. Sloppy quorum alag design hai.',
            'Read ke liye ek replica kaafi hai; write ko teen chahiye.',
            'Reads chalte hain; sirf writes rukte hain.',
          ],
        },
        {
          q: 'Shopping cart: network toota, do devices ne alag items daale. LWW ya merge?',
          choices: [
            'Merge: vector clocks se dono versions, dono items rakho',
            'LWW: bada timestamp jeete; ek item gaya toh user dobara daal dega',
            'Dono versions mita do aur cart khaali kar do, taaki takraav na rahe',
            'Pehla write jeete; jo baad mein aaya, use error do',
          ],
          answer: 0,
          explain: 'Cart mein item chupchaap khona bura hai (bikri gayi). Dynamo ne isi liye conflicting versions client ko diye aur cart merge kiya. Keemat: kabhi hataaya hua item wapas aa sakta hai.',
          choiceExplanations: [
            'Cart mein item chupchaap khona bura hai (bikri gayi). Dynamo ne isi liye conflicting versions client ko diye aur cart merge kiya. Keemat: kabhi hataaya hua item wapas aa sakta hai.',
            'LWW mein ek device ka item chupchaap gaya. User ko pata hi nahi chalega.',
            'Dono khona sabse bura.',
            'Network toote waqt "pehla" kaun tha, ye tay karna hi mushkil hai.',
          ],
        },
        {
          q: 'Replica B 2 ghante down raha. Lauta toh purana data. Kaise taaza karoge?',
          choices: [
            'Hinted handoff se ruke writes lo; baaki farak anti-entropy (Merkle tree) se',
            'Poora data doosre replica se copy karo, har baar, chahe farak chhota ho',
            'Kuch nahi; agle writes se dheere-dheere apne aap theek ho jaayega',
            'B ko hata do aur naya replica banao; purana replica bharose ka nahi',
          ],
          answer: 0,
          explain: 'Hinted handoff us samay ke writes lauta deta hai. Merkle tree hashes ka ped hai: sirf woh hisse bhejo jinke hash alag hain. Poora copy bekaar ka network kharcha.',
          choiceExplanations: [
            'Hinted handoff us samay ke writes lauta deta hai. Merkle tree hashes ka ped hai: sirf woh hisse bhejo jinke hash alag hain. Poora copy bekaar ka network kharcha.',
            'Terabytes copy karna jab farak kuch MB ka ho — bekaar.',
            'Jin keys par naya write nahi aaya, woh hamesha purani rahengi.',
            'Do ghante ka down replica normal baat hai; mitaane ki zaroorat nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — KV store',
    instructions: 'Dynamo-style store ke classic sawaal. 🎤',
    questions: [
      {
        q: 'N = 3. Kam latency aur taaza reads dono chahiye. W aur R?',
        choices: [
          'W = 2, R = 2: overlap pakka, ek replica gire tab bhi dono chalein',
          'W = 1, R = 1: sabse tez, aur taaza reads apne aap mil jaayenge',
          'W = 3, R = 3: sabse pakka; latency ki chinta mat karo',
          'W = 0, R = 1: write ka intezaar hi mat karo',
        ],
        answer: 0,
        explain: '2 + 2 > 3, toh overlap. Asli store mein pehle 2 replies ka intezaar. Mission jaan-boojhkar sabse purane replicas padhta hai. Ek replica down ho tab bhi quorum milta hai.',
        choiceExplanations: [
          '2 + 2 > 3, toh overlap. Asli store mein pehle 2 replies ka intezaar. Mission jaan-boojhkar sabse purane replicas padhta hai. Ek replica down ho tab bhi quorum milta hai.',
          '1 + 1 = 2, overlap nahi — mission mein stale read dekha.',
          'Teeno ka intezaar: sabse dheema replica latency tay karega, aur ek gira toh sab band.',
          'Ack ke bina write kho sakta hai.',
        ],
      },
      {
        q: 'Interviewer: "Ye CAP mein kahan hai?" Kya bologe?',
        choices: [
          'Partition par Dynamo availability chunta hai (AP); R/W se consistency ka dial',
          'CP; quorum har haal mein linearizable reads deta hai, partition mein bhi',
          'CA; partitions data center mein hote hi nahi',
          'CAP purana hai; aaj ke systems teeno ek saath dete hain',
        ],
        answer: 0,
        explain: 'Dynamo jaisa store partition mein bhi writes leta hai (sloppy quorum, hinted handoff) — availability. R aur W se tum consistency aur latency ka santulan chunte ho. PACELC mein: bina partition ke bhi latency vs consistency.',
        choiceExplanations: [
          'Dynamo jaisa store partition mein bhi writes leta hai (sloppy quorum, hinted handoff) — availability. R aur W se tum consistency aur latency ka santulan chunte ho. PACELC mein: bina partition ke bhi latency vs consistency.',
          'Sloppy quorum aur LWW ke saath quorum bhi linearizability nahi deta.',
          'Network partition har bade system mein hota hai.',
          'Partition ke waqt consistency aur availability mein chunna padta hai.',
        ],
      },
    ],
  },
  success: [
    'R + W > N ka overlap samjhana aur mission mein dikhana',
    'Replica girne par handoff, read repair aur anti-entropy batana',
    'LWW aur vector clocks mein se chunna',
  ],
  homework: `Kaagaz par teen replicas banao. W = 1, R = 1 ke saath 3 writes aur 3 reads ka koi kram likho jismein purana padha jaaye.
    Phir pehle W = 2, R = 2 tay karo; har write poori hone par read karo. Fixed replicas par overlap kyun milta hai? Sirf config badal kar purana write padhne par kya hoga?`,
  cards: [
    { front: 'R + W > N?', back: 'Fixed replicas aur poori hui serial writes mein: read R + us write ka W > N ho toh ek replica common.' },
    { front: 'Hinted handoff?', back: 'Replica down: write doosre node par note ke saath; lautne par saunp do.' },
    { front: 'Merkle tree?', back: 'Hashes ka ped; replicas ka farak bina poora data bheje dhoondho.' },
    { front: 'LWW vs vector clocks?', back: 'LWW aasaan, par ek write chupchaap khota. Vector clocks dono versions, client merge kare.' },
  ],
},

/* ---------------------------------------------------------------- BOSS */
{
  id: 'boss-iv',
  icon: '👑',
  title: 'Boss — Mock interview: 24 ghante wali Stories',
  badge: 'Interview Ishwar',
  objectives: [
    'Poora interview ek level mein: requirements, numbers, design, twists',
    'Media upload, story tray, 24 ghante ki expiry, views',
    'Interviewer ke twists: celebrity views, close friends, highlights',
  ],
  lesson: [
    `<h3>🎤 Interviewer: "Design Instagram-style Stories."</h3>
     <p>Story = photo ya chhota video jo <b>24 ghante</b> baad gayab. Upar ek "tray" mein jinhe follow karte ho unki stories. Har story par "kisne dekha" ki list.</p>
     <p>Is level mein poora interview: pehle requirements chhaanto, phir numbers, phir design canvas, phir interviewer ke twists.</p>
     <p class="tip">🎯 Pichhle levels ki cheezein yahan judti hain: media upload (presigned URL), feed jaisa fanout, expires_at se access expiry, TTL se cleanup, hot key (celebrity views), aur CDN.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Requirements chhaanto',
      instructions: 'Stories ke liye: functional, non-functional, ya scope se bahar?',
      bins: [
        { id: 'fn', label: '🧩 Functional' },
        { id: 'nfn', label: '📏 Non-functional' },
        { id: 'out', label: '🚫 Scope se bahar' },
      ],
      items: [
        { text: 'User photo ya 15 second ka video story mein daal sake', bin: 'fn', explain: 'Core kaam.' },
        { text: 'Story 24 ghante baad apne aap gayab', bin: 'fn', explain: 'Product ki pehchaan — functional.' },
        { text: 'Tray 200 ms ke andar khule (p99)', bin: 'nfn', explain: 'Kitna tez — non-functional.' },
        { text: 'Story ka maalik dekh sake ki kisne dekhi', bin: 'fn', explain: 'Viewer list — functional.' },
        { text: '50 crore daily users', bin: 'nfn', explain: 'Paimana.' },
        { text: 'Video bina atke chale, kamzor network par bhi', bin: 'nfn', explain: 'Quality aur latency — CDN aur resolutions.' },
        { text: 'Stories par AR filters ka editor', bin: 'out', explain: 'Client ka bada feature; interview ke design ka hissa nahi.' },
        { text: 'Ads ko stories ke beech daalna', bin: 'out', explain: 'Alag system. Bata ke bahar rakho.' },
      ],
    },
    {
      type: 'estimate',
      title: 'Numbers — sirf jo design badlein',
      goal: 'Teen numbers nikaalo: kitni stories, kitna storage, kitne views.',
      problems: [
        {
          q: '50 crore daily users, 30% roz ek story daalte hain. Stories/din — CRORE mein?',
          unit: 'crore',
          given: ['50 crore users', '30% post karte hain'],
          answer: 15,
          tol: 0.05,
          steps: ['50 crore × 0.3 = 15 crore stories/din'],
          lesson: 'Writes: 15 crore/din ≈ 1,700/second average.',
        },
        {
          q: 'Har story average ~1 MB. Roz kitna naya storage — TB mein? (1 TB = 10 lakh MB)',
          unit: 'TB',
          given: ['15 crore stories', '1 MB per story', '1 TB = 10,00,000 MB'],
          answer: 150,
          tol: 0.05,
          steps: ['15 crore × 1 MB = 15,00,00,000 MB', '15,00,00,000 ÷ 10,00,000 = 150 TB'],
          lesson: '150 TB roz — media object storage aur CDN mein, DB mein nahi. Retention bounded ho toh storage ka badhna ruk sakta hai. Lifecycle cleanup async hai; replicas, highlights aur versions ka storage alag jodo.',
        },
        {
          q: 'Har user roz 20 stories dekhta hai. Kul views/din — CRORE mein?',
          unit: 'crore',
          given: ['50 crore users', '20 views per user'],
          answer: 1000,
          tol: 0.05,
          steps: ['50 crore × 20 = 1,000 crore views/din'],
          lesson: 'Views writes se ~67 guna. Read-heavy — CDN aur tray cache ka kaam. Viewer list likhna bhi bada kaam hai.',
        },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — Stories',
      instructions: 'Har slot par sahi chunav. Review mein saare options ka "kyun" padho.',
      brief: `50 crore daily users, 15 crore stories/din (~150 TB), 1,000 crore views/din.
        Story 24 ghante baad gayab. Tray p99 200 ms. Celebrities ke crore followers.`,
      requirements: ['Media upload tez aur sasta', 'Tray 200 ms', '24 ghante mein expiry', 'Celebrity views sambhalna'],
      pass: 14,
      slots: [
        {
          id: 'upload', label: 'Media upload', icon: '📤',
          options: [
            { id: 'presign', label: 'Presigned URL: client seedha storage par', score: 3, why: 'App servers bhaari bytes nahi uthate. Upload ke baad CDN se delivery.' },
            { id: 'app', label: 'Video app servers ke through upload karo', score: -2, why: '150 TB/din app servers se — CPU, memory aur bandwidth ka bojh.' },
            { id: 'db', label: 'Video ko DB mein blob column mein rakho', score: -3, why: 'DB bhaari files ke liye nahi; backups aur replicas phat jaayenge.' },
          ],
        },
        {
          id: 'tray', label: 'Story tray kaise bane', icon: '🎞️',
          options: [
            { id: 'index', label: 'Read par: followees ka active-story index', score: 3, why: 'Jinhe follow karte ho unke "aakhri story kab" ka chhota index; celebrities par push ka pahaad nahi.' },
            { id: 'push', label: 'Har story har follower ki inbox mein push', score: -1, why: 'Aam users par theek, celebrity ke crore followers par writes ka pahaad.' },
            { id: 'scan', label: 'Har tray open par poori stories table scan', score: -3, why: 'Har open par bhaari query — 200 ms mein nahi.' },
          ],
        },
        {
          id: 'expiry', label: '24 ghante ki expiry', icon: '⏳',
          options: [
            { id: 'ttl', label: 'Read par expires_at check + TTL; media lifecycle', score: 3, why: 'API har read par expires_at jaanche. TTL cleanup aur S3 lifecycle baad mein ho sakte hain; CDN aur media access bhi expiry par roko.' },
            { id: 'cron', label: 'Har minute cron job poori stories table scan kare', score: -2, why: 'Bhaari scan; 15 crore rows/din par bojh aur der.' },
            { id: 'hide', label: 'Kabhi delete mat karo; sirf UI mein chhupao', score: -2, why: 'Storage roz 150 TB badhta jaayega, aur privacy ka vaada toota.' },
          ],
        },
        {
          id: 'views', label: 'Views aur viewer list', icon: '👀',
          options: [
            { id: 'async', label: 'Views event queue mein; viewer list async likho', score: 3, why: 'Dekhna tez; list thodi der se bhi chalegi. Counter sharded.' },
            { id: 'sync', label: 'Har view par story row ka counter sync UPDATE', score: -3, why: 'Celebrity story ek garam row — lakhon updates, locks.' },
            { id: 'none', label: 'Viewer list mat rakho; sirf kul ginti', score: -2, why: 'Product ka requirement tha: maalik dekhe kisne dekha.' },
          ],
        },
        {
          id: 'cdn', label: 'Media delivery', icon: '🌍',
          options: [
            { id: 'cdn', label: 'CDN + kai resolutions; network ke hisaab se', score: 3, why: '1,000 crore views ka bojh edge par; kamzor network par chhota version.' },
            { id: 'origin', label: 'Har view seedha origin storage se', score: -2, why: 'Origin aur egress ka bill phatega; door ke users dheeme.' },
            { id: 'one', label: 'Sirf ek bada resolution, sab ke liye wahi', score: -1, why: 'Kamzor network par video atkega.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Presigned upload, read par tray index, TTL + lifecycle, async views aur CDN. Har faisla numbers se nikla.',
        ok: '👍 Zyadatar sahi. Ek chunav kisi ek jagah bojh ko phula raha hai — numbers dobara dekho.',
        bad: '🤔 Numbers yaad karo: 150 TB/din aur 1,000 crore views/din. Bhaari kaam app servers ya DB par nahi.',
      },
    },
    {
      type: 'quiz',
      title: 'Interviewer ke twists',
      questions: [
        {
          q: 'Celebrity ki story: pehle ghante mein 5 crore views. Kya tootega aur kaise bachaoge?',
          choices: [
            'Views counter garam key: sharded counters ya async jod; media CDN se',
            'Kuch nahi tootega; DB ki ek row 5 crore updates aaram se sambhal leti hai',
            'Celebrity ki story ko sirf aadhe followers ko dikhao, load aadha',
            'Views ginna band karo jab story bahut popular ho jaaye',
          ],
          answer: 0,
          explain: 'Ek row par lakhon writes = hot key. Counter ko kai shards mein baanto (ya events se async jodo). Media toh CDN se jaayega hi.',
          choiceExplanations: [
            'Ek row par lakhon writes = hot key. Counter ko kai shards mein baanto (ya events se async jodo). Media toh CDN se jaayega hi.',
            'Ek row par itne updates locks aur latency ka pahaad hain.',
            'Product todna design ka jawab nahi.',
            'Celebrity ko apni ginti chahiye — wahi product hai.',
          ],
        },
        {
          q: 'Naya feature: story sirf "close friends" ke liye. Kya badlega?',
          choices: [
            'Story par audience; tray aur har media request par viewer/session check',
            'Sirf app mein story chhupao; server par kuch badalne ki zaroorat nahi',
            'Close friends ki stories alag app mein daalo',
            'Media ka URL lamba aur random rakho; koi guess nahi karega',
          ],
          answer: 0,
          explain: 'Server audience jaanchkar media access de. Signed URL bearer permission hai: link paane wala expiry tak dekh sakta hai. Sakht close-friends access ke liye har media request par viewer/session jaancho; URL expiry story expiry se aage na ho.',
          choiceExplanations: [
            'Server audience jaanchkar media access de. Signed URL bearer permission hai: link paane wala expiry tak dekh sakta hai. Sakht close-friends access ke liye har media request par viewer/session jaancho; URL expiry story expiry se aage na ho.',
            'App chhupaaye par API de de toh koi bhi dekh lega. Security track ka BOLA yaad karo.',
            'Alag app se data model nahi badalta.',
            'Lamba URL guess mushkil karta hai, par forward hua link kaam karega. Signed URL bhi expiry tak forward ho sakta hai. Sakht rok ke liye viewer/session check chahiye.',
          ],
        },
        {
          q: 'User ne story ko "Highlight" mein daala. 24 ghante baad media delete hona tha. Ab?',
          choices: [
            'Highlight ka alag reference; lifecycle us media ko na hataaye',
            'Highlight bhi 24 ghante mein gayab; product ko yahi samjhao',
            'Highlight ke liye media dobara upload karwao',
            'Expiry hi band kar do; sab stories saalon tak rakho',
          ],
          answer: 0,
          explain: 'Expiry "story" ki hai, media ki nahi. Highlight media ko refer kare toh lifecycle us object ko na hataaye (alag lifecycle prefix/tag; app reference count se retention tag badle). Baaki stories ka media waise hi jaaye.',
          choiceExplanations: [
            'Expiry "story" ki hai, media ki nahi. Highlight media ko refer kare toh lifecycle us object ko na hataaye (alag lifecycle prefix/tag; app reference count se retention tag badle). Baaki stories ka media waise hi jaaye.',
            'Highlight ka matlab hi rakhna hai.',
            'User par bojh, aur network ka bekaar kharcha.',
            'Roz 150 TB jodte jaoge, aur privacy ka vaada toota.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Wrap-up',
    instructions: 'Interview ke aakhri do minute. 🎤',
    questions: [
      {
        q: 'Aakhir mein interviewer: "Kuch aur?" Sabse achha jawab?',
        choices: [
          'Design ka saar, sabse bada risk, aur aur samay hota toh kya gehra karte',
          'Kuch nahi; design poora hai, koi kamzori nahi',
          'Naye features ki lambi list jo design mein nahi hain',
          'Interviewer se poochho ki tumhara design unki company jaisa hai ya nahi',
        ],
        answer: 0,
        explain: 'Saar dikhata hai ki tum badi tasveer dekhte ho. Risk aur agle kadam dikhate hain ki tum apne design ki kamzori jaante ho — seniority ka sabse saaf ishara.',
        choiceExplanations: [
          'Saar dikhata hai ki tum badi tasveer dekhte ho. Risk aur agle kadam dikhate hain ki tum apne design ki kamzori jaante ho — seniority ka sabse saaf ishara.',
          'Har design ki kamzori hoti hai. "Koi nahi" kehna ulta asar karta hai.',
          'Scope phailaana aakhri minute ka galat istemaal.',
          'Interview tumhari soch ka hai.',
        ],
      },
      {
        q: 'Poore track ka ek sabak?',
        choices: [
          'Requirements → numbers → design → bottleneck; har faisle ki keemat bolo',
          'Sabse naye tools ke naam lo; interviewer technology dekhta hai',
          'Ek hi standard design yaad karo aur har sawaal par wahi lagao',
          'Numbers aur trade-offs chhod do; diagram sundar ho toh kaafi',
        ],
        answer: 0,
        explain: 'Har classic design isi dhaanche se nikla: feed, limiter, typeahead, notifications, payments, KV store, stories. Faisla numbers se, aur keemat ke saath.',
        choiceExplanations: [
          'Har classic design isi dhaanche se nikla: feed, limiter, typeahead, notifications, payments, KV store, stories. Faisla numbers se, aur keemat ke saath.',
          'Tools ke naam bina wajah ke buzzwords lagte hain.',
          'Har sawaal ka bottleneck alag hai. Rata hua design galat jagah tootega.',
          'Numbers aur trade-offs hi interview ka dil hain.',
        ],
      },
    ],
  },
  success: [
    'Poora mock interview: requirements se twists tak',
    'Media, fanout, expiry aur hot key ko ek design mein jodna',
    'Wrap-up mein saar, risk aur agle kadam bolna',
  ],
  homework: `Ek dost ke saath 45 minute ka mock interview karo: "Design WhatsApp status" ya "Design Snapchat stories".
    Interviewer ko teen twists de do: celebrity, close friends, highlights. Har twist par tumhara jawab ek line mein likho.`,
  cards: [
    { front: 'Stories ke teen numbers?', back: '15 crore stories/din, ~150 TB/din, 1,000 crore views/din (kalpanik).' },
    { front: 'Media upload?', back: 'Presigned URL se seedha object storage; CDN se delivery.' },
    { front: '24 ghante expiry?', back: 'Read par expires_at check. TTL/lifecycle baad mein cleanup; CDN/media access bhi expire. Highlights ka retention alag.' },
    { front: 'Celebrity views?', back: 'Hot key: sharded counter ya async jod. Viewer list async.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['iv-kvstore'] = {
  t: 'Quorum: R + W > N',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ W = 1, R = 1</span>
        <div class="dg-cap">put ₹500 → sirf a. get → b se: ₹100 (stale). 1 + 1 = 2 ≤ 3, overlap nahi.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ W = 2, R = 2</span>
        <div class="dg-cap">put ₹700 → a, b. get → c aur a: ₹700. 2 + 2 = 4 &gt; 3, kam se kam ek common.</div>
      </div>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">hinted handoff</span><span class="dg-pill">read repair</span><span class="dg-pill">anti-entropy (Merkle tree)</span>
    </div>`,
};
VISUALS['boss-iv'] = {
  t: 'Stories: upload, tray, expiry, views',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">📱 app</span><span class="dg-arrow">→ presigned URL →</span>
      <span class="dg-pill acc">🪣 object storage</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🌍 CDN (kai resolutions)</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">🎞️ tray: followees ka active-story index</span>
      <span class="dg-pill gold">⏳ 24 h access expiry; cleanup async</span>
      <span class="dg-pill">👀 views: queue → async list, sharded counter</span>
    </div>
    <div class="dg-cap">15 crore stories/din · ~150 TB/din · 1,000 crore views/din (kalpanik).</div>`,
};

SD.addScenes({
  'iv-kvstore': {
    intro: 'Key <b>balance:aman</b> teen replicas par: a, b, c. Sab par ₹100. Abhi W = 1, R = 1.',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '💻', label: 'Client', tone: 'accent' },
      { id: 'coord', col: 1, row: 1, icon: '🧭', label: 'Coordinator' },
      { id: 'a', col: 2, row: 0, icon: '🗄️', label: 'Replica a', sub: '₹100 (v1)' },
      { id: 'b', col: 2, row: 1, icon: '🗄️', label: 'Replica b', sub: '₹100 (v1)' },
      { id: 'c', col: 2, row: 2, icon: '🗄️', label: 'Replica c', sub: '₹100 (v1)' },
    ],
    steps: [
      { from: 'client', to: 'coord', label: 'put ₹500 (W=1)', say: 'Client naya balance ₹500 bhejta hai. W = 1: ek ack kaafi.' },
      { from: 'coord', to: 'a', label: 'likho', tone: 'good', set: { a: { tone: 'good', sub: '₹500 (v2)' } }, say: 'Replica a ne likha aur ack diya. b aur c tak replication abhi nahi pahuncha.' },
      { from: 'coord', to: 'b', label: 'get (R=1)', tone: 'bad', set: { b: { tone: 'bad', sub: '₹100 — stale!' } }, say: 'Read R = 1: coordinator ne b se poochha. Jawab ₹100 — purana. 1 + 1 = 2, overlap ki guarantee nahi.' },
      { at: ['coord'], set: { coord: { tone: 'gold', sub: 'W = 2, R = 2' } }, say: 'Quorum lagao: W = 2, R = 2. 2 + 2 = 4, jo 3 se bada hai.' },
      { from: 'coord', to: 'b', label: 'put ₹700 → a, b', tone: 'good', set: { a: { tone: 'good', sub: '₹700 (v3)' }, b: { tone: 'good', sub: '₹700 (v3)' } }, say: 'Naya balance ₹700 do replicas par: a aur b.' },
      { from: 'coord', to: 'c', label: 'get → c + a', set: { c: { tone: 'bad', sub: '₹100 (purana)' } }, say: 'Read do replicas se: c (purana) aur a (naya). Teen mein se do + do = kam se kam ek common.' },
      { at: ['client'], set: { client: { tone: 'good', sub: '₹700 mila' } }, say: 'Coordinator sabse naya version chunta hai: ₹700. Read repair c ko bhi taaza kar sakta hai.' },
    ],
  },
  'boss-iv': {
    intro: 'Interviewer: <b>"Design Instagram-style Stories."</b> 50 crore daily users.',
    nodes: [
      { id: 'app', col: 0, row: 0, icon: '📱', label: 'Riya ki app', tone: 'accent' },
      { id: 'api', col: 1, row: 0, icon: '⚙️', label: 'stories-api' },
      { id: 'meta', col: 2, row: 0, icon: '🗄️', label: 'Story metadata', sub: 'TTL 24 ghante' },
      { id: 'tray', col: 3, row: 0, icon: '🎞️', label: 'Tray index cache' },
      { id: 'obj', col: 0, row: 1, icon: '🪣', label: 'Object storage', sub: '~150 TB/din' },
      { id: 'cdn', col: 1, row: 1, icon: '🌍', label: 'CDN' },
      { id: 'views', col: 2, row: 1, icon: '👀', label: 'Views queue', sub: 'async list' },
    ],
    steps: [
      { from: 'app', to: 'api', label: 'upload chahiye', say: 'Riya story daalna chahti hai. stories-api ek presigned URL deta hai.' },
      { from: 'app', to: 'obj', label: 'seedha upload', tone: 'good', say: 'Video seedha object storage par jaata hai. App servers bhaari bytes nahi uthate.' },
      { from: 'api', to: 'meta', label: 'story row (TTL)', say: 'Metadata row 24 ghante ke TTL ke saath. Storage ka lifecycle rule media ko baad mein hatata hai.' },
      { from: 'meta', to: 'tray', label: 'Riya: active story', say: 'Tray index mein "Riya ki aakhri story kab" update. Followers ka tray isi index se banta hai.' },
      { from: 'obj', to: 'cdn', label: 'kai resolutions', tone: 'good', say: 'Dekhne wale CDN se video lete hain — kamzor network par chhota version.' },
      { from: 'cdn', to: 'views', label: 'view event', say: 'Har view ek event; viewer list async likhi jaati hai. Celebrity ke liye counter sharded.' },
      { at: ['meta'], set: { meta: { tone: 'gold', sub: '24 ghante baad gayab' } }, say: '24 ghante par API expires_at se story chhupaaye; CDN/media access bhi expire ho. TTL aur lifecycle cleanup baad mein ho sakta hai. Highlights ka retention tag alag rakho.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-iv-kvstore', levels: 'iv-kvstore', guide: {
    title: 'Tez reads ya taaza reads?',
    misaal: 'Fixed replicas aur ek-ek karke poori hoti writes maano. Teen munshiyon mein se ek ko batao aur doosre se poochho toh purana jawab. Do ko batao, do se poochho — ek munshi common, jawab taaza.',
    asli: 'W aakhri successful write ka hai, R read ka. Fixed replica set par R + W > N overlap deta hai; concurrent writes ka conflict alag sambhaalo. W aur R se latency, consistency aur availability ka santulan chunte ho. Failures ke liye handoff, read repair aur anti-entropy.',
    points: [
      '<b>Quorum:</b> N = 3 par W = 2, R = 2 aam.',
      '<b>Failure:</b> hinted handoff, read repair, Merkle tree.',
      '<b>Conflict:</b> LWW aasaan par write khota; vector clocks merge.',
    ],
    use: 'Bahut bada, highly available key-value data jahan partition mein bhi writes chahiye.',
    avoid: 'Sloppy quorum ke saath R + W > N ko linearizable read mat samjho.',
    mistake: 'W = 1, R = 1 rakh ke maan lena ki reads taaza hain.',
    compare: [
      { choice: 'W = 1, R = 1', when: 'Latency sabse zaroori, thoda purana chalega', tradeoff: 'Sabse tez; stale reads' },
      { choice: 'W = 2, R = 2 (N = 3)', when: 'Taaza reads aur ek replica ke girne ki chhoot', tradeoff: 'Overlap; har call par 2 ka intezaar' },
    ],
    followup: 'Do data centers, har ek mein 3 replicas. Quorum kaise rakhoge ki ek data center gire tab bhi writes chalein?',
    sources: ['dynamo', 'karger'],
  } },
  { id: 'pro-iv-boss', levels: 'boss-iv', guide: {
    title: 'Ek bada design: kahan se shuru?',
    misaal: 'Halwai pehle mehmaan ginta hai, phir menu, phir rasoi. Stories mein bhi pehle requirements aur numbers, phir boxes.',
    asli: 'Mock interview mein sab hisse judte hain: requirements, numbers, design (upload, tray, expiry, views, CDN), aur twists.',
    points: [
      '<b>Numbers se faisle:</b> 150 TB/din = object storage; 1,000 crore views = CDN.',
      '<b>Expiry:</b> read par expires_at; TTL/lifecycle cleanup async. Highlights ke retention tags alag.',
      '<b>Twists:</b> hot key, authorization, references.',
    ],
    use: 'Kisi bhi media-heavy, read-heavy product ke interview mein.',
    avoid: 'Media ko app servers ya DB se guzaarna.',
    mistake: 'Twist aane par design todna; behtar hai design ko badhaana.',
    compare: [
      { choice: 'Read par tray index', when: 'Celebrities aur bahut followers', tradeoff: 'Writes sasti; tray banana thoda kaam' },
      { choice: 'Write par push', when: 'Followers kam, tray bahut tez chahiye', tradeoff: 'Tray seedha; celebrity par writes ka pahaad' },
    ],
    followup: 'Story mein music bhi lagta hai, aur kuch deshon mein license alag hai. Design mein kahan check lagaoge?',
    sources: [
      'blobs',
      { title: 'Amazon S3 — Managing your storage lifecycle', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html' },
    ],
  } },
);
})();
