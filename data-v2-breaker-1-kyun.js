/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: CIRCUIT BREAKER (paanch chhote levels)
     1 Kyun    → samasya pehle (yeh file)          2 Kaise   → andar ka dry run
     3 Code    → asli code, ek-ek line             4 Library → asli library (opossum) + settings
     5 Kab     → kab lagayein / kab nahi + galtiyan
   Har number docker-labs/38-circuit-breaker ke asli run se hai (us folder ka README dekho).
   Source video (credit): Software Developer Diaries — "How to use a Circuit Breaker to make your API more resilient?"
   Core track ka purana `breaker` level (resil) apni jagah hai. Track: data-v2-00-tracks.js.
   ===================================================================== */
(function () {

/* teen dabbe: Asha ka phone → app-api → recs-service */
const NODES = [
  { id: 'phone', icon: '📱', label: 'Asha', x: 115, y: 105 },
  { id: 'api', icon: '🧩', label: 'app-api', x: 440, y: 105 },
  { id: 'recs', icon: '🎯', label: 'recs-service', x: 760, y: 105 },
];
const EDGES = [{ from: 'phone', to: 'api' }, { from: 'api', to: 'recs' }];
const VIZ = { w: 890, h: 215 };
const FREE4 = ['free', 'free', 'free', 'free'];
const STUCK4 = ['busy:#5', 'busy:#6', 'busy:#7', 'busy:#8'];

VISUALS['cb-kyun'] = {
  t: 'KhanaKart: ek latki service, aur app-api ke charon workers atke',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { phone: { tone: 'bad', badge: 'profile nahi khula' }, api: { tone: 'busy', badge: '4/4 workers atke' }, recs: { tone: 'bad', badge: 'har call 5 s' } },
    flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'bad' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'cb-kyun',
  icon: '🔥',
  group: '🔌 Circuit Breaker',
  title: 'Breaker 1 · Kyun — ek latki service ne poora app kaise giraya',
  badge: 'Cascade Jasoos',
  objectives: [
    'Recommendations dheemi hui — toh <b>profile</b> kyun band hua?',
    'Timeout lagaya, app bach gaya. Phir bhi kaunsi dikkat bachi?',
    'Ghar ka MCB kya karta hai — aur software mein wahi cheez kya hai?',
    'CLOSED / OPEN / HALF-OPEN: kaunsa naam kis haal ka hai (naam ulte lagte hain)',
  ],
  lesson: [
    `<h3>🍛 Shukravar raat 8:14, KhanaKart</h3>
     <p>KhanaKart ek food-delivery app hai. Dinner ka peak chal raha hai: har minute <b>200 orders</b>, ek order ausatan <b>₹350</b>.</p>
     <p>8:14 par home screen ka ek chhota dabba dheema ho jaata hai: <b>"Tumhare liye"</b> (recommendations). Sirf recommendations ka dabba.</p>
     <p>8:15 par shikayatein aane lagti hain: <b>profile nahi khul raha, order nahi lag raha, login atka hai.</b> Poora app band — 6 minute tak.</p>
     <pre>200 orders/minute × ₹350 × 6 minute = ₹4,20,000 ke orders gaye</pre>
     <p>Recommendations ka dabba <b>na</b> dikhe, tab bhi order lag sakta hai. Phir ek dabbe ne poora app kaise giraya?</p>
     <p class="tip">👉 Abhi koi theory nahi. Agle screen par wahi kahani <b>slow motion</b> mein chalegi — ek click, ek ghatna. Jawab tum khud dekhoge.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya, slow motion mein ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — bina kisi bachav ke',
      goal: 'Har click = ek ghatna (ek request aayi, ya waqt beeta). Us ghatna se jo badla, woh peele rang mein chamkega. Dekho ki <b>app-api</b> ke workers kahan phanste hain — aur Asha ka profile kyun nahi khulta.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'workers', label: 'app-api ke 4 workers' },
        { id: 'line', label: 'Line mein khadi requests' },
        { id: 'hung', label: 'recs-service par latki calls' },
        { id: 'asha', label: 'Asha ke phone par' },
      ],
      steps: [
        {
          clock: '0.0 s',
          say: 'Sab theek chal raha hai. Phone <code>/home</code> maangta hai. app-api ka ek <b>worker</b> yeh request uthata hai, recs-service se recommendations laata hai, aur <b>24 ms</b> mein jawab de deta hai. Worker phir khaali.<br><br><b>Worker</b> = ek haath jo ek waqt mein ek hi request sambhalta hai. Is slow motion mein app-api ke paas sirf <b>4 workers</b> hain (asli service mein 20–200), taaki har worker dikhe.',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'ok' }, { from: 'api', to: 'recs', label: '/recs', tone: 'ok' }],
          nodes: { api: { tone: 'ok', badge: 'jawab 24 ms mein' }, recs: { tone: 'ok', badge: 'theek' } },
          vars: { workers: FREE4, line: 'koi nahi', hung: '0', asha: 'abhi kuch nahi' },
        },
        {
          clock: '0.8 s',
          say: 'recs-service <b>latak</b> jaati hai. recs-service error nahi deti — bas har <code>/recs</code> call par <b>5 second</b> leti hai. app-api ko abhi kuch pata nahi.',
          nodes: { api: { tone: 'idle', badge: '' }, recs: { tone: 'bad', badge: 'har call 5 s' } },
        },
        {
          clock: '1.0 s',
          say: '<b>#5</b> <code>/home</code> aati hai. Worker 1 recs-service ko call karta hai aur <b>jawab ka intezaar</b> karta hai. Koi time limit nahi hai, isliye worker 1 poore 5 second yahin khada rahega.',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'acc' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          nodes: { api: { tone: 'busy', badge: '1/4 worker atka' } },
          vars: { workers: ['busy:#5', 'free', 'free', 'free'], hung: '1' },
        },
        {
          clock: '2.5 s',
          say: '<b>#6, #7, #8</b> — teen aur <code>/home</code>. Har request ko ek worker milta hai, aur har worker recs-service ke jawab ke intezaar mein khada ho jaata hai. <b>Charon workers gaye.</b>',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'acc' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          nodes: { api: { tone: 'busy', badge: '4/4 workers atke' } },
          vars: { workers: STUCK4, hung: '4' },
        },
        {
          clock: '3.0 s',
          say: '<b>#9</b> <code>/home</code> aati hai. Koi worker khaali nahi. #9 <b>line</b> mein khadi ho jaati hai.',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'acc' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          vars: { line: ['wait:#9'] },
        },
        {
          clock: '3.5 s',
          say: 'Ab Asha apna profile kholti hai. <code>/profile</code> ko recs-service se <b>koi matlab nahi</b> — <code>/profile</code> app-api ka apna 5 ms ka kaam hai.',
          flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'acc' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          ask: {
            q: 'Asha ke /profile ka kya hoga?',
            choices: [
              'Line mein khada rahega — /profile ko bhi ek worker chahiye, aur charon workers recs-service ke intezaar mein atke hain',
              '5 ms mein jawab mil jaayega — /profile recs-service ko call hi nahi karta',
              'app-api turant "404 Not Found" dega',
              'recs-service khud /profile ka jawab de degi',
            ],
            answer: 0,
            hint: 'Socho: /profile ko chalane ke liye app-api ke andar kya chahiye? Upar "app-api ke 4 workers" wali line dekho.',
            explain: '<code>/profile</code> aur <code>/home</code> <b>ek hi service</b> (app-api) ke andar hain, isliye dono <b>ek hi worker pool</b> se worker lete hain. Pool mein koi worker khaali nahi → <code>/profile</code> bhi line mein.',
          },
        },
        {
          clock: '3.5 s',
          say: 'Line: pehle #9, phir Asha. Asha ke phone par loader ghoom raha hai. <code>/profile</code> ka kaam 5 ms ka hai — par kaam shuru hi nahi hua.',
          flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'slow', stuck: true }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          vars: { line: ['wait:#9', 'wait:Asha'], asha: '⏳ loader ghoom raha hai' },
        },
        {
          clock: '5.0 s',
          say: '<b>#10, #11, #12</b> bhi aati hain. Teeno line mein. Line ab <b>5</b> lambi hai, aur charon workers abhi bhi wahin atke hain.',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'slow', stuck: true }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          vars: { line: ['wait:#9', 'wait:Asha', 'wait:#10', 'wait:#11', 'wait:#12'] },
        },
        {
          clock: '5.5 s',
          say: 'Asha ka phone 2 second intezaar karta hai, phir haar maan leta hai. Asha ko <b>error</b> dikhta hai.<br><br><b>5 ms ka kaam 2000 ms mein bhi nahi hua</b> — jabki <code>/profile</code> ke code mein koi kharabi nahi thi.',
          flows: [{ from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          nodes: { phone: { tone: 'bad', badge: 'error · 2000 ms baad' } },
          vars: { asha: '❌ "Kuch gadbad hai. Dobara try karein."' },
        },
        {
          clock: '6.1 s',
          say: 'recs-service 5.6 s par theek ho gayi. 6.0 s par worker 1 ko #5 ka jawab milta hai — poore <b>5006 ms</b> baad. Worker 1 khaali hote hi poori line 0.1 second mein nipat jaati hai.<br><br>#9 ko jawab <b>3027 ms</b> baad mila: 3 second line mein, 25 ms ka kaam. Asha ki request bhi chali — par Asha ja chuki thi. app-api ne aisa jawab banaya jise lene wala koi nahi tha.',
          flows: [{ from: 'api', to: 'recs', label: '/recs', tone: 'ok' }],
          nodes: { api: { tone: 'slow', badge: '3/4 workers abhi bhi atke' }, recs: { tone: 'ok', badge: '5.6 s par theek' } },
          vars: { workers: ['free', 'busy:#6', 'busy:#7', 'busy:#8'], line: 'koi nahi', hung: '3' },
        },
        {
          clock: 'asli raftaar',
          say: `Yeh slow motion tha: 4 workers, 18 requests. Lab mein wahi kahani <b>asli raftaar</b> par chalayi — 20 workers, har second 50 <code>/home</code> + 50 <code>/profile</code>, recs-service 6 second latki:
            <ul>
              <li><code>/profile</code> (jise recs-service se koi matlab nahi): 600 mein se <b>360 requests fail</b>.</li>
              <li>Jo <code>/profile</code> requests safal hui, unmein har 100 mein se 1 ko <b>9.2 second</b> ya zyada lage.</li>
              <li>recs-service 8 s par theek ho gayi. 12 s ke run ke ant tak <code>/home</code> par live jawab <b>nahi lauta</b>.</li>
            </ul>`,
          nodes: { phone: { tone: 'bad', badge: '360 / 600 fail' }, api: { tone: 'bad', badge: '20/20 workers atke' }, recs: { tone: 'bad', badge: '6 s latki' } },
          flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'bad' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          vars: { workers: 'lab mein 20 — sab atke', line: '200 tak (isse lambi → 503)', hung: '20 tak (jitne workers)', asha: '❌ 600 mein se 360 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> recs-service ne app-api ko error dekar nahi giraya. recs-service ne app-api ke <b>workers pakad liye</b>.<br>Jis cheez ki ginti seemit hai (workers, database connections, memory) aur jo kisi dheeme jawab ke intezaar mein atki hai — wahi cheez poori service ko le doobti hai.<br>Ek service ki bimaari ka is tarah doosri service mein phailna: <b>cascading failure</b>.',
    },

    /* ---------------- 2. pehla ilaaj: timeout ---------------- */
    {
      type: 'dryrun',
      title: '⏱️ Pehla ilaaj: time limit — aadha kaam',
      goal: 'Wahi 18 requests, par ab ek niyam ke saath. Dekho kaun bachta hai — aur kaun nahi.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'workers', label: 'app-api ke 4 workers' },
        { id: 'hung', label: 'recs-service par latki calls' },
        { id: 'sent', label: 'Latki recs-service ko bheji calls' },
        { id: 'asha', label: 'Asha ke phone par' },
      ],
      steps: [
        {
          clock: '0.8 s',
          say: 'Wahi kahani dobara: recs-service 0.8 s par latak gayi. Pichhli baar charon workers 5-5 second atke rahe. Tum is team mein ho.',
          nodes: { api: { tone: 'idle' }, recs: { tone: 'bad', badge: 'har call 5 s' } },
          vars: { workers: FREE4, hung: '0', sent: '0', asha: 'abhi kuch nahi' },
          ask: {
            q: 'Sabse seedha pehla ilaaj kya lagaoge?',
            choices: [
              'Time limit: recs-service 300 ms mein jawab na de toh worker intezaar chhod de',
              'Workers 4 se 400 kar do',
              'Recommendations ka feature hi hata do',
              'Jab bhi app atke, app-api restart kar do',
            ],
            answer: 0,
            hint: 'Worker 5 second kyun khada raha? Kyunki use rokne wala koi niyam nahi tha.',
            explain: 'Is time limit ka naam <b>timeout</b> hai. (400 workers sirf thoda waqt khareedte hain: har second 100 latakti calls aayein toh 400 workers 4 second mein bhar jaayenge.)',
          },
        },
        {
          clock: '1.0 s',
          say: '<b>#5</b> <code>/home</code>: worker 1 recs-service ko call karta hai. Naya niyam: sirf <b>300 ms</b> intezaar.',
          flows: [{ from: 'phone', to: 'api', label: '/home', tone: 'acc' }, { from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          nodes: { api: { tone: 'busy', badge: 'worker 1: 300 ms tak' } },
          vars: { workers: ['busy:#5', 'free', 'free', 'free'], hung: '1', sent: '1' },
        },
        {
          clock: '1.3 s',
          say: '300 ms poore, jawab nahi aaya. Worker 1 <b>intezaar chhod deta hai</b>, pichhli baar ki recommendations (cache) bhej deta hai, aur khaali ho jaata hai. User ko home screen <b>305 ms</b> mein mil gaya.<br><br>👀 Ek cheez nahi badli: "recs-service par latki calls" abhi bhi <b>1</b> hai.',
          flows: [{ from: 'api', to: 'phone', label: 'cache se', tone: 'ok' }],
          nodes: { api: { tone: 'ok', badge: 'worker 1 khaali' } },
          vars: { workers: FREE4 },
        },
        {
          clock: '3.5 s',
          say: '<b>#6, #7, #8, #9</b> ke saath yahi hua: har baar 300 ms, phir cache. Ab Asha ka <code>/profile</code>: <b>9 ms</b> mein khul gaya. ✅ app-api bach gaya.',
          flows: [{ from: 'phone', to: 'api', label: '/profile', tone: 'ok' }],
          nodes: { phone: { tone: 'ok', badge: 'profile 9 ms mein' }, api: { tone: 'ok', badge: '0/4 workers atke' } },
          vars: { hung: '5', sent: '5', asha: '✅ profile khul gaya (9 ms)' },
          ask: {
            q: 'Workers khaali hain, profile chal raha hai. Phir "recs-service par latki calls" 5 kyun hai?',
            choices: [
              'app-api ne sirf intezaar chhoda hai, call wapas nahi li. recs-service un paanchon calls par abhi bhi kaam kar rahi hai — aur app-api har nayi /home par ek aur call bhej deta hai',
              'Ginti galat hai, asal mein 0 hai',
              'Yeh Asha ke phone ki calls hain',
              'Timeout ne recs-service ko theek kar diya, yeh purani ginti hai',
            ],
            answer: 0,
            hint: 'Timeout kiske andar chalta hai — app-api ke, ya recs-service ke?',
            explain: 'Timeout sirf <b>bulaane wale</b> (app-api) ko azaad karta hai. Jise bulaya gaya (recs-service), uske liye kaam chalta rehta hai — aur naya kaam aata rehta hai.',
          },
        },
        {
          clock: '5.0 s',
          say: '<b>#10, #11, #12</b>: teen aur calls bimaar recs-service par. Ab recs-service par ek saath <b>8</b> calls latki hain.<br><br>Aur har <code>/home</code> user ne 300 ms khoye — sirf yeh jaanne ke liye ki recs-service <b>abhi bhi</b> bimaar hai.',
          flows: [{ from: 'api', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
          nodes: { recs: { tone: 'bad', badge: '8 calls latki' } },
          vars: { hung: '8', sent: '8' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi do tareeke asli raftaar par (20 workers, 100 requests/second, recs-service 6 second latki):
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>/profile fail</th><th>Latki recs-service ko calls</th><th>recs-service giri</th></tr>
              <tr><td>Koi bachav nahi</td><td>360 / 600</td><td>41</td><td>0 baar</td></tr>
              <tr><td>Sirf timeout (300 ms)</td><td><b>0 / 600</b></td><td><b>300</b></td><td><b>3 baar</b></td></tr>
            </table></div>
            Timeout ne app-api ko bachaya. Par zinda app-api ne latki recs-service par <b>7 guna</b> zyada calls phenki — aur recs-service is bojh se 3 baar <b>poori gir gayi</b> (latakna → band).`,
          nodes: { phone: { tone: 'ok', badge: '0 / 600 fail' }, api: { tone: 'ok', badge: 'bach gaya' }, recs: { tone: 'bad', badge: '300 calls · 3 baar giri' } },
          flows: [{ from: 'api', to: 'recs', label: '/recs', tone: 'bad' }],
          vars: { workers: 'lab mein 20 — khaali', hung: 'bahut — isi bojh se giri', sent: '300 (bina timeout: 41)', asha: '✅ 600 mein se 0 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> timeout <b>bulaane wale</b> ko bachata hai, <b>bimaar service</b> ko nahi. Aur har user abhi bhi 300 ms barbaad karta hai.<br>Agla sawaal apne aap banta hai: jab pichhli kai calls fail ho chuki hain, toh agli call <b>bhejni hi kyun</b>?',
    },

    /* ---------------- 3. idea: ghar ka MCB ---------------- */
    {
      type: 'cards',
      title: '🏠 Yeh cheez tumhare ghar mein lagi hai — MCB',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayega.',
      steps: [
        {
          title: '1. MCB kab girta hai?',
          say: 'Geyser mein short circuit hota hai. Taar mein hadd se zyada current daudta hai. Meter ke paas laga <b>MCB</b> (chhota switch) <b>khud gir jaata hai</b>.<br><br>Kyun? Taaki geyser ki kharabi poore ghar ki wiring na jala de.<br><br><b>KhanaKart mein:</b> geyser = recs-service · wiring = app-api ke workers.',
        },
        {
          title: '2. MCB girne ke baad kya hota hai?',
          say: 'Geyser ki line mein bijli <b>band</b>. Koi baar-baar current bhej ke nahi dekhta ki "ab chala kya?". Pankha, light, fridge — baaki ghar chalta rehta hai.<br><br><b>KhanaKart mein:</b> recs-service ko calls band. Home screen par pichhli baar ki recommendations (cache). Profile, order, login — sab chalte rehte hain.',
        },
        {
          title: '3. Bijli wapas kaise aati hai?',
          say: 'Thodi der baad tum MCB uthate ho — <b>ek baar, dekhne ke liye</b>. Geyser abhi bhi kharab → MCB phir gir jaata hai. Geyser theek → bijli chalu.<br><br><b>Ek farq:</b> ghar ka MCB tum haath se uthate ho. Software wala switch <b>timer se khud</b> ek-do "test calls" bhejta hai.',
          ask: {
            q: 'recs-service 10 minute se latki hai, switch gira hua hai. Sahi tareeka kya hai?',
            choices: [
              'Har 30 second par ek-do test calls bhejo. Jawab aaya → switch upar. Jawab nahi aaya → 30 second aur ruko',
              'Har user ki request bhej ke dekho — shayad ab chal jaaye',
              'Jab tak koi engineer na bole, recs-service ko kabhi call mat karo',
              'app-api ko restart kar do',
            ],
            answer: 0,
            hint: 'Do cheezein chahiye: bimaar service par bojh na pade, aur service ke theek hote hi pata bhi chal jaaye.',
            explain: 'Har request bhejna = timeout wali purani dikkat. Kabhi na bhejna = recs-service theek hone ke baad bhi users ko purana data. Beech ka raasta: <b>thodi-thodi der mein ek test</b>.',
          },
        },
        {
          title: '4. Is switch ke teen haal — aur unke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Haal</th><th>Calls ka kya hota hai</th><th>Naam</th></tr>
              <tr><td>Switch juda hua, sab normal</td><td>ja rahi hain; har nateeja gina ja raha hai</td><td><b>CLOSED</b></td></tr>
              <tr><td>Switch gira hua</td><td>ruki hain; user ko turant cache</td><td><b>OPEN</b></td></tr>
              <tr><td>Test chal raha hai</td><td>sirf 1–3 test calls jaati hain</td><td><b>HALF-OPEN</b></td></tr>
            </table></div>
            ⚠️ <b>Naam ulte lagte hain.</b> "OPEN" sunke lagta hai "khula = chalu". Bijli mein ulta hai: circuit OPEN = <b>taar kata hua</b> = current band.<br><br>
            Is poore switch ka naam: <b>circuit breaker</b>.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jab pata chal chuka hai ki saamne wali service bimaar hai, toh <b>poochhna band karo</b>, user ko turant kuch aur de do (fallback), aur thodi der baad <b>ek baar</b> poochh ke dekho.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Haal aur naam jodo',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'recs-service ko calls ja rahi hain, aur har nateeja gina ja raha hai', right: 'CLOSED', explain: 'CLOSED = switch juda hua = current (calls) beh rahi hain. Normal haal.' },
        { left: 'recs-service ko ek bhi call nahi ja rahi; har user ko 2 ms mein cache mil raha hai', right: 'OPEN', explain: 'OPEN = taar kata hua = calls band. "Khula" matlab chalu nahi — ulta.' },
        { left: 'Sirf 2 test calls gayi hain, baaki sab ruki hain', right: 'HALF-OPEN', explain: 'HALF-OPEN = MCB ko ek baar utha ke dekhna. Test pass → CLOSED, fail → phir OPEN.' },
        { left: 'Worker ne 300 ms intezaar kiya, phir chhod diya', right: 'Timeout', explain: 'Timeout sirf bulaane wale ko azaad karta hai. Agli request phir bhi bimaar service ko call karegi.' },
        { left: 'recs-service nahi boli, toh pichhli baar ki recommendations dikha di', right: 'Fallback', explain: 'Fallback = jab asli jawab na mile toh user ko kya doge. Iske bina breaker sirf "tez error" hai.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Recommendation service dheemi hui aur hamara login bhi band ho gaya. Login toh recommendations use hi nahi karta. Kaise?"',
        choices: [
          'Login aur home ek hi service ke worker pool se chalte hain. Dheemi calls ne saare workers pakad liye, login ko worker mila hi nahi. Ilaaj: timeout + circuit breaker + fallback',
          'Login ke code mein bug hoga',
          'Database down ho gaya hoga',
          'Network slow hoga',
        ],
        answer: 0,
        explain: 'Lab: bina bachav ke <code>/profile</code> (jise dependency se matlab nahi) ki 600 mein se 360 requests fail. Wajah seemit workers ka ek hi pool hai, na ki login ka code.',
      },
      {
        q: '"Humne timeout laga diya hai. Circuit breaker ki kya zaroorat?"',
        choices: [
          'Timeout sirf caller ko chhudata hai. Caller phir bhi har request par bimaar service ko call karta hai, aur har user timeout jitna waqt khota hai. Breaker un calls ko bhejta hi nahi',
          'Koi zaroorat nahi — timeout kaafi hai',
          'Breaker timeout se tez chalta hai',
          'Breaker ke bina cache nahi chalta',
        ],
        answer: 0,
        explain: 'Lab: sirf timeout → bimaar service par 300 calls, service 3 baar giri. Timeout + breaker → 30 calls, 0 baar giri.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki ek dheemi dependency doosre endpoints ko kaise girati hai (workers atakte hain)',
    'Timeout kisko bachata hai aur kisko nahi — number ke saath',
    'CLOSED / OPEN / HALF-OPEN ko bina uljhe pehchaan sakte ho',
  ],
  cards: [
    { front: 'Dheemi dependency poori service kaise girati hai?', back: 'Error se nahi — <b>workers pakad ke</b>. Har latki call ek worker ko rok leti hai; pool khaali nahi → jin endpoints ko us dependency se matlab nahi, woh bhi line mein. Lab: /profile 360/600 fail.' },
    { front: 'Timeout kisko bachata hai, kisko nahi?', back: 'Bulaane wale ko bachata hai (workers 300 ms mein azaad). Bimaar service ko nahi — calls jaati rehti hain. Lab: 41 → 300 calls, service 3 baar giri.' },
    { front: 'Circuit OPEN ka matlab?', back: 'Taar kata hua = calls <b>band</b>. (CLOSED = calls ja rahi hain. HALF-OPEN = sirf test calls.) Naam ulte lagte hain.' },
    { front: 'Breaker ka idea ek line mein?', back: 'Bimaar service ko poochhna band karo, user ko turant fallback do, aur thodi der baad ek baar poochh ke dekho. Ghar ka MCB.' },
  ],
},
]);

})();
