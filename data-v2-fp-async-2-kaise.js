/* First Principles — FAANG Senior Engineer.
   Source credit: Kafka vs RabbitMQ vs SQS — Async System (mQf7RtBuiaY), numbered video 11/15.
   Evidence: docker-labs/61-queues/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "prod", "icon": "🖥️", "label": "Producer", "x": 110, "y": 190}, {"id": "p0", "icon": "📜", "label": "Partition 0", "x": 420, "y": 70}, {"id": "p1", "icon": "📜", "label": "Partition 1", "x": 420, "y": 190}, {"id": "p2", "icon": "📜", "label": "Partition 2", "x": 420, "y": 310}, {"id": "email", "icon": "📧", "label": "Email group", "x": 760, "y": 110}, {"id": "ana", "icon": "📊", "label": "Analytics group", "x": 760, "y": 270}];
const EDGES = [{"from": "prod", "to": "p0"}, {"from": "prod", "to": "p1"}, {"from": "prod", "to": "p2"}, {"from": "p0", "to": "email"}, {"from": "p1", "to": "email"}, {"from": "p2", "to": "ana"}];
VISUALS["fp-async-kaise"] = { t: "Log mein event rehta hai; har group ka apna offset. Key ek user ko ek partition mein rakhti hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { prod: {tone:'acc',badge:'key = user'}, p0: {tone:'ok',badge:'A'}, p1: {tone:'ok',badge:'B'}, p2: {tone:'ok',badge:'C'}, email: {tone:'ok',badge:'offset'}, ana: {tone:'ok',badge:'offset'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-async-kaise",
  "icon": "📜",
  "group": "📮 Async: Queue vs Stream",
  "title": "Async 2 · Kaise — queue vs log, partitions aur kram",
  "badge": "Scroll Ka Rakhwala",
  "objectives": [
    "Task queue vs log: delete vs offset, fan-out, replay",
    "Partition key se kram; consumers ki chhat; hot key",
    "Kafka ki raftaar: batching, page cache, zero copy"
  ],
  "lesson": [
    "<h3>🏤 Post office aur bahi-khaata</h3><p>Post office mein chitthi ek hi postman le jaata hai, aur pahunchte hi kaam khatam. Teen logon ko same khabar chahiye? Teen chitthiyan likho.</p><p>Gaon ki bahi-khaata alag hai: har ghatna neeche likhi jaati hai, mitaayi nahi jaati. Munim, sarpanch aur patwari apne-apne panne par bookmark rakhte hain. Galti mili? Bookmark peeche karo, phir padho — jab tak purane panne phade na gaye hon.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📜 Post office vs scroll — ek event, teen services",
      "goal": "Lab 61 ex1 (asli code: lib/queue.js aur lib/log.js) aur ex3 (Kafka ka murmur2 partitioner). Signup event email, analytics aur fraud — teeno ko chahiye.",
      "nodes": [
        {
          "id": "prod",
          "icon": "🖥️",
          "label": "Producer",
          "x": 110,
          "y": 190
        },
        {
          "id": "p0",
          "icon": "📜",
          "label": "Partition 0",
          "x": 420,
          "y": 70
        },
        {
          "id": "p1",
          "icon": "📜",
          "label": "Partition 1",
          "x": 420,
          "y": 190
        },
        {
          "id": "p2",
          "icon": "📜",
          "label": "Partition 2",
          "x": 420,
          "y": 310
        },
        {
          "id": "email",
          "icon": "📧",
          "label": "Email group",
          "x": 760,
          "y": 110
        },
        {
          "id": "ana",
          "icon": "📊",
          "label": "Analytics group",
          "x": 760,
          "y": 270
        }
      ],
      "edges": [
        {
          "from": "prod",
          "to": "p0"
        },
        {
          "from": "prod",
          "to": "p1"
        },
        {
          "from": "prod",
          "to": "p2"
        },
        {
          "from": "p0",
          "to": "email"
        },
        {
          "from": "p1",
          "to": "email"
        },
        {
          "from": "p2",
          "to": "ana"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "tool",
          "label": "Tool"
        },
        {
          "id": "who",
          "label": "Kisko mila"
        },
        {
          "id": "note",
          "label": "Baat"
        }
      ],
      "steps": [
        {
          "title": "Ek queue, teen services",
          "clock": "queue",
          "say": "Teeno services ek hi task queue padhti hain. Queue har message ek hi worker ko deti hai, phir delete. Lab: email 334, analytics 333, fraud 333.",
          "nodes": {
            "prod": {
              "tone": "acc",
              "badge": "1,000 events"
            },
            "p0": {
              "tone": "idle",
              "badge": ""
            },
            "p1": {
              "tone": "idle",
              "badge": ""
            },
            "p2": {
              "tone": "idle",
              "badge": ""
            },
            "email": {
              "tone": "bad",
              "badge": "334"
            },
            "ana": {
              "tone": "bad",
              "badge": "333"
            }
          },
          "vars": {
            "tool": "task queue",
            "who": "har service ko ek-tihaai",
            "note": "competing consumers"
          },
          "ask": {
            "q": "Teeno services ko saare events chahiye. Queue ke saath kya karna padega?",
            "choices": [
              "Har service ki apni queue (fan-out, jaise SNS → 3 SQS)",
              "Ek hi queue par teeno ke workers badha do, sabko sab mil jaayega",
              "Queue ko \"delete mat karo\" setting de do, sab sab padh lenge"
            ],
            "answer": 0,
            "hint": "Queue message kitne workers ko deti hai?",
            "explain": "Task queue = post office: ek chitthi ek hi worker. Teen services ko poora stream chahiye toh teen queues (har service ki ek), aur producer teeno mein daale (SNS jaisa fan-out). Log mein har group ka apna offset hota hai, toh ek hi log kaafi.",
            "choiceExplanations": [
              "Task queue = post office: ek chitthi ek hi worker. Teen services ko poora stream chahiye toh teen queues (har service ki ek), aur producer teeno mein daale (SNS jaisa fan-out). Log mein har group ka apna offset hota hai, toh ek hi log kaafi.",
              "Workers badhane se har service ka hissa nahi badhta; messages bant'te hi rehte hain.",
              "Delete na karne par visibility timeout ke baad message phir aata hai — duplicates, fan-out nahi."
            ]
          }
        },
        {
          "title": "Log, apne offsets",
          "clock": "log",
          "say": "Kafka jaisa log: event append hota hai, padhne par mit'ta nahi. Har consumer group ka apna offset. Lab: email 1,000, analytics 1,000, fraud 1,000.",
          "nodes": {
            "prod": {
              "tone": "acc",
              "badge": "append"
            },
            "p0": {
              "tone": "ok",
              "badge": ""
            },
            "p1": {
              "tone": "ok",
              "badge": ""
            },
            "p2": {
              "tone": "ok",
              "badge": ""
            },
            "email": {
              "tone": "ok",
              "badge": "offset 1000"
            },
            "ana": {
              "tone": "ok",
              "badge": "offset 1000"
            }
          },
          "vars": {
            "tool": "log",
            "who": "har group ko poora",
            "note": "offsets alag"
          }
        },
        {
          "title": "Replay — retention tak",
          "clock": "replay",
          "say": "Analytics mein bug, 14 din ke counts galat. Offset 14 din peeche. Lab: retention 7 din (Kafka default) par 7,000 of 14,000; 14 din par poore.",
          "nodes": {
            "prod": {
              "tone": "idle",
              "badge": ""
            },
            "p0": {
              "tone": "busy",
              "badge": "purana mita"
            },
            "p1": {
              "tone": "ok",
              "badge": ""
            },
            "p2": {
              "tone": "ok",
              "badge": ""
            },
            "email": {
              "tone": "idle",
              "badge": ""
            },
            "ana": {
              "tone": "acc",
              "badge": "seek −14 din"
            }
          },
          "vars": {
            "tool": "log",
            "who": "analytics",
            "note": "7 din default"
          },
          "ask": {
            "q": "Video: \"offset 2 hafte peeche le jao, data wahin hai\". Kab galat?",
            "choices": [
              "Retention 7 din (Kafka default) ho toh — purane segments mit chuke",
              "Kabhi nahi — Kafka mein data kabhi nahi mit'ta, isliye hamesha replay",
              "Jab consumer group ka naam badla ho — offsets naam se jude hain"
            ],
            "answer": 0,
            "hint": "Kafka ka log.retention.hours default kya hai?",
            "explain": "Kafka purane segments retention (default 168 ghante = 7 din) ke baad mita deta hai. Replay utna hi peeche jitna retention. Poori history ki dobara ginti chahiye toh retention badhao ya poora archive (S3) pehle se rakho. Compaction har key ki aakhri value rakhta hai, poori history nahi.",
            "choiceExplanations": [
              "Kafka purane segments retention (default 168 ghante = 7 din) ke baad mita deta hai. Replay utna hi peeche jitna retention. Poori history ki dobara ginti chahiye toh retention badhao ya poora archive (S3) pehle se rakho. Compaction har key ki aakhri value rakhta hai, poori history nahi.",
              "Retention se purana data mitaaya jaata hai; \"infinite scroll\" ek misaal hai.",
              "Naya group ka offset alag, par default (auto.offset.reset = latest) naye events se shuru; aur data retention tak hi."
            ]
          }
        },
        {
          "title": "Partitions aur kram",
          "clock": "kram",
          "say": "Topic ke 3 partitions; har partition ek scroll. Key = user id → ek user ke saare events ek hi partition. Lab ex3 (model: consumers ki raftaar alag, har partition serially chalti hai): key ke saath 0 users ulte kram mein, round-robin par 1,000 mein se 1,000. Partition ke andar parallel handlers ya retries kram phir tod sakte hain.",
          "nodes": {
            "prod": {
              "tone": "acc",
              "badge": "key = user"
            },
            "p0": {
              "tone": "ok",
              "badge": "user A"
            },
            "p1": {
              "tone": "ok",
              "badge": "user B"
            },
            "p2": {
              "tone": "ok",
              "badge": "user C"
            },
            "email": {
              "tone": "ok",
              "badge": "kram mein"
            },
            "ana": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "tool": "log + key",
            "who": "har user ek partition",
            "note": "kram sirf partition ke andar"
          },
          "flows": [
            {
              "from": "prod",
              "to": "p0",
              "label": "A",
              "tone": "acc"
            },
            {
              "from": "prod",
              "to": "p1",
              "label": "B",
              "tone": "acc"
            },
            {
              "from": "prod",
              "to": "p2",
              "label": "C",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Partitions badhe",
          "clock": "6 → 8",
          "say": "Traffic badha, team ne 6 → 8 partitions kiye. murmur2 % N badla: lab mein 75% keys nayi partition mein. Purani partition mein bina padhe events + nayi mein naye = kram ka khatra.",
          "nodes": {
            "prod": {
              "tone": "busy",
              "badge": "% 8"
            },
            "p0": {
              "tone": "busy",
              "badge": "purane A"
            },
            "p1": {
              "tone": "busy",
              "badge": "naye A"
            },
            "p2": {
              "tone": "idle",
              "badge": ""
            },
            "email": {
              "tone": "bad",
              "badge": "ulta?"
            },
            "ana": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "tool": "log",
            "who": "75% keys hili",
            "note": "partition count pehle socho"
          },
          "ask": {
            "q": "Ek group mein 6 partitions aur 12 consumers. Kitne kaam karenge?",
            "choices": [
              "6 — ek partition ek group mein ek hi consumer ko milti hai",
              "12 — har consumer partition ka aadha-aadha hissa padhega",
              "1 — Kafka ek group mein ek hi consumer chalata hai"
            ],
            "answer": 0,
            "hint": "Ek partition ko group ke kitne consumers ek saath padh sakte hain?",
            "explain": "Ek group ke andar har partition ek hi consumer ko milti hai (kram bachane ke liye). 12 consumers, 6 partitions = 6 kaam par, 6 khaali. Parallelism ki chhat = partitions. Lab 61 ex3 B.",
            "choiceExplanations": [
              "Ek group ke andar har partition ek hi consumer ko milti hai (kram bachane ke liye). 12 consumers, 6 partitions = 6 kaam par, 6 khaali. Parallelism ki chhat = partitions. Lab 61 ex3 B.",
              "Partition ke tukde nahi hote; ek group mein ek partition = ek consumer.",
              "Ek group ke kai consumers alag-alag partitions padhte hain."
            ]
          }
        }
      ],
      "lesson": "Queue = kaam baanto (ek message, ek worker, phir delete). Log = events rakho (har group ka offset, replay retention tak). Kram sirf partition ke andar; key se ek entity ek partition."
    },
    {
      "type": "cards",
      "title": "⚙️ Kafka tez kyun — is SSD par naapa",
      "goal": "Lab 61 ex2 (asli disk, 3 runs): 64 MB, 4 KB writes seedha vs random, aur 1 MB batch. O_DIRECT = OS page cache ke bina.",
      "lesson": "Is SSD par seedha vs random overwrite lagbhag barabar; batching ka asar bada. Spinning disk par seedha likhna sach mein bahut tez. Kafka ki baatein (batching, page cache) docs se; lab ne Kafka nahi chalaya.",
      "steps": [
        {
          "title": "1. Seedha vs random (SSD)",
          "say": "O_DIRECT, 4 KB overwrites (file pehle se bani): seedha 42–48 MiB/sec, random 43–46 MiB/sec — lagbhag barabar (1.0–1.1×). Video ka \"random access maarta hai\" spinning disk ke liye sahi hai (head ka seek ~5–10 ms); SSD mein head hi nahi.",
          "ask": {
            "q": "Is SSD par 4 KB writes ko tez karne ka sabse bada tareeka?",
            "choices": [
              "Bade tukde: 1 MB writes 336–823 MiB/sec, 4 KB se 7–17× tez",
              "Random ki jagah seedha likho — SSD par seedha ~10× tez ho jaata hai",
              "Har write ke baad fsync karo, taaki disk ka cache saaf rahe"
            ],
            "answer": 0,
            "hint": "ex2 ki teesri row dekho.",
            "explain": "Har write ki apni keemat hai (system call, disk command). 4 KB × 16,384 writes vs 1 MB × 64 writes: same bytes, 7–17× tez (3 runs; number run ke saath bahut badalta hai). Kafka producer messages ko batch karta hai (batch.size, linger.ms), aur broker page cache mein likhta hai.",
            "choiceExplanations": [
              "Har write ki apni keemat hai (system call, disk command). 4 KB × 16,384 writes vs 1 MB × 64 writes: same bytes, 7–17× tez (3 runs; number run ke saath bahut badalta hai). Kafka producer messages ko batch karta hai (batch.size, linger.ms), aur broker page cache mein likhta hai.",
              "Is SSD par seedha vs random 1.0–1.1× — farq lagbhag nahi.",
              "Har write par fsync sabse dheema raasta hai (FP topic 5)."
            ]
          }
        },
        {
          "title": "2. Zero copy",
          "say": "Kafka sendfile se page cache ka data seedha socket ko deta hai; broker ki memory mein copy nahi. Video sahi — par TLS on ho toh data ko encrypt karne ke liye broker ki memory mein laana padta hai, aur zero copy nahi hota (Kafka docs)."
        },
        {
          "title": "3. Video ki sahi baatein",
          "say": "LinkedIn ne 2019 mein roz 7 trillion messages bataye. Kram sirf partition ke andar — sahi. Partition key (user id) — sahi. Queue = post office, log = scroll — achhi misaal."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Partitions aur disk",
      "project": "61-queues",
      "exercise": "ex3-partitions",
      "goal": "Kafka ka asli murmur2 partitioner: key se kram, groups ki chhat, hot key, 6 → 8. Phir is machine ki disk par append vs random vs batch.",
      "why": "Node 24+ chahiye. ex3 seeded (har run same). ex2 asli disk: numbers machine aur run ke saath badlenge (WSL ki virtual disk); temp folder mein 64 MB file, run ke baad delete.",
      "steps": [
        {
          "text": "Partitions.",
          "cmd": "cd docker-labs/61-queues && npm start -- ex3-partitions",
          "expect": "A. MODEL (seeded): 1,000 users × 10 events (created → paid → shipped …). 6 partitions, 6 consumers.\n   Har consumer apni partition kram se padhta hai. Consumers ki raftaar alag (1–4×, jaise GC ya lag); har event 1–9 ms × raftaar.\n   Model maanta hai: har consumer apni partition ka ek event poora karke hi agla leta hai (serial).\n   Kya har user ke events usi kram mein khatam hue jismein bane?\n\nkey = user id (hash se partition):   0 of 1,000 users ke events ulte kram mein\nkoi key nahi (round-robin chuna):     1000 of 1,000 users ke events ulte kram mein\n→ Kafka kram sirf EK partition ke andar deta hai. Ek user ke saare events ek partition = key do. Key kram ka mauka deti hai;\n  partition ke andar parallel handlers, retries ya rebalance ke baad ka purana kaam kram phir tod sakte hain.\n  (Kafka Java producer bina key ke round-robin nahi, \"sticky\" batching karta hai; yahan round-robin sirf tulna ke liye.)\n\nB. Arithmetic: 6 partitions, ek consumer group. Har consumer 100 events/sec.\n\n 3 consumers → 3 kaam par, 0 khaali baithe → 300 events/sec\n 6 consumers → 6 kaam par, 0 khaali baithe → 600 events/sec\n12 consumers → 6 kaam par, 6 khaali baithe → 600 events/sec\n→ Ek group mein partition se zyada consumers bekaar. Parallelism ki chhat = partitions ki ginti.\n\nC. ASLI hash, seeded traffic: 10,000 users, popularity Zipf (s = 1.2). Key = user id. 6 partitions, 10 lakh events.\n\npartition load: 8.4%  31.7%  24.9%  8.7%  11.7%  14.5%\nsabse bhari partition = barabar hisse (16.7%) ka 1.90×. Top user akela: 20.8% events.\n→ Ek garam key ek hi partition par jaati hai; partitions badhane se garam key nahi bant-ti.\n\nD. ASLI ginti: partitions 6 → 8. Kitni keys nayi partition mein chali gayi? (1 lakh user ids, Kafka murmur2)\n\n75,091 of 1,00,000 keys (75.1%) ki partition badli.\n→ Purani partition mein us user ke bina padhe events + nayi partition mein naye events = badlaav ke waqt kram toot sakta hai.\n  Isliye partitions shuru mein soch kar rakho (ya badlaav se pehle producers rok kar purane events khatam karo)."
        },
        {
          "text": "Disk par append (~15 s).",
          "cmd": "npm start -- ex2-append",
          "expect": "ASLI: is machine ki disk par 64 MiB ki pehle se bani file, temp folder mein. Same bytes, alag kram aur size. Har row ke ant mein ek fsync.\n   File pehle se poori likhi hai, isliye ye overwrite hai — asli Kafka segment ka badhna (append) ya broker nahi naapa.\n\ntareeka                                                     MiB/sec   ek write (ausat, fsync samet)\nseedha overwrite, 4 KB writes, O_DIRECT (page cache nahi)       48   81.0 µs\nrandom jagah, 4 KB writes, O_DIRECT                             46   84.8 µs\nseedha overwrite, 1 MB writes, O_DIRECT (batching)             336   3.0 ms\nseedha overwrite, 4 KB writes, page cache + ek fsync           210   18.6 µs\nrandom jagah, 4 KB writes, page cache + ek fsync               227   17.2 µs\n\n→ O_DIRECT, 4 KB: seedha ÷ random = 1.0× — is SSD par lagbhag barabar. 1 MB writes 4 KB se 7× tez.\n→ SSD par random ki saza spinning disk (head ka seek, ~5–10 ms) se bahut kam hai; batching (bade writes) ka asar bada.\n  Page cache rows: OS writes ko RAM mein jodta hai aur fsync par disk ko bade tukdon mein bhejta hai."
        }
      ],
      "observe": {
        "q": "ex3 C: partitions 6 hain, phir bhi ek partition barabar hisse ka 1.9×. Kyun?",
        "choices": [
          "Top user akela 20.8% events — us user ki key ek hi partition par",
          "murmur2 hash kharab hai, isliye keys barabar nahi bant'ti",
          "6 partitions kam hain; 60 karne se har partition barabar ho jaayegi"
        ],
        "answer": 0,
        "hint": "Zipf traffic mein sabse popular user ke kitne events hain?",
        "explain": "Hash keys ko barabar baant'ta hai, events ko nahi. Ek garam key (top user, 20.8%) ke saare events ek partition mein. Partitions badhane se garam key nahi bant'ti. Ilaaj: garam key ko tod kar (key + suffix) — par tab us key ka kram chala jaata hai.",
        "choiceExplanations": [
          "Hash keys ko barabar baant'ta hai, events ko nahi. Ek garam key (top user, 20.8%) ke saare events ek partition mein. Partitions badhane se garam key nahi bant'ti. Ilaaj: garam key ko tod kar (key + suffix) — par tab us key ka kram chala jaata hai.",
          "Hash theek hai: 1 lakh keys par barabar bant'ta hai (ex3 D).",
          "60 partitions par bhi top user ka 20.8% ek hi partition par."
        ]
      },
      "lesson": "Partition key kram deti hai aur load ka bantwara bhi tay karti hai. Partitions ki ginti aur garam keys shuru mein socho."
    }
  ],
  "interview": {
    "title": "Interview Round — queue ya log",
    "instructions": "Pehle socho: kitni services ko event chahiye, kram chahiye ya nahi, aur replay chahiye ya nahi? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order events: inventory, billing, analytics aur fraud — chaaron ko chahiye; analytics ko kabhi-kabhi 30 din peeche se dobara ginna padta hai. Kya chunoge?",
        "choices": [
          "Log (Kafka) — har service ka group, retention 30+ din, key = order id",
          "Ek SQS queue — chaaron services ke workers usi queue se padhein",
          "Har service ko order service seedha REST call kare, ek ke baad ek",
          "Log (Kafka) default settings ke saath — replay hamesha milta hai"
        ],
        "answer": 0,
        "explain": "Kai consumers + replay = log. Har service ka apna consumer group (apna offset). Retention 30 din se zyada rakho, warna default 7 din par replay adhoora (lab 61 ex1). Key = order id, taaki ek order ke events kram mein.",
        "choiceExplanations": [
          "Kai consumers + replay = log. Har service ka apna consumer group (apna offset). Retention 30 din se zyada rakho, warna default 7 din par replay adhoora (lab 61 ex1). Key = order id, taaki ek order ke events kram mein.",
          "Ek queue mein chaaron ko sirf hissa milega (competing consumers), aur replay nahi.",
          "Seedhi calls phir se temporal coupling; ek service dheemi toh order atka.",
          "Default retention 7 din; 30 din peeche ka replay nahi milega."
        ]
      },
      {
        "q": "Ek user ke \"balance badha\" aur \"balance ghata\" events ulte kram mein process ho rahe hain. Topic par key nahi hai. Ilaaj?",
        "choices": [
          "Key = user id, taaki ek user ke saare events ek partition mein kram se",
          "Partitions badha do, taaki har event jaldi process ho aur kram bache",
          "Consumers ek kar do poore topic ke liye, taaki kabhi kram na toote",
          "Har event mein timestamp daalo aur consumer timestamp se sort kare"
        ],
        "answer": 0,
        "explain": "Kafka kram sirf ek partition ke andar deta hai. Bina key ke ek user ke events alag partitions mein, aur alag raftaar ke consumers kram tod dete hain (lab 61 ex3 A: 1,000 mein se 1,000). Key = user id se kram bachta hai, parallelism bhi.",
        "choiceExplanations": [
          "Kafka kram sirf ek partition ke andar deta hai. Bina key ke ek user ke events alag partitions mein, aur alag raftaar ke consumers kram tod dete hain (lab 61 ex3 A: 1,000 mein se 1,000). Key = user id se kram bachta hai, parallelism bhi.",
          "Zyada partitions = zyada jagah jahan ek user ke events bikhrein.",
          "Ek consumer bhi kai partitions ke beech kram nahi lauta sakta; key se ek user ek partition mein.",
          "Ghadiyan alag machines par alag; aur consumer kab tak ruke? Key seedha ilaaj hai."
        ]
      }
    ]
  },
  "success": [
    "Queue aur log ka farq (delete vs offset) bata sakte ho",
    "Partition key, kram aur consumers ki chhat samjha sakte ho",
    "Retention aur replay ka rishta bata sakte ho"
  ],
  "cards": [
    {
      "front": "Queue vs log?",
      "back": "Queue: ek message ek worker, phir delete (kaam baanto). Log: append, har group ka offset, replay retention tak (lab 61 ex1)."
    },
    {
      "front": "Kafka kram?",
      "back": "Sirf partition ke andar. Key = entity id. Partitions badalne par keys hilti hain (6 → 8: 75%). Group mein consumers ≤ partitions."
    },
    {
      "front": "Kafka tez kyun (SSD)?",
      "back": "Batching (lab: 1 MB writes 4 KB se 7–17×) + page cache + zero copy (TLS par nahi). Is SSD par seedha vs random lagbhag barabar."
    }
  ]
}
]);
})();
