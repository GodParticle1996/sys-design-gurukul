/* =====================================================================
   🛡️ Playlist · 1 Resilience — Randomness · level 2: KAISE
   Do sikke (do mein se behtar) purani jaankari par bhi jhund kyun nahi banate; aur load balancer ki apni taaza ginti.
   Har step docker-labs/41-load-balancing ke asli run se hai: slow motion = `node tools/slowmo.js` (modes two, live),
   `node tools/mini.js`, asli raftaar = tools/algos.js (ex1).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'lb', icon: '🚦', label: 'load balancer', x: 160, y: 180 },
  { id: 's1', icon: '🖥️', label: 'S1', x: 690, y: 65 },
  { id: 's2', icon: '🖥️', label: 'S2', x: 690, y: 180 },
  { id: 's3', icon: '🖥️', label: 'S3', x: 690, y: 290 },
];
const EDGES = [{ from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }, { from: 'lb', to: 's3' }];
const VIZ = { w: 890, h: 365, focus: ['s1', 's2', 's3'] };   // phone par servers hamesha dikhein; load balancer ki baat vars table mein hai
const jobs = n => (n ? Array.from({ length: n }, () => 'busy') : 'khaali');
const to = (s, label, tone) => [{ from: 'lb', to: s, label, tone: tone || 'acc' }];

VISUALS['rn-kaise'] = {
  t: 'Do sikke: S2 aur S1 nikle. S3 sabse khaali tha — par is request ne S3 ko dekha hi nahi',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { lb: { tone: 'acc', badge: 'sikke: S2, S1 → S2' }, s1: { tone: 'idle', badge: 'dikha: 2' }, s2: { tone: 'ok', badge: 'dikha: 1 — chuna gaya' }, s3: { tone: 'idle', badge: 'dikha: 0 — dekha hi nahi' } },
    flows: [{ from: 'lb', to: 's2', label: '#3', tone: 'ok' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rn-kaise',
  icon: '🪙',
  group: '🎲 Randomness',
  title: 'Randomness 2 · Kaise — do sikke: do mein se behtar',
  badge: 'Sikka Samrat',
  objectives: [
    '"Do mein se behtar" har request ke liye kya-kya karta hai?',
    'Jaankari utni hi purani thi. Phir do sikkon ke saath jhund kyun nahi bana?',
    'Load balancer ko taaza jaankari kahan se mil sakti hai — bina servers se poochhe?',
    'Do hi kyun? Teen ya chaar servers dekhne se kya badalta?',
  ],
  lesson: [
    `<h3>🪙 Jaankari wahi purani. Bas ek cheez mila di.</h3>
     <p>Pichhle level mein do tareeke haare:</p>
     <pre>"sabse khaali ko bhejo" (purani jaankari)  → jhund: chaar-chaar ke dher · ausat 1.13 s
"baari-baari" (koi jaankari nahi)          → andha: dheeme S3 ko barabar hissa · sabse lamba 4.95 s</pre>
     <p>Is level ka tareeka purani jaankari <b>hi</b> use karta hai. Is tareeke mein bas ek cheez milayi gayi hai: <b>do sikke</b>.</p>
     <pre>wahi teen servers, wahi requests, wahi 1 second purani jaankari:
do sikke, phir un do mein se behtar        → ausat 0.89 s · sabse lamba 1.35 s</pre>
     <p class="tip">👉 Agle screen par dekho ki har request ke liye sikke kaise girte hain — aur jab sikkon mein "sabse khaali" server aata hi nahi, tab kya hota hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. do sikke ---------------- */
    {
      type: 'dryrun',
      title: '👣 Dry run — do sikke, phir un do mein se behtar',
      goal: 'Har click = ek request. Har baar teen cheezein dekho: <b>kaunse do servers nikle</b>, <b>load balancer ko un do par kya dikh raha hai</b>, aur <b>request kahan gayi</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'seen', label: 'Load balancer ko dikh raha hai' },
        { id: 'coins', label: 'Is request ke do sikke' },
        { id: 'went', label: 'Request kahan gayi' },
        { id: 'real', label: 'Asal mein ab' },
      ],
      steps: [
        {
          clock: 'niyam',
          say: `Load balancer ka naya niyam, har request ke liye:
            <ol>
              <li>Do <b>alag</b> servers random chuno. ("Do sikke.")</li>
              <li>Un do mein se jis server par <b>kam kaam dikh raha hai</b>, usi server ko request bhejo.</li>
            </ol>
            Jaankari wahi hai jo pichhle level mein thi: servers har 1 second par apna haal bhejte hain.`,
          nodes: { lb: { tone: 'ok', badge: 'niyam: do mein se behtar' }, s1: { tone: 'busy', badge: '2 kaam' }, s2: { tone: 'busy', badge: '1 kaam' }, s3: { tone: 'idle', badge: 'khaali' } },
          vars: { seen: '—', coins: '—', went: '—', real: 'S1 2 · S2 1 · S3 0' },
        },
        {
          clock: '0.00 s',
          say: 'Haal aaya: <b>S1 2 · S2 1 · S3 0</b>. Request <b>#1</b>: sikke <b>S1</b> aur <b>S3</b> nikle. S1 par 2 dikh raha hai, S3 par 0 → #1 <b>S3</b> par.',
          flows: to('s3', '#1', 'ok'),
          nodes: { lb: { tone: 'acc', badge: 'sikke: S1, S3' }, s1: { tone: 'busy', badge: 'dikha: 2' }, s2: { tone: 'idle', badge: 'dekha nahi' }, s3: { tone: 'ok', badge: 'dikha: 0 — chuna' } },
          vars: { seen: 'S1 2 · S2 1 · S3 0', coins: 'S1, S3', went: '#1 → S3', real: 'S1 2 · S2 1 · S3 1' },
        },
        {
          clock: '0.25 s',
          say: 'Request <b>#2</b>: sikke <b>S3</b> aur <b>S2</b>. Load balancer ko ab bhi S3 par 0 dikh raha hai (jaankari purani hai) → #2 bhi <b>S3</b> par.',
          flows: to('s3', '#2', 'acc'),
          nodes: { lb: { tone: 'acc', badge: 'sikke: S3, S2' }, s1: { tone: 'idle', badge: 'dekha nahi' }, s2: { tone: 'busy', badge: 'dikha: 1' }, s3: { tone: 'ok', badge: 'dikha: 0 — chuna' } },
          vars: { coins: 'S3, S2', went: '#2 → S3', real: 'S1 2 · S2 1 · S3 2' },
        },
        {
          clock: '0.50 s',
          say: 'Request <b>#3</b>: sikke <b>S2</b> aur <b>S1</b> nikle.',
          nodes: { lb: { tone: 'acc', badge: 'sikke: S2, S1' }, s1: { tone: 'busy', badge: 'dikha: 2' }, s2: { tone: 'busy', badge: 'dikha: 1' }, s3: { tone: 'idle', badge: 'dekha nahi' } },
          vars: { coins: 'S2, S1', went: '?' },
          ask: {
            q: 'Load balancer ko dikh raha hai: S1 2 · S2 1 · S3 0. #3 ke sikke S2 aur S1 nikle hain. #3 kahan jaayegi?',
            choices: [
              'S2 par — un do mein S2 par kam dikh raha hai. S3 sabse khaali dikhta hai, par #3 ne S3 ko dekha hi nahi',
              'S3 par — S3 sabse khaali dikh raha hai',
              'S1 par — pehla sikka S2 tha, toh doosra jeetega',
              'Sikke dobara uchhaale jaayenge jab tak S3 na nikle',
            ],
            answer: 0,
            hint: 'Niyam ka doosra hissa padho: "un <b>do</b> mein se". Teesre server ka koi zikr hai?',
            explain: 'Slow motion ki line: <code>#3 → S2 (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 1 · S3 0)</code>. Pichhle level mein #3 bhi S3 par gayi thi. Yahi ek request jhund ko todti hai.',
          },
        },
        {
          clock: '0.75 s',
          say: 'Request <b>#4</b>: sikke S2 aur S3 → <b>S3</b>.<br><br>Pehle second ka hisaab: S3 ko <b>3</b>, S2 ko <b>1</b>. Pichhle level mein S3 ko chaaron mili thi.',
          flows: to('s3', '#4', 'acc'),
          nodes: { lb: { tone: 'acc', badge: 'sikke: S2, S3' }, s1: { tone: 'ok', badge: '1 kaam' }, s2: { tone: 'ok', badge: '1 kaam' }, s3: { tone: 'busy', badge: '2 kaam' } },
          vars: { coins: 'S2, S3', went: '#4 → S3', real: 'S1 1 · S2 1 · S3 2' },
        },
        {
          clock: '1.00–1.75 s',
          say: 'Naya haal: <b>S1 1 · S2 1 · S3 2</b>. #5: sikke S1, S3 → S1.<br><br>#6, #7, #8: teeno baar sikke <b>S2 aur S1</b> nikle. Dono par 1 dikh raha hai — barabari. Barabari mein pehla sikka jeetta hai: teeno <b>S2</b> par.<br><br>Sikke kabhi-kabhi ek hi taraf girte hain. Random har baar barabar nahi baant-ta.',
          flows: to('s2', '#6–#8', 'slow'),
          nodes: { lb: { tone: 'acc', badge: 'dikha: S1 1 · S2 1 · S3 2' }, s1: { tone: 'ok', badge: '1 kaam' }, s2: { tone: 'busy', badge: '3 kaam' }, s3: { tone: 'ok', badge: '1 kaam' } },
          vars: { seen: 'S1 1 · S2 1 · S3 2', coins: 'S2, S1 (teen baar)', went: '#6, #7, #8 → S2', real: 'S1 1 · S2 3 · S3 1' },
        },
        {
          clock: 'nateeja',
          say: `24 requests ka hisaab: S1 ko 7 · S2 ko 9 · S3 ko 8.
            <div class="dr-scroll"><table>
              <tr><th>Niyam (jaankari 1 s purani)</th><th>Ausat samay</th><th>Sabse lamba</th></tr>
              <tr><td>Sabse khaali ko bhejo</td><td>1.13 s</td><td>1.65 s</td></tr>
              <tr><td>Do mein se behtar</td><td><b>0.89 s</b></td><td><b>1.35 s</b></td></tr>
            </table></div>`,
          nodes: { lb: { tone: 'ok', badge: 'do mein se behtar' }, s1: { tone: 'ok', badge: '7 requests' }, s2: { tone: 'ok', badge: '9 requests' }, s3: { tone: 'ok', badge: '8 requests' } },
          vars: { coins: '—', went: 'S1 7 · S2 9 · S3 8', real: 'ausat 0.89 s · sabse lamba 1.35 s' },
          ask: {
            q: 'Jaankari utni hi purani thi jitni pichhle level mein. Phir chaar-chaar ke dher kyun nahi lage?',
            choices: [
              'Har request ne alag do servers dekhe. "Sabse khaali" server tabhi chuna gaya jab "sabse khaali" server un do mein tha; baaki requests kahin aur gayi',
              'Kyunki do sikkon se jaankari taaza ho jaati hai',
              'Kyunki requests kam aayi',
              'Kyunki servers tez ho gaye',
            ],
            answer: 0,
            hint: 'Pichhle level mein har request ne kitne servers dekhe the? Aur sab ne kise chuna?',
            explain: 'Jhund ke liye do cheezein chahiye: purani jaankari <b>aur</b> sab ka ek hi faisla. Sikkon ne doosri cheez tod di. Jaankari purani hi rahi.',
          },
        },
        {
          clock: 'doosra ilaaj',
          say: 'Ab doosri cheez: <b>jaankari purani kyun ho?</b><br><br>Load balancer servers se haal maangne ke bajaye <b>khud gin</b> sakta hai: maine S1 ko kitni requests bheji, aur in requests mein se kitni ka jawab aa chuka. Bheji − lauti = S1 par abhi kitni hain.',
          nodes: { lb: { tone: 'acc', badge: 'apni ginti: bheji − lauti' }, s1: { tone: 'idle', badge: '' }, s2: { tone: 'idle', badge: '' }, s3: { tone: 'idle', badge: '' } },
          vars: { seen: 'apni ginti', coins: '—', went: '—', real: '—' },
          ask: {
            q: 'Load balancer ki apni ginti (bheji − lauti) kitni purani ho sakti hai?',
            choices: [
              'Bilkul nahi — har request bhejte hi aur har jawab aate hi ginti badal jaati hai',
              '1 second — servers ke haal jitni',
              '0.5 second',
              'Utni, jitna load balancer chahe',
            ],
            answer: 0,
            hint: 'Request kiske haath se guzarti hai? Jawab kiske haath se laut-ta hai?',
            explain: 'Har request aur har jawab load balancer se hi guzarta hai. Is ginti ke liye kisi se poochhna nahi padta. (Shart: sab requests isi ek load balancer se jaati hon.)',
          },
        },
        {
          clock: 'apni ginti ke saath',
          say: `Wahi slow motion, "sabse khaali ko bhejo" — par load balancer ki apni taaza ginti se:
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>Jaankari</th><th>Ausat</th><th>Sabse lamba</th></tr>
              <tr><td>Sabse khaali ko</td><td>servers se, 1 s purani</td><td>1.13 s</td><td>1.65 s</td></tr>
              <tr><td>Koi bhi ek</td><td>—</td><td>1.17 s</td><td>2.15 s</td></tr>
              <tr><td>Baari-baari</td><td>—</td><td>0.85 s</td><td>1.80 s</td></tr>
              <tr><td>Do mein se behtar</td><td>servers se, 1 s purani</td><td>0.89 s</td><td>1.35 s</td></tr>
              <tr><td>Sabse khaali ko</td><td><b>apni taaza ginti</b></td><td><b>0.70 s</b></td><td><b>1.05 s</b></td></tr>
            </table></div>
            Niyam wahi tha jo pichhle level mein sabse bura nikla. Sirf jaankari taaza hui.`,
          nodes: { lb: { tone: 'ok', badge: 'sabse khaali · taaza ginti' }, s1: { tone: 'ok', badge: '7 requests' }, s2: { tone: 'ok', badge: '8 requests' }, s3: { tone: 'ok', badge: '9 requests' } },
          vars: { seen: 'apni ginti — hamesha taaza', went: 'S1 7 · S2 8 · S3 9', real: 'ausat 0.70 s · sabse lamba 1.05 s' },
        },
        {
          clock: 'dheema S3',
          say: `Ab wahi dheema S3 (teen guna). Load balancer ki ginti mein dheema server <b>apne aap bhara dikhta hai</b>: S3 ki requests der tak lauti nahi, toh S3 ki ginti oonchi rehti hai.
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>S3 ko mili</th><th>Sabse lamba</th><th>8 s par adhoori</th></tr>
              <tr><td>Baari-baari</td><td>24 mein se 8</td><td>4.95 s</td><td>4</td></tr>
              <tr><td>Sabse khaali ko, apni ginti</td><td>24 mein se <b>5</b></td><td>3.40 s</td><td>1</td></tr>
              <tr><td>Do mein se behtar, apni ginti</td><td>24 mein se <b>5</b></td><td>4.45 s</td><td>1</td></tr>
            </table></div>
            Kisi ne load balancer ko nahi bataya ki S3 dheema hai. Ginti ne khud bata diya.`,
          nodes: { lb: { tone: 'ok', badge: 'apni ginti' }, s1: { tone: 'ok', badge: '9 requests' }, s2: { tone: 'ok', badge: '10 requests' }, s3: { tone: 'slow', badge: 'dheema · sirf 5 mili' } },
          vars: { seen: 'apni ginti', went: 'S1 9 · S2 10 · S3 5', real: 'dheeme S3 ko kam hissa' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab: 5 servers, 300 requests/second. "Sabse lambi line" dekho — pehle jab sab servers ek jaise hain, phir jab ek teen guna dheema hai. (Teen run ka dayra.)
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>Jaankari</th><th>Sab ek jaise</th><th>Ek dheema</th></tr>
              <tr><td>Baari-baari</td><td>—</td><td>8–9</td><td>91–113</td></tr>
              <tr><td>Koi bhi ek</td><td>—</td><td>8–12</td><td>139–152</td></tr>
              <tr><td>Sabse khaali ko</td><td>0.5 s purani</td><td>92–106</td><td>111–132</td></tr>
              <tr><td>Do mein se behtar</td><td>0.5 s purani</td><td>29–32</td><td>22–39</td></tr>
              <tr><td>Sabse khaali ko</td><td>apni taaza ginti</td><td><b>0</b></td><td><b>0–1</b></td></tr>
              <tr><td>Do mein se behtar</td><td>apni taaza ginti</td><td><b>0–1</b></td><td><b>1–2</b></td></tr>
            </table></div>
            Sab servers ek jaise hon, tab purani jaankari par "do mein se behtar" ki line "sabse khaali" se lagbhag teen guna chhoti. Taaza ginti ke saath dono lagbhag barabar.`,
          nodes: { lb: { tone: 'ok', badge: 'lab: 5 servers, 300/s' }, s1: { tone: 'idle', badge: '' }, s2: { tone: 'idle', badge: '' }, s3: { tone: 'idle', badge: '' } },
          vars: { seen: 'lab ki table', went: '—', real: 'lab: line 92–106 → 29–32 (purani jaankari)' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jhund ke do ilaaj hain, aur dono saath chal sakte hain. <b>Jaankari taaza karo:</b> load balancer apni ginti rakhe. <b>Faisle mein random milao:</b> do sikke, phir un do mein se behtar.<br>Doosre tareeke ka naam <b>power of two choices</b> hai.',
    },

    /* ---------------- 2. ek hi jaankari, hazaar requests ---------------- */
    {
      type: 'dryrun',
      title: '🎯 Ek hi purani jaankari, 1,000 requests',
      goal: 'Lab ka sabse chhota program: load balancer ko ek hi haal dikh raha hai, aur chaaron tareeke us par 1,000 requests bhejte hain. Do jagah pehle tumse poochha jaayega.',
      vars: [
        { id: 'seen', label: 'Load balancer ko dikh raha hai (badlega nahi)' },
        { id: 'how', label: 'Tareeka' },
        { id: 'first', label: 'Pehli 12 requests' },
        { id: 'count', label: '1,000 requests: S1 / S2 / S3' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'Load balancer ko dikh raha hai: <b>S1 par 3</b>, <b>S2 par 0</b>, <b>S3 par 1</b>. Agla haal aane tak yahi dikhta rahega — aur us beech 1,000 requests aa jaati hain.',
          vars: { seen: 'S1 3 · S2 0 · S3 1', how: '—', first: '—', count: '—' },
        },
        {
          clock: 'sabse khaali ko',
          say: 'Pehle "sabse kam load wala". Har request ko wahi jawab milta hai: S2.<br><br>1,000 mein se <b>1,000</b> S2 par. S3 par sirf 1 kaam tha, phir bhi S3 ko ek request nahi mili.',
          vars: { how: 'sabse kam load wala', first: 'S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2', count: '0 / <b>1000</b> / 0' },
          ask: {
            q: 'Ab "do mein se behtar". Teen jodiyan ban sakti hain: (S1, S2) · (S1, S3) · (S2, S3). S1 par sabse zyada (3) dikh raha hai. S1 kitni jodiyon mein jeetega?',
            choices: [
              'Kisi mein nahi — S1 jis bhi jodi mein hai, doosra server S1 se khaali dikhta hai',
              'Ek mein',
              'Dono mein jisme S1 hai',
              'Teeno mein',
            ],
            answer: 0,
            hint: '(S1, S2): kaun khaali dikhta hai? (S1, S3): kaun?',
            explain: '(S1, S2) → S2. (S1, S3) → S3. Teesri jodi mein S1 hai hi nahi. "Do mein se behtar" kabhi <b>sabse bhare</b> server ko nahi chunta — aur yeh pakka hai, sikkon par nirbhar nahi.',
          },
        },
        {
          clock: 'do mein se behtar',
          say: 'S1 ko <b>0</b>. Baaki do mein baant gaya: S2 do jodiyon mein jeetta hai, S3 ek mein.<br><br>1,000 requests: <b>0 / 694 / 306</b>. Koi ek server akela dher nahi uthata.',
          vars: { how: 'do mein se behtar', first: 'S2 S3 S2 S2 S2 S2 S3 S2 S2 S2 S2 S2', count: '<b>0 / 694 / 306</b>' },
        },
        {
          clock: 'andhe tareeke',
          say: `Baaki do tareeke haal dekhte hi nahi:
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>S1 (dikha: 3)</th><th>S2 (dikha: 0)</th><th>S3 (dikha: 1)</th></tr>
              <tr><td>Baari-baari</td><td>334</td><td>333</td><td>333</td></tr>
              <tr><td>Koi bhi ek</td><td>299</td><td>340</td><td>361</td></tr>
              <tr><td>Sabse kam load wala</td><td>0</td><td><b>1000</b></td><td>0</td></tr>
              <tr><td>Do mein se behtar</td><td><b>0</b></td><td>694</td><td>306</td></tr>
            </table></div>
            Baari-baari aur "koi bhi ek" ne S1 ko bhi teesra hissa diya — jabki S1 par sabse zyada kaam dikh raha tha.`,
          vars: { how: 'chaaron', first: '—', count: 'upar ki table' },
          ask: {
            q: 'Agar load balancer do ki jagah <b>teeno</b> servers dekh ke sabse khaali chune, toh 1,000 requests kaise bantengi?',
            choices: [
              '0 / 1000 / 0 — sab ko dekhna wahi "sabse kam load wala" hai, aur wahi jhund',
              '333 / 333 / 334',
              '0 / 500 / 500',
              '0 / 694 / 306 — kuch nahi badlega',
            ],
            answer: 0,
            hint: 'Teen servers hain. Teeno ko dekh ke sabse khaali chunna — yeh table ki kaunsi line hai?',
            explain: 'Jitne zyada servers dekhoge, utna "sabse khaali" ke paas pahunchoge — aur utna jhund ke paas. <b>Do</b> itna hai ki sabse bhare se bach jao, aur itna kam ki sab ek hi par na pahunchein.',
          },
        },
        {
          clock: 'do hi kyun?',
          say: 'Do sikkon mein teen fayde ek saath hain:<ul><li><b>Sabse bhara server kabhi nahi chuna jaata</b> (upar: S1 ko 0).</li><li><b>Sab ek hi server par nahi jaate</b> (upar: 694 aur 306).</li><li><b>Sasta:</b> sau servers hon tab bhi har request ke liye sirf do ka haal dekhna hai.</li></ul>',
          vars: { how: 'do mein se behtar', count: '0 / 694 / 306' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "sabse achha" chunne aur "andha" chunne ke beech ek raasta hai: <b>thoda random, thodi jaankari</b>. Do random dekho, un do mein se behtar lo.',
    },

    /* ---------------- 3. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — jhund aur do sikke, slow motion mein',
      project: '41-load-balancing',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao: 3 servers, har 0.25 s par ek request. Pehle "sabse khaali ko" purani jaankari se, phir "do mein se behtar" usi jaankari se.',
      why: '<code>lib/pick.js</code> = chunne ke chaaron tareeke. <code>tools/slowmo.js</code> in tareekon ko teen servers par chalata hai. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Sikkon ka beej tay hai aur ghadi tay hai, isliye tumhara output dry run se milega.',
      steps: [
        { text: 'Pehle jhund: "sabse khaali ko", jaankari har 1 s par. Dekho #1–#4, #5–#8, #9–#12 kahan gayi.', cmd: 'cd docker-labs/41-load-balancing && node tools/slowmo.js --mode stale', expect: "3 servers, har ek ek waqt mein 1 request (600 ms) · requests har 250 ms par (kul 24) · shuru mein S1 par 2 kaam, S2 par 1, S3 khaali\n\n=== sabse kam load wala · jaankari har 1 s par aati hai (beech mein purani) ===\n    0.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0\n    0.00 s  #1  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1\n    0.25 s  #2  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2\n    0.50 s  #3  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 3\n    0.75 s  #4  → S3   (LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 0 · S3 3\n    1.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 3\n    1.00 s  #5  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 1 · S3 3\n    1.25 s  #6  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 2 · S3 2\n    1.50 s  #7  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2\n    1.75 s  #8  → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2\n    2.00 s  📋 servers ne apna haal bheja: S1 0 · S2 3 · S3 1\n    2.00 s  #9  → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 1 · S2 3 · S3 1\n    2.25 s  #10 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1\n    2.50 s  #11 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0\n    2.75 s  #12 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0\n    3.00 s  📋 servers ne apna haal bheja: S1 3 · S2 1 · S3 0\n    3.00 s  #13 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 3 · S2 1 · S3 1\n    3.25 s  #14 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2\n    3.50 s  #15 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 0 · S3 3\n    3.75 s  #16 → S3   (LB ko dikha: S1 3 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 0 · S3 3\n    4.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 3\n    4.00 s  #17 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 1 · S3 3\n    4.25 s  #18 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 1 · S2 2 · S3 2\n    4.50 s  #19 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2\n    4.75 s  #20 → S2   (LB ko dikha: S1 1 · S2 0 · S3 3)   asal mein ab: S1 0 · S2 3 · S3 2\n    5.00 s  📋 servers ne apna haal bheja: S1 0 · S2 3 · S3 1\n    5.00 s  #21 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 1 · S2 3 · S3 1\n    5.25 s  #22 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 2 · S2 2 · S3 1\n    5.50 s  #23 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0\n    5.75 s  #24 → S1   (LB ko dikha: S1 0 · S2 3 · S3 1)   asal mein ab: S1 3 · S2 2 · S3 0\n    6.00 s  📋 servers ne apna haal bheja: S1 3 · S2 1 · S3 0\n    7.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 0\n   nateeja → requests: S1 8 · S2 8 · S3 8 · ek request ka ausat samay 1.13 s · sabse lamba 1.65 s (#4, S3) · sabse lambi line 2" },
        { text: 'Ab wahi purani jaankari, par do sikke. Har line mein "do sikke:" ke aage dekho kaunse do servers nikle.', cmd: 'node tools/slowmo.js --mode two', expect: "3 servers, har ek ek waqt mein 1 request (600 ms) · requests har 250 ms par (kul 24) · shuru mein S1 par 2 kaam, S2 par 1, S3 khaali\n\n=== do mein se behtar · wahi purani jaankari (har 1 s) ===\n    0.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0\n    0.00 s  #1  → S3   (do sikke: S1, S3 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1\n    0.25 s  #2  → S3   (do sikke: S3, S2 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2\n    0.50 s  #3  → S2   (do sikke: S2, S1 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 2 · S2 2 · S3 2\n    0.75 s  #4  → S3   (do sikke: S2, S3 · LB ko dikha: S1 2 · S2 1 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2\n    1.00 s  📋 servers ne apna haal bheja: S1 1 · S2 1 · S3 2\n    1.00 s  #5  → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 2\n    1.25 s  #6  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 1 · S3 1\n    1.50 s  #7  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 1\n    1.75 s  #8  → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 3 · S3 1\n    2.00 s  📋 servers ne apna haal bheja: S1 0 · S2 2 · S3 0\n    2.00 s  #9  → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 0 · S2 2 · S3 1\n    2.25 s  #10 → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 0 · S2 2 · S3 2\n    2.50 s  #11 → S1   (do sikke: S1, S2 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2\n    2.75 s  #12 → S3   (do sikke: S3, S1 · LB ko dikha: S1 0 · S2 2 · S3 0)   asal mein ab: S1 1 · S2 1 · S3 2\n    3.00 s  📋 servers ne apna haal bheja: S1 1 · S2 1 · S3 2\n    3.00 s  #13 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 2\n    3.25 s  #14 → S2   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 0 · S2 2 · S3 1\n    3.50 s  #15 → S2   (do sikke: S3, S2 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 0 · S2 3 · S3 1\n    3.75 s  #16 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 1 · S3 2)   asal mein ab: S1 1 · S2 2 · S3 1\n    4.00 s  📋 servers ne apna haal bheja: S1 1 · S2 2 · S3 0\n    4.00 s  #17 → S1   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 2 · S3 0\n    4.25 s  #18 → S1   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 3 · S2 1 · S3 0\n    4.50 s  #19 → S3   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 1\n    4.75 s  #20 → S3   (do sikke: S2, S3 · LB ko dikha: S1 1 · S2 2 · S3 0)   asal mein ab: S1 2 · S2 1 · S3 2\n    5.00 s  📋 servers ne apna haal bheja: S1 1 · S2 0 · S3 2\n    5.00 s  #21 → S1   (do sikke: S3, S1 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 0 · S3 2\n    5.25 s  #22 → S2   (do sikke: S2, S1 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 1 · S3 1\n    5.50 s  #23 → S1   (do sikke: S1, S3 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 3 · S2 1 · S3 1\n    5.75 s  #24 → S2   (do sikke: S1, S2 · LB ko dikha: S1 1 · S2 0 · S3 2)   asal mein ab: S1 2 · S2 2 · S3 0\n    6.00 s  📋 servers ne apna haal bheja: S1 2 · S2 1 · S3 0\n    7.00 s  📋 servers ne apna haal bheja: S1 0 · S2 0 · S3 0\n   nateeja → requests: S1 7 · S2 9 · S3 8 · ek request ka ausat samay 0.89 s · sabse lamba 1.35 s (#15, S2) · sabse lambi line 2" },
        { text: 'Sabse chhota program: ek hi haal, chaaron tareeke, 1,000 requests.', cmd: 'node tools/mini.js', expect: "LB ko dikh raha hai:  S1 3 · S2 0 · S3 1   (yeh jaankari agli 12 requests tak nahi badlegi)\n\ntareeka             agli 12 requests kahan gayi                       1,000 requests: S1 / S2 / S3\nbaari-baari         S1 S2 S3 S1 S2 S3 S1 S2 S3 S1 S2 S3   334 / 333 / 333\nkoi bhi ek          S1 S1 S3 S3 S2 S2 S2 S1 S2 S3 S1 S1   299 / 340 / 361\nsabse kam load      S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2 S2   0 / 1000 / 0\ndo mein se behtar   S2 S3 S2 S2 S2 S2 S3 S2 S2 S2 S2 S2   0 / 694 / 306\n\n\"Sabse kam load\" ne saari requests ek hi server (S2) par bhej di — jab tak nayi jaankari na aaye.\n\"Do mein se behtar\" ne S1 (sabse bhara) ko kabhi nahi chuna, aur baaki do mein baant diya.\n\nLB ko dikh raha hai:  S1 0 · S2 0 · S3 0   (teeno barabar)\nbarabari mein hamesha pehla server:   1000 / 0 / 0\nbarabari mein sikka (lib/pick.js):    318 / 352 / 330" },
      ],
      observe: {
        q: 'Dono slow motion mein load balancer ko wahi 1 second purani jaankari mili. Pehle mein ausat 1.13 s, doosre mein 0.89 s. Kya badla tha?',
        choices: [
          'Faisla: pehle mein har request ne teeno servers dekh ke wahi "sabse khaali" chuna; doosre mein har request ne sirf do random servers dekhe, toh sab ek hi par nahi gayi',
          'Jaankari: doosre mein jaankari taaza thi',
          'Servers: doosre mein servers tez the',
          'Requests: doosre mein requests kam thi',
        ],
        answer: 0,
        explain: 'Jaankari utni hi purani thi. Sikkon ne "sab ka ek hi faisla" toda — jhund ke liye wahi zaroori tha.',
      },
      lesson: 'Purani jaankari par "sabse achha" mat chuno. Ya jaankari taaza karo, ya faisle mein thoda random milao.',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum "kyun kaam karta hai" tak jaate ho. 🎤',
    questions: [
      {
        q: '"Power of two choices kya hai, aur yeh herding se kaise bachata hai?"',
        choices: [
          'Har request ke liye do random servers chuno aur un do mein se kam load wale ko bhejo. Sabse bhara server kabhi nahi chuna jaata; aur har request alag do servers dekhti hai, toh purani jaankari par bhi sab ek hi "sabse khaali" server par nahi pahunchte',
          'Har request do servers ko bheji jaati hai, aur jo server pehle jawab de, usi ka jawab rakha jaata hai',
          'Servers ko do groups mein baant diya jaata hai',
          'Load balancer do baar retry karta hai',
        ],
        answer: 0,
        explain: 'Lab ka mini program, haal S1 3 · S2 0 · S3 1: "sabse kam load" → 0 / 1000 / 0. "Do mein se behtar" → 0 / 694 / 306. Asli raftaar, 0.5 s purani jaankari: line 92–106 banaam 29–32.',
      },
      {
        q: '"Least connections ke liye load balancer ko servers se load poochhna padta hai?"',
        choices: [
          'Nahi. Load balancer khud ginta hai: kis server ko kitni requests bheji aur kitni ka jawab aa chuka. Yeh ginti hamesha taaza hoti hai. (Kai load balancers hon toh har ek ko sirf apni requests dikhti hain — tab do mein se behtar aur kaam aata hai.)',
          'Haan — har request se pehle sab servers ko ping karna padta hai',
          'Haan — servers ko har second CPU bhejna padta hai',
          'Least connections sirf database ke liye hota hai',
        ],
        answer: 0,
        explain: 'Lab: "sabse khaali ko" 0.5 s purani jaankari se → line 92–106. Wahi niyam, load balancer ki apni ginti se → line 0. Ek dheeme server ke saath bhi 0–1.',
      },
    ],
  },
  success: [
    '"Do mein se behtar" ke do kadam bata sakte ho, aur kyun sabse bhara server kabhi nahi chuna jaata',
    'Samjha sakte ho ki jhund ke liye do cheezein chahiye — aur kaunsa ilaaj kaunsi todta hai',
    'Bata sakte ho ki load balancer ki apni ginti servers ke bheje haal se behtar kyun hai',
  ],
  cards: [
    { front: 'Power of two choices?', back: 'Do alag servers random chuno; un do mein se kam load wale ko bhejo. Lab (haal S1 3 · S2 0 · S3 1): 0 / 694 / 306 — sabse bhare ko 0, aur koi ek akela dher nahi uthata.' },
    { front: 'Jhund ke liye kaunsi do cheezein chahiye?', back: '(1) Purani jaankari. (2) Sab ka ek hi faisla. Ilaaj: jaankari taaza karo (load balancer ki apni ginti), ya faisle mein random milao (do sikke).' },
    { front: 'Load balancer ki apni ginti?', back: 'Bheji − lauti = us server par abhi kitni. Hamesha taaza, kisi se poochhna nahi. Dheema server apne aap bhara dikhta hai. Lab: line 0 (purani jaankari par 92–106).' },
    { front: 'Do hi kyun — sab ko kyun nahi dekhte?', back: 'Sab ko dekhna = "sabse khaali" = jhund (0 / 1000 / 0). Do: sabse bhare se bachne ke liye kaafi, jhund ke liye kam, aur sau servers mein bhi sasta.' },
  ],
},
]);

})();
