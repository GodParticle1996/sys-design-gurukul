/* Playlist · EDA Core topic 5: Event sourcing. Source credit: Software Developer Diaries,
   "Event Sourcing: Genius or Just Over-Engineering?" (wXg_aON4oj8).
   Numbers: docker-labs/50-event-sourcing/captures. */
(function () {
const HERO = [{"id": "ravi", "icon": "🧑", "label": "Ravi / app", "x": 130, "y": 165}, {"id": "store", "icon": "📒", "label": "passbook (events)", "x": 620, "y": 75}, {"id": "slate", "icon": "🪧", "label": "slate (balance)", "x": 620, "y": 255}];
const EDGES = [{"from": "ravi", "to": "store"}, {"from": "ravi", "to": "slate"}];
VISUALS["es-kyun"] = { t: "Slate par sirf aakhri balance; passbook mein har badlaav. \"Salary se pehle kitna tha?\" — jawab passbook mein hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { ravi: {tone:'busy',badge:'?'}, store: {tone:'ok',badge:'4 lines'}, slate: {tone:'bad',badge:'sirf 90'} } }, {w:890,h:330}) };
SD.registerLevels('sdd-eda', [
{
  "id": "es-kyun",
  "icon": "📒",
  "group": "📒 Event Sourcing",
  "title": "Sourcing 1 · Kyun — balance ₹90 hai, par bana kaise?",
  "badge": "Passbook Shishya",
  "objectives": [
    "Sirf aakhri balance rakhne se kya kho jaata hai?",
    "Galti ko line badal ke nahi, nayi line jod ke kyun theek karein?",
    "Events se kisi bhi pal ki haalat kaise nikalti hai?"
  ],
  "lesson": [
    "<h3>📒 Slate ya passbook?</h3><p>Ravi ka bank khaata. Ek tareeka slate jaisa: har baar purana balance mita ke naya likh do. Doosra passbook jaisa: har jama aur nikaasi ek nayi line.</p><p>Ravi poochhta hai: \"Maine ₹50 bheje the ya ₹60?\" Kaunsa tareeka jawab de payega? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📒 Ravi ka khaata: slate aur passbook saath-saath",
      "goal": "Ek hi khaata do tareeke se: slate par har baar purana balance mita ke naya likha jaata hai; passbook mein har jama-nikaasi ek nayi line. Numbers lab 50 ke ex3-replay (history) se, asli SQLite event store par.",
      "nodes": [
        {
          "id": "ravi",
          "icon": "🧑",
          "label": "Ravi / app",
          "x": 130,
          "y": 165
        },
        {
          "id": "store",
          "icon": "📒",
          "label": "passbook (events)",
          "x": 620,
          "y": 75
        },
        {
          "id": "slate",
          "icon": "🪧",
          "label": "slate (balance)",
          "x": 620,
          "y": 255
        }
      ],
      "edges": [
        {
          "from": "ravi",
          "to": "store"
        },
        {
          "from": "ravi",
          "to": "slate"
        }
      ],
      "viz": {
        "w": 890,
        "h": 330
      },
      "vars": [
        {
          "id": "store",
          "label": "Passbook mein"
        },
        {
          "id": "slate",
          "label": "Slate par"
        },
        {
          "id": "bal",
          "label": "Passbook jod ke"
        }
      ],
      "steps": [
        {
          "title": "Khaata khula",
          "clock": "v1",
          "say": "Ravi ka khaata khula. Passbook mein pehli line: <b>Opened</b>. Slate par: 0.",
          "nodes": {
            "ravi": {
              "tone": "busy",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "v1"
            },
            "slate": {
              "tone": "idle",
              "badge": "0"
            }
          },
          "vars": {
            "store": "Opened",
            "slate": "0",
            "bal": "0"
          },
          "flows": [
            {
              "from": "ravi",
              "to": "store",
              "label": "Opened",
              "tone": "acc"
            },
            {
              "from": "ravi",
              "to": "slate",
              "label": "0",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Ravi ne ₹50 bheje",
          "clock": "v2",
          "say": "Ravi ne apne doosre bank se ₹50 bheje. Passbook mein nayi line: <b>Deposited 50 (ravi)</b>. Slate par 0 mita ke 50.",
          "nodes": {
            "ravi": {
              "tone": "busy",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "v2"
            },
            "slate": {
              "tone": "ok",
              "badge": "50"
            }
          },
          "vars": {
            "store": "Opened · +50 (ravi)",
            "slate": "50",
            "bal": "50"
          },
          "flows": [
            {
              "from": "ravi",
              "to": "store",
              "label": "+50",
              "tone": "ok"
            },
            {
              "from": "ravi",
              "to": "slate",
              "label": "50",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Salary ₹60",
          "clock": "v3",
          "say": "Salary ke ₹60 aaye. Passbook: <b>Deposited 60 (salary)</b>. Slate par 50 mita ke 110.",
          "nodes": {
            "ravi": {
              "tone": "busy",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "v3"
            },
            "slate": {
              "tone": "ok",
              "badge": "110"
            }
          },
          "vars": {
            "store": "… · +60 (salary)",
            "slate": "110",
            "bal": "110"
          },
          "flows": [
            {
              "from": "ravi",
              "to": "store",
              "label": "+60",
              "tone": "ok"
            },
            {
              "from": "ravi",
              "to": "slate",
              "label": "110",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "₹20 nikaale",
          "clock": "v4",
          "say": "Ravi ne ₹20 nikaale. Passbook: <b>Withdrawn 20</b>. Slate par 110 mita ke 90.",
          "nodes": {
            "ravi": {
              "tone": "slow",
              "badge": "?"
            },
            "store": {
              "tone": "ok",
              "badge": "v4"
            },
            "slate": {
              "tone": "ok",
              "badge": "90"
            }
          },
          "vars": {
            "store": "… · −20",
            "slate": "90",
            "bal": "90"
          },
          "flows": [
            {
              "from": "ravi",
              "to": "store",
              "label": "−20",
              "tone": "ok"
            },
            {
              "from": "ravi",
              "to": "slate",
              "label": "90",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Ravi poochhta hai: \"Salary aane se theek pehle balance kitna tha, aur ₹50 kisne bheje the?\" Kaun jawab de sakta hai?",
            "choices": [
              "Sirf passbook — v2 tak ki lines jodo toh ₹50, aur v2 ki line batati hai ki ₹50 Ravi ne bheje",
              "Dono — slate par 90 hai, aur 90 se peeche ka poora hisaab dobara lagaya ja sakta hai",
              "Sirf slate — slate par aakhri number hai, aur aakhri number hi sabse bharose wala hota hai"
            ],
            "answer": 0,
            "hint": "Slate par pichhle number bache hain kya?",
            "explain": "Slate par sirf aakhri number bachta hai: 90. Pichhle number mit gaye. Passbook mein har line hai: v2 tak jodo toh salary se pehle ₹50, aur v2 ki line batati hai ki ₹50 Ravi ne bheje. Lab ka history run bhi har line ke baad balance dikhata hai: 0 → 50 → 110 → 90.",
            "choiceExplanations": [
              "Slate par sirf aakhri number bachta hai: 90. Pichhle number mit gaye. Passbook mein har line hai: v2 tak jodo toh salary se pehle ₹50, aur v2 ki line batati hai ki ₹50 Ravi ne bheje. Lab ka history run bhi har line ke baad balance dikhata hai: 0 → 50 → 110 → 90.",
              "90 kai raaston se ban sakta hai (50 + 60 − 20, ya 100 − 10…). Slate se peeche ka raasta nahi milta.",
              "Aakhri number sahi hai, par sawaal pichhle pal ka hai — slate par pichhla pal mit chuka."
            ]
          }
        },
        {
          "title": "Balance = lines ka jod",
          "clock": "fold",
          "say": "Passbook se balance: pehli line se shuru karo, har line lagao — 0 → 50 → 110 → 90. Is jodne ko <b>fold</b> (ya replay) kehte hain. Kisi bhi pal ka balance: us pal ki line tak hi jodo. Lab: \"as-of v3 = 110\".",
          "nodes": {
            "ravi": {
              "tone": "ok",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "4 lines"
            },
            "slate": {
              "tone": "idle",
              "badge": "90"
            }
          },
          "vars": {
            "store": "4 lines",
            "slate": "90",
            "bal": "90 (v3 tak: 110)"
          }
        }
      ],
      "lesson": "Slate sirf aakhri haalat rakhta hai; passbook har badlaav ek nayi line ki tarah rakhta hai. Haalat lines jod ke nikalti hai, aur kisi bhi pal ki haalat us pal tak jod ke. Isi tareeke ka naam event sourcing hai: sach ka source events hain, balance column nahi."
    },
    {
      "type": "cards",
      "title": "🖊️ Galti ho gayi — line mitao ya nayi jodo?",
      "goal": "Passbook ka ek niyam: likhi line kabhi nahi badalti. Toh galti kaise theek ho, aur event ka naam kaisa ho?",
      "lesson": "Event beeti baat hai, past tense mein, aur kabhi badla nahi jaata. Galti ka sudhaar ek naya event hai. Command (hukm) mana ho sakta hai; event nahi.",
      "steps": [
        {
          "title": "1. Galat entry",
          "say": "Cashier ne Ravi ki salary ₹60 ki jagah ₹600 likh di (v3). Balance 650 dikh raha hai, sahi hai 110.",
          "ask": {
            "q": "Galti kaise theek karoge?",
            "choices": [
              "Nayi line jodo: ₹540 ka sudhaar event; ₹600 wali line bhi passbook mein rahe",
              "v3 ki line mein 600 kaat ke 60 likh do — passbook phir se bilkul saaf dikhegi",
              "v3 ki line mita do aur Ravi se kaho ki salary ka record dobara bhejein"
            ],
            "answer": 0,
            "hint": "Audit mein \"kab, kisne, kya\" dikhna chahiye ya chhupna?",
            "explain": "Passbook ki likhi line nahi badalti — warna audit mein \"kab kya hua\" kho jaata hai. Sudhaar ek nayi line hai: pehle ₹600 likha gaya, phir ₹540 ka sudhaar. Itihaas mein dono dikhte hain, aur balance sahi: 650 − 540 = 110.",
            "choiceExplanations": [
              "Passbook ki likhi line nahi badalti — warna audit mein \"kab kya hua\" kho jaata hai. Sudhaar ek nayi line hai: pehle ₹600 likha gaya, phir ₹540 ka sudhaar. Itihaas mein dono dikhte hain, aur balance sahi: 650 − 540 = 110.",
              "Line badalne se itihaas jhooth bolta hai: kisi ko pata nahi chalega ki ₹600 kabhi likha gaya tha.",
              "Line mitane se bhi itihaas kat jaata hai, aur galti bank ki thi — Ravi se dobara kuch maangna galat hai."
            ]
          }
        },
        {
          "title": "2. Event ka naam",
          "say": "Passbook ki line beeti hui baat hai: \"₹50 jama ho gaye\" — <b>Deposited</b>. Hukm (\"₹50 jama karo\") alag cheez hai: hukm mana ho sakta hai, beeti baat nahi.",
          "ask": {
            "q": "Inmein se event (beeti baat) kaunsa hai?",
            "choices": [
              "Withdrawn — ₹20 nikal chuke; passbook mein ek nayi line",
              "Withdraw — ₹20 nikaalo; balance kam ho toh mana bhi ho sakta hai",
              "CheckBalance — balance batao; khaate mein kuch nahi badalta"
            ],
            "answer": 0,
            "hint": "Kaunsa naam ho chuki baat batata hai?",
            "explain": "Event past tense mein hota hai: ho chuka, ab badlega nahi. Withdraw ek command hai — handler jaanch ke mana bhi kar sakta hai. CheckBalance ek query hai; query se koi event nahi banta.",
            "choiceExplanations": [
              "Event past tense mein hota hai: ho chuka, ab badlega nahi. Withdraw ek command hai — handler jaanch ke mana bhi kar sakta hai. CheckBalance ek query hai; query se koi event nahi banta.",
              "Withdraw hukm hai: abhi hua nahi, aur balance kam ho toh mana hoga.",
              "CheckBalance sirf padhna hai. Khaata nahi badla, toh passbook mein koi line nahi."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Haalat ko events ki lambi list se banana, aur events ko kabhi na badalna: <b>event sourcing</b>. Events rakhne wali jagah: <b>event store</b>. Events jod ke haalat banana: <b>fold / replay</b>. Galti ka sudhaar naye event se: <b>compensating event</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli SQLite mein passbook — kisi bhi pal ka balance",
      "project": "50-event-sourcing",
      "exercise": "ex3-replay",
      "goal": "Ravi ka khaata asli SQLite event store mein: har event ke baad balance, aur v3 par balance kya tha.",
      "why": "Node 24+ chahiye (built-in SQLite). Tool ek temp SQLite file banata aur aakhir mein mita deta hai. History ka nateeja teeno runs mein wahi rahe.",
      "steps": [
        {
          "text": "Lab folder se: Ravi ki passbook.",
          "cmd": "cd docker-labs/50-event-sourcing && npm start -- ex3-replay history",
          "expect": "history  v1 Opened → 0 · v2 Deposited 50 (ravi) → 50 · v3 Deposited 60 (salary) → 110 · v4 Withdrawn 20 → 90 · as-of v3 = 110"
        },
        {
          "text": "Agle level ki jhalak: do handlers ek saath ₹80 nikaalein, bina version ke.",
          "cmd": "npm start -- ex0-slowmo --story race --mode any",
          "expect": "story=race mode=any | nakli ghadi; lab ke tay ms\n  0 ms  a1: Opened, Deposited 100 | store=100 version=2\n  0 ms  A ne padha: balance 100, v2 | store=100 version=2\n  0 ms  B ne padha: balance 100, v2 | store=100 version=2\n 20 ms  A: 100 ≥ 80, Withdrawn 80 likha | store=20 version=3\n 20 ms  B: 100 ≥ 80, Withdrawn 80 likha (bina version jaanch) | store=-60 version=4"
        }
      ],
      "observe": {
        "q": "Output mein \"as-of v3 = 110\". Tool ne 110 kaise nikaala?",
        "choices": [
          "Sirf v1 se v3 tak ke events jode — v4 (₹20 nikaale) ko chhod diya",
          "Balance column mein purana 110 save tha — tool ne seedha purana 110 padh liya",
          "Snapshot table se v3 ki haalat uthayi — events jodne ki zaroorat nahi padi"
        ],
        "answer": 0,
        "hint": "Event store mein balance column hai kya?",
        "explain": "Kisi bhi pal ki haalat = us pal tak ke events ka fold. Tool ne v3 tak ke events chune aur jode: 0 → 50 → 110. Koi balance column nahi, koi snapshot nahi — sirf events.",
        "choiceExplanations": [
          "Kisi bhi pal ki haalat = us pal tak ke events ka fold. Tool ne v3 tak ke events chune aur jode: 0 → 50 → 110. Koi balance column nahi, koi snapshot nahi — sirf events.",
          "Event store mein balance column hai hi nahi. Har haalat events jod ke banti hai.",
          "History run mein koi snapshot nahi bana. Snapshot agle level mein aata hai — aur snapshot bhi events se hi banta hai."
        ]
      },
      "lesson": "Event store mein koi balance column nahi; har haalat events jod ke banti hai. Lab mein v3 tak ke events jode toh ₹110. Kisi tareekh ka jawab chahiye toh event ke saath event ka waqt bhi likho, aur \"kisne badla\" ke liye actor bhi."
    }
  ],
  "interview": {
    "title": "Interview Round — itihaas chahiye ya sirf aaj ki haalat?",
    "instructions": "Pehle socho: aakhri haalat kaafi hai, ya kab-kisne-kya bhi chahiye? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Insurance company: regulator har claim ka poora itihaas maangta hai — kab, kisne, kya badla — aur kisi bhi purani tareekh ka status. Abhi claims table mein sirf aakhri status hai. Kya sujhaoge?",
        "choices": [
          "Har badlaav waqt aur actor ke saath event ki tarah rakho; aaj ka aur purani tareekh ka status, events jod ke",
          "Claims table ka roz raat backup lo; purani tareekh ka status us raat ke backup se nikaal lo",
          "Status column ke saath updated_at column jodo; aakhri badlaav ka waqt regulator ke liye kaafi hai",
          "Har badlaav par log file mein ek line likho; claims table ko hi sach ka source rehne do"
        ],
        "answer": 0,
        "explain": "Regulator ko poora itihaas aur kisi bhi pal ki haalat chahiye — event sourcing ka seedha kaam. Har badlaav ek event, waqt aur actor ke saath — tabhi \"kab\" aur \"kisne\" ka jawab milta hai; aaj ki aur purani tareekh ki haalat, dono fold se. Backup sirf raat ka pal dikhata hai, beech ke badlaav nahi.",
        "choiceExplanations": [
          "Regulator ko poora itihaas aur kisi bhi pal ki haalat chahiye — event sourcing ka seedha kaam. Har badlaav ek event, waqt aur actor ke saath — tabhi \"kab\" aur \"kisne\" ka jawab milta hai; aaj ki aur purani tareekh ki haalat, dono fold se. Backup sirf raat ka pal dikhata hai, beech ke badlaav nahi.",
          "Raat ka backup din ke beech ke badlaav nahi dikhata, aur \"kisne badla\" bhi nahi batata.",
          "updated_at sirf aakhri badlaav ka waqt hai; pichhle badlaav aur badlaav ki wajah kho jaate hain.",
          "Log alag write hai: table aur log ke beech crash hua toh table aur log alag kahani batate hain."
        ]
      },
      {
        "q": "Event store mein ek galat event hai: Deposited ₹600, sahi tha ₹60. Developer kehta hai: \"UPDATE events SET amount = 60 chala deta hoon.\" Aapka jawab?",
        "choices": [
          "Nahi — sudhaar ka naya event jodo; purana event audit ke liye event store mein rahe",
          "Theek hai — bas UPDATE ke baad saare read models aur snapshots mita do",
          "Theek hai — event store bhi ek table hai, galat data rakhne ka kya faayda",
          "Nahi — poora stream mita ke sahi events se dobara bana do, saaf rahega"
        ],
        "answer": 0,
        "explain": "Event store ki line kabhi nahi badalti; galti ka sudhaar ek naya (compensating) event hai. Microsoft ke Event Sourcing pattern mein: \"you should never update the event data\". Badalne se audit jhooth bolta hai, aur ₹600 dekh chuke consumers tak sudhaar ki koi khabar nahi jaati.",
        "choiceExplanations": [
          "Event store ki line kabhi nahi badalti; galti ka sudhaar ek naya (compensating) event hai. Microsoft ke Event Sourcing pattern mein: \"you should never update the event data\". Badalne se audit jhooth bolta hai, aur ₹600 dekh chuke consumers tak sudhaar ki koi khabar nahi jaati.",
          "Read models mitane se bhi ₹600 ka itihaas gayab hi rehta hai, aur consumers tak sudhaar nahi pahunchta.",
          "Event store sach ka source aur audit hai. Purani line badli toh \"kab kya hua\" ka saboot gaya.",
          "Stream mitane se poora itihaas jaata hai — audit ka matlab hi khatam."
        ]
      }
    ]
  },
  "success": [
    "Slate (sirf aakhri haalat) aur passbook (events) ka farq bata sakte ho",
    "Events ko fold karke kisi bhi pal ki haalat nikaal sakte ho",
    "Galti naye event se kyun theek hoti hai, samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Event sourcing ek line mein?",
      "back": "Sach ka source events ki list hai; haalat events ko kram se jod ke banti hai. Events kabhi nahi badalte."
    },
    {
      "front": "Event aur command ka farq?",
      "back": "Event beeti baat hai (Deposited) — mana nahi ho sakta. Command hukm hai (Deposit) — handler mana kar sakta hai."
    },
    {
      "front": "Galat event ka ilaaj?",
      "back": "Naya sudhaar event (compensating event). Purana event audit ke liye event store mein rehta hai."
    }
  ]
}
]);
})();
