/* =====================================================================
   TRACK — 🤖 AI Companies · DeepSeek: patli wire, tez dimaag

   Source: "DeepSeek Built with JUST $5 Million" (Akhil Sharma).
   Core faisla: HARDWARE-AWARE CO-DESIGN — model aur hardware strategy ek
   hi cheez; har layer poochhti hai "chips ke beech kam se kam data kaise?"
   Docker lab: docker-labs/30-deepseek
   ===================================================================== */
(function () {

VISUALS['ds-constraint'] = {
  t: 'Compute poora, wire patli',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🚫 Constraint</span>
        <div class="dg-cap">US export controls → H100 nahi. H800: <b>compute wahi</b>, par chip-to-chip interconnect
          bandwidth jaan-boojh ke kam. Badi training = compute jitni hi <b>communication</b> ki problem.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🧠 Jawab: co-design</span>
        <div class="dg-cap">Tez wire khareed nahi sakte → har layer par poochho: <b>chips ke beech kam data kaise bhejein?</b></div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-accent"><span class="ni">🧩</span><span class="nl">MoE</span><span class="ns">671B params, sirf ~37B har token par</span></div>
      <div class="dg-node is-accent"><span class="ni">🔀</span><span class="nl">Compute/comm overlap</span><span class="ns">bhejte waqt agla compute</span></div>
      <div class="dg-node is-gold"><span class="ni">8️⃣</span><span class="nl">FP8</span><span class="ns">aadhe bytes wire par</span></div>
      <div class="dg-node is-good"><span class="ni">🗜️</span><span class="nl">MLA</span><span class="ns">KV cache chhota — serving sasta</span></div>
    </div>`,
};

VISUALS['ds-moe'] = {
  t: 'Mixture of Experts — bade dimaag ka chhota hissa',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-bad\"><span class=\"bx-label\">🏋️ Dense 400B</span>\n        <div class=\"dg-cap\">Har token par saare 400B parameters chalte hain — training mein bhi, serving mein bhi, hamesha.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🧩 MoE 671B</span>\n        <div class=\"dg-cap\">Bahut saare chhote experts; <b>router</b> har token ke liye kuch hi chunta hai →\n          ~37B (~5.5%) active. Capacity badi, kharcha chhota.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-ladder\">\n      <div class=\"dg-rung\"><span class=\"lv\">free</span><span class=\"cmd\">Sirf pasand se chuno</span><span class=\"q\">lab: ek expert average se 12.4× busy, 39 khaali</span></div>\n      <div class=\"dg-rung a\"><span class=\"lv\">aux</span><span class=\"cmd\">Loss mein penalty</span><span class=\"q\">balance aata hai, par router ki pasand hi badal jaati hai</span></div>\n      <div class=\"dg-rung g\"><span class=\"lv\">bias</span><span class=\"cmd\">Sirf chunne mein bias (loss-free)</span><span class=\"q\">DeepSeek-V3: balance + zyada pasand bachi</span></div>\n    </div>",
};

VISUALS['ds-mla-fp8'] = {
  t: 'Training ek baar, serving hamesha',
  html: "\n    <div class=\"dg-split\">\n      <div class=\"dg-box is-gold\"><span class=\"bx-label\">🏋️ Training bill (ek baar)</span>\n        <div class=\"dg-cap\">Reported V3 official training compute estimate ~$5.576M; wider R&amp; D, staff aur serving cost alag.</div></div>\n      <div class=\"dg-box is-good\"><span class=\"bx-label\">🔁 Serving bill (har request, hamesha)</span>\n        <div class=\"dg-cap\">KV cache lambi baat ke saath badhta hai. MLA: K/V ek chhote latent mein → lab: MHA se 57× chhota.</div></div>\n    </div>\n    <div class=\"dg-rule\"></div>\n    <div class=\"dg-stack\">\n      <div class=\"dg-node is-good\"><span class=\"ni\">8️⃣</span><span class=\"nl\">FP8 — bade matrix multiply</span><span class=\"ns\">zyadatar compute yahin; aadhi memory, aadhe bytes</span></div>\n      <div class=\"dg-node is-gold\"><span class=\"ni\">🎯</span><span class=\"nl\">High precision — embeddings, normalization, attention ops, master weights</span><span class=\"ns\">\"precision ko zaroorat se milao\"</span></div>\n    </div>",
};

SD.registerLevels('ai', [
/* =====================================================================
   1. ds-constraint
   ===================================================================== */
{
  id: 'ds-constraint',
  icon: '🧗',
  title: 'DeepSeek — jab tez wire khareed hi nahi sakte',
  badge: 'Patli Wire Pahalwan',
  objectives: [
    'Badi training compute ke saath communication ki bhi problem hai',
    'H800 ki constraint aur "hardware-aware co-design"',
    "\"$5.5M\" mein kya hai aur kya nahi",
    'Lab: throttled link par overlap + FP8 se step time',
  ],
  lesson: [
    "<h3>🚚 Tez gaadi, patli sadak</h3>\n     <p>Socho tumhare paas duniya ke sabse tez trucks hain, par sheher ki sadkein ek lane ki. Maal jaldi\n     banega, par pahunchega dheere. Badi AI training aisi hi hai: hazaron GPUs ko lagatar ek dusre ko\n     gradients, weights, experts ka data bhejna padta hai. Data bhejna <b>communication</b> ki problem hai, utni hi\n     badi hai jitni compute ki.</p>\n     <p>Late 2024 mein DeepSeek-V3 aaya — frontier level ka model, reported training cost <b>~$5.5M</b>\n     (log socha karte the $100M–$1B+). US export controls ki wajah se DeepSeek ke paas H100 nahi the; mostly\n     <b>H800</b> — compute wahi, par chip-to-chip interconnect bandwidth jaan-boojh ke kam. Aam jawab\n     (\"sabse tez interconnect khareed lo\") band tha.</p>\n     <h3>🧠 Hardware-aware co-design</h3>\n     <p>DeepSeek ka core faisla: model aur hardware strategy <b>ek hi cheez</b> hai. Har layer par ek sawaal:\n     <b>chips ke beech kam se kam data kaise bhejein?</b> Is sawaal se model ki shakal nikli: MoE, MLA, FP8,\n     multi-token prediction, aur communication ko compute ke peeche chhupana.</p>\n     <p class=\"tip\">🎯 Video ka sabak: <b>constraint aksar achhi engineering ka srot hota hai.</b> Zyada\n     resources se efficiency kam hi aati hai; ek teekhi constraint behtar design par majboor karti hai.</p>",
    "<h3>🧾 \"$5.5M\" ka matlab kya hai</h3>\n     <p>$5.5M sirf <b>aakhri training run ka compute</b> hai. Isme nahi: research, fail hue experiments,\n     rare talent (ML + hardware dono jaanne wale), salaries, aur ve code jo NVIDIA ki standard libraries\n     ke <b>neeche</b> (low-level instruction set) likha gaya data movement schedule karne ke liye.</p>\n     <h3>📏 Lab 30 — throttled link par ek training step</h3>\n     <p>8 micro-batches, har ek ka compute 60 ms (asli CPU, alag thread), gradients dusre \"GPU\" ko ~200 MB/s\n     ki patli wire par:</p>\n     <pre>precision  schedule      step time    GPU compute ka hissa\nBF16       sequential     1183 ms    41%\nBF16       overlapped      775 ms    62%\nFP8        sequential      820 ms    59%\nFP8        overlapped      532 ms    90%</pre>\n     <p>Sequential BF16 mein GPU <b>59%</b> waqt bas intezaar karta hai. Overlap (micro i bhejte waqt micro\n     i+1 ka compute) aur FP8 (aadhe bytes) milke: <b>2.2× tez, same hardware</b>. Bottleneck ke liye paisa\n     nahi diya — use chhupa diya.</p>",
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — patli wire par training step',
      project: '30-deepseek',
      exercise: 'ex2-overlap',
      goal: 'Same compute, same wire — sirf schedule (sequential/overlap) aur precision (BF16/FP8) badlo, step time dekho.',
      why: `<code>services/peer.js</code> dusra GPU hai jiske saath link token-bucket se ~200 MB/s par throttled
        hai (H800 jaisa: compute poora, wire patli). <code>tools/trainstep.js</code> compute ek worker thread
        mein chalata hai taaki bhejna aur compute sach mein ek saath ho sakein.`,
      steps: [
        { text: 'Peer GPU chalao.', cmd: 'cd docker-labs/30-deepseek && npm start ex2-overlap', expect: 'ex2-overlap\n[peer-gpu] :5081 link ~200 MB/s' },
        { text: 'Chaaron combinations chalao.', cmd: 'node tools/trainstep.js', expect: 'BF16       sequential     1183 ms    41%\nBF16       overlapped      775 ms    62%\nFP8        sequential      820 ms    59%\nFP8        overlapped      532 ms    90%' },
      ],
      observe: {
        q: 'BF16 overlapped (775 ms) mein bhi GPU sirf 62% busy. FP8 overlapped mein 90%. Kyun?',
        choices: [
          'BF16 mein bhejna (~80 ms) compute (60 ms) se lamba; FP8 ka ~40 ms compute ke peechhe chhupa',
          'FP8 ne GPU ke beech ki wire ki asli bandwidth hi badha di, isliye GPU zyada busy',
          'BF16 kisi bhi compute ke saath overlap ho hi nahi sakta, isliye GPU 62% par atka raha',
          '90% utilization se saabit hai ki FP8 model ki quality bhi BF16 se behtar hai',
        ],
        answer: 0,
        explain: 'Overlap tabhi poora chhupata hai jab bhejna compute se chhota ho. Isliye DeepSeek ko dono chahiye the.',
        choiceExplanations: [
          'Overlap tabhi poora chhupata hai jab bhejna compute se chhota ho. Isliye DeepSeek ko dono chahiye the.',
          'Wire wahi thi — bytes kam hue.',
          'BF16 mein bhi overlap hua — bas bhejna lamba tha.',
          'Utilization speed batata hai, quality nahi.',
        ],
      },
      lesson: 'Communication-bound kaam mein do lever: bytes kam karo (FP8) aur intezaar chhupao (overlap).',
    },
    {
      type: 'quiz',
      title: 'Constraint ki samajh',
      questions: [
        {
          q: 'H800 aur H100 mein asli farq kya tha jo DeepSeek ke liye maayne rakhta tha?',
          choices: [
            'Compute lagbhag wahi, par chip-to-chip interconnect bandwidth kam — wire ki rukawat',
            'H800 mein GPU memory hi nahi thi — har kaam CPU ki memory se hi karna padta tha',
            'H800 FP8 ganit chala hi nahi sakta tha, isliye DeepSeek ko BF16 hi chalana pada',
            'Sirf CPU ki clock speed badli thi — GPU aur interconnect bilkul H100 jaise the',
          ],
          answer: 0,
          explain: 'Isi constraint ne har faisle ko shape kiya: kam data move karo.',
          choiceExplanations: [
            'Isi constraint ne har faisle ko shape kiya: kam data move karo.',
            'H800 mein HBM memory hai.',
            'DeepSeek ne H800 par FP8 hi chalaya.',
            'Farq interconnect mein tha, CPU mein nahi.',
          ],
        },
        {
          q: "\"$5.5M training cost\" ko sahi tarah kaise padhein?",
          choices: [
            'Report hua training compute — official run; research, fail runs, salaries alag',
            'Poori company ka kharcha — salaries, office aur research sab $5.5M mein',
            'Ek GPU ki khareed ki keemat ka andaaza — $5.5M ek bade GPU ka daam hai',
            'Model ke poore jeevan ka kharcha — training se serving tak sab pakka gina',
          ],
          answer: 0,
          explain: 'DeepSeek-V3 paper ka compute estimate official training stages ke GPU hours aur maane gaye rental rate ka hisaab hai. Experiments, ablations, staff, infra aur serving shaamil nahi.',
          choiceExplanations: [
            'DeepSeek-V3 paper ka compute estimate official training stages ke GPU hours aur maane gaye rental rate ka hisaab hai. Experiments, ablations, staff, infra aur serving shaamil nahi.',
            'Salaries aur research is ginti mein nahi hain.',
            'Ek GPU itna mehenga nahi — $5.5M GPU hours ka hisaab hai.',
            'Serving ka kharcha training ke baad lagataar chalta hai — ismein nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — communication-bound training',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Distributed training mein GPUs 40% idle hain. Kya dekhoge?"',
        choices: [
          'Trace karo — communication, data loading, scheduler ke intezaar; phir overlap',
          'Pehle aur GPUs lagao — rukawat dhoondhe bina zyada GPUs idle time ghata denge',
          'Learning rate badhao — tez learning se GPUs ke beech link ke stalls seedha theek ho jaate hain',
          'Batch hamesha chhota karo — chhote batch se overlap hamesha behtar hota hai',
        ],
        answer: 0,
        explain: 'Idle GPU = kisi cheez ka intezaar. Aksar wire ka intezaar hota hai: overlap (bhejo aur agla compute saath), kam bytes (lower precision), aur kam data move karne wala parallelism.',
        choiceExplanations: [
          'Idle GPU = kisi cheez ka intezaar. Aksar wire ka intezaar hota hai: overlap (bhejo aur agla compute saath), kam bytes (lower precision), aur kam data move karne wala parallelism.',
          'Zyada GPUs zyada communication laate hain — idle badh sakta hai.',
          'Learning rate ka wire se koi lena-dena nahi.',
          'Chhota batch compute ghatata hai — wire aur zyada dikhega.',
        ],
      },
      {
        q: 'Interviewer: "Hardware-aware co-design ka nuksaan?"',
        choices: [
          'Ek chip ki khaasiyat se bandh jaata hai — portability, rare talent, maintenance',
          'Specialized kernel ka aage koi kharcha nahi — ek baar likha, hamesha chalega',
          'Wahi tuning har chip par sabse behtar hai — chip badlo toh bhi kernel mein kuch nahi badalna',
          'Hardware se judne se training hamesha dheemi hoti hai — tez kabhi nahi',
        ],
        answer: 0,
        explain: 'Efficiency ki keemat generality se chukani padti hai.',
        choiceExplanations: [
          'Efficiency ki keemat generality se chukani padti hai.',
          'Naye chip ya driver par kernel dobara likhna padta hai.',
          'Har chip ki tuning alag hoti hai.',
          'Co-design ne hi DeepSeek ko tez banaya.',
        ],
      },
    ],
  },
  success: [
    'Main badi training ko communication problem ki tarah dekh sakta hoon',
    'Main overlap aur lower precision ka asar lab ke numbers se samjha sakta hoon',
    'Main headline cost claims ko sahi tarah padh sakta hoon',
  ],
  homework: `<p>Lab 30 mein <code>services/peer.js</code> ka <code>LINK_MBPS</code> 200 se 400 karo aur
    <code>trainstep.js</code> dobara chalao. Ab BF16 overlapped mein GPU kitna busy hai? Kya ab FP8 ka farq
    utna bada hai? Is experiment se samjho ki co-design ek khaas constraint ka jawab tha.</p>`,
  cards: [
    { front: 'DeepSeek ki constraint?', back: 'H800: compute H100 jaisa, par chip-to-chip interconnect jaan-boojh ke kam. Badi training communication-bound.' },
    { front: 'Hardware-aware co-design?', back: 'Model aur hardware strategy ek cheez; har layer poochhe "chips ke beech kam data kaise?" → MoE, MLA, FP8, overlap.' },
    { front: 'Lab 30: overlap + FP8?', back: "BF16 sequential 1183 ms (GPU 41% busy) → FP8 overlapped 532 ms (90%). 2.2× tez, same hardware." },
  ],
},

/* =====================================================================
   2. ds-moe
   ===================================================================== */
{
  id: 'ds-moe',
  icon: '🧩',
  title: 'Mixture of Experts — aur bheed ka ilaaj',
  badge: 'Expert Baantne Wala',
  objectives: [
    'Dense vs MoE: total params vs active params',
    'Load balancing: free routing ki bheed, aux-loss ka "quality tax"',
    'DeepSeek ka auxiliary-loss-free (bias) balancing',
    'Expert parallelism ki communication keemat',
  ],
  lesson: [
    "<h3>🏥 Hospital ke specialists</h3>\n     <p>Dense model ek doctor hai jo har mareez ke liye apna poora gyaan istemaal karta hai — 400B parameters,\n     har token, hamesha. MoE ek hospital hai: bahut saare specialists (experts), aur reception (router)\n     har mareez ko 2–8 specialists ke paas bhejta hai. DeepSeek-V3: <b>~671B total, ~37B active</b> har\n     token par (~5.5%). Capacity badi, kharcha lagbhag 1/20 size ke model jitna.</p>\n     <h3>🚦 Par reception sabko ek hi doctor ke paas bhejne lage toh?</h3>\n     <p>Free routing mein kuch experts naturally popular ho jaate hain — ek expert ke saamne bheed, baaki\n     khaali. Aur experts alag GPUs par hote hain, toh ek busy expert = us GPU ki line mein sab ruke.</p>\n     <p>Purana ilaaj: <b>auxiliary loss</b> — training ke loss mein penalty jo unbalanced routing ko sazaa de.\n     Balance aata hai, par ye penalty model ke asli kaam (language modelling) se ladti hai — <b>quality tax</b>.</p>\n     <p>DeepSeek-V3 ka ilaaj: <b>auxiliary-loss-free balancing</b>. Har expert ka ek <b>bias</b> jo sirf\n     <b>chunne</b> mein judta hai (loss mein nahi). Batch ke baad: overloaded expert → bias thoda neeche,\n     khaali → thoda upar. Pasand (affinity) wahi, bas bheed baant di.</p>",
    "<h3>📏 Lab 30 — 64 experts, top-2</h3>\n     <pre>routing      sabse busy expert (average ka)   khaali experts   quality proxy\nfree             12.4x                             39 / 64         100.0%\naux (halka)       3.5x                              0 / 64          91.1%\naux (tez)         1.2x                              0 / 64          81.9%\nbias              1.3x                              0 / 64          86.8%</pre>\n     <p>Halka aux: bheed ab bhi. Tez aux: balance aaya, par router ki pasand hi badal gayi (81.9%). Bias:\n     tez aux jitna balance (1.3×), aur pasand zyada bachi (86.8%). Imaandari: lab ka router toy proxy hai — asli\n     training mein aux-loss ka nuksaan gradients ke through hota hai, paper ka claim wahi hai.</p>\n     <h3>📡 Expert parallelism = wire ka kaam</h3>\n     <p>Experts alag chips par → token ka data expert wale chip tak jaata hai aur wapas aata hai — wahi\n     cross-chip round trips jo DeepSeek ki kamzori thi. Ilaaj: communication aur computation ko itna tight\n     overlap karo ki jab ek batch ja raha ho, GPUs dusra compute kar rahe hon. Is overlap ke liye DeepSeek ne kuch\n     communication code NVIDIA ki standard libraries ke <b>neeche</b> likha — jo aam taur par sirf chip\n     vendors chhoote hain.</p>",
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — MoE ka kharcha',
      goal: 'Numbers se dekho MoE kyun sasta hai.',
      problems: [
        {
          q: 'DeepSeek-V3: 671B total, 37B active per token. Har token par total params ka kitna PERCENT chalta hai?',
          unit: '%', given: ['671B total', '37B active'],
          answer: 5.5, tol: 0.3,
          steps: ["37 / 671 = 0.055", "≈ 5.5%"],
          lesson: 'Model ka "gyaan" 671B ka, har token ka kharcha 37B ka.',
        },
        {
          q: 'Ek token ka compute ~2 × active params FLOPs maano. 37B active par ek token kitne FLOPs (× 10^9)?',
          unit: 'GFLOPs', given: ['2 FLOPs per param per token', '37B active'],
          answer: 74, tol: 0.3,
          steps: ['2 × 37 × 10^9 = 74 × 10^9', '≈ 74 GFLOPs per token'],
          lesson: 'Dense 671B hota toh ~1,342 GFLOPs — ~18× zyada.',
        },
      ],
    },
    {
      type: 'docker',
      title: '🐳 Lab — router ki bheed',
      project: '30-deepseek',
      exercise: 'ex1',
      goal: '64 experts, skewed pasand — free vs aux-loss vs bias: sabse busy expert kitna busy, aur pasand kitni bachi?',
      why: "<code>tools/router.js</code>: expert 0 sabse popular, 63 sabse kam. 4,096 tokens × 60 batches. Bias\n        mode mein har batch ke baad overloaded expert ka bias 0.02 neeche, khaali ka upar — sirf chunne ke liye.",
      steps: [
        { text: 'Router simulation chalao.', cmd: 'cd docker-labs/30-deepseek && node tools/router.js', expect: 'free             12.4x                                 39 / 64              100.0%\naux (halka)       3.5x                                  0 / 64              91.1%\naux (tez)         1.2x                                  0 / 64              81.9%\nbias              1.3x                                  0 / 64              86.8%' },
        { text: 'Neeche ki teen lines padho — tool khud kya maanta hai.', cmd: 'node tools/router.js | tail -3', expect: 'Bias (loss-free): sirf overloaded/khaali experts ko halka dhakka → tez aux jitna balance, par zyada pasand bachi.\n(Toy proxy hai. Asli training mein aux-loss ka nuksaan gradient ke through hota hai — DeepSeek-V3 paper ka claim yahi hai.)' },
      ],
      observe: {
        q: 'Free routing mein 39 experts lagbhag khaali hain. GPU cluster par kya asar hota hai?',
        choices: [
          'Busy expert wale GPU par tokens ki line lagti hai, aur khaali experts wale GPUs bekaar baithe',
          'Khaali experts ki saari weight memory apne aap khaali ho jaati hai, toh paisa bachta hai',
          'Imbalanced routing se speed badhti hai, kyunki kam experts par kaam jaldi khatam',
          'Experts zyada hon toh load apne aap barabar ho jaata hai — 39 khaali normal hai',
        ],
        answer: 0,
        explain: 'Expert parallelism mein har expert ek GPU (ya hissa) hai — imbalance = idle hardware + queue. Paisa jalta hai, speed girti hai.',
        choiceExplanations: [
          'Expert parallelism mein har expert ek GPU (ya hissa) hai — imbalance = idle hardware + queue. Paisa jalta hai, speed girti hai.',
          'Khaali experts ke weights bhi memory mein rehte hain.',
          'Busy expert par line lagti hai — speed girti hai.',
          'Experts badhane se balance apne aap nahi aata.',
        ],
      },
      lesson: 'Balance ka tareeka bhi quality ka faisla hai: loss mein penalty ya sirf routing mein dhakka.',
    },
  ],
  interview: {
    title: 'Interview Round — MoE',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "MoE model sasta kyun hai, aur kahan mehenga?"',
        choices: [
          'Har token par kuch hi experts — compute sasta; par saare params memory mein, aur cross-chip safar',
          'MoE mein total parameters hamesha kam hote hain, isliye sab kuch sasta',
          'Inactive experts ko GPU memory ki zaroorat hi nahi — sirf active experts load hote hain',
          'MoE ka end-to-end kharcha hamesha kam hai — kisi bhi setup mein, kisi bhi load par',
        ],
        answer: 0,
        explain: 'Total params memory mein, active params compute mein — aur beech mein communication aur load imbalance.',
        choiceExplanations: [
          'Total params memory mein, active params compute mein — aur beech mein communication aur load imbalance.',
          'MoE ke total params bade hote hain — active kam.',
          'Saare experts memory mein rehte hain, warna routing ke waqt load karna padta.',
          'Communication aur imbalance kharcha badha sakte hain.',
        ],
      },
      {
        q: 'Interviewer: "Auxiliary loss aur bias balancing mein farq?"',
        choices: [
          'Aux loss objective mein penalty daalta hai; bias sirf routing mein judta, batch load se adjust',
          'Bias sirf inference mein judta hai — training mein balance ka kaam aux loss hi karta hai',
          'Auxiliary terms training par koi asar nahi daal sakte — sirf report ke liye hain',
          'Routing bias aane se baaki saare losses hat jaate hain — sirf bias bachta hai',
        ],
        answer: 0,
        explain: 'V3 ka mukhya balance adaptive routing bias se hai. Paper sequence-level balancing aur doosre objectives bhi batata hai; "loss-free" ka matlab saare auxiliary objectives ka na hona nahi.',
        choiceExplanations: [
          'V3 ka mukhya balance adaptive routing bias se hai. Paper sequence-level balancing aur doosre objectives bhi batata hai; "loss-free" ka matlab saare auxiliary objectives ka na hona nahi.',
          'Bias training ke dauraan routing mein judta hai.',
          'Aux loss training ko badalta hai — quality se bhi takra sakta hai.',
          'Paper sequence-level balance bhi rakhta hai.',
        ],
      },
    ],
  },
  success: [
    'Main dense aur MoE ka kharcha active params se samjha sakta hoon',
    'Main load balancing ke teen tareeke aur har tareeke ka trade-off bata sakta hoon',
    'Main expert parallelism ki communication keemat samjha sakta hoon',
  ],
  homework: "<p>Lab 30 ke <code>tools/router.js</code> mein bias ka step <code>0.02</code> ko <code>0.005</code>\n    aur <code>0.1</code> karke chalao. Balance aur quality proxy kaise badle? Bahut tez dhakka dena kya\n    karta hai?</p>",
  cards: [
    { front: 'DeepSeek-V3 MoE numbers?', back: "~671B total params, ~37B active per token (~5.5%) — compute ~1/20 size ke model jitna." },
    { front: 'MoE load balancing ke teen tareeke?', back: "Free (bheed: lab 12.4×), aux loss (balance par quality tax), bias sirf routing mein (DeepSeek-V3, loss-free)." },
    { front: 'Expert parallelism ki keemat?', back: 'Token data experts wale chips tak aur wapas — cross-chip round trips. Ilaaj: compute/comm overlap, low-level communication code.' },
  ],
},

/* =====================================================================
   3. ds-mla-fp8
   ===================================================================== */
{
  id: 'ds-mla-fp8',
  icon: '🗜️',
  title: 'MLA aur FP8 — serving ka bill aur precision ka faisla',
  badge: 'KV Cache Kanjoos',
  objectives: [
    'Training (ek baar) vs inference (hamesha) ka kharcha',
    'KV cache kya hai aur lambi baat mehengi kyun',
    'Multi-head Latent Attention — K/V ka compression',
    'Selective FP8: precision ko zaroorat se milao',
  ],
  lesson: [
    "<h3>🧾 Do bill</h3>\n     <p>Training ka bill <b>ek baar</b> aata hai. Inference (serving) ka bill <b>har request par, hamesha</b>.\n     Aksar ek ko kam karne wali technique doosre ko badhati hai. Video ki line: <b>\"MoE training ka bill\n     kaatta hai, MLA serving ka.\"</b></p>\n     <h3>📒 KV cache — model ki notebook</h3>\n     <p>Jawab likhte waqt model har pichhle token ke <b>keys aur values</b> yaad rakhta hai, har layer mein —\n     taaki har naye shabd par poori baat dobara na padhni pade. Ye notebook baat ke saath lambi hoti jaati\n     hai, aur har user ki alag. Lambi conversations mein yahi memory ka sabse bada hissa ban jaati hai.</p>\n     <p>Purane tricks (jaise GQA — kai heads ek K/V share karein) memory bachate hain par heads ki \"apni\n     nazar\" kam karte hain. <b>MLA</b> (Multi-head Latent Attention): K/V ko ek chhote <b>latent</b> vector\n     mein compress karke rakho, zaroorat par wapas kholo — memory bahut kam, attention ki quality poori.</p>\n     <p>Lab 30 (DeepSeek-V3 jaisa shape — 61 layers, 128 heads, head dim 128, BF16; GPU ke 40 GB KV ke liye):</p>\n     <pre>tareeka              per token   32k context   users per GPU\nMHA (poora)            3904 KB      122.0 GB     0 (ek bhi fit nahi)\nGQA (16 groups)         488 KB       15.3 GB     2\nMLA (latent 576)         69 KB        2.1 GB     18</pre>",
    `<h3>8️⃣ FP8 — aadhe bytes, par dhyan se</h3>
     <p>Industry ka standard training format BF16 (16 bits). FP8 = 8 bits: aadhi memory, aadha compute, aur
     — DeepSeek ke liye sabse zaroori — <b>throttled wire par aadhe bytes</b>. Sab jaante the ki is scale par
     8-bit se errors jama hote hain, training bhatak jaati hai, crores jal jaate hain. DeepSeek pehle the jo
     is size par <b>selectively</b> kar paaye:</p>
     <table>
       <tr><th>FP8 mein</th><th>High precision mein</th></tr>
       <tr><td>Bade matrix multiplies (zyadatar compute)</td><td>Embeddings, normalization layers, attention operators, weights ki <b>master copy</b></td></tr>
     </table>
     <p class="tip">🎯 <b>"Precision ko zaroorat se milao."</b> Sab kuch 8-bit nahi, sab kuch 16-bit nahi —
     galti jama hone wali jagah par zyada bits, sirf bhaari kaam wali jagah par kam.</p>
     <h3>💸 Keemat</h3>
     <ul>
       <li>System H800 ki khaasiyat se bandha — generality kam, fragility zyada.</li>
       <li>FP8 = numerical stability ki kagaar par hamesha ka maintenance; har future badlaav ko precision
       boundaries ka dhyan rakhna padega.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — KV cache calculator',
      project: '30-deepseek',
      exercise: 'ex3',
      goal: 'DeepSeek-V3 jaise shape ke liye MHA vs GQA vs MLA: per token, per user, aur ek GPU par kitne users.',
      why: `<code>tools/kvcache.js</code> seedha hisaab hai: MHA = 2 × layers × heads × head_dim × 2 bytes;
        GQA = 16 KV groups; MLA = layers × 576 × 2 bytes. GPU ke 80 GB mein se ~40 GB KV ke liye (assumption).`,
      steps: [
        { text: 'Calculator chalao.', cmd: 'cd docker-labs/30-deepseek && node tools/kvcache.js', expect: 'MHA (poora)            3904 KB         15.3 GB          122.0 GB          488.0 GB        0 (ek user bhi fit nahi)\nGQA (16 groups)         488 KB          1.9 GB           15.3 GB           61.0 GB        2\nMLA (latent 576)         69 KB          275 MB            2.1 GB            8.6 GB        18' },
        { text: 'Aakhri line — kitna chhota?', cmd: 'node tools/kvcache.js | tail -3', expect: 'MLA ka KV cache MHA se 57x chhota.' },
      ],
      observe: {
        q: '32k context par MHA ke saath ek user bhi GPU par fit nahi, MLA ke saath 18. Business ke liye 18 ka matlab?',
        choices: [
          'KV budget mein zyada sessions aate hain — lambi context wali features bech sakte ho',
          '18 slots ka matlab service theek 18× sasti — har user ka daam seedha 18 se bhaag',
          'Fit hone ki ginti se saabit hai ki latency bhi hamesha same rahegi',
          'Memory ki bachat training ki speed ke barabar hai — training bhi 18× tez',
        ],
        answer: 0,
        explain: 'Simulation dikhati hai ki KV memory mein kitne sessions saath chal sakte hain. Simulation se asli per-user daam ya latency ka 18× nahi nikalta; throughput/SLO aur poora memory budget naapo.',
        choiceExplanations: [
          'Simulation dikhati hai ki KV memory mein kitne sessions saath chal sakte hain. Simulation se asli per-user daam ya latency ka 18× nahi nikalta; throughput/SLO aur poora memory budget naapo.',
          'Daam compute, latency aur doosre kharchon se bhi banta hai.',
          'Zyada sessions saath chalne se latency badal sakti hai.',
          'KV cache serving ka hissa hai, training ka nahi.',
        ],
      },
      lesson: 'Training ek baar ka bill, serving hamesha ka — KV cache chhota karna "forever bill" kaatna hai.',
    },
    {
      type: 'bins',
      title: 'FP8 mein ya high precision mein?',
      instructions: 'DeepSeek ke "precision ko zaroorat se milao" ke hisaab se chuno.',
      bins: [
        { id: 'fp8', label: '8️⃣ FP8 chalega' },
        { id: 'hi', label: '🎯 High precision rakho' },
      ],
      items: [
        { text: 'Feed-forward layers ke bade matrix multiplies', bin: 'fp8', explain: 'Zyadatar compute yahin — FP8 ka sabse bada faayda.' },
        { text: 'Weights ki master copy (jisme updates jama hote hain)', bin: 'hi', explain: 'Chhote updates FP8 mein kho jaate — galti jama hoti hai.' },
        { text: 'Normalization layers', bin: 'hi', explain: 'Scale sambhalne wale — precision-sensitive.' },
        { text: 'Embeddings', bin: 'hi', explain: 'DeepSeek ne embeddings high precision mein rakhe.' },
        { text: 'Gradients jo patli wire par dusre chip ko jaate hain', bin: 'fp8', explain: 'Aadhe bytes = throttled wire par aadha waqt (lab 30: 1183 → 820 ms sequential).' },
        { text: 'Attention operators', bin: 'hi', explain: 'Video ke mutabik high precision mein rakhe gaye.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — inference cost',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara chatbot lambi conversations mein GPU memory khatam kar deta hai. Kya dekhoge?"',
        choices: [
          'Profile karo — weights, KV cache, runtime; phir GQA/MLA, KV quantization, context/eviction',
          'Sirf model weights — lambi chat mein memory hamesha weights ki wajah se khatam hoti hai',
          'Memory profile se pehle batch badhao — bada batch memory ka sahi istemaal karta hai',
          'Context ko anant capacity maano — lambi baat ke liye memory ki koi hadd nahi',
        ],
        answer: 0,
        explain: 'Context badhne par KV cache badhti hai; weights, activations, batching aur allocator ka overhead bhi budget mein hai. Profile se sabse bada hissa pehchaano.',
        choiceExplanations: [
          'Context badhne par KV cache badhti hai; weights, activations, batching aur allocator ka overhead bhi budget mein hai. Profile se sabse bada hissa pehchaano.',
          'Weights fixed hain — lambi chat mein KV cache badhti hai.',
          'Bada batch KV cache aur badhata hai.',
          'Har GPU ki memory ki hadd hai.',
        ],
      },
      {
        q: 'Interviewer: "Poori training FP8 mein kar dein?"',
        choices: [
          'Chun ke — bade matmuls FP8; master weights, norms, embeddings high precision mein',
          'Haan, saari reductions bhi FP8 mein — jaanch ki zaroorat nahi, FP8 sab sambhal lega',
          'Nahi — low precision ki har training bhatak hi jaati hai, FP8 kabhi kaam nahi karta',
          'FP8 sirf inference ke liye hai — training mein FP8 chal hi nahi sakta',
        ],
        answer: 0,
        explain: '"Precision ko zaroorat se milao." Warna errors jama hokar training bhatakti hai.',
        choiceExplanations: [
          '"Precision ko zaroorat se milao." Warna errors jama hokar training bhatakti hai.',
          'Reductions mein FP8 errors jama karta hai — jaanch zaroori.',
          'DeepSeek ne FP8 training chalayi aur kaam kiya.',
          'DeepSeek-V3 ki training FP8 mein hi hui.',
        ],
      },
    ],
  },
  success: [
    'Main training aur serving ke bill alag kar ke soch sakta hoon',
    'Main KV cache ka hisaab laga sakta hoon aur MLA ka faayda bata sakta hoon',
    'Main selective FP8 ka tark de sakta hoon',
  ],
  homework: `<p>Apne kisi LLM feature ke liye hisaab lagao: average context kitne tokens, kitne users ek saath,
    aur KV cache kitna banta hai (lab ka formula). Phir likho: agar context 4× ho jaaye toh kitne GPU aur
    chahiye?</p>`,
  cards: [
    { front: 'KV cache kya hai?', back: 'Har pichhle token ke keys/values, har layer mein — model ki notebook. Baat ke saath badhta hai, har user ka alag. Lambi baat mein sabse bada memory kharcha.' },
    { front: 'MLA?', back: 'Multi-head Latent Attention: K/V ko chhote latent mein compress, zaroorat par kholo. Lab: MHA se 57× chhota; 32k par 0 → 18 users per GPU.' },
    { front: 'Selective FP8?', back: 'Bade matmuls FP8; master weights, normalization, embeddings, attention ops high precision. "Precision ko zaroorat se milao."' },
  ],
},
]);

})();
