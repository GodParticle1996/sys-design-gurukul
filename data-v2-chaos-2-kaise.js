/* =====================================================================
   🛡️ Playlist · 1 Resilience — Chaos Engineering · level 2: KAISE
   Ek prayog ka dhancha (aam din ka haal → andaaza → ek chot → nazar → band karna), aur har chot alag kami dikhati hai
   (mara hua · dheema · aadha-zinda instance).
   Har step docker-labs/42-chaos ke asli run se hai: `node tools/slowmo-experiment.js`, `node tools/slowmo-faults.js`;
   asli raftaar = tools/faults.js (ex2), tools/experiment.js (ex3).
   ===================================================================== */
(function () {

const NODES = [
  { id: 'lb', icon: '🚦', label: 'load balancer', x: 160, y: 180 },
  { id: 'i1', icon: '🖥️', label: 'instance 1', x: 690, y: 65 },
  { id: 'i2', icon: '🖥️', label: 'instance 2', x: 690, y: 180 },
  { id: 'i3', icon: '🖥️', label: 'instance 3', x: 690, y: 290 },
];
const EDGES = [{ from: 'lb', to: 'i1' }, { from: 'lb', to: 'i2' }, { from: 'lb', to: 'i3' }];
const VIZ = { w: 890, h: 365, focus: ['i1', 'i2', 'i3'] };   // phone par instances hamesha dikhein
const to = (i, label, tone) => [{ from: 'lb', to: 'i' + i, label, tone: tone || 'ok' }];

VISUALS['ch-kaise'] = {
  t: 'Instance 2 health check ko "theek hoon" kehta hai, par asli kaam par 500 deta hai. Naap 60% par gira — prayog rok diya gaya',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { lb: { tone: 'slow', badge: 'naap: 60% → roko' }, i1: { tone: 'ok', badge: '' }, i2: { tone: 'bad', badge: 'health ✓ · kaam ✗' }, i3: { tone: 'ok', badge: '' } },
    flows: [{ from: 'lb', to: 'i2', label: '#11 ✗', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'ch-kaise',
  icon: '🧪',
  group: '🐒 Chaos Engineering',
  title: 'Chaos 2 · Kaise — prayog ka dhancha, aur har chot alag kami dikhati hai',
  badge: 'Prayog Ustaad',
  objectives: [
    'Ek chaos prayog ke kadam kya hain — aur "kuch bhi tod do" se yeh kaise alag hai?',
    'Band karne ka button kya bachata hai?',
    'Mara hua instance pakda gaya. Dheema ya aadha-zinda instance health check se kyun nikal jaata hai?',
    'Steady state, hypothesis, abort, blast radius, passive health check: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🧪 Todna aasaan hai. Prayog karna alag cheez hai.</h3>
     <p>Pichhle level mein ek instance mara aur kami mili: health check aur retry nahi the. Team ne dono laga diye. Ab daava hai: <b>"ab hum safe hain."</b></p>
     <p>Is daave ko parakhne ke do tareeke hain. Ek: production mein kuch bhi tod do aur dekho kya hota hai. Doosra: ek <b>prayog</b> — jisme pehle se likha ho ki kya naapna hai, kya ummeed hai, aur kab rukna hai.</p>
     <pre>lab, asli raftaar (100 requests/second, ek instance aadha-zinda, teen run):
prayog, band karne ke niyam ke saath   → 0.5 second mein roka gaya · 17 requests giri
wahi chot, niyam ke bina               → 6.0 second chali       · 200 requests giri</pre>
     <p>Dono ne wahi kami dikhayi. Farak sirf itna tha ki kami dekhne ki keemat kitni chukayi gayi.</p>
     <p class="tip">👉 Is level mein do slow motion hain: pehle prayog ka dhancha, phir teen alag tarah ki chot.</p>`,
  ],
  stages: [
    /* ---------------- 1. prayog ka dhancha ---------------- */
    {
      type: 'dryrun',
      title: '🧪 Prayog ka dhancha — aur band karne ka button',
      goal: 'Setup: 3 instances + health check (retry abhi nahi). Har click = prayog ka ek kadam. Dekho ki <b>kya naapa gaya</b>, aur <b>kis naap par kya faisla hua</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'step', label: 'Prayog ka kadam' },
        { id: 'naap', label: 'Naap: pichhle 1 s mein safal' },
        { id: 'i2', label: 'Instance 2' },
        { id: 'fail', label: 'Fail hui requests' },
        { id: 'verdict', label: 'Faisla' },
      ],
      steps: [
        {
          clock: 'paanch kadam',
          say: `Ek prayog ke paanch kadam:
            <ol>
              <li><b>Aam din ka haal naapo</b> — number mein.</li>
              <li><b>Andaaza likho</b> — number mein: "ek instance bimaar ho, toh bhi kam se kam 90% requests safal."</li>
              <li><b>Ek chot do</b> — sirf ek.</li>
              <li><b>Dekhte raho.</b> Naap ek hadd se neeche jaaye (yahan: 70%), toh turant roko.</li>
              <li><b>Chot wapas lo</b>, aur faisla likho.</li>
            </ol>`,
          nodes: { lb: { tone: 'ok', badge: 'health check hai' }, i1: { tone: 'ok', badge: 'chal raha hai' }, i2: { tone: 'ok', badge: 'chal raha hai' }, i3: { tone: 'ok', badge: 'chal raha hai' } },
          vars: { step: '—', naap: '—', i2: 'chal raha hai', fail: '0', verdict: '—' },
        },
        {
          clock: '2.00 s · naapo, phir chot',
          say: `<pre>2.00 s  🔬 prayog shuru — pehle naapo, hypothesis: kam se kam 90% safal
2.00 s  📏 naap: pichhle 1 s mein 5 requests, 5 safal = 100%
2.00 s  💥 inject: instance 2 zombie bana (/health ✓, /work 500)</pre>
            Aam din ka haal 100% hai, toh prayog aage badha. Chot: instance 2 ab <b>aadha-zinda</b> hai — health check ko "theek hoon" kehta hai, par asli kaam par 500 deta hai.`,
          nodes: { lb: { tone: 'acc', badge: 'naap: 100%' }, i2: { tone: 'bad', badge: 'health ✓ · kaam ✗' } },
          vars: { step: '1–3: naapa (100%) · chot di', naap: '100%', i2: '🧟 aadha-zinda (2.00 s se)' },
          ask: {
            q: 'Load balancer har 0.3 second par health check chala raha hai. Kya health check instance 2 ko list se hata dega?',
            choices: [
              'Nahi. Instance 2 health check ko "theek hoon" hi keh raha hai. Health check ko yeh kharabi dikhti hi nahi',
              'Haan — do baar poochhne ke baad',
              'Haan — turant',
              'Health check instance 2 ko restart kar dega',
            ],
            answer: 0,
            hint: 'Health check kaunsa raasta kholta hai? Aur kharabi kaunse raaste mein hai?',
            explain: 'Slow motion: <code>2.25 s #11 → instance 2 ✗ jawab 500</code>, aur uske turant baad <code>2.30 s 🩺 health: 1 ✓ · 2 ✓ · 3 ✓</code>. Health check ke liye sab theek hai.',
          },
        },
        {
          clock: '3.00 s · naap',
          say: `Ek second mein instance 2 ki baari do baar aayi: #11 aur #14. Dono giri.
            <pre>3.00 s  📏 naap: pichhle 1 s mein 5 requests, 3 safal = 60%</pre>`,
          flows: to(2, '#14 ✗', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'naap: 60%' } },
          vars: { step: '4: dekh rahe hain', naap: '60%', fail: '2 (#11, #14)' },
          ask: {
            q: 'Andaaza tha: kam se kam 90%. Naap aaya: 60%. Rokne ki hadd: 70%. Ab kya hona chahiye?',
            choices: [
              'Turant roko aur chot wapas lo. Andaaza galat nikal chuka hai — aur requests girane se kuch naya nahi seekhenge',
              'Poore 4 second chalne do — plan yahi tha',
              'Hadd ko 50% kar do aur chalne do',
              'Ek aur instance ko bhi chot do',
            ],
            answer: 0,
            hint: 'Prayog ka maqsad kya tha: andaaza parakhna. Kya woh parakh ho chuki?',
            explain: 'Slow motion: <code>3.00 s 🛑 60% &lt; 70% — abort rule lagi</code>, <code>↩️ rollback: instance 2 theek kiya</code>, <code>📋 faisla: ABORT</code>.',
          },
        },
        {
          clock: '3.00 s · band',
          say: 'Prayog ruk gaya. Chot sirf <b>1.00 second</b> chali, aur <b>2 requests</b> giri.<br><br>Aur kami mil gayi: health check aadhe-zinda instance ko nahi pakadta.',
          flows: to(2, '✓', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'roka · chot wapas' }, i2: { tone: 'ok', badge: 'theek kiya' } },
          vars: { step: '5: chot wapas, faisla', naap: '60% (hadd 70%)', i2: 'theek kiya (3.00 s par)', fail: '2', verdict: 'ABORT — 1.00 s mein roka' },
        },
        {
          clock: 'button na hota toh?',
          say: `Wahi prayog, rokne ke niyam ke bina. Chot poore 4 second chali:
            <div class="dr-scroll"><table>
              <tr><th>Prayog</th><th>Naap (har second)</th><th>Chot kitni der chali</th><th>Requests giri</th><th>Faisla</th></tr>
              <tr><td>Rokne ke niyam ke saath</td><td>60%</td><td>1.00 s</td><td><b>2</b></td><td>ABORT</td></tr>
              <tr><td>Niyam ke bina</td><td>60 · 80 · 60 · 60%</td><td>4.00 s</td><td><b>7</b></td><td>hypothesis toota</td></tr>
            </table></div>
            Dono ne ek hi baat batayi: andaaza galat tha. Doosre ne yeh batane ke liye 5 requests aur girayi.`,
          nodes: { lb: { tone: 'slow', badge: '2 banaam 7 giri' }, i2: { tone: 'bad', badge: '4.00 s tak bimaar' } },
          vars: { step: 'niyam ke bina', naap: '60 · 80 · 60 · 60%', i2: '4.00 s tak aadha-zinda', fail: '7 (niyam ke saath: 2)', verdict: 'hypothesis toota' },
        },
        {
          clock: 'jab andaaza sahi nikle',
          say: 'Ab setup mein retry bhi hai (health check + retry). Wahi chot, wahi andaaza.<br><br>Har naap: <b>100%</b>. Instance 2 par gayi har request agle instance par dobara bheji gayi — 7 baar. Faisla: <b>hypothesis tika</b>.<br><br>Yeh "boring" nateeja hi asli inaam hai. Pehle team <i>maanti</i> thi ki aadha-zinda instance sambhal jaayega; ab team <i>jaanti</i> hai.',
          flows: to(3, 'dobara ✓', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'naap: 100%' }, i2: { tone: 'bad', badge: 'health ✓ · kaam ✗' }, i3: { tone: 'ok', badge: 'dobara yahan' } },
          vars: { step: 'retry ke saath', naap: '100 · 100 · 100 · 100%', i2: 'aadha-zinda (4.00 s)', fail: '0 (retry ne 7 bachayi)', verdict: 'hypothesis tika' },
        },
        {
          clock: 'jab shuru hi na karna ho',
          say: 'Ek aur din. Prayog shuru hone se pehle hi instance 3 aadha-zinda hai — aur kisi ne dekha nahi.<br><br>Prayog ka pehla kadam: aam din ka haal naapo.',
          nodes: { lb: { tone: 'slow', badge: 'naap: 60%' }, i2: { tone: 'ok', badge: 'chal raha hai' }, i3: { tone: 'bad', badge: 'pehle se bimaar' } },
          vars: { step: '1: naapo', naap: '60%', i2: 'chal raha hai', fail: '—', verdict: '?' },
          ask: {
            q: 'Chot dene se pehle naap aaya: 60%. Andaaza tha "kam se kam 90%". Kya karna chahiye?',
            choices: [
              'Chot mat do. System pehle se bimaar hai: ab todoge toh pata nahi chalega ki nuksaan chot se hua ya purani bimaari se — aur grahakon ka nuksaan aur badhega',
              'Chot do — prayog ka time fix tha',
              'Andaaze ko 50% kar do, phir chot do',
              'Do instances ko ek saath chot do',
            ],
            answer: 0,
            hint: 'Prayog mein "pehle" aur "baad" ka muqabla hota hai. "Pehle" hi kharab ho toh?',
            explain: 'Slow motion: <code>2.00 s 📏 naap: pichhle 1 s mein 5 requests, 3 safal = 60%</code>, <code>📋 faisla: shuru hi mat karo</code>. Chot kabhi di hi nahi gayi. Aur ek purani bimaari mil gayi — bina kuch tode.',
          },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi prayog, asli services par: 100 requests/second, ek instance aadha-zinda. Lab ke number thode alag hain: andaaza "kam se kam 95%", rokne ki hadd 80%, naap har 0.5 second par, chot 6 second tak. (Teen run.)
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Rokne ka niyam</th><th>Chot kitni der</th><th>Requests giri</th><th>Faisla</th></tr>
              <tr><td>Sirf health check</td><td>hai</td><td>0.5 s</td><td><b>17</b></td><td>ABORT</td></tr>
              <tr><td>Sirf health check</td><td>nahi</td><td>6.0 s</td><td><b>200</b></td><td>hypothesis toota</td></tr>
              <tr><td>Health check + retry</td><td>hai</td><td>6.0 s</td><td>0</td><td>hypothesis tika</td></tr>
              <tr><td>Ek instance pehle se bimaar</td><td>hai</td><td>chot di hi nahi</td><td>0</td><td>shuru hi mat karo (aam din ka haal: 68%)</td></tr>
            </table></div>`,
          nodes: { lb: { tone: 'ok', badge: 'lab: 17 banaam 200' }, i2: { tone: 'ok', badge: '' }, i3: { tone: 'ok', badge: '' } },
          vars: { step: 'lab: chaaron', naap: 'lab: har thodi der mein', i2: 'lab: aadha-zinda', fail: 'lab: 17 (niyam) banaam 200 (bina)', verdict: 'lab: ABORT · hypothesis toota · hypothesis tika' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> prayog = aam din ka naap + likha hua andaaza + <b>ek</b> chot + nazar + band karne ka button. Button ke bina yeh prayog nahi, outage hai.<br>Naam: aam din ka naap = <b>steady state</b> · andaaza = <b>hypothesis</b> · rokne ka niyam = <b>abort</b> (ya stop condition) · kitni requests gir sakti hain = <b>blast radius</b>.',
    },

    /* ---------------- 2. teen tarah ki chot ---------------- */
    {
      type: 'dryrun',
      title: '🩹 Har chot alag kami dikhati hai',
      goal: 'Wahi teen instances, wahi 1.00 s se 3.00 s tak instance 2 bimaar. Par bimaari teen tarah ki. Har baar dekho: <b>health check ne pakda ya nahi</b>, aur <b>grahak ko kya mila</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'chot', label: 'Chot' },
        { id: 'setup', label: 'Setup' },
        { id: 'hc', label: 'Health check ne instance 2 ko hataya?' },
        { id: 'res', label: 'Nateeja (25 requests)' },
        { id: 'slow', label: 'Sabse dheemi request' },
      ],
      steps: [
        {
          clock: 'pehli chot: mar gaya',
          say: 'Setup ab poora hai: health check + retry. Instance 2 <b>mar gaya</b> — wahi chot jo pichhle level mein thi.<br><br>0 requests giri. Health check ne 1.40 s par instance 2 ko list se hata diya; us se pehle ki ek request retry ne bacha li. Sabse dheemi request: 11 ms.<br><br>Team: "dekh liya, hum safe hain."',
          nodes: { lb: { tone: 'ok', badge: 'health check + retry' }, i1: { tone: 'ok', badge: '' }, i2: { tone: 'bad', badge: 'mar gaya' }, i3: { tone: 'ok', badge: '' } },
          vars: { chot: 'instance mar gaya', setup: 'health check + retry', hc: 'haan — 1.40 s par', res: '0 fail', slow: '11 ms' },
          ask: {
            q: 'Ab instance 2 mare nahi, bas <b>dheema</b> ho jaaye: asli kaam mein 2 second lagein (load balancer 0.5 second se zyada nahi rukta), par "theek ho?" ka jawab turant de. Health check kya karega?',
            choices: [
              'Kuch nahi. "Theek ho?" ka jawab turant aa raha hai, toh health check ke liye instance 2 theek hai',
              'Do baar poochh ke instance 2 ko hata dega',
              'Instance 2 ko restart kar dega',
              'Instance 2 ko aadha traffic dega',
            ],
            answer: 0,
            hint: 'Health check kya naapta hai: asli kaam ki raftaar, ya "theek ho?" ka jawab?',
            explain: 'Slow motion ke nateeje ki line: <code>health check ne instance 2 ko bahar kiya: kabhi nahi</code>. Dheema instance health check ke saamne se nikal gaya.',
          },
        },
        {
          clock: 'doosri chot: dheema',
          say: `Instance 2 dheema. Health check + retry:
            <pre>1.05 s  #5  → instance 2 ✗ timeout → dobara instance 3 ✓              510 ms</pre>
            #5, #8, #11, #14 — chaaron ke saath yahi hua. <b>0 fail</b>, par in chaar grahakon ko jawab 10 ms ki jagah <b>510 ms</b> mein mila: pehle 0.5 second ka intezaar, phir dobara koshish.`,
          flows: to(2, 'timeout', 'slow'),
          nodes: { i2: { tone: 'slow', badge: 'dheema · list mein' } },
          vars: { chot: 'instance dheema', hc: 'kabhi nahi', res: '0 fail · 4 requests retry se bachi', slow: '510 ms' },
        },
        {
          clock: 'retry na ho toh?',
          say: `Wahi dheema instance, par setup mein sirf health check (retry nahi):
            <pre>1.05 s  #5  → instance 2 ✗ timeout                                    500 ms</pre>
            <b>4 requests giri</b> — har teesri, poore 2 second. Bilkul waise jaise pichhle level mein health check ke bina hua tha.`,
          flows: to(2, '#5 ✗', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'sirf health check' } },
          vars: { setup: 'sirf health check', res: '4 fail (#5, #8, #11, #14)', slow: '500 ms' },
          ask: {
            q: 'Health check laga hua hai. Phir bhi har teesri request 2 second tak girti rahi. Health check ne instance 2 ko kyun nahi hataya?',
            choices: [
              'Health check "theek ho?" wala raasta kholta hai, aur us raaste par jawab turant aa raha hai. Asli kaam dheema hai — par health check asli kaam ko dekhta hi nahi',
              'Health check band ho gaya tha',
              'Health check ka fasla bahut lamba tha',
              'Instance 2 ne health check ko rok diya',
            ],
            answer: 0,
            hint: 'Do alag raaste hain: ek "theek ho?" ka, ek asli kaam ka. Kharabi kis mein hai? Health check kise kholta hai?',
            explain: 'Health check sirf wahi jaanta hai jo instance apne baare mein <b>kehta</b> hai. Instance asli kaam mein kya <b>kar raha hai</b>, yeh health check ko nahi dikhta.',
          },
        },
        {
          clock: 'teesri chot: aadha-zinda',
          say: `Instance 2 aadha-zinda: "theek ho?" par "haan", asli kaam par 500.
            <div class="dr-scroll"><table>
              <tr><th>Setup</th><th>Requests giri</th><th>Health check ne hataya?</th></tr>
              <tr><td>Sirf health check</td><td>4</td><td>kabhi nahi</td></tr>
              <tr><td>Health check + retry</td><td>0 (4 retry se bachi, har ek 20 ms)</td><td>kabhi nahi</td></tr>
            </table></div>
            Retry ne grahak ko bacha liya. Par instance 2 poore 2 second list mein raha, aur har teesri request pehle us par gayi.`,
          nodes: { lb: { tone: 'ok', badge: 'dono setup' }, i2: { tone: 'bad', badge: 'health ✓ · kaam ✗' } },
          vars: { chot: 'instance aadha-zinda', setup: 'dono', hc: 'kabhi nahi', res: '4 fail (retry ke bina) · 0 (retry ke saath)', slow: '20 ms' },
        },
        {
          clock: 'ilaaj: poochho mat, dekho',
          say: `Ek naya niyam load balancer mein: <b>jis instance par 2 asli requests lagataar fail hon, us instance ko 2 second ke liye list se hata do</b> — "theek ho?" ka jawab kuch bhi ho.
            <pre>2.15 s  ⏏️ instance 2: 2 request lagataar fail → 2.00 s ke liye BAHAR (passive ejection)
4.15 s  ⏏️ instance 2: 2.00 s poore → rotation mein WAPAS (phir se try hoga)</pre>
            Dheeme instance par ab sirf <b>2</b> requests pahunchi (pehle 4). Aadhe-zinda instance ko yeh niyam aur jaldi pakadta hai: 1.66 s par. Wajah: 500 ka jawab turant aata hai, jabki timeout ke liye har baar 0.5 second rukna padta hai.`,
          flows: to(3, '✓', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'asli requests dekhta' }, i2: { tone: 'idle', badge: '2 s ke liye bahar' } },
          vars: { chot: 'dheema (aur aadha-zinda)', setup: 'health check + retry + naya niyam', hc: 'nahi — naye niyam ne hataya (2.15 s)', res: '0 fail · sirf 2 requests bimaar instance tak', slow: '510 ms' },
          ask: {
            q: 'Yeh naya niyam health check se kaise alag hai?',
            choices: [
              'Health check <b>poochhta</b> hai ("theek ho?"). Naya niyam <b>dekhta</b> hai ki asli requests ka kya hua. Jo instance sirf asli kaam mein kharab hai, woh dekhne se pakda jaata hai, poochhne se nahi',
              'Koi farak nahi — dono ek hi cheez hain',
              'Naya niyam instance ko restart karta hai',
              'Naya niyam sirf mare hue instance ke liye hai',
            ],
            answer: 0,
            hint: 'Dono niyam kis cheez ko dekh ke faisla karte hain?',
            explain: 'Health check = poochhna. Naya niyam = asli requests ke nateeje dekhna. Dono chahiye: mara hua instance poochhne se jaldi pakda jaata hai; dheema aur aadha-zinda instance dekhne se.',
          },
        },
        {
          clock: 'teen chot, teen setup',
          say: `Slow motion ka poora hisaab (25 requests; instance 2 seconds 1.00–3.00 tak bimaar):
            <div class="dr-scroll"><table>
              <tr><th>Chot</th><th>Sirf health check</th><th>+ retry</th><th>+ asli requests dekhna</th></tr>
              <tr><td>Mar gaya</td><td>1 fail</td><td>0 fail</td><td>—</td></tr>
              <tr><td>Dheema</td><td><b>4 fail</b></td><td>0 fail · 4 requests 510 ms</td><td>0 fail · 2 requests 510 ms</td></tr>
              <tr><td>Aadha-zinda</td><td><b>4 fail</b></td><td>0 fail · 4 bimaar instance tak</td><td>0 fail · 2 bimaar instance tak</td></tr>
            </table></div>
            Pehli row dekh ke team ne kaha tha "hum safe hain". Agli do rows ne doosri kahaani sunayi.`,
          nodes: { lb: { tone: 'ok', badge: 'teen chot' }, i2: { tone: 'slow', badge: '' } },
          vars: { chot: 'teeno', setup: 'teeno', hc: 'sirf "mar gaya" mein', res: 'upar ki table', slow: '11 ms · 510 ms · 20 ms' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi, asli raftaar par: 100 requests/second, ek instance 4 second ke liye bimaar. Us dauraan 400 requests aayi; har teesri (133) ki baari bimaar instance ki thi. (Teen run.)
            <div class="dr-scroll"><table>
              <tr><th>Chot</th><th>Sirf health check: giri</th><th>+ retry: giri</th><th>+ retry: sabse dheemi 1%</th><th>Bimaar instance tak pahunchi (retry → + dekhna)</th></tr>
              <tr><td>Mar gaya</td><td>12</td><td>0</td><td>16 ms</td><td>11 → 2</td></tr>
              <tr><td>Dheema</td><td><b>133–134</b></td><td>0</td><td><b>515–517 ms</b></td><td>133 → 36</td></tr>
              <tr><td>Aadha-zinda</td><td><b>133</b></td><td>0</td><td>27–28 ms</td><td>133 → 4</td></tr>
            </table></div>`,
          vars: { chot: 'lab: teeno', setup: 'lab: teeno', hc: 'lab: sirf "mar gaya" mein', res: 'lab: 12 · 133–134 · 133 giri (sirf health check)', slow: 'lab: dheema + retry → 515–517 ms' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> "ek instance maar ke dekh liya" kaafi nahi. Mara hua instance sabse <b>aasaan</b> bimaari hai. Dheema aur aadha-zinda instance health check ke saamne se nikal jaate hain — isliye chot badal-badal ke do.<br>Asli requests ke nateeje dekh ke instance ko hatane ka naam: <b>passive health check</b> (ya outlier detection).',
    },

    /* ---------------- 3. kram ---------------- */
    {
      type: 'order',
      title: 'Prayog ke kadam — sahi kram mein',
      instructions: 'Ek chaos prayog ke kadam sahi kram mein lagao.',
      steps: [
        { text: 'Aam din ka haal naapo — number mein (jaise: 100% requests safal)', explain: 'Iske bina "pehle" aur "baad" ka muqabla hi nahi ho sakta. Aur naap pehle se kharab ho, toh yahin ruk jao.' },
        { text: 'Andaaza likho — number mein — aur rokne ki hadd bhi', explain: 'Slow motion: andaaza "kam se kam 90%", hadd "70% se neeche gaya toh roko".' },
        { text: 'Ek chot do — sirf ek, chhote daayre mein', explain: 'Ek saath do cheezein todoge toh pata nahi chalega ki nuksaan kis se hua.' },
        { text: 'Naapte raho; naap hadd se neeche jaaye toh turant roko', explain: 'Slow motion: 60% &lt; 70% → 1.00 s mein roka, 2 requests giri (rokne ke niyam ke bina: 7).' },
        { text: 'Chot wapas lo — chahe prayog poora hua ho ya beech mein roka gaya ho', explain: 'Wapas lena hamesha chalta hai. Code mein yeh "finally" ke andar hai (agla level).' },
        { text: 'Faisla likho: andaaza tika ya toota — aur toota, toh kaunsi kami mili', explain: 'Tika → ab daava nahi, saboot hai. Toota → ek kami mili, incident se pehle.' },
      ],
    },

    /* ---------------- 4. asli tool par ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — prayog aur chot, slow motion mein',
      project: '42-chaos',
      exercise: 'ex0-slowmo',
      goal: 'Jo click karke dekha, wahi apni machine par: pehle pichhle level wala "teen instances, ek mara", phir woh prayog jo beech mein roka gaya, phir dheema instance (sirf health check ke saath), phir wahi dheema instance naye niyam ke saath.',
      why: '<code>lib/experiment.js</code> = prayog ka dhancha. <code>lib/rotation.js</code> = load balancer ke niyam (health check, retry, asli requests dekh ke hatana). Slow motion tools aur asli services, dono yahi files chalate hain. Koi service nahi chalani, Docker nahi chahiye — sirf Node 18+. Ghadi tay hai, isliye tumhara output dry run se milega. <code>--fast</code> lagao toh tool bina ruke chalta hai.',
      steps: [
        { text: 'Pichhle level wala: teen instances, health check nahi, instance 2 mara. Har teesri request ✗.', cmd: 'cd docker-labs/42-chaos && node tools/slowmo.js --mode three', expect: "har 0.2 s par ek request, baari-baari · 1.00 s par instance 2 mara, 3.00 s par wapas (jahan sirf ek instance hai, wahi marta hai) · health check har 0.3 s par\n\n=== 3 instances, health check nahi ===\n    0.25 s  #1  → instance 1 ✓\n    0.45 s  #2  → instance 2 ✓\n    0.65 s  #3  → instance 3 ✓\n    0.85 s  #4  → instance 1 ✓\n    1.00 s  💥 instance 2 mar gaya\n    1.05 s  #5  → instance 2 ✗ (connection toota)\n    1.25 s  #6  → instance 3 ✓\n    1.45 s  #7  → instance 1 ✓\n    1.65 s  #8  → instance 2 ✗ (connection toota)\n    1.85 s  #9  → instance 3 ✓\n    2.05 s  #10 → instance 1 ✓\n    2.25 s  #11 → instance 2 ✗ (connection toota)\n    2.45 s  #12 → instance 3 ✓\n    2.65 s  #13 → instance 1 ✓\n    2.85 s  #14 → instance 2 ✗ (connection toota)\n    3.00 s  ✅ instance 2 wapas chalu\n    3.05 s  #15 → instance 3 ✓\n    3.25 s  #16 → instance 1 ✓\n    3.45 s  #17 → instance 2 ✓\n    3.65 s  #18 → instance 3 ✓\n    3.85 s  #19 → instance 1 ✓\n    4.05 s  #20 → instance 2 ✓\n    4.25 s  #21 → instance 3 ✓\n    4.45 s  #22 → instance 1 ✓\n    4.65 s  #23 → instance 2 ✓\n    4.85 s  #24 → instance 3 ✓\n    5.05 s  #25 → instance 1 ✓\n   nateeja → 25 requests · 4 fail · sabse lamba lagataar fail: 1 · retry se bachi: 0\n             health check nahi hai — mara hua bhi rotation mein hi raha" },
        { text: 'Prayog jo roka gaya. 3.00 s wali chaar lines dekho.', cmd: 'node tools/slowmo-experiment.js --mode abort', expect: "3 instances, baari-baari, har 0.2 s par ek request · prayog 2.00 s par · hypothesis ≥ 90% safal · abort rule < 70% · fault 4 s tak dekhna\n\n=== sirf health check · abort rule laga hai ===\n    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.25 s  #1  → instance 1 ✓\n    0.45 s  #2  → instance 2 ✓\n    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.65 s  #3  → instance 3 ✓\n    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.85 s  #4  → instance 1 ✓\n    1.05 s  #5  → instance 2 ✓\n    1.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.25 s  #6  → instance 3 ✓\n    1.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.45 s  #7  → instance 1 ✓\n    1.65 s  #8  → instance 2 ✓\n    1.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.85 s  #9  → instance 3 ✓\n    2.00 s  🔬 prayog shuru — pehle naapo, hypothesis: kam se kam 90% safal\n    2.00 s  📏 naap: pichhle 1 s mein 5 requests, 5 safal = 100%\n    2.00 s  💥 inject: instance 2 zombie bana (/health ✓, /work 500)\n    2.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.05 s  #10 → instance 1 ✓\n    2.25 s  #11 → instance 2 ✗ jawab 500\n    2.30 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.45 s  #12 → instance 3 ✓\n    2.60 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.65 s  #13 → instance 1 ✓\n    2.85 s  #14 → instance 2 ✗ jawab 500\n    2.90 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.00 s  📏 naap: pichhle 1 s mein 5 requests, 3 safal = 60%\n    3.00 s  🛑 60% < 70% — abort rule lagi\n    3.00 s  ↩️ rollback: instance 2 theek kiya\n    3.00 s  📋 faisla: ABORT\n    3.05 s  #15 → instance 3 ✓\n    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.25 s  #16 → instance 1 ✓\n    3.45 s  #17 → instance 2 ✓\n    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.65 s  #18 → instance 3 ✓\n    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.85 s  #19 → instance 1 ✓\n   nateeja → faisla: ABORT (roka: 1.00 s par) · fault 1.00 s chala · fail hui requests (blast radius): 2\n             steady state 100% · sabse kharab naap 60% · naap liye: 1 · retry se bachi: 0" },
        { text: 'Dheema instance, sirf health check. Har request ki line ke aakhir mein us request ka samay likha hai.', cmd: 'node tools/slowmo-faults.js --mode slow-hc', expect: "3 instances · har 0.2 s par ek request, baari-baari · 1.00 s se 3.00 s tak instance 2 par fault · timeout 0.5 s · health check har 0.3 s par\n\n=== slow — /work 2 s leta hai, /health tez · sirf health check ===\n    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.25 s  #1  → instance 1 ✓                                             10 ms\n    0.45 s  #2  → instance 2 ✓                                             10 ms\n    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.65 s  #3  → instance 3 ✓                                             10 ms\n    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.85 s  #4  → instance 1 ✓                                             10 ms\n    1.00 s  💥 instance 2 par slow fault shuru\n    1.05 s  #5  → instance 2 ✗ timeout                                    500 ms\n    1.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.25 s  #6  → instance 3 ✓                                             10 ms\n    1.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.45 s  #7  → instance 1 ✓                                             10 ms\n    1.65 s  #8  → instance 2 ✗ timeout                                    500 ms\n    1.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.85 s  #9  → instance 3 ✓                                             10 ms\n    2.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.05 s  #10 → instance 1 ✓                                             10 ms\n    2.25 s  #11 → instance 2 ✗ timeout                                    500 ms\n    2.30 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.45 s  #12 → instance 3 ✓                                             10 ms\n    2.60 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.65 s  #13 → instance 1 ✓                                             10 ms\n    2.85 s  #14 → instance 2 ✗ timeout                                    500 ms\n    2.90 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.00 s  ✅ instance 2 theek\n    3.05 s  #15 → instance 3 ✓                                             10 ms\n    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.25 s  #16 → instance 1 ✓                                             10 ms\n    3.45 s  #17 → instance 2 ✓                                             10 ms\n    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.65 s  #18 → instance 3 ✓                                             10 ms\n    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.85 s  #19 → instance 1 ✓                                             10 ms\n    4.05 s  #20 → instance 2 ✓                                             10 ms\n    4.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.25 s  #21 → instance 3 ✓                                             10 ms\n    4.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.45 s  #22 → instance 1 ✓                                             10 ms\n    4.65 s  #23 → instance 2 ✓                                             10 ms\n    4.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.85 s  #24 → instance 3 ✓                                             10 ms\n    5.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    5.05 s  #25 → instance 1 ✓                                             10 ms\n   nateeja → 25 requests · 4 fail · retry se bachi: 0 · sabse dheemi request: 500 ms · kharab instance tak pahunchi: 4\n             health check ne instance 2 ko bahar kiya: kabhi nahi · passive ejection ne: kabhi nahi" },
        { text: 'Wahi dheema instance, par load balancer asli requests dekh ke hata deta hai. ⏏️ wali do lines dekho.', cmd: 'node tools/slowmo-faults.js --mode eject', expect: "3 instances · har 0.2 s par ek request, baari-baari · 1.00 s se 3.00 s tak instance 2 par fault · timeout 0.5 s · health check har 0.3 s par\n\n=== slow — /work 2 s leta hai, /health tez · health check + retry + passive ejection (2 lagataar fail → 2.00 s bahar) ===\n    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.25 s  #1  → instance 1 ✓                                             10 ms\n    0.45 s  #2  → instance 2 ✓                                             10 ms\n    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.65 s  #3  → instance 3 ✓                                             10 ms\n    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    0.85 s  #4  → instance 1 ✓                                             10 ms\n    1.00 s  💥 instance 2 par slow fault shuru\n    1.05 s  #5  → instance 2 ✗ timeout → dobara instance 3 ✓              510 ms\n    1.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.25 s  #6  → instance 3 ✓                                             10 ms\n    1.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.45 s  #7  → instance 1 ✓                                             10 ms\n    1.65 s  #8  → instance 2 ✗ timeout → dobara instance 3 ✓              510 ms\n    1.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    1.85 s  #9  → instance 3 ✓                                             10 ms\n    2.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.05 s  #10 → instance 1 ✓                                             10 ms\n    2.15 s  ⏏️ instance 2: 2 request lagataar fail → 2.00 s ke liye BAHAR (passive ejection)\n    2.25 s  #11 → instance 3 ✓                                             10 ms\n    2.30 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.45 s  #12 → instance 1 ✓                                             10 ms\n    2.60 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    2.65 s  #13 → instance 3 ✓                                             10 ms\n    2.85 s  #14 → instance 1 ✓                                             10 ms\n    2.90 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.00 s  ✅ instance 2 theek\n    3.05 s  #15 → instance 3 ✓                                             10 ms\n    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.25 s  #16 → instance 1 ✓                                             10 ms\n    3.45 s  #17 → instance 3 ✓                                             10 ms\n    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.65 s  #18 → instance 1 ✓                                             10 ms\n    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    3.85 s  #19 → instance 3 ✓                                             10 ms\n    4.05 s  #20 → instance 1 ✓                                             10 ms\n    4.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.15 s  ⏏️ instance 2: 2.00 s poore → rotation mein WAPAS (phir se try hoga)\n    4.25 s  #21 → instance 2 ✓                                             10 ms\n    4.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.45 s  #22 → instance 3 ✓                                             10 ms\n    4.65 s  #23 → instance 1 ✓                                             10 ms\n    4.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    4.85 s  #24 → instance 2 ✓                                             10 ms\n    5.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓\n    5.05 s  #25 → instance 3 ✓                                             10 ms\n   nateeja → 25 requests · 0 fail · retry se bachi: 2 · sabse dheemi request: 510 ms · kharab instance tak pahunchi: 2\n             health check ne instance 2 ko bahar kiya: kabhi nahi · passive ejection ne: 2.15 s par" },
      ],
      observe: {
        q: 'Aakhri do slow motion mein instance 2 utna hi dheema tha, aur health check dono mein laga tha. Pehle mein 4 requests giri, doosre mein 0. Kya badla tha?',
        choices: [
          'Doosre mein retry tha (giri hui request agle instance par), aur load balancer ne 2 lagataar fail dekh ke instance 2 ko list se hata diya. Health check ne dono mein kuch nahi pakda',
          'Doosre mein health check tez tha',
          'Doosre mein instance 2 jaldi theek ho gaya',
          'Doosre mein requests kam thi',
        ],
        answer: 0,
        explain: 'Dono ke nateeje mein likha hai: <code>health check ne instance 2 ko bahar kiya: kabhi nahi</code>. Farak retry aur "asli requests dekhna" ne banaya.',
      },
      lesson: 'Chot badlo, toh kami badalti hai. Ek hi chot baar-baar dene se ek hi kami baar-baar "theek" dikhti hai.',
    },
  ],
  interview: {
    title: 'Interview Round — mechanism samjhao',
    instructions: 'Interviewer dekhna chahta hai ki tum "tod do" aur "prayog" ka farak jaante ho. 🎤',
    questions: [
      {
        q: '"Ek chaos experiment kaise chalate hain? Kadam batao."',
        choices: [
          'Pehle aam din ka haal naapo (steady state). Phir andaaza likho, number mein (hypothesis), aur rokne ki hadd. Ek chot do, chhote daayre mein. Naapte raho; hadd paar ho toh turant roko. Chot wapas lo, aur likho ki andaaza tika ya toota. Aam din ka haal hi kharab ho, toh shuru hi mat karo',
          'Production mein ek random server band karo aur dekho kaun shikayat karta hai',
          'Sab servers ek saath restart karo',
          'Pehle outage hone do, phir uski report likho',
        ],
        answer: 0,
        explain: 'Lab: rokne ke niyam ke saath 17 requests giri (0.5 s mein roka); niyam ke bina 200 (6.0 s). Aam din ka haal 68% tha → prayog shuru hi nahi hua.',
      },
      {
        q: '"Health check laga hua hai, phir bhi ek bimaar instance traffic le raha hai aur requests gir rahi hain. Yeh kaise ho sakta hai?"',
        choices: [
          'Health check sirf "theek ho?" wala raasta dekhta hai. Agar instance us raaste par theek jawab de raha hai par asli kaam mein dheema hai ya error de raha hai, toh health check us instance ko kabhi nahi hatayega. Ilaaj: retry, timeout, aur asli requests ke nateeje dekh ke instance ko hatana (passive health check)',
          'Health check mein bug hai',
          'Aisa ho hi nahi sakta',
          'Instance ka IP badal gaya hoga',
        ],
        answer: 0,
        explain: 'Lab: dheema instance, sirf health check → 133–134 requests giri (66.5–66.8% safal). Retry ke saath 0 giri, par sabse dheemi 1% ko 515–517 ms lage. Asli requests dekhne par bimaar instance tak 133 ki jagah 36 pahunchi.',
      },
    ],
  },
  success: [
    'Ek prayog ke kadam bata sakte ho, aur samjha sakte ho ki rokne ka niyam kya bachata hai',
    'Bata sakte ho ki dheema ya aadha-zinda instance health check se kyun nikal jaata hai',
    'Steady state, hypothesis, abort, blast radius aur passive health check ko pehchaan sakte ho',
  ],
  cards: [
    { front: 'Prayog ke kadam?', back: 'Aam din ka haal naapo → andaaza + rokne ki hadd likho → EK chot → naapte raho, hadd paar ho toh roko → chot wapas → faisla. Aam din ka haal hi kharab ho → shuru hi mat karo.' },
    { front: 'Rokne ka niyam kya bachata hai?', back: 'Seekh wahi, nuksaan kam. Slow motion: 2 requests giri (1.00 s mein roka) banaam 7 (4.00 s). Lab: 17 banaam 200.' },
    { front: 'Health check kya nahi pakadta?', back: 'Jo instance "theek ho?" par theek jawab de, par asli kaam mein dheema ho ya error de. Lab: dheema instance, sirf health check → 133–134 giri; aadha-zinda → 133.' },
    { front: 'Passive health check?', back: 'Poochhna nahi, dekhna: asli requests lagataar fail hon, toh instance ko thodi der ke liye hata do. Lab: bimaar instance tak dheema 133 → 36, aadha-zinda 133 → 4 requests.' },
    { front: 'Chot badal-badal ke kyun?', back: 'Mara hua instance sabse aasaan bimaari hai — health check mare hue instance ko pakad leta hai. Dheema aur aadha-zinda instance alag kami dikhate hain. Slow motion (sirf health check): 1 · 4 · 4 fail.' },
  ],
},
]);

})();
