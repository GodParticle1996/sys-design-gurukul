/* First Principles — FAANG Senior Engineer.
   Source credit: Master the Math of Scale (04ip8kPZXsM), numbered video 2/15.
   Evidence: docker-labs/52-scale-math/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "req", "icon": "🧾", "label": "10 requests", "x": 140, "y": 105}, {"id": "sort", "icon": "📊", "label": "line mein", "x": 445, "y": 105}, {"id": "dash", "icon": "📈", "label": "dashboard", "x": 750, "y": 105}];
const EDGES = [{"from": "req", "to": "sort"}, {"from": "sort", "to": "dash"}];
VISUALS["fp-scale-kyun"] = { t: "Ausat 121 ms, line seedhi — phir bhi roz 15,000 requests 2–8 s atakti hain. Number kisi ki kahani kyun nahi?", html: SD.viz.svg(HERO, EDGES, { nodes: { req: {tone:'acc',badge:'1 lakh requests'}, sort: {tone:'slow',badge:'1.5%: 2–8 s'}, dash: {tone:'ok',badge:'ausat 121 ms'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-scale-kyun",
  "icon": "📈",
  "group": "📈 Math of Scale",
  "title": "Scale 1 · Kyun — ausat theek, log naraaz kyun?",
  "badge": "Tail Shishya",
  "objectives": [
    "Ausat dheemi requests ko kaise chhupata hai?",
    "p50, p90, p99 rank se kaise padhte hain?",
    "Kai calls ka intezaar karne wala page itna dheema kyun?"
  ],
  "lesson": [
    "<h3>☕ Tapri par Ambani aaye. Sab crorepati?</h3><p>Chai ki tapri par 9 log baithe hain, sabki kamai ₹30,000 mahina. Ambani bhi chai peene ruk gaye. Ab tapri ki ausat kamai karodon mein — par tapri par ek bhi aadmi aisa nahi jiski kamai karodon ke aaspaas ho.</p><p>KhanaKart ka dashboard bhi aisa hi number dikhata hai: ausat 121 ms, line seedhi. Phir bhi roz hazaaron log atakte hain. Pehle dekho, ek number kaise chhupata hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧾 10 requests, ek ausat — kiski kahani?",
      "goal": "KhanaKart ke checkout ki 10 requests (ms): 16, 12, 25, 15, 900, 14, 19, 15, 21, 18. Dashboard ausat dikhata hai. Lab 52 ka ex0-slowmo tail.",
      "nodes": [
        {
          "id": "req",
          "icon": "🧾",
          "label": "10 requests",
          "x": 140,
          "y": 105
        },
        {
          "id": "sort",
          "icon": "📊",
          "label": "line mein",
          "x": 445,
          "y": 105
        },
        {
          "id": "dash",
          "icon": "📈",
          "label": "dashboard",
          "x": 750,
          "y": 105
        }
      ],
      "edges": [
        {
          "from": "req",
          "to": "sort"
        },
        {
          "from": "sort",
          "to": "dash"
        }
      ],
      "viz": {
        "w": 890,
        "h": 215
      },
      "vars": [
        {
          "id": "list",
          "label": "Requests (ms)"
        },
        {
          "id": "mean",
          "label": "Ausat (mean)"
        },
        {
          "id": "rank",
          "label": "Rank se padha"
        }
      ],
      "steps": [
        {
          "title": "10 requests aayi",
          "clock": "t1",
          "say": "Nau requests 12 se 25 ms ke beech. Ek request <b>900 ms</b> — kisi ka order 0.9 second atka.",
          "nodes": {
            "req": {
              "tone": "acc",
              "badge": "10 aayi"
            },
            "sort": {
              "tone": "idle",
              "badge": ""
            },
            "dash": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "list": "16, 12, 25, 15, 900, 14, 19, 15, 21, 18",
            "mean": "—",
            "rank": "—"
          },
          "flows": [
            {
              "from": "req",
              "to": "sort",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Ausat nikalo",
          "clock": "t2",
          "say": "Sab jodo: 1055. Das se bhaag: <b>105.5 ms</b>. Dashboard par ausat 105.5 ms jaata hai.",
          "nodes": {
            "req": {
              "tone": "acc",
              "badge": "jod: 1055"
            },
            "sort": {
              "tone": "idle",
              "badge": ""
            },
            "dash": {
              "tone": "busy",
              "badge": "105.5 ms"
            }
          },
          "vars": {
            "list": "jod 1055",
            "mean": "105.5 ms",
            "rank": "—"
          },
          "flows": [
            {
              "from": "sort",
              "to": "dash",
              "label": "ausat",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Ausat 105.5 ms hai. 10 mein se kitni requests 84 se 127 ms (ausat ke ±20%) ke beech hain?",
            "choices": [
              "Ek bhi nahi — nau requests 12–25 ms ki hain, aur ek akeli request 900 ms ki",
              "Zyada tar — ausat ka matlab hi aam request ka samay, toh zyada tar aaspaas",
              "Aadhi — ausat ke dono taraf hamesha barabar ginti mein requests hoti hain"
            ],
            "answer": 0,
            "hint": "List mein 84 aur 127 ke beech koi number dikha?",
            "explain": "Ausat 105.5 ms hai, par koi request 84–127 ms ke beech nahi. Nau requests 25 ms ya kam, ek 900 ms. Ek bahut dheemi request ne ausat ko upar kheencha — ausat na tez logon ki kahani hai, na dheeme ki.",
            "choiceExplanations": [
              "Ausat 105.5 ms hai, par koi request 84–127 ms ke beech nahi. Nau requests 25 ms ya kam, ek 900 ms. Ek bahut dheemi request ne ausat ko upar kheencha — ausat na tez logon ki kahani hai, na dheeme ki.",
              "Aam request 12–25 ms leti hai. Ausat ek bade number se upar khisak gaya.",
              "Median sorted list ke beech ki rank se milta hai; ausat ko dono taraf barabar ginti ki shart nahi chahiye. Is list mein ausat se neeche 9 requests aur upar 1 hai."
            ]
          }
        },
        {
          "title": "Line mein lagao",
          "clock": "t3",
          "say": "Chhote se bade: 12, 14, 15, 15, 16, 18, 19, 21, 25, 900. Ab har request ki ek <b>rank</b> hai: 1 se 10.",
          "nodes": {
            "req": {
              "tone": "idle",
              "badge": ""
            },
            "sort": {
              "tone": "acc",
              "badge": "sorted"
            },
            "dash": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "list": "12, 14, 15, 15, 16, 18, 19, 21, 25, 900",
            "mean": "105.5 ms",
            "rank": "—"
          },
          "flows": [
            {
              "from": "req",
              "to": "sort",
              "label": "sort",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Beech wali request",
          "clock": "t4",
          "say": "Rank 5 (10 ka aadha) par <b>16 ms</b>. Lab ka niyam nearest rank hai: das samples ke p50 ke liye paanchva number. Aadhi requests 16 ms ya kam mein. Rank 5 ke samay ka naam <b>p50</b> (median).",
          "nodes": {
            "req": {
              "tone": "idle",
              "badge": ""
            },
            "sort": {
              "tone": "ok",
              "badge": "rank 5 = 16"
            },
            "dash": {
              "tone": "ok",
              "badge": "p50 16 ms"
            }
          },
          "vars": {
            "list": "12, 14, 15, 15, [16], 18, 19, 21, 25, 900",
            "mean": "105.5 ms",
            "rank": "p50 = 16 ms"
          },
          "flows": [
            {
              "from": "sort",
              "to": "dash",
              "label": "p50",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Rank 9",
          "clock": "t5",
          "say": "Rank 9 (10 ka 90%) par <b>25 ms</b>. Rank 9 ke samay ka naam <b>p90</b>.",
          "nodes": {
            "req": {
              "tone": "idle",
              "badge": ""
            },
            "sort": {
              "tone": "ok",
              "badge": "rank 9 = 25"
            },
            "dash": {
              "tone": "ok",
              "badge": "p90 25 ms"
            }
          },
          "vars": {
            "list": "…, 21, [25], 900",
            "mean": "105.5 ms",
            "rank": "p50 16 · p90 25 ms"
          },
          "flows": [
            {
              "from": "sort",
              "to": "dash",
              "label": "p90",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "p90 = 25 ms ka sahi matlab kya hai?",
            "choices": [
              "10 mein se 9 requests 25 ms ya kam mein poori hui; ek request 25 ms se dheemi",
              "90% requests theek 25 ms leti hain; baaki 10% requests 25 ms se tez hoti hain",
              "Sabse dheemi request 25 ms ki thi — 25 ms se upar koi request nahi gayi"
            ],
            "answer": 0,
            "hint": "Rank 9 ke upar list mein kya bacha?",
            "explain": "Rank 9 tak ki saari requests 25 ms ya kam. Upar sirf ek request bachi: 900 ms. p90 batata hai ki 90% kis samay ke andar poore hue — sabse dheemi 10% ka samay nahi.",
            "choiceExplanations": [
              "Rank 9 tak ki saari requests 25 ms ya kam. Upar sirf ek request bachi: 900 ms. p90 batata hai ki 90% kis samay ke andar poore hue — sabse dheemi 10% ka samay nahi.",
              "p90 ek hadd hai, sabka samay nahi. Rank 1–9 ke samay 12 se 25 ms tak alag-alag hain.",
              "Sabse dheemi request 900 ms ki hai — max (p100). p90 900 ms wali request ko nahi dikhata."
            ]
          }
        },
        {
          "title": "Sabse upar",
          "clock": "t6",
          "say": "Rank 10 = <b>900 ms</b> (max). Ausat 105.5 ms ne dheemi request ko chhupa diya; p50 aur p90 ne bhi. Dheeme hisse ko dekhne ke liye upar ke percentile chahiye — p99, p99.9.",
          "nodes": {
            "req": {
              "tone": "idle",
              "badge": ""
            },
            "sort": {
              "tone": "bad",
              "badge": "rank 10 = 900"
            },
            "dash": {
              "tone": "slow",
              "badge": "max 900 ms"
            }
          },
          "vars": {
            "list": "…, 25, [900]",
            "mean": "105.5 ms",
            "rank": "p50 16 · p90 25 · max 900"
          },
          "flows": [
            {
              "from": "sort",
              "to": "dash",
              "label": "max",
              "tone": "bad"
            }
          ]
        }
      ],
      "lesson": "Ausat ek number mein sab mila deta hai, aur ek bahut dheemi request ausat ko kheench leti hai. Line mein lagao aur rank padho: p50 aam request, p90/p99 dheema hissa, max sabse bura."
    },
    {
      "type": "cards",
      "title": "🍱 Thali tabhi jaati hai jab saari katori ready",
      "goal": "KhanaKart ki thali mein kai katori, har katori alag rasoi se. Thali tab nikalti hai jab sabse dheemi katori aaye.",
      "lesson": "Page sab calls ka intezaar kare toh page ka samay sabse dheemi call ka samay hai. Har call alag-alag 1% dheemi ho toh 100 calls par 63% pages dheeme. Ek hi wajah sab calls ko saath dheema kare toh pages bhi ~1% dheeme.",
      "steps": [
        {
          "title": "1. Sabse dheemi katori",
          "say": "Thali mein 3 katori: dal 12 ms, sabzi 1000 ms, roti 13 ms. Thali 1000 ms par jaati hai. Website ka page bhi aisa hi hai: page kai services ko saath bulaata hai (<b>fan-out</b>) aur sab jawabon ka intezaar karta hai."
        },
        {
          "title": "2. Har call 1% dheemi",
          "say": "Har call 100 mein 1 baar ~1 s leti hai, baaki baar 10–20 ms. Ek call ka saaf rehna: 0.99. Teen calls: 0.99 × 0.99 × 0.99 = 0.970.",
          "ask": {
            "q": "Har call alag-alag 1% baar dheemi hai. Page 100 calls ka intezaar karta hai. Kitne pages dheeme honge?",
            "choices": [
              "Lagbhag 63% — saaf page ka chance 0.99^100 ≈ 0.37 bachta hai",
              "Lagbhag 1% — har call 1% dheemi hai, toh page bhi 1% dheema",
              "Har page — 100 calls × 1% = 1, toh har page mein ek dheemi call"
            ],
            "answer": 0,
            "hint": "Saari 100 calls ek saath saaf rehne ka chance kitna?",
            "explain": "Page saaf tab hai jab 100 mein se har call saaf ho: 0.99^100 ≈ 0.366. Baaki 63.4% pages mein kam se kam ek dheemi call. Lab ex2: 62.8% (formula 63.4%). Dean & Barroso ke paper mein bhi: 100 servers par \"63% of user requests will take more than one second\".",
            "choiceExplanations": [
              "Page saaf tab hai jab 100 mein se har call saaf ho: 0.99^100 ≈ 0.366. Baaki 63.4% pages mein kam se kam ek dheemi call. Lab ex2: 62.8% (formula 63.4%). Dean & Barroso ke paper mein bhi: 100 servers par \"63% of user requests will take more than one second\".",
              "1% ek call ka hai. Page ko 100 mein se koi bhi ek dheemi call rok deti hai.",
              "100 × 1% ek page mein dheemi calls ki ausat ginti hai (1), pakki ginti nahi. Kuch pages mein 0, kuch mein 2–3; 37% pages mein ek bhi nahi."
            ]
          }
        },
        {
          "title": "3. Ek hi wajah ho toh?",
          "say": "Ab maan lo dheemapan ek hi wajah se aata hai — saari services ek bimaar database par. Har call ab bhi ~1% dheemi, par dheemi calls ek saath aati hain.",
          "ask": {
            "q": "Har call ~1% dheemi, par saari calls ek hi pal saath dheemi hoti hain. 100 calls wale kitne pages dheeme?",
            "choices": [
              "Lagbhag 1% — dheemi calls ek hi pages par jama hain, baaki pages saaf",
              "Phir bhi lagbhag 63% — formula 0.99^100 har haal mein lagta hai",
              "0% — ek hi wajah ho toh page us wajah ko pakad ke turant retry kar leta hai"
            ],
            "answer": 0,
            "hint": "Formula 0.99^100 kis shart par tika hai?",
            "explain": "0.99^100 tabhi chalta hai jab har call ka dheemapan baaki calls se alag ho. Ek hi wajah ho toh jis page par dheemapan hai, us page ki saari calls dheemi; baaki pages saaf. Lab ex2 shared: 100 calls par 1.0% pages dheeme.",
            "choiceExplanations": [
              "0.99^100 tabhi chalta hai jab har call ka dheemapan baaki calls se alag ho. Ek hi wajah ho toh jis page par dheemapan hai, us page ki saari calls dheemi; baaki pages saaf. Lab ex2 shared: 100 calls par 1.0% pages dheeme.",
              "Formula alag-alag (independent) dheemapan maanta hai. Shared wajah par lagaoge toh 63% ka galat andaaza aayega.",
              "Page ke paas shared wajah ko pehchaanne ka koi raasta nahi; lab mein retry bhi nahi."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Sabse dheemi requests ka hissa: <b>tail</b>. Tail ka samay: <b>tail latency</b> (p99 = sabse dheemi 1% ki hadd, p99.9 = sabse dheemi 0.1%). Kai calls ke intezaar se tail ka badhna: <b>tail amplification</b>. Asli zindagi mein dheemapan kuch alag-alag, kuch shared hota hai — dono naapo."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 1 lakh requests, aur 100 calls wala page",
      "project": "52-scale-math",
      "exercise": "ex1-tail",
      "goal": "Pehle 1,00,000 requests ka ausat aur percentiles. Phir page 1, 10, 50, 100 calls ka intezaar kare — independent aur shared dheemapan.",
      "why": "Node 22+ chahiye. Dono seeded simulations hain (seed 52): koi server nahi, teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: 1.5% requests 2–8 s ki.",
          "cmd": "cd docker-labs/52-scale-math && npm start -- ex1-tail",
          "expect": "MODEL: seeded simulation (seed 52), 1,00,000 requests; no real server\nfast requests: 30 ms + random (avg 15 ms); slow requests: 2–8 s, chance 1.5%\n\nslow requests      : 1,522 of 1,00,000\nmean (average)     : 121 ms\np50 (median)       : 40.6 ms\np95                : 80.0 ms\np99                : 4143 ms\np99.9              : 7619 ms\nmax                : 7996 ms\n\nrequests within ±20% of the mean : 1,064 (1.1%)\nmean of the fast requests only   : 45.0 ms\np99 ÷ mean                        : 34.3×\n\n1.5% of 10 lakh requests a day   : 15,000 slow requests every day"
        },
        {
          "text": "Fan-out: har call 1% dheemi.",
          "cmd": "npm start -- ex2-fanout",
          "expect": "MODEL: seeded simulation (seed 52), 20,000 pages per row; no real services\none call: 10 ms + random (avg 5 ms); slow call: ~1 s, chance 1%\nindependent = every call slow on its own; shared = one hiccup slows every call of that page\n\ncalls  mode         slow calls  slow pages  formula 1−0.99^N  page p50   page p99\n    1  independent       1.18%        1.2%              1.0%   13.5 ms   1001 ms\n    1  shared            1.18%        1.2%                 —   13.5 ms   1001 ms\n   10  independent       0.99%        9.4%              9.6%   24.3 ms   1009 ms\n   10  shared            0.98%        1.0%                 —   23.6 ms   62.6 ms\n   50  independent       0.99%       39.3%             39.5%   37.9 ms   1010 ms\n   50  shared            1.08%        1.1%                 —   31.5 ms   1009 ms\n  100  independent       0.99%       62.8%             63.4%   1003 ms   1010 ms\n  100  shared            0.98%        1.0%                 —   35.0 ms   76.8 ms"
        }
      ],
      "observe": {
        "q": "ex1 mein ausat 121 ms, p50 40.6 ms, p99 4,143 ms. Ausat ke ±20% mein sirf 1.1% requests. Kyun?",
        "choices": [
          "Ausat tez (~45 ms) aur dheemi (2–8 s) requests ko mila deta hai; ausat ke aaspaas bahut kam",
          "Simulation mein requests 100 ms ke aaspaas hi rakhi gayi, isliye ausat sahi jagah hai",
          "p50 galat nikla hai — sahi p50 ausat ke barabar 121 ms hona chahiye tha"
        ],
        "answer": 0,
        "hint": "Tez requests ka ausat kitna, aur dheemi requests kitni lambi?",
        "explain": "98.5% requests tez hain (tez requests ka ausat 45 ms), 1.5% requests 2–8 s. Ausat 121 ms dono ke beech ka number hai, jiske aaspaas bahut kam requests hain (1.1%). 10 lakh requests roz par 1.5% = 15,000 dheemi requests har din.",
        "choiceExplanations": [
          "98.5% requests tez hain (tez requests ka ausat 45 ms), 1.5% requests 2–8 s. Ausat 121 ms dono ke beech ka number hai, jiske aaspaas bahut kam requests hain (1.1%). 10 lakh requests roz par 1.5% = 15,000 dheemi requests har din.",
          "Simulation mein tez requests 30 ms + random (avg 15 ms) hain — 100 ms ke paas bahut kam.",
          "p50 rank se milta hai (rank 50,000); ausat saare samay jodkar ginti se bhaag dene par. Dono ka barabar hona zaroori nahi: ex1 mein p50 40.6 ms aur ausat 121 ms."
        ]
      },
      "lesson": "Ausat dashboard par theek dikhta hai jabki hazaaron log atakte hain. Alag-alag (independent) dheemapan mein fan-out dheeme pages badhata hai; saari calls har baar saath dheemi hon toh nahi (ex2 shared ~1%). Kuch shared aur kuch alag wajah ho toh alag se naapo."
    }
  ],
  "interview": {
    "title": "Interview Round — tail ki nazar",
    "instructions": "Pehle socho: kitne log, kitni der, aur kaunsa number dheeme logon ko dikhata hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Dashboard par average latency 120 ms, seedhi line. Support tickets aa rahe hain: \"app atakta hai\". Dheemi requests ka group kaunsa measurement dikhayega?",
        "choices": [
          "Latency percentiles — p50, p95, p99 alag-alag, chhoti window par",
          "Average ki window 1 minute se 1 ghanta karo — lamba average spikes dikhayega",
          "Saare servers ke CPU ka average — CPU theek toh latency bhi theek hogi",
          "Error rate — dheemi requests bhi error rate mein gin li jaati hain"
        ],
        "answer": 0,
        "explain": "Average dheeme hisse ko chhupata hai. Percentiles alag dekho: p50 aam request, p99 sabse dheemi 1% ki hadd. Lab ex1: average 121 ms, p99 4.1 s — 10 lakh requests roz par 15,000 dheemi requests.",
        "choiceExplanations": [
          "Average dheeme hisse ko chhupata hai. Percentiles alag dekho: p50 aam request, p99 sabse dheemi 1% ki hadd. Lab ex1: average 121 ms, p99 4.1 s — 10 lakh requests roz par 15,000 dheemi requests.",
          "Lambi window aur zyada mila deti hai; dheemi requests aur chhup jaati hain.",
          "CPU dheemapan ki wajah ho sakta hai, par kaun si requests dheemi hain, CPU nahi dikhata. Lab ex1 mein average 121 ms aur p99 4.1 s.",
          "Dheemi par safal request error rate mein nahi aati."
        ]
      },
      {
        "q": "Homepage 50 services ko parallel bulaata hai aur sabka intezaar karta hai. Har service ki 99% calls 100 ms ya kam leti hain, 1% calls 100 ms se zyada; dheemapan har service ka alag-alag (independent). Kitne page loads 100 ms se zyada lenge?",
        "choices": [
          "Lagbhag 39.5% — saari 50 calls tez rehne ka chance 0.99^50 ≈ 0.605",
          "Lagbhag 1% — har service 1% dheemi hai, toh page bhi 1% dheema",
          "Lagbhag 50% — 50 calls × 1% = 0.5, yaani aadhe page loads dheeme",
          "Lagbhag 99% — 50 calls mein ek dheemi call lagbhag pakki hoti hai"
        ],
        "answer": 0,
        "explain": "Page tab tez hai jab saari 50 calls tez hon: 0.99^50 ≈ 0.605. Baaki ~39.5% page loads 100 ms se zyada. Lab ex2: 50 calls par 39.3%. Page ka p99 poore latency distribution ke bina nahi nikalta.",
        "choiceExplanations": [
          "Page tab tez hai jab saari 50 calls tez hon: 0.99^50 ≈ 0.605. Baaki ~39.5% page loads 100 ms se zyada. Lab ex2: 50 calls par 39.3%. Page ka p99 poore latency distribution ke bina nahi nikalta.",
          "1% ek call ka chance hai; page ko 50 mein se koi bhi dheemi call rok deti hai.",
          "50 × 1% = 0.5 ek page mein dheemi calls ki ausat ginti hai, dheeme pages ka hissa nahi.",
          "Kam se kam ek dheemi call ka chance 1 − 0.99^50 ≈ 39.5% hai, 99% nahi."
        ]
      }
    ]
  },
  "success": [
    "Ausat ka chhupa hissa dikha sakte ho",
    "Rank se p50/p90/p99 padh sakte ho",
    "Fan-out par tail ka hisaab laga sakte ho, aur 1 − 0.99^N ki shart bata sakte ho"
  ],
  "cards": [
    {
      "front": "Ausat kya chhupata hai?",
      "back": "Dheemi requests ka hissa. Lab: ausat 121 ms, p50 40.6 ms, p99 4.1 s; ausat ke ±20% mein sirf 1.1% requests."
    },
    {
      "front": "p99 ka matlab?",
      "back": "Sorted list mein p99 ki rank ⌈0.99 × N⌉. Kam se kam 99% requests p99 ya kam mein poori; p99 se zyada lene wali zyada se zyada 1%. Chhoti list ya barabar timings mein ye ginti kam ho sakti hai."
    },
    {
      "front": "100 calls, har call 1% dheemi — kitne pages dheeme?",
      "back": "1 − 0.99^100 ≈ 63%, agar dheemapan har call ka alag ho. Ek hi wajah sab calls ko saath dheema kare toh ~1%."
    }
  ]
}
]);
})();
