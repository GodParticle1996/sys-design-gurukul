/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Persistence: B-Trees vs LSM-Trees (RAuIWs3ne9g), numbered video 5/15.
   Evidence: docker-labs/55-persistence/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🧾", "label": "order service", "x": 130, "y": 105}, {"id": "cache", "icon": "🧠", "label": "page cache (RAM)", "x": 445, "y": 105}, {"id": "disk", "icon": "💾", "label": "disk", "x": 760, "y": 105}];
const EDGES = [{"from": "app", "to": "cache"}, {"from": "cache", "to": "disk"}];
VISUALS["fp-per-kyun"] = { t: "API ne \"saved\" kaha. Bijli gayi. Order gayab — kyunki \"saved\" sirf RAM mein tha.", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'acc',badge:'"done"'}, cache: {tone:'busy',badge:'RAM'}, disk: {tone:'idle',badge:'khaali'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-per-kyun",
  "icon": "💾",
  "group": "💾 Physics of Persistence",
  "title": "Persistence 1 · Kyun — \"done\" bola, order gayab",
  "badge": "Page Cache Pehchaanne Wala",
  "objectives": [
    "write() ke baad bytes asal mein kahan hote hain?",
    "App crash aur power cut mein kya farq hai?",
    "fsync mehnga kyun hai, aur group commit kya bachata hai?"
  ],
  "lesson": [
    "<h3>📒 Cashier ki diary</h3><p>Dukaan ka cashier har order pehle whiteboard par likhta hai — tez. Raat ko register mein utaarta hai. Cashier chai peene gaya toh whiteboard waisa hi rehta hai. Par bijli gayi aur whiteboard <i>jaadui</i> tha jo bijli ke saath mit jaata hai? Din bhar ke orders gaye.</p><p>Computer ka page cache wahi jaadui whiteboard hai. Aaj naapte hain: kab \"done\" sach hai, aur sach wala \"done\" kitne ka padta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧾 \"Done\" bola — par order kahan hai?",
      "goal": "KhanaKart ki order service har order ek file mein likhti hai. Lab 55 ex0 ka model: write() ke baad bytes kahan hain, fsync kya karta hai, aur crash ke baad kya bachta hai.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "order service",
          "x": 130,
          "y": 105
        },
        {
          "id": "cache",
          "icon": "🧠",
          "label": "page cache (RAM)",
          "x": 445,
          "y": 105
        },
        {
          "id": "disk",
          "icon": "💾",
          "label": "disk",
          "x": 760,
          "y": 105
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "cache"
        },
        {
          "from": "cache",
          "to": "disk"
        }
      ],
      "viz": {
        "w": 890,
        "h": 215
      },
      "vars": [
        {
          "id": "cache",
          "label": "Sirf RAM mein"
        },
        {
          "id": "disk",
          "label": "Disk par pakka"
        },
        {
          "id": "user",
          "label": "User ko"
        }
      ],
      "steps": [
        {
          "title": "Order aaya",
          "clock": "0 ms",
          "say": "Order-41 (₹250) aaya. Service <b>write()</b> karti hai: \"file mein likh do\". write() turant laut aata hai — ~1 µs.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "order-41"
            },
            "cache": {
              "tone": "busy",
              "badge": "order-41"
            },
            "disk": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "cache": "order-41",
            "disk": "—",
            "user": "\"done\" ✓"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "write()",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "write() laut aaya. Order-41 abhi asal mein kahan hai?",
            "choices": [
              "OS ke page cache mein, yaani RAM mein — disk par baad mein jaayega",
              "Disk par — write() tabhi lautta hai jab disk \"likh liya\" kehti hai",
              "Service ke apne variable mein — OS ko abhi kuch mila hi nahi"
            ],
            "answer": 0,
            "hint": "1 µs mein disk tak jaana mumkin hai?",
            "explain": "Disk ko ek pakka likhne mein milliseconds lagte hain; write() microseconds mein lautta hai. OS bytes apne page cache (RAM) mein rakh leta hai aur \"ho gaya\" kehta hai. Disk par baad mein, apni suvidha se.",
            "choiceExplanations": [
              "Disk ko ek pakka likhne mein milliseconds lagte hain; write() microseconds mein lautta hai. OS bytes apne page cache (RAM) mein rakh leta hai aur \"ho gaya\" kehta hai. Disk par baad mein, apni suvidha se.",
              "Disk ka jawab milliseconds leta hai (ex1: fsync ~1.2–4.8 ms). write() itna intezaar nahi karta.",
              "write() ne bytes OS ko de diye; ab bytes OS ke page cache mein hain."
            ]
          }
        },
        {
          "title": "Doosra order",
          "clock": "1 ms",
          "say": "Order-42 par bhi write() hua aur turant \"done\" mila. User khush.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "order-42"
            },
            "cache": {
              "tone": "busy",
              "badge": "41, 42"
            },
            "disk": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "cache": "order-41, order-42",
            "disk": "—",
            "user": "\"done\" ✓"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "write()",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Process mara",
          "clock": "2 ms",
          "say": "Service ka process crash hua (<code>kill -9</code>). OS chal raha hai.",
          "nodes": {
            "app": {
              "tone": "bad",
              "badge": "mara ✗"
            },
            "cache": {
              "tone": "busy",
              "badge": "41, 42"
            },
            "disk": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "cache": "order-41, order-42",
            "disk": "—",
            "user": "—"
          },
          "ask": {
            "q": "Process mar gaya, OS zinda hai. Order-41 aur 42 ka kya hoga?",
            "choices": [
              "Bach jaayenge — OS ke page cache mein hain, OS baad mein disk par likh dega",
              "Gaye — process ke saath us process ke likhe saare bytes bhi mit jaate hain",
              "Aadhe bachenge — sirf pehle likhe gaye bytes disk tak pahunchenge"
            ],
            "answer": 0,
            "hint": "Bytes kiske paas hain: process ke, ya OS ke?",
            "explain": "write() ke baad bytes OS ke paas hain, process ke paas nahi. Process mare toh bhi OS bytes disk par likh deta hai. Lab ex2 (asli): writer ko SIGKILL kiya, 5,000–5,085 \"done\" orders mein se 0 gaye — fsync ke bina bhi.",
            "choiceExplanations": [
              "write() ke baad bytes OS ke paas hain, process ke paas nahi. Process mare toh bhi OS bytes disk par likh deta hai. Lab ex2 (asli): writer ko SIGKILL kiya, 5,000–5,085 \"done\" orders mein se 0 gaye — fsync ke bina bhi.",
              "Page cache OS ka hai. Process marne se OS ka cache nahi mit-ta.",
              "Dono orders poore OS ke paas hain; OS dono likhega."
            ]
          }
        },
        {
          "title": "Bijli gayi",
          "clock": "3 ms",
          "say": "Ab socho: process nahi, poori machine ki bijli gayi. Is model mein OS ne abhi tak kuch disk par nahi bheja tha. RAM mein jo tha, sab mit gaya — page cache bhi.",
          "nodes": {
            "app": {
              "tone": "bad",
              "badge": "band"
            },
            "cache": {
              "tone": "bad",
              "badge": "khaali ✗"
            },
            "disk": {
              "tone": "idle",
              "badge": "kuch nahi"
            }
          },
          "vars": {
            "cache": "mit gaya",
            "disk": "—",
            "user": "dono ko \"done\" mila tha"
          },
          "ask": {
            "q": "Restart ke baad order-41 aur 42?",
            "choices": [
              "Gaye — dono sirf RAM mein the, jabki user ko \"done\" mil chuka tha",
              "Bache — OS bijli jaate hi aakhri pal mein page cache disk par likh deta hai",
              "Bache — disk ka apna chhota cache bijli jaane par bhi data sambhal leta hai"
            ],
            "answer": 0,
            "hint": "Bijli ke bina RAM mein kuch rehta hai?",
            "explain": "Page cache RAM hai, aur bijli ke saath RAM khaali. Dono orders ko \"done\" mila tha, par disk tak koi nahi pahuncha. Lab ex0 ke model mein sync=none + power cut se \"done\" orders khoye. Asli machine par OS background mein kuch bytes pehle bhi disk par bhej deta hai, par is baat ki koi guarantee nahi.",
            "choiceExplanations": [
              "Page cache RAM hai, aur bijli ke saath RAM khaali. Dono orders ko \"done\" mila tha, par disk tak koi nahi pahuncha. Lab ex0 ke model mein sync=none + power cut se \"done\" orders khoye. Asli machine par OS background mein kuch bytes pehle bhi disk par bhej deta hai, par is baat ki koi guarantee nahi.",
              "Bijli achanak jaati hai; OS ko aakhri pal ka mauka nahi milta.",
              "Kuch drives ke cache ko bijli jaane par bachane ka intezaam hota hai, sab ke nahi — aur page cache tak drive ka haath nahi."
            ]
          }
        },
        {
          "title": "fsync",
          "clock": "5 ms",
          "say": "Ab service har order ke baad <b>fsync</b> karti hai: \"page cache se disk tak likho, aur disk 'stored' kahe tab lauto\". Phir \"done\". Is machine par ek fsync ~1.2–4.8 ms.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "order-43"
            },
            "cache": {
              "tone": "ok",
              "badge": ""
            },
            "disk": {
              "tone": "ok",
              "badge": "order-43 ✓"
            }
          },
          "vars": {
            "cache": "—",
            "disk": "order-43",
            "user": "\"done\" ✓ (pakka)"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "write()",
              "tone": "ok"
            },
            {
              "from": "cache",
              "to": "disk",
              "label": "fsync",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "write() sirf OS ke page cache (RAM) tak pahunchata hai. Process crash par OS bytes bacha leta hai. Bijli jaane par RAM mein pade bytes kho sakte hain: OS background mein kuch bytes pehle bhej deta hai, par guarantee nahi. Poora write aur safal fsync ho jaaye, tab \"done\" kaho."
    },
    {
      "type": "cards",
      "title": "⏱️ Pakka karne ki keemat",
      "goal": "fsync safe hai, par mehnga. Lab 55 ex1 is machine par asli files aur asli fsync se naapta hai.",
      "lesson": "Har record par fsync = sau-hazaar ke beech records/second. Group commit kai commits ko ek fsync mein le jaata hai: har commit phir bhi pakka, par fsyncs kam.",
      "steps": [
        {
          "title": "1. Do raftaar",
          "say": "Sirf write(): <b>6–17 lakh</b> records/second. Har record ke baad fsync: <b>207–806</b>. Har 100 records par ek fsync: 22,000–71,000.",
          "ask": {
            "q": "Diwali sale mein 5,000 orders/second aate hain. Har order ke baad apna fsync. Is machine par kya hoga?",
            "choices": [
              "Line lagegi — har order apna fsync le toh is machine par ~207–806/second hi pakke honge",
              "Sab theek — fsync sirf CPU ka kaam hai, aur 14 cores mil ke 5,000 aaram se kar lenge",
              "Sab theek — har 100 orders par ek fsync wali raftaar har order par bhi milegi"
            ],
            "answer": 0,
            "hint": "Ek fsync ~1.2–4.8 ms. Ek second mein kitne?",
            "explain": "Ek fsync disk ka intezaar hai, CPU ka kaam nahi. 1.2–4.8 ms ka ek fsync = ek second mein ~207–806. 5,000 orders/second ke liye har order ka apna fsync kaafi nahi; orders line mein lagenge.",
            "choiceExplanations": [
              "Ek fsync disk ka intezaar hai, CPU ka kaam nahi. 1.2–4.8 ms ka ek fsync = ek second mein ~207–806. 5,000 orders/second ke liye har order ka apna fsync kaafi nahi; orders line mein lagenge.",
              "Intezaar disk ka hai; zyada cores hone se ek disk ke fsync tez nahi hote.",
              "68,000/second tab aaya jab 100 records ne ek fsync baanta. Har order ka apna fsync = 207–806."
            ]
          }
        },
        {
          "title": "2. Bus, taxi nahi",
          "say": "Taxi: har sawaari ke liye alag gaadi. Bus: jo stop par khade hain, sab ek trip mein. <b>Group commit</b> bus hai: ek fsync chal raha ho tab jo commits aate hain, sab agle ek fsync mein saath.",
          "ask": {
            "q": "64 log ek saath order karte hain. Har commit apna fsync: p50 intezaar 279–296 ms. Group commit ke saath p50 kitna?",
            "choices": [
              "~3–9 ms — 32 commits ek fsync baant-te hain; line chhoti, commits/s 27–98× zyada",
              "279–296 ms hi — commit pakka karna hai toh har commit ko apna fsync chahiye hi",
              "0 ms — group commit fsync hata deta hai, isliye intezaar khatam ho jaata hai"
            ],
            "answer": 0,
            "hint": "Ek fsync mein 32 commits jaayein toh line ka kya hoga?",
            "explain": "Lab ex1 (asli): 64 clients, group commit — har fsync mein ~32 commits, p50 2.6–8.5 ms, 7,101–23,532 commits/s. Apne-apne fsync mein 227–265/s aur 279–296 ms. Virtual disk ki raftaar run-to-run badli, par har run mein group commit 27–98× aage. Har commit phir bhi fsync ke baad hi \"done\".",
            "choiceExplanations": [
              "Lab ex1 (asli): 64 clients, group commit — har fsync mein ~32 commits, p50 2.6–8.5 ms, 7,101–23,532 commits/s. Apne-apne fsync mein 227–265/s aur 279–296 ms. Virtual disk ki raftaar run-to-run badli, par har run mein group commit 27–98× aage. Har commit phir bhi fsync ke baad hi \"done\".",
              "Ek fsync kai commits ko ek saath pakka kar sakta hai; har commit ka alag fsync zaroori nahi.",
              "fsync hata nahi; 200 fsyncs mein 6,400 commits pakke hue."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "RAM wala OS ka buffer: <b>page cache</b>. Disk tak pakka likhwana: <b>fsync</b>. Crash ke baad bhi \"done\" sach rehna: <b>durability</b> (ACID ka D). Kai commits ek fsync mein: <b>group commit</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Crash ka model aur fsync ka bill",
      "project": "55-persistence",
      "exercise": "ex0-slowmo",
      "goal": "Pehle model: sync=commit aur sync=none par app crash vs power cut. Phir asli fsync is machine par.",
      "why": "Node 22+ chahiye. ex0 model hai (har run same). ex1 asli files aur fsync hai; numbers machine aur disk ke saath badlenge, ~20 second chalta hai.",
      "steps": [
        {
          "text": "Lab folder se: crash ka model.",
          "cmd": "cd docker-labs/55-persistence && npm start -- ex0-slowmo",
          "expect": "== MODEL: sync=commit (fsync before saying \"done\") ==\nput order-41=250            → done │ wal.log: 1 on disk + 0 only in page cache │ table.snap: 0 rows\nput order-42=180            → done │ wal.log: 2 on disk + 0 only in page cache │ table.snap: 0 rows\ncheckpoint (table + empty log)     │ wal.log: 0 on disk + 0 only in page cache │ table.snap: 2 rows\nput order-43=320            → done │ wal.log: 1 on disk + 0 only in page cache │ table.snap: 2 rows\nput order-44=90             → done │ wal.log: 2 on disk + 0 only in page cache │ table.snap: 2 rows\n  app crash (kill -9) → restart: 2 rows from table.snap + 2 replayed from log │ lost: nothing\n  power cut           → restart: 2 rows from table.snap + 2 replayed from log │ lost: nothing\n\n== MODEL: sync=none (say \"done\" right after write()) ==\nput order-41=250            → done │ wal.log: 0 on disk + 1 only in page cache │ table.snap: 0 rows\nput order-42=180            → done │ wal.log: 0 on disk + 2 only in page cache │ table.snap: 0 rows\ncheckpoint (table + empty log)     │ wal.log: 0 on disk + 0 only in page cache │ table.snap: 2 rows\nput order-43=320            → done │ wal.log: 0 on disk + 1 only in page cache │ table.snap: 2 rows\nput order-44=90             → done │ wal.log: 0 on disk + 2 only in page cache │ table.snap: 2 rows\n  app crash (kill -9) → restart: 2 rows from table.snap + 2 replayed from log │ lost: nothing\n  power cut           → restart: 2 rows from table.snap + 0 replayed from log │ lost: order-43, order-44 (both said \"done\")\n\nMODEL timings on this machine (ex1): write() ~1 µs (RAM); fsync ~1–5 ms (the device). The \"done\" in sync=none is ~1,000× faster\n— and that speed is exactly the page cache, which a power cut erases."
        },
        {
          "text": "Asli fsync aur group commit.",
          "cmd": "npm start -- ex1-fsync",
          "expect": "REAL RUN: Node v24.18.0, linux 6.6.87.2-microsoft-standard-WSL2; temp folder /tmp\nrecord = 107 bytes (12-byte header + JSON order). Numbers are for THIS machine and disk; they change run to run.\n\n== A. one writer ==\nwrite() only, no fsync          20,000 records      18 ms   10,97,811 records/s\nfsync after every record         2,000 records    2683 ms         745 records/s\nfsync after every 10            20,000 records    2669 ms       7,492 records/s\nfsync after every 100           20,000 records     282 ms      70,857 records/s\n\n== B. clients waiting for \"done\" (each client: 100 commits, one after another) ==\nmode                    clients   commits/s    p50 wait    p99 wait   fsyncs   records per fsync\nown fsync per commit          1         693      1.2 ms      5.9 ms      100                 1.0\ngroup commit                  1         614      1.3 ms      7.1 ms      100                 1.0\nown fsync per commit          8         538     12.5 ms     29.3 ms      800                 1.0\ngroup commit                  8       2,024      3.1 ms     12.0 ms      200                 4.0\nown fsync per commit         64         239    295.6 ms    364.8 ms     6400                 1.0\ngroup commit                 64      23,532      2.6 ms      4.0 ms      200                32.0\n\nfsync waits for the device to say \"stored\". write() alone only reached the OS page cache (RAM)."
        }
      ],
      "observe": {
        "q": "ex0 mein sync=none par app crash ke baad order-43 aur 44 bache, par power cut ke baad gaye. Kyun?",
        "choices": [
          "App crash OS ka page cache nahi mitata; model ka power cut page cache ke bytes mita deta hai",
          "App crash ke baad restart mein service ne order-43 aur 44 ko dobara bhej diya tha",
          "Power cut aakhri do writes hamesha mitata hai, chahe un writes ka fsync hua ho"
        ],
        "answer": 0,
        "hint": "kill -9 kis cheez ko khatam karta hai: process ko ya OS ko?",
        "explain": "kill -9 sirf process khatam karta hai. Order-43 aur 44 ke bytes OS ke page cache mein the, aur OS zinda tha. Model ka power cut page cache ke saare bytes mita deta hai. sync=none mein un bytes ka fsync hua hi nahi tha.",
        "choiceExplanations": [
          "kill -9 sirf process khatam karta hai. Order-43 aur 44 ke bytes OS ke page cache mein the, aur OS zinda tha. Model ka power cut page cache ke saare bytes mita deta hai. sync=none mein un bytes ka fsync hua hi nahi tha.",
          "Model mein koi retry nahi; restart sirf disk se padhta hai.",
          "sync=commit wale run mein power cut ke baad bhi order-43 aur 44 bache, kyunki fsync ho chuka tha."
        ]
      },
      "lesson": "Model: sirf fsync se pehle ka \"done\" power cut mein jhooth ban jaata hai. Asli run: har record par fsync mehnga, group commit wahi pakkapan sasta deta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — durability",
    "instructions": "Pehle socho: \"done\" kehne se pehle bytes kahan tak pahunche the, aur crash kis cheez ko mitata hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Data center mein bijli gayi. Restart ke baad integrity checks theek hain, par kuch orders durable log mein nahi hain, jinhe API ne \"saved\" kaha tha. Trace mein \"saved\" fsync poora hone se pehle gaya. Kya badloge?",
        "choices": [
          "\"saved\" fsync poora hone ke baad bhejo; tab tak order sirf page cache mein tha",
          "Index dobara banao; orders log mein hain, par index orders ko dhoondh nahi paa raha",
          "Load balancer ki retries band karo; doosri request ne pehle order ko mita diya",
          "Network timeouts badhao; bijli se pehle packets gir gaye, server tak kuch nahi aaya"
        ],
        "answer": 0,
        "explain": "Trace dikhata hai ki \"saved\" fsync se pehle gaya. Bijli ke saath page cache ke bytes gaye. Commit boundary badlo: fsync poora hone ke baad hi \"saved\". Throughput ke liye group commit (ex1: 64 clients par 27–98× zyada commits/s).",
        "choiceExplanations": [
          "Trace dikhata hai ki \"saved\" fsync se pehle gaya. Bijli ke saath page cache ke bytes gaye. Commit boundary badlo: fsync poora hone ke baad hi \"saved\". Throughput ke liye group commit (ex1: 64 clients par 27–98× zyada commits/s).",
          "Integrity checks theek hain aur orders log mein hi nahi; index rebuild se gayab bytes wapas nahi aate.",
          "Do baar bhejne se duplicate banta, gayab nahi.",
          "API ne \"saved\" kaha tha, toh request server tak pahunchi thi."
        ]
      },
      {
        "q": "Ledger service har commit par fsync karti hai. 64 users ek saath pay karte hain: ~250 commits/s, aur har user ~280 ms rukta hai. Disk badle bina kya badloge?",
        "choices": [
          "Group commit — fsync chalte waqt aaye commits agle ek fsync mein saath, har commit phir bhi pakka",
          "fsync hata do — OS waise bhi kuch second mein likh deta hai, toh khatra bahut chhota hai",
          "Har user ke liye alag file — 64 files par 64 fsync ek saath chalenge, toh line khatam",
          "Ledger ko RAM mein rakho aur din ke ant mein ek baar disk par likh do — sabse tez"
        ],
        "answer": 0,
        "explain": "Group commit pakkapan rakhta hai aur fsyncs kam karta hai: lab ex1 mein 64 clients par 32 commits ek fsync mein, 27–98× zyada commits/s (7,101–23,532), p50 2.6–8.5 ms. Har commit ka \"done\" fsync ke baad hi.",
        "choiceExplanations": [
          "Group commit pakkapan rakhta hai aur fsyncs kam karta hai: lab ex1 mein 64 clients par 32 commits ek fsync mein, 27–98× zyada commits/s (7,101–23,532), p50 2.6–8.5 ms. Har commit ka \"done\" fsync ke baad hi.",
          "Ledger ke liye power cut mein \"done\" payment khona manzoor nahi.",
          "Alag files ke fsync bhi usi disk ka intezaar karte hain; alag files lab ne naapi nahi, aur kram ka jhanjhat badhta hai.",
          "Din bhar ke payments RAM mein = power cut par din bhar ka ledger gaya."
        ]
      }
    ]
  },
  "success": [
    "write(), page cache aur fsync ka farq samjha sakte ho",
    "App crash aur power cut mein kya bachta hai bata sakte ho",
    "Group commit ka faayda numbers se samjha sakte ho"
  ],
  "cards": [
    {
      "front": "write() laut aaya — data kahan hai?",
      "back": "OS ke page cache (RAM) mein. Process crash par bachta hai (ex2: 0 gaye). Power cut par kho sakta hai; guarantee nahi. Safal fsync ke baad disk par pakka."
    },
    {
      "front": "fsync ki keemat (lab 55, is machine)?",
      "back": "Sirf write(): 6–17 lakh/s. Har record par fsync: 207–806/s (~1.2–4.8 ms). Har 100 par ek fsync: 22,000–71,000/s."
    },
    {
      "front": "Group commit?",
      "back": "fsync chalte waqt aaye commits agle ek fsync mein saath. Lab: 64 clients, ~32 per fsync, 27–98× zyada commits/s, p50 2.6–8.5 ms vs 279–296 ms. Har commit phir bhi pakka."
    }
  ]
}
]);
})();
