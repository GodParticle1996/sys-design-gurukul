/* First Principles — FAANG Senior Engineer.
   Source credit: Microservices — Know When NOT to Use (cmiAEDVcGbE), numbered video 13/15.
   Evidence: docker-labs/63-microservices/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "user", "icon": "🙋", "label": "User request", "x": 110, "y": 200}, {"id": "gw", "icon": "🚪", "label": "Gateway", "x": 330, "y": 200}, {"id": "s1", "icon": "🧩", "label": "Service 1", "x": 640, "y": 60}, {"id": "s2", "icon": "🧩", "label": "Service 2", "x": 640, "y": 200}, {"id": "s3", "icon": "🐢", "label": "Service 3 (1% 50 ms)", "x": 640, "y": 340}];
const EDGES = [{"from": "user", "to": "gw"}, {"from": "gw", "to": "s1"}, {"from": "gw", "to": "s2"}, {"from": "gw", "to": "s3"}];
VISUALS["fp-micro-kaise"] = { t: "Parallel request sabse dheemi call ka intezaar karti hai. Jitni services, utna zyada tail.", html: SD.viz.svg(HERO, EDGES, { nodes: { user: {tone:'busy',badge:'intezaar'}, gw: {tone:'busy',badge:'fan-out'}, s1: {tone:'ok',badge:'2 ms'}, s2: {tone:'ok',badge:'2 ms'}, s3: {tone:'bad',badge:'50 ms'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-micro-kaise",
  "icon": "📈",
  "group": "🧩 Microservices: Kab Nahi",
  "title": "Microservices 2 · Kaise — fan-out ka tail aur copies ka hisaab",
  "badge": "Jhatkon Ka Ginnewala",
  "objectives": [
    "Sequential vs parallel calls: p50 aur p99",
    "1 − 0.99^n: har service ka jhatka request ka jhatka",
    "Monolith ki copies: RAM vs DB connections"
  ],
  "lesson": [
    "<h3>🍛 Thaali ke das katore</h3><p>Thaali tab tak nahi jaati jab tak das katore na bhar jaayein. Har katora 2 minute leta hai, par sau mein ek baar koi rasoiya 50 minute laga deta hai. Ek ke baad ek bharo toh 20 minute; saath-saath bharo toh sabse dheeme katore ka intezaar.</p><p>Das rasoiyon mein se kisi ek ke 50 minute lagane ka chance? Lagbhag das mein ek thaali. Aaj gin kar dekhte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🎯 10 services, ek request — kitna intezaar?",
      "goal": "Lab 63 ex1 (model, seeded, 1 lakh requests): har service call 1–3 ms, par 1% calls ko 50 ms ka jhatka (GC pause, packet dobara bhejna). Ek request ko kai services se jawab chahiye.",
      "nodes": [
        {
          "id": "user",
          "icon": "🙋",
          "label": "User request",
          "x": 110,
          "y": 200
        },
        {
          "id": "gw",
          "icon": "🚪",
          "label": "Gateway",
          "x": 330,
          "y": 200
        },
        {
          "id": "s1",
          "icon": "🧩",
          "label": "Service 1",
          "x": 640,
          "y": 60
        },
        {
          "id": "s2",
          "icon": "🧩",
          "label": "Service 2",
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "icon": "🐢",
          "label": "Service 3 (1% 50 ms)",
          "x": 640,
          "y": 340
        }
      ],
      "edges": [
        {
          "from": "user",
          "to": "gw"
        },
        {
          "from": "gw",
          "to": "s1"
        },
        {
          "from": "gw",
          "to": "s2"
        },
        {
          "from": "gw",
          "to": "s3"
        }
      ],
      "viz": {
        "w": 900,
        "h": 420
      },
      "vars": [
        {
          "id": "mode",
          "label": "Kaise bulaaya"
        },
        {
          "id": "p50",
          "label": "p50"
        },
        {
          "id": "p99",
          "label": "p99"
        }
      ],
      "steps": [
        {
          "title": "Ek service",
          "clock": "1 service",
          "say": "Ek call: p50 2 ms, p99 50 ms (1% jhatke).",
          "nodes": {
            "user": {
              "tone": "ok",
              "badge": ""
            },
            "gw": {
              "tone": "ok",
              "badge": ""
            },
            "s1": {
              "tone": "ok",
              "badge": "2 ms"
            },
            "s2": {
              "tone": "idle",
              "badge": ""
            },
            "s3": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "mode": "1 call",
            "p50": "2.0 ms",
            "p99": "50 ms"
          },
          "flows": [
            {
              "from": "gw",
              "to": "s1",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "10, ek ke baad ek",
          "clock": "sequential",
          "say": "Gateway 10 services ko ek ke baad ek bulata hai. Video ka \"10 × 2 ms = 20 ms\" — lab: p50 20.3 ms, p99 70.7 ms.",
          "nodes": {
            "user": {
              "tone": "busy",
              "badge": "ruka"
            },
            "gw": {
              "tone": "busy",
              "badge": "1 → 2 → … → 10"
            },
            "s1": {
              "tone": "ok",
              "badge": ""
            },
            "s2": {
              "tone": "ok",
              "badge": ""
            },
            "s3": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "mode": "10 sequential",
            "p50": "20.3 ms",
            "p99": "70.7 ms"
          }
        },
        {
          "title": "10, saath-saath",
          "clock": "parallel",
          "say": "Gateway 10 calls ek saath bhejta hai (fan-out) aur sabse dheemi ka intezaar. Lab: p50 2.9 ms, p99 50 ms.",
          "nodes": {
            "user": {
              "tone": "ok",
              "badge": ""
            },
            "gw": {
              "tone": "busy",
              "badge": "10 saath"
            },
            "s1": {
              "tone": "ok",
              "badge": ""
            },
            "s2": {
              "tone": "ok",
              "badge": ""
            },
            "s3": {
              "tone": "bad",
              "badge": "50 ms?"
            }
          },
          "vars": {
            "mode": "10 parallel",
            "p50": "2.9 ms",
            "p99": "50 ms"
          },
          "flows": [
            {
              "from": "gw",
              "to": "s1",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "gw",
              "to": "s2",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "gw",
              "to": "s3",
              "label": "",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Parallel mein median 2.9 ms par p99 phir bhi 50 ms. Kyun?",
            "choices": [
              "~9.6% requests mein koi call jhatka khaati; sabse dheemi ka intezaar",
              "Parallel calls server ko overload karti hain, isliye p99 badhta",
              "Gateway parallel calls ko andar se ek ke baad ek hi chalata hai"
            ],
            "answer": 0,
            "hint": "10 calls mein se kam se kam ek ke 1% wale jhatke mein padne ka chance?",
            "explain": "Jhatke alag-alag hon toh 1 − 0.99^10 ≈ 9.6% requests mein kam se kam ek call 50 ms leti hai, aur parallel request sabse dheemi ka intezaar karti hai (ek saanjha jhatka sab calls par pade toh sirf 1%). 9.6% > 1%, isliye p99 = 50 ms. Har service ka \"kabhi-kabhi\" poore request ka \"aksar\" ban jaata hai (Dean & Barroso, The Tail at Scale).",
            "choiceExplanations": [
              "Jhatke alag-alag hon toh 1 − 0.99^10 ≈ 9.6% requests mein kam se kam ek call 50 ms leti hai, aur parallel request sabse dheemi ka intezaar karti hai (ek saanjha jhatka sab calls par pade toh sirf 1%). 9.6% > 1%, isliye p99 = 50 ms. Har service ka \"kabhi-kabhi\" poore request ka \"aksar\" ban jaata hai (Dean & Barroso, The Tail at Scale).",
              "Model mein load ka asar nahi; jhatke random hain.",
              "Parallel ka median (2.9 ms) dikhata hai ki calls saath chal rahi hain."
            ]
          }
        },
        {
          "title": "30 services",
          "clock": "30",
          "say": "30 calls: sequential p50 61.5 ms, p99 158.5 ms; parallel p50 3.0 ms, p99 50 ms. 26% requests ko kam se kam ek jhatka.",
          "nodes": {
            "user": {
              "tone": "bad",
              "badge": "dheema"
            },
            "gw": {
              "tone": "busy",
              "badge": "30 calls"
            },
            "s1": {
              "tone": "ok",
              "badge": ""
            },
            "s2": {
              "tone": "ok",
              "badge": ""
            },
            "s3": {
              "tone": "bad",
              "badge": "26% jhatka"
            }
          },
          "vars": {
            "mode": "30 services",
            "p50": "61.5 / 3.0 ms",
            "p99": "158.5 / 50 ms"
          }
        }
      ],
      "lesson": "Sequential calls latency jodti hain; parallel calls sabse dheemi ka intezaar karti hain. Jhatke alag-alag hon toh jitni zyada services, utni zyada requests ko kisi ek ka jhatka (1 − 0.99^n)."
    },
    {
      "type": "cards",
      "title": "📈 \"Alag scale karo\" — aur DB?",
      "goal": "Lab 63 ex3 (arithmetic): monolith ki copies — idle RAM aur DB connections. Video: \"RAM sasta hai, poori copy chalao\".",
      "lesson": "Copies se monolith scale hota hai (video sahi). Par har copy DB connections bhi laati hai — pooler ya alag worker, poori microservice ki zaroorat nahi.",
      "steps": [
        {
          "title": "1. RAM",
          "say": "100 copies × 0.5 GB idle code = 50 GB. Cloud par itni RAM aksar engineering ke ghanton se sasti — video sahi."
        },
        {
          "title": "2. DB connections",
          "say": "Har copy ka pool max 20: busy samay mein har pool bhar sakta hai — 100 copies = 2,000 connections tak. Postgres ka max_connections aam taur par 100 — 20 guna. Split karke (image service ko DB nahi chahiye, baaki app 4 copies) = 80.",
          "ask": {
            "q": "Monolith ki 100 copies ke baad DB \"too many connections\" de raha hai. Microservices ke bina ilaaj?",
            "choices": [
              "Chhota pool + PgBouncer jaisa pooler, ya alag worker process",
              "Postgres ka max_connections 10,000 kar do, har connection free hai",
              "Copies 100 se 2 kar do — traffic apne aap kam ho jaayega",
              "Har copy ka apna database bana do, taaki connections bant jaayein"
            ],
            "answer": 0,
            "hint": "Connections ka guna kisse hota hai: copies × ?",
            "explain": "Connections = copies × pool. Pool chhota karo, ya PgBouncer jaisa pooler beech mein (kai app connections → kam DB connections). Bhaari kaam (image) ko alag worker process — usko DB chahiye hi nahi. Poori microservice ki zaroorat nahi.",
            "choiceExplanations": [
              "Connections = copies × pool. Pool chhota karo, ya PgBouncer jaisa pooler beech mein (kai app connections → kam DB connections). Bhaari kaam (image) ko alag worker process — usko DB chahiye hi nahi. Poori microservice ki zaroorat nahi.",
              "Har Postgres connection ek process aur memory leta hai; 10,000 bhaari padega.",
              "Traffic copies se nahi ghatta; copies traffic sambhalne ke liye hain.",
              "Ek data ke kai DB = consistency ki nayi dikkat (Level 3)."
            ]
          }
        },
        {
          "title": "3. Bhaari hissa alag",
          "say": "Video ke signals mein \"alag hardware\" (GPU wala ML) sahi kaaran hai. Pehle saste raaste bhi tolo: same codebase, alag worker process/queue. Alag service tab jab koi thos faayda (team ki azaadi, alag release, alag hardware, security, fault isolation) distribution ki keemat se bada ho — nayi team zaroori shart nahi."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Fan-out aur copies",
      "project": "63-microservices",
      "exercise": "ex1-fanout",
      "goal": "1 / 3 / 10 / 30 services — sequential vs parallel; phir monolith ki copies ka hisaab.",
      "why": "Node 24+ chahiye. ex1 seeded model (har run same), ex3 seedha hisaab.",
      "steps": [
        {
          "text": "Fan-out.",
          "cmd": "cd docker-labs/63-microservices && npm start -- ex1-fanout",
          "expect": "MODEL (seeded, 1 lakh requests): har service call 1–3 ms, par 1% calls ko 50 ms ka jhatka (GC, packet dobara bhejna).\nEk user request ko kitni services se jawab chahiye — ek ke baad ek (sequential) ya saath-saath (parallel fan-out)?\n\nservices   sequential p50 / p99      parallel p50 / p99     kitni requests ko kam se kam ek jhatka (theory)\n       1      2.0 /   50.0 ms         2.0 /  50.0 ms          1.1%  (1.0%)\n       3      6.0 /   54.4 ms         2.6 /  50.0 ms          3.1%  (3.0%)\n      10     20.3 /   70.7 ms         2.9 /  50.0 ms          9.7%  (9.6%)\n      30     61.5 /  158.5 ms         3.0 /  50.0 ms         26.1%  (26.0%)\n\nSaanjha jhatka (ek hi pause, jaise caller ka GC, saari 10 calls par): 1.0% requests — 9.6% nahi.\n\nMaanyatayein: jhatke alag-alag (independent), har jawab zaroori, koi bheed nahi, jhatka theek 50 ms.\n\n→ Video: \"10 services × 2 ms = 20 ms network tax\". Tab sahi jab calls ek ke baad ek hon; parallel mein median sabse dheemi\n  call jitna. Fan-out se kisi dheemi call se takraane ka chance badhta hai: alag-alag jhatke hon toh 10 calls par ~9.6%\n  (1 − 0.99^10). Is model mein jhatka 50 ms par ruk jaata hai, isliye parallel ka p99 50 ms hi rehta hai — badhta hai\n  dheemi requests ka hissa. Jhatke saanjhe hon toh exposure kam. Bada pattern: Dean & Barroso, \"The Tail at Scale\" (2013)."
        },
        {
          "text": "Copies.",
          "cmd": "npm start -- ex3-copies",
          "expect": "Arithmetic: monolith ko copies se scale karo. Har copy mein 0.5 GB ka code jo zyadatar idle (video ka \"user profile\"),\naur har copy ka apna DB connection pool (max 20). Postgres ka max_connections aam taur par 100 (kuch slots reserved).\n\ncopies   idle RAM (sab copies)   max DB connections (har pool bhar jaaye toh)   Postgres default (100) ke mukable\n     2               1 GB                                40                     0.4×\n    10               5 GB                               200                     2.0×\n    50              25 GB                             1,000                    10.0×\n   100              50 GB                             2,000                    20.0×\n\nSplit karke: image service ki 100 copies (DB nahi chahiye) + baaki app ki 4 copies → max DB connections 80.\n\n→ Video sahi: idle RAM aksar sasta hai (100 copies × 0.5 GB = 50 GB). Par copies sirf RAM nahi, DB connections bhi guna\n  karti hain: busy samay mein har pool bhar sakta hai — 100 × 20 = 2,000, default se 20 guna (pool khaali shuru hote hain,\n  zaroorat par bharte hain). Ilaaj monolith mein bhi hai: chhota pool, PgBouncer jaisa\n  connection pooler, ya bhaari kaam (image) ko alag worker process mein — poori microservice ki zaroorat nahi. Lab 16 ex2 asli\n  monolith copies dikhata hai."
        }
      ],
      "observe": {
        "q": "ex1: 30 services sequential par p99 158.5 ms, jabki ek call ka p99 sirf 50 ms. Kyun?",
        "choices": [
          "Kai calls ko jhatka lag sakta hai aur sequential mein sab jud jaate hain",
          "Sequential calls ek doosre ko block karke server ko dheema karti hain",
          "30 services par model har call ka jhatka 150 ms kar deta hai"
        ],
        "answer": 0,
        "hint": "30 calls mein 2–3 jhatke ek saath padne ka chance?",
        "explain": "Sequential latency = sab calls ka jod. 30 calls mein 1% jhatke kabhi 2–3 baar bhi padte hain: 2 × 50 + baaki ~60 ms ≈ 160 ms. Isliye bahut saari ek-ke-baad-ek calls ka tail bahut lamba.",
        "choiceExplanations": [
          "Sequential latency = sab calls ka jod. 30 calls mein 1% jhatke kabhi 2–3 baar bhi padte hain: 2 × 50 + baaki ~60 ms ≈ 160 ms. Isliye bahut saari ek-ke-baad-ek calls ka tail bahut lamba.",
          "Model mein calls ek doosre ko dheema nahi karti; jhatke alag-alag hain.",
          "Har jhatka 50 ms hi hai; jod se 158 ms."
        ]
      },
      "lesson": "Services ki ginti tail latency ka multiplier hai. Copies RAM ke saath DB connections bhi guna karti hain."
    }
  ],
  "interview": {
    "title": "Interview Round — fan-out aur scaling",
    "instructions": "Pehle socho: calls ek ke baad ek hain ya saath, aur har service ka tail kitna? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Home page 25 services se data jodta hai (parallel, har jawab zaroori). Har service ka p99 80 ms hai, par page ka p99 400 ms hai aur shikayatein badh rahi hain. Pehli soch?",
        "choices": [
          "Traces dekho; phir fan-out ghataao, fallback ya safe hedging",
          "Har service ka p50 aur sudhaaro — page ka p99 p50 se banta",
          "Calls ko ek ke baad ek kar do, taaki server par bojh kam ho",
          "Page ka cache hata do, taaki har baar bilkul taaza data aaye"
        ],
        "answer": 0,
        "explain": "Pehle traces aur correlation dekho: kaun si calls critical path par hain, jhatke alag-alag hain ya saanjhe. Agar alag-alag hon toh 25 parallel calls mein kisi ek ke 1% tail se takraane ka chance ~22% (1 − 0.99^25; lab model: 22.2%, saanjhe jhatke par ~1%). Phir: fan-out ghataao, optional widgets par timeout + fallback, ya safe hedged requests (Tail at Scale). Lab 63 ex1.",
        "choiceExplanations": [
          "Pehle traces aur correlation dekho: kaun si calls critical path par hain, jhatke alag-alag hain ya saanjhe. Agar alag-alag hon toh 25 parallel calls mein kisi ek ke 1% tail se takraane ka chance ~22% (1 − 0.99^25; lab model: 22.2%, saanjhe jhatke par ~1%). Phir: fan-out ghataao, optional widgets par timeout + fallback, ya safe hedged requests (Tail at Scale). Lab 63 ex1.",
          "Page ki latency poore critical path aur saath-saath ke jhatkon se banti hai; sirf p50 sudhaarna kaafi nahi.",
          "Sequential calls latency jodti hain — aur bura.",
          "Cache hataane se aur calls, aur tail."
        ]
      },
      {
        "q": "Server ko originals se tay sizes (canonical derivatives) khud banane hain; resize CPU-heavy, baaki app halki. Team kehti hai \"resize ko alag microservice banao\". Sabse sasta pehla kadam?",
        "choices": [
          "Same codebase mein resize alag worker + queue; alag scale karo",
          "Naya repo, naya team, naya deploy pipeline — resize service",
          "Poore monolith ki 100 copies chalao, sirf resize ke liye",
          "Resize sirf client ke browser mein karo, server kuch na banaye"
        ],
        "answer": 0,
        "explain": "Alag scaling ke liye alag process kaafi: same code, alag worker pool, queue se kaam (FP11). Alag service tab jab koi aur thos faayda chahiye (alag release, hardware, security). 100 copies se max DB connections bhi guna (lab ex3).",
        "choiceExplanations": [
          "Alag scaling ke liye alag process kaafi: same code, alag worker pool, queue se kaam (FP11). Alag service tab jab koi aur thos faayda chahiye (alag release, hardware, security). 100 copies se max DB connections bhi guna (lab ex3).",
          "Nayi team aur pipeline bina zaroorat ka kharcha.",
          "Poori copies se DB connections 100 × pool.",
          "Server ko khud originals se derivatives banane hain; browser ka resize us zaroorat ko poora nahi karta (jahan product ijazat de, browser resize ek achha vikalp hai)."
        ]
      }
    ]
  },
  "success": [
    "Sequential vs parallel ka p50/p99 bata sakte ho",
    "1 − 0.99^n se tail exposure gin sakte ho",
    "Copies ke DB connections aur sasta ilaaj bata sakte ho"
  ],
  "cards": [
    {
      "front": "10 services, sequential vs parallel?",
      "back": "Lab 63 ex1: sequential p50 20.3 ms / p99 70.7 ms; parallel p50 2.9 ms / p99 50 ms. 9.6% requests ko kam se kam ek jhatka."
    },
    {
      "front": "Tail exposure?",
      "back": "Alag-alag jhatke: 1 − (1 − p)^n. p = 1%, n = 10 → 9.6%; n = 30 → 26%. Saanjha jhatka (ek pause sab par): sirf p."
    },
    {
      "front": "Copies ka chhupa kharcha?",
      "back": "Max DB connections = copies × pool (har pool bhar jaaye toh). 100 × 20 = 2,000 (Postgres aam default 100). Pooler (PgBouncer) ya alag worker."
    }
  ]
}
]);
})();
