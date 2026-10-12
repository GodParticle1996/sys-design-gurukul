/* =====================================================================
   🛡️ Playlist · 1 Resilience — Circuit Breaker · level 4: LIBRARY
   Wahi breaker, par npm ki asli library (opossum) se: settings ke asli naam, asli run mein library
   kahan alag chali, wahi paanch sawaal resilience4j aur Istio mein, aur default settings ka jaal.
   Code ka tukda ASLI file se hai (docker-labs/38-circuit-breaker/tools/opossum.js) — validate.js use byte-for-byte milata hai.
   Har number us folder ke asli run se hai (README dekho). Library ke naam aur defaults: opossum 10.0.0 ka source,
   resilience4j aur Istio ke official docs.
   ===================================================================== */
(function () {

const NODES = [
  { id: 'fn', icon: '🧩', label: 'fetchRecs()', x: 130, y: 105 },
  { id: 'lib', icon: '📦', label: 'opossum', x: 450, y: 105 },
  { id: 'recs', icon: '🎯', label: 'recs-service', x: 760, y: 105 },
];
const EDGES = [{ from: 'fn', to: 'lib' }, { from: 'lib', to: 'recs' }];

VISUALS['cb-lib'] = {
  t: 'Library tumhare function ko lapet leti hai: allow() aur record() library ke andar chale jaate hain',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { fn: { tone: 'ok', badge: 'breaker ki ek line nahi' }, lib: { tone: 'acc', badge: 'allow + record andar' }, recs: { tone: 'bad', badge: 'latki hai' } },
    flows: [{ from: 'fn', to: 'lib', label: 'fire()', tone: 'acc' }, { from: 'lib', to: 'recs', label: '/recs', tone: 'slow', stuck: true }],
  }, { w: 890, h: 215 }),
};

/* tools/opossum.js ki line 12–28 — dono dry runs yahi tukda dikhate hain */
const OPOSSUM_CODE = {
  title: 'docker-labs/38-circuit-breaker/tools/opossum.js',
  file: 'docker-labs/38-circuit-breaker/tools/opossum.js',
  from: 12,
  text: `async function fetchRecs() {                            // sirf asli kaam — is function mein breaker ki ek bhi line nahi
  const res = await fetch(B + '/recs');
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return (await res.json()).recs;
}

const breaker = new CircuitBreaker(fetchRecs, {
  timeout: 300,                     // 300 ms mein jawab nahi → failure
  errorThresholdPercentage: 50,     // window mein 50% se ZYADA fail → OPEN
  volumeThreshold: 6,               // window mein kam se kam 6 calls ho, tabhi faisla
  rollingCountTimeout: 10000,       // window = pichhle 10 second (calls ki ginti nahi — WAQT)
  rollingCountBuckets: 10,
  resetTimeout: 2000,               // OPEN ke 2 s baad HALF-OPEN: EK trial call
  errorFilter: err => err.status >= 400 && err.status < 500,     // 4xx = client ki galti: breaker ke liye failure mat gino
});
breaker.fallback(() => lastGood);   // call roki gayi ya fail hui → pichhla accha jawab
breaker.on('success', recs => { lastGood = recs; });`,
};

SD.registerLevels('sdd-resil', [
{
  id: 'cb-lib',
  icon: '📦',
  group: '🔌 Circuit Breaker',
  title: 'Breaker 4 · Library — asli project mein setup (opossum)',
  badge: 'Setting Shilpkar',
  objectives: [
    'Library lagane par <code>allow()</code> aur <code>record()</code> kahan chale jaate hain?',
    'Tumhari paanch settings library mein <b>kis naam se</b> milti hain?',
    'Settings wahi thi — phir library do call <b>der se</b> kyun khuli?',
    'Library ke <b>default</b> settings par bharosa kyun nahi?',
  ],
  lesson: [
    `<h3>📦 Wahi settings. Wahi 16 calls. Alag nateeja.</h3>
     <p>KhanaKart ki team ne socha: apna breaker kyun sambhalein? npm par library hai — <b>opossum</b>.</p>
     <p>Team ne opossum mein wahi settings daali jo haath ke breaker mein thi: 300 ms time limit, 50%, kam se kam 6 calls, 2 second OPEN. Phir wahi 16 calls chalayi:</p>
     <pre>haath ka breaker:  call #7 par OPEN  ·  latki recs-service tak 4 calls
opossum:           call #9 par OPEN  ·  latki recs-service tak 5 calls</pre>
     <p>Settings ek jaisi dikhti hain. Phir do call ka farq kahan se aaya?</p>
     <p class="tip">👉 Is level mein: pehle library ka code, ek-ek line (tumhari paanch settings library mein kis naam se hain). Phir asli run, jahan farq pakda jaayega. Aakhir mein: library ke <b>default</b> settings ka jaal.</p>`,
  ],
  stages: [
    /* ---------------- 1. library ka code, line by line ---------------- */
    {
      type: 'dryrun',
      title: '📦 Wahi kaam, asli library se — tools/opossum.js',
      goal: 'Library mein <code>allow()</code> aur <code>record()</code> likhne nahi padte. Dekho kaise. Har click par ek option line chamkegi, aur table mein tumhari setting ke saamne library ka naam bharega.',
      code: OPOSSUM_CODE,
      vars: [
        { id: 'limit', label: 'Time limit' },
        { id: 'rate', label: 'Kitna fail = OPEN' },
        { id: 'min', label: 'Kam se kam kitni calls' },
        { id: 'win', label: 'Kitni calls dekhun (window)' },
        { id: 'open', label: 'OPEN kitni der' },
        { id: 'trial', label: 'Trial calls' },
        { id: 'what', label: 'Kya failure ginun' },
        { id: 'fb', label: 'Fallback' },
      ],
      steps: [
        {
          line: [12, 13, 14, 15, 16, 18],
          say: `Pehle <code>fetchRecs</code> dekho (line 12–16). Isme <b>breaker ki ek bhi line nahi</b>: sirf fetch, status check, jawab.<br><br>
            Line 14 ek kaam karti hai: <code>fetch</code> 404 ya 503 par error nahi phenkta. Isliye line 14 khud error phenkti hai, aur <code>status</code> uske saath chipka deti hai.<br><br>
            Line 18: library is function ko <b>lapet</b> leti hai: <code>new CircuitBreaker(fetchRecs, {…})</code>. <code>allow</code> aur <code>record</code> library ke andar hain. File mein neeche (line 56) <code>breaker.fire()</code> hamare <code>getRecs()</code> ki jagah bulaya jaata hai.<br><br>
            Neeche table mein har setting ke saamne hamari class ki value likhi hai. Library ke naam ek-ek karke bharenge.`,
          vars: {
            limit: '<code>AbortSignal.timeout(300)</code> → opossum: ?',
            rate: '<code>failRate</code> 0.5 → opossum: ?',
            min: '<code>minCalls</code> 6 → opossum: ?',
            win: '<code>windowSize</code> 6 → opossum: ?',
            open: '<code>openMs</code> 2000 → opossum: ?',
            trial: '<code>trials</code> 2 → opossum: ?',
            what: 'mini.js line 14: <code>!res || status &gt;= 500</code> → opossum: ?',
            fb: '<code>lastGood</code> (mini.js line 11, 16, 17) → opossum: ?',
          },
        },
        {
          line: 19,
          say: `Line 19: <code>timeout: 300</code>.<br><br>
            Sawaal: <b>time limit kitna?</b> 300 ms mein jawab nahi → failure.<br><br>
            Hamare mini.js mein time limit breaker class mein nahi tha. Fetch ke andar tha: <code>AbortSignal.timeout(300)</code>. Library time limit ko apne option mein le leti hai. Isliye <code>fetchRecs</code> (line 13) mein koi time limit nahi.`,
          vars: { limit: '<code>AbortSignal.timeout(300)</code> → opossum: <b>timeout: 300</b>' },
        },
        {
          line: 20,
          say: `Line 20: <code>errorThresholdPercentage: 50</code>.<br><br>
            Sawaal: <b>kitna fail hone par OPEN?</b> Hamari class mein <code>failRate: 0.5</code> tha.<br><br>
            Ek farq dhyaan se: hamari class <b>50% ya zyada</b> par khulti hai (<code>&gt;=</code>). opossum <b>50% se ZYADA</b> par khulti hai (<code>&gt;</code>). Barabar par nahi.`,
          vars: { rate: '<code>failRate</code> 0.5 (<code>&gt;=</code>) → opossum: <b>errorThresholdPercentage: 50</b> (sirf <code>&gt;</code>)' },
        },
        {
          line: 21,
          say: `Line 21: <code>volumeThreshold: 6</code>.<br><br>
            Sawaal: <b>kam se kam kitni calls ke baad faisla?</b> Hamari class mein <code>minCalls: 6</code> tha (line 37 ka <code>enough</code>).<br><br>
            6 se kam calls hon toh opossum kitna bhi fail dikhe, breaker nahi kholta.`,
          vars: { min: '<code>minCalls</code> 6 → opossum: <b>volumeThreshold: 6</b>' },
        },
        {
          line: [22, 23],
          say: `Line 22: <code>rollingCountTimeout: 10000</code>.<br><br>
            Sawaal: <b>kitni calls dekhun?</b> Hamari class: pichhli 6 <b>calls</b> (<code>windowSize: 6</code>). opossum: pichhle 10 <b>second</b>.<br><br>
            Window ka tareeka sabse bada farq hai. opossum calls ki ginti nahi rakhta, <b>waqt</b> dekhta hai: pichhle 10 second mein jitni bhi calls aayi, sab.<br><br>
            Line 23, <code>rollingCountBuckets: 10</code>, window ke andar ka bandwara hai. Abhi line 23 ko chhod do.`,
          vars: { win: '<code>windowSize</code> 6 <b>calls</b> → opossum: <b>rollingCountTimeout: 10000</b> (pichhle 10 <b>second</b>)' },
        },
        {
          line: 24,
          say: `Line 24: <code>resetTimeout: 2000</code>.<br><br>
            Sawaal: <b>OPEN kitni der?</b> Hamari class: <code>openMs: 2000</code>. Wahi 2 second.<br><br>
            Do farq:<br>
            • Hamari class timer poora hone ke baad <b>agli call aane par</b> HALF_OPEN hoti thi (line 16–17). opossum <b>timer se apne aap</b> HALF_OPEN ho jaati hai.<br>
            • HALF_OPEN mein hamari class <code>trials: 2</code> calls bhejti thi. opossum <b>sirf 1</b> trial call bhejti hai. <code>trials</code> jaisi koi setting yahan nahi hai.`,
          vars: {
            open: '<code>openMs</code> 2000 → opossum: <b>resetTimeout: 2000</b>',
            trial: '<code>trials</code> 2 → opossum: <b>hamesha 1 trial call</b> (setting nahi)',
          },
        },
        {
          line: 25,
          say: `Line 25: <code>errorFilter</code>.<br><br>
            Sawaal: <b>kya failure ginun?</b> Hamare mini.js ki line 14 ne tay kiya tha: jawab nahi ya 5xx = bimaar, 4xx = nahi.<br><br>
            opossum mein "kya failure" ka kaam <code>errorFilter</code> karta hai. Function <code>true</code> de → error ko failure <b>mat gino</b>. (Ulta lagta hai. Dhyaan se.) Yahan: status 400 se 499 ho toh <code>true</code> → mat gino.<br><br>
            Timeout ka error aur 5xx ka error: dono ka <code>status</code> 4xx nahi, filter <code>false</code> → failure ginte hain.`,
          vars: { what: 'mini.js line 14: <code>!res || status &gt;= 500</code> → opossum: <b>errorFilter</b> (4xx par <code>true</code> = mat gino)' },
          ask: {
            q: 'recs-service ne <b>503</b> diya (<code>err.status</code> = 503). Line 25 ka <code>errorFilter</code> kya lautayega — aur opossum is call ko kya ginegi?',
            choices: [
              '<code>false</code> (503, 400–499 ke beech nahi hai) → opossum is call ko <b>failure</b> ginegi',
              '<code>true</code> → opossum is call ko failure <b>nahi</b> ginegi',
              '<code>true</code> → opossum turant OPEN ho jaayegi',
              '<code>errorFilter</code> 5xx par chalta hi nahi',
            ],
            answer: 0,
            hint: 'Line 25 padho. 503 &gt;= 400 sach hai. Par 503 &lt; 500? Dono sach hon tabhi <code>true</code>.',
            explain: '503 &lt; 500 jhooth hai → filter <code>false</code> deta hai → failure gina gaya. Yaad rakhne ka tareeka: <code>errorFilter</code> = "kis error ko <b>maaf</b> karna hai". 4xx maaf. 5xx aur timeout maaf nahi.',
          },
        },
        {
          line: [27, 28],
          say: `Line 27: <code>breaker.fallback(() =&gt; lastGood)</code>. Call roki gayi ya fail hui → user ko <code>lastGood</code>.<br><br>
            Line 28: <code>breaker.on('success', …)</code>. Har safal call par <code>lastGood</code> naye recs se badal jaata hai. Hamare mini.js ki line 16 yahi karti thi.<br><br>
            Hamari class mein fallback <code>getRecs()</code> mein tha, breaker ke bahar. Library mein fallback breaker ke saath <b>register</b> hota hai.`,
          vars: { fb: '<code>lastGood</code> (mini.js line 16, 17) → opossum: <b>breaker.fallback(…)</b> + <code>on(\'success\')</code>' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> library mein <code>allow()</code> aur <code>record()</code> likhne nahi padte — library tumhare function ko lapet leti hai.<br>Par jo teen cheezein mini.js mein tumne khud likhi thi (time limit, kya failure hai, fallback), library mein bhi <b>tumhe hi</b> batani padti hain. Bas ab options ke roop mein.',
    },

    /* ---------------- 2. asli run: library kahan alag chali ---------------- */
    {
      type: 'dryrun',
      title: '🏁 Asli run — wahi 16 calls, library kahan alag chali',
      goal: 'Settings wahi rakhi: 300 ms, 50%, kam se kam 6 calls, 2 second. Phir bhi opossum aur hamari class ne alag faisle kiye. Dekho kahan, aur kyun. Phir wahi paanch sawaal doosri jagah, aur default settings ka jaal.',
      code: OPOSSUM_CODE,
      steps: [
        {
          title: 'Ab asli run: #7 par opossum ne kya kiya?',
          clock: '#7 · 2.0 s',
          line: [20, 21, 22],
          say: `Wahi 16 calls asli opossum par chalayi. Hamari class <b>#7</b> par OPEN hui thi. opossum ki ginti:
            <pre>call   opossum ki ginti           state
#5     5 calls, 1 fail = 20%     CLOSED
#6     6 calls, 2 fail = 33%     CLOSED
#7     7 calls, 3 fail = 43%     CLOSED</pre>
            #5, #6, #7 teeno timeout hui, teeno failure ginti gayi. Phir bhi opossum CLOSED.`,
          ask: {
            q: 'Hamari class #7 par OPEN hui. opossum #7 par OPEN kyun nahi hui?',
            choices: [
              'opossum pichhle 10 second ki saari 7 calls ginti hai: 3/7 = 43%, aur use 50% se ZYADA chahiye. Hamari class pichhli 6 calls dekhti hai: 3/6 = 50%, aur 50% ya zyada par khul jaati hai',
              'opossum ko kam se kam 6 calls chahiye thi (<code>volumeThreshold</code>), aur #7 par 6 nahi thi',
              'opossum timeout ko failure hi nahi ginti',
              'opossum mein bug hai',
            ],
            answer: 0,
            hint: 'Dono ne alag number dekhe: kitni calls, aur kitna fail. Line 20 aur line 22 dekho.',
            explain: 'Window alag: opossum ke 7 calls mein 3 fail = 43%. Hamari class ke 6 calls mein 3 fail = 50%. Hadd alag: opossum <b>&gt; 50%</b>, hamari <b>&gt;= 50%</b>. Dono ne alag number dekhe, isliye alag faisla.',
          },
        },
        {
          clock: '#8 · 2.5 s → #9 · 3.0 s',
          line: 20,
          say: `<b>#8</b>: 8 calls, 4 fail = <b>50%</b>. Theek 50%. Line 20 ko <b>50% se ZYADA</b> chahiye. Barabar kaafi nahi → CLOSED.<br><br>
            <b>#9</b>: 9 calls, 5 fail = <b>56%</b>. 56 &gt; 50 → <code>open</code>. opossum OPEN.<br><br>
            Hamari class #7 par OPEN hui, opossum #9 par. #8 aur #9 do aur calls thi jo latki recs-service tak pahunchi.`,
        },
        {
          clock: '#10 · 4.0 s → #13 · 6.2 s',
          line: 24,
          say: `<b>#10, #11, #12</b>: opossum OPEN hai. Har call <code>reject</code> hui, 0 se 1 ms mein cache mila. recs-service tak koi call nahi gayi.<br><br>
            recs-service 5.6 s par theek ho gayi. 2 second (<code>resetTimeout</code>) poore hone par opossum ne <b>timer se apne aap</b> HALF_OPEN kar diya. Kisi call ka intezaar nahi kiya.<br><br>
            <b>#13</b> (6.2 s): sirf <b>1 trial call</b>, 25 ms mein ✅ → <code>close</code>. Live jawab 6.2 s par wapas. Hamari class mein 7.0 s par.`,
        },
        {
          title: 'Dono ka hisaab',
          clock: 'poora run',
          line: '19-25',
          say: `<div class="dr-scroll"><table>
              <tr><th></th><th>Hamari class</th><th>opossum</th></tr>
              <tr><td>OPEN kab hui</td><td>#7 (3/6 = 50%)</td><td>#9 (5/9 = 56%)</td></tr>
              <tr><td>Latki recs-service tak pahunchi calls</td><td>4</td><td>5</td></tr>
              <tr><td>Trial calls</td><td>2</td><td>1</td></tr>
              <tr><td>Live jawab wapas</td><td>7.0 s (#14)</td><td>6.2 s (#13)</td></tr>
            </table></div>
            Is run mein opossum jaldi wapas aayi, par bimaari pakadne mein do call zyada lagi. Koi behtar nahi hai. <b>Niyam alag hain, isliye nateeje alag hain.</b>`,
        },
        {
          title: 'Wahi paanch sawaal, teen jagah',
          line: '19-25',
          say: `<div class="dr-scroll"><table>
              <tr><th>Sawaal</th><th>Hamari class<br>(level 2 ki value)</th><th>opossum<br>(default)</th><th>resilience4j (Java)<br>(default)</th></tr>
              <tr><td>Kitni calls dekhun?</td><td><code>windowSize</code> (6 calls)</td><td><code>rollingCountTimeout</code> (10000 ms — calls nahi, waqt)</td><td><code>slidingWindowSize</code> (100) + <code>slidingWindowType</code> (COUNT_BASED)</td></tr>
              <tr><td>Kam se kam kitni calls?</td><td><code>minCalls</code> (6)</td><td><code>volumeThreshold</code> (0)</td><td><code>minimumNumberOfCalls</code> (100)</td></tr>
              <tr><td>Kitna fail = OPEN?</td><td><code>failRate</code> (0.5 · barabar ya zyada)</td><td><code>errorThresholdPercentage</code> (50 · sirf ZYADA)</td><td><code>failureRateThreshold</code> (50 · barabar ya zyada)</td></tr>
              <tr><td>OPEN kitni der?</td><td><code>openMs</code> (2000)</td><td><code>resetTimeout</code> (30000 ms)</td><td><code>waitDurationInOpenState</code> (60000 ms)</td></tr>
              <tr><td>Kitni trial calls?</td><td><code>trials</code> (2)</td><td>setting nahi · hamesha 1</td><td><code>permittedNumberOfCallsInHalfOpenState</code> (10)</td></tr>
            </table></div>
            Chhatha sawaal: <b>kya failure ginun?</b> Hamari class: mini.js ki line 14. opossum: <code>errorFilter</code>. resilience4j: <code>recordExceptions</code> aur <code>ignoreExceptions</code>.`,
        },
        {
          title: 'Istio mein kya milta hai?',
          say: `Istio ke <code>DestinationRule</code> mein <code>trafficPolicy.outlierDetection</code> hai. Breaker jaisa lagta hai, par <b>cousin</b> hai. Wahi state machine nahi.<br><br>
            Fark: Istio har <b>pod</b> ko alag dekhta hai aur <b>lagataar</b> errors ginta hai. Bimaar pod ko load-balancing pool se bahar nikaalta hai (ejection).
            <div class="dr-scroll"><table>
              <tr><th>Hamara sawaal</th><th>Istio <code>outlierDetection</code> mein</th></tr>
              <tr><td>Kitna fail = bahar?</td><td><code>consecutive5xxErrors</code> (5). Lagataar 5xx ki ginti. 0 = band</td></tr>
              <tr><td>Kitni der bahar?</td><td><code>baseEjectionTime</code> (30s). Pod itni der bahar, aur har baar bahar hone par us ginti se guna</td></tr>
              <tr><td>Window, fail ka hissa?</td><td>nahi hai</td></tr>
              <tr><td>Trial calls?</td><td>nahi hain</td></tr>
            </table></div>
            Aur settings bhi hain: <code>interval</code> (10s), <code>maxEjectionPercent</code> (10%), <code>minHealthPercent</code> (0%). Istio ka <code>connectionPool</code> load limit karta hai. Load limit alag cheez hai.<br><br>
            "Istio mein bhi circuit breaker hai" adhoora sach hai. Kaam milta-julta hai, state machine alag.`,
        },
        {
          title: 'Library ke default tumhare settings nahi',
          say: `Dono libraries ke kuch default:<br>
            • opossum: <code>volumeThreshold</code> = <b>0</b>, <code>resetTimeout</code> = <b>30 s</b>.<br>
            • resilience4j: <code>minimumNumberOfCalls</code> = <b>100</b>, <code>waitDurationInOpenState</code> = <b>60 s</b>.<br><br>
            Defaults library likhne walon ka andaaza hain. KhanaKart ki traffic ka andaaza nahi.`,
          ask: {
            q: 'KhanaKart ne opossum lagayi: <code>timeout</code> aur fallback likhe, baaki sab default. recs-service par pehli hi call fail hui. Kya ho sakta hai?',
            choices: [
              '<code>volumeThreshold</code> 0 hai, yaani "kam se kam" ki koi hadd nahi (hamari class mein line 37 delete karne jaisa). 1 call, 1 fail = 100%, 50% se ZYADA → breaker ek hi call par OPEN ho sakta hai',
              'Kuch nahi — opossum 10 calls se pehle faisla nahi karti',
              'Breaker 30 second tak CLOSED rehta hai, fail ho ya na ho',
              'Library error phenk kar crash ho jaati hai',
            ],
            answer: 0,
            hint: 'Line 21 ka naam yaad karo: <code>volumeThreshold</code> = kam se kam kitni calls. Default 0 ka matlab?',
            explain: '<code>volumeThreshold</code> ka default 0: faisla karne ke liye kam se kam koi sankhya nahi. Ek call, ek fail = 100%, aur 100 &gt; 50. Isliye library ke default par bharosa mat karo. Apni traffic se number nikalo.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> library tumhara <code>allow()</code> aur <code>record()</code> likh deti hai. Par paanch sawaal tumhare hi rehte hain: kitni calls dekhun, kam se kam kitni, kitna fail, kitni der OPEN, kitni trial.<br>Library lagane se pehle teen sawaal apni traffic se poochho: <b>recs-service ko ek minute mein kitni calls jaati hain</b> (isse window aur kam se kam calls banti hain), <b>recs-service aam taur par theek hone mein kitna waqt leti hai</b> (OPEN kitni der), aur <b>fallback kitna purana chalega</b>. Phir har setting ka number likho. Default par mat chhodo.',
    },

    /* ---------------- 3. bonus: opossum khud chalao ---------------- */
    {
      type: 'docker',
      bonus: true,
      title: '🐳 Bonus — opossum apne laptop par chalao',
      project: '38-circuit-breaker',
      exercise: 'ex0-slowmo',
      goal: 'Wahi 16 calls asli library ke saath apni machine par chalao. Har call ke baad opossum ki ginti (calls aur fail %) badalte hue dekho.',
      why: '<code>tools/opossum.js</code> wahi file hai jo abhi padhi. Chalane ke liye sirf ek <code>npm install opossum</code> chahiye (Node 22 ya naya). Docker image mein opossum install nahi hota, isliye is tool ko seedha Node se chalao.',
      steps: [
        { text: 'Dono services chalao (ek terminal mein, chalta chhod do).', cmd: 'cd docker-labs/38-circuit-breaker && npm start ex0-slowmo', expect: 'ex0-slowmo\n[B] :5172\n[A] :5171 → B http://localhost:5172' },
        { text: 'Doosre terminal mein, usi project folder mein library install karo (ek baar). opossum 10 ko <b>Node 22 ya naya</b> chahiye. <code>node --version</code> se dekh lo.', cmd: 'cd docker-labs/38-circuit-breaker && npm install opossum' },
        { text: 'Ab wahi 16 calls opossum ke saath. Aakhri column dekho: calls aur fail % har call ke baad.', cmd: 'node tools/opossum.js', expect: `opossum: timeout 300 ms · window 10 s · kam se kam 6 calls · 50% se ZYADA fail → OPEN 2 s → 1 trial call

  #   kab     nateeja                         der      opossum ke events        state      window (pichhle 10 s)
  1   0.0 s  ✅ live                           23 ms   success                  CLOSED     1 calls, 0 fail = 0%
  2   0.2 s  ✅ live                           24 ms   success                  CLOSED     2 calls, 0 fail = 0%
  3   0.4 s  ✅ live                           25 ms   success                  CLOSED     3 calls, 0 fail = 0%
  4   0.6 s  ✅ live                           23 ms   success                  CLOSED     4 calls, 0 fail = 0%
       0.8 s  ⚠️  recs-service LATAK gayi (har /recs call 5 s)
  5   1.0 s  🟡 cache · recs ka jawab nahi   301 ms   timeout                  CLOSED     5 calls, 1 fail = 20%
  6   1.5 s  🟡 cache · recs ka jawab nahi   299 ms   timeout                  CLOSED     6 calls, 2 fail = 33%
  7   2.0 s  🟡 cache · recs ka jawab nahi   300 ms   timeout                  CLOSED     7 calls, 3 fail = 43%
  8   2.5 s  🟡 cache · recs ka jawab nahi   301 ms   timeout                  CLOSED     8 calls, 4 fail = 50%
  9   3.0 s  🟡 cache · recs ka jawab nahi   301 ms   timeout → open           OPEN       9 calls, 5 fail = 56%
 10   4.0 s  🟡 cache · breaker ne roki        1 ms   reject                   OPEN       10 calls, 5 fail = 50%
 11   4.5 s  🟡 cache · breaker ne roki        0 ms   reject                   OPEN       11 calls, 5 fail = 45%
 12   5.0 s  🟡 cache · breaker ne roki        0 ms   reject                   OPEN       12 calls, 5 fail = 42%
       5.6 s  ✅ recs-service theek ho gayi
              (timer: resetTimeout 2 s poora → opossum ne khud HALF_OPEN kiya)
 13   6.2 s  ✅ live                           25 ms   close → success          CLOSED     13 calls, 5 fail = 38%
 14   7.0 s  ✅ live                           23 ms   success                  CLOSED     14 calls, 5 fail = 36%
 15   7.2 s  ✅ live                           24 ms   success                  CLOSED     15 calls, 5 fail = 33%
 16   7.5 s  ✅ live                           25 ms   success                  CLOSED     16 calls, 5 fail = 31%` },
      ],
      observe: {
        q: 'Call #8 par 8 calls mein 4 fail hue, yaani theek 50%. Phir bhi opossum CLOSED kyun rahi?',
        choices: [
          'opossum ko 50% se <b>ZYADA</b> fail chahiye (<code>errorThresholdPercentage</code>). Theek 50% kaafi nahi. #9 par 5/9 = 56% hua, tab OPEN',
          'OPEN ka timer (<code>resetTimeout</code>) abhi poora nahi hua tha',
          '<code>volumeThreshold</code> 6 hai aur #8 par sirf 4 calls thi',
          'opossum timeout ko failure nahi ginti',
        ],
        answer: 0,
        explain: 'Hamari class mein <code>&gt;=</code> tha: 3/6 = 50% par OPEN. opossum mein <code>&gt;</code>: 4/8 = 50% par CLOSED, 5/9 = 56% par OPEN. Isi wajah se opossum do call baad khuli.',
      },
      lesson: 'Library wahi kaam karti hai, par ginti ka niyam alag hota hai (10 second ka window, "50% se ZYADA"). Library lagane se pehle uska niyam padho.',
    },
  ],
  interview: {
    title: 'Interview Round — library aur settings',
    instructions: 'Yahan "kaunsi setting, kyun" bolna hai. Library ka naam ratna kaafi nahi. 🎤',
    questions: [
      {
        q: '"Humne library ka circuit breaker laga diya, default settings ke saath. Kaafi hai?"',
        choices: [
          'Nahi. Default library likhne walon ke andaaze hain. Apni traffic se window, kam se kam calls aur OPEN ka waqt tay karo, kya failure ginna hai chuno, aur fallback likho',
          'Haan, library ke defaults production ke liye tested hain',
          'Nahi, library ka breaker kabhi bharosemand nahi hota — apna likho',
          'Haan, bas timeout badha do',
        ],
        answer: 0,
        explain: 'opossum ka default <code>volumeThreshold</code> 0 aur <code>resetTimeout</code> 30 s hai. resilience4j ka <code>minimumNumberOfCalls</code> 100 aur <code>waitDurationInOpenState</code> 60 s. Maan lo recs-service ko sirf 20 calls/minute jaati hain: 100 calls ke liye 5 minute lagenge.',
      },
      {
        q: '"Window calls ki ginti se rakhein, ya waqt se? Farq kya padta hai?"',
        choices: [
          'Ginti wali window pichhli N calls dekhti hai: traffic kam ho ya zyada, hamesha utne hi nateeje. Waqt wali window pichhle N second dekhti hai: kam traffic mein bahut kam nateeje aate hain, isliye uske saath "kam se kam calls" zaroor rakho',
          'Dono ek hi cheez hain, bas naam alag hai',
          'Waqt wali window hamesha behtar hai',
          'Ginti wali window sirf Java mein chalti hai',
        ],
        answer: 0,
        explain: 'Lab: wahi 3 timeouts. Pichhli 6 calls mein 3/6 = 50% → haath ka breaker khul gaya. Pichhle 10 second ki 7 calls mein 3/7 = 43% → opossum nahi khuli.',
      },
    ],
  },
  success: [
    'opossum ke options ko apne paanch sawaalon se mila sakte ho',
    'Bata sakte ho ki wahi settings par do breaker alag kyun chale (window ka tareeka, aur hadd ka niyam)',
    'Jaante ho ki library ke default tumhari traffic ke nahi hain — aur kaunse teen sawaal apni traffic se poochhne hain',
  ],
  cards: [
    { front: 'Library lagane par allow() / record() ka kya hota hai?', back: 'Library tumhare function ko lapet leti hai (<code>new CircuitBreaker(fn, options)</code>, phir <code>breaker.fire()</code>). allow / record library ke andar. Time limit, kya failure hai, aur fallback tumhe hi batane padte hain — options mein.' },
    { front: 'opossum ka errorFilter true lautaye toh?', back: 'Us error ko failure <b>nahi</b> gina jaata ("maaf"). Lab ki file: 4xx par true. 5xx aur timeout par false → failure.' },
    { front: 'Wahi settings — opossum #9 par kyun khuli, haath ka breaker #7 par?', back: 'Window alag: opossum pichhle 10 second ki saari calls ginti hai (3/7 = 43%), haath ka breaker pichhli 6 (3/6 = 50%). Hadd alag: opossum "50% se zyada", haath ka "50% ya zyada".' },
    { front: 'Library ke default settings par bharosa karein?', back: 'Nahi. opossum: <code>volumeThreshold</code> 0, <code>resetTimeout</code> 30 s. resilience4j: <code>minimumNumberOfCalls</code> 100, <code>waitDurationInOpenState</code> 60 s. Apni traffic se window, kam se kam calls aur OPEN ka waqt tay karo.' },
  ],
},
]);

})();
