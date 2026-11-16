/* First Principles — FAANG Senior Engineer.
   Source credit: Kafka vs RabbitMQ vs SQS — Async System (mQf7RtBuiaY), numbered video 11/15.
   Evidence: docker-labs/61-queues/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "w", "icon": "⚙️", "label": "worker", "x": 160, "y": 120}, {"id": "db", "icon": "🗄️", "label": "DB (UNIQUE id)", "x": 450, "y": 120}, {"id": "pay", "icon": "💳", "label": "payment", "x": 740, "y": 120}];
const EDGES = [{"from": "w", "to": "db"}, {"from": "db", "to": "pay"}];
VISUALS["fp-async-code"] = { t: "At-least-once: message dobara aayega. Id aur kaam ek transaction mein, ya provider ko idempotency key.", html: SD.viz.svg(HERO, EDGES, { nodes: { w: {tone:'busy',badge:'dobara mila'}, db: {tone:'ok',badge:'id pehle se'}, pay: {tone:'ok',badge:'₹100 ek baar'} } }, {w:900,h:240}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-async-code",
  "icon": "💳",
  "group": "📮 Async: Queue vs Stream",
  "title": "Async 3 · Code — idempotency aur outbox, har crash point par",
  "badge": "Dohraav Ka Daroga",
  "objectives": [
    "At-least-once mein duplicate charge kahan se aata hai (code mein)",
    "Check → charge → record ki race; transaction aur provider key",
    "Dual write vs outbox, har crash point par"
  ],
  "lesson": [
    "<h3>🧾 Dukaan ka parcha</h3><p>Dukaandaar parcha dekh kar ₹100 kaat'ta hai, phir register mein likhta hai \"parcha 17 ho gaya\". Kaatne ke baad aur likhne se pehle bijli gayi. Subah same parcha phir aaya, register mein kuch nahi likha — ₹100 phir kate.</p><p>Do dukaandaar ek hi parcha ek saath dekhein, dono register mein \"nahi\" padhein — dono kaatein. Aaj code mein har jagah gin kar dekhenge jahan aisa ho sakta hai, aur ilaaj bhi.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "💳 crash.js: ek message, ₹100 — kitni baar kata?",
      "goal": "lib/crash.js (asli ginti). Queue at-least-once hai: worker ack se pehle mara toh message wapas aata hai aur poora flow dobara chalta hai. crashPoints() har step ke baad crash karke ginta hai.",
      "code": {
        "title": "lib/crash.js",
        "file": "docker-labs/61-queues/lib/crash.js",
        "from": 5,
        "text": "const consumers = {\n  'koi idempotency nahi': [\n    s => { s.charges++; },                                              // charge ₹100, then ack\n  ],\n  'check → charge → record (video)': [\n    s => { s.seen = s.ids.has('m1'); },                                 // 1. check: \"pehle kiya?\"\n    s => { if (!s.seen) s.charges++; },                                 // 2. charge ₹100\n    s => { if (!s.seen) s.ids.add('m1'); },                             // 3. record the message id\n  ],\n  'ek DB transaction: id insert (UNIQUE) + charge': [\n    s => { if (!s.ids.has('m1')) { s.ids.add('m1'); s.charges++; } },  // BEGIN; INSERT id; charge; COMMIT — all or nothing\n  ],\n  'provider ko Idempotency-Key = message id': [\n    s => { if (!s.keys.has('m1')) { s.keys.add('m1'); s.charges++; } },  // the provider remembers the key, charges once\n  ],\n};\nconst fresh = () => ({ charges: 0, ids: new Set(), keys: new Set() });\nfunction crashPoints(steps) {                       // crash after step k (k = 0 … steps.length - 1), then a full redelivery\n  const out = [];\n  for (let k = 0; k < steps.length; k++) {\n    const s = fresh();\n    for (let i = 0; i <= k; i++) steps[i](s);       // ran up to step k, then crashed before ack → message comes back\n    s.seen = undefined;\n    for (const f of steps) f(s);\n    out.push(s.charges);\n  }\n  return out;\n}\nfunction interleavings(steps) {                     // two workers, same message, every order of their steps\n  const n = steps.length, res = [];\n  const go = (a, b, order) => {\n    if (a === n && b === n) {\n      const s = fresh(), local = [{}, {}];\n      for (const w of order) { const st = local[w]; const saved = s.seen; s.seen = st.seen; steps[st.i = (st.i ?? -1) + 1](s); st.seen = s.seen; s.seen = saved; }\n      res.push(s.charges); return;\n    }"
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "crash",
          "label": "Crash kahan"
        },
        {
          "id": "paid",
          "label": "Kata"
        }
      ],
      "steps": [
        {
          "title": "1. Bina idempotency",
          "say": "Line 7: charge, phir ack. Charge ke baad, ack se pehle crash → message wapas → phir charge. ₹200.",
          "line": "6-8",
          "vars": {
            "way": "kuch nahi",
            "crash": "charge ke baad",
            "paid": "₹200"
          }
        },
        {
          "title": "2. Video ka tareeka",
          "say": "Line 10–12: check → charge → record. Line 26: step k tak chalao, crash; line 28: poora flow dobara.",
          "line": "9-13",
          "vars": {
            "way": "check → charge → record",
            "crash": "?",
            "paid": "?"
          }
        },
        {
          "title": "3. Crash charge ke baad",
          "say": "k = 1: check (\"nahi kiya\"), charge ₹100, crash — id record nahi hua. Redelivery: check phir \"nahi kiya\" → charge. ₹200.",
          "line": "10-12",
          "vars": {
            "way": "check → charge → record",
            "crash": "step 2 ke baad",
            "paid": "₹200"
          },
          "ask": {
            "q": "Lab mein teen crash points par charges ₹100, ₹200, ₹100. ₹200 kis crash par?",
            "choices": [
              "Charge ke baad, record se pehle — check ko record nahi milta",
              "Check ke baad — check ne galat jawab diya, isliye do baar charge",
              "Record ke baad — record ke baad ka crash charge ko dohraata hai"
            ],
            "answer": 0,
            "hint": "Redelivery par line 10 ka check kya dekhega?",
            "explain": "Check sirf record (line 12) dekhta hai. Charge ho gaya par record nahi → check \"nahi kiya\" → dobara charge. Check ke baad crash: kuch hua hi nahi (₹100). Record ke baad crash: check \"kiya\" (₹100).",
            "choiceExplanations": [
              "Check sirf record (line 12) dekhta hai. Charge ho gaya par record nahi → check \"nahi kiya\" → dobara charge. Check ke baad crash: kuch hua hi nahi (₹100). Record ke baad crash: check \"kiya\" (₹100).",
              "Check ke baad crash par kuch kata hi nahi tha; redelivery ek baar kaatti hai.",
              "Record ho chuka tha; redelivery ka check \"kiya\" dekhta hai aur rukta hai."
            ]
          }
        },
        {
          "title": "4. Do workers ek saath",
          "say": "Visibility timeout ke baad do workers ko same message. interleavings() dono ke steps ke har kram (20) ko chalata hai. Dono pehle check karein toh dono ko \"nahi kiya\". Lab: 20 mein se 18 kram mein ₹200.",
          "line": "33-40",
          "vars": {
            "way": "check → charge → record",
            "crash": "koi nahi, race",
            "paid": "18 of 20: ₹200"
          }
        },
        {
          "title": "5. Ek transaction",
          "say": "Line 15: BEGIN; INSERT id (UNIQUE); charge; COMMIT — sab ya kuch nahi. Crash commit se pehle = kuch nahi hua. Doosra worker: INSERT UNIQUE par fail → ruk jaata hai. Lab: har crash par ₹100, race mein 0 double.",
          "line": "14-16",
          "vars": {
            "way": "ek transaction",
            "crash": "kahin bhi",
            "paid": "₹100"
          },
          "ask": {
            "q": "Charge bahar ki payment API par hai (DB ke andar nahi). Transaction kaafi hai?",
            "choices": [
              "Nahi — API DB transaction mein nahi aati; API ko idempotency key do",
              "Haan — DB transaction bahar ki API call ko bhi rollback kar deta hai",
              "Haan — bas API call transaction ke andar likh do, rollback ho jaayega"
            ],
            "answer": 0,
            "hint": "Rollback kiska hota hai: DB rows ka ya bahar bheje gaye paise ka?",
            "explain": "Rollback sirf DB ki rows ka hota hai. Bahar ki API ne paise kaat liye toh DB rollback paise wapas nahi laata. Ilaaj line 18: provider ko Idempotency-Key = message id (jaise Stripe ka Idempotency-Key header); provider key yaad rakhta hai aur dobara nahi kaatta — par seemit samay tak (Stripe: kam se kam 24 ghante ke baad key hat sakti hai). Din baad redrive ke liye apna durable record aur reconciliation bhi chahiye.",
            "choiceExplanations": [
              "Rollback sirf DB ki rows ka hota hai. Bahar ki API ne paise kaat liye toh DB rollback paise wapas nahi laata. Ilaaj line 18: provider ko Idempotency-Key = message id (jaise Stripe ka Idempotency-Key header); provider key yaad rakhta hai aur dobara nahi kaatta — par seemit samay tak (Stripe: kam se kam 24 ghante ke baad key hat sakti hai). Din baad redrive ke liye apna durable record aur reconciliation bhi chahiye.",
              "Network par gayi call wapas nahi aati; rollback DB tak hai.",
              "Call ko transaction ke andar likhne se bhi call bahar ja chuki hoti hai."
            ]
          }
        }
      ],
      "lesson": "At-least-once + side effect = duplicate ka khatra. Check aur record alag steps mein race chhodte hain. Id aur kaam ek transaction mein (UNIQUE), ya bahar ki API ko idempotency key."
    },
    {
      "type": "dryrun",
      "title": "📤 crash.js: user save + event — dual write vs outbox",
      "goal": "lib/crash.js producerOutcomes(): signup mein user DB mein save karna hai aur \"user signed up\" event queue mein. Har step ke baad crash, aur ek case jahan DB write fail ho.",
      "code": {
        "title": "lib/crash.js",
        "file": "docker-labs/61-queues/lib/crash.js",
        "from": 48,
        "text": "const producers = {\n  'DB save → queue publish': ['db', 'pub'],\n  'queue publish → DB save': ['pub', 'db'],\n  'outbox: ek transaction (user + outbox row) → relay publish → relay \"sent\"': ['db+outbox', 'relay-pub', 'relay-mark'],\n};\nfunction producerOutcomes(steps) {\n  const res = { ok: 0, lost: 0, phantom: 0, duplicate: 0 }, cases = [];\n  for (let k = -1; k < steps.length; k++) cases.push({ crashAfter: k, dbFails: false });\n  cases.push({ crashAfter: -1, dbFails: true });\n  for (const c of cases) {\n    let user = false, events = 0, outbox = false, sent = false, crashed = false;\n    const doStep = st => {\n      if (st === 'db') { if (c.dbFails) throw new Error('db'); user = true; }\n      if (st === 'pub') events++;\n      if (st === 'db+outbox') { if (c.dbFails) throw new Error('db'); user = true; outbox = true; }\n      if (st === 'relay-pub') events++;\n      if (st === 'relay-mark') sent = true;\n    };\n    try { steps.forEach((st, i) => { if (crashed) return; doStep(st); if (i === c.crashAfter) crashed = true; }); } catch { /* request failed */ }\n    if (outbox && !sent) { events++; sent = true; }   // the relay restarts and publishes every unsent outbox row (at-least-once)\n    if (user && events === 0) res.lost++;\n    else if (!user && events > 0) res.phantom++;\n    else if (events > 1) res.duplicate++;\n    else res.ok++;"
      },
      "vars": [
        {
          "id": "way",
          "label": "Kram"
        },
        {
          "id": "case",
          "label": "Case"
        },
        {
          "id": "out",
          "label": "Nateeja"
        }
      ],
      "steps": [
        {
          "title": "1. DB → queue",
          "say": "Line 49: pehle DB, phir publish. DB ke baad crash → user hai, event nahi: welcome email, analytics, sab chhoot gaye. Lab: 4 mein se 1 case mein event khoya.",
          "line": "49",
          "vars": {
            "way": "DB → queue",
            "case": "DB ke baad crash",
            "out": "event khoya"
          }
        },
        {
          "title": "2. Queue → DB",
          "say": "Line 50: pehle publish, phir DB. Publish ke baad crash, ya DB write fail → event gaya, user nahi. Lab: 4 mein se 2 case mein bina user ka event.",
          "line": "50",
          "vars": {
            "way": "queue → DB",
            "case": "DB fail",
            "out": "bina user event"
          }
        },
        {
          "title": "3. Outbox",
          "say": "Line 51: user aur outbox row EK transaction mein. Relay baad mein outbox padh kar publish karta hai, phir \"sent\" likhta hai. Line 67: relay restart par har unsent row phir bhejta hai.",
          "line": [
            51,
            67
          ],
          "vars": {
            "way": "outbox",
            "case": "kahin bhi crash",
            "out": "kuch nahi khoya"
          },
          "ask": {
            "q": "Lab: outbox mein 5 mein se 1 case mein event 2 baar. Kaunsa case?",
            "choices": [
              "Relay ne publish kiya, \"sent\" likhne se pehle crash — restart par phir publish",
              "DB transaction ke baad crash — transaction ne event do baar likh diya",
              "DB write fail — fail hone par outbox do events bana deta hai"
            ],
            "answer": 0,
            "hint": "Relay \"sent\" kab likhta hai — publish se pehle ya baad?",
            "explain": "Relay publish karta hai, phir \"sent\". Beech mein crash = row abhi bhi unsent → restart par dobara publish. Outbox \"khona\" aur \"bina user\" khatam karta hai, duplicate nahi. Consumer phir bhi idempotent chahiye.",
            "choiceExplanations": [
              "Relay publish karta hai, phir \"sent\". Beech mein crash = row abhi bhi unsent → restart par dobara publish. Outbox \"khona\" aur \"bina user\" khatam karta hai, duplicate nahi. Consumer phir bhi idempotent chahiye.",
              "Transaction ek outbox row likhta hai; relay outbox row ek baar bhejta hai jab tak crash na ho.",
              "DB fail hua toh user aur outbox row dono nahi bane — koi event nahi."
            ]
          }
        },
        {
          "title": "4. Saar",
          "say": "Do systems (DB aur queue) ek saath atomic nahi. Outbox ek system (DB) mein dono likhta hai, phir relay at-least-once bhejta hai. Asli processes par save/publish gap: lab 44.",
          "line": "58-71",
          "vars": {
            "way": "outbox + idempotent consumer",
            "case": "sab",
            "out": "na khoya, na phantom"
          }
        }
      ],
      "lesson": "Dual write kisi bhi kram mein toot'ta hai. Outbox: ek transaction mein data + event row, relay baad mein bhejta hai (at-least-once). Consumer idempotent rakho."
    },
    {
      "type": "docker",
      "title": "🧪 Har crash point gino",
      "project": "61-queues",
      "exercise": "ex5-crash-points",
      "goal": "Charges har crash point par aur do workers ke har kram mein; signup ke teen kram har crash par.",
      "why": "Node 24+ chahiye. Asli ginti, har run same. Asli processes + SQLite par duplicate charge: lab 49; save/publish gap: lab 44.",
      "steps": [
        {
          "text": "Crash points.",
          "cmd": "cd docker-labs/61-queues && npm start -- ex5-crash-points",
          "expect": "A. ASLI ginti (lib/crash.js): ek message = ₹100 charge. Har step ke baad crash (ack se pehle) → message wapas\n   aata hai (at-least-once) aur poora flow dobara chalta hai. Saath mein: do workers ko ek hi message ek saath mila —\n   dono workers ke steps ke har mumkin kram mein kitni baar ₹200 kata?\n\ntareeka                                          har crash point par charges   do workers: double charge\nkoi idempotency nahi                             ₹200                          2 of 2 kram\ncheck → charge → record (video)                  ₹100, ₹200, ₹100              18 of 20 kram\nek DB transaction: id insert (UNIQUE) + charge   ₹100                          0 of 2 kram\nprovider ko Idempotency-Key = message id         ₹100                          0 of 2 kram\n\n→ Video ka \"check karo, kaam karo, phir id likho\": charge ke baad aur id likhne se pehle crash = ₹200.\n  Do workers ek saath check karein toh dono ko \"nahi kiya\" milta hai: 20 mein se 18 kram mein ₹200.\n→ Ilaaj: id ka record aur kaam EK transaction mein (UNIQUE constraint), ya bahar ki API ko idempotency key do\n  (Stripe: Idempotency-Key header). Asli processes + SQLite par same race: lab 49.\n\nB. ASLI ginti: signup = user save + \"user signed up\" event. Har step ke baad crash, aur ek case jahan DB write fail.\n\ntareeka                                                                  cases   theek   event khoya   bina user event   event 2 baar\nDB save → queue publish                                                      4       3             1                 0              0\nqueue publish → DB save                                                      4       2             0                 2              0\noutbox: ek transaction (user + outbox row) → relay publish → relay \"sent\"     5       4             0                 0              1\n\n→ Dono dual-write kram kisi crash par galat. Outbox mein user aur event ek transaction mein; relay baad mein bhejta hai.\n→ Video: \"outbox dual write ko poori tarah khatam karta hai\". Haan, par relay at-least-once hai: publish ke baad aur\n  \"sent\" likhne se pehle crash = event 2 baar. Consumer ko phir bhi idempotent hona padega. Asli processes par: lab 44."
        },
        {
          "text": "Lab ke 6 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-61-queues@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ buffer: a worker no faster than normal traffic never drains the spike; spare capacity does (11.39741ms)\n✔ queue vs log: an undeleted message comes back; each log group reads everything; replay stops at retention (0.586732ms)\n✔ append: real writes work; 1 MB writes beat 4 KB writes with O_DIRECT (365.784193ms)\n✔ partitions: Kafka murmur2 vectors; a key keeps order, round-robin does not; 6 → 8 moves most keys (17.531261ms)\n✔ backpressure: drop loses acked writes, reject does not; scaling past the DB wastes work and fills the DLQ (2.862382ms)\n✔ crash points: check-then-act double charges; one transaction or a provider key never does; outbox loses nothing (0.929733ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 444.063373"
        }
      ],
      "observe": {
        "q": "\"ek DB transaction\" aur \"provider key\" wali rows mein do workers ke sirf 2 kram gine gaye, video ke tareeke mein 20. Kyun?",
        "choices": [
          "Ek atomic step ko beech mein toda nahi ja sakta; 2 workers ke 1-1 step = 2 kram",
          "Transaction mein workers ko ek saath chalne hi nahi diya jaata, isliye kam",
          "Lab ne jaldi ke liye transaction wale kram chhod diye hain"
        ],
        "answer": 0,
        "hint": "Ek worker ke kitne steps hain har tareeke mein?",
        "explain": "Video ke tareeke mein 3 steps: do workers ke 3+3 steps ke kram = 20. Transaction ek step hai (sab ya kuch nahi), toh do workers ke sirf 2 kram (A pehle ya B pehle). Atomic step ke beech koi ghus nahi sakta — atomic step hi race ka ilaaj hai.",
        "choiceExplanations": [
          "Video ke tareeke mein 3 steps: do workers ke 3+3 steps ke kram = 20. Transaction ek step hai (sab ya kuch nahi), toh do workers ke sirf 2 kram (A pehle ya B pehle). Atomic step ke beech koi ghus nahi sakta — atomic step hi race ka ilaaj hai.",
          "Workers ek saath chalte hain; bas ek step ke beech koi nahi ghus sakta.",
          "Lab ne har mumkin kram gina (interleavings)."
        ]
      },
      "lesson": "Har crash point gin kar dekho. Jahan do steps ke beech crash ya doosra worker ghus sakta hai, us jagah duplicate ya khoya hua event chhupa hai."
    }
  ],
  "interview": {
    "title": "Interview Round — duplicate aur khoya event",
    "instructions": "Pehle socho: crash kahan ho sakta hai, aur do workers ek saath kya dekhenge? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Payment worker: \"SELECT processed WHERE id = ?; nahi mila toh charge; phir INSERT id\". Kabhi-kabhi customers do baar kat'te hain. Kaaran aur ilaaj?",
        "choices": [
          "Check aur INSERT alag; race/crash. Id ka UNIQUE insert + charge ek transaction mein",
          "SELECT dheema hai; id par index lagao, toh race khatam ho jaayegi",
          "Queue galat hai; SQS ki jagah Kafka lagao, Kafka mein duplicates nahi aate",
          "Retries band karo; jab worker crash ho toh message ko DLQ mein daal do"
        ],
        "answer": 0,
        "explain": "Do workers dono SELECT mein \"nahi\" dekh sakte hain (lab 61 ex5: 20 mein se 18 kram), ya charge ke baad crash. Ilaaj: id ko UNIQUE ke saath insert karo usi transaction mein jismein charge row; doosra insert fail hoga. Bahar ki API ho toh idempotency key.",
        "choiceExplanations": [
          "Do workers dono SELECT mein \"nahi\" dekh sakte hain (lab 61 ex5: 20 mein se 18 kram), ya charge ke baad crash. Ilaaj: id ko UNIQUE ke saath insert karo usi transaction mein jismein charge row; doosra insert fail hoga. Bahar ki API ho toh idempotency key.",
          "Index tez karta hai, race nahi hatata; dono SELECT phir bhi \"nahi\" dekh sakte.",
          "Kafka consumer bhi at-least-once (offset commit se pehle crash = dobara).",
          "Retry band karne se crash wale payments kabhi poore nahi honge."
        ]
      },
      {
        "q": "Signup code: user DB mein save, phir Kafka par \"UserSignedUp\". Kabhi-kabhi naye users ko welcome email nahi milta. Ilaaj?",
        "choices": [
          "Outbox: user + outbox row ek transaction mein; relay Kafka par bheje",
          "Kram ulta karo: pehle Kafka publish, phir DB save, taaki event pakka jaaye",
          "Publish ko try/catch mein daal kar fail hone par 3 baar retry karo",
          "Kafka par acks=all set karo, taaki publish kabhi fail na ho"
        ],
        "answer": 0,
        "explain": "DB save ke baad aur publish se pehle crash = user hai, event nahi (lab 61 ex5). Outbox mein dono ek transaction mein; relay baad mein bhejta hai. Relay at-least-once hai, toh email service idempotent rakho.",
        "choiceExplanations": [
          "DB save ke baad aur publish se pehle crash = user hai, event nahi (lab 61 ex5). Outbox mein dono ek transaction mein; relay baad mein bhejta hai. Relay at-least-once hai, toh email service idempotent rakho.",
          "Ulta kram: DB fail hone par bina user ka event (ex5: 4 mein se 2).",
          "Process crash ho gaya toh retry code chalega hi nahi.",
          "acks=all broker par durability deta hai; crash publish se pehle hua toh kuch nahi bheja."
        ]
      }
    ]
  },
  "success": [
    "At-least-once mein duplicate ka raasta code mein dikha sakte ho",
    "Check-then-act ki race aur transaction ka ilaaj bata sakte ho",
    "Dual write vs outbox har crash par samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Check → charge → record?",
      "back": "Charge ke baad crash = ₹200; do workers = 20 mein se 18 kram ₹200 (lab 61 ex5). Ilaaj: UNIQUE id + charge ek transaction."
    },
    {
      "front": "Bahar ki API ka duplicate?",
      "back": "DB rollback paise wapas nahi laata. Provider ko idempotency key (message id) do — jaise Stripe Idempotency-Key header."
    },
    {
      "front": "Outbox?",
      "back": "User + outbox row ek transaction; relay publish → \"sent\". Na khoya, na phantom; relay crash par duplicate → consumer idempotent."
    }
  ]
}
]);
})();
