/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Software (dDOKu20juEc), numbered video 1/15.
   Evidence: docker-labs/45-software-physics/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🍽️", "label": "KhanaKart", "x": 140, "y": 105}, {"id": "path", "icon": "🛣️", "label": "raasta", "x": 445, "y": 105}, {"id": "data", "icon": "🗃️", "label": "data", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "path"}, {"from": "path", "to": "data"}];
VISUALS["fp-physics-kyun"] = { t: 'Menu RAM mein hai, phir bhi checkout dheema kyun? Har item ke liye lagne wala chakkar gino.',
  html: SD.viz.svg(HERO, EDGES, {nodes:{app:{tone:'acc',badge:'menu RAM mein'},path:{tone:'slow',badge:'har item ka chakkar'},data:{tone:'ok',badge:'jawab tez'}}}, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-physics-kyun",
  "icon": "🧪",
  "group": "🧪 Physics of Software",
  "title": "Physics 1 · Kyun — cache tez, menu dheema kyun?",
  "badge": "Raasta Shishya",
  "objectives": [
    "RAM mein menu hote hue response kyun atak sakta hai?",
    "Ek-ek request ka wait kaise judta hai?",
    "Wahi data batch mein maangne se kya badalta hai?"
  ],
  "lesson": [
    "<h3>☕ Chai lekar aaye. Ab roti poochhne wapas?</h3><p>Asha ki poori list haath mein hai. Runner har cheez ke liye counter tak alag jaata hai. Counter ka jawab tez hai; chakkar phir bhi lagte hain.</p><p>KhanaKart ka menu bhi aise hi dheema ho sakta hai. Pehle chakkar ginte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🐢 Ek-ek price maangne ka safar",
      "goal": "tools/slowmo.js ka repeatable MODEL. Chaar keys; har request par tay 40 ms. Ye run WAN ya Redis benchmark nahi.",
      "nodes": [
        {
          "id": "app",
          "icon": "🍽️",
          "label": "menu-api",
          "x": 310,
          "y": 85
        },
        {
          "id": "cache",
          "icon": "🗃️",
          "label": "menu cache",
          "x": 310,
          "y": 245
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "cache"
        }
      ],
      "viz": {
        "w": 620,
        "h": 350,
        "focus": [
          "app",
          "cache"
        ]
      },
      "vars": [
        {
          "id": "calls",
          "label": "Bheji requests"
        },
        {
          "id": "ready",
          "label": "Mile prices"
        },
        {
          "id": "clock",
          "label": "Virtual clock"
        }
      ],
      "steps": [
        {
          "title": "MODEL: har request ka fixed wait 40 ms; sequential",
          "say": "Menu ke chaar prices alag-alag pata kiye ja sakte hain. Har request ka fixed wait 40 ms <b>model ka input</b> hai. Server ka kaam yahan alag se time nahi leta.",
          "clock": "0 ms",
          "vars": {
            "calls": "0",
            "ready": "0/4",
            "clock": "0 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "ask": {
            "q": "Ek-ek reply ke baad agla lookup bhejoge. Chaar baar 40 ms wait ka hisaab?",
            "choices": [
              "160 ms — har reply ke baad agla, toh chaar 40 ms jud jaate hain",
              "40 ms — data RAM mein hai, toh chaaron ka intezaar ek saath hota hai",
              "10 ms — chaar calls hain, toh 40 ms chaaron mein bant jaata hai",
            ],
            "answer": 0,
            "explain": "Har reply ke baad hi agla request jaata hai: 4 × 40 = 160 ms. Ek saath shuru karte toh intezaar overlap hota; ek-ek karke loop mein nahi hota. (Fixed-clock model ka hisaab hai, asli HTTP ka naap nahi.)",
            "hint": "Ek request ka wait agle request se overlap nahi ho raha.",
            "choiceExplanations": [
              "Har reply ke baad hi agla request jaata hai: 4 × 40 = 160 ms. Ek saath shuru karte toh intezaar overlap hota; ek-ek karke loop mein nahi hota. (Fixed-clock model ka hisaab hai, asli HTTP ka naap nahi.)",
              "Agla lookup pichhle reply ke baad hi shuru hota hai. Intezaar overlap nahi hota, judta hai.",
              "Zyada calls ek call ka intezaar baant-ti nahi. Har call apna 40 ms leti hai.",
            ],
          }
        },
        {
          "title": "bheje: dish-1",
          "say": "App ne agli key bheji. Is request ka reply aane tak agla lookup shuru nahi hota.",
          "clock": "0 ms",
          "vars": {
            "calls": "1",
            "ready": "0/4",
            "clock": "0 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "busy"
            }
          },
          "ask": {
            "q": "Request bhej di. Kya price abhi app ke paas aa gaya?",
            "choices": [
              "Request gayi hai, par reply abhi raaste mein hai",
              "Request bhejna aur reply milna ek hi pal ki baat hai",
              "Price server ki RAM mein hai, toh app ke paas bhi hai",
            ],
            "answer": 0,
            "explain": "Data server ke paas hona aur app ko data milna alag ghatnayein hain. Price tab milta hai jab reply aaye aur padha jaaye.",
            "hint": "Ready ki ginti reply aane par badhegi.",
            "choiceExplanations": [
              "Data server ke paas hona aur app ko data milna alag ghatnayein hain. Price tab milta hai jab reply aaye aur padha jaaye.",
              "Bhejna aur paana do alag ghatnayein hain. Price tab milta hai jab reply aa ke padha jaaye.",
              "Server ki RAM app ki RAM nahi. Beech mein network aur server ka kaam hai.",
            ],
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "mile: dish-1",
          "say": "Reply mila. App ke paas ab 1/4 values hain. Virtual clock 40 ms hai.",
          "clock": "40 ms",
          "vars": {
            "calls": "1",
            "ready": "1/4",
            "clock": "40 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "flows": [
            {
              "from": "cache",
              "to": "app",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "bheje: dish-2",
          "say": "App ne agli key bheji. Is request ka reply aane tak agla lookup shuru nahi hota.",
          "clock": "40 ms",
          "vars": {
            "calls": "2",
            "ready": "1/4",
            "clock": "40 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "mile: dish-2",
          "say": "Reply mila. App ke paas ab 2/4 values hain. Virtual clock 80 ms hai.",
          "clock": "80 ms",
          "vars": {
            "calls": "2",
            "ready": "2/4",
            "clock": "80 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "flows": [
            {
              "from": "cache",
              "to": "app",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "bheje: dish-3",
          "say": "App ne agli key bheji. Is request ka reply aane tak agla lookup shuru nahi hota.",
          "clock": "80 ms",
          "vars": {
            "calls": "3",
            "ready": "2/4",
            "clock": "80 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "mile: dish-3",
          "say": "Reply mila. App ke paas ab 3/4 values hain. Virtual clock 120 ms hai.",
          "clock": "120 ms",
          "vars": {
            "calls": "3",
            "ready": "3/4",
            "clock": "120 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "ask": {
            "q": "Teen prices mil gaye. Chauthi independent key ab bhejni hai. Menu poora hua?",
            "choices": [
              "Menu ko chaar prices chahiye, chauthi reply abhi baaki hai",
              "Teen prices se chautha price andaaze se nikal aayega",
              "Cache RAM mein hai, toh chautha price pehle se app ke paas",
            ],
            "answer": 0,
            "explain": "User ko chaar prices chahiye. Pehle teen replies ka intezaar jud chuka hai, aur chauthi ka abhi baaki hai.",
            "hint": "Ready 3/4 ka matlab ek value baaki.",
            "choiceExplanations": [
              "User ko chaar prices chahiye. Pehle teen replies ka intezaar jud chuka hai, aur chauthi ka abhi baaki hai.",
              "Chautha price independent hai — baaki teen se nahi nikalta.",
              "Remote cache ka data app tak apne aap copy nahi hota. Chauthi reply chahiye.",
            ],
          },
          "flows": [
            {
              "from": "cache",
              "to": "app",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "bheje: dish-4",
          "say": "App ne agli key bheji. Is request ka reply aane tak agla lookup shuru nahi hota.",
          "clock": "120 ms",
          "vars": {
            "calls": "4",
            "ready": "3/4",
            "clock": "120 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "mile: dish-4",
          "say": "Reply mila. App ke paas ab 4/4 values hain. Virtual clock 160 ms hai.",
          "clock": "160 ms",
          "vars": {
            "calls": "4",
            "ready": "4/4",
            "clock": "160 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "flows": [
            {
              "from": "cache",
              "to": "app",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Asha ka menu tayyar",
          "say": "Menu ki chaar values mil gayin. Total 4 request aur 160 ms fixed-clock wait. Har reply ka wait agle lookup ke raaste mein tha.",
          "clock": "160 ms",
          "vars": {
            "calls": "4",
            "ready": "4/4",
            "clock": "160 ms"
          },
          "nodes": {
            "app": {
              "tone": "ok"
            },
            "cache": {
              "tone": "ok"
            }
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Server ka data tez milta ho tab bhi ek-ek remote reply ka wait judta hai."
    },
    {
      "type": "cards",
      "title": "☕ Dhabe par ek-ek cheez laane jaana?",
      "goal": "Ek counter ki misaal se shuru karo. Technical naam aakhir mein.",
      "steps": [
        {
          "title": "1. List poori hai, phir baar-baar kyun jaana?",
          "say": "Asha ko chai, roti, dal aur lassi chahiye. Counter door hai. Runner chai poochh kar lautta hai, phir roti poochhne jaata hai.",
          "ask": {
            "q": "Runner ko saari independent cheezein pehle se pata hain. Pehla sudhaar?",
            "choices": [
              "Ek list le jaaye aur ek hi chakkar mein saari cheezein poochh aaye",
              "Har cheez ki parchi chhoti kare, par har cheez ke liye alag jaaye",
              "Counter par har sawaal jaldi poochhe, par har cheez ke liye alag jaaye",
            ],
            "answer": 0,
            "explain": "Cheezein pehle se pata hain aur counter list le sakta hai, toh ek chakkar ka kharcha poori list mein bant jaata hai.",
            "hint": "Chakkaron ki ginti dekho.",
            "choiceExplanations": [
              "Cheezein pehle se pata hain aur counter list le sakta hai, toh ek chakkar ka kharcha poori list mein bant jaata hai.",
              "Parchi chhoti hone se padhne ka waqt bach sakta hai. Door counter ke baar-baar chakkar phir bhi lagenge.",
              "Sawaal jaldi poochhne se counter ka kaam ghat sakta hai. Har cheez ka alag chakkar phir bhi lagega.",
            ],
          }
        },
        {
          "title": "2. Kya har list ek saath bhej sakte hain?",
          "say": "Agar doosra sawaal pehle jawab par depend kare, doosra sawaal pehle se pata nahi. Agar counter par packet ki hadd hai, list ko chhote hisson mein baanto."
        },
        {
          "title": "3. Ab naam: remote lookup, round trip aur batch",
          "say": "<b>Remote lookup</b>: doosre process/service se value maangna. <b>Round trip</b>: request jaaye aur reply laut aaye. <b>Batch</b>: kai independent keys ek request mein. Server ki memory tez ho sakti hai; app ko reply tak pahunchne ka kharcha alag hai."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Pehle repeat ho raha kharcha pakdo. Phir data aur requests ka kram badlo."
    },
    {
      "type": "dryrun",
      "title": "📦 Ek batch ka safar",
      "goal": "tools/slowmo.js ka repeatable MODEL. Chaar keys; har request par tay 40 ms. Ye run WAN ya Redis benchmark nahi.",
      "nodes": [
        {
          "id": "app",
          "icon": "🍽️",
          "label": "menu-api",
          "x": 310,
          "y": 85
        },
        {
          "id": "cache",
          "icon": "🗃️",
          "label": "menu cache",
          "x": 310,
          "y": 245
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "cache"
        }
      ],
      "viz": {
        "w": 620,
        "h": 350,
        "focus": [
          "app",
          "cache"
        ]
      },
      "vars": [
        {
          "id": "calls",
          "label": "Bheji requests"
        },
        {
          "id": "ready",
          "label": "Mile prices"
        },
        {
          "id": "clock",
          "label": "Virtual clock"
        }
      ],
      "steps": [
        {
          "title": "MODEL: har request ka fixed wait 40 ms; batch",
          "say": "Menu ke chaar prices alag-alag pata kiye ja sakte hain. Har request ka fixed wait 40 ms <b>model ka input</b> hai. Server ka kaam yahan alag se time nahi leta.",
          "clock": "0 ms",
          "vars": {
            "calls": "0",
            "ready": "0/4",
            "clock": "0 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "ask": {
            "q": "Chaar keys pehle se pata hain. Ek request chaar keys le sakti hai. Kitni request chahiye?",
            "choices": [
              "Ek request — chaaron keys pehle se pata hain, aur endpoint list leta hai",
              "Chaar requests — server ek request mein list sambhal hi nahi sakta",
              "Do requests — pehle reply se baaki keys pata chalengi, phir doosri",
            ],
            "answer": 0,
            "explain": "Keys independent aur pehle se pata hain, aur batch API chaar keys leti hai — ek request kaafi hai.",
            "hint": "Keys aur endpoint ka contract dekho.",
            "choiceExplanations": [
              "Keys independent aur pehle se pata hain, aur batch API chaar keys leti hai — ek request kaafi hai.",
              "Sawaal mein endpoint chaar keys leta hai. List chal jaayegi.",
              "Keys pehle se pata hain — kisi reply ka intezaar nahi karna.",
            ],
          }
        },
        {
          "title": "bheje: dish-1, dish-2, dish-3, dish-4",
          "say": "App ne chaar keys ek request mein bheji. Ab ek reply ka wait hai.",
          "clock": "0 ms",
          "vars": {
            "calls": "1",
            "ready": "0/4",
            "clock": "0 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "busy"
            }
          },
          "ask": {
            "q": "Request bhej di. Kya price abhi app ke paas aa gaya?",
            "choices": [
              "Chaar keys gayi hain, par reply abhi raaste mein hai",
              "Request jaate hi chaaron prices app ke paas aa gaye",
              "Prices RAM mein hain, toh bina network app ko mil gaye",
            ],
            "answer": 0,
            "explain": "Data server ke paas hona aur app ko data milna alag ghatnayein hain. Chaaron prices tab milte hain jab ek reply aaye aur padha jaaye.",
            "hint": "Ready ki ginti reply aane par badhegi.",
            "choiceExplanations": [
              "Data server ke paas hona aur app ko data milna alag ghatnayein hain. Chaaron prices tab milte hain jab ek reply aaye aur padha jaaye.",
              "Bhejna poora hua, paana nahi. Reply aane tak prices app ke paas nahi.",
              "RAM server ki hai. Beech ka network batch se bhi nahi hat-ta.",
            ],
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "mile: dish-1, dish-2, dish-3, dish-4",
          "say": "Reply mila. App ke paas ab 4/4 values hain. Virtual clock 40 ms hai.",
          "clock": "40 ms",
          "vars": {
            "calls": "1",
            "ready": "4/4",
            "clock": "40 ms"
          },
          "nodes": {
            "app": {
              "tone": "busy"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "flows": [
            {
              "from": "cache",
              "to": "app",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Asha ka menu tayyar",
          "say": "Menu ki chaar values mil gayin. Total 1 request aur 40 ms fixed-clock wait. Batch ne har key ka alag reply-wait hataaya.",
          "clock": "40 ms",
          "vars": {
            "calls": "1",
            "ready": "4/4",
            "clock": "40 ms"
          },
          "nodes": {
            "app": {
              "tone": "ok"
            },
            "cache": {
              "tone": "ok"
            }
          },
          "ask": {
            "q": "Is change mein chaar prices ko chhoda gaya?",
            "choices": [
              "Wahi chaar prices mile; bas requests ek mein jud gayi",
              "Batch ne teen prices chhod diye, sirf ek price bacha",
              "Cache saaf ho gaya, isliye kam replies wapas aayi",
            ],
            "answer": 0,
            "explain": "Batch ne zaroori data nahi ghataaya — request ka fixed kharcha ek baar laga, chaar baar nahi.",
            "hint": "Ready ki aakhri ginti dekho.",
            "choiceExplanations": [
              "Batch ne zaroori data nahi ghataaya — request ka fixed kharcha ek baar laga, chaar baar nahi.",
              "Ready 4/4 hai — chaaron prices mile. Kam requests ka matlab kam data nahi.",
              "Cache ko kisi ne nahi chhua. Badla sirf requests ka bantwaara.",
            ],
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Independent lookups ko ek bounded batch mein maangne se baar-baar ka wait bach sakta hai."
    },
    {
      "type": "docker",
      "title": "🧪 Wahi chakkar terminal mein",
      "project": "45-software-physics",
      "exercise": "ex0-slowmo",
      "goal": "Fixed-clock tool mein sequential aur batch compare karo. Service shuru nahi karni.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captures se hai. Docker compose abhi chalayi nahi gayi.",
      "steps": [
        {
          "text": "App root se sequential slow motion.",
          "cmd": "cd docker-labs/45-software-physics && node tools/slowmo.js --fast",
          "expect": "0 ms | MODEL: har request ka fixed wait 40 ms; sequential | calls=0 ready=0/4\n0 ms | bheje: dish-1 | calls=1 ready=0/4\n40 ms | mile: dish-1 | calls=1 ready=1/4\n40 ms | bheje: dish-2 | calls=2 ready=1/4\n80 ms | mile: dish-2 | calls=2 ready=2/4\n80 ms | bheje: dish-3 | calls=3 ready=2/4\n120 ms | mile: dish-3 | calls=3 ready=3/4\n120 ms | bheje: dish-4 | calls=4 ready=3/4\n160 ms | mile: dish-4 | calls=4 ready=4/4\n160 ms | Asha ka menu tayyar | calls=4 ready=4/4"
        },
        {
          "text": "Isi lab folder mein batch.",
          "cmd": "node tools/slowmo.js --batch --fast",
          "expect": "0 ms | MODEL: har request ka fixed wait 40 ms; batch | calls=0 ready=0/4\n0 ms | bheje: dish-1, dish-2, dish-3, dish-4 | calls=1 ready=0/4\n40 ms | mile: dish-1, dish-2, dish-3, dish-4 | calls=1 ready=4/4\n40 ms | Asha ka menu tayyar | calls=1 ready=4/4"
        }
      ],
      "observe": {
        "q": "Dono runs mein chaar prices mile. Batch mein fixed wait kyun ghata?",
        "choices": [
          "Chaar alag requests ki jagah ek request gayi — fixed wait ek hi baar",
          "RAM badh gayi, toh har lookup app ke andar hi ho gaya, bina network",
          "Batch ne server ka CPU chaar guna tez kar diya, isliye wait ghata",
        ],
        "answer": 0,
        "explain": "Wahi lookup helpers chale. Fixed request overhead ek baar laga, chaar baar nahi. (Har key ka kaam ab bhi hota hai — bas reply ka intezaar ek baar.)",
        "hint": "Ready aur calls dono dekho.",
        "choiceExplanations": [
          "Wahi lookup helpers chale. Fixed request overhead ek baar laga, chaar baar nahi. (Har key ka kaam ab bhi hota hai — bas reply ka intezaar ek baar.)",
          "Data wahi server par hai. Badla sirf requests ki ginti.",
          "Batch CPU tez nahi karta. Har key ka kaam ab bhi hota hai — bas reply ka intezaar ek baar.",
        ],
      },
      "lesson": "Output ki values aur request ginti dono milao; sirf elapsed number nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — pehle raasta, phir tool",
    "instructions": "KhanaKart ka haal dekho. Phir wajah ke saath jawab chuno. 🎤",
    "questions": [
      {
        "q": "Cache RAM mein hai. Kya remote access ka wait zero hai?",
        "choices": [
          "Raasta, server ka kaam aur reply ab bhi baaki hain",
          "RAM har jagah ek jaisi local hi hoti hai",
          "Await likhne se network ka intezaar mit jaata hai",
        ],
        "answer": 0,
        "explain": "Remote in-memory cache tez ho sakta hai, par network round trip aur data ko bhejne-padhne (serialize/parse) ka kharch rehta hai. Apni RAM padhna aur remote request alag kaam hain.",
        "hint": "Server aur app ke beech ka raasta dekho.",
        "choiceExplanations": [
          "Remote in-memory cache tez ho sakta hai, par network round trip aur data ko bhejne-padhne (serialize/parse) ka kharch rehta hai. Apni RAM padhna aur remote request alag kaam hain.",
          "RAM kis machine ki hai, yahi farak hai. Remote RAM ke beech network hai.",
          "await intezaar karta hai, doori nahi mitata.",
        ],
      },
      {
        "q": "Menu ke A aur B prices ki keys pehle se pata hain. C ki key A ke reply se milegi. Pehli batch mein kaun-si keys bhejoge?",
        "choices": [
          "A aur B bhejo; C ki key milne par C ko alag maango",
          "Sirf A bhejo; A ka reply aane par B aur C maango",
          "Sirf B bhejo; B ka reply aane par A aur C maango",
        ],
        "answer": 0,
        "explain": "A aur B ki keys ready hain, toh A aur B ek batch mein ja sakti hain. C ki key A ke reply ke baad milegi — C ko alag maango. Batch ko keys pehle chahiye.",
        "hint": "Har key ke liye dekho: key abhi pata hai, ya kis reply ke baad milegi?",
        "choiceExplanations": [
          "A aur B ki keys ready hain, toh A aur B ek batch mein ja sakti hain. C ki key A ke reply ke baad milegi — C ko alag maango. Batch ko keys pehle chahiye.",
          "B ki key pehle se ready hai. B ko A ke reply tak rokna zaroori nahi.",
          "B ka reply C ki key nahi deta. A pehle maangna padega; A ko B ke reply tak rokne ki zaroorat nahi.",
        ],
      }
    ]
  },
  "success": [
    "Repeat ho raha remote wait pehchaan sakte ho",
    "Fixed-clock model aur measurement alag bata sakte ho",
    "Independent keys ke bounded batch ka fayda samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Remote RAM local variable jaisi?",
      "back": "Nahi. Server ka local read aur app ka request/reply wait alag hain."
    },
    {
      "front": "Batch kya bachaata hai?",
      "back": "Independent keys ka repeated request overhead share karta hai. Required values phir bhi chahiye."
    },
    {
      "front": "Kab seedha batch nahi?",
      "back": "Jab agli key pichhle reply par depend kare, ya endpoint/batch-size contract allow na kare."
    }
  ]
}
]);
})();
