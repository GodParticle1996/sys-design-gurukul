/* First Principles — FAANG Senior Engineer.
   Source credit: Microservices — Know When NOT to Use (cmiAEDVcGbE), numbered video 13/15.
   Evidence: docker-labs/63-microservices/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "order", "icon": "🧾", "label": "Order module", "x": 140, "y": 120}, {"id": "inv", "icon": "📦", "label": "Inventory module", "x": 140, "y": 300}, {"id": "osvc", "icon": "🧾", "label": "Order service", "x": 570, "y": 120}, {"id": "isvc", "icon": "📦", "label": "Inventory service", "x": 570, "y": 300}, {"id": "net", "icon": "🌐", "label": "Network", "x": 800, "y": 210}];
const EDGES = [{"from": "order", "to": "inv"}, {"from": "osvc", "to": "net"}, {"from": "net", "to": "isvc"}];
VISUALS["fp-micro-kyun"] = { t: "Andar se: function call, nanoseconds. Bahar se: JSON + HTTP + network, hazaaron se laakhon guna, aur fail ho sakti hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { order: {tone:'ok',badge:'5 ns'}, inv: {tone:'ok',badge:''}, osvc: {tone:'busy',badge:'~0.5 ms'}, isvc: {tone:'ok',badge:''}, net: {tone:'bad',badge:'fail?'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-micro-kyun",
  "icon": "💸",
  "group": "🧩 Microservices: Kab Nahi",
  "title": "Microservices 1 · Kyun — network ka tax",
  "badge": "Seema Ka Hisaabdaar",
  "objectives": [
    "Function call vs network call — asli naap",
    "Har boundary ke saath aane wale kaam (timeout, retry, tracing)",
    "Monolith ≠ spaghetti; video ke aankdon par shak"
  ],
  "lesson": [
    "<h3>🏠 Ek ghar, ya alag-alag ghar?</h3><p>Ek ghar mein rasoi se awaaz do: \"namak kitna bacha?\" — jawab turant. Ab rasoi aur bhandar alag mohallon mein hain: phone karo, koi uthaye, dhoondhe, wapas phone kare. Kabhi line busy, kabhi koi ghar par nahi.</p><p>Har baar ka sawaal ab mehnga aur anishchit hai. Microservices ka matlab bhi aisa hi hai: code ke hisse alag gharon mein. Aaj naapte hain ki service ka \"phone\" kitna mehnga hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📞 Ek sawaal: \"sku-42 kitne bache?\" — andar se, ya network se?",
      "goal": "Lab 63 ex0 (asli, is laptop par, 3 runs): same sawaal chaar tarah se poocha — function call, JSON ke saath, isi machine par HTTP (connection reuse), aur har baar naya connection. Doosri machine ka 0.5 ms maana hua.",
      "nodes": [
        {
          "id": "order",
          "icon": "🧾",
          "label": "Order module",
          "x": 140,
          "y": 120
        },
        {
          "id": "inv",
          "icon": "📦",
          "label": "Inventory module",
          "x": 140,
          "y": 300
        },
        {
          "id": "osvc",
          "icon": "🧾",
          "label": "Order service",
          "x": 570,
          "y": 120
        },
        {
          "id": "isvc",
          "icon": "📦",
          "label": "Inventory service",
          "x": 570,
          "y": 300
        },
        {
          "id": "net",
          "icon": "🌐",
          "label": "Network",
          "x": 800,
          "y": 210
        }
      ],
      "edges": [
        {
          "from": "order",
          "to": "inv"
        },
        {
          "from": "osvc",
          "to": "net"
        },
        {
          "from": "net",
          "to": "isvc"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "time",
          "label": "Ek call"
        },
        {
          "id": "x",
          "label": "Function call se"
        }
      ],
      "steps": [
        {
          "title": "Monolith ke andar",
          "clock": "function call",
          "say": "Order module seedha inventory module ka function bulata hai (ek hi process). Lab: 4–5 ns — V8 is lookup ko loop mein inline bhi kar deta hai.",
          "nodes": {
            "order": {
              "tone": "ok",
              "badge": ""
            },
            "inv": {
              "tone": "ok",
              "badge": "jawab"
            },
            "osvc": {
              "tone": "idle",
              "badge": ""
            },
            "isvc": {
              "tone": "idle",
              "badge": ""
            },
            "net": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "function call",
            "time": "~5 ns",
            "x": "1×"
          },
          "flows": [
            {
              "from": "order",
              "to": "inv",
              "label": "5 ns",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Sirf JSON",
          "clock": "JSON",
          "say": "Network abhi nahi — request ka JSON (392 bytes) banana aur padhna, stock dekhna, jawab ka JSON banana aur padhna. Lab: 2.6–2.8 µs.",
          "nodes": {
            "order": {
              "tone": "busy",
              "badge": "stringify"
            },
            "inv": {
              "tone": "busy",
              "badge": "parse"
            },
            "osvc": {
              "tone": "idle",
              "badge": ""
            },
            "isvc": {
              "tone": "idle",
              "badge": ""
            },
            "net": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "JSON: request + jawab",
            "time": "~2.7 µs",
            "x": "~600×"
          }
        },
        {
          "title": "Isi machine par HTTP",
          "clock": "loopback",
          "say": "Ab sawaal HTTP par: isi machine par loopback (lab mein server aur client ek hi tool process ke andar), connection reuse. Lab: 33.7–35.2 µs median, p99 ~0.3 ms.",
          "nodes": {
            "order": {
              "tone": "idle",
              "badge": ""
            },
            "inv": {
              "tone": "idle",
              "badge": ""
            },
            "osvc": {
              "tone": "busy",
              "badge": "HTTP"
            },
            "isvc": {
              "tone": "ok",
              "badge": "jawab"
            },
            "net": {
              "tone": "busy",
              "badge": "loopback"
            }
          },
          "vars": {
            "way": "HTTP + JSON, keep-alive",
            "time": "~34 µs",
            "x": "~7,600–7,900×"
          },
          "flows": [
            {
              "from": "osvc",
              "to": "net",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "net",
              "to": "isvc",
              "label": "",
              "tone": "busy"
            }
          ],
          "ask": {
            "q": "Doosri machine ke bina bhi HTTP call ~7,700 guna dheemi kyun?",
            "choices": [
              "JSON, HTTP parse, socket ke system calls, kernel ka TCP stack",
              "Loopback asal mein internet ke raaste jaata hai, isliye dheema",
              "Node ka function call bahut dheema hai, HTTP call nahi"
            ],
            "answer": 0,
            "hint": "Function call aur HTTP call ke beech kaun se naye kaam aaye?",
            "explain": "In-process lookup: V8 ka optimized loop. HTTP call = JSON banana/padhna, HTTP headers, socket ke system calls, kernel ka loopback TCP stack, server ka parse, aur wapas same kaam. Lab mein JSON wala hissa ~2.7 µs, poori HTTP call ~34 µs — doosri machine ke bina.",
            "choiceExplanations": [
              "In-process lookup: V8 ka optimized loop. HTTP call = JSON banana/padhna, HTTP headers, socket ke system calls, kernel ka loopback TCP stack, server ka parse, aur wapas same kaam. Lab mein JSON wala hissa ~2.7 µs, poori HTTP call ~34 µs — doosri machine ke bina.",
              "Loopback machine ke andar hi rehta hai; bahar nahi jaata.",
              "Function call 4–5 ns hai — lab ka sabse tez hissa."
            ]
          }
        },
        {
          "title": "Har baar naya connection",
          "clock": "naya connection",
          "say": "Connection reuse nahi: har call par naya TCP handshake. Lab: 116–125 µs, p99 0.84–1.04 ms.",
          "nodes": {
            "order": {
              "tone": "idle",
              "badge": ""
            },
            "inv": {
              "tone": "idle",
              "badge": ""
            },
            "osvc": {
              "tone": "bad",
              "badge": "handshake"
            },
            "isvc": {
              "tone": "ok",
              "badge": ""
            },
            "net": {
              "tone": "bad",
              "badge": "naya TCP"
            }
          },
          "vars": {
            "way": "HTTP, naya connection",
            "time": "~120 µs",
            "x": "~26,000–27,000×"
          }
        },
        {
          "title": "Doosri machine",
          "clock": "network",
          "say": "Same data center, doosri machine: ~0.5 ms round trip (maana hua). Ab ~0.53 ms — function call se ~1.2 lakh guna. Video ka \"100,000×\" isi hisaab ke paas.",
          "nodes": {
            "order": {
              "tone": "idle",
              "badge": ""
            },
            "inv": {
              "tone": "idle",
              "badge": ""
            },
            "osvc": {
              "tone": "busy",
              "badge": "wait"
            },
            "isvc": {
              "tone": "ok",
              "badge": ""
            },
            "net": {
              "tone": "bad",
              "badge": "0.5 ms"
            }
          },
          "vars": {
            "way": "+ data center network",
            "time": "~0.53 ms",
            "x": "~1.2 lakh×"
          },
          "ask": {
            "q": "Video: \"function call 10 ns, network call 1–2 ms, 100,000×\". Lab ke hisaab se?",
            "choices": [
              "Hisaab theek baithta hai: ~5 ns vs ~0.5 ms ≈ 1 lakh guna",
              "Galat — lab mein network call function call jitni tez nikli",
              "Galat — farq sirf 10 guna ka hai, baaki sab bas andaaza hai"
            ],
            "answer": 0,
            "hint": "5 ns aur 0.53 ms ka anupaat?",
            "explain": "0.53 ms ÷ ~4.5 ns ≈ 1.2 lakh — par 0.5 ms network maana hua hai, naapa nahi. Isi machine par HTTP bhi ~7,700 guna. Anupaat kaam, machine aur network par tike hain; pattern same: in-process lookup aur network call alag duniya.",
            "choiceExplanations": [
              "0.53 ms ÷ ~4.5 ns ≈ 1.2 lakh — par 0.5 ms network maana hua hai, naapa nahi. Isi machine par HTTP bhi ~7,700 guna. Anupaat kaam, machine aur network par tike hain; pattern same: in-process lookup aur network call alag duniya.",
              "Loopback HTTP bhi ~34 µs — function call se hazaaron guna.",
              "Lab ka sabse kam farq (JSON) bhi ~500 guna hai."
            ]
          }
        }
      ],
      "lesson": "Is in-memory lookup ka function call nanoseconds mein. Network call (JSON + HTTP + network) hazaaron se laakhon guna dheemi, aur naye failure laati hai: timeout, connection reset, \"kaam hua ya nahi?\". Local function bhi fail ho sakti hai — network extra jodta hai."
    },
    {
      "type": "cards",
      "title": "💸 Network ka tax — sirf raftaar nahi",
      "goal": "Video ka mudda: microservices aksar mukhya roop se logon (teams) ke liye optimization hain (Fowler: \"primarily\"). Har boundary ki keemat.",
      "lesson": "Network boundary paar karne par extra kaam: timeout, retry ke saath idempotency, remote tracing, service-to-service auth, \"hua ya nahi?\" ka shak. Local code ko bhi errors aur locks sambhalne padte hain — network inke upar aur jodta hai.",
      "steps": [
        {
          "title": "1. Har call ke saath kya aata hai",
          "say": "Network timeout (FP12), retry aur idempotency key (FP12), versioned API contract, distributed tracing (kis service ne der ki), service-to-service auth. In-memory lookup mein network wale hisse nahi lagte; local code ki apni errors, locks aur auth phir bhi rehte hain. Is \"complexity ke byaaj\" ka bojh boundary paar karne wale har feature par lagta hai."
        },
        {
          "title": "2. Video ke aankde",
          "say": "Video: \"2024 DZone: 35% zyada debugging\" aur \"2025 CNCF: 42% ne services wapas jodi\". Dono ka primary source is course ko nahi mila (source na milna \"source hai hi nahi\" ka saboot nahi). CNCF ki April 2025 report mein 42% service mesh adoption hai, microservices jodna nahi. Aur \"35% zyada debugging\" ka matlab \"kul engineering samay ka 35%\" nahi.",
          "ask": {
            "q": "Team lead kehta hai \"survey mein 42% companies wapas monolith par gayi, toh hum bhi jaayein\". Sabse achha jawab?",
            "choices": [
              "Pehle survey ka source jaancho; faisla apne naap aur zarooraton se",
              "Haan — 42% bahut bada number hai, majority ke saath chalo",
              "Nahi — surveys hamesha galat hote hain, microservices hi sahi hain"
            ],
            "answer": 0,
            "hint": "Do alag sawaal: survey sach hai? Aur kya hum par lagu hota hai?",
            "explain": "Do jaanch alag hain. (1) Survey ka daava survey ke primary source, sawaal aur sample se jaancho — is 42% ka source mila hi nahi (CNCF ka 42% service mesh ka hai). (2) Architecture apne naap se tay karo: deploy ka dard, latency, team ki zarooratein. Sahi survey bhi doosron ka anubhav hai.",
            "choiceExplanations": [
              "Do jaanch alag hain. (1) Survey ka daava survey ke primary source, sawaal aur sample se jaancho — is 42% ka source mila hi nahi (CNCF ka 42% service mesh ka hai). (2) Architecture apne naap se tay karo: deploy ka dard, latency, team ki zarooratein. Sahi survey bhi doosron ka anubhav hai.",
              "Source nahi mila; aur majority ka matlab tumhare liye sahi faisla nahi.",
              "Survey ki sachchai survey ke source se jaanchi jaati hai; lagu hona apne naap se."
            ]
          }
        },
        {
          "title": "3. Monolith = spaghetti nahi",
          "say": "Video: monolith ka matlab ganda code nahi. Modular monolith — ek program, par modules ki saaf seemayein (ek module doosre ki table seedha nahi chhoota, public function bulata hai). Stack Overflow (bada monolith), Shopify (modular monolith), Basecamp (\"Majestic Monolith\")."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Call ki keemat naapo",
      "project": "63-microservices",
      "exercise": "ex0-call-cost",
      "goal": "Function call, JSON, loopback HTTP (keep-alive aur naya connection) is machine par.",
      "why": "Node 24+ chahiye. Asli naap: numbers machine aur run ke saath badlenge. Tool apne process mein 127.0.0.1 ke random port par HTTP server chalata hai, bahar kuch publish nahi.",
      "steps": [
        {
          "text": "Call ki keemat.",
          "cmd": "cd docker-labs/63-microservices && npm start -- ex0-call-cost",
          "expect": "ASLI: ek hi sawaal (\"sku-42 kitne bache?\") chaar tarah se, is machine par. Order ka JSON 392 bytes.\n\ntareeka                                                   ek call*            p99        function call se\nfunction call (monolith ke andar module)                        5 ns             —      1×\nJSON: request + jawab banao aur padho (transport nahi)        2.8 µs             —      601×\nHTTP + JSON, isi machine par, connection reuse (keep-alive)    35.2 µs    341.7 µs      7,683×\nHTTP + JSON, isi machine par, har call naya TCP connection   125.0 µs    997.2 µs      27,299×\nMODEL: doosri machine, same data center (+ 0.5 ms maana)    535.2 µs             —      1,16,907×\n\n* Function aur JSON rows: 5 batches ke ausat mein sabse achha. HTTP rows: asli calls ka median. Function call mein V8 checkStock ko\n  loop mein inline kar deta hai — wahi in-process ka asli fayda hai, par ye \"ek jump instruction\" ka naap nahi.\n\n→ Video: function call ~10 ns, network call 1–2 ms, \"100,000×\". Is laptop par function call ~nanoseconds mein, loopback HTTP\n  ~dasiyon µs mein — network ke bina bhi hazaaron guna. Doosri machine ka 0.5 ms (maana hua) jodo toh ~117 hazaar guna.\n  Ye anupaat is kaam aur is machine ke hain; doosri machine wali row 0.5 ms maan kar hai, naapi nahi.\n→ Local function bhi fail ho sakti hai (exception, lock, anant loop, process ka marna). Network call naye failure jodti hai:\n  timeout, connection reset, aur \"kaam hua ya nahi?\" ka shak. Video ka \"function call kabhi fail nahi hoti\" bada daava hai."
        },
        {
          "text": "Lab ke 4 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-63-microservices@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ call cost: same answer over HTTP; a function call is far cheaper; a new connection costs more than keep-alive (230.460402ms)\n✔ fan-out: sequential adds latency, parallel waits for the slowest; exposure 1 − 0.99^n only when hiccups are independent (64.772978ms)\n✔ two databases: final states; saga recovery is idempotent even if recovery crashes; 2PC readers can see the middle; prepared participants block (0.945045ms)\n✔ arithmetic: copies multiply max DB connections; Brooks paths; within-team totals; rename deploys (0.225453ms)\nℹ tests 4\nℹ suites 0\nℹ pass 4\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 334.491484"
        }
      ],
      "observe": {
        "q": "Keep-alive ke saath median ~34 µs, naye connection ke saath ~120 µs. Farq kahan se?",
        "choices": [
          "Naye connection mein har baar TCP handshake aur socket banana",
          "Naye connection mein JSON do baar banta hai, isliye dheema",
          "Keep-alive mein server jawab cache kar leta hai"
        ],
        "answer": 0,
        "hint": "Connection reuse na ho toh har call se pehle kya hota hai?",
        "explain": "Naya TCP connection = handshake (SYN, SYN-ACK, ACK), naya socket, aur server par naya connection. Keep-alive mein handshake ek hi baar. Isliye services ke beech connection pool aur keep-alive aam niyam hai.",
        "choiceExplanations": [
          "Naya TCP connection = handshake (SYN, SYN-ACK, ACK), naya socket, aur server par naya connection. Keep-alive mein handshake ek hi baar. Isliye services ke beech connection pool aur keep-alive aam niyam hai.",
          "JSON dono mein ek hi baar banta hai.",
          "Server har baar checkStock() chalata hai; koi cache nahi."
        ]
      },
      "lesson": "Service boundary ka sabse sasta roop bhi function call se hazaaron guna mehnga. Connection reuse jaise ilaaj madad karte hain, par boundary ka tax khatam nahi karte."
    }
  ],
  "interview": {
    "title": "Interview Round — boundary ki keemat",
    "instructions": "Pehle socho: ek request kitni boundaries paar karti hai, aur har boundary par kya kharcha? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "6 logon ki startup: 1 lakh users, ek Rails app. CTO kehta hai \"Netflix jaisa banane ke liye 12 microservices mein todo\". Tumhari salah?",
        "choices": [
          "Modular monolith: saaf modules, ek deploy; todo tab jab dard dikhe",
          "Haan — microservices hamesha zyada scalable hain, jaldi shuru karo",
          "Har table ke liye ek service — jitni chhoti service utna achha",
          "Kubernetes pehle lagao, services baad mein apne aap ban jaayengi"
        ],
        "answer": 0,
        "explain": "6 logon ki team mein baat-cheet aksar badi dikkat nahi (15 sambhavit raaste), aur sawaal mein alag hardware ya security ka koi thos kaaran nahi diya. 12 services = har call par network tax, saga, tracing, 12 deploy pipelines. Modular monolith mein boundaries code mein, ek deploy. Video: microservices aksar logon (teams) ke liye optimization hain.",
        "choiceExplanations": [
          "6 logon ki team mein baat-cheet aksar badi dikkat nahi (15 sambhavit raaste), aur sawaal mein alag hardware ya security ka koi thos kaaran nahi diya. 12 services = har call par network tax, saga, tracing, 12 deploy pipelines. Modular monolith mein boundaries code mein, ek deploy. Video: microservices aksar logon (teams) ke liye optimization hain.",
          "Scaling ke liye monolith ki copies bhi chalti hain (ex3); team chhoti hai.",
          "Table-per-service = har join network call aur do-database ki dikkat.",
          "Infra pehle lagana bina zaroorat ka kharcha hai."
        ]
      },
      {
        "q": "Checkout API p50 40 ms se 110 ms ho gaya jab \"pricing\" ko alag service banaya. Pricing har item ke liye ek call karta hai (cart mein ~20 items). Sabse pehla sudhaar?",
        "choices": [
          "Ek batch call (saare items ek saath) ya pricing ko wapas module bana do",
          "Pricing service ke servers dugne karo, taaki har call tez ho",
          "Har call par timeout 5 s se 1 s karo, taaki dheemi calls kat jaayein",
          "Pricing ka data har request par JSON ki jagah XML mein bhejo"
        ],
        "answer": 0,
        "explain": "20 items × ek call = 20 network round trips (ek ke baad ek). Batch karo (ek call, 20 items) — ya agar boundary ka koi faayda nahi, pricing wapas monolith ka module. Lab 63 ex0: har call ~hazaaron guna mehngi.",
        "choiceExplanations": [
          "20 items × ek call = 20 network round trips (ek ke baad ek). Batch karo (ek call, 20 items) — ya agar boundary ka koi faayda nahi, pricing wapas monolith ka module. Lab 63 ex0: har call ~hazaaron guna mehngi.",
          "Server badhane se round trips ki ginti nahi ghatti.",
          "Chhota timeout dheemi calls ko fail karega, kaam tez nahi.",
          "XML JSON se bhaari hai; format se round trips nahi ghat'te."
        ]
      }
    ]
  },
  "success": [
    "Function call vs network call ka farq naap ke bata sakte ho",
    "Har boundary ke saath aane wale kaam gin sakte ho",
    "Modular monolith kya hai bata sakte ho"
  ],
  "cards": [
    {
      "front": "Function call vs network call (lab 63 ex0)?",
      "back": "4–5 ns vs loopback HTTP ~34 µs (keep-alive), ~120 µs (naya connection); + 0.5 ms data center (maana) → ~1.2 lakh guna."
    },
    {
      "front": "Boundary ke saath kya aata hai?",
      "back": "Network timeout, retry + idempotency, versioned API, distributed tracing, service auth, \"hua ya nahi?\" ka shak. Local code ki apni errors aur locks bhi hote hain; network inke upar jodta hai."
    },
    {
      "front": "Modular monolith?",
      "back": "Ek application, ek deploy unit — par modules ki saaf, lagu ki hui seemayein (public interfaces, private internals). Lab mein ek transactional DB, isliye do writes ek local transaction mein."
    }
  ]
}
]);
})();
