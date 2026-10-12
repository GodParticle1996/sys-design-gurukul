/* =====================================================================
   🛡️ Playlist · 1 Resilience — Health Checks · level 4: LIBRARY (asli setup)
   Wahi sawaal asli jagahon par: Kubernetes ke probes (k8s/orders.yaml), npm ki library @godaddy/terminus ka ASLI run
   (tools/terminus.js), Spring Boot Actuator, aur load balancers ke apne health check.
   Kya asli run se hai aur kya documentation se:
     - terminus ke number: docker-labs/43-health-checks/tools/terminus.js ke asli run se (terminus 4.12.1, Node 24).
     - k8s/orders.yaml: Kubernetes par chala ke NAHI dekhi gayi (is machine par Kubernetes nahi hai). Settings ke naam
       aur defaults Kubernetes ki documentation se.
     - AWS load balancer, Envoy, Spring Boot: unki official documentation se (is lab mein chalaye nahi gaye).
   Jahan-jahan documentation se hai, wahan level mein likha hai.
   ===================================================================== */
(function () {

const HERO = [
  { id: 'q', icon: '🩺', label: 'wahi teen sawaal', x: 150, y: 105 },
  { id: 'k', icon: '☸️', label: 'Kubernetes', x: 455, y: 105 },
  { id: 'l', icon: '📦', label: 'library', x: 750, y: 105 },
];

VISUALS['hc-lib'] = {
  t: 'Sawaal wahi rehte hain. Badalte hain sirf naam — aur default settings, jo tumne likhi nahi par lagu hain',
  html: SD.viz.svg(HERO, [{ from: 'q', to: 'k' }, { from: 'k', to: 'l' }], {
    nodes: { q: { tone: 'acc', badge: 'shuru? zinda? traffic?' }, k: { tone: 'ok', badge: 'startup · liveness · readiness' }, l: { tone: 'slow', badge: 'defaults padho' } },
    flows: [{ from: 'q', to: 'k', label: 'YAML', tone: 'acc' }, { from: 'k', to: 'l', label: 'app', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'hc-lib',
  icon: '📦',
  group: '🩺 Health Checks',
  title: 'Health Checks 4 · Library — Kubernetes, Terminus, load balancer',
  badge: 'Setup Sipahi',
  objectives: [
    'Kubernetes mein teeno sawaal kis naam se likhe jaate hain, aur jo setting likhi nahi, us setting ki value kya hoti hai?',
    'Asli library (@godaddy/terminus) hamari chhoti file se kahan alag chalti hai?',
    'Library laga lene ke baad bhi deploy par requests kyun gir sakti hain?',
    'Load balancer ke apne health check ki default settings kya kehti hain?',
  ],
  lesson: [
    `<h3>📦 Asli project mein yeh code tum nahi likhte. Settings tum likhte ho.</h3>
     <p>Checker ka niyam (<code>lib/checker.js</code>) asli duniya mein Kubernetes ya load balancer ke andar hota hai. App ka hissa (<code>lib/health.js</code>) aksar ek library deti hai.</p>
     <p>Tumhara kaam: <b>settings</b>. Aur settings mein sabse zyada chot wahan lagti hai jahan tumne kuch likha hi nahi — kyunki tab <b>default</b> lagu hota hai.</p>
     <pre>asli library ka asli run (@godaddy/terminus, default settings):
6.50 s   🛑 SIGTERM — band hone ka signal
6.50 s   app band                          ← usi pal. Koi rukna nahi.</pre>
     <p>Library "graceful shutdown" ke liye lagayi gayi thi. Default settings ke saath app phir bhi signal milte hi band ho gaya.</p>
     <p class="tip">👉 Is level mein teen jagah dekhenge: Kubernetes ki YAML, ek asli library ka asli run, aur load balancer ke apne health check.</p>`,
  ],
  stages: [
    /* ---------------- 1. Kubernetes ki YAML ---------------- */
    {
      type: 'dryrun',
      title: '☸️ Kubernetes mein wahi teen sawaal — k8s/orders.yaml',
      goal: 'Yeh file lab ke folder mein hai. <b>Is machine par Kubernetes nahi hai, isliye yeh file chala ke nahi dekhi gayi</b>; settings ke naam aur defaults Kubernetes ki documentation se hain. Har click par ek hissa chamkega.',
      code: {
        title: 'docker-labs/43-health-checks/k8s/orders.yaml',
        file: 'docker-labs/43-health-checks/k8s/orders.yaml',
        from: 69,
        text: "      terminationGracePeriodSeconds: 30\n      containers:\n        - name: app\n          image: health-lab:1\n          command: [\"node\", \"services/pod.js\"]\n          env:\n            - { name: PORT, value: \"8080\" }\n            - { name: DB_URL, value: \"http://db:5222\" }\n            - { name: STARTUP_MS, value: \"6000\" }\n            - { name: GRACEFUL, value: \"1\" }\n          ports:\n            - containerPort: 8080\n          startupProbe:            # \"shuru ho gaye?\"\n            httpGet: { path: /livez, port: 8080 }\n            periodSeconds: 1\n            failureThreshold: 30   # 30 s tak ki chhoot\n          livenessProbe:           # \"zinda ho?\"\n            httpGet: { path: /livez, port: 8080 }\n            periodSeconds: 10\n            failureThreshold: 3\n          readinessProbe:          # \"traffic bhejein?\"\n            httpGet: { path: /readyz, port: 8080 }\n            periodSeconds: 5\n            failureThreshold: 2\n          lifecycle:\n            preStop:               # pehle 5 s ruko\n              exec: { command: [\"sleep\", \"5\"] }",
      },
      vars: [
        { id: 'q', label: 'Sawaal' },
        { id: 'k8s', label: 'Kubernetes mein naam' },
        { id: 'num', label: 'Fasla × hadd' },
        { id: 'fail', label: 'Hadd tak pahunche toh' },
      ],
      steps: [
        {
          clock: 'teen sawaal, teen naam',
          line: [81, 85, 89],
          say: `<b>Line 81, <code>startupProbe</code>:</b> "shuru ho gaye?"<br>
            <b>Line 85, <code>livenessProbe</code>:</b> "zinda ho?"<br>
            <b>Line 89, <code>readinessProbe</code>:</b> "traffic bhejein?"<br><br>
            Teeno ke neeche <code>httpGet</code> hai: Kubernetes is raaste ko kholta hai. Status 200 se 399 tak = pass; baaki sab = fail.`,
          vars: { q: 'teeno', k8s: 'startupProbe · livenessProbe · readinessProbe', num: '—', fail: '—' },
        },
        {
          clock: 'zinda ho?',
          line: '85-88',
          say: '<b>Line 86:</b> raasta <code>/livez</code> — wahi jo DB se nahi poochhta.<br><b>Line 87:</b> <code>periodSeconds: 10</code> = har 10 second par poochho.<br><b>Line 88:</b> <code>failureThreshold: 3</code> = lagataar 3 fail par restart.<br><br>Yeh wahi do number hain jo <code>lib/checker.js</code> ki line 40 mein the: fasla aur hadd.',
          vars: { q: '"zinda ho?"', k8s: 'livenessProbe', num: '10 s × 3 = ~30 s', fail: 'container restart' },
        },
        {
          clock: 'traffic bhejein?',
          line: '89-92',
          say: '<b>Line 90:</b> raasta <code>/readyz</code>.<br><b>Line 91–92:</b> har 5 second par, lagataar 2 fail par traffic band.<br><br><code>/readyz</code> ke andar kya check hota hai, yeh YAML mein nahi dikhta. Yeh faisla app ke code mein hai (level 3).',
          vars: { q: '"traffic bhejein?"', k8s: 'readinessProbe', num: '5 s × 2 = ~10 s', fail: 'pod ko traffic band (pod chalta rehta hai)' },
        },
        {
          clock: 'shuru ho gaye?',
          line: '81-84',
          say: '<b>Line 83–84:</b> har 1 second par, 30 fail tak chhoot = app ko khulne ke liye <b>30 second</b>.<br><br>Kubernetes ki documentation: startup probe ho, toh startup probe ke pass hone tak liveness aur readiness chalaye hi nahi jaate.',
          vars: { q: '"shuru ho gaye?"', k8s: 'startupProbe', num: '1 s × 30 = 30 s ki chhoot', fail: 'container restart' },
          ask: {
            q: 'Is app ko kabhi-kabhi khulne mein 45 second lagte hain. Is YAML ke saath us din kya hoga?',
            choices: [
              '30 fail ke baad Kubernetes container ko restart karega — app khulne se pehle. Naya container phir 45 second lega: wahi loop. failureThreshold ko sabse lambe boot se zyada rakhna hai',
              'Kubernetes 45 second tak intezaar karega',
              'Kuch nahi — startupProbe kabhi fail nahi hota',
              'Pod READY ho jaayega, bas der se',
            ],
            answer: 0,
            hint: '1 s × 30 = kitne second ki chhoot? Aur boot kitne second ka hai?',
            explain: 'Yeh hisaab hai, naapa hua nahi: 30 second ki chhoot, 45 second ka boot. Kubernetes ki documentation ka niyam: <code>failureThreshold × periodSeconds</code> ko sabse bure boot ke samay se lamba rakho. Lab ne chhote paimaane par yahi dikhaya: delay 10 s, boot 12 s → 2 restart.',
          },
        },
        {
          clock: 'jo likha nahi',
          line: [87, 88],
          say: `Ab sabse zaroori baat. Jo setting tum <b>nahi likhte</b>, us setting ki value default hoti hai. Kubernetes ki documentation ke defaults:
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Matlab</th><th>Default</th></tr>
              <tr><td><code>periodSeconds</code></td><td>kitni der par poochho</td><td>10 s</td></tr>
              <tr><td><code>timeoutSeconds</code></td><td>jawab ka kitna intezaar</td><td>1 s</td></tr>
              <tr><td><code>failureThreshold</code></td><td>lagataar kitne fail</td><td>3</td></tr>
              <tr><td><code>initialDelaySeconds</code></td><td>pehla sawaal kitni der baad</td><td>0 s</td></tr>
            </table></div>`,
          vars: { q: 'jo likha nahi', k8s: 'defaults', num: '10 s × 3', fail: '—' },
          ask: {
            q: 'Ek team ne <code>livenessProbe</code> mein sirf raasta likha: <code>/healthz</code>, jo DB mein query chalata hai. Baaki sab default. Ek din DB band nahi hua, bas <b>dheema</b> ho gaya: har query 2 second. Kya hoga?',
            choices: [
              'Har sawaal ka jawab 2 second mein aayega, par intezaar sirf 1 second ka hai (default timeout) → har sawaal fail. Lagataar 3 fail (~30 second) → saare pods restart. DB band bhi nahi hua tha',
              'Kuch nahi — DB chal toh raha hai',
              'Sirf ek pod restart hoga',
              'Kubernetes timeout apne aap badha dega',
            ],
            answer: 0,
            hint: '<code>timeoutSeconds</code> ka default kitna hai? 2 second wala jawab pass ginayega ya fail?',
            explain: 'Yeh documentation ke defaults se nikala hisaab hai (timeout 1 s, fasla 10 s, hadd 3) — is lab mein Kubernetes par naapa nahi gaya. Baat wahi hai jo level 1 mein naapi gayi: liveness mein DB ho, toh DB ki gadbad restart ban jaati hai.',
          },
        },
        {
          clock: 'band hone se pehle',
          line: [93, 94, 95],
          say: `<b>Line 94–95, <code>preStop</code>:</b> band karne se pehle container ke andar <code>sleep 5</code> chalao. Kubernetes pehle yeh chalata hai, uske baad app ko SIGTERM bhejta hai.<br><br>
            <code>sleep 5</code> kyun? Kubernetes ki documentation: pod ko traffic ki list se hatana aur pod ko band karna <b>ek saath shuru</b> hote hain. Khabar ko har load balancer tak pahunchne mein waqt lagta hai — level 2 ka teesra slow motion yahi tha.`,
          vars: { q: 'band hona', k8s: 'preStop', num: '5 s ruko, phir SIGTERM', fail: '—' },
        },
        {
          clock: 'aakhri hadd',
          line: 69,
          say: '<b>Line 69, <code>terminationGracePeriodSeconds: 30</code>:</b> band hone ke liye kul itne second. Itne mein app band na ho, toh Kubernetes zabardasti band karta hai. (30 default bhi hai.)<br><br><code>preStop</code> ka rukna aur app ka apna "thodi der jawab dete raho" — dono isi 30 second ke andar aane chahiye.',
          vars: { q: 'band hona', k8s: 'grace period', num: '30 s tak chhoot', fail: 'chhoot khatam → zabardasti band' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> Kubernetes mein teeno sawaal ke naam <code>startupProbe</code>, <code>livenessProbe</code>, <code>readinessProbe</code> hain, aur har ek ke do number hain: fasla aur hadd. Jo number nahi likha, uska default lagu hota hai — isliye defaults yaad rakho: 10 s · 1 s · 3.',
    },

    /* ---------------- 2. asli library ---------------- */
    {
      type: 'dryrun',
      title: '📦 Asli library: @godaddy/terminus — asli run',
      goal: 'Node ki ek chalti library jo health ke raaste aur band hona dono sambhalti hai. Neeche wahi timeline hai jo <code>mini.js</code> mein thi: DB 1.5 s par band, 4.5 s par wapas, 6.5 s par SIGTERM. Dekho library kahan hamari chhoti file jaisi chali — aur kahan nahi.',
      code: {
        title: 'docker-labs/43-health-checks/tools/terminus.js',
        file: 'docker-labs/43-health-checks/tools/terminus.js',
        from: 12,
        text: "const PORT = 5229;\nlet dbUp = true;          // nakli DB: bas ek variable\nlet dbSeen = true;        // DB ka yaad rakha jawab\n// terminus khud yaad nahi rakhta: yeh kaam tumhara\nsetInterval(() => { dbSeen = dbUp; }, 1000);\n\nconst server = http.createServer((req, res) => {\n  res.setHeader('content-type', 'application/json');\n  res.end('{\"page\":\"home\"}');\n});\n\nconst wait = ms => new Promise(r => setTimeout(r, ms));\n\ncreateTerminus(server, {\n  healthChecks: {\n    '/livez': async () => {},   // kuch throw nahi → 200\n    '/readyz': async () => {\n      if (!dbSeen) throw new Error('db');   // throw → 503\n    },\n  },\n  // band karne se pehle 2 s ruko (default: bilkul nahi)\n  beforeShutdown: NO_DELAY ? undefined : () => wait(2000),\n  onShutdown: async () => say(now(), '', 'app band'),\n  useExit0: true,\n});\nserver.listen(PORT);",
      },
      vars: [
        { id: 'who', label: 'Kaun' },
        { id: 'livez', label: '/livez' },
        { id: 'readyz', label: '/readyz' },
        { id: 'home', label: '/home' },
      ],
      steps: [
        {
          clock: 'library kya leti hai',
          line: '25-36',
          say: '<code>createTerminus</code> ko tumhara server milta hai aur kuch settings.<br><br><b>Line 26–31, <code>healthChecks</code>:</b> raasta → function. Function kuch throw na kare → <b>200</b>. Throw kare → <b>503</b>.<br><br><code>/livez</code> ka function khaali hai (line 27): kisi se nahi poochhta. Wahi baat jo <code>live()</code> mein thi.',
          vars: { who: '@godaddy/terminus', livez: 'khaali function → 200', readyz: 'throw → 503', home: 'tumhara apna raasta' },
        },
        {
          clock: 'yaad khud rakho',
          line: [14, 15, 16, 29],
          say: 'Terminus tumhara function <b>har sawaal par</b> chalata hai. Yaad rakhne ka kaam library nahi karti.<br><br>Isliye line 14–16: ek variable (<code>dbSeen</code>) aur ek ghadi, jo har 1 second par DB se poochhti hai. Line 29 sirf yeh variable padhti hai.<br><br>Agar line 29 mein seedha DB query likh do, toh wahi bill aayega jo lab ne naapa: 18.5 queries/second, bina kisi user ke.',
          vars: { readyz: 'dbSeen padhta hai' },
        },
        {
          clock: 'gadbad ke waqt',
          line: [28, 29, 30],
          say: `Asli run, DB 1.50 s par band:
            <pre>1.75 s   200      200       200
2.25 s   200      503       200
…
4.75 s   200      503       200
5.25 s   200      200       200</pre>
            Bilkul wahi jo hamari chhoti file ne diya tha: /livez 200, /readyz yaad ke hisaab se, /home chalti rahi.`,
          vars: { who: 'dono ek jaise', livez: '200', readyz: '503 (2.25 s se 4.75 s)', home: '200' },
        },
        {
          clock: 'SIGTERM ke baad',
          line: [32, 33],
          say: 'Line 33: band hone se pehle 2 second ruko. 6.50 s par SIGTERM aaya.',
          vars: { who: 'hamari file: 200 · 503 · 200', livez: '?', readyz: '503', home: '200' },
          ask: {
            q: 'Hamari file mein SIGTERM ke baad /livez 200 rehta tha, aur /readyz 503. Terminus ke asli run mein /livez par kya aaya hoga?',
            choices: [
              '503 — band hote waqt Terminus apne saare health raaston par 503 deta hai, /livez par bhi',
              '200 — hamari file ki tarah',
              'Connection band',
              '404',
            ],
            answer: 0,
            hint: 'Library ke liye /livez aur /readyz mein koi farak hai? Dono bas "healthChecks" ke raaste hain.',
            explain: 'Asli run: <code>6.75 s 503 503 200</code>. Library ki setting <code>sendFailuresDuringShutdown</code> ka default true hai: band hote waqt har health raasta 503. Yeh farak padhne se nahi, chalane se dikha.',
          },
        },
        {
          clock: 'band',
          line: [33, 34],
          say: `<pre>6.50 s                              🛑 SIGTERM — band hone ka signal
6.75 s   503      503       200
7.25 s   503      503       200
7.75 s   503      503       200
8.25 s   503      503       200
8.50 s                              app band</pre>
            2 second tak /home jawab deti rahi, phir app band. Yeh wahi kram hai jo level 2 mein 0 fail laaya tha.`,
          vars: { who: '@godaddy/terminus (2 s rukna)', livez: '503', readyz: '503', home: '200 — 8.50 s tak' },
        },
        {
          clock: 'default ka jaal',
          line: [32, 33],
          say: 'Ab line 33 ko dekho: <code>beforeShutdown</code>. Yeh setting <b>tumne</b> likhi hai. Library ka default: koi rukna nahi.',
          vars: { who: '@godaddy/terminus (default settings)', livez: '?', readyz: '?', home: '?' },
          ask: {
            q: 'Team ne Terminus laga li, par <code>beforeShutdown</code> nahi likha. 6.50 s par SIGTERM aaya. Kya hoga?',
            choices: [
              'App usi pal naye connection lena band kar dega. Load balancer ko khabar pahunchne tak jo requests aayengi, fail hongi — jaise "turant band" mein',
              'Library apne aap 2 second rukegi',
              'App band hi nahi hoga',
              '/readyz 503 dega aur app 30 second chalta rahega',
            ],
            answer: 0,
            hint: 'Library ka naam "graceful shutdown" hai. Par load balancer ki khabar wali der ka library ko pata hai?',
            explain: 'Asli run (<code>--no-delay</code>): <code>6.50 s 🛑 SIGTERM</code>, aur usi line ke neeche <code>6.50 s app band</code>. 503 wala daur aaya hi nahi. Library chalte kaam poore hone deti hai, par naye connection turant band. Library ka apna README Kubernetes ke liye yahi rukna lagane ko kehta hai.',
          },
        },
        {
          clock: 'kisi bhi library se paanch sawaal',
          line: '25-36',
          say: `<div class="dr-scroll"><table>
              <tr><th>Sawaal</th><th>Hamari file</th><th>@godaddy/terminus (asli run)</th><th>Spring Boot Actuator (documentation)</th></tr>
              <tr><td>"Zinda ho?" ka raasta</td><td><code>/livez</code></td><td><code>healthChecks</code> mein jo likho</td><td><code>/actuator/health/liveness</code></td></tr>
              <tr><td>"Traffic bhejein?" ka raasta</td><td><code>/readyz</code></td><td><code>healthChecks</code> mein jo likho</td><td><code>/actuator/health/readiness</code></td></tr>
              <tr><td>Dependency ka jawab yaad rehta hai?</td><td>haan (<code>check</code>, <code>everyMs</code>)</td><td>nahi — khud rakho</td><td>readiness mein bahar ki cheezon ka check default mein hota hi nahi</td></tr>
              <tr><td>Band hote waqt</td><td>/readyz 503 · /livez 200</td><td>dono 503</td><td>readiness "traffic nahi" · liveness theek</td></tr>
              <tr><td>Band hone se pehle rukna</td><td>2 s (<code>mini.js</code>)</td><td>default: nahi (<code>beforeShutdown</code>)</td><td>—</td></tr>
            </table></div>
            Spring Boot ki documentation liveness ke baare mein saaf kehti hai: liveness ko bahar ki cheezon (database, doosri API, cache) par nirbhar nahi hona chahiye — warna us cheez ke girne par Kubernetes saare instances restart kar sakta hai.`,
          vars: { who: 'teeno', livez: 'naam alag, kaam wahi', readyz: 'naam alag, kaam wahi', home: '—' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> library tumhe raaste aur signal ka dhancha deti hai. Teen cheezein phir bhi tumhari hain: <b>jawab mein kya rakhna hai</b>, <b>yaad kaun rakhega</b>, aur <b>band hone se pehle kitna rukna hai</b>. Library ko ek baar chala ke dekho — default settings ke saath.',
    },

    /* ---------------- 3. load balancer ke apne check ---------------- */
    {
      type: 'cards',
      title: '🚦 Load balancer ka apna health check',
      goal: 'Chaar chhote cards. Yeh cards AWS aur Envoy ki <b>official documentation</b> se hain; is lab mein yeh chalaye nahi gaye. Jahan hisaab hai, wahan hisaab documentation ki default settings se nikala gaya hai.',
      steps: [
        {
          title: '1. Ek pod, do poochhne wale',
          say: 'Kubernetes ke saath aksar ek load balancer bhi hota hai — aur load balancer <b>apna alag</b> health check chalata hai, apne faasle aur apni hadd ke saath.<br><br>Yaani ek hi pod se do log poochh rahe hain. Dono ko gadbad ka pata alag-alag waqt par chalta hai. Lab ne bhi yahi maana tha: har pod ka <code>/readyz</code> har second 4 jagah se khulta hai.<br><br>Band hote waqt jis poochhne wale ko khabar <b>sabse der se</b> milti hai, usi poochhne wale ke hisaab se rukna padta hai.',
        },
        {
          title: '2. AWS load balancer ke defaults',
          say: `AWS Application Load Balancer ki documentation ke defaults:
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Default</th></tr>
              <tr><td>Kitni der par poochho (<code>HealthCheckIntervalSeconds</code>)</td><td>30 s</td></tr>
              <tr><td>Jawab ka intezaar (<code>HealthCheckTimeoutSeconds</code>)</td><td>5 s</td></tr>
              <tr><td>Lagataar kitne fail par "unhealthy" (<code>UnhealthyThresholdCount</code>)</td><td>2</td></tr>
              <tr><td>Lagataar kitne pass par wapas "healthy" (<code>HealthyThresholdCount</code>)</td><td>5</td></tr>
              <tr><td>Kaunsa status pass hai</td><td>sirf 200</td></tr>
            </table></div>`,
          ask: {
            q: 'In defaults ke saath ek target theek ho gaya. Load balancer us target ko dobara traffic kitni der mein bhejega?',
            choices: [
              'Lagbhag 2 se 2.5 minute: lagataar 5 pass chahiye, aur sawaal har 30 second par poochha jaata hai',
              'Turant',
              '5 second mein',
              '30 second mein',
            ],
            answer: 0,
            hint: 'Kitne pass chahiye? Do sawaalon ke beech kitna fasla hai?',
            explain: 'Yeh documentation ke defaults se nikala hisaab hai (5 pass, har 30 s), is lab mein naapa nahi gaya. "Wapas aane" ki bhi ek hadd hoti hai — aur default mein yeh hadd "bahar jaane" wali hadd se badi hai.',
          },
        },
        {
          title: '3. Jab saare ek saath "nahi" kahein',
          say: `Level 2 ka fail open, documentation ke shabdon ke saath:
            <ul>
              <li><b>AWS Application Load Balancer:</b> agar target group mein sirf unhealthy targets hon, toh load balancer requests ko in sab targets par bhejta hai, targets ke health status ko dekhe bina.</li>
              <li><b>Envoy:</b> healthy hosts ka hissa panic threshold se neeche jaaye, toh Envoy health status ko andekha karta hai. Default panic threshold: 50%.</li>
              <li><b>Kubernetes ka Service</b> (Spring Boot ki documentation ke mutabiq): saare instances unready hon, toh Service koi connection leta hi nahi.</li>
            </ul>
            Isliye "readiness mein shared DB" ki keemat is par bhi nirbhar hai ki aage kaunsa load balancer khada hai.`,
        },
        {
          title: '4. Kal subah — chaar cheezein dekho',
          say: `Apni kisi ek service ki settings kholo aur likho:
            <ol>
              <li><b>Liveness kya check karta hai?</b> DB ya doosri service ka naam dikhe, toh level 1 dobara padho.</li>
              <li><b>Readiness mein kaunsi shared cheez hai?</b> Us cheez ke girne par kitne pods ek saath bahar honge?</li>
              <li><b>Fasla × hadd kitna hai?</b> Jo likha nahi, uska default kya hai?</li>
              <li><b>SIGTERM par app kya karta hai?</b> Kitni der jawab deta rehta hai — aur load balancer ko khabar pahunchne mein kitni der lagti hai?</li>
            </ol>`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> har poochhne wale ke teen number hote hain: <b>fasla</b>, <b>bahar jaane ki hadd</b>, <b>wapas aane ki hadd</b>. Aur ek niyam: saare ek saath "nahi" kahein toh kya? Yeh chaaron apne setup mein dhoondo.',
    },

    /* ---------------- 4. bonus: asli library chalao ---------------- */
    {
      type: 'docker',
      title: '🐳 Bonus lab — @godaddy/terminus khud chalao',
      project: '43-health-checks',
      exercise: 'ex0-slowmo',
      goal: 'Wahi timeline, asli library ke saath. Pehle 2 second ke rukne ke saath, phir library ki default settings ke saath.',
      why: 'Lab mein koi npm dependency nahi hai; yeh ek hi tool hai jise library chahiye. <code>npm install</code> isi folder mein chalao (Docker image mein yeh library nahi hai). Neeche ka output terminus 4.12.1 aur Node 24 par aaya tha.',
      steps: [
        { text: 'Library lagao (ek baar, isi folder mein).', cmd: 'cd docker-labs/43-health-checks && npm install @godaddy/terminus' },
        { text: 'Band hone se pehle 2 s rukne ke saath. 6.75 s wali line mein /livez dekho.', cmd: 'node tools/terminus.js', expect: "app :5229 · @godaddy/terminus · beforeShutdown: 2 s\n\n    samay   /livez   /readyz   /home      kya hua\n   0.25 s   200      200       200\n   0.75 s   200      200       200\n   1.25 s   200      200       200\n   1.50 s                                  💥 DB band\n   1.75 s   200      200       200\n   2.25 s   200      503       200\n   2.75 s   200      503       200\n   3.25 s   200      503       200\n   3.75 s   200      503       200\n   4.25 s   200      503       200\n   4.50 s                                  ✅ DB wapas\n   4.75 s   200      503       200\n   5.25 s   200      200       200\n   5.75 s   200      200       200\n   6.25 s   200      200       200\n   6.50 s                                  🛑 SIGTERM — band hone ka signal\n   6.75 s   503      503       200\n   7.25 s   503      503       200\n   7.75 s   503      503       200\n   8.25 s   503      503       200\n   8.50 s                                  app band" },
        { text: 'Ab library ki default settings. Aakhri do lines dekho.', cmd: 'node tools/terminus.js --no-delay', expect: "app :5229 · @godaddy/terminus · default settings (beforeShutdown nahi)\n\n    samay   /livez   /readyz   /home      kya hua\n   0.25 s   200      200       200\n   0.75 s   200      200       200\n   1.25 s   200      200       200\n   1.50 s                                  💥 DB band\n   1.75 s   200      200       200\n   2.25 s   200      503       200\n   2.75 s   200      503       200\n   3.25 s   200      503       200\n   3.75 s   200      503       200\n   4.25 s   200      503       200\n   4.50 s                                  ✅ DB wapas\n   4.75 s   200      503       200\n   5.25 s   200      200       200\n   5.75 s   200      200       200\n   6.25 s   200      200       200\n   6.50 s                                  🛑 SIGTERM — band hone ka signal\n   6.50 s                                  app band" },
      ],
      observe: {
        q: 'Default settings wale run mein 6.75 s wali line aayi hi nahi. Kyun?',
        choices: [
          'App 6.50 s par hi band ho gaya: default mein band hone se pehle koi rukna nahi hai. 6.75 s par poochhne ke liye app bacha hi nahi tha',
          'Tool mein bug hai',
          'DB band tha',
          'Library ne /livez hata diya',
        ],
        answer: 0,
        explain: 'Deploy ke waqt yahi pal hota hai jab load balancer ko abhi khabar nahi mili. Lab ne naapa: turant band → har deploy par 75 requests fail; rukne ke saath → 0.',
      },
      lesson: 'Library ka naam "graceful" hone se deploy graceful nahi ho jaata. Rukne ki setting tumhe likhni hai.',
    },
  ],
  interview: {
    title: 'Interview Round — asli setup',
    instructions: 'Interviewer dekhna chahta hai ki tum defaults jaante ho, aur "library laga li" par nahi rukte. 🎤',
    questions: [
      {
        q: '"Humne graceful shutdown ki library laga li hai. Ab deploy par requests nahi girni chahiye — phir bhi gir rahi hain. Kyun?"',
        choices: [
          'Graceful shutdown ke do hisse hain: chalte kaam poore karna, aur naye traffic ke rukne tak jawab dete rehna. Library pehla hissa deti hai. Doosre hisse ke liye band hone se pehle rukna padta hai (app mein delay, ya Kubernetes ka preStop), kyunki load balancer ko "yeh pod gaya" ki khabar der se pahunchti hai',
          'Library mein bug hai',
          'Pods zyada hone chahiye',
          'Deploy raat ko karna chahiye',
        ],
        answer: 0,
        explain: 'Asli run: terminus default settings → SIGTERM aur "app band" dono 6.50 s par. Lab: turant band → har deploy par 75 fail; 2 s jawab dete rehna → 0.',
      },
      {
        q: '"AWS load balancer ke peeche saare targets ek saath health check fail kar dein — users ko kya dikhega?"',
        choices: [
          'Load balancer fail open karta hai: jab target group mein sirf unhealthy targets hon, toh requests sab targets ko bheji jaati hain. Agar targets asal mein theek hain (bas health check ki shared dependency giri thi), toh zyadatar requests chalti rahengi. Kubernetes ka Service aisa nahi karta',
          'Sab users ko turant 503',
          'Load balancer naye targets bana leta hai',
          'Load balancer band ho jaata hai',
        ],
        answer: 0,
        explain: 'AWS ki documentation: saare targets unhealthy → load balancer sab ko bhejta hai (fails open). Lab ka slow motion, fail open ke saath: /home 26 mein se 26 safal; bina fail open: 26 mein se 16.',
      },
    ],
  },
  success: [
    'Kubernetes ke teeno probes aur unke default number (10 s · 1 s · 3) bata sakte ho',
    'Bata sakte ho ki asli library kahan alag chali: band hote waqt dono raaston par 503, yaad khud rakhni, default mein koi rukna nahi',
    'Load balancer ke teen number aur fail open ka niyam apne setup mein dhoondh sakte ho',
  ],
  cards: [
    { front: 'Kubernetes probes ke defaults? (docs)', back: '<code>periodSeconds</code> 10 · <code>timeoutSeconds</code> 1 · <code>failureThreshold</code> 3 · <code>initialDelaySeconds</code> 0. Pata chalne mein ~30 s. Timeout 1 s: dheema jawab bhi fail hai.' },
    { front: 'startupProbe ki chhoot kaise ginte hain?', back: '<code>failureThreshold × periodSeconds</code>. Lab ki YAML: 30 × 1 s = 30 s. Sabse lambe boot se zyada rakho; warna khulne se pehle restart.' },
    { front: 'Terminus hamari file se kahan alag chali? (asli run)', back: 'Band hote waqt /livez par bhi 503 (hamari file: 200). Dependency ka jawab yaad nahi rakhti. Default mein band hone se pehle koi rukna nahi: SIGTERM aur "app band" dono 6.50 s par.' },
    { front: 'preStop sleep kyun?', back: 'Kubernetes pod ko traffic ki list se hatana aur band karna ek saath shuru karta hai (docs). Khabar har load balancer tak der se pahunchti hai. Lab: turant band → 75 fail har deploy; rukne par 0.' },
    { front: 'AWS load balancer ke health check defaults? (docs)', back: 'Har 30 s · timeout 5 s · 2 fail → unhealthy · 5 pass → healthy · sirf 200 pass. Saare targets unhealthy → sab ko bhejta hai (fail open).' },
  ],
},
]);

})();
