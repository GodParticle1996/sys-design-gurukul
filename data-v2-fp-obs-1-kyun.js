/* First Principles — FAANG Senior Engineer.
   Source credit: Observability — How to Not Fly Blind (jwVEgkBDyM8), numbered video 14/15.
   Evidence: docker-labs/64-observability/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "req", "icon": "👥", "label": "100 requests", "x": 150, "y": 220}, {"id": "avg", "icon": "📊", "label": "Average", "x": 560, "y": 55}, {"id": "p50", "icon": "📍", "label": "p50", "x": 560, "y": 165}, {"id": "p99", "icon": "📈", "label": "p99", "x": 560, "y": 275}, {"id": "max", "icon": "🚨", "label": "Max", "x": 560, "y": 385}];
const EDGES = [{"from": "req", "to": "avg"}, {"from": "req", "to": "p50"}, {"from": "req", "to": "p99"}, {"from": "req", "to": "max"}];
VISUALS["fp-obs-kyun"] = { t: "Ek dashboard, chaar number: average failaav chhupata hai, p99 ek seema hai, max ek user ka dard.", html: SD.viz.svg(HERO, EDGES, { nodes: { req: {tone:'busy',badge:'100'}, avg: {tone:'ok',badge:'109.9 ms'}, p50: {tone:'ok',badge:'10 ms'}, p99: {tone:'ok',badge:'10 ms'}, max: {tone:'bad',badge:'10 s'} } }, {w:900,h:470}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-obs-kyun",
  "icon": "📊",
  "group": "🔭 Observability: Andhe Mat Udo",
  "title": "Observability 1 · Kyun — average ka jhooth",
  "badge": "Failaav Ka Paarkhi",
  "objectives": [
    "Average, p50, p99, max — har number kya chhupata hai",
    "Percentile requests ka, user ka nahi",
    "Hosts ke p99 ka average kyun galat"
  ],
  "lesson": [
    "<h3>🍛 Dhaabe ka average</h3><p>Ek dhaabe par 100 grahak aaye. 99 ko 10 minute mein khana mila. Ek ko 2 ghante intezaar karaya. Maalik ka register kehta hai: \"average 11 minute — badhiya!\"</p><p>Do ghante wala grahak dobara nahi aayega, aur apne doston ko bhi bata dega. Register ka ek number poori kahani nahi batata. Aaj dekhte hain ki dashboard ke number kya dikhate hain aur kya chhupaate hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📊 100 requests, ek dashboard — kya dikha, kya chhupa?",
      "goal": "Video ka misaal (lab 64 ex0, seedha hisaab): 100 requests — 99 requests 10 ms mein, 1 request 10 s mein. Dashboard ke chaar number dekho.",
      "nodes": [
        {
          "id": "req",
          "icon": "👥",
          "label": "100 requests",
          "x": 150,
          "y": 220
        },
        {
          "id": "avg",
          "icon": "📊",
          "label": "Average",
          "x": 560,
          "y": 55
        },
        {
          "id": "p50",
          "icon": "📍",
          "label": "p50",
          "x": 560,
          "y": 165
        },
        {
          "id": "p99",
          "icon": "📈",
          "label": "p99",
          "x": 560,
          "y": 275
        },
        {
          "id": "max",
          "icon": "🚨",
          "label": "Max",
          "x": 560,
          "y": 385
        }
      ],
      "edges": [
        {
          "from": "req",
          "to": "avg"
        },
        {
          "from": "req",
          "to": "p50"
        },
        {
          "from": "req",
          "to": "p99"
        },
        {
          "from": "req",
          "to": "max"
        }
      ],
      "viz": {
        "w": 900,
        "h": 470
      },
      "vars": [
        {
          "id": "num",
          "label": "Number"
        },
        {
          "id": "val",
          "label": "Value"
        },
        {
          "id": "says",
          "label": "Kya kehta"
        }
      ],
      "steps": [
        {
          "title": "Average",
          "clock": "average",
          "say": "99 × 10 ms + 1 × 10,000 ms = 10,990 ms; ÷ 100 = 109.9 ms. Dashboard hara: \"110 ms, theek hai\".",
          "nodes": {
            "req": {
              "tone": "busy",
              "badge": ""
            },
            "avg": {
              "tone": "ok",
              "badge": "109.9 ms"
            },
            "p50": {
              "tone": "idle",
              "badge": ""
            },
            "p99": {
              "tone": "idle",
              "badge": ""
            },
            "max": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "num": "average",
            "val": "109.9 ms",
            "says": "\"sab theek\""
          },
          "flows": [
            {
              "from": "req",
              "to": "avg",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "p50 (median)",
          "clock": "p50",
          "say": "Requests ko chhote se bade tak lagao; beech wala 10 ms. Aadhe requests 10 ms ya kam.",
          "nodes": {
            "req": {
              "tone": "busy",
              "badge": ""
            },
            "avg": {
              "tone": "ok",
              "badge": ""
            },
            "p50": {
              "tone": "ok",
              "badge": "10 ms"
            },
            "p99": {
              "tone": "idle",
              "badge": ""
            },
            "max": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "num": "p50",
            "val": "10 ms",
            "says": "aam request"
          },
          "flows": [
            {
              "from": "req",
              "to": "p50",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "p99 — pehli definition",
          "clock": "p99",
          "say": "Nearest-rank p99: 99wi jagah wali value = 10 ms. Dheema request 100wi jagah par hai — p99 ke upar.",
          "nodes": {
            "req": {
              "tone": "busy",
              "badge": ""
            },
            "avg": {
              "tone": "ok",
              "badge": ""
            },
            "p50": {
              "tone": "ok",
              "badge": ""
            },
            "p99": {
              "tone": "ok",
              "badge": "10 ms"
            },
            "max": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "num": "p99 (nearest-rank)",
            "val": "10 ms",
            "says": "kuch nahi dikha"
          },
          "flows": [
            {
              "from": "req",
              "to": "p99",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "p99 = 10 ms, phir bhi ek request 10 s ki. Dono kaise sach?",
            "choices": [
              "Theek 1% dheeme hon toh dheemi request p99 ki seema ke upar baithti hai",
              "Galti hai — p99 hamesha sabse dheemi request ki value hoti hai",
              "Dashboard ne dheemi request ko gin hi nahi, isliye 10 ms dikha"
            ],
            "answer": 0,
            "hint": "p99 ek seema hai: 99% requests is value tak. Baaki 1% kahan?",
            "explain": "100 mein se 99 requests 10 ms tak, toh 99% wali seema 10 ms. Akeli dheemi request \"sabse bure 1%\" mein hai — seema ke upar. p99 sabse bure 1% ki shuruaat batata hai, sabse bure 1% ka haal nahi. Isliye max (ya p99.9) aur dheemi requests ki ginti bhi dekho.",
            "choiceExplanations": [
              "100 mein se 99 requests 10 ms tak, toh 99% wali seema 10 ms. Akeli dheemi request \"sabse bure 1%\" mein hai — seema ke upar. p99 sabse bure 1% ki shuruaat batata hai, sabse bure 1% ka haal nahi. Isliye max (ya p99.9) aur dheemi requests ki ginti bhi dekho.",
              "Sabse dheemi request ki value max hai, p99 nahi.",
              "Request gini gayi; average 109.9 ms 10 s wali request ko jodkar hi bana."
            ]
          }
        },
        {
          "title": "p99 — doosri definition",
          "clock": "linear",
          "say": "Kai tools 99wi aur 100wi jagah ke beech line kheench kar p99 nikaalte hain (linear): 10 ms se 10 s ka 1% raasta = 109.9 ms. Same data, tool badla, number badla. Dhyan: nearest-rank p99 tabhi dheemi value deta hai jab 100 mein kam se kam 2 dheemi hon. Isiliye course ke Flow <code>latency</code> level ka example 98 tez aur 2 dheemi requests leta hai.",
          "nodes": {
            "req": {
              "tone": "busy",
              "badge": ""
            },
            "avg": {
              "tone": "ok",
              "badge": ""
            },
            "p50": {
              "tone": "ok",
              "badge": ""
            },
            "p99": {
              "tone": "busy",
              "badge": "109.9 ms"
            },
            "max": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "num": "p99 (linear)",
            "val": "109.9 ms",
            "says": "tool par tika"
          }
        },
        {
          "title": "Max",
          "clock": "max",
          "say": "Sabse dheemi request: 10 s. Ek user ke liye app tooti hui. Do dheeme requests hon toh p99 bhi 10 s (lab ex0).",
          "nodes": {
            "req": {
              "tone": "busy",
              "badge": ""
            },
            "avg": {
              "tone": "ok",
              "badge": ""
            },
            "p50": {
              "tone": "ok",
              "badge": ""
            },
            "p99": {
              "tone": "busy",
              "badge": ""
            },
            "max": {
              "tone": "bad",
              "badge": "10 s"
            }
          },
          "vars": {
            "num": "max",
            "val": "10 s",
            "says": "ek user ka dard"
          },
          "flows": [
            {
              "from": "req",
              "to": "max",
              "label": "",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Video kehta hai \"average almost useless, p99 dekho\". Lab ke baad sabse sahi baat?",
            "choices": [
              "Percentile ke saath max/p99.9 aur dheemi requests ki ginti bhi dekho",
              "Sirf p99 kaafi hai — p99 hamesha sabse bura haal dikhata hai",
              "Average hi kaafi hai — 109.9 ms ne 10 s wala request pakad liya"
            ],
            "answer": 0,
            "hint": "Is misaal mein p99 ne 10 s wali request dikhayi?",
            "explain": "Average ne kuch dikhaya (110 ms 10 ms se bada), par kya hua nahi bataya. Nearest-rank p99 ne kuch nahi dikhaya. Max ne dikhaya. Average poori tarah bekaar bhi nahi — capacity ke hisaab mein kaam aata hai. Dard dekhne ke liye poora failaav dekho: p50, p99, p99.9/max, aur kitni requests seema se upar.",
            "choiceExplanations": [
              "Average ne kuch dikhaya (110 ms 10 ms se bada), par kya hua nahi bataya. Nearest-rank p99 ne kuch nahi dikhaya. Max ne dikhaya. Average poori tarah bekaar bhi nahi — capacity ke hisaab mein kaam aata hai. Dard dekhne ke liye poora failaav dekho: p50, p99, p99.9/max, aur kitni requests seema se upar.",
              "Nearest-rank p99 is misaal mein 10 ms tha.",
              "Average ne 10 s ko 110 ms bana diya — dard chhup gaya."
            ]
          }
        }
      ],
      "lesson": "Average failaav ko ek number mein mila deta hai. Percentile ek seema hai, aur tool ki definition par tika hai. Dard dekhne ke liye p50, p99, p99.9/max aur seema se upar ki ginti saath dekho."
    },
    {
      "type": "cards",
      "title": "👤 Request nahi, user — aur dashboard ka jod",
      "goal": "Lab 64 ex0 (hisaab + seeded model): percentile requests ka hota hai, user kai requests karta hai, aur dashboard aksar hosts ke numbers jodta hai.",
      "lesson": "User ka anubhav user ke saare requests ka jod hai. Hosts ke p99 ka average koi percentile nahi; histogram ke buckets jodkar global percentile nikaalo.",
      "steps": [
        {
          "title": "1. Ek user, kai requests",
          "say": "Har request 1% chance se dheemi (aazaad, maana hua). Ek page = 20 requests → 18.2% users ko kam se kam ek dheemi. Ek session = 100 requests → 63.4%. Video: \"P99 = sabse bure 1% users\" — asal mein sabse bure 1% <b>requests</b>.",
          "ask": {
            "q": "Har API call aazaad roop se 1% chance se 2 s se zyada leti hai. Ek page load 50 calls karta hai. Kitne page loads mein kam se kam ek call 2 s se zyada?",
            "choices": [
              "Lagbhag 40% (1 − 0.99⁵⁰ ≈ 39.5%) page loads mein",
              "Sirf 1% — har call ka chance 1% hai, toh page ka bhi 1%",
              "Theek 50% — 50 calls × 1% = 50% page loads mein"
            ],
            "answer": 0,
            "hint": "Ek call dheemi na ho: 0.99. Pachaas calls mein koi dheemi na ho?",
            "explain": "0.99⁵⁰ ≈ 0.605, toh 1 − 0.605 ≈ 39.5% page loads kam se kam ek dheemi call se takraate hain. Fan-out wali baat (lab 63 ex1) user ke page par bhi lagti hai. Dhyan: \"p99 = 2 s\" jaanne se tay nahi hota ki theek 1% calls 2 s se zyada lengi (barabar values ho sakti hain) — isliye sawaal 1% ka chance seedha deta hai. Calls ka dheemapan juda ho (ek saanjha jhatka) toh number alag hoga.",
            "choiceExplanations": [
              "0.99⁵⁰ ≈ 0.605, toh 1 − 0.605 ≈ 39.5% page loads kam se kam ek dheemi call se takraate hain. Fan-out wali baat (lab 63 ex1) user ke page par bhi lagti hai. Dhyan: \"p99 = 2 s\" jaanne se tay nahi hota ki theek 1% calls 2 s se zyada lengi (barabar values ho sakti hain) — isliye sawaal 1% ka chance seedha deta hai. Calls ka dheemapan juda ho (ek saanjha jhatka) toh number alag hoga.",
              "1% ek call ka hai; 50 calls mein chance badhta hai.",
              "Chance 50 × 1% = 50% jaisa seedha nahi judta; 1 − 0.99⁵⁰ ≈ 39.5%."
            ]
          }
        },
        {
          "title": "2. p99 ka average — dashboard ka jhooth",
          "say": "Teen hosts (seeded model, 10,000 requests). Chhota host bimar: host p99 24 / 26 / 875 ms → average 308 ms, asli p99 26 ms (11.8× zyada). Bada host bimar: 301 / 24 / 25 ms → average 116 ms, asli p99 299 ms (2.6× kam).",
          "ask": {
            "q": "Dashboard \"har host ka p99, phir average\" dikhata hai. Global p99 sahi kaise nikle?",
            "choices": [
              "Har host ke histogram buckets jodo, phir jode hue histogram se p99",
              "Hosts ke p99 ka average theek hai, bas hosts ki ginti badhao",
              "Sabse bade host ka p99 lo; chhote hosts ka asar nahi padta"
            ],
            "answer": 0,
            "hint": "Kaunsi cheez seedhe jud sakti hai — percentile ya ginti?",
            "explain": "Bucket ki ginti judti hai (host A ke 10–25 ms wale + host B ke 10–25 ms wale). Jode hue histogram se p99 nikalta hai — shart: sab hosts ke bucket same seemaon, same unit aur same samay ke hon. Jawab finite bucket ke andar bucket ki chaudai jitna sahi (lab: asli 26.0 ms, histogram 33.9 ms, bucket 25–50); sabse upar (+Inf) bucket mein gire toh sirf aakhri seema milti hai — bada aakhri bucket rakho. Percentiles ka average koi percentile nahi; ek case mein 11.8× zyada, doosre mein 2.6× kam.",
            "choiceExplanations": [
              "Bucket ki ginti judti hai (host A ke 10–25 ms wale + host B ke 10–25 ms wale). Jode hue histogram se p99 nikalta hai — shart: sab hosts ke bucket same seemaon, same unit aur same samay ke hon. Jawab finite bucket ke andar bucket ki chaudai jitna sahi (lab: asli 26.0 ms, histogram 33.9 ms, bucket 25–50); sabse upar (+Inf) bucket mein gire toh sirf aakhri seema milti hai — bada aakhri bucket rakho. Percentiles ka average koi percentile nahi; ek case mein 11.8× zyada, doosre mein 2.6× kam.",
              "Hosts badhane se galti nahi jaati; requests ki ginti ka wazan gayab hai.",
              "Lab ke pehle case mein chhota host hi bimar tha — 875 ms."
            ]
          }
        },
        {
          "title": "3. Monitoring vs observability",
          "say": "Video: monitoring batata hai <b>ki</b> kuch galat hai (alarm). Observability = bahar ke signals se andar ki haalat samajhna, bina naya code daale. Google SRE ke chaar \"golden signals\": latency, traffic, errors, saturation — 🛡️ <code>observability</code> level golden signals ko RED (rate, errors, duration) ke saath sikhata hai. Agle level mein: dheemi request ka waqt kahan gaya."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Average, percentile aur dashboard",
      "project": "64-observability",
      "exercise": "ex0-average",
      "goal": "Video ka misaal, ek user ke kai requests, aur hosts ke p99 ka average vs asli p99.",
      "why": "Node 24+ chahiye. Seedha hisaab aur seeded model — kuch time nahi kiya jaata, isliye output har baar same.",
      "steps": [
        {
          "text": "Average aur percentiles.",
          "cmd": "cd docker-labs/64-observability && npm start -- ex0-average",
          "expect": "ex0 — average kya chhupata hai (hisaab + seeded model; kuch time nahi kiya)\n\n1) Video ka misaal: 100 requests — 99 × 10 ms, 1 × 10 s\n   1 dheema: average 109.9 ms · p50 10 ms · p90 10 ms · p99 (nearest-rank) 10 ms · p99 (linear) 109.9 ms · max 10 s\n   2 dheema: average 209.8 ms · p50 10 ms · p90 10 ms · p99 (nearest-rank) 10 s · p99 (linear) 10 s · max 10 s\n   → 1 dheema request par nearest-rank p99 = 10 ms: dheema request p99 se UPAR baitha hai. p99 \"sabse bure 1%\" ki\n     seema hai, unka haal nahi. Tool ki percentile definition bhi number badal deti hai (10 ms vs 109.9 ms).\n     Isliye max (ya p99.9) aur dheeme requests ki ginti bhi dekho.\n\n2) Ek user, kai requests (har request 1% chance se dheemi, ek-doosre se aazaad — maana hua)\n   requests/user   kam se kam ek dheemi\n               1   1.0%\n               5   4.9%\n              20   18.2%\n              50   39.5%\n             100   63.4%\n   → percentile requests ka hai, users ka nahi. 100 requests wale session mein 63.4% users kam se kam ek dheemi request dekhte hain.\n\n3) Teen hosts, ek dashboard: \"har host ka p99, phir unka average\" vs asli p99 (seeded model, 10,000 requests)\n   chhota-host-bimar: A (9,000 req) p99 24.1 ms · B (900 req) p99 25.6 ms · C (100 req) p99 874.7 ms\n      p99 ka average 308.1 ms · asli p99 (saare requests) 26.0 ms · histogram jod kar 33.9 ms (bucket 25–50 ms)\n   bada-host-bimar: A (9,000 req) p99 301.4 ms · B (900 req) p99 23.5 ms · C (100 req) p99 24.5 ms\n      p99 ka average 116.5 ms · asli p99 (saare requests) 299.0 ms · histogram jod kar 369.1 ms (bucket 250–500 ms)\n   → p99 ka average koi percentile nahi: ek case mein 11.8× zyada bataya, doosre mein 2.6× kam.\n     Histogram ke buckets jod sakte ho (ginti judti hai), phir p99 nikaalo — jawab bucket ki chaudai jitna sahi,\n     jab tak jawab kisi finite bucket mein ho. Sabse upar (+Inf, is lab mein 10 s se upar) gira toh sirf 10 s ki seema milti hai:\n     teen 20 s ki requests ka histogram p99 = 10 s. Badi latency ke liye bada aakhri bucket rakho."
        },
        {
          "text": "Lab ke 6 tests.",
          "cmd": "npm test",
          "expect": "✔ ex0: average, two p99 definitions, merged histograms (22.348249ms)\n✔ ex1: real HTTP mesh — tree from parent ids, skewed log order, broken propagation (1108.888262ms)\n✔ ex1: traceparent parsing and continuing a caller trace (10.80949ms)\n✔ ex2: costs and sampling (5.183804ms)\n✔ ex3: queue simulator matches the formulas (251.397423ms)\n✔ ex4: budget and alert rules (26.419589ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1482.801257"
        }
      ],
      "observe": {
        "q": "\"bada-host-bimar\" mein host A ka p99 301 ms, baaki do ~24 ms. Average 116 ms, asli p99 299 ms. Average itna kam kyun?",
        "choices": [
          "Average teeno hosts ko barabar gin-ta hai; A ke paas 90% requests hain",
          "Asli p99 galat hai — histogram ne bhi 369 ms bataya, 299 nahi",
          "Host B aur C ke requests zyada dheeme hain, isliye average gira"
        ],
        "answer": 0,
        "hint": "Kis host ke paas kitni requests hain?",
        "explain": "Host A: 9,000 requests, B: 900, C: 100. Saare requests mein ~1.8% A ke dheeme requests hain — global p99 dheema (299 ms). Average teeno p99 ko barabar wazan deta hai, toh do swasth chhote hosts A ko dabaa dete hain. Histogram ka 369 ms 250–500 bucket ke andar hai — bucket ki chaudai jitna sahi.",
        "choiceExplanations": [
          "Host A: 9,000 requests, B: 900, C: 100. Saare requests mein ~1.8% A ke dheeme requests hain — global p99 dheema (299 ms). Average teeno p99 ko barabar wazan deta hai, toh do swasth chhote hosts A ko dabaa dete hain. Histogram ka 369 ms 250–500 bucket ke andar hai — bucket ki chaudai jitna sahi.",
          "Histogram ka jawab bucket (250–500 ms) ke andar hai; asli p99 saare samples se.",
          "B aur C ke p99 ~24 ms hain — swasth."
        ]
      },
      "lesson": "Percentile ek set ke andar hi matlab rakhta hai. Do sets jodne hon toh ginti (histogram) jodo, percentile nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — latency ke number",
    "instructions": "Pehle socho: number kis set ka hai (requests? users? hosts?) aur kya chhoota? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Dashboard: checkout ki average latency 120 ms, sab hara. Support par shikayatein: \"payment kabhi-kabhi 8–10 s atakta hai\". Pehla kadam?",
        "choices": [
          "Checkout ke p99, p99.9/max aur 2 s se upar wali requests ki ginti dekho",
          "Average 120 ms hai, toh shikayat users ke internet ki dikkat hogi",
          "Average ko 100 ms tak laane ke liye servers turant dugne karo",
          "Saare endpoints ki latency ek hi graph par jodkar average dekho"
        ],
        "answer": 0,
        "explain": "Kuch requests 8–10 s ki hain, baaki tez — average kaise dikhega? Isliye failaav dekho: p99, p99.9/max, aur seema se upar ki ginti. Phir agla level: trace se dekho waqt kahan gaya.",
        "choiceExplanations": [
          "Kuch requests 8–10 s ki hain, baaki tez — average kaise dikhega? Isliye failaav dekho: p99, p99.9/max, aur seema se upar ki ginti. Phir agla level: trace se dekho waqt kahan gaya.",
          "Average dheemi requests ko chhupa sakta hai (lab: 10 s → 110 ms).",
          "Pehle naap ki failaav dekho; server dugne karna andhera teer hai.",
          "Endpoints jodne se checkout ka dard aur chhup jaayega."
        ]
      },
      {
        "q": "20 servers, har server apna p99 bhejta hai; global dashboard sab servers ke p99 ka average dikhata hai. Ek naya chhota server (1% traffic) bahut dheema hai. Dashboard ke number par sahi baat?",
        "choices": [
          "Valid global p99 nahi — galti upar ya neeche; buckets jodo",
          "Sahi hai — har server ka p99 barabar mahatv rakhta hai",
          "Hamesha zyada batayega, toh number thoda ghata kar padho",
          "Kuch nahi badlega — 21 mein ek server ka asar shoonya hai"
        ],
        "answer": 0,
        "explain": "Average of p99s har server ko barabar wazan deta hai, chahe server 1% traffic le ya 20%. Galti ki disha pakki nahi: lab ex0 ke ek case mein 11.8× zyada, doosre mein 2.6× kam; aur agar baaki servers par bhi kuch dheemi requests hon, toh naya dheema server asli p99 ko average se kahin upar le ja sakta hai. Matlab: average of p99s percentile hai hi nahi. Histogram ke buckets (same seemayein) jodkar global p99 nikaalo.",
        "choiceExplanations": [
          "Average of p99s har server ko barabar wazan deta hai, chahe server 1% traffic le ya 20%. Galti ki disha pakki nahi: lab ex0 ke ek case mein 11.8× zyada, doosre mein 2.6× kam; aur agar baaki servers par bhi kuch dheemi requests hon, toh naya dheema server asli p99 ko average se kahin upar le ja sakta hai. Matlab: average of p99s percentile hai hi nahi. Histogram ke buckets (same seemayein) jodkar global p99 nikaalo.",
          "Barabar mahatv hi galti hai; requests ka wazan chahiye.",
          "Disha tay nahi — lab mein ek baar zyada, ek baar kam.",
          "Naya server 21 mein se ek — average ka 1/21 hissa badalta hai."
        ]
      }
    ]
  },
  "success": [
    "Average, p50, p99 aur max ka farq bata sakte ho",
    "User ke kai requests ka hisaab 1 − 0.99ⁿ se laga sakte ho",
    "Hosts ke percentiles kaise jodein bata sakte ho"
  ],
  "cards": [
    {
      "front": "99 × 10 ms + 1 × 10 s: average aur p99?",
      "back": "Average 109.9 ms. Nearest-rank p99 = 10 ms (dheemi request p99 ke upar); linear p99 = 109.9 ms; max 10 s."
    },
    {
      "front": "100 requests wala session, har request 1% dheemi (aazaad)?",
      "back": "1 − 0.99¹⁰⁰ ≈ 63.4% sessions mein kam se kam ek dheemi request."
    },
    {
      "front": "Hosts ke p99 ka average?",
      "back": "Percentile nahi. Lab: 11.8× zyada ya 2.6× kam. Histogram buckets jodo, phir percentile."
    }
  ]
}
]);
})();
