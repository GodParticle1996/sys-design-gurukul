/* First Principles — FAANG Senior Engineer.
   Source credit: Caching (t9jtxlu7k4k), numbered video 10/15.
   Evidence: docker-labs/60-caching/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "cpu", "icon": "🧠", "label": "CPU (L1–L3)", "x": 115, "y": 200}, {"id": "ram", "icon": "🧮", "label": "RAM", "x": 345, "y": 200}, {"id": "ssd", "icon": "💾", "label": "SSD", "x": 560, "y": 200}, {"id": "net", "icon": "🌏", "label": "Doosra region", "x": 780, "y": 200}, {"id": "cache", "icon": "⚡", "label": "Cache (RAM mein)", "x": 560, "y": 60}];
const EDGES = [{"from": "cpu", "to": "ram"}, {"from": "ram", "to": "ssd"}, {"from": "ssd", "to": "net"}, {"from": "ram", "to": "cache"}];
VISUALS["fp-cache-kyun"] = { t: "Data jitna neeche, read utna lamba. Cache request ko upar wale paaydaan par rokta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { cpu: {tone:'ok',badge:'1.3 ns'}, ram: {tone:'ok',badge:'160 ns'}, ssd: {tone:'busy',badge:'110 µs'}, net: {tone:'bad',badge:'150 ms'}, cache: {tone:'acc',badge:'hit'} } }, {w:900,h:320}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cache-kyun",
  "icon": "🪜",
  "group": "⚡ Caching",
  "title": "Caching 1 · Kyun — latency ki seedhi aur popular data",
  "badge": "Seedhi Ka Naapne Wala",
  "objectives": [
    "Latency ki seedhi: L1, RAM, SSD, network — asli numbers",
    "Video ke scale ki galti pakadna",
    "Skew (Zipf) aur hit rate se DB ka bojh"
  ],
  "lesson": [
    "<h3>📚 Mez, almaari aur library</h3><p>Tum hisaab laga rahe ho. Pen haath mein hai (L1). Kitaab mez par (L2/L3). Almaari kamre ke bahar (RAM). Library doosre shehar mein (disk). Aur ek kitaab doosre desh mein (doosra region).</p><p>Har number ke liye doosre shehar jaana pade toh hisaab kabhi khatam nahi hoga. Toh jo kitaabein baar-baar chahiye, un kitaabon ko mez par rakho. Mez par rakhi kitaabein = cache.</p><p>Aaj do sawaal: har jagah sach mein kitni door hai (is laptop par naapa), aur kaunsi kitaabein mez par rakhein?</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🪜 Ek number ka safar — CPU se doosre region tak",
      "goal": "Lab 60 ex0 is laptop par naapta hai: data kahan rakha hai, us hisaab se ek read kitna lamba. Scale: 1 CPU cycle (0.31 ns, 3.26 GHz) = 1 second ki zindagi. Teen runs ki range.",
      "nodes": [
        {
          "id": "cpu",
          "icon": "🧠",
          "label": "CPU (L1–L3)",
          "x": 115,
          "y": 200
        },
        {
          "id": "ram",
          "icon": "🧮",
          "label": "RAM",
          "x": 345,
          "y": 200
        },
        {
          "id": "ssd",
          "icon": "💾",
          "label": "SSD",
          "x": 560,
          "y": 200
        },
        {
          "id": "net",
          "icon": "🌏",
          "label": "Doosra region",
          "x": 780,
          "y": 200
        },
        {
          "id": "cache",
          "icon": "⚡",
          "label": "Cache (RAM mein)",
          "x": 560,
          "y": 60
        }
      ],
      "edges": [
        {
          "from": "cpu",
          "to": "ram"
        },
        {
          "from": "ram",
          "to": "ssd"
        },
        {
          "from": "ssd",
          "to": "net"
        },
        {
          "from": "ram",
          "to": "cache"
        }
      ],
      "viz": {
        "w": 900,
        "h": 320
      },
      "vars": [
        {
          "id": "where",
          "label": "Data kahan"
        },
        {
          "id": "real",
          "label": "Asli samay"
        },
        {
          "id": "human",
          "label": "1 cycle = 1 s par"
        }
      ],
      "steps": [
        {
          "title": "L1 cache",
          "clock": "L1",
          "say": "Number CPU ke apne L1 cache mein hai (32 KB tak ka data). Lab: 1.2–1.4 ns.",
          "nodes": {
            "cpu": {
              "tone": "ok",
              "badge": "1.3 ns"
            },
            "ram": {
              "tone": "idle",
              "badge": ""
            },
            "ssd": {
              "tone": "idle",
              "badge": ""
            },
            "net": {
              "tone": "idle",
              "badge": ""
            },
            "cache": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "where": "L1",
            "real": "1.2–1.4 ns",
            "human": "~4–5 second"
          }
        },
        {
          "title": "RAM",
          "clock": "RAM",
          "say": "Data 256 MB ka hai, CPU ke caches mein nahi samaata. Har read RAM tak: 157–162 ns. L1 se ~120 guna.",
          "nodes": {
            "cpu": {
              "tone": "busy",
              "badge": "miss"
            },
            "ram": {
              "tone": "ok",
              "badge": "~160 ns"
            },
            "ssd": {
              "tone": "idle",
              "badge": ""
            },
            "net": {
              "tone": "idle",
              "badge": ""
            },
            "cache": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "where": "RAM",
            "real": "157–162 ns",
            "human": "~9 minute"
          },
          "ask": {
            "q": "Video kehta hai \"1 cycle = 1 s par L1 0.5 s, RAM 2 minute\". Lab ke hisaab se kya galat hai?",
            "choices": [
              "Scale mel nahi khaata: 1 cycle par L1 0.5 s = aadha cycle",
              "Video sahi hai; bas is laptop ka RAM aur L1 bahut dheeme nikle",
              "Video ne L1 aur RAM ke naam aapas mein galti se badal diye"
            ],
            "answer": 0,
            "hint": "1 cycle kitne nanosecond ka hai, 3.26 GHz par?",
            "explain": "1 cycle = 0.31 ns (3.26 GHz). \"1 cycle = 1 s\" par L1 0.5 s ka matlab aadha cycle — par L1 hit ko kai cycles lagte hain (is laptop par ~4–5). Video ke kai numbers \"1 ns = 1 s\" analogy jaise lagte hain, par video apne asli ns numbers nahi batata — andaza hi hai. Is laptop par naapa: L1 ~4 s, RAM ~9 min. Seedhi ka aakaar (L1 se disk tak hazaaron-laakhon guna) sahi hai.",
            "choiceExplanations": [
              "1 cycle = 0.31 ns (3.26 GHz). \"1 cycle = 1 s\" par L1 0.5 s ka matlab aadha cycle — par L1 hit ko kai cycles lagte hain (is laptop par ~4–5). Video ke kai numbers \"1 ns = 1 s\" analogy jaise lagte hain, par video apne asli ns numbers nahi batata — andaza hi hai. Is laptop par naapa: L1 ~4 s, RAM ~9 min. Seedhi ka aakaar (L1 se disk tak hazaaron-laakhon guna) sahi hai.",
              "Lab ka L1 (~1.3 ns) bhi ~4 cycles; aadha cycle kisi CPU ka L1 nahi.",
              "L1 sabse tez aur RAM dheemi — kram video mein sahi hai."
            ]
          }
        },
        {
          "title": "SSD",
          "clock": "disk",
          "say": "Data RAM mein nahi, disk par. Lab: O_DIRECT se 4 KB random read 102–115 µs (WSL ka direct-I/O raasta; host ki caching jaanchi nahi). L1 se ~80 hazaar guna.",
          "nodes": {
            "cpu": {
              "tone": "busy",
              "badge": "miss"
            },
            "ram": {
              "tone": "busy",
              "badge": "miss"
            },
            "ssd": {
              "tone": "ok",
              "badge": "~110 µs"
            },
            "net": {
              "tone": "idle",
              "badge": ""
            },
            "cache": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "where": "SSD",
            "real": "102–115 µs",
            "human": "~4 din"
          }
        },
        {
          "title": "Doosra region",
          "clock": "network",
          "say": "Data doosre region ke server par. Round trip 150 ms (model, video ka number). 1 cycle = 1 s par ~15.5 saal.",
          "nodes": {
            "cpu": {
              "tone": "busy",
              "badge": "wait"
            },
            "ram": {
              "tone": "idle",
              "badge": ""
            },
            "ssd": {
              "tone": "idle",
              "badge": ""
            },
            "net": {
              "tone": "bad",
              "badge": "150 ms"
            },
            "cache": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "where": "doosra region",
            "real": "150 ms",
            "human": "~15.5 saal"
          },
          "ask": {
            "q": "Video kehta hai 150 ms \"2.5 saal\". Sahi number kya hai?",
            "choices": [
              "~15.5 saal (1 cycle = 1 s); \"1 ns = 1 s\" par bhi ~4.8 saal",
              "2.5 saal sahi hai, kyunki network CPU se alag ghadi chalata hai",
              "~16 minute, kyunki network RAM jitna hi tez hota hai"
            ],
            "answer": 0,
            "hint": "150 ms = 15 crore ns. Ek saal mein lagbhag 3.15 crore second.",
            "explain": "150 ms × 3.26 GHz ≈ 49 crore cycles = 49 crore second ≈ 15.5 saal. \"1 ns = 1 s\" par 15 crore second ≈ 4.8 saal. 2.5 saal kisi bhi scale par nahi banta.",
            "choiceExplanations": [
              "150 ms × 3.26 GHz ≈ 49 crore cycles = 49 crore second ≈ 15.5 saal. \"1 ns = 1 s\" par 15 crore second ≈ 4.8 saal. 2.5 saal kisi bhi scale par nahi banta.",
              "Scale ek hi hai; har cheez CPU cycle mein naapi gayi.",
              "Doosre region ka round trip roshni ki raftaar aur routers se bandha hai; RAM se laakhon guna dheema."
            ]
          }
        },
        {
          "title": "Cache ka khel",
          "clock": "cache",
          "say": "Cache = dheemi jagah ka zaroori data tez jagah par rakhna. Redis RAM mein rakhta hai; CDN user ke paas wale shehar mein. Har level ka cache neeche wale level ka intezaar bachata hai.",
          "nodes": {
            "cpu": {
              "tone": "ok",
              "badge": ""
            },
            "ram": {
              "tone": "ok",
              "badge": ""
            },
            "ssd": {
              "tone": "idle",
              "badge": "kam reads"
            },
            "net": {
              "tone": "idle",
              "badge": "kam trips"
            },
            "cache": {
              "tone": "acc",
              "badge": "hit"
            }
          },
          "vars": {
            "where": "cache",
            "real": "RAM jitna",
            "human": "minute, din nahi"
          },
          "flows": [
            {
              "from": "ram",
              "to": "cache",
              "label": "hit",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "Seedhi asli hai: L1 ~1.3 ns, RAM ~160 ns, disk read ~110 µs, doosra region 150 ms. Cache ka kaam = request ko seedhi ke upar wale paaydaan par rokna."
    },
    {
      "type": "cards",
      "title": "🎯 \"90% requests 10% data par\" — kitna sach?",
      "goal": "Lab 60 ex1 (model, seeded): 1 lakh keys, popularity Zipf (key k ka weight 1/k^s), asli LRU code. Phir hit rate ka DB par asar (seedha hisaab).",
      "lesson": "Skew data par tika hai, kanoon nahi. Apne logs se naapo. Hit rate ka har aakhri point DB ka bojh bahut ghatata hai.",
      "steps": [
        {
          "title": "1. Skew naapo",
          "say": "Top 10% keys ko kitni requests: s = 0.6 par 39%, s = 0.8 par 60%, s = 0.99 par 80%, s = 1.2 par 94%. Sab keys barabar popular hon toh 10% hi. Web caches par naapa gaya s ~0.64–0.83 tha (Breslau 1999).",
          "ask": {
            "q": "Video kehta hai \"lagbhag har system mein 90% requests 10% data par\". Lab ke hisaab se?",
            "choices": [
              "Skew par tika: s = 0.99 par bhi top 10% ko 80%, s = 0.6 par 39%",
              "Sahi: Zipf distribution mein top 10% ko hamesha 90% milta hai",
              "Ulta: zyada skew par top 10% ko kam requests milti hain"
            ],
            "answer": 0,
            "hint": "ex1 ka table: s badalne par top 10% ka hissa kitna badla?",
            "explain": "\"90/10\" ek aam anubhav hai, niyam nahi. Lab mein s = 0.99 par top 10% ko 80%, aur 90% ke liye s ~1.1 chahiye. Breslau 1999 ke chhe web proxy traces mein s 0.64–0.83 tha — us range par top 10% ko 90% se kaafi kam. Cache ka size apne logs ka skew dekh kar chuno.",
            "choiceExplanations": [
              "\"90/10\" ek aam anubhav hai, niyam nahi. Lab mein s = 0.99 par top 10% ko 80%, aur 90% ke liye s ~1.1 chahiye. Breslau 1999 ke chhe web proxy traces mein s 0.64–0.83 tha — us range par top 10% ko 90% se kaafi kam. Cache ka size apne logs ka skew dekh kar chuno.",
              "Zipf mein hissa s par tika hai; s = 0.6 par sirf 39%.",
              "Zyada skew = popular keys aur popular; top 10% ka hissa badhta hai (94% s = 1.2 par)."
            ]
          }
        },
        {
          "title": "2. Chhota cache, bada asar",
          "say": "s = 1.2 par sirf 0.1% keys ka LRU cache 60.6% hits pakadta hai; 10% ka cache 91.7%. s = 0.6 par 10% ka cache bhi sirf 25%. Skew kam ho toh cache kam kaam ka."
        },
        {
          "title": "3. Miss hi bojh hai",
          "say": "10,000 reads/sec. Hit rate 90% → DB par 1,000/sec. 95% → 500. 99% → 100. 95 se 99: sirf 4 point, par DB ka bojh 5 guna kam. Ausat read 1.00 ms se 0.60 ms.",
          "ask": {
            "q": "Hit rate 99% se 99.9% hua. DB ka bojh?",
            "choices": [
              "100 se 10 reads/sec — 10 guna kam",
              "Lagbhag utna hi — sirf 0.9 point ka farq hai",
              "100 se 90 reads/sec — 10% kam"
            ],
            "answer": 0,
            "hint": "Miss rate 1% se kitna hua?",
            "explain": "Miss rate 1% → 0.1%, yaani 10 guna kam. DB ko sirf misses milte hain: 10,000 × 0.001 = 10 reads/sec. Isliye hit rate ko \"misses\" mein socho.",
            "choiceExplanations": [
              "Miss rate 1% → 0.1%, yaani 10 guna kam. DB ko sirf misses milte hain: 10,000 × 0.001 = 10 reads/sec. Isliye hit rate ko \"misses\" mein socho.",
              "Point chhota dikhta hai, par miss rate 10 guna gira.",
              "Bojh miss rate ke saath chalta hai: 1% se 0.1% = 10 guna kam."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Seedhi naapo, skew naapo",
      "project": "60-caching",
      "exercise": "ex0-ladder",
      "goal": "Is machine par L1 se disk aur loopback tak asli naap; phir Zipf skew × LRU cache ka model.",
      "why": "Node 24+ chahiye. ex0 asli hai: numbers machine aur run ke saath badlenge (WSL ki disk sabse zyada); pattern same rahega. ex0 temp folder mein 256 MB file banata aur aakhir mein mitata hai. ex1 seeded model: har run same.",
      "steps": [
        {
          "text": "Seedhi (lagbhag 1 minute).",
          "cmd": "cd docker-labs/60-caching && npm start -- ex0-ladder",
          "expect": "CPU: Intel(R) Core(TM) Ultra 7 255U — 3.26 GHz (/proc/cpuinfo), 1 cycle = 0.31 ns\n\nA. Pointer chasing: har hop ek random 64-byte line se agla pata padhta hai (CPU andaza nahi laga sakta).\n\ndata ka size     ns / hop\n16 KB               1.5\n32 KB               1.4\n256 KB              4.0\n1 MB                5.2\n4 MB               21.4\n8 MB               94.3\n64 MB             143.3\n256 MB            161.6\n\nB. Spatial locality: same 3.2 crore ints (128 MB), ek baar seedhe kram mein, ek baar random kram mein.\nseedha kram: 0.95 ns / int     random kram: 10.89 ns / int     → 11× farq\nSeedhe kram mein ek 64-byte line 16 ints laati hai aur CPU agli lines pehle se mangwa leta hai (prefetch).\n\nC. Ladder, \"1 cycle = 1 second\" scale par (3.26 GHz). ASLI = is machine par naapa, MODEL = maana hua.\n\n                                                  asli samay     cycles          agar 1 cycle = 1 s\nASLI   L1 (32 KB data)                                1.4 ns              5   4.6 second\nASLI   L2 (1 MB data)                                 5.2 ns             17   17 second\nASLI   L3 (4 MB data)                                21.4 ns             70   1.2 minute\nASLI   RAM (256 MB data, TLB miss samet)            161.6 ns            527   8.8 minute\nASLI   4 KB read, OS page cache se (RAM)            447.0 ns          1,459   24 minute\nASLI   4 KB random read, O_DIRECT (WSL path)        115.3 µs       3,76,257   4.4 din\nASLI   write + fsync (disk tak pakka)                 1.2 ms      39,79,070   1.5 mahine\nASLI   TCP round trip, isi machine par (loopback)     8.0 µs         26,213   7.3 ghante\nMODEL  round trip doosre region tak (video: 150 ms)   150.0 ms   48,95,99,550   16 saal\n\nL1 se disk read tak 81,691×, fsync tak 8,63,918×, doosre region tak 10,62,99,654×.\nNote: L1 ki row mein JS loop ka kaam bhi shaamil hai; RAM ki row mein TLB miss (page table walk) bhi. WSL ki disk ek virtual disk hai.\nO_DIRECT row: 399 alag 4 KB blocks (400 reads, 256 MB file). Buffer ki alignment aur WSL host/disk ki caching jaanchi nahi gayi —\n  isliye row \"is machine ka direct-I/O raasta\" hai, pakka \"physical SSD\" nahi."
        },
        {
          "text": "Skew aur hit rate.",
          "cmd": "npm start -- ex1-zipf",
          "expect": "A. MODEL: 1,00,000 keys, popularity Zipf (key k ka weight 1/k^s). LRU cache, 3 lakh requests warm-up, phir 10 lakh gine.\n\ns             top 10% keys ki       LRU hit rate, cache = keys ka\n              requests              0.1%      1%       10%\n0 (barabar)     10.0%               0.1%     1.0%    10.0%\n0.6             39.3%               0.8%     5.4%    25.3%\n0.8             59.5%               6.8%    20.4%    46.9%\n0.99            80.0%              27.5%    49.0%    72.4%\n1.2             94.3%              60.6%    79.5%    91.7%\n\n→ \"90% requests 10% data par\" ek kanoon nahi: s = 0.99 par bhi top 10% ko 80%, s = 0.6 par 39%. Sab barabar ho toh\n  10% cache = 10% hits. LRU ka 10% cache poore top 10% (jo hamesha rakha jaaye) se thoda kam pakadta hai, kyunki\n  kam-popular keys bhi aakar jagah gherti hain. Apne asli logs se skew naapo, phir cache ka size chuno.\n\nB. Hit rate ka hisaab: 10,000 reads/sec. Hit = 0.5 ms (cache). Miss = 0.5 ms + 10 ms (DB). (arithmetic)\n\nhit rate    DB par reads/sec    ausat read\n  80.0%          2000         2.50 ms\n  90.0%          1000         1.50 ms\n  95.0%           500         1.00 ms\n  99.0%           100         0.60 ms\n  99.9%            10         0.51 ms\n\n→ 95% se 99%: hit rate sirf 4 point badha, par DB ka load 5 guna gira (500 → 100). Miss hi sab kuch tay karta hai."
        }
      ],
      "observe": {
        "q": "Hissa B: same 128 MB data, seedhe kram mein 11–12× tez kyun padha gaya?",
        "choices": [
          "Ek 64-byte line 16 ints laati hai aur CPU agli lines pehle mangwa leta",
          "Seedhe kram mein data compress hota hai, isliye kam bytes padhne padte",
          "Random kram mein JavaScript har read par naya object banata hai"
        ],
        "answer": 0,
        "hint": "RAM se CPU tak data kis tukde mein aata hai?",
        "explain": "RAM se data 64-byte cache line mein aata hai. Seedhe kram mein ek line ke 16 ints kaam aate hain, aur CPU agli lines pehle se mangwa leta hai (prefetch). Random kram mein har int ke liye nayi line. Is asar ka naam spatial locality hai: paas-paas ka data saath padho.",
        "choiceExplanations": [
          "RAM se data 64-byte cache line mein aata hai. Seedhe kram mein ek line ke 16 ints kaam aate hain, aur CPU agli lines pehle se mangwa leta hai (prefetch). Random kram mein har int ke liye nayi line. Is asar ka naam spatial locality hai: paas-paas ka data saath padho.",
          "Koi compression nahi; same Int32Array dono baar.",
          "Dono kram ek hi typed array padhte hain; koi naya object nahi banta."
        ]
      },
      "lesson": "Seedhi naapi ja sakti hai, aur pattern har machine par same. Skew bhi naapo: cache ka size skew se tay hota hai, kisi niyam se nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — seedhi aur skew",
    "instructions": "Pehle socho: data kahan hai, aur kitne requests ko cache bacha sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Product page 10,000 reads/sec. Cache hit rate 95%, DB 1,000 reads/sec sambhaal sakta hai. Manager kehta hai \"95% kaafi hai, cache par aur kaam mat karo\". Tumhari baat?",
        "choices": [
          "DB ka bojh misses se: 95% → 500/sec; 99% → 100/sec, 5 guna kam aur zyada surakshit",
          "Theek hai — 95% aur 99% mein sirf 4% ka farq, bojh bhi 4% hi badlega",
          "Hit rate badhane ke liye DB ko bada karo; cache ka hit rate DB par tika hai",
          "95% bahut zyada hai — cache chhota karo taaki RAM bache"
        ],
        "answer": 0,
        "explain": "DB ko sirf misses milte hain. 95% par 500/sec (DB ke 1,000 ka aadha), 99% par 100/sec. Cache gire ya traffic dugna ho toh 95% wala system pehle tootega. Lab 60 ex1 B: 95 se 99 = 5 guna kam bojh.",
        "choiceExplanations": [
          "DB ko sirf misses milte hain. 95% par 500/sec (DB ke 1,000 ka aadha), 99% par 100/sec. Cache gire ya traffic dugna ho toh 95% wala system pehle tootega. Lab 60 ex1 B: 95 se 99 = 5 guna kam bojh.",
          "Bojh miss rate se chalta hai: 5% se 1% = 5 guna kam, 4% nahi.",
          "Hit rate cache ke size aur skew se aata hai; DB bada karne se hit rate nahi badhta.",
          "Cache chhota karne se misses badhenge aur DB par bojh bhi."
        ]
      },
      {
        "q": "Ek team kehti hai \"90/10 rule hai, toh 10% keys ka cache 90% hits dega\". Pehla kadam?",
        "choices": [
          "Logs se skew naapo; hit rate cache size aur skew dono par tika hai",
          "Maan lo — 90/10 lagbhag har system mein ek pakka niyam hai",
          "Saari keys cache karo, taaki skew ka sawaal hi na uthe kabhi",
          "Cache ko LFU par rakho; LFU hamesha 90% hits de deta hai"
        ],
        "answer": 0,
        "explain": "Skew data par tika hai. Lab 60 ex1: s = 0.99 par 10% ka LRU cache 72% hits, s = 0.6 par 25%. Logs se top keys ka hissa nikaalo, phir size chuno. Purane web proxy traces mein s 0.64–0.83 tha (Breslau 1999).",
        "choiceExplanations": [
          "Skew data par tika hai. Lab 60 ex1: s = 0.99 par 10% ka LRU cache 72% hits, s = 0.6 par 25%. Logs se top keys ka hissa nikaalo, phir size chuno. Purane web proxy traces mein s 0.64–0.83 tha (Breslau 1999).",
          "90/10 aam anubhav hai; ex1 mein s = 0.6 par top 10% ko sirf 39%.",
          "Saara data RAM mein rakhna mehnga; skew pata ho toh chhota cache kaafi ho sakta hai.",
          "Eviction policy skew nahi badalti; kam skew par koi policy 90% nahi de sakti."
        ]
      }
    ]
  },
  "success": [
    "Seedhi ke asli numbers bata sakte ho (L1, RAM, SSD, region)",
    "Video ke scale ki galti samjha sakte ho",
    "Skew aur hit rate se DB ka bojh gin sakte ho"
  ],
  "cards": [
    {
      "front": "Latency ki seedhi (lab 60 ex0)?",
      "back": "L1 ~1.3 ns · RAM ~160 ns · 4 KB random read (O_DIRECT) ~110 µs · write + fsync ~1 ms · doosra region 150 ms (model). 1 cycle = 1 s par: ~4 s, ~9 min, ~4 din, ~15.5 saal."
    },
    {
      "front": "90/10 rule?",
      "back": "Kanoon nahi. Zipf s = 0.99 par top 10% = 80%, s = 0.6 par 39% (lab 60 ex1). Breslau 1999 ke proxy traces: s ~0.64–0.83. Logs se naapo."
    },
    {
      "front": "Hit rate aur DB?",
      "back": "DB ko sirf misses: 10,000/sec par 95% → 500, 99% → 100, 99.9% → 10. Miss rate mein socho."
    }
  ]
}
]);
})();
