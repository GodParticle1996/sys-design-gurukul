/* =====================================================================
   TRACK — 🤖 AI Companies · AI Safety: filter vs containment

   Source: "We Need LESS AI Safety, Not More!" (Akhil Sharma).
   Yeh ek OPINION video hai — speaker ki apni raay. 2026 ke incidents video
   ke mutabik likhe hain (hum unhe verify nahi kar sakte). Content sirf
   DEFENSIVE hai: containment kaise banayein, kaise naapein, incident mein
   kya karein. Koi filter-bypass technique yahan nahi sikhayi jaati.
   Docker lab: docker-labs/11-ai-containment
   ===================================================================== */
(function () {

VISUALS['ai-safety-filter'] = {
  t: 'Ek naam, do bilkul alag cheezein',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🛂 Refusal filter — airport security</span>
        <div class="dg-cap">Model (ya ek classifier) prompt ke <b>shabd</b> padhta hai aur faisla karta hai:
          "haan" ya "na". Wahi sawaal, alag kahani ke saath → alag jawab. Har model update par
          behaviour badalta hai. Test karke <b>prove</b> nahi kar sakte.</div></div>
      <div class="dg-box is-good"><span class="bx-label">🔒 Containment — cockpit ka band darwaaza</span>
        <div class="dg-cap">Sandbox, network ki deewar, file ki deewar, CPU/call budget, monitor + kill switch.
          Model kya soch raha hai isse farq nahi padta — <b>kya kar sakta hai</b> woh tay hai.
          Firewall rule padh sakte ho, test kar sakte ho, audit kar sakte ho.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-flow">
      <span class="dg-pill">🧑‍💻 prompt</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🛂 filter (shabdon par)</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🤖 model</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">🔒 tool calls — deewar ke andar</span>
    </div>
    <div class="dg-cap">Filter <b>bolne</b> par pehra deta hai. Containment <b>karne</b> par. Jab AI agent
      internet chala sakta hai, files likh sakta hai, code chala sakta hai — tab asli nuksaan "karne" se hota hai.</div>`,
};

VISUALS['ai-containment'] = {
  t: 'Agent ke chaaron taraf chaar deewarein',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">🌐</span><span class="cmd">Egress allowlist</span><span class="q">sirf jaane-maane hosts tak network; baaki block + log</span></div>
      <div class="dg-rung"><span class="lv">📁</span><span class="cmd">Workspace jail</span><span class="q">files sirf /workspace mein; ../ se bahar nahi</span></div>
      <div class="dg-rung"><span class="lv">⏱️</span><span class="cmd">Budget</span><span class="q">max tool calls, max CPU — bekaboo loop ka kharcha tay</span></div>
      <div class="dg-rung g"><span class="lv">👀</span><span class="cmd">Monitor + kill switch</span><span class="q">"kaam khatam, phir bhi calls?" → alert → band</span></div>
    </div>
    <div class="dg-cap">Har deewar alag cheez rokti hai: egress/jail <b>nuksaan</b>, budget <b>kharch</b>, monitor <b>samay</b>.
      Lab 11 mein bigda agent: bina deewar 11 posts bahar; deewar ke saath 0; monitor ke saath 6th call par band.</div>`,
};

VISUALS['ai-incident-model'] = {
  t: 'Incident se PEHLE ki tayyari',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">🔥 Breach ke beech pata chala</span>
        <div class="dg-stack">
          <div class="dg-node is-bad"><span class="ni">📜</span><span class="nl">17,000 events</span><span class="ns">samajhne hain, abhi</span></div>
          <div class="dg-node is-bad"><span class="ni">🚫</span><span class="nl">Hosted model: "na"</span><span class="ns">attack data dikhane par mana</span></div>
          <div class="dg-node is-gold"><span class="ni">⏳</span><span class="nl">Naya model dhoondho, chalao</span><span class="ns">ghante gaye</span></div>
        </div></div>
      <div class="dg-box is-good"><span class="bx-label">🧯 Pehle se tay</span>
        <div class="dg-stack">
          <div class="dg-node is-good"><span class="ni">🖥️</span><span class="nl">Capable model apne infra par</span><span class="ns">runbook mein, test kiya hua</span></div>
          <div class="dg-node is-good"><span class="ni">🔐</span><span class="nl">Data building mein</span><span class="ns">passwords, payloads bahar nahi</span></div>
          <div class="dg-node is-good"><span class="ni">🔒</span><span class="nl">Containment ke andar</span><span class="ns">malware analysis bhi sandbox mein</span></div>
        </div></div>
    </div>
    <div class="dg-cap">Video ki kahani (July 2026, video ke mutabik): Hugging Face ko breach ke <b>beech</b> apna model
      chalana pada. Sabak har team ke liye: incident ka har tool incident se pehle chala ke dekho.</div>`,
};

SD.registerLevels('ai', [
/* =====================================================================
   1. ai-safety-filter
   ===================================================================== */
{
  id: 'ai-safety-filter',
  icon: '🛂',
  title: 'AI Safety — ek naam, do alag cheezein',
  badge: 'Deewar Dekhne Wala',
  objectives: [
    '"AI safety" ke do matlab: refusal filter aur containment',
    'Filter shabd padhta hai — isliye imaandar defender ko rok sakta hai aur kahani banane wale ko nahi',
    '"Safety tax": defense ka kaam bhi dheema ho jaata hai',
    'Kis cheez ko security boundary maan sakte hain, kise nahi',
  ],
  lesson: [
    `<h3>🚨 Pehle kahani (video ke mutabik)</h3>
     <p>Video ke hisaab se July 2026 mein Hugging Face par ek attack hua — ek test setup mein chal rahe
     AI model se, jiske safeguards <b>band</b> the. Hugging Face ki team ko <b>17,000 events</b> ki
     logs dekhni thin. Unhone bade American models se madad maangi: "yeh malware hai, yeh payload hai,
     samjhao kya hua." Jawab mila: <b>mana</b>. Model ko attack ka data dikh raha tha, aur woh
     "attack" jaisa dikhne wali cheez par baat nahi karna chahta tha.</p>
     <p>Phir team ne ek open-weights model apne hi hardware par chalaya. Kaam ho gaya — aur passwords,
     payloads building se bahar bhi nahi gaye. Video ise <b>"asymmetry problem"</b> kehta hai:
     defender ko jawab chahiye tha, par "na" defender ko mila.</p>
     <p class="tip">⚠️ Yeh ek <b>opinion video</b> hai aur 2026 ke incidents video ke mutabik hain — hum
     unhe verify nahi kar sakte. Is level mein hum speaker ki raay ko raay hi kahenge, aur jo cheez
     hum khud naap sakte hain (containment) woh lab mein naapenge.</p>`,
    `<h3>🛂 Airport security vs 🔒 cockpit ka darwaaza</h3>
     <p>Socho airport par do tarah ki suraksha hai:</p>
     <ul>
       <li><b>Security check</b> — ek insaan tumhari baat aur bag dekh ke faisla karta hai. Achhi
       kahani sunane wala nikal sakta hai; ghabraya hua imaandar musafir ruk sakta hai.</li>
       <li><b>Cockpit ka band darwaaza</b> — andar kaun baitha hai, uski kahani kya hai, farq nahi
       padta. Darwaaza band hai toh band hai.</li>
     </ul>
     <p>AI mein bhi "safety" do alag cheezon ka naam hai:</p>
     <table>
       <tr><th></th><th>🛂 Refusal filter</th><th>🔒 Containment</th></tr>
       <tr><td>Kya dekhta hai</td><td>Prompt ke shabd, kahani</td><td>Model kya <b>kar sakta</b> hai</td></tr>
       <tr><td>Kahan hai</td><td>Model ke weights ke andar (fuzzy)</td><td>Model ke bahar: sandbox, firewall, limits</td></tr>
       <tr><td>Test kar sakte ho?</td><td>Sirf sample karke</td><td>Haan — rule padho, chalao, har baar same jawab</td></tr>
       <tr><td>Model update par</td><td>Behaviour badal jaata hai</td><td>Deewar wahi rehti hai</td></tr>
     </table>
     <p class="tip">🎯 Video ki line: <b>"You can audit a wall. You can't audit a vibe."</b> — deewar
     ko audit kar sakte ho, "mood" ko nahi.</p>`,
    `<h3>🎭 Filter kahani sunne wala hai</h3>
     <p>Filter sirf shabd dekhta hai, isliye woh ek ajeeb cheez karta hai: jo <b>sach</b> bolta hai
     ("breach chal raha hai, yeh malware hai") woh aksar ruk jaata hai, aur jo acchi kahani banata hai
     woh nikal jaata hai. Anthropic ne Nov 2025 mein khud ek report di thi: ek state-backed group ne
     AI coding agent ko "hum security company hain, authorized testing hai" bol ke istemaal kiya, aur
     kaam ko chhote-chhote masoom dikhne wale tukdon mein baanta. Context bhi sirf text hai — use
     banana aasaan hai.</p>
     <h3>🧾 Safety tax</h3>
     <p>Attack aur defense ki reasoning aksar ek hi hoti hai — SQL injection dhoondhna aur SQL injection
     rokna, dono ke liye same samajh chahiye. Video ki raay: refusal training us poore gyaan ko dabati
     hai, isliye defender ke har sawaal par bhi thoda nuksaan hota hai.</p>
     <h3>⚖️ Toh kya filter bekaar hai?</h3>
     <p>Nahi — aur yahan hum video se thoda alag khade hain. Filter <b>kam mehnat wali galtiyon</b> ko
     rokta hai aur ek layer hai. Par woh <b>security boundary</b> nahi hai: jo control tabhi chale
     jab user sach bole, woh control nahi, request hai. Asli boundary — jise tum audit kar sako —
     containment hai.</p>
     <p class="tip">🎯 Jab koi bole "hamara AI safe hai", poochho: <b>kaunsi safety?</b> Filter ka
     "safe" aur deewar ka "safe" bilkul alag guarantee hain.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Filter ya deewar?',
      instructions: 'Har control ko sahi dabbe mein daalo.',
      bins: [
        { id: 'filter', label: '🛂 Refusal filter (shabdon par faisla)' },
        { id: 'wall', label: '🔒 Containment (karne par roak)' },
      ],
      items: [
        { text: 'Model "malware" shabd dekh ke jawab dene se mana karta hai', bin: 'filter', explain: 'Shabdon par faisla — wahi sawaal alag kahani ke saath alag jawab paa sakta hai.' },
        { text: 'Agent ka container bina network ke chalta hai', bin: 'wall', explain: 'Model kuch bhi likhe, bahar packet ja hi nahi sakta. Yeh test kiya ja sakta hai.' },
        { text: 'Tool calls sirf docs.internal tak ja sakti hain, baaki block + log', bin: 'wall', explain: 'Egress allowlist — ek firewall rule jise padh ke review kar sakte ho.' },
        { text: 'Ek classifier prompt ko "harmful" score deta hai', bin: 'filter', explain: 'Classifier bhi shabd hi padh raha hai — fuzzy judgment.' },
        { text: 'Task ke liye max 40 tool calls aur 400 ms CPU', bin: 'wall', explain: 'Budget — bekaboo loop ka nuksaan aur kharch dono tay.' },
        { text: '"Task khatam ho gaya par calls chal rahi hain" → alert + kill', bin: 'wall', explain: 'Monitor + kill switch — model ki soch nahi, uska vyavhaar dekhta hai.' },
        { text: 'System prompt mein likha "kabhi nuksaan wala kaam mat karna"', bin: 'filter', explain: 'Yeh bhi model se ek request hai. Model ise maane ya na maane — koi deewar nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Metal detector ka sabak',
      questions: [
        {
          q: 'Breach ke beech defender AI se malware samjhane ko kehta hai aur model mana kar deta hai. Is "na" se sabse zyada kise nuksaan hua?',
          choices: [
            'Defender ko — use jawab chahiye tha; attacker ke paas pehle se woh malware hai',
            'Attacker ko — ab woh malware nahi bana payega',
            'Kisi ko nahi — mana karna hamesha safe hai',
            'Model company ko',
          ],
          answer: 0,
          explain: 'Yahi video ka "asymmetry problem" hai: attacker ka code pehle se likha hai, defender ko samajhna hai. "Na" ka bojh defender par gira.',
        },
        {
          q: 'Kaunsa control "security boundary" maana ja sakta hai?',
          choices: [
            'Jo user ke sach bolne par nirbhar na ho, jise test aur audit kar sakein — jaise network deewar',
            'Jo sabse smart model use kare',
            'Jo system prompt mein saaf likha ho',
            'Jo 99% prompts par sahi faisla de',
          ],
          answer: 0,
          explain: 'Jo control tabhi chale jab doosra cooperate kare, woh control nahi — request hai. Boundary woh hai jo har baar, har kahani par, wahi jawab de.',
        },
        {
          q: '"Refusal sirf ek metal detector hai" — iska matlab?',
          choices: [
            '"Na" bhi ek signal hai: woh batata hai ki tum kisi cheez ke kareeb ho — sirf defender ke liye yeh signal bekaar hai',
            'Refusal hamesha galat hota hai',
            'Metal detector jaisa accurate hai',
            'Refusal hardware mein hota hai',
          ],
          answer: 0,
          explain: 'Metal detector beep karta hai par batata nahi ki kya hai. Defender ko "kya hai" chahiye; baar-baar ki beep sirf pattern batati hai.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — AI agent ki suraksha',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara coding agent production mein jaayega. Safety kaise ensure karoge?"',
        choices: [
          'Model ke filter par bharosa nahi — sandbox, egress allowlist, workspace jail, budget, aur monitor + kill switch; phir in sabko test karke dikhaunga',
          'Sabse safe model chunenge jo sabse zyada refuse kare',
          'System prompt mein strict niyam likhenge',
          'Har output ko ek doosra model check karega',
        ],
        answer: 0,
        explain: 'Filter ek layer ho sakta hai, par jo cheez load-bearing hai woh deewar hai — aur deewar ko hi test/audit kar sakte ho.',
      },
      {
        q: 'Interviewer: "Model provider ne naya version diya. Tumhe kya dobara check karna padega?"',
        choices: [
          'Containment wahi rehta hai — deewarein model se bahar hain. Par filter/behaviour-based cheezein dobara evaluate karni padengi',
          'Kuch nahi, naya version zyada safe hota hai',
          'Poora sandbox dobara banana padega',
          'Sirf latency',
        ],
        answer: 0,
        explain: 'Isi liye containment ko model se alag rakhna faayde ka hai: model badle, deewar nahi badalti.',
      },
    ],
  },
  success: [
    'Main "AI safety" ke do matlab alag kar sakta hoon — filter aur containment',
    'Main samjha sakta hoon ki filter boundary kyun nahi hai',
    'Main kisi bhi control ko "audit ho sakta hai ya nahi" se parakh sakta hoon',
  ],
  homework: `<p>Apne team ke kisi bhi AI feature ki list banao (chatbot, coding agent, summarizer). Har ek
    ke saamne likho: (1) yeh model kya <b>kar</b> sakta hai — internet? files? code chalana? emails?
    (2) inme se kaunsi cheez ek deewar se band hai aur kaunsi sirf "model mana kar dega" ke bharose hai.
    Jo doosri list mein hai, wahi tumhara asli risk hai.</p>`,
  cards: [
    { front: '"AI safety" ke do matlab?', back: 'Refusal filter (prompt ke shabd padh ke haan/na — airport security) aur containment (sandbox, network deewar, limits, monitor — cockpit ka band darwaaza).' },
    { front: 'Filter security boundary kyun nahi?', back: 'Woh shabd padhta hai; kahani badlo toh jawab badal sakta hai. Jo control user ke sach bolne par nirbhar ho, woh control nahi request hai. Aur model update par behaviour badal jaata hai.' },
    { front: '"You can audit a wall, you can\'t audit a vibe"?', back: 'Firewall rule padh sakte ho, test kar sakte ho, review mein dikha sakte ho — har baar same jawab. Model ke andar ka filter billions weights ka fuzzy faisla hai.' },
    { front: 'Asymmetry problem (video)?', back: 'Breach ke beech defender ko malware samajhna hai; model "na" bolta hai. Attacker ke paas code pehle se hai — "na" ka bojh sirf defender par girta hai.' },
  ],
},

/* =====================================================================
   2. ai-containment
   ===================================================================== */
{
  id: 'ai-containment',
  icon: '🔒',
  title: 'Containment — agent ko deewar ke andar rakho',
  badge: 'Pinjra Karigar',
  objectives: [
    'Agent ke chaar deewarein: egress allowlist, workspace jail, budget, monitor + kill switch',
    '"Clean stop" ka sawaal — task khatam, phir bhi agent chalta rahe toh?',
    'Har deewar alag cheez rokti hai — nuksaan, kharch, samay',
    'Containment ko test aur audit karna',
  ],
  lesson: [
    `<h3>🤖 Agent = model + haath</h3>
     <p>Chatbot sirf bolta hai. <b>Agent</b> kaam karta hai: URL kholta hai, files padhta-likhta hai,
     code chalata hai, API call karta hai. Nuksaan ab "galat jawab" nahi, <b>galat kaam</b> hai.</p>
     <p>Video ke mutabik jin incidents mein models ne infrastructure todne ki koshish ki, un sab mein
     safeguards <b>band</b> the (test setup ya galat config). Aur ek pattern dikha: model ko jawab mil
     gaya tha, phir bhi woh din bhar chalta raha — khud ke liye naye bahane banata raha. Yaani
     <b>"clean stop" ki guarantee nahi</b>. Yeh prompt se theek nahi hota; yeh bahar ki deewar aur
     monitor se theek hota hai.</p>
     <h3>🧱 Chaar deewarein</h3>
     <table>
       <tr><th>Deewar</th><th>Kya rokti hai</th><th>Misaal</th></tr>
       <tr><td>🌐 Egress allowlist</td><td>Data bahar jaana, anjaan jagah call</td><td>sirf <code>docs.internal</code>; <code>169.254.169.254</code> (cloud metadata) bhi block</td></tr>
       <tr><td>📁 Workspace jail</td><td>Secrets padhna, apna hi code badalna</td><td><code>../tasks/fake-secrets/api-key.txt</code> → deny</td></tr>
       <tr><td>⏱️ Budget</td><td>Bekaboo loop ka kharch</td><td>max 40 calls, 400 ms CPU</td></tr>
       <tr><td>👀 Monitor + kill</td><td>Lambi chalne wali galti</td><td>10 calls mein 3 block, ya "done" ke baad 2 calls → band</td></tr>
     </table>`,
    `<h3>📏 Lab mein kya naapa (lab 11 ka asli run)</h3>
     <pre>achha agent,  no walls   : 6/6 allowed         bahar: 0
achha agent,  contain    : 6/6 allowed         bahar: 0       ← deewar ka "tax" = zero
bigda agent,  no walls   : 67 calls            bahar: 11 posts, 1 file workspace ke bahar, 790 ms CPU
bigda agent,  walls      : 20 allowed, 47 block bahar: 0      (par 67 calls tak chala, CPU 415 ms)
bigda agent,  contain    : ALERT call #6 → KILLED   bahar: 0, CPU 40 ms</pre>
     <p>Teen sabak:</p>
     <ul>
       <li>Achhe kaam par deewar ne <b>kuch nahi roka</b> — containment ka kharcha sahi kaam par zero.</li>
       <li>Sirf deewar: nuksaan <b>zero</b>, par agent ghoomta raha. Deewar nuksaan rokti hai, samay nahi.</li>
       <li>Deewar + monitor: 6th call par band. Monitor <b>samay</b> bachata hai.</li>
     </ul>
     <h3>🔍 Audit</h3>
     <p><code>audit.js</code> har host/path ke liye policy se poochhta hai — 10/10 checks, har baar
     wahi jawab. Yahi cheez architecture review mein dikhayi ja sakti hai. Chhupe hue raaste bhi
     test mein aate hain: <code>docs.internal.evil.example</code> (naam mein allowed domain chhupa hai)
     → deny; <code>../../start.js</code> (apna code badalne ki koshish) → deny.</p>
     <p class="tip">🎯 Deewar ko "model kitna smart hai" se farq nahi padta. Bina network ka sandbox aaj
     ke model ke liye bhi wahi deewar hai aur agle saal ke model ke liye bhi.</p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Sandbox ke chhed',
      instructions: 'Team kehti hai "hamara agent sandbox mein hai". Chaar jagah deewar mein chhed hai — pakdo.',
      brief: `Ek coding agent customer ke repo par kaam karta hai. Setup: container, ek
        "sirf zaroori" network, aur ek monitoring dashboard. Security review mein tumhe chhed
        dhoondhne hain.`,
      goal: 'Chaar aisi cheezein pakdo jinse agent deewar ke bahar pahunch sakta hai ya bina ruke chal sakta hai.',
      nodes: [
        { id: 'net', label: '🌐 Egress', sub: 'allowlist: github.com, pypi.org… aur cloud metadata address 169.254.169.254 bhi khula', row: 0 },
        { id: 'mount', label: '📁 Mounts', sub: 'repo /workspace par — aur debugging ke liye poora $HOME read-only', row: 0 },
        { id: 'creds', label: '🔑 Credentials', sub: 'agent ke env mein deploy wala AWS admin key', row: 1 },
        { id: 'stop', label: '⏹️ Stop condition', sub: 'koi call budget nahi; agent khud bolega jab kaam khatam', row: 1 },
        { id: 'logs', label: '📜 Tool-call logs', sub: 'har tool call ka host/path/nateeja central log mein', row: 2 },
        { id: 'container', label: '📦 Container', sub: 'non-root user, read-only root filesystem', row: 2 },
      ],
      flaws: [
        { id: 'net', why: '<code>169.254.169.254</code> cloud metadata address hai — wahan se machine ke credentials mil sakte hain. Lab 11 ke audit mein yahi address sabse pehle deny hota hai. Allowlist mein sirf woh jo task ko chahiye.' },
        { id: 'mount', why: 'Read-only bhi ho, poora $HOME mount = SSH keys, tokens, dusre projects — sab padhe ja sakte hain, aur agar network ka koi bhi raasta khula hai toh bahar bhi. Sirf /workspace.' },
        { id: 'creds', why: 'Agent ko admin key dena matlab uski har galti admin ki galti. Chhota, task-specific, kam der tak valid token do — aur behtar ho ki deploy agent ke bahar ek alag, review wale kadam mein ho.' },
        { id: 'stop', why: 'Video ka sabak: models jawab milne ke baad bhi chalte rahe. "Agent khud bolega" = clean stop ki guarantee nahi. Budget (calls, CPU, samay) aur "done ke baad calls" wala alarm chahiye.' },
      ],
      fine: {
        logs: 'Har tool call ka log bilkul sahi hai — isi se monitor bhi banta hai aur incident ke baad kya hua woh bhi pata chalta hai.',
        container: 'Non-root aur read-only root filesystem achhi aadat hai — agent apne hi environment ko nahi badal sakta.',
      },
      lesson: `🎯 Har cheez ke liye ek sawaal: <b>"agar model ekdum galat kaam kare, toh yeh deewar kya rokegi?"</b>
        Jahan jawab "model aisa nahi karega" hai, wahi chhed hai.`,
    },
    {
      type: 'docker',
      title: '🐳 Lab — achha agent, bigda agent, teen modes',
      project: '11-ai-containment',
      exercise: 'ex1-containment',
      goal: 'Ek hi bigde agent ko teen setups mein chalao — bina deewar, sirf deewar, deewar + monitor — aur dekho har layer kya rokti hai.',
      why: `Lab mein "agent" koi AI model nahi hai — tool calls ki ek likhi hui script hai, taaki har
        run same ho. <code>runaway</code> task "done" bolne ke baad bhi 61 aur calls karta hai
        (video ke incident jaisa). Tum sirf deewarein naap rahe ho.`,
      steps: [
        { text: 'Web + runner chalao.', cmd: 'cd docker-labs/11-ai-containment && npm start ex1-containment', expect: 'ex1-containment\nweb → http://localhost:4801   (hosts: docs.internal = allowed, paste.example = NOT allowed)\nrunner → http://localhost:4802   (MODE=none)' },
        { text: 'Achha agent, containment ke saath — kya kuch ruka?', cmd: 'node tools/run.js --task research --mode contain', expect: 'task=research mode=contain planned= 6 executed= 6 allowed= 6 blocked= 0 | bahar gaya: 0 posts, 0 bytes' },
        { text: 'Bigda agent, bina deewar.', cmd: 'node tools/run.js --task runaway --mode none', expect: 'task=runaway  mode=none    planned=67 executed=67 allowed=67 blocked= 0 | bahar gaya: 11 posts, 218 bytes | workspace ke bahar padha: 1 | cpu 790 ms' },
        { text: 'Sirf deewarein.', cmd: 'node tools/run.js --task runaway --mode walls', expect: 'task=runaway  mode=walls   planned=67 executed=67 allowed=20 blocked=47 | bahar gaya: 0 posts, 0 bytes | workspace ke bahar padha: 0 | cpu 415 ms' },
        { text: 'Deewar + monitor + kill switch.', cmd: 'node tools/run.js --task runaway --mode contain', expect: 'task=runaway  mode=contain planned=67 executed= 6 allowed= 5 blocked= 1 | bahar gaya: 0 posts, 0 bytes\n   🚨 ALERT at call #6: task "done" ke baad bhi calls chal rahi hain  → KILLED at call #6' },
        { text: 'Deewar ko audit karo.', cmd: 'node tools/audit.js', expect: '10/10 checks pass — har baar, har run mein, wahi jawab.' },
      ],
      observe: {
        q: '`walls` mode mein kuch bahar nahi gaya, phir bhi `contain` mode kyun chahiye?',
        choices: [
          'Deewar nuksaan rokti hai, samay nahi — agent 67 calls tak ghoomta raha aur CPU khaata raha. Monitor ne "done ke baad calls" pakad ke 6th call par band kar diya',
          'Kyunki walls mode mein data bahar gaya tha',
          'Kyunki contain mode mein allowlist bada hai',
          'Kyunki walls mode achhe agent ko bhi rokta hai',
        ],
        answer: 0,
        explain: 'Har layer alag cheez rokti hai: egress/jail = nuksaan, budget = kharch, monitor = samay. Ek layer doosri ki jagah nahi le sakti.',
      },
      lesson: 'Containment ko naapo: kitni calls block, kitna bahar gaya, alert kitni der mein, kill ke baad kya bacha. Jo naap sakte ho, wahi guarantee de sakte ho.',
    },
  ],
  interview: {
    title: 'Interview Round — agent sandbox',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Agent ka kaam khatam ho gaya par woh calls karta ja raha hai. Kya design karoge?"',
        choices: [
          'Model par "ruk ja" bharosa nahi — call/CPU/samay ka budget, aur "done ke baad bhi calls" par alert + kill switch jo model ke bahar chalta hai',
          'System prompt mein likh denge "kaam khatam ho toh ruk jao"',
          'Zyada smart model use karenge',
          'User ko manually band karne ka button denge',
        ],
        answer: 0,
        explain: 'Clean stop ki guarantee model nahi deta. Rokne wali cheez bahar honi chahiye aur apne aap chalni chahiye.',
      },
      {
        q: 'Interviewer: "Egress allowlist mein kya galti sabse aam hai?"',
        choices: [
          'Naam match ka dhokha (docs.internal.evil.example) aur cloud metadata address (169.254.169.254) khula chhodna — exact host match aur metadata block zaroori',
          'Bahut kam domains allow karna',
          'HTTPS allow karna',
          'DNS use karna',
        ],
        answer: 0,
        explain: 'Lab ka audit dono ko test karta hai: "contains" wala match galat hai, exact host chahiye; aur metadata address se machine credentials milte hain.',
      },
    ],
  },
  success: [
    'Main agent ke liye chaar deewarein design kar sakta hoon',
    'Main bata sakta hoon ki deewar, budget aur monitor alag-alag kya rokte hain',
    'Main containment ka audit likh sakta hoon jo har baar same jawab de',
  ],
  homework: `<p>Lab 11 mein <code>services/runner.js</code> ki <code>POLICY</code> kholo. (1)
    <code>callsAfterDone</code> ko 10 karo — kill kab hua, aur tab tak kitni calls block huin? (2)
    <code>allowHosts</code> mein "sirf ek aur domain" <code>paste.example</code> jodo — ab
    <code>runaway --mode contain</code> mein kya bahar gaya, aur monitor ne kab roka? Isse samjho ki
    allowlist mein "bas ek aur" kitna mehenga pad sakta hai.</p>`,
  cards: [
    { front: 'Agent ki chaar deewarein?', back: 'Egress allowlist (network), workspace jail (files), budget (calls/CPU/samay), monitor + kill switch (vyavhaar).' },
    { front: 'Deewar vs monitor — farq?', back: 'Deewar nuksaan rokti hai (lab: 0 bahar) par agent ghoomta rehta hai (67 calls). Monitor samay bachata hai (6th call par kill).' },
    { front: '"Clean stop" kyun nahi maan sakte?', back: 'Video ke mutabik models jawab milne ke baad bhi din bhar chalte rahe. Rokne ka kaam model ke bahar ka budget + alarm kare.' },
    { front: '169.254.169.254 kya hai?', back: 'Cloud metadata address — wahan se machine ke credentials mil sakte hain. Agent ke egress mein hamesha block.' },
  ],
},

/* =====================================================================
   3. ai-incident-model
   ===================================================================== */
{
  id: 'ai-incident-model',
  icon: '🧯',
  title: 'Incident ke waqt AI — pehle se tayyari',
  badge: 'Apna Model Rakhne Wala',
  objectives: [
    'Incident ke beech closed API "na" bol sakti hai — plan B pehle se',
    'Attack ka data (payloads, live passwords) bahar bhejna khud ek leak hai',
    'Itihaas ke teen sabak: kamzor crypto, "hathiyar" tools, disclosure',
    'Video ki seema: cyber aur bio alag; open weights ek one-way door',
  ],
  lesson: [
    `<h3>🧯 Aag lagne ke baad fire extinguisher khareedna</h3>
     <p>Video ki kahani mein Hugging Face ko breach ke <b>beech</b> pata chala ki unka AI tool madad
     nahi karega. Tab jaake unhone ek model apne hardware par chalaya. Kaam hua — par woh ghante
     us waqt gaye jab sabse kam waqt tha.</p>
     <p>Do sabak jo kisi bhi team par lagte hain, AI safety par kisi ki bhi raay ho:</p>
     <ul>
       <li><b>Plan B pehle se.</b> Incident response mein jo tool chahiye, woh incident se pehle test
       ho chuka ho — ek capable model apne infra par, jise tum logs aur malware dikha sako.</li>
       <li><b>Data kahan ja raha hai?</b> Attack ke logs mein live passwords, customer data, payloads
       hote hain. Unhe kisi bahar ki API ko bhejna = woh data building se bahar. Self-hosted model
       ka faayda sirf "mana nahi karega" nahi, <b>"data bahar nahi jaayega"</b> bhi hai.</li>
     </ul>
     <p class="tip">🎯 Yeh wahi sabak hai jo backups ke saath hai: <b>restore ka test</b> incident se
     pehle karo. "Incident mein AI se madad lenge" bhi ek runbook step hai — use pehle chala ke dekho.</p>`,
    `<h3>📜 Itihaas mein teen baar (video ka tark)</h3>
     <table>
       <tr><th>Pehle kya kaha gaya</th><th>Baad mein kya hua</th></tr>
       <tr><td>90s: export ke liye jaan-boojh ke kamzor crypto</td><td>2015: FREAK aur Logjam attacks — wahi kamzor crypto saalon baad bhi servers par tha</td></tr>
       <tr><td>Metasploit, Mimikatz = "script kiddies ko hathiyar"</td><td>Aaj standard defensive tools; Mimikatz ki wajah se Microsoft Credential Guard bana</td></tr>
       <tr><td>2001: disclosure = "information anarchy"</td><td>CVE system, bug bounties, Project Zero — disclosure hi defense ban gaya</td></tr>
     </table>
     <p>Speaker ka tark: har baar "defender se gyaan chhupao" ne defender ko hi kamzor kiya.</p>
     <h3>⚖️ Aur speaker khud jahan rukta hai</h3>
     <ul>
       <li><b>Sirf cyber.</b> Cyber mein attack aur defense ke tools same hain aur dono machine speed
       par chalte hain. <b>Bio alag</b> hai: attack din mein, defense (vaccine) saalon mein — wahan
       yeh tark nahi chalta.</li>
       <li><b>Open weights ek one-way door.</b> Ek baar weights bahar gaye toh wapas nahi aate; safety
       hataayi ja sakti hai. Isliye ship karne se pehle cyber/bio capability <b>naapna</b> zaroori hai.</li>
     </ul>
     <p class="tip">🎯 Tumhare liye practical nateeja: raay chahe jo ho, <b>containment har case mein
     kaam aata hai</b>, aur incident ki tayyari (apna model, apna data, test kiya hua runbook) har case
     mein zaroori hai.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — breach ke beech AI ne mana kar diya (video ke mutabik)',
      instructions: 'Timeline chalao. Jahan sawaal aaye wahan rukega.',
      incident: 'Hugging Face attack, July 2026 — video ke mutabik',
      goal: 'Dekho incident ke waqt kaunse faisle pehle se tay hone chahiye the.',
      speedMs: 1800,
      metrics: [
        { id: 'events', label: 'Events jo samajhne baaki hain', unit: '', max: 17000, dir: 'lower' },
        { id: 'hours', label: 'Ghante beete', unit: 'h', max: 48, dir: 'lower' },
      ],
      frames: [
        { t: 'T+0', event: 'Ek test setup mein chal raha model (safeguards <b>band</b>) Hugging Face ke infra par attack karta hai.', metrics: { events: 17000, hours: 0 }, tone: 'bad' },
        { t: 'T+2h', event: 'Security team ke paas <b>17,000 events</b>. Payloads, commands, credentials — sab samajhna hai.', metrics: { events: 17000, hours: 2 }, tone: 'warn' },
        { t: 'T+4h', event: 'Bade hosted models se madad maangi — "yeh malware analyse karo". Jawab: <b>mana</b>.', metrics: { events: 16800, hours: 4 }, tone: 'bad',
          ask: { q: 'Is pal ka sabse bada design sabak kya hai?',
                 choices: [
                   'Incident tooling pehle se tay aur test honi chahiye — ek capable model apne infra par, jise attack ka data dikhaya ja sake',
                   'Aur zor se prompt likhna chahiye tha',
                   'Hosted model ki shikayat karni chahiye',
                   'Logs delete kar dene chahiye',
                 ], answer: 0,
                 explain: 'Incident ke beech naya tool dhoondhna sabse mehenga samay hai. Runbook ka har tool pehle chala ke dekha hona chahiye.',
                 wrongHints: ['Prompt badalna usi filter se ladna hai — aur incident ke beech waqt barbaad.', 'Shikayat se aaj ka incident nahi sulajhta.', 'Logs hi saboot hain.'] } },
        { t: 'T+6h', event: 'Team ek open-weights model apne hardware par chalati hai.', metrics: { events: 12000, hours: 6 }, tone: 'warn' },
        { t: 'T+10h', event: 'Analysis chal pada. Passwords aur payloads <b>building se bahar nahi gaye</b>.', metrics: { events: 3000, hours: 10 }, tone: 'ok',
          ask: { q: 'Self-hosted model ka doosra, kam dikhne wala faayda?',
                 choices: [
                   'Attack data mein live credentials aur customer data hota hai — bahar ki API ko bhejna khud ek naya leak hai',
                   'Self-hosted hamesha tez hota hai',
                   'Self-hosted model zyada smart hota hai',
                   'Koi faayda nahi',
                 ], answer: 0,
                 explain: 'Incident data sabse sensitive data hai. "Mana nahi karega" ke saath "bahar nahi jaayega" bhi utna hi bada faayda hai.',
                 wrongHints: ['Speed hardware par depend karti hai.', 'Smartness ka sawaal nahi — data kahan jaata hai, woh sawaal hai.', 'Data leak rokna bada faayda hai.'] } },
        { t: 'Postmortem', event: 'Video ke mutabik postmortem ne ise "asymmetry problem" kaha, aur us model ke safeguards band the jisne attack kiya.', metrics: { events: 0, hours: 30 }, tone: 'ok' },
      ],
    },
    {
      type: 'quiz',
      title: 'Raay aur seema',
      questions: [
        {
          q: 'Speaker khud kis area mein apna tark lagu NAHI karta?',
          choices: [
            'Bio — wahan attack din mein hota hai aur defense (vaccine) mein saal lagte hain',
            'Cyber',
            'Coding agents',
            'Search',
          ],
          answer: 0,
          explain: 'Cyber mein attack aur defense same tools aur same speed par hain. Bio mein yeh barabari nahi hai.',
        },
        {
          q: '"Open weights ek one-way door hai" — matlab?',
          choices: [
            'Weights ek baar bahar gaye toh wapas nahi aate aur safety hataayi ja sakti hai — isliye release se pehle capability naapo',
            'Open weights ko band nahi kar sakte isliye woh hamesha safe hain',
            'Open weights sirf ek baar download ho sakte hain',
            'Open weights ke liye door (API) chahiye',
          ],
          answer: 0,
          explain: 'Release ek aisa faisla hai jo palta nahi ja sakta — isliye measure pehle, ship baad mein.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — incident readiness',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Security incident mein LLM se log analyse karwane ka plan banao."',
        choices: [
          'Pehle se ek capable model apne infra par, jiske paas incident data jaa sake bina building chhode; runbook mein test kiya hua; aur containment ke andar chalta hua',
          'Jo bhi hosted API sasti ho, incident ke waqt use kar lenge',
          'LLM ki zaroorat nahi, sab manual karenge',
          'Incident data ko pehle anonymize karke public model ko bhejenge, har baar',
        ],
        answer: 0,
        explain: 'Teen cheezein: availability (mana na kare), data locality (bahar na jaaye), aur pehle se test.',
      },
      {
        q: 'Interviewer: "Kya refusal band kar dena chahiye?"',
        choices: [
          'Filter ek layer ho sakta hai par boundary nahi — load-bearing cheez containment hai. Aur yeh bahas domain par depend karti hai (cyber vs bio)',
          'Haan, refusal hamesha galat hai',
          'Nahi, refusal hi asli safety hai',
          'Isse system design ka koi lena-dena nahi',
        ],
        answer: 0,
        explain: 'Balanced jawab: filter aur deewar alag guarantees dete hain; design mein deewar par tiko.',
      },
    ],
  },
  success: [
    'Main incident response mein AI tooling ko pehle se tay aur test karne ka plan bana sakta hoon',
    'Main samjha sakta hoon ki incident data bahar bhejna kyun khatarnak hai',
    'Main video ki raay aur uski seemaon ko alag bata sakta hoon',
  ],
  homework: `<p>Apni team ka security incident runbook kholo (ya ek pehla draft likho). Usme ek naya
    step jodo: "logs aur samples ka analysis kis tool se, kahan chalega, aur data kahan jaayega?"
    Us tool ko <b>aaj</b> ek purane log par chala ke dekho — kya woh mana karta hai? Kya data tumhare
    network se bahar jaata hai?</p>`,
  cards: [
    { front: 'Incident mein self-hosted model ke do faayde?', back: '(1) Mana nahi karega — attack data dikha sakte ho. (2) Data bahar nahi jaata — live passwords, payloads, customer data building mein rehte hain.' },
    { front: 'Itihaas ke teen misaal (video)?', back: 'Kamzor export crypto → FREAK/Logjam (2015); Metasploit/Mimikatz → standard defense, Credential Guard; disclosure → CVE, bug bounty, Project Zero.' },
    { front: 'Video ka tark kahan rukta hai?', back: 'Sirf cyber par. Bio mein attack din mein, defense saalon mein — barabari nahi. Aur open weights one-way door hain: release se pehle capability naapo.' },
  ],
},
]);

})();
