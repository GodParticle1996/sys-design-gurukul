/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Software (dDOKu20juEc), numbered video 1/15.
   Evidence: docker-labs/45-software-physics/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🍽️", "label": "KhanaKart", "x": 140, "y": 105}, {"id": "path", "icon": "🛣️", "label": "raasta", "x": 445, "y": 105}, {"id": "data", "icon": "🗃️", "label": "data", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "path"}, {"from": "path", "to": "data"}];
VISUALS["fp-physics-kyun"] = { t: 'Pehle wait, kaam aur data ka raasta samjho. Phir design chuno.',
  html: SD.viz.svg(HERO, EDGES, {nodes:{app:{tone:'acc',badge:'sawaal pehle'},path:{tone:'slow',badge:'wait gino'},data:{tone:'ok',badge:'kaam gino'}}}, {w:890,h:215}) };
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
      "goal": "tools/slowmo.js ka repeatable MODEL. Chaar keys; har request par tay 40 ms. Yeh WAN ya Redis benchmark nahi.",
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
            "choices": ["160 ms; four serial 40 ms waits add honge","40 ms; four requests ke waits overlap honge","10 ms; four lookups fixed wait divide karenge"],
            "answer": 0,
            "explain": "Given each reply await karne ke baad next request starts, 4 × 40 = 160 ms fixed wait hai. Overlap concurrent start mein hota; sequential loop mein nahi. More serial calls per-call latency ko divide nahi karti.",
            "hint": "Ek request ka wait agle request se overlap nahi ho raha."
          , choiceExplanations: ["Given each reply await karne ke baad next request starts, 4 × 40 = 160 ms fixed wait hai.","Overlap concurrent start mein hota; sequential loop mein nahi.","More serial calls per-call latency ko divide nahi karti."] }
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
            "choices": ["Nahi; send ke baad reply ka wait abhi baaki","Haan; send completion reply receive ka proof hai","Haan; remote RAM ko caller direct read kar leta"],
            "answer": 0,
            "explain": "Send request transmission ka event hai; price tab available hai jab response receive/parse ho. Sending aur receiving distinct network events hain. Remote memory access transport aur service work maangta hai.",
            "hint": "Ready ki ginti reply aane par badhegi."
          , choiceExplanations: ["Send request transmission ka event hai; price tab available hai jab response receive/parse ho.","Sending aur receiving distinct network events hain.","Remote memory access transport aur service work maangta hai."] },
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
            "choices": ["Nahi; fourth key ka response abhi missing hai","Haan; three replies remaining price confirm karti","Haan; remote cached value app memory mein bhi hai"],
            "answer": 0,
            "explain": "Menu contract four values ka hai, isliye fourth response required hai. Independent missing value others se derive nahi hoti. Remote cache data caller tak automatically copy nahi hoti.",
            "hint": "Ready 3/4 ka matlab ek value baaki."
          , choiceExplanations: ["Menu contract four values ka hai, isliye fourth response required hai.","Independent missing value others se derive nahi hoti.","Remote cache data caller tak automatically copy nahi hoti."] },
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
            "choices": ["Known independent keys ek list mein poochho","Har lookup ke pehle connection dobara kholo","Same serial calls par retry count badhaao"],
            "answer": 0,
            "explain": "Keys pehle se known aur bulk endpoint supported ho toh batching repeated fixed trips reduce kar sakti hai. New connections setup cost add kar sakte hain. Retries correct serial flow ko fewer round trips nahi banati.",
            "hint": "Chakkaron ki ginti dekho."
          , choiceExplanations: ["Keys pehle se known aur bulk endpoint supported ho toh batching repeated fixed trips reduce kar sakti hai.","New connections setup cost add kar sakte hain.","Retries correct serial flow ko fewer round trips nahi banati."] }
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
      "goal": "tools/slowmo.js ka repeatable MODEL. Chaar keys; har request par tay 40 ms. Yeh WAN ya Redis benchmark nahi.",
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
            "choices": ["Ek bulk request mein chaar known keys maango","Chaar requests; server bulk list process nahi karega","Do requests; first response next keys dega"],
            "answer": 0,
            "explain": "Prompt endpoint four keys accept karta aur keys already known batata hai, isliye one batch sufficient hai. Given contract bulk operation allow karta hai. Data dependency prompt mein explicitly absent hai.",
            "hint": "Keys aur endpoint ka contract dekho."
          , choiceExplanations: ["Prompt endpoint four keys accept karta aur keys already known batata hai, isliye one batch sufficient hai.","Given contract bulk operation allow karta hai.","Data dependency prompt mein explicitly absent hai."] }
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
            "choices": ["Nahi; response receive hona abhi baaki hai","Haan; request send hote hi response complete hai","Haan; RAM value caller ko bina network milti hai"],
            "answer": 0,
            "explain": "Caller ke paas result tab aata hai jab remote service response return kare; outgoing request alone sufficient nahi. Send completion inbound response completion nahi. RAM placement remote boundary ko eliminate nahi karti.",
            "hint": "Ready ki ginti reply aane par badhegi."
          , choiceExplanations: ["Caller ke paas result tab aata hai jab remote service response return kare; outgoing request alone sufficient nahi.","Send completion inbound response completion nahi.","RAM placement remote boundary ko eliminate nahi karti."] },
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
            "choices": ["Nahi; four values same, request grouping badli","Haan; batching ne teen required values drop ki","Haan; cache clear karne se fewer replies aayi"],
            "answer": 0,
            "explain": "Comparison same four values retrieve karta hai; batching control flow aur request count badalti hai. Fewer requests fewer returned values ke barabar nahi. Cache deletion is change ka part nahi.",
            "hint": "Ready ki aakhri ginti dekho."
          , choiceExplanations: ["Comparison same four values retrieve karta hai; batching control flow aur request count badalti hai.","Fewer requests fewer returned values ke barabar nahi.","Cache deletion is change ka part nahi."] }
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
        "choices": ["One batch ne four serial round trips replace kiye","RAM capacity badhi; har lookup locally serve hua","Batch ne server CPU time ko four se divide kiya"],
        "answer": 0,
        "explain": "Same keys grouped hone se per-request fixed waiting repeatedly pay nahi karni padti; per-key work ab bhi ho sakta hai. Storage placement unchanged hai. Batching har CPU component ko proportional faster guarantee nahi karti.",
        "hint": "Ready aur calls dono dekho."
      , choiceExplanations: ["Same keys grouped hone se per-request fixed waiting repeatedly pay nahi karni padti; per-key work ab bhi ho sakta hai.","Storage placement unchanged hai.","Batching har CPU component ko proportional faster guarantee nahi karti."] },
      "lesson": "Output ki values aur request ginti dono milao; sirf elapsed number nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — pehle raasta, phir tool",
    "instructions": "KhanaKart ka haal dekho. Phir wajah ke saath jawab chuno. 🎤",
    "questions": [
      {
        "q": "Cache RAM mein hai. Kya remote access ka wait zero hai?",
        "choices": ["Nahi; transport aur reply processing ab bhi hai","Haan; RAM means caller ke same address space mein","Haan; await remote network latency hata deta hai"],
        "answer": 0,
        "explain": "Remote in-memory storage fast service de sakti hai, lekin network round trip aur serialization cost remain karti hai. RAM physical placement locality define nahi karti. Await waiting ko represent karta hai, distance remove nahi.",
        "hint": "Server aur app ke beech ka raasta dekho."
      , choiceExplanations: ["Remote in-memory storage fast service de sakti hai, lekin network round trip aur serialization cost remain karti hai.","RAM physical placement locality define nahi karti.","Await waiting ko represent karta hai, distance remove nahi."] },
      {
        "q": "Ek item ke reply se agle item ki key milti hai. Seedha batch?",
        "choices": ["Pehle dependency resolve karo; next key unknown hai","Unknown keys list mein daal do; server infer karega","Sab calls start karo; next key result ki need nahi"],
        "answer": 0,
        "explain": "Agar response se next key aati hai toh ordinary client batching ke liye inputs pehle available nahi. Generic bulk API missing business key infer nahi karti. Data dependency ko concurrency syntax remove nahi karta.",
        "hint": "Doosri key kab pata chalti hai?"
      , choiceExplanations: ["Agar response se next key aati hai toh ordinary client batching ke liye inputs pehle available nahi.","Generic bulk API missing business key infer nahi karti.","Data dependency ko concurrency syntax remove nahi karta."] }
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
