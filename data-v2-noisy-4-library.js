/* =====================================================================
   🛡️ Playlist · 1 Resilience — Noisy Neighbour · level 4: LIBRARY
   Asli limiter (express-rate-limit) — aur woh ek setting jisse limiter khud "ek line" ban jaata hai.
   Phir wahi teen tareeke API gateway aur Kubernetes mein.
   Library wale steps docker-labs/39-noisy-neighbor ke asli run se hain: `node tools/express-rate-limit.js`
   (express-rate-limit 8.7.1, Express 5.3.0). Code ka tukda asli file se hai (validate.js milata hai).
   API gateway aur Kubernetes wale cards unki official documentation se hain — is lab mein chalaye nahi gaye.
   ===================================================================== */
(function () {

const NODES = [
  { id: 'a', icon: '🏢', label: 'Annapurna (A)', x: 165, y: 85 },
  { id: 'b', icon: '🍲', label: 'Bholu Dhaba (B)', x: 165, y: 245 },
  { id: 'lim', icon: '🚦', label: 'limiter', x: 690, y: 165 },
];
const EDGES = [{ from: 'a', to: 'lim' }, { from: 'b', to: 'lim' }];
const VIZ = { w: 890, h: 330 };
const four = n => Array.from({ length: 4 }, (_, i) => (i < n ? 'busy' : 'free'));

VISUALS['nn-lib'] = {
  t: 'Limiter ki ginti IP ki thi. A aur B ka IP ek hi — toh A ne B ka hissa bhi kha liya',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { a: { tone: 'busy', badge: '12 bheji · 3 andar' }, b: { tone: 'bad', badge: '2 bheji · doosri ko 429' }, lim: { tone: 'slow', badge: 'ginti: IP 127.0.0.1 → 4/4' } },
    flows: [{ from: 'lim', to: 'b', label: '429', tone: 'bad', back: true }, { from: 'a', to: 'lim', label: '12', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'nn-lib',
  icon: '📚',
  group: '🔊 Noisy Neighbour',
  title: 'Noisy Neighbour 4 · Library — asli limiter, aur ek galat ginti',
  badge: 'Ginti Guru',
  objectives: [
    'Asli limiter library mein hadd lagane ke liye kaunsi teen cheezein batani padti hain?',
    'Hadd lagne ke baad bhi Bholu Dhaba ko 429 kyun mila — jabki Bholu Dhaba ne sirf 2 requests bheji thi?',
    'Library ka hisaab hamari token wali baalti se kahan alag chala?',
    'API gateway aur Kubernetes mein hadd, baari aur alag khidki kis naam se milte hain?',
  ],
  lesson: [
    `<h3>📦 Teen line ka setup, aur agle din ek phone</h3>
     <p>partner-api ki team ne hadd khud nahi likhi. npm se ek mashhoor library li: <code>express-rate-limit</code>. Setup teen line ka tha: "ek second mein 4 requests".</p>
     <p>Agle din Bholu Dhaba ka phone aaya: <b>"Ab toh pehle se bhi bura hai. Maine do order accept kiye, aur doosre par hi mana kar diya."</b></p>
     <pre>lab, asli library:
0.0 s  B#1 → 200
0.2 s  A ke 12 requests → 3 × 200, 9 × 429
0.4 s  B#2 → 429 · Retry-After: 1      ← B ne sirf 2 requests bheji thi</pre>
     <p>Hadd lag gayi thi. Par limiter <b>galat cheez gin raha tha</b>.</p>
     <p class="tip">👉 Agle screen par wahi teen line ka setup, aur wahi run. Dhoondo ki limiter kiski ginti kar raha hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. asli library ---------------- */
    {
      type: 'dryrun',
      title: '📦 express-rate-limit — ginti kiski?',
      goal: 'Code lab ki asli file se hai, aur har nateeja us file ke asli run se. Limiter se teen sawaal poochhte raho: <b>kitne</b>, <b>kitni der mein</b>, aur <b>kiski ginti</b>.',
      code: {
        title: 'docker-labs/39-noisy-neighbor/tools/express-rate-limit.js',
        file: 'docker-labs/39-noisy-neighbor/tools/express-rate-limit.js',
        from: 14,
        text: "function server(limiterOptions) {\n  return new Promise(ready => {\n    const app = express();\n    app.use(rateLimit(limiterOptions));                    // har request pehle limiter se guzarti hai\n    app.get('/work', (req, res) => res.json({ ok: true }));\n    const s = app.listen(0, () => ready({ url: `http://127.0.0.1:${s.address().port}/work`, close: () => new Promise(r => s.close(r)) }));\n  });\n}\n\n/* do limiter: hadd wahi (ek second mein 4), bas \"ginti kiski\" alag */\nconst BY_IP = { windowMs: 1000, limit: 4 };                // ginti kiski, yeh likha hi nahi → library ka default: IP ki\nconst BY_TENANT = {\n  windowMs: 1000, limit: 4,\n  keyGenerator: req => req.get('x-api-key'),               // ginti: har tenant ki apni\n};",
      },
      vars: [
        { id: 'key', label: 'Ginti kiski' },
        { id: 'count', label: 'Is second ki ginti (hadd 4)' },
        { id: 'b', label: 'Bholu Dhaba (B)' },
        { id: 'a', label: 'Annapurna (A)' },
      ],
      steps: [
        {
          clock: 'setup',
          line: [17, 24],
          say: `Line 17: <code>app.use(rateLimit(…))</code> — har request pehle limiter se guzarti hai.<br><br>
            Line 24, limiter ki settings: <code>windowMs: 1000</code> (kitni der mein: 1 second) aur <code>limit: 4</code> (kitne: 4).<br><br>
            Teesra sawaal — <b>kiski ginti</b> — line 24 mein likha hi nahi hai. Tab library apna default lagati hai: <b>request jis IP se aayi</b>.`,
          vars: { key: 'IP (library ka default)', count: four(0), b: '—', a: '—' },
        },
        {
          clock: '0.0 s',
          line: 24,
          say: 'Bholu Dhaba ki pehli request, <b>B#1</b> → <code>200</code>. Limiter batata hai: is second mein <b>3 bache</b>.<br><br>Lab mein A aur B dono isi machine se bhej rahe hain, isliye limiter ko dono ka IP ek hi dikhta hai: 127.0.0.1.',
          vars: { count: four(1), b: 'B#1 → 200 · bache 3' },
          ask: {
            q: '0.2 s par Annapurna 12 requests bhejega. Limiter IP ki ginti kar raha hai, aur A aur B ka IP ek hi hai. Kya hoga?',
            choices: [
              'A ki 3 andar jaayengi (jo 3 bache the), 9 ko 429. Aur is second mein Bholu Dhaba ke liye kuch nahi bachega',
              'A ki 4 andar jaayengi — A ki apni ginti hai',
              'A ki baarah ki baarah ko 429, kyunki B pehle aaya tha',
              'A ki baarah ki baarah andar — IP par hadd lagti hi nahi',
            ],
            answer: 0,
            hint: 'Limiter ke liye "A" aur "B" hain hi nahi. Limiter ko sirf ek naam dikhta hai: 127.0.0.1. Us naam ke kitne bache hain?',
            explain: 'Lab ka output: <code>A ke 12 requests → 3 × 200, 9 × 429</code>. Limiter ne A aur B ko <b>ek hi grahak</b> maan liya.',
          },
        },
        {
          clock: '0.2–0.4 s',
          line: 24,
          say: '0.2 s: Annapurna ki 12 requests → <b>3 × 200, 9 × 429</b>. Ginti 4/4.<br><br>0.4 s: Bholu Dhaba ki doosri request, <b>B#2</b> → <code>429</code>, saath mein <code>Retry-After: 1</code>.<br><br>Bholu Dhaba ne ek second mein 2 requests bheji thi. Hadd 4 ki thi.',
          vars: { count: four(4), b: 'B#1 → 200 · <b>B#2 → 429</b>', a: '12 mein se 3 andar · 9 ko 429' },
        },
        {
          clock: 'yeh hua kyun?',
          line: 24,
          say: `Yeh level 1 wali "sab ek hi line mein" samasya hi hai — is baar <b>limiter ke andar</b>. Ek IP = ek ginti. Us IP ke peeche jitne log hain, sab ek doosre ka hissa khaate hain.<br><br>
            Asli duniya mein ek IP ke peeche bahut log hote hain:
            <ul>
              <li>ek office ya college ka Wi-Fi;</li>
              <li>mobile company ka network;</li>
              <li>aur sabse aam: tumhara apna <b>load balancer</b>. Load balancer ke peeche ki har request server ko load balancer ke IP se aati dikhti hai.</li>
            </ul>
            Library ke apne code mein is galti ki chetaavni likhi hai: library aisi request par ek error chhaapti hai jisme <code>X-Forwarded-For</code> header ho par Express ki <code>trust proxy</code> setting band ho. (Yeh chetaavni library ke source se hai; lab mein ise chalaya nahi gaya.)`,
          vars: { key: 'IP — A aur B dono ka ek hi' },
        },
        {
          clock: 'ek line jodo',
          line: [25, 26, 27],
          say: `Line 25–28, doosri setting. Wahi 1 second, wahi 4 — bas ek line zyada:<br><br>
            Line 27: <code>keyGenerator: req =&gt; req.get('x-api-key')</code>. Ab ginti us <b>tenant</b> ki hai jiski chaabi request ke saath aayi.<br><br>
            Wahi run dobara:
            <ul>
              <li>0.0 s: B#1 → 200.</li>
              <li>0.2 s: A ki 12 requests → <b>4 × 200, 8 × 429</b>. A ki apni ginti.</li>
              <li>0.4 s: B#2 → <b>200</b>. Bholu Dhaba ke abhi 2 aur bache hain.</li>
            </ul>`,
          vars: { key: '<b>x-api-key</b> — har tenant ki apni', count: 'A: 4/4 · B: 2/4', b: 'B#1 → 200 · <b>B#2 → 200</b>', a: '12 mein se 4 andar · 8 ko 429' },
        },
        {
          clock: 'kuch na likho toh?',
          line: 17,
          say: `Lab mein teesra run: <code>rateLimit()</code> — koi setting nahi. 6 requests bheji (A aur B ki mili-juli):
            <pre>5 × 200, 1 × 429 · chhathi par: 429 · Retry-After: 60</pre>
            Library ke default: <b>1 minute mein 5 requests, ek IP se</b>. Yaani bina soche laga do toh ek poora office ek minute mein paanch requests ke baad band.`,
          vars: { key: 'default: IP', count: 'default: 1 minute mein 5', b: '—', a: '—' },
        },
        {
          clock: 'library ka hisaab',
          line: 24,
          say: 'Ek aur farak. Lab ne wahi 8 requests do hisaabon se guzaari — library se, aur hamari token wali baalti se. Dono mein hadd "ek second mein 4". Requests: 0.0 s par 1, 0.9 s par 3, 1.1 s par 4.',
          vars: { key: 'x-api-key', count: '—', b: '—', a: '8 requests: 1 + 3 + 4' },
          ask: {
            q: 'Library har tenant ki ginti ek second tak rakhti hai, phir zero kar deti hai. Pehli request 0.0 s par aayi thi. 0.9 s par 3 aur 1.1 s par 4 requests mein se library kitni andar aane degi?',
            choices: [
              'Saari: 3 + 4. 0.9 s par purane second ke 3 bache the; 1.0 s par ginti zero hui, toh 1.1 s par poore 4 naye',
              '3 + 1 — ek second mein 4 se zyada kabhi nahi',
              '0 + 4 — 0.9 s wali mana hongi',
              '3 + 0 — 1.1 s wali mana hongi',
            ],
            answer: 0,
            hint: 'Pehle second ki ginti: 0.0 s par 1, 0.9 s par 3 = 4. Doosra second kab shuru hota hai?',
            explain: 'Lab: library ne <b>1 + 3 + 4 = 8</b> andar aane di — 0.9 s se 1.1 s ke beech 0.2 second mein 7. Hadd "ek second mein 4" thi.',
          },
        },
        {
          clock: 'do hisaab',
          line: 24,
          say: `<div class="dr-scroll"><table>
              <tr><th>Hisaab</th><th>0.0 s par 1</th><th>0.9 s par 3</th><th>1.1 s par 4</th><th>Kul andar</th></tr>
              <tr><td>Library: har second nayi ginti</td><td>1</td><td>3</td><td><b>4</b></td><td><b>8</b></td></tr>
              <tr><td>Token wali baalti: tokens dheere tapakte hain</td><td>1</td><td>3</td><td><b>1</b></td><td><b>5</b></td></tr>
            </table></div>
            Library ka tareeka seedha hai: ginti, aur ek ghadi. Par do second ke <b>kinare</b> par ek tenant hadd se lagbhag dugna bhej sakta hai.<br><br>
            Token wali baalti mein kinara hota hi nahi: 1.1 s par baalti mein sirf 1.8 tokens the.<br><br>
            Dono galat nahi hain. Bas pata hona chahiye ki tumhara limiter kaunsa hisaab karta hai.`,
          vars: { count: 'library: 8 andar · baalti: 5 andar' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> koi bhi limiter teen sawaal ka jawab hai: <b>kitne</b>, <b>kitni der mein</b>, aur <b>kiski ginti</b>. Teesra sawaal sabse zaroori hai aur sabse zyada chhoot-ta hai.<br>Ginti galat cheez ki hui (IP ki, jab IP saajha hai) toh limiter khud noisy neighbour bana deta hai.',
    },

    /* ---------------- 2. wahi teen tareeke, doosri jagah ---------------- */
    {
      type: 'cards',
      title: '🗺️ Wahi teen tareeke — API gateway aur Kubernetes mein',
      goal: 'Paanch chhote cards. Yeh cards AWS API Gateway aur Kubernetes ki <b>official documentation</b> se hain; is lab mein yeh dono chalaye nahi gaye. Settings ke naam wahin se hain.',
      steps: [
        {
          title: '1. API gateway: har grahak ki baalti',
          say: `API gateway woh darwaza hai jisse hokar bahar ki requests tumhari services tak aati hain. Hadd lagane ki yeh sabse aam jagah hai.<br><br>
            AWS API Gateway ki documentation ke mutabiq API Gateway requests ko <b>token bucket</b> se rokta hai — wahi baalti:
            <ul>
              <li><b>rate</b>: har second kitne tokens baalti mein aate hain.</li>
              <li><b>burst</b>: baalti kitni badi hai.</li>
              <li>Har grahak ki apni hadd: grahak ko ek <b>API key</b> do, aur us key ko ek "usage plan" se jodo.</li>
              <li>Hadd paar → <code>429 Too Many Requests</code>.</li>
            </ul>
            Wahi documentation yeh bhi kehti hai ki yeh hadd "best-effort" hai: ise nishaana samjho, pakki deewar nahi.`,
        },
        {
          title: '2. Kubernetes: CPU request = baari ka wazan',
          say: `Kubernetes mein kai services (pods) ek hi machine ka CPU baant-ti hain. Yeh bhi saajha system hai.<br><br>
            Har container ke liye do number likhe ja sakte hain: <b>request</b> aur <b>limit</b>. Documentation CPU request ke baare mein kehti hai:
            <pre>"The CPU request typically defines a weighting."</pre>
            Yaani jab CPU par kheencha-taani ho, toh bade request wale container ko zyada CPU milta hai. Aur jab machine par jagah ho, toh container apne request se <b>zyada</b> bhi le sakta hai.<br><br>
            Yeh baari-baari hi hai — wazan ke saath. Khaali jagah bekaar nahi jaati.`,
        },
        {
          title: '3. Kubernetes: CPU limit = pakki hadd',
          say: `Documentation CPU limit ke baare mein kehti hai:
            <pre>"The CPU limit defines a hard ceiling on how much CPU time the container can use."</pre>
            Container limit tak pahunchta hai toh kernel us container ko rok deta hai (throttle), agle time-slice tak.`,
          ask: {
            q: 'Ek container ka CPU limit 1 core hai. Machine par 8 core khaali pade hain. Container ko achanak 2 core jitna kaam aa gaya. Kya hoga?',
            choices: [
              'Container 1 core par hi ruka rahega — limit pakki chhat hai, chaahe machine khaali ho',
              'Container 2 core le lega, kyunki machine khaali hai',
              'Container band kar diya jaayega',
              'Kubernetes use doosri machine par bhej dega',
            ],
            answer: 0,
            hint: 'Yeh level 1 ki hadd jaisa hai. Us hadd ko khaali khidkiyan dikhti thi?',
            explain: 'CPU limit wahi "har tenant ki hadd" hai: padosi bache rehte hain, par khaali jagah bekaar jaati hai. (Memory ka limit alag chalta hai: memory limit paar karne par container maara ja sakta hai — documentation ise OOM kill kehti hai.)',
          },
        },
        {
          title: '4. Kubernetes: QoS class kya tay karti hai?',
          say: `Kubernetes har pod ko ek <b>QoS class</b> deta hai. Yeh class tum nahi likhte; Kubernetes ise request aur limit dekh ke khud nikaalta hai:
            <div class="dr-scroll"><table>
              <tr><th>Class</th><th>Kab milti hai</th></tr>
              <tr><td><b>Guaranteed</b></td><td>Har container ka CPU aur memory request = limit</td></tr>
              <tr><td><b>Burstable</b></td><td>Kam se kam ek request ya limit hai, par Guaranteed nahi</td></tr>
              <tr><td><b>BestEffort</b></td><td>Koi request ya limit nahi</td></tr>
            </table></div>
            Documentation ke mutabiq QoS class ka kaam hai tay karna ki machine par tangi ho toh <b>pehle kise nikala jaaye</b>: pehle BestEffort, phir Burstable, sabse aakhir mein Guaranteed.<br><br>
            ⚠️ <b>Ek aam galatfehmi:</b> "QoS class laga do, noisy neighbour khatam." QoS class khud na hadd hai, na baari. Hadd aur baari <b>limit</b> aur <b>request</b> se aati hain; QoS class sirf batati hai ki tangi mein kaun pehle jaayega.`,
        },
        {
          title: '5. Ek nazar mein',
          say: `<div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Lab mein</th><th>API gateway</th><th>Kubernetes (CPU)</th></tr>
              <tr><td>Har tenant ki hadd</td><td><code>TokenBucket</code></td><td>usage plan: rate + burst, har API key ki</td><td>limit</td></tr>
              <tr><td>Baari-baari</td><td><code>FairQueue</code></td><td>—</td><td>request (wazan)</td></tr>
              <tr><td>Alag khidki</td><td>slow motion ka "pool"</td><td>bade grahak ka alag gateway / alag service</td><td>us kaam ke liye alag machines</td></tr>
            </table></div>
            Naam har jagah alag hain. Sawaal wahi teen: <b>kitna</b>, <b>kiski ginti</b>, aur <b>khaali jagah ka kya</b>.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> naya tool dekho toh us tool ki documentation mein dhoondo: hadd kiski ginti par lagti hai, hadd pakki hai ya nishaana, aur khaali jagah kisi ke kaam aati hai ya nahi. Kubernetes mein yeh do alag number hain: <b>request</b> (baari ka wazan) aur <b>limit</b> (pakki hadd).',
    },

    /* ---------------- 3. asli library chalao ---------------- */
    {
      type: 'docker',
      title: '🐳 Bonus lab — asli library, apni machine par',
      project: '39-noisy-neighbor',
      exercise: 'ex0-slowmo',
      goal: 'Wahi chaar cheezein khud chalao: ginti IP ki, ginti tenant ki, library ke default, aur library banaam token wali baalti.',
      why: '<code>tools/express-rate-limit.js</code> apna chhota Express server khud chalata hai — koi <code>npm start</code> nahi chahiye. Is ek tool ko npm ki do libraries chahiye (lab ke baaki tools ko kuch nahi chahiye). Node 18+.',
      steps: [
        { text: 'Lab ke folder mein do libraries daalo (ek baar).', cmd: 'cd docker-labs/39-noisy-neighbor && npm install express express-rate-limit' },
        { text: 'Tool chalao (~6 s). Pehle do hisson mein B#2 wali line milao.', cmd: 'node tools/express-rate-limit.js', expect: "express-rate-limit 8.7.1 · Express 5.3.0 · A aur B dono ka IP: 127.0.0.1\n\n=== 1. limit: 4 requests / second — ginti kiski? library ka default: IP ki ===\n   0.0 s  B#1 → 200 (is second mein bache: 3)\n   0.2 s  A ke 12 requests → 3 × 200, 9 × 429\n   0.4 s  B#2 → 429 · Retry-After: 1   ← B ne sirf 2 requests bheji thi\n   1.2 s  B#3 → 200 (is second mein bache: 3)   (naya second)\n\n=== 2. wahi limit — ginti x-api-key ki (har tenant ki apni) ===\n   0.0 s  B#1 → 200 (is second mein bache: 3)\n   0.2 s  A ke 12 requests → 4 × 200, 8 × 429\n   0.4 s  B#2 → 200 (is second mein bache: 2)\n   1.2 s  B#3 → 200 (is second mein bache: 3)   (naya second)\n\n=== 3. rateLimit() — koi setting nahi ===\n   6 requests (A aur B ki mili-juli) → 5 × 200, 1 × 429 · chhathi par: 429 · Retry-After: 60\n   default: ek IP se 1 minute mein 5 requests (windowMs 60000 · limit 5 · key = IP)\n\n=== 4. wahi 8 requests: 0.0 s par 1 · 0.9 s par 3 · 1.1 s par 4 (limit 4/second) ===\n   express-rate-limit (har second nayi ginti):  1 + 3 + 4 = 8 andar   ← 0.9 s se 1.1 s ke beech 7 andar\n   lib/token-bucket.js (tapakte tokens):        1 + 3 + 1 = 5 andar" },
      ],
      observe: {
        q: 'Pehle hisse mein B#2 ko 429 mila, doosre mein 200. Dono mein hadd wahi thi: ek second mein 4. Kya badla tha?',
        choices: [
          'Ginti kiski: pehle IP ki (A aur B ka ek hi IP), phir x-api-key ki (har tenant ki apni)',
          'Doosre hisse mein hadd badi thi',
          'Doosre hisse mein A ne kam requests bheji',
          'Doosre hisse mein Bholu Dhaba ne pehle bheja',
        ],
        answer: 0,
        explain: 'Limiter ke teen sawaal: kitne, kitni der mein, kiski ginti. Pehle do dono hisson mein same the. Teesra badla.',
      },
      lesson: 'Limiter lagao toh sabse pehle likho: ginti kiski. Phir ek baar khud chala ke dekho ki do alag grahak sach mein alag gine ja rahe hain.',
    },
  ],
  interview: {
    title: 'Interview Round — asli tools',
    instructions: 'Interviewer dekhna chahta hai ki tum default settings par bharosa nahi karte. 🎤',
    questions: [
      {
        q: '"Humne rate limiter lagaya. Ab kabhi-kabhi ek poore office ke saare users ko ek saath 429 milta hai, jabki har user ne do-chaar requests hi bheji. Kya ho raha hai?"',
        choices: [
          'Limiter IP ki ginti kar raha hai, aur poora office (ya load balancer ke peeche ki har request) ek hi IP se aata dikhta hai. Ginti user ya API key ki karo; proxy ke peeche ho toh asli client IP sahi tarah padhne ki setting bhi dekho',
          'Office ka internet kharab hai',
          'Hadd bahut kam hai — bas use das guna kar do',
          'Rate limiter mein bug hai; library badal do',
        ],
        answer: 0,
        explain: 'Lab: ginti IP ki → A ki 12 requests ke baad B#2 ko 429 (B ne sirf 2 bheji). Ginti x-api-key ki → B#2 ko 200. Library ka default bhi IP hi hai: 1 minute mein 5.',
      },
      {
        q: '"Kubernetes mein CPU request aur CPU limit mein kya farak hai? Noisy neighbour ke liye kaunsa?"',
        choices: [
          'Request baari ka wazan hai: kheencha-taani mein bade request wale ko zyada, aur khaali ho toh request se upar bhi le sakta hai. Limit pakki chhat hai: machine khaali ho tab bhi usse upar nahi. Request padosi se bachata hai bina jagah bekaar kiye; limit pakka bachata hai par jagah bekaar jaati hai',
          'Dono ek hi cheez hain',
          'Request sirf memory ke liye hota hai',
          'Limit lagane se pod tez chalta hai',
        ],
        answer: 0,
        explain: 'Kubernetes documentation: request "defines a weighting"; limit "defines a hard ceiling". (Is lab mein Kubernetes chalaya nahi gaya.) Lab mein wahi do tareeke: baari-baari → A ki 1,046 hui; hadd → 721.',
      },
      {
        q: '"Hamara limiter \'ek second mein 4\' kehta hai, par logs mein ek client ki 0.2 second mein 7 requests andar gayi dikh rahi hain. Bug hai?"',
        choices: [
          'Zaroori nahi. Agar limiter har second nayi ginti shuru karta hai, toh ek second ke aakhir aur agle ki shuruaat mein hadd se lagbhag dugni requests aa sakti hain. Yeh na chahiye ho toh token bucket jaisa hisaab chahiye',
          'Haan, pakka bug hai',
          'Logs galat hain',
          'Client ne do alag IP use kiye honge',
        ],
        answer: 0,
        explain: 'Lab: wahi 8 requests (0.0 s par 1, 0.9 s par 3, 1.1 s par 4). express-rate-limit ne 8 andar aane di; token wali baalti ne 5.',
      },
    ],
  },
  success: [
    'Kisi bhi limiter se teen sawaal pooch sakte ho: kitne, kitni der mein, kiski ginti',
    'Bata sakte ho ki IP ki ginti kab limiter ko hi noisy neighbour bana deti hai',
    'Kubernetes ke request, limit aur QoS class ko hadd, baari aur "pehle kaun jaayega" se jod sakte ho',
  ],
  cards: [
    { front: 'Limiter ke teen sawaal?', back: '<b>Kitne</b> (limit) · <b>kitni der mein</b> (window) · <b>kiski ginti</b> (key). Teesra sabse zyada chhoot-ta hai. express-rate-limit ka default: 1 minute mein 5, ek IP se.' },
    { front: 'Ginti IP ki ho toh kya ho sakta hai?', back: 'Ek IP ke peeche sab ek doosre ka hissa khaate hain: office, mobile network, ya load balancer ke peeche ki har request. Lab: A ki 12 requests → B#2 ko 429, jabki B ne 2 hi bheji.' },
    { front: '"Har second nayi ginti" banaam token bucket?', back: 'Nayi ginti wale hisaab mein do second ke kinare par lagbhag dugna aa sakta hai. Lab: wahi 8 requests → library 8 andar (0.2 s mein 7), token bucket 5.' },
    { front: 'Kubernetes: request, limit, QoS class? (docs)', back: '<b>Request</b> = baari ka wazan (khaali ho toh request se upar bhi). <b>Limit</b> = pakki chhat (khaali machine par bhi). <b>QoS class</b> = tangi mein pehle kaun nikala jaayega: BestEffort → Burstable → Guaranteed.' },
    { front: 'API gateway par har grahak ki hadd? (docs)', back: 'AWS API Gateway: token bucket — rate (tokens har second) + burst (baalti). Har grahak ki apni hadd API key + usage plan se. Paar → 429. Documentation ise "best-effort" kehti hai.' },
  ],
},
]);

})();
