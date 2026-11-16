/* First Principles — FAANG Senior Engineer.
   Source credit: Kafka vs RabbitMQ vs SQS — Async System (mQf7RtBuiaY), numbered video 11/15.
   Evidence: docker-labs/61-queues/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "web", "icon": "🖥️", "label": "Web (producer)", "x": 130, "y": 190}, {"id": "q", "icon": "🛢️", "label": "Queue 10k", "x": 380, "y": 80}, {"id": "work", "icon": "⚙️", "label": "Workers", "x": 620, "y": 190}, {"id": "db", "icon": "🗄️", "label": "DB 400/s", "x": 780, "y": 320}, {"id": "dlq", "icon": "☠️", "label": "DLQ", "x": 430, "y": 330}];
const EDGES = [{"from": "web", "to": "q"}, {"from": "q", "to": "work"}, {"from": "work", "to": "db"}, {"from": "work", "to": "dlq"}];
VISUALS["fp-async-kab"] = { t: "Tank bhara toh drop, block ya reject. Workers ko DB ki had par roko; DLQ = quarantine aur redrive, kshamata nahi.", html: SD.viz.svg(HERO, EDGES, { nodes: { web: {tone:'acc',badge:'429 baad mein'}, q: {tone:'busy',badge:'bhara'}, work: {tone:'ok',badge:'400/s'}, db: {tone:'ok',badge:'had par'}, dlq: {tone:'idle',badge:'quarantine'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-async-kab",
  "icon": "🛢️",
  "group": "📮 Async: Queue vs Stream",
  "title": "Async 4 · Kab — backpressure, DLQ aur async kab nahi",
  "badge": "Tank Ka Chowkidaar",
  "objectives": [
    "Bhara tank: drop, block, reject — kaun kab",
    "Autoscale aur DB ki had; DLQ ka asli kaam",
    "Sync vs queue vs log: chunna"
  ],
  "lesson": [
    "<h3>🚰 Tanki aur nal</h3><p>Chhat ki tanki mein pipe se paani aata hai, neeche nal se jaata hai. Barsaat mein pipe zyada bhejta hai — tanki bhar jaati hai. Ab teen raaste: oopar se behne do (paani gaya), pipe band karke pump ko rok do (pump ruka), ya pump wale ko bolo \"abhi mat bhejo\".</p><p>Aur nal ko bada kar diya, par neeche ka drain chhota hai — ab farsh bhi geela. Aaj dekhte hain bhari tanki ka sahi ilaaj.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🛢️ Tank bhar gaya — ab kya?",
      "goal": "Lab 61 ex4 (model, 1 s ke kadam): signups 200/sec, phir 60 s ke liye 1,000/sec. Queue mein 10,000 ki jagah. Workers 300/sec; DB 400 writes/sec sambhalta hai. 5 baar fail → DLQ. Kul 1,68,000 signups, 600 s.",
      "nodes": [
        {
          "id": "web",
          "icon": "🖥️",
          "label": "Web (producer)",
          "x": 130,
          "y": 190
        },
        {
          "id": "q",
          "icon": "🛢️",
          "label": "Queue 10k",
          "x": 380,
          "y": 80
        },
        {
          "id": "work",
          "icon": "⚙️",
          "label": "Workers",
          "x": 620,
          "y": 190
        },
        {
          "id": "db",
          "icon": "🗄️",
          "label": "DB 400/s",
          "x": 780,
          "y": 320
        },
        {
          "id": "dlq",
          "icon": "☠️",
          "label": "DLQ",
          "x": 430,
          "y": 330
        }
      ],
      "edges": [
        {
          "from": "web",
          "to": "q"
        },
        {
          "from": "q",
          "to": "work"
        },
        {
          "from": "work",
          "to": "db"
        },
        {
          "from": "work",
          "to": "dlq"
        }
      ],
      "viz": {
        "w": 900,
        "h": 420
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "lost",
          "label": "\"Ho gaya\" par khoye"
        },
        {
          "id": "err",
          "label": "User ko error/429"
        }
      ],
      "steps": [
        {
          "title": "Tank bhara",
          "clock": "t = 14 s",
          "say": "Spike mein 1,000 aaye, 300 gaye: queue har second 700 bharti hai. ~14 s mein 10,000 poore.",
          "nodes": {
            "web": {
              "tone": "busy",
              "badge": "1,000/s"
            },
            "q": {
              "tone": "bad",
              "badge": "bhara"
            },
            "work": {
              "tone": "ok",
              "badge": "300/s"
            },
            "db": {
              "tone": "ok",
              "badge": ""
            },
            "dlq": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "?",
            "lost": "—",
            "err": "—"
          },
          "flows": [
            {
              "from": "web",
              "to": "q",
              "label": "1,000/s",
              "tone": "bad"
            },
            {
              "from": "q",
              "to": "work",
              "label": "300/s",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Drop",
          "clock": "drop",
          "say": "Video ki strategy 1: queue bhari → message phenk do. User ne \"ho gaya\" dekha, data gaya. Lab: 32,300 khoye.",
          "nodes": {
            "web": {
              "tone": "ok",
              "badge": "ho gaya ✓"
            },
            "q": {
              "tone": "bad",
              "badge": "phenka"
            },
            "work": {
              "tone": "ok",
              "badge": ""
            },
            "db": {
              "tone": "ok",
              "badge": ""
            },
            "dlq": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "drop",
            "lost": "32,300",
            "err": "0"
          }
        },
        {
          "title": "Block",
          "clock": "block",
          "say": "Strategy 2: web thread jagah ka intezaar karta hai, phir timeout. Lab: 32,300 users ko error, 47 s tak queue bhari. Kafka producer khud block karta hai: buffer (default 32 MB) bhara → send() 60 s (max.block.ms) tak rukta hai.",
          "nodes": {
            "web": {
              "tone": "bad",
              "badge": "threads atke"
            },
            "q": {
              "tone": "bad",
              "badge": "bhara"
            },
            "work": {
              "tone": "ok",
              "badge": ""
            },
            "db": {
              "tone": "ok",
              "badge": ""
            },
            "dlq": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "block",
            "lost": "0",
            "err": "32,300 timeout"
          },
          "ask": {
            "q": "Video kehta hai block karna async ko phir sync bana deta hai. Kyun?",
            "choices": [
              "Web thread queue ka intezaar karta hai; user phir spinner dekhta hai",
              "Block karne se queue ke saare messages delete ho jaate hain",
              "Block mein workers ruk jaate hain, isliye backlog badhta hai"
            ],
            "answer": 0,
            "hint": "Queue bhari hone par web thread kya kar raha hai?",
            "explain": "Async ka faayda tha: web thread turant free. Block mein thread phir kisi aur (queue ki jagah) ka intezaar karta hai — temporal coupling wapas. Thread khatam toh doosre pages bhi atak sakte hain.",
            "choiceExplanations": [
              "Async ka faayda tha: web thread turant free. Block mein thread phir kisi aur (queue ki jagah) ka intezaar karta hai — temporal coupling wapas. Thread khatam toh doosre pages bhi atak sakte hain.",
              "Block kuch delete nahi karta; producer ruk jaata hai.",
              "Workers chalte rehte hain (300/s); producer ruka hai."
            ]
          }
        },
        {
          "title": "Reject",
          "clock": "reject",
          "say": "Video mein nahi: queue bhari → turant 429/503 \"baad mein\". Utne hi log mana (32,300), par har \"ho gaya\" wala signup pakka, aur user ko pata hai.",
          "nodes": {
            "web": {
              "tone": "acc",
              "badge": "429 baad mein"
            },
            "q": {
              "tone": "busy",
              "badge": "bhara"
            },
            "work": {
              "tone": "ok",
              "badge": ""
            },
            "db": {
              "tone": "ok",
              "badge": ""
            },
            "dlq": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "reject",
            "lost": "0",
            "err": "32,300 (pata hai)"
          }
        },
        {
          "title": "Autoscale DB ke paar",
          "clock": "autoscale",
          "say": "Strategy 3: workers 1,000/sec tak badhao. DB 400 hi sambhalta: baaki timeout, wapas queue. Lab: 57,402 bekaar DB koshishein, 3,135 theek messages DLQ mein, aur kaam kam (1,39,271 vs DB ki had par 1,41,400).",
          "nodes": {
            "web": {
              "tone": "acc",
              "badge": "429"
            },
            "q": {
              "tone": "busy",
              "badge": ""
            },
            "work": {
              "tone": "bad",
              "badge": "1,000/s"
            },
            "db": {
              "tone": "bad",
              "badge": "timeouts"
            },
            "dlq": {
              "tone": "bad",
              "badge": "3,135 theek msgs"
            }
          },
          "vars": {
            "way": "autoscale 1,000/s",
            "lost": "0",
            "err": "25,394"
          },
          "flows": [
            {
              "from": "work",
              "to": "db",
              "label": "1,000/s",
              "tone": "bad"
            },
            {
              "from": "work",
              "to": "dlq",
              "label": "5 fail",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Video: \"throughput se zyada ho toh DLQ\". Lab mein DLQ ka kya hua?",
            "choices": [
              "3,135 theek messages DLQ mein gaye; DLQ kshamata nahi deta",
              "DLQ ne DB ko bacha liya, isliye koi bekaar kaam nahi hua",
              "DLQ khaali raha, kyunki overload mein message fail nahi hote"
            ],
            "answer": 0,
            "hint": "Timeout wala message 5 baar fail hua toh kahan jaata hai?",
            "explain": "DLQ = seemit retries ke baad message ko alag rakhna (quarantine), phir alert, jaanch aur redrive. Overload mein theek message bhi timeout se 5 baar fail hokar DLQ mein pahunch jaate hain — ab un messages ko jaanch kar wapas bhejna padega. DLQ kshamata nahi badhata. Overload ka ilaaj: workers ko DB ki had (400/s) par roko.",
            "choiceExplanations": [
              "DLQ = seemit retries ke baad message ko alag rakhna (quarantine), phir alert, jaanch aur redrive. Overload mein theek message bhi timeout se 5 baar fail hokar DLQ mein pahunch jaate hain — ab un messages ko jaanch kar wapas bhejna padega. DLQ kshamata nahi badhata. Overload ka ilaaj: workers ko DB ki had (400/s) par roko.",
              "DB par 57,402 bekaar koshishein hui; DLQ ne kuch nahi bachaya.",
              "DB ki had ke paar har extra koshish timeout = fail."
            ]
          }
        }
      ],
      "lesson": "Har system ki ek had hai. Bhara tank: drop (sasta data), reject 429 (zaroori data), block sirf seemit samay. Workers ko DB ki had par roko; DLQ = seemit retry ke baad quarantine aur redrive, kshamata nahi."
    },
    {
      "type": "cards",
      "title": "🧭 Async kab, aur kaun sa tool?",
      "goal": "Video ka niyam, lab 61 ke numbers ke saath.",
      "lesson": "Sync jab jawab abhi chahiye aur jaldi mil jaaye. Queue jab kaam baantna ho. Log jab kai consumers ya replay. Har haal mein: idempotent consumer, had, aur DLQ = quarantine + redrive, kshamata nahi.",
      "steps": [
        {
          "title": "1. Sync rakho",
          "say": "Kaam 100–200 ms mein ho jaaye aur user ko result abhi chahiye (payment ka jawab, \"last seen\" update): sync. Video ka niyam achha heuristic hai, kanoon nahi. Async debugging, eventual consistency aur duplicates laata hai."
        },
        {
          "title": "2. Queue ya log",
          "say": "Ek kaam, ek worker (image resize, email): queue (SQS, RabbitMQ). Kai services ko same event, ya replay (analytics, audit): log (Kafka, Kinesis), retention soch kar. Kram chahiye: key = entity id.",
          "ask": {
            "q": "Audit team ko 1 saal purane events dobara padhne hain. Kafka default settings par kya hoga?",
            "choices": [
              "Sirf 7 din ka milega — retention badhao ya events archive (S3) mein rakho",
              "Poora saal milega — Kafka log kabhi delete nahi karta, scroll hai",
              "Kuch nahi milega — Kafka padhte hi events delete kar deta hai"
            ],
            "answer": 0,
            "hint": "log.retention.hours ka default?",
            "explain": "Kafka default retention 168 ghante (7 din). Saal bhar ke liye retention badhao (disk ka kharcha), tiered storage, ya events S3 mein archive karo. Lab 61 ex1: 7 din par 14 din ka replay aadha.",
            "choiceExplanations": [
              "Kafka default retention 168 ghante (7 din). Saal bhar ke liye retention badhao (disk ka kharcha), tiered storage, ya events S3 mein archive karo. Lab 61 ex1: 7 din par 14 din ka replay aadha.",
              "Retention ke baad purane segments delete hote hain.",
              "Kafka padhne par delete nahi karta; sirf retention par."
            ]
          }
        },
        {
          "title": "3. Teen niyam har async system mein",
          "say": "<b>Idempotent consumer</b> (at-least-once: duplicates aayenge). <b>Had pehle se</b>: queue depth, sabse purane message ki umar, aur bhara tank ka niyam (drop/reject). <b>Outbox</b> jab DB aur event dono chahiye."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Backpressure",
      "project": "61-queues",
      "exercise": "ex4-backpressure",
      "goal": "Paanch tareeke ek hi spike par: drop, block, reject, autoscale DB ke paar, aur DB ki had tak. Phir poison message.",
      "why": "Node 24+ chahiye. Seedha model (har run same); koi asli queue ya DB nahi.",
      "steps": [
        {
          "text": "Backpressure.",
          "cmd": "cd docker-labs/61-queues && npm start -- ex4-backpressure",
          "expect": "A. MODEL (1 s steps): signups 200/sec, phir 60 s ke liye 1,000/sec. Queue mein 10,000 messages ki jagah.\n   Workers 300/sec likhte hain; DB 400 writes/sec sambhalta hai (zyada = timeout, message wapas queue mein).\n   5 baar fail → DLQ. 600 s dekha. Kul 1,68,000 signups.\n\ntareeka                                              likhe gaye   \"ho gaya\" par khoye   user ko error/429   bekaar DB kaam   DLQ mein\ndrop: queue bhari → \"ho gaya\" bolkar phenk do         1,35,500            32,300                 0               0         0\nblock: queue bhari → web thread jagah ka intezaar     1,35,500                 0            32,300               0         0\nreject: queue bhari → turant 429 \"baad mein\"          1,35,500                 0            32,300               0         0\nreject + workers autoscale 1,000/sec tak              1,39,271                 0            25,394          57,402     3,135\nreject + workers sirf DB ki had (400/sec) tak         1,41,400                 0            26,400               0         0\n\n→ drop: user ne \"ho gaya\" dekha, data gaya — logs/metrics ke liye theek, signup ya paise ke liye nahi.\n→ block: 47 s tak queue bhari, har naya signup thread intezaar mein, phir timeout. Asli server mein same threads\n  doosre pages bhi chalate hain — async phir se sync ban gaya.\n→ reject: utne hi log mana, par har \"ho gaya\" wala signup pakka. User ko pata hai, baad mein dobara kar sakta hai.\n→ autoscale DB ki had ke paar: kaam KAM hua, DB par 57,402 bekaar koshishein, aur 3,135 theek messages DLQ mein.\n  Bottleneck queue se DB par chala gaya (video sahi). Ilaaj DLQ nahi — workers ko DB ki had par roko. (Kitne DLQ mein gaye,\n  retry ki had par tika hai: maxReceive 500 par autoscale aur DB-had wali rows barabar kaam karti hain.)\n  Model mein block aur reject ki ginti barabar maani gayi; intezaar karte threads ki deadline alag se simulate nahi ki.\n\nB. Poison message (aadarsh hisaab: retry turant, polling ka intezaar nahi): ordered (FIFO) group ka ek message har baar fail. Visibility 30 s.\n   Bina DLQ: group hamesha ke liye atka. maxReceiveCount 5 ke saath: ~150 s baad DLQ, baaki group chal pada —\n   par ab group ke baaki events us event ke bina aage badhe: FIFO ka kram toota. Rokna ya skip karna — faisla tumhara.\n→ DLQ = seemit retries ke baad message ko alag rakhna (quarantine) + alert + jaanch + redrive. Overload ki kshamata DLQ nahi\n  badhata. Wajah aksar asthaayi bhi hoti hai (DB band tha) — theek karke wapas bhejo."
        },
        {
          "text": "Lab ke 6 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-61-queues@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ buffer: a worker no faster than normal traffic never drains the spike; spare capacity does (11.39741ms)\n✔ queue vs log: an undeleted message comes back; each log group reads everything; replay stops at retention (0.586732ms)\n✔ append: real writes work; 1 MB writes beat 4 KB writes with O_DIRECT (365.784193ms)\n✔ partitions: Kafka murmur2 vectors; a key keeps order, round-robin does not; 6 → 8 moves most keys (17.531261ms)\n✔ backpressure: drop loses acked writes, reject does not; scaling past the DB wastes work and fills the DLQ (2.862382ms)\n✔ crash points: check-then-act double charges; one transaction or a provider key never does; outbox loses nothing (0.929733ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 444.063373"
        }
      ],
      "observe": {
        "q": "Workers ko sirf DB ki had (400/sec) tak badhaane par sabse zyada kaam hua (1,41,400). Autoscale 1,000/sec se kam kyun?",
        "choices": [
          "DB 400 hi karta; upar ki koshishein timeout aur bekaar",
          "1,000 workers ke liye queue mein messages hi nahi bache the",
          "Zyada workers ka matlab zyada network, isliye queue dheemi"
        ],
        "answer": 0,
        "hint": "DB ki had ke upar ki har koshish ka kya hua?",
        "explain": "Bottleneck DB hai. DB ke upar ki koshish kuch poora nahi karti: timeout, message wapas, kabhi DLQ. 400 par ruko toh har koshish kaam ki. Isliye workers ki had DB ki had se tay karo (concurrency limit).",
        "choiceExplanations": [
          "Bottleneck DB hai. DB ke upar ki koshish kuch poora nahi karti: timeout, message wapas, kabhi DLQ. 400 par ruko toh har koshish kaam ki. Isliye workers ki had DB ki had se tay karo (concurrency limit).",
          "Backlog tha (spike); messages ki kami nahi thi.",
          "Model mein network nahi gina; farq DB ki had ka hai."
        ]
      },
      "lesson": "Bottleneck dhoondo aur us par had lagao. Queue spike sambhalti hai, DB nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — had aur tool",
    "instructions": "Pehle socho: bottleneck kahan hai, aur data kho jaaye toh kitna nuksaan? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order queue ka backlog badh raha hai. Team ne workers 10 se 100 kiye. Ab DB CPU 100%, timeouts, aur DLQ mein hazaaron orders. Pehla kadam?",
        "choices": [
          "Workers DB ki had par roko; DLQ ke orders jaanch kar redrive karo",
          "Workers 100 se 300 karo, taaki backlog aur jaldi khatam ho jaaye",
          "DLQ ko delete kar do — DLQ wale orders kharab hain, orders chhodo",
          "Queue ka visibility timeout 0 kar do, taaki orders jaldi retry hon"
        ],
        "answer": 0,
        "explain": "Bottleneck queue se DB par chala gaya. DB ki had ke upar ki har koshish timeout, wapas queue, aur kabhi DLQ (lab 61 ex4: autoscale par 3,135 theek messages DLQ mein, kaam kam). Workers ko DB ki had par roko; DLQ ke theek orders jaanch kar redrive karo.",
        "choiceExplanations": [
          "Bottleneck queue se DB par chala gaya. DB ki had ke upar ki har koshish timeout, wapas queue, aur kabhi DLQ (lab 61 ex4: autoscale par 3,135 theek messages DLQ mein, kaam kam). Workers ko DB ki had par roko; DLQ ke theek orders jaanch kar redrive karo.",
          "Zyada workers = DB par aur bojh, aur zyada timeouts.",
          "DLQ ke orders theek hain; overload ki wajah se fail hue.",
          "Timeout 0 = har message turant doosre worker ko — duplicates aur bojh."
        ]
      },
      {
        "q": "Click analytics: 50,000 events/sec, kuch events kho jaayein toh chalega. Queue bhari ho toh producer kya kare?",
        "choices": [
          "Drop (lossy) — naye events phenko, web request ko kabhi mat roko",
          "Block — web request tab tak roko jab tak queue mein jagah na mile",
          "Har event ko DB mein seedha likho jab queue bhari ho, backup ke liye",
          "User ko error dikhao — analytics na jaaye toh page bhi na khule"
        ],
        "answer": 0,
        "explain": "Analytics mein kuch events khona chalega, aur web request rokna mehnga hai. Drop sahi (video ka lossy queue). Signup ya payment jaise data par reject (429) — \"ho gaya\" bolkar phenkna nahi.",
        "choiceExplanations": [
          "Analytics mein kuch events khona chalega, aur web request rokna mehnga hai. Drop sahi (video ka lossy queue). Signup ya payment jaise data par reject (429) — \"ho gaya\" bolkar phenkna nahi.",
          "Block = analytics ki wajah se poori site dheemi.",
          "Queue bhari tab hoti hai jab neeche sab bhara hai; DB par seedha 50k/s aur bura.",
          "Analytics ke liye user ka page todna galat sauda."
        ]
      }
    ]
  },
  "success": [
    "Drop, block aur reject mein data ke hisaab se chun sakte ho",
    "Autoscale ki had aur DLQ ka asli kaam bata sakte ho",
    "Sync, queue aur log mein chun sakte ho"
  ],
  "cards": [
    {
      "front": "Bhara tank?",
      "back": "Drop (logs/metrics), reject 429 (zaroori data: kuch acked nahi khota), block (async → sync; Kafka producer default 60 s)."
    },
    {
      "front": "Autoscale ki had?",
      "back": "Bottleneck DB par chala jaata hai. Lab 61 ex4: DB ke paar scale = kaam kam, 57k bekaar koshishein, theek messages DLQ mein. Workers ≤ DB ki had."
    },
    {
      "front": "DLQ kis liye?",
      "back": "Seemit retries ke baad quarantine: alert, jaanch, theek karke redrive. FIFO mein skip karna kram todta hai — rokna ya skip, soch kar. Overload ka ilaaj nahi."
    }
  ]
}
]);
})();
