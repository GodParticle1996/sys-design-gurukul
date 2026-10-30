/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: CHAOS ENGINEERING (chaar chhote levels)
     1 Kyun  → samasya pehle: "3 copies hain" ek daava hai — ek instance mara toh har teesri request giri (yeh file)
     2 Kaise → ek prayog ka dhancha (aur band karne ka button); har chot alag kami dikhati hai
     3 Code  → prayog 35 line mein (lib/experiment.js), monkey (lib/monkey.js), aur asli tools mein wahi cheezein
     4 Kab   → kahan todna hai, kahan bilkul nahi; naapi hui galtiyan; sach ya galatfehmi
   Har number docker-labs/42-chaos ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/monkey.js (ex1).
   Source video (credit): Software Developer Diaries — "The Secret Weapon Behind Resilient Distributed Systems".
   (Us video ka retries wala hissa Retries levels mein hai; server chunne wala hissa Randomness levels mein.)
   ===================================================================== */
(function () {

/* load balancer + menu-service ke teen instances */
const NODES = [
  { id: 'lb', icon: '🚦', label: 'load balancer', x: 160, y: 180 },
  { id: 'i1', icon: '🖥️', label: 'instance 1', x: 690, y: 65 },
  { id: 'i2', icon: '🖥️', label: 'instance 2', x: 690, y: 180 },
  { id: 'i3', icon: '🖥️', label: 'instance 3', x: 690, y: 290 },
];
const EDGES = [{ from: 'lb', to: 'i1' }, { from: 'lb', to: 'i2' }, { from: 'lb', to: 'i3' }];
const VIZ = { w: 890, h: 365, focus: ['i1', 'i2', 'i3'] };   // phone par instances hamesha dikhein; load balancer ki baat vars table mein hai
const to = (i, label, tone) => [{ from: 'lb', to: 'i' + i, label, tone: tone || 'ok' }];

VISUALS['ch-kyun'] = {
  t: 'Teen instances the. Instance 2 mar gaya — par load balancer ki list mein ab bhi tha. Har teesri request giri',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { lb: { tone: 'slow', badge: 'list: 1 · 2 · 3' }, i1: { tone: 'ok', badge: 'chal raha hai' }, i2: { tone: 'bad', badge: 'mar gaya' }, i3: { tone: 'ok', badge: 'chal raha hai' } },
    flows: [{ from: 'lb', to: 'i2', label: '#5 #8 #11', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'ch-kyun',
  icon: '🐒',
  group: '🐒 Chaos Engineering',
  title: 'Chaos 1 · Kyun — "3 copies hain" ek daava hai, saboot nahi',
  badge: 'Kami Khoji',
  objectives: [
    'Teen instances the. Ek mara. Phir har teesri request kyun giri?',
    'Health check lagane se kya sudhra — aur kaunsi request phir bhi giri?',
    'Yeh kami incident se PEHLE kaise mil sakti thi?',
    'Chaos engineering, chaos monkey, fault, steady state, hypothesis, blast radius: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🐒 "Ek mar bhi jaaye toh kuch nahi hoga" — kisne chala ke dekha?</h3>
     <p>KhanaKart ki <b>menu-service</b> ke teen <b>instances</b> chalte hain. (Instance = app ki ek chalti copy.) Aage ek <b>load balancer</b> hai jo har request ko baari-baari ek instance par bhejta hai.</p>
     <p>Team ka daava: <b>"3 copies hain. Ek mar bhi jaaye toh kuch nahi hoga."</b> Kisi ne kabhi ek instance maar ke dekha nahi.</p>
     <p>Ek raat 2 baje instance 2 mar gaya, aur 2 second mein khud wapas aa gaya. Yeh us raat baar-baar hua. Subah ka dashboard:</p>
     <pre>lab, asli raftaar (100 requests/second, 16 second, har 4 second par ek instance mara — teen run):
3 instances the      → 87.44% requests safal · 201 fail
1 instance hota toh  → 62.25–62.31% requests safal · 603–604 fail</pre>
     <p>Teen copies ne nuksaan ghataya, khatam nahi kiya. Aur dashboard par yeh "thoda sa noise" dikha — jabki asal mein har teesra grahak error dekh raha tha.</p>
     <p class="tip">👉 Agle screen par wahi raat slow motion mein: teen instances, har 0.2 second par ek request. Dekho ki instance 2 ke marne ke baad load balancer kya karta hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: teen copies, koi health check nahi ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — teen instances, ek mara',
      goal: 'Har click = ek ghatna. Do cheezein dekho: <b>load balancer ki list mein kaun-kaun hai</b>, aur <b>har request ka kya hua</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'list', label: 'Load balancer ki list' },
        { id: 'i2', label: 'Instance 2' },
        { id: 'req', label: 'Is request ka kya hua' },
        { id: 'fail', label: 'Ab tak fail' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'Teen instances: 1, 2, 3. Load balancer ke paas in teeno ki ek <b>list</b> hai, aur load balancer baari-baari bhejta hai: 1, 2, 3, 1, 2, 3…<br><br>Har 0.2 second par ek request aati hai.<br><br>Is setup mein load balancer kisi instance se kabhi nahi poochhta "theek ho?". List wahi rehti hai jo shuru mein likhi gayi thi.',
          nodes: { lb: { tone: 'ok', badge: 'list: 1 · 2 · 3' }, i1: { tone: 'ok', badge: 'chal raha hai' }, i2: { tone: 'ok', badge: 'chal raha hai' }, i3: { tone: 'ok', badge: 'chal raha hai' } },
          vars: { list: '1 · 2 · 3', i2: 'chal raha hai', req: '—', fail: '0' },
        },
        {
          clock: '0.25–0.85 s',
          say: '#1 → instance 1 ✓ · #2 → instance 2 ✓ · #3 → instance 3 ✓ · #4 → instance 1 ✓.<br><br>Sab theek.',
          flows: to(1, '#4', 'ok'),
          vars: { req: '#1–#4 ✓' },
        },
        {
          clock: '1.00 s',
          say: '💥 <b>Instance 2 mar gaya.</b> Baaki do instances theek chal rahe hain.',
          nodes: { i2: { tone: 'bad', badge: 'mar gaya' } },
          vars: { i2: '💥 mar gaya (1.00 s par)' },
          ask: {
            q: 'Agli request #5 hai, aur baari instance 2 ki hai. Kya hoga?',
            choices: [
              'Load balancer #5 ko instance 2 par hi bhejega — list mein instance 2 abhi hai, toh #5 fail',
              'Load balancer #5 ko apne aap instance 3 par bhej dega — toota connection dekh ke',
              'Load balancer #5 ko rok ke rakhega, jab tak instance 2 wapas na aa jaaye',
              'Instance 1 #5 utha lega — bacha hua instance mare hue instance ka kaam baant leta hai',
            ],
            answer: 0,
            hint: 'Load balancer ki list ko kaun badalta hai? Is setup mein koi hai?',
            explain: 'Slow motion ki line: 1.05 s #5 → instance 2 ✗ (connection toota). Load balancer ki list mein instance 2 abhi bhi hai — load balancer ko pata hi nahi ki instance 2 mar gaya.',
            choiceExplanations: [
              'Slow motion ki line: 1.05 s #5 → instance 2 ✗ (connection toota). Load balancer ki list mein instance 2 abhi bhi hai — load balancer ko pata hi nahi ki instance 2 mar gaya.',
              'Is setup mein toote connection ke baad request ko doosre instance par bhejne wala koi niyam nahi. #5 fail hi hogi.',
              'Load balancer kisi request ko rok ke nahi rakhta. Jiski baari aayi, us instance par turant bhej deta hai.',
              'Baari-baari ka niyam list se chalta hai. Instance 2 abhi list mein hai, toh #5 instance 2 par hi jaayegi.',
            ],
          },
        },
        {
          clock: '1.05–1.45 s',
          say: '#5 → instance 2 ✗.<br><br>#6 → instance 3 ✓ · #7 → instance 1 ✓.<br><br>Do requests theek gayi. Bahar se lagta hai ki sab chal raha hai.',
          flows: to(2, '#5 ✗', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'list: 1 · 2 · 3' } },
          vars: { req: '#5 ✗ · #6 ✓ · #7 ✓', fail: '1' },
        },
        {
          clock: '1.65 s',
          say: '#8 ki baari phir instance 2 ki → ✗.<br><br>Har teesri request mare hue instance par ja rahi hai.',
          flows: to(2, '#8 ✗', 'bad'),
          vars: { req: '#8 ✗', fail: '2' },
          ask: {
            q: 'Load balancer ko kab pata chalega ki instance 2 mar gaya hai?',
            choices: [
              'Kabhi nahi — is setup mein load balancer kisi instance se poochhta hi nahi; list wahi rahegi',
              'Do request fail hone ke baad — load balancer fail ginta hai aur mara instance hata deta hai',
              '1 second baad — load balancer har second apni list khud hi taaza kar leta hai',
              'Jaise hi koi grahak shikayat karega, load balancer instance 2 ko list se nikaal dega',
            ],
            answer: 0,
            hint: 'Pehle step mein likha tha: load balancer kya nahi karta?',
            explain: 'Slow motion: #11 aur #14 bhi instance 2 par gayi aur giri. Nateeje ki line: koi poochhne wala nahi — mara hua instance bhi list mein hi raha. Jab tak instance 2 khud wapas na aaye, har teesri request girti rahegi.',
            choiceExplanations: [
              'Slow motion: #11 aur #14 bhi instance 2 par gayi aur giri. Nateeje ki line: koi poochhne wala nahi — mara hua instance bhi list mein hi raha. Jab tak instance 2 khud wapas na aaye, har teesri request girti rahegi.',
              'Fail gin ke instance hatana ek alag setting hai, jo is setup mein lagi hi nahi. #5, #8, #11, #14 sab giri.',
              'Is setup mein list taaza karne wala koi timer nahi. List tab tak wahi rehti hai jab tak koi badle.',
              'Grahak ki shikayat load balancer tak pahunchti hi nahi. List badalne ka kaam kisi ko diya hi nahi gaya.',
            ],
          },
        },
        {
          clock: '3.00 s',
          say: '✅ Instance 2 khud wapas chalu ho gaya. 3.45 s par #17 → instance 2 ✓.<br><br>Kisi ne kuch theek nahi kiya. Instance bas laut aaya.',
          flows: to(2, '#17 ✓', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'list: 1 · 2 · 3' }, i2: { tone: 'ok', badge: 'wapas chalu' } },
          vars: { i2: 'wapas chalu (3.00 s par)', req: '#17 ✓', fail: '4' },
        },
        {
          clock: 'nateeja',
          say: `25 requests ka hisaab:
            <ul>
              <li><b>4 fail</b>: #5, #8, #11, #14 — har teesri.</li>
              <li>Sabse lamba lagataar fail: <b>1</b>. Kabhi do requests ek ke baad ek nahi giri.</li>
            </ul>
            Isi wajah se dashboard par yeh "thoda noise" dikhta hai: errors bikhre hue hain. Par 2 second tak <b>har teesra grahak</b> error dekh raha tha.`,
          nodes: { i2: { tone: 'slow', badge: '2 s mara raha' } },
          vars: { list: '1 · 2 · 3 — kabhi nahi badli', req: '25 mein se 4 fail', fail: '4 (har teesri)' },
        },
        {
          clock: 'ek hi instance hota toh?',
          say: 'Wahi slow motion, sirf ek instance ke saath: #5 se #14 tak <b>10 fail, lagataar</b>. Poore 2 second andhera.<br><br>Teen copies ne 10 ko 4 kiya. Par ek farak aur hai: ek instance wala andhera <b>sabko dikhta hai</b>. Teen instances wala nuksaan <b>chhup jaata hai</b>.',
          nodes: { lb: { tone: 'slow', badge: '1 instance: 10 fail' }, i1: { tone: 'idle', badge: '' }, i2: { tone: 'idle', badge: '' }, i3: { tone: 'idle', badge: '' } },
          vars: { list: 'ek instance: 10 fail · teen: 4 fail', req: '—', fail: '10 banaam 4' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi, asli raftaar par: 100 requests/second, 16 second. Har 4 second par ek instance maara gaya; instance 2 second mein wapas aata hai. (Teen run.)
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Safal</th><th>Fail</th></tr>
              <tr><td>1 instance</td><td>62.25–62.31%</td><td>603–604</td></tr>
              <tr><td>3 instances, health check nahi</td><td>87.44%</td><td>201</td></tr>
            </table></div>`,
          nodes: { lb: { tone: 'slow', badge: 'lab: 87.44% safal' }, i1: { tone: 'ok', badge: '' }, i2: { tone: 'bad', badge: 'lab: 201 fail' }, i3: { tone: 'ok', badge: '' } },
          vars: { list: 'lab: 3 instances', i2: 'lab: har 4 s par ek instance mara', req: 'lab: 87.44% safal', fail: 'lab: 201' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> copies hona kaafi nahi. Kisi ko <b>pata bhi chalna chahiye</b> ki ek copy mar gayi. Team ke paas copies thi — "pata chalna" nahi tha. Aur team ko yeh pata nahi tha.',
    },

    /* ---------------- 2. pehla ilaaj: health check, phir retry ---------------- */
    {
      type: 'dryrun',
      title: '✂️ Pehla ilaaj: health check — aadha kaam. Phir retry',
      goal: 'Wahi teen instances, wahi 1.00 s par instance 2 ka marna. Ab load balancer instances se poochhta hai. Dekho kaunsi request phir bhi giri — aur kyun.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'hc', label: 'Load balancer ne poochha: "theek ho?"' },
        { id: 'list', label: 'Load balancer ki list' },
        { id: 'req', label: 'Requests' },
        { id: 'fail', label: 'Fail (25 mein se)' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar 25 mein se 4 requests giri, kyunki load balancer ki list kabhi nahi badli. Tum is team mein ho. Sujhaav aata hai:<br><br><b>"Load balancer har 0.3 second par har instance se poochhe: theek ho? Do baar lagataar jawab na aaye, toh us instance ko list se hata do. Ek baar jawab aa jaaye, toh wapas jod lo."</b>',
          nodes: { lb: { tone: 'ok', badge: 'har 0.3 s: theek ho?' }, i1: { tone: 'ok', badge: 'chal raha hai' }, i2: { tone: 'ok', badge: 'chal raha hai' }, i3: { tone: 'ok', badge: 'chal raha hai' } },
          vars: { hc: '1 ✓ · 2 ✓ · 3 ✓', list: '1 · 2 · 3', req: '—', fail: '?' },
          ask: {
            q: 'Is sawaal (health check) se kya badlega?',
            choices: [
              'Instance 2 thodi der baad list se hatega; baad ki requests bachengi, par beech wali giregi',
              'Ab ek bhi request nahi giregi — mara hua instance usi pal list se bahar ho jaayega',
              'Health check instance 2 ko dobara chala dega, aur load balancer ki list waisi hi rahegi',
              'Kuch nahi badlega — poochhne se instance zinda nahi hota, toh requests girti rahengi',
            ],
            answer: 0,
            hint: 'Load balancer ko pata chalne mein kitna waqt lagega: turant, ya do sawaalon ke baad?',
            explain: 'Pata chalne mein waqt lagta hai: do lagataar "jawab nahi", har 0.3 s par. Us beech jo request instance 2 ki baari par aayi, wahi request giregi. Health check giri hui request ko dobara nahi bhejta — us kaam ke liye alag ilaaj chahiye.',
            choiceExplanations: [
              'Pata chalne mein waqt lagta hai: do lagataar "jawab nahi", har 0.3 s par. Us beech jo request instance 2 ki baari par aayi, wahi request giregi. Health check giri hui request ko dobara nahi bhejta — us kaam ke liye alag ilaaj chahiye.',
              'Pata chalne mein do sawaal lagte hain, har 0.3 s par. Us beech mare hue instance par gayi request giregi.',
              'Health check sirf poochhta hai, instance ko dobara nahi chalata. Instance 2 3.00 s par khud wapas aata hai.',
              'Instance zinda nahi hota, par list badal jaati hai. Hatne ke baad wali requests baaki do instances par jaati hain.',
            ],
          },
        },
        {
          clock: '1.00–1.40 s',
          say: `Instance 2 1.00 s par mara.
            <pre>1.05 s  #5  → instance 2 ✗ (connection toota)
1.10 s  🩺 health: 1 ✓ · 2 ✗ (1/2) · 3 ✓
1.40 s  🩺 health: 1 ✓ · 2 ✗ (2/2) · 3 ✓
1.40 s     → instance 2: rotation se BAHAR</pre>
            1.40 s par load balancer ki list badal gayi: ab sirf 1 aur 3.`,
          flows: to(2, '#5 ✗', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'list: 1 · 3' }, i2: { tone: 'bad', badge: 'list se bahar' } },
          vars: { hc: '1 ✓ · 2 ✗ (2/2) · 3 ✓', list: '1 · 3', req: '#5 ✗', fail: '1' },
        },
        {
          clock: '1.45–3.20 s',
          say: '#7 se #15 tak saari requests instance 1 aur instance 3 par gayi: sab ✓.<br><br>3.00 s par instance 2 wapas chalu hua. 3.20 s par health check ko jawab mila → <b>instance 2 list mein wapas</b>. 3.25 s par #16 → instance 2 ✓.',
          flows: to(3, '✓', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'list: 1 · 2 · 3' }, i2: { tone: 'ok', badge: 'list mein wapas' } },
          vars: { hc: '1 ✓ · 2 ✓ · 3 ✓', list: '1 · 2 · 3 (3.20 s se)', req: '#6–#25 ✓', fail: '1' },
        },
        {
          clock: 'nateeja',
          say: `<div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Fail (25 mein se)</th><th>Kaunsi</th></tr>
              <tr><td>3 instances, health check nahi</td><td>4</td><td>#5, #8, #11, #14</td></tr>
              <tr><td>3 instances + health check</td><td><b>1</b></td><td>#5</td></tr>
            </table></div>`,
          vars: { req: '25 mein se 1 fail', fail: '1 (pehle 4)' },
          ask: {
            q: 'Health check lag gaya. Phir bhi #5 kyun giri?',
            choices: [
              'Instance 2 1.00 s par mara, list se 1.40 s par hata — #5 beech mein, 1.05 s par gayi',
              'Health check galat instance se poochh raha tha, isliye instance 2 list mein reh gaya',
              '#5 khud ek kharab request thi — kisi bhi instance par jaati, tab bhi girti',
              'Instance 3 bhi usi waqt mar gaya tha, aur #5 instance 3 par chali gayi thi',
            ],
            answer: 0,
            hint: 'Instance 2 kab mara? List se kab hata? #5 kab aayi?',
            explain: 'Marne aur pata chalne ke beech hamesha ek khidki hoti hai. Yahan khidki 0.40 s ki thi (do sawaal, har 0.3 s par). Is khidki mein gayi requests ko health check nahi bacha sakta.',
            choiceExplanations: [
              'Marne aur pata chalne ke beech hamesha ek khidki hoti hai. Yahan khidki 0.40 s ki thi (do sawaal, har 0.3 s par). Is khidki mein gayi requests ko health check nahi bacha sakta.',
              'Health check ne sahi instance pakda: 1.40 s par instance 2 hi list se hata.',
              '#5 mein koi kharabi nahi thi. #5 mare hue instance par gayi, isliye giri.',
              'Is run mein sirf instance 2 mara. #5 instance 2 ki baari par gayi thi.',
            ],
          },
        },
        {
          clock: 'ek aur cheez: dobara koshish',
          say: `Us khidki ke liye ek aur cheez: giri hui request ko <b>ek baar agle instance par dobara bhejo</b> (retry).
            <pre>1.05 s  #5  → instance 2 ✗ (connection toota) → dobara instance 3 ✓</pre>
            #5 ka grahak kuch nahi jaan paaya. 25 mein se <b>0 fail</b>.`,
          flows: to(3, '#5 dobara', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'health check + retry' }, i2: { tone: 'bad', badge: 'mar gaya' }, i3: { tone: 'ok', badge: '#5 yahan pahunchi' } },
          vars: { hc: '1 ✓ · 2 ✗ · 3 ✓', list: '1 · 2 · 3 → 1 · 3', req: '#5 ✗ → dobara ✓', fail: '0' },
        },
        {
          clock: 'chaaron setup',
          say: `Slow motion ke chaaron setup (25 requests; instance 2 second tak mara raha):
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Fail</th><th>Sabse lamba lagataar fail</th></tr>
              <tr><td>1 instance</td><td>10</td><td>10</td></tr>
              <tr><td>3 instances, health check nahi</td><td>4</td><td>1</td></tr>
              <tr><td>3 instances + health check</td><td>1</td><td>1</td></tr>
              <tr><td>3 instances + health check + retry</td><td><b>0</b></td><td>0</td></tr>
            </table></div>`,
          nodes: { lb: { tone: 'ok', badge: 'chaar setup' }, i1: { tone: 'ok', badge: '' }, i2: { tone: 'ok', badge: '' }, i3: { tone: 'ok', badge: '' } },
          vars: { hc: '—', list: '—', req: '10 → 4 → 1 → 0', fail: '10 · 4 · 1 · 0' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi chaar setup, asli raftaar par (100 requests/second, 16 second, har 4 second par ek instance mara — teen run):
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Safal</th><th>Fail</th></tr>
              <tr><td>1 instance</td><td>62.25–62.31%</td><td>603–604</td></tr>
              <tr><td>3 instances, health check nahi</td><td>87.44%</td><td>201</td></tr>
              <tr><td>3 + health check</td><td>97.13–97.25%</td><td>44–46</td></tr>
              <tr><td>3 + health check + retry</td><td><b>100.00%</b></td><td><b>0</b></td></tr>
            </table></div>
            Chaaron setup mein instances utni hi baar mare. Farak sirf system ki tayyari ka tha.`,
          vars: { hc: 'lab: har 0.3 s', list: 'lab: 3 instances', req: 'lab: 87.44% → 100.00%', fail: 'lab: 201 → 0' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "ek mar jaaye toh kuch nahi hoga" teen cheezon se banta hai: <b>copies</b> + <b>pata chalna</b> (health check) + <b>dobara koshish</b> (retry). Team ke paas sirf pehli thi. Yeh kami raat 2 baje mili — jabki koi bhi ek instance din mein maar ke dekh leta, toh pehle mil jaati.',
    },

    /* ---------------- 3. idea: generator ---------------- */
    {
      type: 'cards',
      title: '🔌 Yeh tum dekh chuke ho — dukaan ka generator',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. "Generator hai" — par chalaya kab tha?',
          say: 'Ek clinic mein fridge hai jisme dawaiyan rakhi hain. Bijli jaaye toh fridge ke liye <b>generator</b> rakha hai. Maalik befikar hai: "generator hai."<br><br>Par generator saal bhar se chala nahi. Jis din bijli 6 ghante ke liye gayi, us din pata chala: diesel nahi hai, aur battery baith chuki hai.<br><br><b>KhanaKart mein:</b> generator = teen instances · "generator hai" = "3 copies hain" · bijli ka jaana = instance ka marna.',
        },
        {
          title: '2. Samajhdaar maalik kya karta hai?',
          say: 'Padosi clinic ka maalik har mahine ki pehli tareekh ko, <b>din ke 11 baje</b>, khud main switch gira deta hai. 5 minute ke liye.<br><br>Maalik teen cheezein dekhta hai: generator chala? Kitni der mein chala? Fridge ka taapmaan kitna badha?<br><br>Aur ek niyam: taapmaan ek hadd se upar jaaye, toh <b>turant switch wapas</b>.',
        },
        {
          title: '3. Test kab karna chahiye?',
          say: 'Socho tum maalik ho.',
          ask: {
            q: 'Din mein tum khud clinic par hote ho. Raat ko clinic band rehta hai, aur tum ghar par hote ho. Generator ka test kab karoge?',
            choices: [
              'Din mein, khud saamne khade hokar, thodi der ke liye — aur main switch wapas uthana haath mein ho',
              'Kabhi nahi — generator naya hai, aur bechne wale ne pakka kaha tha ki zaroor chalega',
              'Jab asli mein bijli jaayegi, tab apne aap pata chal jaayega ki generator chalta hai ya nahi',
              'Raat ko, jab clinic band ho aur koi mareez na ho, taaki test se kisi ko pareshani na ho',
            ],
            answer: 0,
            hint: 'Agar test mein generator na chale, toh generator ko turant kaun sambhalega? Raat ko koi hoga?',
            explain: 'Kami tab dhoondho jab tum tayyar ho: din mein, saamne khade hokar, chhoti der ke liye. Warna kami tumhe dhoondh legi — raat 2 baje.',
            choiceExplanations: [
              'Kami tab dhoondho jab tum tayyar ho: din mein, saamne khade hokar, chhoti der ke liye. Warna kami tumhe dhoondh legi — raat 2 baje.',
              'Naya hona chalne ka saboot nahi. Bina test ke pehli baar pata tab chalega jab bijli sach mein jaayegi.',
              'Tab test nahi, asli musibat hogi — aur generator na chala toh sambhalne ki taiyaari bhi nahi.',
              'Raat ko mareez nahi honge, sahi — par tum bhi nahi hoge. Generator na chala toh sambhalne wala koi nahi. Test tab karo jab tum saamne ho aur switch haath mein ho.',
            ],
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Jaan-boojh ke kuch todna, yeh dekhne ke liye ki system sambhalta hai ya nahi</td><td><b>Chaos engineering</b></td></tr>
              <tr><td>Jo cheez todi gayi (instance maarna, dheema karna)</td><td><b>Fault</b></td></tr>
              <tr><td>Aam din ka haal, number mein ("99% requests safal")</td><td><b>Steady state</b></td></tr>
              <tr><td>Todne se pehle likha andaaza ("ek instance mare, toh bhi 99% safal")</td><td><b>Hypothesis</b></td></tr>
              <tr><td>Test se zyada se zyada kitna nuksaan ho sakta hai</td><td><b>Blast radius</b></td></tr>
              <tr><td>Netflix ka tool jo production mein random instances band karta hai</td><td><b>Chaos Monkey</b></td></tr>
            </table></div>
            Chaos Monkey ke apne README ke mutabiq yeh tool production mein chalne wale instances ko random tareeke se band karta hai, taaki engineers aisi services banayein jo instance ke jaane ko seh lein. (Yeh documentation se hai; is lab mein Chaos Monkey chalaya nahi gaya.)<br><br>
            ⚠️ <b>Ek aam galatfehmi:</b> "3 copies hain toh hum safe hain." Lab: 3 copies, health check ke bina → 201 requests fail. Copies ek daava hain; saboot tab milta hai jab ek copy sach mein maar ke dekho.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jo bachav kabhi chala ke nahi dekha gaya, woh bachav nahi, ummeed hai. Bachav ko din mein, chhoti der ke liye, khud tod ke dekho — isi ka naam <b>chaos engineering</b> hai.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Din mein, jaan-boojh ke, ek instance band karna — yeh dekhne ke liye ki grahak ko kuch pata chalta hai ya nahi', right: 'Chaos engineering', explain: 'Kami ko incident se pehle dhoondhna. Slow motion mein yahi kiya: instance 2 ko 1.00 s par maara.' },
        { left: '"Instance 2 ko 2 second ke liye maar do"', right: 'Fault', explain: 'Jo cheez todi jaati hai. Instance ka marna sabse seedha fault hai; agle level mein dheema aur aadha-zinda instance bhi aayenge.' },
        { left: '"Aam din mein 100% requests safal hoti hain"', right: 'Steady state', explain: 'Aam din ka haal, number mein. Iske bina pata hi nahi chalega ki todne se kuch bigda ya nahi.' },
        { left: '"Ek instance mare, toh bhi kam se kam 99% requests safal rahengi"', right: 'Hypothesis', explain: 'Todne se pehle likha andaaza. Lab: health check ke bina yeh andaaza galat nikalta — 87.44% safal.' },
        { left: '"Is test se zyada se zyada ek instance ki requests girengi, 2 second ke liye"', right: 'Blast radius', explain: 'Test ka nuksaan kitna phail sakta hai. Chhota rakho.' },
        { left: 'Ek tool jo production mein random instances band karta rehta hai', right: 'Chaos Monkey', explain: 'Netflix ka tool. Instance ka jaana roz ki baat ban jaaye, toh har service instance ke jaane ko sehna seekh leti hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Humare paas har service ke 3 instances hain. Phir chaos testing ki kya zaroorat?"',
        choices: [
          '3 copies ek daava hain — saboot tab, jab mara instance pehchana jaaye aur giri request dobara jaaye',
          'Koi zaroorat nahi — 3 instances hain, toh ek ke jaane par baaki do sambhal hi lenge',
          'Chaos testing sirf Netflix jaisi badi companies ke liye hai, hamare jaise chhote system ke liye nahi',
          'Chaos testing se instances mazboot ho jaate hain, isliye 3 copies ke saath bhi chalana chahiye',
        ],
        answer: 0,
        explain: '3 instances ek daava hain ki ek ke jaane se kuch nahi hoga. Daava tabhi sach hai jab load balancer mare hue instance ko pehchaan le (health check), giri hui request dobara jaaye (retry, jahan dobara bhejna safe ho), aur baaki instances bojh utha sakein. Lab: 3 instances, health check nahi → 201 fail (87.44% safal). Health check ke saath → 44–46 fail. Health check + retry → 0 fail.',
        choiceExplanations: [
          '3 instances ek daava hain ki ek ke jaane se kuch nahi hoga. Daava tabhi sach hai jab load balancer mare hue instance ko pehchaan le (health check), giri hui request dobara jaaye (retry, jahan dobara bhejna safe ho), aur baaki instances bojh utha sakein. Lab: 3 instances, health check nahi → 201 fail (87.44% safal). Health check ke saath → 44–46 fail. Health check + retry → 0 fail.',
          'Lab: 3 instances, bina health check → 201 fail (87.44% safal). Copies thi, par load balancer mare hue instance ko bhi bhejta raha.',
          'Chhote system mein bhi wahi kami hoti hai. Chhota, nigrani wala prayog kisi bhi team ke liye hai.',
          'Prayog instance ko mazboot nahi karta — kami dikhata hai. Theek tum karte ho: health check, retry, capacity.',
        ],
      },
      {
        q: '"Chaos Monkey kya karta hai — aur production mein kyun?"',
        choices: [
          'Production ke chalte instances random band karta hai, taaki har service instance ka jaana seh sake',
          'Production ke errors ginta hai aur dashboard par dikhata hai, taaki team waqt par jaag jaaye',
          'Errors badhte hi production traffic ko rok deta hai, taaki system bojh se gire nahi',
          'Production ki calls mein jaan-boojh ke deri daalta hai, taaki dheemi dependency ka asar dikhe',
        ],
        answer: 0,
        explain: 'Chaos Monkey ke README ke mutabiq Chaos Monkey production ke instances ko random tareeke se terminate karta hai. Maqsad: instance ka jaana itni aam baat ban jaaye ki har team apni service aisi banaye jo instance ke jaane ko seh le. Production mein isliye, kyunki asli traffic, asli settings aur asli dependencies wahin hoti hain. Shuruaat phir bhi staging se, aur chhote daayre se karo (level 4).',
        choiceExplanations: [
          'Chaos Monkey ke README ke mutabiq Chaos Monkey production ke instances ko random tareeke se terminate karta hai. Maqsad: instance ka jaana itni aam baat ban jaaye ki har team apni service aisi banaye jo instance ke jaane ko seh le. Production mein isliye, kyunki asli traffic, asli settings aur asli dependencies wahin hoti hain. Shuruaat phir bhi staging se, aur chhote daayre se karo (level 4).',
          'Errors ginna monitoring ka kaam hai. Chaos Monkey kuch ginta nahi — instance band karta hai.',
          'Traffic rokna rate limiting ya load shedding ka kaam hai. Chaos Monkey instance band karta hai.',
          'Deri daalna bhi kaam ka fault hai, par Chaos Monkey ka kaam sirf instance band karna hai.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki 3 copies ke bawajood har teesri request kyun giri',
    'Health check kya bachata hai, kaunsi khidki chhod deta hai, aur retry us khidki ka kya karta hai',
    'Chaos engineering, fault, steady state, hypothesis, blast radius aur Chaos Monkey ko pehchaan sakte ho',
  ],
  cards: [
    { front: '3 copies, health check nahi — kya hota hai?', back: 'Load balancer ki list nahi badalti: mare hue instance ko bhi har teesri request. Slow motion: 25 mein se 4 fail, bikhre hue. Lab: 201 fail (87.44% safal).' },
    { front: 'Health check kya nahi bacha sakta?', back: 'Marne aur pata chalne ke beech ki khidki. Slow motion: instance 2 1.00 s par mara, list se 1.40 s par hata → #5 giri. Us khidki ke liye retry: 0 fail.' },
    { front: '"Ek mar jaaye toh kuch nahi hoga" kis-kis se banta hai?', back: '<b>Copies</b> + <b>pata chalna</b> (health check) + <b>dobara koshish</b> (retry). Lab: 603–604 → 201 → 44–46 → 0 fail.' },
    { front: 'Chaos engineering ek line mein?', back: 'Jaan-boojh ke, din mein, chhote daayre mein kuch todna — taaki kami incident se pehle mile. Generator ko har mahine chala ke dekhna.' },
  ],
},
]);

})();
