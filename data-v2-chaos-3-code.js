/* =====================================================================
   🛡️ Playlist · 1 Resilience — Chaos Engineering · level 3: CODE
   Prayog ka dhancha (lib/experiment.js), monkey ka dimaag (lib/monkey.js), aur dono ko apne app mein jodna (tools/mini.js).
   Code ke tukde ASLI files se hain (docker-labs/42-chaos) — validate.js unhe byte-for-byte milata hai.
   Number us folder ke asli run se hain. Chaos Monkey, AWS FIS, Chaos Mesh aur Envoy ki baatein unki documentation se hain
   (is lab mein chalaye nahi gaye) — jahan aayi hain, wahan likha hai.
   ===================================================================== */
(function () {

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const POD_KILL_YAML = "apiVersion: chaos-mesh.org/v1alpha1\nkind: PodChaos\nmetadata:\n  name: pod-kill-example\n  namespace: chaos-mesh\nspec:\n  action: pod-kill\n  mode: one\n  selector:\n    namespaces:\n      - tidb-cluster-demo\n    labelSelectors:\n      'app.kubernetes.io/component': 'tikv'";      // Chaos Mesh ki documentation ka udaharan, akshar-akshar
const ON_REQUEST = "// asli request ka nateeja → null | 'ejected'\nfunction onRequest(r, i, ok, now, eject, ejectMs) {\n  if (now < r.until[i]) return null;   // pehle se bahar\n  if (ok) {\n    r.streak[i] = 0;\n    return null;\n  }\n  r.streak[i]++;\n  if (!eject || r.streak[i] < eject) return null;\n  r.streak[i] = 0;\n  r.until[i] = now + ejectMs;\n  return 'ejected';\n}";        // lib/rotation.js ka asli tukda

const HERO = [
  { id: 'app', icon: '🧩', label: 'mini.js', x: 140, y: 105 },
  { id: 'exp', icon: '🧪', label: 'experiment.js', x: 445, y: 105 },
  { id: 'mk', icon: '🐒', label: 'monkey.js', x: 750, y: 105 },
];

VISUALS['ch-code'] = {
  t: 'Tum chaar function likhte ho. Prayog ka dhancha in chaar function ko sahi kram mein chalata hai — aur chot hamesha wapas leta hai. Monkey sirf chot hai',
  html: SD.viz.svg(HERO, [{ from: 'app', to: 'exp' }, { from: 'exp', to: 'mk' }], {
    nodes: { app: { tone: 'acc', badge: 'tumhare 4 function' }, exp: { tone: 'ok', badge: 'naapo · chot · wapas' }, mk: { tone: 'bad', badge: 'ek random target' } },
    flows: [{ from: 'app', to: 'exp', label: 'chalao', tone: 'acc' }, { from: 'exp', to: 'mk', label: 'inject()', tone: 'bad' }],
  }, { w: 890, h: 215 }),
};

SD.registerLevels('sdd-resil', [
{
  id: 'ch-code',
  icon: '💻',
  group: '🐒 Chaos Engineering',
  title: 'Chaos 3 · Code — prayog 39 line mein',
  badge: 'Chot Lohaar',
  objectives: [
    'Prayog ka poora dhancha kitne code mein aata hai — aur us code mein "chot wapas lo" kis shabd ke andar likha hai?',
    'Aam din ka naap kharab ho, toh kaunsi line kabhi nahi chalti?',
    'Chaos monkey ko "random" bahar se kyun diya jaata hai?',
    'Apne app mein lagane ke liye kaunse chaar function likhne hain?',
  ],
  lesson: [
    `<h3>💻 Do chhoti files: ek prayog ki, ek monkey ki</h3>
     <p>Pichhle level ka prayog — naapo, andaaza parkho, chot do, dekho, roko, wapas lo — ek hi function mein hai. Chot dene wala monkey doosri file mein hai:</p>
     <pre>docker-labs/42-chaos/lib/experiment.js   ← prayog ka dhancha        (function: 39 line)
docker-labs/42-chaos/lib/monkey.js       ← ek random target todo    (function: 20 line)
docker-labs/42-chaos/tools/mini.js       ← dono ko jodna — jaisa tum apne app mein karoge</pre>
     <p>Pehli file lab ke teen tools chalate hain: asli raftaar wala <code>tools/experiment.js</code>, slow motion, aur <code>mini.js</code>. Doosri file <code>tools/monkey.js</code> aur <code>mini.js</code> chalate hain.</p>
     <p class="tip">👉 Ek cheez dhoondte hue padho: <code>rollback()</code> kis shabd ke andar likha hai — aur kyun?</p>`,
  ],
  stages: [
    /* ---------------- 1. lib/experiment.js ---------------- */
    {
      type: 'dryrun',
      title: '💻 lib/experiment.js — prayog, line-by-line',
      goal: 'Har click par sirf wahi lines chamkengi jo chali. Misaal ke number <code>tools/mini.js</code> ke "retry nahi" wale run se hain: andaaza "kam se kam 95", rokne ki hadd 80, har 1000 ms par ek naap, 3000 ms tak. Chaar jagah pehle tumse poochha jaayega.',
      code: {
        title: 'docker-labs/42-chaos/lib/experiment.js',
        file: 'docker-labs/42-chaos/lib/experiment.js',
        from: 14,
        text: "async function runExperiment(o) {\n  const { measure, hypothesis, inject, rollback } = o;\n  const { watchMs, everyMs, abortIf, sleep } = o;\n\n  // 1. pehle naapo: system abhi theek hai?\n  const steady = await measure();\n  if (!hypothesis(steady)) {\n    return {\n      verdict: 'shuru hi mat karo',\n      steady, worst: steady, abortedAt: null, samples: [],\n    };\n  }\n\n  // 2. ek fault lagao, har everyMs par dekho\n  const samples = [];\n  let worst = Infinity;         // abhi kuch dekha nahi\n  let abortedAt = null;\n  try {\n    await inject();\n    for (let t = everyMs; t <= watchMs; t += everyMs) {\n      await sleep(everyMs);\n      const m = await measure();\n      samples.push({ t, m });\n      worst = Math.min(worst, m);\n      if (abortIf && abortIf(m)) {\n        abortedAt = t;          // nuksan hadd paar: ruko\n        break;\n      }\n    }\n  } finally {\n    await rollback();           // kuch bhi ho, fault hatao\n  }\n\n  // 3. faisla (ABORT sabse bada)\n  let verdict = 'hypothesis tika';\n  if (!hypothesis(worst)) verdict = 'hypothesis toota';\n  if (abortedAt !== null) verdict = 'ABORT';\n  return { verdict, steady, worst, abortedAt, samples };\n}",
      },
      vars: [
        { id: 'steady', label: '<code>steady</code> (aam din ka naap)' },
        { id: 'samples', label: '<code>samples</code> (chot ke dauraan ke naap)' },
        { id: 'worst', label: '<code>worst</code> (sabse kharab naap)' },
        { id: 'aborted', label: '<code>abortedAt</code> (kab roka)' },
        { id: 'verdict', label: '<code>verdict</code> (faisla)' },
      ],
      steps: [
        {
          clock: 'aath cheezein',
          line: [14, 15, 16],
          say: `<code>runExperiment</code> ko ek object milta hai. Us object mein aath cheezein hain.<br><br>
            <b>Line 15 — chaar function, jo tum likhte ho:</b> <code>measure</code> (naapo), <code>hypothesis</code> (andaaza sach hai?), <code>inject</code> (chot do), <code>rollback</code> (chot wapas lo).<br><br>
            <b>Line 16 — chaar settings:</b> <code>watchMs</code> (kitni der dekhna hai), <code>everyMs</code> (kitni der mein ek naap), <code>abortIf</code> (rokne ka niyam), <code>sleep</code> (intezaar).`,
          vars: { steady: '—', samples: '—', worst: '—', aborted: '—', verdict: '—' },
        },
        {
          clock: 'pehle naapo',
          line: 19,
          say: 'Chot se pehle ek naap. <code>measure()</code> ne <b>100</b> lautaya: 20 mein se 20 requests safal.',
          vars: { steady: '100' },
        },
        {
          clock: 'andaaza abhi sach hai?',
          line: 20,
          say: '<code>hypothesis(100)</code> → 100 ≥ 95 → <b>true</b>. Isliye <code>if</code> ke andar ki lines (21 se 24) nahi chalti. Prayog aage badhta hai.',
          ask: {
            q: 'Maan lo <code>measure()</code> ne 60 lautaya hota — ek instance pehle se bimaar tha. Tab kya hota?',
            choices: [
              'Line 21 par function laut jaata, faisla "shuru hi mat karo" ke saath. Line 32 (<code>inject</code>) kabhi chalti hi nahi',
              'Chot lagti, phir turant wapas li jaati',
              'Function error deta',
              'Function 60 ko naya "aam din ka naap" maan ke aage badhta',
            ],
            answer: 0,
            hint: 'Line 21 ka pehla shabd kya hai? Us shabd ke baad function ka baaki code chalta hai?',
            explain: 'Line 21 <code>return</code> hai: function wahin khatam. Slow motion mein yahi dikha tha: <code>2.00 s 📋 faisla: shuru hi mat karo</code> — aur chot kabhi di hi nahi gayi.',
          },
        },
        {
          clock: 'chot',
          line: [28, 29, 30, 31, 32],
          say: `Teen khaali dabbe bante hain:<br>
            <code>samples</code> — har naap yahan likha jaayega;<br>
            <code>worst</code> — ab tak ka sabse kharab naap (abhi kuch dekha nahi, isliye <code>Infinity</code>);<br>
            <code>abortedAt</code> — kab roka gaya (abhi <code>null</code>).<br><br>
            Line 31 par <code>try</code> khulta hai. Line 32: <code>inject()</code> → monkey ne <b>instance 1</b> maar diya.`,
          vars: { samples: '[ ]', worst: 'Infinity', aborted: 'null' },
        },
        {
          clock: 't = 1000 ms · naap',
          line: [33, 34, 35, 36, 37],
          say: `Loop ka pehla chakkar: <code>t = 1000</code>.<br><br>
            Line 34: agle naap tak ruko. Line 35: naapo → <b>65</b>. (20 mein se 13 safal: instance 1 ki baari 7 baar aayi.)<br>
            Line 36: naap ko <code>samples</code> mein likho. Line 37: <code>worst</code> = 65.`,
          vars: { samples: '[ {t: 1000, m: 65} ]', worst: '65' },
          ask: {
            q: 'Ab line 38: <code>abortIf(65)</code>. Rokne ka niyam hai <code>m &lt; 80</code>. Kya hoga?',
            choices: [
              '65 &lt; 80 → true. <code>abortedAt = 1000</code>, aur <code>break</code> loop ko yahin tod deta hai — t = 2000 aur t = 3000 wale naap kabhi nahi honge',
              'Loop teeno naap poore karega, phir faisla hoga',
              'Function turant <code>return</code> kar dega, chot wapas liye bina',
              '<code>abortIf</code> sirf aakhri naap par dekha jaata hai',
            ],
            answer: 0,
            hint: 'Line 38 loop ke andar hai ya bahar? Aur line 40 kya karti hai?',
            explain: 'Lab ka output: <code>retry nahi 100% instance 1 mara 65% — — ABORT (1000 ms par roka)</code>. Do "—" wahi naap hain jo kabhi hue hi nahi.',
          },
        },
        {
          clock: 'roko',
          line: [38, 39, 40],
          say: '<code>abortIf(65)</code> → true. Line 39: <code>abortedAt = 1000</code>. Line 40: <code>break</code> — loop khatam.',
          vars: { aborted: '1000' },
          ask: {
            q: '<code>break</code> ke baad sabse pehle kaunsa code chalega?',
            choices: [
              'Line 44: <code>rollback()</code>. Yeh line <code>finally</code> ke andar hai — loop kaise bhi khatam ho (poora chale, <code>break</code> ho, ya naapte waqt error aaye), chot hamesha wapas li jaati hai',
              'Line 48: seedha faisla. Rollback sirf tab chalta hai jab loop poora ho',
              'Line 33: loop dobara shuru',
              'Kuch nahi: function yahin khatam',
            ],
            answer: 0,
            hint: 'Line 43 ka shabd dekho. Yeh shabd <code>try</code> ke saath kya vaada karta hai?',
            explain: '<code>try { … } finally { … }</code>: <code>finally</code> ka code hamesha chalta hai. Agar <code>rollback()</code> loop ke baad seedha likha hota aur <code>measure()</code> beech mein error de deta, toh chot lagi reh jaati — aur prayog khud ek outage ban jaata.',
          },
        },
        {
          clock: 'chot wapas',
          line: [43, 44, 45],
          say: 'Line 44: <code>rollback()</code> → teeno instances phir zinda. Chot sirf ek naap tak chali.',
        },
        {
          clock: 'faisla',
          line: [48, 49, 50, 51],
          say: `Faisla teen lines mein banta hai, aur <b>baad wali line pehle wali ko dabaa deti hai</b>:<br><br>
            Line 48: maan lo "hypothesis tika".<br>
            Line 49: <code>hypothesis(65)</code> → 65 ≥ 95? nahi → "hypothesis toota".<br>
            Line 50: <code>abortedAt</code> null nahi hai → <b>"ABORT"</b>.<br><br>
            Line 51: sab kuch lautao — faisla, aam din ka naap, sabse kharab naap, kab roka, saare naap.`,
          vars: { verdict: 'ABORT' },
        },
        {
          clock: 'retry ho toh?',
          line: [33, 34, 35, 36, 37, 38],
          say: `Wahi function, par ab nakli load balancer mein retry hai. Har naap 100 aata hai.<br><br>
            <code>abortIf(100)</code> → 100 &lt; 80? nahi → <code>break</code> nahi. Loop teeno chakkar poore karta hai (t = 1000, 2000, 3000). <code>worst</code> = 100 → <code>hypothesis(100)</code> true → faisla <b>"hypothesis tika"</b>.
            <pre>retry hai       100%  instance 1 mara    100%   100%   100%   hypothesis tika</pre>`,
          vars: { samples: '[ 100, 100, 100 ]', worst: '100', aborted: 'null', verdict: 'hypothesis tika' },
          ask: {
            q: 'Wapas "retry nahi" wale run par. Agar <code>abortIf</code> diya hi na jaaye, toh?',
            choices: [
              'Line 38 mein <code>abortIf &amp;&amp; …</code> false → <code>break</code> kabhi nahi. Loop teeno naap poore karta hai, chot poore 3000 ms chalti hai, aur faisla "hypothesis toota" aata hai',
              'Function error deta hai: <code>abortIf</code> zaroori hai',
              'Faisla phir bhi ABORT aata hai',
              'Chot lagti hi nahi',
            ],
            answer: 0,
            hint: 'Line 38 ko dhyan se padho: <code>abortIf</code> do baar likha hai. Pehli baar kyun?',
            explain: '<code>abortIf</code> optional hai. Is level ke lab mein tum yeh khud karoge. Output: <code>retry nahi 100% instance 1 mara 65% 70% 65% hypothesis toota</code>.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> prayog ka dhancha teen hisson mein hai. <b>Pehle naapo</b> (kharab ho toh laut jao, chot mat do). <b>Chot + nazar</b> (<code>try</code> ke andar; rokne ka niyam ek <code>if</code> aur ek <code>break</code> hai). <b>Chot wapas</b> (<code>finally</code> ke andar — hamesha).',
    },

    /* ---------------- 2. lib/monkey.js ---------------- */
    {
      type: 'dryrun',
      title: '🐒 lib/monkey.js — ek random target, line-by-line',
      goal: 'Monkey ka poora dimaag 20 line hai. Misaal: teen instances, aur random ka beej (seed) 7 — wahi jo <code>tools/mini.js</code> mein hai.',
      code: {
        title: 'docker-labs/42-chaos/lib/monkey.js',
        file: 'docker-labs/42-chaos/lib/monkey.js',
        from: 9,
        text: "function createMonkey({ targets, kill, random, everyMs }) {\n  let timer = null;\n\n  // ek baar: ek random target todo, aur bata do kaun tha\n  function strike() {\n    const i = Math.floor(random() * targets.length);\n    kill(targets[i]);\n    return targets[i];\n  }\n\n  return {\n    strike,\n    start() {\n      timer = setInterval(strike, everyMs);\n    },\n    stop() {\n      clearInterval(timer);\n    },\n  };\n}",
      },
      vars: [
        { id: 'targets', label: '<code>targets</code>' },
        { id: 'rnd', label: '<code>random()</code>' },
        { id: 'i', label: '<code>i</code>' },
        { id: 'victim', label: 'Kaun toota' },
      ],
      steps: [
        {
          clock: 'chaar cheezein',
          line: [9, 10],
          say: `<code>createMonkey</code> ko chaar cheezein milti hain:<br>
            <code>targets</code> — kaun-kaun toot sakta hai;<br>
            <code>kill</code> — ek target ko todne ka tareeka (tum likhte ho);<br>
            <code>random</code> — 0 aur 1 ke beech ki sankhya dene wala function;<br>
            <code>everyMs</code> — kitni der mein ek chot.<br><br>
            Monkey ko yeh nahi pata ki "todna" kya hota hai. Process band karna, container rokna, pod delete karna — yeh sab <code>kill</code> ke andar hai.`,
          vars: { targets: '[ instance 1, 2, 3 ]', rnd: '—', i: '—', victim: '—' },
        },
        {
          clock: 'kaun?',
          line: 14,
          say: `<code>random()</code> ne <b>0.0117</b> diya. 0.0117 × 3 = 0.035. <code>Math.floor</code> → <b>0</b>.<br><br>
            <code>random()</code> hamesha 0 aur 1 ke beech hota hai (1 kabhi nahi). Isliye <code>i</code> hamesha 0, 1 ya 2 hi banta hai — har target ka barabar mauka.`,
          vars: { rnd: '0.0117', i: '0' },
        },
        {
          clock: 'todo',
          line: [15, 16],
          say: 'Line 15: <code>kill(targets[0])</code> → instance 1 mar gaya.<br>Line 16: monkey batata hai ki kaun toota — taaki tool chhaap sake: <code>instance 1 mara</code>.',
          vars: { victim: 'instance 1' },
          ask: {
            q: 'Line 14 mein <code>Math.random()</code> seedha nahi likha. <code>random</code> bahar se aata hai. Kyun?',
            choices: [
              'Taaki zaroorat par <b>tay beej</b> wala random diya ja sake: wahi beej → wahi shikaar, usi kram mein. Jo prayog kal fail hua, wahi prayog aaj bilkul waise hi dobara chalaya ja sakta hai',
              '<code>Math.random</code> dheema hota hai',
              '<code>Math.random</code> production mein mana hai',
              'Taaki monkey hamesha instance 1 ko hi maare',
            ],
            answer: 0,
            hint: 'Ek prayog ne kal ek kami dikhayi. Aaj tum apna fix parakhna chahte ho. Monkey ne aaj koi aur instance maara toh?',
            explain: 'Lab, asli raftaar: beej 3 ke saath 2 run → dono mein shikaar <code>#3 #1 #2</code>, safal 87.44 / 87.44%. Beej ke bina teen run → <code>#1 #2 #2 | #1 #3 #3 | #2 #1 #2</code>: har baar alag.',
          },
        },
        {
          clock: 'baar-baar',
          line: [21, 22, 23],
          say: '<code>start()</code> ek ghadi lagata hai: har <code>everyMs</code> par ek <code>strike</code>.<br><br>Lab ka <code>tools/monkey.js</code> isi se har 4 second par ek random instance maarta hai.',
        },
        {
          clock: 'ruko',
          line: [24, 25, 26],
          say: '<code>stop()</code> ghadi band karta hai: aage koi nayi chot nahi.<br><br>Dhyan do: <code>stop()</code> kisi mare hue target ko <b>zinda nahi karta</b>.',
          ask: {
            q: 'Monkey ne ek instance maara, aur safal requests 60% par gir gayi. Monkey ki kaunsi line is nuksaan ko dekh ke rukti hai?',
            choices: [
              'Koi nahi. Monkey sirf chot deta hai. Naapna, rokna aur chot wapas lena <code>runExperiment</code> ka kaam hai — isliye monkey ko prayog ke <b>andar</b> chalaya jaata hai',
              'Line 25: <code>clearInterval</code> nuksaan dekh ke apne aap chalta hai',
              'Line 14: <code>random()</code> kharab haal mein 0 deta hai',
              'Line 15: <code>kill</code> pehle haal poochhta hai',
            ],
            answer: 0,
            hint: 'Monkey ki 20 lines mein "measure" ya "abort" jaisa koi shabd hai?',
            explain: 'Monkey ke paas na aam din ka naap hai, na andaaza, na rokne ka niyam. Agle stage mein jod dikhega: <code>inject: () =&gt; { out.victim = monkey.strike(); },</code> — monkey ki ek chot, prayog ke dhanche ke andar.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> chaos monkey = "ek random target chuno, tod do". Bas. Monkey <b>chot</b> hai, prayog nahi: naap, andaaza aur rokne ka niyam monkey ke bahar hote hain. Aur <code>random</code> bahar se dene ka fayda: tay beej ke saath wahi chot dobara di ja sakti hai.',
    },

    /* ---------------- 3. tools/mini.js ---------------- */
    {
      type: 'dryrun',
      title: '🧩 tools/mini.js — dono ko apne app mein jodna',
      goal: 'File ki lines 5–53 wahi hain jo tum apne project mein likhoge. Upar ki do files ko haath nahi lagana — unhe bas <code>require</code> karna hai.',
      code: {
        title: 'docker-labs/42-chaos/tools/mini.js',
        file: 'docker-labs/42-chaos/tools/mini.js',
        from: 5,
        text: "const { createMonkey } = require('../lib/monkey');\nconst { runExperiment } = require('../lib/experiment');\nconst seeded = require('./seeded');\n\nconst instances = [1, 2, 3].map(n => ({ n, dead: false }));\n\n// nakli load balancer: baari-baari, retry ho toh agle par\nfunction makeCaller(retry) {\n  let next = 0;\n  return function call() {\n    const a = instances[next++ % 3];\n    if (!a.dead) return true;\n    if (!retry) return false;\n    return !instances[next % 3].dead;\n  };\n}\n\n// 20 requests bhejo, safal % lautao\nfunction measure(call) {\n  let ok = 0;\n  for (let i = 0; i < 20; i++) {\n    if (call()) ok++;\n  }\n  return (ok / 20) * 100;\n}\n\nfunction experiment(retry) {\n  const call = makeCaller(retry);\n  const monkey = createMonkey({\n    targets: instances,\n    kill: inst => { inst.dead = true; },\n    random: seeded(7),\n    everyMs: 1000,\n  });\n  const out = { victim: null };\n  out.done = runExperiment({\n    measure: () => measure(call),\n    hypothesis: m => m >= 95,\n    inject: () => { out.victim = monkey.strike(); },\n    rollback: () => {\n      instances.forEach(i => { i.dead = false; });\n    },\n    abortIf: m => m < 80,\n    watchMs: 3000,\n    everyMs: 1000,\n    sleep: async () => {},   // nakli (asli: setTimeout)\n  });\n  return out;\n}",
      },
      vars: [
        { id: 'm', label: '1. Naapna (<code>measure</code>)' },
        { id: 'h', label: '2. Andaaza (<code>hypothesis</code>)' },
        { id: 'inj', label: '3. Chot (<code>inject</code>)' },
        { id: 'rb', label: '4. Chot wapas (<code>rollback</code>)' },
        { id: 'ab', label: 'Rokne ka niyam (<code>abortIf</code>)' },
      ],
      steps: [
        {
          clock: 'nakli system',
          line: '9-20',
          say: `Line 9: teen nakli instances. Har instance ke paas bas ek jhanda hai: <code>dead</code>.<br><br>
            Lines 12–20: nakli load balancer. Baari-baari chunta hai. Instance zinda → <code>true</code>. Instance mara hua, aur retry nahi → <code>false</code>. Retry hai → agle instance se poochho.<br><br>
            Tumhare app mein yeh hissa nahi hoga: wahan asli instances aur asli load balancer hain.`,
          vars: { m: '—', h: '—', inj: '—', rb: '—', ab: '—' },
        },
        {
          clock: '1 · naapna',
          line: [23, 24, 25, 26, 27, 28, 29, 41],
          say: '<b>Pehla function: naapna.</b> 20 requests bhejo, safal ka pratishat lautao (lines 23–29). Line 41 yahi function prayog ko deti hai.',
          vars: { m: '20 requests → safal %' },
        },
        {
          clock: '2 · andaaza, aur rokne ki hadd',
          line: [42, 47],
          say: `<b>Doosra: andaaza.</b> Line 42: <code>m &gt;= 95</code>.<br>
            <b>Rokne ka niyam.</b> Line 47: <code>m &lt; 80</code>.<br><br>
            Dono sirf ek sankhya dekhte hain: wahi jo <code>measure</code> ne lautayi. Isliye sabse zaroori yeh hai ki <code>measure</code> sahi cheez naape.`,
          vars: { h: 'm ≥ 95', ab: 'm < 80' },
        },
        {
          clock: '3 · chot',
          line: [33, 34, 35, 36, 37, 38, 43],
          say: `<b>Teesra: chot.</b> Lines 33–38 monkey banati hain: <code>targets</code> = teeno instances, <code>kill</code> = jhanda <code>dead</code> laga do, <code>random</code> = beej 7.<br><br>
            Line 43: prayog ki <code>inject</code> = monkey ki ek chot.`,
          vars: { inj: 'monkey.strike()' },
        },
        {
          clock: '4 · chot wapas',
          line: [44, 45, 46],
          say: '<b>Chautha: chot wapas.</b> Har instance ka jhanda hata do.',
          vars: { rb: 'sab instances zinda' },
          ask: {
            q: 'Ek team ne <code>inject</code> likh liya (ek database node band karna). <code>rollback</code> ke liye team ne kaha: "baad mein likhenge". Kya yeh prayog chalana chahiye?',
            choices: [
              'Nahi. Rokne ka niyam tabhi kaam ka hai jab chot wapas li ja sake. <code>rollback</code> ke bina "roko" ka koi matlab nahi — naap girta rahega. Pehle <code>rollback</code> likho, aur use akele chala ke dekho',
              'Haan — rokne ka niyam kaafi hai',
              'Haan — health check apne aap theek kar dega',
              'Haan, agar raat mein chalayein',
            ],
            answer: 0,
            hint: 'Line 44 kahan se bulayi jaati hai? (Pichhle stage ka <code>finally</code>.) Wahan kuch na ho toh?',
            explain: 'Slow motion mein rokne ke niyam ne 7 ki jagah 2 requests girne di — sirf isliye ki yeh line chal saki: <code>3.00 s ↩️ rollback: instance 2 theek kiya</code>.',
          },
        },
        {
          clock: 'chalao',
          line: [48, 49, 50],
          say: `Lines 48–49: 3000 ms tak dekho, har 1000 ms par ek naap. Line 50: is tool mein <code>sleep</code> nakli hai (turant lautta hai), isliye tool ek pal mein khatam ho jaata hai. Asli prayog mein yahan asli intezaar hoga.
            <pre>              steady  fault             t=1 s  t=2 s  t=3 s   faisla
retry nahi      100%  instance 1 mara     65%      —      —   ABORT (1000 ms par roka)
retry hai       100%  instance 1 mara    100%   100%   100%   hypothesis tika</pre>`,
          ask: {
            q: 'Dono run mein monkey ne instance 1 ko hi maara. Kyun?',
            choices: [
              'Line 36: dono run mein monkey ko naya <code>seeded(7)</code> mila. Wahi beej → wahi pehli sankhya (0.0117) → wahi shikaar. Isliye dono run ka muqabla barabari ka hai: farak sirf retry ka hai',
              'Monkey hamesha list ka pehla instance maarta hai',
              'Instance 1 sabse kamzor hai',
              'Ittefaq — agli baar alag hoga',
            ],
            answer: 0,
            hint: 'Line 36 dekho. Aur yaad karo: pichhle stage mein <code>random()</code> ne kya diya tha?',
            explain: 'Beej badlo, toh shikaar badal sakta hai: beej 1 ki pehli sankhya 0.6271 hai → instance 2; beej 2 ki 0.7343 → instance 3. (Yeh sankhyaein <code>tools/seeded.js</code> chala ke nikali gayi hain.)',
          },
        },
        {
          clock: 'apne app mein',
          line: [41, 42, 43, 44],
          say: `Apne app mein yahi chaar function badalte hain. Dhancha wahi rehta hai.
            <div class="dr-scroll"><table>
              <tr><th>Function</th><th><code>mini.js</code> mein</th><th>Lab ke asli-raftaar wale tool mein (<code>tools/experiment.js</code>)</th></tr>
              <tr><td><code>measure</code></td><td>20 nakli requests ka safal %</td><td>pichhle 500 ms mein poori hui requests ka safal % — monitoring jaisa</td></tr>
              <tr><td><code>hypothesis</code></td><td><code>m &gt;= 95</code></td><td><code>m &gt;= 95</code></td></tr>
              <tr><td><code>inject</code></td><td>jhanda <code>dead</code></td><td>instance 2 ko bimaar karna (aadha-zinda, dheema, ya band)</td></tr>
              <tr><td><code>rollback</code></td><td>jhanda hatao</td><td>instance 2 ki bimaari hatao</td></tr>
            </table></div>
            Tumhare system mein <code>inject</code> ek container rokna ya ek pod delete karna ho sakta hai, aur <code>measure</code> tumhare apne metrics se aayega.`,
          vars: { m: 'apne metrics se: safal %', inj: 'ek asli chot', rb: 'wahi chot wapas' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> apne app mein chaar function likhne hain: naapo, andaaza, chot, chot wapas. Sabse pehle <code>rollback</code> likho. Aur sabse zyada dhyan <code>measure</code> par do — andaaza aur rokne ka niyam, dono usi ek sankhya ko dekhte hain.',
    },

    /* ---------------- 4. chalao, phir ek line badlo ---------------- */
    {
      type: 'docker',
      title: '🐳 Lab — sabse chhota prayog, phir rokne ka niyam hata ke',
      project: '42-chaos',
      exercise: 'ex0-slowmo',
      goal: 'Pehle tools/mini.js jaisa hai waisa chalao. Phir ek line band karke dobara chalao — aur dekho ki rokne ka niyam kya bacha raha tha.',
      why: '<code>tools/mini.js</code> mein koi service nahi chalti: teen nakli instances, nakli ghadi, tay beej. Isliye tumhara output bilkul yahi hoga. Docker nahi chahiye — sirf Node 18+.',
      steps: [
        { text: 'Jaisa hai waisa chalao.', cmd: 'cd docker-labs/42-chaos && node tools/mini.js', expect: "3 nakli instances, baari-baari · hypothesis: kam se kam 95% safal · abort rule: 80% se neeche · monkey (beej 7)\n\n              steady  fault             t=1 s  t=2 s  t=3 s   faisla\nretry nahi      100%  instance 1 mara     65%      —      —   ABORT (1000 ms par roka)\nretry hai       100%  instance 1 mara    100%   100%   100%   hypothesis tika\n\nfaisla: ABORT = abort rule lagi, fault turant hataya · hypothesis tika = fault ke dauraan bhi hypothesis sach\n       hypothesis toota = fault poora chala, hypothesis jhooti · shuru hi mat karo = steady state hi kharab tha" },
        { text: 'Ab tools/mini.js kholo. Line 47 (jo "abortIf:" se shuru hoti hai) ke aage // lagao, save karo, aur dobara chalao. "retry nahi" wali line dekho.', cmd: 'node tools/mini.js', expect: "3 nakli instances, baari-baari · hypothesis: kam se kam 95% safal · abort rule: 80% se neeche · monkey (beej 7)\n\n              steady  fault             t=1 s  t=2 s  t=3 s   faisla\nretry nahi      100%  instance 1 mara     65%    70%    65%   hypothesis toota\nretry hai       100%  instance 1 mara    100%   100%   100%   hypothesis tika\n\nfaisla: ABORT = abort rule lagi, fault turant hataya · hypothesis tika = fault ke dauraan bhi hypothesis sach\n       hypothesis toota = fault poora chala, hypothesis jhooti · shuru hi mat karo = steady state hi kharab tha" },
        { text: 'Line 47 se // hata do (file pehle jaisi). Ek baar phir chalao: output pehle step jaisa hona chahiye.', cmd: 'node tools/mini.js' },
      ],
      observe: {
        q: 'Line 47 band karne par "retry nahi" wale run mein kya badla?',
        choices: [
          'Pehle: ek naap (65%) ke baad roka gaya. Ab: teeno naap hue (65%, 70%, 65%), chot poore 3000 ms chali, faisla "hypothesis toota". Dono ne wahi kami dikhayi — doosre ne teen guna der tak nuksaan hone diya',
          'Kuch nahi badla',
          '"retry hai" wala run bhi fail ho gaya',
          'Tool error dene laga',
        ],
        answer: 0,
        explain: 'lib/experiment.js ki line 38: <code>if (abortIf &amp;&amp; abortIf(m))</code>. <code>abortIf</code> na ho, toh <code>break</code> kabhi nahi chalta. (Output ki pehli line phir bhi "abort rule: 80% se neeche" kehti hai — woh line bas chhapi hui hai.)',
      },
      lesson: 'Rokne ka niyam kami ko chhupata nahi. Kami utni hi dikhti hai — bas keemat kam lagti hai.',
    },

    /* ---------------- 5. asli tools ---------------- */
    {
      type: 'cards',
      title: '🧰 Wahi cheezein — asli tools mein',
      goal: 'Chaar chhote cards. Yeh cards in tools ki <b>official documentation</b> se hain; is lab mein yeh tools chalaye nahi gaye.',
      steps: [
        {
          title: '1. Chaos Monkey (Netflix): wahi monkey, ek time-table ke saath',
          say: `Chaos Monkey ki documentation ke mutabiq, Chaos Monkey <b>production</b> mein chalne wale virtual machines aur containers ko random band karta hai. Maqsad: engineers ka saamna failure se baar-baar ho, taaki engineers services ko mazboot banayein.<br><br>
            Kab aur kitna — documentation se:
            <ul>
              <li>har <b>weekday</b>, har instance group ke liye ek sikka uchhalta hai. Sikka "haan" kahe, toh usi din <b>9AM se 3PM</b> ke beech ek random waqt par us group ka ek instance band;</li>
              <li>default: ek group mein ausatan <b>2 din mein ek baar</b>, aur ek din mein ek se zyada kabhi nahi;</li>
              <li>har app ke liye chalu ya band kiya ja sakta hai.</li>
            </ul>
            Yeh version Spinnaker (deployment ka ek platform) ke saath hi chalta hai.`,
          ask: {
            q: 'Documentation ke mutabiq Chaos Monkey ka kaam instances ko <b>band</b> karna hai. Pichhle level ki teen chot mein se yeh kaunsi hai?',
            choices: [
              '"Mar gaya" wali. Dheema aur aadha-zinda instance Chaos Monkey se nahi parkhe jaate — aur lab mein health check inhi do ko nahi pakad paaya tha',
              'Teeno: band karna hi sab kuch hai',
              '"Dheema" wali',
              '"Aadha-zinda" wali',
            ],
            answer: 0,
            hint: 'Level 2 ki table yaad karo: kis chot mein health check ne instance ko list se hataya tha?',
            explain: 'Lab (sirf health check): mar gaya → 12 requests giri · dheema → 133–134 · aadha-zinda → 133. Instance band karna sabse aasaan chot hai.',
          },
        },
        {
          title: '2. AWS Fault Injection Service: rokne ka niyam = "stop condition"',
          say: `AWS ki documentation ke mutabiq, <b>stop condition</b> prayog ko rokne ka tareeka hai: jab prayog us hadd tak pahunch jaaye jo tumne ek CloudWatch alarm ke roop mein tay ki hai, AWS FIS prayog rok deta hai. Roka hua prayog dobara chalu nahi hota.<br><br>
            Wahi page yeh bhi kehta hai: stop condition banane se pehle apne app ka <b>steady state</b> tay karo — jaise latency, CPU load, ya retries ki ginti.
            <pre>"stopConditions": [
  { "source": "aws:cloudwatch:alarm",
    "value": "arn:aws:cloudwatch:region:123456789012:alarm:alarm-name" }
]</pre>
            Documentation yeh bhi dikhati hai ki "koi stop condition nahi" kaise likha jaata hai: <code>"source": "none"</code>.`,
          ask: {
            q: '<code>"source": "none"</code> hamare code mein kis cheez ke barabar hai?',
            choices: [
              '<code>abortIf</code> na dena. Tab prayog poora chalta hai, naap kitna bhi gire — slow motion mein 2 ki jagah 7 requests giri thi',
              '<code>rollback</code> na dena',
              '<code>hypothesis</code> na dena',
              'Prayog chalana hi nahi',
            ],
            answer: 0,
            hint: 'Hamare function mein kaunsi cheez optional thi?',
            explain: 'Hamara <code>abortIf</code> = AWS ka stop condition. Hamara "aam din ka naap" = AWS ka steady state. Naam alag, cheez wahi.',
          },
        },
        {
          title: '3. Chaos Mesh (Kubernetes): chot ek YAML file hai',
          say: `Chaos Mesh ki documentation ka ek poora udaharan:
            <pre>${esc(POD_KILL_YAML)}</pre>
            <div class="dr-scroll"><table>
              <tr><th>YAML mein</th><th>Hamare monkey mein</th></tr>
              <tr><td><code>selector</code></td><td><code>targets</code> — kaun-kaun toot sakta hai</td></tr>
              <tr><td><code>mode: one</code></td><td><code>random()</code> — documentation: "selecting a random Pod"</td></tr>
              <tr><td><code>action: pod-kill</code></td><td><code>kill</code> — todne ka tareeka</td></tr>
            </table></div>
            Documentation ke mutabiq yeh udaharan chune hue Pod ko <b>ek baar</b> maarta hai — hamare <code>monkey.strike()</code> ki tarah. Do aur action hain: <code>pod-failure</code> (Pod kuch der ke liye unavailable) aur <code>container-kill</code>.<br><br>
            Documentation ek shart bhi likhti hai: mara hua Pod wapas tabhi aayega jab ReplicaSet jaisi koi cheez lagi ho. Yaani yahan "chot wapas" tumhare cluster ke bharose hai.`,
        },
        {
          title: '4. Envoy: asli requests dekh ke hatana = "outlier detection"',
          say: `Level 2 ka naya niyam (2 lagataar fail → 2 second bahar) lab ki <code>lib/rotation.js</code> mein 13 lines hai (lines 66–78):
            <pre>${esc(ON_REQUEST)}</pre>
            <code>streak</code> = is instance par lagataar kitni asli requests fail hui. Ek safal → 0. Ginti <code>eject</code> tak pahunchi → instance <code>ejectMs</code> ke liye list se bahar.<br><br>
            Envoy mein yahi kaam <b>outlier detection</b> karta hai; Envoy ki documentation ise "passive health checking" kehti hai. Default settings, documentation se:
            <div class="dr-scroll"><table>
              <tr><th>Envoy ki setting</th><th>Envoy ka default</th><th>Lab</th></tr>
              <tr><td><code>consecutive_5xx</code></td><td>5 lagataar 5xx</td><td>2</td></tr>
              <tr><td><code>base_ejection_time</code></td><td>30 s × (instance kitni baar nikala gaya)</td><td>2 s, har baar</td></tr>
              <tr><td><code>max_ejection_percent</code></td><td>10% — ek saath itne hi instances nikale ja sakte hain</td><td>koi hadd nahi</td></tr>
            </table></div>
            Lab ke number chhote isliye hain ki 2 second ke slow motion mein instance ka nikalna dikh sake.`,
          ask: {
            q: 'Envoy mein health check bhi laga hai aur outlier detection bhi, dono default settings par. Ek instance aadha-zinda hai: health check pass, asli requests fail. Documentation ke mutabiq kya hoga?',
            choices: [
              'Outlier detection instance ko nikalega, par agla safal health check instance ko <b>turant wapas</b> le aayega — default mein ek safal health check nikale hue instance ko wapas laata hai. Ilaaj: <code>successful_active_health_check_uneject_host</code> ko false karo',
              'Instance 30 second bahar rahega, phir wapas aayega',
              'Health check lagte hi outlier detection band ho jaata hai',
              'Envoy instance ko restart kar dega',
            ],
            answer: 0,
            hint: 'Aadhe-zinda instance ka health check kya kehta hai? Aur Envoy us jawab par default mein kitna bharosa karta hai?',
            explain: 'Envoy ki documentation yahi chetavni deti hai: agar health check asli traffic ko nahi parakhta, toh health check pass + traffic fail wale haal mein instance "samay se pehle" wapas aa jaata hai. Lab mein aisa nahi hota: lab ka niyam health check ke pass hone par instance ko wapas nahi laata.',
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> naam badalte hain, cheezein wahi rehti hain. Chot: Chaos Monkey, Chaos Mesh. Rokne ka niyam: AWS FIS ka <b>stop condition</b>. Asli requests dekh ke hatana: Envoy ka <b>outlier detection</b>. Aur har tool ke default tumhare system ke liye nahi chune gaye — unhe padh ke lagao.',
    },
  ],
  interview: {
    title: 'Interview Round — code ki baat',
    instructions: 'Interviewer dekhna chahta hai ki tum prayog ko code mein soch sakte ho — sirf naam nahi jaante. 🎤',
    questions: [
      {
        q: '"Chaos experiment ka code likhna ho, toh sabse zaroori hissa kaunsa hai — aur kyun?"',
        choices: [
          'Chot wapas lene wala hissa, <code>finally</code> ke andar: prayog kaise bhi khatam ho — poora chale, beech mein roka jaaye, ya naapte waqt error aaye — chot hat-ni chahiye. Uske baad: chot se pehle ek naap, aur naap kharab ho toh chot dena hi nahi',
          'Random number banane wali line',
          'Log chhapne wali line',
          'Intezaar (sleep) wali line',
        ],
        answer: 0,
        explain: 'lib/experiment.js: line 44 <code>await rollback()</code> <code>finally</code> ke andar hai. Lines 20–25: aam din ka naap kharab → function laut jaata hai, line 32 (<code>inject</code>) kabhi nahi chalti.',
      },
      {
        q: '"Humne Chaos Monkey jaisa tool laga liya. Kya ab hum chaos engineering kar rahe hain?"',
        choices: [
          'Aadha. Monkey sirf chot hai. Prayog ke liye chahiye: aam din ka naap, likha hua andaaza, rokne ka niyam, aur chot wapas lene ka tareeka. Aur instance band karna sirf ek tarah ki chot hai — dheema aur aadha-zinda instance alag se parakhne honge',
          'Haan — random todna hi chaos engineering hai',
          'Nahi — chaos engineering sirf bahut badi companies ke liye hai',
          'Haan, agar monkey roz chale',
        ],
        answer: 0,
        explain: 'Lab: <code>mini.js</code> mein monkey ki chot <code>inject</code> ke andar hai, <code>runExperiment</code> ke dhanche mein. Akela monkey (3 instances, health check nahi) → 201 requests giri, aur kisi ne roka nahi.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki <code>runExperiment</code> ke teen hisse kya hain, aur <code>rollback</code> <code>finally</code> ke andar kyun hai',
    'Bata sakte ho ki monkey ko <code>random</code> bahar se kyun milta hai',
    'Apne app ke liye chaar function ke naam aur kaam gin sakte ho',
  ],
  cards: [
    { front: 'runExperiment ke teen hisse?', back: '1) Pehle naapo; kharab → "shuru hi mat karo", chot nahi. 2) try: chot do, har everyMs par naapo; abortIf sach → break. 3) finally: rollback — hamesha. Phir faisla.' },
    { front: 'Faisla kaise banta hai?', back: 'Teen lines; baad wali pehle wali ko dabaati hai. "hypothesis tika" → sabse kharab naap andaaze se neeche? "hypothesis toota" → roka gaya tha? "ABORT".' },
    { front: 'Monkey kitna code hai?', back: '20 line. i = floor(random() × targets.length); kill(targets[i]). Naap, andaaza, rokna — monkey mein nahi, prayog mein.' },
    { front: 'random bahar se kyun?', back: 'Tay beej → wahi shikaar, wahi kram → fail hua prayog dobara waise hi chalaya ja sakta hai. Lab: beej 3 → #3 #1 #2, dono run mein.' },
    { front: 'Asli tools mein wahi cheezein?', back: 'Chot: Chaos Monkey (instance band), Chaos Mesh (YAML: action, mode, selector). Rokne ka niyam: AWS FIS ka stop condition. Asli requests dekh ke hatana: Envoy ka outlier detection (default: 5 lagataar 5xx, 30 s). Sab documentation se.' },
  ],
},
]);

})();
