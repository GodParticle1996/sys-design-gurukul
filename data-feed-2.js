/* =====================================================================
   TRACK — 📡 The Feed · do aur postmortems: CrowdStrike (2024) aur Datadog (2023)

   Sources: "CrowdStrike Outage — 8.5 Million Computers" aur "How Datadog Lost
   40,000 Servers in 13 Hours" (Akhil Sharma) — CrowdStrike RCA, Microsoft
   write-ups, Datadog RCA, Pragmatic Engineer, systemd/Cilium bug reports.
   Docker labs: docker-labs/17-crowdstrike, docker-labs/23-datadog

   ⚠️ data-feed.js ke BAAD load ho — levels 'pm-spiral' ke turant baad judte
   hain (boss aakhir mein hi rehta hai).
   ===================================================================== */
(function () {

VISUALS['pm-crowdstrike'] = {
  t: '21 maange, 20 mile — 85 lakh machines',
  html: `
    <div class="dg-split">
      <div class="dg-box is-accent"><span class="bx-label">🚗 Engine (slow lane)</span>
        <div class="dg-cap">Sensor code <code>csagent.sys</code> — kernel driver, Microsoft WHQL signed, hafton ka QA. Template TYPE
          (contract): IPC rule mein 21 fields. Sensor deta hai <b>20</b> inputs (Feb 2024 se).</div></div>
      <div class="dg-box is-bad"><span class="bx-label">⛽ Fuel (fast lane)</span>
        <div class="dg-cap">Channel file 291 — template INSTANCES (data). Feb–July har rule mein field 21 = <b>wildcard</b> → input 21 kabhi
          padha hi nahi. 19 July: pehli baar asli value → <code>input[20]</code> → kernel mein galat address → BSOD.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">Validator ne rule ko <b>spec</b> (21 fields?) se check kiya, <b>sensor code</b> se nahi. Do components, dono apne aap mein
      sahi — unke beech ka contract kisi ne check nahi kiya.</div>`,
};

VISUALS['pm-crowdstrike-lanes'] = {
  t: 'Deployment radius = blast radius',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🐢 Slow lane — sensor releases</span>
        <div class="dg-cap">Poora QA, dogfood, gradual rollout, customers N-1/N-2 chun sakte the.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">⚡ Fast lane — rapid response content</span>
        <div class="dg-cap">Ek automated gate (content validator) → <b>poora fleet turant</b>. N-1/N-2 wale customers ko bhi content turant.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">🌍</span><span class="nl">spec + global</span><span class="ns">lab: 500/500 boot loop, 92 manual</span></div>
      <div class="dg-node is-gold"><span class="ni">🐤</span><span class="nl">spec + rings</span><span class="ns">5 canary gire, rollout HALTED</span></div>
      <div class="dg-node is-good"><span class="ni">📜</span><span class="nl">contract validator</span><span class="ns">publish hi REJECTED, 0 crash</span></div>
    </div>`,
};

VISUALS['pm-crowdstrike-recovery'] = {
  t: 'Fix 80 ms door — par pahunch se bahar',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">🔌 power on</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">🛡️ boot-start driver zehreela 291 padhta hai</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">💥 BSOD — network aane se PEHLE</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🔁 reboot</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">"15 baar reboot karo"</span><span class="q">kabhi network pehle jeet jaaye (lab: 10% chance, 92 phir bhi atke)</span></div>
      <div class="dg-rung a"><span class="lv">2</span><span class="cmd">Safe mode → C-00000291*.sys delete</span><span class="q">~30 sec per machine × 85 lakh, insaan keyboard par</span></div>
      <div class="dg-rung a"><span class="lv">🔑</span><span class="cmd">BitLocker 48-digit recovery key</span><span class="q">keys Active Directory servers mein — jo khud blue screen the</span></div>
    </div>`,
};

VISUALS['pm-crowdstrike-domain'] = {
  t: 'Crash domain machine se chhota',
  html: `
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">🪟</span><span class="nl">Windows kernel driver</span><span class="ns">bug = poori machine fail-stop (BSOD)</span></div>
      <div class="dg-node is-good"><span class="ni">🍎</span><span class="nl">macOS Endpoint Security (2019+)</span><span class="ns">agent user space mein — crash = process mara, restart</span></div>
      <div class="dg-node is-good"><span class="ni">🐧</span><span class="nl">Linux eBPF</span><span class="ns">verifier LOAD se pehle PROVE karta hai: no out-of-bounds, no infinite loop</span></div>
    </div>
    <div class="dg-cap">Lab 17 user mode: wahi zehreela content, agent 7,163 baar restart — <b>ek bhi machine nahi giri</b>.
      Jahan failure afford nahi, wahan content ko test mat karo — <b>prove</b> karo (interpreter ke aage verifier).</div>`,
};

VISUALS['pm-datadog'] = {
  t: 'Multi-region ≠ multi-fault-domain',
  html: `
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">🗺️ Pehla diagram — geography</span>
        <div class="dg-cap">5 regions, 3 clouds (AWS, Azure, GCP), kai AZs. AZ → region → cloud ki failures alag-alag.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">🧬 Doosra diagram — software supply chain</span>
        <div class="dg-cap">Har machine: same Ubuntu, same update source, same auto-update job, same UTC ghadi. Region ka koi matlab nahi.</div></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-cap">8 March 2023, 06:00 UTC: <b>~40,000 servers</b>, har region, ek hi minute mein. 13 ghante zyadatar ke liye, baaki ~ek din.
      Pragmatic Engineer ke andaaze se ~$5M revenue. Trigger: 27 mahine purana systemd badlaav.</div>`,
};

VISUALS['pm-datadog-rules'] = {
  t: 'Saajha ip rule table — koi maalik nahi',
  html: `
    <div class="dg-flow">
      <span class="dg-pill acc">🐝 Cilium: "fwmark 0x200 → cilium table"</span><span class="dg-arrow">+</span>
      <span class="dg-pill">⚙️ systemd-networkd: reapply par "jo mera nahi, saaf"</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">🕳️ pod packets main table mein → mar gaye</span>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-split">
      <div class="dg-box is-good"><span class="bx-label">✅ Reboot (CI ka test)</span>
        <div class="dg-cap">networkd pehle (cilium ke rules abhi nahi) → cilium baad mein → 100/100.</div></div>
      <div class="dg-box is-bad"><span class="bx-label">💀 In-place patch (prod)</span>
        <div class="dg-cap">Cilium rules pehle se → networkd reapply → saaf → 0/100. Wahi code, alag <b>order</b>.</div></div>
    </div>`,
};

VISUALS['pm-datadog-recovery'] = {
  t: 'Recovery bhi usi aag ke andar',
  html: `
    <div class="dg-stack">
      <div class="dg-node is-bad"><span class="ni">🙈</span><span class="nl">Andhe</span><span class="ns">apna infra samajhne ka tool = Datadog — jo band tha</span></div>
      <div class="dg-node is-bad"><span class="ni">🔒</span><span class="nl">Taala dono taraf</span><span class="ns">nodes control plane tak nahi, control plane nodes tak nahi — self-healing galat taraf</span></div>
      <div class="dg-node is-gold"><span class="ni">🪜</span><span class="nl">Kram</span><span class="ns">parent control planes → worker machines → services</span></div>
      <div class="dg-node is-gold"><span class="ni">🐃</span><span class="nl">Thundering herd</span><span class="ns">hazaron nodes ek saath re-register; teeno clouds ne limits live badhayi</span></div>
    </div>
    <div class="dg-cap">Lab 23: 5,000 nodes — turant retry 30.2 s (35,548 bekaar koshishein) vs backoff 6.6 s.</div>`,
};

VISUALS['pm-datadog-fixes'] = {
  t: 'Doosra diagram banao',
  html: `
    <div class="dg-ladder">
      <div class="dg-rung"><span class="lv">1</span><span class="cmd">Geographic pass</span><span class="q">zones, regions, failover — sab karte hain</span></div>
      <div class="dg-rung g"><span class="lv">2</span><span class="cmd">Stack pass</span><span class="q">har fleet-jaisi cheez: kahan se aati hai? kaunsa event badalta hai? kya sab jagah ek saath?</span></div>
    </div>
    <div class="dg-rule"></div>
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">📦</span><span class="nl">OS + package mirror</span><span class="ns"></span></div>
      <div class="dg-node"><span class="ni">🖼️</span><span class="nl">Base image, CI, registry</span><span class="ns"></span></div>
      <div class="dg-node"><span class="ni">🔐</span><span class="nl">Certificate authority, DNS provider</span><span class="ns"></span></div>
      <div class="dg-node is-bad"><span class="ni">⏰</span><span class="nl">Auto-updater + UTC cron</span><span class="ns">40,000 machines, kisi diagram par nahi</span></div>
    </div>`,
};

SD.registerLevelsAfter('feed', 'pm-spiral', [
/* =====================================================================
   1. pm-crowdstrike
   ===================================================================== */
{
  id: 'pm-crowdstrike',
  icon: '🟦',
  title: 'Postmortem — CrowdStrike: 21 maange, 20 mile',
  badge: 'Contract Chowkidar',
  objectives: [
    '19 July 2024: 40 KB config, 85 lakh machines, 78 minute',
    'Kernel mode vs user mode — BSOD ek design faisla hai',
    'Engine vs fuel: sensor code aur channel files',
    '21 vs 20 ka contract, aur wildcard ne use 5 mahine kaise chhupaya',
  ],
  lesson: [
    `<h3>📰 Shukravaar, 19 July 2024, 04:09 UTC</h3>
     <p>Ek ~40 KB <b>config file</b> (rules, code nahi) har Windows Falcon machine tak pahunchi; 78 minute baad (05:27 UTC) wapas li gayi.
     Tab tak <b>85 lakh</b> machines blue screen — aur reboot par phir crash. Hazaron flights cancel, Delta 5 din tootta raha, operations
     taale, banks jame, 911 lines band, Sky News andhera, haath se likhe boarding pass. Fortune 500 ka nuksaan ~$5.4B.</p>
     <p>Paradox: 85 lakh = Microsoft ke mutabik Windows machines ka &lt;1%. Par <b>woh 1% jis par duniya chalti hai</b> — airline gates,
     hospitals, banks, trading, kiosks, departure boards, POS. Fortune 500 ka lagbhag ek chauthai.</p>
     <h3>🛡️ EDR kernel mein kyun?</h3>
     <p>EDR (endpoint detection & response) processes, files, network, IPC dekhta hai aur hamle ko beech mein rokta hai. Use sab dekhna hai,
     malware se pehle chalna hai, aur maara nahi ja sakna chahiye → <b>kernel</b>. User mode mein har process ki apni deewar wali memory
     (galat access → process mara). Kernel mode = ek memory, ek bharosa; galat access → <b>fail-stop</b>. BSOD ek design faisla hai:
     kernel ki haalat bigdi → data bigadne se pehle ruk jao. Aur isliye kernel driver ka koi bhi bug = poori machine.</p>`,
    `<h3>🚗 Engine vs ⛽ fuel</h3>
     <p>Kernel drivers ko Microsoft ka WHQL test/certify/sign chahiye (hafte). Par naye hamlon ki detections roz chahiye. Isliye:</p>
     <ul>
       <li><b>Engine</b> — <code>csagent.sys</code> (ek baar signed) jiske andar ek <b>interpreter</b>.</li>
       <li><b>Template TYPES</b> — sensor code mein (ek category: process creation, file writes, network) — slow lane, sensor releases ke saath.</li>
       <li><b>Template INSTANCES</b> — <b>channel files</b> mein data rules — fast lane. Industry ka aam pattern.</li>
     </ul>
     <p>Channel file <b>291</b> = named pipes (IPC; Cobalt Strike jaisa tool lateral movement/C2 ke liye use karta hai) — aksar badalta hai.</p>
     <h3>💣 5 mahine ka bam</h3>
     <p>Feb 2024, sensor 7.11: naya IPC template type — contract <b>21</b> inputs maangta hai, sensor code <b>20</b> deta hai. Feb se July tak har
     instance ne field 21 mein <b>wildcard</b> rakha → interpreter input 21 kabhi padhta hi nahi. Validator ne rules ko <b>spec</b> (21 fields)
     se check kiya, <b>sensor code</b> se nahi. Tests the aur pass hue (Feb ka stress test, wildcards ke saath) — tests maujooda duniya ka
     sample hain; zehreela input abhi likha hi nahi gaya tha.</p>
     <p>19 July: do naye IPC instances; ek ne <b>pehli baar</b> field 21 mein asli value daali. Validator: 21 fields = pass. Named pipe event
     aaya (lagatar aate hain) → fields 1..21 compare → 20 wale array se <code>input[21]</code> → kernel mein galat address →
     <code>PAGE_FAULT_IN_NONPAGED_AREA</code> (csagent.sys) → BSOD. Sab jagah ek saath.</p>`,
  ],
  stages: [
    {
      type: 'replay',
      title: 'Replay — 19 July 2024',
      instructions: 'Timeline chalao. Jahan sawaal aaye wahan rukega.',
      incident: 'CrowdStrike Falcon channel file 291',
      goal: 'Dekho ek chhota data badlaav kaise ek saath 85 lakh machines tak pahuncha, aur kahan-kahan roka ja sakta tha.',
      speedMs: 1800,
      metrics: [
        { id: 'down', label: 'Machines blue screen (lakh)', unit: 'L', max: 85, dir: 'lower' },
      ],
      frames: [
        { t: 'Feb 2024', event: 'Sensor 7.11: naya IPC template type. Contract 21 fields, sensor deta hai 20 inputs. Sab rules mein field 21 = wildcard.', metrics: { down: 0 } },
        { t: 'Feb–Jul', event: 'Har content release validator pass, har test pass. Bam 5 mahine se laga hai.', metrics: { down: 0 }, tone: 'warn',
          ask: { q: 'Validator ne kaunsi cheez check nahi ki?',
                 choices: [
                   'Rule ke asli-value wale fields sensor ke inputs ke andar hain ya nahi — spec check kiya, code ke saath contract nahi',
                   'File ka size',
                   'Signature',
                   'Rules ki ginti',
                 ], answer: 0,
                 explain: 'Do components apne aap mein sahi the. Beech ka contract kisi ke zimme nahi tha.',
                 wrongHints: ['Size theek tha — 40 KB.', 'Signature sahi tha — file asli thi.', 'Ginti ka lena-dena nahi.'] } },
        { t: '19 Jul 04:09', event: 'Channel file 291 fast lane se poore fleet ko. Ek naye rule mein field 21 mein pehli baar asli value.', metrics: { down: 20 }, tone: 'bad' },
        { t: '04:15', event: 'Named pipe events aate hi <code>input[21]</code> → kernel page fault → BSOD. Sydney dopahar, Europe jaag raha, US so raha.', metrics: { down: 60 }, tone: 'bad',
          ask: { q: 'Itni tezi se har jagah kyun?',
                 choices: [
                   'Fast lane ek automated gate ke baad POORE fleet ko turant — deployment radius = poora fleet = blast radius',
                   'Malware phaila',
                   'Windows update',
                   'Network attack',
                 ], answer: 0,
                 explain: 'N-1/N-2 chunne wale customers ko bhi content turant mila tha.',
                 wrongHints: ['Koi malware nahi — CrowdStrike ka apna content.', 'Microsoft ka update nahi tha.', 'Attack nahi, config.'] } },
        { t: '05:27', event: 'Content wapas liya (78 minute). Par jo machines crash ho chuki thin, woh reboot par phir crash.', metrics: { down: 85 }, tone: 'bad' },
        { t: 'Din–hafte', event: 'Safe mode, BitLocker keys, haath se file delete. Delta ~5 din. Mac aur Linux par zero crashes.', metrics: { down: 40 }, tone: 'warn' },
      ],
    },
    {
      type: 'quiz',
      title: 'Kernel aur contract ki samajh',
      questions: [
        {
          q: 'BSOD ko "design faisla" kyun kaha?',
          choices: [
            'Kernel ki haalat bigdi toh aage chalna data barbaad kar sakta hai — fail-stop surakshit hai; par isliye kernel driver ka bug = poori machine',
            'Windows ka bug hai',
            'User ko darane ke liye',
            'Hardware fail hota hai',
          ],
          answer: 0,
          explain: 'User mode mein wahi bug sirf process maarta (Mac/Linux ki tarah).',
        },
        {
          q: 'Wildcard ne bug ko 5 mahine kaise chhupaya?',
          choices: [
            'Field 21 wildcard = interpreter use kabhi padhta hi nahi; out-of-bounds read tabhi hota jab koi asli value daale — tests maujooda (wildcard) rules par hi the',
            'Wildcard ne error pakad liya',
            'Tests nahi the',
            'Sensor purana tha',
          ],
          answer: 0,
          explain: 'Passing test sirf un inputs ko cover karta hai jo pehle se hain. Content pipeline ko fuzz karo.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — config is code',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Config/rules file ko code jaisa treat kyun?"',
        choices: [
          'Woh bhi production behaviour badalta hai — reviews, tests (asli values, fuzz), canary, staged rollout aur rollback chahiye; contract (engine ke saath) check ho',
          'Kyunki woh git mein hai',
          'Nahi, config safe hai',
          'Sirf size ke liye',
        ],
        answer: 0,
        explain: 'Cloudflare 2019 (regex) aur CrowdStrike 2024 — dono config the.',
      },
      {
        q: 'Interviewer: "Do teams: ek engine, ek rules. Bug beech mein kaise na aaye?"',
        choices: [
          'Contract ek jagah machine-readable ho, aur validator rules ko engine ke ASLI capabilities (sensor ke inputs) se check kare; interpreter mein bounds checks bhi',
          'Teams merge karo',
          'Zyada meetings',
          'Rules kam badlo',
        ],
        answer: 0,
        explain: '"Validate contracts, not just artifacts."',
      },
    ],
  },
  success: [
    'Main kernel fail-stop aur engine/fuel split samjha sakta hoon',
    'Main 21 vs 20 ka contract bug aur wildcard ka chhupana bata sakta hoon',
    'Main "config is code" ka tark de sakta hoon',
  ],
  homework: `<p>Apne system mein ek "fuel" dhoondho — rules, feature flags, ML model, config — jo "engine" (code) se alag, tez raaste se jaata
    hai. Engine us fuel se kya maanta hai (fields, ranges, size)? Kya koi validator engine ki <b>asli</b> seemaon se check karta hai?</p>`,
  cards: [
    { front: 'CrowdStrike 2024 ka root cause?', back: 'IPC template type ka contract 21 inputs, sensor code 20 deta tha. Rule mein pehli baar field 21 mein asli value → input[21] out-of-bounds → kernel BSOD.' },
    { front: 'Bug 5 mahine kyun chhupa?', back: 'Feb–July har rule mein field 21 wildcard — interpreter use padhta hi nahi. Validator spec se check karta tha, sensor code se nahi.' },
    { front: 'Engine vs fuel?', back: 'Engine: csagent.sys (WHQL signed, slow lane). Fuel: channel files (template instances, fast lane). Industry ka aam pattern.' },
  ],
},

/* =====================================================================
   2. pm-crowdstrike-lanes
   ===================================================================== */
{
  id: 'pm-crowdstrike-lanes',
  icon: '🛣️',
  title: 'Do lanes — aur deployment radius = blast radius',
  badge: 'Ring Rakshak',
  objectives: [
    'Slow lane (sensor) vs fast lane (content)',
    'Fast lane ka ek gate aur poora fleet turant',
    'Lab: spec validator + global vs rings vs contract validator',
    'Fixes: staged content rollout, canary, customer controls',
  ],
  lesson: [
    `<h3>🛣️ Do lanes</h3>
     <table>
       <tr><th></th><th>🐢 Slow lane</th><th>⚡ Fast lane</th></tr>
       <tr><td>Kya</td><td>Sensor releases (code)</td><td>Rapid response content (channel files)</td></tr>
       <tr><td>Gate</td><td>Poora QA, dogfood, gradual rollout</td><td>Ek automated "content validator" (cloud)</td></tr>
       <tr><td>Kitne tak</td><td>Customers N-1/N-2 chun sakte</td><td><b>Poora fleet, turant</b> (N-1/N-2 walon ko bhi)</td></tr>
     </table>
     <p class="tip">🎯 <b>Asli blast radius = deployment radius.</b> Jo cheez 1 ghante se kam mein 100% fleet tak pahunchti hai, woh tumhara sabse bada
     single point of failure hai — chahe woh "sirf config" ho.</p>
     <h3>🔧 Baad ke fixes</h3>
     <ul>
       <li>Interpreter mein bounds checks; validator field counts check kare; tests asli values se (wildcards nahi).</li>
       <li>Content pipeline par <b>staged rollout, canary</b>, customer controls, reviews.</li>
     </ul>`,
    `<h3>📏 Lab 17 — 500 machines, zehreela channel file</h3>
     <pre>validator=spec rollout=global  (kernel)
  t=1s  up=  0 bootloop=500               ← poora fleet ek second mein
  t=3s  → FIX publish
  t=6s  up=408 manual=92

validator=spec rollout=rings   (kernel)
  t=1s  up=495 bootloop=5 | rings open 1 (HALTED)
  t=6s  up=500

validator=contract rollout=global
publish c291 → 🛑 REJECTED: field 21 par asli value, par sensor sirf 20 inputs deta hai
  t=1s  up=500</pre>
     <p>Rings: 1% canary → 10% → 50% → 100%, har gate par "pichhli ring mein crash?" → ruko. Wahi bug, sirf <b>5</b> machines. Contract validator:
     zehreela file publish hi nahi hua. Do alag layers, dono chahiye.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — content push: global vs rings vs contract',
      project: '17-crowdstrike',
      exercise: 'ex1-content-push',
      goal: 'Wahi zehreela channel file 291 — spec validator + global push, spec + rings (canary gate), aur contract-aware validator.',
      why: `<code>lib/sensor.js</code>: sensor 20 inputs deta hai, template 21 fields maangta hai; out-of-bounds par fatal
        <code>PAGE_FAULT_IN_NONPAGED_AREA</code>. <code>services/cloud.js</code> validator + rollout; <code>services/fleet.js</code> 500 machines,
        boot loop ke saath. Fix t=3 sec par (asli mein 78 min).`,
      steps: [
        { text: 'Cloud + fleet chalao (kernel mode).', cmd: 'cd docker-labs/17-crowdstrike && npm start ex1-content-push', expect: 'ex1-content-push' },
        { text: 'Spec validator, global push.', cmd: 'node tools/incident.js --validator spec --rollout global', expect: '  t=1s  up=  0 bootloop=500 manual=  0 | kabhi crash hue: 500\n  t=3s  → FIX publish kiya (revert)\n  t=6s  up=408 bootloop=  0 manual= 92' },
        { text: 'Spec validator, rings.', cmd: 'node tools/incident.js --validator spec --rollout rings', expect: '  t=1s  up=495 bootloop=  5 manual=  0 | kabhi crash hue: 5 | rings open 1 (HALTED)\n  t=6s  up=500 bootloop=  0 manual=  0' },
        { text: 'Contract validator.', cmd: 'node tools/incident.js --validator contract --rollout global', expect: 'publish c291 (jul-19) → 🛑 REJECTED: field 21 par asli value, par sensor sirf 20 inputs deta hai\n  t=1s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 0' },
      ],
      observe: {
        q: 'Rings ne 5 par rok diya. Toh contract validator kyun chahiye?',
        choices: [
          'Rings nuksaan ko 1% tak simit karti hain par 5 machines phir bhi giri; contract validator bug ko publish se pehle hi rok deta hai — do alag layers',
          'Rings kaafi hain',
          'Validator rings ki jagah le leta hai',
          'Dono bekaar',
        ],
        answer: 0,
        explain: 'Prevention (contract) + containment (rings). Ek doosre ki jagah nahi.',
      },
      lesson: 'Fast lane ko bhi rings chahiye, aur validator ko contract. Deployment radius tay karta hai blast radius.',
    },
    {
      type: 'order',
      title: 'Surakshit content pipeline',
      instructions: 'Ek naya detection rule production tak — sahi kram.',
      steps: [
        { text: 'Rule likho + contract-aware validation (engine ki asli capabilities se)', explain: 'Artifact nahi, contract check.' },
        { text: 'Tests asli values ke saath + fuzz (schema edges)', explain: 'Wildcards se bharosa mat karo.' },
        { text: 'Internal dogfood fleet par', explain: 'Apni machines pehle.' },
        { text: 'Canary ring (1%) + health gate', explain: 'Crash dikha toh apne aap ruko.' },
        { text: '10% → 50% → 100%, har ring ke baad bake time', explain: 'Deployment radius dheere badhao.' },
        { text: 'Rollback raasta jo tootti machine par bhi kaam kare', explain: 'Agla level: boot loop.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — fast lanes',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Security rules ghante mein poore fleet par chahiye — rollout ka kya?"',
        choices: [
          'Tez par staged: canary ring + automatic health gate + minutes ka bake, har ring; customers ko ring chunne do; aur contract validator publish se pehle',
          'Global push, security zaroori hai',
          'Hafte ka rollout',
          'Customers khud download karein',
        ],
        answer: 0,
        explain: 'Tez aur surakshit ek saath — rings minutes ki ho sakti hain.',
      },
      {
        q: 'Interviewer: "Hamare paas aisi kaunsi cheezein ho sakti hain jo 1 ghante mein 100% fleet tak jaati hain?"',
        choices: [
          'Feature flags, config pushes, auto-updating agents (EDR, observability, MDM), base images, certificates, DNS changes — sab SPOF ki list mein',
          'Sirf code deploys',
          'Kuch nahi',
          'Sirf database migrations',
        ],
        answer: 0,
        explain: 'Har auto-updating agent = vendor ke CI se har machine tak pipe, tumhare change management ke bahar.',
      },
    ],
  },
  success: [
    'Main slow lane aur fast lane ka farq aur khatra samjha sakta hoon',
    'Main lab se global vs rings vs contract validator dikha sakta hoon',
    'Main surakshit content pipeline ka kram bata sakta hoon',
  ],
  homework: `<p>Apni team ki woh saari cheezein list karo jo 1 ghante se kam mein poore fleet tak pahunchti hain. Har ek ke saamne: canary hai?
    health gate hai? rollback bina tootti machine ki madad ke? Yahi tumhari asli SPOF list hai.</p>`,
  cards: [
    { front: 'CrowdStrike ki do lanes?', back: 'Slow: sensor releases (QA, dogfood, gradual, N-1/N-2). Fast: channel files — ek validator gate ke baad poora fleet turant.' },
    { front: '"Deployment radius = blast radius"?', back: 'Jo cheez <1 ghante mein 100% fleet tak jaati hai woh sabse bada SPOF hai, chahe "sirf config" ho.' },
    { front: 'Lab 17: global vs rings vs contract?', back: 'Global: 500/500 boot loop, 92 manual. Rings: 5 canary gire, HALTED. Contract validator: publish REJECTED, 0 crash.' },
  ],
},

/* =====================================================================
   3. pm-crowdstrike-recovery
   ===================================================================== */
{
  id: 'pm-crowdstrike-recovery',
  icon: '🔁',
  title: 'Boot loop — fix 80 ms door, par pahunch se bahar',
  badge: 'Recovery Rakshak',
  objectives: [
    'Boot-start driver + disk par zehreela file = boot loop',
    '"15 baar reboot karo" aur safe mode ka raasta',
    'BitLocker keys usi aag ke andar',
    'Recovery ki planning: jab machines madad na kar sakein',
  ],
  lesson: [
    `<h3>🔁 Boot loop</h3>
     <p>Falcon ek <b>boot-start</b> driver hai — jaldi load hota hai taaki malware use hara na sake. Boot par woh disk par pada zehreela 291
     padhta hai → network aane se <b>pehle</b> crash. Fix cloud par "80 ms door" tha — par machine tak kabhi pahuncha hi nahi.</p>
     <p>Boot deterministic nahi — kabhi network jeet jaata → Microsoft: <b>"15 baar tak reboot karo"</b>. Warna: Safe Mode / recovery →
     <code>C-00000291*.sys</code> delete → reboot. ~30 sec per machine × 85 lakh. Remote tools ko chalta hua OS chahiye → <b>insaan
     keyboard par</b>. Jo machines us 78 minute mein band thin, woh bach gayi.</p>
     <pre>lab 17 (fix t=3s, har reboot par 10% chance network pehle):
  t=4s  up=214 bootloop=286
  t=5s  up=340 bootloop=160
  t=6s  up=408 bootloop=0  manual=92   ← 15 reboots ke baad bhi 18% haath se</pre>`,
    `<h3>🔑 BitLocker — chaabi usi ghar mein jismein aag lagi</h3>
     <p>Safe mode ke liye BitLocker ki <b>48-digit recovery key</b> chahiye. Keys escrowed thin Active Directory management servers mein — jo
     <b>khud blue screen</b> the. USB sticks, seedhiyan, keys print karke; bootable USB tools aane mein hafte.</p>
     <p class="tip">🎯 Yahi pattern Datadog mein bhi (monitoring apne hi outage ke andar): <b>recovery ka raasta failure ke peeche band</b>.
     Plan karo us din ke liye jab machines kuch madad nahi kar sakti — no network, no agents, no remote hands. BitLocker keys kahan hain?</p>
     <h3>💸 Nuksaan aur ajeeb baat</h3>
     <p>Delta ~5 din, ~$500M ka daava, mukadme. CRWD stock ~1/3 gira. Par zyadatar customers <b>ruke</b> — 1 lakh endpoints se EDR ukhaadna
     mahino ka, risky project hai.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 Tumhara hospital, subah 7 baje',
      instructions: 'Tum hospital ke IT head ho. Sahi kadam chuno.',
      pager: `<b>#it-emergency</b> — 07:02 AM<br>
        OT scheduling, pharmacy aur front-desk ke 600 Windows PCs blue screen, reboot par phir crash.<br>
        Vendor ka message: "content wapas le liya, machines reboot karein".<br>
        IT team: 8 log. BitLocker sab machines par on.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Triage: sabse zaroori machines (OT, pharmacy, emergency) ki list, unhe pehle; baaki ko baar-baar reboot ka try', good: true, next: 'keys', explain: '600 machines, 8 log — sab ek saath nahi. Patient safety wali pehle; reboot loop kuch ko khud theek kar dega.' },
            { t: 'Sabko ek saath safe mode', good: false, explain: '8 log, 600 machines, har ek par recovery key — bina priority ke zaroori machines ghanton baad.' },
            { t: 'Vendor ka fix aane ka intezaar', good: false, explain: 'Fix aa chuka hai — machines use le hi nahi paa rahi. Intezaar se kuch nahi hoga.' },
            { t: 'Antivirus uninstall karo remote se', good: false, explain: 'Remote tools ko chalta OS chahiye — woh hai hi nahi.' },
          ],
        },
        keys: {
          sitrep: '✅ 40 zaroori machines ki list bani. 15 reboots se 20% khud theek.',
          text: 'Safe mode ke liye BitLocker recovery keys chahiye. Keys AD server mein hain — jo khud blue screen hai.',
          choices: [
            { t: 'Pehle ek AD/domain controller ko recover karo (uski key offline backup se), phir baaki keys wahan se', good: true, next: 'fix', explain: 'Recovery ki recovery pehle — jo system baaki keys deta hai, use pehle uthao.' },
            { t: 'BitLocker disable kar do sab par', good: false, explain: 'Bina key ke disable bhi nahi hota.' },
            { t: 'Machines reimage kar do', good: false, explain: 'Local data, settings — aur reimage bhi ghanton ka. Keys mil sakti hain.' },
          ],
        },
        fix: {
          text: 'Aage ke liye kya badloge?',
          choices: [
            { t: 'Recovery keys aur runbook offline + alag system par; vendor se staged/canary content (N-1 ring); zaroori machines ki recovery drill', good: true, next: 'end', explain: 'Recovery ka raasta failure se alag, aur test kiya hua.' },
            { t: 'EDR hata do', good: false, explain: 'Breach risk — ek outage ke badle roz ka khatra.' },
          ],
        },
        end: {
          end: true,
          text: 'Zaroori machines 3 ghante mein wapas, baaki shaam tak.',
          summary: `<b>Seekh:</b> Recovery ka raasta us failure ke peeche band nahi hona chahiye jisse recover kar rahe ho.
            <br><br>• <b>Triage</b> — patient safety wali machines pehle.
            <br>• <b>Chaabi ki chaabi</b> — keys dene wala system pehle, uski key offline.
            <br>• <b>Drill</b> — "no network, no agents, no remote hands" wala din pehle se practice karo.`,
        },
      },
    },
    {
      type: 'estimate',
      title: 'Napkin math — haath se recovery',
      goal: 'Manual recovery ka paimana khud nikaalo.',
      problems: [
        {
          q: '85 lakh machines × 30 second haath se. Kitne insaan-GHANTE?',
          unit: 'ghante', given: ['8,500,000 machines', '30 sec each'],
          answer: 70833, tol: 0.3,
          steps: ['8.5e6 × 30 = 2.55e8 sec', '/ 3,600 ≈ 70,800 insaan-ghante — bina BitLocker key dhoondhne ke'],
          lesson: 'Aur yeh sabse achha case hai. Keys, seedhiyan, door ki jagahein — asli mein kai guna.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — recovery planning',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Recovery plan ka sabse chhupa khatra?"',
        choices: [
          'Recovery ka koi kadam usi system par nirbhar ho jo gira hai (keys AD mein, runbook wiki par, monitoring usi cluster par) — har kadam poochho "kya yeh abhi band cheez maanta hai?"',
          'Backup purana',
          'Team chhoti',
          'Documentation kam',
        ],
        answer: 0,
        explain: 'CrowdStrike (BitLocker keys) aur Datadog (monitoring) — dono.',
      },
      {
        q: 'Interviewer: "Boot-start agent ko surakshit kaise banayein?"',
        choices: [
          'Last-known-good content rakho aur crash loop pakad ke use load karo; ya network se content check pehle; aur content bounds-checked/verified interpreter mein',
          'Boot-start hata do',
          'Content kabhi mat badlo',
          'Har boot par reimage',
        ],
        answer: 0,
        explain: 'Tootti machine ko khud ko theek karne ka raasta chahiye.',
      },
    ],
  },
  success: [
    'Main boot loop kyun bana, samjha sakta hoon',
    'Main recovery ke raaste ko failure se alag rakhne ka plan bana sakta hoon',
    'Main manual recovery ka paimana nikaal sakta hoon',
  ],
  homework: `<p>Apna incident runbook kholo. Har kadam ke saamne likho: yeh kaunse system par nirbhar hai (VPN, SSO, wiki, monitoring, CI, keys)?
    Agar woh bhi gira hai toh plan B kya hai? Kam se kam ek kadam aisa milega jiska plan B nahi hai.</p>`,
  cards: [
    { front: 'Boot loop kyun?', back: 'Boot-start driver network se pehle disk ka zehreela 291 padhta → crash. Fix cloud par, pahunch nahi paata. "15 baar reboot" ya safe mode + file delete.' },
    { front: 'BitLocker problem?', back: 'Safe mode ko 48-digit recovery key; keys AD servers mein — jo khud blue screen. Recovery ka raasta failure ke peeche band.' },
    { front: 'Lab 17: boot loop ke baad?', back: 'Fix t=3s par; har reboot 10% chance network pehle → 15 reboots ke baad bhi 92/500 (18%) haath se.' },
  ],
},

/* =====================================================================
   4. pm-crowdstrike-domain
   ===================================================================== */
{
  id: 'pm-crowdstrike-domain',
  icon: '🧫',
  title: 'Crash domain chhota karo — aur test nahi, prove karo',
  badge: 'Verifier Vaidya',
  objectives: [
    'Mac par zero crashes kyun — Endpoint Security framework',
    'Linux eBPF verifier: load se pehle prove',
    'Windows kyun alag (legacy + EU 2009)',
    'Paanch takeaways',
  ],
  lesson: [
    `<h3>🍎🐧 Wahi company, zero crashes</h3>
     <p><b>macOS</b>: 2019 mein Apple ne kernel extensions deprecate kiye → <b>Endpoint Security framework</b> — security agent <b>user space</b>
     mein. Agent crash = ek process mara, restart. Machine chalti rahi.</p>
     <p><b>Linux eBPF</b>: kernel mein chhote programs, par load se pehle <b>verifier</b> sabit karta hai: koi out-of-bounds nahi, koi infinite
     loop nahi, koi paraya memory nahi. Galat program load hi nahi hota. (Wahi soch jo AWS Zelkova mein: saare raaste prove karo, sample
     nahi.)</p>
     <p><b>Windows</b> alag kyun? Purane drivers ki duniya + 2009 EU commitment (vendors ko Defender jitna hi kernel access; bahar nikaalna =
     antitrust). Baad mein Microsoft ne <b>Windows Resiliency Initiative</b> shuru ki: endpoint security kernel ke bahar.</p>
     <pre>lab 17, MODE=user — wahi zehreela content:
  t=2s  up=500 | agent restarts 4773
  t=8s  up=500 | agent restarts 7163     ← ek bhi machine nahi giri</pre>`,
    `<h3>📐 Test vs prove</h3>
     <p>Tests sirf maujooda inputs ka sample hain — CrowdStrike ke tests wildcards par pass the. Jahan failure afford nahi, wahan content ko
     test mat karo — <b>prove</b> karo: interpreter ke aage ek verifier jo har rule ko sensor ki asli seemaon se sabit kare.</p>
     <h3>📋 Paanch takeaways</h3>
     <ol>
       <li><b>Config is code</b> — reviews, tests, canary, rollback.</li>
       <li><b>Asli blast radius = deployment radius.</b></li>
       <li><b>Contracts validate karo</b>, sirf artifacts nahi — build, load aur run time par.</li>
       <li><b>Passing test sirf maujooda inputs cover karta hai</b> → content pipeline aur schema edges ko fuzz karo.</li>
       <li><b>Us din ki recovery plan karo jab machines madad nahi kar sakti.</b></li>
     </ol>
     <p class="tip">Har auto-updating agent (EDR, observability, MDM, container runtime) = vendor ke CI se tumhari har machine tak ek pipe,
     tumhare change management ke bahar.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — kernel mode vs user mode',
      project: '17-crowdstrike',
      exercise: 'ex1-content-push',
      goal: 'Wahi zehreela content, wahi global push — par agent kernel ke bahar (user mode). Kitni machines giri?',
      why: `<code>MODE=user</code> mein fleet ka agent ek alag "process" hai: bad read → sirf agent mara aur restart, machine zinda
        (Mac Endpoint Security / Linux eBPF jaisa crash domain).`,
      steps: [
        { text: 'Fleet user mode mein chalao.', cmd: 'cd docker-labs/17-crowdstrike && MODE=user npm start ex1-content-push', expect: 'ex1-content-push' },
        { text: 'Spec + global push.', cmd: 'node tools/incident.js --validator spec --rollout global', expect: '  t=2s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 500 | agent restarts 4773\n  t=8s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 500 | agent restarts 7163' },
      ],
      observe: {
        q: 'Agent 7,163 baar crash hua par machines 500/500 up. Kya yeh "theek" hai?',
        choices: [
          'Machine bachi — crash domain chhota hua; par agent baar-baar mar raha hai toh security coverage kamzor — isliye validator/rings bhi chahiye',
          'Haan, bilkul theek',
          'Nahi, user mode bekaar',
          'Machines asli mein giri',
        ],
        answer: 0,
        explain: 'User mode nuksaan simit karta hai; prevention (contract validator) phir bhi chahiye.',
      },
      lesson: 'Crash domain machine se chhota karo — ek process ka marna, machine ka nahi.',
    },
    {
      type: 'bins',
      title: 'Test ya prove?',
      instructions: 'Kaunsa check sirf sample karta hai, kaunsa sabit karta hai?',
      bins: [
        { id: 'test', label: '🧪 Test (sample)' },
        { id: 'prove', label: '📐 Prove (saare raaste)' },
      ],
      items: [
        { text: 'eBPF verifier: program load se pehle bounds aur loops check', bin: 'prove', explain: 'Har mumkin raasta — warna load hi nahi.' },
        { text: 'Stress test jo maujooda 1,000 rules chalata hai', bin: 'test', explain: 'CrowdStrike ka Feb test — wildcards ke saath pass.' },
        { text: 'Validator jo har rule ke har field ko sensor ke input count se milaye', bin: 'prove', explain: 'Contract check — har rule par sabit.' },
        { text: 'Canary machines par 1 ghanta chalao', bin: 'test', explain: 'Sample — us ghante aaye events hi dekhe.' },
        { text: 'Zelkova: "kya koi bhi request bucket public kar sakti hai?"', bin: 'prove', explain: 'Saari requests ka math.' },
        { text: 'Fuzzing — random rules generate karke chalao', bin: 'test', explain: 'Bahut behtar sample — par phir bhi sample.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — isolation of privileged agents',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamara monitoring agent har server par root ke saath chalta hai. Khatra kaise ghatayein?"',
        choices: [
          'Crash domain chhota: jahan ho sake user space/eBPF (verified), minimum privileges; updates staged (rings) aur customer-controlled; watchdog jo agent ko rok sake bina machine gire',
          'Agent hata do',
          'Root hi zaroori hai, kuch nahi kar sakte',
          'Agent ko kabhi update mat karo',
        ],
        answer: 0,
        explain: 'Mac/Linux ka raasta.',
      },
      {
        q: 'Interviewer: "Tests pass the phir bhi production gira — kya badloge?"',
        choices: [
          'Test = maujooda inputs ka sample; schema edges/fuzzing jodo aur jahan failure afford nahi wahan verifier (prove) — plus staged rollout',
          'Zyada tests likho same tarah ke',
          'Tests hatao',
          'Production mat badlo',
        ],
        answer: 0,
        explain: 'Wildcard wale tests ne 5 mahine jhoothi tasalli di.',
      },
    ],
  },
  success: [
    'Main samjha sakta hoon ki Mac/Linux par zero crashes kyun hue',
    'Main test aur prove ka farq bata sakta hoon',
    'Main CrowdStrike ke paanch takeaways apne system par laga sakta hoon',
  ],
  homework: `<p>Apne servers par chalne wale saare "privileged" agents list karo (EDR, monitoring, log shipper, MDM, service mesh). Har ek: kernel
    mein ya user space? auto-update hota hai? kis ring mein? Sabse khatarnak ek chuno aur uska crash domain chhota karne ka tareeka likho.</p>`,
  cards: [
    { front: 'Mac par zero crashes kyun?', back: '2019 se Endpoint Security framework — agent user space mein; crash = process mara, machine nahi. Lab 17 user mode: 7,163 restarts, 0 machines down.' },
    { front: 'eBPF verifier?', back: 'Kernel program load se pehle sabit karta hai: no out-of-bounds, no infinite loop, no paraya memory. Test nahi, prove.' },
    { front: 'CrowdStrike takeaways?', back: 'Config is code; deployment radius = blast radius; contracts validate karo; tests sirf maujooda inputs; recovery us din ke liye jab machines madad na karein.' },
  ],
},

/* =====================================================================
   5. pm-datadog
   ===================================================================== */
{
  id: 'pm-datadog',
  icon: '🐶',
  title: 'Postmortem — Datadog: 40,000 servers, ek hi minute',
  badge: 'Supply Chain Sipahi',
  objectives: [
    '8 March 2023: 5 regions, 3 clouds, ek saath andhera',
    'Multi-region ≠ multi-fault-domain',
    'Unattended upgrades: zimmedaar default, synchronized khatra',
    'Lab: same clock vs staged waves vs aged canary',
  ],
  lesson: [
    `<h3>📰 06:00 UTC, har region ek saath</h3>
     <p>8 March 2023: Datadog ke har region (5 regions, 3 clouds — AWS, Azure, GCP, kai AZs) mein <b>ek hi minute</b> mein andhera; 2 ghante mein
     product gayab (dashboards, APIs, alerting). ~40,000 servers. Zyadatar ke liye 13 ghante, baaki ~ek din. Pragmatic Engineer: ~$5M revenue.
     Cloud outage nahi, kharab deploy nahi — Linux software ka ~2 saal purana ek badlaav, 40,000 machines par taiyaar.</p>
     <h3>🗺️ Multi-region kya bachata hai</h3>
     <p>Multi-region ka tark: failures <b>alag-alag</b> hoti hain — AZ → region → cloud. Woh sab failures <b>geographic</b> hain. Yeh wali aayi
     <b>software supply chain</b> se — jiska region se koi lena-dena nahi. Har machine: same Ubuntu, same update source, same auto-update job,
     same ghadi (UTC).</p>
     <h3>⏰ Unattended upgrades</h3>
     <p>Ubuntu ka unattended-upgrades security patches tay schedule par, bina insaan ke, default on — <b>zimmedaar</b> choice (attackers ghanton
     mein scan karte hain). 8 March ka patch: systemd ka routine security fix. Us package ko install karna <b>systemd-networkd</b> se network
     config reapply karwata hai — trigger yahi.</p>
     <p class="tip">🎯 Multi-region, multi-cloud, AZs, automatic security patching — sab <b>best practices</b>. Sab sahi, sabka ek hi andha kona.
     "Datadog ne galti ki" nahi — <b>multi-region ≠ multi-fault-domain</b>.</p>`,
    `<h3>📏 Lab 23 (ex2) — 200 nodes, 5 regions, 3 clouds, ek ghadi</h3>
     <pre>=== same-clock ===
  06:00 — saari 200 machines ne ek hi minute mein patch liya
  NATEEJA: 200/200 nodes dark (100% fleet), rokne mein 40 min

=== staged-fresh-canary ===
  06:05 — canary sab green ✅ ("test pass") → wave 2: baaki 196
  NATEEJA: 196/200 nodes dark (98% fleet)

=== staged-aged-canary ===
  06:02 — 4/4 canary dark → 06:05 rollout HALT
  NATEEJA: 4/200 nodes dark (2% fleet)</pre>
     <p>Staged rollout <b>tabhi</b> bachata hai jab canary us <b>haalat</b> mein ho jisme prod hai — hafton purani machine, in-place patch.
     Fresh canary par bug dikhta hi nahi (agle level mein kyun).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — ek ghadi, 200 machines',
      project: '23-datadog',
      exercise: 'ex2',
      goal: 'Same UTC cron vs staged waves (fresh canary) vs staged waves (prod jaisi purani canary) — kitne nodes dark, kitni der mein ruke.',
      why: `<code>tools/fleet.js</code>: bug sirf un machines par jinke cilium rules pehle se lage hain (hafton purani, in-place patch). Fresh boot
        wali machine par bug dikhta hi nahi. Koi server nahi.`,
      steps: [
        { text: 'Fleet simulation chalao.', cmd: 'cd docker-labs/23-datadog && node tools/fleet.js', expect: '=== same-clock ===\n  NATEEJA: 200/200 nodes dark (100% fleet), rokne mein 40 min\n=== staged-fresh-canary ===\n  NATEEJA: 196/200 nodes dark (98% fleet), rokne mein 40 min\n=== staged-aged-canary ===\n  NATEEJA: 4/200 nodes dark (2% fleet), rokne mein 5 min' },
        { text: 'Aakhri do lines padho.', cmd: 'node tools/fleet.js | tail -2', expect: 'Staged rollout tabhi kaam karta hai jab canary us HAALAT mein ho jisme prod hai (purani, in-place patch wali).\n"Multi-region" ne yahan kuch nahi bachaya — 5 regions, 3 clouds, par upar ek hi package mirror aur ek hi ghadi.' },
      ],
      observe: {
        q: 'Fresh canary green thi, phir bhi 196 nodes gaye. Asli galti kya?',
        choices: [
          'Canary prod ki haalat mein nahi thi — bug sirf in-place patch wali purani machines par; canary ne sawaal hi galat poochha',
          'Canary chhoti thi',
          'Bake time kam tha',
          'Monitoring nahi thi',
        ],
        answer: 0,
        explain: 'Canary ka matlab "prod ka namuna" — umar, haalat, update ka tareeka sab prod jaisa.',
      },
      lesson: 'Staged rollout + prod jaisi canary — warna "green" jhooth bolti hai.',
    },
    {
      type: 'bins',
      title: 'Geographic ya supply chain?',
      instructions: 'Multi-region kis failure se bachata hai, kis se nahi?',
      bins: [
        { id: 'geo', label: '🗺️ Multi-region bachata hai' },
        { id: 'chain', label: '🧬 Multi-region NAHI bachata (saajha upar)' },
      ],
      items: [
        { text: 'Ek AZ ka power fail', bin: 'geo', explain: 'Geographic — doosre AZ/region chalte hain.' },
        { text: 'Sab machines par same OS auto-update, same UTC time', bin: 'chain', explain: 'Datadog 2023.' },
        { text: 'Ek cloud provider ka region down', bin: 'geo', explain: 'Multi-region/multi-cloud ka asli kaam.' },
        { text: 'Base image mein ek bug jo har region mein deploy', bin: 'chain', explain: 'Image har jagah ek.' },
        { text: 'Certificate authority ka cert expire', bin: 'chain', explain: 'Ek CA, saare regions.' },
        { text: 'Ek region mein fiber kata', bin: 'geo', explain: 'Geographic.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — fault domains',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hum 3 clouds par hain, sab safe?"',
        choices: [
          'Geographic failures se haan; par jo cheez sab jagah ek jaisi hai (OS, image, updater, CI, CA, DNS, config) — woh sab clouds ko ek saath gira sakti hai; unhe stagger karo',
          'Haan, 3 clouds kaafi',
          'Nahi, 5 chahiye',
          'Cloud ka SLA dekho',
        ],
        answer: 0,
        explain: 'Multi-region ≠ multi-fault-domain.',
      },
      {
        q: 'Interviewer: "Auto security updates band kar dein?"',
        choices: [
          'Nahi — breach ka khatra (exploit ghanton mein); updates ko staged waves mein karo, pehle prod jaisi purani machines par, sab jagah ek UTC time par nahi',
          'Haan, band',
          'Mahine mein ek baar sab ek saath',
          'Sirf weekends',
        ],
        answer: 0,
        explain: 'Outage risk ko breach risk se mat badlo — synchronization todo.',
      },
    ],
  },
  success: [
    'Main multi-region aur multi-fault-domain ka farq samjha sakta hoon',
    'Main synchronized auto-update ka khatra bata sakta hoon',
    'Main lab se prod jaisi canary ka faayda dikha sakta hoon',
  ],
  homework: `<p>Apne infrastructure ka "doosra diagram" banao: har region ke upar ki woh cheezein jo sab jagah ek jaisi hain (OS version, base image,
    package mirror, auto-update schedule, CI, registry, CA, DNS provider). Har ek ke saamne: kya yeh sab jagah ek saath badal sakti hai?</p>`,
  cards: [
    { front: 'Datadog 8 March 2023?', back: '06:00 UTC, 5 regions, 3 clouds, ~40,000 servers ek minute mein dark. Trigger: systemd patch (unattended-upgrades) → networkd reapply.' },
    { front: 'Multi-region ≠ multi-fault-domain?', back: 'Regions geographic failures se bachate hain. Same OS/updater/ghadi har jagah = software supply chain failure sab regions mein ek saath.' },
    { front: 'Lab 23: canary?', back: 'Same clock: 200/200 dark. Fresh canary: green, phir 196 dark. Prod jaisi purani canary: 4 dark, HALT.' },
  ],
},

/* =====================================================================
   6. pm-datadog-rules
   ===================================================================== */
{
  id: 'pm-datadog-rules',
  icon: '🧾',
  title: 'ip rule — saajhi cheez jiska koi maalik nahi',
  badge: 'Maalik Dhoondhne Wala',
  objectives: [
    'Linux policy routing: ip route vs ip rule, fwmark',
    'Cilium ke rules aur systemd-networkd ki "safai"',
    '27 mahine kyun chhupa: boot order vs in-place restart',
    'Lab: reboot test pass, in-place fail, do fixes',
  ],
  lesson: [
    `<h3>🧭 Routing table aur rules</h3>
     <p><code>ip route</code> = routing table (manzil → agla hop). Linux mein <b>kai</b> tables hain. <code>ip rule</code> = <b>policy routing</b>
     rules ki list: source address / <b>fwmark</b> / incoming interface match ho → yeh table use karo. Pehla match jeet-ta hai. VPNs,
     multi-homed machines — jo bhi khaas traffic ko khaas raaste bhejta hai.</p>
     <p>Rules ki list <b>saajhi</b> hai aur <b>koi maalik nahi</b>: koi bhi privileged program kisi aur ka rule mita sakta hai — na error, na
     warning, na lock; kernel yaad bhi nahi rakhta ki rule kisne banaya.</p>
     <h3>🐝 Cilium aur 🧹 networkd</h3>
     <p>Kubernetes mein har pod ka apna IP. Datadog <b>Cilium</b> use karta tha: pod traffic par fwmark lagata hai + rule "marked → Cilium ki
     table" (jise har pod ka pata hai). Rules gayab → marked traffic main table mein → packet mara → node dark, control plane se bhi katt gaya.</p>
     <p>Dec 2020 systemd release: networkd jab apne interface ki config reapply karta hai, woh <b>har us rule ko mita deta hai jo usne nahi
     banaya</b> ("stale junk"). systemd ki nazar se theek (use lagta hai network uska hai). Switch <code>ManageForeignRoutingPolicyRules</code>
     ~5 mahine baad aaya — <b>default ON</b> — aur purane versions mein backport bhi hua.</p>`,
    `<h3>⏳ 27 mahine kyun chhupa?</h3>
     <p>Normal <b>boot</b> order: networkd jaldi shuru → safai → Cilium abhi shuru hi nahi → kuch paraya nahi → phir Cilium rules daalta hai →
     sab theek. Fresh machine + naya systemd + reboot + tests = <b>pass</b>.</p>
     <p>Maut wala order: hafton se chalti machine (Cilium rules pehle se) par networkd <b>reapply</b> — thik wahi jo <b>in-place package
     upgrade</b> karta hai (service live restart, reboot nahi). Iska test = hafton purani machine + ek service ka in-place restart + pod-to-pod
     check = "extra steps wala production incident".</p>
     <pre>lab 23 (ex1-rules):
reboot-test: networkd pehle, cilium baad → 100/100 ✅ "test pass"
in-place:    cilium rules pehle se → patch → networkd reapply → 1 rule saaf → 0/100 💀
PROTO=cilium (rules par apna naam)   → reapply ne 0 saaf kiye → 100/100
MANAGE_FOREIGN=0 (setting)           → 0 saaf → 100/100</pre>
     <p>Shallow fix: setting (der se aaya, default on). Asli fix (Cilium): rules par <b>protocol tag</b> — networkd pehchaan ke chhod de =
     <b>ownership ek convention ban gayi</b>. Deep fix (shayad hi bana): saajhe resource ka <b>ek maalik</b> ya arbitration layer — warna yeh
     bugs ki ek <b>category</b> hai, ek-ek karke patch hoti rahegi.</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — reboot test vs in-place patch',
      project: '23-datadog',
      exercise: 'ex1-rules',
      goal: 'Wahi code, alag order: fresh reboot pass, in-place patch fail. Phir dono fixes.',
      why: `<code>services/kernel.js</code> ek saajha ip rule table (koi owner nahi). <code>services/cilium.js</code> rule daalta hai (<code>PROTO</code>
        se naam). <code>services/networkd.js</code> reapply par paraye rules mitata hai (<code>MANAGE_FOREIGN=0</code> se band).`,
      steps: [
        { text: 'Kernel + cilium + networkd chalao.', cmd: 'cd docker-labs/23-datadog && npm start ex1-rules', expect: 'ex1-rules\n[kernel] :4991 — shared ip rule table, koi owner nahi\n[networkd] :4993 manageForeign=true known=kernel|static|cilium' },
        { text: 'CI ka test: reboot.', cmd: 'node tools/incident.js --case reboot-test', expect: '  pod packets: 100 / 100 pahunche\n\n✅ Test pass — reboot ke baad sab chalta hai. Isi liye ye bug 27 mahine chhupa raha.' },
        { text: 'Asli prod: in-place patch.', cmd: 'node tools/incident.js --case in-place', expect: '06:00 UTC — systemd patch → networkd reapply → 1 rule(s) saaf: fwmark 0x200 [koi tag nahi] jo cilium ne banaya tha\n  ip rule: from 10.0.0.0/8 → main [static]\n  pod packets: 0 / 100 pahunche  💀 node dark — control plane se bhi katt gaya' },
        { text: 'Fix: rules par apna naam.', cmd: 'PROTO=cilium npm start ex1-rules\nnode tools/incident.js --case in-place', expect: '06:00 UTC — systemd patch → networkd reapply → 0 rule(s) saaf: koi nahi\n  pod packets: 100 / 100 pahunche  ✅ bach gaya' },
      ],
      observe: {
        q: 'Reboot test mein networkd ne bhi reapply kiya — phir wahan rule kyun nahi mita?',
        choices: [
          'Boot par networkd Cilium se PEHLE chalta hai — us waqt mitane ko koi paraya rule tha hi nahi; order hi poora farq hai',
          'Reboot mein networkd nahi chalta',
          'Cilium ne rule dobara daala',
          'Bug',
        ],
        answer: 0,
        explain: 'Test us STATE ko check kare jisme prod sach mein hai — purani machine, in-place restart.',
      },
      lesson: 'Saajhi cheez bina maalik ke = ek din koi "safai" karega. Ownership explicit karo.',
    },
    {
      type: 'quiz',
      title: 'Ownership ki samajh',
      questions: [
        {
          q: '"Shallow fix" aur "deep fix" mein farq?',
          choices: [
            'Shallow: networkd ki setting badlo (default phir bhi on). Deep: saajhe resource ka ek maalik ya arbitration layer — warna naye programs yahi galti dohrayenge',
            'Dono same',
            'Shallow = patch, deep = reboot',
            'Deep = Cilium hata do',
          ],
          answer: 0,
          explain: 'Protocol tag beech ka raasta: ownership ek convention.',
        },
        {
          q: 'Aisa test jo yeh bug pakadta, kaisa hota?',
          choices: [
            'Hafton purani, prod jaisi machine par ek service ka in-place restart + pod-to-pod check — yaani "extra steps wala production incident"',
            'Aur zyada reboots',
            'Unit test',
            'Load test',
          ],
          answer: 0,
          explain: 'Test us state ko check karo jisme prod hai — long-running machines, in-place restarts.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — shared mutable state',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Do agents ek hi config file/iptables/cron edit karte hain. Kya dekhoge?"',
        choices: [
          'Ownership: har entry par owner tag, "sirf apna chhuo" niyam, ya ek hi owner/arbiter jiske through dono badlav karein; aur test jo dono ko kisi bhi order mein chalaye',
          'Dono ko alag time par chalao',
          'File lock kaafi',
          'Ek agent hata do',
        ],
        answer: 0,
        explain: 'Datadog: do programs, dono "jo pehchana nahi, saaf karo".',
      },
      {
        q: 'Interviewer: "CI green tha, prod gira. Test coverage kaise badhaoge?"',
        choices: [
          'Prod ki STATE test karo: purani machines, in-place upgrades, long uptime, alag start order — sirf fresh reboot nahi',
          'Aur unit tests',
          'CI tez karo',
          'Prod mein test mat karo',
        ],
        answer: 0,
        explain: 'Lab: reboot-test 100/100, in-place 0/100.',
      },
    ],
  },
  success: [
    'Main policy routing aur fwmark ka kaam samjha sakta hoon',
    'Main boot order vs in-place restart ka test gap bata sakta hoon',
    'Main saajhe resource ki ownership ke fixes (shallow, convention, deep) gin sakta hoon',
  ],
  homework: `<p>Apni machines par "saajhi, bina maalik" cheezein dhoondho: iptables/nftables, <code>/etc/hosts</code>, crontab, sysctl, systemd
    units, shared config dirs. Kaunse do programs ek hi cheez edit karte hain? Kya kisi ke paas "cleanup" logic hai?</p>`,
  cards: [
    { front: 'Datadog ka mechanism?', back: 'Cilium fwmark rules daalta; systemd-networkd reapply par paraye rules mitata (ManageForeignRoutingPolicyRules default on) → pod traffic main table mein → node dark.' },
    { front: '27 mahine kyun chhupa?', back: 'Boot par networkd Cilium se pehle — mitane ko kuch nahi. Sirf in-place upgrade (purani machine, rules pehle se) par trigger. Lab: reboot 100/100, in-place 0/100.' },
    { front: 'Fixes?', back: 'Shallow: ManageForeign=no. Convention: rules par protocol tag (Cilium). Deep: saajhe resource ka ek maalik / arbitration layer.' },
  ],
},

/* =====================================================================
   7. pm-datadog-recovery
   ===================================================================== */
{
  id: 'pm-datadog-recovery',
  icon: '🩹',
  title: 'Andhe, band, aur thundering herd — recovery',
  badge: 'Herd Handler',
  objectives: [
    'Monitoring company apne outage mein andhi',
    'Self-healing galat taraf — nodes aur control plane ke beech taala',
    'Recovery ka kram aur thundering herd',
    'Lab: 5,000 nodes wapas — herd vs backoff vs waves',
  ],
  lesson: [
    `<h3>🙈 Andhe</h3>
     <p>Datadog apna infra samajhne ke liye jo tool use karta hai — woh <b>Datadog</b> hai. Band. Cloud consoles, raw SSH, kamzor war-room chat.</p>
     <h3>🔒 Taala dono taraf</h3>
     <p>Toote nodes Kubernetes control plane tak nahi pahunch sakte; control plane nodes tak nahi → <b>self-healing automation galat taraf</b> →
     haath se, machine-dar-machine. Wajah ~11:36 par pakki hui (~6 ghante).</p>
     <h3>🪜 Kram</h3>
     <p>Pehle parent control planes → phir worker machines → phir services. Aur hazaron nodes ka ek saath re-register = recovering control
     planes par <b>thundering herd</b>. Teeno clouds ne capacity limits live badhayi.</p>
     <p>$5M chhota nuksaan hai; bada: product ka vaada — "jab sab gire tab hum dekhte hain".</p>`,
    `<h3>📏 Lab 23 (ex3-recovery) — control plane, 5,000 nodes wapas</h3>
     <p>60 registrations ek saath (~1,200/sec); har koshish — 503 wali bhi — 0.5 ms CPU (TLS, auth, parsing).</p>
     <pre>herd      5000/5000 wapas 30.2 s  | attempts 40,548 (bekaar 35,548)  p50 18.9 s
backoff   5000/5000 wapas  6.6 s  | attempts  7,803 (bekaar  2,803)  p50  3.0 s
staged    5000/5000 wapas  7.5 s  | attempts  5,000 (bekaar      0)  p50  3.8 s</pre>
     <p>Utne hi nodes, utna hi asli kaam — par turant retry ne 35,548 bekaar koshishein banayi jinhone control plane ka CPU khaaya → recovery
     khud dheemi. Backoff + jitter: 6.6 s. Waves: 0 bekaar.</p>
     <h3>🧭 Recovery ka niyam</h3>
     <p><b>Recovery kabhi us cheez par mat banao jo gir sakti hai</b> → alag observability raasta jo monitored system ke saath kuch share na kare:
     out-of-band access (cloud console, alag raaste se SSH), alag stack/provider par chhota status dashboard. Runbook test: har kadam par poochho
     "kya yeh kuch aisa maanta hai jo abhi band hai?" ("burning cluster par dashboard kholo" = runbook nahi, ek dua hai).</p>`,
  ],
  stages: [
    {
      type: 'docker',
      title: '🐳 Lab — 5,000 nodes ek saath wapas',
      project: '23-datadog',
      exercise: 'ex3-recovery',
      goal: 'Control plane par 5,000 nodes ka re-register: turant retry (herd) vs backoff + jitter vs waves.',
      why: `<code>services/controlplane.js</code>: 60 slots, 50 ms per registration, line 300, har koshish 0.5 ms CPU (reject wali bhi).`,
      steps: [
        { text: 'Control plane chalao.', cmd: 'cd docker-labs/23-datadog && npm start ex3-recovery', expect: 'ex3-recovery\n[control-plane] :4994 slots=60 (~1200 registrations/sec)' },
        { text: '5,000 nodes, teen tareeke.', cmd: 'node tools/recover.js --nodes 5000', expect: 'herd      sab 5000/5000 nodes wapas aaye 30.2 s mein  |  attempts 40548 (bekaar ki koshishein 35548), p50 18.9 s, control plane ki line peak 300\nbackoff   sab 5000/5000 nodes wapas aaye 6.6 s mein  |  attempts 7803 (bekaar ki koshishein 2803), p50 3.0 s, control plane ki line peak 300\nstaged    sab 5000/5000 nodes wapas aaye 7.5 s mein  |  attempts 5000 (bekaar ki koshishein 0), p50 3.8 s, control plane ki line peak 140' },
      ],
      observe: {
        q: 'Herd mein asli kaam wahi (5,000 registrations) — phir 30 s kyun?',
        choices: [
          '35,548 bekaar koshishein — har reject bhi CPU khaata hai; control plane ka CPU retries par gaya, asli registrations par nahi',
          'Network slow',
          'Nodes zyada the',
          'Control plane chhota',
        ],
        answer: 0,
        explain: 'Recovery ka load recovery ko hi rok deta hai — backoff/jitter/waves se todo.',
      },
      lesson: 'Wapas aana bhi ek load hai — use baanto.',
    },
    {
      type: 'order',
      title: 'Recovery ka kram',
      instructions: 'Datadog jaisi fleet-wide outage — sahi order?',
      steps: [
        { text: 'Out-of-band raasta kholo (cloud console, alag SSH) — apne monitoring par bharosa nahi', explain: 'Andhe ho — pehle aankhein.' },
        { text: 'Wajah pakdo aur trigger roko (patch/auto-update band)', explain: 'Warna theek ki hui machines phir giregi.' },
        { text: 'Parent control planes theek karo', explain: 'Unke bina nodes register nahi ho sakte.' },
        { text: 'Worker machines waves mein, backoff ke saath', explain: 'Thundering herd se bachao.' },
        { text: 'Services upar lao, phir monitoring confirm kare', explain: 'Sabse upar ki layer aakhir mein.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — recovery design',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamari monitoring hamare hi cluster par chalti hai."',
        choices: [
          'Ek alag, independent observability raasta — alag provider/stack par chhota status + alerting, aur out-of-band access; jo monitored system ke saath kuch share na kare',
          'Theek hai, cluster reliable hai',
          'Do replicas',
          'Logs S3 mein bhi',
        ],
        answer: 0,
        explain: 'Datadog aur CrowdStrike (BitLocker keys) — dono mein recovery aag ke andar thi.',
      },
      {
        q: 'Interviewer: "Outage ke baad sab clients ek saath reconnect karte hain aur server phir girta hai."',
        choices: [
          'Client side exponential backoff + jitter, server side admission control/queue limit, aur recovery waves; reject sasta rakho',
          'Server bada',
          'Clients ko manually restart',
          'Retry band',
        ],
        answer: 0,
        explain: 'Lab: 30.2 s → 6.6 s.',
      },
    ],
  },
  success: [
    'Main recovery ke waqt ke andhapan aur galat-taraf self-healing ko samjha sakta hoon',
    'Main thundering herd ka ilaaj lab se dikha sakta hoon',
    'Main runbook ko "band cheezon" ke liye test kar sakta hoon',
  ],
  homework: `<p>Apne system ke liye "sab kuch ek saath gira" wala runbook likho (5 kadam). Har kadam: kaunsa tool, kahan chalta hai, kya woh bhi gira
    hoga? Aur clients ke reconnect par backoff/jitter hai ya nahi — code mein dekho.</p>`,
  cards: [
    { front: 'Datadog recovery ki dikkatein?', back: 'Andhe (Datadog hi tool tha); nodes ↔ control plane dono taraf band (self-healing galat taraf); kram: control planes → workers → services; thundering herd.' },
    { front: 'Lab 23: 5,000 nodes wapas?', back: 'Herd: 30.2 s, 35,548 bekaar koshishein. Backoff: 6.6 s. Waves: 7.5 s, 0 bekaar.' },
    { front: 'Recovery ka niyam?', back: 'Recovery kabhi us cheez par mat banao jo gir sakti hai — alag observability + out-of-band access; runbook ke har kadam par "kya yeh band cheez maanta hai?"' },
  ],
},

/* =====================================================================
   8. pm-datadog-fixes
   ===================================================================== */
{
  id: 'pm-datadog-fixes',
  icon: '🧭',
  title: 'Doosra diagram — blast radius review do baar',
  badge: 'Do-Pass Dekhne Wala',
  objectives: [
    'Auto-update ka dilemma: outage risk vs breach risk',
    'Two-pass blast radius review: geography phir stack',
    'Prevention ki chhupi, hamesha ki keemat',
    'Paanch takeaways',
  ],
  lesson: [
    `<h3>⚖️ Auto-update ka dilemma</h3>
     <p>Band karo → outage risk ghata, <b>breach risk</b> badha (OpenSSL jaise exploit ghanton mein). Sahi raasta: <b>staged waves</b>, pehle un
     machines par jo prod jaisi dikhti hain (hafton purani, asli stack).</p>
     <h3>🔍 Blast radius review — do baar</h3>
     <ol>
       <li><b>Geographic pass</b> — zones, regions, failover. Sab karte hain.</li>
       <li><b>Stack pass</b> — har fleet-jaisi cheez ke liye: <b>kahan se aati hai? kaunsa event ise badalta hai? kya sab jagah ek saath
       badalti hai?</b> OS, package mirror, base image, CI pipeline, image registry, certificate authority, DNS provider.</li>
     </ol>
     <p>Auto-updater = same source, same schedule, same ghadi, 40,000 machines — aur <b>kisi diagram par nahi</b>.</p>`,
    `<h3>🕰️ Prevention ki keemat</h3>
     <p>Reviews, staged pipelines, aise tests jinka kaaran koi yaad nahi rakhta — ek khadi, dikhne wali nahi, keemat. Anushasan 2 saal mein
     dheela padta hai. (Yahan fuse 27 mahine ka tha — Dec 2020 se March 2023, us code mein jo Datadog ne likha bhi nahi.)</p>
     <h3>📋 Paanch takeaways</h3>
     <ol>
       <li>Sirf geography nahi, <b>dependencies</b> audit karo.</li>
       <li>Chhupe bugs ka fuse lamba hota hai.</li>
       <li>Us <b>state</b> ko test karo jisme prod sach mein hai (lambe chalte machines, in-place restarts).</li>
       <li>Do+ systems ek resource share karein bina maalik = fault line.</li>
       <li>Recovery kabhi us cheez par mat banao jo gir sakti hai.</li>
     </ol>
     <p class="tip">🎯 <b>Doosra diagram banao</b>: dependency graph jisme sabse upar woh single cheezein hon jo har region ko khilati hain.</p>`,
  ],
  stages: [
    {
      type: 'archdiff',
      title: 'Doosra diagram — chaar saajhe kone',
      instructions: 'Yeh company "5 regions, 2 clouds, fully redundant" kehti hai. Chaar cheezein saare regions ko ek saath gira sakti hain — pakdo.',
      brief: `Har region ka apna Kubernetes cluster, apna DB replica, apna load balancer. Failover drills har quarter. Leadership ko
        lagta hai koi single point of failure nahi.`,
      goal: 'Chaar aisi cheezein pakdo jo region ke UPAR hain aur sab jagah ek saath badal sakti hain.',
      nodes: [
        { id: 'image', label: '🖼️ Golden base image', sub: 'har node isi se, har hafte naya — sab regions ek saath roll', row: 0 },
        { id: 'cron', label: '⏰ unattended-upgrades', sub: 'har node par 03:00 UTC', row: 0 },
        { id: 'regions', label: '🗺️ 5 regional clusters', sub: 'har ek ka apna LB, DB replica, compute', row: 1 },
        { id: 'flags', label: '🚩 Feature flag service', sub: 'ek global service, har request par flags live padhta hai', row: 1 },
        { id: 'ca', label: '🔐 Internal CA', sub: 'saare mTLS certs ek CA se, sab ek hi din expire', row: 2 },
        { id: 'drills', label: '🧯 Quarterly failover drills', sub: 'region band karke traffic shift', row: 2 },
      ],
      flaws: [
        { id: 'image', why: 'Ek image sab regions mein ek saath = ek bug har jagah. Image rollout bhi region-dar-region, bake ke saath.' },
        { id: 'cron', why: 'Datadog 2023: same updater, same UTC time. Waves mein karo, pehle prod jaisi purani machines par.' },
        { id: 'flags', why: 'Global flag service par har request live — woh gira ya kharab flag gaya toh sab regions. Regional cache + last-known-good + staged flag rollout.' },
        { id: 'ca', why: 'Ek CA, ek expiry date = sab mTLS ek saath toot-ta hai. Rotation stagger karo, expiry alert, aur CA ka apna failure plan.' },
      ],
      fine: {
        regions: 'Regional clusters apne LB/DB/compute ke saath sahi hain — geographic pass yahi pakadta hai. Galti un cheezon mein hai jo inke UPAR hain.',
        drills: 'Failover drills achhe hain — par sirf geographic failure test karte hain. Supply chain failure (sab regions ek saath) ke liye alag drill chahiye.',
      },
      lesson: `🎯 Har fleet-jaisi cheez par teen sawaal: <b>kahan se aati hai? kaunsa event badalta hai? kya sab jagah ek saath?</b>`,
    },
    {
      type: 'quiz',
      title: 'Fixes ki samajh',
      questions: [
        {
          q: 'Stack pass mein teen sawaal kya hain?',
          choices: [
            'Kahan se aati hai? Kaunsa event ise badalta hai? Kya sab jagah ek saath badalti hai?',
            'Kitni mehengi? Kaun maintain karta? Kab khareedi?',
            'Kitne regions? Kitne clouds? Kitne AZs?',
            'Kaunsi language? Kaunsa framework? Kaunsa DB?',
          ],
          answer: 0,
          explain: 'Yeh sawaal geography se upar ki cheezein pakadte hain.',
        },
        {
          q: 'Prevention ki "chhupi keemat" kya hai?',
          choices: [
            'Reviews, staged pipelines, ajeeb tests — hamesha ka kharcha jiska faayda dikhta nahi; 2 saal mein anushasan dheela padta hai',
            'Licence fees',
            'Hardware',
            'Koi keemat nahi',
          ],
          answer: 0,
          explain: 'Isliye inhe likh ke, automate karke rakho — yaad ke bharose nahi.',
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — blast radius review',
    instructions: 'Do sawaal. 🎤',
    questions: [
      {
        q: 'Interviewer: "Hamare architecture ka blast radius review karo."',
        choices: [
          'Do pass: geographic (zones/regions/failover) aur stack (OS, image, updater, CI, registry, CA, DNS, config/flags) — har fleet-jaisi cheez par "kya sab jagah ek saath badal sakti hai?"',
          'Regions gino',
          'SLA padho',
          'Load test',
        ],
        answer: 0,
        explain: 'Doosra diagram.',
      },
      {
        q: 'Interviewer: "Ek saajha resource do teams edit karti hain — long-term fix?"',
        choices: [
          'Ek maalik ya arbitration layer (API ke through badlav), ownership tags as minimum, aur contract tests jo dono ko saath chalaye',
          'Documentation',
          'Weekly sync meeting',
          'Ek team ko rok do',
        ],
        answer: 0,
        explain: 'Warna "bugs ki category" — ek-ek karke patch.',
      },
    ],
  },
  success: [
    'Main auto-update dilemma ka staged jawab de sakta hoon',
    'Main two-pass blast radius review kar sakta hoon',
    'Main Datadog ke paanch takeaways apne system par laga sakta hoon',
  ],
  homework: `<p>Apne system ka "doosra diagram" poora karo (pehla level ka homework). Ab usme se sabse khatarnak ek cheez chuno aur likho: use waves
    mein kaise badloge, uska canary kaisa hoga (prod jaisa!), aur agar woh sab jagah gire toh recovery ka raasta kya hai jo us par nirbhar na ho.</p>`,
  cards: [
    { front: 'Two-pass blast radius review?', back: '1) Geographic: zones, regions, failover. 2) Stack: har fleet-jaisi cheez — kahan se aati hai, kaunsa event badalta hai, kya sab jagah ek saath?' },
    { front: 'Auto-update dilemma?', back: 'Band = breach risk; synchronized = outage risk. Jawab: staged waves, pehle prod jaisi purani machines par.' },
    { front: 'Datadog takeaways?', back: 'Dependencies audit karo; chhupe bugs ka fuse lamba; prod ki STATE test karo; saajha resource bina maalik = fault line; recovery gir sakne wali cheez par nahi.' },
  ],
},
]);

})();
