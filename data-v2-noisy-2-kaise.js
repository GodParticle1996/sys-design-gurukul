/* =====================================================================
   🛡️ Playlist · 1 Resilience — Noisy Neighbour · level 2: KAISE
   Baari-baari (har tenant ki apni line), token wali baalti andar se, aur har tenant ki apni khidki.
   Har step docker-labs/39-noisy-neighbor ke asli run se hai: slow motion = `node tools/slowmo.js` (modes fair, quota, pool),
   baalti = `node tools/mini.js`, asli raftaar = tools/tenants.js (ex1).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'a', icon: '🏢', label: 'Annapurna (A)', x: 165, y: 85 },
  { id: 'b', icon: '🍲', label: 'Bholu Dhaba (B)', x: 165, y: 245 },
  { id: 'api', icon: '🚪', label: 'partner-api', x: 690, y: 165 },
];
const EDGES = [{ from: 'a', to: 'api' }, { from: 'b', to: 'api' }];
const VIZ = { w: 890, h: 330 };
const A = n => (n ? Array.from({ length: n }, () => 'busy:A') : 'khaali');
const tok = n => [n >= 1 ? 'ok' : 'free', n >= 2 ? 'ok' : 'free'];

VISUALS['nn-kaise'] = {
  t: 'Har tenant ki apni line; khidkiyan baari-baari har line se ek kaam uthati hain',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { a: { tone: 'busy', badge: 'A ki line: 10' }, b: { tone: 'ok', badge: 'B ki line: 1 · baari B ki' }, api: { tone: 'ok', badge: 'agla kaam: B#2' } },
    flows: [{ from: 'b', to: 'api', label: 'B#2', tone: 'ok' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'nn-kaise',
  icon: '🔁',
  group: '🔊 Noisy Neighbour',
  title: 'Noisy Neighbour 2 · Kaise — baari-baari: har tenant ki apni line',
  badge: 'Baari Bahadur',
  objectives: [
    'Baari-baari wali line mein "agla kaam kiska" kaun tay karta hai?',
    'Jis tenant ki baari hai par line khaali hai, uski baari ka kya hota hai?',
    'Har tenant ki hadd andar se kaise chalti hai — baalti, tokens, aur do settings?',
    'Hadd, baari, aur alag khidki: teeno mein kya milta hai aur kya jaata hai?',
  ],
  lesson: [
    `<h3>🔁 Sirf ek sawaal badla</h3>
     <p>Pichhle level mein partner-api ki khidki jab bhi khaali hoti thi, ek hi sawaal poochhti thi:</p>
     <pre>pehle:  "line mein sabse aage kaun hai?"            → Annapurna ke 10, phir Bholu Dhaba
ab:     "baari kiski hai? Us tenant ka agla kaam."  → Bholu Dhaba, Annapurna, Bholu Dhaba, Annapurna …</pre>
     <p>Wahi 12 requests, wahi 7 order accept, wahi do khidkiyan. Slow motion ka nateeja:</p>
     <pre>ek line:        Bholu Dhaba 7 mein se 3 ❌ · Annapurna 12 ✅
har tenant 2/s: Bholu Dhaba 7 mein se 0 ❌ · Annapurna 2 ✅, 10 mana
baari-baari:    Bholu Dhaba 7 mein se 0 ❌ · Annapurna 12 ✅</pre>
     <p>Na Bholu Dhaba ka koi order accept fail hua, na Annapurna ki koi request mana hui.</p>
     <p class="tip">👉 Agle screen par dekho ki khidki har baar kaise tay karti hai ki agla kaam kiska hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. baari-baari ---------------- */
    {
      type: 'dryrun',
      title: '👣 Dry run — baari kiski hai?',
      goal: 'Har click = ek ghatna. Do lines hain: Annapurna ki aur Bholu Dhaba ki. Har baar jab khidki khaali ho, pehle socho: <b>baari kiski hai, aur us tenant ki line mein kuch hai?</b>',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'turn', label: 'Agli baari kiski' },
        { id: 'la', label: 'Annapurna ki line' },
        { id: 'lb', label: 'Bholu Dhaba ki line' },
        { id: 'win', label: 'partner-api ki 2 khidkiyan' },
        { id: 'b', label: 'Bholu Dhaba ke order accept' },
      ],
      steps: [
        {
          clock: 'niyam',
          say: `partner-api mein ab ek line nahi hai. <b>Har tenant ki apni line</b> hai. Khidki ka niyam:
            <ol>
              <li>Khidki khaali hui → jis tenant ki <b>baari</b> hai, us tenant ki line se <b>ek</b> kaam.</li>
              <li>Jis tenant ki baari ho gayi, woh baari ke kram mein sabse peeche.</li>
              <li>Baari hai par line khaali hai → us tenant ko chhodo, agle tenant ko dekho.</li>
            </ol>`,
          nodes: { a: { tone: 'idle', badge: 'A ki line: 0' }, b: { tone: 'ok', badge: 'B ki line: 0' }, api: { tone: 'ok', badge: '2 khidkiyan' } },
          vars: { turn: '—', la: 'khaali', lb: 'khaali', win: ['free', 'free'], b: ['ok'] },
        },
        {
          clock: '1.00–1.22 s',
          say: 'Annapurna ki 12 requests. Pehli do seedhe khidkiyon par. Baaki <b>10 Annapurna ki line mein</b>. Bholu Dhaba ki line khaali hai.<br><br>Annapurna abhi do baar baari le chuka. Agli baari: <b>Bholu Dhaba</b> ki.',
          flows: [{ from: 'a', to: 'api', label: '12', tone: 'bad' }],
          nodes: { a: { tone: 'busy', badge: 'A ki line: 10' }, b: { tone: 'ok', badge: 'B ki line: 0' }, api: { tone: 'busy', badge: 'A#1 · A#2 chal rahe' } },
          vars: { turn: 'B, phir A', la: A(10), win: ['busy:A#1', 'busy:A#2'] },
        },
        {
          clock: '1.25 s',
          say: 'Bholu Dhaba ka <b>B#2</b> aaya. Dono khidkiyan lagi hain, toh B#2 line mein — par <b>Bholu Dhaba ki apni line</b> mein. Us line mein B#2 akela hai.',
          flows: [{ from: 'b', to: 'api', label: 'B#2', tone: 'acc' }],
          nodes: { b: { tone: 'busy', badge: 'B ki line: 1 · baari B ki' } },
          vars: { lb: ['wait:B#2'], b: ['ok', 'wait:#2'] },
        },
        {
          clock: '1.50 s',
          say: 'A#1 ho gaya. <b>Khidki 1 khaali.</b> Annapurna ki line mein 10 kaam hain. Bholu Dhaba ki line mein 1.',
          nodes: { api: { tone: 'ok', badge: 'khidki 1 khaali' } },
          vars: { win: ['free', 'busy:A#2'] },
          ask: {
            q: 'Annapurna ke 10 kaam B#2 se pehle aaye the. Agli baari Bholu Dhaba ki hai. Khidki 1 kise uthayegi?',
            choices: [
              'B#2 ko — baari Bholu Dhaba ki hai. "Kaun pehle aaya" ab sirf apni line ke andar maayne rakhta hai',
              'A#3 ko — Annapurna ke kaam pehle aaye the',
              'Jiski line lambi hai, uska kaam',
              'Kisi ko nahi — khidki tab tak rukegi jab tak dono lines barabar na ho jaayein',
            ],
            answer: 0,
            hint: 'Niyam 1 dobara padho: khidki pehle kya dekhti hai — line ki lambai, aane ka samay, ya baari?',
            explain: 'Slow motion ki line: <code>khidki 1: A#1 ho gaya → agla: B#2 (baari B ki)</code>. B#2 sirf 0.25 second ruka. Pichhle level mein B#2 ke aage 10 kaam the.',
          },
        },
        {
          clock: '1.52 s',
          say: 'A#2 ho gaya. Khidki 2 khaali. Ab baari <b>Annapurna</b> ki: A#3 utha. Annapurna ki line: 9.<br><br>Agli baari phir Bholu Dhaba ki.',
          flows: [{ from: 'a', to: 'api', label: 'A#3', tone: 'acc' }],
          nodes: { a: { tone: 'busy', badge: 'A ki line: 9' }, b: { tone: 'ok', badge: 'B#2 khidki par' }, api: { tone: 'busy', badge: 'B#2 · A#3 chal rahe' } },
          vars: { turn: 'B, phir A', la: A(9), lb: 'khaali', win: ['busy:B#2', 'busy:A#3'] },
        },
        {
          clock: '2.00 s',
          say: 'B#2 ho gaya: ✅ <b>0.75 s</b> mein. Khidki 1 khaali. Baari Bholu Dhaba ki hai — par Bholu Dhaba ki line <b>khaali</b> hai.',
          nodes: { b: { tone: 'ok', badge: 'B#2 ✅ 0.75 s · line khaali' }, api: { tone: 'ok', badge: 'khidki 1 khaali' } },
          vars: { win: ['free', 'busy:A#3'], b: ['ok', 'ok'] },
          ask: {
            q: 'Baari Bholu Dhaba ki hai, par Bholu Dhaba ki line khaali hai. Khidki 1 kya karegi?',
            choices: [
              'Annapurna ka agla kaam (A#4) uthayegi — khaali baari aage badh jaati hai, khidki khaali nahi baithti',
              'Khaali baithegi jab tak Bholu Dhaba ka agla kaam na aaye',
              'Annapurna ko 429 degi',
              'Bholu Dhaba ki baari "jama" ho jaayegi; agli baar Bholu Dhaba ke do kaam ek saath uthenge',
            ],
            answer: 0,
            hint: 'Niyam 3 dekho. Pichhle level ki hadd mein isi jagah khidkiyan khaali baithi thi.',
            explain: 'Slow motion ki line: <code>agla: A#4 (baari B ki thi, par B ki line khaali)</code>. Bholu Dhaba ka jo hissa Bholu Dhaba ne nahi liya, woh Annapurna ko mil gaya. Kuch bekaar nahi gaya.',
          },
        },
        {
          clock: '2.25–3.00 s',
          say: '2.25 s: <b>B#3</b> aaya, Bholu Dhaba ki line mein. 2.50 s: khidki 1 khaali, baari Bholu Dhaba ki → B#3 utha. 3.00 s: ✅ 0.75 s mein.<br><br>Beech mein Annapurna ke kaam ek-ek karke chalte rahe: line 10 se 5 par aa gayi.',
          flows: [{ from: 'b', to: 'api', label: 'B#3', tone: 'ok' }, { from: 'a', to: 'api', label: 'A', tone: 'acc' }],
          nodes: { a: { tone: 'busy', badge: 'A ki line: 5' }, b: { tone: 'ok', badge: 'B#3 ✅ 0.75 s' }, api: { tone: 'busy', badge: 'baari-baari' } },
          vars: { la: A(5), win: ['busy:A#7', 'busy:A#6'], b: ['ok', 'ok', 'ok'] },
        },
        {
          clock: '3.25–5.02 s',
          say: 'Yahi chakkar do baar aur. B#4: 3.25 s par aaya, 4.00 s par ✅. B#5: 4.25 s par aaya, 5.00 s par ✅. Har baar 0.75 s.<br><br>Annapurna ka aakhri kaam (A#12): <b>5.02 s</b> par.',
          nodes: { a: { tone: 'ok', badge: '12 mein se 12 ✅ · 5.02 s' }, b: { tone: 'ok', badge: 'sab ✅ · sabse lamba 0.75 s' }, api: { tone: 'ok', badge: 'koi kaam bekaar nahi' } },
          vars: { turn: '—', la: 'khaali', lb: 'khaali', win: ['free', 'free'], b: ['ok', 'ok', 'ok', 'ok', 'ok'] },
          ask: {
            q: 'Ek line mein Annapurna ka kaam 4.02 s par khatam hua tha. Baari-baari mein 5.02 s par. Yeh 1 second kahan gaya?',
            choices: [
              'Bholu Dhaba ke chaar kaam (B#2 se B#5) beech mein baari le gaye: 4 × 0.5 s = 2 s ka kaam, do khidkiyon par = 1 s',
              'Baari ginne mein partner-api dheema ho gaya',
              'Annapurna ki do requests mana ho gayi',
              'Khidkiyan beech-beech mein khaali baithi rahi',
            ],
            answer: 0,
            hint: 'Ek line mein Bholu Dhaba ke kaam Annapurna ke baad hue the. Ab Bholu Dhaba ke kaam kab hue?',
            explain: 'Kaam utna hi hua; bas kram badla. Ek line mein Bholu Dhaba Annapurna ke peeche ruka (aur fail hua). Ab Annapurna Bholu Dhaba ki baari ke liye 1 second ruka. <b>Shor ki keemat shor karne wala deta hai.</b>',
          },
        },
        {
          clock: 'teeno niyam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>Bholu Dhaba</th><th>Annapurna</th><th>Khidkiyon ka kaam</th></tr>
              <tr><td>Sab ek line mein</td><td>7 mein se 3 ❌</td><td>12 ✅ · 4.02 s</td><td>9.50 s, usme 1.50 s bekaar</td></tr>
              <tr><td>Har tenant: 2 / second</td><td>0 ❌</td><td>2 ✅ · 10 mana</td><td>4.50 s</td></tr>
              <tr><td>Baari-baari</td><td><b>0 ❌</b></td><td><b>12 ✅</b> · 5.02 s</td><td><b>9.50 s, bekaar 0</b></td></tr>
            </table></div>
            Baari-baari mein Bholu Dhaba ka har order accept zyada se zyada <b>0.75 s</b> mein hua.`,
          nodes: { a: { tone: 'ok', badge: '12 ✅ · 1 second der se' }, b: { tone: 'ok', badge: '7 mein se 7 ✅' }, api: { tone: 'ok', badge: 'bekaar kaam: 0' } },
          vars: { b: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi teen niyam asli raftaar par (service 200/second; A 5 second tak 400/second; B, C 30/second har ek):
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>B + C: fail</th><th>B + C: sabse dheemi 1%</th><th>A ki kitni hui</th></tr>
              <tr><td>Sab ek line mein</td><td>578 mein se 233</td><td>1,031 ms</td><td>1,376</td></tr>
              <tr><td>Har tenant 80 / second</td><td>0</td><td>322 ms</td><td>721 (1,453 mana)</td></tr>
              <tr><td>Baari-baari</td><td><b>0</b></td><td><b>41 ms</b></td><td><b>1,046</b></td></tr>
            </table></div>
            Baari-baari mein A ko hadd wale niyam se <b>zyada</b> mila (1,046 banaam 721): B aur C ne jo hissa nahi liya, woh A ko gaya.<br><br>A ki 1,121 requests ko phir bhi "na" mila — par A ki <b>apni</b> line bharne se. A ki bheed sirf A ki line bharti hai.`,
          nodes: { a: { tone: 'busy', badge: 'lab: 1,046 hui' }, b: { tone: 'ok', badge: 'lab: 0 fail · 41 ms' }, api: { tone: 'ok', badge: 'lab: 200/s' } },
          vars: { turn: 'lab: A, B, C baari-baari', la: 'lab: A ki line bhari (hadd 100)', lb: 'lab: B, C ki line lagbhag khaali', win: 'lab: 4 khidkiyan', b: 'lab: 580 mein se 0 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> baari-baari mein "kaun pehle aaya" sirf <b>apni line ke andar</b> maayne rakhta hai. Tenants ke beech baari chalti hai. Shaant tenant shor karne wale ke peeche nahi rukta, aur jo baari koi nahi leta, woh bekaar nahi jaati.<br>Is tareeke ka naam <b>fair queuing</b> hai; baari ke is kram ko <b>round robin</b> kehte hain.',
    },

    /* ---------------- 2. token wali baalti ---------------- */
    {
      type: 'dryrun',
      title: '🪣 Hadd andar se — token wali baalti',
      goal: 'Level 1 ki hadd ("har tenant 2 per second") andar se kaise ginti hai? Ek baalti, kuch tokens. Do jagah pehle tumse poochha jaayega.',
      vars: [
        { id: 'tok', label: 'Baalti (zyada se zyada 2 tokens)' },
        { id: 'in', label: 'Requests aayi' },
        { id: 'ans', label: 'Jawab' },
      ],
      steps: [
        {
          clock: 'niyam',
          say: `Har tenant ki ek <b>baalti</b> hai. Niyam:
            <ul>
              <li>Baalti mein zyada se zyada <b>2 tokens</b> aate hain.</li>
              <li>Har second <b>2 naye tokens</b> tapakte hain (baalti bhari ho toh beh jaate hain).</li>
              <li>Ek request = ek token. Token hai → andar. Baalti khaali → mana (429).</li>
            </ul>
            Shuru mein baalti bhari hai.`,
          vars: { tok: tok(2), in: '—', ans: '—' },
        },
        {
          clock: '0.0 s',
          say: 'Ek tenant <b>5 requests ek saath</b> bhejta hai. Pehli do ko token mil gaya. Baaki teen ke liye baalti khaali.',
          vars: { tok: tok(0), in: '5 ek saath', ans: ['ok', 'ok', 'bad', 'bad', 'bad'] },
        },
        {
          clock: '0.6 s',
          say: '0.6 second beet gaye. Is beech koi request nahi aayi. Ab <b>2 requests</b> aati hain.',
          vars: { in: '2 (0.6 s baad)', ans: '?' },
          ask: {
            q: 'Baalti khaali ho chuki thi. 0.6 second beete; har second 2 tokens tapakte hain. In 2 requests mein se kitni andar jaayengi?',
            choices: [
              '1 — 1.2 tokens wapas aaye; ek request ek poora token leti hai',
              '2 — 0.6 second kaafi hai',
              '0 — poora ek second rukna padta hai',
              '1.2 — tokens jitni',
            ],
            answer: 0,
            hint: '0.6 second × 2 tokens har second = kitne tokens? Aur ek request ko kitna chahiye?',
            explain: '0.6 × 2 = 1.2 tokens. Pehli request: ek token liya (0.2 bacha). Doosri request: 0.2 se kaam nahi chalta → mana. Lab ka output: <code>true  false</code>.',
          },
        },
        {
          clock: '0.6 s',
          say: 'Pehli andar, doosri mana. Baalti mein 0.2 token bacha hai.',
          vars: { tok: tok(0), ans: ['ok', 'bad'] },
        },
        {
          clock: '5.6 s',
          say: 'Ab <b>5 second</b> tak koi request nahi aati. Phir <b>4 requests ek saath</b>.',
          vars: { in: '4 ek saath (5 s baad)', ans: '?' },
          ask: {
            q: '5 second mein 10 tokens tapke honge. Ab 4 requests ek saath aayi hain. Kitni andar jaayengi?',
            choices: [
              '2 — baalti mein 2 se zyada jama nahi hote, chaahe kitni der ruko',
              '4 — 10 tokens mein chaaron aa jaayengi',
              '10 — jitne tokens tapke',
              '0 — itni der baad baalti reset ho jaati hai',
            ],
            answer: 0,
            hint: 'Niyam ki pehli line dobara padho. Baalti kitni badi hai?',
            explain: 'Baalti 2 par bhar gayi; baaki 8 tokens beh gaye. Lab ka output: <code>true  true  false  false</code>. Shaant rehne se "bachat" nahi banti — bas baalti jitni.',
          },
        },
        {
          clock: 'do settings',
          say: `Is baalti ki do settings hain, aur dono alag sawaal ka jawab hain:
            <div class="dr-scroll"><table>
              <tr><th>Setting</th><th>Sawaal</th><th>Yahan</th></tr>
              <tr><td>Tokens kitni tezi se tapakte hain</td><td>Lambe samay mein tenant kitna bhej sakta hai?</td><td>2 har second</td></tr>
              <tr><td>Baalti kitni badi hai</td><td>Ek saath kitna bhej sakta hai?</td><td>2</td></tr>
            </table></div>
            Annapurna ki 12 mein se 2 isi liye andar gayi thi: baalti mein 2 tokens the, aur 0.22 second mein sirf 0.44 token wapas aaya.<br><br>Baalti ek cheez <b>nahi</b> dekhti: khidkiyan khaali hain ya nahi.`,
          vars: { tok: tok(0), in: 'Annapurna: 12, 0.22 s mein', ans: '2 andar · 10 mana' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> hadd ek baalti hai jisme tokens tapakte hain. Do settings: <b>kitni tezi se</b> (lambe samay ki raftaar) aur <b>kitni badi</b> (ek saath ki chhoot).<br>Is tareeke ka naam <b>token bucket</b> hai. Pehli setting ko <b>rate</b> kehte hain, doosri ko <b>burst</b>.',
    },

    /* ---------------- 3. alag khidki ---------------- */
    {
      type: 'cards',
      title: '🚪 Teesra tareeka — har tenant ki apni khidki',
      goal: 'Teen chhote cards. Hadd aur baari ke baad ek aur tareeka hai, sabse seedha — aur sabse mehenga.',
      steps: [
        {
          title: '1. Alag khidki mein kya hota hai?',
          say: 'Khidki 1 sirf Annapurna ki. Khidki 2 sirf Bholu Dhaba ki. Koi kisi ki khidki par nahi aata.<br><br>Slow motion mein:<ul><li>Bholu Dhaba ka har order accept <b>0.50 s</b> mein — teeno tareekon mein sabse tez. Bholu Dhaba ko pata bhi nahi chala ki Annapurna ne kuch bheja.</li><li>Annapurna ke 12 kaam ek hi khidki par: aakhri kaam <b>7.00 s</b> par. (Baari-baari mein 5.02 s.)</li></ul>',
        },
        {
          title: '2. Iski keemat kya hai?',
          say: 'Bholu Dhaba har second sirf ek request bhejta hai, jisme 0.5 second lagta hai. Yaani Bholu Dhaba ki khidki <b>aadhe samay khaali</b> baithi rahi — jabki Annapurna ki line mein 10 kaam khade the.',
          ask: {
            q: 'Annapurna ka kaam 2 second der se hua aur ek khidki aadhe samay khaali rahi. Phir bhi koi "alag khidki" kyun chunega?',
            choices: [
              'Jab ek tenant ka kaam doosre ko kisi haal mein chhoona nahi chahiye — pakka bachav chahiye, chaahe khidki khaali baithe. Jaise paise wala kaam, ya woh bada grahak jisne apni alag jagah khareedi hai',
              'Kyunki alag khidki sabse sasti padti hai',
              'Kyunki isme kul kaam sabse zyada hota hai',
              'Koi nahi chunega — baari-baari hamesha behtar hai',
            ],
            answer: 0,
            hint: 'Baari-baari mein Bholu Dhaba ka order accept 0.75 s mein hua, alag khidki mein 0.50 s. Kis tareeke mein Bholu Dhaba par Annapurna ka koi asar hi nahi tha?',
            explain: 'Baari-baari mein Bholu Dhaba ko phir bhi chalte hue kaam ke khatam hone tak rukna pada (0.25 s). Alag khidki mein bilkul nahi. Jitna pakka bachav, utni zyada khaali jagah.',
          },
        },
        {
          title: '3. Teeno tareeke, ek nazar mein',
          say: `<div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Shaant tenant</th><th>Khaali jagah</th><th>Naam</th></tr>
              <tr><td>Har tenant ki hadd</td><td>bachta hai</td><td>bekaar jaati hai</td><td>quota · rate limit · token bucket</td></tr>
              <tr><td>Har tenant ki apni line, baari-baari</td><td>bachta hai (chalte kaam ke khatam hone tak rukta hai)</td><td>doosre tenant ko mil jaati hai</td><td>fair queuing · round robin</td></tr>
              <tr><td>Har tenant ki apni khidki</td><td>poori tarah alag</td><td>khaali baithti hai</td><td>pool · <b>bulkhead</b></td></tr>
            </table></div>
            "Bulkhead" jahaaz se aaya hai: jahaaz ke pet mein alag-alag khaane hote hain, taaki ek khaane mein paani bhare toh poora jahaaz na doobe.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> teeno tareeke shaant tenant ko bachate hain. Farak yeh hai ki <b>khaali jagah ka kya hota hai</b>: hadd mein bekaar, baari mein doosre ko, alag khidki mein khaali. Aksar do saath lagte hain: baari-baari, aur uske upar ek dheeli hadd.',
    },

    /* ---------------- 4. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — chaaron niyam, slow motion mein',
      project: '39-noisy-neighbor',
      exercise: 'ex0-slowmo',
      goal: 'Jo abhi click karke dekha, wahi apni machine par chalao: 2 khidkiyan, Bholu Dhaba ka har second ek order accept, Annapurna ki 12 requests ek saath — chaar niyam (har ek 7.5 second).',
      why: '<code>lib/fair-queue.js</code> = baari-baari wali line. <code>lib/token-bucket.js</code> = token wali baalti. <code>tools/slowmo.js</code> dono ko chaar niyamon mein chalata hai. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Ghadi tay hai, isliye tumhara output dry run se milega.',
      steps: [
        { text: 'Pehle baari-baari. Har "agla:" ke aage likha hai ki baari kiski thi.', cmd: 'cd docker-labs/39-noisy-neighbor && node tools/slowmo.js --mode fair', expect: "partner-api: 2 khidkiyan, har request 500 ms (4 requests/second) · B: har second 1 request, tablet 1.5 s rukta hai · A: 1.00 s par 12 requests ek saath\n\n=== har tenant ki apni line, khidkiyan baari-baari (fair queue) ===\n          0.25 s  B#1 aaya → khidki 1 par (turant)\n          0.75 s  khidki 1: B#1 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0\n     1.00–1.22 s  A ke 12 requests aaye (menu sync): 2 seedhe khidki par, 10 line mein · A ki line: 10 · B ki line: 0\n          1.25 s  B#2 aaya → line mein · A ki line: 10 · B ki line: 1\n          1.50 s  khidki 1: A#1 ho gaya → agla: B#2 (baari B ki) · A ki line: 10 · B ki line: 0\n          1.52 s  khidki 2: A#2 ho gaya → agla: A#3 (baari A ki) · A ki line: 9 · B ki line: 0\n          2.00 s  khidki 1: B#2 ho gaya ✅ (0.75 s mein) → agla: A#4 (baari B ki thi, par B ki line khaali) · A ki line: 8 · B ki line: 0\n          2.02 s  khidki 2: A#3 ho gaya → agla: A#5 (baari B ki thi, par B ki line khaali) · A ki line: 7 · B ki line: 0\n          2.25 s  B#3 aaya → line mein · A ki line: 7 · B ki line: 1\n          2.50 s  khidki 1: A#4 ho gaya → agla: B#3 (baari B ki) · A ki line: 7 · B ki line: 0\n          2.52 s  khidki 2: A#5 ho gaya → agla: A#6 (baari A ki) · A ki line: 6 · B ki line: 0\n          3.00 s  khidki 1: B#3 ho gaya ✅ (0.75 s mein) → agla: A#7 (baari B ki thi, par B ki line khaali) · A ki line: 5 · B ki line: 0\n          3.02 s  khidki 2: A#6 ho gaya → agla: A#8 (baari B ki thi, par B ki line khaali) · A ki line: 4 · B ki line: 0\n          3.25 s  B#4 aaya → line mein · A ki line: 4 · B ki line: 1\n          3.50 s  khidki 1: A#7 ho gaya → agla: B#4 (baari B ki) · A ki line: 4 · B ki line: 0\n          3.52 s  khidki 2: A#8 ho gaya → agla: A#9 (baari A ki) · A ki line: 3 · B ki line: 0\n          4.00 s  khidki 1: B#4 ho gaya ✅ (0.75 s mein) → agla: A#10 (baari B ki thi, par B ki line khaali) · A ki line: 2 · B ki line: 0\n          4.02 s  khidki 2: A#9 ho gaya → agla: A#11 (baari B ki thi, par B ki line khaali) · A ki line: 1 · B ki line: 0\n          4.25 s  B#5 aaya → line mein · A ki line: 1 · B ki line: 1\n          4.50 s  khidki 1: A#10 ho gaya → agla: B#5 (baari B ki) · A ki line: 1 · B ki line: 0\n          4.52 s  khidki 2: A#11 ho gaya → agla: A#12 (baari A ki) · A ki line: 0 · B ki line: 0\n          5.00 s  khidki 1: B#5 ho gaya ✅ (0.75 s mein) → khidki khaali · A ki line: 0 · B ki line: 0\n          5.02 s  khidki 2: A#12 ho gaya → khidki khaali · A ki line: 0 · B ki line: 0\n          5.25 s  B#6 aaya → khidki 1 par (turant)\n          5.75 s  khidki 1: B#6 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0\n          6.25 s  B#7 aaya → khidki 1 par (turant)\n          6.75 s  khidki 1: B#7 ho gaya ✅ (0.50 s mein) → khidki khaali · A ki line: 0 · B ki line: 0\n   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.75 s\n             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 5.02 s par poora\n             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se)" },
        { text: 'Ab chaaron niyam ek ke baad ek (~30 s). Har niyam ke ant ki "nateeja" lines dekho.', cmd: 'node tools/slowmo.js', expect: "partner-api: 2 khidkiyan, har request 500 ms (4 requests/second) · B: har second 1 request, tablet 1.5 s rukta hai · A: 1.00 s par 12 requests ek saath\n\n=== sab ek hi line mein (FIFO) ===\n   nateeja → B (Bholu Dhaba): 7 mein se 4 ✅, 3 ❌ · jo poore hue unka sabse lamba intezaar 0.77 s\n             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 4.02 s par poora\n             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se) · usme se bekaar kaam: 3 requests (1.50 s)\n\n=== ek line + har tenant ki token wali baalti: 2 requests/second (quota) ===\n   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.75 s\n             A (Annapurna Foods): 12 mein se 2 ✅, 10 ko 429 (mana) — jabki khidkiyan khaali thi\n             khidkiyon ne kaam kiya 4.50 s (do khidki × 7.50 s = 15.00 s mein se)\n\n=== har tenant ki apni line, khidkiyan baari-baari (fair queue) ===\n   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.75 s\n             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 5.02 s par poora\n             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se)\n\n=== har tenant ki apni khidki: khidki 1 sirf A ki, khidki 2 sirf B ki (pool) ===\n   nateeja → B (Bholu Dhaba): 7 mein se 7 ✅, 0 ❌ · jo poore hue unka sabse lamba intezaar 0.50 s\n             A (Annapurna Foods): 12 mein se 12 ✅ · A ka aakhri kaam 7.00 s par poora\n             khidkiyon ne kaam kiya 9.50 s (do khidki × 7.50 s = 15.00 s mein se)" },
        { text: 'Sabse chhota program: baari-baari wali line aur token wali baalti, seedhe haath mein (~6 s).', cmd: 'node tools/mini.js', expect: "aane ka kram:     A#1  A#2  A#3  A#4  A#5  B#1  B#2\nuthane ka kram:   A#1  B#1  A#2  B#2  A#3  A#4  A#5\nB#1 doosre number par utha, saatven par nahi — jabki A ke paanchon kaam pehle aaye the.\n\nek saath 5 requests:   true  true  false  false  false\n0.6 s ruk ke 2 aur:    true  false\n5 s ruk ke 4 aur:      true  true  false  false   ← 5 second ruke, phir bhi 2 hi: baalti mein 2 se zyada jama nahi hote\n\nbaari ke kram mein A do baar:   A#1  B#1  A#2  A#3  B#2  A#4  A#5  B#3  A#6" },
      ],
      observe: {
        q: 'Hadd wale niyam mein khidkiyon ne 15 second mein sirf 4.50 second kaam kiya; baari-baari mein 9.50 second. Dono mein Bholu Dhaba ka koi order accept fail nahi hua. Yeh 5 second ka kaam kahan gaya?',
        choices: [
          'Annapurna ki 10 requests mana ho gayi (10 × 0.5 s = 5 s). Hadd ne in 10 requests ko roka, jabki khidkiyan khaali thi; baari-baari ne in 10 requests ko khaali baari mein kar diya',
          'Baari-baari mein khidkiyan dheemi chalti hain',
          'Hadd wale niyam mein Bholu Dhaba ne kam requests bheji',
          'Yeh farak sirf ghadi ki galti hai',
        ],
        answer: 0,
        explain: 'Shaant tenant dono mein bacha. Farak khaali jagah ka hai: hadd mein bekaar gayi, baari-baari mein Annapurna ke kaam aayi.',
      },
      lesson: 'Pehle poochho: khaali jagah ka kya ho? Bekaar jaaye (hadd), doosre ko mile (baari), ya surakshit khaali rahe (alag khidki)?',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum hadd aur baari ka farak jaante ho. 🎤',
    questions: [
      {
        q: '"Rate limiting aur fair queuing mein kya farak hai? Dono hi toh ek tenant ko rokte hain."',
        choices: [
          'Rate limit ginti par chalti hai: hadd se upar mana, chaahe system khaali ho. Fair queuing baari par chalti hai: har tenant ki apni line, kaam baari-baari; jo baari koi nahi leta woh doosre ko mil jaati hai. Pehli khaali jagah bekaar karti hai, doosri nahi',
          'Koi farak nahi — dono ek hi cheez ke do naam hain',
          'Rate limit client par lagti hai, fair queuing database par',
          'Fair queuing sirf network routers mein hoti hai',
        ],
        answer: 0,
        explain: 'Lab: hadd (80/s) → A ki 721 hui, 1,453 mana. Baari-baari → A ki 1,046 hui. Dono mein shaant tenants ke fail: 0 aur 0.',
      },
      {
        q: '"Token bucket mein rate aur burst alag-alag kyun hote hain?"',
        choices: [
          'Rate lambe samay ki raftaar tay karta hai (tokens kitni tezi se tapakte hain). Burst ek saath ki chhoot tay karta hai (baalti kitni badi). Ek tenant thodi der ke liye tez bhej sakta hai, par lagataar nahi',
          'Burst rate ka doosra naam hai',
          'Rate requests ke liye hai, burst bytes ke liye',
          'Burst sirf testing ke liye hota hai',
        ],
        answer: 0,
        explain: 'Lab ka mini program (2 har second, baalti 2): 5 ek saath → 2 andar. 0.6 s baad 2 → 1 andar. 5 s ruk ke 4 → phir bhi 2 hi.',
      },
    ],
  },
  success: [
    'Baari-baari ka niyam teen line mein bata sakte ho, aur khaali baari ka kya hota hai',
    'Token wali baalti ki do settings aur unka kaam bata sakte ho',
    'Hadd, baari aur alag khidki ko "khaali jagah ka kya hota hai" se alag kar sakte ho',
  ],
  cards: [
    { front: 'Baari-baari (fair queuing) ka niyam?', back: 'Har tenant ki apni line. Khidki khaali → jis tenant ki baari hai, us tenant ka ek kaam; phir wahi tenant kram mein peeche. Baari hai par line khaali → agle tenant ko. Slow motion: Bholu Dhaba 0 fail, Annapurna 12 ✅ (1 s der se).' },
    { front: 'Khaali baari ka kya hota hai?', back: 'Doosre tenant ko mil jaati hai. Isliye baari-baari mein khaali jagah bekaar nahi jaati. Lab: A ki 1,046 hui (hadd mein 721).' },
    { front: 'Token bucket ki do settings?', back: '<b>Rate</b>: tokens kitni tezi se tapakte hain — lambe samay ki raftaar. <b>Burst</b>: baalti kitni badi — ek saath kitna. Shaant rehne se baalti se zyada jama nahi hota.' },
    { front: 'Hadd · baari · alag khidki — khaali jagah ka kya?', back: 'Hadd (quota): bekaar jaati hai. Baari (fair queue): doosre ko milti hai. Alag khidki (pool / bulkhead): khaali baithti hai, par bachav sabse pakka.' },
    { front: 'Baari-baari mein shor ki keemat kaun deta hai?', back: 'Shor karne wala. Slow motion: Annapurna ka kaam 4.02 s ki jagah 5.02 s par khatam hua; Bholu Dhaba ka har order accept ≤ 0.75 s. Lab: A ki 1,121 requests ko "na" — A ki apni line bharne se.' },
  ],
},
]);

})();
