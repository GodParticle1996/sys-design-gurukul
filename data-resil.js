(() => {
/* =====================================================================
   TRACK 4 — Scale & Resilience
   timeouts · retries · breaker · bulkhead · dlq · degrade · shedding ·
   flashcrowd · observability · slo · boss-resil
   ===================================================================== */

const T_TIMEOUT = [
  { text: 'Baseline dekho — p99 SLO ke andar',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 < 300) },
  { text: 'Downstream ko 8 second dheema karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'latency' && r.value >= 5000) },
  { text: 'Dekho ki uski latency seedha tumhare p99 mein judi',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 > 5000) },
  { text: 'Timeout lagao — apne SLO se KAM',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout' && r.ms <= 200) },
  { text: 'Ab HTTP 504 bounded ho — p99 600ms se kam',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && r.what === 'timeout');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'http' && r.status === 504 && r.p99 < 600); } },
];

const T_RETRY = [
  { text: 'Downstream down karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'down') },
  { text: 'Timeout lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout') },
  { text: 'Bina jitter ke retry lagao — warning padho',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'retry' && (!r.cfg.jitter || r.cfg.jitter === 'none')) },
  { text: 'Dekho ki retry ne p99 BADHA diya',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && r.what === 'retry');
      const fixed = s.records.findIndex(r => r.kind === 'sim' && r.what === 'retry' && r.cfg.jitter === 'full');
      return i > -1 && s.records.slice(i, fixed < 0 ? undefined : fixed).some(r => r.kind === 'http' && r.status === 504 && r.p99 > 1000); } },
  { text: 'Ab jitter ke saath lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'retry' && r.cfg.jitter && r.cfg.jitter !== 'none') },
];

const T_BREAKER = [
  { text: 'Downstream down + timeout — halat kharab karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'down') },
  { text: 'Circuit breaker lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'breaker') },
  { text: 'Fallback bhi do — warna breaker sirf tez failure hai',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'fallback') },
  { text: 'Requests bhejo aur breaker ko trip hote DEKHO',
    check: s => s.records.filter(r => r.kind === 'http' && r.method === 'GET').length >= 5 },
  { text: 'Trip hone ke baad p99 gir jaana chahiye (fail fast)',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 < 100) },
];

const T_BULKHEAD = [
  { text: 'Downstream ko dheema karo', check: s => s.records.some(r => r.kind === 'sim' && r.what === 'latency') },
  { text: 'Timeout lagao', check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout') },
  { text: 'Us dependency ke liye bulkhead lagao', check: s => s.records.some(r => r.kind === 'sim' && r.what === 'bulkhead') },
  { text: 'Request bhejo: timeout par HTTP 504, bulkhead cap live state mein 20', check: s => s.records.some(r => r.kind === 'http' && r.status === 504) && s.sys.app.bulkheads?.ledger === 20 },
];

const T_SHED = [
  { text: 'Capacity se zyada load daalo — sab mar jaayenge',
    check: s => s.records.some(r => r.kind === 'load' && r.saturated) },
  { text: 'Admission control lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'admission') },
  { text: 'Wahi load dobara — ab kuch to bach jaayenge',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && r.what === 'admission');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && !r.saturated && r.queuedRps > 0); } },
];

const T_FLASH = [
  { text: 'As-is 1.2 lakh rps daalo — system gir jaayega',
    check: s => s.records.some(r => r.kind === 'load' && r.rps >= 100000 && r.saturated) },
  { text: 'Results precompute karo (rank calculation pehle hi kar lo)',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'precompute') },
  { text: 'Pre-scale karo — autoscaling ka intezaar mat karo',
    check: s => s.records.some(r => r.kind === 'sim' && r.op === 'scale') },
  { text: 'Admission control (waiting room) lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'admission') },
  { text: 'Ab dobara load test karo — survive karna chahiye',
    check: s => { const i = s.records.findIndex(r => r.kind === 'sim' && r.op === 'precompute');
      return i > -1 && s.records.slice(i).some(r => r.kind === 'load' && r.rps >= 100000 && !r.saturated); } },
];

const T_OBS = [
  { text: 'Load daalo taaki kuch dekhne laayak ho',
    check: s => s.records.some(r => r.kind === 'load') },
  { text: '/health maango — dekho woh kya CHHUTA hai',
    check: s => s.records.some(r => r.kind === 'health') },
  { text: 'Metrics dekho — utilization vs saturation',
    check: s => s.records.some(r => r.kind === 'metrics') },
  { text: 'Trace se ek request ka safar dekho',
    check: s => s.records.some(r => r.kind === 'trace') },
  { text: 'Error budget nikalo',
    check: s => s.records.some(r => r.kind === 'slo') },
];

const T_BOSS_RESIL = [
  { text: 'Incident recreate karo — downstream dheema',
    check: s => s.records.some(r => r.kind === 'sim' && (r.what === 'latency' || r.what === 'down')) },
  { text: 'Timeout lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'timeout') },
  { text: 'Jitter wala retry lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'retry' && r.cfg.jitter && r.cfg.jitter !== 'none') },
  { text: 'Circuit breaker lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'breaker') },
  { text: 'Fallback do',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'fallback') },
  { text: 'Bulkhead lagao',
    check: s => s.records.some(r => r.kind === 'sim' && r.what === 'bulkhead') },
  { text: 'Prove karo — p99 wapas SLO ke andar',
    check: s => s.records.some(r => r.kind === 'http' && r.status === 200 && r.p99 < 200) },
];

SD.registerLevels('resil', [

/* ===================================================================== */
{
  id: 'timeouts',
  icon: '⏱️',
  title: 'Timeouts — Har Remote Call par, Default',
  badge: 'Time Keeper',
  objectives: [
    'Teen alag timeouts: connect · read · <b>total</b>',
    'Timeout tumhare SLO se <b>kam</b> kyun hona chahiye',
    'Timeout budget aur deadline propagation',
    'Bina timeout ke cascade kaise banta hai',
  ],
  lesson: [
    `<h3>📖 Down se zyada khatarnak: DHEEMA</h3>
     <p>Agar downstream <b>down</b> hai toh connection turant refuse hota hai —
     tum turant fail ho ke aage badh jaate ho. Par agar woh <b>dheema</b> hai:</p>
     <pre>t0  downstream 30 s lene laga
t1  har request 30 s latki — thread + connection blocked
t2  thread pool khatam — ab SAARE endpoints down
t3  tumhare callers bhi latak gaye — cascade 💥</pre>
     <p>Ek dependency ne poore system ko le dooba, aur woh <b>down bhi nahi
     thi</b>. Yahi wajah hai ki timeout ek <b>optional tuning</b> nahi —
     woh ek <b>correctness</b> ki cheez hai.</p>
     <h3>⏱️ Teen alag timeouts</h3>
     <table>
       <tr><th>Timeout</th><th>Kya naapta hai</th><th>Typical</th></tr>
       <tr><td>connect</td><td>TCP handshake — "woh zinda hai?"</td><td>1-3 s</td></tr>
       <tr><td>read/socket</td><td>bytes ke <b>beech</b> ka gap</td><td>5-30 s</td></tr>
       <tr><td><b>total/request</b></td><td>poori call — <b>yahi asli hai</b></td><td>SLO se kam</td></tr>
     </table>
     <p>Log aksar sirf connect timeout lagate hain aur phir bhi 30 second
     latakte hain — kyunki connection toh ban gaya tha, bas jawab nahi aaya.
     Aur read timeout bhi kaafi nahi: agar server har 4 second mein 1 byte
     bhejta rahe toh 10 s ka read timeout kabhi trigger hi nahi hoga.
     <b>Total timeout hi asli guarantee deta hai.</b></p>`,
    `<h3>🔬 Timeout budget</h3>
     <p>Tumhara SLO 200 ms hai. Tum 3 services call karte ho. Har ek ko
     200 ms ka timeout doge? Toh tum 600 ms tak latak sakte ho — aur
     tumhara SLO bekaar ho gaya.</p>
     <pre>SLO 200 ms
  ├─ apna kaam        20 ms
  ├─ service A        60 ms
  ├─ service B        60 ms
  └─ service C        40 ms
                     ─────
     total budget    180 ms   (20 ms headroom)</pre>
     <p><b>Deadline propagation</b> isse behtar hai: har call ko fixed
     timeout dene ki jagah, <b>bacha hua</b> budget bhejo:</p>
     <pre>request aayi, deadline = now + 200 ms
  → A ko call: timeout = deadline - now = 195 ms
  → A ne 50 ms liye
  → B ko call: timeout = deadline - now = 145 ms
  → agar deadline nikal gaya: call karo hi mat, turant fail karo</pre>
     <p class="tip">🎯 Aakhri line sabse zaroori hai: agar deadline pehle hi
     nikal chuka hai, toh downstream ko call karna <b>barbaadi</b> hai —
     client toh ja chuka hai. gRPC yeh built-in karta hai; HTTP mein tumhe
     khud karna padta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '⏱️ Timeout se p99 baandho',
      goal: 'Ek downstream service dheemi ho jaayegi. Dekho ki uski latency seedha tumhare p99 mein judti hai — phir timeout laga ke damage baandho.',
      sys: SD.sys.orders(),
      tasks: T_TIMEOUT,
      success: SD.allTasks(T_TIMEOUT),
      successText: `Dhyaan do: timeout ne latency <b>theek nahi ki</b> — usne use <b>bounded</b> kiya.
        <br><br>Yeh farak zaroori hai. Downstream abhi bhi dheema hai. Par ab tumhara p99
        uski marzi par nahi, <b>tumhare faisle</b> par tika hai.
        <br><br>Niyam: har remote call par timeout — <b>default</b>, opt-in nahi — aur woh
        timeout tumhare apne SLO se <b>kam</b> hona chahiye.`,
      solution: [
        "GET /api/v1/orders?page=1&limit=50",
        "sim inject latency ledger 8000",
        "GET /api/v1/orders?page=1&limit=50",
        "sim add timeout ledger 150",
        "GET /api/v1/orders?page=1&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.timeoutMs === 150 && m.current(s, 'http', r => r.status === 504 && r.p99 < 600); },
      hints: [
        "Pehle observation: Baseline dekho — p99 SLO ke andar. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab HTTP 504 bounded ho — p99 600ms se kam. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nGET /api/v1/orders?page=1&limit=50\nsim inject latency ledger 8000\nGET /api/v1/orders?page=1&limit=50\nsim add timeout ledger 150\nGET /api/v1/orders?page=1&limit=50",
      ],
    },
    {
      type: 'hotspot',
      title: 'Timeouts par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'timeouts',
      questions: [
        { q: 'Kaunsa timeout asli guarantee deta hai?', target: 'total', explain: 'Total/request timeout. Connect timeout se sirf handshake bandhta hai; read timeout se bytes ka gap. Agar server har 4s mein 1 byte bheje toh read timeout kabhi trigger nahi hoga.' },
        { q: '3 services call kar rahe ho — har ek ko 200ms timeout dena kyun galat hai?', target: 'budget', explain: 'Tum 600ms tak latak sakte ho aur SLO 200ms hai. Budget baanto — ya behtar, deadline propagate karo: har call ko BACHA HUA budget do.' },
        { q: 'Timeout ka pehla niyam kya hai?', target: 'rule', explain: 'Har remote call par timeout — DEFAULT, opt-in nahi. Aur woh apne SLO se kam. Warna tum apna vaada doosre ke haath mein de rahe ho.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Timeouts ki samajh',
      questions: [
        {
          q: 'Dheemi dependency down dependency se zyada khatarnak kyun hai?',
          choices: ["Slow calls resources ko der tak hold karti","Har down dependency turant refuse karti","Slow call se failures count kam rehta","Fast refusal worker ko permanently roke"],
          answer: 0,
          explain: "Slow/hung calls resources ko bounded timeout tak hold karti hain; immediate refusal se waits jaldi end ho sakti hain. Down server bhi packet-drop/connection timeout kar sakta hai, so down always fast theorem nahi. Shared pools par slow waits cascade kar sakte hain.",
         choiceExplanations: ["Slow/hung calls resources ko bounded timeout tak hold karti hain; immediate refusal se waits jaldi end ho sakti hain. Down server bhi packet-drop/connection timeout kar sakta hai, so down always fast theorem nahi. Shared pools par slow waits cascade kar sakte hain.","Down dependency timeout bhi kar sakti hai; immediate refusal guaranteed nahi.","Low error count ke bawajood waits pools exhaust kar sakte hain.","Immediate refusal usually resources jaldi release karti hai."] },
        {
          q: 'Deadline propagation kya karta hai?',
          choices: ["Remaining deadline budget forward kare","Har hop ko poora original timeout de","Client chala jaaye toh retries badha de","Deadline ko per hop reset karta rahe"],
          answer: 0,
          explain: 'Fixed timeouts har call ko poora budget dete hain, isliye total budget se aage nikal jaata hai. Deadline propagation ek absolute deadline bhejta hai. Aur uska sabse bada faayda woh aakhri baat hai: <b>jo kaam ab kisi ke liye nahi hai, woh karo hi mat</b> — overload ke waqt yeh bahut load bacha deta hai.',
         choiceExplanations: ["Fixed timeouts har call ko poora budget dete hain, isliye total budget se aage nikal jaata hai. Deadline propagation ek absolute deadline bhejta hai. Aur uska sabse bada faayda woh aakhri baat hai: <b>jo kaam ab kisi ke liye nahi hai, woh karo hi mat</b> — overload ke waqt yeh bahut load bacha deta hai.","Har hop ko full budget dene se end-to-end deadline exceed ho sakti hai.","Client ke baad unnecessary work cancellation/deadline se bound karo.","Resetting deadline propagation ka purpose tod deta hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Timeouts',
    instructions: 'Yeh sawaal lagbhag har resilience discussion mein aata hai. 🎤',
    questions: [
      {
        q: '"Timeout kitna rakhoge?"',
        choices: ["Remaining budget aur latency tails se chuno","Average latency ko exact timeout banao","Every dependency ko fixed 30 seconds do","Failure avoid karne ko timeout hata do"],
        answer: 0,
        explain: "Caller deadline ke remaining budget se per-attempt timeout choose karo; downstream latency distribution aur acceptable false-timeout rate se validate karo. Retries, connection setup aur cleanup ka budget include karo; p99-plus-fixed-margin universal recipe nahi.",
       choiceExplanations: ["Caller deadline ke remaining budget se per-attempt timeout choose karo; downstream latency distribution aur acceptable false-timeout rate se validate karo. Retries, connection setup aur cleanup ka budget include karo; p99-plus-fixed-margin universal recipe nahi.","Average se tail percentage nahi pata; excessive false timeouts ho sakte hain.","Fixed 30s caller SLO aur downstream latency budget ignore karta hai.","Unlimited waits threads/connections aur user deadline exhaust kar sakte hain."] },
      {
        q: '"Ek dependency dheemi ho gayi aur poora service down ho gaya. Kaise roka ja sakta tha?"',
        choices: ["Bounded wait plus dependency isolation","Only retries se stuck resource chhodo","Only instances se dependency fix karo","Only provider scale ki request bhejo"],
        answer: 0,
        explain: 'Sahi jawab <b>do alag</b> guards deta hai kyunki woh do alag cheezein karte hain: timeout ek call ka <b>intezaar</b> baandhta hai; bulkhead us dependency ka <b>blast radius</b> baandhta hai. Retry yahan bilkul ulta hota — dheemi service ko aur maarna.',
       choiceExplanations: ["Sahi jawab <b>do alag</b> guards deta hai kyunki woh do alag cheezein karte hain: timeout ek call ka <b>intezaar</b> baandhta hai; bulkhead us dependency ka <b>blast radius</b> baandhta hai. Retry yahan bilkul ulta hota — dheemi service ko aur maarna.","Retries hung calls ke saath aur concurrency consume kar sakti hain.","More app instances slow dependency par aur load bhej sakti hain.","Provider fix useful hai; caller ko failure containment khud chahiye."] },
    ],
  },
  success: [
    'Teen timeouts mein farak kar sakte ho',
    'Timeout budget baant sakte ho',
    'Deadline propagation samjha sakte ho',
    'Bata sakte ho ki dheemi dependency down se zyada khatarnak kyun hai',
  ],
  homework: `Apne code mein saare HTTP client aur DB client dhoondo. Kitno par
    <b>total timeout</b> set hai? Zyadatar codebases mein jawab "ek bhi nahi" hota hai —
    kyunki default aksar "infinite" ya "60 second" hota hai.`,
  cards: [
    { front: 'Dheema vs Down — kaunsa bura?', back: '<b>Dheema.</b> Down par connection refuse hota hai, tum aage badh jaate ho. Dheema par har request thread + connection pakde rehti hai → pool khatam → SAARE endpoints down.' },
    { front: 'Teen timeouts?', back: '<b>connect</b> (handshake, 1-3s) · <b>read</b> (bytes ke beech ka gap) · <b>total/request</b> (poori call — <b>yahi asli hai</b>, SLO se kam).' },
    { front: 'Timeout budget?', back: 'SLO 200ms, 3 calls → har ek ko 200ms dena galat hai (600ms tak latak sakte ho). Baanto: 60+60+40+20 = 180ms.' },
    { front: 'Deadline propagation?', back: 'Har call ko <b>bacha hua</b> budget bhejo, fixed nahi. Aur deadline nikal chuka ho toh <b>call karo hi mat</b> — client ja chuka hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'retries',
  icon: '🔁',
  title: 'Retries — Madad Bhi, Aag Mein Ghee Bhi',
  badge: 'Storm Breaker',
  objectives: [
    'Retry storm kaise banta hai',
    'Backoff kaafi nahi — <b>jitter</b> chahiye',
    'Kya retry karo, kya bilkul nahi',
    'Layers ka guna — 3×3×3 = 27 requests',
  ],
  lesson: [
    `<h3>📖 Retry ne service ko maara</h3>
     <pre>t0  service thodi dheemi hui — 10% errors
t1  sab clients retry karte hain      → load ×2
t2  aur zyada errors                  → load ×3
t3  service poori tarah gir gayi      💀</pre>
     <p>Sabse dukhad baat: service <b>apne aap theek ho jaati</b> — par
     retries ne use theek hone ka mauka hi nahi diya. Yeh production ka
     sabse aam self-inflicted outage hai.</p>
     <h3>🎯 Backoff kaafi nahi hai</h3>
     <p>"Exponential backoff laga diya" sunne mein safe lagta hai. Par socho:
     saare clients ne <b>ek saath</b> failure dekha —</p>
     <pre>sab ne 1 s wait kiya → sab ne EK SAATH maara
sab ne 2 s wait kiya → sab ne EK SAATH maara
sab ne 4 s wait kiya → sab ne EK SAATH maara</pre>
     <p>Backoff ne bharam diya ki load kam hoga. Asal mein storm sirf
     <b>synchronize</b> ho gaya — ab woh spikes mein aata hai.</p>
     <pre>✅ Full jitter:
   sleep = random(0, min(cap, base × 2^attempt))</pre>
     <p>Ab har client alag time par retry karega aur load <b>phail</b> jaayega.
     Jitter ek line ka change hai jo retry ko safe banata hai.</p>`,
    `<h3>🔬 Kya retry karo, kya nahi</h3>
     <table>
       <tr><th>❌ Retry MAT karo</th><th>Kyun</th></tr>
       <tr><td>400 Bad Request</td><td>request galat hai — dobara bhi galat hogi</td></tr>
       <tr><td>401 / 403</td><td>permission ka masla — retry se nahi badlega</td></tr>
       <tr><td>404</td><td>hai hi nahi</td></tr>
       <tr><td>422</td><td>validation — data theek karna padega</td></tr>
     </table>
     <table>
       <tr><th>✅ Retry KARO</th><th>Kaise</th></tr>
       <tr><td>429</td><td><b>Retry-After ke hisaab se</b>, apne backoff se nahi</td></tr>
       <tr><td>503 / 504</td><td>backoff + jitter</td></tr>
       <tr><td>network timeout / connection reset</td><td>backoff + jitter</td></tr>
     </table>
     <p><b>Aur sirf idempotent operations.</b> Non-idempotent POST ko retry
     karna hai? Toh pehle Idempotency-Key lagao (Track 2).</p>
     <h3>⚠️ Layers ka guna</h3>
     <pre>SDK: 3 retries × gateway: 3 retries × client app: 3 retries
= 27 requests, EK user action ke liye</pre>
     <p class="tip">🎯 Retry <b>ek</b> layer par rakho — aksar sabse upar
     wali (jo user ke sabse kareeb hai aur jaanti hai ki request abhi
     matter karti hai ya nahi). Beech ki layers mein retry band karo.
     Yeh ek audit hai jo har team ko karna chahiye aur lagbhag koi nahi karta.</p>
     <p>Aur ek aur guard: <b>retry budget</b>. "Kul requests ka 10% se zyada
     retries nahi" — isse ek dependency ka failure poore system ka load
     multiply nahi kar sakta.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🌩️ Retry ko ULTA padte dekho',
      goal: 'Downstream down hai. Timeout lagao, phir bina jitter ke retry lagao — aur dekho ki retry ne p99 aur BADHA diya. Phir jitter lagao.',
      sys: SD.sys.orders(),
      tasks: T_RETRY,
      success: SD.allTasks(T_RETRY),
      successText: `Yeh sabse zaroori seekh hai: <b>retry ne p99 theek nahi kiya — usne
        badha diya.</b> 3 attempts × timeout + backoff waits = kai second.
        <br><br>Retry tab kaam karta hai jab failure <b>transient</b> ho (ek blip). Jab
        downstream sach mein down hai, retry sirf:
        <br>• tumhara p99 badhata hai
        <br>• downstream par load multiply karta hai
        <br>• aur tumhare threads lambe samay tak bandhak rakhta hai
        <br><br>Isi khaali jagah ko bharne ke liye <b>circuit breaker</b> banta hai — agla level.`,
      solution: [
        "sim inject down ledger",
        "sim add timeout ledger 500",
        "sim add retry ledger --max 3 --backoff exp",
        "GET /api/v1/orders?page=1&limit=50",
        "sim add retry ledger --max 3 --backoff exp --jitter full",
        "GET /api/v1/orders?page=2&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.retry?.jitter === 'full' && s.sys.deps.ledger.retry.max === 3 && s.sys.deps.ledger.timeoutMs === 500 && m.current(s, 'http', r => r.status === 504 && r.p99 > 1000); },
      hints: [
        "Pehle observation: Downstream down karo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab jitter ke saath lagao. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim inject down ledger\nsim add timeout ledger 500\nsim add retry ledger --max 3 --backoff exp\nGET /api/v1/orders?page=1&limit=50\nsim add retry ledger --max 3 --backoff exp --jitter full\nGET /api/v1/orders?page=2&limit=50",
      ],
    },
    {
      type: 'bins',
      title: 'Retry karna chahiye?',
      instructions: 'Har response ko sahi bin mein daalo.',
      bins: [
        { id: 'yes', label: '✅ Retry karo' },
        { id: 'no', label: '❌ Retry mat karo' },
      ],
      items: [
        { text: '503 Service Unavailable', bin: 'yes', explain: 'Server bhara hua hai — transient. Backoff + jitter ke saath retry sahi hai.' },
        { text: '400 Bad Request', bin: 'no', explain: 'Request hi galat hai. Dobara bhejne se woh sahi nahi ho jaayegi — sirf load hai.' },
        { text: 'Network timeout / connection reset', bin: 'yes', explain: 'Classic transient failure. Par dhyaan: agar operation non-idempotent hai toh Idempotency-Key chahiye.' },
        { text: '403 Forbidden', bin: 'no', explain: 'Permission ka masla — retry se permission nahi mil jaayegi. Yeh permanent hai.' },
        { text: '429 Too Many Requests', bin: 'yes', explain: 'Retry karo — par <b>Retry-After ke hisaab se</b>, apne backoff se nahi. Server ne bata diya hai ki kab aana hai.' },
        { text: '422 Unprocessable Entity', bin: 'no', explain: 'Validation fail hui. Data theek kiye bina retry bekaar hai.' },
        { text: '504 Gateway Timeout', bin: 'yes', explain: 'Upstream timeout — transient ho sakta hai. Par dhyaan rakho: request shayad SAFAL ho chuki ho, isliye idempotency zaroori hai.' },
        { text: '404 Not Found', bin: 'no', explain: 'Resource hai hi nahi. (Exception: agar tumne abhi banaya hai toh replica lag ho sakta hai — par woh alag design problem hai.)' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Retry ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'retries',
      questions: [
        { q: 'Backoff hone par bhi storm kyun banta hai?', target: 'nojitter', explain: 'Sab clients ne ek saath failure dekha, isliye sab ek saath wait karte hain aur ek saath maarte hain. Backoff ne storm ko kam nahi, SYNCHRONIZE kiya.' },
        { q: 'Ek user action ke liye 27 requests kaise ban jaati hain?', target: 'layers', explain: 'Layers ka guna: SDK 3 × gateway 3 × client 3. Retry EK layer par rakho — aksar sabse upar wali.' },
        { q: 'Sabse sasta fix kaunsa hai?', target: 'jitter', explain: 'Full jitter: sleep = random(0, min(cap, base × 2^n)). Ek line ka change jo load phaila deta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Retry ki samajh',
      questions: [
        {
          q: 'Exponential backoff lagane ke baad bhi storm kyun banta hai?',
          choices: ["Same schedule retries synchronize karta","Backoff random jitter khud add karta","Attempt limit se retry timing random hoti","Low traffic mein synchronization impossible"],
          answer: 0,
          explain: 'Yeh jawab dikhata hai ki tumne yeh sach mein dekha hai. Backoff har <b>ek</b> client ke liye sahi kaam karta hai, par saare clients milkar ek <b>coordinated</b> wave banate hain. <b>Jitter</b> hi woh cheez hai jo unhe alag karti hai.',
         choiceExplanations: ["Yeh jawab dikhata hai ki tumne yeh sach mein dekha hai. Backoff har <b>ek</b> client ke liye sahi kaam karta hai, par saare clients milkar ek <b>coordinated</b> wave banate hain. <b>Jitter</b> hi woh cheez hai jo unhe alag karti hai.","Deterministic exponential schedule same failure par same retry times deta hai.","Attempt count bound aur timing randomness alag controls hain.","Even small cohort common failure se synchronized ho sakta hai."] },
        {
          q: 'Downstream sach mein DOWN hai. Retry se kya hoga?',
          choices: ["Extra attempts cost aur delay badha sakti","Retry unavailable server ko repair kare","Retry timeout ko automatically chhota kare","Retry original operation ko cancel kare"],
          answer: 0,
          explain: 'Retry ek <b>shart</b> par kaam karta hai: failure transient ho. Jab woh sach mein down hai, har retry sirf nuksaan hai. Isi khaali jagah ko <b>circuit breaker</b> bharta hai — woh pehchaan leta hai ki "yeh transient nahi hai" aur retry karna hi band kar deta hai.',
         choiceExplanations: ["Retry ek <b>shart</b> par kaam karta hai: failure transient ho. Jab woh sach mein down hai, har retry sirf nuksaan hai. Isi khaali jagah ko <b>circuit breaker</b> bharta hai — woh pehchaan leta hai ki \"yeh transient nahi hai\" aur retry karna hi band kar deta hai.","Retry repair action nahi; recovery chance aur safety assess karo.","Per-attempt timeout separately configure hota hai.","Original timed-out operation remote side par chal sakti hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Retries',
    instructions: '"Jitter" shabd bolna yahan bada farak laata hai. 🎤',
    questions: [
      {
        q: '"Retry policy design karo."',
        choices: ["Safe errors; budget; jitter; bounded attempts","Every failure par same 3 retry lagao","Each service layer independently retry kare","Success tak deadline bina retry chalao"],
        answer: 0,
        explain: "Retry sirf safe/idempotent intent aur retryable failure par, bounded attempts/deadline/retry budget ke andar. Backoff+jitter add karo; Retry-After honor karo. Retry layer/order explicit rakho.2-3 attempts ya10%budget examples hain, universal defaults nahi.",
       choiceExplanations: ["Retry sirf safe/idempotent intent aur retryable failure par, bounded attempts/deadline/retry budget ke andar. Backoff+jitter add karo; Retry-After honor karo. Retry layer/order explicit rakho.2-3 attempts ya10%budget examples hain, universal defaults nahi.","Permanent validation/auth errors retry se solve nahi hote.","Nested retries offered load multiply kar sakti hain.","Unlimited retry deadline aur recovery resources consume karti hai."] },
      {
        q: "Incident mein traffic 4x hai. Retry amplification hypothesis kaise check karoge?",
        choices: ["Attempt rate vs unique request rate dekho","4x traffic se DDoS proven maan lo","4x traffic se user growth proven maan lo","Retry metric ke bina LB ko blame karo"],
        answer: 0,
        explain: "Retry amplification hypothesis ko attempt counts, unique request IDs, error timing aur client/service retry policies se verify karo. Four-times traffic alone DDoS, user growth ya LB issue exclude nahi karta.",
       choiceExplanations: ["Retry amplification hypothesis ko attempt counts, unique request IDs, error timing aur client/service retry policies se verify karo. Four-times traffic alone DDoS, user growth ya LB issue exclude nahi karta.","Attack possible hai; retry correlation/unique IDs se distinguish karo.","Same user request multiple attempts ho sakti hai.","LB fault hypothesis ko logs/traces se verify karna hoga."] },
    ],
  },
  success: [
    'Retry storm ka mechanism samjha sakte ho',
    'Jitter ki zaroorat bata sakte ho',
    'Kaunse errors retry-able hain, jaante ho',
    'Layers ka guna pehchaan sakte ho',
  ],
  homework: `Apne stack mein retry ka <b>audit</b> karo: HTTP client library? service mesh?
    gateway? mobile SDK? Ginti karo ki ek user action kitni asli requests ban sakti hai.
    Zyadatar teams ke liye jawab unke andaze se 3-9x zyada hota hai.`,
  cards: [
    { front: 'Retry storm?', back: 'Errors → sab retry → load ×2 → aur errors → load ×3 → service gir gayi. Woh <b>apne aap theek</b> ho jaati — retries ne mauka hi nahi diya.' },
    { front: 'Backoff kaafi kyun nahi?', back: 'Sab clients ne <b>ek saath</b> failure dekha → sab ek saath wait → sab ek saath maare. Backoff ne storm ko <b>synchronize</b> kiya. <b>Jitter</b> chahiye: <code>random(0, min(cap, base × 2^n))</code>.' },
    { front: 'Kya retry MAT karo?', back: '<b>400</b> (galat request) · <b>401/403</b> (permission) · <b>404</b> · <b>422</b> (validation). Inpar retry sirf load hai, koi umeed nahi.' },
    { front: 'Layers ka guna?', back: 'SDK 3 × gateway 3 × client 3 = <b>27 requests</b> ek user action ke liye. Retry <b>ek</b> layer par rakho — aksar sabse upar wali.' },
    { front: 'Downstream sach mein down — retry?', back: 'Nahi. Retry sirf <b>transient</b> failures ke liye hai. Down par woh p99 badhata hai, load multiply karta hai, threads bandhak rakhta hai. Wahan <b>breaker</b> chahiye.' },
  ],
},

/* ===================================================================== */
{
  id: 'breaker',
  icon: '🔌',
  title: 'Circuit Breaker — Downstream ko Nahi, KHUD ko Bachao',
  badge: 'Breaker Bhairav',
  objectives: [
    'Teen states: CLOSED → OPEN → HALF-OPEN',
    'Breaker <b>kisko</b> bachata hai (sabse aam galatfehmi)',
    'Fallback ke bina breaker sirf tez failure hai',
    'Tuning: threshold, minimum calls, per-dependency',
  ],
  lesson: [
    `<h3>📖 Ek switch jo apne aap girta hai</h3>
     <p>Ghar ka MCB yaad hai? Short circuit hone par woh gir jaata hai —
     taaki poori wiring na jale. Software breaker bilkul wahi hai.</p>
     <pre>CLOSED     → requests jaati hain, failures gine jaate hain
   ↓ (window mein 50% fail)
OPEN       → 30 s tak koi request NAHI jaayegi — 1 ms mein fail
   ↓ (30 s baad)
HALF-OPEN  → ek TEST request bhejo
   ↓ pass → CLOSED        ↓ fail → OPEN (phir 30 s)</pre>
     <h3>🎯 Breaker KISKO bachata hai?</h3>
     <p>Sabse aam jawab hai "downstream ko" — aur woh <b>adhoora</b> hai.
     Breaker ka pehla maqsad <b>tumhe</b> bachana hai:</p>
     <pre>Bina breaker: har request 500 ms timeout tak latakti hai
              → 200 threads sab intezaar mein
              → tumhara POORA service down

Breaker ke saath: 1 ms mein fail + fallback
              → threads free
              → baaki sab endpoints CHAL RAHE HAIN ✅</pre>
     <p>Downstream ko bhi faayda hota hai (use saans lene ka mauka milta
     hai) — par woh <b>doosra</b> faayda hai.</p>`,
    `<h3>🔬 Fallback ke bina breaker adhoora hai</h3>
     <p>Breaker khul gaya. Ab kya? Agar jawab "user ko error" hai, toh tumne
     sirf failure ko <b>tez</b> kiya hai — theek nahi kiya.</p>
     <pre>Fallback ke vikalp:
  • stale cache se purana data ("2 ghante purana")
  • default value (khaali recommendations list)
  • degraded feature (search ke bajaye category browse)
  • saaf error jo user ko batata hai kya kar sakta hai</pre>
     <p>Aur yaad rakho: jo cheez <b>paisa</b> ya <b>surakshi</b> se judi hai
     (balance, stock, permissions) uspar stale fallback <b>mat</b> do —
     wahan imaandaar error behtar hai.</p>
     <h3>⚙️ Tuning ke chaar sawaal</h3>
     <table>
       <tr><th>Setting</th><th>Jaal</th></tr>
       <tr><td>Threshold (50%)</td><td>bahut kam → chhoti dikkat par khul jaayega; bahut zyada → kabhi nahi khulega</td></tr>
       <tr><td><b>Minimum calls</b></td><td>2 mein se 1 fail = 50% — par woh data nahi hai. <b>Min 20 calls</b> rakho warna breaker random noise par trip karega</td></tr>
       <tr><td>Per-dependency</td><td>ek global breaker sab kuch band kar dega. Har downstream ka apna breaker</td></tr>
       <tr><td>Half-open ke test</td><td>sirf 1-2 requests jaane do — warna half-open khud ek mini-storm ban jaayega</td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🔌 Breaker ko trip hote DEKHO',
      goal: 'Downstream down hai aur retries halat bigaad rahi hain. Breaker + fallback lagao, phir requests bhejte raho aur breaker ko apne aap trip hote dekho.',
      sys: SD.sys.orders(),
      tasks: T_BREAKER,
      success: SD.allTasks(T_BREAKER),
      successText: `Dekha kya hua? Chaar failures ke baad breaker <b>khud</b> khul gaya —
        aur p99 seedha gir gaya, kyunki ab calls 1 ms mein fail hoti hain.
        <br><br>Yaad rakho:
        <br>• Breaker ka pehla maqsad <b>tumhe</b> bachana hai — tumhare threads uske intezaar mein nahi mar rahe
        <br>• <b>Fallback ke bina</b> breaker sirf "tez failure" hai
        <br>• <b>Minimum calls</b> zaroori hai — 2 mein se 1 fail 50% hai par woh data nahi hai`,
      solution: [
        "sim inject down ledger",
        "sim add timeout ledger 500",
        "sim add breaker ledger --threshold 0.5 --window 20",
        "sim add fallback ledger 'last known balance'",
        "GET /api/v1/orders?page=1&limit=50 -n 1",
        "GET /api/v1/orders?page=2&limit=50",
        "GET /api/v1/orders?page=3&limit=50",
        "GET /api/v1/orders?page=4&limit=50",
        "GET /api/v1/orders?page=5&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.timeoutMs === 500 && s.sys.deps.ledger?.breakerState === 'open' && !!s.sys.deps.ledger.fallback && m.current(s, 'http', r => r.status === 200 && r.p99 < 100); },
      hints: [
        "Pehle observation: Downstream down + timeout — halat kharab karo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Trip hone ke baad p99 gir jaana chahiye (fail fast). Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim inject down ledger\nsim add timeout ledger 500\nsim add breaker ledger --threshold 0.5 --window 20\nsim add fallback ledger 'last known balance'\nGET /api/v1/orders?page=1&limit=50 -n 1\nGET /api/v1/orders?page=2&limit=50\nGET /api/v1/orders?page=3&limit=50\nGET /api/v1/orders?page=4&limit=50\nGET /api/v1/orders?page=5&limit=50",
      ],
    },
    {
      type: 'order',
      title: 'Breaker ki state machine',
      instructions: 'Ek downstream failure ka poora safar sahi kram mein.',
      steps: [
        { text: 'CLOSED — sab normal, requests ja rahi hain', explain: 'Breaker background mein failures gin raha hai. Koi overhead nahi.' },
        { text: 'Failures window mein threshold paar karti hain', explain: 'Aur minimum-calls bhi poora hona chahiye — 2 mein se 1 fail 50% hai par woh statistically kuch nahi hai.' },
        { text: 'OPEN — ab koi request downstream nahi jaayegi', explain: 'Har call 1 ms mein fail hoti hai. Threads free hain, tumhara service zinda hai. Fallback yahan chalta hai.' },
        { text: 'Ek nirdharit samay (30 s) intezaar', explain: 'Downstream ko saans lene ka mauka. Iske bina tum use theek hone hi nahi doge.' },
        { text: 'HALF-OPEN — ek test request', explain: 'Sirf 1-2 requests. Zyada bhejoge toh half-open khud ek mini-storm ban jaayega.' },
        { text: 'Test pass → CLOSED · fail → wapas OPEN', explain: 'Fail hone par timer phir se shuru. Isse breaker automatically recovery detect kar leta hai — koi manual intervention nahi.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Breaker par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'breaker',
      questions: [
        { q: 'Breaker ka PEHLA maqsad kisko bachana hai?', target: 'you', explain: 'Tumhe. Tumhare threads downstream ke intezaar mein mar nahi rahe — 30s wait ki jagah 1ms. Downstream ko faayda doosra hai.' },
        { q: 'Kaunsi state mein calls 1 ms mein fail hoti hain?', target: 'open', explain: 'OPEN. Koi request downstream nahi jaati — turant fail + fallback. Yahi tumhare resources bachata hai.' },
        { q: 'Recovery detect karne wali state?', target: 'half', explain: 'HALF-OPEN — ek test request. Pass ho toh CLOSED, fail ho toh wapas OPEN. Isse recovery apne aap detect ho jaati hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Breaker ki samajh',
      questions: [
        {
          q: 'Circuit breaker ka PEHLA maqsad kya hai?',
          choices: ["Repeated failing calls se resources bachao","Breaker khud dependency repair kare","Breaker every failed payment retry kare","Breaker success payload fabricate kare"],
          answer: 0,
          explain: 'Downstream ko bachana ek achha <b>side effect</b> hai. Asli problem yeh hai: bina breaker ke ek dheemi dependency tumhare saare threads kha leti hai aur tumhara <b>poora</b> service down ho jaata hai — un endpoints ke liye bhi jinka us dependency se koi lena-dena nahi.',
         choiceExplanations: ["Downstream ko bachana ek achha <b>side effect</b> hai. Asli problem yeh hai: bina breaker ke ek dheemi dependency tumhare saare threads kha leti hai aur tumhara <b>poora</b> service down ho jaata hai — un endpoints ke liye bhi jinka us dependency se koi lena-dena nahi.","Breaker admission decisions leta hai; downstream defect fix nahi karta.","Retry alag policy hai aur side-effect safety require karti hai.","Fallback explicit product contract hai; breaker data invent nahi karta."] },
        {
          q: 'Breaker mein "minimum calls" setting kyun zaroori hai?',
          choices: ["Tiny samples ke noisy trips se bachao","Minimum calls failure rate ko zero kare","Minimum calls memory leaks repair kare","Threshold se every call successful bane"],
          answer: 0,
          explain: 'Yeh detail production mein bahut matter karta hai. Kam traffic wale endpoints par ek-do random failures hamesha hote hain. Bina minimum-calls ke breaker baar-baar khulta-bandh hota rahega aur healthy requests block karega. <b>Min 20 calls</b> ek achha starting point hai.',
         choiceExplanations: ["Yeh detail production mein bahut matter karta hai. Kam traffic wale endpoints par ek-do random failures hamesha hote hain. Bina minimum-calls ke breaker baar-baar khulta-bandh hota rahega aur healthy requests block karega. <b>Min 20 calls</b> ek achha starting point hai.","Threshold enough samples lene deta hai; actual failures remain.","Sampling setting leaked memory/resource release nahi karti.","Breaker correctness success guarantee nahi; request reject bhi ho sakti hai."] },
        {
          q: 'Breaker khul gaya par koi fallback nahi hai. Kya mila?',
          choices: ["Fast failure aur resource relief mile","Fallback data automatically mil jaaye","User request guaranteed successful bane","No fallback se resource benefit bhi zero"],
          answer: 0,
          explain: 'Thread bachana asli faayda hai — baaki endpoints zinda rahenge. Par user ke liye kuch nahi badla. Isliye breaker aur fallback <b>jodi</b> mein aate hain: breaker <i>tumhe</i> bachata hai, fallback <i>user</i> ko.',
         choiceExplanations: ["Thread bachana asli faayda hai — baaki endpoints zinda rahenge. Par user ke liye kuch nahi badla. Isliye breaker aur fallback <b>jodi</b> mein aate hain: breaker <i>tumhe</i> bachata hai, fallback <i>user</i> ko.","Fallback alag implement/configure karni hoti hai.","Open breaker rejected calls errors hi return kar sakti hain.","Fast failure waiting resources aur cascading risk reduce kar sakti hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Circuit Breaker',
    instructions: 'Yahan "kisko bachata hai" sahi bolna alag pehchaan deta hai. 🎤',
    questions: [
      {
        q: '"Circuit breaker kya karta hai aur kab lagaoge?"',
        choices: ["Failures par admission stop; probe recovery","Every exception par immediate retry karo","Traffic ko random service par route karo","Har remote call par breaker mandatory"],
        answer: 0,
        explain: "Breaker repeated failure/slow-call evidence par new attempts reject karta hai; half-open probes recovery assess karte hain. Per-dependency thresholds, timeouts, isolation aur fallback contract define karo; every remote call par breaker mandatory nahi.",
       choiceExplanations: ["Breaker repeated failure/slow-call evidence par new attempts reject karta hai; half-open probes recovery assess karte hain. Per-dependency thresholds, timeouts, isolation aur fallback contract define karo; every remote call par breaker mandatory nahi.","Retry transient-safe attempts ke liye alag mechanism hai.","Load balancing aur breaker admission alag functions hain.","Timeouts/isolation enough cases mein breaker state complexity unnecessary ho sakti hai."] },
      {
        q: '"Breaker aur retry ek saath kaise kaam karte hain?"',
        choices: ["Retry safety aur breaker order define karo","Dono mechanisms same state machine hain","Breaker kabhi overload mein useful nahi","Retry breaker order universal fixed hai"],
        answer: 0,
        explain: "Retry transient safe attempts ke liye; breaker admission repeated failure/slow-calls par controls karta hai. Composition order determines failure counting and whether open-breaker errors retry honge. Library semantics, deadlines aur probes test karo; one universal nesting order nahi.",
       choiceExplanations: ["Retry transient safe attempts ke liye; breaker admission repeated failure/slow-calls par controls karta hai. Composition order determines failure counting and whether open-breaker errors retry honge. Library semantics, deadlines aur probes test karo; one universal nesting order nahi.","Retry attempts aur breaker admission different state/policies hain.","Failing overloaded dependency ko suppressed attempts relief de sakte hain.","Order changes counted attempts and probes; library semantics decide karo."] },
    ],
  },
  success: [
    'Teenon states aur transitions bata sakte ho',
    'Breaker ka asli maqsad samjha sakte ho',
    'Fallback ke saath breaker design kar sakte ho',
    'Minimum-calls aur per-dependency tuning jaante ho',
  ],
  homework: `Apni service ki har outbound dependency list karo. Har ek ke saamne likho:
    timeout hai? breaker hai? fallback kya hai? Jinke saamne "fallback: kuch nahi" hai,
    unpar socho ki us feature ke bina page kaisa dikhega.`,
  cards: [
    { front: 'Breaker ki 3 states?', back: '<b>CLOSED</b> (normal, failures gin raha hai) → <b>OPEN</b> (1ms mein fail, 30s tak koi call nahi) → <b>HALF-OPEN</b> (ek test request) → CLOSED ya OPEN.' },
    { front: 'Breaker kisko bachata hai?', back: '<b>TUMHE.</b> Tumhare threads uske intezaar mein nahi marte, isliye BAAKI endpoints zinda rehte hain. Downstream ko faayda ek achha side effect hai.' },
    { front: 'Fallback ke bina breaker?', back: 'Sirf <b>tez failure</b>. Threads bach gaye (bada faayda), par user ko abhi bhi error hai. Breaker <i>tumhe</i> bachata hai, fallback <i>user</i> ko.' },
    { front: 'Minimum calls kyun?', back: '2 mein se 1 fail = 50% — par woh <b>data nahi hai</b>. Bina minimum ke breaker random noise par trip karta rahega. Min ~20 calls rakho.' },
    { front: 'Retry vs Breaker?', back: 'Alag timescale. <b>Retry</b> = ek request ("shayad blip tha"). <b>Breaker</b> = ek dependency ("yeh abhi kaam nahi kar rahi"). Breaker khulne par retries apne aap ruk jaati hain.' },
  ],
},

/* ===================================================================== */
{
  id: 'bulkhead',
  icon: '🚢',
  title: 'Bulkhead — Ek Chhed se Poora Jahaz na Doobe',
  badge: 'Compartment Captain',
  objectives: [
    'Shared thread pool = ek dependency sab kuch le doobti hai',
    'Bulkhead kahan-kahan lagta hai (5 jagah)',
    'Isolation ki keemat — kam sharing, kam efficiency',
    'Blast radius ko design ka hissa banana',
  ],
  lesson: [
    `<h3>📖 Jahaz ka compartment</h3>
     <p>Titanic mein bulkheads the — par woh upar tak nahi jaate the, isliye
     paani ek se doosre mein bahta gaya. Software mein bilkul wahi hota hai:</p>
     <pre>200 threads ka EK pool:
  /checkout · /search · /recommendations — sab isi se lete hain

recommendations 30 s dheemi hui
  → uski requests threads pakde baithi hain
  → 200 threads khatam
  → CHECKOUT bhi down 💀</pre>
     <p>Ek <b>optional</b> feature ne <b>paise wale</b> flow ko maar diya.
     Aur dhyaan do: recommendations service <b>down bhi nahi</b> thi.</p>
     <pre>Bulkhead ke saath:
  checkout        → 120 threads (apna pool)
  search          →  60 threads
  recommendations →  20 threads

recommendations poori tarah mar jaaye?
  → uske 20 threads bharenge
  → baaki 180 bilkul safe ✅</pre>`,
    `<h3>🔬 Bulkhead kahan-kahan</h3>
     <table>
       <tr><th>Level</th><th>Kya alag karta hai</th></tr>
       <tr><td><b>Thread pool</b></td><td>per dependency — sabse aam</td></tr>
       <tr><td><b>Connection pool</b></td><td>per DB/service — reads vs writes bhi</td></tr>
       <tr><td><b>Queue</b></td><td>bulk vs transactional (Track 1 ka head-of-line blocking)</td></tr>
       <tr><td><b>Instance</b></td><td>critical endpoints ka alag deployment</td></tr>
       <tr><td><b>Tenant</b></td><td>ek bada customer sab kuch na kha jaaye</td></tr>
     </table>
     <p>Aakhri wala SaaS mein bahut zaroori hai: ek enterprise customer ka
     bulk import poore platform ko dheema kar sakta hai. Per-tenant limits
     aur pools isse rokte hain.</p>
     <h3>⚖️ Keemat imaandaari se</h3>
     <p>Alag pools ka matlab hai <b>kam sharing</b>: checkout ke 120 threads
     khaali baithe hain jabki search ko unki zaroorat thi. Tum thodi si
     <b>efficiency</b> bech ke <b>isolation</b> khareed rahe ho.</p>
     <p class="tip">🎯 Aur woh sauda lagbhag hamesha sahi hai — kyunki
     efficiency ka nuksaan <b>lagataar aur chhota</b> hai, jabki isolation
     ka faayda <b>kabhi-kabhi aur bahut bada</b>. Ek outage ki keemat
     mahino ki thodi si extra capacity se zyada hoti hai.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa bulkhead?',
      instructions: 'Har problem ko sahi isolation se jodo.',
      bins: [
        { id: 'thread', label: '🧵 Thread pool' },
        { id: 'queue', label: '📮 Alag queue' },
        { id: 'tenant', label: '🏢 Per-tenant limit' },
      ],
      items: [
        { text: 'Recommendations dheemi hui aur checkout bhi ruk gaya', bin: 'thread', explain: 'Per-dependency thread pool. Recommendations ke 20 threads bhar jaayein toh checkout ke 120 safe rahenge.' },
        { text: 'Marketing campaign ke 50 lakh messages ke peeche "payment failed" atka', bin: 'queue', explain: 'Head-of-line blocking. Bulk aur transactional ke alag queues + alag consumers.' },
        { text: 'Ek enterprise customer ka bulk import poora platform dheema kar raha hai', bin: 'tenant', explain: 'Per-tenant limits aur pools. SaaS mein yeh zaroori hai — warna ek bada customer sab ka experience kharab karta hai.' },
        { text: 'Analytics query prod primary ke saare connections kha gayi', bin: 'thread', explain: 'Alag connection pool (aur sach mein alag replica). Analytics ko kabhi bhi transactional traffic ke saath pool share nahi karna chahiye.' },
        { text: 'Bulk export API interactive users ko dheema kar raha hai', bin: 'queue', explain: 'Bulk kaam async job queue mein bhejo — sync API se poori tarah alag lane.' },
        { text: 'Ek tenant ka webhook endpoint down hai, saare webhooks ruk gaye', bin: 'tenant', explain: 'Per-tenant delivery queues. Ek tenant ka slow endpoint doosre tenants ki delivery ko block nahi karna chahiye.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Bulkhead par ungli rakho',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'bulkhead',
      questions: [
        { q: 'Asli problem kaunsa design hai?', target: 'shared', explain: 'Ek shared thread pool. Recommendations ki requests threads pakde baithi hain aur checkout ko kuch nahi milta.' },
        { q: 'Optional feature ko kitna hissa milna chahiye?', target: 'optional', explain: 'Sabse chhota pool. Woh poori tarah mar jaaye toh bhi baaki safe rahein — yahi bulkhead ka poora point hai.' },
        { q: 'Bulkhead ki keemat kya hai?', target: 'cost', explain: 'Kam sharing = thodi kam efficiency. Checkout ke threads khaali baith sakte hain jabki search ko chahiye the. Par woh sauda lagbhag hamesha sahi hai.' },
      ],
    },
    {
      type: 'terminal',
      title: '🚢 Bulkhead lagao',
      goal: 'Ek optional dependency dheemi hai. Uske liye bulkhead lagao taaki woh baaki service ke threads na khaaye.',
      sys: SD.sys.orders(),
      tasks: T_BULKHEAD,
      success: SD.allTasks(T_BULKHEAD),
      successText: `Live config mein ledger ka bulkhead cap <b>20</b> hai; timeout par request <b>504</b> deti hai. Yeh simulator parallel worker isolation ko load-test nahi karta; production mein alag pool aur healthy-route latency ka concurrent test chahiye.
        <br><br>Yeh timeout se alag cheez hai: timeout <b>ek call</b> ka intezaar baandhta hai,
        bulkhead us dependency ka <b>hissa</b> baandhta hai. Dono chahiye —
        timeout ke bina 20 threads bhi 30 second latak sakte hain.`,
      solution: [
        "sim inject latency ledger 5000",
        "sim add timeout ledger 200",
        "sim add bulkhead ledger --max 20",
        "GET /api/v1/orders?page=1&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.app.bulkheads?.ledger === 20 && s.sys.deps.ledger?.timeoutMs === 200 && m.current(s, 'http', r => r.status === 504 && r.p99 < 600); },
      hints: [
        "Pehle observation: Downstream ko dheema karo. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Request bhej ke asar dekho. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim inject latency ledger 5000\nsim add timeout ledger 200\nsim add bulkhead ledger --max 20\nGET /api/v1/orders?page=1&limit=50",
      ],
    },
    {
      type: 'quiz',
      title: 'Bulkhead ki samajh',
      questions: [
        {
          q: 'Bulkhead aur timeout mein farak?',
          choices: ["Timeout wait; bulkhead concurrency bound kare","Timeout se every endpoint isolated bane","Bulkhead se every call fast complete ho","Dono controls failure ko retry karte hain"],
          answer: 0,
          explain: 'Sirf timeout kaafi nahi: agar 200 threads sab 5 second ke timeout par latak rahe hain, toh service phir bhi down hai — bas 5 second ke chunks mein. Bulkhead kehta hai "us dependency ko max 20 threads milenge, chahe kuch bhi ho".',
         choiceExplanations: ["Sirf timeout kaafi nahi: agar 200 threads sab 5 second ke timeout par latak rahe hain, toh service phir bhi down hai — bas 5 second ke chunks mein. Bulkhead kehta hai \"us dependency ko max 20 threads milenge, chahe kuch bhi ho\".","Shared pool par many bounded waits bhi saare slots occupy kar sakti hain.","Concurrency bound per-call completion deadline nahi deta.","Retries separate mechanism hain; dono primarily containment controls hain."] },
        {
          q: 'Bulkhead ki asli keemat kya hai?',
          choices: ["Reserved capacity kabhi idle reh sakti","Isolation se all capacity always share ho","Bulkheads throughput free mein badhaate","Pool split se every queue disappear ho"],
          answer: 0,
          explain: 'Aur yeh sauda lagbhag hamesha sahi hai: efficiency ka nuksaan <b>lagataar aur chhota</b> hai, isolation ka faayda <b>kabhi-kabhi aur bahut bada</b>. Ek outage ki keemat mahino ki thodi extra capacity se zyada hoti hai.',
         choiceExplanations: ["Aur yeh sauda lagbhag hamesha sahi hai: efficiency ka nuksaan <b>lagataar aur chhota</b> hai, isolation ka faayda <b>kabhi-kabhi aur bahut bada</b>. Ek outage ki keemat mahino ki thodi extra capacity se zyada hoti hai.","Separate capacity boundaries borrowing limit karti hain.","Isolation resource efficiency aur complexity cost rakhti hai.","Each bounded pool overload par queue/reject kar sakta hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Bulkhead',
    instructions: 'Yeh sawaal "blast radius" ke roop mein aata hai. 🎤',
    questions: [
      {
        q: '"Ek optional feature ki dependency dheemi ho gayi aur poora service down ho gaya. Design mein kya galat tha?"',
        choices: ["Optional work ko core se isolate karo","Only optional timeout ko aur badhao","Only common pool ko unlimited karo","Only failed dependency ko retry karo"],
        answer: 0,
        explain: '"Aur threads" sirf failure ko thoda der se laata hai — dheemi dependency woh bhi kha jaayegi. Sahi jawab problem ko <b>architectural</b> batata hai (koi isolation nahi), capacity ka nahi. Aur "features ko tier mein baanto" wali baat dikhati hai ki tumne yeh pehle se socha hai.',
       choiceExplanations: ["\"Aur threads\" sirf failure ko thoda der se laata hai — dheemi dependency woh bhi kha jaayegi. Sahi jawab problem ko <b>architectural</b> batata hai (koi isolation nahi), capacity ka nahi. Aur \"features ko tier mein baanto\" wali baat dikhati hai ki tumne yeh pehle se socha hai.","Longer waits optional work ko more resources hold karwati hain.","Unbounded concurrency memory/downstream saturation badha sakti hai.","Retry load badhata hai; isolation aur safe fallback pehle."] },
    ],
  },
  success: [
    'Shared pool ka khatra samjha sakte ho',
    '5 alag jagah bulkhead laga sakte ho',
    'Timeout aur bulkhead mein farak kar sakte ho',
    'Isolation ki keemat imaandaari se bata sakte ho',
  ],
  homework: `Apne service mein dekho: kitne alag thread/connection pools hain?
    Agar sirf ek hai, toh tumhari sabse kam zaroori dependency tumhare sabse zaroori
    endpoint ko gira sakti hai. Ek list banao ki kaunsi dependency kis tier mein hai.`,
  cards: [
    { front: 'Bulkhead kya karta hai?', back: 'Har dependency ko <b>apna</b> thread/connection pool deta hai. Optional feature poori tarah mar jaaye toh bhi core ke threads safe rehte hain.' },
    { front: 'Bulkhead vs Timeout?', back: '<b>Timeout</b> = ek call ka intezaar baandhta hai. <b>Bulkhead</b> = us dependency ka hissa baandhta hai. Dono chahiye — 200 threads 5s ke timeout par latakein toh service phir bhi down hai.' },
    { front: 'Bulkhead kahan-kahan?', back: '<b>Thread pool</b> (per dependency) · <b>connection pool</b> · <b>queue</b> (bulk vs transactional) · <b>instance</b> · <b>tenant</b> (SaaS mein zaroori).' },
    { front: 'Bulkhead ki keemat?', back: '<b>Kam sharing</b> — kuch threads khaali baithenge. Efficiency ka nuksaan lagataar aur chhota; isolation ka faayda kabhi-kabhi aur bahut bada.' },
  ],
},

/* ===================================================================== */
{
  id: 'dlq',
  icon: '☠️',
  title: 'Dead Letter Queue — Ek Message, Poori Queue Band',
  badge: 'Poison Handler',
  objectives: [
    'Poison message kaise poori queue rok deta hai',
    'Retry → backoff → DLQ ka pattern',
    'DLQ par <b>alert</b> laazmi kyun hai',
    'Replay aur idempotent consumer',
  ],
  lesson: [
    `<h3>📖 Ek message ne 2 lakh messages roke</h3>
     <pre>msg #4471 → consumer crash (malformed JSON)
          → broker redeliver karta hai
          → phir crash
          → phir redeliver… (infinite)
          → consumer offset AGE badhta hi nahi
          → peeche 2 lakh messages jam 💀</pre>
     <p>Ise <b>poison message</b> kehte hain. Aur dhyaan do ki system ne kuch
     "galat" nahi kiya — usne bilkul waisa hi kiya jaisa at-least-once
     delivery kehti hai. Bug yeh hai ki tumne use kabhi <b>chhodne</b> ka
     rasta nahi diya.</p>
     <pre>✅ DLQ ke saath:
  fail → retry 1 (backoff) → retry 2 → retry 3
       → DLQ mein daal do
       → consumer AAGE badh gaya ✅
       → baaki 2 lakh messages chal gaye</pre>
     <p>DLQ ka matlab hai: <i>"yeh message main abhi nahi kar sakta —
     ise alag rakh do, koi insaan dekhega."</i></p>`,
    `<h3>🔬 DLQ ke chaar niyam</h3>
     <p><b>1. DLQ par ALERT laazmi hai.</b> Ek DLQ jise koi dekhta hi nahi,
     woh <b>ek jagah hai jahan data chup-chaap marta hai</b>.
     <code>dlq.depth &gt; 0</code> par alert lagao — aur usme runbook ho.</p>
     <p><b>2. DLQ message mein poora context ho.</b></p>
     <pre>{ "original_message": {...},
  "error": "JSONDecodeError: line 1 col 34",
  "stack_trace": "...",
  "retry_count": 3,
  "first_failed_at": "...", "consumer": "billing-worker-3" }</pre>
     <p>Sirf message daal doge toh 3 hafte baad koi nahi bata payega ki
     woh wahan gaya kyun tha.</p>
     <p><b>3. Replay ka tool hona chahiye.</b> Bug theek karne ke baad DLQ se
     messages wapas main queue mein daalne ka rasta — warna woh data hamesha
     wahin pada rahega.</p>
     <p><b>4. Consumer IDEMPOTENT hona chahiye.</b> Replay ka matlab hai
     dobara processing. Agar consumer idempotent nahi hai toh replay
     duplicate charges, duplicate emails aur duplicate orders banayega.</p>
     <p class="tip">🎯 Aur ek chhupa hua jaal: kabhi-kabhi message poison
     nahi hota — <b>downstream down hota hai</b>. Tab saare messages DLQ mein
     chale jaayenge aur tumhare paas 5 lakh "poison" messages honge jo asal
     mein bilkul theek the. Isliye retry policy mein transient failures ke
     liye lamba backoff rakho, aur DLQ ko sirf <b>permanent</b> failures ke
     liye.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 "Notifications 4 ghante se ruke hue hain"',
      instructions: 'Queue jam hai. Sahi kadam chuno.',
      pager: `<b>#alerts</b> — 6:40 AM<br>
        Users bol rahe hain ki 4 ghante se koi notification nahi aayi.<br>
        Queue depth: <b>2,10,000</b> aur badh rahi hai. Consumers <b>chal rahe hain</b> — CPU normal.<br>
        Consumer logs mein har 2 second mein wahi error: <code>JSONDecodeError at message 4471</code>.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: "Quarantine poison;preserve replay context", good: true, next: 'why', explain: 'Bleeding pehle roko. Ek message 2.1 lakh ko rok raha hai — pehle baaki traffic chalao, phir root cause.' },
            { t: "Add consumers to same blocked partition", good: false, explain: 'Har naya consumer bhi usi message par atkega. Yeh capacity ka masla nahi hai — ek stuck message hai.' },
            { t: "Purge all accepted pending messages", good: false, explain: '2.1 lakh asli notifications delete ho jaayenge. Yeh sabse mehenga "fix" hai.' },
            { t: "Restart without fixing invalid payload", good: false, explain: 'Restart ke baad woh usi message se shuru karega aur phir crash hoga. Yeh loop hai.' },
          ],
        },
        why: {
          sitrep: '✅ Message 4471 DLQ mein gaya. Consumer aage badha — queue depth 2.1 lakh se girna shuru.',
          text: 'Ab root cause: yeh 4 ghante tak kaise chala?',
          choices: [
            { t: "Infinite retry;no progress alert", good: true, next: 'fix', explain: 'Do galtiyan: koi max-retries/DLQ nahi, aur koi alert nahi. Alert hota toh 4 ghante ki jagah 4 minute mein pata chalta.' },
            { t: "Only producer mistake;consumer safe", good: false, explain: 'Woh trigger tha, wajah nahi. Galat messages hamesha aayenge — sawaal yeh hai ki system unhe handle karta hai ya nahi.' },
            { t: "Only consumer bug;retry policy safe", good: false, explain: 'Malformed input par crash karna theek hai. Galat yeh hai ki uske baad system aage nahi badh saka.' },
          ],
        },
        fix: {
          text: 'Aage ke liye kya lagaoge?',
          choices: [
            { t: "Bound retries;DLQ alert and safe replay", good: true, next: 'end', explain: 'Poora set. Har ek alag khatra rokta hai: DLQ jam, alert andhapan, debugging, recovery, aur replay ke duplicates.' },
            { t: "Producer validation as only defense", good: false, explain: 'Achha hai par kaafi nahi — koi na koi message kabhi na kabhi kharab hoga (schema change, encoding, truncation). System ko uske saath jeena aana chahiye.' },
            { t: "Catch every error;silently continue", good: false, explain: 'Ab messages chup-chaap gum honge. Yeh DLQ se bhi bura hai — kam se kam DLQ mein woh dikhte toh hain.' },
          ],
        },
        end: {
          end: true,
          text: 'Queue saaf. Notifications wapas chal rahe hain.',
          summary: `<b>Seekh:</b> Ek poison message ka matlab ek outage nahi hona chahiye.
            <br><br><b>Pattern:</b> <code>N retries (backoff ke saath) → DLQ → alert</code>
            <br><br><b>Aur DLQ ke saath yeh sab chahiye:</b>
            <br>• <b>Alert</b> — <code>dlq.depth &gt; 0</code>. Bina alert ke DLQ ek jagah hai jahan data chup-chaap marta hai.
            <br>• <b>Context</b> — original message + error + stack + retry count.
            <br>• <b>Replay tool</b> — bug theek hone ke baad wapas daalne ka rasta.
            <br>• <b>Idempotent consumer</b> — warna replay duplicate side-effects banayega.`,
        },
      },
    },
    {
      type: 'hotspot',
      title: 'DLQ ke niyam',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'dlq',
      questions: [
        { q: 'DLQ ke saath sabse zaroori cheez kya hai?', target: 'alert', explain: 'Alert. Ek DLQ jise koi dekhta hi nahi, woh ek jagah hai jahan data chup-chaap marta hai. dlq.depth > 0 par alert lagao.' },
        { q: 'Bug theek hone ke baad DLQ ke messages ka kya?', target: 'replay', explain: 'Replay tool se wapas main queue mein. Aur consumer idempotent hona chahiye — warna replay duplicate side-effects banayega.' },
      ],
    },
    {
      type: 'quiz',
      title: 'DLQ ki samajh',
      questions: [
        {
          q: "Consumer same poison message in-place indefinitely retry karta hai. Risk?",
          choices: ["Retry-in-place poison partition rok sakta","Every broker automatically skip karega","Restart se invalid payload valid banega","DLQ bina errors durably solve ho jaayen"],
          answer: 0,
          explain: "Given consumer poison message ko indefinitely in-place retry karta hai, toh partition/head-of-line progress stop ho sakti hai. Broker/consumer retry policy, quarantine/DLQ aur replay semantics explicit honi chahiye; DLQ absence alone every broker behavior determine nahi karti.",
         choiceExplanations: ["Given consumer poison message ko indefinitely in-place retry karta hai, toh partition/head-of-line progress stop ho sakti hai. Broker/consumer retry policy, quarantine/DLQ aur replay semantics explicit honi chahiye; DLQ absence alone every broker behavior determine nahi karti.","Skip/redrive policy explicitly configure karni padti hai.","Same invalid message restart ke baad phir fail ho sakta hai.","Failure classify/retain/replay karna consumer/broker contract hai."] },
        {
          q: "Downstream outage se all valid messages fail ho rahe hain. Retry/DLQ policy kya dekhe?",
          choices: ["Systemic outage ko isolated poison mat maano","DLQ size badhao; outage solve ho jaayega","Every valid message ko forever retry karo","Downstream outage means all payload corrupt"],
          answer: 0,
          explain: "Systemic dependency outage aur isolated malformed message distinguish karo. Pause/backpressure/bounded delayed retries or a documented parking/redrive strategy use karo. DLQ outage messages rakh sakti hai if intentional/replayable; universal never-DLQ rule nahi.",
         choiceExplanations: ["Systemic dependency outage aur isolated malformed message distinguish karo. Pause/backpressure/bounded delayed retries or a documented parking/redrive strategy use karo. DLQ outage messages rakh sakti hai if intentional/replayable; universal never-DLQ rule nahi.","Larger DLQ cause fix nahi; recovery/replay capacity bhi chahiye.","Retention/deadline aur recovery budgets bound retries.","Payload valid hote hue dependency unavailable ho sakti hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — DLQ',
    instructions: 'Async systems ka standard sawaal. 🎤',
    questions: [
      {
        q: '"Ek message baar-baar fail ho raha hai. Kya karoge?"',
        choices: ["Classify; bounded retry; quarantine and replay","Permanent parse error ko infinite retry do","First failure par quietly message drop karo","Restart se schema mismatch theek maan lo"],
        answer: 0,
        explain: '"Infinite retry" queue jam karta hai. "Drop kar dunga" data chup-chaap khota hai. Sahi jawab ek <b>poora system</b> deta hai — sirf DLQ bolna aadha jawab hai, kyunki bina alert ke DLQ ek data graveyard hai.',
       choiceExplanations: ["\"Infinite retry\" queue jam karta hai. \"Drop kar dunga\" data chup-chaap khota hai. Sahi jawab ek <b>poora system</b> deta hai — sirf DLQ bolna aadha jawab hai, kyunki bina alert ke DLQ ek data graveyard hai.","Same malformed payload repeated retry se valid nahi banta.","Silent drop data loss aur debugging context hata deta hai.","Consumer/payload compatibility fix ya quarantine chahiye."] },
    ],
  },
  success: [
    'Poison message ka mechanism samjha sakte ho',
    'Retry → backoff → DLQ pattern laga sakte ho',
    'DLQ ke chaaron niyam jaante ho',
    'Transient aur permanent failures mein farak kar sakte ho',
  ],
  homework: `Apne har queue/topic ke liye check karo: DLQ hai? Uspar alert hai?
    Abhi usmein kitne messages pade hain? Zyadatar teams ke liye teesre sawaal ka jawab
    "pata nahi" hota hai — aur usme aksar mahino ka gum hua data hota hai.`,
  cards: [
    { front: 'Poison message?', back: 'Woh message jo har baar crash karta hai. Bina DLQ ke: infinite retry → consumer offset atka → <b>uske peeche ki poori queue ruk gayi</b>.' },
    { front: 'DLQ ka pattern?', back: '<code>N retries (backoff) → DLQ → alert</code>. Consumer aage badh jaata hai, baaki messages chal jaate hain.' },
    { front: 'DLQ ke 4 niyam?', back: '<b>1.</b> Alert (<code>dlq.depth &gt; 0</code>) <b>2.</b> Poora context (message + error + stack + retry count) <b>3.</b> Replay tool <b>4.</b> Consumer idempotent.' },
    { front: 'DLQ ka chhupa hua jaal?', back: 'Downstream down hai → saare <b>theek</b> messages DLQ mein chale jaate hain. DLQ <b>permanent</b> failures ke liye hai; transient par lamba backoff ya breaker.' },
    { front: 'Alert ke bina DLQ?', back: 'Ek jagah jahan <b>data chup-chaap marta hai</b>. Aur woh purge se bhi bura hai, kyunki tumhe lagta hai ki data safe hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'degrade',
  icon: '🪂',
  title: 'Graceful Degradation — Adhoora Jawab > Koi Jawab Nahi',
  badge: 'Degrade Designer',
  objectives: [
    'Features ko CORE / IMPORTANT / OPTIONAL mein baantna',
    'Fallback ke vikalp — aur kab koi fallback NAHI dena',
    'User ko imaandaari se batana',
    'Degradation ko pehle se design karna, incident mein nahi',
  ],
  lesson: [
    `<h3>📖 Ek box ki wajah se poora page nahi girna chahiye</h3>
     <pre>❌ recommendations service down
   → poora product page 500
   → user kuch nahi khareed sakta
   → revenue ruk gaya (ek OPTIONAL box ki wajah se)</pre>
     <p>Sahi tareeka: har feature ko pehle se tier mein baant do.</p>
     <table>
       <tr><th>Tier</th><th>Matlab</th><th>Fail hone par</th></tr>
       <tr><td><b>CORE</b></td><td>iske bina page bekaar hai</td><td>error dikhao — chhupao mat</td></tr>
       <tr><td><b>IMPORTANT</b></td><td>hona chahiye, par zaroori nahi</td><td>stale cache · degraded version</td></tr>
       <tr><td><b>OPTIONAL</b></td><td>achha lagta hai</td><td>chhupa do — khaali jagah bhi nahi</td></tr>
     </table>
     <pre>Product page:
  CORE       → product info, price, "Buy" button
  IMPORTANT  → reviews (2 ghante purane chalega)
  OPTIONAL   → "aapke liye" recommendations</pre>
     <p class="tip">🎯 <b>Yeh faisla incident ke beech mein mat karo.</b>
     3 baje raat ko "kya zaroori hai" decide karna sabse bura waqt hai.
     Aur tier sirf ek document nahi hona chahiye — woh <b>code mein</b>
     dikhna chahiye (timeout, bulkhead, fallback).</p>`,
    `<h3>🔬 Fallback ke vikalp — aur kab NAHI</h3>
     <pre>1. Stale cache        "reviews (2 ghante purane)"
2. Default value      khaali recommendations list
3. Degraded feature   search down? category browse do
4. Saaf error         "abhi nahi kar sakte, 5 min mein try karo"</pre>
     <p><b>Kab fallback NAHI dena:</b> jab cheez <b>paisa</b>, <b>stock</b> ya
     <b>permissions</b> se judi ho.</p>
     <pre>❌ Balance service down → "₹0" dikha do
   user sochega paisa gaya 😱

❌ Stock service down → "in stock" maan lo
   user order karega, tumhe cancel karna padega

✅ Balance service down → "Balance abhi load nahi ho paa raha"
✅ Stock service down → "Availability check nahi kar paa rahe"</pre>
     <h3>💬 Imaandaari zaroori hai</h3>
     <p>Stale data <b>chup-chaap</b> dikhana sabse bura hai — user uspar
     faisle lega jo galat data par hain. Hamesha batao:</p>
     <pre>"Live stock abhi update nahi ho raha — 2 ghante purana data"
"Kuch features abhi uplabdh nahi hain"</pre>
     <p>Yeh sirf UX ki baat nahi hai. Ek user jo jaanta hai ki data purana
     hai, woh <b>refresh</b> karega — aur ek jo nahi jaanta, woh <b>support
     ticket</b> banayega.</p>`,
  ],
  stages: [
    {
      type: 'bins',
      title: 'Kaunsa tier?',
      instructions: 'Ek e-commerce product page ke features ko tier mein baanto.',
      bins: [
        { id: 'core', label: '🔴 CORE' },
        { id: 'imp', label: '🟡 IMPORTANT' },
        { id: 'opt', label: '🟢 OPTIONAL' },
      ],
      items: [
        { text: 'Product ka naam, photo aur price', bin: 'core', explain: 'Iske bina page ka koi matlab nahi. Yeh fail ho toh imaandaar error dikhao — chhupao mat.' },
        { text: '"Buy" button aur cart', bin: 'core', explain: 'Yahi revenue path hai. Ise sabse zyada threads, sabse achhi isolation aur sabse tight monitoring milni chahiye.' },
        { text: 'Customer reviews', bin: 'imp', explain: 'Purchase decision mein madad karte hain, par 2 ghante purane chalenge. Stale cache perfect fallback hai.' },
        { text: '"Aapke liye" recommendations', bin: 'opt', explain: 'Fail ho toh poora section chhupa do — khaali jagah bhi mat chhodo. User ko pata bhi nahi chalega.' },
        { text: 'Live stock count', bin: 'imp', explain: 'Important hai par uspar stale fallback KHATARNAK hai. Better: "availability check nahi kar paa rahe" — jhooth mat bolo.' },
        { text: '"Isse milte-julte products"', bin: 'opt', explain: 'Nice to have. Iski wajah se page kabhi nahi girna chahiye.' },
        { text: 'Recently viewed items', bin: 'opt', explain: 'Convenience feature. Chhupa do aur aage badho.' },
        { text: 'Delivery date estimate', bin: 'imp', explain: 'Purchase decision affect karta hai. Fallback: "3-5 din" jaisa generic range, exact date ke bajaye.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Degradation ke faisle',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'degrade',
      questions: [
        { q: 'Optional feature fail ho toh kya karein?', target: 'hide', explain: 'Poora section chhupa do — khaali jagah ya spinner bhi mat chhodo. User ko pata bhi nahi chalega ki kuch missing hai.' },
        { q: 'Stale data dikhate waqt sabse zaroori kya hai?', target: 'tell', explain: 'User ko BATAO ki data purana hai. Chup-chaap stale data dikhana sabse bura hai — user uspar galat faisle lega.' },
        { q: 'Tiers kab tay karne chahiye?', target: 'tiers', explain: 'PEHLE se — incident ke beech mein nahi. 3 baje raat ko "kya zaroori hai" decide karna sabse bura waqt hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Degradation ki samajh',
      questions: [
        {
          q: "Balance source unavailable hai aur current amount unknown. Safe default UI?",
          choices: ["Unavailable status; balance invent mat karo","Known balance bina 0 current dikha do","Old balance ko silently current dikha do","Balance error se every page crash karo"],
          answer: 0,
          explain: "Unknown balance ko 0 ya silently stale current balance mat banao. Explicit unavailable state do. Approved last-known balance timestamp/stale label ke saath useful ho sakta hai; business risk decides. Other safe page sections isolated reh sakte hain.",
         choiceExplanations: ["Unknown balance ko 0 ya silently stale current balance mat banao. Explicit unavailable state do. Approved last-known balance timestamp/stale label ke saath useful ho sakta hai; business risk decides. Other safe page sections isolated reh sakte hain.","0 real financial fact hai; unknown ko zero dikhana misleading hai.","Stale balance clearly timestamp/status ke saath only approved contract mein.","Optional UI isolation se baaki safe information available reh sakti hai."] },
        {
          q: 'Feature tiers kab decide karne chahiye?',
          choices: ["Criticality tiers pehle implement/test karo","Incident ke beech first time tiers chuno","Document enough; runtime policy na rakho","Every feature ko equal fallback de do"],
          answer: 0,
          explain: 'Incident ke beech mein yeh faisla karna matlab dabav mein architecture design karna. Aur agar tier sirf ek doc mein hai toh woh asal mein exist hi nahi karta — <b>code mein</b> dikhna chahiye: optional dependency ka apna chhota bulkhead, chhota timeout, aur ek likha hua fallback.',
         choiceExplanations: ["Incident ke beech mein yeh faisla karna matlab dabav mein architecture design karna. Aur agar tier sirf ek doc mein hai toh woh asal mein exist hi nahi karta — <b>code mein</b> dikhna chahiye: optional dependency ka apna chhota bulkhead, chhota timeout, aur ek likha hua fallback.","Stress mein ad-hoc decisions inconsistent aur slow ho sakte hain.","Document timeouts, capacity and fallback runtime mein enforce nahi karta.","Payment/auth versus recommendations ka failure risk alag ho sakta hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Degradation',
    instructions: 'Yahan product-thinking dikhana bada plus hai. 🎤',
    questions: [
      {
        q: '"Recommendation service down hai. Product page ka kya karoge?"',
        choices: ["Optional section bounded fallback se do","Complete checkout page failure return karo","Recommendations success tak wait karo","Any age ki cached result current bolo"],
        answer: 0,
        explain: 'Sabse achha jawab <b>tier</b> ka naam leta hai aur batata hai ki guards <b>pehle se</b> hone chahiye. Purane recommendations dikhana bhi theek hai (woh nuksaandeh nahi hai) — par asli baat yeh hai ki us ek section ki wajah se revenue path kabhi na ruke.',
       choiceExplanations: ["Sabse achha jawab <b>tier</b> ka naam leta hai aur batata hai ki guards <b>pehle se</b> hone chahiye. Purane recommendations dikhana bhi theek hai (woh nuksaandeh nahi hai) — par asli baat yeh hai ki us ek section ki wajah se revenue path kabhi na ruke.","Optional dependency ko whole-page hard requirement banana blast radius badhata hai.","Unbounded wait page deadline aur worker capacity consume karta hai.","Freshness/privacy contract stale fallback ko bound karta hai."] },
    ],
  },
  success: [
    'Features ko tiers mein baant sakte ho',
    'Har tier ke liye sahi fallback chun sakte ho',
    'Jaante ho kahan fallback NAHI dena',
    'User ko imaandaari se batate ho',
  ],
  homework: `Apne sabse zaroori page ke saare data sources list karo. Har ek ke saamne
    CORE/IMPORTANT/OPTIONAL likho. Ab code mein dekho: kya optional wale ka apna
    timeout aur fallback hai? Ya woh core ke saath hi latka hua hai?`,
  cards: [
    { front: 'Feature tiers?', back: '<b>CORE</b> (iske bina page bekaar — error dikhao) · <b>IMPORTANT</b> (stale cache/degraded) · <b>OPTIONAL</b> (chhupa do, khaali jagah bhi nahi).' },
    { front: 'Fallback kab NAHI dena?', back: 'Jab cheez <b>paisa · stock · permissions</b> se judi ho. ₹0 balance ya "in stock" maan lena user ko galat faisle par le jaata hai. Wahan imaandaar error behtar hai.' },
    { front: 'Stale data dikhate waqt?', back: '<b>Batao ki woh purana hai.</b> "2 ghante purana". Jaanta hua user refresh karta hai; na jaanne wala support ticket banata hai.' },
    { front: 'Tiers kab tay karein?', back: '<b>Pehle se</b> — incident ke beech mein nahi. Aur woh <b>code mein</b> dikhne chahiye (timeout, bulkhead, fallback), sirf doc mein nahi.' },
  ],
},

/* ===================================================================== */
{
  id: 'shedding',
  icon: '🌊',
  title: 'Load Shedding & Backpressure — Kuch ko Bachao',
  badge: 'Shed Master',
  objectives: [
    'Sabko girane se behtar hai kuch ko rokna',
    'Priority shedding — pehle kaunsa girao',
    'Bounded queue aur deadline-aware dropping',
    'Backpressure — signal upstream tak jaana chahiye',
  ],
  lesson: [
    `<h3>📖 Sabse bura nateeja: koi bhi serve nahi hua</h3>
     <pre>10,000 rps aayi, capacity 2,000 rps

❌ Sabko andar aane do:
   queue badhti gayi → p99 30 s → clients timeout → retry
   → load ×2 → 0% requests SAFAL 💀

✅ Shed karo:
   2,000 andar (poori speed se serve ✅)
   8,000 → 503 + Retry-After (turant, sasta)
   → 20% users khush</pre>
     <p>20% &gt; 0%. Yeh ganit saaf hai, par instinct ulta hota hai —
     "requests reject karna" bura lagta hai. Asal mein <b>jaldi reject karna
     ek feature hai</b>: dheere fail hona sabse mehenga failure mode hai,
     kyunki usme tum resources bhi kharch karte ho aur user bhi nahi milta.</p>`,
    `<h3>🔬 Chaar techniques</h3>
     <p><b>1. Priority shedding.</b> Sab requests barabar nahi:</p>
     <pre>checkout / payment  → aakhri tak bachao
browse / search     → phir
analytics / logs    → sabse pehle girao</pre>
     <p><b>2. Bounded queue.</b> Queue bhari? Turant reject. Unbounded queue
     ka matlab hai "failure baad mein, aur bada".</p>
     <p><b>3. Deadline-aware dropping.</b> Yeh sabse under-used hai:</p>
     <pre>Request 8 s se queue mein hai
Client ka timeout 5 s tha
→ woh ja chuka hai. Ab is request par kaam karna BARBAADI hai.
→ Phenk do aur agli lo.</pre>
     <p>Overload mein yeh bahut capacity bacha deta hai — kyunki tum sirf
     woh kaam kar rahe ho jiska koi intezaar kar raha hai.</p>
     <p><b>4. Admission control / waiting room.</b> Fixed number andar,
     baaki ko "loading…" dikhao. 8 second ka intezaar sabko 503 se behtar
     hai — aur woh <b>retries bhi rokta</b> hai.</p>
     <h3>🌊 Backpressure — signal upstream jaana chahiye</h3>
     <p>Sirf reject karna aadha kaam hai. <b>Backpressure</b> ka matlab hai
     ki "main bhara hoon" ka signal <b>upstream tak</b> pahunche taaki woh
     bhejna hi kam kar de:</p>
     <pre>HTTP  → 503 + Retry-After (client backoff kare)
Queue → consumer dheere pull kare (producer ko pata chale)
gRPC  → flow control windows
TCP   → yeh already karta hai (receive window)</pre>
     <p class="tip">🎯 Sabse achha backpressure woh hai jo <b>producer ko
     rokta</b> hai, na ki jo consumer par kachra jama karta hai.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🌊 Shed karke kuch ko bachao',
      goal: '50,000 rps par capacity panel padho: is model mein lagbhag 278 rps capacity hai. Admission 200 rps par rakho, phir wahi load dobara chalao. Admitted load capacity ke neeche, saturation false aur baaki waiting-room traffic dikhna chahiye.',
      sys: SD.sys.results(),
      tasks: T_SHED,
      success: SD.allTasks(T_SHED),
      successText: `Admission control ne kuch nahi "theek" kiya — usne <b>faisla</b> kiya.
        <br><br>Pehle: sab andar aaye, queue badhi, sab mare — <b>0% safal</b>.
        <br>Ab: kuch andar, poori speed se serve — <b>kuch % safal</b>.
        <br><br>Aur ek chhupa hua faayda: waiting room <b>retries bhi rokta hai</b>.
        503 dekh ke log refresh dabate hain (12 lakh requests 30 lakh ban jaati hain);
        "Aapka result load ho raha hai" dekh ke woh ruk jaate hain.`,
      solution: [
        "load --rps 50000 --duration 5 --pattern detail",
        "sim add admission --max-concurrent 200 --queue 8",
        "load --rps 50000 --duration 5 --pattern detail",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.admission?.maxConcurrent === 200 && m.current(s, 'load', r => r.rps === 50000 && !r.saturated && r.queuedRps > 0); },
      hints: [
        "Pehle observation: Capacity se zyada load daalo — sab mar jaayenge. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Wahi load dobara — ab kuch to bach jaayenge. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nload --rps 50000 --duration 5 --pattern detail\nsim add admission --max-concurrent 200 --queue 8\nload --rps 50000 --duration 5 --pattern detail",
      ],
    },
    {
      type: 'match',
      title: 'Overload ke tools',
      instructions: 'Har halat ko sahi technique se jodo.',
      pairs: [
        { left: '📊 Capacity 2,000 rps, aa rahi 10,000', right: 'Load shedding — 2,000 andar, baaki 503 + Retry-After', explain: 'Sabko andar aane dene se 0% safal hote hain. Shed karke 20% safal hote hain.' },
        { left: '⏳ Request 8 s se queue mein, client timeout 5 s tha', right: 'Deadline-aware dropping — phenk do', explain: 'Client ja chuka hai. Us request par kaam karna barbaadi hai. Overload mein yeh bahut capacity bachata hai.' },
        { left: '🎫 12 lakh log ek saath aa rahe hain (predictable)', right: 'Admission control / waiting room', explain: '8 second ka intezaar sabko 503 se behtar hai — aur woh retries bhi rokta hai.' },
        { left: '💳 Checkout aur analytics dono queue mein', right: 'Priority shedding — analytics pehle girao', explain: 'Sab requests barabar nahi. Revenue path aakhri tak bachao.' },
        { left: '📮 Producer consumer se tez hai', right: 'Bounded queue + backpressure producer tak', explain: 'Unbounded queue = "failure baad mein, aur bada". Signal producer tak jaana chahiye taaki woh dheere bheje.' },
        { left: '🔌 Downstream ne 429 bheja', right: 'Outbound rate limiter — apni speed kam karo', explain: 'Yeh backpressure ka respect karna hai. Retry loop lagana ulta kaam karega.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Shedding ke tools',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'shedding',
      questions: [
        { q: 'Sab requests barabar nahi — kaunsi technique?', target: 'priority', explain: 'Priority shedding. Checkout > browse > analytics. Revenue path aakhri tak bachao.' },
        { q: 'Client ja chuka hai par request abhi bhi queue mein hai — kya karein?', target: 'deadline', explain: 'Deadline-aware dropping — phenk do. Uspar kaam karna barbaadi hai, aur overload mein yeh bahut capacity bachata hai.' },
        { q: '12 lakh log ek saath — sabko 503 se behtar kya hai?', target: 'admission', explain: 'Admission control / waiting room. 8 second ka "loading…" sabko 503 se behtar hai, aur woh retries bhi rokta hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Shedding ki samajh',
      questions: [
        {
          q: "Capacity 2000 rps; offered 10000 rps; unbounded admission. Defensible outcome?",
          choices: ["Offered load se unbounded waits badhenge","Exactly 0% success har case guaranteed","Queue automatically 2000 rps se tez hogi","Autoscale burst se pehle always ready"],
          answer: 0,
          explain: "Arrival 10000/s aur sustainable 2000/s mein unbounded admission se queues/waits grow karte hain, deadlines expire aur retries pressure badha sakti hain. Exactp 99 or0%success given numbers se derive nahi; admission control useful capacity preserve kar sakta hai.",
         choiceExplanations: ["Arrival 10000/s aur sustainable 2000/s mein unbounded admission se queues/waits grow karte hain, deadlines expire aur retries pressure badha sakti hain. Exactp 99 or0%success given numbers se derive nahi; admission control useful capacity preserve kar sakta hai.","Success fraction capacity, deadlines, queues aur retries par depend hai.","Buffering service rate create nahi karti.","Reactive scaling observation, provisioning, warm-up delay rakhti hai."] },
        {
          q: 'Backpressure aur load shedding mein farak?',
          choices: ["Shed reject; backpressure sender ko slow kare","Backpressure only database feature hai","Reject se client rate automatically gire","Backpressure message durable store kare"],
          answer: 0,
          explain: 'Shedding sirf tumhe bachati hai. Backpressure <b>poore system</b> ko bachati hai — producer sach mein dheere bhejta hai, isliye kaam banta hi nahi. 503 + Retry-After dono ek saath karta hai: reject bhi, aur signal bhi.',
         choiceExplanations: ["Shedding sirf tumhe bachati hai. Backpressure <b>poore system</b> ko bachati hai — producer sach mein dheere bhejta hai, isliye kaam banta hi nahi. 503 + Retry-After dono ek saath karta hai: reject bhi, aur signal bhi.","HTTP/streams/queues mein cooperative demand signaling possible hai.","Clients signal ignore/retry kar sakte hain; retry policy chahiye.","Backpressure flow control hai; durability separate contract hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Overload',
    instructions: 'Yahan "reject karna achha hai" wali soch dikhani hai. 🎤',
    questions: [
      {
        q: '"Traffic capacity se 5x zyada hai. Kya karoge?"',
        choices: ["Bound admission; shed by priority","Queue unlimited karo taaki loss zero ho","All requests ka timeout 10x kar do","Only autoscale ka wait bina cap karo"],
        answer: 0,
        explain: 'Auto-scaling minutes leti hai — spike seconds mein hota hai. Queue badhana sabse ulta jawab hai: woh latency badhata hai aur failure ko badi banata hai. Sahi jawab <b>kam kaam karna</b> chunta hai, taaki jo kaam ho woh sach mein poora ho.',
       choiceExplanations: ["Auto-scaling minutes leti hai — spike seconds mein hota hai. Queue badhana sabse ulta jawab hai: woh latency badhata hai aur failure ko badi banata hai. Sahi jawab <b>kam kaam karna</b> chunta hai, taaki jo kaam ho woh sach mein poora ho.","Unbounded queue expired work, memory pressure aur delay accumulate karti hai.","Longer wait new service capacity nahi create karta.","Scale-up lag ke dauraan overload existing capacity gira sakta hai."] },
    ],
  },
  success: [
    'Bata sakte ho ki shed karna kyun zaroori hai',
    'Priority shedding design kar sakte ho',
    'Deadline-aware dropping samjha sakte ho',
    'Backpressure aur shedding mein farak kar sakte ho',
  ],
  homework: `Apne service mein dekho: overload par kya hota hai? Kya koi bounded queue hai?
    Kya 503 + Retry-After bhejte ho ya 500? Kya queue mein padi purani requests
    (jinke clients ja chuke hain) par abhi bhi kaam hota hai?`,
  cards: [
    { front: 'Sabko andar aane dene ka nateeja?', back: 'Queue badhi → p99 30s → clients timeout → retry → load ×2 → <b>0% safal</b>. Shed karo toh 20% safal. <b>Jaldi reject karna ek feature hai.</b>' },
    { front: 'Shedding ki 4 techniques?', back: '<b>1.</b> Priority (analytics pehle girao) <b>2.</b> Bounded queue <b>3.</b> Deadline-aware dropping <b>4.</b> Admission control / waiting room.' },
    { front: 'Deadline-aware dropping?', back: 'Request 8s se queue mein, client timeout 5s tha → <b>woh ja chuka hai</b>. Uspar kaam karna barbaadi hai. Overload mein bahut capacity bachata hai.' },
    { front: 'Backpressure vs Shedding?', back: '<b>Shedding</b> = reject karna (defensive, sirf tumhe bachata hai). <b>Backpressure</b> = "bhara hoon" ka signal upstream bhejna (cooperative, poore system ko bachata hai).' },
  ],
},

/* =====================================================================
   L8 — Flash crowd  ⭐ MARQUEE
   ===================================================================== */
{
  id: 'flashcrowd',
  icon: '🎆',
  title: 'Flash Crowd — 5 Baje, 12 Lakh Log, Ek Saath',
  badge: 'Crowd Commander',
  objectives: [
    'Predictable spike normal scaling problem <b>nahi</b> hai',
    'Precompute — jawab pehle se taiyaar rakho',
    'Pre-scale — autoscaling traffic ke BAAD react karta hai',
    'Admission control aur retry amplification',
  ],
  lesson: [
    `<h3>📖 Board result, 5 baje, 12 lakh students</h3>
     <p>Sabse pehle pehchaano ki yeh kaunsa problem hai. Yeh "hume scale
     karna hai" wala problem <b>nahi</b> hai. Yeh ek <b>predictable flash
     crowd</b> hai — aur usme tumhara sabse bada faayda yeh hai ki tumhe
     <b>hafton pehle pata hai</b>.</p>
     <pre>12,00,000 users, lagbhag ek hi minute mein
→ ~1,20,000 rps peak (aur pehle 10 second sabse bure)</pre>
     <h3>1️⃣ 5 baje se pehle jitna kaam ho sake, kar lo</h3>
     <p>Result <b>pehle se pata hai</b>. Toh rank, eligibility, percentile —
     yeh sab request aane ke baad calculate karne ki koi wajah nahi:</p>
     <pre>4:59:59 tak har result MATERIALIZED hona chahiye:
   roll_number → poora result object (ek blob)</pre>
     <p>Ab read path ek <b>key lookup</b> hai. Koi JOIN nahi, koi computation
     nahi. Service time 180 ms se 2 ms ho gaya — aur Little's Law se
     capacity 90x badh gayi.</p>
     <h3>2️⃣ Autoscaling ke bharose mat baitho</h3>
     <p>Autoscaling traffic dekhne ke <b>baad</b> react karta hai: metric
     scrape (30 s) + decision (30 s) + instance boot (60 s) + warm-up.
     Tab tak 2-3 minute nikal chuke honge — aur flash crowd 60 second ka hai.</p>
     <pre>PRE-SCALE karo (event se pehle):
  app instances · DB/KV capacity · connection pools
  load balancers · regional capacity · queue consumers</pre>`,
    `<h3>3️⃣ Admission control — backend ko bachao</h3>
     <p>Pre-scale ke baad bhi unlimited requests andar mat aane do.
     Maan lo tum surakshit roop se 1.5 lakh rps serve kar sakte ho:</p>
     <pre>1,50,000 andar
baaki → waiting room: "Aapka result load ho raha hai…"</pre>
     <p><b>8 second ka intezaar sabko 503 se behtar hai.</b> Aur ek chhupa
     hua faayda: yeh <b>retries rokta</b> hai. 503 dekh ke log refresh
     dabate hain (aur apps apne aap retry karte hain) — 12 lakh requests
     chup-chaap 30 lakh ban jaati hain. Waiting room us amplification ko
     hone hi nahi deta.</p>
     <h3>4️⃣ Read path bilkul simple rakho</h3>
     <p>Yeh data <b>read-heavy</b> aur <b>immutable</b> hai — publish hone
     ke baad result kabhi badalta nahi.</p>
     <pre>• Partitioned key-value store (ya pre-generated objects)
• Partition: hash(roll_number) — traffic barabar bikhrega
• Immutable hai → jitna chaaho REPLICATE karo, conflict ho hi nahi sakta
• CDN par bhi daal sakte ho (result public hai)</pre>
     <p class="tip">🎯 Aur aakhri kadam: <b>asli traffic shape par load test
     karo</b>. Average rps par test karna bekaar hai — sawaal yeh hai ki
     <b>pehle 10 second</b> jhel paoge ya nahi.</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🎆 Result day ke liye taiyaari',
      goal: 'Kal 5 baje 12 lakh students result dekhenge. Abhi system 1.2 lakh rps par gir jaata hai. Precompute, pre-scale aur admission control lagao — phir load test karke prove karo.',
      sys: SD.sys.results(),
      tasks: T_FLASH,
      success: SD.allTasks(T_FLASH),
      successText: `Teen kadam, teen alag problem:
        <br><br><b>1. Precompute</b> — service time 180 ms se 2 ms.
        Little's Law se capacity seedha 90x badh gayi. <b>Yeh sabse bada single faayda tha.</b>
        <br><b>2. Pre-scale</b> — autoscaling traffic ke BAAD react karta hai
        (~2-3 minute), aur flash crowd 60 second ka hai. Pehle se scale karo.
        <br><b>3. Admission control</b> — backend ko bachaya, aur retry amplification
        (12 lakh → 30 lakh) hone hi nahi diya.
        <br><br>Aur read path ab embarrassingly simple hai: ek key lookup, immutable data,
        jitna chaaho replicate karo.`,
      solution: [
        "load --rps 120000 --duration 4 --pattern detail",
        "sim precompute results",
        "sim scale pool 400",
        "sim add admission --max-concurrent 150000 --queue 8",
        "load --rps 120000 --duration 4 --pattern detail",
      ],
      verify: s => { const m = SD.mission; return s.sys.api.precomputed === true && s.sys.pool.size === 400 && s.sys.api.admission?.maxConcurrent === 150000 && m.current(s, 'load', r => r.rps === 120000 && !r.saturated); },
      hints: [
        "Pehle observation: As-is 1.2 lakh rps daalo — system gir jaayega. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Ab dobara load test karo — survive karna chahiye. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nload --rps 120000 --duration 4 --pattern detail\nsim precompute results\nsim scale pool 400\nsim add admission --max-concurrent 150000 --queue 8\nload --rps 120000 --duration 4 --pattern detail",
      ],
    },
    {
      type: 'order',
      title: 'Flash crowd ki taiyaari ka kram',
      instructions: 'Event se pehle kya-kya karoge — sahi order mein.',
      steps: [
        { text: 'Traffic ka hisaab lagao — 12 lakh users, kitne second mein?', explain: 'Pehle number nikalo. 12 lakh / 60 second = 20,000 rps average, par pehle 10 second mein 5x bhi ho sakta hai. Bina number ke baaki sab andaza hai.' },
        { text: 'Sab kuch precompute karo — result materialize kar do', explain: 'Sabse bada single faayda. Service time 180 ms se 2 ms = capacity 90x. Yeh baaki sab optimizations se zyada asar karta hai.' },
        { text: 'Read path simplify karo — partitioned KV, immutable objects', explain: 'Ek key lookup. Immutable hai isliye aggressive replication safe hai — conflict ho hi nahi sakta.' },
        { text: 'Pre-scale karo — app, DB, pools, LB, consumers', explain: 'Autoscaling 2-3 minute leti hai; flash crowd 60 second ka hai. Woh der se pahunchegi.' },
        { text: 'Admission control / waiting room lagao', explain: 'Pre-scale ke baad bhi unlimited requests andar mat aane do. Aur yeh retry amplification bhi rokta hai.' },
        { text: 'ASLI traffic shape par load test karo', explain: 'Average par test karna bekaar hai. Sawaal yeh hai: "pehle 10 second jhel paoge?" Isi test se pata chalta hai ki koi kadam chhoot toh nahi gaya.' },
        { text: 'Runbook + monitoring taiyaar rakho, team on-call', explain: 'Kuch na kuch toh hoga hi. Farak sirf yeh hai ki tum tayyar ho ya discover kar rahe ho.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Flash crowd ki taiyaari',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'flashcrowd',
      questions: [
        { q: 'Sabse bada single faayda kaunsa kadam deta hai?', target: 'pre', explain: 'Precompute. Result pehle se pata hai — rank/eligibility request ke baad calculate karne ki koi wajah nahi. Service time 180ms se 2ms = capacity 90x.' },
        { q: 'Autoscaling par bharosa kyun nahi kar sakte?', target: 'scale', explain: 'Woh traffic dekhne ke BAAD react karta hai — scrape + decision + boot + warm-up = 2-3 minute. Flash crowd 60 second ka hai.' },
        { q: '12 lakh requests 30 lakh kaise ban jaati hain?', target: 'amp', explain: 'Retry amplification — 503 dekh ke log refresh dabate hain aur apps apne aap retry karte hain. Waiting room isse rokta hai.' },
        { q: 'Result immutable hai — isse kya faayda?', target: 'repl', explain: 'Jitna chaaho replicate karo, conflict ho hi nahi sakta. Publish hone ke baad result kabhi badalta nahi.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Flash crowd ki samajh',
      questions: [
        {
          q: 'Predictable flash crowd normal scaling problem se kaise alag hai?',
          choices: ["Known event allows preparation and rehearsal","Only average daily load estimate kaafi hai","Publish instant par scale signal pehla lo","Predictable event mein admission optional"],
          answer: 0,
          explain: 'Yeh framing hi sabse zaroori insight hai. "Hume scale karna hai" ek reactive problem hai. "5 baje 12 lakh log aayenge" ek <b>planning</b> problem hai — aur usme tumhare paas hafton ka waqt hai, seconds ka nahi.',
         choiceExplanations: ["Yeh framing hi sabse zaroori insight hai. \"Hume scale karna hai\" ek reactive problem hai. \"5 baje 12 lakh log aayenge\" ek <b>planning</b> problem hai — aur usme tumhare paas hafton ka waqt hai, seconds ka nahi.","Correlated burst average se much higher ho sakta hai.","Known timing se pehle warmup/pre scale/precompute possible hai.","Finite capacity ke liye admission still useful hai."] },
        {
          q: "Short sharp flash crowd mein reactive autoscaling ka risk?",
          choices: ["Reactive scaling burst se late ho sakti","Autoscale kabhi any burst handle nahi karti","Autoscale always exactly 3 minutes leti","Scale target se cold cache bhi warm hoti"],
          answer: 0,
          explain: "Reactive autoscaling detection, decision, provisioning aur warmup time leti hai; short sharp burst se late ho sakti hai. Exact 2-3 minutes/60 seconds universal nahi; warm minimum capacity, predictive/scheduled scaling aur admission complement hain.",
         choiceExplanations: ["Reactive autoscaling detection, decision, provisioning aur warmup time leti hai; short sharp burst se late ho sakti hai. Exact 2-3 minutes/60 seconds universal nahi; warm minimum capacity, predictive/scheduled scaling aur admission complement hain.","Small/long bursts aur warm capacity scaling successfully handle kar sakte hain.","Timing infrastructure, metrics aur instance readiness specific hai.","New capacity ko app/cache warmup separately lag sakta hai."] },
        {
          q: "Bounded waiting room admission control se kya faayda ho sakta hai?",
          choices: ["Bounded waiting room load smooth kar sakta","Waiting room ki queue unlimited rakho","Refresh ko unlimited new ticket bana do","Waiting room se capacity infinite hoti"],
          answer: 0,
          explain: "A bounded waiting room stable queue token, backoff, predictable wait aur admission limit ke saath refresh amplification ghata sakta hai.8 seconds merely scenario assumption; queue abandonment, expiry, fairness aur capacity measure karo.",
         choiceExplanations: ["A bounded waiting room stable queue token, backoff, predictable wait aur admission limit ke saath refresh amplification ghata sakta hai.8 seconds merely scenario assumption; queue abandonment, expiry, fairness aur capacity measure karo.","Capacity/backlog deadlines ke bina waiting time unbounded ho sakta hai.","Stable queue token and rate controls refresh amplification prevent karte hain.","Admission arrivals smooth karta hai; backend throughput finite rehta hai."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Flash Crowd',
    instructions: 'Yeh Principal-level ka classic sawaal hai. 🎤',
    questions: [
      {
        q: '"Board result 5 baje publish hoga, 12 lakh students dekhenge. Design karo."',
        choices: ["Precompute; warm; admit; real burst test karo","Only CDN se private results safely share","Only reactive scale pe result publish karo","Only unlimited worker queue deploy karo"],
        answer: 0,
        explain: 'Sabse achha jawab pehle problem ko <b>naam</b> deta hai (predictable flash crowd), phir sabse bade lever se shuru karta hai (precompute — 90x capacity). Aur "load test with real traffic shape" bolna dikhata hai ki tumne yeh sach mein kiya hai.',
       choiceExplanations: ["Sabse achha jawab pehle problem ko <b>naam</b> deta hai (predictable flash crowd), phir sabse bade lever se shuru karta hai (precompute — 90x capacity). Aur \"load test with real traffic shape\" bolna dikhata hai ki tumne yeh sach mein kiya hai.","Private roll-number data auth/cache-key policy require karta hai.","First burst provisioning aur warmup se pehle hit kar sakta hai.","Queue deadlines, limits aur replay/idempotency needed hain."] },
      {
        q: "Pre scale ke baad first 10 seconds failure. Agla diagnostic approach?",
        choices: ["Trace limits, retries and cold paths","Pre scale se every resource limit removed","First 10 seconds proves DB too small","A CDN alone makes every path bounded"],
        answer: 0,
        explain: "Prescaling ke bawajood offered load/retries, DBpool, cachecoldness, provider limits or ingress saturation remain ho sakte hain. Admission and retry evidence inspect karo; ten-second failure alone one cause prove nahi karta.",
       choiceExplanations: ["Prescaling ke bawajood offered load/retries, DBpool, cachecoldness, provider limits or ingress saturation remain ho sakte hain. Admission and retry evidence inspect karo; ten-second failure alone one cause prove nahi karta.","Capacity limit may be DB, pool, provider, network or request amplification.","Measure trace and saturation; timing alone does not name resource.","Dynamic/private routes and origins can still saturate."] },
    ],
  },
  success: [
    'Predictable flash crowd ko pehchaan sakte ho',
    'Precompute se capacity badhana samjha sakte ho',
    'Bata sakte ho ki autoscaling kyun der se aati hai',
    'Retry amplification aur waiting room ka rishta jaante ho',
  ],
  homework: `Apne product mein koi predictable spike dhoondo — sale, payday, month-end report,
    exam result. Uske liye ek chhota plan likho: kya precompute ho sakta hai?
    kitna pre-scale chahiye? admission control kahan lagega?`,
  cards: [
    { front: 'Predictable flash crowd?', back: 'Normal scaling <b>nahi</b> — ek planning problem. Tumhe hafton pehle pata hai, isliye precompute, pre-scale aur load test <b>pehle</b> ho sakte hain.' },
    { front: 'Sabse bada lever?', back: '<b>Precompute.</b> Jawab pehle se materialize karo (roll_no → object). Service time 180ms → 2ms = <b>capacity 90x</b>.' },
    { front: 'Autoscaling kyun kaafi nahi?', back: 'Woh traffic ke <b>BAAD</b> react karti hai: scrape + decision + boot + warm-up = 2-3 minute. Flash crowd 60 second ka hai.' },
    { front: 'Retry amplification?', back: '503 dekh ke log refresh dabate hain (aur apps retry karte hain) → <b>12 lakh requests 30 lakh</b>. Waiting room isse hone hi nahi deta.' },
    { front: 'Immutable data ka faayda?', back: 'Publish ke baad result kabhi nahi badalta → <b>jitna chaaho replicate karo</b>, conflict ho hi nahi sakta. CDN par bhi daal sakte ho.' },
  ],
},

/* ===================================================================== */
{
  id: 'observability',
  icon: '🔍',
  title: 'Observability — "Kya Toota" Nahi, "Kahan Waqt Gaya"',
  badge: 'Signal Reader',
  objectives: [
    'RED (services) aur USE (resources) metrics',
    'Metrics vs traces vs logs — teenon ka alag kaam',
    'Liveness vs readiness — health check ka jhooth',
    'Alert <b>symptoms</b> par, causes par nahi',
  ],
  lesson: [
    `<h3>📖 Do frameworks, poori coverage</h3>
     <pre>🔴 RED — har SERVICE ke liye
   Rate      — requests/sec
   Errors    — kitni fail hui
   Duration  — p50 / p95 / p99

🟡 USE — har RESOURCE ke liye
   Utilization — kitna use ho raha hai
   Saturation  — kitna INTEZAAR ho raha hai  🔥
   Errors      — resource-level failures</pre>
     <p>Zyadatar dashboards par RED hota hai aur USE ka sirf
     <b>utilization</b> hissa. Aur outage hamesha <b>saturation</b> se aata
     hai — pool wait, queue depth, thread pool exhaustion.</p>
     <table>
       <tr><th>Resource</th><th>Saturation metric</th></tr>
       <tr><td>DB pool</td><td><code>pool.wait_ms</code>, queue depth</td></tr>
       <tr><td>Thread pool</td><td>queued tasks, rejected tasks</td></tr>
       <tr><td>Queue</td><td>depth, consumer lag, oldest message age</td></tr>
       <tr><td>Disk</td><td>I/O wait time</td></tr>
       <tr><td>Network</td><td>connection pool wait, retransmits</td></tr>
     </table>`,
    `<h3>🔬 Teen signals, teen alag sawaal</h3>
     <table>
       <tr><th>Signal</th><th>Sawaal</th><th>Kab</th></tr>
       <tr><td><b>Metrics</b></td><td>"kya kuch galat hai?"</td><td>alerting — sasta, aggregate</td></tr>
       <tr><td><b>Traces</b></td><td>"waqt KAHAN gaya?"</td><td>ek request ka poora safar</td></tr>
       <tr><td><b>Logs</b></td><td>"us EK request mein kya hua?"</td><td>detail — structured + trace_id</td></tr>
     </table>
     <p>Sirf logs se debug karna ek jasoosi novel hai. Metric batata hai
     <b>ki</b> problem hai; trace batata hai <b>kahan</b>; log batata hai
     <b>kya</b>. Aur teenon ko <code>trace_id</code> se jodo.</p>
     <h3>🟢 Health check ka jhooth</h3>
     <pre>LIVENESS   "process zinda hai?"     → fail = RESTART karo
READINESS  "traffic le sakta hoon?" → fail = LB se HATAO</pre>
     <p>Dono ek hi endpoint banana sabse aam galti hai. Socho: ek dependency
     dheemi ho gayi. Agar liveness usse check karta hai toh Kubernetes
     <b>healthy pods restart karta rahega</b> — aur restart se woh dependency
     theek nahi hogi, bas capacity aur kam ho jaayegi.</p>
     <pre>Liveness  → sasta. Sirf "main chal raha hoon".
Readiness → thoda gehra. "Mere pool mein connection hai? critical deps ok hain?"</pre>
     <h3>🔔 Alert symptoms par</h3>
     <pre>❌ "CPU > 80%"            → toh kya? shayad sab theek hai
❌ "memory > 90%"         → JVM ke liye normal ho sakta hai
✅ "checkout error rate > 1% (5 min)"     → user ko dard ho raha hai
✅ "p99 > 500ms (10 min)"                 → user ko dard ho raha hai
✅ "queue ka oldest message > 5 min"      → kaam ruk gaya hai</pre>
     <p class="tip">🎯 Har alert ke saath ek <b>runbook</b> ho. Aur jis alert
     par koi kuch nahi karta, use <b>hata do</b> — woh sirf noise nahi hai,
     woh baaki alerts ko bhi bekaar bana raha hai (alert fatigue).</p>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🔍 Signals padhna seekho',
      goal: 'Ek system dheema chal raha hai. Chaaron signals use karo — health check, metrics, trace aur error budget — aur samjho ki har ek kya batata hai.',
      sys: SD.sys.orders({ db: { longTxHolding: 44 } }),
      tasks: T_OBS,
      success: SD.allTasks(T_OBS),
      successText: `Chaar signals, chaar alag sawaal:
        <br><br>• <b>/health</b> → "process zinda hai" — <b>aur kuch nahi</b>. Usne pool chhua hi nahi.
        <br>• <b>metrics</b> → CPU 10% (utilization theek) par pool wait aasman par (saturation 🔥)
        <br>• <b>trace</b> → waqt <b>kahan</b> gaya — <code>pool.acquire()</code>
        <br>• <b>slo</b> → kitna budget bacha hai, aur kya yeh page karne laayak hai
        <br><br>Yaad rakho: <b>utilization</b> batata hai "kitna use ho raha hai",
        <b>saturation</b> batata hai "kitna intezaar ho raha hai" — aur outage hamesha
        doosre se aata hai.`,
      solution: [
        "load --rps 400 --duration 6",
        "GET /health",
        "metrics",
        "trace GET /api/v1/orders",
        "slo --availability 99.9",
      ],
      verify: s => { const m = SD.mission; return m.current(s, 'load') && m.current(s, 'metrics') && m.current(s, 'trace') && m.latest(s, 'slo')?.avail === 99.9; },
      hints: [
        "Pehle observation: Load daalo taaki kuch dekhne laayak ho. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Error budget nikalo. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nload --rps 400 --duration 6\nGET /health\nmetrics\ntrace GET /api/v1/orders\nslo --availability 99.9",
      ],
    },
    {
      type: 'bins',
      title: 'Alert lagana chahiye?',
      instructions: 'Har condition ko sahi bin mein daalo.',
      bins: [
        { id: 'page', label: '📟 Page karo (raat ko uthao)' },
        { id: 'ticket', label: '🎫 Ticket (subah dekho)' },
        { id: 'no', label: '❌ Alert mat banao' },
      ],
      items: [
        { text: 'Checkout ka error rate 5 min se > 1%', bin: 'page', explain: 'User ko dard ho raha hai aur paisa ruk raha hai. Yeh classic symptom-based page hai.' },
        { text: 'CPU > 80%', bin: 'no', explain: 'Toh kya? Shayad sab theek hai — CPU high hona efficient bhi ho sakta hai. Cause par alert mat karo, symptom par karo.' },
        { text: 'Disk 85% bhar gaya', bin: 'ticket', explain: 'Kaam karna hai par abhi nahi. Yeh predictable hai — subah dekho. (95% par page karo.)' },
        { text: 'Queue ka oldest message > 5 minute purana', bin: 'page', explain: 'Kaam ruk gaya hai. Yeh "queue depth" se behtar metric hai — depth badi ho par messages tez ja rahe hon toh theek hai.' },
        { text: 'DLQ mein message aa gaya', bin: 'ticket', explain: 'Dekhna zaroori hai (warna data chup-chaap marta hai) par aksar raat ko uthne laayak nahi. Volume badhe toh page karo.' },
        { text: 'p99 latency 10 min se SLO se upar', bin: 'page', explain: 'Users ko dard ho raha hai aur error budget jal raha hai. Symptom-based, actionable.' },
        { text: 'Ek pod restart hua', bin: 'no', explain: 'Yeh normal hai — orchestrator ka kaam hi yehi hai. Alert tab jab restart rate abnormal ho (crash loop).' },
        { text: 'Error budget 10x speed se jal raha hai', bin: 'page', explain: 'Burn-rate alert — sabse achha alert type. Woh asar ko time se jodta hai: chhota spike jise budget jhel sakta hai woh kisi ko nahi jagayega.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'Observability ke signals',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'observability',
      questions: [
        { q: 'Kaunsa metric aksar dashboards par hota hi nahi — par outage wahi se aata hai?', target: 'sat', explain: 'Saturation — "kitna intezaar ho raha hai". Pool wait, queue depth, thread pool rejections. Utilization sab jagah hota hai, saturation nahi.' },
        { q: '"Waqt KAHAN gaya" ka jawab kaunsa signal deta hai?', target: 'traces', explain: 'Traces. Metrics batate hain ki problem hai; trace batata hai kahan; log batata hai kya.' },
        { q: 'Liveness aur readiness ek hi endpoint banane ka nateeja?', target: 'health', explain: 'Ek dheemi dependency par liveness fail hoga aur healthy pods restart hote rahenge — jisse capacity aur kam ho jaayegi.' },
        { q: 'Alert kis par lagana chahiye?', target: 'alert', explain: 'Symptoms par (error rate, p99, oldest message age) — causes par nahi (CPU, memory). Aur jis alert par koi kuch nahi karta, use hata do.' },
      ],
    },
    {
      type: 'quiz',
      title: 'Observability ki samajh',
      questions: [
        {
          q: "Liveness+readiness dono blocked dependency test use karte hain. Risk?",
          choices: ["Dependency liveness can cause restart cascade","Same endpoint is always invalid design","Readiness failure always restarts process","Liveness probe should check every provider"],
          answer: 0,
          explain: "If liveness/readiness endpoint blocked dependency test share kare, toh dependency outage readiness removal ke saath unnecessary local restarts trigger kar sakti hai. A shared cheap endpoint always wrong nahi; probe purpose and failover behavior explicit rakho.",
         choiceExplanations: ["If liveness/readiness endpoint blocked dependency test share kare, toh dependency outage readiness removal ke saath unnecessary local restarts trigger kar sakti hai. A shared cheap endpoint always wrong nahi; probe purpose and failover behavior explicit rakho.","Same simple endpoint possible; danger depends on meaning/check dependencies.","Readiness removes traffic; restart behavior belongs to liveness/startup failure.","External outage should not automatically kill a functioning local process."] },
        {
          q: '"CPU > 80%" par alert kyun bura hai?',
          choices: ["Page on user impact; CPU informs diagnosis","CPU 80% proves every user is failing","CPU metric cannot ever be measured","Resource metrics cannot guide capacity"],
          answer: 0,
          explain: 'Cause-based alerts ka nateeja <b>alert fatigue</b> hota hai — log unhe ignore karna seekh jaate hain, aur phir asli alert bhi ignore ho jaata hai. Symptom-based alerts hamesha actionable hote hain: agar user ko dard nahi ho raha, toh raat ko uthne ki koi wajah nahi.',
         choiceExplanations: ["Cause-based alerts ka nateeja <b>alert fatigue</b> hota hai — log unhe ignore karna seekh jaate hain, aur phir asli alert bhi ignore ho jaata hai. Symptom-based alerts hamesha actionable hote hain: agar user ko dard nahi ho raha, toh raat ko uthne ki koi wajah nahi.","CPU usage needs correlation with saturation, user SLO and headroom.","CPU metrics are useful signals; not every threshold warrants page.","Capacity planning often uses utilization and saturation trends."] },
        {
          q: 'Burn-rate alert kya karta hai?',
          choices: ["Error budget consumption speed measure kare","Server temperature burn ko alert kare","CPU utilization ko error budget maan le","Only monthly SLA refund sum karta"],
          answer: 0,
          explain: 'Yeh "error rate > 1%" se behtar hai kyunki woh <b>asar ko time se jodta</b> hai. 2 minute ka 5% error spike shayad budget ka 1% hai — usse kisi ko nahi jagana chahiye. Par 2% error jo 6 ghante chale, woh poora mahina kha jaayega.',
         choiceExplanations: ["Yeh \"error rate > 1%\" se behtar hai kyunki woh <b>asar ko time se jodta</b> hai. 2 minute ka 5% error spike shayad budget ka 1% hai — usse kisi ko nahi jagana chahiye. Par 2% error jo 6 ghante chale, woh poora mahina kha jaayega.","Burn rate is SLO budget usage, not hardware temperature.","Budget is defined by chosen SLI, error fraction/time objectives.","Multi window burn alerts can react much sooner than monthly accounting."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Observability',
    instructions: '"Symptoms par alert" bolna yahan sabse achha signal hai. 🎤',
    questions: [
      {
        q: '"Ek naye service ke liye kya monitor karoge?"',
        choices: ["Outcome SLI plus resource saturation dekho","Only machine averages ko service SLO bolo","Only tool install se all alerts useful","Every CPU change pe urgent page bhejo"],
        answer: 0,
        explain: 'Sabse achha jawab do frameworks ka naam leta hai aur <b>saturation</b> ko alag se highlight karta hai — kyunki wahi aksar chhoot jaata hai aur wahi outage laata hai. "Alerts sirf symptoms par with runbooks" wali line dikhati hai ki tum on-call rahe ho.',
       choiceExplanations: ["Sabse achha jawab do frameworks ka naam leta hai aur <b>saturation</b> ko alag se highlight karta hai — kyunki wahi aksar chhoot jaata hai aur wahi outage laata hai. \"Alerts sirf symptoms par with runbooks\" wali line dikhati hai ki tum on-call rahe ho.","User outcomes may fail while machines appear healthy.","Telemetry instrumentation, contracts and actionable policy still needed.","High-volume noisy alerts obscure urgent user-impacting symptoms."] },
    ],
  },
  success: [
    'RED aur USE frameworks apply kar sakte ho',
    'Metrics, traces aur logs ka alag kaam bata sakte ho',
    'Liveness aur readiness alag design kar sakte ho',
    'Symptom-based alerts likh sakte ho',
  ],
  homework: `Apne alerts ki list nikalo. Har ek ke saamne likho: yeh symptom hai ya cause?
    Iska runbook hai? Pichhle 3 mahine mein kitni baar ise dekh ke kuch KIYA gaya?
    Jinke jawab "cause / nahi / kabhi nahi" hain — unhe hata do.`,
  cards: [
    { front: 'RED aur USE?', back: '<b>RED</b> (services): Rate, Errors, Duration. <b>USE</b> (resources): Utilization, <b>Saturation</b> 🔥, Errors. Saturation aksar dashboards par hota hi nahi — aur outage wahi se aata hai.' },
    { front: 'Metrics vs Traces vs Logs?', back: '<b>Metrics</b> = "kya kuch galat hai?" · <b>Traces</b> = "waqt KAHAN gaya?" · <b>Logs</b> = "us ek request mein KYA hua?" — teenon ko <code>trace_id</code> se jodo.' },
    { front: 'Liveness vs Readiness?', back: '<b>Liveness</b> = "process zinda hai?" → fail = restart. <b>Readiness</b> = "traffic le sakta hoon?" → fail = LB se hatao. Ek endpoint banana = <b>healthy pods restart hote rahenge</b>.' },
    { front: 'Alert kis par?', back: '<b>Symptoms</b> par (error rate, p99, oldest message age), <b>causes</b> par nahi (CPU, memory). Har alert ka runbook ho. Jis par koi kuch nahi karta, use <b>hata do</b>.' },
    { front: 'Burn-rate alert?', back: '"Error budget 10x speed se jal raha hai" — asar ko <b>time se jodta</b> hai. Chhota spike page nahi karta; lamba slow burn karta hai.' },
  ],
},

/* ===================================================================== */
{
  id: 'slo',
  icon: '📉',
  title: 'SLO & Error Budget — "Kitna Toot Sakta Hai" ka Number',
  badge: 'Budget Banker',
  objectives: [
    'SLI → SLO → SLA ka farak',
    'Nines ka asli matlab (aur unki keemat)',
    'Error budget — "product vs reliability" ko number banana',
    'SLO kis cheez par set karo',
  ],
  lesson: [
    `<h3>📖 Nines ka asli matlab</h3>
     <table>
       <tr><th>Availability</th><th>Downtime/mahina</th><th>Reality</th></tr>
       <tr><td>99%</td><td>432 min (7 ghante)</td><td>zyadatar internal tools</td></tr>
       <tr><td>99.9%</td><td>43 min</td><td>achhi SaaS app</td></tr>
       <tr><td>99.99%</td><td>4.3 min</td><td>bahut mehenga</td></tr>
       <tr><td>99.999%</td><td><b>26 second</b></td><td>lagbhag koi nahi</td></tr>
     </table>
     <p>Har extra 9 ki keemat lagbhag <b>10x</b> hai — multi-region, automated
     failover, canary deploys, 24×7 on-call. "100% uptime" ek target nahi,
     ek galatfehmi hai.</p>
     <h3>📐 SLI → SLO → SLA</h3>
     <pre>SLI  jo tum NAAPTE ho
     "successful requests ÷ total requests"

SLO  tumhara apna target
     "99.9% over 30 days"

SLA  customer se contract + PAISA
     "99.5% ya paise wapas"   ← SLO se hamesha DHEELA</pre>
     <p>SLA ko SLO se dheela rakhna zaroori hai: tumhara internal alarm
     customer ke refund se <b>pehle</b> bajna chahiye.</p>`,
    `<h3>🔬 Error budget — asli kaam yeh hai</h3>
     <pre>SLO 99.9% = mahine mein 43 minute ka budget

Budget bacha hai?   → deploy karo, risk lo, tez chalo 🚀
Budget khatam?      → feature freeze, sirf reliability kaam</pre>
     <p>Yahi error budget ki asli taakat hai: woh <b>"product vs
     reliability" wali anant behes ko ek number mein badal deta hai</b>.</p>
     <p>Ab yeh behes nahi hoti:</p>
     <pre>Product: "yeh feature ship karna hai"
SRE:     "system stable nahi hai"
         (dono apni feeling se lad rahe hain)</pre>
     <p>Ab yeh hota hai:</p>
     <pre>"Budget mein 38 minute bache hain — ship karo."
"Budget khatam ho gaya — is hafte reliability."</pre>
     <h3>🎯 SLO kis par set karo</h3>
     <p>Uspar jo <b>user ko dard</b> deta hai — internal metric par nahi:</p>
     <pre>✅ "checkout requests jo 500ms mein safal hui"
✅ "search results jo 1s mein aaye"
✅ "notifications jo 30s mein deliver hui"

❌ "CPU utilization"     — user ko farak nahi padta
❌ "server uptime"       — server up ho par requests fail ho rahi hon?</pre>
     <p class="tip">🎯 Aur SLO <b>100% nahi</b> hona chahiye. 100% ka matlab
     hai zero risk, zero deploys, zero progress. Budget ka <b>istemal</b>
     karna chahiye — jo team apna poora budget bacha ke rakhti hai, woh
     bahut dheere chal rahi hai.</p>`,
  ],
  stages: [
    {
      type: 'fill',
      title: 'Error budget nikalo',
      instructions: 'Ek 30-din ke mahine ka hisaab poora karo.',
      template: `SLO           = 99.9% availability
Window        = 30 din = {0} minutes
Error budget  = 0.1% × 43,200 = {1} minutes

Ek incident 20 minute chala:
  budget use hua  = 20 min
  budget bacha    = {2} minutes

Agar SLO 99.99% hota:
  poora budget    = {3} minutes  (ek hi incident se zyada!)`,
      tokens: ['43,200', '43.2', '23.2', '4.32', '30', '1,440', '99.9'],
      blanks: [
        { answer: '43,200', explain: '30 × 24 × 60 = 43,200 minutes. Yeh base number hai jisse sab kuch nikalta hai.' },
        { answer: '43.2', explain: '0.1% × 43,200 = 43.2 minutes. Yeh "teen nines" ka poora mahina bhar ka budget hai — ek lambi lunch se kam.' },
        { answer: '23.2', explain: '43.2 − 20 = 23.2 minutes bache. Ek 20-minute incident ne aadhe se zyada budget kha liya.' },
        { answer: '4.32', explain: '0.01% × 43,200 = 4.32 minutes. Woh 20-minute incident poore mahine ka budget <b>4 guna</b> paar kar jaata. Isiliye har extra 9 ki keemat 10x hai.' },
      ],
    },
    {
      type: 'bins',
      title: 'Achha SLO ya bura?',
      instructions: 'Har SLO ko sahi bin mein daalo.',
      bins: [
        { id: 'good', label: '✅ Achha SLO' },
        { id: 'bad', label: '❌ Bura SLO' },
      ],
      items: [
        { text: '"99.9% checkout requests 500ms mein safal"', bin: 'good', explain: 'User-facing, measurable, aur latency + success dono cover karta hai. Yeh ek achhe SLO ka model hai.' },
        { text: '"CPU utilization 70% se kam"', bin: 'bad', explain: 'Yeh ek internal metric hai — user ko iski koi parwah nahi. CPU 90% ho par sab requests tez ho rahi hon toh sab theek hai.' },
        { text: '"100% uptime"', bin: 'bad', explain: 'Namumkin, aur budget zero — matlab koi deploy, koi risk, koi progress nahi. SLO ka poora point hi khatam.' },
        { text: '"99.95% notifications 30 second mein deliver"', bin: 'good', explain: 'User-visible outcome, saaf time bound. Async systems ke liye "deliver hua ya nahi" se behtar hai.' },
        { text: '"Server uptime 99.9%"', bin: 'bad', explain: 'Server up ho sakta hai aur saari requests fail ho sakti hain (pool exhaustion yaad hai?). Requests ko naapo, process ko nahi.' },
        { text: '"99% search results 1 second mein"', bin: 'good', explain: 'Search ke liye 99% theek hai — yeh checkout jitna critical nahi. Alag features ke alag SLO bilkul sahi hai.' },
      ],
    },
    {
      type: 'hotspot',
      title: 'SLO ke hisse',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'slo',
      questions: [
        { q: 'Customer ke saath contract kaunsa hai?', target: 'sla', explain: 'SLA — usme paisa juda hota hai. Use hamesha SLO se DHEELA rakho, taaki tumhara internal alarm refund se pehle baje.' },
        { q: '"Product vs reliability" ki behes ko number kaun banata hai?', target: 'budget', explain: 'Error budget. Budget bacha hai → ship karo. Khatam → reliability kaam. Feelings ki jagah number.' },
        { q: 'Jo tum naapte ho use kya kehte hain?', target: 'sli', explain: 'SLI — Service Level Indicator. Jaise "successful requests ÷ total". SLO uspar rakha gaya target hai.' },
      ],
    },
    {
      type: 'quiz',
      title: 'SLO ki samajh',
      questions: [
        {
          q: 'Error budget ka asli maqsad kya hai?',
          choices: ["Reliability-risk and change pace agree karo","Budget use se users ko blame karo","Budget means SLA penalties only count","Budget fixed ho toh business irrelevant"],
          answer: 0,
          explain: 'Yeh ek <b>organizational</b> tool hai, technical nahi. Uske bina yeh behes feelings par hoti hai ("mujhe lagta hai system stable nahi hai") aur woh kabhi khatam nahi hoti. Budget usse ek objective faisle mein badal deta hai.',
         choiceExplanations: ["Yeh ek <b>organizational</b> tool hai, technical nahi. Uske bina yeh behes feelings par hoti hai (\"mujhe lagta hai system stable nahi hai\") aur woh kabhi khatam nahi hoti. Budget usse ek objective faisle mein badal deta hai.","Budget policy is service/team decision support, not customer blame.","Internal reliability decision-making can exist without financial SLA.","Business risk and user expectations guide SLO and budget policy."] },
        {
          q: "100%internalSLO ka practical tradeoff?",
          choices: ["Zero budget tradeoff usually impractical","100% target means code deploy forbidden","100% target makes failures impossible","Customers never need high reliability"],
          answer: 0,
          explain: "100%SLO zero error budget define karta hai, usually cost/velocity tradeoffs impractical banata hai. Target deploys ko physically prohibit nahi karta, nor failures impossible banata. User/business needs aur measured failure model se realistic internal target choose karo.",
         choiceExplanations: ["100%SLO zero error budget define karta hai, usually cost/velocity tradeoffs impractical banata hai. Target deploys ko physically prohibit nahi karta, nor failures impossible banata. User/business needs aur measured failure model se realistic internal target choose karo.","A target is not a mathematical ban; zero tolerable error complicates tradeoffs.","Targets do not change networks, dependencies or operational failure probabilities.","Some workflows need very high reliability; requirements and cost matter."] },
        {
          q: "InternalSLO contractualSLA se tighter rakhne ka common reason?",
          choices: ["Tighter internal target can give margin","Every SLA is automatically below SLO","SLA and SLO always use same SLI","Refund threshold fixes incident severity"],
          answer: 0,
          explain: "Common design mein internal SLO contractual SLA se tighter hota hai taaki contractual breach se pehle corrective room ho. Yeh universal requirement nahi; windows, SLIs, exclusions aur commercial commitments explicitly compare karo.",
         choiceExplanations: ["Common design mein internal SLO contractual SLA se tighter hota hai taaki contractual breach se pehle corrective room ho. Yeh universal requirement nahi; windows, SLIs, exclusions aur commercial commitments explicitly compare karo.","SLO/SLA relationship is explicit policy; universal ordering not guaranteed.","Contracts may define different windows, exclusions and indicators.","User impact and operational risk matter before any refund threshold."] },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — SLO',
    instructions: 'Senior roles mein yeh sawaal lagbhag pakka hai. 🎤',
    questions: [
      {
        q: '"Naye service ke liye SLO kaise set karoge?"',
        choices: ["User outcomes and business tolerance se set","99.99% is correct for every endpoint","Current poor latency automatically target","SLO without measurement publish kar do"],
        answer: 0,
        explain: 'Do cheezein dikhti hain: SLO <b>user outcomes</b> par hona chahiye (CPU par nahi), aur <b>har feature ka alag</b> — search ke liye 99% theek hai, payments ke liye nahi. Har extra 9 ki keemat 10x hai, isliye use sirf wahan kharch karo jahan matter karta hai.',
       choiceExplanations: ["Do cheezein dikhti hain: SLO <b>user outcomes</b> par hona chahiye (CPU par nahi), aur <b>har feature ka alag</b> — search ke liye 99% theek hai, payments ke liye nahi. Har extra 9 ki keemat 10x hai, isliye use sirf wahan kharch karo jahan matter karta hai.","Different user journeys have different value, cost and reliability needs.","Baseline informs feasibility; business needs decide acceptable outcome.","SLI measurement/window/error budget policy must be defined and validated."] },
      {
        q: '"Error budget khatam ho gaya. Ab kya?"',
        choices: ["Agreed budget policy plus cause review","Missed budget hide by loosening target","Budget breach ignore; all features ship","One engineer ko blame karke close karo"],
        answer: 0,
        explain: "Pre-agreed error-budget policy follow karo:feature risk limit, reliability fixes, exceptions with explicit ownership aur incident learnings. Universal all-service freeze mandatory nahi; policy business/user risk se define hoti hai.",
       choiceExplanations: ["Pre-agreed error-budget policy follow karo:feature risk limit, reliability fixes, exceptions with explicit ownership aur incident learnings. Universal all-service freeze mandatory nahi; policy business/user risk se define hoti hai.","Retargeting needs justified reviewed user/business requirements, not hiding incidents.","Explicit policy should govern risk acceptance after breach.","Systemic causes and safeguards require learning beyond individual blame."] },
    ],
  },
  success: [
    'Nines aur unki keemat bata sakte ho',
    'SLI, SLO, SLA mein farak kar sakte ho',
    'Error budget se faisle le sakte ho',
    'User-facing SLO likh sakte ho',
  ],
  homework: `Apne sabse zaroori endpoint ke liye ek SLO likho — user outcome par, internal
    metric par nahi. Phir pichhle mahine ka data dekho: kya tum use meet karte?
    Aur kitna error budget bacha hota?`,
  cards: [
    { front: 'Nines ka matlab?', back: '99% = 432 min/mahina · 99.9% = <b>43 min</b> · 99.99% = 4.3 min · 99.999% = <b>26 second</b>. Har extra 9 ki keemat ~<b>10x</b>.' },
    { front: 'SLI vs SLO vs SLA?', back: '<b>SLI</b> = jo naapte ho · <b>SLO</b> = tumhara target · <b>SLA</b> = customer contract + paisa. SLA ko SLO se <b>dheela</b> rakho — alarm refund se pehle baje.' },
    { front: 'Error budget ka maqsad?', back: '"Product vs reliability" behes ko ek <b>number</b> mein badalna. Budget bacha → ship karo. Khatam → reliability kaam. Feelings ki jagah data.' },
    { front: 'SLO 100% kyun nahi?', back: 'Budget zero = koi deploy, koi risk, koi progress nahi. Budget <b>kharch karne</b> ke liye hai — poora budget bacha ke rakhne wali team bahut dheere chal rahi hai.' },
    { front: 'SLO kis par set karo?', back: '<b>User-facing outcomes</b> par: "checkout 500ms mein safal". CPU ya "server uptime" par nahi — server up ho sakta hai aur saari requests fail ho sakti hain.' },
  ],
},

/* ===================================================================== */
{
  id: 'boss-resil',
  icon: '👑',
  title: 'BOSS — 3 Baje Raat, Sab Kuch Ek Saath',
  badge: 'Breaker Bhairav',
  objectives: [
    'Poore track ko ek incident par lagao',
    'Sahi kram: rok-o → diagnose → theek karo → rok-o dobara',
    'Har guard ka apna alag kaam',
  ],
  lesson: [
    `<h3>👑 Pager 3:07 AM</h3>
     <pre>checkout error rate 60% · p99 9.9 s
CPU 12% · memory 40% · /health 200 OK
payment provider p99 = 8 s (DOWN nahi — DHEEMA)
SDK 3 retries, bina jitter
ek hi thread pool sab ke liye</pre>
     <p>Yahan ek nahi, <b>paanch</b> problems ek saath hain — aur woh ek
     doosre ko badha rahe hain. Har guard ka apna alag kaam hai:</p>
     <table>
       <tr><th>Guard</th><th>Kya baandhta hai</th></tr>
       <tr><td>Timeout</td><td>ek call ka <b>intezaar</b></td></tr>
       <tr><td>Jitter</td><td>retry storm ka <b>synchronization</b></td></tr>
       <tr><td>Breaker</td><td>failing dependency par <b>koshish</b></td></tr>
       <tr><td>Fallback</td><td>user ka <b>anubhav</b></td></tr>
       <tr><td>Bulkhead</td><td><b>blast radius</b></td></tr>
       <tr><td>Shed</td><td>overload mein <b>kitna kaam</b></td></tr>
     </table>`,
  ],
  stages: [
    {
      type: 'terminal',
      title: '🏁 Poora incident theek karo',
      goal: 'Payment provider dheema ho gaya hai aur checkout mar raha hai. Poore track ke guards lagao aur prove karo ki p99 wapas SLO ke andar aa gaya.',
      sys: SD.sys.orders(),
      tasks: T_BOSS_RESIL,
      success: SD.allTasks(T_BOSS_RESIL),
      successText: `Chhe guards, chhe alag khatre:
        <br><br><b>Timeout</b> — ek call ka intezaar baandha (aur SLO se kam rakha)
        <br><b>Jitter</b> — retry storm ka synchronization toda
        <br><b>Breaker</b> — failing dependency par koshish karna hi band kiya
        <br><b>Fallback</b> — user ko kuch toh diya
        <br><b>Bulkhead</b> — blast radius baandha
        <br><br>Ek line mein poora track: <b>har remote call ek din fail hogi. Sawaal yeh hai —
        tab tumhara system kya karega?</b>`,
      solution: [
        "sim inject latency ledger 8000",
        "sim add timeout ledger 150",
        "sim add retry ledger --max 2 --backoff exp --jitter full",
        "sim add breaker ledger --threshold 0.5 --window 20",
        "sim add fallback ledger 'last known status'",
        "sim add bulkhead ledger --max 20",
        "GET /api/v1/orders?page=1&limit=50",
        "GET /api/v1/orders?page=2&limit=50",
        "GET /api/v1/orders?page=3&limit=50",
        "GET /api/v1/orders?page=4&limit=50",
        "GET /api/v1/orders?page=5&limit=50",
      ],
      verify: s => { const m = SD.mission; return s.sys.deps.ledger?.timeoutMs === 150 && s.sys.deps.ledger.retry?.jitter === 'full' && !!s.sys.deps.ledger.breaker && !!s.sys.deps.ledger.fallback && s.sys.app.bulkheads?.ledger === 20 && m.current(s, 'http', r => r.status === 200 && r.p99 < 200); },
      hints: [
        "Pehle observation: Incident recreate karo — downstream dheema. System ka baseline samjho; seedha final setting lagane se debugging ka saboot miss hoga.",
        "Checklist ko kram se dekho. Aakhri proof: Prove karo — p99 wapas SLO ke andar. Fix ke baad live state aur nayi measurement dono chahiye; sirf command type karna kaafi nahi.",
        "Near-answer walkthrough; har command alag Enter se chalao:\nsim inject latency ledger 8000\nsim add timeout ledger 150\nsim add retry ledger --max 2 --backoff exp --jitter full\nsim add breaker ledger --threshold 0.5 --window 20\nsim add fallback ledger 'last known status'\nsim add bulkhead ledger --max 20\nGET /api/v1/orders?page=1&limit=50\nGET /api/v1/orders?page=2&limit=50\nGET /api/v1/orders?page=3&limit=50\nGET /api/v1/orders?page=4&limit=50\nGET /api/v1/orders?page=5&limit=50",
      ],
    },
    {
      type: 'incident',
      title: '🚨 3AM: poora incident',
      instructions: 'Sahi kram mein kadam uthao.',
      pager: `<b>#prod-critical</b> — 3:07 AM<br>
        <code>checkout</code> error rate <b>60%</b>, p99 <b>9.9 s</b>.<br>
        CPU 12% · memory 40% · /health 200 OK.<br>
        Payment provider ka status page: "degraded performance" (down nahi).<br>
        Traffic normal se <b>4x</b> dikh raha hai.`,
      start: 'first',
      nodes: {
        first: {
          text: 'Sabse pehle kya?',
          choices: [
            { t: "Bound failing calls;preserve useful capacity", good: true, next: 'traffic', explain: 'Sahi. 3 baje raat ko pehla kaam damage rokna hai, root cause baad mein. Timeout + breaker turant threads free karenge.' },
            { t: "Only email the provider team", good: false, explain: 'Karna chahiye — par woh abhi tumhare users ki madad nahi karega. Pehle apne system ko bachao.' },
            { t: "Only increase caller instances", good: false, explain: 'CPU 12% hai. Naye instances bhi usi dheemi dependency par latkenge — aur woh uspar aur load daalenge.' },
            { t: "Rollback without recent-change evidence", good: false, explain: 'Tumhara code nahi badla — provider dheema hua hai. Rollback se kuch nahi hoga.' },
          ],
        },
        traffic: {
          sitrep: '✅ Timeout 150ms + breaker laga. Error rate 60% se 15% par. Par traffic abhi bhi <b>4x</b> dikh raha hai.',
          text: '4x traffic kahan se aa raha hai? Marketing campaign toh nahi tha.',
          choices: [
            { t: "Compare attempts and unique requests", good: true, next: 'fix', explain: 'Bilkul. Traffic tab badha jab errors shuru hue — yeh retry amplification ka signature hai. Jitter aur retry budget chahiye.' },
            { t: "Declare attack without traffic evidence", good: false, explain: 'Timing dekho — traffic tab badha jab errors shuru hue, pehle nahi. Yeh self-inflicted hai.' },
            { t: "Declare user growth without intent counts", good: false, explain: '3 baje raat ko? Aur theek us waqt jab errors shuru hue? Yeh sanyog nahi hai.' },
          ],
        },
        fix: {
          sitrep: '✅ Jitter laga, retry max 2 kiya, aur ek retry budget (kul load ka 10%). Traffic normal. Error rate 2%.',
          text: 'Ab tak checkout kaam kar raha hai par payment abhi bhi dheema hai. Aage?',
          choices: [
            { t: "Explicit pending-payment recovery state", good: true, next: 'end', explain: 'Graceful degradation. Order kho nahi raha, user ko imaandaari se bataya ja raha hai, aur revenue path zinda hai.' },
            { t: "Deny all checkout despite safe pending flow", good: false, explain: 'Yeh haar maanna hai. Order queue mein le ke baad mein process kiya ja sakta hai — revenue kyun chhodna?' },
            { t: "Claim success before payment confirmation", good: false, explain: 'Kabhi nahi. Paise se judi cheez par jhooth bolna sabse bura fallback hai — aur woh ek compliance problem bhi hai.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. Checkout chal raha hai, orders queue mein safe hain.',
          summary: `<b>Kram yaad rakho:</b> bleeding roko → diagnose karo → theek karo → dobara na ho iska intezaam.
            <br><br><b>Chhe guards, chhe alag kaam:</b>
            <br>• <b>Timeout</b> — ek call ka intezaar baandhta hai
            <br>• <b>Jitter</b> — retry storm ka synchronization todta hai
            <br>• <b>Breaker</b> — failing dependency par koshish karna band karta hai
            <br>• <b>Fallback</b> — user ka anubhav bachata hai
            <br>• <b>Bulkhead</b> — blast radius baandhta hai
            <br>• <b>Shed</b> — overload mein kitna kaam lena hai woh tay karta hai
            <br><br><b>Aur ek line mein poora track:</b> har remote call ek din fail hogi.
            Sawaal yeh hai — <b>tab tumhara system kya karega?</b>`,
        },
      },
    },
    {
      type: 'hotspot',
      title: 'Guards ka naksha',
      instructions: 'Diagram mein sahi jagah click karo.',
      visual: 'boss-resil',
      questions: [
        { q: 'Kaunsa guard BLAST RADIUS baandhta hai?', target: 'bulkhead', explain: 'Bulkhead. Timeout ek call ka intezaar baandhta hai; bulkhead us dependency ka HISSA baandhta hai taaki woh baaki service ke threads na khaaye.' },
        { q: 'Retry storm ka SYNCHRONIZATION kaun todta hai?', target: 'jitter', explain: 'Jitter. Backoff ne storm ko kam nahi kiya tha — sirf synchronize kiya tha. Jitter clients ko alag-alag time par bhejta hai.' },
        { q: 'Failing dependency par KOSHISH karna kaun band karta hai?', target: 'breaker', explain: 'Circuit breaker. Jab failures transient nahi rahe, retry karna bekaar hai — breaker calls rok ke tumhare threads bachata hai.' },
        { q: 'User ka ANUBHAV kaun bachata hai?', target: 'fallback', explain: 'Fallback. Breaker tumhe bachata hai (threads), fallback user ko (kuch toh milta hai). Bina fallback ke breaker sirf tez failure hai.' },
      ],
    },
  ],
  interview: {
    title: '🎤 Final Round — Resilience',
    instructions: 'Aakhri round.',
    questions: [
      {
        q: '"Ek downstream dependency dheemi ho gayi. Poora playbook batao."',
        choices: ["Budgeted waits and isolated fallback","Only retries fix all downstream failures","Only breaker guarantees useful response","Only provider team owns caller SLO"],
        answer: 0,
        explain: 'Sabse achha jawab har guard ka <b>alag kaam</b> batata hai, sirf naam nahi ginta. Yeh dikhata hai ki tum jaante ho ki sirf breaker kaafi nahi (bina fallback ke woh tez failure hai) aur sirf retry ulta padta hai.',
       choiceExplanations: ["Sabse achha jawab har guard ka <b>alag kaam</b> batata hai, sirf naam nahi ginta. Yeh dikhata hai ki tum jaante ho ki sirf breaker kaafi nahi (bina fallback ke woh tez failure hai) aur sirf retry ulta padta hai.","Unsafe or overloaded dependency retries amplify harm.","Breaker fast-fails; safe fallback needs separate design.","Caller controls timeout, admission, isolation and user-facing contract."] },
      {
        q: '"Incident ke waqt sabse pehla kaam kya hai?"',
        choices: ["Assess harm; coordinate and mitigate safely","Find complete root cause before any action","Restart all services without impact check","Delete all queues to make graph green"],
        answer: 0,
        explain: 'Root cause zaroori hai — par <b>baad mein</b>. 3 baje raat ko har minute users ko dard de raha hai. Mitigate pehle, understand baad mein. (Aur mitigation ke doraan jo dekha, woh aksar root cause ka sabse bada clue hota hai.)',
       choiceExplanations: ["Root cause zaroori hai — par <b>baad mein</b>. 3 baje raat ko har minute users ko dard de raha hai. Mitigate pehle, understand baad mein. (Aur mitigation ke doraan jo dekha, woh aksar root cause ka sabse bada clue hota hai.)","Evidence collection helps, but urgent safe mitigation can precede full cause.","Uncoordinated restarts may erase evidence and worsen availability.","Deleting pending work hides impact and creates data loss."] },
    ],
  },
  success: [
    'Ek poora incident systematically handle kar sakte ho',
    'Har guard ka alag kaam bata sakte ho',
    'Retry amplification pehchaan sakte ho',
    'Mitigate-pehle-samjho-baad-mein ka kram jaante ho',
  ],
  homework: `Apni service ki ek dependency chuno aur uske liye poora playbook likho:
    timeout kitna? retry policy kya? breaker threshold? fallback kya hai? bulkhead size?
    Phir team ke saath ek game day karo — us dependency ko staging mein dheema karke dekho.`,
  cards: [
    { front: 'Chhe guards, chhe kaam?', back: '<b>Timeout</b> intezaar · <b>Jitter</b> synchronization · <b>Breaker</b> koshish · <b>Fallback</b> anubhav · <b>Bulkhead</b> blast radius · <b>Shed</b> kitna kaam.' },
    { front: 'Incident ka pehla kadam?', back: '<b>Bleeding roko</b> — mitigate pehle, root cause baad mein. Har minute users ko dard de raha hai. (Aur mitigation ke doraan jo dekha woh aksar root cause ka clue hota hai.)' },
    { front: 'Traffic 4x, errors ke SAATH badha — kya hai?', back: '<b>Retry amplification.</b> Signature: traffic tab badha jab errors shuru hue, pehle nahi. Ilaaj: jitter, kam attempts, retry budget.' },
    { front: 'Resilience track ek line mein?', back: 'Har remote call <b>ek din fail hogi</b>. Sawaal yeh hai — <b>tab tumhara system kya karega?</b>' },
  ],
},
]);

})();
