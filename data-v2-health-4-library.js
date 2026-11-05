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
    `<h3>📦 Asli project mein checker ka code tum nahi likhte. Settings tum likhte ho.</h3>
     <p>Checker ka niyam (<code>lib/checker.js</code>) asli duniya mein Kubernetes ya load balancer ke andar hota hai. App ka hissa (<code>lib/health.js</code>) aksar ek library deti hai.</p>
     <p>Tumhara kaam: <b>settings</b>. Aur settings mein sabse zyada chot un settings se lagti hai jo tumne likhi hi nahi — kyunki tab <b>default</b> lagu hota hai.</p>
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
      goal: 'Deployment ki YAML file lab ke folder mein hai. <b>Is machine par Kubernetes nahi hai, isliye YAML file chala ke nahi dekhi gayi</b>; settings ke naam aur defaults Kubernetes ki documentation se hain. Har click par ek hissa chamkega.',
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
          say: '<b>Line 86:</b> raasta <code>/livez</code> — wahi jo DB se nahi poochhta.<br><b>Line 87:</b> <code>periodSeconds: 10</code> = har 10 second par poochho.<br><b>Line 88:</b> <code>failureThreshold: 3</code> = lagataar 3 fail par restart.<br><br>Line 87–88 ke do number wahi hain jo <code>lib/checker.js</code> ki line 40 mein the: fasla aur hadd.',
          vars: { q: '"zinda ho?"', k8s: 'livenessProbe', num: '10 s × 3 = ~30 s', fail: 'container restart' },
        },
        {
          clock: 'traffic bhejein?',
          line: '89-92',
          say: '<b>Line 90:</b> raasta <code>/readyz</code>.<br><b>Line 91–92:</b> har 5 second par, lagataar 2 fail par traffic band.<br><br><code>/readyz</code> ke andar kya check hota hai, YAML mein nahi dikhta. Check ka faisla app ke code mein hai (level 3).',
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
              'Lagbhag 30 s ki chhoot 45 s ke boot se chhoti hai; app khulne se pehle restart ho sakta hai',
              'Lagbhag 30 s baad checker 45 s wala boot pehchaan lega; chhoot apne aap badhti chali jaayegi',
              'Lagbhag 30 s par readiness ki ginti lagegi; 45 s tak startup ke fail zero hote rahenge',
              'Lagbhag 30 s par startup ki ghadi rukegi; 45 s par app khulne ke baad hi fail gine jaayenge',
            ],
            answer: 0,
            hint: '1 s × 30 = kitne second ki chhoot? Aur boot kitne second ka hai?',
            explain: 'Har 1 s par 30 lagataar fail ki chhoot lagbhag 30 s hai. Boot 45 s le toh chhoot pehle khatam ho sakti hai. Boot ke sabse lambe naape samay se zyada chhoot rakho. Hisaab YAML aur documentation ka hai; asli Kubernetes par is lab ne timing nahi naapi.',
            choiceExplanations: [
              'Har 1 s par 30 lagataar fail ki chhoot lagbhag 30 s hai. Boot 45 s le toh chhoot pehle khatam ho sakti hai. Boot ke sabse lambe naape samay se zyada chhoot rakho. Hisaab YAML aur documentation ka hai; asli Kubernetes par is lab ne timing nahi naapi.',
              'Startup probe boot ki lambai pehchaankar chhoot khud nahi badhaata. Period aur hadd tumhe tay karni hai.',
              'Startup pass hone tak readiness chalti hi nahi. Readiness startup ke fail ki ginti zero nahi kar sakti.',
              'Startup probe ki apni fail ki hadd hai. App khulne tak startup ki ghadi rok dena is setting ka niyam nahi.',
            ],
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
              '1 s mein jawab na mila toh fail; lagataar 3 fail par container restart ho sakta hai',
              '2 s mein DB se jawab mila toh pass; lagataar 3 aise jawab restart nahi karwaayenge',
              '2 s ki DB deri par timeout badhega; lagataar 3 sawaalon mein nayi hadd lag jaayegi',
              '1 s mein liveness fail hoga, par readiness pass ho toh 3 fail par bhi restart rukega',
            ],
            answer: 0,
            hint: '<code>timeoutSeconds</code> ka default kitna hai? 2 second wala jawab pass ginayega ya fail?',
            explain: 'Default timeout 1 s hai. DB ka 2 s wala jawab der se hai, toh probe fail ho sakta hai. Lagataar 3 fail par restart hoga; restart ka theek pal sawaal ki baari aur timeout par nirbhar hai. Default period 10 s hai. Kubernetes par timing is lab mein nahi naapi gayi.',
            choiceExplanations: [
              'Default timeout 1 s hai. DB ka 2 s wala jawab der se hai, toh probe fail ho sakta hai. Lagataar 3 fail par restart hoga; restart ka theek pal sawaal ki baari aur timeout par nirbhar hai. Default period 10 s hai. Kubernetes par timing is lab mein nahi naapi gayi.',
              'DB ne aakhir jawab diya, par checker ki 1 s ki hadd beet gayi. Baad mein safal query waqt par aaya probe jawab nahi hai.',
              'Timeout DB ki deri dekhkar khud nahi badhta. Setting badalni ho toh tumhe badalni padegi.',
              'Readiness pass hona liveness ka restart nahi rokta. Dono probes apne niyam se kaam karte hain.',
            ],
          },
        },
        {
          clock: 'band hone se pehle',
          line: [93, 94, 95],
          say: `<b>Line 94–95, <code>preStop</code>:</b> band karne se pehle container ke andar <code>sleep 5</code> chalao. Kubernetes pehle <code>sleep 5</code> chalata hai, phir app ko SIGTERM bhejta hai.<br><br>
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
      lesson: '🎯 <b>Asli baat:</b> Kubernetes mein teeno sawaal ke naam <code>startupProbe</code>, <code>livenessProbe</code>, <code>readinessProbe</code> hain, aur har ek ke do number hain: fasla aur hadd. Na likhe number ka default lagu hota hai — isliye defaults yaad rakho: 10 s · 1 s · 3.',
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
          say: 'Terminus tumhara function <b>har sawaal par</b> chalata hai. Yaad rakhne ka kaam library nahi karti.<br><br>Isliye line 14–16: ek variable (<code>dbSeen</code>) aur ek ghadi, jo har 1 second par DB se poochhti hai. Line 29 sirf ek variable padhti hai.<br><br>Agar line 29 mein seedha DB query likh do, toh wahi bill aayega jo lab ne naapa: 18.5 queries/second, bina kisi user ke.',
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
              '503 — band hote waqt Terminus ne /livez ko bhi health ka fail jawab diya',
              '200 — live ka function nahi badla, toh band hone par bhi seedha haan aaya',
              '404 — band hote waqt Terminus ne /livez ka raasta pehle hi hata diya tha',
              'Band — rukne ki setting ke bawajood server ne naya connection lena chhod diya',
            ],
            answer: 0,
            hint: 'Hamari file aur library ko alag dekho. Band hone ki haalat ka jawab library khud sambhaal sakti hai?',
            explain: 'Recorded run mein 6.75 s par /livez 503, /readyz 503 aur /home 200 tha. Terminus band hote waqt health ke raaston par 503 deta hai. Hamari health.js ka live() alag hai: stopping nahi padhta aur true deta hai. Library ke jawab ko apne code jaisa maan kar mat chalo.',
            choiceExplanations: [
              'Recorded run mein 6.75 s par /livez 503, /readyz 503 aur /home 200 tha. Terminus band hote waqt health ke raaston par 503 deta hai. Hamari health.js ka live() alag hai: stopping nahi padhta aur true deta hai. Library ke jawab ko apne code jaisa maan kar mat chalo.',
              'Hamari file ka jawab 200 tha. Terminus ke is run mein band hone ki haalat ne health ka jawab 503 kiya.',
              'Raasta hata nahi tha. HTTP jawab 503 mila, raasta na milne wala 404 nahi.',
              'beforeShutdown ke 2 s mein app requests le raha tha. /home ka 200 aur health ke 503 khule server se aaye.',
            ],
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
            2 second tak /home jawab deti rahi, phir app band. Level 2 mein bhi isi kram ne 0 fail diye the.`,
          vars: { who: '@godaddy/terminus (2 s rukna)', livez: '503', readyz: '503', home: '200 — 8.50 s tak' },
        },
        {
          clock: 'default ka jaal',
          line: [32, 33],
          say: 'Ab line 33 ko dekho: <code>beforeShutdown</code>. Ye setting <b>tumne</b> likhi hai. Library ka default: koi rukna nahi.',
          vars: { who: '@godaddy/terminus (default settings)', livez: '?', readyz: '?', home: '?' },
          ask: {
            q: 'Team ne Terminus laga li, par <code>beforeShutdown</code> nahi likha. 6.50 s par SIGTERM aaya. Kya hoga?',
            choices: [
              'Lab ka app naya traffic lena chhod dega; load balancer ko khabar milna abhi baaki ho sakta hai',
              'Library khabar pahunchne ki deri naapkar rukegi; beforeShutdown na likho toh bhi intezaar mil jaayega',
              'Library /readyz ko haan rakhegi; app band hone tak load balancer ko fail ka jawab nahi milega',
              'Library pehle list badalne ka jawab legi; load balancer bata de tabhi server band kiya jaayega',
            ],
            answer: 0,
            hint: 'Library ka naam "graceful shutdown" hai. Par load balancer ki khabar wali der ka library ko pata hai?',
            explain: 'Default run mein SIGTERM aur app band hone ka samay dono 6.50 s tha. beforeShutdown na ho toh band hone se pehle jawab dete rehne ki chhoot nahi milti. Library ka chalte kaam sambhaalna alag hai; purani list se aane wale naye traffic ke liye rukna alag.',
            choiceExplanations: [
              'Default run mein SIGTERM aur app band hone ka samay dono 6.50 s tha. beforeShutdown na ho toh band hone se pehle jawab dete rehne ki chhoot nahi milti. Library ka chalte kaam sambhaalna alag hai; purani list se aane wale naye traffic ke liye rukna alag.',
              'Terminus load balancer ki deri khud naapkar pre-close intezaar nahi chunta. beforeShutdown mein zaroori rukna tum likhte ho.',
              'Is library ka band hote waqt health ka jawab 503 hai, haan nahi. Default run mein app itni jaldi band hua ki agla sawaal bhi nahi aaya.',
              'Lab mein load balancer se list badalne ki pushti lene ka raasta nahi. Library shutdown shuru karti hai; khabar ki deri tumhe sambhaalni hai.',
            ],
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
      goal: 'Chaar chhote cards. Ye cards AWS aur Envoy ki <b>official documentation</b> se hain; is lab mein AWS aur Envoy chalaye nahi gaye. Har hisaab documentation ki default settings se nikala gaya hai.',
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
            q: 'ALB ke instance/IP target group mein ek target unhealthy tha, baaki healthy hain. Ab kharab target theek hua. Default settings par kharab target ko dobara healthy maan kar traffic lagbhag kab milega?',
            choices: [
              'Lagbhag 120–150 s — wapas healthy hone ke liye har 30 s par kul 5 lagataar pass chahiye',
              'Lagbhag 0–5 s — pehle sahi jawab par target healthy hoga; agle 30 s tak rukna nahi padega',
              'Lagbhag 0–30 s — agli baari ka 1 pass kaafi; har 30 s par phir traffic chalta rahega',
              'Lagbhag 30–60 s — bahar jaane jaise 2 pass kaafi; har 30 s par wahi hadd lagti hai',
            ],
            answer: 0,
            hint: 'Table mein bahar jaane aur wapas aane ki hadd alag hai. Wapsi ke pass kitni door-door milenge?',
            explain: 'Pehle se unhealthy instance/IP target ko wapas healthy maanne ke liye 5 lagataar pass chahiye. Har 30 s ki baari par lagbhag 120–150 s lag sakte hain; theek samay baari aur jawab ki deri par nirbhar hai. Naya target pehli baar jodna alag hai. Documentation se hisaab hai, lab mein AWS par naapa nahi gaya.',
            choiceExplanations: [
              'Pehle se unhealthy instance/IP target ko wapas healthy maanne ke liye 5 lagataar pass chahiye. Har 30 s ki baari par lagbhag 120–150 s lag sakte hain; theek samay baari aur jawab ki deri par nirbhar hai. Naya target pehli baar jodna alag hai. Documentation se hisaab hai, lab mein AWS par naapa nahi gaya.',
              'Pehle se unhealthy target ki wapsi ka default 5 pass hai. Pehla sahi jawab akela poori hadd nahi hai.',
              'Ek pass wala niyam naye target ke pehli baar judne ka hai. Pehle se unhealthy target ki wapsi mein 5 pass chahiye.',
              'Bahar jaane ki hadd 2 fail hai, wapas aane ki hadd 5 pass. Dono haddon ko ek mat samjho.',
            ],
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
              <li><b>Fasla × hadd kitna hai?</b> Na likhi setting ka default kya hai?</li>
              <li><b>SIGTERM par app kya karta hai?</b> Kitni der jawab deta rehta hai — aur load balancer ko khabar pahunchne mein kitni der lagti hai?</li>
            </ol>`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> har poochhne wale ke teen number hote hain: <b>fasla</b>, <b>bahar jaane ki hadd</b>, <b>wapas aane ki hadd</b>. Aur ek niyam: saare ek saath "nahi" kahein toh kya? Chaaron sawaal apne setup mein dhoondo.',
    },

    /* ---------------- 4. bonus: asli library chalao ---------------- */
    {
      type: 'docker',
      title: '🐳 Bonus lab — @godaddy/terminus khud chalao',
      project: '43-health-checks',
      exercise: 'ex0-slowmo',
      goal: 'Wahi timeline, asli library ke saath. Pehle 2 second ke rukne ke saath, phir library ki default settings ke saath.',
      why: 'Lab mein koi npm dependency nahi hai; sirf terminus wale tool ko library chahiye. <code>npm install</code> isi folder mein chalao (Docker image mein terminus library nahi hai). Neeche ka output terminus 4.12.1 aur Node 24 par aaya tha.',
      steps: [
        { text: 'Library lagao (ek baar, isi folder mein).', cmd: 'cd docker-labs/43-health-checks && npm install @godaddy/terminus' },
        { text: 'Band hone se pehle 2 s rukne ke saath. 6.75 s wali line mein /livez dekho.', cmd: 'node tools/terminus.js', expect: "app :5229 · @godaddy/terminus · beforeShutdown: 2 s\n\n    samay   /livez   /readyz   /home      kya hua\n   0.25 s   200      200       200\n   0.75 s   200      200       200\n   1.25 s   200      200       200\n   1.50 s                                  💥 DB band\n   1.75 s   200      200       200\n   2.25 s   200      503       200\n   2.75 s   200      503       200\n   3.25 s   200      503       200\n   3.75 s   200      503       200\n   4.25 s   200      503       200\n   4.50 s                                  ✅ DB wapas\n   4.75 s   200      503       200\n   5.25 s   200      200       200\n   5.75 s   200      200       200\n   6.25 s   200      200       200\n   6.50 s                                  🛑 SIGTERM — band hone ka signal\n   6.75 s   503      503       200\n   7.25 s   503      503       200\n   7.75 s   503      503       200\n   8.25 s   503      503       200\n   8.50 s                                  app band" },
        { text: 'Ab library ki default settings. Aakhri do lines dekho.', cmd: 'node tools/terminus.js --no-delay', expect: "app :5229 · @godaddy/terminus · default settings (beforeShutdown nahi)\n\n    samay   /livez   /readyz   /home      kya hua\n   0.25 s   200      200       200\n   0.75 s   200      200       200\n   1.25 s   200      200       200\n   1.50 s                                  💥 DB band\n   1.75 s   200      200       200\n   2.25 s   200      503       200\n   2.75 s   200      503       200\n   3.25 s   200      503       200\n   3.75 s   200      503       200\n   4.25 s   200      503       200\n   4.50 s                                  ✅ DB wapas\n   4.75 s   200      503       200\n   5.25 s   200      200       200\n   5.75 s   200      200       200\n   6.25 s   200      200       200\n   6.50 s                                  🛑 SIGTERM — band hone ka signal\n   6.50 s                                  app band" },
      ],
      observe: {
        q: 'Default settings wale run mein 6.75 s wali line aayi hi nahi. Kyun?',
        choices: [
          'App 6.50 s par band ho gaya; 6.75 s ka agla sawaal poochhne tak tool bhi khatam tha',
          'DB 6.50 s par band ho gaya; 6.75 s ka sawaal tool ne DB fail hone ki wajah se roka',
          'Library ne 6.50 s par /livez hataaya; 6.75 s ka sawaal baaki raaston ke liye bhi roka',
          'Tool ne 6.50 s par ghadi badli; 6.75 s ki jagah agla sawaal kuch der baad rakha tha',
        ],
        answer: 0,
        explain: 'Default run mein SIGTERM ke baad app 6.50 s par hi band hua. App aur timeline dikhane wala tool ek process mein hain. Process band hone par 6.75 s ki line likhne wala code bhi nahi chala.',
        choiceExplanations: [
          'Default run mein SIGTERM ke baad app 6.50 s par hi band hua. App aur timeline dikhane wala tool ek process mein hain. Process band hone par 6.75 s ki line likhne wala code bhi nahi chala.',
          'DB 4.50 s par wapas aa chuka tha. Trace mein 6.50 s par app ka band hona wajah hai, DB ka fail hona nahi.',
          'Library ne sirf /livez nahi hataaya. Process hi band hua, toh saare raaston par agla sawaal ruk gaya.',
          'Tool ki agli tay baari 6.75 s thi. Beech mein process band hua; ghadi badalne ki koi branch nahi hai.',
        ],
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
          'Naya traffic rukne tak jawab dena aur liye hue kaam poore karna, dono ka samay naapo',
          'Library lagi hai toh band hona sahi hai; ab bas health ke sawaal aur tez poochhwao',
          'Pods ki ginti badhao aur turant band karo; naye pods purani list ki requests le lenge',
          'Bas liye hue kaam ka waqt badhao; naye traffic ki purani list se koi lena-dena nahi',
        ],
        answer: 0,
        explain: 'Band hone ke do hisse hain: naye traffic ke rukne tak jawab dena, phir liye hue kaam poore karna. Library ka asli bartav load balancer aur clients ke saath jaancho. Kul band hone ki chhoot mein dono hisse aane chahiye; library lagaana bina request gire deploy hone ka saboot nahi.',
        choiceExplanations: [
          'Band hone ke do hisse hain: naye traffic ke rukne tak jawab dena, phir liye hue kaam poore karna. Library ka asli bartav load balancer aur clients ke saath jaancho. Kul band hone ki chhoot mein dono hisse aane chahiye; library lagaana bina request gire deploy hone ka saboot nahi.',
          'Library ki settings aur load balancer ki deri phir bhi jaanchni hain. Sirf sawaal tez karne se purana port waqt se pehle band hone ka khatra nahi mit-ta.',
          'Zyada pods hone par bhi purani list kisi request ko band pod par bhej sakti hai. Pods ki ginti khabar turant nahi pahunchati.',
          'Purane kaam poore hone par bhi purani list se nayi request aa sakti hai. Naye traffic ke rukne ka samay alag sambhaalo.',
        ],
      },
      {
        q: '"AWS Application Load Balancer ke target group ke saare targets health check fail kar dein — users ko kya dikhega?"',
        choices: [
          'ALB fail open karke sab targets ko bhejega; user ka nateeja page ke kaam par nirbhar hai',
          'ALB traffic rok kar 503 dega; ek bhi healthy target na ho toh sab requests mana hongi',
          'ALB naye targets kholkar bhejega; health fail ka niyam instances ki ginti bhi badhaata hai',
          'ALB requests rok kar rakhega; pehla target healthy ho tab ruki requests bheji jaayengi',
        ],
        answer: 0,
        explain: 'Saare registered targets enabled zones mein unhealthy hon toh ALB fail open karta hai: health ko dekhe bina targets ko traffic bhejta hai. DB ke bina chalne wala page bach sakta hai; DB maangne wala page phir bhi fail ho sakta hai. Kubernetes Service ka niyam ALB par mat lagao.',
        choiceExplanations: [
          'Saare registered targets enabled zones mein unhealthy hon toh ALB fail open karta hai: health ko dekhe bina targets ko traffic bhejta hai. DB ke bina chalne wala page bach sakta hai; DB maangne wala page phir bhi fail ho sakta hai. Kubernetes Service ka niyam ALB par mat lagao.',
          'ALB ka sab targets unhealthy hone wala niyam fail open hai. Har request ko seedha 503 dena is haalat ka niyam nahi.',
          'Naye instances jodna alag service aur setting ka kaam hai. ALB ka health check khud instances launch nahi karta.',
          'Fail open mein request abhi unhealthy target ko bhi jaati hai. ALB sab requests ko target theek hone tak rakh nahi leta.',
        ],
      },
    ],
  },
  success: [
    'Kubernetes ke teeno probes aur teeno ke default number (10 s · 1 s · 3) bata sakte ho',
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
