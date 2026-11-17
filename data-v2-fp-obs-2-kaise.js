/* First Principles — FAANG Senior Engineer.
   Source credit: Observability — How to Not Fly Blind (jwVEgkBDyM8), numbered video 14/15.
   Evidence: docker-labs/64-observability/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "gw", "icon": "🚪", "label": "Gateway", "x": 140, "y": 210}, {"id": "auth", "icon": "🔑", "label": "Auth", "x": 470, "y": 80}, {"id": "prod", "icon": "🏷️", "label": "Product", "x": 470, "y": 340}, {"id": "db", "icon": "🗄️", "label": "DB", "x": 790, "y": 340}, {"id": "logs", "icon": "📜", "label": "Logs", "x": 790, "y": 80}];
const EDGES = [{"from": "gw", "to": "auth"}, {"from": "gw", "to": "prod"}, {"from": "prod", "to": "db"}];
VISUALS["fp-obs-kaise"] = { t: "Metric batata hai KI, trace batata hai KAHAN, log batata hai KYA — trace_id se jude, parent span id se kram.", html: SD.viz.svg(HERO, EDGES, { nodes: { gw: {tone:'busy',badge:'trace_id'}, auth: {tone:'ok',badge:''}, prod: {tone:'busy',badge:''}, db: {tone:'bad',badge:'~300 ms'}, logs: {tone:'idle',badge:'kram?'} } }, {w:900,h:430}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-obs-kaise",
  "icon": "🔎",
  "group": "🔭 Observability: Andhe Mat Udo",
  "title": "Observability 2 · Kaise — trace ka safar aur signals ki keemat",
  "badge": "Safar Ka Khojee",
  "objectives": [
    "traceparent header aur parent span id se trace ka ped",
    "Logs ko timestamp se sort karne ka khatra",
    "Logs, metrics, traces ki keemat; head vs tail sampling"
  ],
  "lesson": [
    "<h3>📦 Parcel ki tracking</h3><p>Courier ka har godaam parcel ka tracking number scan karta hai. Number se poora safar mil jaata hai. Par har godaam apni ghadi se samay likhta hai — ek godaam ki ghadi aadha ghanta peeche ho toh list mein parcel pahunchne se pehle nikalta dikhega.</p><p>Aur ek godaam scan karna bhool jaaye toh aage ka safar gayab. Aaj chaar services par parcel wali baat dekhte hain: kaun sa signal kya batata hai, kab jhooth bolta hai, aur kitne ka padta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔎 Ek dheemi request ka safar — metric, trace, log",
      "goal": "Lab 64 ex1 (asli HTTP, ek hi machine par, 3 runs): gateway → auth, gateway → product → DB. 200 requests, 4 mein bada catalog; DB ka 300 ms \"join\" ek daala hua sleep. Product ki ghadi 50 ms peeche — maana hua.",
      "nodes": [
        {
          "id": "gw",
          "icon": "🚪",
          "label": "Gateway",
          "x": 140,
          "y": 210
        },
        {
          "id": "auth",
          "icon": "🔑",
          "label": "Auth",
          "x": 470,
          "y": 80
        },
        {
          "id": "prod",
          "icon": "🏷️",
          "label": "Product",
          "x": 470,
          "y": 340
        },
        {
          "id": "db",
          "icon": "🗄️",
          "label": "DB",
          "x": 790,
          "y": 340
        },
        {
          "id": "logs",
          "icon": "📜",
          "label": "Logs",
          "x": 790,
          "y": 80
        }
      ],
      "edges": [
        {
          "from": "gw",
          "to": "auth"
        },
        {
          "from": "gw",
          "to": "prod"
        },
        {
          "from": "prod",
          "to": "db"
        }
      ],
      "viz": {
        "w": 900,
        "h": 430
      },
      "vars": [
        {
          "id": "sig",
          "label": "Signal"
        },
        {
          "id": "shows",
          "label": "Kya dikha"
        },
        {
          "id": "q",
          "label": "Sawaal"
        }
      ],
      "steps": [
        {
          "title": "1. Metric",
          "clock": "metric",
          "say": "Gateway ke 200 requests: p50 4.2 ms, p99 303.5–304.4 ms, 100 ms se upar 4. Metric ne bata diya ki kuch dheema hai.",
          "nodes": {
            "gw": {
              "tone": "bad",
              "badge": "p99 303 ms"
            },
            "auth": {
              "tone": "idle",
              "badge": ""
            },
            "prod": {
              "tone": "idle",
              "badge": ""
            },
            "db": {
              "tone": "idle",
              "badge": ""
            },
            "logs": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "sig": "metric",
            "shows": "4 requests ~300 ms",
            "q": "KI dheema hai"
          }
        },
        {
          "title": "2. Header ka safar",
          "clock": "traceparent",
          "say": "Gateway har request par trace_id (32 hex) aur apna span id (16 hex) banata hai, aur har call mein header bhejta hai: <code>traceparent: 00-&lt;trace_id&gt;-&lt;span id&gt;-01</code> (W3C Trace Context). Product apna naya span id bana kar DB ko bhejta hai.",
          "nodes": {
            "gw": {
              "tone": "busy",
              "badge": "trace_id"
            },
            "auth": {
              "tone": "ok",
              "badge": "parent = gw"
            },
            "prod": {
              "tone": "busy",
              "badge": "parent = gw"
            },
            "db": {
              "tone": "busy",
              "badge": "parent = product"
            },
            "logs": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "sig": "traceparent",
            "shows": "trace_id + parent span id",
            "q": "kaun kiske andar"
          },
          "flows": [
            {
              "from": "gw",
              "to": "auth",
              "label": "traceparent",
              "tone": "busy"
            },
            {
              "from": "gw",
              "to": "prod",
              "label": "traceparent",
              "tone": "busy"
            },
            {
              "from": "prod",
              "to": "db",
              "label": "traceparent",
              "tone": "busy"
            }
          ],
          "ask": {
            "q": "DB ka span product ke andar hai — DB ko kaise pata chala?",
            "choices": [
              "Product ke header mein parent-id = product ka apna span id",
              "DB apni ghadi dekh kar andaaza lagata hai ki pehle kaun aaya",
              "Saari services ek hi trace_id banati hain, toh kram apne aap"
            ],
            "answer": 0,
            "hint": "traceparent ke teesre hisse mein kya hai?",
            "explain": "traceparent = version - trace_id - parent-id - flags. Product DB ko call karte waqt parent-id mein apna span id daalta hai. DB ka span us parent-id ko yaad rakhta hai. Saare spans parent-id se ek ped (tree) bante hain — \"kaun kiske andar\" ka rishta ghadi ke bina pata chalta hai. (Bhai-behan spans pehle-baad chale ya saath — parent-id is baare mein kuch nahi batata.)",
            "choiceExplanations": [
              "traceparent = version - trace_id - parent-id - flags. Product DB ko call karte waqt parent-id mein apna span id daalta hai. DB ka span us parent-id ko yaad rakhta hai. Saare spans parent-id se ek ped (tree) bante hain — \"kaun kiske andar\" ka rishta ghadi ke bina pata chalta hai. (Bhai-behan spans pehle-baad chale ya saath — parent-id is baare mein kuch nahi batata.)",
              "Ghadi par kram bharosemand nahi (agla step).",
              "trace_id sirf gateway banata hai; baaki services header se padhti hain. Rishta parent-id se aata hai."
            ]
          }
        },
        {
          "title": "3. Trace",
          "clock": "trace",
          "say": "Sabse dheemi request ka ped: gateway 304.7 ms → auth 2.5 ms, product 301.1 ms → DB 300.5 ms. Waqt DB mein gaya. Har span ki duration ek hi machine ki ghadi se naapi gayi, isliye ghadi ka farq duration nahi bigaadta.",
          "nodes": {
            "gw": {
              "tone": "busy",
              "badge": "304.7 ms"
            },
            "auth": {
              "tone": "ok",
              "badge": "2.5 ms"
            },
            "prod": {
              "tone": "busy",
              "badge": "301.1 ms"
            },
            "db": {
              "tone": "bad",
              "badge": "300.5 ms"
            },
            "logs": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "sig": "trace",
            "shows": "DB 300.5 ms",
            "q": "KAHAN dheema"
          },
          "flows": [
            {
              "from": "prod",
              "to": "db",
              "label": "300 ms",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "4. Logs, timestamp se sort",
          "clock": "logs",
          "say": "Sabse dheemi request ke trace_id wale logs, timestamp se sort (video ka tareeka): product ka \"price dhoondh raha\" −47 ms par — gateway ke \"request aaya\" (0 ms) se pehle. Product ka \"price mila\" 254 ms par, DB ke \"query khatam\" (304 ms) se pehle — asambhav kram.",
          "nodes": {
            "gw": {
              "tone": "ok",
              "badge": "0 ms"
            },
            "auth": {
              "tone": "ok",
              "badge": "2 ms"
            },
            "prod": {
              "tone": "bad",
              "badge": "−47 ms"
            },
            "db": {
              "tone": "ok",
              "badge": "304 ms"
            },
            "logs": {
              "tone": "bad",
              "badge": "kram galat"
            }
          },
          "vars": {
            "sig": "logs",
            "shows": "kram ulta",
            "q": "KYA hua (detail)"
          },
          "ask": {
            "q": "Logs kehte hain product ne DB ka jawab aane se 50 ms pehle price paa liya. Asli wajah?",
            "choices": [
              "Product machine ki ghadi 50 ms peeche hai; alag ghadiyon ka kram galat",
              "Product ne cache se price diya, DB call bekaar mein chali",
              "DB ne jawab pehle bhej diya aur \"query khatam\" baad mein likha"
            ],
            "answer": 0,
            "hint": "Teen alag services, teen alag ghadiyan. Lab mein kya maana gaya tha?",
            "explain": "Lab ne product ki ghadi 50 ms peeche maani. Har log apni machine ki ghadi se samay likhta hai, toh alag machines ke logs ko timestamp se sort karna jhooth bol sakta hai. trace_id se sahi logs mil jaate hain; kaun kiske andar chala, parent span id batata hai. Alag machines ke timestamps ko sort karke poori timeline mat banao.",
            "choiceExplanations": [
              "Lab ne product ki ghadi 50 ms peeche maani. Har log apni machine ki ghadi se samay likhta hai, toh alag machines ke logs ko timestamp se sort karna jhooth bol sakta hai. trace_id se sahi logs mil jaate hain; kaun kiske andar chala, parent span id batata hai. Alag machines ke timestamps ko sort karke poori timeline mat banao.",
              "Trace mein product ke andar DB ka ~300 ms span hai — DB call hui.",
              "DB ka \"query khatam\" jawab bhejne se pehle likha jaata hai (lab ka code)."
            ]
          }
        },
        {
          "title": "5. Header gira",
          "clock": "dropped",
          "say": "Ab product traceparent aage nahi bhejta (ek bhooli hui line). Trace product ke ~300 ms par ruk jaata hai; DB ke 200 spans apne alag, akele traces mein.",
          "nodes": {
            "gw": {
              "tone": "busy",
              "badge": ""
            },
            "auth": {
              "tone": "ok",
              "badge": ""
            },
            "prod": {
              "tone": "bad",
              "badge": "~300 ms, andar?"
            },
            "db": {
              "tone": "busy",
              "badge": "akela trace"
            },
            "logs": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "sig": "trace (toota)",
            "shows": "product ke andar khaali",
            "q": "KAHAN — jawab gayab"
          },
          "ask": {
            "q": "Trace mein product ~300 ms dikhata hai par andar kuch nahi. Sabse sahi ilaaj?",
            "choices": [
              "Har hop par OpenTelemetry jaisi library se header aage bhejo",
              "Service mesh laga do — proxy apne aap app ke headers jod dega",
              "Har service ko alag trace_id banane do, baad mein time se jodo"
            ],
            "answer": 0,
            "hint": "Trace kab poora hota hai?",
            "explain": "Trace utna hi poora jitna har hop par header aage jaata hai. OpenTelemetry jaisi library aane wale header ko padh kar jaane wali calls mein apne aap daalti hai. Istio ke docs bhi kehte hain: proxies spans bhej sakte hain, par spans ko ek trace mein jodne ke liye app ko headers aage bhejne padte hain.",
            "choiceExplanations": [
              "Trace utna hi poora jitna har hop par header aage jaata hai. OpenTelemetry jaisi library aane wale header ko padh kar jaane wali calls mein apne aap daalti hai. Istio ke docs bhi kehte hain: proxies spans bhej sakte hain, par spans ko ek trace mein jodne ke liye app ko headers aage bhejne padte hain.",
              "Istio docs: proxies spans bhej sakte hain, par app ko headers aage bhejne padte hain.",
              "Time se jodna step 4 wali galti hai."
            ]
          }
        }
      ],
      "lesson": "Metric batata hai KI, trace batata hai KAHAN, log batata hai KYA. Teenon trace_id se jude. Kaun kiske andar chala, parent span id batata hai — alag machines ke timestamps sort karke timeline nahi banti; aur ek bhi service header na bheje toh trace toot-ta hai."
    },
    {
      "type": "cards",
      "title": "💰 Teen signals, teen keematein",
      "goal": "Lab 64 ex2 (hisaab, maane hue numbers ke saath; sampling ek seeded model): har signal ka kharcha kahan se aata hai.",
      "lesson": "Metric sasta jab tak labels gine-chune hain. Logs aur traces ka kharcha bytes/event × events × sampling × kitne din rakho se banta hai — har request ki kahani mehngi padti hai. Tail sampling poore, samay par aaye traces mein se errors chun sakta hai, par collector par bojh daalta hai.",
      "steps": [
        {
          "title": "1. Logs vs metrics",
          "say": "10 lakh requests/minute (video ka \"millions per minute\"), ~1 KB logs har request (maana): 1.44 TB/din. Metrics: kul 300 series × har 15 s ek sample × ~2 byte = 3.5 MB/din — sirf samples ka compressed disk (Prometheus docs: 1–2 byte/sample); index, WAL aur RAM mein chalti series alag. In maanyataon par ~4 lakh× farq (logs ka compression nahi joda)."
        },
        {
          "title": "2. Label ka visfot",
          "say": "Har label-combination ek alag series. <code>http_requests_total{method, route, status}</code> → 300 tak. <code>user_id</code> (10 lakh users) jodo → 30 crore tak. Prometheus docs: user ID, email jaise anginat values label mein mat daalo.",
          "ask": {
            "q": "PM chahta hai \"har user ki error rate\" ka graph, aur dev <code>user_id</code> label jodne wala hai. Behtar raasta?",
            "choices": [
              "Metric gine-chune labels par rakho; user-level sawaal logs/traces se",
              "user_id label jodo — metric hamesha sasta hota hai, chinta nahi",
              "Har user ke liye alag Prometheus server chalao taaki load bante"
            ],
            "answer": 0,
            "hint": "Label values kitni hain, aur har value ka kya banta hai?",
            "explain": "10 lakh user_id = har route/status ke saath alag series — 30 crore tak. Metric ka sasta hona gine-chune labels par tika hai. \"Kis user ka kya hua\" logs ya traces ka sawaal hai (trace_id/user_id ke saath structured logs).",
            "choiceExplanations": [
              "10 lakh user_id = har route/status ke saath alag series — 30 crore tak. Metric ka sasta hona gine-chune labels par tika hai. \"Kis user ka kya hua\" logs ya traces ka sawaal hai (trace_id/user_id ke saath structured logs).",
              "Metric tabhi sasta jab label values gine-chune hon.",
              "Server baantne se series ki ginti nahi ghatti."
            ]
          }
        },
        {
          "title": "3. Head vs tail sampling",
          "say": "1,00,000 traces, 0.1% error, 1% dheemi (seeded model). Head sampling (shuru mein 1% sikka): ~1,000 rakhe, errors 0–1 (~100 mein se). Tail sampling (khatam hone par: saare error + dheeme + baaki ka 1%): 2,126 rakhe, saare 108 errors — model mein har trace poora aur samay par pahunchta hai.",
          "ask": {
            "q": "Team 1% head sampling karti hai; production error ka trace kabhi nahi milta. Kya badloge?",
            "choices": [
              "Tail sampling: errors/dheeme chuno; ek trace ek collector par bhejo",
              "Sampling 1% se 2% karo — ab errors ke traces pakke mil jaayenge",
              "Sampling band karke sirf average latency ka metric rakh lo"
            ],
            "answer": 0,
            "hint": "Head sampling ka faisla kab hota hai — error pata chalne se pehle ya baad?",
            "explain": "Head sampling request ke shuru mein sikka uchhaalta hai, jab error ka pata hi nahi. Tail sampling trace khatam hone ke baad dekhta hai, toh faisle se pehle poore pahunche traces mein se errors chun sakta hai (der se aaya error span purana faisla nahi badalta; upstream head sampling ke phenke traces wapas nahi aate). Keemat: faisle se pehle saare spans bhejne padte hain, ek trace ke saare spans ek hi collector tak aane chahiye, aur collector faisle tak (OpenTelemetry default 30 s) spans memory mein rakhta hai.",
            "choiceExplanations": [
              "Head sampling request ke shuru mein sikka uchhaalta hai, jab error ka pata hi nahi. Tail sampling trace khatam hone ke baad dekhta hai, toh faisle se pehle poore pahunche traces mein se errors chun sakta hai (der se aaya error span purana faisla nahi badalta; upstream head sampling ke phenke traces wapas nahi aate). Keemat: faisle se pehle saare spans bhejne padte hain, ek trace ke saare spans ek hi collector tak aane chahiye, aur collector faisle tak (OpenTelemetry default 30 s) spans memory mein rakhta hai.",
              "2% par bhi ~98% error traces phenke jaayenge.",
              "Average latency se kisi ek error ka trace nahi milta."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Trace ka safar aur signals ki keemat",
      "project": "64-observability",
      "exercise": "ex1-trace",
      "goal": "Chaar asli HTTP services par metric → trace → logs; phir har signal ka kharcha.",
      "why": "Node 24+ chahiye. ex1 apne process mein 127.0.0.1 ke random ports par chaar servers chalata hai (bahar kuch publish nahi); timings machine ke saath thoda badlenge. ex2 seedha hisaab aur seeded model.",
      "steps": [
        {
          "text": "Metric → trace → logs, aur header gira.",
          "cmd": "cd docker-labs/64-observability && npm start -- ex1-trace",
          "expect": "ex1 — \"waqt kahan gaya?\" (asli HTTP, ek hi machine par; db ka 300 ms join ek daala hua sleep; product ki ghadi 50 ms peeche — maana hua)\n\n1) Metric (gateway, 200 requests):\n   average 10.4 ms · p50 4.2 ms · p99 303.5 ms · max 304.7 ms · 100 ms se upar: 4\n   → metric batata hai KI kuch dheema hai. Kahan dheema, metric nahi batata.\n\n2) Sabse dheema request ka trace (trace_id 63af1b3f…), parent span id se joda:\n   gateway  /checkout   304.7 ms\n     auth     /check        2.5 ms\n     product  /price      301.1 ms\n       db       /query      300.5 ms\n   → waqt db mein gaya. Har span ki duration span wali machine ki ghadi se naapi, isliye ghadi ka farq duration nahi bigaadta.\n\n3) Sabse dheeme request ke trace_id wale logs, timestamp se sort (jaisa video kehta hai):\n     -47 ms  product  price dhoondh raha\n       0 ms  gateway  request aaya: big-7\n       3 ms  auth     token theek\n       3 ms  db       join shuru: big-7 (bada catalog)\n     254 ms  product  price mila\n     304 ms  db       query khatam\n     305 ms  gateway  jawab bheja\n   → \"price dhoondh raha\" gateway ke \"request aaya\" se PEHLE dikh raha hai: product ki ghadi 50 ms peeche hai.\n     \"price mila\" bhi db ke \"query khatam\" se pehle — asambhav. trace_id se logs mil jaate hain, par alag machines\n     ke timestamps ka kram bharosemand nahi. Kaun kiske andar chala, parent span id batata hai.\n\n4) Ab product traceparent header aage nahi bhejta (ek bhooli hui line):\n   gateway  /checkout   304.3 ms\n     auth     /check        2.2 ms\n     product  /price      301.5 ms\n   → product ke 300 ms ke andar kya hua, trace mein nahi. db ke 200 spans apne alag, akele traces mein chale gaye.\n     Trace utna hi poora jitna har hop par header aage jaata hai. OpenTelemetry jaisi library header apne aap aage bhejti hai;\n     service mesh (jaise Istio) mein bhi app ko header aage bhejna padta hai."
        },
        {
          "text": "Har signal ki keemat.",
          "cmd": "npm start -- ex2-cost",
          "expect": "ex2 — kaunsa signal kitna mehenga (hisaab, maane hue numbers ke saath; sampling ek seeded model)\n\n1) Ek din ka data — 10 lakh requests/minute (video ka \"millions per minute\"), har request ke logs ~1 KB (maana):\n   logs:    1.44 TB/din  (30 din rakho toh 43.2 TB)\n   metrics: kul 300 series × har 15 s ek sample × ~2 byte (Prometheus docs: disk par compressed 1–2 byte/sample) = 3.5 MB/din\n            (sirf samples ka disk; index, WAL aur RAM mein chalti series ka hisaab alag — RAM ka kharcha series ki ginti se badhta hai)\n   → in maanyataon par ~4 lakh× ka farq (logs ka compression nahi joda; 10× dabaane par bhi ~42 hazaar×).\n     Video ka \"saalon ke metrics memory mein\" — disk par sasta, RAM ka kharcha active series par tika.\n     Metric sasta isliye ki metric ginti hai, kahani nahi.\n\n2) Metric tab tak sasta jab tak labels ki ginti chhoti hai (har label-combination = ek alag series):\n   http_requests_total{method, route, status}            → zyada se zyada 300 series\n   + user_id label (10 lakh users)                        → zyada se zyada 30,00,00,000 series (30 crore)\n   → \"metric sasta hai\" tabhi tak sach hai. Prometheus docs: user ID jaise anginat values label mein mat daalo.\n     \"Kis user ka fail hua\" — sawaal logs/traces ka hai.\n\n3) Traces: 1,00,000 requests, 0.1% error, 1% dheemi; dono ka sikka 1% (seeded model):\n   tareeka                                    rakhe     errors rakhe     dheemi rakhe\n   sab                                        1,00,000            108          1,006\n   head (shuru mein sikka uchhaalo, 1%)          1,027              0             12\n   tail (khatam hone par: saare error/dheeme     2,126            108          1,006\n         + baaki ka 1%)\n   head, 3 aur seeds par (errors rakhe / kul errors): 1 / 97 · 1 / 94 · 0 / 115\n   → head sampling sasta hai par talaash wali request (error, dheemi) aksar phenk deta hai.\n     Tail sampling (is aadarsh model mein) har error rakhta hai — shart: poora trace samay par collector tak pahunche;\n     der se aaya error span pehle liye faisle ko nahi badal sakta. Faisle se pehle saare spans bhejne aur rakhne ka kharcha bhi lagta hai.\n     Keemat: ek trace ke saare spans ek hi collector tak aane chahiye, aur collector faisle tak (OpenTelemetry default 30 s)\n     poora trace memory mein rakhta hai."
        }
      ],
      "observe": {
        "q": "Trace mein DB ka span ~300 ms, aur logs mein product ka \"price mila\" DB ke \"query khatam\" se pehle. Kis par bharosa karoge?",
        "choices": [
          "Trace ke ped aur durations par; logs ka kram ghadi par tika hai",
          "Logs par — logs har line likhte hain, trace sirf andaaza hai",
          "Kisi par nahi — dono alag baat kehte hain, toh dono galat"
        ],
        "answer": 0,
        "hint": "Kaunsi cheez ek machine ki ghadi par tiki, kaunsi alag machines ki?",
        "explain": "Span ki duration ek machine ki ghadi se naapi jaati hai, aur ped parent span id se banta hai — dono ghadi ke farq se nahi bigadte. Logs ka kram alag machines ke timestamps se aata hai; product ki ghadi 50 ms peeche thi. Logs ki detail kaam ki, kram nahi.",
        "choiceExplanations": [
          "Span ki duration ek machine ki ghadi se naapi jaati hai, aur ped parent span id se banta hai — dono ghadi ke farq se nahi bigadte. Logs ka kram alag machines ke timestamps se aata hai; product ki ghadi 50 ms peeche thi. Logs ki detail kaam ki, kram nahi.",
          "Trace bhi naap hai (asli HTTP), andaaza nahi.",
          "Dono sach bol rahe hain — sirf logs ka kram ghadi ki wajah se ulta."
        ]
      },
      "lesson": "Trace_id logs ko jodta hai, parent span id kram deta hai, sampling kharcha sambhaalta hai. Signal ki keemat label values aur kahani ki lambai se aati hai."
    }
  ],
  "interview": {
    "title": "Interview Round — trace aur signals",
    "instructions": "Pehle socho: kaunsa signal kaunsa sawaal jawab deta hai, aur kis ghadi ya kis sampling par tika hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Incident mein logs (timestamp se sort) dikhate hain ki payment service ne bank ka jawab aane se 80 ms pehle \"success\" likh diya. Junior: \"bug hai, bina jawab ke success!\" Tumhara pehla kadam?",
        "choices": [
          "Trace ka ped aur durations dekho; machines ki ghadi ka farq jaancho",
          "Payment service turant rollback karo — bina jawab ke success bug hai",
          "Bank ke logs mangwao aur dono ke timestamps ko average kar do",
          "Logs ka timezone UTC karo, kram apne aap theek ho jaayega"
        ],
        "answer": 0,
        "explain": "Alag machines ke timestamps ka kram ghadi ke farq se ulta ho sakta hai (lab ex1: product 50 ms peeche → \"price mila\" DB se pehle). Trace ka ped (parent span id) batata hai bank call payment ke andar thi ya nahi, aur durations ek machine ki ghadi se hain. Pehle saboot, phir rollback.",
        "choiceExplanations": [
          "Alag machines ke timestamps ka kram ghadi ke farq se ulta ho sakta hai (lab ex1: product 50 ms peeche → \"price mila\" DB se pehle). Trace ka ped (parent span id) batata hai bank call payment ke andar thi ya nahi, aur durations ek machine ki ghadi se hain. Pehle saboot, phir rollback.",
          "Rollback se pehle jaancho ki kram asli hai ya ghadi ka.",
          "Do galat ghadiyon ka average sahi ghadi nahi banta.",
          "Timezone sabka same ho tab bhi ghadi milliseconds mein khisak sakti hai."
        ]
      },
      {
        "q": "Naya service team ne OpenTelemetry ke bina likha; service ki HTTP calls mein traceparent header nahi jaata. Traces par asar?",
        "choices": [
          "Aage ke spans alag traces mein; dheemapan dikhega, jad nahi",
          "Koi asar nahi — trace_id gateway ne bana diya, toh sab jud jaayega",
          "Saare traces gayab ho jaayenge, gateway ka span bhi nahi dikhega",
          "Sirf logs par asar, traces apne aap ghadi se jud jaayenge"
        ],
        "answer": 0,
        "explain": "Trace utna hi poora jitna har hop par header aage jaata hai. Lab ex1: product header na bheje → product ~300 ms dikhta hai par andar kuch nahi; DB ke 200 spans akele traces mein. Gateway aur product ke spans phir bhi dikhte hain.",
        "choiceExplanations": [
          "Trace utna hi poora jitna har hop par header aage jaata hai. Lab ex1: product header na bheje → product ~300 ms dikhta hai par andar kuch nahi; DB ke 200 spans akele traces mein. Gateway aur product ke spans phir bhi dikhte hain.",
          "trace_id har hop par header se aage jaata hai; ek hop chhoota toh aage nahi.",
          "Pehle ke spans (gateway, product) bane rehte hain.",
          "Traces ghadi se nahi judte; parent span id se judte hain."
        ]
      }
    ]
  },
  "success": [
    "traceparent ke hisse aur parent span id ka kaam bata sakte ho",
    "Logs ke kram par kab bharosa na karein bata sakte ho",
    "Logs/metrics/traces ki keemat aur head vs tail sampling samjha sakte ho"
  ],
  "cards": [
    {
      "front": "traceparent header?",
      "back": "00-&lt;trace_id 32 hex&gt;-&lt;parent span id 16 hex&gt;-&lt;flags&gt; (W3C Trace Context). Har hop par aage bhejo; parent id se \"kaun kiske andar\" ka ped banta hai."
    },
    {
      "front": "Logs timestamp se sort — khatra (lab 64 ex1)?",
      "back": "Alag machines ki ghadiyan. Product 50 ms peeche → \"price mila\" DB ke \"query khatam\" se pehle dikha. Rishta trace ke ped se lo; alag machines ke timestamps se timeline mat banao."
    },
    {
      "front": "Head vs tail sampling (1%)?",
      "back": "Lab ka seeded model: head (shuru mein sikka) ~100 errors mein se 0–1 bache; tail (khatam hone par) saare — jab trace poora aur samay par aaye. Keemat: ek collector, spans memory mein (default 30 s), pehle saare spans bhejna."
    }
  ]
}
]);
})();
