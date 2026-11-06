/* Playlist · EDA Core topic 3: EDA tradeoffs. Source credit: Software Developer Diaries,
   "Here's when Event-Driven Systems should REALLY be used" (Of-br0OG5ic) and
   "Here's why Event-Driven Architecture might be a BAD choice" (ttEYKoP53DM).
   Numbers: docker-labs/48-eda-tradeoffs/captures. */
(function () {
const HERO = [{"id": "in", "icon": "🛒", "label": "orders", "x": 140, "y": 105}, {"id": "line", "icon": "🎟️", "label": "line", "x": 445, "y": 105}, {"id": "work", "icon": "🍳", "label": "20/s", "x": 750, "y": 105}];
const EDGES = [{"from": "in", "to": "line"}, {"from": "line", "to": "work"}];
VISUALS["et-kyun"] = { t: "Bheed 60/s, kitchen 20/s. Line bachati hai — par kab tak, aur kitni der ruka ke?", html: SD.viz.svg(HERO, EDGES, { nodes: { in: {tone:'bad',badge:'60/s burst'}, line: {tone:'slow',badge:'intezaar'}, work: {tone:'busy',badge:'20/s'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "et-kyun",
  "icon": "🎟️",
  "group": "⚖️ EDA Tradeoffs",
  "title": "Tradeoff 1 · Kyun — line lagao toh bheed sambhal gayi?",
  "badge": "Token Shishya",
  "objectives": [
    "Bina line ke burst mein kitna kaam mana hota hai?",
    "Line kya bachati hai, aur badle mein kya leti hai?",
    "Line kab khaali hogi, kaise gino?",
    "Roz ki zyada bheed par line kyun nahi bachati?"
  ],
  "lesson": [
    "<h3>🎟️ Diwali ki bheed</h3><p>Asha ke dhabe par Diwali ki shaam: har second 60 grahak, kitchen 20 thaliyan banata hai. Counter baaki 40 ko lauta de, ya token de ke line mein bitha de?</p><p>Pehle bina token ke dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🛒 Sale shuru: bina line ke kya hota hai?",
      "goal": "Pehle 10 second har second 60 order aate hain, phir 10/s. recs-service ek second mein 20 sambhalta hai. Ye lab 48 ke tools/slowmo.js --mode direct ka nakli-ghadi run hai; saare numbers lab ke tay kiye hue hain.",
      "nodes": [
        {
          "id": "api",
          "icon": "🛒",
          "label": "order-api",
          "x": 220,
          "y": 140
        },
        {
          "id": "recs",
          "icon": "🍳",
          "label": "recs-service",
          "x": 670,
          "y": 140
        }
      ],
      "edges": [
        {
          "from": "api",
          "to": "recs"
        }
      ],
      "viz": {
        "w": 890,
        "h": 280,
        "focus": [
          "api",
          "recs"
        ]
      },
      "vars": [
        {
          "id": "aaye",
          "label": "Aaye"
        },
        {
          "id": "hue",
          "label": "Hue"
        },
        {
          "id": "reject",
          "label": "Mana (reject)"
        },
        {
          "id": "line",
          "label": "Line mein"
        },
        {
          "id": "purana",
          "label": "Sabse purana kitni der se"
        }
      ],
      "steps": [
        {
          "title": "Pehla second",
          "clock": "1 s",
          "say": "60 order aaye. recs-service ne 20 liye. Baaki 40 ko seedha jawab: abhi nahi (reject). Koi line nahi hai.",
          "nodes": {
            "api": {
              "tone": "bad",
              "badge": "40 mana"
            },
            "recs": {
              "tone": "busy",
              "badge": "20/s"
            }
          },
          "vars": {
            "aaye": "60",
            "hue": "20",
            "reject": "40",
            "line": "0",
            "purana": "—"
          },
          "flows": [
            {
              "from": "api",
              "to": "recs",
              "label": "20 liye",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Burst ka aakhri second",
          "clock": "10 s",
          "say": "Das second tak yahi hua. 600 aaye, 200 hue, 400 ko mana kiya gaya.",
          "nodes": {
            "api": {
              "tone": "bad",
              "badge": "400 mana"
            },
            "recs": {
              "tone": "busy",
              "badge": "20/s"
            }
          },
          "vars": {
            "aaye": "600",
            "hue": "200",
            "reject": "400",
            "line": "0",
            "purana": "—"
          },
          "ask": {
            "q": "Sale khatam hone ke baad recs-service khaali baitha hai. Kya mana kiye 400 order ab apne aap ho jaayenge?",
            "choices": [
              "Nahi — reject hue 400 orders kahin rakhe nahi gaye; bhejne wale ko dobara bhejne padenge",
              "Haan — recs-service khaali hote hi purane 400 order khud dhoond ke kar leta hai",
              "Haan — order-api ne 400 order memory mein rakhe hain aur ab chupke se bhejega"
            ],
            "answer": 0,
            "hint": "Line hai hi nahi. Mana kiye order kahan gaye?",
            "explain": "Bina line ke, capacity se upar ka kaam aane ke pal par mana hota hai. Baad mein kitchen khaali ho, tab bhi mana kiya kaam wapas nahi aata — bhejne wale ko retry karna padega, aur retry phir bheed bana sakta hai.",
            "choiceExplanations": [
              "Bina line ke, capacity se upar ka kaam aane ke pal par mana hota hai. Baad mein kitchen khaali ho, tab bhi mana kiya kaam wapas nahi aata — bhejne wale ko retry karna padega, aur retry phir bheed bana sakta hai.",
              "recs-service ko mana kiye orders ka pata hi nahi; reject hue orders kahin rakhe nahi gaye.",
              "Is flow mein order-api kuch nahi rakhta: capacity se upar wale ko seedha mana karta hai."
            ]
          }
        },
        {
          "title": "Sale ke baad shaanti",
          "clock": "60 s",
          "say": "Ab 10 order/s aate hain, 20/s ki capacity. Sab ho rahe hain, par burst ke 400 order ja chuke.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "10/s"
            },
            "recs": {
              "tone": "ok",
              "badge": "aadha khaali"
            }
          },
          "vars": {
            "aaye": "1100",
            "hue": "700",
            "reject": "400",
            "line": "0",
            "purana": "—"
          }
        }
      ],
      "lesson": "Seedhe call mein capacity se upar ka kaam aane ke pal par mana hota hai: 1,100 mein se 400 gaye. Kitchen baad mein khaali baitha raha, par mana kiye order wapas nahi aaye."
    },
    {
      "type": "dryrun",
      "title": "🎟️ Wahi sale, beech mein line",
      "goal": "Ab order-api har order line mein daalta hai, aur recs-service apni raftaar se (20/s) line se uthata hai. tools/slowmo.js --mode queue, nakli ghadi.",
      "nodes": [
        {
          "id": "api",
          "icon": "🛒",
          "label": "order-api",
          "x": 160,
          "y": 140
        },
        {
          "id": "line",
          "icon": "🎟️",
          "label": "line",
          "x": 445,
          "y": 140
        },
        {
          "id": "recs",
          "icon": "🍳",
          "label": "recs-service",
          "x": 730,
          "y": 140
        }
      ],
      "edges": [
        {
          "from": "api",
          "to": "line"
        },
        {
          "from": "line",
          "to": "recs"
        }
      ],
      "viz": {
        "w": 890,
        "h": 280,
        "focus": [
          "line"
        ]
      },
      "vars": [
        {
          "id": "aaye",
          "label": "Aaye"
        },
        {
          "id": "hue",
          "label": "Hue"
        },
        {
          "id": "reject",
          "label": "Mana (reject)"
        },
        {
          "id": "line",
          "label": "Line mein"
        },
        {
          "id": "purana",
          "label": "Sabse purana kitni der se"
        }
      ],
      "steps": [
        {
          "title": "Pehla second",
          "clock": "1 s",
          "say": "60 aaye, 20 hue, 40 line mein ruke. Kisi ko mana nahi kiya.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "0 mana"
            },
            "line": {
              "tone": "slow",
              "badge": "40"
            },
            "recs": {
              "tone": "busy",
              "badge": "20/s"
            }
          },
          "vars": {
            "aaye": "60",
            "hue": "20",
            "reject": "0",
            "line": "40",
            "purana": "0 s"
          },
          "flows": [
            {
              "from": "api",
              "to": "line",
              "label": "60",
              "tone": "acc"
            },
            {
              "from": "line",
              "to": "recs",
              "label": "20",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Burst ka aakhri second",
          "clock": "10 s",
          "say": "Har second line 40 badhi. Ab line mein 400, aur sabse purana order 6 second se ruka hai.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "0 mana"
            },
            "line": {
              "tone": "slow",
              "badge": "400"
            },
            "recs": {
              "tone": "busy",
              "badge": "20/s"
            }
          },
          "vars": {
            "aaye": "600",
            "hue": "200",
            "reject": "0",
            "line": "400",
            "purana": "6 s"
          },
          "ask": {
            "q": "Ab 10 order/s aayenge aur recs-service 20/s nikaalega. 400 ki line kab khaali hogi?",
            "choices": [
              "Lagbhag 40 second mein — line har second 10 ghategi (20 nikle, 10 aaye)",
              "Lagbhag 20 second mein — recs-service 20/s nikaalta hai, toh 400 / 20",
              "Kabhi nahi — ek baar line ban gayi toh line hamesha bani rehti hai"
            ],
            "answer": 0,
            "hint": "Line har second kitni ghategi? Aate bhi toh rahenge.",
            "explain": "Line utni ghat-ti hai jitna nikalna aane se zyada hai: 20 − 10 = 10 per second. 400 / 10 = 40 second, yaani 50ve second tak. 400 / 20 bhoolta hai ki naye order bhi aa rahe hain.",
            "choiceExplanations": [
              "Line utni ghat-ti hai jitna nikalna aane se zyada hai: 20 − 10 = 10 per second. 400 / 10 = 40 second, yaani 50ve second tak. 400 / 20 bhoolta hai ki naye order bhi aa rahe hain.",
              "400 / 20 tab sahi hota jab naye order aana band ho jaate. Yahan har second 10 aur aa rahe hain.",
              "Line tab ghat-ti hai jab nikalna aane se zyada ho. Yahan 20 nikal rahe, 10 aa rahe — line ghategi."
            ]
          }
        },
        {
          "title": "Line ghat rahi hai",
          "clock": "30 s",
          "say": "30ve second par line 200. Ab sabse purana order 19 second se ruka hai — burst ke orders sabse lamba ruke.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "10/s"
            },
            "line": {
              "tone": "slow",
              "badge": "200"
            },
            "recs": {
              "tone": "busy",
              "badge": "20/s"
            }
          },
          "vars": {
            "aaye": "800",
            "hue": "600",
            "reject": "0",
            "line": "200",
            "purana": "19 s"
          }
        },
        {
          "title": "Line khaali",
          "clock": "50 s",
          "say": "50ve second par line khaali. Ab tak 1,000 aaye aur 1,000 hue, 0 mana. Poore 60-second run mein 1,100 mein se 1,100 hue. Sabse lamba intezaar 20 second tha.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "10/s"
            },
            "line": {
              "tone": "ok",
              "badge": "0"
            },
            "recs": {
              "tone": "ok",
              "badge": "aaram"
            }
          },
          "vars": {
            "aaye": "1000",
            "hue": "1000",
            "reject": "0",
            "line": "0",
            "purana": "0 s"
          },
          "ask": {
            "q": "Line ne kya badla?",
            "choices": [
              "400 mana ko 20 second tak ke intezaar mein badla — kaam bacha, par der hui",
              "recs-service ko tez kar diya — line ki wajah se 20 ki jagah 60/s banne lage",
              "Kuch nahi — line ke saath bhi utne hi order mana hue, bas baad mein"
            ],
            "answer": 0,
            "hint": "Reject aur sabse purana — dono ginti dekho.",
            "explain": "Line ne capacity nahi badhayi; 20/s hi raha. Line ne burst ke extra orders ko rukne ki jagah di: 0 mana, par sabse lamba intezaar 20 second. Faayda tab hai jab itni der manzoor ho.",
            "choiceExplanations": [
              "Line ne capacity nahi badhayi; 20/s hi raha. Line ne burst ke extra orders ko rukne ki jagah di: 0 mana, par sabse lamba intezaar 20 second. Faayda tab hai jab itni der manzoor ho.",
              "recs-service 20/s par hi chala. Line raftaar nahi badhati, sirf kaam ko rukne ki jagah deti hai.",
              "Reject 0 raha — line ne har order rakha. Badle mein orders ko rukna pada."
            ]
          }
        }
      ],
      "lesson": "Line burst ko sambhaalti hai: 0 mana, sab 1,100 hue. Kharcha: sabse lamba intezaar 20 second. Line khaali tab hoti hai jab nikalna aane se zyada ho: line / (nikalna − aana)."
    },
    {
      "type": "cards",
      "title": "🎟️ Dhabe ka token — sirf bheed ke liye, ya hamesha ke liye?",
      "goal": "Token line ne Diwali ki bheed bacha li. Par roz bheed ho toh?",
      "lesson": "Line thodi der ki bheed ko sambhaalti hai. Lagataar zyada aaye toh line badhti hi rehti hai; tab raftaar badhao ya kaam kam lo.",
      "steps": [
        {
          "title": "1. Roz ki bheed",
          "say": "Ab socho har minute 10,000 order aate hain, aur kitchen har minute 200 banata hai. Line ho, phir bhi?",
          "ask": {
            "q": "10 minute baad line mein kitne order honge?",
            "choices": [
              "98,000 — har minute 9,800 badhte hain, aur line kabhi khaali nahi hogi",
              "0 — line hai toh load barabar ho jaata hai, kitchen dheere-dheere kar lega",
              "2,000 — kitchen 10 minute mein 2,000 bana chuka, toh line mein bhi utne hi"
            ],
            "answer": 0,
            "hint": "Har minute kitne aaye, kitne bane?",
            "explain": "Har minute 10,000 aaye, 200 bane: line 9,800 badhi. 10 minute mein 98,000, aur sabse purana order 9 minute se ruka. Line yahan bheed nahi sambhaal rahi, sirf der badha rahi hai.",
            "choiceExplanations": [
              "Har minute 10,000 aaye, 200 bane: line 9,800 badhi. 10 minute mein 98,000, aur sabse purana order 9 minute se ruka. Line yahan bheed nahi sambhaal rahi, sirf der badha rahi hai.",
              "Line tabhi barabar karti hai jab aane ki raftaar ausat mein nikalne se kam ho. Yahan 50 guna zyada hai.",
              "2,000 toh bane hain. Line mein aaye hue minus bane: 1,00,000 − 2,000 = 98,000."
            ]
          }
        },
        {
          "title": "2. Toh ilaaj kya?",
          "say": "Raftaar ka hisaab: 10,000 / 200 = 50. Lab mein 50 kitchen (workers) lagaye toh line 0 rahi. Ya order lena kam karo (load shedding). Line na workers badhane ki jagah leti hai, na kaam ghatane ki.",
          "ask": {
            "q": "Video kehta hai: message bus \"throttle\" karke dheemi service ko sambhaal leta hai. Kab sach hai?",
            "choices": [
              "Thodi der ki bheed par — ausat aana nikalne se kam ho, aur der manzoor ho",
              "Hamesha — bus mein jagah ho toh koi bhi raftaar ka farak chal jaata hai",
              "Kabhi nahi — line lagane se hamesha sirf der badhti hai, kuch bachta nahi"
            ],
            "answer": 0,
            "hint": "Burst wala aur roz wala, dono run yaad karo.",
            "explain": "Burst mein line ne 400 orders bachaye. Roz ke 50 guna farak par line 98,000 tak gayi. Azure ka Queue-Based Load Leveling pattern bhi kehta hai: ausat producer rate consumer se zyada ho toh queue badhti rehti hai aur latency badhti hai.",
            "choiceExplanations": [
              "Burst mein line ne 400 orders bachaye. Roz ke 50 guna farak par line 98,000 tak gayi. Azure ka Queue-Based Load Leveling pattern bhi kehta hai: ausat producer rate consumer se zyada ho toh queue badhti rehti hai aur latency badhti hai.",
              "Bus ki jagah bhi khatam hoti hai, aur orders ka intezaar ghanton mein chala jaata hai.",
              "Burst mein line ne 400 reject bachaye — der manzoor ho toh faayda hai."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Thodi der ki bheed ko line mein rok ke apni raftaar se karna: <b>queue-based load leveling</b>. Line mein ruka kaam: <b>backlog</b>. Sabse purane message ki umar: <b>age of oldest message</b> (ya consumer lag). Line khaali hone ka waqt ≈ backlog / (nikalna − aana)."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Burst aur roz ki bheed — apne terminal mein",
      "project": "48-eda-tradeoffs",
      "exercise": "ex1-level",
      "goal": "Wahi nakli ghadi wala model: pehle sale ka burst, phir har minute 10,000 vs 200.",
      "why": "Node 18+ chahiye; koi service nahi chalti. Output lab 48 ke captures se hai; teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: sale ka burst, 1 worker.",
          "cmd": "cd docker-labs/48-eda-tradeoffs && npm start -- ex1-level --profile burst",
          "expect": "profile=burst workers=1 queue=true | capacity 20/s\n  5 s  aaye=300 hue=100 reject=0 line=200 sabse-purana=3 s\n 10 s  aaye=600 hue=200 reject=0 line=400 sabse-purana=6 s\n 15 s  aaye=650 hue=300 reject=0 line=350 sabse-purana=9 s\n 20 s  aaye=700 hue=400 reject=0 line=300 sabse-purana=13 s\n 25 s  aaye=750 hue=500 reject=0 line=250 sabse-purana=16 s\n 30 s  aaye=800 hue=600 reject=0 line=200 sabse-purana=19 s\n 35 s  aaye=850 hue=700 reject=0 line=150 sabse-purana=14 s\n 40 s  aaye=900 hue=800 reject=0 line=100 sabse-purana=9 s\n 45 s  aaye=950 hue=900 reject=0 line=50 sabse-purana=4 s\n 50 s  aaye=1000 hue=1000 reject=0 line=0 sabse-purana=0 s\n 55 s  aaye=1050 hue=1050 reject=0 line=0 sabse-purana=0 s\n 60 s  aaye=1100 hue=1100 reject=0 line=0 sabse-purana=0 s\npeak line=400 (10 s) · khaali hui=50 s · sabse lamba intezaar=20 s · reject=0"
        },
        {
          "text": "Har minute 10,000 aate, 200 nikalte.",
          "cmd": "npm start -- ex1-level --profile sustained",
          "expect": "profile=sustained workers=1 queue=true | capacity 200/min\n  1 min  aaye=10000 hue=200 reject=0 line=9800 sabse-purana=0 min\n  2 min  aaye=20000 hue=400 reject=0 line=19600 sabse-purana=1 min\n  3 min  aaye=30000 hue=600 reject=0 line=29400 sabse-purana=2 min\n  4 min  aaye=40000 hue=800 reject=0 line=39200 sabse-purana=3 min\n  5 min  aaye=50000 hue=1000 reject=0 line=49000 sabse-purana=4 min\n  6 min  aaye=60000 hue=1200 reject=0 line=58800 sabse-purana=5 min\n  7 min  aaye=70000 hue=1400 reject=0 line=68600 sabse-purana=6 min\n  8 min  aaye=80000 hue=1600 reject=0 line=78400 sabse-purana=7 min\n  9 min  aaye=90000 hue=1800 reject=0 line=88200 sabse-purana=8 min\n 10 min  aaye=100000 hue=2000 reject=0 line=98000 sabse-purana=9 min\npeak line=98000 (10 min) · khaali hui=run ke ant tak nahi · sabse lamba intezaar=9 min · reject=0"
        }
      ],
      "observe": {
        "q": "Burst mein line 50 s par khaali hui. Sustained mein 10 min baad line 98,000 aur sabse purana 9 min. Farak ki jad kya hai?",
        "choices": [
          "Burst ke baad aana nikalne se kam hua; sustained mein aana hamesha nikalne se zyada raha",
          "Sustained run mein line ka size chhota rakha gaya tha, isliye orders atak gaye",
          "Burst mein 2 workers the aur sustained mein 1, isliye sustained ki line nahi ghati"
        ],
        "answer": 0,
        "hint": "Har run ki pehli line: capacity kitni, aur aaye kitne?",
        "explain": "Line tabhi ghat-ti hai jab nikalna aane se zyada ho. Burst ke baad 10/s aaye, 20/s nikle: line khaali. Sustained mein har minute 10,000 aaye, 200 nikle: line har minute 9,800 badhi.",
        "choiceExplanations": [
          "Line tabhi ghat-ti hai jab nikalna aane se zyada ho. Burst ke baad 10/s aaye, 20/s nikle: line khaali. Sustained mein har minute 10,000 aaye, 200 nikle: line har minute 9,800 badhi.",
          "Is lab ki line bina hadd ki hai; koi order line ke size ki wajah se nahi ruka.",
          "Dono run mein 1 worker tha (workers=1). Farak aane aur nikalne ki raftaar ka hai."
        ]
      },
      "lesson": "Burst ke liye line sahi jawab hai, agar der manzoor ho. Lagataar zyada load ke liye line akeli kuch nahi bachati: workers badhao (yahan 50) ya kaam kam lo."
    }
  ],
  "interview": {
    "title": "Interview Round — line kab kaam aati hai?",
    "instructions": "Pehle aane aur nikalne ki raftaar socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "API 10,000 requests/min leti hai, ML pipeline 200/min karti hai. Team kehti hai: beech mein Kafka laga do, load barabar ho jaayega. Aap kya kahoge?",
        "choices": [
          "10,000 vs 200 roz ka farak hai: line har minute 9,800 badhegi — pipeline badhao ya kaam kam lo",
          "Theek hai — Kafka ki partitions zyada hon toh pipeline ki raftaar apne aap badh jaati hai",
          "Theek hai — line ki vajah se pipeline ko kam requests dikhengi, toh pipeline tez chalegi",
          "Kafka ki jagah RabbitMQ lagao — RabbitMQ dheemi service ko apne aap throttle karta hai"
        ],
        "answer": 0,
        "explain": "Line thodi der ki bheed sambhaalti hai. Ausat aana nikalne se 50 guna ho toh line badhti hi rahegi aur intezaar ghanton mein jaayega. Ilaaj raftaar ka hai: consumers badhao, kaam sample/shed karo, ya producer ko dheema karo.",
        "choiceExplanations": [
          "Line thodi der ki bheed sambhaalti hai. Ausat aana nikalne se 50 guna ho toh line badhti hi rahegi aur intezaar ghanton mein jaayega. Ilaaj raftaar ka hai: consumers badhao, kaam sample/shed karo, ya producer ko dheema karo.",
          "Partitions zyada consumers ko parallel chalne dete hain, par consumers badhane padte hain. Pipeline khud tez nahi hoti.",
          "Pipeline ki raftaar line se nahi badalti. Line sirf rukne ki jagah deti hai.",
          "Broker badalne se raftaar ka farak nahi mitta. Line kisi bhi broker mein badhegi."
        ]
      },
      {
        "q": "Black Friday par pehle 10 second 60 email/s, phir 10/s aate hain. Email worker 20/s karta hai. Lab ke hisaab se sabse lamba wait 20 s hai; 30 s tak der manzoor hai. Saal bhar peak capacity ka kharcha bachane ke liye kya chunoge?",
        "choices": [
          "Email ke liye line lagao; backlog aur sabse purane message ki umar par alert rakho",
          "Kuch nahi — burst mein jo email reject ho, user baad mein khud dobara maang lega",
          "Saal bhar Black Friday jitni email capacity rakho, taaki line ki zaroorat hi na pade",
          "Email ko checkout ke andar seedha bhejo, taaki burst mein checkout dheema ho jaaye"
        ],
        "answer": 0,
        "explain": "Is scenario ka 20 s maximum wait, 30 s ki hadd ke andar hai. Line burst sambhaal sakti hai; backlog aur sabse purane message ki umar par alert rakho. Naye traffic pattern par wait ka hisaab dobara karo.",
        "choiceExplanations": [
          "Is scenario ka 20 s maximum wait, 30 s ki hadd ke andar hai. Line burst sambhaal sakti hai; backlog aur sabse purane message ki umar par alert rakho. Naye traffic pattern par wait ka hisaab dobara karo.",
          "Reject kiya email chupchaap kho jaata hai. User ko pata bhi nahi chalega ki email nahi aaya.",
          "Peak capacity der ki hadd sambhaal sakti hai, par sawaal mein saal bhar ka peak-capacity kharcha bachana hai. Diye hue scenario mein line ke saath 20 s wait manzoor hai.",
          "Checkout ko email ka intezaar karana user ka checkout dheema karega — ulta nuksaan."
        ]
      }
    ]
  },
  "success": [
    "Burst mein line ka faayda (0 reject) aur kharcha (intezaar) gin sakte ho",
    "Line khaali hone ka waqt nikaal sakte ho: backlog / (nikalna − aana)",
    "Lagataar zyada load par line ki seema samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Queue-based load leveling kab kaam karta hai?",
      "back": "Thodi der ki bheed par, jab ausat aana nikalne se kam ho aur der manzoor ho."
    },
    {
      "front": "Line kab khaali hogi?",
      "back": "Backlog / (nikalna − aana). Lab: 400 / (20 − 10) = 40 s."
    },
    {
      "front": "Aana hamesha nikalne se zyada ho toh?",
      "back": "Line hamesha badhegi (lab: +9,800/min). Consumers badhao ya kaam kam lo."
    }
  ]
}
]);
})();
