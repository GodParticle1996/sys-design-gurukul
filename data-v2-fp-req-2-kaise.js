/* First Principles — FAANG Senior Engineer.
   Source credit: The Anatomy of a Request (kt1tW0El6Gg), numbered video 4/15.
   Evidence: docker-labs/54-request-anatomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "lap", "icon": "💻", "label": "laptop (stub)", "x": 150, "y": 105}, {"id": "net", "icon": "📶", "label": "raasta (UDP)", "x": 445, "y": 105}, {"id": "res", "icon": "📒", "label": "resolver", "x": 750, "y": 105}];
const EDGES = [{"from": "lap", "to": "net"}, {"from": "net", "to": "res"}];
VISUALS["fp-req-kaise"] = { t: "Ek packet gira — aur 6 ms ka kaam 1,006 ms ka ho gaya. Koi error nahi, bas intezaar.", html: SD.viz.svg(HERO, EDGES, { nodes: { lap: {tone:'busy',badge:'intezaar'}, net: {tone:'bad',badge:'1% gira'}, res: {tone:'ok',badge:'copy mein'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-req-kaise",
  "icon": "🛣️",
  "group": "🛣️ Anatomy of a Request",
  "title": "Request 2 · Kaise — gira packet, TTL aur geo DNS",
  "badge": "DNS Saadhak",
  "objectives": [
    "UDP par ek gira sawaal p99 ko kaise bigaadta hai?",
    "TTL lamba ya chhota — kya milta, kya jaata hai?",
    "Geo DNS ko kiska IP dikhta hai?"
  ],
  "lesson": [
    "<h3>📞 Phone uthaya, line kat gayi</h3><p>Aapne dukaan par phone kiya, aur line chup-chaap kat gayi. Aapko pata nahi — aap \"hello?\" ka intezaar karte ho, phir thak ke dobara lagate ho. Baat 5 second ki thi, intezaar ek minute ka.</p><p>DNS ka sawaal UDP par aisa hi jaata hai. Resolver ki cached copy (TTL) samay bachati hai, par IP badalne par purana pata deti rehti hai. Dono baatein naapte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📉 Ek gira hua sawaal",
      "goal": "Naam resolver ki copy mein hai, aam jawab ~6 ms. DNS UDP par chalta hai: koi \"mila\" ki raseed nahi. Laptop ka niyam: 1,000 ms tak jawab na aaye toh dobara poochho, 2 baar tak. Lab 54 ex2.",
      "nodes": [
        {
          "id": "lap",
          "icon": "💻",
          "label": "laptop (stub)",
          "x": 150,
          "y": 105
        },
        {
          "id": "net",
          "icon": "📶",
          "label": "raasta (UDP)",
          "x": 445,
          "y": 105
        },
        {
          "id": "res",
          "icon": "📒",
          "label": "resolver",
          "x": 750,
          "y": 105
        }
      ],
      "edges": [
        {
          "from": "lap",
          "to": "net"
        },
        {
          "from": "net",
          "to": "res"
        }
      ],
      "viz": {
        "w": 890,
        "h": 215
      },
      "vars": [
        {
          "id": "clock",
          "label": "Ghadi"
        },
        {
          "id": "try",
          "label": "Koshish"
        },
        {
          "id": "state",
          "label": "Haal"
        }
      ],
      "steps": [
        {
          "title": "Sawaal nikla",
          "clock": "0 ms",
          "say": "Laptop UDP packet bhejta hai: \"api.khanakart.com?\"",
          "nodes": {
            "lap": {
              "tone": "acc",
              "badge": "sawaal"
            },
            "net": {
              "tone": "busy",
              "badge": "jaa raha"
            },
            "res": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "clock": "0 ms",
            "try": "1",
            "state": "intezaar"
          },
          "flows": [
            {
              "from": "lap",
              "to": "net",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Packet gira",
          "clock": "1 ms",
          "say": "Raaste mein packet gir gaya (bhari router, Wi-Fi ki gadbad). Resolver tak kuch nahi pahuncha.",
          "nodes": {
            "lap": {
              "tone": "busy",
              "badge": "intezaar"
            },
            "net": {
              "tone": "bad",
              "badge": "gira ✗"
            },
            "res": {
              "tone": "idle",
              "badge": "kuch nahi aaya"
            }
          },
          "vars": {
            "clock": "1 ms",
            "try": "1",
            "state": "intezaar"
          },
          "ask": {
            "q": "Laptop ko kab pata chalega ki packet gir gaya?",
            "choices": [
              "Pata nahi chalta — UDP mein raseed nahi; laptop 1,000 ms timeout tak rukta hai",
              "Turant — router packet girate hi laptop ko \"gir gaya\" ka sandesh bhejta hai",
              "Kuch ms mein — UDP khud packet ko dobara bhej deta hai, TCP ki tarah"
            ],
            "answer": 0,
            "hint": "UDP mein \"mila\" ki raseed hoti hai?",
            "explain": "UDP bas bhejta hai — na raseed, na apne aap dobara bhejna. Laptop ke paas ek hi tareeka: timeout tak ruko. Isliye ek gira packet poora 1,000 ms kha jaata hai, jabki jawab 6 ms mein aa jaata.",
            "choiceExplanations": [
              "UDP bas bhejta hai — na raseed, na apne aap dobara bhejna. Laptop ke paas ek hi tareeka: timeout tak ruko. Isliye ek gira packet poora 1,000 ms kha jaata hai, jabki jawab 6 ms mein aa jaata.",
              "Router girne ki khabar nahi deta; bhari router chup-chaap packet chhod deta hai.",
              "Dobara bhejna UDP nahi, laptop ka resolver library karti hai — timeout ke baad."
            ]
          }
        },
        {
          "title": "Timeout, dobara",
          "clock": "1,006 ms",
          "say": "1,000 ms beet gaye. Laptop dobara poochhta hai. Is baar packet pahuncha, resolver ne copy se jawab diya.",
          "nodes": {
            "lap": {
              "tone": "ok",
              "badge": "IP ✓"
            },
            "net": {
              "tone": "ok",
              "badge": ""
            },
            "res": {
              "tone": "ok",
              "badge": "copy se"
            }
          },
          "vars": {
            "clock": "1,006 ms",
            "try": "2",
            "state": "jawab mila"
          },
          "flows": [
            {
              "from": "lap",
              "to": "net",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "net",
              "to": "res",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "2,000 lookups, 1% loss",
          "clock": "—",
          "say": "Lab ne 2,000 lookups chalaye, resolver 1% sawaal girata hai (seeded). 16 gire, 16 ko dobara poochhna pada. p50 6 ms hi raha; ausat (mean) 0% par ~6 ms tha, 1% par <b>13.6–13.7 ms</b>. p99 7–8 ms, p99.9 <b>1,006–1,007 ms</b>.",
          "nodes": {
            "lap": {
              "tone": "ok",
              "badge": "1,984 tez"
            },
            "net": {
              "tone": "slow",
              "badge": "16 gire"
            },
            "res": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "clock": "ausat 13.6 ms",
            "try": "16 retry",
            "state": "p99.9 ~1 s"
          },
          "ask": {
            "q": "5% loss par p99 kya hoga?",
            "choices": [
              "p99 ~1 s — 100 mein ~5 lookups poora timeout rukenge, kuch do baar",
              "p99 ~30 ms — 5% loss par har lookup thoda-thoda dheema hota hai",
              "Kuch nahi — copy mein naam hai, toh loss se farq nahi padta"
            ],
            "answer": 0,
            "hint": "Gira hua sawaal kitna rukta hai, aur kitne sawaal girenge?",
            "explain": "Har gira sawaal poora timeout rukta hai — thoda-thoda nahi, ek jhatke mein 1 s. 5% loss par 100 mein ~5: lab mein p99 teeno runs mein 1,006 ms, aur 3–7 lookups do baar gire, 2 s baad fail hue. p95 theek kinaare par tha (2 runs mein 1,004 ms, ek mein 7 ms), kyunki lagbhag 5% hi retry hue. glibc ka default timeout:5 hai; glibc par asli wait nameserver list par depend karta hai.",
            "choiceExplanations": [
              "Har gira sawaal poora timeout rukta hai — thoda-thoda nahi, ek jhatke mein 1 s. 5% loss par 100 mein ~5: lab mein p99 teeno runs mein 1,006 ms, aur 3–7 lookups do baar gire, 2 s baad fail hue. p95 theek kinaare par tha (2 runs mein 1,004 ms, ek mein 7 ms), kyunki lagbhag 5% hi retry hue. glibc ka default timeout:5 hai; glibc par asli wait nameserver list par depend karta hai.",
              "Loss sabko thoda nahi, kuch ko poora timeout deta hai. Lab: p50 5 ms, p99 1,006 ms.",
              "Copy resolver ke paas hai; packet laptop aur resolver ke beech girta hai."
            ]
          }
        }
      ],
      "lesson": "UDP mein gira packet ka pata sirf timeout se chalta hai. Chhota loss median ko kam badalta hai, par ausat aur tail dono badhte hain: 1% par ausat 6 → 13.6 ms aur p99.9 1 s; 5% par p99 1 s."
    },
    {
      "type": "cards",
      "title": "⏳ TTL ka sauda, aur geo DNS kise dekhta hai",
      "goal": "Copy kitni der rakhein? Aur DNS user ko paas wale data center tak kaise bhejta hai? Lab 54 ex3 ka model.",
      "lesson": "Lamba TTL = kam sawaal aur tez lookups, par IP badalne par purane IP par der tak traffic. Chhota TTL = jaldi badlaav, par zyada lookups. Geo DNS ko aam taur par resolver dikhta hai, user nahi.",
      "steps": [
        {
          "title": "1. Do palde",
          "say": "Model: 10,000 busy resolvers, sab TTL maante hain aur copy khatam hote hi dobara poochhte hain; copies ki umar 0 se TTL tak barabar faili hai. TTL 1 min: aapke server par 6,00,000 sawaal/ghanta. TTL 24 h: sirf 417. Ab data center mein aag lagi, IP badla.",
          "ask": {
            "q": "TTL 1 ghanta hai. IP badalne ke 5 minute baad kitne resolvers abhi bhi purana IP de rahe hain?",
            "choices": [
              "~92% — copy ki umar 0–60 min; jinki copy 5 min se zyada bachi thi, sab purane IP par",
              "0% — IP badalte hi authoritative server sab resolvers ko khabar kar deta hai",
              "~8% — sirf pichhle 5 minute mein copy lene wale resolvers purane IP par"
            ],
            "answer": 0,
            "hint": "Kitne resolvers ki copy 5 minute ke andar khatam hogi?",
            "explain": "Har resolver ki copy alag umar ki: model mein 1 ghante mein se 5 minute ke andar sirf ~8% copies khatam hongi. Baaki ~92% purane IP par (lab: 91.8%). Sabse bura: poora 1 ghanta. Isliye planned move se pehle TTL ghatao.",
            "choiceExplanations": [
              "Har resolver ki copy alag umar ki: model mein 1 ghante mein se 5 minute ke andar sirf ~8% copies khatam hongi. Baaki ~92% purane IP par (lab: 91.8%). Sabse bura: poora 1 ghanta. Isliye planned move se pehle TTL ghatao.",
              "DNS mein \"khabar karna\" (push) nahi; resolvers TTL khatam hone par khud poochhte hain.",
              "Ulta: 5 minute ke andar expire hui copies wale lagbhag 8% resolvers naya IP le chuke."
            ]
          }
        },
        {
          "title": "2. Geo DNS ki aankh",
          "say": "Geo DNS: authoritative server poochhne wale ka IP dekh ke paas wale data center ka IP deta hai — Mumbai wale ko Mumbai, Frankfurt wale ko Frankfurt. Is scenario mein ECS band hai, policy sirf sawaal bhejne wale ki jagah dekhti hai, dono data centers healthy hain aur koi purana cached jawab nahi.",
          "ask": {
            "q": "Chennai ka user Singapore mein chalne wala public resolver use karta hai. Geo DNS user ko kahan bhejega?",
            "choices": [
              "Singapore ke data center — authoritative ko resolver ka IP dikhta hai, user ka nahi",
              "Chennai ke paas — authoritative ko har packet mein user ka asli IP milta hai",
              "Random — geo DNS har baar data centers mein baari-baari bhejta hai"
            ],
            "answer": 0,
            "hint": "Authoritative server se baat kaun kar raha hai?",
            "explain": "Authoritative se resolver baat karta hai, user nahi. Toh geo DNS resolver ki jagah dekhta hai: Singapore. Resolver aur authoritative dono EDNS Client Subnet (RFC 7871) support karein toh user ke subnet ka hissa jagah ka behtar andaaza de sakta hai — paas ya sabse tez data center ki guarantee nahi. Isliye bade public resolvers duniya bhar mein paas-paas chalte hain.",
            "choiceExplanations": [
              "Authoritative se resolver baat karta hai, user nahi. Toh geo DNS resolver ki jagah dekhta hai: Singapore. Resolver aur authoritative dono EDNS Client Subnet (RFC 7871) support karein toh user ke subnet ka hissa jagah ka behtar andaaza de sakta hai — paas ya sabse tez data center ki guarantee nahi. Isliye bade public resolvers duniya bhar mein paas-paas chalte hain.",
              "User ka IP sirf resolver tak jaata hai. ECS na ho toh authoritative ko user nahi dikhta.",
              "Baari-baari bhejna round robin DNS hai; geo DNS jagah dekhta hai — resolver ki."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Copy rakhne ki muddat: <b>TTL</b>. Jagah dekh ke IP dena: <b>geo DNS</b>. Resolver ka user ke subnet ka hissa bhejna: <b>EDNS Client Subnet (ECS)</b>. Jawab na aane par dobara: <b>timeout + retry</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Loss ka p99, aur TTL ka hisaab",
      "project": "54-request-anatomy",
      "exercise": "ex2-loss",
      "goal": "2,000 lookups 0%, 1% aur 5% loss par — p50 se p99.9 tak. Phir TTL 1 min se 24 h tak ka model.",
      "why": "Node 22+ chahiye. ex2 asli UDP hai (loss seeded model); ~10 second chalta hai. ex3 model hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: packet loss.",
          "cmd": "cd docker-labs/54-request-anatomy && npm start -- ex2-loss",
          "expect": "REAL RUN: Node v24.18.0; 2,000 lookups of a cached name, 20 at a time; stub timeout 1000 ms, 2 tries\nMODEL: the resolver drops this share of incoming questions (seeded); timings change run to run\n\nloss   dropped   retried   answered after retry   failed     mean     p50      p95      p99    p99.9      max\n0%           0         0                      0        0    6.0 ms     6 ms     7 ms    10 ms    11 ms    12 ms\n1%          16        16                     16        0   13.6 ms     6 ms     7 ms     8 ms  1006 ms  1007 ms\n5%         107       100                     93        7   58.9 ms     5 ms     7 ms  1006 ms  2001 ms  2002 ms\n\npercentiles include failed lookups at their full wait: the ~2,000 ms samples failed after two timeouts\nglibc resolv.conf defaults are timeout:5 and attempts:2; the actual wait per lost query depends on the nameserver list and resolver code, not a fixed 5 s"
        },
        {
          "text": "TTL ka sauda.",
          "cmd": "npm start -- ex3-ttl",
          "expect": "MODEL: 10,000 busy resolvers (each re-asks as soon as its copy expires); cache ages uniform; resolvers that ignore or clamp the TTL are not modelled\n\n                                   share still on the OLD IP after\nTTL      queries/hour to you      1 min    5 min      1 h   worst case\n1 min           6,00,000       0.0%     0.0%     0.0%        1 min\n5 min           1,20,000      80.1%     0.0%     0.0%        5 min\n1 h               10,000      98.4%    91.8%     0.0%          1 h\n24 h                 417     100.0%    99.7%    95.9%         24 h\n\nlower TTL = faster move away from a dead IP, but more lookups (and more cold-lookup waits for users)"
        }
      ],
      "observe": {
        "q": "1% loss par p99 sirf 7–8 ms raha. Toh 1% loss chhoti baat hai?",
        "choices": [
          "Nahi — p99.9 ~1 s, aur kai lookups wale page par kisi ek ke girne ka chance badhta hai",
          "Haan — p99 7–8 ms hai, aur users ko sirf p99 tak ka samay hi mehsoos hota hai",
          "Haan — 16 sawaal gire par sab dobara mil gaye, koi lookup fail nahi hua"
        ],
        "answer": 0,
        "hint": "Ek page 20 alag naam ya calls chhoota hai toh?",
        "explain": "1% par 0.8% lookups ne poora 1 s khaaya — p99 ke theek neeche, p99.9 par 1 s. Ek page kai naam/calls par tika ho toh kisi ek ke girne ka chance badhta hai (topic 2 ka fan-out: 1 − 0.992^20 ≈ 15%). glibc ke default (timeout:5) par har timeout ka intezaar aur lamba ho sakta hai.",
        "choiceExplanations": [
          "1% par 0.8% lookups ne poora 1 s khaaya — p99 ke theek neeche, p99.9 par 1 s. Ek page kai naam/calls par tika ho toh kisi ek ke girne ka chance badhta hai (topic 2 ka fan-out: 1 − 0.992^20 ≈ 15%). glibc ke default (timeout:5) par har timeout ka intezaar aur lamba ho sakta hai.",
          "Users ko sabse dheema hissa yaad rehta hai; 1,000 mein 1 ka 1 s, aur page par kai lookups.",
          "Fail nahi hua, par 16 lookups ne poora 1 s khaaya: median 6 ms raha, ausat 6 se 13.6 ms, p99.9 1 s."
        ]
      },
      "lesson": "Chhota loss median ko kam badalta hai; ausat aur tail dono timeout jitne badhte hain. TTL ek sauda hai: bachat vs badlaav ki raftaar."
    }
  ],
  "interview": {
    "title": "Interview Round — DNS ki chaalein",
    "instructions": "Pehle socho: copy kitni der rehti hai, sawaal kaun poochh raha hai, aur gira packet kitna rukta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Agle hafte KhanaKart naye data center par shift hoga. DNS record ka TTL abhi 24 ghante hai. Plan kya hoga?",
        "choices": [
          "Pehle TTL 60 s karo, purani copies khatam hone do, phir IP badlo; baad mein TTL wapas badhao",
          "Shift ke din IP badal do — authoritative server sab resolvers ko turant bata dega",
          "TTL 24 h hi rehne do — lamba TTL matlab sab resolvers jaldi naya IP le lenge",
          "Shift ke din TTL 60 s aur IP ek saath badlo — dono badlaav turant sab jagah lagenge"
        ],
        "answer": 0,
        "explain": "Purani copies apna 24 h ka TTL poora karti hain. TTL pehle ghatao aur kam se kam 24 h ruko, taaki saari copies chhote TTL wali ho jaayein. Phir IP badlo: ~60 s mein zyada tar resolvers naya IP le lenge. Kuch resolvers TTL clamp karte hain, isliye purana IP thodi der aur chalu rakho.",
        "choiceExplanations": [
          "Purani copies apna 24 h ka TTL poora karti hain. TTL pehle ghatao aur kam se kam 24 h ruko, taaki saari copies chhote TTL wali ho jaayein. Phir IP badlo: ~60 s mein zyada tar resolvers naya IP le lenge. Kuch resolvers TTL clamp karte hain, isliye purana IP thodi der aur chalu rakho.",
          "DNS push nahi karta; har resolver apni copy khatam hone par hi poochhta hai.",
          "Lamba TTL matlab copy der tak — purana IP 24 h tak.",
          "24 h wali copy rakhne wale resolvers naya 60 s TTL tab tak nahi dekhenge, jab tak copy khatam na ho."
        ]
      },
      {
        "q": "Scenario: ECS band, geo policy sirf sawaal bhejne wale ki jagah dekhti hai, dono data centers healthy, load-based steering band, koi purana cached jawab nahi. Phir bhi Chennai ke kuch users Singapore ke servers par ja rahe hain, jabki Mumbai paas hai. Wajah?",
        "choices": [
          "Chennai ke kuch users Singapore ka public resolver use karte hain; authoritative ko resolver ka IP dikhta hai",
          "Chennai ke users ka IP Singapore ka hai — Indian ISPs ke IP Singapore mein registered hote hain",
          "Geo DNS ka TTL lamba hai — lamba TTL users ko door ke data center par bhejta hai",
          "Mumbai data center bhara hai — geo DNS bhare data center ko apne aap chhod deta hai"
        ],
        "answer": 0,
        "explain": "Geo DNS ko resolver ka IP dikhta hai. Resolver Singapore mein ho toh jawab Singapore ka. Ilaaj: ECS (resolver user ke subnet ka hissa bhejta hai — behtar andaaza, guarantee nahi), ya users ke paas chalne wale resolvers.",
        "choiceExplanations": [
          "Geo DNS ko resolver ka IP dikhta hai. Resolver Singapore mein ho toh jawab Singapore ka. Ilaaj: ECS (resolver user ke subnet ka hissa bhejta hai — behtar andaaza, guarantee nahi), ya users ke paas chalne wale resolvers.",
          "ISP ke IP aam taur par desh ke hisaab se hote hain; sawaal yahan resolver ki jagah ka hai.",
          "TTL batata hai copy kitni der chale, jagah nahi badalta.",
          "Scenario mein dono data centers healthy hain aur load-based steering band hai."
        ]
      }
    ]
  },
  "success": [
    "Gira UDP packet aur timeout ka p99 par asar samjha sakte ho",
    "TTL ka sauda numbers se bata sakte ho",
    "Geo DNS aur ECS ka farq samjha sakte ho"
  ],
  "cards": [
    {
      "front": "1% UDP loss ka asar (lab 54)?",
      "back": "Median ~6 ms raha, par ausat 6 → 13.6 ms aur p99.9 ~1 s (timeout). 5% par p99 ~1 s. glibc par asli wait nameserver list par depend karta hai."
    },
    {
      "front": "TTL lamba vs chhota?",
      "back": "Busy resolvers aur barabar faili cache umar wale model mein: TTL 1 min → 6 lakh sawaal/ghanta; 1 h → 10,000, aur 5 min baad 91.8% copies purani. Asli failover mein resolver aur app cache ka bartav bhi naapo."
    },
    {
      "front": "Geo DNS kise dekhta hai?",
      "back": "Aam taur par resolver ka IP, user ka nahi. ECS (RFC 7871) se resolver user ke subnet ka hissa bhej sakta hai — behtar andaaza, guarantee nahi."
    }
  ]
}
]);
})();
