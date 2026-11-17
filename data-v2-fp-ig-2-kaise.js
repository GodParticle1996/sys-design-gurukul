/* First Principles — FAANG Senior Engineer.
   Source credit: How to Build Instagram from Scratch (ozWW5nIdzQM), numbered video 15/15.
   Evidence: docker-labs/65-instagram/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "fans", "icon": "👥", "label": "10,000 likes/s", "x": 140, "y": 210}, {"id": "app", "icon": "🖥️", "label": "App workers", "x": 470, "y": 80}, {"id": "row", "icon": "🔒", "label": "Like count row", "x": 470, "y": 340}, {"id": "redis", "icon": "⚡", "label": "Memory counter", "x": 800, "y": 80}, {"id": "feed", "icon": "📰", "label": "Feed requests", "x": 800, "y": 340}];
const EDGES = [{"from": "fans", "to": "app"}, {"from": "app", "to": "row"}, {"from": "app", "to": "redis"}, {"from": "feed", "to": "app"}];
VISUALS["fp-ig-kaise"] = { t: "Garam row ki line app ke workers kha jaati hai; feed mein kaam write aur read ke beech khisakta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { fans: {tone:'busy',badge:'10k/s'}, app: {tone:'bad',badge:'workers'}, row: {tone:'bad',badge:'lock'}, redis: {tone:'ok',badge:'INCR'}, feed: {tone:'busy',badge:''} } }, {w:900,h:430}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-ig-kaise",
  "icon": "❤️",
  "group": "📸 Instagram: Sab Jodkar",
  "title": "Instagram 2 · Kaise — like ka toofan aur feed ka tarazu",
  "badge": "Toofan Ka Rakhwala",
  "objectives": [
    "Garam row app ke workers kaise kha jaati hai",
    "Sharded counter, write coalescing, set se retry-safe like",
    "Pull vs push vs hybrid feed ka asli tradeoff"
  ],
  "lesson": [
    "<h3>🏏 Stadium ka ek gate</h3><p>Final match ke baad 50,000 log ek hi gate se nikal rahe hain. Gate ek baar mein ek aadmi. Bheed itni ki parking, canteen, sab ke raste band — match dekhne na aaye log bhi phans gaye.</p><p>Ilaaj: zyada gate kholo, logon ko jattho mein nikaalo. Aaj ek viral photo ke likes aur feed par gate wali soch lagaate hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "❤️ Ek viral photo ne app kaise giraayi?",
      "goal": "Lab 65 ex2 (1 ms ka time-step model; maana: ek photo par 10,000 likes/s, saath mein 20,000 feed requests/s, app ke paas 2,000 workers ka saanjha pool, timeout 5 s, khaali worker pehle likes ko). Har like ek worker pakadta hai jab tak DB jawab na de.",
      "nodes": [
        {
          "id": "fans",
          "icon": "👥",
          "label": "10,000 likes/s",
          "x": 140,
          "y": 210
        },
        {
          "id": "app",
          "icon": "🖥️",
          "label": "App workers",
          "x": 470,
          "y": 80
        },
        {
          "id": "row",
          "icon": "🔒",
          "label": "Like count row",
          "x": 470,
          "y": 340
        },
        {
          "id": "redis",
          "icon": "⚡",
          "label": "Memory counter",
          "x": 800,
          "y": 80
        },
        {
          "id": "feed",
          "icon": "📰",
          "label": "Feed requests",
          "x": 800,
          "y": 340
        }
      ],
      "edges": [
        {
          "from": "fans",
          "to": "app"
        },
        {
          "from": "app",
          "to": "row"
        },
        {
          "from": "app",
          "to": "redis"
        },
        {
          "from": "feed",
          "to": "app"
        }
      ],
      "viz": {
        "w": 900,
        "h": 430
      },
      "vars": [
        {
          "id": "store",
          "label": "Store"
        },
        {
          "id": "likes",
          "label": "Likes hue (10 s)"
        },
        {
          "id": "feed",
          "label": "Feed fail"
        }
      ],
      "steps": [
        {
          "title": "1. Ek row",
          "clock": "hot row",
          "say": "<code>UPDATE photos SET like_count = like_count + 1</code>. Row ka lock ~1 ms — ek second mein ~1,000 likes. Baaki 9,000/s line mein, har ek ek worker pakde.",
          "nodes": {
            "fans": {
              "tone": "busy",
              "badge": "10k/s"
            },
            "app": {
              "tone": "busy",
              "badge": "bhar rahe"
            },
            "row": {
              "tone": "bad",
              "badge": "1/ms"
            },
            "redis": {
              "tone": "idle",
              "badge": ""
            },
            "feed": {
              "tone": "busy",
              "badge": "20k/s"
            }
          },
          "vars": {
            "store": "1 row",
            "likes": "—",
            "feed": "—"
          },
          "flows": [
            {
              "from": "fans",
              "to": "app",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "app",
              "to": "row",
              "label": "line",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "2. 177 ms baad",
          "clock": "outage",
          "say": "2,000 workers bhar gaye. Ab feed aur login ki requests ko worker nahi milta. 10 s mein: 9,999 likes hue, 88,001 ko worker hi nahi mila, feed ki 1,96,188 requests fail.",
          "nodes": {
            "fans": {
              "tone": "bad",
              "badge": ""
            },
            "app": {
              "tone": "bad",
              "badge": "0 khaali"
            },
            "row": {
              "tone": "bad",
              "badge": "1/ms"
            },
            "redis": {
              "tone": "idle",
              "badge": ""
            },
            "feed": {
              "tone": "bad",
              "badge": "fail"
            }
          },
          "vars": {
            "store": "1 row",
            "likes": "9,999",
            "feed": "1,96,188"
          },
          "ask": {
            "q": "Video: \"ek viral photo ne poori app gira di\". Model mein feed kyun gira, jabki feed ka DB alag kaam hai?",
            "choices": [
              "Likes ne app ke saare workers pakad liye; feed ko worker nahi mila",
              "Feed bhi usi row ko padhta hai, isliye lock mein phans gaya",
              "DB crash ho gaya, isliye saari queries ek saath fail hui"
            ],
            "answer": 0,
            "hint": "Feed request ko sabse pehle kya chahiye — DB ya app ka khaali worker?",
            "explain": "Har like ka worker DB ke jawab tak ruka rehta hai. Row ek second mein ~1,000 hi nipta-ti hai, toh 177 ms mein 2,000 workers bhar gaye. Feed request ko worker hi nahi mila — DB tak pahunchi hi nahi. Saanjhe worker pool ne ek photo ki dikkat poori app mein faila di (bulkhead ka sabak, lab 39). Dhyan: model mein khaali worker pehle likes ko milta hai; feed ko pehle mile toh feed fail 0 aur likes turant mana — girna pool ke niyam par tika, row ki raftaar (~1,000/s) har haal mein same.",
            "choiceExplanations": [
              "Har like ka worker DB ke jawab tak ruka rehta hai. Row ek second mein ~1,000 hi nipta-ti hai, toh 177 ms mein 2,000 workers bhar gaye. Feed request ko worker hi nahi mila — DB tak pahunchi hi nahi. Saanjhe worker pool ne ek photo ki dikkat poori app mein faila di (bulkhead ka sabak, lab 39). Dhyan: model mein khaali worker pehle likes ko milta hai; feed ko pehle mile toh feed fail 0 aur likes turant mana — girna pool ke niyam par tika, row ki raftaar (~1,000/s) har haal mein same.",
              "Model mein feed us row ko nahi chhoota — rukawat workers ki hai.",
              "DB chalta raha (~1,000 likes/s); app ke workers khatam hue."
            ]
          }
        },
        {
          "title": "3. 100 counter rows",
          "clock": "sharded",
          "say": "Like ko 100 mein se kisi random row par likho (sharded counter); total = 100 rows ka jod. 100 DB connections ke saath lock 100 jagah bant gaya: 99,990 likes, feed fail 0.",
          "nodes": {
            "fans": {
              "tone": "busy",
              "badge": ""
            },
            "app": {
              "tone": "ok",
              "badge": "khaali"
            },
            "row": {
              "tone": "ok",
              "badge": "100 rows"
            },
            "redis": {
              "tone": "idle",
              "badge": ""
            },
            "feed": {
              "tone": "ok",
              "badge": "theek"
            }
          },
          "vars": {
            "store": "100 rows",
            "likes": "99,990",
            "feed": "0"
          },
          "flows": [
            {
              "from": "app",
              "to": "row",
              "label": "100 jagah",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "4. Memory counter + batch",
          "clock": "coalesce",
          "say": "Redis jaisa counter (INCR, microseconds) aur har 5 s mein ek <code>UPDATE … + delta</code>: is photo ke DB writes 10,000/s → 0.2/s (write coalescing). Keemat: Redis bina persistence gire toh aakhri 5 s ke likes (~50,000) ja sakte.",
          "nodes": {
            "fans": {
              "tone": "busy",
              "badge": ""
            },
            "app": {
              "tone": "ok",
              "badge": ""
            },
            "row": {
              "tone": "ok",
              "badge": "0.2/s"
            },
            "redis": {
              "tone": "ok",
              "badge": "INCR"
            },
            "feed": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "store": "memory + batch",
            "likes": "sab",
            "feed": "0"
          },
          "flows": [
            {
              "from": "app",
              "to": "redis",
              "label": "INCR",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "5. Tunnel aur retry",
          "clock": "retry",
          "say": "Reply kho gaya (2%), phone ne same like dobara bheja. Counter +1: 10,19,823 (2.0% zyada). Set mein user id: 10,00,000 — bilkul sahi.",
          "nodes": {
            "fans": {
              "tone": "busy",
              "badge": "dobara"
            },
            "app": {
              "tone": "ok",
              "badge": ""
            },
            "row": {
              "tone": "idle",
              "badge": ""
            },
            "redis": {
              "tone": "ok",
              "badge": "SADD"
            },
            "feed": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "store": "set",
            "likes": "10,00,000 sahi",
            "feed": "—"
          },
          "ask": {
            "q": "Like ko retry-safe kaise banayein, bina har request ki idempotency key ke?",
            "choices": [
              "Like ko haalat maano: set mein user id, ginti = set ka size",
              "Retry band kar do — reply kho jaaye toh like hi chhod do",
              "Counter ko har 5 s mein dobara gino taaki dohraav mit jaaye"
            ],
            "answer": 0,
            "hint": "\"User ne like kiya\" ek event hai ya ek haalat (haan/nahi)?",
            "explain": "Like ek haalat hai: user ne kiya ya nahi. Set mein same user id dobara daalne se kuch nahi badalta — retry apne aap safe. Lab: 2% retries par counter 2% zyada, set bilkul sahi. Data structure aisa chuno jisme dohraav ka asar hi na ho.",
            "choiceExplanations": [
              "Like ek haalat hai: user ne kiya ya nahi. Set mein same user id dobara daalne se kuch nahi badalta — retry apne aap safe. Lab: 2% retries par counter 2% zyada, set bilkul sahi. Data structure aisa chuno jisme dohraav ka asar hi na ho.",
              "Retry band karne se asli likes khoyenge.",
              "Counter mein dohraav dikhta hi nahi — kaun sa +1 dobara tha, pata nahi."
            ]
          }
        }
      ],
      "lesson": "Garam row ek lock ki line hai, aur line app ke workers kha jaati hai. Lock baanto (counter rows), DB se pehle memory mein jodo (coalescing), aur like ko set ki tarah rakho taaki retry safe ho."
    },
    {
      "type": "cards",
      "title": "📰 Feed: padhte waqt jodo, likhte waqt baanto, ya dono?",
      "goal": "Lab 65 ex3 (model: 100 crore users, followers ~ r^−α; α aise chuna ki sabse bade account ke 60 crore aur average 300 followers hon; posts barabar baante — maana).",
      "lesson": "Pull har read par bahut shards chhoota hai. Push har post par bahut inbox likhta hai. Hybrid peak load ko kshamata ke neeche laata hai (lab: 104% → 93%) aur sabse bura ek post 600 s → 100 ms — keemat: har read par VIP lists jodna.",
      "steps": [
        {
          "title": "1. Pull (fan-out on read)",
          "say": "Feed kholte hi har followed user ka shard poochho. Har shard 1% chance se dheema (aazaad): 300 follow → 95.1% feed loads dheeme, 500 → 99.3% (video sahi). Har read par sau-sau shards — dheema aur mehnga."
        },
        {
          "title": "2. Push (fan-out on write)",
          "say": "Post hote hi har follower ke inbox (Redis list) mein id daalo. Ausat 300 followers × 3,472 posts/s ≈ 10.4 lakh writes/s (video: ~10 lakh, sahi). Inbox: 50 crore × 500 ids × 8 byte = 2 TB sirf ids (Redis overhead aur copies alag). Video ki hi kshamata 10 lakh writes/s maano toh pure push 104% busy — line bina kisi celebrity ke bhi badhti hai. Aur 60 crore followers wala ek post akela 600 s ka kaam.",
          "ask": {
            "q": "Pure push mein sabse badi dikkat kya hai?",
            "choices": [
              "Peak par kshamata se upar, aur ek celebrity post 10 minute ka kaam",
              "Inbox ki RAM — 50 crore users ke feed rakhna bahut mehnga hai",
              "Har feed read par 500 shards poochhne padte hain, isliye dheema"
            ],
            "answer": 0,
            "hint": "Ausat post 300 writes. Sabse bada post kitne?",
            "explain": "Do dikkatein: (1) peak par 3,472 posts/s × ausat 300 followers = 10.4 lakh writes/s, video ki 10 lakh/s kshamata se upar (104%) — line badhti hai. (2) Power law: ek 60 crore followers wala post akela 600 s ka kaam; sab posts ek hi FIFO line mein hon toh us beech baaki peeche, aur aadhe followers ko post dikhta hai aadhon ko nahi. RAM (~2 TB sirf ids) sambhalne layak.",
            "choiceExplanations": [
              "Do dikkatein: (1) peak par 3,472 posts/s × ausat 300 followers = 10.4 lakh writes/s, video ki 10 lakh/s kshamata se upar (104%) — line badhti hai. (2) Power law: ek 60 crore followers wala post akela 600 s ka kaam; sab posts ek hi FIFO line mein hon toh us beech baaki peeche, aur aadhe followers ko post dikhta hai aadhon ko nahi. RAM (~2 TB sirf ids) sambhalne layak.",
              "2 TB ids ke liye — overhead ke saath bhi sambhalne layak (video ka mudda).",
              "500 shards pull ki dikkat hai; push mein read ek inbox se."
            ]
          }
        },
        {
          "title": "3. Hybrid",
          "say": "1 lakh se zyada followers wale (79,672 VIP) push nahi karte; VIP posts padhte waqt jodo. Ausat writes ~11% ghate (10.4 → 9.3 lakh/s): 104% → 93% busy — itne bhare system mein line khaali hone lagti hai. Sabse bura ek post: 600 s → 100 ms. Keemat: har feed read ~32 VIP lists jodta hai (video: \"kuch darjan\" — model se mel). Seema 10,000 karo: writes 8.1 lakh/s, VIP lists 67.",
          "ask": {
            "q": "VIP seema 1 lakh se 10,000 kar di. Kya badla?",
            "choices": [
              "Writes ghate, par har feed read ko zyada VIP lists jodni padin",
              "Sab sasta hua — writes aur reads dono kam ho gaye",
              "Kuch nahi badla — seema sirf celebrities ko chhooti hai"
            ],
            "answer": 0,
            "hint": "Jitne zyada VIP, utne kam push — aur padhte waqt?",
            "explain": "Lab: seema 10,000 par push writes 9.3 → 8.1 lakh/s, par har read 32 → 67 VIP lists jodta hai. Hybrid ek tarazu hai: likhne ka kaam padhne par khiskaao. Seema apne cluster ki naap se rakho (video: jitna push 2 s mein ho jaaye).",
            "choiceExplanations": [
              "Lab: seema 10,000 par push writes 9.3 → 8.1 lakh/s, par har read 32 → 67 VIP lists jodta hai. Hybrid ek tarazu hai: likhne ka kaam padhne par khiskaao. Seema apne cluster ki naap se rakho (video: jitna push 2 s mein ho jaaye).",
              "Kaam ghaayab nahi hota — write se read par khisakta hai.",
              "10,000 par 15.8 lakh VIP — seema bahut logon ko chhooti hai."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Like ka toofan aur feed ka tarazu",
      "project": "65-instagram",
      "exercise": "ex2-likes",
      "goal": "Viral photo ka model, retries, regions ke counters; phir pull/push/hybrid ka model.",
      "why": "Node 24+ chahiye. Dono model aur seeded — har baar same output. Regions ka merge code asli hai.",
      "steps": [
        {
          "text": "Like ka toofan.",
          "cmd": "cd docker-labs/65-instagram && npm start -- ex2-likes",
          "expect": "ex2 — like button (1 ms ka time-step model; maana: ek viral photo par 10,000 likes/s, saath mein 20,000 feed requests/s,\n      app ke paas ek saanjha worker pool, timeout 5 s; har like ek worker pakadta hai jab tak store jawab na de)\n\n1) 10 second, ek viral photo — 1,00,000 likes. Har like ek hi bucket mein: hua / worker na mila / timeout / abhi line mein:\n   store, workers, kaun pehle worker le          hua      na mila   timeout   line mein   feed fail    pehla feed fail\n   1 row, 2,000, likes pehle                    9,999    88,001         0       2,000    1,96,188    177 ms\n   1 row, 2,000, baari-baari                    9,999    88,041         0       1,960    1,76,186    177 ms\n   1 row, 2,000, feed pehle                     9,999    88,401         0       1,600           0    —\n   1 row, 60,000, likes pehle                   9,999         0    40,002      49,999           0    —\n   100 counter rows, 2,000, likes pehle        99,990         0         0          10           0    —\n   → Garam row har haal mein ~1,000 likes/s (row ka lock ~1 ms). Baaki asar pool ke niyam par: likes ko pehle worker mile\n     toh 177 ms mein pool bhara aur feed gira; feed ko pehle mile toh feed bacha, likes turant mana; 60,000 workers par\n     feed bacha par 40,002 likes 5 s baad timeout. Ek saanjha pool ek photo ki dikkat ko poori app mein faila sakta hai —\n     likes ko alag pool (bulkhead, lab 39) do. Asli ilaaj store ki raftaar: 100 counter rows par sab theek.\n\n2) Redis jaisa memory counter + har 5 s ek batch write (write coalescing):\n   DB par is photo ke writes: 10,000/s → 0.2/s (har 5 s mein ek UPDATE … + delta).\n   Keemat: Redis bina persistence ke gire toh aakhri 5 s ke likes ja sakte (is photo ke ~50,000; poore platform par peak par ~8,68,055).\n\n3) Tunnel: reply kho gaya (2%), phone ne same like dobara bheja (seeded, 10 lakh likes):\n   asli likes 10,00,000 · counter +1 10,19,823 (2.0% zyada) · set mein user id 10,00,000\n   → like ek haalat hai (user ne like kiya ya nahi), event nahi. Set mein dobara daalna kuch nahi badalta — idempotent.\n\n4) Teen regions, ek photo: Tokyo 5,000, Frankfurt 3,000, Virginia 1,000 likes (har like sirf ek region mein gina).\n   Regions apni state ki copy bhejte hain; copy der se, ulte kram mein, kabhi do baar pahunchti hai; ant mein sab pahunchti hain (seeded):\n   last write wins (poora number)               tokyo 7,012 · frankfurt 7,012 · virginia 7,012\n   aaye hue naye likes jodte jao                tokyo 14,336 · frankfurt 14,488 · virginia 11,070\n   G-Counter (har region ka slot, merge = max)  tokyo 9,000 · frankfurt 9,000 · virginia 9,000\n   → sahi jawab 9,000. G-Counter purani copy, ulte kram aur dohraav ke baad bhi har region par sahi jawab tak pahunchta hai.\n   Shart: har like ek hi region mein gina jaaye. Ek user ka like Tokyo mein, retry Frankfurt mein → G-Counter 2,\n   user id ka set (union se merge) 1. Unlike ke liye sirf badhne wala counter/set kaafi nahi — OR-Set jaisa CRDT (lab 58)."
        },
        {
          "text": "Feed: pull, push, hybrid.",
          "cmd": "npm start -- ex3-feed",
          "expect": "ex3 — feed: pull, push ya dono (model: 100 crore users, followers ~ r^−α; α ko aise chuna ki sabse bade account ke\n      60 crore aur average user ke 300 followers hon → α = 0.771. Posts sab users mein barabar baante — maana)\n\n1) Pull (padhte waqt jodo): har followed user ka shard poochho, har shard 1% chance se dheema (aazaad):\n   300 follow → 95.1% feed loads dheeme · 500 follow → 99.3% (video: 99.3% — sahi)\n\n2) Push (likhte waqt baanto) aur hybrid — VIP seema T se upar wale push nahi karte; VIP posts padhte waqt jodo.\n   Push cluster ki kshamata 10 lakh writes/s (video ka number). Busy = maangi gayi writes ÷ kshamata:\n   seema T          VIP accounts   push writes/s (peak)   busy      sabse bada ek post (akela)   VIP lists har feed read\n   koi nahi (push)            0              10,41,600   104.2%        60,00,00,000 (600 s)            0\n   10,00,000              4,018               9,88,642    98.9%         9,99,845 (1,000 ms)         15.3\n   1,00,000              79,672               9,28,809    92.9%             99,999 (100 ms)         32.5\n   10,000             15,79,733               8,10,173    81.0%              10,000 (10 ms)         66.7\n\n   → Video ke apne numbers par pure push 104.2% busy: kshamata se zyada kaam, toh push ki line bina kisi\n     celebrity ke bhi badhti rehti hai. Hybrid (T = 1 lakh) writes 11% ghataata hai → 92.9% busy: line khaali ho sakti hai.\n     Itne bhare system mein 11% bahut bada farq hai (FP14 ka queue ganit).\n   → Sabse bada ek post: 60 crore writes = 10 minute ka kaam akela; hybrid mein ~100 ms. Agar sab posts ek hi\n     FIFO line mein hon (maana), toh us beech baaki sabke posts peeche. Keemat: har feed read ~32 VIP lists jodta hai\n     (video: \"kuch darjan\" — model se mel). T chhota karo toh writes ghatein, reads badhein.\n\n3) Inbox ki memory (video ka hisaab): 50 crore users × 500 ids × 8 byte = 2 TB sirf ids.\n   Asli Redis mein har key aur list ka apna overhead, aur har shard ki 1–2 copies — kai guna, phir bhi sambhalne layak.\n   Sirf active users (pichhle 14 din) ko push karo; lautne wale ka feed padhte waqt bana do (video)."
        }
      ],
      "observe": {
        "q": "ex2 regions: LWW har region par 7,012, naye likes jodna 11–14 hazaar, G-Counter 9,000. G-Counter kyun bachta hai?",
        "choices": [
          "Har region ka apna slot, merge = max; dohraav aur kram se farq nahi",
          "G-Counter har message ek hi baar bhejta hai, dohraav hota hi nahi",
          "G-Counter sabse naye timestamp wala number rakhta hai"
        ],
        "answer": 0,
        "hint": "Same message do baar aaye — max par kya asar, jod par kya?",
        "explain": "G-Counter mein Tokyo sirf apna slot badhata hai. Merge har slot ka max leta hai: purani copy der se aaye, kram badle ya same copy dobara aaye — max same rehta hai. Total = slots ka jod = 9,000. Jodne wala tareeka har dohraav par phir jodta hai; LWW ek region ka number baaki par likh deta hai. Shart: har like ek hi region mein gina jaaye — ek user ka like do regions mein gina toh G-Counter bhi 2 ginega (tab user ids ka set).",
        "choiceExplanations": [
          "G-Counter mein Tokyo sirf apna slot badhata hai. Merge har slot ka max leta hai: purani copy der se aaye, kram badle ya same copy dobara aaye — max same rehta hai. Total = slots ka jod = 9,000. Jodne wala tareeka har dohraav par phir jodta hai; LWW ek region ka number baaki par likh deta hai. Shart: har like ek hi region mein gina jaaye — ek user ka like do regions mein gina toh G-Counter bhi 2 ginega (tab user ids ka set).",
          "Lab mein copies dobara aur der se pahunchin — G-Counter phir bhi sahi.",
          "Timestamp se chunna LWW hai — usne 7,012 diya."
        ]
      },
      "lesson": "Garam row, retry aur regions — teeno mein jawab data structure ka hai: baanto, memory mein jodo, aur aisa merge chuno jo dohraav se na bigde."
    }
  ],
  "interview": {
    "title": "Interview Round — likes aur feed",
    "instructions": "Pehle socho: kahan line lag rahi hai, aur kaam write par hai ya read par? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Cricket final ke baad ek post par 1 lakh likes/minute. DB CPU theek, par API p99 30 s aur doosre endpoints bhi timeout. Pehla sudhaar?",
        "choices": [
          "Like count counter rows mein baanto, ya memory mein jodo",
          "DB ka CPU badhao — bade server se lock jaldi chhoot jaayega",
          "Like API ka timeout 5 s se 60 s karo taaki fail kam ho jaayein",
          "Feed API ko alag DB par le jao, likes ka asar khatam ho jaayega"
        ],
        "answer": 0,
        "explain": "CPU theek hai par line lambi: ek row ka lock ek waqt mein ek update. Workers line mein baithe, doosre endpoints ko worker nahi mila (lab: 177 ms mein 2,000 workers bhare). Lock baanto (counter rows) ya Redis mein jodo aur har kuch second batch likho. Lambi line ke saath lamba timeout workers aur der tak rokta hai.",
        "choiceExplanations": [
          "CPU theek hai par line lambi: ek row ka lock ek waqt mein ek update. Workers line mein baithe, doosre endpoints ko worker nahi mila (lab: 177 ms mein 2,000 workers bhare). Lock baanto (counter rows) ya Redis mein jodo aur har kuch second batch likho. Lambi line ke saath lamba timeout workers aur der tak rokta hai.",
          "CPU khaali hai — rukawat lock ki line hai.",
          "Lamba timeout workers ko aur der tak pakadta hai.",
          "Doosre endpoints app ke workers ki wajah se gire; alag DB se worker nahi milte."
        ]
      },
      {
        "q": "Feed push model par hai. Ek naye creator ke 5 crore followers ho gaye; creator ke har post ke baad baaki sabke posts 2–3 minute late dikhte hain. Kya badloge?",
        "choices": [
          "Bade accounts push se hatao; VIP posts padhte waqt jodo (hybrid)",
          "Push workers dugne karo, taaki 5 crore writes jaldi ho jaayein",
          "Sabke liye pull model par wapas jao, push band karo",
          "Creator ke posts ko din mein ek baar batch mein push karo"
        ],
        "answer": 0,
        "explain": "Ek bada post saari push queue rok deta hai (lab: 60 crore = 10 min). Hybrid: seema se upar wale push nahi karte, VIP ke recent posts ek chhote, replicated VIP cache se padhte waqt jode jaate hain. Workers dugne karna problem ko aadha karta hai, khatam nahi. Pure pull har read par sau shards chhoota hai (95% dheeme).",
        "choiceExplanations": [
          "Ek bada post saari push queue rok deta hai (lab: 60 crore = 10 min). Hybrid: seema se upar wale push nahi karte, VIP ke recent posts ek chhote, replicated VIP cache se padhte waqt jode jaate hain. Workers dugne karna problem ko aadha karta hai, khatam nahi. Pure pull har read par sau shards chhoota hai (95% dheeme).",
          "Agla creator aur bada hoga — workers ki daud khatam nahi hoti.",
          "Pull har read ko dheema karta hai (lab: 300 follow par 95.1%).",
          "Din mein ek baar = followers ko post der se dikhe."
        ]
      }
    ]
  },
  "success": [
    "Garam row ki line aur workers ka rishta bata sakte ho",
    "Sharded counter, coalescing aur set-like samjha sakte ho",
    "Hybrid feed ka asli faayda aur keemat bata sakte ho"
  ],
  "cards": [
    {
      "front": "Ek viral photo, ek like row (lab 65 ex2 model)?",
      "back": "~1,000 likes/s. Likes ko pehle worker mile toh 177 ms mein 2,000 workers bhare, feed 98% fail; feed ko pehle mile toh feed fail 0. 100 counter rows par sab theek."
    },
    {
      "front": "Retry par counter vs set?",
      "back": "2% replies kho gaye → counter 2.0% zyada; set (photo → user ids) bilkul sahi. Like ek haalat hai."
    },
    {
      "front": "Hybrid feed (VIP seema 1 lakh, model)?",
      "back": "Writes ~11% kam (10.4 → 9.3 lakh/s = 104% → 93% busy at 10 lakh/s); sabse bura post 600 s → 100 ms; har read ~32 VIP lists jodta."
    }
  ]
}
]);
})();
