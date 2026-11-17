/* First Principles — FAANG Senior Engineer.
   Source credit: Microservices — Know When NOT to Use (cmiAEDVcGbE), numbered video 13/15.
   Evidence: docker-labs/63-microservices/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "i", "icon": "📦", "label": "inventory DB", "x": 160, "y": 120}, {"id": "c", "icon": "🧭", "label": "saga log / coordinator", "x": 450, "y": 120}, {"id": "o", "icon": "🧾", "label": "orders DB", "x": 740, "y": 120}];
const EDGES = [{"from": "i", "to": "c"}, {"from": "c", "to": "o"}];
VISUALS["fp-micro-code"] = { t: "Do databases = do commits. Saga: log + compensation, beech ki haalat dikhti hai. 2PC: prepare + faisla, coordinator gire toh lock.", html: SD.viz.svg(HERO, EDGES, { nodes: { i: {tone:'busy',badge:'stock − 1'}, c: {tone:'acc',badge:'log / faisla'}, o: {tone:'busy',badge:'order +'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-micro-code",
  "icon": "💥",
  "group": "🧩 Microservices: Kab Nahi",
  "title": "Microservices 3 · Code — ek DB, saga ya 2PC?",
  "badge": "Do Bahi Ka Munim",
  "objectives": [
    "Ek transaction vs saga vs 2PC (code mein)",
    "Saga: durable log, compensation, isolation ki kami",
    "2PC: consistent par blocking"
  ],
  "lesson": [
    "<h3>📒 Do bahi-khaate</h3><p>Dukaan mein ek hi bahi ho toh \"maal gaya\" aur \"bill bana\" ek saath likho — ya dono, ya kuch nahi. Ab maal godaam ki bahi mein hai aur bill dukaan ki bahi mein. Godaam ne maal ghataya, phir dukaan ka munim beemar pad gaya — bill nahi bana.</p><p>Do bahiyon ko saath rakhne ke do raaste: har kadam ek diary mein likho aur baad mein poora karo (saga), ya dono munim pehle \"taiyaar\" bolein aur ek sardar faisla kare (2PC). Aaj code mein dono dekhte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🛒 twodb.js: \"1 cheez khareedo\" ke chaar tareeke",
      "goal": "lib/twodb.js (asli ginti). Khareedna (operation id op1) = stock − 1 AUR order banana. Monolith mein dono ek DB mein; microservices mein stock inventory DB mein, order orders DB mein. Har tareeka steps ki ek list hai (line 35–40).",
      "code": {
        "title": "lib/twodb.js",
        "file": "docker-labs/63-microservices/lib/twodb.js",
        "from": 17,
        "text": "  begin: w => { w.inv.txn = { stock: w.inv.stock, orders: w.ord.orders }; },\n  'txn stock-1': w => { w.inv.txn.stock--; },\n  'txn order+': (w, o) => { if (o.orderFails) throw new Error('order failed'); w.inv.txn.orders++; },\n  commit: w => { w.inv.stock = w.inv.txn.stock; w.ord.orders = w.inv.txn.orders; w.inv.txn = null; },\n  // saga participants (each step commits in its own database, idempotent by receipt)\n  'inv reserve': w => { if (!w.inv.applied.has(OP)) { w.inv.stock--; w.inv.applied.set(OP, 'reserved'); } },\n  'ord create': (w, o) => { if (o.orderFails) throw new Error('order failed'); if (!w.ord.created.has(OP)) { w.ord.orders++; w.ord.created.add(OP); } },\n  'inv compensate': w => { if (w.inv.applied.get(OP) === 'reserved') { w.inv.stock++; w.inv.applied.set(OP, 'compensated'); } },\n  'log start': w => w.log.push('start'), 'log stock done': w => w.log.push('stock done'), 'log done': w => w.log.push('done'),\n  'mem stock done': w => w.memory.push('stock done'),\n  // two-phase commit\n  'prep inv': w => { w.inv.prepared = OP; },\n  'prep ord': (w, o) => { if (o.orderFails) throw new Error('order failed'); w.ord.prepared = OP; },\n  'coord log commit': w => { w.decision = 'commit'; },\n  'send commit inv': w => { if (w.inv.prepared) { w.inv.stock--; w.inv.prepared = null; } w.inv.knows = 'commit'; },\n  'send commit ord': w => { if (w.ord.prepared) { w.ord.orders++; w.ord.prepared = null; } w.ord.knows = 'commit'; },\n  'send abort': w => { w.inv.prepared = w.ord.prepared = null; w.inv.knows = w.ord.knows = 'abort'; },\n};\nconst PROTOCOLS = {\n  'ek DB, ek transaction': ['begin', 'txn stock-1', 'txn order+', 'commit'],\n  'saga, progress sirf memory mein': ['inv reserve', 'mem stock done', 'ord create'],\n  'saga + durable saga log': ['log start', 'inv reserve', 'log stock done', 'ord create', 'log done'],\n  '2PC (do-phase commit)': ['prep inv', 'prep ord', 'coord log commit', 'send commit inv', 'send commit ord'],\n};"
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "db",
          "label": "Databases"
        },
        {
          "id": "note",
          "label": "Baat"
        }
      ],
      "steps": [
        {
          "title": "1. Ek DB",
          "say": "Line 36 (steps line 17–20): begin → stock − 1 → order + → commit. Dono ek transaction mein: ya dono, ya kuch nahi.",
          "line": "36",
          "vars": {
            "way": "ek transaction",
            "db": "1",
            "note": "ACID"
          }
        },
        {
          "title": "2. Saga, memory mein",
          "say": "Line 37: inventory DB mein stock − 1 commit (line 22), phir orders DB mein order commit (line 23). Progress sirf app ki memory mein.",
          "line": "37",
          "vars": {
            "way": "saga",
            "db": "2",
            "note": "do commits"
          },
          "ask": {
            "q": "Line 37 ke steps ke beech app crash ho jaaye toh?",
            "choices": [
              "Stock ghat chuka, order nahi bana — restart par app ko yaad nahi",
              "Inventory DB apne aap rollback kar dega, kyunki order nahi bana",
              "Kuch nahi — saga hamesha khud ko poora kar leta hai"
            ],
            "answer": 0,
            "hint": "Pehla step kahan commit hua, aur progress kahan likhi thi?",
            "explain": "Stock wala step inventory DB mein commit ho chuka. Orders DB ko kuch pata nahi, aur progress memory mein thi — restart par gayi. Lab: 3 jaanche gaye runs (ek bina crash) mein se 2 — dono injected crash — ant mein galat. Isliye saga ko durable log chahiye.",
            "choiceExplanations": [
              "Stock wala step inventory DB mein commit ho chuka. Orders DB ko kuch pata nahi, aur progress memory mein thi — restart par gayi. Lab: 3 jaanche gaye runs (ek bina crash) mein se 2 — dono injected crash — ant mein galat. Isliye saga ko durable log chahiye.",
              "Inventory DB ka commit pakka hai; doosre DB ki khabar inventory DB ko nahi.",
              "Saga tabhi poora hota hai jab progress kahin durable likhi ho."
            ]
          }
        },
        {
          "title": "3. Saga + durable log + receipt",
          "say": "Line 38: log mein start / stock done / done. Line 22–24: har participant operation id (op1) ki receipt rakhta hai — dobara aaya step dobara asar nahi karta, compensation sirf ek baar.",
          "line": "22-24",
          "vars": {
            "way": "saga + log + receipts",
            "db": "2 + log",
            "note": "idempotent steps"
          }
        },
        {
          "title": "4. 2PC",
          "say": "Line 39 (steps line 28–33): dono DB pehle \"prepare\" (lock pakdo, haan bolo), coordinator COMMIT ka faisla log karta hai, phir har participant ko commit bhejta hai. Video: \"do databases par transaction bilkul nahi\" — jabki 2PC/XA do databases ke beech transaction hi hai.",
          "line": "39",
          "vars": {
            "way": "2PC",
            "db": "2 + coordinator",
            "note": "consistent, par lock"
          }
        }
      ],
      "lesson": "Ek DB: ek transaction. Do DB: saga (alag commits + idempotent steps + compensation + durable log) ya 2PC (prepare + faisla + commit). Har ek ki apni keemat."
    },
    {
      "type": "dryrun",
      "title": "💥 twodb.js: crash, recovery, aur reader",
      "goal": "lib/twodb.js simulate(): har step ke baad crash, restart, recovery (recovery bhi ek baar crash ho sakti hai). Har step ke baad ek reader dono DB ki committed haalat padhta hai (line 62–65).",
      "code": {
        "title": "lib/twodb.js",
        "file": "docker-labs/63-microservices/lib/twodb.js",
        "from": 49,
        "text": "function recoverySteps(name, w, o) {\n  if (name === 'ek DB, ek transaction') return [];             // open transaction rolled back by the database\n  if (name === 'saga, progress sirf memory mein') return [];   // memory is gone: nobody knows op1 was in flight\n  if (name === 'saga + durable saga log') {\n    if (!w.log.includes('start') || w.log.includes('done')) return [];\n    return o.orderFails ? ['inv compensate', 'log done'] : ['inv reserve', 'ord create', 'log done'];   // idempotent steps\n  }\n  if (w.decision === 'commit') return ['send commit inv', 'send commit ord'];   // logged decision: finish it\n  return (w.inv.prepared || w.ord.prepared) ? ['send abort'] : [];             // no COMMIT in the log: presumed abort\n}\nfunction simulate(name, crashAfter, { orderFails = false, recoveryCrashAfter = null } = {}) {\n  const o = { orderFails }, w = fresh();\n  let seenMid = false;\n  const look = () => {                                          // a reader sees committed state only\n    const taken = 10 - w.inv.stock, made = w.ord.orders;\n    if (taken !== made) seenMid = true;\n  };\n  const run = (steps, crashAt) => {\n    for (let i = 0; i < steps.length; i++) {\n      try { S[steps[i]](w, o); } catch (e) {\n        for (const f of ON_FAIL[name]) { S[f](w, o); look(); }\n        if (name === 'ek DB, ek transaction') w.inv.txn = null;\n        return 'failed';\n      }\n      look();\n      if (crashAt !== null && i === crashAt) return 'crashed';\n    }\n    return 'ok';\n  };\n  const first = run(PROTOCOLS[name], crashAfter);\n  let blocked = false;\n  if (first === 'crashed') {\n    w.inv.txn = null; w.memory = [];                           // restart: open transaction rolled back, memory lost\n    blocked = Boolean((w.inv.prepared && !w.inv.knows) || (w.ord.prepared && !w.ord.knows));\n    const r1 = recoverySteps(name, w, o);\n    if (run(r1, recoveryCrashAfter) === 'crashed') { w.memory = []; run(recoverySteps(name, w, o), null); }   // recovery crashed: run it again\n  }\n  const taken = 10 - w.inv.stock, made = w.ord.orders, pending = Boolean(w.inv.prepared || w.ord.prepared);\n  const wrongEnd = taken !== made || pending;\n  return { wrongEnd, seenMid, blocked, stock: w.inv.stock, orders: made, outcome: first };"
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "case",
          "label": "Crash"
        },
        {
          "id": "out",
          "label": "Nateeja"
        }
      ],
      "steps": [
        {
          "title": "1. Reader",
          "say": "Line 62–65: har step ke baad reader dekhta hai — stock jitna ghata, utne order hain? Nahi toh beech ki haalat dikhi. Ek DB wale tareeke mein reader ek hi snapshot padhta hai: 0 baar.",
          "line": "62-65",
          "vars": {
            "way": "sab",
            "case": "har step",
            "out": "beech ki haalat?"
          }
        },
        {
          "title": "2. Saga recovery",
          "say": "Line 52–54: log mein start hai par done nahi → idempotent steps phir chalao (reserve, create, done) — ya order fail tha toh compensate. Receipt ki wajah se dobara chalna safe. Lab: recovery khud crash ho tab bhi 12 mein se 0 galat — par har run mein reader ne beech ki haalat dekhi.",
          "line": "52-54",
          "vars": {
            "way": "saga + log",
            "case": "beech mein",
            "out": "ant mein sahi"
          },
          "ask": {
            "q": "Saga ant mein sahi, phir bhi har run mein \"beech ki haalat dikhi\". Beech ki haalat ka asar?",
            "choices": [
              "Doosre users \"stock ghata, order nahi\" dekh sakte — saga mein isolation nahi",
              "Kuch nahi — ant mein sahi hai toh beech ka koi matlab nahi",
              "Database ki memory bhar jaati hai, isliye beech ki haalat dikhti hai"
            ],
            "answer": 0,
            "hint": "Stock ghata, order abhi nahi bana — us beech koi report chalaye toh?",
            "explain": "Saga mein har step apna commit hai, toh beech ki haalat sabko dikhti hai: report mein stock kam par order gayab. Compensation ke beech koi us stock ko kharid bhi sakta hai. Ilaaj: \"reserved/pending\" jaisa saaf beech ka state, aur padhne waale is state ko samjhein.",
            "choiceExplanations": [
              "Saga mein har step apna commit hai, toh beech ki haalat sabko dikhti hai: report mein stock kam par order gayab. Compensation ke beech koi us stock ko kharid bhi sakta hai. Ilaaj: \"reserved/pending\" jaisa saaf beech ka state, aur padhne waale is state ko samjhein.",
              "Beech ki haalat par faisle (report, khareed) galat ho sakte hain.",
              "Sawaal isolation ka hai, memory ka nahi."
            ]
          }
        },
        {
          "title": "3. 2PC: atke participants",
          "say": "Line 82: crash ke waqt koi participant prepared hai par participant ko faisla (commit/abort) pata nahi → locks pakad kar intezaar. COMMIT coordinator ke log mein ho tab bhi, jab tak participant tak na pahunche. Lab: 5 jaanche gaye runs (ek bina crash) mein se 4 — saare injected crash. Line 56–57: coordinator lautkar log padhta — COMMIT mila toh poora, nahi toh abort.",
          "line": "82",
          "vars": {
            "way": "2PC",
            "case": "prepare ke baad",
            "out": "blocked (locks)"
          },
          "ask": {
            "q": "2PC ant mein kabhi galat nahi hota, phir services aksar saga kyun chunte hain?",
            "choices": [
              "Coordinator gire toh prepared participants locks pakad kar atakte",
              "2PC sirf ek database ke andar chalta hai, do par nahi",
              "2PC mein data kabhi-kabhi galat ho jaata hai, isliye bharosa nahi"
            ],
            "answer": 0,
            "hint": "Line 82 kis haalat mein blocked = true karti hai?",
            "explain": "Prepare ke baad participant ne lock pakda aur \"haan\" bola. Jab tak faisla un tak na pahunche, participant nahi jaanta commit ya abort — locks pakde intezaar — us beech us item par likhne wale (ya locking read) kaam rukte hain; aam snapshot read purani committed value padh sakte hain. Aur commit dono DB par alag pal lagta hai, toh reader 2PC mein bhi beech ki haalat dekh sakta hai (lab: 5 jaanche runs mein se 3, safal run samet). Isliye kai services wale system saga + saaf beech ki haalat chunte hain.",
            "choiceExplanations": [
              "Prepare ke baad participant ne lock pakda aur \"haan\" bola. Jab tak faisla un tak na pahunche, participant nahi jaanta commit ya abort — locks pakde intezaar — us beech us item par likhne wale (ya locking read) kaam rukte hain; aam snapshot read purani committed value padh sakte hain. Aur commit dono DB par alag pal lagta hai, toh reader 2PC mein bhi beech ki haalat dekh sakta hai (lab: 5 jaanche runs mein se 3, safal run samet). Isliye kai services wale system saga + saaf beech ki haalat chunte hain.",
              "2PC/XA alag databases ke beech hi bana hai (jaise Postgres PREPARE TRANSACTION).",
              "Lab mein 2PC ant mein kabhi galat nahi hua (0)."
            ]
          }
        }
      ],
      "lesson": "Ek DB transaction sabse saaf. Saga: idempotent steps + durable log se ant mein sahi, par beech ki haalat dikhti hai. 2PC: ant mein sahi, par faisla pahunchne tak locks, aur readers beech ki haalat dekh sakte."
    },
    {
      "type": "docker",
      "title": "🧪 Har crash point gino",
      "project": "63-microservices",
      "exercise": "ex2-two-databases",
      "goal": "Chaar tareeke, har step ke baad crash; ek baar sab theek, ek baar order fail.",
      "why": "Node 24+ chahiye. Asli ginti (state machine), koi asli database nahi. Outbox aur idempotency: FP11 aur FP12 labs.",
      "steps": [
        {
          "text": "Do databases.",
          "cmd": "cd docker-labs/63-microservices && npm start -- ex2-two-databases",
          "expect": "ASLI ginti (lib/twodb.js): \"1 cheez khareedo\" (operation id op1) = stock − 1 AUR order banao. Har step ke baad crash,\nrestart aur recovery; recovery khud bhi ek baar crash hokar dobara chalti hai. Har step ke baad ek reader dono databases ki\ncommitted haalat padhta hai. Participants operation id ki receipt rakhte hain (dohraaya step dobara asar nahi karta).\n\ntareeka                            cases   ant mein galat   reader ne beech ki haalat dekhi   crash par locks atke   recovery crash ke saath galat\nek DB, ek transaction                 4            0                        0                    0             0 of 9\nsaga, progress sirf memory mein       3            2                        3                    0             6 of 6\nsaga + durable saga log               5            0                        5                    0             0 of 12\n2PC (do-phase commit)                 5            0                        3                    4             0 of 12\n\n(Order fail ho toh: 2PC coordinator zinda hai toh turant abort — locks sirf 1 crash case mein atke.)\n\n→ Ek database: ek ACID transaction — reader ko ya purani haalat dikhti hai ya poori nayi; crash par rollback.\n→ Saga, progress sirf memory mein: stock ghata, order se pehle crash = stock gaya, order nahi, aur kisi ko yaad nahi.\n→ Saga + durable log + receipts: recovery log padh kar idempotent steps dobara chalati hai — ant mein sahi, recovery khud crash\n  ho tab bhi. Par har run mein reader ne \"stock ghata, order nahi\" dekha: saga mein isolation nahi.\n→ 2PC: video kehta hai \"do databases par transaction bilkul nahi\". Hota hai (2PC/XA): ant mein kabhi galat nahi. Par (1) commit\n  dono databases par alag pal mein lagta hai, toh alag-alag padhne wala reader beech ki haalat dekh sakta hai; (2) coordinator\n  ne COMMIT log kar liya ho tab bhi, jab tak faisla participant tak na pahunche, participant locks pakad kar intezaar karta hai.\n  Recovery: coordinator lautkar log padhta hai — COMMIT mila toh poora karo, nahi mila toh abort (presumed abort)."
        },
        {
          "text": "Lab ke 4 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-63-microservices@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ call cost: same answer over HTTP; a function call is far cheaper; a new connection costs more than keep-alive (230.460402ms)\n✔ fan-out: sequential adds latency, parallel waits for the slowest; exposure 1 − 0.99^n only when hiccups are independent (64.772978ms)\n✔ two databases: final states; saga recovery is idempotent even if recovery crashes; 2PC readers can see the middle; prepared participants block (0.945045ms)\n✔ arithmetic: copies multiply max DB connections; Brooks paths; within-team totals; rename deploys (0.225453ms)\nℹ tests 4\nℹ suites 0\nℹ pass 4\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 334.491484"
        }
      ],
      "observe": {
        "q": "\"Order fail\" wale case mein saga (durable log) ab bhi 0 galat. Compensation do baar chal jaata toh kya hota?",
        "choices": [
          "Stock ek zyada wapas: nakli item; compensation idempotent ho",
          "Kuch nahi — stock wapas jodna hamesha safe hai, jitni baar bhi",
          "Order do baar ban jaata, kyunki compensation order banata hai"
        ],
        "answer": 0,
        "hint": "Compensation kya karta hai: stock + 1. Do baar?",
        "explain": "Compensation = stock + 1. Do baar chale toh stock asli se ek zyada — bechne laayak item jo hai hi nahi. Isliye compensation idempotent ho: lab ka inventory participant op1 ki receipt rakhta hai (line 24: sirf \"reserved\" ho tabhi wapas), toh recovery kitni baar bhi chale, ek hi baar lagta hai.",
        "choiceExplanations": [
          "Compensation = stock + 1. Do baar chale toh stock asli se ek zyada — bechne laayak item jo hai hi nahi. Isliye compensation idempotent ho: lab ka inventory participant op1 ki receipt rakhta hai (line 24: sirf \"reserved\" ho tabhi wapas), toh recovery kitni baar bhi chale, ek hi baar lagta hai.",
          "+1 do baar = +2; aisa operation idempotent nahi.",
          "Compensation stock wapas karta hai, order nahi banata."
        ]
      },
      "lesson": "Do databases = do commits. Saga aur 2PC dono ki keemat hai; ek database ka transaction muft milta hai — isliye data todne se pehle socho."
    }
  ],
  "interview": {
    "title": "Interview Round — do databases",
    "instructions": "Pehle socho: crash kahan ho sakta hai, aur beech mein doosre kya dekhenge? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order aur inventory alag services, alag DB. Kabhi-kabhi stock ghat jaata hai par order nahi banta. Code: stock API call, phir order insert. Sabse seedha ilaaj?",
        "choices": [
          "Durable saga log + compensation, ya ek DB/module mein wapas",
          "Stock API call ka timeout badhao, taaki crash kam ho",
          "Order pehle banao, stock baad mein — kram badalne se dono theek",
          "Har raat ek script se stock aur orders milaao, aur kuch mat badlo"
        ],
        "answer": 0,
        "explain": "Do commits ke beech crash = aadha kaam (lab 63 ex2: memory wala saga — dono injected crash galat). Progress durable likho (saga log / outbox) aur restart par poora karo ya compensate. Ya agar alag DB ka faayda nahi, ek module/DB mein wapas (video ka modular monolith).",
        "choiceExplanations": [
          "Do commits ke beech crash = aadha kaam (lab 63 ex2: memory wala saga — dono injected crash galat). Progress durable likho (saga log / outbox) aur restart par poora karo ya compensate. Ya agar alag DB ka faayda nahi, ek module/DB mein wapas (video ka modular monolith).",
          "Timeout se crash nahi rukte; do commits ki dikkat same.",
          "Kram ulta = order bina stock ke (dusri galti).",
          "Raat ki script galti ko ghanton tak rehne deti hai; jad nahi hatati."
        ]
      },
      {
        "q": "Payments team kehti hai \"saga mein beech ki haalat dikhti hai, toh 2PC lagao\". 2PC ka sabse bada khatra kya batayoge?",
        "choices": [
          "Coordinator prepare ke baad gire toh participants locks pakad kar atakte",
          "2PC mein do databases ke beech data kabhi-kabhi galat ho jaata hai",
          "2PC sirf ek hi database par chalta hai, isliye do DB par kaam nahi karega",
          "2PC mein compensation likhna padta hai, saga se zyada code"
        ],
        "answer": 0,
        "explain": "2PC ant mein consistent hai (lab: 0 galat) par blocking hai: faisla participant tak pahunchne se pehle coordinator gira toh participants lock pakad kar intezaar (lab: 4 injected crash mein se 4 cases). Us beech us data par likhne wale kaam rukte hain (aam snapshot read purani value padh sakte hain). Microservices mein isliye aksar saga + saaf beech ki haalat.",
        "choiceExplanations": [
          "2PC ant mein consistent hai (lab: 0 galat) par blocking hai: faisla participant tak pahunchne se pehle coordinator gira toh participants lock pakad kar intezaar (lab: 4 injected crash mein se 4 cases). Us beech us data par likhne wale kaam rukte hain (aam snapshot read purani value padh sakte hain). Microservices mein isliye aksar saga + saaf beech ki haalat.",
          "Lab mein 2PC ant mein kabhi galat nahi hua.",
          "2PC/XA alag databases ke beech hi hai.",
          "Compensation saga mein hota hai; 2PC abort karta hai."
        ]
      }
    ]
  },
  "success": [
    "Ek transaction, saga aur 2PC ka farq code se bata sakte ho",
    "Saga ki isolation ki kami samjha sakte ho",
    "2PC ki blocking bata sakte ho"
  ],
  "cards": [
    {
      "front": "Saga vs 2PC (lab 63 ex2)?",
      "back": "Saga (durable log + receipts): ant mein 0 galat, recovery crash par bhi; reader ne har run mein beech ki haalat dekhi. 2PC: 0 galat; 4 injected crash mein se 4 crash cases mein locks atke, 3 mein reader ne beech dekha."
    },
    {
      "front": "Memory wala saga?",
      "back": "Do commits ke beech crash = stock gaya, order nahi, aur yaad bhi nahi. Progress durable likho (saga log / outbox)."
    },
    {
      "front": "\"Do DB par transaction nahi\" (video)?",
      "back": "2PC/XA hota hai — consistent, par coordinator gire toh blocking. Isliye microservices aksar saga chunte hain."
    }
  ]
}
]);
})();
