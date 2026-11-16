/* First Principles — FAANG Senior Engineer.
   Source credit: Mathematics of the Second Attempt (s5HWkMyRRcA), numbered video 12/15.
   Evidence: docker-labs/62-second-attempt/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "cl", "icon": "📱", "label": "Clients", "x": 120, "y": 190}, {"id": "srv", "icon": "🖥️", "label": "Server 1,000/s", "x": 460, "y": 190}, {"id": "rt", "icon": "🔁", "label": "Retries", "x": 460, "y": 340}, {"id": "ok", "icon": "✅", "label": "Kaam hua", "x": 790, "y": 120}, {"id": "fail", "icon": "❌", "label": "Fail", "x": 790, "y": 280}];
const EDGES = [{"from": "cl", "to": "srv"}, {"from": "srv", "to": "ok"}, {"from": "srv", "to": "fail"}, {"from": "fail", "to": "rt"}, {"from": "rt", "to": "srv"}];
VISUALS["fp-retry-kyun"] = { t: "Fail → retry → overload → aur fail. Trigger gaya, loop raha. Retries ki ginti baandho.", html: SD.viz.svg(HERO, EDGES, { nodes: { cl: {tone:'ok',badge:'800/s'}, srv: {tone:'bad',badge:'overload'}, rt: {tone:'bad',badge:'loop'}, ok: {tone:'busy',badge:'kam'}, fail: {tone:'bad',badge:'zyada'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-retry-kyun",
  "icon": "🌪️",
  "group": "🔁 Retries: Doosri Koshish",
  "title": "Retries 1 · Kyun — retry storm aur metastable failure",
  "badge": "Toofan Ka Taalne Wala",
  "objectives": [
    "Retries bojh kaise badhaate hain (1 + f + f² …)",
    "Metastable failure: trigger gaya, girawat rahi",
    "Token bucket vs backoff: ginti vs samay"
  ],
  "lesson": [
    "<h3>☎️ Call center</h3><p>Call center mein 10 log hain, 8 calls aati hain — sab theek. Ek din 15 calls aati hain; kai log line par ruk kar kat jaate hain. Kate hue log turant dobara phone karte hain, aur teesri baar bhi.</p><p>Bheed khatam ho gayi, phir bhi line kabhi khaali nahi hoti — dobara phone karne wale hi line bhar dete hain. Aaj dekhte hain retry ka loop kaise banta hai aur kaise toot'ta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🌪️ Spike 10 s ka tha — server 60 s baad bhi kyun gira hai?",
      "goal": "Lab 62 ex0 (model, 1 s ke kadam): server 1,000 kaam/sec karta hai; 1,000 se zyada aayein toh timeout wali requests ka kaam bekaar, kaam ki raftaar girti hai. Naye requests 800/sec; t = 10–20 s par spike 1,500/sec. Fail hui request kul 4 koshish tak.",
      "nodes": [
        {
          "id": "cl",
          "icon": "📱",
          "label": "Clients",
          "x": 120,
          "y": 190
        },
        {
          "id": "srv",
          "icon": "🖥️",
          "label": "Server 1,000/s",
          "x": 460,
          "y": 190
        },
        {
          "id": "rt",
          "icon": "🔁",
          "label": "Retries",
          "x": 460,
          "y": 340
        },
        {
          "id": "ok",
          "icon": "✅",
          "label": "Kaam hua",
          "x": 790,
          "y": 120
        },
        {
          "id": "fail",
          "icon": "❌",
          "label": "Fail",
          "x": 790,
          "y": 280
        }
      ],
      "edges": [
        {
          "from": "cl",
          "to": "srv"
        },
        {
          "from": "srv",
          "to": "ok"
        },
        {
          "from": "srv",
          "to": "fail"
        },
        {
          "from": "fail",
          "to": "rt"
        },
        {
          "from": "rt",
          "to": "srv"
        }
      ],
      "viz": {
        "w": 900,
        "h": 420
      },
      "vars": [
        {
          "id": "fresh",
          "label": "Naye/sec"
        },
        {
          "id": "load",
          "label": "Server par bojh"
        },
        {
          "id": "state",
          "label": "Haalat"
        }
      ],
      "steps": [
        {
          "title": "Sab theek",
          "clock": "t = 0–10 s",
          "say": "800 naye/sec, kshamata 1,000. 200/sec ka khaali margin. Koi fail nahi, koi retry nahi.",
          "nodes": {
            "cl": {
              "tone": "ok",
              "badge": "800/s"
            },
            "srv": {
              "tone": "ok",
              "badge": "80% busy"
            },
            "rt": {
              "tone": "idle",
              "badge": "0"
            },
            "ok": {
              "tone": "ok",
              "badge": "800/s"
            },
            "fail": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "fresh": "800",
            "load": "800",
            "state": "theek"
          },
          "flows": [
            {
              "from": "cl",
              "to": "srv",
              "label": "800/s",
              "tone": "ok"
            },
            {
              "from": "srv",
              "to": "ok",
              "label": "800/s",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Spike",
          "clock": "t = 10–20 s",
          "say": "10 s ke liye 1,500/sec. Overload: kai requests timeout, timeout wali requests ka kaam bekaar. Fail requests turant retry karti hain.",
          "nodes": {
            "cl": {
              "tone": "busy",
              "badge": "1,500/s"
            },
            "srv": {
              "tone": "bad",
              "badge": "overload"
            },
            "rt": {
              "tone": "busy",
              "badge": "badhte"
            },
            "ok": {
              "tone": "busy",
              "badge": "kam"
            },
            "fail": {
              "tone": "bad",
              "badge": "zyada"
            }
          },
          "vars": {
            "fresh": "1,500",
            "load": "5,000+",
            "state": "girta"
          },
          "flows": [
            {
              "from": "srv",
              "to": "fail",
              "label": "timeout",
              "tone": "bad"
            },
            {
              "from": "fail",
              "to": "rt",
              "label": "",
              "tone": "bad"
            },
            {
              "from": "rt",
              "to": "srv",
              "label": "turant",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Spike gaya, girawat nahi",
          "clock": "t = 80 s",
          "say": "Naye requests phir 800/sec. Par har fail request 3 retries laati hai: bojh ~2,500/sec atka. Lab: 120 s ke run mein wapas nahi; sirf 48% requests serve.",
          "nodes": {
            "cl": {
              "tone": "ok",
              "badge": "800/s"
            },
            "srv": {
              "tone": "bad",
              "badge": "2,521/s"
            },
            "rt": {
              "tone": "bad",
              "badge": "~1,700/s"
            },
            "ok": {
              "tone": "busy",
              "badge": "kam"
            },
            "fail": {
              "tone": "bad",
              "badge": "zyada"
            }
          },
          "vars": {
            "fresh": "800",
            "load": "2,521",
            "state": "atka (metastable)"
          },
          "flows": [
            {
              "from": "rt",
              "to": "srv",
              "label": "retries",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Trigger (spike) khatam ho gaya. Server phir bhi kyun gira hua hai?",
            "choices": [
              "Retries khud bojh ban gaye: fail → retry → overload → aur fail, loop",
              "Server ki memory spike mein bhar gayi aur ab tak khaali nahi hui",
              "Naye users spike ke baad bhi 1,500/sec par aa rahe hain abhi tak"
            ],
            "answer": 0,
            "hint": "Spike ke baad server par 2,521/sec mein se naye kitne hain?",
            "explain": "Naye sirf 800/sec — baaki ~1,700/sec retries hain. Overload mein kaam ki raftaar girti hai, toh zyada fail, toh zyada retries. Trigger gaya, loop raha: is loop ko metastable failure kehte hain (Bronson et al., HotOS 2021). Video kehta hai AWS ne bhi dekha ki retries recovery ko der karwate hain.",
            "choiceExplanations": [
              "Naye sirf 800/sec — baaki ~1,700/sec retries hain. Overload mein kaam ki raftaar girti hai, toh zyada fail, toh zyada retries. Trigger gaya, loop raha: is loop ko metastable failure kehte hain (Bronson et al., HotOS 2021). Video kehta hai AWS ne bhi dekha ki retries recovery ko der karwate hain.",
              "Model mein memory nahi; bojh retries ka hai.",
              "Model mein spike ke baad naye requests 800/sec hi hain."
            ]
          }
        },
        {
          "title": "Backoff?",
          "clock": "backoff",
          "say": "Retries ko 2, 4, 8 s baad (full jitter ke saath) bhejo. Lab: is 120 s ke run mein wapas nahi. Bade windows (32 / 64 / 128 s) loop todte hain — par user ko jawab minuton baad.",
          "nodes": {
            "cl": {
              "tone": "ok",
              "badge": "800/s"
            },
            "srv": {
              "tone": "bad",
              "badge": "2,521/s"
            },
            "rt": {
              "tone": "busy",
              "badge": "der se"
            },
            "ok": {
              "tone": "busy",
              "badge": "kam"
            },
            "fail": {
              "tone": "bad",
              "badge": "zyada"
            }
          },
          "vars": {
            "fresh": "800",
            "load": "2,521",
            "state": "phir bhi atka"
          }
        },
        {
          "title": "Retry budget",
          "clock": "budget",
          "say": "Retry token bucket: har naya request 0.1 token deta hai, har bheja retry 1 token leta hai (bucket max 100). Lab: spike ke turant baad wapas, 91.6% serve — retry na karne (91.9%) jitna.",
          "nodes": {
            "cl": {
              "tone": "ok",
              "badge": "800/s"
            },
            "srv": {
              "tone": "ok",
              "badge": "~800/s"
            },
            "rt": {
              "tone": "ok",
              "badge": "≤ 80/s"
            },
            "ok": {
              "tone": "ok",
              "badge": "800/s"
            },
            "fail": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "fresh": "800",
            "load": "~800",
            "state": "wapas"
          },
          "flows": [
            {
              "from": "rt",
              "to": "srv",
              "label": "≤ 10%",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Token bucket turant loop kyun todta hai, jab chhota backoff nahi tod paaya?",
            "choices": [
              "Budget retries ki ginti baandhta hai; backoff sirf retries ka samay badalta",
              "Budget retries ko pehle server tak jaldi pahunchata hai, isliye kam fail",
              "Budget server ki kshamata 1,000 se badha deta hai jab tak loop na toote"
            ],
            "answer": 0,
            "hint": "Backoff ke saath har second kitne retries pahunchte hain, agar fail hote rahein?",
            "explain": "Bucket ginti baandhta hai: retries naye traffic ke ~10% tak, toh bojh max ~1.1× — server khaali margin mein laut aata hai. Chhota backoff retries ko thoda baad bhejta hai, par fail hote rahe toh bojh bana rehta hai; bahut lamba backoff bhi loop todta hai, par user ka intezaar minuton mein. Dono alag auzaar: backoff samay phailaata hai, bucket ginti baandhta hai.",
            "choiceExplanations": [
              "Bucket ginti baandhta hai: retries naye traffic ke ~10% tak, toh bojh max ~1.1× — server khaali margin mein laut aata hai. Chhota backoff retries ko thoda baad bhejta hai, par fail hote rahe toh bojh bana rehta hai; bahut lamba backoff bhi loop todta hai, par user ka intezaar minuton mein. Dono alag auzaar: backoff samay phailaata hai, bucket ginti baandhta hai.",
              "Budget pahunchne ka samay nahi badalta; ginti kaat'ta hai.",
              "Kshamata model mein 1,000 hi rehti hai."
            ]
          }
        }
      ],
      "lesson": "Retry madad hai jab fail kabhi-kabhi ho. Overload mein retries bojh badhaate hain, aur trigger ke baad bhi loop chalta hai (metastable). Retries ki ginti par had lagao (token bucket); chhota backoff akele kaafi nahi, lamba backoff user ko rulaata hai."
    },
    {
      "type": "cards",
      "title": "🧮 Retry ka hisaab",
      "goal": "Lab 62 ex0 (model aur arithmetic) aur lab 37 (asli servers). Video ki baatein sudhaar ke saath.",
      "lesson": "Bojh = 1 + f + f² + … (har layer). Khatra fail hone ke hisse ke badhne aur layers ke guna hone mein hai.",
      "steps": [
        {
          "title": "1. Ek layer ka bojh",
          "say": "Har koshish f hissa fail ho aur 4 koshish tak retry: bojh = 1 + f + f² + f³. f = 10% → 1.11×, f = 50% → 1.88×, f = 100% → 4×. Video: \"10% fail seconds mein 100% outage\" — sirf 10% se nahi; khatra tab jab overload se f khud badhe.",
          "ask": {
            "q": "Har request 4 koshish tak, aur server poora band (f = 100%). Bojh?",
            "choices": [
              "4× — har request chaaron koshish karti hai, server par 4 guna",
              "1× — server band hai, isliye koi request pahunchti hi nahi",
              "2× — aadhi koshishein backoff mein ruk jaati hain hamesha"
            ],
            "answer": 0,
            "hint": "1 + f + f² + f³, f = 1.",
            "explain": "f = 1 par har koshish fail, toh har request 4 baar aati hai: 4×. Isliye \"server band\" ke waqt retries sabse zyada bojh dalte hain — circuit breaker aur budget is bojh ko rokte hain.",
            "choiceExplanations": [
              "f = 1 par har koshish fail, toh har request 4 baar aati hai: 4×. Isliye \"server band\" ke waqt retries sabse zyada bojh dalte hain — circuit breaker aur budget is bojh ko rokte hain.",
              "Band server tak requests pahunchti hain aur fail hoti hain (connection refused / timeout).",
              "Backoff kab bhejna badalta hai, kitni baar nahi."
            ]
          }
        },
        {
          "title": "2. Layers ka guna",
          "say": "Client → A → B → C, har caller kul 3 koshish (pehli request samet): C par 3 × 3 × 3 = 27× tak. \"3 retries\" (4 koshish) ho toh 4 × 4 × 4 = 64×. Lab 37 ex3 asli servers par dikhata hai. Niyam: retry sirf ek layer par (aksar sabse upar), baaki fail fast."
        },
        {
          "title": "3. Kab retry karo",
          "say": "Sirf un errors par jo asthaayi hain (timeout, 503, 429 ke saath Retry-After). 400, 401, 404 jaise errors par retry bekaar. Aur write tabhi retry jab idempotent ho (level 3)."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Metastable loop",
      "project": "62-second-attempt",
      "exercise": "ex0-metastable",
      "goal": "Chaar policies ek hi spike par; phir naye traffic ke hisaab se wapsi; phir bojh ka formula.",
      "why": "Node 24+ chahiye. Seedha model, har run same; koi asli server nahi. Asli servers par retry storm: lab 37 ex2.",
      "steps": [
        {
          "text": "Metastable loop.",
          "cmd": "cd docker-labs/62-second-attempt && npm start -- ex0-metastable",
          "expect": "A. MODEL (1 s ke kadam): server 1,000 kaam/sec karta hai. 1,000 se zyada aayein toh har request shuru hoti hai, par timeout\n   wali requests ka kaam bekaar — kaam ki raftaar girti hai (maana hua: useful = 1,000 × 1,000 / load). Naye requests 800/sec;\n   t = 10–20 s par spike 1,500/sec. Ek request kul 4 koshish tak. 120 s dekha. \"Wapas\" = bojh lagaataar 10 s ≤ 1,000.\n\ntareeka                                          serve hui   calls ÷ naye   spike ke baad wapas   t = 80 s par bojh\nretry nahi                                         91.9%       1.00×      0 s baad               800/sec\nturant retry                                       48.3%       3.03×      120 s mein nahi      2,521/sec\nbackoff + full jitter, windows 2 / 4 / 8 s         48.0%       2.99×      120 s mein nahi      2,521/sec\nbackoff + full jitter, windows 32 / 64 / 128 s     99.6%       1.24×      61 s baad            1,001/sec\nretry token bucket: har naya request 0.1 token     91.6%       1.01×      0 s baad               800/sec\n\n→ Spike 10 s ka tha, par turant retry ke saath bojh ~2,500/sec par atka (naye sirf 800/sec): har fail request retries laati\n  hai, overload mein kaam ki raftaar girti hai, aur zyada fail. Is loop ko metastable failure kehte hain — trigger gaya,\n  girawat rahi (Bronson et al., HotOS 2021; Amazon Builders' Library bhi kehti hai ki retries recovery ko der karwa sakte hain).\n→ Chhote backoff windows (2 / 4 / 8 s) is run mein loop nahi todte. Bade windows (32 / 64 / 128 s) todte hain aur aakhir mein zyada\n  requests serve hoti hain — par user ko jawab minuton baad. Token bucket retries ko naye traffic ke 10% tak baandhta hai:\n  turant wapas, par kuch requests retry ke bina fail. Backoff samay phailaata hai; bucket ginti baandhta hai — dono alag auzaar.\n\nB. MODEL: naye requests kitne hon toh system 120 s ke andar wapas aaye?\n\nnaye/sec   turant retry      backoff 2/4/8 s     token bucket\n    500               6 s              15 s              0 s\n    600               9 s              23 s              0 s\n    700              26 s              69 s              0 s\n    800   120 s mein nahi   120 s mein nahi              0 s\n    900   120 s mein nahi   120 s mein nahi              0 s\n\n→ Jitna kam khaali margin, utna bada khatra. Kaam ki raftaar ka curve model ka maana hua hai; asli system ka margin naapo.\n\nC. Arithmetic: har koshish f hissa fail ho (alag-alag), toh 4 koshishon tak bojh = 1 + f + f² + f³ (ek layer).\n\nf = 0.1  → 1.11×\nf = 0.5  → 1.88×\nf = 0.9  → 3.44×\nf = 1    → 4.00×\n→ Video: \"10% fail → seconds mein 100% outage\". Sirf 10% par bojh 1.11× hai; khatra tab jab overload se f khud badhe (A).\n  Kai layers retry karein toh guna hota hai: 3 layers × 3 koshish = 27× (lab 37 ex3)."
        },
        {
          "text": "Lab ke 5 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-62-second-attempt@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ metastable: short backoff and immediate retries stay stuck; long backoff and a token bucket recover; accounting holds (8.288598ms)\n✔ jitter: with zero network variance no-jitter needs N(N+1)/2 calls; jittered strategies need far fewer calls and less time (8.069964ms)\n✔ deadline: retries without cancellation keep slow work running after the user left; propagation alone is not enough (0.497782ms)\n✔ idempotency: key + in-flight lock + parameter check; snapshots; ownership tokens; expiry; delete; add vs set (1.314823ms)\n✔ DLQ retention (standard: from first send; FIFO: reset); availability = MTBF / (MTBF + MTTR) (0.784559ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 58.6445"
        }
      ],
      "observe": {
        "q": "Hissa B: naye 700/sec par turant retry 26 s mein wapas, 800/sec par kabhi nahi. 100/sec ke farq se itna bada farq kyun?",
        "choices": [
          "Khaali margin 300 se 200; retries margin kha jaate, loop nahi nikalta",
          "800/sec par server ki kshamata model mein apne aap kam ho jaati hai",
          "700/sec par retries band ho jaate hain, 800/sec par chalu rehte hain"
        ],
        "answer": 0,
        "hint": "Kshamata 1,000. Har case mein retries ke liye kitni jagah bachi?",
        "explain": "Loop se nikalne ke liye retries ko khaali margin mein samaana hota hai. 700/sec par 300 ki jagah — retries dheere khatam. 800/sec par 200 — retries + naye milkar kshamata se upar rehte hain, overload bana rehta hai. Margin kam = metastable ka khatra zyada.",
        "choiceExplanations": [
          "Loop se nikalne ke liye retries ko khaali margin mein samaana hota hai. 700/sec par 300 ki jagah — retries dheere khatam. 800/sec par 200 — retries + naye milkar kshamata se upar rehte hain, overload bana rehta hai. Margin kam = metastable ka khatra zyada.",
          "Kshamata model mein hamesha 1,000 hai.",
          "Dono mein same retry niyam (4 koshish tak)."
        ]
      },
      "lesson": "Retry loop khaali margin par tika hai. Margin rakho, aur retries ki ginti baandho."
    }
  ],
  "interview": {
    "title": "Interview Round — retry storm",
    "instructions": "Pehle socho: khaali margin kitna hai, aur fail requests kitni baar lautti hain? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Ek DB 10 minute ke liye dheema hua, phir theek ho gaya. Par API ki error rate ghante bhar baad bhi ucchi hai; DB par traffic normal se 3 guna. Pehla kadam?",
        "choices": [
          "Retry budget/limit lagao aur retries kam karo; DB ka asli traffic naapo",
          "DB ka size 3 guna karo, kyunki traffic 3 guna ho gaya hai abhi",
          "Clients ka timeout 1 s se 10 s karo, taaki kam requests fail hon",
          "Backoff 2 s se 30 s karo, aur kuch mat badlo — backoff kaafi hai"
        ],
        "answer": 0,
        "explain": "Trigger (dheema DB) chala gaya, par 3× traffic = retries ka loop (metastable). Retries ki ginti baandho (budget, token bucket), aur DB par naye vs retry traffic alag naapo. Lab 62 ex0: token bucket turant lautata hai; chhota backoff (2/4/8 s) 120 s mein nahi.",
        "choiceExplanations": [
          "Trigger (dheema DB) chala gaya, par 3× traffic = retries ka loop (metastable). Retries ki ginti baandho (budget, token bucket), aur DB par naye vs retry traffic alag naapo. Lab 62 ex0: token bucket turant lautata hai; chhota backoff (2/4/8 s) 120 s mein nahi.",
          "3× bojh retries ka hai; DB bada karna mehnga aur loop ki jad nahi.",
          "Timeout naapi hui latency aur deadline se chuno; sirf timeout badalna retry ka bojh nahi baandhta.",
          "Chhota backoff retries ko thoda baad bhejta hai; loop bana rehta hai."
        ]
      },
      {
        "q": "Client → order service → payment service → bank API. Teeno callers kul 3 koshish karte hain (pehli request samet). Bank 1 minute band raha. Ek order par bank tak kitni calls?",
        "choices": [
          "Ek order par 27 tak (3 × 3 × 3); retry ek hi layer par rakho",
          "3 — har layer apni call ek baar hi bhejti hai, retries alag nahi",
          "9 — sirf neeche ki do layers ke retries guna hote hain",
          "Ek bhi nahi — bank band hai toh calls pahunchti hi nahi"
        ],
        "answer": 0,
        "explain": "Har caller apne neeche wale ko 3 baar bulata hai: 3 × 3 × 3 = 27 calls ek order par (lab 37 ex3). \"3 retries\" ka matlab 4 koshish hota toh 64. Ek layer par retry (aksar sabse bahar), baaki fail fast, aur circuit breaker band bank par calls rokta hai.",
        "choiceExplanations": [
          "Har caller apne neeche wale ko 3 baar bulata hai: 3 × 3 × 3 = 27 calls ek order par (lab 37 ex3). \"3 retries\" ka matlab 4 koshish hota toh 64. Ek layer par retry (aksar sabse bahar), baaki fail fast, aur circuit breaker band bank par calls rokta hai.",
          "Har layer ke 3 retries neeche har call ke liye hain — guna hota hai.",
          "Client ki koshishein bhi neeche tak guna hoti hain: 3 × 3 × 3.",
          "Band service tak calls jaati hain aur timeout/refuse hoti hain."
        ]
      }
    ]
  },
  "success": [
    "Retry ka bojh gin sakte ho (1 + f + f² …, layers ka guna)",
    "Metastable failure samjha sakte ho",
    "Retry budget aur backoff ka farq bata sakte ho"
  ],
  "cards": [
    {
      "front": "Retry ka bojh?",
      "back": "Ek layer: 1 + f + f² + … (4 koshish, f = 10% → 1.11×). Layers guna: teen callers × 3 koshish = 27× (lab 37)."
    },
    {
      "front": "Metastable failure?",
      "back": "Trigger gaya, girawat rahi: retries overload banaye rakhte hain. Lab 62 ex0: spike 10 s, phir bhi 800/sec par bojh 2,521/sec, 120 s ke run mein wapas nahi."
    },
    {
      "front": "Loop kaise todo?",
      "back": "Retry token bucket (retries ≈ naye ka 10% tak) — lab mein turant wapas. Chhota backoff (2/4/8 s) nahi; lamba backoff haan, par user minuton ruka. Khaali margin rakho."
    }
  ]
}
]);
})();
