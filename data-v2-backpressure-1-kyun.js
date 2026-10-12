/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: BACKPRESSURE (paanch chhote levels)
     1 Kyun    → samasya pehle: line chupchaap badhti hai, phir sab jaata hai (yeh file)
     2 Kaise   → bhari line ke chaar jawab; "dheere bhejo" source tak kaise pahunchta hai
     3 Code    → hadd wali line ka asli code (lib/bounded-queue.js)
     4 Library → wahi signal Node ke streams mein; RabbitMQ aur Kafka mein wahi faisle
     5 Kab     → kise rokein, kise "na" bolein, kya gira dein
   Har number docker-labs/15-backpressure ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/queue.js (ex1), asli crash = tools/oom.js.
   Source videos (credit): Software Developer Diaries — "Backpressure in Software Development simply explained";
   Akhil Sharma — "Understanding BackPressure".
   ===================================================================== */
(function () {

/* teen dabbe: order-service → dispatch-service (line iske andar) → riders */
const NODES = [
  { id: 'os', icon: '🧾', label: 'order-service', x: 145, y: 105 },
  { id: 'ds', icon: '🧭', label: 'dispatch-service', x: 505, y: 105 },
  { id: 'rd', icon: '🛵', label: 'riders', x: 880, y: 105 },
];
const EDGES = [{ from: 'os', to: 'ds' }, { from: 'ds', to: 'rd' }];
const VIZ = { w: 1000, h: 215 };
const IN = [{ from: 'os', to: 'ds', label: '5/s', tone: 'acc' }];
const OUT = [{ from: 'ds', to: 'rd', label: '1/s', tone: 'ok' }];
const BOTH = IN.concat(OUT);
/* dispatch-service ki memory: 20 orders ki line aati hai (slow motion ka niyam) */
const mem = n => Array.from({ length: 20 }, (_, i) => (i < n ? 'busy' : 'free'));
const cap8 = n => Array.from({ length: 8 }, (_, i) => (i < n ? 'busy' : 'free'));

VISUALS['bp-kyun'] = {
  t: 'Har second 5 orders andar, 1 bahar — farak dispatch-service ki memory mein jama hota hai',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { os: { tone: 'ok', badge: 'har order par "confirm"' }, ds: { tone: 'bad', badge: 'line 21 · jagah 20 → CRASH' }, rd: { tone: 'idle', badge: '4 ko rider mila' } },
    flows: [{ from: 'os', to: 'ds', label: '5/s', tone: 'bad' }, { from: 'ds', to: 'rd', label: '1/s', tone: 'ok' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'bp-kyun',
  icon: '🌧️',
  group: '🌊 Backpressure',
  title: 'Backpressure 1 · Kyun — line chupchaap badhti gayi, phir sab gaya',
  badge: 'Line Jasoos',
  objectives: [
    'Kahin koi error nahi tha aur har order par "confirm" bola gaya. Phir 22 orders gayab kaise hue?',
    'Memory dugni karne se kya badla — aur kya nahi badla?',
    'Line par hadd lagane se process bach gaya. Phir bhi 16 customers ke saath kya galat hua?',
    'Producer, consumer, queue, bounded queue, backpressure: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🌧️ Shukravaar shaam 8 baje, tez baarish</h3>
     <p>Baarish mein koi bahar nahi nikalta. Sab KhanaKart khol ke khaana order karte hain.</p>
     <p>KhanaKart mein ek order aise chalta hai:</p>
     <pre>phone → order-service → dispatch-service → rider</pre>
     <p><b>order-service</b> order leti hai, paisa kaat-ti hai aur phone ko turant bolti hai: "✅ Order confirm". Phir order <b>dispatch-service</b> ko de deti hai.</p>
     <p><b>dispatch-service</b> har order ke liye paas ka rider dhoondhti hai. Yeh dheema kaam hai. Isliye aane wale orders dispatch-service ke andar ek <b>line</b> mein khade rehte hain.</p>
     <p>Us shaam dashboard poora hara tha. Koi error nahi, koi alert nahi.</p>
     <p>Phir dispatch-service achanak mar gayi. Uske saath <b>line ke saare orders</b> chale gaye: paisa kat chuka tha, phone par "confirm" likha tha, rider kabhi nahi aaya.</p>
     <pre>lab, asli raftaar: ~36 second mein process mar gaya · line mein 2.2 lakh se zyada kaam the — sab gaye</pre>
     <p>Kisi ne galat code nahi likha tha. Bas ek sawaal kisi ne nahi poochha tha.</p>
     <p class="tip">👉 Agle screen par wahi shaam slow motion mein: har second 5 orders aate hain, 1 nikalta hai. Dekho line ke saath kya hota hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: bina hadd ki line ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — line ki koi hadd nahi',
      goal: 'Pehle har click = ek ghatna, phir har click = ek second. Jo badla, woh peele rang mein chamkega. Dekho ki sab kuch kab tak "theek" dikhta hai.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'in', label: 'Orders aaye (sab ko "confirm" bola)' },
        { id: 'line', label: 'Line mein khade orders' },
        { id: 'mem', label: 'dispatch-service ki memory (20 orders ki jagah)' },
        { id: 'out', label: 'Rider mila' },
        { id: 'wait', label: 'Abhi aaye order ko rider kab' },
        { id: 'dash', label: 'Dashboard' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'dispatch-service ek order par <b>1 second</b> lagati hai: order uthana, paas ka rider dhoondhna, rider ko order dena. Yaani dispatch-service <b>1 order/second</b> kar sakti hai.<br><br>Aaj baarish hai. Orders har 200 ms par aa rahe hain: <b>5 orders/second</b>.',
          nodes: { os: { tone: 'ok', badge: '5 orders/second' }, ds: { tone: 'ok', badge: '1 order/second' }, rd: { tone: 'idle', badge: '' } },
          vars: { in: '0', line: '0', mem: mem(0), out: '0', wait: '—', dash: '🟢 errors 0' },
        },
        {
          clock: '0.0 s',
          say: 'Order <b>#1</b> aaya. order-service ne paisa kaata, phone ko "✅ Order confirm" bola, aur order dispatch-service ko de diya. Line: 1.',
          flows: IN,
          vars: { in: '1', line: ['wait:#1'], mem: mem(1) },
        },
        {
          clock: '0.1 s',
          say: 'dispatch-service ne #1 line se utha liya. Line: 0.<br><br>Ab dispatch-service 1 second tak #1 ke liye rider dhoondhegi. Tab tak dispatch-service kuch aur nahi uthayegi.',
          nodes: { ds: { tone: 'busy', badge: '#1 ka rider dhoondh rahi hai' } },
          vars: { line: '0', mem: mem(0) },
        },
        {
          clock: '0.2–0.8 s',
          say: 'Orders #2, #3, #4, #5 aaye. Chaaron ke phone par "✅ Order confirm". dispatch-service abhi bhi #1 mein lagi hai. Line: <b>4</b>.',
          flows: IN,
          vars: { in: '5', line: ['wait:#2', 'wait:#3', 'wait:#4', 'wait:#5'], mem: mem(4), wait: '~5.2 s baad' },
        },
        {
          clock: '1.0–1.1 s',
          say: '#6 aaya: line 5. Phir #1 ko rider mil gaya, aur dispatch-service ne #2 uthaya: line 4. #2 line mein <b>0.9 s</b> khada raha.<br><br>Ek second mein: 5 aaye, 1 nikla.',
          flows: BOTH,
          nodes: { ds: { tone: 'busy', badge: '#2 ka rider dhoondh rahi hai' }, rd: { tone: 'ok', badge: '1 ko rider mila' } },
          vars: { in: '6', line: ['wait:#3', 'wait:#4', 'wait:#5', 'wait:#6'], out: '1' },
          ask: {
            q: 'Har second 5 orders aate hain aur 1 nikalta hai. 2.9 s par line mein kitne orders khade honge?',
            choices: [
              '12 — har second 4 badhte hain (5 aaye, 1 nikla)',
              '3 — dispatch-service raftaar pakad legi',
              '15 — jitne aaye utne',
              '0 — line khaali ho jaayegi',
            ],
            answer: 0,
            hint: 'Ek second mein kitne aaye? Kitne nikle? Jo farak bacha, woh kahan gaya?',
            explain: '5 − 1 = <b>4 har second</b>. 0.9 s par 4, 1.9 s par 8, 2.9 s par 12. Yeh farak kahin jaata nahi. Line mein jama hota hai.',
          },
        },
        {
          clock: '2.9 s',
          say: 'Aaye <b>15</b>. Rider mila: <b>2</b>. Line: <b>12</b>.<br><br>Line ka sabse aage wala order 2.3 s se khada hai. Jo order abhi aayega, use rider <b>~13 second</b> baad milega.',
          flows: BOTH,
          nodes: { ds: { tone: 'busy', badge: 'line 12' }, rd: { tone: 'ok', badge: '2 ko rider mila' } },
          vars: { in: '15', line: '12 orders', mem: mem(12), out: '2', wait: '~13.2 s baad' },
        },
        {
          clock: '4.9 s',
          say: 'Aaye <b>25</b>. Rider mila: <b>4</b>. Line: <b>20</b>. Abhi aaye order ko rider <b>~21 second</b> baad.<br><br>order-service ke hisaab se sab theek hai: 25 orders, 25 "confirm", 0 error. Dashboard hara hai.',
          flows: BOTH,
          nodes: { os: { tone: 'ok', badge: '25 "confirm" · 0 error' }, ds: { tone: 'slow', badge: 'line 20 · memory bhari' }, rd: { tone: 'ok', badge: '4 ko rider mila' } },
          vars: { in: '25', line: '20 orders', mem: mem(20), out: '4', wait: '~21.2 s baad', dash: '🟢 errors 0 · 25 mein se 25 "confirm"' },
          ask: {
            q: 'dispatch-service ki memory mein 20 orders ki line aati hai. (Slow motion ke liye sankhya chhoti hai; asli process mein yeh lakhon hoti hai.) Agla order 5.0 s par aayega. Kya hoga?',
            choices: [
              'Line 21 ho jaayegi, memory mein jagah nahi bachegi — dispatch-service crash, aur line ke saare orders uske saath gayab',
              'order-service apne aap dheemi ho jaayegi',
              '21va order wapas chala jaayega aur customer ko bata diya jaayega',
              'Lambi line dekh ke dispatch-service tez ho jaayegi',
            ],
            answer: 0,
            hint: 'Kya kisi ne order-service ko bataya hai ki line bhar rahi hai? Kya line ko pata hai ki uski koi hadd hai?',
            explain: 'Line ko apni hadd pata hi nahi: line har order le leti hai. Asli hadd memory ki hai. Aur memory "na" nahi bolti — <b>process ko maar deti hai</b>.',
          },
        },
        {
          clock: '5.0 s',
          say: '#26 aaya. Line 21, jagah sirf 20 ki → dispatch-service <b>CRASH</b> (out of memory).<br><br>Line dispatch-service ki memory mein thi. dispatch-service gayi toh line ke <b>21 orders</b> bhi gaye. #5, jiska rider dhoondha ja raha tha, woh bhi gaya.',
          flows: [{ from: 'os', to: 'ds', label: '#26', tone: 'bad' }],
          nodes: { ds: { tone: 'bad', badge: 'CRASH · out of memory' } },
          vars: { in: '26', line: 'gayab — 21 orders', mem: Array.from({ length: 20 }, () => 'bad'), wait: 'kabhi nahi', dash: '🔴 dispatch-service band' },
        },
        {
          clock: 'nateeja',
          say: `Slow motion ke 5 second:
            <ul>
              <li>"Confirm" bola gaya: <b>26</b> orders</li>
              <li>Rider mila: <b>4</b></li>
              <li>Gayab: <b>22</b> (line ke 21 + jis par kaam chal raha tha 1)</li>
            </ul>
            22 logon ka paisa kat chuka hai. Phone par likha hai "Order confirm". Rider nahi aayega.<br><br>Aur crash se pehle bhi sab theek nahi tha: 4.9 s par aaya order rider ke liye 21 second rukta.`,
          nodes: { os: { tone: 'bad', badge: '26 "confirm" · 22 jhooth' }, ds: { tone: 'bad', badge: 'CRASH · 22 orders gayab' }, rd: { tone: 'idle', badge: '4 ko rider mila' } },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi kahani asli raftaar par: bhejne wala <b>10,000/second</b>, kaam karne wala <b>2,000/second</b>. Wahi 5 aur 1 ka hisaab.
            <div class="dr-scroll"><table>
              <tr><th>Samay</th><th>Line mein</th><th>Process ki memory</th></tr>
              <tr><td>10 s</td><td>78,560</td><td>108 MB</td></tr>
              <tr><td>20 s</td><td>1,57,360</td><td>166 MB</td></tr>
              <tr><td>30 s</td><td>2,36,000</td><td>252 MB</td></tr>
            </table></div>
            Line har second <b>~7,900</b> badhti hai. 30 second par line ka sabse purana kaam <b>24 second</b> purana hai. Poore run mein error: 0.`,
          nodes: { os: { tone: 'ok', badge: 'lab: 10,000/s' }, ds: { tone: 'slow', badge: 'lab: line 2,36,000' }, rd: { tone: 'ok', badge: 'lab: 2,000/s' } },
          flows: BOTH,
          vars: { in: 'lab: 10,000 har second', line: 'lab: 30 s mein 2,36,000', mem: 'lab: 252 MB aur badhti hui', out: 'lab: 2,000 har second', wait: 'lab: sabse purana kaam 24 s purana', dash: '🟢 errors 0' },
        },
        {
          clock: 'asli crash',
          say: `Wahi program, par process ki memory par <b>100 MB</b> ki hadd (jaise asli server par hoti hai):
            <ul>
              <li>29 s tak line <b>2.2 lakh se zyada</b>.</li>
              <li>Phir <b>~7 second</b> process jam gaya: na naya kaam liya, na purana kiya. Process memory khaali karne mein laga tha.</li>
              <li><b>~36 s</b> par process mar gaya: <code>JavaScript heap out of memory</code>.</li>
            </ul>
            Line ke <b>2.2 lakh se zyada</b> kaam gaye. Kaam karne wala sirf ~55,500 kar paya tha.`,
          nodes: { os: { tone: 'bad', badge: 'lab: sab "le liya"' }, ds: { tone: 'bad', badge: 'lab: ~36 s par mara' }, rd: { tone: 'idle', badge: 'lab: ~55,500 hue' } },
          vars: { in: 'lab: 10,000 har second', line: 'lab: 2.2 lakh se zyada — sab gaye', mem: 'lab: hadd 100 MB — paar', out: 'lab: ~55,500', wait: 'kabhi nahi', dash: '🔴 process mar gaya' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jab bhejne wala kaam karne wale se tez ho, toh farak (aaya − nikla) kahin jaata nahi: <b>line mein jama hota hai</b>.<br>Bina hadd ki line teen cheezein chhupa leti hai: badhti hui der, badhti hui memory, aur aakhir mein crash — jisme line ka sab kuch ek saath jaata hai. Crash tak dashboard hara rehta hai.',
    },

    /* ---------------- 2. do pehle ilaaj ---------------- */
    {
      type: 'dryrun',
      title: '🩹 Do pehle ilaaj — badi memory, phir line par hadd',
      goal: 'Wahi shaam, wahi orders. Team ke do sujhaav aazmao. Dekho kya sudhra — aur kaunsa sawaal ab bhi khula hai.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'fix', label: 'Ilaaj' },
        { id: 'proc', label: 'dispatch-service' },
        { id: 'line', label: 'Line mein' },
        { id: 'lost', label: 'Gayab orders' },
        { id: 'know', label: 'Kisko pata chala?' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar: 5.0 s par crash, <b>22 orders gayab</b>. Tum is team mein ho. Pehla sujhaav aata hai: <b>"dispatch-service ko dugni memory de do. Tab 40 orders ki line aa jaayegi."</b>',
          nodes: { os: { tone: 'ok', badge: '5 orders/second' }, ds: { tone: 'bad', badge: 'memory 20 → 5.0 s par crash' }, rd: { tone: 'idle', badge: '1 order/second' } },
          vars: { fix: 'koi nahi (memory 20)', proc: '5.0 s par CRASH', line: '21 par toot gayi', lost: '22', know: 'kisi ko nahi' },
          ask: {
            q: 'Memory dugni (40 orders ki jagah) karne se kya badlega?',
            choices: [
              'Crash 5.0 s ki jagah 10.0 s par hoga — aur tab zyada orders gayab honge',
              'Samasya khatam: 40 ki jagah kaafi hai',
              'Line 20 par ruk jaayegi',
              'dispatch-service dugni tez ho jaayegi',
            ],
            answer: 0,
            hint: 'Line har second 4 badhti hai. Memory dugni karne se yeh 4 badalta hai kya?',
            explain: 'Memory se raftaar nahi badalti. 5 aate hain, 1 nikalta hai: line ab bhi har second 4 badhti hai. Bas bharne mein dugna waqt lagta hai.',
          },
        },
        {
          clock: '10.0 s',
          say: `Dugni memory ke saath wahi run. 9.9 s par line <b>40</b>; abhi aaye order ko rider ~41 second baad. 10.0 s par #51 aaya → line 41 → <b>CRASH</b>.
            <div class="dr-scroll"><table>
              <tr><th>Memory</th><th>Crash kab</th><th>"Confirm" bola</th><th>Rider mila</th><th>Gayab</th></tr>
              <tr><td>20 orders</td><td>5.0 s</td><td>26</td><td>4</td><td>22</td></tr>
              <tr><td>40 orders</td><td>10.0 s</td><td>51</td><td>9</td><td><b>42</b></td></tr>
            </table></div>
            Badi memory ne crash ko 5 second aage khiskaya, aur nuksaan lagbhag dugna kar diya.`,
          flows: [{ from: 'os', to: 'ds', label: '#51', tone: 'bad' }],
          nodes: { ds: { tone: 'bad', badge: 'memory 40 → 10.0 s par crash' } },
          vars: { fix: 'dugni memory (40)', proc: '10.0 s par CRASH', line: '41 par toot gayi', lost: '42', know: 'kisi ko nahi' },
        },
        {
          clock: 'doosra sujhaav',
          say: 'Doosra sujhaav: line par <b>hadd</b> laga do. Line mein sirf <b>8</b> orders.<br><br>8 kyun? dispatch-service 1 order/second karti hai. Line ka 8va order ~9 second mein niptega. 8 se lambi line ka matlab 9 second se lamba intezaar — aur itni der koi rider ka intezaar nahi karega.',
          nodes: { ds: { tone: 'ok', badge: 'line ki hadd 8' } },
          vars: { fix: 'line ki hadd 8', proc: 'chal rahi hai', line: cap8(0), lost: '0', know: '—' },
        },
        {
          clock: '1.8 s',
          say: 'Wahi orders phir se. 1.8 s par #10 aaya: line <b>8/8</b>. Bhari.',
          flows: IN,
          nodes: { ds: { tone: 'slow', badge: 'line 8/8 — BHARI' } },
          vars: { line: cap8(8) },
        },
        {
          clock: '2.0 s',
          say: '#11 aaya. Line bhari hai. Line ka code sabse seedha hai: <code>if (line bhari hai) return;</code> — naya order chhod do.',
          flows: [{ from: 'os', to: 'ds', label: '#11', tone: 'bad' }],
          vars: { lost: '1 (#11)' },
          ask: {
            q: '#11 ke customer ke phone par abhi kya likha hai?',
            choices: [
              '"✅ Order confirm" — order-service paisa kaat ke confirm bol chuki thi; line ne order chupchaap gira diya',
              '"Abhi bahut bheed hai, thodi der mein try karein"',
              'Phone par spinner ghoom raha hai',
              'Kuch nahi — #11 line mein chala gaya',
            ],
            answer: 0,
            hint: 'order-service ne "confirm" kab bola tha: order dene se pehle ya baad mein? Aur line ne girate waqt kisi ko bataya?',
            explain: 'Line ne <b>chupchaap</b> giraya. order-service ko pata nahi, customer ko pata nahi. Slow motion ki line: <code>#11 aaya → line bhari (8/8) → #11 chupchaap gira · customer ko phir bhi "order confirm"</code>',
          },
        },
        {
          clock: '2.1–3.0 s',
          say: 'dispatch-service ne #3 uthaya: line 7/8. #12 aaya: 8/8, phir bhari. Uske baad #13, #14, #15, #16 — <b>chaaron gire</b>.<br><br>Ab har second yahi hoga: 5 aaye, 1 ki jagah bani, 4 gire.',
          flows: BOTH,
          nodes: { ds: { tone: 'slow', badge: 'line 8/8 · 5 gire' } },
          vars: { lost: '5 (#11, #13–#16)' },
        },
        {
          clock: '5.9 s',
          say: `6 second ka hisaab:
            <ul>
              <li>Aaye: <b>30</b>. "Confirm" bola: <b>30</b>.</li>
              <li>Rider mila ya milega: <b>14</b> (5 ko mila, 1 par kaam chal raha hai, 8 line mein).</li>
              <li>Chupchaap gire: <b>16</b>.</li>
            </ul>
            dispatch-service zinda hai. Memory nahi badhi. Line 8 se upar nahi gayi.`,
          flows: BOTH,
          nodes: { os: { tone: 'slow', badge: '30 "confirm" · 16 jhooth' }, ds: { tone: 'ok', badge: 'zinda · line 8/8' }, rd: { tone: 'ok', badge: '5 ko rider mila' } },
          vars: { proc: 'zinda — crash nahi', line: cap8(8), lost: '16 (chupchaap)', know: 'kisi ko nahi' },
        },
        {
          clock: 'tulna',
          say: `<div class="dr-scroll"><table>
              <tr><th>Ilaaj</th><th>dispatch-service</th><th>Gayab orders</th><th>Kisko pata chala?</th></tr>
              <tr><td>Koi nahi (memory 20)</td><td>5.0 s par crash</td><td>22</td><td>Kisi ko nahi</td></tr>
              <tr><td>Dugni memory (40)</td><td>10.0 s par crash</td><td>42</td><td>Kisi ko nahi</td></tr>
              <tr><td>Line ki hadd 8, bhari ho toh chupchaap girao</td><td><b>zinda</b></td><td>16</td><td>Kisi ko nahi</td></tr>
            </table></div>
            Hadd ne dispatch-service ko bacha liya. Yeh asli sudhaar hai.<br><br>Par 16 customers ke liye kuch nahi badla: paisa kata, "confirm" dikha, rider nahi aayega. Aur ab toh koi crash bhi nahi jo kisi ko jagaye.`,
          nodes: { os: { tone: 'slow', badge: '16 jhoothe "confirm"' }, ds: { tone: 'ok', badge: 'zinda' }, rd: { tone: 'ok', badge: '' } },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi ilaaj asli raftaar par (line ki hadd 20,000, bhari ho toh naya girao), 30 second:
            <ul>
              <li>Bhejne wala poori raftaar se chalta raha: <b>9,863/second</b>.</li>
              <li>Line <b>19,980</b> par ruki rahi. Memory <b>94 MB</b> par tik gayi.</li>
              <li><b>2,16,740</b> kaam chupchaap gire. Bhejne wale ko ek baar bhi nahi bataya gaya.</li>
            </ul>`,
          nodes: { os: { tone: 'slow', badge: 'lab: 9,863/s chalta raha' }, ds: { tone: 'ok', badge: 'lab: line 19,980' }, rd: { tone: 'ok', badge: 'lab: 2,000/s' } },
          vars: { fix: 'lab: hadd 20,000 + chupchaap girao', proc: 'lab: zinda, 94 MB', line: 'lab: 19,980', lost: 'lab: 2,16,740', know: 'kisi ko nahi' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> line par hadd zaroori hai — par hadd ek sawaal khada karti hai jo pehle chhupa tha: <b>line bhari ho toh kya?</b><br>"Chupchaap gira do" sabse aasaan jawab hai. Behtar jawab ke liye <b>bhejne wale ko pata chalna chahiye</b> ki line bhari hai. Agla level isi ka hai.',
    },

    /* ---------------- 3. idea: chhat ki tanki ---------------- */
    {
      type: 'cards',
      title: '🚰 Yeh tum dekh chuke ho — chhat ki tanki aur motor',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Tanki se paani kyun behne lagta hai?',
          say: 'Chhat par paani ki tanki hai. Neeche ki motor tanki mein paani chadhati hai: <b>5 balti har minute</b>. Ghar ke nal se paani nikalta hai: <b>1 balti har minute</b>.<br><br>Har minute tanki mein 4 balti badhti hain. Motor chalti rahi toh tanki bharegi, aur phir paani chhat par behne lagega.<br><br><b>KhanaKart mein:</b> motor = order-service · tanki = line · nal = dispatch-service.',
        },
        {
          title: '2. Badi tanki ilaaj kyun nahi?',
          say: '500 litre ki jagah 1000 litre ki tanki laga do. Motor ab bhi 5 daalti hai, nal ab bhi 1 nikalta hai. Paani ab bhi behega — bas dugni der mein.<br><br><b>KhanaKart mein:</b> yahi "dugni memory" thi. Crash 5 second se 10 second par khiska, gayab orders 22 se 42 hue.<br><br>Tanki ka kaam <b>thodi der ki tezi</b> sambhalna hai (subah sab ek saath nahate hain). Hamesha chalne wale farak ko koi tanki nahi sambhalti.',
        },
        {
          title: '3. Paani ka behna kaise rukta hai?',
          say: 'Har ghar mein koi na koi chillata hai: <b>"Motor band karo, tanki bhar gayi!"</b><br><br>Kai gharon mein yeh kaam ek chhota switch karta hai. Tanki ke andar ek gola tairta hai. Paani upar aaya → gola upar → motor band. Paani neeche gaya → gola neeche → motor chalu.',
          ask: {
            q: 'Us tairte hue gole ne asal mein kya kiya?',
            choices: [
              'Tanki ka haal motor tak pahunchaya: paani upar jaata hai, "ruk ja" neeche aata hai',
              'Tanki ko bada kar diya',
              'Nal ko tez kar diya',
              'Extra paani ko chupchaap baha diya',
            ],
            answer: 0,
            hint: 'Paani kis disha mein jaata hai? "Ruk ja" kis disha mein jaata hai?',
            explain: 'Paani: motor → tanki → nal. "Ruk ja": tanki → motor. Kaam jis disha mein behta hai, yeh khabar kaam ki <b>ulti disha</b> mein chalti hai. Poori baat yahi hai.',
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Jo kaam bhejta hai (motor, order-service)</td><td><b>Producer</b></td></tr>
              <tr><td>Jo kaam karta hai (nal, dispatch-service)</td><td><b>Consumer</b></td></tr>
              <tr><td>Beech ki line (tanki)</td><td><b>Queue</b> ya <b>buffer</b></td></tr>
              <tr><td>Line jiski hadd tay hai</td><td><b>Bounded queue</b> (bina hadd wali: unbounded)</td></tr>
              <tr><td>Bhari line par kaam gira dena</td><td><b>Drop</b> (isi ko load shedding bhi kehte hain)</td></tr>
              <tr><td>Consumer ka "ruk ja / dheere bhejo" producer tak pahunchna</td><td><b>Backpressure</b></td></tr>
            </table></div>
            Naam pipe se aaya hai: aage rukaavat ho toh paani ka dabaav peeche ki taraf banta hai.<br><br>⚠️ <b>Dhyaan do:</b> log "backpressure" do tarah bolte hain. Kabhi samasya ke liye ("line badh rahi hai, backpressure ban raha hai"), kabhi ilaaj ke liye ("producer par backpressure lagao"). Dono ke peeche ek hi baat hai: consumer peeche reh gaya hai, aur yeh khabar producer tak jaani chahiye.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> farak (aaya − nikla) ke sirf teen thikane hain. <b>Line mein</b> — thodi der ke liye, hadd ke saath. <b>Producer ke paas</b> — producer ruke ya dheema ho (backpressure). <b>Kahin nahi</b> — gira do (drop).<br>Bina hadd ki line chautha thikana nahi hai. Bina hadd ki line bhi "gira do" hi hai: bas der se, aur sab ek saath.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'order-service har second 5 orders bhejti hai', right: 'Producer', explain: 'Producer = jo kaam bhejta hai. Tanki wali misaal mein motor.' },
        { left: 'dispatch-service har second 1 order uthati hai', right: 'Consumer', explain: 'Consumer = jo kaam karta hai. Poore system ki raftaar aakhir mein consumer ki raftaar hi hoti hai.' },
        { left: 'Line mein 8 se zyada orders aa hi nahi sakte', right: 'Bounded queue', explain: 'Hadd wali line. Slow motion: dispatch-service zinda rahi, memory nahi badhi.' },
        { left: 'Line bina roke badhti gayi aur process mar gaya', right: 'Unbounded queue', explain: 'Bina hadd ki line. Slow motion: 5.0 s par crash, 22 orders gayab. Lab: ~36 s par process mara, 2.2 lakh se zyada kaam gaye.' },
        { left: 'Line bhari thi, #11 ko chupchaap chhod diya gaya', right: 'Drop', explain: 'Bhari line par kaam girana. Slow motion: 16 gire, kisi ko pata nahi chala.' },
        { left: 'Tanki bhari → tairte gole ne motor band kar di', right: 'Backpressure', explain: '"Ruk ja" consumer ki taraf se producer tak pahuncha, aur producer ruk gaya.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Hamari service mein koi error nahi tha, CPU theek tha. Phir bhi process out-of-memory se mar gaya aur hazaaron kaam kho gaye. Kya hua hoga?"',
        choices: [
          'Andar koi bina hadd ki line thi. Kaam aane ki raftaar nikalne ki raftaar se zyada thi, toh farak line mein jama hota gaya. Ilaaj: line par hadd, aur bhari hone par bhejne wale ko batana — sirf memory badhana nahi',
          'Memory leak hoga; process ko roz restart kar do',
          'Garbage collector kharab hai; doosri language mein likho',
          'Server chhota hai; bada server le lo',
        ],
        answer: 0,
        explain: 'Lab: bhejne wala 10,000/s, kaam karne wala 2,000/s → line 30 s mein 2,36,000, error 0. Memory hadd 100 MB par process ~36 s mein mara aur 2.2 lakh se zyada kaam gaye.',
      },
      {
        q: '"Queue lambi hoti ja rahi hai. Queue badi kar dein, ya RAM badha dein?"',
        choices: [
          'Pehle dekho: yeh thodi der ki tezi hai ya lagataar farak? Thodi der ki tezi ko line sokh legi. Lagataar farak ho toh har line bharegi — badi line sirf der badhati hai, aur girne par nuksaan bhi. Tab bhejne wale ko dheema karna, kaam karne wale ko tez karna, ya kaam girana padega',
          'Haan, queue dugni kar do — samasya khatam',
          'Queue hata do; seedha call karo',
          'RAM badha do, queue ko chhedo mat',
        ],
        answer: 0,
        explain: 'Slow motion: memory 20 → 5.0 s par crash, 22 gayab. Memory 40 → 10.0 s par crash, 42 gayab. Raftaar ka farak (har second 4) jaisa tha waisa raha.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki bina error ke bhi ek line poore process ko kaise maar deti hai',
    'Badi memory aur "chupchaap girao" kya sudharte hain aur kya nahi — number ke saath',
    'Producer, consumer, queue, bounded queue, drop aur backpressure ko pehchaan sakte ho',
  ],
  cards: [
    { front: 'Bina hadd ki line mein kya galat hai?', back: 'Farak (aaya − nikla) line mein jama hota hai. Pehle der badhti hai, phir memory, phir crash — aur line ka sab kuch ek saath jaata hai. Slow motion: 26 "confirm", 22 gayab. Lab: ~36 s mein process mara, 2.2 lakh se zyada kaam gaye, error 0.' },
    { front: 'Badi memory / badi line ilaaj kyun nahi?', back: 'Raftaar ka farak wahi rehta hai. Slow motion: memory 20 → crash 5.0 s, 22 gayab; memory 40 → crash 10.0 s, 42 gayab. Line sirf thodi der ki tezi ke liye hoti hai.' },
    { front: 'Line par hadd lagayi, bhari ho toh chupchaap giraya. Kya bacha, kya nahi?', back: 'Bacha: process (zinda, memory sthir). Nahi bacha: 30 mein se 16 orders gire aur kisi ko pata nahi chala. Lab: 2,16,740 kaam chupchaap gire.' },
    { front: 'Farak (aaya − nikla) ke teen thikane?', back: '<b>Line mein</b> (thodi der, hadd ke saath) · <b>producer ke paas</b> (producer ruke — backpressure) · <b>kahin nahi</b> (drop). Bina hadd ki line = drop, bas der se aur sab ek saath.' },
  ],
},
]);

})();
