/* First Principles — FAANG Senior Engineer.
   Source credit: Kafka vs RabbitMQ vs SQS — Async System (mQf7RtBuiaY), numbered video 11/15.
   Evidence: docker-labs/61-queues/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "user", "icon": "🙋", "label": "User", "x": 110, "y": 170}, {"id": "web", "icon": "🖥️", "label": "Web server", "x": 330, "y": 170}, {"id": "q", "icon": "📮", "label": "Queue", "x": 560, "y": 60}, {"id": "work", "icon": "⚙️", "label": "Email worker", "x": 780, "y": 170}, {"id": "side", "icon": "🐢", "label": "Image + email + index", "x": 560, "y": 300}];
const EDGES = [{"from": "user", "to": "web"}, {"from": "web", "to": "q"}, {"from": "q", "to": "work"}, {"from": "web", "to": "side"}];
VISUALS["fp-async-kyun"] = { t: "Sync: user side effects ka intezaar karta hai. Async: queue mein daalo, turant jawab; worker apni raftaar se.", html: SD.viz.svg(HERO, EDGES, { nodes: { user: {tone:'ok',badge:'turant'}, web: {tone:'ok',badge:'enqueue'}, q: {tone:'busy',badge:'backlog'}, work: {tone:'busy',badge:'10/sec'}, side: {tone:'idle',badge:'baad mein'} } }, {w:900,h:380}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-async-kyun",
  "icon": "📩",
  "group": "📮 Async: Queue vs Stream",
  "title": "Async 1 · Kyun — phone call, text message aur backlog",
  "badge": "Samay Ka Saudagar",
  "objectives": [
    "Temporal coupling: sync mein spike kyun girata hai",
    "Load leveling: queue spike ko samay mein phailaati hai",
    "Backlog kab khatam hota hai, aur retention"
  ],
  "lesson": [
    "<h3>📞 Phone ya message?</h3><p>Tum dost ko phone karte ho: dost meeting mein hai, toh baat nahi hoti. Dost ko kuch dhoondhna pade, toh tum line par ruke rehte ho, kisi aur ko phone nahi kar sakte.</p><p>Message bhejo toh tum apna kaam karte raho; dost fursat mein padhega. Par dost ke paas din bhar mein 10 message padhne ka hi samay ho aur 1,000 aa jaayein, toh jawab kab aayega?</p><p>Aaj dono baatein: message (queue) ka faayda, aur dost (worker) ki raftaar ka hisaab.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📞 Phone call vs 📩 text message — 60 second ka spike",
      "goal": "Lab 61 ex0 (model): signups 10/sec, phir 60 s ke liye 1,000/sec. Sync mein har signup web thread ko 2 s pakadta hai (image, email, index sab andar), 100 threads. Async mein web server sirf queue mein daalta hai.",
      "nodes": [
        {
          "id": "user",
          "icon": "🙋",
          "label": "User",
          "x": 110,
          "y": 170
        },
        {
          "id": "web",
          "icon": "🖥️",
          "label": "Web server",
          "x": 330,
          "y": 170
        },
        {
          "id": "q",
          "icon": "📮",
          "label": "Queue",
          "x": 560,
          "y": 60
        },
        {
          "id": "work",
          "icon": "⚙️",
          "label": "Email worker",
          "x": 780,
          "y": 170
        },
        {
          "id": "side",
          "icon": "🐢",
          "label": "Image + email + index",
          "x": 560,
          "y": 300
        }
      ],
      "edges": [
        {
          "from": "user",
          "to": "web"
        },
        {
          "from": "web",
          "to": "q"
        },
        {
          "from": "q",
          "to": "work"
        },
        {
          "from": "web",
          "to": "side"
        }
      ],
      "viz": {
        "w": 900,
        "h": 380
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "ok",
          "label": "User ko jawab"
        },
        {
          "id": "later",
          "label": "Kaam kab"
        }
      ],
      "steps": [
        {
          "title": "Sync: phone call",
          "clock": "sync",
          "say": "User ruka hai jab tak saare side effects khatam na hon. 100 threads ÷ 2 s = 50 signups/sec ki kshamata.",
          "nodes": {
            "user": {
              "tone": "busy",
              "badge": "spinner"
            },
            "web": {
              "tone": "busy",
              "badge": "100 threads busy"
            },
            "q": {
              "tone": "idle",
              "badge": ""
            },
            "work": {
              "tone": "idle",
              "badge": ""
            },
            "side": {
              "tone": "busy",
              "badge": "2 s"
            }
          },
          "vars": {
            "way": "sync",
            "ok": "2 s baad",
            "later": "—"
          },
          "flows": [
            {
              "from": "user",
              "to": "web",
              "label": "signup",
              "tone": "acc"
            },
            {
              "from": "web",
              "to": "side",
              "label": "intezaar",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Spike, sync",
          "clock": "spike",
          "say": "1,000/sec aaye, 50/sec chal sakte hain. Lab: 60,000 mein se 57,000 ko error (95%).",
          "nodes": {
            "user": {
              "tone": "bad",
              "badge": "error"
            },
            "web": {
              "tone": "bad",
              "badge": "threads khatam"
            },
            "q": {
              "tone": "idle",
              "badge": ""
            },
            "work": {
              "tone": "idle",
              "badge": ""
            },
            "side": {
              "tone": "busy",
              "badge": "atka"
            }
          },
          "vars": {
            "way": "sync",
            "ok": "95% error",
            "later": "—"
          },
          "ask": {
            "q": "Sync mein spike par itne errors kyun?",
            "choices": [
              "Har request 2 s thread pakadti hai; 100 threads ÷ 2 s = sirf 50/sec",
              "Web server ka CPU 1,000 signups/sec ke JSON parse nahi kar sakta",
              "Database 1,000 users ko ek saath save nahi kar sakta, isliye error"
            ],
            "answer": 0,
            "hint": "Ek thread ek second mein kitne signups poore kar sakta hai?",
            "explain": "Thread side effects ka intezaar karta hai (image, email, index). 2 s × 1 request = har thread 0.5/sec. 100 threads = 50/sec. Baaki 950/sec ke liye thread hi nahi. Video is haalat ko temporal coupling kehta hai: user aur kaam ek hi samay se bandhe.",
            "choiceExplanations": [
              "Thread side effects ka intezaar karta hai (image, email, index). 2 s × 1 request = har thread 0.5/sec. 100 threads = 50/sec. Baaki 950/sec ke liye thread hi nahi. Video is haalat ko temporal coupling kehta hai: user aur kaam ek hi samay se bandhe.",
              "Parse sasta hai; thread intezaar mein atka hai, CPU kaam mein nahi.",
              "Model mein DB ki baat hi nahi; thread pool pehle khatam hota hai."
            ]
          }
        },
        {
          "title": "Async: text message",
          "clock": "async",
          "say": "Web server message queue mein daalta hai aur turant \"ho gaya\". Lab: 60,000 mein se 60,000 ko turant jawab.",
          "nodes": {
            "user": {
              "tone": "ok",
              "badge": "ho gaya ✓"
            },
            "web": {
              "tone": "ok",
              "badge": "sirf enqueue"
            },
            "q": {
              "tone": "busy",
              "badge": "bhar rahi"
            },
            "work": {
              "tone": "busy",
              "badge": "10/sec"
            },
            "side": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "async",
            "ok": "turant",
            "later": "worker ke hisaab se"
          },
          "flows": [
            {
              "from": "user",
              "to": "web",
              "label": "signup",
              "tone": "ok"
            },
            {
              "from": "web",
              "to": "q",
              "label": "message",
              "tone": "acc"
            },
            {
              "from": "q",
              "to": "work",
              "label": "10/sec",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Backlog",
          "clock": "60 s baad",
          "say": "Spike ke ant par queue mein 59,400 messages. Worker 10/sec par aakhri email ka intezaar ~99 minute.",
          "nodes": {
            "user": {
              "tone": "ok",
              "badge": ""
            },
            "web": {
              "tone": "ok",
              "badge": ""
            },
            "q": {
              "tone": "busy",
              "badge": "59,400"
            },
            "work": {
              "tone": "busy",
              "badge": "10/sec"
            },
            "side": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "async",
            "ok": "turant",
            "later": "~99 min baad"
          },
          "ask": {
            "q": "Video: \"email 10 second ki jagah 10 minute late\". Lab ke hisaab se?",
            "choices": [
              "10 minute sirf ~6 s ke spike par; 60 s ke spike par ~99 minute",
              "Sahi — queue spike ko hamesha 10 minute mein barabar kar deti hai",
              "Galat — queue mein email kabhi late nahi hota, turant jaata hai"
            ],
            "answer": 0,
            "hint": "59,400 messages ÷ 10/sec = ?",
            "explain": "Intezaar = aage khade messages ÷ worker ki raftaar. 59,400 ÷ 10 = 5,940 s ≈ 99 min. 10 minute (600 s × 10 = 6,000 messages) tab jab spike ~6 s chale.",
            "choiceExplanations": [
              "Intezaar = aage khade messages ÷ worker ki raftaar. 59,400 ÷ 10 = 5,940 s ≈ 99 min. 10 minute (600 s × 10 = 6,000 messages) tab jab spike ~6 s chale.",
              "Queue ka samay backlog aur worker ki raftaar se aata hai; koi tay 10 minute nahi.",
              "Queue mein message intezaar karta hai jab tak worker message utha na le."
            ]
          }
        },
        {
          "title": "Kab khatam?",
          "clock": "baad mein",
          "say": "Spike ke baad traffic phir 10/sec, aur worker bhi 10/sec. Lab: 7 din baad bhi backlog 59,400. Worker 20/sec ho toh 98 min mein khaali.",
          "nodes": {
            "user": {
              "tone": "ok",
              "badge": ""
            },
            "web": {
              "tone": "ok",
              "badge": ""
            },
            "q": {
              "tone": "bad",
              "badge": "kabhi khaali nahi"
            },
            "work": {
              "tone": "busy",
              "badge": "10 = 10"
            },
            "side": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "async",
            "ok": "turant",
            "later": "worker 10/s: kabhi nahi"
          },
          "ask": {
            "q": "Queue load ko \"barabar\" kab karti hai?",
            "choices": [
              "Jab worker ki kshamata ausat traffic se zyada ho; backlog tab ghatta",
              "Hamesha — queue ka kaam hi spike ko apne aap khatam karna hota hai",
              "Jab queue badi ho — badi queue mein backlog jaldi khatam hota hai"
            ],
            "answer": 0,
            "hint": "Har second 10 aaye, 10 gaye. Backlog kitna ghata?",
            "explain": "Backlog sirf khaali kshamata se ghatta hai: (worker − traffic) per second. 10 − 10 = 0, toh 59,400 hamesha. Worker 12/sec: 2/sec ghata, 8.2 ghante. 20/sec: 98 min. Queue spike ko samay mein phailaati hai, kaam khatam nahi karti.",
            "choiceExplanations": [
              "Backlog sirf khaali kshamata se ghatta hai: (worker − traffic) per second. 10 − 10 = 0, toh 59,400 hamesha. Worker 12/sec: 2/sec ghata, 8.2 ghante. 20/sec: 98 min. Queue spike ko samay mein phailaati hai, kaam khatam nahi karti.",
              "Queue kaam nahi karti; worker karta hai.",
              "Queue ka size sirf kitna ruk sakta hai batata hai; ghatna worker ki khaali kshamata se."
            ]
          }
        }
      ],
      "lesson": "Async user ko kaam ke samay se alag karta hai (temporal decoupling). Spike queue mein rukta hai. Par backlog sirf worker ki khaali kshamata se ghatta hai: intezaar = backlog ÷ worker raftaar."
    },
    {
      "type": "cards",
      "title": "📮 \"Ek bhi message nahi khoya\" — kab tak?",
      "goal": "Lab 61 ex0 (arithmetic) aur ex1 (asli queue code). Video ki do baatein sudhaar ke saath.",
      "lesson": "Queue mein message tab tak surakshit jab tak retention baaki. Aur task queue \"theek ek baar\" nahi, kam se kam ek baar (at-least-once) deti hai.",
      "steps": [
        {
          "title": "1. Retention",
          "say": "SQS default retention 4 din (max 14). Worker 5 din band, 10 messages/sec: pehle din ke 8,64,000 messages worker lautne se pehle expire. Queue ki depth aur sabse purane message ki umar par alert lagao."
        },
        {
          "title": "2. At-least-once",
          "say": "Video pehle kehta hai \"har image theek ek worker, theek ek baar\", baad mein khud at-least-once batata hai. Lab ex1 (asli code, visibility timeout 30 s): 1,000 jobs mein 6 do baar chale — 5 delete se pehle crash, 1 job jo 45 s chali.",
          "ask": {
            "q": "Image resize 45 s leta hai, visibility timeout 30 s. Kya hoga?",
            "choices": [
              "30 s par message phir dikhega; doosra worker same image dobara banayega",
              "Queue pehle worker ke khatam hone ka intezaar karegi, timeout ke baad bhi",
              "Message 30 s baad apne aap delete ho jaayega, kaam adhoora rahega"
            ],
            "answer": 0,
            "hint": "Visibility timeout ke baad message ka kya hota hai?",
            "explain": "Visibility timeout = kitni der message chhupa rahe. 30 s mein delete nahi hua toh queue maan leti hai worker mar gaya, aur message doosre worker ko de deti hai. Ilaaj: timeout kaam se lamba rakho (ya kaam ke beech badhao), aur consumer idempotent banao.",
            "choiceExplanations": [
              "Visibility timeout = kitni der message chhupa rahe. 30 s mein delete nahi hua toh queue maan leti hai worker mar gaya, aur message doosre worker ko de deti hai. Ilaaj: timeout kaam se lamba rakho (ya kaam ke beech badhao), aur consumer idempotent banao.",
              "Queue worker ko dekh nahi sakti; sirf delete ka intezaar karti hai.",
              "Message delete sirf worker ke delete se hota hai (ya retention khatam hone par)."
            ]
          }
        },
        {
          "title": "3. Async kab nahi",
          "say": "Video ka niyam: kaam 100–200 ms mein sync ho jaaye toh sync rakho. Async debugging, eventual consistency aur duplicates laata hai. Async un kaamon ke liye: lamba kaam (image, PDF), bahar ki API (email, webhook), bahut zyada events (logs, analytics), alag teams."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Spike aur queue",
      "project": "61-queues",
      "exercise": "ex0-buffer",
      "goal": "Sync vs async spike mein, worker ki kshamata ke hisaab se backlog, aur retention. Phir asli queue code: visibility timeout aur duplicates.",
      "why": "Node 24+ chahiye. ex0 seedha hisaab (har run same). ex1 asli code chalata hai, koi asli SQS nahi.",
      "steps": [
        {
          "text": "Spike, backlog, retention.",
          "cmd": "cd docker-labs/61-queues && npm start -- ex0-buffer",
          "expect": "A. MODEL: signups 10/sec, phir 60 s ke liye 1,000/sec (video ka \"Reddit hug of death\").\n   Sync: har request web thread ko 2 s pakadti hai (image, email, index sab andar). 100 threads.\n   Async: web thread sirf queue mein daalta hai; email worker 10/sec (video ka number).\n\nsync:  kshamata 50/sec → spike ki 60,000 mein se 3,000 serve, 57,000 ko error (95%)\nasync: 60,000 mein se 60,000 ko turant \"ho gaya\" (queue mein); kaam baad mein.\n\nB. MODEL: spike ke baad backlog kab khatam? Normal traffic phir 10/sec. (seedha hisaab, 1 s ke kadam)\n\nworker kshamata   spike ke ant par backlog   sabse lamba intezaar   backlog khaali   7 din baad backlog\n10/sec                  59,400                   99 min          kabhi nahi       59,400\n12/sec                  59,280                   82 min          8.2 ghante            0\n20/sec                  58,800                   49 min              98 min            0\n50/sec                  57,000                   19 min              24 min            0\n\n→ Video: \"email 10 second ki jagah 10 minute late\". 10 minute ka intezaar tab jab spike sirf ~6 s chale.\n  60 s ke spike par intezaar ~99 minute. Aur worker 10/sec par (normal traffic jitna) backlog KABHI khatam nahi hota:\n  queue tabhi load ko \"barabar\" karti hai jab worker ki kshamata ausat traffic se zyada ho.\n\nC. Retention (arithmetic): worker 5 din band, 10 messages/sec. SQS default retention 4 din (max 14).\n   5 din mein 43,20,000 messages. Pehle din ke 8,64,000 worker lautne se pehle expire → gaye.\n   \"Queue mein ek bhi message nahi khota\" tabhi sach jab worker retention ke andar laut aaye."
        },
        {
          "text": "Queue vs log (code).",
          "cmd": "npm start -- ex1-queue-vs-log",
          "expect": "A. ASLI code (lib/queue.js, SQS standard jaisa): 1,000 email jobs, 3 workers, visibility timeout 30 s.\n   Har worker 1 job/sec. Worker B delete 10-10 ke batch mein karta hai, aur 5 jobs poore karke crash (delete se pehle).\n   Worker A ki ek job (t = 10 s par mili) 45 s leti hai — visibility timeout se lambi.\n\nunique jobs: 1,000   do baar chale: 6   (B ke 5 + 1 lambi job)\nlambi job ka delete: kuch nahi mita — receipt purani; job doosre worker ko mil chuki thi (SQS: purani receipt par delete ki guarantee nahi)\n→ Video: \"har image theek ek worker, theek ek baar\". Sach: at-least-once. Crash ya timeout se lamba kaam = duplicate.\n\nB. ASLI code: ek signup event, teen services (email, analytics, fraud). 1,000 events.\n\nek hi queue, teeno services padhti hain:    email 334, analytics 333, fraud 333   ← har service ko sirf ek-tihaai\nek log, har service ka apna offset (group):  email 1000, analytics 1000, fraud 1000\n→ Queue par fan-out ke liye har service ki alag queue chahiye (jaise SNS → 3 SQS). Log mein har group poora padhta hai.\n\nC. ASLI code: analytics mein bug, 14 din ke counts galat. Aaj (din 21) bug theek, 14 din peeche se replay.\n   1,000 events/din. Video: \"offset 2 hafte peeche le jao, sab wahin hai\".\n\nretention  7 din (Kafka default): replay mein  7,000 of 14,000 events   ← purane din disk se mit chuke\nretention 14 din                : replay mein 14,000 of 14,000 events   \nretention 30 din                : replay mein 14,000 of 14,000 events   \ntask queue (delete on ack):            replay mein      0 of 14,000 events\n→ Replay utna hi jitna retention. Default 7 din par \"2 hafte peeche\" nahi chalega — retention ya poora archive pehle se chuno.\n  Compaction har key ki aakhri value rakhta hai, poori history nahi: ginti dobara karne ke kaam nahi aata.\n  Lab ka naya group shuru se padhta hai; asli Kafka mein naya group default (auto.offset.reset = latest) se naye events hi padhta hai."
        }
      ],
      "observe": {
        "q": "ex0 B: worker 12/sec par backlog 8.2 ghante mein khatam, 20/sec par 98 minute. Itna farq kyun?",
        "choices": [
          "Backlog khaali kshamata se ghatta hai: 2/sec vs 10/sec, yaani 5 guna",
          "20/sec wala worker har message ko aadhe samay mein bhejta hai",
          "12/sec par queue dheemi ho jaati hai kyunki backlog bada hai"
        ],
        "answer": 0,
        "hint": "Har worker par (raftaar − 10/sec traffic) kitna?",
        "explain": "Normal traffic 10/sec. 12/sec worker ke paas sirf 2/sec bachta hai, 20/sec ke paas 10/sec. ~59,000 ÷ 2 ≈ 8.2 ghante, ÷ 10 ≈ 98 min. Worker ki raftaar 1.7 guna, par khaali kshamata 5 guna.",
        "choiceExplanations": [
          "Normal traffic 10/sec. 12/sec worker ke paas sirf 2/sec bachta hai, 20/sec ke paas 10/sec. ~59,000 ÷ 2 ≈ 8.2 ghante, ÷ 10 ≈ 98 min. Worker ki raftaar 1.7 guna, par khaali kshamata 5 guna.",
          "Raftaar 1.7 guna hai, par samay 5 guna kam — farq khaali kshamata ka hai.",
          "Model mein queue ki raftaar backlog se nahi badalti."
        ]
      },
      "lesson": "Queue ka faayda: user ko turant jawab. Queue ki keemat: kaam ka intezaar. Ek message ka intezaar = aage ke messages ÷ worker raftaar; poori queue khaali hone ka samay = backlog ÷ (worker − naya traffic)."
    }
  ],
  "interview": {
    "title": "Interview Round — sync ya async",
    "instructions": "Pehle socho: user ko kya turant chahiye, aur baaki kaam kitna lamba hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Signup par welcome email, avatar resize aur CRM update — sab request ke andar, 3 s. Sale mein signups 20 guna. Pehla badlaav?",
        "choices": [
          "User save karke turant jawab; email, resize, CRM queue se workers karein",
          "Web servers 20 guna kar do, taaki har signup ke 3 s ke liye thread mile",
          "Email aur resize hata do, kyunki sale mein inki zaroorat nahi hai",
          "Har side effect ko alag thread mein chalao, par jawab tabhi do jab sab khatam"
        ],
        "answer": 0,
        "explain": "User ko sirf \"account bana\" turant chahiye. Side effects baad mein ho sakte hain: queue mein daalo, workers apni raftaar se karein. Workers ki kshamata ausat traffic se zyada rakho, warna backlog kabhi khatam nahi hoga (lab 61 ex0).",
        "choiceExplanations": [
          "User ko sirf \"account bana\" turant chahiye. Side effects baad mein ho sakte hain: queue mein daalo, workers apni raftaar se karein. Workers ki kshamata ausat traffic se zyada rakho, warna backlog kabhi khatam nahi hoga (lab 61 ex0).",
          "20 guna servers sirf intezaar ke liye — mehnga, aur bahar ki API phir bhi dheemi.",
          "Email aur avatar product ke hisse hain; dono hataana feature todna hai.",
          "Jawab sab khatam hone par diya toh user phir bhi 3 s ruka; coupling same."
        ]
      },
      {
        "q": "Order service ko payment ka result chahiye taaki user ko \"order confirmed\" dikhe. Payment API 300 ms leti hai. Team kehti hai \"sab async karo, Kafka lagao\". Tumhari salah?",
        "choices": [
          "Payment sync rakho (user ko result chahiye); receipt email jaise kaam async",
          "Payment bhi async — user ko \"processing\" dikhao, Kafka hamesha tez hai",
          "Payment ko Kafka mein daalo aur user ko turant \"confirmed\" dikha do",
          "Sab sync rakho — async hamesha zyada mushkil, kabhi faayda nahi"
        ],
        "answer": 0,
        "explain": "User ko payment ka jawab abhi chahiye, aur 300 ms sahne layak hai. Async ki keemat (debugging, duplicates, eventual consistency) tab do jab kaam lamba ho ya result abhi zaroori na ho. Receipt email, analytics, invoice PDF — async.",
        "choiceExplanations": [
          "User ko payment ka jawab abhi chahiye, aur 300 ms sahne layak hai. Async ki keemat (debugging, duplicates, eventual consistency) tab do jab kaam lamba ho ya result abhi zaroori na ho. Receipt email, analytics, invoice PDF — async.",
          "Async tez nahi banata; jawab ko baad mein le jaata hai.",
          "Bina payment hue \"confirmed\" dikhana jhooth hai; fail hua toh?",
          "Lambe side effects (email, PDF) async karne se request chhoti hoti hai."
        ]
      }
    ]
  },
  "success": [
    "Temporal coupling aur load leveling samjha sakte ho",
    "Backlog ka intezaar gin sakte ho (backlog ÷ raftaar)",
    "Retention aur at-least-once ka khatra bata sakte ho"
  ],
  "cards": [
    {
      "front": "Load leveling ki shart?",
      "back": "Worker ki kshamata > ausat traffic. Lab 61 ex0: worker = traffic (10/sec) → 59,400 ka backlog kabhi khatam nahi."
    },
    {
      "front": "Queue mein intezaar?",
      "back": "Aage ke messages ÷ worker raftaar. 59,400 ÷ 10/sec ≈ 99 min. Video ka \"10 minute\" sirf ~6 s ke spike par."
    },
    {
      "front": "Task queue ki guarantee?",
      "back": "At-least-once (SQS standard). Delete se pehle crash ya visibility timeout se lamba kaam = duplicate. Consumer idempotent banao."
    }
  ]
}
]);
})();
