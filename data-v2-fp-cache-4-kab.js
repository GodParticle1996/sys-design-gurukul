/* First Principles — FAANG Senior Engineer.
   Source credit: Caching (t9jtxlu7k4k), numbered video 10/15.
   Evidence: docker-labs/60-caching/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "users", "icon": "👥", "label": "Users 10k/s", "x": 150, "y": 170}, {"id": "cache", "icon": "⚡", "label": "Cache", "x": 380, "y": 60}, {"id": "lim", "icon": "🚦", "label": "Limiter", "x": 430, "y": 300}, {"id": "db", "icon": "🗄️", "label": "DB 1k/s", "x": 760, "y": 160}];
const EDGES = [{"from": "users", "to": "cache"}, {"from": "users", "to": "lim"}, {"from": "lim", "to": "db"}, {"from": "cache", "to": "db"}];
VISUALS["fp-cache-kab"] = { t: "Cache gira toh DB par 10 guna. Limiter DB ko zinda rakhta hai; cache phir bharta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { users: {tone:'busy',badge:'10k/s'}, cache: {tone:'bad',badge:'khaali'}, lim: {tone:'acc',badge:'load shedding'}, db: {tone:'ok',badge:'zinda'} } }, {w:900,h:410}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cache-kab",
  "icon": "🛡️",
  "group": "⚡ Caching",
  "title": "Caching 4 · Kab — DB ki dhaal, herd aur na-maujood ids",
  "badge": "Dhaal Ka Rakhwala",
  "objectives": [
    "Cache crash → DB crash loop kaise banta hai",
    "Limiter, coalescing, warming: kaunsa kab",
    "Penetration: negative cache vs Bloom; cache kahan lagaana"
  ],
  "lesson": [
    "<h3>🏏 Stadium ka gate</h3><p>Stadium mein 10,000 log, aur ek hi chhota gate jo ek minute mein 1,000 log nikaal sakta hai. Baaki 9 bade gate achanak band ho gaye. Sab chhote gate par toot padte hain, dhakka-mukki mein gate hi toot jaata hai — ab koi nahi nikalta.</p><p>Gate par guard hota jo kehta \"line mein ruko, ek minute mein 1,000\", toh log der se par nikalte. Cache gate hai, DB chhota gate. Aaj dekhte hain DB ko herd se kaise bachaayein.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🐃 Cache gira — DB kyun gira, aur baar-baar kyun?",
      "goal": "Lab 60 ex4 A (model, 10 ms ticks): 10,000 reads/sec, 1 lakh keys (Zipf s = 1.2), cache 10,000 keys (~92% hits). DB 1,000 reads/sec. User 1 s baad haar maanta hai, par DB us request ka kaam karta rehta hai. Queue mein 3 s se zyada kaam → DB crash, 30 s mein wapas.",
      "nodes": [
        {
          "id": "users",
          "icon": "👥",
          "label": "Users 10k/s",
          "x": 150,
          "y": 170
        },
        {
          "id": "cache",
          "icon": "⚡",
          "label": "Cache",
          "x": 380,
          "y": 60
        },
        {
          "id": "lim",
          "icon": "🚦",
          "label": "Limiter",
          "x": 430,
          "y": 300
        },
        {
          "id": "db",
          "icon": "🗄️",
          "label": "DB 1k/s",
          "x": 760,
          "y": 160
        }
      ],
      "edges": [
        {
          "from": "users",
          "to": "cache"
        },
        {
          "from": "users",
          "to": "lim"
        },
        {
          "from": "lim",
          "to": "db"
        },
        {
          "from": "cache",
          "to": "db"
        }
      ],
      "viz": {
        "w": 900,
        "h": 410
      },
      "vars": [
        {
          "id": "hit",
          "label": "Hit rate"
        },
        {
          "id": "dbq",
          "label": "DB par"
        },
        {
          "id": "state",
          "label": "Haalat"
        }
      ],
      "steps": [
        {
          "title": "Sab theek",
          "clock": "t = 0–30 s",
          "say": "92% hits. DB par ~800 reads/sec, kshamata 1,000. Cache DB ki dhaal hai.",
          "nodes": {
            "users": {
              "tone": "ok",
              "badge": "10k/s"
            },
            "cache": {
              "tone": "ok",
              "badge": "92% hit"
            },
            "lim": {
              "tone": "idle",
              "badge": "—"
            },
            "db": {
              "tone": "ok",
              "badge": "~800/s"
            }
          },
          "vars": {
            "hit": "~92%",
            "dbq": "~800/s",
            "state": "theek"
          },
          "flows": [
            {
              "from": "users",
              "to": "cache",
              "label": "hit",
              "tone": "ok"
            },
            {
              "from": "cache",
              "to": "db",
              "label": "miss",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Cache crash",
          "clock": "t = 30 s",
          "say": "t = 30 s: cache server gira, khaali wapas aaya. Misses ~8% se lagbhag 100%: DB par 10 guna bojh.",
          "nodes": {
            "users": {
              "tone": "busy",
              "badge": "10k/s"
            },
            "cache": {
              "tone": "bad",
              "badge": "khaali"
            },
            "lim": {
              "tone": "idle",
              "badge": "—"
            },
            "db": {
              "tone": "busy",
              "badge": "queue badhi"
            }
          },
          "vars": {
            "hit": "~0%",
            "dbq": "~10,000/s",
            "state": "queue"
          },
          "flows": [
            {
              "from": "cache",
              "to": "db",
              "label": "miss ×10",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Bekaar kaam",
          "clock": "t = 33 s",
          "say": "Queue mein 1 s se purana jawab kisi kaam ka nahi — user ja chuka. DB phir bhi purani requests ka kaam karta hai. Queue 3 s se lambi → DB crash.",
          "nodes": {
            "users": {
              "tone": "bad",
              "badge": "timeout"
            },
            "cache": {
              "tone": "busy",
              "badge": "bhar raha"
            },
            "lim": {
              "tone": "idle",
              "badge": "—"
            },
            "db": {
              "tone": "bad",
              "badge": "crash"
            }
          },
          "vars": {
            "hit": "~78%",
            "dbq": "band",
            "state": "DB down"
          },
          "ask": {
            "q": "DB band hai. Cache ka kya hota hai?",
            "choices": [
              "Cache bhar nahi sakta — misses ka jawab DB se aata tha",
              "Cache khud DB ka data bana leta hai aur bharta rehta hai",
              "Cache band ho jaata hai, kyunki DB ke bina cache nahi chal sakta"
            ],
            "answer": 0,
            "hint": "Cache-aside mein cache mein data kaun daalta hai?",
            "explain": "Cache-aside mein app miss par DB padh kar cache bharta hai. DB band = koi naya data nahi = hit rate ~78% par atka. DB 30 s baad laut'ta hai aur same bojh phir. Lab: kuch na karo toh 2 crash, 67 s mein wapas.",
            "choiceExplanations": [
              "Cache-aside mein app miss par DB padh kar cache bharta hai. DB band = koi naya data nahi = hit rate ~78% par atka. DB 30 s baad laut'ta hai aur same bojh phir. Lab: kuch na karo toh 2 crash, 67 s mein wapas.",
              "Cache ke paas data ka koi aur source nahi.",
              "Cache chalta rehta hai aur jo keys hain un par hit deta hai; sirf naya bhar nahi paata."
            ]
          }
        },
        {
          "title": "Loop",
          "clock": "loop",
          "say": "Video ka scenario: har DB restart ke saath cache bhi khaali (poora stack restart). Lab: 9 crash, sirf 80% requests serve hui, 300 s mein kabhi wapas nahi.",
          "nodes": {
            "users": {
              "tone": "bad",
              "badge": "errors"
            },
            "cache": {
              "tone": "bad",
              "badge": "phir khaali"
            },
            "lim": {
              "tone": "idle",
              "badge": "—"
            },
            "db": {
              "tone": "bad",
              "badge": "crash ×9"
            }
          },
          "vars": {
            "hit": "~78%",
            "dbq": "crash-restart",
            "state": "loop"
          }
        },
        {
          "title": "Limiter",
          "clock": "limiter",
          "say": "DB ke aage limiter: queue mein 0.5 s ka kaam bhara ho toh nayi request ko turant \"baad mein\" (load shedding). DB zinda, cache bharta rehta hai. Lab: 0 crash, 99.9% serve, 4 s mein ≥85% hits.",
          "nodes": {
            "users": {
              "tone": "busy",
              "badge": "kuch ko \"baad mein\""
            },
            "cache": {
              "tone": "ok",
              "badge": "bhar raha"
            },
            "lim": {
              "tone": "acc",
              "badge": "queue ≤ 0.5 s"
            },
            "db": {
              "tone": "ok",
              "badge": "zinda"
            }
          },
          "vars": {
            "hit": "4 s mein ≥85%",
            "dbq": "≤1,000/s",
            "state": "theek"
          },
          "flows": [
            {
              "from": "users",
              "to": "lim",
              "label": "miss",
              "tone": "acc"
            },
            {
              "from": "lim",
              "to": "db",
              "label": "≤ kshamata",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Video ka ilaaj \"cache warming\" hai. Achanak crash mein warming kitna kaam aaya?",
            "choices": [
              "0 crash, par users ko 13 s rokna pada; limiter 4 s mein wapas",
              "Warming ne crash se pehle hi cache bhar diya, toh koi asar nahi hua",
              "Warming akele kaafi nahi chala; DB phir bhi 9 baar gira tha"
            ],
            "answer": 0,
            "hint": "ex4 A ka table: warming row ke \"wapas\" aur \"serve hui\" columns.",
            "explain": "Warming: users ko roko, hot keys pehle bharo. Lab: 0 crash, par 13 s users ruke (96.3% serve). Limiter: 99.9% serve, 4 s. Planned restart (deploy) mein naya cache purane ke chalte-chalte bharo — planned restart mein warming sabse sasta. Achanak crash ke liye limiter.",
            "choiceExplanations": [
              "Warming: users ko roko, hot keys pehle bharo. Lab: 0 crash, par 13 s users ruke (96.3% serve). Limiter: 99.9% serve, 4 s. Planned restart (deploy) mein naya cache purane ke chalte-chalte bharo — planned restart mein warming sabse sasta. Achanak crash ke liye limiter.",
              "Crash achanak tha; warming crash ke baad hi shuru ho sakti hai.",
              "Warming row mein 0 crash; 9 crash \"kuch nahi + har restart par khaali\" wali row ke hain."
            ]
          }
        }
      ],
      "lesson": "Cache gira → DB par 10 guna → bekaar kaam → DB gira → cache bhar nahi sakta. Limiter (load shedding) loop todta hai. Warming planned restart ke liye."
    },
    {
      "type": "cards",
      "title": "🧭 Kaunsa ilaaj, kab?",
      "goal": "Lab 60 ex4 A (model) aur ex4 B (asli Bloom filter, 10 lakh ids). Video ke do daave sudhaar ke saath.",
      "lesson": "DB ki dhaal ek cache nahi, kai parten: limiter, coalescing, warming, negative cache, Bloom. Aur cache sahi jagah lagao.",
      "steps": [
        {
          "title": "1. Herd ke teen ilaaj",
          "say": "<b>Limiter</b> (load shedding): hamesha — DB ko kshamata se zyada kaam mat do. <b>Coalescing</b> (ek key ke saare misses = ek DB read): hot key ke liye; akele kaafi nahi (lab: 1 crash, 39 s). <b>Warming</b>: planned restart aur deploy ke liye."
        },
        {
          "title": "2. Na-maujood ids (penetration)",
          "say": "Video: \"deliberate attack\". Hamesha nahi — app ka bug bhi same ids baar-baar maang sakta hai. Lab (10 lakh requests): bug par negative cache (\"nahi mila\" 60 s) DB ko 1,000 queries tak laata hai; attack (har id nayi) par negative cache bekaar, Bloom 8,149. Dono saath: bug par 8.",
          "ask": {
            "q": "Har request mein random naya user id (attack). Negative cache kyun bekaar?",
            "choices": [
              "Har id nayi hai — \"nahi mila\" ka cache kabhi dobara hit nahi hota",
              "Negative cache sirf maujood ids ke liye bana hai, na-maujood ke liye nahi",
              "Negative cache Bloom filter se dheema hai, isliye DB pehle pahunch jaata hai"
            ],
            "answer": 0,
            "hint": "Negative cache kab kaam aata hai — pehli baar ya doosri baar?",
            "explain": "Negative cache doosri baar bachata hai: pehli baar DB, phir 60 s tak \"nahi hai\" cache se. Attack mein har id pehli baar hai → 10 lakh DB queries (lab). Bloom filter ko id dekhni nahi padti: bits off → pakka nahi hai → 99% se zyada ruke.",
            "choiceExplanations": [
              "Negative cache doosri baar bachata hai: pehli baar DB, phir 60 s tak \"nahi hai\" cache se. Attack mein har id pehli baar hai → 10 lakh DB queries (lab). Bloom filter ko id dekhni nahi padti: bits off → pakka nahi hai → 99% se zyada ruke.",
              "Negative cache na-maujood ids ka hi cache hai; problem dohraav ki kami hai.",
              "Raftaar ki baat nahi; har id pehli baar aayi, toh cache mein kuch tha hi nahi."
            ]
          }
        },
        {
          "title": "3. Cache kahan lagao",
          "say": "Video ka sahi sawaal: \"sabse lamba intezaar kahan?\" User Sydney, server New York → roshni ki raftaar → CDN, Redis nahi. Query 2 s leti hai → pehle query plan dekho (index, sort): 2 s aksar missing index hai. Cache dheemi query chhupata hai, par har miss phir bhi 2 s — aur cache gira toh herd."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Herd aur Bloom",
      "project": "60-caching",
      "exercise": "ex4-herd",
      "goal": "Hissa A: cache crash ke baad chhe tareeke, 300 s. Hissa B: asli Bloom filter 10 lakh users par; attack, bug aur naye signups.",
      "why": "Node 24+ chahiye. Hissa A seeded model (har run same). Hissa B asli data structure; lookup ka samay machine se badlega.",
      "steps": [
        {
          "text": "Herd aur penetration (~10 s).",
          "cmd": "cd docker-labs/60-caching && npm start -- ex4-herd",
          "expect": "A. MODEL (10 ms ticks): 10,000 reads/sec, 1,00,000 keys (Zipf s = 1.2), LRU cache 10,000 keys (~92% hits).\n   DB: 1,000 reads/sec. User 1 s baad haar maanta hai, par DB woh kaam karta rehta hai. Queue > 3 s ka kaam → DB crash,\n   30 s mein wapas. t = 30 s par cache server crash, khaali wapas aaya. 300 s dekha.\n\ntareeka                                                DB crash   requests serve hui   bekaar DB kaam   wapas ≥85% hits\nkuch nahi                                                  2        96.1%              3,213        67 s baad\nkuch nahi, aur har DB restart par cache bhi khaali         9        80.1%              2,580        kabhi nahi\nrequest coalescing (ek key = ek DB read)                   1        98.0%              5,669        39 s baad\nDB ke aage limiter (queue bhari → turant \"baad mein\")      0        99.9%                  0        4 s baad\nlimiter + coalescing                                       0        99.9%                  0        4 s baad\nwarming: users ko roko, hot keys pehle bharo               0        96.3%                  0        13 s baad\n\nTimeline (har 5 s): hit rate %, D = DB band\nnone      91 D78 D79 D79 D79 D78 D78 85 D86 D86 D86 D86 D85 D86 89 92 92 91\nnone-cold 91 D78 D79 D79 D79 D78 D78 D78 D78 D78 D78 D78 D78 D77 D77 D77 D77 D78\nlimit     91 87 92 92 92 91 91 92 92 92 92 92 91 92 92 92 92 91\nwarm      91 0 0 91 92 92 92 92 92 92 91 92 91 92 92 92 92 91\n\n→ Cache gaya toh misses ~8% se lagbhag 100%; DB ki queue badhi, 1 s se purane jawab bekaar (user ja chuka), DB gira. DB band = cache\n  bhar nahi sakta = DB lautte hi phir wahi bojh. Cache ne jo bhara woh rakha toh loop do crash baad toota; har restart par\n  cache bhi khaali ho toh loop chalta hi raha (video ka scenario).\n→ Limiter (load shedding) asli dhaal hai: kuch users ko turant \"baad mein\", par DB zinda, cache bharta rehta hai.\n  Coalescing akele kaafi nahi (alag-alag keys ke misses phir bhi bahut). Warming: crash ke baad users ko rokna padta hai\n  (yahan 13 s); deploy jaise planned restart mein naya cache purane ke chalte-chalte bharo — wahan warming sabse sasta.\n\nB. ASLI Bloom filter: users 1 … 10,00,000 DB mein. Filter: 10 bits/key, 7 probes. Cache penetration = na-maujood ids.\n\nFilter: 1.25 MB. 10 lakh na-maujood ids mein \"shayad hai\": 0.83% (theory 0.82%). Ek lookup ~28 ns.\n\nDB tak kitni queries (10 lakh requests)        attack: har id nayi     bug: wahi 1,000 ids baar-baar\nkuch nahi                                       10,00,000                10,00,000\nnegative cache (\"nahi mila\" 60 s)               10,00,000                    1,000\nBloom filter                                        8,149                    8,000\nBloom + negative cache                              8,149                        8\n\nNaye 1,000 users signup (1 lakh requests): filter update nahi kiya → 99,100 asli requests galti se \"nahi hai\"; signup par add kiya → 0.\n\n→ Har baar nayi id (attack): negative cache bekaar, Bloom filter ~99% rokta hai. Wahi ids baar-baar: negative cache kaafi.\n→ Bloom ka \"shayad\" wala hissa DB tak jaata hai; Bloom + negative cache dono kamzoriyan dhakte hain.\n→ Bloom ko har insert par update karna zaroori; delete support nahi (uske liye counting Bloom ya rebuild)."
        },
        {
          "text": "Lab ke 5 tests (race, lease, Bloom aur herd ke guards samet).",
          "cmd": "npm test",
          "expect": "✔ ladder: a big random ring is far slower than an L1-sized one; random order is slower than sequential\n✔ zipf + LRU: uniform gives top 10% = 10%; more skew, more hits; bigger cache, more hits; LRU keeps its size\n✔ writes: after SIGKILL, write-back loses acked writes; through, group commit and the OS page cache lose none\n✔ invalidation: the delete race leaves old data forever without TTL, until TTL with it, and never with a lease\n✔ herd + penetration: a limiter keeps the DB alive; Bloom has no false negatives and blocks unique-id attacks\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 14459.172433"
        }
      ],
      "observe": {
        "q": "Hissa A: coalescing (ek key = ek DB read) ke baad bhi DB ek baar gira. Kyun?",
        "choices": [
          "Alag-alag keys ke misses phir bhi DB ki kshamata se bahut zyada the",
          "Coalescing har miss ko do baar DB bhejta hai, isliye bojh dugna ho gaya",
          "Coalescing sirf writes ke liye hai, reads par kuch nahi karta model mein"
        ],
        "answer": 0,
        "hint": "Cache khaali hai aur 1 lakh keys hain. Ek tick mein kitni alag keys aati hain?",
        "explain": "Coalescing ek hi key ke dohraaye misses jodta hai. Khaali cache par hazaaron alag keys miss hoti hain, aur alag keys jod nahi sakte. DB par phir bhi 1,000/sec se bahut zyada → 1 crash, 39 s. Limiter kshamata baandhta hai, isliye 0 crash.",
        "choiceExplanations": [
          "Coalescing ek hi key ke dohraaye misses jodta hai. Khaali cache par hazaaron alag keys miss hoti hain, aur alag keys jod nahi sakte. DB par phir bhi 1,000/sec se bahut zyada → 1 crash, 39 s. Limiter kshamata baandhta hai, isliye 0 crash.",
          "Coalescing bojh kam karta hai, badhata nahi.",
          "Model mein coalescing reads ke misses jodta hai (lib/herd.js)."
        ]
      },
      "lesson": "Herd mein DB ko kshamata se zyada kaam milna asli khatra hai. Limiter pehle; coalescing aur warming saath mein."
    }
  ],
  "interview": {
    "title": "Interview Round — dhaal kab",
    "instructions": "Pehle socho: DB ki kshamata kitni, aur cache na ho toh kitna bojh? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Redis cluster raat 2 baje gira. 10 guna traffic DB par, DB bhi gira. Restart ke baad DB phir gira. Pehla kadam?",
        "choices": [
          "DB ke aage limiter/load shedding: kshamata se zyada ko turant \"baad mein\", DB zinda rakho",
          "DB ko bada karo — 10 guna kshamata wala instance hamesha ke liye lagao, turant",
          "Redis ka TTL badha do, taaki keys zyada der tak rahein aur hits badhein",
          "Saari reads ko 5 baar retry karwao, taaki user ko error na dikhe kabhi"
        ],
        "answer": 0,
        "explain": "Loop tootna chahiye: DB ko utna hi kaam do jitna DB kar sake. Limiter se DB zinda, cache bharta hai, hit rate laut'ta hai (lab 60 ex4 A: 0 crash, 4 s). Phir coalescing aur warming.",
        "choiceExplanations": [
          "Loop tootna chahiye: DB ko utna hi kaam do jitna DB kar sake. Limiter se DB zinda, cache bharta hai, hit rate laut'ta hai (lab 60 ex4 A: 0 crash, 4 s). Phir coalescing aur warming.",
          "10 guna DB sirf cache crash ke liye bahut mehnga; aur abhi turant milega bhi nahi.",
          "Cache khaali hai; TTL badhane se khaali cache nahi bharta.",
          "Retry bojh aur badhata hai: 10 guna ka 5 guna."
        ]
      },
      {
        "q": "API par 10 lakh requests/ghanta galat product ids ke saath aa rahi hain — sab ek purane mobile app version se, 500 ids baar-baar. Sabse sasta ilaaj?",
        "choices": [
          "Negative cache: \"nahi mila\" ko 60 s cache karo; 500 ids = har minute ~500 DB queries",
          "Bloom filter banao saare products par aur har request pehle filter se nikaalo",
          "Mobile app ko block karo — galat ids hamesha attack hoti hain aur ruki chahiye",
          "Har product id ke liye DB index banao, taaki galat ids bhi tez mil jaayein"
        ],
        "answer": 0,
        "explain": "Same ids baar-baar = negative cache kaafi (lab 60 ex4 B: bug par 1,000 queries). Bloom filter attack (har id nayi) ke liye. Saath mein app ke purane version ka bug theek karo.",
        "choiceExplanations": [
          "Same ids baar-baar = negative cache kaafi (lab 60 ex4 B: bug par 1,000 queries). Bloom filter attack (har id nayi) ke liye. Saath mein app ke purane version ka bug theek karo.",
          "Bloom chalega, par har insert par update aur alag system; dohraaye ids ke liye zaroorat nahi.",
          "Purana app version bug hai, attack nahi; block karne se asli users bhi rukenge.",
          "Primary key par index pehle se hota hai; problem queries ki ginti hai."
        ]
      }
    ]
  },
  "success": [
    "Cache crash → DB crash loop samjha sakte ho",
    "Limiter, coalescing aur warming mein chun sakte ho",
    "Negative cache aur Bloom mein chun sakte ho"
  ],
  "cards": [
    {
      "front": "Herd loop?",
      "back": "Cache gira → misses 8% se ~100% → DB queue → bekaar kaam → DB gira → cache bhar nahi sakta. Lab 60 ex4 A: limiter = 0 crash, 4 s."
    },
    {
      "front": "Warming kab?",
      "back": "Planned restart/deploy: naya cache purane ke chalte bharo. Achanak crash mein users ko rokna padta hai (lab: 13 s). Achanak ke liye limiter."
    },
    {
      "front": "Negative cache vs Bloom?",
      "back": "Same ids baar-baar (bug) → negative cache. Har id nayi (attack) → Bloom (~99% ruka). Dono saath: lab mein bug par 8 queries."
    }
  ]
}
]);
})();
