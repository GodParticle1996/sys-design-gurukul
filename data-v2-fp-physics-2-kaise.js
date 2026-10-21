/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Software (dDOKu20juEc), numbered video 1/15.
   Evidence: docker-labs/45-software-physics/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🍽️", "label": "KhanaKart", "x": 140, "y": 105}, {"id": "path", "icon": "🛣️", "label": "raasta", "x": 445, "y": 105}, {"id": "data", "icon": "🗃️", "label": "data", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "path"}, {"from": "path", "to": "data"}];
VISUALS["fp-physics-kaise"] = { t: 'Pehle wait, kaam aur data ka raasta samjho. Phir design chuno.',
  html: SD.viz.svg(HERO, EDGES, {nodes:{app:{tone:'acc',badge:'sawaal pehle'},path:{tone:'slow',badge:'wait gino'},data:{tone:'ok',badge:'kaam gino'}}}, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-physics-kaise",
  "icon": "⚙️",
  "group": "🧪 Physics of Software",
  "title": "Physics 2 · Kaise — wait, bytes aur line ka hisaab",
  "badge": "Wait Khoji",
  "objectives": [
    "Chhoti aur badi reply ko bandwidth alag kyun affect karti hai?",
    "Request wait aur CPU wait ek hi cheez hain?",
    "Worker ka time aur user ka total time kaise alag hain?",
    "Little’s Law mein kaunse averages multiply karte hain?"
  ],
  "lesson": [
    "<h3>🚲 Sadak chaudi kar di. Bike ki doori bhi ghati?</h3><p>Chhoti parchi ka safar aur poori rasoi ka samaan bhejna alag dikkat hain. KhanaKart ko pehle samajhna hai: wait raaste ka hai, data bhejne ka hai, ya worker ki line ka?</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🚲 Sadak chaudi hui. Kya safar ki doori ghati?",
      "goal": "tools/math.js ka HISAAB. Ideal link; fixed 40 ms wait. Decimal 1 MB = 1,000,000 bytes. Overhead aur queue is model mein nahi.",
      "steps": [
        {
          "title": "1. Chhoti reply: zyada bandwidth se kitna wait bachega?",
          "say": "Maana reply 1000 bytes hai. Fixed component 40 ms hai. Link 100 Mbps se 1000 Mbps karte hain.",
          "ask": {
            "q": "Kya link das guna wide hone se poora response das guna tez ho jayega?",
            "choices": [
              "Nahi; fixed 40 ms component ab bhi hai",
              "Haan; har latency bandwidth se divide hoti hai",
              "Haan; data ki doori gayab"
            ],
            "answer": 0,
            "explain": "Is ideal model mein 40.080 ms se 40.008 ms. Tiny payload ka serialization pehle hi chhota tha.",
            "hint": "Fixed component aur bytes bhejne ka time alag karo."
          }
        },
        {
          "title": "2. Bade packet par farak ab dikha?",
          "say": "<pre>1,000,000 B @ 100 Mbps: 120.000 ms\n1,000,000 B @ 1000 Mbps: 48.000 ms</pre>Wahi fixed 40 ms hai. Payload bhejne ka hisaab 80 ms se 8 ms hua. Isliye bade response ko zyada bandwidth se kaafi fayda ho sakta hai."
        },
        {
          "title": "3. Formula mein bits aur bytes ka dhyaan?",
          "say": "<code>time = fixed wait + bytes × 8 / bits-per-second</code>. Bytes ko bits mein badlo. Seconds ko ms mein badlo. Yeh simplified completion-time model hai; real TCP/HTTP path mein handshake, headers, retransmit aur queue bhi aa sakte hain."
        },
        {
          "title": "4. Latency aur bandwidth ka matlab ab?",
          "say": "<b>Latency</b>: defined operation ko complete hone ka waqt; yahan poori reply milne tak. <b>Bandwidth</b>: link ki data-carrying capacity. <b>Throughput</b>: actual bytes ya operations per second. Measure karte waqt unit aur boundary saaf bolo."
        },
        {
          "title": "5. Kya zyada bandwidth latency kabhi ghataati hi nahi?",
          "say": "<b>⚠️ Ek aam galatfehmi:</b> bandwidth ka latency se koi lena-dena nahi. Serialization aur congestion/queue time ghatt sakta hai. Par sirf link wide karne se distance wala propagation delay apne aap nahi mitta. Har fixed wait ko speed of light bhi mat kaho: service processing aur protocol waits bhi ho sakte hain."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Chhoti reply mein fixed wait, badi reply mein bytes bhejne ka waqt bhaari ho sakta hai. Pehle dono alag gino."
    },
    {
      "type": "cards",
      "title": "⏱️ CPU ki ghadi ko insaan ki ghadi banayein?",
      "goal": "tools/math.js ka HISAAB. Maana 3 GHz; hardware benchmark nahi. Nanosecond = second ka arabwaan hissa.",
      "steps": [
        {
          "title": "1. 3 GHz ka ek cycle kitna?",
          "say": "3 GHz = 3 arab cycles per second. Ek cycle = 1 / 3,000,000,000 second ≈ 0.333 ns. Yeh assumed frequency ka hisaab hai; is machine ka CPU measure nahi kiya."
        },
        {
          "title": "2. Ek cycle ko ek human second maana. 100 ns kitne?",
          "say": "Assumed delay 100 ns hai. Scale badalne par delay ke cycles ki ginti human seconds banegi.",
          "ask": {
            "q": "100 ns × 3 cycles/ns ka natija?",
            "choices": [
              "300 human seconds",
              "100 human seconds",
              "0.333 human seconds"
            ],
            "answer": 0,
            "explain": "Har number ko ek hi frequency aur scale se convert karo.",
            "hint": "100 ko 3 se multiply karo; ns cancel ho jayega."
          }
        },
        {
          "title": "3. 150 ms ka scale kya nikla?",
          "say": "<pre>150 ms = 0.150 s\n0.150 × 3,000,000,000 = 450,000,000 cycles\n1 cycle = 1 human second → 14.27 human years</pre>365-day year maana hai. 150 ms bhi chosen example hai; kisi route ki measured RTT nahi."
        },
        {
          "title": "4. Request wait kar rahi hai. Kya poora CPU bhi?",
          "say": "<b>⚠️ Ek aam galatfehmi:</b> <code>await</code> likha toh CPU saalon tak kuch nahi karega. Async request reply ka wait karti hai; event loop doosre ready kaam chala sakta hai. Client wall time, CPU time aur concurrency alag metrics hain. Local variable, CPU cache aur remote cache ko ek hi operation mat samjho."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Scale analogy wait ko mehsoos karati hai. Real hardware timing aur CPU usage phir bhi alag measure karne padte hain."
    },
    {
      "type": "dryrun",
      "title": "🍳 Ek worker, orders ki line",
      "goal": "tools/queue-slowmo.js ka MODEL: arrivals 0/50/100/150 ms, work 100 ms. Ek click ek event. Same clock par end → arrival → start dikhate hain; real timing measurement nahi.",
      "nodes": [
        {
          "id": "line",
          "icon": "🧾",
          "label": "wait line",
          "x": 310,
          "y": 85
        },
        {
          "id": "worker",
          "icon": "🍳",
          "label": "ek worker",
          "x": 310,
          "y": 245
        }
      ],
      "edges": [
        {
          "from": "line",
          "to": "worker"
        }
      ],
      "viz": {
        "w": 620,
        "h": 350,
        "focus": [
          "line",
          "worker"
        ]
      },
      "vars": [
        {
          "id": "wait",
          "label": "Line mein"
        },
        {
          "id": "active",
          "label": "Worker par"
        },
        {
          "id": "inside",
          "label": "Andar kul"
        },
        {
          "id": "done",
          "label": "Poore orders"
        }
      ],
      "steps": [
        {
          "title": "#1 aaya",
          "say": "Order #1 aaya. Order #1 pehle line mein dikhega. Worker ka alag shuru event agle click par hoga.",
          "clock": "0 ms",
          "vars": {
            "wait": [
              "wait:#1"
            ],
            "active": [
              "free"
            ],
            "inside": "1",
            "done": "0"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "ok"
            }
          },
          "ask": {
            "q": "Ek worker 100 ms lega. Doosra order 50 ms par aayega. Kya doosre order ko turant worker milega?",
            "choices": [
              "Nahi; pehla order abhi kaam mein hoga",
              "Haan; arrival ka matlab kaam shuru",
              "Haan; RAM free hai"
            ],
            "answer": 0,
            "explain": "Worker available hona aur request receive hona alag events hain.",
            "hint": "Pehle order ka completion 100 ms par hai."
          }
        },
        {
          "title": "#1 shuru",
          "say": "Worker ne order #1 shuru kiya. Order #1 line se nikla; system se nahi. Kaam model ke 100 ms leta hai.",
          "clock": "0 ms",
          "vars": {
            "wait": [
              "free"
            ],
            "active": [
              "busy:#1"
            ],
            "inside": "1",
            "done": "0"
          },
          "nodes": {
            "line": {
              "tone": "idle"
            },
            "worker": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "line",
              "to": "worker",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#2 aaya",
          "say": "Order #2 aaya. Order #2 pehle line mein dikhega. Worker ka alag shuru event agle click par hoga.",
          "clock": "50 ms",
          "vars": {
            "wait": [
              "wait:#2"
            ],
            "active": [
              "busy:#1"
            ],
            "inside": "2",
            "done": "0"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "busy"
            }
          }
        },
        {
          "title": "#1 poora",
          "say": "Order #1 ka kaam poora hua. Order #1 ab system se nikla. Waiting order ko worker ka agla shuru event milega.",
          "clock": "100 ms",
          "vars": {
            "wait": [
              "wait:#2"
            ],
            "active": [
              "free"
            ],
            "inside": "1",
            "done": "1"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "ok"
            }
          }
        },
        {
          "title": "#3 aaya",
          "say": "Order #3 aaya. Order #3 pehle line mein dikhega. Worker ka alag shuru event agle click par hoga.",
          "clock": "100 ms",
          "vars": {
            "wait": [
              "wait:#2",
              "wait:#3"
            ],
            "active": [
              "free"
            ],
            "inside": "2",
            "done": "1"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "ok"
            }
          }
        },
        {
          "title": "#2 shuru",
          "say": "Order #2 50 ms par aaya tha. Start ab 100 ms par hua. Order #2 ne 50 ms line mein wait kiya; worker ka 100 ms kaam ab shuru hai.",
          "clock": "100 ms",
          "vars": {
            "wait": [
              "wait:#3"
            ],
            "active": [
              "busy:#2"
            ],
            "inside": "2",
            "done": "1"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "busy"
            }
          },
          "ask": {
            "q": "Order #2 ko 50 ms wait aur 100 ms kaam mila. User ka total time?",
            "choices": [
              "150 ms",
              "100 ms; sirf worker ka time gino",
              "50 ms; sirf wait gino"
            ],
            "answer": 0,
            "explain": "Total residence = queue wait + service. #2 ka end 200 ms, arrival 50 ms.",
            "hint": "End − arrival socho."
          },
          "flows": [
            {
              "from": "line",
              "to": "worker",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#4 aaya",
          "say": "Worker order #2 par busy hai. Order #3 aur order #4 line mein hain. Ab system mein 3 orders hain: ek active, do waiting.",
          "clock": "150 ms",
          "vars": {
            "wait": [
              "wait:#3",
              "wait:#4"
            ],
            "active": [
              "busy:#2"
            ],
            "inside": "3",
            "done": "1"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "busy"
            }
          },
          "ask": {
            "q": "System ke andar 3 orders ka matlab 3 orders ek saath cook ho rahe hain?",
            "choices": [
              "Nahi; sirf ek worker busy hai, do waiting",
              "Haan; queue bhi worker hai",
              "Haan; sabka service time zero hai"
            ],
            "answer": 0,
            "explain": "In-system count aur active-work count ko alag dekho.",
            "hint": "Active aur waiting rows dono padho."
          }
        },
        {
          "title": "#2 poora",
          "say": "Order #2 ka kaam poora hua. Order #2 ab system se nikla. Waiting order ko worker ka agla shuru event milega.",
          "clock": "200 ms",
          "vars": {
            "wait": [
              "wait:#3",
              "wait:#4"
            ],
            "active": [
              "free"
            ],
            "inside": "2",
            "done": "2"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "ok"
            }
          }
        },
        {
          "title": "#3 shuru",
          "say": "Worker ne order #3 shuru kiya. Order #3 line se nikla; system se nahi. Kaam model ke 100 ms leta hai.",
          "clock": "200 ms",
          "vars": {
            "wait": [
              "wait:#4"
            ],
            "active": [
              "busy:#3"
            ],
            "inside": "2",
            "done": "2"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "line",
              "to": "worker",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#3 poora",
          "say": "Order #3 ka kaam poora hua. Order #3 ab system se nikla. Waiting order ko worker ka agla shuru event milega.",
          "clock": "300 ms",
          "vars": {
            "wait": [
              "wait:#4"
            ],
            "active": [
              "free"
            ],
            "inside": "1",
            "done": "3"
          },
          "nodes": {
            "line": {
              "tone": "slow"
            },
            "worker": {
              "tone": "ok"
            }
          }
        },
        {
          "title": "#4 shuru",
          "say": "Worker ne order #4 shuru kiya. Order #4 line se nikla; system se nahi. Kaam model ke 100 ms leta hai.",
          "clock": "300 ms",
          "vars": {
            "wait": [
              "free"
            ],
            "active": [
              "busy:#4"
            ],
            "inside": "1",
            "done": "3"
          },
          "nodes": {
            "line": {
              "tone": "idle"
            },
            "worker": {
              "tone": "busy"
            }
          },
          "flows": [
            {
              "from": "line",
              "to": "worker",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#4 poora",
          "say": "400 ms par aakhri order bhi poora hua. System phir khaali hai. Ab poore window ka hisaab nikaal sakte hain; peak ke screenshot se average nahi milta.",
          "clock": "400 ms",
          "vars": {
            "wait": [
              "free"
            ],
            "active": [
              "free"
            ],
            "inside": "0",
            "done": "4"
          },
          "nodes": {
            "line": {
              "tone": "idle"
            },
            "worker": {
              "tone": "ok"
            }
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Request ko receive karna, kaam shuru karna aur complete karna alag events hain. User ke time mein queue ka wait bhi judta hai."
    },
    {
      "type": "cards",
      "title": "🧮 Peak 3 tha. Average 1.75 kaise?",
      "goal": "tools/queue.js ki exact finite-window accounting. General averages ka rule <a href=\"https://live.ocw.mit.edu/courses/6-02-introduction-to-eecs-ii-digital-communication-systems-fall-2012/40abf69fd6895d82e1e249f68e3eedbd_xa38Q2_pnlQ.pdf\" target=\"_blank\" rel=\"noopener\">MIT OCW</a> se; yeh lab schedule model hai.",
      "steps": [
        {
          "title": "1. Har order ne system mein kitna waqt diya?",
          "say": "<pre>#1: 100 ms · #2: 150 ms\n#3: 200 ms · #4: 250 ms\nKul: 700 request-ms</pre>Chaar orders ka average residence W = 700 / 4 = 175 ms. Sirf worker ka 100 ms nahi; waiting bhi gini."
        },
        {
          "title": "2. Poore 400 ms mein average kitne orders andar?",
          "say": "System empty se shuru hua aur 400 ms par empty hua. Time-weighted occupancy = 700 request-ms / 400 ms = <b>1.75 requests</b>. Peak ek pal par 3 tha.",
          "ask": {
            "q": "Average 1.75 ka matlab har screenshot mein 1.75 request hogi?",
            "choices": [
              "Nahi; yeh poore window ka time-average hai",
              "Haan; requests tukdon mein aati hain",
              "Haan; peak bhi 1.75 tha"
            ],
            "answer": 0,
            "explain": "Actual count 0, 1, 2 ya 3 tha. Har count par guzra waqt average mein aata hai.",
            "hint": "Peak aur time-average ko alag rakho."
          }
        },
        {
          "title": "3. Ab Little’s Law ka naam aur units",
          "say": "<code>L = lambda × W</code>. Is complete-window example mein lambda = 4 / 0.4 s = 10/s. W = 0.175 s. Hisaab: 10 × 0.175 = 1.75. <b>L</b> average andar; <b>lambda</b> same boundary ka flow rate; <b>W</b> mean residence. General use mein suitable stable/long-run averages chahiye. Yeh finite model empty boundaries ki wajah se exact area identity dikhata hai."
        },
        {
          "title": "4. Formula se queue ko aur bada kar dein?",
          "say": "Queue+worker boundary lo toh W mein queue wait hai. Sirf worker boundary lo toh W service hai; L aur rate bhi usi boundary ke hon. Burst ke offered RPS, p99 aur average L ko mix mat karo. Queue ka cap badhaane se worker tez nahi hota. Kam kaam, safe processing capacity, ya excess arrivals par admission control dekho."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Pehle boundary aur averages match karo. Formula throughput limit ya har pal ki occupancy apne aap nahi batata."
    },
    {
      "type": "docker",
      "title": "🧮 Dono hisaab khud chalao",
      "project": "45-software-physics",
      "exercise": "ex3-queue",
      "goal": "Network arithmetic aur queue schedule dono local tools hain. Koi live service ya cloud nahi.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captures se hai. Docker compose abhi chalayi nahi gayi.",
      "steps": [
        {
          "text": "App root se units aur transfer-time hisaab.",
          "cmd": "cd docker-labs/45-software-physics && node tools/math.js",
          "expect": "HISAAB: decimal bytes; fixed wait 40 ms; ideal link; no overhead/queue\n1000 B @ 100 Mbps: 40.080 ms\n1000 B @ 1000 Mbps: 40.008 ms\n1000000 B @ 100 Mbps: 120.000 ms\n1000000 B @ 1000 Mbps: 48.000 ms\nHISAAB: maana 3 GHz; 1 cycle ko 1 human second; 365-day year\n1 cycle = 0.333 ns\n100 ns = 300 human seconds\n150 ms = 14.27 human years\nYEH scenario inputs hain; hardware timings measure nahi kiye.\nHISAAB: kalpanik cost units/GiB: origin=1, cache=20; AWS price NAHI\norigin 100 GiB + sabka cache: 2100 units\norigin 100 GiB + hot 5 GiB cache: 200 units"
        },
        {
          "text": "Isi lab folder se queue ki poori accounting.",
          "cmd": "node tools/queue.js",
          "expect": "MODEL: arrivals 0,50,100,150 ms; 1 worker; work 100 ms\n#1: aaya=0 start=0 end=100 wait=0 total=100 ms\n#2: aaya=50 start=100 end=200 wait=50 total=150 ms\n#3: aaya=100 start=200 end=300 wait=100 total=200 ms\n#4: aaya=150 start=300 end=400 wait=150 total=250 ms\npoora window=400 ms; area=700 request-ms; peak=3\nhisaab: lambda=10.00/s W=175.00 ms L=1.75\ncheck: 1.75 = 1.75 (averages; har pal ki ginti nahi)"
        }
      ],
      "observe": {
        "q": "W=175 ms ko 100 ms worker time se replace karke wahi system-average L nikaal sakte hain?",
        "choices": [
          "Nahi; system boundary mein waiting bhi W ka hissa hai",
          "Haan; queue mein time count nahi hota",
          "Haan; W hamesha CPU time hai"
        ],
        "answer": 0,
        "explain": "Queue+worker ki boundary ka W arrival se completion tak hai.",
        "hint": "Order #4 ka wait 150 ms aur total 250 ms dekho."
      },
      "lesson": "Units, boundary aur average ki definition calculation se pehle likho."
    }
  ],
  "interview": {
    "title": "Interview Round — pehle raasta, phir tool",
    "instructions": "KhanaKart ka haal dekho. Phir wajah ke saath jawab chuno. 🎤",
    "questions": [
      {
        "q": "Same boundary par rate 10/s aur mean residence 0.175 s hai. Average inside?",
        "choices": [
          "1.75 requests",
          "1750 requests",
          "Har pal exactly 3 requests"
        ],
        "answer": 0,
        "explain": "10/s × 0.175 s = 1.75. Peak ya instantaneous count nahi.",
        "hint": "Milliseconds ko seconds mein badlo."
      },
      {
        "q": "Chhoti reply ka fixed path wait bada hai. Bas bandwidth das guna karne par response bhi das guna tez?",
        "choices": [
          "Zaroori nahi; sirf serialization wala hissa directly ghatta hai",
          "Haan; wait bhi hamesha bandwidth se divide hota hai",
          "Haan; queue aur distance dono zero"
        ],
        "answer": 0,
        "explain": "Is arithmetic example mein 40.080 se 40.008 ms hua. Real components measure karo.",
        "hint": "Fixed component ko alag rakho."
      }
    ]
  },
  "success": [
    "Wait aur payload-transfer time alag nikaal sakte ho",
    "Nanosecond aur GHz ka consistent hisaab kar sakte ho",
    "Waiting aur service alag dikhate ho",
    "Little’s Law ko matching averages par lagate ho"
  ],
  "cards": [
    {
      "front": "Little’s Law ka W?",
      "back": "Same boundary mein mean residence time. Queue+worker lo toh waiting + service. p99 nahi."
    },
    {
      "front": "L=1.75 ka matlab?",
      "back": "Time-average occupancy. Peak ya har instant ka count nahi."
    },
    {
      "front": "More bandwidth har latency mita degi?",
      "back": "Serialization/queue time ghatt sakta hai. Fixed propagation/path wait apne aap nahi mitta."
    }
  ]
}
]);
})();
