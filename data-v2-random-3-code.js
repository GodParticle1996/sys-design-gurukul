/* =====================================================================
   🛡️ Playlist · 1 Resilience — Randomness · level 3: CODE
   Chunne ke chaaron tareeke asli code mein (lib/pick.js), phir wahi NGINX aur Envoy mein.
   Code ka tukda ASLI file se hai (docker-labs/41-load-balancing) — validate.js use byte-for-byte milata hai.
   Number us folder ke asli run se hain. NGINX aur Envoy wale cards unki official documentation se hain —
   is lab mein yeh dono chalaye nahi gaye (cards mein likha hai).
   ===================================================================== */
(function () {

const HERO = [
  { id: 'loads', icon: '📋', label: 'loads [3, 0, 1]', x: 150, y: 105 },
  { id: 'pick', icon: '🪙', label: 'bestOfTwo()', x: 455, y: 105 },
  { id: 'srv', icon: '🖥️', label: 'S2 ya S3', x: 760, y: 105 },
];

VISUALS['rn-code'] = {
  t: 'Function ko sirf <code>loads</code> milta hai. Function ko nahi pata ki <code>loads</code> taaza hai ya purana',
  html: SD.viz.svg(HERO, [{ from: 'loads', to: 'pick' }, { from: 'pick', to: 'srv' }], {
    nodes: { loads: { tone: 'slow', badge: 'taaza? purani? pata nahi' }, pick: { tone: 'acc', badge: 'do sikke → kam wala' }, srv: { tone: 'ok', badge: 'S1 kabhi nahi' } },
    flows: [{ from: 'loads', to: 'pick', label: 'loads', tone: 'acc' }, { from: 'pick', to: 'srv', label: 'server', tone: 'ok' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rn-code',
  icon: '💻',
  group: '🎲 Randomness',
  title: 'Randomness 3 · Code — chaar tareeke, 32 line',
  badge: 'Sikka Lohaar',
  objectives: [
    'Chaaron tareeke code mein kitne chhote hain — aur kaunse do tareeke load dekhte hi nahi?',
    '"Sabse kam load wala" mein random kahan hai, aur kyun?',
    '"Purani jaankari" aur "taaza ginti" ke beech code ka farak kitna hai?',
    'NGINX aur Envoy mein yahi tareeke kis naam se milte hain, aur default kya hai?',
  ],
  lesson: [
    `<h3>💻 Load balancer ka poora dimaag: 32 line</h3>
     <p>Pichhle do levels ke chaaron tareeke — baari-baari, koi bhi ek, sabse kam load wala, do mein se behtar — ek chhoti file mein hain. Lab ka load balancer, slow motion wala tool aur sabse chhota program, teeno yahi file chalate hain:</p>
     <pre>docker-labs/41-load-balancing/lib/pick.js   ← chaar functions, 32 line</pre>
     <p>Har function ka kaam ek hi hai: <b>ek server ka number lautana</b>. 0 = S1, 1 = S2, 2 = S3.</p>
     <p>Is level mein wahi haal lenge jo pichhle level ke chhote program mein tha:</p>
     <pre>loads = [3, 0, 1]      // load balancer ko dikh raha hai: S1 par 3, S2 par 0, S3 par 1</pre>
     <p class="tip">👉 Ek cheez dhoondte hue padho: kaunse function <code>loads</code> ko chhute hi nahi?</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/pick.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/pick.js — chaar functions, ek-ek karke',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Chaaron functions ko wahi <code>loads = [3, 0, 1]</code> milega. Do jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/41-load-balancing/lib/pick.js',
        file: 'docker-labs/41-load-balancing/lib/pick.js',
        from: 7,
        text: "/* 1. Baari-baari (round robin): 0, 1, 2, 0, 1, 2 …\n      Load dekhta hi nahi; bas ek ginti yaad rakhta hai. */\nfunction roundRobin(state, n) {\n  return state.next++ % n;\n}\n\n/* 2. Koi bhi ek (random).\n      Na kuch yaad rakhta hai, na kuch dekhta hai. */\nfunction anyOne(n, random) {\n  return Math.floor(random() * n);\n}\n\n/* 3. Sabse kam load wala. SAARE servers ko dekhta hai.\n      Barabari ho toh barabar walon mein se koi bhi ek. */\nfunction leastLoaded(loads, random) {\n  const least = Math.min(...loads);\n  const tied = [];          // jin par sabse kam load hai\n  loads.forEach((load, i) => {\n    if (load === least) tied.push(i);\n  });\n  // ek hi hai toh wahi; kai hain toh sikka\n  return tied[Math.floor(random() * tied.length)];\n}\n\n/* 4. Do mein se behtar (power of two choices).\n      Do ALAG servers random chuno; kam load wala lo. */\nfunction bestOfTwo(loads, random) {\n  const a = anyOne(loads.length, random);\n  let b = anyOne(loads.length, random);\n  while (b === a) b = anyOne(loads.length, random);\n  return loads[a] <= loads[b] ? a : b;\n}",
      },
      vars: [
        { id: 'loads', label: '<code>loads</code> (load balancer ko dikh raha hai)' },
        { id: 'fn', label: 'Function' },
        { id: 'in', label: 'Andar' },
        { id: 'ret', label: 'Lautaya' },
      ],
      steps: [
        {
          clock: 'chaar functions',
          line: [9, 15, 21, 33],
          say: `Chaar functions:<br><br>
            <b>Line 9, <code>roundRobin</code>:</b> baari-baari.<br>
            <b>Line 15, <code>anyOne</code>:</b> koi bhi ek.<br>
            <b>Line 21, <code>leastLoaded</code>:</b> sabse kam load wala.<br>
            <b>Line 33, <code>bestOfTwo</code>:</b> do mein se behtar.<br><br>
            Pehle do functions ke arguments dekho: in dono mein <code>loads</code> hai hi nahi.`,
          vars: { loads: '[ 3, 0, 1 ] — S1 3 · S2 0 · S3 1', fn: '—', in: '—', ret: '—' },
        },
        {
          clock: 'roundRobin',
          line: [9, 10],
          say: `Line 10: <code>state.next++ % n</code>. Ek ginti (<code>next</code>) badhti jaati hai. Is ginti ko servers ki sankhya (<code>n</code> = 3) se baanto; jo bacha, wahi server.<br><br>
            0 → S1, 1 → S2, 2 → S3, 3 → phir S1…<br><br>
            Is function ko <code>loads</code> diya hi nahi jaata. S1 par 3 dikhe ya 300 — S1 ki baari aayegi toh S1.`,
          vars: { fn: 'roundRobin(state, 3)', in: 'next: 0, 1, 2, 3 …', ret: 'S1 · S2 · S3 · S1 …' },
        },
        {
          clock: 'anyOne',
          line: [15, 16],
          say: 'Line 16: <code>random()</code> 0 aur 1 ke beech ek sankhya deta hai. Is sankhya ko 3 se guna karo, dashamlav hata do: 0, 1 ya 2.<br><br>Yeh function bhi <code>loads</code> nahi leta. Aur yeh kuch yaad bhi nahi rakhta — sabse sasta tareeka.',
          vars: { fn: 'anyOne(3, random)', in: 'random() × 3, dashamlav hata ke', ret: 'S1, S2 ya S3 — barabar mauka' },
        },
        {
          clock: 'leastLoaded',
          line: '21-29',
          say: `Ab pehla function jo <code>loads</code> dekhta hai.<br>
            Line 22: <code>least</code> = sabse chhota load. <code>[3, 0, 1]</code> mein sabse chhota: 0.<br>
            Line 23–26: <code>tied</code> = un servers ki list jin par utna hi (0) load hai.<br>
            Line 28: us list mein se ek server lautao.`,
          vars: { fn: 'leastLoaded([3, 0, 1], random)', in: 'least = 0 · tied = ?', ret: '?' },
          ask: {
            q: '<code>loads = [3, 0, 1]</code>. <code>leastLoaded</code> kya lautayega — aur agli 999 baar kya lautayega, jab tak <code>loads</code> na badle?',
            choices: [
              '1 (yaani S2), har baar. <code>tied</code> mein sirf ek server hai; random sirf tab kaam aata hai jab list mein kai hon',
              'Kabhi S2, kabhi S3 — function mein <code>random</code> jo hai',
              '0 (S1) — list ka pehla server',
              '2 (S3) — aakhri server jeetta hai',
            ],
            answer: 0,
            hint: '0 load kitne servers par hai? Line 28 mein <code>tied.length</code> kitna hoga?',
            explain: '<code>tied</code> = [1] — sirf S2. Line 28: ek hi server hai, toh wahi. Wahi <code>loads</code>, wahi jawab — hazaar baar. Lab: <code>0 / 1000 / 0</code>.',
          },
        },
        {
          clock: 'leastLoaded · barabari',
          line: [27, 28],
          say: `Ab maan lo teeno servers khaali dikh rahe hain: <code>loads = [0, 0, 0]</code>. Tab <code>tied</code> = [0, 1, 2], aur line 28 teeno mein se koi ek chunti hai — sikke se.<br><br>
            Yeh chhoti si baat kyun? Lab ke chhote program ne dono tarah 1,000 requests bheji:
            <div class="dr-scroll"><table>
              <tr><th>Barabari mein</th><th>S1 / S2 / S3 ko mili</th></tr>
              <tr><td>Sikka (line 28)</td><td>318 / 352 / 330</td></tr>
              <tr><td>Hamesha pehla server</td><td><b>1000 / 0 / 0</b></td></tr>
            </table></div>
            "Hamesha pehla" likhna sabse aasaan hai — aur yeh khud ek jhund hai. Barabari todne ka tareeka bhi ek faisla hai. (NGINX ki documentation ke mutabiq <code>least_conn</code> barabari ko baari-baari se todta hai.)`,
          vars: { loads: '[ 0, 0, 0 ] — teeno khaali', in: 'tied = [0, 1, 2] → sikka', ret: 'S1, S2 ya S3' },
        },
        {
          clock: 'bestOfTwo · do sikke',
          line: [34, 35, 36],
          say: `Wapas <code>loads = [3, 0, 1]</code> par.<br>
            Line 34: pehla sikka, <code>a</code>. Maan lo 0 (S1).<br>
            Line 35: doosra sikka, <code>b</code>. Maan lo doosra sikka bhi 0 nikla.<br>
            Line 36: <code>b === a</code>? Haan → doosra sikka dobara. Is baar 2 (S3).<br><br>
            Line 36 isliye hai ki dono sikke <b>alag</b> servers hon. Ek hi server do baar nikle toh "do mein se behtar" bas "koi bhi ek" ban jaayega.`,
          vars: { loads: '[ 3, 0, 1 ] — S1 3 · S2 0 · S3 1', fn: 'bestOfTwo([3, 0, 1], random)', in: 'a = 0 (S1) · b = 2 (S3)', ret: '?' },
        },
        {
          clock: 'bestOfTwo · faisla',
          line: 37,
          say: 'Line 37: <code>loads[a] &lt;= loads[b] ? a : b</code>.<br><br>a = 0, b = 2: <code>loads[0]</code> = 3, <code>loads[2]</code> = 1. 3 ≤ 1? Nahi → <code>b</code> → <b>S3</b>.',
          vars: { in: 'loads[0] = 3 · loads[2] = 1', ret: '2 — S3' },
          ask: {
            q: 'Agli baar sikke a = 1 (S2) aur b = 2 (S3) nikle. Line 37 kya lautayegi?',
            choices: [
              '1 (S2) — <code>loads[1]</code> = 0, <code>loads[2]</code> = 1, aur 0 ≤ 1',
              '2 (S3) — doosra sikka jeetta hai',
              '0 (S1) — S1 ki baari hai',
              'Sikke dobara uchhaale jaayenge',
            ],
            answer: 0,
            hint: '<code>loads[a]</code> aur <code>loads[b]</code> nikaalo, phir <code>&lt;=</code> lagao.',
            explain: 'Teen jodiyan: (S1, S2) → S2. (S1, S3) → S3. (S2, S3) → S2. S1 kisi mein nahi jeetta. Lab: <code>0 / 694 / 306</code>.',
          },
        },
        {
          clock: 'jaankari kahan se aati hai?',
          line: [21, 33],
          say: `Ab sabse zaroori baat. In functions ko <b>nahi pata</b> ki <code>loads</code> taaza hai ya purana. Yeh faisla function bulane wale ka hai. Lab ke load balancer (<code>services/lb.js</code>) mein yeh do calls hain (yahan chhote karke dikhaye hain):
            <pre>return leastLoaded(inflight, Math.random);   // load balancer ki APNI ginti — hamesha taaza
return leastLoaded(reported, Math.random);   // servers ka bheja haal — 0.5 s tak purana</pre>
            Function wahi. Sirf pehla argument alag. Lab mein sabse lambi line: <b>0</b> banaam <b>92–106</b>.`,
          vars: { loads: 'inflight (taaza) ya reported (purana)', fn: 'leastLoaded — wahi function', in: 'sirf pehla argument badla', ret: 'line 0 banaam 92–106' },
        },
        {
          clock: 'apni ginti, do line mein',
          line: 21,
          say: `Aur load balancer ki "apni ginti" (<code>inflight</code>) bhi do hi jagah banti hai, usi file mein (comments yahan samjhane ke liye hain):
            <pre>const i = pick(); inflight[i]++; sent[i]++;     // request bheji → us server ki ginti +1
finally { inflight[i]--; }                       // jawab aaya (ya fail hua) → ginti −1</pre>
            <code>finally</code> isliye ki request fail ho tab bhi ginti ghate. Warna fail hui requests ginti mein hamesha ke liye atak jaati, aur load balancer us server ko theek hone ke baad bhi "bhara" samajhta rehta.`,
          vars: { loads: 'inflight[i]: bheji − lauti', fn: '—', in: '+1 bhejte hi · −1 lautte hi', ret: '—' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> chunne ka tareeka chhota sa code hai. Asli farak teen sawaalon mein hai: function <b>load dekhta hai ya nahi</b>, <b>kitne servers ko dekhta hai</b> (sab ya do), aur function ko di gayi <b>jaankari kitni purani hai</b>.',
    },

    /* ---------------- 2. asli load balancers ---------------- */
    {
      type: 'cards',
      title: '🗺️ Wahi chaar tareeke — NGINX aur Envoy mein',
      goal: 'Chaar chhote cards. Yeh cards NGINX aur Envoy ki <b>official documentation</b> se hain; is lab mein yeh dono chalaye nahi gaye. Settings ke naam wahin se hain; server ke address sirf misaal hain.',
      steps: [
        {
          title: '1. NGINX: kuch na likho toh?',
          say: `NGINX mein servers ka group <code>upstream</code> ke andar likha jaata hai, aur chunne ka tareeka usi ke andar ek line mein:
            <pre>upstream menu_service {
    random two least_conn;     # do sikke, phir un do mein se kam connections wala
    server 10.0.0.11;
    server 10.0.0.12;
    server 10.0.0.13;
}</pre>
            <div class="dr-scroll"><table>
              <tr><th>NGINX mein likho</th><th>Tareeka</th></tr>
              <tr><td>(kuch nahi)</td><td>baari-baari — documentation ise "weighted round-robin" kehti hai</td></tr>
              <tr><td><code>least_conn;</code></td><td>sabse kam chalte connections wala</td></tr>
              <tr><td><code>random;</code></td><td>koi bhi ek</td></tr>
              <tr><td><code>random two least_conn;</code></td><td>do mein se behtar</td></tr>
            </table></div>`,
          ask: {
            q: 'Ek team ne NGINX mein <code>upstream</code> ke andar sirf teen <code>server</code> lines likhi, tareeka nahi likha. Ek server ki disk dheemi ho gayi. Kya hoga?',
            choices: [
              'Dheeme server ko barabar hissa milta rahega — default baari-baari hai, aur baari-baari load nahi dekhta',
              'NGINX apne aap dheeme server ko kam bhejega',
              'NGINX dheeme server ko hata dega',
              'NGINX random chunega',
            ],
            answer: 0,
            hint: 'Table ki pehli line dekho. Aur level 1 mein baari-baari ne dheeme S3 ke saath kya kiya tha?',
            explain: 'Default sabse seedha tareeka hota hai, sabse samajhdaar nahi. Lab: baari-baari ne dheeme server ko barabar 480 requests di; dheeme server ki line 91–113.',
          },
        },
        {
          title: '2. Envoy: "do mein se behtar" pehle se laga hai',
          say: `Envoy ek aur load balancer hai, jo aksar services ke beech lagta hai.<br><br>
            Envoy ke "least request" tareeke ke baare mein documentation kehti hai: jab sab servers ka wazan barabar ho, toh Envoy <b>N random servers</b> chunta hai — <b>default 2</b> — aur in N mein se us server ko leta hai jis par sabse kam chalti requests hain. Documentation ise <b>P2C</b> (power of two choices) kehti hai.<br><br>
            Wahi documentation do baatein aur kehti hai:
            <ul>
              <li>yeh tareeka saare servers ko dekhne ke "lagbhag barabar achha" hai;</li>
              <li>aur yeh <b>herding se bachta hai</b>.</li>
            </ul>
            Yaani jo is topic mein naapa gaya, wahi Envoy ke design ki wajah hai.`,
        },
        {
          title: '3. Jab random bilkul nahi chahiye',
          say: `Kabhi-kabhi ek hi grahak ko <b>hamesha usi server</b> par jaana hota hai — jaise jab server ne us grahak ka kuch apni memory mein rakha ho.<br><br>
            NGINX mein iske liye alag tareeke hain:
            <ul>
              <li><code>ip_hash;</code> — ek hi IP ki requests hamesha ek hi server par.</li>
              <li><code>hash key consistent;</code> — tumhari chuni hui cheez (jaise user ka id) se server tay hota hai; server judne ya hatne par kam se kam grahak idhar-udhar hote hain.</li>
            </ul>
            Yeh random ka ulta hai: <b>har baar wahi jawab</b>. Yahan jhund ka khatra alag hai: agar ek grahak bahut bhaari ho, toh us grahak ka server akela dabta hai.`,
        },
        {
          title: '4. Ek nazar mein',
          say: `<div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Lab (<code>lib/pick.js</code>)</th><th>NGINX</th><th>Envoy</th></tr>
              <tr><td>Baari-baari</td><td><code>roundRobin</code></td><td>(default)</td><td>round robin</td></tr>
              <tr><td>Koi bhi ek</td><td><code>anyOne</code></td><td><code>random;</code></td><td>random</td></tr>
              <tr><td>Sabse kam load wala</td><td><code>leastLoaded</code></td><td><code>least_conn;</code></td><td>—</td></tr>
              <tr><td>Do mein se behtar</td><td><code>bestOfTwo</code></td><td><code>random two least_conn;</code></td><td>least request (default 2 sikke)</td></tr>
              <tr><td>Hamesha wahi server</td><td>—</td><td><code>ip_hash;</code> · <code>hash … consistent;</code></td><td>—</td></tr>
            </table></div>
            NGINX ka <code>least_conn</code> aur Envoy ka "least request" dono <b>load balancer ki apni ginti</b> par chalte hain (chalte connections / chalti requests) — servers ke bheje haal par nahi.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> kisi bhi load balancer mein teen cheezein dekho: <b>default tareeka kya hai</b> (aksar baari-baari), <b>load ki jaankari kahan se aati hai</b> (apni ginti ya servers ka bheja haal), aur <b>"do mein se behtar" ka naam kya hai</b>.',
    },

    /* ---------------- 3. asli raftaar ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — chhe tareeke, asli raftaar par',
      project: '41-load-balancing',
      exercise: 'ex1-algorithms',
      goal: 'Ek load balancer, 5 servers, 300 requests/second. 90% requests 10 ms ki, 10% requests 200 ms ki. Pehle sab servers ek jaise; phir server 5 teen guna dheema. "Sabse lambi line" wala khaana dekho.',
      why: '<code>services/lb.js</code> = load balancer (tareeke <code>lib/pick.js</code> se). <code>services/backend.js</code> = ek server (4 workers; baaki line mein). <code>tools/algos.js</code> saare tareeke ek ke baad ek chalata hai (har ek 8 s). Number har run mein thode alag aayenge; tarteeb wahi rahegi.',
      steps: [
        { text: 'Load balancer aur 5 servers chalao (ek terminal mein, chalta chhod do). Lines ka kram alag ho sakta hai.', cmd: 'cd docker-labs/41-load-balancing && npm start ex1-algorithms', expect: 'ex1-algorithms\n[lb] :5201 → 5 backends\n[backend] :5202\n[backend] :5203\n[backend] :5204\n[backend] :5205\n[backend] :5206' },
        { text: 'Doosre terminal mein: sab servers ek jaise (~1 minute).', cmd: 'node tools/algos.js --scenario same', expect: "=== 5 ek jaise backends · 300 req/s · 8 s ===\nalgorithm                                p50       p99      sabse lambi line   requests har backend (1…5)\nround robin                                14 ms    204 ms          9           480 / 480 / 480 / 480 / 480\nrandom                                     13 ms    204 ms         12           502 / 456 / 488 / 436 / 518\nleast connections (LB ki apni ginti)       13 ms    204 ms          0           416 / 466 / 482 / 473 / 563\nresource-based (heartbeat 500 ms)         252 ms    629 ms         92           476 / 486 / 485 / 464 / 489\npower of two choices (wahi 500 ms)         14 ms    246 ms         29           471 / 458 / 452 / 459 / 560\npower of two choices (LB ki apni ginti)    13 ms    204 ms          1           490 / 502 / 475 / 436 / 497" },
        { text: 'Ab server 5 teen guna dheema (~1 minute). Aakhri khaane mein dekho server 5 ko kitni requests mili.', cmd: 'node tools/algos.js --scenario slow', expect: "=== backend 5 teen guna dheema · 300 req/s · 8 s ===\nalgorithm                                p50       p99      sabse lambi line   requests har backend (1…5)\nround robin                                13 ms   3000 ms        113           480 / 480 / 480 / 480 / 480\nrandom                                     14 ms   2865 ms        150           510 / 489 / 463 / 458 / 480\nleast connections (LB ki apni ginti)       13 ms    205 ms          1           529 / 572 / 511 / 575 / 213\nresource-based (heartbeat 500 ms)         335 ms   2202 ms        123           485 / 485 / 612 / 480 / 338\npower of two choices (wahi 500 ms)         14 ms    494 ms         25           552 / 514 / 539 / 509 / 286\npower of two choices (LB ki apni ginti)    13 ms    602 ms          2           525 / 565 / 545 / 525 / 240" },
      ],
      observe: {
        q: '"resource-based" aur "least connections" dono ka niyam ek hi hai: sabse kam load wale ko bhejo. Ek ki sabse lambi line 92 hai, doosre ki 0. Farak kahan se aaya?',
        choices: [
          'Jaankari ki umar se. "resource-based" servers ka bheja haal dekhta hai, jo 0.5 s tak purana hota hai; "least connections" load balancer ki apni ginti dekhta hai, jo hamesha taaza hai',
          '"least connections" zyada servers use karta hai',
          '"resource-based" random hai',
          'Dono mein requests ki sankhya alag thi',
        ],
        answer: 0,
        explain: 'Code mein dono ek hi function hain: <code>leastLoaded</code>. Sirf pehla argument alag hai: <code>reported</code> ya <code>inflight</code>.',
      },
      lesson: 'Tareeka chunne se pehle poochho: is tareeke ko load ki jaankari kahan se milegi, aur yeh jaankari kitni purani hogi?',
    },
  ],
  interview: {
    title: 'Interview Round — code aur config',
    instructions: 'Interviewer dekhna chahta hai ki tum default ko jaante ho, aur jaankari ki umar poochhte ho. 🎤',
    questions: [
      {
        q: '"NGINX ke peeche paanch app servers hain. Ek ka response time baaki se teen guna hai, aur p99 kharab ho gaya. Config mein sabse pehle kya dekhoge?"',
        choices: [
          'upstream mein chunne ka tareeka. Kuch nahi likha toh default round robin hai, jo dheeme server ko barabar hissa deta hai. least_conn ya random two least_conn dheeme server ko apne aap kam bhejenge — aur saath mein yeh bhi pata karna hai ki server dheema kyun hua',
          'Server ki RAM',
          'NGINX ka version',
          'Timeout badha dunga',
        ],
        answer: 0,
        explain: 'Lab: ek server teen guna dheema → round robin ne dheeme server ko 480 requests di (line 91–113). Load balancer ki apni ginti se "sabse kam load wala" → 201–245 requests, line 0–1.',
      },
      {
        q: '"Do tareekon ka code bilkul ek jaisa hai — dono \'sabse kam load wale ko bhejo\'. Ek production mein theek chalta hai, doosra spike banata hai. Kaise?"',
        choices: [
          'Farak code mein nahi, code ko di gayi jaankari mein hai. Load balancer ki apni ginti hamesha taaza hai. Servers ka bheja haal (CPU, queue) kuch der purana hota hai; us beech ki saari requests ko wahi "sabse khaali" server dikhta hai',
          'Ek mein bug hoga',
          'Ek tez language mein likha hoga',
          'Ek mein servers zyada honge',
        ],
        answer: 0,
        explain: 'Lab mein dono ek hi function hain (leastLoaded). Apni ginti → sabse lambi line 0. 0.5 s purana haal → 92–106.',
      },
    ],
  },
  success: [
    'Chaaron tareeke kuch line ke code mein pehchaan sakte ho, aur bata sakte ho kaunse load nahi dekhte',
    'Samjha sakte ho ki wahi function taaza ya purani jaankari ke saath alag nateeja kyun deta hai',
    'NGINX aur Envoy mein default tareeka aur "do mein se behtar" ka naam bata sakte ho',
  ],
  cards: [
    { front: 'Kaunse tareeke load dekhte hi nahi?', back: 'Baari-baari (<code>roundRobin</code>: ek ginti) aur koi bhi ek (<code>anyOne</code>: ek sikka). Dono ke arguments mein <code>loads</code> hai hi nahi.' },
    { front: '"Purani jaankari" aur "taaza ginti" mein code ka farak?', back: 'Ek argument. <code>leastLoaded(inflight, …)</code> = load balancer ki apni ginti. <code>leastLoaded(reported, …)</code> = servers ka bheja haal. Lab: line 0 banaam 92–106.' },
    { front: 'Barabari kaise todein?', back: 'Sikke se (ya baari-baari se). "Hamesha pehla server" khud ek jhund hai. Lab, teeno servers khaali: hamesha pehla → 1000 / 0 / 0; sikka → 318 / 352 / 330.' },
    { front: 'NGINX: default, aur "do mein se behtar"? (docs)', back: 'Default: weighted round-robin. <code>least_conn;</code> · <code>random;</code> · <code>random two least_conn;</code> = do random, phir un do mein kam connections wala.' },
    { front: 'Envoy ka "least request"? (docs)', back: 'Barabar wazan par: N random servers (default 2), in N mein sabse kam chalti requests wala — P2C. Documentation: saare servers dekhne ke lagbhag barabar achha, aur herding se bachta hai.' },
  ],
},
]);

})();
