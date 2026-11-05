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
  t: 'Tum chaar function likhte ho. Prayog ka dhancha in chaar function ko sahi kram mein chalata hai — aur har haal mein chot wapas lene ki koshish karta hai. Monkey sirf chot hai',
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
              'Line 21 par function laut jaata — "shuru hi mat karo"; line 32 (inject) kabhi nahi chalti',
              'Chot lagti, phir agla naap aate hi turant wapas li jaati, kyunki naap pehle se kharab tha',
              'Function 60 ko naya "aam din ka naap" maan leta, aur prayog waise hi aage badhta',
              'measure() dobara chalta, jab tak achha naap na mile — phir prayog shuru hota',
            ],
            answer: 0,
            hint: 'Line 21 ka pehla shabd kya hai? Us shabd ke baad function ka baaki code chalta hai?',
            explain: 'Line 21 return hai: function wahin khatam. Slow motion mein yahi dikha tha: 2.00 s 📋 faisla: shuru hi mat karo — aur chot kabhi di hi nahi gayi.',
            choiceExplanations: [
              'Line 21 return hai: function wahin khatam. Slow motion mein yahi dikha tha: 2.00 s 📋 faisla: shuru hi mat karo — aur chot kabhi di hi nahi gayi.',
              'Chot ke baad rokne wali lines (38–40) tak code pahunchta hi nahi. Line 21 ka return function wahin khatam kar deta hai.',
              'Code aam din ka naap chupke se nahi badalta. hypothesis(60) false hai, toh prayog shuru hi nahi hota.',
              'Is code mein naap dobara lene ka koi loop nahi. Ek naap, ek faisla.',
            ],
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
              '65 < 80 sach hai — abortedAt = 1000, aur break loop yahin tod deta hai; agle naap nahi',
              'Loop teeno naap poore karega (1000, 2000, 3000), aur aakhir mein ek saath faisla hoga',
              'Function turant return kar dega, aur chot wapas liye bina prayog khatam ho jaayega',
              'abortIf sirf aakhri naap par dekha jaata hai, toh abhi loop aage badhta rahega',
            ],
            answer: 0,
            hint: 'Line 38 loop ke andar hai ya bahar? Aur line 40 kya karti hai?',
            explain: 'Lab ka output: retry nahi · 100% · instance 1 mara · 65% · — · — · ABORT (1000 ms par roka). Do "—" wahi naap hain jo kabhi hue hi nahi.',
            choiceExplanations: [
              'Lab ka output: retry nahi · 100% · instance 1 mara · 65% · — · — · ABORT (1000 ms par roka). Do "—" wahi naap hain jo kabhi hue hi nahi.',
              'Line 38 loop ke andar hai — har naap ke baad chalti hai. Pehle hi naap par 65 < 80, toh loop wahin toota.',
              'break sirf loop se nikalta hai, function se nahi. Loop ke baad finally (line 44) chot wapas leta hai.',
              'Line 38 har chakkar mein chalti hai, sirf aakhri mein nahi. Isliye kharab naap turant pakda jaata hai.',
            ],
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
              'Line 44: rollback() — finally mein hai, toh loop kaise bhi khatam ho, rollback bulaya jaata hai',
              'Line 48: seedha faisla — rollback sirf tab chalta hai jab loop poore chakkar chal le',
              'Line 33: loop dobara shuru hota hai, kyunki break sirf ek chakkar chhodta hai',
              'Kuch nahi — break ke saath function yahin khatam, aur chot lagi reh jaati hai',
            ],
            answer: 0,
            hint: 'Line 43 ka shabd dekho. finally try ke saath kya vaada karta hai?',
            explain: 'try { … } finally { … }: loop poora chale, break ho, ya naapte waqt error aaye — finally ka code chalta hai. Agar rollback() loop ke baad seedha likha hota aur measure() beech mein error de deta, toh chot lagi reh jaati — aur prayog khud ek outage ban jaata. (Dhyaan: rollback() khud bhi fail ho sakta hai — rollback ko alag se parakh lo.)',
            choiceExplanations: [
              'try { … } finally { … }: loop poora chale, break ho, ya naapte waqt error aaye — finally ka code chalta hai. Agar rollback() loop ke baad seedha likha hota aur measure() beech mein error de deta, toh chot lagi reh jaati — aur prayog khud ek outage ban jaata. (Dhyaan: rollback() khud bhi fail ho sakta hai — rollback ko alag se parakh lo.)',
              'Faisla (lines 47–50) finally ke baad aata hai. Rollback pehle, faisla baad mein.',
              'break loop se poori tarah bahar nikalta hai. Ek chakkar chhodna continue ka kaam hai.',
              'break function khatam nahi karta, aur finally ka code chalna hi hai: rollback() bulaya jaata hai. (Rollback khud fail ho toh chot lagi reh sakti hai — rollback ko alag se parkho.)',
            ],
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
              'abortIf && … false — break kabhi nahi, chot poore 3000 ms, faisla "hypothesis toota"',
              'Function shuru mein hi error dega — abortIf ke bina runExperiment chal hi nahi sakta',
              'Faisla phir bhi ABORT aayega — pehla kharab naap dekhte hi code apne aap rok dega',
              'Chot lagegi hi nahi — rokne ka niyam na ho toh inject wali line bhi chhoot jaati hai',
            ],
            answer: 0,
            hint: 'Line 38 ko dhyan se padho: <code>abortIf</code> do baar likha hai. Pehli baar kyun?',
            explain: 'abortIf optional hai: line 38 ka abortIf && … abortIf na ho toh check hi chhod deta hai. Is level ke lab mein tum abortIf khud hata ke dekhoge. Output: retry nahi · 100% · instance 1 mara · 65% · 70% · 65% · hypothesis toota.',
            choiceExplanations: [
              'abortIf optional hai: line 38 ka abortIf && … abortIf na ho toh check hi chhod deta hai. Is level ke lab mein tum abortIf khud hata ke dekhoge. Output: retry nahi · 100% · instance 1 mara · 65% · 70% · 65% · hypothesis toota.',
              'Code abortIf ki jaanch nahi karta. Line 38 ka pehla hissa (abortIf &&) bas check chhod deta hai.',
              'Bina abortIf ke koi default hadd nahi. Kharab naap bas samples mein likhe jaate hain.',
              'Inject (line 32) abortIf par nirbhar nahi. Aam din ka naap theek tha, toh chot lagi.',
            ],
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
            Monkey ko nahi pata ki "todna" kya hota hai. Process band karna, container rokna, pod delete karna — sab <code>kill</code> ke andar hai.`,
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
              'Taaki tay beej wala random diya ja sake — wahi beej, wahi shikaar, kal ka prayog aaj dobara',
              'Math.random bahut dheema hai, isliye bahar se ek tez random function diya jaata hai',
              'Production mein Math.random likhna mana hai, isliye random hamesha bahar se aata hai',
              'Taaki monkey hamesha instance 1 ko hi maare, aur nateeja har baar bilkul ek jaisa aaye',
            ],
            answer: 0,
            hint: 'Ek prayog ne kal ek kami dikhayi. Aaj tum apna fix parakhna chahte ho. Monkey ne aaj koi aur instance maara toh?',
            explain: 'Lab, asli raftaar: beej 3 ke saath 2 run → dono mein shikaar #3 #1 #2. Beej ke bina teen run → #1 #2 #2 | #1 #3 #3 | #2 #1 #2: har baar alag. Beej shikaar dohrata hai, poori timing nahi — asli raftaar mein numbers thode badalte hain.',
            choiceExplanations: [
              'Lab, asli raftaar: beej 3 ke saath 2 run → dono mein shikaar #3 #1 #2. Beej ke bina teen run → #1 #2 #2 | #1 #3 #3 | #2 #1 #2: har baar alag. Beej shikaar dohrata hai, poori timing nahi — asli raftaar mein numbers thode badalte hain.',
              'Raftaar wajah nahi — monkey har 4 s mein ek hi baar random maangta hai.',
              'Math.random mana nahi hai. Bahar se dene ka fayda: test mein tay beej, production mein asli random.',
              'Tay beej se shikaar dohraya jaata hai, par hamesha instance 1 nahi — beej badlo toh shikaar badal sakta hai.',
            ],
          },
        },
        {
          clock: 'baar-baar',
          line: [21, 22, 23],
          say: '<code>start()</code> ek ghadi lagata hai: har <code>everyMs</code> par ek <code>strike</code>.<br><br>Lab ka <code>tools/monkey.js</code> start() se har 4 second par ek random instance maarta hai.',
        },
        {
          clock: 'ruko',
          line: [24, 25, 26],
          say: '<code>stop()</code> ghadi band karta hai: aage koi nayi chot nahi.<br><br>Dhyan do: <code>stop()</code> kisi mare hue target ko <b>zinda nahi karta</b>.',
          ask: {
            q: 'Monkey ne ek instance maara, aur safal requests 60% par gir gayi. Monkey ki kaunsi line is nuksaan ko dekh ke rukti hai?',
            choices: [
              'Koi nahi — monkey sirf chot deta hai; naapna aur rokna runExperiment ka kaam hai',
              'Line 25: clearInterval nuksaan dekh ke apne aap chal jaata hai, aur monkey ruk jaata hai',
              'Line 14: kharab haal mein random() 0 deta hai, toh monkey kisi ko nahi maarta',
              'Line 15: kill() pehle system ka haal poochhta hai, aur kharab ho toh nahi maarta',
            ],
            answer: 0,
            hint: 'Monkey ki 20 lines mein "measure" ya "abort" jaisa koi shabd hai?',
            explain: 'Monkey ke paas na aam din ka naap hai, na andaaza, na rokne ka niyam. Agle stage mein jod dikhega: inject: () => { out.victim = monkey.strike(); }, — monkey ki ek chot, prayog ke dhanche ke andar.',
            choiceExplanations: [
              'Monkey ke paas na aam din ka naap hai, na andaaza, na rokne ka niyam. Agle stage mein jod dikhega: inject: () => { out.victim = monkey.strike(); }, — monkey ki ek chot, prayog ke dhanche ke andar.',
              'clearInterval tabhi chalta hai jab koi stop() bulaye. Monkey khud nuksaan nahi dekhta.',
              'random() ko system ka haal pata hi nahi. random() bas ek sankhya deta hai.',
              'kill() bas target band karta hai. Haal poochhna measure() ka kaam hai, jo prayog mein hai.',
            ],
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> chaos monkey = "ek random target chuno, tod do". Bas. Monkey <b>chot</b> hai, prayog nahi: naap, andaaza aur rokne ka niyam monkey ke bahar hote hain. Aur <code>random</code> bahar se dene ka fayda: tay beej ke saath wahi chot dobara di ja sakti hai.',
    },

    /* ---------------- 3. tools/mini.js ---------------- */
    {
      type: 'dryrun',
      title: '🧩 tools/mini.js — dono ko apne app mein jodna',
      goal: 'File ki lines 5–53 wahi hain jo tum apne project mein likhoge. Upar ki do files ko haath nahi lagana — dono files ko bas <code>require</code> karna hai.',
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
            Tumhare app mein nakli fleet wala hissa nahi hoga: tumhare app mein asli instances aur asli load balancer hain.`,
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
            Dono sirf ek sankhya dekhte hain: wahi jo <code>measure</code> ne lautayi. Isliye sabse zaroori baat: <code>measure</code> sahi cheez naape.`,
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
            q: 'Ek team ne inject likh liya (ek database node band karna). rollback ke liye team ne kaha: "baad mein likhenge". Kya prayog chalana chahiye?',
            choices: [
              'Pehle rollback likho aur akele chala ke parakho; chot wapas na ho toh rokna bekaar',
              'Rokne ka niyam laga hai, naap girte hi prayog ruk jaayega, toh koi khatra nahi',
              'Health check band node ko pehchaan lega, aur system khud hi sambhal lega',
              'Bas prayog chhota rakho, 10 second ka, toh rollback ki zaroorat nahi padegi',
            ],
            answer: 0,
            hint: 'Line 44 kahan se bulayi jaati hai? (Pichhle stage ka finally.) finally mein kuch na ho toh?',
            explain: 'Slow motion mein rokne ke niyam ne 7 ki jagah 2 requests girne di — sirf isliye ki rollback chal saka: 3.00 s ↩️ rollback: instance 2 theek kiya. Rollback ke bina "roko" ka koi matlab nahi.',
            choiceExplanations: [
              'Slow motion mein rokne ke niyam ne 7 ki jagah 2 requests girne di — sirf isliye ki rollback chal saka: 3.00 s ↩️ rollback: instance 2 theek kiya. Rollback ke bina "roko" ka koi matlab nahi.',
              'Rokne ka niyam sirf loop todta hai. Band database node rollback ke bina band hi rahega — naap girta rahega.',
              'Health check sirf dekhta hai, band node ko chalu nahi karta. Chot wapas lena rollback ka kaam hai.',
              'Prayog 10 second ka ho, par chot wapas kaun lega? Chhota samay chhoti chot ka vaada nahi.',
            ],
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
              'Line 36: dono run mein naya seeded(7) mila — wahi beej, wahi pehli sankhya, wahi shikaar',
              'Monkey hamesha list ka pehla instance maarta hai, beej chahe koi bhi diya ho',
              'Instance 1 sabse kamzor tha, isliye monkey ne dono baar instance 1 ko hi chuna',
              'Ittefaq tha — agli baar chalaoge toh shayad koi aur instance marega',
            ],
            answer: 0,
            hint: 'Line 36 dekho. Aur yaad karo: pichhle stage mein <code>random()</code> ne kya diya tha?',
            explain: 'Wahi beej → wahi pehli sankhya (0.0117) → wahi shikaar. Isliye dono run ka muqabla barabari ka hai: farak sirf retry ka hai. Beej badlo, toh shikaar badal sakta hai: beej 1 ki pehli sankhya 0.6271 → instance 2; beej 2 ki 0.7343 → instance 3.',
            choiceExplanations: [
              'Wahi beej → wahi pehli sankhya (0.0117) → wahi shikaar. Isliye dono run ka muqabla barabari ka hai: farak sirf retry ka hai. Beej badlo, toh shikaar badal sakta hai: beej 1 ki pehli sankhya 0.6271 → instance 2; beej 2 ki 0.7343 → instance 3.',
              'Shikaar random() ki sankhya se chuna jaata hai. Beej 1 se instance 2 marta, beej 2 se instance 3.',
              'Monkey kisi instance ki taakat nahi dekhta. Shikaar sirf random sankhya se tay hota hai.',
              'Tay beej mein ittefaq nahi. Har baar wahi beej → wahi shikaar.',
            ],
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
          'Pehle ek naap (65%) par ruka; ab teeno naap hue, chot poore 3000 ms — "hypothesis toota"',
          'Beej badal gaya, isliye ab monkey ne doosra instance maara aur nateeja badal gaya',
          'Retry band ho gaya, isliye "retry hai" wala run bhi ab fail hone laga',
          'Rollback hat gaya, isliye prayog ke baad bhi instance 1 mara hi pada raha',
        ],
        answer: 0,
        explain: 'Dono ne wahi kami dikhayi — doosre ne teen guna der tak nuksaan hone diya. lib/experiment.js ki line 38: if (abortIf && abortIf(m)). abortIf na ho, toh break kabhi nahi chalta. (Output ki pehli line phir bhi "abort rule: 80% se neeche" kehti hai — output ki line bas chhapi hui hai.)',
        choiceExplanations: [
          'Dono ne wahi kami dikhayi — doosre ne teen guna der tak nuksaan hone diya. lib/experiment.js ki line 38: if (abortIf && abortIf(m)). abortIf na ho, toh break kabhi nahi chalta. (Output ki pehli line phir bhi "abort rule: 80% se neeche" kehti hai — output ki line bas chhapi hui hai.)',
          'Beej wahi 7 raha — dono run mein instance 1 hi mara.',
          'Line 47 rokne ka niyam thi, retry nahi. "Retry hai" wala run phir bhi tika.',
          'Rollback finally mein hai, line 47 se alag. Chot phir bhi aakhir mein wapas li gayi.',
        ],
      },
      lesson: 'Rokne ka niyam kami ko chhupata nahi. Kami utni hi dikhti hai — bas keemat kam lagti hai.',
    },

    /* ---------------- 5. asli tools ---------------- */
    {
      type: 'cards',
      title: '🧰 Wahi cheezein — asli tools mein',
      goal: 'Chaar chhote cards. Ye cards in tools ki <b>official documentation</b> se hain; is lab mein ye tools chalaye nahi gaye.',
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
            Chaos Monkey ka ye version Spinnaker (deployment ka ek platform) ke saath hi chalta hai.`,
          ask: {
            q: 'Team ne Chaos Monkey se instance khona parakh liya. Ab team ko aadha-zinda haal parakhna hai: /health safal, par /work galat jawab. Kya Chaos Monkey akela kaafi hai?',
            choices: [
              'Nahi — instance band karna aur chalte instance se galat jawab aana alag-alag chot hain',
              'Haan — instance band karne par galat jawab wala haal bhi apne aap parakh jaata hai',
              'Haan — band hone se pehle har instance kuch der aadha-zinda zaroor hota hai',
              'Nahi — bas instance ko zyada der band rakho, toh galat jawab wala haal bhi dikhega',
            ],
            answer: 0,
            hint: 'Aadha-zinda instance ka /health kya kehta hai? Band instance ka /health kya kehta hai?',
            explain: 'Lab (sirf health check): mar gaya → 12 requests giri · dheema → 133–134 · aadha-zinda → 133. Instance band karna sabse aasaan chot hai — dheema ya aadha-zinda haal parakhne ke liye alag fault (latency, galat jawab) daalne padte hain.',
            choiceExplanations: [
              'Lab (sirf health check): mar gaya → 12 requests giri · dheema → 133–134 · aadha-zinda → 133. Instance band karna sabse aasaan chot hai — dheema ya aadha-zinda haal parakhne ke liye alag fault (latency, galat jawab) daalne padte hain.',
              'Band instance koi jawab nahi deta, aur health check band instance ko turant pakad leta hai. Aadha-zinda instance health check ko "theek hoon" kehta hai.',
              'Chaos Monkey instance ek jhatke mein band karta hai — beech ka aadha-zinda haal hota hi nahi.',
              'Band rehne ka samay badhane se chot ka prakaar nahi badalta. Galat jawab ke liye alag fault daalna padta hai.',
            ],
          },
        },
        {
          title: '2. AWS Fault Injection Service: rokne ka niyam = "stop condition"',
          say: `AWS ki documentation ke mutabiq, <b>stop condition</b> prayog ko rokne ka tareeka hai: jab prayog us hadd tak pahunch jaaye jo tumne ek CloudWatch alarm ke roop mein tay ki hai, AWS FIS prayog rok deta hai. Roka hua prayog dobara chalu nahi hota.<br><br>
            Wahi page ye bhi kehta hai: stop condition banane se pehle apne app ka <b>steady state</b> tay karo — jaise latency, CPU load, ya retries ki ginti.
            <pre>"stopConditions": [
  { "source": "aws:cloudwatch:alarm",
    "value": "arn:aws:cloudwatch:region:123456789012:alarm:alarm-name" }
]</pre>
            Documentation ye bhi dikhati hai ki "koi stop condition nahi" kaise likha jaata hai: <code>"source": "none"</code>.`,
          ask: {
            q: '<code>"source": "none"</code> hamare code mein kis cheez ke barabar hai?',
            choices: [
              'abortIf na dena — prayog poora chalta hai, naap kitna bhi gire, koi nahi rokta',
              'rollback na dena — prayog ke baad chot wapas nahi li jaati, lagi reh jaati hai',
              'hypothesis na dena — prayog chalta hai, par tika ya toota, koi faisla nahi hota',
              'Prayog chalana hi nahi — "none" ka matlab hai ki koi chot nahi di jaayegi',
            ],
            answer: 0,
            hint: 'Hamare function mein kaunsi cheez optional thi?',
            explain: 'Hamara abortIf = AWS ka stop condition. "source": "none" = rokne ka koi niyam nahi; prayog poora chalta hai (slow motion mein 2 ki jagah 7 requests giri thi). Hamara "aam din ka naap" = AWS ka steady state. Naam alag, cheez wahi.',
            choiceExplanations: [
              'Hamara abortIf = AWS ka stop condition. "source": "none" = rokne ka koi niyam nahi; prayog poora chalta hai (slow motion mein 2 ki jagah 7 requests giri thi). Hamara "aam din ka naap" = AWS ka steady state. Naam alag, cheez wahi.',
              'Stop condition rokne ka niyam hai, chot wapas lene ka nahi. Rollback alag cheez hai.',
              'Hypothesis andaaza hai, stop condition hadd. "none" sirf hadd hatata hai.',
              '"none" ke saath bhi prayog chalta hai aur chot lagti hai — bas koi alarm prayog ko nahi rokta.',
            ],
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
            Documentation ke mutabiq ye udaharan chune hue Pod ko <b>ek baar</b> maarta hai — hamare <code>monkey.strike()</code> ki tarah. Do aur action hain: <code>pod-failure</code> (Pod kuch der ke liye unavailable) aur <code>container-kill</code>.<br><br>
            Documentation ek shart bhi likhti hai: mara hua Pod wapas tabhi aayega jab ReplicaSet jaisi koi cheez lagi ho. Yaani yahan "chot wapas" tumhare cluster ke bharose hai.`,
        },
        {
          title: '4. Envoy: asli requests dekh ke hatana = "outlier detection"',
          say: `Level 2 ka naya niyam (2 lagataar fail → 2 second bahar) lab ki <code>lib/rotation.js</code> mein 13 lines hai (lines 66–78):
            <pre>${esc(ON_REQUEST)}</pre>
            <code>streak</code> = is instance par lagataar kitni asli requests fail hui. Ek safal → 0. Ginti <code>eject</code> tak pahunchi → instance <code>ejectMs</code> ke liye list se bahar.<br><br>
            Envoy mein yahi kaam <b>outlier detection</b> karta hai; Envoy ki documentation outlier detection ko "passive health checking" kehti hai. Default settings, documentation se:
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
              'Outlier detection nikalega, par agla safal health check instance ko turant wapas le aayega',
              'Instance poore 30 second bahar rahega, phir wapas aayega — health check kuch bhi kahe',
              'Health check laga ho toh outlier detection band ho jaata hai, sirf health check chalta hai',
              'Envoy aadha-zinda instance ko restart kar dega, aur restart ke baad instance theek hoga',
            ],
            answer: 0,
            hint: 'Aadhe-zinda instance ka health check kya kehta hai? Aur Envoy us jawab par default mein kitna bharosa karta hai?',
            explain: 'Envoy ki documentation yahi chetavni deti hai: health check asli traffic ko nahi parakhta, toh "health check pass + traffic fail" wale haal mein instance samay se pehle wapas aa jaata hai. Ilaaj: successful_active_health_check_uneject_host ko false karo. Lab mein aisa nahi hota: lab ka niyam health check ke pass hone par instance ko wapas nahi laata.',
            choiceExplanations: [
              'Envoy ki documentation yahi chetavni deti hai: health check asli traffic ko nahi parakhta, toh "health check pass + traffic fail" wale haal mein instance samay se pehle wapas aa jaata hai. Ilaaj: successful_active_health_check_uneject_host ko false karo. Lab mein aisa nahi hota: lab ka niyam health check ke pass hone par instance ko wapas nahi laata.',
              'Default mein ek safal health check nikale hue instance ko wapas le aata hai (successful_active_health_check_uneject_host = true). Poore 30 second ka intezaar nahi hota.',
              'Dono saath chal sakte hain. Dikkat: default mein health check ki ✓ outlier detection ka faisla palat deti hai.',
              'Envoy instance restart nahi karta — sirf traffic ki list badalta hai.',
            ],
          },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> naam badalte hain, cheezein wahi rehti hain. Chot: Chaos Monkey, Chaos Mesh. Rokne ka niyam: AWS FIS ka <b>stop condition</b>. Asli requests dekh ke hatana: Envoy ka <b>outlier detection</b>. Aur har tool ke default tumhare system ke liye nahi chune gaye — default padh ke lagao.',
    },
  ],
  interview: {
    title: 'Interview Round — code ki baat',
    instructions: 'Interviewer dekhna chahta hai ki tum prayog ko code mein soch sakte ho — sirf naam nahi jaante. 🎤',
    questions: [
      {
        q: '"Chaos experiment ka code likhna ho, toh sabse zaroori hissa kaunsa hai — aur kyun?"',
        choices: [
          'Chot wapas lene wala hissa, finally ke andar — aur chot se pehle naap, kharab ho toh chot nahi',
          'Random number wali line — achha random hi prayog ko sach mein "chaos" banata hai',
          'Prayog ka samay — jitni der chot chalegi, utni zyada kamiyan saamne aayengi',
          'Log chhapne wali line — har kadam ka log ho toh baad mein sab theek kiya ja sakta hai',
        ],
        answer: 0,
        explain: 'Chot wapas lene wala hissa, finally ke andar: prayog kaise bhi khatam ho — poora chale, beech mein roka jaaye, ya naapte waqt error aaye — chot hat-ni chahiye (aur rollback ko alag se parakh lo). Saath mein: chot se pehle ek naap, aur naap kharab ho toh chot dena hi nahi. lib/experiment.js: line 44 await rollback() finally ke andar hai. Lines 20–25: aam din ka naap kharab → function laut jaata hai, line 32 (inject) kabhi nahi chalti.',
        choiceExplanations: [
          'Chot wapas lene wala hissa, finally ke andar: prayog kaise bhi khatam ho — poora chale, beech mein roka jaaye, ya naapte waqt error aaye — chot hat-ni chahiye (aur rollback ko alag se parakh lo). Saath mein: chot se pehle ek naap, aur naap kharab ho toh chot dena hi nahi. lib/experiment.js: line 44 await rollback() finally ke andar hai. Lines 20–25: aam din ka naap kharab → function laut jaata hai, line 32 (inject) kabhi nahi chalti.',
          'Random kaam ka hai, par chot wapas na ho toh achha random bhi outage hi banayega.',
          'Lamba samay = zyada nuksaan. Pehle chhota, rok sakne wala prayog; samay baad mein badhao.',
          'Log chot wapas nahi lete. Log se pata chalega kya toota — par toota hi rahega.',
        ],
      },
      {
        q: '"Humne Chaos Monkey jaisa tool laga liya. Kya ab hum chaos engineering kar rahe hain?"',
        choices: [
          'Aadha — monkey sirf chot hai; naap, likha andaaza, rokne ka niyam, chot wapas lena bhi chahiye',
          'Haan — random tareeke se todna hi chaos engineering hai, baaki sab kaagazi kaam hai',
          'Haan, agar monkey roz chale — roz chot lagegi toh system apne aap mazboot ho jaayega',
          'Haan — production mein chal raha hai, toh andaaza likhne ki zaroorat nahi, nateeja dikhega',
        ],
        answer: 0,
        explain: 'Monkey sirf chot hai. Prayog ke liye chahiye: aam din ka naap, likha hua andaaza, rokne ka niyam, aur chot wapas lene ka tareeka. Aur instance band karna sirf ek tarah ki chot hai — dheema aur aadha-zinda instance alag se parakhne honge. Lab: mini.js mein monkey ki chot inject ke andar hai, runExperiment ke dhanche mein. Akela monkey (3 instances, health check nahi) → 201 requests giri, aur kisi ne roka nahi.',
        choiceExplanations: [
          'Monkey sirf chot hai. Prayog ke liye chahiye: aam din ka naap, likha hua andaaza, rokne ka niyam, aur chot wapas lene ka tareeka. Aur instance band karna sirf ek tarah ki chot hai — dheema aur aadha-zinda instance alag se parakhne honge. Lab: mini.js mein monkey ki chot inject ke andar hai, runExperiment ke dhanche mein. Akela monkey (3 instances, health check nahi) → 201 requests giri, aur kisi ne roka nahi.',
          'Bina andaaze ke pata hi nahi chalega ki kya seekha. Lab: akela monkey → 201 requests giri, aur kisi ne roka nahi.',
          'Roz chot se system mazboot nahi hota — team mazboot banati hai, jab naap aur andaaza kami dikhate hain.',
          'Asli traffic par naap aur bhi zaroori hai. Bina andaaze ke "asli nateeja" bas nuksaan hai.',
        ],
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
