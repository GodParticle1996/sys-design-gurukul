/* =====================================================================
   System Gurukul — 🎤 Interview Designs (track pro-iv), hissa 3
   Levels: iv-notify (notification system), iv-upi (UPI jaisa payment).
   ===================================================================== */
(() => {
SD.registerLevels('pro-iv', [
/* ---------------------------------------------------------------- I5 */
{
  id: 'iv-notify',
  icon: '🔔',
  title: 'Design: Notification system — sahi baat, sahi waqt, kam duplicates',
  badge: 'Sandesh Sanchalak',
  objectives: [
    'Channels: push, SMS, email — alag provider, alag keemat, alag raftaar',
    '<b>Priority queues</b>: OTP turant; offers ka campaign OTP ko na roke',
    '<b>Dedup</b>: duplicate events roko; provider timeout par duplicate mumkin',
    'Preferences, quiet hours aur har user ki hadd',
  ],
  lesson: [
    `<h3>💌 Misaal: shaadi ke card</h3>
     <p>Kuch rishtedaaron ko phone (zaroori, turant). Kuch ko WhatsApp. Kuch ko daak se card.</p>
     <p>Dadi ko raat 2 baje phone mat karo. Aur ek rishtedaar ko teen baar card mat bhejo.</p>
     <p class="tip">🎯 <b>Asli baat:</b> notification system = <b>kya</b> bhejna (event), <b>kise</b> (preferences), <b>kis raaste</b> (channel), <b>kab</b> (priority, quiet hours) — aur <b>duplicate events rokna</b> (dedup). Provider timeout par duplicate delivery phir bhi mumkin.</p>`,
    `<h3>🏗️ Dhaancha</h3>
     <p>APNs Apple ka push service hai; FCM Google ka Firebase Cloud Messaging. TPS = transactions/messages per second, provider ki bhejne ki hadd.</p>
     <pre>services → notification API (event: user, type, data, event_id)
         → preferences + template
         → priority queues:  critical (OTP, payment) · normal (social) · bulk (offers)
         → channel workers:  push (APNs/FCM) · SMS provider · email provider
         → delivery status (bheja, pahuncha, khola)</pre>
     <p>ChaiPay numbers (kalpanik): 3 crore "payment safal" push har mahine; Diwali offer campaign 2 crore users ko ek saath.</p>
     <p><b>Sabse zaroori niyam:</b> offers ka bada campaign aur OTP ek hi line mein nahi. Alag queues, alag workers, alag provider budget.</p>`,
    `<h3>🧩 Mushkil hisse</h3>
     <table>
       <tr><th>Dikkat</th><th>Ilaaj</th></tr>
       <tr><td>Payment service ne retry kiya, event do baar aaya</td><td><b>Dedup:</b> event_id + recipient + channel ki key; atomic claim, retry window tak yaad rakho</td></tr>
       <tr><td>SMS provider gira</td><td>Backoff ke saath retry, phir doosra provider (failover)</td></tr>
       <tr><td>User ko din mein 15 offers</td><td>Har user ki hadd (jaise 3 marketing/din), quiet hours</td></tr>
       <tr><td>"3 naye messages", phir "5 naye messages"</td><td>FCM collapse key: device tak na pahuncha pending message naye se badal sakta hai</td></tr>
       <tr><td>Provider ki apni hadd (TPS)</td><td>Provider ke hisaab se rate budget, critical ke liye alag hissa</td></tr>
     </table>
     <p>FCM notification messages collapsible hote hain. Har event alag chahiye toh non-collapsible data messages aur durable inbox/sync rakho; FCM akela durable history nahi hai. Android ke priority-based API mein high priority urgent, user-visible messages ke liye hai; turant delivery ki guarantee nahi.</p>
     <p>Preferences <b>kism</b> ke hisaab se: transactional (OTP, payment receipt) aur marketing alag. User marketing band kare, OTP phir bhi jaaye.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — Notification system',
      instructions: 'Har slot par sahi chunav. Galat options ka "kyun" bhi padho.',
      brief: `ChaiPay: OTP aur payment receipts turant, Diwali offers 2 crore users ko.
        Retries se duplicate events aate hain. SMS provider kabhi-kabhi girta hai.`,
      requirements: ['OTP campaign ke dauraan bhi turant', 'Ek event = ek notification', 'Provider gire toh bhi pahunche', 'Users pareshaan na hon'],
      pass: 14,
      slots: [
        {
          id: 'queue', label: 'Queue ka dhaancha', icon: '📨',
          options: [
            { id: 'prio', label: 'Alag queues: critical, normal, bulk', score: 3, why: 'Campaign ki bheed OTP ko nahi rokti. Har queue ke apne workers.' },
            { id: 'fifo', label: 'Sab ek FIFO queue mein, ek kram mein', score: -3, why: '2 crore offers ke peeche OTP — minton ki der.' },
            { id: 'sync', label: 'Queue nahi; service seedha provider ko call kare', score: -2, why: 'Provider dheema = service dheemi; retries aur failover kahin nahi.' },
          ],
        },
        {
          id: 'dedup', label: 'Duplicate events', icon: '🧾',
          options: [
            { id: 'key', label: 'Event + recipient + channel ka atomic claim', score: 3, why: 'Atomic claim do workers ko ek saath bhejne se rokta hai. Retention poori retry window tak rakho; provider timeout par duplicate mumkin.' },
            { id: 'none', label: 'Dedup nahi; provider khud duplicate rok lega', score: -2, why: 'Provider ko ye pata nahi ki do alag calls ek hi event ki hain.' },
            { id: 'text', label: 'Same text wale messages ko duplicate maano', score: -1, why: 'Do alag payments ka text same ho sakta hai — asli notification chhoot jaayega.' },
          ],
        },
        {
          id: 'retry', label: 'Provider fail hua', icon: '🔁',
          options: [
            { id: 'backoff', label: 'Backoff + jitter retry, phir doosra provider', score: 3, why: 'Thodi der ki dikkat retry se, lambi dikkat failover se.' },
            { id: 'spin', label: 'Turant baar-baar retry, bina ruke', score: -2, why: 'Gire hue provider par retry ki baarish; recovery aur der se.' },
            { id: 'drop', label: 'Ek baar fail toh chhod do; dobara mat bhejo', score: -2, why: 'OTP kho gaya = login nahi. Critical messages ko dobara koshish chahiye.' },
          ],
        },
        {
          id: 'prefs', label: 'User ki marzi', icon: '🙋',
          options: [
            { id: 'prefs', label: 'Kism ke hisaab preferences, quiet hours, hadd', score: 3, why: 'Marketing band, OTP chalu. Raat ko offers nahi.' },
            { id: 'all', label: 'Sab users ko sab kuch bhejo, bina koi hadd', score: -2, why: 'Users app ke notifications hi band kar dete hain — OTP bhi gaya.' },
            { id: 'off', label: 'Ek hi switch: sab chalu ya sab band', score: -1, why: 'Offers band karne ke liye user OTP bhi band kar dega.' },
          ],
        },
        {
          id: 'campaign', label: 'Diwali campaign: 2 crore users', icon: '🪔',
          options: [
            { id: 'throttle', label: 'Bulk queue se throttle, kuch ghanton mein', score: 3, why: 'Provider ki hadd aur critical ka hissa bacha rehta hai.' },
            { id: 'blast', label: 'Ek saath 2 crore, usi queue se', score: -3, why: 'Provider ki hadd turant bhar jaati hai; OTP atakte hain.' },
            { id: 'night', label: 'Raat 2 baje bhejo jab traffic kam ho', score: -1, why: 'Traffic kam, par users ki neend — quiet hours ka ulta.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Priority queues, dedup, failover, preferences aur throttled campaign. OTP kabhi offers ke peeche nahi.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh duplicate bhejega ya OTP ko der karega.',
        bad: '🤔 Yaad karo: 2 crore offers aur ek OTP ek line mein nahi khade ho sakte.',
      },
    },
    {
      type: 'incident',
      title: '🚨 Diwali campaign mein OTP 6 minute late',
      instructions: 'Login nahi ho rahe. Sahi kadam chuno.',
      pager: `<b>#notify-oncall</b> — 7:05 PM<br>
        Support: "OTP 6 minute baad aa raha hai, login fail."<br>
        Dashboard: SMS queue mein <b>1.8 crore</b> messages. 6:30 PM par Diwali offer campaign shuru hua.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Bulk bhejna roko; pending offers hataakar OTP aage lao', good: true, next: 'why', explain: 'Campaign producer pause karo. Queue mein pade offers ko bulk queue mein le jao; sirf naye offers rokne se FIFO backlog nahi hat-ta.' },
            { t: 'SMS workers 10 guna karo; queue jaldi khaali ho jaayegi', good: false, explain: 'Provider ki apni TPS hadd hai. Zyada workers sirf provider ko throttle karwayenge.' },
            { t: 'Users ko bolo ki 10 minute baad login karein', good: false, explain: 'Dard user par daal diya. System ka kaam system mein theek karo.' },
            { t: 'Queue ke saare messages mita do aur campaign dobara chalao', good: false, explain: 'OTP bhi mit jaayenge, aur campaign dobara wahi karega.' },
          ],
        },
        why: {
          sitrep: '✅ 7:08 PM: campaign paused, pending offers bulk queue mein alag. OTP 7:12 tak phir 5 second mein.',
          text: 'Aisa kyun hua?',
          choices: [
            { t: 'OTP aur offers ek FIFO queue mein; OTP 1.8 crore ke peeche', good: true, next: 'fix', explain: 'Priority ka koi raasta nahi tha. Bheed aage, zaroori peeche.' },
            { t: 'SMS provider ka server dheema tha, galti provider ki', good: false, explain: 'Provider apni raftaar se bhej raha tha. Line hamari thi.' },
            { t: 'OTP ka template galat tha, isliye der hui', good: false, explain: 'Template se der nahi hoti. Queue ki gehraai dekho.' },
            { t: 'Users ne OTP do baar maanga, isliye load badha', good: false, explain: 'Resend ne thoda load badhaya, par asli wajah 1.8 crore offers ki line thi.' },
          ],
        },
        fix: {
          sitrep: '📝 Postmortem.',
          text: 'Dobara na ho — systemic fix?',
          choices: [
            { t: 'Priority queues + critical ka provider budget', good: true, next: 'end', explain: 'Campaign kitna bhi bada ho, OTP ki line alag aur provider ki TPS ka hissa reserved.' },
            { t: 'Campaigns sirf raat ko chalao, jab OTP kam hon', good: false, explain: 'Raat ko bhi OTP aate hain, aur offers raat ko quiet hours todte hain.' },
            { t: 'Campaign chalane se pehle on-call ko email karo', good: false, explain: 'Email se queue alag nahi hoti.' },
            { t: 'SMS ki jagah sab notifications email se bhejo', good: false, explain: 'OTP email se dheema aur kam pahunchta hai. Channel nahi, queue ki dikkat thi.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. OTP ab offers ke peeche nahi.',
          summary: `<b>Seekh:</b> zaroori aur bulk traffic ek line mein = zaroori traffic ka outage.
            <br><br><b>Teen niyam:</b>
            <br>1. Priority ke hisaab se alag queues aur workers.
            <br>2. Provider ki hadd mein critical ka hissa reserved.
            <br>3. Bade campaigns throttle karke, bulk queue se.`,
        },
      },
    },
    {
      type: 'quiz',
      title: 'Notification ke faisle',
      questions: [
        {
          q: 'Payment service ke retry se "payment safal" event do baar aaya. User ko do push jaayenge?',
          choices: [
            'Duplicate event roko: event + recipient + channel ki key atomically claim karo',
            'Haan: do events aaye toh do push; user samajh jaayega ki ek hi payment hai',
            'Nahi: har user ko din mein ek hi push jaata hai, isliye apne aap ruk jaayega',
            'Haan: aur payment service ko retry band karne ko bolo, problem wahin hai',
          ],
          answer: 0,
          explain: 'At-least-once mein duplicate events aa sakte hain. Event + recipient + channel ko atomically claim karo. Record poori retry window tak rakho. Provider ne bheja par jawab kho gaya toh retry se duplicate ho sakta hai.',
          choiceExplanations: [
            'At-least-once mein duplicate events aa sakte hain. Event + recipient + channel ko atomically claim karo. Record poori retry window tak rakho. Provider ne bheja par jawab kho gaya toh retry se duplicate ho sakta hai.',
            'Do "payment safal" push dekh ke user dar jaayega ki paisa do baar kata.',
            'Din ki hadd marketing ke liye hai; payment receipts uske bahar.',
            'Retry zaroori hai (warna event kho jaayega). Dedup receiver ka kaam hai.',
          ],
        },
        {
          q: 'User ne marketing notifications band ki hain, par OTP chahiye. Kaise?',
          choices: [
            'Preferences kism ke hisaab: OTP transactional; marketing opt-out alag',
            'Ek hi switch rakho; user ko dono mein se ek chunna padega',
            'Marketing band karne wale ko OTP bhi mat bhejo; user ki marzi',
            'Preferences ignore karo; jo zaroori lage, sab bhejo',
          ],
          answer: 0,
          explain: 'Transactional (OTP, receipts) aur marketing alag kism. User marketing band kar sakta hai; OTP login ke liye zaroori hai. Device ki notification permission band ho toh push OTP nahi pahunchega; doosra login channel chahiye.',
          choiceExplanations: [
            'Transactional (OTP, receipts) aur marketing alag kism. User marketing band kar sakta hai; OTP login ke liye zaroori hai. Device ki notification permission band ho toh push OTP nahi pahunchega; doosra login channel chahiye.',
            'Ek switch par user offers ke chakkar mein OTP bhi band karega.',
            'User ne offers band kiye, login nahi.',
            'Marzi todne par user poore notifications band karega — ya app hata dega.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Notifications',
    instructions: 'Classic notification system ke sawaal. 🎤',
    questions: [
      {
        q: 'Notification system ki sabse badi galti kya hoti hai?',
        choices: [
          'Zaroori aur bulk ko ek line mein rakhna: campaign OTP ko rok deta hai',
          'Har channel ka alag provider rakhna; ek provider sab ke liye kaafi',
          'Delivery status track karna; bheja toh pahuncha hi hoga',
          'Templates rakhna; har service apna text khud likhe',
        ],
        answer: 0,
        explain: 'Priority isolation sabse zaroori hai. Baaki (providers, tracking, templates) sudhaar hain; isolation na ho toh har campaign ek outage.',
        choiceExplanations: [
          'Priority isolation sabse zaroori hai. Baaki (providers, tracking, templates) sudhaar hain; isolation na ho toh har campaign ek outage.',
          'Channel ke hisaab se provider alag hote hi hain; failover ke liye do bhi.',
          'Tracking ke bina pata nahi chalta ki OTP pahuncha ya nahi.',
          'Templates se text ek jaisa, translate aur badalna aasaan.',
        ],
      },
      {
        q: '"Notification exactly once" ka vaada kar sakte ho?',
        choices: [
          'Poora nahi: at-least-once + dedup se lagbhag; provider ke paar duplicate ho sakta hai',
          'Haan: Kafka exactly-once se push notification bhi exactly once pahunchta hai',
          'Haan: bas retries band kar do, phir har notification ek hi baar jaayega',
          'Nahi, isliye dedup ki koshish bhi bekaar hai; duplicates aane do',
        ],
        answer: 0,
        explain: 'Atomic claim duplicate event ko dobara enqueue hone se rokta hai. Par provider ko bhejne ke baad jawab kho gaya toh retry se duplicate ho sakta hai. Isliye "lagbhag ek baar" aur idempotent receivers.',
        choiceExplanations: [
          'Atomic claim duplicate event ko dobara enqueue hone se rokta hai. Par provider ko bhejne ke baad jawab kho gaya toh retry se duplicate ho sakta hai. Isliye "lagbhag ek baar" aur idempotent receivers.',
          'Kafka ka exactly-once Kafka ke andar ka vaada hai; phone tak ka nahi.',
          'Retry band = kuch notifications kabhi nahi pahunchenge.',
          'Dedup duplicates ko bahut kam kar deta hai — koshish bekaar nahi.',
        ],
      },
    ],
  },
  success: [
    'Priority queues se OTP ko campaign se bachaana',
    'Dedup, retry aur failover design karna',
    'Preferences aur quiet hours ko kism ke hisaab rakhna',
  ],
  homework: `Apne phone par ek din ke notifications gino: kaunse transactional (OTP, receipt), kaunse marketing?
    Kisi app ne raat ko offer bheja? Kisi ne ek hi baat do baar? Teen niyam likho jo tum apne notification system mein lagaoge.`,
  cards: [
    { front: 'Sabse zaroori niyam?', back: 'Critical (OTP) aur bulk (offers) alag queues, alag workers, provider budget mein hissa.' },
    { front: 'Duplicate event?', back: 'event_id + recipient + channel ki key yaad rakho (jaise 24 ghante); poori retry window tak atomic claim rakho. Provider timeout par duplicate mumkin.' },
    { front: 'Provider gira?', back: 'Backoff + jitter retry, phir doosra provider.' },
    { front: 'Preferences?', back: 'Kism ke hisaab: marketing opt-out alag, OTP alag. Quiet hours, din ki hadd.' },
  ],
},

/* ---------------------------------------------------------------- I6 */
{
  id: 'iv-upi',
  icon: '💸',
  title: 'Design: UPI jaisa payment — paisa na doobe, na do baar kate',
  badge: 'Bhugtaan Bahadur',
  objectives: [
    'Payment ek <b>state machine</b>: CREATED → PENDING → SUCCESS / FAILED',
    '<b>Timeout ka matlab "pata nahi"</b> — dobara paisa nahi, status check',
    'Idempotency key: ek click, ek debit',
    '<b>Ledger</b> (double-entry) aur roz ka <b>reconciliation</b>',
  ],
  lesson: [
    `<h3>🏦 Misaal: bank counter aur bijli</h3>
     <p>Tumne cheque diya. Clerk andar gaya. Bijli chali gayi. Tumhe nahi pata cheque jama hua ya nahi.</p>
     <p>Doosra cheque mat do! Pehle poochho: "mere cheque ka kya hua?"</p>
     <p class="tip">🎯 <b>Asli baat:</b> payment mein <b>timeout = "pata nahi"</b>, failure nahi. Paisa shayad kat chuka ho.
       Status check karo. Naye transaction se dobara paisa bhejna = double debit.</p>`,
    `<h3>🔀 Payment ka safar (saral roop)</h3>
     <pre>Aman ki app → ChaiPay / PSP bank → UPI switch (NPCI) → Aman ka bank (debit)
                                                  → Sharma Sweets ka bank (credit)
            ← jawab wapas ←</pre>
     <p>PSP = Payment Service Provider. PSP bank app ko UPI network se jodta hai. NPCI switch banks tak request route karta hai; bank debit aur credit karte hain.</p>
     <p>ChaiPay ke andar har payment ek row hai, ek <b>state machine</b> ke saath:</p>
     <pre>CREATED → PENDING → SUCCESS
                    ↘ FAILED
PENDING mein timeout → status check (backoff ke saath) → SUCCESS ya FAILED</pre>
     <ul>
       <li>State sirf aage jaati hai. SUCCESS wapas PENDING nahi.</li>
       <li>Client ek <b>idempotency key</b> (client_txn_id) bhejta hai; DB mein UNIQUE. Ek logical payment ki key double click aur retry par wahi rahe. Key user ke scope mein ho; alag amount/payee par conflict do. UNIQUE claim ke saath bank ko bhi stable transaction ID bhejo; crash ke baad status se recover karo.</li>
     </ul>`,
    `<h3>📒 Ledger: double-entry</h3>
     <p>Har paisa ek khaate se nikalta hai aur doosre mein jaata hai. Har entry ka joda: Aman −₹500, Sharma Sweets +₹500. Jod hamesha zero.</p>
     <p>Aman −₹500, Sharma +₹500 ek saral transfer view hai. Double-entry mein har transaction ke total debits aur credits baraabar hon. Balanced entry bhi galat account par ho sakti hai; validation aur milaan chahiye.
     </p><p>Posted ledger entries badlo mat. Payment ID par posting ek baar karo; state aur ledger ko ek DB transaction mein likho. Galti hui? <b>Ulti entry</b> (reversal) likho, purani mat badlo. Isse har paise ka itihaas bachta hai.</p>
     <h3>🔄 Reconciliation (milaan)</h3>
     <p>Roz bank ya switch ki settlement file apne ledger se milao:</p>
     <ul>
       <li>Hamare paas PENDING, bank mein SUCCESS → SUCCESS karo, ledger entry.</li>
       <li>Paisa kata, credit nahi hua → reversal (paisa wapas).</li>
     </ul>
     <p>RBI circular RBI/2019-20/67 (20 September 2019): UPI transfer mein debit hua par beneficiary credit nahi ho saka toh T+1 tak auto-reversal. Merchant ko confirmation na mile toh T+5. Har sambandhit deadline ke baad deri par ₹100/din muavza apne aap credit ho. T transaction ki calendar date hai. Roz milaan aur automated recovery rakho.</p>`,
  ],
  stages: [
    {
      type: 'order',
      title: 'Aman → Sharma Sweets ₹500: sahi kram',
      instructions: 'Ek payment ke kadam sahi kram mein lagao. Beech mein timeout aata hai.',
      steps: [
        { text: 'App client_txn_id banati hai aur ChaiPay ko bhejti hai', explain: 'Idempotency key client banata hai, taaki retry par wahi id jaaye.' },
        { text: 'ChaiPay payment row banata hai: CREATED (client_txn_id UNIQUE)', explain: 'Double click par doosri row nahi banti; wahi payment lautta hai.' },
        { text: 'Switch ko request; state PENDING', explain: 'Ab paisa bank mein hil sakta hai. Jawab ka intezaar.' },
        { text: '30 second mein jawab nahi: status check, naya debit nahi', explain: 'Timeout = pata nahi. Usi transaction ka haal poochho.' },
        { text: 'Status: SUCCESS — ledger mein double entry (Aman −, Sharma +)', explain: 'Ab paisa pakka hila. Ledger ka joda likho.' },
        { text: 'Raat ko settlement file se reconciliation', explain: 'Bank aur ledger ka milaan. Kahin farak ho toh sudhaar ya reversal.' },
      ],
    },
    {
      type: 'design',
      title: 'Design Canvas — UPI jaisa payment',
      instructions: 'Har slot par sahi chunav. Galat options ka "kyun" bhi padho.',
      brief: `ChaiPay: Aman Sharma Sweets ko ₹500 bhejta hai. Network kabhi bhi toot sakta hai, app retry karti hai.
        Paisa na doobe, na do baar kate. Har paise ka hisaab mile.`,
      requirements: ['Double debit kabhi nahi', 'Timeout par sahi haalat', 'Har paise ka itihaas', 'Bank se roz milaan'],
      pass: 11,
      slots: [
        {
          id: 'idem', label: 'Double click / app retry', icon: '🔑',
          options: [
            { id: 'key', label: 'client_txn_id UNIQUE; retry par wahi payment', score: 3, why: 'Ek click, ek payment. Retry safe.' },
            { id: 'amount', label: 'Same amount + 1 minute ko duplicate maano', score: -2, why: 'Do asli ₹500 ke payments ek minute mein ho sakte hain — ek chhoot jaayega.' },
            { id: 'none', label: 'Har request naya payment; user dhyaan rakhe', score: -3, why: 'Network retry = double debit.' },
          ],
        },
        {
          id: 'timeout', label: 'Switch ka jawab nahi aaya', icon: '⏳',
          options: [
            { id: 'status', label: 'PENDING rakho; backoff ke saath status check', score: 3, why: 'Usi transaction ka haal poochho. Pakka hone tak "pending" dikhao.' },
            { id: 'retry', label: 'Naye transaction id se dobara bhejo', score: -3, why: 'Pehla shayad safal tha — double debit.' },
            { id: 'fail', label: 'Turant FAILED maan lo aur user ko batao', score: -2, why: 'Paisa shayad kat chuka. User dobara bhejega — double debit.' },
          ],
        },
        {
          id: 'ledger', label: 'Balance ka hisaab', icon: '📒',
          options: [
            { id: 'double', label: 'Double-entry ledger; galti par ulti entry', score: 3, why: 'Har paise ka joda aur itihaas. Jod zero, audit aasaan.' },
            { id: 'column', label: 'Ek balance column; har payment par UPDATE', score: -2, why: 'Itihaas gaya; galat update ka saboot nahi.' },
            { id: 'cache', label: 'Balance sirf Redis cache mein, tez rehne ke liye', score: -3, why: 'Cache gira toh paisa ka hisaab gaya.' },
          ],
        },
        {
          id: 'recon', label: 'Bank se milaan', icon: '🔄',
          options: [
            { id: 'daily', label: 'Roz settlement file se milaan + reversal', score: 3, why: 'Farak jaldi pakda jaata hai; tay samay mein paisa wapas.' },
            { id: 'trust', label: 'Apne DB par bharosa; milaan ki zaroorat nahi', score: -2, why: 'Timeout aur bugs se DB aur bank alag ho jaate hain. Pata hi nahi chalega.' },
            { id: 'monthly', label: 'Mahine ke ant mein haath se milaan', score: -1, why: 'Atka paisa hafton atka; muavza aur shikayatein.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Idempotency, timeout par status check, double-entry ledger aur roz ka milaan. Paisa na doobta hai, na do baar kat-ta hai.',
        ok: '👍 Zyadatar sahi. Ek chunav ya toh double debit ka darwaza hai ya hisaab kho deta hai.',
        bad: '🤔 Yaad karo: timeout = "pata nahi". Dobara bhejna = double debit.',
      },
    },
    {
      type: 'quiz',
      title: 'Payment ke deep-dive sawaal',
      questions: [
        {
          q: 'Switch se 30 second mein jawab nahi aaya. Aman ki app kya dikhaye?',
          choices: [
            '"Payment pending" aur status check; pakka hone tak fail mat bolo',
            '"Payment failed, dobara try karo"; user khud phir se bhej dega',
            '"Payment safal"; zyadatar payments safal hi hote hain',
            'App band kar do aur user ko bolo kal dekhe',
          ],
          answer: 0,
          explain: '"Failed" dekh ke user dobara bhejega — agar pehla safal tha toh double debit. "Pending" sach hai: abhi pata nahi. Status check se pakka karo.',
          choiceExplanations: [
            '"Failed" dekh ke user dobara bhejega — agar pehla safal tha toh double debit. "Pending" sach hai: abhi pata nahi. Status check se pakka karo.',
            'Galat "failed" double debit ka sabse aam raasta hai.',
            'Agar fail tha toh merchant ne saamaan de diya, paisa nahi aaya.',
            'User ka bharosa gaya. Sahi haalat dikhana hi kaam hai.',
          ],
        },
        {
          q: 'Reconciliation mein mila: ChaiPay DB mein PENDING, bank file mein SUCCESS. Kya karoge?',
          choices: [
            'Bank ki final haalat maano: SUCCESS, ledger entry, merchant credit',
            'Apne DB ko sahi maano: bank se bolo ki transaction ulta kare',
            'PENDING hi rehne do; dono mein farak normal hai',
            'Payment ko FAILED kar do aur Aman ko paisa wapas',
          ],
          answer: 0,
          explain: 'Paisa bank mein sach mein hil chuka. Hamara PENDING purani haalat hai (jawab kho gaya tha). Haalat aage badhao aur ledger poora karo.',
          choiceExplanations: [
            'Paisa bank mein sach mein hil chuka. Hamara PENDING purani haalat hai (jawab kho gaya tha). Haalat aage badhao aur ledger poora karo.',
            'Bank mein payment safal hai; galat ulta karna merchant ka nuksaan.',
            'PENDING atka rahega toh merchant ko paisa dikhega hi nahi.',
            'Paisa merchant ko pahunch chuka; Aman ko bhi lautaya toh ChaiPay ka nuksaan.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Payments',
    instructions: 'Payment design ke classic sawaal. 🎤',
    questions: [
      {
        q: 'Payment system mein "exactly once" kaise paas aate ho?',
        choices: [
          'Idempotency key + state machine + timeout par status check + reconciliation',
          'Distributed transaction (2PC) se bank aur ChaiPay ko ek saath commit karo',
          'Retry band kar do; ek hi koshish, toh ek hi debit',
          'Har payment ke baad user se poochho ki paisa kata ya nahi',
        ],
        answer: 0,
        explain: 'Network par exactly-once delivery nahi milti. Effect ek baar ho, iske liye: idempotency key, sirf aage chalne wali states, timeout par status check, aur roz ka milaan jo bachi galti pakde.',
        choiceExplanations: [
          'Network par exactly-once delivery nahi milti. Effect ek baar ho, iske liye: idempotency key, sirf aage chalne wali states, timeout par status check, aur roz ka milaan jo bachi galti pakde.',
          'Bahar ke bank tumhare 2PC mein shaamil nahi hote; aur 2PC coordinator girne par atak jaata hai.',
          'Retry band = network ki har galti par payment kho gaya ya atka.',
          'User ko nahi pata; system ko pata karna hai.',
        ],
      },
      {
        q: 'Balance ek column mein rakhoge ya ledger se nikaaloge?',
        choices: [
          'Ledger sach ka srot; balance usse nikla, cache ho toh ledger se milao',
          'Sirf column; ledger rakhna storage ki barbaadi hai',
          'Sirf ledger, aur har balance read par poora ledger jodo, bina cache',
          'Dono alag-alag update karo aur ummeed karo ki milte rahein',
        ],
        answer: 0,
        explain: 'Ledger itihaas aur saboot hai. Balance tez padhne ke liye ek nikli hui value — ledger ke saath ek hi transaction mein update, aur roz ledger se milaan.',
        choiceExplanations: [
          'Ledger itihaas aur saboot hai. Balance tez padhne ke liye ek nikli hui value — ledger ke saath ek hi transaction mein update, aur roz ledger se milaan.',
          'Paise ke system mein itihaas zaroori hai — audit, jhagde, regulator.',
          'Saalon ka ledger har read par jodna dheema. Nikli hui value ya snapshot rakho.',
          'Alag-alag updates kabhi na kabhi alag ho jaate hain.',
        ],
      },
    ],
  },
  success: [
    'Payment ko state machine ki tarah design karna',
    'Timeout par status check, dobara debit nahi',
    'Double-entry ledger aur roz ka reconciliation samjhana',
  ],
  homework: `Apne UPI app ki history mein koi "pending" payment dhoondho (ya yaad karo). Kitni der pending raha? Baad mein kya hua?
    Ek chhota state diagram banao: CREATED, PENDING, SUCCESS, FAILED, REVERSED — har teer par likho ki kaunsa event us teer ko chalata hai.`,
  cards: [
    { front: 'Payment mein timeout?', back: '"Pata nahi" — failure nahi. Status check karo, naya debit nahi.' },
    { front: 'Idempotency key?', back: 'client_txn_id, DB mein UNIQUE. Retry par wahi payment lautao.' },
    { front: 'Double-entry?', back: 'Har paisa ek khaate se nikle, doosre mein jaaye. Jod zero. Galti par ulti entry.' },
    { front: 'Reconciliation?', back: 'Roz bank/switch ki file se ledger ka milaan; PENDING sudhaaro, atka paisa reversal se wapas.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['iv-notify'] = {
  t: 'Zaroori aur bulk alag line mein',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">⚙️ services (event_id)</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">🧾 dedup + preferences</span><span class="dg-arrow">→</span>
      <span class="dg-pill bad">🚨 critical: OTP</span><span class="dg-arrow">/</span>
      <span class="dg-pill">💬 normal</span><span class="dg-arrow">/</span>
      <span class="dg-pill gold">🪔 bulk: offers (throttle)</span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill">📱 push (APNs/FCM)</span>
      <span class="dg-pill">✉️ SMS (provider A → B)</span>
      <span class="dg-pill">📧 email</span>
    </div>
    <div class="dg-cap">Provider ki hadd mein critical ka hissa reserved. Marketing opt-out alag, OTP alag.</div>`,
};
VISUALS['iv-upi'] = {
  t: 'Payment ki state machine',
  html: `
    <div class="dg-flow">
      <span class="dg-pill">CREATED<br><small>client_txn_id UNIQUE</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">PENDING<br><small>switch ko request</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill good">SUCCESS<br><small>ledger: −₹500 / +₹500</small></span>
    </div>
    <div class="dg-flow">
      <span class="dg-pill acc">PENDING</span><span class="dg-arrow">→ timeout →</span>
      <span class="dg-pill gold">status check<br><small>naya debit nahi</small></span><span class="dg-arrow">→</span>
      <span class="dg-pill">SUCCESS / FAILED</span><span class="dg-arrow">→</span>
      <span class="dg-pill">🔄 roz ka milaan</span>
    </div>`,
};

SD.addScenes({
  'iv-notify': {
    intro: 'Shaam 6:30: Diwali offer campaign <b>2 crore users</b> ko. Usi waqt Aman login ka OTP maangta hai.',
    nodes: [
      { id: 'camp', col: 0, row: 0, icon: '🪔', label: 'Diwali campaign', sub: '2 crore offers' },
      { id: 'aman', col: 0, row: 1, icon: '🙋', label: 'Aman', sub: 'login OTP', tone: 'accent' },
      { id: 'fifo', col: 1, row: 0, icon: '📨', label: 'Ek FIFO queue', sub: 'purana dhaancha' },
      { id: 'crit', col: 1, row: 1, icon: '🚨', label: 'Critical queue', sub: 'naya dhaancha' },
      { id: 'sms', col: 2, row: 0, icon: '✉️', label: 'SMS provider', sub: 'TPS ki hadd' },
      { id: 'phone', col: 3, row: 0, icon: '📱', label: 'Aman ka phone' },
    ],
    steps: [
      { from: 'camp', to: 'fifo', label: '1.8 crore line mein', tone: 'bad', say: 'Purana dhaancha: campaign ke 1.8 crore messages ek hi FIFO queue mein.' },
      { from: 'aman', to: 'fifo', label: 'OTP — sabse peeche', tone: 'bad', set: { fifo: { tone: 'bad', sub: 'OTP 6 min late' } }, say: 'Aman ka OTP 1.8 crore offers ke peeche. 6 minute baad pahunchta hai; login fail.' },
      { at: ['camp'], set: { camp: { tone: 'gold', sub: 'paused, phir throttle' } }, say: 'Campaign pause karo. Pending offers bhi FIFO se bulk queue mein alag karo, taaki OTP aage badhe. Bulk queue dheere chalao (throttle).' },
      { from: 'aman', to: 'crit', label: 'OTP', tone: 'good', say: 'Naya dhaancha: OTP critical queue mein, apne workers ke saath.' },
      { from: 'crit', to: 'sms', label: 'reserved hissa', tone: 'good', say: 'SMS provider ki hadd mein critical ka hissa reserved. Campaign kitna bhi bada ho.' },
      { from: 'sms', to: 'phone', label: 'OTP 5 sec mein', tone: 'good', set: { phone: { tone: 'good', sub: 'login ho gaya' } }, say: 'OTP 5 second mein. Aman login kar leta hai.' },
      { at: ['crit'], say: 'Saath mein dedup: event_id + recipient + channel ki key, taaki retry wala event dobara OTP na bheje.' },
    ],
  },
  'iv-upi': {
    intro: 'Aman, Sharma Sweets ko <b>₹500</b> bhejta hai. Beech mein network ka jawab kho jaata hai.',
    nodes: [
      { id: 'app', col: 0, row: 0, icon: '📱', label: 'Aman ki app', sub: 'client_txn_id: t-77' },
      { id: 'cp', col: 1, row: 0, icon: '💸', label: 'ChaiPay backend', sub: 'CREATED' },
      { id: 'sw', col: 2, row: 0, icon: '🔀', label: 'UPI switch' },
      { id: 'bank', col: 3, row: 0, icon: '🏦', label: 'Aman ka bank', sub: 'debit ₹500' },
      { id: 'ledger', col: 1, row: 1, icon: '📒', label: 'Ledger', sub: 'double-entry' },
      { id: 'recon', col: 2, row: 1, icon: '🔄', label: 'Roz ka milaan' },
    ],
    steps: [
      { from: 'app', to: 'cp', label: 'pay ₹500 (t-77)', say: 'App ek idempotency key (t-77) ke saath request bhejti hai. ChaiPay row banata hai: CREATED.' },
      { from: 'cp', to: 'sw', label: 'request', set: { cp: { tone: 'accent', sub: 'PENDING' } }, say: 'Switch ko request. State PENDING.' },
      { from: 'sw', to: 'bank', label: 'debit', tone: 'good', set: { bank: { tone: 'good', sub: '₹500 kata' } }, say: 'Aman ke bank ne ₹500 kaata.' },
      { at: ['cp'], set: { cp: { tone: 'gold', sub: 'timeout: pata nahi' } }, say: 'Jawab raaste mein kho gaya. 30 second ka timeout. Timeout ka matlab "pata nahi", failure nahi.' },
      { from: 'app', to: 'cp', label: 'retry (wahi t-77)', say: 'App retry karti hai, wahi t-77 ke saath. ChaiPay naya payment nahi banata; wahi row lautata hai.' },
      { from: 'cp', to: 'sw', label: 'status check (t-77)', tone: 'good', set: { cp: { tone: 'good', sub: 'SUCCESS' } }, say: 'ChaiPay naya debit nahi bhejta; status poochhta hai. Jawab: SUCCESS.' },
      { from: 'cp', to: 'ledger', label: 'Aman −500, Sharma +500', tone: 'good', say: 'Ledger mein joda: Aman −₹500, Sharma Sweets +₹500. Jod zero.' },
      { from: 'ledger', to: 'recon', label: 'raat ko', tone: 'gold', say: 'Raat ko bank ki settlement file se milaan. Kahin PENDING atka ho toh sudhaar; paisa kata par credit nahi hua toh reversal.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-iv-notify', levels: 'iv-notify', guide: {
    title: 'Ek line mein sab, ya priority ke hisaab se alag?',
    misaal: 'Shaadi ke card: zaroori logon ko phone, baaki ko daak. Dadi ko raat 2 baje phone nahi. Ek rishtedaar ko teen card nahi.',
    asli: 'Notification system mein priority isolation, dedup, retry + failover aur kism ke hisaab preferences sabse zaroori hain.',
    points: [
      '<b>Isolation:</b> critical, normal, bulk alag queues aur workers.',
      '<b>Dedup:</b> event_id + recipient + channel ki key.',
      '<b>Marzi:</b> marketing opt-out alag, quiet hours, din ki hadd.',
    ],
    use: 'OTP, receipts aur marketing ek hi system se jaate hon.',
    avoid: 'Bada campaign usi queue se mat chalao jisme OTP hain.',
    mistake: 'Text same ho toh duplicate maan lena — do asli payments chhoot sakte hain.',
    compare: [
      { choice: 'Ek queue, simple', when: 'Sirf ek kism ke notifications, kam volume', tradeoff: 'Aasaan; bulk aate hi zaroori messages atakte hain' },
      { choice: 'Priority queues + reserved budget', when: 'OTP aur campaigns dono', tradeoff: 'Zaroori turant; zyada queues, workers aur config' },
    ],
    followup: 'Push provider ne bataya ki 20% devices ke tokens purane hain. Bekaar bhejne se kaise bachoge?',
    sources: [
      'idem',
      'retry',
      { title: 'Firebase Cloud Messaging — Message types and options (collapsible, priority)', url: 'https://firebase.google.com/docs/cloud-messaging/concept-options' },
    ],
  } },
  { id: 'pro-iv-upi', levels: 'iv-upi', guide: {
    title: 'Timeout par dobara bhejo ya status poochho?',
    misaal: 'Cheque dene ke baad bijli chali gayi. Doosra cheque dene se pehle poochho ki pehle wale ka kya hua.',
    asli: 'Payment ek state machine hai. Timeout = pata nahi. Idempotency key, status check, double-entry ledger aur roz ka milaan double debit aur doobe paise dono rokte hain.',
    points: [
      '<b>Idempotency:</b> client_txn_id UNIQUE.',
      '<b>Timeout:</b> PENDING + status check; naya debit nahi.',
      '<b>Hisaab:</b> double-entry ledger, roz reconciliation, reversal.',
    ],
    use: 'Paisa hilane wala koi bhi flow: wallet, payout, refund.',
    avoid: 'Timeout par naye transaction id se dobara bhejna.',
    mistake: 'Timeout ko FAILED dikhana — user dobara bhejega.',
    compare: [
      { choice: 'Status check + backoff', when: 'Jawab kho gaya, haalat pata nahi', tradeoff: 'Double debit nahi; user ko thodi der "pending" dikhta hai' },
      { choice: 'Turant retry (naya id)', when: 'Kabhi nahi, jab tak pakka na ho ki pehla nahi pahuncha', tradeoff: 'Tez lagta hai; double debit ka seedha raasta' },
    ],
    followup: 'Status check API bhi 10 minute se jawab nahi de raha. User ko kya dikhaoge, aur paisa kab tak lautega?',
    sources: [
      'idem',
      { title: 'NPCI — UPI presentation (PSP, switch aur banks ka flow; DBT Bharat par hosted)', url: 'https://dbtbharat.gov.in/data/documents/npci%202%20upi.pdf' },
      { title: 'RBI — Harmonisation of Turn Around Time and customer compensation for failed transactions (2019)', url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11693' },
    ],
  } },
);
})();
