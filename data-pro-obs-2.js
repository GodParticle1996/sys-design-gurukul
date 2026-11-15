/* =====================================================================
   System Gurukul — 📟 Observability aur Kharcha (track pro-obs), hissa 2
   Levels: obs-burn (burn-rate alerts), obs-capacity (capacity mission).
   ===================================================================== */
(() => {
const capLatest = (s, op) => SD.mission.latest(s, 'capacity', op);
const capFixed = s => {
  const p = capLatest(s, 'plan'), f = capLatest(s, 'fail');
  return !!p && !!f && p.peak === 2400 && p.per === 400 && p.target <= 70 && p.spare >= 1 && f.servers === p.servers && f.peak === 2400 && f.per === 400 && f.survived === true;
};
const T_CAP = [
  { text: 'Seedha hisaab: peak 2,400 ÷ 400 per server, 100% target',
    check: s => s.records.some(r => r.kind === 'capacity' && r.op === 'plan' && r.peak === 2400 && r.per === 400 && r.target === 100 && r.servers === 6) },
  { text: '6 servers mein se 1 mara — baaki 5 jhel paaye?',
    check: s => s.records.some(r => r.kind === 'capacity' && r.op === 'fail' && r.servers === 6 && r.peak === 2400 && r.per === 400 && r.survived === false) },
  { text: 'Naya plan: target 70% ya kam, aur deploy ke liye kam se kam 1 spare',
    check: s => s.records.some(r => r.kind === 'capacity' && r.op === 'plan' && r.peak === 2400 && r.per === 400 && r.target <= 70 && r.spare >= 1) },
  { text: 'Naye plan ke servers mein se 1 maro — baaki 85% ke andar rahein',
    check: capFixed },
];

SD.registerLevels('pro-obs', [
/* ---------------------------------------------------------------- O3 */
{
  id: 'obs-burn',
  icon: '🔥',
  title: 'Burn-rate alerts — kab jagaayein, kab nahi',
  badge: 'Budget ka Pehredaar',
  objectives: [
    'Error budget ko <b>raftaar</b> mein naapna: burn rate',
    '14.4× ka matlab: ek ghante mein mahine ke budget ka 2%',
    'Do khidkiyan (1 ghanta + 5 minute): jaldi pakdo, theek hote hi chup',
    '<b>Page</b> vs <b>ticket</b>: raat ko kise jagaayein',
  ],
  lesson: [
    `<h3>⛽ Misaal: car ka petrol</h3>
     <p>Tank mein 30 din ka petrol hai. Sawaal ye nahi ki "abhi kitna petrol gaya?". Sawaal ye hai: <b>"is raftaar se kitne din chalega?"</b></p>
     <p>Ek ghante mein 2% gaya? 50 ghante mein tank khaali — abhi dhyaan do. Teen din mein 10% gaya? Dheere ja raha hai — kal theek kar lo.</p>
     <p class="tip">🎯 <b>Asli baat:</b> error budget petrol hai. <b>Burn rate</b> = abhi ki error rate ÷ SLO ki manzoor error rate.
       Samaan traffic par 1× se poora budget 30 din mein khatam. 14.4× ka matlab bahut tez.</p>`,
    `<h3>🧮 ChaiPay ke numbers (SLO 99.9%, 30 din)</h3>
     <pre>Manzoor error rate = 0.1%
30 din = 720 ghante
Samaan traffic maan kar downtime-equivalent budget = 0.1% × 720 ghante = 0.72 ghante = 43.2 minute poora down

Burn 14.4×  (error 1.44%)  → 1 ghante mein budget ka 14.4/720 = 2%
Burn 6×     (error 0.6%)   → 6 ghante mein 5%
Burn 1×     (error 0.1%)   → 3 din (72 ghante) mein 10%</pre>
     <table>
       <tr><th>Kitna budget, kitni der mein</th><th>Burn rate</th><th>Kya karo</th></tr>
       <tr><td>2% ek ghante mein</td><td>14.4×</td><td>📟 Page</td></tr>
       <tr><td>5% chhe ghante mein</td><td>6×</td><td>📟 Page</td></tr>
       <tr><td>10% teen din mein</td><td>1×</td><td>🎫 Ticket</td></tr>
     </table>
     <p>Request-based budget = kul requests × 0.1%. Upar ke time waale hisaab samaan traffic maante hain. Ye numbers Google ki SRE workbook ke shuruaati sujhaav hain. Apne SLO ke hisaab se badlo.</p>`,
    `<h3>🪟 Do khidkiyan kyun?</h3>
     <p>Sirf 1 ghante ki khidki: problem 10:05 par theek ho gayi, par 1 ghante ka average 11 baje tak upar rahega. <b>Alert der tak bajta rahega.</b></p>
     <p>Isliye saath mein ek chhoti khidki (lambi ka 1/12 — 1 ghante ke saath 5 minute). Page tabhi jab <b>dono</b> 14.4× se upar.
       Problem theek hone ke baad 5 minute wali neeche aati hai aur alert chup. Ticket ke liye 3 din aur 6 ghante, dono mein burn 1× se upar ho.</p>
     <h3>❌ Purana tareeka: "error rate &gt; 1%, 5 minute"</h3>
     <ul>
       <li>Raat ko kam traffic: 100 mein 2 errors = 2% → bekaar page.</li>
       <li>Din bhar 0.5% ka dheema rissaav: kabhi 1% paar nahi, par budget chupchaap khatam.</li>
     </ul>`,
    `<h3>📟 Page vs ticket</h3>
     <p><b>Page</b> = abhi insaan chahiye: users ko dard hai aur budget tez ja raha hai. <b>Ticket</b> = kaam ke ghanton mein dekho.</p>
     <p>Har page par kuch <b>karna</b> pade. Jis alert par on-call sirf "theek hai" dabata hai, woh alert nahi, shor hai.
       Shor se thakaan (alert fatigue), aur thaki team asli alert bhi chhod deti hai.</p>`,
  ],
  stages: [
    {
      type: 'estimate',
      title: 'Napkin math — budget aur burn',
      goal: 'Burn rate ke numbers khud nikaalo.',
      problems: [
        {
          q: 'SLO 99.9%, 30 din ki khidki. Samaan traffic maan kar error budget kitne MINUTE ke poore downtime jitna hai?',
          unit: 'minute',
          given: ['Manzoor error = 0.1%', '30 din = 43,200 minute'],
          answer: 43.2,
          tol: 0.05,
          steps: ['43,200 × 0.001 = 43.2 minute'],
          lesson: 'Samaan traffic par lagbhag 43 minute ke poore outage jitna budget. Har minute keemti hai.',
        },
        {
          q: 'Abhi error rate 1.44% hai. SLO 99.9%. Burn rate kitna hai?',
          unit: '×',
          given: ['Manzoor error rate = 0.1%', 'Abhi ki error rate = 1.44%'],
          answer: 14.4,
          tol: 0.05,
          steps: ['1.44 ÷ 0.1 = 14.4'],
          lesson: 'Error rate ko SLO ki manzoor rate se bhaag do. Burn rate unit-free hai, har SLO par ek jaisa padha jaata hai.',
        },
        {
          q: 'Burn rate 14.4 poore ek ghante chala. 30 din (720 ghante) ke budget ka kitna PERCENT gaya?',
          unit: '%',
          given: ['Burn 1× = 720 ghante mein poora budget', '14.4× ek ghante'],
          answer: 2,
          tol: 0.05,
          steps: ['14.4 × 1 ghanta = 14.4 "budget-ghante"', '14.4 ÷ 720 = 0.02 = 2%'],
          lesson: 'Ek ghante mein mahine ka 2% — isi raftaar se 50 ghante mein poora budget khatam. Page karne layak.',
        },
      ],
    },
    {
      type: 'bins',
      title: 'Page, ticket, ya kuch nahi?',
      instructions: 'SLO 99.9%, 30 din. Har haalat ke liye sahi jawab chuno.',
      bins: [
        { id: 'page', label: '📟 Page (abhi)' },
        { id: 'ticket', label: '🎫 Ticket (kal)' },
        { id: 'none', label: '🔕 Kuch nahi' },
      ],
      items: [
        { text: 'Burn rate: 1 ghante mein 16×, aur 5 minute mein bhi 15×', bin: 'page', explain: 'Dono khidkiyan 14.4× se upar. Budget tez ja raha hai, abhi bhi chal raha hai.' },
        { text: 'Burn rate: 6 ghante mein 7×, aur 30 minute mein 6.5×', bin: 'page', explain: '6 ghante mein 5% budget wali shart (6×) dono khidkiyon par paar. Dheema par lamba — page.' },
        { text: 'Burn rate: 3 din mein 1.2× aur 6 ghante mein bhi 1.2×; page waali shartein false', bin: 'ticket', explain: 'Budget mahine se thoda pehle khatam hoga. Kaam ke ghanton mein theek karo.' },
        { text: 'Burn rate: 1 ghante mein 15×, par 5 minute mein 0.5× — theek ho chuka', bin: 'none', explain: 'Chhoti khidki batati hai ki problem ruk chuki. Raat ko jagaane ka faayda nahi; subah postmortem.' },
        { text: 'Ek pod restart hua; error rate normal, users par koi asar nahi', bin: 'none', explain: 'Users ko dard nahi, budget nahi gaya. Dashboard par dikhe, page nahi.' },
        { text: 'Disk 80% bhari; isi raftaar se 3 hafte mein poori', bin: 'ticket', explain: 'Asli problem, par 3 hafte ka samay hai. Ticket.' },
        { text: 'Payments ki success rate 10 minute se 40% neeche', bin: 'page', explain: 'Bahut tez burn, users ka paisa atka. Turant page.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Alerts ke faisle',
      questions: [
        {
          q: 'Alert ka niyam: "error rate > 1% for 5 min". Raat 3 baje 100 mein 2 errors par page aaya. Kya galat hai?',
          choices: [
            'Kam traffic par percentage uchhalta hai; burn rate + minimum traffic ki shart',
            'Kuch galat nahi; 2% errors ka matlab users dukhi hain, raat ho ya din',
            'Threshold 1% se 0.1% karo, taaki aise mamle aur jaldi pakde jaayein',
            'Raat ko saare alerts band rakho; subah sab ek saath dekh lenge',
          ],
          answer: 0,
          explain: '100 requests mein 2 errors budget ka chhota sa hissa hai. Burn rate budget ke hisaab se sochta hai, aur kam se kam requests ki shart chhote numbers ka shor rokti hai.',
          choiceExplanations: [
            '100 requests mein 2 errors budget ka chhota sa hissa hai. Burn rate budget ke hisaab se sochta hai, aur kam se kam requests ki shart chhote numbers ka shor rokti hai.',
            'Do users ka dard asli hai, par raat ko team jagaane jitna nahi. Budget ka hisaab batata hai kab jagaana hai.',
            'Threshold kam karne se shor aur badhega.',
            'Raat ko bhi bada outage ho sakta hai. Sahi alert raat ko bhi chahiye.',
          ],
        },
        {
          q: 'Sirf 1 ghante ki khidki wala burn-rate alert hai. Kya dikkat aayegi?',
          choices: [
            'Fix ke baad bhi der tak bajega; 5 minute ki chhoti khidki bhi saath milaao',
            'Koi dikkat nahi; ek ghante ki khidki har haalat mein sabse sahi hoti hai',
            'Alert kabhi bajega hi nahi; ek ghante ka average bahut neeche rehta hai',
            'Alert har minute naya page bhejega; khidki jitni lambi, utne zyada pages',
          ],
          answer: 0,
          explain: 'Lambi khidki ka average dheere girta hai. Chhoti khidki batati hai ki abhi bhi jal raha hai ya nahi. Dono milke: jaldi pakdo, jaldi chup.',
          choiceExplanations: [
            'Lambi khidki ka average dheere girta hai. Chhoti khidki batati hai ki abhi bhi jal raha hai ya nahi. Dono milke: jaldi pakdo, jaldi chup.',
            'Lambi khidki alag kaam ki hai (sach mein bada burn), par reset der se hota hai.',
            'Bada burn ek ghante ke average ko bhi upar le jaata hai. Alert bajega — der tak.',
            'Khidki average ka samay hai, pages ki ginti nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Alerting',
    instructions: 'On-call aur SLO ke sawaal. 🎤',
    questions: [
      {
        q: 'On-call team ko har raat 15 alerts aate hain. Kya karoge?',
        choices: [
          'Alerts ko burn rate se jodo; jis page par kuch karna na pade, ticket ya band',
          'Do on-call log rakho; kaam baant jaayega aur thakaan aadhi ho jaayegi',
          'Alerts ki aawaz dheemi kar do; zaroori alert toh log khud dekh lenge',
          'Saare thresholds double kar do; alerts apne aap aadhe ho jaayenge',
        ],
        answer: 0,
        explain: 'Page sirf user ke dard aur budget ke tez burn par. Baaki ticket ya dashboard. Har page ke saath runbook ho, aur har bekaar page ko hafte mein dekh ke hatao.',
        choiceExplanations: [
          'Page sirf user ke dard aur budget ke tez burn par. Baaki ticket ya dashboard. Har page ke saath runbook ho, aur har bekaar page ko hafte mein dekh ke hatao.',
          'Shor do logon mein baant diya, kam nahi hua.',
          'Thake log zaroori alert bhi chhod dete hain. Jad shor hai.',
          'Andhe thresholds asli problems bhi chhupa denge.',
        ],
      },
      {
        q: 'Mahine ka error budget 20 tareekh ko khatam. Ab kya?',
        choices: [
          'Pehle se tay niyam: risky launches roko, reliability ka kaam pehle',
          'Kuch nahi; budget sirf ek number hai, features chalte rahenge',
          'SLO 99.9% se 99% kar do, taaki budget dobara mil jaaye',
          'Jis team ka deploy toota, uske log ko warning letter do',
        ],
        answer: 0,
        explain: 'Error budget policy pehle se likhi ho: budget khatam toh risky launches rukte hain aur team reliability par kaam karti hai. Isse product aur SRE ka jhagda number se suljhta hai.',
        choiceExplanations: [
          'Error budget policy pehle se likhi ho: budget khatam toh risky launches rukte hain aur team reliability par kaam karti hai. Isse product aur SRE ka jhagda number se suljhta hai.',
          'Budget ka matlab hi ye hai ki khatam hone par vyavhaar badle.',
          'Beech mahine SLO badalna users ka vaada todna hai. SLO users ki zaroorat se tay hota hai.',
          'Blame se log galtiyan chhupate hain. Blameless postmortem se system sudharta hai.',
        ],
      },
    ],
  },
  success: [
    'Error budget aur burn rate nikaalna',
    'Do khidkiyon wala alert banana',
    'Page aur ticket ka faisla karna',
  ],
  homework: `Apni kisi service ka SLO lo (ya maan lo 99.5%). Error budget minute mein nikaalo.
    Phir likho: 14.4× aur 6× par error rate kitni hogi? Inhe 1h/5m aur 6h/30m khidkiyon ke saath alert ke niyam mein likho.`,
  cards: [
    { front: 'Burn rate?', back: 'Abhi ki error rate ÷ manzoor error rate. 1× = budget theek khidki ke ant mein khatam.' },
    { front: '14.4× kyun?', back: '30 din ke budget ka 2% ek ghante mein: 14.4 ÷ 720 = 2%.' },
    { front: 'Do khidkiyan kyun?', back: 'Lambi (1 h) bada burn pakde; chhoti (5 min) batati hai ki abhi bhi jal raha hai — theek hote hi alert chup.' },
    { front: 'Page ka niyam?', back: 'User ko dard + budget tez ja raha + kuch karna pade. Baaki ticket.' },
  ],
},

/* ---------------------------------------------------------------- O4 */
{
  id: 'obs-capacity',
  icon: '🧮',
  title: 'Capacity planning — kitne servers, aur ek mare toh?',
  badge: 'Kshamta Karta',
  objectives: [
    'Peak se servers: seedha bhaag kyun kam padta hai',
    '<b>Target utilization</b>: 100% par chalne wala server dheema kyun',
    '<b>N+1</b> (zaroorat ke N servers aur ek extra): ek server mare ya deploy mein bahar ho, tab bhi jhelo',
    'Terminal: plan banao, ek server maaro, plan sudhaaro',
  ],
  lesson: [
    `<h3>🚌 Misaal: shaadi ki buses</h3>
     <p>240 mehmaan, ek bus mein 40 seat. 6 bus? Theek — jab tak koi bus kharab na ho.</p>
     <p>Ek bus kharab hui: 40 log sadak par. Aur har bus 100% bhari — kisi ka bag rakhne ki jagah nahi.</p>
     <p class="tip">🎯 <b>Asli baat:</b> servers = peak ÷ (ek server ki capacity × target utilization), upar poore number tak round karo, phir spare jodo.
       Seedha bhaag sirf tab chalta hai jab kuch kharab na ho aur traffic kabhi uchhle nahi.</p>`,
    `<h3>📈 ChaiPay ka Diwali peak</h3>
     <ul>
       <li>Peak: <b>2,400 payments/second</b> (pichhle saal ka peak + growth)</li>
       <li>Ek server: <b>400 rps</b> tak p99 SLO ke andar (load test se naapa)</li>
     </ul>
     <pre>Seedha: 2,400 ÷ 400 = 6 servers, sab 100% par
Ek mara: 2,400 ÷ 5 = 480 rps har server = 120% → queue, timeouts</pre>
     <p>100% ke paas latency tezi se badhti hai (pool level ka queue yaad karo). Aur rolling deploy mein ek server waise bhi bahar hota hai.</p>`,
    `<h3>✅ Behtar plan</h3>
     <pre>Target 60%: 2,400 ÷ (400 × 0.6) = 10 servers
Ek mara:    2,400 ÷ 9 = 267 rps = 67% ✅
Spare +1 deploy ke liye: 11 servers</pre>
     <p><b>Keemat:</b> 6 ki jagah 11 servers — lagbhag 1.8 guna kharcha. Bharosa sasta nahi hai.</p>
     <ul>
       <li><b>Autoscaling</b> madad karta hai, par naya server aane mein minute lagte hain. Peak aur failure seconds mein aate hain.</li>
       <li><b>3 AZ</b> (availability zones: alag failure waale data centres) mein baanto. Ek AZ gaya toh baaki do milke poora peak jhelein.</li>
       <li>Zaroorat ho toh N+2 (do extra servers) rakho: ek planned maintenance + ek achanak failure.</li>
     </ul>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: 'Mission — Diwali ke liye kitne servers?',
      goal: 'Peak 2,400 payments/second. Ek server 400 rps tak SLO mein. Pehle seedha hisaab lagao aur ek server maar ke dekho. Phir target utilization aur deploy ke liye spare ke saath plan sudhaaro, aur dobara ek server maaro.',
      sys: {},
      tasks: T_CAP,
      success: SD.allTasks(T_CAP),
      verify: capFixed,
      solution: [
        'capacity plan --peak 2400 --per-server 400',
        'capacity fail --servers 6 --peak 2400 --per-server 400',
        'capacity plan --peak 2400 --per-server 400 --target 60 --spare 1',
        'capacity fail --servers 11 --peak 2400 --per-server 400',
      ],
      successText: 'Plan aur failure test poore. Solution ke 60% target aur 1 spare par 11 servers: peak par ~55%; ek mare toh 60%. Apne plan ke numbers terminal mein dekho. Model mein 85% se upar ko overload maana; asli hadd load test se naapo.',
      hints: [
        'Pehle bina target ke seedha hisaab lagao, phir utne servers mein se ek maar ke dekho.',
        '`capacity plan --peak <rps> --per-server <rps> [--target <pct>] [--spare <n>]` servers ginta hai. `capacity fail --servers <n> --peak <rps> --per-server <rps>` ek server maar ke baaki ka bojh dikhata hai.',
        'Poora raasta — har command alag Enter se chalao:\ncapacity plan --peak 2400 --per-server 400\ncapacity fail --servers 6 --peak 2400 --per-server 400\ncapacity plan --peak 2400 --per-server 400 --target 60 --spare 1\ncapacity fail --servers 11 --peak 2400 --per-server 400',
      ],
    },
    {
      type: 'quiz',
      title: 'Capacity ke faisle',
      questions: [
        {
          q: 'Load test mein ek server 400 rps tak SLO ke andar raha. Production mein 400 rps par chalaoge?',
          choices: [
            'Nahi; target 60–70% rakho: tail latency, GC aur achanak burst ke liye jagah',
            'Haan; load test ne saabit kar diya ki 400 rps par SLO poora hota hai',
            'Haan, aur 450 tak bhi; load test asli capacity se kam hi batata hai',
            'Nahi; production mein 20% se upar kabhi mat chalao, warna khatra',
          ],
          answer: 0,
          explain: '100% ke paas queue tezi se badhti hai. Burst, GC pause ya ek server ki maut ke liye jagah chahiye. 20% bahut mehenga hai — 100% target ke mukaable 5 guna servers.',
          choiceExplanations: [
            '100% ke paas queue tezi se badhti hai. Burst, GC pause ya ek server ki maut ke liye jagah chahiye. 20% bahut mehenga hai — 100% target ke mukaable 5 guna servers.',
            'Load test ek saaf haalat hai. Production mein burst, noisy neighbour aur failures hote hain.',
            'Load test aksar asli traffic se saaf hota hai, isliye asli capacity kam ho sakti hai, zyada nahi.',
            'Bahut kam utilization ka matlab bahut zyada kharcha. 60–70% aam shuruaat hai.',
          ],
        },
        {
          q: '3 AZ, peak 2,400 rps. Ek poora AZ jaaye tab bhi chalna hai. Har AZ mein kitni capacity?',
          choices: [
            '1,200 rps har AZ mein; baaki do AZ milke 2,400 jhel lein',
            '800 rps har AZ mein; teen AZ × 800 = 2,400, bas kaafi',
            '2,400 rps har AZ mein; har AZ akela poora peak jhele',
            '400 rps har AZ mein; ek server per AZ hi kaafi hai',
          ],
          answer: 0,
          explain: 'Ek AZ gaya toh do bache. 2 × 1,200 = 2,400. Kul capacity 3,600 — 1.5 guna. Upar se target utilization bhi lagao.',
          choiceExplanations: [
            'Ek AZ gaya toh do bache. 2 × 1,200 = 2,400. Kul capacity 3,600 — 1.5 guna. Upar se target utilization bhi lagao.',
            'Ek AZ gaya toh sirf 1,600 bache — 2,400 ke liye kam.',
            'Teen guna capacity: do AZ jaane par bhi chalega, par ye zaroorat se zyada kharcha hai.',
            '1,200 kul — peak ka aadha bhi nahi.',
          ],
        },
        {
          q: 'Autoscaling laga hai. Phir bhi spare servers kyun?',
          choices: [
            'Naya server aane mein minute lagte hain; peak aur failure seconds mein aate hain',
            'Autoscaling sirf raat ko chalta hai; din ke peak ke liye spare zaroori hai',
            'Spare servers autoscaling ko tez kar dete hain, isliye dono saath chahiye',
            'Autoscaling servers ghata sakta hai, badha nahi sakta; spare isliye',
          ],
          answer: 0,
          explain: 'Metric dikhe, faisla ho, server boot ho, warm-up ho — minute lag jaate hain. Achanak peak ya failure ke pehle minute spare hi jhelta hai.',
          choiceExplanations: [
            'Metric dikhe, faisla ho, server boot ho, warm-up ho — minute lag jaate hain. Achanak peak ya failure ke pehle minute spare hi jhelta hai.',
            'Autoscaling din-raat chalta hai. Sawaal raftaar ka hai.',
            'Spare autoscaling ki raftaar nahi badalta; bas tab tak load jhelta hai.',
            'Autoscaling dono taraf kaam karta hai.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Capacity',
    instructions: 'Estimation aur capacity ke sawaal. 🎤',
    questions: [
      {
        q: '"Is design ke liye kitne servers?" Kaise jawab doge?',
        choices: [
          'Peak rps ÷ (per-server rps × target), round up + spare; capacity load test se',
          'Average rps ÷ per-server rps; average hi asli load batata hai',
          'Jitne servers competitor chalata hai, utne; unhone pehle se soch rakha hai',
          'Ek server se shuru karo; problem aaye toh tab badha lenge',
        ],
        answer: 0,
        explain: 'Peak se shuru karo, average se nahi. Per-server capacity naapo, target utilization aur failure ke liye spare jodo. Keemat bhi bolo.',
        choiceExplanations: [
          'Peak se shuru karo, average se nahi. Per-server capacity naapo, target utilization aur failure ke liye spare jodo. Keemat bhi bolo.',
          'Peak average ka 3–10 guna ho sakta hai. Average par plan = peak par outage.',
          'Unka load, code aur hardware alag hai.',
          'Ek server ka matlab ek failure, poora outage. Interview mein ye jawab nahi chalta.',
        ],
      },
      {
        q: 'Har server 60% par chal raha hai. Finance kehta hai "40% khaali kyun?" Jawab?',
        choices: [
          'Ek server mare ya peak aaye toh wahi jagah kaam aati hai; numbers ke saath dikhao',
          'Finance sahi hai; servers 95% par chalao, failure par autoscaling sambhal lega',
          'Ye engineering ka faisla hai; finance ko iske number dikhane ki zaroorat nahi',
          'Aadhe servers band kar do, aur peak ke din dobara chalu kar lena',
        ],
        answer: 0,
        explain: 'Headroom ka kaam numbers mein dikhao: ek server mare toh baaki kitne % par, aur Diwali peak kitna. Bharosa ki keemat aur outage ki keemat dono saamne rakho.',
        choiceExplanations: [
          'Headroom ka kaam numbers mein dikhao: ek server mare toh baaki kitne % par, aur Diwali peak kitna. Bharosa ki keemat aur outage ki keemat dono saamne rakho.',
          '95% par chhote fleet mein ek failure load 100% se upar le jaa sakta hai. N servers par naya load = 95% × N ÷ (N−1). Autoscaling mein der lagti hai.',
          'Kharcha business ka sawaal hai. Numbers se baat karo.',
          'Peak achanak bhi aata hai (viral sale). Haath se chalu karne mein der hogi.',
        ],
      },
    ],
  },
  success: [
    'Peak, per-server capacity aur target se servers nikaalna',
    'N+1 aur AZ failure ke liye capacity rakhna',
    'Headroom ki keemat finance ko numbers mein samjhana',
  ],
  homework: `Apni kisi service ka peak rps aur ek instance ki capacity (load test ya andaaza) likho.
    Target 60% aur N+1 ke saath kitne instances chahiye? Ek instance mare toh baaki kitne % par honge?`,
  cards: [
    { front: 'Servers ka formula?', back: 'peak ÷ (per-server × target) + spare. Per-server load test se.' },
    { front: '100% target kyun nahi?', back: 'Queue tezi se badhti hai; burst, GC aur failure ke liye jagah nahi.' },
    { front: '3 AZ, ek AZ jaaye?', back: 'Har AZ mein kam se kam peak ÷ 2 usable capacity. Target utilization aur server rounding alag lagao.' },
    { front: 'Autoscaling hai, spare kyun?', back: 'Naya server minton mein; peak aur failure seconds mein.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['obs-burn'] = {
  t: 'Budget ki raftaar: page kab, ticket kab',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">error rate 1.44%</span><span class="dg-arrow">÷</span>
      <span class="dg-pill">manzoor 0.1%</span><span class="dg-arrow">=</span>
      <span class="dg-pill bad">burn 14.4×</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">1 ghante mein budget ka 2%</span>
    </div>
    <div class="dg-grid">
      <div class="dg-node is-bad"><span class="ni">📟</span><span class="nl">Page</span><span class="ns">14.4× (1 h + 5 min) · 6× (6 h + 30 min)</span></div>
      <div class="dg-node is-gold"><span class="ni">🎫</span><span class="nl">Ticket</span><span class="ns">1× (3 din + 6 h)</span></div>
      <div class="dg-node"><span class="ni">🔕</span><span class="nl">Kuch nahi</span><span class="ns">chhoti khidki theek → alert chup</span></div>
    </div>`,
};
VISUALS['obs-capacity'] = {
  t: 'Seedha bhaag vs target + spare',
  html: `
    <div class="dg-split">
      <div class="dg-box is-bad"><span class="bx-label">❌ 6 servers, 100%</span>
        <div class="dg-cap">2,400 ÷ 400 = 6. Ek mara → 5 servers par 120% → queue, timeouts.</div>
      </div>
      <div class="dg-box is-good"><span class="bx-label">✅ 11 servers: 60% + 1 spare</span>
        <div class="dg-cap">2,400 ÷ (400 × 0.6) = 10, +1 spare. Ek mara → baaki 60%. Keemat: ~1.8 guna.</div>
      </div>
    </div>
    <div class="dg-cap">3 AZ ho toh har AZ mein peak ÷ 2, taaki ek AZ jaane par baaki do jhel lein.</div>`,
};

SD.addScenes({
  'obs-burn': {
    intro: 'ChaiPay ka SLO: 99.9% payments safal, 30 din mein. Samaan traffic par budget <b>43.2 minute</b> ke poore outage jitna.',
    nodes: [
      { id: 'err', col: 0, row: 0, icon: '📉', label: 'error rate', sub: '1.44%' },
      { id: 'burn', col: 1, row: 0, icon: '🔥', label: 'burn rate', sub: '÷ 0.1%' },
      { id: 'long', col: 2, row: 0, icon: '🕐', label: '1 ghante ki khidki' },
      { id: 'short', col: 2, row: 1, icon: '⏱️', label: '5 minute ki khidki' },
      { id: 'page', col: 3, row: 0, icon: '📟', label: 'Page', sub: 'on-call jaage' },
      { id: 'ticket', col: 3, row: 1, icon: '🎫', label: 'Ticket', sub: 'kal subah' },
    ],
    steps: [
      { from: 'err', to: 'burn', label: '1.44% ÷ 0.1%', say: 'Error rate 1.44%. Manzoor 0.1%. Burn rate 14.4: budget 14.4 guna tez ja raha hai.' },
      { from: 'burn', to: 'long', label: '14.4× · 1 ghanta', tone: 'bad', set: { long: { tone: 'bad', sub: '14.4× — 2% gaya' } }, say: 'Ek ghante mein mahine ke budget ka 2%. Isi raftaar se 50 ghante mein poora budget khatam.' },
      { from: 'burn', to: 'short', label: 'abhi bhi 14.4×?', set: { short: { tone: 'bad', sub: 'haan, abhi jal raha' } }, say: 'Chhoti khidki poochhti hai: abhi bhi jal raha hai? Haan.' },
      { from: 'long', to: 'page', label: 'dono upar → page', tone: 'bad', set: { page: { tone: 'bad', sub: 'on-call jaaga' } }, say: 'Page tab jab dono khidkiyan 14.4× se upar hon. Sirf 14.4× ke barabar hona kaafi nahi.' },
      { at: ['short', 'page'], set: { short: { tone: 'good', sub: '0.5× — theek' }, page: { tone: 'good', sub: 'alert chup' } }, say: 'Fix ke 5 minute baad chhoti khidki neeche. Alert chup, chahe 1 ghante ka average abhi upar ho.' },
      { at: ['ticket'], set: { ticket: { tone: 'gold', sub: '10% budget, 3 din' } }, say: '3 din aur 6 ghante, dono mein burn 1× se upar; page waali shartein false. Ticket banta hai, kaam ke ghanton mein theek.' },
    ],
  },
  'obs-capacity': {
    intro: 'Diwali peak: <b>2,400 payments/second</b>. Ek server 400 rps tak SLO mein.',
    nodes: [
      { id: 'peak', col: 0, row: 0, icon: '🪔', label: 'Diwali peak', sub: '2,400 rps' },
      { id: 'six', col: 1, row: 0, icon: '🖥️', label: '6 servers', sub: '100% busy' },
      { id: 'dead', col: 2, row: 0, icon: '💀', label: '1 server mara', sub: 'baaki 5' },
      { id: 'eleven', col: 1, row: 1, icon: '🖥️', label: '11 servers', sub: '60% + 1 spare' },
      { id: 'dead2', col: 2, row: 1, icon: '💀', label: '1 server mara', sub: 'baaki 10' },
      { id: 'bill', col: 3, row: 1, icon: '💸', label: 'Kharcha', sub: '~1.8 guna' },
    ],
    steps: [
      { from: 'peak', to: 'six', label: '2,400 ÷ 400', say: 'Seedha hisaab: 2,400 ÷ 400 = 6 servers. Har server 100% par.' },
      { from: 'six', to: 'dead', label: 'ek server gaya', tone: 'bad', set: { dead: { tone: 'bad', sub: '480 rps = 120%' } }, say: 'Ek server mara. Baaki 5 par 480 rps har ek — 120%. Queue, timeouts, payments fail.' },
      { from: 'peak', to: 'eleven', label: '÷ (400 × 60%) + 1', tone: 'good', say: 'Target 60%: 2,400 ÷ 240 = 10 servers. Deploy ke liye ek spare: 11.' },
      { from: 'eleven', to: 'dead2', label: 'ek server gaya', tone: 'good', set: { dead2: { tone: 'good', sub: 'baaki 60% ✅' } }, say: 'Ab ek server mara: baaki 10 par 240 rps har ek — 60%. Payments chalte rahe.' },
      { from: 'dead2', to: 'bill', label: '11 vs 6', tone: 'gold', say: 'Keemat: 6 ki jagah 11 servers, lagbhag 1.8 guna. Bharosa sasta nahi.' },
      { at: ['eleven'], say: 'Autoscaling ke saath bhi spare rakho: naya server aane mein minute lagte hain, failure seconds mein aata hai.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-obs-burn', levels: 'obs-burn', guide: {
    title: 'Threshold par jagaao, ya budget ki raftaar par?',
    misaal: 'Petrol ka kaanta dekh ke nahi, raftaar dekh ke faisla: ek ghante mein 2% gaya toh abhi rukna padega; teen din mein 10% gaya toh kal pump par jaana.',
    asli: 'Burn rate batata hai ki error budget kitni tezi se ja raha hai. Do khidkiyan bade burn ko jaldi pakadti hain aur theek hote hi chup hoti hain.',
    points: [
      '<b>Burn rate:</b> error rate ÷ manzoor rate.',
      '<b>Page:</b> 14.4× (1 h + 5 min) ya 6× (6 h + 30 min) — shuruaati sujhaav.',
      '<b>Ticket:</b> dheema rissaav; har page par action.',
    ],
    use: 'SLO tay ho aur on-call ko sirf asli dard par jagaana ho.',
    avoid: 'Kam traffic par seedhe percentage threshold se page mat karo.',
    mistake: 'Sirf lambi khidki — alert fix ke baad bhi der tak bajta rehta hai.',
    compare: [
      { choice: 'Seedha threshold (error > 1%)', when: 'SLO nahi hai, shuruaati system', tradeoff: 'Samajhna aasaan; raat ko shor aur dheema rissaav chhoot-ta hai' },
      { choice: 'Multiwindow burn rate', when: 'SLO aur error budget tay hain', tradeoff: 'Kam shor, sahi samay; setup aur samjhaana thoda mushkil' },
    ],
    followup: 'Service par raat ko sirf 50 requests/minute aati hain. Burn-rate alert ko shor se kaise bachaoge?',
    sources: [
      'signals',
      { title: 'Google SRE Workbook — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' },
    ],
  } },
  { id: 'pro-obs-capacity', levels: 'obs-capacity', guide: {
    title: 'Kitni khaali jagah rakhein?',
    misaal: '240 mehmaan, 40 seat ki bus. 6 bus tab tak theek jab tak koi kharab na ho. Ek extra bus aur thodi khaali seat — shaadi bach gayi.',
    asli: 'Servers = peak ÷ (per-server capacity × target utilization) + spare. Ek server ya deploy ke liye spare gino. AZ loss ke liye bache hue AZ ki capacity alag jaancho.',
    points: [
      '<b>Peak se:</b> average se plan = peak par outage.',
      '<b>Target 60–70%:</b> misaal ki shuruaat; asli target load test aur failure ki zaroorat se tay karo.',
      '<b>N+1 / AZ:</b> ek jaaye toh baaki jhelein; keemat bolo.',
    ],
    use: 'Sale, launch ya naye region se pehle capacity tay karni ho.',
    avoid: 'Load test ke max number par production mat chalao.',
    mistake: 'Autoscaling ko spare ki jagah maan lena — naya server minton mein aata hai.',
    compare: [
      { choice: 'Kam headroom (80–90%)', when: 'Traffic sthir, failure ka asar chhota', tradeoff: 'Sasta; burst ya ek failure par overload' },
      { choice: 'Zyada headroom + N+1', when: 'Paise ka traffic, achanak peak', tradeoff: 'Bharosa; 1.5–2 guna servers ka kharcha' },
    ],
    followup: 'Diwali peak sirf 3 ghante ka hai. Saal bhar 11 servers chalaane ke bajaay kya kar sakte ho?',
    sources: [
      'overload',
      { title: 'Google SRE Book — Addressing Cascading Failures (capacity and overload)', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
    ],
  } },
);
})();
