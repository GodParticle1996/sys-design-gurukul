/* =====================================================================
   System Gurukul — 📟 Observability aur Kharcha (track pro-obs), hissa 1
   Kahani: ChaiPay. Levels: obs-cardinality, obs-trace.
   Purane levels (resil: observability, slo; feed: unitcost) ki buniyaad par — yahan production ke agle sawaal.
   Guides SD.guidanceExtra mein (data-guidance.js se PEHLE load).
   ===================================================================== */
(() => {
SD.tracks.push({
  id: 'pro-obs',
  icon: '📟',
  name: 'Observability aur Cloud ka Kharcha',
  blurb: 'ChaiPay ke production ke sawaal: metrics ka bill kyun phata (cardinality), ek payment 9 services mein kahan atki (tracing), alert kab jagaye (burn rate), kitne servers chahiye (capacity), cloud bill kaun kha raha hai (tags), ek payment ka kharcha kaise ghate (unit cost), aur raat 3 baje incident kaise chalaayein. Teen terminal missions.',
  certTitle: 'NIGRAANI NAWAB',
  certSub: 'Certificate of Observability and Cost',
  motto: 'Jo naapa nahi, woh na theek hota hai na sasta.',
  formula: 'Production = sahi signal + sahi alert + sahi capacity + har feature ka bill',
  alwaysUnlocked: true,
});

SD.registerLevels('pro-obs', [
/* ---------------------------------------------------------------- O1 */
{
  id: 'obs-cardinality',
  icon: '🏷️',
  title: 'Metrics ka bill — cardinality ka dhamaka',
  badge: 'Label Laat Saheb',
  objectives: [
    'Ek metric, kitni <b>time series</b>: labels ka guna',
    '<code>merchant_id</code> label monitoring ko kyun gira deta hai',
    'Average nahi, <b>histogram</b> se p99 — aur do p99 ka average kyun galat',
    'Kaunsi jaankari metric mein, kaunsi log ya trace mein',
  ],
  lesson: [
    `<h3>📒 Misaal: Sharma ji ka bikri register</h3>
     <p>Sharma ji har mithai ka har din ka alag page banate hain. 20 mithaiyan × 30 din = <b>600 page</b>. Theek hai.</p>
     <p>Phir socha: har grahak ka bhi alag page. 1 lakh grahak × 600 = <b>6 crore page</b>. Register phat gaya.</p>
     <p class="tip">🎯 <b>Asli baat:</b> metrics system mein har label value ka har combination ek alag <b>time series</b> hai — ek alag page.
       Memory, storage aur query ka kharcha series ki ginti se badhta hai. Isse <b>cardinality</b> kehte hain.</p>`,
    `<h3>🧮 ChaiPay ka hisaab</h3>
     <pre>http_requests_total{method, route, status, instance}
4 methods × 50 routes × 8 status × 20 instances = 32,000 series (zyada se zyada)</pre>
     <p>Ek developer ne <code>merchant_id</code> label jod diya. 40,000 merchants:</p>
     <pre>32,000 × 40,000 = 128 crore series (zyada se zyada)</pre>
     <p>Saare combinations nahi banenge, par crore mein bhi aaye toh monitoring ki memory phat jaati hai, aur bill bhi.</p>
     <p><b>Niyam:</b> label ki values gini-chuni hon (darjan, sau). <code>user_id</code>, <code>merchant_id</code>, <code>request_id</code>, email, poora URL — label nahi.
       Ye cheezein <b>logs aur traces</b> mein rakho.</p>`,
    `<h3>📊 Average jhooth bolta hai</h3>
     <p>Average latency 120 ms. Par 1% payments 3 second le rahi hain. Average ne unhe chhupa diya.</p>
     <p><b>Histogram</b> requests ko buckets mein ginta hai (≤50 ms, ≤100 ms, ≤250 ms, …). Buckets se p99 nikalta hai.</p>
     <ul>
       <li>Do servers ka p99 100 ms aur 900 ms. Poore service ka p99 <b>500 ms nahi</b>. Dono ke buckets jodo, phir p99 nikaalo.</li>
       <li>Histogram bhi series badhata hai: har bucket ek series, upar se <code>_sum</code> aur <code>_count</code>.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — kitni series?',
      goal: 'Labels ka guna khud gino. Ek label kaise poora system hila deta hai.',
      problems: [
        {
          q: 'http_requests_total: 4 methods × 50 routes × 8 status codes × 20 instances. Zyada se zyada kitni series?',
          unit: 'series',
          given: ['4 methods', '50 routes', '8 status codes', '20 instances'],
          answer: 32000,
          tol: 0.05,
          steps: ['4 × 50 = 200', '200 × 8 = 1,600', '1,600 × 20 = 32,000'],
          lesson: 'Har label ek guna hai. Chaar chhote labels bhi hazaaron series bana dete hain.',
        },
        {
          q: 'Ab merchant_id label joda (40,000 merchants). Zyada se zyada kitni series? Jawab CRORE mein do.',
          unit: 'crore',
          given: ['32,000 series pehle se', '40,000 merchants', '1 crore = 1,00,00,000'],
          answer: 128,
          tol: 0.05,
          steps: ['32,000 × 40,000 = 1,28,00,00,000', '1,28,00,00,000 ÷ 1,00,00,000 = 128 crore'],
          lesson: 'Ek bina-hadd wala label ne series ko 40,000 guna kar diya. Isliye merchant_id log mein, label mein nahi.',
        },
        {
          q: 'Latency histogram mein 12 buckets. Har (route, instance) par bucket series + _sum + _count. 50 routes × 20 instances par kitni series?',
          unit: 'series',
          given: ['12 buckets', '+ _sum + _count = 2 aur', '50 routes × 20 instances = 1,000'],
          answer: 14000,
          tol: 0.05,
          steps: ['Har combination: 12 + 2 = 14 series', '14 × 1,000 = 14,000'],
          lesson: 'Histogram mehenga hai, par p99 ke liye zaroori. Buckets aur labels soch ke chuno.',
        },
      ],
    },
    {
      type: 'bins',
      title: 'Label banao ya log mein rakho?',
      instructions: 'Har jaankari ko sahi jagah daalo.',
      bins: [
        { id: 'label', label: '🏷️ Metric label' },
        { id: 'log', label: '📜 Log / trace mein' },
      ],
      items: [
        { text: 'HTTP method (GET, POST, PUT, DELETE)', bin: 'label', explain: 'Gini-chuni values. Label ke liye sahi.' },
        { text: 'merchant_id (40,000 merchants)', bin: 'log', explain: 'Bina hadd ki values. Label banaya toh series 40,000 guna.' },
        { text: 'Status code class (2xx, 4xx, 5xx)', bin: 'label', explain: 'Teen-chaar values. Error rate ke liye zaroori.' },
        { text: 'request_id', bin: 'log', explain: 'Har request ka naya. Label banaya toh har request ek nayi series.' },
        { text: 'Route template /v1/orders/:id', bin: 'label', explain: 'Template gini-chuni hai (50 routes). Poora URL nahi.' },
        { text: 'Poora URL /v1/orders/9001', bin: 'log', explain: 'Har order ki id alag. Template label mein, poora URL log mein.' },
        { text: 'Region (3 regions)', bin: 'label', explain: 'Teen values. Region ka failure dekhne ke kaam ki.' },
        { text: 'User ka email', bin: 'log', explain: 'Bina hadd + personal data. Log mein bhi mask karke.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Metrics ke faisle',
      questions: [
        {
          q: 'Do servers ka p99: 100 ms aur 900 ms. Poore payment service ka p99 kya hai?',
          choices: [
            'Seedha nahi milta; dono ke histogram buckets jodo, phir p99 nikaalo',
            '500 ms; dono servers ke p99 ka average hi poore service ka p99 hai',
            '900 ms; sabse bade server ka p99 hi poore service ka p99 hota hai',
            '100 ms; zyada traffic wala server hi poore service ka p99 tay karta hai',
          ],
          answer: 0,
          explain: 'Percentiles ka average nahi hota. Jawab traffic ke bantwaare par nirbhar hai. Histogram buckets jodne layak hain: dono ke buckets jodo, phir poore data ka p99 nikaalo.',
          choiceExplanations: [
            'Percentiles ka average nahi hota. Jawab traffic ke bantwaare par nirbhar hai. Histogram buckets jodne layak hain: dono ke buckets jodo, phir poore data ka p99 nikaalo.',
            'Average tabhi sahi hota jab percentiles jod sakte. Ek server 99% traffic le toh jawab 100 ms ke paas hoga.',
            'Agar dheema server sirf 1% traffic leta hai, toh poore service ka p99 900 ms se kaafi kam ho sakta hai.',
            'Traffic ka bantwaara jawab badalta hai, par dheeme server ki tail bhi poore p99 mein aati hai.',
          ],
        },
        {
          q: 'Support ticket: "Sharma Sweets ke payments dheeme." merchant_id label nahi hai. Kaise dekhoge?',
          choices: [
            'Logs ya traces mein merchant_id hai; us merchant ki requests filter karo',
            'merchant_id ko bas aaj ke liye label bana do, kal hata dena, koi khatra nahi',
            'Kuch nahi ho sakta; metrics ke label ke bina kisi merchant ki latency nahi milti',
            'Merchant se screen recording maango aur latency ka andaaza wahin se lagao',
          ],
          answer: 0,
          explain: 'Ek merchant ka sawaal ek "event" ka sawaal hai — logs aur traces isi ke liye hain. Metrics poore system ka rujhaan batate hain, logs aur traces ek-ek request ki kahani.',
          choiceExplanations: [
            'Ek merchant ka sawaal ek "event" ka sawaal hai — logs aur traces isi ke liye hain. Metrics poore system ka rujhaan batate hain, logs aur traces ek-ek request ki kahani.',
            'Ek din mein bhi 40,000 guna series ban sakti hain, aur retention tak storage mein rehti hain. Monitoring hi gir sakti hai.',
            'Structured logs mein merchant_id aur latency ho toh query se mil jaata hai.',
            'Andaaza saboot nahi. Data tumhare logs mein pehle se hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Metrics',
    instructions: 'Observability ke production sawaal. 🎤',
    questions: [
      {
        q: 'Monitoring ka bill 3 mahine mein 4 guna ho gaya. Kya jaanchoge?',
        choices: [
          'Sabse zyada series wale metrics; bina-hadd labels; logs ka volume aur retention',
          'Monitoring vendor badal do; naya vendor har series ke kam paise leta hai',
          'Metrics band karke sirf logs rakho; logs sab kuch bata dete hain',
          'Scrape interval 15 s se 1 s karo, taaki har data point pakka mile',
        ],
        answer: 0,
        explain: 'Bill aksar kuch metrics ke bina-hadd labels se phatta hai. Top series dhoondho, labels theek karo, aur logs ka volume aur kitne din rakhte ho, dekho.',
        choiceExplanations: [
          'Bill aksar kuch metrics ke bina-hadd labels se phatta hai. Top series dhoondho, labels theek karo, aur logs ka volume aur kitne din rakhte ho, dekho.',
          'Naya vendor bhi series ke hisaab se lega. Jad wahi rahegi.',
          'Logs se rujhaan aur alerts mehenge aur dheeme bante hain. Dono ka alag kaam hai.',
          '15 guna zyada data points = bill aur badhega.',
        ],
      },
      {
        q: 'Latency ka alert average par lagaoge ya p99 par?',
        choices: [
          'p99 ya SLO par; average dheemi tail ko chhupa deta hai',
          'Average par; average sabse sthir hai, alerts kam bajenge',
          'Max par; ek bhi dheemi request aaye toh turant page karo',
          'Kisi par nahi; latency ka alert hota hi nahi, sirf errors ka',
        ],
        answer: 0,
        explain: 'Users tail mehsoos karte hain. p99 (ya SLO jaise "99% payments 1 s ke andar") asli dard pakadta hai. Max ek akeli ajeeb request par bhi bajega.',
        choiceExplanations: [
          'Users tail mehsoos karte hain. p99 (ya SLO jaise "99% payments 1 s ke andar") asli dard pakadta hai. Max ek akeli ajeeb request par bhi bajega.',
          '1% payments 3 second lein, average phir bhi 120 ms dikha sakta hai.',
          'Ek GC pause ya ek dheemi request par raat ko page = thaki hui on-call team.',
          'Dheema payment bhi toota hua payment hai users ke liye. Latency ka SLO zaroori hai.',
        ],
      },
    ],
  },
  success: [
    'Labels se series ki ginti nikaalna',
    'Bina-hadd values ko label se bahar rakhna',
    'Histogram se p99 aur percentiles ko sahi jodna',
  ],
  homework: `Kisi bhi Prometheus (ya apne project ke metrics) mein ye query chalao:
    topk(10, count by (__name__)({__name__=~".+"}))
    Kaunse 10 metrics sabse zyada series bana rahe hain? Unke labels dekho — koi bina-hadd label hai?`,
  cards: [
    { front: 'Cardinality?', back: 'Har label values ka combination = ek time series. Labels guna hote hain, jodte nahi.' },
    { front: 'merchant_id label kyun nahi?', back: '40,000 values → series 40,000 guna. Log aur trace mein rakho.' },
    { front: 'Do p99 ka average?', back: 'Galat. Histogram buckets jodo, phir p99 nikaalo.' },
    { front: 'Metric vs log?', back: 'Metric: poore system ka rujhaan, sasta, alerts. Log/trace: ek request ki kahani, bina-hadd details.' },
  ],
},

/* ---------------------------------------------------------------- O2 */
{
  id: 'obs-trace',
  icon: '🧵',
  title: 'Distributed tracing — ek payment, kai services',
  badge: 'Dhaaga Dhoondhu',
  objectives: [
    '<b>Trace</b> aur <b>span</b>: ek request ki poori kahani',
    'trace id ek service se doosri tak kaise jaata hai (<code>traceparent</code> header)',
    'Sampling: shuru mein (head) ya ant mein (tail) — kya chhoot jaata hai',
    'Har log mein trace_id: metric → trace → log ka raasta',
  ],
  lesson: [
    `<h3>📦 Misaal: courier ka tracking number</h3>
     <p>Parcel 5 godowns se guzarta hai. Har godown scan karta hai: kab aaya, kab gaya. Tracking number se poori yatra ek page par.</p>
     <p>Ek godown scan bhool gaya? Kahani wahin toot gayi.</p>
     <p class="tip">🎯 <b>Asli baat:</b> <b>trace</b> = ek request ki poori yatra. <b>Span</b> = yatra ka ek hissa (ek service ka kaam): shuru, ant, aur kis span ke andar.
       trace id har call ke saath aage jaata hai. Ek service bhi bhooli toh trace toot jaata hai.</p>`,
    `<h3>💳 ChaiPay ki ek payment</h3>
     <pre>app → api-gateway → payment-api ─┬→ fraud-check          120 ms
                                 ├→ wallet-api → ledger-db  80 ms
                                 └→ bank-adapter → partner bank  1,900 ms ⚠️
total: 2.4 s</pre>
     <p>Waterfall dekhte hi pata chala: <b>bank-adapter</b> mein 1.9 s, andar 3 retries.</p>
     <p>trace id kaise pahuncha? Har HTTP call ke header mein (W3C Trace Context):</p>
     <pre>traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ver  trace id (32 hex)                 parent span id    flags (01 = sampled)</pre>
     <p>Queue (Kafka) ke through async kaam? Trace context message ke headers mein jaata hai.</p>`,
    `<h3>🎯 Sampling: sab rakhoge toh bill, kam rakhoge toh chhootega</h3>
     <table>
       <tr><th>Tareeka</th><th>Kaise</th><th>Kamzori</th></tr>
       <tr><td><b>Head sampling</b></td><td>Request ke shuru mein faisla: 1% rakho</td><td>Sasta. Par 0.05% failed payments ka trace 99% baar nahi milega</td></tr>
       <tr><td><b>Tail sampling</b></td><td>Poora trace collector mein ruk ke dekho: saare errors + saare dheeme (&gt;1 s) + 1% normal</td><td>Behtar chunav. Collector ko poora trace memory mein rakhna padta hai</td></tr>
     </table>
     <h3>🔗 Teeno signals jodo</h3>
     <p>Alert (p99 badha) → us waqt ka ek trace → sabse lamba span → us span ke <code>trace_id</code> se logs. Har log line mein trace_id likho.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 Payment p99 2.4 second',
      instructions: 'Trace waterfall haath mein hai. Sahi kadam chuno.',
      pager: `<b>#payments-oncall</b> — 7:20 PM<br>
        payment-api p99: <b>2.4 s</b> (SLO: 99% payments 1 s ke andar). Error rate theek.<br>
        Ek dheema trace: fraud-check 120 ms · wallet-api 80 ms · <b>bank-adapter 1,900 ms</b> (andar 3 child spans, har ek ~600 ms, do timeout).`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehle kahan dekhoge?',
          choices: [
            { t: 'Sabse lamba span: bank-adapter ke andar ke teen child spans', good: true, next: 'why', explain: 'Waterfall ka faayda yahi hai: 2.4 s mein se 1.9 s ek jagah. Wahin ghuso.' },
            { t: 'payment-api ka CPU graph; dheemi API aksar CPU se hoti hai', good: false, explain: 'Trace bata raha hai ki payment-api intezaar kar rahi hai, kaam nahi. CPU graph galat jagah hai.' },
            { t: 'Saari services restart karo; aksar restart se theek ho jaata hai', good: false, explain: 'Bina wajah jaane restart se saboot mit jaata hai, aur partner bank ka dheemapan restart se nahi jaayega.' },
            { t: 'ledger-db ke indexes dekho; DB hi aksar dheema hota hai', good: false, explain: 'Trace mein wallet-api + ledger-db sirf 80 ms. Data andaaze se behtar hai.' },
          ],
        },
        why: {
          sitrep: '🔍 Teen child spans: bank call 600 ms timeout → retry → 600 ms timeout → retry → 700 ms success.',
          text: 'Itna samay kyun?',
          choices: [
            { t: 'Bank dheema hai; har timeout par retry, toh wait teen baar jud gaya', good: true, next: 'fix', explain: 'Do timeouts + ek success = 1.9 s. Retry ne dheemi dependency ki wait ko teen guna kar diya.' },
            { t: 'Network packet loss; trace ke spans galat time dikha rahe hain', good: false, explain: 'Teen spans saaf alag call dikha rahe hain. Trace ka time yahan ka saboot hai.' },
            { t: 'fraud-check ne bank-adapter ko block kar rakha tha', good: false, explain: 'fraud-check 120 ms mein khatam ho gaya. Spans parallel the.' },
            { t: 'Tracing ka overhead hi 1.9 s le raha hai', good: false, explain: 'Tracing ka kharcha microseconds mein hota hai, second mein nahi.' },
          ],
        },
        fix: {
          sitrep: '📈 Partner bank ka apna p99 abhi 650 ms (aam din: 200 ms).',
          text: 'Kya badloge?',
          choices: [
            { t: 'Retries kam aur backoff ke saath; timeout ke baad status check, dobara debit nahi', good: true, next: 'end', explain: 'Payment ka retry khatarnaak hai: pehli call shayad safal hui ho. Status check se pakka karo, aur kul samay ki hadd rakho.' },
            { t: 'Timeout 5 second kar do; koi call timeout hi nahi hogi', good: false, explain: 'Har payment 5 s tak latak sakti hai. Threads aur connections bhar jaayenge.' },
            { t: 'Tracing band karo; trace mein dheemapan dikh raha hai, toh trace hi wajah hai', good: false, explain: 'Trace ne sirf dikhaya. Thermometer todne se bukhaar nahi jaata.' },
            { t: 'bank-adapter ke pods double karo; zyada pods, zyada tez', good: false, explain: 'Dheemapan partner bank mein hai. Zyada pods bank par aur load daalenge.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. Waterfall ne 2.4 s ka 80% ek jagah dikha diya.',
          summary: `<b>Seekh:</b> trace batata hai <i>kahan</i> waqt gaya. Metric sirf itna batata hai ki waqt gaya.
            <br><br><b>Teen niyam:</b>
            <br>1. Sabse lamba span pehle.
            <br>2. Retry dheemi dependency ki wait ko guna kar deta hai.
            <br>3. Payment par retry se pehle status check — dobara debit nahi.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Tracing ke faisle',
      questions: [
        {
          q: 'trace id ek service se doosri service tak kaise pahunchta hai?',
          choices: [
            'Har outgoing call ke header mein (traceparent); agli service usi trace mein span banati hai',
            'Har service apna naya trace id banati hai; baad mein timestamps se sab jod lete hain',
            'Database mein ek trace table hai; har service wahan apni line likh deti hai',
            'Load balancer apne aap saari services ko trace id bata deta hai, code nahi',
          ],
          answer: 0,
          explain: 'Context propagation: client header mein traceparent bhejta hai, server use padh ke apna span usi trace mein, parent span ke neeche banata hai. OpenTelemetry jaise libraries ye kaam karti hain.',
          choiceExplanations: [
            'Context propagation: client header mein traceparent bhejta hai, server use padh ke apna span usi trace mein, parent span ke neeche banata hai. OpenTelemetry jaise libraries ye kaam karti hain.',
            'Hazaaron requests ek saath chalti hain; timestamps se jodna andaaza hai, kahani nahi.',
            'Har span ke liye DB write bahut mehenga aur dheema. Spans collector ko jaate hain.',
            'Load balancer header jod sakta hai, par service ko apne outgoing calls mein aage bhejna padta hai.',
          ],
        },
        {
          q: '1% head sampling hai. 0.05% payments fail hote hain. Dikkat?',
          choices: [
            'Zyadatar failed payments ka trace rakha hi nahi jaata; errors ke liye tail sampling',
            'Koi dikkat nahi; 1% sample mein har tarah ki request apne aap aa jaati hai',
            'Sampling 100% kar do; traces ka kharcha itna kam hai ki farak nahi padta',
            'Errors sirf logs mein dekho; failed payment ke liye trace ki zaroorat nahi',
          ],
          answer: 0,
          explain: 'Head sampling shuru mein faisla karta hai, jab pata nahi ki request fail hogi. 99% failed payments ka trace gaya. Tail sampling poora trace dekh ke errors aur dheemi requests rakhta hai.',
          choiceExplanations: [
            'Head sampling shuru mein faisla karta hai, jab pata nahi ki request fail hogi. 99% failed payments ka trace gaya. Tail sampling poora trace dekh ke errors aur dheemi requests rakhta hai.',
            'Rare cheezein 1% sample mein rare hi rehti hain. 0.05% ka 1% bahut kam traces.',
            'Bade system mein 100% traces ka storage aur network bill bada hota hai.',
            'Logs batate hain kya fail hua; trace batata hai kis service ke kis kadam par aur kitna samay.',
          ],
        },
        {
          q: 'Payment ke baad notify-service Kafka se message padhti hai. Trace kaise jude?',
          choices: [
            'Message headers mein trace context; consumer ka span parent ya link se jude',
            'Async kaam mein trace ho hi nahi sakta; notify ko alag se debug karo',
            'Consumer apna naya trace banaye; payment ka trace alag hi rehna chahiye',
            'Message body mein poore trace ka JSON daal do, taaki sab kuch saath jaaye',
          ],
          answer: 0,
          explain: 'HTTP header ki tarah Kafka message headers mein traceparent jaata hai. Consumer span payment ke trace se parent ya link ke zariye judta hai — "payment ke kitni der baad SMS gaya" dikh jaata hai.',
          choiceExplanations: [
            'HTTP header ki tarah Kafka message headers mein traceparent jaata hai. Consumer span payment ke trace se parent ya link ke zariye judta hai — "payment ke kitni der baad SMS gaya" dikh jaata hai.',
            'Async mein bhi context propagation hota hai — message headers ke zariye.',
            'Alag trace mein payment aur SMS ka rishta kho jaata hai. Link se dono jude rehte hain.',
            'Poora trace message mein bhejna bhaari hai. Sirf context (trace id, span id) chahiye.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Tracing',
    instructions: 'Microservices debugging ke sawaal. 🎤',
    questions: [
      {
        q: '12 microservices mein ek request dheemi hai. Kaise dhoondhoge?',
        choices: [
          'Trace waterfall mein sabse lamba span, phir us span ke trace_id se logs',
          'Har service ke logs alag-alag padho; timestamps milaa ke kahani khud jodo',
          'Har service ka CPU graph dekho; jiska CPU sabse zyada, wahi dheemi hai',
          'Ek-ek service ko band karke dekho; jisse band karne par tez ho, wahi hai',
        ],
        answer: 0,
        explain: 'Trace ek request ki poori yatra ek page par deta hai. Sabse lamba span batata hai kahan ghusna hai. Logs us span ki detail dete hain.',
        choiceExplanations: [
          'Trace ek request ki poori yatra ek page par deta hai. Sabse lamba span batata hai kahan ghusna hai. Logs us span ki detail dete hain.',
          '12 services ke logs haath se jodna ghanton ka kaam, aur bheed mein requests mil jaati hain.',
          'Dheemapan aksar intezaar hai (network, lock, dependency), CPU nahi.',
          'Production mein services band karna khud outage hai.',
        ],
      },
      {
        q: 'Head sampling vs tail sampling — kab kya?',
        choices: [
          'Head sasta aur seedha; tail tab jab errors aur dheemi requests sab chahiye',
          'Head har haal mein behtar; tail sampling sirf chhote systems mein chalta',
          'Tail sasta hai kyunki kam data bhejta hai; head mein sab bhejna padta hai',
          'Dono ek jaise; farak sirf naam ka hai, kaam ka nahi',
        ],
        answer: 0,
        explain: 'Head: shuru mein random faisla, koi buffering nahi. Tail: poora trace dekh ke faisla, isliye collector ko spans rok ke rakhne padte hain — par rare errors bachte hain.',
        choiceExplanations: [
          'Head: shuru mein random faisla, koi buffering nahi. Tail: poora trace dekh ke faisla, isliye collector ko spans rok ke rakhne padte hain — par rare errors bachte hain.',
          'Head rare errors chhod deta hai. Bade systems mein bhi tail sampling chalta hai, collectors ke saath.',
          'Tail mein services saare spans collector ko bhejti hain; faisla baad mein hota hai. Network ka kharcha zyada.',
          'Faisla kab hota hai, isi se fark padta hai: shuru mein ya poora trace dekh ke.',
        ],
      },
    ],
  },
  success: [
    'Trace waterfall se dheemi jagah dhoondhna',
    'Context propagation (HTTP aur queue dono) samjhana',
    'Head aur tail sampling mein se chunna',
  ],
  homework: `Kisi chhote Node ya Python app mein OpenTelemetry ka auto-instrumentation lagao aur Jaeger (Docker) mein trace dekho.
    Do services banao jo ek doosre ko call karein. Header mein traceparent dikh raha hai? Ek service mein propagation band karke dekho — trace kaise toot-ta hai?`,
  cards: [
    { front: 'Trace vs span?', back: 'Trace = ek request ki poori yatra. Span = ek hissa (service/kaam), parent ke saath.' },
    { front: 'traceparent?', back: 'W3C header: version-traceid-parentspanid-flags. Har outgoing call mein aage bhejo.' },
    { front: 'Head vs tail sampling?', back: 'Head: shuru mein random, sasta, rare errors chhoot-te hain. Tail: poora trace dekh ke, errors bachte hain, collector bhaari.' },
    { front: 'Signals kaise jodein?', back: 'Alert → trace → sabse lamba span → trace_id se logs. Har log mein trace_id.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['obs-cardinality'] = {
  t: 'Har label ek guna hai',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">4 methods</span><span class="dg-arrow">×</span>
      <span class="dg-pill">50 routes</span><span class="dg-arrow">×</span>
      <span class="dg-pill">8 status</span><span class="dg-arrow">×</span>
      <span class="dg-pill">20 instances</span><span class="dg-arrow">=</span>
      <span class="dg-pill good">32,000 series</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill good">32,000</span><span class="dg-arrow">×</span>
      <span class="dg-pill bad">40,000 merchant_id</span><span class="dg-arrow">=</span>
      <span class="dg-pill bad">128 crore series 💥</span>
    </div>
    <div class="dg-cap">Gini-chuni values label mein. merchant_id, request_id, email, poora URL — log aur trace mein.</div>`,
};
VISUALS['obs-trace'] = {
  t: 'Waterfall: 2.4 s kahan gaye?',
  html: `
    <div class="dg-stack">
      <div class="dg-node"><span class="ni">🚪</span><span class="nl">api-gateway → payment-api</span><span class="ns">poora span: 2,400 ms</span></div>
      <div class="dg-node is-good"><span class="ni">🕵️</span><span class="nl">fraud-check</span><span class="ns">120 ms</span></div>
      <div class="dg-node is-good"><span class="ni">💰</span><span class="nl">wallet-api → ledger-db</span><span class="ns">80 ms</span></div>
      <div class="dg-node is-bad"><span class="ni">🏦</span><span class="nl">bank-adapter</span><span class="ns">1,900 ms = 600 timeout + 600 timeout + 700 success</span></div>
    </div>
    <div class="dg-cap">Har call ke header mein <code>traceparent</code>. Sabse lamba span pehle dekho.</div>`,
};

SD.addScenes({
  'obs-cardinality': {
    intro: 'ChaiPay ki metric <code>http_requests_total</code>. Ek developer ek label jodne wala hai.',
    nodes: [
      { id: 'app', col: 0, row: 0, icon: '⚙️', label: 'payment-api', sub: '20 instances' },
      { id: 'prom', col: 2, row: 0, icon: '📈', label: 'Metrics store', sub: '32,000 series' },
      { id: 'logs', col: 2, row: 1, icon: '📜', label: 'Logs / traces', sub: 'har request ki kahani' },
      { id: 'bill', col: 3, row: 0, icon: '💸', label: 'Monitoring bill' },
    ],
    steps: [
      { from: 'app', to: 'prom', label: 'method·route·status', say: '4 methods × 50 routes × 8 status × 20 instances. Zyada se zyada 32,000 series. Theek.' },
      { from: 'app', to: 'prom', label: '+ merchant_id', tone: 'bad', set: { prom: { tone: 'bad', sub: '128 crore tak!' } }, say: 'Developer ne merchant_id label joda. 40,000 merchants: series 40,000 guna, 128 crore tak.' },
      { from: 'prom', to: 'bill', label: 'memory + storage', tone: 'bad', set: { bill: { tone: 'bad', sub: '4 guna' } }, say: 'Metrics store ki memory phatti hai, queries dheemi, aur bill kai guna.' },
      { at: ['prom'], set: { prom: { tone: 'good', sub: '32,000 series' } }, say: 'Ilaaj: merchant_id label se hatao. Label mein sirf gini-chuni values.' },
      { from: 'app', to: 'logs', label: 'merchant_id, trace_id', tone: 'good', say: 'merchant_id har log line aur trace mein. Ek merchant ka sawaal wahan se filter karo.' },
      { at: ['prom'], set: { prom: { tone: 'gold', sub: 'histogram: p99' } }, say: 'Latency ke liye histogram buckets. Do servers ka p99 average mat karo; buckets jodo, phir p99 nikaalo.' },
    ],
  },
  'obs-trace': {
    intro: 'Ek payment ka p99 <b>2.4 second</b>. Trace se dekho waqt kahan gaya.',
    nodes: [
      { id: 'gw', col: 0, row: 1, icon: '🚪', label: 'api-gateway', sub: 'trace shuru' },
      { id: 'pay', col: 1, row: 1, icon: '💳', label: 'payment-api', sub: '2,400 ms' },
      { id: 'fraud', col: 2, row: 0, icon: '🕵️', label: 'fraud-check' },
      { id: 'wallet', col: 2, row: 1, icon: '💰', label: 'wallet-api' },
      { id: 'bank', col: 2, row: 2, icon: '🏦', label: 'bank-adapter' },
      { id: 'partner', col: 3, row: 2, icon: '🏛️', label: 'Partner bank', sub: 'p99 650 ms' },
    ],
    steps: [
      { from: 'gw', to: 'pay', label: 'traceparent: 00-4bf9…', say: 'Gateway trace shuru karta hai. trace id header mein payment-api tak jaata hai.' },
      { from: 'pay', to: 'fraud', label: '120 ms', tone: 'good', set: { fraud: { tone: 'good', sub: '120 ms' } }, say: 'fraud-check ka span: 120 ms. Wahi trace id, naya span.' },
      { from: 'pay', to: 'wallet', label: '80 ms', tone: 'good', set: { wallet: { tone: 'good', sub: '80 ms' } }, say: 'wallet-api aur ledger-db: 80 ms.' },
      { from: 'pay', to: 'bank', label: '1,900 ms', tone: 'bad', set: { bank: { tone: 'bad', sub: '1,900 ms' } }, say: 'bank-adapter ka span: 1,900 ms. 2.4 second mein se zyadatar yahin.' },
      { from: 'bank', to: 'partner', label: '600 ms timeout × 2', tone: 'bad', say: 'Andar teen child spans: 600 ms timeout, retry, 600 ms timeout, retry, 700 ms success.' },
      { at: ['bank'], set: { bank: { tone: 'gold', sub: 'retry kam + status check' } }, say: 'Ilaaj: retries kam, backoff ke saath. Timeout ke baad payment ka status check — dobara debit nahi.' },
      { at: ['gw'], set: { gw: { tone: 'gold', sub: 'tail sampling' } }, say: 'Sampling: saare errors aur dheeme traces rakho (tail sampling). 1% head sampling rare failures chhod deta hai.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-obs-card', levels: 'obs-cardinality', guide: {
    title: 'Label banao ya log mein likho?',
    misaal: 'Sharma ji ke register mein har mithai × har din ka page theek tha. Har grahak ka page joda toh register phat gaya.',
    asli: 'Har label combination ek time series hai. Gini-chuni values label mein; bina-hadd values log aur trace mein.',
    points: [
      '<b>Guna:</b> labels jodte nahi, guna hote hain.',
      '<b>Bina hadd:</b> user_id, merchant_id, request_id, poora URL — label nahi.',
      '<b>Percentile:</b> histogram buckets jodo; p99 ka average nahi.',
    ],
    use: 'Naya metric ya naya label jodna ho, ya monitoring ka bill achanak badha ho.',
    avoid: 'Ek merchant ke debugging ke liye permanent label mat jodo.',
    mistake: 'Do servers ke p99 ka average nikaal ke service ka p99 bolna.',
    compare: [
      { choice: 'Metric label', when: 'Values gini-chuni hon aur alert ya rujhaan chahiye', tradeoff: 'Sasta aur tez; har nayi value ek nayi series' },
      { choice: 'Log / trace field', when: 'Values bina hadd hon ya ek request ki kahani chahiye', tradeoff: 'Har detail mil jaati hai; volume ka bill aur query dheemi' },
    ],
    followup: 'Business ko har merchant ka daily success rate chahiye dashboard par. Metric label ke bina kaise doge?',
    sources: [
      'signals',
      { title: 'Prometheus — Metric and label naming (cardinality warning)', url: 'https://prometheus.io/docs/practices/naming/' },
      { title: 'Prometheus — Histograms and summaries', url: 'https://prometheus.io/docs/practices/histograms/' },
    ],
  } },
  { id: 'pro-obs-trace', levels: 'obs-trace', guide: {
    title: 'Sab traces rakho ya chun ke?',
    misaal: 'Courier ka tracking number har godown par scan hota hai. Har parcel ki har scan saalon rakhna mehenga hai; khoye hue parcel ki scan zaroor chahiye.',
    asli: 'Trace ek request ki poori yatra hai. trace id har call ke header mein aage jaata hai. Sampling tay karta hai ki kaunsi yatra bachegi.',
    points: [
      '<b>Propagation:</b> HTTP aur queue dono mein traceparent aage bhejo.',
      '<b>Head:</b> sasta; rare errors chhoot-te hain.',
      '<b>Tail:</b> errors aur dheemi requests bachti hain; collector bhaari.',
    ],
    use: 'Kai services mein ek request dheemi ho aur kahan, ye pata na ho.',
    avoid: 'Rare failures dhoondhne ke liye sirf 1% head sampling par bharosa mat karo.',
    mistake: 'Ek service mein propagation bhool jaana — trace wahin toot-ta hai.',
    compare: [
      { choice: 'Head sampling', when: 'Traffic bahut aur bajat kam; aam rujhaan chahiye', tradeoff: 'Seedha aur sasta; rare errors aur tail chhoot sakte hain' },
      { choice: 'Tail sampling', when: 'Errors aur dheemi requests ka har trace chahiye', tradeoff: 'Behtar chunav; collector memory aur routing ka kaam' },
    ],
    followup: 'Tail sampling collector 3 machines par hai. Ek trace ke spans alag machines par pahunche toh kya hoga?',
    sources: [
      'traces',
      { title: 'W3C — Trace Context (traceparent header)', url: 'https://www.w3.org/TR/trace-context/' },
      { title: 'OpenTelemetry — Sampling (head and tail)', url: 'https://opentelemetry.io/docs/concepts/sampling/' },
    ],
  } },
);
})();
