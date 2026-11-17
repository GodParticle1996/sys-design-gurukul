/* First Principles — FAANG Senior Engineer.
   Source credit: Microservices — Know When NOT to Use (cmiAEDVcGbE), numbered video 13/15.
   Evidence: docker-labs/63-microservices/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "t1", "icon": "👥", "label": "Team A (8)", "x": 130, "y": 90}, {"id": "t2", "icon": "👥", "label": "Team B (8)", "x": 130, "y": 300}, {"id": "m", "icon": "🏛️", "label": "Modular monolith", "x": 420, "y": 195}, {"id": "s1", "icon": "🧩", "label": "Service A", "x": 790, "y": 90}, {"id": "s2", "icon": "🧩", "label": "Service B", "x": 790, "y": 300}];
const EDGES = [{"from": "t1", "to": "m"}, {"from": "t2", "to": "m"}, {"from": "m", "to": "s1"}, {"from": "m", "to": "s2"}];
VISUALS["fp-micro-kab"] = { t: "Chhoti team: modular monolith. Team aur dard bade: saaf seemaon se service nikaalo, keemat jaan kar.", html: SD.viz.svg(HERO, EDGES, { nodes: { t1: {tone:'ok',badge:'apna module'}, t2: {tone:'ok',badge:'apna module'}, m: {tone:'acc',badge:'saaf seemayein'}, s1: {tone:'idle',badge:'baad mein'}, s2: {tone:'idle',badge:'baad mein'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-micro-kab",
  "icon": "🏛️",
  "group": "🧩 Microservices: Kab Nahi",
  "title": "Microservices 4 · Kab — Conway, modular monolith aur todne ke signal",
  "badge": "Seemaon Ka Shilpi",
  "objectives": [
    "Conway aur Brooks: team ka size aur raaste",
    "Modular monolith pehle; service nikaalne ki asli keemat",
    "Todne ke signal aur saste raaste"
  ],
  "lesson": [
    "<h3>🍳 Ek rasoi, ya kai rasoiyaan?</h3><p>Ghar ki rasoi mein 3 log aaraam se khana banate hain — sab ek doosre ko dekhte hain. Shaadi ke 500 logon ke khane ke liye ek rasoi mein 50 rasoiye — dhakka-mukki, \"namak kisne daala?\"</p><p>Tab alag-alag rasoiyaan banti hain: mithai alag, roti alag — har ek ka apna sardar. Par ghar ke khane ke liye alag rasoiyaan banana bekaar kharcha hai. Aaj dekhte hain kab rasoi todni chahiye.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏢 20 log se 5,000 log — architecture kab badle?",
      "goal": "Lab 63 ex4 (arithmetic, Brooks): agar har insaan ko har insaan se taal-mel karna pade toh n(n − 1)/2 sambhavit raaste. Conway (1968): system ka dhaancha team ke baat-cheet ke dhaanche jaisa banta hai. Raaston ki ginti faisla nahi deti — asli taal-mel ka dard deta hai.",
      "nodes": [
        {
          "id": "t1",
          "icon": "👥",
          "label": "Team A (8)",
          "x": 130,
          "y": 90
        },
        {
          "id": "t2",
          "icon": "👥",
          "label": "Team B (8)",
          "x": 130,
          "y": 300
        },
        {
          "id": "m",
          "icon": "🏛️",
          "label": "Modular monolith",
          "x": 420,
          "y": 195
        },
        {
          "id": "s1",
          "icon": "🧩",
          "label": "Service A",
          "x": 790,
          "y": 90
        },
        {
          "id": "s2",
          "icon": "🧩",
          "label": "Service B",
          "x": 790,
          "y": 300
        }
      ],
      "edges": [
        {
          "from": "t1",
          "to": "m"
        },
        {
          "from": "t2",
          "to": "m"
        },
        {
          "from": "m",
          "to": "s1"
        },
        {
          "from": "m",
          "to": "s2"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "people",
          "label": "Log"
        },
        {
          "id": "paths",
          "label": "Raaste"
        },
        {
          "id": "shape",
          "label": "Dhaancha"
        }
      ],
      "steps": [
        {
          "title": "20 log",
          "clock": "startup",
          "say": "190 sambhavit raaste. Chhoti team mein informal baat-cheet aksar kaam kar jaati hai (video). Ek codebase, ek deploy — modular monolith.",
          "nodes": {
            "t1": {
              "tone": "ok",
              "badge": "sab saath"
            },
            "t2": {
              "tone": "idle",
              "badge": ""
            },
            "m": {
              "tone": "ok",
              "badge": "ek deploy"
            },
            "s1": {
              "tone": "idle",
              "badge": ""
            },
            "s2": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "people": "20",
            "paths": "190",
            "shape": "modular monolith"
          },
          "flows": [
            {
              "from": "t1",
              "to": "m",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "100 log",
          "clock": "badhti company",
          "say": "4,950 sambhavit raaste. 8 ki teams (misaal) mein: saari teams ke andar milakar 342, teams ke beech 78 sambhavit. \"Kisne build toda?\" jaisi meetings dikhne lagein toh dard asli hai.",
          "nodes": {
            "t1": {
              "tone": "busy",
              "badge": "team A"
            },
            "t2": {
              "tone": "busy",
              "badge": "team B"
            },
            "m": {
              "tone": "busy",
              "badge": "deploy line"
            },
            "s1": {
              "tone": "idle",
              "badge": ""
            },
            "s2": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "people": "100",
            "paths": "4,950",
            "shape": "monolith, saaf modules"
          },
          "ask": {
            "q": "Video: \"architecture org chart ke peeche chalta hai\". 100 logon ki company ke liye pehla kadam?",
            "choices": [
              "Modules ko teams ke hisaab se saaf seemao mein baanto; todna baad",
              "Turant har team ki alag microservice — Conway ka niyam kehta hai",
              "Teams hata do, sab ek badi team mein — raaste kam ho jaayenge"
            ],
            "answer": 0,
            "hint": "Dard kahan hai: code mein ya baat-cheet mein?",
            "explain": "Pehle code mein seemayein (module = team ki zimmedari, public interface). Is tarah teams ke beech raaste kam, aur deploy ek. Jab deploy ki line ya alag release sach mein dard de, tab module ko service banao — seemayein pehle se saaf hongi.",
            "choiceExplanations": [
              "Pehle code mein seemayein (module = team ki zimmedari, public interface). Is tarah teams ke beech raaste kam, aur deploy ek. Jab deploy ki line ya alag release sach mein dard de, tab module ko service banao — seemayein pehle se saaf hongi.",
              "Conway batata hai kya banta hai; todna tab jab dard ho.",
              "Ek badi team = 4,950 raaste — same dard."
            ]
          }
        },
        {
          "title": "5,000 log",
          "clock": "badi company",
          "say": "~1.25 crore sambhavit raaste — sab-se-sab taal-mel mumkin nahi. 625 teams ke andar milakar 17,500, teams ke beech 1,95,000 sambhavit. Ab har team ka apna deploy aur data — is size par microservices logon ki dikkat hal karte hain.",
          "nodes": {
            "t1": {
              "tone": "ok",
              "badge": "apna deploy"
            },
            "t2": {
              "tone": "ok",
              "badge": "apna deploy"
            },
            "m": {
              "tone": "idle",
              "badge": "toda gaya"
            },
            "s1": {
              "tone": "ok",
              "badge": "Service A"
            },
            "s2": {
              "tone": "ok",
              "badge": "Service B"
            }
          },
          "vars": {
            "people": "5,000",
            "paths": "~1.25 crore",
            "shape": "services"
          },
          "flows": [
            {
              "from": "m",
              "to": "s1",
              "label": "nikala",
              "tone": "acc"
            },
            {
              "from": "m",
              "to": "s2",
              "label": "nikala",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Todne ki keemat",
          "clock": "keemat",
          "say": "Module se service: function call → network call (lab ex0: ~hazaaron guna); agar ek write do owners ka data chhoota tha toh ek transaction → saga ya 2PC (ex2); todne wale API badlaav par ek release → expand/contract deploys (ex4). Har boundary ek contract hai jise sambhalna padta hai. Video: \"copy-paste jaisa\" — sach mein nahi; saaf seemayein madad karti hain, kaam bada hai.",
          "nodes": {
            "t1": {
              "tone": "idle",
              "badge": ""
            },
            "t2": {
              "tone": "idle",
              "badge": ""
            },
            "m": {
              "tone": "busy",
              "badge": "module"
            },
            "s1": {
              "tone": "busy",
              "badge": "network"
            },
            "s2": {
              "tone": "busy",
              "badge": "saga"
            }
          },
          "vars": {
            "people": "—",
            "paths": "—",
            "shape": "module → service"
          },
          "ask": {
            "q": "Video kehta hai modular monolith se service nikaalna \"basically copy-paste\". Lab ke hisaab se?",
            "choices": [
              "Nahi: calls network par, transactions toot'te, deploys kram maangte",
              "Haan: interface saaf hai toh service banne par kuch bhi nahi badalta",
              "Haan, bas naya repo banana padta hai, baaki sab bilkul same"
            ],
            "answer": 0,
            "hint": "Module ki function call service ban kar kya ban jaati hai?",
            "explain": "Saaf interface sabse bada kaam bachata hai, par: function call 4–5 ns se network call (~hazaaron guna, naye failure), do owners ka data chhoone wale transaction ki jagah saga/2PC, aur todne wale API badlaav par expand/contract deploys. Isliye todo tabhi jab faayda in keematon se bada ho.",
            "choiceExplanations": [
              "Saaf interface sabse bada kaam bachata hai, par: function call 4–5 ns se network call (~hazaaron guna, naye failure), do owners ka data chhoone wale transaction ki jagah saga/2PC, aur todne wale API badlaav par expand/contract deploys. Isliye todo tabhi jab faayda in keematon se bada ho.",
              "Interface saaf ho tab bhi call network par jaati hai — latency aur failure.",
              "Repo ke saath data, transactions aur deploys bhi badalte hain."
            ]
          }
        }
      ],
      "lesson": "Microservices aksar mukhya roop se teams ki azaadi ke liye hain (Fowler: primarily), par alag hardware, security aur fault isolation bhi kaaran hain. Har case mein thos faayda distribution ki keemat se bada ho. Chhoti team: aksar modular monolith; dard asli ho tab saaf seemaon se service nikaalo."
    },
    {
      "type": "cards",
      "title": "🚦 Kab todo — chaar (plus ek) signal",
      "goal": "Video ke chaar signal, ek jodne layak, aur video ke aankdon par shak.",
      "lesson": "Inmein se koi asli, naapa hua dard na ho toh mat todo: SQL sudhaaro, cache lagao, modules saaf rakho.",
      "steps": [
        {
          "title": "1. Video ke chaar signal",
          "say": "<b>Teams atak rahi</b> (deploy aur meetings ka dard). <b>Alag hardware</b> (GPU, bahut RAM). <b>Alag technology</b> (ek hissa Rust, baaki Python). <b>Security ki deewar</b> (PCI card data). Saath mein: <b>fault isolation</b> — ek hissa gire toh baaki chale (bulkhead, lab 39)."
        },
        {
          "title": "2. Pehle saste raaste",
          "say": "Bhaari kaam: alag worker process/queue (Level 2). DB connections: pooler. Dheemi query: index/cache. Teams: saaf modules aur code owners. Service tab jab alag release, alag team ya alag hardware sach mein chahiye.",
          "ask": {
            "q": "Ek hissa PCI card data handle karta hai; poore app par audit mehnga pad raha hai. Sabse sahi?",
            "choices": [
              "Card wala hissa alag, asli network alagaav ke saath — chhoti audit seema",
              "Poora app microservices mein todo, taaki har hissa alag audit ho",
              "Card data ko monolith ki ek alag table mein rakho, audit apne aap chhota",
              "Card data ko cache mein rakho taaki DB audit se bahar ho jaaye"
            ],
            "answer": 0,
            "hint": "Audit ki seema kaun tay karta hai — code ka folder ya data ka raasta?",
            "explain": "Security isolation video ka asli signal hai: card data ko chhote, alag system mein rakho (tokenization, alag network) — audit ki seema tabhi chhoti jab alagaav sach mein ho (PCI: jude hue systems scope mein rehte hain). Poore app ko todna bina zaroorat ka kharcha. Table ya cache se data ka raasta app mein hi rehta hai.",
            "choiceExplanations": [
              "Security isolation video ka asli signal hai: card data ko chhote, alag system mein rakho (tokenization, alag network) — audit ki seema tabhi chhoti jab alagaav sach mein ho (PCI: jude hue systems scope mein rehte hain). Poore app ko todna bina zaroorat ka kharcha. Table ya cache se data ka raasta app mein hi rehta hai.",
              "Sirf ek hisse ki zaroorat; baaki todna bina faayde ka.",
              "Same process mein alag table — data phir bhi poore app se guzarta.",
              "Cache mein card data = naya audit wala hissa."
            ]
          }
        },
        {
          "title": "3. Aankdon par shak",
          "say": "Video: \"2024 DZone: 35% zyada debugging\", \"2025 CNCF: 42% ne wapas joda\", \"Top 50 websites ke alawa scaling myth\". Pehle do ka primary source nahi mila (CNCF ka 42% service mesh adoption hai); teesra bada daava hai. Misaalein pakki hain: Stack Overflow (bada monolith), Shopify (modular monolith), Basecamp (\"Majestic Monolith\"), aur Prime Video (story: monolith mein wapas, lab 16)."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Conway ka hisaab",
      "project": "63-microservices",
      "exercise": "ex4-conway",
      "goal": "Brooks ke raaste 5 se 5,000 logon tak; aur field rename mein kitne deploys.",
      "why": "Node 24+ chahiye. Seedha hisaab, har run same.",
      "steps": [
        {
          "text": "Conway.",
          "cmd": "cd docker-labs/63-microservices && npm start -- ex4-conway",
          "expect": "A. Arithmetic (Brooks, The Mythical Man-Month, ch. 2): agar har insaan ko har insaan se taal-mel karna pade toh n(n − 1)/2\n   sambhavit raaste. 8 ki teams sirf ek chuni hui misaal hai (aakhri team chhoti ho sakti hai).\n\nlog      sab-se-sab raaste     8 ki teams: saari teams ke andar ke raaste   teams ke beech sambhavit raaste\n    5                 10                  10                                         0\n   20                190                  62                                         3\n  100              4,950                 342                                        78\n 5000        1,24,97,500              17,500                                  1,95,000\n\n→ Raaste log ke square ki tarah badhte hain — par ye sambhavit raaste hain, naapa hua kaam nahi. Kitna taal-mel chahiye,\n  code ki dependencies, zimmedariyon aur tools par tika hai. Raaston ka hisaab kisi headcount par \"ab todo\" ka faisla nahi deta.\n  Conway (1968): system ka dhaancha team ke baat-cheet ke dhaanche jaisa banta hai. Team, codebase aur deploy unit alag cheezein hain.\n\nB. Arithmetic: services ke beech ke API mein ek field ka naam badlo (\"name\" → \"full_name\") — ek TODNE wala badlaav, bina downtime.\n   Ek producer, baaki consumers alag-alag deploy hote hain. (Naya field jodna, jise purane readers ignore karein — tolerant reader —\n   bina is kram ke ship ho sakta hai. DB column ka naam badalna ho toh monolith mein bhi expand/contract chahiye.)\n\nservices   deploys   kram\n       1         1   ek codebase, ek release (monolith ke andar ka function interface)\n       2         3   producer dono naam likhe → 1 consumer naya naam padhein → producer purana band\n       3         4   producer dono naam likhe → 2 consumer naya naam padhein → producer purana band\n       5         6   producer dono naam likhe → 4 consumer naya naam padhein → producer purana band\n\n→ Monolith ke andar ka function interface: ek release, compiler/IDE saari jagah dikhata hai. Services ke beech todne wala badlaav:\n  expand/contract (parallel change), deploys ka kram, aur galat kram par purana consumer toota (video ka \"purane format\" wala)."
        },
        {
          "text": "Lab ke 4 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-63-microservices@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ call cost: same answer over HTTP; a function call is far cheaper; a new connection costs more than keep-alive (230.460402ms)\n✔ fan-out: sequential adds latency, parallel waits for the slowest; exposure 1 − 0.99^n only when hiccups are independent (64.772978ms)\n✔ two databases: final states; saga recovery is idempotent even if recovery crashes; 2PC readers can see the middle; prepared participants block (0.945045ms)\n✔ arithmetic: copies multiply max DB connections; Brooks paths; within-team totals; rename deploys (0.225453ms)\nℹ tests 4\nℹ suites 0\nℹ pass 4\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 334.491484"
        }
      ],
      "observe": {
        "q": "Field rename: 1 codebase par 1 deploy, 3 services par 4 deploys. Beech wala \"producer dono naam likhe\" kyun zaroori?",
        "choices": [
          "Consumers alag samay deploy hote; tab tak dono naam chahiye",
          "Producer ko dono naam likhne se database ka size kam hota hai",
          "Expand/contract sirf monolith mein chahiye, services mein nahi"
        ],
        "answer": 0,
        "hint": "Consumer 2 abhi purana code chala raha hai jab producer naya bhejta hai — kya hoga?",
        "explain": "Services alag-alag deploy hoti hain. Agar producer seedha naam badle toh purane consumers toot'te (video: \"service B purane format mein\"). Isliye pehle dono naam (expand), phir consumers badlo, phir purana hatao (contract). Monolith ke andar ka function interface ek release mein badalta hai.",
        "choiceExplanations": [
          "Services alag-alag deploy hoti hain. Agar producer seedha naam badle toh purane consumers toot'te (video: \"service B purane format mein\"). Isliye pehle dono naam (expand), phir consumers badlo, phir purana hatao (contract). Monolith ke andar ka function interface ek release mein badalta hai.",
          "Dono naam likhna data badhata hai; maqsad compatibility hai.",
          "Ulta: services mein zaroori; monolith ke andar function interface ek release."
        ]
      },
      "lesson": "Team ka dhaancha system ka dhaancha banata hai. Services tab jab baat-cheet ka dard asli ho; tab bhi har cross-service badlaav ka byaaj lagta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — todna ya nahi",
    "instructions": "Pehle socho: dard code ka hai ya logon ka, aur sabse sasta ilaaj kya? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "150 engineers, ek monolith. Har deploy mein 12 teams ke changes saath; ek team ka bug sabka release rokta hai. Kya karoge?",
        "choices": [
          "Saaf modules + ownership; sabse dard wale hisse se service nikaalo",
          "Poore monolith ko ek saath 50 microservices mein todo, ek baar mein",
          "Deploy hafte mein ek baar kar do, taaki bugs kam dikhein",
          "Sab teams ko ek team bana do, taaki koordination aasaan ho"
        ],
        "answer": 0,
        "explain": "Teams ka ek doosre ko rokna asli signal hai (video ka pehla signal). Pehle modules aur ownership saaf, phir sabse dard wale hisse se service nikaalo (strangler pattern). Ek saath sab todna = distributed monolith ka khatra.",
        "choiceExplanations": [
          "Teams ka ek doosre ko rokna asli signal hai (video ka pehla signal). Pehle modules aur ownership saaf, phir sabse dard wale hisse se service nikaalo (strangler pattern). Ek saath sab todna = distributed monolith ka khatra.",
          "Ek saath bada todna galat seemao aur distributed monolith ka khatra.",
          "Kam deploys = bade releases, zyada risk.",
          "150 logon ki ek team = 11,175 raaste."
        ]
      },
      {
        "q": "Ek team ne 8 services banaye, par har feature ke liye saari 8 ek saath deploy karni padti hain, aur sab ek hi DB padhti hain. Is haalat ko kya kehte hain?",
        "choices": [
          "Distributed monolith: services ki keemat, independence nahi",
          "Achhe microservices: zyada services matlab zyada scaling",
          "Modular monolith: ek DB aur saath deploy, modular monolith ki pehchaan",
          "Serverless architecture: deploy ek saath hote hain"
        ],
        "answer": 0,
        "explain": "Video ka shabd: distributed monolith. Seemayein galat jagah — har badlaav sab services chhoota. Network ka tax bhi, ek deploy ki majboori bhi. Ilaaj: seemayein dobara sochna (ya modules mein wapas jodna).",
        "choiceExplanations": [
          "Video ka shabd: distributed monolith. Seemayein galat jagah — har badlaav sab services chhoota. Network ka tax bhi, ek deploy ki majboori bhi. Ilaaj: seemayein dobara sochna (ya modules mein wapas jodna).",
          "Saath deploy aur shared DB = independence nahi; scaling ka faayda bhi kam.",
          "Modular monolith ek process hai; is team ke paas 8 alag network services hain.",
          "Serverless deploy model hai; dikkat seemaon ki hai."
        ]
      }
    ]
  },
  "success": [
    "Conway aur Brooks ka hisaab bata sakte ho",
    "Modular monolith aur service nikaalne ki keemat samjha sakte ho",
    "Todne ke signal aur saste raaste chun sakte ho"
  ],
  "cards": [
    {
      "front": "Brooks ke raaste?",
      "back": "Sab-se-sab taal-mel par n(n − 1)/2: 20 → 190, 100 → 4,950, 5,000 → ~1.25 crore (sambhavit, naapa hua kaam nahi). Lab 63 ex4."
    },
    {
      "front": "Kab todo?",
      "back": "Teams atak rahi, alag hardware, alag tech, security deewar, fault isolation. Warna modular monolith + saste raaste."
    },
    {
      "front": "Distributed monolith?",
      "back": "Services jo saath deploy hoti aur ek DB share karti — network ka tax + independence nahi. Seemayein dobara socho."
    }
  ]
}
]);
})();
